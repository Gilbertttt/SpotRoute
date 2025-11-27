const express = require('express');
const routeController = require('../controllers/routeController');

const router = express.Router();

router.get('/', routeController.getAllRoutes);
router.get('/:id/pickup-points', routeController.getPickupPointsByRouteId);
router.get('/:id', routeController.getRouteById);

module.exports = router;

