# Sprite brief for ShambConkins: Sundown Showdown

Paste this whole file into ChatGPT (image generation), together with the template pictures from
`docs/sundown-sprites/templates/` (the `@4x` previews are easiest to read). Ask for ONE sheet at a time.

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

## Scenery (optional, per stage: town, canyon, mission)
Drawn at 0.5 game units per pixel: a picture **400 px tall** fills the whole view height.
- **town-sky.png** etc. (~800×400): the sky only.
- **town-far.png**, **town-near.png** (~1600×400, wide strips whose left and right edges match so they can repeat):
  distant mesas / near hills, bottom edge = the ground line.
- **town-ground.png** (~64×64 tile that repeats): dirt road / boardwalk planks; top edge = the ground line.
- **town-building-1.png** … **-4.png** (~200-320 px wide, 220-260 px tall): two-storey frontier building fronts with a
  covered balcony. **The balcony floor must be 80 px above the bottom edge** (players stand on it) and the upstairs
  windows centred about 150 px above the bottom; the ground-floor door near the middle.
- Same for **canyon-…** (red rock, no buildings needed) and **mission-…** (adobe walls, arches, torches, night sky).

## Hand back
PNG files named exactly as above. Send them to Claude (or drop them in `assets/sundown/`).
