#!/usr/bin/env node
// Template pictures for the Sundown Showdown sprite sheets (src/data/sundownSprites.js): one PNG per sheet at its real
// pixel size, with the frame grid, the row names, the ground point (red) and the head spot (blue circle, cowboys and boss).
// Paint over a copy (transparent background), keep the layout, save as assets/sundown/<name>.png. Usage:
//   node tools/sundown-templates.mjs   → docs/sundown-sprites/templates/<name>.png (+ a 4x preview <name>@4x.png)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {req} from '../tests/load.mjs';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {SHEETS} = req('src/data/sundownSprites.js');
const outDir = path.join(root, 'docs/sundown-sprites/templates');
fs.mkdirSync(outDir, {recursive: true});
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
for (const [name, def] of Object.entries(SHEETS)) {
  if (name === 'cowboy-p2') continue;   // same layout as cowboy-p1
  for (const zoom of [1, 4]) {
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
          x.fillStyle = 'rgba(220,30,30,.9)'; x.fillRect(X + def.foot[0] - 2, Y + def.foot[1], 5, 1); x.fillRect(X + def.foot[0], Y + def.foot[1] - 2, 1, 3);
          if (def.head) { const o = def.headRows?.[row], h = !o ? def.head : Array.isArray(o[0]) ? (o[f] || o[o.length - 1]) : o;
            x.strokeStyle = 'rgba(30,90,230,.9)'; x.beginPath(); x.arc(X + h[0], Y + h[1], def.headSize / 2, 0, 7); x.stroke(); }
          x.fillStyle = 'rgba(20,30,60,.75)'; x.font = '6px monospace'; x.fillText(`${row} ${f + 1}`, X + 2, Y + 7);
        }
      });
      return c.toDataURL('image/png');
    }, {def, zoom});
    fs.writeFileSync(path.join(outDir, `${name}${zoom > 1 ? '@4x' : ''}.png`), Buffer.from(data.split(',')[1], 'base64'));
  }
  console.log(name, def.frame.join('x'), Object.entries(def.rows).map(([r, n]) => `${r}:${n}`).join(' '));
}
await browser.close();
