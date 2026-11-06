// BOSS DIFFICULTY sim: node tests/bossdiff.mjs [boss-id ...]   (SHAMB_FILE=/tmp/x.html to use a private build)
// Compares how hard each boss hits on a portrait phone vs the wide arena (landscape/desktop). Per boss and layout it
// holds each phase for PH game-seconds (s.debug.holdPhase) with immortal players on a reaction-limited autopilot
// (s.debug.autopilot = REACT seconds), skipping drawing (s.debug.nodraw) and running STEPS updates per frame.
// Prints hits/min and boss %HP/min per phase, plus what landed (bullet kind / hazard kind / minion) with SRC=1.
// Env: PH=60 REACT=.25 STEPS=20 REP=1 C=5 SRC=0 L=phone:390x780,wide:1100x700[,land:844x390]
// Wide-arena tuning (WIDE_K in engines/bossFight.js) was set so the wide AVG matches the phone AVG (~9-10 hits/min).
import {launchBrowser, root,appURL} from './lib.mjs';
import path from 'node:path';
import fs from 'node:fs';
const file = (await appURL());
const PH = +(process.env.PH || 60), REACT = +(process.env.REACT || .25), STEPS = +(process.env.STEPS || 20), REP = +(process.env.REP || 1), SRC = !!+(process.env.SRC || 0);
const layouts = (process.env.L || 'phone:390x780,wide:1100x700').split(',').map(s => { const [n, d] = s.split(':'); const [width, height] = d.split('x').map(Number); return [n, {width, height}]; });
const argIds = process.argv.slice(2);
const ids = argIds.length ? argIds : fs.readFileSync(path.resolve(root, 'src/data/bosses.js'), 'utf8').match(/id:'([a-z0-9-]+)',name:/g).map(m => m.slice(4, -7));
// DIFF=0,1,2,3 runs those difficulty tiers (Easy/Medium/Hard/Extreme, BOSS_TIERS in data/bosses.js); default Easy
const DIFFS = (process.env.DIFF || '0').split(',').map(Number);
const browser = await launchBrowser();
const jobs = []; for (let r = 0; r < REP; r++) for (const id of ids) for (const l of layouts) for (const df of DIFFS) jobs.push([id, DIFFS.length > 1 || df ? l[0] + '/d' + df : l[0], l[1], df]);
const out = {};
async function run([id, label, viewport, df]) {
  const ctx = await browser.newContext({viewport}); const page = await ctx.newPage();
  await page.goto(file); await page.waitForTimeout(400);
  await page.evaluate(([id, df]) => { window.ShambConkins.requestGame({id: 'boss-' + id, origin: 'arcade', difficulty: df}); }, [id, df]);
  for (let i = 0; i < 60; i++) { const r = await page.evaluate(() => { const S = window.ShambConkins.store.session; if (S?.debug?.bossId) return true; const d = document.getElementById('dialog'); if (d?.open) (d.querySelector('button.primary') || d.querySelector('button'))?.click(); return false; }); if (r) break; await page.waitForTimeout(250); }
  await page.evaluate(([R, S]) => { const d = window.ShambConkins.store.session.debug; d.skipIntro(); d.autopilot[0] = d.autopilot[1] = R; d.immortal = true; d.steps = S; d.nodraw = true; d.holdPhase = true; }, [REACT, STEPS]);
  const res = []; let src0 = {}; const nph = await page.evaluate(() => window.ShambConkins.store.session.debug.phases || 3);
  for (let ph = 0; ph < nph; ph++) {
    await page.evaluate(([ph, nph]) => { const d = window.ShambConkins.store.session.debug; if (ph) d.setBossHp(d.boss.max * (1 - ph / nph - .04)); }, [ph, nph]);
    await page.waitForFunction(() => window.ShambConkins.store.session.debug.mode === 'fight', null, {timeout: 60000});
    const a = await page.evaluate(() => { const d = window.ShambConkins.store.session.debug; return {t: d.time, h: d.hits[0] + d.hits[1], dmg: d.dmg, max: d.boss.max}; });
    await page.waitForFunction(t => window.ShambConkins.store.session.debug.time >= t, a.t + PH, {timeout: 180000, polling: 200});
    const b = await page.evaluate(() => { const d = window.ShambConkins.store.session.debug; return {t: d.time, h: d.hits[0] + d.hits[1], dmg: d.dmg, ph: d.boss.phase, src: {...d.hitSrc}}; });
    const ds = {}; for (const k in b.src) { const v = b.src[k] - (src0[k] || 0); if (v) ds[k] = v; } src0 = b.src;
    if (SRC) console.log(id, label, 'phase ' + (ph + 1), JSON.stringify(ds));
    const m = (b.t - a.t) / 60; res.push({h: (b.h - a.h) / m, dps: (b.dmg - a.dmg) / a.max / m * 100, ok: b.ph === ph});
  }
  ((out[id] = out[id] || {})[label] = out[id][label] || []).push(res);
  console.log(id.padEnd(16), label.padEnd(6), 'hits/min', res.map(r => r.h.toFixed(1)).join(' / '), '  %hp/min', res.map(r => r.dps.toFixed(0)).join(' / '), res.every(r => r.ok) ? '' : 'PHASE-SLIP');
  await ctx.close();
}
const q = [...jobs], errs = [];
await Promise.all(Array.from({length: +(process.env.C || 5)}, async () => { while (q.length) { const j = q.shift(); await run(j).catch(e => { errs.push(j[0]); console.log('ERR', j[0], j[1], e.message.split('\n')[0]); }); } }));
const agg = {}; for (const id in out) for (const l in out[id]) for (const res of out[id][l]) { const a = agg[l] = agg[l] || {h: [], d: [], n: 0}; a.n++; res.forEach((r, i) => { a.h[i] = (a.h[i] || 0) + r.h; a.d[i] = (a.d[i] || 0) + r.dps; }); }
for (const l in agg) { const a = agg[l]; console.log('AVG', l.padEnd(6), 'hits/min by phase', a.h.map(x => (x / a.n).toFixed(2)).join(' / '), ' mean', (a.h.reduce((x, y) => x + y) / a.h.length / a.n).toFixed(2), '  %hp/min', a.d.map(x => (x / a.n).toFixed(1)).join(' / ')); }
await browser.close(); process.exit(errs.length ? 1 : 0);
