# Rocky · Fight Night (Punch-Out style boxing): art brief (paste this to GPT)

**The game:** an arcade boxing game in the spirit of the NES/SNES classic: you box **from behind** (your boxer is at the
bottom of the screen, back to us) against a **big opponent facing you**. Opponents telegraph, swing, get dazed, get knocked
down; a referee counts. Our own designs: no Nintendo characters, sprites, logos or real boxing brands. The opponents are
**HEADLESS bodies**: the game puts a real face from our cast on each neck (they're famous characters, so the bodies must
leave the face circle empty). **Look:** bold, chunky, colourful 16-bit-arcade-meets-modern style: thick outlines, big
gloves, exaggerated cartoon muscle, strong readable poses, bright ring lights. Crisp at phone size.

## 1. Fighter sheets (most important)
Each sheet is ONE ROW of cells, one pose per cell in the order listed. The **templates** (`<sheet>-template.png`) show
each cell with its pose name, the pink **hips** dot and the pink dashed head circle; the faint figure is our stand-in pose
(match its stance, limb angles and size; make it look far better). The **references** show how the game draws it today.
Rules for every cell:
- **Headless**: draw up to the top of the neck; keep the pink circle EMPTY (transparent).
- **Same scale everywhere:** 1 metre = 120 px; the hips sit on the pink dot in every cell (lying poses: as shown).
- Transparent background (real alpha), no text, no shadows on the floor, no ring or ropes.
- Gloves are BIG (arcade style) and the same colour in every cell.

### Opponent bodies (seen FROM THE FRONT, facing us)
Five body types, each **9200 x 560** (23 cells of 400 x 560). Punches with one hand are drawn with the glove on **screen
LEFT** (the game mirrors them for the other hand).

| Sheet | Body |
|---|---|
| `foe-lean.png` | lean, wiry boxer with long arms; purple trunks, white gloves |
| `foe-heavy.png` | heavyweight brawler with a thick torso and gut; red trunks, dark red gloves |
| `foe-giant.png` | towering giant, massive chest and arms; charcoal trunks, steel-grey gloves |
| `foe-fast.png` | small quick boxer, light on his feet; orange trunks, blue gloves |
| `foe-champ.png` | chiselled champion, perfect physique; red trunks with a gold stripe, red gloves |

| # | Pose | What it shows |
|---|---|---|
| 1 | `idle` | bouncing stance, gloves up by the chin |
| 2 | `idle2` | the other half of the bounce |
| 3 | `guardHigh` | gloves together covering the face |
| 4 | `guardLow` | gloves down covering the belly |
| 5 | `tellJab` | quick pull-back of the right hand (a jab is coming) |
| 6 | `jab` | jab thrown straight AT US: the glove big in the foreground |
| 7 | `tellHook` | big wind-up, glove drawn back past the shoulder, body twisted |
| 8 | `hook` | wide hook swinging across at us |
| 9 | `tellUpper` | crouched low, glove dropped to the hip, coiled |
| 10 | `upper` | rising uppercut at us, body extending up |
| 11 | `tellBody` | leaning in, glove pulled back low |
| 12 | `body` | punch to our stomach, glove big and low |
| 13 | `tellSpecial` | both arms raised high, powering up (signature move) |
| 14 | `special` | both gloves exploding forward at us |
| 15 | `hurtHead` | head snapped back, arms flung out (the face circle moves back with it) |
| 16 | `hurtBody` | doubled over from a body shot |
| 17 | `dizzy` | wobbling, arms dangling, dazed |
| 18 | `block` | turtled up, gloves tight in front of the face |
| 19 | `fall` | falling backwards |
| 20 | `down` | flat on the canvas |
| 21 | `getup` | on one knee, getting up |
| 22 | `taunt` | showboating, one glove raised and waving |
| 23 | `win` | both arms up, celebrating |

### Your boxer (seen FROM BEHIND)
`me-p1.png` and `me-p2.png`: **5120 x 420** (16 cells of 320 x 420). Hips on the pink dot. Bare muscular back, the game
draws the back of the head in the circle.
- `me-p1`: royal-blue trunks with a white waistband, blue gloves.
- `me-p2`: crimson trunks with a gold waistband, red gloves.

| Pose | What it shows |
|---|---|
| `idle` | guard up, gloves either side of the head |
| `jabL` / `jabR` | left / right punch to the head, arm reaching up and away from us |
| `bodyL` / `bodyR` | left / right punch to the body, arm reaching forward and lower |
| `dodgeL` / `dodgeR` | leaning hard to the left / right |
| `duck` | crouched low, gloves up |
| `block` | gloves together in front of the face |
| `star1` | the star uppercut wind-up: dropped low, right glove cocked at the hip |
| `star2` | the star uppercut: right arm driving straight up |
| `hurt` | rocked by a punch, head snapped to the side |
| `tired` | exhausted, gloves drooping |
| `down` | falling / knocked down |
| `getup` | rising off the canvas |
| `win` | arms raised |

### Referee
`referee.png` **1280 x 480** (4 cells of 320 x 480): our own referee, bald older man, black-and-white striped shirt, black
bow tie, black trousers, front view, WITH his head (not headless): `stand`, `count` (arm swinging down on a count),
`wave` (waving the fight off), `raise` (one arm raised high).

## 2. Arenas (one per circuit, three screen shapes each)
The crowd and arena BEHIND the ring; the bottom ~30% is the ring canvas seen from ringside. **Leave the ring empty**: the
game draws the ropes, posts, referee and fighters. Keep the centre (where the opponent stands) calm and not too bright.

| Circuit | Files (tall 1080x1920 · wide 1920x1080 · fold 1504x1670) | Mood |
|---|---|---|
| Minor | `arena-minor-tall/-wide/-fold.png` | small smoky gym arena, a few hundred fans, bare bulbs |
| Major | `arena-major-tall/-wide/-fold.png` | packed casino ballroom, chandeliers, high rollers |
| World | `arena-world-tall/-wide/-fold.png` | huge sold-out arena, giant screens, camera flashes |
| Title | `arena-title-tall/-wide/-fold.png` | massive stadium at night, fireworks, lasers, flags |

## 3. Corner, title, extras
| File | Size | What |
|---|---|---|
| `corner-tall.png` / `corner-wide.png` | 1080x1920 / 1920x1080 | between rounds: our corner, stool, towel, water bucket, ring post (no people) |
| `logo.png` | 1600 x 700 | FIGHT NIGHT with "ROCKY'S CIRCUIT" small, bold 80s boxing lettering, transparent |
| `title-bg-tall.png` / `title-bg-wide.png` / `title-bg-fold.png` | 1080x1920 / 1920x1080 / 1504x1670 | a boxing ring under one hard spotlight, smoke, two gloves hanging on the ropes |
| `belt.png` | 800 x 480 | a gaudy championship belt, gold plate, red jewel, our own design, transparent |
| `fx-hit.png` | 768 x 128 | punch impact burst, 6 frames of 128x128 left to right |
| `star.png` / `heart.png` | 128 x 128 | gold star (star punch) / red heart (stamina), transparent |

## Hand back
PNG files named exactly as above, at the sizes given (2x is fine). Upload to Drive or `art-inbox/fightnight/`.
