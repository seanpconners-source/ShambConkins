// Template pictures for JUDGMENT DAY CHASE art: slots in src/data/tchaseSprites.js, brief docs/art-for-gpt/TERMINATOR-CHASE-ART.md.
// Sheets: one cell per frame with our drawn stand-in faint (the guide: match its size and direction, make it look far
// better), the pink FACE circle to leave EMPTY where there is one, the frame name. Pictures: the exact size, what goes
// in it, and the drawn stand-in faint for vehicles. Plus a REFERENCE per sheet (the game's drawing at full strength).
// Usage: node tools/tchase-templates.mjs [outDir]   (default docs/art-for-gpt/tchase-templates)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'docs/art-for-gpt/tchase-templates'));
fs.mkdirSync(outDir, {recursive: true});
const mods = {'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};'};
for (const f of ['src/data/tchaseSprites.js', 'src/engines/tchase/art.js']) mods[f] = fs.readFileSync(path.join(root, f), 'utf8');
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => {const cache = {}; window.require = id => {if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e;};
 // our stand-in for every slot, drawn at 2 px per unit centred on (0,0)
 window.guide = (x, name, f) => {const A = require('src/engines/tchase/art.js');
  const fx = kind => A.particle(x, {kind, t: (f + .5) / 8, life: 1, r: kind === 'boom' ? 40 : kind === 'ln2' ? 22 : 14, vx: 60, vy: 0, spin: 0});
  switch (name) {
   case 'bike': return A.bike(x, {lean: [-1, 0, 1][f]});
   case 'moto': return A.moto(x, {lean: f ? .8 : 0});
   case 't1000-bike': return A.moto(x, {boss: true, blade: !!f});
   case 'cruiser': return A.car(x, 'cruiser', {t: f / 6, id: 12});
   case 't1000-run': return A.t1000(x, {t: f / 12, state: 'run'});
   case 't1000-splash': return A.t1000(x, {t: f, state: f < 3 ? 'puddle' : 'reform', st: f === 0 ? .1 : f === 1 ? .3 : f === 2 ? 1 : .4});
   case 'explosion': return fx('boom'); case 'smoke': return fx('smoke'); case 'fire': return fx('fire'); case 'spark': return fx('spark');
   case 'metal': return fx('metal'); case 'ln2': return fx('ln2'); case 'muzzle': x.fillStyle = '#ffe08a'; x.beginPath(); x.moveTo(-6, 10); x.lineTo(0, -14 - f * 4); x.lineTo(6, 10); x.fill(); return;
   case 'wagon': case 'van': case 'pickup': case 'swat': case 'towtruck': case 'truck': return A.car(x, name, {valves: []});
   case 'tanker': return A.car(x, 'tanker', {valves: [{dx: -14, dy: 30, hp: 1, max: 1}, {dx: 14, dy: -10, hp: 1, max: 1}, {dx: 0, dy: -50, hp: 1, max: 1}]});
   case 'rig': return A.car(x, 'truck', {rig: true});
   case 'heli': return A.heli(x, {t: 0});
   default: if (/^civ-\d$/.test(name)) return A.car(x, 'civ', {col: +name.slice(4) - 1});}};
}, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
let n = 0;
const sheets = await page.evaluate(() => Object.keys(require('src/data/tchaseSprites.js').SHEETS));
for (const sheet of sheets) for (const mode of ['template', 'reference']) {n++; save(sheet + '-' + mode, await page.evaluate(({sheet, mode}) => {
  const TS = require('src/data/tchaseSprites.js'), d = TS.SHEETS[sheet], [cw, ch] = d.cell, pink = '#ff2a6a';
  const c = document.getElementById('c'); c.width = cw * d.frames.length; c.height = ch; const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
  d.frames.forEach((fr, i) => {const cx = i * cw;
   if (mode === 'template') {x.strokeStyle = 'rgba(255,42,106,.5)'; x.lineWidth = 2; x.strokeRect(cx + 1, 1, cw - 2, ch - 2);}
   x.save(); x.translate(cx + cw / 2, ch / 2); x.scale(TS.PX, TS.PX); if (mode === 'template') x.globalAlpha = .3; window.guide(x, sheet, i); x.restore();
   if (d.face) {const [fx, fy, fd] = d.face; x.strokeStyle = pink; x.lineWidth = 2; x.setLineDash(mode === 'template' ? [5, 3] : []); x.beginPath(); x.arc(cx + fx, fy, fd / 2, 0, 7); x.stroke(); x.setLineDash([]);}
   if (mode === 'template') {x.fillStyle = pink; x.font = '700 11px sans-serif'; x.textBaseline = 'top'; x.fillText(fr, cx + 4, 4); x.beginPath(); x.moveTo(cx + cw / 2, 14); x.lineTo(cx + cw / 2 - 5, 22); x.lineTo(cx + cw / 2 + 5, 22); x.fill();}});
  return c.toDataURL('image/png');}, {sheet, mode}));}
const pics = await page.evaluate(() => Object.entries(require('src/data/tchaseSprites.js').PICTURES).map(([k, p]) => [k, p.w, p.h, p.what, p.face || null]));
for (const [name, w, h, what, face] of pics) {n++; save(name + '-template', await page.evaluate(({name, w, h, what, face}) => {
  const TS = require('src/data/tchaseSprites.js'), c = document.getElementById('c'); c.width = w; c.height = h; const x = c.getContext('2d'), pink = '#ff2a6a';
  const big = w >= 600 || h >= 600, vehicle = !big && h > w * 1.2;
  x.fillStyle = big ? '#e2e6ea' : 'rgba(0,0,0,0)'; x.fillRect(0, 0, w, h); x.strokeStyle = pink; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2);
  x.save(); x.translate(w / 2, h / 2); x.scale(TS.PX, TS.PX); x.globalAlpha = .35; try {window.guide(x, name, 0);} catch {} x.restore();
  if (face) {const [fx, fy, fd] = face; x.strokeStyle = pink; x.setLineDash([5, 3]); x.beginPath(); x.arc(fx, fy, fd / 2, 0, 7); x.stroke(); x.setLineDash([]);}
  if (vehicle) {x.fillStyle = pink; x.beginPath(); x.moveTo(w / 2, 4); x.lineTo(w / 2 - 6, 14); x.lineTo(w / 2 + 6, 14); x.fill();}
  const fs = Math.max(11, Math.min(w, h) / (big ? 16 : 9)), lines = big ? [`${name}  ${w} x ${h}`, ...what.match(/.{1,52}(\s|$)/g)] : [name, `${w}x${h}`];
  x.fillStyle = big ? '#333' : pink; x.textBaseline = 'top'; lines.forEach((l, i) => {x.font = `${i ? 400 : 700} ${fs * (i ? .75 : 1)}px sans-serif`; x.fillText(l.trim(), 6, 4 + i * fs * 1.05);});
  return c.toDataURL('image/png');}, {name, w, h, what, face}));}
await browser.close();
console.log('judgment day chase templates ->', outDir, n, 'files');
