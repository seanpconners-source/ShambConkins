// Castlevania warp games: runs both modes at phone and desktop size with keyboard play (walk right, whip on a rhythm,
// jump now and then). Players take turns on the full screen: checks each hunter progresses and breaks candles, the
// stairs climb onto the balcony, P1's ghost is recorded for P2's turn, the Phantom Bat room locks and its crystal ends
// the race, the exit door starts a new candle lap, and screenshots each phase (OUT=/tmp/claude-0/sc by default).
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
for(const id of ['cv-vampire-killer','cv-candle-hunt'])for(const [w,h] of [[390,780],[1100,700]]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`${id}-${w}`;
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);
 await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d)return null;return {phase:d.phase,turn:d.turn,clock:d.clock,ghost:d.ghost.length,
  pl:d.pl.map(p=>({x:Math.round(p.x),y:Math.round(p.y),hearts:p.hearts,lvl:p.lvl,sub:p.sub,hp:p.hp,finished:p.finished,dead:p.dead,deaths:p.deaths,best:Math.round(p.best),lap:p.lap,stair:!!p.stair})),
  candles:d.worlds.map(w=>w.candles.filter(c=>!c.alive).length),locked:d.worlds.map(w=>w.locked),boss:d.worlds.map(w=>w.boss&&{hp:w.boss.hp,state:w.boss.state}),end:d.L.end,start:d.L.start};});
 const ready=async t=>{for(let i=0;i<80;i++){const d=await D();if(d?.phase==='play'&&d.turn===t)return d;if(d?.phase==='handoff'&&i%4===0)await page.screenshot({path:`${out}/${tag}-handoff${t}.png`});await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(150);}return D();};
 await page.waitForTimeout(1300);await page.screenshot({path:`${out}/${tag}-title.png`});
 for(const t of [0,1]){
  let d=await ready(t);if(d?.phase!=='play'||d.turn!==t){fail(`${tag} turn ${t} never started (${JSON.stringify(d)})`);break;}
  await page.keyboard.down('d');
  for(let k=0;k<40;k++){await page.waitForTimeout(150);if(k%6===1)await page.keyboard.press('j');if(k%6===4)await page.keyboard.press(' ');
   d=await D();if(!d)break;if(k===4)await page.screenshot({path:`${out}/${tag}-start${t}.png`});if(k===20)await page.screenshot({path:`${out}/${tag}-run${t}.png`});if(d.phase!=='play')break;}
  await page.keyboard.up('d');await page.waitForTimeout(200);
  d=await D();console.log(tag,'turn',t,JSON.stringify({pl:d.pl[t],candles:d.candles[t],clock:d.clock.toFixed(1)}));
  if(!d||d.pl[t].best<d.start+200)fail(`${tag} P${t+1} did not progress`);
  if(!d.candles[t])fail(`${tag} P${t+1} broke no candles`);
  if(t===0&&d.pl[1].best!==d.start)fail(`${tag} P2 moved during P1's turn`);
  if(t===1&&d.ghost<100)fail(`${tag} no ghost recorded (${d.ghost})`);
  // stairs (P1's turn): stand at the foot of the first staircase, hold up, end up on the balcony
  if(t===0&&d.phase==='play'){
   const st=await page.evaluate(()=>{const s=window.ShambConkins.store.session.debug,st=s.L.stairs[0];if(!st)return null;for(const k in s.inputs[0])s.inputs[0][k]=0;Object.assign(s.pl[0],{x:st.bx-10,y:st.by,vx:0,vy:0,grounded:true,dead:0,hurt:false,stair:null,whip:null,inv:200});s.cams[0].x=st.bx-120;return st;});
   if(!st)fail(`${tag} level has no stairs`);
   else{await page.keyboard.down('w');let on=false;for(let k=0;k<20;k++){await page.waitForTimeout(150);const a=await D();if(a.pl[0].stair)on=true;if(k===6)await page.screenshot({path:`${out}/${tag}-stairs.png`});}
    await page.keyboard.up('w');const a=await D();console.log(' stairs',JSON.stringify(a.pl[0]),'top y',st.by-st.len);
    if(!on)fail(`${tag} never got onto the stairs`);if(Math.abs(a.pl[0].y-(st.by-st.len))>1||a.pl[0].stair)fail(`${tag} did not reach the top of the stairs (${a.pl[0].y})`);}
  }
  if(id==='cv-vampire-killer'){
   await page.evaluate(t=>window.ShambConkins.store.session.debug.toBoss(t),t);await page.keyboard.down('d');await page.waitForTimeout(500);await page.keyboard.up('d');await page.waitForTimeout(1200);
   d=await D();if(!d.locked[t])fail(`${tag} boss room did not lock`);await page.screenshot({path:`${out}/${tag}-boss${t}.png`});
   // whip it a few times for real, then finish it off
   for(let k=0;k<12;k++){await page.keyboard.press('j');await page.waitForTimeout(220);}
   await page.evaluate(t=>{const s=window.ShambConkins.store.session.debug;s.pl[t].inv=999;s.hurtBoss(t,40);},t);
   for(let i=0;i<30&&!(await D()).pl[t].finished;i++){await page.waitForTimeout(200);if(i===8)await page.screenshot({path:`${out}/${tag}-crystal${t}.png`});
    await page.evaluate(t=>{const s=window.ShambConkins.store.session.debug,w=s.worlds[t],c=w.items.find(it=>it.type==='crystal');if(c&&c.ground){const p=s.pl[t];p.x=c.x-14;}},t);await page.keyboard.down('d');await page.waitForTimeout(120);await page.keyboard.up('d');}
   d=await D();if(!d.pl[t].finished)fail(`${tag} crystal did not finish P${t+1}'s race (${JSON.stringify(d.pl[t])} boss ${JSON.stringify(d.boss[t])})`);
  }else{
   if(t===1){await page.evaluate(()=>{const s=window.ShambConkins.store.session.debug;s.teleport(1,s.L.end-70);});await page.keyboard.down('ArrowRight');for(let i=0;i<40&&(await D()).pl[1].lap<1;i++)await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');
    d=await D();if(d.pl[1].lap<1)fail(`${tag} exit door did not start a new lap (${JSON.stringify(d.pl[1])})`);await page.waitForTimeout(300);await page.screenshot({path:`${out}/${tag}-lap.png`});}
   await page.evaluate(()=>window.ShambConkins.store.session.debug.setClock(59.5));}
  for(let i=0;i<60&&(await D())?.phase==='play';i++)await page.waitForTimeout(150);
  d=await D();if(d?.phase!==(t?'end':'turn-end'))fail(`${tag} turn ${t} did not end (${d?.phase})`);
  await page.waitForTimeout(500);await page.screenshot({path:`${out}/${tag}-${t?'end':'turnend'}.png`});
 }
 let res=null;for(let i=0;i<60&&!res;i++){await page.waitForTimeout(250);res=await page.evaluate(()=>{const d=document.getElementById('dialog');return d.open?d.innerText.slice(0,160):null;});}
 if(!res)fail(`${tag} no result dialog`);console.log(' result:',res&&res.replace(/\n+/g,' | '));
 if(errors.length)fail(`${tag} errors ${errors.join(' ; ')}`);
 await browser.close();}
console.log(ok?'castlevania OK':'castlevania FAILED');process.exit(ok?0:1);
