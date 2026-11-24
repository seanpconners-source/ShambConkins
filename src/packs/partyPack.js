// Content pack: partyPack. Slow, social pass-and-play games (hidden information, bluffing, drawing, prediction).
// Engines are required lazily: packs load early, and the engine modules pull in assets/characters (circular otherwise).
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={plinko:lazy("src/engines/plinkoShow.js","plinko"),bigwheel:lazy("src/engines/bigWheel.js","bigWheel"),partyNewlywed:lazy("src/engines/partyNewlywed.js","newlywed"),partyRoast:lazy("src/engines/partyRoast.js","roast"),partyLiarsDice:lazy("src/engines/partyLiarsDice.js","liarsDice"),partyDrawIt:lazy("src/engines/partyDrawIt.js","drawIt"),partyBattleship:lazy("src/engines/partyBattleship.js","battleship"),partySimon:lazy("src/engines/partySimon.js","simon"),partyPrice:lazy("src/engines/tpirShow.js","tpirShow")};
const games=[
 {id:'newlywed-spirit',engine:'partyNewlywed',family:'partyNewlywed',title:'The Newlywed Game · Spirit Battery',source:'The Newlywed Game',icon:'💞',category:'puzzle',level:'spirit',duration:'7 rounds',
  rules:'Answer a question about yourself in secret while your partner secretly guesses it. Matches charge the sync battery and score points; the last round is worth double.'},
 {id:'roast-battle',engine:'partyRoast',family:'partyRoast',title:'Roast Battle · Crowd Meter',source:'Roast Battle',icon:'🎤',category:'duel',level:'spirit',duration:'3 rounds each',
  rules:'Pick a roast card, read it out loud, and your opponent rates the burn with 1 to 3 OHHHs. A hidden crowd adds surprise bonuses by joke type, and each round has a winner.'}
 ,{id:'liars-dice',engine:'partyLiarsDice',family:'partyLiarsDice',title:'Pirates of the Caribbean · Liar’s Dice',source:'Pirates of the Caribbean: Dead Man’s Chest',icon:'🎲',category:'casino',level:'mind',duration:'until a cup is empty',
  rules:'Each of you hides five dice under a cup and takes turns raising a bid on how many of one face are on the table. Ones are wild. Call LIAR and the loser of the showdown drops a die; lose them all and you walk the plank.'}
 ,{id:'draw-it',engine:'partyDrawIt',family:'partyDrawIt',title:'Pictionary · Draw It',source:'Pictionary',icon:'🎨',category:'skill',level:'mind',duration:'3 drawings each',
  rules:'Draw a secret pop-culture prompt with your finger in 25 seconds while the other player watches the replay and picks the right answer out of six. Faster guesses score more.'}
 ,{id:'battleship-fog',engine:'partyBattleship',family:'partyBattleship',title:'Battleship · Fog of War',source:'Battleship',icon:'🚢',category:'strategy',level:'mind',duration:'until a fleet sinks',
  rules:'Secretly place your fleet, then take turns firing at the enemy waters. A hit earns another shot, a miss passes the phone. Sink every enemy ship to win.'}
 ,{id:'simon-faceoff',engine:'partySimon',family:'partySimon',title:'Simon · Face-Off',source:'Simon',icon:'🔴',category:'puzzle',level:'mind',duration:'until a mistake',
  rules:'Pads light up in a growing pattern. Repeat the whole pattern from the start, then add one new pad for your opponent. The first mistake loses, and the pattern speeds up as it grows.'}
 ,{id:'price-bid-off',engine:'partyPrice',family:'partyPrice',title:'The Price Is Right',source:'The Price Is Right',icon:'🎡',category:'puzzle',level:'mind',duration:'one pricing game',noBleed:true,randomEligible:false,
  rules:'Come on down! The curtain goes up and the theme plays: pick a pricing game from the title screen. PLINKO: price four small prizes to win chips, then drop them down the board for up to $50,000. THE BIG WHEEL: pull it down hard, closest to $1.00 without going over wins. More pricing games are on the way.'}
 ,{id:'plinko-show',engine:'plinko',family:'plinko',arcadeAs:'price-bid-off',title:'Plinko',source:'The Price Is Right',icon:'🔵',category:'puzzle',level:'mind',duration:'a contestant each',noBleed:true,
  rules:'Come on down! Price four small prizes (one digit in each price is right) to win up to five Plinko chips, then drag a chip along the top of the board and let it go. It rattles down the pegs into $100, $500, $1,000, $0 or the $10,000 slot in the middle. Most money wins.'}
 ,{id:'big-wheel',engine:'bigwheel',family:'bigwheel',arcadeAs:'price-bid-off',title:'The Big Wheel',source:'The Price Is Right',icon:'🎡',category:'puzzle',level:'mind',duration:'a showdown',noBleed:true,
  rules:'Three contestants take turns at the Big Wheel: pull it down hard enough to go all the way round, then spin once more if you like. Closest to $1.00 without going over wins; hit exactly $1.00 for $1,000 and a bonus spin.'}
];
const events=[];
Object.assign(exports,{engines,games,events});
