const express = require('express');
const { saveHistory, getHistory } = require('../controllers/historyController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Both routes are protected by JWT authentication
router.post('/', authMiddleware, saveHistory);
router.get('/', authMiddleware, getHistory);

module.exports = router;
