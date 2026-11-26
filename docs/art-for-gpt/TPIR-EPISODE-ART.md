# The Price Is Right — THE EPISODE: art for GPT (Nov 26)

The owner is turning The Price Is Right into **a whole episode like the real show**, played on the phone. The game opens on an old
TV-listings channel (a blue scrolling TV guide) shown **on a 1990s TV set**. You tap *The Price Is Right* at 9:00 AM, the TV
flickers to static and the channel number, and the episode plays:

1. The open and the call-down of the first four.
2. The host's entrance.
3. Contestants' Row, then pricing games, in the order the show runs them.
4. The Showcase Showdown wheel.
5. A commercial break.
6. More pricing games and a second wheel.
7. **The Showcase.** Prizes come out from behind the big sliding doors on the turntable.
8. The winner's **family runs down** to celebrate.
9. The host's spay-and-neuter **sign-off**.
10. **Credits**, then a winnings tally.

The studio, host, models, Contestants' Row, the wheel and every pricing game already have art (`GAMESHOW-ART.md`). This kit is
**only the new pieces**. Match the look of the art already in the game: photo-real, classic-era TV studio. The reference pictures
are in the folder: `REF-host.png`, `REF-contestant-body.png`, `REF-studio.png` and `REF-contestants-row-podium.png`.

**Templates:** `docs/art-for-gpt/tpir-episode-templates/`. To rebuild them, run `python3 tools/gameshow/episode-templates.py`.

- **Make every picture at exactly its template's size.**
- **Checkerboard = transparent.** Hand back a PNG with real transparency there.
- **Grey = an opaque picture** that fills the frame.
- **Pink lines are guides.** Never draw them.

**Hand back:** PNG files named exactly like the slot (`tv-frame.png`, `family-1.png`, ...) plus an `UPLOADS-GPT-<date-time>.md`
note in Art Tally (one line per file), as usual. Put the files in the Drive folder **The Price Is Right — Episode Art**. Prize
photos go in **The Price Is Right — Prize Photos / Batch NN**.

## Style (paste first)

> Photo-real, like a still from the classic 1970s-2000s daytime TV game show: bright studio lighting, saturated orange, gold,
> hot pink and electric blue set pieces, chrome, hundreds of light bulbs, a glossy stage floor. Real-looking people and
> objects. No text unless the slot asks for it. No watermarks.

## Batch 1: the TV set and the guide window

| Slot | Size | Prompt (after the style text) |
|---|---|---|
| `tv-frame` | 1920x1080 | A 1990s living-room CRT television seen straight on, filling the picture: wood-grain cabinet, a dial and volume knob, a speaker grille to the right of the screen, and a rabbit-ear antenna (cut by the top edge is fine). Show a dim 90s living-room wall around it. **The SCREEN must be a see-through hole exactly on the pink box**, with corners rounded like a real picture tube and a little glass bevel inside the edge. |
| `tv-frame-tall` | 1080x1920 | The same TV for upright phones. Antenna above, the screen hole on the pink box, the control panel below the screen (channel dial, volume knob, speaker grille). The TV stands on a wooden stand with a VCR under it, its clock blinking 12:00. |
| `tv-frame-fold` | 1504x1670 | The same TV for near-square screens. Screen hole on the pink box, controls under it. |
| `guide-promo-1` | 640x480 | A 4:3 promo still, soft like a 90s broadcast: the host from `REF-host.png` (gray suit, skinny microphone) smiling on our Price Is Right stage. |
| `guide-promo-2` | 640x480 | Promo still: four contestants jumping and screaming at their podiums on Contestants' Row, with the audience behind. |
| `guide-promo-3` | 640x480 | Promo still: a contestant pulling the Big Wheel down while the lights flash. |
| `guide-promo-4` | 640x480 | Promo still: a shiny new car on the turntable, a model in a sequinned gown presenting it. |

## Batch 2: the Showcase

| Slot | Size | Prompt |
|---|---|---|
| `stage-showcase` | 1920x1080 | The main stage for the Showcase, wide and **EMPTY (no people, no podiums, no prizes)**: the big turntable in the middle in front of the closed sliding doors, the floor on the pink line. Keep the middle box calm. Leave the lower right empty; the game draws the two podiums there. |
| `stage-showcase-tall` | 1080x1920 | The same, for upright phones, EMPTY. |
| `stage-showcase-fold` | 1504x1670 | The same, near square, EMPTY. |
| `showcase-podium` | 600x700 | One Showcase contestant podium seen from the front, transparent around. A big **black bid window** at the top, exactly on the pink box (the game prints the bid). A **name panel** low on the front, on the pink box (the game writes the name). Lit trim, show colours. |
| `door-panel` | 960x1080 | The **LEFT half** of the big sliding stage door that opens on a prize: glittery 70s/80s show door with stars and bulbs, filling the picture. Its inner edge is the right side of the picture. The game slides two apart and mirrors this one for the right half. |
| `turntable` | 1600x520 | The round prize turntable seen from the audience: an ellipse with chrome trim and bulbs round the edge, transparent around. Prizes stand on the pink ellipse. |

## Batch 3: the family and the goodbye

| Slot | Size | Prompt |
|---|---|---|
| `family-1` | 3072x768 | A contestant's family member, **HEADLESS**, like `REF-contestant-body.png`: stop at the neck under the pink circle and leave the circle empty, because the game adds a real face. Matching homemade family T-shirt with a heart, jeans. **8 poses**, one per box, feet on the dot: RUN 1-4 (a sprint cycle toward the stage), JUMP (both arms up), HUG (arms wide), CHEER (fists up), WAVE. Transparent. |
| `family-2` | 3072x768 | Family member 2, headless, the same 8 poses: a sundress and sandals. |
| `family-3` | 3072x768 | Family member 3, headless, the same 8 poses: a sports jersey and cargo shorts. |
| `family-4` | 3072x768 | Family member 4, headless, the same 8 poses: **a kid** (shorter: the face circle sits lower) in a bright T-shirt and sneakers. |
| `host-bye` | 1536x1024 | **The same host as `REF-host.png`** (same face, hair, gray suit, skinny microphone), full body, 3 poses: WAVE (waving goodbye to the camera), SINCERE (mic close, talking straight to camera: the pet reminder), BOW (a small bow with the mic). Feet on the dots, transparent. |

## Batch 4: the commercial break, the credits, the tally

| Slot | Size | Prompt |
|---|---|---|
| `ad-fightmilk` | 1920x1080 | A 1990s TV commercial frame for **FIGHT MILK** (It's Always Sunny in Philadelphia): a gallon jug of milk with a crow on the label, dramatic lighting, a gritty boxing gym, "FIGHT MILK" in bold 90s ad lettering. Keep the bottom third calm (the game writes the slogan there). |
| `ad-brawndo` | 1920x1080 | A 1990s TV commercial frame for **BRAWNDO THE THIRST MUTILATOR** (Idiocracy): a big green can with lightning bolts, over-the-top 90s energy-drink style. Bottom third calm. |
| `ad-rumham` | 1920x1080 | A 1990s TV commercial frame for **RUM HAM** (It's Always Sunny): a glazed ham floating on an inner tube on a sunny beach next to a bottle of rum. Bottom third calm. |
| `credits-bg` | 1920x1080 | The end of the show: a wide shot of the whole stage with confetti in the air and every light blazing, EMPTY of people, a little darker in the middle box so white scrolling credits read over it. |
| `credits-bg-tall` | 1080x1920 | The same, upright. |
| `tally-bg` | 1920x1080 | A lit-up 70s game-show scoreboard wall (bulbs, gold and orange panels) with a big EMPTY panel in the middle for the game's winnings table. |
| `tally-bg-tall` | 1080x1920 | The same, upright. |

## Batch 5 and on: prize photos (the big one)

The episode now deals from **~500 real prizes**: TVs, furniture, appliances, grills, bikes, instruments, cars, boats, trips and
small grocery/household prizes. The game shows each one big when the announcer presents it. Today it draws an emoji when there
is no photo.

**`PRIZE-PHOTOS-TODO.csv`** lists every prize with no photo yet: batch number, file name, what it is, price and kind. That's
456 prizes in 19 batches of 25. **Make them a batch at a time** (25 per batch).

| What | Size | Prompt |
|---|---|---|
| one prize | 512x512 | See `prize-photo-template.png`. A product photo of **exactly the item in the CSV** (the real product, as sold in 2026), centred and filling the pink box, on a **transparent background**, with a soft shadow under it. Name the file exactly as in the CSV (`<id>.png`). |

Kind-specific prompts:

- **Cars:** a 3/4 front view of the real model, showroom clean, in a bright show colour.
- **Trips:** one iconic postcard picture of the place (beach, Eiffel Tower, ...), cut out like a rounded travel poster.
- **Boats and campers:** the vehicle alone, 3/4 view.
- **Furniture sets:** the set arranged as a little showroom group.

## Already done (don't redo)

Host, two models, studio audience, Contestants' Row, the Big Wheel, Plinko, Cliff Hangers, Clock Game, Range Game, Safe Crackers,
Race Game, Punch-a-Bunch (see `GAMESHOW-ART.md`), and the 60 Plinko small-prize photos in `assets/prizes`.
