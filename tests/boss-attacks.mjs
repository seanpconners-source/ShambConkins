// Boss fights (ROADMAP K17-K19): force ambush (bottom + side), bombs and carpet; screenshot the tells and the action; themed ammo.
import {open, screenshotPath} from './lib.mjs';
const out = process.argv[2] || screenshotPath('').replace(/[\\/]$/, '');
let bad = 0; const check = (ok, m) => { console.log(ok ? 'PASS' : 'FAIL', m); if (!ok) bad++; };
for (const [id, vp] of [['biff-tannen', [390, 780]], ['dracula', [1100, 700]]]) {
  const {browser, page, errors} = await open({viewport: {width: vp[0], height: vp[1]}});
  await page.evaluate(id => { window.ShambConkins.requestGame({id: 'boss-' + id, origin: 'arcade', difficulty: 1}); }, id);
  for (let i = 0; i < 60; i++) { const r = await page.evaluate(() => { const S = window.ShambConkins.store.session; if (S?.debug?.bossId) return true; const d = document.getElementById('dialog'); if (d?.open) (d.querySelector('button.primary') || d.querySelector('button'))?.click(); return false; }); if (r) break; await page.waitForTimeout(250); }
  await page.evaluate(() => { const d = window.ShambConkins.store.session.debug; d.skipIntro(); d.immortal = true; d.autopilot[0] = d.autopilot[1] = .2; });
  await page.waitForTimeout(2500); await page.screenshot({path: `${out}/${id}-ammo.png`});
  const shots = process.env.RISE ? [['ambush', {side: false}, [1950, 2150, 2400]], ['ambush', {side: true}, [1900, 2150]]] : [['ambush', {side: false}, [1000, 1700]], ['ambush', {side: true}, [1000, 1650]], ['bombs', {rounds: 1}, [700, 1350]], ['carpet', {}, [900, 2000]]];
  for (const [name, params, times] of shots) {
    await page.evaluate(([n, p]) => window.ShambConkins.store.session.debug.attack(n, p), [name, params]);
    let last = 0; for (const t of times) { await page.waitForTimeout(t - last); last = t; await page.screenshot({path: `${out}/${id}-${name}${params.side ? '-side' : ''}-${t}.png`}); }
    await page.waitForTimeout(2600);
    const b = await page.evaluate(() => { const d = window.ShambConkins.store.session.debug; return {x: Math.round(d.boss.x), y: Math.round(d.boss.y), hy: d.boss.hy, mode: d.mode}; });
    check(Math.abs(b.y - b.hy) < 40, `${id} ${name}${params.side ? ' side' : ''}: boss back home ${JSON.stringify(b)}`);
  }
  check(errors.length === 0, id + ' no page errors ' + errors.join(' | '));
  await browser.close();
}
process.exit(bad ? 1 : 0);
