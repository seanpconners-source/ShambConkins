# Sprite brief for ShambConkins: Major League Baseball

Paste this whole file into ChatGPT (image generation) together with the template pictures from
`docs/baseball-sprites/templates/` (the `@2x` previews are easiest to read). Ask for ONE sheet or picture at a time.

## What the game is
An original two-player baseball game for phones, in the spirit of 90s console baseball. There are two views:
- **Batting view**: the camera is behind the catcher. A right-handed batter stands on the left of the plate, and the
  pitcher stands on the mound in the distance facing the camera. The camera is the catcher's own view (as in the 16-bit
  game): only the catcher's mitt shows, so sheets 7-9 (catcher, umpire) are not needed for now.
- **Field view**: when the ball is hit, a high camera behind home plate shows the whole field, with small fielders and
  runners.

Player 1's team wears **red** jerseys and player 2's team wears **blue**. The players' real faces are added by the game, so
**batters, pitchers and fielders are drawn WITHOUT heads**.

## Art style (all sheets)
- **Bold 16-bit console sports-game look**:
  - a chunky, slightly heroic build (broad shoulders, big hands and gloves);
  - a dark 2 px outline;
  - 3-4 flat shades per colour, with a soft sunlit highlight on the upper left.
  - Clean and readable at small sizes. No blur, no photo textures, no gradients inside shapes.
- **Original designs.** Do not copy or trace any existing game's sprites, any real team's uniform, logo or wordmark, or
  any real player. Plain jerseys: a number on the back is fine; no letters or logos on the front.
- **Transparent background** (PNG with alpha). Nothing outside the frames.
- **Exact frame sizes** below. Frames go left to right, one row per animation, rows in the order listed, no gaps or
  padding. The template shows the grid: draw inside it, then remove the grid.
- **Red cross** in each template frame = where the feet touch the ground. Keep it at the same spot in every frame.
- **Green line** = the top of the head. The player should reach up to it, so all frames are the same height.
- **Blue circle** = where the game puts a real person's face:
  - Draw the body from the neck down and leave that circle EMPTY: no head, no cap, no helmet.
  - The collar ends just under the circle.
  - The game adds the helmet or cap itself, or uses pictures 11-12 below.

## The sheets (file name, frame size, rows and frame counts)

1. **batter-p1.png** (red team), frame **168×172**. A right-handed batter seen from behind the catcher, slightly from the
   side: standing on the left, facing RIGHT toward the plate.
   - Red jersey, white pants with red stripes, red socks, black cleats, batting gloves.
   - A full-length wooden bat (light tan, dark handle), about 64 px from the hands to the end: nearly half the
     player's height, long enough to reach across the plate. Held in both hands.
   - The game draws the face BEHIND the bat and the body, so the bat may pass in front of the blue face circle.
   - Rows:
     - stance 4: waiting for the pitch like a real batter: both hands up by the REAR shoulder (the batter's right
       shoulder: the one on the LEFT of the picture, away from the plate) and the bat resting up and back over that
       shoulder, pointing up and to the left. The yellow ring on the template = the hands, the dashed yellow line =
       the bat. Add a small bat waggle across the 4 frames.
     - swing 6: stride, hips turning, bat coming round level through the zone, contact in frames 3-4 with the bat level
       and pointing straight at the plate (its sweet spot at about x 138, y 85 of the frame), then the follow-through
       with the bat wrapped round the front shoulder.
2. **batter-p2.png** (blue team): same layout and poses as batter-p1, with a blue jersey, white pants with blue stripes
   and blue socks.
3. **pitcher-p1.png** (red team), frame **96×128**. The pitcher on the mound, FACING THE CAMERA (toward the batter).
   - Glove on the left hand, throwing with the right.
   - Rows:
     - idle 2: standing, ball in the glove at the chest.
     - windup 4: hands up, high leg kick, arm reaching back.
     - throw 4: stride toward the camera, arm coming over the top, release, follow-through bending forward.
4. **pitcher-p2.png** (blue team): same poses, blue uniform.
5. **fielder-p1.png** (red team), frame **96×128**. A fielder or base runner seen from a high camera behind home plate
   (a little from above), facing RIGHT (the game mirrors it to run left).
   - Glove on the left hand.
   - This sheet is also shown big on the menu, so draw it at full size.
   - Rows:
     - stand 2: ready, knees bent.
     - run 6: a full sprint cycle.
     - throw 3: wind-up, release, follow-through.
6. **fielder-p2.png** (blue team): same poses, blue uniform.
7. (not needed for now) **catcher-p1.png** (red team), frame **96×96**. The catcher crouched behind the plate, seen from BEHIND.
   - We see the back of the helmet and mask straps, the chest-protector straps, the red jersey and white pants, shin
     guards, and the mitt held out in front.
   - Draw this one WITH their (back of the) head: no face slot.
   - Rows:
     - idle 2: settled crouch, mitt up.
     - catch 2: the mitt snapping shut on the ball, a small jolt back.
8. **catcher-p2.png** (blue team): same, blue jersey.
9. (not needed for now) **umpire.png**, frame **96×128**. The home-plate umpire seen from behind: navy shirt and cap, grey trousers, black
   shoes. Draw his whole body including the head (back of the cap).
   - Rows:
     - idle 2: leaning in over the catcher, hands on knees.
     - call 3: standing up and punching his right fist out for a strike.

## Single pictures (transparent PNG, any size unless noted)
10. **ball.png**, 64×64: a baseball with red stitches, a slight highlight.
11. **helmet-p1.png / helmet-p2.png** (red / navy): a shiny batting helmet seen from behind the catcher (the same angle as
    the batter), with the ear flap on the RIGHT (pitcher's side). It sits on top of the face: draw only the helmet, about
    256 px wide, the open bottom edge flat.
12. **cap-p1.png / cap-p2.png** (red / blue): a ball cap seen from the front, the brim toward the camera, about 256 px
    wide. It is drawn on the pitchers and fielders.
13. **stadium.png**, about 1600×700: the batting-view backdrop above the outfield wall, as seen from home plate.
    - A sunny sky, packed stands with a colourful crowd, light towers, and a big scoreboard a little right of centre.
    - Keep the important parts in the middle 60%: phone screens crop the sides.
    - No real team names or logos.
14. **wall.png**, about 1600×80: the green outfield wall with a row of ad boards.
    - Use these made-up ads only: HARRY'S, WILD THING, JOBU RUM, DORN HOMES, VAUGHN'S HEATERS.
    - No real brands.
15. **logo.png**, about 1200×400: the title **MAJOR LEAGUE BASEBALL**. Big bold yellow letters with a dark outline, a
    baseball and crossed bats behind them.
16. **derby-logo.png**, about 1200×400: the title **HOME RUN DERBY**. The same style, with fireworks and a ball flying out
    of the park.

## Hand back
Save each one with exactly the file name above. Upload to the repository folder `art-inbox/baseball/` (GitHub → Add file →
Upload files), or attach small ones in the chat.
