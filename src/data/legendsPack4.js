// Nov 24 roster additions from the owner: Joe Dirt, the Waterboy, the Brothers Solomon, Who Charted?, Human Giant, Tim and Eric,
// Eric André, YouTube legends, BASEketball's Coop and Remer and the real Matt and Trey, Michael Bay, Shia LaBeouf, James
// Cameron, the Mad Max crew, Michael Jackson, Talking Heads, Gandhi, Midsommar, a what-if Pattinson Bond, the Mask and his
// son, Green Room, Drop Dead Fred, John Malkovich, Godzilla, Congo, the Brundlefly, Jeff Goldblum, Psycho Goreman and
// all of the Dirty Dozen. Same row format as legendsPack3.js: [id, name, source, icon, photo page, perk, flavour line].
// The flavour lines are our own words, not quotes. (Seth Brundle and Ian Malcolm were already in the roster.)
const PERKS4={
 explorer:'Explorer: +1 point at every landmark.',
 competitor:'Competitor: +1 point on every minigame win.',
 survivor:'Survivor: starts every run with a shield.',
 scavenger:'Scavenger: bonus spaces pay +1 extra.'};
const ROWS4=[
 // ---- films and shows
 ['joe-dirt','Joe Dirt','Joe Dirt','🦱','Joe Dirt','survivor','Mullet, meteor, unbreakable optimism. Life keeps knocking him down; he keeps getting up.'],
 ['bobby-boucher','Bobby Boucher','The Waterboy','💧','The Waterboy','competitor','Mama says minigames are the devil. He wins them anyway, with high-quality H2O.'],
 ['dean-solomon','Dean Solomon','The Brothers Solomon','🤓','The Brothers Solomon','explorer','Homeschooled in the Arctic, brimming with confidence, short on social skills.'],
 ['john-solomon','John Solomon','The Brothers Solomon','🧔','The Brothers Solomon','scavenger','The other Solomon brother. Means well, plans terribly, finds the bonus by accident.'],
 // ---- comedians
 ['kulap-vilaysack','Kulap Vilaysack','Who Charted?','🎙️','Kulap Vilaysack','competitor','Runs the countdown, keeps the chart honest, out-wits the co-host.'],
 ['howard-kremer','Howard Kremer','Who Charted?','🌴','Howard Kremer','explorer','The Suicide Kings guy. Summer school forever: every landmark is a party.'],
 ['paul-scheer','Paul Scheer','Human Giant','🎬','Paul Scheer','competitor','Human Giant, The League, and a podcast about the worst movies ever made.'],
 ['rob-huebel','Rob Huebel','Human Giant','😏','Rob Huebel','scavenger','Deadpan prankster of Human Giant. Pockets the bonus with a straight face.'],
 ['aziz-ansari','Aziz Ansari','Human Giant','🍝','Aziz Ansari','explorer','Human Giant, Parks and Rec, and an opinion on every restaurant near every landmark.'],
 ['tim-heidecker','Tim Heidecker','Tim and Eric Awesome Show, Great Job!','📼','Tim Heidecker','competitor','Half of Tim and Eric. Takes the minigame extremely, uncomfortably seriously.'],
 ['eric-wareheim','Eric Wareheim','Tim and Eric Awesome Show, Great Job!','📺','Eric Wareheim','scavenger','The other half of Tim and Eric. Public-access chaos with a wine collection.'],
 ['eric-andre','Eric André','The Eric Andre Show','💥','Eric André','survivor','Destroys the set every episode and walks away from the wreckage.'],
 // ---- YouTube
 ['shoenice','Shoenice','YouTube','👟','Shoenice','survivor','Eats things nobody should eat for the views. Very hard to put off.'],
 ['mullet-reviews','Mullet Reviews','YouTube','💇','Mullet Reviews','explorer','Business up front, reviews in the back. Rates every landmark.'],
 ['tay-zonday','Tay Zonday','YouTube','☔','Tay Zonday','competitor','The chocolate rain guy. The deepest voice ever to go viral. Steps back from the mic to breathe.'],
 // ---- BASEketball (Coop and Remer are played by Trey Parker and Matt Stone)
 ['joe-cooper','Joe "Coop" Cooper','BASEketball','🏀','Trey Parker','competitor','Co-inventor of BASEketball. Psych-outs are a sacred part of the game.'],
 ['doug-remer','Doug Remer','BASEketball','🏀','Matt Stone','competitor','The other inventor of BASEketball. Driveway legend, terrible under pressure.'],
 ['trey-parker','Trey Parker','South Park','✏️','Trey Parker','competitor','Co-creator of South Park. Writes the episode the week it airs and wins anyway.'],
 ['matt-stone','Matt Stone','South Park','🎤','Matt Stone','scavenger','The other co-creator of South Park. Calmly finds the bonus while everything burns.'],
 // ---- directors and stars
 ['michael-bay','Michael Bay','Transformers','💣','Michael Bay','competitor','Every landmark gets a slow-motion explosion and a sunset helicopter.'],
 ['shia-labeouf','Shia LaBeouf','Transformers','✊','Shia LaBeouf','survivor','Just does it. Shrugs off every penalty and keeps going.'],
 ['james-cameron','James Cameron','Terminator','🌊','James Cameron','explorer','Terminator, Aliens, Titanic, Avatar. Dives to the bottom of every landmark himself.'],
 ['jeff-goldblum','Jeff Goldblum','Jurassic Park','🦖','Jeff Goldblum','scavenger','Uh, finds a way. Plays jazz piano between turns.'],
 ['michael-jackson','Michael Jackson','Michael Jackson','🕺','Michael Jackson','competitor','The King of Pop. Moonwalks back across the board after every win.'],
 ['john-malkovich','John Malkovich','Being John Malkovich','🚪','John Malkovich','explorer','Somebody keeps crawling into his head through a door on floor seven and a half.'],
 ['mahatma-gandhi','Mahatma Gandhi','Gandhi','🕊️','Mahatma Gandhi','survivor','Walks the long road without striking back. Penalties do not move him.'],
 ['bond-pattinson','James Bond · Robert Pattinson','James Bond','🍸','Robert Pattinson','competitor','A what-if Bond: brooding, rain-soaked, shaken and very stirred.'],
 // ---- Mad Max
 ['mad-max','Max Rockatansky','Mad Max','🚗','Mad Max','survivor','The road warrior. Last of the V8 Interceptors, a man of very few words.'],
 ['lord-humungus','Lord Humungus','Mad Max','🏒','The Road Warrior','competitor','The Warrior of the Wasteland in a hockey mask. Just walk away, he says.'],
 ['wez','Wez','Mad Max','🦅','The Road Warrior','competitor','Mohawk, crossbow, motorbike, no patience at all.'],
 ['toecutter','Toecutter','Mad Max','🏍️','Mad Max (film)','scavenger','Leader of the bike gang that started it all.'],
 ['gyro-captain','The Gyro Captain','Mad Max','🚁','The Road Warrior','explorer','Flies his gyrocopter over every landmark and talks the whole way.'],
 ['feral-kid','The Feral Kid','Mad Max','🪃','The Road Warrior','scavenger','Silent, fast, deadly with a metal boomerang.'],
 ['immortan-joe','Immortan Joe','Mad Max','💀','Mad Max: Fury Road','competitor','Rules the Citadel and its water. Witness him.'],
 ['furiosa','Imperator Furiosa','Mad Max','🦾','Mad Max: Fury Road','survivor','Drives the War Rig through everything the wasteland throws at her.'],
 ['nux','Nux','Mad Max','🔥','Mad Max: Fury Road','competitor','A War Boy who wants a glorious death and settles for a good drive.'],
 // ---- Talking Heads
 ['david-byrne','David Byrne','Talking Heads','👔','David Byrne','explorer','Big suit, bigger ideas. Asks how he got to every landmark.'],
 ['tina-weymouth','Tina Weymouth','Talking Heads','🎸','Tina Weymouth','competitor','Talking Heads bassist and the groove under every win.'],
 ['chris-frantz','Chris Frantz','Talking Heads','🥁','Chris Frantz','survivor','Talking Heads drummer. Keeps time through any penalty.'],
 ['jerry-harrison','Jerry Harrison','Talking Heads','🎹','Jerry Harrison','scavenger','Keys and guitar for Talking Heads, finding the bonus between the notes.'],
 // ---- horror and cult
 ['dani-ardor','Dani Ardor','Midsommar','🌼','Midsommar','survivor','Came for a summer festival in Sweden. Left as May Queen.'],
 ['the-mask','The Mask','The Mask','🟢','The Mask (1994 film)','competitor','Stanley Ipkiss puts on the mask and becomes a green-faced cartoon whirlwind. Smokin\'!'],
 ['alvey-avery','Alvey Avery','Son of the Mask','👶','Son of the Mask','scavenger','The baby born with the mask\'s powers. Chaos in a diaper.'],
 ['tim-avery','Tim Avery','Son of the Mask','🎨','Son of the Mask','explorer','A cartoonist and new dad who found the mask in the dog\'s mouth.'],
 ['gr-pat','Pat','Green Room','🎸','Anton Yelchin','survivor','Punk bassist trapped in the wrong club after the wrong show.'],
 ['gr-amber','Amber','Green Room','✂️','Imogen Poots','competitor','Shaved head, box cutter, no intention of dying in that green room.'],
 ['gr-darcy','Darcy Banker','Green Room','🐕','Patrick Stewart','scavenger','Owns the club, the dogs and the problem. Very calm about all three.'],
 ['gr-reece','Reece','Green Room','💪','Joe Cole','competitor','The band\'s drummer and the one who knows how to fight.'],
 ['gr-sam','Sam','Green Room','🎶','Alia Shawkat','explorer','Guitarist of the Ain\'t Rights. Wants to get back on the road.'],
 ['gr-tiger','Tiger','Green Room','🎤','Callum Turner','survivor','The band\'s singer. Mohawk, attitude, a very bad night.'],
 ['gr-gabe','Gabe','Green Room','🔑','Macon Blair','scavenger','Darcy\'s manager at the club, increasingly sure this was a mistake.'],
 ['drop-dead-fred','Drop Dead Fred','Drop Dead Fred','🤡','Drop Dead Fred','scavenger','A childhood imaginary friend who comes back to wreck everything, helpfully.'],
 ['godzilla','Godzilla','Godzilla','🦖','Godzilla','survivor','King of the Monsters. Wades through every landmark and every penalty.'],
 ['herkermer-homolka','Herkermer Homolka','Congo','🎩','Tim Curry','explorer','A Romanian "explorer" chasing the lost city of Zinj and its diamonds.'],
 ['amy-gorilla','Amy','Congo','🦍','Congo (film)','scavenger','A gorilla who talks through a sign-language glove and likes green drinks.'],
 ['brundlefly','Brundlefly','The Fly','🪰','The Fly (1986 film)','survivor','What Seth Brundle became after one teleport too many. Climbs walls, digests things.'],
 ['psycho-goreman','Psycho Goreman','Psycho Goreman','👹','Psycho Goreman','competitor','An evil alien overlord bossed around by the kid who owns his gem.'],
 // ---- The Dirty Dozen
 ['dd-reisman','Major Reisman','The Dirty Dozen','🎖️','Lee Marvin','competitor','Turns twelve prisoners into a commando team. Tough, unimpressed, effective.'],
 ['dd-franko','Victor Franko','The Dirty Dozen','😠','John Cassavetes','survivor','The loudest troublemaker of the Dozen.'],
 ['dd-jefferson','Robert Jefferson','The Dirty Dozen','🏃','Jim Brown','competitor','The fastest of the Dozen. Runs the length of the château under fire.'],
 ['dd-wladislaw','Joseph Wladislaw','The Dirty Dozen','🪖','Charles Bronson','survivor','Quiet, steady, the man Reisman trusts most.'],
 ['dd-maggott','Archer Maggott','The Dirty Dozen','🐍','Telly Savalas','scavenger','The most dangerous of the Dozen. Nobody turns their back on him.'],
 ['dd-pinkley','Vernon Pinkley','The Dirty Dozen','🤪','Donald Sutherland','explorer','Talked into impersonating a general and loved every second.'],
 ['dd-posey','Samson Posey','The Dirty Dozen','🗿','Clint Walker','survivor','The giant of the Dozen. Gentle until he isn\'t.'],
 ['dd-jiminez','Pedro Jiminez','The Dirty Dozen','🎸','Trini Lopez','scavenger','Plays guitar between drills.'],
 ['dd-gilpin','Glenn Gilpin','The Dirty Dozen','📋','Ben Carruthers','explorer','Keeps his head down and his kit in order.'],
 ['dd-lever','Roscoe Lever','The Dirty Dozen','🔧','Stuart Cooper','competitor','Young, nervous, determined to make it through.'],
 ['dd-sawyer','Seth Sawyer','The Dirty Dozen','🪓','Colin Maitland','survivor','Signs up for the mission rather than the noose.'],
 ['dd-vladek','Milo Vladek','The Dirty Dozen','⛏️','Tom Busby','scavenger','Digs in, holds the line.'],
 ['dd-bravos','Tassos Bravos','The Dirty Dozen','🗡️','Al Mancini','competitor','Steady hands, quiet nerve, one of the twelve.'],
 // ---- The Warriors (owner, Nov 24: one member of every gang in the roster; they wear their gang's face in the brawler, and
 // the rest of the crew and the Riffs from the film). Photo pages are the actors' (the film's credits); none where there is no page.
 ['cyrus','Cyrus','The Warriors','🙌','Roger Hill (actor)','competitor','Leader of the Gramercy Riffs, host of the Van Cortlandt summit.'],
 ['masai','Masai','The Warriors','🗡️','Masai (The Warriors)','competitor','Second-in-command of the Riffs; wants all the Warriors.'],
 ['mercy','Mercy','The Warriors','💄','Deborah Van Valkenburgh','explorer','Rides with the Warriors all the way to Coney.'],
 ['fox-warriors','Fox','The Warriors','🦊','Thomas G. Waites','scavenger','The Warriors scout.'],
 ['vermin','Vermin','The Warriors','🦺','Terry Michos','survivor','Carries the Warriors money and tokens.'],
 ['rembrandt','Rembrandt','The Warriors','🎨','Marcelino Sánchez','scavenger','The youngest Warrior, the graffiti artist.'],
 ['cowboy-warriors','Cowboy','The Warriors','🤠','Cowboy (The Warriors)','survivor','The Warrior in the cowboy hat.'],
 ['snow-warriors','Snow','The Warriors','❄️','Snow (The Warriors)','competitor','A Warriors enforcer with a taste for music.'],
 ['sully','Sully','The Warriors','🧥','Paul Greco','scavenger','Leader of the Orphans.'],
 ['starr','Starr','The Warriors','🔫','Starr (The Warriors)','competitor','Leader of the Lizzies.'],
 ['vance','Vance','The Warriors','🛼','Konrad Sheehan','competitor','The roller-skating leader of the Punks.'],
 ['turnbull-ac','Turnbull AC','The Warriors','🚌','Turnbull AC (The Warriors)','survivor',"A skinhead of the Turnbull AC's, riding the painted bus."],
 ['warriors-cop','The Policewoman','The Warriors','👮','Mercedes Ruehl','survivor','The undercover cop in the park.'],
];
const NEW_CHARACTERS4=ROWS4.map(([id,name,source,icon,actor,perk,line,extra={}])=>({
 id,name,source,icon,actor,assetKey:'char:'+id,unlockAt:999,perkType:perk,perk:PERKS4[perk]||PERKS4.competitor,unlockPhrase:line,
 unlockHint:extra.hint||`Win minigames or visit a ${source} landmark to recruit ${name}.`
}));
// the board landmarks for the sources that had none (src/data/iconicPlaces.js names them)
const NEW_SOURCES4=['Joe Dirt','The Waterboy','The Brothers Solomon','Who Charted?','Tim and Eric Awesome Show, Great Job!','YouTube','Transformers','Mad Max','Michael Jackson','Talking Heads','Gandhi','Midsommar','The Mask','Son of the Mask','Green Room','Drop Dead Fred','Being John Malkovich','Godzilla','Congo','Psycho Goreman','The Dirty Dozen'];
Object.assign(exports,{NEW_CHARACTERS4,ROWS4,NEW_SOURCES4});
