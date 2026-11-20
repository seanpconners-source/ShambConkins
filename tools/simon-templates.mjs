// Template pictures for the Simon drop-in art (src/engines/simonArt.js; brief docs/art-for-gpt/SIMON-ART.md).
//  simon-template.png       1024x1024: the toy's circle, pad edges, centre console and the black cross as guides over our drawing
//  simon-reference-<pad>.png our drawn toy with that pad lit (what the game shows until the owner's pictures are in)
//  bg-template.png 1080x1920, bg-wide-template.png 1920x1080: where the toy sits and the screen corners the game uses
// Usage: node tools/simon-templates.mjs [outDir]   (default docs/art-for-gpt/simon-templates)
//        node tools/simon-templates.mjs --standin <dir>  -> our drawn art as simon-dim/-green/... (to check the drop-in path)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const si = process.argv.indexOf('--standin'), standin = si > 0;
const outDir = path.resolve(standin ? process.argv[si + 1] : (process.argv[2] || path.join(root, 'docs/art-for-gpt/simon-templates')));
fs.mkdirSync(outDir, {recursive: true});
const mods = {
  'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};',
  'src/engines/simonArt.js': fs.readFileSync(path.join(root, 'src/engines/simonArt.js'), 'utf8'),
};
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => {
  const cache = {};
  window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id])(e, window.require); return e; };
}, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
const PADS = ['dim', 'green', 'red', 'yellow', 'blue'];
for (const pad of PADS) {
  if (!standin && pad === 'dim') continue;
  save((standin ? 'simon-' : 'simon-reference-') + pad, await page.evaluate(({pad}) => {
    const A = require('src/engines/simonArt.js'), S = A.TEMPLATE, c = document.getElementById('c'); c.width = S; c.height = S;
    const x = c.getContext('2d'); x.clearRect(0, 0, S, S);
    A.drawToyShape(x, S / 2, S / 2, A.BODY, A.NAMES.map(n => n === pad), 0); return c.toDataURL('image/png');
  }, {pad}));
}
if (!standin) {
  save('simon-template', await page.evaluate(() => {
    const A = require('src/engines/simonArt.js'), S = A.TEMPLATE, R = A.BODY, G = A.G, c = document.getElementById('c'); c.width = S; c.height = S;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, S, S);
    x.save(); x.globalAlpha = .3; A.drawToyShape(x, S / 2, S / 2, R, [0, 0, 0, 0], 0); x.restore();
    const ring = (r, col, w = 3, dash) => { x.setLineDash(dash || []); x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.arc(S / 2, S / 2, r, 0, 7); x.stroke(); x.setLineDash([]); };
    ring(R, '#e02020', 4); ring(R * G.padOut, '#1e6fd9', 3, [12, 8]); ring(R * G.padIn, '#1e6fd9', 3, [12, 8]); ring(R * G.disc, '#18a848', 3);
    x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 2; x.setLineDash([6, 6]); const g = R * G.gap / 2;
    for (const d of [-g, g]) { x.beginPath(); x.moveTo(S / 2 + d, S / 2 - R); x.lineTo(S / 2 + d, S / 2 + R); x.moveTo(S / 2 - R, S / 2 + d); x.lineTo(S / 2 + R, S / 2 + d); x.stroke(); }
    x.setLineDash([]);
    x.fillStyle = 'rgba(0,0,0,.75)'; x.font = 'bold 26px Arial'; x.textBaseline = 'top'; x.fillText('SIMON 1024 x 1024 — seen straight from above', 14, 8);
    x.font = '19px Arial'; x.fillStyle = '#e02020'; x.fillText('red = outside edge of the toy (diameter 962 px, centred)', 14, S - 98);
    x.fillStyle = '#1e6fd9'; x.fillText('blue dashed = outer and inner edge of the four coloured pads', 14, S - 72);
    x.fillStyle = '#18a848'; x.fillText('green = the black centre console', 14, S - 46);
    x.fillStyle = '#333'; x.fillText('dashed black = the black cross between the pads', 14, S - 22);
    x.font = 'bold 24px Arial'; x.textAlign = 'center';
    [['GREEN', .3, .3], ['RED', .7, .3], ['YELLOW', .3, .7], ['BLUE', .7, .7]].forEach(([t, u, v]) => { x.fillStyle = '#000'; x.fillText(t, S * u, S * v); });
    return c.toDataURL('image/png');
  }));
  for (const [name, W, H] of [['bg-template', 1080, 1920], ['bg-wide-template', 1920, 1080]]) save(name, await page.evaluate(({W, H}) => {
    const A = require('src/engines/simonArt.js'), c = document.getElementById('c'); c.width = W; c.height = H; const x = c.getContext('2d');
    const wide = W > H, R = wide ? H * .4 : W * .47, cx = W / 2, cy = wide ? H * .54 : H * .55;
    A.paintRoom(x, W, H, cx, cy, R); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, 0, W, H);
    x.save(); x.globalAlpha = .55; A.drawToyShape(x, cx, cy, R, [0, 0, 0, 0], 0); x.restore();
    x.strokeStyle = '#e02020'; x.lineWidth = 6; x.setLineDash([18, 12]); x.beginPath(); x.arc(cx, cy, R * 1.08, 0, 7); x.stroke();
    const box = (bx, by, bw, bh, t) => { x.strokeStyle = '#1e6fd9'; x.strokeRect(bx, by, bw, bh); x.fillStyle = '#1e6fd9'; x.font = 'bold 30px Arial'; x.textAlign = 'center'; x.fillText(t, bx + bw / 2, by + bh / 2); };
    const f = wide ? 200 : 190;
    if (wide) { box(40, H * .42 - f / 2, f + 60, f + 60, 'player 1'); box(W - f - 100, H * .42 - f / 2, f + 60, f + 60, 'player 2'); box(W / 2 - 200, 30, 400, 70, 'score'); }
    else { box(30, 140, f, f + 60, 'player 1'); box(W - f - 30, 140, f, f + 60, 'player 2'); box(W / 2 - 220, 150, 440, 80, 'score'); box(W - 330, 20, 310, 100, 'Pause / Exit'); }
    x.setLineDash([]); x.fillStyle = 'rgba(0,0,0,.8)'; x.font = 'bold 34px Arial'; x.textAlign = 'left';
    x.fillText(`${W} x ${H}: a 90s kid's bedroom FLOOR seen from straight above.`, 30, H - 80);
    x.fillText('The Simon covers the red circle; keep the corner boxes calm.', 30, H - 36);
    return c.toDataURL('image/png');
  }, {W, H}));
}
await browser.close();
console.log('templates in ' + outDir);
