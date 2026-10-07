# AI state (keep short; update after meaningful work)

Version 0.53.0 (`releases/ShambConkins_v0.53.0.html`).

## Implemented systems
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
  arcade): `engines/sonic.js` (split-screen Green Hill, Mega Drive physics, modes rings/race), `kart.js` (Mode 7
  Rainbow Road race + balloon battle), `smb3.js` (N-Spade, Spade Panel), `candyLand.js`, `chutes.js` (Ladder Rush,
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

## Recent changes (this round of owner feedback)
Boss trigger fix + drag flow; 2x heads (board, collection, character select); collection pages fit the screen;
pinch zoom; warp pipes visible & pass-triggered; bridges; biomes; Parents' House → Mom/Dad only; Planet Coaster park +
King Coaster; Always Sunny portraits added by owner (optimized to WebP, originals in `assets/originals/`).

- v0.46.1: found challenge items (game/duel kind) offer "Play now / Keep in bag" (`foundChallengeChoices` in `app.js`);
  Quark's shop is a bottom sheet (`showDialog({sheet:true})`, choice `tag`/`badge`, `itemTag()` in `items.js`).
  Tests: `tests/itemgame.mjs`, `tests/shop.mjs` (screenshots to /tmp/claude-0/sc).
- v0.46.2–3: fullscreen (`src/fullscreen.js`): first tap enters it (browsers need a gesture); toggles via `fullscreenButton()`
  in home stack, every top bar and Settings; open modal dialogs are re-raised on change. Vault now uses `fitCatalogPage`
  like the roster and `refitCatalog()` re-measures on resize/fullscreen.

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

- Launch music: boot now starts the home score (it used to call `showView('home')` without `home()`), and
  `installAudioUnlock()` (audio.js) resumes the suspended AudioContext on the first tap/key.

## In progress / unverified
- Warp minigames only bot/fuzz-tested in headless Chromium; Sonic and kart (split-screen canvas, Mode 7 rows) need a
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
