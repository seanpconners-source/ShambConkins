# Sprite brief for ShambConkins: Living Dead Horde

Paste this whole file into ChatGPT (image generation), together with the template picture for the slot you want, from
`docs/horde-sprites/templates/` (the `@2x` previews are easiest to read). Ask for ONE sheet or picture at a time, or a few
small ones (props, icons) together.

## What the game is
An original 2-player co-op horde-survival game for phones (the "survive until dawn, weapons fire by themselves" kind),
seen from above at a slight angle. Two survivors walk around a graveyard town at night while hundreds of zombies close
in. It is themed on *Return of the Living Dead* (toxic Trioxin barrels, the Uneeda medical supply warehouse, punks, tar
zombies) and has an *Evil Dead* variant (the cabin in the woods, Deadites). The survivors are BOBBLEHEADS: the game puts
the players' real photo faces, very big, on small cartoon bodies, so the survivor bodies are drawn WITHOUT heads.

## Art style (everything)
- **Clean cartoon, vector-like**: bold dark outline (about 3 px at template size), flat colours with one shade and one
  highlight, chunky readable shapes. Spooky but fun, not gory-realistic. Night palette: the game darkens everything
  around the survivors' lights, so keep colours fairly bright and the outline strong.
- **Seen from the front-side, slightly from above** (like the template guides), feet on the red mark.
- **Original designs.** Do not copy any existing game's sprites or a real actor's likeness. Film nods by costume only
  (a punk with a mohawk, a tar-covered zombie, a nurse, a riot cop...).
- **Transparent background** (PNG with alpha). If transparency is hard, a flat pure green #00FF00 background is OK
  (we key it out), but then use no green that close to #00FF00 in the art itself.
- **Everything faces RIGHT** (the game mirrors it). Animated sheets: frames left to right in one row per animation, rows in
  the order listed, exact frame size, no gaps or padding. Draw inside the template grid, then remove the grid, labels and
  marks. You may deliver at 2x or 4x the template size, same proportions.
- **Red mark** = the ground point (same spot in every frame). **Faint grey/colour drawing** in each frame = our current
  stand-in art, only to show the size and position. Don't trace it; make it better.
- The game adds the shadow under characters, the white hit flash, the health bars and all glows/lights: don't draw them.

## 1. Survivor bodies (headless, players' faces go on top)
**survivor-p1.png** (player 1, blue) and **survivor-p2.png** (player 2, pink): frame **112×128**, 4 rows.
- The **blue FACE circle** is where the game puts the player's big photo head. Leave it EMPTY (no head, no hat, no hair).
  The body is small (about 32 px wide, chibi proportions): neck/collar just under the circle, then a short torso,
  arms and legs down to the red mark. The head covers the top of the torso, so the legs, arms and hands matter most.
- Player 1: blue hoodie or jacket over a T-shirt, jeans, sneakers; player 2: pink jacket, dark trousers, boots. A small
  weapon on the back (a shotgun strap or a cricket bat) is welcome; hands stay empty (weapons fire by themselves).
- Keep the collar at the SAME height in every frame (the game bobs the head by itself).
- Rows: **idle 4** (standing, slight breathing) · **walk 6** (a full walking cycle, two steps) · **hurt 2** (flinching
  back, arms up) · **down 2** (fallen, kneeling or lying on the ground, waiting to be revived; the face circle stays
  where it is, so the body slumps under it).

## 2. Zombies and bosses (one walk cycle each)
Each enemy is one sheet, **1 row: walk 4** (a looping 4-frame walk/float/flap cycle), square frames of the size given.
The feet sit on the red mark; flyers (bat, ghost, banshee, the Hunger) hover with their lowest point about there. Bigger
enemies fill more of their frame (the bosses fill all of it).

| file | frame | what |
|---|---|---|
| enemy-shambler.png | 92×92 | the common zombie: torn blue shirt, grey-green skin, arms out, slow shuffle |
| enemy-runner.png | 84×84 | fast punk zombie: pink mohawk, ripped red top, leaning far forward, sprinting |
| enemy-crawler.png | 76×76 | half a body dragging itself on its arms, ribs and a trail behind |
| enemy-bloater.png | 144×144 | huge swollen round zombie with glowing green boils, tiny head and legs |
| enemy-bat.png | 68×68 | small undead bat, red eyes, wings flapping (frames = flap cycle) |
| enemy-spitter.png | 96×96 | zombie with a bulging green-glowing throat, drooling acid |
| enemy-barrel.png | 108×108 | zombie climbing out of / wearing a leaking yellow toxic barrel (green biohazard mark) |
| enemy-charger.png | 116×116 | big linebacker zombie: red jersey, number, shoulder pads, head down to charge |
| enemy-ghost.png | 104×104 | pale blue-white floating ghost with a wispy tail, arm reaching, see-through edges |
| enemy-armored.png | 112×112 | riot-gear zombie: helmet with visor, padded vest, baton |
| enemy-sergeant.png | 144×144 | elite zombie cop: navy uniform, gold badge, cap; bigger and tougher |
| enemy-nurse.png | 136×136 | elite zombie nurse: white uniform, red cross cap, giant syringe |
| enemy-tarman.png | 224×224 | boss: tall dripping tar-covered skeletal zombie, wide white eyes, "BRAAAINS" pose |
| enemy-colonel.png | 216×216 | boss: zombie army officer, olive uniform, medals, beret, pointing ahead |
| enemy-banshee.png | 200×200 | boss: screaming floating woman in white rags, long black hair, mouth wide open |
| enemy-mama.png | 280×280 | boss: a GIANT bloater with a nurse's cap, boils everywhere, waddling |
| enemy-titan.png | 340×340 | final boss: enormous mutant (Trioxin monster), six limbs, glowing green core in its chest |
| enemy-hunger.png | 240×240 | unkillable force: a black-robed reaper shape, skull face, red eyes, scythe, smoke at the hem |

Evil Dead version (optional, later): the same files with **-cabin** added (enemy-shambler-cabin.png...) are used in the
cabin game instead: pale Deadites with white eyes, flannel and torn clothes, the Lumberjack (colonel), the Dark One
(titan). Without them the cabin game uses the normal ones.

## 3. Props (stills, bottom-centre on the red mark)
| file | size | what |
|---|---|---|
| grave-1/2/3.png | 64×84 | gravestones: rounded with a cross · square with writing · stone cross; moss at the foot |
| tree-1/2/3.png | 128×156 | leafy dark-green tree · dead bare tree · dark pine tree |
| car-1/2.png | 200×100 | abandoned 1980s cars seen from the side: rusty red sedan · blue station wagon |
| lamp.png | 64×144 | street lamp, lit (light glass at the yellow ring; the game adds the glow) |
| lamp-broken.png | 64×144 | the same lamp smashed, dark |
| torch.png / torch-out.png | 48×144 | cabin torch on a post: burning · burnt out |
| barrel.png | 64×80 | wooden barrel |
| barrel-red.png | 64×80 | red explosive barrel with a warning sign |
| barrel-toxic.png | 64×80 | yellow Trioxin barrel with a green biohazard mark, leaking |
| crate.png | 72×72 | wooden supply crate |
| bush.png | 88×60 | dark bush |
| bones.png | 56×36 | a skull and bones on the ground |
| rubble.png | 68×40 | a few broken stones |

## 4. Buildings and ground
- **building-dead.png** (600×380): the start building, the UNEEDA MEDICAL SUPPLY warehouse front: grey walls, red sign
  board with the name, windows, a door in the middle at the red mark.
- **building-cabin.png** (600×380): the cabin in the woods: log walls, dark roof, porch, one lit window, door in the middle.
- **ground-dead.png** / **ground-cabin.png** (512×512): a SEAMLESS ground tile seen from straight above (it repeats over
  the whole map, the edges must join with no seam): dark grass with patches of dirt and leaves (cabin: browner forest
  floor). Low contrast, no big objects.

## 5. Gems and icons
- **gem-blue / gem-green / gem-red / gem-purple.png** (56×56): XP crystals (small → big value), a diamond shape with a
  shine.
- **icon-<name>.png** (128×128, the dotted circle = the safe area): weapon, upgrade and pickup pictures. The game draws
  the card frame round them. Names: boomstick (double-barrel shotgun), chainsaw, necro (an evil skin-bound book with a
  face), barrel (toxic barrel, thrown), goo (tar blob with eyes), crowbar (red), nailgun, lantern, grenade, medics (first
  aid circle), vinyl (record), bolt (lightning) · might, armor (shield), maxhp (heart +), recovery (first-aid kit),
  cooldown (stopwatch), area (rings), pspeed (bullet), duration (hourglass), magnet, luck (clover), growth (brains: also
  the healing pickup), greed (gold coin $), revive (heart with a heartbeat line) · chicken (roast drumstick), chest
  (treasure chest), bomb, coin, skull.

## BATCH 2: weapons and effects (Nov 13; owner: "cool sprites for the nail gun nails and the chainsaw arm weapon... the shotgun shells, the explosions... all of it")
Same rules as above, with three differences: **seen from straight above** (the effects lie on the ground or fly over
it), **match the delivered Batch 1 art** (the painted zombies, props and icons in `style-reference/`: same outline,
the same grimy horror-comedy palette; the owner wants these MEATY and loud: big flames, sparks, smoke, blood, toxic
green goo), and **no green screen**: real transparency only (the effects are full of greens and glows).
Templates: the orange shape in each frame shows how far the effect reaches in that frame, the dashed blue ring is the
radius the game scales the sheet to (`R`), the red cross is the pivot (the point the game puts on the spot). Frames are
played left to right ONCE over the effect's short life (about 0.2-0.5 s), except the 4 pools, which loop.

| file | frame | frames | what |
|---|---|---|---|
| fx-slash.png | 256×256 | 6 | **The chainsaw swipe**: the survivor's chainsaw arm ripping through a 100° wedge pointing RIGHT from the pivot (= the survivor, centre). Show the roaring chainsaw itself at the end of the arc (blade, teeth, motion blur), a hot spark/blood trail along the arc, chunks flying. The blade's tip reaches the dashed ring. Frame 1 = start of the swing (top of the wedge), frame 6 = the swing finished (bottom), fading. |
| fx-muzzle.png | 96×64 | 4 | **Boomstick blast** at the barrel (pivot at the left edge, middle): a fat shotgun flash and smoke puff shooting RIGHT, then dying away. |
| proj-shell.png | 32×16 | still | **A shotgun pellet / slug in flight**, pointing RIGHT (a hot glowing pellet with a short streak behind it). Drawn about 16×8 px in the game, many at once: keep it bold and simple. |
| proj-nail.png | 48×12 | still | **A nail in flight**, point to the RIGHT: steel nail, flat head on the left, a little motion streak. Drawn about 24×6 px. |
| fx-impact.png | 96×96 | 5 | The **hit flash** where a shot lands (pivot centre): a quick white-yellow spark burst with a little blood mist, shrinking away. |
| fx-explosion.png | 192×192 | 8 | **The big explosion** for grenades, barrels, bombs and bursting bloaters, from above: a flash, a fireball filling the dashed ring around frame 4, then black smoke and embers breaking up. Must work at any size (the game scales it to the blast). |
| fx-pulse.png | 256×256 | 6 | **The Hurricane Lantern pulse**: a ring of warm holy light expanding from the pivot to the dashed ring, with dust and sparks blown outward. |
| fx-bolt.png | 64×512 | 4 | **The Reanimation Bolt**: a crackling lightning strike from the TOP edge (pivot) to the bottom edge, flickering between frames, with a burst at the bottom. The game stretches it between the sky and the zombie it hits. |
| fx-gore.png | 128×128 | 6 | **A zombie bursting** when it dies, pivot = the ground under it: a splash of dark blood, guts and bone bits flying up and out, then a splat left on the ground. Gross but cartoony (this game is a horror-comedy). |
| pool-fire.png | 192×144 | 4 (loop) | The **Trioxin barrel pool** on the ground: bubbling, glowing toxic green goo with little green flames, filling the ellipse. (Optional Evil Dead copy **pool-fire-cabin.png**: burning kerosene, orange flames.) |
| pool-goo.png | 192×144 | 4 (loop) | **Bloater acid** splashed on the ground: yellow-green bubbling bile. |
| pool-tar.png | 192×144 | 4 (loop) | **Tarman's tar**: black glossy tar with slow bubbles and a dull sheen. |
| aura-goo.png | 192×144 | 4 (loop) | The **Tarman Goo weapon**: a ring of sticky black-purple ooze around the survivor's feet (keep the middle fairly see-through: the survivor stands in it). |
| shot-spit.png | 32×32 | still | A **spitter's green glob** flying RIGHT. |
| shot-fire.png | 32×32 | still | An **orange fireball** flying RIGHT. |
| shot-curse.png | 32×32 | still | A **purple curse orb** flying RIGHT (boss attack). |

Deliver at 2x (the `@2x` templates), PNG with real alpha, file names exactly as above.
