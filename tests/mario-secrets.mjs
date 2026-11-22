// Super Mario Bros. secrets and new pieces (Nov 21): beanstalk → cloud area → drop back, a pipe to a coin room and
// out again, 4-2's hidden Warp Zone (pipes to Worlds 5/6/7), the 5-1 cloud rider's spiky shells, hammer-throwing
// climbers, penguins that slide off ledges, and the title screen's world select (only worlds whose Bowser was beaten).
// Screenshots to $OUT (default /tmp/claude-0/sc/smbx-*). Usage: node tests/mario-secrets.mjs
import {chromium,browserLaunchOptions,appURL} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);},pass=m=>console.log('  ok  ',m);
const browser=await chromium.launch(browserLaunchOptions()),page=await browser.newPage({viewport:{width:844,height:390}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto(await appURL(),{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:60000});await page.waitForTimeout(400);
// pretend Bowser has been beaten in Worlds 2 and 4 (2-4 beaten = World 3 unlocked; World 4 was warped to, so it doesn't count)
await page.evaluate(()=>{window.ShambConkins.store.profile.smbBowsers=[2,4];window.ShambConkins.requestGame({id:'smb-world-1',origin:'arcade'});});await page.waitForTimeout(400);
await page.evaluate(()=>[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent))?.click());await page.waitForTimeout(900);
const dbg=(fn,arg)=>page.evaluate(([fn,arg])=>{const d=window.ShambConkins.store.session.debug;return new Function('d','arg',fn)(d,arg);},[fn,arg]);
const shot=n=>page.screenshot({path:`${out}/smbx-${n}.png`});
const until=async(fn,ms=8000)=>{const t0=Date.now();let v;while(Date.now()-t0<ms){v=await dbg(fn);if(v)return v;await page.waitForTimeout(100);}return v;};
const ready=async()=>{for(let i=0;i<40;i++){if(await page.evaluate(()=>!!document.querySelector('.pass-overlay [data-ready]')))break;await page.waitForTimeout(120);}await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(250);};

// ---- world select
const list=await dbg('return d.startList;');if(JSON.stringify(list)!=='[1,3,5]')fail('start list '+JSON.stringify(list));else pass('start list = worlds 1, 3 and 5 (Bowsers 2 and 4 beaten)');
await page.keyboard.press('d');await page.waitForTimeout(200);await shot('title-world');
{const sw=await dbg('return d.worlds[0].st===d.STAGES[8]&&d.pl[0].stage===8;');if(!sw)fail('title screen did not switch to 3-1 behind the menu');else pass('title shows 3-1 behind WORLD 3');}
await dbg('d.start(0,3);');await ready();await until('return d.phase==="card"');const st=await dbg('return d.pl[0].stage;');
if(st!==8)fail('world 3 start stage '+st);else pass('starts in 3-1');
await until('if(d.phase==="card")d.skipCard();return d.phase==="play";');
// clear enemies of this player's world copy so nothing interrupts the checks
const go=async(stage,area='main')=>{await dbg(`d.teleport(0,60,${stage});const w=d.worlds[0];for(const a of Object.values(w.areas))a.enemies.forEach(e=>{if(e.type!=='spiny')e.alive=false;});d.pl[0].time=400;`);await page.waitForTimeout(150);};

// ---- beanstalk → cloud area → drop back into the stage
{await go(12);const v=await dbg(`const a=d.worlds[0].areas.main,def=a.def;let at=null;for(const [k,w] of a.content)if(w==='vine')at=[k%def.W,Math.floor(k/def.W)];return at&&{at,vineTo:!!def.vineTo,fall:def.vineTo&&d.STAGES[12].areas.cloud.fallTo};`);
 if(!v?.at||!v.vineTo)fail('4-1 has no beanstalk '+JSON.stringify(v));else{
  await dbg(`d.bump(0,${v.at[0]},${v.at[1]});`);await page.waitForTimeout(3600);
  const top=await dbg('return d.worlds[0].areas.main.vines[0]?.top;');if(!(top<=-16))fail('vine did not grow to the top: '+top);else pass('vine grew, tip at '+top);
  await dbg(`const p=d.pl[0];Object.assign(p,{x:${v.at[0]}*16+8,y:${v.at[1]}*16-2,prevY:${v.at[1]}*16-2,grounded:false,vy:-1,vx:0});`);await page.keyboard.down('w');
  const inCloud=await until('return d.pl[0].area==="cloud";',9000);await page.keyboard.up('w');await shot('cloud');
  if(!inCloud)fail('climbing did not reach the cloud area ('+JSON.stringify(await dbg('const p=d.pl[0];return {a:p.area,y:p.y,climb:!!p.climb};'))+')');else pass('climbed into the cloud area');
  await dbg('const p=d.pl[0];p.x=70*16;p.y=11*16;p.grounded=true;');await page.keyboard.down('d');
  const back=await until('return d.pl[0].area==="main"&&!d.pl[0].dead;',6000);await page.keyboard.up('d');
  const px=await dbg('return Math.round(d.pl[0].x/16);');if(!back)fail('falling off the clouds did not drop back into the stage');else pass('dropped back into 4-1 at column '+px+' (landing '+Math.round(v.fall.x/16)+')');
  const alive=await until('return !d.pl[0].dead&&d.pl[0].grounded;',4000);if(!alive)fail('did not land safely after the cloud area');}}

// ---- a pipe to a coin room, and out again further on
{await go(12);const pp=await dbg(`const def=d.worlds[0].areas.main.def,dr=def.doors.find(x=>x.to&&x.to.area==='bonus'),ex=def.pipes.find(x=>x.exitOf==='bonus');return dr&&{c:dr.c,top:dr.top,exit:ex&&ex.c};`);
 if(!pp||pp.exit==null)fail('4-1 bonus pipe/exit missing '+JSON.stringify(pp));else{
  await dbg(`const p=d.pl[0];Object.assign(p,{x:(${pp.c}+1)*16,y:${pp.top}*16,prevY:${pp.top}*16,grounded:true,vx:0,vy:0});`);await page.keyboard.down('s');
  const room=await until('return d.pl[0].area==="bonus";',4000);await page.keyboard.up('s');await page.waitForTimeout(700);await shot('bonus-room');
  if(!room)fail('down the pipe did not reach the coin room');else pass('down the pipe into the coin room');
  await dbg('const p=d.pl[0];p.x=10*16;p.y=13*16;p.grounded=true;');await page.keyboard.down('d');
  const outp=await until('return d.pl[0].area==="main"&&!d.pl[0].pipe;',6000);await page.keyboard.up('d');
  const ex=await dbg('return Math.round(d.pl[0].x/16);');if(!outp)fail('side pipe did not lead back out');else if(Math.abs(ex-pp.exit-1)>1)fail(`came out at ${ex}, exit pipe at ${pp.exit}`);else pass('out of the exit pipe at column '+ex);}}

// ---- a ceiling run past the exit pipe drops into the secret roof room, whose pipe leads to the flagpole (3-2, 4-2)
for(const [stage,nm] of [[9,'3-2'],[13,'4-2']]){await go(stage);
 const rr=await dbg('const def=d.worlds[0].areas.main.def;return def.roofRoomX&&{x:def.roofRoomX,pipe:def.pipes.find(p=>(p.warp||p.to&&p.to.area==="exit")&&p.c*16>def.roofRoomX),warps:def.pipes.filter(p=>p.warp&&p.c*16>def.roofRoomX).map(p=>p.warp)};');
 if(!rr||!rr.pipe){fail(nm+' has no roof room');continue;}
 await dbg(`const p=d.pl[0];Object.assign(p,{x:${rr.x}-6*16,y:2*16,prevY:2*16,grounded:true,vx:0,vy:0});`);await page.keyboard.down('d');
 const inRoom=await until(`const p=d.pl[0];return p.x>${rr.x}+16&&p.grounded&&p.y>=12*16;`,6000);await page.keyboard.up('d');await shot('roof-'+nm);
 if(!inRoom)fail(nm+' roof run did not drop into the room '+JSON.stringify(await dbg('const p=d.pl[0];return {x:p.x,y:p.y,a:p.area};')));else pass(nm+' roof run drops into the secret room');
 await dbg(`const p=d.pl[0];Object.assign(p,{x:(${rr.pipe.c}+1)*16,y:${rr.pipe.top}*16,prevY:${rr.pipe.top}*16,grounded:true,vx:0,vy:0});`);await page.keyboard.down('s');
 if(rr.warps.length){if(JSON.stringify(rr.warps)!=='[5,6,7]')fail(nm+' roof Warp Zone pipes '+JSON.stringify(rr.warps));
  const m=await until('return d.warpMsg&&d.warpMsg.world;',4000);await page.keyboard.up('s');if(m!==rr.warps[0])fail(nm+' roof warp went to world '+m);else pass(nm+' roof room = Warp Zone 5/6/7 (pipe → World '+m+')');
  await dbg('if(d.warpMsg)d.warpMsg.t=9999;');await until('if(d.phase==="card")d.skipCard();return d.phase==="play";',8000);continue;}
 const ex=await until('return d.pl[0].area==="exit";',5000);await page.keyboard.up('s');await page.waitForTimeout(600);
 if(!ex)fail(nm+' roof room pipe did not lead to the flagpole area');else pass(nm+' roof room pipe → flagpole area');}

// ---- flying over the flagpole (cape) still catches the flag at the top: past it there's only the castle
{await go(18);const f=await dbg('const f=d.worlds[0].areas.main.def.flag;return {x:f.x,top:f.top};');
 await dbg(`const p=d.pl[0];Object.assign(p,{area:'main',x:${f.x}+30,y:${f.top}-30,prevY:${f.top}-30,vx:2.5,vy:0,grounded:false,flag:null,flagged:false});`);
 const got=await until('return !!d.pl[0].flag;',3000);if(!got)fail('flying over the 5-3 flagpole did not catch the flag');else pass('flew over the flagpole: caught at the top');
 await until('if(d.phase==="card")d.skipCard();return d.phase==="play"&&d.pl[0].stage!==18;',15000);}

// ---- 4-2: the hidden shelf pipe → Warp Zone → World 6
{await go(13);const wp=await dbg(`const def=d.worlds[0].areas.main.def,dr=def.doors.find(x=>x.to&&x.to.area==='warp');return dr&&{c:dr.c,top:dr.top};`);
 if(!wp)fail('4-2 warp pipe missing');else{
  await dbg(`const p=d.pl[0];p.area='main';Object.assign(p,{x:(${wp.c}+1)*16,y:${wp.top}*16,prevY:${wp.top}*16,grounded:true,vx:0,vy:0});d.cams[0].x=Math.max(0,p.x-150);`);await page.waitForTimeout(200);await shot('42-shelf');await page.keyboard.down('s');
  const inw=await until('return d.pl[0].area==="warp";',4000);await page.keyboard.up('s');await page.waitForTimeout(700);await shot('42-warpzone');
  if(!inw)fail('4-2 shelf pipe did not lead to the Warp Zone');else{pass('4-2 secret pipe → Warp Zone');
   const ws=await dbg('return d.worlds[0].areas.warp.def.pipes.map(p=>p.warp);');if(JSON.stringify(ws)!=='[5,6,7]')fail('warp pipes '+JSON.stringify(ws));else pass('warp pipes 5, 6, 7');
   const p6=await dbg('return d.worlds[0].areas.warp.def.pipes.find(p=>p.warp===6);');
   await dbg(`const p=d.pl[0];Object.assign(p,{x:(${p6.c}+1)*16,y:${p6.top}*16,prevY:${p6.top}*16,grounded:true,vx:0,vy:0});`);await page.keyboard.down('s');
   const m=await until('return d.warpMsg&&d.warpMsg.world;',4000);await page.keyboard.up('s');if(m!==6)fail('warp message world '+m);await page.waitForTimeout(500);await shot('42-warp6');
   await dbg('if(d.warpMsg)d.warpMsg.t=9999;');const st6=await until('return d.phase==="card"&&d.pl[0].stage;',8000);if(st6!==20)fail('warp 6 went to stage '+st6);else pass('warp pipe 6 → 6-1');
   await until('if(d.phase==="card")d.skipCard();return d.phase==="play";');}}}

// ---- 5-1: the cloud rider throws spiky shells
{await go(16);await dbg(`const a=d.worlds[0].areas.main,rd=a.enemies.find(e=>e.type==='rider');Object.assign(rd,{alive:true,active:true,state:'fly',x:d.pl[0].x+60,thr:20});`);
 const n=await until('const a=d.worlds[0].areas.main;return a.enemies.filter(e=>e.type==="spiny"&&e.alive).length;',6000);await page.waitForTimeout(1500);await shot('rider');
 if(!n)fail('the cloud rider threw nothing');else pass('cloud rider threw a spiky shell');
 const walk=await until('return d.worlds[0].areas.main.enemies.some(e=>e.type==="spiny"&&e.alive&&e.state==="walk");',5000);if(!walk)fail('the spiky shell did not land and walk');else pass('spiky shell landed and walks');}

// ---- World 4 skis: a full-speed run up the big kicker lands on the high route
{await go(12);const k=await dbg(`const a=d.worlds[0].areas.main;return a.def.ramps.find(r=>r.big);`);
 if(!k)fail('4-1 has no big kicker');else{
  await dbg(`const p=d.pl[0];d.teleport(0,(${k.c}-11)*16,12);const a=d.worlds[0].areas.main;a.enemies.forEach(e=>e.alive=false);p.skis=true;p.big=true;window.__hy=999;window.__air=0;`);
  await page.keyboard.down('d');await page.keyboard.down(' ');
  const on=await until(`const p=d.pl[0];if(p.grounded&&Math.abs(p.y-${k.r||13}*16+6*16)<2&&p.x>${k.c}*16)return true;return false;`,7000);
  await page.keyboard.up('d');await page.keyboard.up(' ');await shot('ski-high-route');
  if(!on)fail('did not land on the high route ('+JSON.stringify(await dbg('const p=d.pl[0];return {x:Math.round(p.x/16),y:p.y};'))+')');else pass('big kicker → high route');}}

// ---- climbers throw hammers; penguins slide off ledges
{await go(12);await dbg(`const a=d.worlds[0].areas.main,W=a.def.W,c0=Math.floor(d.pl[0].x/16);for(let c=c0;c<c0+16;c++)for(let r=0;r<13;r++)a.tiles[r*W+c]=0;for(let c=c0+8;c<c0+11;c++)a.tiles[9*W+c]=5;`);
 await dbg('const p=d.pl[0];d.spawn(0,"climber",p.x+100);const k=d.spawn(0,"penguin",p.x+136,9*16);d.worlds[0].areas.main.enemies[k].vx=.9;');
 const ham=await until('return (d.flames()||[]).some(f=>f.look==="hammer");',5000);await shot('hammer');if(!ham)fail('climber threw no hammer');else pass('climber throws hammers');
 const fell=await until('return d.worlds[0].areas.main.enemies.some(e=>e.type==="penguin"&&e.alive&&e.y>9*16+8);',4000);if(!fell)fail('penguin turned at the ledge');else pass('penguin slid off the ledge');}

if(errors.length)fail('page errors: '+errors.join(' ; '));
await browser.close();console.log(ok?'mario secrets OK':'mario secrets FAILED');process.exit(ok?0:1);
