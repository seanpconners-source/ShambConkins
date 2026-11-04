# Sundown Showdown sprites

Your own original pixel art for **Sundown Showdown**. Drop finished files into `assets/sundown/` and rebuild. Any file that's
missing keeps the game's drawn art, so you can add them one at a time. The layout of every sheet is in
`src/data/sundownSprites.js`; the pictures in `templates/` show it (run `node tools/sundown-templates.mjs` to remake them).

The art must be your own (drawn, generated or commissioned), not ripped or traced from another game.

## Rules for every sheet
- PNG (or WebP lossless), **transparent background**, pixel art at the sizes below (the game scales it up with sharp pixels).
- One **row per animation**, in the order listed, frames left to right, every frame the same size, no gaps, no padding.
- Everything **faces right**. The game mirrors it for left.
- The **red mark** in a template is the ground point: put the feet there in every frame.
- **Cowboys and the boss have no head.** Draw them from the neck down. The game puts the player's face (or the WANTED
  character's face) in the **blue circle**, then a hat on top: `hat-p1.png` / `hat-p2.png` if you make them, else a drawn
  Stetson. Keep the neck under the circle; the circle moves in the duck, slide and death rows (see the template).
- Keep a 1-2 px dark outline round characters: they're small on a phone.

## Sheets (file name → frame size → rows)
| File | Frame | Rows (frames) |
|---|---|---|
| `cowboy-p1.png`, `cowboy-p2.png` | 64×64 | idle 4, run 8, runShoot 8, shoot 2, shootUp 2, shootDiagUp 2, shootDiagDown 2, duck 2, duckShoot 2, jump 4, slide 3, death 6 |
| `bandit.png` (street gunmen, ledge gunmen, gunmen behind crates) | 64×64 | idle 2, walk 6, shoot 2, cover 2 (crouched behind a crate), death 6 |
| `knife.png` (knife rusher) | 64×64 | run 6, slash 2, death 6 |
| `dynamite.png` (dynamite thrower) | 64×64 | idle 2, walk 6, throw 3, death 6 |
| `window.png` (gunman in a window, frame includes the window surround and shutters) | 48×48 | peek 2, shoot 2, death 4 |
| `rider.png` (bandit on horseback) | 112×96 | gallop 6, shoot 2, fall 6 |
| `horse.png` (the horse running on alone after its rider is shot) | 112×80 | gallop 6 |
| `boss.png` | 96×96 | idle 4, walk 6, shoot 3, throw 3, hurt 2, death 8 |
| `explosion.png` | 64×64 | boom 8 |
| `muzzle.png` (gun flash, pointing right from the left edge) | 24×16 | flash 3 |

Notes per row:
- **runShoot**: running while shooting straight ahead. **shoot/shootUp/shootDiagUp/shootDiagDown**: standing, gun at
  that angle. **duckShoot**: crouched, shooting ahead. **slide**: low dive along the ground (the dodge move).
- **death**: shot and falling backwards, ending lying down (last frame is held).
- **cover**: crouched behind a crate, head down. When he pops up to fire the game uses his **shoot** row.

## Single pictures (any size; drawn at 0.75 world units per pixel)
`hat-p1.png`, `hat-p2.png` (sits on the head, bottom centre = the head's crown), `crate.png`, `barrel.png` (stretched to
the crate's box, about 28×24 px), `dynamite-stick.png`, `bullet.png` (pointing right), `enemy-bullet.png`,
`item-gold.png`, `item-two.png` (Two Guns), `item-rapid.png` (Rapid Fire), `logo.png` (title screen sign, about 840 px
wide), `poster.png` (blank WANTED poster paper, about 300×390; the game writes the name, face and bounty on it).

## Scenery (per stage: `town-…`, `canyon-…`, `mission-…`)
Drawn at **0.5 world units per pixel**: a picture 400 px tall fills the whole view height.
- `<stage>-sky.png`: the sky, stretched over the view (about 800×400).
- `<stage>-far.png`, `<stage>-near.png`: wide strips that repeat sideways (make the left and right edges match), bottom
  edge on the ground line; far scrolls slowly, near faster.
- `<stage>-ground.png`: a tile repeated along the floor, top edge on the ground line (about 64×64).
- `<stage>-building-1.png` … `-4.png`: building fronts (about 200-320 px wide), bottom on the ground. Gunmen appear in
  windows at the game's spots: across each floor at even spacing, floors 56 px and 148 px above the ground at this scale.

## Checking your art
Rebuild (`node tools/build.mjs`, or the release build), open the Arcade → Sundown Showdown. Anything that looks off in
position: tell Claude which sheet and row; the head spots and ground points can be moved per row in
`src/data/sundownSprites.js` without redrawing.
