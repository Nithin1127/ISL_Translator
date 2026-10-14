const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Basic health check for Node.js Express server
 */
router.get('/', (req, res) => {
  const isConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const dbStatus = isConnected ? 'connected' : 'disconnected';

  res.status(200).json({
    status: 'ok',
    database: dbStatus,
    service: 'Node.js Express Backend Gateway',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

/**
 * @route   GET /api/health/ai
 * @desc    Verify REST communication bridge to Python AI Microservice
 */
router.get('/ai', async (req, res) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

  try {
    const response = await axios.get(`${aiServiceUrl}/health`, { timeout: 3000 });
    res.status(200).json({
      status: 'ok',
      message: 'Successfully reached Python AI Service via REST API',
      aiServiceResponse: response.data,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unavailable',
      message: `Could not reach Python AI Service at ${aiServiceUrl}`,
      error: error.message,
    });
  }
});

module.exports = router;
