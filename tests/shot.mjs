// Usage: node tests/shot.mjs out.png [overview|follow] [WxH] [seed]
import {open} from './lib.mjs';
const [out='/tmp/claude-0/board.png', cam='overview', size='1400x900', seed='12345'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const {browser, page, errors} = await open({viewport: {width: w, height: h}});
await page.evaluate(async seed => { const S = window.ShambConkins; await S.startRun({seed: +seed}); }, seed).catch(() => {});
await page.click('text=NEW GAME').catch(() => {}); await page.click('[data-action=start-run]').catch(() => {});
await page.waitForTimeout(7000);
await page.evaluate(() => { const d = document.getElementById('dialog'); if (d.open) d.querySelector('button')?.click(); });
await page.waitForTimeout(1500);
if (cam === 'overview') { await page.evaluate(() => { const b = document.querySelector('[data-action=camera]'); b?.click(); }); await page.waitForTimeout(1500); }
await page.screenshot({path: out});
console.log(errors.slice(0, 3));
await browser.close();
