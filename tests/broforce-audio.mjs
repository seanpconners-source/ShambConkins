// Isolated CommonJS-style module in a VM: no DOM, sound device or runtime dependencies.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';

const code=readFileSync(resolve(import.meta.dirname,'../src/engines/broforce/audio.js'),'utf8');
const NAMES=['jump','land','pistol','rifle','shotgun','grenade','explosion','wall-break',
 'impact','hit','rescue','swap','boss-intro','boss-hit','boss-death','helicopter',
 'extraction','win','lose'];

class Param{
 constructor(){this.value=0;this.events=[];}
 setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);}
 linearRampToValueAtTime(v,t){this.events.push(['linear',v,t]);}
 exponentialRampToValueAtTime(v,t){this.events.push(['exponential',v,t]);}
}
class Node{
 constructor(kind){this.kind=kind;this.connections=[];this.disconnected=false;this.gain=new Param();this.frequency=new Param();this.Q=new Param();}
 connect(target){this.connections.push(target);return target;}
 disconnect(){this.disconnected=true;this.connections.length=0;}
}
class Source extends Node{
 constructor(kind){super(kind);this.started=false;this.stops=[];this.onended=null;}
 start(at,offset){if(this.started)throw Error('double start');this.started=true;this.startAt=at;this.offset=offset;}
 stop(at){this.stops.push(at);this.stopAt=at;}
 finish(){if(this.onended)this.onended();}
}
class Audio{
 constructor(state='running'){
  this.state=state;this.currentTime=0;this.sampleRate=22050;
  this.destination=new Node('destination');this.nodes=[];this.sources=[];this.resumeCalls=0;
 }
 node(kind,source=false){const n=source?new Source(kind):new Node(kind);this.nodes.push(n);if(source)this.sources.push(n);return n;}
 createGain(){return this.node('gain');}
 createOscillator(){return this.node('oscillator',true);}
 createBufferSource(){return this.node('bufferSource',true);}
 createBiquadFilter(){return this.node('filter');}
 createBuffer(ch,length,sr){assert.equal(ch,1);assert.equal(sr,this.sampleRate);assert.ok(length>0&&length<30000);return {getChannelData:()=>new Float32Array(length)};}
 resume(){this.resumeCalls++;return Promise.resolve().then(()=>{this.state='running';});}
 finishAll(){for(const s of this.sources)s.finish();}
}
function setup({sound=true,reducedMotion=false,state='running',context=true}={}){
 const a=new Audio(state),settings={sound,reducedMotion};let calls=0;
 const module={exports:{}};
 runInNewContext(code,{exports:module.exports,Math,Promise,Number,Object,Set,Map}, {filename:'broforce/audio.js',timeout:2000});
 const fx=module.exports.createBroforceAudio(()=>{calls++;return context?a:null;},()=>settings);
 return {a,fx,settings,get calls(){return calls;}};
}

test('exports factory API without allocating WebAudio nodes',()=>{
 const h=setup();assert.deepEqual(Object.keys(h.fx).sort(),['play','stop']);
 assert.equal(h.a.nodes.length,0);assert.equal(h.calls,0);
});
test('mute, null context and unsupported names are silent, safely',()=>{
 const muted=setup({sound:false});assert.equal(muted.fx.play('pistol'),false);
 assert.equal(muted.a.nodes.length,0);assert.equal(muted.calls,0);
 const nullCtx=setup({context:false});assert.equal(nullCtx.fx.play('explosion'),false);
 assert.equal(nullCtx.a.nodes.length,0);
 const valid=setup();assert.equal(valid.fx.play('not-a-sound'),false);
 assert.equal(valid.fx.play('jump',{volume:0}),false);
 assert.equal(valid.a.nodes.length,0);
});
test('all nineteen original effects schedule finite source voices and envelopes',()=>{
 const h=setup();
 for(const name of NAMES){
  h.a.currentTime+=2;h.a.finishAll();
  const before=h.a.sources.length;
  assert.equal(h.fx.play(name),true,`${name} accepted`);
  const sources=h.a.sources.slice(before);
  assert.ok(sources.length>=2&&sources.length<=4,`${name} uses 2-4 layered voices`);
  for(const src of sources){
   assert.ok(src.started,`${name} source starts`);
   assert.ok(src.stopAt>src.startAt&&src.stopAt-src.startAt<1.1,`${name} terminates`);
   assert.ok(src.connections.length,`${name} is connected`);
  }
 }
 h.fx.stop();
 assert.ok(h.a.nodes.every(n=>n.kind==='destination'||n.disconnected),'all nodes disposed');
});
test('rapid fire is throttled and polyphony has strict limits',()=>{
 const h=setup();
 for(let i=0;i<200;i++)assert.doesNotThrow(()=>h.fx.play('pistol'));
 assert.equal(h.a.sources.length,2,'same-timestamp shots coalesce');
 const countLive=()=>h.a.sources.filter(s=>s.started&&!s.stops.includes(0)&&s.stopAt>h.a.currentTime).length;
 for(const name of NAMES){h.fx.play(name);assert.ok(countLive()<=28,'peak live voices <=28');}
 for(let i=0;i<30;i++){h.a.currentTime+=.06;h.fx.play('rifle');assert.ok(countLive()<=28,'sustained fire stays <=28 live voices');}
 assert.ok(h.a.sources.length<=120,'rate limiting prevents unbounded construction');
});
test('critical effects may replace less important overlapping effects',()=>{
 const h=setup();
 for(const name of NAMES.slice(0,9))h.fx.play(name);
 const before=h.a.sources.length;
 assert.equal(h.fx.play('boss-death'),true);
 assert.ok(h.a.sources.length>before);
 assert.ok(h.a.sources.some(s=>s.stops.includes(0)),'older voice was stopped to free headroom');
});
test('natural source ending cleans each effect group, allowing future plays',()=>{
 const h=setup();h.fx.play('shotgun');const initial=h.a.nodes.slice();
 h.a.currentTime=1;h.a.finishAll();
 assert.ok(initial.slice(1).every(n=>n.disconnected),'ended group is disconnected while master is reused');
 assert.equal(h.fx.play('shotgun'),true);
});
test('suspended AudioContext resumes on play, with no nodes before unlock',async()=>{
 const h=setup({state:'suspended'});
 assert.equal(h.fx.play('rescue'),false);
 assert.equal(h.fx.play('win'),false);
 assert.equal(h.a.nodes.length,0);
 assert.equal(h.a.resumeCalls,1,'resume attempt is deduplicated');
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(h.a.state,'running');
 assert.equal(h.a.sources.length,4,'only the last user-triggered effect is queued');
});
test('mute during a session silences existing sources and no further ones start',()=>{
 const h=setup();h.fx.play('helicopter');const before=h.a.sources.length;
 h.settings.sound=false;assert.equal(h.fx.play('pistol'),false);
 assert.equal(h.a.sources.length,before);
 assert.ok(h.a.sources.every(s=>s.stops.includes(0)));
 assert.ok(h.a.nodes.every(n=>n.kind==='destination'||n.disconnected));
});
test('stop cancels scheduled and active voices, disconnects and prevents replay',()=>{
 const h=setup();h.fx.play('rescue');h.fx.play('explosion');
 assert.ok(h.a.sources.some(s=>s.startAt>h.a.currentTime));
 h.fx.stop();h.fx.stop();
 assert.ok(h.a.sources.every(s=>s.stops.includes(0)));
 assert.ok(h.a.nodes.every(n=>n.kind==='destination'||n.disconnected));
 const n=h.a.nodes.length;assert.equal(h.fx.play('pistol'),false);
 assert.equal(h.a.nodes.length,n);
});
test('stop during suspended resume does not revive sounds',async()=>{
 const h=setup({state:'suspended'});h.fx.play('explosion');h.fx.stop();
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(h.a.nodes.length,0);
});
test('reduced motion preference reduces the per-event mix',()=>{
 const full=setup(),reduced=setup({reducedMotion:true});
 full.fx.play('land');reduced.fx.play('land');
 const getEventGain=h=>h.a.nodes.find(n=>n.kind==='gain'&&n!==h.a.nodes[0]).gain.value;
 assert.ok(getEventGain(reduced)<getEventGain(full));
});
