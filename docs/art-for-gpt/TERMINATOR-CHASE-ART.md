# Judgment Day Chase: art brief (paste this to GPT)

**The game:** a fast, cinematic top-down car chase (think Spy Hunter, Chase H.Q. and Burnout seen from a helicopter), set in
the chases of *Terminator 2*: a Harley in the LA storm drain with a giant tow truck behind it, the T-1000 running after you
on foot, a night escape in a station wagon, a SWAT van with a minigun against a police helicopter, and a pickup truck
against a liquid nitrogen tanker. **Our own designs:** no film stills, no real logos, no actors' faces. The drivers and the
T-1000 are **HEADLESS** where the template shows a pink face circle: the game puts the players' own faces there.

**Look:** polished modern mobile-game art seen from **straight above** (the camera looks down), crisp at phone size, strong
readable silhouettes, soft shading, a little grit and dust. Sunset for the Galleria and the storm drain, night for the rest
(the game adds the darkness and headlights itself, so draw vehicles in normal daylight colours).

## Rules for every sprite
- **Top-down, nose pointing UP** (the front of every vehicle at the top of the picture).
- **Transparent background** (real alpha) everywhere except the ground/asphalt tiles and the backdrops.
- **Exact sizes** from the templates: 2 picture pixels = 1 game unit. Stay inside the cell; match the faint stand-in's size.
- **Pink face circles stay EMPTY** (transparent): draw the rider/driver up to the neck only.
- No drop shadow under vehicles (the game draws it), no text unless the template asks for it.

## Files
Templates: `docs/art-for-gpt/tchase-templates/` (a `-template.png` per slot; sheets also have a `-reference.png` = what the
game draws today). Name each finished file exactly like its slot, e.g. `bike.png`, `cruiser.png`, `tanker.png`.

### 1. Hero vehicles (most important)
| Slot | Size | What |
|---|---|---|
| `bike` | 216 x 128 (3 cells of 72 x 128) | the black Harley Fat Boy + rider in a black leather jacket, HEADLESS; cells: lean-left, straight, lean-right |
| `wagon` | 96 x 160 | brown 1980s station wagon with wood-panel sides; face circle = driver under the open sunroof |
| `van` | 112 x 192 | navy SWAT van, SWAT on the roof, side door open with a minigun poking out on the right; face = roof hatch |
| `pickup` | 100 x 176 | dark 4x4 pickup with crates in the bed; face = cab roof hatch |

### 2. The T-1000
| Slot | Size | What |
|---|---|---|
| `t1000-run` | 576 x 128 (6 cells of 96 x 128) | the T-1000 as a police officer (dark-blue uniform) running UP the screen, seen from above and a bit behind, arms pumping, HEADLESS |
| `t1000-splash` | 384 x 96 (4 cells) | liquid-metal knockdown: chrome splash, splash, silver puddle, rising back up (no face) |
| `t1000-bike` | 128 x 120 (2 cells) | the T-1000 on a police motorcycle; cell 2 = one arm turned into a long chrome blade held out; HEADLESS |
| `towtruck` | 140 x 300 | huge orange tow truck, amber roof lights, boom and hook at the back, dented |
| `tanker` | 150 x 440 | liquid nitrogen tanker: white cab, long silver frosted tank, three glowing blue valves exactly where the template shows them |
| `heli` + `heli-rotor` | 200 x 240, 260 x 260 | police helicopter without its main rotor; the rotor alone (2 blades) — the game spins it |

### 3. Police and traffic
`cruiser` (176 x 152, 2 cells: light bar left red lit / right blue lit), `moto` (128 x 120, straight + lean), `swat`
(armored enemy truck), `truck` (civilian big rig), `rig` (the friendly weapons rig: black semi with the trailer open at the
BACK and a ramp down), `civ-1` … `civ-6` (red sedan, white sedan, yellow hatchback, green car, light-blue minivan, black
sports car), `wreck` (burnt-out car).

### 4. Effects (sheets of frames, transparent)
`explosion` (8 x 192), `smoke` (6 x 96), `fire` (6 x 96), `spark` (4 x 48), `muzzle` (3 x 64, pointing up), `metal`
(5 x 96, liquid-metal splash), `ln2` (4 x 128, icy nitrogen fog).

### 5. Road, scenery, pickups, HUD
Seamless tiles: `ground-street`, `ground-canal`, `ground-highway`, `ground-city`, `ground-freeway` (1024 square) and
`asphalt-street`, `asphalt-canal`, `asphalt-night` (512 square, NO lane lines). Scenery from above: `palm`, `tree`, `lamp`,
`building-1..3`, `overpass` (repeats side to side), `spikes` (repeats side to side), `cone`, `barrier`. Pickups (64 square,
glowing icons): `pk-repair`, `pk-grenade`, `pk-nitro`, `pk-weapon`, `pk-shield`, `pk-cash`. HUD gun icons (192 x 96, side
view): `gun-shotgun`, `gun-uzi`, `gun-rifle`, `gun-minigun`, `gun-m79`.

### 6. Title and cutscenes (three shapes each: wide 1920 x 1080, `-tall` 1080 x 1920, `-fold` 1504 x 1670)
`logo` (1600 x 600, JUDGMENT DAY CHASE in chrome letters with a fiery glow, transparent, our own design), `title-bg`,
`cut-intro` (2029 future war, skulls, hunter-killer tanks), `cut-crash` (tow truck hitting the overpass in the storm drain),
`cut-walkout` (a police-officer silhouette walking out of a wall of fire), `cut-freeze` (a frozen chrome man in nitrogen
fog), `cut-mill` (steel mill, molten steel pit), `cut-ending` (a thumbs-up hand sinking into molten steel).

**Order if time is short:** bike, cruiser, moto, t1000-run, towtruck, explosion, civ-1..6, then the rest.
Hand back the PNGs in a folder named `Judgment Day Chase — Sprites` on Drive (or zip them).
