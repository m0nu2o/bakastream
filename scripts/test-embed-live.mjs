import http from 'http';
import { chromium } from 'playwright';

async function main() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>Embed Test</title></head>
      <body style="margin:0;background:#000;">
        <iframe id="player" src="https://vidlink.pro/movie/550?autoplay=false&primaryColor=e50914" style="width:900px;height:550px;border:none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      </body>
    </html>
  `;

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });
  await new Promise(r => server.listen(4567, r));

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();

  page.on('popup', async popup => {
    console.log('POPUP DETECTED URL:', popup.url());
  });

  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log('MAIN FRAME NAVIGATED TO:', frame.url());
    }
  });

  await page.goto('http://localhost:4567');
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'vidlink_no_sandbox.png' });
  console.log('Screenshot saved to vidlink_no_sandbox.png');

  // Let's click on the video player in the iframe to see if any popup triggers!
  const frame = page.frameLocator('#player');
  const playBtn = frame.locator('button, video, .vds-play-button, [aria-label="Play"]').first();
  console.log('Play button count:', await playBtn.count());
  if (await playBtn.count() > 0) {
    console.log('Clicking play...');
    await playBtn.click();
    await page.waitForTimeout(4000);
    console.log('After click page URL:', page.url());
    await page.screenshot({ path: 'vidlink_after_click.png' });
  }

  server.close();
  await browser.close();
}

main().catch(console.error);
