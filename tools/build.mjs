#!/usr/bin/env node
// Bundles src/ + assets/ into one self-contained, offline-playable HTML file.
// Usage: node tools/build.mjs [--out dist/ShambConkins.html] [--pwa [dir]]
// --pwa also writes an installable-app folder (default dist/pwa): a small index.html (code only) + a/ (every picture and
// sound as its own file, copied byte for byte and named by its contents) + manifest.webmanifest + sw.js (offline cache that
// only downloads the a/ files it doesn't have yet) + icons/. Serve that folder over http(s) or localhost to install the game
// as an app. See docs/PWA_SPLIT_DELIVERY.md.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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
const dataURI = (mime, buf) => `data:${mime};base64,` + buf.toString('base64');
const inlineAssets = text => text.replace(/@@asset:(assets\/[A-Za-z0-9_./-]+)@@/g, (_, file) => {
  const ext = file.split('.').pop();
  if (!MIME[ext]) throw new Error('Unknown asset type: ' + file);
  return dataURI(MIME[ext], fs.readFileSync(path.join(root, file)));
});

const {order, tail} = JSON.parse(read('src/modules.json'));
const modules = order.map(id => `"${id}":(exports,require)=>{\n${read(id)}`).join('\n},\n');
const js = `(()=>{'use strict';const modules={${modules}${tail}`;

// Drop-in files -> USER_PORTRAITS[key]: {mime, ext (file name in the app folder), buf (the file's bytes)}.
const drops = new Map();
const drop = (key, mime, ext, file) => drops.set(key, {mime, ext, buf: fs.readFileSync(file)});
// Optional drop-in portraits: assets/portraits/<id>.webp -> ART['photo:char:<id>'], <id>.<mood>.webp -> ART['char:<id>:<mood>'].
const portraitDir = path.join(root, 'assets/portraits');
if (fs.existsSync(portraitDir)) for (const f of fs.readdirSync(portraitDir)) {
  const m = f.match(/^([a-z0-9-]+)(?:\.(normal|win|silly|angry|mad|sad|think|walk))?\.(webp|png|jpe?g)$/i);
  if (!m) continue;
  const ext = m[3].toLowerCase().replace('jpeg', 'jpg');
  // Accept the long-standing .mad filename without requiring an upload rename.
  // Explicit .angry art wins if both .angry and .mad exist.
  const mood=m[2]?.toLowerCase(), normalized=mood==='mad'?'angry':mood;
  const key=normalized?`char:${m[1]}:${normalized}`:`photo:char:${m[1]}`;
  if(mood==='mad'&&drops.has(key))continue;
  drop(key, MIME[ext], ext, path.join(portraitDir, f));
}
// Drop-in item/location art: assets/items/<id>.(svg|webp|png|jpg) -> photo:item:<id>; assets/locations/<id>.* -> photo:location:<id>.
for (const [dir, prefix] of [['items', 'photo:item:'], ['locations', 'photo:location:']]) {
  const d = path.join(root, 'assets', dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    const m = f.match(/^([a-z0-9-]+)\.(svg|webp|png|jpe?g)$/i), ext = m && m[2].toLowerCase().replace('jpeg', 'jpg');
    if (m) drop(prefix + m[1], MIME[ext], ext, path.join(d, f));
  }
}
// Photo Hunt pairs: assets/photohunt/<id>.a.webp + <id>.b.webp -> photohunt:<id>:a|b (regions: src/data/photoHuntPairs.js, tools/photohunt.py).
const huntDir = path.join(root, 'assets/photohunt');
if (fs.existsSync(huntDir)) for (const f of fs.readdirSync(huntDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(a|b)\.(webp|png|jpe?g)$/i), ext = m && m[3].toLowerCase().replace('jpeg', 'jpg');
  if (m) drop(`photohunt:${m[1]}:${m[2].toLowerCase()}`, MIME[ext], ext, path.join(huntDir, f));
}
// Pinball table art: assets/pinball/<table>/<slot>.(webp|png|jpg|svg) -> pinball:<table>:<slot>
// (slots: playfield, backglass, apron, logo, character, bumper, toy; see src/engines/pinball/README.md).
const pinDir = path.join(root, 'assets/pinball');
if (fs.existsSync(pinDir)) for (const t of fs.readdirSync(pinDir)) {
  const d = path.join(pinDir, t);
  if (!/^[a-z0-9-]+$/.test(t) || !fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d)) {
    const m = f.match(/^([a-z0-9-]+)\.(svg|webp|png|jpe?g)$/i), ext = m && m[2].toLowerCase().replace('jpeg', 'jpg');
    if (m) drop(`pinball:${t}:${m[1].toLowerCase()}`, MIME[ext], ext, path.join(d, f));
  }
}
// Drop-in music: assets/music/<name>.(mp3|ogg|m4a|wav) -> USER_PORTRAITS['music:<name>'] (e.g. cv-symphony, cv-symphony-boss).
const AUDIO = {mp3: 'audio/mpeg', ogg: 'audio/ogg', m4a: 'audio/mp4', wav: 'audio/wav'};
const musicDir = path.join(root, 'assets/music');
if (fs.existsSync(musicDir)) for (const f of fs.readdirSync(musicDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(mp3|ogg|m4a|wav)$/i), ext = m && m[2].toLowerCase();
  if (m) drop('music:' + m[1].toLowerCase(), AUDIO[ext], ext, path.join(musicDir, f));
}
// Doom: assets/doom/<name>.pack.gz (Freedoom, made by tools/doom-pack.mjs) -> USER_PORTRAITS['doom:pack:<name>'];
// the owner's own IWADs in assets/doom/user/*.wad (git-ignored: never commit them) -> 'doom:wad:<name>', gzipped here.
// In the app folder they are .bin files (a server could add "Content-Encoding: gzip" to a .gz and the browser would unpack it).
const doomDir = path.join(root, 'assets/doom');
if (fs.existsSync(doomDir)) for (const f of fs.readdirSync(doomDir)) {
  const m = f.match(/^([a-z0-9-]+)\.pack\.gz$/i);
  if (m) drop('doom:pack:' + m[1].toLowerCase(), 'application/gzip', 'bin', path.join(doomDir, f));
}
const doomUser = path.join(doomDir, 'user');
if (fs.existsSync(doomUser)) for (const f of fs.readdirSync(doomUser)) {
  const m = f.match(/^([a-z0-9_-]+)\.wad$/i);
  if (m) drops.set('doom:wad:' + m[1].toLowerCase(), {mime: 'application/gzip', ext: 'bin', buf: zlib.gzipSync(fs.readFileSync(path.join(doomUser, f)), {level: 9})});
}

const version = read('src/version.js').match(/VERSION='([^']+)'/)[1];
// portraits: USER_PORTRAITS as written into the page; jsText: the modules; head: extra tags before the game's own script.
function page(portraits, jsText = js, head = '') {
  const js2 = jsText.replace('/*@@USER_PORTRAITS@@*/{}', () => JSON.stringify(portraits)).replace('/*@@PWA_MANIFEST@@*/null', () => JSON.stringify(PWA_MANIFEST));
  return inlineAssets(read('src/index.template.html').replace('@@VERSION@@', () => version))
    .replace('<!--@@STYLE@@-->', () => '<style>' + inlineAssets(read('src/styles.css')+'\n'+read('src/theme.css')) + '</style>')
    .replace('<!--@@SCRIPT@@-->', () => head + '<script>' + inlineAssets(js2) + '</script>');
}
const html = page(Object.fromEntries([...drops].map(([k, d]) => [k, dataURI(d.mime, d.buf)])));

fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, html);
console.log(`${path.relative(root, out)}  ${(html.length / 1048576).toFixed(1)} MB  ${order.length} modules  ${drops.size} drop-in art files`);
if (pwaDir) {
  // The app folder: the same game, but the pictures and sounds are files in a/ named by their contents ("a/<hash>.<ext>"),
  // so a new release reuses every file that didn't change. The built-in art of src/data/art.js + faceArt.js has to stay
  // data URIs (face photos are shown inside SVG frames, which can't load other files), so it goes into one script,
  // a/<hash>.js, that runs before the game. The 3 tiny item/location drop-ins stay inside the page.
  const files = new Map();   // a/ file name -> bytes
  const keep = (buf, ext) => {const name = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16) + '.' + ext; files.set(name, buf); return 'a/' + name;};
  const appPortraits = Object.fromEntries([...drops].map(([k, d]) => [k, /^photo:(item|location):/.test(k) ? dataURI(d.mime, d.buf) : keep(d.buf, d.ext)]));
  const art = [], artAt = new Map();
  const appJs = js.replace(/"@@asset:(assets\/(?!pwa\/)[A-Za-z0-9_./-]+\.(?:webp|png|jpg))@@"/g, (_, file) => {
    if (!artAt.has(file)) {artAt.set(file, art.length); art.push(dataURI(MIME[file.split('.').pop()], fs.readFileSync(path.join(root, file))));}
    return `(globalThis.__SC_ART||[])[${artAt.get(file)}]`;
  });
  const artScript = keep(Buffer.from('globalThis.__SC_ART=' + JSON.stringify(art) + ';\n'), 'js');
  const app = page(appPortraits, appJs, `<script src="${artScript}"></script>`);
  // Cache-first service worker. BUILD changes with the page, so the browser fetches the new sw.js, which downloads the new
  // page plus only the a/ files missing from its shared cache (kept between versions, so an interrupted download resumes),
  // then drops the old page and any a/ file the new version doesn't list. Progress goes to the page as 'sc-download'
  // messages (src/pwa.js shows the bar). a/ answers byte ranges from the cache (Safari plays songs that way).
  const assets = [...files].map(([name, buf]) => [name, buf.length]).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const build = version + '-' + crypto.createHash('sha256').update(app).update(JSON.stringify(assets)).digest('hex').slice(0, 12);
  const shell = ['manifest.webmanifest', ...PWA_ICONS.map(f => 'icons/' + f)];
  const sw = `// ShambConkins offline cache, written by tools/build.mjs --pwa. Cache-first; a new build changes BUILD.
const BUILD=${JSON.stringify(build)},CACHE='shambconkins-'+BUILD,FILES=${JSON.stringify(shell)},SIZE=${Buffer.byteLength(app)};
// Pictures and sounds (name = content hash + type, size in bytes); one cache for every version, so only new ones download.
const ASSETS=${JSON.stringify(assets)},ART='sc-assets',TYPES={webp:'image/webp',png:'image/png',jpg:'image/jpeg',svg:'image/svg+xml',mp3:'audio/mpeg',ogg:'audio/ogg',m4a:'audio/mp4',wav:'audio/wav',bin:'application/octet-stream',js:'text/javascript'};
const at=n=>new URL('a/'+n,self.registration.scope).href;
const tell=m=>self.clients.matchAll({includeUncontrolled:true}).then(cs=>cs.forEach(c=>c.postMessage(m)));
const typed=(blob,name)=>new Response(blob,{headers:{'content-type':TYPES[name.split('.').pop()]||'application/octet-stream'}});
async function install(){
 const c=await caches.open(CACHE),a=await caches.open(ART),have=new Set((await a.keys()).map(r=>r.url));
 const todo=ASSETS.filter(([n])=>!have.has(at(n)));let got=0,shown=0;const total=SIZE+todo.reduce((s,[,b])=>s+b,0);
 const step=n=>{got+=n;if(Date.now()-shown>300){shown=Date.now();tell({type:'sc-download',got,total});}};
 const r=await fetch(new Request('index.html',{cache:'reload'}));if(!r.ok)throw new Error('index.html '+r.status);
 const read=r.body.getReader(),parts=[];for(;;){const {done,value}=await read.read();if(done)break;parts.push(value);step(value.length);}
 const page=new Response(new Blob(parts,{type:'text/html'}),{headers:{'content-type':'text/html'}});
 // each file is kept as soon as it is in (that is what lets a stopped download carry on next time)
 let next=0;const one=async()=>{for(;;){const job=todo[next++];if(!job)return;const [n,b]=job;
  const f=await fetch(new Request(at(n),{cache:'no-cache'}));   // a/ names never change content: a browser copy is fineif(!f.ok)throw new Error('a/'+n+' '+f.status);
  const blob=await f.blob();if(blob.size!==b)throw new Error('a/'+n+' is '+blob.size+' bytes, expected '+b);await a.put(at(n),typed(blob,n));step(b);}};
 await Promise.all([...Array(6)].map(one));
 await c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})));await c.put('index.html',page);tell({type:'sc-download',got:total,total,done:true});
}
self.addEventListener('install',e=>{e.waitUntil(install().then(()=>self.skipWaiting(),err=>{tell({type:'sc-download',failed:true});throw err;}));});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
 await Promise.all((await caches.keys()).filter(k=>k.startsWith('shambconkins-')&&k!==CACHE).map(k=>caches.delete(k)));
 const a=await caches.open(ART),want=new Set(ASSETS.map(([n])=>at(n)));for(const r of await a.keys())if(!want.has(r.url))await a.delete(r);
 await self.clients.claim();})());});
// A byte range of a cached file (audio/video elements ask for those; Safari won't play a song without them).
async function ranged(req,res){const m=/^bytes=(\\d*)-(\\d*)$/.exec(req.headers.get('range')||'');if(!m||!res||res.status!==200)return res;
 const blob=await res.blob(),n=blob.size;let s=m[1]===''?Math.max(0,n-+m[2]):+m[1],e=m[1]!==''&&m[2]!==''?Math.min(n-1,+m[2]):n-1;
 if(s>=n||s>e)return new Response(null,{status:416,headers:{'content-range':'bytes */'+n}});
 return new Response(blob.slice(s,e+1),{status:206,headers:{'content-type':res.headers.get('content-type')||'','content-range':'bytes '+s+'-'+e+'/'+n,'content-length':String(e-s+1),'accept-ranges':'bytes'}});}
async function file(req){const a=await caches.open(ART);let hit=await a.match(req.url,{ignoreSearch:true});
 if(!hit){const r=await fetch(new Request(req.url));if(!r.ok)return r;const blob=await r.blob(),name=new URL(req.url).pathname.split('/').pop();
  if(ASSETS.some(([n])=>n===name))await a.put(req.url,typed(blob,name)).catch(()=>{});hit=typed(blob,name);}
 return ranged(req,hit);}
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
 if(u.href.startsWith(new URL('a/',self.registration.scope).href)){e.respondWith(file(r));return;}
 e.respondWith(caches.open(CACHE).then(c=>c.match(r,{ignoreSearch:true}).then(hit=>hit||(r.mode==='navigate'?c.match('index.html'):undefined))).then(hit=>hit||fetch(r)));});
`;
  fs.rmSync(pwaDir, {recursive: true, force: true});
  fs.mkdirSync(path.join(pwaDir, 'icons'), {recursive: true});
  fs.mkdirSync(path.join(pwaDir, 'a'));
  for (const [name, buf] of files) fs.writeFileSync(path.join(pwaDir, 'a', name), buf);
  fs.writeFileSync(path.join(pwaDir, 'index.html'), app);
  fs.writeFileSync(path.join(pwaDir, 'manifest.webmanifest'), JSON.stringify(PWA_MANIFEST, null, 1));
  fs.writeFileSync(path.join(pwaDir, 'sw.js'), sw);
  for (const f of PWA_ICONS) fs.copyFileSync(path.join(root, 'assets/pwa', f), path.join(pwaDir, 'icons', f));
  const mb = n => (n / 1048576).toFixed(1) + ' MB';
  console.log(`${path.relative(root, pwaDir)}/  installable app folder: index.html ${mb(app.length)}, a/ ${files.size} files ${mb(assets.reduce((s, [, b]) => s + b, 0))} (built-in art script ${mb(files.get(artScript.slice(2)).length)}), sw.js, manifest, icons/  build ${build}`);
}
