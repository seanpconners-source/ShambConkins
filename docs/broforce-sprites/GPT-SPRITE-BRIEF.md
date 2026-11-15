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

---

# ROUND 2 (Nov 14): everything the game still draws itself

Round 1 is in the game. The game still draws these itself, so they all get pictures now. Same style, same scale (4 px per
game pixel), everything faces RIGHT, transparent background (except the big ground pictures), deliver at the template size
or exactly 2x. Templates: `docs/broforce-sprites/templates/<slot>.png`. **Red cross** = the anchor point the game places.

## R2-1. The big ground (most important: makes the land look like land)
`ground-<world>` and `rock-<world>` (1024 x 1024, fully opaque, all 8 worlds = 16 pictures). ONE big seamless picture of
packed earth / soil (`ground`) or rock / stone (`rock`), seen from the side like a cut through the ground. The game lays it
across every dirt / rock block by position, so the land reads as one continuous piece of ground instead of a grid of squares;
single blocks still crack and break out of it. It **must tile**: left edge joins right edge, top joins bottom. No block
outlines, no grid, no grass on top (the grass strip `top-<world>` stays). 64 px = one block, so stones/roots ~20-120 px.
Look per world: jungle = dark loam with roots and pebbles; factory = oily packed dirt with slag; city = rubble-filled earth;
desert = sandstone layers; space = grey moon regolith; hell = scorched black-red rock with ember cracks; dimension = dark
violet earth with faint glowing veins; games = classic bright orange-brown 8-bit dirt with darker speckles.

## R2-2. Guns in the hero's hand (`gun-<weapon>`, 112 x 48 each, 15 guns)
rifle (assault rifle), shotgun, rocket (shoulder rocket launcher), flame (flamethrower with a back tank stub), pistols (two
pistols, one above the other), laser (sci-fi laser rifle), plasma (plasma cannon), railgun (long rail gun), pulse (pulse
rifle), minigun (6-barrel minigun), lightning (tesla coil gun), holy (holy water pistol / ornate crucifix gun), fireball
(fire-flower style blaster), boomerang (held boomerang), ring (ring launcher). Side view, barrel pointing RIGHT; the
**grip / hand point on the red cross**, muzzle at the right end (yellow arrow). Just the gun, no hand or arm.

## R2-3. Dead bodies (`dead-<enemy>`, one per enemy = 30, plus `dead-bro`)
Each enemy lying dead on the ground (head to the RIGHT), a bit of blood is fine; the bottom edge is the ground. Sizes differ
per enemy (follow the template). Tanks, turrets and cannons = a burnt-out smoking wreck. Fliers = fallen and broken.
`dead-bro` (128 x 64): a dead hero on his back, **headless**: leave the cyan circle empty (the game puts the player's face).
Enemy list: mook, bomber, grenadier, bruiser, dog, robot, alien, xeno, drone, mechtank, turret, imp, demon, skeleton,
hellhound, cultist, chariot, crawler, shade, tentacle, spore, eyeball, shroom, shelly, plumber, hog, chomper, ghost, pixel,
cannon (same looks as their round-1 sheets).

## R2-4. Shots and bullets
`shot-<kind>` (centre = the shot): rocket 48x16 and missile 48x16 (nose RIGHT), nade 16x20 (hand grenade), plasma 48x48
(glowing ball), holy 32x32 (holy water vial), fire 32x32 (fireball), boomer 48x24 (boomerang), acid 24x24 (green acid
blob), bone 40x16, hammer 40x32, shell 32x32 (cannon ball), bomb 32x32 (round bomb with fuse), drop 32x40 (falling lava
drop), bill 48x40 (a bullet-shaped cannon shell with a face, our own design), pixel 24x24 (glitch pixel), orb 24x24
(generic enemy energy orb). Spinning ones are spun by the game: draw them still.
`bullet-<kind>`: the RIGHT end is the bullet's head, a short streak trailing left: bullet-p 32x8 (heroes, warm yellow),
bullet-e 32x8 (enemies, orange-red), bullet-laser 64x8 (blue), bullet-rail 96x12 (cyan beam), bullet-pulse 32x16 (violet
bolt), bullet-mini 24x6 (minigun tracer), bullet-ring 20x24 (a gold ring).

## R2-5. Effect animations (one row of frames, left to right; red cross = anchor)
fx-explosion (8 x 128x128): flash, fireball, smoke clearing. fx-smoke (6 x 64x64) puff. fx-blood (6 x 64x64) splat.
fx-gibs (6 x 96x96) blown apart: blood + chunks flying out. fx-impact (4 x 32x32) bullet sparks + chip. fx-dust (5 x 48x32)
foot dust, bottom = ground. fx-rubble (6 x 64x64) block breaking into chunks + dust. fx-fire (6 x 48x64, loops) a flame,
bottom = its base. fx-rescue (6 x 96x96) sparkle burst when a prisoner is freed. fx-muzzle (3 x 48x32) muzzle flash starting
at the LEFT middle, blasting right. fx-firewave (4 x 64x64, loops) fire wall rolling along the ground. fx-geyser
(4 x 48x128, loops) lava jet up from the ground. fx-beam (4 x 64x256, loops) a vertical boss beam (stretched by the game).
fx-pillar (4 x 64x256, loops) fire/energy pillar from the ground. fx-lightning (4 x 128x32, loops) bolt from left to right
(stretched between two points). portal (6 x 96x96, loops) swirling warp portal.

## R2-6. Small stills
fx-tentacle (64 x 256): a giant tentacle rising from the ground. firebar-ball (24x24) one fireball of a spinning fire bar.
ring-pickup (24x24) a gold collectible ring, face-on. shell-casing (16x8) an empty brass casing. crack-1 / crack-2 (64x64):
cracks laid over a damaged block, light and heavy; transparent except the cracks.

## R2-7. Two redraws from round 1
`foe-hog` and `boss-eggbot` came back as Sega's real Sonic and Dr. Eggman, so the game can't use them. Redraw as **our own**
designs, same template: foe-hog = a rolling spiked armadillo-hedgehog robot (not blue, no Sonic look); boss-eggbot =
"Dr. Eggbert", a bald mad scientist with a huge grey moustache and goggles in a round hover pod with a wrecking ball on a
chain (no red jacket, no Eggman face).

# ROUND 3 (Nov 15): the hero holds his guns, a real run cycle, the last drawn props

Rounds 1 and 2 are in and the owner loves the style: **keep exactly the same look** (same muscular headless bro, same
gun pictures, same painted props). Same scale (4 px per game pixel), everything faces RIGHT, transparent background,
deliver at the template size or exactly 2x. Templates: `docs/broforce-sprites/templates/<slot>.png`.
Marks: **red cross** = anchor, **magenta circle + cross** = shoulder, **yellow ring** = the hand on the gun's grip,
**cyan** = where the game puts the player's face (leave it empty: NO HEAD).

## R3-1. The hero WITHOUT arms (`bro-torso`, 7 rows, 64 x 96 frames)

The same bro as `bro-body`, but with **no arms**: the shoulder ends in a clean rounded deltoid on the magenta cross
(the arms come as a separate picture per gun, R3-2). The faint figure in each frame is the current body: match its
size, proportions, colours and camo exactly.
- `idle` 2 frames: standing, slight breathing.
- `walk` 8 frames: a calm walk cycle (right foot contact, down, passing, up, then the left leg the same).
- `run` 8 frames: a smooth, even run cycle (contact, down, passing, up for each leg), torso leaning forward a little,
  small even bob. The current run row is the problem (knee-up kicks): do NOT copy it.
- `jump` 1, `fall` 1, `climb` 2 (pushing up a wall, legs scrambling).
- `ladder` 2: this row KEEPS both arms, hands on the rungs (no gun).
- Keep the shoulder on (or very near) the magenta cross in every frame; feet on the red cross.

## R3-2. Arms holding each gun (`arms-<weapon>`, 15 sheets, 160 x 80 frames: `hold` 1 + `fire` 4)

Both muscular arms + gloved hands + the gun as ONE picture. The faint gun in every frame is the existing `gun-<weapon>`
picture: use **the same gun at the same size**. The upper arm starts at the magenta shoulder, the front hand closes
round the gun's grip on the yellow ring, the barrel tip sits on the red cross (in `hold`). The back arm supports the
gun (fore-grip / under the barrel / on the tube) and is mostly behind it. Nothing above the shoulder line except a
shoulder-mounted rocket tube (the game draws the face on top of everything).
- `hold`: aiming straight forward.
- `fire` 1-4 (the game plays them on every shot; fast guns loop 1-2): the label under each frame says what happens, e.g.
  rifle = kick back + muzzle rises / recover / bolt back / forward; shotgun = big kick / recover / pump back / pump
  forward; rocket = jolt / recover / back hand loads a new rocket / settle; minigun = barrels spinning (motion blur) in
  all four; pistols = front pistol kicks / recovers / back pistol kicks / recovers; holy water, fire flower, boomerang
  = a throwing motion (the thing leaves the hand in frame 2, a new one is back in frame 4).
- NO muzzle flash, smoke or bullets: the game adds those at the red cross.

## R3-3. Props the game still draws (bottom middle = where it stands unless noted)

- `prop-brazier` (sheet, `burn` 4 frames, 64 x 96): a rusty oil-drum fire barrel, flames roaring out of the top, looping.
- `prop-banner` (sheet, `wave` 4 frames, 96 x 128): enemy war banner, pole at the LEFT edge, cloth waving.
- `prop-tower` 192 x 384: wooden enemy watchtower, roofed lookout at the top, ladder on one leg (the game stretches it).
- `prop-lamp` 32 x 64: hanging cage lamp on a short cord; TOP middle = where it hangs (the game adds the glow).
- `prop-post` 24 x 64: one wooden fence post (the game strings rope between two).
- `prop-wire` 96 x 32: coiled barbed wire on the ground, tiles left to right seamlessly.
- `prop-searchlight` 64 x 192: searchlight on a tall pole, lamp head at the top (the game draws the beam).
- `prop-helipad` 256 x 24: flat helipad slab, side view, yellow H on the front edge.
- `prop-sign` 112 x 96: wooden arrow sign on a post pointing RIGHT, blank board (the game writes BRO ZONE).
- `firebar-base` 32 x 32: the bolted metal hub a spinning fire bar turns on (centre = the hub).
Optional: a world-specific look for any prop as `<prop>-<world>` (e.g. `prop-brazier-hell`), same size.

# ROUND 3 CORRECTIONS (Nov 15)
See GPT-CORRECTIONS-ROUND3.md: new `bro-run` slot (the current armed body with a smooth walk/run), arm sheets redrawn at the
body's own arm size, position-worded motion frames, tower without its ladder, rifle arms from the supplied gun picture.
