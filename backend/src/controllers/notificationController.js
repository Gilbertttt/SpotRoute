const { pool } = require('../config/database');

exports.getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `
        SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [userId],
    );

    const notifications = rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      relatedId: row.related_id,
      read: Boolean(row.read),
      createdAt: row.created_at.toISOString(),
    }));

    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [result] = await pool.query(
      'UPDATE notifications SET `read` = TRUE WHERE id = ? AND user_id = ?',
      [id, userId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await pool.query('UPDATE notifications SET `read` = TRUE WHERE user_id = ? AND `read` = FALSE', [
      userId,
    ]);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

