// Installed-app updates (src/pwa.js): serves the PWA folder like the game's site (with /version), lets the offline cache
// install, then switches the server to a "next" version (a copy of the folder with the version and sw.js BUILD bumped) and
// checks: Settings → Check for updates says up to date before the switch, then downloads the new one (download bar),
// the Restart pill appears, hides while a minigame is running, and Restart loads the new version. Also: coming back on
// screen asks the browser for an update by itself.
// Usage: node tools/build.mjs --pwa && node tests/pwa-update.mjs
import {launchBrowser,root,screenshotPath} from './lib.mjs';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
const dir=path.join(root,'dist/pwa');
const cur=fs.readFileSync(path.join(dir,'index.html'),'utf8').match(/VERSION='([^']+)'/)[1];
const next=cur.replace(/(\d+)$/,n=>+n+1);
// the "next" release: same game with the version number bumped, and a sw.js with a new BUILD
const dir2=fs.mkdtempSync(path.join(os.tmpdir(),'sc-pwa-next-'));
fs.cpSync(dir,dir2,{recursive:true});
fs.writeFileSync(path.join(dir2,'index.html'),fs.readFileSync(path.join(dir,'index.html'),'utf8').replace(`VERSION='${cur}'`,`VERSION='${next}'`));
fs.writeFileSync(path.join(dir2,'sw.js'),fs.readFileSync(path.join(dir,'sw.js'),'utf8').replace(/const BUILD="[^"]*"/,`const BUILD="${next}-test"`));
const TYPES={html:'text/html',js:'text/javascript',webmanifest:'application/manifest+json',png:'image/png'};
let failed=0;const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)failed++;};
let live=dir,liveTag=cur,swAsks=0;
const srv=await new Promise(res=>{const s=http.createServer((q,r)=>{const p=decodeURIComponent(new URL(q.url,'http://x').pathname);
  if(p==='/version'){r.writeHead(200,{'content-type':'text/plain','cache-control':'no-store'});r.end('v'+liveTag);return;}
  if(p==='/sw.js')swAsks++;
  const f=path.join(live,p==='/'?'index.html':p.slice(1));
  if(!fs.existsSync(f)){r.writeHead(404);r.end('missing');return;}
  r.writeHead(200,{'content-type':TYPES[f.split('.').pop()]||'application/octet-stream','cache-control':'no-cache'});fs.createReadStream(f).pipe(r);}).listen(8793,()=>res(s));});
const browser=await launchBrowser();
const ctx=await browser.newContext({viewport:{width:390,height:780}});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.__dl=[];navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='sc-download')window.__dl.push(e.data);});});
const ver=()=>p.evaluate(()=>window.ShambConkins?.version);
const dialogText=()=>p.evaluate(()=>document.querySelector('#dialog[open]')?.innerText||'');
const closeDialog=()=>p.evaluate(()=>{const b=[...document.querySelectorAll('#dialog[open] button')].find(b=>/OK|Later|Back to it/.test(b.textContent));b?.click();});
const checkNow=async()=>{await p.evaluate(()=>{const b=document.createElement('button');b.dataset.action='check-update';document.body.append(b);b.click();b.remove();});
 await p.waitForFunction(()=>/Up to date|downloading|is ready|Couldn|Opened as a file/.test(document.querySelector('#dialog[open]')?.innerText||''),null,{timeout:30000});return dialogText();};

// 1. first visit installs the offline cache; reopen so this page runs under it
await p.goto('http://localhost:8793/');await p.waitForSelector('.title-screen',{timeout:60000});
await p.waitForFunction(()=>window.__dl.some(m=>m.done),null,{timeout:120000});
await p.reload();await p.waitForSelector('.title-screen',{timeout:60000});
check(await p.evaluate(()=>!!navigator.serviceWorker.controller),'the offline cache runs the page');
check(await ver()===cur,`running v${cur}`);
// Settings shows the version and the button
await p.evaluate(()=>{const b=document.createElement('button');b.dataset.action='settings';document.body.append(b);b.click();b.remove();});
await p.waitForSelector('#dialog[open] [data-action="check-update"]',{timeout:10000});
check(new RegExp(`Version ${cur.replace(/\./g,'\\.')}`).test(await dialogText()),'Settings shows the version and Check for updates');
await closeDialog();
// 2. nothing new yet
let t=await checkNow();check(/Up to date/.test(t),'Check for updates: up to date before a release');await closeDialog();
// 3. a release comes out: the check downloads it with the bar, then the Restart pill shows
live=dir2;liveTag=next;
t=await checkNow();check(/downloading/.test(t),`Check for updates after the release says v${next} is downloading`);await closeDialog();
await p.waitForSelector('#sc-ready:not([hidden])',{timeout:120000}).catch(()=>{});
check(await p.evaluate(()=>window.__dl.some(m=>m.got>0&&!m.done)),'the download bar showed progress');
check(await p.evaluate(()=>!!document.getElementById('sc-ready')&&!document.getElementById('sc-ready').hidden),'Restart pill shows once the update is in');
await p.screenshot({path:screenshotPath('pwa-update-ready.png')});
check(await ver()===cur,'the page keeps running the old version until Restart');
t=await checkNow();check(/is ready/.test(t),'Check for updates now says it is ready');await closeDialog();
// hidden while a minigame runs (store.session), back after
await p.evaluate(()=>{window.ShambConkins.store.session={};});await p.waitForTimeout(1300);
check(await p.evaluate(()=>document.getElementById('sc-ready').hidden),'Restart pill hides during a minigame');
await p.evaluate(()=>{window.ShambConkins.store.session=null;});await p.waitForTimeout(1300);
check(await p.evaluate(()=>!document.getElementById('sc-ready').hidden),'and comes back after it');
// 4. Restart loads the new version
await Promise.all([p.waitForNavigation({timeout:60000}),p.click('#sc-ready button')]);
await p.waitForSelector('.title-screen',{timeout:60000});
check(await ver()===next,`Restart loads v${next} (got v${await ver()})`);
// 5. coming back on screen asks for an update by itself (throttled to every 5 min, so pretend 6 min passed)
const before=swAsks;
await p.evaluate(()=>{const now=Date.now;Date.now=()=>now()+6*60*1000;Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
await p.waitForTimeout(1500);
check(swAsks>before,'coming back on screen checks sw.js for an update');
check(!errors.length,'no page errors '+errors.slice(0,3).join(' | '));
await browser.close();srv.close();fs.rmSync(dir2,{recursive:true,force:true});
console.log(failed?`PWA UPDATE FAILED (${failed})`:'PWA UPDATE OK');process.exit(failed?1:0);
