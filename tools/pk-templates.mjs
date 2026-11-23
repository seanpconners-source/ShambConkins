// Template pictures for PENALTY SHOOTOUT art: slots in src/data/pkSprites.js, brief docs/art-for-gpt/PENALTY-ART.md.
// Sheets: one cell per pose with our drawn pose faint (the guide), the FACE CIRCLE to leave EMPTY (strikers: back of the
// head is drawn, the game adds hair; cheer = face circle), the FOOT / BODY-CENTRE anchor, the pose name. Plus a REFERENCE
// sheet per kit (the poses as the game draws them now). Pictures: size + what goes where.
// Usage: node tools/pk-templates.mjs [outDir]   (default docs/art-for-gpt/penalty-templates)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'docs/art-for-gpt/penalty-templates'));
fs.mkdirSync(outDir, {recursive: true});
const mods = {'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};'};
for (const f of ['src/data/pkSprites.js', 'src/engines/pk/art.js']) mods[f] = fs.readFileSync(path.join(root, f), 'utf8');
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => { const cache = {}; window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e; }; }, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
let n = 0;
const sheets = await page.evaluate(() => Object.keys(require('src/data/pkSprites.js').SHEETS));
for (const sheet of sheets) for (const mode of ['template', 'reference']) {n++; save(sheet + '-' + mode, await page.evaluate(({sheet, mode}) => {
  const PS = require('src/data/pkSprites.js'), A = require('src/engines/pk/art.js'), d = PS.SHEETS[sheet], [cw, ch] = d.cell, keeper = sheet.startsWith('keeper');
  const c = document.getElementById('c'); c.width = cw * d.poses.length; c.height = ch; const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
  const kit = A.KITS[{'striker-p1': 'p1', 'striker-p2': 'p2', 'keeper-p1': 'kp1', 'keeper-p2': 'kp2', 'keeper-cpu': 'kcpu'}[sheet]], pink = '#ff2a6a';
  d.poses.forEach((p, i) => {const cx = i * cw;
    if (mode === 'template') {x.strokeStyle = 'rgba(255,42,106,.45)'; x.lineWidth = 2; x.strokeRect(cx + 1, 1, cw - 2, ch - 2);}
    x.save(); if (mode === 'template') x.globalAlpha = .3;
    const ax = cx + (keeper ? PS.MID_K[0] : PS.FOOT_S[0]), ay = keeper ? PS.MID_K[1] : PS.FOOT_S[1];
    const sp = keeper ? A.drawKeeper(x, A.KEEPER[p], ax, ay, PS.UNIT, kit) : A.drawStriker(x, A.STRIKER[p], ax, ay, PS.UNIT, kit);
    x.restore();
    const [hx, hy, hd] = sp.head, face = keeper || p === 'cheer';
    if (!face) {x.save(); if (mode === 'template') x.globalAlpha = .3; A.backOfHead(x, hx, hy, hd, kit.hair, kit.skin); x.restore();}
    x.strokeStyle = pink; x.lineWidth = 3; x.setLineDash(mode === 'template' ? [6, 4] : []); x.beginPath(); x.arc(hx, hy, hd / 2 + 2, 0, 7); x.stroke(); x.setLineDash([]);
    if (mode === 'reference' && face) {x.fillStyle = '#e8b48c'; x.beginPath(); x.arc(hx, hy, hd / 2, 0, 7); x.fill();}
    if (mode === 'template') {x.fillStyle = pink; x.beginPath(); x.arc(ax, ay, 5, 0, 7); x.fill(); x.font = '700 15px sans-serif'; x.textBaseline = 'top'; x.fillText(p, cx + 6, 5);
      x.font = '11px sans-serif'; x.fillText(keeper ? 'body centre' : 'feet', ax + 8, ay - 14); x.fillText(face ? 'face (empty)' : 'back of head (empty)', hx + hd / 2 + 4, hy - 6);}});
  return c.toDataURL('image/png');}, {sheet, mode}));}
const pics = await page.evaluate(() => Object.entries(require('src/data/pkSprites.js').PICTURES).map(([k, p]) => [k, p.w, p.h, p.what]));
for (const [name, w, h, what] of pics) {n++; save(name + '-template', await page.evaluate(({name, w, h, what}) => {
  const PS = require('src/data/pkSprites.js'), A = require('src/engines/pk/art.js');
  const c = document.getElementById('c'); c.width = w; c.height = h; const x = c.getContext('2d'), pink = '#ff2a6a', fs = Math.max(13, Math.min(w, h) / 14);
  x.fillStyle = '#e2e6ea'; x.fillRect(0, 0, w, h); x.strokeStyle = pink; x.lineWidth = 4; x.strokeRect(2, 2, w - 4, h - 4);
  const lines = [`${name}  ${w} x ${h}`, ...what.match(/.{1,46}(\s|$)/g)];
  if (name === 'goal') {x.fillStyle = '#ffffff'; const p = w * .024; x.fillRect(0, 0, p, h); x.fillRect(w - p, 0, p, h); x.fillRect(0, 0, w, p * 1.1); lines.push('posts + bar exactly at the edges; inside see-through');}
  if (name === 'wall-player') {x.globalAlpha = .3; A.drawWallMan(x, w / 2, h - 8, 108); x.globalAlpha = 1; const [fx, fy, fd] = PS.WALL_FACE; x.strokeStyle = pink; x.setLineDash([6, 4]); x.beginPath(); x.arc(fx, fy, fd / 2, 0, 7); x.stroke(); x.setLineDash([]); lines.push('face circle: leave EMPTY');}
  if (name === 'ball' || name === 'target') {x.strokeStyle = pink; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 3, 0, 7); x.stroke();}
  if (name.startsWith('stadium')) lines.push('bottom edge = the pitch-side ad boards line (the game draws pitch + boards)');
  if (name === 'adboards' || name === 'net') lines.push('must tile seamlessly');
  x.fillStyle = '#333'; x.textBaseline = 'top'; lines.forEach((l, i) => {x.font = `${i ? 400 : 700} ${fs * (i ? .7 : 1)}px sans-serif`; x.fillText(l.trim(), 12, 10 + i * fs * (i ? .95 : 1.3));});
  return c.toDataURL('image/png');}, {name, w, h, what}));}
await browser.close();
console.log('penalty templates ->', outDir, n, 'files');
