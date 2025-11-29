const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'spotroute',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
});

const runMigrations = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        role ENUM('USER','DRIVER') NOT NULL,
        car_model VARCHAR(255),
        car_plate VARCHAR(50),
        wallet JSON,
        profile JSON,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id CHAR(36) PRIMARY KEY,
        origin VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        distance_km DECIMAL(10,2) NOT NULL,
        duration_mins INT NOT NULL,
        UNIQUE KEY unique_route (origin, destination)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS rides (
        id CHAR(36) PRIMARY KEY,
        driver_id CHAR(36) NOT NULL,
        route_id CHAR(36) NOT NULL,
        departure_time DATETIME NOT NULL,
        available_seats INT NOT NULL,
        total_seats INT NOT NULL,
        status ENUM('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'SCHEDULED',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES users(id),
        FOREIGN KEY (route_id) REFERENCES routes(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id CHAR(36) PRIMARY KEY,
        ride_id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        seat_count INT NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        status ENUM('PENDING','CONFIRMED','CANCELLED','COMPLETED') DEFAULT 'CONFIRMED',
        payment_status ENUM('PENDING','PAID','FAILED','REFUNDED') DEFAULT 'PAID',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ride_id) REFERENCES rides(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS pickup_points (
        id CHAR(36) PRIMARY KEY,
        route_id CHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        lat DECIMAL(10, 8) NOT NULL,
        lng DECIMAL(11, 8) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS ride_pickup_points (
        ride_id CHAR(36) NOT NULL,
        pickup_point_id CHAR(36) NOT NULL,
        PRIMARY KEY (ride_id, pickup_point_id),
        FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
        FOREIGN KEY (pickup_point_id) REFERENCES pickup_points(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        related_id CHAR(36),
        \`read\` BOOLEAN DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Add pickup_point_id to bookings table if it doesn't exist
    try {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bookings' 
        AND COLUMN_NAME = 'pickup_point_id'
      `);
      
      if (columns.length === 0) {
        await connection.query(`
          ALTER TABLE bookings 
          ADD COLUMN pickup_point_id CHAR(36),
          ADD FOREIGN KEY fk_booking_pickup_point (pickup_point_id) 
          REFERENCES pickup_points(id) ON DELETE SET NULL
        `);
      }
    } catch (error) {
      // Ignore error if column already exists or foreign key already exists
      if (!error.message.includes('Duplicate column') && !error.message.includes('Duplicate key')) {
        console.warn('Error adding pickup_point_id to bookings:', error.message);
      }
    }

    await ensureBookingRatingColumns(connection);

    // Virtual Accounts Table - Stores virtual account details for drivers
    await connection.query(`
      CREATE TABLE IF NOT EXISTS virtual_accounts (
        id CHAR(36) PRIMARY KEY,
        driver_id CHAR(36) NOT NULL UNIQUE,
        account_number VARCHAR(50) NOT NULL UNIQUE,
        bank_name VARCHAR(100) NOT NULL,
        bank_code VARCHAR(10) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Bank Accounts Table - Stores driver's actual bank account details
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id CHAR(36) PRIMARY KEY,
        driver_id CHAR(36) NOT NULL UNIQUE,
        account_number VARCHAR(50) NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        bank_code VARCHAR(10) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Payment Transactions Table - Tracks all payments, commissions, and transfers
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id CHAR(36) PRIMARY KEY,
        driver_id CHAR(36) NOT NULL,
        virtual_account_id CHAR(36),
        booking_id CHAR(36),
        transaction_type ENUM('PAYMENT_RECEIVED', 'COMMISSION_DEDUCTED', 'DRIVER_PAYOUT', 'REFUND') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        commission_amount DECIMAL(10,2) DEFAULT 0,
        commission_percentage DECIMAL(5,2) DEFAULT 0,
        driver_amount DECIMAL(10,2) DEFAULT 0,
        reference VARCHAR(255) UNIQUE,
        payment_reference VARCHAR(255),
        status ENUM('PENDING', 'SUCCESS', 'FAILED', 'PROCESSING') DEFAULT 'PENDING',
        description TEXT,
        metadata JSON,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (virtual_account_id) REFERENCES virtual_accounts(id) ON DELETE SET NULL,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
      )
    `);

    // Company Settings Table - Stores commission percentage and main account details
    await connection.query(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id CHAR(36) PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Seed default company settings if they don't exist
    try {
      const [settings] = await connection.query('SELECT COUNT(*) as total FROM company_settings');
      if (settings[0].total === 0) {
        const { v4: uuid } = require('uuid');
        await connection.query(`
          INSERT INTO company_settings (id, setting_key, setting_value, description)
          VALUES 
            (?, 'COMMISSION_PERCENTAGE', '10.00', 'Default commission percentage taken from driver payments'),
            (?, 'MAIN_ACCOUNT_NUMBER', '0000000000', 'SpotRoute main account number'),
            (?, 'MAIN_ACCOUNT_BANK', 'SpotRoute Bank', 'SpotRoute main account bank name'),
            (?, 'MAIN_ACCOUNT_NAME', 'SpotRoute Limited', 'SpotRoute main account name')
        `, [uuid(), uuid(), uuid(), uuid()]);
      }
    } catch (error) {
      console.warn('Error seeding company settings:', error.message);
    }

    await seedRoutes(connection);
    await seedPickupPoints(connection);
  } finally {
    connection.release();
  }
};

const seedRoutes = async (connection) => {
  const [rows] = await connection.query('SELECT COUNT(*) as total FROM routes');
  if (rows[0].total > 0) return;

  const { v4: uuid } = require('uuid');
  const routes = [
    { origin: 'Lekki', destination: 'Victoria Island', price: 2500, distance_km: 8, duration_mins: 25 },
    { origin: 'Ikeja', destination: 'Yaba', price: 3500, distance_km: 18, duration_mins: 40 },
    { origin: 'Ajah', destination: 'Obalende', price: 4000, distance_km: 22, duration_mins: 55 },
  ];

  for (const route of routes) {
    await connection.query(
      `
      INSERT INTO routes (id, origin, destination, price, distance_km, duration_mins)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [uuid(), route.origin, route.destination, route.price, route.distance_km, route.duration_mins],
    );
  }
};

const seedPickupPoints = async (connection) => {
  const [rows] = await connection.query('SELECT COUNT(*) as total FROM pickup_points');
  if (rows[0].total > 0) return;

  const { v4: uuid } = require('uuid');
  
  // Get all routes to seed pickup points
  const [routes] = await connection.query('SELECT id, origin, destination FROM routes');
  
  // Map routes to their pickup points based on origin-destination
  const pickupPointsData = {
    'Lekki-Victoria Island': [
      { name: 'Lekki Phase 1', lat: 6.4449, lng: 3.4774 },
      { name: 'Lekki Phase 2', lat: 6.4369, lng: 3.4869 },
      { name: 'Admiralty Way', lat: 6.4504, lng: 3.4727 },
    ],
    'Ikeja-Yaba': [
      { name: 'Ikeja City Mall', lat: 6.6018, lng: 3.3515 },
      { name: 'Computer Village', lat: 6.5954, lng: 3.3376 },
      { name: 'Yaba Bus Stop', lat: 6.5134, lng: 3.3711 },
      { name: 'Tejuosho', lat: 6.5144, lng: 3.3621 },
    ],
    'Ajah-Obalende': [
      { name: 'Ajah Market', lat: 6.4449, lng: 3.5774 },
      { name: 'Sangotedo', lat: 6.4369, lng: 3.5869 },
      { name: 'TBS', lat: 6.4504, lng: 3.4727 },
      { name: 'Obalende', lat: 6.4434, lng: 3.3811 },
    ],
  };

  for (const route of routes) {
    const key = `${route.origin}-${route.destination}`;
    const points = pickupPointsData[key] || [];
    
    for (const point of points) {
      const pointId = uuid();
      await connection.query(
        `
        INSERT INTO pickup_points (id, route_id, name, lat, lng)
        VALUES (?, ?, ?, ?, ?)
      `,
        [pointId, route.id, point.name, point.lat, point.lng],
      );
    }
  }
};

module.exports = {
  pool,
  runMigrations,
};

const ensureBookingRatingColumns = async (connection) => {
  const columnsToEnsure = [
    { name: 'rating_value', definition: 'INT' },
    { name: 'rating_comment', definition: 'TEXT' },
    { name: 'rating_compliment', definition: 'VARCHAR(255)' },
    { name: 'rating_created_at', definition: 'DATETIME' },
  ];

  for (const column of columnsToEnsure) {
    try {
      const [columns] = await connection.query(
        `
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'bookings' 
            AND COLUMN_NAME = ?
        `,
        [column.name],
      );

      if (columns.length === 0) {
        await connection.query(
          `ALTER TABLE bookings ADD COLUMN ${column.name} ${column.definition}`,
        );
      }
    } catch (error) {
      if (!error.message.includes('Duplicate column')) {
        console.warn(`Error ensuring column ${column.name} on bookings:`, error.message);
      }
    }
  }
};

