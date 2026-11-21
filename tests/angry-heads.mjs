// Angry Heads (angry-heads) in the browser: the episode map, a level played by the autopilot to its result card with
// stars saved, 1P buttons (next / map), and a 2P pass-and-play game to the final result. Screenshots to $OUT (default
// /tmp/claude-0/sc/ahx-*). Usage: node tests/angry-heads.mjs [WxH]
import {chromium,browserLaunchOptions,appURL} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
const [vw,vh]=(process.argv[2]||'844x390').split('x').map(Number);
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);},pass=m=>console.log('  ok  ',m);
const browser=await chromium.launch(browserLaunchOptions()),page=await browser.newPage({viewport:{width:vw,height:vh}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const open=async()=>{await page.goto(await appURL(),{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:60000});await page.waitForTimeout(300);};
const S=(fn,a)=>page.evaluate(fn,a);const dbg=fn=>page.evaluate(fn=>{const d=window.ShambConkins.store.session?.debug;return d?new Function('d',fn)(d):null;},fn);
const clickReady=()=>S(()=>{const b=document.querySelector('.pass-overlay [data-ready]:not(:disabled)')||[...document.querySelectorAll('#dialog[open] button')].find(b=>/start|ready/i.test(b.textContent));b?.click();return !!b;});
const until=async(fn,ms=20000)=>{const t0=Date.now();while(Date.now()-t0<ms){const v=await fn();if(v)return v;await page.waitForTimeout(150);}return null;};
const shot=n=>page.screenshot({path:`${out}/ahx-${n}-${vw}.png`});
// ---- 1P: map → level 1 → autopilot → result → stars saved → next level starts
await open();await S(()=>{const st=window.ShambConkins.store.profile;st.angryHeads={stars:{},best:{}};st.settings.solo={...(st.settings.solo||{}),on:true};});
await S(()=>{const b=document.createElement('button');b.dataset.action='arcade-solo';b.dataset.id='angry-heads';document.body.append(b);b.click();b.remove();});
await until(clickReady,8000);const m=await until(()=>dbg('return d.phase==="map"&&d.episodes().length'),15000);await page.waitForTimeout(800);await shot('map');
if(!(m>50))fail('map has '+m+' worlds');else pass(`map: ${m} worlds`);
await dbg('d.pick(0)');await until(()=>dbg('return d.phase==="aim"'),10000);await dbg('d.autopilot=true');
const res=await until(()=>dbg('return d.phase==="result"&&d.score'),90000);await page.waitForTimeout(1500);await shot('result');
const st=await S(()=>window.ShambConkins.store.profile.angryHeads?.stars?.[0]);if(!res)fail('level 1 never finished');else pass(`level 1 finished: ${res} points, stars saved ${st}`);if(res&&!st)fail('a cleared level did not save stars (or the autopilot failed it)');
await dbg('d.autopilot=false;d.choose("next")');const n2=await until(()=>dbg('return d.level?.n===1&&d.phase'),8000);if(!n2)fail('Next did not start level 2');else pass('Next → level 2');
await dbg('d.choose&&0');
// ---- 2P on one phone: three levels each to the result
await open();await S(()=>{window.ShambConkins.store.profile.settings.solo={...(window.ShambConkins.store.profile.settings.solo||{}),on:false};window.ShambConkins.requestGame({id:'angry-heads',origin:'arcade'});});
await until(clickReady,8000);await until(()=>dbg('return d.phase==="map"'),15000);await dbg('d.pick(0)');
let turns=0;const t0=Date.now();
while(Date.now()-t0<400000){const r=await S(()=>{const s=window.ShambConkins.store.session;const dlg=document.querySelector('#dialog[open]');if(!s?.alive&&dlg)return 'end:'+dlg.textContent.slice(0,120);const d=s?.debug;if(!d)return 'none';
  const b=document.querySelector('.pass-overlay [data-ready]:not(:disabled)');if(b){b.click();return 'ready';}d.autopilot=true;if(d.phase==='result')window.dispatchEvent(new Event('noop'));return d.phase;});
 if(r.startsWith('end:')){pass('2P result: '+r.replace(/\s+/g,' ').slice(4,110));break;}if(r==='ready')turns++;
 if(r==='result'){await page.waitForTimeout(3400);await page.mouse.click(vw/2,vh/2);}await page.waitForTimeout(400);}
if(turns<5)fail('2P took '+turns+' turns');else pass(`2P: ${turns} hand-offs`);
if(errors.length)fail('page errors: '+errors.slice(0,3).join(' | '));
console.log(ok?'angry heads OK':'angry heads FAILED');await browser.close();process.exit(ok?0:1);
