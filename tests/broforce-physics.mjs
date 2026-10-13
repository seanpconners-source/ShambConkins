// Standalone test: node tests/broforce-physics.mjs. Loads the unregistered CommonJS engine in a VM.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source = readFileSync(new URL('../src/engines/broforce/physics.js', import.meta.url), 'utf8');
const context = {exports: {}};
runInNewContext(source, context, {filename: 'src/engines/broforce/physics.js', timeout: 2000});
const {createBody, advanceBody} = context.exports;
assert.equal(typeof createBody, 'function');
assert.equal(typeof advanceBody, 'function');
const step = (b, input, dt, solid, tuning) => advanceBody(b, input, dt, solid, tuning);
const floor = (c, r) => r >= 10;
const simulate = (b, input, duration, hz, solid = floor, tuning) => {
  for (let i = 0; i < Math.round(duration * hz); i++) b = step(b, input, 1 / hz, solid, tuning);
  return b;
};
const near = (actual, expected, eps = 1e-4) => assert.ok(Math.abs(actual - expected) <= eps, `${actual} differs from ${expected} by more than ${eps}`);
const tests = [];
function test(name, fn) { tests.push({name, fn}); }

test('createBody defaults and caller overrides', () => {
  const b = createBody({x: 14, y: 30, vx: 17, facing: -1, jumpBuffer: .04, label: 'solo'});
  assert.equal(b.x, 14); assert.equal(b.y, 30); assert.equal(b.w, 12); assert.equal(b.h, 26);
  assert.equal(b.vx, 17); assert.equal(b.vy, 0); assert.equal(b.facing, -1);
  assert.equal(b.onGround, false); assert.equal(b.coyote, 0); assert.equal(b.jumpBuffer, .04);
  assert.equal(b.label, 'solo');
});

test('landing flush on floor with downward velocity capped', () => {
  let b = createBody({x: 20, y: 0, vy: 900});
  b = simulate(b, {}, 1, 60);
  near(b.y, 134); assert.equal(b.vy, 0); assert.equal(b.onGround, true);
  near(b.coyote, .08);
});

test('horizontal acceleration and ground friction', () => {
  let b = simulate(createBody({x: 0, y: 134}), {move: 1}, .5, 60);
  assert.ok(b.vx > 124 && b.vx <= 125, `vx=${b.vx}`);
  const x = b.x;
  b = simulate(b, {move: 0}, .3, 60);
  assert.equal(b.vx, 0); assert.ok(b.x > x);
  assert.equal(b.facing, 1);
  b = step(b, {move: -1}, 1 / 60, floor);
  assert.equal(b.facing, -1); assert.ok(b.vx < 0);
});

test('wall collision stops horizontal movement exactly at wall', () => {
  const wall = (c,r) => r >= 10 || c === 5;
  const b = simulate(createBody({x: 20, y: 134}), {move: 1}, 1, 60, wall);
  near(b.x, 68); assert.equal(b.vx, 0); assert.equal(b.onGround, true);
});

test('ceiling stops upward velocity with no false grounding', () => {
  const ceiling = (c,r) => r >= 10 || r === 6;
  const start = createBody({x: 32, y: 134});
  let b = step(start, {jumpPressed: true, jumpHeld: true}, 1 / 60, ceiling);
  assert.ok(b.vy < 0);
  b = simulate(b, {jumpHeld: true}, .3, 60, ceiling);
  assert.ok(b.y >= 112 - 1e-6, `ceiling y=${b.y}`); // ceiling row 6 ends at 112
  // It must have hit the underside of the ceiling, not passed through.
  assert.ok(b.y > 112, `actor should remain below underside, y=${b.y}`);
});

test('ledge fall clears grounded state and accelerates downward', () => {
  const ledge = (c,r) => r >= 10 && c < 3;
  let b = simulate(createBody({x: 32, y: 134}), {move: 1}, .35, 60, ledge);
  assert.ok(b.x > 48, `x=${b.x}`);
  assert.equal(b.onGround, false); assert.ok(b.vy > 0);
});

test('coyote jump works shortly after leaving and expires', () => {
  const ledge = (c,r) => r >= 10 && c < 3;
  let b = simulate(createBody({x: 44, y: 134, vx: 125}), {move: 1}, .15, 60, ledge);
  assert.equal(b.onGround, false);
  // Falling for .15 s might already expire coyote: create a closer test start.
  b = simulate(createBody({x: 44, y: 134, vx: 125}), {move: 1}, .067, 120, ledge);
  assert.equal(b.onGround, false);
  const jumped = step(b, {jumpPressed: true, jumpHeld: true}, 1 / 60, ledge);
  assert.ok(jumped.vy < 0, `coyote jump vy=${jumped.vy}`);
  b = simulate(createBody({x: 44, y: 134, vx: 125}), {move: 1}, .18, 60, ledge);
  assert.equal(b.onGround, false); near(b.coyote, 0);
  const late = step(b, {jumpPressed: true, jumpHeld: true}, 1 / 60, ledge);
  assert.ok(late.vy > 0, `expired coyote jump vy=${late.vy}`);
});

test('buffered jump launches when landing before the buffer expires', () => {
  let b = createBody({x: 20, y: 118, vy: 200});
  b = step(b, {jumpPressed: true, jumpHeld: true}, 1 / 60, floor);
  assert.ok(b.vy > 0, 'still falling when button is pressed');
  b = simulate(b, {jumpHeld: true}, .14, 120, floor);
  assert.ok(b.vy < 0, `expected buffered launch, vy=${b.vy}`);
  assert.equal(b.jumpBuffer, 0);
});

test('short tap jumps lower than holding jump', () => {
  const start = createBody({x: 20, y: 134});
  const launch = step(start, {jumpPressed: true, jumpHeld: true}, 1 / 120, floor);
  const held = simulate(launch, {jumpHeld: true}, .30, 120);
  const tapped = simulate(launch, {jumpHeld: false}, .30, 120);
  assert.ok(tapped.y > held.y + 18, `tap y=${tapped.y} hold y=${held.y}`);
});

test('30/60/120 Hz are frame-rate stable over identical inputs', () => {
  const run = hz => {
    let b = createBody({x: 20, y: 134});
    b = step(b, {move: 1, jumpPressed: true, jumpHeld: true}, 1 / hz, floor);
    b = simulate(b, {move: 1, jumpHeld: true}, .5 - 1 / hz, hz);
    return simulate(b, {move: -1, jumpHeld: false}, .5, hz);
  };
  const a = run(30), b = run(60), c = run(120);
  for (const field of ['x', 'y', 'vx', 'vy']) {
    near(a[field], b[field], 0.05);
    near(b[field], c[field], 0.05);
  }
});

test('high speed crosses many empty tiles but never tunnels through wall or floor', () => {
  const wall = (c,r) => c === 6;
  let b = step(createBody({x: 0, y: 32, vx: 9600}), {move: 1}, .1, wall);
  near(b.x, 84); assert.equal(b.vx, 0);
  const platform = (c,r) => r === 10;
  b = step(createBody({x: 32, y: 0, vy: 9200}), {}, .1, platform, {maxFallSpeed: 10000});
  near(b.y, 134); assert.equal(b.vy, 0); assert.equal(b.onGround, true);
});


test('buffer expires if landing is too late', () => {
  let b = createBody({x: 20, y: 40, vy: 20});
  b = step(b, {jumpPressed: true}, 1 / 60, floor);
  b = simulate(b, {}, .8, 60);
  near(b.y, 134); assert.equal(b.vy, 0); assert.equal(b.onGround, true);
  assert.equal(b.jumpBuffer, 0);
});

test('reverse high-speed sweep and simultaneous wall/floor corner are solid', () => {
  const wall = (c,r) => c === 6;
  let b = step(createBody({x: 300, y: 50, vx: -9600}), {move: -1}, .1, wall);
  near(b.x, 112); assert.equal(b.vx, 0);
  const corner = (c,r) => c === 5 || r >= 10;
  b = step(createBody({x: 36, y: 100, vx: 900, vy: 700}), {move: 1}, .1, corner);
  near(b.x, 68); near(b.y, 134);
  assert.equal(b.vx, 0); assert.equal(b.vy, 0);
});

test('large dt is clamped rather than simulating seconds in one call', () => {
  const b = step(createBody({x: 0, y: 0}), {move: 1}, 10, () => false);
  assert.ok(b.x > 0 && b.x < 20, `x=${b.x}`);
  assert.ok(b.y > 0 && b.y < 10, `y=${b.y}`);
});

test('huge, negative and nonfinite dt/input/body never create nonfinite motion', () => {
  let b = createBody({x: Infinity, y: NaN, vx: -Infinity, vy: 1e99, w: NaN, h: 0});
  for (const dt of [1e99, Infinity, -100, NaN, 0, .016]) {
    b = step(b, {move: Infinity, jumpPressed: true}, dt, (c,r) => r > 1000);
    for (const k of ['x','y','vx','vy','w','h','coyote','jumpBuffer','_stepRemainder']) {
      assert.ok(Number.isFinite(b[k]), `${k} = ${b[k]}`);
    }
  }
  assert.ok(b.x <= 1e7 && b.y <= 1e7);
});

test('no mutation of body, input or tuning; every call returns a fresh body', () => {
  const original = Object.freeze(createBody({x: 20, y: 134, metadata: 'kept'}));
  const controls = Object.freeze({move: 1, jumpPressed: true, jumpHeld: true});
  const tuning = Object.freeze({tileSize: 16, jumpSpeed: 300});
  const result = step(original, controls, 1 / 60, floor, tuning);
  assert.notEqual(result, original);
  assert.equal(original.x, 20); assert.equal(original.vy, 0);
  assert.equal(controls.jumpPressed, true); assert.equal(tuning.jumpSpeed, 300);
  assert.equal(result.metadata, 'kept');
});

test('unobstructed movement survives different tile sizes and custom tuning', () => {
  const solid = (c,r) => r >= 5;
  const tuning = {tileSize: 32, maxSpeed: 175, jumpSpeed: 310};
  const b = simulate(createBody({x: 17, y: 134}), {move: 1}, 1, 60, solid, tuning);
  near(b.y, 134); assert.ok(b.vx > 174); assert.equal(b.onGround, true);
});

let failures = 0;
for (const {name, fn} of tests) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (err) { failures++; console.error(`FAIL ${name}\n${err.stack || err}`); }
}
console.log(`${tests.length - failures}/${tests.length} Broforce physics tests passed`);
if (failures) process.exitCode = 1;
