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
// Image prompts (owner, Nov 3: "I need icons and images for each game, help me get them quickly"): one key-art and one icon
// prompt per slot in one shared style, for ChatGPT / Gemini / any image generator. → docs/arcade-art/PROMPTS.md + prompts.json
const byId = new Map([...GAMES, ...EVENT_GAMES].map(g => [g.id, g]));
const CONTROL = /^(hold|drag|tap|swipe|flick|press|pull|tilt|use|touch|move|steer|aim|both players|each player|players|p1|p2|player|you|your|on your|take turns|pass|the phone|left|right|first to)/i;
const firstSentence = t => (String(t || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s/).map(x => x.replace(/[A-Z]{4,}[A-Z ,']*/g, w => w.charAt(0) + w.slice(1).toLowerCase()).trim()).find(x => x && !CONTROL.test(x)) || '').slice(0, 200);
const SCENES = {bosses: 'a line-up of huge, over-the-top video-game bosses looming over two tiny heroes', pinball: 'a glowing pinball playfield exploding with lights, a chrome ball mid-flight', trivia: 'a game-show stage with spotlights, buzzers and a giant question mark', casino: 'a neon casino table with cards, chips and dice flying', taskmaster: 'absurd tasks: a stopwatch, a traffic cone and a very serious judge', pokemon: 'a monster-catching battle on a grassy route, a red-and-white capture ball flying'};
const STYLE = 'Bold comic-book illustration with thick ink outlines and dramatic rim lighting; deep navy background with an electric-blue glow and one bright accent colour; playful, slightly crude party-game humour; no text, no letters, no logos, no watermark.';
const prompts = rows.map(r => {
  const fam = FAMILIES.find(f => f[0] === r.slot), g = byId.get(r.slot), first = fam ? (fam[4] || []).map(id => byId.get(id)).find(Boolean) : g;
  const title = fam ? fam[1] : g?.title || r.slot, source = (first || g)?.source || '', scene = SCENES[r.slot] || (fam ? `${fam[2]}. ${firstSentence(first?.rules)}` : firstSentence(g?.rules)) || `the most iconic moment of ${title}`;
  return {slot: r.slot, title, source, kind: r.kind, hasKey: has('keyart', r.slot), hasIcon: has('tiles', r.slot),
    keyart: `Key art for "${title}", a minigame in a party video game that pays tribute to ${source || 'pop culture'}. Scene: ${scene.replace(/[.!?]?$/, ".")} ${STYLE} Wide 16:9 landscape; keep the main subject in the right half and the left third calm and dark so menu text can sit there.`,
    icon: `Square game icon for "${title}" (${source || 'pop culture'} tribute): one big, instantly readable subject (a character or object from it) cut out as a sticker with a thick white outline on a TRANSPARENT background, centred, filling 85% of the square. ${STYLE}`};
});
fs.mkdirSync(path.join(root, 'docs/arcade-art'), {recursive: true});
fs.writeFileSync(path.join(root, 'docs/arcade-art/prompts.json'), JSON.stringify(prompts, null, 1));
fs.writeFileSync(path.join(root, 'docs/arcade-art/PROMPTS.md'), ['# Arcade art prompts', '', 'Made by `node tools/arcade-art-slots.mjs`. Paste a prompt into an image generator, save the picture as',
  '`<slot>-art.png` (big picture) or `<slot>-icon.png` (tile icon) in one folder, then run `python3 tools/import-arcade-art.py <folder>`.', '',
  ...prompts.flatMap(p => [`## ${p.title} · \`${p.slot}\``, '', `**Key art** ${p.hasKey ? '✅' : ''}`, '', '> ' + p.keyart, '', `**Icon** ${p.hasIcon ? '✅' : ''}`, '', '> ' + p.icon, ''])].join('\n'));
console.log(`prompts → docs/arcade-art/PROMPTS.md (${prompts.length} slots)`);
console.log(`${rows.length} slots (${FAMILIES.length} families), ${done} with key art, ${icons} with an icon → assets/tiles/SLOTS.md`);
