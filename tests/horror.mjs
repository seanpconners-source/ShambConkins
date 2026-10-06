// Jumps a fresh run into the Level IV horror realm and screenshots it. Usage: node tests/horror.mjs [overview|follow] [WxH]
import {open} from './lib.mjs';
const [cam='overview', size='900x1000'] = process.argv.slice(2); const [w, h] = size.split('x').map(Number);
const {browser, page, errors} = await open({viewport: {width: w, height: h}});
await page.click('text=NEW GAME'); await page.click('[data-action=start-run]');
for (let i = 0; i < 14; i++) { await page.waitForTimeout(600); await page.evaluate(() => { const d = document.getElementById('dialog'); if (d.open) d.querySelector('button')?.click(); }); }
await page.evaluate(async () => { const S = window.ShambConkins, run = S.store.run; S.addHorrorBoard(run.board); run.horror = true; run.players.forEach(p => { p.node = 'horror-0'; p.visited = []; }); S.focusBoardAction(run); await S.continueRun(); });
await page.waitForTimeout(1500);
for (let i = 0; i < 6; i++) { await page.evaluate(() => { const d = document.getElementById('dialog'); if (d.open) d.querySelector('button')?.click(); }); await page.waitForTimeout(400); }
if (cam === 'overview') { await page.evaluate(() => document.querySelector('[data-action=camera]')?.click()); await page.waitForTimeout(1200); }
await page.screenshot({path: '/tmp/claude-0/horror.png'});
console.log(errors.slice(0, 3));
await browser.close();
