# Sean of a Gun: picture brief for GPT

You are drawing art for **Sean of a Gun**, a side-scrolling run-and-gun game inspired by Broforce: tiny over-the-top action
heroes blasting through destructible levels, freeing caged prisoners and escaping by chopper. The heroes wear **the players'
own faces** (the game pastes a photo cut-out on the body), so every hero body is drawn **headless**.

There are eight worlds. The first four (Jungle, Factory, City, Desert) already play; four new ones just arrived:
- **Space** (moon base, orbital station, alien hive; low gravity): robots, face-hugging aliens, acid-spitting xenos, drones,
  hover tanks, turrets. Bosses: War Mech, The Mothership (UFO), Alien Queen.
- **Hell** (gates of Hell, the river Styx, the Beast's throne; lava everywhere): cultists, skeletons, imps, demons,
  hellhounds, a flaming chariot tank. Bosses: Cerberus, Bone Dragon, The Beast.
- **Upside Down** (a dark other dimension of floating rocks, vines, portals): crawlers, shades, wall tentacles, spores,
  floating eyeballs. Bosses: The Face-Flower, The Void Eye, The Shadow King.
- **Game World** (8-bit kingdom, a speedy green-hill "turbo zone", a glitched castle): mushroom walkers, shelled turtle
  troopers, jumping plumber goons, rolling spike hogs, pipe plants, shy ghosts, glitch sprites, bullet cannons.
  Bosses: King Shellbeard (fire-breathing turtle king), Dr. Eggbert (mad doctor in a hover pod with a wrecking ball),
  MISSING.EXE (a glitch monster made of corrupted pixels). These are **our own parody designs**: they nod to classic
  platformers but must not copy any real game's characters, logos or sprites.

**Style:** chunky, readable action-game art with bold dark outlines, punchy colour and a little grit, like a modern indie
pixel-art shooter (smooth painted pixel art is fine). Everything faces **RIGHT** (the game mirrors it). Transparent
background except skies and background strips. No text, no logos.

**Scale:** 4 px per game pixel. A soldier is ~80 px tall, a tile 64 px, bosses up to 320-400 px. Deliver at the template size
or exactly 2x. Open the template from `docs/broforce-sprites/templates/<slot>.png` and keep its layout:
- **red cross** = where the feet touch the ground (keep the feet exactly there in every frame),
- **cyan circle** (hero body only) = where the face goes: leave it **empty**, draw the neck below it,
- **yellow ring** (hero body only) = the gun hand (the game draws each hero's gun there),
- grey frames are unused: leave them empty.

## 1. The hero body (`bro-body`, 6 rows x up to 6 frames, 64 x 96 each)
Headless commando: tank top or vest, bandolier, combat trousers, boots, bare muscular arms, hands holding nothing (the
game adds the gun). Rows: idle (2), run (6), jump (1), fall (1), wall-climb (2), ladder (2).

## 2. Enemies (`foe-<type>`, rows: walk 4, attack 2)
One sheet per enemy type, faint copies of the game's own drawing are in each frame as a guide. First four worlds: `mook`
(balaclava soldier with rifle), `bomber` (suicide vest), `grenadier`, `bruiser` (huge minigunner), `dog` (attack dog).
New worlds: `robot`, `alien`, `xeno`, `drone`, `mechtank`, `turret`, `imp`, `demon`, `skeleton`, `hellhound`, `cultist`,
`chariot`, `crawler`, `shade`, `tentacle`, `spore`, `eyeball`, `shroom`, `shelly`, `plumber`, `hog`, `chomper`, `ghost`,
`pixel`, `cannon`. Fliers float in their frame (the cross is the bottom of the body); `tentacle` and `chomper` grow up out
of the ground / a pipe; `shelly` needs no shell frame (the game draws its kicked shell).

## 3. Bosses (`boss-<kind>`, rows: idle 2, move 4, attack 3)
`devil` (the first four worlds: a red horned devil with a pitchfork), `warmech`, `saucer`, `queen`, `cerberus` (three heads),
`bonedragon` (flying skeleton dragon), `beast` (giant horned demon, 400 px frames), `flower` (a petal-faced monster),
`voideye` (a giant floating eye with veins), `shadow` (a towering tentacled shadow, 400 px frames), `shellking`, `eggbot`,
`glitch`. Big, menacing, readable silhouettes; attack frames show the windup and the strike.

## 4. Tiles (`tiles-<world>`, 18 columns x 3 variants, 64 px cells)
Columns: dirt, brick, steel, wood, ladder, barrel (red, explosive), sandbags, platform (a thin plank at the top of the cell),
crate, rock, lava (or acid in space), spikes, jump-pad, glass, ? block, pipe, alien goo, crystal (explosive). Three
variants per tile so the ground doesn't repeat. Dirt/rock/brick/goo must tile seamlessly in all directions. Lava and the
ladder/platform/spikes/glass cells keep transparent space where nothing is.
Worlds: `jungle`, `factory`, `city`, `desert`, `space` (moon rock, metal panels), `hell` (scorched stone, bone brick),
`dimension` (dark violet rock, glowing veins), `games` (bright 8-bit bricks and grass).
Plus `top-<world>` (192 x 36): the edge strip drawn along the top of exposed ground (grass, snow, moon dust, embers...).

## 5. Backgrounds per world
`sky-<world>` (1600 x 900, opaque): the sky/space/void with its big feature (moon, planet, burning sky, the void's
lightning). `far-<world>` and `mid-<world>` (2400 x 600, transparent above the silhouettes, must tile left-right): distant
and nearer silhouettes (jungle canopy, factory chimneys, skyline, dunes, moon base domes and antennas, hell spires, floating
rocks and vines, 8-bit hills and bushes).

## 6. Props
`vehicle-<world>` (256 x 128): the extraction ride (jungle/desert/city/factory/hell: a gunship chopper; space: a dropship;
dimension: a battered chopper; games: an 8-bit blimp). `tree-<world>` (128 x 224): the world's standing prop. `cage` and
`cage-gold` (96 x 128, bars and frame only, empty inside), `flag` / `flag-up` (checkpoint pole with the enemy flag / your
flag), `pickup-nade`, `pickup-gun`.

Then the Arcade art for the new worlds' cards: `broforce-space`, `broforce-hell`, `broforce-dimension`, `broforce-games`
(key art 1600 x 900 per `docs/art-for-gpt/ARCADE-GAMES.md`). New Arcade backgrounds go through the Background Picker.
