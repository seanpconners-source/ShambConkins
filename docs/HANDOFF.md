# Handoff: where we left off (read this first in a fresh session)

Last updated Nov 3 2026 (late): v0.78.0 released (every menu in the console look). Read "START HERE" first. Written for the next Claude session,
which may run on a different account with none of the earlier conversation or memory. Everything needed is in the repo:
this file, `CLAUDE.md`, `docs/ROADMAP.md` (the owner's to-do list, phases, statuses) and `docs/AI_STATE.md` (technical
state, newest at the top).

## START HERE (Nov 3, late): v0.78.0 released (all menus in the console look); next = the roadmap

- Released v0.78.0 to main at the owner's request (owner: "merge to main, then I start a new session so you can continue
  the roadmap"). Menus done this round: Arcade round 2 (categories, View all, small phones, no Start/Back card from the
  Arcade's own Play buttons: `quick` in requestGame), Characters screen + New Game (src/menuScreens.js), Collection with
  character pages (src/collection.js), animated title tiles (ui.js `installHomeReels`), Art Kit
  https://claude.ai/artifact/Hn2v7kdpz45unnUsT3XNL2 (+ tools/import-arcade-art.py, docs/arcade-art/PROMPTS.md).
- Open owner questions: (1) **Online tile**: built = two phones with the picks and a pulsing signal. Alternatives offered:
  live room status ("Amber is in Pizza Night" when presence exists, N1), a slideshow of the online-playable games, or the
  last opponent's face. (2) Game art: the owner will generate pictures with the Art Kit; import them, then check the tiles.
- The owner may run `SOAK-TEST.cmd` on the laptop overnight instead; if soak-reports/ is shared, read LATEST.md first.
- Owner's SOON list (Nov 3): **M14** Arcade Favorites + Recent, **I13** real online high-score tables with names. Also new:
  H1 game shows (Wheel of Fortune, Deal or No Deal, Jeopardy! look-alikes), H16 Words with Friends with a twist, P8 transparent logos.
- Then the roadmap ("continue" = offer 2-4 options from ROADMAP.md, wait for a pick). Old open decisions are below.

## The daily rhythm (owner, Nov 3; roadmap W1)

The owner works in a daily cycle: **release in the morning → owner playtests during the day → evening: Claude asks ALL
its questions first thing, the owner answers → Claude works through the night → release in the morning.**
Triage sheet: ArtifactData `list` on https://claude.ai/artifact/4XLQDBkBkUJcQGvK2ST6w2, collection `verdicts` (Nov 3:
~56 filled, no Cuts; long notes on casino, Price Is Right, Millionaire trivia, Call of Duty dots, Battleship cutaways).

## How the owner works with you

- The owner (Sean) says **"continue"** (or "what's next?"). Then: read `docs/ROADMAP.md` and the "Next up" list below,
  offer **2-4 options with a recommendation**, and **wait for a pick**. Never start work unasked. Ask with real choices
  (buttons) when the app offers them.
- Mid-task the owner often sends more ideas: file them in `docs/ROADMAP.md` (right section, new ID, or the Inbox), say
  so in one line, and carry on with the current task.
- Keep reports short and plain (no jargon walls). Say what was tested and what was not.
- Music and art come from the owner: when a drop-in slot is ready, ask for it (list "Owner-supplied music/art to ask
  for" in the roadmap: boss music, Hangman western music, Castlevania, Mario, Sonic, boss outfit art).
- "Merge to TESTver" = the owner wants to playtest (they build with `BUILD-RELEASE.cmd` on TESTver).
  "Release to main" / "merge to main" = a release: bump the version, CHANGELOG + `docs/releases/vX.md`, merge to main;
  after the push, check the GitHub Actions release run is green and the site serves the new `/version`.
- "Make it like <classic game>": the feel and style of that game with our own levels/art/sounds, never copies of the
  original's maps, music or footage.

## Next up (offer these when the owner says "continue")

Nov 2 night: the owner went to bed and asked Claude to work through the roadmap on its own and leave the decisions for
the morning. Everything below is on branch `claude/v0.75.0-release-roadmap-so2z5g`, fast-forwarded into TESTver
(not main, no release). First ask how the night's `[verify]` items play, then the decisions below.

### Decisions waiting for the owner (ask these first)
1. **Triage sheet** (B1/B2): https://claude.ai/artifact/4XLQDBkBkUJcQGvK2ST6w2 — tap Keep/Polish/Rebuild/Cut per game
   (+ notes). Roadmap verdicts are pre-filled ("From roadmap"). Claude reads it with ArtifactData `list` on collection
   `verdicts` (doc id = game id; bosses `boss--<id>`). Cut games then leave the pool (B3).
2. **Menu direction** (M7): https://claude.ai/artifact/4h7fazkSTgh1oQxDQdpctE — A Console Home, B Marquee Shelves,
   C Card Deck (or a mix). Build M1-M6 in the picked style.
3. **Arcade unlocks** (C3): ANSWERED Nov 3: the owner wants Arcade wins to unlock characters (switched back on in v0.76.0).
4. **No run length** (C9, built): every run is a race to the finish; co-op now ends when both reach the end (it used
   to lap forever with "no turn limit"). OK?
5. **Boss music** (K22): the slots are ready; ask for songs: `boss-<boss id>.mp3` per boss, optional `-p2/-p3/-final`,
   a shared pool `boss-any-1.mp3`…, `boss-final.mp3`, `boss-win.mp3`, `boss-lose.mp3` (assets/music/README.md).
6. **Outfits** (K8-K12) need answers before building: (a) the groups found by name are Batman (9 actors), Superman (9),
   James Bond (7 incl. GoldenEye 64); any others to group (Doctors, Jokers, Links…)? (b) which outfit is the
   character's default face on the board? (c) boss tier outfit names: Claude proposes names like "Turbo Kandy" per
   boss for the owner to edit, or the owner names them? (d) art: styled stand-ins until the owner draws them, OK?
7. **Bomber look** (D5): controls are rebuilt; the arena still looks like before. Want the full SNES Super Bomberman
   look (stage themes, bomb-kick/punch power-ups, Louie mounts) or just the controls?
8. **TowerFall** (D7, not started): what was confusing: the controls (drag run / flick jump / tap shoot), not knowing
   what is going on (tiny archers, arrows), or the rules? Claude's guess: on-screen JUMP/SHOOT pads + aim arrow, bigger
   archers, a 3-second "how to play" at round one, and treasure chests with power arrows like the real game.
9. **Pac-Maze** (D6, built): ghosts are now arcade-smart and as fast as the arcade's (75% of yours, was 50%). Too hard?
   The chompers are still your heads (no yellow Pac-Man); say if you want a Pac body under the head.
10. **Frank** (E2/E3, built): the card odds are unchanged (20% per Chance card in Level III once both cleared Body).
   A run without Frank still ends at the Level III boss, now with the deliberately cheap fake ending.
11. **Endings** (E10-E13, built in `src/endings.js`): the fake ending (NES "CONGRATULATION. THIS STORY IS HAPPY END.",
   a credits roll that gives up, Frank's empty chair) and the true one (dawn, lore, credits from your run, THE END).
   The made-up lore is 12 template lines (`LORE`): want to write your own lines, or have them per character/show?
12. **Checkpoints** (C8/E4, built): New Game shows START AT once you've reached Level II+; later starts begin with an
   empty bag. (The checkpoint counts from now on; to try it at once, reach a level in a normal run.) OK as a plain select
   until the New Game menu (C7) is redesigned?
13. **Level IV content** (E6/E8): already there: 9 horror landmarks in Level IV (Camp Crystal Lake, Elm Street,
   Haddonfield, the Jigsaw warehouse…) and Michael Myers, Jason, Freddy, Leatherface, Chucky, Pinhead, Jigsaw,
   Ghostface unlock there. Some horror landmarks (Evil Dead cabin, Cabin in the Woods) sit in Levels II/III: move them?

**Owner, Nov 3 (released v0.76.0 to play that night):** new roadmap notes N1 (friends online / invite when free), N2
(new characters list), N3 (personal install unlocks, tabled), Q0: REMIND the owner about running soak tests whenever
Claude isn't actively working on the game (and run them).

### Then, in the recommended order
1. Rebuilds from the triage (D), highest-dealt first; D6 Pac-Man and D7 TowerFall are next in the old list.
2. Menus revamp in the picked direction (M1-M6).
3. Outfits once 6 is answered (K8-K12).
4. G9 pinball physics feel (owner: ball drags slowly along surfaces): needs the owner's ears/eyes on a phone.
Bigger items waiting: Level IV + Frank + endings (E), New Game menu + checkpoints (C7/C8), new games (H), Hole.it /
Bricks Quest level studies (G4/G5), online (I).

## What was done in the Nov 2 night stretch (all `[verify]`)

K24 partner-down cutscene (slow motion, push-in, crying head, NOOOOOO!!!!) · K16 power-ups (spread, turbo, missiles,
shield, smart bomb, heart) · K15 new player ships · K22 boss music slots · A1 T-800 chase (and Breakout) 1P speed bug ·
A2 Color Card Dash "Too Early" · A5 smoother character-select heads · A6 Hole.it props that fit really drop · A7 finished
goals leave the Hole.it HUD · C3 arcade practice · C9 no run length · G10 King Gizzard stuck balls · D5 Bomber controls ·
B1 triage sheet · M7 menu mockups · D6 Pac-Maze classic ghosts/maze/sounds · E2/E3 Frank's fake-out into Level IV
(`src/frankFx.js`) · B3 cut-games list (`src/data/cutGames.js`, empty until the sheet is filled) · E10-E13 endings (`src/endings.js`, tests/endings.mjs) · C8/E4 checkpoints (tests/checkpoint.mjs) · E5 darker Level IV board (rust, blood, chains, hooks, fire). Full suite after it all: test:core EXIT 0, 156/156
games ran clean; board/setup tests re-run green on the final build · regression tests
(tests/holeit-fit.mjs in test:core, King Gizzard park check in pinball-sim, tests/frank.mjs). Online checked with a local `wrangler dev` (it works in the cloud box via npx):
bomber-duel and a boss fight pass with and without LAG=80-150; power-ups appear the same on both phones.

## What was done in the Nov 1-2 stretch

Roadmap created; boss fights overhauled (all in v0.75.0, details in `docs/AI_STATE.md`):
K1 parry/revive on touch-down · K2 difficulty tiers Easy/Medium/Hard/Extreme (`BOSS_TIERS` in `src/data/bosses.js`) ·
K3 board level sets the tier, warps use the level entered from, online passes it · cut-out boss heads with moods ·
K5-K7 Boss Select ladder (`profile.bossTiers`, tier picker, medals, gold frame) · K20 tiered KO explosions + phase looks
(`src/engines/bossBoom.js`) · K21 Star Fox comm talk (`src/engines/bossComms.js`, lines in `src/data/bossTalk.js`) ·
K17-K19 ambushes, bombs, carpet runs, themed ammo.

## Working on the owner's Windows laptop

- Node 24: `C:\Program Files\nodejs` (not on PATH: `$env:Path="C:\Program Files\nodejs;$env:Path"`).
- Git: GitHub Desktop's bundled git, e.g. `C:\Users\Laptop\AppData\Local\GitHubDesktop\app-<ver>\resources\app\git\cmd\git.exe`.
  It can fetch but **cannot push** (no credentials): commit locally, then ask the owner to push in GitHub Desktop
  (every branch you changed: the work branch, TESTver, main).
- PowerShell 5.1: no `&&`; `Remove-Item` on variable paths may be blocked (write to new folders instead).
- Browser tests: build the installable app (`node tools/build.mjs --pwa <scratch>\pwa`), serve it with
  `node tools/serve-static.mjs <dir> 8123`, and run tests with `SHAMB_URL=http://localhost:8123/`. Loading the
  346 MB one-file build in headless Chromium is very slow here.
- Test helpers: `page.evaluate(() => { window.ShambConkins.requestGame({...}); })` — keep the braces: requestGame's
  promise only settles when the game ends, so returning it hangs the test.
- Boss tests: `tests/boss.mjs`, `tests/bossdiff.mjs` (DIFF=0,1,2,3), `tests/boss-parry.mjs`, `tests/boss-ladder.mjs`,
  `tests/boss-comms.mjs`, `tests/boss-attacks.mjs` (all take SHAMB_URL; screenshots go to local-test-reports/).
- Online tests need `wrangler dev` (not installed on this laptop); online changes there are untested.
