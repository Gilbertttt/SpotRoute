const express = require('express');
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, notificationController.getUserNotifications);
router.patch('/:id/read', authenticate, notificationController.markAsRead);
router.patch('/read-all', authenticate, notificationController.markAllAsRead);

module.exports = router;

