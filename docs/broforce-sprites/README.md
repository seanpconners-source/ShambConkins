# Sean of a Gun (Broforce) art (drop-ins)

Slots, sizes and anchor points: `src/data/broforceSprites.js`. Files go in `assets/broforce/<name>.png|webp` (lossless WebP
after import; originals in `assets/originals/broforce/`), the build turns them into `bf:<name>`, and the app downloads them the
first time Sean of a Gun opens (`src/pwa.js` LATER `bf:`). Every slot falls back to the game's drawn art, so pictures can
arrive one at a time.

- Templates: `node tools/broforce-templates.mjs` (`--only=a,b`) → `docs/broforce-sprites/templates/` (106 slots).
- Brief for GPT: `GPT-SPRITE-BRIEF.md`.
- Scale: 4 px per world px (a tile = 64 px, a soldier ~80 px tall). Pictures may come at exactly 2x.
- Engine: `src/engines/broforce.js` (all worlds), new worlds' stages `src/engines/broforce/worlds.js`, their enemies,
  bosses, guns and hazards `src/engines/broforce/ext.js`.

| Slot | Size | Notes |
|---|---|---|
| `bro-body` | 6 x 6 frames of 64 x 96 | headless soldier (the game adds each bro's face at the neck and their gun at the hand) |
| `foe-<type>` (30) | 4 x 2 frames | walk 4 + attack 2; feet at the red cross. First four worlds: mook, bomber, grenadier, bruiser, dog |
| `boss-<kind>` (13) | 4 x 3 frames of 320 (400 for beast, shadow) | idle 2, move 4, attack 3. `boss-devil` is the first four worlds' boss |
| `tiles-<world>` (8) | 1152 x 192 | 18 tile columns x 3 variants, 64 px cells |
| `top-<world>` | 192 x 36 | grass/edge strip on top of ground tiles, 3 variants |
| `sky-`, `far-`, `mid-<world>` | 1600 x 900, 2400 x 600, 2400 x 600 | background; far/mid strips tile sideways, transparent above |
| `vehicle-<world>` | 256 x 128 | the extraction chopper / ship |
| `tree-<world>` | 128 x 224 | the world's standing prop |
| `cage`, `cage-gold`, `flag`, `flag-up`, `pickup-nade`, `pickup-gun` | see templates | |

Worlds: jungle, factory, city, desert (the first four) and space, hell, dimension (Upside Down), games (Game World).
