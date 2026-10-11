// BF-11: pure, replayable encounter pacing. World coordinates are pixels; dt is seconds.
// The adapter owns enemies, boss/mission transitions and rewards. No other RNG is consumed.
const BF_TICK = 1 / 60;
const BF_MAX_DT = 0.1; // Drop extra elapsed wall time after a long/tab-hidden frame.
const BF_MAX_MARKERS = 1024;
const BF_MAX_SPAWNS = 56;
const BF_ARCHETYPES = ['grunt', 'gunner', 'charger'];

const bfFinite = (n, fallback = 0) => typeof n === 'number' && Number.isFinite(n) ? n : fallback;
const bfClamp = (v, a, b) => Math.max(a, Math.min(b, v));
function bfSeed(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return (value >>> 0) || 1;
  if (typeof value !== 'string') return 1;
  let h = 2166136261;
  for (let i = 0; i < Math.min(value.length, 256); i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  }
  return h >>> 0 || 1;
}
function bfDraw(s) { // Mulberry32 with explicit, JSON-safe state (not global seededRandom()).
  s.rng = (s.rng + 0x6D2B79F5) >>> 0;
  let t = Math.imul(s.rng ^ (s.rng >>> 15), 1 | s.rng);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function bfMixMarker(id, x, y, salt) {
  let h = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (Math.round(x) | 0), 16777619);
  h = Math.imul(h ^ (Math.round(y) | 0), 16777619);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  return h >>> 0;
}

function createBroforceDirector({seed = 1, difficulty = 1} = {}) {
  const normalizedSeed = bfSeed(seed);
  return {
    schema: 1, seed: normalizedSeed, rng: normalizedSeed,
    difficulty: bfClamp(bfFinite(difficulty, 1), 0.5, 4),
    phase: 'active', tick: 0, remainder: 0,
    nextSpawnTick: 300, spawnedTotal: 0, spawnSequence: 0,
    markerUses: [] // Bounded by total spawn budget; [{id,count,lastTick}].
  };
}

function bfSceneInfo(scene) {
  if (!scene || !scene.camera || !scene.world) return null;
  const c = scene.camera, w = scene.world;
  const cw = bfFinite(c.width), ch = bfFinite(c.height);
  const ww = bfFinite(w.width), wh = bfFinite(w.height);
  const cx = bfFinite(c.x), cy = bfFinite(c.y);
  if (cw <= 0 || ch <= 0 || ww <= 0 || wh <= 0) return null;
  const players = Array.isArray(scene.players) ? scene.players.slice(0, 2) : [];
  const alive = players.filter(p => p && p.alive === true && Number.isFinite(p.x) && Number.isFinite(p.y) &&
    Math.abs(p.x - (cx + cw * 0.5)) <= cw * 1.25 &&
    Math.abs(p.y - (cy + ch * 0.5)) <= ch * 1.25);
  return {cx, cy, cw, ch, ww, wh, players, alive,
    progress: bfClamp((cx + cw * 0.5) / ww, 0, 1)};
}

function bfMarkerUsage(state, id) {
  for (const entry of state.markerUses) if (entry.id === id) return entry;
  return null;
}

function bfEligible(marker, info, state, startSafeX) {
  if (!marker || (typeof marker.id !== 'string' && typeof marker.id !== 'number')) return false;
  const id = String(marker.id);
  if (!id || id.length > 96) return false;
  const x = marker.x, y = marker.y;
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > info.ww || y < 0 || y > info.wh) return false;
  const margin = bfClamp(info.cw * 0.1, 32, 96);
  // Strictly beyond the visible right edge, but not an unseen room away.
  if (x < Math.max(startSafeX, info.cx + info.cw + margin) ||
      x > info.cx + info.cw + bfClamp(info.cw * 1.5, 240, 900)) return false;
  if (y < info.cy - 64 || y > info.cy + info.ch + 64) return false;
  // Also protect both players, including downed players, if an unusual camera exposes them.
  for (const p of info.players) {
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
        Math.abs(x - p.x) < 120 && Math.abs(y - p.y) < 96) return false;
  }
  // Two appearances at most per authored marker; at least six seconds apart.
  const use = bfMarkerUsage(state, id);
  return !use || (use.count < 2 && state.tick - use.lastTick >= 360);
}

function bfChooseMarker(state, scene, info) {
  if (!Array.isArray(scene.spawnMarkers)) return null;
  const markers = scene.spawnMarkers;
  const safeX = Math.max(240, Math.min(480, info.cw * 0.65));
  // One random draw, independent of marker enumeration order and candidate count.
  // No generated list or sort: each attempt scans at most BF_MAX_MARKERS entries.
  const salt = (bfDraw(state) * 4294967296) >>> 0;
  let best = null, bestHash = -1, bestId = '';
  for (let i = 0; i < Math.min(markers.length, BF_MAX_MARKERS); i++) {
    const marker = markers[i];
    if (!bfEligible(marker, info, state, safeX)) continue;
    const id = String(marker.id);
    const h = bfMixMarker(id, marker.x, marker.y, salt);
    if (h > bestHash || (h === bestHash && id < bestId)) {
      best = marker; bestHash = h; bestId = id;
    }
  }
  return best;
}

function bfEnemyType(state, marker, progress) {
  if (BF_ARCHETYPES.includes(marker.type)) return marker.type;
  // Faster units appear gradually; even late encounters still include basic patrols.
  const roll = bfDraw(state);
  const gunnerCut = 0.24 + progress * 0.13;
  const chargerCut = gunnerCut + 0.14 + progress * 0.18;
  return roll < gunnerCut ? 'gunner' : roll < chargerCut ? 'charger' : 'grunt';
}

function bfCooldownTicks(state, progress, survivors) {
  const seconds = 5.1 - progress * 1.6 - (state.difficulty - 1) * 0.45 -
    (survivors - 1) * 0.35 - Math.min(state.tick * BF_TICK / 180, 1) * 0.55;
  const jitter = 0.75 + bfDraw(state) * 0.5;
  return Math.max(72, Math.round(Math.max(1.35, seconds) * jitter * 60));
}

function bfOneTick(s, scene, events) {
  s.tick++;
  const info = bfSceneInfo(scene);
  if (!info) return;
  // A latched boss zone cannot reopen random encounters after camera backtracking.
  if (scene.bossZone === true || scene.bossActive === true || scene.phase === 'boss' ||
      info.progress >= 0.92) { s.phase = 'boss'; return; }
  if (info.progress >= 0.78 || info.alive.length === 0) return;
  if (s.tick < s.nextSpawnTick || s.spawnedTotal >= Math.min(BF_MAX_SPAWNS, 24 + Math.round(s.difficulty * 8))) return;
  // The opening checkpoint is calm; regular short breathers split escalating firefights.
  const elapsed = s.tick * BF_TICK;
  if (elapsed < 5 || (info.progress > 0.15 && elapsed % 24 >= 18 && elapsed % 24 < 21)) return;
  const maxLive = bfClamp(Math.floor(2 + s.difficulty + info.alive.length + info.progress * 2), 3, 10);
  if (bfFinite(scene.activeEnemies, 0) >= maxLive) {
    s.nextSpawnTick = s.tick + 30; // Retry boundedly after enemy cleanup.
    return;
  }
  const marker = bfChooseMarker(s, scene, info);
  if (!marker) {
    s.nextSpawnTick = s.tick + 45;
    return;
  }
  const id = String(marker.id);
  const type = bfEnemyType(s, marker, info.progress);
  ++s.spawnSequence;
  ++s.spawnedTotal;
  s.markerUses = s.markerUses.map(entry => ({...entry})); // Copy on write: no per-frame per-marker allocations.
  const use = bfMarkerUsage(s, id);
  if (use) { use.count++; use.lastTick = s.tick; }
  else s.markerUses.push({id, count: 1, lastTick: s.tick});
  events.push({type: 'spawn-enemy', spawnId: 'bf-' + s.spawnSequence + '-' + id,
    enemyType: type, x: marker.x, y: marker.y});
  s.nextSpawnTick = s.tick + bfCooldownTicks(s, info.progress, info.alive.length);
}

function advanceBroforceDirector(state, dt, scene) {
  // The API is functional: never mutate the caller's state/scene, even if no events fire.
  const s = {...state, markerUses: state.markerUses || []};
  const events = [];
  if (scene && (scene.completed === true || scene.phase === 'completed')) {
    s.phase = 'completed'; return {state: s, events};
  }
  if (s.phase !== 'active') return {state: s, events};
  if (!scene || scene.paused === true || scene.disabled === true || scene.enabled === false ||
      scene.phase === 'paused' || scene.phase === 'disabled') return {state: s, events};
  if (!Number.isFinite(dt) || dt <= 0) return {state: s, events};
  const carry = bfClamp(bfFinite(s.remainder), 0, BF_TICK);
  const budget = carry + Math.min(dt, BF_MAX_DT);
  const steps = Math.min(6, Math.floor((budget + 1e-10) / BF_TICK));
  s.remainder = budget - steps * BF_TICK;
  if (Math.abs(s.remainder) < 1e-9) s.remainder = 0;
  for (let i = 0; i < steps && s.phase === 'active'; i++) bfOneTick(s, scene, events);
  return {state: s, events};
}

Object.assign(exports, {createBroforceDirector, advanceBroforceDirector});
