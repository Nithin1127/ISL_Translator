const { predictGesture } = require('../services/aiService');

/**
 * @route   POST /api/predict
 * @desc    Accepts base64 image frame from client, forwards to Python AI service,
 *          and returns predicted sign, confidence score, and hand landmarks.
 */
const handlePredict = async (req, res) => {
  const { image } = req.body;

  if (!image || typeof image !== 'string' || image.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "Bad Request: 'image' field is required in request body (must be a base64 string).",
    });
  }

  try {
    const aiResponse = await predictGesture(image);
    return res.status(200).json(aiResponse);
  } catch (error) {
    console.error('[Predict Controller Error]:', error.message);

    // Python AI service not running or connection refused
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Python AI Service is currently unavailable. Please verify the Python service is running.',
        details: error.message,
      });
    }

    // Request to Python service timed out
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        success: false,
        error: 'Gateway Timeout: Python AI Service took too long to process the image frame.',
        details: error.message,
      });
    }

    // Python service responded with an error HTTP status
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: 'Python AI Service returned an error response.',
        details: error.response.data || error.message,
      });
    }

    // General fallback error
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error while forwarding prediction to AI service.',
      details: error.message,
    });
  }
};

module.exports = {
  handlePredict,
};
