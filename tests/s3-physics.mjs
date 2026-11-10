// Node test for the Sonic 3 engine's terrain + physics (src/engines/s3/terrain.js, physics.js): on a test course with a
// valley, a loop on two collision paths, a one-way ledge and a wall, a runner speeds up to top speed, runs the whole loop
// (floor -> right wall -> ceiling -> left wall -> floor), spin dashes, jumps and lands, stands on a one-way ledge from above
// but jumps up through it, and stops at the wall. Run: node tests/s3-physics.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url),cache=new Map();
function load(id){if(cache.has(id))return cache.get(id).exports;const mod={exports:{}};cache.set(id,mod);
 runInNewContext(readFileSync(new URL(id,root),'utf8'),{exports:mod.exports,require:load,Math,console,Map,WeakMap,Set,Uint8Array,Uint16Array,Uint32Array,Float32Array,Error,Object,Array,Number,JSON,Infinity,NaN,isFinite},{filename:id});return mod.exports;}
const {Terrain,arc,ease}=load('src/engines/s3/terrain.js'),P=load('src/engines/s3/physics.js');
const FY=1200,cx=2600,R=112,cy=FY-R,BAND=24;
const T=new Terrain(5200,1600);
const top=[[0,FY],[900,FY],...ease(900,FY,1300,FY+90).slice(1),...ease(1300,FY+90,1700,FY).slice(1),[4700,FY],[4700,FY-400],[5200,FY-400]];
T.poly([...top,[5200,1600],[0,1600]]);
T.poly([...arc(cx,cy,R+BAND,-Math.PI/2,Math.PI/2),...arc(cx,cy,R,Math.PI/2,-Math.PI/2)],'a');
T.poly([...arc(cx,cy,R+BAND,Math.PI/2,Math.PI*1.5),...arc(cx,cy,R,Math.PI*1.5,Math.PI/2)],'b');
T.poly([[3600,FY-80],[3800,FY-80],[3800,FY-64],[3600,FY-64]],"top");
T.build();
const switchers=[{x:cx,y0:cy-R-60,y1:cy-R*.3,left:'b',right:'a'},{x:cx+R+70,y0:cy-R,y1:FY+40,left:'a',right:'a'},{x:cx-R-70,y0:cy-R,y1:FY+40,left:'a',right:'a'}];
console.log('tiles in pool',T.tiles());
assert.ok(T.solid(100,FY+1,'a')&&!T.solid(100,FY-1,'a'),'flat floor at FY');
assert.ok(T.solid(cx+R+5,cy,'a')&&!T.solid(cx+R+5,cy,'b'),'right half of the loop is path A only');
assert.ok(T.solid(cx-R-5,cy,'b')&&!T.solid(cx-R-5,cy,'a'),'left half is path B only');
assert.ok(T.solid(3700,FY-72,"a",true)&&!T.solid(3700,FY-72,"a",false),'one-way ledge counts only as a floor');

const run=(p,frames,inp,watch)=>{for(let f=0;f<frames;f++){P.step(p,typeof inp==='function'?inp(p,f):inp,T,{switchers});watch?.(p,f);}return p;};
const R_=(o={})=>({l:false,r:true,u:false,d:false,jump:false,jumpPress:false,...o});
// 1. standing still on flat ground stays put; running reaches top speed 6 in ~128 frames
let p=P.makeRunner(200,FY-P.C.hr);run(p,30,R_({r:false}));
assert.ok(p.ground&&Math.abs(p.y-(FY-19))<.6&&Math.abs(p.x-200)<.01,`stands still on the floor (${p.x},${p.y})`);
run(p,128,R_());assert.ok(Math.abs(p.gsp-6)<1e-9,`top speed 6 after 128 frames (${p.gsp})`);
// 2. the valley: still grounded all the way through, speed regained climbing out
let air=0;run(p,240,R_(),q=>{if(!q.ground)air++;});
assert.ok(air<4,`stays on the ground through the valley (${air} air frames)`);assert.ok(p.x>1700,'got through the valley');
// 3. the loop: run right at speed, go all the way round
const modes=new Set();let left=0,minY=1e9;
run(p,400,R_(),q=>{if(q.ground)modes.add(P.modeOf(q.ang));if(Math.abs(q.x-cx)<R)minY=Math.min(minY,q.y);if(!q.ground&&Math.abs(q.x-cx)<R+30)left++;});
console.log('loop modes',[...modes],'top y',Math.round(minY),'air frames near loop',left,'x',Math.round(p.x),'path',p.path,'gsp',p.gsp.toFixed(2));
assert.deepEqual([...modes].sort(),[0,1,2,3],'used floor, both walls and the ceiling');
assert.ok(minY<cy-R+30,`reached the top of the loop (${Math.round(minY)} vs ${cy-R})`);
assert.ok(left<6,`stayed on the track round the loop (${left} air frames)`);
assert.ok(p.x>cx+R+80&&p.ground&&p.path==='a',`came out the other side on path A (${Math.round(p.x)}, ${p.path})`);
// 4. too slow for the loop: falls off the wall and doesn't get round
p=P.makeRunner(cx-260,FY-19);let ceil=false;run(p,260,(q,f)=>R_({r:f<40}),q=>{if(q.ground&&P.modeOf(q.ang)===2)ceil=true;});
assert.ok(!ceil,'a slow runner never reaches the ceiling');
// 5. spin dash: crouch, rev 3 times, release -> rolling at 8 + rev/2
p=P.makeRunner(300,FY-19);run(p,2,R_({r:false,d:true}));assert.ok(p.crouch,'crouches');
for(let k=0;k<3;k++){run(p,1,R_({r:false,d:true,jump:true,jumpPress:true}));run(p,2,R_({r:false,d:true}));}
assert.ok(p.spindash&&p.rev>4,`revving (${p.rev})`);run(p,1,R_({r:false}));
assert.ok(p.rolling&&p.gsp>10&&p.gsp<=12,`spin dash release speed ${p.gsp}`);
// 6. jump on flat: lands back on the floor; hold jump goes higher than tap
const jumpTop=held=>{const q=P.makeRunner(400,FY-19);let y=1e9;run(q,1,R_({r:false,jump:true,jumpPress:true}));run(q,80,R_({r:false,jump:held}),r=>{y=Math.min(y,r.y);});return {q,h:FY-19-y};};
const hi=jumpTop(true),lo=jumpTop(false);
console.log('jump heights',hi.h.toFixed(1),lo.h.toFixed(1));
assert.ok(hi.q.ground&&Math.abs(hi.q.y-(FY-19))<.6,'lands after a jump');assert.ok(hi.h>90&&hi.h<100,`full jump ~95 px (${hi.h})`);assert.ok(lo.h<hi.h*0.6,'tap jump is lower');
// 7. one-way ledge: jump up through it from below and land on top
p=P.makeRunner(3700,FY-19);run(p,1,R_({r:false,jump:true,jumpPress:true}));run(p,90,R_({r:false,jump:true}));
assert.ok(p.ground&&Math.abs(p.y-(FY-80-19))<1,`stands on the one-way ledge (${p.y})`);
// 8. wall: running into it stops at the wall
p=P.makeRunner(4400,FY-19);run(p,200,R_());assert.ok(p.ground&&p.gsp===0&&p.x<4700-9&&p.x>4700-12,`stopped at the wall (${p.x}, gsp ${p.gsp})`);
console.log('s3-physics OK');
