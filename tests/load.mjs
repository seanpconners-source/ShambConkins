// Loads src/ modules in plain Node (no DOM) so pure game logic can be unit-tested.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = {};
export function req(id) {
  if (cache[id]) return cache[id];
  const src = fs.readFileSync(path.join(root, id), 'utf8').replace(/@@asset:[^@]+@@/g, 'data:,');
  const exports = cache[id] = {};
  new Function('exports', 'require', src)(exports, req);
  return exports;
}
