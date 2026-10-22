# King Gizzard & the Lizard Wizard pinball: art templates

Each picture here is the table's current painted art for one drop-in slot, at the size and framing that slot uses.
Repaint it (same size, same transparency), then save it as `assets/pinball/king-gizzard/<slot>.png` (or `.webp`/`.jpg`)
and rebuild. Missing slots keep the painted art. Don't put these unchanged copies in `assets/pinball/`: the painted
versions animate (the pop caps' nonagons turn, the staff glows, the backglass rings spin) and the pictures don't.

| file | slot | size | notes |
| --- | --- | --- | --- |
| `playfield.png` | playfield | 1028 × 2134 | Everything painted on the wood: the psychedelic rings, the Rats' Nest floor up top, the nonagon emblem, the Gila monster, the logo and the Lizard Wizard. A playfield picture replaces **all** of it, so a custom playfield hides `logo` and `character` there (the logo still shows on the backbox). Outside the rounded cabinet edge is cut off. |
| `playfield-guide.png` | (reference) | 1028 × 2134 | The whole table at rest, so you can see what sits where. |
| `playfield-parts.png` | (reference) | 1028 × 2134 | Only what the game draws on top of your playfield (inserts, walls, the ramp, the Rattlesnake, bumpers, flippers, apron, shading), transparent elsewhere. Use it as the top layer in your editor. |
| `apron.png` | apron | 896 × 374 | The panel under the flippers; only the shape below the V shows. |
| `backglass.png` | backglass | 1200 × 1600 | The intro card (fit to the screen) and the strip beside the score display in landscape (cropped to fill). Any size works. |
| `logo.png` | logo | 1056 × 188 | Transparent. Drawn 264 mm wide centred on the logo spot, and in the backbox beside the score display. |
| `character.png` | character | 660 × 656 | Transparent. The Lizard Wizard, drawn 110 mm wide, centred between the slingshots. |
| `bumper.png` | bumper | 256 × 256 | Cut to a circle; one picture for all three MICROTONAL pop bumpers. It's brightened when a bumper is hit. |

There is no toy slot on this table: the Rattlesnake that swallows the ball is drawn by code every frame (it wiggles,
gapes and bulges while it carries a ball), like the ramps. The DMD, flippers (main and mini), slingshots, the ramp,
inserts and drop targets are drawn by code too.
Full specs for each picture (sizes, transparency, what's hidden, safe areas) and a ready-to-paste image prompt for
each: `IMAGE-SPECS.txt`.
Regenerate these files with `node tools/pinball-art-templates.mjs --table king-gizzard`.
