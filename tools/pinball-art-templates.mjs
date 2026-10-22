#!/usr/bin/env node
// Exports the Bucketheadland table's painted art as one picture per drop-in slot (see src/engines/pinball/README.md),
// sized and framed exactly as the slot is drawn, so the owner can repaint them and drop them into
// assets/pinball/buckethead/. Also writes playfield-guide.png (the whole table with every part) and
// playfield-parts.png (only what the game draws on top of a playfield picture, transparent elsewhere).
// Usage: node tools/pinball-art-templates.mjs [--out docs/pinball-art/buckethead]
// Needs Playwright (headless Chromium). Never write the output into assets/pinball/: the build would embed it.
import fs from 'node:fs';
import path from 'node:path';
import {launchBrowser, root} from '../tests/lib.mjs';

const argOut = process.argv.indexOf('--out');
const out = path.resolve(root, argOut > 0 ? process.argv[argOut + 1] : 'docs/pinball-art/buckethead');
fs.mkdirSync(out, {recursive: true});

// A tiny bundle of just the pinball modules (they only need each other and src/utils.js); no drop-ins loaded.
const STUB = {'src/data/userPortraits.js': 'Object.assign(exports,{USER_PORTRAITS:{}});'};
const mods = {}, want = ['src/engines/pinball/machine.js', 'src/engines/pinball/render.js', 'src/engines/pinball/tables/buckethead.js', 'src/engines/pinball/tables/bucketheadArt.js'];
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

const shots = await page.evaluate(() => {
  const {createMachine} = require('src/engines/pinball/machine.js');
  const {createRenderer} = require('src/engines/pinball/render.js');
  const table = require('src/engines/pinball/tables/buckethead.js');
  const {art, buckethead, logo} = require('src/engines/pinball/tables/bucketheadArt.js');
  const m = createMachine({table, players: 1, seed: 1});
  const def = m.def, res = {}, TAU = Math.PI * 2;
  const canvas = (w, h) => {const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')];};
  const png = c => c.toDataURL('image/png');
  // bounding box of the non-transparent pixels of a canvas
  const bbox = c => {const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 8) {if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;}
    return {x0, y0, x1: x1 + 1, y1: y1 + 1};};

  // playfield: everything art.base paints (a playfield picture replaces all of it: logo, Buckethead and signs included)
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

  // logo: a picture is drawn 13 x size wide (size 21 → 273 mm) centred on (236,700); keep that frame, trimmed top/bottom
  {const k = 4, size = 21, wmm = size * 13, [c, x] = canvas(wmm * k, 160 * k); x.scale(k, k); x.translate(wmm / 2 - 236, 80 - 700); logo(x, 236, 700, size, null);
    const b = bbox(c), cy = 80 * k, half = Math.max(cy - b.y0, b.y1 - cy) + 4 * k, [o, ox] = canvas(c.width, 2 * half);
    ox.drawImage(c, 0, cy - half, c.width, 2 * half, 0, 0, c.width, 2 * half); res.logo = png(o);}

  // character: a picture is drawn 110 mm wide centred on x 236, with y 820 at 40% of its height
  {const k = 6, [c, x] = canvas(300 * k, 300 * k); x.scale(k, k); x.translate(150 - 236, 150 - 820); buckethead(x, 236, 812, 70, {guitar: true});
    const b = bbox(c), toMM = v => v / k - 150, bx0 = toMM(b.x0) + 236, bx1 = toMM(b.x1) + 236, by0 = toMM(b.y0) + 820, by1 = toMM(b.y1) + 820;
    res.characterBox = {bx0, bx1, by0, by1};
    const h = Math.max((820 - by0) / .4, (by1 - 820) / .6) + 2, w = 110, top = 820 - .4 * h;
    const [o, ox] = canvas(Math.round(w * k), Math.round(h * k)); ox.drawImage(c, (236 - w / 2 - 236 + 150) * k, (top - 820 + 150) * k, w * k, h * k, 0, 0, o.width, o.height); res.character = png(o);}

  // bumper: the square picture is cut to the cap circle (r 26 x .86 mm)
  {const p = def.parts.pop1, r = p.r, k = 256 / (2 * r * .86), [c, x] = canvas(256, 256); x.scale(k, k); x.translate(128 / k, 128 / k);
    art.bumperCap(x, {x: 0, y: 0}, r, false, 0, {}); res.bumper = png(c);}

  // toy: the picture is stretched to the toy's box (96 x 84 mm, 400 x 350 px); the painted robot is scaled to fit inside
  // (its first fillRect, the painted drop shadow, is skipped: the game draws its own shadow under a toy picture)
  {const p = def.parts.giantRobot, k = 8, [c2, x2] = canvas(200 * k, 200 * k); x2.scale(k, k); const fr = x2.fillRect; let first = true;
    x2.fillRect = function (...a) {if (first) {first = false; return;} return fr.apply(this, a);};
    art.toy(x2, {x: 100, y: 100, w: p.w, h: p.h, ox: 0, oy: 0, flash: 0, armed: 0}, 0, {});
    const b = bbox(c2), bw = b.x1 - b.x0, bh = b.y1 - b.y0, W = 400, H = 350, s = Math.min(W / bw, H / bh) * .98, [o, ox] = canvas(W, H);
    ox.drawImage(c2, b.x0, b.y0, bw, bh, (W - bw * s) / 2, (H - bh * s) / 2, bw * s, bh * s); res.toy = png(o);}
  return res;
});

const box = shots.characterBox; delete shots.characterBox;
for (const [name, url] of Object.entries(shots)) {
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  console.log(name + '.png');
}
console.log('painted Buckethead spans x', box.bx0.toFixed(1), '..', box.bx1.toFixed(1), 'mm (picture frame 181..291)');
if (errors.length) {console.error(errors.join('\n')); process.exitCode = 1;}
await browser.close();
