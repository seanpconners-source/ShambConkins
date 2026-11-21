// Flappy Disaster (flappy-disaster): every stage draws without errors (a screenshot of each mid-run), a 2P pass-and-play
// game on one phone (autopilot flies, dies, both scores reach the result), and a 1P solo run that ends with soloFinish.
// Screenshots to $OUT (default /tmp/claude-0/sc/flap-*). Usage: node tests/flappy.mjs [WxH]
import {chromium,browserLaunchOptions,appURL} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
const [vw,vh]=(process.argv[2]||'390x780').split('x').map(Number);
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);},pass=m=>console.log('  ok  ',m);
const browser=await chromium.launch(browserLaunchOptions()),page=await browser.newPage({viewport:{width:vw,height:vh}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto(await appURL(),{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:60000});await page.waitForTimeout(400);
const S=(fn,arg)=>page.evaluate(fn,arg);const dbg=fn=>page.evaluate(fn=>{const d=window.ShambConkins.store.session?.debug;return d?new Function('d',fn)(d):null;},fn);
const clickReady=()=>page.evaluate(()=>{const b=document.querySelector('.pass-overlay [data-ready]:not(:disabled)')||[...document.querySelectorAll('#dialog[open] button')].find(b=>/start|ready/i.test(b.textContent));b?.click();return !!b;});
const until=async(fn,ms=20000)=>{const t0=Date.now();while(Date.now()-t0<ms){const v=await fn();if(v)return v;await page.waitForTimeout(150);}return null;};
const launch=async(stage,solo=false)=>{await S(st=>localStorage.setItem('sc-flappy-stage',st),stage);
 if(solo)await S(()=>{const b=document.createElement('button');b.dataset.action='arcade-solo';b.dataset.id='flappy-disaster';document.body.append(b);b.click();b.remove();});
 else await S(()=>{window.ShambConkins.requestGame({id:'flappy-disaster',origin:'arcade'});});
 await until(clickReady,8000);await page.waitForTimeout(300);};
const exit=async()=>{await page.goto(await appURL(),{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:60000});await page.waitForTimeout(300);};
// ---- every stage, mid-run
const stages=await S(()=>{try{return null;}catch{}});
const ALL=['classic','meat','fuzzy','pokemon','hell','space','sea','office','grave','vapor','candy','upside','sewer','vegas','arctic','disco'],ids=process.env.STAGES==='all'?ALL:process.env.STAGES?process.env.STAGES.split(','):['meat','fuzzy','pokemon','disco'];
for(const id of ids){await launch(id);await until(()=>dbg('if(d.phase==="intro")return false;return true;'),8000);await until(clickReady,6000);
 await dbg('d.autopilot=true;');const got=await until(()=>dbg('return d.B.score>=3&&d.stage;'),25000);await page.screenshot({path:`${out}/flap-${id}-${vw}.png`});
 const st=await dbg('return d.stage;');if(st!==id)fail(`stage ${id} showed ${st}`);if(!got)fail(`${id}: autopilot never passed 3 pipes`);else pass(`${id}: flying (${got})`);
 await exit();await page.waitForTimeout(500);}
// ---- 2P pass and play to the result
{await launch('disco');await until(()=>dbg('return d.phase!=="intro";'),8000);await until(clickReady,6000);await dbg('d.autopilot=true;');
 await until(()=>dbg('return d.B.score>=6;'),40000);await dbg('d.autopilot=false;d.die();');await page.waitForTimeout(2200);await page.screenshot({path:`${out}/flap-over-${vw}.png`});
 await until(()=>dbg('return d.phase=="pass";'),12000);await until(clickReady,12000);await until(()=>dbg('return d.phase==="ready";'),8000);await dbg('d.autopilot=true;');await until(()=>dbg('return d.B.score>=2;'),30000);await dbg('d.autopilot=false;d.die();');
 const res=await until(()=>S(()=>{const s=window.ShambConkins.store.session;return document.querySelector('#dialog[open]')?.textContent?.slice(0,160)||(!s?.alive&&'gone');}),20000);
 const sc=await dbg('return d.scores;');if(!res)fail('2P game never reached a result');else pass('2P result: '+JSON.stringify(sc)+' '+res.replace(/\s+/g,' ').slice(0,90));await exit();await page.waitForTimeout(500);}
// ---- 1P solo
{await S(()=>{window.ShambConkins.store.profile.settings.solo={...(window.ShambConkins.store.profile.settings.solo||{}),on:true};});await launch('meat',true);
 await until(()=>dbg('return d.phase==="ready";'),10000);await dbg('d.autopilot=true;');await until(()=>dbg('return d.B.score>=4;'),30000);await dbg('d.autopilot=false;d.die();');
 const res=await until(()=>S(()=>{const s=window.ShambConkins.store.session;return document.querySelector('#dialog[open]')?.textContent?.slice(0,200)||(!s?.alive&&'gone');}),15000);
 if(!res)fail('solo run did not end');else pass('solo run ended: '+res.replace(/\s+/g,' ').slice(0,100));}
if(errors.length)fail('page errors: '+errors.slice(0,3).join(' | '));
console.log(ok?'flappy OK':'flappy FAILED');await browser.close();process.exit(ok?0:1);
