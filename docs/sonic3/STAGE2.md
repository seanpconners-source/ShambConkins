# Seanic the Hedgehog · Shamb Island Zone, Level 2 (design draft, Nov 11)

The owner's plan for Zone 1: **Level 1** Green Hill music (done), **Level 2** the same island look with Sonic 2's
**Emerald Hill Zone** music, **Level 3** Sonic 3's Angel Island Act 1 music, then **the zone boss** (music picked
together). Level 2 should feel like a step up from Level 1: faster, more height, more set pieces you remember. Same
ground rules as Level 1 (docs/sonic3/PLAN.md): our own map and art, the real game's kinds of set pieces, physics and
pacing.

## Feel and size
- About 22,000 px long (Level 1 is 18,600), a 70-90 s run for a good player, 2-3 minutes exploring.
- Three height bands like Level 1, but the high route is longer and faster, and the low route has the secrets.
- Two starposts, 3-4 places where the routes cross so you can drop down or spring back up.
- Ends at the sign, or, if we decide so, with the **mini-boss** (its sheet is already imported; Sonic 3 puts a
  mini-boss at the end of the first act of a zone, so Level 2 or Level 3 could carry it: owner's call).

## Signature set pieces (Emerald Hill style, our own layouts)
1. **Corkscrew run** (new object): a long flat stretch where the track twists round a pipe. At speed you run round it
   (the runner draws in front of the pipe for half the turn and behind it for the other half, as in Sonic 2); too slow
   and you drop through to the ground road below. Two of them: one early on the middle route, one long one near the end.
2. **Waterfall cliffs**: tall cliffs with waterfalls pouring over them (our waterfall art), springs up the face,
   ledges behind the falls with rings and a monitor.
3. **Bridge over the lagoon with jumping fish** (new badnik: a robot fish that leaps out from under the bridge in an arc).
4. **Seesaws** (new object): land on the high end to fling a robot ball or fire yourself up onto the high route.
5. **Spring slopes**: diagonal springs set into slopes that chain into the high route.
6. **Two loops and a double loop** (two loops back to back), with the new loop feet.
7. **Warp tubes**: one long one through a hill (the Level 1 kind, now smooth) that comes out over the lagoon.
8. **Swinging platforms** (on the Level 1 to-do list): a chain of three over a pit on the low route.
9. **Spike logs**: a rolling log with spikes on part of it, on one of the bridges.

## Route sketch, left to right
| x (px) | What |
|---|---|
| 0-1,800 | start, a hill run-up, loop 1, palms |
| 1,800-4,200 | corkscrew 1 on the middle route; below it the ground road with robots and a seesaw up |
| 4,200-6,500 | waterfall cliffs: springs up the faces, ledges behind the falls (1-up), starpost |
| 6,500-9,000 | warp tube through the hill, out over the lagoon; bridge with jumping fish; lake bed secret below |
| 9,000-12,000 | spring slopes up to the high route (fast run along the treetops, zip line down); low route: swinging platforms over a pit |
| 12,000-15,000 | double loop, starpost, monkey robots on trees, a seesaw |
| 15,000-19,000 | corkscrew 2 (long), spike log on a bridge, routes cross twice |
| 19,000-22,000 | last waterfall, loop 4, the sign (or the mini-boss arena) |

## New things to build (engine)
- `corkscrew` object: a path the runner follows while fast enough (like the warp tube's ride, but speed comes from the
  physics, and slow runners fall off); drawn as a pipe with the runner's front/back half swapping.
- `seesaw` object, `fish` badnik, `swing` platform (pendulum carrying the runner), `spikelog`.
- Level 2's map file `src/engines/s3/zone1act2.js` (same tools: terrain polygons, loop feet, tubes, decor, the bot test
  `tests/s3-zone1-act2.mjs` from every starting point, and a map preview like docs/sonic3/maps/zone1-act1.png).
- Game: Arcade entry for Level 2 (and later play Levels 1→2→3 in a row with lives carried over, like the real game).

## Art to ask GPT for (a brief once the design is agreed)
Corkscrew pipe pieces, seesaw, robot fish, swinging platform + chain, spike log, cliff faces with waterfalls (we have
waterfall frames), a second palm (already asked), maybe a lagoon backdrop variant.

## Music
`s3k-song-emerald-hill.flac` from the Sonic 1&2 CD album (track 1-18 "STH2 Emerald Hill Zone", Mega Drive version),
loop measured the same way as Green Hill. Mini-boss: Sonic 3's "Miniboss" track (already in Claude Share) unless the
owner picks something else.

## Questions for the owner
1. Mini-boss at the end of Level 2, or save it for the end of Level 3 before the big boss?
2. Play the levels in a row (lives carried over) or keep each level its own Arcade entry for now?
3. Corkscrews: OK as Level 2's signature piece?
