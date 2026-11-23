# Flappy Disaster: stage backgrounds (paste this to GPT)

Flappy Disaster is our Flappy-Bird-style game: the player's own face flies with little wings through an endless row of pipes.
Every game deals one of 16 STAGES, each with its own look. The game draws the pipes, the bird, the score and the weather; you
make the SCENERY behind the pipes and the GROUND strip under them, for every stage.

## What to make: 2 pictures per stage, 32 in all
| Picture | Size | What it is |
|---|---|---|
| `bg-<stage>.png` | **2048 x 1248** | The scenery from the top of the screen down to the ground line. It scrolls slowly behind the pipes and **repeats side to side**: the right edge must flow into the left edge with no seam (same sky colour, same horizon height, objects not cut at the edges). One picture covers every screen shape (phones, 16:9, Sean's Fold): wider screens just see more of the strip, so no separate phone/16:9/Fold versions are needed for this game. |
| `ground-<stage>.png` | **512 x 192** | The ground strip under the pipes. The top edge is the ground line. Also repeats side to side seamlessly. (Backgrounds no longer need seamless edges: the game mirrors every other copy, and any 16:9 size works.) |

## Rules
- Exactly these sizes, PNG, no transparency, no text, no logos, no UI, no bird, no pipes, no score.
- Keep the scene readable behind moving pipes: mid-tone and calm in the middle height band (where the bird flies), detail and
  bold shapes low down near the horizon and up in the sky corners. No bright spots or hard vertical stripes that look like a pipe.
- The bottom edge of `bg` is where the ground starts: the scenery should meet the ground there (horizon/hills/buildings stand on it).
- Each stage's look is in `ref-<stage>.jpg` (the game's current drawn version). Keep the idea and the colours, make it gorgeous.
- Our own designs: tributes are fine (a paper company office, a sewer with a floating pizza box), but no real characters, logos
  or copied game art.
- Templates: `bg-template.png` (pipes shown where they pass, the seam rule, the ground line) and `ground-template.png`.

## The 16 stages
| # | Stage | Files | Reference | What it looks like |
|---|---|---|---|---|
| 1 | FLAPPY CLASSIC | `bg-classic.png` + `ground-classic.png` | `ref-classic.jpg` | a bright cheerful cartoon day: teal sky, puffy clouds, a pale low-rise city skyline and a row of round green bushes along the bottom. Ground: sandy dirt under a strip of bright green grass with a darker stripe pattern. |
| 2 | THE MEAT LOCKER | `bg-meat.png` + `ground-meat.png` | `ref-meat.jpg` | the inside of a dark red walk-in freezer: hanging meat carcasses on hooks along rails, frosty breath, blood-red gloom, crates in the back. Ground: grimy grey steel floor tiles with drain grates and blood puddles. |
| 3 | FUZZY WUZZY HELL | `bg-fuzzy.png` + `ground-fuzzy.png` | `ref-fuzzy.jpg` | an unbearably cute pink world: candy-pink sky, fluffy white cloud puffs, round pink fuzzy hills, little hearts, sinister under the cuteness. Ground: rainbow stripes of plush carpet. |
| 4 | ROUTE 1 (PROBABLY) | `bg-pokemon.png` + `ground-pokemon.png` | `ref-pokemon.jpg` | a 90s handheld-RPG countryside route: light blue sky, rounded green hills, chunky round trees, tall grass, a little signpost (no real game characters or logos). Ground: short green grass with spiky tufts over a sandy path. |
| 5 | THE NINTH CIRCLE | `bg-hell.png` + `ground-hell.png` | `ref-hell.jpg` | hell: dark red sky, jagged black rock spires, rivers of lava glow, smoke, distant tortured silhouettes. Ground: bubbling orange lava with glowing yellow blobs. |
| 6 | ZERO-G (NOT REALLY) | `bg-space.png` + `ground-space.png` | `ref-space.jpg` | deep space: black-blue starfield, a big orange gas planet, nebula haze, a far space station. Ground: grey cratered moon surface. |
| 7 | DAVY JONES’ PIPE LOCKER | `bg-sea.png` + `ground-sea.png` | `ref-sea.jpg` | deep underwater: blue light rays from above, kelp forests, coral mounds, a sunken ship in the gloom. Ground: pale sand with coral and starfish. |
| 8 | DUNDER MIFFLAP | `bg-office.png` + `ground-office.png` | `ref-office.jpg` | a drab mid-size paper company office: grey-blue cubicle walls, filing cabinets, fluorescent ceiling lights, windows to a parking lot (no real logos). Ground: worn green-grey office carpet tiles. |
| 9 | NIGHT OF THE LIVING FLAP | `bg-grave.png` + `ground-grave.png` | `ref-grave.jpg` | a misty graveyard at night: big pale moon, crooked tombstones, dead trees, bats, a creepy chapel far back. Ground: dark mossy earth with a grassy edge. |
| 10 | A E S T H E T I C | `bg-vapor.png` + `ground-vapor.png` | `ref-vapor.jpg` | vaporwave: pink-to-orange sunset gradient, a striped setting sun, a purple neon grid floor running to the horizon, palm silhouettes, a marble bust. Ground: dark purple with cyan neon grid lines in perspective. |
| 11 | SUGAR RUSH | `bg-candy.png` + `ground-candy.png` | `ref-candy.jpg` | a candy land: pastel blue sky, gumdrop hills, lollipop trees, frosting clouds, a gingerbread house far back (our own design). Ground: chocolate cake with a thick white frosting top. |
| 12 | THE UPSIDE DOWN | `bg-upside.png` + `ground-upside.png` | `ref-upside.jpg` | a dark mirror-world town: blue-black sky with red lightning, floating ash spores, dead vines over everything, a twisted tree line (no characters). Ground: black earth with fleshy vines. |
| 13 | COWABUNGA SEWERS | `bg-sewer.png` + `ground-sewer.png` | `ref-sewer.jpg` | a big city sewer tunnel: mossy green brick walls, pipes, dripping water, glowing green ooze, a pizza box floating by (no characters). Ground: glowing green sewer sludge. |
| 14 | LOST WAGES | `bg-vegas.png` + `ground-vegas.png` | `ref-vegas.jpg` | a Las Vegas strip at night: neon casino towers, marquee lights, a purple sky, searchlights (made-up casino names only). Ground: red casino carpet with a gold pattern. |
| 15 | BRAIN FREEZE | `bg-arctic.png` + `ground-arctic.png` | `ref-arctic.jpg` | a bright arctic: icy blue sky, snowy mountains, glaciers, icebergs, a little igloo. Ground: packed snow with a blue ice crust. |
| 16 | DISCO INFERNO | `bg-disco.png` + `ground-disco.png` | `ref-disco.jpg` | a 70s disco: dark purple club, a giant mirror ball, coloured spotlight beams, a crowd in silhouette. Ground: a lit-up dance floor of coloured glowing squares. |

## Hand back
Upload the 32 PNGs to Drive with an UPLOADS-GPT note and a manifest (file, size, bytes, SHA256) as usual; files under 80 KB in an
identically named ZIP. Claude imports them losslessly to `assets/flappy/<file>.webp`.

## For Claude
Slots in `src/data/flappySprites.js` (STAGE_ART); `flappyDisaster.js` draws `bg-<id>` tiled from the top to FLOOR at .25 parallax and
`ground-<id>` tiled under FLOOR with the pipes; each stage's drawn bg()/ground() stays as the fallback. Templates
`python3 tools/flappy-templates.py`; references = screenshots of the drawn stages at 1100x620 (localStorage sc-flappy-stage forces one).
