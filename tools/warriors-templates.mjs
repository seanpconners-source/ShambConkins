// Template pictures for THE WARRIORS (Double Dragon style) art: slots in src/data/ddSprites.js, brief docs/art-for-gpt/WARRIORS-ART.md.
// Fighter sheets: one 256 px cell per key pose, our pose drawn faintly as the guide (skeleton + clothes), the FACE CIRCLE the
// game fills with a real face (keep it EMPTY: headless bodies), the FOOT point, the pose name. Stage pictures: size, seams,
// what the game draws over them. Items/fx/logo: size + anchor. Plus a reference sheet of every pose as the game draws it now.
// Usage: node tools/warriors-templates.mjs [outDir]   (default docs/art-for-gpt/warriors-templates)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'docs/art-for-gpt/warriors-templates'));
fs.mkdirSync(outDir, {recursive: true});
const mods = {'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};', 'src/utils.js': 'exports.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));exports.seededRandom=()=>Math.random;'};
for (const f of ['src/data/ddSprites.js', 'src/engines/dd/body.js', 'src/engines/dd/story.js', 'src/engines/dd/scenes.js']) mods[f] = fs.readFileSync(path.join(root, f), 'utf8');
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => { const cache = {}; window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e; }; }, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
// fighter sheets
const sheets = await page.evaluate(() => Object.keys(require('src/data/ddSprites.js').SHEETS));
for (const sheet of sheets) for (const mode of ['template', 'reference']) save(sheet + '-' + mode, await page.evaluate(({sheet, mode}) => {
  const DS = require('src/data/ddSprites.js'), BD = require('src/engines/dd/body.js'), poses = DS.SHEETS[sheet].poses, C = DS.CELL, rows = Math.ceil(poses.length / DS.COLS);
  const c = document.getElementById('c'); c.width = C * DS.COLS; c.height = C * rows; const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
  const o = BD.OUTFIT[sheet === 'hero-p1' ? 'p1' : sheet === 'hero-p2' ? 'p2' : sheet.replace(/^(foe|cast|gang)-/, '')] || BD.OUTFIT.thug, pink = '#ff2a6a';
  poses.forEach((p, i) => {const cx = (i % DS.COLS) * C, cy = Math.floor(i / DS.COLS) * C, ft = DS.footOf(p), fx = cx + ft[0], fy = cy + ft[1];
    if (mode === 'template') {x.strokeStyle = 'rgba(255,42,106,.45)'; x.lineWidth = 2; x.strokeRect(cx + 1, cy + 1, C - 2, C - 2);}
    x.save(); if (mode === 'template') x.globalAlpha = .3;
    const sp = BD.drawBody(x, BD.P[p], {x: fx, y: fy, face: 1, k: DS.UNIT, o, shadow: false}); x.restore();
    // the face circle (left empty: the game draws the player's / character's face there)
    x.strokeStyle = pink; x.lineWidth = 3; x.setLineDash(mode === 'template' ? [6, 4] : []); x.beginPath(); x.arc(sp.head.x, sp.head.y, 22, 0, 7); x.stroke(); x.setLineDash([]);
    if (mode === 'reference') {x.fillStyle = '#e8b48c'; x.beginPath(); x.arc(sp.head.x, sp.head.y, 21, 0, 7); x.fill();}
    if (mode === 'template') {x.fillStyle = pink; x.beginPath(); x.arc(fx, fy, 5, 0, 7); x.fill(); x.font = '700 15px sans-serif'; x.textBaseline = 'top'; x.fillText(p, cx + 6, cy + 5);
      x.font = '11px sans-serif'; x.fillText('feet', fx + 8, fy - 6); x.fillText('face (empty)', sp.head.x + 24, sp.head.y - 6);}});
  return c.toDataURL('image/png');}, {sheet, mode}));
// stage / item / fx pictures
const pics = await page.evaluate(() => Object.entries(require('src/data/ddSprites.js').PICTURES).map(([n, p]) => [n, p.w, p.h, p.what]));
for (const [name, w, h, what] of pics) save(name + '-template', await page.evaluate(({name, w, h, what}) => {
  const c = document.getElementById('c'); c.width = w; c.height = h; const x = c.getContext('2d'), pink = '#ff2a6a', fs = Math.max(13, Math.min(w, h) / 14);
  x.fillStyle = '#e2e6ea'; x.fillRect(0, 0, w, h); x.strokeStyle = pink; x.lineWidth = 4; x.strokeRect(2, 2, w - 4, h - 4);
  const lines = [`${name}  ${w} x ${h}`, ...what.match(/.{1,46}(\s|$)/g)];
  if (name.startsWith('far-') || name.startsWith('wall-') || name.startsWith('floor-')) lines.push('repeats side to side: right edge joins the left edge');
  if (name.startsWith('floor-')) lines.push('fighters walk on this; seen from the side at an angle');
  if (name.startsWith('wall-')) lines.push('bottom edge = where the walkable floor starts', 'TRANSPARENT above the top of what it shows (no sky): PNG with alpha,', 'roofs/fences/trees end in their own outline over the far picture');
  if (name.startsWith('fx-')) {const n = name === 'fx-fury' ? 4 : 6, fw = w / n; x.setLineDash([6, 4]); for (let i = 1; i < n; i++) {x.beginPath(); x.moveTo(i * fw, 0); x.lineTo(i * fw, h); x.stroke();} x.setLineDash([]);}
  x.fillStyle = '#333'; x.textBaseline = 'top'; lines.forEach((l, i) => {x.font = `${i ? 400 : 700} ${fs * (i ? .7 : 1)}px sans-serif`; x.fillText(l.trim(), 12, 10 + i * fs * (i ? .95 : 1.3));});
  return c.toDataURL('image/png');}, {name, w, h, what}));
// a reference shot of every story area as the game draws it now (no fighters), so the pictures can match the layout
const areas = await page.evaluate(() => require('src/data/ddSprites.js').AREAS);
for (const kind of areas) save('ref-' + kind, await page.evaluate(kind => {
  const SC = require('src/engines/dd/scenes.js'), c = document.getElementById('c'), K = 2.4, VW = 700; c.width = VW * K; c.height = 380 * K; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); x.save(); x.scale(K, K);
  SC.drawArea(x, {kind, len: 2400, doors: kind.startsWith('train') ? [40, 680] : kind === 'tenement' || kind === 'apartment' ? [200, 520] : [], pits: [], blocks: [], escape: kind === 'station' ? 1 : 0, trainOpen: 1}, 300, VW, 210, 340, 3.3);
  x.restore(); x.fillStyle = '#ff2a6a'; x.font = '700 30px sans-serif'; x.fillText('ref-' + kind + ' (drawn by the game now): far = sky/back, wall = band above the floor line, floor = below it', 20, 40);
  x.strokeStyle = '#ff2a6a'; x.setLineDash([10, 8]); x.lineWidth = 3; x.beginPath(); x.moveTo(0, 210 * K); x.lineTo(c.width, 210 * K); x.stroke();
  return c.toDataURL('image/png');}, kind));
await browser.close();
console.log('warriors templates ->', outDir, sheets.length * 2 + pics.length + areas.length, 'files');
