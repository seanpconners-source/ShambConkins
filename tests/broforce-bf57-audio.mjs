// BF-57: adversarial lifecycle, cue contract, shared-context isolation (no sound device).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';

const ROOT=resolve(import.meta.dirname,'..');
const read=p=>readFileSync(resolve(ROOT,p),'utf8');
const SFX=read('src/engines/broforce/audio.js');
const AMBIENCE=read('src/engines/broforce/ambience.js');
const STAGES=['broforce-jungle','broforce-factory','broforce-city','broforce-desert'];

class Param {
 constructor(){this.value=0;this.events=[];}
 setValueAtTime(n,t){this.value=n;this.events.push([n,t]);}
 linearRampToValueAtTime(n,t){this.events.push([n,t]);}
 exponentialRampToValueAtTime(n,t){this.events.push([n,t]);}
}
class Node {
 constructor(kind){this.kind=kind;this.gain=new Param();this.frequency=new Param();this.Q=new Param();
  this.disconnected=false;this.connections=[];}
 connect(other){this.connections.push(other);return other;}
 disconnect(){this.disconnected=true;this.connections=[];}
}
class Source extends Node {
 constructor(kind){super(kind);this.starts=[];this.stops=[];this.onended=null;}
 start(t){assert.equal(this.starts.length,0,'start once');this.starts.push(t);}
 stop(t){this.stops.push(t);}
 finish(){const cb=this.onended;this.onended=null;cb?.();}
}
class Audio {
 constructor(state='running'){this.state=state;this.currentTime=0;this.sampleRate=22050;
  this.destination=new Node('destination');this.nodes=[];this.sources=[];this.resumeCalls=0;}
 make(kind,isSource=false){const n=isSource?new Source(kind):new Node(kind);this.nodes.push(n);
  if(isSource)this.sources.push(n);return n;}
 createGain(){return this.make('gain');}
 createOscillator(){return this.make('osc',true);}
 createBufferSource(){return this.make('noise',true);}
 createBiquadFilter(){return this.make('filter');}
 createBuffer(ch,len,sr){assert.equal(ch,1);assert.equal(sr,this.sampleRate);
  assert.ok(len>0&&len<=sr);return {getChannelData:()=>new Float32Array(len)};}
 resume(){this.resumeCalls++;return Promise.resolve().then(()=>{this.state='running';});}
 finish(){for(const s of this.sources)if(s.stops.length&&s.stops[0]<=this.currentTime&&s.onended)s.finish();}
 get live(){return this.sources.filter(s=>s.starts.length&&!s.disconnected&&
  !s.stops.includes(0)&&s.stops[0]>this.currentTime).length;}
}
class Clock {
 constructor(ctx){this.ctx=ctx;this.ms=0;this.timers=new Map();this.nextId=0;this.peak=0;}
 setTimeout= (fn,delay)=>{const id=++this.nextId;this.timers.set(id,{fn,due:this.ms+delay});
  this.peak=Math.max(this.peak,this.timers.size);return id;};
 clearTimeout= id=>{this.timers.delete(id);};
 advance(ms){const target=this.ms+ms;let count=0;
  while(true){const due=[...this.timers].filter(([,v])=>v.due<=target).sort((a,b)=>a[1].due-b[1].due)[0];
   if(!due)break;assert.ok(++count<300,'no infinite timer cycle');
   this.timers.delete(due[0]);this.ms=due[1].due;
   this.ctx.currentTime=this.ms/1000;this.ctx.finish();due[1].fn();
  }
  this.ms=target;this.ctx.currentTime=this.ms/1000;this.ctx.finish();
 }
}
function load(source,clock){const exports={};
 runInNewContext(source,{exports,Math,Promise,Number,Object,Set,Map,
  setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout},
 {filename:'BF-57 audio VM',timeout:3000});return exports;
}
function fixture({stageId=STAGES[0],state='running',settings={music:true,sound:true}}={}){
 const ctx=new Audio(state),clock=new Clock(ctx),opts={...settings};
 const sfx=load(SFX,clock).createBroforceAudio(()=>ctx,()=>opts);
 const ambience=load(AMBIENCE,clock).createBroforceAmbience({
  getContext:()=>ctx,getSettings:()=>opts,stageId});
 return {ctx,clock,opts,sfx,ambience};
}
function silent(h){assert.equal(h.clock.timers.size,0,'no scheduler after disposal');
 assert.equal(h.ctx.live,0,'no live voices after disposal');
 assert.ok(h.ctx.nodes.every(n=>n.disconnected),'disconnect every owned node');
}

test('all four original stages keep different procedural signatures and restrained mix',()=>{
 const signatures=new Set();
 for(const stageId of STAGES){
  const h=fixture({stageId});
  assert.equal(h.ctx.nodes.length,0,'lazy construction');
  assert.equal(h.ambience.start(),true);
  h.clock.advance(3100);
  const notes=h.ctx.nodes.filter(n=>n.kind==='osc').map(n=>n.frequency.events[0]?.[0]);
  const filter=h.ctx.nodes.find(n=>n.kind==='filter');
  assert.ok(notes.length>=2&&filter,stageId);
  signatures.add(JSON.stringify([notes.slice(0,7),filter.type,filter.frequency.value]));
  const gains=h.ctx.nodes.filter(n=>n.kind==='gain');
  assert.ok(gains[0].gain.value<=.14 && gains[1].gain.value<=.20 &&
    gains[2].gain.value<=.13,'background mix remains below action master of .19');
  assert.ok(h.ctx.live<=12&&h.clock.peak<=1,'capped and one timer');
  h.ambience.stop();silent(h);
 }
 assert.equal(signatures.size,4);
});

test('mission, weapon and helicopter cue contract admits every emitted sound',()=>{
 const mission=read('src/engines/broforce/mission.js');
 const extraction=read('src/engines/broforce/extraction.js');
 const combat=read('src/engines/broforce/combat.js');
 const names=new Set();
 for(const match of mission.matchAll(/cue\(s,\s*'([^']+)'/g))names.add(match[1]);
 for(const match of extraction.matchAll(/cue\(next,\s*'([^']+)'/g))names.add(match[1]);
 const weaponBlock=combat.match(/const WEAPON_SPECS = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
 assert.ok(weaponBlock,'read actual combat weapons');
 for(const match of weaponBlock[1].matchAll(/^\s*(\w+): Object\.freeze/mg))
  names.add(match[1]==='launcher'?'grenade':match[1]);
 assert.ok(mission.includes("e.weapon === 'launcher' ? 'grenade' : e.weapon"),
  'mission normalizes launcher event to grenade SFX');
 for(const required of ['jump','land','pistol','rifle','shotgun','grenade','rescue',
  'boss-intro','boss-hit','boss-death','helicopter','extraction','win','lose'])
  assert.ok(names.has(required),'source uses '+required);
 const h=fixture();
 for(const name of names){h.ctx.currentTime+=2;h.ctx.finish();
  assert.equal(h.sfx.play(name),true,'missing authored cue: '+name);}
 assert.equal(h.sfx.play('unknown-cue'),false,'future unknown cues safely ignored');
 h.sfx.stop();silent(h);
});

test('music and environmental sound are independently gated, including total mute',()=>{
 const none=fixture({settings:{music:false,sound:false}});
 assert.equal(none.ambience.start(),false);assert.equal(none.sfx.play('pistol'),false);
 assert.equal(none.ctx.nodes.length,0);none.ambience.stop();none.sfx.stop();silent(none);
 const music=fixture({settings:{music:true,sound:false}});
 music.ambience.start();music.clock.advance(1500);
 assert.ok(music.ctx.sources.some(s=>s.kind==='osc'));
 assert.equal(music.ctx.sources.filter(s=>s.kind==='noise').length,0);
 music.ambience.stop();music.sfx.stop();silent(music);
 const environment=fixture({settings:{music:false,sound:true}});
 environment.ambience.start();environment.clock.advance(1500);
 assert.equal(environment.ctx.sources.filter(s=>s.kind==='osc').length,0);
 assert.ok(environment.ctx.sources.some(s=>s.kind==='noise'));
 environment.ambience.stop();environment.sfx.stop();silent(environment);
});

test('interrupted audio clears old sources and retries only on subsequent gesture',()=>{
 const h=fixture();h.ambience.start();h.sfx.play('explosion');
 assert.ok(h.ctx.live>0);
 h.ctx.state='interrupted';assert.equal(h.sfx.play('shotgun'),false);
 h.clock.advance(600);
 assert.equal(h.ctx.live,0);assert.equal(h.clock.timers.size,0);
 assert.ok(h.ctx.nodes.every(n=>n.disconnected),'interruption releases graph');
 const before=h.ctx.sources.length;
 h.ctx.state='running';assert.equal(h.ambience.start(),true,'retry start after interruption');
 assert.equal(h.clock.timers.size,1);
 assert.equal(h.sfx.play('shotgun'),true);
 assert.ok(h.ctx.sources.length>before,'fresh voices, not suspended replay');
 h.ambience.stop();h.sfx.stop();silent(h);
});

test('suspended gesture resume is deduplicated; stop while pending never revives',async()=>{
 const h=fixture({state:'suspended'});
 assert.equal(h.sfx.play('rescue'),false);
 assert.equal(h.sfx.play('win'),false);
 assert.equal(h.ctx.resumeCalls,1);
 assert.equal(h.ctx.nodes.length,0);
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(h.ctx.state,'running');
 assert.equal(h.ctx.sources.length,4,'only newest sound is replayed');
 h.sfx.stop();h.ambience.stop();silent(h);
 const pending=fixture({state:'suspended'});
 assert.equal(pending.ambience.start(),true);
 assert.equal(pending.ctx.nodes.length,0);
 pending.ambience.stop();
 pending.sfx.play('explosion');pending.sfx.stop();
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(pending.ctx.nodes.length,0);silent(pending);
});

test('rapid pause/resume, visibility suspend and repeated stage launch leave no leaks',()=>{
 const shared=new Audio();
 const clock=new Clock(shared),settings={music:true,sound:true};
 for(let i=0;i<40;i++){
  const ambience=load(AMBIENCE,clock).createBroforceAmbience({
   getContext:()=>shared,getSettings:()=>settings,stageId:STAGES[i%4]});
  const sfx=load(SFX,clock).createBroforceAudio(()=>shared,()=>settings);
  ambience.start();sfx.play('pistol');
  ambience.pause();sfx.stop();clock.advance(700);
  assert.equal(shared.live,0,'hidden/paused background is silent');
  ambience.resume();clock.advance(210);
  assert.ok(shared.live<=12);
  ambience.stop();silent({ctx:shared,clock});
 }
 assert.ok(clock.peak<=1,'never schedules overlapping stage timers');
});

test('mute while playing, and subsequent unmute, does not leak old voices',()=>{
 const h=fixture();h.ambience.start();h.sfx.play('helicopter');
 const oldCount=h.ctx.sources.length;
 h.opts.music=false;h.opts.sound=false;
 h.ambience.setIntensity(.5);
 assert.equal(h.sfx.play('pistol'),false);
 assert.equal(h.ctx.live,0);assert.equal(h.clock.timers.size,0);
 h.opts.music=true;h.opts.sound=true;
 h.ambience.setIntensity(.65);
 assert.ok(h.ctx.sources.length>oldCount);
 h.ambience.stop();h.sfx.stop();silent(h);
});

test('SFX rate/voice caps and unsupported names are bounded',()=>{
 const h=fixture();
 for(let i=0;i<200;i++)h.sfx.play('pistol');
 assert.equal(h.ctx.sources.length,2);
 const names=['jump','land','pistol','rifle','shotgun','grenade','explosion',
  'wall-break','impact','hit','rescue','swap','boss-intro','boss-hit','boss-death',
  'helicopter','extraction','win','lose'];
 for(const name of names){h.sfx.play(name);assert.ok(h.ctx.live<=28,'cap '+name);}
 for(let i=0;i<100;i++){h.ctx.currentTime+=.06;h.ctx.finish();
  h.sfx.play('rifle');assert.ok(h.ctx.live<=28,'sustained fire');}
 assert.equal(h.sfx.play('typo'),false);
 h.sfx.stop();silent(h);
});

test('absent sound setting defaults to enabled; explicit false stays silent',()=>{
 const h=fixture({settings:{music:true}});
 assert.equal(h.sfx.play('pistol'),true,'old profiles with absent key play SFX');
 h.opts.sound=false;assert.equal(h.sfx.play('shotgun'),false);
 assert.equal(h.ctx.live,0);
 h.ambience.stop();h.sfx.stop();silent(h);
});
