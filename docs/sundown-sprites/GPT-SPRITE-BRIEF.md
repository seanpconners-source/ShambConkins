# Sprite brief for ShambConkins: Sundown Showdown

Paste this whole file into ChatGPT (image generation), together with the template pictures from
`docs/sundown-sprites/templates/` (the `@4x` previews are easiest to read). Ask for ONE sheet or picture at a time. For stage art also attach the building templates
(`templates/town-building-1@2x.png` etc.).

## What the game is
An original 2-player western run-and-gun for phones: two gunslingers run right through a frontier town, a canyon and a
Spanish mission at night, shooting bandits, up to a WANTED boss. The players' real faces are added by the game, so the
cowboys and the boss are drawn WITHOUT heads.

## Art style (all sheets)
- **16-bit arcade pixel art**, early-90s cabinet feel: bold dark 1-2 px outline, 3-4 shades per colour, chunky readable
  shapes, slight sunset rim light (warm orange on the right edge). Crisp pixels: no blur, no anti-aliasing, no gradients.
- **Original designs.** Do not copy or trace any existing game's characters, sprites or backgrounds (not Sunset Riders,
  not any other). Our own outfits, colours and shapes.
- **Transparent background** (PNG with alpha). Nothing outside the frames.
- **Everything faces RIGHT.**
- Exact frame sizes below, frames left to right in one row per animation, rows in the order listed, no gaps or padding.
  The template picture shows the grid: draw inside it, then remove the grid.
- **Red mark** in each template frame = where the feet touch the ground (same spot in every frame).
- **Blue circle** = where the game puts a real person's face. For the cowboys and the boss, draw the body from the
  neck down and leave that circle EMPTY (no head, no hat). The neck/collar ends just under the circle.

## The sheets (file name, frame size, rows and frame counts)

1. **cowboy-p1.png** (player 1), frame **64×64**. Lean gunslinger, long blue duster coat, tan shirt, brown gun belt, dark
   trousers, boots with spurs, one revolver. Rows: idle 4 (breathing, gun lowered) · run 8 · runShoot 8 (running,
   firing straight ahead) · shoot 2 (standing, arm straight out) · shootUp 2 (arm straight up) · shootDiagUp 2 (45° up)
   · shootDiagDown 2 (45° down) · duck 2 (crouched) · duckShoot 2 (crouched, firing ahead) · jump 4 (take-off, rise, top,
   fall) · slide 3 (low dive along the ground, body almost flat, arm forward) · death 6 (hit, falling backwards, ending
   flat on the ground). Muzzle flash is NOT drawn (the game adds it).
2. **cowboy-p2.png** (player 2): same layout and poses as cowboy-p1, different outfit: red poncho over a cream shirt,
   brown chaps, two-tone boots.
3. **bandit.png**, frame **64×64**. Outlaw in a black hat, red bandana over the nose, brown vest, revolver (draw the
   bandit's own head: these are enemies). Rows: idle 2 · walk 6 · shoot 2 · cover 2 (crouched low, as if behind a crate)
   · death 6 (hat flies off, falls backwards, ends lying down).
4. **knife.png**, frame **64×64**. Fast bandit with a big knife, sleeveless, red headband. Rows: run 6 · slash 2 ·
   death 6.
5. **dynamite.png**, frame **64×64**. Stocky miner-outlaw with a stick of dynamite (lit fuse). Rows: idle 2 · walk 6 ·
   throw 3 (wind-up, release, follow-through) · death 6.
6. **window.png**, frame **48×48**. A bandit leaning out of an upstairs window, the window frame and two wooden shutters
   included in the picture. Rows: peek 2 (shutters opening, bandit appearing) · shoot 2 · death 4 (slumps back inside).
7. **rider.png**, frame **112×96**. Bandit on a galloping brown horse, rider firing a pistol. Rows: gallop 6 · shoot 2 ·
   fall 6 (rider knocked off backwards, horse keeps running).
8. **horse.png**, frame **112×80**. The same horse galloping with no rider. Rows: gallop 6.
9. **boss.png**, frame **96×96**. Big imposing outlaw boss, long black coat with red lining, gold buckle, a heavy
   revolver or a rifle; NO head (blue circle empty, neck ends under it). Rows: idle 4 · walk 6 · shoot 3 · throw 3
   (throwing dynamite) · hurt 2 (flinch) · death 8 (staggers, falls, ends lying down).
10. **explosion.png**, frame **64×64**. Cartoon dynamite blast. Rows: boom 8 (flash, fireball, smoke, fade).
11. **muzzle.png**, frame **24×16**. Gun flash pointing right from the left edge. Rows: flash 3.

## Single pictures (any size close to these)
- **hat-p1.png** (~28×18): a dark brown cowboy hat with a blue band, seen from the front-side. **hat-p2.png**: wide
  sombrero-style hat with a red band. Bottom centre of the picture = where it sits on the head.
- **crate.png** (~28×24), **barrel.png** (~24×28), **wagon.png** (~120×80, covered wagon side view, facing right).
- **dynamite-stick.png** (~8×16), **bullet.png** (~8×3, pointing right), **enemy-bullet.png** (~6×6, glowing orange).
- **item-gold.png** (money bag ~16×16), **item-two.png** (two crossed revolvers ~18×16), **item-rapid.png** (lightning
  bolt over a revolver ~18×16).
- **logo.png** (~840×360): the title "SUNDOWN SHOWDOWN" on a hanging wooden sign, gold western lettering with a red
  outline, a setting sun behind.
- **poster.png** (~300×390): blank WANTED poster paper (aged, torn edges, nail holes), with NO text and an empty
  square for the face (the game writes the name, face and bounty).

## Stage art (the levels themselves)
Three stages, each a long side-scrolling street the players run along to the right. Same **16-bit arcade pixel-art** style
as the characters: bold dark outlines, 3-4 shades per colour, warm sunset light from the right, crisp pixels (no blur, no
gradients except stepped dithering in the sky), **our own original designs**. Make it rich and busy like a 90s arcade
cabinet: worn planks, nails, peeling paint, painted shop signs, lanterns, posters, bullet holes, hanging laundry, clutter.
The game builds each stage by placing your pieces along the road, so make **separate pieces**, not one big level picture.
Scale: **2 px of art = 1 game unit**; a cowboy is about 92 px tall in this scale, so draw doors, windows and props to suit.

### Backgrounds (per stage: `town-`, `canyon-`, `mission-`)
- **`<stage>-sky.png`** (800×400): the sky only, stretched over the screen. Town: late-afternoon sunset (orange to purple,
  stepped bands, a big low sun, a few long clouds). Canyon: blazing red-orange dusk. Mission: deep blue night, big moon,
  stars.
- **`<stage>-far.png`** (1600×400, transparent above the skyline, left and right edges MUST match so it repeats): distant
  silhouettes, bottom edge = the ground line. Town: mesas and buttes. Canyon: towering rock spires. Mission: dark hills
  with a distant bell tower.
- **`<stage>-near.png`** (1600×400, transparent above, edges match, bottom = ground line): nearer layer behind the street.
  Town: back rows of rooftops, water tower, windmill, telegraph poles. Canyon: closer red cliffs with ledges and cactus.
  Mission: adobe walls, cypress trees, rooftops.
- **`<stage>-ground.png`** (64×64 tile repeating sideways, top edge = the ground line, fills to the bottom of the screen):
  Town: packed dirt street with wheel ruts and a boardwalk edge. Canyon: cracked red dirt and pebbles. Mission: worn
  stone and sand.

### Building fronts (town and mission): EXACT sizes, use the templates
Flat front view (no perspective), bottom edge = the street. The game puts gunmen in the windows and in the doorway and
lets players stand on the balcony, so these spots must match the template pictures
`docs/sundown-sprites/templates/<name>.png` (the `@2x` copies are easier to read):
- **red line** = the balcony floor (80 px above the bottom). Draw a covered wooden balcony/porch roof whose walkable floor
  is exactly there, with a railing and posts down to the street.
- **blue boxes** (40×40) = window openings (dark inside, with frames/shutters around them).
- **green box** (40×64, bottom middle) = the front door (swinging saloon doors or a plain door).
- Put the shop sign across the top (false-front facade for the town).

| File | Size | Floors | Ideas |
|---|---|---|---|
| `town-building-1.png` | 256×260 | 2 | SALOON: false front, swinging doors, sign with a painted bottle |
| `town-building-2.png` | 224×260 | 2 | BANK: brick front, barred windows, gold lettering |
| `town-building-3.png` | 320×260 | 2 | HOTEL: long front, two-tone paint, hanging laundry on the balcony |
| `town-building-4.png` | 192×260 | 2 | SHERIFF / GENERAL STORE: weathered planks, wanted posters by the door |
| `mission-building-1.png` | 288×250 | 2 | CANTINA: adobe, arched doorway, wooden balcony, hanging lanterns |
| `mission-building-2.png` | 256×250 | 2 | POSADA: adobe with a tiled roof edge, flower pots on the balcony |
| `mission-building-3.png` | 224×150 | 1 | TIENDA: low adobe shop, awning, clay pots (no balcony) |
| `mission-building-4.png` | 320×150 | 1 | CAPILLA: low chapel wall with a small bell arch on top (no balcony) |

Single-storey ones (150 px tall) have only the lower windows and the door, no balcony.

### Canyon rock (no buildings)
- **`canyon-rock.png`** (64×64 tile, repeats in both directions): red layered sandstone face, cracks, strata lines. Fills
  the rock ledges players stand under and gunmen stand on.
- **`canyon-ledge-top.png`** (64×16 strip, repeats sideways): the rocky lip on top of a ledge, with tufts of dry grass
  and small stones; the top of the strip is the surface.

### Street props (single pictures, bottom centre on the ground, same scale)
`trough.png` (water trough ~48×20), `hitching-post.png` (~52×32), `lamp.png` (street lamp ~16×100, lit glass),
plus `crate.png`, `barrel.png` and `wagon.png` from the list above.

## Hand back
PNG files named exactly as above. Send them to Claude (or drop them in `assets/sundown/`).
