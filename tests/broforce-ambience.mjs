// BF-33 deterministic WebAudio-only lifecycle tests: no browser, DOM, or sound device.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';

const code=readFileSync(resolve(import.meta.dirname,'../src/engines/broforce/ambience.js'),'utf8');
const STAGES=['broforce-jungle','broforce-factory','broforce-city','broforce-desert'];
class Param {
 constructor(){this.value=0;this.events=[];}
 setValueAtTime(value,time){this.value=value;this.events.push(['set',value,time]);}
 linearRampToValueAtTime(value,time){this.events.push(['linear',value,time]);}
 exponentialRampToValueAtTime(value,time){this.events.push(['exponential',value,time]);}
}
class Node {
 constructor(type){this.kind=type;this.connections=[];this.disconnected=false;
  this.gain=new Param();this.frequency=new Param();this.Q=new Param();}
 connect(target){this.connections.push(target);return target;}
 disconnect(){this.disconnected=true;this.connections=[];}
}
class Source extends Node {
 constructor(kind){super(kind);this.starts=[];this.stops=[];this.onended=null;}
 start(t){assert.equal(this.starts.length,0,'source starts exactly once');this.starts.push(t);}
 stop(t){this.stops.push(t);}
 finish(){const cb=this.onended;this.onended=null;cb?.();}
}
class Audio {
 constructor(state='running'){
  this.state=state;this.currentTime=0;this.sampleRate=22050;this.destination=new Node('destination');
  this.nodes=[];this.sources=[];this.resumeCalls=0;this.buffers=[];
 }
 make(kind,source=false){const n=source?new Source(kind):new Node(kind);
  this.nodes.push(n);if(source)this.sources.push(n);return n;}
 createGain(){return this.make('gain');}
 createOscillator(){return this.make('oscillator',true);}
 createBufferSource(){return this.make('noise',true);}
 createBiquadFilter(){return this.make('filter');}
 createBuffer(ch,length,sr){assert.equal(ch,1);assert.equal(sr,this.sampleRate);
  assert.ok(length>0&&length<=this.sampleRate,'short noise buffer only');
  const buffer={getChannelData:()=>new Float32Array(length)};this.buffers.push(buffer);return buffer;}
 resume(){this.resumeCalls++;return Promise.resolve().then(()=>{this.state='running';});}
 finishExpired(){for(const src of this.sources){const end=src.stops[0];
  if(end>0&&end<=this.currentTime&&src.onended)src.finish();}}
 get live(){return this.sources.filter(s=>s.starts.length&&!s.disconnected&&!s.stops.includes(0)
  &&s.stops[0]>this.currentTime).length;}
}
class Clock {
 constructor(a){this.a=a;this.queue=new Map();this.nextId=0;this.ms=0;this.peakTimers=0;}
 setTimeout(fn,delay){const id=++this.nextId;this.queue.set(id,{fn,due:this.ms+delay});
  this.peakTimers=Math.max(this.peakTimers,this.queue.size);return id;}
 clearTimeout(id){this.queue.delete(id);}
 advance(ms){const target=this.ms+ms;let guard=0;
  while(true){const due=[...this.queue].filter(([,t])=>t.due<=target).sort((a,b)=>a[1].due-b[1].due)[0];
   if(!due)break;
   assert.ok(++guard<200,'no tight timer recursion');
   this.ms=due[1].due;this.a.currentTime=this.ms/1000;this.a.finishExpired();
   this.queue.delete(due[0]);due[1].fn();
  }
  this.ms=target;this.a.currentTime=target/1000;this.a.finishExpired();
 }
}
function setup({stageId='broforce-jungle',sound=true,music=true,reducedMotion=false,
 state='running',context=true}={}){
 const a=new Audio(state),clock=new Clock(a),settings={sound,music,reducedMotion};
 const module={exports:{}};let calls=0;
 runInNewContext(code,{exports:module.exports,Math,Promise,Number,Object,Set,Map,
  setTimeout:clock.setTimeout.bind(clock),clearTimeout:clock.clearTimeout.bind(clock)},
  {filename:'broforce/ambience.js',timeout:2000});
 const make=(id=stageId)=>module.exports.createBroforceAmbience({
  getContext:()=>{calls++;return context?a:null;},getSettings:()=>settings,stageId:id
 });
 return {a,clock,settings,make,fx:make(),get calls(){return calls;}};
}
function quiet(h){assert.equal(h.clock.queue.size,0,'no pending callbacks');
 assert.ok(h.a.nodes.every(n=>n.disconnected),'all owned nodes disconnected');
 assert.equal(h.a.live,0,'no active voices');}

test('lazy factory allocates no AudioContext or nodes until user gesture',()=>{
 const h=setup();assert.deepEqual(Object.keys(h.fx).sort(),
  ['pause','resume','setIntensity','start','stop']);
 assert.equal(h.calls,0);assert.equal(h.a.nodes.length,0);
 assert.equal(h.clock.queue.size,0);assert.equal(h.fx.resume(),false);
});
test('four original stage signatures differ in notes, rhythm, filters and texture',()=>{
 const identities=[];
 for(const id of STAGES){const h=setup({stageId:id});
  assert.equal(h.fx.start(),true,id);
  h.clock.advance(3600);
  const notes=h.a.nodes.filter(n=>n.kind==='oscillator').map(n=>n.frequency.events[0]?.[1]);
  const filters=h.a.nodes.filter(n=>n.kind==='filter').map(n=>[n.type,n.frequency.value]);
  assert.ok(notes.length>=2,id+' includes music');assert.ok(filters.length>=1,id+' includes ambience');
  assert.ok(h.a.buffers.length<=1,'one cached, bounded noise grain');
  assert.ok(h.clock.peakTimers<=1,'exactly one scheduler timeout');
  identities.push(JSON.stringify([notes.slice(0,8),filters[0],h.a.sources[0].starts[0]]));
  h.fx.stop();quiet(h);
 }
 assert.equal(new Set(identities).size,4);
});
test('sound and music are separately gated; total mute stays lazy',()=>{
 const muted=setup({sound:false,music:false});
 assert.equal(muted.fx.start(),false);assert.equal(muted.calls,0);
 assert.equal(muted.a.nodes.length,0);assert.equal(muted.clock.queue.size,0);
 const musicOnly=setup({sound:false});musicOnly.fx.start();musicOnly.clock.advance(1300);
 assert.ok(musicOnly.a.nodes.some(n=>n.kind==='oscillator'));
 assert.equal(musicOnly.a.nodes.filter(n=>n.kind==='noise').length,0);
 musicOnly.fx.stop();quiet(musicOnly);
 const soundOnly=setup({music:false});soundOnly.fx.start();soundOnly.clock.advance(1300);
 assert.equal(soundOnly.a.nodes.filter(n=>n.kind==='oscillator').length,0);
 assert.ok(soundOnly.a.nodes.some(n=>n.kind==='noise'));
 soundOnly.fx.stop();quiet(soundOnly);
});
test('live mute disconnects all audio; unmute via setIntensity restores without new context',()=>{
 const h=setup();h.fx.start();const initialSources=h.a.sources.length;
 h.settings.sound=false;h.settings.music=false;h.fx.setIntensity(.5);
 quiet(h);assert.ok(h.a.sources.slice(0,initialSources).every(s=>s.stops.includes(0)));
 h.settings.music=true;h.fx.setIntensity(.6);
 assert.ok(h.a.sources.length>initialSources,'new melody voices scheduled');
 assert.equal(h.calls,1,'shared context provider used once');
 h.fx.stop();quiet(h);
});
test('intensity clamps and reducedMotion quietly reduce background',()=>{
 const h=setup();h.fx.start();const master=h.a.nodes.find(n=>n.kind==='gain');
 assert.equal(h.fx.setIntensity(9),1);assert.equal(h.fx.setIntensity(-9),0);
 const full=master.gain.value;
 h.settings.reducedMotion=true;h.fx.setIntensity(.5);
 assert.ok(master.gain.value<full);
 assert.equal(h.fx.setIntensity(NaN),.5);
 h.fx.stop();quiet(h);
});
test('pause/visibility cleanup and resume freeze beats, never duplicate scheduler',()=>{
 const h=setup();h.fx.start();h.clock.advance(700);
 const old=h.a.sources.length;
 assert.equal(h.fx.pause(),true);quiet(h);
 assert.equal(h.fx.pause(),false);
 h.clock.advance(5000);assert.equal(h.a.sources.length,old,'paused clock does not schedule');
 assert.equal(h.fx.resume(),true);assert.equal(h.fx.resume(),false);
 assert.equal(h.clock.queue.size,1);
 h.clock.advance(1400);assert.ok(h.a.sources.length>old);
 h.fx.stop();quiet(h);
});
test('stop is terminal, idempotent and never closes the shared AudioContext',()=>{
 const h=setup();h.fx.start();h.fx.stop();h.fx.stop();quiet(h);
 const count=h.a.nodes.length;
 assert.equal(h.fx.start(),false);assert.equal(h.fx.resume(),false);
 h.fx.setIntensity(1);h.clock.advance(8000);
 assert.equal(h.a.nodes.length,count);
 assert.equal(h.a.state,'running');assert.equal(h.calls,1);
});
test('rapid stage switch on shared AudioContext has no overlapping or orphan voices',()=>{
 const h=setup();for(let i=0;i<40;i++){
  const fx=h.make(STAGES[i%4]);fx.start();h.clock.advance(260);
  assert.ok(h.a.live<=12,`bounded stage ${i}`);
  fx.stop();quiet(h);
 }
 assert.equal(h.clock.queue.size,0);assert.ok(h.clock.peakTimers<=1);
});
test('long play stays bounded and catches up after idle without burst',()=>{
 const h=setup({stageId:'broforce-factory'});h.fx.start();
 for(let i=0;i<140;i++){h.clock.advance(550);
  assert.ok(h.a.live<=12,`live voices bounded at tick ${i}`);
  assert.ok(h.clock.queue.size<=1);
 }
 // The scheduler must not allocate a sound source for every missed wall-clock frame.
 const before=h.a.sources.length;
 h.a.currentTime+=1000;h.fx.setIntensity(.7);h.clock.advance(550);
 assert.ok(h.a.sources.length-before<16,'skips missed beats');
 h.fx.stop();quiet(h);
});
test('suspended context resumes once on gesture; pause/stop cancel async revival',async()=>{
 const h=setup({state:'suspended'});assert.equal(h.fx.start(),true);
 assert.equal(h.fx.start(),true);assert.equal(h.a.resumeCalls,1);
 assert.equal(h.a.nodes.length,0,'defer graph until unlocked');
 h.fx.pause();await Promise.resolve();await Promise.resolve();
 assert.equal(h.a.nodes.length,0);quiet(h);
 assert.equal(h.fx.resume(),true);assert.equal(h.clock.queue.size,1);
 h.fx.stop();quiet(h);
 const h2=setup({state:'suspended'});h2.fx.start();h2.fx.stop();
 await Promise.resolve();await Promise.resolve();quiet(h2);
 assert.equal(h2.a.nodes.length,0);
});
test('null and throwing context providers fail safely without nodes/timers',()=>{
 for(const value of [null,()=>{throw Error('unavailable');}]){
  const h=setup({context:false});const fx=value===null?h.fx:
   (()=>{const mod={exports:{}};runInNewContext(code,{exports:mod.exports,Math,Promise,Number,Object,Set,Map,
    setTimeout:h.clock.setTimeout.bind(h.clock),clearTimeout:h.clock.clearTimeout.bind(h.clock)});
    return mod.exports.createBroforceAmbience({getContext:value});})();
  assert.equal(fx.start(),false);fx.stop();quiet(h);
 }
});
