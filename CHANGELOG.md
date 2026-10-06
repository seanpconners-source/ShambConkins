# Changelog

## v0.46.2

**Full screen on phones.** Browsers (Samsung Internet included) only allow full screen after a tap, so the first tap
anywhere in the game now switches to full screen (hides the address bar and navigation). The home screen also has a
"FULL SCREEN" / "EXIT FULL SCREEN" toggle for getting back in after leaving with the back gesture.

## v0.46.1

**Challenge items start their game.** Finding a challenge item (e.g. Vampire Killer → Evil Dead · Cabin Defense) at a
supply cache or landmark used to only drop it in the bag, even though the card said it challenged both players. The
find card now offers "Play … now" (uses the item, game starts) or "Keep it in my bag".

**Streamlined shop.** Quark's shop is a compact bottom sheet: the board stays visible (no dim/blur), each item is one
row with a category tag (Minigame, Points, Movement, Defense, Attack, ...), a readable effect line and a price button;
items you can't afford are greyed out. The extra "Business concluded" popup is now a toast.

## v0.46.0

**Levels (after Chardee MacDennis).** Level I Mind (wine), II Body (beer), III Spirit (hard liquor), and Frank's
secret Level IV Horror. The board now has a level plaque (big numeral, name, progress pips with a marker for
each player, "Players are drinking: ..." status; toggle in settings). A full-screen title card announces the
start of each level and every level you reach. Games lean toward the level (trivia/puzzles in Mind, physical
games in Body, humiliation/couples games in Spirit); winners of on-theme games get +1, Spirit losers owe a
small silly dare.

**Boss fights.** New co-op Cuphead-style shoot-'em-up (both players fly, parry pink bullets, supers, revive
your partner) with 34 bosses. Every level now ends in a boss castle at the gate; beating the boss unlocks it as
a character (26 new boss-only characters).

**Warp zones.** A warp pipe hides in each realm. Jumping in teleports both players (wavy screen, spinning heads,
flash, landing) to one of eight small themed boards: Rainbow Road, Candy Land, Chutes & Ladders, a Monopoly-style
board, SMB3 World 1, Clue mansion, Hyrule Field, Green Hill Zone. Each ends at a boss castle.

**Return of the Living Dead horde** is now a full Vampire Survivors-style game: 3/8/12 minute runs, 12 weapons x
8 levels with evolutions, 13 passives, 19 enemy types, chests, a scrolling world, final boss and "The Hunger".

**New games (22).** Pass-and-play: The Newlywed Game, Roast Battle, Pictionary Draw It, Battleship, Liar's Dice,
Simon Face-Off, Price Is Right Bid-Off. Real-time two-player: Hungry Hungry Heads, Snowball Fight, Disc Duel,
Arrow Arena, Driller Duel, Bubble Battle. Tarantino: Mexican Standoff, Twist Contest, Adrenaline Shot, Crazy 88,
Bounty Hunter, Stunt Chase. WarioWare-style Microgame Rush (33 microgames) plus marathon and Nintendo variants.
(Also fixed: the six v0.45 games were missing from the random pool.)

**Touch first.** ~35 games replaced on-screen button bars with swipes, drags, flicks and taps, and many now fill
the screen. Gopher Hunt now pops up your rival's head.

**Characters (+146).** Tarantino's whole filmography (51), every Batman and Superman actor, Will Ferrell and his
characters, Chris Farley, Tim Allen, Clint Eastwood, Red Dead, more Death Stranding, friends (Shane, Carlos, Bert),
Flarpy the horse, David Bowie, God, the poop emoji, Mr. Potato Head, Colonel Sanders and more, with ~35 new
landmarks. Jesus is now a portrait of Jesus; Satan is the Lord of Darkness from Legend. Placeholder portraits use
the character's emoji until a photo loads.

**Trivia.** 920 new questions in 40 themes (Tarantino, Batman, Superman, action, horror, comedy, anime, games...).

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
