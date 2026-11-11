# Seanic: art for ChatGPT: KNUX the echidna and SHADE the dark hedgehog (Nov 11)

Both runners already work in the game: they use the hedgehog's sheets recoloured (red / black) as stand-ins. Each
picture below replaces a stand-in the moment it is imported. Four pictures, in this order:

1. `knux-sheet.png`: Knux's body sheet
2. `knux-dreads.png`: Knux's head piece (behind the face)
3. `shade-sheet.png`: Shade's body sheet
4. `shade-quills.png`: Shade's head piece (behind the face)

**Attach to every chat:** `assets/originals/sonic3/runner-p1-sheet.png` (the hedgehog sheet: exact layout, size and
style to copy). For the head pieces also attach `assets/originals/sonic3/quills-p1.png`.

---

## Paste this first (ground rules, every chat)

> Our own characters and art in the style of a 16-bit Mega Drive Sonic game: bold dark outlines, bright flat colours,
> chunky highlights, pixel-art look. These are ORIGINAL characters: don't copy SEGA's Sonic, Knuckles, Shadow or any real
> game's sprites, logos or exact colour schemes. No words or letters except the row labels. Flat pure green #00FF00
> background, no green anywhere in the drawing itself, nothing touching the picture's edges. The runners are HEADLESS
> bodies: the neck ends in an open ring (dark inside, pink rim) where the game puts the player's own face, exactly like
> the attached sheet.

---

## 1. `knux-sheet.png`: Knux the echidna

> Using the attached hedgehog sheet as the EXACT template (same picture size 1024 x 1536 or taller, same row labels on
> the left, same rows in the same order, same number of poses per row, same body size, same ground line per row, every
> pose facing RIGHT, headless with the same neck ring), draw a new character: **KNUX, a tough echidna**.
>
> Design: stocky and broad-shouldered, a little shorter and wider than the hedgehog. Crimson-red body, a cream crescent
> on the chest, big white boxing-mitt hands with two short silver studs on the knuckles of each mitt, chunky boots
> (teal with gold buckles and thick grey soles). No quills on the body (the game draws the head separately). Same 18
> rows as the template (stand 1, wait 4, look up 2, crouch 2, walk 8, run 8, dash 4, skid 3, push 4, balance 3, spring 2,
> fall 2, hurt 2, hang 4, win 4, dead 2, ball roll 8, ball spindash 6). Make the WALK row real steps: in poses 1 and 5 the
> heels are a body-width apart, in 3 and 7 one knee is clearly lifted. Wait row: punches his mitts together. Win row:
> fist pump. Ball rows: a curled red ball with a cream band, same size as the template's ball.
>
> Then add THREE NEW ROWS at the bottom, labelled the same way:
> **19. GLIDE (2)**: flying flat out to the right like a superhero glide: body horizontal, both arms stretched straight
> forward with the mitts leading, legs trailing behind together, 2 frames (a slight flutter of the feet).
> **20. CLIMB (4)**: clinging to a wall on his RIGHT: seen from the side, body upright against the wall, mitts gripping
> it above head height, boots against it below; a 4-frame climbing cycle (left mitt up, pull, right mitt up, pull).
> **21. SLIDE (2)**: landing from a glide on his belly: lying flat face-forward sliding to the right, arms forward, a
> puff of dust under him; frame 2 pushing himself up on his mitts.

## 2. `knux-dreads.png`: Knux's head piece

> Using the attached quills picture as the template (same size, same transparent-on-green layout, the same empty circle
> in the middle where the face goes), draw Knux's head piece instead: thick crimson dreadlock-spines hanging DOWN and back
> from behind the head (4-5 heavy spines, rounded tips, a darker red underside), two small rounded ears on top, and a
> cream crescent mark that would sit just above the face. Facing RIGHT (the spines sweep back to the left). Nothing
> drawn inside the face circle.

## 3. `shade-sheet.png`: Shade the dark hedgehog

> Using the attached hedgehog sheet as the EXACT template (same size, same row labels, same rows and pose counts, same
> body size and ground lines, facing RIGHT, headless with the same neck ring), draw a new character: **SHADE, a cool
> dark hedgehog**.
>
> Design: the same build as the template hedgehog but with a sharper, cooler stance. Charcoal-black body with crimson
> streaks running down the arms and legs, a small white tuft on the chest, gold rings on both wrists and both ankles,
> white gloves, sleek boots (white with red tips and black soles) that glow at the heels. No quills on the body. Same 18
> rows as the template (stand 1, wait 4, look up 2, crouch 2, walk 8, run 8, dash 4, skid 3, push 4, balance 3, spring 2,
> fall 2, hurt 2, hang 4, win 4, dead 2, ball roll 8, ball spindash 6). WALK row with real steps (heels a body-width apart
> in poses 1 and 5, a lifted knee in 3 and 7). Wait row: arms folded, tapping a foot. Win row: a cool point at the
> viewer. DASH row: the circle legs with small orange jet flames under the heels. Ball rows: a black ball with crimson
> stripes, same size as the template's ball.
>
> Then add ONE NEW ROW at the bottom: **19. HOMING (4)**: the black-and-crimson ball flying diagonally down-right at
> speed, with a short white-and-crimson motion streak behind it that gets longer frame by frame (frame 4 = the longest
> streak). Same ball size as the roll row.

## 4. `shade-quills.png`: Shade's head piece

> Using the attached quills picture as the template (same size, same layout, the same empty face circle in the
> middle), draw Shade's head piece instead: black quills swept UP and BACK (5 sharp spines, the top two curving upward),
> each with a crimson stripe along it, and two pointed black ears on top. Facing RIGHT. Nothing drawn inside the face
> circle.

---

## Hand-back and import (for Claude)

The owner uploads to `art-inbox/sonic3/` (or attaches in chat).
- Sheets: `python tools/sonic3/import-sheet.py <picture> runner-p3 --x0 <label end> --neck0 x,y --ball ball-p3` (Knux)
  and `runner-p4` / `ball-p4` (Shade); originals to `assets/originals/sonic3/`. Add SHEETS entries in
  src/data/sonic3Sprites.js: `runner-p3` = runner-p1's rows + `glide:2, climb:4, slide:2`, `runner-p4` = runner-p1's
  rows (the homing row goes to `ball-p4` as `homing:4`), `ball-p3`/`ball-p4` like ball-p1 (+ `homing`). Head pieces:
  `tools/sonic3/import-piece.py <picture> dreads-p3 --hole n` and `quills-p4` + PICTURES entries like quills-p1.
- render.js: in `drawRunner` `sprites()`, pick `runner-p3`/`ball-p3` for body `knux` and `runner-p4`/`ball-p4` for
  `dark` when they exist (else the recoloured hedgehog sheets as now), rows `glide` (p.glide), `climb` (p.climb),
  `slide` (p.slide), and the `homing` ball row while `p.home`; the head piece by body in `backOfHead`. Remove the
  `bodyAngle` glide tilt once the glide row is in (the row is already horizontal). Check the face spots in a filmstrip.
- Optional later: `select-knux` / `select-shade` monitor pictures like `select-hog` (TITLE-SELECT-BRIEF.md).
