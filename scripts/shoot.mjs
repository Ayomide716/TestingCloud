// Dev helper: photographs the page along the journey at a given viewport.
// node scripts/shoot.mjs <width> <height> <outdir> [url]
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('playwright');
const [w = 1440, h = 900, out = 'shots', url = 'http://localhost:5173/'] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/00-intro.jpg`, type: 'jpeg', quality: 80 });
await page.waitForTimeout(6500);
const stops = await page.evaluate(() => {
  const t = (s) => document.querySelector(s).getBoundingClientRect().top + scrollY;
  const vh = innerHeight;
  const h = (s) => document.querySelector(s).offsetHeight;
  const w = t('.worlds'), wl = h('.worlds') - vh, a = t('.approach'), al = h('.approach') - vh;
  return [
    ['01-hero', 0], ['02-universe', t('.universe') - vh * 0.1], ['03-panorama', t('.panorama') - vh * 0.3],
    ['04-travel', w + wl * 0.15], ['05-discover', w + wl * 0.5], ['06-scale', w + wl * 0.92],
    ['07-atlas', t('.atlas') + h('.atlas') / 2 - vh / 2], ['08-approach', a + al * 0.15], ['09-warp', a + al * 0.45],
    ['10-entry', a + al * 0.8], ['11-immersion', t('.immersion') + vh * 0.3], ['12-moments', t('.immersion') + vh * 1.4],
    ['13-discover', t('.discover') - vh * 0.06], ['14-enter', t('.enter') - vh * 0.3], ['15-footer', document.documentElement.scrollHeight - vh],
  ];
});
for (const [name, y] of stops) {
  await page.evaluate((y) => { const l = window.__astrion?.lenis; if (l) l.scrollTo(y, { immediate: true }); else scrollTo(0, y); }, y);
  await page.waitForTimeout(600);
  // the software GPU in headless Chrome runs at a few frames a second: snap the scene to where it is heading
  await page.evaluate(() => { const a = window.__astrion; if (a?.space) { a.space.jump(); const b = a.space.body; if (b.pending) { b.target = b.pending; b.pending = null; } b.snap(); b.dim = 0; } });
  await page.waitForTimeout(+process.env.WAIT || 1800);
  await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 78 });
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
