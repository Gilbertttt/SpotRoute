const { v4: uuid } = require('uuid');
const { pool } = require('../config/database');

const mapVirtualAccountRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    driverId: row.driver_id,
    accountNumber: row.account_number,
    bankName: row.bank_name,
    bankCode: row.bank_code,
    accountName: row.account_name,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at ? row.created_at.toISOString() : undefined,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : undefined,
  };
};

class VirtualAccount {
  /**
   * Generate a unique virtual account number
   * Format: SR + 8 random digits
   */
  static generateAccountNumber() {
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
    return `SR${randomDigits}`;
  }

  /**
   * Create a virtual account for a driver
   */
  static async create({ driverId, accountName }) {
    const id = uuid();
    const accountNumber = this.generateAccountNumber();
    
    // Default bank details (can be configured via environment variables)
    const bankName = process.env.VIRTUAL_ACCOUNT_BANK_NAME || 'SpotRoute Bank';
    const bankCode = process.env.VIRTUAL_ACCOUNT_BANK_CODE || 'SRB';

    await pool.query(
      `
        INSERT INTO virtual_accounts (id, driver_id, account_number, bank_name, bank_code, account_name)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [id, driverId, accountNumber, bankName, bankCode, accountName]
    );

    return this.findById(id);
  }

  /**
   * Find virtual account by ID
   */
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM virtual_accounts WHERE id = ?',
      [id]
    );
    return rows.length ? mapVirtualAccountRow(rows[0]) : null;
  }

  /**
   * Find virtual account by driver ID
   */
  static async findByDriverId(driverId) {
    const [rows] = await pool.query(
      'SELECT * FROM virtual_accounts WHERE driver_id = ?',
      [driverId]
    );
    return rows.length ? mapVirtualAccountRow(rows[0]) : null;
  }

  /**
   * Find virtual account by account number
   */
  static async findByAccountNumber(accountNumber) {
    const [rows] = await pool.query(
      'SELECT * FROM virtual_accounts WHERE account_number = ?',
      [accountNumber]
    );
    return rows.length ? mapVirtualAccountRow(rows[0]) : null;
  }

  /**
   * Get or create virtual account for a driver
   */
  static async getOrCreate(driverId, accountName) {
    let virtualAccount = await this.findByDriverId(driverId);
    
    if (!virtualAccount) {
      virtualAccount = await this.create({ driverId, accountName });
    }
    
    return virtualAccount;
  }

  /**
   * Update virtual account status
   */
  static async updateStatus(id, isActive) {
    await pool.query(
      'UPDATE virtual_accounts SET is_active = ? WHERE id = ?',
      [isActive, id]
    );
    return this.findById(id);
  }

  /**
   * Get all virtual accounts (for admin purposes)
   */
  static async findAll(limit = 100, offset = 0) {
    const [rows] = await pool.query(
      'SELECT * FROM virtual_accounts ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows.map(mapVirtualAccountRow);
  }
}

module.exports = VirtualAccount;

