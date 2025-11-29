const express = require('express');
const rideController = require('../controllers/rideController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/available', rideController.getAvailableRides);
router.get('/driver/me', authenticate, requireRole('DRIVER'), rideController.getDriverRides);
router.get('/:id/bookings', authenticate, requireRole('DRIVER'), rideController.getRideBookings);
router.patch('/:id/status', authenticate, requireRole('DRIVER'), rideController.updateRideStatus);
router.get('/:id', rideController.getRideById);
router.post('/', authenticate, requireRole('DRIVER'), rideController.createRide);

module.exports = router;





