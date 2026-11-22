# Strands & Ladders: art for GPT

Our Chutes and Ladders game, dressed as if Death Stranding had a family board game. Only the pictures and words are themed;
the board, ladders and chutes are the classic 1943 layout. Everything should look like a **real printed board game on a
table**: printed cardboard, a plastic spinner, cardboard standee pawns.

**Templates:** `docs/art-for-gpt/strands-templates/` (`node tools/strands-templates.mjs` rebuilds them). For each picture there is
a `-template.png` (pink guides: where things go, what to keep plain) and a `-reference.png` (what the game draws today).
Send GPT the template with the prompt below. **Make each picture at exactly the template's size.**

**Hand back:** PNG files named exactly like the slot (`board.png`, `deed-28.png`, ...). Claude puts them in `assets/strands/`
(lossless WebP); any picture that is missing is still drawn by the game.

## Style for every picture (paste this first)

> Death Stranding-inspired family board game art, printed on matte cardboard. Moody but friendly: muted greys, cold
> blue-green, rust orange, bone white and a little gold, soft painterly illustration with clean outlines, like a premium
> 1980s-style board game reissued by a modern studio. Lonely landscapes (grassy plains, black rocks, rivers, snowy
> mountains, timefall rain), delivery porters with tall cargo packs, baby pods (BB), black tar, ghostly floating figures
> (BTs) shown cute-spooky, not gory. ORIGINAL characters only: no real actors' faces, no copied logos (no real Death
> Stranding, Bridges or Kojima Productions logos), no text unless the slot asks for it.

## The pictures

| Slot | Size | Prompt (after the style text) |
|---|---|---|
| `board` | 2048x2048 | The printed game board, seen flat from straight above. A thick printed frame around a 10x10 grid of squares exactly on the template's grid. Each square a slightly different muted colour with a little landscape detail (grass, rock, river, snow, ruins, a road), lighter toward the top. Bottom-left square is Capital Knot City (a small city), top-left square is Edge Knot City (a city with a tall tower). **No numbers, no ladders, no slides/chutes** (the game prints those on top), keep the top-left corner of every square plain. |
| `table` | 1080x1920 | The table the board sits on, from above, tall: a dark worn wooden desk in a porter's private room, a few props at the edges (a cargo case, a coffee cup, a baby pod toy, a map). The middle (board) and the lower part (spinner) stay calm and dark. |
| `table-wide` | 1920x1080 | Same table, wide: board on the left, spinner on the right, props only at the edges. |
| `ladder-tile` | 256x256 | One section of a lightweight carbon-fibre climbing ladder seen from above: two dark grey rails with orange safety stripes centred on x=64 and x=192, one rung across the middle. Transparent background. Must repeat seamlessly top to bottom. |
| `tar-tile` | 256x256 | Seamless glossy black tar texture with faint oily shine and tiny bubbles, tileable on all four sides. |
| `spinner-face` | 1024x1024 | The spinner dial of a board game: a round printed card with 6 equal slices, big numbers 1-6 (1 centred at the top, then clockwise), each slice a different muted colour, a gold rim, small pegs between slices. Transparent outside the circle. Leave the centre (where the arrow pivots) simple. |
| `spinner-arrow` | 1024x1024 | The plastic spinner arrow on its own, pointing straight up, pivot exactly at the centre of the picture, tip near the top edge of the dial circle, a small gold rivet at the pivot. Transparent background. |
| `pawn-p1` | 256x384 | A cardboard standee pawn on a small plastic base: a delivery porter in a blue-trimmed suit with a tall cargo pack and a baby pod on the chest. **No head**: leave the head circle empty/transparent (the player's face goes there). |
| `pawn-p2` | 256x384 | Same, orange-trimmed suit, a slightly different cargo pack. No head. |
| `logo` | 1600x700 | Title logo "STRANDS & LADDERS" with a small line "A Death Stranding board game", weathered metal and gold lettering, a strand/rope motif, transparent background. |
| `card` | 1024x720 | An event card frame: printed card with a round picture window on the left (on the template's circle), a plain light text area on the right, a coloured banner strip along the bottom (the game prints the words). |
| `deed-1` ... `deed-80` | 512x512 | One picture per **ladder** (the good deed), list below. Square picture, subject inside the circle. |
| `slip-16` ... `slip-98` | 512x512 | One picture per **chute** (the slip), list below. |

### Ladders (good deed → reward)

| Slot | Picture |
|---|---|
| `deed-1` | A porter rebuilding a bridge over a river (reward: 1,000 Likes, little thumbs-up icons floating) |
| `deed-4` | A porter leaving a ladder for a stranger at a cliff |
| `deed-9` | A porter delivering a pizza box, flat and perfect |
| `deed-21` | A porter fixing a zip-line pylon on a hilltop |
| `deed-28` | A porter singing a lullaby to a baby in a glowing pod |
| `deed-36` | A porter charging a stranger's three-wheeled bike from a generator |
| `deed-51` | A porter building a little rain shelter during timefall |
| `deed-71` | A porter paving a long road with a road-building machine |
| `deed-80` | A porter connecting a glowing cable to a city terminal (the last link of the network) |

### Chutes (slip → consequence)

| Slot | Picture |
|---|---|
| `slip-16` | A porter breathing out near a floating ghostly figure, black tar hands rising |
| `slip-47` | A porter carrying a ridiculously tall stack of cargo, wobbling |
| `slip-49` | A porter walking through timefall rain, cargo boxes rusting |
| `slip-56` | A porter tripping over a small rock |
| `slip-62` | A porter walking into a camp of masked package thieves (yellow lights, poles) |
| `slip-64` | A porter napping in an open field while the baby pod glows angry red |
| `slip-87` | A porter shouting at a giant tar creature; a crater-like blast ring behind (voidout) |
| `slip-93` | A porter wading a deep river, cargo floating away |
| `slip-95` | A porter collapsing with an empty canteen |
| `slip-98` | A porter distracted by a masked showman in a gold mask on a cliff |

## Notes for Claude when the pictures come back
- Check sizes against `src/data/strandsArt.js` SLOTS; save lossless WebP to `assets/strands/<slot>.webp`, originals to
  `assets/originals/strands/`. The build turns them into `strands:<slot>` (downloaded when the game first opens).
- `board` must line up with the grid: squares from x/y 104 to 1944 (184 px each). Check by overlaying the template.
- Run `node tools/strands-templates.mjs --standin /tmp/x` to see the stand-in set, the in-game check is the browser test in
  the AI_STATE entry.
