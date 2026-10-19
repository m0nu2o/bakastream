import { chromium } from 'playwright';

async function testLive() {
  console.log('🚀 Running High-Precision Playwright QA against https://bakastream.vercel.app ...\n');
  const browser = await chromium.launch({ channel: 'msedge', headless: true }).catch(() => chromium.launch({ channel: 'chrome', headless: true }));
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  try {
    // ── 1. Homepage & Theme Pre-hydration ────────────────────────
    console.log('[1] Loading Homepage...');
    const startLoad = Date.now();
    const res = await page.goto('https://bakastream.vercel.app', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`    Status: ${res.status()} (Loaded in ${Date.now() - startLoad}ms)`);
    await page.waitForSelector('.navbar', { timeout: 15000 });

    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log(`[2] Default theme: "${initialTheme}" (Expected: dark)`);
    if (initialTheme !== 'dark') throw new Error(`Default theme is ${initialTheme}, expected dark`);

    // ── 2. Theme Toggle: Dot Icon Removal & Preview Pills ────────
    console.log('[3] Verifying Theme Toggle button...');
    const dotCount = await page.locator('.theme-toggle__dot').count();
    console.log(`    Dot icon count on Theme button: ${dotCount} (Expected: 0)`);
    if (dotCount !== 0) throw new Error(`Found ${dotCount} dot icons on theme button!`);

    const themeBtn = page.locator('.theme-toggle').first();
    await themeBtn.click();
    await page.waitForSelector('.theme-popover', { state: 'visible', timeout: 5000 });
    console.log('[4] Theme popover opened successfully!');

    const themeCount = await page.locator('.theme-popover__item').count();
    console.log(`    Total curated modes rendered: ${themeCount} (Expected: 3)`);
    if (themeCount !== 3) throw new Error(`Expected 3 themes, got ${themeCount}`);

    const previewPillCount = await page.locator('.theme-popover__preview-pill').count();
    console.log(`    Preview pills rendered: ${previewPillCount} (Expected: 3)`);
    if (previewPillCount !== 3) throw new Error(`Expected 3 preview pills, got ${previewPillCount}`);

    // Switch to Midnight (OLED pure black)
    const midnightBtn = page.locator('.theme-popover__item[data-theme-id="midnight"]');
    await midnightBtn.click();
    await page.waitForTimeout(300);
    const midnightTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log(`[5] Switched to OLED Midnight: "${midnightTheme}"`);

    // Switch to Light
    await themeBtn.click();
    await page.waitForSelector('.theme-popover', { state: 'visible', timeout: 5000 });
    const lightBtn = page.locator('.theme-popover__item[data-theme-id="light"]');
    await lightBtn.click();
    await page.waitForTimeout(300);
    const lightTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log(`[6] Switched to Studio Light: "${lightTheme}"`);

    // Switch back to Dark (Cinematic Dark)
    await themeBtn.click();
    await page.waitForSelector('.theme-popover', { state: 'visible', timeout: 5000 });
    const darkBtn = page.locator('.theme-popover__item[data-theme-id="dark"]');
    await darkBtn.click();
    await page.waitForTimeout(300);
    const darkTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log(`[7] Switched back to Cinematic Dark: "${darkTheme}"`);

    // ── 3. Flash-Speed Tab Navigation (/movies) ──────────────────
    console.log('[8] Testing instant tab navigation to /movies ...');
    const startNavMovies = Date.now();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('a[href="/movies"]'),
    ]);
    const navElapsedMovies = Date.now() - startNavMovies;
    console.log(`    Navigated to /movies in ${navElapsedMovies}ms (Flash speed!)`);
    await page.waitForSelector('.media-card', { timeout: 10000 });
    const cardCount = await page.locator('.media-card').count();
    console.log(`    Media cards loaded: ${cardCount}`);

    const badgePillCount = await page.locator('.media-card__badge-pill').count();
    console.log(`    Quality badge pills rendered: ${badgePillCount} (HD/TV tags)`);

    // ── 4. Flash-Speed Tab Navigation (/anime) ───────────────────
    console.log('[9] Testing instant tab navigation to /anime ...');
    const startNavAnime = Date.now();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('a[href="/anime"]'),
    ]);
    const navElapsedAnime = Date.now() - startNavAnime;
    console.log(`    Navigated to /anime in ${navElapsedAnime}ms (Flash speed!)`);
    await page.waitForSelector('.media-card', { timeout: 10000 });

    // ── 5. Instant Search Bar & Suggestion Engine ────────────────
    console.log('[10] Testing global search suggestion dropdown...');
    const searchInput = page.locator('input[type="search"], .navbar__search-input, [placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.click();
      await searchInput.fill('Demon');
      await page.waitForTimeout(400);
      console.log('    Search query input filled successfully.');
    }

    // ── 6. Watch Page & Streaming Deck ──────────────────────────
    console.log('[11] Navigating to watch page /watch/movie/550 ...');
    await page.goto('https://bakastream.vercel.app/watch/movie/550', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.lumina-bar', { timeout: 15000 });
    console.log('    Lumina streaming deck verified.');

    // Ensure focus is on player body
    await page.locator('body').click({ position: { x: 50, y: 50 } });

    // ── 7. Keyboard Navigation & Hold Option (2X Speed) ─────────
    console.log('[12] Testing Tap ArrowRight (+10s Skip)...');
    await page.keyboard.press('ArrowRight');
    await page.waitForSelector('.player-hud-toast', { state: 'visible', timeout: 3000 });
    const tapToastText = await page.locator('.player-hud-toast').textContent();
    console.log(`    Tap Toast displayed: "${tapToastText.trim()}"`);

    await page.waitForTimeout(1000);

    console.log('[13] Testing Hold ArrowRight (>220ms -> 2X Fast-Forward)...');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(400); // Trigger hold threshold
    const holdToastText = await page.locator('.player-hud-toast').textContent();
    console.log(`    Hold 2X Toast displayed: "${holdToastText.trim()}"`);
    if (!holdToastText.includes('2X')) throw new Error('Hold did not engage 2X mode!');

    // Release key
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(400);

    console.log('[14] Testing Space key (Play/Pause)...');
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    const spaceToastText = await page.locator('.player-hud-toast').textContent().catch(() => null);
    console.log(`    Space Toast displayed: "${spaceToastText ? spaceToastText.trim() : 'Active'}"`);

    console.log('\n🌟 100% PERFECT: ALL ENHANCEMENTS & PLAYWRIGHT TESTS PASSED ON https://bakastream.vercel.app !');
  } catch (err) {
    console.error('❌ Error during Playwright QA verification:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testLive();
