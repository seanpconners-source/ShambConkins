# AI state (keep short; update after meaningful work)

Version 0.60.0 (Hangman Unchained ×3, Symphony of the Night, Mario Kart 3D, SMB World 1, Photo Hunt cabinet, October minigame remakes; release file `releases/ShambConkins_v0.60.0.html`, ~58 MB, committed like 0.59.1; v0.58.3 was a GitHub Release asset).

## Implemented systems
- **Broforce (turn-based rebuild, Oct 13 2026):** one engine file `src/engines/broforce.js` (same 4 game ids in
  `packs/broforcePack.js`). P1 runs a 3-stage seeded mission, then P2 runs the same one; higher score wins (normal
  head-to-head settle). `buildStage(seed,si)` makes deep destructible tile maps (tunnels, bunkers, barracks, towers,
  cliffs with hidden caves, pits under bridges; stage 3 = Devil arena + chopper), ~100 enemies per mission (mook,
  bomber, bruiser, dog, grenadier) with sight limited to the screen. Movement: big jump, step-up, climb any wall you push
  into, ladders, drop-through platforms. Heads (`headCanvas`/`renderHead`): transparent art (>5% clear pixels)
  is trimmed and outlined (owner-approved look); a photo's plain backdrop is flood-filled away (`removeBackdrop`), busy photos
  get an outlined egg crop; generated SVG cards use the head-shaped stand-in. Contact sheet: `tests/broforce-heads.mjs`. Face per action: `broMood(p)`. Cages swap your bro (+1 life); the GOLD cage per stage holds a
  locked character from `gameRecruitPool` → `session.broforceRecruits` → `settleGame` recruits it to that player's
  roster (no random winner recruit for Broforce). The old co-op modules in `src/engines/broforce/` are unused except
  the legacy result path in `gameLauncher.js` (old saves); their unit tests still pass. Tests: `tests/broforce-turns.mjs`
  (screens at 390x780/780x390/1100x700 → `/tmp/claude-0/sc/bf-*`), `tests/broforce-board.mjs`. Real-phone feel untested.
- **Mario Kart 3D (Oct 13 2026):** engine `kart` (`src/engines/kart.js`), four games by `kartMode`: `rainbow-road-kart` 'race'
  (Grand Prix VS, side-by-side split P1 left/P2 right, 6 CPUs), new `kart-grand-prix-pass` 'gp' (P1 then P2 vs the same 7 CPUs,
  GP points 15/12/10/9..., same place → faster time +1), `kart-time-trial` 'time' (P1 alone with 3 mushrooms, P2 vs P1's ghost:
  `rec` frames → `ghostPose`, drawn translucent; fastest wins 100/99), `rainbow-balloon-battle` 'battle' (side-by-side, 1v1).
  Flow: one `s.frame` dispatching to `onFrame`; `chooseCourse()` card screen (debug `pick(id)`, auto 30 s) → `runRace(opts)`
  (own renderer/GL context, music, engines; resolves results). Courses in `kart3d/track.js` `COURSES`: Rainbow Road, Moo Moo
  Meadows, Cheep Cheep Beach, Bowser's Castle (`theme`, `offroad` band → `roadHalf`; off-road = 55% top speed); 3D ribbon built
  from turtle pieces (turns, hills, ramps + gaps, glider, anti-gravity `glue`, loop, corkscrew; flex straights auto-close).
  Non-rainbow courses are Rainbow-Road style too (loop/corkscrew + wall ride on glue, ramp gaps, a glider) with animated track
  characters from `kart3d/hazards.js` (pure functions of race time: cows + Monty Moles, crabs + leaping Cheep Cheeps, Thwomps +
  fire bars; course pieces carry `haz:[[f,kind,{d,ph}]]`, contacts in `hazardContacts`, meshes in `render.js`).
  `physics.js` track-space karts (Frenet), air/ramps/crests, rails, Lakitu, drift sparks (`DRIFT_LV`) → mini-turbo (`MT` .7/1.15/1.6 s),
  auto tricks. Drift: latch at 85% push, ends past 55% the other way or on release; only hard wall hits (>.75) cancel it.
  MK8-style arc: `driftAge` ramps the turn rate from 24% to full over 0.75 s while the kart slides a little wide; `k.slip` = drawn
  nose angle (grows with the arc and the thumb).
  `render.js` themes (`THEMES`: baked sky per theme, procedural road/kerbs/sand/stone, fences/walls, grass/water/lava ground
  plane, trees/cows/palms/pillars), karts with portrait billboards, ghost. `hud.js` (Tour HUD, two item slots, time mode),
  `music.js` (original loop). Camera (`cameraFor`) smooths the eye OFFSET from the kart (`cm.O`) and dollies the whole rig back with speed (`cm.zoom`, up to 1.6x on boosts), so speed is felt but
  the kart keeps its low spot on screen (per-aspect eye height/target). Arcade play uses the New Game picks
  (`store.setupNames` + `store.setupSelected`, gameLauncher). Controls = Mario Kart Tour per screen: drag steers (floating origin), full push latches a drift,
  release = mini-turbo, tap = item, swipe/drag up/down = throw. CPUs = random roster characters (`pickCPUs`). Needs WebGL (else a
  message and a tie); the Mode 7 engine is gone. Tests: `tests/kart-track.mjs` (Node, test:core), `tests/kart-controls.mjs`,
  `tests/kart.mjs` (all four games to the result screen). Real-phone feel untested.
- **Photo Hunt (Megatouch Aurora 2007 cabinet replica, Oct 13 2026):** `src/engines/photohunt.js` (same id `megatouch-photohunt`).
  800x600 cabinet screen full-bleed (`ph-shell`); `layout(W,H)` stretches it to the screen: 4:3 = exact cabinet, wider = 'cab' widened,
  ≥1200 logical wide ('wide', landscape phones) = one header row + ROUND/hint glasses in side columns, portrait ('tall') stacks the photos.
  Corner full-screen toggle `.ph-fs` (like the GB `.gb-fs`).
  Rules in `RULES` (reverse-engineered from owner's cabinet photos, bonus rounds unknown/not built): 48-pill bar, 48 s round
  −1.5 s/round (min 30), find = clock (1000 −25/s, resets per find), miss −3 s, cleared round pays 320/pill left, 3 hints per game,
  game ends when the bar empties. P1 plays a full game, then P2 on the other half of the photo library; higher score wins.
  Hi-score bar: `profile.photoHuntHigh` (house record WILLYZ CREW 369,127). Pairs: `assets/photohunt/<id>.a|b.webp + <id>.json`
  (embedded by build.mjs as `photohunt:<id>:a|b`; `src/data/photoHuntPairs.js` generated). `tools/photohunt.py` makes
  pairs (make: one photo + hand-picked spots remove/color/flip/grow/rotate/add; import: finished A/B pair, diff-detected;
  inbox; preview). Pairs: `sean-road-trip` + owner's 5 (dog-lab-crew, dog-lab-solo, amber-alien, space-desk, evil-lab; Gemini sparkle watermarks painted out,
  raw uploads in `assets/originals/photohunt/`). Photos repeat (mirror flipped) instead of the drawn scenes, which only fill in with no photos. Owner is supplying
  photos (pin-up/erotic theme); hand-pick spots and check every preview. Test: `tests/photohunt.mjs`. Real-phone feel untested.
- **Sonic (Oct 13 2026):** P2 is Tails (`drawRunner` palette + `tail()`); badniks redrawn. `sonic-ring-rush` id now runs `sonicMode:'boss'`
  (Green Hill Act 3): `buildLevel` ends in `L.arena`; per-world `w.boss` (Egg Mobile + wrecking ball, 8 hits, `stepBoss`/`bossTouch`,
  camera lock, capsule). Pilot = locked character from `gameRecruitPool` (prefers real art, head via broforce `headCanvas`); beating it
  pushes to `s.broforceRecruits` → `settleGame` recruits it (`cageGame()` in gameLauncher skips the random winner recruit). Test: `tests/sonic.mjs`.
- **Portraits:** owner uploads PNG/WebP to `assets/portraits/` on main; TESTver keeps 480px q88 WebP with originals in
  `assets/originals/portraits/` (`tools/run-claude-optimizer-safe.py` for PNG; oversized WebP uploads are shrunk the same way by hand).
  `artemis.think` has two different pictures (.png and .webp); the .webp is what the game shows.
- **Photo Hunt hand-edited set (Oct 13 2026):** 14 more pairs from owner phone screenshots (originals in
  `assets/originals/photohunt/<id>.jpg`): `tools/photohunt_handmade/make.py` crops screenshot chrome, paints out Gemini/Lens
  watermarks, denoises/sharpens, applies 5 hand-placed edits per photo (`pairs.py`; ops in `phlib.py`: recolor/remove/mirror/
  swap/inpaint; needs `pip install opencv-python-headless`), cuts the 37:32 window (`(x0,y0)` per pair) and writes the usual
  `<id>.a|b.webp + <id>.json`; then `python3 tools/photohunt.py index`. 20 pairs total.
- **Castlevania (v0.58.2):** Dracula's Castle NES stage map; Death boss (`death-cv`, reaper art and sickles), new themed music/cards/items/trivia. Games: `cv-vampire-killer` and `cv-candle-hunt` in `src/engines/castlevania.js`, test `tests/castlevania.mjs`. Owner: NES game is fun but the Phantom Bat was impossible (it hovered above whip reach): now hovers in jump-whip range, shivers before swooping, 12 HP, keeps damage on respawn, arena candles hold an axe + big heart (a crude bot wins in ~25 s).
- **Symphony of the Night (`cv-symphony`, unreleased):** dark PS1-style remake, separate from the NES game. `src/engines/sotn.js` (logic, level, HUD, turns like the NES engine: P1 run, then P2 vs P1's violet after-image), `sotnArt.js` (vector art: caped hero with the player's head + silver hair, monsters, Death, Dracula, demon form, parallax scenery via `Scenery`), `sotnAudio.js` (synth SFX through a generated reverb, per-area ambience, drop-in music). Level (LEN 3400, heightmap `gy` + blocks/platforms/water): forest Wargs with the overpowered Alucard Sword → gate slams → Death cutscene strips gear (fists) → Short Sword, Leap Stone (double jump), pot-roast wall → caverns (Mermen, stepping stones, Claymore; water drowns) → Marble Gallery → Castle Keep: Dracula intro (“What is a man?”), teleport/Hellfire/Dark Inferno, then demon (leap shockwaves, fire breath, bats; head = full damage, body 60%). Boss keeps damage on respawn; clock pauses in cutscenes. Moves (feel pass, Oct 14): walk accel `ACC`/skid `FRIC`, coyote `COYOTE` + jump buffer `JBUF`, light apex/heavy fall/jump-cut gravity, 3-hit combo `COMBO` (cut → lunging stab → cleave; buffered presses, cancel windows into the next hit/jump/backdash/walk, weapon `spd`), chainable backdash cancelled by a swing, dive kick (down+jump in air, bounces), Leap Stone somersault (`p.flip`), crouch, sub-weapons (hearts), hold-release Hellfire (MP). Blue after-image trail (`afterimage(p,w,life,k)`) + blue sword ribbon (`p.sw` from `A.bladeWorld`; poses in `A.bladePose`); hit sparks. Rendering interpolates the fixed 60 Hz sim (`savePrev`/`interp`/`uninterp`). Gore: split/burning corpses, blood particles → floor decals. Music: `assets/music/cv-symphony.mp3` / `cv-symphony-boss.mp3` (build inlines `music:<name>`). Full-bleed via the shared `fullBleed(s)` helper (`src/engines/fullBleed.js`), now the required screen style for every new game (CLAUDE.md, ENGINE_GUIDE); Broforce/Mario/Kart/Photo Hunt still carry their own copies. Tests: `tests/sotn.mjs` (full flow, screenshots `/tmp/claude-0/sc/sotn-*`), `tests/sotn-combo.mjs` (movement/combo feel numbers + screenshots `sotnc-*`), `tests/sotn-art.mjs` (contact sheet); `s.debug.bot` drives the hero. Real-phone feel and audio untested by ears.
- **Board (generation 8, grid):** `src/gridBoard.js` lays each realm on a 17-column tile grid (100 units/cell): stem from
  camp → crossroads → 3 roads (Calm/Adventurous/High Reward) in west/centre/east bands → gate. `gridPath` is an
  exact-length DFS (moves down/left/right only, no non-consecutive tiles touching); per-realm style (serpent/stairs/
  corridor/mixed). Bridges = planks across the gap columns (`board.bridges`); shortcuts = hops across a switchback
  (`board.shortcuts`, `node.shortcut`), each guarded by an obstacle `shortcut-<from>`. Landmarks get `node.card` boxes in
  free grid blocks. Horror (`layoutHorrorGrid`), Upside Down (square loop) and pair trails also sit on the grid.
  Rendering: `src/gridRender.js` (dark tabletop per realm, 3D tiles ringed in road colour, glass cards, lane chips,
  castle below gate); CSS `.board-svg[data-grid]` block at the end of `styles.css`. Old saves keep generation 7 boards
  (`multiPathBoard.js` + `boardZones.js` journey-map renderer). Tests: `tests/board.mjs`, `tests/shortcut.mjs` (UI flow), screenshots `tests/boardshots.mjs`.
- **Levels:** Mind/Body/Spirit (+ chance Horror). Level plaque + drink status, title cards with metal riffs,
  "Gentlemen…" intro card at run start, level-biased game selection (`levelFit`), Spirit humiliation dares.
- **Level bosses:** first player through a gate wins the level; others are dragged to the gate along the shortest path
  at −0.5/space, "INCOMING BOSS", co-op boss fight (`bossfight` engine, 34 bosses), win → boss character unlocked,
  everyone advances to the next level (`levelEndBoss`/`bossGateDrag`/`advanceAfterBoss` in `app.js`; `run.bossGate`).
- **Warp zones:** one pipe per realm (any lane); passing it stops the player and offers the warp; both players are
  swapped onto one of 8 themed mini-boards (`run.mainBoard` holds the real board) ending in a boss; used pipes show USED.
- **Games:** ~113 random-pool games + event variants. Packs: party (7), arena (6), Tarantino (6), Microgame Rush (33
  microgames), bosses. Living Dead horde is a full Vampire-Survivors-style game. Most games converted to touch gestures.
- **Content:** 655 characters (unlock paths audited by `tests/unlocks.mjs`), ~2,770 trivia questions, 650+ landmarks.
  Special unlock kinds: horror, boss, dogs (KC+Mylo only together via the early family event), item, lab, character-win.
- **Music:** generative board score. `src/musicGen.js` composes original songs (intro/A/A2/B/A3/break, voice-led
  chords, motif melodies) from a STYLE (home, mind, body, spirit, horror, upside-down, one per warp board) coloured by the
  BIOME of the landmark nearest the current player (`musicScene()` in `app.js`, re-checked every bar). `src/music.js`
  holds the band (`INST` presets, `perc`, role buses with bus-level reverb/echo sends, kick ducking, Horror dirt bus),
  the unchanged metal title-card riffs (`data/musicTracks.js`), the intro string chord and `playFanfare()` (unlock ditty,
  called from `unlockDialog`). Keep per-note node counts low: phones. `renderSceneInto()` renders a scene offline.

- **Pokémon battles (`src/pkmn/`):** Gen 1 battles on a 160x144 canvas in a Game Boy Color shell (`pkmnBattle.js`: overlay,
  input, 8x8 text engine, menus, mechanics, catching, party/STATS/bag/START screens), `gbFont.js` (hand-drawn bold font),
  `pkmnSprites.js` (portraits → dithered 4-shade sprites, type palettes, DMG mode), `pkmnAudio.js` (pulse/wave/noise synth,
  original chiptune songs, sfx, procedural cries), `pkmnData.js` (types/chart, moves incl. signature moves per source,
  abilities, species derived from every character, bag items), `pkmnRun.js` (team on `player.pkmn`, bag on `player.pkbag`,
  wild pool from the nearest landmark, trainer teams, rewards: catch/beat → `recruitReward(...,'encounter')`; special
  unlocks untouched), `pkmnWarp.js` (the Pokémon warp zone: route map, tall grass, Center, item balls, trainers with line
  of sight `board.warp.trainers`, Rival Gary gym). Hooks in `app.js`: `pokemonStep` (per-step wild roll, `run.pending.wild`
  resumes), landing cases `trainer|grass|center|pkitem|path`, event `unlockChar` → wild battle, `pkmn` HUD button.
  Board: 2 Poké Ball `trainer` tiles per level (own random stream in `gridBoard.js`). Poké items: `data/pkmnItems.js`
  (kind `pkmn`, `acquireItem` fills the bag). Cameo cast: `data/pokemonPack.js`. Tests: `tests/pokemon.mjs`,
  `tests/pokewarp.mjs` (autopilot via `ShambConkins.pkmn.auto`, `pkmn.speed`, `store.forceWildChance`).
- **Themed warp zones (v0.52):** `src/warpThemes.js` (`WARP_THEMES`: games, trivia, items, Chance cards, bonus/penalty
  fortunes per warp id; Pokémon excluded). On a warp board `requestGame` (gameLauncher) deals only the zone's games
  (`warpGameId`, own roulette candidates; off-theme ids incl. challenge items/tasks are swapped, boss fights allowed),
  `resolveLanding` uses `warpCard`/`warpItem`/`warpFortune`; pair turns/intros, the Home dog pack and `evolveBoard`
  are skipped on warp boards. Warp games live in `src/packs/warpPack.js` (`warpOnly`, `randomEligible:false`, in the
  arcade): `engines/sonic.js` (Green Hill, Mega Drive physics, modes boss/race), `kart.js` (3D Grand Prix
  VS/pass & play, Time Trials, Balloon Battle), `smb3.js` (N-Spade, Spade Panel), `candyLand.js`, `chutes.js` (Ladder Rush,
  Spinner Showdown on the real 1943 layout), `monopoly.js` (Speed Die, sealed-bid auction), `clue.js` (Whodunit with
  pass-the-phone notebooks, Lineup), `hyrule.js` (Rupee Rush, Sword Duel). Items: `data/warpItems.js` (`wz-*`, built
  with `packItems` from itemPackV43). Trivia: `data/warpTrivia.js` (topics smb3/candyland/chutes/monopoly/clue +
  extra Mario Kart/Zelda/Sonic). Tests: `tests/warptheme.mjs` (every warp space type stays on theme),
  `tests/warpgames.mjs [id-regex]` (play + screenshots), `tests/sonic.mjs`. Engines expose `s.debug` for tests.

- **Bond warp zone (v0.53):** `bond-lair` in `WARP_DEFS` (Volcano Lair scene `sceneLair` + `lairHQ` in `warpBoards.js`,
  theme `warp-bond-lair`, music style `bond-lair` with `mmaj9` chords). `lairWelcome` in `app.js` recruits a missing movie
  Bond per player on arrival. Boss `blofeld` (`bosses.js`, `unlockPool:'bond-villains'`, scene `lair`, attack `trapdoor`,
  bust `prop:'cat'`/`nehru`/`scar`): the launcher recruits `pickLairVillain` (`data/bondLair.js`: `BOND_VILLAIN_IDS`, 12
  lair-only villains with `unlockBy:'boss'`) instead of `unlockId`. Games in `engines/bond.js` (`bondLaser`,
  `bondFunhouse`, `bondBomb`; ids `bond-laser-vault`, `bond-golden-gun`, `bond-goldfinger-bomb`). Test: `tests/bondlair.mjs`.
- **Hangman Unchained (Oct 14 2026):** `src/engines/hangman.js` rebuilt full-bleed (`fullBleed`, engine `hangman` in the noBleed list). Django Unchained
  look: sunset desert, wooden gallows, detailed cowboys (P1 Django green jacket, P2 Schultz grey coat) with the player's head (broforce
  `headCanvas`) under a Stetson; parts per miss torso/arms/legs, 6th miss drops the trapdoor; revolver-cylinder lives; logo `makeLogo`
  (HANGMAN in red Django-style slab with drips, UNCHAINED, "The H is silent."). Big canvas keys (`keyGrid`). Modes by `hangMode` (all in `packs/remakePack.js` except the original id):
  `django-hangman` 'shared' (both at once on one phrase, own keyboards P1 bottom/left, P2 top/right; first to shoot a letter owns it,
  +10/occurrence, miss jams the gun .85 s, hanged −20, last letter +40; 3 phrases × 75 s), `django-hangman-showdown` 'turns' (one keyboard,
  strict alternation, 15 s shot clock → timeout = miss; `turnHeader`/`turnSweep` + glowing card show whose shot; round r starts with P(r%2+1))
  and `django-hangman-wanted` 'pass'
  (`packs/remakePack.js`: writer types or 🎲 deals a phrase + clue, guesser +10/letter, solve +60 +15/bullet, hanged → writer +50; swap).
  Deck: `src/data/hangmanPhrases.js` (~600 phrases, 12 categories). SFX all synthesized in `src/engines/westernSfx.js` (gunshot + canyon
  echo, ricochet, cock/dry fire/cylinder, spurs, gallop, snort, whinny, whip, trapdoor, formant "Yeehaw"). Test: `tests/hangman.mjs`
  (screens `/tmp/claude-0/sc/hm-*`). Real-phone feel and the sounds by ear untested.
- **Bricks Breaker Quest (Oct 14 2026, `bricks-breaker-quest`, `packs/bricksPack.js`):** replica of the neon mobile game from the
  owner's screenshots, separate from Daft Punk Neon Ball Storm (`ballvolley`). `engines/bricksQuest.js` (drawing/flow, own full-bleed
  shell, all drawn in 576-wide units scaled to fit: stage map with BRICKS logo, gems/stars, snake of stage tiles, SHOP/BALL/CLASSIC/
  MULTI/100BALLS bar; HUD ring buttons, star bar, 9x11 neon field, lightning ×3 / aim slider / ball plus ×3, recall + 200-gem rewind
  in flight, CLEAR!/FAILED panels with NEXT/CONTINUE), `engines/bricksQuestSim.js` (pure rules + physics in cell units: squares,
  4 triangle shapes, row/column lasers, bombs, +1 rings, 10×n combo score, `botPlay`/`botAngle`; green beam rings `-` row / `*`
  cross (drawn as ⊖/⊕): every ball passing fires it, 1 hit per brick on the line, gone after a turn that fired it),
  `data/bricksQuestLevels.js` (stages 1-36 hand built, 20/75/120/1043/1050 rebuilt from screenshots, `stage(n)` generates every other
  number). Queue (owner, Oct 14): every turn the next queued line drops in at row 1 (`queueLines(n)` adds 3-12 sparse lines to hand
  stages, +25% balls, `qb` overrides); with an empty queue the wall still moves 1 row; clearing the turn's top brick line drops
  3 lines at once (`st.lastDrop`), capped so the lowest brick stays above row FAIL_ROW-3 (my reading of the owner's stage 20
  screenshots; the video couldn't be fetched). Wall glides down (`slideY`: ~0.5 s eased, small settle; firing mid-slide finishes it); every button buzzes (`press()` → `vibrate(9)`) and
  flashes a ring. The Node bot clears all hand stages 1-36 (75/1043/1050 were already too hard for it). P1 picks a stage (any up to the next uncleared), both play it, higher score wins. Saves `profile.bricksQuest`
  {cleared,stars,gems,reward,gift} (validated in `profile.js`); board play gives each turn its own 300 gems. CLASSIC/100BALLS tabs =
  endless Ballz-style modes. Ball counts tuned so the Node bot clears every hand stage. Test: `tests/bricksquest.mjs` (screens
  `/tmp/claude-0/sc/bbq-*`, `STAGE=n`). Real-phone feel untested.
- **Super Mario Bros. World 1 (Oct 13 2026):** `engines/marioBros.js` (engine `marioBros`) + `engines/smb/smbLevels.js` (NES maps
  1-1 with coin room, 1-2 intro/underground/exit + Warp Zone above the ceiling, 1-3 treetops with lifts, 1-4 castle with firebars,
  lava, Bowser's bridge/axe/Toad; tiles on the 16 px NES grid, areas joined by `doors`) + `engines/smb/smbArt.js` (8x8 NES font on
  gbFont capitals, tile sets per look, title logo, sprites). Physics = NES SMB1 sub-pixel constants (`PH`, `JUMP`). Ids:
  `smb-world-1` (new; title menu 1 PLAYER GAME = whole game each with P2 vs ghost, 2 PLAYER GAME = NES swap on a lost life; 3 lives,
  NES timers, highest score wins), `smb-coin-rush` (60 s each, flagpole → next stage), `smb-castle-dash` (1-1 race). Warp pipes recruit
  one locked character per player from `gameRecruitPool` → `s.gameRecruits` → `settleGame` (same path as Broforce cages), then 1-3.
  Full-bleed layout (`fullBleed`: floating Pause/Exit/⤢ fullscreen and a Controls chip); view fits 240 px tall, wider screens see
  more level, tall phones get sky above/ground below. Luigi = green cap/shirt, white overalls; Fire = NES fireballs (4 px/f, max 2, bounce −3), 1-4's Bowser dies to 5 fireballs as a fake Goomba. Heads: `s.sprite(...,{still,noBadge,box})` reports the drawn size so the cap fits.
  Test: `tests/mario.mjs [world|alt|coins|race]` (physics numbers, every flow, screenshots `/tmp/claude-0/sc/smb-*`). Real-phone feel untested.

- **South Park warp zone (v0.56):** `south-park` in `WARP_DEFS` (town-map scene `sceneSouthPark` in `warpBoards.js`: route
  `SP_STREETS` along square street corners, buildings via `spHouse`/`spShop`, `spMecha` at Stark's Pond replaces the castle;
  CSS `.sp-sign/.sp-shop`; theme `warp-south-park`; music style `south-park`). Cast in `data/southPark.js`: 26 new
  `sp-*` characters with `unlockBy:'southpark'` (new SPECIAL_UNLOCKS kind, gated in `canRecruit`), `SOUTH_PARK_IDS`
  (also cartman/butters/randy/towlie), `pickSouthPark`. Recruits: `southParkWelcome` (app.js) on arrival, every board
  game won on the SP board (`settleGame`), Chance effect `['southpark']` (events.js). Boss `mecha-streisand` (body
  `mecha`, attack/sig `zinthar`, scene `southpark`, `unlockId:'barbra-streisand'`, `unlockName` shown in boss rules).
  Games in `engines/southPark.js`: `sp-dodgeball`, `sp-cheesy-poofs`, `sp-killed-kenny`. Items `wz-*` South Park pack,
  34 trivia lines in `warpTrivia.js` (feed the existing `southpark` topic). Test: `tests/southpark.mjs`.

- **Minigame remakes (v0.58):** audit of the 112 pool games; the ten weakest originals were rebuilt as new engine files
  (same ids/engine names; wired in `engines/index.js`, rules/durations in the `REMAKES` table at the end of
  `gameRegistry.js`): `brawndoMerge.js` (Suika physics, shared), `pancakeReview.js` (eating contest, shared),
  `skynetScan.js` (find the Terminator, shared, 7 tell rounds), `paperRoute.js` (Paperboy, pass&play),
  `boulderRun.js` (two corridors, shared), `baseketball.js` (bases/outs/innings + psych-outs), `penaltyKicks.js`
  (striker bottom half vs keeper top half, real time), `dinnerService.js` (burger line + grill, pass&play),
  `motionTracker.js` (Alien tracker pings + flamethrower, pass&play), `vanishingTicTacToe.js` (3-mark limit; wopr-grid
  is now WarGames). All use `tarantinoKit.js` helpers (label/fx/shake/sfx/halfPointers). The old versions in
  `restored.js`/`skill.js`/`puzzles.js`/`gestureLegacy.js` are now unused. Those later candidates were all rebuilt in the October 2026 audit (below).

- **Minigame audit, Oct 2026 (branch `claude/minigames-audit-polish-s7xpe8`):** see `docs/MINIGAME_AUDIT_2026-10.md`.
  26 weak games rebuilt as new engine files with authentic looks (Atari Pong, Space Invaders ×3 incl. new ids
  `space-swarm-versus`/`space-swarm-coop` in `packs/remakePack.js`, Breakout, Asteroids, Missile Command, Lunar Lander,
  Nokia Snake II, Stacker, Spy Hunter chase, TRON cycles, slither duel, Atari Combat, Scorched Earth, drag race, sumo,
  Nidhogg duel, Tapper, Battle Royale, GoldenEye Facility, Tri-D minichess, putt-putt, Olympic curling, Home Run Derby,
  NES Duck Hunt, Warriors beat 'em up, real dartboard); 8 re-skinned (incl. hockey shootout, Sewer Clash TMNT, Bat & Field ballpark that rotates upright in portrait). Shared helpers in `engines/retroKit.js`
  (`turnRunner` = P1 then P2 on one seed; `fitField`; pixel/vector fonts; glowing pixel sprites).
  Full-bleed for every canvas game: `session.bleed()` (on by default in `s.canvas`; `game.noBleed` opts out), floating
  ⤢/❚❚/✕ icons + score chips; per-game `BLEED_HUD` own/strip/pad in `gameRegistry.js`; `s.ownHud(hide,quiet)`.
  Titles/rules for remakes: `REMAKES` (by engine) and `REMAKE_META` (by id) at the end of `gameRegistry.js`.
  TESTver `c96afdd` merged in: engines with their own full-screen shells (photohunt, kart, marioBros, sotn via
  `engines/fullBleed.js`) set `noBleed` and keep their own fullscreen toggle.
  All only bot/fuzz-tested in headless Chromium; real-phone feel untested.

## Recent changes (this round of owner feedback)
Boss trigger fix + drag flow; 2x heads (board, collection, character select); collection pages fit the screen;
pinch zoom; warp pipes visible & pass-triggered; bridges; biomes; Parents' House → Mom/Dad only; Planet Coaster park +
King Coaster; Always Sunny portraits added by owner (optimized to WebP, originals in `assets/originals/`).

- v0.46.1: found challenge items (game/duel kind) offer "Play now / Keep in bag" (`foundChallengeChoices` in `app.js`);
  Quark's shop is a bottom sheet (`showDialog({sheet:true})`, choice `tag`/`badge`, `itemTag()` in `items.js`).
  Tests: `tests/itemgame.mjs`, `tests/shop.mjs` (screenshots to /tmp/claude-0/sc).
- v0.46.2–3: fullscreen (`src/fullscreen.js`): first tap enters it (browsers need a gesture); toggles via `fullscreenButton()`
  in home stack, every top bar and Settings; open modal dialogs are re-raised on change. Collections scroll endlessly
  since v0.55 (no pages).

- v0.46.4: Beer Pong + Flipadelphia visual overhaul. Drawing lives in `src/engines/pubVisuals.js` (cached pub room +
  table layer, neon sign, solo cups, 3D flip cup with culling, fx: particles/pops/shake). Physics/flick functions in
  `pubPhysics.js` untouched; projections now use a uniform unit (true proportions on wide screens). Screenshots:
  `tests/pubshots.mjs`.

- v0.46.5: Warehouse Shift is now Rush Hour in the Dunder Mifflin warehouse (`engines/warehouseShift.js` drawing/flow,
  `warehouseRules.js` slide rules + BFS solver, pool in `data/warehouseOrders.js` from `tools/gen-warehouse.mjs`; engine
  name stays `sokoban`). 75s shift, fire drill x2 last 15s. Test: `tests/warehouse.mjs`.

- v0.46.6–7: home is a dark mobile-game title screen (buttons: one dark plum palette, gold accent on play only) (`homeHTML` in `ui.js`, `.title-screen`/`.ts-*` block at the end of
  `styles.css`). Logo `ART.brand` = `assets/shambconkins-logo.webp` (transparent + black outline, from
  `tools/brand-logo.py`; original in `assets/originals/brand/`). Keep the NEW GAME button free of transform animations
  (Playwright clicks need it stable). Screenshots: `tests/homeshots.mjs`.

- v0.47.0: interface theme. `src/theme.css` (appended after styles.css by `tools/build.mjs`) restyles every menu, HUD,
  dialog, sheet and minigame frame in the title-screen look via tokens (`--t-bg0`, `--t-s1/s2/s3`, `--t-acc/acc2`, ...)
  on `body[data-theme]`. `src/theme.js` sets the theme: `home` for menus, the current player's realm on the board
  (mind/body/spirit/horror/upside-down), `warp-<id>` on warp boards (`applyRunTheme` in `showView`/`updateBoard`).
  Buttons inside `.game-body` are only re-themed through zero-specificity `:where()` rules, so game-specific button
  styles win. Board SVG art and canvases are untouched. Tests: `tests/themeshots.mjs`, `tests/contrast.mjs`
  (all 113 games pass; `WALK=11,22 node tests/contrast.mjs` audits dialogs on a real run).

- v0.48.0: new board music (above), unlock fanfare, title-screen EXIT GAME (`quitApp` in `app.js`; action `quit-app`, not
  `exit-game`, which leaves a minigame). Test: `tests/music.mjs`. Mixes were balanced by offline render (≈ −24 dB RMS,
  Horror ≈ −19) and CPU load measured at 3–12% of realtime on the test box; nobody has listened on a real phone yet.

- v0.49.0: grid boards + new board look (above); Beer Pong is a full match, 2 shots a turn, both in → "BRING IT BACK" third
  shot (`tests/beerpong.mjs`); character select rebuilt (`setupPanelHTML` in `ui.js`, `.cs-*` block at the end of
  `theme.css`, expressions cycle via `installSetupFaceCycle` in `app.js`; `tests/setupshots.mjs`); collections show
  "← Back" (home) instead of "← Board"; rare-encounter dialogs are dark.

- v0.51.0: route buttons sorted by map position (`stepTarget` in `app.js`, lane `cx` then x). Fork roads are free on grid
  boards: `installObstacles` bars no Level 1 road and one adventurous road in Body/Spirit only ~30% of the time (old
  saves keep their barriers). Board perf: gestures preview via CSS transform and commit the viewBox on settle
  (`gestureCamera`/`endGesture` in `ui.js`); camera glides render once over the union view and slide it
  (`repaintCamera`); `updateBoard` patches only changed SVG layers (`patchBoardSVG`, `<!--L-->` markers in `boardSVG`)
  and skips unchanged panel HTML (`setHTML`); grid boards have no looping SVG animations. Measure with
  `tests/zoomperf.mjs`. Deliberate spaces: leftover `event` tiles on new grid boards become trainer/trivia/Chance
  (pattern in `buildGridBoard`), tiles show `SPACE_CAPTIONS` (board.js), `showLandingBanner` (levelCard.js) names the
  action on landing, Chance draws skip trivia questions. `showSmashCard` + `glassSmash()` (audio.js) between the
  Gentlemen card and Level I.

- Level flow fix: only the level boss moves players into the next level. The rare "Express elevator" card (`effect:'body'`)
  now beams to the space before the Mind gate (it used to drop the player in Body, skipping the boss); item/card forward
  moves (`advanceAlong`, `bossAhead` in board.js) stop at the door of an unbeaten level gate; FRANK only opens Horror and
  `advanceAfterBoss` takes both players from the Spirit castle down to `horror-0`; `levelEndBoss` pulls a player out of
  the Upside Down first. Tests: `tests/levelflow.mjs` (Node random walks, in `npm test`), `tests/levelflow-ui.mjs`.
- v0.53.1 Pokémon: `battle()` starts the song, then `boardTransition` (full-screen `.gb-encounter` canvas over the
  board: 3 palette flashes + Gen 1 wipe from `wipeKind`/`drawWipe`) before `openGB`; if the GB is already open
  (trainer speech) `transition(kind)` runs inside it. Intro slides in silhouettes. Foes have `healsLeft` (1, gym 2)
  for heal/rest moves. `gen1Catch` = pokered catch + shake formula (red HP → catch rate ≥160). `.gb-fs` toggle in the
  bezel. Test: `tests/encounter.mjs` (screenshots `/tmp/claude-0/sc/enc-*`).
- v0.54.2: on portrait screens (`aspect<1`) `cameraBox` scales warp boards' (`format:'warp'`) follow span by `aspect*.75`,
  so spaces read without pinching. Screenshots: `node tests/warp.mjs 390x780` → `/tmp/claude-0/warp-*`.
- v0.55.0: Flip cup needs a firm flick (`flipFlick` power ~0.95–1.45 lands; seeded wobble via `rng` arg = `s.random`).
  Warp boards end like levels: `warpGateReady` + `levelEndBoss`/`bossGateDrag` with `run.bossGate={warp:true,bossId,realm:'warp'}`
  (`gateBoss()`), `exitWarpZone` clears it; Kanto keeps the gym. Landmark labels come from `src/data/iconicPlaces.js`
  (source → iconic place, applied in `references.js`; personal sources absent on purpose). Vault/roster (`catalogHTML` in
  `ui.js`) render 24-card chunks and append on scroll (`installCatalogFeed`, IntersectionObserver on `.catalog-more`);
  filters are a `<select id=catalog-filter>`. Boss games unlock in the vault once beaten (`bossBeaten` in gameRegistry,
  `profile.bossesBeaten`, older wins count via the boss's shared unlock); `POKEMON_MATCHES` + `arcadePokemon()` in app.js
  run wild/trainer battles on a throwaway one-space run. Tests: `tests/warpboss.mjs`, `tests/vault.mjs`, `tests/catalogshots.mjs`.
- Boss fights fill any screen: `layout()` in `engines/bossFight.js` stretches the logical field to the canvas aspect
  (H stays 640, W 420…1700). From W≥720 (`wide`) the boss sits lower/bigger (`B.hy` 185, `bs` 1.25), players spawn
  on either side of it (`spawnX/spawnY`), fly y≥90 (`YMIN`), are pushed out of its hit circles, and their guns, MEGA
  BEAM and stars aim at the boss or a nearer minion (`p.aim`). Portrait keeps the old field. Short landscape screens
  hide the scorebar/status/hint (`.boss-shell` CSS). Screenshots: `node tests/boss.mjs` (wide + phone).
  Wide difficulty (v0.56.2): `WIDE_K` (dens 1.3, spd 1.1, rest .78, player dmg .96) plus wide-aware attacks via
  `F.wide`, `F.targets()` (every living player) and `F.downs(m)` (one 'down' direction per player): aimed/fan/laser/
  wave/flamebreath/bounce/gumdrops cover both flanks; trapdoor/riddle use ~140-wide panels with a safe one near each
  player; gapwall/shockwave drop from the top with a gap per player; wrecking ball reaches the flanks; drone slots
  hover at y≈150. Measured with `tests/bossdiff.mjs` (debug: `steps`, `nodraw`, `holdPhase`, `immortal`, `hits`,
  `hitSrc`, autopilot reaction time): all 36 bosses, wide 9.1 / landscape 9.2 vs phone ~9.8 hits/min, same damage rate.
- Launch music: boot now starts the home score (it used to call `showView('home')` without `home()`), and
  `installAudioUnlock()` (audio.js) resumes the suspended AudioContext on the first tap/key.

- Drop-in mood portraits: `portraitURL` (assets.js) now prefers the owner's `USER_PORTRAITS` `char:<id>:<mood>` (never generated `ART`
  placeholders) over the base `photo:char:<id>` (it
  used to return the base photo for every mood). Board idle cycle shows normal/win/think/silly/angry; character select
  cycles every distinct expression (no 5-face cap).
- Pokémon mood sprites (v0.57.0): `portraitMoods(id)` (assets.js) lists moods with the owner's own art (drop-ins or
  supplied faces). `pkmnSprites.js` dithers each into front/back sprites in the background (`characterSprite(id,kind,mood)`,
  `moodSprite(sp,mood)`); `drawMonSprite` shows `m.mood`: think while choosing, win on landing a hit, angry when hit or
  hurt by poison/burn, silly on a confusion self-hit, sad on a miss/faint and a beaten trainer. Sprites are made at
  runtime from portraits, so new uploads need no step. `portraitMoods` also counts built-in raster photos in `data/art.js`
  (Sean, Amber) and moods sharing a picture; never SVG placeholders. `dither` crops full rectangular photos to an oval.
  Tests: `tests/pkmnmoods.mjs` (contact sheet of every mood character), `tests/pkmnmoodbattle.mjs [mine foe]`.

## In progress / unverified
- Warp minigames only bot/fuzz-tested in headless Chromium; Sonic, Mario (turn-based) and the 3D kart (WebGL, two viewports) need a
  real-phone check for feel and frame rate.
- Board smoothness only measured in headless Chromium (software compositing); check pinch/zoom on a real phone.
  Last round also enlarged in-game heads (global `spriteSize()` in `engines/session.js`, plus
  Flappy/Curling/Angry Heads), rebuilt the cones game as Cone Chaos (`engines/coneChaos.js`) and made Fruit Ninja
  slice the opponent's head. `npm test` green.

## Known issues / next steps
- Balance only bot-tested: boss fights, horde long runs, Disc Duel, Stunt Chase.
- Some fictional characters have no Wikipedia photo → emoji placeholder; friends (Shane, Carlos, Bert) and Flarpy need
  drop-in portraits from the owner.
- Chess/Checkers keep buttons; Minigolf, Fielding, Bike, Baseball, Rainbow Rivals still use small landscape canvases on phones.
- Trivia3 skews hard (~34% hard) and has some mid-confidence facts; worth a skim.
- Repo root has a stray 1-byte file `Test` created by the owner; leave it unless asked.

