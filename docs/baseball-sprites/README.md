# Major League Baseball: drop-in sprites

Player-facing brief for ChatGPT: `GPT-SPRITE-BRIEF.md` (same folder). This page is the technical side.

- Files go in `assets/baseball/<name>.png|webp`. The build embeds them as `baseball:<name>`
  (`tools/build.mjs`); the engine loads them from `src/data/baseballSprites.js`.
- Every slot is optional: whatever is missing is drawn by `src/engines/griffeyArt.js` as before, so sheets can arrive one
  at a time.
- Templates: `node tools/baseball-templates.mjs` writes `templates/<name>.png` (real size) and `<name>@2x.png`. Each one
  shows the grid, the row names, the feet point (red), the top-of-head line (green) and the face circle (blue).

| Sheet | Frame | Rows | Used for |
|---|---|---|---|
| `batter-p1` / `batter-p2` | 128×160 | stance 4, swing 6 | batting view; the swing goes through the frames with the swing progress |
| `pitcher-p1` / `pitcher-p2` | 96×128 | idle 2, windup 4, throw 4 | the mound in the batting view (faces the camera) |
| `fielder-p1` / `fielder-p2` | 96×128 | stand 2, run 6, throw 3 | field view fielders and runners (faces right, mirrored), innings menu |
| `catcher-p1` / `catcher-p2` | 96×96 | idle 2, catch 2 | batting view, from behind (catch = pitch arrived, not hit) |
| `umpire` | 96×128 | idle 2, call 3 | batting view, from behind (call = a called strike) |

How the sheets are drawn:
- **Size:** each player is scaled so `tall` (soles to the top of the head, in frame px) matches the drawn player's height.
- **Faces:** the character's face goes into the `head` circle at `headSize`. Then `helmet-p1|p2` (batter) or `cap-p1|p2`
  (pitcher, fielders) is drawn over it, or the drawn helmet/cap when that picture is missing.
- **Teams:** p1 = red = player 1's team, p2 = blue.

Single pictures:
- `ball`: every ball, in both views.
- `stadium`: the batting backdrop above the wall, cover-fitted.
- `wall`: the outfield wall strip, stretched across the screen.
- `logo`: the innings-menu title.
- `derby-logo`: the Derby's opening banner.
- `helmet-p1|p2` and `cap-p1|p2`: drawn over the faces (see above).

Importing from `art-inbox/baseball/`:
1. Check each frame size against the table.
2. If the art is 2x, downscale it to the frame size (LANCZOS for painted art, nearest-neighbour for pixel art).
3. Save to `assets/baseball/<name>.png`, or `.webp` q90 for the big pictures.
4. Build, then check in game with `tests/baseball.mjs` and a screenshot.
