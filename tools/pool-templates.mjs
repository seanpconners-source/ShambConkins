#!/usr/bin/env node
// Template pictures for the Paddy's Pool drop-in art (src/data/poolSprites.js), one PNG per slot at its real pixel size.
// Each one is the game's own drawing of that slot, faded, with the layout marks on top (magenta = must stay TRANSPARENT,
// cyan = where the game puts something: pocket holes, TV screens, the felt). Paint over a copy, keep the layout, save as
// assets/pool/<name>.png (2x is fine).
//   node tools/pool-templates.mjs                 → docs/pool-sprites/templates/
//   node tools/pool-templates.mjs --only=table-paddys-wreck,cue-house
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs/pool-sprites/templates');
fs.mkdirSync(outDir, {recursive: true});
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const files = ['src/data/poolHall.js', 'src/data/poolSprites.js', 'src/engines/pool/physics.js', 'src/engines/pool/balls.js', 'src/engines/pool/art.js'];
const mods = {'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};'};
for (const f of files) mods[f] = fs.readFileSync(path.join(root, f), 'utf8');
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => {
  const cache = {};
  window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e; };
}, mods);
const names = await page.evaluate(() => Object.keys(require('src/data/poolSprites.js').PICTURES));
let n = 0;
for (const name of names) {
  if (only.length && !only.includes(name)) continue;
  const data = await page.evaluate(name => {
    const PS = require('src/data/poolSprites.js'), HALL = require('src/data/poolHall.js'), ART = require('src/engines/pool/art.js'), PH = require('src/engines/pool/physics.js');
    const def = PS.PICTURES[name], [w, h] = def.size, c = document.getElementById('c'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.clearRect(0, 0, w, h);
    const fade = (fn, a = .5) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d')); x.globalAlpha = a; x.drawImage(cv, 0, 0); x.globalAlpha = 1; };
    const label = (t, X, Y, col = '#000', size = 18) => { x.font = `bold ${size}px Arial`; x.lineWidth = 4; x.strokeStyle = 'rgba(255,255,255,.85)'; x.strokeText(t, X, Y); x.fillStyle = col; x.fillText(t, X, Y); };
    const magenta = 'rgba(255,0,200,.9)', cyan = 'rgba(0,200,255,.95)';
    const hall = HALL.freshHall(), id = name.replace(/^(table|hall-table|cue|decor)-/, '');
    const T = PH.buildTable();
    if (def.kind === 'table') {
      const tb = HALL.byId(HALL.TABLES, id);
      fade(g => { g.translate(w / 2, h / 2); g.scale(10, 10); ART.drawTable(g, T, {look: tb.look, felt: HALL.FELTS[0], wear: 0, rough: [], id: '__none', k: 10}); }, .55);
      x.setLineDash([10, 6]); x.strokeStyle = magenta; x.lineWidth = 3; x.strokeRect(55, 55, 920, 480); x.setLineDash([]);
      x.strokeStyle = cyan; x.lineWidth = 3; for (const [px, py] of [[63, 63], [967, 63], [63, 527], [967, 527], [515, 50], [515, 540]]) { x.beginPath(); x.arc(px, py, 15, 0, 6.28); x.stroke(); }
      label('TRANSPARENT inside the dashed line (the game paints the felt here)', 140, 290, '#a0007a', 22);
      label(`table-${id}: ${tb.name}. Rails + pockets only. Cyan = pocket holes.`, 70, 30, '#000', 16);
    } else if (def.kind === 'wear') {
      const lvl = +name.slice(-1), tb = lvl === 3 ? HALL.TABLES[0] : lvl === 2 ? HALL.TABLES[1] : null;
      x.fillStyle = 'rgba(47,107,68,.35)'; x.fillRect(0, 0, w, h);
      fade(g => { g.translate(w / 2, h / 2); g.scale(10, 10); ART.drawTable(g, T, {look: {...HALL.TABLES[2].look}, felt: {color: '#00000000'}, wear: 0, rough: [], id: '__none', k: 10}); }, 0);
      fade(g => { g.translate(w / 2, h / 2); g.scale(10, 10); g.save(); g.fillStyle = 'rgba(0,0,0,0)'; g.restore(); ART.drawTable(g, T, {look: HALL.TABLES[2].look, felt: {color: '#2f6b44'}, wear: lvl, rough: tb ? tb.feel.rough || [] : [], id: '__none', k: 10}); }, .5);
      x.strokeStyle = cyan; x.lineWidth = 3; if (tb) for (const q of tb.feel.rough || []) { x.beginPath(); x.ellipse(w / 2 + q.x * 10, h / 2 + q.y * 10, q.r * 14, q.r * 7, .4, 0, 6.28); x.stroke(); label('rip here', w / 2 + q.x * 10 - 30, h / 2 + q.y * 10 - q.r * 9, '#006a8a', 16); }
      label(`wear-${lvl}: stains on the felt (transparent around them, multiplied over any felt colour)`, 20, 28, '#000', 16);
    } else if (def.kind === 'cue') {
      const cu = HALL.byId(HALL.CUES, id);
      fade(g => ART.drawCue(g, {...cu, chalk: '#3d78c8'}, w - 2, h / 2, 0, w - 4, h * .9, {shadow: false}), .6);
      x.strokeStyle = cyan; x.lineWidth = 2; x.beginPath(); x.moveTo(w - 3, 0); x.lineTo(w - 3, h); x.stroke(); label('TIP →', w - 70, 18, '#006a8a', 14); label(`cue-${id}: ${cu.name} (butt on the left)`, 10, 18, '#000', 14);
    } else if (def.kind === 'floor') {
      fade(g => ART.drawFloor(g, w, h, +name.slice(-1)), .55); label(`floor-${name.slice(-1)} (must tile)`, 10, 24);
    } else if (def.kind === 'wall') {
      const tier = +name.slice(-1); fade(g => ART.drawWall(g, 0, 0, w, h, {reno: tier, tv: 0}, [], 0, null), .55);
      x.strokeStyle = cyan; x.setLineDash([8, 6]); x.lineWidth = 2; x.strokeRect(w * .3, h * .2, w * .4, h * .55); x.setLineDash([]);
      label(`wall-${tier}: wall strip above the table. The middle (dashed) gets the TVs the player buys, the sides get neon signs.`, 14, 26, '#000', 18);
      label('bottom 40 px: skirting / floor shadow', 14, h - 12, '#000', 16);
    } else {
      // hall pieces: draw the hall scene in design units and cut out the slot
      const H = PS.HALL, full = document.createElement('canvas'); full.width = H.W; full.height = H.H; const g = full.getContext('2d');
      const tierOf = () => +name.slice(-1);
      const hh = {...hall, room: {reno: 2, light: 2, tv: 2, bar: 2}, decor: HALL.DECOR.map(d => d.id), hide: [], stats: {...hall.stats, racks: 9}};
      let rect = [0, 0, H.W, H.H], table = HALL.TABLES[2], only = null;
      if (def.kind === 'hall') { hh.room = {reno: tierOf(), light: 0, tv: 0, bar: 0}; hh.decor = []; only = 'room'; }
      if (def.kind === 'hall-bar') { hh.room.bar = tierOf(); rect = [H.bar.x, H.bar.y, H.bar.w, H.bar.h]; only = 'bar'; }
      if (def.kind === 'hall-light') { hh.room.light = tierOf(); rect = [H.light.x, H.light.y, H.light.w, H.light.h]; only = 'light'; }
      if (def.kind === 'hall-tv') { hh.room.tv = tierOf(); rect = [H.tv.x, H.tv.y, H.tv.w, H.tv.h]; only = 'tv'; }
      if (def.kind === 'hall-table') { table = HALL.byId(HALL.TABLES, id); rect = [H.table.x, H.table.y, H.table.w, H.table.h]; only = 'table'; }
      if (def.kind === 'decor') { rect = H.decor[id]; only = id; }
      if (def.kind === 'logo') { x.strokeStyle = cyan; x.setLineDash([10, 6]); x.lineWidth = 3; x.strokeRect(20, 20, w - 40, h - 40); x.setLineDash([]); label("logo: PADDY'S POOL title lettering, transparent around it", 40, h / 2, '#000', 28); return c.toDataURL('image/png'); }
      ART.drawHall(g, H.W, H.H, hh, 1.2, {faces: [], feltColor: '#1f7a4a', table, only});
      x.globalAlpha = .55; x.drawImage(full, rect[0], rect[1], rect[2], rect[3], 0, 0, w, h); x.globalAlpha = 1;
      if (def.kind === 'hall') { x.setLineDash([12, 8]); x.lineWidth = 3; x.strokeStyle = cyan;
        for (const [k, r] of [['TVs', H.tv], ['bar', H.bar], ['table light', H.light], ['pool table', H.table]]) { x.strokeRect(r.x, r.y, r.w, r.h); label(k, r.x + 10, r.y + 28, '#006a8a', 22); }
        x.strokeStyle = 'rgba(255,150,0,.8)'; x.lineWidth = 2; for (const [k, r] of Object.entries(H.decor)) { x.strokeRect(...r); label(k, r[0] + 6, r[1] + 18, '#8a4a00', 14); }
        x.setLineDash([]); x.strokeStyle = magenta; x.beginPath(); x.moveTo(0, H.floorY); x.lineTo(w, H.floorY); x.stroke(); label('floor line (y 640)', 10, H.floorY - 8, '#a0007a', 18);
        label(`hall-${tierOf()}: the EMPTY room (walls, floor, ceiling). The game adds the pieces in the boxes.`, 20, 36, '#000', 24); }
      if (def.kind === 'hall-tv') { for (const sr of H.tv.screens[tierOf()]) { x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(...sr); x.strokeStyle = cyan; x.lineWidth = 3; x.strokeRect(...sr); } label(`hall-tv-${tierOf()}: TVs with BLACK screens (cyan boxes), transparent around`, 8, h - 10, '#000', 15); }
      if (def.kind === 'hall-table') { x.fillStyle = 'rgba(255,0,200,.25)'; x.beginPath(); H.table.felt.forEach(p => x.lineTo(p[0], p[1])); x.closePath(); x.fill(); x.strokeStyle = magenta; x.lineWidth = 3; x.stroke(); label('TRANSPARENT felt (the game fills this with the felt colour)', 180, 160, '#a0007a', 20); label(`hall-table-${id}: ${table.name}, from the front, a little above`, 10, 24, '#000', 18); }
      if (def.kind === 'hall-bar') label(`hall-bar-${tierOf()}: back bar + counter + stools, transparent around`, 8, 22, '#000', 16);
      if (def.kind === 'hall-light') label(`hall-light-${tierOf()}: the light over the table, hanging from the top edge`, 8, h - 10, '#000', 16);
      if (def.kind === 'decor') label(name, 6, 18, '#000', 14);
    }
    return c.toDataURL('image/png');
  }, name);
  fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64')); n++;
}
await browser.close();
console.log(`${n} templates → ${path.relative(root, outDir)}`);
