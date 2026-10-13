#!/usr/bin/env node
// Bundles src/ + assets/ into one self-contained, offline-playable HTML file.
// Usage: node tools/build.mjs [--out dist/ShambConkins.html]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argOut = process.argv.indexOf('--out');
const out = path.resolve(root, argOut > 0 ? process.argv[argOut + 1] : 'dist/ShambConkins.html');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const MIME = {svg: 'image/svg+xml', webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png'};
const inlineAssets = text => text.replace(/@@asset:(assets\/[A-Za-z0-9_.-]+)@@/g, (_, file) => {
  const ext = file.split('.').pop();
  if (!MIME[ext]) throw new Error('Unknown asset type: ' + file);
  return `data:${MIME[ext]};base64,` + fs.readFileSync(path.join(root, file)).toString('base64');
});

const {order, tail} = JSON.parse(read('src/modules.json'));
const modules = order.map(id => `"${id}":(exports,require)=>{\n${read(id)}`).join('\n},\n');
const js = `(()=>{'use strict';const modules={${modules}${tail}`;

// Optional drop-in portraits: assets/portraits/<id>.webp -> ART['photo:char:<id>'], <id>.<mood>.webp -> ART['char:<id>:<mood>'].
const portraitDir = path.join(root, 'assets/portraits'), userPortraits = {};
if (fs.existsSync(portraitDir)) for (const f of fs.readdirSync(portraitDir)) {
  const m = f.match(/^([a-z0-9-]+)(?:\.(normal|win|silly|angry|mad|sad|think|walk))?\.(webp|png|jpe?g)$/i);
  if (!m) continue;
  const ext = m[3].toLowerCase().replace('jpeg', 'jpg');
  // Accept the long-standing .mad filename without requiring an upload rename.
  // Explicit .angry art wins if both .angry and .mad exist.
  const mood=m[2]?.toLowerCase(), normalized=mood==='mad'?'angry':mood;
  const key=normalized?`char:${m[1]}:${normalized}`:`photo:char:${m[1]}`;
  if(mood==='mad'&&Object.prototype.hasOwnProperty.call(userPortraits,key))continue;
  userPortraits[key] = `data:${MIME[ext]};base64,` + fs.readFileSync(path.join(portraitDir, f)).toString('base64');
}
// Drop-in item/location art: assets/items/<id>.(svg|webp|png|jpg) -> photo:item:<id>; assets/locations/<id>.* -> photo:location:<id>.
for (const [dir, prefix] of [['items', 'photo:item:'], ['locations', 'photo:location:']]) {
  const d = path.join(root, 'assets', dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    const m = f.match(/^([a-z0-9-]+)\.(svg|webp|png|jpe?g)$/i);
    if (m) userPortraits[prefix + m[1]] = `data:${MIME[m[2].toLowerCase().replace('jpeg', 'jpg')]};base64,` + fs.readFileSync(path.join(d, f)).toString('base64');
  }
}
// Photo Hunt pairs: assets/photohunt/<id>.a.webp + <id>.b.webp -> photohunt:<id>:a|b (regions: src/data/photoHuntPairs.js, tools/photohunt.py).
const huntDir = path.join(root, 'assets/photohunt');
if (fs.existsSync(huntDir)) for (const f of fs.readdirSync(huntDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(a|b)\.(webp|png|jpe?g)$/i);
  if (m) userPortraits[`photohunt:${m[1]}:${m[2].toLowerCase()}`] = `data:${MIME[m[3].toLowerCase().replace('jpeg', 'jpg')]};base64,` + fs.readFileSync(path.join(huntDir, f)).toString('base64');
}
const js2 = js.replace('/*@@USER_PORTRAITS@@*/{}', () => JSON.stringify(userPortraits));
const html = read('src/index.template.html')
  .replace('<!--@@STYLE@@-->', () => '<style>' + inlineAssets(read('src/styles.css')+'\n'+read('src/theme.css')) + '</style>')
  .replace('<!--@@SCRIPT@@-->', () => '<script>' + inlineAssets(js2) + '</script>');

fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, html);
console.log(`${path.relative(root, out)}  ${(html.length / 1048576).toFixed(1)} MB  ${order.length} modules  ${Object.keys(userPortraits).length} drop-in art files`);
