# The Price Is Right games (Plinko, The Big Wheel, Cliff Hangers, The Clock Game, Range Game, Safe Crackers, Race Game, Punch-a-Bunch): art for GPT

Two TV-game-show games: **Plinko** (`plinko-show`) and **The Big Wheel** (`big-wheel`). They share one studio, one host and two
show assistants. Everything is **our own**: an original host and original assistants (not any real host, model or celebrity),
our own logos (no real show logo), our own studio set. The look: a big, bright 1970s-80s daytime game-show studio.

**Templates:** `docs/art-for-gpt/gameshow-templates/` (`node tools/gameshow-templates.mjs` rebuilds them). Every slot has a
`-template.png` (pink guides) and a `-reference.png` (what the game draws today). **Make each picture at exactly the template's size.**

**Hand back:** PNG files named like the slot (`host.png`, `plinko-board.png`, ...). Claude puts them in `assets/gameshow/`
(lossless WebP). Any picture that is missing is still drawn by the game.

## Style for every picture (paste this first)

> Bright 1970s-80s American daytime TV game show, painted like a glossy illustration: saturated orange, hot pink, electric
> blue, gold, chrome and hundreds of glowing light bulbs, sparkly curtains, shiny floor. ORIGINAL people only (no real host,
> model or celebrity likeness), no real show logos or names, no text unless the slot asks for it.

## The pictures

| Slot | Size | Prompt (after the style text) |
|---|---|---|
| `stage-plinko` | 1920x1080 | The studio for the Plinko game, wide: a colourful set with big circles of light bulbs, coloured panels, a shiny stage floor along the pink line, an audience edge at the bottom. The board stands in the middle (the dashed box): keep that area calm and darker. |
| `stage-plinko-tall` | 1080x1920 | The same studio for an upright phone; the board fills the dashed box. |
| `stage-plinko-fold` | 1504x1670 | The same studio for near-square screens (Sean's open Fold); keep the middle calm. |
| `stage-wheel` | 1920x1080 | The studio for the Big Wheel: similar set, more chrome and spotlights. The wheel stands in the middle (dashed box): keep it calm. |
| `stage-wheel-tall` | 1080x1920 | The same, upright. |
| `stage-wheel-fold` | 1504x1670 | The same studio for near-square screens (Sean's open Fold); keep the middle calm. |
| `curtain` | 1920x1080 | The studio curtain that rises at the start: shimmering red-and-gold sequinned curtain filling the whole frame. |
| `plinko-board` | 1800x2544 | The Plinko board seen straight on, WITHOUT pegs, chips or prize numbers: a tall board with a gold frame, a backing in deep blue with diagonal light streaks, a row of bulbs across the top, and nine slot boxes at the bottom exactly on the template's boxes (left blank: the game prints the prizes). Keep the backing plain where the pink peg circles are (the game draws the pegs). |
| `plinko-chip` | 256x256 | One Plinko chip seen face on: a thick round puck, glossy white with a grey ring and ridged edge. Transparent around. |
| `plinko-logo` | 1400x500 | The word **PLINKO** as a lit-up game-show sign: chunky bubbly letters with chasing bulbs, transparent around. Our own design. |
| `wheel-logo` | 1400x500 | **THE BIG WHEEL** as a lit-up game-show sign, transparent around. Our own design. |
| `wheel-frame` | 900x1500 | The tall wheel cabinet seen straight on: chrome side rails covered in bulbs, a top crown and a heavy base, with a SEE-THROUGH window exactly on the template's pink box (the game draws the turning numbered sections inside it). Transparent outside the cabinet. |
| `host` | 1536x1024 | Our own game-show host, full body, three poses side by side (TALK, POINT, CHEER): an original character, a dapper silver-haired showman in his 60s with a big smile, a light grey suit and a long thin microphone. Feet on the pink dot in each box. Transparent background. |
| `model` | 1536x1024 | Show assistant 1, full body, three poses (PRESENT with an open arm, WAVE, CLAP): an original character, glamorous, in a sparkly sequinned evening gown. Feet on the dot. Transparent. |
| `model-2` | 1536x1024 | Show assistant 2: a different original person and gown colour, same three poses. Transparent. |
| `nametag` | 512x256 | A contestant's price-tag-shaped name tag (white card, red border, a hole with a string), BLANK (the game writes the name). Transparent around. |

## Cliff Hangers (`cliff-hangers`, inside The Price Is Right)

Lay it out **just like the show's Cliff Hangers**: a big painted alpine mountain prop with a trail climbing from the bottom left to
a flat ledge at the top right that ends in a sheer cliff, and a little yodeling mountain climber in lederhosen who walks up it one
step per dollar. Same layout and characters as the show, painted fresh in our style (the classic-era show look GPT used for the
host and assistants). Templates: `cliff-*` and `stage-cliff*` in `gameshow-templates/` (`node tools/gameshow-templates.mjs --only='cliff-*,stage-cliff*'`).

| Slot | Size | Prompt (after the style text) |
|---|---|---|
| `cliff-mountain` | 1600x1000 | The Cliff Hangers mountain prop seen straight on, like the show's: snowy grey-blue alpine peaks behind, a big brown rocky climbing face in front with a pale trail running EXACTLY along the template's pink line from STEP 0 (bottom left, among pine trees) up to STEP 25, then a short flat snowy ledge to the CLIFF EDGE and a sheer vertical cliff face down the right side. Keep the dashed band under the trail plain rock: the game puts the 26 step ticks and the numbered signs 0, 5, 10, 15, 20, 25 there. NO numbers or text in the picture. Transparent around the mountain. |
| `cliff-climber` | 2048x320 | The show's little mountain climber (the yodeler): a cheerful small man in brown lederhosen with braces, white shirt, knee socks, hiking boots, a green Tyrolean hat with a feather, a small backpack and a walking stick. 8 poses, one per 256x320 box, feet on the pink dot, facing RIGHT (up the mountain): STAND, WALK 1-4 (a full walking cycle), YODEL (arms up, mouth open), TEETER (on the edge, arms windmilling), FALL (upright, arms and legs flailing; the game spins him as he drops). Same size in every box (head near the top of the box). Transparent. |
| `cliff-stand` | 600x600 | A small-prize pedestal like the show's prize tables: a glossy purple/gold podium with a round top (the game stands the prize photo on the pink dot), a dark lit price display window on the front exactly in the pink box (the game prints the guess and the price in it), a row of bulbs below. Transparent around. |
| `cliff-logo` | 1400x500 | **CLIFF HANGERS** as the show's game sign: chunky letters in icy blue and white with chasing bulbs, maybe a little snowcap on the letters. Transparent around. |
| `stage-cliff` | 1920x1080 | The Cliff Hangers studio, wide: the show's set with a painted alpine sky backdrop (blue sky, clouds, distant snowy mountains, a green meadow line), bulb-lit set pillars at the sides, a shiny stage floor along the pink line. The mountain prop stands in the left dashed box (keep it calm there), the prize stands and keypad on the right. |
| `stage-cliff-tall` | 1080x1920 | The same studio for an upright phone: mountain in the top dashed box, prizes below. |
| `stage-cliff-fold` | 1504x1670 | The same studio for near-square screens (Sean's open Fold). |

## The Clock Game (`clock-game`, inside The Price Is Right)

Lay it out **just like the show's Clock Game**: a giant round clock with a red sweep hand beside the prize, a lit price display
under the prize, and the host calling HIGHER / LOWER. Same layout as the show, painted fresh in our style. Templates: `clock-*` and
`stage-clock*` in `gameshow-templates/` (`node tools/gameshow-templates.mjs --only='clock-*,stage-clock*'`).

| Slot | Size | Prompt (after the style text) |
|---|---|---|
| `clock-face` | 1000x1000 | The show's big Clock Game clock seen straight on: a chunky round frame in bright game-show colours with chasing bulbs, a white face with 60 black second ticks (long ones every 5) and the numbers 5, 10 ... 60 around it, centre EXACTLY in the middle on the pink dot. NO hand (the game turns its own). Transparent around the clock. |
| `clock-hand` | 120x520 | The red sweep second hand pointing straight up: a long slim red needle from the PIVOT dot to the TIP, a short tail below, a round black-and-red hub on the pivot. Transparent. |
| `clock-display` | 900x300 | The price display like the show's: a glossy board with bulbs round the edge and a dark window exactly in the pink box (the game prints $ and the price in red LEDs). Transparent around. |
| `clock-platform` | 800x500 | A glossy round prize turntable/platform seen from the front, gold top, the prize photo stands on the pink dot (the game draws it). Transparent around. |
| `clock-logo` | 1400x500 | **CLOCK GAME** as the show's game sign: big lit-up letters in red and gold, maybe a little clock for the O. Transparent around. |
| `stage-clock` | 1920x1080 | The Clock Game studio, wide: the show's bright set, bulbs and coloured panels, a shiny stage floor along the pink line. The clock stands in the left dashed box (keep it calm), the prize and keypad on the right. |
| `stage-clock-tall` | 1080x1920 | The same studio for an upright phone: clock in the top dashed box. |
| `stage-clock-fold` | 1504x1670 | The same studio for near-square screens (Sean's open Fold). |

## Range Game (`range-game`, inside The Price Is Right)

A big prize on a turntable, a TALL price board with a vertical scale, and a lit $1,500 RANGE FINDER that slowly rises up the board until
the contestant hits the big red button. The game prints every $ number and moves the finder; the prize stands on `clock-platform`.

| Slot | Size | Prompt (after the style text) |
|---|---|---|
| `stage-range` / `-tall` / `-fold` | 1920x1080 / 1080x1920 / 1504x1670 | The Range Game studio: warm orange and gold set, bulbs, shiny floor on the pink line. Keep the dashed box calm (board + prize + button go there). |
| `range-board` | 600x1600 | The tall price board seen straight on: a purple-and-gold frame lined with bulbs, a vertical SCALE STRIP inside the pink box (glowing green at the bottom fading to yellow then red at the top). NO numbers or $ signs. Transparent around. |
| `range-finder` | 260x400 | The range finder: a bright lit yellow frame (chunky, with little bulbs) around a SEE-THROUGH window exactly in the pink box. Transparent inside the window and around. |
| `range-button` | 400x400 | A big round red arcade-style stop button on a chrome pedestal, seen from the front, glossy. Transparent around. |
| `range-logo` | 1400x500 | RANGE GAME in big lit-up game-show letters (our own design). Transparent. |

## Safe Crackers (`safe-crackers`, inside The Price Is Right)

Two prizes go into a GIANT steel safe; the contestant puts three digits in order on the combination plate and gets one try.

| Slot | Size | Prompt (after the style text) |
|---|---|---|
| `stage-safe` / `-tall` / `-fold` | 1920x1080 / 1080x1920 / 1504x1670 | The Safe Crackers studio: a bank-vault look in game-show colours (steel, gold, spotlights, bulbs). Keep the dashed box calm. |
| `safe` | 1000x1100 | The giant safe with the door SHUT, seen straight on: brushed steel, rivets, hinges on the left, a brass COMBINATION plate with three dark digit windows exactly in the pink DIAL box (no digits), a big spoked chrome handle at the pink circle. Transparent around. |
| `safe-open` | 1000x1100 | The SAME safe with the door swung open to the left: inside (pink box) a warmly lit empty cabinet with two shelves (the game puts the prizes there). Same size and position as `safe`. Transparent around. |
| `safe-tile` | 300x360 | A lit gold number tile with a dark centre panel (pink box) and NO number (the game prints the digit). Transparent around. |
| `safe-logo` | 1400x500 | SAFE CRACKERS in big lit-up game-show letters. Transparent. |

## Race Game (`race-game`, inside The Price Is Right)

Four prizes on podiums, four price tags, a 45-second clock and a lever board that lights up how many tags are right.

| Slot | Size | Prompt (after the style text) |
|---|---|---|
| `stage-race` / `-tall` / `-fold` | 1920x1080 / 1080x1920 / 1504x1670 | The Race Game studio: racing-stripe set in blue, white and gold with checkered-flag touches, bulbs. Keep the dashed box calm. |
| `race-podium` | 600x700 | A glossy blue prize podium seen from the front, gold top rim; the prize stands on top (pink box, leave it empty); a small hook on the front at the pink circle where a price tag hangs. Transparent around. |
| `race-tag` | 520x240 | A big blank cream price tag with a red border and a hole on the left; the game prints the price in the pink box. Transparent around. |
| `race-board` | 1000x500 | The lever board: a dark lit panel with CORRECTLY PRICED in gold letters across the top and four round lamps (OFF, dark amber glass) exactly at the four pink circles. Transparent around. |
| `race-lever` | 200x520 | A big upright lever: chrome bar with a red ball handle at the top, the pivot at the pink circle at the bottom. Transparent. |
| `race-logo` | 1400x500 | RACE GAME in big lit-up game-show letters. Transparent. |

## Punch-a-Bunch (`punch-a-bunch`, inside The Price Is Right)

Higher or lower on four small prizes; every right answer is a punch on a 50-hole punchboard (5 rows of 10) hiding cash slips up to $25,000.

| Slot | Size | Prompt (after the style text) |
|---|---|---|
| `stage-punch` / `-tall` / `-fold` | 1920x1080 / 1080x1920 / 1504x1670 | The Punch-a-Bunch studio: hot pink and gold set, bulbs, a boxing-glove motif. Keep the dashed box calm. |
| `punch-board` | 2000x1160 | The punchboard seen straight on: a big red-and-gold frame with PUNCH-A-BUNCH in lit letters across the top, and inside the pink GRID box a dark backing with 50 round hole rims in 5 rows of 10 (the game draws the paper on each hole). Transparent around. |
| `punch-paper` | 200x200 | One hole covered with shiny gold foil paper (not punched), seen straight on, filling the pink circle. |
| `punch-slip` | 640x320 | The unfolded paper slip that comes out of a hole: crisp cream paper with a red border and a fold line; blank in the pink box (the game prints the $). Transparent around. |
| `punch-logo` | 1400x500 | PUNCH-A-BUNCH in big lit-up game-show letters. Transparent. |
