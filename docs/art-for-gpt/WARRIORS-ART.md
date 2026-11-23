# The Warriors (Double Dragon style beat 'em up): sprites brief (paste this to GPT)

**The game:** a belt-scrolling street brawler that plays like the NES *Double Dragon*: you walk right along a street (up/down =
deeper/nearer), punch, kick, jump, grab, throw, swing bats, and level up to learn new moves. Our own designs (no Double Dragon
characters, sprites or logos). The heroes and enemies are **HEADLESS** bodies: the game puts a real face on every neck (the
players' faces on the heroes, characters from the game on the enemies). The look we want: **gritty, punchy 16-bit-era arcade
pixel art, chunky bold outlines, strong poses that read instantly, every move looking badass and powerful.** Think late-80s
/ early-90s arcade brawler, a step up from the NES (more colours, more detail), crisp at phone size.

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
| `hero-p1.png` | 2048 x 1280 | 40 poses (all) | Player 1 hero: a street-fighting gang member in a sleeveless denim vest over a blue T-shirt, jeans, boots, fingerless gloves; athletic, cool, badass |
| `hero-p2.png` | 2048 x 1280 | 40 poses (all) | Player 2 hero: same build and poses, red T-shirt under a black leather vest, brown cargo pants, boots |
| `foe-thug.png` | 2048 x 1024 | 26 poses (enemy list) | street thug: grey hoodie, dark jeans, sneakers |
| `foe-bat.png` | 2048 x 1024 | 26 poses (enemy list) | slugger: green bomber jacket, carries a baseball bat in the swing poses (bat drawn in the hand) |
| `foe-whip.png` | 2048 x 1024 | 26 poses (enemy list) | whip fighter: purple crop jacket, black leggings, holds a coiled whip (whip drawn in the hand, lashing out in swing2) |
| `foe-knife.png` | 2048 x 1024 | 26 poses (enemy list) | knife thrower: mustard leather jacket, knife in hand in toss |
| `foe-kicker.png` | 2048 x 1024 | 26 poses (enemy list) | black belt: black gi top, white pants, red belt, barefoot; sharp martial-arts kicks |
| `foe-brute.png` | 2048 x 1024 | 26 poses (enemy list) | bruiser: huge bare-chested hulk, torn brown pants, belt, massive arms (still drawn 200 px tall: the game scales him up) |
| `foe-boss.png` | 2048 x 1024 | 26 poses (enemy list) | mission boss: gold jacket with a black vest and red stripe, black pants, boots; looks like the leader |

Enemy sheets use this subset, in this order: `stand, stand2, walk1, walk2, walk3, run1, run2, jabC, jab, cross, hookC, hook, kickC, kick, jump, jkick, grab, swing1, swing2, toss, hurt, dizzy, fall, down, kneel, win`.
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

## 2. Stage art: 18 settings (3 pictures each, 54 in all)
Every mission happens at one of the game's locations; each location has a setting. Per setting:
| File | Size | What |
|---|---|---|
| `far-<setting>.png` | 2048 x 512 | the sky and the far scenery behind the street; scrolls slowly; **repeats side to side** (right edge joins the left edge) |
| `wall-<setting>.png` | 1024 x 320 | the back edge of the street (wall, fence, shop fronts, cliff...), bottom edge = where the walkable floor starts; repeats side to side |
| `floor-<setting>.png` | 1024 x 512 | the walkable ground (pavement, sand, planks, grass...) seen from the side at an angle like a brawler; repeats side to side |
No people, no text, no logos. Keep the floor fairly even (fighters stand on all of it).

| Setting | Look |
|---|---|
| `nyc` | New York-style city street: brownstones, fire escapes, graffiti, steam |
| `gotham` | dark gothic city: gargoyles, neon, rain, grime |
| `suburb` | American suburb: fences, garages, lawns, a hill-valley town square |
| `forest` | woods: tall trees, a dirt trail, a cabin far back |
| `jungle` | jungle: vines, ruins, ferns, mist |
| `beach` | beach boardwalk: sand, sea, lifeguard tower, palms |
| `desert` | desert town: adobe, cactus, mesas, heat haze |
| `snow` | snowy town: snowbanks, icicles, pines |
| `graveyard` | cemetery at night: tombstones, iron fence, fog, full moon |
| `gothic` | castle halls: stone arches, candles, banners |
| `lava` | volcanic hell: lava rivers, black rock, embers |
| `space` | space station corridor: metal panels, big windows onto space |
| `digital` | neon computer world: glowing grid, circuit lines |
| `themepark` | theme park midway: rides, game stalls, lights |
| `funhouse` | kids' TV studio / funhouse: bright slime colours, giant props |
| `stage` | rock concert stage: amps, lights, crowd silhouettes |
| `mountains` | mountain dojo path: cliffs, temple, clouds |
| `countryside` | English countryside: hedgerows, farm, stone walls |

## 3. Items, effects, title
See each `<name>-template.png` for size and anchor: `bat`, `pipe`, `chain`, `whip`, `knife` (handle on the LEFT), `rock`, `barrel`,
`crate`, food `chicken` `burger` `pizza`, effects `fx-hit` (6-frame hit spark), `fx-dust`, `fx-rise` (Rising Fist energy column),
`fx-twister` (spinning wind), `fx-fury` (speed-line burst), `logo` (THE WARRIORS / COME OUT TO PLAY, transparent) and
`title-bg` (1920 x 1080 night street, two heroes back to back, faces turned away or out of frame).

## Hand back
PNG at exactly these sizes, named as listed. Upload to Drive with an UPLOADS-GPT note + manifest (file, size, bytes, SHA256);
files under 80 KB in an identically named ZIP. Start with `hero-p1.png` so Sean can check the style in the game first.

## For Claude
Slots in `src/data/ddSprites.js` (POSES/SHEETS/PICTURES, CELL 256, UNIT 2 px per unit, footOf per pose); import to
`assets/warriors/<name>.webp` lossless (originals in assets/originals/warriors). Templates: `node tools/warriors-templates.mjs`.
