# Simon (Simon Says Face-Off): art for GPT

The game now draws the real 1978 Simon toy seen from straight above, sitting on the floor of a messy 90s kid's bedroom.
It works with no pictures (everything is drawn), and each picture below replaces the drawn version once it's in.
Templates: `docs/art-for-gpt/simon-templates/` (`simon-template.png` = where everything sits, `simon-reference-*.png` = the
drawn toy, `bg-template.png` / `bg-wide-template.png` = where the toy and the score sit on the background).

## The 7 pictures

| File | Size | What |
|---|---|---|
| `simon-dim.png` | 1024x1024 (any bigger square is fine) | the toy, all four pads dark |
| `simon-green.png` | same | the SAME picture, only the green pad (top left) lit |
| `simon-red.png` | same | only the red pad (top right) lit |
| `simon-yellow.png` | same | only the yellow pad (bottom left) lit |
| `simon-blue.png` | same | only the blue pad (bottom right) lit |
| `bg.png` | 1080x1920 (phone upright) | the bedroom floor |
| `bg-wide.png` | 1920x1080 (phone sideways) | the bedroom floor, wide |

The game only uses each lit picture's own quarter, so the rest of a lit picture can drift a little; the toy is found and
lined up automatically on import. Keep the pads in the real places: **green top left, red top right, yellow bottom left,
blue bottom right**.

## Prompts

**1. simon-dim** (attach `simon-template.png` and `simon-reference-red.png`):
> Photorealistic picture of the original 1978 Simon electronic memory game, seen from DIRECTLY above (flat, orthographic, no
> perspective), centred, filling 94% of a 1024x1024 square, on a flat pure green (#00FF00) background with no shadow on the
> background. Round black plastic body with a thin raised rim. Four big curved quarter-circle pads separated by a black
> cross: green top-left, red top-right, yellow bottom-left, blue bottom-right; all four pads OFF: deep, slightly
> translucent coloured plastic, not glowing. Round black centre console: the word "simon" in plain white lowercase italic
> letters (no company logo), three round buttons in a row (yellow LAST, red START, yellow LONGEST) with tiny white labels,
> and two small slide switches below (OFF/ON and SKILL 1 2 3 4). Soft even top light, realistic plastic sheen, no text
> anywhere else. Follow the template's circles exactly.

**2-5. the lit pads** (attach your finished `simon-dim.png`, one at a time):
> Edit this exact picture: change NOTHING except the GREEN pad (top left), which is now lit from inside like a bulb is on
> under it: bright glowing green, almost white-hot in the middle, light spilling a little over its own edges. Same size,
> same position, same background.

(then the same with RED top right, YELLOW bottom left, BLUE bottom right; name them `simon-green.png`, `simon-red.png`,
`simon-yellow.png`, `simon-blue.png`)

**6. bg** (attach `bg-template.png`):
> 1080x1920 photo-real picture looking STRAIGHT DOWN at the carpeted floor of a messy 1990s kid's bedroom. Loud 90s arcade
> carpet (teal or dark blue with neon squiggles and triangles). All around the edges, stuff everywhere: Nickelodeon-style
> green slime spills and an orange splat-shaped thing, foam dart blasters and foam darts (blue with orange tips), a black
> 16-bit game console with its 3-button controller and cord, game cartridges and their boxes, a Game Gear-style handheld,
> pogs and slammers, a Gak/slime tub, comic books and video game magazines, glow-in-the-dark stars, a Walkman with
> headphones, Koosh ball, scrunchies, trading cards, a pizza box. Keep the MIDDLE (the red circle on the template) plain
> carpet: the Simon toy is drawn there. Keep the top corners fairly calm: the players' faces and the score sit there. No
> readable brand names or logos.

**7. bg-wide** (attach `bg-wide-template.png`): the same as 6 at 1920x1080 (the stuff spreads left and right of the middle).

## Sounds (optional)

The game makes the real Simon tones itself (green 415 Hz, red 310 Hz, yellow 252 Hz, blue 209 Hz, the 42 Hz razz when you
lose, same timing as the toy). If you own a real Simon, record each pad held down for 2 seconds and the losing buzz on your
phone and send them: `simon-green`, `simon-red`, `simon-yellow`, `simon-blue`, `simon-razz` (any audio format). They go in
`assets/music/` and replace the made-up tones.

## Hand back

Upload the PNGs to `art-inbox/simon/` on GitHub (or Drive / attach in chat) and tell Claude "import the Simon art".

## For Claude: importing

`python3 tools/simon/import.py <picture> <slot> [--preview p.png]` for each (slot = file name without .png): keys out the
green/transparent/flat background, finds the toy's circle, fits it to the template (radius 481 on 1024), saves lossless
`assets/simon/<slot>.webp` + the original in `assets/originals/simon/`. Check `--preview` (red ring = template circle) and a
build with `node tests/simon.mjs` (screenshots simon-*). Sounds: copy to `assets/music/simon-<name>.<ext>` as delivered.
