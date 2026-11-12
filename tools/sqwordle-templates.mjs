#!/usr/bin/env node
// Template pictures for the Sqwordle drop-in art (src/engines/sqwordleArt.js; brief docs/art-for-gpt/SQWORDLE-ART.md),
// one PNG per slot at its real size, transparent:
//  - body-<pose>: the turtle's whole body for one move, facing RIGHT. Red line = the ground (feet stand on it, bottom middle
//    = red cross), blue ring = the mouth (water comes out here), cyan ring = the eye (tears / sweat), dashed box = keep the
//    body inside it, faint grey = our drawn version for size and pose only.
//  - mascot-think: a head (blue circle = where the face goes, like the other mascot pictures).
//  - fx-*: effects, with the direction they're used in; fx-jet/fx-hydro must join up left to right (they're repeated along
//    the stream), fx-drop falls tip up.
//  - bg / bg-dark / bg-wide / bg-wide-dark: whole-screen backgrounds; the shaded boxes are where the game's grid and keyboard
//    sit (covered by a frosted panel), so the interesting parts belong around them.
// Usage: node tools/sqwordle-templates.mjs [outDir]   (default docs/art-for-gpt/sqwordle-templates)
//        node tools/sqwordle-templates.mjs --standin <dir>  → our drawn art in every body/fx slot (no guides), to check the
//        drop-in path: copy into assets/sqwordle/, build, play, then remove.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const si = process.argv.indexOf('--standin'), standin = si > 0;
const outDir = path.resolve(standin ? process.argv[si + 1] : (process.argv[2] || path.join(root, 'docs/art-for-gpt/sqwordle-templates')));
fs.mkdirSync(outDir, {recursive: true});
const mods = {
  'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};',
  'src/engines/sqwordleArt.js': fs.readFileSync(path.join(root, 'src/engines/sqwordleArt.js'), 'utf8'),
};
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => {
  const cache = {};
  window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id])(e, window.require); return e; };
}, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
const POSES = ['idle', 'aim', 'blow', 'brace', 'shell', 'cheer', 'phew', 'sad'];
const NOTE = {idle: 'standing, calm, happy', aim: 'WATER GUN: leaning forward, lips pursed to squirt', blow: 'BUBBLE BEAM: cheeks puffed, blowing bubbles',
  brace: 'HYDRO PUMP: feet planted wide, mouth wide open, bracing', shell: 'WITHDRAW: only the shell, head/arms/legs/tail pulled in',
  cheer: 'cheering, both arms up, jumping for joy', phew: 'PHEW: wiping its brow with one hand, relieved', sad: 'sad, crying, arms down'};
for (const pose of POSES) {
  const data = await page.evaluate(({pose, note, standin}) => {
    const A = require('src/engines/sqwordleArt.js'), S = 768, c = document.getElementById('c'); c.width = S; c.height = S;
    const x = c.getContext('2d'); x.clearRect(0, 0, S, S);
    const h = S * .9, fy = S * .96;
    if (standin) { A.drawBody(x, pose, S / 2, fy, h, 1, .3); return c.toDataURL('image/png'); }
    x.strokeStyle = 'rgba(0,0,0,.08)'; x.lineWidth = 1; for (let k = 0; k <= S; k += 48) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, S); x.moveTo(0, k); x.lineTo(S, k); x.stroke(); }
    x.save(); x.globalAlpha = .28; x.filter = 'grayscale(1)'; const pt = A.drawBody(x, pose, S / 2, fy, h, 1, .3); x.restore();
    x.setLineDash([10, 8]); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.strokeRect(S * .05, fy - h, S * .9, h); x.setLineDash([]);
    x.strokeStyle = '#e02020'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, fy); x.lineTo(S, fy); x.stroke();
    x.beginPath(); x.moveTo(S / 2 - 16, fy); x.lineTo(S / 2 + 16, fy); x.moveTo(S / 2, fy - 16); x.lineTo(S / 2, fy + 16); x.stroke();
    const ring = (p, col, r) => { x.strokeStyle = col; x.lineWidth = 4; x.beginPath(); x.arc(p.x, p.y, r, 0, Math.PI * 2); x.stroke(); };
    ring(pt.mouth, '#1e6fd9', 16); if (pose !== 'shell') ring(pt.eye, '#18b8c8', 11);
    x.fillStyle = 'rgba(0,0,0,.6)'; x.font = 'bold 22px Arial'; x.textBaseline = 'top'; x.fillText('body-' + pose + '  →  faces RIGHT', 14, 10);
    x.font = '18px Arial'; x.fillText(note, 14, 38);
    x.fillStyle = '#1e6fd9'; x.fillText('blue ring = mouth', 14, S - 60); x.fillStyle = '#18b8c8'; if (pose !== 'shell') x.fillText('cyan = eye', 200, S - 60);
    x.fillStyle = '#e02020'; x.fillText('red = ground, feet here', 330, S - 60);
    return c.toDataURL('image/png');
  }, {pose, note: NOTE[pose], standin});
  save('body-' + pose, data);
}
// effects + the think head
const FX = [['fx-jet', 512, 128], ['fx-hydro', 512, 256], ['fx-bubble', 256, 256], ['fx-drop', 128, 128], ['fx-splash', 512, 512], ['fx-rainbow', 1024, 512], ['fx-sparkle', 256, 256], ['mascot-think', 512, 512]];
for (const [name, W, H] of FX) {
  const data = await page.evaluate(({name, W, H, standin}) => {
    const A = require('src/engines/sqwordleArt.js'), c = document.getElementById('c'); c.width = W; c.height = H; const x = c.getContext('2d'); x.clearRect(0, 0, W, H);
    const art = () => {
      if (name === 'fx-jet' || name === 'fx-hydro') { const w = name === 'fx-hydro' ? H * .95 : H * .9; A.stream(x, {x: -40, y: H / 2}, {x: W + 40, y: H / 2}, w, 1, 0, false); }
      else if (name === 'fx-bubble') A.bubble(x, W / 2, H / 2, W * .44);
      else if (name === 'fx-drop') A.drop(x, {x: W / 2, y: H * .55, vx: 0, vy: 1, r: H * .3});
      else if (name === 'mascot-think') A.mascot(x, W / 2, H * .44, W * .36, 'think', .3);
      else if (name === 'fx-splash' || name === 'fx-rainbow' || name === 'fx-sparkle') { /* drawn below with the module's own code via a tiny show */
        const k = name === 'fx-splash' ? 'burst' : name; const ctx = x;
        if (name === 'fx-splash') { ctx.strokeStyle = 'rgba(90,175,240,.9)'; ctx.lineWidth = W * .04; ctx.beginPath(); ctx.arc(W / 2, H / 2, W * .33, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(170,225,255,.85)'; for (let q = 0; q < 10; q++) { const a = q / 10 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(W / 2 + Math.cos(a) * W * .42, H / 2 + Math.sin(a) * W * .42, W * .035, W * .08, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill(); } }
        else if (name === 'fx-rainbow') { ctx.lineWidth = W * .03; ['#ff5a5a', '#ffa34d', '#ffe14d', '#6ad46a', '#4da6ff', '#8a6dff'].forEach((col, i) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(W / 2, H, W * .48 * (1 - i * .06), Math.PI, 0); ctx.stroke(); }); }
        else { ctx.fillStyle = '#fff6b0'; ctx.beginPath(); for (let q = 0; q < 8; q++) { const a = q * Math.PI / 4, rr = q % 2 ? W * .14 : W * .46; ctx.lineTo(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); } }
    };
    if (standin) { art(); return c.toDataURL('image/png'); }
    x.save(); x.globalAlpha = .3; x.filter = 'grayscale(1)'; art(); x.restore();
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.setLineDash([8, 6]); x.strokeRect(1, 1, W - 2, H - 2); x.setLineDash([]);
    x.fillStyle = 'rgba(0,0,0,.65)'; x.font = `bold ${Math.max(12, Math.min(22, W / 18))}px Arial`; x.textBaseline = 'top';
    const tip = {'fx-jet': 'water stream flowing → ; left and right edges must join (repeated)', 'fx-hydro': 'THICK blast stream → ; edges join left/right',
      'fx-bubble': 'one soap-like bubble', 'fx-drop': 'one droplet, pointed end UP, round end down', 'fx-splash': 'impact splash burst, centred',
      'fx-rainbow': 'rainbow arc, ends on the bottom edge', 'fx-sparkle': 'one star sparkle', 'mascot-think': 'head, puzzled (one brow up, eyes up)'}[name];
    x.fillText(name, 8, 6); if (H >= 200) { x.font = `${Math.max(11, Math.min(18, W / 26))}px Arial`; x.fillText(tip, 8, 32); }
    if (name === 'fx-jet' || name === 'fx-hydro') { x.strokeStyle = '#e02020'; x.lineWidth = 3; x.beginPath(); x.moveTo(1.5, 0); x.lineTo(1.5, H); x.moveTo(W - 1.5, 0); x.lineTo(W - 1.5, H); x.stroke(); }
    return c.toDataURL('image/png');
  }, {name, W, H, standin});
  save(name, data);
}
// backgrounds: where the grid and keyboard sit (390x780 phone / 844x390 landscape layouts, scaled)
if (!standin) for (const [name, W, H] of [['bg', 1080, 1920], ['bg-wide', 1920, 1080]]) {
  const data = await page.evaluate(({name, W, H}) => {
    const c = document.getElementById('c'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = '#9fd3f2'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(0,0,0,.08)'; for (let k = 0; k < Math.max(W, H); k += 60) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, H); x.moveTo(0, k); x.lineTo(W, k); x.stroke(); }
    const box = (X, Y, w, h, label) => { x.fillStyle = 'rgba(255,255,255,.75)'; x.fillRect(X, Y, w, h); x.strokeStyle = '#333'; x.lineWidth = 3; x.strokeRect(X, Y, w, h);
      x.fillStyle = '#333'; x.font = `bold ${Math.round(W / 30)}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, X + w / 2, Y + h / 2); };
    x.fillStyle = 'rgba(30,30,30,.85)'; const tall = H > W;
    if (tall) { const k = W / 390; x.fillRect(0, 0, W, 50 * k); box(30 * k, 82 * k, 330 * k, 360 * k, 'word grid (frosted panel)'); box(4 * k, 548 * k, 382 * k, 196 * k, 'keyboard (frosted)'); }
    else { const k = H / 390; x.fillRect(0, 0, W, 50 * k); box(W * .25 - 140 * k, 74 * k, 280 * k, 300 * k, 'word grid'); box(W * .52, 120 * k, W * .46, 200 * k, 'keyboard'); }
    x.fillStyle = '#fff'; x.font = `bold ${Math.round(W / 34)}px Arial`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('title bar (solid)', 20, (tall ? W / 390 : H / 390) * 25);
    x.fillStyle = '#123'; x.font = `${Math.round(W / 40)}px Arial`; x.textAlign = 'center'; x.fillText(name + '  ' + W + 'x' + H + '  (cropped to fit each phone; keep the edges interesting)', W / 2, H - W / 40);
    return c.toDataURL('image/png');
  }, {name, W, H});
  save(name, data);
}
await browser.close();
console.log('templates →', outDir);
