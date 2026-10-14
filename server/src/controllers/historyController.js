const mongoose = require('mongoose');
const History = require('../models/History');

/**
 * @route   POST /api/history
 * @desc    Save a completed translation for the authenticated user
 */
const saveHistory = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database is currently unavailable. Please ensure MongoDB is connected.',
    });
  }

  const { recognizedText, averageConfidence } = req.body;

  if (!recognizedText || typeof recognizedText !== 'string' || !recognizedText.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Recognized text is required and cannot be empty.',
    });
  }

  try {
    const historyItem = new History({
      userId: req.user.id,
      recognizedText: recognizedText.trim(),
      averageConfidence: typeof averageConfidence === 'number' ? averageConfidence : 1.0,
    });

    const saved = await historyItem.save();

    return res.status(201).json({
      success: true,
      message: 'Translation history saved successfully',
      history: saved,
    });
  } catch (error) {
    console.error('[History Save Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to save translation history.',
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/history
 * @desc    Get translation history for authenticated user (newest first)
 */
const getHistory = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database is currently unavailable. Please ensure MongoDB is connected.',
    });
  }

  try {
    const records = await History.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: records.length,
      history: records,
    });
  } catch (error) {
    console.error('[History Get Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve translation history.',
      details: error.message,
    });
  }
};

module.exports = {
  saveHistory,
  getHistory,
};
