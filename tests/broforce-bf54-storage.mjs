// BF-54: adversarial persistence boundary matrix. Executes the actual source
// modules through their browser-style CommonJS interface, never Node-require(src).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const key='shambconkins-profile-v20';
const claimKey=(attempt,owner)=>'bf27:'+JSON.stringify([attempt,owner]);
const pair={id:'active',left:'data:image/png;base64,AA==',right:'data:image/png;base64,AA==',regions:[{x:.5,y:.5,r:.1}]};
const catalog={characters:['sean','amber','rambo','john-rambo','other-devil','bond-a'].map(id=>({id})),items:[{id:'memento'}]};
const count={value:0};
async function check(label,fn){await fn();count.value++;console.log('PASS BF-54 '+label);}

function harness(initial=new Map()){
 const disk=new Map(initial),events=[],state={mode:'ok'};
 const storage={
  getItem(k){
   if(state.mode==='deny-read')throw Error('read blocked');
   if(state.mode==='stale-read')return state.before??null;
   return disk.get(k)??null;
  },
  setItem(k,value){
   events.push({k,value});
   if(state.mode==='deny-write')throw Error('write blocked');
   if(state.mode==='silent-drop')return;
   if(state.mode==='stale-read')state.before=disk.get(k)??null;
   disk.set(k,value);
   if(state.mode==='commit-then-throw')throw Error('reported failure after commit');
  },
  removeItem(k){disk.delete(k);}
 };
 const context=vm.createContext({localStorage:storage,console});
 function load(file,dependencies){
  const exported={};
  const factory=vm.runInContext('(function(require,exports){\n'+source(file)+'\n})',context,{filename:file});
  factory(id=>{
   assert.ok(Object.hasOwn(dependencies,id),'Unexpected dependency: '+id+' in '+file);
   return dependencies[id];
  },exported);
  return exported;
 }
 const persistence=load('src/persistence.js',{'src/obstacles.js':{validObstacles:()=>true}});
 const photos=load('src/photoPairs.js',{'src/utils.js':{hash:()=>12345}});
 const profile=load('src/profile.js',{'src/netHooks.js':{fx(){}},'src/cpuHooks.js':{cpuBlocksRecruit:()=>false},
  'src/photoPairs.js':photos,'src/contentPolicy.js':{ACTIVE_CATALOG:catalog},
  'src/persistence.js':persistence,
  'src/characters.js':{characterIdentity:id=>id==='john-rambo'?'rambo':id},
  'src/data/savoryLab.js':{LAB_TEAM:[]},
  'src/data/movieBonds.js':{isMovieBond:id=>id==='bond-a',missingMovieBonds:()=>[]},
  'src/solo.js':load('src/solo.js',{})
 });
 return {disk,events,state,persistence,photos,profile};
}
function claimed(p,owners=['Sean'],devilId='rambo',attemptId='attempt-1'){
 p.broforceClaims={};
 for(const owner of owners){
  p.broforceClaims[claimKey(attemptId,owner)]={attemptId,owner,devilId};
  p.rosters[owner].push(devilId);
  p.xp+=6;
 }
 return p;
}
function attempt(stage='broforce-jungle'){
 return {schema:1,attemptId:'bf37:012345',gameId:stage,stageId:stage,origin:'board',
  seed:123,devilId:'rambo',owners:['Sean','Amber'],fighterIds:['sean','amber']};
}

await check('legacy writeJSON memory fallback is not a durable receipt',()=>{
 const h=harness();h.state.mode='deny-write';
 assert.equal(h.persistence.writeJSON('legacy',{counter:4}),false);
 assert.deepEqual(clone(h.persistence.readJSON('legacy')),{counter:4});
 assert.equal(h.persistence.readDurableJSON('legacy'),null);
 assert.equal(h.persistence.writeDurableJSON('receipt',{counter:4}),false);
 assert.equal(h.persistence.readJSON('receipt'),null);
 h.state.mode='ok';
 assert.equal(h.persistence.writeDurableJSON('legacy',{counter:5}),true);
 assert.deepEqual(clone(h.persistence.readJSON('legacy')),{counter:5});
});
await check('silent-drop storage may not claim durable success',()=>{
 const h=harness();h.state.mode='silent-drop';
 assert.equal(h.persistence.writeDurableJSON('receipt',{v:1}),false);
 assert.equal(h.persistence.readDurableJSON('receipt'),null);
 // Legacy best-effort writeJSON deliberately retains its prior behavior.
 assert.equal(h.persistence.writeJSON('other',{v:2}),true);
 assert.equal(h.persistence.readJSON('other'),null);
 assert.equal(h.persistence.readDurableJSON('other'),null);
});
await check('read denial, missing API, post-commit exception are fail-closed',()=>{
 const h=harness();h.state.mode='deny-read';
 assert.equal(h.persistence.writeDurableJSON('x',{v:1}),false);
 h.state.mode='commit-then-throw';
 assert.equal(h.persistence.writeDurableJSON('x',{v:2}),false);
 assert.deepEqual(clone(h.persistence.readDurableJSON('x')),{v:2});
 h.state.mode='ok';
 assert.equal(h.persistence.writeDurableJSON('x',{v:2}),true);
 h.state.mode='stale-read';
 assert.equal(h.persistence.writeDurableJSON('x',{v:3}),false);
});
await check('normal legacy v20 achievements, settings and names retain load behavior',()=>{
 const h=harness(),p=h.profile.freshProfile();
 p.xp=32;p.wins.chess=3;p.played=['chess'];p.settings.music=false;p.rosters.Sean.push('bond-a');
 assert.equal(h.profile.saveProfile(p),true);
 const after=h.profile.loadProfile();
 assert.equal(after.xp,32);assert.equal(after.wins.chess,3);
 assert.equal(after.settings.music,false);assert.ok(after.rosters.Sean.includes('bond-a'));
 assert.equal(after.broforceClaims,undefined);
});
await check('both owner receipts are distinct, survive reload, and do not change fighters',()=>{
 const h=harness(),p=claimed(h.profile.freshProfile(),['Sean','Amber']);
 p.shared=['sean','amber'];p.rosters.Amber.push('other-devil');
 assert.equal(h.profile.saveProfile(p,{durable:true}),true);
 const reboot=harness(h.disk),got=reboot.profile.loadProfile();
 assert.equal(got.xp,12);
 assert.equal(got.broforceClaims[claimKey('attempt-1','Sean')].owner,'Sean');
 assert.equal(got.broforceClaims[claimKey('attempt-1','Amber')].owner,'Amber');
 assert.ok(got.rosters.Sean.includes('rambo'));assert.ok(got.rosters.Amber.includes('rambo'));
 assert.ok(got.rosters.Amber.includes('other-devil'));
 assert.deepEqual(clone(got.shared),['sean','amber']);
});
await check('failed fallback write cannot hide or overwrite durable receipt',()=>{
 const h=harness(),p=claimed(h.profile.freshProfile());
 assert.equal(h.profile.saveProfile(p,{durable:true}),true);
 const stale=h.profile.freshProfile();
 h.state.mode='deny-write';assert.equal(h.profile.saveProfile(stale),false);
 h.state.mode='ok';
 assert.equal(h.profile.loadProfile().broforceClaims[claimKey('attempt-1','Sean')].devilId,'rambo');
 assert.equal(h.profile.saveProfile(stale),false);
 const reboot=harness(h.disk);
 assert.equal(reboot.profile.loadProfile().xp,6);
 assert.ok(reboot.profile.loadProfile().rosters.Sean.includes('rambo'));
});
await check('receipt cannot persist while deleting the awarded owner roster',()=>{
 const h=harness(),p=claimed(h.profile.freshProfile());
 assert.equal(h.profile.saveProfile(p,{durable:true}),true);
 const edited=h.profile.loadProfile();edited.rosters.Sean=['sean'];
 assert.equal(h.profile.saveProfile(edited),false);
 assert.ok(harness(h.disk).profile.loadProfile().rosters.Sean.includes('rambo'));
});
await check('profile-save denial recovers and never leaks a volatile award',()=>{
 const h=harness(),p=claimed(h.profile.freshProfile());
 h.state.mode='deny-write';assert.equal(h.profile.saveProfile(p,{durable:true}),false);
 assert.equal(h.persistence.readDurableJSON(key),null);
 h.state.mode='ok';
 assert.equal(h.profile.loadProfile().xp,0);
 assert.equal(h.profile.saveProfile(p,{durable:true}),true);
 assert.equal(harness(h.disk).profile.loadProfile().xp,6);
});
await check('corrupt JSON cannot be silently overwritten with fresh claims',()=>{
 const h=harness();h.disk.set(key,'{"version":20,"broforceClaims":');
 assert.equal(h.persistence.readDurableJSON(key),null);
 assert.equal(h.persistence.inspectDurableJSON(key).status,'corrupt');
 const got=h.profile.loadProfile();
 assert.equal(got.broforceClaimsBlocked,true);
 assert.equal(h.profile.saveProfile(h.profile.freshProfile()),false);
 assert.equal(h.profile.saveProfile(got),false);
 assert.equal(h.disk.get(key),'{"version":20,"broforceClaims":');
});
await check('malformed receipt quarantine allows unrelated progress but never reopens claims',()=>{
 const h=harness(),p=h.profile.freshProfile();
 p.xp=24;p.broforceClaims={broken:{attemptId:'x',owner:'Sean',devilId:'rambo'}};
 h.disk.set(key,JSON.stringify(p));
 const loaded=h.profile.loadProfile();
 assert.equal(loaded.xp,24);assert.equal(loaded.broforceClaimsBlocked,true);
 loaded.wins.chess=3;
 assert.equal(h.profile.saveProfile(loaded),true);
 const reboot=harness(h.disk).profile.loadProfile();
 assert.equal(reboot.wins.chess,3);assert.equal(reboot.broforceClaimsBlocked,true);
});
await check('receipt validation rejects key, owner, devil, conflict and cap violations',()=>{
 const h=harness(),p=h.profile;
 const r={attemptId:'attempt-1',owner:'Sean',devilId:'rambo'};
 for(const invalid of [
  {broken:r},
  {[claimKey('attempt-1','Amber')]:r},
  {[claimKey('attempt-1','Sean')]:{...r,devilId:'not-in-catalog'}},
  {[claimKey('attempt-1','Sean')]:r,[claimKey('attempt-1','Amber')]:{...r,owner:'Amber',devilId:'other-devil'}},
  {[claimKey('attempt-1','Sean')]:{...r,attemptId:'<>bad'}}
 ])assert.equal(p.validatedBroforceClaims(invalid),null);
 const tooMany={};
 for(let i=0;i<4097;i++){const id='a-'+i;tooMany[claimKey(id,'Sean')]={attemptId:id,owner:'Sean',devilId:'rambo'};}
 assert.equal(p.validatedBroforceClaims(tooMany),null);
 assert.equal(Object.keys(p.validatedBroforceClaims({})).length,0);
});
await check('catalog devil aliases and fixed owner keys never use editable names',()=>{
 const h=harness(),p=h.profile.freshProfile();p.rosters.Sean.push('john-rambo');
 assert.equal(h.profile.availableCharacters(p,'Sean').includes('john-rambo'),true);
 assert.equal(h.profile.canRecruit(p,'rambo','Sean','encounter'),false);
 assert.equal(h.profile.canRecruit(p,'rambo','Amber','encounter'),true);
 const receipt={attemptId:'names-are-not-owners',owner:'Same display name',devilId:'rambo'};
 assert.equal(h.profile.validatedBroforceClaims({[claimKey(receipt.attemptId,receipt.owner)]:receipt}),null);
});
await check('photo library and non-enumerable selected pair survive strict save/reload',()=>{
 const h=harness(),p=h.profile.freshProfile();
 p.photoHuntPairs=[pair];h.photos.currentPhotoPair(p,pair);
 p.wins.chess=5;
 assert.equal(Object.prototype.propertyIsEnumerable.call(p,'photoHuntPair'),false);
 assert.equal(h.profile.saveProfile(p,{durable:true}),true);
 const reboot=harness(h.disk),got=reboot.profile.loadProfile();
 assert.equal(got.photoHuntPair.id,'active');assert.equal(got.photoHuntPairs.length,1);
 assert.equal(got.wins.chess,5);
 assert.equal(reboot.profile.saveProfile(got,{durable:true}),true);
 assert.equal(harness(reboot.disk).profile.loadProfile().photoHuntPair.id,'active');
});
await check('attempt and terminal stage syntax rejects forged origin and cross-stage identity',()=>{
 const h=harness(),p=h.persistence;
 for(const id of p.BROFORCE_IDS)assert.equal(p.validBroforceAttempt(attempt(id)),true);
 for(const bad of [{...attempt(),stageId:'broforce-city'}, {...attempt(),origin:'arcade'},
  {...attempt(),owners:['Amber','Sean']},{...attempt(),gameId:'broforce-warp'},
  {...attempt(),devilId:'fake devil'},{...attempt(),attemptId:'!invalid'}])
  assert.equal(p.validBroforceAttempt(bad),false);
 const a=attempt(),terminal={schema:1,attemptId:a.attemptId,stageId:a.stageId,devilId:'rambo',
  outcome:'extracted',boarded:[true,false],aliveAtBoarding:[true,false]};
 assert.equal(p.validBroforceTerminal(terminal,a),true);
 assert.equal(p.validBroforceTerminal({...terminal,devilId:'other-devil'},a),false);
 assert.equal(p.validBroforceTerminal({...terminal,boarded:[true,true]},a),false);
 const evidence={devilId:'rambo',devilDefeated:true,receipts:[
  {playerIndex:0,owner:'Sean',playerId:'P1',boardedAt:2.5},null]};
 assert.equal(p.validBroforceEvidence(evidence,terminal,a),true);
 assert.equal(p.validBroforceEvidence({...evidence,receipts:[{...evidence.receipts[0],owner:'Amber'},null]},terminal,a),false);
});

console.log('BF-54: '+count.value+'/'+count.value+' injection checks passed (actual source; simulated storage, not a browser/phone).');
