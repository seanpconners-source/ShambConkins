# The Price Is Right: voice and crowd recordings the game is ready for

Drop the files into `assets/music/` with exactly these names (mp3 is fine). Several takes of the same thing:
add `-1`, `-2`, `-3`... (e.g. `tpir-crowd-shout-1.mp3`, `tpir-crowd-shout-2.mp3`); the game picks one at random and never
the same one twice in a row. Nothing has to be there: a missing one just stays quiet. The game levels them itself.

| File | When it plays |
| --- | --- |
| `tpir-say-come-on-down` | "Come on down!" (Plinko's opening now; Contestants' Row later) |
| `tpir-say-lets-play` | the host starting a pricing game ("Let's play Range Game!") |
| `tpir-say-actual-retail-price` | "...the actual retail price is..." before a price is shown |
| `tpir-say-higher` / `tpir-say-lower` | the host's calls in The Clock Game (and later Hi-Lo, Contestants' Row) |
| `tpir-say-new-car` | "A NEW CAR!" when a car is the prize |
| `tpir-say-winner` | the host congratulating a winner |
| `tpir-say-sorry` | the host consoling a loser |
| `tpir-say-showcase` | introducing the Showcase |
| `tpir-say-pet-population` | the sign-off ("Help control the pet population...") for the end of a whole episode |
| `tpir-crowd-shout` | the audience yelling prices and advice while a contestant decides (the more takes the better) |
| `tpir-crowd-higher` / `tpir-crowd-lower` | the audience yelling "Higher!" / "Lower!" |
| `tpir-crowd-chatter` | a steady murmur of the studio audience under a game (looped) |
| `tpir-crowd-ooh` / `tpir-crowd-aww` | a near miss / a loss |
| `tpir-crowd-cheer` | a big win |

Until `tpir-crowd-chatter` is in, the applause recording slowed down and muffled stands in as the murmur.

## Generated voices (Nov 25)

Every host line in the pricing games now has a voice made with fish.audio text-to-speech (free model), in the two voices the owner
picked: Bob Barker for the host, Rich Fields (the show's 2007-2010 announcer) for "come on down", the prize descriptions, "a new car"
and the Showcase. They are `tpir-v-<key>-<n>.mp3`; the list of lines, who says them and which speech bubble each one belongs to is
`src/data/tpirVoice.js`. Make missing ones (or new lines added to that list) with
`NODE_USE_ENV_PROXY=1 node tools/gameshow/tpir-voice.mjs` (`--only=<regex>`, `--force` to remake). Full setup (API key, free model, cloud network + secret): `docs/FISH-AUDIO-VOICES.md`.

A real recording always wins: drop `tpir-say-come-on-down.mp3` (or any `tpir-say-*` above) in and the game plays it instead of the
generated stand-in.
Every show sound we have and where it came from: docs/SOUND-SOURCES-TPIR.md
