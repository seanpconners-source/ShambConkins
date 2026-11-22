// Template pictures for the Strands & Ladders drop-in art (slots in src/data/strandsArt.js; brief docs/art-for-gpt/STRANDS-ART.md).
// For every slot: <slot>-template.png at the exact size (guides: what goes where, what to keep calm) and <slot>-reference.png
// (what the game draws there today). Ladder vignettes share one template (deed-template.png), chute ones another.
// Usage: node tools/strands-templates.mjs [outDir]   (default docs/art-for-gpt/strands-templates)
//        node tools/strands-templates.mjs --standin <dir>  -> our drawn art saved as the real slot names (checks the drop-in path)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const si = process.argv.indexOf('--standin'), standin = si > 0;
const outDir = path.resolve(standin ? process.argv[si + 1] : (process.argv[2] || path.join(root, 'docs/art-for-gpt/strands-templates')));
fs.mkdirSync(outDir, {recursive: true});
const mods = {
  'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};',
  'src/data/strandsArt.js': fs.readFileSync(path.join(root, 'src/data/strandsArt.js'), 'utf8'),
  'src/engines/strandsDraw.js': fs.readFileSync(path.join(root, 'src/engines/strandsDraw.js'), 'utf8'),
};
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => {
  const cache = {};
  window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id])(e, window.require); return e; };
}, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
// draw(kind, slot, mode) in the page: mode 'template' | 'reference'
const render = (slot, mode) => page.evaluate(({slot, mode}) => {
  const A = require('src/data/strandsArt.js'), D = require('src/engines/strandsDraw.js'), S = A.SLOTS[slot.startsWith('deed-') ? 'deed-1' : slot.startsWith('slip-') ? 'slip-16' : slot] || A.SLOTS['deed-1'];
  const c = document.getElementById('c'); c.width = S.w; c.height = S.h; const x = c.getContext('2d'), W = S.w, H = S.h;
  x.clearRect(0, 0, W, H);
  const guide = (col = '#ff2a6a') => { x.strokeStyle = col; x.fillStyle = col; x.lineWidth = Math.max(2, W / 400); x.font = `700 ${Math.max(14, W / 40)}px sans-serif`; x.textBaseline = 'top'; x.textAlign = 'left'; };
  const label = (t, X, Y, col = '#ff2a6a') => { guide(col); x.fillStyle = 'rgba(255,255,255,.85)'; const w = x.measureText(t).width; x.fillRect(X - 4, Y - 2, w + 8, Math.max(14, W / 40) + 6); x.fillStyle = col; x.fillText(t, X, Y); };
  const n = +slot.split('-')[1];
  if (slot === 'board') {
    if (mode === 'reference') { D.drawBoard(x, 1, 0); return c.toDataURL('image/png'); }
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.globalAlpha = .35; D.drawBoardBase(x, 1, {numbers: false, labels: false}); x.globalAlpha = 1;
    guide(); x.strokeRect(A.BOARD.G0, A.BOARD.G0, A.BOARD.GS, A.BOARD.GS);
    for (let i = 1; i < 10; i++) { x.setLineDash([12, 10]); x.beginPath(); x.moveTo(A.BOARD.G0 + i * A.SQ, A.BOARD.G0); x.lineTo(A.BOARD.G0 + i * A.SQ, A.BOARD.G0 + A.BOARD.GS); x.stroke(); x.beginPath(); x.moveTo(A.BOARD.G0, A.BOARD.G0 + i * A.SQ); x.lineTo(A.BOARD.G0 + A.BOARD.GS, A.BOARD.G0 + i * A.SQ); x.stroke(); } x.setLineDash([]);
    for (let q = 1; q <= 100; q++) { const {row, col} = A.squareRC(q), X = A.BOARD.G0 + col * A.SQ, Y = A.BOARD.G0 + row * A.SQ;
      x.fillStyle = 'rgba(255,42,106,.18)'; x.fillRect(X + 4, Y + 4, A.SQ * .34, A.SQ * .26); x.fillStyle = '#ff2a6a'; x.font = `700 ${A.SQ * .17}px sans-serif`; x.fillText(String(q), X + 10, Y + 8); }
    x.globalAlpha = .5; for (const [a, b] of Object.entries(A.LADDERS)) D.drawLadder(x, +a, b, 1); for (const [a, b] of Object.entries(A.CHUTES)) D.drawChute(x, +a, b, 1, 0); x.globalAlpha = 1;
    label('FRAME (printed board edge)', A.BOARD.G0, 30);
    label('100 squares on the grid. NO numbers (pink corners stay plain)', A.BOARD.G0, A.BOARD.G0 + A.BOARD.GS + 8);
    label('NO ladders, NO chutes (the game draws them)', A.BOARD.G0 + A.BOARD.GS * .55, 30);
    return c.toDataURL('image/png');
  }
  if (slot === 'table' || slot === 'table-wide') {
    D.drawTable(x, W, H); if (mode === 'reference') return c.toDataURL('image/png');
    const wide = W > H, bs = wide ? H * .9 : W * .96, bx = wide ? 12 : (W - bs) / 2, by = wide ? (H - bs) / 2 : H * .1;
    guide(); x.strokeRect(bx, by, bs, bs); label('the board lies here (covers this)', bx + 10, by + 10);
    const sr = wide ? H * .2 : W * .2, sx = wide ? (bx + bs + W) / 2 : W / 2, sy = wide ? H - sr * 1.3 : by + bs + (H - by - bs) * .5;
    x.beginPath(); x.arc(sx, sy, sr, 0, 7); x.stroke(); label('spinner card', sx - sr * .6, sy - 10);
    label(wide ? 'player names + log here: keep it calm' : 'player names here: keep it calm', wide ? bx + bs + 20 : 20, wide ? 70 : by - 60);
    return c.toDataURL('image/png');
  }
  if (slot === 'ladder-tile') {
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    if (mode === 'reference') { x.clearRect(0, 0, W, H);
      for (const s2 of [-1, 1]) { x.fillStyle = '#4a5258'; x.fillRect(W / 2 + s2 * 64 - 14, 0, 28, H); x.fillStyle = '#e07a2a'; x.fillRect(W / 2 + s2 * 64 - 14, 0, 7, H); }
      x.fillStyle = '#2e353a'; x.fillRect(64, H / 2 - 9, 128, 18); return c.toDataURL('image/png'); }
    guide(); for (const xx of [64, 192]) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, H); x.stroke(); } x.setLineDash([8, 6]); x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke(); x.setLineDash([]);
    label('rails on the 2 lines', 70, 20); label('one rung', 70, H / 2 + 10); label('repeats up/down: top edge = bottom edge', 6, H - 30); return c.toDataURL('image/png');
  }
  if (slot === 'tar-tile') { const p = x.createPattern((() => { const cc = document.createElement('canvas'); cc.width = cc.height = 128; const g = cc.getContext('2d'); g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${60 + i % 3 * 20},${50 + i % 4 * 10},40,.25)`; g.beginPath(); g.arc((i * 37) % 128, (i * 53) % 128, 3 + i % 5, 0, 7); g.fill(); } return cc; })(), 'repeat'); x.fillStyle = p; x.fillRect(0, 0, W, H);
    if (mode === 'template') label('seamless on all 4 sides (it tiles along the chutes)', 6, 6, '#ff9ab0'); return c.toDataURL('image/png'); }
  if (slot === 'spinner-face' || slot === 'spinner-arrow') {
    if (mode === 'reference') { if (slot === 'spinner-face') { D.drawSpinner(x, W / 2, H / 2, W * .48, 0, {shadow: false, arrow: false}); }
      else { const cc = document.createElement('canvas'); cc.width = W; cc.height = H; D.drawSpinner(cc.getContext('2d'), W / 2, H / 2, W * .48, 0, {shadow: false}); x.save(); x.beginPath(); x.moveTo(W / 2, H * .05); x.lineTo(W * .58, H / 2); x.lineTo(W * .55, H * .7); x.lineTo(W * .45, H * .7); x.lineTo(W * .42, H / 2); x.closePath(); x.clip(); x.drawImage(cc, 0, 0); x.restore(); }
      return c.toDataURL('image/png'); }
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); guide(); const R = W * .48; x.beginPath(); x.arc(W / 2, H / 2, R, 0, 7); x.stroke();
    x.beginPath(); x.moveTo(W / 2 - 20, H / 2); x.lineTo(W / 2 + 20, H / 2); x.moveTo(W / 2, H / 2 - 20); x.lineTo(W / 2, H / 2 + 20); x.stroke(); label('PIVOT (centre)', W / 2 + 24, H / 2 + 6);
    if (slot === 'spinner-face') { for (let i = 0; i < 6; i++) { const a0 = -Math.PI / 2 + (i - .5) * Math.PI / 3, am = a0 + Math.PI / 6; x.beginPath(); x.moveTo(W / 2, H / 2); x.lineTo(W / 2 + Math.cos(a0) * R, H / 2 + Math.sin(a0) * R); x.stroke(); x.font = `900 ${W * .1}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,42,106,.6)'; x.fillText(String(i + 1), W / 2 + Math.cos(am) * R * .62, H / 2 + Math.sin(am) * R * .62); }
      label('6 equal slices, 1 centred at the top, 2-6 clockwise. Circle fills the square; corners transparent.', 10, 10); }
    else { x.strokeStyle = 'rgba(255,42,106,.6)'; x.beginPath(); x.moveTo(W / 2, H * .08); x.lineTo(W * .56, H * .5); x.lineTo(W * .53, H * .68); x.lineTo(W * .47, H * .68); x.lineTo(W * .44, H * .5); x.closePath(); x.stroke(); label('arrow points STRAIGHT UP, tip inside the circle, turns on the pivot. Transparent background.', 10, 10); }
    return c.toDataURL('image/png');
  }
  if (slot === 'pawn-p1' || slot === 'pawn-p2') { const i = slot === 'pawn-p2' ? 1 : 0;
    if (mode === 'reference') { D.drawPawn(x, i, W / 2, H * .97, H); return c.toDataURL('image/png'); }
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.globalAlpha = .3; D.drawPawn(x, i, W / 2, H * .97, H); x.globalAlpha = 1; guide();
    x.beginPath(); x.arc(A.PAWN_HEAD.x, A.PAWN_HEAD.y, A.PAWN_HEAD.d / 2, 0, 7); x.stroke(); label('player face goes here (leave empty)', 4, 8);
    x.beginPath(); x.ellipse(W / 2, H * .95, W * .4, H * .05, 0, 0, 7); x.stroke(); label('feet / plastic base at the bottom', 4, H - 40); return c.toDataURL('image/png'); }
  if (slot === 'logo') { if (mode === 'reference') { D.drawLogo(x, W / 2, H * .45, W * .95); return c.toDataURL('image/png'); }
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); guide(); x.strokeRect(W * .04, H * .08, W * .92, H * .84); label('STRANDS & LADDERS (+ small line "A Death Stranding board game"), inside the box, transparent background', W * .05, H * .1); return c.toDataURL('image/png'); }
  if (slot === 'card') { if (mode === 'reference') { D.drawCard(x, W / 2, H / 2, W, 1, {line1: 'Rebuilt the river bridge', line2: 'Porters left you 1,000 Likes', ladder: true}); return c.toDataURL('image/png'); }
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); guide(); x.beginPath(); x.arc(256, 256, 192, 0, 7); x.stroke(); label('picture window', 140, 460);
    x.strokeRect(512, 70, 470, 470); label('text area: keep plain + light', 520, 80); x.strokeRect(26, H - 133, W - 52, 108); label('banner: CLIMB TO 38 / SLIDE TO 6 printed here', 40, H - 120); return c.toDataURL('image/png'); }
  // vignettes
  if (mode === 'reference') { D.drawVignette(x, W / 2, H / 2, W * .48, n, {ring: false}); return c.toDataURL('image/png'); }
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); guide(); x.beginPath(); x.arc(W / 2, H / 2, W * .48, 0, 7); x.stroke(); label('shown in a circle: keep the subject inside', 8, 8); return c.toDataURL('image/png');
}, {slot, mode});
const A = await page.evaluate(() => Object.keys(require('src/data/strandsArt.js').SLOTS));
if (standin) { for (const slot of A) save(slot, await render(slot, 'reference')); }
else {
  for (const slot of A) {
    const share = slot.startsWith('deed-') ? 'deed' : slot.startsWith('slip-') ? 'slip' : null;
    if (share && slot !== 'deed-1' && slot !== 'slip-16') { save(slot + '-reference', await render(slot, 'reference')); continue; }
    save((share || slot) + '-template', await render(slot, 'template'));
    save(slot + '-reference', await render(slot, 'reference'));
  }
}
await browser.close();
console.log((standin ? 'stand-ins' : 'templates') + ' ->', outDir);
