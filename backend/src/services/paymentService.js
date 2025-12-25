const { pool } = require('../config/database');
const PaymentTransaction = require('../models/PaymentTransaction');
const VirtualAccount = require('../models/VirtualAccount');
const BankAccount = require('../models/BankAccount');
const User = require('../models/User');
const Notification = require('../models/Notification');

class PaymentService {
  /**
   * Get commission percentage from company settings
   */
  static async getCommissionPercentage() {
    try {
      const [rows] = await pool.query(
        "SELECT setting_value FROM company_settings WHERE setting_key = 'COMMISSION_PERCENTAGE'"
      );
      if (rows.length > 0) {
        return parseFloat(rows[0].setting_value) || 10.0;
      }
      return 10.0; // Default 10%
    } catch (error) {
      console.error('Error fetching commission percentage:', error);
      return 10.0; // Default fallback
    }
  }

  /**
   * Calculate commission and driver amount
   */
  static async calculateCommission(amount) {
    const commissionPercentage = await this.getCommissionPercentage();
    const commissionAmount = (amount * commissionPercentage) / 100;
    const driverAmount = amount - commissionAmount;

    return {
      commissionPercentage,
      commissionAmount: Math.round(commissionAmount * 100) / 100, // Round to 2 decimal places
      driverAmount: Math.round(driverAmount * 100) / 100,
    };
  }

  /**
   * Process payment received to virtual account
   * This is called when a payment is received to a driver's virtual account
   */
  static async processPaymentReceived({
    virtualAccountNumber,
    amount,
    paymentReference,
    bookingId = null,
    metadata = {},
  }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Find virtual account
      const virtualAccount = await VirtualAccount.findByAccountNumber(virtualAccountNumber);
      if (!virtualAccount) {
        const error = new Error('Virtual account not found');
        error.status = 404;
        throw error;
      }

      if (!virtualAccount.isActive) {
        const error = new Error('Virtual account is not active');
        error.status = 400;
        throw error;
      }

      // Check if payment already processed
      const existingTransaction = await PaymentTransaction.findByPaymentReference(paymentReference);
      if (existingTransaction) {
        const error = new Error('Payment already processed');
        error.status = 400;
        throw error;
      }

      // Calculate commission
      const { commissionPercentage, commissionAmount, driverAmount } =
        await this.calculateCommission(amount);

      // Create payment received transaction
      const paymentTransaction = await PaymentTransaction.create({
        driverId: virtualAccount.driverId,
        virtualAccountId: virtualAccount.id,
        bookingId,
        transactionType: 'PAYMENT_RECEIVED',
        amount,
        commissionAmount,
        commissionPercentage,
        driverAmount,
        paymentReference,
        reference: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'SUCCESS',
        description: `Payment received via virtual account ${virtualAccountNumber}`,
        metadata: {
          ...metadata,
          virtualAccountNumber,
        },
      });

      // Create commission deduction transaction
      const commissionTransaction = await PaymentTransaction.create({
        driverId: virtualAccount.driverId,
        virtualAccountId: virtualAccount.id,
        bookingId,
        transactionType: 'COMMISSION_DEDUCTED',
        amount: commissionAmount,
        commissionAmount,
        commissionPercentage,
        driverAmount: 0,
        reference: `COMM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'SUCCESS',
        description: `Commission deducted: ${commissionPercentage}% of ₦${amount}`,
        metadata: {
          originalPaymentId: paymentTransaction.id,
          originalPaymentReference: paymentReference,
        },
      });

      // Update driver wallet balance
      const driver = await User.findById(virtualAccount.driverId);
      if (driver && driver.wallet) {
        const wallet = typeof driver.wallet === 'string' ? JSON.parse(driver.wallet) : driver.wallet;
        wallet.balance = (wallet.balance || 0) + driverAmount;
        wallet.totalEarnings = (wallet.totalEarnings || 0) + amount;

        await connection.query(
          'UPDATE users SET wallet = ? WHERE id = ?',
          [JSON.stringify(wallet), virtualAccount.driverId]
        );
      }

      await connection.commit();

      // Process automatic payout to driver's bank account (after commit to avoid nested transactions)
      // This is non-blocking - if it fails, the payment is still recorded
      try {
        await this.processDriverPayout(virtualAccount.driverId, driverAmount, {
          originalPaymentId: paymentTransaction.id,
          originalPaymentReference: paymentReference,
        });
      } catch (payoutError) {
        // Log but don't fail the payment processing
        console.error('Payout processing failed (non-blocking):', payoutError);
      }

      const metadataObj =
        typeof metadata === 'string'
          ? (() => {
              try {
                return JSON.parse(metadata);
              } catch (err) {
                console.warn('Failed to parse payment metadata:', err.message);
                return {};
              }
            })()
          : metadata || {};

      const payerName =
        metadataObj.payerName ||
        metadataObj.customerName ||
        metadataObj.userName ||
        metadataObj.fullName ||
        'A passenger';

      const formattedAmount = Number(amount || 0).toLocaleString('en-NG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

      // Create notification (non-blocking - if it fails, payment is still processed)
      try {
        await Notification.create({
          userId: virtualAccount.driverId,
          type: 'PAYMENT_RECEIVED',
          title: 'Transfer confirmed',
          message: `${payerName} paid ₦${formattedAmount}${bookingId ? ` for booking #${bookingId}` : ''}. Reference: ${paymentReference}`,
          relatedId: bookingId || paymentTransaction.id,
        });
      } catch (notificationError) {
        // Log but don't fail the payment processing
        console.error('Notification creation failed (non-blocking):', notificationError);
      }

      return {
        paymentTransaction,
        commissionTransaction,
        driverAmount,
        commissionAmount,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Process payout to driver's bank account
   */
  static async processDriverPayout(driverId, amount, metadata = {}) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get driver's bank account
      const bankAccount = await BankAccount.findByDriverId(driverId);
      if (!bankAccount) {
        // Create a pending payout transaction but don't transfer yet
        const payoutTransaction = await PaymentTransaction.create({
          driverId,
          transactionType: 'DRIVER_PAYOUT',
          amount,
          status: 'PENDING',
          description: `Payout pending - Bank account not set up`,
          metadata: {
            ...metadata,
            reason: 'BANK_ACCOUNT_NOT_SETUP',
          },
        });
        await connection.commit();
        return payoutTransaction;
      }

      if (!bankAccount.isVerified) {
        // Create a pending payout transaction but don't transfer yet
        const payoutTransaction = await PaymentTransaction.create({
          driverId,
          transactionType: 'DRIVER_PAYOUT',
          amount,
          status: 'PENDING',
          description: `Payout pending - Bank account not verified`,
          metadata: {
            ...metadata,
            reason: 'BANK_ACCOUNT_NOT_VERIFIED',
            bankAccountId: bankAccount.id,
          },
        });
        await connection.commit();
        return payoutTransaction;
      }

      // In a real implementation, this would call a payment provider API
      // to transfer funds to the driver's bank account
      // For now, we'll simulate the transfer
      const transferReference = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate bank transfer API call
      // const transferResult = await bankTransferAPI.transfer({
      //   accountNumber: bankAccount.accountNumber,
      //   bankCode: bankAccount.bankCode,
      //   accountName: bankAccount.accountName,
      //   amount,
      //   reference: transferReference,
      // });

      // Create payout transaction
      const payoutTransaction = await PaymentTransaction.create({
        driverId,
        transactionType: 'DRIVER_PAYOUT',
        amount,
        reference: transferReference,
        status: 'SUCCESS', // In real implementation, use transferResult.status
        description: `Payout to ${bankAccount.accountName} (${bankAccount.accountNumber})`,
        metadata: {
          ...metadata,
          bankAccountId: bankAccount.id,
          bankAccountNumber: bankAccount.accountNumber,
          bankName: bankAccount.bankName,
          // transferResult: transferResult, // Include API response
        },
      });

      // Update driver wallet (deduct from balance since it's been paid out)
      const driver = await User.findById(driverId);
      if (driver && driver.wallet) {
        const wallet = typeof driver.wallet === 'string' ? JSON.parse(driver.wallet) : driver.wallet;
        wallet.balance = Math.max(0, (wallet.balance || 0) - amount);

        await connection.query(
          'UPDATE users SET wallet = ? WHERE id = ?',
          [JSON.stringify(wallet), driverId]
        );
      }

      await connection.commit();

      return payoutTransaction;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get payment statistics for a driver
   */
  static async getDriverPaymentStats(driverId) {
    try {
      const [rows] = await pool.query(
        `
          SELECT 
            transaction_type,
            SUM(amount) as total_amount,
            SUM(commission_amount) as total_commission,
            SUM(driver_amount) as total_driver_amount,
            COUNT(*) as transaction_count
          FROM payment_transactions
          WHERE driver_id = ? AND status = 'SUCCESS'
          GROUP BY transaction_type
        `,
        [driverId]
      );

      const stats = {
        totalReceived: 0,
        totalCommission: 0,
        totalPaidOut: 0,
        pendingPayout: 0,
        transactionCount: 0,
      };

      rows.forEach((row) => {
        const amount = Number(row.total_amount);
        const commission = Number(row.total_commission);
        const driverAmount = Number(row.total_driver_amount);
        const count = Number(row.transaction_count);

        stats.transactionCount += count;

        if (row.transaction_type === 'PAYMENT_RECEIVED') {
          stats.totalReceived += amount;
          stats.totalCommission += commission;
        } else if (row.transaction_type === 'DRIVER_PAYOUT') {
          stats.totalPaidOut += amount;
        }
      });

      // Get pending payout amount
      const [pendingRows] = await pool.query(
        `
          SELECT SUM(amount) as pending_amount
          FROM payment_transactions
          WHERE driver_id = ? 
            AND transaction_type = 'DRIVER_PAYOUT' 
            AND status = 'PENDING'
        `,
        [driverId]
      );

      stats.pendingPayout = pendingRows[0]?.pending_amount ? Number(pendingRows[0].pending_amount) : 0;

      return stats;
    } catch (error) {
      console.error('Error getting driver payment stats:', error);
      throw error;
    }
  }
}

module.exports = PaymentService;

