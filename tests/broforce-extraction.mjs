import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

// An unregistered CommonJS-like browser module runs in a Node VM until PM integration.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(resolve(root,'src/engines/broforce/extraction.js'),'utf8');
const context=createContext({exports:{}});
runInContext(source,context,{filename:'extraction.js'});
const {createBroforceExtraction:create,advanceBroforceExtraction:advance}=context.exports;
const plain=v=>JSON.parse(JSON.stringify(v));
const player=(index,overrides={})=>({id:index===0?'sean-hero':'amber-hero',owner:index===0?'Sean':'Amber',x:100,y:200,alive:true,...overrides});
const players=()=>[player(0),player(1)];
const start=(seed=7)=>advance(create({x:100,y:200,seed}),{dt:2.4,devilDefeated:true,players:players()});
const go=(state,options={})=>advance(state,{dt:0,players:players(),...options});
const terminalEvents=events=>events.filter(e=>e.type==='terminal');
const cueNames=events=>events.filter(e=>e.type==='cue').map(e=>e.name);

test('defeat gate, single helicopter, seeded and finite visual metadata',()=>{
 const initial=create({x:100,y:200,seed:101});
 assert.equal(initial.phase,'dormant');
 const no=advance(initial,{dt:100,players:players(),boardRequests:[true,true]});
 assert.equal(no.phase,'dormant');assert.equal(no.elapsed,0);
 assert.deepEqual(plain(no.events),[]);assert.deepEqual(plain(no.boarded),[false,false]);
 assert.deepEqual(plain(initial),plain(create({x:100,y:200,seed:101})));
 const incoming=go(no,{devilDefeated:true});
 assert.equal(incoming.phase,'incoming');assert.equal(incoming.active,true);
 assert.deepEqual(plain(cueNames(incoming.events)),['helicopter']);
 assert.equal(incoming.helicopter.visible,true);
 const same=go(incoming,{devilDefeated:true});
 assert.equal(same.phase,'incoming');assert.equal(same.events.length,0);
 assert.equal(same.sequence,incoming.sequence);
 const hover=go(same,{dt:2.4,devilDefeated:true});
 assert.equal(hover.phase,'hover');assert.equal(hover.zone.open,true);
 assert.equal(hover.zone.radius,44);assert.equal(hover.zone.secondsRemaining,9);
 assert.ok(hover.helicopter.rotorAngle>=0&&hover.helicopter.rotorAngle<Math.PI*2);
 assert.equal(hover.helicopter.rotorHz,7);
 assert.throws(()=>create({x:NaN}),/finite/);
 assert.throws(()=>create({seed:Infinity}),/finite/);
});

for(const [label,requests,expected] of [
 ['P1 only',[true,false],[true,false]],
 ['P2 only',[false,true],[false,true]],
 ['both',[true,true],[true,true]]
]){
 test(label+' survives, actually boards and earns matching per-owner receipts',()=>{
  let s=start();
  s=go(s,{boardRequests:requests});
  assert.deepEqual(plain(s.boarded),expected);
  const indices=expected.map((v,i)=>v?i:-1).filter(i=>i>=0);
  for(const i of indices){
   assert.equal(s.receipts[i].owner,i===0?'Sean':'Amber');
   assert.equal(s.receipts[i].playerId,players()[i].id);
   assert.equal(s.receipts[i].playerIndex,i);
  }
  if(indices.length===1)assert.equal(s.receipts[indices[0]===0?1:0],null);
 });
}

test('each valid solo/both extraction produces one authoritative terminal success',()=>{
 for(const request of [[true,false],[false,true],[true,true]]){
  let s=start();
  s=go(s,{boardRequests:request});
  const boardingEvents=s.events.filter(e=>e.type==='boarded');
  assert.equal(boardingEvents.length,request.filter(Boolean).length);
  if(s.phase==='hover')s=go(s,{dt:9});
  assert.equal(s.phase,'departure');
  s=go(s,{dt:2.2});
  assert.equal(s.phase,'completed');assert.equal(s.outcome,'extracted');
  assert.deepEqual(plain(s.boarded),request);
  assert.equal(terminalEvents(s.events).length,1);
  assert.equal(terminalEvents(s.events)[0].outcome,'extracted');
  assert.deepEqual(plain(terminalEvents(s.events)[0].boarded),request);
  assert.deepEqual(plain(cueNames(s.events)),['win']);
  const finished=go(s,{dt:400,boardRequests:[true,true],cancelled:true});
  assert.equal(finished.phase,'completed');assert.deepEqual(plain(finished.events),[]);
  assert.deepEqual(plain(finished.receipts),plain(s.receipts));
 }
});

test('none boards: exact-time timeout fails, no reward/receipts',()=>{
 let s=start();
 s=go(s,{dt:9-1e-4});assert.equal(s.phase,'hover');
 assert.equal(s.zone.open,true);
 s=go(s,{dt:1e-4,boardRequests:[true,true]});
 assert.equal(s.phase,'failed');assert.equal(s.outcome,'failed');
 assert.equal(s.reason,'timeout');
 assert.deepEqual(plain(s.boarded),[false,false]);
 assert.deepEqual(plain(s.receipts),[null,null]);
 assert.equal(terminalEvents(s.events).length,1);
 assert.deepEqual(plain(cueNames(s.events)),['lose']);
 assert.deepEqual(plain(go(s,{dt:10,devilDefeated:true}).events),[]);
});

test('dead, dying, downed, no life signal and zero-HP bodies cannot board',()=>{
 const invalid=[{alive:false},{dying:true},{dead:true},{downed:true},{status:'dying'},
  {state:'dead'},{hp:0},{health:0},{alive:undefined,hp:undefined},{x:Infinity},
  {owner:'Amber'},{x:145}];
 for(const invalidProps of invalid){
  const s=go(start(),{players:[player(0,invalidProps),player(1)],boardRequests:[true,false]});
  assert.deepEqual(plain(s.boarded),[false,false],JSON.stringify(invalidProps));
 }
 let s=start();
 s=go(s,{players:[player(0,{x:60,y:200,w:80,h:20}),player(1)],boardRequests:[true,false]});
 assert.equal(s.boarded[0],true,'body center, not top-left, determines boarding');
});

test('incoming input does not queue; far away player and impostor owner cannot board',()=>{
 let s=create({x:100,y:200});
 s=go(s,{dt:1,devilDefeated:true,boardRequests:[true,true]});
 assert.equal(s.phase,'incoming');
 s=go(s,{dt:1.4});
 assert.deepEqual(plain(s.boarded),[false,false]);
 s=go(s,{players:[player(0,{x:300}),player(1,{owner:'Sean'})],boardRequests:[true,true]});
 assert.deepEqual(plain(s.boarded),[false,false]);
 s=go(s,{boardRequests:[]});assert.deepEqual(plain(s.boarded),[false,false]);
});

test('repeat requests are idempotent, keyed owner/id/index selectors respect slots',()=>{
 let s=start();
 s=go(s,{boardRequests:[0,0]});assert.deepEqual(plain(s.boarded),[true,false]);
 s=go(s,{boardRequests:[{playerId:'sean-hero',owner:'Amber'},'Sean']});
 assert.equal(s.events.filter(e=>e.type==='boarded').length,0);
 s=go(s,{boardRequests:[{playerIndex:1,owner:'Amber',id:'amber-hero'}]});
 assert.deepEqual(plain(s.boarded),[true,true]);
 assert.equal(s.events.filter(e=>e.type==='boarded').length,1);
 const receipt=plain(s.receipts[0]);
 s=go(s,{boardRequests:[0,1]});
 assert.deepEqual(plain(s.receipts[0]),receipt);
 assert.equal(s.events.length,0);
});

test('paused timers, boarding requests and rotor freeze; cancellation from pause is terminal failure',()=>{
 let s=start();s=go(s,{dt:1.25});
 const previous=plain(s);
 s=go(s,{dt:500,paused:true,boardRequests:[true,true]});
 assert.equal(s.phase,'hover');assert.equal(s.phaseTime,previous.phaseTime);
 assert.equal(s.elapsed,previous.elapsed);
 assert.equal(s.helicopter.rotorPhase,previous.helicopter.rotorPhase);
 assert.deepEqual(plain(s.boarded),[false,false]);assert.deepEqual(plain(s.events),[]);
 s=go(s,{paused:true,cancelled:true,boardRequests:[true,true]});
 assert.equal(s.phase,'failed');assert.equal(s.reason,'cancelled');
 assert.equal(terminalEvents(s.events).length,1);
 s=go(s,{dt:100,devilDefeated:true});assert.deepEqual(plain(s.events),[]);
 let early=create();early=go(early,{aborted:true,devilDefeated:true});
 assert.equal(early.phase,'failed');assert.equal(early.reason,'cancelled');
});

test('cancellation after one receipt never counts as extracted',()=>{
 let s=go(start(),{boardRequests:[true,false]});
 s=go(s,{cancelled:true,boardRequests:[false,true]});
 assert.equal(s.phase,'failed');assert.equal(s.outcome,'failed');
 assert.deepEqual(plain(s.boarded),[true,false]);
 assert.equal(terminalEvents(s.events).length,1);
 assert.equal(terminalEvents(s.events)[0].outcome,'failed');
 assert.deepEqual(plain(go(s,{dt:2.2}).events),[]);
});

test('frame-cadence equivalence 30/60/120 Hz and large-delta phase crossing',()=>{
 const play=fps=>{
  let s=create({x:100,y:200,seed:13});
  for(let i=0;i<Math.round(2.4*fps);i++)s=go(s,{dt:1/fps,devilDefeated:true});
  assert.equal(s.phase,'hover');
  for(let i=0;i<Math.round(3*fps);i++)s=go(s,{dt:1/fps});
  s=go(s,{boardRequests:[false,true]});
  for(let i=0;i<Math.round(6*fps);i++)s=go(s,{dt:1/fps});
  for(let i=0;i<Math.round(2.2*fps);i++)s=go(s,{dt:1/fps});
  assert.equal(s.phase,'completed');
  return s;
 };
 const a=play(30),b=play(60),c=play(120);
 for(const state of [b,c]){
  assert.deepEqual(plain(state.boarded),plain(a.boarded));
  assert.deepEqual(plain(state.receipts.map(v=>v&&({owner:v.owner,playerId:v.playerId}))),
    plain(a.receipts.map(v=>v&&({owner:v.owner,playerId:v.playerId}))));
  assert.ok(Math.abs(state.receipts[1].boardedAt-a.receipts[1].boardedAt)<1e-7);
  assert.ok(Math.abs(state.elapsed-a.elapsed)<1e-7);
  assert.ok(Math.abs(state.helicopter.rotorPhase-a.helicopter.rotorPhase)<1e-7);
 }
 const huge=go(create({x:100,y:200}),{dt:1000,devilDefeated:true,boardRequests:[true,true]});
 assert.equal(huge.phase,'failed');assert.equal(terminalEvents(huge.events).length,1);
});

test('pure input/output; no mutation of players, requests or prior receipt arrays',()=>{
 const p=players(),req=[true,false],s=start();
 const originals=[plain(p),plain(req),plain(s)];
 const next=go(s,{players:p,boardRequests:req,dt:0.02});
 assert.deepEqual(plain(p),originals[0]);assert.deepEqual(plain(req),originals[1]);
 assert.deepEqual(plain(s),originals[2]);
 next.receipts[0].owner='spoofed';next.boarded[0]=false;
 assert.deepEqual(plain(s.receipts),originals[2].receipts);
 assert.deepEqual(plain(s.boarded),originals[2].boarded);
});
