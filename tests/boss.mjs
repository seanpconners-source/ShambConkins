// BOSS FIGHT test: node tests/boss.mjs [boss-id ...]   (SHAMB_FILE=/tmp/x.html to use a private build)
// Launches a boss, flies with the in-engine autopilot (s.debug.autopilot) plus scripted touch taps, screenshots mid-fight at
// 1100x700 and 390x780, reports frame times, then checks the win path (killBoss) and the loss path (killPlayers).
import {open, chromium, root} from './lib.mjs';
import path from 'node:path';
const args = process.argv.slice(2), FUZZ = args.includes('--fuzz'), argIds = args.filter(a => !a.startsWith('--') && !/^\d+$/.test(a));
const ids = argIds.length ? argIds : ['hal-9000'];
const OUT = process.env.BOSS_OUT || '/tmp/claude-0/shots';
let failures = 0;
const fail = m => { failures++; console.log('FAIL', m); };
async function launch(page, id) {
  await page.evaluate(id => { window.ShambConkins.requestGame({id: 'boss-' + id, origin: 'arcade'}); }, id);
  for (let i = 0; i < 40; i++) {
    const ready = await page.evaluate(() => { const S = window.ShambConkins.store.session; if (S?.debug?.bossId) return true; const d = document.getElementById('dialog'); if (d?.open) (d.querySelector('button.primary') || d.querySelector('button'))?.click(); return false; });
    if (ready) break; await page.waitForTimeout(250);
  }
  await page.waitForTimeout(300);
}
async function state(page) {
  return page.evaluate(() => { const d = window.ShambConkins.store.session?.debug; return d ? {mode: d.mode, hp: d.boss.hp, max: d.boss.max, phase: d.boss.phase, p: d.players.map(p => p.hp), b: d.bullets.length, t: d.time} : null; });
}
async function waitFinish(page) { for (let i = 0; i < 60; i++) { if (await page.evaluate(() => document.getElementById('game-layer').hidden)) return; await page.waitForTimeout(500); } }

// --fuzz [seconds-per-phase] [concurrency] : every boss (or the ids given) runs all three phases with random touches/keys + autopilot.
async function fuzzAll() {
  const file = 'file://' + path.resolve(root, process.env.SHAMB_FILE || 'dist/ShambConkins.html');
  const browser = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const probe = await browser.newPage(); await probe.goto(file);
  const all = await probe.evaluate(() => window.ShambConkins.store && 0); await probe.close();
  const list = argIds.length ? argIds : (await import('node:fs')).readFileSync(path.resolve(root, 'src/data/bosses.js'), 'utf8').match(/id:'([a-z0-9-]+)',name:/g).map(m => m.slice(4, -7));
  const phaseSecs = +(args.find(a => /^\d+$/.test(a)) || 5), conc = 4, queue = [...list], bad = [];
  async function one(id) {
    const ctx = await browser.newContext({viewport: {width: id.length % 2 ? 390 : 900, height: id.length % 2 ? 780 : 700}});
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message.split('\n')[0])); page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
    await page.goto(file); await page.waitForTimeout(300);
    await launch(page, id);
    const D = () => page.evaluate(() => { const d = window.ShambConkins.store.session?.debug; return d ? {mode: d.mode, phase: d.boss.phase, hp: d.boss.hp} : null; });
    await page.evaluate(() => window.ShambConkins.store.session?.debug?.skipIntro());
    const jab = async ms => { const end = Date.now() + ms; while (Date.now() < end) {
      const c = await page.$('#game-layer canvas'); const b = c && await c.boundingBox();
      if (b) { const x = b.x + Math.random() * b.width, y = b.y + b.height * (.4 + Math.random() * .55); await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + (Math.random() - .5) * 120, y - Math.random() * 90, {steps: 3}); await page.mouse.up(); }
      await page.keyboard.press(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'Enter'][Math.floor(Math.random() * 8)]).catch(() => {}); await page.waitForTimeout(60); } };
    for (const [step, frac] of [[0, 1], [1, .6], [2, .3]]) {
      await page.evaluate(([f, ap]) => { const d = window.ShambConkins.store.session?.debug; if (!d) return; d.autopilot[0] = ap; d.autopilot[1] = ap; if (f < 1) d.setBossHp(d.boss.max * f); }, [frac, step !== 1]);
      await jab(phaseSecs * 1000);
    }
    const st = await D();
    if (st) { await page.evaluate(() => window.ShambConkins.store.session?.debug?.killBoss()); await page.waitForTimeout(2500); }
    const end = await page.evaluate(() => ({layer: !document.getElementById('game-layer').hidden}));
    if (errs.length) bad.push([id, [...new Set(errs)].slice(0, 3)]);
    console.log(errs.length ? 'FAIL' : 'ok  ', id, JSON.stringify(st), 'finishing:', end.layer);
    await ctx.close();
  }
  await Promise.all(Array.from({length: conc}, async () => { while (queue.length) await one(queue.shift()).catch(e => bad.push(['?', e.message])); }));
  console.log(bad.length ? 'FUZZ FAIL ' + JSON.stringify(bad) : `${list.length}/${list.length} bosses ran clean`);
  await browser.close(); process.exit(bad.length ? 1 : 0);
}
if (FUZZ) await fuzzAll();
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
      await page.evaluate(() => window.ShambConkins.store.session?.debug?.killBoss());
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
