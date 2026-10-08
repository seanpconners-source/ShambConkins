// Launches every registered mini-game, fuzzes input for a few seconds, reports JS errors per game.
// Usage: node tests/games.mjs [seconds-per-game] [concurrency] [id-filter]
import {chromium, root} from './lib.mjs';
import path from 'node:path';
const secs = +process.argv[2] || 4, conc = +process.argv[3] || 4, filter = process.argv[4];
const file = 'file://' + path.resolve(root, process.env.SHAMB_FILE || 'dist/ShambConkins.html');
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({executablePath: exe});
const probe = await browser.newPage(); await probe.goto(file);
let ids = await probe.evaluate(() => window.ShambConkins.gameRegistry.map(g => g.id)); await probe.close();
if (filter) ids = ids.filter(i => new RegExp(filter).test(i));
console.log(ids.length, 'games');
const results = {};
async function fuzz(id) {
  const ctx = await browser.newContext({viewport: {width: 900, height: 700}, hasTouch: false});
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  // file:// smoke tests cannot use Wikipedia's live page-image API; ignore only its expected CORS denial.
  // Other console and JavaScript errors must continue to fail the game fuzz test.
  page.on('console', m => { const msg=m.text();const offlineWiki=/Access to fetch at 'https:\/\/en\.wikipedia\.org\/w\/api\.php[^']*' from origin 'null' has been blocked by CORS policy/.test(msg);if(m.type()==='error'&&!offlineWiki&&!/ERR_|Failed to load resource/.test(msg))errs.push('console: '+msg.slice(0,200)); });
  await page.goto(file); await page.waitForTimeout(300);
  await page.evaluate(id => { window.ShambConkins.requestGame({id, origin: 'arcade'}); }, id);
  const end = Date.now() + secs * 1000; let clicks = 0;
  while (Date.now() < end) {
    await page.evaluate(() => {
      const dlg = document.getElementById('dialog');
      const scope = dlg.open ? dlg : document.getElementById('game-layer');
      const btns = [...scope.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent && !/exit|home|quit|close/i.test(b.dataset.action || b.innerText));
      if (btns.length) btns[Math.floor(Math.random() * btns.length)].click();
    }).catch(() => {});
    const c = await page.$('#game-layer canvas');
    if (c) { const b = await c.boundingBox(); if (b) { const x = b.x + Math.random() * b.width, y = b.y + Math.random() * b.height; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(b.x + Math.random() * b.width, b.y + Math.random() * b.height, {steps: 3}); await page.mouse.up(); } }
    await page.keyboard.press(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Enter'][Math.floor(Math.random() * 10)]).catch(() => {});
    clicks++;
    await page.waitForTimeout(60);
  }
  const state = await page.evaluate(() => ({game: window.ShambConkins.diagnostics().game, layer: !document.getElementById('game-layer').hidden})).catch(e => ({crash: e.message}));
  results[id] = {errs: [...new Set(errs)], state, clicks};
  await ctx.close();
}
const queue = [...ids];
await Promise.all(Array.from({length: conc}, async () => { while (queue.length) await fuzz(queue.shift()).catch(e => { results['?'] = e.message; }); }));
let bad = 0;
for (const [id, r] of Object.entries(results)) {
  if (r.errs?.length || r.state?.crash) { bad++; console.log('FAIL', id, JSON.stringify(r)); }
}
console.log(`${ids.length - bad}/${ids.length} games ran clean`);
await browser.close();
process.exit(bad ? 1 : 0);
