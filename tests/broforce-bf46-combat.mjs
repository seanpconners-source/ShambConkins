// BF-46 — adversarial combat/terrain contracts, using actual BF-12 and BF-14 modules.
// Run: node tests/broforce-bf46-combat.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function load(name, injected = {}) {
  const exports = {};
  runInNewContext(readFileSync(resolve(root, 'src/engines/broforce/' + name + '.js'), 'utf8'),
    {exports, Uint8Array, require(path) {
      if (path !== 'src/engines/broforce/terrain.js') throw Error('Unexpected require: ' + path);
      return injected.terrain;
    }}, {filename: 'broforce/' + name + '.js', timeout: 5000});
  return exports;
}
const terrain = load('terrain');
const combat = load('combat', {terrain});
const {TILE, createTerrain, isSolidTile} = terrain;
const {createBroforceProjectile, fireBroforceWeapon, advanceBroforceCombat,
  resolveBroforceExplosion, WEAPON_SPECS} = combat;
const plain = value => JSON.parse(JSON.stringify(value));
function ground(width, height, filled = {}) {
  const tiles = Array(width * height).fill(TILE.EMPTY);
  for (const [key, type] of Object.entries(filled)) {
    const [col, row] = key.split(',').map(Number);
    tiles[row * width + col] = type;
  }
  const world = createTerrain({width, height, tiles});
  return {world, solid: (c, r) => isSolidTile(world, c, r)};
}

// BEGIN_BF46_ASSERTIONS
let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('PASS BF-46 ' + name);
}

test('120Hz burst offset integrates only the time remaining in its emission tick', () => {
  const step = 1 / 120;
  let state, late;
  for (let i = 0; i < 12; i++) {
    const shot = fireBroforceWeapon({state, owner: 'P1', weapon: 'rifle',
      x: 0, y: 8, fireHeld: true, dir: 1, seed: 12, dt: step});
    state = shot.state;
    if (shot.events.some(e => e.sequence === 1)) {
      late = {event: shot.events.find(e => e.sequence === 1),
        round: shot.projectiles[0]};
      break;
    }
  }
  assert.ok(late, 'second burst shot was scheduled');
  assert.ok(late.event.at > 0 && late.event.at < step);
  assert.ok(Math.abs(late.event.at - (.062 - 7 * step)) < 1e-8);
  const target = [{id: 'E', x: 6, y: 0, w: 2, h: 16}];
  const correct = advanceBroforceCombat({projectiles: [late.round],
    dt: step - late.event.at, targets: target});
  const incorrectlyFullTick = advanceBroforceCombat({projectiles: [late.round],
    dt: step, targets: target});
  assert.equal(correct.events.some(e => e.type === 'hit'), false);
  assert.equal(incorrectlyFullTick.events.some(e => e.type === 'hit'), true);
  assert.equal(correct.projectiles.length, 1);
});

test('30/60fps rifle, pistol, shotgun IDs and fired-at timestamps agree', () => {
  const collect = (weapon, fps) => {
    let state, shots = [], events = [];
    for (let i = 0; i < fps; i++) {
      const fire = fireBroforceWeapon({state, owner: 'P1', weapon, fireHeld: true,
        dt: 1 / fps, seed: 419});
      state = fire.state;
      shots.push(...fire.projectiles.map(p => p.id));
      events.push(...fire.events.map(e => [e.sequence, Math.round((i / fps + e.at) * 1e6)]));
    }
    return {shots, events};
  };
  for (const weapon of ['rifle', 'pistol', 'shotgun']) {
    const a = collect(weapon, 30), b = collect(weapon, 60);
    assert.deepEqual(a, b, weapon);
    assert.equal(new Set(a.shots).size, a.shots.length, weapon + ' duplicate projectile IDs');
  }
});

test('freshly broken cover is absent for the next projectile in the same tick', () => {
  const g = ground(8, 3, {'1,1': TILE.WOOD});
  const projectiles = ['first', 'second'].map(id =>
    createBroforceProjectile({id, owner: 'P1', x: 0, y: 24, weapon: 'pistol'}));
  const out = advanceBroforceCombat({projectiles, dt: .1, isSolid: g.solid,
    terrain: g.world, targets: [{id: 'E', x: 40, y: 18, w: 10, h: 12}]});
  assert.equal(g.world.tiles[9], TILE.EMPTY);
  assert.equal(g.world.revision, 1, 'single terrain transaction');
  assert.equal(out.events.filter(e => e.type === 'terrain-damage').length, 1);
  assert.equal(out.events.filter(e => e.type === 'hit').length, 1);
  assert.equal(out.events.find(e => e.type === 'hit').source, 'second');
  assert.equal(out.events.filter(e => e.type === 'impact' && e.with === 'terrain').length, 1);
});

test('volatile chain damages real cover and cage once, not friendly P2', () => {
  const g = ground(10, 4, {'2,1': TILE.VOLATILE, '3,1': TILE.WOOD,
    '4,1': TILE.STONE, '6,1': TILE.STEEL});
  const targets = [{id: 'cage:0', x: 58, y: 20, w: 8, h: 12},
    {id: 'cage:0', x: 58, y: 20, w: 8, h: 12},
    {id: 'P2', owner: 'P2', kind: 'player', x: 55, y: 20, w: 8, h: 12}];
  const boom = resolveBroforceExplosion({x: 40, y: 24, radius: 0,
    damage: 1, terrain: g.world, targets, owner: 'P1', explosionId: 'blast'});
  assert.equal(g.world.tiles[12], TILE.EMPTY);
  assert.equal(g.world.tiles[13], TILE.EMPTY);
  assert.equal(g.world.hp[14], 1);
  assert.equal(g.world.tiles[16], TILE.STEEL);
  assert.equal(g.world.revision, 1);
  assert.deepEqual(plain(boom.hitIds), ['cage:0']);
  assert.equal(boom.events.filter(e => e.type === 'hit').length, 1);
  assert.equal(new Set(boom.terrainResult.destroyed.map(t => t.col + ':' + t.row)).size,
    boom.terrainResult.destroyed.length);
});

test('embedded steel grenade cannot stall its fuse at repeated zero-time impacts', () => {
  const run = fps => {
    const g = ground(12, 4, {'4,1': TILE.STEEL});
    let active = [createBroforceProjectile({id: 'steel', owner: 'P1',
      weapon: 'grenade', x: 70, y: 24})];
    let blasts = 0, elapsed = 0;
    for (let frame = 0; frame < 2 * fps && active.length; frame++) {
      const tick = advanceBroforceCombat({projectiles: active, dt: 1 / fps,
        isSolid: g.solid, terrain: g.world});
      active = tick.projectiles;
      blasts += tick.events.filter(e => e.type === 'explosion' && e.source === 'steel').length;
      elapsed += 1 / fps;
    }
    assert.equal(active.length, 0, 'grenade lifetime must finish');
    assert.equal(blasts, 1, 'fuse causes exactly one explosion');
    assert.equal(g.world.tiles[16], TILE.STEEL);
    return elapsed;
  };
  const a = run(30), b = run(60);
  assert.ok(Math.abs(a - 1.25) <= 1 / 30 + 1e-8);
  assert.ok(Math.abs(b - 1.25) <= 1 / 60 + 1e-8);
  assert.ok(Math.abs(a - b) <= 1 / 30 + 1e-8);
});

test('grenade ricochet spends the remainder of its tick and matches 30/60fps', () => {
  const walk = fps => {
    const g = ground(12, 4, {'4,1': TILE.STEEL});
    let active = [createBroforceProjectile({id: 'bounce', owner: 'P1',
      weapon: 'grenade', x: 40, y: 24})];
    let ricochets = 0, at200;
    for (let i = 0; i < fps / 5; i++) {
      const tick = advanceBroforceCombat({projectiles: active, dt: 1 / fps,
        isSolid: g.solid, terrain: g.world});
      active = tick.projectiles;
      ricochets += tick.events.filter(e => e.type === 'ricochet').length;
      assert.equal(active.length, 1);
      if (i === fps / 5 - 1) at200 = plain(active[0]);
    }
    return {at200, ricochets};
  };
  const a = walk(30), b = walk(60);
  assert.ok(a.ricochets > 0 && b.ricochets > 0);
  assert.ok(a.at200.x < 63, 'must travel away from contact during tick');
  assert.ok(Math.abs(a.at200.x - b.at200.x) < .1);
  assert.ok(Math.abs(a.at200.y - b.at200.y) < .5);
  assert.ok(Math.abs(a.at200.life - b.at200.life) < 1e-8);
});

test('same projectile ID is processed once and never damages its owner', () => {
  const p = createBroforceProjectile({id: 'dup', owner: 'P1', x: 0, y: 24});
  const enemies = [{id: 'P2', owner: 'P2', kind: 'player', x: 20, y: 16, w: 8, h: 16},
    {id: 'E', x: 40, y: 16, w: 8, h: 16}];
  const r = advanceBroforceCombat({projectiles: [p, p], dt: .1, targets: enemies});
  assert.deepEqual(plain(r.events.filter(e => e.type === 'hit').map(e => e.targetId)), ['E']);
  assert.equal(r.events.filter(e => e.type === 'hit').length, 1);
});

test('projectile lifetime and protected stage boundary do not spawn stray damage', () => {
  const shot = createBroforceProjectile({id: 'life', x: 5, y: 8});
  let active = [shot], events = [];
  for (let n = 0; n < 20 && active.length; n++) {
    const result = advanceBroforceCombat({projectiles: active, dt: .1});
    active = result.projectiles; events.push(...result.events);
  }
  assert.equal(active.length, 0);
  assert.equal(events.filter(e => e.type === 'hit').length, 0);
  assert.equal(events.filter(e => e.type === 'explosion').length, 0);
  const explosive = createBroforceProjectile({id: 'edge', weapon: 'launcher',
    x: 15, y: 8, dir: 1});
  const edge = advanceBroforceCombat({projectiles: [explosive], dt: .1,
    worldBounds: {x: 0, y: 0, width: 16, height: 16}});
  assert.equal(edge.events.some(e => e.type === 'explosion'), false);
});
// END_BF46_ASSERTIONS
console.log('BF-46: ' + passed + ' adversarial checks passed');
