import { chromium } from('playwright');

(async () => {
  const latitude = 40.7303068116;
  const longitude = -74.0428305264;

  // Create a Google Maps URL for the location
  const url = `https://www.google.com/maps/@${latitude},${longitude},15z`;

  // Launch a browser instance
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to the location on Google Maps
  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait for the map to load completely
  await page.waitForTimeout(5000); // Adjust time as needed

  // Take a screenshot
  await page.screenshot({ path: 'screenshot.png', fullPage: false });

  console.log('Screenshot saved as screenshot.png');

  // Close the browser
  await browser.close();
})();
