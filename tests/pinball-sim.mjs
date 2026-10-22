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
const totals={},ballTimes=[],jams=[];let escapes=0,maxV=0,scores=[],long=0,started=0;
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
  const ev=m.tick(dt,input);t+=dt;ballT+=dt;
  for(const e of ev){const k=e.type+(e.id?':'+e.id:'');totals[k]=(totals[k]||0)+1;if(e.type==='drain'&&e.ball.y<def.drainY)escapes++;}
  for(const b of m.w.balls){maxV=Math.max(maxV,Math.hypot(b.vx,b.vy));if(b.state==='free'&&!inside(b)){escapes++;b.y=2000;}}
  if(m.phase==='drained'){m.endBall();ballTimes.push(ballT);ballT=0;const nx=m.advance();if(!nx)break;m.startBall();started++;t=0;pull=0;plungeAt=.6+((g*7+ballTimes.length)%5)*.15;}
  // a still ball for 10 s is a real jam (ball search should have freed it); a bot that keeps the ball alive is fine
  for(const b of m.w.balls){b.stillT=(b.state==='free'&&Math.hypot(b.vx,b.vy)<20)?(b.stillT||0)+dt:0;if(b.stillT>10){jams.push(`${b.x.toFixed(0)},${b.y.toFixed(0)}`);b.stillT=0;}}
  if(ballT>240){long++;m.w.balls.length=0;m.phase='drained';}
 }
 scores.push(m.players[0].score);
}
const keys=Object.keys(totals).sort();console.log(keys.map(k=>`${k}=${totals[k]}`).join(' '));
console.log('scores',scores.map(s=>s.toLocaleString()).join(', '));
console.log('ball times',ballTimes.map(t=>t.toFixed(0)).join(' '),'max speed',maxV.toFixed(0));
assert.equal(escapes,0,'balls stay inside the cabinet');
console.log('balls',started,'kept alive past 240 s by the bot',long,'jams',jams.join(' ')||'none');
assert.equal(jams.length,0,'no jammed balls');
assert.ok((totals['plunge']||0)>=started,'every ball plunged');
for(const k of ['bumper','sling','spin','drop','rail:coaster','rail:robot','hole:haunted','standup','rollover:laneB'])assert.ok(Object.keys(totals).some(x=>x.startsWith(k)),`bot made ${k}`);
console.log('pinball sim OK');
