import http from 'http';
import { chromium } from 'playwright';

const servers = [
  { name: 'vidlink', url: 'https://vidlink.pro/movie/550' },
  { name: 'vidfast', url: 'https://vidfast.vc/movie/550' },
  { name: 'vidsrc-su', url: 'https://vidsrc.su/embed/movie/550' },
  { name: 'superembed', url: 'https://multiembed.mov/?video_id=550&tmdb=1' },
  { name: 'embedsu', url: 'https://embed.su/embed/movie/550' },
  { name: 'smashystream', url: 'https://embed.smashystream.com/playere.php?tmdb=550' },
  { name: 'vidsrc-vip', url: 'https://vidsrc.vip/embed/movie/550' },
  { name: 'vidsrc-cc', url: 'https://vidsrc.cc/v2/embed/movie/550' },
  { name: '2embed', url: 'https://www.2embed.cc/embed/550' }
];

async function main() {
  const browser = await chromium.launch({ channel: 'msedge' });

  for (const s of servers) {
    const page = await browser.newPage();
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Testing ${s.name}</title></head>
        <body style="margin:0;background:#000;">
          <iframe id="f" src="${s.url}" sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox" style="width:800px;height:450px;border:none;" allowfullscreen></iframe>
        </body>
      </html>
    `;
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });
    const port = 4000 + Math.floor(Math.random() * 1000);
    await new Promise(r => server.listen(port, r));

    let detectedSandbox = false;
    let blocked = false;

    page.on('console', msg => {
      if (msg.text().toLowerCase().includes('sandbox')) {
        detectedSandbox = true;
      }
    });

    try {
      await page.goto(`http://localhost:${port}`, { waitUntil: 'domcontentloaded', timeout: 8000 });
      await page.waitForTimeout(4000);

      // Check text inside iframe if accessible or take screenshot
      await page.screenshot({ path: `server_test_${s.name}.png` });

      // Check page content for "Please Disable Sandbox"
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.toLowerCase().includes('disable sandbox')) {
        detectedSandbox = true;
      }
      console.log(`Server [${s.name}]: Sandbox Detected = ${detectedSandbox}`);
    } catch (err) {
      console.log(`Server [${s.name}] Error: ${err.message}`);
    } finally {
      server.close();
      await page.close();
    }
  }

  await browser.close();
}

main().catch(console.error);
