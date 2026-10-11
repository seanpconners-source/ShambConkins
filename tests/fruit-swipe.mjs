// Focused Fruit Ninja stroke and real input-handler regression checks.
// Run: node tests/fruit-swipe.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../src/engines/fruitSlice.js',import.meta.url),'utf8');
function fixture(){
 let now=0,frame=()=>{},reset=()=>{};
 const canvas={},window={},document={},listeners=[];
 const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});
 const exports={},scores=[0,0];
 const s={
  W:680,H:380,seed:'stroke-test',paused:false,
  body:{classList:{add(){}}},players:[{name:'A'},{name:'B'}],
  canvas:()=>[canvas,ctx],pointer:ev=>({x:ev.clientX,y:ev.clientY}),
  on:(el,type,fn)=>listeners.push({el,type,fn}),capture(){},release(){},
  resetOnPause:fn=>{reset=fn;},cleanup(){},hint(){},status(){},sprite(){},react(){},
  setScores:next=>{scores.splice(0,2,...next);},
  frame:fn=>{frame=fn;},pass:async()=>true,finish:next=>{scores.splice(0,2,...next);}
 };
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 vm.runInNewContext(source,{
  exports,window,document,performance:{now:()=>now},
  require:module=>{
   if(module==='src/utils.js')return {clamp,seededRandom:()=>()=>.5};
   if(module==='src/engines/session.js')return {circle(){}};
   if(module==='src/audio.js')return {sound(){}};
   throw Error('Unexpected dependency: '+module);
  }
 },{filename:'fruitSlice.js'});
 const emit=(el,type,props={})=>{
  for(const l of listeners)if(l.el===el&&l.type===type)l.fn({...props,preventDefault(){}});
 };
 const down=(x,y)=>emit(canvas,'pointerdown',{pointerId:1,clientX:x,clientY:y});
 const move=(x,y)=>emit(canvas,'pointermove',{pointerId:1,clientX:x,clientY:y});
 const up=(x,y)=>emit(canvas,'pointerup',{pointerId:1,clientX:x,clientY:y});
 const fruit=(x,y=100,bomb=false)=>s.debug.normalizedFruits.push({x:x/s.W,y:y/s.H,cut:false,bomb,vx:0,vy:0,kind:0});
 return {exports,s,scores,canvas,window,document,emit,down,move,up,fruit,
  time:ms=>{now=ms;},tick:dt=>frame(dt),pause:()=>reset()};
}
const fx=fixture(),{fruitSwipeStep,SWIPE_LIMITS}=fx.exports;
assert.equal(SWIPE_LIMITS.maxStrokeMs,380);
assert.equal(SWIPE_LIMITS.maxGapMs,160);
function tracker(){return {p:{x:0,y:100},at:0,stroke:null};}
{
 const t=tracker();
 assert.equal(fruitSwipeStep(t,{x:3,y:100},20,680,380).a,null,'tiny jitter does not slice');
 assert.equal(fruitSwipeStep(t,{x:6,y:100},60,680,380).a,null,'drift below threshold');
 assert.equal(fruitSwipeStep(t,{x:30,y:100},500,680,380).a,null,'held finger must not teleport-slice');
 assert.ok(fruitSwipeStep(t,{x:65,y:100},530,680,380).a,'fresh purposeful move can slice while still down');
 assert.equal(fruitSwipeStep(t,{x:75,y:100},540,680,380).reset,false);
 assert.equal(fruitSwipeStep(t,{x:40,y:100},570,680,380).reset,true,'reversal ends old combo');
 assert.equal(fruitSwipeStep(t,{x:60,y:100},1000,680,380).a,null,'pause does not bridge');
}
{
 const t=tracker();
 for(let i=1;i<=6;i++){
  const out=fruitSwipeStep(t,{x:i*35,y:100},i*95,680,380);
  if(i===1)assert.ok(out.a);
  if(i===6)assert.equal(out.reset,true,'continuous scribble cannot extend one combo forever');
 }
}
await fx.exports.fruitslice(fx.s);
fx.tick(0);
fx.fruit(90);fx.fruit(150);fx.fruit(210);
fx.down(40,100);fx.time(40);fx.move(112,100);fx.time(80);fx.move(170,100);fx.time(120);fx.move(240,100);
assert.equal(fx.scores[0],35,'one fast three-head swipe keeps +15 third hit');
fx.time(620);fx.fruit(260);fx.move(270,100);
assert.equal(fx.scores[0],35,'idle pointer does not carry combo or cut on resumption');
fx.time(650);fx.move(300,100);
assert.equal(fx.scores[0],45,'fresh stroke while held starts at +10');
fx.emit(fx.canvas,'pointercancel',{pointerId:1});
fx.fruit(360);fx.time(700);fx.down(310,100);fx.time(730);fx.move(395,100);fx.up(395,100);
assert.equal(fx.scores[0],55,'cancelled gesture cannot leak its combo');
fx.emit(fx.window,'blur');
fx.emit(fx.window,'resize');
fx.pause();
fx.fruit(450);fx.time(800);fx.down(400,100);fx.time(830);fx.move(490,100);fx.up(490,100);
assert.equal(fx.scores[0],65,'blur/resize/pause clear combo state');
await fx.s.debug.end();
fx.tick(0);
assert.equal(fx.s.debug.actor,1,'handoff starts other player');
fx.fruit(110);fx.time(900);fx.down(55,100);fx.time(930);fx.move(145,100);fx.up(145,100);
assert.equal(fx.scores[1],10,'next player begins a fresh combo');
const kb=fixture();
await kb.exports.fruitslice(kb.s);kb.tick(0);
kb.fruit(100);kb.fruit(210);kb.fruit(320);
for(let i=0;i<3;i++)kb.emit(kb.document,'keydown',{key:' ',repeat:false});
assert.equal(kb.scores[0],30,'three Space presses are not a three-hit swipe');
kb.fruit(430);
kb.emit(kb.document,'keydown',{key:' ',repeat:true});
assert.equal(kb.scores[0],30,'key repeat cannot farm extra slices');
kb.emit(kb.document,'keydown',{key:' ',repeat:false});
assert.equal(kb.scores[0],40);
console.log('Fruit Ninja finite swipes: helper, pointer, hold, cancel, reset, handoff and keyboard checks passed');
