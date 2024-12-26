import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

export async function captureMapScreenshot(lat, lng, outputDir) {

  if (!lat || !lng) {
    console.error('Invalid latitude or longitude:', lat, lng); // Debugging line
    return;
  }
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  await page.goto(mapUrl, { waitUntil: 'networkidle' });

  
  await page.waitForSelector('#searchbox');

  
  const screenshotPath = path.join(outputDir, `map-screenshot-${lat}-${lng}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(`Screenshot saved: ${screenshotPath}`);

  await browser.close();

  return screenshotPath;
}

captureMapScreenshot(lat, lng, outputDir)
  .then(screenshotPath => {
    console.log('Screenshot captured successfully!');
    console.log('Screenshot Path:', screenshotPath);

  })
  .catch(err => console.error('Error capturing screenshot:', err));
