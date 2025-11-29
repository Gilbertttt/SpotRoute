const express = require('express');
const virtualAccountController = require('../controllers/virtualAccountController');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

// Webhook endpoint (no authentication required - uses webhook secret in production)
router.post('/webhook/payment', virtualAccountController.handlePaymentWebhook);

// All other routes require authentication
router.use(authenticate);

// Get or create virtual account for authenticated driver
router.get('/virtual-account', virtualAccountController.getMyVirtualAccount);

// Bank account management
router.get('/bank-account', virtualAccountController.getMyBankAccount);
router.post('/bank-account', virtualAccountController.createOrUpdateBankAccount);

// Payment transactions
router.get('/transactions', virtualAccountController.getMyTransactions);
router.get('/payment-stats', virtualAccountController.getMyPaymentStats);

// Payout requests
router.post('/payout', virtualAccountController.requestPayout);

module.exports = router;

