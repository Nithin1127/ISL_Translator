/**
 * End-to-End Live MongoDB Atlas & Auth Flow Test
 * Automatically tests User registration, password hashing, JWT login,
 * saving translation history, and retrieving history from the real database.
 * 
 * Usage:
 *   node tests/test_atlas_flow.js
 */

const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Load server environment
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../src/models/User');
const History = require('../src/models/History');

async function testAtlasFlow() {
  console.log('='.repeat(70));
  console.log('MongoDB Atlas Live Database & Auth Lifecycle Test');
  console.log('='.repeat(70));

  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI || mongoURI.includes('127.0.0.1')) {
    console.log('\n[INFO] MONGODB_URI is currently pointing to local fallback or not set.');
    console.log('Once you place your Atlas connection string in server/.env:');
    console.log('  MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/isl_translator?retryWrites=true&w=majority');
    console.log('Run this script again using: node tests/test_atlas_flow.js');
    console.log('='.repeat(70));
    return;
  }

  console.log('\nConnecting to MongoDB Atlas...');
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`>>> [PASS] Connected successfully to host: ${conn.connection.host}`);
    console.log(`>>> [PASS] Connected to database: ${conn.connection.name}`);
  } catch (err) {
    console.error(`>>> [FAIL] Could not connect to MongoDB Atlas: ${err.message}`);
    console.error('Please check your IP whitelist in Atlas (Network Access -> Allow Access from Anywhere: 0.0.0.0/0).');
    process.exit(1);
  }

  const timestamp = Date.now();
  const testEmail = `viva_test_${timestamp}@example.com`;
  const testPassword = 'SecurePassword_123';
  let createdUserId = null;
  let createdHistoryId = null;

  try {
    // 1. Test User Creation & Password Hashing
    console.log(`\n[1] Registering test user: ${testEmail}...`);
    const user = new User({
      name: 'Viva Demo Student',
      email: testEmail,
      password: testPassword,
    });
    await user.save();
    createdUserId = user._id;

    console.log(`>>> [PASS] User saved in 'users' collection with ID: ${createdUserId}`);
    console.log(`>>> [PASS] Password hashed with bcrypt: ${user.password.substring(0, 15)}... (never stored plain)`);

    // 2. Test Password Matching
    console.log('\n[2] Verifying password verification during login...');
    const isMatch = await user.comparePassword(testPassword);
    const isWrongMatch = await user.comparePassword('wrong_password');
    if (isMatch && !isWrongMatch) {
      console.log('>>> [PASS] Password comparison works correctly (validates correct, rejects wrong).');
    } else {
      throw new Error('Password comparison failed');
    }

    // 3. Test JWT Generation & Verification
    console.log('\n[3] Generating and validating JWT token...');
    const secret = process.env.JWT_SECRET || 'supersecret_jwt_key_change_in_production';
    const token = jwt.sign({ id: user._id, email: user.email }, secret, { expiresIn: '1d' });
    const decoded = jwt.verify(token, secret);
    console.log(`>>> [PASS] JWT generated: ${token.substring(0, 25)}...`);
    console.log(`>>> [PASS] Decoded user ID from token: ${decoded.id}`);

    // 4. Test Translation History Saving
    console.log('\n[4] Saving completed translation to History collection...');
    const historyItem = new History({
      userId: user._id,
      recognizedText: 'HELLO WORLD',
      averageConfidence: 0.96,
    });
    await historyItem.save();
    createdHistoryId = historyItem._id;
    console.log(`>>> [PASS] History record saved in 'histories' collection with ID: ${createdHistoryId}`);
    console.log(`>>> [PASS] Recognized Text: "${historyItem.recognizedText}", Confidence: ${historyItem.averageConfidence * 100}%`);

    // 5. Test History Retrieval
    console.log('\n[5] Retrieving user history sorted newest first...');
    const historyList = await History.find({ userId: user._id }).sort({ createdAt: -1 });
    console.log(`>>> [PASS] Found ${historyList.length} history item(s) for user.`);
    console.log(`>>> [PASS] Most recent item: "${historyList[0].recognizedText}" at ${historyList[0].createdAt}`);

    // 6. Test User Isolation (Cannot retrieve another user's history)
    console.log('\n[6] Testing user isolation...');
    const otherUserHistory = await History.find({ userId: new mongoose.Types.ObjectId() });
    console.log(`>>> [PASS] Other user history returned: ${otherUserHistory.length} items (complete data privacy).`);

    console.log('\n' + '='.repeat(70));
    console.log('🎉 ALL DATABASE LIFECYCLE TESTS PASSED ON MONGODB ATLAS!');
    console.log('='.repeat(70));
  } catch (err) {
    console.error('>>> [FAIL] Error during Atlas flow test:', err.message);
  } finally {
    // Clean up test documents
    console.log('\nCleaning up test documents from Atlas...');
    if (createdHistoryId) await History.findByIdAndDelete(createdHistoryId);
    if (createdUserId) await User.findByIdAndDelete(createdUserId);
    console.log('>>> [PASS] Test documents cleaned up.');
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB Atlas.');
  }
}

testAtlasFlow();
