// Themed content for the warp zones (src/warpBoards.js). On a warp board every space draws only from its zone:
// minigames, trivia quizzes, item finds, Chance cards and bonus/penalty fortunes. The same games/items can still
// turn up elsewhere as they always have; this module only narrows what a warp board deals.
// The Pokémon warp has its own system (src/pkmn/) and is not listed here.
const {pick,shuffle}=require("src/utils.js");
const {selectItemDrop}=require("src/itemDrops.js");

// Chance cards use the normal event effects (src/events.js applyEvent): points, move, item, mg (minigame), steal, swap, chaos.
const card=(title,body,e)=>({title,body,e});
const WARP_THEMES={
 'rainbow-road':{source:'Mario Kart',
  games:['rainbow-road-kart','rainbow-balloon-battle'],trivia:['trivia-mariokart'],
  items:['wz-triple-mushroom','wz-banana-peel','wz-red-shell','wz-lightning-bolt','wz-bullet-bill','wz-golden-mushroom','wz-item-box','rainbow-pass','nintendo-blue-shell','nintendo-super-star'],
  cards:[card('Item Box: Triple Mushroom','Boost, boost, boost. The guardrail-free road blurs past.',['move',3]),card('Blue Shell incoming','First place is a lonely place. The shell finds you anyway.',['points',-3]),
   card('Lakitu’s fishing rod','You drove off the edge. Lakitu fishes you back a few spaces behind.',['move',-2]),card('Perfect drift','Blue sparks, then orange. Mini-turbo!',['chaos']),
   card('Coin line','Ten coins on the racing line. Top speed up.',['points',3]),card('Thwomp on the track','A Thwomp flattens your kart and your lead.',['points',-2]),
   card('Grand Prix qualifying','The starting lights drop. Race for pole position.',['mg','rainbow-road-kart']),card('Balloon Battle','Three balloons each. Pop or be popped.',['mg','rainbow-balloon-battle']),
   card('Item Box: Banana Peel','Leave a present on the racing line.',['item','wz-banana-peel']),card('Slipstream','You draft behind your rival and steal their momentum.',['steal',2])],
  bonus:[['Mushroom boost','A perfect rocket start.'],['Star power','Invincible and faster for a few glorious seconds.'],['Shortcut found','You jumped the gap nobody else saw.']],
  penalty:[['Spun out on a banana','Someone left a peel on the racing line.'],['Off the edge','No guardrails, as promised. Lakitu charges for the rescue.'],['Hit by a Red Shell','It homed in from three karts back.']]},
 'mario-world':{source:'Super Mario Bros. 3',
  games:['smb-world-1','smb-coin-rush','smb-castle-dash','smb3-nspade','smb3-spade-slots','rush-nintendo'],trivia:['trivia-smb3','trivia-nintendo'],
  items:['wz-question-block','wz-goal-flagpole','wz-super-leaf','wz-p-wing','wz-warp-whistle','wz-hammer-suit','wz-music-box','wz-frog-suit','wz-n-spade-card','v43-fire-flower','v43-starman','v43-lakitu-cloud','mega-mushroom'],
  cards:[card('Toad House','“Pick a chest!” Toad smiles. There is something inside.',['item','random']),card('Hammer Bros. on the map','They wander onto your square and start a fight.',['points',-2]),
   card('Spade Panel','Line up the mushroom, flower and star.',['mg','smb3-spade-slots']),card('N-Spade bonus','Flip the cards, match the pairs, two mistakes and out.',['mg','smb3-nspade']),
   card('World 1','Goombas, ? blocks, a coin room and a Warp Zone. Sixty seconds of coins.',['mg','smb-coin-rush']),card('Castle Dash','First one down the flagpole wins.',['mg','smb-castle-dash']),card('Warp Whistle','A gust of wind lifts you over half the world.',['move',3]),card('Airship flees','The Koopaling’s airship drifts back across the map, and so do you.',['move',-2]),
   card('1-Up Mushroom','A green mushroom slides out of a hidden block.',['points',4]),card('Coin Ship','A sky full of coins. Your rival only gets the leftovers.',['steal',3]),
   card('Kuribo’s Shoe','A Goomba’s shoe! Stomp ahead on spiked ground.',['chaos']),card('King’s wand','You return the wand to the king. He is a dog now, but grateful.',['points',3])],
  bonus:[['1-Up!','A hidden block in the corner of the level.'],['P-Switch coins','Every brick on screen became a coin.'],['Toad House prize','You picked the right chest.']],
  penalty:[['Lost a power-up','A Koopa shell bounced back off the wall.'],['Hammer Bros. ambush','Hammers, hammers everywhere.'],['Pulled into a Boom Boom fight','He flails. You flail. He wins this round.']]},
 'candy-land':{source:'Candy Land',
  games:['candy-gumdrop-catch','candy-color-dash'],trivia:['trivia-candyland','trivia-boardgames1'],
  items:['wz-gumdrop','wz-gumdrop-pass','wz-licorice','wz-molasses','wz-lolly-lollipop','wz-gingerbread-plum','wz-color-card'],
  cards:[card('Double red card','Two red squares ahead. Off you go.',['move',3]),card('Picture card: Plumpy','A picture card sends you all the way back to the Gingerbread Plum Tree.',['move',-3]),
   card('Rainbow Trail','You landed on the shortcut. The rainbow carries you forward.',['move',4]),card('Stuck in the Molasses Swamp','Your gingerbread pawn sinks to its knees.',['points',-2]),
   card('Princess Lolly’s gift','A lollipop the size of your head.',['item','wz-lolly-lollipop']),card('Queen Frostine’s ice cream','A scoop for the road.',['points',3]),
   card('Gumdrop Mountain race','Gumdrops rain down. Catch your colour.',['mg','candy-gumdrop-catch']),card('Colour card frenzy','The deck flips faster and faster.',['mg','candy-color-dash']),
   card('Lord Licorice’s trap','A sticky licorice space. Your rival’s fault, probably.',['points',-3]),card('Mr. Mint’s candy canes','He trades you a fresh-cut cane for your company.',['points',2])],
  bonus:[['Gumdrop Pass','The shortcut through the mountains.'],['King Kandy’s favour','The king waves from his castle.'],['Ice Cream Sea float','Queen Frostine gives you a lift.']],
  penalty:[['Licorice space','Sticky. Very sticky.'],['Molasses Swamp','Slow going, and Gloppy wants a toll.'],['Picture card backward','You drew the card that sends you back.']]},
 'chutes':{source:'Chutes and Ladders',
  games:['chutes-ladder-rush','chutes-spinner-showdown'],trivia:['trivia-chutes','trivia-boardgames1'],
  items:['wz-golden-ladder','wz-good-deed-badge','wz-lucky-spinner','wz-bent-spinner','wz-chute-wax','wz-kaa-coils','wz-ladder-rung'],
  cards:[card('Good deed!','You helped carry the groceries. Up the ladder you go.',['move',3]),card('Cookie jar caught','Hand in the cookie jar. Down the chute.',['move',-3]),
   card('Spinner lands on 6','The arrow wobbles, then stops on six.',['chaos']),card('Planted a garden','The board rewards gardening.',['points',3]),
   card('Broke a window','A baseball through the window. That will cost you.',['points',-2]),card('Climbing contest','Race up the playground ladders.',['mg','chutes-ladder-rush']),
   card('Spinner showdown','Stop the spinner on the number you need.',['mg','chutes-spinner-showdown']),card('Kaa’s hypnosis','“Trust in me.” You trade places with your rival.',['swap']),
   card('Shared your toys','Generosity pays: your rival’s points come to you.',['steal',2]),card('A spare rung','Somebody left a ladder rung lying around.',['item','wz-golden-ladder'])],
  bonus:[['Long ladder','The big one from the bottom row.'],['Good citizen','The picture shows you doing chores.'],['Lucky spin','Exactly the number you needed.']],
  penalty:[['The long chute','Ninety-something squares of progress, gone.'],['Caught misbehaving','The picture says it all.'],['Kaa squeezes','The python on the last square tightens its coils.']]},
 'monopoly':{source:'Monopoly',
  games:['monopoly-speed-die','monopoly-auction'],trivia:['trivia-monopoly','trivia-boardgames1'],
  items:['wz-jail-free','wz-pass-go','wz-hotel','wz-free-parking','wz-reading-railroad','wz-luxury-tax','wz-speed-die'],
  cards:[card('Advance to GO','Collect $200 on the way.',['points',4]),card('Bank error in your favour','Collect.',['points',3]),
   card('Go directly to Jail','Do not pass GO. Do not collect $200.',['move',-3]),card('Pay poor tax','A small fee to the bank.',['points',-2]),
   card('You have been elected Chairman of the Board','Pay each player fifty dollars.',['points',-2]),card('Take a ride on the Reading','Advance to the railroad.',['move',2]),
   card('Speed Die rolled','The red die says Mr. Monopoly. Race around the board.',['mg','monopoly-speed-die']),card('Auction!','Nobody bought it. Bid on it now.',['mg','monopoly-auction']),
   card('Get Out of Jail Free','This card may be kept until needed.',['item','wz-jail-free']),card('Collect rent','Your rival landed on your hotel.',['steal',3])],
  bonus:[['Passed GO','Collect $200.'],['Free Parking jackpot','House rules: the middle of the board pays out.'],['Rent day','Your rival landed on Boardwalk. With a hotel.']],
  penalty:[['Income Tax','Pay 10%, or $200.'],['Luxury Tax','Pay $100. Mr. Monopoly insists.'],['Street repairs','$40 per house, $115 per hotel.']]},
 'clue':{source:'Clue',
  games:['clue-whodunit','clue-lineup'],trivia:['trivia-clue','trivia-boardgames1'],
  items:['wz-magnifying-glass','wz-secret-passage','wz-candlestick','wz-lead-pipe','wz-rope','wz-notepad','wz-sealed-envelope'],
  cards:[card('Secret passage','From the Study straight to the Kitchen.',['move',3]),card('A wrong accusation','You named the wrong room. Your detective badge is docked.',['points',-3]),
   card('Wadsworth’s tip','The butler did it. Or he knows who did.',['points',3]),card('Someone switched off the lights','In the dark, you end up in your rival’s seat.',['swap']),
   card('Open the case file','The envelope is on the table. Solve it first.',['mg','clue-whodunit']),card('Line them up','Six suspects walk in. One slips out. Who?',['mg','clue-lineup']),
   card('Found the rope','In the Conservatory, under a fern.',['item','wz-rope']),card('Shown a card','Your rival had to show you their evidence.',['steal',2]),
   card('Telegram','“Communism was just a red herring.” Move on.',['move',2]),card('Singing telegram','It ends badly for the singer and for your points.',['points',-2])],
  bonus:[['Your suggestion stood','Nobody could disprove it.'],['A clean alibi','You were in the Library the whole time.'],['Detective’s hunch','Mrs. Peacock’s nervous laugh gave it away.']],
  penalty:[['Caught in the Ballroom','Holding the candlestick. Awkward.'],['Disproved','Everyone had a card to show you.'],['Red herring','You followed the wrong clue across the mansion.']]},
 'hyrule':{source:'The Legend of Zelda',
  games:['hyrule-rupee-rush','hyrule-sword-duel'],trivia:['trivia-zelda'],
  items:['wz-pegasus-boots','wz-boomerang','wz-ocarina','wz-bomb-bag','wz-master-sword','wz-blue-candle','wz-wooden-sword','v43-hookshot','v43-fairy-bottle','v43-rupee-wallet','nintendo-heart-container','nintendo-triforce-shard'],
  cards:[card('It’s dangerous to go alone','An old man in a cave hands you something.',['item','random']),card('Cut the grass','A green rupee, a blue rupee… a red one!',['points',3]),
   card('Octorok ambush','Rocks from every direction.',['points',-2]),card('Song of Soaring','You warp to a statue further along.',['move',3]),
   card('Lost Woods','Wrong turn. The woods loop you back.',['move',-2]),card('Rupee Rush','Cut every bush on the screen before your rival does.',['mg','hyrule-rupee-rush']),
   card('Sword duel','Two Links, one field.',['mg','hyrule-sword-duel']),card('Great Fairy fountain','She laughs and heals everything.',['chaos']),
   card('Tingle sells you a map','It costs a fortune and it is upside down.',['points',-2]),card('Treasure chest','Da-na-na-naaa!',['item','random'])],
  bonus:[['Heart Container','The boss left one behind.'],['Red rupee','Twenty rupees under a rock.'],['Great Fairy','Fully healed and slightly bewildered.']],
  penalty:[['Cucco attack','You hit one chicken too many.'],['Like Like','It ate your shield.'],['Lost Woods','Every path looks the same.']]},
 'green-hill':{source:'Sonic the Hedgehog',
  games:['sonic-ring-rush','sonic-goal-dash'],trivia:['trivia-sonic'],
  items:['wz-speed-shoes','wz-blue-shield','wz-invincibility','wz-super-ring','wz-chaos-emerald','wz-yellow-spring','wz-giant-ring','wz-end-signpost'],
  cards:[card('Speed Shoes','The music speeds up and so do you.',['chaos']),card('Spring!','A yellow spring launches you along the hill.',['move',3]),
   card('Motobug hit','Rings everywhere. You grab some back.',['points',-2]),card('Super Ring monitor','Ten rings at once.',['points',3]),
   card('Spikes','Right where the loop comes out. Classic.',['points',-3]),card('Lamppost','Checkpoint saved, star spins.',['points',2]),
   card('Ring Rush','Sixty seconds. Most rings wins.',['mg','sonic-ring-rush']),card('Goal Dash','First to the signpost.',['mg','sonic-goal-dash']),
   card('Spin dash','Rev, rev, release.',['move',2]),card('Rings scattered','Your rival’s rings bounce over to you.',['steal',3])],
  bonus:[['Chaos Emerald','One of seven.'],['Fifty-ring bonus','Enough for a Special Stage.'],['Signpost spin','It shows your face.']],
  penalty:[['Ring loss','Hit by a Buzz Bomber.'],['Bottomless pit','The loop launched you straight into it.'],['Badnik ambush','A Crabmeat fired from the ledge.']]},
 'bond-lair':{source:'James Bond',
  games:['bond-laser-vault','bond-golden-gun','bond-goldfinger-bomb','bond-baccarat','goldeneye-facility','moonraker-lander','laser-table','oddjob-hat-game','ski-chase'],trivia:['trivia-bondquiz','trivia-goldeneye'],
  items:['wz-diamond-collar','wz-golden-bullet','wz-fort-knox-key','golden-gun','oddjob-hat','aston-key','exploding-pen','bond-watch','jetpack','vesper-martini','walther','spectre-ring','blofeld-cat','briefcase-gadget','bond-lockpick','v43-aston-eject-button','ge-proximity-mine'],
  cards:[card('Q Branch delivery','“Do pay attention, 007.” Q hands over something that was definitely not cleared by accounting.',['item','random']),card('Shaken, not stirred','The bartender gets it exactly right. You feel licensed to win.',['points',3]),
   card('Trapdoor to the piranha pool','Blofeld presses a button. The floor under your chair disappears.',['move',-3]),card('Aston Martin ejector seat','You press the red button under the gearstick. Your rival goes flying.',['swap']),
   card('Laser vault alarm','You brushed a beam. Guards everywhere.',['points',-2]),card('The vault is open','Diamonds behind a grid of red beams. Go.',['mg','bond-laser-vault']),
   card('Scaramanga’s funhouse','Mirrors, mannequins and a man with three nipples.',['mg','bond-golden-gun']),card('The bomb in Fort Knox','The clock is running. Stop it at 007.',['mg','bond-goldfinger-bomb']),
   card('Monorail ride','The lair’s monorail whisks you deeper inside.',['move',3]),card('Card game with Le Chiffre','You read his tell. His chips come to you.',['steal',3]),
   card('Oddjob’s hat','A bowler hat crosses the room at an alarming speed.',['points',-3]),card('Henchman’s uniform','Nobody looks twice at another man in a jumpsuit.',['chaos'])],
  bonus:[['Licence to kill','MI6 signs off on the paperwork.'],['Moneypenny’s tip','She slips you the file before M sees it.'],['A gadget that works','Q is as surprised as you are.']],
  penalty:[['Captured','“No, Mr. Bond, I expect you to die.”'],['Shot by a henchman','They finally hit something.'],['Tuxedo ruined','Volcano ash does not come out.']]},
 'south-park':{source:'South Park',
  games:['sp-dodgeball','sp-cheesy-poofs','sp-killed-kenny','snowball-fight','wii-wait'],trivia:['trivia-southpark'],
  items:['wz-dodgeball','wz-poofs-bowl','wz-kenny-parka','wz-chinpokomon','wz-tweek-coffee','wz-city-wok','wz-big-wheel','wz-salty-balls','wz-mr-hat','wz-triangle-zinthar','wz-manbearpig-trap','wz-respect-badge','cheesy-poofs','gamesphere','v43-chefs-chocolate-balls','v43-towelie-towel','v43-cartman-chili'],
  cards:[card('New kid in town','Somebody new just moved to South Park, and they want to hang out with you.',['southpark']),card('Bus stop small talk','The kid at the bus stop says you are pretty cool. They tag along.',['southpark']),
   card('Mr. Mackey’s office','You get sent to the counsellor. A kid in the waiting room joins your roster, mmkay?',['southpark']),
   card('Respect my authoritah!','Cartman confiscates your rival’s points with a stolen police hat.',['steal',3]),card('Kenny died again','You stop for the funeral. He shows up next week anyway.',['move',-2]),
   card('City Wok delivery','Shitty Wok? No, City Wok. Fortune cookie says +3.',['points',3]),card('Towelie wants to get high','You lose a whole turn’s worth of focus listening to him.',['points',-2]),
   card('Dodgeball tryouts','The World Championship is next week. Show them your arm.',['mg','sp-dodgeball']),card('Cheesy Poofs ad break','Cartman’s favourite snack is raining from the ceiling.',['mg','sp-cheesy-poofs']),
   card('Oh my God!','Something enormous is falling on Kenny. Save him.',['mg','sp-killed-kenny']),card('Timmy!','Timmy offers you a ride. Timmy!',['move',3]),
   card('ManBearPig sighting','Al Gore insists it is real. Everybody panics and swaps places.',['swap']),card('Chinpokomon craze','Gotta buy ’em all. Your rival’s pocket money becomes yours.',['steal',2])],
  bonus:[['You know, I learned something today','Stan’s speech gets a slow clap.'],['Mr. Hankey visits','Howdy ho! He brings presents.'],['Snow day','School is cancelled. Victory lap.']],
  penalty:[['Screw you guys','Cartman storms off with your stuff.'],['Detention','Mr. Garrison and Mr. Hat are not amused.'],['Chef’s salty balls','You should not have tried them.']]},
 castlevania:{source:'Castlevania',
  games:['cv-vampire-killer','cv-candle-hunt','castlevania-courtyard','castlevania-bell-tower'],trivia:['trivia-castlevania'],
  items:['wz-stage-map','wz-wall-candle','wz-morning-star','wz-throwing-axe','wz-boomerang-cross','wz-stopwatch','wz-pot-roast','wz-rosary','wz-invisibility-potion','wz-money-bag','wz-magic-crystal','vampire-killer','holy-water','alucard-shield'],
  cards:[card('Wall meat','You whip a suspicious brick and a whole pot roast falls out. Nobody asks how long it was in there.',['points',4]),card('Medusa Head','It bobs in on a sine wave and knocks you backwards, as they do.',['move',-2]),
   card('What a horrible night','To have a curse. The villagers lock their doors.',['points',-2]),card('The ferryman','“Take me to the next stage.” He rows you downriver.',['move',3]),
   card('Candle on the wall','You crack the whip and something drops out of the flame.',['item','random']),card('Stopwatch','Time freezes for everyone but you.',['chaos']),
   card('Holy water','A flask of burning blue fire, right at your rival’s feet. Their hearts spill out.',['steal',3]),card('Simon’s Quest clue','“Get a silk bag from the graveyard duck to live longer.” You swap places while you puzzle it out.',['swap']),
   card('Vampire Killer Dash','The castle doors open. First to slay the Phantom Bat.',['mg','cv-vampire-killer']),card('Night of the Candles','Sixty seconds, one whip, a castle full of candles.',['mg','cv-candle-hunt']),
   card('Crumbling stairs','The step gives way under your boots.',['move',-2]),card('Knocked into a pit','A bat touches you on the edge of the stairs. Down you go.',['points',-3])],
  bonus:[['Magic crystal','The boss dropped it and your health bar refills.'],['Morning Star','Your whip is a chain now, and longer.'],['1,000-point money bag','Hidden behind a wall nobody else thought to whip.']],
  penalty:[['Knockback','A bat brushed you and you flew backwards into a pit.'],['Medusa Head','It came out of nowhere on a sine wave.'],['A horrible night','To have a curse.']]}
};
const WARP_THEME_IDS=Object.keys(WARP_THEMES);
function warpTheme(run){const b=run?.board;if(b?.format!=='warp')return null;return WARP_THEMES[b.warp?.id]||null;}
const allowedGames=theme=>[...theme.games,...theme.trivia];
// The next themed game for this warp: trivia filter → a themed quiz; anything else → a themed minigame,
// dealt from a shuffled bag so the zone's games rotate before repeating.
function warpGameId(run,filter='all',random=Math.random,gameById=()=>true){
 const theme=warpTheme(run);if(!theme)return null;
 if(filter==='trivia'){const list=theme.trivia.filter(gameById);return list.length?pick(list,random):null;}
 const list=theme.games.filter(gameById);if(!list.length)return null;
 const key=run.board.warp.id;run.warpGameBags||={};let bag=(run.warpGameBags[key]||[]).filter(id=>list.includes(id));
 if(!bag.length){bag=shuffle(list,random);const last=run.gameHistory?.at(-1)?.id;if(bag.length>1&&bag.at(-1)===last)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];}
 const id=bag.pop();run.warpGameBags[key]=bag;return id;
}
// A game id is fine on a warp board when it belongs to that zone (or is a boss fight).
function warpAllowsGame(run,game){const theme=warpTheme(run);if(!theme||!game)return true;return !!game.bossId||allowedGames(theme).includes(game.id);}
function warpItem(run,player,profile,random,findItem){
 const theme=warpTheme(run);if(!theme)return null;const items=theme.items.map(findItem).filter(Boolean);
 return items.length?selectItemDrop(items.map(it=>({...it,findWeight:1})),{random,player,profile}):null;
}
function warpCard(run,random,findItem){
 const theme=warpTheme(run);if(!theme)return null;const seen=new Set(run.warpCardsSeen||[]);
 let pool=theme.cards.filter(c=>!seen.has(c.title));if(!pool.length){run.warpCardsSeen=(run.warpCardsSeen||[]).filter(t=>!theme.cards.some(c=>c.title===t));pool=theme.cards;}
 const c=pick(pool,random);(run.warpCardsSeen||=[]).push(c.title);
 let e=c.e;if(e[0]==='item'&&e[1]==='random'){const it=pick(theme.items.map(findItem).filter(Boolean),random);e=['item',it?.id];}
 return {id:'warp-card:'+c.title,title:c.title,source:theme.source,body:c.body,e,warpCard:true};
}
function warpFortune(run,type,random){
 const theme=warpTheme(run);if(!theme)return null;const [title,body]=pick(theme[type==='penalty'?'penalty':'bonus'],random);return {source:theme.source,title,body};
}
Object.assign(exports,{WARP_THEMES,WARP_THEME_IDS,warpTheme,warpGameId,warpAllowsGame,warpItem,warpCard,warpFortune});
