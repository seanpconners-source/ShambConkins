// Crappy Crush: Candy Crush with the board game's items as the pieces (owner, Nov 18). Engine: src/engines/crappyCrush.js.
// Resolve the engine only when the game launches (requiring it while packs load creates a registry cycle).
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={crappycrush:lazy('src/engines/crappyCrush.js','crappyCrush')};
const games=[{id:'crappy-crush',engine:'crappycrush',title:'Crappy Crush',source:'Candy Crush Saga',srcLabel:'Candy Crush',icon:'💩',category:'puzzle',level:'mind',
 duration:'90 seconds (1P: stages)',soloKind:'cpu',noBleed:true,
 rules:'Candy Crush, but every piece is an item from the game. Swipe a piece into its neighbour (or tap one, then the other) to line up 3 or more of the same. 4 in a row make a Mylo Coin that clears its row or column, an L or T makes a KC Coin that blasts, 5 make the Loki Coin that clears every piece of the kind you swap it with; swap two specials together for a combo. Crap piles never match: match next to them to scrape them off. 2 players race the same board for 90 seconds and every cascade or special dumps crap on the other board. 1 Player: play the stage map (576 stages in 72 themed worlds, Candy Land is the tutorial; goals, stars) or race the CPU.'}];
Object.assign(exports,{engines,games,events:[]});
