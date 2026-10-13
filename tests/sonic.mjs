// Sonic warp games: runs both modes at phone and desktop size with keyboard play. Players take turns on the full
// screen (P1 Sonic, P2 Tails): checks the physics moves each runner, rings get collected, P1's ghost is recorded and shown
// during P2's turn, the race turn ends at the signpost, and the boss act locks the arena, takes 8 hits, drops the
// capsule (opened by jumping on it) and records the pilot as a recruit. Screenshots each phase.
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
for(const id of ['sonic-ring-rush','sonic-goal-dash'])for(const [w,h] of [[390,780],[1100,700]]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`${id}-${w}`;
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);
 await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d)return null;return {phase:d.phase,turn:d.turn,clock:d.clock,ghost:d.ghost.length,pl:d.pl.map(p=>({x:Math.round(p.x),y:Math.round(p.y),rings:p.rings,finished:p.finished,on:p.on,dead:p.dead,best:Math.round(p.best)})),end:d.L.end,loops:d.L.loops.length};});
 const ready=async t=>{for(let i=0;i<80;i++){const d=await D();if(d?.phase==='play'&&d.turn===t)return d;if(d?.phase==='handoff'&&i%4===0)await page.screenshot({path:`${out}/${tag}-handoff${t}.png`});await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(150);}return D();};
 await page.waitForTimeout(1300);await page.screenshot({path:`${out}/${tag}-title.png`});
 for(const t of [0,1]){
  let d=await ready(t);if(d?.phase!=='play'||d.turn!==t){fail(`${tag} turn ${t} never started (${JSON.stringify(d)})`);break;}
  await page.keyboard.down('d');await page.keyboard.down('ArrowRight');
  let looped=false,peak=0;
  for(let k=0;k<50;k++){await page.waitForTimeout(150);if(k%9===4){await page.keyboard.down(t?'ArrowUp':'w');await page.waitForTimeout(220);await page.keyboard.up(t?'ArrowUp':'w');}
   d=await D();if(!d)break;const p=d.pl[t];if(p.on==='loop')looped=true;peak=Math.max(peak,p.rings);if(k===20)await page.screenshot({path:`${out}/${tag}-run${t}.png`});if(d.phase!=='play')break;}
  d=await D();console.log(tag,'turn',t,JSON.stringify(d),'looped',looped);
  if(!d||d.pl[t].best<800)fail(`${tag} P${t+1} did not progress`);
  if(peak===0)fail(`${tag} P${t+1} collected no rings`);
  if(t===0&&(d.pl[1].x!==140||d.pl[1].best!==0))fail(`${tag} P2 moved during P1's turn`);
  if(t===1&&d.ghost<100)fail(`${tag} no ghost recorded (${d.ghost})`);
  if(id==='sonic-goal-dash'){await page.evaluate(t=>{const s=window.ShambConkins.store.session;s.debug.teleport(t,s.debug.L.end-80);},t);await page.waitForTimeout(1200);await page.screenshot({path:`${out}/${tag}-goal${t}.png`});}
  else{const B=()=>page.evaluate(t=>window.ShambConkins.store.session.debug.boss(t),t);
   await page.evaluate(t=>{const s=window.ShambConkins.store.session;s.debug.teleport(t,s.debug.L.arena.x0-60);},t);
   let b;for(let k=0;k<40;k++){await page.waitForTimeout(150);b=await B();if(b.state==='fight')break;}
   if(b.state!=='fight'){fail(`${tag} boss never started (${JSON.stringify(b)})`);}
   await page.keyboard.up('d');await page.keyboard.up('ArrowRight');await page.waitForTimeout(900);await page.screenshot({path:`${out}/${tag}-boss${t}.png`});
   // the wrecking ball should knock a standing player around at least once in a few seconds of standing under it
   for(let k=0;k<120&&(await B()).hp>0;k++){await page.evaluate(t=>window.ShambConkins.store.session.debug.hitBoss(t),t);await page.waitForTimeout(160);if(k===3)await page.screenshot({path:`${out}/${tag}-bosshit${t}.png`});}
   b=await B();if(b.hp>0)fail(`${tag} boss not beaten (${b.hp})`);await page.waitForTimeout(600);await page.screenshot({path:`${out}/${tag}-bossdie${t}.png`});
   for(let k=0;k<40;k++){await page.waitForTimeout(150);b=await B();if(b.cap&&b.cap.drop>=0)break;}
   if(!b.cap)fail(`${tag} no capsule`);
   // drop onto the capsule's button from above (the real collision opens it)
   await page.evaluate(([t,x,y])=>window.ShambConkins.store.session.debug.place(t,x,y-110),[t,b.cap.x,b.cap.y]);
   for(let k=0;k<10&&!(await B()).cap.open;k++)await page.waitForTimeout(150);b=await B();if(!b.cap.open)fail(`${tag} capsule never opened`);
   await page.waitForTimeout(500);await page.screenshot({path:`${out}/${tag}-capsule${t}.png`});
   const rec=await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;return {id:d.bossChar,r:d.recruits()};});console.log(' boss pilot',JSON.stringify(rec));
   if(rec.id&&!rec.r[t].includes(rec.id))fail(`${tag} pilot not recruited for P${t+1}`);}
  for(let i=0;i<30&&(await D())?.phase==='play';i++)await page.waitForTimeout(150);
  await page.keyboard.up('d');await page.keyboard.up('ArrowRight');
  d=await D();if(d?.phase!==(t?'end':'turn-end'))fail(`${tag} turn ${t} did not end (${d?.phase})`);
  if(!d?.pl[t].finished)fail(`${tag} P${t+1} did not finish`);
  await page.waitForTimeout(500);await page.screenshot({path:`${out}/${tag}-${t?'end':'turnend'}.png`});
 }
 let res=null;for(let i=0;i<60&&!res;i++){await page.waitForTimeout(250);res=await page.evaluate(()=>{const d=document.getElementById('dialog');return d.open?d.innerText.slice(0,160):null;});}
 if(!res)fail(`${tag} no result dialog`);console.log(' result:',res&&res.replace(/\n+/g,' | '));
 if(errors.length){fail(`${tag} errors ${errors.join(' ; ')}`);}
 await browser.close();}
console.log(ok?'sonic OK':'sonic FAILED');process.exit(ok?0:1);
