// BF-11 deterministic simulation / safety test. Runs without bundling or external packages.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {runInNewContext} from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '../src/engines/broforce/director.js'), 'utf8');
const scope = {exports: {}};
runInNewContext(source, scope, {filename: 'src/engines/broforce/director.js'});
const {createBroforceDirector: create, advanceBroforceDirector: advance} = scope.exports;
assert.equal(typeof create, 'function');
assert.equal(typeof advance, 'function');
const plain = x => JSON.parse(JSON.stringify(x)); // Handles objects crossing the VM realm.
const markers = Array.from({length: 94}, (_, i) => ({id: 'enc-' + i, x: 460 + i * 68, y: 210, type: i % 5 === 0 ? 'gunner' : i % 7 === 0 ? 'charger' : 'patrol'}));
const scene = () => ({
  players: [{x: 105, y: 210, alive: true}, {x: 130, y: 210, alive: true}],
  camera: {x: 0, y: 0, width: 390, height: 520},
  world: {width: 7000, height: 640}, activeEnemies: 0, spawnMarkers: markers
});
let passed = 0;
function check(title, fn) {
  fn();
  passed++;
  console.log('PASS', title);
}
function drive(seed, fps, seconds = 128, varied = true) {
  let state = create({seed, difficulty: 1.3});
  const events = [];
  const dt = 1 / fps;
  for (let frame = 0; frame < seconds * fps; frame++) {
    const input = scene();
    const phase = Math.floor(frame / (fps * 2)); // Identical camera snapshots at both frame rates.
    input.camera.x = varied ? Math.min(6300, phase * 93) : 0;
    input.players[0].x = input.camera.x + 100;
    input.players[1].x = input.camera.x + 124;
    const result = advance(state, dt, input);
    state = result.state;
    for (const event of result.events) events.push(plain(event));
  }
  return {state: plain(state), events};
}

check('same seed, 30/60 fps and repeated playback produce the same sequence and snapshot', () => {
  const a = drive('a-stage-seed', 30), b = drive('a-stage-seed', 60);
  assert.deepEqual(a, b);
  assert.deepEqual(a, drive('a-stage-seed', 60));
  assert(a.events.length >= 10, 'encounter sequence should be nontrivial');
  assert.notDeepEqual(a.events, drive('another-stage-seed', 60).events);
  assert(a.events.every(e => Number.isFinite(e.x) && Number.isFinite(e.y)));
});

check('director does not touch Math.random, input state, or player/scene data', () => {
  const before = create({seed: 19});
  const input = scene(), snapshot = plain(input);
  const other = plain(before);
  const result = advance(before, 0.1, input);
  // Function source is isolated and never requests global random draws.
  assert.equal(source.includes('Math.random'), false);
  assert.deepEqual(plain(before), other);
  assert.deepEqual(plain(input), snapshot);
  assert.notEqual(result.state, before);
  assert.doesNotThrow(() => JSON.stringify(result));
});

check('paused, disabled, zero dt and explicitly paused states never advance or spawn', () => {
  const base = create();
  for (const override of [{paused: true}, {disabled: true}, {enabled: false}, {phase: 'paused'}, {phase: 'disabled'}]) {
    const result = advance(base, 15, {...scene(), ...override});
    assert.deepEqual(plain(result.state), plain(base));
    assert.deepEqual(plain(result.events), []);
  }
  for (const dt of [0, -9, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = advance(base, dt, scene());
    assert.deepEqual(plain(result.state), plain(base));
    assert.equal(result.events.length, 0);
  }
  const paused = {...base, phase: 'paused'};
  assert.equal(advance(paused, 20, scene()).state.tick, 0);
});

check('completed is latched and never produces subsequent events', () => {
  let state = drive(1, 60, 15, false).state;
  const before = state.tick;
  let result = advance(state, 1, {...scene(), completed: true});
  assert.equal(result.state.phase, 'completed');
  assert.equal(result.state.tick, before);
  result = advance(result.state, 60, scene());
  assert.equal(result.state.tick, before);
  assert.deepEqual(plain(result.events), []);
});

check('boss lockdown is permanent, preceded by quiet lead-in, and triggered explicitly too', () => {
  for (const flags of [{bossZone: true}, {bossActive: true}, {phase: 'boss'}]) {
    const a = advance(create(), 1 / 60, {...scene(), ...flags});
    assert.equal(a.state.phase, 'boss');
    assert.equal(a.events.length, 0);
    assert.equal(advance(a.state, 10, scene()).events.length, 0);
    assert.equal(advance(a.state, 10, {...scene(), completed: true}).state.phase, 'completed');
  }
  let s = drive(9, 60, 13, false).state;
  const quiet = scene(); quiet.camera.x = 0.80 * quiet.world.width - quiet.camera.width / 2;
  for (let i = 0; i < 600; i++) {
    const r = advance(s, 1 / 60, quiet); s = r.state;
    assert.equal(r.events.length, 0);
  }
  assert.equal(s.phase, 'active');
  quiet.camera.x = quiet.world.width * 0.94;
  assert.equal(advance(s, 1 / 60, quiet).state.phase, 'boss');
});

check('spawns outside camera, starting safe zone and any player collision rectangle', () => {
  let s = create({seed: 8});
  const input = scene();
  input.spawnMarkers = [
    {id: 'checkpoint', x: 12, y: 210, type: 'grunt'},
    {id: 'on-screen', x: 250, y: 210, type: 'gunner'},
    {id: 'overlap-p2', x: 520, y: 210, type: 'charger'},
    {id: 'valid', x: 680, y: 210, type: 'grunt'}
  ];
  input.players[1].x = 520;
  const events = [];
  for (let i = 0; i < 900; i++) {
    const result = advance(s, 1 / 60, input); s = result.state; events.push(...plain(result.events));
  }
  assert(events.length >= 1);
  assert(events.every(e => e.x === 680 && e.x > input.camera.x + input.camera.width && e.x >= 240));
  assert(events.every(e => Math.abs(e.x - input.players[1].x) >= 120));
  assert.equal(events.length, 2, 'each marker can be spawned at most twice');
});

check('live-enemy cap, wipe, near-zero viewports and malformed markers are safe', () => {
  const full = {...scene(), activeEnemies: 9999};
  let s = create();
  for (let i = 0; i < 800; i++) {
    const r = advance(s, 1 / 60, full); s = r.state; assert.equal(r.events.length, 0);
  }
  const dead = scene(); dead.players.forEach(p => {p.alive = false;});
  assert.equal(drive(7, 60, 10, false).events.length > 0, true);
  s = create();
  for (let i = 0; i < 700; i++) {
    const r = advance(s, 1 / 60, dead); s = r.state; assert.equal(r.events.length, 0);
  }
  for (const [width, height] of [[0, 500], [390, 0], [1, 1], [-1, 300], [100000, 8]]) {
    const input = scene(); input.camera.width = width; input.camera.height = height;
    input.spawnMarkers = [{id: 'oops', x: Number.NaN, y: Infinity}, {id: 'bad', x: -5, y: 0}];
    let state = create();
    for (let i = 0; i < 700; i++) {
      const r = advance(state, 1 / 60, input); state = r.state; assert.equal(r.events.length, 0);
    }
    assert.doesNotThrow(() => JSON.stringify(state));
  }
});

check('bounded mission total, per-step event counts, marker reuse and state size', () => {
  let state = create({seed: 77, difficulty: 4});
  const input = scene();
  input.spawnMarkers = Array.from({length: 300}, (_, i) => ({id: 'marker-' + i, x: 400 + (i % 100) * 6, y: 210}));
  let total = 0;
  for (let i = 0; i < 180 * 60; i++) {
    const r = advance(state, 1 / 60, input); state = r.state;
    assert(r.events.length <= 1, 'no unbounded wave per tick');
    total += r.events.length;
  }
  assert(total > 10);
  assert(total <= 56);
  assert.equal(state.spawnedTotal, total);
  assert(state.markerUses.length <= total);
  assert(state.markerUses.every(x => x.count <= 2));
  assert(JSON.stringify(state).length < 10000, 'serializable state is bounded');
  assert(state.nextSpawnTick >= state.tick || total === 56 || state.spawnedTotal >= 56 - 1);
});

check('finite dt clamp, serializable replay, local RNG, and three enemy archetypes', () => {
  const initial = create({seed: 0, difficulty: 1});
  const r = advance(initial, 1000000, scene());
  assert.equal(r.state.tick, 6, 'dt is capped at six fixed simulation ticks');
  const elapsed = drive(1122, 60, 35, false);
  let replay = plain(elapsed.state);
  const branchA = [], branchB = [];
  for (let i = 0; i < 2000; i++) {
    let a = advance(replay, 1 / 60, scene()); replay = plain(a.state); branchA.push(...plain(a.events));
  }
  let restored = JSON.parse(JSON.stringify(elapsed.state));
  for (let i = 0; i < 2000; i++) {
    let b = advance(restored, 1 / 60, scene()); restored = plain(b.state); branchB.push(...plain(b.events));
  }
  assert.deepEqual(branchA, branchB);
  assert.deepEqual(replay, restored);
  const gotTypes = new Set();
  for (let seed = 1; seed < 8; seed++) {
    for (const event of drive(seed, 60, 115).events) gotTypes.add(event.enemyType);
  }
  assert.deepEqual([...gotTypes].sort(), ['charger', 'grunt', 'gunner']);
});

console.log('PASS ' + passed + '/' + passed + ' Broforce director checks');
