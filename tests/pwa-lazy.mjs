// Songs on first open (ROADMAP Q5-3): the installed app downloads every picture at install but leaves the songs and the
// Doom data (src/pwa.js LATER) until their game opens; Settings → Download all now fetches the rest. Needs a served
// --pwa build: SHAMB_URL=http://localhost:8124/ (tools/serve-static.mjs <app folder> 8124).
import {chromium,browserLaunchOptions} from './lib.mjs';
import fs from 'node:fs';
const SONG_FILES=new Set(fs.readdirSync(new URL('../assets/music/',import.meta.url)).filter(f=>/^(bhpin|kgpin|bspin|thps|sunset)-.*\.(mp3|wav)$/.test(f)).map(f=>fs.readFileSync(new URL('../assets/music/'+f,import.meta.url)).length+':'+f.split('.').pop())).size;
const URL0=process.env.SHAMB_URL||'http://localhost:8124/';
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
const browser=await chromium.launch(browserLaunchOptions());
const ctx=await browser.newContext({viewport:{width:390,height:780}}),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(URL0);await page.waitForSelector('.title-screen',{timeout:120000});
// the first open isn't controlled by the service worker yet: reload once it is, as a real install does
await page.waitForFunction(()=>navigator.serviceWorker?.controller||null,null,{timeout:30000}).catch(()=>{});
await page.reload();await page.waitForSelector('.title-screen',{timeout:120000});
const counts=()=>page.evaluate(async()=>{const c=await caches.open('sc-assets'),keys=(await c.keys()).map(r=>r.url);return {all:keys.length,mp3:keys.filter(u=>u.endsWith('.mp3')).length,songs:keys.filter(u=>/\.(mp3|wav)$/.test(u)).length,webp:keys.filter(u=>u.endsWith('.webp')).length,bin:keys.filter(u=>u.endsWith('.bin')).length};});
let c=null;for(let t=0;t<120;t++){c=await counts();if(c.webp>2000)break;await page.waitForTimeout(1000);}
await page.waitForTimeout(3000);c=await counts();
check(c.webp>2000,`install saves the pictures (${c.webp} WebP files)`);
check(c.mp3===0&&c.bin===0,`but no songs or Doom data yet (${c.mp3} MP3, ${c.bin} .bin)`);
const songsRow=await page.evaluate(async()=>{document.querySelector('[data-action="settings"]')?.click();await new Promise(r=>setTimeout(r,500));const t=document.querySelector('#dialog[open]')?.innerText||'';document.querySelector('#dialog[open] button.primary, #dialog[open] .dialog-actions button')?.click();return t;});
check(/Songs for offline play \(\d+ MB/.test(songsRow),`Settings offers the songs download: "${(songsRow.match(/Songs for offline play[^\n]*/)||[''])[0]}"`);
// open Hangman: its Sunset Riders songs come in
await page.evaluate(()=>{void window.ShambConkins.requestGame({id:'django-hangman-showdown',origin:'arcade',quick:true});});
for(let t=0;t<60&&(await counts()).mp3<40;t++)await page.waitForTimeout(1000);
c=await counts();check(c.mp3>=40&&c.mp3<120,`opening Hangman downloads its songs and only those (${c.mp3} MP3)`);
await page.evaluate(()=>{const s=window.ShambConkins.store.session;if(s)s.finish([0,0],'test');});await page.waitForTimeout(1500);
await page.evaluate(()=>{const d=document.querySelector('#dialog[open]');if(d)[...d.querySelectorAll('button')].find(b=>/back|arcade|done|ok/i.test(b.textContent))?.click();});
// Settings → Download all now
await page.evaluate(()=>{const b=document.createElement('button');b.dataset.action='offline-songs';document.body.append(b);b.click();b.remove();});
for(let t=0;t<180;t++){c=await counts();if(c.bin>=1&&c.songs>=SONG_FILES-2)break;await page.waitForTimeout(1000);}
check(c.bin>=1&&c.songs>=SONG_FILES-2,`Download all now saves every song and the Doom data (${c.songs} of ~${SONG_FILES} song files, ${c.bin} .bin)`);
const errs=errors.filter(x=>!/favicon|net::|Failed to load resource|Failed to fetch/.test(x));check(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
await browser.close();console.log(bad?`${bad} problem(s)`:'PWA LAZY OK');process.exit(bad?1:0);
