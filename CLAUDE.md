# ShambConkins — Claude guide

Offline, single-file HTML party board game for two people sharing one phone (Sean & Amber).
Mario Party structure, Chardee MacDennis levels (Mind / Body / Spirit / secret Horror), ~120 minigames,
650+ unlockable characters, pop-culture references everywhere (see docs/REFERENCE_LIST.md).

@docs/AI_STATE.md

## Architecture
- `src/` holds plain browser JS modules in a tiny CommonJS style: `require("src/x.js")` and
  `Object.assign(exports,{...})`. No ES modules, no npm packages at runtime, no network required.
- Every module must be listed in `src/modules.json` (`node tools/add-module.mjs <path>` adds one;
  `node tools/check-modules.mjs` verifies). Entry point is `src/app.js` (game flow, turns, landing, events).
- The game ships ONLY as the installable app (owner, Nov 6: install only, from the same web address; a one-file HTML
  can't grow past ~500 MB and lots more art/sound is coming). `tools/build.mjs` builds `src/` + `src/styles.css` +
  `src/index.template.html` + `assets/` into `dist/pwa/` (`--pwa <dir>` elsewhere): a small index.html + `a/<hash>.<ext>`
  files (USER_PORTRAITS values are file names, not data URIs: test raster art with `isRasterArt`, read bytes with
  `assetBytes`, both in `src/data/userPortraits.js`; docs/PWA_SPLIT_DELIVERY.md). `--single` still writes the old
  one-file `dist/ShambConkins.html` for odd jobs; never release it. A game's own big art/sounds get a `LATER` line in
  `src/pwa.js` (downloaded the first time that game opens, not at install). Drop-in art: `assets/portraits/<characterId>[.<mood>].webp|png`,
  `assets/items/<id>.*`, `assets/locations/<id>.*`, Photo Hunt pairs `assets/photohunt/` (`tools/photohunt.py`, see its README), pinball table art `assets/pinball/<table>/<slot>.*` (slots in `src/engines/pinball/README.md`); shrink big images with `python3 tools/optimize-art.py`.
- Key systems: `ui.js` (screens, board SVG, HUD), `multiPathBoard.js` + `boardZones.js` + `biomes.js`
  (generation-7 journey map), `boardCamera.js` (camera/zoom), `gameRegistry.js` + `gameLauncher.js`
  (minigame pool, selection, results/rewards/unlocks), `engines/` (minigame engines, `session.js` = the `s` API),
  `packs/` (newer game packs, loaded lazily), `levels.js`/`levelCard.js` (levels & title cards),
  `warpBoards.js`/`warpFx.js` (warp zones), `bossGate.js` + `data/bosses.js` + `engines/boss*.js` (bosses),
  `contentPolicy.js` (builds the active catalog of characters/items/trivia), `profile.js` (unlock rules, saves),
  `persistence.js` (`validRun` save validation), `audio.js`/`music.js` (WebAudio) + `musicGen.js` (generative board score).
- Writing a minigame: read `docs/ENGINE_GUIDE.md` first.
- Art made with ChatGPT: `docs/art-for-gpt/START-HERE.md` (areas, rules, to-do lists via `node tools/gpt-art-todo.mjs`);
  the owner uploads finished pictures to `art-inbox/<area>/`, Claude imports them (steps at the end of that file).
- Arcade backgrounds (key art): the owner places each one per screen in the Background Picker artifact (see the rule below).

## Commands
- Build: `node tools/build.mjs` (→ dist/pwa; `--pwa /tmp/x` for a private build). Play it: `node tools/serve-static.mjs dist/pwa 8123`.
- Full test: `npm test` (module check, build, 300-board structure test, unlock audit, smoke, route chooser,
  fuzz of every minigame). Must end `EXIT 0` / "N/N games ran clean".
- Focused tests (Playwright, headless Chromium at /opt/pw-browsers/chromium-1194/chrome-linux/chrome,
  module at /node-tools/node_modules): `tests/bossgate.mjs`, `tests/warpflow.mjs`, `tests/warp.mjs`,
  `tests/levels.mjs`, `tests/boss.mjs`, `tests/photohunt.mjs`, `tests/sotn-music.mjs`, `tests/controls-audit.mjs`, `tests/music.mjs`, `tests/pwa.mjs`, `tests/online.mjs` + `tests/online-board.mjs` (need `wrangler dev`, see cloudflare/README.md), `node tests/games.mjs 5 3 <id-regex>`.
  Tests open the game through `appURL()` (tests/lib.mjs): they serve dist/pwa on a free port themselves; `SHAMB_URL` = an
  already served copy (e.g. a private `--pwa` build behind serve-static), `SHAMB_FILE` = a `--single` file.
- Release: bump `src/version.js` (VERSION + the RELEASED month shown in About) + `package.json` (`version` AND the folder
  name in the `release` script: the release workflow checks it and publishes nothing if they disagree), `npm run release` → `releases/ShambConkins_vX_pwa/`, add a CHANGELOG entry
  (+ optional `docs/releases/vX.md` notes); pushing the bump to main makes `release-build.yml` put the app's files on the
  website Worker and publish the GitHub Release (app zip + index.html/sw.js/manifest/icons; no one-file .html since v0.88.0).
  Owner's Windows one-click `BUILD-RELEASE.cmd` builds the checked-out branch into `releases/ShambConkins_vX[_TestVer|_<branch>]_app/`
  (never overwrites: adds `_built-<timestamp>`; gitignored) and plays it at http://localhost:8123/. Built games are never git blobs.

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
- EVERY new or replaced Arcade background (`assets/keyart/<slot>`) goes through the Background Picker before it ships
  (owner, Nov 4: "all new backgrounds need to go through the picker"): faces box → measure → assemble → publish to the same
  picker URL → owner locks every screen → `apply.py` → release. Steps in `tools/bg-picker/README.md`. Don't hand-tune placement.
- Use seeded randomness (`s.random()`, `runRandom(run)`) for anything that must be fair or reproducible.
- Online board game (`src/netBoard.js`): the host phone runs the run, the guest mirrors it. Board dialogs must go through
  `showDialog`/`showRoutePanel` (add `player:i` when a dialog belongs to someone other than the current player,
  `local:true` for this phone's own menus); a new board visual calls `fx('name',...)` (`src/netHooks.js`) and gets a
  handler in `FX` in netBoard.js; interactive overlays other than dialogs (like the Pokémon Game Boy) run through `netTask`.
- Character photos are looked up online at runtime (Wikipedia page in the character's `actor` field);
  offline they fall back to an emoji placeholder. Don't add copyrighted melodies (music uses public-domain tunes).
- Git: develop on the session's designated branch, commit with clear messages, push; never force-push,
  reset, or discard the owner's work without explicit permission. The owner sometimes pushes art directly:
  `git pull --rebase` before pushing if rejected. `TESTver` is the integration branch the owner playtests: when asked to
  merge there, merge/fast-forward and push normally (no force). `main` = releases, only with the owner's approval.
- GitHub Actions: test workflows are manual-only (`workflow_dispatch`) after a costly CI storm; don't add push/PR
  triggers. The only automatic one copies portraits uploaded to `main` into TESTver (`portrait-main-to-testver.yml`).

## How to work here
- Fresh session (or new account): read `docs/HANDOFF.md` first: how the owner works, where we left off, "Next up",
  and the Windows laptop setup (node/git paths, no git push, testing via the --pwa build + tools/serve-static.mjs).
- Roadmap: `docs/ROADMAP.md` (owner's to-do list, sorted into phases). When the owner says "continue" or asks what's
  next, read it and offer 2-4 options from the current phase with a recommendation; start only after they pick.
  New notes from the owner go in its Inbox or their section with a new ID; mark finished items `[verify]`.
- Start a task from this file, `docs/AI_STATE.md`, `git status`/`git log`, and only the source files the task touches.
  Don't reread the whole repo; long files have very long lines, so grep/cut instead of dumping them.
- Test only what the change touches: a build, the focused test for that game/system (or
  `node tests/games.mjs 5 3 <id-regex>`), and Playwright screenshots for UI (phone 390x780, desktop 1100x700).
  Run the full `npm test` (~45 min) only when a change hits shared code (`session.js`, `gameRegistry.js`, `gameLauncher.js`,
  `app.js`, `ui.js`, `profile.js`/`persistence.js`, build tools) or before a release; not for every push or TESTver merge.
- `AGENTS.md` and the `docs/CODEX_*`/`CHATGPT_*`/`DEVELOPMENT_TASKS.md` files are for GPT/Codex workers only; Claude ignores
  their validation rituals and report formats. Keep reports to the owner short and plain.
- After a meaningful task, update `docs/AI_STATE.md` (replace stale lines, keep it short; no transcripts).
- When a coherent chunk of work is done, tell the owner it's a good point for a fresh session;
  stay in the session while actively debugging.
