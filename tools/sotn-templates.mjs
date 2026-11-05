#!/usr/bin/env node
// Template pictures for the Symphony of the Night drop-in art (src/data/sotnSprites.js), one PNG per sheet / picture at its
// real pixel size (+ a 2x preview <name>@2x.png):
//  - sheets: the frame grid, row names, the anchor (red cross: feet on the ground, or the centre for flyers and shots),
//    the face circle (blue, with a tick showing which way is up) where the game puts the player's face, the sword hand
//    (yellow ring + line = where the game draws the blade) in the hero's attack rows, the demon's weak spot (orange), and
//    a faint grey POSE GUIDE in every frame: the game's own drawn version of that frame, for position and proportions only.
//  - pictures: the size and shape the game draws, with the drawn version as a faint guide and the lines that matter
//    (ground, floor, doorway...).
// Paint over a copy (transparent background), keep the layout, save as assets/sotn/<name>.png. Usage:
//   node tools/sotn-templates.mjs   → docs/sotn-sprites/templates/
//   node tools/sotn-templates.mjs --standin <dir>   → <dir>/<name>.png: every slot filled with the game's own drawn art (in
//   colour, no grid or marks), for checking the drop-in path in the game: copy them into assets/sotn/, build, compare.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const si = process.argv.indexOf('--standin'), standin = si > 0;
const outDir = standin ? path.resolve(process.argv[si + 1]) : path.join(root, 'docs/sotn-sprites/templates');
fs.mkdirSync(outDir, {recursive: true});
const mods = {
  'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};',
  'src/data/sotnSprites.js': fs.readFileSync(path.join(root, 'src/data/sotnSprites.js'), 'utf8'),
  'src/engines/sotnArt.js': fs.readFileSync(path.join(root, 'src/engines/sotnArt.js'), 'utf8'),
};
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => {
  const cache = {};
  window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id])(e, window.require); return e; };
}, mods);

// ---------------------------------------------------------------- sheets
const sheetNames = await page.evaluate(() => Object.keys(require('src/data/sotnSprites.js').SHEETS).filter(n => !n.endsWith('-p2')));
const ZOOMS = standin ? [1] : [1, 2];
for (const name of sheetNames) for (const zoom of ZOOMS) {
  const data = await page.evaluate(({name, zoom, standin}) => {
    const SP = require('src/data/sotnSprites.js'), A = require('src/engines/sotnArt.js'), S = SP.S, TAU = Math.PI * 2;
    const def = SP.SHEETS[name], rows = Object.entries(def.rows), [fw, fh] = def.frame, cols = Math.max(...rows.map(r => r[1]));
    const c = document.getElementById('c'); c.width = cols * fw * zoom; c.height = rows.length * fh * zoom;
    const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.scale(zoom, zoom); x.imageSmoothingEnabled = false;
    // the game's drawn version of a frame, as a grey silhouette in an offscreen frame (anchor at foot)
    const guide = (row, f, n) => {
      const k = (f + .5) / n, o = document.createElement('canvas'); o.width = fw; o.height = fh; const g = o.getContext('2d');
      g.translate(def.foot[0], def.foot[1]); g.scale(1 / S, 1 / S); g.lineCap = 'round'; g.lineJoin = 'round';
      const hero = q => A.drawHero(g, {x: 0, y: 0, facing: 1, i: 0, t: f * .2, weapon: 'fist', anim: 0, vx: 0, vy: 0, ...q});
      const foe = q => A.drawFoe(g, {x: 0, y: 0, facing: 1, t: 0, anim: 0, flash: 0, ...q}, f * .25);
      if (name === 'hero-p1') {
        const at = {slash: 0, stab: 1, cleave: 2}[row];
        if (at != null) hero({pose: 'attack', atkN: at, atkK: k});
        else if (row === 'crouchSlash') hero({pose: 'crouchAtk', atkN: 0, atkK: k});
        else if (row === 'walk') hero({pose: 'walk', anim: k * TAU, vx: 1.9});
        else if (row === 'jump') hero({pose: 'jump', vy: -5.7 * (1 - k)});
        else if (row === 'fall') hero({pose: 'fall', vy: k * 5});
        else if (row === 'flip') hero({pose: 'jump', flip: k, vy: -2});
        else if (row === 'land') hero({pose: 'land', land: 7 * (1 - k)});
        else if (row === 'dead') { if (f === n - 1) hero({pose: 'dead', dead: 40}); else if (f === 0) hero({pose: 'hurt'}); else return null; }
        else hero({pose: row});
        // no head in the guide: the face goes in the blue circle
        const h = SP.headOf(def, SP.frameOf(def, row, {index: f}));
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.arc(def.foot[0] + h.x / S, def.foot[1] + h.y / S, def.headSize * .55, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
      } else if (name === 'death') A.drawDeath(g, 0, 0, f * Math.PI / 2.2, 1, row === 'swing' ? Math.sin(k * Math.PI) : 0);
      else if (name === 'dracula') A.drawDracula(g, {x: 0, y: 0, facing: 1, vis: 1, open: row === 'cast' ? k : 0}, f * .3);
      else if (name === 'demon') {
        const D = {x: 0, y: 0, facing: 1, state: row, crouch: 0, low: 0, mouth: 0, air: false, swipe: 0, vy: 0};
        if (row === 'crouch') D.crouch = k; if (row === 'leap') { D.air = true; D.crouch = .3; }
        if (row === 'breath') { D.low = [.4, 1, 1, 1][f]; D.mouth = [.2, .5, 1, .85][f]; }
        if (row === 'summon') D.swipe = Math.sin(k * Math.PI);
        A.drawDemon(g, D, f * .3);
      } else if (['candelabra', 'lantern', 'torch'].includes(name)) A.candelabra(g, 0, name === 'lantern' ? -26 : 0, row === 'lit', f * .13, name);
      else if (name === 'fireball') A.drawShot(g, {kind: 'pfire', x: 0, y: 0, t: f, vx: 1}, f * .1);
      else if (name === 'inferno') A.drawShot(g, {kind: 'inferno', x: 0, y: 0, t: f, vx: 1}, f * .1);
      else if (name === 'fire-wave') A.drawShot(g, {kind: 'wave', x: 0, y: 0, t: f, h: 20}, f * .1);
      else if (name === 'holy-flame') return null;
      else if (name === 'zombie' && row === 'rise') { g.save(); g.beginPath(); g.rect(-60, -80, 120, 80); g.clip(); foe({type: 'zombie', state: 'walk', y: 37 * (1 - k), anim: f}); g.restore(); }
      else {
        const st = {walk: 'walk', swipe: 'swipe', idle: 'idle', run: 'run', tell: 'tell', lunge: 'lunge', skid: 'skid', throw: 'throw', hang: 'idle', fly: 'fly', leap: 'leap', spit: 'spit', empty: 'walk'}[row] || row;
        const tt = {swipe: 30, throw: name === 'armor' ? 32 : 22, spit: 34, tell: 16, skid: 22}[row];
        foe({type: name, state: st, anim: k * TAU * (name === 'warg' ? 1 / 1.6 : name === 'bat' ? 1 / 1.8 : 1), t: tt ? k * tt : 0, vy: row === 'leap' || row === 'lunge' ? (f ? 2 : -2) : 0, thrown: row === 'empty'});
      }
      if (standin) return o;
      // grey silhouette
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(70,70,90,.42)'; g.fillRect(0, 0, fw, fh);
      return o;
    };
    rows.forEach(([row, n], r) => {
      for (let f = 0; f < cols; f++) {
        const X = f * fw, Y = r * fh;
        if (standin) { if (f < n) { const gd = guide(row, f, n); if (gd) x.drawImage(gd, X, Y); } continue; }
        x.fillStyle = f < n ? ((f + r) % 2 ? 'rgba(120,90,160,.10)' : 'rgba(120,90,160,.18)') : 'rgba(0,0,0,.45)';
        x.fillRect(X, Y, fw, fh);
        x.strokeStyle = 'rgba(60,40,100,.6)'; x.lineWidth = 1 / zoom; x.strokeRect(X + .5 / zoom, Y + .5 / zoom, fw - 1 / zoom, fh - 1 / zoom);
        if (f >= n) continue;
        const gd = guide(row, f, n); if (gd) x.drawImage(gd, X, Y);
        // anchor
        x.fillStyle = 'rgba(220,30,30,.95)'; x.fillRect(X + def.foot[0] - 5, Y + def.foot[1], 11, 1); x.fillRect(X + def.foot[0], Y + def.foot[1] - 5, 1, 6);
        // face spot
        if (def.head) {
          const h = SP.headOf(def, SP.frameOf(def, row, {index: f})), hx = X + def.foot[0] + h.x / S, hy = Y + def.foot[1] + h.y / S, R = def.headSize / 2;
          x.strokeStyle = 'rgba(30,90,240,.95)'; x.lineWidth = 1.2; x.beginPath(); x.arc(hx, hy, R, 0, 7); x.stroke();
          x.beginPath(); x.moveTo(hx + Math.sin(h.rot) * R * .6, hy - Math.cos(h.rot) * R * .6); x.lineTo(hx + Math.sin(h.rot) * R, hy - Math.cos(h.rot) * R); x.stroke();
        }
        // sword hand in the hero's attack rows
        const at = {slash: 0, stab: 1, cleave: 2, crouchSlash: 0}[row];
        if (name === 'hero-p1' && at != null) {
          const k = (f + .5) / n, bp = A.bladePose(at, k), dy = row === 'crouchSlash' ? 8 : 0, c0 = Math.cos(bp.lean), s0 = Math.sin(bp.lean);
          const P = (lx, ly) => [X + def.foot[0] + (lx * c0 - ly * s0) / S, Y + def.foot[1] + (dy + lx * s0 + ly * c0) / S];
          const hand = P(bp.hx, bp.hy), L = 30 * (at === 1 ? 1.08 : 1), tip = P(bp.hx + Math.cos(bp.ang) * L, bp.hy + Math.sin(bp.ang) * L);
          x.strokeStyle = 'rgba(230,180,0,.95)'; x.lineWidth = 1.2; x.beginPath(); x.arc(hand[0], hand[1], 4, 0, 7); x.stroke();
          x.setLineDash([3, 3]); x.beginPath(); x.moveTo(hand[0], hand[1]); x.lineTo(tip[0], tip[1]); x.stroke(); x.setLineDash([]);
        }
        // the demon's head = its weak spot
        if (name === 'demon') {
          const D = {crouch: row === 'crouch' ? (f + .5) / n : row === 'leap' ? .3 : 0, low: row === 'breath' ? [.4, 1, 1, 1][f] : 0};
          const hx = X + def.foot[0] + (26 + D.low * 10 + 14) / S, hy = Y + def.foot[1] + (-112 + D.crouch * 14 + D.low * 32 - 4) / S;
          x.strokeStyle = 'rgba(255,130,0,.95)'; x.lineWidth = 1.2; x.strokeRect(hx - 15 / S, hy - 14 / S, 30 / S, 28 / S);
        }
        x.fillStyle = 'rgba(30,20,50,.85)'; x.font = '8px monospace'; x.fillText(`${row} ${f + 1}`, X + 3, Y + 10);
      }
    });
    return c.toDataURL('image/png');
  }, {name, zoom, standin});
  fs.writeFileSync(path.join(outDir, `${name}${zoom > 1 ? '@2x' : ''}.png`), Buffer.from(data.split(',')[1], 'base64'));
  if (zoom === 1) console.log('sheet', name);
}

// ---------------------------------------------------------------- pictures
// box = [x0,y0,x1,y1] in world units round the anchor; guide(g,A,sk) draws the game's version there; marks = lines to show
const PICS = {
  'sword-alucard': {box: [-34.3 / 8, -4, 34.3 * 7 / 8, 4], guide: 'A.drawBlade(g,0,0,0,{...A.BLADES.alucard,pic:null})'},
  'sword-short': {box: [-20.6 / 8, -3, 20.6 * 7 / 8, 3], guide: 'A.drawBlade(g,0,0,0,{...A.BLADES.short,pic:null})'},
  'sword-claymore': {box: [-36.6 / 8, -4, 36.6 * 7 / 8, 4], guide: 'A.drawBlade(g,0,0,0,{...A.BLADES.claymore,pic:null})'},
  dagger: {box: [-13.7 / 8, -3, 13.7 * 7 / 8, 3], guide: 'A.drawBlade(g,0,0,0,{...A.DAGGER,pic:null})'},
  heart: {box: [-4, -8, 4, 0], guide: "A.drawPickup(g,'heart',0,0,0)"},
  bigheart: {box: [-6, -12, 6, 0], guide: "A.drawPickup(g,'bigheart',0,0,0)"},
  money: {box: [-5, -10, 5, 0], guide: "A.drawPickup(g,'money',0,0,0)"},
  potion: {box: [-4.5, -14, 4.5, 0], guide: "A.drawPickup(g,'potion',0,0,0)"},
  roast: {box: [-8.5, -11, 8.5, 0], guide: "A.drawPickup(g,'roast',0,0,0)"},
  'holy-water': {box: [-4.5, -12, 4.5, 0], guide: "A.drawPickup(g,'holy',0,0,0)"},
  'leap-stone': {box: [-6, -15, 6, 0], guide: "A.drawPickup(g,'leap',0,0,0)"},
  'blood-orb': {box: [-8, -18, 8, 0], guide: "A.drawPickup(g,'orb',0,0,0)"},
  axe: {box: [-6.5, -9, 6.5, 9], guide: "A.drawShot(g,{kind:'axe',x:0,y:0,t:0,f:1},0)"},
  cross: {box: [-7, -7, 7, 7], guide: "A.drawShot(g,{kind:'cross',x:0,y:0,t:0},0)"},
  bone: {box: [-5.5, -2.5, 5.5, 2.5], guide: "A.drawShot(g,{kind:'bone',x:0,y:0,t:0},0)"},
  'forest-sky': {box: [0, 0, 256, 240], guide: "g.drawImage(sk.L.sky,0,0,256,240);sk.tiled(g,'stars',0,0,0,256,0,.9)"},
  moon: {box: [-60, -60, 60, 60], guide: 'g.drawImage(sk.L.moon,-60,-60,120,120)'},
  'castle-far': {box: [-180, -240, 180, 0], guide: 'g.drawImage(sk.L.castle,-180,-240,360,240)', marks: [['h', -40, 'the ground line in the game is near here']]},
  'forest-far': {box: [0, 0, 400, 240], guide: 'g.drawImage(sk.L.hills,0,0,400,240)', marks: [['h', 200, 'floor']]},
  'forest-near': {box: [0, 0, 320, 240], guide: 'g.drawImage(sk.L.trees,0,0,320,240)', marks: [['h', 200, 'floor']]},
  fog: {box: [0, 0, 512, 60], guide: 'g.drawImage(sk.L.fog,0,0,512,60)'},
  tree: {box: [-60, -140, 60, 0], marks: [['h', 0, 'ground'], ['v', 0, 'trunk']]},
  fence: {box: [0, -40, 32, 0], marks: [['h', -2, 'ground']]},
  grave: {box: [-8, -16, 8, 0], marks: [['h', 0, 'ground']]},
  bridge: {box: [0, 0, 32, 48], marks: [['h', 2, 'deck (walk here)']]},
  'gate-wall': {box: [0, 0, 64, 200], guide: "g.fillStyle=sk.pattern(g,'gatewall');g.fillRect(0,14,64,186)", marks: [['h', 200, 'floor']]},
  gate: {box: [-17, -104, 17, 0], marks: [['box', -11, -91, 11, 0, 'doorway: leave it TRANSPARENT (the portcullis shows through)']]},
  portcullis: {box: [0, 0, 22, 80]},
  'hall-back': {box: [0, 0, 256, 240], guide: "g.fillStyle=sk.pattern(g,'stone');g.fillRect(0,0,256,240)", marks: [['h', 200, 'floor'], ['h', 168, 'upper floor / balcony level']]},
  'cave-back': {box: [0, 0, 256, 240], guide: "g.fillStyle=sk.pattern(g,'rock');g.fillRect(0,0,256,240)", marks: [['h', 216, 'floor'], ['h', 226, 'water line']]},
  'gallery-back': {box: [0, 0, 256, 240], guide: "g.fillStyle=sk.pattern(g,'marble');g.fillRect(0,0,256,240)", marks: [['h', 160, 'floor']]},
  'throne-back': {box: [0, 0, 256, 240], guide: "g.fillStyle=sk.pattern(g,'throne');g.fillRect(0,0,256,240)", marks: [['h', 160, 'floor']]},
  balcony: {box: [0, 0, 32, 24], marks: [['h', 8, 'floor (walk here)']]},
  'stepping-stone': {box: [-20, 0, 20, 34], marks: [['h', 0, 'top (walk here)'], ['h', 14, 'water line']]},
  'crack-wall': {box: [0, 0, 16, 50]},
  bars: {box: [0, 0, 16, 146], marks: [['h', 146, 'floor']]},
  water: {box: [0, 0, 32, 12], marks: [['h', 2, 'water surface']]},
  window: {box: [-17, 0, 17, 80], guide: 'A.archWindow(g,-11,16,22,58,0)'},
  pillar: {box: [-10, 0, 10, 200], guide: 'A.pillar(g,0,0,200,14)', marks: [['h', 200, 'floor']]},
  banner: {box: [-8, 0, 8, 66], guide: 'A.banner(g,-7,2,64,0)'},
  statue: {box: [-17, -58, 17, 0], guide: 'A.statue(g,0,0)', marks: [['h', 0, 'floor']]},
  altar: {box: [-12, -13, 12, 0], marks: [['h', 0, 'floor'], ['h', -12, 'the relic floats above here']]},
  stalactite: {box: [-8, 0, 8, 48]},
  'rock-pillar': {box: [-11, 0, 11, 240]},
  arch: {box: [0, 0, 80, 160], marks: [['h', 160, 'floor']]},
  'stained-glass': {box: [-35, 0, 35, 135], guide: 'A.archWindow(g,-32,34,64,92,0,{stained:true,light:A.GLOW.red})'},
  throne: {box: [-21, -72, 21, 0], guide: 'A.throne(g,0,0)', marks: [['h', 0, 'floor']]},
  carpet: {box: [0, 0, 32, 4], marks: [['h', 2, 'floor']]},
  'forest-ground': {box: [0, 0, 64, 80], guide: "g.fillStyle=sk.pattern(g,'dirt');g.fillRect(0,0,64,80)", marks: [['h', 0, 'walking surface'], ['h', 40, 'lower half repeats downward']]},
  'gate-ground': {box: [0, 0, 64, 80], guide: "g.fillStyle=sk.pattern(g,'floorStone');g.fillRect(0,0,64,80)", marks: [['h', 0, 'walking surface'], ['h', 40, 'lower half repeats downward']]},
  'hall-ground': {box: [0, 0, 64, 80], guide: "g.fillStyle=sk.pattern(g,'floorStone');g.fillRect(0,0,64,80)", marks: [['h', 0, 'walking surface'], ['h', 40, 'lower half repeats downward']]},
  'cave-ground': {box: [0, 0, 64, 80], guide: "g.fillStyle=sk.pattern(g,'caveFloor');g.fillRect(0,0,64,80)", marks: [['h', 0, 'walking surface'], ['h', 40, 'lower half repeats downward']]},
  'gallery-ground': {box: [0, 0, 64, 80], guide: "g.fillStyle=sk.pattern(g,'floorStone');g.fillRect(0,0,64,80)", marks: [['h', 0, 'walking surface'], ['h', 40, 'lower half repeats downward']]},
  'throne-ground': {box: [0, 0, 64, 80], guide: "g.fillStyle=sk.pattern(g,'floorStone');g.fillRect(0,0,64,80)", marks: [['h', 0, 'walking surface'], ['h', 40, 'lower half repeats downward']]},
};
const missing = await page.evaluate(names => Object.keys(require('src/data/sotnSprites.js').PICTURES).filter(n => !names.includes(n)), Object.keys(PICS));
if (missing.length) throw new Error('no template for pictures: ' + missing.join(', '));
for (const [name, spec] of Object.entries(PICS)) for (const zoom of ZOOMS) {
  if (standin && !spec.guide) continue;
  const data = await page.evaluate(({spec, zoom, standin}) => {
    const SP = require('src/data/sotnSprites.js'), A = require('src/engines/sotnArt.js'), S = SP.S, [x0, y0, x1, y1] = spec.box;
    const W = Math.round((x1 - x0) / S), H = Math.round((y1 - y0) / S), c = document.getElementById('c'); c.width = W * zoom; c.height = H * zoom;
    const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); if (!standin) { x.fillStyle = 'rgba(120,90,160,.14)'; x.fillRect(0, 0, c.width, c.height); }
    if (spec.guide) {
      const o = document.createElement('canvas'); o.width = W; o.height = H; const g = o.getContext('2d');
      const sk = new A.Scenery(); sk.ensure(g, 1 / S);
      g.scale(1 / S, 1 / S); g.translate(-x0, -y0); g.lineCap = 'round'; g.lineJoin = 'round';
      new Function('g', 'A', 'sk', spec.guide)(g, A, sk);
      x.globalAlpha = standin ? 1 : .5; x.imageSmoothingEnabled = false; x.drawImage(o, 0, 0, W * zoom, H * zoom); x.globalAlpha = 1;
    }
    if (standin) return c.toDataURL('image/png');
    x.scale(zoom, zoom);
    const X = u => (u - x0) / S, Y = u => (u - y0) / S;
    x.font = '8px monospace'; x.lineWidth = 1 / zoom;
    for (const m of spec.marks || []) {
      if (m[0] === 'h') { x.strokeStyle = 'rgba(220,30,30,.9)'; x.beginPath(); x.moveTo(0, Y(m[1])); x.lineTo(W, Y(m[1])); x.stroke(); x.fillStyle = 'rgba(220,30,30,.95)'; x.fillText(m[2], 3, Math.max(9, Y(m[1]) - 2)); }
      if (m[0] === 'v') { x.strokeStyle = 'rgba(30,90,240,.9)'; x.beginPath(); x.moveTo(X(m[1]), 0); x.lineTo(X(m[1]), H); x.stroke(); x.fillStyle = 'rgba(30,90,240,.95)'; x.fillText(m[2], X(m[1]) + 2, 10); }
      if (m[0] === 'box') { x.strokeStyle = 'rgba(30,90,240,.9)'; x.strokeRect(X(m[1]), Y(m[2]), X(m[3]) - X(m[1]), Y(m[4]) - Y(m[2])); x.fillStyle = 'rgba(30,90,240,.95)'; x.fillText(m[5].slice(0, 9), X(m[1]) + 2, Y(m[2]) + 10); }
    }
    // the anchor for pictures drawn at a spot
    if (x0 < 0 && x1 > 0) { x.fillStyle = 'rgba(220,30,30,.95)'; const ax = X(0), ay = Math.min(H - 1, Math.max(0, Y(0))); x.fillRect(ax - 4, ay, 9, 1); x.fillRect(ax, ay - 4, 1, 5); }
    return c.toDataURL('image/png');
  }, {spec, zoom, standin});
  fs.writeFileSync(path.join(outDir, `${name}${zoom > 1 ? '@2x' : ''}.png`), Buffer.from(data.split(',')[1], 'base64'));
  if (zoom === 1) console.log('picture', name);
}
await browser.close();
