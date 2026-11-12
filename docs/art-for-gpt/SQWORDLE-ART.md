# Sqwordle art (Nov 12; moves, effects and backgrounds added later the same day)

Sqwordle is our Wordle-style word game, the whole thing themed on Squirtle (the little blue turtle Pokémon). The game
works now with a placeholder turtle we drew in code; these pictures replace it. Same rules as `START-HERE.md`.

**Character rule:** draw it as a tribute in your own style: a cute, chubby little blue turtle with big friendly eyes, a
curly tail and a brown-and-cream shell, the way a fan would paint Squirtle. Don't copy or trace official Pokémon artwork,
and don't put a Pokémon logo in anything. No words except the logo.

Palette to match the game: Squirtle blue **#3a95d6**, shell gold **#d39a3a**, shell brown **#b8733a**, cream **#f1d58e**,
greys like the real word game's tiles (**#787c7e**).

## A. Arcade (the game's tile and page in the Arcade)

**sqwordle-icon.png** (512x512, transparent)
> A chubby little blue turtle with a brown shell popping up out of a row of five square letter tiles (blue, gold and grey),
> grinning and squirting a little arc of water, as a glossy app icon. Bold, readable at small size. No letters on the
> tiles.

**sqwordle-logo.png** (about 1100 px wide, transparent)
> The word "SQWORDLE" as a game logo: bold rounded letters, each sitting on its own square tile like a word-game row, the
> tiles in Squirtle blue and shell gold, a little cartoon turtle peeking over the last tile, water droplets splashing. Our
> own lettering.

**sqwordle.png** (background, 1600x900; goes through the Background Picker)
> Arcade key art: a sunny lakeside, a huge glowing word-game grid of square tiles floating over the water (blue, gold and
> grey tiles, no letters), a chubby little blue turtle with a brown shell surfing a wave of water across the front. Sean
> (bearded man) and Amber (smiling woman with short brown hair) in the upper middle, cheering, faces clearly visible and
> facing the viewer, never at the edge. Bright, fun, painted video-game-box style. No words.

## B. In the game (`assets/sqwordle/`)

The turtle's head sits next to the title and pops up from under the grid when you win or lose. Square pictures,
transparent background, the face centred and filling about 80% of the square, the top of the shell just showing below the
chin. About 512x512.

**mascot.png**: the turtle's head, happy and calm, looking at the viewer, a small smile.

**mascot-happy.png**: the same turtle cheering: eyes closed with joy or sparkling, mouth wide open, a little splash of water
coming out of its mouth.

**mascot-sad.png**: the same turtle sad: eyes squeezed shut or looking down, wobbly frown, one big tear.

**logo.png** (optional, about 900x180, transparent): a small, flat version of the "Sqwordle" wordmark for the game's header
bar, dark letters that read on white AND on near-black (or two files: `logo.png` light-background, the game picks it as is).

**mascot-think.png** (new, Nov 12): the same head, puzzled: one brow up, eyes looking up and to the side, mouth a little
squiggle. Shows when a guess isn't a real word. (mascot-happy shows when a guess gets new blue tiles, mascot-sad when a guess
is all grey.)

## C. Squirtle's moves (whole body, `assets/sqwordle/body-<pose>.png`)

When you get the word, the turtle rises up where the keyboard was and does a move picked by how many guesses you needed,
aimed at your winning row: 1 = SQUIRTLE SQUIRT! (Hydro Pump + bubbles + rainbow), 2 = Hydro Pump, 3 = Bubble Beam,
4 = Water Gun, 5 = Withdraw (spins in its shell), 6 = Phew. A miss = it cries. The game moves, spins and squashes the
pictures and draws the water itself from the mouth spot, so each pose is ONE still picture.

Use the templates in `sqwordle-templates/` (768x768, transparent): the whole turtle FACING RIGHT, feet on the red line with
the red cross between them, body inside the dashed box, its mouth on the blue ring, its eye near the cyan ring. The grey
drawing is ours, for size and pose only: draw over it in your own style. Make **body-idle** first and use it as the model
for the others so it's the same turtle every time.

| file | pose |
|---|---|
| body-idle.png | standing, calm, happy |
| body-aim.png | WATER GUN: leaning forward, lips pursed, about to squirt |
| body-blow.png | BUBBLE BEAM: cheeks puffed, blowing |
| body-brace.png | HYDRO PUMP: feet planted wide, mouth wide open, bracing |
| body-shell.png | WITHDRAW: just the shell, head/arms/legs/tail pulled in (holes showing) |
| body-cheer.png | both arms up, jumping for joy |
| body-phew.png | wiping its brow with one hand, relieved |
| body-sad.png | crying, arms down, head low |

Optional: a little loop for any pose as frames `body-<pose>-1.png`, `-2`, ... (same template, played 8 a second).

## D. Water effects (`assets/sqwordle/fx-<name>.png`, transparent)

| file | size | what |
|---|---|---|
| fx-jet.png | 512x128 | a water stream flowing left → right; the left and right edges must join (it's repeated along the jet) |
| fx-hydro.png | 512x256 | the same for the THICK Hydro Pump blast, foamy and powerful; edges join left/right |
| fx-bubble.png | 256x256 | one shiny bubble |
| fx-drop.png | 128x128 | one water droplet, pointed end up, round end down (used for splashes, tears and sweat) |
| fx-splash.png | 512x512 | an impact splash burst, centred (where the water hits the row) |
| fx-rainbow.png | 1024x512 | a rainbow arc, its two ends on the bottom edge |
| fx-sparkle.png | 256x256 | one star sparkle |

## E. Backgrounds (`assets/sqwordle/bg*.png`, no transparency, no words)

The whole screen behind the game. The grid and keyboard sit on frosted panels on top (see the shaded boxes in
`sqwordle-templates/bg.png` / `bg-wide.png`), so the picture shows around them; the title bar stays solid. Cropped to fit every
phone, so keep the interest spread out and the edges nice.

| file | size | what |
|---|---|---|
| bg.png | 1080x1920 | phone, light mode: a sunny lake or beach, soft water, lily pads, bubbles, gentle and bright |
| bg-dark.png | 1080x1920 | phone, dark mode: the same place at night, moonlit water, fireflies, deep blues |
| bg-wide.png | 1920x1080 | sideways/tablet, light |
| bg-wide-dark.png | 1920x1080 | sideways/tablet, dark |

## Hand-back (for Claude)
Section A: `art-inbox/arcade/` → `python3 tools/import-arcade-art.py art-inbox/arcade` (then the Background Picker for the
background). Sections B-E: `art-inbox/sqwordle/` → `assets/sqwordle/<name>.webp` lossless (heads 512, bodies 768 on the template canvas,
effects at their size, backgrounds as delivered); the game uses each one as soon as it's there (src/engines/sqwordleArt.js
`picture()`), our drawing stays as the fallback for anything missing. Bodies: check each sits on the template (feet at 96% of
the height, body box 90%) and measure the mouth/eye spots into `POSES` in sqwordleArt.js if they're off the rings. Green
backgrounds: key them out. Templates: `node tools/sqwordle-templates.mjs` (→ sqwordle-templates/), stand-ins with
`--standin <dir>`. Check in play: `node tests/sqwordle.mjs` + a win in 1-6 guesses.
