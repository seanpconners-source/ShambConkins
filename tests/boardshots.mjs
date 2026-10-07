// Board screenshots: phone + desktop, follow + overview, per realm.
// Usage: node tests/boardshots.mjs [outDir] [seed]
import {open} from './lib.mjs';
import fs from 'node:fs';
const [out = '/tmp/claude-0/sc', seed = 'BOARD1'] = process.argv.slice(2);
fs.mkdirSync(out, {recursive: true});
const sizes = {phone: {width: 390, height: 780}, desk: {width: 1100, height: 700}};
let allErrors = [];
for (const [name, viewport] of Object.entries(sizes)) {
  const {browser, page, errors} = await open({viewport});
  await page.click('text=NEW GAME'); await page.fill('#run-seed', seed); await page.click('[data-action=start-run]');
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(250); const ok = await page.evaluate(() => { const d = document.getElementById('dialog'); if (d?.open) { d.querySelector('button:not([disabled])')?.click(); return false; } return !!document.querySelector('#map-root .board-svg') && !document.querySelector('.level-card,.intro-card'); }); if (ok && i > 12) break; }
  for (const realm of ['mind', 'body', 'spirit']) {
    await page.evaluate(realm => { const S = window.ShambConkins, run = S.store.run; if (realm !== 'mind') { const r = run.board.realms[realm]; run.players[0].node = r.start; run.players[1].node = r.start; } run.camera = 'follow'; run.pan = null; S.focusBoardAction(run); S.updateBoard(true); }, realm);
    await page.waitForTimeout(700);
    await page.screenshot({path: `${out}/board-${name}-${realm}-follow.png`});
    await page.evaluate(() => { const S = window.ShambConkins; S.store.run.camera = 'overview'; S.updateBoard(true); });
    await page.waitForTimeout(700);
    await page.screenshot({path: `${out}/board-${name}-${realm}-overview.png`});
  }
  allErrors.push(...errors); await browser.close();
}
console.log('errors', allErrors.slice(0, 5));
