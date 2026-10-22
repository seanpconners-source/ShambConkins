// Node test for the pinball engine (src/engines/pinball/): a bot flips when a ball comes down onto a flipper and
// plays whole 3-ball games on every table. Checks that balls never escape the cabinet or tunnel through walls, the
// plunge reaches the playfield, the main shots (ramps, pops, holes, drops, spinner) can all be made, and ball
// times are pinball-like. Run: node tests/pinball-sim.mjs [games=6] [table=buckethead]
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url),cache=new Map();
function load(id){if(cache.has(id))return cache.get(id).exports;const mod={exports:{}};cache.set(id,mod);
 runInNewContext(readFileSync(new URL(id,root),'utf8'),{exports:mod.exports,require:load,Math,console,Float32Array,Uint8Array,Error,Object,Array,Number,JSON,Infinity,NaN,isFinite,Set,Map,String,Boolean,Symbol},{filename:id});return mod.exports;}
const games=+(process.argv[2]||6),tableId=process.argv[3]||'buckethead';
const P=load('src/engines/pinball/physics.js'),{createMachine}=load('src/engines/pinball/machine.js'),table=load(`src/engines/pinball/tables/${tableId}.js`);
const def=table.buildTable();
// Inside the cabinet outline (x within walls, y above the drain).
const inside=b=>b.x>def.segs.reduce((a,s)=>Math.min(a,s.ax,s.bx),1e9)-1&&b.x<def.segs.reduce((a,s)=>Math.max(a,s.ax,s.bx),-1e9)+1&&b.y>-1;
const totals={},points={},modes={},ballTimes=[],jams=[];let escapes=0,maxV=0,scores=[],long=0,started=0;
for(let g=0;g<games;g++){
 const m=createMachine({table,players:1,seed:1000+g});m.startBall();started++;let t=0,ballT=0,hold=[0,0],pull=0,plungeAt=.6+((g*7)%5)*.15;const dt=1/60;
 for(;;){
  // bot: hold a flipper while a ball is coming down into its zone, release after
  const flip=[false,false];
  for(const f of m.w.flippers){const tipX=f.x+Math.cos(f.rest)*f.len,mid=(f.x+tipX)/2;for(const b of m.w.balls){if(b.state!=='free')continue;const dx=b.x-mid,dy=b.y-f.y;if(Math.abs(dx)<58&&dy>-70&&dy<20&&b.vy>40){hold[f.input]=.12+((g*31+Math.floor(t*97))%7)*.02;}}}
  for(let i=0;i<2;i++){if(hold[i]>0){flip[i]=true;hold[i]-=dt;}}
  if(m.phase==='plunge'){pull=Math.min(1,pull+dt*1.6);}
  const input={flip,pull:m.phase==='plunge'&&t<plungeAt?pull:0};
  if(m.phase==='plunge'&&t>=plungeAt){P.plunge(m.w,.55+((g*13)%9)*.05);}
  const before=m.players[m.cur].score,ev=m.tick(dt,input);t+=dt;ballT+=dt;
  // score by source: credit this frame's points to its events (or to timers/modes when no event)
  const gain=m.players[m.cur].score-before;if(gain){const k=ev.filter(e=>!/flip|wallHit|ballClick|spinnerHit/.test(e.type)).map(e=>e.type+(e.id?':'+e.id:''))[0]||'timer/mode';points[k]=(points[k]||0)+gain;}
  // modes: count each attraction / battle / multiball / wizard as it starts
  for(const [key,on] of [['attraction',!!m.ball.attr],['battle',!!m.ball.battle],['jordan',m.mode==='jordan'],['wizard',m.mode==='wizard']]){if(on&&!m.ball['seen_'+key]){modes[key]=(modes[key]||0)+1;if(key==='attraction')modes[m.ball.attr.def.id]=(modes[m.ball.attr.def.id]||0)+1;}m.ball['seen_'+key]=on;}
  for(const e of ev){const k=e.type+(e.id?':'+e.id:'');totals[k]=(totals[k]||0)+1;if(e.type==='drain'&&e.ball.y<def.drainY)escapes++;}
  for(const b of m.w.balls){maxV=Math.max(maxV,Math.hypot(b.vx,b.vy));if(b.state==='free'&&!inside(b)){escapes++;b.y=2000;}}
  if(m.phase==='drained'){m.endBall();ballTimes.push(ballT);ballT=0;const nx=m.advance();if(!nx)break;m.startBall();started++;t=0;pull=0;plungeAt=.6+((g*7+ballTimes.length)%5)*.15;}
  // a still ball for 10 s is a real jam (ball search should have freed it); a bot that keeps the ball alive is fine
  for(const b of m.w.balls){b.stillT=(b.state==='free'&&Math.hypot(b.vx,b.vy)<20)?(b.stillT||0)+dt:0;if(b.stillT>10){jams.push(`${b.x.toFixed(0)},${b.y.toFixed(0)}`);b.stillT=0;}}
  if(ballT>240){long++;m.w.balls.length=0;m.phase='drained';}
 }
 scores.push(m.players[0].score);
}
// Scripted rules check: every attraction can be finished by its shots, then the wizard mode lights and pays.
if(table.rules.ATTRACTIONS){
 const m=createMachine({table,players:1,seed:7}),R=table.rules,fake={hold:{t:1}};m.startBall();m.phase='play';
 const ev={coaster:{type:'rail',id:'coaster'},ramp:{type:'rail',id:'robot'},orbit:{type:'trigger',id:'orbitL',dir:-1},coop:{type:'hole',id:'coop',ball:fake},robot:{type:'toy',id:'giantRobot'},
  spin:{type:'spin',id:'spinner'},pop:{type:'bumper',id:'pop1'},egg:{type:'standup',id:'eggTarget'}};
 R.ATTRACTIONS.forEach((A,i)=>{m.p.attrNext=i;R.startAttraction(m);assert.equal(m.ball.attr.def.id,A.id);
  for(let k=0;k<80&&m.ball.attr;k++){const a=m.ball.attr,lit=a.lit[0];
   const e=A.id==='soothsayer'?{type:'standup',id:['bB','bU','bC','bK','bE','bT'][a.targets.indexOf(1)]}:A.id==='nunchuck'?ev.spin:A.id==='coop'?ev.pop:ev[lit];
   R.event(m,{...e,ball:fake});}
  assert.equal(m.p.attr[i],2,`${A.id} completes`);});
 assert.ok(m.p.wizardLit,'all five attractions light the wizard mode');
 // (Soothsayer also spells B-U-C-K-E-T, so the extra ball comes out of the Haunted Ride first.)
 R.event(m,{type:'hole',id:'haunted',ball:fake});if(m.mode!=='wizard')R.event(m,{type:'hole',id:'haunted',ball:fake});assert.equal(m.mode,'wizard','haunted starts the wizard');
 const before=m.players[0].score;for(const s of ['coaster','ramp','orbit','coop','robot'])R.event(m,{...ev[s],ball:fake});
 assert.equal(m.ball.wiz.round,2,'all wizard shots relight round 2');assert.ok(m.players[0].score-before>=10000000,'wizard pays');
 console.log('attractions + wizard OK, wizard round 1 paid',(m.players[0].score-before).toLocaleString());
}
const keys=Object.keys(totals).sort();console.log(keys.map(k=>`${k}=${totals[k]}`).join(' '));
console.log('scores',scores.map(s=>s.toLocaleString()).join(', '));
console.log('points by source',Object.entries(points).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>`${k} ${(v/1e6).toFixed(1)}M`).join(', '));
console.log('ball times',ballTimes.map(t=>t.toFixed(0)).join(' '),'max speed',maxV.toFixed(0));
assert.equal(escapes,0,'balls stay inside the cabinet');
console.log('balls',started,'kept alive past 240 s by the bot',long,'jams',jams.join(' ')||'none');
console.log('modes started',JSON.stringify(modes));
assert.equal(jams.length,0,'no jammed balls');
if(table.rules.ATTRACTIONS)assert.ok((modes.attraction||0)>=2,'the bot starts attraction modes');
assert.ok((totals['plunge']||0)>=started,'every ball plunged');
for(const k of ['bumper','sling','spin','drop','rail:coaster','rail:robot','hole:haunted','standup','rollover:laneB','toy:giantRobot','standup:eggTarget','rail:coopVuk','flip:flipU'])assert.ok(Object.keys(totals).some(x=>x.startsWith(k)),`bot made ${k}`);
console.log('pinball sim OK');
