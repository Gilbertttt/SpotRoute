const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'spotroute-dev-secret';
const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '7d';

exports.generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

exports.verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};


