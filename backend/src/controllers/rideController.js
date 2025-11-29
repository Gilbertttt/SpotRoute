const Ride = require('../models/Ride');
const Booking = require('../models/Booking');

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

exports.getRideById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findById(id);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    res.json(ride);
  } catch (error) {
    next(error);
  }
};

exports.getDriverRides = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const rides = await Ride.findByDriverId(driverId);
    res.json(rides);
  } catch (error) {
    next(error);
  }
};

exports.updateRideStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }

    const ride = await Ride.updateStatus({
      rideId: id,
      driverId: req.user.id,
      status,
    });

    res.json(ride);
  } catch (error) {
    next(error);
  }
};

exports.getRideBookings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findById(id);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.driver.id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bookings = await Booking.findByRideId(id);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

