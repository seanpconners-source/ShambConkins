#!/usr/bin/env node
// Writes the art tally Claude shares with ChatGPT on Google Drive (folder "ShambConkins Art/Art Tally"): how the
// back-and-forth works, Claude's latest round (what came in, what GPT may delete, what needs a redo) and the WANTED list
// worked out from the repo (sprite slots with no picture, Arcade slots, items, portraits).
//   node tools/art-tally.mjs --round <notes.md> [--out docs/art-for-gpt/ART-TALLY.md]
// The round notes are plain Markdown written for that check. Upload the result to the Drive folder as a NEW file named
// TALLY-CLAUDE-<yyyy-mm-dd-hhmm>.md (Claude's Drive connector can create files but not edit them).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {req} from '../tests/load.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = k => {const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null;};
const out = arg('--out') || path.join(root, 'docs/art-for-gpt/ART-TALLY.md');
const round = arg('--round') ? fs.readFileSync(arg('--round'), 'utf8').trim() : '_(no notes this round)_';
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const names = dir => new Set(fs.readdirSync(path.join(root, dir)).map(f => f.replace(/\.(png|webp|jpe?g|svg)$/i, '')));

// sprite kits: every sheet/picture slot without a file
const kits = [];
for (const [mod, dir, label, brief] of [
  ['src/data/sotnSprites.js', 'sotn', 'Symphony of the Night', 'docs/sotn-sprites/GPT-SPRITE-BRIEF.md'],
  ['src/data/baseballSprites.js', 'baseball', 'Major League Baseball', 'docs/baseball-sprites/GPT-SPRITE-BRIEF.md'],
  ['src/data/sundownSprites.js', 'sundown', 'Sundown Showdown', 'docs/sundown-sprites/GPT-SPRITE-BRIEF.md']]) {
  const S = req(mod), have = names('assets/' + dir);
  const slots = [...Object.keys(S.SHEETS || {}).filter(k => S.SHEETS[k] !== null || true), ...Object.keys(S.PICTURES || {})];
  if (S.THEME_IDS && S.SCENERY) for (const t of S.THEME_IDS) for (const part of S.SCENERY) {
    if (part.startsWith('building') && !(S.BUILDING_ART || {})[t]) continue;
    slots.push(`${t}-${part}`);
  }
  const miss = [...new Set(slots)].filter(k => !have.has(k));
  const total = new Set(slots).size;
  kits.push({label, dir, brief, total, have: total - miss.length, miss});
}
// Arcade art slots (assets/tiles/SLOTS.md: "| `slot` | title | kind | key art / icon |", · = missing)
const arcade = [];
for (const line of fs.readFileSync(path.join(root, 'assets/tiles/SLOTS.md'), 'utf8').split('\n')) {
  const m = line.match(/^\| `([^`]+)` \| (.*?) \| (.*?) \| (.*?) \/ (.*?) \|$/);
  if (!m || /version of/.test(m[3])) continue;
  const need = [m[4].trim() === '·' ? 'background' : null, m[5].trim() === '·' ? 'icon' : null].filter(Boolean);
  if (need.length) arcade.push(`\`${m[1]}\` ${m[2]}: ${need.join(' + ')}`);
}
const {ACTIVE_CATALOG} = req('src/contentPolicy.js');
const haveItem = names('assets/items'), items = ACTIVE_CATALOG.items.filter(i => !haveItem.has(i.id));
const havePortrait = new Set(fs.readdirSync(path.join(root, 'assets/portraits')).map(f => f.split('.')[0]));
const BUILT_IN = new Set(['sean', 'amber']);   // their photos are built into src/data/art.js
const chars = ACTIVE_CATALOG.characters.filter(c => !havePortrait.has(c.id) && !BUILT_IN.has(c.id));

const L = [];
L.push('# ShambConkins art tally (Claude ↔ ChatGPT)', '');
L.push(`Written by Claude, ${stamp}. Newest TALLY-CLAUDE-*.md in this folder is the current one.`, '');
L.push('## How this works', '',
  '- **This folder is how Claude and ChatGPT talk.** Nobody edits someone else\'s file: each side adds a NEW file, named with the date and time, so nothing gets overwritten.',
  '- **ChatGPT, after every upload**, adds `UPLOADS-GPT-<yyyy-mm-dd-hhmm>.md`: one line per picture, `Drive folder | file name | what it is for (slot / item id) | note`. Say so if a file replaces an earlier one. List what you deleted since last time too.',
  '- **Claude, when Sean says "check the tally"**, reads every UPLOADS-GPT file newer than its last TALLY, imports the pictures into the game, and adds a new `TALLY-CLAUDE-<yyyy-mm-dd-hhmm>.md` with: what came in, **DELETE OK** (in the game, GPT may delete the Drive copy), **REDO** (what is wrong and how to fix it), **NOT USED**, and the WANTED list below.',
  '- **ChatGPT, before making art**, reads the newest TALLY-CLAUDE: delete everything marked DELETE OK, redo the REDO items first, then work down WANTED. Old TALLY and UPLOADS files can be deleted once a newer TALLY says it has read them.',
  '- **Names:** file name = the slot or id exactly as written here (lowercase, `.png`). One picture per file, transparent background unless it is a background or key art. Rules and sizes: START-HERE.md and each area\'s GPT-SPRITE-BRIEF.md (Sean has them).',
  '- Claude only looks when Sean asks (or on a schedule if Sean sets one up), so tell Sean when a batch is up.', '');
L.push('## This round', '', round, '');
L.push('## WANTED (worked out from the game)', '');
L.push('### Sprite kits', '');
for (const k of kits) {
  L.push(`**${k.label}** (${k.have} of ${k.total} slots have art; brief: \`${k.brief}\`)`);
  L.push(k.miss.length ? k.miss.map(m => `\`${m}\``).join(', ') : 'All done ✅', '');
}
L.push(`### Arcade backgrounds / icons (${arcade.length} games still missing one; prompts: \`docs/arcade-art/PROMPTS.md\`)`, '');
for (const a of arcade) L.push('- ' + a);
L.push('', `### Items (${items.length} of ${ACTIVE_CATALOG.items.length} still need a picture; file = id)`, '');
for (const i of items) L.push(`- \`${i.id}\`: ${i.name}${i.source ? ` (${i.source})` : ''}`);
L.push('', `### Character portraits (${chars.length} still need one; file = id, extra faces id.mood)`, '');
for (const c of chars) L.push(`- \`${c.id}\`: ${c.name}${c.source ? ` (${c.source})` : ''}`);
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, L.join('\n') + '\n');
console.log(`wrote ${path.relative(root, out)}: sprite slots missing ${kits.reduce((a, k) => a + k.miss.length, 0)}, arcade ${arcade.length}, items ${items.length}, portraits ${chars.length}`);
