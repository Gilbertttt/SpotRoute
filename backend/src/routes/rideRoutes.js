const express = require('express');
const rideController = require('../controllers/rideController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/available', rideController.getAvailableRides);
router.post('/', authenticate, requireRole('DRIVER'), rideController.createRide);

module.exports = router;





