#!/usr/bin/env node
// Template pictures for the Sitabout Mini Golf drop-in art (src/data/minigolfSprites.js), one PNG per slot at its real
// pixel size. Each shows a faint copy of the game's own drawn stand-in, the ground point (feet) of standing props, the
// openings that must stay open (windmill door, clown mouth), the hub of the windmill sails, and for tiles a 2x2 repeat
// check beside it (<name>-repeat.png) so seams are easy to spot.
// Paint over a copy (transparent background except tiles and screen pictures), keep the layout, save as
// assets/minigolf/<name>.png (2x is fine), then build.
//   node tools/minigolf-templates.mjs                 → docs/minigolf-sprites/templates/
//   node tools/minigolf-templates.mjs --only=flag,oak
//   node tools/minigolf-templates.mjs --standin <dir> → the drawn stand-ins as plain drop-ins (to test the drop-in path)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const si = process.argv.indexOf('--standin'), standin = si > 0 ? path.resolve(process.argv[si + 1]) : null;
const outDir = standin || path.join(root, 'docs/minigolf-sprites/templates');
fs.mkdirSync(outDir, {recursive: true});
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const src = f => fs.readFileSync(path.join(root, f), 'utf8');
const mods = {'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};', 'src/data/minigolfSprites.js': src('src/data/minigolfSprites.js'),
  'src/engines/minigolf/physics.js': src('src/engines/minigolf/physics.js'), 'src/engines/minigolf/courses.js': src('src/engines/minigolf/courses.js'), 'src/engines/minigolf/render.js': src('src/engines/minigolf/render.js')};
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => {
  const cache = {};
  window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e; };
}, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
const names = await page.evaluate(() => Object.keys(require('src/data/minigolfSprites.js').PICTURES));
for (const name of names) {
  if (only.length && !only.includes(name)) continue;
  const res = await page.evaluate(({name, standin}) => {
    const S = require('src/data/minigolfSprites.js'), R = require('src/engines/minigolf/render.js'), {COURSES} = require('src/engines/minigolf/courses.js');
    const d = S.PICTURES[name], [W, H] = d.size, c = document.getElementById('c'); c.width = W; c.height = H; const x = c.getContext('2d'); x.clearRect(0, 0, W, H);
    const course = COURSES.find(co => name.startsWith(co.id)) || COURSES[0], look = course.look, out = {};
    const guide = !standin;
    if (d.kind === 'tile' || d.kind === 'strip') {
      const base = name.replace(/^(bushwood|gilmore|spaceballs)-/, '');
      const key = (['turf', 'lawn', 'rail', 'railtop', 'cliff'].includes(base) ? name : name) + '|' + course.id;
      const t = R.texture(key, look); x.imageSmoothingEnabled = true;
      if (d.kind === 'tile') x.drawImage(t.img, 0, 0, W, H); else for (let X = 0; X < W; X += W / 2) x.drawImage(t.img, X, 0, W / 2, H);
      if (guide) { x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(255,0,255,.6)'; x.setLineDash([8, 6]); x.lineWidth = 2; x.strokeRect(1, 1, W - 2, H - 2); x.setLineDash([]);
        x.fillStyle = '#ff00ff'; x.font = 'bold 16px sans-serif'; x.fillText(d.kind === 'tile' ? `SEAMLESS TILE · ${d.world} course units across (ball = 2)` : 'SEAMLESS LEFT-RIGHT STRIP', 10, 22); }
      out.main = c.toDataURL('image/png');
      if (guide && d.kind === 'tile') { const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; const g = c2.getContext('2d'); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.drawImage(t.img, i * W / 2, j * H / 2, W / 2, H / 2); out.repeat = c2.toDataURL('image/png'); }
      return out;
    }
    if (d.kind === 'pic') {
      if (guide) { x.fillStyle = 'rgba(40,60,90,.15)'; x.fillRect(0, 0, W, H); x.strokeStyle = '#888'; x.strokeRect(1, 1, W - 2, H - 2); x.fillStyle = '#333'; x.font = `bold ${Math.round(H / 14)}px sans-serif`; x.textAlign = 'center'; x.fillText(name, W / 2, H / 2); x.font = `${Math.round(H / 30)}px sans-serif`; x.fillText(d.note.slice(0, 90), W / 2, H / 2 + H / 12); }
      out.main = c.toDataURL('image/png'); return out;
    }
    // props / flats / sheets: the drawn stand-in, faint, at the slot's scale
    const frames = d.frame ? Math.round(W / d.frame[0]) : 1, fw = d.frame ? d.frame[0] : W, fh = d.frame ? d.frame[1] : H;
    for (let f = 0; f < frames; f++) {
      x.save(); x.translate(f * fw, 0); if (guide) x.globalAlpha = .4;
      const foot = d.foot || [fw / 2, fh / 2], pxPerUnit = fw / d.w;
      if (d.kind === 'flat' || (d.kind === 'sheet' && !d.foot)) {
        x.translate(fw / 2, fh / 2); x.scale(pxPerUnit, pxPerUnit);
        const fb = {bumper: g => { g.fillStyle = '#d81b60'; g.beginPath(); g.arc(0, 0, 3.5, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = .4; g.beginPath(); g.arc(0, 0, 2.1, 0, 7); g.stroke(); },
          tunnel: g => { g.fillStyle = '#6b7280'; g.beginPath(); g.arc(0, 0, 3.1, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(0, 0, 2.4, 0, 7); g.fill(); },
          portal: g => { for (let i = 0; i < 3; i++) { g.strokeStyle = ['#ff4dd2', '#57e1ff', '#ffe14d'][i]; g.lineWidth = .5; g.beginPath(); g.arc(0, 0, 2.9 - i * .6, 0, 7); g.stroke(); } },
          tramp: g => { g.fillStyle = '#2d7dff'; g.beginPath(); g.arc(0, 0, 3, 0, 7); g.fill(); },
          cup: g => { g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 2.65, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, 2.3, 0, 7); g.fill(); },
          ball: g => { g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); },
          'lost-ball': g => { g.fillStyle = '#ddd6c4'; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); },
          'gopher-hole': g => { g.fillStyle = '#6b4a2a'; g.beginPath(); g.ellipse(0, 0, 2, 1.7, 0, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.ellipse(0, 0, 1.25, 1.05, 0, 0, 7); g.fill(); },
          'black-hole': g => { const gr = g.createRadialGradient(0, 0, .2, 0, 0, 7); gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(90,30,160,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fill(); },
          spinner: g => { g.fillStyle = '#c8a070'; g.fillRect(-11, -.9, 22, 1.8); },
          slider: g => { g.fillStyle = '#c8a070'; g.fillRect(-8, -2, 16, 4); },
          boost: g => { for (let i = 0; i < 3; i++) { g.fillStyle = ['#ff4d6d', '#b36bff', '#57e1ff'][i]; g.beginPath(); g.moveTo(-5, 3 - i * 3); g.lineTo(0, -1 - i * 3); g.lineTo(5, 3 - i * 3); g.lineTo(5, 4.5 - i * 3); g.lineTo(0, .5 - i * 3); g.lineTo(-5, 4.5 - i * 3); g.fill(); } },
          gator: g => { g.fillStyle = '#3d7a34'; g.beginPath(); g.ellipse(0, 0, 5, 1.8, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(4, -1.3); g.lineTo(8, -.6); g.lineTo(8, .6); g.lineTo(4, 1.3); g.fill(); g.beginPath(); g.moveTo(-4, 0); g.lineTo(-8, (f ? 1 : -1) * 1.5); g.lineTo(-4, 1); g.fill(); }}[name];
        if (fb) fb(x);
      } else {
        x.translate(foot[0], foot[1]);
        const fbn = name === 'windmill-house' ? null : name === 'clown-head' ? null : name;
        if (R.FALLBACK[fbn]) { x.scale(fw * (name === 'flag' ? 1 : 1), fw); R.FALLBACK[fbn](x, {t: 0, text: name === 'sign' ? '' : undefined}); }
        else if (name === 'windmill-house') { x.fillStyle = '#b9874f'; x.beginPath(); x.moveTo(-W * .5, 0); x.lineTo(-W * .38, -H * .7); x.lineTo(W * .38, -H * .7); x.lineTo(W * .5, 0); x.fill(); x.fillStyle = '#8a2f2a'; x.beginPath(); x.moveTo(-W * .46, -H * .7); x.lineTo(0, -H * .97); x.lineTo(W * .46, -H * .7); x.fill(); }
        else if (name === 'windmill-blades') { x.translate(0, 0); for (let i = 0; i < 4; i++) { x.save(); x.rotate(i * Math.PI / 2); x.fillStyle = 'rgba(245,240,225,.95)'; x.fillRect(W * .06, 4, W * .42, W * .1); x.restore(); } }
        else if (name === 'clown-head') { const r = W * .5; x.fillStyle = '#fff3e4'; x.beginPath(); x.arc(0, -r * 1.0, r * .95, 0, 7); x.fill(); x.fillStyle = '#ff2d55'; x.beginPath(); x.arc(0, -r, r * .15, 0, 7); x.fill(); }
        else if (name === 'clown-teeth') { x.fillStyle = '#fffdf2'; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(-W / 2 + i * W / 5, -H * .9); x.lineTo(-W / 2 + (i + 1) * W / 5, -H * .9); x.lineTo(-W / 2 + (i + .5) * W / 5, 0); x.fill(); } }
        else if (name === 'gopher') { const up = [.35, .7, 1][f]; x.fillStyle = '#8a6232'; x.beginPath(); x.ellipse(0, -fh * .4 * up, fw * .25, fh * .45 * up, 0, 0, 7); x.fill(); }
      }
      x.restore();
      if (guide) {
        x.save(); x.translate(f * fw, 0); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.strokeRect(.5, .5, fw - 1, fh - 1);
        if (d.foot) { x.strokeStyle = '#ff00ff'; x.lineWidth = 2; x.beginPath(); x.moveTo(d.foot[0] - 14, d.foot[1]); x.lineTo(d.foot[0] + 14, d.foot[1]); x.moveTo(d.foot[0], d.foot[1] - 14); x.lineTo(d.foot[0], d.foot[1] + 6); x.stroke(); x.fillStyle = '#ff00ff'; x.font = 'bold 12px sans-serif'; x.fillText('ground point', d.foot[0] + 6, d.foot[1] - 6); }
        for (const k of ['door', 'mouth']) if (d[k]) { const [[a, y1], [b]] = d[k]; x.fillStyle = 'rgba(0,200,255,.35)'; x.fillRect(a, y1 - (b - a) * 1.1, b - a, (b - a) * 1.1); x.fillStyle = '#0088aa'; x.font = 'bold 14px sans-serif'; x.fillText(`keep this ${k} OPEN`, a - 10, y1 - (b - a) * 1.15); }
        if (d.hub) { x.strokeStyle = '#ff00ff'; x.lineWidth = 2; x.beginPath(); x.arc(d.hub[0], d.hub[1], 10, 0, 7); x.stroke(); x.fillStyle = '#ff00ff'; x.font = 'bold 12px sans-serif'; x.fillText('hub (the game spins the picture round this)', d.hub[0] + 14, d.hub[1] - 12); }
        if (d.kind === 'flat' || d.kind === 'sheet' && !d.foot) { x.strokeStyle = 'rgba(255,0,255,.5)'; x.setLineDash([5, 5]); x.beginPath(); x.moveTo(fw / 2, 0); x.lineTo(fw / 2, fh); x.moveTo(0, fh / 2); x.lineTo(fw, fh / 2); x.stroke(); x.setLineDash([]); }
        x.fillStyle = 'rgba(0,0,0,.6)'; x.font = 'bold 12px sans-serif'; x.fillText(`${name}${frames > 1 ? ' #' + (f + 1) : ''} · ${d.w} units wide`, 6, 16);
        x.restore();
      }
    }
    out.main = c.toDataURL('image/png'); return out;
  }, {name, standin: !!standin});
  save(name, res.main); if (res.repeat) save(name + '-repeat', res.repeat);
}
await browser.close();
console.log(`wrote ${names.filter(n => !only.length || only.includes(n)).length} templates to ${path.relative(root, outDir)}`);
