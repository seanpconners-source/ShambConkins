// Template pictures for the game-show art (PLINKO, THE BIG WHEEL; slots in src/data/showSprites.js; brief docs/art-for-gpt/GAMESHOW-ART.md).
// For every slot: <slot>-template.png at the exact size (pink guides) and <slot>-reference.png (what the game draws today).
// Usage: node tools/gameshow-templates.mjs [outDir]   (default docs/art-for-gpt/gameshow-templates)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'docs/art-for-gpt/gameshow-templates'));
fs.mkdirSync(outDir, {recursive: true});
const mods = {'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};', 'src/audio.js': 'exports.audioContext=()=>null;', 'src/state.js': 'exports.store={profile:{settings:{}}};',
  'src/utils.js': 'exports.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));exports.seededRandom=()=>Math.random;'};
for (const f of ['src/data/showSprites.js', 'src/engines/gameshow/stage.js', 'src/engines/plinkoShow.js']) mods[f] = fs.readFileSync(path.join(root, f), 'utf8');
mods['src/engines/cpuKit.js'] = 'exports.isCpu=()=>false;exports.cpuSkill=()=>.5;exports.isOnline=()=>false;';mods['src/engines/fullBleed.js'] = 'exports.fullBleed=()=>({});';
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => { const cache = {}; window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e; }; }, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
const render = (slot, mode) => page.evaluate(({slot, mode}) => {
  const SS = require('src/data/showSprites.js'), ST = require('src/engines/gameshow/stage.js'), PL = require('src/engines/plinkoShow.js'), S = SS.SLOTS[slot], W = S.w, H = S.h;
  const c = document.getElementById('c'); c.width = W; c.height = H; const x = c.getContext('2d'); x.clearRect(0, 0, W, H);
  const pink = '#ff2a6a', T = mode === 'template', label = (t, X, Y, size = Math.max(16, W / 45)) => { x.font = `700 ${size}px sans-serif`; x.textBaseline = 'top'; const w = x.measureText(t).width; x.fillStyle = 'rgba(255,255,255,.88)'; x.fillRect(X - 3, Y - 2, w + 6, size + 6); x.fillStyle = pink; x.fillText(t, X, Y); };
  const faded = fn => { x.save(); if (T) x.globalAlpha = .38; fn(); x.restore(); };
  x.strokeStyle = pink; x.lineWidth = 3;
  if (slot.startsWith('stage-')) { faded(() => ST.drawStage(x, W, H, slot.includes('wheel') ? 'wheel' : 'plinko', 0));
    if (T) { const tall = H > W; x.setLineDash([14, 10]); x.strokeRect(W * (tall ? .05 : .3), H * (tall ? .1 : .05), W * (tall ? .9 : .4), H * (tall ? .72 : .9)); x.setLineDash([]); label('the ' + (slot.includes('wheel') ? 'wheel' : 'board') + ' stands here: keep it calm', W * (tall ? .07 : .31), H * (tall ? .11 : .06)); label('floor / stage line', 20, H * .63); x.beginPath(); x.moveTo(0, H * .63); x.lineTo(W, H * .63); x.stroke(); }
    return c.toDataURL('image/png'); }
  if (slot === 'curtain') { faded(() => ST.drawCurtain(x, W, H, 0, 0)); if (T) label('fills the whole screen, rises at the start', 20, 20); return c.toDataURL('image/png'); }
  if (slot === 'plinko-board') { const k = W / 900; x.save(); x.scale(k, k); if (T) x.globalAlpha = .38;
    const bg = x.createLinearGradient(0, 0, 0, 1272); bg.addColorStop(0, '#0e2a8a'); bg.addColorStop(1, '#0b1f66'); x.fillStyle = bg; x.fillRect(0, 0, 900, 1272); x.restore();
    if (T) { for (const [px, py] of PL.PEGS) { x.beginPath(); x.arc(px * k, py * k, 7 * k, 0, 6.28); x.stroke(); } const sy = 1102 * k; for (let i = 0; i <= 9; i++) { x.beginPath(); x.moveTo(i * 100 * k, sy); x.lineTo(i * 100 * k, 1252 * k); x.stroke(); }
      x.strokeRect(0, sy, W, 150 * k); label('pegs (pink circles) are drawn by the game: no pegs here', 30, 120); label('9 slot boxes: the game prints $100 $500 $1,000 $0 $10,000 ... on them', 30, sy - 60); label('the chips are held above here', 30, 30); }
    return c.toDataURL('image/png'); }
  if (slot === 'plinko-chip') { faded(() => { const r = W * .44; x.fillStyle = '#e8ebf0'; x.beginPath(); x.arc(W / 2, H / 2, r, 0, 6.28); x.fill(); x.strokeStyle = '#8a93a3'; x.lineWidth = r * .1; x.beginPath(); x.arc(W / 2, H / 2, r * .72, 0, 6.28); x.stroke(); });
    if (T) { x.strokeStyle = pink; x.beginPath(); x.arc(W / 2, H / 2, W * .45, 0, 6.28); x.stroke(); label('round chip fills the circle', 6, 6, 16); } return c.toDataURL('image/png'); }
  if (slot.endsWith('-logo')) { faded(() => ST.drawLogo(x, '__none', slot === 'plinko-logo' ? 'PLINKO' : 'THE BIG WHEEL', W / 2, H / 2, W * .92, 0)); if (T) label('transparent around the sign', 20, 20, 26); return c.toDataURL('image/png'); }
  if (slot === 'wheel-frame') { const G = SS.WHEEL_GEOM, w = G.window; faded(() => { x.fillStyle = '#c9cdd3'; x.beginPath(); x.roundRect(60, 40, W - 120, H - 80, 60); x.fill(); x.clearRect(w[0], w[1], w[2] - w[0], w[3] - w[1]); });
    if (T) { x.strokeRect(w[0], w[1], w[2] - w[0], w[3] - w[1]); label('SEE-THROUGH window: the game draws the turning', w[0] + 10, w[1] + 20, 22); label('sections inside (5 ... 1.00)', w[0] + 10, w[1] + 52, 22); x.beginPath(); x.moveTo(w[0] - 60, (w[1] + w[3]) / 2); x.lineTo(w[0], (w[1] + w[3]) / 2); x.stroke(); label('pointer line (game draws the pointer)', 20, (w[1] + w[3]) / 2 + 10, 20); }
    return c.toDataURL('image/png'); }
  if (slot === 'host' || slot.startsWith('model')) { const def = slot === 'host' ? SS.HOST : SS.MODEL;
    def.frames.forEach((f, i) => { x.save(); x.translate(i * def.w, 0); faded(() => { if (slot === 'host') ST.drawHost(x, def.w / 2, def.feet[1], 940, f, 0); else ST.drawModel(x, def.w / 2, def.feet[1], 940, f, 0, slot === 'model-2' ? 1 : 0); });
      if (T) { x.strokeRect(1, 1, def.w - 2, def.h - 2); x.beginPath(); x.arc(def.feet[0], def.feet[1], 8, 0, 6.28); x.stroke(); label(f.toUpperCase(), 10, 10, 26); } x.restore(); });
    if (T) label('full body, feet on the dot, one pose per box, transparent', 10, H - 40, 26); return c.toDataURL('image/png'); }
  if (slot === 'nametag') { faded(() => ST.nameTag(x, W / 2, H / 2, W * .96, '')); if (T) label('blank: the game writes the name', 10, 10, 20); return c.toDataURL('image/png'); }
  return c.toDataURL('image/png');
}, {slot, mode});
const slots = await page.evaluate(() => Object.keys(require('src/data/showSprites.js').SLOTS));
for (const slot of slots) { save(slot + '-template', await render(slot, 'template')); save(slot + '-reference', await render(slot, 'reference')); }
await browser.close();
console.log('templates ->', outDir, slots.length, 'slots');
