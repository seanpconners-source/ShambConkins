# Living Dead Horde: drop-in art

Every slot is optional: a missing picture keeps the game's drawn art. Slots, sizes and anchors live in
`src/data/hordeSprites.js`; the game reads them in `src/engines/horde.js` + `src/engines/hordeData.js` (bakeEnemies,
bakeProps, bakeBuilding, bakeIcon, gems, ground pattern, drawPlayer). Brief for ChatGPT: `GPT-SPRITE-BRIEF.md`.

## Templates
`node tools/horde-templates.mjs` → `templates/<name>.png` (real size) + `<name>@2x.png`. Each shows the grid, the ground
point (red), the face circle (blue, survivors), the glow spot (yellow, lamp/torch), the icon safe circle, the tile edge
(ground), and the game's drawn art faintly as a size guide.

`node tools/horde-templates.mjs --standin <dir>` writes every slot filled with the drawn art (no marks). Copying those
into `assets/horde/` and building gives the same picture as the drawn game: that is how the drop-in path was checked
(Nov 13, both themes). Don't commit stand-ins.

## Slots
- **survivor-p1 / survivor-p2**: 112×128 frames, rows idle 4 · walk 6 · hurt 2 · down 2, foot (56,124), headless; the
  player's face is drawn in the circle centred (56,52), 104 px across (= the game's 52-unit head). Walk frames follow the
  walk phase (one cycle per two steps), idle 5 fps, hurt 8, down 3. Mirrored when walking left.
- **enemy-<id>**: square frames 2 x size (`ENEMY_SIZES`), 1 row walk 4 at 8 fps, feet at 44/48 of the height. The game
  bakes them into flipped + white-flash copies and adds the shadow.
- **props** (grave-1..3, tree-1..3, car-1/2, lamp, lamp-broken, torch, torch-out, barrel, barrel-red, barrel-toxic,
  crate, bush, bones, rubble): stills, bottom-centre anchor = `foot`.
- **building-dead / building-cabin** (600×380, foot (300,360)), **ground-dead / ground-cabin** (512×512 seamless, drawn
  as a 256-unit tile), **gem-blue/green/red/purple** (56×56), **icon-<glyph>** (128×128 = the 64-unit glyph box; used
  on level-up cards, the HUD, thrown/orbiting weapons and pickups).

All at 2 template px per world unit; 2x/4x deliveries are fine (the game scales by the picture's width).
Cabin theme: `<name>-cabin` is used first when present (zombies, props, icons, gems), else `<name>`.

- **Batch 2 (weapons + effects, Nov 13)**: fx-slash, fx-muzzle, fx-impact, fx-explosion, fx-pulse, fx-bolt, fx-gore
  (one-shot sheets, `pivot` + `R` in hordeSprites FX), pool-fire/-goo/-tar + aura-goo (looped), proj-shell, proj-nail,
  shot-spit/-fire/-curse (stills, pointing right). horde.js looks them up once (FXS/SHOT) and draws fxDraw/shotDraw;
  each one falls back to the drawn effect. Kit zip = templates + brief section 'BATCH 2' + style-reference pictures.

## Importing
1. Owner uploads to `art-inbox/horde/` (or chat). Check each picture against its template size/proportions.
2. Green background → key it out (tight key, see the Seanic notes in AI_STATE: foliage greens carry red).
3. Save lossless WebP (or PNG) as `assets/horde/<name>.webp`; keep the delivered original in `assets/originals/horde/`.
4. `node tools/build.mjs`, play Living Dead Horde and Evil Dead Cabin Defense, screenshot 390x780 + 844x390.
   `horde:` pictures are fetched the first time the game opens (pwa.js LATER).
