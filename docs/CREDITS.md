# Third-party credits

- **Freedoom** (Phase 1 and Phase 2, v0.13.0), © 2001–2024 Contributors to the Freedoom project, BSD-3-Clause.
  Bundled as `assets/doom/freedoom.pack.gz` (made with `tools/doom-pack.mjs`) for the DOOM / DOOM II minigames;
  licence text in `assets/doom/FREEDOOM-COPYING.txt`. https://freedoom.github.io
- **cannon-es** 0.20.0 (Hole.it physics), MIT. `src/vendor/cannon.js`.
- **ENABLE** (Enhanced North American Benchmark Lexicon, public domain; the copy from github.com/dolph/dictionary): the words
  Words n' Shit accepts (`assets/wordsnshit/dict.bin.gz`, built by `tools/wns/build-dict.mjs`, slurs removed, a few modern words added).
- **word-list** 2.0.0 by Sindre Sorhus, MIT: the five-letter words Sqwordle accepts as guesses (`src/data/sqwordleWords.js`).
- **wordfreq** by Robyn Speer (Apache-2.0 code, CC BY-SA 4.0 data): used offline only to rank Sqwordle's answer words by
  how common they are; no wordfreq data ships beyond that ranked choice of ordinary English words.
- **Quaternius** (quaternius.com, CC0 1.0): Universal Base Characters, Modular Character Outfits - Fantasy and Universal
  Animation Library 1 + 2 (free Standard editions). Bodies, clothes and animations of the Boulder Run (Temple Run) runners;
  sources in `assets/originals/trun/` (licences there), game files made by `tools/trun/build-chars.py`. The Lost Valley T-Rex is from his Animated Lowpoly Dinosaurs pack (CC0), converted with FBX2glTF.
- **Quaternius** (quaternius.com, CC0 1.0): Stylized Nature MegaKit and Fantasy Props MegaKit (Standard) for the Boulder Run scenery: trees, pines, bushes, ferns, rocks, barrels, crates, vases, torches, banners and the rock/bark textures (tools/trun/build-props.py).
- **YuNet** face detector (OpenCV model zoo, MIT): `tools/models/face_detection_yunet_2023mar.onnx`, used offline by
  `tools/head-check.py`.

The Doom engine in `src/engines/doom/` is a JS rebuild modelled closely on the original engine's published source
(id Software, GPL-2.0), so treat that folder as GPL-2.0 if it is ever distributed. DOOM and DOOM II are id Software's; their WADs are never stored in this repo (see `src/engines/doom/README.md`).

## The Price Is Right voices (assets/music/tpir-v-*)

Made with fish.audio text-to-speech (s2.1-pro-free) from two community voice models on fish.audio: "Bob Barker (Himself)" and "Rich Fields (TPIR 2007-2010 voice) (Announcing)". Lines written for this game (src/data/tpirVoice.js).

## Plinko prize photos (assets/prizes)

Real product photos from Wikimedia Commons, resized to 512 px. File name on Commons, author, licence:

- `battleship`: [Hra_námořní_bitva_(1).jpg](https://commons.wikimedia.org/wiki/File:Hra_námořní_bitva_(1).jpg), Commons uploader of the file, CC BY-SA 3.0
- `bic`: [03-BICcristal2008-03-26.jpg](https://commons.wikimedia.org/wiki/File:03-BICcristal2008-03-26.jpg), Trounce, CC BY 3.0
- `big-wheel`: [Boy-on-big-wheel-2008.jpg](https://commons.wikimedia.org/wiki/File:Boy-on-big-wheel-2008.jpg), Joe Shlabotnik, CC BY 2.0
- `billy-bass`: [Billy_Bass_Adoption_Center.jpg](https://commons.wikimedia.org/wiki/File:Billy_Bass_Adoption_Center.jpg), Kevin Burkett, CC BY-SA 2.0
- `boggle`: [Boggle.jpg](https://commons.wikimedia.org/wiki/File:Boggle.jpg), Stilfehler, CC BY-SA 3.0
- `camp-stove`: [Portable_stove.jpg](https://commons.wikimedia.org/wiki/File:Portable_stove.jpg), en.wikipedia.org/wiki/User:Duk, CC BY-SA 3.0
- `casio-f91w`: [Casio_F-91W_5051.jpg](https://commons.wikimedia.org/wiki/File:Casio_F-91W_5051.jpg), Ashley Pomeroy, CC BY-SA 3.0
- `chia-pet`: [Alligator_Chia_Pet.jpg](https://commons.wikimedia.org/wiki/File:Alligator_Chia_Pet.jpg), Jeremy Noble, CC BY 2.0
- `chucks`: [Black_Converse_sneakers.JPG](https://commons.wikimedia.org/wiki/File:Black_Converse_sneakers.JPG), Brooke Fishwick, CC BY-SA 3.0
- `clapper`: [Clapper.png](https://commons.wikimedia.org/wiki/File:Clapper.png), Charles (talk) (Uploads), Public domain
- `connect-four`: [Connect-four.jpg](https://commons.wikimedia.org/wiki/File:Connect-four.jpg), Jonathan Kellenberg from Seattle, WA, CC BY 2.0
- `crock-pot`: [Crock_pot.jpg](https://commons.wikimedia.org/wiki/File:Crock_pot.jpg), Janine from Mililani, Hawaii, United States, CC BY 2.0
- `dustbuster`: [Spill_Buster_Black_and_Decker.JPG](https://commons.wikimedia.org/wiki/File:Spill_Buster_Black_and_Decker.JPG), Canoe1967, CC BY 3.0
- `etch-a-sketch`: [Taj_Mahal_drawing_on_an_Etch-A-Sketch.jpg](https://commons.wikimedia.org/wiki/File:Taj_Mahal_drawing_on_an_Etch-A-Sketch.jpg), Etcha, CC BY-SA 3.0
- `fiesta`: [Fiesta_at_Macys_in_East_Wenatchee.jpg](https://commons.wikimedia.org/wiki/File:Fiesta_at_Macys_in_East_Wenatchee.jpg), Thayne Tuason, CC BY-SA 4.0
- `foreman-grill`: [George_foreman_grill.jpg](https://commons.wikimedia.org/wiki/File:George_foreman_grill.jpg), Popebrak at English Wikipedia, CC BY-SA 3.0
- `frisbee`: [Frisbee_090719.jpg](https://commons.wikimedia.org/wiki/File:Frisbee_090719.jpg), Petey21, Public domain
- `game-of-life`: [The_Game_of_Life_人生ゲーム_DSCF2280.jpg](https://commons.wikimedia.org/wiki/File:The_Game_of_Life_人生ゲーム_DSCF2280.jpg), 松岡明芳, CC BY-SA 3.0
- `heinz`: [Heinz_Tomato_Ketchup,_Canada_(front),_2026-02-19.jpg](https://commons.wikimedia.org/wiki/File:Heinz_Tomato_Ketchup,_Canada_(front),_2026-02-19.jpg), Chris Woodrich, Public domain
- `hippos`: [Hungy_Hippos!.jpg](https://commons.wikimedia.org/wiki/File:Hungy_Hippos!.jpg), Dave Fischer, CC BY-SA 2.0
- `hula-hoop`: [Girl_twirling_Hula_Hoop,_1958.jpg](https://commons.wikimedia.org/wiki/File:Girl_twirling_Hula_Hoop,_1958.jpg), GeorgeLouis, CC BY-SA 3.0
- `instant-pot`: [Instant_Pot_(49907000991).jpg](https://commons.wikimedia.org/wiki/File:Instant_Pot_(49907000991).jpg), Ajay Suresh from New York, NY, USA, CC BY 2.0
- `instax`: [Fuji_instax_Wide_300.jpg](https://commons.wikimedia.org/wiki/File:Fuji_instax_Wide_300.jpg), Petar Milošević, CC BY-SA 4.0
- `kerplunk`: [KerPlunk.jpg](https://commons.wikimedia.org/wiki/File:KerPlunk.jpg), Londonclanger at English Wikipedia, CC0
- `koosh`: [Koosh-Ball-TriColor.jpg](https://commons.wikimedia.org/wiki/File:Koosh-Ball-TriColor.jpg), Evan-Amos, Public domain
- `lava-lamp`: [Lava_lamps_(16136876840).jpg](https://commons.wikimedia.org/wiki/File:Lava_lamps_(16136876840).jpg), Dean Hochman from Overland Park, Kansas, U.S., CC BY 2.0
- `leatherman`: [Leatherman_sidekick-ausgeklappt.jpg](https://commons.wikimedia.org/wiki/File:Leatherman_sidekick-ausgeklappt.jpg), Riquix, CC BY 4.0
- `lite-brite`: [Hello_on_a_Lite-Brite.jpg](https://commons.wikimedia.org/wiki/File:Hello_on_a_Lite-Brite.jpg), thomas ambridge, CC BY-SA 3.0
- `magic-8-ball`: [Magic8ball.jpg](https://commons.wikimedia.org/wiki/File:Magic8ball.jpg), ChristianHeldt, Public domain
- `maglite`: [MagLiteFlashlight.jpg](https://commons.wikimedia.org/wiki/File:MagLiteFlashlight.jpg), KMJ, Nordelch, CC BY-SA 3.0
- `magna-doodle`: [Magna_Doodle.jpg](https://commons.wikimedia.org/wiki/File:Magna_Doodle.jpg), Regregex, CC BY-SA 3.0
- `monopoly`: [Monopoly_board_on_white_bg.jpg](https://commons.wikimedia.org/wiki/File:Monopoly_board_on_white_bg.jpg), fir0002 flagstaffotos [at] gmail.com Canon 20D + Canon 70-200mm f/2.8 L, GFDL 1.2
- `nerf-blaster`: [Nerf_N-Strike_Vulcan.jpeg](https://commons.wikimedia.org/wiki/File:Nerf_N-Strike_Vulcan.jpeg), JKDesigns, CC BY-SA 3.0
- `nintendo-controller`: [Nintendo-Switch-Pro-Controller-FL.jpg](https://commons.wikimedia.org/wiki/File:Nintendo-Switch-Pro-Controller-FL.jpg), Evan-Amos, Public domain
- `pogo-stick`: [Pogo_Stick.jpg](https://commons.wikimedia.org/wiki/File:Pogo_Stick.jpg), Srd2005, CC BY-SA 3.0
- `pyrex`: [Pyrex_1-quart_liquid_measuring_cup_-_DPLA_-_b07e5efc0a37cf693d74b366a3065c72.jpg](https://commons.wikimedia.org/wiki/File:Pyrex_1-quart_liquid_measuring_cup_-_DPLA_-_b07e5efc0a37cf693d74b366a3065c72.jpg), Pyrex, Public domain
- `razor-scooter`: [Razor_old_a.jpg](https://commons.wikimedia.org/wiki/File:Razor_old_a.jpg), 丁, CC BY-SA 3.0
- `rice-a-roni`: [Rice-A-Roni.jpg](https://commons.wikimedia.org/wiki/File:Rice-A-Roni.jpg), Boereck 13:27, 25 September 2006 (UTC), CC BY-SA 3.0
- `rubiks-cube`: [Rubiks_cube_solved.jpg](https://commons.wikimedia.org/wiki/File:Rubiks_cube_solved.jpg), Mike Gonzalez (TheCoffee), CC BY-SA 3.0
- `scrabble`: [Scrabble_game_in_progress.jpg](https://commons.wikimedia.org/wiki/File:Scrabble_game_in_progress.jpg), thebarrowboy, CC BY 2.0
- `shake-weight`: [Shake_Weight.jpg](https://commons.wikimedia.org/wiki/File:Shake_Weight.jpg), Flickr User: Herrea; Artwork: Shake Weight, CC BY 2.0
- `silly-putty`: [Big_dsc05433.jpg](https://commons.wikimedia.org/wiki/File:Big_dsc05433.jpg), plastelina.sk, CC BY-SA 2.0
- `simon`: [Simon_Electronic_Game.jpg](https://commons.wikimedia.org/wiki/File:Simon_Electronic_Game.jpg), Shritwod, CC0
- `slinky`: [2006-02-04_Metal_spiral.jpg](https://commons.wikimedia.org/wiki/File:2006-02-04_Metal_spiral.jpg), Roger McLassus, CC BY-SA 3.0
- `slip-n-slide`: [Slip_n_slide.jpg](https://commons.wikimedia.org/wiki/File:Slip_n_slide.jpg), Imokurnotok (talk), Public domain
- `sodastream`: [SodaStream_Crystal_2.0.jpg](https://commons.wikimedia.org/wiki/File:SodaStream_Crystal_2.0.jpg), Wassersprudler.de, CC BY-SA 4.0
- `sorry`: [Sorry_diamond_edit.jpg](https://commons.wikimedia.org/wiki/File:Sorry_diamond_edit.jpg), myguitarzz on Flickr, CC BY 2.0
- `spam`: [Spam_wall_-_Flickr_-_freezelight.jpg](https://commons.wikimedia.org/wiki/File:Spam_wall_-_Flickr_-_freezelight.jpg), freezelight, CC BY-SA 2.0
- `spirograph`: [Spirograph_plus_(8417026572).jpg](https://commons.wikimedia.org/wiki/File:Spirograph_plus_(8417026572).jpg), James Petts from London, England, CC BY-SA 2.0
- `super-soaker`: [Cps2000front.jpg](https://commons.wikimedia.org/wiki/File:Cps2000front.jpg), ?, CC BY-SA 3.0
- `swiss-army`: [My_swiss_army_knife.JPG](https://commons.wikimedia.org/wiki/File:My_swiss_army_knife.JPG), Biso, Public domain
- `tamagotchi`: [Tamagotchi_0124_ubt.jpeg](https://commons.wikimedia.org/wiki/File:Tamagotchi_0124_ubt.jpeg), Tomasz Sienicki [user: tsca, mail: tomasz.sienicki at gmail.com], CC BY-SA 3.0
- `thermos`: [Thermos.JPG](https://commons.wikimedia.org/wiki/File:Thermos.JPG), Denae Bedard, CC BY-SA 3.0
- `trivial-pursuit`: [Trivial_pursuit_classic_edition_cover.jpg](https://commons.wikimedia.org/wiki/File:Trivial_pursuit_classic_edition_cover.jpg), Unknown, Public domain
- `twinkies`: [Hostess_twinkies.jpg](https://commons.wikimedia.org/wiki/File:Hostess_twinkies.jpg), Larry D. Moore, CC BY 4.0
- `view-master`: [View_Master_-_Model_G_Red.jpg](https://commons.wikimedia.org/wiki/File:View_Master_-_Model_G_Red.jpg), L'Ospite Inatteso, CC BY-SA 4.0
- `waterpik`: [Water_Flosser.jpg](https://commons.wikimedia.org/wiki/File:Water_Flosser.jpg), Waterpikinc, CC0
- `wiffle`: [Wiffle_bat_and_ball.jpg](https://commons.wikimedia.org/wiki/File:Wiffle_bat_and_ball.jpg), see the Commons file page, CC BY 2.5
- `yahtzee`: [Original_Yahtzee_game_set_-_1980s_UK_release.jpg](https://commons.wikimedia.org/wiki/File:Original_Yahtzee_game_set_-_1980s_UK_release.jpg), Nema Evin, CC BY-SA 4.0
- `yo-yo`: [Yo-Yo-Plastic-Toy-Green.jpg](https://commons.wikimedia.org/wiki/File:Yo-Yo-Plastic-Toy-Green.jpg), Evan-Amos, Public domain
