// Standalone: node tests/broforce-enemies.mjs (no module registration required).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function load(relative, deps = {}) {
  const path = new URL(relative, import.meta.url);
  const context = {exports: {}, require: name => {
    if (name in deps) return deps[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }};
  runInNewContext(readFileSync(path, 'utf8'), context, {filename: relative, timeout: 3000});
  return context.exports;
}
const physics = load('../src/engines/broforce/physics.js');
const {createBroforceEnemy: create, advanceBroforceEnemies: advance} = load('../src/engines/broforce/enemies.js', {
  'src/engines/broforce/physics.js': physics
});
const floor = (col, row) => row >= 10;
const bounds = {width: 640, height: 160};
const opts = (more = {}) => ({players: [], isSolid: floor, worldBounds: bounds, rand: () => .5, ...more});
const player = (id, x, alive = true, y = 146) => ({id, x, y, alive});
function run(input, seconds, hz = 60, options = {}) {
  let enemies = input, events = [];
  for (let i = 0; i < Math.round(seconds * hz); i++) {
    const result = advance(enemies, opts({dt: 1 / hz, ...options}));
    enemies = result.enemies; events.push(...result.events);
  }
  return {enemies, events};
}
const near = (a, b, tolerance = 0.0001) => assert.ok(Math.abs(a - b) <= tolerance,
  `${a} !== ${b} within ${tolerance}`);
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('canonical types, shape, finite defaults, no global randomness or side effects', () => {
  for (const type of ['rifleman', 'melee', 'turret', 'carrier']) {
    const e = create({id: `e-${type}`, type, x: 100, y: 136, seed: 17});
    assert.equal(e.type, type); assert.equal(e.id, `e-${type}`);
    assert.equal(e.state, 'patrol'); assert.ok(e.hp > 0 && Number.isFinite(e.x));
    assert.ok(e.spawnGrace > 0);
  }
  assert.equal(create({type: 'explosive-carrier'}).type, 'carrier');
  const a = create({x: Infinity, y: NaN, seed: NaN});
  assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y));
  const original = create({id: 'immut', x: 32, y: 136});
  advance([original], opts({dt: 1 / 60}));
  assert.equal(original.x, 32); assert.equal(original._aiRemainder, 0);
});

test('closest living player only, paired owners are kept distinct', () => {
  const e = create({id: 'rifle', x: 40, y: 136});
  const {events} = run([e], 1.12, 60, {players: [player('P1', 215), player('P2', 100), player('dead', 56, false)]});
  assert.equal(events.find(v => v.type === 'alert')?.targetId, 'P2');
  assert.equal(events.find(v => v.type === 'attack-tell')?.targetId, 'P2');
  assert.equal(events.find(v => v.type === 'enemy-shot')?.targetId, 'P2');
});

test('appearance grace + aim tell; no shot during initial warning', () => {
  const e = create({id: 'safe', x: 40, y: 136});
  const a = run([e], .5, 60, {players: [player('P1', 135)]});
  assert.ok(!a.events.some(v => v.type === 'enemy-shot' || v.type === 'attack-tell'));
  const b = run(a.enemies, .13, 60, {players: [player('P1', 135)]});
  assert.equal(b.events.filter(v => v.type === 'attack-tell').length, 1);
  assert.equal(b.events.filter(v => v.type === 'enemy-shot').length, 0);
  const c = run(b.enemies, .42, 60, {players: [player('P1', 135)]});
  assert.equal(c.events.filter(v => v.type === 'enemy-shot').length, 1);
});

test('patrol reverses near anchor, stays on ledges and stops at a wall', () => {
  const e = create({id: 'patrol', x: 55, y: 136, seed: 1});
  const progressed = run([e], .75);
  assert.ok(progressed.enemies[0].x > e.x + 10);
  const returned = run(progressed.enemies, 3.5);
  assert.ok(returned.enemies[0].x < 180 && returned.enemies[0].x > 0);
  const ledge = (c, r) => r >= 10 && c < 5;
  const edge = run([create({id: 'edge', x: 30, y: 136})], 2, 60, {isSolid: ledge});
  assert.ok(edge.enemies[0].x + 12 <= 80 + 1, `walked into gap: ${edge.enemies[0].x}`);
  const wall = (c, r) => r >= 10 || (c === 5 && r >= 0);
  const hit = run([create({id: 'wall', x: 50, y: 136})], 2, 60, {isSolid: wall});
  assert.ok(hit.enemies[0].x <= 68 + 1e-3);
});

test('walls and intervening cover block line of sight and shooting', () => {
  const wall = (col, row) => row >= 10 || (col === 7 && row >= 0 && row < 10);
  const {events} = run([create({id: 'blocked', x: 43, y: 136})], 2, 60, {
    isSolid: wall, players: [player('P1', 200)]
  });
  assert.ok(!events.some(v => ['alert', 'attack-tell', 'enemy-shot'].includes(v.type)));
});

test('melee pursues, telegraphs, and emits a one-time contact hit per swing', () => {
  const {events, enemies} = run([create({id: 'runner', type: 'melee', x: 35, y: 136})], 2, 60, {
    players: [player('P2', 110)]
  });
  assert.ok(events.some(v => v.type === 'alert'));
  assert.ok(events.some(v => v.type === 'attack-tell'));
  const hits = events.filter(v => v.type === 'contact-hit');
  assert.ok(hits.length >= 1 && hits.length <= 3, `melee hits ${hits.length}`);
  assert.ok(enemies[0].x > 35, 'closed distance');
  assert.equal(new Set(events.map(v => v.eventId)).size, events.length);
  assert.ok(!events.some(v => v.type === 'enemy-shot'));
});

test('turrets stay planted horizontally and only fire after a visible tell', () => {
  const initial = create({id: 'turret', type: 'turret', x: 75, y: 136});
  initial.vx = 100;
  const {events, enemies} = run([initial], 1.3, 60, {players: [player('P1', 200)]});
  near(enemies[0].x, 75);
  assert.ok(events.some(v => v.type === 'enemy-shot'));
  assert.ok(events.findIndex(v => v.type === 'attack-tell') < events.findIndex(v => v.type === 'enemy-shot'));
});

test('carrier warns then explodes exactly once and is dead afterward', () => {
  const {events, enemies} = run([create({id: 'boom', type: 'carrier', x: 48, y: 136})], 3, 60, {
    players: [player('P1', 112)]
  });
  assert.equal(events.filter(v => v.type === 'enemy-explosion').length, 1);
  assert.equal(events.filter(v => v.type === 'enemy-down').length, 1);
  assert.equal(enemies[0].state, 'dead');
  assert.ok(!events.some(v => v.type === 'enemy-shot'));
  assert.ok(events.findIndex(v => v.type === 'attack-tell') < events.findIndex(v => v.type === 'enemy-explosion'));
});

test('external damage gives hit recovery; lethal damage emits one down and suppresses attacks', () => {
  let e = create({id: 'damage', x: 40, y: 136});
  const first = run([e], .2, 60, {players: [player('P1', 120)]});
  e = {...first.enemies[0], hp: 1};
  const hurt = advance([e], opts({dt: 1 / 60, players: [player('P1', 120)]}));
  assert.deepEqual(Array.from(hurt.events, x => x.type), ['enemy-hit']);
  e = {...hurt.enemies[0], hp: 0};
  const dead = advance([e], opts({dt: 1 / 60, players: [player('P1', 120)]}));
  assert.deepEqual(Array.from(dead.events, x => x.type), ['enemy-down']);
  const after = run(dead.enemies, 3, 60, {players: [player('P1', 120)]});
  assert.equal(after.events.length, 0); assert.equal(after.enemies[0].hp, 0);
});

test('dead or hidden original target cancels pending shot rather than switching mid-tell', () => {
  const {enemies, events} = run([create({id: 'retarget', x: 50, y: 136})], .7, 60, {
    players: [player('P1', 100), player('P2', 160)]
  });
  assert.ok(events.some(v => v.type === 'attack-tell'));
  const switched = run(enemies, .2, 60, {players: [player('P1', 100, false), player('P2', 160)]});
  assert.ok(!switched.events.some(v => v.type === 'enemy-shot'));
  const next = run(switched.enemies, .9, 60, {players: [player('P1', 100, false), player('P2', 160)]});
  assert.ok(next.events.some(v => v.type === 'enemy-shot' && v.targetId === 'P2'));
});

test('pause freezes all state, timers and event delivery', () => {
  const enemies = [create({id: 'pause', x: 50, y: 136})];
  const advanced = advance(enemies, opts({dt: 10, paused: true, players: [player('P1', 90)]}));
  assert.equal(advanced.events.length, 0);
  assert.equal(advanced.enemies[0].x, enemies[0].x);
  assert.equal(advanced.enemies[0].spawnGrace, enemies[0].spawnGrace);
});

test('30/60/120 Hz agree on events and positions with fixed-step accumulation', () => {
  const scenario = hz => run([
    create({id: 'a', type: 'rifleman', x: 50, y: 136, seed: 7}),
    create({id: 'b', type: 'melee', x: 255, y: 136, seed: 9}),
    create({id: 'c', type: 'turret', x: 340, y: 138, seed: 3})
  ], 2, hz, {players: [player('P1', 140), player('P2', 295)]});
  const a = scenario(30), b = scenario(60), c = scenario(120);
  for (const v of [b, c]) {
    assert.deepEqual(v.events.map(e => [e.type,e.enemyId,e.targetId,e.eventId]),
      a.events.map(e => [e.type,e.enemyId,e.targetId,e.eventId]));
    for (let i = 0; i < a.enemies.length; i++) {
      near(a.enemies[i].x, v.enemies[i].x);
      near(a.enemies[i].y, v.enemies[i].y);
    }
  }
});

test('clamps dt, bogus bodies, input length, and duplicate entity IDs', () => {
  const array = Array.from({length: 50}, (_, i) => create({id: i < 2 ? 'same' : `e${i}`, x: 30, y: 136}));
  array[0].x = NaN; array[0].vy = Infinity;
  const data = advance(array, opts({dt: 10000, worldBounds: {width: 90, height: 160}}));
  assert.equal(data.enemies.length, 24);
  assert.equal(new Set(data.enemies.map(e => e.id)).size, 24);
  assert.ok(data.enemies.every(e => Number.isFinite(e.x) && Number.isFinite(e.y) &&
    e.x >= 0 && e.x + e.w <= 90 && e.y + e.h <= 160));
  assert.ok(data.enemies[1]._aiRemainder >= 0);
  assert.ok(data.enemies[1].spawnGrace >= .44, 'one call never simulates huge dt');
});

test('external dead state emits exactly once even with zero dt', () => {
  const fromCombat = {...create({id: 'marked-dead', x: 75, y: 136}), state: 'dead'};
  const first = advance([fromCombat], opts({dt: 0}));
  assert.equal(first.events.filter(v => v.type === 'enemy-down').length, 1);
  const second = advance(first.enemies, opts({dt: 0}));
  assert.equal(second.events.length, 0);
  assert.equal(second.enemies[0].dead, true);
});

let failures = 0;
for (const [name, fn] of tests) {
  try {fn(); console.log(`PASS ${name}`);} catch (e) {failures++; console.error(`FAIL ${name}`); console.error(e.stack);}
}
console.log(`${tests.length - failures}/${tests.length} BF-15 enemy tests passed`);
if (failures) process.exitCode = 1;
