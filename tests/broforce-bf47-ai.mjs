// BF-47 — real Broforce VM modules; standalone: node tests/broforce-bf47-ai.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
function load(path, deps = {}) {
  const exports = {};
  const context = {exports, require: name => {
    if (Object.hasOwn(deps, name)) return deps[name];
    throw new Error('Unexpected module dependency: ' + name);
  }};
  runInNewContext(source(path), context, {filename:path, timeout:3000});
  return exports;
}
const physics = load('../src/engines/broforce/physics.js');
const terrain = load('../src/engines/broforce/terrain.js');
const director = load('../src/engines/broforce/director.js');
const {TILE, createTerrain, isSolidTile, damageTerrain} = terrain;
const {createBroforceEnemy: create, advanceBroforceEnemies: advance} = load(
  '../src/engines/broforce/enemies.js',
  {'src/engines/broforce/physics.js':physics}
);
const W = 30, H = 12;
const player = (id,x,alive = true) => ({id,x,y:146,alive});
function world(cover = TILE.EMPTY, floorLimit = W) {
  const tiles = Array(W * H).fill(TILE.EMPTY);
  for (let col=0;col<floorLimit;col++)
    for (let row=10;row<H;row++) tiles[row*W+col] = TILE.SOIL;
  // One true terrain tile across the turret's eye ray.
  if (cover !== TILE.EMPTY) tiles[9*W+8] = cover;
  return createTerrain({width:W,height:H,tiles});
}
function run(enemies, land, players, seconds, hz=60, extra={}) {
  const events = [];
  for (let tick=0;tick<Math.round(seconds*hz);tick++) {
    const result = advance(enemies, {
      dt:1/hz,players,isSolid:(c,r)=>isSolidTile(land,c,r),
      worldBounds:{width:W*16,height:H*16},...extra
    });
    enemies = result.enemies;
    events.push(...result.events);
  }
  return {enemies,events};
}
function eventsOf(result, type) {return result.events.filter(e=>e.type===type);}
function nearly(a,b) {assert.ok(Math.abs(a-b)<0.00001, a+' differs from '+b);}
const tests = [];
function test(name, fn) {tests.push([name, fn]);}

test('mission/director/stage archetypes resolve to all four actual BF-15 types', () => {
  const mission = source('../src/engines/broforce/mission.js');
  const stage = source('../src/engines/broforce/stage.js');
  const map = Object.fromEntries([...mission.matchAll(/\b(grunt|gunner|charger|scout|sentry|heavy):'(rifleman|turret|melee|carrier)'/g)]
    .map(m=>[m[1],m[2]]));
  assert.deepEqual(map, {grunt:'rifleman',gunner:'turret',charger:'melee',
    scout:'rifleman',sentry:'turret',heavy:'carrier'});
  for (const authored of ['scout','sentry','heavy'])
    assert.match(stage, new RegExp("'"+authored+"'"));
  // Exercise the real BF-11 director emitter, not an imitation of its chooser.
  for (const archetype of ['grunt','gunner','charger']) {
    let state = director.createBroforceDirector({seed:19}), spawned = [];
    const scene = {
      camera:{x:0,y:0,width:320,height:200},world:{width:1400,height:200},
      players:[{id:'P1',x:100,y:146,alive:true}],
      spawnMarkers:[{id:'marker',type:archetype,x:400,y:140}],activeEnemies:0
    };
    for (let i=0;i<360;i++) {
      const step = director.advanceBroforceDirector(state,1/60,scene);
      state = step.state; spawned.push(...step.events);
    }
    assert.ok(spawned.length>0, 'expected real director spawn for '+archetype);
    assert.equal(spawned[0].enemyType, archetype);
    assert.equal(create({type:map[spawned[0].enemyType]}).type,map[archetype]);
  }
  assert.equal(create({type:map.heavy}).type, 'carrier');
});

test('closer hidden player cannot mask farther visible owner, even behind STEEL', () => {
  const result = run([create({id:'visible',type:'turret',x:100,y:138})],
    world(TILE.STEEL),[player('P1',158),player('P2',24)],1.3);
  assert.equal(eventsOf(result,'alert')[0]?.targetId,'P2');
  assert.equal(eventsOf(result,'attack-tell')[0]?.targetId,'P2');
  assert.equal(eventsOf(result,'enemy-shot')[0]?.targetId,'P2');
  assert.ok(result.events.every(e=>e.targetId!=='P1'));
});

test('stone and wood occlude until actually destroyed by terrain mutations', () => {
  for (const kind of [TILE.STONE,TILE.WOOD]) {
    const land = world(kind), enemies = [create({id:'cover',type:'turret',x:100,y:138})];
    const hidden = run(enemies,land,[player('P1',158)],1.3);
    assert.equal(hidden.events.length,0,'occluded by tile '+kind);
    const changed = damageTerrain(land,{x:136,y:152,radius:0,damage:3});
    assert.equal(changed.destroyed.length,1);
    assert.equal(isSolidTile(land,8,9),false);
    const exposed = run(hidden.enemies,land,[player('P1',158)],1.3);
    assert.ok(eventsOf(exposed,'attack-tell').some(e=>e.targetId==='P1'));
    assert.ok(eventsOf(exposed,'enemy-shot').some(e=>e.targetId==='P1'));
  }
});

test('STEEL remains opaque after explosions and neither hidden owner is attacked', () => {
  const land = world(TILE.STEEL);
  const blast = damageTerrain(land,{x:136,y:152,radius:0,damage:255});
  assert.equal(blast.destroyed.length,0);
  assert.equal(isSolidTile(land,8,9),true);
  const result = run([create({id:'opaque',type:'turret',x:100,y:138})],
    land,[player('P1',158),player('P2',195)],2);
  assert.equal(result.events.length,0);
});

test('no shot in the opposite direction to its warning when target crosses sides', () => {
  const land = world();
  const before = run([create({id:'flank',type:'turret',x:100,y:138})],
    land,[player('P1',158)],0.6);
  assert.ok(eventsOf(before,'attack-tell').length>0,'windup started');
  const crossed = run(before.enemies,land,[player('P1',24)],0.42);
  assert.equal(eventsOf(crossed,'enemy-shot').length,0,'cancel old committed tell');
  const resumed = run(crossed.enemies,land,[player('P1',24)],1.3);
  const renewed = [...eventsOf(crossed,'attack-tell'),...eventsOf(resumed,'attack-tell')];
  assert.equal(renewed[0]?.dir,-1,'a fresh warning faces the new direction');
  assert.equal(eventsOf(resumed,'enemy-shot')[0]?.dir,-1);
});

test('ranged firing is delayed by warning and uses real projectile events', () => {
  const land=world(), enemy=create({id:'warning',type:'rifleman',x:40,y:136,seed:1});
  const a=run([enemy],land,[player('P1',140)],0.5);
  assert.equal(eventsOf(a,'enemy-shot').length,0);
  const b=run(a.enemies,land,[player('P1',140)],0.13);
  assert.ok(eventsOf(b,'attack-tell').length>0);
  assert.equal(eventsOf(b,'enemy-shot').length,0);
  const c=run(b.enemies,land,[player('P1',140)],0.5);
  assert.equal(eventsOf(c,'enemy-shot').length,1);
});

test('steel wall and unsupported ledge constrain walkers using real BF-13 physics', () => {
  const blocked=world();
  for(let row=0;row<10;row++) blocked.tiles[row*W+5]=TILE.STEEL;
  const stalled=run([create({id:'wall',type:'melee',x:52,y:136,seed:1})],
    blocked,[player('P1',164)],3);
  assert.ok(stalled.enemies[0].x<=68.001,'solid steel penetration');
  const ledge=world(TILE.EMPTY,5);
  const patrolling=run([create({id:'ledge',x:30,y:136,seed:1})],ledge,[],2);
  assert.ok(patrolling.enemies[0].x+12<=80.001,'unsupported ledge crossing');
});

test('distant enemies sleep only with opt-in activeBounds and resume predictably', () => {
  const land=world(), initial=[create({id:'far',type:'rifleman',x:260,y:136})];
  const asleep=run(initial,land,[player('P1',315)],2,60,
    {activeBounds:{x:0,y:0,width:120,height:160}});
  assert.equal(asleep.events.length,0);
  assert.equal(asleep.enemies[0].x,initial[0].x);
  assert.equal(asleep.enemies[0].spawnGrace,initial[0].spawnGrace);
  assert.equal(asleep.enemies[0]._aiRemainder,initial[0]._aiRemainder);
  const awake=run(asleep.enemies,land,[player('P1',315)],1.2,60,
    {activeBounds:{x:200,y:0,width:250,height:160}});
  assert.ok(eventsOf(awake,'attack-tell').length>0);
  const legacy=run(initial,land,[player('P1',315)],1.2,60);
  assert.ok(eventsOf(legacy,'attack-tell').length>0,'absent bounds remain active');
});

test('paused snapshots and externally killed sleeping enemies emit no postmortem attacks', () => {
  const land=world(), enemy=create({id:'fallen',type:'turret',x:100,y:138});
  const paused=run([enemy],land,[player('P1',160)],2,60,{paused:true});
  assert.equal(paused.events.length,0);
  assert.equal(paused.enemies[0].spawnGrace,enemy.spawnGrace);
  const dead={...enemy,hp:0};
  const killed=run([dead],land,[player('P1',160)],1,60,
    {activeBounds:{x:350,y:0,width:90,height:160}});
  assert.equal(eventsOf(killed,'enemy-down').length,1);
  assert.equal(eventsOf(killed,'enemy-shot').length,0);
  assert.equal(run(killed.enemies,land,[player('P1',160)],1).events.length,0);
});

test('deterministic AI snapshots and event identities at 30/60/120 Hz', () => {
  const scenario=hz=>run([
    create({id:'a',type:'turret',x:100,y:138,seed:5}),
    create({id:'b',type:'melee',x:235,y:136,seed:7}),
    create({id:'c',type:'carrier',x:300,y:136,seed:9})
  ],world(TILE.STONE),[player('P1',220),player('P2',30)],2,hz);
  const base=scenario(30);
  for(const hz of [60,120]) {
    const other=scenario(hz);
    assert.deepEqual(other.events.map(e=>[e.eventId,e.type,e.targetId,e.dir]),
      base.events.map(e=>[e.eventId,e.type,e.targetId,e.dir]));
    for(let i=0;i<base.enemies.length;i++) {
      nearly(base.enemies[i].x,other.enemies[i].x);
      nearly(base.enemies[i].y,other.enemies[i].y);
      nearly(base.enemies[i].spawnGrace,other.enemies[i].spawnGrace);
    }
  }
});

test('hostile spawn churn and absurd dt preserve 24-actor and 128-event caps', () => {
  const land=world(), originals=Array.from({length:400},(_,i)=>
    create({id:'enemy'+i,type:'turret',x:40+i%20,y:138}));
  let result=advance(originals,{dt:999,players:[player('P1',180)],
    isSolid:(c,r)=>isSolidTile(land,c,r),
    worldBounds:{width:W*16,height:H*16}});
  assert.ok(result.enemies.length<=24);
  assert.ok(result.events.length<=128);
  assert.equal(new Set(result.enemies.map(e=>e.id)).size,result.enemies.length);
  for(let pass=0;pass<120;pass++) {
    result=advance([...result.enemies,...originals.slice(30,80)],{
      dt:1/60,players:[player('P1',180)],
      isSolid:(c,r)=>isSolidTile(land,c,r),
      worldBounds:{width:W*16,height:H*16}
    });
    assert.ok(result.enemies.length<=24&&result.events.length<=128);
    assert.equal(new Set(result.events.map(e=>e.eventId)).size,result.events.length);
  }
});

let failures=0;
for(const [name,fn] of tests) {
  try {fn();console.log('PASS '+name);}
  catch(e){failures++;console.error('FAIL '+name);console.error(e.stack);}
}
console.log((tests.length-failures)+'/'+tests.length+' BF-47 enemy AI tests passed');
if(failures)process.exitCode=1;
