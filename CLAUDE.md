# ShambConkins — Claude guide

> **GitHub Actions cost guard (2026-10-11):** Full development and Broforce validation workflows are manual-only on current integration branches after an excessive CI run storm. Do not re-enable push/PR-wide jobs or work from obsolete worker branches with old triggers. Use local tests first; manual Broforce workflow is available from GitHub Actions on `feature/broforce-wave4-candidate` once runners work. See `AGENTS.md` for details.


Offline, single-file HTML party board game for two people sharing one phone (Sean & Amber).
Mario Party structure, Chardee MacDennis levels (Mind / Body / Spirit / secret Horror), ~120 minigames,
650+ unlockable characters, pop-culture references everywhere (see docs/REFERENCE_LIST.md).

@docs/AI_STATE.md

## Architecture
- `src/` holds plain browser JS modules in a tiny CommonJS style: `require("src/x.js")` and
  `Object.assign(exports,{...})`. No ES modules, no npm packages at runtime, no network required.
- Every module must be listed in `src/modules.json` (`node tools/add-module.mjs <path>` adds one;
  `node tools/check-modules.mjs` verifies). Entry point is `src/app.js` (game flow, turns, landing, events).
- `tools/build.mjs` inlines `src/` + `src/styles.css` + `src/index.template.html` + `assets/` into
  `dist/ShambConkins.html` (~30 MB). Drop-in art: `assets/portraits/<characterId>[.<mood>].webp|png`,
  `assets/items/<id>.*`, `assets/locations/<id>.*`, Photo Hunt pairs `assets/photohunt/` (`tools/photohunt.py`, see its README); shrink big images with `python3 tools/optimize-art.py`.
- Key systems: `ui.js` (screens, board SVG, HUD), `multiPathBoard.js` + `boardZones.js` + `biomes.js`
  (generation-7 journey map), `boardCamera.js` (camera/zoom), `gameRegistry.js` + `gameLauncher.js`
  (minigame pool, selection, results/rewards/unlocks), `engines/` (minigame engines, `session.js` = the `s` API),
  `packs/` (newer game packs, loaded lazily), `levels.js`/`levelCard.js` (levels & title cards),
  `warpBoards.js`/`warpFx.js` (warp zones), `bossGate.js` + `data/bosses.js` + `engines/boss*.js` (bosses),
  `contentPolicy.js` (builds the active catalog of characters/items/trivia), `profile.js` (unlock rules, saves),
  `persistence.js` (`validRun` save validation), `audio.js`/`music.js` (WebAudio) + `musicGen.js` (generative board score).
- Writing a minigame: read `docs/ENGINE_GUIDE.md` first.

## Commands
- Build: `node tools/build.mjs` (or `--out /tmp/x.html` for a private build).
- Full test: `npm test` (module check, build, 300-board structure test, unlock audit, smoke, route chooser,
  fuzz of every minigame). Must end `EXIT 0` / "N/N games ran clean".
- Focused tests (Playwright, headless Chromium at /opt/pw-browsers/chromium-1194/chrome-linux/chrome,
  module at /node-tools/node_modules): `tests/bossgate.mjs`, `tests/warpflow.mjs`, `tests/warp.mjs`,
  `tests/levels.mjs`, `tests/boss.mjs`, `tests/photohunt.mjs`, `tests/controls-audit.mjs`, `tests/music.mjs`, `SHAMB_FILE=... node tests/games.mjs 5 3 <id-regex>`.
- Release: bump `src/version.js` + `package.json`, `npm run release` → `releases/ShambConkins_vX.html`, add a CHANGELOG entry. Large generated HTML (v0.58.3 is 130 MB) is a GitHub Release asset, NOT a git blob; maintain tested production build and keep source/artwork unchanged.

## Rules (don't break these)
- Old saves must keep loading: never rename character/location/game ids; add fields defensively;
  new `run.pending.kind` values must be added to `validRun` in `persistence.js`.
- Pack files in `src/packs/` must stay light: lazy-require engines (`const lazy=(f,n)=>s=>require(f)[n](s)`),
  otherwise a circular import (gameRegistry → packs → engines → … → references → gameRegistry) blanks the page.
- Every game/character/location must reference a real movie / show / game / band (or the personal universe).
- Touch first: two people on one phone. Prefer swipe/drag/tap on the canvas over on-screen button bars.
- Every new game is full screen: call `fullBleed(s)` (`src/engines/fullBleed.js`) right after `s.canvas(...,{fill:true})`.
  Canvas fills the screen, Pause/Exit float top-right, a small ⤢ full-screen toggle sits bottom-centre, touch buttons are
  drawn floating on the canvas, and the game's HUD keeps clear of the top-right pills (`fullBleed` returns `{top}`).
- Use seeded randomness (`s.random()`, `runRandom(run)`) for anything that must be fair or reproducible.
- Character photos are looked up online at runtime (Wikipedia page in the character's `actor` field);
  offline they fall back to an emoji placeholder. Don't add copyrighted melodies (music uses public-domain tunes).
- Git: develop on the session's designated branch, commit with clear messages, push; never force-push,
  reset, or discard the owner's work without explicit permission. The owner sometimes pushes art directly:
  `git pull --rebase` before pushing if rejected.

## How to work here
- Start a task from this file, `docs/AI_STATE.md`, `git status`/`git log`, and only the source files the task touches.
  Don't reread the whole repo; long files have very long lines, so grep/cut instead of dumping them.
- Verify UI/game changes with a build plus a Playwright screenshot (phone 390x780 and desktop 1100x700).
- After a meaningful task, update `docs/AI_STATE.md` (replace stale lines, keep it short; no transcripts).
- When a coherent chunk of work is done, tell the owner it's a good point for a fresh session;
  stay in the session while actively debugging.
