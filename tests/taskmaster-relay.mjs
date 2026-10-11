// Focused, dependency-free gameplay/geometry regression checks for Taskmaster relay.
// Run: node tests/taskmaster-relay.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const fromRoot=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(source,requireFn=()=>{throw Error('unexpected require');},globals={}){
 const exp={};
 const fn=runInNewContext('(function(require,exports){'+source+'\n})',globals);
 fn(requireFn,exp);return exp;
}
const utils=load(fromRoot('src/utils.js'));
const world={window:{},document:{}};
const relay=load(fromRoot('src/engines/microRelay.js'),id=>{
 if(id==='src/utils.js')return utils;
 if(id==='src/engines/session.js')return {circle(){}};
 if(id==='src/audio.js')return {sound(){}};
 throw Error(id);
},world);
const {relayCourse,relayBoxHit,relayStackHit,relayStopHit,relaySortHit,relayDodgeHit}=relay;
function rounded(x){return JSON.parse(JSON.stringify(x));}
const course=rounded(relayCourse('matched-run'));
assert.deepEqual(course,rounded(relayCourse('matched-run')),'same seed gives same tasks and hazards');
assert.equal(course.length,7);
assert.equal(new Set(course.map(t=>t.id)).size,6,'all six mechanics appear');
assert(course.every(t=>t.seconds>=6&&t.seconds<=8));
assert(course.every((t,i)=>i===0||t.seconds<course[i-1].seconds),'countdowns shorten gently');
assert(course.reduce((n,t)=>n+t.seconds,0)>47);
assert(course.reduce((n,t)=>n+t.seconds,0)<52);
for(const seed of ['one','two','three','four','five','six']){
 const c=relayCourse(seed);
 assert.equal(c.length,7);
 assert.equal(new Set(c.map(t=>t.id)).size,6);
 for(const t of c)assert(t.drops.length===7&&t.colors.length===3);
}
const box={target:480};
assert(relayBoxHit({x:480,y:235},box));
assert(relayBoxHit({x:545,y:285},box));
assert(!relayBoxHit({x:310,y:235},box));
assert(relayStackHit({x:415,y:300}));
assert(!relayStackHit({x:150,y:235}));
assert(relaySortHit({x:180,y:245},0));
assert(relaySortHit({x:505,y:245},1));
assert(!relaySortHit({x:180,y:245},1));
assert(relayStopHit({target:440},500));
assert(!relayStopHit({target:440},280));
const drop={x:340,at:.7,speed:280},hitTime=.7+(284-133)/280;
assert(relayDodgeHit(drop,340,284,hitTime));
assert(!relayDodgeHit(drop,580,284,hitTime));
assert(!relayDodgeHit(drop,340,284,.6));
console.log('Taskmaster course, fairness and generous-target geometry: OK');

function harness(seed='same-test',cancelOn=null){
 const canvas={id:'canvas'},ctx=new Proxy({},{get:(target,key)=>target[key]||(()=>{}),set:(target,key,value)=>(target[key]=value,true)});
 const listeners=new Map(),onPause=[],cleanups=[],passes=[];
 const game={seed,players:[{name:'First'},{name:'Second'}],paused:false,active:0,alive:true,finishCalls:0,statusCalls:0,
  canvas:()=>[canvas,ctx,680,400],on:(el,event,fn)=>listeners.set((el===canvas?'canvas':el===world.window?'window':'document')+':'+event,fn),
  pointer:ev=>ev.p,capture(){},release(){},resetOnPause:f=>onPause.push(f),cleanup:f=>cleanups.push(f),
  frame:f=>game.step=f,pass:async(i)=>{passes.push(i);if(i===cancelOn){game.alive=false;return false;}return true;},hint(){},status(){game.statusCalls++;},
  updateScores(){},setScores:a=>{game.lastScores=[...a];},sprite(){},react(){},
  finish:(scores,label)=>{game.finishCalls++;game.alive=false;game.finished={scores:[...scores],label};}};
 const emit=(event,p={x:340,y:235},pointerId=1)=>listeners.get('canvas:'+event)?.({p,pointerId,preventDefault(){}});
 const tick=(frames=1)=>{for(let j=0;j<frames;j++)game.step(.05);};
 const until=async(check,limit=6000)=>{for(let n=0;n<limit;n++){if(check(game.debug))return;tick();await Promise.resolve();}throw Error('phase never reached: '+JSON.stringify(game.debug));};
 return {game,passes,emit,tick,until,onPause,cleanups,launch:()=>relay.microrelay(game)};
}
async function testTimeouts(){
 const h=harness();
 await h.launch();
 assert.deepEqual(h.passes,[0]);
 await h.until(d=>d?.phase==='running'&&d.index===-1);
 // Deliberately time out the FREE example.
 await h.until(d=>d?.index===0&&d.phase==='running');
 assert.deepEqual(rounded(h.game.debug.scores),[0,0],'practice cannot score');
 await h.until(()=>!!h.game.finished,5000);
 assert.deepEqual(h.passes,[0,1],'only one handoff per player');
 assert.deepEqual(rounded(h.game.finished.scores),[0,0],'missed tasks earn zero');
 assert.equal(h.game.debug.history[0].length,7);
 assert.equal(h.game.debug.history[1].length,7);
 assert.deepEqual(h.game.debug.history[0].map(x=>x.id),h.game.debug.history[1].map(x=>x.id));
 assert(h.game.finished.label.includes('0 / 7'));
 assert.equal(h.game.finishCalls,1,'finish() must be called exactly once');
 const rendered=h.game.statusCalls;
 h.tick(30); // A queued/stale frame after finish must be inert.
 h.emit('pointerdown',{x:340,y:235});h.emit('pointerup',{x:340,y:235});h.tick();
 assert.equal(h.game.finishCalls,1,'no duplicate finish after more frames/input');
 assert.equal(h.game.statusCalls,rendered,'no draw/status update after the last task');
 console.log('Practice, timeout recovery, full two-player completion and terminal guard: OK');
}
async function testInputs(){
 const h=harness('input-demo');await h.launch();
 await h.until(d=>d?.phase==='running'&&d.index===-1);
 h.emit('pointerdown',{x:130,y:235});
 h.emit('pointermove',{x:480,y:235});
 h.emit('pointerup',{x:480,y:235});
 assert.equal(h.game.debug.phase,'running','completion updates on next frame');
 h.tick();
 assert.equal(h.game.debug.phase,'result');
 assert.deepEqual(rounded(h.game.debug.scores),[0,0]);
 await h.until(d=>d?.phase==='running'&&d.index===0);
 // Pausing while held must release ownership. Cancelled pointers cannot award points.
 let t=h.game.debug.course[0];
 if(t.id==='box'||t.id==='stack'||t.id==='sort'){
  const origin=t.id==='sort'?{x:340,y:235}:{x:130,y:235};
  h.emit('pointerdown',origin);h.onPause.forEach(fn=>fn());h.emit('pointerup',{x:t.target||485,y:235});
  h.tick();assert.equal(h.game.debug.phase,'running','released-on-pause gesture cannot complete');
 }else{
  h.emit('pointerdown',{x:340,y:235});h.onPause.forEach(fn=>fn());
 }
 // A fresh gesture can be used after a cancelled one.
 h.emit('pointercancel',{x:400,y:235});h.tick();
 assert.equal(h.game.debug.pointer,null);
 // A paused frame must not burn the countdown. The session normally enforces this,
 // but this mock deliberately invokes the frame callback during pause/rotation.
 h.game.paused=true;
 const remaining=h.game.debug.clock;
 h.tick(10);
 assert.equal(h.game.debug.clock,remaining,'paused frames cannot consume time');
 h.game.paused=false;
 h.cleanups.forEach(fn=>fn());
 console.log('Practice gesture, pointer cancel/pause cleanup: OK');
}
async function testPerfectMatch(){
 const h=harness('mirror-run');
 await h.launch();
 // The two players receive the same course and earn equal scores for equivalent successes.
 let turns=0;
 for(let step=0;step<3500&&!h.game.finished;step++){
  h.tick();await Promise.resolve();const d=h.game.debug;
  if(!d||d.phase!=='running')continue;
  if(d.index<0){
   if(!d.actor._acted){
    h.emit('pointerdown',{x:130,y:235});h.emit('pointermove',{x:480,y:235});h.emit('pointerup',{x:480,y:235});d.actor._acted=true;
   }
   continue;
  }
  const t=d.course[d.index],a=d.actor;
  if(t.id==='box'&&!a._acted){
   h.emit('pointerdown',{x:130,y:235});h.emit('pointermove',{x:t.target,y:235});h.emit('pointerup',{x:t.target,y:235});a._acted=true;
  }else if(t.id==='stack'&&a.placed<2){
   h.emit('pointerdown',{x:130,y:235});h.emit('pointermove',{x:485,y:245});h.emit('pointerup',{x:485,y:245});
  }else if(t.id==='sort'&&a.sorted<3){
   const xx=t.colors[a.sorted]===0?176:504;
   h.emit('pointerdown',{x:340,y:235});h.emit('pointermove',{x:xx,y:245});h.emit('pointerup',{x:xx,y:245});
  }else if(t.id==='stop'&&relayStopHit(t,a.x)){
   h.emit('pointerdown',{x:340,y:235});
  }else if(t.id==='balance'&&!a._acted){
   h.emit('pointerdown',{x:340,y:235});a._acted=true;
  }else if(t.id==='dodge'&&!a._acted){
   h.emit('pointerdown',{x:620,y:280});a._acted=true;
  }
  if(d.index===0&&d.player===1)turns++;
 }
 assert(h.game.finished,'matched run finishes');
 assert.equal(h.game.debug.history[0].length,7);
 assert.equal(h.game.debug.history[1].length,7);
 assert.deepEqual(h.game.debug.history[0].map(z=>z.won),h.game.debug.history[1].map(z=>z.won));
 assert.deepEqual(h.game.finished.scores[0],h.game.finished.scores[1]);
 assert(h.game.finished.scores[0]>0,'positive scores for successful gestures');
 console.log('Matched-player gesture completion and scored fairness: OK');
}
async function testCancelledHandoff(){
 const h=harness('cancel-second-player',1);
 await h.launch();
 await h.until(()=>h.passes.length===2,4000);
 await Promise.resolve();
 assert.deepEqual(h.passes,[0,1]);
 assert.equal(h.game.alive,false,'cancelled pass aborts the session');
 assert.equal(h.game.finishCalls,0,'cancel cannot submit a result');
 const drawn=h.game.statusCalls;
 h.tick(30);h.emit('pointerdown');h.emit('pointerup');h.tick();
 assert.equal(h.game.finishCalls,0);
 assert.equal(h.game.statusCalls,drawn,'cancelled session cannot render');
 console.log('Cancelled handoff and post-cancel frame guards: OK');
}
await testTimeouts();
await testInputs();
await testPerfectMatch();
await testCancelledHandoff();
console.log('Taskmaster relay tests: PASS');
