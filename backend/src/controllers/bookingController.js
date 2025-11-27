const Booking = require('../models/Booking');

exports.createBooking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rideId, seatCount, pickupPointId } = req.body;

    if (!rideId || !seatCount) {
      return res.status(400).json({ message: 'rideId and seatCount are required' });
    }

    const seats = Number(seatCount);
    if (!Number.isInteger(seats) || seats <= 0) {
      return res.status(400).json({ message: 'seatCount must be a positive integer' });
    }

    const booking = await Booking.create({
      rideId,
      userId,
      seatCount: seats,
      pickupPointId: pickupPointId || null,
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

exports.getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const bookings = await Booking.findByUserId(userId);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

exports.getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns this booking
    if (booking.userId !== req.user.id && booking.ride.driver.id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

