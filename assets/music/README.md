# Drop-in music

Put audio files here and rebuild (`node tools/build.mjs`); the build inlines them into the offline HTML.
File name = track name, `.mp3`, `.ogg`, `.m4a`, `.wav` or `.flac`:

| File | Plays in |
|---|---|
| `cv-symphony-<name>.mp3` | Symphony of the Night soundtrack (owner's album rips, Nov 6): see the section below. Loaded the first time the game opens (pwa.js LATER). |
| `s3k-song-<name>.flac` | Seanic the Hedgehog (the Sonic 3 rebuild) music from the owner's Sonic 3 soundtrack (VGM recordings, Nov 10): `angel-island-1` (Zone 1 Act 1), `azure-lake` (the Test Zone), `invincible`, jingles `1up`, `act-clear`, `game-over`; Nov 11 night: `miniboss` (Sonic 3 Miniboss, the Act 1 mini-boss arena) and `emerald-hill` (Sonic 2 Emerald Hill Zone from the Sonic 1&2 CD, Zone 1 Act 2); Nov 11 round 4: `boss` (Sonic 3 Robotnik, the Act 3 boss; `angel-island-1` now plays in Act 3). The album's .mp3 files are really MPEG Layer II (browsers don't all play it), so each was decoded, cut just after one pass of its loop and saved as FLAC (no further loss); loop points (measured sample lags) and levels are in `SONGS` in `src/engines/sonicAudio.js`. Loaded the first time a Sonic game opens (pwa.js LATER `music:s3k-`). The rest of the album (other zones, Miniboss, Robotnik, Big Arms, Data Select, Knuckles, Drowning...) and the Sonic 1/2/CD album are still in Claude Share for later zones. |
| `smb-song-<name>.mp3`, `smb-sfx-<name>.wav` | Super Mario Bros. (owner's NES rips, Nov 7): songs over, under, castle, star, their `-hurry` versions (the rip opens with the hurry jingle), clear, castle-clear, tunnel, stream copies cut after one loop; sounds byte for byte. Loop points, channels and volumes are in `src/engines/smbAudio.js`. Loaded the first time one of the Mario games opens (pwa.js LATER). Left in Claude Share until there's a place for them: Underwater, Ending, Game Over 2. |
| `sotn-*.mp3` | Symphony of the Night sound clips from the owner's PS1 rips (Nov 6, mono 22 kHz 56 kbps, peaks at -1 dB, loud ones trimmed to about -13 dB mean): Alucard's voice `sotn-alucard-atk-N` / `-hurt-N` / `-die`, monsters `sotn-<type>-<event>` (bloody, zombie, skeleton, bat, merman, armor = the Plate Lord set), cutscene lines `sotn-line-death-1/2`, `sotn-line-alucard-1`, `sotn-line-dracula-1/2`. Loaded the first time the game opens (pwa.js LATER). See the top of `src/engines/sotnAudio.js`. |
| `sunset-song-<genesis or snes>-<nn>-<name>.mp3` (any number) | Hangman Unchained's music director (engines/sunsetAudio.js; for any game that wants them): each song is calm, play or tense by its name (`MOODS` there: a new song needs its name added, else it is never dealt) and plays when the game is in that mood. Add new files' levels (el.volume to -18 LUFS) to src/data/sunsetSounds.js |
| `sunset-sting-<wanted, yippie or gameover>-<genesis or snes>.mp3` | Hangman Unchained: Wanted! before the first song, Stage Clear for a winner, Game Over for a loss or dead heat |
| `sunset-voice-<name>.wav` | Hangman Unchained: shots, misses, the hanged cry, Sir Richard's laugh, taunts. Owner's Sunset Riders rips, byte for byte; the arcade `.vgz` set isn't used (chip logs, ffmpeg can't play them) |
| `thps-mancala-<band>--<song>.mp3` (any number; e.g. `thps-mancala-millencolin--no-cigar.mp3`) | Tony Hawk's Pro Mancala soundtrack, replacing the three synth songs: a shuffled playlist, a song starts with the title sequence and plays on through the game, then the next one; the Now Playing card shows the band and song from the file name (`--` between them). Plain `thps-mancala.mp3` / `thps-mancala-<n>.mp3` also work |
| `thps-mancala-intro.mp3` | Tony Hawk's Pro Mancala: optional separate title song, played to its end before the playlist starts |
| `thps-sfx-<name>.mp3`, or several: `thps-sfx-<name>-1.mp3` … `-20.mp3` | Tony Hawk's Pro Mancala sound effects, replacing the synth one; with several files the game picks one at random each time (never the same twice in a row). Rolls, grinds and the crowd loop or fade to fit how long they last. Names: `ollie`, `flip`, `catch`, `land`, `revert` (power slide), `grind` (handrail), `grind-pipe` (halfpipe coping), `grind-curb`, `grind-board` (guest skaters on the Mancala board), `bail`, `grunt` (the robbed player), `scratch` (combo lost on a slam), `aww` (crowd reacting to a slam), `combo` (COMBO!!!), `special`, `land-combo` (combo scored), `tally` (score tick), `total` (end tally done), `timeup` (game over), `crowd`, `hey`, `slam` (title words), `clack` (gem into a bowl), `text`, `whoosh`, `cam` (camera cut), `roll`, `rollby`. `aww`, `grunt`, `total` and `timeup` have no synth version, so they are silent without files |

| `bhpin-<song>.mp3` (whitewash, nottingham-lace, welcome-to-bucketheadland, padmasana, soothsayer, jordan, big-sur-moon) | Bucketheadland pinball soundtrack (replaces the synth band): which song plays when is in `src/engines/pinball/tables/bucketheadAudio.js` (playlist + one song per mode, with a start time) |
| `kgpin-<song>.mp3` (robot-stop, people-vultures, rattlesnake, nuclear-fusion, mars-for-the-rich, crumbling-castle, im-in-your-mind, im-not-in-your-mind) | King Gizzard pinball soundtrack (owner's files, same treatment as bhpin): which song plays when is in `src/engines/pinball/tables/gizzardAudio.js` |
| `bspin-<song>.mp3` (war-pigs, electric-funeral, black-sabbath, sweet-leaf, children-of-the-grave) | Black Sabbath pinball soundtrack (same treatment): `src/engines/pinball/tables/sabbathAudio.js` |
| `bhpin-fx-<name>.mp3` (amp-on, knock, cats, cheap-lead, diving, fretted, sparks-1/2, mice, rev, scraper, sixty-cop, stutter, trem, unplug, wail) | Bucketheadland pinball: the MTV Music Generator 2 guitar FX (owner, Nov 1; -14 LUFS or peak -1 dB, 44.1 kHz mono). Which machine sound uses which, and its measured volume, is in `bucketheadAudio.js` |
| `bhpin-gtr-<big\|mid\|short\|tiny>-<n>.mp3`, `bhpin-gtr-<wail\|hold\|dive>.mp3`, `bhpin-gtr-scrape-<n>.mp3` | Bucketheadland pinball guitar sounds (solo licks grouped by length; neck sounds: vibrato wail, held feedback note, dive bomb, pick scrapes), layered on the machine sounds per `bucketheadAudio.js` |
| `boss-<boss id>.mp3` (e.g. `boss-king-kandy.mp3`, `boss-hal-9000.mp3`; ids in `src/data/bosses.js`) | Boss fights: that boss's own song for the whole fight, replacing the synth loop (`src/engines/bossMusic.js`) |
| `boss-<boss id>-p2.mp3`, `-p3.mp3`, `-final.mp3` | Optional: the boss switches to this song when its 2nd / 3rd phase / FINAL PHASE (Hard, Extreme) starts |
| `boss-any.mp3`, `boss-any-1.mp3` … `-30.mp3` | Shared boss songs for every boss without its own (one is picked per fight) |
| `boss-final.mp3` | Shared FINAL PHASE song for bosses without their own `-final` |
| `boss-win.mp3`, `boss-lose.mp3` | Short stingers on the knockout / the defeat |

The Bucketheadland songs were made from the owner's FLAC/MP3s (Nov 1): silence trimmed, two-pass loudnorm to -16 LUFS
(-1.5 dBTP, linear), 44.1 kHz stereo VBR MP3 (`-q:a 5`, ~130 kbps), tags and cover art stripped: 240 MB of originals → 39 MB.
The guitar set (MySims Party "Guitar Rockstar") was trimmed, levelled to -14 LUFS and saved as 22 kHz mono MP3 (1 MB).

While a track is present, the game's ambient drones (wind, hall, caverns, throne-room organ) drop to a quiet bed under it.
Keep sound effects short (a second or two; `tally` and `clack` play many times a second).
Keep files reasonably small (a 3-minute 128 kbps MP3 is about 3 MB; base64 adds a third).

## Symphony of the Night soundtrack

Stream copies of the album's 320 kbps MP3s (`ffmpeg -t <cut> -map 0:a -map_metadata -1 -c copy`, no re-encoding, tags off). Which
moment plays what comes from the track lists on the Castlevania Dungeon and VGMuseum; `SONGS` in `src/engines/sotnAudio.js` holds
the loop points and levels, `songFor` in `src/engines/sotn.js` picks the song.

| File | Album track | Plays |
|---|---|---|
| `cv-symphony-title` | Metamorphosis 1 (first 10 s) | Title (the opening video in the real game) |
| `cv-symphony-story` | Moonlight Nocturne | First card of the game (the intro story) |
| `cv-symphony-save` | Prayer | Later cards (the save screen) |
| `cv-symphony-castle` | Dracula's Castle | The approach and Castle Entrance |
| `cv-symphony-caverns` | Crystal Teardrops | Underground Caverns |
| `cv-symphony-gallery` | Marble Gallery | Marble Gallery, up to the throne-room bars |
| `cv-symphony-dracula` | Prologue | Dracula's speech ("What is a man?") |
| `cv-symphony-boss` | Dance of Illusions | The Dracula battle, both forms |
| `cv-symphony-keep` | Heavenly Doorway | Castle Keep, after the orb |
| `cv-symphony-gameover` | Land of Benediction | The night runs out (once, then the next card's song) |

Loops: the album tracks are one pass whose fade-out runs over the start of the repeat. The repeat was found by comparing spectra
(the last seconds against everything earlier), then its length refined by waveform correlation. It is not sample-exact, so the
game joins with a .25 s crossfade on the audio clock instead of `el.loop`. Measure a new track the same way and cut it just after the join.

Saved for the rest of the castle (still in the owner's `Claude Share` folder, not in the repo, so they cost nothing until used):
Alchemy Lab = Dance of Gold; Outer Wall = Tower of Mist; Long Library = Wood Carving Partita; Clock Tower = The Tragic Prince;
Royal Chapel = Requiem for the Gods; Olrox's Quarters = Dance of Pales; Colosseum = Wandering Ghosts; Abandoned Mine = Abandoned Pit;
Catacombs = Rainbow Cemetery; Marble Gallery pit = The Door to the Abyss; inverted castle = Lost Painting, Curse Zone, Final Toccata
(Inverted Library, Inverted Catacombs, Inverted Marble Gallery, and others); bosses = Festival of Servants (most), Death Ballad
(Hippogryph, Olrox), Enchanted Banquet (Succubus), Blood Relations (Richter), Black Banquet (final battle); videos = Metamorphosis 2
(inverted castle), Metamorphosis 3 (the castle falls); end credits = I Am the Wind. Nocturne isn't used in the game; the lists give
no place for Door of Holy Spirits or Silence.

## Sonic 3 & Knuckles sound effects (`s3k-sfx-*.wav`, owner's rips, Nov 10 2026)

Mr Lange's rip set (44.1 kHz stereo 16-bit, Gens HQ YM2612), numbered by the game's sound test (`S3K_<id>.wav`).
Names come from the sound IDs in the game's sound driver, checked against each file's length/pitch (jump rises
340→1080 Hz in .4 s, spin dash rises 6.8→12.6 kHz, spring boings 260→1040 Hz, rings 33/34 identical...).
Copied byte for byte; played by `src/engines/sonicAudio.js`. Downloaded the first time Sonic opens (pwa.js LATER).
In the game: 33 ring-right, 34 ring-left, 35 hurt (also death), 36 skid, 37 spike, 38 bubble, 39 splash, 3A shield,
3B drown, 3C roll, 3D break, 3E fire-shield, 3F bubble-shield, 41 lightning-shield, 42 insta-shield, 43 fire-dash,
44 bubble-bounce, 45 lightning-jump, 48 blast, 4E boss-explode, 59 collapse, 5B switch, 5F crash, 62 jump,
63 starpost, 6E boss-hit, A9 air-ding, AA bumper, AB spindash, AC continue, B0 register (tally), B1 spring,
B3 big-ring, B4 explode (badnik/monitor), B6 dash (spin dash release), B8 signpost, B9 ring-loss.
Not copied yet (owner's zip, for later zones): 40 shield (unused), 46 whistle, 47 sand wall, 49 thump, 4A grab,
4B waterfall, 4C glide land, 4D projectile, 4F flamethrower, 50 boss activate, 51 missile throw, 52 spike move,
53 charging, 54 boss laser, 55 conveyor, 56 flip bridge, 57 geyser, 58 fan latch, 5A charge, 5C mecha spark,
5D floor thump, 5E laser, 60 boss zoom, 61 boss hit floor, 64 pulley grab, 65 blue sphere, 66 all spheres,
67 level projectile, 68 perfect, 69 push block, 6A goal, 6B action block, 6C splash 2, 6D shift, 6F rumble,
70 lava ball, 71 shield (same as 3A), 72 hover pad, 73 transporter, 74 tunnel booster, 75 balloon platform,
76 trap door, 77 balloon, 78 gravity machine, 79 lightning, 7A boss magma, 7B small bumpers, 7C chain tension,
7D pump, 7E ground slide, 7F frost puff, 80 ice spikes, 81 tube launcher, 82 sand splash, 83 bridge collapse,
84/85 power up/down, 86 alarm, 87 mushroom bounce, 88 pulley move, 89 weather machine, 8A bouncy, 8B chop tree,
8C chop stuck, 8D flutter, 8E revving, 8F/90/91 door open/move/close, 92 ghost appear, 93 boss recovery, 94 chain
tick, 95 boss hand, 96 mecha land, 97 enemy breath, 98 boss projectile, 99 plink, 9A spring latch, 9B thump boss,
9C super emerald, 9D targeting, 9E clank, 9F super transform, A0 missile shoot, A1 ominous, A2 floor launcher,
A3 gravity lift, A4 mecha transform, A5 rise, A6 launch grab, A7 launch ready, A8 energy zap, AD launch go,
AE flipper, AF enter special stage, B2 error, B5 diamonds, B7 slot machine, BA/BB Tails flying/tired,
BC-DB looping sounds (each with a `_sus` long version in the zip's sustain folder): slide skid, large ship, Eggman
siren, boss rotate, fans, flamethrower, gravity tunnel, boss panic, spin, wave hover, cannon turn, spike balls,
light tunnel, rumbles, Death Egg rise, wind, rising, gumball tab, turbine hum, lava fall, zap, conveyor platform,
saw, magnetic spike, leaf blower, water skid. The IDs past the main ones are from memory of the driver's list:
check by ear before using one.
