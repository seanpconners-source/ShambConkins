// BF-15: deterministic, presentation-free enemies for the shared 16-pixel stage.
// Coordinates are top-left world pixels (+y down); isSolid(column,row) uses tiles.
// The combat adapter consumes events; this module never applies damage or spawns.
const {advanceBody} = require('src/engines/broforce/physics.js');
const STEP = 1 / 60, MAX_DT = 0.1, MAX_ENEMIES = 24, MAX_EVENTS = 128;
const TILE = 16, LIMIT = 1000000;
const STATS = Object.freeze({
  rifleman: {hp: 2, speed: 45, sight: 260, range: 260, tell: .35, cooldown: .95, radius: 85},
  melee: {hp: 1, speed: 105, sight: 220, range: 19, tell: .21, cooldown: .68, radius: 65},
  turret: {hp: 3, speed: 0, sight: 330, range: 330, tell: .48, cooldown: 1.18, radius: 0},
  carrier: {hp: 1, speed: 67, sight: 235, range: 30, tell: .55, cooldown: 0, radius: 85}
});
const TYPES = Object.freeze({
  'patrol-rifleman': 'rifleman', 'melee-attacker': 'melee',
  'explosive-carrier': 'carrier', 'stationary-turret': 'turret'
});
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sign = n => n < 0 ? -1 : 1;
const point = v => clamp(finite(v), -LIMIT, LIMIT);
const initialSeed = v => (Number.isFinite(v) ? Math.trunc(v) : 1) >>> 0 || 1;

function createBroforceEnemy({id, type = 'rifleman', x = 0, y = 0, seed = 1} = {}) {
  const kind = STATS[type] ? type : (TYPES[type] || 'rifleman');
  const n = initialSeed(seed);
  const px = point(x), py = point(y);
  return {
    id: (typeof id === 'string' || typeof id === 'number') && String(id).length
      ? String(id) : `${kind}:${n}:${Math.floor(px)}:${Math.floor(py)}`,
    type: kind, x: px, y: py, w: 12, h: kind === 'turret' ? 22 : 24,
    vx: 0, vy: 0, facing: (n & 1) ? 1 : -1, onGround: false,
    hp: STATS[kind].hp, maxHp: STATS[kind].hp, lastHp: STATS[kind].hp,
    dead: false, downEmitted: false, state: 'patrol', phase: 'patrol', alertTime: 0,
    anchorX: px, targetId: null, tellLeft: 0, cooldown: 0,
    spawnGrace: .55, hitTimer: 0, attackTargetId: null,
    _aiRemainder: 0, _stepRemainder: 0, rngState: n, sequence: 0,
    patrolDirection: (n & 1) ? 1 : -1
  };
}

function nextRoll(e, rand) {
  // One stream per enemy when no injected deterministic stream is supplied.
  // Draws occur at fixed simulation steps, not per render frame.
  let x = e.rngState >>> 0 || 1;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  e.rngState = x >>> 0;
  if (typeof rand === 'function') {
    const v = rand();
    if (Number.isFinite(v)) return clamp(v, 0, 0.999999999);
  }
  return e.rngState / 4294967296;
}

function boundsOf(worldBounds) {
  const b = worldBounds && typeof worldBounds === 'object' ? worldBounds : {};
  const minX = point(b.minX == null ? 0 : b.minX);
  const minY = point(b.minY == null ? -LIMIT : b.minY);
  const maxX = Math.max(minX, point(b.maxX == null ? (b.width == null ? LIMIT : b.width) : b.maxX));
  const maxY = Math.max(minY, point(b.maxY == null ? (b.height == null ? LIMIT : b.height) : b.maxY));
  return {minX, minY, maxX, maxY};
}

function event(out, e, type, details = {}) {
  if (out.length >= MAX_EVENTS) return;
  e.sequence = Math.min(1000000000, (e.sequence | 0) + 1);
  out.push({type, eventId: `${e.id}:${e.sequence}`, enemyId: e.id, ...details});
}

function chooseTarget(e, players, solid) {
  let best = null, dist = Infinity;
  for (const p of players) {
    if (!p || p.alive !== true || !Number.isFinite(p.x) || !Number.isFinite(p.y) ||
        !see(e, p, solid)) continue;
    const dx = p.x - (e.x + e.w / 2), dy = p.y - (e.y + e.h / 2);
    const d = dx * dx + dy * dy;
    // Stable input-order tie break; never confuse two owners with identical coordinates.
    if (d < dist) {best = p; dist = d;}
  }
  return best;
}

function clearLine(ax, ay, bx, by, solid) {
  const dist = Math.hypot(bx - ax, by - ay);
  if (!Number.isFinite(dist) || dist > 1200) return false;
  const samples = Math.ceil(dist / (TILE / 2));
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    if (solid(Math.floor((ax + (bx - ax) * t) / TILE),
              Math.floor((ay + (by - ay) * t) / TILE))) return false;
  }
  return true;
}

function see(e, p, solid) {
  if (!p) return false;
  const cfg = STATS[e.type];
  const cx = e.x + e.w / 2, cy = e.y + e.h * .42;
  const dx = p.x - cx, dy = p.y - cy;
  return Math.abs(dx) <= cfg.sight && Math.abs(dy) <= (e.type === 'melee' || e.type === 'carrier' ? 64 : 75) &&
    clearLine(cx, cy, p.x, p.y, solid);
}

function canWalk(e, direction, solid, b) {
  if (!direction || e.type === 'turret') return false;
  const next = e.x + direction * 8;
  if (next < b.minX || next + e.w > b.maxX) return false;
  const x = direction > 0 ? next + e.w : next;
  // Check wall at torso and head. Grounded units avoid stepping into a void;
  // airborne units can still move to get off narrow / broken terrain.
  if (solid(Math.floor(x / TILE), Math.floor((e.y + 5) / TILE)) ||
      solid(Math.floor(x / TILE), Math.floor((e.y + e.h - 4) / TILE))) return false;
  if (e.onGround && !solid(Math.floor((next + e.w / 2) / TILE),
                           Math.floor((e.y + e.h + 3) / TILE))) return false;
  return true;
}

function stepEnemy(e, players, solid, b, rand, events) {
  if (e.dead || e.state === 'dead' || e.hp <= 0) {
    e.dead = true; e.hp = 0; e.state = e.phase = 'dead';
    e.tellLeft = 0; e.attackTargetId = null;
    if (!e.downEmitted) {
      e.downEmitted = true;
      event(events, e, 'enemy-down', {x: e.x + e.w / 2, y: e.y + e.h / 2});
    }
    return;
  }
  if (e.hp < e.lastHp) {
    e.hitTimer = .18; e.state = e.phase = 'hit'; e.tellLeft = 0;
    e.attackTargetId = null;
    event(events, e, 'enemy-hit', {x: e.x + e.w / 2, y: e.y + e.h / 2});
  }
  e.lastHp = e.hp;
  const cfg = STATS[e.type];
  e.spawnGrace = Math.max(0, e.spawnGrace - STEP);
  e.cooldown = Math.max(0, e.cooldown - STEP);
  if (e.hitTimer > 0) {
    e.hitTimer = Math.max(0, e.hitTimer - STEP);
    if (e.hitTimer > 0) {
      move(e, 0, solid, b);
      return;
    }
    e.state = e.phase = 'alert';
  }
  const target = chooseTarget(e, players, solid);
  const spotted = !!target;
  e.targetId = spotted ? String(target.id) : null;
  if (spotted) {
    if (e.alertTime <= 0 && e.state !== 'tell') {
      event(events, e, 'alert', {targetId: e.targetId, x: e.x + e.w / 2, y: e.y});
    }
    e.alertTime = .9;
  } else e.alertTime = Math.max(0, e.alertTime - STEP);

  if (e.state === 'tell') {
    // Losing the target or losing line of sight cancels the committed attack.
    const original = players.find(p => p && String(p.id) === e.attackTargetId && p.alive === true);
    if (!see(e, original, solid) ||
        sign(original.x - (e.x + e.w / 2)) !== e.facing) {
      e.state = e.phase = 'alert'; e.tellLeft = 0; e.attackTargetId = null;
      e.cooldown = Math.max(e.cooldown, .2);
    } else {
      e.tellLeft = Math.max(0, e.tellLeft - STEP);
      if (e.tellLeft <= 0) {
        const x = e.x + e.w / 2 + e.facing * 8, y = e.y + e.h * .42;
        if (e.type === 'carrier') {
          event(events, e, 'enemy-explosion', {x, y, radius: 35, targetId: e.attackTargetId});
          e.dead = true; e.hp = 0; e.state = e.phase = 'dead';
          e.downEmitted = true;
          event(events, e, 'enemy-down', {x: e.x + e.w / 2, y: e.y + e.h / 2, reason: 'detonation'});
          return;
        }
        if (e.type === 'melee') {
          // Melee impact is contact-only; target may dodge during the wind-up.
          const near = Math.abs(original.x - (e.x + e.w / 2)) <= 23 &&
            Math.abs(original.y - (e.y + e.h * .42)) <= 30;
          if (near) event(events, e, 'contact-hit', {targetId: e.attackTargetId, x, y, dir: e.facing});
        } else event(events, e, 'enemy-shot', {targetId: e.attackTargetId, x, y, dir: e.facing});
        e.state = e.phase = 'alert'; e.attackTargetId = null;
        e.cooldown = cfg.cooldown + nextRoll(e, rand) * .14;
      }
    }
    move(e, 0, solid, b);
    return;
  }

  const cx = e.x + e.w / 2;
  let direction = 0;
  if (e.alertTime > 0 && target) {
    const dx = target.x - cx;
    if (spotted) e.facing = sign(dx);
    if (e.type === 'melee' || e.type === 'carrier') {
      if (Math.abs(dx) > cfg.range - 3) direction = sign(dx);
    } else if (e.type === 'rifleman') {
      // Back off when cornered; move into line of sight when too far away.
      if (Math.abs(dx) < 75) direction = -sign(dx);
      else if (!spotted && Math.abs(dx) > 130) direction = sign(dx);
    }
    const inRange = spotted && Math.abs(dx) <= cfg.range &&
      (e.type !== 'melee' || Math.abs(dx) <= 23) &&
      (e.type !== 'carrier' || Math.abs(dx) <= 33);
    if (inRange && e.cooldown <= 0 && e.spawnGrace <= 0) {
      e.state = e.phase = 'tell'; e.tellLeft = cfg.tell;
      e.attackTargetId = String(target.id);
      event(events, e, 'attack-tell', {
        targetId: e.attackTargetId, x: cx, y: e.y + e.h * .42,
        dir: e.facing, duration: cfg.tell, attack: e.type === 'carrier' ? 'explosion' :
          e.type === 'melee' ? 'melee' : 'shot'
      });
      move(e, 0, solid, b);
      return;
    }
    e.state = e.phase = 'alert';
  } else {
    e.state = e.phase = 'patrol';
    if (e.type === 'rifleman' || e.type === 'melee' || e.type === 'carrier') {
      direction = e.patrolDirection;
      if (Math.abs(e.x - e.anchorX) >= cfg.radius) direction = e.x > e.anchorX ? -1 : 1;
    }
  }
  if (direction && !canWalk(e, direction, solid, b)) direction = 0;
  if (!direction && e.state === 'patrol' && e.type !== 'turret') {
    e.patrolDirection = -e.patrolDirection;
  } else if (direction && e.state === 'patrol') {
    e.patrolDirection = direction;
  }
  if (direction) e.facing = direction;
  move(e, direction, solid, b);
}

function move(e, direction, solid, b) {
  if (e.type === 'turret') e.vx = 0;
  const advanced = advanceBody(e, {move: direction}, STEP, solid, {
    tileSize: TILE, maxSpeed: STATS[e.type].speed || 125,
    groundAcceleration: 900, airAcceleration: 500,
    groundFriction: 1300, airFriction: 500, gravity: 720,
    maxFallSpeed: 390
  });
  // Keep the input enemy identity / state, retaining physics' fixed-step fields.
  Object.assign(e, advanced);
  const x = clamp(e.x, b.minX, Math.max(b.minX, b.maxX - e.w));
  const y = clamp(e.y, b.minY, Math.max(b.minY, b.maxY - e.h));
  if (x !== e.x) e.vx = 0;
  if (y !== e.y) e.vy = 0;
  e.x = x; e.y = y;
}

// Opt-in simulation rectangle: enemies outside this area sleep without using
// their spawn grace, cooldown, physics ticks, or seeded RNG. Missing/invalid
// bounds preserve legacy full-world simulation until the mission opts in.
function inActiveWorld(e, area) {
  if (!area || !Number.isFinite(area.x) || !Number.isFinite(area.y) ||
      !Number.isFinite(area.width) || !Number.isFinite(area.height) ||
      area.width <= 0 || area.height <= 0) return true;
  return e.x + e.w >= area.x && e.x <= area.x + area.width &&
    e.y + e.h >= area.y && e.y <= area.y + area.height;
}

function advanceBroforceEnemies(enemies, {dt = 0, players = [], isSolid, worldBounds,
  activeBounds, rand, paused = false} = {}) {
  if (!Array.isArray(enemies)) return {enemies: [], events: []};
  // No mutation of inputs; skip duplicate IDs and enforce a hard phone budget.
  const updated = [], events = [], seen = new Set();
  const solid = typeof isSolid === 'function' ? isSolid : () => false;
  const bounds = boundsOf(worldBounds);
  const participants = Array.isArray(players) ? players.slice(0, 2) : [];
  const seconds = paused ? 0 : clamp(finite(dt), 0, MAX_DT);
  for (const source of enemies) {
    if (!source || typeof source !== 'object' || updated.length >= MAX_ENEMIES) continue;
    const e = {...source};
    if (!STATS[e.type]) continue;
    e.id = String(e.id);
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    e.w = 12; e.h = e.type === 'turret' ? 22 : 24;
    e.x = clamp(point(e.x), bounds.minX, Math.max(bounds.minX, bounds.maxX - e.w));
    e.y = clamp(point(e.y), bounds.minY, Math.max(bounds.minY, bounds.maxY - e.h));
    e.hp = clamp(finite(e.hp), 0, STATS[e.type].hp);
    e.lastHp = clamp(finite(e.lastHp, e.hp), 0, STATS[e.type].hp);
    e.vx = clamp(finite(e.vx), -300, 300); e.vy = clamp(finite(e.vy), -400, 400);
    e._aiRemainder = clamp(finite(e._aiRemainder), 0, STEP);
    e.spawnGrace = clamp(finite(e.spawnGrace), 0, 2);
    e.cooldown = clamp(finite(e.cooldown), 0, 3);
    e.hitTimer = clamp(finite(e.hitTimer), 0, 1);
    e.tellLeft = clamp(finite(e.tellLeft), 0, 1);
    e.alertTime = clamp(finite(e.alertTime), 0, 3);
    e.sequence = clamp(Math.trunc(finite(e.sequence)), 0, 1000000000);
    e.anchorX = clamp(point(e.anchorX), bounds.minX, bounds.maxX);
    e.facing = e.facing === -1 ? -1 : 1;
    e.patrolDirection = e.patrolDirection === -1 ? -1 : 1;
    e.rngState = initialSeed(e.rngState);
    e._stepRemainder = clamp(finite(e._stepRemainder), 0, 1 / 120);
    e.downEmitted = e.downEmitted === true;
    if (!paused) {
      const active = inActiveWorld(e, activeBounds);
      const accumulated = e._aiRemainder + (active ? seconds : 0);
      const ticks = active ? Math.floor((accumulated + 1e-10) / STEP) : 0;
      e._aiRemainder = clamp(accumulated - ticks * STEP, 0, STEP);
      // Zero-dt still publishes a pending externally inflicted death once.
      if (!ticks && (e.hp <= 0 || e.dead === true || e.state === 'dead') && !e.downEmitted) {
        e.dead = true; e.hp = 0; e.state = e.phase = 'dead'; e.downEmitted = true;
        event(events, e, 'enemy-down', {x: e.x + e.w / 2, y: e.y + e.h / 2});
      }
      for (let i = 0; i < ticks; i++) stepEnemy(e, participants, solid, bounds, rand, events);
    }
    updated.push(e);
  }
  return {enemies: updated, events};
}

Object.assign(exports, {createBroforceEnemy, advanceBroforceEnemies});
