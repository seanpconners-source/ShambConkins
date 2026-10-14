# Minigame quality audit — October 2026

Owner brief: many minigames were early GPT builds; keep the good ones, rebuild the nonsensical or pointless ones,
mimic the original games' looks where possible, make every game fill the screen with floating buttons and a
discreet fullscreen toggle. Owner answers: Pong = authentic 1972 arcade with the head riding the paddle;
Space Invaders = three separate games (take turns, versus, co-op); floating score chips by default unless the game
draws its own scoreboard.

Method: every random-pool game was launched in headless Chromium at 390×780 and screenshotted mid-play (scripted
taps/drags), graded on look, clarity of goal, and whether two people would actually have fun; the code of the weakest
was read before deciding to rebuild or polish. All ids, engine names and saves are unchanged.

## Full-screen mode (all canvas games)
`session.bleed()` (src/engines/session.js, CSS at the end of src/theme.css): the canvas takes the whole screen;
fullscreen / pause / exit float top-right as round icons; the two scores float as head chips. Per-game HUD handling
in `BLEED_HUD` (src/gameRegistry.js): `own` (game draws its own scoreboard, chips hidden), `strip` (own scoreboard
across the top, so a slim strip keeps the buttons off it), `pad` (chips kept in a slim strip). Remade engines call
`s.ownHud()`. Fixed-size canvases (chess, checkers, mancala, pinball…) are letterboxed on a themed background.
DOM games (cards, casino, trivia, party, Uno, Yahtzee) keep the normal frame.

## Rebuilt from scratch (new engine files, same ids)
| Game id | Was | Now |
|---|---|---|
| pong-duel | green break-room Pong | **Atari Pong 1972**: black court, block paddles, square ball, 3×5 digits, 8-segment angles, speed-ups, CRT glow; head rides the paddle as 1-bit dither (`atariPong.js`) |
| space-swarm (+ new `space-swarm-versus`, `space-swarm-coop`) | 24 sliding heads | **Space Invaders**: rippling 5×11 formation, heartbeat, erodible bunkers, 3 bomb types, Martian saucer, neon glow; turns / versus / co-op (`spaceInvaders.js`, `packs/remakePack.js`) |
| breakout-party | 4 rows of beige bricks | **Atari Breakout**: colour bands, speed-ups, half paddle (`atariBreakout.js`) |
| asteroid-drift | outline rocks | **Asteroids** vector glow, saucers, hyperspace, heartbeat (`atariAsteroids.js`) |
| mars-missile-defense | circles in the sky | **Missile Command**, Mars Attacks! edition (`missileCommand.js`) |
| moonraker-lander | triangle over a pad | **Lunar Lander** vector moonscape, 2X/3X/5X pads, zoom (`lunarLander.js`) |
| snake-run | grid snake | **Nokia 3310 Snake II** LCD (`nokiaSnake.js`) |
| task-tallest-thing | sliding block | **Stacker** cabinets, both players at once (`stacker.js`) |
| t800-scan-long | boxes in lanes | **Spy Hunter**-style night freeway shooter (`freewayChase.js`) |
| derezzed-cycles | basic trails | **TRON Legacy light cycles** (`tronCycles.js`) |
| snake-v-snake | two grid snakes | **slither.io**-style neon duel (`slitherDuel.js`) |
| metal-gear-tank-duel | grey rectangles | **Atari 2600 Combat** Tank-Pong (`atariCombat.js`) |
| bug-artillery | distance shots | **Scorched Earth** on Klendathu (`scorchedEarth.js`) |
| fast-quarter-mile | lane dodging | **Fast & Furious drag race** (tree, shifts, NOS) (`dragRace.js`) |
| taskmaster-sumo | two circles | **Sumo dohyo** bout (`sumoSuit.js`) |
| kill-bill-duel | stick figures | **Nidhogg**-style House of Blue Leaves duel (`blueLeavesDuel.js`) |
| banana-money-grab | catch falling bills | **Tapper** at Bluth's Banana Stand (`bananaTapper.js`) |
| battle-royale-island | green oval | **Battle Royale** collars + danger zones (`battleIsland.js`) |
| bond-facility | grey bars | **GoldenEye Facility** stealth (`goldeneyeFacility.js`) |
| trek-mini-chess | tiny board + buttons | **Gardner minichess** with real check/mate, LCARS (`triDChess.js`) |
| happy-gilmore-golf | tiny fixed canvas | **Bushwood putt-putt** full screen (`puttPutt.js`) |
| taskmaster-curling | flat target | **Olympic curling** with sweeping (`olympicCurling.js`) |
| major-league-bats | empty diamond | **Home Run Derby** vs Wild Thing Vaughn (`homeRunDerby.js`) |
| duck-hunt-turn | heads on a sky | **NES Duck Hunt** with the dog and HUD (`nesDuckHunt.js`) |
| warriors-brawl | static fighters | **Streets of Rage**-style Warriors beat 'em up (`warriorsBeatEmUp.js`) |
| paddys-darts | ring target | **Regulation dartboard** in Paddy's (`pubDarts.js`) |

Shared helpers: `src/engines/retroKit.js` (5×7 pixel font, vector font, glowing pixel sprites, starfield, CRT,
field fitting, turn-based runner).

## Re-skinned (same rules)
radical-bike (full-screen Trials look), flappy-disaster (real Flappy Bird look), neon-ball-storm (synthwave),
bomber-duel (Super Bomberman look + portrait grid), rink-rivals (neon air-hockey table), office-hockey-shootout
(NHL-style rink), sewer-clash (TMNT sewer: brick arches, ooze drips, steel grates, pizza slices, turtle shells + masks), major-league-fielding (full-screen ballpark: crowd, wall, mowed
outfield, scoreboard; turns upright on portrait phones with P1 bottom / P2 top).

## Kept as is (already good or recently rebuilt)
Beer pong, flip cup, pinball, fruit ninja, horde, hole, crossy, angry heads, Tarantino set, Microgame Rush, arena
pack, party pack, casino, trivia, Uno, Yahtzee, chess/checkers/mancala/ultimate/dots, warehouse, pancakes, paper
route, boulder run, baseketball, penalties, dinner service, motion tracker, WOPR, cone chaos, Pac-Maze, warp games.

## Still worth doing
Real-phone feel checks for every rebuilt game (only bot/fuzz-tested in headless Chromium).
