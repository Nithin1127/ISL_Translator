const mongoose = require('mongoose');

/**
 * Establishes connection to MongoDB database (e.g. MongoDB Atlas).
 * Uses process.env.MONGODB_URI.
 * Designed to not crash the server if MongoDB is temporarily unavailable,
 * ensuring AI prediction and other endpoints stay operational.
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.warn('[MongoDB Warning] MONGODB_URI is not set in environment variables.');
    console.warn('[MongoDB Warning] Server running in database-disconnected mode.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging indefinitely
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.warn('[MongoDB Warning] Connection to MongoDB failed.');
    console.warn('[MongoDB Warning] Server will continue running, but database features will be unavailable.');
    console.warn(`[MongoDB Error Details] ${error.message}`);
  }
};

module.exports = connectDB;

