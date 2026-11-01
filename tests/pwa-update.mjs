// Installed-app updates (src/pwa.js + the sw.js tools/build.mjs --pwa writes). Serves the PWA folder like the game's
// site (cloudflare/worker.js): /version, and the game with ETag "<tag>" + 304 when the phone already has it. Checks:
//  1. first visit: the page is kept for offline play (sc-keep), and opens with the server down;
//  2. a new release: Check for updates says it is out, the Update button shows, Update loads the new version straight
//     away (network-first, like a browser tab), and the new copy is saved;
//  3. an unchanged release: opening sends If-None-Match, gets 304 and plays the saved copy;
//  4. a phone still on the old cache-first service worker (one 200 MB background download per release) moves over:
//     the new sw.js installs at once, keeps the old saved game, drops the old cache, and the next open loads the release.
// Usage: node tools/build.mjs --pwa && node tests/pwa-update.mjs
import {launchBrowser,root,screenshotPath} from './lib.mjs';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
const dir=path.join(root,'dist/pwa');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),cur=html.match(/VERSION='([^']+)'/)[1],next=cur.replace(/(\d+)$/,n=>+n+1);
const nextHtml=html.replace(`VERSION='${cur}'`,`VERSION='${next}'`);
// the cache-first service worker phones have today (before this change), with its own BUILD and cache name
const OLD_SW=`const BUILD="${cur}-old",CACHE='shambconkins-'+BUILD,FILES=["manifest.webmanifest"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all([fetch(new Request('index.html',{cache:'reload'})).then(r=>c.put('index.html',r)),c.addAll(FILES)])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('shambconkins-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 e.respondWith(caches.open(CACHE).then(c=>c.match(r,{ignoreSearch:true}).then(hit=>hit||(r.mode==='navigate'?c.match('index.html'):undefined))).then(hit=>hit||fetch(r)));});`;
const TYPES={html:'text/html; charset=utf-8',js:'text/javascript',webmanifest:'application/manifest+json',png:'image/png'};
let failed=0;const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)failed++;};
let live={tag:cur,html,sw:null},up=true;const hits={game:0,notModified:0};
const srv=await new Promise(res=>{const s=http.createServer((q,r)=>{if(!up){q.socket.destroy();return;}
  const p=decodeURIComponent(new URL(q.url,'http://x').pathname);
  if(p==='/version'){r.writeHead(200,{'content-type':'text/plain','cache-control':'no-store'});r.end('v'+live.tag);return;}
  if(p==='/'||p==='/index.html'){const etag=`"v${live.tag}"`;hits.game++;
   if((q.headers['if-none-match']||'').split(/,\s*/).includes(etag)){hits.notModified++;r.writeHead(304,{etag,'cache-control':'no-cache'});r.end();return;}
   r.writeHead(200,{'content-type':TYPES.html,'cache-control':'no-cache',etag});r.end(live.html);return;}
  if(p==='/sw.js'&&live.sw){r.writeHead(200,{'content-type':TYPES.js,'cache-control':'no-cache'});r.end(live.sw);return;}
  const f=path.join(dir,p.slice(1));if(!fs.existsSync(f)){r.writeHead(404);r.end('missing');return;}
  r.writeHead(200,{'content-type':TYPES[f.split('.').pop()]||'application/octet-stream','cache-control':'no-cache'});fs.createReadStream(f).pipe(r);}).listen(8793,()=>res(s));});
const URL0='http://localhost:8793/';
const browser=await launchBrowser();
async function phone(){const ctx=await browser.newContext({viewport:{width:390,height:780}});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));return {ctx,p,errors};}
const ver=p=>p.evaluate(()=>window.ShambConkins?.version).catch(()=>null);
const saved=p=>p.evaluate(async()=>{const out={};for(const k of await caches.keys())out[k]=!!(await (await caches.open(k)).match('index.html'));return out;});
const until=async(p,f,ms=60000)=>{for(let t=0;t<ms;t+=250){if(await p.evaluate(f).catch(()=>false))return true;await p.waitForTimeout(250);}return false;};
const openGame=async p=>{await p.goto(URL0,{waitUntil:'load',timeout:180000});await until(p,()=>!!window.ShambConkins?.version,60000);};
const dialogText=p=>p.evaluate(()=>document.querySelector('#dialog[open]')?.innerText||'');
async function checkUpdates(p){await p.evaluate(()=>{const b=document.createElement('button');b.dataset.action='check-update';document.body.append(b);b.click();b.remove();});
 await until(p,()=>!!document.querySelector('#dialog[open]'),15000);const t=await dialogText(p);
 await p.evaluate(()=>{const d=document.querySelector('#dialog[open]');[...d.querySelectorAll('button')].find(b=>/later|ok/i.test(b.textContent))?.click();});await p.waitForTimeout(300);return t;}

// ---- 1-3: a fresh phone with the new service worker
{const {ctx,p,errors}=await phone();
 await openGame(p);check(await ver(p)===cur,`first visit runs v${cur}`);
 check(await until(p,async()=>{const c=await caches.open('shambconkins-app');return !!(await c.match('index.html'));},90000),'page kept for offline play after first visit');
 let t=await checkUpdates(p);check(/up to date/i.test(t),`Check for updates: up to date (${t.split('\n')[0]})`);
 up=false;await openGame(p).catch(()=>{});check(await ver(p)===cur,'opens offline from the saved copy');up=true;
 const before={...hits};await openGame(p);check(hits.notModified>before.notModified,`unchanged release: 304 (${hits.notModified-before.notModified}) and the saved copy plays`);
 live={...live,tag:next,html:nextHtml};
 t=await checkUpdates(p);check(new RegExp(`v${next.replace(/\./g,'\\.')} is out`).test(t),`Check for updates: v${next} is out`);
 check(await p.evaluate(()=>!!document.getElementById('sc-ready')&&!document.getElementById('sc-ready').hidden),'Update button shows');
 await p.screenshot({path:screenshotPath('pwa-update-button.png')});
 await Promise.all([p.waitForNavigation({timeout:180000}),p.evaluate(()=>document.querySelector('#sc-ready button').click())]);await until(p,()=>!!window.ShambConkins?.version,60000);
 check(await ver(p)===next,`Update loads v${next} straight away`);
 check(await until(p,async()=>{const c=await caches.open('shambconkins-app'),r=await c.match('index.html');return r&&(r.headers.get('etag')||'').includes(window.ShambConkins.version);},90000),'the new version is saved for offline play');
 up=false;await openGame(p).catch(()=>{});check(await ver(p)===next,'offline opens the new saved copy');up=true;
 check(!errors.length,'no page errors'+(errors.length?': '+errors.slice(0,2).join(' | '):''));await ctx.close();}

// ---- 4: a phone still on the old cache-first service worker
live={tag:cur,html,sw:OLD_SW};
{const {ctx,p,errors}=await phone();
 await openGame(p);check(await until(p,async()=>!!(await caches.open('shambconkins-'+window.ShambConkins.version+'-old').then(c=>c.match('index.html'))),90000),'old service worker saved the game (old style)');
 live={tag:next,html:nextHtml,sw:null};// the release with the new sw.js
 await p.evaluate(()=>navigator.serviceWorker.getRegistration().then(r=>r&&r.update()));
 check(await until(p,async()=>{const r=await navigator.serviceWorker.getRegistration();return !!r?.active&&/shambconkins-app/.test(await (await fetch('sw.js',{cache:'no-store'})).text())&&(await caches.keys()).includes('shambconkins-app')&&(await caches.keys()).length===1;},60000),'new service worker took over and dropped the old cache');
 const s=await saved(p);check(s['shambconkins-app']===true,'the old saved game was kept until the new one comes in');
 await openGame(p);check(await ver(p)===next,`next open loads v${next}`);
 check(!errors.length,'no page errors'+(errors.length?': '+errors.slice(0,2).join(' | '):''));await ctx.close();}
await browser.close();srv.close();
console.log(failed?`pwa-update: ${failed} FAILED`:'pwa-update OK');process.exit(failed?1:0);
