// Fails if a src file is not in modules.json or a require() target is missing.
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const {order} = JSON.parse(fs.readFileSync(path.join(root, 'src/modules.json'), 'utf8'));
const set = new Set(order); let bad = 0;
const walk = d => fs.readdirSync(path.join(root, d), {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
for (const f of walk('src').filter(f => f.endsWith('.js'))) if (!set.has(f)) { console.log('NOT REGISTERED:', f); bad++; }
for (const id of order) {
  if (!fs.existsSync(path.join(root, id))) { console.log('MISSING FILE:', id); bad++; continue; }
  for (const m of fs.readFileSync(path.join(root, id), 'utf8').matchAll(/require\("(src\/[^"]+)"\)/g)) if (!set.has(m[1])) { console.log(id, 'requires unregistered', m[1]); bad++; }
}
console.log(bad ? 'FAIL' : `ok (${order.length} modules)`); process.exit(bad ? 1 : 0);
