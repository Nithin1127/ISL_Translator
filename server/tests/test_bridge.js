/**
 * Automated verification script for Node.js Express -> Python FastAPI AI bridge.
 * Usage: node tests/test_bridge.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const NODE_BASE_URL = process.env.NODE_BASE_URL || 'http://127.0.0.1:5000';
const SAMPLE_IMAGE_PATH = path.resolve(__dirname, '../../ai-service/training/dataset/raw/Letters/A.jpg');

async function runBridgeTest() {
  console.log('='.repeat(65));
  console.log('Node.js Express <-> Python FastAPI AI Bridge Test');
  console.log('='.repeat(65));

  // Step 1: Health check
  console.log('\n[1] Testing GET /api/health/ai on Node.js gateway...');
  try {
    const healthResp = await axios.get(`${NODE_BASE_URL}/api/health/ai`);
    console.log('>>> [PASS] AI Bridge is online:');
    console.log(JSON.stringify(healthResp.data, null, 2));
  } catch (err) {
    console.error('>>> [FAIL] AI Bridge unreachable:', err.message);
    process.exit(1);
  }

  // Step 2: Prediction request with real ISL sign
  console.log(`\n[2] Testing POST /api/predict with ISL Letter A (${SAMPLE_IMAGE_PATH})...`);
  if (!fs.existsSync(SAMPLE_IMAGE_PATH)) {
    console.error('Sample image not found at', SAMPLE_IMAGE_PATH);
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(SAMPLE_IMAGE_PATH);
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

  try {
    const predictResp = await axios.post(
      `${NODE_BASE_URL}/api/predict`,
      { image: base64Image },
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('>>> [PASS] Received prediction response from Node.js:');
    console.log(JSON.stringify({
      success: predictResp.data.success,
      hand_detected: predictResp.data.hand_detected,
      prediction: predictResp.data.prediction,
      sign: predictResp.data.sign,
      confidence: predictResp.data.confidence,
      landmarks_count: predictResp.data.landmarks_count,
      feature_vector_size: predictResp.data.feature_vector_size,
      message: predictResp.data.message,
    }, null, 2));

    if (predictResp.data.success && predictResp.data.prediction) {
      console.log(`\n🎉 BRIDGE VERIFIED: Node successfully received sign '${predictResp.data.prediction}' with confidence ${predictResp.data.confidence} from Python!`);
    }
  } catch (err) {
    console.error('>>> [FAIL] Prediction request failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runBridgeTest();
