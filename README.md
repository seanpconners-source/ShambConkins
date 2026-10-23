# ShambConkins

A single-file, offline browser party/board game. This repo holds the **source**; the
shippable game is generated.

```
node tools/build.mjs            # -> dist/ShambConkins.html (open in any browser)
```

Layout: `src/` (~380 CommonJS-style modules, `modules.json` = load order), `src/styles.css`,
`src/index.template.html`, `assets/` (images; referenced in code as `@@asset:assets/x.svg@@`
and inlined at build time). No dependencies.

The first commit is a lossless split of the v0.43.1 file: building it reproduces the
original HTML byte-for-byte (SHA-256 `3f712823…f076`).

## Workflow
- `npm run build` – build `dist/ShambConkins.html`
- `npm run release` – write the shareable file to `releases/` (git-ignored; it is uploaded as a GitHub Release asset)
- `npm test` – smoke test + fuzz every mini-game for JS errors (needs Playwright + Chromium)
- `tests/bot.mjs` – plays a whole board game with a random bot; `tests/load.mjs` loads modules in plain Node for unit tests
- Bump the version in `src/version.js` and `package.json`

Current release: [v0.64.0 on GitHub Releases](https://github.com/seanpconners-source/ShambConkins/releases/tag/v0.64.0) (online duels on two phones, loading screen, full-screen installable app, three real pinball tables, backup/restore). Play it at **https://shambconkins.loki-mylo.work** (always the newest release; install it from Chrome's menu), or download `ShambConkins_v0.64.0.html` from the release assets and open it in a phone browser; it runs fully offline. `ShambConkins_v0.64.0_pwa.zip` is the installable-app folder for your own server (see *Install as an app* below). The bundled HTML (~84 MB) is too big for the git tree, so it is only a release asset. Pushing a version bump to `main` publishes the release automatically (`.github/workflows/release-build.yml`); the website (`cloudflare/`) picks it up within ~5 minutes.

## Install as an app (PWA)
The game can be installed to the home screen and run full screen like an app, but only when it is opened from a web
address (`http://localhost:...` from a local server app, or any `https://` site), not as a file from Downloads.
- **Best:** serve the app folder. `npm run release` (or `node tools/build.mjs --pwa`) writes it next to the HTML, and each
  GitHub Release has it as `ShambConkins_vX_pwa.zip`: unzip it and point the server at the folder (`index.html`,
  `manifest.webmanifest`, `sw.js`, `icons/`). Installed this way it also works offline (the service worker caches the
  game) and updates itself when a new folder is served.
- **Just the HTML on a server** also installs in Chrome (the game carries its own manifest and icons), but needs the
  server running to open.
- The installed app opens full screen by itself. If its home-screen icon carries a small Chrome badge, Chrome made a
  shortcut instead of a real app: usually the site only serves the HTML (Google's servers must be able to download
  `manifest.webmanifest` and the icons). Serve the whole folder, remove the shortcut and install again.
- To install: tap the ⬇ button on the title screen when the browser offers it, or Settings → *Play as an app* → Install,
  or the browser menu (Chrome: *Install app*; Samsung Internet: *Add page to → Home screen*; iPhone/iPad Safari: *Share →
  Add to Home Screen*). The app keeps the same save as the browser page at that address.

## Online play (two phones)
Arcade → **🌐 Online** → type a room name; the other phone types the same name and joins as player 2. Either player taps
**Challenge** on a game; when the other accepts, both phones play that game's 1P version from the same start at the same
time, see each other's live score, and the higher score wins (unlocks go to the winner's own phone). Games whose 1P mode
ends in a score are online so far (~55: pinball, Broforce, Mario, Hole.it, DOOM, arcade remakes...); CPU-opponent games
(trivia, chess, Pong...) say "Not online yet". Needs the internet and the website's room service (`cloudflare/`).

## Saves
Progress lives in the browser, separately per browser and per address the file is opened from (a new file location or
another browser starts empty). Back up from the title screen (💾 button, or Settings → Export backup) and restore with
"Restore a backup" / Settings → Import backup.

## Adding art without touching code
Drop files in these folders and run `npm run release` (or `npm run build`):

| Folder | File name | Becomes |
|---|---|---|
| `assets/portraits/` | `<character-id>.webp` or `<id>.<mood>.webp` | that character's head (moods: normal win silly angry sad think walk) |
| `assets/items/` | `<item-id>.svg/.webp/.png` | that item's picture (beats generated cards and online photos) |
| `assets/locations/` | `<location-id>.svg/.webp/.png` | that location's picture |

`node tools/list-characters.mjs`, `node tools/list-items.mjs` and `node tools/list-items.mjs locations` print
every id (and which characters still lack a bundled portrait).

To turn ordinary photos into matching head cutouts:

```
pip install "opencv-python-headless<5" numpy
python tools/headcrop.py photo.jpg --id chuck-norris
python tools/headcrop.py a.jpg b.jpg --id beatles-john beatles-paul --show   # --show writes a preview PNG
```
It detects the face, removes the background (GrabCut) and writes a transparent WebP into `assets/portraits/`.
Frontal, well-lit photos work best; check the result before building.

## Tests
`npm test` builds the game, validates 300 generated boards, checks that every character has a working unlock
path, loads the game in headless Chromium, exercises the route chooser, and fuzzes every minigame for errors.
`node tests/bot.mjs 40` plays whole games with a random bot. `node tests/play.mjs <game-id>` plays one game
with scripted input and saves screenshots.
