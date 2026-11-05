# Sprite brief for ShambConkins: Symphony of the Night

How to use this file:
1. Paste this whole file into ChatGPT (image generation).
2. Add the template picture for the sheet you want, from `docs/sotn-sprites/templates/`. The `@2x` versions are easiest to
   read.
3. Ask for **ONE sheet or picture at a time**. If a big sheet comes out messy, ask for one row at a time on the same
   template. Claude can stack the rows afterwards.

## What the game is
A dark gothic 2D action-platformer for phones, side view, in the spirit of late-90s 32-bit console "castle" games. A
caped hero storms a vampire's castle at night, in this order:
- a moonlit forest;
- the drawbridge and gate;
- a torch-lit entrance hall;
- flooded underground caverns;
- a marble gallery;
- the throne room, with the vampire lord and then his monstrous true form.

## Art style (everything)
- **Super dark, gothic, badass.** Moonlight blues and violets, blood reds, candle and torch gold, cold stone greys,
  near-black shadows. Ornate gothic detail: arches, tracery, iron, velvet, bone. Grim and elegant, never cartoony.
- **Hand-pixelled 32-bit sprite art.** Crisp pixels, a dark 1-2 px outline, rich shading with 5-8 tones per material,
  rim light from the moon on the upper edges. No blur, no soft airbrush, no photo textures.
- **Original designs.** Make your own characters, monsters and rooms in this style. Do not copy, trace or recreate
  sprites, backgrounds or logos from any existing game (including Konami's Castlevania games), and no text in the art.
- **Transparent background** (PNG with alpha) for every sprite and prop. Backgrounds and floor tiles are opaque.
- **Exact frame sizes** (below and in each template):
  - Frames run left to right, one row per animation, rows in the listed order.
  - No gaps, no padding.
  - Draw inside the grid, then remove the grid and every mark.
- **Everything faces RIGHT.** The game mirrors it for left.
- What the template marks mean:
  - **Red cross** = the anchor: where the feet touch the ground (or the centre, for flyers and shots). Keep it at the
    same spot in every frame, so the character doesn't jitter.
  - **Faint grey figure** = a pose guide: the game's current simple drawing of that frame. Match its position, size and
    pose; your art replaces it.
  - **Blue circle** (hero only) = where the game puts the player's real face. Draw no head there (see the hero).
  - **Yellow ring + dashed line** (hero attack rows) = the sword hand and the blade's direction. The game draws the sword
    itself, so draw a clenched fist at the ring, holding NOTHING.
  - **Orange box** (demon) = his head. Keep the head there: it is his weak spot.

## Priority order
1. The hero.
2. The monsters.
3. Death, the vampire lord, the true form.
4. Backgrounds, floors and props.
5. Candles, items and effects.

## 1. The hero: `hero-p1.png` and `hero-p2.png`
**Template:** `hero-p1@2x.png`. **Frame:** 128×144.

**Who:** a tall, slender, aristocratic half-vampire swordsman (an original design, not an existing game character).
- A long black coat with gold trim and a white cravat at the throat.
- Dark trousers and tall black boots.
- A sweeping floor-length cape with a deep crimson lining (**hero-p2: royal-blue lining**, everything else the same).
- Long silver-white hair falling down his back, behind the face circle.

**NO HEAD.** Draw him from the neck down and leave the blue circle EMPTY: no face, no hair over it, no hat. The collar
and cravat end just under the circle. The game adds the player's own face, so heads are big on purpose.

The cape must move: it billows behind on runs, dashes and jumps, and sways slightly when he stands.

Rows:
1. **stand** 4: a proud, still stance; the cape and hair stir.
2. **walk** 8: a long graceful stride (one full cycle: left step, right step).
3. **crouch** 2: low on one knee, cape pooled on the floor.
4. **crouchSlash** 4: a crouching quick cut, the fist on the yellow ring.
5. **jump** 3: leaving the ground, rising, near the top.
6. **fall** 3: starting to fall, falling, about to land (the cape flies up).
7. **flip** 8: the double-jump somersault, a full turn. The blue circle shows where the neck points in each frame.
8. **land** 2: an impact crouch, then rising.
9. **dash** 4: a quick back-dash: gliding backwards, leaning back, cape thrown forward.
10. **kick** 2: a diving kick down and forward, one boot leading.
11. **hurt** 2: knocked back, arms thrown out.
12. **cast** 4: a spell. The cape spreads wide like wings, one hand raised.
13. **slash** 4: a quick cut across the chest, the fist on the ring.
14. **stab** 5: a lunging thrust, the arm driving straight forward along the line.
15. **cleave** 6: a big overhead chop, the fist from over the shoulder down to the front.
16. **dead** 6: collapsing backwards onto the floor, ending lying down. The circle shows where the neck goes. The last
    frame is held.

## 2. The monsters (transparent, feet on the red cross)
- **zombie.png**, 96×96: a rotting grey-green ghoul in rags, red pinprick eyes.
  - rise 4: clawing up out of the ground. The game also slides it up out of the floor.
  - walk 6: a shambling walk, arms reaching forward.
- **bloody.png**, 128×112: a bigger, flayed, blood-soaked zombie, dripping.
  - walk 6.
  - swipe 4: a wide claw swipe. The hit lands in frames 2-3.
- **warg.png**, 192×96: a huge black-blue wolf, spiky mane, yellow eyes, long fangs.
  - idle 4: low, growling.
  - run 6: a full gallop.
  - tell 3: crouching back to pounce, jaws opening.
  - lunge 2: frame 1 leaping up with jaws wide, frame 2 coming down.
  - skid 2: sliding to a stop.
- **skeleton.png**, 80×96: a bone-white skeleton with a glowing red eye.
  - walk 6.
  - throw 4: winding up and hurling a bone (it leaves the hand in frame 2).
- **bat.png**, 64×48 (the anchor is the body's centre): a red-eyed bat.
  - hang 2: hanging asleep, wings folded.
  - fly 4: a flap cycle.
- **merman.png**, 80×96: a scaly green fish-man with a red fin crest.
  - leap 2: frame 1 bursting up out of the water, frame 2 dropping.
  - walk 6.
  - spit 4: rearing back and spitting fire (the fire comes out in frame 3).
- **armor.png**, 112×128: a hulking suit of steel armour with a red plume and a glowing slit.
  - walk 4: a heavy clank, the great axe in its hand.
  - throw 4: hurling the axe (it leaves the hand in frame 3).
  - empty 4: walking with an empty hand (the axe is flying).

## 3. The bosses
- **death.png**, 240×200: a towering reaper in a tattered violet-black hooded robe that fades to wisps at the hem, a
  grinning skull with red eyes, bony hands, a huge silver scythe. He floats; the anchor is under the hem.
  - float 4: hovering, robe rippling.
  - swing 6: a great scythe swing.
- **dracula.png**, 224×152: the vampire lord. Tall and regal, pale, long white hair, red eyes. A high-collared black
  cloak with a blood-red lining over a dark tunic with a gold clasp.
  - idle 4: standing still and menacing.
  - cast 4: the cloak spreading open like bat wings, hands rising (frame 4 = fully open).
- **demon.png**, 448×352: his true form. A colossal grey-violet winged demon.
  - Body: digitigrade legs, a broad ribbed chest, long clawed arms, membrane wings with red veins.
  - Head: a horned, fanged head with glowing yellow eyes. **Keep the head inside the orange box.**
  - Rows:
    - idle 4: breathing, wings flexing.
    - crouch 3: crouching to leap, ending at the deepest crouch.
    - leap 2: frame 1 airborne going up, frame 2 coming down.
    - breath 4: lowering the head, opening the jaws, then two frames of jaws wide (the game adds the fire).
    - summon 4: a clawed arm sweeping up to call bats.

## 4. Stage art
Backgrounds and floors are opaque; props are transparent. Each template shows the size, the drawn version and the lines
that matter.

**Outside:**
- **forest-sky.png** (~512×480): a night sky, starfield and violet clouds, opaque. It is stretched over the screen.
- **moon.png** (240×240, transparent): a huge pale full moon with a soft halo.
- **castle-far.png** (720×480, transparent): a distant black gothic castle on a crag, a few lit windows. Also used on the
  title screen.
- **forest-far.png** (800×480, transparent above the hills): dark rolling hills with tiny dead pines. It repeats
  sideways: make the left and right edges match.
- **forest-near.png** (640×480, transparent): huge twisted dead trees in silhouette. It repeats; match the edges.
- **fog.png** (1024×120, transparent): drifting low mist. It repeats.
- Props (transparent, bottom on the ground line):
  - **tree.png** (~240×280): a gnarled dead tree, trunk base at the bottom centre.
  - **fence.png** (64×80, repeats): wrought-iron spikes.
  - **grave.png** (32×32): a cracked headstone.
  - **bridge.png** (64×96, repeats): drawbridge planks with iron bands. Deck surface 4 px from the top, dark water below.
- **gate-wall.png** (128×400, repeats): the castle's front wall, with battlements at the top and the floor at the bottom.
- **gate.png** (68×208): the stone archway with posts and carvings. **The doorway inside the blue box must be
  TRANSPARENT.**
- **portcullis.png** (44×160): the iron gate grille. It slams down when you enter.

**Room walls** (opaque, 512×480, repeating, left and right edges matching): a plain wall with NO windows, doors or pillars
(the game places those in front). The red line on each template is the floor.
- **hall-back.png**: dark castle brick with faint relief.
- **cave-back.png**: wet blue-black rock.
- **gallery-back.png**: veined dark marble panels.
- **throne-back.png**: blood-dark stone and velvet.

**Floors** (opaque, 128×160, repeating sideways):
- The top edge is the walking surface. The game follows the slopes and repeats the lower half downward.
- One per area:
  - **forest-ground.png**: mossy earth with a grass lip.
  - **gate-ground.png** and **hall-ground.png**: worn flagstones.
  - **cave-ground.png**: wet rock.
  - **gallery-ground.png**: polished marble.
  - **throne-ground.png**: red-veined stone.

**Level pieces** (transparent):
- **balcony.png** (64×48, repeats): a stone balcony. A railing in the top 16 px, the walking floor 16 px down.
- **stepping-stone.png** (80×68): a stone block on a column, standing in water.
- **crack-wall.png** (32×100): a cracked brick wall section that breaks open.
- **bars.png** (32×292): iron bars from the ceiling to the floor.
- **water.png** (64×24, repeats): a rippling water surface with highlights (keep it semi-transparent).

**Props** (transparent):
- **window.png** (68×160): a tall gothic arched window, moonlit blue glass.
- **pillar.png** (40×400): a gothic column from the ceiling to the floor.
- **banner.png** (32×132): a hanging crimson banner with a gold crest.
- **statue.png** (68×116): a winged gargoyle on a plinth.
- **altar.png** (48×26): a small stone altar.
- **stalactite.png** (32×96): an icy cave stalactite.
- **rock-pillar.png** (44×480): a cave rock column.
- **arch.png** (160×320): a marble archway with a window, from the ceiling to the floor.
- **stained-glass.png** (140×270): a great stained-glass window, crimson and violet.
- **throne.png** (84×144): the vampire's throne, black and crimson with gold.
- **carpet.png** (64×8, repeats): a red carpet edge.

## 5. Candles, weapons, items, effects
**Candles** (rows: lit 4 flickering, out 1 broken and unlit):
- **candelabra.png** (48×64): a three-candle gold candelabra on a stand.
- **lantern.png** (32×96): a stone garden lantern on a post (its foot on the red cross).
- **torch.png** (32×64): a wall torch in an iron bracket.

**Weapons** (transparent):
- Each lies horizontally, pointing RIGHT.
- The pommel is at the left edge, the crossguard 1/8 of the way in.
- The pictures:
  - **sword-alucard.png** (~69×16): a long elegant sword with an ornate gold guard and a faint blue gleam.
  - **sword-short.png** (~41×12): a plain short sword.
  - **sword-claymore.png** (~73×16): a huge two-handed sword.
  - **dagger.png** (~27×12): a throwing dagger.

**Items and sub-weapons** (transparent, ~32-64 px, drawn small):
- **heart.png**, **bigheart.png**: red hearts.
- **money.png**: a gold coin bag.
- **potion.png**: a blue potion.
- **roast.png**: a pot roast on a plate.
- **axe.png**: a throwing axe.
- **cross.png**: a gold cross.
- **holy-water.png**: a blue vial.
- **leap-stone.png**: a glowing green relic gem.
- **blood-orb.png**: a pulsing crimson orb.
- **bone.png**: a thrown bone.

**Effects** (transparent):
- **fireball.png** (32×32 frames, burn 4).
- **inferno.png** (48×48 frames, burn 4): a dark violet fireball with a fiery rim.
- **holy-flame.png** (48×48 frames, burn 3): a single blue holy flame.
- **fire-wave.png** (32×48 frames, burn 3): a ground fire wave.

## Hand back
Save each one with exactly the file name above. Upload them to the repository folder `art-inbox/sotn/` (GitHub → Add file
→ Upload files), or attach small ones in the chat.

Bigger art is fine (2x or 4x of the sizes above) as long as the layout matches the template. Claude shrinks it on import.
