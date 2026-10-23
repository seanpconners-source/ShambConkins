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

Current release: [v0.62.0 on GitHub Releases](https://github.com/seanpconners-source/ShambConkins/releases/tag/v0.62.0) (three real pinball tables: Bucketheadland, Black Sabbath, King Gizzard). Download `ShambConkins_v0.62.0.html` from its release assets and open it in a phone browser; it runs fully offline. The bundled HTML (~80 MB) is too big for the git tree, so it is only a release asset. Pushing a version bump to `main` publishes the release automatically (`.github/workflows/release-build.yml`).

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
