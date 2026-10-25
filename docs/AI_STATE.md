# AI state (keep short; update after meaningful work)

Version 0.66.1 (Oct 24: trivia vs CPU shows its turn, `cpuTriviaTurn` in cpuKit; v0.66.0 1-player board game vs CPU + Choose Characters; v0.65.0 online board game on two phones; v0.64.0 online duels phase 1; v0.63.1 loading screen, full-screen app, Worker serves the app files; v0.63.0 PWA; earlier: pinball tables, iPad fix, backup/restore; TESTver fast-forwarded into main). Releases are GitHub Release assets only:
pushing a version bump to main runs `.github/workflows/release-build.yml`, which builds `releases/ShambConkins_vX.html` and
creates release vX with notes from `docs/releases/vX.md` (first line `# ` = title) or the CHANGELOG section; skips if it exists.
Test helper `tests/lib.mjs` ignores CORS-blocked online photos (file:// origin).
Hosted (Oct 23): Cloudflare Worker `cloudflare/worker.js` (README there) serves the newest GitHub Release asset at
`shambconkins.loki-mylo.work` (+ `shambconkins.sean-p-conners.workers.dev`); new releases appear within ~5 min, nothing to redeploy.
It also serves the app files (`/manifest.webmanifest`, `/sw.js`, `/icons/*.png`, `/index.html`) from same-named release assets (the release
workflow uploads them from v0.63.1); without them the game uses its blob manifest and Chrome makes a badged shortcut, not a WebAPK.
Release assets must stay named `ShambConkins_<tag>.html`. Owner set it up from an Android phone (Samsung Internet blocks paste/OAuth; Chrome works).

## Implemented systems
- **Solo / 1P arcade (Oct 19 2026, batch 1 of 4, branch `claude/solo-mode-batch1`):** Arcade 1P / 2P switch + solo player
  (Sean/Amber → unlocks to that roster) + CPU Easy/Normal/Hard (`profile.settings.solo`, `soloStripHTML` in ui.js). `src/solo.js`
  (`SOLO_IDS` kinds levels/rounds/cpu, `soloFinish`/`soloProgress`/`cpuSkill`, `profile.soloBest`), launcher `soloPlayers`/
  `settleSolo` (one result card, Play again), Exit = "Bank & quit". Batch 1 (levels): Broforce ×4 (mission after mission),
  SMB World 1 (loops after 1-4 until game over), Coin Rush (coin goal 15+5n), Castle Dash and CV Vampire Killer / SotN (shrinking
  clock), Candle Hunt (heart goal 12+6n), Sonic ×2 (fresh act + new boss pilot each clear), Bricks Quest (stage after stage),
  Hole.it (level after level, map progress saved), Photo Hunt (whole library), Kart GP (podium → next course), Time Trial (beat
  your ghost), Kart VS = vs CPU rival kart (the other New Game pick). Goals/tuning are guesses. Test: `tests/solo.mjs`.
  Batch 2 (rounds, Oct 19): 41 solo games now. `turnRunner` (retroKit → `soloTurnRuns`) and `arcadeRounds` (arcade.js →
  `soloArcadeRounds`) replay the game in rounds with the world clock sped up 11%/round (max 1.75x); beaten = last the clock,
  or `soloPass`/`soloTarget` (darts, Duck Hunt, lander, GoldenEye, Home Run Derby, Warriors, bike, gophers, archery).
  Other pass-and-play engines are kind `'turns'`: launcher `soloTurnRounds` runs the engine once per round, `session.pass(1)`
  ends the round with P1's score, `s.frame`/`s.timer` run at `solo.speed`; target = last round's score (×.6 for one-ball/
  flip/pitch/shot games, `SOLO_FACTOR`). `s.soloWorld()` exposes the round state for tests.
  Batch 3 (CPU opponents, Oct 20): kind `'cpu'`; P2 is a CPU wearing the other New Game pick ("Amber (CPU)"). `engines/cpuKit.js`
  (`isCpu`, `cpuSkill`, `cpuHotseat` = skip hand-off cards after the first and play the CPU's turn through the engine's own move
  function, `negamax`, `cpuDepth`/`cpuBlunder`), `engines/cpuBoards.js` (board pickers). Shared input kits take a CPU: vs CPU the
  human owns every touch (`arenaTouch`/`halfPointers`/`ownedPointers`/`directionGestures`/`arenaGestures`, opt out with
  `cpuOwner:false`), and P2 is driven by `kb.cpu(key,down)` (arenaKeys), `keyboard(...).hold/tap` (tarantinoKit), `fingers.cpu`
  virtual finger (halfPointers/arenaTouch), `keys.cpu` (duelInputs), `controls.cpu` (arenaGestures). Each engine has a small
  `cpuThink`-style brain (search for `vs CPU:` comments). ~80 games now play solo. Balance is bot-tested only (an idle human vs the CPU).
  Batch 5 (Oct 20, the last four): every Arcade game now plays in 1P. Owner rule (Oct 21): a co-op game with a take-turns version
  keeps its CPU teammate in 1P; one without is played ALONE. Space Invaders co-op = CPU teammate (`SOLO_COOP`/`soloCoop` in
  solo.js; engine sets `s.solo.coop=true` + `s.solo.won`, `settleSolo` scores the team total, labels say WITH CPU; versus brain
  leaves the human's columns alone); Space Swarm is its solo version. Living Dead horde = solo kind `'alone'` (`alone` in horde.js:
  `P` has one player, `mate(p)` = partner or self, `soloMode` thins the horde: cap/rate ×.6, hp ×.8, final boss ×.55, dmg ×.9;
  touch anywhere steers; sets `s.solo.won` + `soloProgress`). Boss fights (arcade rematches) are `'alone'` too (`soloKind` in bossPack; `alone` in
  bossFight.js: one plane centred, `SOLO_K` boss HP ×.5 and attack density ×.7, `SOLO_HP` 5 hearts, no revives). Bot sim (8 bosses,
  autopilot .25 s): 1P wins 4/8 vs 2P 3/8. Rainbow Rivals = kind 'levels': leg after leg vs Mario/Luigi
  on a fresh course, outscore the rival to move on; `rivalThink(...,goof)` makes it fumble rows (.3−.2·skill, ×.82 per leg).
  Balloon Battle = 'cpu': `soloKart` battle branch, CPU kart via `battleBrain` in kart.js (takes the shorter way round the ring,
  U-turns toward the rail, own lane keeper with ¼ curve feed-forward because `autoInput` sits ~45 off its lane on the ring,
  items by distance ahead/behind); HUD shows the rival's balloons. Scratch-tested to the result card (an idle human loses 2
  balloons in 100 s on Normal); real-phone feel untested.
  Batch 4 (trivia/cards/dice/table, Oct 20): ~110 solo games. Trivia ×9 (`cpuTriviaPick`: right-answer chance from question
  difficulty × level; `cpuThinkTime`), casino ×4 (`casinoCpu` in casinoTable.js polls `s.debug`: locks a bet, plays via
  `act`, agrees to cash out when the human does), Yahtzee ×2, Uno, Guess Who, Liar's Dice (odds-based bids/LIAR; also fixed:
  hands now roll only the dice a player has left), Battleship (hunt/target), Simon (memory span), Price Is Right, Clue ×2,
  Monopoly ×2, N-Spade (imperfect memory), Hangman Wanted (CPU deals its bounty), Microgame Rush ×2 (CPU half resolves
  by a skill roll, human gets the upright bottom half). CPU hands/notebooks are hidden on its turn. `SOLO_HIDDEN` (solo.js)
  hides Newlywed, Roast Battle and Draw It from the 1P list. Tests: scratch scripted-human runs to the result screen for
  every batch-4 game + `tests/solo.mjs` + 2P fuzz; casino tables only end on cash-out/bust.
  Windows box: Node 24 at `C:\Program Files\nodejs` (not on PATH in the agent shell), git = GitHub Desktop's bundled git (no push creds).
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
- **Hole.it (Oct 14 2026):** game id `paddys-hole` (engine name still `hole`, so saves/families are unchanged) now remakes
  the mobile game Hole.it (Rocket) from owner screenshots + a gameplay video. Real WebGL: `src/engines/holeIt/gl.js`
  (instanced vertex-colour meshes, tiled tray floor with the hole discarded in the shader, rim/throat lathes, floor decals for
  contact shadows, the yellow size arc and the gold level-up ring, textured head tokens), `meshes.js` (~60 procedural props
  in toys/fruit/kitchen/sushi themes + Rum Ham/Fight Milk/head-token cameos), `levels.js` (deterministic `buildLevel(N)`:
  rows/rings/spirals/snakes/piles/towers/pillars, goal cards, `holeRadius`/`sizeNeed`), `sim.js` (movement, tip-in physics,
  stacks, growth, boosters, `botInput`). Feel pass (owner): props tip over the rim (slide inward, top tilts to the centre,
  `it.tip` phase), then fall with wall bounces and a steady tumble; springy hole growth (`h.rv`); the size arc shows an eased
  `turn.arcV` (size−1+progress) so it fills smoothly and rolls over on a size-up; camera smoothing is frame-rate independent.
  Second owner video (Oct 14): item goals ask for EVERY copy on the board (`need` = tally; kinds over `cap` are trimmed with
  `removeItems`, which keeps stacks standing); every 5th level from 4 (`isScoreLevel`) is a ★ points level (`def.mode='score'`,
  goal `{k:'score'}` = sum of `propXp`, wide star card `drawScoreCard`); popups show each prop's value; goal props/stars fly from
  the hole into their card (`turn.flyers`, card counts wait for arrivals); too-big props sag into the mouth on the rim, lean in
  and get nudged by the moving rim (`it.wob/lean`, `relocate` keeps the grid right). New props: popsicles ×6, kiwi, tomato;
  Sweet Shop theme (`treats`); Lego brick towers (`fLegoTowers`) in toy/treat levels.
  Fourth owner video (Oct 14, his Galaxy Fold inner screen 1080x1200, `Claude Share/`): Levels 2-3 whole + first second of 4.
  Measured by stitching a map from the video (floor-shift tracking × camera scale): camera = Unity-style fixed 60° vertical FOV,
  pitch 64°, centred on the hole, dist 9.53·(r/.5)^.37 (`cameraFor` in holeIt.js; rim = 11.8% of screen HEIGHT at Size 1, so tall
  phones see less width, as in the real game); `holeRadius` .5·(1+.34k−.006k²) (Size 3 = 1.66x, Size 4 = 1.97x, Size 10 ≈ 3.6x);
  top speed 2.42·(r/.5)^.42 u/s (`topSpeed`, was ~45% faster), full speed in ~0.1 s (`acc` rate 20/s), camera follow 18/s;
  joystick full at 37 px of 1080 knob travel. HUD sizes are the video's px × u (u = width/1080): level pill, timer (alarm clock,
  green bar), cards pop in one by one, booster bar 76 px right of centre, padlocks; boosters unlock grow L3 (video), speed/magnet/
  freeze L6/9/12 (guess). No intro screen any more (real game has none): the level shows at once, clock waits for the first drag;
  end button says Next; heading arrow outside the rim; "Size N" scales with the hole; lighter floor halo, plank floor, softer grass.
  Clocks: default 4:00 (`TIME` 240; owner chose real clocks everywhere), hand levels set `time`. Hand levels 2-6 in
  `handLevels.js` (`arm`, `popRing`, `fruitBlock`, `popSpiral`/`popRing2`, `legoStack`); per-kind/per-item `xp` (`itemXp`).
  Fifth owner video (Oct 14, Levels 4-6 whole, `Claude Share/`): Level 4 rebuilt (200/88/228 + 3 peaches), Level 5 (popsicle
  spirals/rings round Lego stacks with the 4 goal trains), Level 6 (gadget room: 2 green fridges, 2 toy helicopters, 7 TVs) from
  maps stitched from the video; ~30 new props. Size bar rate measured: `sizeNeed` = 15·1.67^(N−1) (`GROW`); the arc decal has a
  dark outline and rounded ends and spans 300° from ~7 o'clock clockwise (gap at the bottom for the label; gl.js mode 2, `uBand`).
  PHYSICS (Oct 15): every prop is a cannon-es rigid body (`src/vendor/cannon.js`, MIT, 0.20.0 CJS build; only change: perf_hooks
  → globalThis.performance). `holeIt/physics.js`: shapes from mesh bounds (box/cyl/sphere, sets SPHERE/BOXY, `KINDS[k].hull`
  override, e.g. helicopter), floor = plane with contacts inside the hole circle dropped (narrowphase hook), static walls/islands,
  kinematic rim beads (tops flush with the floor, outside the circle) + two rings of throat spheres, slippery prop↔hole material,
  collision groups (hole/static parts only test props), a gentle pull toward the centre for props over the hole, speed cap +
  put-back for props flung past walls. Size-class rule (sim.js): a prop with r ≤ 0.96·hole r hanging into the hole is `ghost`ed
  (stops touching floor/rim/throat) so it always drops; bigger ones stay physical and wedge, get carried and tip out (fridge
  wedges at Size 5, drops at Size 6, as in the video). Handoff to the throat animation (`startFall`) once a prop's top is near
  the floor inside the circle; anything below y −1.5 counts. Perf: only props near the hole or a moving prop are in the world
  (`activate`/`prune`), far props resting on the floor that are only jostled are put back to sleep, settled poses cached on
  `def._settled`. ~0.3-1.7 ms per 60 Hz step on the dev laptop (Level 5, 1,000 popsicles, is the heaviest). Test:
  `tests/holeit-physics.mjs [levels] [secs]` (autopilot clears 2-6); `tests/holeit.mjs --node` checks layouts with
  `{physics:false}`. Bravo! card = real bonus screen (`holeIt/bonus.js`): coin pile "20", x2/x3/x5/x3/x2 bar, sliding arrow,
  Collect banks 20×tile in `profile.holeItCoins` (no advert). Level screen (`holeIt/levelMap.js`) = the real pre-level screen
  (meadow, lake, tree, blue truck with player 1's face, hole, coins pill, green "Level N" button) + a row of level bubbles
  (stars, padlocks); Play drops the goal props into the hole; coins won pop out of the hole next time (`store.holeItCoinPop`).
  STACKS (Oct 15-19, owner: "ours are shaky before the player comes near"): cannon can't hold separate bodies stacked 20 high,
  so every column (props built up off the floor + what they stand on, `groups` in physics.js) starts FROZEN as static bodies
  exactly where the level put it; when the hole reaches under it (or a hard hit, `LOOSEN`) it becomes ONE rigid compound body
  (`buildCompound`, straight and stable). Pieces over the hole split off and drop (`stepCompounds`), and everything resting on a
  piece that leaves goes with it, so a tower sinks straight down; a multi-column stack (Level 5 Lego) loosens the columns within
  1 unit of the bite into a calm heap (`split(...,calm)`); a hard landing (`SHATTER`) breaks a compound up. Props the hole can
  swallow don't collide with the rim/throat at all (stay put until over the hole); round props roll little (damping).
  Never add/remove bodies inside a world step (collide events queue `pendingRelease`). prune keeps bodies something rests on.
  MEASURING TOOLS (scratchpad, not in repo): vserver.mjs serves the video + `/save`, `/data`, `/shots`; helpers.js (`track2`
  perspective-correct hole path from floor motion, `toWorld` camera inverse, `mosaicTD` top-down level map from the warped frames,
  `side` real-vs-ours sheets); replay.mjs drives our hole along a traced path (`sim.path`, `sim.fixedDt`) and screenshots at
  video times. Measured: Level 5 popsicles 0.61 x 0.35 (+stick), 0.47 apart, spirals from detected popsicles (`ARM`, `RED_ARM`),
  ring radii 2.05/2.86/3.68, stacks 2.2 x 2.2 of 7 brick layers (`brick-*`, 0.55x1.1x0.37), train needs Size 6 (r 1.15),
  bricks +1, train +10; Level 4 blocks + cross-shaped tray (3 grass corners) from the top-down map; top speed 2.5·(r/.5)^.53.
  Replays: Level 5 sizes match the video to Size 4 (85 s), then run ~1 size behind (Size 6 at 101 s vs 92 s); Level 4 eats
  ~280 of the video's ~430 by 63 s (Size 6 vs 7). Level 3 and 6 sizes not re-measured with the new tools yet.  Third owner video (Hard Level 30 + Levels 31-34, Oct 14): prop value (r/.3)^1.6 (+1/+2/+4/+10/+15), per-level growth curve
  (`growBase`: at every size you can reach the next by eating ~65% of what already fits, so the biggest prop becomes edible near
  the end). Props have a per-instance scale `sc` (giant duck = duck sc 4.6, goal key `gk` 'duck+' → BIG card badge). Walled grass
  islands (`def.islands`, hole slides along them; drawn as walls + raised grass). `layout.js` = placement toolkit (row/grid/rings/
  spiral/snake/diag/scatter/pile/tower/triangle, `topUp`, `removeItems`); `handLevels.js` = levels 30-34 remade from the video with
  the exact goal cards (30: star 234 / choc-muffin 45 / latte 121 / cabbage 19; 31: shark 4 / duck 402 / pineapple-toy 28; 32: ★1150;
  33: matcha 201 / melon-slice 37 / corn 8 / cake-pink 4 / tray-strawberry 4; 34: waffle 26 / watermelon 11 / milkshake-blue 26 /
  jar-orange 19). ~45 new props for them. Generator: wide tray, size classes mixed everywhere (small/medium/large/giant, giants
  capped by level), islands kept a big hole's width from walls and each other, `fillGaps` packs empty floor. Test bot routes
  around islands (Dijkstra over island corners). Bombs (owner: "it explodes and immediately ends your run"): kind `bomb` (glowing red, radiation sign);
  `startFall` on a bomb ends the turn (`sim.bombed`, BOOM! card, rings + flash); 3 on Level 34 (`spec.bombs`), 1-3 from Level 8 in
  generated levels, placed in open floor (`topUp` `pad:1.4`). The bot treats fitting bombs as no-go circles; the clearability
  test plays each layout without bombs. Map tool idea: dump `buildLevel(n).items` and draw circles (used to lay out 30-34). Full bleed via `fullBleed(s)` (engine `hole` in the `noBleed` list; floating Pause/Exit replace its own pause
  button, boosters sit above the ⤢ toggle, player name/target to beat under the pills).
  Stars (`starsFor`): 3★ ≥ 2/3 of the clock left, 2★ ≥ 1/3, 1★ any clear; shown on the level bubbles, best per level in `profile.holeItStars`
  (validated in profile.js); a clear sets `holeItLevel` to max(current, level+1), so replays never move it back.
  Flow in `engines/holeIt.js`: level screen (player 1 picks) → pass (Ready) → play at once (floating joystick, clock waits for the first drag) → Bravo! bonus (Collect) / Time's up (Next) →
  P2 plays the same level. Score = goal items + (clear ? 1000 + 10×seconds left). `profile.holeItLevel` (load whitelisted
  in `profile.js`) advances when either player clears. Test: `tests/holeit.mjs` (`--node` part is in `npm test`;
  `node tests/holeit.mjs <level> 390x780` plays both turns, screenshots `/tmp/claude-0/sc/holeit-*`). The old
  `neighborhoodHole.js` is unused (helpers kept). Real-phone feel, physics speed and GPU load untested.
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

- **DOOM / DOOM II (Oct 21 2026, ids `doom`, `doom-2`, `packs/doomPack.js`, arcade only):** `src/engines/doom.js` + a JS rebuild of
  the 1993 engine in `src/engines/doom/` (README there): `wad.js` (WAD/pack loading; data order = phone-picked IWAD in IndexedDB
  → `assets/doom/user/*.wad` baked at build (git-ignored, never commit such a build) → Freedoom `assets/doom/freedoom.pack.gz`,
  made by `tools/doom-pack.mjs`), `info.js` (vanilla-numbered states/things so DEHACKED applies; Freedoom's DEH strings/pars used),
  `render.js` (BSP, visplanes, sprites, masked mids, fuzz, COLORMAP light; 200 lines, width follows aspect), `play.js`/`actions.js`/
  `spec.js`/`game.js` (vanilla movement, AI, weapons, specials, line triggers), `hud.js` (status bar + face state machine; ouch-face
  test fixed the intended way), `screens.js` (menus, tally, finales, cast call), `sound.js` (DMX sfx, 8 channels), `music.js` (OPL2
  FM synth on GENMIDI; MUS + MIDI), `heads.js` (roster heads drawn into the 8-bit frame on each sprite's own head, by rotation/mood;
  status-bar face = player's character with Doom's 42 expressions), `savegame.js` (6 slots, IndexedDB). 1P = whole game (death
  restarts the level, each cleared level banks its tally score); 2P = P1 picks level + skill, one life each, score = kills%+items%+
  secrets% +100 exit + up to 100 par bonus. One WANTED monster per map wears a locked character → `s.gameRecruits` (cageGame).
  Touch like the Android port (left stick, right drag turn, FIRE/USE/WPN/MAP/☰ circles, tap arms numbers). Tests: `tests/doom-sim.mjs`
  (Node, all 68 Freedoom maps, in test:core), `tests/doom.mjs` (2P flow + touch, 3 sizes), `tests/doom-solo.mjs`, `tests/doom-finale.mjs`,
  `tests/doom-heads.mjs` (head/face contact sheets). Build is ~78 MB now (+20 MB Freedoom). Real-phone feel, audio by ear and
  the owner's own WADs untested (only Freedoom tested).
- **Pinball engine (Oct 21 2026, phase 1 of 4, branch `claude/pinball-engine`, id `bucketheadland-pinball`):** rebuilt as a
  reusable band-table engine (`src/engines/pinball/`, see its README). Real rules: 3 balls each, players alternate balls, no
  clock, extra balls; 1P = solo kind `'game'` (new in solo.js/launcher note): one whole game, won = beat `rules.replay[level]`.
  Table in mm (514x1067, slope 6.5°, 600 Hz physics): accelerating flippers that carry the ball (aim by timing), pops, slings,
  drop bank, standups, spinner, gates, saucer/lock holes, ramps/wireforms as guided 3D paths, kickback, plunger + skill shot,
  ball save, tilt (flick up = nudge), virtual 3-ball lock → JORDAN MULTIBALL. Camera: intro shows the whole table, then the
  view is width-locked in every orientation and pans with the ball (owner's choice; landscape/desktop are very zoomed). 128x32
  DMD strip on top (left-aligned beside the Pause/Exit pills on phones). High scores `profile.pinballHigh[tableId]` (validated
  in profile.js). Phase 2 (Oct 21): engine parts `toy` (moving capsules, `parts[id].tx/ty`), `captive`, magnet grab/fling,
  VUK (`hole toRail` → wireform, `rail noEntry`), rules `tick`/`dmdMode`. Table: upper right flipper `flipU` under the Giant Robot
  toy (5 hits → ROBOT BATTLE: 30 s, robot walks, `beam` magnet grabs + throws, 4 hits wins), Coop = VUK onto the upper flipper,
  Golden Egg captive ball (hits grow the jackpot, every 3rd lights lock). Scoring guesses: replay 3M/6M/12M; jackpot capped 2M,
  super = 3x (bot scores 1.4–21M; `pinball-sim` prints points by source). Phase 3 (Oct 21): rules moved to
  `tables/bucketheadRules.js`: 5 timed ATTRACTIONS started at the Haunted Ride (lit by B-O-T or every 4 ramps): Roller Coaster
  Rush, Nunchuck Frenzy, Big Sur Moon (moving lit shot), Soothsayer (all BUCKET targets), Chicken Coop Panic; all 5 played →
  wizard WELCOME TO BUCKETHEADLAND (4-ball, 5 shots lit, 1M each, relights). DMD animations `tables/bucketheadDmd.js` (player's
  face as dots at ball start, 20 scenes), attract loop with high scores, game-over high-score celebration. Soundtrack:
  `pinball/music.js` + 11 original songs in `tables/bucketheadMusic.js` (attract, plunge, main, one per attraction, battle,
  jordan, wizard); board music stops while it plays. Music never heard by ears. Phase 4 (Oct 21): `pinball/lights.js` light
  shows (sweeps, radial, chase, sparkle...), GI bulbs + blackouts (`m.giOff`), flasher domes (`m.flash`), table `cues[anim]`
  fired by `m.say`; attract light show between balls; renderer polish (beveled inserts with brightness, ramp flaps + decals,
  tinted chrome ball, flipper logos, sheen/vignette); painted backglass intro card; drop-in art slots
  `assets/pinball/<table>/<slot>` (playfield, backglass, apron, logo, character, bumper, toy; build.mjs embeds them as
  `pinball:<table>:<slot>`, `pinball/dropins.js` loads them; optimize-art.py shrinks them, untested here: no Python on the box).
  All four phases done; next = owner playtest feedback, then new band tables.
  Art templates (Oct 22): `docs/pinball-art/buckethead/` = painted art per drop-in slot + playfield guide/parts overlay
  (`tools/pinball-art-templates.mjs`, renders the table modules in headless Chromium).
  Camera rework (Oct 21, owner: fast-ball scrolling was jarring): `R.follow` in render.js is now a critically damped spring
  with a dead zone (goal moves only when the ball leaves 28-68% of the view), smoothed-velocity lead, look-ahead along
  rails/VUK, flippers-first for falling balls, multiball focus on the ball that reaches the flippers first; never lets a free
  ball drop below the view; off-screen arrow at the top edge; optional AUTO ZOOM (`profile.settings.pinballZoom`, tap the DMD
  or V; up to 15% pull-back at speed). `tests/pinball-camera.mjs` measures it: Fold-size 700x840 jolts/min 85 → 0-2, p95
  accel 30k → 11k px/s²; landscape 844x390 132 → 28 jolts but the ball is above the view ~13% (195 mm view is too tight).
  Oct 22 (owner): table `timeScale` .85 (whole physics 15% slower, every shot keeps its line); a ball shot too softly to clear
  the shooter gate rolls back and can be plunged again (`m.canPlunge()` = a ball resting on the plunger, any phase; DMD "TOO
  SOFT / PULL AGAIN"; skill shot + ball save restart; machine-fired balls re-fire themselves). The slower speed exposed a
  flat-top jam on the Golden Egg channel (now peaked) and an upper-flipper ↔ robot loop: robot hits now count only while
  LIT (Robot Ramp / Coop VUK light it once; battle hits always count, 0.8-1 s debounce), payouts capped at x3, a real LOOP
  (left orbit up, right side down in 3 s) pays 50k, the gate return 1k. Replay 1.5M/3M/6M. A perfect flipper can still keep
  the ball cycling upper flipper ↔ robot for small points (no longer farmable).
- **Black Sabbath pinball (Oct 22 2026, table 2, game `black-sabbath-pinball` in `packs/pinballPack.js`, table id
  `black-sabbath`, files `pinball/tables/sabbath*.js`):** different machine: I-R-O-N lanes, WAR PIGS pops, IRON MAN toy
  (steps toward you in his mode) fed by a LEFT upper flipper that a full plunge reaches round the arch (super skill shot),
  INTO THE VOID spinning disc, crossing PARANOID (diverter: right inlane or Graveyard) and ELECTRIC FUNERAL wire ramps,
  Graveyard lock behind D-O-O-M → WAR PIGS multiball, M-A-S-T-E-R → HAND OF DOOM post between the flippers, six album
  modes at the Heaven and Hell saucer → HEAVEN AND HELL wizard, right outlane kickback. New engine parts: `disc`, `flag`,
  rail junctions (`exit.next`), pop-up post (`diverter` a===b, `post` event); music engine: riff track, swing, bell, rain,
  thunder; siren sfx. Source 'Black Sabbath' → wins recruit Ozzy / Iommi / Geezer / Bill Ward. Fixed on the way: a touch
  release mid-pull could fail to launch (canPlunge(400) on release). Tests: `pinball-sim.mjs 6 sabbath` (in test:core),
  `pinball.mjs black-sabbath-pinball`, `GAME=black-sabbath-pinball pinball-closeup.mjs`. Real-phone feel and music untested.
  Art templates: `docs/pinball-art/black-sabbath/` (same format as buckethead's + an image PROMPT per slot in
  IMAGE-SPECS.txt); `tools/pinball-art-templates.mjs --table <id>` now handles both tables (art modules export `logo` and
  `drawCharacter`). The cloud branch `ccr-17e1cdcc-y2g17r` (Bucketheadland templates) is merged into this branch.
  Owner art (Oct 22): GPT-made pictures for all 7 slots of BOTH tables in `assets/pinball/buckethead/` and
  `assets/pinball/black-sabbath/` (resized to the template sizes, WebP q90; uploads not kept in the repo). Buckethead playfield:
  its painted robot was cloned out with sky (the toy sits there). Both playfields are darkened in soft spots under every
  lamp (lamp list read from `buildTable().lamps`, mm×2 = px) so inserts read over the busy art. Drop-in toys now draw their
  shadow and hit flash in the picture's outline (`drawToy` in dropins.js) instead of a box. Custom playfields hide
  logo/character on the table (logo still shows in the landscape banner).
  Flipper pictures (Oct 22): drop-in slots `flipper-left`/`flipper-right` (600x200, pivot (120,100), tip (510,100), right =
  mirror; `drawFlipperImage` in dropins.js, drawn under the balls; only the two bottom flippers). DONE (owner idea): Buckethead's
  strumming hand IS the left flipper. `tools/pinball-art/buckethead-flipper-hand.py` rebuilds playfield.webp + flipper-left.webp
  from `assets/originals/pinball/buckethead/` (GPT empty stage blended in below y 1100, lamp dark spots, logo.webp (now 460 px wide, top
  centre 514,34 in the sky above the B-O-T lanes; it was 510 wide at y 1287 between the ramps), Buckethead scale .5 upright (args `0.5 0`; a .58/26° lean put the pick on the strings but the
  owner disliked the lean and it was reverted) with his hanging hand inpainted out and his wrist on the flipL pivot
  (playfield px 296,1892), hand cut at the cuff, scaled to pivot→pick 120→545, slimmed .85, dark edge + warm glow).
  BIGGER VERSION (Oct 22, current, script default `0.9 0 wrist`): the owner passed on the lean and on an elbow/forearm
  version (GPT art kept in `docs/pinball-art/buckethead/gpt-strum/` + gpt-04/05 originals, `... 0.5 0 elbow`). Buckethead upright
  at scale .9 with the wrist on the pivot, then 44 px lower (`DY`, 2X-6X lamps moved with him to y 760 mm; his hanging sleeve is squashed up so the cuff
  stays on the pivot; `fill_split` fills the hand/old cuff area split along the traced guitar edge `GUITAR`: guitar side
  inpainted, robe side flat shadowed robe with a rim-lit body edge), so the pick crosses the strings at the bridge pickup on the up-stroke; lamp dark
  spots are composited after him (the 2X-6X lights sit on him); the sign moved to the top of the arch (owner) and flickers like a bad bulb (`underlay` hook in render.js, new: table art
  drawn over the playfield under parts/balls; `drawSign`/`signLevel` in bucketheadArt.js: glow + shade layers, hum, stutter bursts
  every ~2.6 s, short dead spells, dims with GI); sleeve layer excludes the guitar (no cream sliver), robe under the cuff is cloth
  borrowed from his robe right of the guitar (x 615-650); guitar
  lower bout partly under the apron.  GPT kit: `docs/pinball-art/buckethead/gpt/`. Suggested re-dos for Sabbath sent to the owner. Tests: `tests/pinball-sim.mjs` (Node bot, in test:core),
  `tests/pinball.mjs [solo] [WxH]` (full 2P/1P flow), `tests/pinball-closeup.mjs` (battle/VUK shots). Real-phone feel untested.
- **King Gizzard pinball (Oct 22 2026, table 3, game `king-gizzard-pinball`, table id `king-gizzard`, files
  `pinball/tables/gizzard*.js`):** THE RATS' NEST = an enclosed upper playfield (inside the loop's inner wall, arc r190
  round 256,256) with its own mini flippers `miniL/miniR` on the same buttons, R-A-T-S standups and the PLANET B scoop;
  it drains between its flippers through a tilted one-way gate (`nestDrain`) into the pops (a flat gate made an endless
  pop↔gate bounce). NONAGON loop = left and right orbits joined over the Nest (`orbitL/R` triggers, loop = up one side,
  down the other in 3 s; 9 loops → NONAGON INFINITY). RATTLESNAKE: hole `snake` is a VUK onto `snakeBody`, a new rail
  type `carry:300, hidden:true` (physics conveyor, renderer skips the ball/rail; `art.overlay` draws the wiggling snake,
  gaping jaws and the bulge where the ball is) that drops the ball out of its tail into the Nest. FLIGHT b741 plastic
  ramp: diverter `flightDiv` (on while something in the Nest is lit) → Nest, else over the top to the right inlane.
  G-I-L-A drops light snake locks → RATTLESNAKE MULTIBALL (super jackpot at PLANET B), K-G-L-W, GAMMA KNIFE spinner,
  GIZZVERSE saucer → six album modes → OMNIUM GATHERUM wizard. Source 'King Gizzard': band members added to the
  roster via referencePack (Stu Mackenzie, Ambrose Kenny-Smith, Joey Walker, Cook Craig, Lucas Harwood, Michael
  Cavanagh). Spinners now take a label (Sabbath's said NUNCHUCK). Art templates `docs/pinball-art/king-gizzard/` (6
  slots, no toy). Tests: `pinball-sim.mjs 6 gizzard` (in test:core, with a scripted albums/wizard/infinity/multiball
  check), `pinball.mjs king-gizzard-pinball`. Real-phone feel, balance and music untested by ears.
  Owner art (Oct 22): all 6 slots in `assets/pinball/king-gizzard/` (GPT, from the `gpt/` kit). The playfield was remapped
  vertically in sections (planet → Nest, nonagon circles → nonagon lamps, wizard between the slings), its three painted
  bumper discs moved under the real pops (inpainted old spots), darkened under the lamps. Bonus X lamps moved from a row
  at y 738 (on the art's title) to an arch over the wizard's hat (y 786-808).
- **Pinball on iPad (Oct 23):** pinball wouldn't launch on an iPad. Cause (reproduced in Chromium with a WebKit-style canvas
  memory cap, not on a real iPad): render.js cached two table layers up to 14M px each (56 MB) and rebuilt them on every drop-in
  image load and rotation, while Safari keeps counting dropped canvases until GC; over its cap (RAM/4, often 224-384 MB)
  `getContext` returns null and `layer()` threw every frame. Now layers are capped at 8M px (phones never reach it), old
  layers are freed (0x0) before a rebuild, `invalidate` marks stale instead of dropping, and a refused layer retries at half k.
  Scratch test idea: hook `getContext` to refuse past N MB and rotate the viewport (iPad 1024x1366 @2x).
- **Pinball view settings (Oct 22, every table):** ⚙ and ⤢ buttons (`.pb-tools` in pinball.js) sit left of Pause/Exit when
  the backbox has room, else just under them; the faint bottom-centre ⤢ of fullBleed is hidden on pinball (owner couldn't
  find it). ⚙ opens TABLE SETTINGS (play frozen while open): Zoom 5 notches (`R.cam.zoomK` 0 = whole table scaled to the
  height .. 1 = width fills the screen, default 1, linear in scale; `R.view`), Ball speed 5 notches `SPEEDS` .8-1.2 × the
  table's timeScale (default 1 = as built), Auto zoom toggle. Saved in `profile.settings.pinballView {zoom,speed}`
  (validated in profile.js), shared by all tables. King Gizzard DMD: `text()` in gizzardDmd.js closes letter spacing,
  then dims the art and uses the full width, then wraps, so no message runs off the 128-dot panel (they did); the dragon
  hurry-up line is shorter. Audit script idea: render every m.say through its scene and flag text past x 0..127.
- **Save safety (Oct 23, owner lost progress on both phone shortcuts):** saves are localStorage per browser + address, so
  another browser, a new file location or the browser clearing site data = empty save (nothing in the game wipes it except
  Settings → Erase). `src/saveGuard.js`: `keepSave()` asks for persistent storage (no eviction on low disk) on New Game and
  on backup/restore; title screen shows 💾 BACK UP PROGRESS once 5+ unlocks/runs since the last export (`profile.backup`
  {at,mark}, validated in profile.js); an empty save shows a "Restore a backup" footer link; exports are dated
  `ShambConkins-save-YYYY-MM-DD.json` (Downloads). The first-tap fullscreen skips backup/import buttons (entering fullscreen
  used the tap and the file picker then refused to open). Test: `tests/backup.mjs`.
- **PWA / install as an app (Oct 23):** `src/pwa.js` (no engine changes): favicon + apple-touch-icon (embedded), and when
  served over http(s) a `<link rel=manifest>`: the folder's `manifest.webmanifest` if present, else a Blob manifest built
  from `PWA_MANIFEST` (defined once in tools/build.mjs, injected at `/*@@PWA_MANIFEST@@*/`) with absolute start_url and
  embedded icons (Chrome rates both installable). `build.mjs --pwa [dir]` (default dist/pwa; `npm run release` writes
  `releases/ShambConkins_vX_pwa/`, the release workflow zips it as an asset) = index.html + manifest + `sw.js` (cache-first,
  BUILD = version + html hash, skipWaiting/claim, old caches dropped; toast on update) + icons/. Icons from the owner's SC
  logo (`assets/originals/brand/sc-app-icon.png` → `assets/pwa/`, maskable at 66% for the safe circle). Title-screen ⬇
  `.ts-install` shows only after `beforeinstallprompt` (or on iOS); Settings row "Play as an app" when served and not
  standalone; `installAppFlow` (app.js) explains the browser menu when there's no prompt. First-tap fullscreen skips it.
  Asset inliner now accepts subfolders (`assets/pwa/...`). file:// pages get no manifest. Test: `tests/pwa.mjs`.
  Oct 23 follow-up (owner installed it from shambconkins.loki-mylo.work, Cloudflare): manifest `display:'fullscreen'`
  (installed app opens full screen; `APP_FULLSCREEN` in fullscreen.js, checked at load, makes `fullscreenSupported()` false
  so every ⤢ toggle hides); first-tap fullscreen is no longer used up by a backup/restore/install tap. Loading screen
  `#boot` at the top of index.template.html (own inline style + tiny script; build runs inlineAssets + `@@VERSION@@` on the
  template): logo, CSS-animated bar timed from `sc-boot-ms` (last start, saved by `bootScreen.js` `bootDone()` after the
  first showView), text Setting up / Updating to vX / Starting (from `sc-boot-version`); it paints ~0.3 s in, the start
  itself is ~20+ s at 4x CPU throttle. sw.js streams index.html and posts `sc-download` {got,total,done}; pwa.js shows the
  `#sc-dl` bar ("Saving for offline play" / "Downloading update"). Chrome badge on the home icon = a pinned SHORTCUT, not a
  WebAPK: happens when Google's WebAPK server can't fetch the manifest/icons (blob manifest = only the HTML deployed, or
  Cloudflare Access/bot challenge); fix = serve the `_pwa` folder publicly, remove the shortcut, reinstall.
- **Online duels, phase 1 (Oct 23, 2 phones):** rooms = Durable Object `Room` in `cloudflare/worker.js` (`/room/<name>`
  WebSocket, names normalised like "pizza-night", seats 0/1, hello {id,name,character,owner,v} → welcome/join/leave/msg/full,
  same client id (sessionStorage `sc-net-id`) reclaims its seat; hibernation API, ping auto-response). Binding `ROOMS` +
  migration `rooms-v1` in `cloudflare/wrangler.toml`; deployed by `.github/workflows/deploy-worker.yml` (wrangler-action,
  secrets CLOUDFLARE_API_TOKEN/ACCOUNT_ID; the dashboard paste can't add the binding). `src/net.js` = connection (host =
  the site itself, else shambconkins.loki-mylo.work, override localStorage `sc-net-host`), reconnect with backoff.
  `src/duel.js` = Arcade "🌐 Online" mode (`store.online`, `store.onlineWho`): room dialog, challenge → accept (30 s),
  simultaneous challenge → seat 0's wins, both run `requestGame({solo:true,duel})`; launcher `duelSeed` (seed
  `${seed}-${game.id}-${round}`), live score chip `#duel-chip` (progress every 1.5 s), `settleSolo` awaits `duel.finish()`
  (waiting dialog, forfeit if the other leaves/quits) and shows both scores + Rematch. Only `duelOK` games (solo.js: kinds
  levels/rounds/turns/game/alone) — CPU-kind games are "Not online yet". Tests: `tests/online.mjs` (two contexts vs
  `wrangler dev`). net.js splits messages over 5000 chars into parts (the room drops >16 KB), pings every 10 s and
  reconnects a socket silent for 35 s.
- **Online board game, phase 2 (Oct 24, branch `ccr-206256d0-lz2tp5`):** `src/netBoard.js` + seams in `src/netHooks.js`
  (no imports). Room line "🎲 Board game together" (`online-board`) → invite → both open New Game (`store.netSetup`: own
  panel + `remotePanelHTML` of the other pick, host has the options/start; versus/horror only) → host `startRun` sets
  `run.online={room,host}` and `hostBegin`. HOST runs app.js unchanged and keeps the save; GUEST mirrors (`store.run` =
  copy, own save untouched, `saveRun` skips the run). Host sends `start` (full run), `state` (run minus boards; `board`/
  `mainBoard` only when changed) on updateBoard/saveRun, `fx` (levelCard/effects/warpFx/roulette/sound/toast/music/
  recruit... each calls `fx()`; guest `FX` table), `dlg`/`route` (ui `showDialog`→`netDialog`, routePanel `showRoutePanel`
  →`netRoute`; owner = `opts.player` ?? `run.current`: the owner's phone answers, the other shows it read-only via
  `openDialog({watch})`/`openRoutePanel({watch})`), `task` (Pokémon battles/Center/team via `netTask`: run on the
  guest's phone, the guest's run comes back and `adopt` syncs it in place), `game` (board minigames: launcher online
  branch after the roulette → `hostGame` → duel.js `boardDuel`, both phones play the 1P version, `settleSolo` board path
  reports {score,won,recruits}; host `settleGame` with both scores, co-op for bosses/horde = either won). Only `duelOK`
  games are dealt (`setPoolFilter` in gameRegistry; trivia/casino spaces deal from everything). Guest taps on
  roll/reroll/item/bag/pkmn go to the host as `act`; the host's own buttons say "AMBER'S TURN" (`theirTurn` in ui.js,
  `store.netBoard.live`). Recruits for the guest's player land in the guest's profile through profile.js `recruit` → fx.
  Robustness: host messages are numbered (`n`, gap → guest `hello` → fresh `start`), 4 s beats, unanswered questions
  re-sent after 8 s, answers cached by id; a dropped guest → host "Keep waiting / Play it on this phone" (`takeOver` =
  pass and play until they say hello again); guest Home = "Leave" (`bye`), room line then offers "Rejoin". Host Home =
  `pause` (guest waits), Continue = `start` again; a restarted host rejoins `run.online.room` itself. Same VERSION needed.
  Tests: `tests/online-board.mjs` (TURNS, PKMN=1 wild battles, DROP=n drops the guest mid-decision, DEBUG=1 traces;
  bots answer only what their phone may answer). Not yet tried on two real phones. Next: turn-based games online
  (move relay through the CPU hooks), then real-time ones.
- **1-player board game vs CPU + Choose Characters (Oct 24, branch `ccr-47c456d6-mv2k8z`; kept apart from the online work):**
  Title screen CHOOSE CHARACTERS (`players` view = `setupHTML(...,{pickOnly:true})`): names + heads saved in
  `profile.settings.picks` {names,chars} (validated in profile.js; app.js falls back to the starter if a pick is locked),
  used by New Game and the Arcade (`store.setupSelected`). Both pages carry `playersStripHTML` (ui.js): 2 Players / 1 Player vs
  CPU, YOU Sean/Amber, CPU Easy/Normal/Hard = the Arcade's own `profile.settings.solo`. 1P New Game: `makeCpuRun`
  (src/cpuBoard.js) puts the human in seat 0 (players reversed if Amber plays, so rosters/starting items stay with owners),
  CPU in seat 1 named "<first name> (CPU)", `run.cpu={seat:1,level}`; modes versus/horror only. Seams in `src/cpuHooks.js`
  (no imports, like netHooks): `showDialog` → `cpuDialog` (CPU's dialogs with 2+ choices open read-only "… is thinking",
  then it picks, primary-weighted; Continue-only cards and anything with a start/fight/again choice stay the human's),
  `showRoutePanel` → `cpuRoute` (lights a road, shortcuts tempt it more on Hard), `theirTurn` → `cpuWaiting` (roll/items off),
  `recruit` → `cpuBlocksRecruit` (the CPU's owner gets no characters during board play). A 300 ms tick rolls for the CPU
  (sometimes uses an item first, `run.cpu.itemTurn`); its Pokémon battles run on the GB autopilot (`cpuPk` wraps
  pkWild/pkTrainer/pokemonCenter). Minigames: `boardCpuKind` (solo.js) = 'cpu' or 'alone' kinds only; `selectBoardGame`
  filters by it on run.cpu, the launcher swaps id'd games without one; board session gets `session.solo={kind,board:true,...}`
  so engines drive P2 as the CPU, and settles through `settleGame` (alone → co-op result from `s.solo.won`); Exit = normal
  board exit (no banking). Test: `tests/solo-board.mjs` (WHO=1, TURNS=n). Real-phone feel untested.
- **Native online games, phase 3 batch 1 (Oct 24-25, built on `ccr-206256d0-lz2tp5` from another account; Oct 25 merged with
  the 1P-vs-CPU work + visitor fix on `ccr-417ed8e4-pn7r0u`, not released; owner wants more batches before the next release, v0.67.0):** owner chose
  NATIVE online per game (not screen share), a batch at a time. `src/netPlay.js` `openChannel(mid,me)`: ordered move channel
  {k:'np',mid,i,m} (`send(m)`, `next()` → the other phone's next move or null when they left, resend on reconnect). Launcher
  `netGame` (gameLauncher.js): for `netNative(game)` (solo.js `NET_NATIVE`, also feeds `duelOK` so arcade Challenge + online
  board deal them) the real 2P game runs on both phones from the duel seed, same player order, `session.online` = channel
  (`me` = duel.who), `hotseat` on; result via `settleSolo` kind 'net' (each phone reports its own score, board path as phase 2).
  cpuKit `isOnline`/`remoteSeat`. Converted: trivia ×9 (trivia.js + triviaModes.js: seeded difficulty/questions ignoring
  history, moves {a: answer index|null, t: lightning secs, w: wager}), chess + checkers (classicBoards playSquares: moves {f,t,p},
  {resign}; Black's phone sees the board turned round; draw offers off online), Uno (moves {p,c}/{d}/{x}/{u}/{to}; each phone
  shows its own hand), Beer Pong (pubPhysics: shooter sends {sh: throw, hit: cup|-1}/{rr}/{sh:null}; fixed 1/180 s steps online,
  watcher replays on cup copies and forces the shooter's outcome). Each has `s.debug.bot` online for tests.
  Test `tests/online-native.mjs` (GAMES=id,...; needs wrangler dev, `npx --yes wrangler dev --local --port 8787` works in the
  cloud box): Oct 25 after the merge all 13 batch-1 ids pass (all 9 trivia, chess, checkers, Uno, Beer Pong incl. the watcher
  crash fix; a full Beer Pong match runs to last call in ~4-5 min headless, the test gives it 1.75x LIMIT_S). Run the ids in two
  groups: a game stuck at the limit leaves the room busy and the next challenge times out. `tests/online-board.mjs` banks native
  games like 1P ones (`nbank`); the board dealt Ten Forward Chess on a 30-turn run and both phones carried on. 1P trivia vs CPU
  and `tests/solo-board.mjs` still pass after the merge.
  Trivia carries both seams: the online move relay (`net`) and the CPU's visible turn (`cpuTriviaTurn`); answer lines name
  the player when `cpu||net`. CHANGELOG has an "Unreleased (next release: v0.67.0)" section: rename it `## v0.67.0` when releasing.
  Batch 2 (Oct 25, same branch): Connect 4 `four-lights` (moves {c}), Reversi `strategema-grid` ({r,c}; a no-move skip happens
  on both phones by the rule), Yahtzee `full-shambyahtzee` + `cheaters-yahtzee` (yahtzee.js: {h: held} per hold change, {r: dice
  values} per roll so dice never depend on matching RNG, {c: category}); waiting phone's buttons off + "PLAYING ON THEIR PHONE".
  All 4 pass online-native; 2P fuzz and 1P vs CPU still clean.
  Batch 3 (Oct 25): casino ×4 (`blackjack`, `five-card`, `roulette`, `bond-baccarat`) through ONE relay in casinoTable.js
  (`tableNet`): seat 1's phone (me 0) referees every `casinoTap`/`casinoChange` (its own at once, the other's requests {q} in
  arrival order, dropped if not runnable now) and sends {t: control key, v}; the other phone runs only those, waiting until the
  control is usable, so both draw the same seeded shoe. Key = id, else nearest id'd ancestor + index among its buttons/selects.
  Remote seat gets `.remote-seat` (no pointer events). Poker shows your own hand on your phone. `casinoBot` = online test bot.
  Guess Who `traitors-guess-who` ({q: label}/{a: id}/{n}; own secret only), Battleship `battleship-fog` ({fleet} once, then
  {f:[x,y]}; the other fleet stays hidden; their turn = watch shots land on your fleet). All 6 pass online-native (ROOM=name
  runs two test rooms at once); 2P fuzz + 1P CPU clean.
  Batch 4 (Oct 25): Liar's Dice (both roll the same hidden dice from the seed, own cup only; {type:'bid',q,f}/{type:'liar'}),
  Clue Whodunit (`clue.js`, deduce mode only: {sg:[ids]}/{ac:[ids]}/{e}; watcher = the CPU's "investigating" screen; shown card
  picked the same way on both), Monopoly Speed Die ({a:roll|buy|pass|card}/{bus:n}; dice from the seed; `cpuTurn` guard blocks
  the other's turn) + Auction (both bid at once, {lot,bid}, reveal when both are in). All 4 pass online-native.
  Clue Lineup is a real-time tap race: left for the real-time phase (a relay would favour the referee phone).
  Batch 5 (Oct 25): Simon `simon-faceoff` (each tap {t: pad|-1} streams to the watcher, fed into onTap like the CPU; only the
  tapping phone runs the too-slow clock), Price Is Right `price-bid-off` (both bid at once, {r,bid}), Hangman Showdown/Wanted
  (hangman.js: {g: letter}, {to:1} = shot clock ran out on the shooter's phone (the watcher's clock just stops at 0), {w:{text,cat}}
  = the writer's bounty; guesser sees blanks; `netWait` overlay while the other writes). Quick Draw (`django-hangman`, both shoot
  at once) left for the real-time phase like Clue Lineup. All 4 pass online-native.
  Batch 6 (Oct 25): classicBoards.js `netTurns(s,{isTheirs,apply})` helper (ordered reader, waits for this phone's animation
  and their turn): Ultimate `matrix-ultimate` {i}, Mancala `greed-island-mancala` {p} (extra turns by the rule on both),
  Dots `office-dots-boxes` {o,i}. All 3 pass online-native; chess/checkers 2P fuzz still clean.
  Batch 7 (Oct 25, branch `ccr-70ac8fd3-pxs9bs`, fast-forwarded from `ccr-417ed8e4-pn7r0u`): Tri-D chess `trek-mini-chess`
  ({m:[r,c,tr,tc]}, violet's phone sees the board turned round via `R()`, only the mover's phone runs the 45 s clock; a
  timed-out random move is sent like any other), WarGames `wopr-grid` ({i}), N-Spade `smb3-nspade` (smb3.js, {k: card}; same
  table from the seed). All 3 pass online-native; 2P fuzz + 1P CPU clean. That finishes the turn-based CPU games.
  Batch 8 (Oct 25, same branch), the first REAL-TIME games: fairness by each phone's own clock, no referee phone.
  Clue Lineup (clue.js): each phone shows only its own pad; one final {r, a: card id|null, t: secs since ITS question
  appeared} per round (wrong = locked out, null = 8 s or too late to beat the other's right answer); both phones resolve
  when both are in (faster right answer wins). Quick Draw `django-hangman` (hangman.js `qd*`): one keyboard each; shots
  {r,g,t} stamped with the phone's own round time + heartbeats {r,hb} every .3 s; both phones apply all shots in time order
  (tie → P1); a shot arriving after later ones replays the round silently (`quiet` mutes the SFX proxy/vibrate/floats); a
  shot stamped past this phone's clock waits until it gets there; the round ends (solve, both hanged, sundown at CLOCK)
  only when min(own time, other's last reported time) passes that moment. Stress test (scratch: 0-700 ms random send
  delay, both bots fighting over the top 3 letters): ~15 replays a round, all rounds identical on both phones. Both pass
  online-native; 2P fuzz, 1P CPU and tests/hangman.mjs clean. Once (not reproduced in 3 reruns) Showdown froze mid-reveal
  on both phones after clue-whodunit in a 3-game online-native run; watch for it.
  Batch 9 (Oct 25, same branch), physics shot games, "shooter streams": the shooter's phone runs the physics and sends the
  shot, snapshots ~12/s (the other phone eases its pieces toward them, runs no physics) and a final exact state; both phones
  then run the same end-of-shot rules from that state (fin positions are rounded and applied on the shooter too). Curling
  {th,sn,fin}; Scorched Earth {aim,fire,ex(+bugs),sync,skip}, field fixed at 390x780 online (size came from the screen);
  putt-putt {sh,sn+gopher,fin{x,y,n,k,w}}; nine-ball {aim,f(+cue spot),sn,fin{b,r}}; BASEketball {sp,l in court units,res},
  psych-out = defender asks {ps}, batter's phone decides {psd}. All 5 pass online-native; 2P fuzz + 1P CPU clean.
  Batch 10 (Oct 25, same branch), side-by-side games: `engines/netField.js` `netField(s,{pack,unpack,onEvent,hz})`: this
  phone plays only its own field; snapshots {f} ~10/s when changed (`push()` = now), events {e}, final {fin} (`finish(v)`,
  `remoteDone()`), all on s.online. Stacker {r,stack,row,...} pushed on every stop (other row slides locally); drag race
  (own car vs own tree, own ET; online a race ends only when both ETs are in); Block Battle (own board, garbage {e:{g}},
  ends from both finals {score,dead}); Shred Hero (own highway wide, other narrow on its own song clock, hits {e:{n,h}},
  waits for the other's final score); Color Card Dash (Lineup-style: one final per card {r,k|lic,t,w}, wrong taps taken off
  first, then fastest right tap / first licorice toucher); Ladder Rush (own ladders full screen, other = progress line, first
  finishT wins, a phone past the other's finishT ends at once). All 6 pass online-native; 2P fuzz + 1P CPU clean.
  Batch 11 (Oct 25, same branch): Brawndo `brawndo-fruit-merge` (netField; own jar physics, other jar from fruit snapshots;
  own jar freezes once its final is sent), Gumdrop Catch `candy-gumdrop-catch` (netField {x,score,stick,flash}; the other half
  runs the same seeded candies and just removes what its basket touches), pancakes `review-pancakes` (netField, own clock,
  same seeded calls/golden stacks), Skynet `terminator-scan` (taps anywhere online; walker pauses now from a seeded `wrnd`
  per round; every tap {c:[r,t,k,m]}; `rescore()` rebuilds both scores from the whole tap log: a Terminator = earliest
  tap, humans −1 with the clamp in time order; other phone's taps wait until this phone's round clock reaches them; {fin:1}
  then both finish), Microgame Rush ×2 `microgame-rush`/`rush-marathon` (both deal the same microgames from s.random; own
  full screen via `netLayout`; {r,res,at}; points once both results are in). All 6 pass online-native; 2P fuzz + 1P CPU clean.
  This clock-stamped timeline is the pattern for other race games.
  ARENA PROTOTYPE, Pong `pong-duel` (Oct 25, atariPong.js): tried HOST-AUTHORITATIVE first (seat 1 runs the game, guest sends
  its paddle, draws snapshots): measured with `tests/online-lag.mjs` (LAT_LO/HI ms delay + jitter, frame-rate bots that
  steer toward the ball they see), the guest reacts ~2x the lag late (sees the ball late AND its paddle arrives late): bot
  guest lost 4-7 at ~0 ms, 0-7 at 80-150 ms. Shipped instead: NO HOST. Physics on one fixed court (`FIELD` 724x390, not the
  screen), both phones fly the ball; each phone judges only ITS OWN paddle and sends {e:{hit:[u,v,du,dv,hits]}} / {e:{miss:sc}};
  at the other paddle a phone GUESSES from the streamed paddle (bounce back, or fly on and wait off court) and the real call
  replaces the ball (advanced by the time since, `catchUp`) with the difference eased out (`off`, 9/s). Paddles {p} 30/s,
  `nf.sync('serve')` (new in netField) starts both together, serve dirs from s.random on both, seat 1 calls the 2-min cap,
  seat 2 sees the court turned round. 80-150 ms: stalls 0.3%, motion p99 .038 vs .029 at 0 ms, max ~.5 on a wrong guess;
  outcomes even; result cards always agree. LESSON for the other ~38 arena games: a host-authority model handicaps the guest
  in reaction games; prefer "each phone is the authority for its own player and for what hits it" (both run the shared
  world from the seed, send own position/inputs + events like hit/death), and only use a host for contested shared physics
  (sumo pushing, a shared ball both can touch at once), then with own-avatar prediction. Next: apply per game a batch at a time.
  Batch 12 (Oct 25, branch `ccr-0da72c03-ws0idl`, fast-forwarded from `ccr-70ac8fd3-pxs9bs`), arena games on that rule:
  `netField` gains `start(tag)` (sync, then seat 1 times 3 pings and both start within ~half the jitter; events are stamped
  with time since it). `directionGestures` gives every touch/key to `s.online.me`. Each game: fixed world on both phones,
  turned per phone (matrix `M`/`VM`: you start at the bottom, sideways phones turn 90°), online HUD below the duel chip.
  TRON `derezzed-cycles` (46x84 grid): own cycle only, every cell stamped {s:[round,x,y,ms..]} ~30/s; a cell they entered
  first (or within TIE .05 s) is a wall, one learned late derezzes you where you entered it (`retro`); {dead} provisional,
  {out} final once their stamps pass your crash time (or they're out); both settle from the two outs. Slither
  `snake-v-snake` (420x740): own snake + own death; other body rebuilt from 20/s heads; 70 pool orbs placed by seed+slot+
  generation (eating moves the slot on, so phones converge) + own drops; die event carries the killer (+50) and the body
  orbs; end waits for both {fin:{p}}. Combat `metal-gear-tank-duel` (upright 12x20 maze): own tank, shells flown on both
  phones from {fire}, each phone judges only hits on its own tank ({hit:[shooter,id,n]}); score = the other phone's hits
  taken, end from both {fin:{h}}. Sword `kill-bill-duel`: player 2's hall mirrored; the victim's phone resolves the other's
  thrust ({th} starts it there) as parry {pr} or kill {die}; {sp} respawn, {esc} escape, {tu} time-up progress (both settle).
  Bots: `s.debug.bot` = the CPU brain on your own side (TRON at Easy so rounds end). `tests/online-native.mjs` LAG=80-150 delays
  every message; all 4 pass with and without lag, Pong/Block Battle/drag race still pass; 2P fuzz + 1P CPU clean.
  Batch 13 (Oct 25, same branch): `roundOutcome(nf,round)` in netField.js = round result when each phone judges only its own
  death and a death is never found late: die(t,extra)/timeUp(extra) send the final {o:[round,'f',ms|-1,extra]}; tick(now)
  declares you alive once your clock passes their death by tie (.1 s); result me/them/none (both down within tie, or both up
  at time-up; `R.extra/theirExtra` break it, e.g. Bomber crates). arenaKit `arenaTouch`/`arenaKeys` give touches/keys to
  `s.online.me`. TowerFall `arrow-arena` (fixed 12x19 tower, own archer, arrows {f} flown on both phones without catch-up,
  victim judges arrows + stomps {k}, pickups {pk}). Battle Royale `battle-royale-island` (player 2's island turned round via
  separable sx/sy flip; zones on the shared round clock `annAt`; shots {sh} with ids, melee {m} judged at the distance shown
  on the victim's phone, {hit} back to the attacker, {k}, {bag}; online test bot walks round trees). Bomber `bomber-duel`
  (upright 9x13, player 2 turned round; bombs {b:[id,cell,range,ms]} explode at plant+1.8 s on both phones, earliest first,
  chains at once, so crates/pickups match (checked under lag); time-up winner = more crates, each phone's own count in the out).
  Pac-Man `pac-maze-duel` (player 2 turned round; own chomper ticks every .12 s on the shared clock, {t:[tick,cell,dir,lives,
  pow,ate]}; ghosts are a deterministic sim on both phones steering by each player's state PAC_DLY=3 ticks earlier and waiting
  for the other's report; eaten ghost {ge:[g,step,pts]} goes home at a step the other phone knows in time; contested pellet =
  earlier tick; `net.glog` per step: identical on both phones under 80-150 ms lag). All 4 pass online-native with and without
  lag; 2P fuzz + 1P CPU clean, other arenaKit games fuzz clean. Space Invaders versus (shared formation/bombs/bunkers) waits
  for the shared-world batch (air hockey, sumo, dodgeball...).
  Batch 14 (Oct 25, branch `ccr-b69e91e7-srvscq`, fast-forwarded from `ccr-0da72c03-ws0idl`), the rest of arenaPack except Hippos:
  Driller `driller-duel` (netField side-by-side: own shaft full screen, fixed 7 cols, other = race-strip dot + HUD from {d,l,a,x,ft};
  run ends at goal/out/time/past their finish time, settle from both finals like Ladder Rush), Bubble `bubble-battle` (own field
  wide, fixed 7 cols + danger row 14, other = small copy in a SIDE column from {g,o,sc,in}; garbage {e:{g}} flies in from the copy;
  roundOutcome die/timeUp with score as extra), Snowball `snowball-fight` (fixed portrait yard NW 480 x NH 860, point-symmetric
  seeded layout; each phone simulates in its own frame, player 2's turned round, everything crossing over goes through `flip()`;
  victim judges hits {h}, thrower guesses and drops the ball; walls carry `dmg[owner]` and only the thrower's phone counts its
  damage {wd}; built walls {w} name the one they replace), Disc `disc-duel` (like Pong: no host, fixed CH 560, view turned via
  `FL`; each phone is the authority for its own half: catches {c} (online a catch needs the disc in your half), goals/landings
  {pt}; throws {th} carry the full disc state + time, the other phone flies it on by the delay (`applyThrow`, `flyDisc`); a guessed
  catch at the other catcher, a 'wait' at the far line; `rally` counts serves, events carry k, early throws wait in `pendTh`;
  time-up = {tu:1} handshake so both have the same points, then win or golden point (rally 1000), {tu:2} ends overtime).
  Test bots: `s.debug.bot` = the CPU brain on your side (Disc's sits out 4 s in 12 so goals happen; Snowball's also builds walls);
  Disc `s.debug.skip(s)` moves its clock on (time-up/golden point checked under lag). tests/online-native.mjs: SHOT_S=n
  screenshots n s in, VIEW=WxH phone size; at 1100x700 headless runs ~3x slow (game time is frame-capped), give LIMIT_S=420.
  All 4 pass with and without LAG=80-150 at 390x780 and 1100x700; 2P fuzz + 1P CPU clean. Left: Hippos, air hockey, sumo,
  dodgeball ×2, Space Invaders versus, Tarantino ×6, South Park ×3, Bond ×3, Hyrule ×2, penalties, Raiders, Fight Night, Sewer
  Clash, kart ×2, Space Swarm co-op (`node -e` over solo.js: 'cpu' ids minus NET_NATIVE).
- **Meet a visitor (Oct 24, unreleased):** 393 of 705 landmarks have no characters from their own property, so `visitLocation`
  (app.js) now falls back to a traveller of the same kind (film/TV/game), then anyone missing; Mom & Dad's house and the lab keep
  their own visitors only. Checked on 140 sampled landmarks (all offer a visitor; v0.66.1 offered 51).
- Vault 🎲 Random game button (Oct 20): top of the arcade (`arcade-random` in app.js, `randomArcadePick` in ui.js) picks any playable card
  in the current list (filter, search and 1P mode apply).

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

