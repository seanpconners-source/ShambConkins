// Hole.it: Node checks of the level generator/simulation, then a browser run that plays
// both turns with a joystick autopilot and saves screenshots.
// Usage: node tests/holeit.mjs [level] [WxH]   (screens → $SHAMB_SHOTS_DIR or /tmp/claude-0/sc/holeit-*)
import {req} from './load.mjs';
import {open} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const L = req('src/engines/holeIt/levels.js'), S = req('src/engines/holeIt/sim.js'), M = req('src/engines/holeIt/meshes.js');
let bad = 0; const fail = m => { bad++; console.log('FAIL', m); };
// Node: every level is deterministic, in bounds and clearable by the autopilot inside the clock.
for (let lv = 1; lv <= 40; lv++) {
  const a = L.buildLevel(lv), b = L.buildLevel(lv);
  if (JSON.stringify(a.items) !== JSON.stringify(b.items)) fail('level ' + lv + ' not deterministic');
  for (const it of a.items) { if (!M.KINDS[it.k]) fail('unknown kind ' + it.k); if (Math.abs(it.x) > a.W / 2 || Math.abs(it.z) > a.D / 2) fail('item out of tray L' + lv); if (it.on >= a.items.length) fail('bad support'); }
  if (!a.goals.length) fail('level ' + lv + ' has no goals');
  const sim = S.createSim(a); let t = 0;
  while (!sim.done && t < 130) { S.stepSim(sim, 1 / 30, S.botInput(sim)); t += 1 / 30; }
  if (!sim.won) fail(`autopilot could not clear level ${lv}: ${sim.goals.map(g => g.k + ' ' + g.got + '/' + g.need).join(', ')}`);
  else if (lv <= 3 || lv % 10 === 0) console.log(`level ${lv} ${a.theme}: ${a.items.length} props, goals ${a.goals.map(g => g.k + '×' + g.need).join(' ')}, bot clear ${sim.clearTime.toFixed(1)}s, size ${sim.hole.size}`);
}
// Boosters
{ const sim = S.createSim(L.buildLevel(3)); const s0 = sim.hole.size; S.useBoost(sim, 'grow'); if (sim.hole.size !== s0 + 1) fail('potion did not grow');
  if (S.useBoost(sim, 'grow')) fail('second potion allowed'); S.useBoost(sim, 'freeze'); const t0 = sim.time; S.stepSim(sim, 1, {x: 0, z: 0}); if (sim.time !== t0) fail('freeze did not stop the clock'); }
if (process.argv.includes('--node')) { console.log(bad ? `${bad} failures` : 'holeit node checks ok'); process.exit(bad ? 1 : 0); }

const level = Number(process.argv[2]) || 1, [vw, vh] = (process.argv[3] || '390x780').split('x').map(Number);
const dir = process.env.SHAMB_SHOTS_DIR || '/tmp/claude-0/sc'; mkdirSync(dir, {recursive: true});
const shot = async (page, n) => { await page.screenshot({path: `${dir}/holeit-${level}-${vw}-${n}.png`}); };
const {browser, page, errors} = await open({viewport: {width: vw, height: vh}});
await page.evaluate(lv => { window.ShambConkins.store.profile.holeItLevel = lv; window.ShambConkins.requestGame({id: 'paddys-hole', origin: 'arcade'}); }, level);
await page.waitForTimeout(900);
const clickReady = () => page.evaluate(() => { const d = document.getElementById('dialog'); const b = d?.open ? d.querySelector('button.primary') : document.querySelector('.pass-overlay [data-ready]'); b?.click(); return !!b; });
for (let i = 0; i < 3; i++) { await clickReady(); await page.waitForTimeout(500); }
const dbg = () => page.evaluate(() => { const d = window.ShambConkins.store.session?.debug; if (!d?.sim) return null; const s = d.sim; return {phase: d.turn?.phase, player: d.turn?.player, time: s.time, size: s.hole.size, goals: s.goals.map(g => g.got + '/' + g.need).join(' '), done: s.done, won: s.won}; });
const box = await page.evaluate(() => { const r = document.getElementById('game-canvas').getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; });
for (const p of [0, 1]) {
  await page.waitForTimeout(700); await shot(page, `p${p}-intro`);
  await page.mouse.click(box.x + box.w / 2, box.y + box.h * .8); await page.waitForTimeout(600);
  await shot(page, `p${p}-start`);
  const cx = box.x + box.w / 2, cy = box.y + box.h * .7; await page.mouse.move(cx, cy); await page.mouse.down();
  const t0 = Date.now(); let shots = 0;
  while (Date.now() - t0 < (p ? 10000 : 25000)) {
    const dir2 = await page.evaluate(() => { const s = window.ShambConkins.store.session?.debug?.sim; if (!s || s.done) return null; const h = s.hole; let best = null, bd = 1e9;
      for (const it of s.items) { if (it.state !== 0 || it.on >= 0 || it.r > h.r * .96) continue; const d = Math.hypot(it.x - h.x, it.z - h.z) - (it.goal ? 2 : 0); if (d < bd) { bd = d; best = it; } }
      if (!best) return {x: 0, z: 0}; const dx = best.x - h.x, dz = best.z - h.z, l = Math.hypot(dx, dz) || 1; return {x: dx / l, z: dz / l}; });
    if (!dir2) break;
    await page.mouse.move(cx + dir2.x * 40, cy + dir2.z * 40, {steps: 2});
    await page.waitForTimeout(90);
    if (Date.now() - t0 > 3000 * (shots + 1) && shots < 4) { shots++; await shot(page, `p${p}-play${shots}`); console.log('p' + p, JSON.stringify(await dbg())); }
  }
  await page.mouse.up(); await page.waitForTimeout(p ? 0 : 0);
  await page.evaluate(() => { const s = window.ShambConkins.store.session?.debug?.sim; if (s && !s.done) s.time = 0.01; });
  await page.waitForFunction(() => (window.ShambConkins.store.session?.debug?.turn?.endT || 0) > 1, null, {timeout: 20000}); await shot(page, `p${p}-end`); console.log('end p' + p, JSON.stringify(await dbg()));
  await page.mouse.click(box.x + box.w / 2, box.y + box.h * .76); await page.waitForTimeout(700);
  if (p === 0) { await page.waitForTimeout(300); await clickReady(); await page.waitForTimeout(600); }
}
await page.waitForTimeout(800);
const result = await page.evaluate(() => ({level: window.ShambConkins.store.profile.holeItLevel, dialog: document.getElementById('dialog')?.innerText?.slice(0, 300)}));
console.log('after game', JSON.stringify(result));
await shot(page, 'result');
console.log('errors', errors.slice(0, 6));
await browser.close();
if (errors.length) bad++;
console.log(bad ? `${bad} failures` : 'holeit ok');
process.exit(bad ? 1 : 0);
