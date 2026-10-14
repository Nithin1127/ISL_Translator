const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testRecord() {
  const videoDir = path.resolve(__dirname, '../test-recordings/temp_raw');
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Close context to flush video
  await page.close();
  await context.close();
  await browser.close();

  const files = fs.readdirSync(videoDir);
  console.log('Video dir files:', files);
}

testRecord().catch(console.error);
