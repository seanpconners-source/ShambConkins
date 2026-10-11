// BF-30 deterministic integration: EVERY BF subsystem is the actual source.
// Only non-BF content/IO boundaries use fixtures, matching BF-17's test harness.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root = path.resolve(import.meta.dirname, '..');
const entries = [
  ['sean','Sean','ShambConkins'],['amber','Amber','ShambConkins'],
  ['rambo','John Rambo','Rambo'],['john-rambo','John Rambo','Rambo'],
  ['michael','Michael Scott','The Office'],['michael-scott','Michael Scott','The Office'],
  ['terminator','Terminator','The Terminator'],['t-800','Terminator','The Terminator'],
  ['loki','Loki','ShambConkins'],['satan','Satan','Horror','horror']
];
const content = {ACTIVE_CATALOG:{characters:entries.map(([id,name,source,unlockBy]) => ({id,name,source,unlockBy})),items:[]}};
const fixtures = {
  'src/contentPolicy.js':content,
  'src/photoPairs.js':{normalizePhotoPair:()=>null,photoPairLibrary:()=>[],currentPhotoPair:()=>{},photoProfilePayload:p=>p},
  'src/persistence.js':{PROFILE_KEY:'test',readJSON:()=>null,writeJSON:()=>{throw Error('Mission must never save');}},
  'src/data/savoryLab.js':{LAB_TEAM:[]},
  'src/data/movieBonds.js':{isMovieBond:()=>false,missingMovieBonds:()=>[]}
};
const modules = new Map(), loaded = new Set();
function load(id) {
  if (Object.hasOwn(fixtures,id)) return fixtures[id];
  if (modules.has(id)) return modules.get(id);
  const file = path.join(root,id), exports = {};
  modules.set(id,exports); loaded.add(id);
  vm.runInThisContext('(function(require,exports){\n'+fs.readFileSync(file,'utf8')+'\n})',{filename:file})(load,exports);
  return exports;
}
const {createBroforceMission:create,advanceBroforceMission:advance} = load('src/engines/broforce/mission.js');
const roster = load('src/engines/broforce/roster.js');
const profiles = load('src/profile.js');
const {generateBroforceStage} = load('src/engines/broforce/stage.js');
const {createBroforceInputState} = load('src/engines/broforce/controls.js');
const {isSolidTile,TILE} = load('src/engines/broforce/terrain.js');
const {createBroforceEnemy} = load('src/engines/broforce/enemies.js');
const {createBroforceProjectile} = load('src/engines/broforce/combat.js');
const {planBroforceAwards} = load('src/engines/broforce/rewardPolicy.js');
const selected = ['sean','amber'];
const fresh = () => {
  const p = profiles.freshProfile(); p.shared=[];
  p.rosters={Sean:['sean','rambo','john-rambo'],Amber:['amber','michael','michael-scott']};
  return p;
};
function people(p=fresh()) {
  return ['Sean','Amber'].map((owner,i) => ({owner,name:'Same display name',character:selected[i],fighters:roster.snapshotFighters(p,owner)}));
}
function stage(overrides={}) {
  const width=96,height=16,tiles=new Uint8Array(width*height);
  for(let row=12;row<height;row++) for(let col=0;col<width;col++) tiles[row*width+col]=TILE.STEEL;
  return {stageId:'broforce-jungle',width,height,tileSize:16,tiles,
    spawns:[{x:32,y:166},{x:80,y:166}],enemySpawns:[],prisoners:[],
    devilSpawn:{x:1250,y:166},extraction:{x:1430,y:166},checkpoints:[],timeLimit:120,...overrides};
}
function mission(overrides={}) {
  const p=fresh();
  return create({stage:stage(),players:people(p),devilId:roster.chooseDevil(p,undefined,()=>0),seed:919,attemptId:'bf30:integration',...overrides});
}
const idle = [{},{ }];
function run(s,seconds,inputs=idle,fps=60) {
  const events=[]; let terminal=null;
  for(let i=0;i<Math.round(seconds*fps);i++) {
    const result=advance(s,{dt:1/fps,inputs:typeof inputs==='function'?inputs(i/fps):inputs});
    events.push(...result.events); if(result.terminal) terminal=result.terminal;
  }
  return {state:s,events,terminal};
}
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS BF-30 '+checks+': '+name);}
function relocate(s,i,x,y=166) {Object.assign(s.players[i],{x,y,vx:0,vy:0,onGround:true});}
// Hand-authored compatible boss arena, NOT a production skip: real bullets must
// traverse the map, damage real BF-20 HP and trigger real BF-21 phase clocks.
function arena() {
  const a=stage({spawns:[{x:210,y:166},{x:232,y:166}],devilSpawn:{x:300,y:166},extraction:{x:80,y:166},timeLimit:120});
  return mission({stage:a,players:people().map(p=>({...p,weapon:'shotgun'}))});
}
function defeat(s) {
  const events=[];
  for(let t=0;t<45*60&&!s.bossDefeated&&!s.terminal;t++) {
    const inputs=s.players.map(p=>{
      const d=s.devil;
      const incoming=d.projectiles.some(q=>Math.abs(q.x-(p.x+6))<85 && q.vx<0);
      const impactSoon=d.attack==='quake' && (d.mode==='attack'||d.mode==='windup'&&d.modeTimer<.15);
      const dive=d.attack==='dive' && (d.mode==='attack'||d.mode==='windup');
      let move=!dive && (p.x<210 || p.facing<0)?1:0;
      if(dive&&d.aim&&Math.abs(p.x+6-d.aim.x)<70) move=p.x<100?1:-1;
      return {fireHeld:true,move,jumpPressed:p.onGround&&(incoming||impactSoon),jumpHeld:incoming||impactSoon};
    });
    events.push(...advance(s,{inputs}).events);
  }
  return events;
}
check('construction shares exactly one terrain and preserves identities/source inputs',()=>{
  const authored=stage(),players=people(),before=structuredClone(players),tiles=authored.tiles.slice();
  const s=mission({stage:authored,players});
  assert.equal(s.stage.tiles,s.terrain.tiles);
  assert.notEqual(s.terrain.tiles,authored.tiles);
  assert.deepEqual(s.players.map(p=>[p.id,p.owner,p.fighterId,p.w,p.h]),[
    ['P1','Sean','sean',12,26],['P2','Amber','amber',12,26]]);
  assert.throws(()=>{s.players[0].selectedCharacter='rambo';},TypeError);
  assert.throws(()=>{s.players[1].character='michael';},TypeError);
  run(s,1,[{move:1,fireHeld:true},{}]);
  assert.deepEqual(players,before); assert.deepEqual(authored.tiles,tiles);
  assert.equal(s.extraction.phase,'dormant'); assert.equal(s.terminal,null);
});
check('actual BF-18 controls are independent, including 120Hz pressed-edge carry',()=>{
  const s=mission(),input=createBroforceInputState();
  input.setMove(0,'P1-finger',1); input.press(1,'jump','P2-finger');
  advance(s,{dt:1/240,inputs:input.sample()});
  assert.equal(s.tick,0);
  advance(s,{dt:1/240,inputs:input.sample()});
  assert(s.players[1].vy<0); assert(s.players[0].vx>0); assert.equal(s.players[0].vy,0);
  assert.equal(s.players[1].vx,0);
  input.release(1,'jump','P2-finger'); input.press(0,'fire','P1-trigger');
  const result=advance(s,{inputs:input.sample()});
  assert(result.events.some(e=>e.type==='shot'&&e.owner==='P1'));
  assert(!result.events.some(e=>e.type==='shot'&&e.owner==='P2'));
});
check('real BF-14 grenade explosion destroys BF-12 cover and opens BF-13 movement gap',()=>{
  const a=stage(); for(let row=8;row<12;row++)a.tiles[row*a.width+12]=TILE.WOOD;
  const s=mission({stage:a}); relocate(s,0,165);relocate(s,1,80);
  run(s,.4,[{move:1},{}]); const blocked=s.players[0].x;
  assert(blocked<=180.001); assert(isSolidTile(s.terrain,12,10));
  const events=run(s,2,(t)=>[{specialPressed:t===0},{}]).events;
  assert(events.some(e=>e.type==='explosion'));
  assert(events.some(e=>e.type==='world-destruction'&&e.destroyed.some(t=>t.col===12)));
  assert(!isSolidTile(s.terrain,12,10));
  run(s,.65,[{move:1},{}]);assert(s.players[0].x>210);
  assert(s.stats.tilesDestroyed>0); assert.equal(s.stage.tiles,s.terrain.tiles);
});
check('owner-roster prisoner rescues: multi-owner, aliases, singleton, empty, duplicates',()=>{
  const a=stage({prisoners:[{id:'p1-cage',x:32,y:166},{id:'p2-cage',x:90,y:166}]});
  const players=people(),before=structuredClone(players),s=mission({stage:a,players});
  const e=advance(s).events;
  assert.equal(s.players[0].fighterId,'rambo');assert.equal(s.players[1].fighterId,'michael');
  assert.deepEqual(s.stats.rescues,[1,1]);assert.equal(e.filter(e=>e.type==='fighter-swap').length,2);
  assert.deepEqual(advance(s).events.filter(e=>e.type==='fighter-swap'),[]);
  assert.deepEqual(players,before);assert.deepEqual(s.players.map(p=>p.selectedCharacter),selected);
  for(const fighters of [['sean'],[]]) {
    const m=mission({stage:a,players:[{character:'sean',fighters},{character:'amber',fighters:['amber']}]});
    advance(m);assert.equal(m.players[0].fighterId,'sean');assert.equal(m.stats.rescues[0],1);
    assert.equal(m.players[0].selectedCharacter,'sean');
  }
  const far=mission({stage:stage({prisoners:[{id:'far',x:600,y:166}]})});
  run(far,1);assert(!far.prisoners[0].rescued);
});
check('physical player bullet frees remote cage, AI bullet cannot rescue or hurt devil',()=>{
  const a=stage({prisoners:[{id:'remote',x:160,y:166}]});
  const s=mission({stage:a});const e=run(s,.6,[{fireHeld:true},{}]).events;
  assert(s.prisoners[0].rescued);assert.equal(s.prisoners[0].rescuedBy,'Sean');
  assert(e.some(e=>e.type==='prisoner-rescued'));
  const other=mission({stage:a});
  other.projectiles.push(createBroforceProjectile({id:'hostile',owner:'enemy',x:100,y:175,dir:1}));
  run(other,.6);assert(!other.prisoners[0].rescued);assert.equal(other.devil.hp,36);
});
check('real BF-15 enemy windup fires colliding bullet; one hit downs once',()=>{
  const s=mission({stage:stage({enemySpawns:[{id:'sentry',type:'gunner',x:210,y:166}]})});
  const events=run(s,3).events;
  assert(events.some(e=>e.type==='attack-tell'));
  assert(events.some(e=>e.type==='enemy-shot'));
  assert(events.some(e=>e.type==='player-down'));
  assert.equal(events.filter(e=>e.type==='player-down'&&e.owner==='Amber').length,1);
  assert.equal(s.players[1].hp,0);
});
check('real combat kills an enemy once and later ticks cannot emit postmortem attacks',()=>{
  const s=mission({stage:stage({enemySpawns:[{id:'victim',type:'turret',x:210,y:166}]})});
  const events=run(s,1,[{fireHeld:true},{}]).events;
  assert.equal(events.filter(e=>e.type==='enemy-down').length,1);
  assert.deepEqual(s.stats.kills,[1,0]);assert.equal(s.enemies.length,0);
  assert(!run(s,1).events.some(e=>e.type==='enemy-shot'||e.type==='enemy-down'));
  const m=mission();run(m,1.3);
  const round=createBroforceProjectile({id:'duplicate',owner:'enemy',x:38,y:175,dir:1});
  m.projectiles.push(round,{...round});
  const hits=advance(m).events;
  assert.equal(hits.filter(e=>e.type==='player-hit').length,1);
  assert.equal(hits.filter(e=>e.type==='player-down').length,1);
});
check('terrain occludes AI bullets and dead/boarded actors cannot fire or rescue',()=>{
  const a=stage({enemySpawns:[{type:'turret',x:210,y:166}]});
  for(let row=7;row<12;row++)a.tiles[row*a.width+10]=TILE.STEEL;
  const s=mission({stage:a});const events=run(s,4).events;
  assert(!events.some(e=>e.type==='player-down'));
  assert(!events.some(e=>e.type==='enemy-shot'));
  Object.assign(s.players[0],{alive:false,downed:true,hp:0});
  const after=advance(s,{inputs:[{fireHeld:true,specialPressed:true},{}]}).events;
  assert(!after.some(e=>e.type==='shot'&&e.owner==='P1'));
});
check('one partner revive stays in-place, grants grace, spends one credit; wipe fails',()=>{
  const s=mission();relocate(s,1,52);run(s,1.3);
  s.projectiles.push(createBroforceProjectile({id:'lethal',owner:'enemy',x:45,y:175,dir:-1}));
  advance(s);assert(s.players[0].downed);const x=s.players[0].x;
  let e=run(s,1.3,t=>[{}, {specialPressed:t===0}]).events;
  assert.equal(e.filter(e=>e.type==='player-revived').length,1);
  assert(s.players[0].alive);assert.equal(s.players[0].x,x);assert.equal(s.players[0].reviveCredits,0);
  assert(s.players[0].invulnerability>1);assert(!e.some(e=>e.type==='shot'&&e.weapon==='grenade'));
  run(s,1.4);
  for(let i=0;i<2;i++)s.projectiles.push(createBroforceProjectile({id:'wipe-'+i,owner:'enemy',x:s.players[i].x+6,y:175,dir:1}));
  const r=advance(s);assert(r.terminal);assert.equal(r.terminal.won,false);assert.equal(r.terminal.bf.outcome,'failed');
  assert.equal(advance(s).terminal,null);
});
check('bounded dt, pause freezes all clocks/RNG and drops stale pressed edges',()=>{
  const s=mission();advance(s,{dt:1/240,inputs:[{jumpPressed:true},{}]});
  const before={tick:s.tick,elapsed:s.elapsed,rng:{...s.rng},director:s.director,devil:s.devil,players:structuredClone(s.players)};
  advance(s,{dt:100,inputs:[{fireHeld:true,specialPressed:true},{}],paused:true});
  assert.equal(s.tick,before.tick);assert.equal(s.elapsed,before.elapsed);assert.deepEqual(s.rng,before.rng);
  assert.deepEqual(s.director,before.director);assert.deepEqual(s.devil,before.devil);assert.deepEqual(s.players,before.players);
  advance(s,{dt:10});assert.equal(s.tick,12);assert.equal(s.players[0].vy,0);
  const tick=s.tick;for(const dt of [-1,NaN,Infinity])advance(s,{dt});assert.equal(s.tick,tick);
});
check('timeout/exit while paused produces frozen exact envelope once and no awards',()=>{
  for(const exit of [false,true]) {
    const s=mission({stage:stage({timeLimit:.1})});
    const r=exit?advance(s,{paused:true,cancelled:true}):run(s,.2);
    assert(r.terminal);assert.deepEqual(Object.keys(r.terminal),['kind','won','bf']);
    assert.equal(r.terminal.kind,'broforce');assert.equal(r.terminal.won,false);
    assert.equal(r.terminal.bf.outcome,exit?'failed':'timeout');
    assert.deepEqual(r.terminal.bf.boarded,[false,false]);assert.deepEqual(r.terminal.bf.aliveAtBoarding,[false,false]);
    assert.equal(advance(s).terminal,null);assert(Object.isFrozen(r.terminal.bf));
  }
});
check('30/60fps deterministic replay includes actual weapons/enemies/director/rescues',()=>{
  function replay(fps) {
    const a=stage({enemySpawns:[{id:'offscreen',type:'grunt',x:700,y:166}],prisoners:[{id:'start',x:32,y:166}]});
    const s=mission({stage:a}); const events=run(s,8,t=>[
      {move:t<2?1:0,fireHeld:true,jumpPressed:t===1,jumpHeld:t>=1&&t<1.4,specialPressed:t===3},
      {move:t<2?1:0,fireHeld:t>=2,jumpPressed:t===1.5,jumpHeld:t>=1.5&&t<1.8}
    ],fps).events;
    return {players:s.players,enemies:s.enemies,projectiles:s.projectiles,tiles:s.terrain.tiles,
      director:s.director,rng:s.rng,devil:s.devil,stats:s.stats,tick:s.tick,terminal:s.terminal,
      events:events.filter(e=>e.type!=='fx')};
  }
  const thirty=replay(30),sixty=replay(60);
  assert(sixty.events.some(e=>e.type==='spawn-enemy'),'Replay must exercise actual BF-11 spawn decisions');
  assert.deepEqual(thirty,sixty);assert.deepEqual(sixty,replay(60));
});
check('invalid stages, owner order, seeds and special-locked devils fail explicitly',()=>{
  for(const overrides of [{devilId:undefined},{devilId:'satan'},{devilId:'loki'},{seed:NaN},{seed:'x'.repeat(257)},
    {players:[{owner:'Amber',character:'sean'},{character:'amber'}]},
    {stage:stage({tileSize:32})},{stage:stage({spawns:[{x:0,y:192},{x:80,y:166}]})}])
    assert.throws(()=>mission(overrides));
});
check('actual BF-10 stage placement is playable; protects boss and extraction anchors',()=>{
  for(const seed of [1,29,'jungle-replay']) {
    const a=generateBroforceStage({seed});const s=mission({stage:a});
    assert.equal(s.devil.y+s.devil.h,a.devilSpawn.y+26);
    assert.equal(s.extraction.zone.x,a.extraction.x+6);
    run(s,1,[{move:1,fireHeld:true},{move:1}]);assert.equal(s.terminal,null);
  }
});
check('actual boss damage/defeat is driven by real player fire, never score/special shortcut',()=>{
  const s=arena();const events=defeat(s);

  assert(events.some(e=>e.type==='devil-hit'));assert(s.bossDefeated,'Boss must die from actual weapon collisions');
  assert.equal(events.filter(e=>e.type==='devil-defeated').length,1);
  assert.equal(s.extraction.phase,'incoming');assert.equal(s.terminal,null);
});
function extract(s,mask,seconds=16) {
  const all=[];let terminal=null;
  for(let t=0;t<seconds*60 && !s.terminal;t++) {
    const inputs=s.players.map((p,i)=>{
      const target=s.extraction.zone.x-6;
      const move=p.x>target+8?-1:p.x<target-8?1:0;
      return {move,specialPressed:mask[i]&&s.extraction.phase==='hover'&&Math.hypot(p.x+6-s.extraction.x,p.y+13-s.extraction.y)<=44};
    });
    const r=advance(s,{inputs});all.push(...r.events);if(r.terminal)terminal=r.terminal;
  }
  return {events:all,terminal};
}
for(const mask of [[true,false],[false,true],[true,true],[false,false]]) {
  check('real helicopter flight/physical boarding '+mask.join('/')+' yields exact owner envelope once',()=>{
    const s=arena(),bossEvents=defeat(s);assert(s.bossDefeated);assert.equal(s.terminal,null);
    const before=structuredClone(fresh());
    const r=extract(s,mask);assert(r.terminal,'Real BF-21 must reach a terminal phase');
    assert.equal(r.terminal.won,mask.some(Boolean));assert.deepEqual(r.terminal.bf.boarded,mask);
    assert.deepEqual(r.terminal.bf.aliveAtBoarding,mask);
    assert.equal(r.terminal.bf.outcome,mask.some(Boolean)?'extracted':'failed');
    assert.deepEqual(r.terminal.bf,{schema:1,attemptId:'bf30:integration',stageId:'broforce-jungle',
      devilId:s.devilId,outcome:mask.some(Boolean)?'extracted':'failed',boarded:mask,aliveAtBoarding:mask});
    assert.equal(r.events.filter(e=>e.type==='boarded').length,mask.filter(Boolean).length);
    assert.equal(r.events.filter(e=>e.type==='mission-terminal').length,1);
    assert.equal(bossEvents.filter(e=>e.type==='devil-defeated').length,1);
    assert.equal(advance(s,{inputs:[{specialPressed:true},{specialPressed:true}]}).terminal,null);
    assert.deepEqual(advance(s).events,[]);
    // Real BF-27 may only PLAN grants. This module never applies or saves any.
    for(const origin of ['arcade','dev','board']) {
      const plan=planBroforceAwards({profile:before,origin,...r.terminal.bf,won:r.terminal.won});
      assert.deepEqual(plan.grants.map(g=>g.owner),origin==='board'&&r.terminal.won?mask.flatMap((v,i)=>v?[['Sean','Amber'][i]]:[]):[]);
    }
    assert.deepEqual(before,fresh());assert.deepEqual(s.players.map(p=>p.selectedCharacter),selected);
  });
}
check('a dead nonboarder cannot board; surviving P2 still extracts',()=>{
  const s=arena();defeat(s);assert(s.bossDefeated);
  const p=s.players[0];
  s.projectiles.push(createBroforceProjectile({id:'after-boss',owner:'enemy',x:p.x+6,y:p.y+13,dir:1}));
  advance(s);assert(p.downed);
  const r=extract(s,[true,true]);assert(r.terminal.won);
  assert.deepEqual(r.terminal.bf.boarded,[false,true]);assert.deepEqual(r.terminal.bf.aliveAtBoarding,[false,true]);
});
check('boarding protects the receipt from unboarded partner death/global timeout',()=>{
  const s=arena();s.timeLimit=10.1;defeat(s);assert(s.bossDefeated);
  let killed=false;const events=[];
  for(let t=0;t<16*60&&!s.terminal;t++) {
    const p=s.players[0],q=s.players[1],target=s.extraction.zone.x-6;
    const r=advance(s,{inputs:[{move:p.x>target+8?-1:0,specialPressed:s.extraction.phase==='hover'},{}]});
    events.push(...r.events);
    if(p.boarded&&!killed) {
      s.projectiles.push(createBroforceProjectile({id:'nonboarder-hit',owner:'enemy',x:q.x+6,y:q.y+13,dir:1}));
      killed=true;
    }
  }
  assert(killed);assert(s.players[1].downed);assert(s.elapsed>s.timeLimit);
  assert(s.terminal.won);assert.deepEqual(s.terminal.bf.boarded,[true,false]);
  assert.equal(events.filter(e=>e.type==='mission-terminal').length,1);
});
check('boss not defeated/remote/dead boarding requests cannot open helicopter early',()=>{
  const s=mission({stage:stage({extraction:{x:32,y:166}})});
  const e=run(s,1,t=>[{specialPressed:t===0},{}]).events;
  assert.equal(s.extraction.phase,'dormant');assert.deepEqual(s.extraction.boarded,[false,false]);
  assert(!e.some(e=>e.type==='boarded'));assert.equal(s.terminal,null);
  const far=arena();defeat(far);assert(far.bossDefeated);
  // No travel back to the extraction area; a remote special only throws grenades.
  const result=run(far,15,t=>[{specialPressed:t===3},{specialPressed:t===3}]);
  assert(result.terminal&&!result.terminal.won);assert.deepEqual(result.terminal.bf.boarded,[false,false]);
});
check('bounds prevent growing projectile/enemy/FX/event counts during sustained fire',()=>{
  const s=mission({stage:stage({timeLimit:60,enemySpawns:Array.from({length:64},(_,i)=>({id:'cap-'+i,type:'grunt',x:600+i*12,y:166}))})});
  assert(s.enemies.length<=24);
  for(let i=0;i<60*30&&!s.terminal;i++) {
    const r=advance(s,{dt:1/30,inputs:[{fireHeld:true,specialPressed:i%45===0},{fireHeld:true,specialPressed:i%60===0}]});
    assert(s.enemies.length<=24);assert(s.projectiles.length<=128);assert(s.fx.length<=128);assert(r.events.length<=2048);
    assert.equal(new Set(s.projectiles.map(p=>p.id)).size,s.projectiles.length);
    assert(s.devil.projectiles.length<=20);assert(s.devil.hitIds.length<=160);
  }
});
check('loaded real BF modules; mission has no direct profile/state/persistence/reward import',()=>{
  for(const name of ['physics','terrain','combat','enemies','director','prisoners','roster','devil','extraction'])
    assert(loaded.has('src/engines/broforce/'+name+'.js'));
  const source=fs.readFileSync(path.join(root,'src/engines/broforce/mission.js'),'utf8');
  assert(!/require\(['"]src\/(?:profile|state|persistence|engines\/broforce\/rewardPolicy)\.js/.test(source));
});
console.log('BF-30: '+checks+' deterministic integration groups passed');
