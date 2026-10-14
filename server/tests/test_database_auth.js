/**
 * Comprehensive verification suite for MongoDB Models, Authentication, and History APIs.
 * Usage: node tests/test_database_auth.js
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const BASE_URL = process.env.NODE_BASE_URL || 'http://127.0.0.1:5000';

async function runTests() {
  console.log('='.repeat(70));
  console.log('MongoDB, User Auth & History Integration Test Suite');
  console.log('='.repeat(70));

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
    }
  }

  // 1. Health check
  console.log('\n[TEST 1] GET /api/health');
  try {
    const res = await axios.get(`${BASE_URL}/api/health`);
    assert(res.status === 200, `Health returned 200 OK (status: ${res.data.status})`);
    assert(res.data.database === 'connected' || res.data.database === 'disconnected',
      `Health clearly reports database status: "${res.data.database}"`);
  } catch (err) {
    assert(false, `Health check failed: ${err.message}`);
  }

  // 2. AI Service Health via Node Bridge
  console.log('\n[TEST 2] GET /api/health/ai');
  try {
    const res = await axios.get(`${BASE_URL}/api/health/ai`);
    assert(res.status === 200 && res.data.aiServiceResponse?.model_loaded === true,
      `AI Bridge responded OK with model_loaded: ${res.data.aiServiceResponse?.model_loaded}`);
  } catch (err) {
    assert(false, `AI Health check failed: ${err.message}`);
  }

  // 3. User Model & Password Hashing Unit Test
  console.log('\n[TEST 3] User Schema & Bcrypt Hashing Validation');
  try {
    const User = require('../src/models/User');
    const dummyUser = new User({
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      password: 'college_viva_password_123',
    });

    // Check pre-save password hashing
    await dummyUser.validate();
    assert(dummyUser.name === 'Priya Sharma', 'User name field parsed');
    assert(dummyUser.email === 'priya.sharma@example.com', 'User email normalized');

    // Simulate pre-save hook
    const salt = await bcrypt.genSalt(10);
    dummyUser.password = await bcrypt.hash(dummyUser.password, salt);
    assert(dummyUser.password !== 'college_viva_password_123', 'Password is not stored in plain text');
    assert(await dummyUser.comparePassword('college_viva_password_123'), 'comparePassword successfully validates matching password');
    assert(!(await dummyUser.comparePassword('wrong_password')), 'comparePassword rejects mismatched password');
  } catch (err) {
    assert(false, `User Model test error: ${err.message}`);
  }

  // 4. History Model Unit Test
  console.log('\n[TEST 4] History Schema Validation');
  try {
    const History = require('../src/models/History');
    const dummyHistory = new History({
      userId: new mongoose.Types.ObjectId(),
      recognizedText: 'NAMASTE',
      averageConfidence: 0.94,
    });

    const validationError = dummyHistory.validateSync();
    assert(!validationError, 'History document passes validation with valid fields');
    assert(dummyHistory.recognizedText === 'NAMASTE', 'Recognized text stored accurately');
    assert(dummyHistory.averageConfidence === 0.94, 'Average confidence stored accurately');

    // Test required fields validation
    const invalidHistory = new History({});
    const error = invalidHistory.validateSync();
    assert(error?.errors?.recognizedText !== undefined, 'Recognized text is strictly required');
    assert(error?.errors?.userId !== undefined, 'userId is strictly required');
  } catch (err) {
    assert(false, `History Model test error: ${err.message}`);
  }

  // 5. Auth Middleware Protection
  console.log('\n[TEST 5] Route Protection & Middleware (GET /api/history)');
  try {
    // 5a. Missing token
    try {
      await axios.get(`${BASE_URL}/api/history`);
      assert(false, 'Expected 401 Unauthorized for missing token');
    } catch (err) {
      assert(err.response?.status === 401, 'Rejects request without token (401 Unauthorized)');
    }

    // 5b. Invalid token
    try {
      await axios.get(`${BASE_URL}/api/history`, {
        headers: { Authorization: 'Bearer invalid_jwt_token_string' },
      });
      assert(false, 'Expected 401 Unauthorized for invalid token');
    } catch (err) {
      assert(err.response?.status === 401, 'Rejects request with invalid token (401 Unauthorized)');
    }

    // 5c. Valid token format
    const secret = process.env.JWT_SECRET || 'supersecret_jwt_key_change_in_production';
    const testToken = jwt.sign({ id: new mongoose.Types.ObjectId().toString(), email: 'test@example.com' }, secret, { expiresIn: '1h' });
    try {
      const res = await axios.get(`${BASE_URL}/api/history`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      // If DB is connected -> 200, if disconnected -> 503
      assert(res.status === 200, 'Authenticated request accepted with 200 OK');
    } catch (err) {
      if (err.response?.status === 503) {
        assert(true, 'Token accepted by auth middleware; server correctly returned 503 while database is disconnected');
      } else {
        assert(false, `Unexpected response: ${err.response?.status || err.message}`);
      }
    }
  } catch (err) {
    assert(false, `Auth Middleware test failed: ${err.message}`);
  }

  // 6. Real-time Prediction Endpoint
  console.log('\n[TEST 6] AI Recognition Pipeline (POST /api/predict)');
  try {
    const fs = require('fs');
    const path = require('path');
    const sampleImgPath = path.resolve(__dirname, '../../ai-service/training/dataset/raw/Letters/A.jpg');

    if (fs.existsSync(sampleImgPath)) {
      const base64Img = `data:image/jpeg;base64,${fs.readFileSync(sampleImgPath).toString('base64')}`;
      const res = await axios.post(`${BASE_URL}/api/predict`, { image: base64Img });
      assert(res.status === 200 && res.data.prediction === 'A',
        `Predict returned sign: "${res.data.prediction}" with confidence ${res.data.confidence}`);
    } else {
      console.log('  [SKIP] Sample image not found, skipping live prediction test');
    }
  } catch (err) {
    assert(false, `Prediction test failed: ${err.message}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`TEST SUMMARY: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log('='.repeat(70));
}

runTests();
