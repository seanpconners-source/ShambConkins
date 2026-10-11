// BF-37: real launcher/profile/persistence/BF-27/BF-17/BF-21, mocked DOM host.
// No future mission module or game registration is installed by this fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const catalog={characters:[
 {id:'sean',name:'Sean',source:'Family'},{id:'amber',name:'Amber',source:'Family'},
 {id:'rambo',name:'John Rambo',source:'Rambo'},{id:'john-rambo',name:'John Rambo',source:'Rambo'},
 {id:'other-devil',name:'Other Devil',source:'Original'},
 {id:'bond-a',name:'First Bond',source:'Bond'},{id:'bond-b',name:'Second Bond',source:'Bond'},
 {id:'satan',name:'Satan',source:'Horror',unlockBy:'horror'}
],items:[]};
function load(file,deps){const out={};new Function('require','exports',source(file))(id=>{assert.ok(Object.hasOwn(deps,id),'Unexpected dependency '+id+' in '+file);return deps[id];},out);return out;}
function runFixture(){return {version:20,phase:'board',turn:1,maxTurns:24,current:0,seed:123,history:[],gameHistory:[],cardsSeen:[],triviaSeen:[],
 board:{nodes:{start:{id:'start',next:['start'],realm:'mind',x:0,y:0,col:0,lane:0}},realms:{mind:{ids:['start'],start:'start',gate:'start'}}},
 players:['Sean','Amber'].map((owner,i)=>({name:'Same editable name',owner,character:i?'amber':'sean',node:'start',points:20,
 items:[],visited:[],cleared:[],boost:0,rewardBonus:3,shields:1,double:1,slow:0,large:0,cloak:0,antiSteal:0,rerolls:2,wins:0}))};}
function harness(initialDisk=new Map()){
 const disk=new Map(initialDisk),writes=[],snapshots=[],dialogs=[],calls={end:0,roll:0,arcade:0,progress:0,pool:0,unlock:0,engine:0};
 let fail=()=>false,dialog=()=> 'ok',intro='start';
 globalThis.localStorage={getItem:k=>disk.get(k)??null,setItem(k,raw){const value=JSON.parse(raw);writes.push({k,value:clone(value)});if(fail(k,value,writes.length))throw Error('Storage denied');disk.set(k,raw);snapshots.push(new Map(disk));},removeItem:k=>disk.delete(k)};
 const persistence=load('src/persistence.js',{'src/obstacles.js':{validObstacles:()=>true}});
 const utils={hash:()=>0,escapeHTML:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;'),pick:a=>a[0],runRandom:()=>0,seededRandom:()=>()=>0};
 const chars=load('src/characters.js',{'src/contentPolicy.js':{ACTIVE_CATALOG:catalog},'src/utils.js':utils});
 const photos=load('src/photoPairs.js',{'src/utils.js':utils});
 const profile=load('src/profile.js',{'src/contentPolicy.js':{ACTIVE_CATALOG:catalog},'src/characters.js':chars,'src/photoPairs.js':photos,
  'src/persistence.js':persistence,'src/data/savoryLab.js':{LAB_TEAM:[]},'src/data/movieBonds.js':{isMovieBond:id=>id.startsWith('bond-'),missingMovieBonds:()=>['bond-b']}});
 const rewards=load('src/engines/broforce/rewardPolicy.js',{'src/characters.js':chars,'src/profile.js':profile});
 const roster=load('src/engines/broforce/roster.js',{'src/characters.js':chars,'src/profile.js':profile});
 const extraction=load('src/engines/broforce/extraction.js',{});
 const store={profile:profile.loadProfile(),run:persistence.readJSON(persistence.RUN_KEY)||runFixture(),busy:false,session:null};
 const games=Object.fromEntries(persistence.BROFORCE_IDS.map(id=>[id,{id,stageId:id,engine:'broforce',title:id,source:'Original action',duration:'90 seconds',rules:'Escape',reward:10}]));
 games.normal={id:'normal',engine:'normal',title:'Normal',source:'Original',duration:'60 seconds',rules:'Win',reward:10};
 class Session{
  constructor(game,players,onFinish){Object.assign(this,{game,players,onFinish,alive:true,finished:false,paused:false});}
  updateScores(){} dispose(){this.alive=false;}
  finish(scores=[10,10],label='Source result <label>'){if(!this.alive)return;this.finished=true;this.dispose();this.onFinish(scores,label);}
 }
 const deps={
  'src/state.js':{store,newPlayer:(_,__,i)=>runFixture().players[i],logRun:()=>{}},
  'src/gameRegistry.js':{gameById:id=>games[id],selectGame:()=>games.normal,selectBoardGame:()=>games.normal,PHONE_TASK:{}},
  'src/levels.js':{levelFit:()=>0,levelInfo:()=>({}),humiliation:()=>''},'src/data/bosses.js':{bossById:()=>null},
  'src/engines/index.js':{ENGINES:{broforce:()=>{calls.engine++;},normal:()=>{calls.engine++;}}},
  'src/engines/session.js':{GameSession:Session},'src/roulette.js':{animateRoulette:async()=>true},
  'src/ui.js':{showDialog:async opts=>{dialogs.push(opts);return opts.choices?.some(c=>c.value==='start')?intro:dialog(opts);},closeDialog:()=>{},
   unlockDialog:async()=>{calls.unlock++;return true;},updateBoard:()=>{},toast:()=>{}},
  'src/assets.js':{gameArtHTML:()=>'',portraitHTML:id=>`<img data-id="${id}">`},
  'src/profile.js':profile,'src/persistence.js':persistence,'src/data/bondLair.js':{pickLairVillain:()=>null},'src/data/southPark.js':{pickSouthPark:()=>null},
  'src/characters.js':chars,'src/utils.js':utils,'src/audio.js':{sound:()=>{}},'src/items.js':{pointChange:()=>{}},
  'src/rewards.js':{gameRecruitPool:()=>{calls.pool++;return [];},gameHasGuaranteedRecruit:()=>false,recruitmentChance:()=>0,foodGame:()=>false},
  'src/pairs.js':{pairForRun:()=>null},'src/warpThemes.js':{warpTheme:()=>null,warpGameId:()=>null,warpAllowsGame:()=>true},
  'src/progression.js':{updateProgression:()=>{calls.progress++;return [];}},
  'src/engines/trivia.js':{drawTriviaDifficulty:()=>'',chooseTriviaDifficulty:()=>'',TRIVIA_LEVELS:[]},
  'src/engines/broforce/rewardPolicy.js':rewards,'src/engines/broforce/roster.js':roster
 };
 const launcher=load('src/gameLauncher.js',deps);
 launcher.configureLauncher({save(){persistence.writeJSON(persistence.RUN_KEY,store.run);profile.saveProfile(store.profile);},
  endTurn(){calls.end++;store.busy=false;},beforeRoll(){calls.roll++;store.busy=false;},arcade(){calls.arcade++;store.busy=false;}});
 async function start(options={}){await launcher.requestGame({id:'broforce-jungle',...options});return store.session;}
 function proof(boarded=[true,true]){
  let e=extraction.createBroforceExtraction({x:0,y:0});
  const players=store.run.players.map((p,i)=>({owner:p.owner,id:'P'+(i+1),x:0,y:0,alive:true}));
  e=extraction.advanceBroforceExtraction(e,{dt:2.4,devilDefeated:true,players,boardRequests:boarded});
  e=extraction.advanceBroforceExtraction(e,{dt:12,devilDefeated:true,players});return e;
 }
 async function finish(session,boarded=[true,true],opts={}){
  const a=session.broforceReward?.attempt||{attemptId:'practice',stageId:session.game.id,devilId:'rambo'};
  const e=proof(boarded),bf={schema:1,attemptId:a.attemptId,stageId:a.stageId,devilId:a.devilId,
   outcome:boarded.some(Boolean)?'extracted':'failed',boarded:[...boarded],aliveAtBoarding:[...boarded],...opts.bf};
  if(opts.confirm!==false&&session.broforceReward)session.broforceReward.confirmExtraction({devilId:a.devilId,devilDefeated:true,extraction:e});
  session.teamResult={kind:'broforce',won:bf.outcome==='extracted',bf,...opts.coop};session.finish();await tick();return store.run.pending;
 }
 return {disk,writes,snapshots,dialogs,calls,store,games,profile,photos,persistence,chars,launcher,start,proof,finish,setFail:f=>fail=f,setDialog:f=>dialog=f,setIntro:value=>intro=value};
}
let count=0;
async function check(name,fn){await fn();count++;console.log('PASS '+name);}
for(const boarded of [[true,false],[false,true],[true,true],[false,false]])await check('exact owner receipts '+boarded,async()=>{
 const h=harness(),before=clone(h.store.run.players),s=await h.start(),p=await h.finish(s,boarded);
 assert.deepEqual(h.store.run.players,before);assert.deepEqual(p.rewards,[0,0]);assert.equal(h.store.profile.xp,6*boarded.filter(Boolean).length);
 for(let i=0;i<2;i++)assert.equal(h.store.profile.rosters[i?'Amber':'Sean'].includes('rambo'),boarded[i]);
 assert.deepEqual(h.store.profile.shared,['sean','amber']);assert.equal(h.calls.progress,0);assert.equal(h.calls.pool,0);assert.equal(h.calls.unlock,0);assert.equal(h.calls.end,1);
 assert.ok(h.persistence.validRun(h.store.run));assert.equal(h.profile.loadProfile().xp,h.store.profile.xp);
 const html=h.dialogs.at(-1).html;assert.match(html,/Source result &lt;label>/);assert.equal(html.includes('Sean’s roster'),boarded[0]);assert.equal(html.includes('Amber’s roster'),boarded[1]);
});
await check('all four registered games and stable launch identities',async()=>{
 for(const id of ['broforce-jungle','broforce-factory','broforce-city','broforce-desert']){
  const h=harness(),s=await h.start({id});assert.equal(s.broforceReward.attempt.stageId,id);assert.ok(Object.isFrozen(s.broforceReward.attempt));
  assert.deepEqual(s.broforceReward.attempt.fighterIds,['sean','amber']);await h.finish(s,[false,true]);assert.equal(h.store.profile.xp,6);
 }
});
await check('arcade and dev never write profile or run',async()=>{
 for(const origin of ['arcade','dev']){const h=harness(),before=clone(h.store.profile),run=clone(h.store.run),s=await h.start({origin});await h.finish(s);
  assert.deepEqual(h.store.profile,before);assert.deepEqual(h.store.run,run);assert.equal(h.writes.length,0);assert.equal(h.calls.arcade,1);assert.match(h.dialogs.at(-1).html,/No XP/);}
});
await check('terminal metadata alone, wrong stage/attempt/devil and cross-owner evidence cannot award',async()=>{
 for(const opts of [{confirm:false},{bf:{stageId:'broforce-city'}},{bf:{attemptId:'forged'}},{bf:{devilId:'other-devil'}},{bf:{devilId:'satan'}},{bf:{aliveAtBoarding:[false,true]}},{coop:{kind:'survival',won:true}}]){
  const h=harness(),s=await h.start();await h.finish(s,[true,true],opts);assert.equal(h.store.profile.xp,0);assert.equal(h.calls.pool,0);assert.equal(h.calls.progress,0);
 }
 const h=harness(),s=await h.start(),e=h.proof([true,false]);e.receipts[0].owner='Amber';assert.equal(s.broforceReward.confirmExtraction({devilId:'rambo',devilDefeated:true,extraction:e}),false);
 await h.finish(s,[true,false],{confirm:false});assert.equal(h.store.profile.xp,0);
});
await check('extra envelope fields cannot redirect owners or origin',async()=>{
 const h=harness(),s=await h.start();await h.finish(s,[true,false],{bf:{owners:['Amber','Sean'],origin:'arcade',won:true}});
 assert.deepEqual(h.store.profile.rosters.Amber,['amber']);assert.equal(h.store.profile.xp,6);
});
await check('no devil death only, late, paused or dead boarding confirmation',async()=>{
 for(const change of [e=>e.phase='hover',e=>e.receipts[0].boardedAt=11.4,e=>e.receipts[0].playerIndex=1,e=>e.outcome='failed']){
  const h=harness(),s=await h.start(),e=h.proof([true,false]);change(e);assert.equal(s.broforceReward.confirmExtraction({devilId:'rambo',devilDefeated:true,extraction:e}),false);
  await h.finish(s,[true,false],{confirm:false});assert.equal(h.store.profile.xp,0);
 }
 const h=harness(),s=await h.start();s.paused=true;assert.equal(s.broforceReward.confirmExtraction({devilId:'rambo',devilDefeated:true,extraction:h.proof()}),false);
});
await check('failed and timeout results grant nothing',async()=>{
 for(const outcome of ['failed','timeout']){const h=harness(),s=await h.start();await h.finish(s,[true,true],{bf:{outcome}});assert.equal(h.store.profile.xp,0);assert.equal(h.calls.end,1);}
});
await check('duplicate finish and repeated result dialog are idempotent',async()=>{
 const h=harness(),s=await h.start(),p=await h.finish(s,[false,true]),writes=h.writes.length;
 s.onFinish([999,999],'forged repeat');await tick();assert.equal(h.writes.length,writes);assert.equal(h.calls.end,1);
 for(let i=0;i<3;i++)await h.launcher.presentResult(p);assert.equal(h.store.profile.xp,6);assert.equal(Object.keys(h.store.profile.broforceClaims).length,1);
});
await check('concurrent result replay shares one dialog and transaction',async()=>{
 const h=harness(),s=await h.start();let release;h.setDialog(()=>new Promise(resolve=>release=resolve));
 const p=await h.finish(s),writes=h.writes.length,dialogs=h.dialogs.length;
 const replay=h.launcher.presentResult(p);assert.equal(h.writes.length,writes);assert.equal(h.dialogs.length,dialogs);release('ok');await replay;await tick();assert.equal(h.calls.end,1);assert.equal(h.store.profile.xp,12);
});
await check('same attempt different devil collision fails closed even with no new grants',async()=>{
 const h=harness(),s=await h.start(),a=s.broforceReward.attempt;
 h.store.profile.broforceClaims={['bf27:'+JSON.stringify([a.attemptId,'Sean'])]:{attemptId:a.attemptId,owner:'Sean',devilId:'other-devil'}};
 await h.finish(s);assert.equal(h.store.profile.xp,0);assert.match(h.dialogs.at(-1).html,/could not be verified/);
});
await check('newly owned, alias and shared identities skip exact awards without substitution',async()=>{
 for(const owner of ['Sean','Amber','shared']){const h=harness(),s=await h.start();(owner==='shared'?h.store.profile.shared:h.store.profile.rosters[owner]).push('john-rambo');
  await h.finish(s);assert.equal(h.store.profile.xp,owner==='shared'?0:6);assert.equal(h.store.profile.rosters[owner==='Sean'?'Amber':'Sean'].includes('rambo'),owner!=='shared');}
});
await check('exact Bond and earnedUnlocks are preserved',async()=>{
 const h=harness();h.store.profile.shared.push('rambo','other-devil');const s=await h.start();assert.equal(s.broforceReward.attempt.devilId,'bond-a');
 h.store.profile.earnedUnlocks['bond-a']='legacy';await h.finish(s,[true,false]);assert.ok(h.store.profile.rosters.Sean.includes('bond-a'));assert.ok(!h.store.profile.rosters.Sean.includes('bond-b'));assert.equal(h.store.profile.earnedUnlocks['bond-a'],'legacy');
});
await check('storage denial at attempt prevents engine launch and any reward',async()=>{
 const h=harness();h.setFail(()=>true);assert.equal(await h.start(),null);assert.equal(h.calls.engine,0);assert.equal(h.store.profile.xp,0);assert.equal(h.disk.size,0);
});
await check('intent write denial never writes profile; retry commits once',async()=>{
 const h=harness(),s=await h.start();h.setFail((k,v)=>k===h.persistence.RUN_KEY&&v.phase==='result');h.setDialog(()=>null);
 await h.finish(s);assert.equal(h.store.profile.xp,0);assert.equal(h.calls.end,0);assert.ok(!h.writes.some(w=>w.k===h.persistence.PROFILE_KEY));
 h.setFail(()=>false);h.setDialog(()=> 'ok');await h.launcher.presentResult(h.store.run.pending);assert.equal(h.store.profile.xp,12);
});
await check('profile write denial leaves persisted intent, no volatile award or saved claim',async()=>{
 const h=harness(),s=await h.start();h.setFail(k=>k===h.persistence.PROFILE_KEY);h.setDialog(()=>null);await h.finish(s);
 assert.equal(h.store.profile.xp,0);assert.equal(h.profile.loadProfile().xp,0);assert.equal(h.calls.end,0);assert.ok(JSON.parse(h.disk.get(h.persistence.RUN_KEY)).pending.bfIntent);
 const reboot=harness(h.disk);await reboot.launcher.presentResult(reboot.store.run.pending);assert.equal(reboot.store.profile.xp,12);
});
await check('crash before/after every persisted phase recovers or restarts the same attempt',async()=>{
 const h=harness(),s=await h.start(),a=clone(s.broforceReward.attempt);await h.finish(s,[false,true]);
 assert.equal(h.snapshots.length,4); // attempt -> intent -> atomic profile -> acknowledgement
 for(let index=0;index<=h.snapshots.length;index++){
  const reboot=harness(index?h.snapshots[index-1]:new Map());
  if(reboot.store.run.phase==='result')await reboot.launcher.presentResult(reboot.store.run.pending);
  else {const again=await reboot.start({resume:index>0});if(index>0)assert.deepEqual(again.broforceReward.attempt,a);await reboot.finish(again,[false,true]);}
  assert.equal(reboot.store.profile.xp,6,'checkpoint '+index);assert.equal(Object.keys(reboot.store.profile.broforceClaims).length,1);
  assert.equal(reboot.store.profile.rosters.Sean.includes('rambo'),false);assert.ok(reboot.store.profile.rosters.Amber.includes('rambo'));
 }
});
await check('acknowledgement denial still reports the durable profile truth',async()=>{
 const h=harness(),s=await h.start();h.setFail((k,v)=>k===h.persistence.RUN_KEY&&v.pending?.bfCommitted===true);await h.finish(s,[true,false]);
 assert.equal(h.profile.loadProfile().xp,6);assert.match(h.dialogs.at(-1).html,/Sean’s roster/);const reboot=harness(h.disk);await reboot.launcher.presentResult(reboot.store.run.pending);assert.equal(reboot.store.profile.xp,6);
});
await check('abort/resume retains identity and stale callback cannot settle',async()=>{
 const h=harness(),s=await h.start(),a=clone(s.broforceReward.attempt);h.launcher.cancelGameLaunch();s.dispose();h.store.session=null;
 s.finished=true;s.onFinish([1,1],'late');await tick();assert.equal(h.store.profile.xp,0);
 const resumed=await h.start({resume:true});assert.deepEqual(resumed.broforceReward.attempt,a);await h.finish(resumed,[true,false]);assert.equal(h.store.profile.xp,6);
});
await check('explicit exit and keep-playing preserve normal lifecycle',async()=>{
 const h=harness(),s=await h.start();h.setDialog(()=> 'stay');await h.launcher.exitGame();assert.equal(s.paused,false);assert.equal(h.store.session,s);
 h.setDialog(()=> 'exit');await h.launcher.exitGame();assert.equal(h.store.session,null);assert.equal(h.calls.end,1);s.finished=true;s.onFinish([1,1],'late');await tick();assert.equal(h.store.profile.xp,0);
});
await check('return-to-roll does not consume a board turn',async()=>{
 const h=harness(),s=await h.start({returnToRoll:true});await h.finish(s);assert.equal(h.calls.roll,1);assert.equal(h.calls.end,0);
});
await check('intro cancel, dismissal and no eligible devil do not award',async()=>{
 for(const choice of ['cancel',null]){const h=harness();h.setIntro(choice);assert.equal(await h.start(),null);assert.equal(h.calls.engine,0);assert.equal(h.store.profile.xp,0);assert.equal(h.calls.end,choice==='cancel'?1:0);}
 const h=harness();h.store.profile.shared.push(...catalog.characters.map(c=>c.id),'gordon-ramsay');const s=await h.start();assert.equal(s.broforceReward.attempt.devilId,null);await h.finish(s,[false,false]);assert.equal(h.store.profile.xp,0);
});
await check('actual continueRun result caller recovers without shared recruitment or duplicate turn',async()=>{
 const h=harness(),s=await h.start();await h.finish(s,[false,true]);
 const reboot=harness(h.snapshots[1]); // persisted intent, before profile commit
 const app=source('src/app.js'),body=app.slice(app.indexOf('async function continueRun()'),app.indexOf('\nasync function roll('));
 let turn=0,unlock=0;
 const deps={store:reboot.store,focusBoardAction:()=>{},updateBoard:()=>{},setMusicZone:()=>{},startMusic:()=>{},
  presentResult:reboot.launcher.presentResult,encounterActive:(run,pending)=>reboot.store.run===run&&run.pending===pending,
  unlockDialog:async ids=>{assert.deepEqual(ids,[]);unlock++;return true;},endTurn:()=>{turn++;},resumeItemTurn:()=>assert.fail('wrong turn policy')};
 const continueRun=new Function(...Object.keys(deps),'let movementToken=0;'+body+';return continueRun;')(...Object.values(deps));
 await continueRun();assert.equal(reboot.store.profile.xp,6);assert.equal(turn,1);assert.equal(unlock,1);assert.ok(reboot.dialogs.at(-1).html.includes('Amber’s roster'));
});
await check('continueRun preserves pending Broforce result when recovery dialog is dismissed',async()=>{
 const h=harness(),s=await h.start();await h.finish(s,[false,true]);
 const reboot=harness(h.snapshots[1]); // durable result intent, before profile commit
 const run=reboot.store.run,pending=run.pending;
 assert.equal(run.phase,'result');
 const app=source('src/app.js'),body=app.slice(app.indexOf('async function continueRun()'),app.indexOf('\nasync function roll('));
 let turn=0,unlocks=0;
 const deps={store:reboot.store,focusBoardAction:()=>{},updateBoard:()=>{},setMusicZone:()=>{},startMusic:()=>{},
  presentResult:async()=>null,encounterActive:(r,p)=>r===run&&r.pending===pending,
  unlockDialog:async()=>{unlocks++;return true;},endTurn:()=>{turn++;},resumeItemTurn:()=>{turn++;}};
 const continueRun=new Function(...Object.keys(deps),'let movementToken=0;'+body+';return continueRun;')(...Object.values(deps));
 await continueRun();
 assert.equal(turn,0);assert.equal(unlocks,0);assert.equal(run.phase,'result');
 assert.equal(run.pending,pending);assert.equal(reboot.store.profile.xp,0);
});
await check('photo selection, unrelated profile data and disabled progression survive atomic save',async()=>{
 const h=harness(),pair={id:'chosen',left:'data:image/png;base64,AA==',right:'data:image/png;base64,AA==',regions:[{x:.5,y:.5,r:.1}]};
 h.store.profile.photoHuntPairs=[pair];h.photos.currentPhotoPair(h.store.profile,pair);h.store.profile.wins={legacy:7};h.store.profile.recruitDryStreak={Sean:1,Amber:1};
 const s=await h.start();await h.finish(s,[true,false]);assert.equal(h.store.profile.photoHuntPair,pair);assert.deepEqual(h.store.profile.wins,{legacy:7});
 assert.deepEqual(h.store.profile.recruitDryStreak,{Sean:1,Amber:1});assert.equal(h.profile.loadProfile().photoHuntPair.id,'chosen');
});
await check('old v20 saves and optional receipt validation',async()=>{
 const h=harness();assert.equal(h.store.profile.version,20);assert.equal(h.store.profile.broforceClaims,undefined);assert.ok(h.persistence.validRun(h.store.run));
 const old=clone(h.store.profile);old.xp=31;h.profile.saveProfile(old);assert.equal(h.profile.loadProfile().xp,31);
 const s=await h.start();await h.finish(s);assert.equal(Object.keys(h.profile.loadProfile().broforceClaims).length,2);
 const bad=clone(h.store.profile);bad.broforceClaims={bad:{attemptId:'x',owner:'Amber',devilId:'rambo'}};
 assert.equal(h.profile.saveProfile(bad),false);h.persistence.writeJSON(h.persistence.PROFILE_KEY,bad);const loaded=h.profile.loadProfile();assert.equal(loaded.broforceClaimsBlocked,true);
 h.profile.saveProfile(loaded);assert.equal(h.profile.loadProfile().broforceClaimsBlocked,true);
});
await check('invalid optional run evidence rejects while old pending results remain loadable',async()=>{
 const h=harness(),s=await h.start();await h.finish(s);const run=clone(h.store.run);assert.ok(h.persistence.validRun(run));
 run.pending.bfIntent.evidence.receipts[0].owner='Amber';assert.equal(h.persistence.validRun(run),false);
 delete run.pending.bfAttempt;delete run.pending.bfIntent;assert.ok(h.persistence.validRun(run));
});
await check('old Broforce result does not mint claims from a terminal envelope',async()=>{
 const h=harness();h.store.run.phase='result';h.store.run.pending={kind:'result',origin:'board',gameId:'broforce-jungle',scores:[1,1],rewards:[0,0],coop:{kind:'broforce',won:true,bf:{outcome:'extracted',boarded:[true,true]}},unlocked:['other-devil']};
 await h.launcher.presentResult(h.store.run.pending);assert.equal(h.store.profile.xp,0);assert.deepEqual(h.store.run.pending.unlocked,[]);assert.equal(h.writes.length,0);
});
await check('legacy writeJSON fallback stays separate from durable transaction IO',async()=>{
 const h=harness();h.setFail(()=>true);assert.equal(h.persistence.writeJSON('ordinary',{value:1}),false);assert.deepEqual(h.persistence.readJSON('ordinary'),{value:1});
 assert.equal(h.persistence.readDurableJSON('ordinary'),null);assert.equal(h.persistence.writeDurableJSON('strict',{value:2}),false);assert.equal(h.persistence.readJSON('strict'),null);
});
await check('unregistered stage descriptor cannot launch',async()=>{
 const h=harness();h.games['broforce-jungle'].stageId='broforce-city';assert.equal(await h.start(),null);assert.equal(h.calls.engine,0);assert.equal(h.writes.length,0);
});
await check('ordinary board and arcade XP, points and wins are unchanged',async()=>{
 const h=harness(),s=await h.start({id:'normal'});s.finish([9,3],'normal result');await tick();assert.equal(h.store.profile.xp,5);assert.equal(h.store.profile.wins.normal,1);
 assert.equal(h.store.profile.minigames,1);assert.equal(h.store.run.players[0].points,43);assert.equal(h.store.run.players[1].points,25);assert.equal(h.calls.pool,1);assert.equal(h.calls.progress,1);assert.equal(h.calls.end,1);
 const arcade=harness(),a=await arcade.start({id:'normal',origin:'arcade'});a.finish([1,1]);await tick();assert.equal(arcade.store.profile.xp,3);assert.equal(arcade.store.run.players[0].points,20);
});
console.log(`BF-37: ${count}/${count} checks passed (real source with host/catalog fixtures; not integrated gameplay).`);
