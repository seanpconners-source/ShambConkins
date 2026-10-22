# Bucketheadland pinball: art templates

Each picture here is the table's current painted art for one drop-in slot, at the size and framing that slot uses.
Repaint it (same size, same transparency), then save it as `assets/pinball/buckethead/<slot>.png` (or `.webp`/`.jpg`)
and rebuild. Missing slots keep the painted art. Don't put these unchanged copies in `assets/pinball/`: the painted
versions animate (the robot walks and blinks, the backglass wheel turns, bumpers light up) and the pictures don't.

| file | slot | size | notes |
| --- | --- | --- | --- |
| `playfield.png` | playfield | 1028 × 2134 | Everything painted on the wood: sky, Ferris wheel, signs, the logo and Buckethead. A playfield picture replaces **all** of it, so a custom playfield hides `logo` and `character` there (the logo still shows on the backbox). Outside the rounded cabinet edge is cut off. |
| `playfield-guide.png` | (reference) | 1028 × 2134 | The whole table at rest, so you can see what sits where. |
| `playfield-parts.png` | (reference) | 1028 × 2134 | Only what the game draws on top of your playfield (inserts, walls, ramps, bumpers, flippers, apron, shading), transparent elsewhere. Use it as the top layer in your editor. |
| `apron.png` | apron | 896 × 374 | The panel under the flippers; only the grey shape shows (transparent corners are cut off). |
| `backglass.png` | backglass | 1200 × 1600 | The intro card (fit to the screen) and the strip beside the score display in landscape (cropped to fill). Any size works. |
| `logo.png` | logo | 1092 × 250 | Transparent. Drawn 273 mm wide centred on the logo spot, and in the backbox beside the score display. |
| `character.png` | character | 660 × 805 | Transparent. Drawn 110 mm wide, centred between the slingshots. The painted guitar reaches past that frame, so its head is cut off here; keep a new picture inside the frame. |
| `bumper.png` | bumper | 256 × 256 | Cut to a circle; one picture for all three pop bumpers. It's brightened when a bumper is hit. |
| `toy.png` | toy | 400 × 350 | The Giant Robot, stretched to its 96 × 84 mm box (the robot is shrunk a little to fit). The game adds the shadow and the hit flash. |

The DMD, flippers, slingshots, ramps, inserts and drop targets are drawn by code and have no picture slot.
Regenerate these files with `node tools/pinball-art-templates.mjs`.
