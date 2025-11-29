const Booking = require('../models/Booking');
const PaymentService = require('../services/paymentService');
const VirtualAccount = require('../models/VirtualAccount');

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

    const result = await PaymentService.processPaymentReceived({
      virtualAccountNumber,
      amount: amountValue,
      paymentReference,
      bookingId,
      metadata,
    });

    await Booking.markPaymentAsPaid({
      bookingId,
      paymentReference,
      amountPaid: amountValue,
    });

    const updatedBooking = await Booking.findById(bookingId);

    res.json({
      message: 'Transfer confirmed successfully',
      booking: updatedBooking,
      payout: {
        driverAmount: result.driverAmount,
        commissionAmount: result.commissionAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};


