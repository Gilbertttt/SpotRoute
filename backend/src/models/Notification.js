const { v4: uuid } = require('uuid');
const { pool } = require('../config/database');

class Notification {
  /**
   * Persist a notification for a user (driver or passenger).
   */
  static async create({ userId, type, title, message, relatedId = null }) {
    const id = uuid();

    await pool.query(
      `
        INSERT INTO notifications (id, user_id, type, title, message, related_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [id, userId, type, title, message, relatedId],
    );

    return {
      id,
      userId,
      type,
      title,
      message,
      relatedId,
      read: false,
      createdAt: new Date().toISOString(),
    };
  }
}

module.exports = Notification;


