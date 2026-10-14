import axios from 'axios';

// All frontend requests strictly go through the Node.js Express Gateway
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach JWT token to all requests if present in localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('isl_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Check health of Node.js Express Gateway
 */
export const checkNodeHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

/**
 * Check health of Python AI Service via Node.js Gateway Bridge
 */
export const checkAIBridgeHealth = async () => {
  const response = await apiClient.get('/health/ai');
  return response.data;
};

/**
 * Dispatch an image frame (base64) to Node.js /api/predict for ISL gesture inference
 * @param {string} base64Image - Captured camera frame as data URI
 * @returns {Promise<Object>} - Predicted sign letter, confidence, and hand landmarks
 */
export const sendPredictionFrame = async (base64Image) => {
  const response = await apiClient.post('/predict', { image: base64Image });
  return response.data;
};

/**
 * User Registration
 */
export const registerUser = async ({ name, email, password }) => {
  const response = await apiClient.post('/auth/register', { name, email, password });
  return response.data;
};

/**
 * User Login
 */
export const loginUser = async ({ email, password }) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
};

/**
 * Fetch Current Authenticated User Info
 */
export const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

/**
 * Save Completed Translation to MongoDB History
 */
export const saveTranslationHistory = async ({ recognizedText, averageConfidence }) => {
  const response = await apiClient.post('/history', { recognizedText, averageConfidence });
  return response.data;
};

/**
 * Fetch Saved Translation History (Authenticated User Only)
 */
export const fetchTranslationHistory = async () => {
  const response = await apiClient.get('/history');
  return response.data;
};

