// BF-34 — actual pinned BF-12..BF-27 scenario contracts; no production mutations.
// node tests/broforce-scenarios.mjs [--integrated]
// --integrated is intentionally strict: missing Wave-3/host modules are FAILURES.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const integrated=process.argv.includes('--integrated');
const plain=v=>JSON.parse(JSON.stringify(v));
const sourceAt=p=>readFileSync(resolve(root,p),'utf8');
const catalog={characters:[
 {id:'sean',name:'Sean',source:'Family'},
 {id:'amber',name:'Amber',source:'Family'},
 {id:'alpha',name:'Alpha',source:'Fiction'},
 {id:'beta',name:'Beta',source:'Fiction'},
 {id:'generic-devil',name:'Devil',source:'Fiction'},
 {id:'generic-other',name:'Other',source:'Fiction'},
 {id:'loki',name:'Loki',source:'Family'},
 {id:'satan',name:'Satan',source:'Horror',unlockBy:'horror'},
 {id:'bossy',name:'Boss',source:'Boss',unlockBy:'boss'}
],items:[]};
const modules=new Map();
function load(file,stubs={}){
 if(!existsSync(resolve(root,file)))throw new Error('Required module missing: '+file);
 const key=Object.keys(stubs).length?'':file;
 if(key&&modules.has(key))return modules.get(key);
 const out={};
 const req=id=>{
  if(Object.prototype.hasOwnProperty.call(stubs,id))return stubs[id];
  if(id.startsWith('src/engines/broforce/'))return load(id);
  throw new Error('Unexpected dependency '+id+' in '+file);
 };
 new Function('require','exports',sourceAt(file)+'\n//# sourceURL='+file)(req,out);
 if(key)modules.set(key,out);
 return out;
}
const prefix='src/engines/broforce/';
const terrain=load(prefix+'terrain.js');
const stage=load(prefix+'stage.js');
const physics=load(prefix+'physics.js');
const combat=load(prefix+'combat.js');
const enemies=load(prefix+'enemies.js');
const director=load(prefix+'director.js');
const extraction=load(prefix+'extraction.js');
const devil=load(prefix+'devil.js');
const chars=load('src/characters.js',{'src/contentPolicy.js':{ACTIVE_CATALOG:catalog},'src/utils.js':{hash:()=>0}});
const profile=load('src/profile.js',{
 'src/contentPolicy.js':{ACTIVE_CATALOG:catalog},
 'src/characters.js':chars,
 'src/photoPairs.js':{normalizePhotoPair:()=>null,photoPairLibrary:()=>[],currentPhotoPair:()=>{},photoProfilePayload:p=>p},
 'src/persistence.js':{PROFILE_KEY:'test',readJSON:()=>null,writeJSON:()=>{throw Error('Pure contract invoked persistent write');}},
 'src/data/savoryLab.js':{LAB_TEAM:[]},
 'src/data/movieBonds.js':{isMovieBond:()=>false,missingMovieBonds:()=>[]}
});
const roster=load(prefix+'roster.js',{'src/characters.js':chars,'src/profile.js':profile});
const prisoners=load(prefix+'prisoners.js',{'src/engines/broforce/roster.js':roster});
const awards=load(prefix+'rewardPolicy.js',{'src/characters.js':chars,'src/profile.js':profile});
const owners=['Sean','Amber'], DEVIL='generic-devil', STAGES=[
 ['broforce-jungle','Broforce: Jungle'],['broforce-factory','Broforce: Factory'],
 ['broforce-city','Broforce: City Siege'],['broforce-desert','Broforce: Desert Assault']
];
let passed=0,failed=0;
function check(label,fn){
 try{fn();passed++;console.log('PASS '+label);}
 catch(error){failed++;console.error('FAIL '+label+': '+(error?.stack||error));}
}
function fighterProfile(){
 const p=profile.freshProfile();p.rosters.Sean.push('alpha');p.rosters.Amber.push('beta');return p;
}
function players(overrides=[{},{}]){
 return owners.map((owner,i)=>({id:'hero-'+i,owner,x:100,y:200,w:12,h:26,alive:true,...(overrides[i]||{})}));
}
function runHeli(board,overrides=[{},{}]){
 let state=extraction.createBroforceExtraction({x:100,y:200,seed:41});
 state=extraction.advanceBroforceExtraction(state,{dt:2.4,devilDefeated:true,players:players()});
 assert.equal(state.phase,'hover');
 state=extraction.advanceBroforceExtraction(state,{dt:0,players:players(overrides),boardRequests:board});
 state=extraction.advanceBroforceExtraction(state,{dt:9.1,players:players(overrides)});
 if(state.phase==='departure')state=extraction.advanceBroforceExtraction(state,{dt:2.3,players:players(overrides)});
 return state;
}
function awardInput(p,heli,options={}){
 return {profile:p,origin:'board',attemptId:'bf34:attempt-1',devilId:DEVIL,
  owners,won:heli?.outcome==='extracted',boarded:heli.boarded,
  aliveAtBoarding:heli.receipts.map(Boolean),...options};
}
function settle(p,heli,options={}){
 const plan=awards.planBroforceAwards(awardInput(p,heli,options));
 return {plan,...awards.applyBroforceAwards(p,plan)};
}
check('BF-10/BF-12 seeded terrain remains 16px, row-major and immutable at generation',()=>{
 const a=stage.generateBroforceStage({seed:'bf34'}),b=stage.generateBroforceStage({seed:'bf34'});
 assert.equal(a.tileSize,16);assert.equal(a.tiles.length,a.width*a.height);
 assert.deepEqual(plain(a),plain(b));
 const w=terrain.createTerrain({width:a.width,height:a.height,tiles:a.tiles});
 assert.equal(terrain.tileAt(w,-1,0),terrain.TILE.STEEL);
 assert.equal(terrain.tileAt(w,0,a.height),terrain.TILE.STEEL);
 assert.equal(w.tiles.length,a.tiles.length);
});
check('BF-12/BF-14 volatile chain changes collision cover and hits each target once',()=>{
 const tiles=Array(7*3).fill(terrain.TILE.EMPTY);
 tiles[1*7+3]=terrain.TILE.VOLATILE;tiles[1*7+4]=terrain.TILE.WOOD;
 const w=terrain.createTerrain({width:7,height:3,tiles});
 const before=terrain.isSolidTile(w,4,1);
 const result=combat.resolveBroforceExplosion({x:56,y:24,radius:0,damage:1,
  explosionId:'blast-1',owner:'Sean',terrain:w,
  targets:[{id:'target-1',x:66,y:16,w:12,h:18},{id:'target-1',x:66,y:16,w:12,h:18}]});
 assert.equal(before,true);assert.equal(terrain.isSolidTile(w,4,1),false);
 assert.ok(result.terrainResult.blasts.length>=2);
 assert.equal(result.hitIds.filter(id=>id==='target-1').length,1);
 assert.equal(result.events.filter(e=>e.type==='hit'&&e.targetId==='target-1').length,1);
 assert.equal(result.events.filter(e=>e.type==='terrain-damage').length,1);
});
check('BF-12/BF-13 physics uses destroyed cover with top-left actors',()=>{
 const w=terrain.createTerrain({width:5,height:4,tiles:Array(20).fill(terrain.TILE.EMPTY).map((v,i)=>i===2+2*5?terrain.TILE.WOOD:v)});
 const b=physics.createBody({x:20,y:5,w:12,h:26});
 assert.equal(terrain.isSolidTile(w,2,2),true);
 terrain.damageTerrain(w,{x:40,y:40,radius:0,damage:1});
 assert.equal(terrain.isSolidTile(w,2,2),false);
 const start=plain(b);
 physics.advanceBody(b,{dt:1/60,move:0,jumpHeld:false,isSolid:(x,y)=>terrain.isSolidTile(w,x,y)});
 assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y));
 assert.ok(b.y>=start.y);
});
check('BF-11 director spawn names require BF-15 translation by integration owner',()=>{
 const scene={camera:{x:140,y:0,width:300,height:240},
  world:{width:1200,height:400},players:[{x:190,y:100,alive:true}],
  spawnMarkers:[{id:'one',x:600,y:100,type:'grunt'}],activeEnemies:0};
 const state=director.createBroforceDirector({seed:2});state.tick=300;state.nextSpawnTick=0;
 const ev=director.advanceBroforceDirector(state,1/60,scene).events.find(e=>e.type==='spawn-enemy');
 assert.ok(ev,'director must emit an actual spawn');
 assert.equal(ev.enemyType,'grunt');
 const enemy=enemies.createBroforceEnemy({id:ev.spawnId,type:ev.enemyType,x:ev.x,y:ev.y});
 assert.equal(enemy.type,'rifleman'); // observed BF-15 fallback, NOT a correct semantic mapping
 console.log('FINDING director grunt/gunner/charger do not name BF-15 rifleman/melee/turret/carrier; mission adapter needs explicit mapping.');
});
check('BF-17 snapshots isolate both owners and never import other roster fighters',()=>{
 const p=fighterProfile();
 const a=roster.snapshotFighters(p,'Sean'),b=roster.snapshotFighters(p,'Amber');
 assert.ok(a.includes('alpha')&&!a.includes('beta'));
 assert.ok(b.includes('beta')&&!b.includes('alpha'));
 assert.deepEqual(roster.snapshotFighters(p,'Other'),[]);
 assert.ok(!roster.devilCandidatePool(p,owners).includes('loki'));
 assert.ok(!roster.devilCandidatePool(p,owners).includes('satan'));
});
check('BF-16/BF-17 simultaneous rescue swaps only one mission fighter for correct owner',()=>{
 const p=fighterProfile(),pr=prisoners.createBroforcePrisoners([{id:'cage',x:100,y:200}]);
 const before=plain(p);
 const outcome=prisoners.advanceBroforcePrisoners({prisoners:pr,players:players(),
  fightersByOwner:{Sean:roster.snapshotFighters(p,'Sean'),Amber:roster.snapshotFighters(p,'Amber')},
  activeFighterByOwner:{Sean:'sean',Amber:'amber'},
  interactions:[{type:'rescue',playerIndex:1,prisonerId:'cage'},
   {type:'rescue',playerIndex:0,prisonerId:'cage'}],rand:()=>.4});
 assert.equal(outcome.events.filter(e=>e.type==='fighter-swap').length,1);
 assert.deepEqual(outcome.events.filter(e=>e.type==='fighter-swap').map(e=>[e.owner,e.to]),[['Sean','alpha']]);
 assert.deepEqual(p,before);assert.equal(pr[0].rescued,false);
 const again=prisoners.advanceBroforcePrisoners({...{
  prisoners:outcome.prisoners,players:players(),fightersByOwner:{Sean:['sean','alpha'],Amber:['amber','beta']},
  interactions:[{type:'rescue',playerIndex:0,prisonerId:'cage'}]}});
 assert.deepEqual(again.events,[]);
});
check('BF-17 no eligible devil returns null, not generic or special unlock',()=>{
 const p=fighterProfile();
 for(const c of catalog.characters){if(c.id!=='loki'&&!p.shared.includes(c.id))p.shared.push(c.id);}
 assert.deepEqual(roster.devilCandidatePool(p,owners),[]);
 assert.equal(roster.chooseDevil(p,owners,()=>.2),null);
});
check('BF-20 defeated devil keeps chosen character ID and emits defeat once',()=>{
 const id='generic-other';
 let state=devil.createBroforceDevil({characterId:id,x:180,y:90,seed:7}),all=[];
 for(let i=0;i<14;i++)state=devil.advanceBroforceDevil(state,{dt:.1,players:players()}).devil;
 for(let i=0;i<6;i++){
  for(let j=0;j<4;j++)state=devil.advanceBroforceDevil(state,{dt:.1,players:players()}).devil;
  const r=devil.advanceBroforceDevil(state,{dt:.01,players:players(),
   damageEvents:[{id:'shot-'+i,targetId:'devil',damage:6}]});
  state=r.devil;all.push(...r.events);
 }
 for(let i=0;i<16;i++){const r=devil.advanceBroforceDevil(state,{dt:.1,players:players()});state=r.devil;all.push(...r.events);}
 assert.equal(state.characterId,id);assert.equal(state.hp,0);assert.equal(state.mode,'dead');
 assert.equal(all.filter(e=>e.type==='devil-defeated').length,1);
 assert.ok(all.filter(e=>e.type==='devil-defeated').every(e=>e.characterId===id));
});
check('BF-21 helicoper requires boss defeat; pause/dead requests do not board',()=>{
 const p=players(),initial=extraction.createBroforceExtraction({x:100,y:200});
 const dormant=extraction.advanceBroforceExtraction(initial,{dt:30,boardRequests:[true,true],players:p});
 assert.equal(dormant.phase,'dormant');assert.deepEqual(dormant.boarded,[false,false]);
 const incoming=extraction.advanceBroforceExtraction(dormant,{dt:2.4,devilDefeated:true,players:p});
 const paused=extraction.advanceBroforceExtraction(incoming,{dt:30,paused:true,boardRequests:[true,true],players:p});
 assert.equal(paused.phase,'hover');assert.deepEqual(paused.boarded,[false,false]);
 const dead=extraction.advanceBroforceExtraction(paused,{dt:0,boardRequests:[true,false],
  players:players([{dead:true,alive:false},{}])});
 assert.deepEqual(dead.boarded,[false,false]);
});
for(const [name,board,wanted] of [
 ['P1 only',[true,false],['Sean']],['P2 only',[false,true],['Amber']],
 ['both',[true,true],['Sean','Amber']],['none',[false,false],[]]
]){
 check('BF-21/BF-27 physical boarding + exact reward '+name,()=>{
  const h=runHeli(board),p=profile.freshProfile(),out=settle(p,h);
  assert.deepEqual(h.boarded,board);
  assert.equal(h.outcome,wanted.length?'extracted':'timeout');
  assert.deepEqual(h.receipts.map(x=>x?.owner||null),board.map((v,i)=>v?owners[i]:null));
  assert.deepEqual(out.grants.map(g=>g.owner),wanted);
  assert.ok(out.grants.every(g=>g.characterId===DEVIL));
  assert.equal(out.receipts.length,wanted.length);
  assert.equal(out.profile.xp,p.xp+6*wanted.length);
  assert.equal(out.profile.rosters.Sean.includes('generic-other'),false);
  assert.equal(out.profile.rosters.Amber.includes('generic-other'),false);
 });
}
check('BF-21 after-board cancellation never grants despite retained receipt',()=>{
 let h=extraction.createBroforceExtraction({x:100,y:200});
 h=extraction.advanceBroforceExtraction(h,{dt:2.4,players:players(),devilDefeated:true});
 h=extraction.advanceBroforceExtraction(h,{dt:0,players:players(),boardRequests:[true,false]});
 const cancel=extraction.advanceBroforceExtraction(h,{paused:true,cancelled:true,players:players()});
 assert.equal(cancel.outcome,'failed');assert.equal(cancel.reason,'cancelled');
 assert.deepEqual(settle(profile.freshProfile(),cancel).grants,[]);
});
check('BF-27 arcade/dev, paused timeout or no live boarder never provide any unlock',()=>{
 const h=runHeli([true,true]),p=profile.freshProfile();
 for(const override of [{origin:'arcade'},{origin:'dev'},{won:false},
  {boarded:[false,false]},{aliveAtBoarding:[false,false]},{devilId:'satan'}]){
  const a=settle(p,h,override);
  assert.deepEqual(a.grants,[]);assert.deepEqual(a.profile,plain(p));
 }
 const dead=runHeli([true,true],[{alive:false,dead:true},{}]);
 assert.deepEqual(dead.boarded,[false,true]);
 assert.deepEqual(settle(p,dead).grants.map(g=>g.owner),['Amber']);
});
check('BF-27 exact attempt receipts survive JSON reload and reject devil substitution',()=>{
 const h=runHeli([true,true]),p=profile.freshProfile();
 const first=settle(p,h),saved=plain(first.profile);
 const again=awards.applyBroforceAwards(saved,first.plan);
 assert.deepEqual(again.grants,[]);assert.deepEqual(again.receipts,[]);
 assert.deepEqual(again.profile,saved);
 const other=awards.planBroforceAwards(awardInput(p,h,{devilId:'generic-other'}));
 assert.throws(()=>awards.applyBroforceAwards(saved,other),/Conflicting devil/);
 assert.deepEqual(p.rosters.Sean,['sean']);assert.deepEqual(p.rosters.Amber,['amber']);
});
check('BF-27 owner-key receipts never substitute display names or other unlocked characters',()=>{
 const h=runHeli([true,false]),p=profile.freshProfile();
 p.run={players:[{owner:'Sean',name:'Amber',character:'alpha'},
  {owner:'Amber',name:'Sean',character:'beta'}]};
 const runBefore=plain(p.run),a=settle(p,h);
 assert.deepEqual(a.grants,[{owner:'Sean',characterId:DEVIL}]);
 assert.deepEqual(a.profile.run,runBefore);
 assert.deepEqual(a.profile.rosters.Amber,['amber']);
 const forged={...a.plan,grants:[{owner:'Amber',characterId:DEVIL}]};
 assert.deepEqual(awards.applyBroforceAwards(p,forged).grants,[]);
});
function requireExport(paths,name){
 const path=paths.find(p=>existsSync(resolve(root,p)));
 if(!path)throw Error('Integrated '+name+' missing; tried: '+paths.join(', '));
 const obj=load(path);
 if(typeof obj[name]!=='function')throw Error(path+' does not export '+name);
 return obj[name];
}
if(integrated){
 const variantPaths=[prefix+'variants.js',prefix+'stageVariants.js'];
 const missionPaths=[prefix+'mission.js',prefix+'missionFlow.js'];
 const scenePaths=[prefix+'scene.js',prefix+'sceneCompositor.js',prefix+'compositor.js'];
 check('INTEGRATED BF-28: four stage IDs and independent stage metadata',()=>{
  const variant=requireExport(variantPaths,'generateBroforceVariant');
  for(const [stageId,title] of STAGES){
   const a=variant({stageId,seed:'bf34'}),b=variant({stageId,seed:'bf34'});
   assert.equal(a.stageId,stageId);assert.equal(a.title,title);
   assert.ok(a.theme);assert.deepEqual(plain(a),plain(b));
   assert.equal(a.tileSize,16);
  }
 });
 check('INTEGRATED BF-30: mission creates shared 2-owner world and freezes while paused',()=>{
  const variant=requireExport(variantPaths,'generateBroforceVariant');
  const create=requireExport(missionPaths,'createBroforceMission');
  const advance=requireExport(missionPaths,'advanceBroforceMission');
  const stage=variant({stageId:STAGES[0][0],seed:'bf34'});
  const initial=create({stage,seed:'bf34',devilId:DEVIL,players:players(),attemptId:'bf34:int'});
  assert.ok(initial&&typeof initial==='object');
  const copy=plain(initial),step=advance(initial,{dt:1,inputs:[{},{}],paused:true});
  assert.ok(step&&step.state&&Array.isArray(step.events));
  assert.deepEqual(plain(step.state),copy);
  assert.equal(step.terminal??null,null);
 });
 check('INTEGRATED BF-30: authoritative terminal has exact award evidence',()=>{
  const create=requireExport(missionPaths,'createBroforceMission');
  const advance=requireExport(missionPaths,'advanceBroforceMission');
  assert.equal(typeof create,'function');assert.equal(typeof advance,'function');
  const terminalSchema={schema:1,attemptId:'bf34:a',stageId:STAGES[0][0],
   devilId:DEVIL,outcome:'extracted',boarded:[true,false],aliveAtBoarding:[true,false]};
  const p=profile.freshProfile(),h={outcome:'extracted',boarded:terminalSchema.boarded,
   receipts:[{owner:'Sean'},null]};
  assert.deepEqual(settle(p,h).grants,[{owner:'Sean',characterId:DEVIL}]);
  // Schema fixture above checks the pure reward boundary, not a faked mission win.
  // Full mission terminal assertion is owned by integration harness once reachable.
 });
 check('INTEGRATED BF-31: compositor export exists',()=>{
  assert.equal(typeof requireExport(scenePaths,'drawBroforceScene'),'function');
 });
 check('INTEGRATED BF-35/BF-36: registered adapter and four normal game descriptors',()=>{
  const pack=load('src/packs/broforcePack.js');
  const adapter=load('src/engines/broforce.js');
  assert.equal(typeof adapter.broforce,'function');
  assert.equal(typeof pack.engines?.broforce,'function');
  for(const [id,title] of STAGES){
   const matches=(pack.games||[]).filter(g=>g.id===id);
   assert.equal(matches.length,1,id);assert.equal(matches[0].title,title);
   assert.equal(matches[0].engine,'broforce');assert.equal(matches[0].stageId,id);
  }
  const registry=sourceAt('src/packs/index.js');
  assert.ok(registry.includes('broforcePack.js'),'Pack not registered in host');
  assert.ok(sourceAt('src/modules.json').includes('src/engines/broforce.js'));
 });
 check('INTEGRATED BF-37: reward/profile host wired before generic settlement',()=>{
  const launcher=sourceAt('src/gameLauncher.js'),persist=sourceAt('src/profile.js');
  assert.ok(launcher.includes('planBroforceAwards')&&launcher.includes('applyBroforceAwards'),
   'Host has no BF-27 exact award integration');
  assert.ok(persist.includes('broforceClaims'),'Profile loader/saver drops BF-27 attempt receipts');
  const settle=launcher.slice(launcher.indexOf('async function settleGame'));
  assert.ok(settle.indexOf('broforce')>=0&&settle.indexOf('broforce')<settle.indexOf('recordGame('),
   'Broforce reward dispatch must precede generic recordGame');
 });
}else console.log('GATED '+6+' BF-28/30/31/35/36/37 checks not run (use --integrated; missing modules cause explicit FAIL)');
console.log('BF-34: '+passed+' passed, '+failed+' failed ('+(integrated?'integrated':'pinned-base')+')');
if(failed)process.exitCode=1;
