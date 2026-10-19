import http from 'http';
import { chromium } from 'playwright';

const servers = [
  { id: 'vidlink', url: 'https://vidlink.pro/movie/550?autoplay=true&primaryColor=f43b4c' },
  { id: 'nova', url: 'https://embed.smashystream.com/playere.php?tmdb=550' },
  { id: 'vidfast', url: 'https://vidfast.vc/movie/550?autoPlay=1' },
  { id: 'vidsrc-su', url: 'https://vidsrc.su/embed/movie/550' },
  { id: 'superembed', url: 'https://multiembed.mov/?video_id=550&tmdb=1' },
  { id: 'embedsu', url: 'https://embed.su/embed/movie/550' },
  { id: 'vidsrc-vip', url: 'https://vidsrc.vip/embed/movie/550' },
  { id: 'vidsrc-cc', url: 'https://vidsrc.cc/v2/embed/movie/550' },
  { id: '2embed', url: 'https://www.2embed.cc/embed/550' },
];

async function main() {
  const browser = await chromium.launch({ channel: 'msedge' });

  for (const s of servers) {
    const page = await browser.newPage();
    const popups = [];
    let navigatedAway = false;

    page.on('popup', p => {
      popups.push(p.url());
      p.close().catch(() => {});
    });

    page.on('framenavigated', f => {
      if (f === page.mainFrame() && !f.url().includes('localhost')) {
        navigatedAway = true;
      }
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;background:#000;">
          <iframe id="p" src="${s.url}" style="width:800px;height:450px;border:none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </body>
      </html>
    `;

    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });
    const port = 5000 + Math.floor(Math.random() * 1000);
    await new Promise(r => server.listen(port, r));

    try {
      await page.goto(`http://localhost:${port}`);
      await page.waitForTimeout(5000);

      // Check if video element or playing
      const frame = page.frameLocator('#p');
      const hasVideo = (await frame.locator('video').count()) > 0;
      const bodyText = await frame.locator('body').innerText().catch(() => '');
      const hasError = bodyText.includes('Disable Sandbox') || bodyText.includes('Error') || bodyText.includes('Not Found');

      // Click the player
      const center = page.locator('#p');
      await center.click({ position: { x: 400, y: 225 } });
      await page.waitForTimeout(2000);

      await page.screenshot({ path: `nosandbox_${s.id}.png` });

      console.log(`[${s.id}] hasVideo: ${hasVideo}, hasError: ${hasError}, popups: ${popups.length}, navigatedAway: ${navigatedAway}`);
    } catch (err) {
      console.log(`[${s.id}] Error: ${err.message}`);
    } finally {
      server.close();
      await page.close();
    }
  }

  await browser.close();
}

main().catch(console.error);
