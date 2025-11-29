const VirtualAccount = require('../models/VirtualAccount');
const BankAccount = require('../models/BankAccount');
const PaymentTransaction = require('../models/PaymentTransaction');
const PaymentService = require('../services/paymentService');
const User = require('../models/User');

/**
 * Get or create virtual account for the authenticated driver
 */
exports.getMyVirtualAccount = async (req, res, next) => {
  try {
    const driverId = req.user.id;

    if (req.user.role !== 'DRIVER') {
      return res.status(403).json({ message: 'Only drivers can access virtual accounts' });
    }

    const driver = await User.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const virtualAccount = await VirtualAccount.getOrCreate(
      driverId,
      driver.name
    );

    res.json(virtualAccount);
  } catch (error) {
    next(error);
  }
};

/**
 * Get bank account details for the authenticated driver
 */
exports.getMyBankAccount = async (req, res, next) => {
  try {
    const driverId = req.user.id;

    if (req.user.role !== 'DRIVER') {
      return res.status(403).json({ message: 'Only drivers can access bank accounts' });
    }

    const bankAccount = await BankAccount.findByDriverId(driverId);

    if (!bankAccount) {
      return res.status(404).json({ message: 'Bank account not found' });
    }

    res.json(bankAccount);
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update bank account for the authenticated driver
 */
exports.createOrUpdateBankAccount = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const { accountNumber, bankName, bankCode, accountName } = req.body;

    if (req.user.role !== 'DRIVER') {
      return res.status(403).json({ message: 'Only drivers can update bank accounts' });
    }

    if (!accountNumber || !bankName || !bankCode || !accountName) {
      return res.status(400).json({
        message: 'Missing required fields: accountNumber, bankName, bankCode, accountName',
      });
    }

    const bankAccount = await BankAccount.createOrUpdate({
      driverId,
      accountNumber,
      bankName,
      bankCode,
      accountName,
    });

    res.json({
      message: 'Bank account saved successfully',
      bankAccount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment transactions for the authenticated driver
 */
exports.getMyTransactions = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    if (req.user.role !== 'DRIVER') {
      return res.status(403).json({ message: 'Only drivers can access transactions' });
    }

    const transactions = await PaymentTransaction.findByDriverId(driverId, limit, offset);

    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment statistics for the authenticated driver
 */
exports.getMyPaymentStats = async (req, res, next) => {
  try {
    const driverId = req.user.id;

    if (req.user.role !== 'DRIVER') {
      return res.status(403).json({ message: 'Only drivers can access payment stats' });
    }

    const stats = await PaymentService.getDriverPaymentStats(driverId);

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

/**
 * Webhook endpoint for payment notifications
 * This would be called by the payment provider when a payment is received
 */
exports.handlePaymentWebhook = async (req, res, next) => {
  try {
    const {
      virtualAccountNumber,
      amount,
      paymentReference,
      bookingId,
      metadata,
    } = req.body;

    if (!virtualAccountNumber || !amount || !paymentReference) {
      return res.status(400).json({
        message: 'Missing required fields: virtualAccountNumber, amount, paymentReference',
      });
    }

    // Process the payment
    const result = await PaymentService.processPaymentReceived({
      virtualAccountNumber,
      amount: parseFloat(amount),
      paymentReference,
      bookingId,
      metadata,
    });

    res.json({
      message: 'Payment processed successfully',
      ...result,
    });
  } catch (error) {
    console.error('Payment webhook error:', error);
    // Still return 200 to prevent webhook retries for invalid requests
    res.status(200).json({
      message: 'Payment processing failed',
      error: error.message,
    });
  }
};

/**
 * Manually trigger payout for the authenticated driver
 */
exports.requestPayout = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const { amount } = req.body;

    if (req.user.role !== 'DRIVER') {
      return res.status(403).json({ message: 'Only drivers can request payouts' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Check driver wallet balance
    const driver = await User.findById(driverId);
    if (!driver || !driver.wallet) {
      return res.status(400).json({ message: 'Driver wallet not found' });
    }

    const wallet = typeof driver.wallet === 'string' ? JSON.parse(driver.wallet) : driver.wallet;
    if ((wallet.balance || 0) < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Process payout
    const payoutTransaction = await PaymentService.processDriverPayout(driverId, amount, {
      requestedBy: 'DRIVER',
      requestedAt: new Date().toISOString(),
    });

    res.json({
      message: 'Payout request processed',
      transaction: payoutTransaction,
    });
  } catch (error) {
    next(error);
  }
};

