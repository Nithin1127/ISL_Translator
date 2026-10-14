const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * Validates JSON Web Token in the Authorization header:
 * Format: Bearer <token>
 * Attaches decoded user payload ({ id, email }) to req.user
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No authentication token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Malformed authorization token.',
    });
  }

  const jwtSecret = process.env.JWT_SECRET || 'supersecret_jwt_key_change_in_production';

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // { id, email, ... }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Authentication token has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token.',
    });
  }
};

module.exports = authMiddleware;
