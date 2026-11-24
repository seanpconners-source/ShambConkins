# The Price Is Right games (Plinko, The Big Wheel, Cliff Hangers, The Clock Game): art for GPT

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
