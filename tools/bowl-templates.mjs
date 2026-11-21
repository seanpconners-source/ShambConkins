#!/usr/bin/env node
// Template pictures for the Kingpin Bowling drop-in art (src/data/bowlSprites.js), one PNG per slot at its real pixel size.
// Each one is the game's own drawing of that slot, faded, with layout marks on top (magenta = must stay TRANSPARENT or
// DARK as noted, cyan = guides: board lines, pin neck stripes, finger holes, cell borders). Paint over a copy, keep the
// layout, save as assets/bowling/<name>.png or .webp (2x is fine).
//   node tools/bowl-templates.mjs                  -> docs/bowling-sprites/templates/
//   node tools/bowl-templates.mjs --only=masking-ocelot,toon-pin
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs/bowling-sprites/templates');
fs.mkdirSync(outDir, {recursive: true});
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const files = ['src/vendor/cannon.js', 'src/engines/trun/skel.js', 'src/engines/trun/render.js', 'src/engines/bowl/physics.js', 'src/engines/bowl/gl.js',
  'src/data/bowlAlley.js', 'src/data/bowlSprites.js', 'src/engines/bowl/scene.js', 'src/engines/bowl/screens.js'];
const mods = {'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};'};
for (const f of files) mods[f] = fs.readFileSync(path.join(root, f), 'utf8');
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => {
  const cache = {};
  window.require = id => { if (cache[id]) return cache[id].exports; const m = cache[id] = {exports: {}}; new Function('exports', 'require', 'module', mods[id] || '')(m.exports, window.require, m); return m.exports; };
}, mods);
const names = await page.evaluate(() => Object.keys(require('src/data/bowlSprites.js').PICTURES));
let n = 0;
for (const name of names) {
  if (only.length && !only.includes(name)) continue;
  const data = await page.evaluate(name => {
    const SP = require('src/data/bowlSprites.js'), SC = require('src/engines/bowl/scene.js'), SCR = require('src/engines/bowl/screens.js'), AL = require('src/data/bowlAlley.js'), PH = require('src/engines/bowl/physics.js');
    const def = SP.PICTURES[name], [W, H] = def.size, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const era = name.split('-').slice(1).join('-'), fade = (a = .55) => { x.fillStyle = `rgba(255,255,255,${a})`; x.fillRect(0, 0, W, H); };
    const label = (t, y = 22) => { x.font = 'bold 18px sans-serif'; x.textAlign = 'left'; x.fillStyle = '#e0f'; x.fillText(t, 10, y); };
    const cyan = '#0bd'; x.lineWidth = 2;
    const draw = (img, w = W, h = H) => { for (let yy = 0; yy < H; yy += h) for (let xx = 0; xx < W; xx += w) x.drawImage(img, xx, yy, w, h); };
    if (def.kind === 'boards') {// a 2.4 m piece of the lane: 39 boards across
      const lane = SC.paintLane(era); x.drawImage(lane, 0, 4096 * 3 / PH.DECK_END, 256, 4096 * 2.4 / PH.DECK_END, 0, 0, W, H); fade(.4);
      x.strokeStyle = cyan; x.lineWidth = 1; for (let b = 0; b <= 39; b++) { const bx = b * W / 39; x.beginPath(); x.moveTo(bx, 0); x.lineTo(bx, H); x.stroke(); }
      label('boards-' + era + ': 39 boards across, tiles top to bottom (no arrows/dots: the game paints them)');
    } else if (['approach', 'wall', 'carpet', 'ceiling', 'kickback'].includes(def.kind)) {
      const t = SC.paintTile(era, def.kind); draw(t, Math.min(W, 512), Math.min(H, 512)); fade(.45);
      label(name + (def.kind === 'wall' ? ': tiles SIDEWAYS (left edge meets right edge)' : ': must tile in both directions'));
    } else if (def.kind === 'masking') {
      x.drawImage(SC.paintMasking(era, 14), 0, 0, W, H); fade(.45); x.fillStyle = 'rgba(224,0,255,.35)'; x.fillRect(0, H - 80, W, 80);
      label('masking-' + era + ': the panel over ONE lane (repeats over every lane). Bottom 80 px: keep DARK (the game writes the lane number)', 26);
    } else if (def.kind === 'pins') {
      x.drawImage(SC.paintPin(era), 0, 0, W, H); fade(.35); const y = v => H * (1 - v / PH.PIN_H);
      x.strokeStyle = cyan; for (const v of [.27, .245]) { x.beginPath(); x.moveTo(0, y(v)); x.lineTo(W, y(v)); x.stroke(); }
      label('pins-' + era + ': the pin skin unrolled; row 0 = top of the head, bottom row = the base. Neck stripes between the cyan lines', 22);
    } else if (def.kind === 'ball') {
      const b = AL.byId(AL.BALLS, name.slice(5)); x.drawImage(SC.paintBall(b), 0, 0, W, H); fade(.35);
      x.strokeStyle = cyan; for (const [u, v, r] of [[.25, .13, 14], [.21, .07, 11], [.29, .07, 11]]) { x.beginPath(); x.ellipse(u * W, v * H, r * 3.6, r * 2, 0, 0, 7); x.stroke(); }
      label(name + ': equirectangular wrap (like a world map); left edge meets right edge; finger holes (cyan) are added by the game', H - 14);
    } else if (def.kind === 'screen') {
      const buf = document.createElement('canvas'); buf.width = SCR.BW; buf.height = SCR.BH; const a = SCR.createAnim('strike', era, {name: 'Sean'}); a.draw(buf.getContext('2d'), 1.3);
      x.drawImage(buf, 0, 0, W, H); fade(.6); label('screen-' + era + ': the monitor background (scores and cartoons are drawn on top, so keep it calm)', 28);
    } else if (def.kind === 'logo') {
      x.font = '900 150px "Arial Black",Impact,sans-serif'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,190,40,.35)'; x.fillText('KINGPIN', W / 2, H * .45); x.fillText('BOWLING', W / 2, H * .82);
      label('logo: KINGPIN BOWLING lettering, transparent around it');
    } else if (def.kind === 'decor') {
      const d = AL.byId(AL.DECOR, name.slice(6)); x.strokeStyle = cyan; x.strokeRect(20, 20, W - 40, H - 40); x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#999';
      x.fillText(d.name, W / 2, H / 2); x.font = '20px sans-serif'; x.fillText(d.desc, W / 2, H / 2 + 40); label(name + ': transparent around the object / poster');
    } else if (def.kind === 'sheet') {
      const sh = SP.SHEETS[name], [cw, ch] = sh.cell;
      for (let i = 0; i < sh.n; i++) {
        x.save(); x.translate(i * cw, 0);
        if (name === 'toon-pin') { const lie = i >= 2 && i <= 4; SCR.toonPin(x, lie ? cw * (i === 2 ? .4 : .2) : cw / 2, lie ? ch * .8 : ch * .95, lie ? cw * .62 : ch * .85, ['stand', 'scared', 'knocked', 'fly', 'dizzy', 'laugh', 'cry', 'dance'][i], i === 2 ? .7 : i === 3 ? 1.57 : i === 4 ? 1.5 : 0, .3); }
        else if (name === 'toon-ball') SCR.toonBall(x, cw / 2, ch / 2, cw * .36, 0, 0, ['#2a2a7a', '#b8200f', '#4a4a6a', '#1a1a1a'][i]);
        else SCR.turkey(x, cw / 2, ch * .95, ch * .5, i * .3, ['stand', 'strut', 'gobble', 'dance', 'fly', 'bow'][i]);
        x.restore(); x.strokeStyle = cyan; x.strokeRect(i * cw + 1, 1, cw - 2, ch - 2);
      }
      fade(.45); label(name + ': ' + sh.n + ' cells of ' + cw + 'x' + ch + ', transparent background, feet / base on the cell bottom');
    }
    return c.toDataURL('image/png');
  }, name);
  fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64')); n++;
}
await browser.close();
console.log(`${n} templates -> ${path.relative(root, outDir)}`);
