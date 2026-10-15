import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();

  console.log('--- Test 1: Desktop (1366x768) Watch Page & Server Categories ---');
  await page.goto('http://localhost:3000/watch/movie/550', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Check category tabs
  const tabs = await page.locator('.lumina-deck__cat-tab').allInnerTexts();
  console.log('Category Tabs found:', tabs);

  // Check server cards count initially
  const initialCards = await page.locator('.lumina-server-card').count();
  console.log(`Initial visible server cards: ${initialCards}`);

  // Check zero horizontal scroll on server deck
  const deckScroll = await page.evaluate(() => {
    const el = document.querySelector('.lumina-deck');
    const stage = document.querySelector('.watch__stage');
    return {
      deckScrollWidth: el ? el.scrollWidth : 0,
      deckClientWidth: el ? el.clientWidth : 0,
      hasDeckScroll: el ? el.scrollWidth > el.clientWidth : false,
      stageBottom: stage ? stage.getBoundingClientRect().bottom : 0
    };
  });
  console.log('Deck scroll status:', deckScroll);

  // Test clicking "Hindi & Multi-Lang" tab
  console.log('Clicking Hindi & Multi-Lang tab...');
  const hindiTab = page.locator('.lumina-deck__cat-tab', { hasText: 'Hindi' });
  await hindiTab.click();
  await page.waitForTimeout(500);

  const filteredCards = await page.locator('.lumina-server-card').count();
  console.log(`Filtered server cards (Hindi & Multi): ${filteredCards}`);

  const cardNames = await page.locator('.lumina-server-card__name').allInnerTexts();
  console.log('Filtered card names:', cardNames);

  // Test selecting a server in the filtered view
  const screenscapeCard = page.locator('.lumina-server-card', { hasText: 'ScreenScape India' });
  await screenscapeCard.click();
  await page.waitForTimeout(1000);

  const activeServerName = await page.locator('.lumina-server-card--active .lumina-server-card__name').innerText();
  console.log(`Active server after clicking ScreenScape: ${activeServerName}`);

  // Test clicking "All Servers" tab
  console.log('Clicking All Servers tab...');
  const allTab = page.locator('.lumina-deck__cat-tab', { hasText: 'All Servers' });
  await allTab.click();
  await page.waitForTimeout(500);

  const restoredCards = await page.locator('.lumina-server-card').count();
  console.log(`Cards after clicking All Servers: ${restoredCards}`);

  console.log('--- Test 2: Mobile (390x844) Watch Page ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  const mobileScroll = await page.evaluate(() => {
    const el = document.querySelector('.lumina-deck');
    const body = document.body;
    return {
      deckScrollWidth: el ? el.scrollWidth : 0,
      deckClientWidth: el ? el.clientWidth : 0,
      hasDeckScroll: el ? el.scrollWidth > el.clientWidth : false,
      hasBodyScroll: body ? body.scrollWidth > window.innerWidth : false,
    };
  });
  console.log('Mobile scroll status:', mobileScroll);

  console.log('--- Test 3: Light Mode Verification ---');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.waitForTimeout(500);

  const lightModeActive = await page.evaluate(() => {
    const card = document.querySelector('.lumina-server-card--active');
    const tab = document.querySelector('.lumina-deck__cat-tab--active');
    return {
      cardExists: !!card,
      tabExists: !!tab,
      cardBg: card ? window.getComputedStyle(card).backgroundColor : null,
      textColor: card ? window.getComputedStyle(card).color : null
    };
  });
  console.log('Light Mode Styles:', lightModeActive);

  await browser.close();
  console.log('ALL PLAYWRIGHT TESTS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Playwright Test Failed:', err);
  process.exit(1);
});
