// Word games. Resolve the engine only when the game launches (requiring it while packs load creates a registry cycle).
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={sqwordle:lazy('src/engines/sqwordle.js','sqwordle')};
const games=[{id:'sqwordle',engine:'sqwordle',title:'Sqwordle',source:'Pokémon',srcLabel:'Wordle × Squirtle',icon:'🐢',category:'puzzle',level:'mind',
 duration:'1 word each',soloKind:'levels',noBleed:true,
 rules:'Guess the five-letter word in six tries, Squirtle style. Tap the keys (or type) and press ENTER: a tile turns blue for the right letter in the right spot, shell gold for a letter that is in the word somewhere else, grey for a letter that isn’t in it. Both players get the same word, one after the other: fewer guesses wins, the clock breaks ties. In 1 Player it’s word after word until one gets away.'}];
Object.assign(exports,{engines,games,events:[]});
