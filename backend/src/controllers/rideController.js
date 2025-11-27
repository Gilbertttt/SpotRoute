const Ride = require('../models/Ride');

exports.getAvailableRides = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const rides = await Ride.findAvailable({ from, to });
    res.json(rides);
  } catch (error) {
    next(error);
  }
};

exports.createRide = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const { routeId, departureTime, totalSeats, pickupPointIds } = req.body;

    if (!routeId || !departureTime) {
      return res.status(400).json({ message: 'routeId and departureTime are required' });
    }

    const seats = totalSeats ? Number(totalSeats) : 4;
    if (!Number.isInteger(seats) || seats <= 0) {
      return res.status(400).json({ message: 'totalSeats must be a positive integer' });
    }

    const ride = await Ride.create({
      driverId,
      routeId,
      departureTime,
      totalSeats: seats,
      pickupPointIds: pickupPointIds || [],
    });

    res.status(201).json(ride);
  } catch (error) {
    next(error);
  }
};

