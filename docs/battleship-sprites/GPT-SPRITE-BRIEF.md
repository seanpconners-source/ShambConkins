# Sprite brief for ShambConkins: Battleship · Fog of War

Paste this whole file into ChatGPT (image generation), together with the template picture for the slot you want, from
`docs/battleship-sprites/templates/` (the `@2x` previews are easiest to read). Ask for ONE picture or sheet at a time (the five
ships can go together).

## What the game is
A 2-player naval battle on one phone: each player hides five ships on an 8x8 sea grid, then they take turns firing at each
other's grid. A hit plays a short cut scene (a sailor fires the deck gun, the shell blows up the enemy warship); sinking a ship
plays "ABANDON SHIP!" (a torpedo hits, the warship tips over and burning, the crew jumps into the sea). The sailors wear the
players' real photo faces, so the sailor bodies are drawn WITHOUT heads.

## Art style (everything)
- **Bold cartoon / modern mobile-game look**: clean dark outline, flat colours with one shade and one highlight, chunky
  readable shapes, a little WWII navy flavour (grey steel, rivets, red anti-fouling below the waterline). Not photo-real.
- **Original designs.** No copies of the Hasbro board game's art, box or logo, no real ship names or flags.
- **Transparent background** (PNG with alpha) unless the slot says it fills the picture. If transparency is hard, a flat
  pure green #00FF00 background is OK (we key it out); then use no green close to #00FF00 in the art.
- Exact template size (or 2x / 4x of it, same proportions). Draw inside the template, then remove the grid, labels and marks.
- **Red marks** = anchor points (waterline, gun pivot); keep them where the template has them. **Faint drawing** = our
  current stand-in art, only for size and position. Don't trace it; make it better.
- The game adds the moving waves, the shake, sparks, smoke puffs, captions and all text: don't draw them.

## 1. Board pieces (seen from straight above, 96 px per grid cell)
| file | size | what |
|---|---|---|
| ship-battleship.png | 384×96 | the biggest warship, 4 cells long: two big gun turrets, bridge tower in the middle, deck planks |
| ship-cruiser.png | 288×96 | 3 cells: sleek cruiser, two turrets, a radar mast |
| ship-submarine.png | 288×96 | 3 cells: dark submarine at the surface, conning tower, a little white wake |
| ship-destroyer.png | 192×96 | 2 cells: small fast warship, one turret, torpedo tubes |
| ship-patrol.png | 192×96 | 2 cells: patrol boat with a small cabin and a deck gun |

- Seen from directly above, **bow (front) pointing RIGHT** (the red arrow), the hull filling the length and about 70% of
  the height, centred. The dashed lines are the cell edges (useful for placing turrets, not drawn). The game turns them for
  ships placed up/down, tints them green/red while you place them.
- **ship-<name>-sunk.png** (same sizes, optional): the same ship as a wreck: blackened, holed, broken in the middle, oil.
  Without it the game darkens the normal ship red.
- **hit.png** (4 frames of 96×96 in one row = 384×96): a burning hit on a cell (flames + smoke + a dark X of wreckage),
  looping flicker. It sits on top of the ship.
- **miss.png** (96×96): a white marker peg or a white ripple ring on the water, for an empty cell that was shot.
- **grid-sea.png** (768×768, fills the picture): the ocean under the 8x8 grid, seen from above: deep blue, soft light,
  gentle wave texture, NO grid lines or letters (the game draws them and moves faint wave lines on top). Keep it even so the
  white markers read everywhere.
- **board-bg.png** (1080×1920, portrait) and **board-bg-wide.png** (1920×1080, landscape), fill the picture: the room
  behind the grids, e.g. a dark naval war room / chart table with brass and maps, or a stormy ocean from above. The grids
  cover the middle (dashed square), so keep the middle calm and dark; interesting bits at the edges.

## 2. Explosion and splash (played once, 128×128 frames)
- **boom.png** (8 frames = 1024×128): an explosion from a flash, to a big orange fireball, to dark smoke clearing.
- **splash.png** (6 frames = 768×128): a water splash: a column of white water shooting up and falling back into rings.

## 3. Cut-scene pieces (side view)
- **cut-sky.png** (1600×1000, fills the picture): a dramatic sunset sky over the open sea, seen from deck height. The
  bottom edge is the horizon (the sea is drawn by the game below it), nothing important in the bottom strip.
- **warship.png** (1280×480): the enemy warship in SIDE view, bow left or right, grey hull with a red band below the
  waterline, turrets, bridge, funnel, masts. The red cross = the middle of the hull at the waterline; the blue line =
  stern to bow length (1200 px). The hull bottom reaches the template's bottom edge; the tallest mast may reach the top.
- **deck.png** (800×400, fills the picture): the deck the gunner stands on, seen from the side at the bottom-left of
  the screen: grey steel deck, railing, rivets, a coil of rope.
- **deck-gun.png** (440×72): the deck gun's barrel and breech, pointing RIGHT, the red cross at the left = where it turns.
- **torpedo.png** (224×64): a torpedo in side view, nose RIGHT, with its propeller at the back.
- **sailor-cap.png** (128×56): a white sailor "dixie cup" cap, seen from the front.

## 4. The sailor (headless; the player's face goes on top)
**sailor.png**: frames **120×160**, 4 rows, max 4 frames wide (480×640).
- The **blue FACE circle** is where the game puts the player's big photo face, with the cap on top. Leave it EMPTY (no
  head). The body is small (chibi, bobblehead style): collar just under the circle, then a white sailor shirt with the navy
  square collar and neckerchief, navy bell-bottoms, black shoes, about 45 px wide, reaching the bottom of the frame.
- Rows: **stand 2** (at the deck gun, hands forward on the gun) · **cheer 2** (both arms up, celebrating the hit) ·
  **fall 2** (jumping overboard, arms and legs flailing) · **swim 4** (in the water up to the chest, arms waving for help;
  the game hides the lower body under the waves).

## BATCH 2: the last hand-drawn bits (Nov 13; owner: "I want everything that we can to be a sprite so it looks legit")
Same photoreal style as the batch 1 art you delivered (see `style-reference/`). Real transparency unless marked opaque.

| file | size | frames | what |
|---|---|---|---|
| ship-fire.png | 128×160 per frame | 6 in one row (loops) | **Flames and black smoke burning on the hit warship's deck.** The red cross = where the fire sits on the deck (bottom centre); flames lick upward, smoke rolls off the top. The game puts three on the warship. |
| gun-flash.png | 160×96 per frame | 4 in one row | **The deck gun firing**: a big muzzle blast + smoke shooting RIGHT from the red cross (the muzzle), then dying away. The game turns it to the barrel's angle. |
| shell.png | 96×48 | still | **The shell in flight**, pointing RIGHT, glowing hot with a short smoke/heat streak behind it. Drawn about 40 px long. |
| torpedo-wake.png | 512×48 | still | **The white foaming wake** a torpedo leaves on the water, running left to right; its RIGHT end is where the torpedo is (strongest foam there, fading to the left). Stretched to the length of the run. |
| cut-sea.png | 1600×640 | still, OPAQUE | **The open sea** of the cut scenes seen from deck height, from the horizon (top edge, must meet the sunset sky's horizon) down to the bottom of the screen: a sunset reflection near the horizon, darker swells close up. |
| cut-sea-front.png | 1024×192 | still | **The near wave band** drawn over the ships' waterline: rolling foamy crests across the top third, solid water below, TRANSPARENT above the crests. Must tile seamlessly left-right (the game scrolls it). |
