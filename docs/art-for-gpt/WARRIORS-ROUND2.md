# The Warriors, round 2 (paste this to GPT)

Same game and style as `WARRIORS-ART.md` (photo-real, gritty 1970s New York at night, our own designs, no logos or text from the
film, no real people's faces: every fighter is HEADLESS, the game puts the players' faces on). Templates are in the
`warriors-templates` folder: each `<name>-template.png` shows the exact size, the anchor points and what goes where. Deliver PNG
at exactly the template size, named as listed.

Sean's notes from playing it: the middle background layers look see-through, weapons don't sit in the hands (and a second weapon
shows under the held one), the run looks silly, the graves and street props are plain drawings, the bus is a yellow box, and the
chapter select should be the Warriors subway map on a dirty 70s subway wall. This round fixes all of that.

## 1. Redo every middle layer with a CLEAN cut-out top (19 pictures, most important)
`wall-<area>.png`, 1024 x 320, for every area in `WARRIORS-ART.md` section 2 (conclave, park, cemetery, elstreet, yard, tenement,
burning, train, trainDawn, riverside, playground, apartment, apartment2, station, platform, station96, restroom, boardwalk, beach).
- Everything in the picture is **fully solid** (no faded or see-through buildings, trees or walls).
- Everything **above** the top outline (sky, gaps between trees, above roofs, round the Coney booths) is **fully transparent**:
  a clean, crisp cut-out edge along the tree tops, roof lines, fences, booths, lamp posts. No fade, no glow, no leftover sky.
- Bottom edge = where the walkable floor starts; repeats side to side (the right edge joins the left edge).
- The far layer (`far-<area>`) shows through above it, so the top outline should be varied and interesting (not a straight line).

## 2. Weapon poses with EMPTY hands (the game draws the held weapon in the fist)
The fighter sheets are missing their last rows. Make only those rows, same character, same size and style as the delivered sheet:
| File | Size | Cells |
|---|---|---|
| `hero-p1-extra.png`, `hero-p2-extra.png` | 2048 x 512 | batReady, batWind, batHit, batFollow, batBack, batLow, batOver, batSmash, hurtLow, sweep |
| `foe-orphan-extra.png`, `foe-fury-extra.png`, `foe-lizzie-extra.png`, `foe-punk-extra.png`, `foe-rogue-extra.png`, `foe-turnbull-extra.png`, `foe-riff-extra.png` | 2048 x 768 | batReady ... batSmash, block, bash, aim, lobC, lob, skate1, skate2, hurtLow, charge, crouch, taunt |
- Templates: `<sheet>-extra-template.png` (pose, feet dot, empty face circle) and `<sheet>-extra-reference.png`.
- **The hands hold NOTHING**: a closed fist gripping an invisible handle, the swinging hand clearly visible and in front. No bat,
  no pipe, no stick in the picture: the game draws whichever weapon the fighter picked up.
- Headless, feet on the dot, 256 x 256 cells, 8 per row, transparent.
- Also the weapons on their own, lying flat, **grip at the LEFT end, centred top to bottom**: `bat` 256 x 64, `pipe` 256 x 64,
  `chain` 256 x 96, `stick` (police nightstick) 256 x 48, `knife` 128 x 48, `whip` 256 x 96. Clean edges, transparent.

## 3. The heroes' run (2 pictures)
`run-p1.png`, `run-p2.png`, 2048 x 256 = 8 frames of 256 x 256 left to right: a proper running cycle (contact, down, passing, up,
then the same for the other leg), running RIGHT, the same body and clothes as hero-p1 / hero-p2, HEADLESS (stop at the neck),
feet on the pink dot of every frame, fists pumping. Template `run-p1-template.png`.

## 4. Props, graves and the bus (21 pictures)
All transparent, standing on the bottom edge, filling the width, seen from the front and a little above like the fighters,
gritty and lived-in (our own designs, made-up words only):
| File | Size | What |
|---|---|---|
| `prop-grave-1` .. `prop-grave-4` | 256 x 320 (4: 320 x 256) | headstones: rounded granite / stone cross / thin obelisk / low double stone with a small angel |
| `prop-hydrant` | 192 x 256 | red NYC fire hydrant |
| `prop-meter` | 128 x 384 | 70s parking meter on a pole |
| `prop-newsstand` | 512 x 384 | green metal newsstand kiosk with papers |
| `prop-mailbox` | 256 x 320 | blue mailbox on legs |
| `prop-trashcan` | 256 x 288 | dented metal garbage can, lid half off |
| `prop-phone` | 256 x 448 | 70s phone booth / payphone |
| `prop-bench` | 448 x 256 | park bench |
| `prop-lamp` | 192 x 640 | old iron street lamp, lit |
| `prop-car` | 640 x 320 | parked 70s sedan, side view facing right |
| `prop-wreck` | 640 x 320 | burnt-out 70s car wreck, a few flames |
| `prop-swings` | 512 x 384 | old playground swing set |
| `prop-couch` | 512 x 256 | beat-up 70s couch |
| `prop-sink` | 256 x 288 | grimy restroom sink |
| `prop-hotdog` | 512 x 384 | Coney Island hot dog cart with umbrella |
| `prop-pylon` | 128 x 192 | orange traffic cone |
| `bus` | 1536 x 512 | the Turnbull AC's bus: battered yellow-and-black school bus with armour plates and graffiti, side view facing RIGHT, wheels on the bottom edge |

## 5. The subway map (15 pictures)
Chapter select and the card between chapters show a 70s-style New York subway map poster on a grimy station wall; the game draws
the Warriors' route, the stops and the tags on top.
| File | Size | What |
|---|---|---|
| `map-wall` / `map-wall-tall` / `map-wall-fold` | 1920 x 1080 / 1080 x 1920 / 1504 x 1670 | a dirty 1970s NYC subway station wall straight on: grimy cream tiles, a maroon tile band, soot streaks, faded spray paint (no words), harsh fluorescent light; the middle area plain (the poster hangs there) |
| `map-base` | 1600 x 2000 | the map poster in OUR OWN design: cream land, pale blue water, green parks, coloured lines; The Bronx at the top, Manhattan the thin island down the middle-left, Brooklyn/Queens to the right, Staten Island bottom left; worn, creased, yellowed. **No station names, no dots, no text** except a black title strip at the top. Keep the land where the template shows it so the stops land on it |
| `map-tag-<chapter>` | 512 x 192 | each stop's tag, hand-painted letters on transparent: `conclave` THE CONCLAVE, `turnbull` TURNBULL AC'S, `orphans` ORPHANS, `train1` THE TRAIN SOUTH, `furies` BASEBALL FURIES, `lizzies` LIZZIES, `union` UNION SQUARE, `punks` PUNKS, `ride` THE RIDE HOME, `coney` CONEY ISLAND (our own lettering, not the film's logos) |
`ref-map.png` in the templates folder shows where the game puts the land and the stops now.

## Hand back
Upload to Drive (folder "The Warriors — Round 2") with an UPLOADS-GPT note + manifest (file, size, bytes, SHA256); files under
80 KB in an identically named ZIP. Start with section 1 (the walls) and `run-p1`.

## For Claude
Slots in `src/data/ddSprites.js`. Walls: import as delivered (lossless RGBA; do NOT run tools/warriors/wall-tops.py on the new
ones, its fade is what Sean didn't like). Extra rows: `python3 tools/warriors/import-extra.py <sheet> <extra.png>`, then
re-measure necks + fists (tools/warriors/measure-necks.py; it also needs the run strips: add 'run-p1'/'run-p2' with frames r0..r7
to joints.json, foot (128,244)). Props draw in src/engines/dd/scenes.js drawBlock (PROP_W = how much wider than the footprint),
the bus in warriorsDD.js, the map in src/engines/dd/subwayMap.js (STOPS are poster fractions).
