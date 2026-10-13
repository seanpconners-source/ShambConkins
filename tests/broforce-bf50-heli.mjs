import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

// BF-50: test the actual browser CommonJS source without Node-requiring the ESM-package file.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const context=createContext({exports:{}});
runInContext(readFileSync(resolve(root,'src/engines/broforce/extraction.js'),'utf8'),context,{filename:'extraction.js'});
const {createBroforceExtraction:create,advanceBroforceExtraction:advance}=context.exports;
const plain=v=>JSON.parse(JSON.stringify(v));
const person=(i,extra={})=>({owner:i===0?'Sean':'Amber',id:i===0?'P1':'P2',alive:true,hp:1,x:100,y:200,...extra});
const pair=(a={},b={})=>[person(0,a),person(1,b)];
const step=(s,opts={})=>advance(s,{dt:0,players:pair(),...opts});
const arrive=()=>step(create({x:100,y:200,seed:13}),{devilDefeated:true,dt:2.4});
const kinds=(s,k)=>s.events.filter(event=>event.type===k);
const timestamp=s=>({phase:s.phase,phaseTime:s.phaseTime,elapsed:s.elapsed,open:s.zone.open,
  boarded:plain(s.boarded),receipts:plain(s.receipts),terminal:plain(kinds(s,'terminal'))});

// Each scenario logs/compares the authoritative event and receipt, not an inferred award.
test('boss defeat, incoming/hover/departure boundaries and deterministic rotor at fixed times',()=>{
 let s=create({x:100,y:200});
 s=step(s,{dt:300,boardRequests:[true,true]});
 assert.deepEqual(timestamp(s).boarded,[false,false]);assert.equal(s.phase,'dormant');
 s=step(s,{dt:0,devilDefeated:true});
 assert.equal(s.phase,'incoming');assert.equal(s.elapsed,0);
 assert.equal(kinds(s,'cue').length,1);
 s=step(s,{dt:2.4-1e-5,boardRequests:[true,true]});
 assert.equal(s.phase,'incoming');assert.equal(s.zone.open,false);
 s=step(s,{dt:1e-5});
 assert.equal(s.phase,'hover');assert.equal(s.phaseTime,0);
 assert.equal(s.zone.open,true);assert.equal(s.zone.secondsRemaining,9);
 assert.deepEqual(plain(s.boarded),[false,false]);
 const atArrival=s.helicopter.rotorPhase;
 s=step(s,{dt:1,paused:true,boardRequests:[true,true]});
 assert.equal(s.helicopter.rotorPhase,atArrival);assert.equal(s.phaseTime,0);
 s=step(s,{dt:3,boardRequests:[true,false]});
 assert.equal(s.receipts[0].boardedAt,5.4);
 assert.equal(s.phase,'hover');
 s=step(s,{dt:6});
 assert.equal(s.phase,'departure');assert.equal(s.phaseTime,0);
 s=step(s,{dt:2.2-1e-5,boardRequests:[false,true]});
 assert.equal(s.phase,'departure');assert.deepEqual(plain(s.boarded),[true,false]);
 s=step(s,{dt:1e-5,boardRequests:[false,true]});
 assert.equal(s.phase,'completed');assert.equal(s.outcome,'extracted');
 assert.equal(kinds(s,'terminal').length,1);
 assert.deepEqual(plain(kinds(s,'terminal')[0].boarded),[true,false]);
 assert.deepEqual(plain(step(s,{dt:100,cancelled:true,boardRequests:[true,true]}).events),[]);
});

test('open until strictly before the exact 9s cutoff; at 9s nobody boards',()=>{
 let s=arrive();
 s=step(s,{dt:9-5e-10,boardRequests:[false,false]});
 assert.equal(s.phase,'hover',JSON.stringify(timestamp(s)));
 assert.equal(s.zone.open,true,JSON.stringify(timestamp(s)));
 s=step(s,{dt:0,boardRequests:[false,true]});
 assert.deepEqual(plain(s.boarded),[false,true],JSON.stringify(timestamp(s)));
 assert.ok(s.receipts[1].boardedAt<11.4 && s.receipts[1].boardedAt>11.399999999);
 assert.equal(s.receipts[0],null);
 let exact=arrive();
 exact=step(exact,{dt:9,boardRequests:[true,true]});
 assert.equal(exact.phase,'failed');assert.equal(exact.reason,'timeout');
 assert.equal(kinds(exact,'terminal').length,1);
 assert.deepEqual(plain(exact.receipts),[null,null]);
 assert.deepEqual(plain(step(exact,{dt:1,boardRequests:[true,true]}).boarded),[false,false]);
});

test('physical radius uses body center and inclusive 44px boundary, each real owner only',()=>{
 let s=arrive();
 s=step(s,{players:pair({x:100+44-6,y:200-13,w:12,h:26},{x:100+44-6+0.00001,y:200-13,w:12,h:26}),boardRequests:[true,true]});
 assert.deepEqual(plain(s.boarded),[true,false]);
 assert.deepEqual(plain(s.receipts),[{playerIndex:0,playerId:'P1',owner:'Sean',boardedAt:2.4},null]);
 s=step(s,{players:pair({}, {x:100-44,y:200}),boardRequests:[false,true]});
 assert.deepEqual(plain(s.boarded),[true,true]);
 assert.equal(s.phase,'departure');
 assert.deepEqual(plain(s.receipts.map(r=>r.owner)),['Sean','Amber']);
 assert.equal(kinds(s,'boarded').length,1);
});

test('dead teammate, swapped input selectors and equal names do not create phantom boarding',()=>{
 let s=arrive();
 s=step(s,{players:pair({name:'Same',alive:false,hp:1},{name:'Same',hp:0,alive:true}),boardRequests:[true,true]});
 assert.deepEqual(plain(s.boarded),[false,false]);
 s=step(s,{players:pair({name:'Same',alive:false},{name:'Same'}),boardRequests:[{playerIndex:0,owner:'Amber'},{playerIndex:1,owner:'Amber',playerId:'P1'}]});
 assert.deepEqual(plain(s.boarded),[false,false]);
 s=step(s,{players:pair({name:'Same',alive:false},{name:'Same'}),boardRequests:[{owner:'Amber',playerIndex:1,playerId:'P2'}]});
 assert.deepEqual(plain(s.boarded),[false,true]);
 s=step(s,{dt:9,boardRequests:[true,true]});
 assert.equal(s.phase,'departure');
 s=step(s,{dt:2.2});
 assert.equal(s.phase,'completed');
 assert.deepEqual(plain(s.receipts.map(r=>r&&r.owner)),[null,'Amber']);
 assert.equal(kinds(s,'terminal').length,1);
});

test('pause/rotation handoff requires a fresh request; cancellation overrides boarded success',()=>{
 let s=arrive();
 const before=timestamp(s);
 s=step(s,{paused:true,dt:300,boardRequests:[true,true]});
 assert.deepEqual(timestamp(s),before);
 s=step(s,{boardRequests:[]}); // Fresh input from a reset controller, not a held press.
 assert.deepEqual(plain(s.boarded),[false,false]);
 s=step(s,{players:pair({x:0},{x:100}),boardRequests:[true,false]});
 assert.deepEqual(plain(s.boarded),[false,false]);
 s=step(s,{boardRequests:[true,false]});
 assert.deepEqual(plain(s.boarded),[true,false]);
 s=step(s,{paused:true,cancelled:true,boardRequests:[false,true]});
 assert.equal(s.phase,'failed');assert.equal(s.reason,'cancelled');
 assert.equal(s.outcome,'failed');assert.equal(kinds(s,'terminal').length,1);
 assert.deepEqual(plain(kinds(s,'terminal')[0].boarded),[true,false]);
 assert.deepEqual(plain(step(s,{dt:100,boardRequests:[true,true],devilDefeated:true}).events),[]);
});

test('departure/completed receipts, owner flags and terminal evidence are immutable snapshots',()=>{
 let s=step(arrive(),{boardRequests:[true,true]});
 assert.equal(s.phase,'departure');
 const receipts=plain(s.receipts),boarded=plain(s.boarded);
 assert.equal(Object.isFrozen(s.receipts),true);
 assert.equal(Object.isFrozen(s.boarded),true);
 assert.equal(Object.isFrozen(s.receipts[0]),true);
 assert.throws(()=>{s.receipts[0].owner='spoofed';},TypeError);
 assert.throws(()=>{s.boarded[0]=false;},TypeError);
 s=step(s,{dt:2.2});
 assert.equal(s.phase,'completed');
 assert.deepEqual(plain(s.receipts),receipts);
 assert.deepEqual(plain(s.boarded),boarded);
 const terminal=kinds(s,'terminal')[0];
 assert.ok(terminal);
 assert.equal(Object.isFrozen(terminal.receipts),true);
 assert.equal(Object.isFrozen(terminal.receipts[1]),true);
 assert.throws(()=>{terminal.receipts[1].playerIndex=0;},TypeError);
 const replay=step(s,{dt:100,cancelled:true,boardRequests:[true,true]});
 assert.deepEqual(plain(replay.receipts),receipts);
 assert.deepEqual(plain(replay.events),[]);
 assert.equal(Object.isFrozen(replay.receipts),true);
 const restored=step(plain(s)); // Simulate replay after JSON persistence.
 assert.deepEqual(plain(restored.receipts),receipts);
 assert.equal(Object.isFrozen(restored.receipts),true);
});

test('seeded replay across 30/60/120fps never adds owner, terminal or receipt on late presses',()=>{
 const replay=fps=>{
  let s=arrive();
  for(let tick=0;tick<fps*2;tick++)s=step(s,{dt:1/fps});
  s=step(s,{boardRequests:[false,true]});
  const at=s.receipts[1].boardedAt;
  for(let tick=0;tick<fps*8;tick++)s=step(s,{dt:1/fps,boardRequests:[]});
  assert.equal(s.phase,'departure');
  s=step(s,{dt:2.2,boardRequests:[true,false]});
  assert.equal(s.phase,'completed');
  assert.deepEqual(plain(s.boarded),[false,true]);
  assert.equal(kinds(s,'terminal').length,1);
  return {boarded:plain(s.boarded),receipts:plain(s.receipts),outcome:s.outcome,boardedAt:at};
 };
 const a=replay(30),b=replay(60),c=replay(120);
 for(const result of [b,c]){
  assert.deepEqual(result.boarded,a.boarded);
  assert.equal(result.receipts[0],null);
  assert.equal(result.receipts[1].owner,'Amber');
  assert.ok(Math.abs(result.boardedAt-a.boardedAt)<1e-7);
 }
});
