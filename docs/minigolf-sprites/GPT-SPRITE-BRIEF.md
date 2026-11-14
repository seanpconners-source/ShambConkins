# Sitabout Mini Golf — art brief for GPT

**Sitabout Mini Golf** is our pro-style putt-putt game (the name is a joke on *Walkabout Mini Golf*: you sit on the couch
instead). Three themed courses of six holes:

- **Bushwood Country Club** (*Caddyshack*): a posh country club, varnished wood rails, oaks and pines, sand traps, ponds,
  a windmill, the gopher popping out of his holes, the club pool.
- **Waterbury Putt-Putt** (*Happy Gilmore*): a kitschy roadside putt-putt park, bright green carpet, red-and-white brick
  rails, palm trees, a fibreglass castle, a giant clown head whose mouth you putt into, an alligator pond with a wooden
  bridge, hockey nets (Happy was a hockey player), and a dreamy "Happy Place" hole floating in the clouds.
- **Spaceball City Links** (*Spaceballs*): mini golf on a space station: teal space-turf, chrome rails with blue lights,
  dark metal deck plates and stars around the course, glowing Ludicrous Speed boost pads, Schwartz portals, Mega Maid's
  giant vacuum over a black hole, crystals, beacons and satellite dishes.

The camera looks down at the course from a tilted top-down **3/4 view** (like *Golf Battle* / *Mini Golf King*). The
player's ball is a golf ball with their face printed on it (the game does the face).

## Rules for every picture
- Our own drawings. **No logos, frames or likenesses from the films, no real brands.** Joke signs are fine.
- Bright, clean, slightly cartoony realism, like a polished mobile game. Readable on a phone. Soft shadows, no hard black
  outlines on ground textures.
- **Exact template size, or exactly 2x** (same proportions). PNG or WebP.
- **Tiles** (seen straight from above) must repeat with **no seams** on all four sides (check with the `-repeat.png` beside
  each template). No big single features (a tile repeats every few metres), no lighting from one side.
- **Strips** repeat left to right with no seam.
- **Standing props** are drawn upright, facing us, on a **transparent** background. Their **ground point** (magenta cross)
  is where they touch the ground: keep it where the template has it.
- **Flat things** are seen straight from above, centred, transparent around them.
- Openings marked **keep OPEN** (windmill door, clown mouth) must stay see-through: the ball rolls through them.
- Leave the **middle of the ball plain** (the face goes there). Leave the **sign board blank** (the game writes on it).

## How to hand it back
Name each file exactly like the slot (`gilmore-turf.png`, `clown-head.png`, ...) and upload them to `art-inbox/minigolf/`
on GitHub (or zip them). Claude copies them to `assets/minigolf/` (lossless), checks them in the game and sends
screenshots. Pictures can come a few at a time: every slot that is not there yet keeps the game's drawn art.

Templates: `docs/minigolf-sprites/templates/` (`node tools/minigolf-templates.mjs` makes them again). Each one shows the
game's own drawn stand-in faintly, at the right scale: paint over it.

## The slots

### Ground for each course

| file | size | kind | what |
|---|---|---|---|
| `bushwood-turf.png` | 512x512 | Seamless tile (from above) · covers 24 units | bushwood putting surface (carpet/felt), seen from above, subtle mowing stripes optional |
| `bushwood-lawn.png` | 512x512 | Seamless tile (from above) · covers 40 units | the ground around the course (country club lawn and paths) |
| `bushwood-rail.png` | 512x64 | Seamless strip (left-right) | rail SIDE face (varnished wood plank); the game draws it on every wall |
| `bushwood-railtop.png` | 512x32 | Seamless strip (left-right) | rail TOP seen from above (a thin strip, same material, lighter) |
| `bushwood-cliff.png` | 512x128 | Seamless strip (left-right) | the side of a raised green/platform (stone, wood or metal skirt under the turf) |
| `gilmore-turf.png` | 512x512 | Seamless tile (from above) · covers 24 units | gilmore putting surface (carpet/felt), seen from above, subtle mowing stripes optional |
| `gilmore-lawn.png` | 512x512 | Seamless tile (from above) · covers 40 units | the ground around the course (kitschy putt-putt park lawn with gravel) |
| `gilmore-rail.png` | 512x64 | Seamless strip (left-right) | rail SIDE face (painted red/white bricks); the game draws it on every wall |
| `gilmore-railtop.png` | 512x32 | Seamless strip (left-right) | rail TOP seen from above (a thin strip, same material, lighter) |
| `gilmore-cliff.png` | 512x128 | Seamless strip (left-right) | the side of a raised green/platform (stone, wood or metal skirt under the turf) |
| `spaceballs-turf.png` | 512x512 | Seamless tile (from above) · covers 24 units | spaceballs putting surface (carpet/felt), seen from above, subtle mowing stripes optional |
| `spaceballs-lawn.png` | 512x512 | Seamless tile (from above) · covers 40 units | outer space floor around the course: dark rock/metal deck with glowing seams (seen from above) |
| `spaceballs-rail.png` | 512x64 | Seamless strip (left-right) | rail SIDE face (chrome panel with blue lights); the game draws it on every wall |
| `spaceballs-railtop.png` | 512x32 | Seamless strip (left-right) | rail TOP seen from above (a thin strip, same material, lighter) |
| `spaceballs-cliff.png` | 512x128 | Seamless strip (left-right) | the side of a raised green/platform (stone, wood or metal skirt under the turf) |

### Shared ground

| file | size | kind | what |
|---|---|---|---|
| `sand.png` | 512x512 | Seamless tile (from above) · covers 24 units | bunker sand from above, raked |
| `water.png` | 512x512 | Seamless tile (from above) · covers 32 units | pond water from above (the game adds moving ripples) |
| `water-space.png` | 512x512 | Seamless tile (from above) · covers 32 units | Spaceballs liquid: glowing purple plasma from above |
| `ice.png` | 512x512 | Seamless tile (from above) · covers 24 units | slick ice from above |
| `carpet.png` | 512x512 | Seamless tile (from above) · covers 20 units | a bright rainbow / red carpet runner from above (Happy Place bridge, Spaceballs paths) |
| `conveyor.png` | 256x256 | Seamless tile (from above) · covers 12 units | conveyor belt from above, ridges across, moving UP the picture |

### On the green

| file | size | kind | what |
|---|---|---|---|
| `boost.png` | 256x256 | Lying flat (from above, transparent) · 14 units wide | Ludicrous Speed boost pad: glowing chevrons pointing UP the picture |
| `flag.png` | 160x512 | Standing prop (front view, transparent) · 3.4 units wide | flagstick with a waving flag (pin at x 40, bottom at y 500) |
| `cup.png` | 128x128 | Lying flat (from above, transparent) · 5.6 units wide | the cup seen from above: dark hole with a white liner rim |
| `ball.png` | 256x256 | Lying flat (from above, transparent) · 2 units wide | a white golf ball seen from above, dimples, soft shading; leave the middle plain (the player's face is printed there) |
| `lost-ball.png` | 128x128 | Lying flat (from above, transparent) · 3 units wide | a lost golf ball collectible (old, scuffed, sparkly), Walkabout style |
| `bumper.png` | 256x256 | Lying flat (from above, transparent) · 7 units wide | pinball mushroom bumper from above (round, chrome ring) |
| `tunnel.png` | 256x256 | Lying flat (from above, transparent) · 7 units wide | a pipe / tunnel mouth from above (dark hole) |
| `portal.png` | 256x256 | Lying flat (from above, transparent) · 7 units wide | Spaceballs Schwartz portal ring from above (glowing) |
| `tramp.png` | 256x256 | Lying flat (from above, transparent) · 7 units wide | trampoline from above (round, springy) |
| `gopher.png` | 3 frames of 256x256 | Animation frames (transparent) · 5 units wide | the gopher popping out of its hole: 3 frames (head peeking, half out, fully up and grinning) |
| `gopher-hole.png` | 128x128 | Lying flat (from above, transparent) · 4 units wide | a gopher hole from above (dirt ring, dark middle) |
| `gator.png` | 2 frames of 512x256 | Animation frames (transparent) · 16 units wide | alligator swimming, seen from above, head to the RIGHT: 2 frames (tail left / tail right) |
| `spinner.png` | 512x96 | Lying flat (from above, transparent) · 22 units wide | a spinning bar seen from above, pivot in the middle |
| `slider.png` | 256x96 | Lying flat (from above, transparent) · 16 units wide | a sliding block seen from above (wood or metal crate, long side left-right) |
| `magnet.png` | 512x512 | Standing prop (front view, transparent) · 18 units wide | Mega Maid's giant vacuum nozzle standing over the black hole |
| `black-hole.png` | 256x256 | Lying flat (from above, transparent) · 14 units wide | a swirling black hole on the floor (seen from above) |
| `windmill-house.png` | 640x640 | Standing prop (front view, transparent) · 28 units wide | Dutch windmill house seen from the front; the DOOR opening at the bottom middle between x 272 and 368 stays open (the ball rolls through) |
| `windmill-blades.png` | 640x640 | Standing prop (front view, transparent) · 34 units wide | the four windmill sails, hub in the middle (the game spins this picture) |
| `clown-head.png` | 640x520 | Standing prop (front view, transparent) · 24 units wide | a giant mini-golf clown head seen from the front; the MOUTH opening at the bottom middle (x 262-378) stays open (the ball rolls in) |
| `clown-teeth.png` | 256x96 | Standing prop (front view, transparent) · 9.5 units wide | the clown's teeth / jaw bar that opens and shuts the mouth |

### Scenery

| file | size | kind | what |
|---|---|---|---|
| `oak.png` | 512x640 | Standing prop (front view, transparent) · 20 units wide | a big leafy oak (country club) |
| `pine.png` | 384x640 | Standing prop (front view, transparent) · 14 units wide | a pine tree |
| `bush.png` | 384x256 | Standing prop (front view, transparent) · 10 units wide | a round trimmed bush |
| `flowers.png` | 384x192 | Standing prop (front view, transparent) · 10 units wide | a flower bed |
| `cart.png` | 512x384 | Standing prop (front view, transparent) · 14 units wide | a golf cart (no brand) |
| `sign.png` | 384x384 | Standing prop (front view, transparent) · 10 units wide | a wooden sign on two posts, BLANK board (the game writes the hole name on it) |
| `palm.png` | 384x640 | Standing prop (front view, transparent) · 16 units wide | a putt-putt park palm tree |
| `castle.png` | 512x512 | Standing prop (front view, transparent) · 18 units wide | a kitschy fibreglass putt-putt castle |
| `hockey.png` | 512x384 | Standing prop (front view, transparent) · 16 units wide | a hockey net with a stick leaning on it (Happy Gilmore was a hockey player) |
| `cloud.png` | 512x320 | Standing prop (front view, transparent) · 20 units wide | a fluffy dream cloud (Happy Place) |
| `rock.png` | 384x256 | Standing prop (front view, transparent) · 10 units wide | a space rock / asteroid |
| `crystal.png` | 256x384 | Standing prop (front view, transparent) · 7 units wide | glowing space crystals |
| `beacon.png` | 256x512 | Standing prop (front view, transparent) · 6 units wide | a blinking space beacon on a pole |
| `dish.png` | 384x384 | Standing prop (front view, transparent) · 12 units wide | a satellite dish |

### Screens

| file | size | kind | what |
|---|---|---|---|
| `logo.png` | 1200x520 | Screen picture | SITABOUT MINI GOLF title lettering, transparent |
| `title-bg.png` | 1920x1080 | Screen picture | title screen backdrop: a sunny mini golf park at golden hour, lots of sky in the middle for the logo |
| `scorecard.png` | 1024x640 | Screen picture | a paper scorecard texture (cream paper, faint pencil lines, a little coffee ring); the game writes the scores on it |
| `bushwood-card.png` | 960x540 | Screen picture | course picture for the course picker (Bushwood Country Club: clubhouse, oaks, a gopher) |
| `gilmore-card.png` | 960x540 | Screen picture | course picture for the course picker (Waterbury Putt-Putt: clown head, windmill, palm trees, an alligator pond) |
| `spaceballs-card.png` | 960x540 | Screen picture | course picture for the course picker (Spaceball City Links: mini golf on a space station, planets and stars) |

## Arcade art (separate)
The Arcade's own background, logo and icon for this game are Arcade slots (`docs/arcade-art/PROMPTS.md`, slot
`happy-gilmore-golf`). A new background goes through the Background Picker before it ships.

## Ready-to-paste prompt (one picture at a time)
> Use the attached template. Draw `<slot name>` for **Sitabout Mini Golf**, a bright, polished mobile mini golf game seen
> from a tilted top-down view. Course: `<course + film>`. `<the slot's "what" text from the table>`. Keep the exact canvas
> size and every guide position (ground point, openings, hub); transparent background except for tiles; tiles must repeat
> seamlessly. Our own design, no logos, no real brands, no film stills.
