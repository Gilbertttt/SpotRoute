const Booking = require('../models/Booking');
const PaymentService = require('../services/paymentService');
const VirtualAccount = require('../models/VirtualAccount');
const { pool } = require('../config/database');

exports.confirmTransfer = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { bookingId, amount, paymentReference, narration } = req.body;

    if (!bookingId || !amount || !paymentReference) {
      return res.status(400).json({
        message: 'bookingId, amount and paymentReference are required',
      });
    }

    const amountValue = Number(amount);
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }

    // Get booking details first to validate
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({ message: 'You can only confirm transfers for your bookings' });
    }

    if (booking.paymentStatus === 'PAID') {
      return res.status(400).json({ message: 'Payment already confirmed for this booking' });
    }

    const driverId = booking.ride?.driver?.id;
    if (!driverId) {
      return res.status(400).json({ message: 'Driver information not available for this booking' });
    }

    const accountName = booking.ride.driver.name || 'SpotRoute Driver';
    let virtualAccountNumber = booking.ride.driver.virtualAccount?.accountNumber;

    if (!virtualAccountNumber) {
      const account = await VirtualAccount.getOrCreate(driverId, accountName);
      virtualAccountNumber = account.accountNumber;
    }

    const metadata = {
      bookingId,
      userId,
      userName: req.user.name || booking.user?.name,
      userEmail: req.user.email || booking.user?.email,
      narration: narration || `Transfer for booking ${bookingId}`,
    };

    // Check seat availability before processing payment
    const connection = await pool.getConnection();
    let rideRow;
    try {
      await connection.beginTransaction();

      // Lock the ride row and check seat availability
      const [rideRows] = await connection.query(
        `
          SELECT rides.available_seats, rides.id as ride_id
          FROM rides
          JOIN bookings ON rides.id = bookings.ride_id
          WHERE bookings.id = ? AND bookings.payment_status != 'PAID'
          FOR UPDATE
        `,
        [bookingId],
      );

      if (!rideRows.length) {
        await connection.rollback();
        return res.status(404).json({ message: 'Ride not found for this booking or payment already processed' });
      }

      rideRow = rideRows[0];

      // Check if seats are still available
      if (rideRow.available_seats < booking.seatCount) {
        await connection.rollback();
        return res.status(400).json({ message: 'Not enough seats available. This ride may have been fully booked.' });
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    // Process payment (PaymentService handles its own transaction)
    let result;
    try {
      result = await PaymentService.processPaymentReceived({
        virtualAccountNumber,
        amount: amountValue,
        paymentReference,
        bookingId,
        metadata,
      });
    } catch (error) {
      console.error('Payment processing failed:', error);
      // If payment processing fails, create a proper error with status
      const paymentError = new Error(error.message || 'Payment processing failed');
      paymentError.status = error.status || 500;
      throw paymentError;
    }

    // After payment is processed, reduce seats and mark booking as paid
    const updateConnection = await pool.getConnection();
    try {
      await updateConnection.beginTransaction();

      // Reduce available seats when payment is confirmed
      await updateConnection.query(
        `
          UPDATE rides
          SET available_seats = available_seats - ?
          WHERE id = ?
        `,
        [booking.seatCount, rideRow.ride_id],
      );

      // Mark payment as paid
      await updateConnection.query(
        `
          UPDATE bookings
          SET 
            payment_status = 'PAID',
            status = CASE WHEN status = 'PENDING' THEN 'CONFIRMED' ELSE status END
          WHERE id = ?
        `,
        [bookingId],
      );

      await updateConnection.commit();
    } catch (error) {
      await updateConnection.rollback();
      console.error('Error updating seats and booking status:', error);
      throw error;
    } finally {
      updateConnection.release();
    }

    const updatedBooking = await Booking.findById(bookingId);

    return res.status(200).json({
      message: 'Transfer confirmed successfully',
      booking: updatedBooking,
      payout: {
        driverAmount: result.driverAmount,
        commissionAmount: result.commissionAmount,
      },
    });
  } catch (error) {
    console.error('Error in confirmTransfer:', error);
    console.error('Error stack:', error.stack);
    // Ensure we always send a response
    // Check if response has already been sent
    if (res.headersSent) {
      console.error('Response already sent, cannot send error response');
      return;
    }
    const status = error.status || 500;
    const message = error.message || 'Internal server error';
    return res.status(status).json({ message });
  }
};


