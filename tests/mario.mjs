// Super Mario Bros. warp games: runs both modes at phone and desktop size with keyboard play (hold run, jump on a
// rhythm). Players take turns on the full screen: checks each runner progresses, coins get collected, the warp pipe
// reaches the coin room and comes back out, P1's ghost is recorded for P2's turn, the race turn ends at the flagpole,
// the castle starts a new coin lap, and screenshots each phase.
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
const RUN=['d','ArrowRight',' ','Enter'];
for(const id of ['smb-coin-rush','smb-castle-dash'])for(const [w,h] of [[390,780],[1100,700]]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`${id}-${w}`;
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);
 await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d)return null;return {phase:d.phase,turn:d.turn,clock:d.clock,ghost:d.ghost.length,pl:d.pl.map(p=>({x:Math.round(p.x),y:Math.round(p.y),coins:p.coins,big:p.big,area:p.area,finished:p.finished,dead:p.dead,deaths:p.deaths,best:Math.round(p.best),lap:p.lap})),end:d.L.end,start:d.L.start};});
 const ready=async t=>{for(let i=0;i<80;i++){const d=await D();if(d?.phase==='play'&&d.turn===t)return d;if(d?.phase==='handoff'&&i%4===0)await page.screenshot({path:`${out}/${tag}-handoff${t}.png`});await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(150);}return D();};
 await page.waitForTimeout(1300);await page.screenshot({path:`${out}/${tag}-title.png`});
 for(const t of [0,1]){
  let d=await ready(t);if(d?.phase!=='play'||d.turn!==t){fail(`${tag} turn ${t} never started (${JSON.stringify(d)})`);break;}
  for(const k of RUN)await page.keyboard.down(k);
  let peak=0;
  for(let k=0;k<45;k++){await page.waitForTimeout(150);if(k%5===2){await page.keyboard.down('w');await page.waitForTimeout(800);await page.keyboard.up('w');}
   d=await D();if(!d)break;peak=Math.max(peak,d.pl[t].coins);if(k===3)await page.screenshot({path:`${out}/${tag}-start${t}.png`});if(k===14)await page.screenshot({path:`${out}/${tag}-run${t}.png`});if(d.phase!=='play')break;}
  d=await D();console.log(tag,'turn',t,JSON.stringify(d));
  if(!d||d.pl[t].best<500)fail(`${tag} P${t+1} did not progress`);
  if(peak===0&&id==='smb-coin-rush')fail(`${tag} P${t+1} collected no coins`);
  if(t===0&&d.pl[1].best!==d.start)fail(`${tag} P2 moved during P1's turn`);
  if(t===1&&d.ghost<100)fail(`${tag} no ghost recorded (${d.ghost})`);
  for(const k of RUN)await page.keyboard.up(k);
  // warp pipe (P1's turn): stand on it, hold down, land in the coin room, walk out the side pipe
  if(t===0&&d?.phase==='play'){
   await page.evaluate(()=>window.ShambConkins.store.session.debug.toWarp(0));await page.keyboard.down('s');await page.waitForTimeout(1400);await page.keyboard.up('s');
   let a=await D();if(a.pl[0].area!=='room')fail(`${tag} warp pipe did not reach the coin room (${a.pl[0].area})`);
   await page.waitForTimeout(500);await page.screenshot({path:`${out}/${tag}-room.png`});
   await page.keyboard.down('d');for(let k=0;k<24&&(await D()).pl[0].area==='room';k++){await page.waitForTimeout(200);if((await D()).pl[0].x<64){await page.keyboard.down('w');await page.waitForTimeout(400);await page.keyboard.up('w');}}
   await page.keyboard.up('d');await page.waitForTimeout(1200);a=await D();if(a.pl[0].area!=='main')fail(`${tag} did not leave the coin room`);
   await page.screenshot({path:`${out}/${tag}-exit.png`});console.log(' after warp',JSON.stringify(a.pl[0]));
  }
  if(id==='smb-castle-dash'){await page.evaluate(t=>{const s=window.ShambConkins.store.session;s.debug.teleport(t,s.debug.L.end-90);},t);await page.keyboard.down('d');await page.waitForTimeout(1500);await page.screenshot({path:`${out}/${tag}-flag${t}.png`});for(let i=0;i<40&&!(await D()).pl[t].finished;i++)await page.waitForTimeout(250);await page.keyboard.up('d');d=await D();if(!d||!d.pl[t].finished)fail(`${tag} flagpole did not finish P${t+1}'s race (${JSON.stringify(d?.pl[t])})`);}
  else{if(t===1){await page.evaluate(()=>{const s=window.ShambConkins.store.session;s.debug.teleport(1,s.debug.L.end-90);});await page.keyboard.down('ArrowRight');for(let i=0;i<80&&(await D()).pl[1].lap<1;i++)await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');d=await D();if(d.pl[1].lap<1)fail(`${tag} castle did not start a new lap (${JSON.stringify(d.pl[1])})`);}
   await page.evaluate(()=>window.ShambConkins.store.session.debug.setClock(59.5));}
  for(let i=0;i<60&&(await D())?.phase==='play';i++)await page.waitForTimeout(150);
  d=await D();if(d?.phase!==(t?'end':'turn-end'))fail(`${tag} turn ${t} did not end (${d?.phase})`);
  await page.waitForTimeout(500);await page.screenshot({path:`${out}/${tag}-${t?'end':'turnend'}.png`});
 }
 let res=null;for(let i=0;i<60&&!res;i++){await page.waitForTimeout(250);res=await page.evaluate(()=>{const d=document.getElementById('dialog');return d.open?d.innerText.slice(0,160):null;});}
 if(!res)fail(`${tag} no result dialog`);console.log(' result:',res&&res.replace(/\n+/g,' | '));
 if(errors.length){fail(`${tag} errors ${errors.join(' ; ')}`);}
 await browser.close();}
console.log(ok?'mario OK':'mario FAILED');process.exit(ok?0:1);
