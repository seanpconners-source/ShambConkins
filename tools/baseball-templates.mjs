#!/usr/bin/env node
// Template pictures for the Major League Baseball sprite sheets (src/data/baseballSprites.js): one PNG per sheet at its real
// pixel size, with the frame grid, the row names, the ground point (red cross), the top-of-head line (green, `tall` px above
// the feet) and the face spot (blue circle) on sheets the game puts a character's face on.
// Paint over a copy (transparent background), keep the layout, save as assets/baseball/<name>.png. Usage:
//   node tools/baseball-templates.mjs   → docs/baseball-sprites/templates/<name>.png (+ a 2x preview <name>@2x.png)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {req} from '../tests/load.mjs';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {SHEETS} = req('src/data/baseballSprites.js');
const outDir = path.join(root, 'docs/baseball-sprites/templates');
fs.mkdirSync(outDir, {recursive: true});
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
for (const [name, def] of Object.entries(SHEETS)) {
  if (name.endsWith('-p2')) continue;   // same layout as -p1 (blue team)
  for (const zoom of [1, 2]) {
    const data = await page.evaluate(({def, zoom}) => {
      const rows = Object.entries(def.rows), [fw, fh] = def.frame, cols = Math.max(...rows.map(r => r[1]));
      const c = document.getElementById('c'); c.width = cols * fw * zoom; c.height = rows.length * fh * zoom;
      const x = c.getContext('2d'); x.scale(zoom, zoom); x.imageSmoothingEnabled = false;
      rows.forEach(([row, n], r) => {
        for (let f = 0; f < cols; f++) {
          const X = f * fw, Y = r * fh;
          x.fillStyle = f < n ? ((f + r) % 2 ? 'rgba(80,120,200,.10)' : 'rgba(80,120,200,.18)') : 'rgba(0,0,0,.35)';
          x.fillRect(X, Y, fw, fh);
          x.strokeStyle = 'rgba(40,60,120,.6)'; x.lineWidth = 1 / zoom; x.strokeRect(X + .5 / zoom, Y + .5 / zoom, fw - 1 / zoom, fh - 1 / zoom);
          if (f >= n) continue;
          x.fillStyle = 'rgba(220,30,30,.9)'; x.fillRect(X + def.foot[0] - 4, Y + def.foot[1], 9, 1); x.fillRect(X + def.foot[0], Y + def.foot[1] - 4, 1, 5);
          x.fillStyle = 'rgba(30,170,60,.8)'; x.fillRect(X + 4, Y + def.foot[1] - def.tall, fw - 8, 1);
          const gd = def.guides && def.guides[row];
          if (gd) { x.strokeStyle = 'rgba(230,170,0,.95)'; x.lineWidth = 1.5; x.beginPath(); x.arc(X + gd.hands[0], Y + gd.hands[1], 5, 0, 7); x.stroke();
            x.setLineDash([3, 2]); x.beginPath(); x.moveTo(X + gd.hands[0], Y + gd.hands[1]); x.lineTo(X + gd.tip[0], Y + gd.tip[1]); x.stroke(); x.setLineDash([]); }
          if (def.head) { x.strokeStyle = 'rgba(30,90,230,.9)'; x.lineWidth = 1; x.beginPath(); x.arc(X + def.head[0], Y + def.head[1], def.headSize / 2, 0, 7); x.stroke(); }
          x.fillStyle = 'rgba(20,30,60,.75)'; x.font = '8px monospace'; x.fillText(`${row} ${f + 1}`, X + 3, Y + 10);
        }
      });
      return c.toDataURL('image/png');
    }, {def, zoom});
    fs.writeFileSync(path.join(outDir, `${name}${zoom > 1 ? '@2x' : ''}.png`), Buffer.from(data.split(',')[1], 'base64'));
  }
  console.log(name, def.frame.join('x'), Object.entries(def.rows).map(([r, n]) => `${r}:${n}`).join(' '));
}
await browser.close();
