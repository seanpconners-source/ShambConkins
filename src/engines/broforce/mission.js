// BF-30: one mutable, authoritative co-op world. No session/save/reward IO.
// Players are canonical [Sean, Amber]. `fighters` is an adapter-supplied BF-17
// snapshotFighters array (already unlocked); omitting it permits only the selected
// character. This core cannot prove ownership without importing profile state.
const {CHARACTERS, characterIdentity, SPECIAL_UNLOCKS} = require('src/characters.js');
const {createTerrain, isSolidTile, damageTerrain} = require('src/engines/broforce/terrain.js');
const {createBody, advanceBody} = require('src/engines/broforce/physics.js');
const {WEAPON_SPECS, fireBroforceWeapon, createBroforceProjectile,
  advanceBroforceCombat, resolveBroforceExplosion} = require('src/engines/broforce/combat.js');
const {createBroforceEnemy, advanceBroforceEnemies} = require('src/engines/broforce/enemies.js');
const {createBroforceDirector, advanceBroforceDirector} = require('src/engines/broforce/director.js');
const {createBroforcePrisoners, advanceBroforcePrisoners} = require('src/engines/broforce/prisoners.js');
const {createBroforceDevil, advanceBroforceDevil} = require('src/engines/broforce/devil.js');
const {createBroforceExtraction, advanceBroforceExtraction} = require('src/engines/broforce/extraction.js');

const STEP = 1 / 120, MAX_DT = .1, MAX_PROJECTILES = 128, MAX_ENEMIES = 24;
const MAX_EVENTS = 2048, MAX_FX = 128, REVIVE_SECONDS = 1.2, GRACE_SECONDS = 1.25;
const OWNERS = ['Sean', 'Amber'], IDS = new Set(CHARACTERS.map(c => c.id));
// BF-11 types, plus BF-10 authored types. All use BF-15's actual AI.
const ENEMY_TYPES = Object.freeze({grunt:'rifleman', gunner:'turret', charger:'melee',
  scout:'rifleman', sentry:'turret', heavy:'carrier'});
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const live = p => p.alive && !p.downed && !p.boarded && p.hp > 0;
const center = p => ({x:p.x + p.w / 2, y:p.y + p.h / 2});
function hash(value) {
  let n = 2166136261;
  for (const c of String(value).slice(0, 256)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0 || 1;
}
function draw(state, stream) {
  let n = state.rng[stream]; n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
  state.rng[stream] = n >>> 0; return state.rng[stream] / 4294967296;
}
function point(p, label) {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y))
    throw new TypeError(label + ' requires world-pixel x/y');
  return {x:p.x, y:p.y};
}
function poolFor(player, selected) {
  const source = player.fighters ?? player.unlockedRoster ?? player.roster ?? [selected];
  if (!Array.isArray(source) || source.length > 1024) throw new TypeError('fighters must be a bounded BF-17 snapshot array');
  const seen = new Set();
  return Object.freeze(source.filter(id => {
    if (!IDS.has(id) || seen.has(characterIdentity(id))) return false;
    seen.add(characterIdentity(id)); return true;
  }));
}
function emit(s, type, details = {}) {
  const event = {...details, type, tick:s.tick, eventId:'mission:' + ++s.eventSequence};
  if (s.events.length < MAX_EVENTS) s.events.push(event);
  else s.stats.droppedEvents++;
  return event;
}
function cue(s, name, p = {}) { emit(s, 'sound', {name, ...p}); }
function fx(s, type, p) {
  if (s.fx.length >= MAX_FX) return;
  const event = emit(s, 'fx', {effect:type, ...p});
  // Ready for emitBroforceFx: FX-specific type, same unique authority ID.
  s.fx.push({...event, type});
}
function clearBox(s, b) {
  if (b.x < 0 || b.y < 0 || b.x + b.w > s.world.width || b.y + b.h > s.world.height) return false;
  for (let row = Math.floor(b.y / 16); row <= Math.floor((b.y + b.h - .001) / 16); row++)
    for (let col = Math.floor(b.x / 16); col <= Math.floor((b.x + b.w - .001) / 16); col++)
      if (isSolidTile(s.terrain, col, row)) return false;
  return true;
}
function actor(p) { return {...p, kind:'player', dead:!live(p)}; }
function enemyAt(s, spawn, id) {
  const type = ENEMY_TYPES[spawn.type] || spawn.type || 'rifleman';
  // BF-10 places a 12x26 reference actor. Align shorter BF-15 units at its feet.
  const e = createBroforceEnemy({id, type, x:spawn.x,
    y:spawn.y + 26 - (type === 'turret' ? 22 : 24), seed:hash(s.seed + ':' + id)});
  if (!clearBox(s, e)) return null; // Destroyed floors/walls cannot spawn trapped enemies.
  return e;
}
function createBroforceMission({stage, seed = 1, devilId, players, attemptId = 'bf-demo'} = {}) {
  if (!stage || !Number.isInteger(stage.width) || stage.width < 8 || stage.width > 384 ||
      !Number.isInteger(stage.height) || stage.height < 6 || stage.height > 48 ||
      (stage.tileSize != null && stage.tileSize !== 16)) throw new RangeError('Mission needs a bounded 16px stage');
  const chosen = CHARACTERS.find(c => c.id === devilId);
  if (!chosen || SPECIAL_UNLOCKS.includes(chosen.unlockBy) ||
      characterIdentity(devilId) === characterIdentity('loki'))
    throw new TypeError('Adapter must supply a BF-17 eligible catalog devilId');
  if (!Array.isArray(players) || players.length !== 2) throw new TypeError('Exactly two selected players required');
  if (typeof attemptId !== 'string' || !attemptId.trim() || attemptId.length > 96) throw new TypeError('attemptId required');
  if (!(typeof seed === 'string' && seed.length <= 256) &&
      !(typeof seed === 'number' && Number.isSafeInteger(seed))) throw new TypeError('Seed must be a bounded string or safe integer');
  const spawns = [point(stage.spawns?.[0], 'P1 spawn'), point(stage.spawns?.[1], 'P2 spawn')];
  const boss = point(stage.devilSpawn, 'Devil spawn'), landing = point(stage.extraction, 'Extraction');
  const terrain = createTerrain({...stage, tileSize:16});
  // stage.tiles and terrain.tiles are the SAME mutable authority, isolated from
  // the caller's authored stage. No second pristine collision map is maintained.
  const ownedStage = {...stage, tiles:terrain.tiles, spawns,
    enemySpawns:(stage.enemySpawns || []).slice(0, 256).map(p => ({...point(p, 'Enemy spawn'), id:p.id, type:p.type})),
    prisoners:(stage.prisoners || []).slice(0, 64).map(p => ({...p, ...point(p, 'Prisoner')})),
    checkpoints:(stage.checkpoints || []).slice(0, 32).map(p => point(p, 'Checkpoint')),
    devilSpawn:boss, extraction:landing};
  const s = {schema:1, stage:ownedStage, stageId:stage.stageId || stage.id || 'broforce-jungle',
    seed, attemptId, devilId, terrain, world:{width:stage.width * 16, height:stage.height * 16},
    phase:'active', tick:0, elapsed:0, remainder:0, eventSequence:0, projectileSequence:0,
    cancelled:false, terminal:null, bossActive:false, bossDefeated:false,
    timeLimit:clamp(finite(stage.timeLimit ?? stage.timeoutSeconds, 120), STEP, 600),
    rng:{rescue:hash(seed + ':rescue')}, enemies:[], projectiles:[], players:[],
    prisoners:createBroforcePrisoners(ownedStage.prisoners),
    director:createBroforceDirector({seed:seed + ':director'}),
    // BF-10 spawn describes 12x26 TOP-LEFT. Boss is 58x72: preserve feet.
    devil:createBroforceDevil({characterId:devilId, x:boss.x + 6 - 29, y:boss.y + 26 - 72, seed:seed + ':devil'}),
    extraction:createBroforceExtraction({x:landing.x + 6, y:landing.y + 13, seed:hash(seed + ':heli')}),
    // Rendering owns the BF-19 viewport camera. Director uses its own fixed
    // world-pixel view below, so screen resizing cannot alter spawn randomness.
    camera:{x:0, y:0, zoom:1}, events:[], fx:[],
    stats:{shots:[0,0], hits:[0,0], downs:[0,0], revives:[0,0], rescues:[0,0],
      kills:[0,0], tilesDestroyed:0, enemiesSpawned:0, droppedEvents:0},
    pendingEdges:[{jump:false, special:false}, {jump:false, special:false}]};
  s.players = players.map((source, i) => {
    if (!source || (source.owner != null && source.owner !== OWNERS[i])) throw new TypeError('Player owner/order mismatch');
    const selected = source.character ?? source.selectedCharacter ?? source.fighterId;
    if (!IDS.has(selected)) throw new TypeError('Selected catalog character required for P' + (i + 1));
    const weapon = Object.hasOwn(WEAPON_SPECS, source.weapon) && source.weapon !== 'grenade' ? source.weapon : 'rifle';
    const p = {...createBody({...spawns[i], w:12, h:26}), id:'P' + (i + 1), owner:OWNERS[i],
      name:typeof source.name === 'string' ? source.name : OWNERS[i], fighterId:selected,
      fighters:poolFor(source, selected), alive:true, downed:false, hp:1, boarded:false,
      aliveAtBoarding:false, extracted:false, status:'alive', invulnerability:GRACE_SECONDS,
      reviveCredits:1, reviveProgress:0, checkpointIndex:-1,
      weapon, weaponState:null, specialState:null, reload:0, ammo:WEAPON_SPECS[weapon].magazine,
      grenades:WEAPON_SPECS.grenade.magazine, pose:'idle', hitFlash:0, fireFlash:0, rescueFlash:0};
    Object.defineProperties(p, {selectedCharacter:{value:selected, enumerable:true},
      character:{value:selected, enumerable:true}});
    if (!clearBox(s, p)) throw new RangeError('Player spawn overlaps terrain or bounds');
    return p;
  });
  for (const [i, spawn] of ownedStage.enemySpawns.slice(0, MAX_ENEMIES).entries()) {
    const e = enemyAt(s, spawn, 'enemy:' + i + ':' + (spawn.id ?? 'authored'));
    if (e) {s.enemies.push(e); s.stats.enemiesSpawned++;}
  }
  return s;
}
function terrainAdapter(s) {
  return {world:s.terrain, damageTerrain(world, blast) {
    const result = damageTerrain(world, blast);
    if (result.destroyed.length || result.damaged.length) {
      s.stats.tilesDestroyed += result.destroyed.length;
      emit(s, 'world-destruction', {...blast, revision:world.revision,
        destroyed:result.destroyed, damaged:result.damaged});
      if (result.destroyed.length) {cue(s, 'wall-break', blast); fx(s, 'wall-break', blast);}
    }
    return result;
  }};
}
function down(s, p, sourceId) {
  if (!live(p) || p.invulnerability > 0) return;
  p.alive = false; p.downed = true; p.hp = 0; p.status = 'downed';
  p.vx = p.vy = 0; p.reviveProgress = 0; p.pose = 'dead'; p.hitFlash = .18;
  // Cancel queued bursts/edges on death, but retain sequence/ammo.
  if (p.weaponState) p.weaponState.burstLeft = 0;
  const i = s.players.indexOf(p); s.pendingEdges[i] = {jump:false, special:false};
  s.stats.hits[i]++; s.stats.downs[i]++;
  emit(s, 'player-hit', {playerIndex:i, owner:p.owner, sourceId, ...center(p)});
  emit(s, 'player-down', {playerIndex:i, owner:p.owner, sourceId});
  cue(s, 'hit', center(p)); fx(s, 'hit', center(p));
}
function applyHits(s, events, bossHits, seen) {
  for (const e of events) {
    if (e.type !== 'hit' || !(e.damage > 0)) continue;
    const key = String(e.source) + ':' + e.targetId;
    if (seen.has(key)) continue;
    seen.add(key);
    const p = s.players.find(p => p.id === e.targetId);
    const attacker = s.players.find(p => p.id === e.owner || p.owner === e.owner);
    if (p) {if (!attacker) down(s, p, e.source); continue;}
    // Friendly rounds alone may hurt enemies/boss. AI bullets cannot bypass this
    // by targeting another enemy, a cage or the devil.
    if (!attacker) continue;
    const enemy = s.enemies.find(enemy => enemy.id === e.targetId);
    if (enemy && enemy.hp > 0 && !enemy.dead) {
      enemy.hp = Math.max(0, enemy.hp - e.damage);
      emit(s, 'enemy-damage', {enemyId:enemy.id, hp:enemy.hp, sourceId:e.source});
      fx(s, 'hit', {x:e.x, y:e.y});
      if (!enemy.hp) {s.stats.kills[s.players.indexOf(attacker)]++; enemy.dead = true;}
    } else if (e.targetId === 'devil' && s.bossActive && !s.bossDefeated) {
      bossHits.push({id:e.source, targetId:'devil', damage:e.damage});
    }
  }
}
function combatEvents(s, events, bossHits, seen, rescues) {
  for (const e of events) {
    if (e.type === 'hit') continue;
    emit(s, e.type, e);
    if (e.type === 'explosion') {cue(s, 'explosion', e); fx(s, e.chain ? 'volatile-chain' : 'burst', e);}
    if (e.type === 'impact') {
      cue(s, 'impact', e); fx(s, 'sparks', e);
      const i = s.players.findIndex(p => p.id === e.owner || p.owner === e.owner);
      if (i >= 0) rescues.push({type:'cage-destroyed', playerIndex:i, x:e.x, y:e.y});
    }
    if (e.type === 'ricochet') fx(s, 'ricochet', e);
  }
  applyHits(s, events, bossHits, seen);
}
function combat(s, projectiles, dt, targets, bossHits, seen, rescues) {
  const byId = new Map(projectiles.map(p => [p.id,p]));
  const result = advanceBroforceCombat({projectiles, dt, targets,
    isSolid:(c, r) => isSolidTile(s.terrain, c, r),
    worldBounds:{x:0, y:0, ...s.world}, terrain:terrainAdapter(s)});
  // BF-14 subtracts only time-to-contact on ricochets. A grenade resting at a
  // wall otherwise has an infinite fuse. Keep its ACTIVE-time fuse here and
  // use the real explosion resolver if a bouncing grenade exhausts it.
  const active = [];
  for (const p of result.projectiles) {
    if (p.weapon === 'grenade') {
      p.life = Math.max(0,byId.get(p.id).life-dt);
      if (p.life <= 1e-9) {
        const boom = resolveBroforceExplosion({x:p.x,y:p.y,radius:p.blastRadius,
          damage:p.blastDamage,owner:p.owner,explosionId:p.id,
          terrain:terrainAdapter(s),targets});
        result.events.push(...boom.events); continue;
      }
    }
    active.push(p);
  }
  for (const e of result.events) {
    if (e.type !== 'explosion') continue;
    const round = byId.get(e.source);
    if (round) e.owner = round.owner;
    const i = s.players.findIndex(p => p.id === e.owner);
    if (i < 0) continue;
    for (const cage of s.prisoners.filter(p => !p.rescued)) {
      const x = clamp(e.x,cage.x,cage.x+cage.w), y = clamp(e.y,cage.y,cage.y+cage.h);
      if (Math.hypot(e.x-x,e.y-y) <= e.radius)
        rescues.push({type:'cage-destroyed',prisonerId:cage.id,playerIndex:i,x,y});
    }
  }
  combatEvents(s, result.events, bossHits, seen, rescues);
  return active;
}
function queueProjectile(s, p) {
  // Rewrite scheduler IDs: reloads, fighter swaps, and weapon changes must never
  // reuse a projectile ID or a BF-20 hit receipt from a prior magazine.
  return {...p, id:'round:' + ++s.projectileSequence};
}
function updatePlayer(s, p, input) {
  p.invulnerability = Math.max(0, p.invulnerability - STEP);
  p.hitFlash = Math.max(0, p.hitFlash - STEP);
  p.fireFlash = Math.max(0, p.fireFlash - STEP);
  p.rescueFlash = Math.max(0, p.rescueFlash - STEP);
  if (p.boarded) {p.pose = 'celebrate'; return;}
  if (p.downed) {
    // Corpses settle on the SAME terrain. Reviving does not teleport players.
    const body = advanceBody(p, {}, STEP, (c,r) => isSolidTile(s.terrain,c,r));
    for (const key of ['x','y','vx','vy','onGround','_stepRemainder']) p[key] = body[key];
    return;
  }
  const wasGrounded = p.onGround, oldVy = p.vy;
  const body = advanceBody(p, input, STEP, (c,r) => isSolidTile(s.terrain,c,r));
  // BF-13 returns a copy. Preserve the immutable identity properties on p.
  for (const key of ['x','y','vx','vy','facing','onGround','coyote','jumpBuffer','_stepRemainder']) p[key] = body[key];
  p.x = clamp(p.x, 0, s.world.width - p.w);
  if (oldVy >= 0 && p.vy < 0) {emit(s, 'player-jump', {playerId:p.id}); cue(s, 'jump', center(p));}
  if (!wasGrounded && p.onGround) cue(s, 'land', center(p));
  // Checkpoints are progression markers only; no checkpoint continues/reloads.
  s.stage.checkpoints.forEach((checkpoint, i) => {
    if (i > p.checkpointIndex && Math.hypot(p.x - checkpoint.x, p.y - checkpoint.y) < 32) {
      p.checkpointIndex = i; emit(s, 'checkpoint', {playerId:p.id, checkpointIndex:i});
    }
  });
  p.pose = p.rescueFlash > 0 ? 'rescue' : !p.onGround ? p.vy < 0 ? 'jump' : 'fall' :
    Math.abs(p.vx) > 4 ? 'run' : 'idle';
}
function revive(s, inputs) {
  s.players.forEach((p, i) => {
    if (!p.downed || p.reviveCredits <= 0) return;
    const helper = s.players[1 - i], a = center(p), b = center(helper);
    // BF-18 has a press edge: one special press starts a 32px partner revive
    // while the partner remains nearby, grounded, and does not move/fire.
    if (!live(helper) || !helper.onGround || !p.onGround || !clearBox(s,p) ||
        Math.hypot(a.x-b.x,a.y-b.y) > 32 || inputs[1-i].move || inputs[1-i].fireHeld) {
      p.reviveProgress = 0; return;
    }
    if (inputs[1-i].specialPressed || p.reviveProgress > 0) p.reviveProgress += STEP;
    if (p.reviveProgress + 1e-9 < REVIVE_SECONDS) return;
    p.reviveCredits--; p.reviveProgress = 0; p.alive = true; p.downed = false;
    p.hp = 1; p.status = 'alive'; p.invulnerability = GRACE_SECONDS; p.pose = 'rescue';
    s.stats.revives[i]++;
    emit(s, 'player-revived', {playerIndex:i, owner:p.owner, helperId:helper.id, ...center(p)});
    cue(s, 'rescue', center(p)); fx(s, 'rescue', center(p));
  });
}
function finish(s, outcome, reason) {
  if (s.terminal) return null;
  const boarded = s.extraction.boarded.map((v,i) => v && s.players[i].aliveAtBoarding);
  const won = outcome === 'extracted' && s.bossDefeated && boarded.some(Boolean);
  const bf = Object.freeze({schema:1, attemptId:s.attemptId, stageId:s.stageId, devilId:s.devilId,
    outcome:won ? 'extracted' : outcome === 'timeout' ? 'timeout' : 'failed',
    boarded:Object.freeze([...s.extraction.boarded]),
    aliveAtBoarding:Object.freeze(s.players.map(p => p.aliveAtBoarding))});
  s.terminal = Object.freeze({kind:'broforce', won, bf});
  s.phase = won ? 'completed' : 'failed';
  s.projectiles = []; s.pendingEdges = [{jump:false,special:false},{jump:false,special:false}];
  emit(s, 'mission-terminal', {terminal:s.terminal, reason});
  return s.terminal;
}
function tickMission(s, inputs) {
  s.tick++; s.elapsed = s.tick * STEP;
  const bossHits = [], seen = new Set(), rescues = [];
  for (const [i,p] of s.players.entries()) updatePlayer(s, p, inputs[i]);
  revive(s, inputs);
  // BF-15 sees player CENTRES for aiming; BF-20/BF-21 see TOP-LEFT bodies.
  const targets = s.players.map(p => ({id:p.id, ...center(p), alive:live(p)}));
  const bodies = s.players.map(actor);
  if (!s.bossActive && s.players.some(p => live(p) && p.x + p.w >= s.stage.devilSpawn.x - 220)) {
    s.bossActive = true; s.phase = 'boss'; emit(s, 'boss-activated', {devilId:s.devilId});
  }
  const activeBodies = bodies.filter(p => live(p));
  const viewWidth = Math.min(480, s.world.width), viewHeight = Math.min(320, s.world.height);
  const focusX = activeBodies.length ? activeBodies.reduce((n,p) => n+p.x,0)/activeBodies.length : 0;
  const focusY = activeBodies.length ? activeBodies.reduce((n,p) => n+p.y,0)/activeBodies.length : 0;
  const director = advanceBroforceDirector(s.director, STEP, {
    camera:{x:clamp(focusX-viewWidth*.35,0,s.world.width-viewWidth),
      y:clamp(focusY-viewHeight*.5,0,s.world.height-viewHeight), width:viewWidth,height:viewHeight},
    world:s.world, players:targets, spawnMarkers:s.stage.enemySpawns,
    activeEnemies:s.enemies.filter(e => e.hp>0 && !e.dead).length,
    bossActive:s.bossActive, phase:s.phase});
  s.director = director.state;
  for (const e of director.events) {
    if (s.enemies.filter(e => !e.dead).length >= MAX_ENEMIES) continue;
    const enemy = enemyAt(s, {x:e.x,y:e.y,type:e.enemyType}, 'director:' + e.spawnId);
    if (enemy) {s.enemies.push(enemy); s.stats.enemiesSpawned++; emit(s, e.type, {...e, enemyId:enemy.id});}
  }
  const ai = advanceBroforceEnemies(s.enemies, {dt:STEP, players:targets,
    isSolid:(c,r) => isSolidTile(s.terrain,c,r), worldBounds:s.world});
  s.enemies = ai.enemies;
  for (const e of ai.events) {
    emit(s, e.type, e);
    if (e.type === 'enemy-shot') {
      // Shots are actual BF-14 colliding rounds, never direct target-ID damage.
      const target = targets.find(p => p.id === e.targetId);
      const p = createBroforceProjectile({id:e.eventId, owner:e.enemyId, weapon:'pistol',
        x:e.x, y:e.y, dir:target ? {x:target.x-e.x,y:target.y-e.y} : e.dir});
      p.vx *= .36; p.vy *= .36; p.terrainDamage = 0;
      if (s.projectiles.length < MAX_PROJECTILES) s.projectiles.push(queueProjectile(s,p));
      cue(s, 'pistol', e); fx(s, 'muzzle', e);
    } else if (e.type === 'contact-hit') {
      const enemy = s.enemies.find(enemy => enemy.id === e.enemyId);
      const p = s.players.find(p => p.id === e.targetId);
      if (enemy && p && Math.hypot(center(p).x-(enemy.x+6),center(p).y-(enemy.y+enemy.h*.42)) < 40)
        down(s, p, e.eventId);
    } else if (e.type === 'enemy-explosion') {
      const boom = resolveBroforceExplosion({...e, damage:2, owner:e.enemyId,
        explosionId:e.eventId, terrain:terrainAdapter(s), targets:s.players.filter(live).map(actor)});
      combatEvents(s, boom.events, bossHits, seen, rescues);
    }
  }
  const enemyTargets = s.enemies.filter(e => !e.dead && e.hp > 0);
  if (s.bossActive && !s.bossDefeated) enemyTargets.push({...s.devil, owner:'devil'});
  // Cages are physical projectile targets; BF-16 checks impact attribution and
  // liveness, so an enemy round or a shot from a dead owner cannot claim one.
  enemyTargets.push(...s.prisoners.filter(p => !p.rescued).map(p => ({...p, id:'cage:' + p.id})));
  const kept = [];
  for (const friendly of [true,false]) {
    const rounds = s.projectiles.filter(p => OWNERS.includes(p.owner) || ['P1','P2'].includes(p.owner) ? friendly : !friendly);
    kept.push(...combat(s, rounds, STEP, friendly ? enemyTargets : s.players.filter(live).map(actor), bossHits, seen, rescues));
  }
  s.projectiles = kept.slice(0, MAX_PROJECTILES);
  const boardRequests = [false,false];
  for (const [i,p] of s.players.entries()) {
    if (!live(p)) continue;
    const input = inputs[i], muzzle = {x:p.x+p.w/2+p.facing*8, y:p.y+p.h*.42};
    let special = input.specialPressed;
    if (special && s.extraction.phase === 'hover' &&
        Math.hypot(center(p).x-s.extraction.zone.x,center(p).y-s.extraction.zone.y) <= s.extraction.zone.radius) {
      boardRequests[i] = true; special = false;
    }
    // A revive press never also throws a grenade at the downed partner.
    if (special && s.players.some(q => q.downed && q.reviveCredits > 0 &&
        Math.hypot(center(q).x-center(p).x,center(q).y-center(p).y) <= 32)) special = false;
    if (p.reload > 0) {
      p.reload = Math.max(0,p.reload-STEP);
      if (!p.reload) {
        p.weaponState = {...p.weaponState,ammo:WEAPON_SPECS[p.weapon].magazine,burstLeft:0,cooldown:0};
        emit(s, 'player-reloaded', {playerId:p.id});
      }
    }
    for (const grenade of [false,true]) {
      const key = grenade ? 'specialState' : 'weaponState';
      const shot = fireBroforceWeapon({state:p[key], owner:p.id, ...muzzle, dir:grenade ? {x:p.facing,y:-.6} : p.facing,
        weapon:grenade ? 'grenade' : p.weapon, fireHeld:grenade ? special : input.fireHeld && p.reload <= 0,
        dt:STEP, seed:hash(s.seed + ':' + p.id + ':' + (grenade?'special':'weapon'))});
      p[key] = shot.state;
      for (const e of shot.events) {
        emit(s, e.type, {...e, ...muzzle}); cue(s, e.weapon === 'launcher' ? 'grenade' : e.weapon, muzzle);
        fx(s, 'muzzle', {...muzzle, dx:p.facing}); s.stats.shots[i]++; p.fireFlash = .075;
      }
      // Respect BF-14's WITHIN-tick scheduling offset, including burst rounds.
      const pellets = WEAPON_SPECS[shot.state.weapon].pellets;
      for (const [j, round] of shot.projectiles.entries()) {
        if (s.projectiles.length >= MAX_PROJECTILES) break;
        const at = shot.events[Math.floor(j/pellets)].at;
        s.projectiles.push(...combat(s, [queueProjectile(s,round)], STEP-at, enemyTargets, bossHits, seen, rescues));
      }
    }
    p.ammo = p.weaponState.ammo; p.grenades = p.specialState.ammo;
    if (!p.ammo && !p.reload) {p.reload = .8; p.weaponState.burstLeft = 0; emit(s, 'player-reloading', {playerId:p.id});}
    if (p.fireFlash > 0) p.pose = 'shoot';
    rescues.push({type:'touch', playerIndex:i});
  }
  const prisoners = advanceBroforcePrisoners({prisoners:s.prisoners, players:s.players.map(actor),
    fightersByOwner:Object.fromEntries(s.players.map(p => [p.owner,p.fighters])),
    activeFighterByOwner:Object.fromEntries(s.players.map(p => [p.owner,p.fighterId])),
    interactions:rescues, rand:() => draw(s,'rescue')});
  s.prisoners = prisoners.prisoners;
  for (const e of prisoners.events) {
    const p = s.players[e.playerIndex]; s.stats.rescues[e.playerIndex]++;
    if (e.type === 'fighter-swap') p.fighterId = e.to;
    p.rescueFlash = .52;
    emit(s, 'prisoner-rescued', {prisonerId:e.prisonerId, owner:p.owner, playerIndex:e.playerIndex});
    emit(s, e.type, e); cue(s, 'rescue', center(p)); fx(s, 'hero-swap', center(p));
  }
  const boss = advanceBroforceDevil(s.devil, {dt:STEP, active:s.bossActive,
    players:s.players.map(actor), damageEvents:bossHits,
    isSolid:(c,r) => isSolidTile(s.terrain,c,r)});
  s.devil = boss.devil;
  for (const e of boss.events) {
    emit(s, e.type, e);
    if (e.type === 'devil-hit-player') {
      const p = s.players.find(p => p.id === e.playerId); if (p) down(s,p,e.sourceId);
    } else if (e.type === 'devil-cover-damage') {
      const result = terrainAdapter(s).damageTerrain(s.terrain,e);
      if (result.blasts.length > 1) {
        const chain = resolveBroforceExplosion({x:e.x,y:e.y,radius:0,damage:2,owner:'devil',
          explosionId:e.projectileId || 'devil:area:'+e.attackId,
          chainBlasts:result.blasts.slice(1), targets:s.players.filter(live).map(actor)});
        combatEvents(s,chain.events,bossHits,seen,rescues);
      }
    } else if (e.type === 'devil-reveal') cue(s,'boss-intro',e);
    else if (e.type === 'devil-hit') {cue(s,'boss-hit',s.devil);fx(s,'boss-hit',center(s.devil));}
    else if (e.type === 'devil-defeated') {
      s.bossDefeated = true; s.phase = 'extraction';
      cue(s,'boss-death',s.devil);fx(s,'boss-death',center(s.devil));
    }
  }
  s.extraction = advanceBroforceExtraction(s.extraction, {dt:STEP, devilDefeated:s.bossDefeated,
    players:s.players.map(actor), boardRequests});
  for (const e of s.extraction.events) {
    if (e.type === 'terminal') {emit(s,'extraction-terminal',e);continue;}
    emit(s,e.type,e);
    if (e.type === 'boarded') {
      const p = s.players[e.playerIndex];
      p.aliveAtBoarding = live(p); p.boarded = true; p.extracted = true; p.status = 'boarded';
      p.vx = p.vy = 0; if (p.weaponState) p.weaponState.burstLeft = 0;
      fx(s,'extraction',center(p));
    }
    if (e.type === 'cue') {
      cue(s,e.name,{x:s.extraction.x,y:s.extraction.y});
      if (e.name === 'helicopter') fx(s,'helicopter-arrival',{x:s.extraction.x,y:s.extraction.y});
    }
  }
  // Publish BF-15's pending combat deaths once before reclaiming slots.
  const deaths = advanceBroforceEnemies(s.enemies, {dt:0,paused:false});
  for (const e of deaths.events) emit(s,e.type,e);
  s.enemies = deaths.enemies.filter(e => !e.dead);
  if (s.extraction.outcome) return finish(s,s.extraction.outcome,s.extraction.reason);
  if (!s.players.some(live) && !s.extraction.boarded.some(Boolean)) return finish(s,'failed','team-wipe');
  // Once a live boarding receipt exists, an unboarded teammate's death or the
  // global clock cannot annul that extraction; BF-21 still completes departure.
  if (s.elapsed + 1e-9 >= s.timeLimit && !s.extraction.boarded.some(Boolean)) return finish(s,'timeout','mission-clock');
  return null;
}
function advanceBroforceMission(state, {dt = 1/60, inputs = [{},{}], paused = false, cancelled = false} = {}) {
  if (!state || state.schema !== 1 || !Array.isArray(state.players)) throw new TypeError('Mission state required');
  const s = state; s.events = []; s.fx = [];
  if (s.terminal) return {state:s,events:s.events,terminal:null};
  // Optional explicit exit intent; also accept state.cancelled from host cleanup.
  // The host disposes on exit instead of presenting/settling this failed envelope.
  if (cancelled || s.cancelled) {s.cancelled = true; return {state:s,events:s.events,terminal:finish(s,'failed','cancelled')};}
  if (paused) {s.pendingEdges = [{jump:false,special:false},{jump:false,special:false}];s.remainder=0;
    return {state:s,events:s.events,terminal:null};}
  const sampled = s.players.map((_,i) => {
    const p = inputs?.[i] || {};
    if (p.jumpPressed === true) s.pendingEdges[i].jump = true;
    if (p.specialPressed === true) s.pendingEdges[i].special = true;
    return {move:p.move>0?1:p.move<0?-1:0, jumpHeld:p.jumpHeld===true, fireHeld:p.fireHeld===true};
  });
  s.remainder += clamp(finite(dt),0,MAX_DT);
  const ticks = Math.min(12,Math.floor((s.remainder+1e-10)/STEP));
  s.remainder = Math.max(0,s.remainder-ticks*STEP);
  let terminal = null;
  for (let n=0;n<ticks;n++) {
    const tickInputs = sampled.map((p,i) => ({...p,jumpPressed:s.pendingEdges[i].jump,specialPressed:s.pendingEdges[i].special}));
    s.pendingEdges = [{jump:false,special:false},{jump:false,special:false}];
    terminal = tickMission(s,tickInputs); if (terminal) break;
  }
  return {state:s,events:s.events,terminal};
}
Object.assign(exports,{createBroforceMission,advanceBroforceMission});
