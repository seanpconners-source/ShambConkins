#!/usr/bin/env node
// Template pictures for the Living Dead Horde drop-in art (src/data/hordeSprites.js), one PNG per slot at its real pixel
// size (+ a 2x preview <name>@2x.png):
//  - sheets: the frame grid, row names, the ground point (red cross), the face circle (blue, survivors: the game puts the
//    player's face there) and a faint POSE GUIDE in every frame = the game's own drawn version, for size and placement only.
//  - pictures: the size the game draws, the ground point (props, building), the lamp/torch glow spot (yellow ring), the
//    64-unit glyph box (icons), the tile edges (ground: must repeat seamlessly), with the drawn version as a faint guide.
// Paint over a copy (transparent background), keep the layout, save as assets/horde/<name>.png. Usage:
//   node tools/horde-templates.mjs   → docs/horde-sprites/templates/
//   node tools/horde-templates.mjs --standin <dir>   → <dir>/<name>.png: every slot filled with the game's own drawn art (no
//   marks), for checking the drop-in path: copy into assets/horde/, build, compare, then delete them again.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const si = process.argv.indexOf('--standin'), standin = si > 0;
const outDir = standin ? path.resolve(process.argv[si + 1]) : path.join(root, 'docs/horde-sprites/templates');
fs.mkdirSync(outDir, {recursive: true});
const mods = {
  'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};',
  'src/utils.js': fs.readFileSync(path.join(root, 'src/utils.js'), 'utf8'),
  'src/data/hordeSprites.js': fs.readFileSync(path.join(root, 'src/data/hordeSprites.js'), 'utf8'),
  'src/engines/hordeData.js': fs.readFileSync(path.join(root, 'src/engines/hordeData.js'), 'utf8'),
};
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => {
  const cache = {};
  window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e; };
}, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
const ZOOMS = standin ? [1] : [1, 2];

// ---------------------------------------------------------------- sheets
const sheetNames = await page.evaluate(() => Object.keys(require('src/data/hordeSprites.js').SHEETS).filter(n => n !== 'survivor-p2'));
for (const name of sheetNames) for (const zoom of ZOOMS) {
  const data = await page.evaluate(({name, zoom, standin}) => {
    const HS = require('src/data/hordeSprites.js'), HD = require('src/engines/hordeData.js'), TAU = Math.PI * 2;
    const def = HS.SHEETS[name], rows = Object.entries(def.rows), [fw, fh] = def.frame, cols = Math.max(...rows.map(r => r[1]));
    const c = document.getElementById('c'); c.width = cols * fw * zoom; c.height = rows.length * fh * zoom;
    const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.scale(zoom, zoom);
    const baked = def.enemy ? HD.bakeEnemies('dead')[def.enemy] : null;
    // the game's drawn version of a frame, in an offscreen frame
    const guide = (row, f, n) => {
      const o = document.createElement('canvas'); o.width = fw; o.height = fh; const g = o.getContext('2d');
      if (baked) { g.drawImage(baked.img, (f & 1) * baked.cell, 0, baked.cell, baked.cell, 0, 0, fw, fh); return o; }
      if (def.fx) {   // effect guide: where it sits (pivot), how far it reaches (R), which way it points
        const [px, py] = def.pivot, R = def.R, u = (f + 1) / n; g.lineWidth = 3; g.strokeStyle = '#ff9a2a'; g.fillStyle = 'rgba(255,154,42,.35)';
        if (name === 'fx-slash') { g.beginPath(); g.moveTo(px, py); g.arc(px, py, R, -def.arc / 2, -def.arc / 2 + def.arc * u); g.closePath(); g.fill(); g.stroke(); }
        else if (name === 'fx-muzzle') { g.beginPath(); g.moveTo(px, py - 10); g.lineTo(px + 70 * u + 10, py); g.lineTo(px, py + 10); g.closePath(); g.fill(); g.stroke(); }
        else if (name === 'fx-bolt') { g.beginPath(); g.moveTo(px, 0); for (let k = 1; k <= 8; k++) g.lineTo(px + (k % 2 ? 10 : -10) * (k < 8), fh * k / 8); g.stroke(); }
        else if (name.startsWith('pool-') || name === 'aura-goo') { g.beginPath(); g.ellipse(px, py, fw / 2 - 2, fh / 2 - 2, 0, 0, TAU); g.fill(); g.stroke(); }
        else if (name === 'fx-gore') { g.beginPath(); g.ellipse(px, py, R * u, R * u * .45, 0, 0, TAU); g.fill(); g.stroke(); }
        else { const r = name === 'fx-pulse' ? R * u : R * Math.min(1, .3 + u); g.beginPath(); g.arc(px, py, r, 0, TAU); if (name !== 'fx-pulse') g.fill(); g.stroke(); }
        return o;
      }
      // survivor body as drawPlayer draws it (2 px per unit, feet on the foot point); the head is the game's job
      g.translate(def.foot[0], def.foot[1]); g.scale(HS.PX, HS.PX); g.translate(0, -16);
      const ph = row === 'walk' ? f / n * TAU : 0, mov = row === 'walk', bob = mov ? Math.abs(Math.sin(ph)) * 3 : Math.sin(f / n * TAU);
      if (row === 'down') { g.translate(0, 12); g.rotate(-1.2 + f * .1); g.translate(0, -12); }
      const lg = Math.sin(ph) * (mov ? 5 : 0);
      g.strokeStyle = '#1a1d26'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-4, 6); g.lineTo(-4 + lg, 16); g.moveTo(4, 6); g.lineTo(4 - lg, 16); g.stroke();
      HD.rr(g, -8, -5 - bob * .5, 16, 15, 5); g.fillStyle = row === 'hurt' ? '#d86a6a' : '#78b6ff'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#10150f'; g.stroke();
      return o;
    };
    rows.forEach(([row, n], r) => {
      for (let f = 0; f < cols; f++) {
        const X = f * fw, Y = r * fh;
        if (!standin) {
          x.fillStyle = f < n ? ((f + r) % 2 ? 'rgba(80,120,200,.08)' : 'rgba(80,120,200,.15)') : 'rgba(0,0,0,.35)';
          x.fillRect(X, Y, fw, fh);
          x.strokeStyle = 'rgba(40,60,120,.6)'; x.lineWidth = 1 / zoom; x.strokeRect(X + .5 / zoom, Y + .5 / zoom, fw - 1 / zoom, fh - 1 / zoom);
        }
        if (f >= n) continue;
        const o = guide(row, f, n);
        if (standin) { x.drawImage(o, X, Y); continue; }
        x.globalAlpha = .3; x.drawImage(o, X, Y); x.globalAlpha = 1;
        const ft = def.foot || def.pivot; x.fillStyle = 'rgba(220,30,30,.9)'; x.fillRect(X + ft[0] - 4, Y + ft[1], 9, 1); x.fillRect(X + ft[0], Y + ft[1] - 4, 1, 5);
        if (def.fx && def.R && !name.startsWith('pool-') && name !== 'aura-goo') { x.setLineDash([4, 3]); x.strokeStyle = 'rgba(30,90,230,.8)'; x.lineWidth = 1; x.beginPath(); x.arc(X + ft[0], Y + ft[1], def.R, 0, TAU); x.stroke(); x.setLineDash([]); }
        if (def.head) {
          const [hx, hy] = def.head, R = def.headSize / 2;
          x.strokeStyle = 'rgba(30,90,230,.9)'; x.lineWidth = 1.5; x.beginPath(); x.arc(X + hx, Y + hy, R, 0, TAU); x.stroke();
          x.beginPath(); x.moveTo(X + hx, Y + hy - R); x.lineTo(X + hx, Y + hy - R + 6); x.stroke();
          x.fillStyle = 'rgba(30,90,230,.55)'; x.font = '8px monospace'; x.textAlign = 'center'; x.fillText('FACE', X + hx, Y + hy + 3); x.textAlign = 'left';
        }
        x.fillStyle = 'rgba(20,30,60,.8)'; x.font = '8px monospace'; x.fillText(`${row} ${f + 1}`, X + 3, Y + 10);
      }
    });
    return c.toDataURL('image/png');
  }, {name, zoom, standin});
  save(name + (zoom > 1 ? '@2x' : ''), data);
  if (standin && name === 'survivor-p1') save('survivor-p2', data);
  if (zoom === 1) { const d = await page.evaluate(n => require('src/data/hordeSprites.js').SHEETS[n], name); console.log(name, d.frame.join('x'), Object.entries(d.rows).map(([r, n]) => `${r}:${n}`).join(' ')); }
}

// ---------------------------------------------------------------- pictures
const picNames = await page.evaluate(() => Object.keys(require('src/data/hordeSprites.js').PICTURES));
for (const name of picNames) for (const zoom of ZOOMS) {
  const data = await page.evaluate(({name, zoom, standin}) => {
    const HS = require('src/data/hordeSprites.js'), HD = require('src/engines/hordeData.js'), TAU = Math.PI * 2;
    const d = HS.PICTURES[name], [W, H] = d.size, theme = d.theme || (d.type === 'torch' ? 'cabin' : 'dead');
    const c = document.getElementById('c'); c.width = W * zoom; c.height = H * zoom;
    const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.scale(zoom, zoom);
    if (!standin) { x.fillStyle = 'rgba(80,120,200,.10)'; x.fillRect(0, 0, W, H); }
    // the drawn version
    const o = document.createElement('canvas'); o.width = W; o.height = H; const g = o.getContext('2d');
    if (d.kind === 'prop') { const a = HD.bakeProps(theme)[d.type][d.v]; g.drawImage(a.img, d.foot[0] - a.ax * 2, d.foot[1] - a.ay * 2); }
    else if (d.kind === 'building') { const b = HD.bakeBuilding(d.theme); g.drawImage(b.img, d.foot[0] - b.w, d.foot[1] - (b.h - 10) * 2, b.w * 2, b.h * 2); }
    else if (d.kind === 'ground') g.drawImage(HD.groundTile(d.theme, 12345), 0, 0, W, H);
    else if (d.kind === 'gem') { const cols = ['#58b8ff', '#62e08a', '#ff6a6a', '#d98cff'];
      g.translate(W / 2, H / 2); g.scale(W / 28, H / 28); g.lineWidth = 1.6; HD.poly(g, [0, -11, 8, -2, 0, 11, -8, -2], cols[d.tier], '#10150f'); g.globalAlpha = .55; HD.poly(g, [0, -9, 5, -2, 0, 0, -5, -2], '#fff'); }
    else if (d.kind === 'shot') { g.fillStyle = name === 'shot-spit' ? '#8cff4a' : name === 'shot-fire' ? '#ffb04a' : name === 'shot-curse' ? '#c07aff' : name === 'proj-nail' ? '#e7edf2' : '#ffd27a';
      g.beginPath(); g.ellipse(W / 2, H / 2, W * .42, H * .38, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(220,30,30,.9)'; g.lineWidth = 1; g.beginPath(); g.moveTo(W * .2, H / 2); g.lineTo(W - 2, H / 2); g.lineTo(W - 6, H / 2 - 3); g.moveTo(W - 2, H / 2); g.lineTo(W - 6, H / 2 + 3); g.stroke(); }
    else if (d.kind === 'icon') g.drawImage(HD.bakeIcon(d.icon, W * 64 / 60.8, false), -(W * 64 / 60.8 - W) / 2, -(W * 64 / 60.8 - W) / 2);
    if (standin) { x.drawImage(o, 0, 0); return c.toDataURL('image/png'); }
    x.globalAlpha = d.kind === 'ground' ? .45 : .3; x.drawImage(o, 0, 0); x.globalAlpha = 1;
    x.strokeStyle = 'rgba(40,60,120,.8)'; x.lineWidth = 1 / zoom; x.strokeRect(.5 / zoom, .5 / zoom, W - 1 / zoom, H - 1 / zoom);
    if (d.foot) { x.fillStyle = 'rgba(220,30,30,.9)'; x.fillRect(d.foot[0] - 6, d.foot[1], 13, 1); x.fillRect(d.foot[0], d.foot[1] - 6, 1, 7);
      x.fillStyle = 'rgba(220,30,30,.25)'; x.fillRect(0, d.foot[1], W, 1); }
    if (d.light) { x.strokeStyle = 'rgba(230,180,20,.95)'; x.lineWidth = 1.5; x.beginPath(); x.arc(d.light[0], d.light[1], 7, 0, TAU); x.stroke(); }
    if (d.kind === 'icon') { x.setLineDash([4, 3]); x.strokeStyle = 'rgba(30,90,230,.7)'; x.beginPath(); x.arc(W / 2, H / 2, W * .47, 0, TAU); x.stroke(); x.setLineDash([]); }
    if (d.kind === 'ground') { x.setLineDash([6, 4]); x.strokeStyle = 'rgba(255,255,255,.8)'; x.strokeRect(.5, .5, W - 1, H - 1); x.setLineDash([]); }
    x.fillStyle = d.kind === 'ground' ? 'rgba(255,255,255,.9)' : 'rgba(20,30,60,.85)'; x.font = '9px monospace';
    if (W >= 90) x.fillText(`${name} ${W}x${H}`, 4, 11);
    return c.toDataURL('image/png');
  }, {name, zoom, standin});
  save(name + (zoom > 1 ? '@2x' : ''), data);
}
console.log(picNames.length, 'pictures');
await browser.close();
