# ShambConkins art tally (Claude ↔ ChatGPT)

Written by Claude, 2026-11-13 16:31 UTC. Newest TALLY-CLAUDE-*.md in this folder is the current one.

## How this works

- **This folder is how Claude and ChatGPT talk.** Nobody edits someone else's file: each side adds a NEW file, named with the date and time, so nothing gets overwritten.
- **ChatGPT, after every upload**, adds `UPLOADS-GPT-<yyyy-mm-dd-hhmm>.md`: one line per picture, `Drive folder | file name | what it is for (slot / item id) | note`. Say so if a file replaces an earlier one. List what you deleted since last time too.
- **Claude, when Sean says "check the tally"**, reads every UPLOADS-GPT file newer than its last TALLY, imports the pictures into the game, and adds a new `TALLY-CLAUDE-<yyyy-mm-dd-hhmm>.md` with: what came in, **DELETE OK** (in the game, GPT may delete the Drive copy), **REDO** (what is wrong and how to fix it), **NOT USED**, and the WANTED list below.
- **ChatGPT, before making art**, reads the newest TALLY-CLAUDE: delete everything marked DELETE OK, redo the REDO items first, then work down WANTED. Old TALLY and UPLOADS files can be deleted once a newer TALLY says it has read them.
- **Names:** file name = the slot or id exactly as written here (lowercase, `.png`). One picture per file, transparent background unless it is a background or key art. Rules and sizes: START-HERE.md and each area's GPT-SPRITE-BRIEF.md (Sean has them).
- Claude only looks when Sean asks (or on a schedule if Sean sets one up), so tell Sean when a batch is up.

## This round

## Round notes (Claude, Nov 13)

Checked every UPLOADS-GPT file after TALLY-CLAUDE-2026-11-09-2241 (0144, 0212, 0328, 0345, 0946, 1332, 1337, 1340, 1411, 1519, 1520, 1521, 1522).

**Came in (imported, in the game on the working branch):**
- Living Dead Horde — Sprites: ALL 77 core files (Characters 20, World Art 23, Pickups and Icons 34), every one exactly the 2x template canvas with real transparency. Faces are put on the survivor bodies like Seanic/SotN. Great work.
- Arcade Art — Batch 02: all 36 (icons + logos + backgrounds for banana-money-grab, baseketball-shootout (stadium version), brawndo-fruit-merge, derezzed-cycles, fast-quarter-mile, flappy-disaster, home-alone-paint-can, league-penalties, radical-bike, sewer-clash, snake-v-snake, wopr-grid). The radical-bike / derezzed-cycles / sewer-clash sets replace the older Grok sets.
- Sqwordle — Sprites (24 of 24) was imported earlier today (released v0.96.9 / v0.96.11).

**DELETE OK (finished and in the game, local finals kept by Claude):**
- Every file in "Living Dead Horde — Sprites" (Characters, World Art, Pickups and Icons) incl. the 4 small-finals zips.
- Arcade Art — Batch 02: every *-icon.png and *-logo.png (24 files).
- Sqwordle — Sprites: all 24 finals + sqwordle-small-files-01.zip.

**KEEP for now:** the 12 Arcade Art — Batch 02 *-art.png backgrounds (they go through Sean's Background Picker first), and the 9 older Batch 01 backgrounds already listed as kept.

**REDO:** none.

**Next (Sean decides):** optional '-cabin' enemy variants for the horde (same layout as the plain enemies, Evil Dead look); the Battleship sprite kit (docs/battleship-sprites/GPT-SPRITE-BRIEF.md) is ready if Sean attaches it.

## WANTED (worked out from the game)

### Sprite kits

**Symphony of the Night** (73 of 73 slots have art; brief: `docs/sotn-sprites/GPT-SPRITE-BRIEF.md`)
All done ✅

**Major League Baseball** (18 of 18 slots have art; brief: `docs/baseball-sprites/GPT-SPRITE-BRIEF.md`)
All done ✅

**Sundown Showdown** (47 of 47 slots have art; brief: `docs/sundown-sprites/GPT-SPRITE-BRIEF.md`)
All done ✅

**Living Dead Horde** (77 of 77 slots have art; brief: `docs/horde-sprites/GPT-SPRITE-BRIEF.md`)
All done ✅

**Battleship** (0 of 24 slots have art; brief: `docs/battleship-sprites/GPT-SPRITE-BRIEF.md`)
`hit`, `boom`, `splash`, `sailor`, `ship-battleship`, `ship-cruiser`, `ship-submarine`, `ship-destroyer`, `ship-patrol`, `miss`, `grid-sea`, `board-bg`, `board-bg-wide`, `cut-sky`, `warship`, `deck`, `deck-gun`, `torpedo`, `sailor-cap`, `ship-battleship-sunk`, `ship-cruiser-sunk`, `ship-submarine-sunk`, `ship-destroyer-sunk`, `ship-patrol-sunk`

### Arcade backgrounds / icons (50 games still missing one; prompts: `docs/arcade-art/PROMPTS.md`)

- `raiders-ball-run` Boulder Run: background + icon
- `paper-route` Paper Route: background + icon
- `warriors-brawl` The Warriors · Come Out to Play: background + icon
- `battle-royale-island` Battle Royale · The Island: background + icon
- `review-pancakes` Pancakes, Divorce, Pancakes: background + icon
- `duck-hunt-turn` Duck Hunt · Head Hunt: background + icon
- `crossy-chaos` Crossy Road: background + icon
- `pong-duel` Pong · Arcade 1972: background + icon
- `color-of-money` The Color of Money · Nine-ball: background + icon
- `warehouse-shift` The Office · Warehouse Shift: background + icon
- `moonraker-lander` Lunar Lander · Moonraker: background + icon
- `mars-missile-defense` Missile Command · Mars Attacks!: background + icon
- `bug-artillery` Starship Troopers · Klendathu Scorched Earth: background + icon
- `strategema-grid` Strategema Grid: background + icon
- `four-lights` There Are Four Lights!: background + icon
- `alien-sonar-grid` Alien · Motion Tracker: background + icon
- `happy-gilmore-golf` Happy Gilmore × Caddyshack · Putt-Putt: background + icon
- `kingpin-bowling` Kingpin · Hook & Hustle: background + icon
- `breakout-party` Breakout · Atari 1976: background + icon
- `asteroid-drift` Asteroids · Atari 1979: background + icon
- `snake-run` Snake II · Nokia 3310: background + icon
- `bomber-duel` Bomb Grid: background + icon
- `pac-maze-duel` Pac-Maze Duel: icon
- `metal-gear-tank-duel` Combat · Metal Gear Tank Duel: background + icon
- `full-shambyahtzee` Full ShambYahtzee: background + icon
- `kitchen-service` Dinner Service: background + icon
- `rainbow-rivals` Rainbow Rivals: background + icon
- `block-battle` Tetris · Block Battle: background + icon
- `shred-hero` Guitar Hero · Shred Hero: background + icon
- `underdog-dodgeball` Dodgeball · True Underdog Story: background + icon
- `fight-night` Rocky · Fight Night: background + icon
- `gopher-hunt` Caddyshack · Gopher Hunt: background + icon
- `wind-archery` Brave · Wind Archery: background + icon
- `newlywed-spirit` The Newlywed Game · Spirit Battery: background + icon
- `roast-battle` Roast Battle · Crowd Meter: background + icon
- `draw-it` Pictionary · Draw It: background + icon
- `simon-faceoff` Simon · Face-Off: background + icon
- `price-bid-off` The Price Is Right · Come On Down!: background + icon
- `hungry-hungry-heads` Hungry Hungry Hippos · Hungry Hungry Heads: background + icon
- `disc-duel` Windjammers · Disc Duel: background + icon
- `arrow-arena` TowerFall · Arrow Arena: background + icon
- `driller-duel` Mr. Driller · Driller Duel: background + icon
- `bubble-battle` Puzzle Bobble · Bubble Battle: background + icon
- `broforce-jungle` Sean of a Gun: Jungle: background + icon
- `broforce-factory` Sean of a Gun: Factory: background + icon
- `broforce-city` Sean of a Gun: City Siege: background + icon
- `broforce-desert` Sean of a Gun: Desert Assault: background + icon
- `frogger-heads` Frogger: background + icon
- `sqwordle` Sqwordle: background + icon
- `sean-of-the-dead` Sean of the Dead: background + icon

### Items (7 of 633 still need a picture; file = id)

- `matrix-emp`: Nebuchadnezzar EMP (The Matrix)
- `v43-sports-almanac`: Grays Sports Almanac (Back to the Future)
- `v43-fire-flower`: Fire Flower (Super Mario Bros.)
- `v43-starman`: Starman (Super Mario Bros.)
- `v43-jill-lockpick`: Jill’s Lockpick (Resident Evil)
- `v43-fulton-balloon`: Fulton Balloon (Metal Gear)
- `wz-bullet-bill`: Bullet Bill (Mario Kart)

### Character portraits (51 still need one; file = id, extra faces id.mood)

- `mylo`: Mylo (Home)
- `kc`: KC (Home)
- `loki`: Loki (Home)
- `alex`: Little Alex Horne (Taskmaster)
- `timr`: Tim Robinson (I Think You Should Leave)
- `bond`: James Bond · Sean Connery (James Bond)
- `marge-gunderson`: Marge Gunderson (Fargo)
- `tajomaru`: Tajomaru (Rashomon)
- `warren-nuke`: Warren (Class of Nuke 'Em High)
- `chrissy-nuke`: Chrissy (Class of Nuke 'Em High)
- `knoxville`: Johnny Knoxville (Jackass)
- `walkabout-skeleton`: Mini Golf Skeleton (Walkabout Mini Golf)
- `walkabout-ball`: Lost Ball (Walkabout Mini Golf)
- `pit-pat`: Pit-Pat (Mr. Show)
- `jamie-taco`: Jamie Taco (I Think You Should Leave)
- `dom-toretto`: Dominic Toretto (Fast & Furious)
- `chris-parent`: Dad · Chris Conners (Home)
- `angie-parent`: Mom · Angie Conners (Home)
- `rob-mcwilliams`: Rob McWilliams (REZN)
- `spencer-ouellette`: Spencer Ouellette (REZN)
- `krumm`: Krumm (Aaahh!!! Real Monsters)
- `ref-themidnightsociety`: The Midnight Society (Are You Afraid of the Dark?)
- `ref-tarman`: Tarman (Return of the Living Dead)
- `ref-commandcenter`: Command Center (Power Rangers)
- `uss-steve`: Steve (Unlimited Savory Systems)
- `bond-lazenby`: James Bond · George Lazenby (James Bond)
- `bond-moore`: James Bond · Roger Moore (James Bond)
- `bond-dalton`: James Bond · Timothy Dalton (James Bond)
- `bond-brosnan`: James Bond · Pierce Brosnan (James Bond)
- `bond-craig`: James Bond · Daniel Craig (James Bond)
- `patrick-bateman`: Patrick Bateman (American Psycho)
- `vin-diesel`: Vin Diesel (Fast & Furious)
- `bond-64`: James Bond · GoldenEye 64 (GoldenEye)
- `kb-crazy-88`: Crazy 88 Fighter (Kill Bill)
- `wf-craig-buettner`: Craig Buettner (Saturday Night Live)
- `shane-over`: Shane Over (ShambConkins Friends)
- `carlos-valle`: Carlos Valle (ShambConkins Friends)
- `bert`: Bert (ShambConkins Friends)
- `flarpy`: Flarpy (ShambConkins)
- `lsoh-crystal`: Crystal (Little Shop of Horrors)
- `lsoh-chiffon`: Chiffon (Little Shop of Horrors)
- `bb-jefferson-dutton`: Jefferson Dutton (The Birthday Boys)
- `bb-dave-ferguson`: Dave Ferguson (The Birthday Boys)
- `reno-sven-jones`: Sven Jones (Reno 911!)
- `reno-cherisha-kimball`: Cherisha Kimball (Reno 911!)
- `idio-frito`: Frito Pendejo (Idiocracy)
- `idio-upgrayedd`: Upgrayedd (Idiocracy)
- `idio-cabinet`: Camacho’s Cabinet (Idiocracy)
- `idio-beef-supreme`: Beef Supreme (Idiocracy)
- `mac-tonight`: Mac Tonight (McDonald’s)
- `ml-harry-doyle`: Harry Doyle (Major League (film))
