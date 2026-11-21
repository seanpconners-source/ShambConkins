# Kingpin Bowling — sprite brief for GPT

A 3D bowling game on a phone, themed on **Kingpin** (1996) and **The Big Lebowski** (1998). The player upgrades the alley
one part at a time through five eras. You make the flat pictures the game wraps onto its 3D alley and shows on the
overhead score monitors. Every slot has a template in `docs/bowling-sprites/templates/<name>.png` at its exact size:
it shows the game's own drawing, faded, with magenta notes and cyan guides. **Keep the template's layout; replace the art.**

## Rules for every picture
- Exactly the template's size, or exactly 2x it (same proportions). PNG or lossless WebP.
- Our own designs. No real logos or brand names (no Brunswick, AMF, Storm, Folgers...), no frames copied from the movies,
  no actors' faces. Movie jokes in our own drawings are welcome (a rug, a White Russian, a rubber hand, "MARK IT ZERO").
- Tiles must tile seamlessly (left edge meets right edge, top meets bottom) where the template says so.
- Transparent backgrounds where the template says so (logo, decor, cartoon sheets).
- No text unless the slot asks for it (the game writes names, numbers and scores itself).
- Name each file exactly like its template (`masking-ocelot.png`, `ball-jesus.png`...).

## The five eras (`<era>` in file names)
| era | name | look |
|---|---|---|
| `ocelot` | Ocelot Bowl, 1979 | Ocelot, Iowa: wood paneling, burnt-orange shag, nicotine-yellow ceiling tiles, flickering tube lights, chipped yellowed pins. A sad small-town alley. |
| `starlanes` | Hollywood Star Lanes, 1991 | The Dude's alley: Googie stars and boomerangs, teal and purple, colour TVs. Cool but a bit run down. |
| `cosmic` | Cosmic Bowl, 1998 | Blacklight night: black everything with neon paint (cyan, hot pink, lime), glowing pins, galaxy murals, lasers. |
| `reno` | The Reno Showdown, today | The million-dollar tournament: black lacquer, white and electric-blue LED lines, sleek and expensive. |
| `galactic` | Gutterballs Galactic, 2199 | The Dude's dream in orbit: a space station alley, starfields, nebulae, holographic cyan and magenta. |

## Slots (per era)
- `boards-<era>` 512x1024 — the lane surface seen straight down: **39 boards across** (cyan lines), tiles top to bottom.
  Wood grain for eras 1-4 (yellowed and scuffed for Ocelot, clean honey for Star Lanes, dark wood for Cosmic, pale glossy
  synthetic for Reno); a glowing blue glass/grid for Galactic. **No arrows or dots** (the game paints them).
- `approach-<era>` 512x512 — the floor you walk up on before the foul line, planks running top to bottom, tiles.
- `masking-<era>` 1600x560 — the big panel hanging over ONE lane's pins (it repeats over every lane). A mural in the era's
  style (Ocelot: orange/brown stripes with bowling pins; Star Lanes: stars and a bowling-ball comet; Cosmic: a glowing
  galaxy; Reno: LED video wall; Galactic: a nebula with a ringed planet). **Bottom 80 px dark**: the game writes the lane number there.
- `kickback-<era>` 512x512 — the side boards beside the pins, tiles.
- `wall-<era>` 1024x512 — the side walls of the alley, tiles sideways.
- `carpet-<era>` 512x512 — the carpet behind the lanes (where the seats are), tiles. Cosmic = the classic black carpet with neon shapes.
- `ceiling-<era>` 512x512 — ceiling tiles, tiles.
- `pins-<era>` 512x1024 — a pin's skin unrolled: x goes round the pin, row 0 = the top of the head, the bottom row = the
  base. The red neck stripes sit between the cyan lines. Ocelot: chipped and yellowed; Reno: mirror-white; Cosmic/Galactic: glowing.
- `screen-<era>` 1280x720 — the overhead monitor's background: scores and the cartoon animations draw on top, so keep it
  calm and dark-ish in the middle (Ocelot: an amber CRT glow; Star Lanes: a blue TV gradient with stars; Cosmic: black
  with neon edges; Reno: sleek dark gradient; Galactic: hologram grid).

## Balls: `ball-<id>` 1024x512
The ball's cover as an **equirectangular wrap** (like a world map: left edge meets right edge, top row = north pole).
Shiny resin swirls, sparkle or pearl. The game adds the finger holes (cyan ellipses near the top-left: keep that area free
of logos). `house` (blue plastic house ball, scuffed), `ocelot` (burnt orange), `munson` (green), `dude` (blue + cream),
`rug` (dark red with a Persian rug pattern), `walter` (brass), `jesus` (purple, polished), `big-ern` (gold glitter),
`nihilist` (black with blood-red veins), `reno-gold` (gold and white pearl), `gutterball` (cyan/pink nebula, glowing).

## Decor: `decor-<id>` 512x768, transparent around it
Posters, signs and props for the alley walls: `rug`, `white-russian`, `big-ern-poster` (a rhinestone bowling champ with a
comb-over, our own drawing), `munson-poster` (1979 Iowa state champion), `rubber-hand` (in a little trophy case),
`mark-it-zero` (sign: "MARK IT ZERO"), `jesus-poster` (a purple-clad bowler licking his ball, our own drawing),
`coffee-can`, `amish-sign`, `disco-ball`, `trophy` (a huge gold tournament trophy), `neon-gutterballs` (neon sign "GUTTERBALLS").

## Cartoon sheets for the score-screen animations (transparent background)
Like the cartoons a real alley's scoring system plays after a strike or a gutter ball: bold outlines, bright, funny.
- `toon-pin` 2048x384 = 8 cells of 256x384: a bowling pin with a face. 0 standing, 1 scared, 2 knocked (tilted 45°),
  3 flying (lying sideways), 4 dizzy on its back, 5 laughing, 6 crying, 7 dancing. Base on the cell bottom.
- `toon-ball` 1536x384 = 4 cells of 384x384: a bowling ball character. 0 rolling, 1 angry (on fire), 2 sad, 3 cool (shades).
- `toon-turkey` 2304x384 = 6 cells of 384x384: a cartoon turkey. 0 standing, 1 strutting, 2 gobbling, 3 dancing,
  4 flapping, 5 bowing. Feet on the cell bottom.

## Logo: `logo` 1200x480, transparent
"KINGPIN BOWLING" lettering, retro bowling-alley sign style (think 1960s neon and chrome), our own design.

## Hand back
Upload the finished files with their exact names (a zip is fine). Note anything you could not make.
