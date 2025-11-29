const express = require('express');
const bookingController = require('../controllers/bookingController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.post('/', authenticate, requireRole('USER'), bookingController.createBooking);
router.get('/user/me', authenticate, bookingController.getUserBookings);
router.patch('/:id/cancel', authenticate, bookingController.cancelBooking);
router.post('/:id/rate', authenticate, requireRole('USER'), bookingController.rateBooking);
router.get('/:id', authenticate, bookingController.getBookingById);

module.exports = router;
