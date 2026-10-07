// Measures board smoothness: wheel-zoom in/out and drag-pan on a fresh run, reports frame times.
import {open} from './lib.mjs';
const size = process.argv[2] || '390x780'; const [w, h] = size.split('x').map(Number);
const {browser, page, errors} = await open({viewport: {width: w, height: h}});
await page.click('text=NEW GAME'); await page.click('[data-action=start-run]');
for (let i = 0; i < 40; i++) { const d = await page.evaluate(() => { const d = document.getElementById('dialog'); if (d.open) { d.querySelector('button:not([disabled])')?.click(); return true; } return document.body.dataset.view !== 'board'; }); if (!d) break; await page.waitForTimeout(250); }
await page.waitForTimeout(1500);
const box = await page.locator('#map-root').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.evaluate(() => { window.__frames = []; let last = performance.now(); const tick = t => { window.__frames.push(t - last); last = t; if (window.__frames.length < 100000) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
const t0 = Date.now();
await page.waitForTimeout(1000); const idle = await page.evaluate(() => { const f = window.__frames.slice(5); return (f.reduce((a, b) => a + b, 0) / f.length).toFixed(1); }); console.log("idle avg frame", idle);
for (let k = 0; k < 3; k++) { for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(16); } for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(16); } }
await page.mouse.down(); for (let i = 0; i < 40; i++) { await page.mouse.move(box.x + box.width / 2 + i * 4, box.y + box.height / 2 + i * 6); } await page.mouse.up();
const f = await page.evaluate(() => window.__frames.slice(1));
f.sort((a, b) => a - b);
console.log(size, 'ms', Date.now() - t0, 'frames', f.length, 'median', f[f.length >> 1].toFixed(1), 'p95', f[Math.floor(f.length * .95)].toFixed(1), 'max', f.at(-1).toFixed(1), 'over50ms', f.filter(x => x > 50).length);
await page.screenshot({path: '/tmp/claude-0/sc/zoomperf.png'});
console.log('errors', errors);
await browser.close();
