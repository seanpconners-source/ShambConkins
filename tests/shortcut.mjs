// Shortcut flow on a grid board: route chooser offers the shortcut, the obstacle blocks it until paid, then the player hops ahead.
import {open} from './lib.mjs';
const {browser, page, errors} = await open({viewport: {width: 1100, height: 700}});
await page.click('text=NEW GAME'); await page.fill('#run-seed', 'SHORT1'); await page.click('[data-action=start-run]');
const clear = () => page.evaluate(() => { for (const o of document.querySelectorAll('.level-card,.gentlemen-card')) { o.click(); o.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})); } const d = document.getElementById('dialog'); if (d?.open) { d.querySelector('button:not([disabled])')?.click(); return true; } return false; });
for (let i = 0; i < 80; i++) { await page.waitForTimeout(250); await clear(); if (i > 8 && await page.evaluate(() => !window.ShambConkins.store.boardTour && !window.ShambConkins.store.busy)) break; }
const sc = await page.evaluate(() => { const S = window.ShambConkins, run = S.store.run, sc = run.board.shortcuts.find(s => s.realm === 'mind'), p = run.players[run.current]; p.node = sc.from; p.points = 9; p.rollFixed = 1; p.rollCommittedTurn = 0; S.updateBoard(true); return {...sc, current: run.current}; });
await page.evaluate(() => document.querySelector('[data-action=roll]').click());
let options = null;
for (let i = 0; i < 40 && !options; i++) { await page.waitForTimeout(250); options = await page.evaluate(() => document.body.classList.contains('route-choosing') ? [...document.querySelectorAll('.rp-option')].map(b => ({text: b.innerText.replace(/\n/g, ' | ').slice(0, 90), disabled: b.disabled})) : null); if (!options) await clear(); }
console.log('options', options);
const idx = options ? options.findIndex(o => /Shortcut/.test(o.text)) : -1;
let ok = idx >= 0 && !options[idx].disabled;
if (ok) {
  await page.click(`.rp-option[data-id="${idx}"]`); await page.waitForTimeout(400);
  await page.screenshot({path: '/tmp/claude-0/sc/shortcut-choose.png'});
  await page.click('[data-action=route-go]');
  // Obstacle dialog: choose the repair crew.
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(250); const picked = await page.evaluate(() => { const d = document.getElementById('dialog'); if (!d?.open) return false; const b = [...d.querySelectorAll('button')].find(b => /repair crew/i.test(b.innerText) && !b.disabled); if (b) { b.click(); return true; } return false; }); if (picked) break; }
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(250); if (await page.evaluate(() => !window.ShambConkins.store.busy)) break; await clear(); }
}
const end = await page.evaluate(sc => { const run = window.ShambConkins.store.run, p = run.players[sc.current]; return {node: p.node, points: p.points, open: run.board.obstacles.find(o => o.from === sc.from && o.to === sc.to)?.open, visited: p.visited.slice(-3)}; }, sc);
console.log('shortcut', sc.from, '->', sc.to, 'skip', sc.skip, 'end', end);
ok = ok && end.visited.includes(sc.from) && end.open === true && end.points <= 6;
console.log(ok ? 'shortcut flow ok' : 'SHORTCUT FLOW FAILED', 'errors', errors);
await browser.close(); process.exit(ok && !errors.length ? 0 : 1);
