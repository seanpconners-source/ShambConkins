// Word games. Resolve the engine only when the game launches (requiring it while packs load creates a registry cycle).
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={sqwordle:lazy('src/engines/sqwordle.js','sqwordle'),wordsnshit:lazy('src/engines/wordsNShit.js','wordsNShit')};
const games=[{id:'sqwordle',engine:'sqwordle',title:'Sqwordle',source:'Pokémon',srcLabel:'Wordle × Squirtle',icon:'🐢',category:'puzzle',level:'mind',
 duration:'1 word each',soloKind:'levels',noBleed:true,
 rules:'Guess the five-letter word in six tries, Squirtle style. Tap the keys (or type) and press ENTER: a tile turns blue for the right letter in the right spot, shell gold for a letter that is in the word somewhere else, grey for a letter that isn’t in it. Stuck? Tap Hint to see one letter in its spot (2 a word, 40 points each). Both players get the same word, one after the other: fewer guesses wins, the clock breaks ties. In 1 Player it’s word after word until one gets away.'},
 {id:'words-n-shit',engine:'wordsnshit',title:"Words n' Shit",source:'Words With Friends',srcLabel:'Words With Friends',icon:'🔤',category:'puzzle',level:'mind',
  duration:'quick or full game',soloKind:'cpu',noBleed:true,
  rules:'Words With Friends, our way. Drag tiles from your rack onto the board to make words that join the ones already there; the bubble shows the score (green = good to play). TW/DW triple or double the word, TL/DL triple or double the letter, and using all 7 tiles is a 35-point bingo. SHUFFLE mixes your rack, SWAP trades tiles for new ones, PASS skips. Racks stay hidden: pass the phone between turns. Highest score wins; on the board it is 3 turns each.'}];
Object.assign(exports,{engines,games,events:[]});
