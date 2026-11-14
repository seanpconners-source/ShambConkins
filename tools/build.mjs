#!/usr/bin/env node
// Bundles src/ + assets/ into the game.
// Usage: node tools/build.mjs [--pwa dir] [--single | --out file.html]
// The game ships as the installable app (owner, Nov 6: install only): a folder (default dist/pwa) with a small index.html
// (code only) + a/ (every picture and sound as its own file, copied byte for byte and named by its contents) +
// manifest.webmanifest + sw.js (offline cache that only downloads the a/ files it doesn't have yet) + icons/. Serve that
// folder over http(s) or localhost (tests do it themselves, tests/lib.mjs appURL). See docs/PWA_SPLIT_DELIVERY.md.
// --single / --out also writes the old one-file HTML (dist/ShambConkins.html unless --out names it). It is no longer
// released: browsers can't open a file much over ~500 MB, and the game is meant to grow past that.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import zlib from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argOut = process.argv.indexOf('--out');
const single = argOut > 0 || process.argv.includes('--single');
const out = path.resolve(root, argOut > 0 ? process.argv[argOut + 1] : 'dist/ShambConkins.html');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const argPwa = process.argv.indexOf('--pwa');
const pwaDir = argPwa < 0 ? (single ? null : path.resolve(root, 'dist/pwa')) : path.resolve(root, process.argv[argPwa + 1] && !process.argv[argPwa + 1].startsWith('--') ? process.argv[argPwa + 1] : 'dist/pwa');
// Web app manifest: written into the PWA folder and embedded in the game (src/pwa.js builds one from it when the
// page is served without the folder). Icon files live in assets/pwa/.
const PWA_MANIFEST = {name: 'ShambConkins', short_name: 'ShambConkins', description: 'ShambConkins: a party board game for two, with minigames, unlockable characters and online play.',
  id: './', start_url: './', scope: './', display: 'fullscreen', orientation: 'any', background_color: '#000000', theme_color: '#12130f', categories: ['games', 'entertainment'],
  icons: [{src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'}, {src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
    {src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'}]};
const PWA_ICONS = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-48.png'];

const MIME = {svg: 'image/svg+xml', webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2'};
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
// Arcade art (src/arcadeConsole.js, list: node tools/arcade-art-slots.mjs): assets/tiles/<game id or family key>.* -> tile:<id>
// (the square icon on the tile row), assets/keyart/<id>.* -> keyart:<id> (the big picture behind the selected game).
for (const [dir, prefix] of [['items', 'photo:item:'], ['locations', 'photo:location:'], ['tiles', 'tile:'], ['keyart', 'keyart:']]) {
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
// Sundown Showdown sprite sheets and scenery (the owner's own art): assets/sundown/<name>.(webp|png) -> sundown:<name>
// (names and layout: src/data/sundownSprites.js, docs/sundown-sprites/README.md).
const sundownDir = path.join(root, 'assets/sundown');
if (fs.existsSync(sundownDir)) for (const f of fs.readdirSync(sundownDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(webp|png)$/i), ext = m && m[2].toLowerCase();
  if (m) drop('sundown:' + m[1].toLowerCase(), MIME[ext], ext, path.join(sundownDir, f));
}
// Living Dead Horde / Evil Dead Cabin drop-in art: assets/horde/<name>.(webp|png) -> horde:<name>
// (names and layout: src/data/hordeSprites.js, docs/horde-sprites/README.md).
const hordeDir = path.join(root, 'assets/horde');
if (fs.existsSync(hordeDir)) for (const f of fs.readdirSync(hordeDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(webp|png)$/i), ext = m && m[2].toLowerCase();
  if (m) drop('horde:' + m[1].toLowerCase(), MIME[ext], ext, path.join(hordeDir, f));
}
// Battleship drop-in art: assets/battleship/<name>.(webp|png) -> battleship:<name>
// (names and layout: src/data/battleshipSprites.js, docs/battleship-sprites/README.md).
const battleshipDir = path.join(root, 'assets/battleship');
if (fs.existsSync(battleshipDir)) for (const f of fs.readdirSync(battleshipDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(webp|png)$/i), ext = m && m[2].toLowerCase();
  if (m) drop('battleship:' + m[1].toLowerCase(), MIME[ext], ext, path.join(battleshipDir, f));
}
// Banana Stand Tapper drop-in art: assets/tapper/<name>.(webp|png) -> tapper:<name>
// (names and layout: src/data/tapperSprites.js, docs/tapper-sprites/README.md).
const tapperDir = path.join(root, 'assets/tapper');
if (fs.existsSync(tapperDir)) for (const f of fs.readdirSync(tapperDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(webp|png)$/i), ext = m && m[2].toLowerCase();
  if (m) drop('tapper:' + m[1].toLowerCase(), MIME[ext], ext, path.join(tapperDir, f));
}
// Paddy's Pool drop-in art: assets/pool/<name>.(webp|png) -> pool:<name> (names and layout: src/data/poolSprites.js,
// docs/pool-sprites/README.md).
const poolDir = path.join(root, 'assets/pool');
if (fs.existsSync(poolDir)) for (const f of fs.readdirSync(poolDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(webp|png)$/i), ext = m && m[2].toLowerCase();
  if (m) drop('pool:' + m[1].toLowerCase(), MIME[ext], ext, path.join(poolDir, f));
}
// BASEketball drop-in art: assets/baseketball/<name>.(webp|png) -> baseketball:<name>
// (names and layout: src/data/baseketballSprites.js, docs/baseketball-sprites/README.md).
const bkDir = path.join(root, 'assets/baseketball');
if (fs.existsSync(bkDir)) for (const f of fs.readdirSync(bkDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(webp|png)$/i), ext = m && m[2].toLowerCase();
  if (m) drop('baseketball:' + m[1].toLowerCase(), MIME[ext], ext, path.join(bkDir, f));
}
// Major League Baseball sprite sheets and pictures: assets/baseball/<name>.(webp|png) -> baseball:<name>
// (names and layout: src/data/baseballSprites.js, docs/baseball-sprites/README.md).
const baseballDir = path.join(root, 'assets/baseball');
if (fs.existsSync(baseballDir)) for (const f of fs.readdirSync(baseballDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(webp|png)$/i), ext = m && m[2].toLowerCase();
  if (m) drop('baseball:' + m[1].toLowerCase(), MIME[ext], ext, path.join(baseballDir, f));
}
// Symphony of the Night sprite sheets and stage art: assets/sotn/<name>.(webp|png) -> sotn:<name>
// (names and layout: src/data/sotnSprites.js, docs/sotn-sprites/README.md).
const sotnDir = path.join(root, 'assets/sotn');
if (fs.existsSync(sotnDir)) for (const f of fs.readdirSync(sotnDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(webp|png)$/i), ext = m && m[2].toLowerCase();
  if (m) drop('sotn:' + m[1].toLowerCase(), MIME[ext], ext, path.join(sotnDir, f));
}
// Sonic 3 style game sprite sheets and stage art: assets/sonic3/<name>.(webp|png) -> s3:<name>
// (names and layout: src/data/sonic3Sprites.js, docs/sonic3-sprites/README.md).
const s3Dir = path.join(root, 'assets/sonic3');
if (fs.existsSync(s3Dir)) for (const f of fs.readdirSync(s3Dir)) {
  const m = f.match(/^([a-z0-9-]+)\.(webp|png)$/i), ext = m && m[2].toLowerCase();
  if (m) drop('s3:' + m[1].toLowerCase(), MIME[ext], ext, path.join(s3Dir, f));
}
// Sqwordle art (owner's GPT pictures): assets/sqwordle/<name>.(webp|png) -> sqwordle:<name> (slots in src/engines/sqwordle.js ART).
const sqwDir = path.join(root, 'assets/sqwordle');
if (fs.existsSync(sqwDir)) for (const f of fs.readdirSync(sqwDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(webp|png)$/i), ext = m && m[2].toLowerCase();
  if (m) drop('sqwordle:' + m[1].toLowerCase(), MIME[ext], ext, path.join(sqwDir, f));
}
// Drop-in music: assets/music/<name>.(mp3|ogg|m4a|wav|flac) -> USER_PORTRAITS['music:<name>'] (e.g. cv-symphony, cv-symphony-boss).
const AUDIO = {mp3: 'audio/mpeg', ogg: 'audio/ogg', m4a: 'audio/mp4', wav: 'audio/wav', flac: 'audio/flac'};
const musicDir = path.join(root, 'assets/music');
if (fs.existsSync(musicDir)) for (const f of fs.readdirSync(musicDir)) {
  const m = f.match(/^([a-z0-9-]+)\.(mp3|ogg|m4a|wav|flac)$/i), ext = m && m[2].toLowerCase();
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
    .replace('<!--@@SCRIPT@@-->', () => head + '<!--@@MAIN@@--><script>' + inlineAssets(js2) + '</script>');
}
// The one-file game: the drop-in pictures and sounds (data: URIs, ~460 MB) go in their own <script> parts of up to ~32 MB
// that run before the game and fill window.__SC_UP, which src/data/userPortraits.js reads. Inside the game's one script
// they would make it longer than a browser can hold as one string (~512 MB in Chrome), and the build itself would hit
// Node's limit on one string; the file is written part by part for the same reason. Same bytes, same data: URIs as before.
if (single) {const PART = 32e6;
 const parts = [];
 {let cur = [], n = 0;
  for (const [k, d] of drops) {const entry = JSON.stringify(k) + ':' + JSON.stringify(dataURI(d.mime, d.buf));
   if (n && n + entry.length > PART) {parts.push(cur);cur = [];n = 0;}cur.push(entry);n += entry.length;}
  if (cur.length) parts.push(cur);}
 const shell = page({}, js.replace('/*@@USER_PORTRAITS@@*/{}', () => '(globalThis.__SC_UP||{})'));
 const cut = shell.indexOf('<script>', shell.indexOf('<!--@@MAIN@@-->'));
 fs.mkdirSync(path.dirname(out), {recursive: true});
 const fd = fs.openSync(out, 'w');let bytes = 0;const put = str => {bytes += fs.writeSync(fd, str);};
 put(shell.slice(0, cut));
 for (const p of parts) {put('<script>(globalThis.__SC_UP=globalThis.__SC_UP||{});Object.assign(globalThis.__SC_UP,{');p.forEach((e, i) => put((i ? ',' : '') + e));put('});</script>');}
 put(shell.slice(cut));fs.closeSync(fd);
 console.log(`${path.relative(root, out)}  ${(bytes / 1048576).toFixed(1)} MB  ${order.length} modules  ${drops.size} drop-in art files (${parts.length} parts)`);
 if (bytes > 480 * 1048576) console.log('  note: a browser may not open a file this big (limit ~512 MB); use the app folder');}
if (pwaDir) {
  // The app folder: the same game, but the pictures and sounds are files in a/ named by their contents ("a/<hash>.<ext>"),
  // so a new release reuses every file that didn't change. The built-in art of src/data/art.js + faceArt.js has to stay
  // data URIs (face photos are shown inside SVG frames, which can't load other files), so it goes into one script,
  // a/<hash>.js, that runs before the game.
  const files = new Map();   // a/ file name -> bytes
  const keep = (buf, ext) => {const name = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16) + '.' + ext; files.set(name, buf); return 'a/' + name;};
  const appPortraits = Object.fromEntries([...drops].map(([k, d]) => [k, keep(d.buf, d.ext)]));   // items/locations too (inlined, 300+ items pushed index.html past Cloudflare's 25 MiB)
  const art = [], artAt = new Map();
  const appJs = js.replace(/"@@asset:(assets\/(?!pwa\/)[A-Za-z0-9_./-]+\.(?:webp|png|jpg))@@"/g, (_, file) => {
    if (!artAt.has(file)) {artAt.set(file, art.length); art.push(dataURI(MIME[file.split('.').pop()], fs.readFileSync(path.join(root, file))));}
    return `(globalThis.__SC_ART||[])[${artAt.get(file)}]`;
  });
  // in parts of ~8 MB (the website host, Cloudflare, refuses files over 25 MiB), run in order; each adds to __SC_ART
  const artScripts = [];
  for (let i = 0; i < art.length;) {let n = 0, j = i;while (j < art.length && (j === i || n + art[j].length < 8e6)) n += art[j++].length;
    artScripts.push(keep(Buffer.from('globalThis.__SC_ART=(globalThis.__SC_ART||[]).concat(' + JSON.stringify(art.slice(i, j)) + ');\n'), 'js'));i = j;}
  // The page carries its own list of a/ files ([name, bytes], into src/pwa.js APP_FILES) and hands it to the service worker.
  const assets = [...files].map(([name, buf]) => [name, buf.length]).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const app = page(appPortraits, appJs.replace('/*@@APP_FILES@@*/null', () => JSON.stringify(assets)), `<script>window.__SC_ARTN=${artScripts.length}</script>` + artScripts.map(f => `<script src="${f}"></script>`).join(''));
  // Service worker = the installed app's offline copy. The game page is network-first: every open asks the site with the
  // saved copy's ETag (the release tag). Unchanged: 304 and the saved copy loads at once. New release: it loads straight
  // from the network like a normal web page (what a browser tab does, which always updated at once) and is saved for
  // offline play while it streams in. No answer within a few seconds (offline, weak signal): the saved copy. This file is
  // the same for every release (only SW_VERSION changes it), so the browser never downloads the whole game a second time
  // in the background, the old flow that stalled for big builds whenever the app was closed part-way.
  // The pictures and sounds (a/) have their own cache, shared by every release: when the page starts it sends its list of
  // a/ files ('sc-files', src/pwa.js) and the worker downloads only the ones it doesn't have, in the background, keeping
  // each as soon as it is in (a stopped download carries on next time). It answers byte ranges from that cache (Safari
  // plays songs that way) and drops files that neither of the newest two versions lists.
  const SW_VERSION = 7;
  const shell = ['index.html', 'manifest.webmanifest', ...PWA_ICONS.map(f => 'icons/' + f)];
  const sw = `// ShambConkins offline copy, written by tools/build.mjs --pwa (service worker version ${SW_VERSION}).
const CACHE='shambconkins-app',FILES=${JSON.stringify(shell.slice(1))},WAIT=2500;
const isGame=u=>{const p=new URL(u).pathname,s=new URL(self.registration.scope).pathname;return p===s||p===s+'index.html';};
const save=(c,res)=>c.put('index.html',res).then(()=>true,()=>false);
// progress of a download the loading screen is waiting for (the page itself, the built-in art script): counted as it
// streams and sent to that page ({type:'sc-load', kind, got, total, done}); index.template.html's #boot shows it
function counted(body,id,kind,total){let got=0,at=0,client=null;const send=done=>{if(!id)return;(client?Promise.resolve(client):self.clients.get(id)).then(c=>{client=c||null;if(c)c.postMessage({type:'sc-load',kind,got,total,done});}).catch(()=>{});};
 return body.pipeThrough(new TransformStream({transform(ch,ctl){got+=ch.byteLength;if(Date.now()-at>150){at=Date.now();send(false);}ctl.enqueue(ch);},flush(){send(true);}}));}
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).catch(()=>{}).then(()=>self.skipWaiting()));});
// keep the game saved by an older version of this file (other cache names), then drop those caches
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);
 for(const k of await caches.keys())if(k!==CACHE&&k.startsWith('shambconkins-')){if(!await c.match('index.html')){const old=await (await caches.open(k)).match('index.html');if(old)await c.put('index.html',old);}await caches.delete(k);}
 await self.clients.claim();})());});
async function game(e){const c=await caches.open(CACHE),saved=await c.match('index.html'),tag=saved&&saved.headers.get('etag');
 const net=fetch(new Request(e.request.url,{cache:'no-store',credentials:'same-origin',headers:tag?{'If-None-Match':tag}:{}}));
 let res=null;try{res=await (saved?Promise.race([net,new Promise(r=>setTimeout(()=>r(null),WAIT))]):net);}catch{}
 // slow or offline: play the saved copy now; a new release still coming in is saved for next time
 // (and the page is told, so it can offer a restart: an app kept open on Android never reloads by itself)
 if(!res){if(saved){e.waitUntil(net.then(r=>r&&r.status===200?save(c,r):false).then(ok=>ok&&tell({type:'sc-saved'})).catch(()=>{}));return saved;}return net;}
 if(res.status===304&&saved)return saved;
 if(res.status===200&&res.body){const h=new Headers(res.headers),[a,b]=res.body.tee();e.waitUntil(save(c,new Response(b,{status:200,headers:h})));return new Response(counted(a,e.resultingClientId||e.clientId,'page',+h.get('content-length')||0),{status:200,headers:h});}
 return saved||res;}
// ---- pictures and sounds: a/<content hash>.<type>, cache ART for every release
const ART='sc-assets',KEEP=2,TYPES={webp:'image/webp',png:'image/png',jpg:'image/jpeg',svg:'image/svg+xml',mp3:'audio/mpeg',ogg:'audio/ogg',m4a:'audio/mp4',wav:'audio/wav',flac:'audio/flac',bin:'application/octet-stream',js:'text/javascript'};
const at=n=>new URL('a/'+n,self.registration.scope).href,LISTS=()=>at('lists.json');
const typed=(blob,name)=>new Response(blob,{headers:{'content-type':TYPES[name.split('.').pop()]||'application/octet-stream'}});
const tell=m=>self.clients.matchAll({includeUncontrolled:true}).then(cs=>cs.forEach(c=>c.postMessage(m)));
const newer=(a,b)=>{const x=String(a).split('.').map(n=>parseInt(n,10)||0),y=String(b).split('.').map(n=>parseInt(n,10)||0);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i];return false;};
// A byte range of a cached file (audio/video elements ask for those).
async function ranged(req,res){const m=/^bytes=(\\d*)-(\\d*)$/.exec(req.headers.get('range')||'');if(!m||!res||res.status!==200)return res;
 const blob=await res.blob(),n=blob.size;let s=m[1]===''?Math.max(0,n-+m[2]):+m[1],e=m[1]!==''&&m[2]!==''?Math.min(n-1,+m[2]):n-1;
 if(s>=n||s>e)return new Response(null,{status:416,headers:{'content-range':'bytes */'+n}});
 return new Response(blob.slice(s,e+1),{status:206,headers:{'content-type':res.headers.get('content-type')||'','content-range':'bytes '+s+'-'+e+'/'+n,'content-length':String(e-s+1),'accept-ranges':'bytes'}});}
// One download per file at a time: a game asking for a song while the background download is fetching it shares that fetch.
const inflight=new Map();
function grab(n,bytes=0){const u=at(n);let p=inflight.get(u);
 if(!p){p=(async()=>{const f=await fetch(new Request(u,{cache:'no-cache'}));if(!f.ok)throw new Error('a/'+n+' '+f.status);   // same name = same bytes: a browser copy is fine
  const blob=await f.blob();if(bytes&&blob.size!==bytes)throw new Error('a/'+n+' is '+blob.size+' bytes, expected '+bytes);
  await (await caches.open(ART)).put(u,typed(blob,n)).catch(()=>{});return blob;})().finally(()=>inflight.delete(u));inflight.set(u,p);}
 return p;}
// Exact URL only: ignoreSearch makes the browser read every entry in the cache (575 ms per picture with 2,600 files, against 0.6 ms).
async function file(e){const r=e.request,a=await caches.open(ART);let hit=await a.match(r.url);
 if(!hit){const name=new URL(r.url).pathname.split('/').pop();
  // the built-in art script holds up the start: stream it to the page with progress, and save it as it comes
  if(name.endsWith('.js')){const res=await fetch(new Request(r.url,{cache:'no-cache'}));if(!res.ok||!res.body)return res;const [x,y]=res.body.tee();e.waitUntil(new Response(y).blob().then(b=>a.put(r.url,typed(b,name))).catch(()=>{}));
   return new Response(counted(x,e.clientId,'art',+res.headers.get('content-length')||0),{headers:{'content-type':TYPES.js}});}
  let blob;try{blob=await grab(name);}catch{return new Response(null,{status:504});}hit=typed(blob,name);}
 return ranged(r,hit);}
// Download a list of [name, bytes] the cache lacks, 6 at a time, with progress for the page's download bar (kind: 'app' at
// install / update, 'songs' for the files a game asked for). One failure (offline...) stops them all.
async function download(todo,kind){if(!todo.length)return;
 const total=todo.reduce((s,[,b])=>s+b,0);let got=0,shown=0,next=0,stop=false;
 const one=async()=>{for(;;){const job=!stop&&todo[next++];if(!job)return;const [n,b]=job;try{await grab(n,b);}catch(err){stop=true;throw err;}
  got+=b;if(Date.now()-shown>300){shown=Date.now();tell({type:'sc-download',kind,got,total});}}};
 try{await Promise.all([...Array(6)].map(one));tell({type:'sc-download',kind,got:total,total,done:true});}catch{tell({type:'sc-download',kind,failed:true});}}
// The page's list (version + [name, bytes]): remember the newest KEEP versions' lists, drop files none of them has, then
// download what this version lacks. "later" = files that wait until their game asks for them (songs, Doom: src/pwa.js
// LATER); they stay on the list, so ones already saved are kept. A page older than those is left alone.
async function fill(version,files,later){const a=await caches.open(ART);let lists=[];try{const r=await a.match(LISTS());if(r)lists=await r.json();}catch{}
 lists=[{version,files:files.map(f=>f[0])},...lists.filter(l=>l.version!==version)].sort((x,y)=>newer(x.version,y.version)?-1:newer(y.version,x.version)?1:0).slice(0,KEEP);
 if(!lists.some(l=>l.version===version))return;
 await a.put(LISTS(),new Response(JSON.stringify(lists),{headers:{'content-type':'application/json'}}));
 const want=new Set(lists.flatMap(l=>l.files.map(at))),keys=await a.keys(),have=new Set();want.add(LISTS());
 for(const k of keys){if(want.has(k.url))have.add(k.url);else await a.delete(k);}
 const wait=new Set(Array.isArray(later)?later:[]);
 await download(files.filter(([n])=>!have.has(at(n))&&!wait.has(n)),'app');}
// files a game (or Settings → Download all songs) asked for: whichever of them the cache doesn't have yet
async function fetchWanted(files){const a=await caches.open(ART),todo=[];for(const f of files)if(Array.isArray(f)&&typeof f[0]==='string'&&!await a.match(at(f[0])))todo.push([f[0],+f[1]||0]);await download(todo,'songs');}
let filling=Promise.resolve();
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
 if(u.href.startsWith(at(''))){e.respondWith(file(e));return;}
 if(r.mode==='navigate'){e.respondWith(isGame(r.url)?game(e):fetch(r).catch(()=>caches.open(CACHE).then(c=>c.match('index.html'))));return;}
 e.respondWith(caches.open(CACHE).then(c=>c.match(r,{ignoreSearch:true})).then(hit=>hit||fetch(r)));});
// An update the page asked for ('sc-get', from its Update button): download the newest page in full now, saving it as the
// offline copy, with progress on the message port; the page restarts once it is in. The start of the game only waits
// WAIT for the site, so on a slow network a plain restart kept opening the old copy (owner, Nov 3: "won't update on my wifi").
async function getPage(port){const t0=Date.now(),say=m=>{try{port.postMessage({...m,ms:Date.now()-t0});}catch{}};say({got:0,total:0});
 try{const r=await fetch(new Request(self.registration.scope,{cache:'no-store',credentials:'same-origin'}));
  if(r.status!==200||!r.body)throw new Error('the site answered '+r.status);
  const h=new Headers(r.headers),total=+h.get('content-length')||0,rd=r.body.getReader(),parts=[];let got=0,at=0;
  for(;;){const {done,value}=await rd.read();if(done)break;parts.push(value);got+=value.byteLength;if(Date.now()-at>200){at=Date.now();say({got,total});}}
  if(total&&got<total)throw new Error('download cut off at '+got+' of '+total+' bytes');
  if(!await save(await caches.open(CACHE),new Response(new Blob(parts),{status:200,headers:h})))throw new Error('could not save it on this phone');
  say({done:true,got,total,version:h.get('x-shambconkins-version')||''});
 }catch(err){say({failed:true,error:String(err&&err.message||err)});}}
// first install: the page that registered this file loaded before it was in charge, so it asks to be kept for offline play
// (from the browser's own cache when it still has it, else downloaded once in the background)
self.addEventListener('message',e=>{const d=e.data||{};
 if(d.type==='sc-keep')e.waitUntil(caches.open(CACHE).then(async c=>{if(await c.match('index.html'))return;
  const r=await fetch(new Request(self.registration.scope,{cache:'force-cache',credentials:'same-origin'}));if(r.status===200)await save(c,r);}).catch(()=>{}));
 if(d.type==='sc-get'&&e.ports&&e.ports[0])e.waitUntil(getPage(e.ports[0]));
 if(d.type==='sc-files'&&typeof d.version==='string'&&Array.isArray(d.files))e.waitUntil(filling=filling.then(()=>fill(d.version,d.files,d.later)).catch(()=>{}));
 if(d.type==='sc-want'&&Array.isArray(d.files))e.waitUntil(fetchWanted(d.files).catch(()=>{}));});
`;
  // the release workflow puts these files on Cloudflare, which refuses any file over 25 MiB: fail here, not there
  for (const [name, buf] of [...files, ['index.html', Buffer.from(app)]]) if (buf.length > 24 * 1048576) throw new Error(`app file ${name} is ${(buf.length / 1048576).toFixed(1)} MB; Cloudflare takes files up to 25 MiB`);
  fs.rmSync(pwaDir, {recursive: true, force: true});
  fs.mkdirSync(path.join(pwaDir, 'icons'), {recursive: true});
  fs.mkdirSync(path.join(pwaDir, 'a'));
  for (const [name, buf] of files) fs.writeFileSync(path.join(pwaDir, 'a', name), buf);
  fs.writeFileSync(path.join(pwaDir, 'index.html'), app);
  fs.writeFileSync(path.join(pwaDir, 'manifest.webmanifest'), JSON.stringify(PWA_MANIFEST, null, 1));
  fs.writeFileSync(path.join(pwaDir, 'sw.js'), sw);
  for (const f of PWA_ICONS) fs.copyFileSync(path.join(root, 'assets/pwa', f), path.join(pwaDir, 'icons', f));
  const mb = n => (n / 1048576).toFixed(1) + ' MB';
  console.log(`${path.relative(root, pwaDir)}/  installable app folder: index.html ${mb(app.length)}, a/ ${files.size} files ${mb(assets.reduce((s, [, b]) => s + b, 0))} (built-in art ${artScripts.length} scripts, biggest ${mb(Math.max(...artScripts.map(f => files.get(f.slice(2)).length)))}), sw.js, manifest, icons/  service worker v${SW_VERSION}`);
}
