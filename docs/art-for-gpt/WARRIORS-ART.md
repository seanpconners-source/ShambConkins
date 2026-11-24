# The Warriors (Double Dragon style beat 'em up): sprites brief (paste this to GPT)

**The game:** a belt-scrolling street brawler in the line of *Double Dragon* and *Final Fight*, told as the long night of the
film *The Warriors* (1979): the Conclave in the park and the cops' raid, the Turnbull AC's and their bus, the Orphans, the
subway south, the Baseball Furies, the Lizzies, the cops at Union Square, the Punks, the dawn ride and the Rogues on Coney
Island. You walk right (up/down = deeper/nearer), punch, kick, jump, grab, throw, swing bats, and level up to learn moves.
Our own designs (no film stills, no actors' likenesses, no other game's sprites or logos). The heroes and gang members are
**HEADLESS** bodies: the game puts a face on every neck (the players' faces on the heroes, its own drawn heads or characters'
faces on the gangs). The look we want: **gritty, punchy 16-bit-era arcade pixel art, chunky bold outlines, strong poses that
read instantly, late-70s New York grime.** Crisp at phone size (fighters are now drawn about a quarter of the screen tall).

## 1. Fighter sheets (the most important part)
Every sheet is a grid of **256 x 256 px cells, 8 per row**, one cell per KEY POSE in the order below. The game blends between
key poses, so each must be a clear, strong, readable pose. Rules for every cell:
- **Headless**: draw the body up to the top of the neck only. The pink dashed circle in the template is where the face goes:
  keep it EMPTY (fully transparent), nothing overlapping it except a raised arm/weapon when the pose needs it.
- **Facing RIGHT** (the game mirrors it). **Feet on the pink dot** (lying poses: as shown).
- **Same size in every cell**: the standing fighter is 200 px from the soles to the top of the neck + face circle. The faint
  figure in each template cell is our stand-in pose: match its stance, limb angles and size (you can make it look much better).
- Transparent background (real alpha), no text, no grid lines, no shadow under the feet (the game draws the shadow).
- Same character, same clothes, same colours in every cell. Weapons appear ONLY where the description says.

| Sheet | Size | Poses | Who |
|---|---|---|---|
| `hero-p1.png` | 2048 x 1792 | 50 poses (hero list) | Player 1 hero: a Warriors-style gang member in a sleeveless leather vest (our own design, no film logo) over a blue T-shirt, jeans, boots |
| `hero-p2.png` | 2048 x 1792 | 50 poses (hero list) | Player 2 hero: same build and poses, red T-shirt under the vest, brown cargo pants, boots |
| `foe-cop.png` | 2048 x 1536 | 45 (enemy list) | 1979 New York patrolman: navy uniform shirt with a badge, navy trousers, black belt and shoes (the game draws the cap) |
| `foe-riot.png` | 2048 x 1536 | 45 | riot cop: dark navy uniform with a padded vest; in `block`/`bash` the left arm holds a tall clear riot shield in front |
| `foe-turnbull.png` | 2048 x 1536 | 45 | Turnbull AC's skinhead: white T-shirt, red braces, rolled-up blue jeans, oxblood boots |
| `foe-orphan.png` | 2048 x 1536 | 45 | Orphan: torn grey T-shirt, faded trousers, worn shoes; scrappy, no colours |
| `foe-fury.png` | 2048 x 1536 | 45 | Baseball Fury: white pinstriped baseball uniform with a purple belt, black cleats |
| `foe-lizzie.png` | 2048 x 1536 | 45 | Lizzie: plum wrap top, dark flared trousers, plum boots, gold belt |
| `foe-punk.png` | 2048 x 1536 | 45 | Punk: blue denim overalls over a red-and-white striped shirt, roller skates |
| `foe-rogue.png` | 2048 x 1536 | 45 | Rogue: black shirt under a brown leather vest, dark trousers, boots |
| `foe-riff.png` | 2048 x 1536 | 45 | Riff (fights on YOUR side at the very end): off-white martial-arts style outfit, dark vest, amber sash |
| `cast-cyrus.png` | 2048 x 512 | 14 (cast list) | **Cutscenes**: Cyrus, the leader who calls the meeting: long dark tunic over a dark shirt with gold trim and belt, dark trousers. `win` = both arms raised to the crowd, `jab` = pointing out at the crowd, `fall`/`down` = shot |
| `gang-hihat.png` | 2048 x 512 | 14 | **Cutscenes** (Conclave crowd): Hi-Hat: white long-sleeved shirt, black braces, black trousers, white gloves |
| `gang-bopper.png` | 2048 x 512 | 14 | **Cutscenes** (Conclave crowd): Bopper: purple 70s suit, wide lapels, open purple shirt, gold chain |

**No weapons in any cell** (the game draws every bat, pipe, nightstick, chain and gun in the front hand and swings it itself),
except the riot shield in `block`/`bash`. Bosses use their gang's sheet, drawn bigger by the game.
Hero sheets: the 40 poses below in order (1-40), then `batReady, batWind, batHit, batFollow, batBack, batLow, batOver,
batSmash, hurtLow, sweep`. Enemy sheets: `stand, stand2, walk1, walk2, walk3, run1, run2, jabC, jab, cross, hookC, hook, kickC,
kick, jump, jkick, grab, swing1, swing2, toss, hurt, dizzy, fall, down, kneel, win`, then `batReady, batWind, batHit, batFollow,
batBack, batLow, batOver, batSmash, block, bash, aim, lobC, lob, skate1, skate2, hurtLow, charge, crouch, taunt`.
Cast sheets (`cast-`/`gang-`): `stand, stand2, win, jab, walk1, walk2, walk3, run1, run2, hurt, fall, down, kneel, crouch`.
**Still missing and most wanted (Nov 24): `foe-cop` and `foe-riot`** (every cop in the game is still drawn), then the cast sheets.
The cutscenes draw everyone from these sheets (the Warriors crew wear the hero sheets, each gang its own sheet), so a sheet
shows up in the story scenes too.
The **templates** (`<sheet>-template.png`) show every cell with its pose name, the face circle and the feet dot; the
**references** (`<sheet>-reference.png`) show how the game draws them today.

### The key poses
| # | Pose | What it shows |
|---|---|---|
| 1 | `stand` | fighting stance, fists up (guard), weight on the back leg |
| 2 | `stand2` | same stance, breathing: a hair lower, shoulders dropped (alternates with stand) |
| 3 | `walk1` | walk: back leg pushing off, front leg forward |
| 4 | `walk2` | walk: legs passing under the body |
| 5 | `walk3` | walk: front leg back, back leg forward (the other step) |
| 6 | `run1` | sprint: leaning forward hard, big stride, arms pumping |
| 7 | `run2` | sprint: the other stride |
| 8 | `jabC` | jab wind-up: front fist pulled back a little |
| 9 | `jab` | jab: front arm fully extended straight forward at shoulder height, snap |
| 10 | `cross` | cross: BACK arm punches straight forward, hips turned, body leaning in |
| 11 | `hookC` | hook wind-up: front arm cocked back, torso turned away |
| 12 | `hook` | hook: front arm swings round in a wide bent-elbow arc, torso twisted hard into it (the combo finisher: knocks down) |
| 13 | `upC` | uppercut wind-up: crouched low, punching arm dropped down by the knee |
| 14 | `up` | uppercut: exploding upward, punching fist straight up over the head, rising on the toes (launches enemies) |
| 15 | `kickC` | kick chamber: front knee raised high, shin tucked |
| 16 | `kick` | front kick: front leg fully extended straight forward at waist height, body leaning back for balance |
| 17 | `bkick` | back kick: kicking straight BEHIND (to the left of the cell), body leaning forward over the standing leg |
| 18 | `elbowC` | back elbow wind-up |
| 19 | `elbow` | back elbow: elbow driven straight backward (to the left), fist by the chest, nasty and quick |
| 20 | `jump` | jump: in the air, knees tucked, arms up |
| 21 | `jkick` | jump kick: in the air, front leg extended diagonally forward-down, back leg tucked, the iconic flying kick |
| 22 | `spin` | cyclone spin kick: in the air, both legs nearly horizontal, body turned sideways, mid-spin (the game flips it left/right fast to spin it) |
| 23 | `kneeC` | hair grab: both hands forward holding an (invisible) enemy's head down, knee starting to rise |
| 24 | `knee` | knee strike: knee driven up hard to chest height, hands still holding the head down |
| 25 | `grab` | grab: both arms forward, hands at waist-chest height, holding someone |
| 26 | `throw1` | shoulder throw 1: crouched, both arms up over the shoulder, gripping someone behind the head |
| 27 | `throw2` | shoulder throw 2: leaning far back, arms whipping over the head, throwing someone over to the other side |
| 28 | `swing1` | weapon wind-up: weapon (bat/pipe) raised high behind the head with the front hand |
| 29 | `swing2` | weapon swing: weapon swung forward and down, arm extended, body twisted into it |
| 30 | `toss` | throw: front arm whipped forward releasing a knife/object, hand open |
| 31 | `hurt` | hurt: hit in the face, head snapped back, body bent backward, arms flung out |
| 32 | `dizzy` | dazed: bent over forward at the waist, arms hanging limp, head drooping (the grab/uppercut window) |
| 33 | `fall` | falling: knocked off the feet, flying backward, body nearly horizontal, limbs flailing |
| 34 | `down` | down: lying flat on the back on the ground, head to the LEFT, feet to the right |
| 35 | `kneel` | getting up: down on one knee, hand on the front knee, pushing up |
| 36 | `crouch` | crouch: low, knees bent, ready to spring (bruiser wind-up) |
| 37 | `win` | victory: one fist raised high, standing tall |
| 38 | `rise1` | RISING FIST start: crouched very low, fist cocked by the hip, energy gathering |
| 39 | `rise2` | RISING FIST: flying straight up, punching fist high over the head, legs trailing below (super move) |
| 40 | `fury` | WARRIOR'S FURY: lunging forward in a full-power double punch, both arms forward, body low and long (super move) |
| 41 | `batReady` | holding a bat (both hands) at chest height, the bat resting up and back over the shoulder |
| 42 | `batWind` | the swing cocked: both hands up by the BACK shoulder, leaning back, weight on the back foot |
| 43 | `batHit` | contact: hips and shoulders turned in, both hands low in front at waist height, arms extended (the bat sticks out level, forward) |
| 44 | `batFollow` | follow-through: hands finished high in front by the head, the bat wrapped back over the shoulder, back heel up |
| 45 | `batBack` | backhand: both hands low in front, body turned in (the bat comes back across) |
| 46 | `batLow` | backhand finish: crouched forward, hands low by the knees |
| 47 | `batOver` | overhead wind-up: both arms straight up over the head |
| 48 | `batSmash` | overhead smash: deep lunge forward, both hands chopped down in front at hip height |
| 49 | `hurtLow` | hit in the gut: doubled over forward, arms clutching the stomach |
| 50 | `sweep` | leg sweep: dropped low on the back knee, front leg swept out flat along the ground |
| (enemy) | `block` | riot cop guard: shield arm up in front of the body |
| (enemy) | `bash` | shield bash: lunging forward, shield arm driven out |
| (enemy) | `aim` | aiming a pistol: front arm straight out level, the other hand supporting (no gun drawn) |
| (enemy) | `lobC` / `lob` | overhand throw of a bottle/molotov: arm cocked far back high / whipped forward over the top |
| (enemy) | `skate1` / `skate2` | roller-skating low and fast, crouched, arms swinging (two strides) |
| (enemy) | `charge` | shoulder charge: bent low, shoulder first, running |
| (enemy) | `taunt` | arms raised, calling the hero out |

## 2. Stage art: the story's 18 places (3 pictures each, 54 in all)
| File | Size | What |
|---|---|---|
| `far-<area>.png` | 2048 x 512 | the sky and the far scenery behind; scrolls slowly; **repeats side to side** (right edge joins the left edge) |
| `wall-<area>.png` | 1024 x 320 | the back edge of the floor (shop fronts, fence, tiled wall, the subway car's side...), bottom edge = where the walkable floor starts; repeats side to side |
| `floor-<area>.png` | 1024 x 512 | the walkable ground seen from the side at an angle like a brawler; repeats side to side |
No people, no text other than our own signs, no logos. Keep the floor fairly even (fighters stand on all of it).
`ref-<area>.png` in the templates folder shows how the game draws each place now (the layout to match).

| Area | Look |
|---|---|
| `conclave` | Van Cortlandt Park at night: a field full of gangs (tiny far silhouettes) facing a lit stage, trees behind |
| `park` | a park path through dark woods at night, iron fence, lamps |
| `cemetery` | an old cemetery at night: fog, gravestones, iron fence, a mausoleum |
| `elstreet` | a Bronx street under the elevated train tracks at night: storefronts, neon, graffiti |
| `yard` | a rail yard at night: boxcars, floodlights, chain-link fence, gravel and rails |
| `tenement` | a Bronx street of brownstone tenements at night: stoops, doorways, fire escapes |
| `burning` | the same street lit orange by a burning car, smoke |
| `train` | inside a 1970s graffiti-covered subway car (far = the dark tunnel with lights, seen through the windows; wall = the car side with windows left SEE-THROUGH) |
| `trainDawn` | the same car at dawn on an elevated stretch (far = Brooklyn rooftops and sunrise) |
| `riverside` | Riverside Park at night: stone wall, lamps, the river and lights beyond |
| `playground` | a city playground at night: chain-link, climbing frame, swings |
| `apartment` | a 70s party apartment: patterned wallpaper, lamps, jukebox, windows on the city |
| `apartment2` | an apartment block hallway: doors, stair landing |
| `station` | a subway platform: tiled wall with the station name, the track pit, steel columns |
| `platform` | another subway platform, same style |
| `restroom` | a grimy subway men's room: tiled walls, stalls, sinks |
| `boardwalk` | Coney Island boardwalk at dawn: game stalls, a big Ferris wheel and parachute tower far behind |
| `beach` | Coney Island beach at dawn: sand, waves, the parachute tower far away |

## 3. Items, effects, title
See each `<name>-template.png` for size and anchor: `bat`, `pipe`, `chain`, `whip`, `stick` (police nightstick), `knife` (handle on the LEFT), `rock`, `barrel`,
`crate`, food `chicken` `burger` `pizza`, effects `fx-hit` (6-frame hit spark), `fx-dust`, `fx-rise` (Rising Fist energy column),
`fx-twister` (spinning wind), `fx-fury` (speed-line burst), `logo` (THE WARRIORS / COME OUT TO PLAY, transparent) and
`title-bg` (1920 x 1080 night street, two heroes back to back, faces turned away or out of frame).

## 4. Story cutscene backdrops (10 pictures, 1920x1080, NO people; templates `cut-<name>-template.png`)
The game draws the people (the gangs, Cyrus, the Warriors with the players' faces) over these, so leave the lower 45%
open (empty floor, lawn, sand or platform), keep the horizon about 40-50% down, night (or dawn) light, our own drawing
of the place, no logos, no text except the subway sign:
- `cut-conclave.png`: night park in the Bronx, a low wooden stage in the middle with two tall flood lights, trees, skyline far behind.
- `cut-riffs.png`: the Riffs' headquarters at night: dark wood, candles, a dojo feel.
- `cut-street.png`: New York street at night: brick tenements, a lamp post, graffiti.
- `cut-lizzies.png`: a dim apartment party room: coloured lights, a couch, records.
- `cut-park.png`: Riverside Park at night: one lamp post, trees, a path.
- `cut-subway.png`: a 1970s subway platform: tiled wall, a station sign, yellow edge.
- `cut-restroom.png`: a grimy subway men's room: tiles, stalls, sinks.
- `cut-dawn.png`: inside a subway car at dawn, orange sunrise through the windows.
- `cut-coney.png`: Coney Island beach at dawn: the big Ferris wheel, boardwalk, ocean.
- `cut-radio.png`: a dark radio studio: one microphone, an ON AIR light.

## Hand back
PNG at exactly these sizes, named as listed. Upload to Drive (folders "The Warriors — Fighters & Props", "The Warriors — Stage Art") with an UPLOADS-GPT note + manifest (file, size, bytes, SHA256);
files under 80 KB in an identically named ZIP. Start with `hero-p1.png` so Sean can check the style in the game first.

## For Claude
Slots in `src/data/ddSprites.js` (POSES/SHEETS/PICTURES, CELL 256, UNIT 2 px per unit, footOf per pose); import to
`assets/warriors/<name>.webp` lossless (originals in assets/originals/warriors). Templates: `node tools/warriors-templates.mjs`.
