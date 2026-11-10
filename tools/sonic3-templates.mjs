#!/usr/bin/env node
// Template pictures for the Sonic 3 style game's drop-in art (src/data/sonic3Sprites.js): one PNG per sheet / picture at
// its real pixel size, plus a 4x copy <name>@4x.png (the one to hand to Grok), plus rows/<sheet>.<row>@4x.png = one
// animation row on its own for the runner and ball sheets (ask for a big sheet one row at a time).
//  - sheets: the frame grid, row names, the anchor (red cross: feet on the ground, or the centre for balls, flyers and
//    effects), the face circle (blue, with a tick showing which way is up) where the game puts a face, and a faint grey
//    POSE GUIDE in every runner frame (a plain mannequin: position, size and pose only).
//  - pictures: the size, the anchor, the lines that matter (ground line, repeat arrows).
// Usage: node tools/sonic3-templates.mjs   → docs/sonic3-sprites/templates/
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs/sonic3-sprites/templates');
fs.mkdirSync(path.join(outDir, 'rows'), {recursive: true});
const src = fs.readFileSync(path.join(root, 'src/data/sonic3Sprites.js'), 'utf8');
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(src => {
  const e = {}; new Function('exports', src)(e); window.SP = e;
  const TAU = Math.PI * 2;
  // a plain mannequin for the runner rows, in frame px. Feet and hands are targets; the head circle stays empty.
  window.mannequin = (g, def, row, f, n, head, fox) => {
    const k = n > 1 ? f / n : 0, c = k * TAU, [fx, fy] = def.foot, hx = head.x, hy = head.y;
    let hip = [hx - 3, Math.min(hy + 24, fy - 5)], feet = [[-4, 0], [4, 0]], hands = [[-6, 9], [7, 9]], wheel = false, scarf = -1;
    const S = Math.sin, C = Math.cos;
    if (row === 'wait') feet = [[-4, 0], [5, f % 2 ? -3 : 0]], hands = [[-5, 4], [5, 4]];
    if (row === 'lookUp') hands = [[-6, 8], [6, 7]];
    if (row === 'crouch') feet = [[-5, 0], [7, 0]], hands = [[-4, 8], [9, 7]];
    if (row === 'walk' || row === 'run') { const a = row === 'run' ? 11 : 7; feet = [[S(c) * a, -Math.max(0, C(c)) * 4], [-S(c) * a, -Math.max(0, -C(c)) * 4]]; hands = [[-S(c) * 8, 6], [S(c) * 8, 6]]; scarf = row === 'run' ? -1.6 : -1; }
    if (row === 'dash') { wheel = true; hands = [[-10, 2], [-9, 5]]; scarf = -2; }
    if (row === 'skid') feet = [[6, 0], [13, -1]], hands = [[-9, 2], [8, 0]], scarf = 1;
    if (row === 'push') feet = [[-9, 0], [1, 0]], hands = [[11, 1], [11, 4]];
    if (row === 'balance') feet = [[-3, 0], [3, 0]], hands = [[-11, [-4, 2, -6][f]], [11, [2, -5, 4][f]]];
    if (row === 'spring') feet = [[-3, 0], [3, -1]], hands = [[-5, -16], [5, -16]], hip[1] -= 2;
    if (row === 'fall') feet = [[-7, -3], [7, -2]], hands = [[-9, -12], [9, -12]];
    if (row === 'hurt') feet = [[4, -3], [12, -6]], hands = [[-10, -6], [9, -8]];
    if (row === 'hang') feet = [[-3 + S(c) * 3, 0], [3 + S(c) * 3, -1]], hands = [[-2, -30], [3, -30]];
    if (row === 'win') hands = [[-6, 8], [8 - f, [4, -6, -14, -12][f]]];
    if (row === 'dead') feet = [[-8, -2], [8, -2]], hands = [[-11, -10], [11, -10]];
    if (row === 'fly') feet = [[-6, -4], [2, -2]], hands = [[8, 4], [9, 8]], scarf = -1.4;
    if (row === 'tired') feet = [[-3, -1], [3, 0]], hands = [[-5, 10], [6, 10]];
    const sh = [hx - 1, hy + 14];
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = g.fillStyle = '#46465a';
    if (scarf) { const d = Math.sign(scarf), m = Math.abs(scarf);
      if (fox) { g.lineWidth = 6; for (let k = -1; k <= 1; k++) { const a = (row === 'fly' ? c * 2 + k * 2.1 : k * .45 + S(c * 2) * .15), L = 13 + m * 3; g.beginPath(); g.moveTo(hip[0] + d * 2, hip[1] - 2); g.quadraticCurveTo(hip[0] + d * L * .6, hip[1] - 4 + S(a) * 8, hip[0] + d * L * (row === 'fly' ? C(a) * .6 + .5 : 1), hip[1] - 2 + S(a) * (row === 'fly' ? 12 : 9)); g.stroke(); } }
      else for (let k = 0; k < 5; k++) { const a = -1 + k * .48, L = 25 + m * 3, ca = C(a), sa = S(a); g.beginPath(); g.moveTo(hx + d * ca * 8 + sa * 6 * d, hy + sa * 8 - ca * 6); g.lineTo(hx + d * ca * L, hy + sa * L); g.lineTo(hx + d * ca * 8 - sa * 6 * d, hy + sa * 8 + ca * 6); g.closePath(); g.fill(); } }
    g.lineWidth = 5;
    if (wheel) { g.lineWidth = 3; g.beginPath(); g.ellipse(fx, fy - 6, 11, 6, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(fx, fy - 6, 5 + f % 2 * 2, 3, 0, 0, 7); g.stroke(); g.lineWidth = 5; }
    else for (const [dx, dy] of feet) { const tx = fx + dx, ty = fy + dy - 2, kx = (hip[0] + tx) / 2 + 3, ky = (hip[1] + ty) / 2; g.beginPath(); g.moveTo(hip[0], hip[1]); g.lineTo(kx, ky); g.lineTo(tx, ty); g.stroke(); g.beginPath(); g.ellipse(tx + 2, ty, 5, 2.6, 0, 0, 7); g.fill(); }
    g.lineWidth = 9; g.beginPath(); g.moveTo(hip[0], hip[1]); g.lineTo(sh[0], sh[1] + 3); g.stroke();
    g.lineWidth = 3.4; for (const [dx, dy] of hands) { const tx = sh[0] + dx, ty = sh[1] + dy; g.beginPath(); g.moveTo(sh[0], sh[1] + 2); g.lineTo((sh[0] + tx) / 2 - 1, (sh[1] + ty) / 2 + 2); g.lineTo(tx, ty); g.stroke(); g.beginPath(); g.arc(tx, ty, 3, 0, 7); g.fill(); }
  };
  // one frame cell: tint, border, guide, anchor, face circle, label
  window.cell = (x, name, def, row, f, n, X, Y, zoom, r) => {
    const [fw, fh] = def.frame;
    x.fillStyle = (f + r) % 2 ? 'rgba(60,120,200,.10)' : 'rgba(60,120,200,.18)'; x.fillRect(X, Y, fw, fh);
    x.strokeStyle = 'rgba(20,50,120,.6)'; x.lineWidth = 1 / zoom; x.strokeRect(X + .5 / zoom, Y + .5 / zoom, fw - 1 / zoom, fh - 1 / zoom);
    const h = SP.headOf(name, row, f);
    if (name.startsWith('runner')) { const o = document.createElement('canvas'); o.width = fw; o.height = fh; const g = o.getContext('2d'); mannequin(g, def, row, f, n, h, name.endsWith('p2'));
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(h.x, h.y, def.headSize * .52, 0, 7); g.fill(); x.globalAlpha = .42; x.drawImage(o, X, Y); x.globalAlpha = 1; }
    if (name.startsWith('ball')) { x.strokeStyle = 'rgba(70,70,90,.45)'; x.lineWidth = 1.5; x.setLineDash([3, 2]); x.beginPath(); x.arc(X + def.foot[0], Y + def.foot[1], 15, 0, 7); x.stroke(); x.setLineDash([]); }
    x.fillStyle = 'rgba(220,30,30,.95)'; x.fillRect(X + def.foot[0] - 5, Y + Math.min(def.foot[1], fh - 1), 11, 1); x.fillRect(X + def.foot[0], Y + Math.min(def.foot[1], fh - 1) - 5, 1, 6);
    if (h) { const R = def.headSize / 2, cx = X + h.x, cy = Y + h.y; x.strokeStyle = 'rgba(30,90,240,.95)'; x.lineWidth = 1.2; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
      x.beginPath(); x.moveTo(cx + Math.sin(h.rot) * R * .6, cy - Math.cos(h.rot) * R * .6); x.lineTo(cx + Math.sin(h.rot) * R, cy - Math.cos(h.rot) * R); x.stroke(); }
    x.fillStyle = 'rgba(10,20,50,.9)'; x.font = (fw < 32 ? 4 : fw < 48 ? 5 : 7) + 'px monospace'; x.fillText(fw < 32 ? `${f + 1}` : `${row} ${f + 1}`, X + 2, Y + (fw < 32 ? 5 : 8));
  };
}, src);

const save = (file, data) => fs.writeFileSync(path.join(outDir, file), Buffer.from(data.split(',')[1], 'base64'));
const sheets = await page.evaluate(() => Object.keys(SP.SHEETS).filter(n => !SP.SHEETS[n].same));
for (const name of sheets) {
  for (const zoom of [1, 4]) save(`${name}${zoom > 1 ? '@4x' : ''}.png`, await page.evaluate(({name, zoom}) => {
    const def = SP.SHEETS[name], rows = Object.entries(def.rows), [fw, fh] = def.frame, cols = Math.max(...rows.map(r => r[1]));
    const c = document.getElementById('c'); c.width = cols * fw * zoom; c.height = rows.length * fh * zoom;
    const x = c.getContext('2d'); x.scale(zoom, zoom);
    rows.forEach(([row, n], r) => { for (let f = 0; f < cols; f++) { if (f < n) cell(x, name, def, row, f, n, f * fw, r * fh, zoom, r); else { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(f * fw, r * fh, fw, fh); } } });
    return c.toDataURL('image/png');
  }, {name, zoom}));
  if (/^(runner|ball)/.test(name)) for (const row of await page.evaluate(n => Object.keys(SP.SHEETS[n].rows), name)) save(`rows/${name}.${row}@4x.png`, await page.evaluate(({name, row}) => {
    const def = SP.SHEETS[name], n = def.rows[row], [fw, fh] = def.frame, zoom = 4, c = document.getElementById('c'); c.width = n * fw * zoom; c.height = fh * zoom;
    const x = c.getContext('2d'); x.scale(zoom, zoom); for (let f = 0; f < n; f++) cell(x, name, def, row, f, n, f * fw, 0, zoom, 0);
    return c.toDataURL('image/png');
  }, {name, row}));
  console.log('sheet', name);
}
for (const name of await page.evaluate(() => Object.keys(SP.PICTURES))) {
  for (const zoom of [1, 4]) save(`${name}${zoom > 1 ? '@4x' : ''}.png`, await page.evaluate(({name, zoom}) => {
    const p = SP.PICTURES[name], [W, H] = p.size, [ax, ay] = p.anchor, c = document.getElementById('c'); c.width = W * zoom; c.height = H * zoom;
    const x = c.getContext('2d'); x.scale(zoom, zoom); x.fillStyle = p.opaque ? 'rgba(60,120,200,.30)' : 'rgba(60,120,200,.14)'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(20,50,120,.6)'; x.lineWidth = 1 / zoom; x.strokeRect(.5 / zoom, .5 / zoom, W - 1 / zoom, H - 1 / zoom);
    const small = W < 48, fs = small ? 3 : W < 128 ? 5 : 8; x.font = fs + 'px monospace';
    if (ay > 0 && ay < H) { x.strokeStyle = 'rgba(220,30,30,.9)'; x.beginPath(); x.moveTo(0, ay); x.lineTo(W, ay); x.stroke(); }
    x.fillStyle = 'rgba(220,30,30,.95)'; const cy = Math.min(H - 1, ay); x.fillRect(Math.max(0, ax - 4), cy, 9, 1); x.fillRect(Math.min(W - 1, ax), Math.max(0, cy - 4), 1, 5);
    if (p.head) { x.strokeStyle = 'rgba(30,90,240,.95)'; x.lineWidth = 1.2; x.beginPath(); x.arc(p.head[0], p.head[1], p.head[2] / 2, 0, 7); x.stroke(); x.fillStyle = 'rgba(30,90,240,.9)'; x.font = '4px monospace'; x.fillText('FACE', p.head[0] - 5, p.head[1] + 1); x.font = fs + 'px monospace'; }
    x.fillStyle = 'rgba(10,20,50,.9)'; let ty = fs + 1; const line = t => { x.fillText(t, 2, ty); ty += fs + 1; };
    line(`${name} ${W}x${H}`); if (p.tile) line(p.tile === 'x' ? '<-> repeats sideways' : 'repeats both ways'); if (p.opaque) line('opaque');
    if (p.note && !small) { const words = p.note.split(' '); let l = ''; for (const w of words) { if (x.measureText(l + ' ' + w).width > W - 6 && l) { line(l); l = w; } else l = l ? l + ' ' + w : w; } if (l) line(l); }
    return c.toDataURL('image/png');
  }, {name, zoom}));
  console.log('picture', name);
}
await browser.close();
