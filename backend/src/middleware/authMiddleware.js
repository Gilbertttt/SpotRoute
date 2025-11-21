const tokenService = require('../services/tokenService');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = tokenService.verifyToken(token);
    req.user = payload;
    next();
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};


