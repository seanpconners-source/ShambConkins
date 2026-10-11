// BF-14 — deterministic, standalone weapon/projectile simulation.
// All coordinates are world pixels; dt and weapon intervals are seconds. No DOM or runtime state.
const TILE_SIZE = 16;
const MAX_PROJECTILES = 256, MAX_TARGETS = 256, MAX_EVENTS = 256, MAX_PARTICLES = 48;
const EPS = 1e-9;
const WEAPON_SPECS = Object.freeze({
  pistol: Object.freeze({speed: 650, damage: 1, terrainDamage: 1, cooldown: .25, magazine: 12, pellets: 1, spread: .016, life: 1.5, gravity: 0, blastRadius: 0, blastDamage: 0, burst: 1, burstGap: 0}),
  rifle: Object.freeze({speed: 860, damage: 1, terrainDamage: 1, cooldown: .29, magazine: 30, pellets: 1, spread: .028, life: 1.25, gravity: 0, blastRadius: 0, blastDamage: 0, burst: 3, burstGap: .062}),
  shotgun: Object.freeze({speed: 580, damage: 1, terrainDamage: 1, cooldown: .72, magazine: 8, pellets: 6, spread: .22, life: .52, gravity: 0, blastRadius: 0, blastDamage: 0, burst: 1, burstGap: 0}),
  launcher: Object.freeze({speed: 355, damage: 0, terrainDamage: 0, cooldown: 1.0, magazine: 4, pellets: 1, spread: .012, life: 2.1, gravity: 85, blastRadius: 46, blastDamage: 3, burst: 1, burstGap: 0}),
  grenade: Object.freeze({speed: 290, damage: 0, terrainDamage: 0, cooldown: .85, magazine: 5, pellets: 1, spread: .045, life: 1.25, gravity: 550, blastRadius: 54, blastDamage: 3, burst: 1, burstGap: 0})
});
const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const cleanId = v => typeof v === 'string' || Number.isSafeInteger(v) ? v : null;
const isPlayer = v => v === 'P1' || v === 'P2' || v === 'Sean' || v === 'Amber';
function specFor(name) { return WEAPON_SPECS[name] || WEAPON_SPECS.pistol; }
function direction(dir, facing = 1) {
  const x = typeof dir === 'number' ? dir : finite(dir && (dir.x ?? dir.dx), facing);
  const y = typeof dir === 'number' ? 0 : finite(dir && (dir.y ?? dir.dy), 0);
  const mag = Math.hypot(x, y);
  return mag > EPS ? {x: x / mag, y: y / mag} : {x: facing < 0 ? -1 : 1, y: 0};
}
// Returns a NEW projectile. dir accepts +/-1 or {x,y} vector; caller owns projectile IDs.
function createBroforceProjectile({id, owner, x, y, dir = 1, weapon = 'pistol', angle = 0} = {}) {
  if (cleanId(id) === null) throw new TypeError('Projectile id must be a string or safe integer');
  const kind = Object.hasOwn(WEAPON_SPECS, weapon) ? weapon : 'pistol';
  const s = specFor(kind), aim = direction(dir), a = Math.atan2(aim.y, aim.x) + finite(angle);
  return {id, owner: owner ?? null, weapon: kind, x: finite(x), y: finite(y),
    vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, gravity: s.gravity,
    damage: s.damage, terrainDamage: s.terrainDamage, blastRadius: s.blastRadius,
    blastDamage: s.blastDamage, life: s.life, hitIds: []};
}
// Pure weapon scheduler. State holds cooldown/queued burst across calls and is never mutated.
// One tick emits {projectiles,events,state}, where events of type 'shot' include an offset
// in seconds WITHIN the caller's dt. Integrate each shot for (dt-at) in the host adapter.
// fireHeld=true is sustained firing; optional seed or random(shotIndex,pelletIndex) selects spread.
function fireBroforceWeapon({state, owner, x = 0, y = 0, dir = 1, weapon, fireHeld = false,
  dt = 0, seed = 1, random} = {}) {
  const previous = state || {}, kind = Object.hasOwn(WEAPON_SPECS, weapon) ? weapon :
    Object.hasOwn(WEAPON_SPECS, previous.weapon) ? previous.weapon : 'pistol';
  const s = specFor(kind), same = previous.weapon === kind;
  const out = {weapon: kind, ammo: same ? clamp(Math.floor(finite(previous.ammo, s.magazine)), 0, s.magazine) : s.magazine,
    cooldown: same ? Math.max(0, finite(previous.cooldown)) : 0,
    burstLeft: same ? clamp(Math.floor(finite(previous.burstLeft)), 0, s.burst) : 0,
    sequence: Math.max(0, Math.floor(finite(previous.sequence)))};
  let remaining = clamp(finite(dt), 0, .2), elapsed = 0;
  const shots = [], events = [];
  // At most 16 volleys per call. Even malformed state/cooldown cannot run forever.
  for (let iter = 0; iter < 16; iter++) {
    const step = Math.min(remaining, out.cooldown);
    out.cooldown -= step; remaining -= step; elapsed += step;
    if (out.cooldown > EPS || (!fireHeld && !out.burstLeft) || !out.ammo ||
       (remaining <= EPS && elapsed > EPS && step === 0)) break;
    if (!out.burstLeft) out.burstLeft = s.burst;
    const index = out.sequence++;
    for (let pellet = 0; pellet < s.pellets; pellet++) {
      const unit = typeof random === 'function' ? random(index, pellet) : seededUnit(seed, index, pellet);
      const spread = (clamp(finite(unit, .5), 0, 1) * 2 - 1) * s.spread;
      const id = String(owner ?? 'world') + ':' + kind + ':' + index + ':' + pellet;
      shots.push(createBroforceProjectile({id, owner, x, y, dir, weapon: kind, angle: spread}));
    }
    events.push({type: 'shot', owner: owner ?? null, weapon: kind, sequence: index, at: elapsed,
      count: s.pellets});
    out.ammo--; out.burstLeft--;
    out.cooldown = out.burstLeft && out.ammo ? s.burstGap : s.cooldown;
    if (remaining <= EPS) break;
  }
  // Cooldown must keep ticking even when fire is released or the magazine is empty.
  out.cooldown = Math.max(0, out.cooldown - remaining);
  return {state: out, projectiles: shots, events};
}
function seededUnit(seed, volley, pellet) {
  let h = (Math.floor(finite(seed, 1)) ^ Math.imul(volley + 1, 0x9e3779b1) ^
    Math.imul(pellet + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function boxFor(t) {
  const b = t && (t.bounds || t);
  if (!b) return null;
  const x = finite(b.x, NaN), y = finite(b.y, NaN);
  const w = finite(b.w ?? b.width, NaN), h = finite(b.h ?? b.height, NaN);
  return Number.isFinite(x + y + w + h) && w > 0 && h > 0 ? {x, y, w, h} : null;
}
function targetId(t) { return t && (cleanId(t.hitId) ?? cleanId(t.id)); }
function friendly(owner, target, allow) {
  if (allow) return false;
  const other = target && (target.owner ?? target.team ?? target.id);
  return owner != null && (owner === other || (isPlayer(owner) &&
    (isPlayer(other) || target && target.kind === 'player')));
}
// Segment against rectangle. Returns fraction t along 0..1 (including touching edges).
function segmentBox(x, y, dx, dy, b) {
  let lo = 0, hi = 1;
  for (const [p, v, min, max] of [[x, dx, b.x, b.x + b.w], [y, dy, b.y, b.y + b.h]]) {
    if (Math.abs(v) < EPS) { if (p < min || p > max) return null; }
    else { let a = (min - p) / v, z = (max - p) / v;
      if (a > z) [a, z] = [z, a]; lo = Math.max(lo, a); hi = Math.min(hi, z);
      if (lo > hi) return null; }
  }
  return clamp(lo, 0, 1);
}
function collideSegment(p, x2, y2, isSolid, targets, bounds, friendlyFire) {
  const dx = x2 - p.x, dy = y2 - p.y;
  let best = null;
  const replace = hit => { if (!best || hit.t < best.t - EPS ||
    (Math.abs(hit.t - best.t) <= EPS && hit.priority < best.priority)) best = hit; };
  if (bounds) {
    const {x, y, width, height} = bounds;
    if (Number.isFinite(x + y + width + height) && width > 0 && height > 0) {
      if (p.x < x || p.x > x + width || p.y < y || p.y > y + height) replace({t: 0, priority: 0, type: 'boundary'});
      else for (const [t, positive] of [[dx > 0 ? (x + width - p.x) / dx : dx < 0 ? (x - p.x) / dx : Infinity, true],
                                     [dy > 0 ? (y + height - p.y) / dy : dy < 0 ? (y - p.y) / dy : Infinity, true]]) {
        if (positive && t >= 0 && t < 1 - EPS) replace({t, priority: 0, type: 'boundary'});
      }
    }
  }
  const c0 = Math.floor(Math.min(p.x, x2) / TILE_SIZE), c1 = Math.floor(Math.max(p.x, x2) / TILE_SIZE);
  const r0 = Math.floor(Math.min(p.y, y2) / TILE_SIZE), r1 = Math.floor(Math.max(p.y, y2) / TILE_SIZE);
  // dt is capped and all projectile speeds are capped at creation; this also
  // protects against hostile hand-built projectiles or absurd coordinates.
  if ((c1 - c0 + 1) * (r1 - r0 + 1) <= 512) {
    for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) {
      if (!isSolid(col, row)) continue;
      const t = segmentBox(p.x, p.y, dx, dy, {x: col * 16, y: row * 16, w: 16, h: 16});
      if (t !== null) replace({t, priority: 1, type: 'terrain', col, row});
    }
  } else replace({t: 0, priority: 0, type: 'boundary'});
  for (const target of (Array.isArray(targets) ? targets : []).slice(0, MAX_TARGETS)) {
    const id = targetId(target), box = boxFor(target);
    if (id === null || !box || target.dead || friendly(p.owner, target, friendlyFire) ||
      (p.hitIds || []).includes(id)) continue;
    const t = segmentBox(p.x, p.y, dx, dy, box);
    if (t !== null) replace({t, priority: 2, type: 'target', target, id});
  }
  return best;
}
function pushEvent(events, event) { if (events.length < MAX_EVENTS) events.push(event); }
function terrainDamage(terrain, blast) {
  if (!terrain) return null;
  const world = terrain.world || terrain;
  const damageTerrain = typeof terrain.damageTerrain === 'function' ? terrain.damageTerrain :
    require('src/engines/broforce/terrain.js').damageTerrain; // BF-12 API; lazy on impact.
  return damageTerrain(world, blast);
}
function terrainEvent(events, result, x, y) {
  if (!result) return;
  pushEvent(events, {type: 'terrain-damage', x, y,
    destroyedCount: result.destroyed.length, damagedCount: result.damaged.length,
    destroyed: result.destroyed.slice(0, 32), damaged: result.damaged.slice(0, 32)});
}
// Does not mutate targets. Terrain is the sole explicit mutation: BF-12 damageTerrain(world,...).
// Returns {events, hitIds, terrainResult}; chain blasts come from BF-12's capped BFS.
function resolveBroforceExplosion({x, y, radius = 40, damage = 2, terrain,
  targets = [], owner = null, friendlyFire = false, explosionId = null, chainBlasts = null} = {}) {
  const events = [], hitIds = [], seen = new Set();
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) ||
    radius < 0 || !Number.isFinite(damage) || damage < 0) return {events, hitIds, terrainResult: null};
  const terrainResult = terrainDamage(terrain, {x, y, radius, damage});
  const blasts = Array.isArray(chainBlasts) ? chainBlasts.slice(0, 64) :
    terrainResult && terrainResult.blasts.length ? terrainResult.blasts.slice(0, 64) : [{x, y, radius}];
  terrainEvent(events, terrainResult, x, y);
  let particles = 0;
  for (let i = 0; i < blasts.length; i++) {
    const blast = blasts[i];
    pushEvent(events, {type: 'explosion', x: blast.x, y: blast.y, radius: blast.radius,
      source: explosionId, chain: i > 0 || !!chainBlasts});
    particles += Math.min(12, MAX_PARTICLES - particles);
    for (const target of (Array.isArray(targets) ? targets : []).slice(0, MAX_TARGETS)) {
      const id = targetId(target), box = boxFor(target);
      if (id === null || seen.has(id) || !box || target.dead || friendly(owner, target, friendlyFire)) continue;
      const cx = clamp(blast.x, box.x, box.x + box.w), cy = clamp(blast.y, box.y, box.y + box.h);
      const dist = Math.hypot(blast.x - cx, blast.y - cy);
      if (dist > blast.radius) continue;
      const mx = box.x + box.w / 2 - blast.x, my = box.y + box.h / 2 - blast.y;
      const mag = Math.max(1, Math.hypot(mx, my));
      const strength = Math.max(.2, 1 - dist / Math.max(1, blast.radius));
      seen.add(id); hitIds.push(id);
      pushEvent(events, {type: 'hit', targetId: id, source: explosionId, owner,
        damage: Math.max(0, Math.ceil(damage * strength)), x: cx, y: cy,
        knockback: {x: mx / mag * 240 * strength, y: my / mag * 240 * strength - 80}});
    }
  }
  pushEvent(events, {type: 'particles', kind: 'explosion', count: particles, x, y});
  return {events, hitIds, terrainResult};
}
// Runs one bounded integration step. No caller arrays/objects are mutated.
// p.life is fuse for grenade and lifetime for other rounds. worldBounds uses {x,y,width,height}.
// Returns {projectiles,events}; repeated frames require passing returned projectiles.
function advanceBroforceCombat({projectiles = [], dt = 0, isSolid = () => false,
  targets = [], worldBounds, terrain, friendlyFire = false} = {}) {
  const events = [], active = [], seenProjectiles = new Set();
  const seconds = clamp(finite(dt), 0, .1), solid = typeof isSolid === 'function' ? isSolid : () => false;
  for (const old of (Array.isArray(projectiles) ? projectiles : []).slice(0, MAX_PROJECTILES)) {
    if (!old || cleanId(old.id) === null || seenProjectiles.has(old.id)) continue;
    seenProjectiles.add(old.id);
    const p = {...old, hitIds: Array.isArray(old.hitIds) ? old.hitIds.slice(0, 32) : []};
    if (!Number.isFinite(p.x + p.y + p.vx + p.vy) || !(p.life > 0)) continue;
    const t = Math.min(seconds, p.life), gravity = clamp(finite(p.gravity), -1000, 1000);
    const x2 = p.x + p.vx * t, y2 = p.y + p.vy * t + gravity * t * t * .5;
    const hit = collideSegment(p, x2, y2, solid, targets, worldBounds, friendlyFire);
    const portion = hit ? hit.t : 1, moved = t * portion;
    p.x += (x2 - p.x) * portion; p.y += (y2 - p.y) * portion;
    p.vy += gravity * moved; p.life -= moved;
    if (!hit && p.life > EPS) { active.push(p); continue; }
    if (hit) pushEvent(events, {type: 'impact', projectileId: p.id, owner: p.owner,
      weapon: p.weapon, x: p.x, y: p.y, with: hit.type,
      ...(hit.type === 'terrain' ? {col: hit.col, row: hit.row} : {})});
    // Grenades arc and ricochet on bunker walls; their fuse is still ticking.
    // Push a fraction of a pixel away from the contact to prevent t=0 loops.
    if (hit && hit.type === 'terrain' && p.weapon === 'grenade' && p.life > EPS) {
      const cx = (hit.col + .5) * TILE_SIZE, cy = (hit.row + .5) * TILE_SIZE;
      if (Math.abs(p.x - cx) > Math.abs(p.y - cy)) {
        p.vx = (p.x < cx ? -1 : 1) * Math.max(24, Math.abs(p.vx) * .48);
        p.x += Math.sign(p.vx) * .05;
      } else {
        p.vy = (p.y < cy ? -1 : 1) * Math.max(24, Math.abs(p.vy) * .42);
        p.y += Math.sign(p.vy) * .05;
      }
      pushEvent(events, {type: 'ricochet', projectileId: p.id, x: p.x, y: p.y});
      active.push(p); continue;
    }
    if (hit && hit.type === 'target' && p.damage > 0 && !p.blastRadius) {
      p.hitIds.push(hit.id);
      pushEvent(events, {type: 'hit', source: p.id, projectileId: p.id, owner: p.owner,
        targetId: hit.id, damage: Math.max(0, finite(p.damage)), x: p.x, y: p.y,
        knockback: {x: Math.sign(p.vx) * 80, y: -35}});
    }
    if (hit && hit.type === 'terrain' && p.terrainDamage > 0 && !p.blastRadius) {
      const result = terrainDamage(terrain, {x: (hit.col + .5) * 16, y: (hit.row + .5) * 16,
        radius: 0, damage: p.terrainDamage});
      terrainEvent(events, result, p.x, p.y);
      // Directly broken volatile tiles can chain through BF-12 too.
      if (result && result.blasts.length > 1) {
        const chain = resolveBroforceExplosion({x: p.x, y: p.y, radius: 0,
          damage: 2, targets, owner: p.owner, friendlyFire, explosionId: p.id,
          chainBlasts: result.blasts.slice(1)});
        for (const event of chain.events) pushEvent(events, event);
      }
    }
    if (p.blastRadius > 0 && hit?.type !== 'boundary') {
      const boom = resolveBroforceExplosion({x: p.x, y: p.y, radius: p.blastRadius,
        damage: p.blastDamage, terrain, targets, owner: p.owner,
        friendlyFire, explosionId: p.id});
      for (const event of boom.events) pushEvent(events, event);
    }
    // Boundary impacts vanish rather than explode outside the protected stage.
  }
  return {projectiles: active, events};
}
Object.assign(exports, {WEAPON_SPECS, createBroforceProjectile, fireBroforceWeapon,
  advanceBroforceCombat, resolveBroforceExplosion});
