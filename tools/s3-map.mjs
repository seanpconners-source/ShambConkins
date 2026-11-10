#!/usr/bin/env node
// Map preview of a Sonic 3 engine act: the whole level drawn from its collision terrain and object list, cut into rows
// that fit a phone, with the route notes from the level's `marks`. Usage: node tools/s3-map.mjs → docs/sonic3/maps/zone1-act1.png
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACTS = {'zone1-act1': ['src/engines/s3/zone1.js', 'buildZone1Act1']};
const which = process.argv[2] || 'zone1-act1', [file, fn] = ACTS[which];
const mods = Object.fromEntries(['src/engines/s3/terrain.js', file].map(f => [f, fs.readFileSync(path.join(root, f), 'utf8')]));
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
const data = await page.evaluate(({mods, file, fn, which}) => {
  const cache = {}; const require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id])(e, require); return e; };
  const Z = require(file)[fn](), T = Z.T, L = T.L, SC = 3, ROWS = 3, PAD = 26;
  // the band of the level that holds anything
  let y0 = T.h, y1 = 0; for (let y = 0; y < T.h; y += 8) for (let x = 0; x < T.w; x += 64) if (!T.solid(x, y, 'a', true)) { if (y < y0) y0 = y; } 
  for (const o of Z.objs) { const oy = o.y ?? o.y0; y0 = Math.min(y0, oy - 80); y1 = Math.max(y1, oy + 60); }
  y0 = Math.max(0, Math.min(...Z.objs.map(o => (o.y ?? o.y0))) - 120); y1 = Math.min(T.h, y1 + 150);
  const x1 = Z.bounds.x1, rowW = Math.ceil(x1 / ROWS), over = 200, w = Math.ceil((rowW + over) / SC), h = Math.ceil((y1 - y0) / SC);
  const c = document.getElementById('c'); c.width = w; c.height = (h + PAD) * ROWS + 30; const x = c.getContext('2d');
  x.fillStyle = '#0b1230'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#fff'; x.font = 'bold 15px system-ui,sans-serif'; x.fillText(`${Z.zone} ZONE  ACT ${Z.act}   map preview (${x1} px long, 1 square = 256 px)`, 8, 19);
  const C = {sky: [86, 150, 240], all: [176, 106, 46], top: [88, 196, 40], a: [226, 170, 60], b: [190, 120, 220], one: [240, 220, 120]};
  for (let r = 0; r < ROWS; r++) {
    const X0 = r * rowW, oy = 30 + r * (h + PAD) + PAD - 6, img = x.createImageData(w, h), d = img.data;
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const wx = X0 + px * SC + 1, wy = y0 + py * SC + 1; let col = C.sky;
      if (wx > x1) col = [20, 26, 60];
      else if (L.all.get(wx, wy)) col = L.all.get(wx, wy - 7) ? C.all : C.top;
      else if (L.a.get(wx, wy)) col = C.a; else if (L.b.get(wx, wy)) col = C.b; else if (L.top.get(wx, wy)) col = C.one;
      else { const t = py / h; col = [86 + t * 80, 150 + t * 70, 240]; }
      const i = (py * w + px) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    x.putImageData(img, 0, oy);
    x.save(); x.beginPath(); x.rect(0, oy, w, h); x.clip(); x.translate(-X0 / SC, oy - y0 / SC); x.scale(1 / SC, 1 / SC);
    x.strokeStyle = 'rgba(255,255,255,.13)'; x.lineWidth = 2; for (let gx = Math.ceil(X0 / 256) * 256; gx < X0 + rowW + over; gx += 256) { x.beginPath(); x.moveTo(gx, y0); x.lineTo(gx, y1); x.stroke(); }
    for (let gyy = Math.ceil(y0 / 256) * 256; gyy < y1; gyy += 256) { x.beginPath(); x.moveTo(X0, gyy); x.lineTo(X0 + rowW + over, gyy); x.stroke(); }
    const dot = (px, py, r, col, ol = '#000') => { x.fillStyle = col; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.strokeStyle = ol; x.lineWidth = 2; x.stroke(); };
    const tag = (px, py, t, col = '#fff') => { x.font = 'bold 30px system-ui,sans-serif'; x.textAlign = 'center'; x.lineWidth = 7; x.strokeStyle = '#000'; x.strokeText(t, px, py); x.fillStyle = col; x.fillText(t, px, py); };
    for (const d of Z.decor || []) { if (d.type === 'cliff') { x.fillStyle = 'rgba(120,70,30,.75)'; if (d.legs) for (let k = 0; k < d.legs; k++) { const cx = d.x0 + 60 + (d.x1 - d.x0 - 120) * k / (d.legs - 1); x.fillRect(cx - 50, d.y, 100, d.y1 - d.y); } else x.fillRect(d.x0 + 4, d.y, d.x1 - d.x0 - 8, d.y1 - d.y); } if (d.type === 'land') { x.fillStyle = '#b06a2e'; x.fillRect(d.x0, d.y + 8, d.x1 - d.x0, d.depth - 8); x.fillStyle = '#58c428'; x.fillRect(d.x0, d.y, d.x1 - d.x0, 10); } if (d.type === 'lake') { x.fillStyle = 'rgba(60,140,255,.75)'; x.fillRect(d.x, d.y, d.w, d.h); } if (d.type === 'waterfall') { x.fillStyle = 'rgba(200,235,255,.9)'; x.fillRect(d.x, d.y, d.w, d.h); x.fillStyle = '#3a8af0'; for (let yy = d.y; yy < d.y + d.h; yy += 24) x.fillRect(d.x + 8, yy, d.w - 16, 10); }
      if (d.type === 'palm') { x.fillStyle = '#6a4420'; x.fillRect(d.x - 4, d.y - 70, 8, 70); x.fillStyle = '#2e9a2c'; x.beginPath(); x.ellipse(d.x, d.y - 74, 30, 12, 0, 0, 7); x.fill(); } }
    for (const o of Z.objs) switch (o.type) {
      case 'ring': dot(o.x, o.y, 6, '#ffd23a', '#8a5a00'); break;
      case 'spring': x.fillStyle = o.color === 'red' ? '#ff3030' : '#ffe030'; x.fillRect(o.x - 18, o.y - 14, 36, 22); x.strokeStyle = '#000'; x.lineWidth = 3; x.strokeRect(o.x - 18, o.y - 14, 36, 22);
        { const v = {up: [0, -1], ur: [.7, -.7], ul: [-.7, -.7], right: [1, 0], left: [-1, 0], down: [0, 1]}[o.dir] || [0, -1]; x.strokeStyle = '#fff'; x.lineWidth = 6; x.beginPath(); x.moveTo(o.x, o.y - 14); x.lineTo(o.x + v[0] * 70, o.y - 14 + v[1] * 70); x.stroke(); } break;
      case 'spikes': x.fillStyle = '#f0f0ff'; for (let k = -o.w / 2; k < o.w / 2; k += 16) { x.beginPath(); x.moveTo(o.x + k, o.y + 8); x.lineTo(o.x + k + 8, o.y - 14); x.lineTo(o.x + k + 16, o.y + 8); x.fill(); } break;
      case 'monitor': x.fillStyle = '#202030'; x.fillRect(o.x - 18, o.y - 18, 36, 36); x.fillStyle = {rings: '#ffd23a', life: '#ff60c0', fire: '#ff7a1a', bubble: '#58b8ff', lightning: '#fff06a', shoes: '#e8282c', star: '#fff'}[o.item] || '#aaa'; x.fillRect(o.x - 12, o.y - 12, 24, 24); tag(o.x, o.y - 26, o.item); break;
      case 'badnik': dot(o.x, o.y, 15, '#e02828', '#fff'); tag(o.x, o.y - 24, o.kind, '#ffb0b0'); break;
      case 'starpost': x.fillStyle = '#3070ff'; x.fillRect(o.x - 4, o.y - 30, 8, 54); dot(o.x, o.y - 36, 11, '#ff3030', '#fff'); break;
      case 'wall': x.fillStyle = '#9a8a7a'; x.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h); x.strokeStyle = '#000'; x.lineWidth = 3; x.strokeRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h); tag(o.x, o.y - 40, 'wall'); break;
      case 'platform': x.fillStyle = o.move === 'collapse' ? '#c08a50' : '#58c428'; x.fillRect(o.x - o.w / 2, o.y - 8, o.w, 16); x.strokeStyle = '#000'; x.lineWidth = 2; x.strokeRect(o.x - o.w / 2, o.y - 8, o.w, 16);
        if (o.move === 'h') { x.strokeStyle = '#fff'; x.setLineDash([10, 8]); x.beginPath(); x.moveTo(o.x - o.range, o.y + 16); x.lineTo(o.x + o.range, o.y + 16); x.stroke(); x.setLineDash([]); } break;
      case 'vine': x.strokeStyle = '#1e6e18'; x.lineWidth = 7; x.beginPath(); x.moveTo(o.x, o.y); x.lineTo(o.x, o.y + o.len); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 3; x.setLineDash([8, 8]); x.beginPath(); x.arc(o.x, o.y, o.len, Math.PI / 2 - (o.amp ?? .9), Math.PI / 2 + (o.amp ?? .9)); x.stroke(); x.setLineDash([]); break;
      case 'zipline': x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.moveTo(o.x0, o.y0); x.lineTo(o.x1, o.y1); x.stroke(); tag((o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2 - 16, 'zip line'); break;
      case 'tube': x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 4; x.setLineDash([14, 10]); x.strokeRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h); x.setLineDash([]); break;
      case 'sign': x.fillStyle = '#888'; x.fillRect(o.x - 4, o.y - 30, 8, 46); dot(o.x, o.y - 46, 26, '#1c38b8', '#ffd23a'); tag(o.x, o.y - 84, 'SIGN', '#ffe23a'); break;
    }
    dot(Z.start.x, Z.start.y, 16, '#3a78ff', '#fff'); if (r === 0) tag(Z.start.x + 20, Z.start.y - 34, 'START', '#9cc4ff');
    for (const [mx, t] of Z.marks || []) { x.font = 'bold 34px system-ui,sans-serif'; x.textAlign = 'center'; x.lineWidth = 8; x.strokeStyle = '#000'; x.strokeText(t, mx, y0 + 46); x.fillStyle = '#9cf0ff'; x.fillText(t, mx, y0 + 46); }
    x.restore();
    x.fillStyle = '#9fb0e8'; x.font = '12px system-ui,sans-serif'; x.textAlign = 'left'; x.fillText(`part ${r + 1} of ${ROWS}: x ${X0} to ${Math.min(x1, X0 + rowW)}${r < ROWS - 1 ? '  (continues below)' : ''}`, 8, oy - 6);
  }
  return c.toDataURL('image/png');
}, {mods, file, fn, which});
const out = path.join(root, 'docs/sonic3/maps'); fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, which + '.png'), Buffer.from(data.split(',')[1], 'base64'));
console.log('wrote', path.join('docs/sonic3/maps', which + '.png'));
await browser.close();
