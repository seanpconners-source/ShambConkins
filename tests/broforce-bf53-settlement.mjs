// BF-53 adversarial settlement coverage.
// Reuses BF-37's proven host/catalog fixture by evaluating ONLY its declarations;
// does not execute or weaken the BF-37 assertions. Production launcher/profile,
// persistence, roster, reward policy, and extraction sources are loaded afresh.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=fs.readFileSync(path.join(root,'tests/broforce-reward-integration.mjs'),'utf8');
const begin=base.indexOf('const catalog=');
const end=base.indexOf('\nlet count=0;',begin);
assert.ok(begin>=0&&end>begin,'BF-37 fixture boundary changed: review this test, do not skip it');
const fixture=[
 'const assert=__assert,fs=__fs,path=__path;',
 'const root='+JSON.stringify(root)+';',
 'const clone=x=>JSON.parse(JSON.stringify(x));',
 'const tick=()=>new Promise(resolve=>setImmediate(resolve));',
 base.slice(begin,end),
 '({harness,clone,tick})'
].join('\n');
const {harness,clone,tick}=vm.runInNewContext(fixture,{
 __assert:assert,__fs:fs,__path:path,console,setImmediate,
 crypto:webcrypto,structuredClone
},{filename:'broforce-bf53-fixture.vm.js'});

let checks=0;
async function check(label,fn){await fn();checks++;console.log('PASS BF-53 '+label);}
const stages=['broforce-jungle','broforce-factory','broforce-city','broforce-desert'];
const cases=[
 {name:'Sean only',flags:[true,false],xp:6},
 {name:'Amber only',flags:[false,true],xp:6},
 {name:'both boarders',flags:[true,true],xp:12},
 {name:'no boarders',flags:[false,false],xp:0}
];

await check('four registered stages × all physical boarding outcomes',async()=>{
 for(const stage of stages)for(const {name,flags,xp} of cases){
  const h=harness(),players=JSON.stringify(h.store.run.players);
  const s=await h.start({id:stage});
  assert.ok(s,stage+' '+name);
  assert.equal(s.broforceReward.attempt.stageId,stage);
  assert.equal(s.broforceReward.attempt.gameId,stage);
  assert.equal(s.broforceReward.attempt.devilId,'rambo');
  const result=await h.finish(s,flags);
  assert.equal(h.store.profile.xp,xp,stage+' '+name+' XP');
  for(let i=0;i<2;i++){
   const owner=i?'Amber':'Sean';
   assert.equal(h.store.profile.rosters[owner].includes('rambo'),flags[i],stage+' '+name+' '+owner);
  }
  assert.equal(JSON.stringify(h.store.run.players),players,'board players/statistics must remain unchanged');
  assert.equal(JSON.stringify(result.rewards),'[0,0]');
  assert.equal(h.calls.progress,0);assert.equal(h.calls.pool,0);
  assert.equal(h.calls.unlock,0);assert.equal(h.calls.end,1);assert.equal(h.calls.roll,0);
  assert.equal(h.store.profile.minigames,0);assert.equal(h.store.profile.wins?.[stage]||0,0);
  assert.equal(h.persistence.validRun(h.store.run),true);
 }
});

await check('already-owned alias never yields a substitute or extra XP',async()=>{
 for(const owner of ['Sean','Amber','shared']){
  const h=harness(),s=await h.start();
  (owner==='shared'?h.store.profile.shared:h.store.profile.rosters[owner]).push('john-rambo');
  await h.finish(s,[true,true]);
  assert.equal(h.store.profile.xp,owner==='shared'?0:6);
  assert.equal(h.store.profile.rosters.Sean.includes('rambo'),owner==='Amber');
  assert.equal(h.store.profile.rosters.Amber.includes('rambo'),owner==='Sean');
  assert.equal(h.store.profile.rosters.Sean.includes('bond-b'),false);
  assert.equal(h.store.profile.rosters.Amber.includes('bond-b'),false);
 }
});

await check('arcade and dev have no durable run/profile progression',async()=>{
 for(const origin of ['arcade','dev']){
  const h=harness(),beforeProfile=JSON.stringify(h.store.profile),beforeRun=JSON.stringify(h.store.run);
  const s=await h.start({origin,id:'broforce-city'});
  await h.finish(s,[true,true]);
  assert.equal(JSON.stringify(h.store.profile),beforeProfile);
  assert.equal(JSON.stringify(h.store.run),beforeRun);
  assert.equal(h.writes.length,0);assert.equal(h.calls.arcade,1);
 }
});

await check('failure, absent proof and wrong devil never recruit',async()=>{
 for(const override of [{bf:{outcome:'failed'}},{bf:{outcome:'timeout'}},{confirm:false},{bf:{devilId:'satan'}}]){
  const h=harness(),s=await h.start({id:'broforce-factory'});
  await h.finish(s,[true,true],override);
  assert.equal(h.store.profile.xp,0);
  assert.equal(h.calls.progress,0);
  assert.equal(h.calls.end,1);
 }
});

await check('failed or zero-boarder result does not make a pointless profile write',async()=>{
 for(const flags of [[false,false],[true,true]]){
  const h=harness(),s=await h.start();
  if(flags[0])await h.finish(s,flags,{bf:{outcome:'failed'}});
  else await h.finish(s,flags);
  assert.equal(h.store.profile.xp,0);
  assert.equal(h.writes.filter(w=>w.k===h.persistence.PROFILE_KEY).length,0);
  assert.equal(h.calls.end,1);
 }
});

await check('persisted committed receipt can reopen when profile writes are denied',async()=>{
 const h=harness(),s=await h.start({id:'broforce-desert'});
 await h.finish(s,[true,false]);
 const xp=h.store.profile.xp,profileWrites=h.writes.filter(w=>w.k===h.persistence.PROFILE_KEY).length;
 assert.equal(xp,6);assert.equal(h.store.run.pending.bfCommitted,true);
 h.setFail(k=>k===h.persistence.PROFILE_KEY);h.setDialog(()=>null);
 const reopened=await h.launcher.presentResult(h.store.run.pending);
 assert.notEqual(reopened,null,'already durable receipt should not require another profile write');
 assert.equal(h.dialogs.at(-1).title,'Helicopter extraction complete');
 assert.equal(h.writes.filter(w=>w.k===h.persistence.PROFILE_KEY).length,profileWrites);
 assert.equal(h.store.profile.xp,xp);assert.equal(h.calls.end,1);
});

await check('unresolved initial intent cannot auto-advance; retry awards once',async()=>{
 const h=harness(),s=await h.start({returnToRoll:true});
 h.setFail((k,value)=>k===h.persistence.RUN_KEY&&value.phase==='result');
 h.setDialog(()=>null);
 await h.finish(s,[false,true]);
 assert.equal(h.store.profile.xp,0);assert.equal(h.calls.end,0);assert.equal(h.calls.roll,0);
 assert.equal(h.writes.filter(w=>w.k===h.persistence.PROFILE_KEY).length,0);
 h.setFail(()=>false);h.setDialog(()=> 'ok');
 await h.launcher.presentResult(h.store.run.pending);
 assert.equal(h.store.profile.xp,6);assert.equal(h.calls.end,0);
 // Replay displays the result but does not itself advance a second turn.
 assert.equal(h.calls.roll,0);
});

await check('new profile save denial preserves intent and crash replay grants once',async()=>{
 const h=harness(),s=await h.start();
 h.setFail(k=>k===h.persistence.PROFILE_KEY);h.setDialog(()=>null);
 await h.finish(s,[true,false]);
 assert.equal(h.store.profile.xp,0);assert.equal(h.calls.end,0);
 assert.ok(JSON.parse(h.disk.get(h.persistence.RUN_KEY)).pending.bfIntent);
 const reboot=harness(h.disk);
 await reboot.launcher.presentResult(reboot.store.run.pending);
 assert.equal(reboot.store.profile.xp,6);
 assert.equal(Object.keys(reboot.store.profile.broforceClaims).length,1);
 await reboot.launcher.presentResult(reboot.store.run.pending);
 assert.equal(reboot.store.profile.xp,6);
 assert.equal(Object.keys(reboot.store.profile.broforceClaims).length,1);
});

await check('rapid finish callbacks and concurrent result replay share one dialog',async()=>{
 const h=harness(),s=await h.start(),stage=s.broforceReward.attempt.stageId;
 let release;
 h.setDialog(()=>new Promise(resolve=>release=resolve));
 const result=await h.finish(s,[false,true]);
 assert.equal(result.bfAttempt.stageId,stage);
 const writes=h.writes.length,dialogs=h.dialogs.length;
 s.onFinish([999,999],'late duplicate');
 const replay=h.launcher.presentResult(result);
 await tick();
 assert.equal(h.dialogs.length,dialogs);
 assert.equal(h.writes.length,writes);
 assert.equal(h.store.profile.xp,6);
 release('ok');await replay;await tick();
 assert.equal(h.calls.end,1);
});

await check('board turn policy and cancellation',async()=>{
 for(const returnToRoll of [true,false]){
  const h=harness(),s=await h.start({returnToRoll});
  await h.finish(s,[false,true]);
  assert.equal(h.calls.roll,Number(returnToRoll));
  assert.equal(h.calls.end,Number(!returnToRoll));
 }
 const h=harness(),s=await h.start(),a=clone(s.broforceReward.attempt);
 h.launcher.cancelGameLaunch();s.dispose();s.finished=true;s.onFinish([1,1],'late');
 await tick();assert.equal(h.store.profile.xp,0);
 const resumed=await h.start({resume:true});
 assert.equal(JSON.stringify(resumed.broforceReward.attempt),JSON.stringify(a));
 await h.finish(resumed,[true,false]);assert.equal(h.store.profile.xp,6);
});
console.log('BF-53 '+checks+'/'+checks+' focused checks passed (real launcher and reward modules, mocked host; no browser/mission simulation).');
