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
- **M21** `[verify]` (owner, Nov 3; v0.80.7) Pictures must appear immediately: Arcade backgrounds when picking a game, faces on the get-ready card. Check on the real phone after updating.
- **M22** `[verify]` (owner, Nov 3; v0.80.7) 🎲 opens a random game's page, not the Ready card. Hangman Unchained = one tile on every shelf with its 3 versions on one page.

- **M23** `[verify]` (v0.80.8; owner, Nov 3: "looks weird on normal phones", Amber's Samsung = 360x780) Arcade backgrounds on screens
  that aren't one of the picker's: `mapLock` (arcadeConsole.js) moves the nearest locked setting by the layout (faces keep
  their gap above the text and their share of the width; with less height the room above them goes first, then they shrink),
  not by the screen's centre. Picker screens `amber-phone` 360x780 + sideways added (to lock). Genre line moved under the
  logo, above the chips, everywhere. Checked by screenshots at 16 phone sizes (iPhone SE to Pro Max, Samsung, Pixel, Fold).
- **U1** `[verify]` (v0.80.8; owner, Nov 3) Updates often don't come through on home Wi-Fi (phone and PC) but do at once on 5G or a
  VPN. Done: Update now downloads the new version first, with a progress bar, and restarts only when it is in (the start
  of the game waits just 2.5 s for the site, then plays the saved copy, so a slow network kept reopening the old one);
  when that saved-for-next-time copy arrives later the app offers Restart; Settings → Check for updates says what failed
  and how long it took; the site streams the page instead of making the first phone wait. If it still fails on Wi-Fi only,
  it's the network: test https://shambconkins.loki-mylo.work/version on Wi-Fi; suspects = the router's security filter /
  DNS blocking the .work domain, or broken HTTP/3 (Cloudflare → Speed → Protocol Optimization → HTTP/3 off, as a test).
- **M24** `[verify]` (owner, Nov 4; built Nov 4, unreleased, tests/arcade-swipe.mjs) Arcade game page: swipe left/right anywhere on the hero (background, title, Challenge/Play
  button area) to go to the previous/next game on the shelf, like flicking through cards. Background, logo and info slide
  with the finger and snap to the next game; the tile row follows. Taps and vertical scrolling must keep working.
- **N4** `[idea]` (owner, Nov 3-4) Egg game = **"Feed Eggs"** from *I Think You Should Leave* S3E2 ("I Can Do Whatever I
  Want"): Tim Robinson's office worker plays a crude black-and-white computer game, feeding eggs into a Big Egg's mouth, so
  hooked he ignores his two complaining coworkers ("You're a rockstar"). A voice calls out egg counts that make no sense
  (one egg is sometimes 40 eggs); going too fast makes the eggs miss the mouth; the prize at the end is the "nude egg".
  Original art by Alec Robbins. Fan remake: egggame.org (Matthew Barton) with the random egg-count voice. Not checked
  first-hand: egggame.org and the news sites are blocked from the cloud session's network (allow them there, or the owner
  describes / screen-records the fan game). OWNER'S ANSWERS (Nov 4): 2P race on one screen (both feed Big Egg at once, the
  voice calls the counts, too fast = misses, higher egg count wins); keep the nude-egg reveal for the winner; the owner will
  allow egggame.org in the environment's network settings so it can be checked first-hand before building.
- **P10** `[part]` (owner, Nov 4) Characters still without their own quote: 362 of 726 (Nov 4 count); Nov 4 batches 1-2 added 39
  famous lines (only ones Claude is sure the character says), 323 left. The rest need a source: allow en.wikiquote.org in the
  cloud environment's network settings so lines can be checked, or the owner sends lines. Was: Biggest gaps: Mortal
  Kombat 14, South Park 12, Hunter × Hunter 10, Death Stranding 10, Reno 911! 9, King Gizzard 7, Dragon Ball Z 7, Birthday
  Boys 7, the Superman actors 6, Warriors, Little Shop, *NSYNC, Backstreet Boys, WKUK, Idiocracy 5 each; also Dee, Cricket,
  Artemis. Add real lines to `src/data/characterQuotes.js` in small batches (a big block of film quotes got a reply
  blocked). The owner's own people (Home, ShambConkins, Friends, Unlimited Savory Systems) need lines from the owner.
- **G12** `[idea]` (owner, Nov 3, later) Better-looking soldiers in Call of Duty: Modern Stick Dot and the Battleship cut
  scenes instead of stick figures. Maybe the owner generates sprites from instructions: write a sprite sheet spec (poses,
  frames, sizes, transparent PNG, file names) + prompts, like the Arcade Art Kit, and add drop-in slots.
- **N1** `[idea]` (owner, Nov 3) Friends online: see which friends are playing and whether they can be invited; when a
  friend becomes free (not mid-game, not mid-turn) an invite pops up on their screen at a moment that doesn't interrupt.
  Owner loves online as it is now: look into it soon, keep it simple, don't disturb what works. Builds on I2/I3 (invite
  links, status dot). Needs: a presence list in the Worker (who is in which room / idle), a "free to interrupt" signal
  from the game (title screen, between board turns, results card), and a queued invite toast.
- **N2** `[verify]` (Nov 3: 43 added in `src/data/legendsPack3.js`, unreleased; Pee-wee already existed; Mick Foley's personas are 'Mick Foley · <persona>' for the outfit system; photos come from Wikipedia until the owner drops portraits in) (owner, Nov 3) New characters: Pee-wee Herman; Stone Cold Steve Austin; The Undertaker; Mick Foley
  (outfits: Dude Love, Mankind, Cactus Jack); the Whitest Kids U' Know guys; Nick Wiger, Mike Mitchell, Scott Aukerman,
  Paul F. Tompkins, Lauren Lapkus; The Birthday Boys (all of them); the rest of the Reno 911! cast (incl. Terry);
  Idiocracy: Not Sure, Frito, Rita (Maya Rudolph), the general arrested for pimping, Justin Long's doctor, the cabinet,
  President Camacho, all of them; Beavis and Butt-Head; Joe Camel; Mac Tonight (moon head); Sherman Klump, Buddy Love.
  Owner will add more.
- **N3** `[idea]` (owner, Nov 3, tabled) Personal install unlocks: if we know who a copy is for, they unlock their own
  people the first time they open it (e.g. Lydia gets Lydia, Houston, Ezra and Friday the dog: her family, not in the game
  yet).
- **M15** `[verify]` (owner, Nov 3 night) Arcade Featured shelf: what the Arcade opens on. The list is `src/data/featuredGames.js`, one id per line: add a game when it has just been worked on. Starts with Pro Mancala, Hangman, Bucketheadland, Mario World 1, Symphony of the Night, Broforce, DOOM, Mario Kart, Hole.it.
- **T1** `[verify]` (triage note, built Nov 3 night) trivia-hardcore = Who Wants to Be a Shambillionaire (`engines/millionaire.js`): ladder, safe havens, three lifelines, final answer, walk away; pass and play, vs CPU, online. Our own synth tension music, no theme tune: the owner can supply sounds and the show's music. Not on real phones.
- **T2** `[verify]` (triage note, built Nov 3 night) office-dots-boxes = Call of Duty: Modern Stick Dot (`engines/modernStickDot.js`): title, mission card, map, rifle / sniper / AC-130 kill cams, killstreak banners. Sound is synth, not real weapons or music: slots for real sounds not built. Not heard by ears.
- **T3** `[verify]` (triage note, built Nov 3 night) Battleship cut scenes (`engines/battleshipCuts.js`): deck gun on a hit, Abandon Ship on a sink. Torpedo crews and cannon variety could come later.
- **T4** `[part]` (triage note, Nov 3 night) Paper Route: dogs fixed (give up, leave after a bite, a paper scares them). Better graphics and play still to do.
- **T5** `[verify]` (triage note, Nov 3 night) Asteroids less zoomed in on big screens (at most 5.2 px per unit). Clearer controls still to do.
- **T6** `[verify]` (triage note, Nov 3 night) price-bid-off = a Price Is Right episode (`engines/priceShow.js`): One Bid, Plinko, Cliff Hangers, Big Wheel. Original yodel and fanfares; the Showcase and more pricing games can be added in `PLAN`.
- **T7** `[verify]` (triage note, Nov 3 night) Crossy Chaos split: `frogger-heads` (new, arcade layout) and `crossy-chaos` = voxel Crossy Road, both in `engines/froggerCrossy.js`.
- **T8** `[verify]` (triage note, Nov 3 night) `paddys-darts` rebuilt (`engines/paddysDarts.js`): 301, Rickety Cricket's Cricket, High Score; first of the Paddy's bar games series. Flick throwing and more modes could come later.
- **M16** `[verify]` (owner, Nov 3 night) Arcade tiles show names; a game's logo (`assets/keyart/<game or family>-logo.*`, transparent) replaces the text on the tile, hero and version page. Done: Sean of a Gun, Hangman, Pro Mancala. Owner still making tile icons.
- **BF1** `[verify]` (owner, Nov 3 night) Broforce is renamed **Sean of a Gun** (game ids unchanged) and is ONE game in the Arcade (id `broforce`), with a world select title screen (Jungle, Factory, City, Desert). The old world ids stay for saves and the board, hidden from Arcade menus (`arcadeAs`). Online, player 1's phone picks.
- **BF2** `[part]` (owner, Nov 3 night) Logo and background are in. Owner still making the tile icon; one picture per world is optional: `assets/keyart/broforce-jungle.*`, `-factory`, `-city`, `-desert` (colour cards with an emblem until then).
- **BF3** `[todo]` (owner, Nov 3 night) New levels for each of the 4 worlds, worked on together with the owner after the pictures. New worlds can be added later: a new entry in `THEMES` in engines/broforce.js gets a card by itself.
- **PK1** `[todo]` (owner, Nov 3) Pokémon: moves that fit each character (their show/movie, personality), not generic ones.
- **PK2** `[idea]` (owner, Nov 3) Pokémon evolutions, and evolving unlocks new outfits for that character (ties to K8-K12).
- **PK3** `[verify]` (Nov 3 night: a random roll made her GHOST/ICE, so NORMAL and FIGHTING moves did nothing, with HUGE POWER and a never-miss Batarang; she is NORMAL/FIGHTING with SHED SKIN and her own WHIP CRACK now. Other characters can still roll HUGE POWER: 27 do, say if another one feels unfair) (owner, Nov 3) "For some reason Catwoman is unstoppable." Probably her Pokémon battle stats/moves; find
  where (wild/trainer battles, or elsewhere) and balance.
- **PK4** `[verify]` (Nov 3 night: each shake tips the ball side to side on its base) (owner, Nov 3) The Poké Ball rocks back and forth while waiting to see if the catch works, like Gen 1
  (shake count from `gen1Catch`).
- **PK5** `[verify]` (Nov 3 night: with a full team the game asks; the one replaced goes to the PC. With room on the team it joins as before) (owner, Nov 3) After catching a wild Pokémon you can put it straight into your team, replacing a member.
- **C13** `[verify]` (Nov 3 night: a boss or horde played alone pays only the human; the CPU gets no points or win) (owner, Nov 3) 1P vs CPU board: at the level boss the human fights alone (correct), but the CPU still
  got points (CPU 11, owner 10) though it wasn't in the fight and the owner beat the boss. Check boss settle in CPU runs.
- **K25** `[verify]` (Nov 3 night, bot on 6 bosses, phone size: hits taken per minute Easy 9.6, Medium 12.7, Hard 14.1, Extreme 16.8; boss HP drained per minute 150, 127, 109, 93 %. So tiers do get harder. Pickups used to get RARER on higher tiers; flipped, Extreme now drops about every 9 s against 16 s on Easy. Supers do not scale yet; not played by a human) (owner, Nov 3) Check the boss tiers really get harder in play (not just HP): higher tiers = a wild,
  fun bullet storm where the player still feels powerful (power-ups and supers scale up too); varied gameplay and
  power-ups. Measure with tests/bossdiff.mjs DIFF=0..3 and play screenshots.
- **C14** `[part]` (Nov 3: the New Game board list says "Main Board (Mashup)"; the id stays Mashup for old saves) (owner, Nov 3) Rename the "Mashup" board: call it the Main Board (or similar) so it's clear this is
  the real game and the warp worlds are sub-worlds.
- **M8** `[part]` (Nov 3: New Game, Character Select, Collection and title screen done in the console look (src/menuScreens.js, src/collection.js); left: online room menus, settings, dialogs, results cards) (owner, Nov 3) Revamp ALL menus in the new arcade look once it's settled: New Game, character select,
  online/room menus, home.
- **M11** `[verify]` (owner, Nov 3) Arcade round 2: categories rebuilt (Action, Retro arcade, Head to head, Racing & sports, Board & cards, Puzzle, Party, Trivia & shows, Casino & dice, Pinball, Co-op, Bosses, Pokémon; `CATEGORIES`/`CAT_IDS` in arcadeConsole.js), View all grid of big blocks, small-phone sizing, no Start/Back card for games started from the Arcade (online challenges and board games keep it).
- **M12** `[verify]` (owner, Nov 3) Title tiles animate: Characters = both picks cycling moods, Collection = unlocked characters sliding through, Arcade = game pictures (tile icons once they exist), Online = two phones with the picks and a pulsing signal (owner unsure about Online: offer options, see HANDOFF).
- **M14** `[verify]` (Nov 3 night: built with Featured below; `profile.recent`, `profile.favorites`, star on the hero and version cards) (owner, Nov 3, SOON) Arcade categories **Favorites** and **Recent**: quickly see the games you just played, and star games to save them as favorites. Plan: a ★ on the hero (and version tiles) toggles `profile.favorites` (validated in profile.js); `profile.recent` = last ~20 game ids, newest first, written when a game starts from anywhere; two pills first in the row (Recent, Favorites; families show if any member matches). Part of M2.
- **I13** `[todo]` (owner, Nov 3, SOON) Real high-score tables with names: each game's page (Arcade hero / version page) shows the best scores from EVERY player's phone, with the person's name, not just this phone's. Needs: a small scores store in the Cloudflare Worker (e.g. a Durable Object or KV: game id → top N {name, score, character, date, version}), a submit when a solo/arcade run ends (`settleSolo` / soloBest), a read when a game page opens (cache offline, show "local only" when offline), a player name per install (ask once; reuse Character Select's name), basic anti-junk (score caps per game, one entry per name per game, rate limit). Pairs with N1 (friends online).
- **M13** `[todo]` (owner, Nov 3) Game art: a big picture + an icon for every game (186 slots). Art Kit with prompts: https://claude.ai/artifact/Hn2v7kdpz45unnUsT3XNL2 (docs/arcade-art/PROMPTS.md); import with `python3 tools/import-arcade-art.py <folder>`.
- **M10** `[verify]` (owner, Nov 3: "make sure menus are animated and smooth and feel sleek") Nov 3: entrance animations per screen (body[data-enter]), hero cross-fade, hue blend, staggered tiles, version page slide; reduced-motion respected. Keep this standard for M5/M8.
- **M9** `[verify]` (Nov 3: Clean Console navy/white/blue on every menu (`body[data-theme="home"]` in theme.css); Bangers + Nunito built in (assets/fonts)) (owner, Nov 3) New colour scheme for the menus: the owner loves the mockup's look EXCEPT the purple and
  orange. Something awesome and professional. Offer palette options as mockups first.
- **W1** (owner, Nov 3) Daily rhythm from now on: release in the MORNING · owner playtests in the DAY · in the EVENING the
  owner answers Claude's questions (Claude asks all of them first thing when the session starts) · Claude works ALL
  NIGHT · release the next morning · repeat.
- **Q00** `[verify]` (Nov 3: laptop version built: SOAK-TEST.cmd → tools/soak.ps1 → tools/soak.mjs; rolling report soak-reports/LATEST.md + history.jsonl + fails/; GitHub button not built) (owner, Nov 3 evening, BUILD FIRST TONIGHT) A soak test the OWNER can run without Claude (when usage
  credits are out): (1) a manual GitHub Actions workflow "Soak test" (workflow_dispatch only, input: hours, default 2) that
  builds --pwa, serves it, starts `wrangler dev`, loops the soak suite (long solo-board, online-board with drops, every
  minigame via games.mjs, boss fights per tier, levelflow/frank/endings/checkpoint) until time is up, and uploads a short
  report (pass/fail per test, failure logs, screenshots) as an artifact; mind the private-repo Actions minutes. (2) the same
  loop as a one-click `SOAK-TEST.cmd` for the Windows laptop writing the report to a folder. Share one script
  (`tools/soak.mjs`). The next session reads the latest report and fixes what it found.
  OWNER'S PICK (Nov 3): the LAPTOP version (2) first; the laptop can stay on as long as needed. GitHub button optional, later.
  The laptop is Windows (see HANDOFF "Working on the owner's Windows laptop": Node not on PATH, local Playwright in
  node_modules, wrangler via npx needs internet); the .cmd should run until closed and keep a rolling report the next
  session can read (commit-free: e.g. a `soak-reports/` folder the owner can share, or push via GitHub Desktop).
- **Q0** `[todo]` (owner, Nov 3) REMINDER: run prolonged soak testing tonight and whenever Claude isn't actively working on
  the game (see Q2/Q3), so it keeps improving while the owner is away. Remind the owner of this.

---

## Recommended order

| Phase | What | Why now |
|---|---|---|
| **NOW** | Background picker (M20), then the owner's pick from the new notes | Owner asked for it very soon |
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
- Back button arrow image (M18).
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
- **C7** `[part]` (Nov 3: New Game rebuilt: players summary (Change characters ▸), mode cards with descriptions, START AT level cards, board + seed; no character picking there. Left: "Main game without warps" and standalone warp worlds as modes) Replace the confusing setup and the options that do nothing. Modes:
  Main Game With Warps (default) · Main Game Without Warps · any visited warp world as a short standalone game.
- **C8** `[verify]` (Nov 2 night: START AT on New Game, `checkpointStart` in app.js, `profile.levelReached`) Checkpoints: start at Level 1/2/3/4 once reached; a later start begins with an empty bag.
- **C9** `[verify]` (Nov 2 night: select removed, every run = race to the finish, co-op ends when both finish) Remove the number-of-turns option (`run.maxTurns`); games run to their natural end.
- **C10** `[todo]` Warp worlds stay single-route, no checkpoints.
- **C11** `[verify]` (Nov 3: characters are picked only on Character Select; New Game shows them) Character select before the rest of setup?
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
- **M1** `[verify]` (Nov 3: `src/arcadeConsole.js`, owner's look-book pick: Console Home + Clean Console + Neon outline + Comic; hero, pills, tile row, focus tone, arrow keys) Arcade / game select as a console-style home: a big hero area with key art for the focused game,
  a horizontal row of game tiles that scrolls with smooth animation, sound on focus, background that changes per game.
- **M2** `[todo]` Rows/sections: Featured ("old favorites"), Recently played, Recently added, Recently updated,
  Favorites (star a game), by genre; sorting and filters; search stays.
- **M3** `[verify]` (Nov 3: `FAMILIES` in src/arcadeConsole.js, 30 families incl. Boss Select (all bosses, locked ones dark); a family tile opens a version page of TILES (owner's Fold note)) Game families: versions live under one main game, each with its own title screen/page where you pick
  the version. E.g. "Replay Bosses" → a menu of unlocked bosses with a screenshot/portrait each (ties in with the
  tier ladder K5); Pokémon games together; Mario Kart modes (GP, Time Trial, Battle...); likely also Space Invaders,
  Hangman, Broforce, Castlevania, Sonic, SMB, pinball tables, trivia...
- **M4** `[part]` (Nov 3: tiles show a character cut-out per game (41 of 91 on the main list), others their icon. OWNER: these character pictures are PLACEHOLDERS; he wants an individual image AND an icon for every game soon. Slots ready: `assets/keyart/<slot>.webp` (big picture behind the selected game) + `assets/tiles/<slot>.webp` (tile icon); `node tools/arcade-art-slots.mjs` lists all 186 slots in assets/tiles/SLOTS.md (pinball tables already use their backglass). Ask the owner for art, or offer to make an image-prompt kit like docs/pinball-art) Real tile art per game (icon/key art), not plain cards; locked games look locked.
- **M5** `[verify]` (Nov 3: src/collection.js: big blocks, character page with moods, other versions (name prefix "X · Y"), boss medals + stand-in tier outfits, perk/phrase, Play as Sean/Amber; real outfit art comes with K8-K12) Character collection revamp in the same style: tap a character → a detail page with their
  portrait/moods and their unlocked outfits (K8-K12) and how to get the rest.
- **M6** `[idea]` Carry the same look to the other menus (home, New Game, settings) once M1 is liked.
- **M7** `[verify]` (Nov 3: Look Book https://claude.ai/artifact/BTqLZbwnPtUwPKz2tGNTNa = 3 layouts x 6 palettes x 5 picture styles x 5 letterings on Home/Arcade/Game page/Character, owner votes + notes saved in its db: collections `looks` (doc id `<layout|pal|art|type>--<option>`, {vote,note}) and `combos`; read with ArtifactData list. Older 3-direction mockup: https://claude.ai/artifact/4h7fazkSTgh1oQxDQdpctE) Before building: Claude mocks up 2-3 design directions (screenshots) for the owner to pick from.
- **M17** `[verify]` (Nov 3: `reelEdge` in ui.js marks pictures with solid corners `.ts-boxed` → radial fade) (owner, Nov 3) Title screen Arcade tile: when it shows a game's picture (square/rectangular art), show it in a
  soft faded-out circle instead of a hard edge. Transparent cut-outs stay as they are (they look great).
- **M18** `[todo]` (owner, Nov 3) The Back button on menus is weak: make it a cool arrow (owner will generate the image: slot
  `assets/ui/back.*` to be added). Maybe rethink a few other buttons too (offer options when we get there).

## Phase H — new content (sections 3 + 7)

Reuse engines with new skins wherever possible.
- **M19** `[verify]` (v0.80.7: the title tiles' 1.2 s fade was switched off by an older CSS rule, one-frame cuts, fixed; slow pictures in the installed app = the service worker's ignoreSearch lookup, fixed. Nov 3: measured with frame captures: changing screens showed a near-black frame (new screen invisible while pictures decoded) and taps that re-render a screen blanked every picture for 2+ frames. Fixed: ui.js renderInto reuses decoded <img>s, a frozen ghost of the old screen covers the change until the new pictures are ready (≤.4 s), entrance moves keep their motion without the fade (--enter-op)) (owner, Nov 3) The title screen and menus still flicker sometimes: find every cause (re-renders that replace the
  whole view, reels/pictures swapping, entrance animations replaying, fonts/images popping in) and make every screen smooth and polished.
- **M20** `[verify]` (Nov 4: all 34 locked on every screen and in the game (v0.80.5); every new background goes through it from now on; how-to tools/bg-picker/README.md. Nov 3: picker live at https://claude.ai/artifact/N1zQ42EPkUqJf8AzpmdmPT, db collection `bg`, doc id = key-art slot {screens:{<screen>:{z,fx,fy}},verdict,note}; game reads `src/data/keyPlacements.js` KEY_PLACE (fill it from the db), nearest of KEY_SCREENS by shape then size, `lockedPlace` in arcadeConsole.js) (owner, Nov 3, VERY SOON) **Background picker**: an interactive page (like the Look Book
  artifact) that shows every Arcade background as it really looks on the common screens: closed Fold, phone portrait and
  landscape, open Fold portrait and landscape, tablet, desktop. Each shows the real overlay (top bar, pills, strip, text, tiles)
  so you see what gets covered. Per picture and per screen you can DRAG to move it and PINCH or slide to zoom, then LOCK IN.
  You also give each picture a verdict (perfect / small tweak / needs an edit / remake) and a note. Choices are saved on the
  page; Claude reads them and writes them into the game as a placement table per picture and screen (zoom + position).
  The game uses the locked setting of the nearest screen (by shape and size) and falls back to automatic placement for
  anything not locked yet. Remakes and edits become the art to-do list.
- **H1** `[idea]` Game-show set on one engine: Price Is Right Plinko, Jeopardy!, Wheel of Fortune, Who Wants to Be a Millionaire?, Deal or No Deal.
  Owner, Nov 3: **Wheel of Fortune** and **Deal or No Deal** as exact look-alikes (set, music feel, board, host moments), a **Jeopardy!** look-alike trivia game (board of categories × values, Daily Doubles, Final Jeopardy wager) on our trivia bank; triage notes also want Hardcore Trivia → **Who Wants to Be a Millionaire** and Price Bid-Off → a full Price Is Right suite (Plinko, Cliff Hangers yodel guy, Big Wheel).
- **H22** `[idea]` (owner, Nov 3) **Words with Friends** clone (two players, 15x15 tile board, racks, word list built in for offline play) **with a twist**. Ideas to offer: words that name a character or show in the game score double and pop that character's head; special tiles that play a mini-minigame; a "Chardee" square that forces a dare; online play like the other board games.
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
- **H23** `[todo]` (owner, Nov 3) **Rummy** (card game: melds, sets/runs, discard pile; pass and play, vs CPU, online like the other card games).
- **H24** `[todo]` (owner, Nov 3) **Egyptian Rat Screw** (slap game: real-time slaps on doubles/sandwiches/etc., penalty burns, face-card
  challenges). Natural fit for two people on one phone: each player slaps their own half of the screen; online = clock-stamped
  slaps like Quick Draw (earliest slap wins). Over-the-top theme to pick (like Pro Mancala / Hangman).
- **H25** `[idea]` (owner, Nov 3, BIG, owner very excited) **Fighting game**: arcade fighter in the Street Fighter feel plus a brutal,
  over-the-top Mortal Kombat-style edge (gore, finishers, announcer). Our heads on full fighter bodies. BODY TYPES: a handful of
  fighter archetypes (e.g. ninja, brawler, grappler, speedster, heavy, magic user), each with its own moves and animations; every
  character is mapped to one type, so the whole roster can fight. Mobile first: move by dragging on the left side, 4 big buttons
  on the right (Punch, Kick, Block, Special); direction + button = special moves, a meter for supers, a finisher at the end.
  Must be actually fun: real combos, hit stop, juggles, chip damage, throws, a CPU that blocks and punishes, a ladder/arcade
  mode with a boss, 2P on one phone (each player owns half the screen), online later. Owner wanted real sprite bodies from the
  real games: we use our own bodies drawn in that style (see P11), owner-made art can drop in. Questions for the owner when we
  start: pixel art vs painted look, how gory, the archetype list, one-phone 2P layout, best-of-3 rounds, names.

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
- **P8** `[todo]` (owner, Nov 3) Transparent logos everywhere a property is shown (Army of Darkness, Always Sunny, Black Sabbath…): audit `brandHTML`/`logoURL` (assets.js) and the references' logo sources; where the online logo is poor or has a box behind it, download a clean transparent one into the repo (drop-in folder like `assets/logos/<source-key>.webp|svg`, embedded by build.mjs, preferred over the online one), list the ones still missing for the owner.
- **P6** `[todo]` Memorable unlock announcements: proper art and animation.
- **P7** `[todo]` General transitions, animations, sounds, menus.
- **P9** `[part]` (Nov 3: 365 of 725 characters have their real line in `src/data/characterQuotes.js`; the rest keep their old line until a real quote is checked: obscure/personal ones) (owner, Nov 3) Character quotes (`src/characterPhrases.js` PHRASES + `unlockPhrase` in the data packs) are mostly
  placeholders. Give every character their real, famous line: on the nose, what they actually say ("I'll be back.",
  "Groovy."). Doesn't need to be original or cute. Short catchphrases only.
- **P10** `[idea]` (owner, Nov 3) Character evolutions: different actors (ties to K8), old versions, transformations, and
  DE-evolutions (a character turned into a baby, a fetus, a cell...). Could be unlocks, outfits (K8-K12), Pokémon evolutions
  (PK2), board events or items. Ideas to offer the owner first.
- **P11** `[todo]` (owner, Nov 3) Real character sprites in games: replace the stick figures in lots of games with proper bodies
  wearing our heads. Mario and Sonic first ("want it to look real"), then Castlevania and others. We draw them in each game's
  own style (NES / Mega Drive pixel look) ourselves; the owner can edit them or draw their own into drop-in slots. Not ripped
  sprite sheets from the real games (same rule as "Make it like <classic game>" above).
- **P12** `[todo]` (owner, Nov 3) Sound effects and background music to match: Sonic, Mario, Castlevania and the rest. Sound-alike
  effects and music made in the real chips' style (NES pulse/triangle/noise, Mega Drive FM), our own tunes; the owner's
  drop-in music slots stay (see "Owner-supplied music/art").

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
