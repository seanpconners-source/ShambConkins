# ShambConkins

A single-file, offline browser party/board game. This repo holds the **source**; the
shippable game is generated.

```
node tools/build.mjs            # -> dist/ShambConkins.html (open in any browser)
```

Layout: `src/` (132 CommonJS-style modules, `modules.json` = load order), `src/styles.css`,
`src/index.template.html`, `assets/` (images; referenced in code as `@@asset:assets/x.svg@@`
and inlined at build time). No dependencies.

The first commit is a lossless split of the v0.43.1 file: building it reproduces the
original HTML byte-for-byte (SHA-256 `3f712823…f076`).

## Workflow
- `npm run build` – build `dist/ShambConkins.html`
- `npm run release` – write the shareable file to `releases/` (committed, so it can be downloaded without Node)
- `npm test` – smoke test + fuzz every mini-game for JS errors (needs Playwright + Chromium)
- `tests/bot.mjs` – plays a whole board game with a random bot; `tests/load.mjs` loads modules in plain Node for unit tests
- Bump the version in `src/version.js` and `package.json`

Current play-through: open `releases/ShambConkins_v0.44.0.html` in a browser.
