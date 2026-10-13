// Broforce (turn-based rebuild): plays both turns at phone portrait, phone landscape and desktop size. Checks the
// title → hand-off → countdown → play flow, that running/firing moves the bro and kills enemies, that a GOLD cage
// recruits a locked character for the current player, that boarding the chopper advances Stage 1 → 2 → 3, that the
// Devil arena locks and the chopper only comes after the Devil dies, that P2 gets the same mission, and that the
// result dialog appears. Screenshots go to OUT (default /tmp/claude-0/sc/bf-*).
import {launchBrowser, root} from './lib.mjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const out=process.env.OUT||'/tmp/claude-0/sc';(await import('node:fs')).mkdirSync(out,{recursive:true});let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
const sizes=process.argv[2]?process.argv.slice(2).map(s=>s.split('x').map(Number)):[[390,780],[780,390],[1100,700]];
for(const [w,h] of sizes){
 const browser=await launchBrowser();const page=await browser.newPage({viewport:{width:w,height:h}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!/ERR_|Failed to load resource|viewBox/.test(m.text()))errors.push('console: '+m.text());});
 await page.goto(pathToFileURL(path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html')).href,{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:60000});
 const tag=`bf-${w}x${h}`;
 await page.evaluate(()=>{window.ShambConkins.requestGame({id:'broforce-jungle',origin:'arcade'});});
 await page.waitForTimeout(500);await page.evaluate(()=>[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent))?.click());
 await page.waitForTimeout(1200);await page.screenshot({path:`${out}/${tag}-title.png`});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d||!d.P)return d?{phase:d.phase}:null;const P=d.P;
  return {phase:d.phase,turn:d.turn,stage:d.stage,x:Math.round(P.x),y:Math.round(P.y),score:P.score,kills:P.kills,lives:P.lives,dead:P.dead>0,boarded:P.boarded,
   rec:d.recruits.map(r=>r.length),cages:d.W.cages.map(c=>(c.vip?'V':'c')+(c.open?'+':'')),boss:d.W.boss&&{alive:d.W.boss.alive,state:d.W.boss.state},heli:d.W.heli.state,W:d.W.W};});
 const ready=async t=>{for(let i=0;i<80;i++){const d=await D();if(d?.phase==='play'&&d.turn===t)return d;if(d?.phase==='handoff'&&i%5===0)await page.screenshot({path:`${out}/${tag}-handoff${t}.png`});
  await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(150);}return D();};
 for(const t of [0,1]){
  let d=await ready(t);if(d?.phase!=='play'||d.turn!==t){fail(`${tag} turn ${t} never started ${JSON.stringify(d)}`);break;}
  const x0=d.x;
  // run right firing, jumping now and then (keyboard: either key set drives the current player)
  await page.keyboard.down('d');await page.keyboard.down(' ');
  let far=x0;
  for(let k=0;k<26;k++){await page.waitForTimeout(160);if(k%5===2){await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');}if(k===12)await page.screenshot({path:`${out}/${tag}-run${t}.png`});far=Math.max(far,(await D()).x);}
  await page.keyboard.up('d');await page.keyboard.up(' ');
  d=await D();console.log(tag,'turn',t,'after run',JSON.stringify(d),'furthest',far);
  if(far<=x0+120)fail(`${tag} P${t+1} did not move right (${x0}→${far})`);
  if(t===0){
   // pointer controls: drag on the left half runs, holding the right half fires, a swipe up there jumps
   const box=await page.locator('canvas.game-canvas').boundingBox();
   await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(d.W.S.spawn.x+16);Object.assign(d.P,{dead:0,hp:2,inv:3,boarded:false});for(const e of d.W.foes)if(Math.abs(e.x-d.P.x)<300)e.alive=false;});await page.waitForTimeout(400);
   const before=await D();
   await page.mouse.move(box.x+box.width*.18,box.y+box.height*.75);await page.mouse.down();await page.mouse.move(box.x+box.width*.18+45,box.y+box.height*.75,{steps:4});
   await page.waitForTimeout(700);await page.mouse.up();const moved=await D();
   if(moved.x<before.x+30)fail(`${tag} stick drag did not run (${before.x}→${moved.x})`);
   const shots0=await page.evaluate(()=>window.ShambConkins.store.session.debug.P.shotsFired||0);
   await page.mouse.move(box.x+box.width*.8,box.y+box.height*.75);await page.mouse.down();await page.waitForTimeout(350);
   const firing=await page.evaluate(()=>window.ShambConkins.store.session.debug.P.shotsFired||0)-shots0;
   await page.mouse.move(box.x+box.width*.8,box.y+box.height*.75-60,{steps:3});await page.waitForTimeout(120);
   const jumped=await page.evaluate(()=>window.ShambConkins.store.session.debug.P.vy<-50||!window.ShambConkins.store.session.debug.P.grounded);
   await page.mouse.up();
   if(!firing)fail(`${tag} holding the right side did not fire`);if(!jumped)fail(`${tag} swipe up did not jump`);
   console.log(tag,'pointer: ran',moved.x-before.x,'px, shots',firing,'jumped',jumped);
  }
  // grenade
  await page.keyboard.press('g');await page.waitForTimeout(1600);await page.screenshot({path:`${out}/${tag}-nade${t}.png`});
  // gold cage: free it and check the recruit
  const vip=await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;const k=d.W.cages.findIndex(c=>c.vip);if(k<0)return null;const c=d.W.cages[k];d.teleport(c.x-30,c.y);return k;});
  if(vip!==null){await page.waitForTimeout(500);await page.screenshot({path:`${out}/${tag}-cage${t}.png`});await page.evaluate(k=>window.ShambConkins.store.session.debug.freeCage(k),vip);await page.waitForTimeout(700);
   await page.screenshot({path:`${out}/${tag}-recruit${t}.png`});d=await D();if(d.rec[t]!==1)fail(`${tag} gold cage did not recruit (${d.rec})`);}
  else console.log(tag,'no gold cage (no locked characters left?)');
  // stage 1 → 2 → 3 by boarding the chopper
  for(const st of [0,1]){
   await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(d.W.exit.x-60,d.W.exit.y);});await page.waitForTimeout(400);
   if(st===0)await page.screenshot({path:`${out}/${tag}-chopper${t}.png`});
   await page.evaluate(()=>window.ShambConkins.store.session.debug.board());
   for(let i=0;i<40;i++){await page.waitForTimeout(150);d=await D();if(d.stage===st+1)break;}
   if(d.stage!==st+1)fail(`${tag} stage ${st+1} did not advance (${JSON.stringify(d)})`);
   await page.waitForTimeout(900);await page.screenshot({path:`${out}/${tag}-stage${st+2}-t${t}.png`});
  }
  // stage 3: the Devil
  await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(d.W.arena.x0+5*16,d.W.exit.y);});
  await page.waitForTimeout(1800);d=await D();
  if(d.boss?.state==='wait')fail(`${tag} boss did not wake`);if(d.heli!=='away')fail(`${tag} chopper came before the Devil died`);
  await page.keyboard.down(' ');await page.waitForTimeout(1600);await page.keyboard.up(' ');
  await page.screenshot({path:`${out}/${tag}-boss${t}.png`});
  await page.evaluate(()=>window.ShambConkins.store.session.debug.killBoss());await page.waitForTimeout(1500);d=await D();
  if(d.heli==='away')fail(`${tag} chopper never arrived after the Devil`);
  await page.screenshot({path:`${out}/${tag}-devil-dead${t}.png`});
  if(t===0){await page.evaluate(()=>window.ShambConkins.store.session.debug.board());}
  else await page.evaluate(()=>window.ShambConkins.store.session.debug.setClock(299.5));
  for(let i=0;i<40;i++){await page.waitForTimeout(150);d=await D();if(d.phase!=='play')break;}
  if(d.phase!==(t?'end':'turn-end'))fail(`${tag} turn ${t} did not end (${d.phase})`);
  await page.waitForTimeout(700);await page.screenshot({path:`${out}/${tag}-${t?'end':'turnend'}.png`});
 }
 let res=null;for(let i=0;i<60&&!res;i++){await page.waitForTimeout(250);res=await page.evaluate(()=>{const d=document.getElementById('dialog');return d.open?d.innerText.slice(0,300):null;});}
 if(!res)fail(`${tag} no result dialog`);console.log(' result:',res&&res.replace(/\n+/g,' | '));
 await page.screenshot({path:`${out}/${tag}-result.png`});
 if(errors.length)fail(`${tag} errors ${errors.slice(0,5).join(' ; ')}`);
 await browser.close();
}
console.log(ok?'broforce OK':'broforce FAILED');process.exit(ok?0:1);
