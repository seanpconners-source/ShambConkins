#!/usr/bin/env node
// Writes the art to-do lists GPT works from (docs/art-for-gpt/): which items and characters still have no picture of
// their own, and refreshes the Arcade art prompts (tools/arcade-art-slots.mjs). Run after importing art:
//   node tools/gpt-art-todo.mjs
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {req} from '../tests/load.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs/art-for-gpt');
fs.mkdirSync(out, {recursive: true});
const names = dir => new Set(fs.readdirSync(path.join(root, dir)).map(f => f.split('.')[0]));
const {ACTIVE_CATALOG} = req('src/contentPolicy.js');

// items: assets/items/<id>.webp|png|svg
const haveItem = names('assets/items');
const items = ACTIVE_CATALOG.items.filter(i => !haveItem.has(i.id));
const im = ['# Items that still need a picture', '',
  `Made by \`node tools/gpt-art-todo.mjs\` (${ACTIVE_CATALOG.items.length - items.length} of ${ACTIVE_CATALOG.items.length} items have art). Work top to bottom in batches of ~20.`,
  'Rules are in START-HERE.md → "Item pictures". File name = the id in the first column, e.g. `rum-ham.png`.', '',
  '| id (file name) | item | from | what it does in the game |', '|---|---|---|---|'];
for (const i of items) im.push(`| \`${i.id}\` | ${i.name} | ${i.source || ''} | ${(i.desc || '').replace(/\|/g, '/')} |`);
fs.writeFileSync(path.join(out, 'ITEMS-TODO.md'), im.join('\n') + '\n');

// characters: assets/portraits/<id>[.<mood>].* (base picture needed; moods optional)
const havePortrait = names('assets/portraits');
const chars = ACTIVE_CATALOG.characters.filter(c => !havePortrait.has(c.id));
const cm = ['# Characters that still need a portrait', '',
  `Made by \`node tools/gpt-art-todo.mjs\` (${ACTIVE_CATALOG.characters.length - chars.length} of ${ACTIVE_CATALOG.characters.length} have one).`,
  'Rules are in START-HERE.md → "Character portraits". File name = `<id>.png`, extra faces `<id>.<mood>.png`.', '',
  '| id (file name) | name | from |', '|---|---|---|'];
for (const c of chars) cm.push(`| \`${c.id}\` | ${c.name} | ${c.source || ''} |`);
fs.writeFileSync(path.join(out, 'PORTRAITS-TODO.md'), cm.join('\n') + '\n');

// Arcade key art / logos / icons: docs/arcade-art/PROMPTS.md (✅ = done)
execFileSync(process.execPath, [path.join(root, 'tools/arcade-art-slots.mjs')], {stdio: 'ignore'});
console.log(`items without art: ${items.length}, characters without a portrait: ${chars.length}; arcade prompts refreshed`);
