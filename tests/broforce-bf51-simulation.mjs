// BF-51 — adversarial real-source mission simulation, without altering sibling fixtures.
// node tests/broforce-bf51-simulation.mjs
// Every Broforce physics/combat/AI/director/stage/prisoner/boss/heli module is
// loaded from its production source. Only catalog/profile IO boundaries are stubbed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const entries = [
  ['sean','Sean','ShambConkins'], ['amber','Amber','ShambConkins'],
  ['rambo','John Rambo','Rambo'], ['john-rambo','John Rambo','Rambo'],
  ['michael','Michael Scott','The Office'], ['michael-scott','Michael Scott','The Office'],
  ['terminator','Terminator','The Terminator'], ['t-800','Terminator','The Terminator'],
  ['loki','Loki','ShambConkins'], ['satan','Satan','Horror','horror']
];
const fixtures = {
  'src/contentPolicy.js': {ACTIVE_CATALOG:{characters:entries.map(([id,name,source,unlockBy]) =>
    ({id,name,source,unlockBy})),items:[]}},
  'src/photoPairs.js': {normalizePhotoPair:()=>null,photoPairLibrary:()=>[],
    currentPhotoPair:()=>{},photoProfilePayload:p=>p},
  'src/persistence.js': {PROFILE_KEY:'bf51',readJSON:()=>null,
    writeJSON:()=>{throw Error('Mission tried to persist a profile');}},
  'src/data/savoryLab.js': {LAB_TEAM:[]},
  'src/data/movieBonds.js': {isMovieBond:()=>false,missingMovieBonds:()=>[]}
};
const cache=new Map(), loaded=new Set();
function load(id){
  if(Object.hasOwn(fixtures,id)) return fixtures[id];
  if(cache.has(id)) return cache.get(id);
  const file=path.join(root,id), exports={};
  cache.set(id,exports); loaded.add(id);
  vm.runInThisContext('(function(require,exports){\n'+fs.readFileSync(file,'utf8')+'\n})',
    {filename:file})(load,exports);
  return exports;
}
const {createBroforceMission:create,advanceBroforceMission:advance} =
  load('src/engines/broforce/mission.js');
const {generateBroforceVariant} = load('src/engines/broforce/stageVariants.js');
const {createBroforceProjectile} = load('src/engines/broforce/combat.js');
const {TILE} = load('src/engines/broforce/terrain.js');
const owners=['Sean','Amber'];
const people=(overrides=[{},{}])=>owners.map((owner,i)=>({
  owner,name:'Same editable display name',character:i===0?'sean':'amber',
  fighters:i===0?['sean','rambo']:['amber','michael'],...overrides[i]}));
const ids=['broforce-jungle','broforce-factory','broforce-city','broforce-desert'];
function flat(overrides={}){
  const width=96,height=16,tiles=new Uint8Array(width*height);
  for(let row=12;row<height;row++)for(let col=0;col<width;col++)
    tiles[row*width+col]=TILE.STEEL;
  return {stageId:'broforce-jungle',width,height,tileSize:16,tiles,
    spawns:[{x:32,y:166},{x:80,y:166}],enemySpawns:[],prisoners:[],
    devilSpawn:{x:1250,y:166},extraction:{x:1430,y:166},
    checkpoints:[],timeLimit:120,...overrides};
}
function mission(stage=flat(),players=people(),attemptId='bf51:test'){
  return create({stage,seed:919,devilId:'terminator',players,attemptId});
}
function run(s,seconds,inputs=[{},{}],fps=60){
  const events=[];let terminal=null;
  for(let i=0;i<Math.round(seconds*fps)&&!s.terminal;i++){
    const r=advance(s,{dt:1/fps,inputs:typeof inputs==='function'?inputs(i/fps):inputs});
    events.push(...r.events);if(r.terminal)terminal=r.terminal;
  }
  return {events,terminal};
}
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS BF-51 '+passed+': '+name);}

check('four REAL stage variants replay identically at 30/60/120fps with seeded combat',()=>{
  for(const stageId of ids)for(const seed of [41,919]){
    let baseline;
    for(const fps of [30,60,120]){
      const stage=generateBroforceVariant({stageId,seed});
      const s=create({stage,seed,devilId:'terminator',players:people(),
        attemptId:'bf51:'+stageId+':'+seed});
      const events=run(s,4,t=>[
        {move:t<2?1:0,fireHeld:true,jumpPressed:t===1,
          jumpHeld:t>=1&&t<1.25,specialPressed:t===2},
        {move:t<2?1:0,fireHeld:t>=1.5,jumpPressed:t===2.5}
      ],fps).events;
      const real=events.filter(e=>e.type!=='fx');
      assert(real.some(e=>e.type==='shot'),'Replay must fire actual BF-14 weapons');
      const eventIds=events.map(e=>e.eventId);
      assert.equal(new Set(eventIds).size,eventIds.length,'One authority ID per event');
      for(let i=1;i<eventIds.length;i++)
        assert(Number(eventIds[i].slice(8))>Number(eventIds[i-1].slice(8)));
      const snapshot={tick:s.tick,phase:s.phase,terminal:s.terminal,
        players:s.players,enemies:s.enemies,projectiles:s.projectiles,
        prisoners:s.prisoners,devil:s.devil,extraction:s.extraction,
        director:s.director,stats:s.stats,terrain:Array.from(s.terrain.tiles),
        events:real};
      if(!baseline)baseline=snapshot;else
        assert.deepEqual(snapshot,baseline,stageId+' seed='+seed+' fps='+fps);
      assert.deepEqual(s.players.map(p=>p.selectedCharacter),['sean','amber']);
      assert.deepEqual(s.players.map(p=>p.owner),owners);
      assert.equal(s.stage.tiles,s.terrain.tiles);
    }
  }
});

check('real grenades cannot maintain an infinite fuse when ricocheting from cover',()=>{
  const a=flat();
  for(let row=8;row<12;row++)a.tiles[row*a.width+12]=TILE.WOOD;
  const s=mission(a);s.players[0].x=165;s.players[0].y=166;
  const events=run(s,3,t=>[{specialPressed:t===0},{}]).events;
  assert(events.some(e=>e.type==='shot'&&e.weapon==='grenade'));
  assert(events.some(e=>e.type==='ricochet'));
  assert(events.some(e=>e.type==='explosion'));
  assert(!s.projectiles.some(p=>p.weapon==='grenade'));
  assert(s.terrain.revision>0,'Explosion should use the real mutable terrain');
});

check('missing fighter snapshots and simultaneous physical cages do not corrupt selected heroes',()=>{
  const a=flat({prisoners:[{id:'one',x:32,y:166},{id:'two',x:80,y:166}]});
  const inputs=people([{fighters:[]},{fighters:[]}]),before=structuredClone(inputs);
  const s=mission(a,inputs),events=advance(s,{dt:1/60}).events;
  assert.deepEqual(inputs,before);
  assert.deepEqual(s.stats.rescues,[1,1]);
  assert.equal(events.filter(e=>e.type==='prisoner-empty').length,2);
  assert.equal(events.filter(e=>e.type==='fighter-swap').length,0);
  assert.deepEqual(s.players.map(p=>p.fighterId),['sean','amber']);
  assert.deepEqual(s.players.map(p=>p.selectedCharacter),['sean','amber']);
  assert.equal(advance(s).events.filter(e=>e.type==='prisoner-rescued').length,0);
});

check('pause clears deferred input, freezes real subsystem clocks, and cancellation wins precedence',()=>{
  const s=mission();
  advance(s,{dt:1/240,inputs:[{jumpPressed:true,specialPressed:true},{}]});
  assert.equal(s.tick,0);
  const snap=structuredClone({players:s.players,terrain:s.terrain,director:s.director,
    devil:s.devil,extraction:s.extraction,rng:s.rng});
  const paused=advance(s,{dt:90,inputs:[{fireHeld:true,specialPressed:true},{}],paused:true});
  assert.equal(paused.terminal,null);assert.equal(s.tick,0);
  assert.deepEqual({players:s.players,terrain:s.terrain,director:s.director,
    devil:s.devil,extraction:s.extraction,rng:s.rng},snap);
  const resume=advance(s,{dt:1/60,inputs:[{},{}]});
  assert(!resume.events.some(e=>e.type==='shot'||e.type==='player-jump'));
  assert.equal(s.players[0].vy,0);
  const exit=advance(s,{dt:999,paused:true,cancelled:true});
  assert(exit.terminal);assert.equal(exit.terminal.won,false);
  assert.equal(exit.terminal.bf.outcome,'failed');
  assert.deepEqual(Object.keys(exit.terminal),['kind','won','bf']);
  assert.equal(advance(s,{cancelled:true}).terminal,null);
  assert.deepEqual(advance(s).events,[]);
});

check('clock timeout is terminal once even with held fire and nonfinite stalled frames',()=>{
  const s=mission(flat({timeLimit:.1}));
  for(const dt of [-1,NaN,Infinity])advance(s,{dt,inputs:[{fireHeld:true},{}]});
  assert.equal(s.tick,0);
  const r=run(s,.3,[{fireHeld:true},{}],120);
  assert(r.terminal);assert.equal(r.terminal.won,false);
  assert.equal(r.terminal.bf.outcome,'timeout');
  assert.deepEqual(r.terminal.bf.boarded,[false,false]);
  assert.equal(r.events.filter(e=>e.type==='mission-terminal').length,1);
  assert.equal(advance(s,{dt:100,inputs:[{fireHeld:true},{}]}).terminal,null);
});

check('real devil defeat + P2 boarding survives P1 death and elapsed mission clock at 120Hz',()=>{
  const a=flat({spawns:[{x:210,y:166},{x:232,y:166}],
    devilSpawn:{x:300,y:166},extraction:{x:80,y:166}});
  const s=mission(a,people([{weapon:'shotgun'},{weapon:'shotgun'}]),'bf51:p2');
  const bossEvents=[];
  for(let t=0;t<45*120&&!s.bossDefeated&&!s.terminal;t++){
    const inputs=s.players.map(p=>{
      const d=s.devil;
      const incoming=d.projectiles.some(q=>Math.abs(q.x-(p.x+6))<85&&q.vx<0);
      const quake=d.attack==='quake'&&(d.mode==='attack'||d.mode==='windup'&&d.modeTimer<.15);
      const dive=d.attack==='dive'&&(d.mode==='attack'||d.mode==='windup');
      let move=!dive&&(p.x<210||p.facing<0)?1:0;
      if(dive&&d.aim&&Math.abs(p.x+6-d.aim.x)<70)move=p.x<100?1:-1;
      return {fireHeld:true,move,jumpPressed:p.onGround&&(incoming||quake),jumpHeld:incoming||quake};
    });
    bossEvents.push(...advance(s,{dt:1/120,inputs}).events);
  }
  assert(s.bossDefeated,'Only real attacks can kill the devil');
  assert(bossEvents.some(e=>e.type==='devil-hit'));
  assert.equal(bossEvents.filter(e=>e.type==='devil-defeated').length,1);
  s.timeLimit=s.elapsed+3.7; // deadline will pass after a valid boarding receipt
  let hit=false,terminal=null;const flight=[];
  for(let t=0;t<16*120&&!s.terminal;t++){
    const inputs=s.players.map((p,i)=>{
      const target=s.extraction.zone.x-6;
      return {move:i===1?(p.x>target+8?-1:p.x<target-8?1:0):0,
        specialPressed:i===1&&s.extraction.phase==='hover'&&
          Math.hypot(p.x+6-s.extraction.x,p.y+13-s.extraction.y)<=44};
    });
    const r=advance(s,{dt:1/120,inputs});flight.push(...r.events);
    if(r.terminal)terminal=r.terminal;
    if(s.players[1].boarded&&!hit){
      hit=true;const p=s.players[0];
      s.projectiles.push(createBroforceProjectile({
        id:'bf51:nonboarder-lethal',owner:'hostile',x:p.x+6,y:p.y+13,dir:1}));
    }
  }
  assert(hit);assert(s.players[0].downed);assert(s.elapsed>s.timeLimit);
  assert(terminal);assert.equal(terminal.won,true);
  assert.deepEqual(terminal.bf,{schema:1,attemptId:'bf51:p2',
    stageId:'broforce-jungle',devilId:'terminator',outcome:'extracted',
    boarded:[false,true],aliveAtBoarding:[false,true]});
  assert.equal(flight.filter(e=>e.type==='mission-terminal').length,1);
  assert.equal(advance(s).terminal,null);
  assert.deepEqual(advance(s).events,[]);
});

check('the suite loaded real stage/physics/combat/AI/director/prisoner/devil/heli code',()=>{
  for(const name of ['stageVariants','physics','terrain','combat','enemies',
    'director','prisoners','roster','devil','extraction'])
    assert(loaded.has('src/engines/broforce/'+name+'.js'),name);
});
console.log('BF-51: '+passed+' real-source adversarial groups passed');
