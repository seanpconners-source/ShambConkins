# Sprite brief for ShambConkins: the island speed-run game (Grok)

How to use this file:
1. Paste the "What the game is", "Art style" and "Rules" sections into Grok Imagine once, at the start of the chat.
2. For each picture: attach its template from `docs/sonic3-sprites/templates/` (the `@4x` one) and paste that picture's
   paragraph from below.
3. Ask for **ONE sheet, or ONE row, at a time**. The big runner sheet is best done a row at a time: the single-row
   templates are in `templates/rows/` (for example `runner-p1.walk@4x.png`).
4. Save each result as `<name>.png` (for a single row: `<name>.<row>.png`, for example `runner-p1.walk.png`) and upload
   them to GitHub `art-inbox/sonic3/` (or zip them into chat). Claude cuts out the background, lines the frames up on the
   grid, scales them down and stacks the rows.

## What the game is
A very fast 16-bit style side-scrolling platform game for phones: a tropical island zone with loops, springs, swinging
vines, zip lines, golden rings to collect and robot enemies to bounce on. Two players take turns. Each player's runner is
a small cartoon body that wears **the player's own photo face**, so the bodies are drawn **without a head**.

## Art style (everything)
- **Bright, punchy early-90s 16-bit console pixel art.** Clean chunky pixels, a dark 1 px outline, 3-5 flat tones per
  colour, strong highlights, saturated tropical colours (deep blue sky, emerald and lime greens, orange-brown checkered
  earth, turquoise sea). No blur, no airbrush, no photo textures, no 3D render look.
- **Original designs only.** These are our own characters and robots. Do not draw, copy or imitate any existing game's
  characters, robots, logos or screens. No text or letters in any picture.
- Everything faces **RIGHT**. The game mirrors it for left.

## Rules for every picture
- **Background:** transparent. If Grok won't do transparency, use a **flat pure green background (#00FF00) with no
  shadow or gradient on it** (and then use no pure green in the art). Backdrops and fill tiles marked *opaque* have no
  transparency.
- **Keep the template's layout:** same number of frames, left to right, evenly spaced, same size in every frame, all
  standing on the same line. Don't let frames touch or overlap. The grid, labels and marks must NOT be in your picture.
- Size: any size Grok makes is fine, as long as the proportions match the template. Claude scales it down.
- What the template marks mean:
  - **Red cross** = the anchor: where the feet touch the ground (or the centre, for balls, flyers, shots and effects).
    Same spot in every frame.
  - **Blue circle** = where the game puts a face. Leave it EMPTY: no head, no hair, no hat. The little tick shows which
    way is up for the face in that frame.
  - **Faint grey figure** (runner) = a pose guide only: match the position, size and pose; your art replaces it.
  - **Red line** (pictures) = the surface you stand on. **"repeats sideways"** = the left and right edges must join up
    with no seam.

## Priority order
1. The runners and their ball (`runner-p1`, `ball-p1`, then the `-p2` versions).
2. Rings, springs, item boxes, checkpoint, goal sign, effects, shields.
3. The four robots, the seed, the critters.
4. Jungle terrain, props and backdrop.
5. Mini-boss, boss, capsule, title card.

---

## 1. The runners: `runner-p1` and `runner-p2`
**Template:** `runner-p1@4x.png` (whole sheet) or `rows/runner-p1.<row>@4x.png`. **Frame:** 64×64.

**Who (player 1):** a small, stocky cartoon sprinter, seen from the side, about two heads tall including the face that
the game adds. A cobalt-blue one-piece racing suit with a white lightning stripe down the side, big white cartoon gloves,
chunky yellow-and-white high-top trainers with thick soles, and a long sky-blue scarf at the neck that streams out behind
when moving (it shows the speed). **Player 2 (`runner-p2`):** the same body and poses in a bright orange suit with a
cream stripe, teal trainers and a cream scarf.

**NO HEAD.** Draw the body from the neck down and leave the blue circle EMPTY. The collar and scarf end just under the
circle. Heads are big on purpose.

Rows (frames):
1. **stand** 1: relaxed, feet apart, fists at the sides.
2. **wait** 4: impatient: arms folded, one foot tapping.
3. **lookUp** 2: leaning back, looking up.
4. **crouch** 2: ducking down, then curled low.
5. **walk** 8: a bouncy walk, one full cycle.
6. **run** 8: a full sprint, one full cycle, arms pumping, leaning forward, scarf straight back.
7. **dash** 4: top speed: body leaning far forward, arms thrown back, the legs a spinning blur in the shape of a wheel.
8. **skid** 3: braking hard: leaning back, heels dug in, one arm out, scarf whipping forward.
9. **push** 4: shoving a heavy block with both hands, feet slipping.
10. **balance** 3: teetering on a ledge, arms windmilling.
11. **spring** 2: launched upward: body straight, both arms up.
12. **fall** 2: dropping: arms up, legs apart, scarf flying up.
13. **hurt** 2: knocked backwards, arms and legs thrown out.
14. **hang** 4: hanging by both hands from a bar above the head, legs swinging.
15. **win** 4: a victory pose: punches one fist into the air.
16. **dead** 2: flung into the air, limbs out.

## 2. The ball: `ball-p1` and `ball-p2`
**Template:** `ball-p1@4x.png`. **Frame:** 48×48. Anchor = the centre.
The runner curled into a tight spinning ball (used for jumps, rolling and the spin charge). The face sits in the middle
(blue circle, leave empty): draw the curled suit, gloves, trainers and scarf wrapped round it as a spinning ring with
motion streaks. Blue for p1, orange for p2.
1. **roll** 8: one full turn (the tick shows how far the ball has turned).
2. **spindash** 6: spinning on the spot, squashed slightly flat and wide, charging up.

## 3. Level objects
- **`ring`** (16×16): a fat golden ring. **spin** 8: turning on its upright axis, one full turn (round → thin edge →
  round). **sparkle** 4: a small white-gold twinkle burst (ring collected).
- **`spring`** (32×32, anchor bottom centre): a coiled spring on a metal base with a flat coloured plate on top.
  Rows: **yellow** 3, **red** 3 (pointing up: resting, stretched, bouncing back), **yellowDiag** 3, **redDiag** 3 (the
  same, pointing up-right at 45°).
- **`monitor`** (32×32, anchor bottom centre): a chunky item-box TV on two little feet. **box** 2: screen showing static
  flicker (leave the screen dark and empty, the game draws the icon). **broken** 1: smashed, just the base.
- **`icons`** (16×16, one each): two gold rings, a speed trainer, a star, a flame, a water bubble, a lightning bolt, a
  plain blue shield, a red skull trap.
- **`starpost`** (32×64, anchor bottom centre): a checkpoint pole with a ball on top. **idle** 1: blue ball. **spin** 8:
  the ball whirling round the pole top. **lit** 2: red ball, glowing.
- **`sign`** (48×64, anchor bottom centre): the goal signpost, a round board on a pole. **spin** 6: the board turning
  round (front → edge → back → edge). **done** 1: board facing front, blank blue disc with a gold rim: leave the blue
  circle empty (the game puts the winner's face on it).
- **`shields`** (56×56, anchor centre): see-through bubbles that surround the runner. **plain** 4: blue glass sphere
  with a moving shine. **fire** 6: a ball of flame. **bubble** 6: a wobbling water bubble. **lightning** 6: a sphere of
  crackling yellow sparks. **stars** 4: a ring of twinkling stars (invincible).
- **`fx`** (32×32, anchor centre): **pop** 5: a robot bursting in a puff of smoke and stars. **dust** 4: a small skid
  dust cloud. **spindust** 6: dust jetting out low to the left. **rubble** 4: tumbling rock chunks.
- **`spikes`** (32×32 picture): four steel spikes pointing up on a metal base; repeats sideways.
- **`rock-wall`** (32×64): a stack of cracked boulders (a wall you smash through).
- **`platform`** (64×32): a small floating chunk of grassy earth, flat top on the red line. **`platform-crumble`**
  (96×32): the same, longer and cracked.
- **`vine-rope`** (16×32, repeats downwards), **`vine-handle`** (32×16): a thick leafy jungle vine and the wooden
  grab-bar at its end.
- **`zip-handle`** (24×24): a pulley wheel with a grab-bar under it. **`zip-post`** (16×48): a wooden post with a rope
  ring.
- **`bridge`** (32×16, repeats sideways): rope-bridge planks.
- **`coconut`** (16×16): a coconut (thrown at you).

## 4. Robots (our own designs: friendly-looking, toy-like, a little dumb)
- **`charger`** (64×40, anchor at the wheels on the ground): a red armoured beetle-rhino robot on two wheels with a
  steel horn and big cartoon eyes. **roll** 4: trundling. **rev** 2: shaking, eyes angry, wheels spinning. **charge** 4:
  rushing forward, dust behind.
- **`thrower`** (48×48, anchor centre): a small brown robot monkey clinging to the left side of a tree trunk (the trunk
  is NOT in the picture). **idle** 2, **climb** 4 (shinning up), **throw** 4 (lobbing a coconut overarm).
- **`shooter`** (48×48, anchor at the base): a robot flower: green metal leaves, a magenta bulb head. **closed** 2:
  bulb shut, swaying. **open** 3: petals opening to show a nozzle. **spit** 2: firing, recoil.
- **`flyer`** (48×40, anchor centre): a striped orange robot wasp with glass wings and a stinger. **fly** 4: hovering,
  wings a blur. **dive** 2: stinger down.
- **`seed`** (16×16): **spin** 4: a spiky yellow seed pod spinning.
- **`critter`** (24×24): little animals freed from robots, each hopping in 2 frames: **bird** (blue), **rabbit**
  (white), **squirrel** (brown).

## 5. Jungle zone terrain, props and backdrop
- **`jungle-soil`** (64×64, opaque, repeats both ways): orange-brown earth in a soft checker pattern of two tones.
- **`jungle-rock`** (64×64, opaque, repeats both ways): grey-brown stacked stone.
- **`jungle-grass`** (64×32, repeats sideways): the grass edge that sits on top of the soil: lime blades and a darker
  fringe above the red line, roots and drips hanging down into the soil below it.
- **`jungle-under`** (64×16, repeats sideways): the dark, rooty underside edge of an overhang.
- **`palm`** (96×160), **`bush`** (48×32), **`totem`** (32×64, a carved stone idol), **`tree-trunk`** (32×64, repeats
  downwards), **`flower`** (16×32, **sway** 4), **`waterfall`** (64×64, opaque, **flow** 4, repeats downwards).
- Backdrop, far to near (all 512 wide, all repeat sideways):
  - **`jungle-sky`** (512×224, opaque): deep blue at the top fading to pale turquoise at the horizon.
  - **`jungle-clouds`** (512×64): a band of puffy white clouds.
  - **`jungle-sea`** (512×48, opaque): sparkling sea in horizontal bands.
  - **`jungle-island`** (512×96): far misty mountains and a volcano, flat bottom edge.
  - **`jungle-far`** (512×128): a wall of distant treetops, flat bottom edge.
  - **`jungle-near`** (512×160): big dark trunks, hanging leaves and vines, nearer and darker.

## 6. Bosses and screens
- **`miniboss`** (96×96, anchor centre): a hovering round robot pod with flame-thrower arms. The pilot's face goes in
  the blue circle behind a glass dome (leave it empty). **hover** 2, **attack** 4 (arms swing down and fire), **hit** 1
  (flashing white, rattled), **wreck** 3 (smoking, breaking up).
- **`boss`** (128×128, anchor centre): a bigger flying machine: an armoured egg-shaped cockpit with a glass dome (blue
  circle empty) over a swinging spiked wrecking arm. Same rows.
- **`capsule`** (64×72, anchor bottom centre): a riveted metal animal-prison capsule with a big button on top.
  **shut** 1, **open** 3 (button pressed, sides bursting open).
- **`title-card`** (320×224): bold slanted colour bands and shapes for the zone title screen (red, yellow, blue), with
  empty space for words. No words.
