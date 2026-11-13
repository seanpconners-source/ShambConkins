#!/usr/bin/env node
// Template pictures for the Battleship drop-in art (src/data/battleshipSprites.js), one PNG per slot at its real pixel size
// (+ a 2x preview <name>@2x.png). Each shows the frame grid / outline, the important points (face circle for the sailor,
// waterline + stern-to-bow line for the warship, the gun's pivot, cell edges for ships) and the game's own drawn version as a
// faint guide (taken from the game's drawing code). Paint over a copy (transparent background unless noted), keep the
// layout, save as assets/battleship/<name>.png. Usage:
//   node tools/battleship-templates.mjs   → docs/battleship-sprites/templates/
//   node tools/battleship-templates.mjs --standin <dir>   → <dir>/<name>.png: every slot filled with the drawn art (no marks),
//   for checking the drop-in path: copy into assets/battleship/, build, compare, then delete them again.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const si = process.argv.indexOf('--standin'), standin = si > 0;
const outDir = standin ? path.resolve(process.argv[si + 1]) : path.join(root, 'docs/battleship-sprites/templates');
fs.mkdirSync(outDir, {recursive: true});
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
// the board drawing code (drawShip/drawFire/drawMiss/drawGrid) = the top of partyBattleship.js up to the engine function
const game = read('src/engines/partyBattleship.js');
const boardSrc = game.slice(game.indexOf('const N=8;'), game.indexOf('async function battleship'));
// one inner function of navalCut by name (brace matched)
const cuts = read('src/engines/battleshipCuts.js');
const fnSrc = name => { const i = cuts.indexOf(' function ' + name + '('); let d = 0, j = cuts.indexOf('{', i);
  for (let k = j; k < cuts.length; k++) { if (cuts[k] === '{') d++; else if (cuts[k] === '}' && !--d) return cuts.slice(i, k + 1); } };
const mods = {
  'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};',
  'src/data/battleshipSprites.js': read('src/data/battleshipSprites.js'),
};
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(({mods, boardSrc, warship, sailor, standin}) => {
  const cache = {};
  window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e; };
  const BS = require('src/data/battleshipSprites.js');
  window.BOARD = new Function('BS', boardSrc + ';return {drawShip,drawFire,drawMiss,drawGrid,N};')(BS);
  // cut-scene pieces bound to a context: x, t, a stub s.sprite (face circle), P
  window.CUT = x => new Function('x', 'BS', 'P', 's', 't', warship + sailor + ';return {warship,sailor};')(x, BS, BS.PICTURES,
    {sprite: (g, who, cx, cy, size) => { if (window.STANDIN) return; g.fillStyle = '#e8c4a0'; g.beginPath(); g.arc(cx, cy, size / 2, 0, 7); g.fill(); }}, 0);
  window.STANDIN = standin;
}, {mods, boardSrc, warship: fnSrc('warship'), sailor: fnSrc('sailor'), standin});
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
const ZOOMS = standin ? [1] : [1, 2];

// ---------------------------------------------------------------- sheets
for (const name of ['hit', 'boom', 'splash', 'sailor']) for (const zoom of ZOOMS) {
  const data = await page.evaluate(({name, zoom, standin}) => {
    const BS = require('src/data/battleshipSprites.js'), TAU = Math.PI * 2;
    const def = BS.SHEETS[name], rows = Object.entries(def.rows), [fw, fh] = def.frame, cols = Math.max(...rows.map(r => r[1]));
    const c = document.getElementById('c'); c.width = cols * fw * zoom; c.height = rows.length * fh * zoom;
    const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.scale(zoom, zoom);
    const guide = (row, f, n) => {
      const o = document.createElement('canvas'); o.width = fw; o.height = fh; const g = o.getContext('2d'), k = f / Math.max(1, n - 1);
      if (name === 'hit') BOARD.drawFire(g, 0, 0, fw, f * .9, 0);
      else if (name === 'boom') { const r = fw * (.15 + .35 * k); const gr = g.createRadialGradient(fw / 2, fh / 2, 1, fw / 2, fh / 2, r);
        gr.addColorStop(0, '#fff3a0'); gr.addColorStop(.5, '#ff8a1f'); gr.addColorStop(1, `rgba(80,80,80,${.9 - k * .8})`); g.fillStyle = gr; g.beginPath(); g.arc(fw / 2, fh / 2, r, 0, TAU); g.fill(); }
      else if (name === 'splash') { g.strokeStyle = '#e8f7ff'; g.lineWidth = 4; g.beginPath(); g.ellipse(fw / 2, fh * .75, fw * (.1 + .35 * k), fh * (.04 + .1 * k), 0, 0, TAU); g.stroke();
        g.fillStyle = '#e8f7ff'; for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .3, d = fh * .5 * Math.sin(Math.PI * Math.min(1, k * 1.2)); g.beginPath(); g.arc(fw / 2 + Math.cos(a) * d * .7, fh * .72 + Math.sin(a) * d, 5, 0, TAU); g.fill(); } }
      else { const C = CUT(g), U = def.U, arms = {stand: 0, cheer: -.5 - .1 * f, fall: -.35, swim: -.45 * (1 + Math.sin(f * 1.6) * .3)}[row];
        C.sailor(def.head[0], def.head[1], U, 0, '', 0, arms); }
      return o;
    };
    rows.forEach(([row, n], r) => {
      for (let f = 0; f < cols; f++) {
        const X = f * fw, Y = r * fh;
        if (!standin) {
          x.fillStyle = f < n ? ((f + r) % 2 ? 'rgba(80,120,200,.08)' : 'rgba(80,120,200,.15)') : 'rgba(0,0,0,.35)'; x.fillRect(X, Y, fw, fh);
          x.strokeStyle = 'rgba(40,60,120,.6)'; x.lineWidth = 1 / zoom; x.strokeRect(X + .5 / zoom, Y + .5 / zoom, fw - 1 / zoom, fh - 1 / zoom);
        }
        if (f >= n) continue;
        const o = guide(row, f, n);
        if (standin) { x.drawImage(o, X, Y); continue; }
        x.globalAlpha = .3; x.drawImage(o, X, Y); x.globalAlpha = 1;
        if (def.head) { const [hx, hy] = def.head, R = def.headSize / 2;
          x.strokeStyle = 'rgba(30,90,230,.9)'; x.lineWidth = 1.5; x.beginPath(); x.arc(X + hx, Y + hy, R, 0, TAU); x.stroke();
          x.beginPath(); x.moveTo(X + hx, Y + hy - R); x.lineTo(X + hx, Y + hy - R + 6); x.stroke();
          x.fillStyle = 'rgba(30,90,230,.55)'; x.font = '8px monospace'; x.textAlign = 'center'; x.fillText('FACE', X + hx, Y + hy + 3); x.textAlign = 'left'; }
        x.fillStyle = 'rgba(20,30,60,.8)'; x.font = '8px monospace'; x.fillText(`${row} ${f + 1}`, X + 3, Y + 10);
      }
    });
    return c.toDataURL('image/png');
  }, {name, zoom, standin});
  save(name + (zoom > 1 ? '@2x' : ''), data);
}

// ---------------------------------------------------------------- pictures
const picNames = await page.evaluate(() => Object.keys(require('src/data/battleshipSprites.js').PICTURES));
for (const name of picNames) for (const zoom of ZOOMS) {
  const data = await page.evaluate(({name, zoom, standin}) => {
    const BS = require('src/data/battleshipSprites.js'), d = BS.PICTURES[name], [W, H] = d.size;
    const c = document.getElementById('c'); c.width = W * zoom; c.height = H * zoom;
    const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.scale(zoom, zoom);
    const o = document.createElement('canvas'); o.width = W; o.height = H; const g = o.getContext('2d');
    const sky = (h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#172a52'); gr.addColorStop(.7, '#c8603a'); gr.addColorStop(1, '#f0a860'); g.fillStyle = gr; g.fillRect(0, 0, W, h); };
    if (d.kind === 'ship') BOARD.drawShip(g, 0, 0, BS.CELL, {len: d.len, dir: 0}, d.sunk ? 'sunk' : 'own');
    else if (d.kind === 'cell') BOARD.drawMiss(g, 0, 0, W);
    else if (d.kind === 'sea') { BOARD.drawGrid(g, {x: 0, y: 0, s: W, c: W / 8}, 0, false); }
    else if (d.kind === 'bg') { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b2a45'); gr.addColorStop(.6, '#0e3b5e'); gr.addColorStop(1, '#114d73'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    else if (d.kind === 'sky') sky(H);
    else if (d.kind === 'warship') CUT(g).warship(d.water[0], d.water[1], d.L, 0, false);
    else if (d.kind === 'deck') { g.fillStyle = '#39424e'; g.fillRect(0, 0, W, H); }
    else if (d.kind === 'gun') { g.fillStyle = '#232a33'; g.fillRect(0, 0, W, H); }
    else if (d.kind === 'torpedo') { g.fillStyle = '#10161e'; g.fillRect(0, H * .25, W, H * .5); }
    else if (d.kind === 'cap') { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(W / 2, H * .6, W * .43, H * .3, 0, 0, 7); g.fill(); }
    if (standin) { x.drawImage(o, 0, 0); return c.toDataURL('image/png'); }
    const opaque = d.kind === 'sea' || d.kind === 'bg' || d.kind === 'sky';
    if (!opaque) { x.fillStyle = 'rgba(80,120,200,.10)'; x.fillRect(0, 0, W, H); }
    x.globalAlpha = opaque ? .55 : .3; x.drawImage(o, 0, 0); x.globalAlpha = 1;
    x.strokeStyle = 'rgba(40,60,120,.8)'; x.lineWidth = 1 / zoom; x.strokeRect(.5 / zoom, .5 / zoom, W - 1 / zoom, H - 1 / zoom);
    const mark = (px, py, col = 'rgba(220,30,30,.9)') => { x.fillStyle = col; x.fillRect(px - 6, py, 13, 1); x.fillRect(px, py - 6, 1, 13); };
    if (d.kind === 'ship') { x.setLineDash([4, 3]); x.strokeStyle = 'rgba(255,255,255,.6)'; for (let i = 1; i < d.len; i++) { x.beginPath(); x.moveTo(i * BS.CELL, 0); x.lineTo(i * BS.CELL, H); x.stroke(); } x.setLineDash([]);
      x.fillStyle = 'rgba(220,30,30,.9)'; x.beginPath(); x.moveTo(W - 4, H / 2); x.lineTo(W - 16, H / 2 - 7); x.lineTo(W - 16, H / 2 + 7); x.fill(); }
    if (d.kind === 'sea') { x.strokeStyle = 'rgba(255,255,255,.35)'; for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(i * W / 8, 0); x.lineTo(i * W / 8, H); x.moveTo(0, i * H / 8); x.lineTo(W, i * H / 8); x.stroke(); } }
    if (d.kind === 'warship') { mark(d.water[0], d.water[1]); x.fillStyle = 'rgba(30,90,230,.8)'; x.fillRect(d.water[0] - d.L / 2, d.water[1] + 30, d.L, 2);
      x.fillStyle = 'rgba(30,90,230,.35)'; x.fillRect(0, d.water[1], W, 1); }
    if (d.kind === 'gun') mark(d.pivot[0] + 1, d.pivot[1]);
    if (d.kind === 'bg') { const m = Math.min(W, H) * .86, gx = (W - m) / 2, gy = (H - m) / 2; x.setLineDash([10, 8]); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 3; x.strokeRect(gx, gy, m, m); x.setLineDash([]);
      x.fillStyle = 'rgba(255,255,255,.7)'; x.font = '28px monospace'; x.textAlign = 'center'; x.fillText('the grids sit here (keep it calm, dark)', W / 2, gy + m / 2); x.textAlign = 'left'; }
    if (d.kind === 'sky') { x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(0, H - 2, W, 2); x.font = '22px monospace'; x.fillText('horizon (bottom edge; the sea is drawn by the game)', 12, H - 12); }
    x.fillStyle = d.kind === 'sea' || d.kind === 'bg' || d.kind === 'sky' ? 'rgba(255,255,255,.9)' : 'rgba(20,30,60,.85)'; x.font = '9px monospace';
    if (W >= 120) x.fillText(`${name} ${W}x${H}`, 4, 11);
    return c.toDataURL('image/png');
  }, {name, zoom, standin});
  save(name + (zoom > 1 ? '@2x' : ''), data);
}
console.log(picNames.length + 4, 'slots →', outDir);
await browser.close();
