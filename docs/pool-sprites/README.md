# Paddy's Pool art (drop-ins)

Slots, sizes and placement: `src/data/poolSprites.js` (the hall layout is `HALL` there; everything you can buy is in
`src/data/poolHall.js`). Files go in `assets/pool/<name>.png|webp` (lossless WebP after import; originals in
`assets/originals/pool/`), the build turns them into `pool:<name>`, and the app downloads them the first time either pool
game opens (`src/pwa.js` LATER `pool:`). Every slot falls back to the game's drawn art, so pictures can arrive one at a time.

- Templates: `node tools/pool-templates.mjs` (`--only=a,b`) → `docs/pool-sprites/templates/` (66 slots; each template is the
  game's own drawing, faded, with magenta = keep transparent and cyan = where the game draws something).
- Brief for GPT: `GPT-SPRITE-BRIEF.md`
- Pictures may come at exactly 2x the template size.
- Engine: `src/engines/paddysPool.js` (flow, controls, HUD, hall menu), `src/engines/pool/` (physics, rules, CPU, balls, art).

## Slots at a glance

| Slot | Size | Notes |
|---|---|---|
| `table-<id>` (6) | 1030 x 590 | top view, rails + pockets; transparent inside x 55..975, y 55..535 (felt is painted by the game) |
| `wear-1/2/3` | 880 x 440 | stains/rips over the felt bed, multiplied (3 = Paddy's wreck, 2 = taped, 1 = faint) |
| `cue-<id>` (8) | 1200 x 48 | cue lying flat, tip at the right edge |
| `floor-0..4` | 512 x 512 | tiling floor around the table (room tier) |
| `wall-0..4` | 1600 x 320 | wall strip above the table (TVs and neon go on top) |
| `hall-0..4` | 1600 x 1000 | the empty bar room seen straight on (room tier) |
| `hall-bar-0..4`, `hall-light-0..4`, `hall-tv-1..4` | see `HALL` | pieces placed in the hall; TVs with black screens |
| `hall-table-<id>` (6) | 1000 x 400 | the table from the front, felt quad transparent |
| `decor-<id>` (13) | see `HALL.decor` | neon signs, jukebox, dartboard, chalkboard, Pepe Silvia board, Dennis portrait, fan, trophy case, Megatouch, Rum Ham |
| `logo` | 1200 x 480 | PADDY'S POOL lettering |

Ball sets, felt colours and chalk are drawn by the game (balls are real rolling spheres), so they have no slots.
