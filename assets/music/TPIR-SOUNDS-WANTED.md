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
