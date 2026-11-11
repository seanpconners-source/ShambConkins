# Seanic the Hedgehog: title screen + character select art (for ChatGPT)

The game already has both screens working with stand-in art (the jungle backdrop, the SEANIC logo, the real runner
sprites wearing your face). Each picture below replaces one stand-in the moment it is dropped in. Make as many or as few
as you like; anything missing keeps its stand-in.

Templates (exact size, the red anchor mark, the blue FACE circle, the monitor's screen box):
`docs/sonic3-sprites/templates/<name>.png`.

## Ground rules (paste these first)

- Our own characters and our own art, in the style of a 16-bit Mega Drive Sonic game (bold outlines, bright colours,
  chunky highlights). Don't copy SEGA's Sonic, Tails, logos or any real game screen.
- The hedgehog: blue-purple, big quills sweeping back, white gloves, red-and-white sneakers, a scarf like his sprites.
  The fox: red-orange, cream muzzle and chest, **three** tails, teal sneakers.
- **Face circle:** where the template shows the blue FACE circle, paint a plain flat skin-tone circle (no face). The
  game puts the player's own face there. Keep hair, quills and ears around it, not over it.
- Transparent background for everything except `title-bg` and `select-bg`. If you can't do transparency, use flat pure
  green #00FF00 behind the art and keep green out of the drawing itself.
- No words or letters anywhere. The game writes them.
- Full size, PNG, file name = the slot name (e.g. `title-hero.png`).

## Title screen (in the game: logo bursts in, the hedgehog rises up behind it with player 1's face, the fox pops up beside him with player 2's face, TAP TO START)

| Slot | Size | What to draw |
|---|---|---|
| `title-bg` | 1600x900, opaque | The scene behind the logo: a bright tropical sky with big puffy clouds, a sparkling sea, a jungle island with palm trees and a waterfall in the distance. Keep the middle third calm and fairly plain, because the logo sits there. |
| `title-hero` | 640x640 | The hedgehog's title pose seen from the waist up, as if he's standing behind the logo and leaning over it: one hand wagging a finger or giving a thumbs up, cocky grin body language. Feet don't show: the bottom of the picture is hidden behind the logo. FACE circle at (320,170), 184 across. |
| `title-fox` | 560x560 | The three-tailed fox popping up from behind the logo just right of the hedgehog (like the two of them on a Sonic 2 style title), waist up, facing a little left toward him, tails fanned up, waving. Feet don't show. FACE circle at (290,190), 160 across. It wears player 2's face. |

The logo is done (`assets/keyart/sonic-logo.webp`). Send a new `logo.png` (1100x520) only if you want to change it.

## Character select (Data Select style: SELECT PLAYER header, a TV monitor showing the runner, arrows, name plate)

| Slot | Size | What to draw |
|---|---|---|
| `select-bg` | 1600x900, opaque | A Mega Drive menu backdrop: deep blue with bold diagonal stripes or a checker floor, a few sparkles. Nothing busy in the centre, where the monitor sits. |
| `select-monitor` | 800x640 | A chunky retro TV / monitor frame (silver-grey plastic, rounded corners, knobs and a red power light along the bottom). The SCREEN box in the template (x 96-704, y 80-470) must be **fully see-through**: the game draws the runner inside it. |
| `select-hog` | 512x512 | The hedgehog standing proud for the monitor: full body, feet on the bottom edge, arms crossed or a thumbs up. FACE circle at (256,150), 160 across. |
| `select-fox` | 512x512 | The fox standing, three tails fanned up behind, a little wave. FACE circle at (256,160), 152 across. |

## Hand-back
Upload to `art-inbox/sonic3/` on GitHub (or the Drive art folder) and tell Claude. Claude keys any green, saves lossless
WebP into `assets/sonic3/<slot>.webp` (originals in `assets/originals/sonic3/`), and checks both screens at phone and
landscape sizes.
