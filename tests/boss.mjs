// BOSS FIGHT test: node tests/boss.mjs [boss-id ...]   (SHAMB_FILE=/tmp/x.html to use a private build)
// Launches a boss, flies with the in-engine autopilot (s.debug.autopilot) plus scripted touch taps, screenshots mid-fight at
// 1100x700 and 390x780, reports frame times, then checks the win path (killBoss) and the loss path (killPlayers).
import {open} from './lib.mjs';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['hal-9000'];
const OUT = process.env.BOSS_OUT || '/tmp/claude-0/shots';
let failures = 0;
const fail = m => { failures++; console.log('FAIL', m); };
async function launch(page, id) {
  await page.evaluate(id => { window.ShambConkins.requestGame({id: 'boss-' + id, origin: 'arcade'}); }, id);
  await page.waitForTimeout(900);
  await page.evaluate(() => { const d = document.getElementById('dialog'); (d.querySelector('button.primary') || [...d.querySelectorAll('button')][0])?.click(); });
  await page.waitForTimeout(500);
}
async function state(page) {
  return page.evaluate(() => { const d = window.ShambConkins.store.session?.debug; return d ? {mode: d.mode, hp: d.boss.hp, max: d.boss.max, phase: d.boss.phase, p: d.players.map(p => p.hp), b: d.bullets.length, t: d.time} : null; });
}
async function waitFinish(page) { for (let i = 0; i < 60; i++) { if (await page.evaluate(() => document.getElementById('game-layer').hidden)) return; await page.waitForTimeout(500); } }
for (const id of ids) {
  for (const [label, viewport] of [['wide', {width: 1100, height: 700}], ['phone', {width: 390, height: 780}]]) {
    const {browser, page, errors} = await open({viewport});
    await launch(page, id);
    const has = await page.evaluate(() => !!window.ShambConkins.store.session?.debug?.bossId);
    if (!has) { console.log('no ShambConkins.debug hook; skipping state checks'); }
    await page.evaluate(() => { const d = window.ShambConkins.store.session.debug; d.autopilot[0] = d.autopilot[1] = true; });
    // frame-time probe
    await page.evaluate(() => { window.__ft = []; let l = performance.now(); const f = t => { window.__ft.push(t - l); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await page.waitForTimeout(2200);
    await page.screenshot({path: `${OUT}/${id}-${label}-intro.png`});
    await page.waitForTimeout(4200);
    // scripted touch: drag on each half and tap
    const cv = await page.$('#game-layer canvas'), bb = await cv.boundingBox();
    await page.mouse.move(bb.x + bb.width * .25, bb.y + bb.height * .8); await page.mouse.down(); await page.mouse.move(bb.x + bb.width * .3, bb.y + bb.height * .75, {steps: 5}); await page.mouse.up();
    await page.waitForTimeout(6000);
    await page.screenshot({path: `${OUT}/${id}-${label}-fight.png`});
    // phase 2 / 3 shots via hp hook
    await page.evaluate(() => { const d = window.ShambConkins.store.session.debug; d.setBossHp(d.boss.max * .6); });
    await page.waitForTimeout(3800);
    await page.screenshot({path: `${OUT}/${id}-${label}-phase2.png`});
    const st = await state(page);
    if (st && st.phase < 1) fail(`${id}/${label}: phase did not advance ${JSON.stringify(st)}`);
    await page.evaluate(() => { const d = window.ShambConkins.store.session.debug; d.setBossHp(d.boss.max * .3); });
    await page.waitForTimeout(5500);
    await page.screenshot({path: `${OUT}/${id}-${label}-phase3.png`});
    const ft = await page.evaluate(() => { const a = window.__ft.slice(30).sort((x, y) => x - y); return {avg: a.reduce((x, y) => x + y, 0) / a.length, p95: a[Math.floor(a.length * .95)], max: a[a.length - 1]}; });
    const ms = await page.evaluate(() => window.ShambConkins.store.session?.debug?.ms?.());
    console.log(`${id}/${label}: engine ${ms?.toFixed(1)}ms/frame (update+draw); rAF cadence avg ${ft.avg.toFixed(1)}ms p95 ${ft.p95.toFixed(1)}ms max ${ft.max.toFixed(0)}ms`, JSON.stringify(await state(page)));
    if (label === 'wide') {
      await page.evaluate(() => window.ShambConkins.store.session.debug.killBoss());
      await page.waitForTimeout(3200);
      await page.screenshot({path: `${OUT}/${id}-${label}-ko.png`});
      await waitFinish(page);
      const res = await page.evaluate(() => ({layer: !document.getElementById('game-layer').hidden, dlg: document.getElementById('dialog')?.innerText?.slice(0, 160)}));
      if (res.layer) fail(`${id}: game did not finish after KO`);
    } else {
      await page.evaluate(() => { const d = window.ShambConkins.store.session.debug; d.autopilot[0] = d.autopilot[1] = false; d.killPlayers(); });
      await page.waitForTimeout(1800);
      await page.screenshot({path: `${OUT}/${id}-${label}-lose.png`});
      await waitFinish(page);
      const res = await page.evaluate(() => ({layer: !document.getElementById('game-layer').hidden}));
      if (res.layer) fail(`${id}: game did not finish after defeat`);
    }
    if (errors.length) fail(`${id}/${label}: errors ${errors.slice(0, 3).join(' | ')}`);
    await browser.close();
  }
}
console.log(failures ? failures + ' failure(s)' : 'boss tests ok');
process.exit(failures ? 1 : 0);
