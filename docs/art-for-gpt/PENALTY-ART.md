# The League · Penalty Shootout: art brief (paste this to GPT)

**The game:** a mobile flick-kick football (soccer) game. The camera sits **behind the ball** looking at the goal; you swipe
the ball to shoot, and when you keep goal you swipe to dive. Modes: a shootout, a Challenge ladder (targets, free-kick walls,
wind) and a Tournament. Our own designs: no real clubs, kits, badges, players, leagues or sponsors. The players and keepers are
**HEADLESS** bodies: the game puts real faces on them (the players' own faces, or characters from the game).
**Look:** bright, polished modern mobile-sports art (think the big flick-kick phone games): clean shapes, soft shading, strong
readable silhouettes, floodlit night stadium. Crisp at phone size. Transparent backgrounds (real alpha) on every sprite.

## 1. Players (most important)
Each sheet is ONE ROW of cells, one pose per cell, in the order listed. The **templates** show every cell with its name, the
pink anchor dot and the pink dashed head circle; the faint figure is our stand-in pose (match its stance and size, make it
look much better). The **references** show the poses as the game draws them today.

Rules for every cell:
- **Headless**: draw up to the top of the neck. Keep the pink circle EMPTY (transparent).
- **Same size in every cell:** 1 metre = 108 px, so a standing player is ~200 px from the soles to the top of the neck.
- No shadow under the feet (the game draws it), no text, no grid lines.

### Strikers (seen FROM BEHIND: the camera is behind the ball)
`striker-p1.png` and `striker-p2.png`: **2048 x 320** (8 cells of 256 x 320). Feet on the pink dot (128, 308) of each cell.

| Cell | Pose |
|---|---|
| `idle` | standing behind the ball, back to us, arms loose, shirt number readable |
| `run1` `run2` `run3` | the short run-up toward the ball (away from us), three steps |
| `plant` | standing foot planted beside the ball, kicking leg drawn back, arms out for balance |
| `strike` | the kick: kicking leg swinging through, body leaning back a little |
| `follow` | follow-through, kicking leg high in front |
| `cheer` | turned round to FACE us, both arms up celebrating (the face circle here is a FACE) |

- `striker-p1`: blue shirt with a white number **10** on the back, white shorts, blue socks, black boots.
- `striker-p2`: red shirt with a white number **9**, black shorts, red socks, white boots.

### Goalkeepers (seen FROM THE FRONT, facing us)
`keeper-p1.png`, `keeper-p2.png`, `keeper-cpu.png`: **3200 x 320** (10 cells of 320 x 320). The pink dot (160, 176) is the
**body centre** (the hips). Dives are drawn going to **screen RIGHT** (the game mirrors them).

| Cell | Pose |
|---|---|
| `ready` | knees bent, arms out wide, gloves up, on the toes |
| `set` | lower, set to spring, gloves forward |
| `dive-low` | full-length dive along the ground to the right, arms stretched past the head |
| `dive-mid` | diving at waist/chest height to the right, body angled ~45° |
| `dive-high` | leaping to the top corner, body steep, one glove reaching up |
| `jump` | straight up, both arms high (ball over the middle) |
| `crouch` | dropped low in the middle, gloves down to smother a low ball |
| `catch` | standing, ball clutched to the chest with both gloves (draw the gloves, no ball: the game draws the ball) |
| `cheer` | arms up, celebrating a save |
| `sad` | slumped, arms down, after conceding |

- `keeper-p1`: lime-green keeper jersey with padded elbows, black shorts, big white gloves.
- `keeper-p2`: hot-pink jersey, navy shorts, orange gloves.
- `keeper-cpu`: yellow-and-black jersey, black shorts, grey gloves (used for every opponent keeper).

### Wall player
`wall-player.png` **200 x 400**: a defender in a free-kick wall, facing us, hands crossed in front of the waist, feet together
at the bottom. Headless (face circle on the template). White shirt, black shorts.

## 2. Ball, goal, net
| File | Size | What |
|---|---|---|
| `ball.png` | 256 x 256 | match ball, round, filling the square, transparent outside (the game spins it) |
| `goal.png` | 1600 x 560 | the goal frame seen straight on: white posts and crossbar exactly at the picture edges (left post, right post, bar along the top), everything inside see-through |
| `net.png` | 512 x 512 | white net mesh on transparent, tiles both ways |
| `target.png` | 256 x 256 | a glowing target ring (challenge mode), transparent middle |

## 3. Stadium (three shapes for different screens)
The stands behind the goal at night under floodlights, packed crowd, a few flags. The **bottom edge of the picture = the line
where the pitch-side ad boards stand**: the game draws the boards and the pitch below it. No goal in the picture.

| File | Size | Screen |
|---|---|---|
| `stadium-tall.png` | 1080 x 1000 | phones held upright |
| `stadium-wide.png` | 1920 x 640 | 16:9 / phones sideways |
| `stadium-fold.png` | 1504 x 820 | near-square (Galaxy Fold open) |

`adboards.png` **2048 x 128**: a strip of glowing pitch-side LED boards with made-up sponsors from TV and film (fake brands
only, e.g. PADDY'S PUB, BRAWNDO, DUNDER MIFFLIN, LOS POLLOS HERMANOS, STAY PUFT, PIZZA PLANET), seamless side to side.

## 4. Title and trophy
| File | Size | What |
|---|---|---|
| `logo.png` | 1600 x 600 | PENALTY SHOOTOUT with "THE LEAGUE" small, bold sports-game lettering, transparent |
| `title-bg-tall.png` | 1080 x 1920 | title screen upright: a striker from behind standing over the ball on the penalty spot, keeper in goal, packed night stadium; leave the top third calm for the logo |
| `title-bg.png` | 1920 x 1080 | the same scene, 16:9 |
| `title-bg-fold.png` | 1504 x 1670 | the same scene for the Fold |
| `trophy.png` | 512 x 640 | a big shiny tournament cup (our own design), transparent |

## Hand back
PNG files named exactly as above, every one at the size given (2x is fine: the game scales by width). Upload them to Drive
or `art-inbox/penalty/`.
