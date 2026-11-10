# Making Arcade art with Grok

Same job GPT was doing, with Grok Imagine. Each game needs three pictures: a **background** (key art), an **icon** and a
**logo**. Make them one game at a time from the prompts below, then send Claude the files (zip in chat, or GitHub
`art-inbox/arcade/`). Claude cleans them up, sizes them, sets the faces box and puts every background in the
Background Picker for you to place.

## What Grok did well (round 1: TRON, Radical Bike, Sewer Clash)
- Strong backgrounds: bold ink, deep colour, real speed and action. TRON is the best of the three.
- Icons and logos are clean, with real transparency, and they read well at tile size.

## What to fix from round 1 (put these in every request)
1. **Faces are pasted-on photos.** Sean's head is the same photo with the same grin in all three, and it doesn't match
   the drawn bodies. Ask Grok to **redraw** the faces in the picture's own comic-ink style from your reference photos,
   with a new expression each time (see the cast line in each prompt). Attach the reference photos to every request.
2. **Faces too small, or squashed into the top edge.** Radical Bike's face is small and the left half of the picture is
   empty black. Ask for faces big and clear, in the upper-middle of the right half, not touching the top edge.
3. **Same pose every time.** Vary it: driving, ducking, laughing, yelling, sneaking.

## Rules for every picture
- Original art: a tribute is fine, but no real logos, no copied screenshots, and no exact copies of trademarked characters.
- No text in backgrounds or icons. Text only in the logo.
- Sizes: Grok's own sizes are fine (wide 1792x1008 for backgrounds, square 1024x1024 for icons). Claude resizes them.
- **Transparent background** for icons and logos. If Grok won't do transparency, ask for a **flat pure green background
  (#00FF00), no shadow on it**. Claude cuts it out cleanly.
- File names: `<slot>-art.png`, `<slot>-icon.png`, `<slot>-logo.png` (the slot is the word in backticks below).

## The cast (attach reference photos)
- **Sean**: short brown hair, short beard and moustache.
- **Amber**: long wavy blonde hair.
- **Mylo**: black, tan and white long-haired dog with floppy ears.
- **KC**: black and white short-haired dog with big upright ears and tan cheeks.
- **Loki**: black and white speckled (blue-heeler-like) dog with upright ears.
Each prompt below names who to put in, so all five get turns.

## Style line (already inside each prompt)
Bold comic-book illustration, thick ink outlines, dramatic rim lighting, deep navy background with an electric-blue glow
and one bright accent colour, playful slightly crude party-game humour.

---

## Batch 01: the next 10 games

### Flappy Disaster · `flappy-disaster` (tribute: Flappy Bird)
**Background:** Wide 16:9 comic-book illustration. Sean, redrawn in the same ink style from the reference photo with a
panicked wide-eyed face, flaps wildly as a chubby cartoon bird with his own head, squeezing between two giant green pipes;
feathers fly, a cracked pipe edge just ahead. Thick ink outlines, dramatic rim lighting, deep navy sky with an
electric-blue glow, bright green accent. Keep him big in the right half, the left third calm and dark for menu text. No
text, no logos, no watermark.
**Icon:** Square sticker: Sean's head (redrawn in comic-ink style, cheeks puffed) on a round little flapping bird body,
thick white sticker outline, transparent background (or flat #00FF00), filling 85% of the square. No text.
**Logo:** Game logo reading "FLAPPY DISASTER" in chunky bouncy cartoon letters, green and gold with a thick black outline,
a feather or two flying off the letters, transparent background (or flat #00FF00). Only those two words.

### WarGames · Vanishing Tic-Tac-Toe · `wopr-grid` (tribute: WarGames)
**Background:** Wide 16:9 comic-book illustration. A huge glowing green-on-black computer screen showing a tic-tac-toe
grid where the oldest mark is dissolving into pixels; Amber (redrawn in comic-ink style from the reference, smug
side-eye) and KC the dog lean in from the right, lit by the screen's glow. Thick ink, rim light, deep navy with
electric-blue glow, phosphor-green accent. Faces big in the right half, left third dark. No text, no logos.
**Icon:** Square sticker: a chunky retro computer monitor with a tic-tac-toe grid on its green screen, one X fading to
pixels, thick white sticker outline, transparent (or flat #00FF00). No text.
**Logo:** "VANISHING TIC-TAC-TOE" in green retro computer letters with a glowing scanline look and a thick dark outline,
the last letters breaking into pixels, transparent (or flat #00FF00). Only those words.

### Brawndo Fruit Merge · `brawndo-fruit-merge` (tribute: Idiocracy)
**Background:** Wide 16:9 comic-book illustration. Sean and Amber (redrawn in comic-ink style, both laughing) in a
neon-green energy-drink lab, a giant glass jar overflowing with merging cartoon fruit (cherries into lemons into a huge
watermelon), green electrolyte drink splashing everywhere. Thick ink, rim light, deep navy with electric-blue glow,
acid-green accent. Faces in the right half, left third dark. No text, no real brand logos.
**Icon:** Square sticker: a giant shiny watermelon made of smaller merged fruit with a lightning bolt on it, splashing
green drink, thick white outline, transparent (or flat #00FF00). No text.
**Logo:** "BRAWNDO FRUIT MERGE" in heavy extreme-sports letters, acid green with a lightning bolt and a thick black
outline, transparent (or flat #00FF00). Only those words.

### Paint Can Physics · `home-alone-paint-can` (tribute: Home Alone)
**Background:** Wide 16:9 comic-book illustration. At the top of a cosy Christmas staircase, Mylo the dog (redrawn in
comic-ink style from the reference, gleeful) swings a paint can on a rope down the stairs at Sean below (redrawn,
shocked mid-hit, paint splatter). Christmas lights, a decorated tree. Thick ink, rim light, deep navy with
electric-blue glow, Christmas-red accent. Faces big, right half, left third dark. No text, no logos.
**Icon:** Square sticker: a dented paint can swinging on a rope, paint splashing out, motion lines, thick white outline,
transparent (or flat #00FF00). No text.
**Logo:** "PAINT CAN PHYSICS" in festive chunky letters, red and white with a paint drip on the C, thick black outline,
transparent (or flat #00FF00). Only those words.

### Penalty Kicks · `league-penalties` (tribute: The League)
**Background:** Wide 16:9 comic-book illustration. Night stadium penalty: Amber (redrawn in comic-ink style, fierce)
strikes the ball, Sean (redrawn, diving the wrong way, horrified) in goal; the net bulges, floodlights flare. Thick ink,
rim light, deep navy with electric-blue glow, bright orange accent. Faces big, right half, left third dark. No text.
**Icon:** Square sticker: a football smashing into the top corner of a goal net, net bulging, motion streaks, thick white
outline, transparent (or flat #00FF00). No text.
**Logo:** "PENALTY KICKS" in bold sporty slanted letters, white and orange with a thick black outline and speed lines,
transparent (or flat #00FF00). Only those words.

### Fast & Furious · Quarter-Mile Drag Race · `fast-quarter-mile` (tribute: Fast & Furious)
**Background:** Wide 16:9 comic-book illustration. Two muscle cars side by side at the start line at night, a black
classic muscle car and an orange sports car, tyres smoking, nitrous flames from the exhausts; Sean and Amber (redrawn in
comic-ink style, determined grins) at the wheels, seen through the windscreens. Thick ink, rim light, deep navy with
electric-blue glow, nitrous-blue and orange accent. Faces in the right half, left third dark. No text, no real car logos.
**Icon:** Square sticker: a black muscle car doing a wheelie, front tyres up, exhaust flames, thick white outline,
transparent (or flat #00FF00). No text.
**Logo:** "QUARTER-MILE" in chrome street-racing letters with a nitrous flame trail and a thick black outline,
transparent (or flat #00FF00). Only that word.

### Slither · Snake vs. Snake · `snake-v-snake` (tribute: slither.io)
**Background:** Wide 16:9 comic-book illustration. Two giant glowing neon snakes coiling around each other on a dark
hexagon grid full of glowing orbs; one snake has Loki the dog's head (redrawn in comic-ink style from the reference,
tongue out), the other Amber's head (redrawn, sneaky grin). Thick ink, rim light, deep navy with electric-blue glow,
hot-pink accent. Heads big, right half, left third dark. No text.
**Icon:** Square sticker: a fat neon snake coiled in a spiral with glowing orbs around it, thick white outline,
transparent (or flat #00FF00). No text.
**Logo:** "SNAKE VS. SNAKE" in glowing neon tube letters, pink and blue, thick dark outline, transparent (or flat
#00FF00). Only those words.

### Arrested Development · Banana Stand Tapper · `banana-money-grab` (tribute: Arrested Development)
**Background:** Wide 16:9 comic-book illustration. A tiny seaside frozen-banana stand bursting with cash: Sean (redrawn in
comic-ink style, greedy grin) stuffs dollar bills into his pockets while KC the dog (redrawn, guilty face) runs off with a
chocolate-dipped banana; money rains down. Thick ink, rim light, deep navy with electric-blue glow, banana-yellow accent.
Faces big, right half, left third dark. No text, no logos.
**Icon:** Square sticker: a chocolate-dipped frozen banana on a stick with a dollar bill stuck to it, thick white outline,
transparent (or flat #00FF00). No text.
**Logo:** "BANANA STAND" in retro 1950s seaside sign letters, yellow and brown, thick black outline, transparent (or flat
#00FF00). Only those words.

### BASEketball Shootout · `baseketball-shootout` (tribute: BASEketball)
**Background:** Wide 16:9 comic-book illustration. A driveway basketball hoop on a baseball diamond at night: Amber
(redrawn in comic-ink style, mid-shot, tongue out) shoots while Sean (redrawn, waving his arms in a ridiculous
psych-out pose) tries to distract her. Thick ink, rim light, deep navy with electric-blue glow, bright orange accent.
Faces big, right half, left third dark. No text, no logos.
**Icon:** Square sticker: a basketball with baseball stitching swishing through a hoop, thick white outline, transparent
(or flat #00FF00). No text.
**Logo:** "BASEKETBALL SHOOTOUT" in sporty varsity letters, orange and white, thick black outline, transparent (or flat
#00FF00). Only those words.

### Boulder Run · `raiders-ball-run` (tribute: Indiana Jones)
**Background:** Wide 16:9 comic-book illustration. A giant stone boulder rolls down a torch-lit temple corridor;
Mylo the dog (redrawn in comic-ink style, ears flying, terrified) sprints just ahead of it, Sean (redrawn, in a fedora,
screaming) right behind. Thick ink, rim light, deep navy with electric-blue glow, torch-orange accent. Faces big, right
half, left third dark. No text, no logos.
**Icon:** Square sticker: a huge cracked stone boulder rolling with dust and a fedora flying off in front of it, thick
white outline, transparent (or flat #00FF00). No text.
**Logo:** "BOULDER RUN" in carved stone adventure letters with cracks and a thick dark outline, transparent (or flat
#00FF00). Only those words.

---

Next after this batch: Claude adds Batch 02 here (the WANTED list in the newest TALLY-CLAUDE file on Drive has every
game still missing art).
