const axios = require('axios');

/**
 * Helper to get the AI Service base URL dynamically from environment variables
 */
const getAiServiceUrl = () => process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Dispatch an image frame to the Python AI service via REST API
 * @param {string} base64Image - Base64-encoded image string
 * @returns {Promise<Object>} - Predicted sign, confidence, and landmarks
 */
const predictGesture = async (base64Image) => {
  const aiServiceUrl = getAiServiceUrl();
  const response = await axios.post(
    `${aiServiceUrl}/predict`,
    { image: base64Image },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000, // 10 second timeout for computer vision processing
    }
  );
  return response.data;
};

module.exports = {
  predictGesture,
  getAiServiceUrl,
};
