# Changelog

## v0.61.0

**1-player Arcade.** The Arcade has a 1P / 2P switch. In 1P you pick who's playing (Sean or Amber; unlocks go to that player's roster) and a CPU difficulty (Easy, Normal or Hard), and every Arcade game can be played alone. Level games carry on stage after stage until you lose (Broforce missions, Super Mario Bros. World 1 on a loop, Sonic acts with a new boss pilot each time, Bricks Breaker Quest, Hole.it, Mario Kart Grand Prix, Photo Hunt across the whole library, Time Trials against your own ghost). Timed games become rounds that speed up each time, with a target to beat. Head-to-head games put a CPU in the other seat wearing your other New Game pick: board games (chess, checkers and the rest), Pong, air hockey, sumo, Kart VS, Balloon Battle, Rainbow Rivals and more, plus trivia, Uno, Yahtzee, Liar's Dice, Battleship, Clue, Monopoly, the casino tables and Microgame Rush. Co-op Space Invaders keeps a CPU teammate; Living Dead and the boss rematches are played alone, with a thinner horde, weaker bosses and five hearts. Best results are saved per game. Newlywed, Roast Battle and Draw It stay 2-player only.

**DOOM and DOOM II.** Two new Arcade games running on a JavaScript rebuild of the original 1993 engine, with the free Freedoom maps built in (or pick your own WAD files on the phone). Touch controls work like the Android port. The status-bar face is your character with all of Doom's expressions, and one WANTED monster per map wears a character you haven't unlocked yet: kill it to recruit them. 1P plays the whole game with six save slots; 2P picks a level and skill, one life each, and scores kills, items, secrets and the par time.

**Hole.it.** Paddy's Hole is now a remake of the mobile game Hole.it: a 3D tray of toys, fruit, kitchenware and sushi, real physics (props tip over the rim and stacks stay solid until the hole gets under them), a size bar, boosters, bombs that end your turn, goal cards, points levels, three stars per level, the pre-level screen with a level map, and the Bravo! coin bonus. Levels 2-6 and 30-34 are rebuilt from gameplay videos.

**Bricks Breaker Quest.** A new neon brick-breaker with a stage map, triangle bricks, lasers, bombs, +1 rings and beam rings; a new line drops in every turn. Stages 1-36 are hand-built and the rest are generated, plus endless CLASSIC and 100 BALLS modes.

**Random game.** A 🎲 button at the top of the Arcade picks any game in the current list.

Also fixes six Broforce tests and the trivia/player-name test setup. Saves, character/location/game ids and Android launcher paths are unchanged.

## v0.60.0

**Hangman Unchained.** Hangman is rebuilt as a full-screen Django Unchained western: a HANGMAN / UNCHAINED logo in the film's red style ("The H is silent."), a sunset desert, wooden gallows and detailed cowboys wearing your faces under Stetsons, and big touch keys instead of the tiny letter bar. Three games: **Quick Draw** (both players guess the same phrase at once on their own keyboards; first to shoot a letter owns it), **Showdown** (one keyboard, players take turns one letter at a time with a 15-second shot clock; the keyboard, a NAME'S SHOT banner and the player's card glow in the shooter's colour) and the new **Wanted** (one player writes a secret phrase or deals one from the deck, the other guesses, then swap). The deck has about 600 movie titles, quotes, sayings, loaded phrases, bands, games and Shambconkins in-jokes. Every sound is a synthesized gunshot, ricochet, revolver click, spur jingle, gallop, whinny or "Yeehaw!".

**Symphony of the Night.** A new dark PS1-style Castlevania game (`cv-symphony`): your head on a caped hero with combos, backdashes, dive kicks and a double jump, Death stripping your gear, caverns, the Marble Gallery and a two-phase Dracula. P1 runs it, then P2 races P1's after-image.

**Mario Kart 3D.** The kart warp games are now real 3D: Grand Prix VS split screen, Grand Prix pass-and-play, Time Trials against a ghost and Balloon Battle, on Rainbow Road, Moo Moo Meadows, Cheep Cheep Beach and Bowser's Castle, with Mario Kart Tour drag-to-steer, drifting and mini-turbos.

**Photo Hunt cabinet.** Photo Hunt is a replica of the 2007 Megatouch Aurora cabinet screen with its real rules, hints and a house high score, and 20 photo pairs.

**Minigame remakes.** Twenty-six weak minigames were rebuilt with authentic looks (Atari Pong, Breakout, Asteroids, Missile Command, Lunar Lander, Space Invaders including two new versus/co-op games, Nokia Snake II, Stacker, Spy Hunter, TRON, Combat, Scorched Earth, Tapper, GoldenEye Facility, NES Duck Hunt, a real dartboard and more), and canvas games now fill the screen.

**Super Mario Bros. World 1.** The Mario warp games now play the NES World 1 maps: 1-1 (with the coin room), 1-2 underground with the Warp Zone above the ceiling, the 1-3 treetops and Bowser's castle 1-4 (firebars, lava, the bridge and axe, Toad). Movement uses the original NES physics numbers. New game **Super Mario Bros. · World 1** with the NES title screen and menu: 1 PLAYER GAME (each player plays a whole game, P2 races P1's ghost) or 2 PLAYER GAME (Mario and Luigi swap on every lost life), three lives, the NES clock, highest score wins. Coin Rush now carries on to 1-2, 1-3 and 1-4 at the flagpole. Taking any Warp Zone pipe in 1-2 finds a character you have not unlocked hiding in the tunnel, who joins your team. The cap now fits the player's head (with the M / L badge); Luigi wears a green cap with white overalls. Fire Mario throws NES fireballs (two at a time, bouncing along the ground), and five of them knock out the fake Bowser in 1-4. Koopa shells score their own NES knockout chain (500, 800, 1000 … 8000, then 1-UPs) and vanish once they slide off screen. The games fill the whole screen with Pause, Exit and a full-screen toggle floating in the corner. Saves and existing game ids are unchanged.

## v0.59.1

**Broforce faces and a stray line.** Bros now pull a face for what they are doing: angry while firing or hit, sad when they die, win after a rescue or stage clear, thinking in mid-air, walking when they run, silly after standing around and normal otherwise (using each character's own mood portraits where they exist). Removed the faint vertical line that ran down the middle of the screen (the touch-zone divider).

## v0.59.0

**Broforce overhaul.** Players now take turns on the same three-stage mission and the higher score wins. Levels are deep and fully destructible (tunnels, bunkers, two-storey barracks, watchtowers, cliffs with hidden caves, pits under rope bridges), with about 100 enemies per mission (soldiers, suicide bombers, minigun bruisers, attack dogs, grenadiers), Broforce wall-climbing, grenades, exploding barrels, checkpoint flags, the Devil boss and the extraction chopper. Bro heads are proper round faces. Characters unlock only by freeing the GOLD cage on each stage.

Every Broforce head is now the character's own outlined silhouette (cut-outs used to be cropped into circles). Also includes the Windows one-click release builder (`BUILD-RELEASE.cmd`). Saves, character/location/game ids and Android launcher paths are unchanged.

## v0.58.3

**Six gameplay fixes from TESTver, promoted after owner playtesting.** Player names now follow setup input and survive the appropriate save/restore and turn handoffs without changing roster ownership. Trivia modes fix crashes and show distinct correct, incorrect, timeout, and mixed-answer feedback after both players commit. Pokémon Bond catches and trainer rewards respect the exact character ID, with accessible haptics behavior. Gopher Hunt randomizes available opponent portrait moods. Fruit Ninja enforces finite swipe combos and input resets. Taskmaster Frantic Relay replaces the old challenge set with seven matched object tasks plus practice and protects the final completion/cancellation lifecycle.

All seven focused regressions, board/level/unlock tests, browser smoke/route tests, and 139/139 minigame fuzz checks passed together on TESTver. Release candidate also validates the actual offline HTML and its affected minigames. Saves, asset IDs and Android launcher paths are unchanged.

## v0.58.2

**Castlevania warp zone — Dracula's Castle.** NES-style stage map, Clock Tower boss fight with Death, original gothic chip-baroque music, themed items, chance cards and trivia. Two pass-and-play minigames: Vampire Killer Dash and Night of the Candles. Prison Mike now has his own unlock line. Integrated on top of v0.58.1, preserving newer South Park, Pokémon, minigame and boss content.

## v0.58.1

**Every character's mood art now shows in Pokémon battles.** Sean's and Amber's built-in mood photos (and moods that
share one picture, like Alex's angry/think face) were being skipped; they now switch faces in battle like Forrest and
Taskmaster. Full rectangular photos are trimmed to a head oval instead of showing as a box. New drop-in portraits and
moods (`assets/portraits/<id>.<mood>.webp`) still work automatically.

## v0.58.0

**Ten of the original simple minigames rebuilt from scratch.** An audit of all 112 pool games flagged the early
button-and-emoji games as the weak spots; each one is now a full touch game with its own art, sound and a real hook.
Ids and engine names are unchanged, so saves and board events keep working.

- **Brawndo Fruit Merge** → Suika-style physics jars, both players at once. Merge fruit up to your rival's head;
  two heads explode for +150. Overflow the line and you top out.
- **Pancakes, Divorce, Pancakes** → simultaneous eating contest: bite on the chew beat, mashing makes you queasy,
  throwing up costs two pancakes, golden stacks count double, and when Suzanne calls you put the fork down.
- **Skynet Identification** → find the Terminator in a crowd seen through T-800 vision. Seven rounds teach a tell
  each (eye glint, chrome skin, not flinching at the dog, a perfect march). Shoot a human and your scanner locks.
- **Paper Route** → a real Paperboy street: steer the bike, tap where the paper lands. Mailboxes, doorsteps, smashing
  non-subscribers' windows, dogs, cars, potholes and paper bundles.
- **Boulder Run** → two temple corridors at once; jump pits and spikes, slide under darts, grab idols, and every
  stumble lets the boulder roll closer.
- **BASEketball** → baseball rules with a basketball: choose single/double/triple/home-run spots, runners advance,
  three outs per inning, and the defender gets two PSYCH-OUTs per inning to wreck your aim.
- **Penalty Kicks** → real-time on one phone: the striker swipes (aim, power, curl), the keeper swipes to dive.
  Five each, then sudden death.
- **Dinner Service** → a burger line: tickets, a three-slot grill (gold ring = perfect, red = "IT'S RAW!"), build
  bottom-up and tap the plate to serve.
- **Alien · Motion Tracker** → blips only show on each ping, pings speed up as they close in, flamethrower with
  limited fuel. Don't torch Jonesy.
- **WarGames · Vanishing Tic-Tac-Toe** → each player keeps only three heads; your fourth erases your oldest.

## v0.57.0

**Pokémon battles show your characters' moods.** Every head you upload already becomes a Game Boy sprite (the same
dithered Gen 1 look as the rest), and now every mood picture you uploaded gets its own sprite too. In battle your
Pokémon looks thoughtful while you pick a move, grins when it lands a hit, gets angry when it's hit or hurt by
poison or a burn, goes silly when it hurts itself in confusion, and looks sad when it misses or faints. A beaten
trainer comes back looking sad. Characters with only one picture keep it, and no generated placeholders are used.

## v0.56.4

**Only your uploaded heads, no grey silhouettes.** v0.56.3 let generated placeholder art beat your photos (Forrest,
Taskmaster and others showed a grey "FM"/"TT" silhouette in the roster and in their expression cycle). Characters with
an uploaded head now use only the images you supplied: a mood picture when you gave one, otherwise their main photo.

## v0.56.3

**Every mood portrait you dropped in now shows up.** Characters with a base photo (Forrest, Taskmaster, Ace, the
Always Sunny gang, Cartman, Prison Mike, Frank, Mac, Gizzard) were stuck on that one picture; now their think, win,
silly, angry, sad and walk faces appear. On the board the idle faces also cycle through silly and angry, and character
select shows every expression instead of only the first five.

## v0.56.2

**Wide-screen boss fights are as hard as portrait ones.** The new wide arena turned out about 28% easier (a simulated
pair took 6.9 hits a minute instead of 9.6), so bosses now fight the whole field: aimed volleys, fans, lasers,
flame breath and waves go after both players on their own flanks, the piranha trapdoors and Riddler's lanes come in
narrower panels with a safe spot near each of you, falling walls drop from the top with a gap for each player, the
wrecking ball's chain is long enough to reach you, and drones hover where they can bother you. Wide arenas also
attack a little faster and denser. Your guns lock onto a nearby minion before the boss, so drones get shot down.
Measured across all 36 bosses, wide and landscape fights now land within about 7% of portrait in hits taken and
damage dealt. Phones held upright are unchanged.

## v0.56.1

**Boss fights fill the screen.** On desktops, tablets in landscape and phones held sideways the arena now stretches to
the whole screen instead of a narrow strip in the middle. The boss takes centre stage, a little bigger, and each player
starts on their own side of it; planes turn to face the boss and their guns, MEGA BEAM and star barrage aim at it, and
planes can't fly through the boss. Short landscape screens hide the score bar, status line and help strip so the
fight gets the height. Phones held upright play exactly as before.

## v0.56.0

**New warp zone: South Park, Colorado.** The board is the town map: snowy streets with snowbanks under the Rocky
Mountains, the bus stop and the Welcome to South Park sign, Stan's, Kyle's, Cartman's and Kenny's houses, Main Street
(Tweek Bros. Coffee, City Wok, Skeeter's), South Park Elementary, City Hall, Hell's Pass Hospital, Big Gay Al's
sanctuary, and Stark's Pond at the end with Mecha-Streisand wading in it. Own interface colours and an original
mountain-town folk-rock score.

**South Park characters.** 26 new ones (Stan, Kyle, Kenny, Chef, Mr. Garrison, Mr. Mackey, Wendy, Tweek, Craig, Jimmy,
Timmy, Token, Ike, Mr. Hankey, Terrance, Phillip, Officer Barbrady, Big Gay Al, Sheila, Uncle Jimbo, ManBearPig,
Scott Tenorman, PC Principal, Pip, Robert Smith, Leonard Maltin) that only join in the warp zone. Arriving in town
recruits one you don't have for each player, every game won there recruits another for the winner, and three Chance
cards ("New kid in town", ...) do the same. Cartman, Butters, Randy and Towelie can also turn up there.

**Boss: Mecha-Streisand.** A steel kaiju with Barbra Streisand behind the visor, signature attack TRIANGLE OF ZINTHAR
(three spinning beams). Beat her and Barbra Streisand joins both rosters.

**Three South Park minigames.** Dodgeball World Championship (flick to throw, don't hit Kenny), Cheesy Poofs Catch
(catch snacks, dodge Mr. Hankey) and They Killed Kenny! (tap the pianos, rats, meteors and saucers before they reach
him). The zone also deals the older South Park Snowball Fight and Waiting for the Wii, 34 new South Park trivia
questions, twelve South Park items and South Park fortunes.

## v0.55.0

**Flipadelphia needs a real flick.** A barely-there touch used to land the cup every time. Now a soft flick
under-rotates and a wild one over-rotates; a firm, deliberate flick lands rim-down. Every flip also wobbles a little
(seeded), so the same flick isn't a guaranteed hit.

**Warp zones end like levels.** The first player to reach the end of a warp board wins the zone; the other player is
dragged to the boss along the road, losing half a point per space (with the running tally banner), then INCOMING BOSS
and a co-op fight. Win or retreat, both return to the main map. Kanto keeps Rival Gary's gym.

**Board landmarks use the iconic place names.** The generated "Hill Valley Drive-In Screening"-style labels are gone:
each property's landmark is now its well-known spot (Fhloston Paradise, Nakatomi Plaza, Moe's Tavern, Camp Crystal Lake,
...). Ids are unchanged, so saves keep working. Bosses and personal places (Parents' House, Unlimited Savory Systems,
Home, friends) are untouched.

**Vault and roster scroll endlessly.** No more Next/Previous pages: cards keep loading as you scroll. The search box is
full size and readable, and the filters moved into one dropdown.

**Boss rematches and Pokémon in the vault.** A boss you have beaten can be fought again from the vault (new "Bosses"
filter shows all of them, beaten or not; beaten ones also appear under All games). Two new vault entries start a random
wild Pokémon encounter or a random trainer battle for Sean or Amber.

## v0.54.2

**Warp boards open close enough to read on a portrait phone.** The warp-board camera used its landscape span on
portrait screens, so every space was a dot until you pinched in. On a portrait screen the span now follows the narrow
side of the map, on every warp board (Green Hill, Mario, Pokémon and the rest). Landscape and desktop views are unchanged.

## v0.54.1

**Sonic and Super Mario Bros. are now played in turns, full screen.** Instead of a split screen, each player gets
the whole canvas for their run: P1 goes first, the phone is passed with the usual hand-off card, then P2 runs the same
seeded level with P1's recorded run alongside as a translucent ghost (also shown on the progress strip). The HUD shows
P2 the score to beat. Ring Rush / Coin Rush: 60 seconds each, most rings/coins wins. Goal Dash / Castle Dash become time
trials: the fastest to the signpost/flagpole wins (furthest progress if nobody finishes); P2's run ends early once P1's
time can no longer be beaten. Either keyboard set (WASD + Space, or arrows + Enter) controls whoever's turn it is.

## v0.54.0

**Super Mario Bros. on the Mario warp board.** A split-screen NES World 1-1 built like the Sonic games: both
players run the same seeded course at once (P1 top, P2 bottom) with their head under Mario's cap (P2 in Luigi
colours). NES SMB1 movement (walk/run speeds, skids, hold-to-jump-higher gravity), ? blocks and bricks, Goombas,
Koopa shells, piranha plants, Super Mushroom, Fire Flower (fireballs), Starman, a camera that never scrolls back,
a warp pipe down to an underground coin room, the flagpole and the castle.
- **World 1-1 Coin Rush:** most coins after 60 seconds wins; the castle sends you round again with fresh coins.
- **Castle Dash:** first to the flagpole wins; pits and hits while small send you back to the last checkpoint.
- Touch: drag on the left to walk (further to run, down to duck or enter a pipe, tap for a fireball), tap the
  right to jump (hold for higher). Keys: W/Up jump, Space/Enter run and fire.
- Both games are dealt on the Mario warp board (games, Chance cards, and two new challenge items: ? Block and
  Goal Flagpole) and playable in the arcade.

## v0.53.1

**Wild encounters play out like Red/Blue.** The battle music starts, the board itself flashes three times and
one of the eight Gen 1 wipes closes over it (picked like pokered: wild or trainer, foe at least 3 levels above
your lead, Horror/Upside Down count as dungeons); then the ShamBoy opens on a black screen and both sides slide
in as black silhouettes before the colours come back. Portraits load during the wipe instead of before it.
- **Opponents can only heal a few times:** heal and rest moves (RECOVER, WAFFLES, PIZZA TIME, BELLY RUB...) work
  once per wild Pokémon or trainer Pokémon (twice in a gym), and only once it is down to half HP.
- **Catching uses the real Gen 1 formula** (ball, HP, status, catch rate), including the shake count: 0 or 1
  shakes when it was never close, 3 shakes and a lock-in when it is caught. With the HP bar in the red a foe is
  usually caught (Poké Ball ~63%, Great Ball ~80%, Ultra Ball always); the lowest catch rate is now 45.
- A small full-screen toggle sits in the top-right corner of the ShamBoy's screen bezel.
- Also in this build: only the level boss moves players to the next level, and the title music starts on launch.

## v0.53.0

**James Bond warp zone: the Volcano Lair.** A new warp pipe destination styled as Blofeld's hollowed-out volcano
(You Only Live Twice): steel gantry catwalk, Bird One on the launch pad, the piranha pool, a laser room, the world
domination map, the monorail dock and SPECTRE HQ at the end. Spy-surf board music, dark gold/red interface theme.
- **Just getting there** recruits a random movie Bond (Connery, Lazenby, Moore, Dalton, Brosnan, Craig) that each
  player does not have yet, one for each player's roster.
- **The boss** is Ernst Stavro Blofeld (white cat, Nehru jacket, scar) with a new PIRANHA TRAPDOORS signature move:
  the floor splits into panels and all but one or two drop into the piranha pool. Beating him recruits one random
  Bond villain that neither player has yet: Goldfinger, Oddjob, Jaws, Le Chiffre, Scaramanga, Dr. No, Silva,
  Trevelyan, Xenia Onatopp, Blofeld himself, or one of twelve new lair-only villains (Max Zorin, Hugo Drax, Rosa
  Klebb, Red Grant, Dr. Kananga, Emilio Largo, Elliot Carver, Franz Sanchez, Nick Nack, May Day, Renard, Safin).
- **Three new Bond minigames** (split screen, both players at once, also in the arcade):
  **Laser Vault Heist** (Diamonds Are Forever: drag through sweeping, sliding and blinking beams to steal diamonds),
  **Funhouse Duel** (The Man with the Golden Gun: shoot Scaramanga and Nick Nack cut-outs, never the cardboard Bond
  or a mirror reflection; one golden bullet at a time) and **Stop the Bomb at 007** (Goldfinger: stop your read-out
  as close to 0:07.00 as you dare, seven rounds). The lair also deals Baccarat, Facility Escape, Moonraker Lander,
  Laser Table, Oddjob's Hat and Ski Chase, the 007 and GoldenEye quizzes, Bond gadgets and a Bond Chance deck.

## v0.52.0

**Themed warp zones.** Every warp board now deals only its own world's content. Minigame, task and roulette spaces
pick from the zone's own games (the roulette only spins those), trivia spaces ask that zone's quiz, item spaces hand
out that zone's supplies, Chance spaces draw from a zone deck (Toad Houses, Lakitu's fishing rod, Go Directly to
Jail, the Molasses Swamp, Kaa's hypnosis, Wadsworth's tip, the Lost Woods, Super Ring monitors…) and bonus/penalty
spaces use zone fortunes. A challenge item used inside a warp plays the zone's game instead, and pair events, the
Home dog pack and board reshuffles wait until you are back on the main map. Those games and items still turn up on
the main board as before. The Pokémon warp keeps its own battles, grass and trainers.

**Fifteen new warp minigames** (all two-player, touch-first, also in the arcade):
- Green Hill Zone: **Sonic Ring Rush** (most rings after 60 s) and **Sonic Goal Dash** (first to the signpost).
  A split-screen Sonic 2 VS-style platformer with your head on Sonic: Mega Drive physics constants, slopes, loops,
  springs, spin dash, rolling, ring scatter when hit, badniks (Motobug, Crabmeat, Buzz Bomber, Chopper), item
  monitors (Super Ring, Shield, Speed Shoes, Invincibility), lampposts, the Green Hill title card and the spinning
  signpost. Ring Rush ends each lap in a Giant Ring that restarts the act with fresh rings.
- Rainbow Road: **Rainbow Road Grand Prix** (3 laps) and **Rainbow Balloon Battle**. Mode 7-style split-screen
  karts with item boxes, Mushrooms, Bananas, Green Shells, Stars, Lightning, coins and Lakitu rescues.
- World 1 · Grass Land: **N-Spade** card matching and the **Spade Panel** picture slots from Super Mario Bros. 3.
- Candy Land: **Gumdrop Mountain Catch** and **Color Card Dash** (with Lord Licorice "hands off" cards).
- Chutes & Ladders: **Ladder Rush** (climb, switch ladders, dodge chutes) and **Spinner Showdown** on the classic
  board with its real ladders and chutes.
- Boardwalk Empire: **Monopoly Speed Die** (24-space board, Chance, Community Chest, Mr. Monopoly and the Bus) and a
  **Sealed-Bid Auction**.
- Tudor Mansion: **Clue Whodunit** (real deduction with private notebooks and Wadsworth's spare cards) and **Lineup**.
- Hyrule Field: **Rupee Rush** and **Sword Duel** on a 1986-style overworld screen with Octoroks and Tektites.

**Warp trivia and items.** New quizzes for Super Mario Bros. 3, Candy Land, Chutes and Ladders (with Kaa and The
Jungle Book), Monopoly and Clue, and more questions for Mario Kart, Zelda and Sonic. 48 new themed items
(Triple Mushroom, Bullet Bill, P-Wing, Warp Whistle, Gumdrop Pass, Golden Ladder, Get Out of Jail Free, Secret
Passage Key, Pegasus Boots, Master Sword, Speed Shoes, Chaos Emerald…) plus nine challenge items that start
a zone minigame on the spot.

## v0.51.0

**Road choices line up with the map.** The buttons under the map are now in the same left-to-right order as the
roads they lead to (also for bridges and shortcuts). Roads at a fork are a free choice again: Level 1 never bars a
road, and later levels only occasionally (about 3 in 10) bar one adventurous road. Shortcuts and bridges keep their
requirements.

**Smoother board.** Pinch, wheel and drag now slide the already-drawn board on the GPU and redraw it once when the
gesture settles; camera glides between spaces do the same (two redraws instead of one per frame). Each step only
swaps the parts of the board that changed (usually the player heads) instead of rebuilding ~5,000 SVG elements, so
a board update costs ~40 ms instead of ~170 ms. The looping scenery animations (blinking, drifting, spinning) on grid
boards are off: they made the background jitter and repainted the whole board every frame.

**Every space says what it does.** Each grid tile shows one word under its icon: MINIGAME, TRIVIA, BATTLE, CHANCE,
ITEM, BONUS, BAD LUCK, SHOP, CASINO, YAHTZEE, TASK, WARP. Landing on a space flashes a big banner naming the action
before it starts. Most of the old "?" encounter spaces became battles or trivia on new boards; the rest are Chance
cards (🃏), which never turn into a trivia question. Minigame, task and shop icons are now 🎮 📋 🛒.

**SMASH 'EM UP!!** Between the Gentlemen card and the Level I metal card: a hard cut to bottles and glasses
shattering with breaking-glass sounds and a giant "SMASH 'EM UP!!".

## v0.50.0

**Pokémon battles, Game Boy style.** Wild characters now jump out at you while you walk the board: every step has a
small chance of an encounter (at most one a turn), a little higher near a landmark, and the wild character comes
from that landmark's show or film. Event cards that used to hand you a character now start a wild battle with them
instead. Landmark visitors, KC + Mylo, Loki and every other special unlock work exactly as before.
The battle is a first-generation Pokémon battle on a Game Boy Color screen: flash-and-blinds encounter transition,
frantic battle music, slide-in intro, "Wild DWIGHT appeared!", FIGHT / PKMN / ITEM / RUN, typewriter text, draining
HP bars (green, yellow, red) and the low-HP alarm, cheap little move animations, critical hits, super effective,
status problems, stat stages, experience, level ups with the stat box and new moves. Character photos are turned
into dithered 4-shade sprites (blocky 2x back sprites for your side) tinted by type; SELECT switches to the classic
green screen. Get a wild character's HP into the red and throw a Poké Ball: the ball wobbles and either "Gotcha!" or
"Darn! The POKéMON broke free!". Catching one unlocks them for your roster.
Every character has a species: one or two of the 15 original types, base stats, four moves (classic moves plus a
signature move from their show: RUM HAM, BEARS BEETS, KAMEHAMEHA, FORCE CHOKE, …) and an ability (INTIMIDATE,
STURDY, PLOT ARMOR, …). Your team is your character plus up to five random unlocked characters; it keeps its HP,
experience and levels through the run and is healed at each new level.
**Trainer battles.** Poké Ball spaces on the board are trainer battles against six random characters. Win and one
of the characters you beat joins your roster (plus points). Blacking out costs 3 points and heals your team.
**Poké items.** Poké Balls ×5 / ×10, Great, Ultra and Master Balls, Potions, Super and Hyper Potions, Full Restore,
Revives, Full Heals, X Attack/Defend/Speed/Special, Rare Candy, Elixers and the Poké Doll are new supplies. They go
into a separate battle bag. Each player starts with 5 Poké Balls and 3 Potions, and gets 3 more balls each level.
The **POKéMON** button opens a Gen 1 START menu: your party (STATS, reorder), the bag, a trainer card and the
palette option.
**Pokémon warp zone.** A new warp: Route 1 in Kanto, drawn in Game Boy Color tiles with tall grass, trees, a pond,
a Pokémon Center and a Gym. No minigames. Tall grass starts wild encounters, item balls fill your bag, the Center
heals your team, and trainers stand beside the path: walk into their line of sight and they spot you ("!"), walk
up and battle. Rival Gary waits in the Gym at the end; beat him to leave. New cameo characters: Ash, Pikachu, Misty,
Brock, Gary Oak, Professor Oak, Jessie, James and Meowth.
All music is original chiptune written for the game (two pulse channels, wave bass and noise drums).

## v0.49.0

**Grid boards.** Every level is now laid out like a printed party board game: square tiles on a grid. A short stem
leaves camp, splits at the crossroads into the Calm, Adventurous and High Reward roads, and they wind down their own
part of the grid in switchbacks, staircases and long corridors before meeting at the gate. Each level picks its own
shape, so no two levels look alike. Roads never touch themselves or each other. Where two roads run close, a wooden
plank bridge joins them. Where a road doubles back, a **shortcut** hops the gap and skips 5–14 spaces. Every shortcut
is guarded by an obstacle: get past it with the right gear, a character skill, a crossing pass or 3 points, the same
as the blocked roads. The route chooser shows shortcuts as "Shortcut · skip N spaces". Landmarks stand on cards in the
empty blocks next to their space. Bosses, warp pipes, events, unlocks and games work as before. The Horror level is
one long grid road with two guarded doors. The Upside Down is a square loop, and pair trails are a straight row.
Saved runs keep the board they started with.

**New board look.** The main board is now a dark tabletop for each level (plum for Mind, clay for Body, indigo for
Spirit, blood red for Horror) with faint empty tile slots. Spaces are chunky 3D tiles with white icons. Each tile has a
border in its road's colour, and the road colour also shows in the gaps between tiles. Landmark cards are dark glass
with white titles, and the map labels are white with a dark outline, so they read on any background. The level title
and three road signs sit at the top of each level, and the boss castle sits below the gate. Warp boards are unchanged.
Rare-encounter dialogs had light text on a light card. They now use the dark dialog.

**Beer Pong is a full match.** No more 12-toss limit: the first player to clear all ten cups wins. You get two shots a
turn. Sink both and it's **BRING IT BACK!** for a third shot, but never a fourth.

**Character select.** Each player gets a full panel with a big spotlit face that slowly cycles through that
character's expressions. The roster grid now fills the rest of the panel. Tiles no longer clip faces or names, and a
character the other player has picked is marked P1 or P2. On phones the two panels stack, and the controls are
smaller.

**Back, not Board.** The Characters and Minigame Vault screens have a "← Back" button to the main menu instead of
"← Board".

## v0.48.0

**New board music.** The circus-style chiptune playlists are gone. Board music is now generated live from original
pieces with a softer band: FM electric piano, vibraphone, flute, pads, upright and synth bass and a quiet drum kit, all
through a shared reverb and tempo echo. Each level has its own style: Mind is study jazz, Body is nu-disco, Spirit is
dream pop, the Upside Down is darkwave, and Horror is distorted 180 BPM hardcore with gabber kicks, snare rolls and a
siren. The landmark nearest the current player sets the lead instrument, harmony and ambience: steel drum and waves
at the beach, flute and birdsong in the woods, cello and rain in Gotham, an exotic scale and wind in the desert,
bells in space, and so on for all 18 biomes. The music changes on a bar line so the beat keeps going. Each of the
eight warp boards has its own style: space synthpop, sugar pop, ukulele, lounge swing, island calypso, noir jazz,
field folk and synth-funk. The title screen plays a lo-fi lounge piece. The metal riffs on the level title cards and
the "Gentlemen…" string chord are unchanged.

**Unlock fanfare.** A short brass "ta-da" with timpani, glockenspiel and a cymbal plays whenever a character joins.
The background music pauses underneath it.

**Exit game.** The title screen has an EXIT GAME button. After you confirm, it saves, stops the audio, leaves
fullscreen and closes the tab when the browser allows it. Otherwise it shows a "Thanks for playing" screen with a way
back. New test: `tests/music.mjs`.

## v0.47.0

**The title screen's look now runs through the whole game.** Setup, Characters, Minigame Vault, the board's top bar,
level plaque, mini-map and bottom HUD, route chooser, every dialog and bottom sheet (settings, shop, event and item
cards), the dice roll card, toasts, the minigame frame and pass-the-phone cards, and the end screen all use the same
dark raised panels, black outlines, cream text and a glowing accent ring on the main button. Each level has its own
palette — Mind is wine and gold, Body is ember and amber, Spirit is midnight violet, Horror is blood red — and each of
the eight warp zones gets one too (Rainbow Road, Candy Land, Chutes & Ladders, Monopoly, Mario World, Clue, Hyrule,
Green Hill). Menus outside a run keep the title screen's plum and gold. The board art and each minigame's own
playfield are unchanged; plain in-game buttons pick up the theme. New tests: `tests/themeshots.mjs` (screenshots of
every screen and palette) and `tests/contrast.mjs` (text-contrast audit of every minigame, plus a board walk via
`WALK=seed,seed`).

## v0.46.7

**Title screen buttons share one dark palette.** Every button is now the same dark plum with a black outline and
cream text; the play button stands out with a gold ring, gold label and a soft gold glow instead of a bright fill.
Characters / Minigame Vault tiles lost their pink and teal; Mind / Body / Spirit chips are dark with coloured text.

## v0.46.6

**New title screen.** The main menu is now a proper mobile-game title screen: dark animated backdrop (slow light rays,
drifting embers, vignette), a floating logo with a warm glow, and a single big gold play button.

- The logo's black box is gone: lettering is keyed out to transparency with a thick black outline that follows the
  letters, so it works on any background (title screen and the light top bars). Regenerate with
  `python3 tools/brand-logo.py`; the black-box original lives in `assets/originals/brand/`.
- Top bar: Sean & Amber profile badge (heads, XP, collectibles) plus full-screen and settings icon buttons.
- One hero button: NEW GAME, or CONTINUE RUN (with NEW GAME underneath) when a run is in progress.
- Characters and Minigame Vault are chunky tiles; How to play / Art sources / Clear run / Erase progress move to a
  quiet footer. Mind / Body / Spirit chips under the tagline.
- Short landscape phones get a two-column layout; nothing scrolls at 360x640, 390x780, 780x390 or desktop.
  Animations respect reduced-motion. Screenshots: `tests/homeshots.mjs`.

## v0.46.5

**Warehouse Shift rebuilt as Rush Hour in the Dunder Mifflin warehouse.** The old Sokoban crate-pusher is gone. Your
head now drives Darryl's forklift, boxed in by paper pallets, Schrute Farms beets, Sabre printers (one is on fire),
Kevin's chili, Vance Refrigeration boxes, Mose's hay, Michael's Sebring, Dwight's Trans Am, aisle racks and the
Dunder Mifflin delivery truck. Drag each piece along its aisle, clear the exit row and drive out the loading dock.

- One 75-second shift per player; orders get harder (par 3 up to ~24 slides) and go to Office clients (Serenity by Jan,
  Alfredo's Pizza Café, Blue Cross of Pennsylvania, the Nashua branch...). Same orders for both players.
- 100 points per order plus up to 60 for matching par (a perfect route earns a Dundie). "Start over" resets an order;
  "Blame Toby" skips it for −30 ("Why are you the way that you are?"). The last 15 seconds are Dwight's fire drill:
  alarm, red flashing border, double points.
- Days Since Last Accident: 0 sign, flying paper on every shipment, "That's what she said!" on long slides.
- Puzzles have an exact minimum solution, precomputed by `tools/gen-warehouse.mjs` (`src/data/warehouseOrders.js`).

## v0.46.4

**Paddy's Pub glow-up (Beer Pong + Flipadelphia).** Both games now play inside a real Paddy's: brick wall, lit back bar
with bottles, pendant lamps, a flickering neon sign, and a varnished plank table with trim, legs and the Paddy's logo.
The camera keeps true proportions on every screen (no more stretched, squat cups on wide screens; flip cup is closer on
phones). Gameplay, physics and flick feel are unchanged.

- Beer Pong: shaded solo cups with beer and foam, a ping-pong ball under your head with a motion trail and a shadow that
  shrinks as it rises, depth-correct drawing (the ball passes behind and in front of cups). Sinking a cup splashes beer,
  shakes the screen, wobbles the cup away, leaves a wet ring and your head pops up in the cup. Rim hits clink and spark,
  table bounces plink. The opponent watches from behind the far end and reacts. Aiming shows a power/direction arrow;
  shot clock and 12 toss pips on the wall.
- Flipadelphia: a lit 3D cup with ridges and a white lip, ghost trail while spinning, smooth snap onto its rim on a
  success (confetti, shock ring) or a topple onto its side on a miss. The verdict says why it missed (off the edge, slid,
  so close, whiff). Each player's 8 attempts are tracked as cup pips (flipped / missed / pending).

## v0.46.3

**Full screen everywhere.** A full screen toggle (⤢) now sits in every top bar (home, collection, vault, setup and the
board) and as the first row of Music & Settings, in addition to the home screen button. Turning full screen on from
Settings no longer hides the Settings window.

**Vault fits the screen.** The Minigame Vault now measures how many game cards fit (like the character collection
already did) instead of using a fixed count, and re-measures when the screen size changes (entering/leaving full screen,
rotating). Nothing is cut off; if a card is unusually tall the list scrolls instead of clipping. The home menu also
scrolls instead of clipping when a run's extra button makes it taller than the screen.

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
