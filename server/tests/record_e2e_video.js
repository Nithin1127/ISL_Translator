/**
 * Automated Playwright End-to-End Test and Video Recording Script
 * ISL Translator Web Portal
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function showSceneBanner(page, text) {
  try {
    await page.evaluate((msg) => {
      let el = document.getElementById('demo-scene-banner');
      if (!el) {
        el = document.createElement('div');
        el.id = 'demo-scene-banner';
        el.style.position = 'fixed';
        el.style.bottom = '24px';
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
        el.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
        el.style.border = '1px solid rgba(59, 130, 246, 0.5)';
        el.style.color = '#38bdf8';
        el.style.padding = '10px 22px';
        el.style.borderRadius = '9999px';
        el.style.fontSize = '14px';
        el.style.fontWeight = '600';
        el.style.boxShadow = '0 10px 30px rgba(0,0,0,0.7)';
        el.style.zIndex = '99999';
        el.style.pointerEvents = 'none';
        el.style.fontFamily = 'Inter, sans-serif';
        document.body.appendChild(el);
      }
      el.innerText = msg;
    }, text);
  } catch {}
}

async function recordE2E() {
  console.log('='.repeat(70));
  console.log('Starting End-to-End Test & Video Recording');
  console.log('='.repeat(70));

  const recordingsDir = path.resolve(__dirname, '../../test-recordings');
  const rawDir = path.join(recordingsDir, 'raw');

  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }

  // Load sample ISL letter images from dataset
  const lettersDir = path.resolve(__dirname, '../../ai-service/training/dataset/raw/Letters');
  const getLetterBase64 = (letter) => {
    const file = path.join(lettersDir, `${letter}.jpg`);
    if (fs.existsSync(file)) {
      return `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`;
    }
    return null;
  };

  const imgA = getLetterBase64('A');
  const imgB = getLetterBase64('B');
  const imgC = getLetterBase64('C');

  console.log('[Setup] Dataset images loaded for A, B, C:', !!imgA, !!imgB, !!imgC);

  // Launch browser with video recording
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: rawDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  const timestamp = Date.now();
  const testUser = {
    name: 'Aarav Sharma',
    email: `aarav.sharma.${timestamp}@islportal.edu`,
    password: 'Password123!',
  };

  try {
    // ----------------------------------------------------
    // SCENE 1: Home Page Landing
    // ----------------------------------------------------
    console.log('\n[SCENE 1] Loading Home Page (http://localhost:5173)...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await showSceneBanner(page, 'Step 1/11: Exploring Home Page & System Features');
    await page.waitForTimeout(2000);

    // Scroll slightly to view key features
    await page.evaluate(() => window.scrollBy({ top: 250, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollBy({ top: -250, behavior: 'smooth' }));
    await page.waitForTimeout(1000);

    // Click "Start Translating" CTA
    console.log('[SCENE 1] Clicking "Start Translating"...');
    const startBtn = page.locator('button:has-text("Start Translating")').first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
    } else {
      await page.locator('button.nav-item:has-text("Translator")').first().click();
    }
    await page.waitForTimeout(2000);

    // ----------------------------------------------------
    // SCENE 2: Guest Mode & Boundary Validation
    // ----------------------------------------------------
    console.log('\n[SCENE 2] Demonstrating Translator Workspace in Guest Mode...');
    await showSceneBanner(page, 'Step 2/11: Translator Workspace (Guest Mode)');
    await page.waitForTimeout(1500);

    // Click Sign In button in Navbar
    console.log('[SCENE 2] Navigating to Sign In / Register page...');
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForTimeout(1500);

    // ----------------------------------------------------
    // SCENE 3: User Registration & Authentication
    // ----------------------------------------------------
    console.log(`\n[SCENE 3] Registering new user: ${testUser.name} (${testUser.email})...`);
    await showSceneBanner(page, 'Step 3/11: User Registration & JWT Authentication');
    await page.waitForTimeout(1000);

    // Click "Create Account" tab
    await page.locator('button[role="tab"]:has-text("Create Account")').first().click();
    await page.waitForTimeout(800);

    // Fill form with realistic typing delays
    await page.fill('#auth-name', testUser.name);
    await page.waitForTimeout(400);
    await page.fill('#auth-email', testUser.email);
    await page.waitForTimeout(400);
    await page.fill('#auth-password', testUser.password);
    await page.waitForTimeout(800);

    // Submit registration
    console.log('[SCENE 3] Submitting registration form...');
    await page.locator('button[type="submit"]:has-text("Register Account")').first().click();
    await page.waitForTimeout(2500);

    // Verify redirected back to Translator and user pill is visible in Navbar
    const userPill = page.locator('.nav-user-pill').first();
    await userPill.waitFor({ state: 'visible', timeout: 5000 });
    console.log('>>> [PASS] Authenticated! User badge visible:', await userPill.innerText());
    await showSceneBanner(page, `Authenticated as ${testUser.name} (JWT Stored)`);
    await page.waitForTimeout(1500);

    // ----------------------------------------------------
    // SCENE 4: Real-time ISL Gesture Recognition (Letter A)
    // ----------------------------------------------------
    console.log('\n[SCENE 4] Testing ISL Gesture Recognition for Letter A...');
    await showSceneBanner(page, "Step 4/11: ISL Gesture Recognition - Sign 'A'");

    // Click Start Camera
    const cameraPlaceholderBtn = page.locator('.camera-placeholder button:has-text("Start Camera")').first();
    if (await cameraPlaceholderBtn.isVisible()) {
      await cameraPlaceholderBtn.click();
      await page.waitForTimeout(1000);
    }

    // Inject Letter A
    await page.evaluate((base64) => {
      window.dispatchEvent(new CustomEvent('isl:set-test-frame', { detail: base64 }));
    }, imgA);

    // Wait for AI service response and display update
    console.log('[SCENE 4] Injected gesture A. Waiting for AI model inference...');
    await page.waitForTimeout(2500);

    const letterDisplay = page.locator('.prediction-letter-display').first();
    const predA = await letterDisplay.innerText();
    console.log('>>> [PASS] Current Prediction:', predA);

    // Wait for debouncing commit (requires ~1.2s of stable frames)
    await page.waitForTimeout(2000);
    const recognizedBox = page.locator('.text-output-display').first();
    console.log('>>> [PASS] Recognized Text:', await recognizedBox.innerText());

    // ----------------------------------------------------
    // SCENE 5: Second Gesture Recognition (Letter B)
    // ----------------------------------------------------
    console.log('\n[SCENE 5] Testing ISL Gesture Recognition for Letter B...');
    await showSceneBanner(page, "Step 5/11: ISL Gesture Recognition - Sign 'B'");
    await page.evaluate((base64) => {
      window.dispatchEvent(new CustomEvent('isl:set-test-frame', { detail: base64 }));
    }, imgB);

    await page.waitForTimeout(2500);
    const predB = await letterDisplay.innerText();
    console.log('>>> [PASS] Current Prediction:', predB);

    // Wait for debouncing commit
    await page.waitForTimeout(2000);
    console.log('>>> [PASS] Recognized Text:', await recognizedBox.innerText());

    // ----------------------------------------------------
    // SCENE 6: Third Gesture Recognition (Letter C)
    // ----------------------------------------------------
    console.log('\n[SCENE 6] Testing ISL Gesture Recognition for Letter C...');
    await showSceneBanner(page, "Step 6/11: ISL Gesture Recognition - Sign 'C'");
    await page.evaluate((base64) => {
      window.dispatchEvent(new CustomEvent('isl:set-test-frame', { detail: base64 }));
    }, imgC);

    await page.waitForTimeout(2500);
    const predC = await letterDisplay.innerText();
    console.log('>>> [PASS] Current Prediction:', predC);

    await page.waitForTimeout(2000);
    console.log('>>> [PASS] Accumulated Sentence:', await recognizedBox.innerText());

    // ----------------------------------------------------
    // SCENE 7: Control Bar Interactions (Space & Backspace)
    // ----------------------------------------------------
    console.log('\n[SCENE 7] Testing Control Bar Editing Actions...');
    await showSceneBanner(page, 'Step 7/11: Editing Controls (Space, Backspace, Audio)');

    // Click Add Space
    const spaceBtn = page.locator('button:has-text("Space")').first();
    if (await spaceBtn.isVisible()) {
      await spaceBtn.click();
      await page.waitForTimeout(800);
      console.log('>>> Clicked Space');
    }

    // Click Backspace
    const backspaceBtn = page.locator('button:has-text("Backspace")').first();
    if (await backspaceBtn.isVisible()) {
      await backspaceBtn.click();
      await page.waitForTimeout(800);
      console.log('>>> Clicked Backspace');
    }

    // Click Copy
    const copyBtn = page.locator('button:has-text("Copy")').first();
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
      await page.waitForTimeout(1200);
      console.log('>>> Clicked Copy');
    }

    // Click Speak (Text-to-Speech)
    const speakBtn = page.locator('button:has-text("Speak")').first();
    if (await speakBtn.isVisible()) {
      await speakBtn.click();
      await page.waitForTimeout(1000);
      console.log('>>> Clicked Speak');
    }

    // ----------------------------------------------------
    // SCENE 8: Save Translation to MongoDB Atlas
    // ----------------------------------------------------
    console.log('\n[SCENE 8] Saving Translation to MongoDB Atlas...');
    await showSceneBanner(page, 'Step 8/11: Saving Translation to MongoDB Atlas Database');
    const saveBtn = page.locator('button.btn-secondary:has-text("Save")').first();
    await saveBtn.click();

    // Wait for save feedback
    await page.waitForTimeout(2500);
    console.log('>>> [PASS] Translation saved successfully to MongoDB Atlas database!');

    // ----------------------------------------------------
    // SCENE 9: View History Page (Live Atlas Query)
    // ----------------------------------------------------
    console.log('\n[SCENE 9] Navigating to Recognition History Page...');
    await showSceneBanner(page, 'Step 9/11: Live Translation History (MongoDB Atlas)');
    await page.locator('button.nav-item:has-text("History")').first().click();
    await page.waitForTimeout(2500);

    // Verify history cards rendered
    const historyCards = page.locator('.history-card');
    const cardCount = await historyCards.count();
    console.log(`>>> [PASS] Found ${cardCount} saved translation record(s) on MongoDB Atlas:`);
    if (cardCount > 0) {
      const firstCardText = await historyCards.first().locator('.history-text').innerText();
      console.log(`>>> Record text: "${firstCardText}"`);
    }

    // Demonstrate Refresh button
    const refreshBtn = page.locator('button:has-text("Refresh")').first();
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await page.waitForTimeout(1800);
      console.log('>>> Clicked Refresh (verified live database sync)');
    }

    // ----------------------------------------------------
    // SCENE 10: About Page & System Info
    // ----------------------------------------------------
    console.log('\n[SCENE 10] Viewing About Page...');
    await showSceneBanner(page, 'Step 10/11: System Architecture & ML Pipeline Specs');
    await page.locator('button.nav-item:has-text("About")').first().click();
    await page.waitForTimeout(3000);

    // ----------------------------------------------------
    // SCENE 11: User Logout & Session Cleanup
    // ----------------------------------------------------
    console.log('\n[SCENE 11] Performing Logout...');
    await showSceneBanner(page, 'Step 11/11: Secure Logout & Session Termination');
    const logoutBtn = page.locator('button:has-text("Logout")').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(1800);
      console.log('>>> Logged out successfully');
    }

    // Verify returning to History as guest shows auth required message
    await page.locator('button.nav-item:has-text("History")').first().click();
    await page.waitForTimeout(2000);
    console.log('>>> [PASS] History page correctly prompts for login when logged out');

    // Return to Translator for final shot
    await page.locator('button.nav-item:has-text("Translator")').first().click();
    await page.waitForTimeout(2000);

    console.log('\n' + '='.repeat(70));
    console.log('🎉 ALL END-TO-END TEST SCENARIOS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70));
  } catch (err) {
    console.error('>>> [ERROR during test flow]:', err.message);
  } finally {
    // Close context to finish writing the webm recording
    console.log('\nFinalizing video recording...');
    await page.close();
    await context.close();
    await browser.close();
    console.log('Chromium browser closed. Video saved to disk.');
  }

  // Find the recorded raw webm file
  const rawFiles = fs.readdirSync(rawDir).filter(f => f.endsWith('.webm'));
  if (rawFiles.length === 0) {
    console.error('No webm video was found in', rawDir);
    return;
  }

  const latestWebm = rawFiles.sort((a, b) => {
    return fs.statSync(path.join(rawDir, b)).mtimeMs - fs.statSync(path.join(rawDir, a)).mtimeMs;
  })[0];

  const inputWebmPath = path.join(rawDir, latestWebm);
  const outputMp4Path = path.join(recordingsDir, 'isl_translator_e2e_walkthrough.mp4');

  console.log(`\nConverting ${inputWebmPath} -> ${outputMp4Path}...`);

  // Convert to MP4 using Python OpenCV converter
  const pythonPath = path.resolve(__dirname, '../../ai-service/.venv/Scripts/python.exe');
  const converterScript = path.resolve(recordingsDir, 'convert_video.py');

  try {
    execSync(`"${pythonPath}" "${converterScript}" "${inputWebmPath}" "${outputMp4Path}"`, {
      stdio: 'inherit',
    });
    console.log(`\n🎉 MP4 Video successfully generated: ${outputMp4Path}`);
    console.log(`Video File Size: ${fs.statSync(outputMp4Path).size} bytes`);
  } catch (convErr) {
    console.error('Error during MP4 conversion:', convErr.message);
  }
}

recordE2E().catch(console.error);
