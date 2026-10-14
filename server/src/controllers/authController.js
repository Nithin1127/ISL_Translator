const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const getJwtSecret = () => process.env.JWT_SECRET || 'supersecret_jwt_key_change_in_production';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 */
const register = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database is currently unavailable. Please ensure MongoDB is connected.',
    });
  }

  const { name, email, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password is required and must be at least 6 characters',
    });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email is already registered. Please log in instead.',
      });
    }

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    await user.save();

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('[Auth Register Error]:', error.message);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Email is already registered.',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'An error occurred during registration.',
      details: error.message,
    });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return token
 */
const login = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database is currently unavailable. Please ensure MongoDB is connected.',
    });
  }

  const { email, password } = req.body;

  if (!email || !email.trim() || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required',
    });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during login.',
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user info
 */
const getMe = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database is currently unavailable.',
    });
  }

  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
