// BF-20: deterministic, canvas-free final devil battle contract.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const file='src/engines/broforce/devil.js';
const source=fs.readFileSync(file,'utf8');
const exports={};
vm.runInThisContext('(function(exports){'+source+'\n})',{filename:file})(exports);
const {createBroforceDevil,advanceBroforceDevil}=exports;
const PLAYER=[
 {id:'Sean',owner:'Sean',x:30,y:100,w:12,h:26,alive:true,character:'sean'},
 {id:'Amber',owner:'Amber',x:70,y:100,w:12,h:26,alive:true,character:'amber'}
];
const create=(seed=7)=>createBroforceDevil({characterId:'actual-locked-character',x:160,y:72,seed});
const step=(devil,opts={})=>advanceBroforceDevil(devil,{dt:1/60,players:PLAYER,...opts});
const run=(d,seconds,opts={})=>{
 const events=[];
 for(let i=0;i<Math.ceil(seconds*60);i++){
  const out=step(d,opts);d=out.devil;events.push(...out.events);
 }
 return {devil:d,events};
};
const count=(events,type)=>events.filter(e=>e.type===type).length;
assert.throws(()=>createBroforceDevil({}),/characterId/);
assert.throws(()=>createBroforceDevil({characterId:'  '}),/characterId/);
let d=create();
assert.equal(d.characterId,'actual-locked-character');
assert.equal(d.hp,d.maxHp);
assert.equal(d.mode,'intro');
assert.equal(JSON.stringify(PLAYER),JSON.stringify(PLAYER.map(p=>({...p}))));
const original=JSON.stringify(d);
let paused=advanceBroforceDevil(d,{dt:2,players:PLAYER,active:false,damageEvents:[{id:'kill',damage:999}]});
assert.strictEqual(paused.devil,d,'Pause cannot mutate or clone the state');
assert.deepEqual(paused.events,[]);
assert.equal(JSON.stringify(d),original);
paused=advanceBroforceDevil(d,{dt:Infinity,players:PLAYER});
assert.strictEqual(paused.devil,d,'Nonfinite dt is inert');
assert.strictEqual(advanceBroforceDevil(d,{dt:0,players:PLAYER}).devil,d);
assert.throws(()=>advanceBroforceDevil(null,{}),/state required/);
const first=step(d);
assert.notStrictEqual(first.devil,d,'Pure update returns a fresh state');
assert.equal(d.mode,'intro','Original state not mutated');
assert.equal(count(first.events,'devil-reveal'),1);
assert(first.events.every(e=>e.characterId===d.characterId));
d=first.devil;
const intro=run(d,1.2);d=intro.devil;
assert.equal(d.mode,'windup');
assert.equal(count(intro.events,'devil-telegraph'),1);
assert.equal(d.targetId,'Amber','Aim at nearest *living* player');
assert(d.telegraph.remaining>0&&d.telegraph.duration>=.6,'Readable windup');
const chosen=d.telegraph.attack;
const telegraph=JSON.stringify(d.telegraph);
const shotEarly=run(d,.35);d=shotEarly.devil;
assert.equal(count(shotEarly.events,'devil-shot'),0,'No early shots inside telegraph');
assert.equal(d.mode,'windup');
assert.equal(d.telegraph.targetX,76,'Target point locked during the dodge window');
assert.equal(d.telegraph.attack,chosen);
assert.notEqual(JSON.stringify(d.telegraph),telegraph,'Remaining warning countdown advances');
// Every seeded attack cycle must reach all three move types by phase 2.
function advanceToPhase(d,threshold=2){
 for(let i=0;i<12&&d.phase<threshold;i++){
  const hit=step(d,{damageEvents:[{id:'phase-'+threshold+'-'+i,targetId:d.characterId,damage:6}]});
  d=hit.devil;
  if(d.phase<threshold)d=run(d,.27).devil;
 }
 assert.equal(d.phase,threshold);
 return d;
}
d=advanceToPhase(d,2);
assert.equal(d.hp,24);
assert.equal(d.mode,'recover','Phase change breaks attack cleanly');
assert.equal(d.telegraph,null);
const allAttacks=[];
const section=run(d,33);d=section.devil;
for(const e of section.events)if(e.type==='devil-telegraph')allAttacks.push(e.attack);
assert(['fan','dive','quake'].every(kind=>allAttacks.includes(kind)),
 'Phase two cycles through telegraphed volleys, airborne dive and shockwave');
assert(section.events.some(e=>e.type==='devil-shot'),'Volley projectiles are emitted');
assert(section.events.some(e=>e.type==='devil-cover-damage'),'Dive/quake destroys cover via events');
assert(section.events.some(e=>e.type==='devil-impact'),'Impact exposes visible effect coordinate');
assert(section.events.some(e=>e.type==='devil-hit-player'),
 'Player contact produces a damage request, not a player mutation');
assert(d.projectiles.length<=20);
// Duplicate same projectile in a tick counts once; two unique simultaneous hits count together.
const beforeSimultaneousHit=JSON.stringify(d);
let hit=step(d,{damageEvents:[
 {id:'b2',targetId:'devil',damage:2},{id:'a1',targetId:'devil',damage:2},
 {id:'b2',targetId:'devil',damage:5},{id:'stray',targetId:'enemy',damage:6}
]});
assert.equal(hit.devil.hp,d.hp-4);
assert.equal(count(hit.events,'devil-hit'),1);
assert.equal(JSON.stringify(d),beforeSimultaneousHit,'Original state unmodified');
d=hit.devil;
hit=step(d,{damageEvents:[{id:'b2',targetId:'devil',damage:6},{id:'third',targetId:'devil',damage:6}]});
assert.equal(hit.devil.hp,d.hp,'Iframes protect from burst hits');
assert.equal(count(hit.events,'devil-hit'),0);
d=hit.devil;
d=run(d,.3).devil;
hit=step(d,{damageEvents:[{id:'b2',damage:6},{id:'third',damage:6}]});
assert.equal(hit.devil.hp,d.hp,'Repeated ids are never accepted after iframe ends');
d=hit.devil;
assert(d.hitIds.length<=160);
// Stay within known HP and reach final phase with fresh unique hits.
d=advanceToPhase(d,3);
assert(d.hp>0&&d.hp<=12);
const phaseThree=run(d,12);d=phaseThree.devil;
assert(phaseThree.events.some(e=>e.type==='devil-telegraph'));
assert(d.mode!=='dead');
// No living players: no orphaned projectile hits/attacks. Revival resumes with a warning.
const gone=PLAYER.map(p=>({...p,alive:false}));
let empty=step(d,{players:gone});d=empty.devil;
assert.equal(empty.events.length,0);
assert.equal(d.projectiles.length,0);
empty=run(d,8,{players:gone});
assert.equal(empty.events.length,0,'Cannot fire or damage after a team wipe');
assert.equal(empty.devil.tick,d.tick,'All-dead freezes active combat');
d=empty.devil;
const resumed=run(d,4);
assert(resumed.events.some(e=>e.type==='devil-telegraph'),'Revive gets warning before attacks');
assert(d.mode!== 'dying');d=resumed.devil;
// Final blow is once, removes threats, and never triggers helicopter or rewards.
const hpBefore=d.hp;
let deathEvents=[];
for(let i=0;i<20&&d.mode!=='dying';i++){
 const out=step(d,{damageEvents:[{id:'fin-'+i,damage:6}]});
 d=out.devil;deathEvents.push(...out.events);
 if(d.mode!=='dying')d=run(d,.27).devil;
}
assert(hpBefore>0);
assert.equal(d.hp,0);assert.equal(d.mode,'dying');
assert.equal(count(deathEvents,'devil-defeated'),1);
assert.equal(deathEvents.find(e=>e.type==='devil-defeated').characterId,'actual-locked-character');
assert.equal(d.projectiles.length,0);
const finale=run(d,3);d=finale.devil;
assert.equal(d.mode,'dead');
assert.equal(count(finale.events,'devil-death-complete'),1);
assert.equal(count(finale.events,'devil-shot'),0);
assert.equal(count(finale.events,'devil-defeated'),0);
assert(![...intro.events,...section.events,...deathEvents,...finale.events].some(e=>
 e.type==='helicopter'||e.type==='devil-unlock'||e.type==='grant-recruit'));
const terminal=step(d,{damageEvents:[{id:'still-hitting',damage:99}]});
assert.strictEqual(terminal.devil,d);
assert.deepEqual(terminal.events,[]);
// Zero/randomly large dt cannot burst a volley or unbounded event queue.
const huge=advanceBroforceDevil(create(5),{dt:100000000,players:PLAYER});
assert(huge.devil.tick<=6,'Guard extreme dt by dropping excess simulation time');
assert(huge.events.length<=32);
// Fixed map-tile collision and terrain destruction are just integration events.
const blocked=run(create(4),9,{isSolid:()=>true});
assert(blocked.events.some(e=>e.type==='devil-cover-damage'),
 'Shot hitting cover requests terrain damage');
assert(blocked.devil.projectiles.length===0,'Blocked projectiles get cleaned up');
assert(blocked.events.every(e=>e.characterId==='actual-locked-character'));
// While paused in the death animation even terminal timers must not advance.
const mortally=create(11);
const ready=run(mortally,2).devil;
let doomed=ready,dying=[];
for(let i=0;i<20&&doomed.mode!=='dying';i++){
 const out=step(doomed,{damageEvents:[{id:'kill-'+i,damage:6}]});
 doomed=out.devil;dying.push(...out.events);
 if(doomed.mode!=='dying')doomed=run(doomed,.26).devil;
}
assert.equal(count(dying,'devil-defeated'),1);
const deathPaused=advanceBroforceDevil(doomed,{dt:.05,players:PLAYER,active:false});
assert.strictEqual(deathPaused.devil,doomed);
assert.deepEqual(deathPaused.events,[]);
const dyingAlone=run(doomed,1.5,{players:gone});
assert.equal(dyingAlone.devil.mode,'dead','Death animation finalizes without surviving targets');
const pureInput=JSON.stringify(PLAYER);
const targets=run(create(9),2,{players:[{...PLAYER[0],alive:false},PLAYER[1]]});
assert.equal(targets.devil.targetId,'Amber');
assert.equal(JSON.stringify(PLAYER),pureInput,'Do not mutate selected board characters or player input');
const vanished=run(create(10),2,{players:[PLAYER[0],{...PLAYER[1],alive:false}]});
assert.equal(vanished.devil.targetId,'Sean');
// Replay of all emitted authoritative fields and final state is bit-for-bit seeded.
function simulate(seed){
 let state=create(seed),trace=[];
 for(let i=0;i<2400;i++){
  const hits=(i>90&&i%22===0&&state.mode!=='dying')?[{id:'sim-'+i,damage:2}]:[];
  const out=step(state,{damageEvents:hits});state=out.devil;trace.push(...out.events);
 }
 return {state,trace};
}
assert.deepEqual(simulate(99),simulate(99),'Same seed + input replays exactly');
const a=run(create(7),19).events.map(e=>[e.tick,e.type,e.attack,e.targetX,e.projectileId]);
const b=run(create(8),19).events.map(e=>[e.tick,e.type,e.attack,e.targetX,e.projectileId]);
assert.notDeepEqual(a,b,'Different seeds vary ordered attacks');
// Fixed-step attacks must be independent of frame partitioning.
function playPartitions(dt,n){
 let boss=create(57),history=[];
 for(let i=0;i<n;i++){
  const out=advanceBroforceDevil(boss,{dt,players:PLAYER});boss=out.devil;history.push(...out.events);
 }
 return {boss,history};
}
const sixty=playPartitions(1/60,1200),thirty=playPartitions(1/30,600);
assert.deepEqual(sixty,thirty,'Frame-rate-independent boss/projectile replay');
console.log('BROFORCE BF-20 DEVIL OK: 3 phases, telegraph timing, airborne/cover events, hits, one defeat, terminal/pause, bounded replay, both players and wipe');
