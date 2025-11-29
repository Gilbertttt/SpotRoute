const { v4: uuid } = require('uuid');
const { pool } = require('../config/database');

const mapPaymentTransactionRow = (row) => {
  if (!row) return null;
  const transaction = {
    id: row.id,
    driverId: row.driver_id,
    virtualAccountId: row.virtual_account_id,
    bookingId: row.booking_id,
    transactionType: row.transaction_type,
    amount: Number(row.amount),
    commissionAmount: Number(row.commission_amount),
    commissionPercentage: Number(row.commission_percentage),
    driverAmount: Number(row.driver_amount),
    reference: row.reference,
    paymentReference: row.payment_reference,
    status: row.status,
    description: row.description,
    createdAt: row.created_at ? row.created_at.toISOString() : undefined,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : undefined,
  };

  if (row.metadata) {
    try {
      transaction.metadata = JSON.parse(row.metadata);
    } catch (error) {
      transaction.metadata = row.metadata;
    }
  }

  return transaction;
};

class PaymentTransaction {
  /**
   * Create a payment transaction
   */
  static async create({
    driverId,
    virtualAccountId,
    bookingId,
    transactionType,
    amount,
    commissionAmount = 0,
    commissionPercentage = 0,
    driverAmount = 0,
    reference,
    paymentReference,
    status = 'PENDING',
    description,
    metadata,
  }) {
    const id = uuid();
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    await pool.query(
      `
        INSERT INTO payment_transactions (
          id, driver_id, virtual_account_id, booking_id, transaction_type,
          amount, commission_amount, commission_percentage, driver_amount,
          reference, payment_reference, status, description, metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        driverId,
        virtualAccountId || null,
        bookingId || null,
        transactionType,
        amount,
        commissionAmount,
        commissionPercentage,
        driverAmount,
        reference || null,
        paymentReference || null,
        status,
        description || null,
        metadataJson,
      ]
    );

    return this.findById(id);
  }

  /**
   * Find transaction by ID
   */
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM payment_transactions WHERE id = ?',
      [id]
    );
    return rows.length ? mapPaymentTransactionRow(rows[0]) : null;
  }

  /**
   * Find transaction by reference
   */
  static async findByReference(reference) {
    const [rows] = await pool.query(
      'SELECT * FROM payment_transactions WHERE reference = ?',
      [reference]
    );
    return rows.length ? mapPaymentTransactionRow(rows[0]) : null;
  }

  /**
   * Find transaction by payment reference
   */
  static async findByPaymentReference(paymentReference) {
    const [rows] = await pool.query(
      'SELECT * FROM payment_transactions WHERE payment_reference = ?',
      [paymentReference]
    );
    return rows.length ? mapPaymentTransactionRow(rows[0]) : null;
  }

  /**
   * Get transactions by driver ID
   */
  static async findByDriverId(driverId, limit = 50, offset = 0) {
    const [rows] = await pool.query(
      `
        SELECT * FROM payment_transactions 
        WHERE driver_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `,
      [driverId, limit, offset]
    );
    return rows.map(mapPaymentTransactionRow);
  }

  /**
   * Get transactions by virtual account ID
   */
  static async findByVirtualAccountId(virtualAccountId, limit = 50, offset = 0) {
    const [rows] = await pool.query(
      `
        SELECT * FROM payment_transactions 
        WHERE virtual_account_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `,
      [virtualAccountId, limit, offset]
    );
    return rows.map(mapPaymentTransactionRow);
  }

  /**
   * Update transaction status
   */
  static async updateStatus(id, status) {
    await pool.query(
      'UPDATE payment_transactions SET status = ? WHERE id = ?',
      [status, id]
    );
    return this.findById(id);
  }

  /**
   * Get all transactions (for admin purposes)
   */
  static async findAll(limit = 100, offset = 0) {
    const [rows] = await pool.query(
      `
        SELECT * FROM payment_transactions 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );
    return rows.map(mapPaymentTransactionRow);
  }
}

module.exports = PaymentTransaction;

