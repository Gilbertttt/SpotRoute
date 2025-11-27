const Route = require('../models/Route');
const PickupPoint = require('../models/PickupPoint');

exports.getAllRoutes = async (req, res, next) => {
  try {
    const routes = await Route.findAll();
    res.json(routes);
  } catch (error) {
    next(error);
  }
};

exports.getRouteById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const route = await Route.findById(id);
    
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    
    res.json(route);
  } catch (error) {
    next(error);
  }
};

exports.getPickupPointsByRouteId = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verify route exists
    const route = await Route.findById(id);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    
    const pickupPoints = await PickupPoint.findByRouteId(id);
    res.json(pickupPoints);
  } catch (error) {
    next(error);
  }
};

