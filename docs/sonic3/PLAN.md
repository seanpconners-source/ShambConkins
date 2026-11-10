# Sonic rebuild: a Sonic 3 & Knuckles style game (roadmap R59)

Owner, Nov 10 2026: "make it exactly like Sonic 3 ... level design awesome and super true to the real game", a few acts per
zone then the boss, more zones later; then full stage + character sprite kits (bodies that take the players' faces).
Players: same as now (take turns on one phone; online = one shared world). Act length: like the real game.

Ground rule: true to Sonic 3 in feel, physics, pacing, route structure and the kinds of set pieces. Our own maps (not a
tile-for-tile copy of the real zones) and our own art; the owner's own sound rips are used as he supplied them.

## The engine (src/engines/s3/)
- `terrain.js` DONE: 16x16 pixel tiles with bit masks (pooled), four layers: all, path A, path B (Sonic 3's two
  collision planes, so loops and crossing routes work), one-way tops. Shapes: polygons from lines, beziers, arcs, eased hills.
- `physics.js` DONE: Sonic 3 player physics after the Sonic Physics Guide (Mega Drive values per frame): ground speed and
  angle, four ground modes, floor/ceiling/push sensors, slope factor (walk/roll up/roll down), friction, skid, roll,
  spin dash (8 + rev/2), jump (6.5, release cap 4), air drag, landing rules, slipping off walls/ceilings under 2.5,
  plane switchers. Test: `tests/s3-physics.mjs` (in test:core).
- DONE `objects.js` (tests/s3-objects.mjs in test:core; still to come: bumpers, water, corkscrews/tubes, mini-boss/boss, capsule): springs (all 8 directions, red/yellow), spikes (and hurt), rings + scatter on hit (Sonic 3 rules),
  monitors (rings, shields: fire/bubble/lightning with their moves, speed shoes, invincibility, 1-up), starposts, the
  insta-shield, badniks, bumpers, breakable walls/floors, collapsing ledges, moving/falling/swinging platforms, vines and
  zip-lines, corkscrews, tunnels/tubes, water (later zones), and the end-of-act sign/capsule.
- DONE `camera.js`: the Mega Drive camera (16 px box at x 144-160 of 320, air box ±32 round y 96, ground follow 6/16 px a
  frame, look up 104 / down 88 after 2 s, spin dash lag from a position history, limits that move 2 px a frame), scaled
  to the phone by k = min(H/224, W/320).
- DONE (stand-in art) `render.js`: terrain painted pixel for pixel from the collision tiles into 256 px chunk canvases
  (lazy, 2 per frame, LRU 72), parallax (sky, clouds, sea, far island, jungle), objects, effects, Sonic/Tails bodies with
  the player's face, Sonic 3 HUD, lives box, title card, tally.
- DONE (test area) `sonic3.js` + `testZone.js`: game id `sonic3-test` (Arcade, Sonic family, 1P kind 'game'): turns P1
  Sonic then P2 Tails, score = badniks + tally (time bonus + 100 a ring). Test: `tests/sonic3.mjs`.
  Still to come in the game: acts, lives/continues across acts, online, music. Takes over the ids `sonic-ring-rush` /
  `sonic-goal-dash` when Zone 1 is ready (old engine stays until then).

## Zone 1 status (Nov 10)
- Act 1 DONE as a first playable: `src/engines/s3/zone1.js` (game id `sonic3-zone1`, "Shamb Island Zone"): 14600 px, two
  roll tunnels (S-tubes: object `tube` forces a roll), three loops, plateaus with two tiers of spring-up ledges, a cave
  route, three lakes with log bridges (one crumbles), waterfalls, a vine gorge, a zip line, two starposts. Scenery list
  `decor` (lake / waterfall / palm / hollow = dark tunnel interior) drawn by `render.js drawDecor`.
- Owner asked (Nov 10) for the first level to be modelled on a real Sonic level map he sent. We build the same KINDS of
  set pieces in our own layout (the ground rule above), not a copy of that map.
- Map preview: `node tools/s3-map.mjs` → `docs/sonic3/maps/zone1-act1.png`. Tests: `tests/s3-zone1.mjs` (Node bot, every
  route reaches the sign; in test:core), `tests/sonic3-zone1.mjs` (browser, screenshots).
- Next: owner's map review + playtest notes, mini-boss at the end, then Act 2.

## Zone 1 (jungle island, Sonic 3's first-zone style)
- Act 1: ~2-3 minutes, three height bands (high fast route over the canopy, middle, low slower route with secrets),
  routes crossing at a few points, loops, swing vines, zip lines, breakable walls, springs, a mid-act starpost or two,
  a mini-boss at the end.
- Act 2: the zone after the fire bombing (scorched look, new hazards), longer, then the zone boss.
- Map review: every act gets a preview picture/page of the whole map before the owner plays it.

## Art (kit DONE Nov 10: docs/sonic3-sprites/, src/data/sonic3Sprites.js; wiring into render.js when art arrives)
- Sprite kit like Castlevania/Sundown: templates + a brief for GPT/Grok: player body sheets (head slot = the player's
  face), badniks, objects, terrain tiles/chunks, parallax backgrounds, title card, results screen.

## Sound
- Owner's Sonic 3 & Knuckles sound effects: in (`assets/music/s3k-sfx-*`, `src/engines/sonicAudio.js`).
- Music: the owner is gathering it.
