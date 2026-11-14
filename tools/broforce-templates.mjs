#!/usr/bin/env node
// Template pictures for the Sean of a Gun (Broforce) drop-in art (src/data/broforceSprites.js), one PNG per slot at its
// real pixel size. Sheets show the frame grid, the feet point (red cross: where the feet touch the ground), and for the bro
// the neck (cyan: the game puts the face there) and the gun hand (yellow). The new worlds' enemies and bosses show a faint
// copy of the game's own drawing in every frame (src/engines/broforce/ext.js); the rest get a silhouette box.
// Paint over a copy (transparent background except skies/strips), keep the layout, save as assets/broforce/<name>.png.
//   node tools/broforce-templates.mjs            → docs/broforce-sprites/templates/
//   node tools/broforce-templates.mjs --only=bro-body,boss-queen
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs/broforce-sprites/templates');
fs.mkdirSync(outDir, {recursive: true});
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const mods = {'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};'};
for (const f of ['src/data/broforceSprites.js', 'src/engines/broforce/ext.js', 'src/engines/broforce/worlds.js']) mods[f] = fs.readFileSync(path.join(root, f), 'utf8');
// the first four worlds' palettes, read out of broforce.js
const src = fs.readFileSync(path.join(root, 'src/engines/broforce.js'), 'utf8');
const oldThemes = src.match(/const THEMES=(\{[\s\S]*?\n\});/)[1];
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(([mods, oldThemes]) => {
  const cache = {};
  window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e; };
  window.OLD_THEMES = new Function('return ' + oldThemes)();
}, [mods, oldThemes]);
const names = await page.evaluate(() => { const B = require('src/data/broforceSprites.js'); return [...Object.keys(B.SHEETS), ...Object.keys(B.PICTURES)]; });
let n = 0;
for (const name of names) {
  if (only.length && !only.includes(name)) continue;
  const data = await page.evaluate(name => {
    const B = require('src/data/broforceSprites.js'), EXT = require('src/engines/broforce/ext.js'), WX = require('src/engines/broforce/worlds.js');
    const themes = {...window.OLD_THEMES, ...WX.THEMES_EXT};
    const c = document.getElementById('c'), x = c.getContext('2d');
    const label = (t, X, Y, col = '#000', size = 14, align = 'left') => { x.font = `bold ${size}px Arial`; x.textAlign = align; x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,.85)'; x.strokeText(t, X, Y); x.fillStyle = col; x.fillText(t, X, Y); };
    const cross = (X, Y, col) => { x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); x.moveTo(X - 6, Y); x.lineTo(X + 6, Y); x.moveTo(X, Y - 6); x.lineTo(X, Y + 6); x.stroke(); };
    // a fake game context so ext.js can draw its enemies and bosses
    const C = {T: 16, K: {}, W: {foes: [], shots: [], zones: [], arcs: []}, P: {x: -999, y: 0, facing: 1, bro: 'x'}, theme: {decor: 'space'}, frames: 0, fx: {}, sfx: {}, headCanvas: () => { const k = document.createElement('canvas'); k.width = k.height = 4; return k; }};
    const X = EXT.makeExt(C);
    const def = B.SHEETS[name];
    if (def) {
      const rows = Object.entries(def.rows), [fw, fh] = def.frame, cols = Math.max(...rows.map(r => r[1]));
      c.width = cols * fw; c.height = rows.length * fh; x.clearRect(0, 0, c.width, c.height);
      rows.forEach(([row, cnt], r) => {
        for (let f = 0; f < cols; f++) {
          const X0 = f * fw, Y0 = r * fh;
          x.fillStyle = f < cnt ? 'rgba(80,120,200,.07)' : 'rgba(0,0,0,.22)'; x.fillRect(X0, Y0, fw, fh);
          x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.strokeRect(X0 + .5, Y0 + .5, fw - 1, fh - 1);
          if (f >= cnt) continue;
          const [ax, ay] = def.feet;
          x.save(); x.globalAlpha = .4; x.translate(X0 + ax, Y0 + ay); x.scale(B.K, B.K);
          const kind = name.replace(/^(foe|boss)-/, ''), t = f * .2 + r;
          try {
            if (name.startsWith('foe-') && EXT.FOES2[kind]) { const e = X.makeFoe2({type: kind, x: 0, y: 0, k: f}); Object.assign(e, {dir: 1, anim: f * 1.3, vx: row === 'walk' ? 10 : 0, state: row === 'attack' ? 'attack' : 'patrol', muzzle: row === 'attack' && f === 1 ? .05 : 0, charge: row === 'attack' ? 1 : 0, whip: row === 'attack' ? .2 : 0, popT: 1, hidden: 0, flash: 0}); C.W.foes = [e]; X.drawFoe(x, e, t); }
            else if (name.startsWith('boss-') && EXT.BOSSES[kind]) { const Bo = {x: 0, y: 0, dir: 1, alive: true, dead: 0, flash: 0, anim: t, vx: row === 'move' ? 20 : 0, kind, att: row === 'attack' ? ['volley', 'charge', 'spin', 'beam', 'drop'][f % 5] : 'idle', t: 1, state: row, fade: 0}; X.drawBoss(x, Bo, t); }
            else { // silhouette: a soldier / animal / boss shape box
              const big = name.startsWith('boss-'), w = big ? 50 : name === 'foe-dog' ? 14 : name === 'foe-bruiser' ? 16 : 10, h = big ? 64 : name === 'foe-dog' ? 10 : name === 'foe-bruiser' ? 30 : 20;
              x.fillStyle = '#556'; x.fillRect(-w / 2, -h, w, h);
              if (name === 'bro-body') { x.fillStyle = '#4a6a2a'; x.fillRect(-4, -18, 8, 10); x.fillStyle = '#3d4a2a'; x.fillRect(-3, -8, 2.5, 8); x.fillRect(.5, -8, 2.5, 8); }
            }
          } catch (err) { /* a guide that fails to draw just stays empty */ }
          x.restore();
          cross(X0 + ax, Y0 + ay, '#e00');
          if (def.neck) { x.strokeStyle = '#08a'; x.lineWidth = 2; x.beginPath(); x.arc(X0 + def.neck[0], Y0 + def.neck[1] - 24, 22, 0, 7); x.stroke(); cross(X0 + def.neck[0], Y0 + def.neck[1], '#08a'); }
          if (def.hand) { x.strokeStyle = '#c90'; x.lineWidth = 2; x.beginPath(); x.arc(X0 + def.hand[0], Y0 + def.hand[1], 5, 0, 7); x.stroke(); }
          label(`${row} ${f + 1}`, X0 + 4, Y0 + 12, '#003', 10);
        }
      });
      if (name === 'bro-body') label('cyan circle = the face goes here (leave it empty: NO HEAD), yellow = gun hand', 4, c.height - 6, '#036', 11);
      return c.toDataURL('image/png');
    }
    const pd = B.PICTURES[name], [w, h] = pd.size; c.width = w; c.height = h; x.clearRect(0, 0, w, h);
    const th = pd.world ? themes['broforce-' + pd.world] : null;
    if (name.startsWith('tiles-')) {
      const cw = 64;
      B.TILE_NAMES.forEach((tn, i) => { for (let v = 0; v < 3; v++) {
        const col = th ? ({dirt: th.dirt[v % 3], brick: th.brick[v % 2], rock: th.rock[v % 2], wood: th.wood, platform: th.wood, crate: '#b0803e', goo: th.dirt[(v + 1) % 3], lava: th.liquid === 'acid' ? '#5aa02a' : '#ff6a1a', steel: '#767b84', ladder: 'rgba(106,74,34,.6)', barrel: '#c8281c', sandbags: '#b8a77a', spikes: '#c8ccd4', 'jump-pad': '#ffd23a', glass: 'rgba(170,220,255,.5)', 'q-block': '#f8b830', pipe: '#2ab02a', crystal: '#c84aff'}[tn] || '#888') : '#888';
        x.fillStyle = col; x.globalAlpha = .5; x.fillRect(i * cw, v * 64, cw, 64); x.globalAlpha = 1; x.strokeStyle = 'rgba(0,0,0,.4)'; x.strokeRect(i * cw + .5, v * 64 + .5, cw - 1, 63);
        label(tn, i * cw + 3, v * 64 + 12, '#000', 9); label('v' + (v + 1), i * cw + 3, v * 64 + 60, '#333', 9); } });
      return c.toDataURL('image/png');
    }
    if (name.startsWith('top-')) { for (let v = 0; v < 3; v++) { x.fillStyle = th ? th.top : '#5b3'; x.globalAlpha = .6; x.fillRect(v * 64, 8, 64, 16); x.globalAlpha = 1; x.strokeStyle = '#000'; x.strokeRect(v * 64 + .5, .5, 63, h - 1); } label('ground edge strip (grass/snow/…) drawn on top of dirt tiles', 2, h - 2, '#000', 8); return c.toDataURL('image/png'); }
    if (name.startsWith('sky-')) { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]); x.fillStyle = gr; x.fillRect(0, 0, w, h); label(`sky-${pd.world}: the far sky (opaque, no ground). The game cover-fits it behind everything.`, 30, 60, '#000', 28); return c.toDataURL('image/png'); }
    if (name.startsWith('far-') || name.startsWith('mid-')) { const far = name.startsWith('far'); x.fillStyle = far ? th.far : th.mid; x.globalAlpha = .55; x.beginPath(); x.moveTo(0, h); for (let X0 = 0; X0 <= w; X0 += 120) x.lineTo(X0, h * (far ? .45 : .35) + Math.sin(X0 * .01) * 60); x.lineTo(w, h); x.fill(); x.globalAlpha = 1;
      x.strokeStyle = '#e0f'; x.setLineDash([12, 8]); x.beginPath(); x.moveTo(0, h - 2); x.lineTo(w, h - 2); x.stroke(); x.setLineDash([]);
      label(`${name}: ${far ? 'distant' : 'nearer'} silhouettes (mountains/skyline/...), TRANSPARENT above them. Must tile left-right. Bottom edge = horizon.`, 20, 40, '#000', 22); return c.toDataURL('image/png'); }
    x.strokeStyle = 'rgba(0,160,255,.9)'; x.setLineDash([8, 6]); x.lineWidth = 2; x.strokeRect(2, 2, w - 4, h - 4); x.setLineDash([]);
    const notes = {vehicle: 'the extraction chopper / ship seen from the side, facing right; the game hangs the rope ladder under its middle', tree: 'one tree / prop standing on the ground (bottom middle = its foot)', cage: 'prisoner cage, bars and frame only (the prisoner is drawn inside by the game)', 'cage-gold': 'the GOLD cage (new recruit inside)', flag: 'checkpoint flag pole, enemy flag', 'flag-up': 'checkpoint flag pole, your flag raised', 'pickup-nade': 'grenade pickup', 'pickup-gun': 'weapon crate pickup'};
    const key = Object.keys(notes).find(k => name === k || name.startsWith(k + '-'));
    label(name, 6, 16, '#000', 12); if (key) { x.font = 'bold 10px Arial'; const words = notes[key].split(' '); let line = '', yy = 32; for (const wd of words) { if (x.measureText(line + wd).width > w - 12) { label(line, 6, yy, '#036', 10); line = ''; yy += 12; } line += wd + ' '; } label(line, 6, yy, '#036', 10); }
    cross(w / 2, h - 3, '#e00');
    return c.toDataURL('image/png');
  }, name);
  fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64')); n++;
}
await browser.close();
console.log(`${n} templates → ${path.relative(root, outDir)}`);
