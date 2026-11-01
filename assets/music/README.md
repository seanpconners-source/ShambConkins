# Drop-in music

Put audio files here and rebuild (`node tools/build.mjs`); the build inlines them into the offline HTML.
File name = track name, `.mp3`, `.ogg`, `.m4a` or `.wav`:

| File | Plays in |
|---|---|
| `cv-symphony.mp3` | Castlevania · Symphony of the Night: the whole castle run (loops) |
| `cv-symphony-boss.mp3` | Symphony of the Night: the Dracula fight in the Castle Keep (falls back to `cv-symphony` if missing) |

| `thps-mancala-intro.mp3` | Tony Hawk's Pro Mancala: the title sequence (replaces the synth intro) |
| `thps-mancala.mp3`, or `thps-mancala-1.mp3` … `thps-mancala-9.mp3` | Tony Hawk's Pro Mancala: the in-game soundtrack, played in order and looped (replaces the three synth songs) |
| `thps-sfx-<name>.mp3` | Tony Hawk's Pro Mancala: one sound effect each, replacing the synth one. Names: `ollie` (tail pop), `flip` (board flipping), `land` (wheels hit), `land-combo` (combo landed), `grind`, `bail`, `slam` (title words hitting), `crowd`, `special` (special meter full / special trick), `combo` (COMBO!!!), `tally` (score tick), `clack` (gem into a bowl), `text` (trick text appears), `whoosh`, `roll` (wheels rolling) |

While a track is present, the game's ambient drones (wind, hall, caverns, throne-room organ) drop to a quiet bed under it.
Keep sound effects short (a second or two; `tally` and `clack` play many times a second).
Keep files reasonably small (a 3-minute 128 kbps MP3 is about 3 MB; base64 adds a third).
