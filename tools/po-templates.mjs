// Template pictures for FIGHT NIGHT (Punch-Out style boxing) art: slots in src/data/poSprites.js, brief
// docs/art-for-gpt/FIGHT-NIGHT-ART.md. Sheets: one cell per pose with our drawn pose faint (the guide), the HIP anchor dot,
// the head circle to leave EMPTY (opponents: the face goes there; your boxer: the game draws the back of the head), the
// pose name. Plus a REFERENCE sheet per body (the poses as the game draws them now). Pictures: size + what goes where.
// Usage: node tools/po-templates.mjs [outDir]   (default docs/art-for-gpt/fightnight-templates)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'docs/art-for-gpt/fightnight-templates'));
fs.mkdirSync(outDir, {recursive: true});
const mods = {'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};'};
for (const f of ['src/data/poSprites.js', 'src/engines/po/art.js']) mods[f] = fs.readFileSync(path.join(root, f), 'utf8');
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => { const cache = {}; window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e; }; }, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
let n = 0;
const sheets = await page.evaluate(() => Object.keys(require('src/data/poSprites.js').SHEETS));
for (const sheet of sheets) for (const mode of ['template', 'reference']) {n++; save(sheet + '-' + mode, await page.evaluate(({sheet, mode}) => {
  const PO = require('src/data/poSprites.js'), A = require('src/engines/po/art.js'), d = PO.SHEETS[sheet], [cw, ch] = d.cell, me = sheet.startsWith('me-'), ref = sheet === 'referee';
  const c = document.getElementById('c'); c.width = cw * d.poses.length; c.height = ch; const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
  const pink = '#ff2a6a', kit = me ? (d.kit === 'p2' ? {trunks: '#b8202a', gloves: '#d42a2a', hair: '#5a2a12'} : {trunks: '#2a5fd8', gloves: '#2f6fe0', hair: '#2a1a10'}) : {};
  const foeKit = {lean: {trunks: '#6a4bc8', gloves: '#e0e0e0'}, heavy: {trunks: '#c0262e', gloves: '#8a2a1a'}, giant: {trunks: '#3a3a3a', gloves: '#606a74'}, fast: {trunks: '#f2a21e', gloves: '#2a63d8'}, champ: {trunks: '#c0262e', gloves: '#c0262e', belt: '#e8c21e'}}[d.type] || {};
  d.poses.forEach((p, i) => {const cx = i * cw, ax = cx + d.hip[0], ay = d.hip[1];
    if (mode === 'template') {x.strokeStyle = 'rgba(255,42,106,.45)'; x.lineWidth = 2; x.strokeRect(cx + 1, 1, cw - 2, ch - 2);}
    x.save(); x.beginPath(); x.rect(cx, 0, cw, ch); x.clip(); if (mode === 'template') x.globalAlpha = .3;
    let head = null;
    if (ref) A.drawRef(x, ax, ay, PO.UNIT, p, .5);
    else if (me) {const r = A.drawMe(x, A.ME[p], ax, ay, PO.UNIT, kit); A.drawGloves(x, r.gloves, kit.gloves); head = r.head; if (mode === 'reference') A.backOfHead(x, head[0], head[1], head[2], kit.hair);}
    else {const r = A.drawFoe(x, A.FOE[p], ax, ay, PO.UNIT, A.TYPES[d.type], foeKit); head = r.head;}
    x.restore();
    if (head) {x.strokeStyle = pink; x.lineWidth = 3; x.setLineDash(mode === 'template' ? [6, 4] : []); x.beginPath(); x.arc(head[0], head[1], head[2] / 2 + 2, 0, 7); x.stroke(); x.setLineDash([]);
      if (mode === 'reference' && !me) {x.fillStyle = '#e8b48c'; x.beginPath(); x.arc(head[0], head[1], head[2] / 2, 0, 7); x.fill();}}
    if (mode === 'template') {x.fillStyle = pink; x.beginPath(); x.arc(ax, ay, 5, 0, 7); x.fill(); x.font = '700 15px sans-serif'; x.textBaseline = 'top'; x.fillText(p, cx + 6, 5);
      x.font = '11px sans-serif'; x.fillText('hips', ax + 8, ay - 14); if (head) x.fillText(me ? 'back of head (empty)' : 'face (empty)', Math.min(cx + cw - 120, head[0] + head[2] / 2 + 4), head[1] - 6);}});
  return c.toDataURL('image/png');}, {sheet, mode}));}
const pics = await page.evaluate(() => Object.entries(require('src/data/poSprites.js').PICTURES).map(([k, p]) => [k, p.w, p.h, p.what]));
for (const [name, w, h, what] of pics) {n++; save(name + '-template', await page.evaluate(({name, w, h, what}) => {
  const c = document.getElementById('c'); c.width = w; c.height = h; const x = c.getContext('2d'), pink = '#ff2a6a', fs = Math.max(13, Math.min(w, h) / 16);
  x.fillStyle = '#e2e6ea'; x.fillRect(0, 0, w, h); x.strokeStyle = pink; x.lineWidth = 4; x.strokeRect(2, 2, w - 4, h - 4);
  const lines = [`${name}  ${w} x ${h}`, ...what.match(/.{1,46}(\s|$)/g)];
  if (name.startsWith('arena-')) {x.setLineDash([10, 8]); x.beginPath(); x.moveTo(0, h * .7); x.lineTo(w, h * .7); x.stroke(); x.setLineDash([]); x.fillStyle = pink; x.font = `${fs * .7}px sans-serif`; x.fillText('ring canvas below this line (seen from ringside)', 12, h * .7 + 8);
    x.strokeRect(w * .3, h * .12, w * .4, h * .6); x.fillText('the opponent stands here', w * .32, h * .14);}
  if (name === 'fx-hit') {const fw = w / 6; x.setLineDash([6, 4]); for (let i = 1; i < 6; i++) {x.beginPath(); x.moveTo(i * fw, 0); x.lineTo(i * fw, h); x.stroke();} x.setLineDash([]);}
  x.fillStyle = '#333'; x.textBaseline = 'top'; lines.forEach((l, i) => {x.font = `${i ? 400 : 700} ${fs * (i ? .7 : 1)}px sans-serif`; x.fillText(l.trim(), 12, 10 + i * fs * (i ? .95 : 1.3));});
  return c.toDataURL('image/png');}, {name, w, h, what}));}
await browser.close();
console.log('fight night templates ->', outDir, n, 'files');
