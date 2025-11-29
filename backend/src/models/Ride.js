const { v4: uuid } = require('uuid');
const { pool } = require('../config/database');
const Route = require('./Route');
const User = require('./User');
const PickupPoint = require('./PickupPoint');

const mapDriver = (row) => {
  if (!row) return null;
  const driver = {
    id: row.driver_id,
    email: row.driver_email,
    name: row.driver_name,
    phone: row.driver_phone,
    role: row.driver_role,
    createdAt: row.driver_created_at ? row.driver_created_at.toISOString() : undefined,
  };

  if (row.driver_car_model) {
    driver.carModel = row.driver_car_model;
  }
  if (row.driver_car_plate) {
    driver.carPlate = row.driver_car_plate;
  }
  if (row.driver_wallet) {
    try {
      driver.wallet = JSON.parse(row.driver_wallet);
    } catch (error) {
      driver.wallet = row.driver_wallet;
    }
  }
  if (row.driver_profile) {
    try {
      driver.profile = JSON.parse(row.driver_profile);
    } catch (error) {
      driver.profile = row.driver_profile;
    }
  }

  return driver;
};

const mapPickupPoint = (row) => {
  if (!row) return null;
  return {
    id: row.pickup_id,
    routeId: row.pickup_route_id,
    name: row.pickup_name,
    lat: Number(row.pickup_lat),
    lng: Number(row.pickup_lng),
  };
};

const mapRideRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    driver: mapDriver(row),
    route: {
      id: row.route_id,
      from: row.origin,
      to: row.destination,
      price: Number(row.price),
      distance: Number(row.distance_km),
      duration: `${row.duration_mins} mins`,
    },
    departureTime: row.departure_time.toISOString(),
    availableSeats: row.available_seats,
    totalSeats: row.total_seats,
    pickupPoints: [],
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
};

class Ride {
  static async create({ driverId, routeId, departureTime, totalSeats, pickupPointIds = [] }) {
    const route = await Route.findById(routeId);
    if (!route) {
      const error = new Error('Route not found');
      error.status = 404;
      throw error;
    }

    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'DRIVER') {
      const error = new Error('Driver not found');
      error.status = 404;
      throw error;
    }

    const id = uuid();
    const departure = new Date(departureTime);
    if (Number.isNaN(departure.getTime())) {
      const error = new Error('Invalid departureTime');
      error.status = 400;
      throw error;
    }

    const seats = totalSeats || 4;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert ride
      await connection.query(
        `
          INSERT INTO rides (id, driver_id, route_id, departure_time, available_seats, total_seats, status)
          VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED')
        `,
        [id, driverId, routeId, departure.toISOString().slice(0, 19).replace('T', ' '), seats, seats],
      );

      // Validate and insert pickup points
      if (pickupPointIds && pickupPointIds.length > 0) {
        // Verify all pickup points exist and belong to the route
        const placeholders = pickupPointIds.map(() => '?').join(',');
        const [pickupPoints] = await connection.query(
          `SELECT id, route_id FROM pickup_points WHERE id IN (${placeholders})`,
          pickupPointIds,
        );

        // Check if all pickup points belong to the route
        const invalidPickupPoints = pickupPoints.filter((pp) => pp.route_id !== routeId);
        if (invalidPickupPoints.length > 0) {
          const error = new Error('Some pickup points do not belong to the selected route');
          error.status = 400;
          throw error;
        }

        // Check if all provided pickup point IDs were found
        const foundIds = pickupPoints.map((pp) => pp.id);
        const missingIds = pickupPointIds.filter((id) => !foundIds.includes(id));
        if (missingIds.length > 0) {
          const error = new Error(`Pickup points not found: ${missingIds.join(', ')}`);
          error.status = 404;
          throw error;
        }

        // Insert ride pickup points
        for (const pickupPointId of pickupPointIds) {
          await connection.query(
            'INSERT INTO ride_pickup_points (ride_id, pickup_point_id) VALUES (?, ?)',
            [id, pickupPointId],
          );
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return Ride.findById(id);
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `
        SELECT
          rides.*,
          routes.origin,
          routes.destination,
          routes.price,
          routes.distance_km,
          routes.duration_mins,
          drivers.id as driver_id,
          drivers.email as driver_email,
          drivers.name as driver_name,
          drivers.phone as driver_phone,
          drivers.role as driver_role,
          drivers.created_at as driver_created_at,
          drivers.car_model as driver_car_model,
          drivers.car_plate as driver_car_plate,
          drivers.wallet as driver_wallet,
          drivers.profile as driver_profile
        FROM rides
        JOIN routes ON rides.route_id = routes.id
        JOIN users drivers ON rides.driver_id = drivers.id
        WHERE rides.id = ?
      `,
      [id],
    );

    if (rows.length === 0) return null;

    const ride = mapRideRow(rows[0]);

    // Fetch pickup points for this ride
    const [pickupPointRows] = await pool.query(
      `
        SELECT
          pp.id as pickup_id,
          pp.route_id as pickup_route_id,
          pp.name as pickup_name,
          pp.lat as pickup_lat,
          pp.lng as pickup_lng
        FROM ride_pickup_points rpp
        JOIN pickup_points pp ON rpp.pickup_point_id = pp.id
        WHERE rpp.ride_id = ?
        ORDER BY pp.name
      `,
      [id],
    );

    ride.pickupPoints = pickupPointRows.map(mapPickupPoint);
    return ride;
  }

  static async findAvailable({ from, to } = {}) {
    let query = `
      SELECT
        rides.*,
        routes.origin,
        routes.destination,
        routes.price,
        routes.distance_km,
        routes.duration_mins,
        drivers.id as driver_id,
        drivers.email as driver_email,
        drivers.name as driver_name,
        drivers.phone as driver_phone,
        drivers.role as driver_role,
        drivers.created_at as driver_created_at,
        drivers.car_model as driver_car_model,
        drivers.car_plate as driver_car_plate,
        drivers.wallet as driver_wallet,
        drivers.profile as driver_profile
      FROM rides
      JOIN routes ON rides.route_id = routes.id
      JOIN users drivers ON rides.driver_id = drivers.id
      WHERE rides.status = 'SCHEDULED' AND rides.available_seats > 0
    `;
    const params = [];

    if (from) {
      query += ' AND LOWER(routes.origin) LIKE ?';
      params.push(`%${from.toLowerCase()}%`);
    }
    if (to) {
      query += ' AND LOWER(routes.destination) LIKE ?';
      params.push(`%${to.toLowerCase()}%`);
    }

    query += ' ORDER BY rides.departure_time ASC';

    const [rows] = await pool.query(query, params);
    const rides = rows.map(mapRideRow);

    // Fetch pickup points for all rides
    for (const ride of rides) {
      const [pickupPointRows] = await pool.query(
        `
          SELECT
            pp.id as pickup_id,
            pp.route_id as pickup_route_id,
            pp.name as pickup_name,
            pp.lat as pickup_lat,
            pp.lng as pickup_lng
          FROM ride_pickup_points rpp
          JOIN pickup_points pp ON rpp.pickup_point_id = pp.id
          WHERE rpp.ride_id = ?
          ORDER BY pp.name
        `,
        [ride.id],
      );
      ride.pickupPoints = pickupPointRows.map(mapPickupPoint);
    }

    return rides;
  }

  static async findByDriverId(driverId) {
    const [rows] = await pool.query(
      `
        SELECT
          rides.*,
          routes.origin,
          routes.destination,
          routes.price,
          routes.distance_km,
          routes.duration_mins,
          drivers.id as driver_id,
          drivers.email as driver_email,
          drivers.name as driver_name,
          drivers.phone as driver_phone,
          drivers.role as driver_role,
          drivers.created_at as driver_created_at,
          drivers.car_model as driver_car_model,
          drivers.car_plate as driver_car_plate,
          drivers.wallet as driver_wallet,
          drivers.profile as driver_profile
        FROM rides
        JOIN routes ON rides.route_id = routes.id
        JOIN users drivers ON rides.driver_id = drivers.id
        WHERE rides.driver_id = ?
        ORDER BY rides.departure_time DESC
      `,
      [driverId],
    );

    const rides = rows.map(mapRideRow);

    for (const ride of rides) {
      const [pickupPointRows] = await pool.query(
        `
          SELECT
            pp.id as pickup_id,
            pp.route_id as pickup_route_id,
            pp.name as pickup_name,
            pp.lat as pickup_lat,
            pp.lng as pickup_lng
          FROM ride_pickup_points rpp
          JOIN pickup_points pp ON rpp.pickup_point_id = pp.id
          WHERE rpp.ride_id = ?
          ORDER BY pp.name
        `,
        [ride.id],
      );
      ride.pickupPoints = pickupPointRows.map(mapPickupPoint);
    }

    return rides;
  }

  static async updateStatus({ rideId, driverId, status }) {
    const allowedStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!allowedStatuses.includes(status)) {
      const error = new Error(`status must be one of ${allowedStatuses.join(', ')}`);
      error.status = 400;
      throw error;
    }

    const [result] = await pool.query(
      `
        UPDATE rides
        SET status = ?
        WHERE id = ? AND driver_id = ?
      `,
      [status, rideId, driverId],
    );

    if (result.affectedRows === 0) {
      const ride = await Ride.findById(rideId);
      if (!ride) {
        const error = new Error('Ride not found');
        error.status = 404;
        throw error;
      }

      const error = new Error('You are not allowed to update this ride');
      error.status = 403;
      throw error;
    }

    return Ride.findById(rideId);
  }
}

module.exports = Ride;



