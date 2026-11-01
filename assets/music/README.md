# Drop-in music

Put audio files here and rebuild (`node tools/build.mjs`); the build inlines them into the offline HTML.
File name = track name, `.mp3`, `.ogg`, `.m4a` or `.wav`:

| File | Plays in |
|---|---|
| `cv-symphony.mp3` | Castlevania · Symphony of the Night: the whole castle run (loops) |
| `cv-symphony-boss.mp3` | Symphony of the Night: the Dracula fight in the Castle Keep (falls back to `cv-symphony` if missing) |
| `thps-mancala-intro.mp3` | Tony Hawk's Pro Mancala: the title sequence, played to its end (replaces the synth intro) |
| `thps-mancala.mp3`, or `thps-mancala-1.mp3` … `thps-mancala-9.mp3` | Tony Hawk's Pro Mancala: the in-game soundtrack, played in order and looped (replaces the three synth songs) |
| `thps-sfx-<name>.mp3`, or several: `thps-sfx-<name>-1.mp3` … `-20.mp3` | Tony Hawk's Pro Mancala sound effects, replacing the synth one; with several files the game picks one at random each time (never the same twice in a row). Rolls, grinds and the crowd loop or fade to fit how long they last. Names: `ollie`, `flip`, `catch`, `land`, `revert` (power slide), `grind` (handrail), `grind-pipe` (halfpipe coping), `grind-curb`, `grind-board` (guest skaters on the Mancala board), `bail`, `grunt` (the robbed player), `scratch` (combo lost on a slam), `aww` (crowd reacting to a slam), `combo` (COMBO!!!), `special`, `land-combo` (combo scored), `tally` (score tick), `total` (end tally done), `timeup` (game over), `crowd`, `hey`, `slam` (title words), `clack` (gem into a bowl), `text`, `whoosh`, `cam` (camera cut), `roll`, `rollby`. `aww`, `grunt`, `total` and `timeup` have no synth version, so they are silent without files |

While a track is present, the game's ambient drones (wind, hall, caverns, throne-room organ) drop to a quiet bed under it.
Keep sound effects short (a second or two; `tally` and `clack` play many times a second).
Keep files reasonably small (a 3-minute 128 kbps MP3 is about 3 MB; base64 adds a third).
