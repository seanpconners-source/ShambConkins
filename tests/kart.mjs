// Mario Kart warp games: course select, side-by-side race with CPU racers, drifting into a mini-turbo, time trials
// with P1's ghost, and balloon battle. Screenshots every phase (OUT=/tmp/claude-0/sc by default).
// Usage: SHAMB_FILE=/tmp/x.html node tests/kart.mjs [mode-regex] [course]
import {open} from './lib.mjs';
import fs from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';fs.mkdirSync(out,{recursive:true});let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
const re=new RegExp(process.argv[2]||'.'),courses=['rainbow','bowser','beach','jungle','meadow'],only=process.argv[3];
const runs=[['rainbow-road-kart',[844,390]],['rainbow-road-kart',[390,780]],['rainbow-road-kart',[1100,700]],['kart-time-trial',[844,390]],['kart-time-trial',[390,780]],['rainbow-balloon-battle',[844,390]]].filter(([id])=>re.test(id));
let ci=0;
for(const [id,[w,h]] of runs){
 const course=only||courses[ci++%courses.length],tag=`kart-${id.split('-').slice(-1)[0]}-${course}-${w}x${h}`;
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);
 await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d||!d.K)return null;return {phase:d.phase,clock:d.clock,turn:d.turn,course:d.course,
  K:d.K.map(k=>({x:Math.round(k.x),y:Math.round(k.y),v:Math.round(k.v),lap:k.lap,prog:+k.prog.toFixed(3),place:k.place,drift:k.drift,tier:k.tier,boost:+k.boost.toFixed(2),finished:k.finished,cpu:k.cpu,fall:+k.fall.toFixed(2),balloons:k.balloons})),ghost:d.ghost.length,results:d.results?.map(r=>r.k.name+' '+r.time)};});
 const until=async(test,ms=15000)=>{let d;for(let t=0;t<ms;t+=150){d=await D();if(d&&test(d))return d;await page.waitForTimeout(150);}return d;};
 const pass=async()=>{for(let i=0;i<40;i++){const b=await page.$('.pass-overlay [data-ready]');if(b){await b.click();return true;}await page.waitForTimeout(150);}return false;};
 const dbg=(fn,...a)=>page.evaluate(([fn,a])=>window.ShambConkins.store.session.debug[fn](...a),[fn,a]);
 const setAuto=(i,v)=>page.evaluate(([i,v])=>{window.ShambConkins.store.session.debug.auto[i]=v;},[i,v]);
 if(!/battle/.test(id)){
  let d=await until(d=>d.phase==='select',8000);if(d?.phase!=='select'){fail(`${tag} no course select (${d?.phase})`);await browser.close();continue;}
  await page.waitForTimeout(500);await page.screenshot({path:`${out}/${tag}-select.png`});
  await dbg('pick',course);
 }
 if(/time-trial/.test(id)){
  for(const t of [0,1]){
   if(!await pass())fail(`${tag} no hand-off for turn ${t}`);
   let d=await until(d=>d.phase==='count'&&d.turn===t,6000);await page.waitForTimeout(1300);await page.screenshot({path:`${out}/${tag}-count${t}.png`});
   d=await until(d=>d.phase==='play');
   if(t===0){// drift: hold a hard turn, then let go for the mini-turbo
    await page.waitForTimeout(1300);await page.keyboard.down('d');let drifted=false,tier=0;for(let k=0;k<12;k++){await page.waitForTimeout(110);d=await D();if(d.K[0].drift)drifted=true;tier=Math.max(tier,d.K[0].tier);if(k===9)await page.screenshot({path:`${out}/${tag}-drift.png`});}
    await page.keyboard.up('d');await page.waitForTimeout(150);d=await D();
    if(!drifted)fail(`${tag} no drift while holding a turn`);if(tier<1)fail(`${tag} drift never charged (tier ${tier})`);else if(!(d.K[0].boost>0)&&!(d.K[0].fall>0))fail(`${tag} no mini-turbo after the drift (${JSON.stringify(d.K[0])})`);
    console.log(tag,'drift tier',tier,'boost',d.K[0].boost);}
   await setAuto(t,true);await page.waitForTimeout(2500);await page.screenshot({path:`${out}/${tag}-run${t}.png`});
   await dbg('finishLap',t);d=await until(d=>d.phase==='turn-end'||d.phase==='end',20000);
   if(!['turn-end','end'].includes(d.phase))fail(`${tag} turn ${t} did not end (${JSON.stringify(d)})`);
   await page.waitForTimeout(600);await page.screenshot({path:`${out}/${tag}-${t?'end':'turnend'}.png`});
   if(t===0)console.log(tag,'ghost frames',d.ghost);
  }
 }else if(/battle/.test(id)){
  let d=await until(d=>d.phase==='play');await setAuto(0,true);await setAuto(1,true);await page.waitForTimeout(3000);await page.screenshot({path:`${out}/${tag}-play.png`});
  await dbg('setClock',89.5);d=await until(d=>d.phase==='end',6000);if(d.phase!=='end')fail(`${tag} battle did not end`);await page.waitForTimeout(800);await page.screenshot({path:`${out}/${tag}-end.png`});
 }else{
  let d=await until(d=>d.phase==='count',6000);await page.waitForTimeout(1500);await page.screenshot({path:`${out}/${tag}-count.png`});
  d=await until(d=>d.phase==='play');if(d.K.length!==6)fail(`${tag} expected 6 racers, got ${d.K.length}`);
  // P1 drifts by keyboard, P2 drives itself
  await setAuto(1,true);await page.keyboard.down('d');let drifted=false;for(let k=0;k<14;k++){await page.waitForTimeout(110);d=await D();if(d.K[0].drift)drifted=true;}await page.screenshot({path:`${out}/${tag}-drift.png`});await page.keyboard.up('d');
  if(!drifted)fail(`${tag} P1 never drifted`);
  await setAuto(0,true);await page.waitForTimeout(4000);await page.screenshot({path:`${out}/${tag}-race.png`});
  d=await D();const cpuMoved=d.K.slice(2).every(k=>k.prog>0.02||k.lap>0);if(!cpuMoved)fail(`${tag} CPUs not racing ${JSON.stringify(d.K)}`);
  console.log(tag,'places',d.K.map(k=>k.place).join(','),'prog',d.K.map(k=>k.prog).join(','));
  await dbg('finishLap',0);await dbg('finishLap',1);d=await until(d=>d.phase==='end',25000);if(d.phase!=='end')fail(`${tag} race did not end (${JSON.stringify(d.K.slice(0,2))})`);
  await page.waitForTimeout(1200);await page.screenshot({path:`${out}/${tag}-results.png`});console.log(' results',JSON.stringify(d.results));
 }
 let res=null;for(let i=0;i<60&&!res;i++){await page.waitForTimeout(250);res=await page.evaluate(()=>{const d=document.getElementById('dialog');return d.open?d.innerText.slice(0,180):null;});}
 if(!res)fail(`${tag} no result dialog`);console.log(' result:',res&&res.replace(/\n+/g,' | '));
 if(errors.length)fail(`${tag} errors ${errors.join(' ; ')}`);
 await browser.close();
}
console.log(ok?'kart OK':'kart FAILED');process.exit(ok?0:1);
