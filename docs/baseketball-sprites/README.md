# BASEketball art (drop-ins)

Slots, sizes and anchor points: `src/data/baseketballSprites.js`. Files go in `assets/baseketball/<name>.png|webp`
(lossless WebP after import; originals in `assets/originals/baseketball/`), the build turns them into `baseketball:<name>`,
and the app downloads them the first time either BASEketball game opens (`src/pwa.js` LATER). Every slot falls back to the
game's drawn art, so pictures can arrive one at a time.

- Templates: `node tools/baseketball-templates.mjs` (`--only=a,b`) → `docs/baseketball-sprites/templates/`
- Brief for GPT: `GPT-SPRITE-BRIEF.md`
- Pictures may come at exactly 2x the template size (sheets are read by width, so any whole multiple works).
- Engine: `src/engines/baseketball.js` (movie rules + Hoop Jones mode). Psych-out lines: `src/data/psychOuts.js`.
