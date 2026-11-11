# Sonic 3 style game: drop-in sprites (technical page)

- Slots, sizes, anchors, face spots: `src/data/sonic3Sprites.js` (`SHEETS`, `PICTURES`, `headOf`, `frameRect`).
- Templates: `node tools/sonic3-templates.mjs` → `templates/<name>.png` (real size), `<name>@4x.png` (for Grok),
  `templates/rows/<sheet>.<row>@4x.png` (runner and ball, one row each).
- Brief for Grok: `GROK-SPRITE-BRIEF.md` (our own designs: a blue-purple hedgehog and a red-orange three-tailed fox, headless bodies that wear the player's face; step 1 = one approved test picture each, then rows).
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

## Importing GPT's whole-sheet atlases (Nov 11)
GPT delivers one big picture per area (labels on the left or above each item, flat #00FF00 background), not one file
per slot. Two importers:
- Characters: `python3 tools/sonic3/import-sheet.py <picture> runner-p1|runner-p2 --x0 <label end> --neck0 x,y --ball ball-pN`
  (finds rows/poses, one scale, feet or neck anchor, face spots → `src/data/sonic3Heads.js`); head pieces:
  `python3 tools/sonic3/import-piece.py <picture> quills-p1|ears-p2 --hole <px>`.
- Everything else: `python3 tools/sonic3/import-atlas.py <folder with the 8 atlases> [--only slot,slot] [--preview dir]`.
  The table at the top of the script gives each row's y band, label end x and pose count (read off the atlas), and
  each picture's crop box. Sheets get one scale (`ref` = game px height of the first pose); pictures are trimmed and
  scaled to a width or height; tiles lose their dark border. The logo goes to `assets/keyart/sonic-logo.webp`.
  Background key: pure green only (r<48, b<48, g>150): the art's own greens carry red, so leaves survive.
- The goal sign: only GPT's blank face-on frame is used (its spinning frames showed a copyrighted hedgehog face); the
  game turns the blank sign and draws the winner's face on it.
