#!/usr/bin/env node
// Exports a pinball table's painted art as one picture per drop-in slot (see src/engines/pinball/README.md),
// sized and framed exactly as the slot is drawn, so the owner can repaint them and drop them into
// assets/pinball/<table>/. Also writes playfield-guide.png (the whole table with every part) and
// playfield-parts.png (only what the game draws on top of a playfield picture, transparent elsewhere).
// The written guide (IMAGE-SPECS.txt, README.md) is hand-written per table next to the pictures.
// Usage: node tools/pinball-art-templates.mjs [--table buckethead|black-sabbath|king-gizzard] [--out docs/pinball-art/<table>]
// Needs Playwright (headless Chromium). Never write the output into assets/pinball/: the build would embed it.
import fs from 'node:fs';
import path from 'node:path';
import {launchBrowser, root} from '../tests/lib.mjs';

// Per table: its modules, the bumper and toy parts, the toy template size, and how the logo/hero pictures are framed
// (logo: drawn `mult` x `size` mm wide centred on (x,y); character: 110 mm wide, the point `frac` of the way down at y).
const TABLES = {
  buckethead: {table: 'src/engines/pinball/tables/buckethead.js', art: 'src/engines/pinball/tables/bucketheadArt.js',
    bumper: 'pop1', toy: 'giantRobot', toyPx: [400, 350], logo: {x: 236, y: 700, size: 21, mult: 13}, character: {x: 236, y: 820, frac: .4}},
  'black-sabbath': {table: 'src/engines/pinball/tables/sabbath.js', art: 'src/engines/pinball/tables/sabbathArt.js',
    bumper: 'pig1', toy: 'ironMan', toyPx: [336, 464], logo: {x: 236, y: 692, size: 24, mult: 12}, character: {x: 236, y: 830, frac: .45}},
  // no toy: the Rattlesnake is drawn by code every frame (it carries the ball), like the ramps
  'king-gizzard': {table: 'src/engines/pinball/tables/gizzard.js', art: 'src/engines/pinball/tables/gizzardArt.js',
    bumper: 'pop1', toy: null, logo: {x: 236, y: 712, size: 22, mult: 12}, character: {x: 236, y: 830, frac: .45}},
};
const arg = name => {const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null;};
const tableId = arg('--table') || 'buckethead', cfg = TABLES[tableId];
if (!cfg) {console.error(`Unknown table ${tableId}; known: ${Object.keys(TABLES).join(', ')}`); process.exit(1);}
const out = path.resolve(root, arg('--out') || `docs/pinball-art/${tableId}`);
fs.mkdirSync(out, {recursive: true});

// A tiny bundle of just the pinball modules (they only need each other and src/utils.js); no drop-ins loaded.
const STUB = {'src/data/userPortraits.js': 'Object.assign(exports,{USER_PORTRAITS:{}});'};
const mods = {}, want = ['src/engines/pinball/machine.js', 'src/engines/pinball/render.js', cfg.table, cfg.art];
while (want.length) {
  const id = want.pop();
  if (mods[id]) continue;
  mods[id] = STUB[id] ?? fs.readFileSync(path.join(root, id), 'utf8');
  for (const m of mods[id].matchAll(/require\("([^"]+)"\)/g)) want.push(m[1]);
}
const bundle = `const __m={${Object.entries(mods).map(([id, src]) => `${JSON.stringify(id)}:(exports,require)=>{\n${src}\n}`).join(',\n')}};
const __c={};window.require=id=>{if(__c[id])return __c[id];const e=__c[id]={};__m[id](e,window.require);return e;};`;

const browser = await launchBrowser();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.setContent(`<!doctype html><body><script>${bundle}</script></body>`);

const shots = await page.evaluate(cfg => {
  const {createMachine} = require('src/engines/pinball/machine.js');
  const {createRenderer, drawFlipper} = require('src/engines/pinball/render.js');
  const table = require(cfg.table);
  const {art, logo, drawCharacter} = require(cfg.art);
  const m = createMachine({table, players: 1, seed: 1});
  const def = m.def, res = {};
  const canvas = (w, h) => {const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')];};
  const png = c => c.toDataURL('image/png');
  // bounding box of the non-transparent pixels of a canvas
  const bbox = c => {const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 8) {if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;}
    return {x0, y0, x1: x1 + 1, y1: y1 + 1};};

  // playfield: everything art.base paints (a playfield picture replaces all of it: logo, hero art and signs included)
  {const k = 2, [c, x] = canvas(def.W * k, def.H * k); x.scale(k, k); art.base(x, def, {}); res.playfield = png(c);}

  // the full table at rest (k = 2 px/mm), drawn by the real renderer; withBase=false leaves the playfield transparent
  const table2 = withBase => {const R = createRenderer({def, art: withBase ? art : {...art, base: null}, imgs: {}});
    const dpr = 2, W = def.W, stripH = R.layout(W, 4000).stripH, H = stripH + def.H;
    R.cam.z = 1; R.cam.y = 0;
    const [c, x] = canvas(W * dpr, H * dpr);
    if (!withBase) {let first = true; const fr = x.fillRect; x.fillRect = function (...a) {if (first) {first = false; return;} return fr.apply(this, a);};}
    m.w.balls.length = 0;
    R.draw(x, {W, H, dpr, w: m.w, lamps: {}, t: 0, dmd: {paint() {}}});
    const [o, ox] = canvas(def.W * dpr, def.H * dpr); ox.drawImage(c, 0, stripH * dpr, def.W * dpr, def.H * dpr, 0, 0, def.W * dpr, def.H * dpr);
    return png(o);};
  res['playfield-guide'] = table2(true);
  res['playfield-parts'] = table2(false);

  // apron: the 448 x 187 mm box under the flippers (x 12..460, y 880..1067), transparent outside the apron shape
  {const k = 2, [c, x] = canvas(448 * k, 187 * k); x.scale(k, k); x.translate(-12, -880); art.over(x, def, {}); x.clearRect(460, 1050, 40, 17); res.apron = png(c);}

  // backglass: the intro card, 1200 x 1600
  {const [c, x] = canvas(1200, 1600); art.backglass(x, 0, 0, 1200, 1600, 0); res.backglass = png(c);}

  // logo: a picture is drawn mult x size mm wide centred on the logo spot; keep that frame, trimmed top/bottom
  {const L = cfg.logo, k = 4, wmm = L.size * L.mult, [c, x] = canvas(wmm * k, 160 * k); x.scale(k, k); x.translate(wmm / 2 - L.x, 80 - L.y); logo(x, L.x, L.y, L.size, null);
    const b = bbox(c), cy = 80 * k, half = Math.max(cy - b.y0, b.y1 - cy) + 4 * k, [o, ox] = canvas(c.width, 2 * half);
    ox.drawImage(c, 0, cy - half, c.width, 2 * half, 0, 0, c.width, 2 * half); res.logo = png(o);}

  // character: a picture is drawn 110 mm wide centred on x, with y at `frac` of its height
  {const C = cfg.character, k = 6, [c, x] = canvas(300 * k, 300 * k); x.scale(k, k); x.translate(150 - C.x, 150 - C.y); drawCharacter(x);
    const b = bbox(c), toMM = v => v / k - 150, by0 = toMM(b.y0) + C.y, by1 = toMM(b.y1) + C.y;
    res.characterBox = {bx0: toMM(b.x0) + C.x, bx1: toMM(b.x1) + C.x, by0, by1};
    const h = Math.max((C.y - by0) / C.frac, (by1 - C.y) / (1 - C.frac)) + 2, w = 110, top = C.y - C.frac * h;
    const [o, ox] = canvas(Math.round(w * k), Math.round(h * k)); ox.drawImage(c, (C.x - w / 2 - C.x + 150) * k, (top - C.y + 150) * k, w * k, h * k, 0, 0, o.width, o.height); res.character = png(o);}

  // bumper: the square picture is cut to the cap circle (r x .86 mm)
  {const p = def.parts[cfg.bumper], r = p.r, k = 256 / (2 * r * .86), [c, x] = canvas(256, 256); x.scale(k, k); x.translate(128 / k, 128 / k);
    art.bumperCap(x, {x: 0, y: 0}, r, false, 0, {}); res.bumper = png(c);}

  // toy: the picture is stretched to the toy's box; the painted toy is scaled to fit inside it
  // (its first fillRect, the painted drop shadow, is skipped: the game draws its own shadow under a toy picture)
  if (cfg.toy) {const p = def.parts[cfg.toy], k = 8, [c2, x2] = canvas(200 * k, 200 * k); x2.scale(k, k); const fr = x2.fillRect; let first = true;
    x2.fillRect = function (...a) {if (first) {first = false; return;} return fr.apply(this, a);};
    art.toy(x2, {x: 100, y: 100, w: p.w, h: p.h, ox: 0, oy: 0, flash: 0, armed: 0}, 0, {});
    const b = bbox(c2), bw = b.x1 - b.x0, bh = b.y1 - b.y0, [W, H] = cfg.toyPx, s = Math.min(W / bw, H / bh) * .98, [o, ox] = canvas(W, H);
    ox.drawImage(c2, b.x0, b.y0, bw, bh, (W - bw * s) / 2, (H - bh * s) / 2, bw * s, bh * s); res.toy = png(o);}

  // flippers: the painted bottom flippers in the flipper-left / flipper-right frame (600 x 200 px, pivot (120,100), end
  // (510,100); the right one points left from (480,100)) laid flat, so a picture drawn over the template lines up with the flipper
  {const low = Math.max(...def.flippers.map(f => f.y));
    for (const f of def.flippers.filter(f => f.y === low)) {const right = !!f.input, k = 390 / f.len, [c, x] = canvas(600, 200);
      x.translate(right ? 480 : 120, 100); x.scale(k, k);
      drawFlipper(x, {...f, x: 0, y: 0, a: right ? Math.PI : 0}, f.color || art.flipper, art.flipperRubber, art.flipperText || '');
      res[right ? 'flipper-right' : 'flipper-left'] = png(c);}}
  return res;
}, cfg);

const box = shots.characterBox; delete shots.characterBox;
for (const [name, url] of Object.entries(shots)) {
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  console.log(name + '.png');
}
console.log(`painted hero spans x ${box.bx0.toFixed(1)}..${box.bx1.toFixed(1)}, y ${box.by0.toFixed(1)}..${box.by1.toFixed(1)} mm (picture frame ${cfg.character.x - 55}..${cfg.character.x + 55})`);
if (errors.length) {console.error(errors.join('\n')); process.exitCode = 1;}
await Promise.race([browser.close(), new Promise(r => setTimeout(r, 5000))]);
process.exit(process.exitCode || 0);
