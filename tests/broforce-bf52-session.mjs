// BF-52 adversarial GameSession integration regression.
// Reuse the pinned BF-36 host fixture without modifying that worker's file.
// This is a VM/DOM-fixture test, NOT a real browser or live stage playtest.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const file=path.join(root,'tests/broforce-host-adapter.mjs');
const source=fs.readFileSync(file,'utf8');
const needle="const root=new URL('../',import.meta.url);";
assert.equal(source.split(needle).length,2,'BF-36 fixture root signature changed; update BF-52 explicitly');
const fixture=source.replace(needle,'const root=new URL('+JSON.stringify(pathToFileURL(root+path.sep).href)+');');
const extra=String.raw`
// These additions execute in the existing fixture module, against the real BF-36 adapter.
await check('BF52 stage identity fails before mounting, never substitutes another game',async()=>{
 const d=setup({stageId:'broforce-jungle'});d.s.game.id='broforce-desert';
 await assert.rejects(d.run(),/matching mission IDs/);
 assert.equal(d.calls.create.length,0);assert.equal(d.calls.finish.length,0);
});
await check('BF52 owner keys are authoritative, not mutable equal display names',async()=>{
 for(const owners of [['Amber','Sean'],['Sean','Sean'],['p1','Amber']]){
  const d=setup();d.players.forEach((p,i)=>p.owner=owners[i]);
  await assert.rejects(d.run(),/owner-aligned Sean and Amber/);
  assert.equal(d.calls.create.length,0);assert.equal(d.calls.finish.length,0);
 }
});
await check('BF52 selected fighter and owner snapshots do not track later board edits',async()=>{
 const d=setup();await d.run();const attempt=d.s.debug.attempt;
 const before=plain(d.s.debug.state.players.map(p=>({owner:p.owner,character:p.character,fighterId:p.fighterId,fighters:p.fighters})));
 d.players[0].name='Changed';d.players[0].character='beta';d.store.profile.rosters.Sean.push('devil-a');
 assert.deepEqual(plain(d.s.debug.state.players.map(p=>({owner:p.owner,character:p.character,fighterId:p.fighterId,fighters:p.fighters}))),before);
 assert.equal(d.s.debug.attempt,attempt);d.s.dispose();
});
await check('BF52 simultaneous physical action inputs retain separate P1/P2 owners',async()=>{
 const d=setup();await d.run();
 d.doc.emit('keydown',{key:'e',code:'KeyE'});d.doc.emit('keydown',{key:'Shift',code:'ShiftLeft'});
 d.step();assert.deepEqual(d.calls.steps.at(-1).inputs.map(p=>p.actionHeld),[true,true]);
 d.doc.emit('keyup',{key:'e',code:'KeyE'});d.step();
 assert.deepEqual(d.calls.steps.at(-1).inputs.map(p=>p.actionHeld),[false,true]);
 d.doc.emit('keyup',{key:'Shift',code:'ShiftLeft'});d.step();
 assert.deepEqual(d.calls.steps.at(-1).inputs.map(p=>p.actionHeld),[false,false]);d.s.dispose();
});
await check('BF52 cross-half touch is rejected and cannot impersonate the other boarder',async()=>{
 const d=setup();await d.run();
 d.button(0,'special').emit('pointerdown',{pointerId:17,clientX:380});d.step();
 assert.deepEqual(d.calls.steps.at(-1).inputs.map(p=>p.actionHeld),[false,false]);
 d.button(0,'special').emit('pointerdown',{pointerId:18,clientX:22});d.step();
 assert.deepEqual(d.calls.steps.at(-1).inputs.map(p=>p.actionHeld),[true,false]);
 d.win.emit('pointercancel',{pointerId:18});d.step();
 assert.deepEqual(d.calls.steps.at(-1).inputs.map(p=>p.actionHeld),[false,false]);d.s.dispose();
});
await check('BF52 blur clears both held owners and prevents simulation while paused',async()=>{
 const d=setup();await d.run();d.doc.emit('keydown',{key:'e',code:'KeyE'});
 d.doc.emit('keydown',{key:'Shift',code:'ShiftLeft'});d.win.emit('blur');
 assert.equal(d.s.paused,true);assert.equal(d.s.loop!==undefined,true);
 const n=d.calls.steps.length;d.step();assert.equal(d.calls.steps.length,n);
 d.s.paused=false;d.step();assert.deepEqual(d.calls.steps.at(-1).inputs.map(p=>p.actionHeld),[false,false]);d.s.dispose();
});
await check('BF52 failed and timeout terminals never request BF37 confirmation',async()=>{
 const reward={schema:1,attemptId:'bf37:no-grant',gameId:'broforce-jungle',stageId:'broforce-jungle',seed:9,origin:'board',owners:['Sean','Amber'],fighterIds:['sean','amber'],devilId:'devil-b'};
 for(const outcome of ['failed','timeout']){
  const d=setup({reward,terminal:s=>terminal(s,[false,false],outcome)});
  await d.run();d.step();assert.equal(d.calls.proofs.length,0);
  assert.equal(d.calls.finish[0].result.won,false);assert.deepEqual(d.calls.finish[0].scores,[0,0]);
 }
});
await check('BF52 completed helicopter proof occurs before finish, once across late frames',async()=>{
 const reward={schema:1,attemptId:'bf37:ordered',gameId:'broforce-jungle',stageId:'broforce-jungle',seed:17,origin:'board',owners:['Sean','Amber'],fighterIds:['sean','amber'],devilId:'devil-b'};
 const d=setup({reward,terminal:s=>terminal(s,[false,true])});
 const finish=d.s.finish;d.s.finish=(scores,label)=>{assert.equal(d.calls.proofs.length,1,'must confirm real proof before s.finish');finish(scores,label);};
 await d.run();d.step();d.step();d.step();
 assert.equal(d.calls.proofs.length,1);assert.equal(d.calls.finish.length,1);
 assert.deepEqual(d.calls.finish[0].scores,[0,1]);
});
await check('BF52 rejected success proof is failure with exactly one settlement',async()=>{
 const reward={schema:1,attemptId:'bf37:reject-bf52',gameId:'broforce-jungle',stageId:'broforce-jungle',seed:29,origin:'board',owners:['Sean','Amber'],fighterIds:['sean','amber'],devilId:'devil-b'};
 const d=setup({reward,rejectProof:true,terminal:s=>terminal(s,[true,true])});
 await d.run();d.step();d.step();assert.equal(d.calls.proofs.length,1);
 assert.equal(d.calls.finish.length,1);assert.equal(d.calls.finish[0].result.won,false);
 assert.deepEqual(d.calls.finish[0].scores,[0,0]);
});
await check('BF52 dispose and reentry restore DOM and create one loop per new session',async()=>{
 for(let i=0;i<2;i++){
  const d=setup();await d.run();assert.equal(d.shell.classList.contains('bf36-shell'),true);
  d.step();const steps=d.calls.steps.length;d.s.dispose();d.step();
  assert.equal(d.calls.steps.length,steps);assert.equal(d.calls.finish.length,0);
  assert.equal(d.shell.classList.contains('bf36-shell'),false);
  assert.equal(d.layer.classList.contains('bf36-layer'),false);
  assert.equal(d.shell.querySelector('.bf18-control-surface'),null);
  assert.equal(d.calls.ambienceStop,1);assert.equal(d.calls.audioStop,1);
 }
});
console.log('BROFORCE BF-52: 10 adversarial session/authority checks passed (fixture, not browser).');
`;
// Run in a fresh Node ESM process so the existing file's unexported fixture
// remains private and its original assertions are preserved, not altered.
try{
 const out=execFileSync(process.execPath,['--input-type=module','--eval',fixture+'\n'+extra],
  {cwd:root,encoding:'utf8',maxBuffer:2*1024*1024,timeout:60_000});
 process.stdout.write(out);
}catch(e){if(e.stdout)process.stdout.write(e.stdout);if(e.stderr)process.stderr.write(e.stderr);throw e;}
