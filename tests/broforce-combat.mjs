// BF-14 focused tests. Run in a full checkout: node tests/broforce-combat.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (name, injected = {}) => {
  const exports = {};
  runInNewContext(readFileSync(resolve(root, 'src/engines/broforce/' + name + '.js'), 'utf8'),
    {exports, Uint8Array, require: path => {
      if (path !== 'src/engines/broforce/terrain.js') throw Error('Unexpected require: '+path);
      return injected.terrain;
    }}, {filename:'broforce/' + name + '.js', timeout:5000});
  return exports;
};
const terrain = load('terrain');
const combat = load('combat', {terrain});
const {WEAPON_SPECS,createBroforceProjectile,fireBroforceWeapon,
  advanceBroforceCombat,resolveBroforceExplosion} = combat;
const {TILE,createTerrain,isSolidTile} = terrain;
const plain = value => JSON.parse(JSON.stringify(value));
const ground = (width,height,filled={}) => {
  const tiles = Array(width*height).fill(TILE.EMPTY);
  for (const [key,type] of Object.entries(filled)) {
    const [c,r] = key.split(',').map(Number);tiles[r*width+c]=type;
  }
  const world=createTerrain({width,height,tiles});
  return {world, solid:(c,r)=>isSolidTile(world,c,r)};
};
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
const simulateFire=(weapon,fps,duration,seed=123) => {
  let state, timeline=[], ammo=0;
  for(let frame=0;frame<duration*fps;frame++){
    const dt=1/fps;
    const next=fireBroforceWeapon({state,owner:'P1',weapon,dt,fireHeld:true,dir:{x:1,y:0},seed});
    state=next.state;
    timeline.push(...next.events.map(e=>[e.sequence,Math.round((frame*dt+e.at)*1e6),e.weapon]));
    ammo=state.ammo;
  }
  return {state,timeline,ammo};
};

test('complete frozen specs and distinct firing patterns / ammo',()=>{
  assert.deepEqual(Object.keys(WEAPON_SPECS),['pistol','rifle','shotgun','launcher','grenade']);
  assert.ok(Object.isFrozen(WEAPON_SPECS));
  assert.ok(Object.values(WEAPON_SPECS).every(s=>Object.isFrozen(s)));
  assert.ok(WEAPON_SPECS.rifle.burst>1);
  assert.ok(WEAPON_SPECS.shotgun.pellets>=5);
  assert.ok(WEAPON_SPECS.grenade.gravity>WEAPON_SPECS.launcher.gravity);
  assert.ok(WEAPON_SPECS.launcher.blastRadius>0);
  for(const weapon of Object.keys(WEAPON_SPECS)){
    const {timeline,ammo}=simulateFire(weapon,60,3);
    assert.ok(timeline.length>0 && timeline.length<=WEAPON_SPECS[weapon].magazine);
    assert.equal(timeline.length+ammo,WEAPON_SPECS[weapon].magazine);
    assert.equal(timeline[0][1],0);
    assert.ok(timeline.every(([n,t])=>n>=0&&t>=0));
  }
});
test('30/60fps firing replay has identical sequences and shot times',()=>{
  for(const weapon of Object.keys(WEAPON_SPECS)){
    const a=simulateFire(weapon,30,3),b=simulateFire(weapon,60,3);
    assert.deepEqual(a.timeline,b.timeline,weapon);
    assert.equal(a.ammo,b.ammo);
  }
});
test('rifle bursts have short intra-burst gaps, then recovery gap',()=>{
  const shots=simulateFire('rifle',60,1.5).timeline.map(x=>x[1]/1e6);
  assert.ok(shots.length>=9);
  assert.ok(Math.abs(shots[1]-shots[0]-.062)<1e-6);
  assert.ok(Math.abs(shots[2]-shots[1]-.062)<1e-6);
  assert.ok(Math.abs(shots[3]-shots[2]-.29)<1e-6);
});
test('pure fire state does not mutate input; seeded shotgun spread independent of frame slicing',()=>{
  const initial={weapon:'shotgun',ammo:8,cooldown:0,burstLeft:0,sequence:0};
  const old=JSON.stringify(initial);
  const fired=fireBroforceWeapon({state:initial,owner:'P2',weapon:'shotgun',fireHeld:true,dt:0,seed:900});
  assert.equal(JSON.stringify(initial),old);
  assert.equal(fired.projectiles.length,6);
  assert.equal(new Set(fired.projectiles.map(p=>p.id)).size,6);
  assert.ok(new Set(fired.projectiles.map(p=>p.vy.toFixed(2))).size>=5);
  const repeated=fireBroforceWeapon({state:initial,owner:'P2',weapon:'shotgun',fireHeld:true,dt:0,seed:900});
  assert.deepEqual(plain(fired.projectiles),plain(repeated.projectiles));
  const injected=fireBroforceWeapon({state:initial,owner:'P2',weapon:'shotgun',fireHeld:true,
    dt:0,random:(_shot,pellet)=>pellet/5});
  assert.notDeepEqual(plain(injected.projectiles),plain(repeated.projectiles));
});
test('projectile constructor normalizes direction, including diagonal and facing',()=>{
  const p=createBroforceProjectile({id:'diagonal',owner:'P1',x:6,y:9,dir:{x:1,y:1}});
  assert.ok(Math.abs(p.vx-p.vy)<1e-8);
  assert.equal(p.x,6);assert.equal(p.y,9);
  assert.ok(createBroforceProjectile({id:3,dir:-1}).vx<0);
  assert.throws(()=>createBroforceProjectile({}),/id/);
});
test('fast projectile sweeps across wall without tunneling and uses exact tile coordinates',()=>{
  const g=ground(20,7,{'5,3':TILE.STONE});
  const p=createBroforceProjectile({id:'wall',owner:'P1',x:18,y:56,dir:1,weapon:'rifle'});
  const before=plain(p);
  const result=advanceBroforceCombat({projectiles:[p],dt:.09,isSolid:g.solid,terrain:g.world});
  assert.equal(result.projectiles.length,0);
  const impact=result.events.find(e=>e.type==='impact');
  assert.equal(impact.col,5);assert.equal(impact.row,3);
  assert.equal(g.world.hp[3*20+5],2);
  assert.deepEqual(plain(p),before);
});
test('destructible cover breaks at correct HP, steel remains indestructible',()=>{
  const g=ground(10,3,{'3,1':TILE.STONE,'5,1':TILE.STEEL});
  for(let n=1;n<=3;n++){
    const p=createBroforceProjectile({id:'hit'+n,owner:'P1',x:5,y:24,weapon:'pistol'});
    advanceBroforceCombat({projectiles:[p],dt:.1,isSolid:g.solid,terrain:g.world});
    assert.equal(g.world.hp[13],3-n);
  }
  assert.equal(g.world.tiles[13],TILE.EMPTY);
  for(let n=0;n<5;n++){
    const p=createBroforceProjectile({id:'steel'+n,owner:'P1',x:60,y:24,weapon:'pistol'});
    advanceBroforceCombat({projectiles:[p],dt:.1,isSolid:g.solid,terrain:g.world});
  }
  assert.equal(g.world.tiles[15],TILE.STEEL);
  assert.equal(g.world.hp[15],255);
});
test('target hitbox sweep, occlusion, diagonals and friendly fire disabled',()=>{
  const empty=()=>false;
  const targets=[{hitId:'E',bounds:{x:43,y:43,w:16,h:16}},
    {id:'P2',kind:'player',bounds:{x:30,y:30,w:15,h:15}}];
  const d=createBroforceProjectile({id:'d',owner:'P1',x:2,y:2,dir:{x:1,y:1}});
  const hit=advanceBroforceCombat({projectiles:[d],dt:.1,isSolid:empty,targets});
  assert.equal(hit.events.find(e=>e.type==='hit').targetId,'E');
  const blocked=advanceBroforceCombat({projectiles:[d],dt:.1,targets,
    isSolid:(c,r)=>c===2&&r===2});
  assert.equal(blocked.events.some(e=>e.type==='hit'),false);
  const p=createBroforceProjectile({id:'p',owner:'P1',x:5,y:37});
  const safe=advanceBroforceCombat({projectiles:[p],dt:.1,isSolid:empty,targets:[targets[1]]});
  assert.equal(safe.events.some(e=>e.type==='hit'),false);
  const enabled=advanceBroforceCombat({projectiles:[p],dt:.1,isSolid:empty,
    targets:[targets[1]],friendlyFire:true});
  assert.equal(enabled.events.find(e=>e.type==='hit').targetId,'P2');
});
test('exact boundary hit and target uniqueness including duplicate target ids',()=>{
  const p=createBroforceProjectile({id:'x',owner:'P1',x:0,y:8});
  const targets=[{id:'E1',x:32,y:0,w:16,h:16},{id:'E1',x:44,y:0,w:16,h:16}];
  const hit=advanceBroforceCombat({projectiles:[p,p],dt:.1,targets,
    isSolid:()=>false,worldBounds:{x:0,y:0,width:128,height:64}});
  assert.equal(hit.events.filter(e=>e.type==='hit').length,1);
  assert.equal(hit.projectiles.length,0);
  const p2=createBroforceProjectile({id:'near',x:127,y:8});
  const out=advanceBroforceCombat({projectiles:[p2],dt:.1,isSolid:()=>false,
    worldBounds:{x:0,y:0,width:128,height:64}});
  assert.equal(out.events.find(e=>e.type==='impact').with,'boundary');
});
test('multiple simultaneous projectiles retain independently keyed hits',()=>{
  const shots=['a','b','c'].map(id=>createBroforceProjectile({id,owner:'P1',x:0,y:20}));
  const out=advanceBroforceCombat({projectiles:shots,dt:.1,isSolid:()=>false,
    targets:[{id:'E',x:30,y:10,w:10,h:20}]});
  assert.deepEqual(plain(out.events.filter(e=>e.type==='hit').map(e=>e.source)),['a','b','c']);
  assert.equal(out.projectiles.length,0);
});
test('explosions damage actual BF-12 terrain, skip steel and provide knockback',()=>{
  const g=ground(8,4,{'3,1':TILE.STONE,'4,1':TILE.STEEL});
  const targets=[{id:'E',x:45,y:18,w:8,h:10},{id:'P2',owner:'P2',x:30,y:15,w:10,h:10}];
  const boom=resolveBroforceExplosion({x:54,y:24,radius:42,damage:3,
    terrain:g.world,targets,owner:'P1',explosionId:'boom'});
  assert.equal(g.world.tiles[11],TILE.EMPTY);
  assert.equal(g.world.tiles[12],TILE.STEEL);
  assert.deepEqual(plain(boom.hitIds),['E']);
  const h=boom.events.find(e=>e.type==='hit');
  assert.ok(Number.isFinite(h.knockback.x) && Number.isFinite(h.knockback.y));
  assert.equal(h.source,'boom');
});
test('volatile explosions chain once, capped, and target dedupe across overlapping blasts',()=>{
  const tiles=Array.from({length:80},(_,i)=>i%2===0?TILE.VOLATILE:TILE.STONE);
  const g=ground(80,1,Object.fromEntries(tiles.map((v,i)=>[String(i)+',0',v])));
  const big={id:'huge',x:0,y:0,w:1280,h:16};
  const boom=resolveBroforceExplosion({x:8,y:8,radius:0,damage:3,terrain:g.world,targets:[big]});
  assert.equal(boom.events.filter(e=>e.type==='hit').length,1);
  assert.ok(boom.terrainResult.blasts.length<=64);
  assert.ok(boom.events.length<=256);
  assert.ok(boom.events.find(e=>e.type==='particles').count<=48);
  const again=resolveBroforceExplosion({x:8,y:8,radius:0,damage:3,terrain:g.world,targets:[]});
  assert.equal(again.terrainResult.destroyed.length,0);
});
test('bullet-triggered volatile chain hits target without double hit or terrain re-damage',()=>{
  const g=ground(10,3,{'3,1':TILE.VOLATILE,'4,1':TILE.WOOD});
  const targets=[{id:'E',x:69,y:16,w:8,h:16}];
  const p=createBroforceProjectile({id:'chain',owner:'P1',x:0,y:24});
  const result=advanceBroforceCombat({projectiles:[p],dt:.1,isSolid:g.solid,
    terrain:g.world,targets});
  assert.equal(g.world.tiles[13],TILE.EMPTY);
  assert.equal(g.world.tiles[14],TILE.EMPTY);
  assert.equal(result.events.filter(e=>e.type==='hit'&&e.targetId==='E').length,1);
});
test('launcher blast, grenade fuse/trajectory, no explosion outside bounds',()=>{
  const targets=[{id:'E',x:30,y:8,w:8,h:16}];
  const rocket=createBroforceProjectile({id:'r',owner:'P1',x:0,y:16,weapon:'launcher'});
  const impact=advanceBroforceCombat({projectiles:[rocket],dt:.1,isSolid:()=>false,targets});
  assert.equal(impact.events.filter(e=>e.type==='hit').length,1);
  assert.equal(impact.events.filter(e=>e.type==='explosion').length,1);
  const grenade=createBroforceProjectile({id:'g',owner:'P1',x:0,y:0,weapon:'grenade'});
  const arc=advanceBroforceCombat({projectiles:[grenade],dt:.1,isSolid:()=>false});
  assert.equal(arc.projectiles.length,1);
  assert.ok(arc.projectiles[0].y>0);
  let live=arc.projectiles,ev=[];
  for(let i=0;i<20;i++){const result=advanceBroforceCombat({projectiles:live,dt:.1,isSolid:()=>false});
    live=result.projectiles;ev.push(...result.events);}
  assert.equal(live.length,0);
  assert.ok(ev.some(e=>e.type==='explosion'));
  const edge=advanceBroforceCombat({projectiles:[rocket],dt:.1,isSolid:()=>false,
    worldBounds:{x:0,y:0,width:4,height:4}});
  assert.equal(edge.events.some(e=>e.type==='explosion'),false);
});
test('grenades ricochet from tile cover while their fuse remains finite',()=>{
  const g=ground(12,5,{'4,1':TILE.STEEL});
  const bomb=createBroforceProjectile({id:'bounce',owner:'P1',x:40,y:24,weapon:'grenade'});
  const first=advanceBroforceCombat({projectiles:[bomb],dt:.1,isSolid:g.solid,terrain:g.world});
  assert.equal(first.projectiles.length,1);
  assert.ok(first.projectiles[0].vx<0);
  assert.ok(first.events.some(e=>e.type==='ricochet'));
  assert.ok(first.projectiles[0].life<bomb.life);
  assert.equal(g.world.tiles[4+12],TILE.STEEL);
});
test('bounded projectile and event counts with invalid dt / offscreen input',()=>{
  const many=Array.from({length:450},(_,i)=>createBroforceProjectile({id:i,x:0,y:0}));
  const out=advanceBroforceCombat({projectiles:many,dt:Infinity,isSolid:()=>false});
  assert.equal(out.projectiles.length,256);
  assert.ok(out.events.length<=256);
  const none=advanceBroforceCombat({projectiles:[{id:'bad',x:NaN,y:0,vx:100,vy:0,life:1}],dt:.1});
  assert.equal(none.projectiles.length,0);
});
test('30/60fps projectile replay holds subpixel positions with no obstacles',()=>{
  const start=createBroforceProjectile({id:'trace',owner:'P1',x:11,y:11,
    dir:{x:1,y:-.6},weapon:'grenade'});
  const walk=fps=>{
    let active=[start],events=[];
    for(let i=0;i<30*fps/30;i++){
      const s=advanceBroforceCombat({projectiles:active,dt:1/fps,isSolid:()=>false});
      active=s.projectiles;events.push(...s.events);
    }
    return {active,events};
  };
  const a=walk(30),b=walk(60);
  assert.equal(a.active.length,b.active.length);
  assert.ok(Math.abs(a.active[0].x-b.active[0].x)<1e-6);
  assert.ok(Math.abs(a.active[0].y-b.active[0].y)<1e-6);
});
console.log('BF-14: ' + passed + ' focused checks passed');
