require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { runMigrations } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const routeRoutes = require('./routes/routeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const virtualAccountRoutes = require('./routes/virtualAccountRoutes');

const app = express();

const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'SpotRoute backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/driver', virtualAccountRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
  });
});

const startServer = async () => {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`🚗 SpotRoute backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();
