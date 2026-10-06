# Changelog

## v0.45.0

**Board.** Each realm is now a journey map: a short stem from camp, a crossroads, then three side-by-side
roads (Calm / Adventurous / High Reward) that each run through their own themed terrain, with bridges
between them and a merge at the gate. Roads are smooth, drawn with direction arrows and signposts; every
landmark stands in its own illustrated card beside the road. The Level IV horror realm uses the same style.
The BOARD button shows the whole current realm. Older saved runs keep their old layout and still work.

**Route choices** no longer cover the screen. The choice panel docks under the map; tapping an option lights
that road on the map before you commit with GO. Blocked roads are labelled.

**Journeys.** Every player draws a different journey per realm (visit landmarks, win minigames, take a
specific road, cross a bridge, ...) and is paid the moment it is completed. Shown as a chip on each player.

**Locations.** ~395 generic stops ("X studio door", "X crossover stop") became varied venues (diner, dive bar,
drive-in, dojo, ramen stand, arcade, courthouse steps, ...), each with its own scene art.

**Characters (+38).** Chuck Norris, the five original Power Rangers, Mel Gibson, 11 more Mortal Kombat
fighters, Jesus, Satan, *NSYNC (5), Backstreet Boys (5), Tupac, Bob Marley, Stevie Wonder, the four Beatles,
and **James Bond · GoldenEye 64** (unlocked by winning a minigame as the Pierce Brosnan Bond).
Freddy, Jason, Michael Myers, Ghostface, Pinhead, Leatherface, Chucky, Jigsaw and Satan now unlock only in the
Level IV horror route, which is much easier to reach (20% per eligible card instead of 3.5%).
Team-up bonuses for the new groups.

**Trivia.** Manual review of every question: 126 removed (duplicates, answer giveaways like "Belcher",
garbled or unverifiable) and 380 re-levelled. A load-time filter now removes giveaways and duplicates from any
future pack. 8 new categories, 167 new questions.

**Games (+6, 1 rewritten).** Paddy's Neighborhood Hole is now a true 3D scene on a 4x larger map with ~25 object
types in different shapes, fleeing critters, time pickups and combos. New: Block Battle (Tetris), Shred Hero
(Guitar Hero), Dodgeball, Fight Night (Rocky), Gopher Hunt (Caddyshack), Wind Archery (Brave).
Every game now cites a real movie, show or game.

**Items.** +45 referenced items (several trigger the new games). Outliers capped (movement +10, steals of 6,
points of 8). Fight Milk is now a carton, Rum Ham is a ham. Generic stock-photo lookups were removed for
show-specific props.

**Logos.** Terminator, Men in Black and Jackass (and other franchise-ambiguous sources) use consistent built-in
wordmarks instead of a live lookup that could land on a sequel logo; every source now gets one consistent style.

**Balance.** Survivor perk earns a shield at each gate; Scavenger no longer gets a bonus item at the first gate.

**Tooling.** The project is now a real source tree (`src/`, `assets/`, `tools/build.mjs`). Drop-in art folders
(`assets/portraits`, `assets/items`, `assets/locations`), `tools/headcrop.py` to cut out heads from photos,
and tests for board structure, unlock paths, every game and a full bot playthrough.

## v0.44.0
Source split of v0.43.1 (byte-for-byte reproducible), rare-encounter dialog contrast fix, version label fix,
camera safety net, test harness.
