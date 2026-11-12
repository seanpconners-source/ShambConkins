# Sqwordle art (Nov 12)

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

## Hand-back (for Claude)
Section A: `art-inbox/arcade/` → `python3 tools/import-arcade-art.py art-inbox/arcade` (then the Background Picker for the
background). Section B: `art-inbox/sqwordle/` → `assets/sqwordle/<name>.webp`, 512 px lossless; the game uses each one as
soon as it's there (src/engines/sqwordle.js `picture()`), the drawn turtle stays as the fallback.
