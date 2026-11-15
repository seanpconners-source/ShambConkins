# Sean of a Gun: round 3 corrections for GPT (Nov 15)

Thanks for round 3. Accepted as delivered: all 10 props except the tower (see 4), the armless `bro-torso`, and the
double-bell shotgun design. Same style as always (photoreal, same scale, faces RIGHT, transparent background, template
size or exactly 2x). Templates are in this zip.

## 1. NEW: `bro-run` (most important) — 512 x 192, rows walk 8 + run 8, 64 x 96 frames
The SAME `bro-body` as rounds 1-2 (same muscular arms, fists held forward, same size, same colours), with only the legs
moving. Each template cell shows the current body's upper half faintly over the legs from your `bro-torso` walk/run
frames: keep the upper body as it is (a small up-down bob is fine) and copy those leg poses. Feet on the red cross, face
spot empty (cyan, NO head), fist on the yellow ring in every frame (the game puts the gun there).

## 2. REDO the arm sheets at the right size (`arms-<weapon>`, all 15, 160 x 80 frames: hold 1 + 4 motion frames)
The round 3 arms came out about 40% too big: the shoulder was wider than the whole body and pushed up into the face.
In the new templates the faint figure is the bro's OWN current arm: draw the new arms exactly that size (shoulder ball
no bigger than the faint one, forearm no thicker). Shoulder on the magenta cross, front hand on the yellow ring, barrel
tip on the red cross. The gun is the supplied `gun-<weapon>` picture at the same size (shotgun: the approved double-bell
design). Nothing above the shoulder except a shoulder-mounted tube.

## 3. Motion frames: describe positions, not actions
Your image tool refused the action prompts, so word the 4 frames as positions of the held prop (no "fire", "shoot",
"recoil", "throw" or "blast"). For every sheet:
- frame 1: the same prop held 8 px (template px) further back toward the shoulder and tilted 6° nose-up; elbows bent more.
- frame 2: halfway back to the hold position, tilted 3° nose-up.
- frame 3: back at the hold position; the front hand slides the fore-grip 10 px toward the body (pump/cycle position).
- frame 4: the hold position again, fore-grip back where it started.
Hand-held items (holy water flask, fire flower, boomerang): frame 1 = the hand drawn back beside the shoulder holding the
item; frame 2 = the arm straight out in front, hand open, item just leaving the fingers; frame 3 = arm out, hand empty;
frame 4 = hand back at the hold position holding a new item.
Minigun: all four frames = hold position with the barrel cluster drawn as a motion blur.

## 4. `prop-tower`: no ladder
The game draws its own climbable ladder in a fixed spot, so the ladder painted on the tower shows twice. Same tower, no
ladder (the right leg plain, like the left).

## 5. `arms-rifle`
If the rifle keeps getting refused: describe it only as "the supplied prop picture gun-rifle.png, pasted unchanged into
the hands". A reference I built from your laser arms is in this zip (`reference/arms-rifle-composite.png`): same idea,
but at the corrected arm size from point 2.

Delivery: same as before (Drive folder 'Round 3 — Hero Arms & Props', UPLOADS-GPT note with the file list; small files
zipped). Order of importance: 1, 4, 2+3, 5.
