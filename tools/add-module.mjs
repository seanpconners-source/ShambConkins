// Registers new src/ files in src/modules.json (safe if several people do it at once).
// Usage: node tools/add-module.mjs src/engines/foo.js [src/engines/bar.js ...]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'src/modules.json'), lock = file + '.lock';
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
for (let i = 0; ; i++) { try { fs.mkdirSync(lock); break; } catch { if (i > 400) { fs.rmSync(lock, {recursive: true, force: true}); } sleep(25); } }
try {
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const id of process.argv.slice(2)) {
    if (!fs.existsSync(path.join(root, id))) { console.error('missing file', id); continue; }
    if (!m.order.includes(id)) { m.order.push(id); console.log('added', id); } else console.log('already listed', id);
  }
  fs.writeFileSync(file, JSON.stringify(m, null, 1));
} finally { fs.rmSync(lock, {recursive: true, force: true}); }
