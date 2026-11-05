# Symphony of the Night: drop-in sprites and stage art

The ChatGPT brief is `GPT-SPRITE-BRIEF.md` in this folder. This page covers the technical side.

- Files go in `assets/sotn/<name>.png|webp`. The build embeds them as `sotn:<name>` (`tools/build.mjs`). The game loads them
  from `src/data/sotnSprites.js`, which holds every name, frame size, row, anchor and face spot.
- Every slot is optional. Whatever is missing keeps the game's drawn vector art, so the art can arrive a piece at a time.
- Templates: `node tools/sotn-templates.mjs` writes `templates/<name>.png` at real size, plus `<name>@2x.png`. What each
  template shows:
  - the frame grid and the row names;
  - the anchor (red cross);
  - the face circle (blue; the tick shows which way is up);
  - the sword hand (yellow ring, with the blade along the dashed line);
  - the demon's head hitbox (orange);
  - a faint grey pose guide: the game's own drawn version of that frame.
- Stand-ins: `node tools/sotn-templates.mjs --standin <dir>` fills every slot with the game's drawn art in colour. Copy them
  into `assets/sotn/`, build, and the game should look the same as without them (except the faces, which are drawn on top
  either way). This is how the anchors were checked.

## Scale
Everything is drawn at **0.5 world units per pixel**. The view is 240 units tall, so a picture 480 px tall fills the
screen's height. The hero is about 100 px from boots to crown. That is twice the PS1's own pixel size. If art arrives at
4x, downscale it by half with nearest-neighbour (pixel art) or LANCZOS (painted art).

## Sheets (one row per animation, frames left to right, facing right, transparent)
| Sheet | Frame | Rows (frames) |
|---|---|---|
| `hero-p1`, `hero-p2` | 128×144 | stand 4, walk 8, crouch 2, crouchSlash 4, jump 3, fall 3, flip 8, land 2, dash 4, kick 2, hurt 2, cast 4, slash 4, stab 5, cleave 6, dead 6 |
| `zombie` | 96×96 | rise 4, walk 6 |
| `bloody` (Bloody Zombie) | 128×112 | walk 6, swipe 4 |
| `warg` | 192×96 | idle 4, run 6, tell 3, lunge 2, skid 2 |
| `skeleton` | 80×96 | walk 6, throw 4 |
| `bat` (anchor = body centre) | 64×48 | hang 2, fly 4 |
| `merman` | 80×96 | leap 2, walk 6, spit 4 |
| `armor` (Axe Armor) | 112×128 | walk 4, throw 4, empty 4 |
| `death` | 240×200 | float 4, swing 6 |
| `dracula` | 224×152 | idle 4, cast 4 |
| `demon` (true form) | 448×352 | idle 4, crouch 3, leap 2, breath 4, summon 4 |
| `candelabra`, `lantern`, `torch` | 48×64, 32×96, 32×64 | lit 4, out 1 |
| `fireball`, `inferno`, `holy-flame`, `fire-wave` | 32×32, 48×48, 48×48, 32×48 | burn 4 / 4 / 3 / 3 |

How the game picks frames:
- **Walk cycles** follow the distance walked (one full stride cycle per row).
- **Timed moves** go through the row once:
  - attacks follow the swing;
  - `rise` takes 40 steps;
  - `swipe` 30, hit in frames 2-3;
  - skeleton `throw` 22, the bone leaves in frame 2;
  - merman `spit` 34, fire in frame 3;
  - armor `throw` 32, the axe leaves in frame 3;
  - warg `tell` 16.
- **Air frames:** `jump`/`fall` follow the vertical speed; `lunge` and `leap` use frame 1 going up and frame 2 coming down.
- **Hero sword:** the game draws it (the weapon changes during the run), on the path of the yellow ring and line. The
  `sword-*` pictures replace the drawn blades, sized by blade length.
- **Hero face:** the player's face goes in the blue circle. `headRows` in `sotnSprites.js` moves the circle for crouch,
  land, kick, the somersault (it turns all the way round) and the fall.
- **Death** is mirrored to face the hero. `swing` plays during his scythe strike.
- **Dracula** uses `cast` by how far the cloak is open (Hellfire opens it fully, Dark Inferno about 70%).
- **Demon:**
  - `crouch` is the jump wind-up and the landing recovery;
  - `breath` = head lowering, jaws opening, then frames 3-4 alternate while breathing fire;
  - `summon` = calling the bats.
  - The head must stay inside the orange box: that box is its weak spot.
- **Candles:** the game adds the flame glow. `out` = after being broken.
- **Lantern anchor:** the post's foot (ground), 26 units below the lamp.

## Pictures
`w` is the width drawn in world units; the height follows the picture's own shape. Positions are in `PICTURES`
(`sotnSprites.js`).

| Group | Names |
|---|---|
| Weapons, items | `sword-alucard`, `sword-short`, `sword-claymore`, `dagger`, `axe`, `cross`, `holy-water`, `heart`, `bigheart`, `money`, `potion`, `roast`, `leap-stone`, `blood-orb`, `bone` |
| Outside | `forest-sky` (stretched over the view), `moon`, `castle-far` (also on the title screen), `forest-far` and `forest-near` (repeating strips, 800×480 / 640×480), `fog`, `tree`, `fence`, `grave`, `bridge`, `gate-wall`, `gate` (doorway left transparent), `portcullis` |
| Rooms | `hall-back`, `cave-back`, `gallery-back`, `throne-back` (512×480 repeating, scroll a little slower than the floor) |
| Floors | `forest-ground`, `gate-ground`, `hall-ground`, `cave-ground`, `gallery-ground`, `throne-ground` (128×160: top edge = walking surface, the lower half repeats downward, columns follow slopes) |
| Level pieces | `balcony` (64×48, floor 16 px down), `stepping-stone`, `crack-wall` (the pot-roast wall), `bars` (throne-room gate), `water` (surface strip) |
| Props | `window`, `pillar`, `banner`, `statue`, `altar`, `stalactite`, `rock-pillar`, `arch`, `stained-glass`, `throne`, `carpet` |

## Importing from `art-inbox/sotn/`
1. Check each sheet against the table above.
   - A sheet whose grid is off: cut the frames by the art and re-grid them so each frame's feet land on the template's
     cross.
   - A sheet sent as separate rows (`hero-p1.walk.png`...): stack the rows in order.
2. Downscale to the frame size: nearest-neighbour for pixel art, LANCZOS for painted art.
3. Remove any leftover backdrop and make it transparent.
4. Save as `assets/sotn/<name>.png`. Use `.webp` (q90) for the big backgrounds.
5. Build, then check in game with `tests/sotn.mjs` and its screenshots (one per area). If a face or sword sits wrong, move
   `headRows` / the anchor in `sotnSprites.js`; the art doesn't need redrawing.
