const express = require('express');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/confirm-transfer', authMiddleware, paymentController.confirmTransfer);

module.exports = router;


