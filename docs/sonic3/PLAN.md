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
- NEXT `objects.js`: springs (all 8 directions, red/yellow), spikes (and hurt), rings + scatter on hit (Sonic 3 rules),
  monitors (rings, shields: fire/bubble/lightning with their moves, speed shoes, invincibility, 1-up), starposts, the
  insta-shield, badniks, bumpers, breakable walls/floors, collapsing ledges, moving/falling/swinging platforms, vines and
  zip-lines, corkscrews, tunnels/tubes, water (later zones), and the end-of-act sign/capsule.
- `camera.js`: the Mega Drive camera (horizontal lag box, vertical look up/down, follow speeds) scaled to the phone.
- `render.js`: chunks of terrain pre-drawn into canvases (lazy), parallax layers, the player bodies with face heads.
- `sonic3.js`: the game (acts, title cards, results tally with time/ring bonus, lives/continues, turns, online).
  Takes over the ids `sonic-ring-rush` / `sonic-goal-dash` when Zone 1 is ready (old engine stays until then).

## Zone 1 (jungle island, Sonic 3's first-zone style)
- Act 1: ~2-3 minutes, three height bands (high fast route over the canopy, middle, low slower route with secrets),
  routes crossing at a few points, loops, swing vines, zip lines, breakable walls, springs, a mid-act starpost or two,
  a mini-boss at the end.
- Act 2: the zone after the fire bombing (scorched look, new hazards), longer, then the zone boss.
- Map review: every act gets a preview picture/page of the whole map before the owner plays it.

## Art (after the levels play right)
- Sprite kit like Castlevania/Sundown: templates + a brief for GPT/Grok: player body sheets (head slot = the player's
  face), badniks, objects, terrain tiles/chunks, parallax backgrounds, title card, results screen.

## Sound
- Owner's Sonic 3 & Knuckles sound effects: in (`assets/music/s3k-sfx-*`, `src/engines/sonicAudio.js`).
- Music: the owner is gathering it.
