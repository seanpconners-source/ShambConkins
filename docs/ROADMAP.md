# ShambConkins roadmap

The owner's master to-do list (dictated Nov 1 2026) sorted into an order of work.
Goal: a fun, semi-finished game. Fewer bad minigames, a clear New Game menu, a real ending. Not endless polish.

**Where we left off and what's next: `docs/HANDOFF.md`** (kept up to date at the end of each stretch of work).

## How we use this file

- **"continue" / "what's next?"** → Claude reads this file, looks at the current phase, and offers 2-4 options
  (with a recommendation). Nothing starts until the owner picks one.
- **New notes** → paste them and say "add to the roadmap". Claude files them under the right section with a new ID
  (or leaves them in the Inbox if unclear). The owner can also edit this file by hand at any time.
- **Changing the order** → just say so ("move Level IV up"). The phases are a suggestion, not a contract.
- **When something is done** → its tag becomes `[verify]` until the owner has played it, then it moves to the Done log.
- Status tags: `[todo]` not started · `[part]` partly there · `[verify]` built, owner hasn't played it yet ·
  `[idea]` needs a decision first · `[bug]` broken now.
- "Make it like <classic game>" items: we aim for that game's feel (controls, pacing, rules style) with our own
  layouts, art and sounds, not a copy of the original's levels/mazes/music.

## Inbox (unsorted new notes)

- **N1** `[idea]` (owner, Nov 3) Friends online: see which friends are playing and whether they can be invited; when a
  friend becomes free (not mid-game, not mid-turn) an invite pops up on their screen at a moment that doesn't interrupt.
  Owner loves online as it is now: look into it soon, keep it simple, don't disturb what works. Builds on I2/I3 (invite
  links, status dot). Needs: a presence list in the Worker (who is in which room / idle), a "free to interrupt" signal
  from the game (title screen, between board turns, results card), and a queued invite toast.
- **N2** `[todo]` (owner, Nov 3) New characters: Pee-wee Herman; Stone Cold Steve Austin; The Undertaker; Mick Foley
  (outfits: Dude Love, Mankind, Cactus Jack); the Whitest Kids U' Know guys; Nick Wiger, Mike Mitchell, Scott Aukerman,
  Paul F. Tompkins, Lauren Lapkus; The Birthday Boys (all of them); the rest of the Reno 911! cast (incl. Terry);
  Idiocracy: Not Sure, Frito, Rita (Maya Rudolph), the general arrested for pimping, Justin Long's doctor, the cabinet,
  President Camacho, all of them; Beavis and Butt-Head; Joe Camel; Mac Tonight (moon head); Sherman Klump, Buddy Love.
  Owner will add more.
- **N3** `[idea]` (owner, Nov 3, tabled) Personal install unlocks: if we know who a copy is for, they unlock their own
  people the first time they open it (e.g. Lydia gets Lydia, Houston, Ezra and Friday the dog: her family, not in the game
  yet).
- **Q0** `[todo]` (owner, Nov 3) REMINDER: run prolonged soak testing tonight and whenever Claude isn't actively working on
  the game (see Q2/Q3), so it keeps improving while the owner is away. Remind the owner of this.

---

## Recommended order

| Phase | What | Why now |
|---|---|---|
| **A. Quick fixes + playtest** | Broken games, boss parry/revive, jittery heads; owner plays the `[verify]` items | Cheap, and broken stuff kills the fun fastest |
| **A+. Boss tiers + outfits** | Picked first (Nov 2): K1-K12 below | Bosses end every level, so they're seen the most |
| **B. Minigame triage** | Owner scores every game Keep / Polish / Rebuild / Cut; cut games leave the board pool | The biggest fun gain for the least work: the board stops dealing bad games |
| **C. Progression + New Game menu** | Unlock rules, new menu, checkpoints, no turn limit | Fixes the structure before more content is piled on |
| **D. Rebuild the keepers** | The worst games that are worth keeping, 1-2 per session | Highest-traffic bad games first |
| **E. Level IV + endings** | Frank's fake-out, hellish Level IV, fake and true endings | The payoff that makes it feel "finished" |
| **F. Board strategy** | Warps on 2 paths, item feedback, stars | Makes the board itself exciting |
| **G. Polish the good games** | Casino tables, kart, Hole.it, penalties, Yahtzee... | Good-to-great, once the bad ones are gone |
| **G+. Menus revamp** | Console-style game select + collection (M1-M7) | Best after the triage (B) decides which games stay and after outfits (K8) exist |
| **H. New content** | Game shows, ITYSL, Lucy, army-gate game, Sci-Fi + Horror warp worlds | Built on reusable engines |
| **I. Online + Pokémon online** | Rooms, invites, chat, PvP Pokémon, co-op Elite Four | Needs real two-phone testing first |
| **Ongoing** | Testing (soak tests, regression tests per fix) | Alongside everything |

The owner's real two-phone online test can happen any time; earlier is better (a lot of online code has only run
in headless browsers).

---

## Phase A — quick fixes and playtest

- **A1** `[verify]` (fixed Nov 2 night: the 1P round runner's speed-up clashed with the chase's own `w.speed`; Breakout 1P had the same bug) Terminator T-800 chase broken in 1P: plays absurdly fast, then says "Terminated" at once (ids to check: `t800-scan-long`, `terminator-scan`).
- **A2** `[verify]` (fixed Nov 2 night: late taps after the card is won say TOO SLOW! with no penalty; before the flip WAIT FOR THE FLIP!) Candy Land Color Card Dash says "Too Early" constantly; fix the rule and explain it on screen (`candyLand.js`).
- **A3** `[verify]` (fixed in K1) Boss fights: parry doesn't work reliably (`bossFight.js`).
- **A4** `[verify]` (fixed in K1) Boss fights: tapping a downed partner doesn't revive them.
- **A5** `[verify]` (Nov 2 night: no rotation, own layer, no overshoot; can't judge desktop feel headless) Character select: heads bounce fast and jittery in desktop browsers (phones look smoother).
- **A6** `[verify]` (Nov 2 night: fits = radius ≤ hole's, was 96%; a too-big prop sunk almost all the way in drops; Level 34's big melons hung at Size 5) Hole.it: watermelons (and others) don't fall into holes that are big enough.
- **A7** `[verify]` (Nov 2 night) Hole.it: remove finished objectives from the HUD.
- **A8** `[verify]` All bosses are too easy (King Kandy most of all): solved by the boss tiers, see "Boss tiers and outfits".
- **A9** `[verify]` Owner playtest of things that may already be done:
  - Pinball online = real multiplayer pinball (balls alternate between phones, both scores shown): built in v0.73.0.
  - Missing visitors at landmarks: fallback visitor added Oct 24 (393 landmarks had none).
  - Online P1/P2 ownership: fixed in v0.69.2 (both phones used to think they were P1).
  - New Game character select cycles facial expressions: built in v0.49 (`installSetupFaceCycle`); check it is on every select screen.

## Phase B — minigame triage (section 2 of the notes)

- **B1** `[verify]` (Nov 2 night: https://claude.ai/artifact/4XLQDBkBkUJcQGvK2ST6w2 — tap Keep/Polish/Rebuild/Cut per game + notes; 349 rows incl. 156 event variants and 37 bosses; roadmap verdicts pre-filled; Claude reads the marks from the page's database) Claude makes a triage sheet: every registered game (incl. event-only and alternate versions) with
  its modes today (1P / 2P one phone / online versus / online co-op) and a blank Keep / Polish / Rebuild / Cut column.
- **B2** `[todo]` Owner plays through and fills it in (a few minutes each; fun is the owner's call, passing tests is not proof).
- **B3** `[part]` (Nov 2 night: mechanism ready, add ids to `src/data/cutGames.js` from the sheet) Cut games: hidden from the board pool and arcade (ids kept so old saves still load).
- **B4** `[todo]` Rebuild/Polish lists feed Phase D and G, ordered by how often the board deals them.
- **B5** `[todo]` Decide per game which modes it should have, and how online players compete (shared world, ghost, scoreboard).
- Already judged by the owner: KEEP as is = Hangman (all modes, "very fun"); KEEP + polish = Pro Mancala (G11).
- **B7** `[todo]` Hangman: western music. Claude prompts the owner to supply western tracks (drop-in songs like
  the pinball/THPS ones), then wires them in.

## Owner-supplied music/art to ask for (Claude: remind the owner when the slot is ready)
- Boss fight music (K22).
- Hangman western music (B7).
- Castlevania music, all versions (NES Vampire Killer / Candle Hunt, Symphony of the Night already has drop-in slots).
- Super Mario Bros. music (World 1, Coin Rush, Castle Dash).
- Sonic music (Green Hill acts, boss, race).
- Boss tier outfit art (K12).
- **B6** `[todo]` Re-check games rebuilt earlier (Oct audit, v0.58 remakes) instead of assuming they're good.

## Phase C — progression and New Game menu

Unlock rules (section 10)
- **C1** `[todo]` One device = one shared collection of unlocked characters (pass-and-play included).
- **C2** `[todo]` Online players use their own device's collection, not an empty local P2 roster. Today the host's profile decides what the guest can recruit (known limit).
- **C3** `[done]` (owner, Nov 3: Arcade wins DO recruit after all, there are too many characters otherwise; `ARCADE_RECRUITS=true`; some can stay locked behind conditions) Found Nov 2: 1-player Arcade wins can still recruit a random character (`settleSolo` in gameLauncher.js). Boss Select no longer gives characters (K6). Games launched from the game list award no progression unlocks (results card already says "Practice · No unlocks"; check Boss Select and every standalone path).
- **C4** `[todo]` Both players can earn unlocks in real board play.
- **C5** `[todo]` A new unlock goes to the roster for future games; it never swaps the player's current character mid-run.
- **C6** `[todo]` Audit every unlock trigger, owner and save path.

New Game menu (section 5)
- **C7** `[todo]` Replace the confusing setup and the options that do nothing. Modes:
  Main Game With Warps (default) · Main Game Without Warps · any visited warp world as a short standalone game.
- **C8** `[verify]` (Nov 2 night: START AT on New Game, `checkpointStart` in app.js, `profile.levelReached`) Checkpoints: start at Level 1/2/3/4 once reached; a later start begins with an empty bag.
- **C9** `[verify]` (Nov 2 night: select removed, every run = race to the finish, co-op ends when both finish) Remove the number-of-turns option (`run.maxTurns`); games run to their natural end.
- **C10** `[todo]` Warp worlds stay single-route, no checkpoints.
- **C11** `[idea]` Character select before the rest of setup?
- **C12** `[todo]` Clean up the 1P / local 2P / online challenge setup flow.

## Phase D — rebuild the keepers (section 1, the "execution sucks" games)

Order to be set by the triage. Current candidates:
- **D1** `[todo]` Home Alone Stairs / Paint Can: good idea, rework into a genuinely fun game.
- **D2** `[todo]` Cone Chaos: major redesign or replace.
- **D3** `[todo]` Death Proof: looks cool, play is bad; redesign.
- **D4** `[bug]` Major League Baseball: doesn't work properly. Rebuild in the style of Ken Griffey Jr. Presents MLB (SNES); review batting and fielding games.
- **D5** `[verify]` (Nov 2 night: floating stick per half + tap/2nd finger/BOMB button, smooth walking with corner sliding, Bomberman bodies; arena look unchanged) Bomberman: controls too hard; SNES Super Bomberman style with character heads.
- **D6** `[verify]` (Nov 2 night: classic ghost AI + waves + frightened, 75% ghost speed, arcade maze/ghosts/sounds; heads stay as the chompers) Pac-Maze Duel: much closer to classic Pac-Man (maze feel, ghost behavior, power pellets, speeds, sounds).
- **D7** `[todo]` TowerFall Arrow Arena: confusing, not fun; proper competitive archery game.
- **D8** `[todo]` Rocky boxing: two-player Punch-Out!! style.
- **D9** `[todo]` Raiders Boulder Run: major improvement.
- **D10** `[todo]` South Park Dodgeball: decent; move toward Super Dodge Ball (NES).
- **D11** `[idea]` Baccarat: rework a lot or remove.

## Phase E — Frank's Level IV and the endings (sections 5 + 6)

Frank's fake-out
- **E1** `[part]` Frank keeps his current frequency (Chance card, 20% once both cleared Body; `events.js`). Flag: maybe revisit.
- **E2** `[verify]` (Nov 2 night: `src/frankFx.js` + `frankFakeout` in app.js; test tests/frank.mjs) Sequence: Frank "starts" Shits and Ladders (laxatives, climb ladders, last to shit wins) → players offered laxatives →
  world melts and fades → "I don't think that was a laxative..." → Frank's face fades in → "LEVEL IV: HORROR".
- **E3** `[verify]` (Nov 2 night) Players jump from mid-Level 3 straight to Level 4, skipping the Level 3 boss and the fake ending.
- **E4** `[verify]` (Nov 2 night: `playFrankReveal({short:true})`) Starting at a Level 4 checkpoint shows a short version of the reveal.

Level IV
- **E5** `[verify]` (Nov 2 night: `horrorDecor` in gridRender.js; more could come: animated fire, a Saw-style trap room) Keep the layout; make it far darker: fire, blood, chains, filthy dungeons, rusty metal, industrial / Saw-style.
- **E6** `[part]` (9 horror landmarks already in Level IV; some horror ones sit in II/III, see handoff Q13) Random horror landmarks like the other levels: Evil Dead cabin, Camp Crystal Lake, Haddonfield, Elm Street, Jigsaw's warehouse...
- **E7** `[todo]` Review its minigame pool; mostly horror games and horror reskins, add new ones where needed.
- **E8** `[part]` (Myers, Jason, Freddy, Leatherface, Chucky, Pinhead, Jigsaw, Ghostface already unlock in Horror) Michael Myers, Jason, Freddy etc. discoverable and unlockable here.
- **E9** `[todo]` A separate unlockable Horror warp world reached from Level IV.

Endings
- **E10** `[verify]` (Nov 2 night: src/endings.js 'fake') Level 3: deliberately strange, a bit unsatisfying fake ending.
- **E11** `[verify]` (Nov 2 night: 'true') Level 4: elaborate, satisfying true ending.
- **E12** `[verify]` (Nov 2 night: `LORE` templates in endings.js; owner may want to write more) Both suddenly invent ridiculous backstory and lore about the actual chosen characters.
- **E13** `[verify]` Both skippable, with an "are you sure?" so nobody skips by accident.

## Phase F — board strategy (sections 4 + 11)

- **F1** `[todo]` Warp entrances on two of the three paths (today: one pipe per realm). Keep warp travel as is (both go, catch-up, return to where they were).
- **F2** `[idea]` A special bonus or risk on the path with no warp.
- **F3** `[todo]` More meaningful path choices; items and spaces matter more to strategy.
- **F4** `[idea]` Rare Mario Party-style stars / special rewards.
- **F5** `[todo]` Item use is unmistakable: big animations, big numbers, clear outcome text.
- **F6** `[todo]` Review every item: is it useful? Add interesting ones that interact with the board.
- **F7** `[todo]` Finish missing item artwork.
- **F8** `[todo]` Pacing, variety, excitement, replay value of the board overall.
- **F9** `[idea]` Later: a more winding, less predictable main board.
- **F10** `[idea]` Casino dealers unlockable ("the dealer was impressed and joined your party").

## Phase G — polish the good games (section 1)

- **G1** `[todo]` Casino games: real Vegas tables, cards dealt, dealer animations, players around the table, atmosphere.
- **G2** `[todo]` Penalty Kicks: fun already; better graphics, animations, sound, presentation.
- **G3** `[todo]` Mario Kart: backs of heads with helmets, frequent look-backs, wider courses, more interesting play, more stages and many more tracks.
- **G4** `[part]` Hole.it (owner, Nov 2: good start; the first levels are close, later levels fall apart). Next: study
  many more real levels, early and late, model the gameplay exactly everywhere we can, then make lots of unique
  levels from what we learn. Earlier notes: camera much further out (show more playfield on big screens, don't scale objects up); mechanics closer to the reference (video: https://youtu.be/91ly46-nhwc). Lots already measured from earlier owner videos.
- **G5** `[todo]` Block Breaker (Bricks Breaker Quest): play and feel closer to the reference. Owner (Nov 2): loves it; the
  parts studied so far are right. Next: study as many real levels as possible, early and late, beginning to end, to
  work out how the real levels are built, then generate lots and lots of our own levels from those rules.
- **G6** `[todo]` Yahtzee: more authentic play and presentation.
- **G7** `[todo]` Horde (Living Dead): better feel, progression, weapons, combat.
- **G8** `[todo]` DOOM: backs of heads; death animations (head shrinks and sits oddly over the corpse); more varied enemy characters and positions.

- **G11** `[todo]` Tony Hawk's Pro Mancala (owner loves it; polish only): skaters' feet look weird during trick
  cutaways; fisheye only some of the time, other times other 90s skate-video angles (more camera angles, shots and
  filters, more variety, cooler and more real); background setting picked at random each game like THPS levels (city
  street, skatepark, vert ramp, bowl...), with ramps and props, keeping the skaters who roll by.
- **G9** `[bug]` Pinball physics feel (all tables): near the flippers and elsewhere the ball drags slowly along
  surfaces and takes too long to come down; doesn't feel real (rolling friction / damping / slope, `pinball/`).
- **G10** `[verify]` (Nov 2 night: Nest guides raised to the pivot tops, cap over the orbit/ramp slot; sim stops 200 → 1) King Gizzard pinball: ball can get stuck in the upper area left of the small top-left flipper.

## Menus revamp (owner, Nov 2: "sleek, modern, professional, not amateur")

Design reference: the PS5 home screen (feel, motion, layout ideas), but its own ShambConkins look, not a copy.
- **M1** `[todo]` Arcade / game select as a console-style home: a big hero area with key art for the focused game,
  a horizontal row of game tiles that scrolls with smooth animation, sound on focus, background that changes per game.
- **M2** `[todo]` Rows/sections: Featured ("old favorites"), Recently played, Recently added, Recently updated,
  Favorites (star a game), by genre; sorting and filters; search stays.
- **M3** `[todo]` Game families: versions live under one main game, each with its own title screen/page where you pick
  the version. E.g. "Replay Bosses" → a menu of unlocked bosses with a screenshot/portrait each (ties in with the
  tier ladder K5); Pokémon games together; Mario Kart modes (GP, Time Trial, Battle...); likely also Space Invaders,
  Hangman, Broforce, Castlevania, Sonic, SMB, pinball tables, trivia...
- **M4** `[todo]` Real tile art per game (icon/key art), not plain cards; locked games look locked.
- **M5** `[todo]` Character collection revamp in the same style: tap a character → a detail page with their
  portrait/moods and their unlocked outfits (K8-K12) and how to get the rest.
- **M6** `[idea]` Carry the same look to the other menus (home, New Game, settings) once M1 is liked.
- **M7** `[verify]` (Nov 3: Look Book https://claude.ai/artifact/BTqLZbwnPtUwPKz2tGNTNa = 3 layouts x 6 palettes x 5 picture styles x 5 letterings on Home/Arcade/Game page/Character, owner votes + notes saved in its db: collections `looks` (doc id `<layout|pal|art|type>--<option>`, {vote,note}) and `combos`; read with ArtifactData list. Older 3-direction mockup: https://claude.ai/artifact/4h7fazkSTgh1oQxDQdpctE) Before building: Claude mocks up 2-3 design directions (screenshots) for the owner to pick from.

## Phase H — new content (sections 3 + 7)

Reuse engines with new skins wherever possible.
- **H1** `[idea]` Game-show set on one engine: Price Is Right Plinko, Jeopardy!, Wheel of Fortune, Who Wants to Be a Millionaire?, Deal or No Deal.
- **H2** `[idea]` I Love Lucy chocolate factory: black-and-white conveyor-belt game.
- **H3** `[idea]` Little Buff Boys (ITYSL): players judge show-accurate contestants; Troll Boy can't win; winning unlocks Troll Boy.
- **H4** `[idea]` Chunky (ITYSL): he puts your own hat on you / throws your laptop; nobody knows what he does.
- **H5** `[idea]` Army-gate lane game (the mobile-ad kind: lanes of enemies, gates multiply your army). Skins: Starship Troopers, zombies, horror...
- **H6** `[idea]` Western arcade shooter (Sunset Riders style).
- **H7** `[idea]` Overhead off-road racer (Super Off Road style).
- **H8** `[idea]` Horde variants: aliens, stormtroopers...
- **H9** `[idea]` More movie games, and more games for each existing warp world.
- **H15** `[idea]` Matrix hacker pipe game (rotate tiles to connect the flow): hardcore-hacker look, green code rain,
  frequent cutaways to Morpheus / Neo hacking (drawn and animated in the movie's style: real film clips can't be
  shipped in the game). Take turns, online you watch each other's turns; some sections need both players to connect
  them together; maybe a full online co-op mode.
- **H16** `[idea]` Lights Out clone with an over-the-top theme like the recent games (Pro Mancala, Hangman).
- **H17** `[idea]` Tower defense: the best ideas of the great TD games, very fun; designed from day one for 1P,
  2P co-op, 2P versus, local and online.
- **H18** `[idea]` Super Mario Bros.: more worlds (2, 3, 4...) toward a full game, then maybe a Mario 3 / World-style
  game. Note: new worlds get our own level designs in the NES style (same physics, enemies, look), not copies of
  Nintendo's maps.
- **H20** `[idea]` Star Fox 64-style rail shooter with a badass theme (later).
- **H21** `[idea]` Mega Man warp world + a Mega Man-style game: stage select, robot-master stages, weapons, music and
  sound effects in that style (original tunes and our own stages: no copied melodies or maps).
- **H19** `[idea]` Sonic: more levels and zones, look and feel much closer to the Mega Drive games (the way SMB got
  NES physics and art), with our own level layouts in that style.
- **H10** `[todo]` Warp worlds: visiting one unlocks it in New Game; beating its boss unlocks the boss in Boss Select + the character.
- **H11** `[todo]` Review every existing warp world (play, variety, theme, quality); keep special mechanics (Pokémon, Chutes jumps).
- **H12** `[idea]` Sci-Fi warp world: random Star Wars / Star Trek / Alien / Starship Troopers / MIB places; random boss (Vader, Xenomorph Queen, giant Klendathu bug, Edgar). Edgar unlock TBD.
- **H13** `[todo]` Better Edgar portrait (the real MIB character).
- **H14** `[idea]` More themed warp worlds later.

## Phase I — online and Pokémon online (sections 9 + 12)

- **I1** `[part]` Joining, leaving, drops, reconnects (much done in v0.69.0; real phones untried). Leaving a board game should feel natural.
- **I2** `[idea]` Invite links.
- **I3** `[idea]` Simple online status dot (no friends list).
- **I4** `[idea]` Quiet chat: canned Nintendo-style lines, text, or both.
- **I5** `[todo]` Room creator sets up the board game and sends challenges; the other player sees, accepts or declines.
- **I6** `[part]` Every suitable game has online versus or co-op (all 95 head-to-head games native online; co-op shared worlds for the owner's picks).
- **I7** `[todo]` Better watch views, visible scores, turn-taking.
- **I8** `[todo]` Real test on two separate phones (owner).
- **I9** `[todo]` Pokémon: online battles vs the other human.
- **I10** `[todo]` Pokémon: online co-op vs trainers.
- **I11** `[idea]` Pokémon: co-op Elite Four challenge.
- **I12** `[todo]` Review the Pokémon warp world, incl. online.

## Boss tiers and outfits (section 8 + outfits from 13; CURRENT WORK, design agreed Nov 2 2026)

Build order: K1 → K2-K4 → K5-K7 → K8-K12 (outfits may get their own session).

Fixes
- **K1** `[verify]` Parry (A3) and revive (A4). Both use one tap test in `bossFight.js` (under 260 ms and under 18 px of
  movement), easy to miss while dragging to fly; parry also needs a pink bullet within 34 px, revive within 62 px of
  the bubble. Fix: forgiving tap test, bigger zones, a clear "TAP!" hint at the partner's bubble.

Difficulty tiers
- **K2** `[verify]` Four tiers: Easy (= today's difficulty), Medium, Hard, Extreme. Higher tiers add new attack patterns
  and an extra phase, not just faster bullets. Each boss keeps its own built-in strength (`boss.tier`, `K` table in
  `bossAttacks.js`) on top. Solo/online balance rules (`SOLO_K` etc.) still apply.
  Built: `BOSS_TIERS` in data/bosses.js; `requestGame({difficulty})`. Bot hits per full fight ≈ 5.5 / 7.3 / 9 / 13.6.
  Online board fights pass the tier (K3); arcade online challenges will once Boss Select has tiers (K5).
- **K3** `[verify]` (built Nov 2: `bossTierFor` in bossGate.js, tier on the boss intro card, online passes it to the
  other phone with the board game message; online untested here) Board tier = the level: Level 1 Easy, 2 Medium, 3 Hard, 4 Extreme (the true ending is a real
  challenge). A warp zone's boss uses the tier of the level it was entered from.
- **K4** `[todo]` No boss difficulty setting anywhere. The 1P CPU difficulty stays as it is (it's about the CPU player).
  Standalone warp worlds (New Game menu, C7) offer a difficulty, limited to the levels reached in the main game
  (reached the Level 3 checkpoint → warp worlds on Hard).

Boss Select ladder
- **K5** `[verify]` Per boss a 4-step ladder: Medium locked until Easy is beaten, Hard until Medium, Extreme until Hard
  (padlock + "Beat Medium to unlock"). A win counts wherever it happens (board or Boss Select); beating a tier also
  clears every tier under it (beating him on Hard in Level 3 clears Easy + Medium + Hard). Saved as the highest tier
  cleared per boss (add to `profile.js` defensively).
- **K6** `[verify]` The boss character itself still unlocks only on the board (first win), as now; that also puts it in
  Boss Select. Tier wins in Boss Select unlock that boss's tier outfits and nothing else (some bosses only ever meet
  you at one tier on the board).
- **K7** `[part]` (medals, gold frame and the "X CLEARED!" line done; the outfit art reveal comes with K8-K11) Polish: 4 medals on each boss card, gold frame on an Extreme clear, win screen "HARD CLEARED — New
  outfit: <name>" with an art reveal.

Outfits (for every character, not only bosses)
- **K8** `[todo]` Group real versions under one character: James Bond (6: Connery, Lazenby, Moore, Dalton, Brosnan,
  Craig — `movieBonds.js`), the Batmans, Supermans, etc. Each outfit keeps its existing character id and still unlocks
  on its own, so old saves keep what they have (ids never renamed).
- **K9** `[todo]` Character select: pick the character, swipe through outfits; locked outfits = silhouette + how to get
  it. Collection shows "3/6 outfits". Roster stops being crowded with duplicates (replaces P5).
- **K10** `[todo]` Each boss gets 3 tier outfits (Medium / Hard / Extreme), each with a name (e.g. "Turbo Kandy") and a
  drop-in art slot for the owner. Until the art exists the game draws a styled stand-in from the normal portrait
  (recolor / glow / flames by tier).
- **K11** `[todo]` "NEW OUTFIT!" reveal card when one unlocks.
- **K12** `[todo]` List of every outfit art slot for the owner to fill.

Make boss fights super badass (owner, Nov 2: "let's make the boss fights so much fun!")
- **K15** `[part]` (Nov 2 night: ships redrawn with shading, stripes, nav lights, flames, power-up pods; done before: phase-break blasts, damage smoke/fire, hotter edge tint and aura per phase, final-phase embers; left: better player ships, more boss art) Graphics: distinct-looking phases, better boss art, better player ships; heads/expressions on the
  boss and the ships react properly (hurt, angry, laughing, dying).
- **K16** `[verify]` (Nov 2 night: engines/bossPowerups.js: SPREAD, TURBO, MISSILES, SHIELD, SMART BOMB, HEART capsules every ~13-19 s + one per phase break) Power-ups to pick up mid-fight (weapons, shields, bombs).
- **K17** `[verify]` (Nov 2: bombs + carpet run; more weapons welcome) Crazy weapons and bombs, for players and bosses.
- **K18** `[verify]` (Nov 2: ambush from the bottom or a side) Bosses come from unexpected places: up from the bottom, in from the side.
- **K19** `[verify]` (Nov 2: AMMO emoji per boss in data/bosses.js) Themed bullets: each boss throws things from its own movie/show/game.
- **K20** `[verify]` (built Nov 2: engines/bossBoom.js) Huge explosions on a kill, bigger per tier; Extreme kills get a crazy huge extreme explosion.
- **K21** `[verify]` (built Nov 2: bossComms.js + data/bossTalk.js) Star Fox-style talk between phases: boss and players trade lines in comm boxes, with funny jokes.
  Special lines when a player character and the boss are related (same show/movie, rivals, family).
- **K22** `[part]` (slots READY Nov 2 night, waiting for the owner's songs: `assets/music/boss-<id>.mp3`, `-p2/-p3/-final`, `boss-any(-n)`, `boss-final`, `boss-win`, `boss-lose`; see assets/music/README.md) Boss music: owner will supply tracks.
- **K24** `[verify]` (Nov 2 night: engines/bossCutscene.js; offline slow motion, online visuals only) Partner-down cutscene: when a co-op partner's plane goes down, a quick slow-mo zoom on the
  surviving player's character with their sad face as the other plane explodes, big "NOOOOOOO!!!!", then back to
  the fight (short, so the revive window still matters).
- **K23** `[todo]` Fit the K15-K22 work with the tiers (K2): higher tiers unlock the nastier attacks and bigger finales.

Other boss items
- **K13** `[part]` Better boss portraits and face placement. Done: faces are cut-out heads (no circle frame), bigger,
  with moods (smug intro, laughs on a hit, hurt under supers, angry later, sad on KO). Left: some photos with busy
  backdrops don't cut out cleanly (e.g. Nurse Ratched) → owner cut-out art would fix them.
- **K14** `[todo]` Audit 1P, local 2P and online co-op boss behavior; unlocks only for legit wins.

## Art and presentation (section 13; ongoing)

- **P1** `[part]` Missing portraits and moods (121 characters had no own art at v0.70.0) and location/visitor art.
- **P2** `[todo]` Audit broken, generic or wrong portraits.
- **P3** `[todo]` Back-of-head art (DOOM, Mario Kart).
- **P4** `[todo]` Expressions/reactions used more consistently.
- **P5** → now K8-K12 (outfits).
- **P6** `[todo]` Memorable unlock announcements: proper art and animation.
- **P7** `[todo]` General transitions, animations, sounds, menus.

## Testing and stability (section 14; ongoing)

- **Q1** `[todo]` Full gameplay audit for games that barely do anything (overlaps B).
- **Q2** `[idea]` Overnight soak test: long board runs, repeated minigames, rewards, save/load, restarts.
- **Q3** `[idea]` Soak test online: two players, drops, rejoins, latency.
- **Q4** `[todo]` Every fixed bug gets a test.
- **Q5** `[todo]` Watch for freezes, dead input, memory leaks, crashes, duplicated rewards, corrupted state.
- **Q6** `[todo]` Desktop, Android phone and foldable screen checks.
- Rule: passing tests ≠ fun or working. The owner's play decides.

---

## Done log

_(finished and played by the owner; newest first)_
