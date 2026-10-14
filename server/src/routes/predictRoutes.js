const express = require('express');
const { handlePredict } = require('../controllers/predictController');

const router = express.Router();

/**
 * @route   POST /api/predict
 * @desc    Submit base64 frame for real-time ISL gesture classification
 */
router.post('/', handlePredict);

module.exports = router;
