const { v4: uuid } = require('uuid');
const { pool } = require('../config/database');

const mapBankAccountRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    driverId: row.driver_id,
    accountNumber: row.account_number,
    bankName: row.bank_name,
    bankCode: row.bank_code,
    accountName: row.account_name,
    isVerified: Boolean(row.is_verified),
    createdAt: row.created_at ? row.created_at.toISOString() : undefined,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : undefined,
  };
};

class BankAccount {
  /**
   * Create or update bank account for a driver
   */
  static async createOrUpdate({ driverId, accountNumber, bankName, bankCode, accountName }) {
    const existing = await this.findByDriverId(driverId);
    
    if (existing) {
      // Update existing bank account
      await pool.query(
        `
          UPDATE bank_accounts 
          SET account_number = ?, bank_name = ?, bank_code = ?, account_name = ?, is_verified = FALSE
          WHERE driver_id = ?
        `,
        [accountNumber, bankName, bankCode, accountName, driverId]
      );
      return this.findByDriverId(driverId);
    } else {
      // Create new bank account
      const id = uuid();
      await pool.query(
        `
          INSERT INTO bank_accounts (id, driver_id, account_number, bank_name, bank_code, account_name)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [id, driverId, accountNumber, bankName, bankCode, accountName]
      );
      return this.findById(id);
    }
  }

  /**
   * Find bank account by ID
   */
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM bank_accounts WHERE id = ?',
      [id]
    );
    return rows.length ? mapBankAccountRow(rows[0]) : null;
  }

  /**
   * Find bank account by driver ID
   */
  static async findByDriverId(driverId) {
    const [rows] = await pool.query(
      'SELECT * FROM bank_accounts WHERE driver_id = ?',
      [driverId]
    );
    return rows.length ? mapBankAccountRow(rows[0]) : null;
  }

  /**
   * Verify bank account
   */
  static async verify(driverId) {
    await pool.query(
      'UPDATE bank_accounts SET is_verified = TRUE WHERE driver_id = ?',
      [driverId]
    );
    return this.findByDriverId(driverId);
  }

  /**
   * Unverify bank account
   */
  static async unverify(driverId) {
    await pool.query(
      'UPDATE bank_accounts SET is_verified = FALSE WHERE driver_id = ?',
      [driverId]
    );
    return this.findByDriverId(driverId);
  }
}

module.exports = BankAccount;

