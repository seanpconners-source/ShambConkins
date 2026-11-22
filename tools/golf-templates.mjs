// Template pictures for Shooter McGavin's Pro Tour art (slots in src/data/golfSprites.js; brief docs/art-for-gpt/GOLF-ART.md).
// For every slot: <slot>-template.png at the exact size (pink guides) and <slot>-reference.png (what the game draws today).
// Usage: node tools/golf-templates.mjs [outDir]   (default docs/art-for-gpt/golf-templates)
//        node tools/golf-templates.mjs --standin <dir>  -> our drawn art under the real slot names (checks the drop-in path)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const si = process.argv.indexOf('--standin'), standin = si > 0;
const outDir = path.resolve(standin ? process.argv[si + 1] : (process.argv[2] || path.join(root, 'docs/art-for-gpt/golf-templates')));
fs.mkdirSync(outDir, {recursive: true});
const mods = {'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};'};
for (const f of ['src/data/golfSprites.js', 'src/engines/golf/courses.js', 'src/engines/golf/art.js']) mods[f] = fs.readFileSync(path.join(root, f), 'utf8');
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => { const cache = {}; window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e; }; }, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
const render = (slot, mode) => page.evaluate(({slot, mode}) => {
  const GS = require('src/data/golfSprites.js'), A = require('src/engines/golf/art.js'), S = GS.SLOTS[slot], W = S.w, H = S.h;
  const c = document.getElementById('c'); c.width = W; c.height = H; const x = c.getContext('2d'); x.clearRect(0, 0, W, H);
  const pink = '#ff2a6a', label = (t, X, Y, size = Math.max(14, W / 50)) => { x.font = `700 ${size}px sans-serif`; x.textBaseline = 'top'; const w = x.measureText(t).width; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(X - 3, Y - 2, w + 6, size + 6); x.fillStyle = pink; x.fillText(t, X, Y); };
  const faded = fn => { if (mode === 'template') { x.save(); x.globalAlpha = .35; fn(); x.restore(); } else fn(); };
  x.strokeStyle = pink; x.lineWidth = 3;
  if (slot.startsWith('golfer-')) { const i = slot.endsWith('2') ? 1 : 0, F = GS.GOLFER;
    for (let f = 0; f < F.frames.length; f++) { x.save(); x.translate(f * F.w, 0); faded(() => A.drawGolferFrame(x, f, i ? '#2f6fd6' : '#d43a3a', i ? '#8a8f96' : '#c9b48a'));
      if (mode === 'template') { const [hx, hy, hd] = F.head[f]; x.strokeStyle = pink; x.lineWidth = 2; x.strokeRect(1, 1, F.w - 2, F.h - 2); x.beginPath(); x.arc(hx, hy, hd / 2, 0, 6.28); x.stroke(); x.beginPath(); x.arc(F.feet[0], F.feet[1], 6, 0, 6.28); x.stroke(); label(F.frames[f], 6, 6, 14); }
      x.restore(); }
    if (mode === 'template') label('HEADLESS body (the face goes in the circle). Feet on the dot. 10 frames left to right.', 6, H - 26, 16);
    return c.toDataURL('image/png'); }
  if (slot.startsWith('tree-')) { faded(() => A.drawTree(x, slot.slice(5), W, H)); if (mode === 'template') { x.beginPath(); x.arc(256, 760, 8, 0, 6.28); x.stroke(); label('trunk base here (bottom centre); transparent around', 8, 8); } return c.toDataURL('image/png'); }
  if (slot.startsWith('sky-')) { faded(() => A.drawSky(x, slot.slice(4), W, H)); if (mode === 'template') { x.beginPath(); x.moveTo(0, 400); x.lineTo(W, 400); x.stroke(); label('HORIZON (y 400): far hills/mesas sit on it. Wraps left edge = right edge.', 8, 8); } return c.toDataURL('image/png'); }
  if (slot === 'ground-detail') { const p = A.detailCanvas(); faded(() => { for (let yy = 0; yy < H; yy += p.height) for (let xx = 0; xx < W; xx += p.width) x.drawImage(p, xx, yy); }); if (mode === 'template') label('seamless, mid grey: multiplied over every grass colour', 8, 8); return c.toDataURL('image/png'); }
  if (slot === 'water') { const p = A.waterCanvas(); faded(() => { for (let yy = 0; yy < H; yy += p.height) for (let xx = 0; xx < W; xx += p.width) x.drawImage(p, xx, yy); }); if (mode === 'template') label('seamless ripples, light (tinted blue by the game)', 8, 8); return c.toDataURL('image/png'); }
  if (slot === 'flag') { faded(() => x.drawImage(A.flagCanvas(), 0, 0, W, H)); if (mode === 'template') { x.beginPath(); x.moveTo(2, 0); x.lineTo(2, H); x.stroke(); label('pole side (left edge)', 8, H - 26); } return c.toDataURL('image/png'); }
  if (slot === 'trackball') { faded(() => A.drawTrackball(x, W / 2, H / 2, W * .43, 0, 0)); if (mode === 'template') { x.beginPath(); x.arc(W / 2, H / 2, W * .43, 0, 6.28); x.stroke(); x.beginPath(); x.arc(W / 2, H / 2, W * .5, 0, 6.28); x.stroke(); label('ball inside the inner circle, chrome ring to the outer', 8, 8); } return c.toDataURL('image/png'); }
  if (slot === 'control-panel') { const R = W / 4.5; faded(() => A.drawPanel(x, W / 2, H / 2, R, {club: 'DRIVER', hint: 'ROLL DOWN · THEN UP'}));
    if (mode === 'template') { x.strokeStyle = pink; x.lineWidth = 4; x.beginPath(); x.arc(W / 2, H / 2, R * 1.16, 0, 6.28); x.stroke(); x.beginPath(); x.arc(W / 2, H / 2, R * 1.89, 0, 6.28); x.setLineDash([12, 10]); x.stroke(); x.setLineDash([]);
     label('trackball sits here (game draws it)', W / 2 - 260, H / 2 - 20, 30); label('arrows + words are drawn by the game ON TOP: keep this band plain', 40, 40, 30); } return c.toDataURL('image/png'); }
  if (slot === 'logo') { faded(() => A.drawLogo(x, W / 2, H / 2, W * .9)); if (mode === 'template') { x.strokeRect(W * .04, H * .06, W * .92, H * .88); label("SHOOTER McGAVIN'S / PRO TOUR, transparent background", 12, 12, 26); } return c.toDataURL('image/png'); }
  if (slot === 'title-bg') { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6aa7e6'); g.addColorStop(.55, '#cfe6ff'); g.addColorStop(.56, '#4f8f46'); g.addColorStop(1, '#2a5a2a'); faded(() => { x.fillStyle = g; x.fillRect(0, 0, W, H); });
    if (mode === 'template') { x.strokeRect(W * .2, H * .06, W * .6, H * .26); label('logo + course cards go over the middle: keep it calm there', W * .22, H * .08, 26); } return c.toDataURL('image/png'); }
  if (slot === 'tee-marker') { faded(() => { x.fillStyle = '#f0c828'; x.beginPath(); x.arc(64, 70, 42, 0, 6.28); x.fill(); }); if (mode === 'template') label('sits on the ground (bottom)', 4, 4, 12); return c.toDataURL('image/png'); }
  if (slot === 'cup') { faded(() => { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(128, 128, 110, 60, 0, 0, 6.28); x.fill(); x.fillStyle = '#080808'; x.beginPath(); x.ellipse(128, 128, 90, 46, 0, 0, 6.28); x.fill(); }); return c.toDataURL('image/png'); }
  return c.toDataURL('image/png');
}, {slot, mode});
const slots = await page.evaluate(() => Object.keys(require('src/data/golfSprites.js').SLOTS));
for (const slot of slots) { if (standin) save(slot, await render(slot, 'reference')); else { save(slot + '-template', await render(slot, 'template')); save(slot + '-reference', await render(slot, 'reference')); } }
await browser.close();
console.log((standin ? 'stand-ins' : 'templates') + ' ->', outDir, slots.length, 'slots');
