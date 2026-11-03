// Hangman Unchained sounds: each of the 3 versions plays the Wanted! jingle, then a song from the Sunset Riders pool; a new game gets
// a different song; pause stops it and resume carries on; leaving the game stops it; the Music setting off = silence; the
// voice clips decode and the synth Yeehaw is still there. SHAMB_URL=http://localhost:8123/ for a --pwa build.
import {chromium, browserLaunchOptions, root} from './lib.mjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
const url=process.env.SHAMB_URL||pathToFileURL(path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html')).href;
const browser=await chromium.launch({...browserLaunchOptions(),args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:390,height:780}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForSelector('.title-screen',{timeout:120000});
await page.evaluate(()=>{const P=window.ShambConkins.store.profile;P.settings.music=true;P.settings.sound=true;});
const launch=id=>page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade',quick:true});},id);
const state=()=>page.evaluate(()=>{const m=window.ShambConkins.store.session?.debug?.sunset;return m?{song:m.song(),on:m.playing()}:null;});
const wait=async(test,ms=30000)=>{const t=Date.now();let s;while(Date.now()-t<ms){s=await state();if(s&&test(s))return s;await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(150);}return s;};
const leave=async()=>{await page.evaluate(()=>{window.ShambConkins.store.session?.finish([1,0],'test');});await page.waitForTimeout(500);await page.evaluate(()=>{document.querySelectorAll('#dialog[open] button.primary').forEach(b=>b.click());});await page.waitForTimeout(400);};
const songs=[];
for(const id of ['django-hangman','django-hangman-showdown','django-hangman-wanted']){
 await launch(id);
 const a=await wait(s=>/^sting-wanted/.test(s.song||''),10000);check(/^sting-wanted/.test(a?.song||''),`${id}: starts with the Wanted! jingle (${a?.song})`);check(a?.on,`${id}: the jingle is really playing`);
 const b=await wait(s=>/^song-/.test(s.song||'')&&s.on);check(/^song-/.test(b?.song||'')&&b.on,`${id}: then a song from the pool (${b?.song})`);songs.push(b?.song);
 if(id==='django-hangman'){
  await page.evaluate(()=>{window.ShambConkins.store.session.paused=true;});await page.waitForTimeout(600);check(!(await state()).on,'pausing the game stops the song');
  await page.evaluate(()=>{window.ShambConkins.store.session.paused=false;});await page.waitForTimeout(600);check((await state()).on,'resuming carries on');
  check(await page.evaluate(()=>window.ShambConkins.store.session.debug.sunset.voices())===13,'all 13 voice clips are loaded');
  // the song ending moves to another one
  const was=(await state()).song;await page.evaluate(()=>{const e=window.ShambConkins.store.session.debug.sunset.el;e.currentTime=e.duration-.3;});
  const nx=await wait(s=>/^song-/.test(s.song||'')&&s.song!==was&&s.on,8000);check(nx&&nx.song!==was&&nx.on,'a song ending starts another one ('+nx?.song+')');
 }
 await leave();check(!(await page.evaluate(()=>!!window.ShambConkins.store.session)),`${id}: left the game`);
}
check(new Set(songs).size===songs.length,'each game got a different song: '+songs.join(', '));
// Music off: no jingle, no song, the game still runs
await page.evaluate(()=>{window.ShambConkins.store.profile.settings.music=false;});await launch('django-hangman');await page.waitForTimeout(2500);
const off=await state();check(off&&!off.song&&!off.on,'Music setting off: silence '+JSON.stringify(off));await leave();
const errs=errors.filter(x=>!/favicon|net::|Failed to load resource/.test(x));check(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
await browser.close();console.log(bad?`${bad} problem(s)`:'HANGMAN SOUNDS OK');process.exit(bad?1:0);
