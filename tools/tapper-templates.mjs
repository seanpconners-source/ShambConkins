#!/usr/bin/env node
// Template pictures for the Banana Stand Tapper drop-in art (src/data/tapperSprites.js), one PNG per slot at its real pixel
// size (+ a 2x preview <name>@2x.png for the small ones). Each shows the frame grid / outline, the important points (face
// circle, the bar line that hides everything below it, the bar top height on the tap, the item's resting line, the calm zone
// on the backgrounds) and a faint guide figure in the Arrested Development look (white, black outlines, flat colours).
// Paint over a copy (transparent background except bg/floor/bar/card), keep the layout, save as assets/tapper/<name>.png.
//   node tools/tapper-templates.mjs   → docs/tapper-sprites/templates/
//   node tools/tapper-templates.mjs --only=bg-stand,customer-1
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs/tapper-sprites/templates');
fs.mkdirSync(outDir, {recursive: true});
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const mods = {'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};', 'src/data/tapperSprites.js': fs.readFileSync(path.join(root, 'src/data/tapperSprites.js'), 'utf8')};
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => {
  const cache = {};
  window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e; };
}, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
const TS = await page.evaluate(() => { const T = require('src/data/tapperSprites.js'); return {SHEETS: T.SHEETS, PICTURES: T.PICTURES, LEVELS: T.LEVELS}; });

for (const [name, def] of Object.entries(TS.SHEETS)) {
  if (only.length && !only.includes(name)) continue;
  for (const zoom of [1, 2]) {
    const data = await page.evaluate(({name, def, zoom}) => {
      const rows = Object.entries(def.rows), [fw, fh] = def.frame, cols = Math.max(...rows.map(r => r[1]));
      const c = document.getElementById('c'); c.width = cols * fw * zoom; c.height = rows.length * fh * zoom;
      const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.scale(zoom, zoom);
      const shirt = def.who === 'bartender' ? '#ffffff' : ['#5b7fb5', '#2d3142', '#e3b23c', '#b56576'][def.v || 0];
      const apron = def.who === 'bartender' ? (def.p ? ['#d64545', '#ffffff'] : ['#ffd84a', '#2f6fd8']) : null;
      rows.forEach(([row, n], r) => {
        for (let f = 0; f < cols; f++) {
          const X = f * fw, Y = r * fh;
          x.fillStyle = f < n ? 'rgba(80,120,200,.07)' : 'rgba(0,0,0,.18)'; x.fillRect(X, Y, fw, fh);
          x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.strokeRect(X + .5, Y + .5, fw - 1, fh - 1);
          if (f >= n) continue;
          // faint guide body: flat shirt, black outline, arms by pose (the game's drawn stand-in)
          const [hx, hy] = def.head, hs = def.headSize, tw = hs * 1.25, top = hy + hs * .42, yb = def.bar;
          x.save(); x.translate(X + hx, Y); x.globalAlpha = .35;
          x.fillStyle = shirt; x.strokeStyle = '#111'; x.lineWidth = 2; x.beginPath(); x.roundRect(-tw / 2, top, tw, fh - top - 6, tw * .25); x.fill(); x.stroke();
          if (apron) { x.fillStyle = apron[0]; x.fillRect(-tw * .36, top + tw * .25, tw * .72, fh - top - tw * .3); x.fillStyle = apron[1]; x.fillRect(-tw * .36, top + tw * .42, tw * .72, tw * .08); }
          const arm = (ax, ang) => { x.save(); x.translate(ax, top + tw * .12); x.rotate(ang); x.fillStyle = shirt; x.beginPath(); x.roundRect(-tw * .09, 0, tw * .18, tw * .62, tw * .09); x.fill(); x.stroke(); x.fillStyle = '#e9b48c'; x.beginPath(); x.arc(0, tw * .66, tw * .1, 0, 7); x.fill(); x.stroke(); x.restore(); };
          const sw = Math.sin(f * 1.6) * .25;
          if (row === 'angry' || row === 'lose') { arm(-tw * .42, 2.6 + sw); arm(tw * .42, -2.6 - sw); }
          else if (row === 'eat') { arm(-tw * .42, .2); arm(tw * .4, -2.4); }
          else if (row === 'push' || row === 'serve' || row === 'catch' || row === 'pour') { arm(-tw * .42, .3); arm(tw * .42, -1.3); }
          else { arm(-tw * .42, .15 + sw); arm(tw * .42, -.15 - sw); }
          x.restore();
          // face circle (the game puts the face here), bar line (nothing below it shows)
          x.strokeStyle = 'rgba(30,90,230,.9)'; x.lineWidth = 1.5; x.setLineDash([4, 3]); x.beginPath(); x.arc(X + hx, Y + hy, hs / 2, 0, 7); x.stroke();
          x.strokeStyle = 'rgba(220,40,40,.9)'; x.beginPath(); x.moveTo(X, Y + yb); x.lineTo(X + fw, Y + yb); x.stroke(); x.setLineDash([]);
          x.fillStyle = 'rgba(220,40,40,.9)'; x.font = '9px Arial'; x.fillText('bar top', X + 4, Y + yb - 3);
          x.fillStyle = 'rgba(0,0,0,.65)'; x.font = 'bold 10px Arial'; x.fillText(row + ' ' + (f + 1), X + 4, Y + 12);
        }
      });
      return c.toDataURL('image/png');
    }, {name, def, zoom});
    save(zoom === 1 ? name : name + '@2x', data);
  }
  console.log(name, def.frame.join('x'), Object.entries(def.rows).map(([r, n]) => `${r}:${n}`).join(' '));
}

for (const [name, d] of Object.entries(TS.PICTURES)) {
  if (only.length && !only.includes(name)) continue;
  const L = TS.LEVELS.find(l => l.id === d.level);
  const data = await page.evaluate(({name, d, L}) => {
    const [W, H] = d.size, c = document.getElementById('c'); c.width = W; c.height = H; const x = c.getContext('2d'); x.clearRect(0, 0, W, H);
    const ink = L ? L.ink : {wall: '#fff', trim: '#2f6fd8', top: '#ffd84a', topEdge: '#d9a91c', front: '#2f6fd8', front2: '#fff', floor: '#efe6d2', plank: '#e2d5b8', tap: '#ffd84a'};
    const tag = (t, px, py, size = 14, col = 'rgba(0,0,0,.7)') => { x.fillStyle = col; x.font = `bold ${size}px Arial`; x.fillText(t, px, py); };
    const dash = (col = 'rgba(220,40,40,.9)') => { x.strokeStyle = col; x.lineWidth = 2; x.setLineDash([8, 6]); };
    if (d.kind === 'bg') {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
      // where the bars go: the lower part of the screen (4 bars), the calm zone the people stand in
      const barsTop = d.wide ? H * .2 : H * .45;
      x.fillStyle = 'rgba(80,120,200,.08)'; x.fillRect(0, barsTop, W, H - barsTop);
      for (let r = 0; r < 4; r++) { const y = barsTop + (H - barsTop) * (r + .68) / 4; x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(W * .1, y, W * .8, (H - barsTop) / 4 * .3); }
      dash(); x.strokeRect(W * .05, barsTop, W * .9, H - barsTop - 4); x.setLineDash([]);
      tag('BARS + PEOPLE GO HERE (keep it calm: plain wall, floor)', W * .07, barsTop + 30, Math.round(W / 50));
      const ty = Math.min(barsTop * .4, H * .1) + 20; tag(L.title, W * .07, ty, Math.round(W / 26)); tag(L.sub, W * .07, ty + W / 22, Math.round(W / 44), 'rgba(0,0,0,.5)');
      tag('Interesting stuff along the top and the edges. White walls, Arrested Development look.', W * .07, ty + W / 22 + W / 30, Math.round(W / 60), 'rgba(0,0,0,.45)');
    } else if (d.kind === 'floor') {
      x.fillStyle = ink.floor; x.fillRect(0, 0, W, H); x.strokeStyle = ink.plank; x.lineWidth = 3; for (let y = 0; y < H; y += H / 8) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
      dash('rgba(30,90,230,.8)'); x.strokeRect(2, 2, W - 4, H - 4); x.setLineDash([]); tag('SEAMLESS TILE: left↔right and top↔bottom must join', 16, 30, 16);
    } else if (d.kind === 'bar') {
      x.fillStyle = ink.top; x.fillRect(0, 0, W, H * .3); x.fillStyle = ink.topEdge; x.fillRect(0, H * .3, W, H * .06);
      x.fillStyle = ink.front; x.fillRect(0, H * .36, W, H * .64);
      if (L.id === 'stand') { for (let px = 0, k = 0; px < W; px += W / 16, k++) if (k % 2) { x.fillStyle = ink.front2; x.fillRect(px, H * .36, W / 16, H * .64); } }
      x.globalAlpha = .5; x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
      dash(); x.beginPath(); x.moveTo(0, H * .3); x.lineTo(W, H * .3); x.stroke(); x.setLineDash([]);
      tag('BAR TOP SURFACE (top 30%): orders slide along here', 14, H * .18, 18); tag('FRONT PANEL', 14, H * .7, 18); tag('repeats left↔right ⟷', W - 230, H * .7, 18);
    } else if (d.kind === 'tap') {
      dash(); x.beginPath(); x.moveTo(0, d.bar); x.lineTo(W, d.bar); x.stroke(); x.setLineDash([]);
      x.globalAlpha = .35; x.fillStyle = ink.tap; x.strokeStyle = '#111'; x.lineWidth = 3; x.beginPath(); x.roundRect(W * .3, d.bar - 90, W * .4, 80, 8); x.fill(); x.stroke(); x.fillRect(W * .25, d.bar, W * .5, H - d.bar - 4); x.strokeRect(W * .25, d.bar, W * .5, H - d.bar - 4); x.globalAlpha = 1;
      tag('bar top height', 6, d.bar - 6, 13, 'rgba(220,40,40,.9)'); tag({stand: 'banana freezer', penthouse: 'martini station', modelhome: 'ham-water pot'}[L.id], 6, 18, 14);
    } else if (d.kind === 'door') {
      x.globalAlpha = .3; x.fillStyle = '#fff'; x.strokeStyle = ink.trim; x.lineWidth = 4; x.fillRect(W * .25, H * .1, W * .5, H * .88); x.strokeRect(W * .25, H * .1, W * .5, H * .88); x.globalAlpha = 1;
      dash('rgba(30,90,230,.8)'); x.beginPath(); x.moveTo(0, H - 2); x.lineTo(W, H - 2); x.stroke(); x.setLineDash([]);
      tag('customers come in here (left end of every bar)', 6, 20, 12); tag({stand: 'boardwalk railing gap + sign post', penthouse: 'the elevator', modelhome: 'unfinished front door'}[L.id], 6, 38, 12);
    } else if (d.kind === 'item' || d.kind === 'empty') {
      x.fillStyle = 'rgba(80,120,200,.07)'; x.fillRect(0, 0, W, H); dash(); x.beginPath(); x.moveTo(0, H - 6); x.lineTo(W, H - 6); x.stroke(); x.setLineDash([]);
      tag((d.kind === 'item' ? L.item : L.empty) + ' (side view)', 6, 16, 12); tag('sits on this line', 6, H - 10, 11, 'rgba(220,40,40,.9)');
    } else if (d.kind === 'cash') {
      x.globalAlpha = .35; x.fillStyle = '#6fbf73'; x.strokeStyle = '#111'; x.lineWidth = 2; x.beginPath(); x.roundRect(W * .1, H * .4, W * .8, H * .45, 6); x.fill(); x.stroke(); x.globalAlpha = 1; tag('a little stack of bills', 6, 16, 12);
    } else if (d.kind === 'card') {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); x.fillStyle = '#111'; x.font = 'bold 72px Helvetica, Arial'; x.fillText(L.title, W * .08, H * .46); x.fillStyle = '#8a8a8a'; x.font = '600 34px Helvetica, Arial'; x.fillText(L.sub, W * .08, H * .46 + 60);
      tag('optional level title card (shown 2 s as the level starts)', 20, H - 24, 22, 'rgba(220,40,40,.8)');
    } else if (d.kind === 'logo') {
      x.fillStyle = '#111'; x.font = 'bold 120px Helvetica, Arial'; x.globalAlpha = .3; x.fillText('Banana Stand', 40, 200); x.fillText('Tapper', 40, 340); x.globalAlpha = 1; tag('title lettering, transparent background', 20, H - 20, 22, 'rgba(220,40,40,.8)');
    }
    return c.toDataURL('image/png');
  }, {name, d, L});
  save(name, data);
  console.log(name, d.size.join('x'));
}
await browser.close();
