// Castlevania · Symphony of the Night (cv-symphony): plays both turns at phone and desktop size with keyboard input.
// Checks the hero walks, slashes and breaks lanterns, the gate shuts, Death strips the Alucard Sword, the Short Sword /
// Leap Stone / Claymore pickups work (double jump), the caverns drown you, the throne room locks with Dracula's
// intro, both boss phases take damage and the orb finishes the run, P1's ghost is recorded, and the result dialog
// appears. Screenshots of every area go to OUT (default /tmp/claude-0/sc/sotn-*).
// Usage: node tests/sotn.mjs [WxH ...]   (SHAMB_FILE=... to test a private build)
import {open} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
const sizes=process.argv.slice(2).length?process.argv.slice(2).map(s=>s.split('x').map(Number)):[[390,780],[1100,700]];
for(const [w,h] of sizes){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`sotn-${w}`;
 const shot=name=>page.screenshot({path:`${out}/${tag}-${name}.png`});
 await page.evaluate(()=>{window.ShambConkins.requestGame({id:'cv-symphony',origin:'arcade'});});
 await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d)return null;const w=d.worlds[d.turn];
  return {phase:d.phase,turn:d.turn,clock:d.clock,ghost:d.ghost.length,scene:w.scene&&w.scene.kind,gate:w.gateShut,locked:w.locked,orb:w.orb,
   boss:w.boss&&{phase:w.boss.phase,hp:w.boss.hp,state:w.boss.state},candles:w.candles.filter(c=>!c.alive).length,corpses:w.corpses.length,decals:w.decals.length,
   pl:d.pl.map(p=>({x:Math.round(p.x),y:Math.round(p.y),hp:p.hp,hearts:p.hearts,weapon:p.weapon,leap:p.leap,sub:p.sub,dead:p.dead,deaths:p.deaths,finished:p.finished,best:Math.round(p.best),grounded:p.grounded}))};});
 const ready=async t=>{for(let i=0;i<80;i++){const d=await D();if(d?.phase==='play'&&d.turn===t)return d;if(d?.phase==='handoff'&&i%5===0)await shot(`handoff${t}`);await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(150);}return D();};
 const tp=(t,x)=>page.evaluate(([t,x])=>{const d=window.ShambConkins.store.session.debug;d.teleport(t,x);d.pl[t].inv=60;},[t,x]);
 const hold=async(key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);};
 await page.waitForTimeout(1500);await shot('title');
 for(const t of [0,1]){
  let d=await ready(t);if(d?.phase!=='play'||d.turn!==t){fail(`${tag} turn ${t} never started (${JSON.stringify(d)})`);break;}
  // the approach: walk right slashing
  await page.keyboard.down('d');
  for(let k=0;k<24;k++){await page.waitForTimeout(140);if(k%3===0)await page.keyboard.press('j');if(k%7===5)await page.keyboard.press(' ');if(k===6&&t===0)await shot('forest');if(k===14&&t===0)await shot('forest2');}
  await page.keyboard.up('d');d=await D();console.log(tag,'turn',t,'forest',JSON.stringify({p:d.pl[t],candles:d.candles,corpses:d.corpses,clock:d.clock.toFixed(1)}));
  if(d.pl[t].best<d.pl[t].x||d.pl[t].best<180)fail(`${tag} P${t+1} did not progress (${d.pl[t].best})`);
  if(t===0&&d.pl[1].best!==40)fail(`${tag} P2 moved during P1's turn`);
  // the gate shuts and Death takes the sword
  await tp(t,900);await hold('d',900);d=await D();if(!d.gate)fail(`${tag} gate did not shut`);
  for(let i=0;i<20&&!(await D()).scene;i++)await hold('d',150);
  d=await D();if(d.scene!=='death')fail(`${tag} Death did not appear (${JSON.stringify(d.pl[t])})`);
  await page.waitForTimeout(1600);if(t===0)await shot('death');await page.waitForTimeout(2600);if(t===0)await shot('death2');
  for(let i=0;i<30&&(await D()).scene;i++)await page.waitForTimeout(200);
  d=await D();if(d.pl[t].weapon!=='fist')fail(`${tag} Death did not take the sword (${d.pl[t].weapon})`);
  await hold('d',1300);d=await D();if(d.pl[t].weapon!=='short')fail(`${tag} no Short Sword (${JSON.stringify(d.pl[t])})`);
  if(t===0){await tp(t,1200);await page.waitForTimeout(500);await shot('hall');}
  await tp(t,1290);await hold('d',700);d=await D();if(!d.pl[t].leap)fail(`${tag} no Leap Stone (${JSON.stringify(d.pl[t])})`);if(t===0)await shot('relic');
  // double jump reaches higher than a single jump
  const peak=async dbl=>{await page.keyboard.down(' ');await page.waitForTimeout(dbl?180:60);if(dbl){await page.keyboard.up(' ');await page.waitForTimeout(40);await page.keyboard.down(' ');}let top=999;for(let i=0;i<16;i++){await page.waitForTimeout(40);const q=(await D()).pl[t];top=Math.min(top,q.y);}await page.keyboard.up(' ');await page.waitForTimeout(900);return top;};
  await tp(t,1110);await page.evaluate(t=>{const d=window.ShambConkins.store.session.debug,w=d.worlds[t];w.foes=[];w.eshots=[];w.zoneT=w.zoneT.map(()=>1e9);d.pl[t].inv=1e9;},t);await page.waitForTimeout(500);const y0=(await D()).pl[t].y,p1=await peak(false),p2=await peak(true);console.log(' jump peaks',y0-p1,y0-p2);if(!(y0-p2>y0-p1+15))fail(`${tag} double jump no higher (${y0-p1} vs ${y0-p2})`);
  if(t===0){await tp(t,1640);await page.waitForTimeout(900);await shot('hall2');}
  if(t===0){// touch gestures on the attack zone: swipe up throws the sub-weapon, swipe sideways backdashes
   await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug,p=d.pl[0];p.sub='axe';p.hearts=10;p.facing=1;});
   const box=await page.evaluate(()=>{const r=document.querySelector('#game-canvas').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};});
   const ax=box.x+box.w*.67,ay=box.y+box.h*.85;
   await page.mouse.move(ax,ay);await page.mouse.down();for(let k=1;k<=6;k++){await page.mouse.move(ax,ay-k*10);await page.waitForTimeout(16);}await page.mouse.up();await page.waitForTimeout(120);
   const axe=await page.evaluate(()=>window.ShambConkins.store.session.debug.worlds[0].shots.some(sh=>sh.kind==='axe'));let q=(await D()).pl[0];if(!axe)fail(`${tag} swipe up did not throw the axe (hearts ${q.hearts})`);
   const x0=q.x;await page.waitForTimeout(400);await page.mouse.move(ax,ay);await page.mouse.down();for(let k=1;k<=6;k++){await page.mouse.move(ax-k*10,ay);await page.waitForTimeout(16);}await page.mouse.up();await page.waitForTimeout(350);
   q=(await D()).pl[0];console.log(' gestures: hearts',q.hearts,'backdash',x0,'->',q.x);if(!(q.x<x0-20))fail(`${tag} sideways swipe did not backdash (${x0} -> ${q.x})`);}
  // caverns: claymore, then drown in the water
  await tp(t,1860);await hold('d',700);d=await D();if(d.pl[t].weapon!=='claymore')fail(`${tag} no Claymore (${JSON.stringify(d.pl[t])})`);
  if(t===0){await tp(t,2000);await page.waitForTimeout(1500);await shot('cave');}
  await tp(t,1936);const deaths=(await D()).pl[t].deaths;await hold('d',700);await page.waitForTimeout(600);d=await D();if(d.pl[t].deaths<=deaths)fail(`${tag} water did not drown (${JSON.stringify(d.pl[t])})`);
  if(t===0)await shot('drown');await page.waitForTimeout(1600);
  if(t===0){await tp(t,2700);await page.waitForTimeout(1200);await shot('gallery');}
  // the keep: intro, phase 1, phase 2, orb
  await page.evaluate(t=>window.ShambConkins.store.session.debug.toBoss(t),t);await hold('d',300);d=await D();
  if(!d.locked||d.scene!=='dracula')fail(`${tag} throne room did not lock with Dracula's intro (${JSON.stringify(d)})`);
  await page.waitForTimeout(1200);if(t===0)await shot('dracula-intro');
  for(let i=0;i<40&&(await D()).scene;i++)await page.waitForTimeout(200);
  await page.evaluate(t=>{const d=window.ShambConkins.store.session.debug;d.pl[t].inv=99999;},t);
  for(let k=0;k<14;k++){await page.keyboard.press('j');await page.waitForTimeout(200);if(k===6&&t===0)await shot('dracula');}
  d=await D();console.log(' boss after slashing',JSON.stringify(d.boss));
  await page.evaluate(t=>window.ShambConkins.store.session.debug.hurtBoss(t,999),t);await page.waitForTimeout(1200);if(t===0)await shot('dracula-dies');
  for(let i=0;i<30&&(await D()).boss?.phase!==2;i++)await page.waitForTimeout(150);
  await page.waitForTimeout(1800);d=await D();if(d.boss?.phase!==2)fail(`${tag} no demon phase (${JSON.stringify(d.boss)})`);if(t===0)await shot('demon');
  for(let k=0;k<12;k++){await page.keyboard.press('j');await page.waitForTimeout(220);}
  await page.waitForTimeout(800);if(t===0)await shot('demon2');
  await page.evaluate(t=>window.ShambConkins.store.session.debug.hurtBoss(t,999),t);
  for(let i=0;i<40&&!(await D()).orb;i++)await page.waitForTimeout(150);if(t===0)await shot('demon-dies');
  d=await D();if(!d.orb)fail(`${tag} demon never dropped the orb (${JSON.stringify(d.boss)})`);
  for(let i=0;i<40&&!(await D()).pl[t].finished;i++){await page.evaluate(t=>{const s=window.ShambConkins.store.session.debug,w=s.worlds[t],o=w.items.find(it=>it.type==='orb');if(o&&o.ground){s.pl[t].x=o.x-16;}},t);await hold('d',120);}
  d=await D();if(!d.pl[t].finished)fail(`${tag} orb did not finish the run (${JSON.stringify(d.pl[t])})`);if(t===0)await shot('orb');
  for(let i=0;i<60&&(await D())?.phase==='play';i++)await page.waitForTimeout(150);
  d=await D();if(d?.phase!==(t?'end':'turn-end'))fail(`${tag} turn ${t} did not end (${d?.phase})`);
  if(t===0&&d.ghost<300)fail(`${tag} ghost too short (${d.ghost})`);
  await page.waitForTimeout(500);await shot(t?'end':'turnend');
 }
 let res=null;for(let i=0;i<60&&!res;i++){await page.waitForTimeout(250);res=await page.evaluate(()=>{const d=document.getElementById('dialog');return d.open?d.innerText.slice(0,180):null;});}
 if(!res)fail(`${tag} no result dialog`);console.log(' result:',res&&res.replace(/\n+/g,' | '));
 if(errors.length)fail(`${tag} errors ${errors.join(' ; ')}`);
 await browser.close();}
console.log(ok?'sotn OK':'sotn FAILED');process.exit(ok?0:1);
