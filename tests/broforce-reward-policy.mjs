// BF-27 offline, deterministic profile transaction checks. No browser or save IO.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const sources=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const catalog={characters:[
 {id:'sean',name:'Sean',source:'Family'},
 {id:'amber',name:'Amber',source:'Family'},
 {id:'generic-devil',name:'Generic Devil',source:'Broforce'},
 {id:'generic-other',name:'Another Devil',source:'Broforce'},
 {id:'rambo',name:'John Rambo',source:'Rambo'},
 {id:'john-rambo',name:'John Rambo',source:'Rambo'},
 {id:'satan',name:'Satan',source:'Horror',unlockBy:'horror'},
 {id:'loki',name:'Loki',source:'Family'},
 {id:'bossy',name:'Boss',source:'Boss Fight',unlockBy:'boss'},
 {id:'item-locked',name:'Item',source:'Items',unlockBy:'item'},
 {id:'game-locked',name:'Game',source:'Games',unlockBy:'game-win'},
 {id:'lab-locked',name:'Lab',source:'Lab',unlockBy:'lab'}
],items:[]};
function moduleAt(file,dependencies){
 const exports={};
 const req=id=>{
  if(!Object.hasOwn(dependencies,id))throw new Error('Unexpected import '+id+' by '+file);
  return dependencies[id];
 };
 new Function('require','exports',sources(file))(req,exports);
 return exports;
}
const content={'src/contentPolicy.js':{ACTIVE_CATALOG:catalog}};
const chars=moduleAt('src/characters.js', {...content,'src/utils.js':{hash:()=>0}});
const profile=moduleAt('src/profile.js',{
 ...content,
 'src/photoPairs.js':{normalizePhotoPair:()=>null,photoPairLibrary:()=>[],currentPhotoPair:()=>{},photoProfilePayload:p=>p},
 'src/persistence.js':{PROFILE_KEY:'local-test',readJSON:()=>null,writeJSON:()=>{throw new Error('STORAGE MUST NOT BE CALLED');}},
 'src/characters.js':chars,
 'src/data/savoryLab.js':{LAB_TEAM:[]},
 'src/data/movieBonds.js':{isMovieBond:()=>false,missingMovieBonds:()=>[]},
 'src/solo.js':moduleAt('src/solo.js',{})
});
const {planBroforceAwards:plan,applyBroforceAwards:apply}=moduleAt('src/engines/broforce/rewardPolicy.js',{'src/characters.js':chars,'src/profile.js':profile});
const fresh=()=>profile.freshProfile();
const attempt=(p,overrides={})=>({profile:p,origin:'board',attemptId:'run17:stage2',devilId:'generic-devil',
 owners:['Sean','Amber'],boarded:[true,true],aliveAtBoarding:[true,true],won:true,...overrides});
const planFrom=(p,o={})=>plan(attempt(p,o));
const has=(p,owner,id)=>profile.availableCharacters(p,owner).some(c=>chars.characterIdentity(c)===chars.characterIdentity(id));
const sorted=p=>JSON.parse(JSON.stringify(p));
let cases=0;
function check(label,fn){fn();cases++;console.log('PASS '+label);}
check('normal both board and own exact devil independently',()=>{
 const input=fresh(),before=sorted(input),originalRoster=sorted(input.rosters);
 const p=planFrom(input);assert.deepEqual(p.grants.map(g=>g.owner),['Sean','Amber']);
 const done=apply(input,p);assert.deepEqual(sorted(input),before);
 assert.deepEqual(done.grants.map(g=>g.characterId),['generic-devil','generic-devil']);
 assert.equal(done.receipts.length,2);assert.equal(done.profile.xp,input.xp+12);
 assert.equal(has(done.profile,'Sean','generic-devil'),true);assert.equal(has(done.profile,'Amber','generic-devil'),true);
 assert.deepEqual(done.profile.rosters.Sean.slice(0,originalRoster.Sean.length),originalRoster.Sean);
 assert.deepEqual(done.profile.rosters.Amber.slice(0,originalRoster.Amber.length),originalRoster.Amber);
 assert.deepEqual(done.profile.shared,input.shared);
 assert.deepEqual(Object.keys(done.profile).sort(),[...Object.keys(input),'broforceClaims'].sort());
 assert.equal(done.profile.earnedUnlocks['generic-devil'],'broforce');
});
check('P1 alone boards; P2 not rewarded despite living',()=>{
 const p=fresh();const o=apply(p,planFrom(p,{boarded:[true,false]}));
 assert.deepEqual(o.grants.map(g=>g.owner),['Sean']);assert.equal(has(o.profile,'Amber','generic-devil'),false);
 assert.equal(o.profile.xp,p.xp+6);
});
check('P2 alone boards; P1 not rewarded despite living',()=>{
 const p=fresh();const o=apply(p,planFrom(p,{boarded:[false,true]}));
 assert.deepEqual(o.grants.map(g=>g.owner),['Amber']);assert.equal(has(o.profile,'Sean','generic-devil'),false);
});
check('boarded but dead does not qualify; neither extracts yields no rewards',()=>{
 const p=fresh();const a=apply(p,planFrom(p,{aliveAtBoarding:[true,false]}));
 assert.deepEqual(a.grants.map(g=>g.owner),['Sean']);
 for(const overrides of [{boarded:[false,false]},{aliveAtBoarding:[false,false]},{boarded:[true,false],aliveAtBoarding:[false,true]}]){
  const b=apply(p,planFrom(p,overrides));assert.deepEqual(b.grants,[]);assert.deepEqual(b.profile,sorted(p));
 }
});
check('duplicate finish/rescue and reapplication after serialized reload are exact once',()=>{
 const p=fresh(),claim=planFrom(p),first=apply(p,claim),again=apply(first.profile,claim);
 const afterReload=JSON.parse(JSON.stringify(first.profile));
 assert.deepEqual(again.grants,[]);assert.deepEqual(again.receipts,[]);
 assert.deepEqual(again.profile,afterReload);
 assert.deepEqual(apply(afterReload,claim).profile,afterReload);
 assert.equal(first.profile.xp,p.xp+12);
});
check('canonical owners not display names; identity of selected board character is unchanged',()=>{
 const p=fresh(),players=[{name:'Captain Nacho',owner:'Sean',character:'rambo'},{name:'Lady Waffles',owner:'Amber',character:'amber'}];
 p.run={players};const before=sorted(p.run);const out=apply(p,planFrom(p,{owners:['Amber','Sean'],boarded:{Amber:true,Sean:false},aliveAtBoarding:{Amber:true,Sean:true}}));
 assert.deepEqual(out.grants.map(g=>g.owner),['Amber']);assert.deepEqual(out.profile.run,before);
 assert.deepEqual(p.run,before);
 assert.deepEqual(planFrom(p,{owners:['Captain Nacho','Lady Waffles']}).grants,[]);
});
check('special unlocks and Loki are never a devil or generic substitute',()=>{
 for(const id of ['satan','bossy','item-locked','game-locked','lab-locked','loki']){
  const p=fresh(),draft=planFrom(p,{devilId:id});const out=apply(p,draft);
  assert.equal(draft.eligible,false,id);assert.deepEqual(out.grants,[],id);assert.deepEqual(out.profile,sorted(p),id);
 }
});
check('preowned canonical identity alias disallows duplicate but other owner can qualify',()=>{
 const p=fresh();p.rosters.Sean.push('john-rambo');
 const out=apply(p,planFrom(p,{devilId:'rambo'}));
 assert.deepEqual(out.grants,[{owner:'Amber',characterId:'rambo'}]);
 assert.equal(p.rosters.Sean.includes('rambo'),false);
 const q=fresh();q.shared.push('john-rambo');
 assert.deepEqual(planFrom(q,{devilId:'rambo'}).grants,[]);
});
check('no eligible character never fabricates random/alternate unlock',()=>{
 const p=fresh();p.rosters.Sean.push('generic-devil');p.rosters.Amber.push('generic-devil');
 const out=apply(p,planFrom(p));assert.deepEqual(out.grants,[]);assert.deepEqual(out.profile,sorted(p));
});
check('arcade/dev/cancel/timeout/failed/nonvictory never award',()=>{
 const p=fresh();for(const origin of ['arcade','dev','cancel','timeout','failed','spectator',undefined]){
  const out=apply(p,planFrom(p,{origin}));assert.deepEqual(out.profile,sorted(p));assert.deepEqual(out.grants,[]);
 }
 for(const won of [false,null,0,'true',undefined])assert.deepEqual(apply(p,planFrom(p,{won})).grants,[]);
});
check('garbled evidence and attempt/devil IDs fail closed',()=>{
 const p=fresh();const variants=[{attemptId:''},{attemptId:'bad/../../key'},
  {attemptId:'__proto__'}, // malformed and must fail closed
  {attemptId:'x'.repeat(200)},{devilId:'constructor'},{devilId:'generic-devil,bossy'},
  {devilId:['generic-devil','generic-other']},{boarded:[1,1]},{boarded:[true]},
  {boarded:{Sean:true,Amber:'true'}},{aliveAtBoarding:[true,'yes']},{owners:['Sean','Sean']},
  {owners:['Sean','Hacker']},{owners:['Sean']},{origin:{toString:()=> 'board'}}];
 for(const v of variants){const draft=planFrom(p,v);const out=apply(p,draft);
  assert.deepEqual(draft.grants,[]);assert.deepEqual(out.profile,sorted(p));
 }
});
check('invalid profile and forged plan cannot poison owner/ID grants',()=>{
 const p=fresh();
 for(const garbage of [null,42,[],undefined,'board'])assert.deepEqual(plan(garbage).grants,[]);
 assert.equal(planFrom({...p,rosters:{}}).eligible,false);
 const valid=planFrom(p);
 for(const fake of [
  {...valid,grants:[{owner:'Unrelated',characterId:'generic-devil'}]},
  {...valid,grants:[{owner:'Sean',characterId:'generic-other'}]},
  {...valid,grants:[{owner:'Sean',characterId:'generic-devil'},{owner:'Sean',characterId:'generic-devil'}]},
  {...valid,boarded:[false,false]},
  {...valid,origin:'arcade'}]){
   const o=apply(p,fake);assert.deepEqual(o.grants,[]);assert.deepEqual(o.profile,sorted(p));
 }
});
check('claim collisions reject altered devil and malformed/polluted receipts',()=>{
 const p=fresh(),first=apply(p,planFrom(p));const id='generic-other';
 const fake=planFrom(p,{devilId:id});
 assert.throws(()=>apply(first.profile,fake),/Conflicting devil/);
 const other=fresh(),bad=Object.create(null);bad.__proto__={attemptId:'run17:stage2',owner:'Sean',devilId:'generic-devil'};
 other.broforceClaims=bad;
 assert.throws(()=>apply(other,planFrom(other)),/Malformed Broforce claim/);
 const tampered=fresh();tampered.broforceClaims={'bf27:["run17:stage2","Sean"]':{attemptId:'run17:stage2',owner:'Amber',devilId:'generic-devil'}};
 assert.throws(()=>apply(tampered,planFrom(tampered)),/Malformed Broforce claim/);
});
check('existing earned reasons and unrelated profile entries remain intact',()=>{
 const p=fresh();p.earnedUnlocks['generic-devil']='legacy-custom';p.wins={'game-z':5};p.xp=33;
 const original=sorted(p),done=apply(p,planFrom(p));
 assert.equal(done.profile.earnedUnlocks['generic-devil'],'legacy-custom');
 assert.deepEqual(done.profile.wins,p.wins);assert.equal(done.profile.xp,45);
 assert.deepEqual(p,original);assert.deepEqual(done.profile.shared,p.shared);
});
console.log('BF-27: '+cases+'/'+cases+' checks passed');
