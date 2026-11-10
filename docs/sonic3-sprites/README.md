# Sonic 3 style game: drop-in sprites (technical page)

- Slots, sizes, anchors, face spots: `src/data/sonic3Sprites.js` (`SHEETS`, `PICTURES`, `headOf`, `frameRect`).
- Templates: `node tools/sonic3-templates.mjs` → `templates/<name>.png` (real size), `<name>@4x.png` (for Grok),
  `templates/rows/<sheet>.<row>@4x.png` (runner and ball, one row each).
- Brief for Grok: `GROK-SPRITE-BRIEF.md` (original designs: headless runner bodies that wear the player's face).
- Files go in `assets/sonic3/<name>.png|webp`; the build embeds them as `s3:<name>`.

Status (Nov 10): kit only. `render.js` still draws everything itself; the sprite path gets wired in when the first
sheets arrive (missing slots keep the drawn art).

## Importing (Claude)
1. Owner uploads to `art-inbox/sonic3/` (`<name>.png`, or single rows `<sheet>.<row>.png`).
2. Key out a flat #00FF00 background if there is one (as `green_out` in `tools/import-arcade-art.py`).
3. Grok does not keep exact grids: find each frame (connected blobs left to right), scale all frames of a sheet by ONE
   factor so the body height matches the template, and place each with its ground point on `foot`. Downscale with
   LANCZOS then snap alpha (or nearest-neighbour when the art is true pixel art at a whole multiple).
4. Stack rows in the order of `rows`; save lossless WebP in `assets/sonic3/`, originals in `assets/originals/sonic3/`.
5. Check the face circle is clear in every frame (`headOf`); build; `node tests/sonic3.mjs`.
