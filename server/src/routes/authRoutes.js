const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Log in user and return JWT
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user (protected)
 */
router.get('/me', authMiddleware, getMe);

module.exports = router;
