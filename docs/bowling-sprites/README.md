# Kingpin Bowling art

Drop-in pictures for Kingpin Bowling (`kingpin-bowling`, `lebowski-bowling`). Put them in `assets/bowling/<name>.webp`
(or `.png`); the build turns them into `bowl:<name>`. Any slot without a picture keeps the game's own painted art, so
pictures can arrive one at a time. Slot names, sizes and layout: `src/data/bowlSprites.js`.

- Templates: `node tools/bowl-templates.mjs` writes `docs/bowling-sprites/templates/<name>.png` (the game's own art,
  faded, with layout marks). `--only=a,b` redoes some.
- Brief for GPT: `GPT-SPRITE-BRIEF.md`.
- Importing: save lossless WebP at the template size (2x is fine), keep the original in `assets/originals/bowling/`.
  Check in the game: the alley screen's Alley tab previews every era.
