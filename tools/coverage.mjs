// Checks every name in docs/REFERENCE_LIST.md against the game's source text.
// Usage: node tools/coverage.mjs   (prints names that appear nowhere in src/)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const norm = t => t.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
function walk(d, out = []) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p, out); else if (/\.(js|css|html|json)$/.test(f)) out.push(p); } return out; }
const corpus = norm(walk(path.join(root, 'src')).map(f => fs.readFileSync(f, 'utf8')).join('\n'));
const md = fs.readFileSync(path.join(root, 'docs/REFERENCE_LIST.md'), 'utf8').split('## Part 3')[0];
const names = new Set();
for (const line of md.split('\n')) {
  if (/^#|^Copied|^characters|^$/.test(line)) continue;
  const body = line.replace(/^(TV|Movies|Horror|Games|Anime \/ animation|90s kid|Music|Anime|Locations?)[^:]*:\s*/i, '').replace(/\.$/, '');
  for (let n of body.split(/;/)) { n = n.replace(/\(.*?\)/g, ' ').replace(/\band the movie\b/g, '').trim(); for (const alt of n.split(' / ')) if (alt.trim().length > 2) names.add(alt.trim()); }
}
const missing = [];
for (const n of names) {
  const k = norm(n); if (!k) continue;
  if (!corpus.includes(k)) missing.push(n);
}
console.log(`${names.size} names, ${missing.length} not found in src/`);
console.log(missing.join(' | '));
