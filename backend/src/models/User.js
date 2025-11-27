const { v4: uuid } = require('uuid');
const { pool } = require('../config/database');

const buildDriverProfile = () => ({
  tripsCompleted: 0,
  overallRating: 0,
  totalRatings: 0,
  badges: [],
  ratings: [],
  joinDate: new Date().toISOString(),
});

const buildDriverWallet = () => ({
  id: uuid(),
  balance: 0,
  pendingBalance: 0,
  totalEarnings: 0,
});

const mapUserRow = (row, { includePassword = false } = {}) => {
  if (!row) return null;
  const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    createdAt: row.created_at.toISOString(),
  };

  if (row.car_model) {
    user.carModel = row.car_model;
  }
  if (row.car_plate) {
    user.carPlate = row.car_plate;
  }
  if (row.wallet) {
    try {
      user.wallet = JSON.parse(row.wallet);
    } catch (error) {
      user.wallet = row.wallet;
    }
  }
  if (row.profile) {
    try {
      user.profile = JSON.parse(row.profile);
    } catch (error) {
      user.profile = row.profile;
    }
  }
  if (includePassword) {
    user.password = row.password;
  }

  return user;
};

class User {
  static async create({ email, password, name, phone, role, carModel, carPlate }) {
    const id = uuid();

    const driverProps =
      role === 'DRIVER'
        ? {
            carModel: carModel || 'Toyota Corolla',
            carPlate: carPlate || `SR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
            wallet: buildDriverWallet(),
            profile: buildDriverProfile(),
          }
        : {};

    await pool.query(
      `
        INSERT INTO users (id, email, password, name, phone, role, car_model, car_plate, wallet, profile)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        email.toLowerCase(),
        password,
        name,
        phone,
        role,
        driverProps.carModel || null,
        driverProps.carPlate || null,
        driverProps.wallet ? JSON.stringify(driverProps.wallet) : null,
        driverProps.profile ? JSON.stringify(driverProps.profile) : null,
      ],
    );

    return {
      id,
      email: email.toLowerCase(),
      password,
      name,
      phone,
      role,
      carModel: driverProps.carModel,
      carPlate: driverProps.carPlate,
      wallet: driverProps.wallet,
      profile: driverProps.profile,
      createdAt: new Date().toISOString(),
    };
  }

  static async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    return rows.length ? mapUserRow(rows[0]) : null;
  }

  static async findByEmailWithPassword(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    return rows.length ? mapUserRow(rows[0], { includePassword: true }) : null;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows.length ? mapUserRow(rows[0]) : null;
  }
}

module.exports = User;

