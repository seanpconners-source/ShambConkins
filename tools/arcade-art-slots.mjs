// Lists every picture slot of the Arcade (src/arcadeConsole.js) and which ones already have the owner's art.
//   node tools/arcade-art-slots.mjs            → prints the table and writes assets/tiles/SLOTS.md
// Two pictures per slot (owner, Nov 3: "an individual image for each game and an icon for each game"):
//   assets/keyart/<slot>.webp  the big picture behind the selected game (landscape works best, e.g. 1600x900)
//   assets/tiles/<slot>.webp   the square icon on the tile row (a cut-out with a clear background gets the glow outline)
// A slot is a family key (one tile for several versions, e.g. pinball) or a single game id; a family's versions can
// also get their own pictures by game id (shown on the version page).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {req} from '../tests/load.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {GAMES, EVENT_GAMES} = req('src/gameRegistry.js');
const {FAMILIES, familyOf} = req('src/arcadeConsole.js');
const has = (dir, id) => fs.existsSync(path.join(root, 'assets', dir)) && fs.readdirSync(path.join(root, 'assets', dir)).some(f => f.replace(/\.(webp|png|jpe?g|svg)$/i, '') === id && f !== id);
const rows = [], seen = new Set();
for (const [key, title, sub, hero, ids] of FAMILIES) {
  rows.push({slot: key, title, kind: 'family', versions: key === 'bosses' ? 'every boss' : ids.join(', ')}); seen.add(key);
}
for (const g of GAMES) if (!familyOf(g)) rows.push({slot: g.id, title: g.title, kind: 'game', versions: ''});
for (const g of GAMES) if (familyOf(g)) rows.push({slot: g.id, title: g.title, kind: 'version of ' + familyOf(g), versions: ''});
const mark = r => (has('keyart', r.slot) ? '✅' : '·') + ' / ' + (has('tiles', r.slot) ? '✅' : '·');
const done = rows.filter(r => has('keyart', r.slot)).length, icons = rows.filter(r => has('tiles', r.slot)).length;
const md = ['# Arcade picture slots', '', `Made by \`node tools/arcade-art-slots.mjs\`. ${rows.length} slots: ${done} have key art, ${icons} have an icon.`, '',
  'Drop `assets/keyart/<slot>.webp` (big picture behind the selected game, landscape ~1600x900) and `assets/tiles/<slot>.webp`',
  '(square tile icon, ~480 px; a cut-out with a clear background gets the glowing outline). Then rebuild.', '',
  '| slot | game | kind | key art / icon |', '|---|---|---|---|',
  ...rows.map(r => `| \`${r.slot}\` | ${r.title}${r.versions ? ` (${r.versions})` : ''} | ${r.kind} | ${mark(r)} |`)];
fs.writeFileSync(path.join(root, 'assets/tiles/SLOTS.md'), md.join('\n') + '\n');
console.log(`${rows.length} slots (${FAMILIES.length} families), ${done} with key art, ${icons} with an icon → assets/tiles/SLOTS.md`);
