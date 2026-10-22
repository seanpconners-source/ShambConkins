# Pinball engine (band/music tables)

`src/engines/pinball.js` is the game (session flow, input, turns, 1P). Everything else lives here:

| file | job |
| --- | --- |
| `build.js` | `tableBuilder()` + geometry helpers (`arc`, `bezier`, `spline`, `mirror`). Tables are plain data in millimetres. |
| `physics.js` | Steel-ball physics at 600 Hz: capsule walls in a grid, accelerating flippers, ball–ball, sensors, ramps/wireforms as guided 3D paths, holes, magnets, plunger. Emits `w.events`. |
| `machine.js` | The machine's "operating system": players, alternating balls, plunger phase, ball save, multiball (`addBalls`), extra balls, tilt, bonus, ball search. |
| `render.js` | Cached playfield layers + per-frame lamps/parts/flippers/balls; width-locked spring camera (dead zone, look-ahead along ramps, flippers-first, off-screen arrow, optional auto zoom); DMD strip. Measure camera changes with `tests/pinball-camera.mjs`. |
| `dmd.js` | 128×32 orange dot-matrix display (5×7 font, score/splash scenes). |
| `sound.js` | Synthesized solenoid/switch sounds, ball roll, short original jingles. |
| `music.js` | Soundtrack engine: synth band (drums, bass, distorted guitar bus, lead with echo, arps) + 16th sequencer; songs are data. |
| `tables/<id>.js` | One table: `buildTable()`, plus `rules`, `art`, `dmdScenes`, `songs` (Bucketheadland keeps them in `tables/buckethead*.js`). |

DMD scenes: `dmdScenes[name](d, age, lines, ctx)` draws a whole 128×32 frame (`ctx.face(i)` = the player's portrait canvas,
`d.portrait` turns it into dots). Rules pick one with `m.say(lines, dur, {anim:name, flash})`. Built-in primitives:
`text fit line circle ellipse rect sprite portrait zoomText sparkle burst scroll dim invert`.
Songs: `rules.music(m)` returns a song name each frame; the engine plays `attract` (intro/game over) and `plunge`
(ball on the plunger) itself. See `tables/bucketheadMusic.js` for the pattern format. Original melodies only.

Real playfield ≈ 514 × 1067 mm (20.25" × 42"), ball Ø 27 mm, slope 6.5°. Keep lanes ≥ 32 mm wide between wall
surfaces (`tests/pinball-sim.mjs` finds jams).

## Parts (`T.` in a table's `buildTable`)
`wall` (looks: wood, rail, plastic, rubber, none) · `post` · `bumper` (pop) · `sling` · `drops` (drop-target bank) ·
`standup` · `rollover` · `kickback` · `spinner` · `trigger` (orbit/loop switch) · `gate` (one-way) · `diverter` ·
`hole` (scoop/saucer/lock; `eject`, `maxSpeed`; `toRail` makes it a VUK that fires the ball up a wireform) ·
`rail` (plastic ramp or wireform; `exit:{hole}` feeds a hole; `noEntry` = only a VUK can load it; `carry:mm/s` = a conveyor
that moves the ball at a set speed whatever the slope, `hidden` = the ball isn't drawn and the renderer skips the rail, so
the table art draws it, e.g. King Gizzard's Rattlesnake in `art.overlay`) · `spinner` takes `{label}` ·
`disc` (spinning floor disc, `parts[id].spin` rad/s; fires `disc`) · `flag` (geometry-free switch, e.g. a ramp diverter) ·
rail `exit.next` (`'railId'` or `{switch:flagId,on,off}`: a junction onto another rail; fires `junction`) ·
`diverter` with a === b = a pop-up post (fires `post`) ·
`magnet` (rules set `parts[id].on` to pull, `.grab` to catch + hold `holdT` s + throw `fling`) ·
`toy` (moving target made of capsules; rules set `parts[id].tx/ty`, hits fire `toy`) ·
`captive` (captive ball; build its channel walls + two posts closer than a ball) ·
`flipper` (any number, e.g. upper flippers; `input` 0 = left button, 1 = right) · `plunger` · `lamp` (insert: circle/arrow/star/rect).
Flat tops on anything trap balls (the sim reports jams): peak roofs on toys and pockets.

## Rules object
`balls`, `replay:{easy,normal,hard}` (1P target), `newPlayer()` (state kept between balls), `startBall(m)`,
`flip(m,input)` (lane change / skill-shot lane), `event(m,e)` (scoring: `bumper sling drop standup rollover spin
trigger hole rail railEnter railFail kickback outlane`), `lamps(m,t)` → `{lampId: 0|1}`, `bonusLines(m)`,
`bonusTotal(m)`, `multiballEnd(m)`, optional `jackpot`, `startJordan`-style mode starters, `attract` lines,
`tick(m,dt)` (per-frame mode clocks, toy motion, magnets), `dmdMode(m)` (DMD bottom line while a mode runs).
`art.toy(x,part,t)` draws toys. Events also include `toy`, `magnet`, `eject` (`e.vuk` when a VUK fired).
Machine helpers for rules: `m.score m.bonus m.say m.sfx m.ballSave m.addBalls m.extraBall m.later m.resetBank`,
`m.p` (player state), `m.ball` (this ball), `m.mode`, `m.mb` (balls in play), `m.w.parts[id]` (lit kickback, magnet on…).

## Art
`art.base(x,def)` paints the playfield under everything, `art.over` above balls (apron, plastics), plus optional
`bumperCap`, `slingArt`, `backbox(x,W,H,dmdX,dmdW,t)` and colours (`plastic sling drop flipper flipperRubber`).

## Lights
`lights.js` light shows over the inserts (`sweepUp/Down/Left/Right radial implode chase sparkle blink strobe fade`);
rules or cues call `m.show(name, sec, {x,y,loop})`. `m.giOff(sec)` blacks out the general illumination (`T.gi` bulbs)
so lit inserts punch through; `m.flash(id|'all', count)` strobes flasher domes (`T.flasher`). A table's
`cues[anim]` runs with every `m.say` of that DMD animation; `{mode:true}` messages add a blackout + chase.
Between balls the attract show cycles and the flashers fire in turn. Lamp values may be fractions (0..1).

## Drop-in art (no code changes)
Put pictures in `assets/pinball/<table id>/<slot>.webp|png|jpg|svg` and rebuild; missing slots keep the painted art.
| slot | where it shows | best size |
| --- | --- | --- |
| `playfield` | the whole playfield under every part (stretched to 514 × 1067 mm) | 1028 × 2134 |
| `backglass` | the intro card + beside the DMD in landscape | any, e.g. 1200 × 1600 |
| `apron` | the apron under the flippers (cropped) | 900 × 380 |
| `logo` | the playfield logo spot and the backbox (transparent PNG/WebP) | ~1000 wide |
| `character` | the hero art between the slings (transparent) | ~600 wide |
| `bumper` | pop bumper caps (square, cut to a circle) | 256 × 256 |
| `toy` | the moving toy, stretched to its box (Giant Robot: 96 × 84 mm) | ~400 × 350 |
Shrink big pictures with `python3 tools/optimize-art.py` first (the build embeds them in the HTML).
Templates (the current painted art per slot, same size/framing, a parts overlay, IMAGE-SPECS.txt with sizes, safe areas
and image prompts): `docs/pinball-art/<table>/`, remade by `node tools/pinball-art-templates.mjs --table <table>`
(buckethead, black-sabbath, king-gizzard; a table without a toy sets `toy: null` in the tool). Write IMAGE-SPECS.txt by
hand for a new table (coordinates = mm × 2).

## Adding a table
Tables so far: `buckethead` (Bucketheadland, game `bucketheadland-pinball`), `black-sabbath` (game
`black-sabbath-pinball`) and `king-gizzard` (game `king-gizzard-pinball`: an enclosed upper playfield with its own mini
flippers, a loop round it, the Rattlesnake carry rail), both in `src/packs/pinballPack.js`. Each is a different machine: layout, toys, rules, DMD, music.
New file in `tables/` (plus its rules/art/DMD/music files), add it to `TABLES` in `src/engines/pinball.js`, add a game
with `pinballTable:'<id>'` to `src/packs/pinballPack.js` (source = the band, so the roster's band members are the
unlocks), list the new modules in `src/modules.json`, export `simChecks` (event keys the test bot must hit), and run
`node tests/pinball-sim.mjs 8 <file>` and `node tests/pinball.mjs <game-id> 390x780`. Music: riff-driven songs use
`riff` strings, `swing`, `bell`, `rain`, `thunder` (see `tables/sabbathMusic.js`); never borrow real melodies or lyrics.
