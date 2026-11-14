# Paddy's Pool: picture brief for GPT

You are drawing art for **Paddy's Pool**, a pool game (8-ball and 9-ball) inside a party game. It is set in **Paddy's Pub**
from *It's Always Sunny in Philadelphia*. The player starts at a ratty, filthy bar table and spends the cash they win on
better tables, cues, and upgrades for the whole bar (cleaner room, better light, TVs, a nicer bar, neon signs). Every
upgrade should look clearly **better and fancier** than the one before: the jump from tier 0 to tier 4 is "sticky dive bar"
to "gold-and-marble palace".

**Style:** modern, polished mobile-game art: rich lighting, clean shapes, crisp edges, slightly stylised realism (think a
premium pool app, not pixel art). Warm bar lighting. No text except where a slot asks for a sign or the logo.
**Never:** real brand logos (no Budweiser, Coors etc.), the show's own logo, photos of the actors. The show's in-jokes are
fine and wanted: Wolf Cola, Fight Milk, Kitten Mittens, Rum Ham, Paddy's Pub, Pepe Silvia, Dennis's "five-star" vanity.

**How to deliver:** one PNG per slot, named exactly like the slot (`table-oak-tavern.png`), at the template's size or exactly
2x it, transparent background unless the slot says otherwise. Open the template from `docs/pool-sprites/templates/<slot>.png`
and keep its layout: **magenta areas must stay transparent**, **cyan marks** show where the game draws things on top (pocket
holes, TV screens, the felt).

## 1. Tables, seen from straight above (`table-<id>`, 1030 x 590)
Only the **rails and the six pockets**. Everything inside the dashed magenta line is transparent: the game paints the felt and
the cushions in the player's chosen colour. Pocket holes (black, with their liner/net) sit on the cyan circles. Diamond sights
along the rails. Light from above (soft highlight along the top of the rails).

| Slot | Look |
|---|---|
| `table-paddys-wreck` | Paddy's Original: dark, scratched, gouged wood, cigarette burns on the rails, sticky rings, a chipped corner, cheap rope-net pockets |
| `table-duct-tape` | the same table patched up: duct tape on a cracked rail, still worn, slightly cleaner |
| `table-coin-op` | coin-op bar box: black laminate rails, chrome corner caps, a chrome coin plate with a slot on the right (foot) rail, black rubber drop pockets |
| `table-oak-tavern` | hand-rubbed honey oak, brass diamond sights, brown leather drop pockets with stitching |
| `table-pro-tour` | tournament table: steel-grey rails, glowing blue LED sights, sleek black pockets with a metal rim |
| `table-golden-god` | gold leaf rails with ornate carving, diamond sights, gold pockets: over the top |

## 2. Felt wear (`wear-1`, `wear-2`, `wear-3`, 880 x 440)
Marks on the felt bed, transparent around them. They are **multiplied** over any felt colour, so paint them as darkish
marks (beer rings, spills, cigarette burns, chalk smudges) and pale slate for rips. Rips go where the template marks them.
`wear-3` = Paddy's Original (ripped felt showing slate, spills, burns, rings everywhere), `wear-2` = the rips taped over with
silver duct tape, fewer stains, `wear-1` = a few faint marks.

## 3. Cues (`cue-<id>`, 1200 x 48)
A cue lying flat, **tip at the right edge**, butt on the left, transparent around it. Real proportions: thin maple shaft on
the right half (white ferrule, blue chalked tip), decorated butt on the left.

| Slot | Look |
|---|---|
| `cue-house` | warped cheap house cue, chipped, caked in chalk |
| `cue-rat-stick` | Charlie's rat-bashing stick turned cue: rough wood, red tape, a few nails |
| `cue-wolf-cola` | black with orange Wolf Cola wolf-head stripes |
| `cue-karate` | white butt with a black belt wrap and a red band, karate-gi feel |
| `cue-bird` | pink with a white wrap and little feathers ("Dee's a bird") |
| `cue-magnum` | gun-metal grey with a knurled pistol-grip wrap |
| `cue-dennis` | black and blood-red, ivory inlays, smug and expensive |
| `cue-golden` | solid gold with diamond inlays |

## 4. The floor and the wall strip (play screen)
`floor-0..4` (512 x 512, **must tile**) and `wall-0..4` (1600 x 320, opaque; the bottom 40 px is the skirting and the shadow
where the wall meets the floor). Tier 0 sticky stained linoleum + nicotine-yellow wood panelling; 1 mopped wood + cleaner
panelling; 2 sports-bar hardwood + exposed brick; 3 lounge carpet + dark damask wallpaper; 4 marble + gold panels and mirrors.
Leave the middle of the wall strip fairly plain (TVs are drawn on it) and the two sides for neon signs.

## 5. The Pool Hall (the upgrade screen: Paddy's seen straight on, 1600 x 1000)
`hall-0..4`: the **empty** room for each tier (back wall, ceiling, floor; floor line at y 640). No furniture: the game places
the bar, TVs, light, table and decorations in the boxes on the template.
Pieces (transparent around them, sizes on their templates):
- `hall-bar-0..4`: back-bar shelves + counter + stools. 0 Paddy's bar (half-empty well shelves, a bowl of mystery nuts),
  1 stocked, 2 craft beer taps, 3 back-lit top shelf, 4 champagne tower.
- `hall-light-0..4`: what hangs over the table. 0 one bare bulb on a wire, 1 a plastic beer-sign lamp (made-up brand
  "Dookie's Lite"), 2 three stained-glass Tiffany shades, 3 a pro LED canopy, 4 a crystal chandelier.
- `hall-tv-1..4`: 1 a busted CRT on a bracket, 2 two flat screens, 3 a six-screen TV wall, 4 a jumbotron. **Screens solid
  black** inside the cyan boxes (the game shows sports, Philly news and the player's face on them).
- `hall-table-<id>` (6): the same six tables as section 1, seen from the front and a little above; the felt is transparent
  (magenta quad), legs and apron visible.
- `decor-<id>`: `neon-paddys` (green shamrock "Paddy's Pub" neon), `neon-fight-milk`, `neon-kitten` (Kitten Mittens),
  `neon-wolf` (Wolf Cola), `jukebox`, `dartboard`, `chalkboard` (bar specials in chalk), `pepe-board` (Charlie's conspiracy
  wall with red string), `dennis-portrait` (an oil portrait frame; the game puts Dennis's face in it, so leave the face area
  as a plain dark oval), `fan` (ceiling fan, wobbly), `trophy-case` (glass case, shelves empty: the game adds trophies),
  `megatouch` (bar-top game machine, screen dark), `rum-ham` (a glazed ham on a platter).

## 6. Logo (`logo`, 1200 x 480)
"PADDY'S POOL" in a bold neon-sign style (green and gold), maybe an 8-ball in the lettering. Transparent around it.

Then the Arcade art for the two games (key art + icon + logo per `docs/art-for-gpt/ARCADE-GAMES.md`): slots
`paddys-eight-ball` and `color-of-money` (shared look: Paddy's Pub pool night). New Arcade backgrounds go through the
Background Picker before they ship.
