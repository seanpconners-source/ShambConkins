// Pokémon sprites for every drop-in portrait character, one per supplied mood (front + back), as a contact sheet.
import fs from 'fs';
import {open} from './lib.mjs';
const out = process.argv[2] || '/tmp/claude-0/sc';
const ids = [...new Set(fs.readdirSync('assets/portraits').filter(f => /\.(webp|png|jpe?g)$/i.test(f)).map(f => f.split('.')[0]))];
const {browser, page, errors} = await open({viewport: {width: 1200, height: 900}});
const rows = await page.evaluate(async ids => {
  const {sprites: SP, portraitMoods} = window.ShambConkins.pkmn, rows = [];
  const sheet = document.createElement('div'); sheet.id = 'sheet'; sheet.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#f8f8f0;overflow:auto;padding:8px;font:11px monospace;color:#000';
  for (const id of ids) {
    const moods = ['normal', ...portraitMoods(id)], row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;align-items:end;margin:2px 0';
    row.append(Object.assign(document.createElement('b'), {textContent: id, style: 'width:90px'}));
    const blank = [];
    for (const mood of moods) for (const kind of ['front', 'back']) {
      const sp = await SP.characterSprite(id, kind, mood); if (!sp || sp.data.every(v => !v)) { blank.push(mood + ':' + kind); continue; }
      const c = SP.paint(sp, SP.typePalette(id)), big = document.createElement('canvas'), k = kind === 'back' ? 4 : 2;
      big.width = sp.w * k; big.height = sp.h * k; const x = big.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, big.width, big.height);
      big.title = mood; const cell = document.createElement('div'); cell.style.textAlign = 'center'; cell.append(big, Object.assign(document.createElement('div'), {textContent: mood}));
      row.append(cell);
    }
    sheet.append(row); rows.push({id, moods, blank});
  }
  document.body.append(sheet); return rows;
}, ids);
for (const r of rows) console.log(r.id.padEnd(12), r.moods.join(','), r.blank.length ? 'BLANK ' + r.blank : '');
await page.screenshot({path: `${out}/pkmn-moods.png`, fullPage: false});
console.log('errors', errors);
await browser.close();
if (errors.length || rows.some(r => r.blank.length)) process.exit(1);
