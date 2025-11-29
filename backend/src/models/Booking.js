const { v4: uuid } = require('uuid');
const { pool } = require('../config/database');
const Ride = require('./Ride');
const User = require('./User');
const PickupPoint = require('./PickupPoint');

const mapBookingRow = (row) => {
  if (!row) return null;
  const booking = {
    id: row.id,
    rideId: row.ride_id,
    userId: row.user_id,
    pickupPointId: row.pickup_point_id,
    seatCount: row.seat_count,
    totalPrice: Number(row.total_price),
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at.toISOString(),
  };

  if (row.rating_value !== null && row.rating_value !== undefined) {
    booking.rating = {
      id: `rating-${row.id}`,
      bookingId: row.id,
      rating: row.rating_value,
      compliment: row.rating_compliment || undefined,
      comment: row.rating_comment || undefined,
      createdAt: row.rating_created_at
        ? row.rating_created_at.toISOString()
        : row.created_at.toISOString(),
    };
  }

  return booking;
};

class Booking {
  static async create({ rideId, userId, seatCount, pickupPointId }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rideRows] = await connection.query(
        `
          SELECT rides.*, routes.price, rides.driver_id
          FROM rides
          JOIN routes ON rides.route_id = routes.id
          WHERE rides.id = ?
          FOR UPDATE
        `,
        [rideId],
      );

      if (!rideRows.length) {
        const error = new Error('Ride not found');
        error.status = 404;
        throw error;
      }

      const ride = rideRows[0];

      // Check if ride has available seats
      if (ride.available_seats <= 0) {
        const error = new Error('No seats available on this ride');
        error.status = 400;
        throw error;
      }

      if (ride.available_seats < seatCount) {
        const error = new Error('Not enough seats available');
        error.status = 400;
        throw error;
      }

      const bookingId = uuid();
      const totalPrice = Number(ride.price) * seatCount;

      // Update available seats
      await connection.query(
        `
          UPDATE rides
          SET available_seats = available_seats - ?
          WHERE id = ?
        `,
        [seatCount, rideId],
      );

      // Create booking
      await connection.query(
        `
          INSERT INTO bookings (id, ride_id, user_id, seat_count, total_price, status, payment_status, pickup_point_id)
          VALUES (?, ?, ?, ?, ?, 'CONFIRMED', 'PAID', ?)
        `,
        [bookingId, rideId, userId, seatCount, totalPrice, pickupPointId || null],
      );

      // Get user details for notification
      const user = await User.findById(userId);
      const notificationId = uuid();
      await connection.query(
        `
          INSERT INTO notifications (id, user_id, type, title, message, related_id)
          VALUES (?, ?, 'BOOKING_CONFIRMED', 'New Booking Confirmed', ?, ?)
        `,
        [
          notificationId,
          ride.driver_id,
          `${user ? user.name : 'A user'} booked ${seatCount} seat(s) on your ride`,
          bookingId,
        ],
      );

      await connection.commit();

      const booking = await Booking.findById(bookingId);
      return booking;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!rows.length) return null;
    return await Booking.mapFullBooking(rows[0]);
  }

  static async findByUserId(userId) {
    const [rows] = await pool.query(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    );
    const bookings = [];
    for (const row of rows) {
      const booking = await Booking.mapFullBooking(row);
      if (booking) bookings.push(booking);
    }
    return bookings;
  }

  static async findByRideId(rideId) {
    const [rows] = await pool.query(
      'SELECT * FROM bookings WHERE ride_id = ? ORDER BY created_at DESC',
      [rideId],
    );
    const bookings = [];
    for (const row of rows) {
      const booking = await Booking.mapFullBooking(row);
      if (booking) bookings.push(booking);
    }
    return bookings;
  }

  static async cancel({ bookingId, requesterId, requesterRole }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [bookingRows] = await connection.query(
        `
          SELECT bookings.*, rides.driver_id, rides.available_seats, rides.total_seats
          FROM bookings
          JOIN rides ON bookings.ride_id = rides.id
          WHERE bookings.id = ?
          FOR UPDATE
        `,
        [bookingId],
      );

      if (!bookingRows.length) {
        const error = new Error('Booking not found');
        error.status = 404;
        throw error;
      }

      const bookingRow = bookingRows[0];

      if (bookingRow.status === 'CANCELLED') {
        await connection.commit();
        return Booking.findById(bookingId);
      }

      const isOwner = bookingRow.user_id === requesterId;
      const isDriver = bookingRow.driver_id === requesterId;

      if (!isOwner && !isDriver) {
        const error = new Error('You are not allowed to cancel this booking');
        error.status = 403;
        throw error;
      }

      await connection.query(
        `
          UPDATE bookings
          SET status = 'CANCELLED', payment_status = 'REFUNDED'
          WHERE id = ?
        `,
        [bookingId],
      );

      await connection.query(
        `
          UPDATE rides
          SET available_seats = LEAST(total_seats, available_seats + ?)
          WHERE id = ?
        `,
        [bookingRow.seat_count, bookingRow.ride_id],
      );

      await connection.commit();
      return Booking.findById(bookingId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async rate({ bookingId, userId, rating, compliment, comment }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [bookingRows] = await connection.query(
        `
          SELECT bookings.*, rides.driver_id
          FROM bookings
          JOIN rides ON bookings.ride_id = rides.id
          WHERE bookings.id = ?
          FOR UPDATE
        `,
        [bookingId],
      );

      if (!bookingRows.length) {
        const error = new Error('Booking not found');
        error.status = 404;
        throw error;
      }

      const bookingRow = bookingRows[0];

      if (bookingRow.user_id !== userId) {
        const error = new Error('You can only rate your own bookings');
        error.status = 403;
        throw error;
      }

      if (bookingRow.status === 'CANCELLED') {
        const error = new Error('Cannot rate a cancelled booking');
        error.status = 400;
        throw error;
      }

      if (bookingRow.rating_value) {
        const error = new Error('You have already rated this booking');
        error.status = 400;
        throw error;
      }

      await connection.query(
        `
          UPDATE bookings
          SET rating_value = ?, rating_comment = ?, rating_compliment = ?, rating_created_at = NOW()
          WHERE id = ?
        `,
        [rating, comment || null, compliment || null, bookingId],
      );

      const [driverRows] = await connection.query(
        'SELECT id, profile FROM users WHERE id = ? FOR UPDATE',
        [bookingRow.driver_id],
      );

      if (driverRows.length) {
        const driverRow = driverRows[0];
        let profile;

        if (driverRow.profile) {
          try {
            profile = JSON.parse(driverRow.profile);
          } catch (error) {
            profile = buildDefaultDriverProfile();
          }
        } else {
          profile = buildDefaultDriverProfile();
        }

        const prevTotal = profile.totalRatings || 0;
        const prevAvg = profile.overallRating || 0;
        const newTotal = prevTotal + 1;
        const newAvg = Number(((prevAvg * prevTotal + rating) / newTotal).toFixed(2));

        const ratingEntry = {
          id: `rating-${bookingId}`,
          bookingId,
          rating,
          compliment: compliment || undefined,
          comment: comment || undefined,
          createdAt: new Date().toISOString(),
        };

        profile.totalRatings = newTotal;
        profile.overallRating = newAvg;
        profile.ratings = Array.isArray(profile.ratings) ? profile.ratings : [];
        profile.ratings.unshift(ratingEntry);
        profile.ratings = profile.ratings.slice(0, 50);

        await connection.query('UPDATE users SET profile = ? WHERE id = ?', [
          JSON.stringify(profile),
          bookingRow.driver_id,
        ]);
      }

      await connection.commit();
      return Booking.findById(bookingId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async mapFullBooking(row) {
    const booking = mapBookingRow(row);
    if (!booking) return null;

    // Get ride with full driver details
    const ride = await Ride.findById(booking.rideId);
    if (!ride) return null;

    booking.ride = ride;

    // Get user details
    const user = await User.findById(booking.userId);
    if (user) {
      booking.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      };
    }

    // Get pickup point if exists
    if (booking.pickupPointId) {
      const pickupPoint = await PickupPoint.findById(booking.pickupPointId);
      if (pickupPoint) {
        booking.pickupPoint = pickupPoint;
      }
    }

    // Ensure driver profile is properly parsed and has default values
    if (ride.driver) {
      if (ride.driver.profile) {
        try {
          ride.driver.profile = typeof ride.driver.profile === 'string' 
            ? JSON.parse(ride.driver.profile) 
            : ride.driver.profile;
        } catch (error) {
          // If profile parsing fails, create default profile
          ride.driver.profile = {
            tripsCompleted: 0,
            overallRating: 0,
            totalRatings: 0,
            badges: [],
            ratings: [],
            joinDate: ride.driver.createdAt || new Date().toISOString(),
          };
        }
      } else {
        // If no profile exists, create default
        ride.driver.profile = {
          tripsCompleted: 0,
          overallRating: 0,
          totalRatings: 0,
          badges: [],
          ratings: [],
          joinDate: ride.driver.createdAt || new Date().toISOString(),
        };
      }
    }

    return booking;
  }
}

module.exports = Booking;

const buildDefaultDriverProfile = () => ({
  tripsCompleted: 0,
  overallRating: 0,
  totalRatings: 0,
  badges: [],
  ratings: [],
  joinDate: new Date().toISOString(),
});



