#!/usr/bin/env node
// Template pictures for the BASEketball drop-in art (src/data/baseketballSprites.js), one PNG per slot at its real pixel size
// (+ a 2x preview <name>@2x.png for the small ones). Each shows the frame grid, the important points (where the game puts
// the ball, the blank name bar on the jersey, the rim's ends under the net, the stadium's horizon line, the rim point on the
// backboard, the jumbotron's screen) and a faint guide drawing of our stand-in art.
// Paint over a copy (transparent background except the stadiums and the jumbotron screen), keep the layout, save as
// assets/baseketball/<name>.png (2x is fine).
//   node tools/baseketball-templates.mjs   → docs/baseketball-sprites/templates/
//   node tools/baseketball-templates.mjs --only=stadium,shooter-p1
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs/baseketball-sprites/templates');
fs.mkdirSync(outDir, {recursive: true});
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const mods = {'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};', 'src/data/baseketballSprites.js': fs.readFileSync(path.join(root, 'src/data/baseketballSprites.js'), 'utf8')};
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => {
  const cache = {};
  window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e; };
}, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
const BK = await page.evaluate(() => { const T = require('src/data/baseketballSprites.js'); return {SHEETS: T.SHEETS, PICTURES: T.PICTURES}; });

for (const [name, def] of Object.entries(BK.SHEETS)) {
  if (only.length && !only.includes(name)) continue;
  for (const zoom of [1, 2]) {
    const data = await page.evaluate(({name, def, zoom}) => {
      const rows = Object.entries(def.rows), [fw, fh] = def.frame, cols = Math.max(...rows.map(r => r[1]));
      const c = document.getElementById('c'); c.width = cols * fw * zoom; c.height = rows.length * fh * zoom;
      const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.scale(zoom, zoom);
      const home = def.p ? ['#e0601a', '#161616'] : ['#1f6b3a', '#f2c230'];
      rows.forEach(([row, n], r) => {
        for (let f = 0; f < cols; f++) {
          const X = f * fw, Y = r * fh;
          x.fillStyle = f < n ? 'rgba(80,120,200,.07)' : 'rgba(0,0,0,.18)'; x.fillRect(X, Y, fw, fh);
          x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.strokeRect(X + .5, Y + .5, fw - 1, fh - 1);
          if (f >= n) continue;
          x.save(); x.translate(X, Y); x.globalAlpha = .35;
          if (name.startsWith('shooter')) {
            // faint stand-in: the shooter from behind, jersey back, arms up to the ball, hair down to the nape
            const [bx, by] = def.ball, R = 43, raise = row === 'shoot' ? -R * .2 * f : row === 'cheer' ? -R * .4 : 0;
            const neck = by + R * 2.25, shW = R * 4, shY = neck + R * .55;
            x.fillStyle = home[0]; x.strokeStyle = '#111'; x.lineWidth = 3;
            x.beginPath(); x.moveTo(bx - shW * .56, fh); x.lineTo(bx - shW * .56, shY + R * .7); x.quadraticCurveTo(bx - shW * .55, shY, bx - R * .75, shY - R * .1); x.lineTo(bx + R * .75, shY - R * .1); x.quadraticCurveTo(bx + shW * .55, shY, bx + shW * .56, shY + R * .7); x.lineTo(bx + shW * .56, fh); x.closePath(); x.fill(); x.stroke();
            for (const side of [-1, 1]) { const hx = row === 'slump' ? bx + side * shW * .62 : bx + side * R * .92, hy = row === 'slump' ? fh : by + R * .3 + raise;
              x.lineCap = 'round'; x.strokeStyle = '#d8a07a'; x.lineWidth = R * .5; x.beginPath(); x.moveTo(bx + side * shW * .44, shY + R * .35); x.lineTo(hx, hy); x.stroke(); }
            x.fillStyle = '#2e1d12'; x.beginPath(); x.ellipse(bx, neck - R * .85, R * .82, R * .9, 0, 0, 7); x.fill();
            if (row !== 'shoot' || f === 0) { x.globalAlpha = .5; x.fillStyle = '#e8701a'; x.beginPath(); x.arc(bx, by + raise, R, 0, 7); x.fill(); }
          } else {
            // the net under the rim: strings from the rim ends down to a narrower bottom
            const [r0, r1] = def.rim, mid = (r0 + r1) / 2, sway = row === 'swish' ? Math.sin(f * 2) * 12 : 0;
            x.strokeStyle = '#ffffff'; x.lineWidth = 3; for (let k = 0; k <= 8; k++) { const tx = r0 + (r1 - r0) * k / 8, bx2 = mid + (tx - mid) * .55 + sway; x.beginPath(); x.moveTo(tx, 6); x.lineTo(bx2, fh * .8); x.stroke(); }
            x.strokeStyle = '#ff5a1a'; x.lineWidth = 6; x.beginPath(); x.moveTo(r0, 4); x.lineTo(r1, 4); x.stroke();
          }
          x.restore();
          x.setLineDash([5, 3]); x.lineWidth = 1.5;
          if (def.ball) { const [bx, by] = def.ball; x.strokeStyle = 'rgba(230,110,20,.95)'; x.beginPath(); x.arc(X + bx, Y + by, 43, 0, 7); x.stroke();
            x.fillStyle = 'rgba(230,110,20,.95)'; x.font = '10px Arial'; x.fillText('ball (the game draws it)', X + bx - 52, Y + by - 48); }
          if (def.nameBar) { const [nx, ny, nw, nh] = def.nameBar; x.strokeStyle = 'rgba(30,90,230,.9)'; x.strokeRect(X + nx, Y + ny, nw, nh); x.fillStyle = 'rgba(30,90,230,.9)'; x.font = '10px Arial'; x.fillText('blank name bar', X + nx, Y + ny - 3); }
          if (def.rim) { x.strokeStyle = 'rgba(220,40,40,.95)'; for (const rx of def.rim) { x.beginPath(); x.moveTo(X + rx, Y); x.lineTo(X + rx, Y + 30); x.stroke(); } x.fillStyle = 'rgba(220,40,40,.95)'; x.font = '10px Arial'; x.fillText('rim ends', X + def.rim[0] + 4, Y + 28); }
          x.setLineDash([]); x.fillStyle = 'rgba(0,0,0,.7)'; x.font = 'bold 11px Arial'; x.fillText(row + ' ' + (f + 1), X + 4, Y + fh - 6);
        }
      });
      return c.toDataURL('image/png');
    }, {name, def, zoom});
    save(zoom === 1 ? name : name + '@2x', data);
  }
}

for (const [name, def] of Object.entries(BK.PICTURES)) {
  if (only.length && !only.includes(name)) continue;
  const [w, h] = def.size, zooms = Math.max(w, h) <= 300 ? [1, 2] : [1];
  for (const zoom of zooms) {
    const data = await page.evaluate(({name, def, w, h, zoom}) => {
      const c = document.getElementById('c'); c.width = w * zoom; c.height = h * zoom; const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.scale(zoom, zoom);
      const label = (t, px, py, col = 'rgba(0,0,0,.75)', size = 14) => { x.fillStyle = col; x.font = `bold ${size}px Arial`; x.fillText(t, px, py); };
      x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 2; x.setLineDash([8, 6]); x.strokeRect(1, 1, w - 2, h - 2); x.setLineDash([]);
      if (def.kind === 'bg') {
        const hz = def.horizon, hoop = name.includes('hoop');
        const sky = x.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, hoop ? '#12051f' : '#03061a'); sky.addColorStop(1, hoop ? '#3a0d4d' : '#16254d'); x.fillStyle = sky; x.fillRect(0, 0, w, hz);
        x.globalAlpha = .5; x.fillStyle = '#2a3046'; x.fillRect(0, hz - h * .42, w, h * .34); x.fillStyle = hoop ? '#2a0f3a' : '#16502c'; x.fillRect(0, hz - h * .075, w, h * .075); x.globalAlpha = 1;
        x.fillStyle = '#a8743c'; x.fillRect(0, hz, w, h - hz);
        x.strokeStyle = 'rgba(255,60,60,.95)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, hz); x.lineTo(w, hz); x.stroke();
        label('HORIZON: the court\'s far edge meets the wall here (y ' + hz + ')', 20, hz - 10, '#ff8080', 22);
        label('upper + lower decks packed with fans, light towers, outfield-style ad wall (joke sponsors), night sky', 20, 40, '#fff', 22);
        label('below the horizon: court floor (the game paints its own court over it)', 20, hz + 40, '#3a2410', 20);
        x.strokeStyle = 'rgba(255,255,255,.5)'; x.setLineDash([10, 8]); x.strokeRect(w * .2, h * .08, w * .6, hz - h * .1); x.setLineDash([]); label('the backboard stands in front of the middle: crowd is fine here, just no big text or logos', w * .2 + 10, h * .08 + 28, '#fff', 18);
      } else if (def.kind === 'board') {
        x.fillStyle = 'rgba(235,240,248,.9)'; x.fillRect(10, 10, w - 20, h - 40); x.strokeStyle = '#c8202a'; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 40);
        const [rx, ry] = def.rim; x.strokeRect(rx - 100, ry - 150, 200, 150);
        x.fillStyle = 'rgba(255,90,26,.9)'; x.beginPath(); x.arc(rx, ry, 9, 0, 7); x.fill(); label('rim attaches here (' + rx + ',' + ry + '): the game draws the rim + net', rx - 200, ry + 30, '#c8202a', 14);
      } else if (def.kind === 'pole') {
        x.fillStyle = 'rgba(60,65,80,.6)'; x.fillRect(w / 2 - 22, 0, 44, h - 30); x.fillRect(w / 2 - 55, h - 30, 110, 24); label('top centre = board bottom', 4, 20);
      } else if (def.kind === 'ball') {
        x.fillStyle = 'rgba(232,112,26,.6)'; x.beginPath(); x.arc(w / 2, h / 2, w * .46, 0, 7); x.fill(); x.strokeStyle = '#3a1a06'; x.lineWidth = 4; x.stroke(); label('ball fills the circle', 40, 24);
      } else if (def.kind === 'jumbo') {
        x.fillStyle = 'rgba(32,38,52,.85)'; x.fillRect(0, 0, w, h); const [sx, sy, sw, sh] = def.screen; x.fillStyle = '#000'; x.fillRect(sx, sy, sw, sh);
        x.strokeStyle = 'rgba(255,220,80,.9)'; x.lineWidth = 3; x.setLineDash([10, 6]); x.strokeRect(sx, sy, sw, sh); x.setLineDash([]);
        label('SCREEN: leave pure black: the game draws the line score, outs, bases and the batter\'s face here', sx + 20, sy + 40, '#ffd23f', 24);
        label('frame: steel, bulbs, team colours, maybe a beer-can or stadium crest on top', 20, 40, '#fff', 22);
      } else if (def.kind === 'fx') {
        x.fillStyle = 'rgba(255,63,164,.5)'; x.beginPath(); for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, r = i % 2 ? .42 : .5; x.lineTo(w / 2 + Math.cos(a) * w * r, h / 2 + Math.sin(a) * h * r); } x.closePath(); x.fill();
        label('comic burst: the defender\'s face goes at the left third, the line of text across the middle', 40, 40, '#000', 20);
      } else if (def.kind === 'decal') {
        x.strokeStyle = 'rgba(31,107,58,.8)'; x.lineWidth = 12; x.beginPath(); x.arc(w / 2, h / 2, w * .42, 0, 7); x.stroke(); label('centre-court logo, seen from straight above', 40, 40, '#1f6b3a', 22);
      } else if (def.kind === 'logo') {
        label(name === 'logo' ? 'BASEketball title lettering (our own design)' : 'HOOP JONES mode title lettering (our own design)', 40, h / 2, '#000', 40);
      }
      label(`${name}  ${w}x${h}`, 12, h - 14, 'rgba(0,0,0,.6)', 16);
      return c.toDataURL('image/png');
    }, {name, def, w, h, zoom});
    save(zoom === 1 ? name : name + '@2x', data);
  }
}
await browser.close();
console.log('templates →', path.relative(root, outDir));
