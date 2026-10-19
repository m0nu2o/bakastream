import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge' });

  const testPermutations = [
    { name: 'none', attr: null },
    { name: 'full_permissive_no_nav', attr: 'allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-storage-access-by-user-activation' },
    { name: 'with_top_nav', attr: 'allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox allow-top-navigation' },
    { name: 'with_top_nav_by_user', attr: 'allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation' },
  ];

  for (const t of testPermutations) {
    const p = await browser.newPage();
    const sandboxStr = t.attr ? `sandbox="${t.attr}"` : '';
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test ${t.name}</title></head>
        <body style="margin:0;background:#000;">
          <iframe id="f" src="https://vidlink.pro/movie/550" ${sandboxStr} style="width:800px;height:500px;border:none;"></iframe>
        </body>
      </html>
    `;
    await p.setContent(html);
    await p.waitForTimeout(5000);
    await p.screenshot({ path: `sandbox_${t.name}.png` });
    console.log(`Finished test for ${t.name}`);
    await p.close();
  }

  await browser.close();
}

main().catch(console.error);
