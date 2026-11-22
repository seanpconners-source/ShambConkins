# Shooter McGavin's Pro Tour: art for GPT

Our own arcade trackball golf game (game id `mcgavin-pro-tour`, Happy Gilmore theme: Shooter McGavin's own pro tour).
It PLAYS like the bar-cabinet trackball golf games, but every picture must be our own: **no Golden Tee art, names, logos,
courses or golfers**, no real golfers' faces, no real brand logos (no Nike, Titleist, Callaway, PGA).

**Templates:** `docs/art-for-gpt/golf-templates/` (`node tools/golf-templates.mjs` rebuilds them). Every slot has a
`-template.png` (pink guides: frames, face circles, feet dots, horizon line, tree base point) and a `-reference.png` (what the
game draws today). Send GPT the template with the prompt below. **Make each picture at exactly the template's size.**

**Hand back:** PNG files named exactly like the slot (`golfer-p1.png`, `tree-oak.png`, ...). Claude puts them in
`assets/golf/` (lossless WebP). Any picture that is missing is still drawn by the game.

## Style for every picture (paste this first)

> Bright, glossy late-90s / early-2000s arcade golf cabinet art, painted not photographed: saturated greens, deep blue skies,
> warm sun, crisp clean edges, a little cartoonish but believable. Original art only: no real golfers, no real logos, no
> existing golf game's art. No text unless the slot asks for it.

## The pictures

| Slot | Size | Prompt (after the style text) |
|---|---|---|
| `golfer-p1` | 2560x384 | A sprite sheet of ONE golfer, 10 frames in a row, each 256x384, exactly in the template's boxes. Seen from **behind and a little to the left** (we look over their shoulder down the fairway), right-handed. **HEADLESS**: stop at the neck; the game paints the player's face in the pink circle, so leave the circle empty (transparent). Feet on the pink dot in every frame. Red-and-white polo, khaki trousers, white golf shoes, a white glove. Frames: address, backswing 1, backswing 2, top of swing, downswing, impact, follow-through, finish, putting address, putting stroke. Follow the faint body in each template box for the pose. Transparent background, nothing crosses into the next box. |
| `golfer-p2` | 2560x384 | Same sheet, same poses and sizes, blue-and-white polo, grey trousers. |
| `sky-park` | 2048x512 | Bushwood Country Club sky: summer blue sky with soft white clouds, a dark green tree line along the pink HORIZON line (y 400), nothing below it but the tree line's base. Left and right edges must join seamlessly (it wraps round 360°). |
| `sky-desert` | 2048x512 | Bat Country Links sky: hot pale Nevada sky, red-orange mesas and buttes sitting on the horizon line (y 400), heat haze. Wraps left to right. |
| `sky-lake` | 2048x512 | Waterbury Lakes sky: crisp deep-blue sky, pine-covered hills and a distant lake shore on the horizon line (y 400). Wraps left to right. |
| `ground-detail` | 512x512 | Seamless mid-grey texture of close-mown grass blades and specks of soil, top-down. The game multiplies it over every grass colour, so keep it grey and even (no big blotches). Tiles in both directions. |
| `water` | 512x512 | Seamless top-down water ripples, light grey-blue with white glints. Tiles in both directions. |
| `flag` | 256x160 | A red pin flag cloth with a white star, slightly rippled, attached on its LEFT edge (no pole). Transparent around it. |
| `tree-oak` / `tree-oak2` / `tree-elm` / `tree-maple` / `tree-birch` | 512x768 | One full tree of that kind, painted as a cut-out, trunk base exactly on the pink dot at the bottom centre (256,760). Full round canopy, transparent around it. Make `oak2` a different shape from `oak`. |
| `tree-pine` / `tree-pine2` | 512x768 | A tall pine / fir tree, trunk base on the dot. Two different shapes. |
| `tree-cactus` / `tree-cactus2` / `tree-joshua` / `tree-mesquite` | 512x768 | Desert plants for Bat Country: a tall saguaro with arms, a shorter saguaro or barrel group, a Joshua tree, a scrubby mesquite tree. Base on the dot, transparent around. |
| `trackball` | 512x512 | The cabinet's trackball seen from straight above: a glossy translucent white-blue ball inside the inner pink circle, a chrome bezel ring out to the outer circle. Transparent outside the ring. |
| `logo` | 1600x700 | Title logo reading **SHOOTER McGAVIN'S** on top and **PRO TOUR** big below, in a cocky 90s sports style (gold and black, a golf ball and crossed clubs, a little sparkle). Transparent background. |
| `title-bg` | 1920x1080 | Title screen backdrop: a gorgeous golf hole at golden hour from behind the tee, fairway sweeping to a green by a lake, trees and hills. Keep the top-middle (logo) and the centre (course cards) calm. No people, no text. |
| `tee-marker` | 128x128 | One tee marker: a big gold golf ball on a short peg, slight shadow. Transparent around. |
| `cup` | 256x256 | The hole cup seen from a low angle: white plastic rim around a dark hole, a little grass edge. Transparent around. |

## Notes
- The golfer is drawn about a third of the screen tall, so the sheet's detail shows: give it clean shapes and shading.
- Trees are billboards: the game stands two crossed copies on each tree spot, so the tree should look right from the front.
