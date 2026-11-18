# Crappy Crush art (Nov 18)

Crappy Crush is our Candy Crush: the board pieces are the item pictures we already have (`assets/items/`), so nothing is
needed for the pieces. What it still needs is the Arcade tile (icon, logo, background) and one background per world.
Same rules as `START-HERE.md`.

## A. Arcade (tile, logo, background)

**crappy-crush-icon.png** (512x512)
> A glossy candy-colored app icon: a cute smiling cartoon poop swirl (brown, with a big friendly grin) wearing a little
> gold crown, sitting on a pile of shiny candy-like game pieces. Bright pink and gold, readable at small size. No words.

**crappy-crush-logo.png** (about 1100 px wide, transparent)
> The words "CRAPPY CRUSH" as a candy-game logo: big glossy rounded letters, CRAPPY in caramel gold, CRUSH in hot pink,
> a little cartoon poop swirl with a crown leaning on the last letter, sugar sparkles. Our own lettering.

**crappy-crush-art.png** (background, 1600x900; goes through the Background Picker)
> Arcade key art: a giant candy-game board of glowing square tiles floating in a pink-and-purple sky, the pieces are funny
> props (a ham with pineapple rings, a milk jug, red mittens, a mushroom, a duck), striped glowing pieces exploding,
> a golden toilet glowing on the board. Sean (bearded man) and Amber (smiling woman with short brown hair) in the upper
> middle, laughing, faces clearly visible and large.

## B. World backgrounds (tall 1080x1920, no people needed, no words)

Each sits behind the board of that world and on the stage map, so keep the middle calm and not too busy (the board covers
it) and the colors rich. Painted, cheerful candy-game style. Put the files in `art-inbox/crappycrush/` with these names:

**candyland.png** (Candy Land, Candy Land)
> a giant board-game candy kingdom: gumdrop mountains, licorice fences, a molasses swamp, lollipop trees, a gingerbread path winding up into the sky.

**paddys.png** (Paddy's Pub, Always Sunny)
> the inside of a grimy Philadelphia Irish dive bar at night: green walls, a long wooden bar, neon beer signs, a shamrock on the mirror, rum hams on the shelf.

**mariokart.png** (Rainbow Road, Mario Kart)
> a glowing rainbow racetrack spiraling through outer space, stars and planets, item boxes floating along the road.

**pokemon.png** (Pallet Town, Pokémon)
> a sunny little starter town with rolling green hills, a red-roofed lab, tall grass, a few round red-and-white capture balls in the grass.

**southpark.png** (South Park, South Park)
> a snowy cut-out-paper-style mountain town: a bus stop, little houses, pine trees, flat bright colors in the papercraft style.

**office.png** (Dunder Mifflin, The Office)
> a drab paper-company office bullpen: desks, a water cooler, fluorescent lights, a World's Best Boss mug on a desk.

**sonic.png** (Green Hill, Sonic the Hedgehog)
> a bright checkered-dirt hillside with loops, palm trees, golden rings floating in the air, blue ocean behind.

**smb3.png** (Mushroom Kingdom, Super Mario Bros. 3)
> a storybook mushroom kingdom stage set with curtains, giant mushrooms, pipes, floating blocks and a castle on a hill.

**zelda.png** (Hyrule, The Legend of Zelda)
> a fantasy kingdom field: green hills, a castle in the distance, a forest edge, a glowing fairy fountain.

**lebowski.png** (The Lanes, The Big Lebowski)
> a 1990s bowling alley at night: neon lanes, pins, a bowling ball return, retro carpet, a cocktail on the bench.

**castlevania.png** (Dracula's Castle, Castlevania)
> a gothic vampire castle at night: moonlit towers, candles on the walls, stained glass, bats.

**bond.png** (MI6, James Bond)
> a glamorous 1960s spy casino and secret lair: chandeliers, a roulette table, a tuxedo, a hidden laser room behind.

**clue.png** (Tudor Mansion, Clue)
> a dark old English mansion: a library with a fireplace, candlesticks, secret passages behind bookshelves, a magnifying glass.

**monopoly.png** (Boardwalk, Monopoly)
> a giant property-trading board game city: houses, hotels, a railroad, a jail corner, a free-parking lot, play money blowing in the wind.

**taskmaster.png** (The Taskmaster House, Taskmaster)
> a quirky English cottage set for a comedy task show: a garden, a caravan, a little shed, a big gold bust on a table, a rubber duck.

**startrek.png** (The Enterprise, Star Trek)
> the bridge of a 1960s starship: colorful consoles, a viewscreen of a planet, a transporter pad glowing.

**dbz.png** (Kame House, Dragon Ball Z)
> a tiny pink house on a small island in a bright blue ocean, palm tree, a golden flying cloud in the sky, glowing orange balls.

**hxh.png** (Greed Island, Hunter × Hunter)
> a magical game-world island: lush forests, a giant spellbook floating, cards of light swirling in the air, a mysterious tower.

**matrix.png** (The Construct, The Matrix)
> a white empty construct loading program fading into falling green computer code, a red leather chair and an old TV.

Import (Claude): convert each to webp at 1080x1920 into `assets/crappycrush/<world>.webp` (`python3 tools/optimize-art.py`),
build. Missing worlds fall back to a gradient in the world's colors.
