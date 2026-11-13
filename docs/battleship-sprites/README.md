# Battleship: drop-in art

Every slot is optional: a missing picture keeps the game's drawn art. Slots, sizes and anchors live in
`src/data/battleshipSprites.js`; the board reads them in `src/engines/partyBattleship.js` (drawShip, drawFire, drawMiss,
drawGrid, boom/splash anims, the room background) and the cut scenes in `src/engines/battleshipCuts.js` (sky, warship,
sailor, deck, deck gun, torpedo, cap, boom/splash anims). Brief for ChatGPT: `GPT-SPRITE-BRIEF.md`.

## Templates
`node tools/battleship-templates.mjs` → `templates/<name>.png` (real size) + `<name>@2x.png`. The faint guide in each is the
game's own drawing (the tool reads drawShip/drawFire/drawMiss/drawGrid from the top of partyBattleship.js and warship/sailor
from battleshipCuts.js, so keep those self-contained).

`node tools/battleship-templates.mjs --standin <dir>` writes every slot as the drawn art (no marks). Copied into
`assets/battleship/` and built, the board and both cut scenes looked the same as the drawn game (Nov 13; checked with a copy
of tests/battleship-cuts.mjs taking screenshots, and games.mjs). Don't commit stand-ins.

## Slots
- **ship-battleship / -cruiser / -submarine / -destroyer / -patrol** (len x 96 by 96, bow right; the game rotates for
  vertical ships, tints green/red while placing) + optional **-sunk** wrecks (else tinted dark red).
- **hit** sheet 4 frames 96 (8 fps, phase per cell), **miss** 96, **grid-sea** 768 (the whole 8x8 water; lines, labels and
  fainter wave lines drawn on top), **board-bg** 1080x1920 / **board-bg-wide** 1920x1080 (CSS cover on the game's root, with a
  25% dark veil; landscape uses -wide when present).
- **boom** 8 x 128, **splash** 6 x 128, played at 16 fps over the board (hit 1.8 cells, sunk 3 cells, miss 1.6 cells) and in
  the cut scenes; the drawn sparks/rings still play too.
- **cut-sky** 1600x1000 (cover-fitted above the horizon at 64% of the screen, bottom aligned), **warship** 1280x480 (water
  point 640,380, L 1200 px = the drawn hull length; tilts/sinks with the scene; flames drawn on top), **deck** 800x400 (cover
  over the bottom-left deck area), **deck-gun** 440x72 (pivot 0,36, length = 1.1 sailor sizes, recoils), **torpedo** 224x64
  (drawn 56 px wide), **sailor-cap** 128x56 (0.6 sailor sizes wide, on the brow).
- **sailor** frames 120x160, U = 100 px per sailor size, head (60,50) 80 across = the game's .8 x size face; rows stand
  (gunner), cheer (after the hit), fall (jumping off), swim (in the water); 4 fps (swim 6).

## Importing
1. Owner uploads to `art-inbox/battleship/` (or chat). Check each picture against its template size/proportions.
2. Green background → key it out (tight key, see the Seanic notes in AI_STATE).
3. Save lossless WebP (or PNG) as `assets/battleship/<name>.webp`; keep the delivered original in `assets/originals/battleship/`.
4. Build, run `tests/battleship-cuts.mjs` + `node tests/games.mjs 5 3 battleship`, screenshot 390x780 + 844x390.
   `battleship:` pictures are fetched the first time the game opens (pwa.js LATER).
