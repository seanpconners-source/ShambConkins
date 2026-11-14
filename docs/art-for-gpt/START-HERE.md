# ShambConkins art: start here (for ChatGPT / any image generator)

**Owner, to continue later:** open ChatGPT, attach this file plus the file named in the table for what you want, and say
for example *"Continue the Sundown Showdown stage art"*, *"Make the next 20 items"*, *"Make Arcade icons for the next 10
games"*. When pictures are done, put them where "Hand back" says and tell Claude **"import the new art"**.

**GPT, read this first.** You make pictures for ShambConkins, an offline party board game for two players (Sean and Amber)
on one phone, full of pop-culture tributes. Work through the to-do file for the area you're asked about, ONE picture at a
time, in order, skipping anything marked done (✅). Name every file exactly as the to-do file says.

## Areas

| What | Read this | Templates / list | Status file |
|---|---|---|---|
| **Sundown Showdown sprites** (cowboys, bandits, riders, boss, effects, props) | `docs/sundown-sprites/GPT-SPRITE-BRIEF.md` | `docs/sundown-sprites/templates/*@4x.png` | which files are in `assets/sundown/` |
| **Sundown Showdown stages** (skies, backgrounds, ground, building fronts, canyon rock, street props) | `docs/sundown-sprites/GPT-SPRITE-BRIEF.md` → "Stage art" | `docs/sundown-sprites/templates/*-building-*@2x.png` | which files are in `assets/sundown/` |
| **Major League Baseball sprites** (batters, pitchers, fielders, catcher, umpire, helmets/caps, ball, stadium, logos) | `docs/baseball-sprites/GPT-SPRITE-BRIEF.md` | `docs/baseball-sprites/templates/*@2x.png` | which files are in `assets/baseball/` |
| **Symphony of the Night sprites + stages** (hero, monsters, Death, Dracula + true form, candles, swords/items, skies, room walls, floors, props) | `docs/sotn-sprites/GPT-SPRITE-BRIEF.md` | `docs/sotn-sprites/templates/*@2x.png` | which files are in `assets/sotn/` |
| **Living Dead Horde sprites** (headless survivor bodies, 18 zombies + bosses, graveyard props, buildings, ground tiles, gems, weapon/upgrade icons) | `docs/horde-sprites/GPT-SPRITE-BRIEF.md` | `docs/horde-sprites/templates/*@2x.png` | which files are in `assets/horde/` |
| **Battleship sprites** (top-down ships + wrecks, hit/miss markers, sea, war-room background, explosion/splash, cut-scene sky, warship, deck gun, torpedo, headless sailor) | `docs/battleship-sprites/GPT-SPRITE-BRIEF.md` | `docs/battleship-sprites/templates/*@2x.png` | which files are in `assets/battleship/` |
| **BASEketball** (movie stadium at night + Hoop Jones arena, backboard, pole, net, ball, shooters from behind, jumbotron, psych-out burst, court logo, logos) | `docs/baseketball-sprites/GPT-SPRITE-BRIEF.md` | `docs/baseketball-sprites/templates/*` | which files are in `assets/baseketball/` |
| **Paddy's Pool** (6 tables top view + front view, felt wear, 8 cues, floors and wall strips per room tier, the Pool Hall room + bar/light/TV pieces per tier, 13 decorations, logo) | `docs/pool-sprites/GPT-SPRITE-BRIEF.md` | `docs/pool-sprites/templates/*` | which files are in `assets/pool/` |
| **Banana Stand Tapper** (Arrested Development look: 3 bars with backgrounds/floors/bar tops/taps/doors/items, headless bartenders + customers, cash, logo, title cards) | `docs/tapper-sprites/GPT-SPRITE-BRIEF.md` | `docs/tapper-sprites/templates/*` | which files are in `assets/battleship/` |
| **Sonic 3 style game sprites + jungle zone** (headless runners + ball, rings, springs, item boxes, robots, terrain, backdrop, bosses; made with Grok) | `docs/sonic3-sprites/GROK-SPRITE-BRIEF.md` | `docs/sonic3-sprites/templates/*@4x.png` (+ `rows/`) | which files are in `assets/sonic3/` |
| **Seanic title screen + character select** (scene, hedgehog title pose, flying fox, menu backdrop, TV monitor, two standing runners) | `docs/sonic3-sprites/TITLE-SELECT-BRIEF.md` | `docs/sonic3-sprites/templates/title-*.png`, `select-*.png` | which `title-*` / `select-*` files are in `assets/sonic3/` |
| **Arcade key art, logos, icons** (picture behind each game, its logo, its tile icon) | `docs/arcade-art/PROMPTS.md` (a ready prompt per slot; ✅ = done) | | `assets/tiles/SLOTS.md` |
| **Item pictures** | this file → "Item pictures" | `docs/art-for-gpt/ITEMS-TODO.md` (every item still without art) | same list |
| **Character portraits** | this file → "Character portraits" | `docs/art-for-gpt/PORTRAITS-TODO.md` | same list |
| **Pinball table art** (playfield, backglass, apron, logo, flippers...) | `docs/pinball-art/<table>/README.md` + `IMAGE-SPECS.txt` | the PNGs in that folder | |
| **Photo Hunt pairs** (spot-the-difference photos) | `tools/photohunt.py` README (`assets/photohunt/README.txt`) | | `assets/photohunt/` |

## Rules for every picture
- **Original art.** Tributes are fine (a ham with pineapple eyes for "Rum Ham"), but never copy, trace or rip another
  game's sprites, levels, screenshots or logos, and don't use them as a reference to copy from. Our own designs.
- **No watermark, no signature, no frame**, and **no text** unless the brief asks for text (logos, signs).
- **Transparent background** (real PNG alpha, not a painted checkerboard) for anything that sits on top of the game:
  sprites, items, icons, logos, props. Backgrounds and key art are full pictures.
- **Exact sizes** when a brief or template gives one; the game lines things up by pixel.
- One picture per file, named exactly as listed, lowercase.

## Item pictures
- One object, centred, filling most of the frame, **transparent background**, cropped tight. About 1024 px on the long side
  (the game shrinks it to 512).
- Look of the existing ones: **photo-real product shot** with soft studio light, like a prop photographed for a catalogue
  (Rum Ham = a glazed ham with pineapple-ring eyes and a cherry nose; Fight Milk = a plain gallon jug with a homemade
  label). Text only when the object really carries it (a label, a badge).
- File name = the item's id from `ITEMS-TODO.md`, e.g. `taskmaster-seal.png`. Do them in batches of ~20 in list order.

## Character portraits
- Head and shoulders, facing the camera, **transparent background**, square, about 1024 px. Clear face (the game cuts
  heads out for some games and puts them on bodies).
- File `<id>.png`; extra expressions as `<id>.<mood>.png` with mood one of `win`, `silly`, `angry`, `sad`, `think`.
- Use `PORTRAITS-TODO.md` for the ids.

## Arcade key art / logos / icons
- Use the prompt under each slot in `docs/arcade-art/PROMPTS.md` as is. Key art = wide 16:9 (~1600x900), icon = square
  sticker on transparent, logo = the game's title as a transparent logo (~1100 px wide).
- File names: `<slot>-art.png`, `<slot>-icon.png`, `<slot>-logo.png` (slot = the word in backticks after the title).
- **New key art goes through the Background Picker** before it ships (Claude does that part; the owner locks it).

## Art Tally on Google Drive (Claude ↔ GPT)
Folder **ShambConkins Art/Art Tally** on Drive is where Claude and GPT leave each other notes. Nobody edits a file there:
each side adds a new dated one. GPT adds `UPLOADS-GPT-<date-time>.md` after every upload (one line per picture: folder,
file, slot or id, note) and reads the newest `TALLY-CLAUDE-<date-time>.md` before working (DELETE OK = in the game, the Drive
copy can go; REDO = fix it; WANTED = what to make next). Claude writes the tally with `node tools/art-tally.mjs --round <notes.md>`
(copy in `docs/art-for-gpt/ART-TALLY.md`) and uploads it as a new file. Claude's Drive connector can create files but not edit
them, which is why every update is a new file.

## Hand back (owner)
Best: GitHub, which Claude can always read. In the browser, open the repository → folder **`art-inbox/<area>/`** (for example
`art-inbox/sundown/`, `art-inbox/baseball/`, `art-inbox/sotn/`, `art-inbox/horde/`, `art-inbox/battleship/`, `art-inbox/sonic3/`, `art-inbox/items/`, `art-inbox/arcade/`, `art-inbox/portraits/`) → **Add file → Upload files** →
commit. Character portraits can also go straight to `assets/portraits/` on main, as always.
Google Drive also works when Claude runs on the laptop, but a cloud session can only pull tiny files from Drive.

## For Claude: importing
- `art-inbox/<area>/` → process into the real folder, then delete from the inbox in the same commit:
  - sundown → check frame sizes against `src/data/sundownSprites.js` (4x art: downscale with nearest-neighbour), `assets/sundown/`
  - baseball → check frame sizes against `src/data/baseballSprites.js` (2x art: downscale to the frame size), `assets/baseball/`
  - sotn → check frame sizes against `src/data/sotnSprites.js` (steps in `docs/sotn-sprites/README.md` → Importing), `assets/sotn/`
  - horde → check sizes against `src/data/hordeSprites.js` (steps in `docs/horde-sprites/README.md` → Importing), `assets/horde/`
  - battleship → check sizes against `src/data/battleshipSprites.js` (steps in `docs/battleship-sprites/README.md` → Importing), `assets/battleship/`
  - sonic3 → steps in `docs/sonic3-sprites/README.md` → Importing, `assets/sonic3/`
  - items → trim, 512 px LOSSLESS WebP into `assets/items/<id>.webp`, original into `assets/originals/items/`
  - arcade → `python3 tools/import-arcade-art.py art-inbox/arcade` (key art then goes through the Background Picker)
  - portraits → `assets/portraits/` (480 px lossless WebP, originals archived: `tools/optimize-art.py`)
  - every picture goes in lossless (owner, Nov 6: no quality loss); sprite sheets keep their exact pixels; songs and sounds
    go in exactly as delivered (never re-encoded; a raw WAV may become FLAC, which is lossless)
- Then `node tools/gpt-art-todo.mjs` (refreshes ITEMS-TODO, PORTRAITS-TODO and the Arcade prompts), build, check in game.
