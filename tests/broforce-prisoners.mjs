// BF-16 pure prisoner tests, using BF-17's real roster module with a controlled
// catalog/identity fixture. No browser, profile writes or module registration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(file,deps={}){
 const exports={};
 const code=fs.readFileSync(file,'utf8');
 const factory=vm.runInThisContext('(function(require,exports){\n'+code+'\n})',{filename:file});
 factory(id=>{
  if(!Object.hasOwn(deps,id))throw new Error(file+' unexpectedly requires '+id);
  return deps[id];
 },exports);
 return exports;
}
const chars=['sean','amber','shared','sean-only','amber-only','alpha','beta','gamma','michael','michael-scott'];
const characterIdentity=id=>id==='michael-scott'?'michael':id;
const characters={CHARACTERS:chars.map(id=>({id})),characterIdentity,SPECIAL_UNLOCKS:[]};
const profileApi={availableCharacters:(profile,owner)=>[...(profile.shared||[]),...(profile.rosters?.[owner]||[])],canRecruit:()=>true};
const roster=load('src/engines/broforce/roster.js',{
 'src/characters.js':characters,'src/profile.js':profileApi
});
const bf=load('src/engines/broforce/prisoners.js',{
 'src/engines/broforce/roster.js':roster
});
const P1=()=>({owner:'Sean',name:'Two Players Named Pat',character:'sean',alive:true,x:10,y:12,w:12,h:26});
const P2=()=>({owner:'Amber',name:'Two Players Named Pat',character:'amber',alive:true,x:13,y:12,w:12,h:26});
const profiles={shared:['shared','michael','michael-scott'],rosters:{Sean:['sean-only','alpha'],Amber:['amber-only','beta']}};
const pools={Sean:roster.snapshotFighters(profiles,'Sean'),Amber:roster.snapshotFighters(profiles,'Amber')};
const active={Sean:'shared',Amber:'shared'};
const make=()=>bf.createBroforcePrisoners([{id:'a',x:18,y:18},{id:'b',x:100,y:100}]);
const rescue=(playerIndex,prisonerId='a')=>({type:'rescue',playerIndex,prisonerId});
const advance=(overrides={})=>bf.advanceBroforcePrisoners({
 prisoners:make(),players:[P1(),P2()],fightersByOwner:pools,
 activeFighterByOwner:active,interactions:[rescue(0)],rand:()=>0,...overrides
});
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS BF-16 '+checks+': '+name);}

check('stable pixel-space cages and unique generated ids',()=>{
 const spawns=[{x:4,y:6},{id:'custom',x:18,y:21,w:19,h:25}];
 const copy=structuredClone(spawns);
 const cages=bf.createBroforcePrisoners(spawns);
 assert.deepEqual(cages,[
  {id:'prisoner-0',x:4,y:6,w:16,h:22,rescued:false},
  {id:'custom',x:18,y:21,w:19,h:25,rescued:false}
 ]);
 assert.deepEqual(spawns,copy);
 assert.deepEqual(bf.createBroforcePrisoners(spawns),cages);
 assert.throws(()=>bf.createBroforcePrisoners([{id:'x',x:0,y:0},{id:'x',x:1,y:1}]),/Duplicate/);
 assert.throws(()=>bf.createBroforcePrisoners([{x:NaN,y:5}]),/finite/);
});
check('near P1 rescue swaps from own roster and emits timing metadata',()=>{
 const r=advance();
 assert.equal(r.events.length,1);
 assert.deepEqual(r.events[0],{
  type:'fighter-swap',playerIndex:0,owner:'Sean',prisonerId:'a',
  animationMs:520,statusMs:950,from:'shared',to:'michael'
 });
 assert.equal(r.prisoners[0].rescued,true);
 assert.equal(r.prisoners[0].rescuedBy,'Sean');
 assert.equal(r.prisoners[1].rescued,false);
});
check('P2 ownership uses Amber pool with no cross-owner leakage',()=>{
 const r=advance({interactions:[rescue(1)],fightersByOwner:{Sean:['sean-only'],Amber:['amber-only']}});
 assert.equal(r.events[0].owner,'Amber');
 assert.equal(r.events[0].to,'amber-only');
 assert.equal(r.events[0].playerIndex,1);
 assert.notEqual(r.events[0].to,'sean-only');
});
check('repeated rescues never reuse canonical identity when an alternative exists',()=>{
 const pool=['michael','michael-scott','beta'];
 const r=advance({fightersByOwner:{Sean:pool,Amber:[]},
  activeFighterByOwner:{Sean:'michael-scott',Amber:null},rand:()=>0});
 assert.equal(r.events[0].to,'beta');
});
check('same-tick P1/P2 claims go to canonical Sean priority independent of action order',()=>{
 const first=advance({interactions:[rescue(1),rescue(0)]});
 const reversed=advance({interactions:[rescue(0),rescue(1)]});
 assert.deepEqual(first,reversed);
 assert.equal(first.events.length,1);
 assert.equal(first.events[0].playerIndex,0);
});
check('consumed cage is idempotent across subsequent ticks',()=>{
 const r=advance();
 const again=advance({prisoners:r.prisoners});
 assert.equal(again.events.length,0);
 assert.deepEqual(again.prisoners,r.prisoners);
});
check('remote rescue and forged prisoner ID cannot claim distant cage',()=>{
 const far=advance({interactions:[rescue(0,'b')]});
 assert.deepEqual(far.events,[]);
 assert.equal(far.prisoners[1].rescued,false);
 const touch=advance({players:[{...P1(),x:500,y:500},P2()],interactions:[rescue(0,'a')]});
 assert.deepEqual(touch.events,[]);
});
check('cage destruction requires an impact near the cage',()=>{
 const far=advance({interactions:[{type:'cage-destroyed',playerIndex:0,prisonerId:'a',x:999,y:999}]});
 assert.equal(far.events.length,0);
 const broken=advance({players:[{...P1(),x:500,y:500},P2()],
  interactions:[{type:'cage-destroyed',playerIndex:0,prisonerId:'a',x:24,y:24}]});
 assert.equal(broken.events[0].type,'fighter-swap');
 assert.equal(broken.prisoners[0].rescued,true);
});
check('unattributed and invalid cage break inputs cannot rescue',()=>{
 for(const action of [
  {type:'cage-destroyed',prisonerId:'a',x:24,y:24},
  {type:'cage-destroyed',playerIndex:0,prisonerId:'a'},
  {type:'cage-destroyed',playerIndex:99,prisonerId:'a',x:24,y:24}
 ])assert.equal(advance({interactions:[action]}).events.length,0);
});
check('dead, downed, zero-health, extracted and wrong-owner actors cannot rescue',()=>{
 for(const modification of [{alive:false},{dead:true},{downed:true},{health:0},{extracted:true},
  {cancelled:true},{owner:'Amber'},{x:Infinity}]){
  const r=advance({players:[{...P1(),...modification},P2()]});
  assert.deepEqual(r.events,[],JSON.stringify(modification));
 }
});
check('abort, cancel and pause prevent late rescues and consume no RNG',()=>{
 for(const signal of ['aborted','cancelled','canceled','paused']){
  const r=advance({interactions:{actions:[rescue(0)],[signal]:true},
   rand:()=>{throw Error('Must not draw on abort');}});
  assert.equal(r.events.length,0);
  assert.equal(r.prisoners[0].rescued,false);
 }
});
check('empty eligible pool consumes cage with no swap or invented character',()=>{
 const r=advance({fightersByOwner:{Sean:[],Amber:[]},rand:()=>{throw Error('Empty RNG');}});
 assert.equal(r.events[0].type,'prisoner-empty');
 assert.equal(r.events[0].owner,'Sean');
 assert.equal(r.prisoners[0].rescued,true);
});
check('singleton roster works without RNG and preserves legal current identity',()=>{
 const r=advance({fightersByOwner:{Sean:['alpha'],Amber:[]},
  activeFighterByOwner:{Sean:'alpha',Amber:null},rand:()=>{throw Error('Singleton RNG');}});
 assert.equal(r.events[0].from,'alpha');
 assert.equal(r.events[0].to,'alpha');
});
check('multiple cages resolve in stable ID order, chaining temporary swaps only',()=>{
 const cages=bf.createBroforcePrisoners([{id:'z',x:18,y:18},{id:'a',x:20,y:20}]);
 const result=advance({prisoners:cages,interactions:[rescue(0,'z'),rescue(0,'a')],
  fightersByOwner:{Sean:['alpha','beta'],Amber:[]},
  activeFighterByOwner:{Sean:'alpha',Amber:null}});
 assert.deepEqual(result.events.map(e=>[e.prisonerId,e.from,e.to]),
  [['a','alpha','beta'],['z','beta','alpha']]);
});
check('untargeted intent selects exactly the nearest eligible cage',()=>{
 const cages=bf.createBroforcePrisoners([{id:'farther',x:35,y:23},{id:'near',x:18,y:18}]);
 const r=advance({prisoners:cages,interactions:[{type:'touch',playerIndex:0}]});
 assert.deepEqual(r.events.map(e=>e.prisonerId),['near']);
 assert.equal(r.prisoners[0].rescued,false);
});
check('seeded draws are reproducible and never modify input actors/rosters/saves',()=>{
 const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const players=[P1(),P2()],prisoners=bf.createBroforcePrisoners([
  {id:'a',x:18,y:18},{id:'b',x:18,y:18},{id:'c',x:18,y:18}]);
 const fightersByOwner={Sean:['alpha','beta','gamma'],Amber:['amber-only']};
 const activeFighterByOwner={Sean:'alpha',Amber:'amber-only'};
 const saved={profile:{rosters:{Sean:['alpha'],Amber:['amber-only']},shared:[]},
  run:{players:[{character:'sean',owner:'Sean'},{character:'amber',owner:'Amber'}]}};
 const inputs={players,prisoners,fightersByOwner,activeFighterByOwner,saved};
 const before=structuredClone(inputs);
 const args={players,prisoners,fightersByOwner,activeFighterByOwner,
  interactions:[rescue(0,'a'),rescue(0,'b'),rescue(0,'c')]};
 const a=bf.advanceBroforcePrisoners({...args,rand:seeded(123)});
 const b=bf.advanceBroforcePrisoners({...args,rand:seeded(123)});
 assert.deepEqual(a,b);
 assert.deepEqual(inputs,before,'Implementation mutated input players, rosters, active fighters or saves');
 assert.deepEqual(players.map(p=>p.character),['sean','amber']);
 assert.deepEqual(saved.run.players.map(p=>p.character),['sean','amber']);
 assert.equal(a.events.length,3);
});
console.log('BROFORCE BF-16 PRISONERS OK: '+checks+'/'+checks+' deterministic checks passed');
