#!/usr/bin/env node
// Bundles src/ + assets/ into one self-contained, offline-playable HTML file.
// Usage: node tools/build.mjs [--out dist/ShambConkins.html] [--pwa [dir]]
// --pwa also writes an installable-app folder (default dist/pwa): the game as index.html + manifest.webmanifest +
// sw.js (offline cache) + icons/. Serve that folder over http(s) or localhost to install the game as an app.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import zlib from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argOut = process.argv.indexOf('--out');
const out = path.resolve(root, argOut > 0 ? process.argv[argOut + 1] : 'dist/ShambConkins.html');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const argPwa = process.argv.indexOf('--pwa');
const pwaDir = argPwa < 0 ? null : path.resolve(root, process.argv[argPwa + 1] && !process.argv[argPwa + 1].startsWith('--') ? process.argv[argPwa + 1] : 'dist/pwa');
// Web app manifest: written into the PWA folder and embedded in the game (src/pwa.js builds one from it when the
// page is served without the folder). Icon files live in assets/pwa/.
const PWA_MANIFEST = {name: 'ShambConkins', short_name: 'ShambConkins', description: 'ShambConkins: a party board game for two, with minigames, unlockable characters and online play.',
  id: './', start_url: './', scope: './', display: 'fullscreen', orientation: 'any', background_color: '#000000', theme_color: '#12130f', categories: ['games', 'entertainment'],
  icons: [{src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'}, {src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
    {src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'}]};
const PWA_ICONS = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-48.png'];

const MIME = {svg: 'image/svg+xml', webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png'};
const inlineAssets = text => text.replace(/@@asset:(assets\/[A-Za-z0-9_./-]+)@@/g, (_, file) => {
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
// Pinball table art: assets/pinball/<table>/<slot>.(webp|png|jpg|svg) -> pinball:<table>:<slot>
// (slots: playfield, backglass, apron, logo, character, bumper, toy; see src/engines/pinball/README.md).
const pinDir = path.join(root, 'assets/pinball');
if (fs.existsSync(pinDir)) for (const t of fs.readdirSync(pinDir)) {
  const d = path.join(pinDir, t);
  if (!/^[a-z0-9-]+$/.test(t) || !fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d)) {
    const m = f.match(/^([a-z0-9-]+)\.(svg|webp|png|jpe?g)$/i);
    if (m) userPortraits[`pinball:${t}:${m[1].toLowerCase()}`] = `data:${MIME[m[2].toLowerCase().replace('jpeg', 'jpg')]};base64,` + fs.readFileSync(path.join(d, f)).toString('base64');
  }
}
// Drop-in music: assets/music/<name>.(mp3|ogg|m4a|wav) -> USER_PORTRAITS['music:<name>'] (e.g. cv-symphony, cv-symphony-boss).
const AUDIO = {mp3: 'audio/mpeg', ogg: 'audio/ogg', m4a: 'audio/mp4', wav: 'audio/wav'};
const musicDir = path.join(root, 'assets/music');
if (fs.existsSync(musicDir)) for (const f of fs.readdirSync(musicDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(mp3|ogg|m4a|wav)$/i);
  if (m) userPortraits['music:' + m[1].toLowerCase()] = `data:${AUDIO[m[2].toLowerCase()]};base64,` + fs.readFileSync(path.join(musicDir, f)).toString('base64');
}
// Doom: assets/doom/<name>.pack.gz (Freedoom, made by tools/doom-pack.mjs) -> USER_PORTRAITS['doom:pack:<name>'];
// the owner's own IWADs in assets/doom/user/*.wad (git-ignored: never commit them) -> 'doom:wad:<name>', gzipped here.
const doomDir = path.join(root, 'assets/doom');
if (fs.existsSync(doomDir)) for (const f of fs.readdirSync(doomDir)) {
  const m = f.match(/^([a-z0-9-]+)\.pack\.gz$/i);
  if (m) userPortraits['doom:pack:' + m[1].toLowerCase()] = 'data:application/gzip;base64,' + fs.readFileSync(path.join(doomDir, f)).toString('base64');
}
const doomUser = path.join(doomDir, 'user');
if (fs.existsSync(doomUser)) for (const f of fs.readdirSync(doomUser)) {
  const m = f.match(/^([a-z0-9_-]+)\.wad$/i);
  if (m) userPortraits['doom:wad:' + m[1].toLowerCase()] = 'data:application/gzip;base64,' + zlib.gzipSync(fs.readFileSync(path.join(doomUser, f)), {level: 9}).toString('base64');
}
const js2 = js.replace('/*@@USER_PORTRAITS@@*/{}', () => JSON.stringify(userPortraits)).replace('/*@@PWA_MANIFEST@@*/null', () => JSON.stringify(PWA_MANIFEST));
const html = inlineAssets(read('src/index.template.html').replace('@@VERSION@@', () => read('src/version.js').match(/VERSION='([^']+)'/)[1]))
  .replace('<!--@@STYLE@@-->', () => '<style>' + inlineAssets(read('src/styles.css')+'\n'+read('src/theme.css')) + '</style>')
  .replace('<!--@@SCRIPT@@-->', () => '<script>' + inlineAssets(js2) + '</script>');

fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, html);
console.log(`${path.relative(root, out)}  ${(html.length / 1048576).toFixed(1)} MB  ${order.length} modules  ${Object.keys(userPortraits).length} drop-in art files`);
if (pwaDir) {
  // Cache-first service worker: the game is one big file, downloaded once per build. BUILD changes with the game's
  // contents, so the browser fetches the new sw.js, caches the new game in the background and drops the old copy.
  // The game is streamed in so the page can show a download bar (src/pwa.js listens for 'sc-download' messages).
  const build = read('src/version.js').match(/VERSION='([^']+)'/)[1] + '-' + (await import('node:crypto')).createHash('sha256').update(html).digest('hex').slice(0, 12);
  const files = ['index.html', 'manifest.webmanifest', ...PWA_ICONS.map(f => 'icons/' + f)];
  const sw = `// ShambConkins offline cache, written by tools/build.mjs --pwa. Cache-first; a new build changes BUILD.
const BUILD=${JSON.stringify(build)},CACHE='shambconkins-'+BUILD,FILES=${JSON.stringify(files.slice(1))},SIZE=${Buffer.byteLength(html)};
const tell=m=>self.clients.matchAll({includeUncontrolled:true}).then(cs=>cs.forEach(c=>c.postMessage(m)));
async function game(c){const r=await fetch(new Request('index.html',{cache:'reload'}));if(!r.ok)throw new Error('index.html '+r.status);
 const read=r.body.getReader(),parts=[];let got=0,at=0;for(;;){const {done,value}=await read.read();if(done)break;parts.push(value);got+=value.length;
  if(Date.now()-at>300){at=Date.now();tell({type:'sc-download',got,total:SIZE});}}
 await c.put('index.html',new Response(new Blob(parts,{type:'text/html'}),{headers:{'content-type':'text/html'}}));tell({type:'sc-download',got,total:SIZE,done:true});}
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all([game(c),c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))])).then(()=>self.skipWaiting(),err=>{tell({type:'sc-download',failed:true});throw err;}));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('shambconkins-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 e.respondWith(caches.open(CACHE).then(c=>c.match(r,{ignoreSearch:true}).then(hit=>hit||(r.mode==='navigate'?c.match('index.html'):undefined))).then(hit=>hit||fetch(r)));});
`;
  fs.rmSync(pwaDir, {recursive: true, force: true});
  fs.mkdirSync(path.join(pwaDir, 'icons'), {recursive: true});
  fs.writeFileSync(path.join(pwaDir, 'index.html'), html);
  fs.writeFileSync(path.join(pwaDir, 'manifest.webmanifest'), JSON.stringify(PWA_MANIFEST, null, 1));
  fs.writeFileSync(path.join(pwaDir, 'sw.js'), sw);
  for (const f of PWA_ICONS) fs.copyFileSync(path.join(root, 'assets/pwa', f), path.join(pwaDir, 'icons', f));
  console.log(`${path.relative(root, pwaDir)}/  installable app folder (index.html, manifest.webmanifest, sw.js, icons/)  build ${build}`);
}
