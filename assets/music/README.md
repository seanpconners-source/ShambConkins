# Drop-in music

Put audio files here and rebuild (`node tools/build.mjs`); the build inlines them into the offline HTML.
File name = track name, `.mp3`, `.ogg`, `.m4a` or `.wav`:

| File | Plays in |
|---|---|
| `cv-symphony.mp3` | Castlevania · Symphony of the Night: the whole castle run (loops) |
| `cv-symphony-boss.mp3` | Symphony of the Night: the Dracula fight in the Castle Keep (falls back to `cv-symphony` if missing) |

While a track is present, the game's ambient drones (wind, hall, caverns, throne-room organ) drop to a quiet bed under it.
Keep files reasonably small (a 3-minute 128 kbps MP3 is about 3 MB; base64 adds a third).
