// Super Mario Bros. World 1 (engine marioBros): NES physics numbers, the World 1 flow (title menu, coin room,
// flagpole → 1-2 intro, Warp Zone recruit → 1-3, Bowser's axe → Toad, game over, results), the NES 2 PLAYER GAME
// hand-off on a lost life, Coin Rush (timer, ghost, stage hand-on) and Castle Dash (flagpole finish).
// Screenshots go to $OUT (default /tmp/claude-0/sc/smb-*). Usage: node tests/mario.mjs [world|alt|coins|race ...]
import {chromium,browserLaunchOptions} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
const only=process.argv.slice(2);let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
const check=(name,v,lo,hi)=>{const good=v>=lo&&v<=hi;if(!good)ok=false;console.log(good?'  ok  ':'  FAIL',name,typeof v==='number'?+v.toFixed(3):v,`[${lo}, ${hi}]`);};

async function launch(id,[w,h]){
 const browser=await chromium.launch(browserLaunchOptions()),page=await browser.newPage({viewport:{width:w,height:h},hasTouch:w<700,isMobile:w<700}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&m.text()&&!/Failed to load|ERR_|net::/.test(m.text()))errors.push(m.text().slice(0,300));});
 await page.goto(new URL('../dist/ShambConkins.html',import.meta.url).href,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:60000});await page.waitForTimeout(400);
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);await page.waitForTimeout(400);
 await page.evaluate(()=>[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent))?.click());await page.waitForTimeout(900);
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d)return null;return {phase:d.phase,turn:d.turn,two:d.twoPlayer,clock:d.clock,ghost:d.ghost.length,warp:d.warpMsg&&{id:d.warpMsg.id,world:d.warpMsg.world},
  pl:d.pl.map(p=>({st:p.stage,a:p.area,x:Math.round(p.x),y:Math.round(p.y),big:p.big,dead:p.dead,lives:p.lives,score:p.score,coins:p.coins,time:p.time,done:p.done,over:p.over,finished:p.finished,best:Math.round(p.best),lap:p.lap})),
  log:d.log.slice(-6),rec:window.ShambConkins.store.session.gameRecruits};});
 const dbg=(fn,arg)=>page.evaluate(([fn,arg])=>{const d=window.ShambConkins.store.session.debug;return new Function('d','arg',fn)(d,arg);},[fn,arg]);
 const until=async(fn,ms=8000)=>{const t0=Date.now();let d;while(Date.now()-t0<ms){d=await D();if(d&&fn(d))return d;await page.waitForTimeout(100);}return d;};
 const ready=async()=>{for(let i=0;i<40;i++){if(await page.evaluate(()=>!!document.querySelector('.pass-overlay [data-ready]')))break;await page.waitForTimeout(120);}await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(250);};
 const shot=n=>page.screenshot({path:`${out}/smb-${id.replace('smb-','')}-${w}-${n}.png`});
 const result=async()=>{for(let i=0;i<80;i++){const r=await page.evaluate(()=>{const d=document.getElementById('dialog');return d?.open?d.innerText.slice(0,200):null;});if(r)return r;await page.waitForTimeout(250);}return null;};
 return {browser,page,errors,D,dbg,until,ready,shot,result};
}
const done=async(t,tag)=>{if(t.errors.length)fail(`${tag} page errors: ${t.errors.join(' ; ')}`);await t.browser.close();};

// ---------------------------------------------------------------- World 1, 1 PLAYER GAME: physics and every stage
if(!only.length||only.includes('world')){const t=await launch('smb-world-1',[1100,700]),{page,D,dbg,until,ready,shot}=t;
 console.log('world · 1100x700');
 let d=await D();if(d?.phase!=='title')fail(`title screen not shown (${d?.phase})`);await shot('title');
 await page.keyboard.press('Enter');await ready();d=await until(d=>d.phase==='card');await shot('card');
 d=await until(d=>d.phase==='play');if(d.two)fail('Enter on the title should start the 1 PLAYER GAME');
 // NES physics: top speeds and jump heights (ground is y=208)
 await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;window.__s=[];const f=()=>{const p=d.pl[0];window.__s.push({y:p.y,vx:p.vx,vy:p.vy});requestAnimationFrame(f);};f();});
 // a clear runway: no enemies, nothing overhead for the first 68 columns (this player's copy of 1-1 only)
 const reset=()=>dbg("const a=d.worlds[0].areas.main;a.enemies.forEach(e=>e.alive=false);for(let c=0;c<68;c++)for(let r=0;r<13;r++)a.tiles[r*a.def.W+c]=0;d.teleport(0,100);window.__s=[];");
 const S=()=>page.evaluate(()=>window.__s),apex=s=>208-Math.min(...s.map(q=>q.y));
 await reset();await page.keyboard.down('d');await page.waitForTimeout(1500);check('walk top speed (px/frame)',Math.max(...(await S()).map(q=>q.vx)),1.56,1.5626);await page.keyboard.up('d');
 await page.waitForTimeout(500);await reset();await page.keyboard.down('d');await page.keyboard.down(' ');await page.waitForTimeout(1600);check('run top speed (px/frame)',Math.max(...(await S()).map(q=>q.vx)),2.56,2.5626);
 await page.evaluate(()=>{window.__s=[];});await page.keyboard.down('w');await page.waitForTimeout(1200);await page.keyboard.up('w');check('running jump height (px)',apex(await S()),79,83);
 await page.keyboard.up('d');await page.keyboard.up(' ');await page.waitForTimeout(700);
 await reset();await page.waitForTimeout(250);await page.evaluate(()=>{window.__s=[];});await page.keyboard.down('w');await page.waitForTimeout(1300);await page.keyboard.up('w');let s=await S();check('standing jump height (px)',apex(s),64,67);check('fall speed cap (px/frame)',Math.max(...s.map(q=>q.vy)),4,4.5);
 await reset();await page.waitForTimeout(250);await page.evaluate(()=>{window.__s=[];});await page.keyboard.down('w');await page.waitForTimeout(40);await page.keyboard.up('w');await page.waitForTimeout(900);check('tapped hop height (px)',apex(await S()),12,34);
 await shot('jump');
 // the coin room under the fourth pipe, and out of the side pipe onto pipe 163
 await dbg('d.toWarp(0)');await page.keyboard.down('s');d=await until(d=>d.pl[0].a==='room',4000);await page.keyboard.up('s');if(d.pl[0].a!=='room')fail(`pipe did not reach the coin room (${d.pl[0].a})`);
 await page.waitForTimeout(400);await shot('room');await page.keyboard.down('d');for(let k=0;k<16&&(await D()).pl[0].a==='room'&&(await D()).pl[0].x<60;k++){await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');await page.waitForTimeout(150);}
 d=await until(d=>d.pl[0].a==='main'&&d.log.join().includes('enter main'),9000);await page.keyboard.up('d');
 if(d.pl[0].a!=='main'||Math.abs(d.pl[0].x-164*16)>40)fail(`coin room exit did not come up at pipe 163 (${JSON.stringify(d.pl[0])})`);
 // the flagpole leads to the 1-2 card and the intro pipe
 await dbg('d.teleport(0,183*16)');await page.keyboard.down('d');await page.keyboard.down(' ');
 for(let k=0;k<16;k++){await page.keyboard.down('w');await page.waitForTimeout(420);await page.keyboard.up('w');await page.waitForTimeout(60);if((await D()).log.join().includes('flag'))break;}
 await page.keyboard.up(' ');await page.waitForTimeout(600);await shot('flag');
 d=await until(d=>d.phase==='card'&&d.pl[0].st===1,16000);if(d.pl[0].st!==1)fail(`flagpole did not lead to 1-2 (${JSON.stringify(d.pl[0])} ${d.log})`);
 if(!(d.pl[0].score>=5000))fail(`no flag and time bonus (${d.pl[0].score})`);
 d=await until(d=>d.pl[0].a==='main'&&d.phase==='play',9000);await page.keyboard.up('d');if(d.pl[0].a!=='main')fail(`1-2 intro pipe did not lead underground (${d.pl[0].a})`);await page.waitForTimeout(400);await shot('1-2');
 // the Warp Zone: a recruit (if any are left) and then 1-3
 await dbg('d.toWarpZone(0,3)');await page.waitForTimeout(250);await shot('warpzone');await page.keyboard.down('s');d=await until(d=>d.phase==='warp',4000);await page.keyboard.up('s');
 if(d.phase!=='warp')fail('warp pipe did not open the Warp Zone message');else{console.log('  warp recruit',d.warp.id);if(d.warp.world!==3)fail(`pipe 3 reported world ${d.warp.world}`);if(d.warp.id&&!d.rec[0].includes(d.warp.id))fail('recruit not recorded in gameRecruits');}
 await page.waitForTimeout(2400);await shot('warpmsg');await page.keyboard.press('Enter');
 d=await until(d=>d.phase==='play'&&d.pl[0].st===2,9000);if(d.pl[0].st!==2)fail(`warp did not continue in 1-3 (${d.pl[0].st})`);await page.waitForTimeout(300);await shot('1-3');
 // 1-4: Bowser's bridge, the axe, Toad; the 1 PLAYER GAME then hands over to P2
 await dbg('d.teleport(0,108*16,3)');await page.waitForTimeout(500);await shot('1-4');
 await dbg('d.teleport(0,126*16+2,3)');d=await until(d=>d.log.join().includes('axe'),3000);if(!d.log.join().includes('axe'))fail('axe not reached');
 await page.waitForTimeout(5200);await shot('toad');
 d=await until(d=>d.pl[0].done,12000);if(!d.pl[0].done)fail(`rescuing Toad did not finish P1's World 1 (${JSON.stringify(d.pl[0])})`);
 await ready();d=await until(d=>d.phase==='play'&&d.turn===1,8000);if(d.turn!==1)fail('P2 never got a turn');if(!(d.ghost>100))fail(`no ghost recorded (${d.ghost})`);
 // P2 loses three lives: GAME OVER and the result
 for(let k=0;k<3;k++){d=await until(d=>d.phase==='play'&&!d.pl[1].dead,9000);await dbg('d.kill(1)');d=await until(d=>d.phase!=='play',9000);if(k===2)await shot('gameover');}
 d=await until(d=>d.pl[1].over,6000);if(!d.pl[1].over)fail(`P2 should be game over (${JSON.stringify(d.pl[1])})`);
 const r=await t.result();console.log('  result:',r&&r.replace(/\n+/g,' | '));if(!r||!/World 1/.test(r))fail('no World 1 result dialog');
 await done(t,'world');}

// ---------------------------------------------------------------- World 1, 2 PLAYER GAME on a phone: Mario and Luigi swap on a lost life
if(!only.length||only.includes('alt')){const t=await launch('smb-world-1',[390,844]),{page,D,dbg,until,ready,shot}=t;
 console.log('2 player game · 390x844');await shot('title');
 const pos=await page.evaluate(()=>{const S=window.ShambConkins.store.session,v=S.debug.view,c=document.querySelector('canvas.game-canvas').getBoundingClientRect();return {x:c.left+(v.fx+130)*v.sc*c.width/S.W,y:c.top+(164+v.band)*v.sc*c.height/S.H};});
 await page.touchscreen.tap(pos.x,pos.y);let d=await until(d=>d.phase==='handoff',3000);if(!d.two)fail('tapping 2 PLAYER GAME did not pick it');
 await ready();d=await until(d=>d.phase==='play'&&d.turn===0,8000);await page.waitForTimeout(300);await shot('play');
 await dbg('d.kill(0)');await page.waitForTimeout(1200);await shot('dead');d=await until(d=>d.phase==='handoff',9000);if(d.phase!=='handoff'||d.turn!==1)fail(`no hand-off to Luigi after Mario lost a life (${d.phase} ${d.turn})`);
 await ready();d=await until(d=>d.phase==='play'&&d.turn===1,8000);if(d.turn!==1)fail('Luigi did not start');await shot('luigi');
 await dbg('d.kill(1)');d=await until(d=>d.phase==='handoff',9000);if(d.turn!==0)fail('no hand-off back to Mario');if(d.pl[0].lives!==2||d.pl[1].lives!==2)fail(`lives should be 2/2 (${d.pl[0].lives}/${d.pl[1].lives})`);
 await ready();await page.waitForTimeout(300);await shot('card');
 await done(t,'alt');}

// ---------------------------------------------------------------- Coin Rush (landscape phone): coins, timer, the next stage, P2 vs ghost
if(!only.length||only.includes('coins')){const t=await launch('smb-coin-rush',[844,390]),{page,D,dbg,until,ready,shot}=t;
 console.log('coin rush · 844x390');await shot('title');
 for(const turn of [0,1]){
  let d=await until(d=>d.phase==='handoff'||d.phase==='play'&&d.turn===turn,9000);if(d.phase==='handoff')await ready();
  d=await until(d=>d.phase==='play'&&d.turn===turn,9000);if(d.turn!==turn){fail(`coin rush turn ${turn} never started`);break;}
  await dbg('d.worlds[arg].areas.main.enemies.forEach(e=>e.alive=false);d.teleport(arg,16*16)',turn);await page.keyboard.down('w');await page.waitForTimeout(700);await page.keyboard.up('w');await page.keyboard.down('d');for(let k=0;k<6;k++){await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');await page.waitForTimeout(150);}await page.keyboard.up('d');
  await shot('run'+turn);d=await D();if(!(d.pl[turn].coins>0))fail(`P${turn+1} collected no coins (${JSON.stringify(d.pl[turn])})`);
  if(turn===0){await dbg("d.teleport(0,190*16)");await page.keyboard.down('d');d=await until(d=>d.pl[0].st===1,16000);await page.keyboard.up('d');if(d.pl[0].st!==1)fail(`coin rush flagpole did not go on to 1-2 (${d.log})`);}
  else if(!(d.ghost>100))fail('no ghost for P2');
  await until(d=>d.phase==='play',8000);await dbg('d.setClock(59.6)');d=await until(d=>d.phase!=='play',6000);if(d.phase!==(turn?'end':'turn-end'))fail(`turn ${turn} did not end on time (${d.phase})`);await page.waitForTimeout(400);await shot(turn?'end':'turnend');
 }
 const r=await t.result();console.log('  result:',r&&r.replace(/\n+/g,' | '));if(!r)fail('no coin rush result');
 await done(t,'coins');}

// ---------------------------------------------------------------- Castle Dash: the flagpole finishes the race
if(!only.length||only.includes('race')){const t=await launch('smb-castle-dash',[1100,700]),{page,D,dbg,until,ready,shot}=t;
 console.log('castle dash · 1100x700');
 for(const turn of [0,1]){
  let d=await until(d=>d.phase==='handoff'||d.phase==='play'&&d.turn===turn,9000);if(d.phase==='handoff')await ready();
  d=await until(d=>d.phase==='play'&&d.turn===turn,9000);if(d.turn!==turn){fail(`race turn ${turn} never started`);break;}
  await page.keyboard.down('d');await page.keyboard.down(' ');await page.waitForTimeout(1500);await page.keyboard.up(' ');await page.keyboard.up('d');d=await D();if(!(d.pl[turn].best>80))fail(`P${turn+1} did not move (${d.pl[turn].best})`);
  await dbg('d.teleport(arg,192*16)',turn);await page.keyboard.down('d');d=await until(d=>d.pl[turn].finished,9000);await page.keyboard.up('d');await shot('flag'+turn);if(!d.pl[turn].finished)fail(`flagpole did not finish P${turn+1}'s race`);
  d=await until(d=>d.phase!=='play',12000);if(d.phase!==(turn?'end':'turn-end'))fail(`race turn ${turn} did not end (${d.phase})`);
 }
 const r=await t.result();console.log('  result:',r&&r.replace(/\n+/g,' | '));if(!r)fail('no castle dash result');
 await done(t,'race');}

console.log(ok?'mario OK':'mario FAILED');process.exit(ok?0:1);
