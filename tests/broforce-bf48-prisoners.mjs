// BF-48 adversarial pure-component tests. Uses the real BF-17 roster.js
// implementation and its snapshotFighters -> drawNextFighter contract.
// Mock only the surrounding character catalog and owned-profile lookup.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(file, deps = {}) {
 const exports = {};
 const factory = vm.runInThisContext('(function(require,exports){\n' + fs.readFileSync(file, 'utf8') + '\n})', {filename:file});
 factory(id => {
  if (!Object.hasOwn(deps,id)) throw new Error('Unexpected dependency in '+file+': '+id);
  return deps[id];
 }, exports);
 return exports;
}
const catalog = ['sean','amber','shared','sean-only','amber-only','alpha','beta',
 'locked','michael','michael-scott'];
const characterIdentity = id => id === 'michael-scott' ? 'michael' : id;
const characters = {CHARACTERS:catalog.map(id => ({id})),characterIdentity,SPECIAL_UNLOCKS:[]};
const availableCharacters = (profile, owner) => [
 ...(profile.shared || []),...(profile.rosters?.[owner] || [])];
const roster = load('src/engines/broforce/roster.js', {
 'src/characters.js':characters,
 'src/profile.js':{availableCharacters,canRecruit:()=>true}
});
const prisonersApi = load('src/engines/broforce/prisoners.js', {
 'src/engines/broforce/roster.js':roster
});
const {createBroforcePrisoners,advanceBroforcePrisoners} = prisonersApi;
const profile = () => ({shared:['shared','michael','michael-scott'],
 rosters:{Sean:['sean-only','alpha'],Amber:['amber-only','beta']},
 locked:['locked'],recruited:[]});
const P1 = () => ({owner:'Sean',name:'Same Name',character:'sean',
  alive:true,x:10,y:12,w:12,h:26});
const P2 = () => ({owner:'Amber',name:'Same Name',character:'amber',
  alive:true,x:13,y:12,w:12,h:26});
const cages = () => createBroforcePrisoners([{id:'a',x:18,y:18},{id:'b',x:100,y:100}]);
const touch = (i,id='a') => ({type:'touch',playerIndex:i,prisonerId:id});
const shot = (i,x=24,y=24,id='a') => ({type:'cage-destroyed',playerIndex:i,x,y,prisonerId:id});
const run = (opts={}) => {
 const p=profile();
 return advanceBroforcePrisoners({prisoners:cages(),players:[P1(),P2()],
  fightersByOwner:{Sean:roster.snapshotFighters(p,'Sean'),Amber:roster.snapshotFighters(p,'Amber')},
  activeFighterByOwner:{Sean:'shared',Amber:'shared'},
  interactions:[touch(0)],rand:()=>0,...opts});
};
let count=0;
function check(title,body){body(); count++; console.log('PASS BF-48 '+count+': '+title);}

check('BF-17 snapshots obey permanent owner keys and exclude locked characters',()=>{
 const p=profile(), before=structuredClone(p);
 const a=roster.snapshotFighters(p,'Sean'), b=roster.snapshotFighters(p,'Amber');
 assert.deepEqual(a,['shared','michael','sean-only','alpha']);
 assert.deepEqual(b,['shared','michael','amber-only','beta']);
 assert.ok(!a.includes('locked')&&!b.includes('locked'));
 assert.ok(!a.includes('amber-only')&&!b.includes('sean-only'));
 assert.deepEqual(roster.snapshotFighters(p,'Same Name'),[]);
 assert.deepEqual(p,before);
});
check('same edited names never change owner-specific pool or board character',()=>{
 const actors=[P1(),P2()],before=structuredClone(actors),p=profile();
 const a=run({players:actors,interactions:[touch(1)],
  fightersByOwner:{Sean:['sean-only'],Amber:roster.snapshotFighters(p,'Amber')},rand:()=>.99});
 assert.equal(a.events[0].owner,'Amber');
 assert.ok(roster.snapshotFighters(p,'Amber').includes(a.events[0].to));
 assert.ok(!['locked','sean-only'].includes(a.events[0].to));
 assert.deepEqual(actors,before);
 assert.deepEqual(actors.map(v=>v.character),['sean','amber']);
});
check('no actor without explicit alive=true may claim a cage',()=>{
 for(const alive of [undefined,null,0,1,'true',false]){
  const p=P1(); if(alive===undefined)delete p.alive; else p.alive=alive;
  for(const intent of [touch(0),shot(0)]){
   const result=run({players:[p,P2()],interactions:[intent]});
   assert.deepEqual(result.events,[],String(alive));
   assert.equal(result.prisoners[0].rescued,false);
  }
 }
});
check('boarded, extracted, downed, cancelled and dead owners cannot claim collision',()=>{
 for(const flag of ['boarded','extracted','downed','dead','cancelled','canceled']){
  for(const action of [touch(0),shot(0)]){
   const result=run({players:[{...P1(),[flag]:true},P2()],interactions:[action]});
   assert.equal(result.events.length,0,flag);
  }
 }
 for(const hp of [0,-1])assert.deepEqual(run({players:[{...P1(),health:hp},P2()]}).events,[]);
});
check('wrong index, owner spoofing or enemy projectile cannot claim either roster',()=>{
 for(const index of [-1,2,1.5,'0',null,NaN]){
  assert.deepEqual(run({interactions:[shot(index)]}).events,[]);
 }
 assert.deepEqual(run({players:[{...P1(),owner:'Amber'},P2()],interactions:[shot(0)]}).events,[]);
 assert.deepEqual(run({players:[P1(),{...P2(),owner:'Sean'}],interactions:[shot(1)]}).events,[]);
 assert.deepEqual(run({interactions:[{type:'cage-destroyed',x:24,y:24,owner:'enemy:0'}]}).events,[]);
});
check('realistic attributed impact coordinates require a cage collision, not an ID alone',()=>{
 for(const bad of [{x:999,y:999},{x:NaN,y:24},{x:undefined},{y:undefined},{x:Infinity,y:24}]){
  assert.deepEqual(run({interactions:[{...shot(0),...bad}]}).events,[]);
 }
 const distant=run({players:[{...P1(),x:500,y:500},P2()],interactions:[shot(0)]});
 assert.equal(distant.events[0].owner,'Sean');
 assert.equal(distant.prisoners[0].rescued,true);
});
check('touch rectangle collision is inclusive at 28px and excludes beyond the edge',()=>{
 // y of body center is inside the cage vertical span.
 const p={...P1(),x:18-28-6,y:12};
 const hit=run({players:[p,P2()]});
 assert.equal(hit.events.length,1);
 const miss=run({players:[{...p,x:p.x-.001},P2()]});
 assert.equal(miss.events.length,0);
});
check('projectile impact collision is inclusive at 16px and excludes epsilon outside',()=>{
 const hit=run({interactions:[shot(0,2,24)]});
 assert.equal(hit.events.length,1);
 assert.deepEqual(run({interactions:[shot(0,1.999,24)]}).events,[]);
});
check('different 30/60fps tick groupings never double-rescue a consumed cage',()=>{
 for(const repeats of [2,4]){
  let state=cages(), events=[];
  for(let tick=0;tick<repeats;tick++){
   const step=run({prisoners:state,interactions:[shot(0),touch(0),shot(1)]});
   events.push(...step.events);state=step.prisoners;
  }
  assert.equal(events.length,1);
  assert.equal(events[0].owner,'Sean');
  assert.equal(state[0].rescuedBy,'Sean');
 }
});
check('same-tick both owners in range resolves by canonical P1, independent of order',()=>{
 const left=run({interactions:[touch(1),shot(0),touch(0),shot(1)]});
 const right=run({interactions:[shot(1),touch(0),shot(0),touch(1)]});
 assert.deepEqual(left,right);
 assert.equal(left.events.length,1);
 assert.equal(left.events[0].playerIndex,0);
});
check('same-tick P2-only valid claimant rescues for Amber even if P1 is closer',()=>{
 const result=run({interactions:[shot(1),touch(0)],players:[{...P1(),alive:false},P2()],
  fightersByOwner:{Sean:['sean-only'],Amber:['amber-only']}});
 assert.deepEqual(result.events.map(e=>[e.owner,e.to]),[['Amber','amber-only']]);
});
check('duplicate hits and touches produce exactly one timed animation/swap event',()=>{
 const result=run({interactions:[shot(0),shot(0),touch(0),touch(0),shot(1)]});
 assert.equal(result.events.length,1);
 assert.equal(result.events[0].type,'fighter-swap');
 assert.equal(result.events[0].animationMs,520);
 assert.equal(result.events[0].statusMs,950);
 assert.deepEqual(run({prisoners:result.prisoners,interactions:[touch(0),shot(0)]}).events,[]);
});
check('a single untargeted bullet breaks only the nearest cage on a geometric tie',()=>{
 const all=createBroforcePrisoners([{id:'z',x:18,y:18},{id:'a',x:18,y:18}]);
 const r=run({prisoners:all,interactions:[{type:'cage-destroyed',playerIndex:0,x:24,y:24}]});
 assert.deepEqual(r.events.map(e=>e.prisonerId),['a']);
 assert.deepEqual(r.prisoners.map(p=>p.rescued),[false,true]);
});
check('multiple independent cage impacts chain temporary active fighter without profile grants',()=>{
 const p=profile(),pBefore=structuredClone(p),actors=[P1(),P2()],old=structuredClone(actors);
 const prisoners=createBroforcePrisoners([{id:'z',x:18,y:18},{id:'a',x:20,y:20}]);
 const result=run({prisoners,players:actors,interactions:[shot(0,22,22,'z'),shot(0,24,24,'a')],
  fightersByOwner:{Sean:['alpha','sean-only'],Amber:['amber-only']},
  activeFighterByOwner:{Sean:'alpha',Amber:'amber-only'}});
 assert.deepEqual(result.events.map(e=>[e.prisonerId,e.from,e.to]),
  [['a','alpha','sean-only'],['z','sean-only','alpha']]);
 assert.deepEqual(actors,old);
 assert.deepEqual(p,pBefore);
});
check('unlocked empty pool consumes cage without inventing unlocked or reward character',()=>{
 const result=run({fightersByOwner:{Sean:[],Amber:[]},rand:()=>{throw Error('No random draw')}});
 assert.deepEqual(result.events.map(e=>e.type),['prisoner-empty']);
 assert.equal(result.events[0].owner,'Sean');
 assert.equal(result.prisoners[0].rescued,true);
});
check('pause/abort/cancel consume neither cages nor RNG',()=>{
 for(const key of ['paused','cancelled','canceled','aborted']){
  const prisoners=cages();
  const result=run({prisoners,interactions:{actions:[touch(0),shot(1)],[key]:true},
   rand:()=>{throw Error('No draw on pause')}});
  assert.deepEqual(result.events,[]);
  assert.deepEqual(result.prisoners,prisoners);
 }
});
check('spawn defaults and rejects duplicate / nonfinite origins without mutating input',()=>{
 const input=[{x:2,y:4},{id:'large',x:40,y:60,w:24,h:32}];
 const clone=structuredClone(input);
 const r=createBroforcePrisoners(input);
 assert.deepEqual([r[0].w,r[0].h,r[1].w,r[1].h],[16,22,24,32]);
 assert.deepEqual(input,clone);
 for(const value of [NaN,Infinity,-Infinity])
  assert.throws(()=>createBroforcePrisoners([{x:value,y:1}]),/finite/);
 assert.throws(()=>createBroforcePrisoners([{id:'x',x:1,y:1},{id:'x',x:2,y:2}]),/Duplicate/);
});
check('no rescue occurs for unknown action types, zero interactions or remote names',()=>{
 for(const interaction of [[],[{type:'reward',playerIndex:0}], [touch(0,'b')],
  [{type:'cage-destroyed',playerIndex:0,prisonerId:'b',x:24,y:24}]]) {
  assert.deepEqual(run({interactions:interaction}).events,[]);
 }
});
console.log('BF-48 PRISONERS OK: '+count+'/'+count+' checks passed');
