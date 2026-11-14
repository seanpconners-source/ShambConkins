# Sprite brief for ShambConkins: Banana Stand Tapper

Paste this whole brief into the image chat along with the templates in `templates/` (use the `@2x` ones for the people).

## What the game is
A two-player phone party game. This minigame is **Tapper** (the 1983 bar arcade game) re-themed on **Arrested
Development**: four bars stacked down the screen, customers shuffle in from a door on the LEFT toward the bartender on the
RIGHT, the bartender slides orders down the bar and catches the empties that slide back. Online, the two players work the
same room at once: each at their own end, mirrored.
The customers' and bartenders' **faces are real character photos the game puts on top**, so every person is drawn
**WITHOUT a head** (just a neck opening in the blue dashed circle).

## Art style (everything)
- **Extremely close to the look of Arrested Development**: clean WHITE backgrounds and walls, bright even daylight,
  plain bold sans-serif lettering (Helvetica-style), the show's palette: Bluth banana yellow, the banana stand's blue and
  white stripes, warm Orange County beige, chrome and black marble for the penthouse, cheap oak and drywall for the model
  home.
- **Flat, clean cartoon**: thin black outlines, flat colours with one soft shade, no heavy textures, no gradients-everywhere.
  Think a crisp storyboard / sitcom title card, not gritty pixel art.
- **Our own drawings**: no frames, logos or title cards copied from the show, no real actors' faces (the game adds faces).
- Transparent PNG (real alpha) for people, items, taps, doors, cash, logo. Backgrounds, floors, bars and title cards are
  opaque. Keep the layout of each template exactly (same canvas size or exactly 2x/4x, same anchors).

## 1. People (headless; faces go in the blue dashed circle; nothing below the red BAR TOP line is ever seen)
| file | frame | rows (frames) | what |
|---|---|---|---|
| bartender-p1.png | 160×200 | idle 2, pour 3, serve 2, run 4, catch 2, lose 2 | Player 1 behind the bar, seen from the front: white shirt, **Bluth's Original Frozen Banana uniform** apron in yellow with a blue stripe. serve = sliding an order to the LEFT down the bar; catch = grabbing an empty coming back; lose = arms up in despair. |
| bartender-p2.png | same | same | Player 2, the same uniform in **red and white**. |
| customer-1.png | 160×200 | walk 4, push 2, eat 2, angry 2 | Customer in Orange County casual (polo, khakis). walk = shuffling RIGHT toward the bartender; push = shoved back LEFT clutching the order; eat = eating/drinking it; angry = reached the end of the bar, banging the counter. |
| customer-2.png | same | same | Business suit (Bluth Company executive). |
| customer-3.png | same | same | Beach / boardwalk (tank top, board shorts). |
| customer-4.png | same | same | Cardigan and pearls (country-club). |

## 2. The three bars (one set per level; LEFT = customers' door, RIGHT = bartender's tap)
Levels: **stand** = Bluth's Original Frozen Banana stand on the Newport Beach boardwalk · **penthouse** = Balboa Towers,
the penthouse wet bar · **modelhome** = Sudden Valley, the model home kitchen (half-finished, cheap).

| file (× each level) | size | what |
|---|---|---|
| bg-<level>.png | 1080×1920 | The room behind the bars on an upright phone. The bars and people cover the lower half (shown on the template): keep that part a calm white wall/floor; put the interesting stuff (sign, windows, ocean, art, the level's name in plain lettering if you like) along the TOP and edges. |
| bg-<level>-wide.png | 1920×1080 | The same room for a sideways phone (bars cover the lower 80%). |
| floor-<level>.png | 512×512 | Seamless floor tile (boardwalk planks / white marble tile / bare plywood), seen slightly from above. Must repeat in both directions. |
| bar-<level>.png | 1024×200 | The bar counter seen from the front, a little from above: the TOP SURFACE in the top 30% (orders slide on it), the front panel below (stand: blue and white stripes, penthouse: white lacquer and chrome with a black marble top, model home: cheap oak laminate). Repeats LEFT↔RIGHT seamlessly. |
| tap-<level>.png | 200×280 | What the bartender serves from at the right end of each bar: a frozen-banana freezer / a martini station with a shaker and vodka / a pot of hot ham water on a hot plate. Stands on the floor; the red line is the bar top height. |
| door-<level>.png | 240×360 | Where the customers come in at the left end: a gap in the boardwalk railing with a sign post / the penthouse elevator / the unfinished front door. |
| item-<level>.png | 160×120 | The order sliding along the bar, side view, sitting on the red line: a chocolate-dipped **frozen banana** on a stick / a **vodka martini** / a mug of **hot ham water**. |
| empty-<level>.png | 160×120 | The empty coming back: the bare banana stick / the empty martini glass / the empty mug. |
| card-<level>.png | 1600×900 | OPTIONAL level title card, shown 2 seconds as the level starts: white card, the place name in plain bold black lettering, a small grey subtitle (like the show's location captions). |

## 3. Extras
| file | size | what |
|---|---|---|
| cash.png | 128×80 | A tip left on the bar: a little stack of bills ("there's always money in the banana stand"). |
| logo.png | 1200×480 | Title lettering **Banana Stand Tapper**, transparent, in the show's plain style (our own lettering, not the show's logo). |

## Hand back
File names exactly as above, PNG, delivered at 1x or exactly 2x/4x the template. Zip them up (zips over 100 KB) and
put them on Drive or in the chat; Claude drops them into `assets/tapper/`.

## Sound (the owner adds these himself, no art needed)
`assets/music/tapper-song-<level>.mp3` (or `tapper-song.mp3`) = a level's song; `tapper-narr-<moment>-<n>.mp3` = narrator
clips with moment start / level / clear / lose / win / end / any. See `src/engines/tapperAudio.js`.
