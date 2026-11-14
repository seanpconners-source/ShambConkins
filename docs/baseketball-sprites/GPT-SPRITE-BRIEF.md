# BASEketball — sprite brief for GPT

Two games share this art: **BASEketball** (the movie's rules) and **BASEketball · Hoop Jones** (the bar-top shooting machine).
The player shoots **from behind the shooter**, over the shoulder, at a hoop in a big night-time stadium, like a Megatouch
"Hoop Jones" machine set inside the stadium from the movie *BASEketball* (1998).

## The look
- The stadium from the movie: a huge open-air pro stadium at night, light towers blazing, two decks of stands packed with
  fans in green and gold, an outfield-style padded wall covered in ad boards, a giant jumbo scoreboard, and a hardwood court in
  the middle with the base spots (1B, 2B, 3B, HR) painted on the floor.
- Home team colours: Milwaukee Beers style **green #1f6b3a and gold #f2c230**. Visitors: **orange #e0601a and black**.
- Our own drawings. **No logos, frames or likenesses from the film, no real brands or real NBA/NFL logos.** Make up joke
  sponsors for the ad boards: FIGHT MILK, BRAWNDO, RUM HAM, DENTAL DAMS R US, PSYCH!, BEERS.
- Bright, punchy, slightly cartoony realism (like a 2000s bar-top arcade cabinet). Clean edges, readable from a phone.

## The slots (one picture each, exact template size or exactly 2x)
Templates are in `docs/baseketball-sprites/templates/`. Paint over a copy and keep every guide position. Everything is
**transparent** outside the drawing, except the two stadiums and the jumbotron (which fill their whole picture).

| file | size | what |
|---|---|---|
| `stadium.png` | 2400x1200 | The stadium behind the court, wide panorama. The red **HORIZON** line (y 780) is where the court's far edge meets the ad wall: stands, light towers and sky above it, plain court floor below it. Crowd everywhere; no big text in the middle (the backboard stands there). |
| `stadium-hoop.png` | 2400x1200 | Same layout for the Hoop Jones mode, but a flashier arcade-machine arena: neon pinks and cyans, HOOP JONES / INSERT COIN / MONEY BALL boards. |
| `backboard.png` | 600x420 | The backboard seen straight on: white or glass board, red/orange border, target box over the rim, the rim bracket. The orange dot (300,380) is where the rim attaches: **don't draw the rim or net** (the game does). |
| `pole.png` | 120x600 | The padded stanchion under the board, front view, base at the bottom. |
| `net.png` | 4 frames of 256x200 | The net under the rim, front view. The rim's ends are the red marks at x 20 and 236 (top edge). Frame 1 = at rest, frames 2-4 = a swish ripple. White net, no rim. |
| `ball.png` | 256x256 | A basketball filling the circle (classic orange, black seams). The game spins it. |
| `shooter-p1.png` | 4x4 frames of 320x420 | The shooter **from behind**: back of the head (hair, ears), shoulders, jersey back, arms; the body runs off the bottom of the frame. Home jersey (green and gold). Rows: **ready** 2 (holding the ball up over the head, breathing), **shoot** 4 (release: arms extend up and forward, ball gone after frame 1), **cheer** 2 (fists up), **slump** 2 (head down, arms hanging). The ball is drawn by the game in the orange circle; hands hold its sides. Leave the blue **name bar** on the jersey back blank (the game writes the player's name and number there). |
| `shooter-p2.png` | same | Same poses, visitors' jersey (orange and black). |
| `jumbotron.png` | 1600x560 | The giant scoreboard frame: steel, light bulbs, green/gold trim, maybe a beer-can crest on top. The inner **SCREEN** stays **pure black** (the game draws the line score, outs, bases and the batter's face in it). |
| `psych-burst.png` | 1000x700 | A comic "POW" burst (hot pink/yellow) the psych-out line appears on. Keep the middle plain: the defender's face goes in the left third, text across the middle. |
| `court-logo.png` | 800x800 | A centre-court logo seen from straight above (our own BEERS crest), transparent around it. |
| `logo.png` | 1200x480 | "BASEketball" title lettering, our own design, transparent. |
| `logo-hoop.png` | 1200x480 | "HOOP JONES" title lettering for the arcade mode, transparent. |

## Hand back
Upload the PNGs (named exactly as above) to the Drive folder **BASEketball — Sprites** (or GitHub `art-inbox/baseketball/`),
plus an `UPLOADS-GPT-<date>.md` note listing them, as with the other kits.
