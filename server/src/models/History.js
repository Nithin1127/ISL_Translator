const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    recognizedText: {
      type: String,
      required: [true, 'Recognized text is required'],
      trim: true,
    },
    averageConfidence: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

module.exports = mongoose.model('History', HistorySchema);

