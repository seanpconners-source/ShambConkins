# Black Sabbath pinball: art templates

Each picture here is the table's current painted art for one drop-in slot, at the size and framing that slot uses.
Repaint it (same size, same transparency), then save it as `assets/pinball/black-sabbath/<slot>.png` (or `.webp`/`.jpg`)
and rebuild. Missing slots keep the painted art. Don't put these unchanged copies in `assets/pinball/`: the painted
versions animate (Iron Man steps and his visor blazes, the backglass flickers with lightning, bumpers light up) and the
pictures don't.

| file | slot | size | notes |
| --- | --- | --- | --- |
| `playfield.png` | playfield | 1028 × 2134 | Everything painted on the wood: moon, trees, mill and cloaked figure, graveyard, fog, the logo and the guitar. A playfield picture replaces **all** of it, so a custom playfield hides `logo` and `character` there (the logo still shows on the backbox). Outside the rounded cabinet edge is cut off. |
| `playfield-guide.png` | (reference) | 1028 × 2134 | The whole table at rest, so you can see what sits where. |
| `playfield-parts.png` | (reference) | 1028 × 2134 | Only what the game draws on top of your playfield (inserts, walls, ramps, bumpers, flippers, disc, apron, shading), transparent elsewhere. Use it as the top layer in your editor. |
| `apron.png` | apron | 896 × 374 | The panel under the flippers; only the grey shape shows (transparent corners are cut off). |
| `backglass.png` | backglass | 1200 × 1600 | The intro card (fit to the screen) and the strip beside the score display in landscape (cropped to fill). Any size works. |
| `logo.png` | logo | 1152 × 282 | Transparent. Drawn 288 mm wide centred on the logo spot, and in the backbox beside the score display. |
| `character.png` | character | 660 × 896 | Transparent. Iommi's guitar, drawn 110 mm wide, centred between the slingshots. Keep the bottom quarter mostly empty. |
| `bumper.png` | bumper | 256 × 256 | Cut to a circle; one picture for all three WAR PIGS bumpers. It's brightened when a bumper is hit. |
| `toy.png` | toy | 336 × 464 | Iron Man, stretched to his 84 × 116 mm box. The game adds the shadow and the hit flash. |

The DMD, flippers, slingshots, ramps, inserts, drop targets, the spinning disc and the Hand of Doom post are drawn by
code and have no picture slot.
Full specs for each picture (sizes, transparency, what's hidden, safe areas) and a ready-to-paste image prompt for
each: `IMAGE-SPECS.txt`.
Regenerate these files with `node tools/pinball-art-templates.mjs --table black-sabbath`.
