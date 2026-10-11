// BF-10 — deterministic, finite Broforce jungle/outpost stage data.
// World pixels, +y down. All entities use the BF-13 top-left 12x26 body anchor.
// Numeric tile IDs are BF-12's EMPTY/SOIL/WOOD/STONE/STEEL/VOLATILE = 0..5.
// No world/terrain is mutated after generation; callers own the returned arrays.
const {TILE} = require('src/engines/broforce/terrain.js');
const BODY_W = 12, BODY_H = 26, JUMP_RISE = 43;

function stageSeed(seed) {
  if (seed === undefined) return 1;
  if (typeof seed === 'number') {
    if (!Number.isSafeInteger(seed)) throw new RangeError('Stage seed must be a safe integer or string');
    return seed >>> 0;
  }
  if (typeof seed !== 'string' || seed.length > 256)
    throw new TypeError('Stage seed must be a safe integer or string of at most 256 characters');
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    // Hash both UTF-16 bytes, including zero bytes, for stable browser/Node replay.
    const n = seed.charCodeAt(i);
    hash = Math.imul(hash ^ (n & 255), 16777619);
    hash = Math.imul(hash ^ (n >>> 8), 16777619);
  }
  return hash >>> 0;
}
function seededRng(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function generateBroforceStage({seed, width = 180, height = 24, tileSize = 16} = {}) {
  // Explicit limits rule out accidental gigantic stage allocations on a phone.
  if (!Number.isSafeInteger(width) || width < 96 || width > 384 ||
      !Number.isSafeInteger(height) || height < 16 || height > 48 ||
      !Number.isSafeInteger(tileSize) || tileSize < 12 || tileSize > 32)
    throw new RangeError('Stage bounds: width 96..384, height 16..48, tileSize 12..32');
  const actualSeed = stageSeed(seed);
  const rng = seededRng(actualSeed);
  const tiles = new Uint8Array(width * height);
  const floor = new Int16Array(width);
  const xAt = fraction => Math.max(1, Math.min(width - 2, Math.round(width * fraction)));
  // 8 film-like beats: arrival, foothills, bunker, bridge, treetop detour,
  // captive compound, munitions outpost, clear boss/landing approach.
  const bounds = [0, xAt(.13), xAt(.27), xAt(.40), xAt(.52), xAt(.65), xAt(.76), xAt(.84), width];
  const base = height - 5 - (rng() < .33 ? 1 : 0);
  const terraces = [base];
  for (let z = 1; z < 8; z++) {
    const delta = Math.floor(rng() * 3) - 1;
    terraces.push(Math.max(height - 8, Math.min(height - 4, terraces[z - 1] + delta)));
  }
  function at(col, row) { return row * width + col; }
  function get(col, row) {
    return col < 0 || col >= width || row < 0 || row >= height ? TILE.STEEL : tiles[at(col,row)];
  }
  function put(col, row, type) {
    if (col >= 1 && col < width - 1 && row >= 2 && row < height - 1) tiles[at(col,row)] = type;
  }
  for (let z = 0; z < 8; z++) {
    for (let x = bounds[z]; x < bounds[z + 1]; x++) floor[x] = terraces[z];
  }
  for (let x = 0; x < width; x++) {
    for (let row = floor[x]; row < height; row++) {
      const type = row === height - 1 ? TILE.STEEL :
        row >= floor[x] + 3 && rng() < .29 ? TILE.STONE :
        row === floor[x] && rng() < .12 ? TILE.STONE : TILE.SOIL;
      tiles[at(x,row)] = type;
    }
  }
  // The outer walls and bedrock are blast-resistant stage bounds.
  for (let row = 0; row < height; row++) {
    tiles[at(0,row)] = TILE.STEEL;
    tiles[at(width - 1,row)] = TILE.STEEL;
  }
  // Controlled bridge/pit: breakable planks over a *single-tile* depression,
  // so blowing a bridge never creates a hole deeper than one jump.
  const bridgeStart = bounds[3] + 2;
  const bridgeLength = Math.min(4, bounds[4] - bridgeStart - 2);
  for (let x = bridgeStart; x < bridgeStart + bridgeLength; x++) {
    put(x, floor[x], TILE.WOOD);
    if (floor[x] + 1 < height - 1) put(x, floor[x] + 1, TILE.SOIL);
  }
  function cover(col, count, rise, type) {
    for (let x = col; x < col + count; x++) {
      if (x <= 10 || x >= bounds[7]) continue;
      for (let j = 1; j <= rise; j++) put(x, floor[x] - j, type);
    }
  }
  const coverRise = Math.max(1, Math.min(2, Math.floor(JUMP_RISE / tileSize)));
  // Cover, ammo/explosive caches and outpost foundations never seal a corridor.
  cover(bounds[1] + 4, 2, 1, TILE.WOOD);
  cover(bounds[2] + 4, 2, coverRise, TILE.WOOD);
  cover(bounds[5] + 3, 2, 1, TILE.STONE);
  cover(bounds[6] + 4, 2, coverRise, TILE.WOOD);
  for (const col of [bounds[2] + 6, bounds[5] + 6, bounds[6] + 10]) {
    if (col < bounds[7] - 3 && col > 10) put(col, floor[col] - 1, TILE.VOLATILE);
  }
  // Overhead silhouettes: bunkers and captive-compound awnings. Clearance is
  // at least one full 26px actor body under every overhead structure.
  const roofRise = Math.ceil((BODY_H + 2) / tileSize) + 1;
  function awning(start, length) {
    const end = Math.min(start + length, bounds[7] - 2);
    for (let x = start; x < end; x++) {
      const row = floor[x] - roofRise - 1;
      put(x, row, x === start || x === end - 1 ? TILE.STONE : TILE.WOOD);
    }
  }
  awning(bounds[2] + 8, Math.min(6, bounds[3] - bounds[2] - 10));
  awning(bounds[5] + 8, Math.min(6, bounds[6] - bounds[5] - 9));
  // A reachable *optional* two-step vertical route; the regular floor stays open.
  const detour = bounds[4] + 3;
  const deckRise = roofRise;
  cover(detour, 2, 1, TILE.WOOD); // first jump step, not under the raised deck
  if ((deckRise - 1) * tileSize > JUMP_RISE)
    cover(detour + 2, 2, 2, TILE.WOOD); // intermediate step for 24px tiles
  for (let x = detour + 4; x <= Math.min(detour + 9, bounds[5] - 2); x++)
    put(x, floor[x] - deckRise, TILE.WOOD);
  // Second optional platform, a different level and separated horizontal jump.
  for (let x = detour + 11; x <= Math.min(detour + 14, bounds[5] - 1); x++)
    put(x, floor[x] - deckRise, TILE.WOOD);

  function clearActor(x,y) {
    if (x < tileSize || y < 0 || x + BODY_W > (width - 1) * tileSize ||
        y + BODY_H > (height - 1) * tileSize) return false;
    const c0 = Math.floor(x / tileSize), c1 = Math.floor((x + BODY_W - .001) / tileSize);
    const r0 = Math.floor(y / tileSize), r1 = Math.floor((y + BODY_H - .001) / tileSize);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) if (get(c,r) !== TILE.EMPTY) return false;
    return true;
  }
  function grounded(col) {
    const x = col * tileSize + (tileSize - BODY_W) / 2;
    // Pick the uppermost legitimate, fully supported standing surface at this
    // column; prefer ground, then an overhead catwalk if ground is obstructed.
    const rows = [floor[col]];
    for (let r = floor[col] - 1; r >= 3; r--) if (get(col,r) !== TILE.EMPTY) rows.push(r);
    for (const row of rows) {
      const y = row * tileSize - BODY_H;
      if (clearActor(x,y) && get(col,row) !== TILE.EMPTY) return {x,y};
    }
    return null;
  }
  function locate(preferred, min, max, reserved) {
    for (let d = 0; d < width; d++) {
      for (const col of d ? [preferred - d, preferred + d] : [preferred]) {
        if (col < min || col > max || reserved.has(col)) continue;
        const p = grounded(col);
        if (!p) continue;
        reserved.add(col);
        return p;
      }
    }
    throw new Error('No clear ground placement inside stage');
  }
  const reserved = new Set();
  const spawns = [locate(3, 2, 5, reserved), locate(7, 6, 10, reserved)];
  const prisonerColumns = [
    Math.floor((bounds[1] + bounds[2]) / 2),
    Math.floor((bounds[3] + bounds[4]) / 2),
    Math.floor((bounds[5] + bounds[6]) / 2),
    Math.floor((bounds[6] + bounds[7]) / 2)
  ];
  const prisoners = prisonerColumns.map((column, i) => ({
    id: 'bf-prisoner-' + String(i + 1).padStart(2,'0'),
    ...locate(column, bounds[1] + 1, bounds[7] - 3, reserved)
  }));
  // Suspended wooden cage frames are readable cover/rescue landmarks, but
  // their lowest bars retain a full player-height passage on the main lane.
  for (const prisoner of prisoners) {
    const center = Math.floor(prisoner.x / tileSize);
    if (prisoner.y !== floor[center] * tileSize - BODY_H) continue;
    // Keep the short-jump approaches and pre-existing overhead routes open.
    let nearbyCover = false;
    for (let c = Math.max(1, center - 6); c <= Math.min(width - 2, center + 6); c++) {
      for (let r = Math.max(2, floor[c] - roofRise - 1); r < floor[c]; r++)
        if (get(c,r) !== TILE.EMPTY) nearbyCover = true;
    }
    if (nearbyCover) continue;
    for (let offset = -2; offset <= 2; offset++) {
      const col = center + offset;
      const roof = floor[col] - roofRise - 1;
      put(col, roof, TILE.WOOD);
      if (Math.abs(offset) === 2) put(col, roof + 1, TILE.WOOD);
    }
  }
  const enemyColumns = [
    bounds[1] + 2, bounds[2] + 2, bounds[2] + 11,
    bounds[3] + 5, bounds[4] + 5, bounds[5] + 5,
    bounds[6] + 2, bounds[6] + 9, bounds[7] - 3
  ];
  const enemySpawns = enemyColumns.map((column, i) => ({
    id: 'bf-enemy-' + String(i + 1).padStart(2,'0'),
    type: i === 7 ? 'heavy' : i % 3 === 1 ? 'sentry' : 'scout',
    ...locate(column, Math.max(12, bounds[1]), bounds[7] - 2, reserved)
  }));
  const devilSpawn = locate(bounds[7] + 2, bounds[7] + 1, width - 13, reserved);
  const extraction = locate(width - 8, width - 12, width - 3, reserved);
  const checkpoints = [
    locate(bounds[3] - 3, bounds[2] + 1, bounds[4] - 2, reserved),
    locate(bounds[6] - 3, bounds[5] + 1, bounds[7] - 2, reserved)
  ];
  return {width,height,tileSize,tiles,spawns,prisoners,enemySpawns,
    devilSpawn,extraction,checkpoints,seed:actualSeed};
}
Object.assign(exports,{generateBroforceStage});
