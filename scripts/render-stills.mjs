// Photographs the renderer for the page's still images.
// Usage: npm run stills  (starts its own Vite server)
import { createServer } from 'vite';
import { createRequire } from 'node:module';

// Playwright is resolved the CommonJS way so a globally installed copy works too.
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdir, writeFile } from 'node:fs/promises';

const only = process.argv.slice(2);
const { SHOTS } = await import('../src/stills/shots.js');
const names = only.length ? only : Object.keys(SHOTS).filter((n) => n !== 'test');
const server = await createServer({ server: { port: 5199 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
await mkdir('public/stills', { recursive: true });
for (const name of names) {
  const s = SHOTS[name];
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
  page.on('pageerror', (e) => console.error(name, e.message));
  page.on('console', (m) => m.type() === 'error' && console.error(name, m.text()));
  await page.goto(`http://localhost:5199/still.html?shot=${name}`);
  await page.waitForFunction('window.__ready === true', null, { timeout: 120000 });
  if (name === 'test') {
    await page.locator('canvas').screenshot({ path: `${process.env.OUT || '.'}/test.jpg`, type: 'jpeg', quality: 84 });
  } else {
    // WebP straight from the canvas; the hero also gets a JPEG for social cards
    const data = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/webp', 0.8));
    await writeFile(`public/stills/${name}.webp`, Buffer.from(data.split(',')[1], 'base64'));
    if (name === 'hero') await page.locator('canvas').screenshot({ path: 'public/stills/hero.jpg', type: 'jpeg', quality: 82 });
  }
  console.log('wrote', name);
  await page.close();
}
await browser.close();
await server.close();
