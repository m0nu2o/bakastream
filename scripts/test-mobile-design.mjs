import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve('mobile-audit-shots');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { width: 320, height: 568, name: 'iphone-se-320' },
  { width: 360, height: 800, name: 'galaxy-s20-360' },
  { width: 390, height: 844, name: 'iphone-14-390' },
  { width: 430, height: 932, name: 'iphone-promax-430' },
];

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/movie/550', name: 'movie-detail' },
  { path: '/tv/1399', name: 'tv-detail' },
  { path: '/watch/movie/550', name: 'watch-movie' },
  { path: '/watch/tv/1399/1/1', name: 'watch-tv' },
  { path: '/search?q=naruto', name: 'search' },
  { path: '/category/kdrama', name: 'category' },
  { path: '/calendar', name: 'calendar' },
  { path: '/watchlist', name: 'watchlist' },
];

async function runMobileAudit() {
  console.log('Starting Playwright Deep Mobile Design Audit...\n');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  const issues = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });

    const page = await context.newPage();

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      process.stdout.write(`  Checking ${route.name} (${route.path})... `);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(600);

        // Screenshot for verification
        const shotPath = path.join(OUT_DIR, `${vp.name}_${route.name}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });

        // 1. Detect any uncontained element horizontally overflowing the viewport
        const overflowingElements = await page.evaluate((vpWidth) => {
          function hasScrollableAncestor(el) {
            let curr = el.parentElement;
            while (curr && curr !== document.body && curr !== document.documentElement) {
              const style = window.getComputedStyle(curr);
              if (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll' || style.overflowX === 'hidden') {
                return true;
              }
              curr = curr.parentElement;
            }
            return false;
          }

          const bad = [];
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const rect = el.getBoundingClientRect();
            // allow 1.5px tolerance for subpixel rounding
            if (rect.right > vpWidth + 1.5) {
              if (hasScrollableAncestor(el)) {
                continue; // contained within a horizontal scroll or clipped track
              }
              const tag = el.tagName.toLowerCase();
              const cls = el.className ? `.${String(el.className).trim().replace(/\s+/g, '.')}` : '';
              const id = el.id ? `#${el.id}` : '';
              bad.push({
                selector: `${tag}${id}${cls}`.slice(0, 80),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                overflowAmount: Math.round(rect.right - vpWidth),
              });
            }
          }
          return bad.slice(0, 5); // top 5
        }, vp.width);

        // 2. Check if page body/html scrollWidth > window.innerWidth
        const pageOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });

        // 3. Check for clipped buttons / text overlap in key containers
        const layoutIssues = await page.evaluate(() => {
          const warnings = [];
          // Check if navbar logo or burger is overlapping
          const logo = document.querySelector('.navbar__logo');
          const actions = document.querySelector('.navbar__actions');
          if (logo && actions) {
            const lRect = logo.getBoundingClientRect();
            const aRect = actions.getBoundingClientRect();
            if (lRect.right > aRect.left) {
              warnings.push('Navbar logo collides with right actions');
            }
          }
          // Check player toolbar items wrap or overflow
          const toolbar = document.querySelector('.watch__toolbar');
          if (toolbar) {
            const tRect = toolbar.getBoundingClientRect();
            const items = toolbar.querySelectorAll('.watch__active-server-pill, .watch__shield-badge, .watch__landscape-btn');
            for (const it of items) {
              const r = it.getBoundingClientRect();
              if (r.right > tRect.right + 2) {
                warnings.push(`Toolbar item ${it.className} overflows toolbar`);
              }
            }
          }
          return warnings;
        });

        if (pageOverflow || overflowingElements.length > 0 || layoutIssues.length > 0) {
          console.log(`⚠️ ISSUES DETECTED`);
          if (pageOverflow) console.log(`    -> Document scrollWidth overflows innerWidth`);
          overflowingElements.forEach(o => {
            console.log(`    -> Overflow: ${o.selector} (exceeds by ${o.overflowAmount}px)`);
          });
          layoutIssues.forEach(l => console.log(`    -> Collision/Wrap: ${l}`));
          issues.push({
            viewport: vp.name,
            route: route.name,
            path: route.path,
            pageOverflow,
            overflowingElements,
            layoutIssues,
          });
        } else {
          console.log(`✅ OK`);
        }
      } catch (err) {
        console.log(`❌ ERROR: ${err.message}`);
        issues.push({
          viewport: vp.name,
          route: route.name,
          path: route.path,
          error: err.message,
        });
      }
    }

    // Also test opening the mobile drawer navigation
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(300);
      const burger = page.locator('.navbar__burger');
      if (await burger.isVisible()) {
        await burger.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}_drawer_open.png`) });

        const drawerOverflow = await page.evaluate(() => {
          const drawer = document.querySelector('.mobile-nav');
          if (!drawer) return 'Drawer not found in DOM';
          return null;
        });
        if (drawerOverflow) {
          issues.push({ viewport: vp.name, route: 'drawer', error: drawerOverflow });
        } else {
          console.log(`  Checking drawer on ${vp.name}... ✅ Drawer opens cleanly`);
        }
      }
    } catch (err) {
      console.log(`  Drawer check failed on ${vp.name}: ${err.message}`);
    }

    await page.close();
    await context.close();
  }

  await browser.close();

  console.log('\n======================================================');
  console.log(`TOTAL MOBILE ISSUES DETECTED: ${issues.length}`);
  console.log('======================================================');
  if (issues.length > 0) {
    fs.writeFileSync(path.join(OUT_DIR, 'issues.json'), JSON.stringify(issues, null, 2));
    console.log(`Issues written to ${path.join(OUT_DIR, 'issues.json')}`);
  }
}

runMobileAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
