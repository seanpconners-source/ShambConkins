# Pinball engine (band/music tables)

`src/engines/pinball.js` is the game (session flow, input, turns, 1P). Everything else lives here:

| file | job |
| --- | --- |
| `build.js` | `tableBuilder()` + geometry helpers (`arc`, `bezier`, `spline`, `mirror`). Tables are plain data in millimetres. |
| `physics.js` | Steel-ball physics at 600 Hz: capsule walls in a grid, accelerating flippers, ball–ball, sensors, ramps/wireforms as guided 3D paths, holes, magnets, plunger. Emits `w.events`. |
| `machine.js` | The machine's "operating system": players, alternating balls, plunger phase, ball save, multiball (`addBalls`), extra balls, tilt, bonus, ball search. |
| `render.js` | Cached playfield layers + per-frame lamps/parts/flippers/balls; width-locked follow camera; DMD strip. |
| `dmd.js` | 128×32 orange dot-matrix display (5×7 font, score/splash scenes). |
| `sound.js` | Synthesized solenoid/switch sounds, ball roll, short original jingles. |
| `tables/<id>.js` | One table: `buildTable()`, `rules`, `art`. |

Real playfield ≈ 514 × 1067 mm (20.25" × 42"), ball Ø 27 mm, slope 6.5°. Keep lanes ≥ 32 mm wide between wall
surfaces (`tests/pinball-sim.mjs` finds jams).

## Parts (`T.` in a table's `buildTable`)
`wall` (looks: wood, rail, plastic, rubber, none) · `post` · `bumper` (pop) · `sling` · `drops` (drop-target bank) ·
`standup` · `rollover` · `kickback` · `spinner` · `trigger` (orbit/loop switch) · `gate` (one-way) · `diverter` ·
`hole` (scoop/saucer/lock; `eject`, `maxSpeed`) · `rail` (plastic ramp or wireform; `exit:{hole}` feeds a hole) ·
`magnet` · `flipper` (any number; `input` 0 = left button, 1 = right) · `plunger` · `lamp` (insert: circle/arrow/star/rect).

## Rules object
`balls`, `replay:{easy,normal,hard}` (1P target), `newPlayer()` (state kept between balls), `startBall(m)`,
`flip(m,input)` (lane change / skill-shot lane), `event(m,e)` (scoring: `bumper sling drop standup rollover spin
trigger hole rail railEnter railFail kickback outlane`), `lamps(m,t)` → `{lampId: 0|1}`, `bonusLines(m)`,
`bonusTotal(m)`, `multiballEnd(m)`, optional `jackpot`, `startJordan`-style mode starters, `attract` lines.
Machine helpers for rules: `m.score m.bonus m.say m.sfx m.ballSave m.addBalls m.extraBall m.later m.resetBank`,
`m.p` (player state), `m.ball` (this ball), `m.mode`, `m.mb` (balls in play), `m.w.parts[id]` (lit kickback, magnet on…).

## Art
`art.base(x,def)` paints the playfield under everything, `art.over` above balls (apron, plastics), plus optional
`bumperCap`, `slingArt`, `backbox(x,W,H,dmdX,dmdW,t)` and colours (`plastic sling drop flipper flipperRubber`).

## Adding a table
New file in `tables/`, add it to `TABLES` in `src/engines/pinball.js`, add a game with `pinballTable:'<id>'`
(engine `pinball`), list the new modules in `src/modules.json`, run `node tests/pinball-sim.mjs 8 <id>`.
