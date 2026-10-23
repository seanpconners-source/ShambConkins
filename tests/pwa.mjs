// Installable app (src/pwa.js + `node tools/build.mjs --pwa`). Serves the PWA folder on localhost and checks Chrome's
// installability report, the offline cache (reload with the network off), the title-screen install button and the
// browser prompt; then serves the bare game HTML (no folder) and checks the built-in manifest; then file:// stays plain.
// Usage: node tools/build.mjs --pwa && node tests/pwa.mjs
import {launchBrowser,root,screenshotPath} from './lib.mjs';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const dir=path.join(root,'dist/pwa'),single=path.join(root,'dist/ShambConkins.html');
const TYPES={html:'text/html',js:'text/javascript',webmanifest:'application/manifest+json',png:'image/png'};
let failed=0;const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)failed++;};
function serve(port,files){return new Promise(res=>{const s=http.createServer((q,r)=>{const p=decodeURIComponent(new URL(q.url,'http://x').pathname);const f=files(p);
  if(!f||!fs.existsSync(f)){r.writeHead(404);r.end('missing');return;}r.writeHead(200,{'content-type':TYPES[f.split('.').pop()]||'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(port,()=>res(s));});}
const browser=await launchBrowser();
async function page(url,size={width:390,height:780}){const ctx=await browser.newContext({viewport:size});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url);await p.waitForSelector('.title-screen',{timeout:60000});return {ctx,p,errors};}
const cdpInfo=async p=>{const c=await p.context().newCDPSession(p);const m=await c.send('Page.getAppManifest');const i=await c.send('Page.getInstallabilityErrors');return {url:m.url,errs:m.errors,parsed:m.data?JSON.parse(m.data):null,install:i.installabilityErrors.map(e=>e.errorId)};};
// 1. the PWA folder
const srv=await serve(8791,p=>path.join(dir,p==='/'?'index.html':p.slice(1)));
let {ctx,p,errors}=await page('http://localhost:8791/');
await p.waitForFunction(()=>navigator.serviceWorker?.controller||null,null,{timeout:120000}).catch(()=>{});
await p.reload();await p.waitForSelector('.title-screen');
let info=await cdpInfo(p);
check(/manifest\.webmanifest$/.test(info.url)&&!info.errs.length,'folder manifest linked and parsed: '+info.url);
check(info.parsed?.display==='standalone'&&info.parsed?.icons?.length===3,'standalone display, 3 icons');
check(!info.install.length,'Chrome installability errors: '+JSON.stringify(info.install));
check(await p.evaluate(()=>!!navigator.serviceWorker.controller),'service worker controls the page');
check(await p.evaluate(async()=>{const k=await caches.keys();const c=await caches.open(k.find(x=>x.startsWith('shambconkins-')));return !!await c.match('index.html');}),'game cached for offline');
check(await p.evaluate(()=>[...document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]')].every(l=>l.href.startsWith('data:image/png'))),'favicon + apple-touch-icon embedded');
check(await p.evaluate(()=>document.querySelector('.ts-install')?.hidden===true),'install icon hidden until the browser offers an install');
// the browser offers an install: fake its event, then tap the icon
await p.evaluate(()=>{window.__prompted=0;const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{window.__prompted++;};e.userChoice=Promise.resolve({outcome:'accepted'});dispatchEvent(e);});
check(await p.evaluate(()=>document.querySelector('.ts-install')?.hidden===false),'install icon appears when the browser offers an install');
await p.screenshot({path:screenshotPath('pwa-title-install.png')});
await p.click('.ts-install');await p.waitForTimeout(400);
check(await p.evaluate(()=>window.__prompted===1),'tapping it opens the browser install prompt');
check(await p.evaluate(()=>document.querySelector('.ts-install')?.hidden===true),'icon hides again after the prompt');
// Settings row with no browser prompt available: explains the browser menu
await p.click('[data-action="settings"]');await p.waitForSelector('#dialog [data-action="install-app"]');await p.click('#dialog [data-action="install-app"]');
await p.waitForFunction(()=>/Install ShambConkins/.test(document.querySelector('#dialog')?.innerText||''));check(true,'Settings → Install explains the browser menu when there is no prompt');
// offline relaunch
await ctx.setOffline(true);await p.goto('http://localhost:8791/');await p.waitForSelector('.title-screen',{timeout:60000});
check(await p.evaluate(()=>!!window.ShambConkins?.store?.profile),'game starts with the network off (from the cache)');
check(!errors.length,'no page errors '+errors.slice(0,2).join(' | '));await ctx.close();srv.close();
// 2. only the game HTML on a server (no PWA folder): manifest made from the embedded icons
const srv2=await serve(8792,p=>p==='/ShambConkins.html'?single:null);
({ctx,p,errors}=await page('http://localhost:8792/ShambConkins.html'));await p.waitForTimeout(1500);info=await cdpInfo(p);
check(info.url.startsWith('blob:')&&info.parsed?.start_url==='http://localhost:8792/ShambConkins.html','built-in manifest for a bare HTML: '+info.parsed?.start_url);
check(info.parsed?.icons?.every(i=>i.src.startsWith('data:image/png')),'its icons are embedded');
console.log('     bare-HTML installability (informational): '+JSON.stringify(info.install));
check(await p.evaluate(()=>!navigator.serviceWorker.controller),'no service worker without the folder');
check(!errors.length,'no page errors '+errors.slice(0,2).join(' | '));await ctx.close();srv2.close();
// 3. opened as a file: plain page, no manifest
({ctx,p,errors}=await page(pathToFileURL(single).href));
check(await p.evaluate(()=>!document.querySelector('link[rel="manifest"]')&&document.querySelector('.ts-install')?.hidden===true),'file:// page: no manifest, no install icon');
check(!errors.length,'no page errors '+errors.slice(0,2).join(' | '));await ctx.close();
await browser.close();console.log(failed?`${failed} PWA check(s) failed`:'PWA OK');process.exit(failed?1:0);
