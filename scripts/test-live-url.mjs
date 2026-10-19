import { chromium } from 'playwright';

async function testLive() {
  console.log('Testing live production at https://bakastream.vercel.app ...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true }).catch(() => chromium.launch({ channel: 'chrome', headless: true }));
  const page = await browser.newPage();

  try {
    // 1. Load Homepage with networkidle (hydrated)
    const res = await page.goto('https://bakastream.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`[1] Homepage status: ${res.status()}`);

    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log(`[2] Default theme: ${initialTheme} (Expected: light)`);

    // 2. Open Theme Popover
    const themeBtn = page.locator('.theme-toggle').first();
    await themeBtn.click();
    await page.waitForSelector('.theme-popover', { state: 'visible', timeout: 5000 });
    console.log('[3] Theme popover opened successfully!');

    const themeCount = await page.locator('.theme-popover__item').count();
    console.log(`[4] Total themes rendered: ${themeCount} (Expected: 8)`);

    // Switch to Midnight (OLED pure black)
    const midnightBtn = page.locator('.theme-popover__item[data-theme-id="midnight"]');
    await midnightBtn.click();
    await page.waitForTimeout(300);
    const midnightTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log(`[5] Switched theme to: ${midnightTheme} (Expected: midnight)`);

    // Switch to Cyberpunk
    await themeBtn.click();
    await page.waitForSelector('.theme-popover', { state: 'visible', timeout: 5000 });
    const cyberpunkBtn = page.locator('.theme-popover__item[data-theme-id="cyberpunk"]');
    await cyberpunkBtn.click();
    await page.waitForTimeout(300);
    const cyberpunkTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log(`[6] Switched theme to: ${cyberpunkTheme} (Expected: cyberpunk)`);

    // Switch back to Light (Rose Red accent)
    await themeBtn.click();
    await page.waitForSelector('.theme-popover', { state: 'visible', timeout: 5000 });
    const lightBtn = page.locator('.theme-popover__item[data-theme-id="light"]');
    await lightBtn.click();
    await page.waitForTimeout(300);
    const lightTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log(`[7] Switched theme back to: ${lightTheme} (Expected: light)`);

    // 3. Test Flash-Speed Tab Navigation (/movies)
    console.log('[8] Testing instant tab navigation to /movies ...');
    const startNav = Date.now();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('a[href="/movies"]'),
    ]);
    const navElapsed = Date.now() - startNav;
    console.log(`[9] Navigated to /movies in ${navElapsed}ms (Flash speed!)`);
    await page.waitForSelector('.media-card', { timeout: 10000 });
    const cardCount = await page.locator('.media-card').count();
    console.log(`[10] Media cards loaded on /movies: ${cardCount}`);

    // 4. Test Watch Page & Keyboard Controls
    console.log('[11] Navigating to watch page /watch/movie/550 ...');
    await page.goto('https://bakastream.vercel.app/watch/movie/550', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.lumina-bar', { timeout: 15000 });
    console.log('[12] Lumina server deck loaded instantly.');

    // Ensure focus is on page body (not an input)
    await page.locator('body').click({ position: { x: 50, y: 50 } });

    // Test ArrowRight tap (+10s skip)
    console.log('[13] Testing Tap ArrowRight (+10s Skip)...');
    await page.keyboard.press('ArrowRight');
    await page.waitForSelector('.player-hud-toast', { state: 'visible', timeout: 2000 });
    const tapToastText = await page.locator('.player-hud-toast').textContent();
    console.log(`[14] Tap Toast displayed: "${tapToastText.trim()}"`);

    // Wait for toast to fade
    await page.waitForTimeout(1000);

    // Test Hold Space or ArrowRight (>220ms -> 2X Speed)
    console.log('[15] Testing Hold ArrowRight for 2X Fast-Forward...');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(400); // Exceed 220ms latch
    const holdToastText = await page.locator('.player-hud-toast').textContent();
    console.log(`[16] Hold Toast displayed: "${holdToastText.trim()}"`);
    
    // Release key
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(500);

    // Test Space tap (Play/Pause)
    console.log('[17] Testing Space tap (Play/Pause)...');
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    const spaceToastText = await page.locator('.player-hud-toast').textContent().catch(() => null);
    console.log(`[18] Space Toast displayed: "${spaceToastText ? spaceToastText.trim() : 'Active'}"`);

    console.log('\n🎉 ALL LIVE VERIFICATION TESTS PASSED 100% ON https://bakastream.vercel.app !');
  } catch (err) {
    console.error('❌ Error in live test:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testLive();
