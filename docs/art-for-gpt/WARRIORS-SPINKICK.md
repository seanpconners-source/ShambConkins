# The Warriors: cyclone spin kick strips (for GPT)

**Owner, Nov 24:** the spin kick spins the whole character like a flat cut-out. Please draw it as a real move.

## What to make

There are two pictures, one per hero. Each is **2048 x 256**: 8 frames of 256 x 256, left to right, on a transparent background.

| File | Who |
|---|---|
| `spin-p1.png` | Sean's Warrior (player 1): leather vest, bare arms, brown trousers. The same man as `hero-p1`. |
| `spin-p2.png` | Amber's Warrior (player 2): the same build and outfit as `hero-p2`. |

**The move.** A Double Dragon-style airborne cyclone spin kick. He is in the air with one leg held straight out at hip height, and his whole body turns one full circle. The leg stays out the **whole time**, so the 8 frames loop with no jump.

The body faces a different way in each frame:

- **Frame 0:** faces RIGHT, side view. The kicking leg points right.
- **Frame 1:** turning toward the camera.
- **Frame 2:** chest to the camera. The leg points at the camera and is foreshortened.
- **Frame 3:** turning away.
- **Frame 4:** faces LEFT, side view. The leg points left.
- **Frame 5:** turning further.
- **Frame 6:** back to the camera. The leg points away and is foreshortened.
- **Frame 7:** coming back round to frame 0.

The arms swing round with the body for balance.

## Rules

- **Headless, like every Warriors body sheet.** Stop at the neck and leave the pink face circle empty. The game draws the player's real face there.
- **Same scale and look as the hero sheets.** Use `spin-reference.png`: it shows each hero's stand, jump kick and current spin cell from the game. Match the outfit, lighting and photo-real style exactly.
- **Use the templates for placement.** `spin-p1-template.png` and `spin-p2-template.png` show each frame's facing (with a small compass seen from above), the face circle, the line the kicking leg runs along, and the ground point he hovers above.
- **Return PNGs with real transparency,** named exactly `spin-p1.png` and `spin-p2.png`.

## Paste-ready prompt

> Make `spin-p1.png`: a 2048 x 256 transparent PNG strip of 8 frames, each 256 x 256, of the player 1 Warrior from `spin-reference.png` (hero-p1: leather vest, bare arms, brown trousers, photo-real like the reference cells). He is doing a Double Dragon-style airborne cyclone spin kick: in the air, one leg held straight out at hip height for the whole turn, his body turning one full circle across the 8 frames. Frame 0 faces right (side view), frame 2 chest to the camera, frame 4 faces left, frame 6 back to the camera, and frames 1/3/5/7 are in between, so the strip loops smoothly. HEADLESS: stop at the neck and leave the face circle in `spin-p1-template.png` empty. Put each frame exactly where the template shows: face circle position, leg line, and ground dot under the body. Same scale as the reference cells. Then make `spin-p2.png` the same way for the player 2 Warrior (hero-p2 in the reference).

## Claude: importing them

1. Copy the PNGs to `assets/originals/warriors/`.
2. Save lossless WebP to `assets/warriors/spin-p1.webp` and `spin-p2.webp` (2048 x 256).
3. The game already draws from them: `drawFighter` in `src/engines/warriorsDD.js` picks the frame from the turn.
4. Add `spin-p1` and `spin-p2` to the Head Placer (frames r0–r7, like the run strips) so the owner can place the heads.
5. Until then, the heads use the old spot.
