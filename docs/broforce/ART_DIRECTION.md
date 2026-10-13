# BF-01 — Original Pixel-Action Art Bible and Android/Fold UX

**Status:** Design specification for PM review; no implementation or new art files.
**Target:** A ShambConkins two-person, offline, mobile-first cinematic run-and-gun minigame with unmistakably original production art.
**Source anchor:** 16770ee301e5a94bda02e375cf0341177b481e3a (the pinned `feature/broforce-mobile` baseline).
**Ownership:** BF-01 specifies visual treatment, presentation, sizing, and visual QA. Engine physics, terrain meanings, controls protocol, asset paths, gameplay, and integration remain owned by their respective implementation workers.

## 1. North star and non-negotiables

Make a scene that feels like an explosive hand-authored action film in motion: a 1-second glance shows who the two players are, where the landing surfaces are, who is shooting, what can break, and where escape lies. High kinetic density must *increase*, not bury, legibility. The work may evoke the **pace, destructive spectacle, and side-scrolling urgency** associated with Broforce, but must **not** trace, recolor, or adapt Broforce character sprites, tiles, logos, maps, animations, weapons, helicopters, music, or UI. Reject generic clip-art soldiers and stock military backgrounds too. Create original silhouettes, locations, machinery, palettes, animations, and extraction iconography.

Visual identity: **“Midnight Canopy / Golden Hour Mayhem.”** Dense humid jungle plus handmade industrial silhouettes, burnt-gold glints on metal, arresting orange muzzle flashes, pale dusty smoke, and deep navy/teal shadow. Heroes are unmistakably ShambConkins because their *existing recognizable photographic heads* sit on cohesive hand-pixeled action bodies, with intentional neck/helmet integration rather than pasted circular faces.

Frame priorities (in order): **playable terrain > player faces / aim > threats / projectiles > destruction / story detail > atmosphere**. Never put spectacle ahead of control feedback. Keep a readable neutral scene even with particles and lighting switched off.

## 2. Existing project interfaces (read-only findings)

The pinned repository uses browser CommonJS-style modules and generates an offline single-file HTML. Relevant verified source conventions:

- **src/engines/session.js:** `s.canvas(W,H,{fill:true})` grows to the canvas frame and refreshes `s.W/s.H`; `s.sprite(ctx,i,x,y,size,{exact:true,mood})` loads a character head, uses a fallback glyph, and supports walking / happy / thinking / sad reactions. Session mounts a default header and score bar. The BF-01 visual proposal for game-only chrome is therefore a **future game-scoped presentation change** for another authorized worker; BF-01 does not modify the shared session API.
- **src/assets.js:** `portraitURL(id,mood)` and supplied portrait data select existing artwork; `portraitMoods(id)` reports genuinely available alternative moods. Preserve supplied assets and existing character identifiers; no remote lookups are required for the two selected local heads.
- **src/headCutouts.js:** edge-background removal is cached for eligible non-PNG images, avoids deleting enclosed dark facial features, and has a source fallback. It is **not** a universal offline transparent-head generator; do not assume all photos are prematted.
- **src/engines/horde.js:** uses a full-fill drag arena, independent left/right pointer ownership, prerendered/cached imagery, screen/world transforms, player portrait drawing, particle effects, culling, and a reduced-motion check. This is a **reference for rendering discipline**, not a sprite or art source to copy.
- **src/styles.css** and **src/fullscreen.js:** `drag-arena-body` removes extra button rows, `canvas-game-shell` expands available width, game-shell chrome otherwise consumes vertical space; existing short-landscape boss rules hide score/status/hints. Fullscreen may require a direct user gesture; it is not guaranteed on every browser. The HTML viewport already uses `viewport-fit=cover`.
- **src/engines/duelControls.js** and **src/touchInput.js:** tracked multi-touch retains ownership from touch-down through release; touch and pointer modes are supported, including cancellations. New UX must not steal or dynamically reassign an active finger, and must handle app blur, rotation, pause, and interrupted gestures.

**Contract lock:** do not reinterpret or renumber the parent design's terrain IDs **0, 1, 2, 3, 4, 5**, tile collision rules, metadata, entity IDs, or module boundaries. They are *logic contracts*, not an invitation to assign new terrain meanings in this art bible. Visual overlays and biome treatment may decorate the existing IDs without altering them. No unapproved asset-path, save, or network contract is introduced here.

## 3. Resolution, pixel language, and silhouette hierarchy

**Proposed art grid:** 16 authored square art-pixels per terrain tile, with a 2–3 art-pixel trim language and 1-pixel deliberate edge wear. Treat this as a **rendering proposal**, not a redefinition of game-world tile size or collision grid. Render tile/sprite atlases with `imageSmoothingEnabled=false`, snap terrain/camera presentation where practical to avoid shimmer, and choose the closest clean integer upscale. If a viewport demands fractional canvas scaling, allow the camera to fill the viewport; **never create black side bars just to hold a pixel-perfect integer multiplier**. Do not stretch a base 16:9 painting over a 390x780 screen.

- At 390px-wide portrait, target a visually readable 28–34 CSS-pixel tile and 65–82px overall hero silhouette; a hero's face should typically be **32–44 CSS px** across. Do not reduce the head below **28px** during live play; adjust camera framing or use a player locator instead.
- At 844px-wide landscape, target 22–32 CSS-pixel tile, **62–80px** hero, **32–42px** head. Widen the camera horizontally instead of shrinking people into dots.
- On 840px Fold / 1100px desktop, maintain hero height **70–90px** and **34–46px** heads in normal play; show more world, not comically huge characters. Bosses may exceed these proportions.
- Suggested authored player rig: 24×34 pixel body, with a custom 18–22 pixel neck/helmet/head frame; the **photo** is a separately composited 24–30 art-pixel region, scaled to those display targets. Face is not limited to a square: cropped silhouette, hair, and ears may rise above a 1–2px head rim. No all-black features, no micro-details that disappear at native 100% phone size.
- Character hierarchy: P1 outline accent **ice blue #79C8DD**, P2 **warm coral #F3A178**; neither hue should determine collision or team meaning. Form/shape, a 2px rim, distinct torso gear, and a compact on-screen player index must distinguish both players under color-vision differences.
- Three-value readability test: grayscale a screenshot. Characters and interactive ledges must still be distinguishable from background. Player rim and foreground edges target **at least 3:1 luminance contrast** against their immediate local backdrop where feasible. Use a contrasting narrow dark stroke on very bright backgrounds.

**No visual shortcuts:** prohibit vector-looking perfect circles as major terrain shapes, single-gradient wilderness, giant emoji-only characters, unfiltered photo stickers, randomized uniform noise, and cloned tile patterns every few feet. Pixel clustering should be intentional: masses of 2–5 pixels, irregular broken edges, disciplined dark outlines, and distinct high/mid/low material values.

## 4. Color and material atlas

The following is the **proposed baseline**, not a new terrain-code palette:

| Role | Anchor | Secondary | Highlight | Rules |
| --- | --- | --- | --- | --- |
| Deep shadow / night | #0C1824 | #183640 | #285260 | 30–45% of scene; no featureless black void |
| Jungle canopy | #214936 | #3D754B | #73A361 | No neon grass; warm leaf-edge highlights |
| Dirt / exposed cut | #403A32 | #6D5D43 | #AE9361 | Rough block edges; legible support underneath platforms |
| Metal / machinery | #23323B | #526B71 | #E0B76E | Uneven rivets, worn seams, gold edge light |
| Sun / signal gold | #DDA94D | #F1CA72 | #FFE2A0 | Scarce focal accents on pickups, exits, eyes |
| Blast / damage orange | #C54B27 | #F1782D | #FFD38B | Hot 3-frame core, never permanent orange wash |
| Smoke / dust | #657C7B | #A7BDB3 | #E1E8D8 | Occluding opacity controlled by gameplay readability |
| Alert / danger | #923E42 | #E56555 | #FFC7A4 | Distinct warning silhouette + motion, not red alone |

Use **24–32 coordinated paint colors per location** (plus photography) to make materials feel authored; effects can temporarily add bright emission colors. Compose a background / midground / foreground value separation: backdrop approx 15–25% less contrast and saturation than platforms, foreground at full intended contrast. Reserve highest-value warm highlights for active dangers, extraction, exposed weak points, and dropped rewards. Never let a bright backdrop swallow a muzzle flash.

Distinct material families: matte wet leaf clusters; jagged aggregate rock; stratified mud with root cross-sections; riveted military-salvage metal; splintering wooden braces; taut cables and corrugated roofs; glowing handheld signage. Each family has its own break animation and particulate signature.

## 5. Terrain, density, layers, and camera

**Solid terrain silhouettes win.** Within one glance, tops of walkable surfaces read as a continuous high-contrast boundary, with a 1–2px warm worn lip; vertical faces read darker; hazardous or non-solid decoration never masquerades as footing. Existing terrain IDs 0..5 remain opaque to this design. Implementation maps art to the actual meanings after consulting the source owner.

Proposed modular original jungle scene grammar:

1. **Sky/back plate:** midnight gradient represented by dithered color bands, fine far-cloud slivers, one broad distant light shaft. Sparse lightning or stars only when justified.
2. **Far canopy (0.12–0.22x camera drift):** 3–5 interlocking jagged treetop silhouettes and far ridge banks; no repeated skyline stamp spanning more than 1.5 screens.
3. **Middle jungle (0.32–0.50x):** overlapping trunk columns, broad leaves, giant moss-clad ruins, antenna silhouettes and broken walkways.
4. **Near structure (0.68–0.83x):** thick hanging vines, pipes, tower braces, helicopter-worn flag cloth; crop edges without concealing projectiles.
5. **Gameplay plane (1.0x):** vivid ledges, ladders/supports if contractually present, enemies and players, breakable panels, pickups, collision telegraphs.
6. **Front accents (1.06–1.15x):** restrained grass wisps/debris at feet, always masked around heads and aim lanes; never a permanent screen-spanning foreground curtain.
7. **Atmosphere:** dust glints, drifting pollen, narrow fog sheets, orange blast light, slight heat ripple only outside aim-critical edges.

**Occupancy targets for review:** in a 16:9 calm traversal shot, at least **35% of playable non-sky area** contains intentional material/architecture detail (not flat fill) and **3 distinct depth cues** are visible; in 390px portrait, retain a simple and uncluttered **70–100px screen-width threat corridor** around each active player's aim. Every 1–1.5 screens of progression should provide a new foreground silhouette, memorable structure, or vista change. This is aesthetic guidance, not a level generator rule.

Use environmental storytelling with original set pieces: jungle research relay, vine-choked cargo lift, cliffside blast furnace, stilted signal tower, underground cooling cistern, and extraction clearing. Sprinkle signs, cables, searchlight cones, bent palm trunks, support beams, spent shells, wildflowers and dripping gutters in authored clusters; no copyrighted franchise emblems or lifted screen compositions.

**Camera:** bias ahead of combined velocity/aim, do not hard-lock at dead center. Favor both players in view with **at least 24px safety from UI edges** when separation allows. If they separate too far, zoom only until heads stay above their minimum display size; then use off-screen teammate arrows and distance pips. Respect camera bounds and avoid showing unpainted empty world on tall portrait or short landscape. Shake affects world and effects, **not** HUD, touch coordinates, face compositing alignment or fixed controls.

## 6. Player art: existing photo heads on premium pixel bodies

The key aesthetic problem is intentional *photo/pixel fusion*. Preserve recognizable existing faces for the selected player identities. The source of truth for choice and mood is the existing portrait pipeline, not a new anonymous soldier sprite.

**Face pipeline proposal, for subsequent asset/code owners:**

1. Resolve the selected character through the existing player/portrait ID and `portraitURL`; prefer an existing offline-bundled local face and available `portraitMoods`. Do not add live fetch requirements. Never change the owner-supplied original face files.
2. Build a one-time **offscreen normalized head atlas** per relevant portrait/mood: crop using actual visible head bounds, keep hairline/ears/chin, preserve correct aspect ratio, and precompute transparency plus a **1–2 art-pixel soft dark contour** against varied backgrounds. For nontransparent photos, use an explicit offline-safe silhouette mask / padded border; the existing edge cutout alone cannot be assumed to work on every image.
3. Apply **mild** posterization/dithering only to the **rim, neck scarf, and ambient edge**. Keep pupils, mouth, eyebrows, nose and skin tones photographic enough to recognize both people. Treat image filtering as an optional aesthetic pass; never aggressively index faces into 4 colors or stretch them to fill a square.
4. Seat jawline 2–4 display px within an authored collar/helmet opening; render neck/body **behind**, face **in front**, then hair/helmet trim and front weapon **over** as appropriate. Keep a matching 1–2px contact shadow under chin and a cast shadow from helmet rim. Do not float a portrait 10px above a stick body.
5. Anchor head art to the body's hip/foot pivot, with small independent bob/tilt. **Do not mirror the photographic face** when reversing direction: mirror the body and weapon or use a face-safe symmetrical rig; a genuine original portrait should not visibly swap asymmetrical facial features or mirrored text.
6. On missing/failed asset use the **existing local fallback portrait or recognizable initials/icon** composited in a deliberate, original helmet faceplate with the **same body rig**. Never show a broken image or an isolated emoji in the battlefield. Remote portraits must fail closed to bundled fallback offline.

**Body grammar:** P1 compact explorer-cadet (rectangular shoulder plates, rolled sleeves, angled sling); P2 long-coat demolition-scout (tall collar, asymmetrical straps, rugged boots). Either player can use either character: body identity is player-owned gear/color treatment, *not* a claim about the person's real appearance. Both have a readable 2–3px waist pivot, offset backpack, separated hands, exaggerated 6–9px boot shapes, warm metallic weapon highlights, recoil geometry, and a low flat elliptical ground shadow. The 2 players must remain visually distinguishable when their photographic faces are temporarily obscured by effects.

**Sprite/rig frame-state list — minimum animation intent:**

| State | Authored frames / behavior | Face & FX rule |
| --- | --- | --- |
| Idle breathe | 4 frames at 4–6fps + slower shoulder/head drift | neutral or thinking; do not force mood asset if unavailable |
| Walk | 8 frames at 10–12fps, definite heel contact and opposing arm swing | walking if genuinely available; head bob <=2px |
| Run | 8 frames at 12–14fps, shorter contact, forward lean | stable head orientation; no face stretch |
| Jump ascend | 2–3 frames, anticipation/extension | clear lifted boots and rising shadow separation |
| Apex / fall | 2 + 3 frames, distinguish rising vs falling | gravity read through coat, knees, and shadow size |
| Land | 3 frames, 80–130ms impact settle | tiny dust ring, no screen-covering cloud |
| Fire | 3–4 frames + 40–80ms flash, directional recoil | forward hands track weapon, cheek stays readable |
| Reload / ready | 5–6 frames, 0.3–0.5s | distinct muzzle-down silhouette |
| Melee / grenade | 5–6 throw/strike frames | clear arm path; no flickering hidden head |
| Hurt / knockback | 3 frames + 100–180ms hurt flash | sad/angry only if available; player accent outline survives |
| Stunned / down | 3–4 frames + loop | outlined helmet/face; revive marker separate from damage flash |
| Rescue / victory | 6 frames / looping 4-frame pose | existing happy/win where available |
| Extraction climb | 6 frames + attachment hand pose | boots leave platform; face always on original character |

Animation display rates are targets to assess, not new game timing contracts. Keep **foot anchor locked** through frame swaps; no 1–3px character jitter caused by misaligned frame extents. If the face swaps moods, cross-fade only the face region over 90–140ms and never double-draw eyes.

## 7. Weapons, enemy silhouettes, bosses, and effects

Weapons should read by **shape and behavior**, not brand imitation: short boxy scrap carbine (tight cone, thin shells), long double-rail coil tool (linear tracer and charging fins), drum-fed concussive launcher (large recoil/hot shell), and stubby flare/scatter gun (fan muzzle and ember shells). Original firearm-like abstractions are visual concepts only; this brief supplies **no weapon stats, firing cadence, damage rules, or implementation contracts**. A dark outline and warm brass/steel accent make muzzle orientation unambiguous.

Enemies get at least 3 tiers of silhouette: small fast hunched scouts, medium shielded tower sentries, and a tall angular armored heavy. Every tier has a distinct idle, anticipation (>=120ms visible where attack timing permits), attack, stagger, and defeat silhouette. Use **clear hit-flash → recoil → colored shards/splinters → smoke fade**, with damage numbers no larger than needed. Damage must not be signaled by color alone.

**Signature original boss visual:** a **“Canopy Harvester”**—enormous asymmetrical, six-legged salvage machine with an oxidized teal furnace chest, orange square exhausts, giant articulated logging claws, jungle-growth trapped in its joints, and a rotating broken gold radar crown. Distinct forms are chassis idle, windup (open furnace iris), attack (claw plane and lantern tracer), exposed core (pale-gold weak spot), stagger, enraged (secondary exhaust arms) and defeat (legs fold one-by-one under a collapsing canopy). Give 6–10 screen-important authored frames per phase rather than dozens of near-identical frames. Keep its hazardous limb and telegraph within playable viewport and outside control-only overlay zones when possible.

**Destruction grammar:**
- Wood: dark splinter blocks, tan grain fragments, a short dust puff, no sparks.
- Stone/soil: angular heavy chips, fine drifting grit, a brief settling cloud.
- Metal: 2–4 bright sparks, bending plate, loose rivet arcs, smoke wick.
- Foliage: translucent leaf chips + springy return, low-contrast green fragments.
- Explosive machinery: white core (1 frame), orange petals (2–3 frames), secondary amber glow, pale smoke, falling metal; preserve character contours in front of the largest burst.

**FX budgets per active viewport (targets):** ordinary impact 4–9 fragments and 1 tiny puff; big explosion 20–35 active particles + up to 2 short lived light sprites; avoid more than **140 simultaneous transient particles** on a phone. Muzzle flash lasts roughly **45–85ms**; damage flash **70–120ms**; smoke **0.3–0.9s** with early opacity decay. World shake **1–3 CSS px** for an ordinary hit and **up to 5px for a nearby major blast**, damping within 160ms; never sustained camera sickness. Respect `reducedMotion`: remove shake, heat shimmer, animated scanlines, and large strobe; retain silhouettes, single nonstrobing impacts, and damage markers. Limit large-brightness flashes to avoid photosensitive discomfort.

## 8. Helicopter extraction: film payoff without copied iconography

An original angular **“Mothwing Liftern”** rescue craft: two canted ducted fans, narrow mustard cargo belly, midnight-teal nose wedge, canvas sling hanging from a three-pronged arm, red rescue beacon, low rectangular landing lights, and a chipped identification symbol unique to ShambConkins. Avoid Broforce's helicopter outline, wheel/landing skid framing, flag gag, or extraction choreography.

Six readable beat states: (1) far searchlight + approaching fan silhouette; (2) descending wind bends leaves and smoke; (3) sling drops, gold pulsing extraction ring marks safe pickup; (4) P1/P2 separately grab attachment with their recognizable heads visible; (5) low hover/dust burst and camera follow; (6) getaway streak toward a custom jungle-mountain vista. Each beat gets a clear completion/ready marker. If a player is down or still arriving, display a game-logic-driven wait/revive cue; **do not invent an extraction win condition** in art. Helicopter FX must not hide the precise interaction anchor.

## 9. Game-only Android/Fold UX: geometries and controls

These are **reference CSS viewport sizes**, not physical device pixels. Coordinate origins are top-left. Safe-inset numbers below are **illustrative stage values**; always read actual `env(safe-area-inset-*)`, browser `visualViewport` / effective game-area dimensions as appropriate, screen orientation, and fullscreen state. Treat any fold/hinge split regions as an exclusion area if the browser exposes them; do not assume a fixed hinge coordinate or that every Fold viewport spans a hinge. Canvas background is full bleed into safe areas, but faces, interactable controls, reticles, and HUD text remain inside a **12–20px inner margin beyond actual unsafe pixels**.

**Chrome policy:** gameplay-only surface goes edge-to-edge; compress/remove the large global game title/header, brand logo, duplicated scorebar, help row and button bars *only for the new mode* through a scoped shell treatment. Overlay a **single compact HUD** with P1/P2 head chips, life/ammo/revive/extraction indicators and an accessible small pause icon. The standard ShambConkins shell must remain untouched in other games. Keep pause/exit confirmation reachable; reveal controls/help before launch or via pause overlay, not an always-open paragraph over play. Fullscreen is best effort after a **legitimate user tap**; no dependence on forced orientation, browser UI hiding, or browser-specific permission.

| Stage viewport | Illustrative safe insets (T/R/B/L) | HUD (CSS px) | Critical unobstructed gameplay space | Proposed two-person overlay placement |
| --- | --- | --- | --- | --- |
| **390×780 phone portrait** | 24/0/24/0 | x=12..378, y=28..64 | x=8..382, y=72..560 | P1 in x=8..189, P2 in x=201..382; zones y=586..748; avoid notch and navigation edge |
| **844×390 phone landscape** | 8/16/12/36 | x=48..816, y=12..44 | x=212..632, y=52..338 (world fills behind controls) | P1 control island x=48..202, P2 x=642..816; y=226..360, translucent |
| **840×700 opened Fold** | 20/8/24/8 | x=24..816, y=24..64 | x=195..645, y=72..576 (world extends under controls) | P1 x=24..192, P2 x=648..816; controls y=500..666 |
| **1100×700 desktop** | 0/0/0/0 | x=20..1080, y=16..64 | x=110..990, y=80..620 | Auto-hide touchscreen controls for keyboard; optionally show unobtrusive 2-line help on pause |

The gameplay **canvas paints full viewport** (within browser's actual renderable surface) on every size; the “critical gameplay” boxes above are keep-clear recommendations, **not letterboxed camera rectangles**. Terrain, skies, and parallax extend to all canvas edges. Crop/expand the camera horizontally or vertically according to gameplay needs, not a fixed artwork aspect ratio. Never compress or non-uniformly scale the scene. Verify both players' heads, enemies, aim paths and platform edges remain visibly separated from HUD.

**Simultaneous two-player interaction proposal** (to be reviewed by the controls worker against gameplay contracts):

- **Portrait:** the two players get independent bottom **half-width touch zones**, with P1 left and P2 right. Each zone contains a tactile 88–98px movement thumb disk and **two 48–54px action targets** (jump and fire) near its inner edge; a held alternate action such as grenade is optional and may not be introduced without controls owner approval. Example centers P1 move (55,674), actions (151,637)/(151,708); P2 move (335,674), actions (239,637)/(239,708). Keep **>=8px gap** between targets and a **>=12px buffer** around the player-zone boundary. If four thumbs cannot comfortably operate this portrait geometry in real-user testing, fall back to a documented **one-thumb per-person gesture layout** or coach rotation; do not silently make a control unreachably small.
- **Landscape:** P1 lives in lower left island, P2 in lower right island. Place move pad outward, fire/jump inward; preserve at least a **420×280px** central clear corridor at 844×390. Pointer owner is determined on touch-down (no crossing reassignment). Hold/drag must survive viewport-edge pressure; cancel on rotate/blur/pause; require no keyboard.
- **Fold:** independent two-hand zones in bottom corners, with **>=54px action targets**, padded 14px from active edge; spare central width for co-op spectacle. Adjust for live fold posture without guessing whether opened-screen CSS viewport is portrait or landscape.
- **Desktop:** P1 WASD move, Space jump, F fire; P2 arrows move, Enter jump, Right Shift fire are **visual hint proposals only**. Final bindings belong to the input worker and should align with established keyboard controls. Do not commandeer browser shortcuts. Visible focus/keyboard instructions must be accessible from pause.

**Touch-visual treatment:** nearly invisible controls when idle (18–25% opacity); brighter on active hold (55–70%); flat tinted shape plus 2px outline, no huge photorealistic thumbsticks. Controls must not look like gray web forms or obscure floors. Touch response should appear within one rendered frame; held fire/aim visually obvious. Match player color accents but also label **1 / 2**.

**Adaptive camera and HUD specifics:** during calm travel, maintain **>=60% viewport area visibly devoted to level content** (not fixed opaque UI); in the 390×780 portrait the top HUD aims for **<=44px high**, and the bottom controls are transparent overlays, not a giant solid black footer. In short landscape, HUD height **<=36px**, no permanent game title, no secondary status/hint bar. For Fold and desktop, use extra width to show simultaneous player spacing and authored scenery rather than enlarge menus.

## 10. Legibility, accessibility, responsiveness

- Render numerical HUD items at **>=12 CSS px** on phones and contrast **>=4.5:1** for essential small text where feasible. Critical commands cannot be icon-only without accessible text in pause/help. The pause hit area is at least **44×44 CSS px** (even if its drawn icon is tiny).
- Pair health/attention cues with shapes and small directional arrows; player tints cannot carry gameplay state alone. Place temporary shout labels / damage numerals in a designated high-contrast zone no more than ~0.6s.
- Discrete “jump now,” hazard windup, landing state, and teammate down indicator remain readable when sound is muted, haptics unavailable, and reduced motion enabled.
- On resize/orientation transition, preserve physical world positions, input ownership or cancel cleanly, and hero proportions; remeasure safe areas and recenter camera without a one-frame stretched canvas. During pause never leave a held trigger active.
- Texture photographs and clean edge anti-aliasing are an intentional exception to nearest-neighbor pixel rendering. **Pixelate bodies and environment; do not pixelate facial recognition away.** No stretching of portrait images, no cut-out edge that looks like a sticker, no mismatched mixed 3D/vector stock icons.

## 11. Offline asset and runtime-performance specification

This section specifies **future production targets**, not files committed by BF-01:

| Category | Proposed compressed payload ceiling | Technique |
| --- | ---: | --- |
| Terrain/material atlases | 550 KB | indexed/repeated material motifs, lossless WebP/PNG for hard pixel edges |
| Hero bodies, guns, bosses/enemies | 800 KB | shared palette sprite strips, trim transparent padding |
| Background/parallax set | 650 KB | 3–5 reusable painted layers, WebP tuned to edge quality |
| FX, UI glyphs, helicopter/extraction | 350 KB | procedural shapes + small atlas |
| Extra portrait derivatives / masks | 400 KB | reuse existing local heads where possible; avoid duplicating source photos |
| **Total incremental compressed pack** | **<=2.75 MB target**, **4 MB hard review ceiling** | track actual build bytes; don't include originals twice |

A decoded 1024×1024 RGBA atlas occupies ~4MB even if WebP is tiny; constrain **active decoded new art to ~24MB** on lower-end phones, and **offscreen/cache canvases to ~12MB** additional. This is a *starting QA budget*, not a measured current-game memory footprint. Avoid duplicating the game's already-large embedded portraits. Stage only assets used in current biome and nearby transitions; do not decode every boss/background in a single scene at once.

**Drawing strategy:** one-time decode; normal-size portrait cutout cache by (portrait ID, mood, variant/scale); prerender static background chunks and detail atlases; cache light blooms/blur and pre-lit muzzle cores; use object pools / typed arrays for particles; frustum-cull props and projectiles with an extra 1-tile margin; atlas draw calls instead of per-frame gradients/paths; repaint only changing layers where practical. On `devicePixelRatio>2`, cap internal rendering DPR at a tested **1.5–2** while keeping UI CSS geometry native; test sharpness to avoid blurry faces. Don't cache at every possible zoom scale. Rebuild only invalidated cache on resize/biome transition, and dispose caches after leaving the minigame.

**Performance gates for future implementation:** target 60fps on current Fold/phone under ordinary load, median frame **<=16.7ms**, 95th percentile **<=25ms**, and **no >100ms input-to-feedback stall** during a five-explosion stress capture. In a documented low-performance mode, hold visually consistent **>=30fps** and reduce smoke/parallax first, *not* hero head size or collision telegraphs. Verify on a real Samsung foldable plus midrange Android, not just a desktop emulator. Full game must start and run **airplane-mode offline**, with no externally loaded font/sprite/audio.

## 12. Visual rejection gates and scored review

**Hard REJECT even if test suite is green:**
1. Either head is <28 CSS px in active portrait play, faces are unrecognizable at 100% screenshot, missing, or replaced by generic soldiers when supplied local portraits exist.
2. Any photographed face is visibly stretched, horizontally mirrored, surrounded by a white/black rectangular cutout, or floats unconnected above the body.
3. Art looks like thin vector icons/flat emoji, unmodulated boxes, or stock sprites; broken pixel clustering or mixed rendering scale dominates.
4. A camera/viewport creates visible black letterbox strips **>4 CSS px** on any tested display (safe-area and physical cutout exclusion exempt).
5. Essential platform tops / threat paths disappear behind an opaque HUD/control panel or background fog; both players cannot be tracked in the standard co-op shot.
6. Empty repeated single-color scenery occupies **>45% of the *playable* visible world** in a calm traversal shot without an intentional vista focal point.
7. UI controls require <44px effective tap targets, overlap unsafe cutouts/hinge, drop an active finger on crossing a zone, or permanently block the aim corridor.
8. Effects cover a character for >150ms continuously, obscure boss telegraphs, strobe under reduced motion, or break 30fps minimum on the target low-performance test.
9. A copied/recolored proprietary sprite/map/graphic/music is used, or an unlicensed external image is required at runtime.
10. The screenshot visibly differs in head size, material style, or HUD spacing between portrait/landscape because of nonuniform stretching.

**Scored visual rubric (100 total):**

| Category | Max | Measurable review evidence |
| --- | ---: | --- |
| Heroes / photo-pixel integration | 20 | Both identifiable at 100% scale; head/body contact and mood rigs in at least 3 motion states |
| Terrain & authored scene richness | 20 | 3 visible depth layers, material distinction, no sparse/repeated empty vistas |
| Combat feedback / boss / extraction | 15 | Frame captures show anticipations, 1-hit chain, one coherent cinematic payoff |
| UX and legible controls | 20 | Safe-inset capture; both hands usable; >=44px targets; clear platform/hazard zone |
| Responsive composition | 10 | All four viewport types full bleed, no face shrink/stretch or letterboxing |
| Performance & offline fitness | 10 | Measured fps/frame times, cache/bytes summary, airplane mode |
| Originality / cohesion | 5 | Consistent custom silhouettes, no lifted/stereotyped stock visual language |
| **Total** | **100** | **>=90 overall, no hard REJECT, PM approval required** |

**Review process:** two independent reviewers score a still and a 10s moving clip; record scores and exact failures per device. A 90+ average does not waive any hard rejection. Mark each check **PASS / FAIL / NOT YET TESTED**; never turn an unimplemented design description into an alleged screenshot or performance result.

## 13. Staged screenshot storyboard and test matrix

Capture actual screenshots **only after art and engine implementation exists**. This design-only BF-01 assignment **does not claim screenshots were taken**. Provide separate **screenshots with controls visible and hidden**, native CSS viewport dimensions displayed in capture metadata, screenshot timestamps, and actual measured inset values.

| Stage | 390×780 portrait | 844×390 landscape | 840×700 Fold | 1100×700 desktop |
| --- | --- | --- | --- | --- |
| **A. Still / quiet** | two recognizable heads walking; platform lip, sky, foliage in full-height composition | both heroes separated with extra vista in middle | canopy and structure detail across wider world | layering and clean full-screen camera |
| **B. Combat / peak FX** | two players + incoming enemy + muzzle & destructible panel | stress burst, both touch islands visible | both heads readable despite smoke and boss light | independent aim lines and screenshot particle count |
| **C. Boss / windup** | boss telegraph and both faces visible without HUD collision | all claws and hazard zone in view; no cramped letterbox | core weak spot and extraction path distinct | original form readable at full scene width |
| **D. Extraction / payoff** | tether target visible above controls, both character faces readable | craft approach clear, top HUD not obstructing blades | wind/parallax + sling cinematic | final vista composed without empty stretch |
| **E. Safety / adverse** | notch/navigation inset, pause & reduced motion, 4 simultaneous touch points | rotated mid-hold, browser bars visible, two players continue | open/close/fold resize / possible occlusion exclusion | keyboard focus, viewport resize, help access |

**Screenshots to stage for each target**: (1) full viewport JPEG/PNG without editor scaling, (2) annotated keep-clear/HUD/control bounds, (3) 100% crop of both heads and terrain lip, (4) 10s live capture for movement, recoil and frame time, (5) explicit checklist pass/fail. For Android, also take one **real-device Samsung browser** capture in fullscreen and one with browser chrome still present: the experience must not depend on fullscreen being granted. Record whether viewport 840×700 was simulated or actually measured on the Fold; it is a test reference, not a guarantee of device dimensions.

## 14. Hand-off to art / input / engine / PM workers

1. Art owner: deliver **original style frame**, coordinated palette, hero front/back/aim rig prototypes, one calm jungle screen, impact sequence, Canopy Harvester boss silhouette, and Mothwing Liftern extraction storyboard; preserve existing source portraits unchanged.
2. Input/UX owner: validate exact touch geometry on **two human testers sharing one phone**, safe-inset behavior, pause/resume/rotation ownership, camera framing, and scoped game-only chrome. Bind actual control keys based on the established engine contract rather than this proposal.
3. Engine/performance owner: preserve terrain IDs 0..5 and every existing integration contract, build the caches and responsive draws, measure compressed bytes/decoded memory/frame times, and keep the game offline.
4. PM: collect A–E screenshot evidence and scored rubric across all four reference viewports, reject any hard gate, approve style before mass sprite production, and integrate **only through separately authorized feature work**. BF-01 makes no production, release, TESTver, parent, or main change.

**Known open decisions:** final combat/gameplay controls and whether portrait needs a one-thumb fallback; exact level/camera world scale; availability/consistency of player portrait moods and offline head masks; browser-exposed fold obstruction geometry; real-device performance tradeoffs. These require source owners/phone review and are not silently decided here.
