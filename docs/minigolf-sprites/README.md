# Sitabout Mini Golf art (drop-ins)

- Slots and sizes: `src/data/minigolfSprites.js` (PICTURES). Brief for GPT: `GPT-SPRITE-BRIEF.md`.
- Pictures go in `assets/minigolf/<slot>.png|webp` (lossless WebP preferred; keep originals in
  `assets/originals/minigolf/`). `tools/build.mjs` packs them as `minigolf:<slot>`; `src/pwa.js` downloads them the first
  time the game opens (LATER `minigolf:`), not at install.
- Every slot that is missing keeps the drawn art in `src/engines/minigolf/render.js` (textures, FALLBACK props).
- Templates: `node tools/minigolf-templates.mjs` → `templates/` (`--only=a,b`; `--standin <dir>` writes the drawn
  stand-ins as plain drop-ins to test the picture path).
- Tiles: `world` = course units one tile covers (the ball is 2 units across). Props: `w` = width in course units,
  `foot` = ground point in template px. Windmill: `door` must stay open, `windmill-blades` spins round `hub`.
  Clown head: `mouth` must stay open. Gopher: 3 frames (peek, half, up). Gator: 2 frames, head to the right.
