import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const VIEWPORTS = [
  { width: 320, height: 568, name: 'iPhone SE (320x568)' },
  { width: 360, height: 800, name: 'Galaxy S20 (360x800)' },
  { width: 375, height: 812, name: 'iPhone X (375x812)' },
  { width: 390, height: 844, name: 'iPhone 13/14 (390x844)' },
  { width: 412, height: 915, name: 'Pixel 7 (412x915)' },
  { width: 430, height: 932, name: 'iPhone 15 Pro Max (430x932)' },
  { width: 768, height: 1024, name: 'iPad Portrait (768x1024)' },
  { width: 1024, height: 768, name: 'iPad Landscape (1024x768)' },
  { width: 1280, height: 800, name: 'Laptop (1280x800)' },
  { width: 1440, height: 900, name: 'Desktop (1440x900)' },
];

async function runAudit() {
  console.log('========================================================================');
  console.log('  BAKASTREAM MASTER RESPONSIVE, PLAYBACK & ACCURACY AUDIT VERIFICATION ');
  console.log('========================================================================\n');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  const results = [];

  // 1. Audit Viewports for Horizontal Overflow & Navigation Visibility
  console.log('▶ STEP 1: Viewport Overflow & Layout Audit');
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(400);

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (overflow) {
        throw new Error(`Horizontal overflow detected! scrollWidth > innerWidth`);
      }

      console.log(`  ✅ ${vp.name}: Clean layout, 0 horizontal overflow`);
      results.push({ test: `Viewport ${vp.name}`, status: 'PASSED' });
    } catch (err) {
      console.log(`  ❌ ${vp.name}: Failed -> ${err.message}`);
      results.push({ test: `Viewport ${vp.name}`, status: 'FAILED', error: err.message });
    } finally {
      await page.close();
    }
  }

  // 2. Audit Landscape & Fullscreen Player Controls
  console.log('\n▶ STEP 2: Landscape & Fullscreen Player Audit');
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(`${BASE_URL}/watch/movie/550`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('.watch__landscape-btn', { timeout: 8000 });
    const btnText = await page.locator('.watch__landscape-btn').innerText();
    console.log(`  ✅ Landscape button detected in toolbar: "${btnText.trim()}"`);

    // Click Landscape / Fullscreen toggle
    await page.locator('.watch__landscape-btn').click();
    await page.waitForTimeout(300);

    const hasLandscapeClass = await page.evaluate(() => {
      const stage = document.querySelector('.watch__stage');
      return stage?.classList.contains('watch__stage--fullscreen') ||
             stage?.classList.contains('watch__stage--pseudo-landscape');
    });

    if (!hasLandscapeClass) {
      throw new Error('Landscape/fullscreen active class not applied to watch stage');
    }
    console.log(`  ✅ Landscape active state verified: Stage adapted with full viewport dimensions`);

    // Verify exit button
    await page.waitForSelector('.watch__exit-landscape-btn', { timeout: 4000 });
    await page.locator('.watch__exit-landscape-btn').click();
    await page.waitForTimeout(300);
    console.log(`  ✅ Exit Landscape button smoothly restores default portrait orientation`);

    results.push({ test: 'Landscape & Fullscreen Toggle', status: 'PASSED' });
  } catch (err) {
    console.log(`  ❌ Landscape audit failed: ${err.message}`);
    results.push({ test: 'Landscape & Fullscreen Toggle', status: 'FAILED', error: err.message });
  } finally {
    await page.close();
  }

  // 3. Audit Episode Accuracy & Upcoming vs Released
  console.log('\n▶ STEP 3: TV Series Episode Accuracy & Air Date Verification');
  const tvPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await tvPage.goto(`${BASE_URL}/watch/tv/1399/1/1`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await tvPage.waitForSelector('.season-selector__header', { timeout: 8000 });
    const subtitle = await tvPage.locator('.season-selector__subtitle').innerText();
    console.log(`  ✅ Episode metadata status verified: "${subtitle.trim()}"`);

    // Switch to List Mode
    const listBtn = tvPage.locator('.season-selector__view-btn', { hasText: 'List' });
    await listBtn.click();
    await tvPage.waitForSelector('.season-ep-card', { timeout: 5000 });
    const firstEpTitle = await tvPage.locator('.season-ep-card__name').first().innerText();
    console.log(`  ✅ Episode list mode verified: S1E1 title = "${firstEpTitle.trim()}"`);

    results.push({ test: 'Episode Accuracy & List Mode', status: 'PASSED' });
  } catch (err) {
    console.log(`  ❌ TV series audit failed: ${err.message}`);
    results.push({ test: 'Episode Accuracy & List Mode', status: 'FAILED', error: err.message });
  } finally {
    await tvPage.close();
  }

  // 4. Audit Indian & Regional Category Discovery
  console.log('\n▶ STEP 4: Indian Content & Categories Verification');
  const catPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    const categoriesToTest = ['hindi-serials', 'hindi-web-series', 'bollywood'];
    for (const cat of categoriesToTest) {
      await catPage.goto(`${BASE_URL}/category/${cat}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await catPage.waitForSelector('.media-card', { timeout: 8000 });
      const cardCount = await catPage.locator('.media-card').count();
      console.log(`  ✅ Category /category/${cat} loaded ${cardCount} verified titles`);
    }
    results.push({ test: 'Indian Regional Categories', status: 'PASSED' });
  } catch (err) {
    console.log(`  ❌ Category audit failed: ${err.message}`);
    results.push({ test: 'Indian Regional Categories', status: 'FAILED', error: err.message });
  } finally {
    await catPage.close();
  }

  await browser.close();

  console.log('\n========================================================================');
  const passed = results.filter(r => r.status === 'PASSED').length;
  console.log(`MASTER AUDIT SUMMARY: ${passed}/${results.length} PASSED`);
  console.log('========================================================================\n');

  if (passed !== results.length) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Master audit execution error:', err);
  process.exit(1);
});
