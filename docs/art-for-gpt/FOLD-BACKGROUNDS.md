# Fold-size backgrounds (paste this to GPT)

Every game backdrop now comes in THREE shapes. You already made two of them for these games; please make the third:

| Shape | Size | Used on |
|---|---|---|
| TALL | 1080 x 1920 | phones held upright |
| WIDE | 1920 x 1080 | 16:9 screens, phones sideways, tablets, PCs |
| **FOLD** | **1504 x 1670** | near-square screens: Sean's Galaxy Fold opened (752 x 835), and the Fold turned sideways |

**From now on, whenever you make a background for any ShambConkins game, make all three (TALL, WIDE, FOLD) unless the brief
says otherwise.** Name the FOLD one like the others with `-fold` (e.g. `bg-fold.png`, `table-fold.png`, `<world>-fold.png`).

## How to make a FOLD picture
- It is the SAME scene as the game's TALL and WIDE pictures (same place, same objects, same colours, same lighting, same
  painting style): a new framing of it, not a new design. Open the references in `references/<game>/` and match them.
- Exactly **1504 x 1670 px**, PNG, no transparency, no text, no logos, no UI, no template marks.
- The whole picture shows on the Fold held upright. When the Fold is turned sideways only the middle band shows (the dashed
  lines on the template, about 1504 x 1355). Keep anything important inside that band.
- The game draws its own board/grid/toy/bars over the middle (see "What the game draws on top" in the list). Keep the
  middle calm and fairly plain; put the interesting detail toward the edges and corners. Fill the picture edge to edge.
- Same rules as before: our own designs, no real logos or brand marks, no copyrighted characters.

## Hand back
Upload the finished PNGs to Drive with an UPLOADS-GPT note and a manifest (file, size, bytes, SHA256) as usual. Files under
80 KB go in an identically named ZIP. Claude imports them losslessly to the `import_to` path in `list.json`.

## Not part of this
Full-scene sprite games (Sean of a Gun, Seanic, Symphony of the Night, Sundown Showdown, pinball tables) build their scenes
from layers, not one backdrop: no FOLD version needed there. Arcade key art (the Arcade menu backgrounds) goes through the
Background Picker as before.

## For Claude
- Code: `src/bgShape.js` (`shape(W,H)`: tall < .78 <= fold <= 1.3 < wide; `pick(W,H,{tall,wide,fold},get)` falls back to
  the nearest shape). Games using it: Sqwordle (`bg-fold`, `bg-fold-dark`), Simon (`bg-fold`), Battleship (`board-bg-fold`),
  Strands & Ladders (`table-fold`), Tapper (`bg-<level>-fold`), Crappy Crush (`<world>-fold`, also `<world>-wide`), Plinko /
  Big Wheel (`stage-plinko-fold`, `stage-wheel-fold`). A new game with backdrop pictures should use `pick` and list all three.
- Kit: `python3 tools/fold-bg-kit.py <out dir>` writes BRIEF.md (this page + the list below), one template per game,
  small JPEG references of the existing pictures and list.json; zip it for the owner.

<!-- LIST -->
The list of files to make is in the kit's BRIEF.md (built from what is in the game).
