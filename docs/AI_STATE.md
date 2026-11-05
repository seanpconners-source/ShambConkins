# AI state (keep short; update after meaningful work)

DRIVE ART Nov 5 (same branch, pushed to TESTver too): Arcade sets (background/logo/icon) for Hole.it `paddys-hole`, `sundown-showdown`, `battleship-fog`, `office-dots-boxes` imported (keyart 1600 q80, logos trimmed ≤1100 q88, tiles 512, originals q94; KEY_BOX = main subject, no faces in these 4); backgrounds NOT locked yet: picker = https://claude.ai/artifact/N1zQ42EPkUqJf8AzpmdmPT (the account this session runs on owns only that one; DhpZSVr9... is the other account's), apply only these 4 slots from its dump (it also holds old locks). Baseball: batter-p1/p2 + derby-logo imported (assets/baseball); stance frames put the bat through the face circle (hidden behind the face): ask for a redraw. Not fetched (small, would come inline): cap-p1/p2, catcher-p1/p2, ball, fielder-p1: ask for chat attachments. Item 'Generated-Originals' zips = originals of items already in (redundant). v43-gons-fishing-rod imported from a chat attachment (304 of 633).
SOTN SPRITE KIT (Nov 5, branch ccr-c67cc053-8lst4b, unreleased; owner: "generate sprites for Symphony of the Night... templates and a guide for GPT... sprites for the level stage as well"): src/data/sotnSprites.js = SHEETS (hero-p1/p2 128x144 headless + face `headRows` (somersault/fall turn the face), zombie, bloody, warg, skeleton, bat, merman, armor, death, dracula, demon, candelabra/lantern/torch, fireball/inferno/holy-flame/fire-wave) + PICTURES (swords sized by blade length 'grip', items, skies/moon/castle-far/forest strips/fog, *-back room walls (follow .15), *-ground floor tiles (2-unit columns follow slopes, lower half repeats), balcony, stepping-stone, crack-wall, bars, water, gate (transparent doorway) + portcullis, props) at S=.5 units/px; assets/sotn/<name> → sotn:<name> (build.mjs). sotnArt.js: drawHero sprite path (heroFrame; game draws the blade from bladePose so trail/hitbox match, no sheathed sword), foeFrame, Death (swingK 7th arg), Dracula (cast by open), demon rows, pickups/shots/holy flame/candles/throne/statue/pillar/banner pictures; sotn.js: backgrounds, floors, platforms, blocks, water, decor, title castle. Templates: node tools/sotn-templates.mjs → docs/sotn-sprites/templates (grid, anchor, face circle, sword-hand ring+line, demon head box, faint pose guide = our vector frame); `--standin <dir>` = our vector art in every slot: with all 56 in, tests/sotn.mjs + sotn-combo pass and screenshots match the vector game. Brief docs/sotn-sprites/GPT-SPRITE-BRIEF.md (original designs only, no copies of Konami sprites/logos; no logo slot), README there, START-HERE row. No owner art yet.
v0.85.1 RELEASED (Nov 5, owner: "Check for new images. Then release to main"): the Arcade swipe fix (M25, below). Drive had no loose new pictures: only 'Generated-Originals-01..08-of-08.zip' (11-24 MB each) in the Batch 04 folder (1l7UL0H305TJxcP_xIzdCV0Lm82qYI3Tm), over the connector's 10 MB download limit; owner asked to unzip them on his side (or upload to GitHub art-inbox). Not imported.
ARCADE SWIPE SMOOTH (M25, Nov 5, after v0.85.0; owner: 'swiping between games is really choppy', video on Drive too big for the connector (10.7 MB > 10 MB), reproduced instead): at release the page froze 100-350 ms at 4x CPU (drawFill drew the full 1600 px <img> into the 32 px fill canvas = synchronous main-thread decode; focusTile did everything at once) and the text jumped without sliding out. Now (arcadeConsole.js): fill = fetch → createImageBitmap(resize 32) off the main thread, cached per URL (`fills`, also warmed with the ±1 neighbours); `prepSwipe` (one frame after the drag starts) puts the next game's picture in the hidden key slot (decoded, `placeKey(img,false)` = no shade change; `applyShade` later) and builds its text off-page (`buildInfo`); the drag moves the FRONT slot (`translate`, fades to ≥.78) over the prepared one, which is fully shown UNDERNEATH (z-index: .arc-key-front 1, .arc-key-leaving 2 while a swiped-away slot fades), so the gap reveals the next picture (owner's 2nd clip of v0.85.0, Fold 1200x1080 recording: a solid wash-coloured block showed in the gap, the text vanished for 2-3 frames, then picture and text popped in separately); release = `swapKeyArt(...,{pre,dir,W})` (old slot drifts on + fades, `keyOut`) + `swipeInfo` (Web Animations: old text out at finger speed from the drag's dx, new text in from the other side; no style read-back); tile highlight/row scroll/record chip/warming + the --arc-h wash and the text shade wait 420 ms (`rest()` in focusTile; each is a full-screen repaint). No page-wide `arc-swiping` class (first move restyled everything): user-select:none always on .arcade-console, will-change inline on info/hero during a drag; width cached at pointerdown. Tests: tests/arcade-swipe-smooth.mjs (frame gaps + text motion + next picture under the finger; VIEW=; 0 frames >50 ms at 390x780/752x835/844x390/1100x700, v0.85.0 fails it), arcade-layers.mjs SWIPE=1 (13 screens, same as taps), arcade-swipe/console/perf pass. Not yet seen on the owner's phone.
v0.85.0 RELEASED (Nov 5, owner: "Release to main"): casino G13 (front kit, roulette rebuilt, every table), casino sound rewrite, arcade flicker fix, baseball Griffey controls (paragraphs below). test:core + games.mjs via SHAMB_URL on a --pwa build before release.
CASINO SOUND (Nov 5, owner: 'static sound in the background the whole time... not good sounds'): vegasTable tableSound rewritten (same API): no ambience bed (ambience() is a no-op; crowd() = bells), music = FM electric piano + plucked upright bass, 16-bar progression at 84 bpm swung, through a lowpass and a generated-impulse convolver room, no noise brushes; sfx = grains/bells (chip(), card swish+land, flip, riffle, whir = rolling pulses slowing + fret bounces, win bells (+coin shower when big), lose = two soft notes, tap tick). Levels measured by recording (scratch sndmeasure/sndrecord: page + MediaRecorder): music alone −28 dB, effect peaks −8 dB (bus 1.5, mus .2); old idle noise bed flatness .32 → silence. profile.settings.casinoMusic (whitelisted) + MUSIC/SOUNDS buttons on the ? sheet (casinoFront front:music/front:sound). Sample: local-test-reports/casino-table-sound.mp3 (gitignored). Not heard by ears.
CASINO G13 (Nov 5, owner: casino 'not done at all': no guidance, unclear game/people/turns, roulette terrible; ROADMAP G13): engines/casinoFront.js `createFront(G,spec)` = intro card (theme, title, people cards: dealer/regulars/players, goal, 3 steps, TAKE A SEAT / RULES), `phase(text,sub,{p})` banner + drawPhase, first-time coach tour (spec.coach steps {title,text,rect,done,when}; seen in profile.settings.casinoTips[key], validated in profile.js), ? rules sheet (spec.rules), summary card (start → end, best win via F.note, dealer verdict), topBar; tables call F.act first, F.draw last, F.bot for front-* modes (st.ui modes front-intro/front-summary, local only, never sent). ROULETTE rebuilt = engines/rouletteGame.js (engine key roulette; old vegasRoulette.js unused): board model along 0..14 × across 0..5 drawn upright (tall) or table-style (wide, zero left), betAt(a,c) with EDGE .24 → keys of casinoRules rCover/rPays/rReturn/rLabel/rColor (n/s/t/st/c/f4/sl/col/doz/even-money), press preview (covered numbers lit + banner names the bet/pays), chipAt positions, bar chips + UNDO/CLEAR/REBET/×2/DONE|SPIN + CASH OUT, regulars bet from the seed (own colours), pass&play sequential, online Promise.all both asks ({bets}|{leave}), CPU cpuPicks, wheel cache + spin (ballAt locks into the pocket at k .9), big-wheel overlay, pays/sweep/dolly, history (18 seeded earlier + tonight, HOT). s.debug.screenOf/betAt. Tests: casino.mjs roulette section (intro, board reads, undo, ×2, hand-over) + bots 3 sizes + vs CPU; online-native roulette ± lag OK. vegasGame.js: G.useFront(spec) (intro in G.run, summary in G.end, phase banner drawn at the top of panelFrame, front ids before G.act, felt blocked while an overlay is up, Enter on front cards, bots answer front-* modes, ? in G.hud via G._q); vegasTable tableLayout tall panelH +44 for the banner. Baccarat (sides/chips/deal tour, squeeze + result banners) and poker (bet/draw tour, ready/ante/bet/draw/showdown banners; pass and play never names the hidden hand) use it; blackjack has its own adapter (Gf over its locals, F.drawPhase at the panel top, L.coachChips/Deal/Play, ? next to HUD). Tests: casino.mjs (intro on every table) + blackjack.mjs tap through the intro/summary; all pass; online-native blackjack/baccarat/poker/roulette ± lag OK.
ARCADE FLICKER (Nov 5, owner's Fold screen recording: whole screen blank 2-3 frames when tapping/swiping fast; frames + YAVG dips via ffmpeg signalstats): GPU memory exhaustion from stacked layers, not the fades. arcadeConsole.js: swapKeyArt = exactly two `.arc-keyart` slots (`.arc-key-front` opacity 1, other 0, .22 s opacity transition in theme.css end), new picture into the hidden slot, decode, placeKey, swap, old slot emptied after 260 ms, a tap mid-fade finishes it; keyfill = 32 px canvas (`drawFill`, darkened) instead of CSS blur(26px) on a 112% copy; no arc-kenburns; hero art swapLayer = decode first, opacity-only `.arc-fade-in/out`, old removed; text = `swapInfo` (built off DOM, imgs decoded ≤300 ms, replaced in one frame, no arc-info-in fade from 0; swipe = transform glide only); --arc-h transition removed; warm decode only ±1. Tests: tests/arcade-perf.mjs (CDP trace, CPU 4x: style 351→54 ms/move, raster 292→145, BREAKDOWN=1 per element), tests/arcade-layers.mjs (LayerTree peak while tapping every GAP ms: old 21-24 screens growing with speed, new ~13.6 flat; fails over MAX_SCREENS, default 16), screencast brightness check (no blank frames). Not yet seen on the owner's phone.
BASEBALL GRIFFEY CONTROLS (Nov 5, after v0.84.0, owner: "gameplay totally sucks... batter should move around the batter's box like the real game, the bat looks ridiculous"): griffeyBall st.bx {x,y,plane mid|hi|lo,bunt} (x = toward the plate, sweetU = -.2+1.05x; y = up in the box: meets the ball .035 s earlier and before .17 of the break), touches by roleAt (both local: top 45% pitcher, bottom batter; else the whole screen): batter left half drag = move, right half = swing on touch-down (SWING_LAG .1 s to contact), flick up/down sets plane until contact, BUNT button (judge: contact when |du|<.6, slow roller); pitcher drag = st.rubber before (plan target u = rubber*.55), pick pitch = throw at once, drag in flight = aftertouch st.pitch.steer capped per kind (STEER), locks at LOCK .72 (lockLater sends {sl:[pn,u,v]}), streamed {sa}; batter phone waits for sl before judge; batter box streamed {bx}. CPU batter reads finalPlan at flight .55 (batterWindow). Rules retuned (cpuPitch edges, cpuSwing patience/timing, foul q<.46, wider spray): sim per pitch take 43 / miss 11 / foul 16 / in play 30 / HR 1.4%. New bat (griffeyArt drawBat, foreshortened mid-swing). tests/baseball.mjs drives rubber/pitch/steer/move/swing.
v0.84.0 RELEASED (Nov 5, owner: "make all necessary sprite sheets... check for new sprites on drive. Release to main"): casino G1 + baseball D4 + no-zoom/swipe + the items below. BASEBALL SPRITE KIT: src/data/baseballSprites.js SHEETS (batter/pitcher/fielder/catcher -p1 red, -p2 blue; umpire), PICTURES (ball, helmet-p1|2, cap-p1|2, stadium, wall, logo, derby-logo); assets/baseball/<name> → build → baseball:<name>; griffeyArt drawSprite/faceAt/ball/logo (each falls back to the drawn art; `tall` = feet-to-crown px scaled to the drawn height, face in `head` circle, helmet/cap picture over it); engine passes pose progress k (pitcher windup/throw, fielder throw `ball.by`), fielders run/face from position change (st.fmove), catcher catch / umpire call flags, derby banner logo. Templates: node tools/baseball-templates.mjs → docs/baseball-sprites/templates (+@2x); brief docs/baseball-sprites/GPT-SPRITE-BRIEF.md; START-HERE row. Checked with the templates dropped in as stand-ins (screenshots), then removed. DRIVE (Nov 5): 'Transparent Items — Batch 05' (1S5QBz8_4NMAC1LzI_loTbHRMxuSopQcZ, 40) + 40 batch 04 files not imported before → 79 items (303 of 633 have art); v43-gons-fishing-rod (33 KB) not fetched: too small (comes inline), ask for a chat attachment. Sundown boss.png from 'Sundown Showdown — Sprites' imported (real art); explosion.png (17.8 KB) and muzzle.png (710 B) there are also the owner's but too small to fetch: ask for attachments. BUILD: --pwa now writes item/location drop-ins as a/ files too (inlined they pushed index.html to 26.8 MB > Cloudflare 25 MiB; now 9.1 MB).
BASEBALL D4 (Nov 4, same branch; owner: innings 1/3/9 Arcade, board 1; roster + Major League cast; Bat & Field = real game, Batting Cage = Derby): engine keys baseballfield + baseball → engines/griffeyBall.js (mode from engine/id; old baseballField.js/homeRunDerby.js unused). Rules/physics engines/baseballRules.js (feet/secs, home (0,0), y to CF; BASES, POSITIONS P C 1B 2B SS 3B LF CF RF, fenceAt 330+70cos2θ, PITCHES + PITCH_SLOW 2.35, pitchPlan/pitchAt (late break), contact(plan,dt,cu,cv,bat) → miss/foul/fair {mph,phi,theta} (WINDOW .14, early dt<0 = pull = theta<0 = left field, q<.32 foul tip, bat.boost for the Derby), flight(hit) = 60 Hz samples with drag/bounces/roll/fence (hr, wall, landed, foul), ballAt, intercept (reaction .45 s, air flag), throwTime, tally/walk, ratings(id,over), cpuPitch/cpuSwing (breaking balls fool it, change-ups get it early)). Art engines/griffeyArt.js (battingBG cached, player/batter/catcherUmp, fieldCam/drawField/ballShadow, scoreboard, ticker, button, bigText). Flow: plateAppearance → onePitch (pitcher: local st.ui mode 'pitch' → pick + tap zone | cpu | remote recv('pt')) → swing phase (local: hold = aim with the cursor 80 px above the finger, release = doSwing; cpu: scheduled; remote recv('sw')) → judge; 'hit' → runPlay: makePlay(f,auth) sim on the fielding side (chaser by intercept, covers, catch/pickup, auto-throw after 2.2 s for a human or bestThrow for CPU, throwReq from base buttons, runners with AI extra bases and GO/BACK st.runCmd, force outs on throws or stepping on the base, third-out force wipes runs, 20 s cap) → summary {outs,runs,bases,kind,text}; online the fielding phone streams {fs} 15 Hz and sends {pl}, batting phone views (viewState) and sends {rn}. Innings loop with extras to innings+2, walk-off, no bottom half when home leads. Derby: 10 outs each vs BP pitches (online: each phone its own, {dfin}). data/majorLeague.js: 9 ML (1989) characters (ml-*), ML_RATINGS, DOYLE lines, TEAM_NAMES; contentPolicy adds them. solo kinds both 'cpu', both in NET_NATIVE. st.log/st.plog = play/pitch logs (tests). Tests: tests/baseball.mjs (rules + real taps + bots at 3 sizes + vs CPU + Derby). Bot-game spread ~29 outs / 11 hits per 40 balls in play. Not on a real phone; sounds not heard.
CASINO ROUND 2 (Nov 4, same branch; owner approved the blackjack screenshots, then: "continue with the rest of the casino games"): engine keys baccarat/poker/roulette → engines/vegasBaccarat.js, vegasPoker.js, vegasRoulette.js (old casinoBaccarat/casinoPoker/casinoRoulette/baccarat.js unused; casinoTable.js still used by Uno's casinoTap). Shared scaffold engines/vegasGame.js `createVegas(s,{seatsUsed,maxRegulars,themeId})` = canvas+fullBleed, theme/dealer/regulars/seats (players seats 1/3), `ask(p,mode,opts,fallback)` (local st.ui / CPU opts.cpu() / online net.next(); local answers net.send), W8/STOP, banners (fit to width), dealer/seat speech+moods, panelFrame helpers (text/small/smallWrap/buttons/chips/wait), drawSeat, flights, hud, input (hits → G.act, else onDown/onDrag/onUp/onTap/onSwipe, G.key), bots (st.auto / s.debug.bot → G.bot(u); generic 'bet' leave at st.leaveAt unless opts.noLeave), G.end (dealer unlock + finish), G.run. Pure rules engines/casinoRules.js (bacTotal/bankerDraws, pokerRank/compareRank/handName/drawPlan/handStrength, WHEEL/RED/betReturn/betLabel). Baccarat: Bond theme fixed, 8-deck shoe, 10 coups, PLAYER/BANKER boxes (L.box), squeeze mode (drag up = peel, {sq}), bead road; msgs {bet,side}|{leave},{sq}. Poker: ANTE 10, limits 20/40, CAP 4, HANDS 8, button rotates, regulars' `think` on G.rand (shared), side pots by contribution levels, rail = big hand of the chooser (G.shared() → face down until SHOW, st.peek), msgs {in}|{leave},{a:f|c|r},{d:[idx]}. Roulette: own layout (portrait: wheel top, vertical layout 3 cols + dozens + outside; wide: wheel left, horizontal layout), cached felt/wheel, ball path in wheelState (b0→bEnd laps, drop .55-.8, rides the pocket), player chip colours OWN, msgs {bets:[[key,amt]]}|{leave}, 10 spins, MIN 10 MAX 500. Kit: button tone 'blue', sounds whir/clack. Tests: tests/casino.mjs (rules, real taps per table, all 3 to the result at 3 sizes, vs CPU + dealer unlock), games.mjs fuzz 4/4 clean, online-native all four with and without LAG=80-150. Not on a real phone.
NO ZOOM + SWIPE FLASH (Nov 4, same branch, owner): src/noZoom.js `installNoZoom()` (app.js boot): `*{touch-action:pan-x pan-y}` (class rules keep their own), 2-finger touchmove preventDefault, iOS gesture* preventDefault, ctrl+wheel preventDefault; viewport meta maximum-scale=1,user-scalable=no. Board pinch/wheel (pointer events on #map-root) still zooms the board. Checked with raw CDP two-finger touches (Input.synthesizePinchGesture does nothing headless): plain page → scale 5, title/Arcade/blackjack/trivia → 1, board zoom 1.2→3.2. Arcade swipe: on commit the picture offset moves from the box onto the old layers (`translate`, so their CSS transform animations still run) instead of snapping back, and `swipeInfo` slides the old text out, decodes the new info's images off-screen, then slides it in from the other side (infoRun guards fast swipes); taps/keys keep the old path. Screencast frames: no blank or snap-back frame. arcade-swipe + arcade-console tests pass.
CASINO G1 (Nov 4, branch ccr-1cca0887-jsbltm, unreleased; owner picked: drawn Vegas table, themed dealer + regulars + dealer unlock F10, blackjack first then the other three): BLACKJACK rebuilt = engines/vegasBlackjack.js (engine key `blackjack` now maps to it in engines/index.js; old casinoBlackjack.js unused) + engines/vegasTable.js (shared kit for the next tables: tableLayout (tall = control strip below, wide W>1.15H = control column right, seats spaced by arc length, `band` for the printed rules), roomLayer/tableLayer (cached), cardImg/backImg (path suits, real pip layouts), chipImg/drawStack/breakdown, drawDealer (headCanvas face), bubble, button, tableSound (sfx + crowd + original lounge jazz)) + engines/blackjackRules.js (total/basic, Node-testable) + data/casinoDealers.js (TABLES per CASINO_THEMES id: dealer, regulars, felt colours, lines; DEALER_CHARACTERS elvis-presley + leslie-chow unlockBy 'dealer', alan-garner normal). Flow: sequential seats from the dealer's left; every choice goes through `ask(p,mode)` (local finger / CPU basic strategy / online net.next(); messages {bet}|{leave},{ins},{a}); seeded shoe/regulars so both phones deal alike. Ends at the cut card, both colored up, or both under $25. Bank ≥1.5x buy-in → s.gameRecruits[p]=[dealer] if canRecruit(...,'dealer'). Unlock kind 'dealer' added to SPECIAL_UNLOCKS + canRecruit gate + tests/unlocks.mjs; gameLauncher `cageReason(id)` grants dealer-only recruits with reason 'dealer', and settleGame now applies in-game recruits for ANY game that sets them (was cage games only, so Sundown's board recruits were dropped too). Tests: tests/blackjack.mjs (served --pwa; 3 sizes, chip taps, felt tap = hit, swipe = stand, shoe to the result, vs CPU + Elvis unlock), games.mjs fuzz clean, online-native GAMES=blackjack with and without LAG=80-150, unlocks, smoke, solo-board TURNS=10. Not on a real phone; sounds not heard; Elvis/Chow faces come from Wikipedia (offline = placeholder head).
SOAK Nov 4 (released in v0.83.3; v0.83.0 overnight, 14 fails: solo-board 9, vault 4, online-board 1) = ONE cause: Pokémon battles on autopilot hung when the move the autopilot picks had no PP ("No PP left" → menu → same move, forever). Since PK1 the first move is often a 10-PP signature move. pkmnBattle playerAction: with an autopilot, an empty move falls through to the next move with PP; cpuBoard cpuMenu picks only moves with PP. Regression test tests/pkmn-autopp.mjs (in test:core + soak). Fixed build: solo-board 30 turns, online-board 24 turns DROP=3, vault x3 clean.
v0.83.3 RELEASED (Nov 4, owner: "add remaining images... then release to main"): soak fix below + items batches 03/04 (214 of 633 items). test:core run before release. v0.83.4: the 9 small ones (friendship-drumstick ... v43-kevin-bb-gun) came as chat attachments and are imported: 223 of 633 items. For small Drive files, ask the owner to attach them in chat.
ITEMS BATCH 03 (Nov 4): 58 GPT pictures from Drive 'Transparent Items — Batch 03' (1ecNHqRmF6pPzx5qtNJJP_pVNst8YSAzX) imported (164 of 633 items, incl. v43-facehugger-egg + v43-bajoran-orb fetched later). Batch 04 (1l7UL0H305TJxcP_xIzdCV0Lm82qYI3Tm) + late batch 03 files: 50 more imported for v0.83.3.
ITEMS BATCH 02 (Nov 4, released as v0.83.2): 81 GPT item pictures from Drive 'Transparent Items — Batch 02' (1vbg8_5jCoFB7R_oo5GNAfFuDtVAHR6gB) → assets/items/<id>.webp (trim, ≤512, q88 m6; originals assets/originals/items/<id>.png); 104 of 633 items have art. Drive files not trashed yet.
v0.83.1 (Nov 4): sundown bullets from the muzzle (`gun` table per row in SHEETS cowboy-p1, measured from the sheets), enemy hitboxes y-20±21, SFX.shot/SFX.blast (westernSfx), boss bullets ~25% slower, music themes via new `music.theme(list)` in createSunsetMusic (title the-magnificent-four, STAGE_SONGS per stage after the Wanted! sting, BOSS_SONGS at the boss; mood() untouched for Hangman). v0.83.0 (Nov 4, owner: "polish Sunset Riders a lot... merge to main when finished", only sundown tests + games.mjs sundown run, not the full suite): SUNDOWN SHOWDOWN REBUILT. Files: src/engines/sundown.js (game: players RUN 84/ACC/coyote/jump buffer/variable jump HOLD_T, slide = down+JUMP (bullet-proof), drop = down+JUMP on a one-way plat; enemies gun/perch/window/door/drop/rush/dyn/cover/sniper(red line)/rider/climb + hazards horse(stampede)/beam(low bridge)/boulder/rollkeg/gunner(gatling wagon lock); trickle spawns keep the street busy; combos ×2-×8; breakable crates/barrels, exploding kegs, shattering windows; bosses gunslinger/engineer/rifleman/general with pattern lists, arenas fit the screen via L.arenaCam / shelves made at spawn), sundown/stages.js (buildStage(n,rand): STAGES town/train/canyon/mission, plats/boxes/bld/ledges/cars/decor/spawns/events/locks), sundown/scenery.js (pixel art into the low-res buffer S=4/3 px per unit = sprite pixels 1:1; cached fronts/shelves/cars/skies/strips; drop-ins override), sundown/controls.js (per-player floating stick + FIRE/JUMP drawn on canvas, keys, gamepads, setBot). Faces/hats/labels/HUD drawn after the buffer at full res (`heads` jobs). Campaign = solo or store.arcade (2P Arcade loops stages); board 2P = one stage from the seed. Owner's GPT sprites imported (cowboys, bandit, knife, dynamite, window, rider, horse, wagon, hats, items, poster, logo); boss.png, explosion.png, muzzle.png and stage art not delivered yet (drawn). Drive downloads: big files come back as saved tool-result files (decode those); small ones inline are in the session .jsonl. tests/sundown.mjs updated (2P Arcade goes on to stage 2; 1P death check on stage 0 via debug.stage(0)). Not felt on a real phone.
v0.82.0 RELEASED (Nov 4, owner: "wrap up all current tasks and release to main", then an overnight soak on the laptop): test:core EXIT 0 + games.mjs via SHAMB_URL on a --pwa build. Contents: one-file split (Q5), songs on first open, Sundown round 2 + balconies + stage-art kit, owner's first sprite props, GPT art kit. ART KIT: docs/art-for-gpt/START-HERE.md (areas, rules, hand back), ITEMS-TODO/PORTRAITS-TODO + docs/arcade-art/PROMPTS.md refreshed by `node tools/gpt-art-todo.mjs`; owner uploads to art-inbox/<area>/ on GitHub (a cloud session can't pull big files from Drive: the connector returns base64 into context). Owner's Sundown sheets (cowboys, bandit, knife, dynamite, window, rider, horse, poster, logo, wagon, hats, items) are on Drive 'Sundown Showdown — Sprites' (1IF38w7xdDSmYV46-jAmOTpi7LQ5XpYs8), NOT imported yet: ask for an art-inbox upload. Drive cleanup: ~90 imported files trashed; the rest = whole 'Needs Review' slot folders the owner deletes by hand (list sent in chat). Drive check routine trig_01V81RWMj8LPdGS8cZ2kBm9k disabled.
v0.81.0 RELEASED (Nov 4, owner: "Yes release"; main = TESTver = e88e6f4): full test:core EXIT 0, games.mjs 159/159 clean via SHAMB_URL on a --pwa build; release-build.yml deployed the Worker (Scores + Lobby) and published. One-file build is now 477 MB (JS string limit ~512 MB): check the size before adding big files. Contents: SUNDOWN SHOWDOWN, FRIENDS, ITEMS, M8, PK1, SCORES, SWIPE, 39 quotes (paragraphs below).
v0.80.8 (Nov 4, owner: "yes release!!"; full npm test: test:core EXIT 0, games.mjs 158/158 clean via SHAMB_URL on a --pwa build: the 455 MB one-file build kills headless Chromium in games.mjs, so run it that way; pkmn-bond-identity test now stubs characterQuotes): ARCADE BACKGROUNDS ON OTHER SCREENS: `mapLock` (arcadeConsole.js) maps the nearest locked picker setting by layout (faces keep share of width + gap above the text; less height eats the room above the faces, then shrinks, floor 55% of width ratio; covered edges kept covered by ≤12% zoom/≤10% nudge); identical on the locked screen itself. `lockedPlace` prefers screens with the same layout (`sideLayout`). Amber's Samsung = 360x780 (matched from her screenshot by text wrap), picker screens `amber-phone`/`amber-phone-land` added, not locked yet. Genre line `.arc-src` now under the logo. UPDATES (owner: Wi-Fi doesn't update, 5G/VPN does): SW_VERSION 6 `sc-get` = page downloads the new release in full before restarting (pill shows %; `updateApp` in pwa.js), `sc-saved` = a slow start's background save offers Restart; Check for updates shows error + seconds; worker streams index.html on a colo miss (tee) and keeps a day-old latest tag if GitHub fails. Network-side cause not proven (DNS/security filter on .work, or HTTP/3); tests/pwa-update.mjs now has a 4 s slow-server case.
SUNDOWN ROUND 2 (Nov 4, v0.82.0; stage kit: `BUILDING_ART` fixed building sizes per stage slot [w px,h px,floors] drawn at SCENE_SCALE, door in the middle, `drawLedgeArt` canyon-rock/canyon-ledge-top, pictures trough/hitching-post/lamp; templates <stage>-building-N from tools/sundown-templates.mjs): src/data/sundownSprites.js SHEETS/PICTURES/scenery (sprite()/headOn() in sundown.js, every sheet falls back to drawn art; row choice cowboyRow/banditRow), build.mjs assets/sundown → sundown:<name>; docs/sundown-sprites/README.md + templates (tools/sundown-templates.mjs). Engine: slide (slideQ/slideT, flick or G/Shift, '/'), freeze hit-stop, L.locks showdowns (startWave, cam cap, goT GO!), kinds cover/rider, crateHit both ways, phase 'bossintro' + L.taunt + e.mad, continuePlayer/contT, endBanner tally, titleScreen. Owner wanted a dead-on Sunset Riders copy with its sprites: declined; sprite slots are for his own original art. Later: owner sent a ripped Konami stage sheet as the 'level layout': declined; built our own instead: town/mission two-storey fronts get walkable one-way balconies (L.plats, BALC 40, `surface(p)`, duck on a balcony drops through, JUMP 250), balcony/door gunmen (kinds 'balcony'/'door', e.appear fade), wagons/barrel stacks (crate kinds wagon/barrel2) + decor (trough/post/lamp). GPT handoff: docs/sundown-sprites/GPT-SPRITE-BRIEF.md (+ @4x templates; owner may send 4x art: downscale with nearest-neighbour).
SONGS ON FIRST OPEN (Q5-3, Nov 4, unreleased): src/pwa.js LATER (key prefix → game ids: bhpin/kgpin/bspin/thps/sunset music + doom:) → sc-files carries `later` (not downloaded at install, still listed so saved ones are kept); GameSession constructor calls wantGameFiles(game.id) → sc-want; Settings row 'offline-songs' → wantAllFiles(). sw.js SW_VERSION 7: grab(n) shares one fetch per file (file() on demand + downloads), download(todo,kind) with kind 'app'|'songs' for the bar. A music key outside LATER still comes at install. tests/pwa-lazy.mjs.
ONE-FILE BUILD (Q5, Nov 4, after v0.81.0): tools/build.mjs writes USER_PORTRAITS data: URIs as <script> parts (PART 32 MB) that fill globalThis.__SC_UP before the game script (userPortraits.js placeholder replaced with `(globalThis.__SC_UP||{})`; marker <!--@@MAIN@@--> in page()), file written with fs.writeSync part by part: no ~512 MB string ceiling. --pwa build unchanged (JSON of a/ names inline).
SUNDOWN SHOWDOWN (H6, Nov 4, unreleased): engines/sundown.js (pack westernPack.js, id sundown-showdown, soloKind levels, noBleed + fullBleed): world units VH 200 / GY 172, view = whole canvas when W/H≥1.25 else a band (k = band/VH) with the touch area below; own pointer handler (first finger in your half = stick: aim 8-way, run past 40 px, duck; tap / second finger / flick up = jump); spawns by camera position from a seeded list; boss = locked character with own art (gameRecruitPool + portraitMoods) → s.gameRecruits; bounty split by e.dmg; music createSunsetMusic mood play/tense, voices sunsetVoice. s.debug: bot, immortal, start(), boss(), win(), state(). tests/sundown.mjs.
ITEMS (F5/F6, Nov 4, unreleased): useBagItem → `itemCutIn(before,{item,message})` (src/itemFx.js; replaces boardFeedback + the result dialog; rows from effectDetails, tone from itemTag; fx 'itemCutIn'/'markHits' → netBoard FX playCutIn/playMarkHits; tap after .45 s or auto ~2.6-4 s). src/boardMarks.js: run.marks [{kind block|toll|coin,node,owner,amount,group,uses}] (run.savedMarks during warps, validMarks in validRun), kinds roadblock/toll/coinRain/magnet in items.js, `passMarks` per step in app.js moveSteps (block = stop), drawn by ui.js `marksSVG`. `ITEM_REWORK` in data/balance.js moves 17 item ids to them. Tests: board-marks.mjs (Node, in test:core), item-fx.mjs (served --pwa), item-audit.mjs.
FRIENDS (N1, Nov 4, unreleased; owner: auto + friend code, pop-up when free, Free/playing/offline): src/friends.js = friend code per install (`sc-friend-code`, 6 chars no 0/O/1/I), list `sc-friends`, lobby WebSocket `/lobby` → Worker DO `Lobby` (wrangler LOBBY, migration lobby-v1) only once `sc-friends-on` (opening Online) or a friend exists; status from store (`statusNow`: game/online/board/free) sent on change, invites queue until `canInterrupt()` (no session/dialog/busy/netBoard, board only on a human's turn), Join → app.js `initFriends({openRoom})` → duel.js `enterRoom(room)`; Room hello/pub carry `code` → `noteMet` auto-friends; list = `friendsPanelHTML` at the top of the Play online dialog (buttons resolve it with 'fr:...', `handleFriendChoice`, dialog reopens); title tile `store.friendsOnline`. `window.ShambConkins.friends()` debug. tests/friends.mjs (wrangler + served --pwa). Live after the Worker deploys.
M8 DIALOGS (Nov 4, unreleased): end of theme.css, scoped to body[data-theme="home"] (#dialog + #game-layer .pass-card; ids needed to beat the 6-:not() generic button rule). Settings On/Off buttons carry aria-pressed (app.js settings(), fullscreen.js onoff) → CSS switches. openDialog({logo}) shows a game's own Arcade logo instead of the property logo; gameLogo/gameTile in assets.js use `setTileFamily` (arcadeConsole passes familyOf; no import back). gameArtHTML prefers the game's tile icon.
PK1 (Nov 4, unreleased): src/pkmn/pkmnSignatures.js = SIG_ROWS (moves, ≤13 cells), SOURCE_MORE (pools merged into SOURCE_SIGS where missing), CHAR_SIGS (id → [signature, second...]); speciesFor gives `sig` (override > CHAR_SIGS > pool > generic) and `sig2` (rest of own list, then the show's pool from its hash), movesAt puts sig2 in the off-type attack's slot. Moves aren't saved (pp by name only), so old saves are fine. Check script idea: names ≤13, every referenced move exists, count characters still on GENERIC_SIGS (6 = deliberate hand-picks).
SCORES (I13, Nov 4, unreleased): cloudflare/worker.js `/scores/<game>` GET top 10 / POST text/plain {name,score,character,v,install} (CORS *, no preflight) → Durable Object `Scores` (SQLite table scores, PK game+name keeps each name's best; ints 0..1e10; 40 posts/h per install id) + wrangler.toml binding SCORES, migration scores-v1. src/scores.js: base() = site or loki-mylo.work (sc-net-host override, ws→http), submitScore (outbox `sc-scores-out` when unreachable, 400/413 dropped), loadTop/cachedTop (`sc-scores` cache, 150 games), flushScores (app.js 8 s after start). gameLauncher settleSolo submits (not kind 'net', not coop, score>0) and toasts a top-10 rank. arcadeConsole: `.arc-record` chip in the hero chips (recordHTML/refreshRecord on focus), `.arc-scores` sheet (openScores/drawScores; faces via portraitURL). Test tests/scoreboard.mjs needs `wrangler@3 dev --local --port 8787` (works in the cloud box) + a served --pwa build. Live only after the Worker deploys (release-build.yml / deploy-worker.yml); before that the old Worker 404s and scores wait in the outbox.
SWIPE (M24, Nov 4, unreleased): arcadeConsole.js pointer handlers (capture) on .arcade-console: sideways drag (>12 px, 1.4x more x than y) moves .arc-info (1x) + key art/hero art (.45x), release past 22% width or a flick (>.5 px/ms, >30 px) → focusTile(i±1); skips `SWIPE_SKIP` (row, pills, strip, search, family/grid pages, inputs); a swipe swallows the following click; theme.css end: console touch-action pan-y, rows pan-x. Headless synthetic scroll gestures never scroll .arc-row (with or without this), so the row's own scroll on phones is untested here. tests/arcade-swipe.mjs.
RESTART (owner, Nov 4): pause card (session.js pass with options.pause) shows ↻ Restart when `session.restart` is set (gameLauncher requestGame: the same args; board = {id,resume:true,returnToRoll}); `restartGame` confirms, disposes, `requestGame({...,restart:true})` skips the Start card. Not online/duel, not board Broforce, not soloTurnRounds sessions. tests/restart.mjs.
HANGMAN AUDIO (same branch, owner: "music appropriate for what's going on", "get rid of the synth yeehaw"): sunsetAudio `createSunsetMusic` = music director: `MOODS` calm/play/tense by song name, `mood(m)` each frame from hangman `musicMood()` (write/handoff calm; play tense when a live cowboy has ≤2 bullets or shared clock ≤20 s), up = switch after .5 s, down = after 8 s calm and ≥15 s of the song, 1.6 s equal-power crossfade on el.volume (iOS cuts), one element per song so a left song resumes; per-mood shuffle bags, Genesis/SNES twins never back to back (`SAME`). SUNSET_GAIN songs were rounded to 0/1 = every Genesis song silent; re-measured. Synth Yeehaw removed (taunt voices). Synth gun/horse SFX remain: no Sunset Riders rips of those yet (ask the owner). tests/hangman-sounds.mjs covers the director; tests/hangman.mjs still has its 2 old failures.
v0.80.7 (Nov 3, owner asked to push to main): PICTURE SPEED. sw.js `file()` looked up every a/ file with `ignoreSearch:true`, which reads every cache entry: 575 ms per picture with a disk-backed cache of 2,600 files vs 0.6 ms exact (measure with a persistent context on a SHORT profile path, an in-memory context hides it, a long Windows path gives ERR_FAILED). Exact match now, SW_VERSION 5. Never use ignoreSearch on sc-assets. Arcade: `warmKeyArt` holds every key art fetched (near the focus decoded), `swapKeyArt` keeps the old picture until the new one is decoded and fades it in on top; has-key + hero art change at that moment. At 4x CPU, tile tap to background shown was 900-1650 ms, now 230-560. warmFaces keeps its images and also runs from requestGame; pass card imgs decoding=sync. TITLE FLICKER: `.ts-tile .ts-cut{transition:transform .25s}` outranked the reel's fade (one-frame cuts); rule added at the end of theme.css. Dice: `focusArcadeGame` shows the game's hero (switches to its category if it has no own tile), never launches. `ONE_TILE` (hangman) = one family tile on every shelf and search; `familyPool` gives its members. SOAK v0.80.2: board-300 = `hasCrossing` re-deals a layout with no possible bridge (1 realm in 30 had none); solo-board stuck = pkitem message on the CPU's turn had no cpuPk (tests/solo-cpu-item.mjs); themed-trivia FAIL = test artefact on a warp board (skipped there); games.mjs hard limit + browser restart + retry after pong-duel's page never loaded (browser wedged, game not at fault, cause unknown). Unexplained: one solo-board `.title-screen` timeout after injected games on a Bond warp board, Home from a warp board works in tests/solo-cpu-item.mjs WARP=1; not reproduced. SUNSET RIDERS (owner's rips, also for later games): engines/sunsetAudio.js createSunsetMusic(paused) (start, sting(wanted|yippie|gameover,then), stop; shuffle bag across games, Math.random so s.random stays in step online) and sunsetVoice; levels in data/sunsetSounds.js (Genesis ~5 dB louder than SNES); assets/music/sunset-*; Hangman wires them through VOICES in its SFX proxy (quiet replays stay mute), tests/hangman-sounds.mjs. +66 MB: the one-file build is now 455 MB, close to the ~512 MB JS string limit, so check the size before adding more big files. Arcade .vgz set unused (no player). female-death only for a character id matching amber (no gender data). tests/hangman.mjs fails the same on v0.80.6 (P1 not hanged, shot clock): older than this work, not looked into. Full npm test not run for this release; not checked on a real phone, songs and voices not heard by ears.
v0.80.6: Background Picker screens = the owner's real Fold 752x835 (+ sideways; ids my-fold-open*, from the picker's Add this screen button, db `devices`) replacing the guessed fold-open 830x920, plus fold-closed/phone/phone-land/tablet/tablet-land/desktop; all 34 key arts locked on all 8 (tools/bg-picker; picker https://claude.ai/artifact/DhpZSVr98T1sEwzjux7AJ9 (old one on the other account: N1zQ42EPkUqJf8AzpmdmPT); RULE: every new/replaced key art goes through it). Picker previews use the game's REAL hero text (measure.mjs captures it per picture/screen) and warn 'Text on faces N%'. src/data/keyPlacements.js KEY_PLACE written by apply.py.
Nov 3 later (unreleased, TESTver): P9 real quotes `src/data/characterQuotes.js` (365 of 725; characterPhrase + Pokémon trainer intro read QUOTES first; write them in small batches: a big block of film quotes got the reply blocked by the content filter); M17 `reelEdge` (ui.js) fades square reel art in a circle (.ts-boxed); M19 anti-flicker: `renderInto` (ui.js showView, not the board) moves already-decoded <img>s into the new screen (only differing attributes touched; floatingHead keeps data-sc-src), `makeGhost`/`revealAfterGhost` = frozen copy of the old screen over a view change until visible pictures decode (≤.4 s, .sc-ghost z 30, no taps), then markEnter(...,soft) sets body[data-soft] → keyframes use opacity var(--enter-op,0) so entrance moves don't fade from black. Measured by CDP screencast brightness: no dips.
v0.80.2 (Nov 3, owner asked to release, UI only, no suite run): Arcade key art FILLS the screen. KEY_BOX = tight boxes round Sean's + Amber's faces (found with OpenCV Haar + checked by eye; Ducks kept unflipped, faces only, owner's pick). placeKey: wide screens pick the bigger of 'right of the text' / 'full width above the text'; scale = min(cover, fit x SPILL 1.3, box ≤ 94% of the screen) so faces may spill a little into the text edge (bias: tall = keep top, wide = keep right) rather than zoom out; `.key-above` skips the side shade; `.arc-keyfill` = blurred cover copy shown only when the picture doesn't reach an edge. Checked by screenshots at 344x882, 390x780, 690x830, 830x690, 844x390, 900x1000, 1000x900.
v0.80.1 (Nov 3, released at the owner's request): KEY_BOX boxes redrawn tight round both faces (check with a contact sheet of the crops); placeKey keeps the box below .arc-top/.arc-pills/.arc-strip/.arc-search and above .arc-info (tall) or right of the info + above the tiles (wide), .92 fit margin; shade follows --key-y0/--key-y1. Scratch check facecheck.mjs measured every key art at 8 sizes: box on screen, no overlap with pills/strip/text/tiles. Item art: GPT drops in the owner's Drive 'Transparent Items — Batch 01' (5 subfolders, file name = item id); 23 imported to assets/items/<id>.webp (512, q88, trimmed), originals assets/originals/items/ (old rum-ham/fight-milk SVGs kept there as -previous). More are coming.
v0.80.0 (Nov 3, released at the owner's request; UI/art only, ran arcade-console.mjs, not the full suite): the Arcade art, key art placement and title-screen fixes described in the v0.79.0 paragraph below.
v0.79.0, later the same night (owner awake and sending art): Broforce shows as SEAN OF A GUN (titles only; ids and internal 'Broforce' source unchanged, `srcLabel` hides it on the hero). KEY ART + LOGOS: `keyArt` falls back to the family's picture; `logoOf`/`titleHTML` (arcadeConsole) use keyart:<id or family>-logo; `KEY_BOX` = must-see box per picture ([x0,y0,x1,y1] fractions; `placeKey` sizes/moves the picture so the box stays on screen beside/above the text, zooming out with faded edges rather than cropping; new key art needs a box, else the middle is kept). Nov 3 later: GPT art from the owner's Drive (ShambConkins Art/Needs Review, folder name = slot) imported for 31 slots (keyart 1600 q80, logos trimmed 1100 q88, tiles 512; originals WebP q94 in assets/originals/keyart, old pinball backglass key art kept there as <id>-previous) + owner's chat uploads (South Park + DOOM backgrounds, Mario Kart + Sean of a Gun icons, DOOM II logo keyart:doom-2-logo + its own background keyart:doom-2 + icon tiles/doom-2; Drive revision files CURRENT-REVISIONS.md checked = same pictures). Skipped: GPT Broforce logo/icon (say BROFORCE), duplicates (bricks/hangman/broforce/mancala art, mancala words), blank smb logo, Office (no slot). Owner is sending more; Drive copies can be trashed once they OK it. Title screen: Arcade tile reel = recent + featured games shuffled per render (`arcadeReel(n,games)`), reels pre-decode their pictures, an incoming picture resets without transition (2-picture reels slid back in reverse), reel imgs will-change; `warmFaces(ids)` (assets.js) preloads the picks' mood pictures + Sean/Amber cut-outs from installHomeReels; pass-card faces load eager. Pro Mancala intro: EXTREME banner fitted to its 1.6x drawn size, words drawn brighter (`putWord` filter + landing flash). Convert art to WebP (1600 wide, logos 1100); originals in assets/originals/keyart. Images the owner attaches to chat are at <session temp>\images\N.webp, named in the message when sent between Claude's replies (sent mid-task they are not saved: ask for a re-send); do not search their folders. Tile icons: assets/tiles/<game or family>.*; intro words: keyart:mancala-word-<tony|hawks|pro|mancala|extreme> (proMancala WORD/putWord, text fallback). Test note: promancala and frank are timing-sensitive, run them on a quiet machine. TILES have `.arc-tile-name` captions (end of theme.css). NEW ENGINES: engines/priceShow.js (engine key partyPrice, id price-bid-off; tests/priceshow.mjs), engines/froggerCrossy.js (engines frogger + crossy; tests/frogger-crossy.mjs), engines/paddysDarts.js (engine darts, solo kind now 'cpu', in NET_NATIVE; tests/darts.mjs). Old partyPrice.js, pubDarts.js and mobile.js crossy are unused.
v0.79.0 (Nov 3 night, owner away; branch `claude/nov3-night`). Soak report fixes: netBoard enterGuest keeps the guest's run OBJECT on a
resync (`nb.mirror`; the launcher's valid() compares it, a swapped object ended the guest's minigame with no report and the host waited for
good; repro `DROPPLAY=1 tests/online-board.mjs`); themed trivia games have soloKind 'cpu' (selectBoardGame could re-roll into one).
ARCADE SHELVES: `CATEGORIES` starts featured/recent/favorites; showCatalog opens the Arcade on 'featured'; ui.js catalogHTML builds shelf lists,
a search looks through everything, `catalogFeed.pool` keeps the dice on all games; `FEATURED_GAMES` in src/data/featuredGames.js (owner's list);
`profile.recent`/`favorites` + `noteRecent`/`toggleFavorite` in profile.js; ☆ `.arc-star` (arcadeConsole starHTML). ONE BROFORCE: pack game id
`broforce` (`worldSelect`, randomEligible:false); the 4 world ids stay (saves, board) with `arcadeAs:'broforce'`, filtered from Arcade lists; engine
`chooseWorld` is DOM over the canvas, phase 'world', online pick = netField event {world} (NOT net.next: netField owns the reader), 30 s auto;
art slots keyart:broforce (backdrop) and keyart:broforce-<world> (cards). A new THEMES entry gets a card by itself. MILLIONAIRE: engine name
`millionaire` (id trivia-hardcore, family 'trivia' via REMAKE_META, still in TRIVIA_THEME_IDS), DOM over a stage canvas, online = both ladders at once
({p},{fin}); tests/millionaire.mjs. STICK DOT: engine `stickdot` = engines/modernStickDot.js (id office-dots-boxes, family 'dots'), rules/CPU/net moves as before
(dotsMove, pickDots, netTurns {o,i}), CUT table = kill cams (rifle/sniper/ac130); tests/stickdot.mjs. Old `dots` in classicBoards unused. NB the engine title table in
gameRegistry (GAMES.find by engine) throws at load if an engine name in it no longer exists: blank page. BATTLESHIP: engines/battleshipCuts.js navalCut (canvas in #game-layer, z 40:
body-level overlays sit BEHIND the game layer); tests/battleship-cuts.mjs. POKEMON: OVERRIDES catwoman-returns, ball.tilt, B.askTeamSwap in pkmnRun battleFlow. C13: coop.sitOut seat
pays nothing in settleGame. puGap shrinks with tier. Paper Route dog `chase`/`gone`. Asteroids U capped 5.2.

v0.78.0 (Nov 3 late, owner asked to release): MENUS ROUND 2. Arcade: `CATEGORIES`/`CAT_IDS`/`categoriesOf`/`inCategory`
(arcadeConsole.js; ui.js catalogHTML filters with inCategory; old ids arcade/strategy/skill/dice aliased), View all
(`.arc-grid-page`, `gridHTML`, data-arc-all/pick), small-phone CSS, `quick` (console Play buttons get data-quick="1" →
app.js arcadeLaunch({quick}) → requestGame skips the Start/Back card for origin arcade without a duel; tests that call
requestGame directly still get the card). Characters (view 'players') + New Game (view 'setup') = src/menuScreens.js
(same ids/actions as before; mode/level cards set hidden #game-mode/#start-level; `players-done` action returns to
New Game when opened from there or online; online guest picks on Characters → sendPick). Collection = src/collection.js
(tiles in .catalog-grid.col-grid so the endless feed still works; detail page client-side; `pick-face` action). Old
setup/catalog CSS is fenced off with :not(.mx-shell)/:not(.col-shell)/:not(.col-grid); generic themed buttons skip
.arcade-console/.mx-shell/.col-shell. Title tiles: `reelHTML`/`installHomeReels` (ui.js), `arcadeReel` (arcadeConsole).
Art: tools/arcade-art-slots.mjs also writes docs/arcade-art/PROMPTS.md + prompts.json; tools/import-arcade-art.py.
Tests updated: player-names, solo-board, online-board, checkpoint, setupshots, arcade-console (view all, categories,
no card).

v0.77.0 (Nov 3, owner: "merge to main" without playtesting first): the console menus + soak test below + 43 characters.
Nov 3 night (branch `ccr-f841e836-ips7j8` from TESTver, merged to TESTver and main): CONSOLE MENUS (owner's look-book
pick, https://claude.ai/artifact/BTqLZbwnPtUwPKz2tGNTNa). `src/arcadeConsole.js` = the Arcade view: ui.js catalogHTML still
builds the list (filters/1P/online/dev/cut) and passes `partsFor(g)` (play button, chips, medals; shared with the old card
render, which the Collection still uses) to `arcadeConsoleHTML`; hero = focused item, tile tap focuses (no rebuild), a
focused family tile or "Choose a version" opens `.arc-fam` (version tiles); `FAMILIES` (30, incl. 'bosses' = beaten +
locked) group only on the All list; hero art = `HERO` map → boss unlockId → character with the same source and own art
→ family hero → game art → icon; drop-in tile art `assets/tiles/<id>.*` → USER_PORTRAITS['tile:<id>'] (build.mjs). Look:
theme.css end ("v0.77 console menus"): `body[data-theme="home"]` palette (navy/white/#4d8dff), fonts "SC Bangers"/"SC Nunito"
(assets/fonts, inlined via @@asset; MIME woff2 added), title screen restyle (tiles show neon cut-outs `tileCut` in ui.js).
Generic themed button rules skip `.arcade-console *`. Tests: `tests/arcade-console.mjs` (4 sizes); vault/boss-ladder/
solo/catalogshots/online.mjs updated to the pills/tiles/hero. SOAK TEST (Q00): `SOAK-TEST.cmd` → `tools/soak.ps1` (node
+ Playwright setup like run-local-tests.ps1, keep-awake) → `tools/soak.mjs` (build --pwa into soak-reports/app, serve on
8123, wrangler@3 on 8787 if it starts, then rounds of arcade-console, route, solo-board, frank, endings, checkpoint,
vault, boss-ladder, bossdiff one random boss/tier, games.mjs one shard of 12 per round, every 3rd round the Node sims,
online-board (random DROP) + online-native (2 random native games, LAG half the time); kills hung test trees; report
soak-reports/LATEST.md + history.jsonl + fails/).
Same night, owner follow-ups: MOTION (M10) at the end of theme.css: `markEnter` in ui.js showView sets body[data-enter=<view>]
for 1.4 s when the view changes (entrance keyframes), `@property --arc-h` makes the wash hue transition, `swapLayer` cross-fades
hero/key-art layers (`--arc-dir`), `.arc-info-in` rises lines, families slide (`arc-fam-in/out`). ART SLOTS: the cut-outs are
placeholders; `assets/keyart/<slot>` (keyart:<id>, full-bleed behind the hero, `.has-key`) + `assets/tiles/<slot>` (tile icon);
`tools/arcade-art-slots.mjs` → assets/tiles/SLOTS.md (186 slots). Pinball keyart = backglass art (900 px).

Nov 3: v0.76.0 released (main 18b88f8; ARCADE_RECRUITS back to true at the owner's request). After it, on the branch/TESTver:
43 new characters `src/data/legendsPack3.js` (N2). Soak loop used overnight (Q0): serve a frozen `build --pwa` copy with
tools/serve-static.mjs, start `npx --yes wrangler@3 dev --local --port 8787` in cloudflare/, then loop with SHAMB_URL set:
`TURNS=30 node tests/solo-board.mjs`, `TURNS=12 DROP=3 node tests/online-board.mjs`, levelflow-ui, frank, endings,
checkpoint, `node tests/games.mjs 8 3`, logging the last lines of each. Nov 3 rounds 1-3: all clean.

Nov 2 night (owner asleep, branch `claude/v0.75.0-release-roadmap-so2z5g` from main v0.75.0, unreleased): K24 partner-down
cutscene `engines/bossCutscene.js` (bossFight `downed()` fires from an hp>0→≤0 transition seen in `update`, so both phones
online; offline the world runs at `cutTimeScale` (.12 → .25 → ramp), camera push-in on the survivor, sad head panel (sad
mood if the character has one, else normal; preloaded via headCanvas), NOOOOOO!!!! + formant `noooVoice`; survivor can't be
hurt meanwhile; revive/parry timing on real time; the 'down' comm line plays after it). K16/K15 `engines/bossPowerups.js`:
pickups `PU` spread/turbo/missile/shield/bomb/heart, spawned by player 1's phone (`spawnPower`, op 'pu'; grabs 'pt'; own
plane judged only), `gunFire`/`stepPower`/`takePower`/`smartBomb` in bossFight, netPack p[12..14] = pw kind/time/shield;
`drawShip` replaces the old hull drawing. K22 `engines/bossMusic.js` drop-in songs (README in assets/music). Tests:
`tests/boss-downcut.mjs`, `tests/boss-powerups.mjs`. A1: retroKit `soloTurnRuns` speed field is `w.soloK` (was `w.speed`,
clashed with freewayChase/atariBreakout). A2 candyLand press(): 'done' = TOO SLOW (no penalty). A5 theme.css cs-float.
A6 holeIt `FIT=1` (physics.js, was .96) + sunk-in rule in sim.js. A7 `turn.cardDone/cardX` in holeIt drawHUD. C3
`ARCADE_RECRUITS=false`/`recruitsOn(origin)` in gameLauncher. B1 triage sheet = artifact
https://claude.ai/artifact/4XLQDBkBkUJcQGvK2ST6w2 (db collection `verdicts`, doc id = game id, bosses `boss--<id>`,
{v:keep|polish|rebuild|cut|null, note, at}); read it with ArtifactData list.
Also: C9 run length removed (startRun turns=999999, co-op not endless), G10 gizzard.js Nest guides + ramp cap, D5 bomber
(`engines/bomberControls.js` floating stick/BOMB button; mobile.js bomber walk/tryMove/seek float x,y, cells for logic,
online pack x,y,f), M7 mockups https://claude.ai/artifact/4h7fazkSTgh1oQxDQdpctE. Cloud box: `cd cloudflare && npx --yes
wrangler@3 dev --local --port 8787` works; online-native takes SHAMB_URL (serve a --pwa build).
Later that night: D6 duels.js pacmaze (`ghostsStep`/`ghostPick` classic AI shared by local + online `ghostStep(j)`, GHOST_STEP .16,
online tick mapping `tickAt/beat/stepAfter`, union-outline walls, ghost eyes, `pacSfx`); E2/E3 `frankFakeout` in app.js resolveEvent
(horror card) + `src/frankFx.js` (netBoard FX.frankReveal); B3 `src/data/cutGames.js` (`isCut` in gameRegistry RANDOM_GAMES, ui
arcade list, gameLauncher warp pick, encounterGames). online-board.mjs also takes SHAMB_URL.
Endings: app.js finishRun → `endingKind(run)` (all cleared horror = 'true', spirit = 'fake'; not coop/mutation/warp) →
`playEnding` (src/endings.js, fx 'ending' → netBoard FX.ending → runEnding on the guest) → finishScreen; `finishRun` exposed on
window.ShambConkins for tests. games.mjs takes SHAMB_URL too. Full `test:core` passed EXIT 0 mid-night (before endings).
v0.76.0 (Nov 3, released at the owner's request): the Nov 2 night work below + Arcade unlocks back ON (ARCADE_RECRUITS=true).
v0.75.0 (Nov 2, owner asked to release it): the boss-fight overhaul below. Fresh sessions: `docs/HANDOFF.md` first.
Owner's master to-do list is `docs/ROADMAP.md` (phases; "continue" = offer options from it, wait for a pick).
Boss work (ROADMAP K section) on branch `claude/boss-fights` (from TESTver, merged to TESTver and main). K1 done:
bossFight.js parry/revive fire on touch DOWN (`press`; they used to wait for the finger to lift, ~260 ms, so the bullet
had already hit), a press with nothing in reach opens a .22 s parry window (`PARRY_WIN`, whiff → .25 s lock), parry
reach 44 (was 34), revive reach 84 (was 62) and staying on the bubble .6 s revives too (`stepAssist`, `revT` ring);
tap-release only fires the SUPER now.
K2 done there: difficulty tiers `BOSS_TIERS` (data/bosses.js: Easy = old fights exactly, Medium, Hard, Extreme; multiply
the K table + boss HP; Hard/Extreme = 4 phases with a FINAL PHASE at 25%, `deck()` remixes one next-phase attack in,
`combo()` = extra light bullet volley (aimed/fan/ring/rain/bounce only, via `FC` = F with lighter k and no poses) on top of
a main attack). Engine reads `s.difficulty`, set by `requestGame({difficulty})`; HUD tag + PHASE x/N; body art gets
phase ≤2. `tests/bossdiff.mjs` now takes DIFF=0,1,2,3 and SHAMB_URL. Boss faces (`A.face`) = Broforce `headCanvas`
cut-out heads (no circle; `A.portrait` hides the bust/brute skin oval), moods via `B.mood/moodUntil`.
K3 done there: `bossTierFor(run,realm)` (bossGate.js): mind 0, body 1, spirit 2, horror 3; warp boss = `run.warp.realm`
(stored on entry; old saves: realm of the main-board return node); else levels cleared. `startBoss` passes it to
`requestGame({difficulty})` and shows it on the intro card. Online: launcher → `hostGame(game,{difficulty})` → 'game'
msg `difficulty` → `boardDuel(...,difficulty)` → duel `start` → hooks.start duel.difficulty → requestGame on both
phones. Checked: board walk Mind/Body/Spirit = Easy/Medium/Hard, rule cases in Node; online not run (no wrangler).
K5-K7 done there: `profile.bossTiers` {bossId: 0..3 highest cleared} (validated in profile.js; a boss beaten before
tiers counts as Easy), written by `recordBossTier` in gameLauncher (settleGame boss win, settleSolo arcade + online-board
guest; `curDifficulty` = tier of the launch); boss character recruit only when origin==='board' (K6). Arcade boss cards:
`arcadeLaunch` → `chooseBossTier` dialog (next tier primary, higher ones locked), medals `.boss-medals`, `.boss-extreme`
gold frame (theme.css end), result text "MEDIUM CLEARED! Hard is now open in Boss Select." Online arcade boss
challenges still Easy (proposeDuel has no tier).
K20/K15 (explosions + phases) there: `engines/bossBoom.js` = fx kinds fb/sm/db/sw/ray/em/hd in bossFight's `fx` list
(`stepBoom`/`drawBoom`, `delay` lays out sequences) + `KO_STYLE` per tier (chain secs/rate, main blast size or whole
screen, shocks, debris, embers, after-blasts, white flash, hold, title KNOCKOUT!/DESTROYED!/ANNIHILATED!!); the boss's
cut-out head tumbles off. Phase start = `phaseBreak`; phases 2+ smoke/burn (`dmgSmokeT`), aura behind the boss and edge
tint per phase, final-phase embers. fx capped at 1100.
K21 (Star Fox talk) there: `engines/bossComms.js` `createComms({blip,headFor})` = queued comm box (zip open, head in a
static screen, typed text 42 cps, square/triangle blip voice per syllable, tap skip), lines in `data/bossTalk.js`.
bossFight: `openerTalk` at fight start (SAME_* if a player IS the boss, RELATED_* if a player's character shares the
boss's `source`, else an opener), `phaseTalk(n)` = boss phaseLines[n] (or pools) + a player reply, picked from s.seed so
both phones match; phase mode waits for it (max 7 s); `chat(kind,i)` event lines (hit/down/revived/parry/super, 8 s
cooldown, quiet unless 'down'); win line on KO, boss gloat on a loss. `s.debug.comms`.
K17-K19 there: bossAttacks.js `ambush` (boss leaves the top, warned lane, bursts up from the bottom or dashes in from a
side with deadR + shots; `F.place` teleports), `bombs` (lobbed `kind:'bomb'` bullets with `ghost:true` = harmless in the
air, `lobBombStep` lands on a warned circle: blast hazard + shrapnel + `F.boom` fireball), `carpet` (swoop + a band of
bombs). `deck()` adds ambush from phase 2 (Medium+: from phase 1), bombs from phase 3 (Medium+: phase 2), carpet in the
last phase. Themed ammo `AMMO` (data/bosses.js) draws plain orbs as an emoji per boss (pink stays pink). Hit flash on the
boss toned down (it washed the boss out). `s.debug.attack(name,params)` forces one attack. Bot hits per full fight
≈ 5.4 / 7.5 / 9.3 / 14.9 by tier.
Testing on the Windows laptop: the 346 MB one-file build hangs headless Chromium; build `--pwa` into the scratchpad,
serve it (tiny node static server) and run tests with SHAMB_URL=http://localhost:8123/.

v0.74.0 (Nov 1): King Gizzard (`gizzardAudio.js`, kgpin-*, 8 songs) and Black Sabbath (`sabbathAudio.js`, bspin-*, 5 songs)
tables got the owner's songs on the same music director as Bucketheadland (sections measured by scratch scripts, mode
roles by song; no guitar SFX sets, they keep synth sounds). Pinball intro waits (<=5 s) for the drop-in backglass to
decode (`imgs.pending` in dropins.js; render draws black meanwhile), then holds it `INTRO_HOLD` 4 s, tap skips. Build
is ~346 MB single file now (songs). Owner hasn't heard the KG/Sabbath songs in the game yet.
v0.73.0 (Nov 1, owner approved by ear; branch `claude/buckethead-sounds` → TESTver → main): Bucketheadland pinball uses the owner's 7 Buckethead songs + MySims "Guitar Rockstar" guitar set
(`assets/music/bhpin-*`, how they were made in that README; originals stay in the owner's Claude Share folder, not the repo).
`pinball/tableAudio.js` (createSongs: HTML-audio playlist + per-role mode songs with start offsets, duck/tilt fades,
`status()`; createGuitar: decoded clips, one lead lick voice by priority, stabs) driven by `tables/bucketheadAudio.js`
(roles/sfx map). pinball.js routes every sound through `sound()`; song roles add 'wait'/'bonus'/'tilt' (synth band = null
as before). Online pinball (all tables, `NET_ENGINES` 'pinball'): balls alternate between the phones, the active phone
streams snapshots, the other watches (see pinball/README); scoreboard for 2P (local too); duel chip hidden (`body.pb-net`).
Tested: pinball.mjs (3 tables, solo), pinball-sim, online-native ×3 tables (with LAG=80-150), a scratch audio check (46/46
clips decode, Jordan/Soothsayer roles seek right, playlist resumes). Real two-phone play untried.
Round 2 (owner listened: SFX far too loud, music jumped calm↔aggressive): songs = music director (sections per song
[from,to,level] in bucketheadAudio.js, measured then evened by what the songs are; game level 1 title/game over, 2 play,
3 mode/multiball/hot streak (`heat` in pinball.js, hysteresis 10/5); crossfades, same-song jumps, resume where left off,
per-song gain trims; watcher follows the player's song `mu`). Owner's 2nd FX set (MTV Music Generator 2) as bhpin-fx-*,
mapped to almost every machine sound; all sound (synth too) through a reverb bus; every volume measured on the bus
(scratch calibrate: big -19, mid -21, normal -23, small -26 dBFS max-50ms-RMS; songs ≈ -17).
Round 3 (owner): solos only for drain/super/game over (in play: generic FX + pick scrapes); songs change only when the
game turns heavy (mode/multiball start: cut to heavy) or calms (8 s later: back to the interrupted song where it was) or
a song ends (next from its start); no hot-streak/heat, no drift switching. `sfxLevel` .7 on the whole bus (-3 dB).
Round 4 (owner): levels = 1 chill (title, wait/bonus, game over), 2 energetic (play), 3 crazy (mode/multiball); sections
re-sorted (a section may list two levels); on a level change the director goes to `mem.left[L]` (song last played at that
level) where it was, else (crazy) a later crazy part of the same song, else choose(); 3→2 waits 8 s.
Round 5 (owner: "too chill", chill kept coming back, silence at ball start): chill only at game over, play = the shred,
crazy = their craziest parts; one pooled audio element per song (`POOL`, kept all session; a switch was a new 4-11 MB
element = seconds of silence on a phone), a same-song jump dips 0.3 s and seeks.
Note: generic duel chip `liveScore` reads `s.score[0]` (wrong seat for native games on seat 2); untouched.

v0.72.1 (Nov 1): v0.72.0's release stopped on Cloudflare's 25 MiB per-file limit (the one 25.3 MB built-in art script);
build.mjs --pwa now writes it as ~8 MB parts (`window.__SC_ARTN` scripts, each concats onto `__SC_ART`; #boot says "(2 of 4)")
and throws if any app file is over 24 MiB. Owner: "merging to main" = release (bump, release build, check the site serves it).
Screen wake lock while the app is visible (`src/wakeLock.js`, re-asked on return/tap). Pro Mancala: no text on the deck
(trick string/banner/"IS THINKING" in `lay.side[p]` = the player's strip (flat) or column (upright); popups weigh deck overlap
x60 and drop if still on it; `s.debug.overlays()` + tests/promancala.mjs fail on any overlap); deck lies flat whenever that
makes it longer (open Fold 900x1000 now flat); fullBleed bg dark for the title, sky/concrete gradient in play (Fold hairlines).
v0.72.0 (Nov 1, never published): the split delivery below released to main, plus a real loading-screen progress: sw.js (v4) streams the
game page and the built-in art script through `counted()` and posts {type:'sc-load',kind:'page'|'art',got,total,done} to
the loading page; index.template.html's #boot shows "Downloading vX · 45%" (MB when the size is unknown). WAIT for the
network before playing the saved copy is 2.5 s. Measured at 4x CPU: title screen 3 s per open (one-file build 9-10 s).
Nov 1 (branch `claude/pwa-split` from TESTver): installed-app updates download only what changed
(docs/PWA_SPLIT_DELIVERY.md, owner-approved, everything downloaded at install). `build.mjs --pwa` = index.html 8.2 MB +
`a/` 2,430 content-hashed files (byte-identical copies; built-in art of art.js/faceArt.js as one `a/<hash>.js` data-URI
script) + main's fixed network-first sw.js (now SW_VERSION 3): the page sends its file list (`APP_FILES` in pwa.js,
'sc-files') and the worker fills the shared `sc-assets` cache with only the missing files (resumes, keeps the newest two
versions' files, byte ranges for audio). One-file build unchanged (byte-identical). Update measured 8.3 MB (was ~200 MB). Hosting: the Worker's static assets
(`[assets]` public/, filled by `tools/worker-assets.sh` from the newest releases' `_pwa.zip`); release-build.yml deploys
the Worker with them before publishing (needs the Cloudflare secrets; release also uploads `index.html`), deploy-worker.yml
rebuilds the set. Worker `/` = release `index.html` when present. Local `wrangler dev` served the static assets right
(no 206 for ranges there: the service worker does ranges); real Cloudflare deploy, real phones and iOS Safari songs on a
first, not-yet-cached visit untested.

Version 0.70.1 (Oct 30): 79 newly pictured characters, additional moods/replacements; portrait files encoded as 480px WebP q88 with originals archived. No game code changes.
Nov 1 (branch `claude/pro-mancala`, from TESTver, unreleased): Mancala overhauled into TONY HAWK'S PRO MANCALA (same id
`greed-island-mancala`, engine name `mancala` → `engines/proMancala.js`; title/source in the engine title table in gameRegistry;
`noBleed`). Rules/CPU/online/hot-seat kept (strategyRules mancalaMove, cpuBoards pickMancala, classicBoards `netTurns`, now
exported); old `mancala()` in classicBoards unused. Owner's design: title sequence every time (Tony… Hawk's… Pro… Mancala…
EXTREME EDITION!!, tap skips, then face-off cards), THPS2-dead-on screen: skateboard-deck board (`proMancalaArt.js`
deckGeometry/makeDeck: 7-ply rings in the routed bowls, stores in the kicktails, grip, bolts; view 'side' = one wheel per
truck under the long edge, 'end' = near truck's two wheels under the tail), glass gems. Board is the focus (owner, Nov 1
round 2): `layout()` fills ~93% of the width when wide (P1 bottom row/right store) and stands it upright when tall (H>1.08W;
deck turned 90°: P1 left column + bottom store, P2 right column + top store; `pitPos` maps deck-local → screen). Skaters
are NOT on screen all the time: `cutTo(p,kind)` = full-screen 90s fisheye camcorder cutaways (`A.fisheye`/`A.vhs`; styles
follow/low/punch/orbit, crash cam on slams with freeze + record scratch, slow-mo special) for store landings, steals (grind
then the victim's slam), bails, specials and ~40% of other moves; tap skips. Spots (Nov 1 round 3): the halfpipe or
a street spot from `proMancalaSpots.js` (handrail down an 8-set, the 8-set, a red parking-lot curb, a kicker; `buildLine`
= timed roll/air/grind/slam parts, `lineState`, `drawSpot`), picked per cut kind (`SPOTS` in proMancala.js), never twice
in a row. Popups are placed where they cover no other text (`textRects`/`pop`, small ones dropped if nowhere is free, big
ones push small ones out). A ⤢ button sits left of Pause/Exit when fullscreen is available (fullBleed's bottom one hidden).
Round 4 (Nov 1): owner's sound set = Dreamcast THPS rip (named files; picker page built by a scratch script into
local-test-reports/, gitignored), installed as `assets/music/thps-sfx-<name>-<n>.wav` (random pick per play, `pickDrop`;
hooks aww/grunt/timeup/total/grind-pipe|curb|board). Songs: 15 THPS2-soundtrack MP3s from the owner as
`thps-mancala-<band>--<song>.mp3` (name shown on Now Playing; one shuffled playlist from the title on, next song when one
ends, kept across games; pauses with the game). Build is ~190 MB with them (+60 MB). Cutaways: the camera centres the
skater's body, random hats (`A.hatFor`: backwards cap, trucker, beanie, helmet; guest skaters too), air styles on store
landings (airwalk/christ/rocket via pose.feet/boardHeld), and a pose shot after most landed cuts (`startPose`: jump cut to
the skater facing the camera, `A.drawSkaterFront` horns/point/arms/shaka/flex/boardup + caption).
Round 5 (Nov 1): title words are measured on the device (Android has no Impact; wider fallback font overlapped) and
stacked above the face-off cards; `layout()` reserves a `hudH` strip for each score panel so nothing sits on the bowls
(checked at 11 sizes with a scratch script: HUD/card rects vs `lay.deckRect`); while a human chooses a bowl, trick text,
popups and the turn banner over the board fade to ~30% (`veil`, `chooseK`). Many more GOOD/BAD popup lines. Grinds in
cutaways: `GRIND_POSE` (50-50, 5-0, nose, crook, smith, feeble, board, blunt, tail; from the steal's grind name via
`grindKind`) puts a truck (or the deck for slides) on the rail/curb/coping (`grindPose`); boardslides draw the board
nose-on (`pose.boardEnd`). `s.debug.cutTo(p,kind,anim,spot)` forces a cutaway for tests. Guest roster skaters go by every 3.5-7 s
(ollie over, grind the edge, manual, bomb, big air). Turn: row glow in the player's color, "▶ X'S TURN" HUD, YOUR TURN card,
other side dimmed. Popups are measured and clamped on screen; trick strings wrap to 2 lines. THPS HUD (score tally, special meter),
trick strings "A + B / pts X n", COMBO!!! on store landings, bails (being robbed, or gaining nothing and leaving the
other a 3+ grab: combo lost), special trick when the meter is full, crude popups (owner OK'd all of them), end-of-run tally
(`profile.proMancala` {high,combo}, validated in profile.js). Trick points are cosmetic; stores decide the winner. Local 2P:
the per-turn pass card is now an in-canvas "X'S RUN" banner (+0.55 s tap lock). Sound `proMancalaAudio.js`: synth skate SFX (+catch,
revert, scratch, rollby, cam, gang "HEY!") and its own punk band `createPunk` (double-tracked panned power chords, picked
bass, skate-beat/backbeat drums with snare-roll fills, chorus lead, gang shouts; 3 original songs 216-240 bpm, sections
V/P/C/B); title = snare-roll crescendo + guitar hit per word exploding into a chorus at 4.55 s, words follow the audio clock.
Not heard by ears yet. Drop-ins `assets/music/thps-*` (README there). Test:
`tests/promancala.mjs` (2P + 1P vs CPU, 3 sizes). Online two-phone test not run (no wrangler on the Windows box).

Version 0.70.0 (Oct 29): owner's big face upload (~1,300 PNGs named from the missing-portrait list; 327 more characters with
their own picture, 118 still without; owner's rejects + rename_log.csv moved to `assets/originals/portraits/discarded/`). Shrunk
with the optimize-art settings on 4 cores (scratch popt.py: same LANCZOS 480 / WebP q88 m6 / move original).
Small PNGs (<=480px, <120 KB) were also turned into same-size WebP q88 (837 files, 53→9 MB; build 190→131 MB);
ace.silly/cedric-bixler-zavala.angry stay PNG (an archived original has that name). 561 of 682 characters have own art, 121 not. Doubles merged
(`src/data/characterMerge.js` MERGED_CHARACTERS dup→kept, 45 ids; dropped from ACTIVE_CATALOG, cards remapped, `character`/
`characterIdentity`/portraits/canRecruit/recruit resolve old ids, loadProfile maps rosters/shared/earnedUnlocks/picks/BF devilId;
ref-kitana art renamed mk-kitana, George v13's extra moods moved to george-costanza). 19 new characters (legendsPack2 end:
Little Shop cast, Naked Gun + Leslie Nielsen/O.J., Bundys, Manson, Hitler, Obama, Clinton) + landmarks police-squad, bundy-house.
v0.69.4 (Oct 29: 69 more characters with owner portraits (156 PNG + 32 oversized WebP shrunk). The upload had ~60 characters with a
PNG and a WebP per mood holding the same pictures under different mood labels; owner chose the PNG labels (clashing WebPs dropped).
A merge from an old base moved 4 replaced PNGs into assets/originals (git rename detection): check `git diff --name-status` for M in originals/.
`chuck-norris (2).png` is ignored by the build (bad name; owner to say its mood). 469 of 708 characters still have no own portrait.
v0.69.3 Oct 29: installed-app updates, below; Oct 28: v0.69.1: 49 new owner portraits optimized (480px WebP q88, same bytes as the TESTver sync bot makes); home screen: Continue
stacked over a smaller New Game again + slogan "The game playin' the game, disguised as another game!" (`.ts-tagline` under the logo).
v0.69.3 Oct 29: installed-app updates (owner: "takes really long to update"). Causes: the browser only checks sw.js on a
fresh open (Android resumes a kept app without one), the update is a ~100 MB background download that restarts from 0 if the app
is closed part-way, and the old toast said "close and reopen". Now src/pwa.js asks `reg.update()` whenever the app comes back on
screen (max every 5 min), Settings has "Version X · Check for updates" (`checkForUpdate`: /version vs VERSION, then reg.update;
states current/downloading/pending/ready/reload/offline/file; `checkUpdateFlow` in app.js), and a finished update shows a
Restart pill `#sc-ready` above the home dock (hidden while store.session). Test: `tests/pwa-update.mjs` (after build --pwa).
Not done: the Worker stores a new release fully in its cache before sending the first byte (`releaseHtml`), so the first phone
per Cloudflare location after a release waits at 0% while it pulls ~100 MB from GitHub; no resume for a half-done download.
v0.69.2 Oct 28: online P1/P2 fix: the room's "You are" pick decided the player slot, and both phones picking the same name
made both P1 (each phone saw itself as Mario/Sonic, both ran the shared world). duel.js now passes `slot` (the pick, or the room
seat when both picked the same); netGame plays players[slot] with each player's real owner. Test: online-native `SAME_WHO=1`.
Lag check (same day): code adds no delay vs v0.68.1 (partner shown ~90-110 ms behind with no network, both builds, headless).
Ideas if wanted: stamp snapshots + extrapolate the partner by the full travel time, push a snapshot on jump/turn, 30 Hz.
v0.69.0 Oct 28: online play fix-up after the owner's first real two-phone test ("could not join"; Broforce enemies missing
for one player): net.js join retries + an error card that names the cause (offline / site unreachable / WebSocket refused by a
blocker) with a connection log, close 4000 = seat taken by a duplicated tab (no reconnect loop, new id), worker frees seats silent
60 s, netPlay acks {k:'npa'} (reconnect resends only unconfirmed moves), duel 20 s grace on a drop, queued rematch, version check
before challenges; per-game sync audit (Broforce/Mario/Sonic/CV/SotN/Warriors/horde/bosses/Photo Hunt/kart/board game: shared
world run by player 1's phone, hide only inside a snapshot's covered area, partner's real view width, wall-clock timers); Uno online
fixed; home screen tidy + About card. Live-room probe: Actions → "Probe the online rooms" (tools/net-probe*.mjs, tools/cf-report.mjs).
Server checked healthy and far under the free-plan limits; the owner's "could not join" cause is still unknown (the new card will say).
v0.68.1 Oct 27: DOOM heads 2x (`HEAD_K` in doom/heads.js), Android-port touch buttons (`drawButton`/`stickHome` in doom.js), status-bar face 33x31.5.
v0.68.0 Oct 27: online co-op / shared-world play for the take-turns games, see "Online co-op/live"; full npm test
156/156 clean before release. Oct 26 v0.67.0: every head-to-head (CPU-opponent) game plays natively online, 95 of 95, batches 1-21 below; Meet a visitor everywhere; Oct 24 v0.66.1: trivia vs CPU shows its turn, `cpuTriviaTurn` in cpuKit; v0.66.0 1-player board game vs CPU + Choose Characters; v0.65.0 online board game on two phones; v0.64.0 online duels phase 1; v0.63.1 loading screen, full-screen app, Worker serves the app files; v0.63.0 PWA; earlier: pinball tables, iPad fix, backup/restore; TESTver fast-forwarded into main). Releases are GitHub Release assets only:
pushing a version bump to main runs `.github/workflows/release-build.yml` (its `paths` filter only sees the first 300 changed files:
a push with a big art upload doesn't trigger it; run it by hand, workflow_dispatch on main), which builds `releases/ShambConkins_vX.html` and
creates release vX with notes from `docs/releases/vX.md` (first line `# ` = title) or the CHANGELOG section; skips if it exists.
Test helper `tests/lib.mjs` ignores CORS-blocked online photos (file:// origin).
Hosted (Oct 23): Cloudflare Worker `cloudflare/worker.js` (README there) serves the newest GitHub Release asset at
`shambconkins.loki-mylo.work` (+ `shambconkins.sean-p-conners.workers.dev`); new releases appear within ~5 min, nothing to redeploy.
It also serves the app files (`/manifest.webmanifest`, `/sw.js`, `/icons/*.png`, `/index.html`) from same-named release assets (the release
workflow uploads them from v0.63.1); without them the game uses its blob manifest and Chrome makes a badged shortcut, not a WebAPK.
Release assets must stay named `ShambConkins_<tag>.html`. Owner set it up from an Android phone (Samsung Internet blocks paste/OAuth; Chrome works).

## ACTIVE PLAN (read first; Oct 26)
DONE: native online play for all 95 head-to-head games (batches 1-21, "Native online games" below), released as v0.67.0
(main = TESTver = this release). Work from TESTver (or a branch made from it) and merge back there; main only gets releases.
The Oct 25 branches `ccr-36294fb1-h63157` / `ccr-068b9171-9aysxt` (a chat that restarted from old main) are superseded.
Next: owner playtest on two real phones and fix what they report (nothing has been tried on real phones yet).
ONLINE CO-OP (Oct 26, branch `online-coop-kart`, not pushed/merged yet; owner's design answers in "Online co-op/live" below):
games that used to run as two separate solo runs online now share one world, ONLY when `s.online` (1-phone 2P and 1P unchanged).
Done: kart Time Trial → 1v1 race, Sonic ×2, SMB ×3, Broforce ×4, every boss fight, horde ×2 (Living Dead, Evil Dead),
Castlevania NES ×2, and (Oct 26, later) SotN, Warriors, Photo Hunt, Kart GP, DOOM ×2: ALL owner-picked games done (see the
top-of-file comments in sotn.js, warriorsBeatEmUp.js, photohunt.js, doom.js). SotN = castlevania pattern (player 1's phone
runs Dracula, straggler pulled into the throne room after 10 s, +5000 each). Warriors = player 1's phone runs the gangs,
fights lock both into one ARENA stretch, KO'd → back after the fight. Photo Hunt = same bundled photos, clock-stamped claims
{c}, earliest owns, round decided by {re} handshake. Kart GP online = 'race' mode. DOOM = lockstep ticcmds (adaptive lead
4-12 tics, hash every 35 tics, `s.debug.net`), game.coop in game.js/actions.js (starts, MP things, weapons stay, shared
keys, 3 lives, respawn by partner, spectate), one level, tally score each. All pass online-native with and without
LAG=80-150 and their offline tests; real phones untested.

## Implemented systems
- **Solo / 1P arcade (Oct 19 2026, batch 1 of 4, branch `claude/solo-mode-batch1`):** Arcade 1P / 2P switch + solo player
  (Sean/Amber → unlocks to that roster) + CPU Easy/Normal/Hard (`profile.settings.solo`, `soloStripHTML` in ui.js). `src/solo.js`
  (`SOLO_IDS` kinds levels/rounds/cpu, `soloFinish`/`soloProgress`/`cpuSkill`, `profile.soloBest`), launcher `soloPlayers`/
  `settleSolo` (one result card, Play again), Exit = "Bank & quit". Batch 1 (levels): Broforce ×4 (mission after mission),
  SMB World 1 (loops after 1-4 until game over), Coin Rush (coin goal 15+5n), Castle Dash and CV Vampire Killer / SotN (shrinking
  clock), Candle Hunt (heart goal 12+6n), Sonic ×2 (fresh act + new boss pilot each clear), Bricks Quest (stage after stage),
  Hole.it (level after level, map progress saved), Photo Hunt (whole library), Kart GP (podium → next course), Time Trial (beat
  your ghost), Kart VS = vs CPU rival kart (the other New Game pick). Goals/tuning are guesses. Test: `tests/solo.mjs`.
  Batch 2 (rounds, Oct 19): 41 solo games now. `turnRunner` (retroKit → `soloTurnRuns`) and `arcadeRounds` (arcade.js →
  `soloArcadeRounds`) replay the game in rounds with the world clock sped up 11%/round (max 1.75x); beaten = last the clock,
  or `soloPass`/`soloTarget` (darts, Duck Hunt, lander, GoldenEye, Home Run Derby, Warriors, bike, gophers, archery).
  Other pass-and-play engines are kind `'turns'`: launcher `soloTurnRounds` runs the engine once per round, `session.pass(1)`
  ends the round with P1's score, `s.frame`/`s.timer` run at `solo.speed`; target = last round's score (×.6 for one-ball/
  flip/pitch/shot games, `SOLO_FACTOR`). `s.soloWorld()` exposes the round state for tests.
  Batch 3 (CPU opponents, Oct 20): kind `'cpu'`; P2 is a CPU wearing the other New Game pick ("Amber (CPU)"). `engines/cpuKit.js`
  (`isCpu`, `cpuSkill`, `cpuHotseat` = skip hand-off cards after the first and play the CPU's turn through the engine's own move
  function, `negamax`, `cpuDepth`/`cpuBlunder`), `engines/cpuBoards.js` (board pickers). Shared input kits take a CPU: vs CPU the
  human owns every touch (`arenaTouch`/`halfPointers`/`ownedPointers`/`directionGestures`/`arenaGestures`, opt out with
  `cpuOwner:false`), and P2 is driven by `kb.cpu(key,down)` (arenaKeys), `keyboard(...).hold/tap` (tarantinoKit), `fingers.cpu`
  virtual finger (halfPointers/arenaTouch), `keys.cpu` (duelInputs), `controls.cpu` (arenaGestures). Each engine has a small
  `cpuThink`-style brain (search for `vs CPU:` comments). ~80 games now play solo. Balance is bot-tested only (an idle human vs the CPU).
  Batch 5 (Oct 20, the last four): every Arcade game now plays in 1P. Owner rule (Oct 21): a co-op game with a take-turns version
  keeps its CPU teammate in 1P; one without is played ALONE. Space Invaders co-op = CPU teammate (`SOLO_COOP`/`soloCoop` in
  solo.js; engine sets `s.solo.coop=true` + `s.solo.won`, `settleSolo` scores the team total, labels say WITH CPU; versus brain
  leaves the human's columns alone); Space Swarm is its solo version. Living Dead horde = solo kind `'alone'` (`alone` in horde.js:
  `P` has one player, `mate(p)` = partner or self, `soloMode` thins the horde: cap/rate ×.6, hp ×.8, final boss ×.55, dmg ×.9;
  touch anywhere steers; sets `s.solo.won` + `soloProgress`). Boss fights (arcade rematches) are `'alone'` too (`soloKind` in bossPack; `alone` in
  bossFight.js: one plane centred, `SOLO_K` boss HP ×.5 and attack density ×.7, `SOLO_HP` 5 hearts, no revives). Bot sim (8 bosses,
  autopilot .25 s): 1P wins 4/8 vs 2P 3/8. Rainbow Rivals = kind 'levels': leg after leg vs Mario/Luigi
  on a fresh course, outscore the rival to move on; `rivalThink(...,goof)` makes it fumble rows (.3−.2·skill, ×.82 per leg).
  Balloon Battle = 'cpu': `soloKart` battle branch, CPU kart via `battleBrain` in kart.js (takes the shorter way round the ring,
  U-turns toward the rail, own lane keeper with ¼ curve feed-forward because `autoInput` sits ~45 off its lane on the ring,
  items by distance ahead/behind); HUD shows the rival's balloons. Scratch-tested to the result card (an idle human loses 2
  balloons in 100 s on Normal); real-phone feel untested.
  Batch 4 (trivia/cards/dice/table, Oct 20): ~110 solo games. Trivia ×9 (`cpuTriviaPick`: right-answer chance from question
  difficulty × level; `cpuThinkTime`), casino ×4 (`casinoCpu` in casinoTable.js polls `s.debug`: locks a bet, plays via
  `act`, agrees to cash out when the human does), Yahtzee ×2, Uno, Guess Who, Liar's Dice (odds-based bids/LIAR; also fixed:
  hands now roll only the dice a player has left), Battleship (hunt/target), Simon (memory span), Price Is Right, Clue ×2,
  Monopoly ×2, N-Spade (imperfect memory), Hangman Wanted (CPU deals its bounty), Microgame Rush ×2 (CPU half resolves
  by a skill roll, human gets the upright bottom half). CPU hands/notebooks are hidden on its turn. `SOLO_HIDDEN` (solo.js)
  hides Newlywed, Roast Battle and Draw It from the 1P list. Tests: scratch scripted-human runs to the result screen for
  every batch-4 game + `tests/solo.mjs` + 2P fuzz; casino tables only end on cash-out/bust.
  Windows box: Node 24 at `C:\Program Files\nodejs` (not on PATH in the agent shell), git = GitHub Desktop's bundled git (no push creds).
- **Broforce (turn-based rebuild, Oct 13 2026):** one engine file `src/engines/broforce.js` (same 4 game ids in
  `packs/broforcePack.js`). P1 runs a 3-stage seeded mission, then P2 runs the same one; higher score wins (normal
  head-to-head settle). `buildStage(seed,si)` makes deep destructible tile maps (tunnels, bunkers, barracks, towers,
  cliffs with hidden caves, pits under bridges; stage 3 = Devil arena + chopper), ~100 enemies per mission (mook,
  bomber, bruiser, dog, grenadier) with sight limited to the screen. Movement: big jump, step-up, climb any wall you push
  into, ladders, drop-through platforms. Heads (`headCanvas`/`renderHead`): transparent art (>5% clear pixels)
  is trimmed and outlined (owner-approved look); a photo's plain backdrop is flood-filled away (`removeBackdrop`), busy photos
  get an outlined egg crop; generated SVG cards use the head-shaped stand-in. Contact sheet: `tests/broforce-heads.mjs`. Face per action: `broMood(p)`. Cages swap your bro (+1 life); the GOLD cage per stage holds a
  locked character from `gameRecruitPool` → `session.broforceRecruits` → `settleGame` recruits it to that player's
  roster (no random winner recruit for Broforce). The old co-op modules in `src/engines/broforce/` are unused except
  the legacy result path in `gameLauncher.js` (old saves); their unit tests still pass. Tests: `tests/broforce-turns.mjs`
  (screens at 390x780/780x390/1100x700 → `/tmp/claude-0/sc/bf-*`), `tests/broforce-board.mjs`. Real-phone feel untested.
- **Mario Kart 3D (Oct 13 2026):** engine `kart` (`src/engines/kart.js`), four games by `kartMode`: `rainbow-road-kart` 'race'
  (Grand Prix VS, side-by-side split P1 left/P2 right, 6 CPUs), new `kart-grand-prix-pass` 'gp' (P1 then P2 vs the same 7 CPUs,
  GP points 15/12/10/9..., same place → faster time +1), `kart-time-trial` 'time' (P1 alone with 3 mushrooms, P2 vs P1's ghost:
  `rec` frames → `ghostPose`, drawn translucent; fastest wins 100/99), `rainbow-balloon-battle` 'battle' (side-by-side, 1v1).
  Flow: one `s.frame` dispatching to `onFrame`; `chooseCourse()` card screen (debug `pick(id)`, auto 30 s) → `runRace(opts)`
  (own renderer/GL context, music, engines; resolves results). Courses in `kart3d/track.js` `COURSES`: Rainbow Road, Moo Moo
  Meadows, Cheep Cheep Beach, Bowser's Castle (`theme`, `offroad` band → `roadHalf`; off-road = 55% top speed); 3D ribbon built
  from turtle pieces (turns, hills, ramps + gaps, glider, anti-gravity `glue`, loop, corkscrew; flex straights auto-close).
  Non-rainbow courses are Rainbow-Road style too (loop/corkscrew + wall ride on glue, ramp gaps, a glider) with animated track
  characters from `kart3d/hazards.js` (pure functions of race time: cows + Monty Moles, crabs + leaping Cheep Cheeps, Thwomps +
  fire bars; course pieces carry `haz:[[f,kind,{d,ph}]]`, contacts in `hazardContacts`, meshes in `render.js`).
  `physics.js` track-space karts (Frenet), air/ramps/crests, rails, Lakitu, drift sparks (`DRIFT_LV`) → mini-turbo (`MT` .7/1.15/1.6 s),
  auto tricks. Drift: latch at 85% push, ends past 55% the other way or on release; only hard wall hits (>.75) cancel it.
  MK8-style arc: `driftAge` ramps the turn rate from 24% to full over 0.75 s while the kart slides a little wide; `k.slip` = drawn
  nose angle (grows with the arc and the thumb).
  `render.js` themes (`THEMES`: baked sky per theme, procedural road/kerbs/sand/stone, fences/walls, grass/water/lava ground
  plane, trees/cows/palms/pillars), karts with portrait billboards, ghost. `hud.js` (Tour HUD, two item slots, time mode),
  `music.js` (original loop). Camera (`cameraFor`) smooths the eye OFFSET from the kart (`cm.O`) and dollies the whole rig back with speed (`cm.zoom`, up to 1.6x on boosts), so speed is felt but
  the kart keeps its low spot on screen (per-aspect eye height/target). Arcade play uses the New Game picks
  (`store.setupNames` + `store.setupSelected`, gameLauncher). Controls = Mario Kart Tour per screen: drag steers (floating origin), full push latches a drift,
  release = mini-turbo, tap = item, swipe/drag up/down = throw. CPUs = random roster characters (`pickCPUs`). Needs WebGL (else a
  message and a tie); the Mode 7 engine is gone. Tests: `tests/kart-track.mjs` (Node, test:core), `tests/kart-controls.mjs`,
  `tests/kart.mjs` (all four games to the result screen). Real-phone feel untested.
- **Photo Hunt (Megatouch Aurora 2007 cabinet replica, Oct 13 2026):** `src/engines/photohunt.js` (same id `megatouch-photohunt`).
  800x600 cabinet screen full-bleed (`ph-shell`); `layout(W,H)` stretches it to the screen: 4:3 = exact cabinet, wider = 'cab' widened,
  ≥1200 logical wide ('wide', landscape phones) = one header row + ROUND/hint glasses in side columns, portrait ('tall') stacks the photos.
  Corner full-screen toggle `.ph-fs` (like the GB `.gb-fs`).
  Rules in `RULES` (reverse-engineered from owner's cabinet photos, bonus rounds unknown/not built): 48-pill bar, 48 s round
  −1.5 s/round (min 30), find = clock (1000 −25/s, resets per find), miss −3 s, cleared round pays 320/pill left, 3 hints per game,
  game ends when the bar empties. P1 plays a full game, then P2 on the other half of the photo library; higher score wins.
  Hi-score bar: `profile.photoHuntHigh` (house record WILLYZ CREW 369,127). Pairs: `assets/photohunt/<id>.a|b.webp + <id>.json`
  (embedded by build.mjs as `photohunt:<id>:a|b`; `src/data/photoHuntPairs.js` generated). `tools/photohunt.py` makes
  pairs (make: one photo + hand-picked spots remove/color/flip/grow/rotate/add; import: finished A/B pair, diff-detected;
  inbox; preview). Pairs: `sean-road-trip` + owner's 5 (dog-lab-crew, dog-lab-solo, amber-alien, space-desk, evil-lab; Gemini sparkle watermarks painted out,
  raw uploads in `assets/originals/photohunt/`). Photos repeat (mirror flipped) instead of the drawn scenes, which only fill in with no photos. Owner is supplying
  photos (pin-up/erotic theme); hand-pick spots and check every preview. Test: `tests/photohunt.mjs`. Real-phone feel untested.
- **Sonic (Oct 13 2026):** P2 is Tails (`drawRunner` palette + `tail()`); badniks redrawn. `sonic-ring-rush` id now runs `sonicMode:'boss'`
  (Green Hill Act 3): `buildLevel` ends in `L.arena`; per-world `w.boss` (Egg Mobile + wrecking ball, 8 hits, `stepBoss`/`bossTouch`,
  camera lock, capsule). Pilot = locked character from `gameRecruitPool` (prefers real art, head via broforce `headCanvas`); beating it
  pushes to `s.broforceRecruits` → `settleGame` recruits it (`cageGame()` in gameLauncher skips the random winner recruit). Test: `tests/sonic.mjs`.
- **Hole.it (Oct 14 2026):** game id `paddys-hole` (engine name still `hole`, so saves/families are unchanged) now remakes
  the mobile game Hole.it (Rocket) from owner screenshots + a gameplay video. Real WebGL: `src/engines/holeIt/gl.js`
  (instanced vertex-colour meshes, tiled tray floor with the hole discarded in the shader, rim/throat lathes, floor decals for
  contact shadows, the yellow size arc and the gold level-up ring, textured head tokens), `meshes.js` (~60 procedural props
  in toys/fruit/kitchen/sushi themes + Rum Ham/Fight Milk/head-token cameos), `levels.js` (deterministic `buildLevel(N)`:
  rows/rings/spirals/snakes/piles/towers/pillars, goal cards, `holeRadius`/`sizeNeed`), `sim.js` (movement, tip-in physics,
  stacks, growth, boosters, `botInput`). Feel pass (owner): props tip over the rim (slide inward, top tilts to the centre,
  `it.tip` phase), then fall with wall bounces and a steady tumble; springy hole growth (`h.rv`); the size arc shows an eased
  `turn.arcV` (size−1+progress) so it fills smoothly and rolls over on a size-up; camera smoothing is frame-rate independent.
  Second owner video (Oct 14): item goals ask for EVERY copy on the board (`need` = tally; kinds over `cap` are trimmed with
  `removeItems`, which keeps stacks standing); every 5th level from 4 (`isScoreLevel`) is a ★ points level (`def.mode='score'`,
  goal `{k:'score'}` = sum of `propXp`, wide star card `drawScoreCard`); popups show each prop's value; goal props/stars fly from
  the hole into their card (`turn.flyers`, card counts wait for arrivals); too-big props sag into the mouth on the rim, lean in
  and get nudged by the moving rim (`it.wob/lean`, `relocate` keeps the grid right). New props: popsicles ×6, kiwi, tomato;
  Sweet Shop theme (`treats`); Lego brick towers (`fLegoTowers`) in toy/treat levels.
  Fourth owner video (Oct 14, his Galaxy Fold inner screen 1080x1200, `Claude Share/`): Levels 2-3 whole + first second of 4.
  Measured by stitching a map from the video (floor-shift tracking × camera scale): camera = Unity-style fixed 60° vertical FOV,
  pitch 64°, centred on the hole, dist 9.53·(r/.5)^.37 (`cameraFor` in holeIt.js; rim = 11.8% of screen HEIGHT at Size 1, so tall
  phones see less width, as in the real game); `holeRadius` .5·(1+.34k−.006k²) (Size 3 = 1.66x, Size 4 = 1.97x, Size 10 ≈ 3.6x);
  top speed 2.42·(r/.5)^.42 u/s (`topSpeed`, was ~45% faster), full speed in ~0.1 s (`acc` rate 20/s), camera follow 18/s;
  joystick full at 37 px of 1080 knob travel. HUD sizes are the video's px × u (u = width/1080): level pill, timer (alarm clock,
  green bar), cards pop in one by one, booster bar 76 px right of centre, padlocks; boosters unlock grow L3 (video), speed/magnet/
  freeze L6/9/12 (guess). No intro screen any more (real game has none): the level shows at once, clock waits for the first drag;
  end button says Next; heading arrow outside the rim; "Size N" scales with the hole; lighter floor halo, plank floor, softer grass.
  Clocks: default 4:00 (`TIME` 240; owner chose real clocks everywhere), hand levels set `time`. Hand levels 2-6 in
  `handLevels.js` (`arm`, `popRing`, `fruitBlock`, `popSpiral`/`popRing2`, `legoStack`); per-kind/per-item `xp` (`itemXp`).
  Fifth owner video (Oct 14, Levels 4-6 whole, `Claude Share/`): Level 4 rebuilt (200/88/228 + 3 peaches), Level 5 (popsicle
  spirals/rings round Lego stacks with the 4 goal trains), Level 6 (gadget room: 2 green fridges, 2 toy helicopters, 7 TVs) from
  maps stitched from the video; ~30 new props. Size bar rate measured: `sizeNeed` = 15·1.67^(N−1) (`GROW`); the arc decal has a
  dark outline and rounded ends and spans 300° from ~7 o'clock clockwise (gap at the bottom for the label; gl.js mode 2, `uBand`).
  PHYSICS (Oct 15): every prop is a cannon-es rigid body (`src/vendor/cannon.js`, MIT, 0.20.0 CJS build; only change: perf_hooks
  → globalThis.performance). `holeIt/physics.js`: shapes from mesh bounds (box/cyl/sphere, sets SPHERE/BOXY, `KINDS[k].hull`
  override, e.g. helicopter), floor = plane with contacts inside the hole circle dropped (narrowphase hook), static walls/islands,
  kinematic rim beads (tops flush with the floor, outside the circle) + two rings of throat spheres, slippery prop↔hole material,
  collision groups (hole/static parts only test props), a gentle pull toward the centre for props over the hole, speed cap +
  put-back for props flung past walls. Size-class rule (sim.js): a prop with r ≤ 0.96·hole r hanging into the hole is `ghost`ed
  (stops touching floor/rim/throat) so it always drops; bigger ones stay physical and wedge, get carried and tip out (fridge
  wedges at Size 5, drops at Size 6, as in the video). Handoff to the throat animation (`startFall`) once a prop's top is near
  the floor inside the circle; anything below y −1.5 counts. Perf: only props near the hole or a moving prop are in the world
  (`activate`/`prune`), far props resting on the floor that are only jostled are put back to sleep, settled poses cached on
  `def._settled`. ~0.3-1.7 ms per 60 Hz step on the dev laptop (Level 5, 1,000 popsicles, is the heaviest). Test:
  `tests/holeit-physics.mjs [levels] [secs]` (autopilot clears 2-6); `tests/holeit.mjs --node` checks layouts with
  `{physics:false}`. Bravo! card = real bonus screen (`holeIt/bonus.js`): coin pile "20", x2/x3/x5/x3/x2 bar, sliding arrow,
  Collect banks 20×tile in `profile.holeItCoins` (no advert). Level screen (`holeIt/levelMap.js`) = the real pre-level screen
  (meadow, lake, tree, blue truck with player 1's face, hole, coins pill, green "Level N" button) + a row of level bubbles
  (stars, padlocks); Play drops the goal props into the hole; coins won pop out of the hole next time (`store.holeItCoinPop`).
  STACKS (Oct 15-19, owner: "ours are shaky before the player comes near"): cannon can't hold separate bodies stacked 20 high,
  so every column (props built up off the floor + what they stand on, `groups` in physics.js) starts FROZEN as static bodies
  exactly where the level put it; when the hole reaches under it (or a hard hit, `LOOSEN`) it becomes ONE rigid compound body
  (`buildCompound`, straight and stable). Pieces over the hole split off and drop (`stepCompounds`), and everything resting on a
  piece that leaves goes with it, so a tower sinks straight down; a multi-column stack (Level 5 Lego) loosens the columns within
  1 unit of the bite into a calm heap (`split(...,calm)`); a hard landing (`SHATTER`) breaks a compound up. Props the hole can
  swallow don't collide with the rim/throat at all (stay put until over the hole); round props roll little (damping).
  Never add/remove bodies inside a world step (collide events queue `pendingRelease`). prune keeps bodies something rests on.
  MEASURING TOOLS (scratchpad, not in repo): vserver.mjs serves the video + `/save`, `/data`, `/shots`; helpers.js (`track2`
  perspective-correct hole path from floor motion, `toWorld` camera inverse, `mosaicTD` top-down level map from the warped frames,
  `side` real-vs-ours sheets); replay.mjs drives our hole along a traced path (`sim.path`, `sim.fixedDt`) and screenshots at
  video times. Measured: Level 5 popsicles 0.61 x 0.35 (+stick), 0.47 apart, spirals from detected popsicles (`ARM`, `RED_ARM`),
  ring radii 2.05/2.86/3.68, stacks 2.2 x 2.2 of 7 brick layers (`brick-*`, 0.55x1.1x0.37), train needs Size 6 (r 1.15),
  bricks +1, train +10; Level 4 blocks + cross-shaped tray (3 grass corners) from the top-down map; top speed 2.5·(r/.5)^.53.
  Replays: Level 5 sizes match the video to Size 4 (85 s), then run ~1 size behind (Size 6 at 101 s vs 92 s); Level 4 eats
  ~280 of the video's ~430 by 63 s (Size 6 vs 7). Level 3 and 6 sizes not re-measured with the new tools yet.  Third owner video (Hard Level 30 + Levels 31-34, Oct 14): prop value (r/.3)^1.6 (+1/+2/+4/+10/+15), per-level growth curve
  (`growBase`: at every size you can reach the next by eating ~65% of what already fits, so the biggest prop becomes edible near
  the end). Props have a per-instance scale `sc` (giant duck = duck sc 4.6, goal key `gk` 'duck+' → BIG card badge). Walled grass
  islands (`def.islands`, hole slides along them; drawn as walls + raised grass). `layout.js` = placement toolkit (row/grid/rings/
  spiral/snake/diag/scatter/pile/tower/triangle, `topUp`, `removeItems`); `handLevels.js` = levels 30-34 remade from the video with
  the exact goal cards (30: star 234 / choc-muffin 45 / latte 121 / cabbage 19; 31: shark 4 / duck 402 / pineapple-toy 28; 32: ★1150;
  33: matcha 201 / melon-slice 37 / corn 8 / cake-pink 4 / tray-strawberry 4; 34: waffle 26 / watermelon 11 / milkshake-blue 26 /
  jar-orange 19). ~45 new props for them. Generator: wide tray, size classes mixed everywhere (small/medium/large/giant, giants
  capped by level), islands kept a big hole's width from walls and each other, `fillGaps` packs empty floor. Test bot routes
  around islands (Dijkstra over island corners). Bombs (owner: "it explodes and immediately ends your run"): kind `bomb` (glowing red, radiation sign);
  `startFall` on a bomb ends the turn (`sim.bombed`, BOOM! card, rings + flash); 3 on Level 34 (`spec.bombs`), 1-3 from Level 8 in
  generated levels, placed in open floor (`topUp` `pad:1.4`). The bot treats fitting bombs as no-go circles; the clearability
  test plays each layout without bombs. Map tool idea: dump `buildLevel(n).items` and draw circles (used to lay out 30-34). Full bleed via `fullBleed(s)` (engine `hole` in the `noBleed` list; floating Pause/Exit replace its own pause
  button, boosters sit above the ⤢ toggle, player name/target to beat under the pills).
  Stars (`starsFor`): 3★ ≥ 2/3 of the clock left, 2★ ≥ 1/3, 1★ any clear; shown on the level bubbles, best per level in `profile.holeItStars`
  (validated in profile.js); a clear sets `holeItLevel` to max(current, level+1), so replays never move it back.
  Flow in `engines/holeIt.js`: level screen (player 1 picks) → pass (Ready) → play at once (floating joystick, clock waits for the first drag) → Bravo! bonus (Collect) / Time's up (Next) →
  P2 plays the same level. Score = goal items + (clear ? 1000 + 10×seconds left). `profile.holeItLevel` (load whitelisted
  in `profile.js`) advances when either player clears. Test: `tests/holeit.mjs` (`--node` part is in `npm test`;
  `node tests/holeit.mjs <level> 390x780` plays both turns, screenshots `/tmp/claude-0/sc/holeit-*`). The old
  `neighborhoodHole.js` is unused (helpers kept). Real-phone feel, physics speed and GPU load untested.
- **Portraits:** owner uploads PNG/WebP to `assets/portraits/` on main; TESTver keeps 480px q88 WebP with originals in
  `assets/originals/portraits/` (`tools/run-claude-optimizer-safe.py` for PNG; oversized WebP uploads are shrunk the same way by hand:
  480px LANCZOS, WebP q88 method 6, original moved to originals; neither the safe script nor the TESTver bot touches WebPs).
  When both a .png and .webp exist for one key the build keeps the last one read (the WebP).
  `artemis.think` has two different pictures (.png and .webp); the .webp is what the game shows.
- **Photo Hunt hand-edited set (Oct 13 2026):** 14 more pairs from owner phone screenshots (originals in
  `assets/originals/photohunt/<id>.jpg`): `tools/photohunt_handmade/make.py` crops screenshot chrome, paints out Gemini/Lens
  watermarks, denoises/sharpens, applies 5 hand-placed edits per photo (`pairs.py`; ops in `phlib.py`: recolor/remove/mirror/
  swap/inpaint; needs `pip install opencv-python-headless`), cuts the 37:32 window (`(x0,y0)` per pair) and writes the usual
  `<id>.a|b.webp + <id>.json`; then `python3 tools/photohunt.py index`. 20 pairs total.
- **Castlevania (v0.58.2):** Dracula's Castle NES stage map; Death boss (`death-cv`, reaper art and sickles), new themed music/cards/items/trivia. Games: `cv-vampire-killer` and `cv-candle-hunt` in `src/engines/castlevania.js`, test `tests/castlevania.mjs`. Owner: NES game is fun but the Phantom Bat was impossible (it hovered above whip reach): now hovers in jump-whip range, shivers before swooping, 12 HP, keeps damage on respawn, arena candles hold an axe + big heart (a crude bot wins in ~25 s).
- **Symphony of the Night (`cv-symphony`, unreleased):** dark PS1-style remake, separate from the NES game. `src/engines/sotn.js` (logic, level, HUD, turns like the NES engine: P1 run, then P2 vs P1's violet after-image), `sotnArt.js` (vector art: caped hero with the player's head + silver hair, monsters, Death, Dracula, demon form, parallax scenery via `Scenery`), `sotnAudio.js` (synth SFX through a generated reverb, per-area ambience, drop-in music). Level (LEN 3400, heightmap `gy` + blocks/platforms/water): forest Wargs with the overpowered Alucard Sword → gate slams → Death cutscene strips gear (fists) → Short Sword, Leap Stone (double jump), pot-roast wall → caverns (Mermen, stepping stones, Claymore; water drowns) → Marble Gallery → Castle Keep: Dracula intro (“What is a man?”), teleport/Hellfire/Dark Inferno, then demon (leap shockwaves, fire breath, bats; head = full damage, body 60%). Boss keeps damage on respawn; clock pauses in cutscenes. Moves (feel pass, Oct 14): walk accel `ACC`/skid `FRIC`, coyote `COYOTE` + jump buffer `JBUF`, light apex/heavy fall/jump-cut gravity, 3-hit combo `COMBO` (cut → lunging stab → cleave; buffered presses, cancel windows into the next hit/jump/backdash/walk, weapon `spd`), chainable backdash cancelled by a swing, dive kick (down+jump in air, bounces), Leap Stone somersault (`p.flip`), crouch, sub-weapons (hearts), hold-release Hellfire (MP). Blue after-image trail (`afterimage(p,w,life,k)`) + blue sword ribbon (`p.sw` from `A.bladeWorld`; poses in `A.bladePose`); hit sparks. Rendering interpolates the fixed 60 Hz sim (`savePrev`/`interp`/`uninterp`). Gore: split/burning corpses, blood particles → floor decals. Music: `assets/music/cv-symphony.mp3` / `cv-symphony-boss.mp3` (build inlines `music:<name>`). Full-bleed via the shared `fullBleed(s)` helper (`src/engines/fullBleed.js`), now the required screen style for every new game (CLAUDE.md, ENGINE_GUIDE); Broforce/Mario/Kart/Photo Hunt still carry their own copies. Tests: `tests/sotn.mjs` (full flow, screenshots `/tmp/claude-0/sc/sotn-*`), `tests/sotn-combo.mjs` (movement/combo feel numbers + screenshots `sotnc-*`), `tests/sotn-art.mjs` (contact sheet); `s.debug.bot` drives the hero. Real-phone feel and audio untested by ears.
- **Board (generation 8, grid):** `src/gridBoard.js` lays each realm on a 17-column tile grid (100 units/cell): stem from
  camp → crossroads → 3 roads (Calm/Adventurous/High Reward) in west/centre/east bands → gate. `gridPath` is an
  exact-length DFS (moves down/left/right only, no non-consecutive tiles touching); per-realm style (serpent/stairs/
  corridor/mixed). Bridges = planks across the gap columns (`board.bridges`); shortcuts = hops across a switchback
  (`board.shortcuts`, `node.shortcut`), each guarded by an obstacle `shortcut-<from>`. Landmarks get `node.card` boxes in
  free grid blocks. Horror (`layoutHorrorGrid`), Upside Down (square loop) and pair trails also sit on the grid.
  Rendering: `src/gridRender.js` (dark tabletop per realm, 3D tiles ringed in road colour, glass cards, lane chips,
  castle below gate); CSS `.board-svg[data-grid]` block at the end of `styles.css`. Old saves keep generation 7 boards
  (`multiPathBoard.js` + `boardZones.js` journey-map renderer). Tests: `tests/board.mjs`, `tests/shortcut.mjs` (UI flow), screenshots `tests/boardshots.mjs`.
- **Levels:** Mind/Body/Spirit (+ chance Horror). Level plaque + drink status, title cards with metal riffs,
  "Gentlemen…" intro card at run start, level-biased game selection (`levelFit`), Spirit humiliation dares.
- **Level bosses:** first player through a gate wins the level; others are dragged to the gate along the shortest path
  at −0.5/space, "INCOMING BOSS", co-op boss fight (`bossfight` engine, 34 bosses), win → boss character unlocked,
  everyone advances to the next level (`levelEndBoss`/`bossGateDrag`/`advanceAfterBoss` in `app.js`; `run.bossGate`).
- **Warp zones:** one pipe per realm (any lane); passing it stops the player and offers the warp; both players are
  swapped onto one of 8 themed mini-boards (`run.mainBoard` holds the real board) ending in a boss; used pipes show USED.
- **Games:** ~113 random-pool games + event variants. Packs: party (7), arena (6), Tarantino (6), Microgame Rush (33
  microgames), bosses. Living Dead horde is a full Vampire-Survivors-style game. Most games converted to touch gestures.
- **Content:** 655 characters (unlock paths audited by `tests/unlocks.mjs`), ~2,770 trivia questions, 650+ landmarks.
  Special unlock kinds: horror, boss, dogs (KC+Mylo only together via the early family event), item, lab, character-win.
- **Music:** generative board score. `src/musicGen.js` composes original songs (intro/A/A2/B/A3/break, voice-led
  chords, motif melodies) from a STYLE (home, mind, body, spirit, horror, upside-down, one per warp board) coloured by the
  BIOME of the landmark nearest the current player (`musicScene()` in `app.js`, re-checked every bar). `src/music.js`
  holds the band (`INST` presets, `perc`, role buses with bus-level reverb/echo sends, kick ducking, Horror dirt bus),
  the unchanged metal title-card riffs (`data/musicTracks.js`), the intro string chord and `playFanfare()` (unlock ditty,
  called from `unlockDialog`). Keep per-note node counts low: phones. `renderSceneInto()` renders a scene offline.

- **Pokémon battles (`src/pkmn/`):** Gen 1 battles on a 160x144 canvas in a Game Boy Color shell (`pkmnBattle.js`: overlay,
  input, 8x8 text engine, menus, mechanics, catching, party/STATS/bag/START screens), `gbFont.js` (hand-drawn bold font),
  `pkmnSprites.js` (portraits → dithered 4-shade sprites, type palettes, DMG mode), `pkmnAudio.js` (pulse/wave/noise synth,
  original chiptune songs, sfx, procedural cries), `pkmnData.js` (types/chart, moves incl. signature moves per source,
  abilities, species derived from every character, bag items), `pkmnRun.js` (team on `player.pkmn`, bag on `player.pkbag`,
  wild pool from the nearest landmark, trainer teams, rewards: catch/beat → `recruitReward(...,'encounter')`; special
  unlocks untouched), `pkmnWarp.js` (the Pokémon warp zone: route map, tall grass, Center, item balls, trainers with line
  of sight `board.warp.trainers`, Rival Gary gym). Hooks in `app.js`: `pokemonStep` (per-step wild roll, `run.pending.wild`
  resumes), landing cases `trainer|grass|center|pkitem|path`, event `unlockChar` → wild battle, `pkmn` HUD button.
  Board: 2 Poké Ball `trainer` tiles per level (own random stream in `gridBoard.js`). Poké items: `data/pkmnItems.js`
  (kind `pkmn`, `acquireItem` fills the bag). Cameo cast: `data/pokemonPack.js`. Tests: `tests/pokemon.mjs`,
  `tests/pokewarp.mjs` (autopilot via `ShambConkins.pkmn.auto`, `pkmn.speed`, `store.forceWildChance`).
- **Themed warp zones (v0.52):** `src/warpThemes.js` (`WARP_THEMES`: games, trivia, items, Chance cards, bonus/penalty
  fortunes per warp id; Pokémon excluded). On a warp board `requestGame` (gameLauncher) deals only the zone's games
  (`warpGameId`, own roulette candidates; off-theme ids incl. challenge items/tasks are swapped, boss fights allowed),
  `resolveLanding` uses `warpCard`/`warpItem`/`warpFortune`; pair turns/intros, the Home dog pack and `evolveBoard`
  are skipped on warp boards. Warp games live in `src/packs/warpPack.js` (`warpOnly`, `randomEligible:false`, in the
  arcade): `engines/sonic.js` (Green Hill, Mega Drive physics, modes boss/race), `kart.js` (3D Grand Prix
  VS/pass & play, Time Trials, Balloon Battle), `smb3.js` (N-Spade, Spade Panel), `candyLand.js`, `chutes.js` (Ladder Rush,
  Spinner Showdown on the real 1943 layout), `monopoly.js` (Speed Die, sealed-bid auction), `clue.js` (Whodunit with
  pass-the-phone notebooks, Lineup), `hyrule.js` (Rupee Rush, Sword Duel). Items: `data/warpItems.js` (`wz-*`, built
  with `packItems` from itemPackV43). Trivia: `data/warpTrivia.js` (topics smb3/candyland/chutes/monopoly/clue +
  extra Mario Kart/Zelda/Sonic). Tests: `tests/warptheme.mjs` (every warp space type stays on theme),
  `tests/warpgames.mjs [id-regex]` (play + screenshots), `tests/sonic.mjs`. Engines expose `s.debug` for tests.

- **Bond warp zone (v0.53):** `bond-lair` in `WARP_DEFS` (Volcano Lair scene `sceneLair` + `lairHQ` in `warpBoards.js`,
  theme `warp-bond-lair`, music style `bond-lair` with `mmaj9` chords). `lairWelcome` in `app.js` recruits a missing movie
  Bond per player on arrival. Boss `blofeld` (`bosses.js`, `unlockPool:'bond-villains'`, scene `lair`, attack `trapdoor`,
  bust `prop:'cat'`/`nehru`/`scar`): the launcher recruits `pickLairVillain` (`data/bondLair.js`: `BOND_VILLAIN_IDS`, 12
  lair-only villains with `unlockBy:'boss'`) instead of `unlockId`. Games in `engines/bond.js` (`bondLaser`,
  `bondFunhouse`, `bondBomb`; ids `bond-laser-vault`, `bond-golden-gun`, `bond-goldfinger-bomb`). Test: `tests/bondlair.mjs`.
- **Hangman Unchained (Oct 14 2026):** `src/engines/hangman.js` rebuilt full-bleed (`fullBleed`, engine `hangman` in the noBleed list). Django Unchained
  look: sunset desert, wooden gallows, detailed cowboys (P1 Django green jacket, P2 Schultz grey coat) with the player's head (broforce
  `headCanvas`) under a Stetson; parts per miss torso/arms/legs, 6th miss drops the trapdoor; revolver-cylinder lives; logo `makeLogo`
  (HANGMAN in red Django-style slab with drips, UNCHAINED, "The H is silent."). Big canvas keys (`keyGrid`). Modes by `hangMode` (all in `packs/remakePack.js` except the original id):
  `django-hangman` 'shared' (both at once on one phrase, own keyboards P1 bottom/left, P2 top/right; first to shoot a letter owns it,
  +10/occurrence, miss jams the gun .85 s, hanged −20, last letter +40; 3 phrases × 75 s), `django-hangman-showdown` 'turns' (one keyboard,
  strict alternation, 15 s shot clock → timeout = miss; `turnHeader`/`turnSweep` + glowing card show whose shot; round r starts with P(r%2+1))
  and `django-hangman-wanted` 'pass'
  (`packs/remakePack.js`: writer types or 🎲 deals a phrase + clue, guesser +10/letter, solve +60 +15/bullet, hanged → writer +50; swap).
  Deck: `src/data/hangmanPhrases.js` (~600 phrases, 12 categories). SFX all synthesized in `src/engines/westernSfx.js` (gunshot + canyon
  echo, ricochet, cock/dry fire/cylinder, spurs, gallop, snort, whinny, whip, trapdoor, formant "Yeehaw"). Test: `tests/hangman.mjs`
  (screens `/tmp/claude-0/sc/hm-*`). Real-phone feel and the sounds by ear untested.
- **Bricks Breaker Quest (Oct 14 2026, `bricks-breaker-quest`, `packs/bricksPack.js`):** replica of the neon mobile game from the
  owner's screenshots, separate from Daft Punk Neon Ball Storm (`ballvolley`). `engines/bricksQuest.js` (drawing/flow, own full-bleed
  shell, all drawn in 576-wide units scaled to fit: stage map with BRICKS logo, gems/stars, snake of stage tiles, SHOP/BALL/CLASSIC/
  MULTI/100BALLS bar; HUD ring buttons, star bar, 9x11 neon field, lightning ×3 / aim slider / ball plus ×3, recall + 200-gem rewind
  in flight, CLEAR!/FAILED panels with NEXT/CONTINUE), `engines/bricksQuestSim.js` (pure rules + physics in cell units: squares,
  4 triangle shapes, row/column lasers, bombs, +1 rings, 10×n combo score, `botPlay`/`botAngle`; green beam rings `-` row / `*`
  cross (drawn as ⊖/⊕): every ball passing fires it, 1 hit per brick on the line, gone after a turn that fired it),
  `data/bricksQuestLevels.js` (stages 1-36 hand built, 20/75/120/1043/1050 rebuilt from screenshots, `stage(n)` generates every other
  number). Queue (owner, Oct 14): every turn the next queued line drops in at row 1 (`queueLines(n)` adds 3-12 sparse lines to hand
  stages, +25% balls, `qb` overrides); with an empty queue the wall still moves 1 row; clearing the turn's top brick line drops
  3 lines at once (`st.lastDrop`), capped so the lowest brick stays above row FAIL_ROW-3 (my reading of the owner's stage 20
  screenshots; the video couldn't be fetched). Wall glides down (`slideY`: ~0.5 s eased, small settle; firing mid-slide finishes it); every button buzzes (`press()` → `vibrate(9)`) and
  flashes a ring. The Node bot clears all hand stages 1-36 (75/1043/1050 were already too hard for it). P1 picks a stage (any up to the next uncleared), both play it, higher score wins. Saves `profile.bricksQuest`
  {cleared,stars,gems,reward,gift} (validated in `profile.js`); board play gives each turn its own 300 gems. CLASSIC/100BALLS tabs =
  endless Ballz-style modes. Ball counts tuned so the Node bot clears every hand stage. Test: `tests/bricksquest.mjs` (screens
  `/tmp/claude-0/sc/bbq-*`, `STAGE=n`). Real-phone feel untested.
- **Super Mario Bros. World 1 (Oct 13 2026):** `engines/marioBros.js` (engine `marioBros`) + `engines/smb/smbLevels.js` (NES maps
  1-1 with coin room, 1-2 intro/underground/exit + Warp Zone above the ceiling, 1-3 treetops with lifts, 1-4 castle with firebars,
  lava, Bowser's bridge/axe/Toad; tiles on the 16 px NES grid, areas joined by `doors`) + `engines/smb/smbArt.js` (8x8 NES font on
  gbFont capitals, tile sets per look, title logo, sprites). Physics = NES SMB1 sub-pixel constants (`PH`, `JUMP`). Ids:
  `smb-world-1` (new; title menu 1 PLAYER GAME = whole game each with P2 vs ghost, 2 PLAYER GAME = NES swap on a lost life; 3 lives,
  NES timers, highest score wins), `smb-coin-rush` (60 s each, flagpole → next stage), `smb-castle-dash` (1-1 race). Warp pipes recruit
  one locked character per player from `gameRecruitPool` → `s.gameRecruits` → `settleGame` (same path as Broforce cages), then 1-3.
  Full-bleed layout (`fullBleed`: floating Pause/Exit/⤢ fullscreen and a Controls chip); view fits 240 px tall, wider screens see
  more level, tall phones get sky above/ground below. Luigi = green cap/shirt, white overalls; Fire = NES fireballs (4 px/f, max 2, bounce −3), 1-4's Bowser dies to 5 fireballs as a fake Goomba. Heads: `s.sprite(...,{still,noBadge,box})` reports the drawn size so the cap fits.
  Test: `tests/mario.mjs [world|alt|coins|race]` (physics numbers, every flow, screenshots `/tmp/claude-0/sc/smb-*`). Real-phone feel untested.

- **South Park warp zone (v0.56):** `south-park` in `WARP_DEFS` (town-map scene `sceneSouthPark` in `warpBoards.js`: route
  `SP_STREETS` along square street corners, buildings via `spHouse`/`spShop`, `spMecha` at Stark's Pond replaces the castle;
  CSS `.sp-sign/.sp-shop`; theme `warp-south-park`; music style `south-park`). Cast in `data/southPark.js`: 26 new
  `sp-*` characters with `unlockBy:'southpark'` (new SPECIAL_UNLOCKS kind, gated in `canRecruit`), `SOUTH_PARK_IDS`
  (also cartman/butters/randy/towlie), `pickSouthPark`. Recruits: `southParkWelcome` (app.js) on arrival, every board
  game won on the SP board (`settleGame`), Chance effect `['southpark']` (events.js). Boss `mecha-streisand` (body
  `mecha`, attack/sig `zinthar`, scene `southpark`, `unlockId:'barbra-streisand'`, `unlockName` shown in boss rules).
  Games in `engines/southPark.js`: `sp-dodgeball`, `sp-cheesy-poofs`, `sp-killed-kenny`. Items `wz-*` South Park pack,
  34 trivia lines in `warpTrivia.js` (feed the existing `southpark` topic). Test: `tests/southpark.mjs`.

- **Minigame remakes (v0.58):** audit of the 112 pool games; the ten weakest originals were rebuilt as new engine files
  (same ids/engine names; wired in `engines/index.js`, rules/durations in the `REMAKES` table at the end of
  `gameRegistry.js`): `brawndoMerge.js` (Suika physics, shared), `pancakeReview.js` (eating contest, shared),
  `skynetScan.js` (find the Terminator, shared, 7 tell rounds), `paperRoute.js` (Paperboy, pass&play),
  `boulderRun.js` (two corridors, shared), `baseketball.js` (bases/outs/innings + psych-outs), `penaltyKicks.js`
  (striker bottom half vs keeper top half, real time), `dinnerService.js` (burger line + grill, pass&play),
  `motionTracker.js` (Alien tracker pings + flamethrower, pass&play), `vanishingTicTacToe.js` (3-mark limit; wopr-grid
  is now WarGames). All use `tarantinoKit.js` helpers (label/fx/shake/sfx/halfPointers). The old versions in
  `restored.js`/`skill.js`/`puzzles.js`/`gestureLegacy.js` are now unused. Those later candidates were all rebuilt in the October 2026 audit (below).

- **Minigame audit, Oct 2026 (branch `claude/minigames-audit-polish-s7xpe8`):** see `docs/MINIGAME_AUDIT_2026-10.md`.
  26 weak games rebuilt as new engine files with authentic looks (Atari Pong, Space Invaders ×3 incl. new ids
  `space-swarm-versus`/`space-swarm-coop` in `packs/remakePack.js`, Breakout, Asteroids, Missile Command, Lunar Lander,
  Nokia Snake II, Stacker, Spy Hunter chase, TRON cycles, slither duel, Atari Combat, Scorched Earth, drag race, sumo,
  Nidhogg duel, Tapper, Battle Royale, GoldenEye Facility, Tri-D minichess, putt-putt, Olympic curling, Home Run Derby,
  NES Duck Hunt, Warriors beat 'em up, real dartboard); 8 re-skinned (incl. hockey shootout, Sewer Clash TMNT, Bat & Field ballpark that rotates upright in portrait). Shared helpers in `engines/retroKit.js`
  (`turnRunner` = P1 then P2 on one seed; `fitField`; pixel/vector fonts; glowing pixel sprites).
  Full-bleed for every canvas game: `session.bleed()` (on by default in `s.canvas`; `game.noBleed` opts out), floating
  ⤢/❚❚/✕ icons + score chips; per-game `BLEED_HUD` own/strip/pad in `gameRegistry.js`; `s.ownHud(hide,quiet)`.
  Titles/rules for remakes: `REMAKES` (by engine) and `REMAKE_META` (by id) at the end of `gameRegistry.js`.
  TESTver `c96afdd` merged in: engines with their own full-screen shells (photohunt, kart, marioBros, sotn via
  `engines/fullBleed.js`) set `noBleed` and keep their own fullscreen toggle.
  All only bot/fuzz-tested in headless Chromium; real-phone feel untested.

- **DOOM / DOOM II (Oct 21 2026, ids `doom`, `doom-2`, `packs/doomPack.js`, arcade only):** `src/engines/doom.js` + a JS rebuild of
  the 1993 engine in `src/engines/doom/` (README there): `wad.js` (WAD/pack loading; data order = phone-picked IWAD in IndexedDB
  → `assets/doom/user/*.wad` baked at build (git-ignored, never commit such a build) → Freedoom `assets/doom/freedoom.pack.gz`,
  made by `tools/doom-pack.mjs`), `info.js` (vanilla-numbered states/things so DEHACKED applies; Freedoom's DEH strings/pars used),
  `render.js` (BSP, visplanes, sprites, masked mids, fuzz, COLORMAP light; 200 lines, width follows aspect), `play.js`/`actions.js`/
  `spec.js`/`game.js` (vanilla movement, AI, weapons, specials, line triggers), `hud.js` (status bar + face state machine; ouch-face
  test fixed the intended way), `screens.js` (menus, tally, finales, cast call), `sound.js` (DMX sfx, 8 channels), `music.js` (OPL2
  FM synth on GENMIDI; MUS + MIDI), `heads.js` (roster heads drawn into the 8-bit frame on each sprite's own head, by rotation/mood;
  status-bar face = player's character with Doom's 42 expressions), `savegame.js` (6 slots, IndexedDB). 1P = whole game (death
  restarts the level, each cleared level banks its tally score); 2P = P1 picks level + skill, one life each, score = kills%+items%+
  secrets% +100 exit + up to 100 par bonus. One WANTED monster per map wears a locked character → `s.gameRecruits` (cageGame).
  Touch like the Android port (floating left stick drawn resting bottom-left, right drag turn, tap arms numbers); buttons drawn like the official
  Android app (Oct 27, `drawButton`): crosshair FIRE right + a second above the stick, open-hand USE, pistol = next weapon, map-pin MAP, bare ☰.
  Roster heads are drawn 2x the sprite's head (`HEAD_K`, chin kept at the neck; all-head monsters capped inside the body); render.js
  drawSprite works out clipping half a sprite wider each side (`spr.hx1/hx2`) for them. Tests: `tests/doom-sim.mjs`
  (Node, all 68 Freedoom maps, in test:core), `tests/doom.mjs` (2P flow + touch, 3 sizes), `tests/doom-solo.mjs`, `tests/doom-finale.mjs`,
  `tests/doom-heads.mjs` (head/face contact sheets). Build is ~78 MB now (+20 MB Freedoom). Real-phone feel, audio by ear and
  the owner's own WADs untested (only Freedoom tested).
- **Pinball engine (Oct 21 2026, phase 1 of 4, branch `claude/pinball-engine`, id `bucketheadland-pinball`):** rebuilt as a
  reusable band-table engine (`src/engines/pinball/`, see its README). Real rules: 3 balls each, players alternate balls, no
  clock, extra balls; 1P = solo kind `'game'` (new in solo.js/launcher note): one whole game, won = beat `rules.replay[level]`.
  Table in mm (514x1067, slope 6.5°, 600 Hz physics): accelerating flippers that carry the ball (aim by timing), pops, slings,
  drop bank, standups, spinner, gates, saucer/lock holes, ramps/wireforms as guided 3D paths, kickback, plunger + skill shot,
  ball save, tilt (flick up = nudge), virtual 3-ball lock → JORDAN MULTIBALL. Camera: intro shows the whole table, then the
  view is width-locked in every orientation and pans with the ball (owner's choice; landscape/desktop are very zoomed). 128x32
  DMD strip on top (left-aligned beside the Pause/Exit pills on phones). High scores `profile.pinballHigh[tableId]` (validated
  in profile.js). Phase 2 (Oct 21): engine parts `toy` (moving capsules, `parts[id].tx/ty`), `captive`, magnet grab/fling,
  VUK (`hole toRail` → wireform, `rail noEntry`), rules `tick`/`dmdMode`. Table: upper right flipper `flipU` under the Giant Robot
  toy (5 hits → ROBOT BATTLE: 30 s, robot walks, `beam` magnet grabs + throws, 4 hits wins), Coop = VUK onto the upper flipper,
  Golden Egg captive ball (hits grow the jackpot, every 3rd lights lock). Scoring guesses: replay 3M/6M/12M; jackpot capped 2M,
  super = 3x (bot scores 1.4–21M; `pinball-sim` prints points by source). Phase 3 (Oct 21): rules moved to
  `tables/bucketheadRules.js`: 5 timed ATTRACTIONS started at the Haunted Ride (lit by B-O-T or every 4 ramps): Roller Coaster
  Rush, Nunchuck Frenzy, Big Sur Moon (moving lit shot), Soothsayer (all BUCKET targets), Chicken Coop Panic; all 5 played →
  wizard WELCOME TO BUCKETHEADLAND (4-ball, 5 shots lit, 1M each, relights). DMD animations `tables/bucketheadDmd.js` (player's
  face as dots at ball start, 20 scenes), attract loop with high scores, game-over high-score celebration. Soundtrack:
  `pinball/music.js` + 11 original songs in `tables/bucketheadMusic.js` (attract, plunge, main, one per attraction, battle,
  jordan, wizard); board music stops while it plays. Music never heard by ears. Phase 4 (Oct 21): `pinball/lights.js` light
  shows (sweeps, radial, chase, sparkle...), GI bulbs + blackouts (`m.giOff`), flasher domes (`m.flash`), table `cues[anim]`
  fired by `m.say`; attract light show between balls; renderer polish (beveled inserts with brightness, ramp flaps + decals,
  tinted chrome ball, flipper logos, sheen/vignette); painted backglass intro card; drop-in art slots
  `assets/pinball/<table>/<slot>` (playfield, backglass, apron, logo, character, bumper, toy; build.mjs embeds them as
  `pinball:<table>:<slot>`, `pinball/dropins.js` loads them; optimize-art.py shrinks them, untested here: no Python on the box).
  All four phases done; next = owner playtest feedback, then new band tables.
  Art templates (Oct 22): `docs/pinball-art/buckethead/` = painted art per drop-in slot + playfield guide/parts overlay
  (`tools/pinball-art-templates.mjs`, renders the table modules in headless Chromium).
  Camera rework (Oct 21, owner: fast-ball scrolling was jarring): `R.follow` in render.js is now a critically damped spring
  with a dead zone (goal moves only when the ball leaves 28-68% of the view), smoothed-velocity lead, look-ahead along
  rails/VUK, flippers-first for falling balls, multiball focus on the ball that reaches the flippers first; never lets a free
  ball drop below the view; off-screen arrow at the top edge; optional AUTO ZOOM (`profile.settings.pinballZoom`, tap the DMD
  or V; up to 15% pull-back at speed). `tests/pinball-camera.mjs` measures it: Fold-size 700x840 jolts/min 85 → 0-2, p95
  accel 30k → 11k px/s²; landscape 844x390 132 → 28 jolts but the ball is above the view ~13% (195 mm view is too tight).
  Oct 22 (owner): table `timeScale` .85 (whole physics 15% slower, every shot keeps its line); a ball shot too softly to clear
  the shooter gate rolls back and can be plunged again (`m.canPlunge()` = a ball resting on the plunger, any phase; DMD "TOO
  SOFT / PULL AGAIN"; skill shot + ball save restart; machine-fired balls re-fire themselves). The slower speed exposed a
  flat-top jam on the Golden Egg channel (now peaked) and an upper-flipper ↔ robot loop: robot hits now count only while
  LIT (Robot Ramp / Coop VUK light it once; battle hits always count, 0.8-1 s debounce), payouts capped at x3, a real LOOP
  (left orbit up, right side down in 3 s) pays 50k, the gate return 1k. Replay 1.5M/3M/6M. A perfect flipper can still keep
  the ball cycling upper flipper ↔ robot for small points (no longer farmable).
- **Black Sabbath pinball (Oct 22 2026, table 2, game `black-sabbath-pinball` in `packs/pinballPack.js`, table id
  `black-sabbath`, files `pinball/tables/sabbath*.js`):** different machine: I-R-O-N lanes, WAR PIGS pops, IRON MAN toy
  (steps toward you in his mode) fed by a LEFT upper flipper that a full plunge reaches round the arch (super skill shot),
  INTO THE VOID spinning disc, crossing PARANOID (diverter: right inlane or Graveyard) and ELECTRIC FUNERAL wire ramps,
  Graveyard lock behind D-O-O-M → WAR PIGS multiball, M-A-S-T-E-R → HAND OF DOOM post between the flippers, six album
  modes at the Heaven and Hell saucer → HEAVEN AND HELL wizard, right outlane kickback. New engine parts: `disc`, `flag`,
  rail junctions (`exit.next`), pop-up post (`diverter` a===b, `post` event); music engine: riff track, swing, bell, rain,
  thunder; siren sfx. Source 'Black Sabbath' → wins recruit Ozzy / Iommi / Geezer / Bill Ward. Fixed on the way: a touch
  release mid-pull could fail to launch (canPlunge(400) on release). Tests: `pinball-sim.mjs 6 sabbath` (in test:core),
  `pinball.mjs black-sabbath-pinball`, `GAME=black-sabbath-pinball pinball-closeup.mjs`. Real-phone feel and music untested.
  Art templates: `docs/pinball-art/black-sabbath/` (same format as buckethead's + an image PROMPT per slot in
  IMAGE-SPECS.txt); `tools/pinball-art-templates.mjs --table <id>` now handles both tables (art modules export `logo` and
  `drawCharacter`). The cloud branch `ccr-17e1cdcc-y2g17r` (Bucketheadland templates) is merged into this branch.
  Owner art (Oct 22): GPT-made pictures for all 7 slots of BOTH tables in `assets/pinball/buckethead/` and
  `assets/pinball/black-sabbath/` (resized to the template sizes, WebP q90; uploads not kept in the repo). Buckethead playfield:
  its painted robot was cloned out with sky (the toy sits there). Both playfields are darkened in soft spots under every
  lamp (lamp list read from `buildTable().lamps`, mm×2 = px) so inserts read over the busy art. Drop-in toys now draw their
  shadow and hit flash in the picture's outline (`drawToy` in dropins.js) instead of a box. Custom playfields hide
  logo/character on the table (logo still shows in the landscape banner).
  Flipper pictures (Oct 22): drop-in slots `flipper-left`/`flipper-right` (600x200, pivot (120,100), tip (510,100), right =
  mirror; `drawFlipperImage` in dropins.js, drawn under the balls; only the two bottom flippers). DONE (owner idea): Buckethead's
  strumming hand IS the left flipper. `tools/pinball-art/buckethead-flipper-hand.py` rebuilds playfield.webp + flipper-left.webp
  from `assets/originals/pinball/buckethead/` (GPT empty stage blended in below y 1100, lamp dark spots, logo.webp (now 460 px wide, top
  centre 514,34 in the sky above the B-O-T lanes; it was 510 wide at y 1287 between the ramps), Buckethead scale .5 upright (args `0.5 0`; a .58/26° lean put the pick on the strings but the
  owner disliked the lean and it was reverted) with his hanging hand inpainted out and his wrist on the flipL pivot
  (playfield px 296,1892), hand cut at the cuff, scaled to pivot→pick 120→545, slimmed .85, dark edge + warm glow).
  BIGGER VERSION (Oct 22, current, script default `0.9 0 wrist`): the owner passed on the lean and on an elbow/forearm
  version (GPT art kept in `docs/pinball-art/buckethead/gpt-strum/` + gpt-04/05 originals, `... 0.5 0 elbow`). Buckethead upright
  at scale .9 with the wrist on the pivot, then 44 px lower (`DY`, 2X-6X lamps moved with him to y 760 mm; his hanging sleeve is squashed up so the cuff
  stays on the pivot; `fill_split` fills the hand/old cuff area split along the traced guitar edge `GUITAR`: guitar side
  inpainted, robe side flat shadowed robe with a rim-lit body edge), so the pick crosses the strings at the bridge pickup on the up-stroke; lamp dark
  spots are composited after him (the 2X-6X lights sit on him); the sign moved to the top of the arch (owner) and flickers like a bad bulb (`underlay` hook in render.js, new: table art
  drawn over the playfield under parts/balls; `drawSign`/`signLevel` in bucketheadArt.js: glow + shade layers, hum, stutter bursts
  every ~2.6 s, short dead spells, dims with GI); sleeve layer excludes the guitar (no cream sliver), robe under the cuff is cloth
  borrowed from his robe right of the guitar (x 615-650); guitar
  lower bout partly under the apron.  GPT kit: `docs/pinball-art/buckethead/gpt/`. Suggested re-dos for Sabbath sent to the owner. Tests: `tests/pinball-sim.mjs` (Node bot, in test:core),
  `tests/pinball.mjs [solo] [WxH]` (full 2P/1P flow), `tests/pinball-closeup.mjs` (battle/VUK shots). Real-phone feel untested.
- **King Gizzard pinball (Oct 22 2026, table 3, game `king-gizzard-pinball`, table id `king-gizzard`, files
  `pinball/tables/gizzard*.js`):** THE RATS' NEST = an enclosed upper playfield (inside the loop's inner wall, arc r190
  round 256,256) with its own mini flippers `miniL/miniR` on the same buttons, R-A-T-S standups and the PLANET B scoop;
  it drains between its flippers through a tilted one-way gate (`nestDrain`) into the pops (a flat gate made an endless
  pop↔gate bounce). NONAGON loop = left and right orbits joined over the Nest (`orbitL/R` triggers, loop = up one side,
  down the other in 3 s; 9 loops → NONAGON INFINITY). RATTLESNAKE: hole `snake` is a VUK onto `snakeBody`, a new rail
  type `carry:300, hidden:true` (physics conveyor, renderer skips the ball/rail; `art.overlay` draws the wiggling snake,
  gaping jaws and the bulge where the ball is) that drops the ball out of its tail into the Nest. FLIGHT b741 plastic
  ramp: diverter `flightDiv` (on while something in the Nest is lit) → Nest, else over the top to the right inlane.
  G-I-L-A drops light snake locks → RATTLESNAKE MULTIBALL (super jackpot at PLANET B), K-G-L-W, GAMMA KNIFE spinner,
  GIZZVERSE saucer → six album modes → OMNIUM GATHERUM wizard. Source 'King Gizzard': band members added to the
  roster via referencePack (Stu Mackenzie, Ambrose Kenny-Smith, Joey Walker, Cook Craig, Lucas Harwood, Michael
  Cavanagh). Spinners now take a label (Sabbath's said NUNCHUCK). Art templates `docs/pinball-art/king-gizzard/` (6
  slots, no toy). Tests: `pinball-sim.mjs 6 gizzard` (in test:core, with a scripted albums/wizard/infinity/multiball
  check), `pinball.mjs king-gizzard-pinball`. Real-phone feel, balance and music untested by ears.
  Owner art (Oct 22): all 6 slots in `assets/pinball/king-gizzard/` (GPT, from the `gpt/` kit). The playfield was remapped
  vertically in sections (planet → Nest, nonagon circles → nonagon lamps, wizard between the slings), its three painted
  bumper discs moved under the real pops (inpainted old spots), darkened under the lamps. Bonus X lamps moved from a row
  at y 738 (on the art's title) to an arch over the wizard's hat (y 786-808).
- **Pinball on iPad (Oct 23):** pinball wouldn't launch on an iPad. Cause (reproduced in Chromium with a WebKit-style canvas
  memory cap, not on a real iPad): render.js cached two table layers up to 14M px each (56 MB) and rebuilt them on every drop-in
  image load and rotation, while Safari keeps counting dropped canvases until GC; over its cap (RAM/4, often 224-384 MB)
  `getContext` returns null and `layer()` threw every frame. Now layers are capped at 8M px (phones never reach it), old
  layers are freed (0x0) before a rebuild, `invalidate` marks stale instead of dropping, and a refused layer retries at half k.
  Scratch test idea: hook `getContext` to refuse past N MB and rotate the viewport (iPad 1024x1366 @2x).
- **Pinball view settings (Oct 22, every table):** ⚙ and ⤢ buttons (`.pb-tools` in pinball.js) sit left of Pause/Exit when
  the backbox has room, else just under them; the faint bottom-centre ⤢ of fullBleed is hidden on pinball (owner couldn't
  find it). ⚙ opens TABLE SETTINGS (play frozen while open): Zoom 5 notches (`R.cam.zoomK` 0 = whole table scaled to the
  height .. 1 = width fills the screen, default 1, linear in scale; `R.view`), Ball speed 5 notches `SPEEDS` .8-1.2 × the
  table's timeScale (default 1 = as built), Auto zoom toggle. Saved in `profile.settings.pinballView {zoom,speed}`
  (validated in profile.js), shared by all tables. King Gizzard DMD: `text()` in gizzardDmd.js closes letter spacing,
  then dims the art and uses the full width, then wraps, so no message runs off the 128-dot panel (they did); the dragon
  hurry-up line is shorter. Audit script idea: render every m.say through its scene and flag text past x 0..127.
- **Save safety (Oct 23, owner lost progress on both phone shortcuts):** saves are localStorage per browser + address, so
  another browser, a new file location or the browser clearing site data = empty save (nothing in the game wipes it except
  Settings → Erase). `src/saveGuard.js`: `keepSave()` asks for persistent storage (no eviction on low disk) on New Game and
  on backup/restore; title screen shows 💾 BACK UP PROGRESS once 5+ unlocks/runs since the last export (`profile.backup`
  {at,mark}, validated in profile.js); an empty save shows a "Restore a backup" footer link; exports are dated
  `ShambConkins-save-YYYY-MM-DD.json` (Downloads). The first-tap fullscreen skips backup/import buttons (entering fullscreen
  used the tap and the file picker then refused to open). Test: `tests/backup.mjs`.
- **PWA / install as an app (Oct 23):** `src/pwa.js` (no engine changes): favicon + apple-touch-icon (embedded), and when
  served over http(s) a `<link rel=manifest>`: the folder's `manifest.webmanifest` if present, else a Blob manifest built
  from `PWA_MANIFEST` (defined once in tools/build.mjs, injected at `/*@@PWA_MANIFEST@@*/`) with absolute start_url and
  embedded icons (Chrome rates both installable). `build.mjs --pwa [dir]` (default dist/pwa; `npm run release` writes
  `releases/ShambConkins_vX_pwa/`, the release workflow zips it as an asset) = index.html + manifest + `sw.js` (cache-first,
  BUILD = version + html hash, skipWaiting/claim, old caches dropped; toast on update) + icons/. Icons from the owner's SC
  logo (`assets/originals/brand/sc-app-icon.png` → `assets/pwa/`, maskable at 66% for the safe circle). Title-screen ⬇
  `.ts-install` shows only after `beforeinstallprompt` (or on iOS); Settings row "Play as an app" when served and not
  standalone; `installAppFlow` (app.js) explains the browser menu when there's no prompt. First-tap fullscreen skips it.
  Asset inliner now accepts subfolders (`assets/pwa/...`). file:// pages get no manifest. Test: `tests/pwa.mjs`.
  Oct 23 follow-up (owner installed it from shambconkins.loki-mylo.work, Cloudflare): manifest `display:'fullscreen'`
  (installed app opens full screen; `APP_FULLSCREEN` in fullscreen.js, checked at load, makes `fullscreenSupported()` false
  so every ⤢ toggle hides); first-tap fullscreen is no longer used up by a backup/restore/install tap. Loading screen
  `#boot` at the top of index.template.html (own inline style + tiny script; build runs inlineAssets + `@@VERSION@@` on the
  template): logo, CSS-animated bar timed from `sc-boot-ms` (last start, saved by `bootScreen.js` `bootDone()` after the
  first showView), text Setting up / Updating to vX / Starting (from `sc-boot-version`); it paints ~0.3 s in, the start
  itself is ~20+ s at 4x CPU throttle. sw.js streams index.html and posts `sc-download` {got,total,done}; pwa.js shows the
  `#sc-dl` bar ("Saving for offline play" / "Downloading update"). Chrome badge on the home icon = a pinned SHORTCUT, not a
  WebAPK: happens when Google's WebAPK server can't fetch the manifest/icons (blob manifest = only the HTML deployed, or
  Cloudflare Access/bot challenge); fix = serve the `_pwa` folder publicly, remove the shortcut, reinstall.
- **Online duels, phase 1 (Oct 23, 2 phones):** rooms = Durable Object `Room` in `cloudflare/worker.js` (`/room/<name>`
  WebSocket, names normalised like "pizza-night", seats 0/1, hello {id,name,character,owner,v} → welcome/join/leave/msg/full,
  same client id (sessionStorage `sc-net-id`) reclaims its seat; hibernation API, ping auto-response). Binding `ROOMS` +
  migration `rooms-v1` in `cloudflare/wrangler.toml`; deployed by `.github/workflows/deploy-worker.yml` (wrangler-action,
  secrets CLOUDFLARE_API_TOKEN/ACCOUNT_ID; the dashboard paste can't add the binding). `src/net.js` = connection (host =
  the site itself, else shambconkins.loki-mylo.work, override localStorage `sc-net-host`), reconnect with backoff.
  `src/duel.js` = Arcade "🌐 Online" mode (`store.online`, `store.onlineWho`): room dialog, challenge → accept (30 s),
  simultaneous challenge → seat 0's wins, both run `requestGame({solo:true,duel})`; launcher `duelSeed` (seed
  `${seed}-${game.id}-${round}`), live score chip `#duel-chip` (progress every 1.5 s), `settleSolo` awaits `duel.finish()`
  (waiting dialog, forfeit if the other leaves/quits) and shows both scores + Rematch. Only `duelOK` games (solo.js: kinds
  levels/rounds/turns/game/alone) — CPU-kind games are "Not online yet". Tests: `tests/online.mjs` (two contexts vs
  `wrangler dev`). net.js splits messages over 5000 chars into parts (the room drops >16 KB), pings every 10 s and
  reconnects a socket silent for 35 s.
- **Online board game, phase 2 (Oct 24, branch `ccr-206256d0-lz2tp5`):** `src/netBoard.js` + seams in `src/netHooks.js`
  (no imports). Room line "🎲 Board game together" (`online-board`) → invite → both open New Game (`store.netSetup`: own
  panel + `remotePanelHTML` of the other pick, host has the options/start; versus/horror only) → host `startRun` sets
  `run.online={room,host}` and `hostBegin`. HOST runs app.js unchanged and keeps the save; GUEST mirrors (`store.run` =
  copy, own save untouched, `saveRun` skips the run). Host sends `start` (full run), `state` (run minus boards; `board`/
  `mainBoard` only when changed) on updateBoard/saveRun, `fx` (levelCard/effects/warpFx/roulette/sound/toast/music/
  recruit... each calls `fx()`; guest `FX` table), `dlg`/`route` (ui `showDialog`→`netDialog`, routePanel `showRoutePanel`
  →`netRoute`; owner = `opts.player` ?? `run.current`: the owner's phone answers, the other shows it read-only via
  `openDialog({watch})`/`openRoutePanel({watch})`), `task` (Pokémon battles/Center/team via `netTask`: run on the
  guest's phone, the guest's run comes back and `adopt` syncs it in place), `game` (board minigames: launcher online
  branch after the roulette → `hostGame` → duel.js `boardDuel`, both phones play the 1P version, `settleSolo` board path
  reports {score,won,recruits}; host `settleGame` with both scores, co-op for bosses/horde = either won). Only `duelOK`
  games are dealt (`setPoolFilter` in gameRegistry; trivia/casino spaces deal from everything). Guest taps on
  roll/reroll/item/bag/pkmn go to the host as `act`; the host's own buttons say "AMBER'S TURN" (`theirTurn` in ui.js,
  `store.netBoard.live`). Recruits for the guest's player land in the guest's profile through profile.js `recruit` → fx.
  Robustness: host messages are numbered (`n`, gap → guest `hello` → fresh `start`), 4 s beats, unanswered questions
  re-sent after 8 s, answers cached by id; a dropped guest → host "Keep waiting / Play it on this phone" (`takeOver` =
  pass and play until they say hello again); guest Home = "Leave" (`bye`), room line then offers "Rejoin". Host Home =
  `pause` (guest waits), Continue = `start` again; a restarted host rejoins `run.online.room` itself. Same VERSION needed.
  Tests: `tests/online-board.mjs` (TURNS, PKMN=1 wild battles, DROP=n drops the guest mid-decision, DEBUG=1 traces;
  bots answer only what their phone may answer). Not yet tried on two real phones.
  Oct 27 sync audit: `state` carries only changed run keys (`set`/`del`) and board patches (`bp`, per top-level key and
  per node; board.rng changes used to resend the 90 KB board several times a turn); dialog pictures go as `sc-art:a|f:<key>`
  (ART / FACE_ART, same build on both phones) or once as a hashed `sc-blob` the guest asks for ({t:'blobs'}); a 15-turn run
  went from ~14 MB to ~2 MB. Guest-owned recruits are also kept in `run.online.gave` (applied on start/state, idempotent).
  A guest that sees a numbering gap keeps sending `hello` every 3 s until a `start` arrives; `start` carries the host's
  session id `sid` (a restarted host's question ids don't hit old cached answers); a guest in the board's own minigame takes
  a `start` quietly. A dialog/battle/game sent while the guest's own Leave/settings/log dialog is open waits for it
  (`afterLocal`, `localBusy` in netHooks). Test options: ROOM, STALL=n / LOSE=n (3 s held / lost messages, both phones in
  turn), PAUSE=n (host Home + Continue), WARP=1, DEBUG_OUT=path (message logs), message counts per kind at the end.
  Uno online was broken (both phones stuck after the first move): its buttons used `casinoTap`, which started the casino
  table relay as a second reader on s.online and swallowed Uno's moves; `casinoTap(...,{relay:false})` now (uno.js).
  Known limit: the host's profile decides what can be recruited for the guest's player (its rosters for both owners);
  a character the host phone already lists for the guest's owner is never offered, even if the guest's phone lacks it.
- **1-player board game vs CPU + Choose Characters (Oct 24, branch `ccr-47c456d6-mv2k8z`; kept apart from the online work):**
  Title screen CHOOSE CHARACTERS (`players` view = `setupHTML(...,{pickOnly:true})`): names + heads saved in
  `profile.settings.picks` {names,chars} (validated in profile.js; app.js falls back to the starter if a pick is locked),
  used by New Game and the Arcade (`store.setupSelected`). Both pages carry `playersStripHTML` (ui.js): 2 Players / 1 Player vs
  CPU, YOU Sean/Amber, CPU Easy/Normal/Hard = the Arcade's own `profile.settings.solo`. 1P New Game: `makeCpuRun`
  (src/cpuBoard.js) puts the human in seat 0 (players reversed if Amber plays, so rosters/starting items stay with owners),
  CPU in seat 1 named "<first name> (CPU)", `run.cpu={seat:1,level}`; modes versus/horror only. Seams in `src/cpuHooks.js`
  (no imports, like netHooks): `showDialog` → `cpuDialog` (CPU's dialogs with 2+ choices open read-only "… is thinking",
  then it picks, primary-weighted; Continue-only cards and anything with a start/fight/again choice stay the human's),
  `showRoutePanel` → `cpuRoute` (lights a road, shortcuts tempt it more on Hard), `theirTurn` → `cpuWaiting` (roll/items off),
  `recruit` → `cpuBlocksRecruit` (the CPU's owner gets no characters during board play). A 300 ms tick rolls for the CPU
  (sometimes uses an item first, `run.cpu.itemTurn`); its Pokémon battles run on the GB autopilot (`cpuPk` wraps
  pkWild/pkTrainer/pokemonCenter). Minigames: `boardCpuKind` (solo.js) = 'cpu' or 'alone' kinds only; `selectBoardGame`
  filters by it on run.cpu, the launcher swaps id'd games without one; board session gets `session.solo={kind,board:true,...}`
  so engines drive P2 as the CPU, and settles through `settleGame` (alone → co-op result from `s.solo.won`); Exit = normal
  board exit (no banking). Test: `tests/solo-board.mjs` (WHO=1, TURNS=n). Real-phone feel untested.
- **Native online games, phase 3 batch 1 (Oct 24-25, built on `ccr-206256d0-lz2tp5` from another account; Oct 25 merged with
  the 1P-vs-CPU work + visitor fix on `ccr-417ed8e4-pn7r0u`, not released; owner wants more batches before the next release, v0.67.0):** owner chose
  NATIVE online per game (not screen share), a batch at a time. `src/netPlay.js` `openChannel(mid,me)`: ordered move channel
  {k:'np',mid,i,m} (`send(m)`, `next()` → the other phone's next move or null when they left, resend on reconnect). Launcher
  `netGame` (gameLauncher.js): for `netNative(game)` (solo.js `NET_NATIVE`, also feeds `duelOK` so arcade Challenge + online
  board deal them) the real 2P game runs on both phones from the duel seed, same player order, `session.online` = channel
  (`me` = duel.who), `hotseat` on; result via `settleSolo` kind 'net' (each phone reports its own score, board path as phase 2).
  cpuKit `isOnline`/`remoteSeat`. Converted: trivia ×9 (trivia.js + triviaModes.js: seeded difficulty/questions ignoring
  history, moves {a: answer index|null, t: lightning secs, w: wager}), chess + checkers (classicBoards playSquares: moves {f,t,p},
  {resign}; Black's phone sees the board turned round; draw offers off online), Uno (moves {p,c}/{d}/{x}/{u}/{to}; each phone
  shows its own hand), Beer Pong (pubPhysics: shooter sends {sh: throw, hit: cup|-1}/{rr}/{sh:null}; fixed 1/180 s steps online,
  watcher replays on cup copies and forces the shooter's outcome). Each has `s.debug.bot` online for tests.
  Test `tests/online-native.mjs` (GAMES=id,...; needs wrangler dev, `npx --yes wrangler dev --local --port 8787` works in the
  cloud box): Oct 25 after the merge all 13 batch-1 ids pass (all 9 trivia, chess, checkers, Uno, Beer Pong incl. the watcher
  crash fix; a full Beer Pong match runs to last call in ~4-5 min headless, the test gives it 1.75x LIMIT_S). Run the ids in two
  groups: a game stuck at the limit leaves the room busy and the next challenge times out. `tests/online-board.mjs` banks native
  games like 1P ones (`nbank`); the board dealt Ten Forward Chess on a 30-turn run and both phones carried on. 1P trivia vs CPU
  and `tests/solo-board.mjs` still pass after the merge.
  Trivia carries both seams: the online move relay (`net`) and the CPU's visible turn (`cpuTriviaTurn`); answer lines name
  the player when `cpu||net`. CHANGELOG has an "Unreleased (next release: v0.67.0)" section: rename it `## v0.67.0` when releasing.
  Batch 2 (Oct 25, same branch): Connect 4 `four-lights` (moves {c}), Reversi `strategema-grid` ({r,c}; a no-move skip happens
  on both phones by the rule), Yahtzee `full-shambyahtzee` + `cheaters-yahtzee` (yahtzee.js: {h: held} per hold change, {r: dice
  values} per roll so dice never depend on matching RNG, {c: category}); waiting phone's buttons off + "PLAYING ON THEIR PHONE".
  All 4 pass online-native; 2P fuzz and 1P vs CPU still clean.
  Batch 3 (Oct 25): casino ×4 (`blackjack`, `five-card`, `roulette`, `bond-baccarat`) through ONE relay in casinoTable.js
  (`tableNet`): seat 1's phone (me 0) referees every `casinoTap`/`casinoChange` (its own at once, the other's requests {q} in
  arrival order, dropped if not runnable now) and sends {t: control key, v}; the other phone runs only those, waiting until the
  control is usable, so both draw the same seeded shoe. Key = id, else nearest id'd ancestor + index among its buttons/selects.
  Remote seat gets `.remote-seat` (no pointer events). Poker shows your own hand on your phone. `casinoBot` = online test bot.
  Guess Who `traitors-guess-who` ({q: label}/{a: id}/{n}; own secret only), Battleship `battleship-fog` ({fleet} once, then
  {f:[x,y]}; the other fleet stays hidden; their turn = watch shots land on your fleet). All 6 pass online-native (ROOM=name
  runs two test rooms at once); 2P fuzz + 1P CPU clean.
  Batch 4 (Oct 25): Liar's Dice (both roll the same hidden dice from the seed, own cup only; {type:'bid',q,f}/{type:'liar'}),
  Clue Whodunit (`clue.js`, deduce mode only: {sg:[ids]}/{ac:[ids]}/{e}; watcher = the CPU's "investigating" screen; shown card
  picked the same way on both), Monopoly Speed Die ({a:roll|buy|pass|card}/{bus:n}; dice from the seed; `cpuTurn` guard blocks
  the other's turn) + Auction (both bid at once, {lot,bid}, reveal when both are in). All 4 pass online-native.
  Clue Lineup is a real-time tap race: left for the real-time phase (a relay would favour the referee phone).
  Batch 5 (Oct 25): Simon `simon-faceoff` (each tap {t: pad|-1} streams to the watcher, fed into onTap like the CPU; only the
  tapping phone runs the too-slow clock), Price Is Right `price-bid-off` (both bid at once, {r,bid}), Hangman Showdown/Wanted
  (hangman.js: {g: letter}, {to:1} = shot clock ran out on the shooter's phone (the watcher's clock just stops at 0), {w:{text,cat}}
  = the writer's bounty; guesser sees blanks; `netWait` overlay while the other writes). Quick Draw (`django-hangman`, both shoot
  at once) left for the real-time phase like Clue Lineup. All 4 pass online-native.
  Batch 6 (Oct 25): classicBoards.js `netTurns(s,{isTheirs,apply})` helper (ordered reader, waits for this phone's animation
  and their turn): Ultimate `matrix-ultimate` {i}, Mancala `greed-island-mancala` {p} (extra turns by the rule on both),
  Dots `office-dots-boxes` {o,i}. All 3 pass online-native; chess/checkers 2P fuzz still clean.
  Batch 7 (Oct 25, branch `ccr-70ac8fd3-pxs9bs`, fast-forwarded from `ccr-417ed8e4-pn7r0u`): Tri-D chess `trek-mini-chess`
  ({m:[r,c,tr,tc]}, violet's phone sees the board turned round via `R()`, only the mover's phone runs the 45 s clock; a
  timed-out random move is sent like any other), WarGames `wopr-grid` ({i}), N-Spade `smb3-nspade` (smb3.js, {k: card}; same
  table from the seed). All 3 pass online-native; 2P fuzz + 1P CPU clean. That finishes the turn-based CPU games.
  Batch 8 (Oct 25, same branch), the first REAL-TIME games: fairness by each phone's own clock, no referee phone.
  Clue Lineup (clue.js): each phone shows only its own pad; one final {r, a: card id|null, t: secs since ITS question
  appeared} per round (wrong = locked out, null = 8 s or too late to beat the other's right answer); both phones resolve
  when both are in (faster right answer wins). Quick Draw `django-hangman` (hangman.js `qd*`): one keyboard each; shots
  {r,g,t} stamped with the phone's own round time + heartbeats {r,hb} every .3 s; both phones apply all shots in time order
  (tie → P1); a shot arriving after later ones replays the round silently (`quiet` mutes the SFX proxy/vibrate/floats); a
  shot stamped past this phone's clock waits until it gets there; the round ends (solve, both hanged, sundown at CLOCK)
  only when min(own time, other's last reported time) passes that moment. Stress test (scratch: 0-700 ms random send
  delay, both bots fighting over the top 3 letters): ~15 replays a round, all rounds identical on both phones. Both pass
  online-native; 2P fuzz, 1P CPU and tests/hangman.mjs clean. Once (not reproduced in 3 reruns) Showdown froze mid-reveal
  on both phones after clue-whodunit in a 3-game online-native run; watch for it.
  Batch 9 (Oct 25, same branch), physics shot games, "shooter streams": the shooter's phone runs the physics and sends the
  shot, snapshots ~12/s (the other phone eases its pieces toward them, runs no physics) and a final exact state; both phones
  then run the same end-of-shot rules from that state (fin positions are rounded and applied on the shooter too). Curling
  {th,sn,fin}; Scorched Earth {aim,fire,ex(+bugs),sync,skip}, field fixed at 390x780 online (size came from the screen);
  putt-putt {sh,sn+gopher,fin{x,y,n,k,w}}; nine-ball {aim,f(+cue spot),sn,fin{b,r}}; BASEketball {sp,l in court units,res},
  psych-out = defender asks {ps}, batter's phone decides {psd}. All 5 pass online-native; 2P fuzz + 1P CPU clean.
  Batch 10 (Oct 25, same branch), side-by-side games: `engines/netField.js` `netField(s,{pack,unpack,onEvent,hz})`: this
  phone plays only its own field; snapshots {f} ~10/s when changed (`push()` = now), events {e}, final {fin} (`finish(v)`,
  `remoteDone()`), all on s.online. Stacker {r,stack,row,...} pushed on every stop (other row slides locally); drag race
  (own car vs own tree, own ET; online a race ends only when both ETs are in); Block Battle (own board, garbage {e:{g}},
  ends from both finals {score,dead}); Shred Hero (own highway wide, other narrow on its own song clock, hits {e:{n,h}},
  waits for the other's final score); Color Card Dash (Lineup-style: one final per card {r,k|lic,t,w}, wrong taps taken off
  first, then fastest right tap / first licorice toucher); Ladder Rush (own ladders full screen, other = progress line, first
  finishT wins, a phone past the other's finishT ends at once). All 6 pass online-native; 2P fuzz + 1P CPU clean.
  Batch 11 (Oct 25, same branch): Brawndo `brawndo-fruit-merge` (netField; own jar physics, other jar from fruit snapshots;
  own jar freezes once its final is sent), Gumdrop Catch `candy-gumdrop-catch` (netField {x,score,stick,flash}; the other half
  runs the same seeded candies and just removes what its basket touches), pancakes `review-pancakes` (netField, own clock,
  same seeded calls/golden stacks), Skynet `terminator-scan` (taps anywhere online; walker pauses now from a seeded `wrnd`
  per round; every tap {c:[r,t,k,m]}; `rescore()` rebuilds both scores from the whole tap log: a Terminator = earliest
  tap, humans −1 with the clamp in time order; other phone's taps wait until this phone's round clock reaches them; {fin:1}
  then both finish), Microgame Rush ×2 `microgame-rush`/`rush-marathon` (both deal the same microgames from s.random; own
  full screen via `netLayout`; {r,res,at}; points once both results are in). All 6 pass online-native; 2P fuzz + 1P CPU clean.
  This clock-stamped timeline is the pattern for other race games.
  ARENA PROTOTYPE, Pong `pong-duel` (Oct 25, atariPong.js): tried HOST-AUTHORITATIVE first (seat 1 runs the game, guest sends
  its paddle, draws snapshots): measured with `tests/online-lag.mjs` (LAT_LO/HI ms delay + jitter, frame-rate bots that
  steer toward the ball they see), the guest reacts ~2x the lag late (sees the ball late AND its paddle arrives late): bot
  guest lost 4-7 at ~0 ms, 0-7 at 80-150 ms. Shipped instead: NO HOST. Physics on one fixed court (`FIELD` 724x390, not the
  screen), both phones fly the ball; each phone judges only ITS OWN paddle and sends {e:{hit:[u,v,du,dv,hits]}} / {e:{miss:sc}};
  at the other paddle a phone GUESSES from the streamed paddle (bounce back, or fly on and wait off court) and the real call
  replaces the ball (advanced by the time since, `catchUp`) with the difference eased out (`off`, 9/s). Paddles {p} 30/s,
  `nf.sync('serve')` (new in netField) starts both together, serve dirs from s.random on both, seat 1 calls the 2-min cap,
  seat 2 sees the court turned round. 80-150 ms: stalls 0.3%, motion p99 .038 vs .029 at 0 ms, max ~.5 on a wrong guess;
  outcomes even; result cards always agree. LESSON for the other ~38 arena games: a host-authority model handicaps the guest
  in reaction games; prefer "each phone is the authority for its own player and for what hits it" (both run the shared
  world from the seed, send own position/inputs + events like hit/death), and only use a host for contested shared physics
  (sumo pushing, a shared ball both can touch at once), then with own-avatar prediction. Next: apply per game a batch at a time.
  Batch 12 (Oct 25, branch `ccr-0da72c03-ws0idl`, fast-forwarded from `ccr-70ac8fd3-pxs9bs`), arena games on that rule:
  `netField` gains `start(tag)` (sync, then seat 1 times 3 pings and both start within ~half the jitter; events are stamped
  with time since it). `directionGestures` gives every touch/key to `s.online.me`. Each game: fixed world on both phones,
  turned per phone (matrix `M`/`VM`: you start at the bottom, sideways phones turn 90°), online HUD below the duel chip.
  TRON `derezzed-cycles` (46x84 grid): own cycle only, every cell stamped {s:[round,x,y,ms..]} ~30/s; a cell they entered
  first (or within TIE .05 s) is a wall, one learned late derezzes you where you entered it (`retro`); {dead} provisional,
  {out} final once their stamps pass your crash time (or they're out); both settle from the two outs. Slither
  `snake-v-snake` (420x740): own snake + own death; other body rebuilt from 20/s heads; 70 pool orbs placed by seed+slot+
  generation (eating moves the slot on, so phones converge) + own drops; die event carries the killer (+50) and the body
  orbs; end waits for both {fin:{p}}. Combat `metal-gear-tank-duel` (upright 12x20 maze): own tank, shells flown on both
  phones from {fire}, each phone judges only hits on its own tank ({hit:[shooter,id,n]}); score = the other phone's hits
  taken, end from both {fin:{h}}. Sword `kill-bill-duel`: player 2's hall mirrored; the victim's phone resolves the other's
  thrust ({th} starts it there) as parry {pr} or kill {die}; {sp} respawn, {esc} escape, {tu} time-up progress (both settle).
  Bots: `s.debug.bot` = the CPU brain on your own side (TRON at Easy so rounds end). `tests/online-native.mjs` LAG=80-150 delays
  every message; all 4 pass with and without lag, Pong/Block Battle/drag race still pass; 2P fuzz + 1P CPU clean.
  Batch 13 (Oct 25, same branch): `roundOutcome(nf,round)` in netField.js = round result when each phone judges only its own
  death and a death is never found late: die(t,extra)/timeUp(extra) send the final {o:[round,'f',ms|-1,extra]}; tick(now)
  declares you alive once your clock passes their death by tie (.1 s); result me/them/none (both down within tie, or both up
  at time-up; `R.extra/theirExtra` break it, e.g. Bomber crates). arenaKit `arenaTouch`/`arenaKeys` give touches/keys to
  `s.online.me`. TowerFall `arrow-arena` (fixed 12x19 tower, own archer, arrows {f} flown on both phones without catch-up,
  victim judges arrows + stomps {k}, pickups {pk}). Battle Royale `battle-royale-island` (player 2's island turned round via
  separable sx/sy flip; zones on the shared round clock `annAt`; shots {sh} with ids, melee {m} judged at the distance shown
  on the victim's phone, {hit} back to the attacker, {k}, {bag}; online test bot walks round trees). Bomber `bomber-duel`
  (upright 9x13, player 2 turned round; bombs {b:[id,cell,range,ms]} explode at plant+1.8 s on both phones, earliest first,
  chains at once, so crates/pickups match (checked under lag); time-up winner = more crates, each phone's own count in the out).
  Pac-Man `pac-maze-duel` (player 2 turned round; own chomper ticks every .12 s on the shared clock, {t:[tick,cell,dir,lives,
  pow,ate]}; ghosts are a deterministic sim on both phones steering by each player's state PAC_DLY=3 ticks earlier and waiting
  for the other's report; eaten ghost {ge:[g,step,pts]} goes home at a step the other phone knows in time; contested pellet =
  earlier tick; `net.glog` per step: identical on both phones under 80-150 ms lag). All 4 pass online-native with and without
  lag; 2P fuzz + 1P CPU clean, other arenaKit games fuzz clean. Space Invaders versus (shared formation/bombs/bunkers) waits
  for the shared-world batch (air hockey, sumo, dodgeball...).
  Batch 14 (Oct 25, branch `ccr-b69e91e7-srvscq`, fast-forwarded from `ccr-0da72c03-ws0idl`), the rest of arenaPack except Hippos:
  Driller `driller-duel` (netField side-by-side: own shaft full screen, fixed 7 cols, other = race-strip dot + HUD from {d,l,a,x,ft};
  run ends at goal/out/time/past their finish time, settle from both finals like Ladder Rush), Bubble `bubble-battle` (own field
  wide, fixed 7 cols + danger row 14, other = small copy in a SIDE column from {g,o,sc,in}; garbage {e:{g}} flies in from the copy;
  roundOutcome die/timeUp with score as extra), Snowball `snowball-fight` (fixed portrait yard NW 480 x NH 860, point-symmetric
  seeded layout; each phone simulates in its own frame, player 2's turned round, everything crossing over goes through `flip()`;
  victim judges hits {h}, thrower guesses and drops the ball; walls carry `dmg[owner]` and only the thrower's phone counts its
  damage {wd}; built walls {w} name the one they replace), Disc `disc-duel` (like Pong: no host, fixed CH 560, view turned via
  `FL`; each phone is the authority for its own half: catches {c} (online a catch needs the disc in your half), goals/landings
  {pt}; throws {th} carry the full disc state + time, the other phone flies it on by the delay (`applyThrow`, `flyDisc`); a guessed
  catch at the other catcher, a 'wait' at the far line; `rally` counts serves, events carry k, early throws wait in `pendTh`;
  time-up = {tu:1} handshake so both have the same points, then win or golden point (rally 1000), {tu:2} ends overtime).
  Test bots: `s.debug.bot` = the CPU brain on your side (Disc's sits out 4 s in 12 so goals happen; Snowball's also builds walls);
  Disc `s.debug.skip(s)` moves its clock on (time-up/golden point checked under lag). tests/online-native.mjs: SHOT_S=n
  screenshots n s in, VIEW=WxH phone size; at 1100x700 headless runs ~3x slow (game time is frame-capped), give LIMIT_S=420.
  All 4 pass with and without LAG=80-150 at 390x780 and 1100x700; 2P fuzz + 1P CPU clean.
  Batch 15 (Oct 25, branch `ccr-6d52b7c8-fuaau5`, fast-forwarded from `ccr-b69e91e7-srvscq`), shared-table games:
  air hockey `rink-rivals` (airHockey.js; fixed 680x420 table turned per phone; a paddle never reaches past the line, so the
  phone whose half the puck is in steps it at 240 Hz with its own paddle only (`puckSub(...,only)`), calls goals into its goal
  {g} and hands over at the line {c:[tick,x,y,vx,vy]}; a hand-over replays this half from its tick with the own paddle's
  recorded path (`hist`), exact. Paddle {p} with tick + puck {pk} stream 30/s; the other half is SHOWN lagT+SGAP ticks back
  (paddle and puck from those samples, straight lines between puck snapshots, `dispAt`/`dispTick`), catching up over your near
  half; time-up {tu:1}/{tu:2} handshake. NETSTAT=1 prints `s.debug.net` (jumps): 0 ms lag median 5 px, 80-150 ms median ~15 px
  per snapshot but ~100-200 px catch-ups when they strike right at the line (eased, cap 140)). Sumo `taskmaster-sumo` (own suit
  only, each phone applies its own half of a shove from the other suit as it shows it; own ring-out → roundOutcome, both out =
  rematch; bouts start with nf.start; player 2 turned round). Hippos `hungry-hungry-heads` (fixed 420x760 board, same view on
  both; seat 1's phone runs spits + marble physics, {ms} snapshots 12/s pull the other phone's copy; each phone judges its own
  bites {c:[t,[[id,v]..]]}, `rescore()` = earliest bite owns a marble, both logs → same scores; fin waits for the other's).
  Dodgeball `underdog-dodgeball` (`dodgeballOnline` in newGames.js; court turned per phone; victim's phone calls {hi}/{cg}/{ms},
  picker {pk}, thrower {th} with state + round clock; my throw freezes at their player until their call (600 ms timeout); hearts
  by -1 events; roundOutcome per round, the 95 s total kept by adding each round's length from the two outs). Test bots on all.
  All 4 pass online-native with and without LAG=80-150 at 390x780 + 1100x700; 2P fuzz + 1P CPU clean.
  Batch 16 (Oct 25, branch `ccr-184b3db2-2nbkb6`, fast-forwarded from `ccr-6d52b7c8-fuaau5`), the six Tarantino games
  (tarantinoKit `halfPointers` online: `chooseOwner:()=>me`; keys remapped to me). Standoff (reaction race like Quick Draw:
  rounds start with nf.start, same seeded fakes/T; one report per round {o:[round,kind,v]}: f = flinch at v s into the
  stare, d = drew v ms after DRAW!, b = triangle second tap ms (-1 none), n = no draw, w = "my clock passed your moment
  without acting"; `decide()` on both phones; the triangle winner's phone runs TAP AGAIN locally after every draw).
  Twist (Shred Hero layout: own lanes 68% left, other 32% on its song clock {clk,score,combo,groove}, hits {e:{n,h}}, finale
  waits for the other's final). Adrenaline (own patient 64% left, `TW[i]` per patient; rounds via nf.start; needle {r,u,v,d}
  in patient widths, plunge {pl:[round,res,u,v]}, round wraps when both are in). Bounty (own street 64%, fixed 2x4 grid
  online so the seeded pattern matches; hits {h:[poster,hp,pts]}; end waits for the final). Crazy 88 (fixed 430x780 hall
  drawn scaled (`V`), no slow motion, separate seeded streams for waves / O-Ren's guard / her summons (summon ids from 1e5);
  each phone judges its own swipes and Bride: {k:[id,t,pts]} (both cut it → the later phone takes its points back),
  {d:[id]} chip damage, {bh:[interrupt]}, {hu:[id]}; a fighter reaching the other Bride waits for her phone's call;
  snapshots carry score/stamina/trail; end waits for the final). Stunt Chase (fixed road from a 480x640 reference, view
  shows more/less; own car only, the other from {r,t,y,x,v,...} moved on by v·(t since); pickups/barriers {og}; the
  RUNNER's phone calls ram/escape {end:[round,kind,t]} and both score from it; bot = CPU brain on your car via `autodrive`).
  All 6 pass online-native with and without LAG=80-150 (390x780); 2P fuzz + 1P CPU clean.
  Batch 17 (Oct 25, same branch), South Park ×3 (`southPark.js`; arenaTouch/arenaKeys already give everything to `me`).
  Poofs + Kenny side by side: `halves(s)` online = own 64% left (`SPLIT`), `netStart` (nf.start before the countdown),
  `netEnd` (final score swap); Poofs catches {g:[snack,pts]} + {u,sc,o} snapshots; Kenny threats carry their schedule `idx`,
  zaps {z:[idx,hp]}, killed Kenny {kd}; the other half's threats just vanish at Kenny. Dodgeball on one court: physics and
  hit tests on a fixed 390x780 reference (`REF`, `hitRef`), player 1's view turned round (`flip`, also flicks/keys); throws
  {th:[id,u,v,du,dv,t]} flown on by the delay; your phone calls hits on you {hi}, the thrower's phone calls Kenny {kk};
  score rebuilt from `hits`/`kills` (`rescore`), the end swaps the counts each phone judged. Bots = CPU brains on your side
  (`autodrive`). All 3 pass online-native with and without LAG=80-150; 2P fuzz + 1P CPU clean. Left (13): Space Invaders
  versus + Space Swarm co-op, Bond ×3, Hyrule ×2, penalties, Raiders, Fight Night, Sewer Clash, kart ×2
  (`node -e` over solo.js: 'cpu' ids minus NET_NATIVE).
  Batch 18 (Oct 26, branch `online-batch-18-invaders` from TESTver), Space Invaders `space-swarm-versus` + `space-swarm-coop`
  (spaceInvaders.js; one fixed 224x300 field, same view on both phones, nf.start then play). Seat 1's phone (me 0) runs the
  shared world (formation, bomb spawns, bunker erosion, saucer, waves, the end) and puts it in its {f} snapshots 15/s: the
  formation as two offset groups (moved / not yet moved this sweep, split at `ptr`), alive mask, bombs by id, saucer
  [n,x,dir], bunker bits as hex only when `shieldVer` changed. The other phone just shows that world, lets bombs fall on
  between snapshots and judges only bombs reaching its own cannon. Each phone moves its own cannon/shot (snapshot {x,a,i,b,r,
  l,d,s}) and judges its own shot: kills {k:[t,key,pts]} (key = wave*100+index, saucer 10000+n, saucer points `UFO_PTS[n%8]`
  online), {bk:id} bomb gone (shot down or hit that cannon), {sh:[x,y]} their shot chipped a bunker (seat 1 erodes it).
  Scores = `rescore()` over both kill logs (earliest kill owns a key, kills after the end time dropped) + 50 each per wave
  cleared. Co-op lives = 6 − both phones' deaths. Seat 1 calls the end and sends {fin:{log,end:[reason,t,bonus,wave]}}, the
  other answers {fin:{log}}, both finish on the same numbers. Co-op online result: netGame passes `coop`/`won` from
  `session.teamResult` (arcade: both phones report the team total, card "X & Y win together!" / "The team goes down" with
  each one's points; board: individual scores, settled as a survival co-op like the horde). All pass online-native with and
  without LAG=80-150 (also a scratch run with invulnerable cannons: Earth saved after 4 waves, cards agree); 2P fuzz + 1P CPU clean.
  Batch 19 (Oct 26, branch `online-batch-19-bond` from TESTver), the three Bond games (`bond.js`): side by side like Poofs/Kenny
  (`split` online = own 64% left, other 36% right, `netStart`/`netEnd`, waiting banner). Laser Vault: own agent only; snapshots
  {x,y,c,h,st,sc} (other agent eased, heist number picks its beams); plans are the same seeded list on both (first 30 made at
  start). Funhouse: same seeded schedule; own field spawns from it, the other field is rebuilt from snapshots {sc,g,a:[[sched idx,
  hit]]} (`made` stops re-creating faded ones); 2x3 windows on a tall half online. Bomb: every round starts with nf.start('b'+r);
  each phone stops its own read-out by its own clock and sends {st:[round,value|-1 boom]}; a read-out at zero waits ('zero') for
  the other report, then both settle the same round. Bots = CPU brain on your side (`autodrive`). All 3 pass online-native with
  and without LAG=80-150 (390x780); 2P fuzz, 1P solo and tests/bondlair.mjs clean.
  Batch 20 (Oct 26, branch `online-batch-20-mixed` from TESTver): Boulder Run `raiders-ball-run` (netField side by side: own
  corridor at the bottom, other on top from {f} ~12/s; a run ends at own death / 60 s / other out and you lead by 40; settle from
  both {fin}). Sewer Clash `sewer-clash` (8 token slots = 4 mirrored pairs, slot k at generation n placed by seed; own grabs
  {g:[slot,gen,ms]}, earliest owns it (tie P1), scores rebuilt from the claims; at six or 40 s a phone stops and sends {tu:ms},
  grabs after the earlier stop dropped; arenaGestures now gives every touch/key to `s.online.me`, `cpu(keys,i)`). Penalties
  `league-penalties` (each phone plays its own role full screen; striker's phone sends {k:[n,tx,power,curve]}, keeper's phone
  flies it from arrival, dives {d:[n,dir,early,at]} and calls {r:[n,goal|save|miss]}; the striker's ball waits at the line;
  kicks/dives arriving during the last result are queued). Fight Night `fight-night` (like Kill Bill: own boxer only, player 2's
  ring turned round via `vx`; punch {pu:[round,power]} starts on both, the VICTIM's phone judges it at the wind-up end and sends
  {ld:[round,slip|block|hit|whiff]}; health is its own; rounds via roundOutcome with health as the extra; touchKeys takes
  `{me,swapLR}`). Hyrule ×2 `hyrule-rupee-rush`/`hyrule-sword-duel` (fixed 11x16 field, player 1's view turned round via
  VX/VY/VD; monsters are per-slot seeded sims (`netEnemy`, stream `seed:hy:slot:gen`) stepped at 30 Hz on the shared clock,
  treating every bush tile of the built map as solid (`g0`/`solidE`) so they move alike on both phones; rocks are analytic from
  their birth; each phone judges only its own Link (rocks {sh}, monster touch, the other's sword from {sl}); kills {ek}, bush
  cuts {bc} (bush identity = tile + regrow generation, regrow 12 s after the earliest cut) and pickups {pk} are time-stamped
  claims, earliest wins; drops are named by their source and dealt from the seed; rupee losses {lo} are the victim's call with
  the spilled drops; wallets rebuilt from both logs; Rupee Rush ends with {tu} from both, Sword Duel through roundOutcome).
  Bots = CPU brains on your side (`autodrive`/`net.bot`). All 6 pass online-native with and without LAG=80-150 (390x780);
  2P fuzz + 1P CPU clean. NETSTAT=1 prints Hyrule's claims/losses/damage sources/monster slots (identical on both phones).
  Bot-only balance: Rupee Rush is decided mostly by rival slashes. Left after this batch: Space Invaders ×2, Bond ×3, kart ×2.
  Batch 21 (Oct 26, branch `online-batch-21-kart` from TESTver), Mario Kart `rainbow-road-kart` + `rainbow-balloon-battle`
  (kart.js; one netField at the top, `NET` = the running race's pack/unpack/event). One full-screen view online (`VK` = this
  phone's kart; HUD 30 px lower, clear of the duel chip). Player 1's phone picks the course and the 6 CPU racers (its own
  roster) and sends {setup:{c,cpus}}; the other phone shows "… IS CHOOSING" (`waitCourse`). Ownership: `owns(k)` = your own
  kart, plus every CPU kart on player 1's phone; the rest are `k.remote`. CPU karts are SIMULATED BY PLAYER 1'S PHONE and
  streamed (they react to both humans and item boxes/rand, so a deterministic copy on both phones wasn't practical); the
  guest sees them like the other human. Snapshots {f:{t,k:[packK...]}} ~20/s of owned karts (track s/d/psi/v + state timers,
  P/V in the air); a remote kart is shown moved on along the TRACK by its speed for the time since (`target`, then
  `Ph.pose`, so it follows loops), each snapshot's jump eased out (`errS/errD`). The race clock, lights, intro and hazards
  run on wall time since `nf.start('race')` (`netNow`), not frame dt. Items: a kart you own fires → {it:[kart,id,dir,s,d,psi,
  v,t,[[list,pid,target]..]]}; the other phone fires the same item from there (`remoteFire`, red/blue target from the
  sender, extra projectiles trimmed) and flies it on by the delay (`catchUp`). Each phone judges only karts it owns
  (`hitKart`/`loseBalloon`/bolt/blooper/contacts push+speed check `owns`): a projectile one of them takes → {rm:id}, a
  bob-omb one sets off → {bm:id}; a shell reaching a remote kart just vanishes locally. Battle steal: the victim's phone
  calls it {st:attacker}, the attacker's phone adds the balloon. End: race = own kart finished, or clock past the other
  human's finishT (from its snapshot), or RACE_CAP; battle = own kart out, or clock past their outT, or BATTLE_TIME.
  `netResults` swaps finals: race {f,t,p,c: CPU finish times (player 1's phone)}: offline scoring, earlier finishT wins
  (tie P1), places = 1 + CPUs/other human finished earlier; battle {log:[[t,balloons]..],o: outT}: E = first out or time-up,
  balloons each log shows at E. Bot: `s.debug.bot` = autopilot on your kart (+ random course pick on the picking phone).
  Both pass online-native with and without LAG=80-150 (headless is slow, so races hit the 200 s cap; a scratch run with
  `finishLap` on one phone checked the finish path both ways, also under lag); kart.mjs, kart-track, 2P fuzz + 1P CPU
  clean. Real-phone feel (remote karts' smoothness, WebGL on two phones) untested.
- **Online co-op/live (Oct 26, branch `online-coop-kart`):** owner: when online, turn-taking games become ONE shared world, each
  on their own phone/camera, partner off screen = edge arrow (`engines/partnerArrow.js`); scoring/winner as before. Owner's rules:
  lose a life → respawn next to the partner; out of lives → watch until the next level, back with 1 life; run ends when both are
  out; first to the goal → partner gets 10 s (NET_GRACE) then is pulled along; both start the next level together. All ids are in
  NET_NATIVE (solo.js; `NET_ENGINES` = whole engines, bossfight). Kart: `kartMode` 'time' online → 'duo' (MODES.duo, 2 karts,
  items on, reuses the batch-21 race code). Sonic (sonic.js): own runner per phone, snapshots {p} + boss/capsule from player 1's
  phone, events {r} ring {en} badnik {mo} monitor {bh} boss hit {cap}; boss act co-op (pilot joins both, highest score wins), Goal
  Dash = live race. SMB (marioBros.js): one world per stage (`stageWorld`, key stage*16+lap) changed by events {cn,tl,it,ig,es,bd,
  ax}; World 1 co-op (bubble respawn `p.bubble`, `p.out` spectates, {gl} goal → grace, {sc} stage done → both start next stage);
  Coin Rush / Castle Dash live. Enemies wake/vanish by either runner (`reachX/backX`). Broforce (broforce.js): player 1's phone
  ("host") runs foes/Devil/cage line-up (`pickNetCages`, GOLD cage = someone locked for both, frees for both), streams foes near
  the other bro; the other phone sends hits {fh}/{bh}, replays enemy shots {fb,fn,fs,fw}, judges own hits; each phone breaks
  terrain for its own shots {tb}, blasts {ex} (`remoteBlast`), cages {cg} (a freed prisoner revives an out partner), flags {fl};
  chopper waits 10 s; `nextStage` syncs. Also fixed: bros could wall-climb out of the map (x clamp). Boss fights (bossFight.js):
  each phone flies its own plane vs its own copy of the attacks; player 1's phone owns HP (other sends {d}), streams HP/phase/
  mode; {rv} revive. netPlay.js: moves arriving before a channel opens are queued (`early`) — needed when an engine starts its
  sync at once. Horde (horde.js, NET_ENGINES 'horde'): player 1's phone runs director/enemies/shots/zones/drops/end and streams
  enemies near the other survivor (hz 8, `packEnemies`); the other phone keeps them in `netE` by uid, eases them, judges contact,
  runs only its own survivor+weapons and sends hits {h}; drops have ids ({gm}/{km} out, {g}/{k} taken), props {pb}, blasts {ex},
  shots {pr}/weapon flashes {fx}/zones {z}/enemy shots {es} shown on the other phone; modals don't pause online (chooser stands
  still, safe, auto-pick after 12 s); player 1 picks the night ({night}). Castlevania NES + SotN (Oct 28 rework, owner saw missing/invisible
  enemies): player 1's phone runs ONE set of monsters for both (Broforce pattern: wake in either view, partner's real screen
  width `cx/cw` in its snapshot, nearer hunter targeted); snapshots `m:{a:[x0,x1],f}` cover an area, a monster missing inside it
  is hidden (never culled on silence); other phone reports hits {fh}, deaths {fk}/{fg}, shots {es} (aged by travel time)/{ek};
  online deaths don't reset monsters; CV also {fz} stopwatch, {ps} partner sub-weapons, per-lap `netLog` for laps the other
  hasn't reached; clocks/countdown on wall time. Warriors: wall clock, swings >1 s late dropped, HP never rises back. Test
  harness AT_JS='secs:code;;...' (teleports, 3 s stalls on one phone). `wakeBat` pulls a straggler in. Test: `tests/online-native.mjs` GAMES=... (+ new SHOT_JS = code run on Sean's phone before the screenshot, PROBE /
  PROBE_S = print state every n s). All pass with bots; offline sonic/mario/broforce-turns/boss tests still pass. Real phones untested.
- **Meet a visitor (Oct 24, unreleased):** 393 of 705 landmarks have no characters from their own property, so `visitLocation`
  (app.js) now falls back to a traveller of the same kind (film/TV/game), then anyone missing; Mom & Dad's house and the lab keep
  their own visitors only. Checked on 140 sampled landmarks (all offer a visitor; v0.66.1 offered 51).
- Vault 🎲 Random game button (Oct 20): top of the arcade (`arcade-random` in app.js, `randomArcadePick` in ui.js) picks any playable card
  in the current list (filter, search and 1P mode apply).

## Recent changes (this round of owner feedback)
Boss trigger fix + drag flow; 2x heads (board, collection, character select); collection pages fit the screen;
pinch zoom; warp pipes visible & pass-triggered; bridges; biomes; Parents' House → Mom/Dad only; Planet Coaster park +
King Coaster; Always Sunny portraits added by owner (optimized to WebP, originals in `assets/originals/`).

- v0.46.1: found challenge items (game/duel kind) offer "Play now / Keep in bag" (`foundChallengeChoices` in `app.js`);
  Quark's shop is a bottom sheet (`showDialog({sheet:true})`, choice `tag`/`badge`, `itemTag()` in `items.js`).
  Tests: `tests/itemgame.mjs`, `tests/shop.mjs` (screenshots to /tmp/claude-0/sc).
- v0.46.2–3: fullscreen (`src/fullscreen.js`): first tap enters it (browsers need a gesture); toggles via `fullscreenButton()`
  in home stack, every top bar and Settings; open modal dialogs are re-raised on change. Collections scroll endlessly
  since v0.55 (no pages).

- v0.46.4: Beer Pong + Flipadelphia visual overhaul. Drawing lives in `src/engines/pubVisuals.js` (cached pub room +
  table layer, neon sign, solo cups, 3D flip cup with culling, fx: particles/pops/shake). Physics/flick functions in
  `pubPhysics.js` untouched; projections now use a uniform unit (true proportions on wide screens). Screenshots:
  `tests/pubshots.mjs`.

- v0.46.5: Warehouse Shift is now Rush Hour in the Dunder Mifflin warehouse (`engines/warehouseShift.js` drawing/flow,
  `warehouseRules.js` slide rules + BFS solver, pool in `data/warehouseOrders.js` from `tools/gen-warehouse.mjs`; engine
  name stays `sokoban`). 75s shift, fire drill x2 last 15s. Test: `tests/warehouse.mjs`.

- v0.46.6–7: home is a dark mobile-game title screen (buttons: one dark plum palette, gold accent on play only) (`homeHTML` in `ui.js`, `.title-screen`/`.ts-*` block at the end of
  `styles.css`). Logo `ART.brand` = `assets/shambconkins-logo.webp` (transparent + black outline, from
  `tools/brand-logo.py`; original in `assets/originals/brand/`). Keep the NEW GAME button free of transform animations
  (Playwright clicks need it stable). Screenshots: `tests/homeshots.mjs`.
  Oct 27 tidy (owner: menu was messy): three tiers only: gold play button (CONTINUE over a smaller NEW GAME bar when a run
  is saved; owner wanted it stacked again, Oct 28), an even 2x2 grid of tiles (Players = Choose Characters, Online, Arcade, Collection), and a quiet bottom dock
  (About, Back up when due (`.ts-backup`, gold dot), Restore on an empty save, Install `.ts-install`, Exit) with line-icon SVGs
  (`TS_ICON` in ui.js). Slogan `.ts-tagline` inside `.ts-logo` (owner's text, Oct 28); no Mind-Body-Spirit pills / pass-and-play footer; page title is just "ShambConkins".
  Erase progress and Clear run moved to a "Start over" zone at the bottom of Settings (confirm, Keep returns to Settings).
  `help` (dock About + the board's help button) = `aboutHTML()` in app.js: credits (Sean Conners, `RELEASED` month in
  version.js: update it with VERSION when releasing), how to play, modes, board tips (details), sources, "Art sources" button.

- v0.47.0: interface theme. `src/theme.css` (appended after styles.css by `tools/build.mjs`) restyles every menu, HUD,
  dialog, sheet and minigame frame in the title-screen look via tokens (`--t-bg0`, `--t-s1/s2/s3`, `--t-acc/acc2`, ...)
  on `body[data-theme]`. `src/theme.js` sets the theme: `home` for menus, the current player's realm on the board
  (mind/body/spirit/horror/upside-down), `warp-<id>` on warp boards (`applyRunTheme` in `showView`/`updateBoard`).
  Buttons inside `.game-body` are only re-themed through zero-specificity `:where()` rules, so game-specific button
  styles win. Board SVG art and canvases are untouched. Tests: `tests/themeshots.mjs`, `tests/contrast.mjs`
  (all 113 games pass; `WALK=11,22 node tests/contrast.mjs` audits dialogs on a real run).

- v0.48.0: new board music (above), unlock fanfare, title-screen EXIT GAME (`quitApp` in `app.js`; action `quit-app`, not
  `exit-game`, which leaves a minigame). Test: `tests/music.mjs`. Mixes were balanced by offline render (≈ −24 dB RMS,
  Horror ≈ −19) and CPU load measured at 3–12% of realtime on the test box; nobody has listened on a real phone yet.

- v0.49.0: grid boards + new board look (above); Beer Pong is a full match, 2 shots a turn, both in → "BRING IT BACK" third
  shot (`tests/beerpong.mjs`); character select rebuilt (`setupPanelHTML` in `ui.js`, `.cs-*` block at the end of
  `theme.css`, expressions cycle via `installSetupFaceCycle` in `app.js`; `tests/setupshots.mjs`); collections show
  "← Back" (home) instead of "← Board"; rare-encounter dialogs are dark.

- v0.51.0: route buttons sorted by map position (`stepTarget` in `app.js`, lane `cx` then x). Fork roads are free on grid
  boards: `installObstacles` bars no Level 1 road and one adventurous road in Body/Spirit only ~30% of the time (old
  saves keep their barriers). Board perf: gestures preview via CSS transform and commit the viewBox on settle
  (`gestureCamera`/`endGesture` in `ui.js`); camera glides render once over the union view and slide it
  (`repaintCamera`); `updateBoard` patches only changed SVG layers (`patchBoardSVG`, `<!--L-->` markers in `boardSVG`)
  and skips unchanged panel HTML (`setHTML`); grid boards have no looping SVG animations. Measure with
  `tests/zoomperf.mjs`. Deliberate spaces: leftover `event` tiles on new grid boards become trainer/trivia/Chance
  (pattern in `buildGridBoard`), tiles show `SPACE_CAPTIONS` (board.js), `showLandingBanner` (levelCard.js) names the
  action on landing, Chance draws skip trivia questions. `showSmashCard` + `glassSmash()` (audio.js) between the
  Gentlemen card and Level I.

- Level flow fix: only the level boss moves players into the next level. The rare "Express elevator" card (`effect:'body'`)
  now beams to the space before the Mind gate (it used to drop the player in Body, skipping the boss); item/card forward
  moves (`advanceAlong`, `bossAhead` in board.js) stop at the door of an unbeaten level gate; FRANK only opens Horror and
  `advanceAfterBoss` takes both players from the Spirit castle down to `horror-0`; `levelEndBoss` pulls a player out of
  the Upside Down first. Tests: `tests/levelflow.mjs` (Node random walks, in `npm test`), `tests/levelflow-ui.mjs`.
- v0.53.1 Pokémon: `battle()` starts the song, then `boardTransition` (full-screen `.gb-encounter` canvas over the
  board: 3 palette flashes + Gen 1 wipe from `wipeKind`/`drawWipe`) before `openGB`; if the GB is already open
  (trainer speech) `transition(kind)` runs inside it. Intro slides in silhouettes. Foes have `healsLeft` (1, gym 2)
  for heal/rest moves. `gen1Catch` = pokered catch + shake formula (red HP → catch rate ≥160). `.gb-fs` toggle in the
  bezel. Test: `tests/encounter.mjs` (screenshots `/tmp/claude-0/sc/enc-*`).
- v0.54.2: on portrait screens (`aspect<1`) `cameraBox` scales warp boards' (`format:'warp'`) follow span by `aspect*.75`,
  so spaces read without pinching. Screenshots: `node tests/warp.mjs 390x780` → `/tmp/claude-0/warp-*`.
- v0.55.0: Flip cup needs a firm flick (`flipFlick` power ~0.95–1.45 lands; seeded wobble via `rng` arg = `s.random`).
  Warp boards end like levels: `warpGateReady` + `levelEndBoss`/`bossGateDrag` with `run.bossGate={warp:true,bossId,realm:'warp'}`
  (`gateBoss()`), `exitWarpZone` clears it; Kanto keeps the gym. Landmark labels come from `src/data/iconicPlaces.js`
  (source → iconic place, applied in `references.js`; personal sources absent on purpose). Vault/roster (`catalogHTML` in
  `ui.js`) render 24-card chunks and append on scroll (`installCatalogFeed`, IntersectionObserver on `.catalog-more`);
  filters are a `<select id=catalog-filter>`. Boss games unlock in the vault once beaten (`bossBeaten` in gameRegistry,
  `profile.bossesBeaten`, older wins count via the boss's shared unlock); `POKEMON_MATCHES` + `arcadePokemon()` in app.js
  run wild/trainer battles on a throwaway one-space run. Tests: `tests/warpboss.mjs`, `tests/vault.mjs`, `tests/catalogshots.mjs`.
- Boss fights fill any screen: `layout()` in `engines/bossFight.js` stretches the logical field to the canvas aspect
  (H stays 640, W 420…1700). From W≥720 (`wide`) the boss sits lower/bigger (`B.hy` 185, `bs` 1.25), players spawn
  on either side of it (`spawnX/spawnY`), fly y≥90 (`YMIN`), are pushed out of its hit circles, and their guns, MEGA
  BEAM and stars aim at the boss or a nearer minion (`p.aim`). Portrait keeps the old field. Short landscape screens
  hide the scorebar/status/hint (`.boss-shell` CSS). Screenshots: `node tests/boss.mjs` (wide + phone).
  Wide difficulty (v0.56.2): `WIDE_K` (dens 1.3, spd 1.1, rest .78, player dmg .96) plus wide-aware attacks via
  `F.wide`, `F.targets()` (every living player) and `F.downs(m)` (one 'down' direction per player): aimed/fan/laser/
  wave/flamebreath/bounce/gumdrops cover both flanks; trapdoor/riddle use ~140-wide panels with a safe one near each
  player; gapwall/shockwave drop from the top with a gap per player; wrecking ball reaches the flanks; drone slots
  hover at y≈150. Measured with `tests/bossdiff.mjs` (debug: `steps`, `nodraw`, `holdPhase`, `immortal`, `hits`,
  `hitSrc`, autopilot reaction time): all 36 bosses, wide 9.1 / landscape 9.2 vs phone ~9.8 hits/min, same damage rate.
- Launch music: boot now starts the home score (it used to call `showView('home')` without `home()`), and
  `installAudioUnlock()` (audio.js) resumes the suspended AudioContext on the first tap/key.

- Drop-in mood portraits: `portraitURL` (assets.js) now prefers the owner's `USER_PORTRAITS` `char:<id>:<mood>` (never generated `ART`
  placeholders) over the base `photo:char:<id>` (it
  used to return the base photo for every mood). Board idle cycle shows normal/win/think/silly/angry; character select
  cycles every distinct expression (no 5-face cap).
- Pokémon mood sprites (v0.57.0): `portraitMoods(id)` (assets.js) lists moods with the owner's own art (drop-ins or
  supplied faces). `pkmnSprites.js` dithers each into front/back sprites in the background (`characterSprite(id,kind,mood)`,
  `moodSprite(sp,mood)`); `drawMonSprite` shows `m.mood`: think while choosing, win on landing a hit, angry when hit or
  hurt by poison/burn, silly on a confusion self-hit, sad on a miss/faint and a beaten trainer. Sprites are made at
  runtime from portraits, so new uploads need no step. `portraitMoods` also counts built-in raster photos in `data/art.js`
  (Sean, Amber) and moods sharing a picture; never SVG placeholders. `dither` crops full rectangular photos to an oval.
  Tests: `tests/pkmnmoods.mjs` (contact sheet of every mood character), `tests/pkmnmoodbattle.mjs [mine foe]`.

## In progress / unverified
- Warp minigames only bot/fuzz-tested in headless Chromium; Sonic, Mario (turn-based) and the 3D kart (WebGL, two viewports) need a
  real-phone check for feel and frame rate.
- Board smoothness only measured in headless Chromium (software compositing); check pinch/zoom on a real phone.
  Last round also enlarged in-game heads (global `spriteSize()` in `engines/session.js`, plus
  Flappy/Curling/Angry Heads), rebuilt the cones game as Cone Chaos (`engines/coneChaos.js`) and made Fruit Ninja
  slice the opponent's head. `npm test` green.

## Known issues / next steps
- Balance only bot-tested: boss fights, horde long runs, Disc Duel, Stunt Chase.
- Some fictional characters have no Wikipedia photo → emoji placeholder; friends (Shane, Carlos, Bert) and Flarpy need
  drop-in portraits from the owner.
- Chess/Checkers keep buttons; Minigolf, Fielding, Bike, Baseball, Rainbow Rivals still use small landscape canvases on phones.
- Trivia3 skews hard (~34% hard) and has some mid-confidence facts; worth a skim.
- Repo root has a stray 1-byte file `Test` created by the owner; leave it unless asked.

