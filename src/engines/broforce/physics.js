// Broforce Mobile: deterministic, standalone pixel/tile movement (no DOM or game dependencies).
// x/y are the actor's top-left; +y is down. isSolid(column,row) takes TILE indices.
// Physics runs at a fixed 120 Hz; extra spatial slices keep each sweep <= half a tile.
const FIXED_STEP = 1 / 120;
const DEFAULTS = Object.freeze({
  tileSize: 16, maxSpeed: 125, groundAcceleration: 1200, airAcceleration: 800,
  groundFriction: 1500, airFriction: 160, gravity: 720, jumpSpeed: 260,
  maxFallSpeed: 380, coyoteTime: 0.08, jumpBufferTime: 0.10,
  jumpReleaseRatio: 0.48, maxDt: 0.10
});
const WORLD_LIMIT = 1e7;
const SPEED_LIMIT = 1e4;
const EPSILON = 1e-7;

const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const approach = (v, target, amount) => v < target ? Math.min(v + amount, target) : Math.max(v - amount, target);
const positive = (v, fallback, max = SPEED_LIMIT) => Number.isFinite(v) && v > 0 ? Math.min(v, max) : fallback;
const nonnegative = (v, fallback, max = SPEED_LIMIT) => Number.isFinite(v) && v >= 0 ? Math.min(v, max) : fallback;

function createBody({x = 0, y = 0, w = 12, h = 26, ...overrides} = {}) {
  const b = {
    x, y, w, h, vx: 0, vy: 0, onGround: false, facing: 1,
    coyote: 0, jumpBuffer: 0, _stepRemainder: 0, ...overrides
  };
  // Keep malformed spawn/save data from causing NaNs or astronomical tile scans.
  b.x = clamp(finite(b.x), -WORLD_LIMIT, WORLD_LIMIT);
  b.y = clamp(finite(b.y), -WORLD_LIMIT, WORLD_LIMIT);
  b.w = positive(b.w, 12, 1024);
  b.h = positive(b.h, 26, 1024);
  b.vx = clamp(finite(b.vx), -SPEED_LIMIT, SPEED_LIMIT);
  b.vy = clamp(finite(b.vy), -SPEED_LIMIT, SPEED_LIMIT);
  b.onGround = b.onGround === true;
  b.facing = b.facing === -1 ? -1 : 1;
  b.coyote = clamp(finite(b.coyote), 0, 1);
  b.jumpBuffer = clamp(finite(b.jumpBuffer), 0, 1);
  b._stepRemainder = clamp(finite(b._stepRemainder), 0, FIXED_STEP);
  return b;
}

function touchesSolid(x, y, w, h, size, solid) {
  const left = Math.floor((x + EPSILON) / size);
  const right = Math.floor((x + w - EPSILON) / size);
  const top = Math.floor((y + EPSILON) / size);
  const bottom = Math.floor((y + h - EPSILON) / size);
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) if (solid(c, r)) return true;
  }
  return false;
}

function hasFooting(b, size, solid) {
  // A tiny downward probe includes exact boundary contact without treating
  // an actor overlapping a floor or jumping upward as grounded.
  return b.vy >= 0 && !touchesSolid(b.x, b.y, b.w, b.h, size, solid) &&
    touchesSolid(b.x, b.y + 0.001, b.w, b.h, size, solid);
}

function sweepAxis(b, displacement, axis, size, solid) {
  if (!displacement) return false;
  const target = clamp(b[axis] + displacement, -WORLD_LIMIT, WORLD_LIMIT);
  if (axis === 'x') {
    if (!touchesSolid(target, b.y, b.w, b.h, size, solid)) { b.x = target; return false; }
    // A spatial slice is at most half a tile: any newly touched solid lies
    // at the leading edge. Snap flush to the closest blocking tile face.
    const row0 = Math.floor((b.y + EPSILON) / size);
    const row1 = Math.floor((b.y + b.h - EPSILON) / size);
    const edge = displacement > 0 ? target + b.w - EPSILON : target + EPSILON;
    const c = Math.floor(edge / size);
    let hit = false;
    for (let r = row0; r <= row1; r++) if (solid(c, r)) { hit = true; break; }
    if (hit) b.x = displacement > 0 ? c * size - b.w : (c + 1) * size;
    else b.x = target; // Already overlapping an unrelated tile: caller owns spawn placement.
    if (hit) b.vx = 0;
    return hit;
  }
  if (!touchesSolid(b.x, target, b.w, b.h, size, solid)) { b.y = target; return false; }
  const col0 = Math.floor((b.x + EPSILON) / size);
  const col1 = Math.floor((b.x + b.w - EPSILON) / size);
  const edge = displacement > 0 ? target + b.h - EPSILON : target + EPSILON;
  const r = Math.floor(edge / size);
  let hit = false;
  for (let c = col0; c <= col1; c++) if (solid(c, r)) { hit = true; break; }
  if (hit) b.y = displacement > 0 ? r * size - b.h : (r + 1) * size;
  else b.y = target;
  if (hit) {
    b.vy = 0;
    if (displacement > 0) b.onGround = true;
  }
  return hit;
}

function advanceBody(body, input, dt, isSolid, tuning = {}) {
  // Return a NEW plain body. Unknown caller-owned metadata is preserved shallowly.
  const b = createBody(body || {});
  const cfg = tuning || {};
  const size = clamp(positive(cfg.tileSize, DEFAULTS.tileSize, 1024), 1, 1024);
  const maxSpeed = positive(cfg.maxSpeed, DEFAULTS.maxSpeed);
  const groundAcc = nonnegative(cfg.groundAcceleration, DEFAULTS.groundAcceleration);
  const airAcc = nonnegative(cfg.airAcceleration, DEFAULTS.airAcceleration);
  const groundDrag = nonnegative(cfg.groundFriction, DEFAULTS.groundFriction);
  const airDrag = nonnegative(cfg.airFriction, DEFAULTS.airFriction);
  const gravity = nonnegative(cfg.gravity, DEFAULTS.gravity);
  const jumpSpeed = positive(cfg.jumpSpeed, DEFAULTS.jumpSpeed);
  const maxFall = positive(cfg.maxFallSpeed, DEFAULTS.maxFallSpeed);
  const coyoteTime = clamp(finite(cfg.coyoteTime, DEFAULTS.coyoteTime), 0, 1);
  const bufferTime = clamp(finite(cfg.jumpBufferTime, DEFAULTS.jumpBufferTime), 0, 1);
  const releaseRatio = clamp(finite(cfg.jumpReleaseRatio, DEFAULTS.jumpReleaseRatio), 0, 1);
  const maxDt = clamp(positive(cfg.maxDt, DEFAULTS.maxDt, 1), FIXED_STEP, 1);
  const solid = typeof isSolid === 'function' ? isSolid : () => false;
  const keys = input || {};
  const move = keys.move > 0 ? 1 : keys.move < 0 ? -1 : 0;
  const releaseJump = keys.jumpHeld === false;
  const seconds = clamp(finite(dt), 0, maxDt);
  if (keys.jumpPressed === true) b.jumpBuffer = bufferTime;
  if (move) b.facing = move;

  const accumulated = b._stepRemainder + seconds;
  const count = Math.floor((accumulated + 1e-10) / FIXED_STEP);
  b._stepRemainder = clamp(accumulated - count * FIXED_STEP, 0, FIXED_STEP);

  for (let tick = 0; tick < count; tick++) {
    const supported = hasFooting(b, size, solid);
    if (supported) {
      b.onGround = true;
      b.coyote = coyoteTime;
    } else {
      if (b.onGround) b.coyote = Math.max(b.coyote, coyoteTime);
      b.onGround = false;
      b.coyote = Math.max(0, b.coyote - FIXED_STEP);
    }

    if (move) b.vx = approach(b.vx, move * maxSpeed, (b.onGround ? groundAcc : airAcc) * FIXED_STEP);
    else b.vx = approach(b.vx, 0, (b.onGround ? groundDrag : airDrag) * FIXED_STEP);

    if (b.jumpBuffer > 0 && (b.onGround || b.coyote > 0)) {
      b.vy = -jumpSpeed;
      b.onGround = false;
      b.coyote = 0;
      b.jumpBuffer = 0;
    }
    if (releaseJump && b.vy < 0) b.vy = Math.max(b.vy, -jumpSpeed * releaseRatio);
    b.vy = Math.min(b.vy + gravity * FIXED_STEP, maxFall);

    // Spatial slicing also accommodates external velocities much greater than
    // nominal running speed. Both axis displacements are <= half a tile.
    const slices = Math.max(1, Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy)) * FIXED_STEP / (size / 2)));
    const sliceDt = FIXED_STEP / slices;
    for (let s = 0; s < slices; s++) {
      sweepAxis(b, b.vx * sliceDt, 'x', size, solid);
      const wasFalling = b.vy > 0;
      const hitY = sweepAxis(b, b.vy * sliceDt, 'y', size, solid);
      if (hitY && wasFalling && b.jumpBuffer > 0) {
        // Landing consumes a previously pressed jump even between frames.
        b.vy = -jumpSpeed;
        b.onGround = false;
        b.coyote = 0;
        b.jumpBuffer = 0;
      }
    }
    b.jumpBuffer = Math.max(0, b.jumpBuffer - FIXED_STEP);
  }
  return b;
}

Object.assign(exports, {createBody, advanceBody});
