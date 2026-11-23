# Plinko + The Big Wheel: art for GPT

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
