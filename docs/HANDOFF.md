# Handoff: where we left off (read this first in a fresh session)

Last updated Nov 2 2026, at the end of the boss-fight overhaul (released as v0.75.0). Written for the next Claude session,
which may run on a different account with none of the earlier conversation or memory. Everything needed is in the repo:
this file, `CLAUDE.md`, `docs/ROADMAP.md` (the owner's to-do list, phases, statuses) and `docs/AI_STATE.md` (technical
state, newest at the top).

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

The owner has not played v0.75.0 yet. **First ask how the boss fights felt** (parry/revive, Hard/Extreme difficulty,
explosions, comm talk, ambushes/bombs, themed ammo) and fix what they report before anything else.

Then, in the recommended order:

1. **Finish the boss polish** (roadmap K section; the engine is `src/engines/bossFight.js` + helpers):
   - **K24 partner-down cutscene** (owner's idea): when a co-op partner's plane goes down, a quick slow-mo zoom on the
     survivor's character with a sad face while the other plane explodes, a huge "NOOOOOOO!!!!", back to the fight.
     Hook: `hurt()` → `chat('down',…)` is already the moment; `bossBoom.js` has the explosion pieces.
   - **K16 power-ups + K15 better player ships** (`drawPlane`, pickups mid-fight: spread shot, shield, bomb...).
   - **K22 boss music**: build drop-in song slots per boss/phase (like the pinball songs), then ask the owner for tracks.
2. **Outfits (K8-K12, + the K7 reveal)**: group character versions (6 Bonds in `src/data/movieBonds.js`, Batmans,
   Supermans...) under one character with swipeable outfits; each outfit keeps its own id and unlock (old saves
   unchanged); each boss gets Medium/Hard/Extreme outfits unlocked by the tier ladder (`profile.bossTiers`) with
   drop-in art slots and a styled stand-in until the owner adds pictures.
3. **Phase A quick fixes**: A1 T-800 chase in 1P, A2 Color Card Dash "Too Early", A5 jittery heads on desktop
   character select, A6/A7 Hole.it (watermelons, finished objectives in the HUD), C3 (1P Arcade wins still recruit).
4. **Phase B minigame triage**: build the sheet of every game + modes for the owner to score Keep/Polish/Rebuild/Cut.

Bigger items waiting in the roadmap: Level IV + Frank + endings (E), New Game menu + checkpoints (C), menus revamp
(M), many new games (H), Hole.it / Bricks Quest level studies (G4/G5), online (I).

## What was done in this stretch (Nov 1-2)

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
