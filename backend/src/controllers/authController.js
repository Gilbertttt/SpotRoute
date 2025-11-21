const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const userStore = require('../store/userStore');
const tokenService = require('../services/tokenService');

const VALID_ROLES = ['USER', 'DRIVER'];

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
};

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

exports.register = async (req, res, next) => {
  try {
    const { email, password, name, phone, role, carModel, carPlate } = req.body;

    if (!email || !password || !name || !phone || !role) {
      return res
        .status(400)
        .json({ message: 'email, password, name, phone and role are required' });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'role must be USER or DRIVER' });
    }

    const existing = await userStore.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const baseUser = {
      id: uuid(),
      email: email.toLowerCase(),
      password: passwordHash,
      name,
      phone,
      role,
      createdAt: new Date().toISOString(),
    };

    const newUser =
      role === 'DRIVER'
        ? {
            ...baseUser,
            carModel: carModel || 'Toyota Corolla',
            carPlate: carPlate || `SR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
            wallet: buildDriverWallet(),
            profile: buildDriverProfile(),
          }
        : baseUser;

    await userStore.create(newUser);

    const token = tokenService.generateToken({
      id: newUser.id,
      role: newUser.role,
      email: newUser.email,
    });

    res.status(201).json({ token, user: sanitizeUser(newUser) });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await userStore.findByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = tokenService.generateToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });

    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await userStore.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    next(error);
  }
};


