// Turns "id:DEL" / "id:e|m|h|i" review notes into src/data/triviaFixes.js
import fs from 'node:fs';
const [dir, out] = process.argv.slice(2);
const remove = [], difficulty = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.txt'))) for (const tok of fs.readFileSync(dir + '/' + f, 'utf8').split(/\s+/).filter(Boolean)) {
  const [id, v] = tok.split(':'); if (!id || !v) continue;
  if (v === 'DEL') remove.push(id); else difficulty[id] = ({e: 'easy', m: 'medium', h: 'hard', i: 'impossible'})[v];
}
fs.writeFileSync(out, `// Generated from the v0.44 manual trivia review (tools/gen-trivia-fixes.mjs).\n// remove: duplicates, answer-giveaways, garbled or unverifiable questions.\n// difficulty: recalibrated tiers (easy = casual fans, medium = fans, hard = devoted fans, impossible = obscure).\nconst TRIVIA_FIXES={remove:${JSON.stringify([...new Set(remove)])},difficulty:${JSON.stringify(difficulty)}};\nObject.assign(exports,{TRIVIA_FIXES});\n`);
console.log('remove', new Set(remove).size, 'difficulty', Object.keys(difficulty).length);
