// Content pack: remakePack. New modes of remade arcade classics (the original game ids stay in gameRegistry.js).
// Engines live in the base ENGINES table, so this pack only adds game entries.
const games=[
 {id:'space-swarm-versus',engine:'galaga',invaderMode:'versus',title:'Space Invaders · Mars Attacks! Versus',source:'Space Invaders',icon:'👾',category:'duel',level:'body',duration:'90 seconds',
  rules:'Both cannons on one screen at once: P1 touches the left half, P2 the right. Drag to slide your cannon, hold to fire (one shot in the air at a time). Every invader you hit is yours: squid 30, crab 20, octopus 10, the Martian saucer up to 300. Three cannons each; most points after 90 seconds wins.'},
 {id:'space-swarm-coop',engine:'galaga',invaderMode:'coop',title:'Space Invaders · Mars Attacks! Co-op',source:'Space Invaders',icon:'🛸',category:'coop',level:'body',duration:'4 waves',
  rules:'Defend Earth together. Two cannons, six lives shared between you, and the waves come faster and lower each time. Drag on your half to move, hold to fire; bunkers soak up shots from both sides. Clear four waves before the Martians land.'},
 {id:'django-hangman-showdown',engine:'hangman',hangMode:'turns',title:'Hangman Unchained · Showdown',source:'Django Unchained',icon:'🔫',category:'puzzle',level:'mind',duration:'3 bounties',
  rules:'Take turns on one big keyboard, one letter each. The keyboard, the banner and your cowboy\'s card glow in your colour when it\'s your shot; 15 seconds a shot (running out counts as a miss). +10 for every time your letter appears. A miss builds your cowboy on the gallows; six and the trapdoor drops (−20). The last letter collects the bounty (+40). Three phrases.'},
 {id:'django-hangman-wanted',engine:'hangman',hangMode:'pass',title:'Hangman Unchained · Wanted',source:'Django Unchained',icon:'🪢',category:'puzzle',level:'mind',duration:'1 bounty each',
  rules:'Pass the phone. One player writes a secret phrase (or deals one from a deck of 600 movies, sayings and loaded phrases) while the other looks away, then the other guesses with big touch keys. Every letter found +10; solving +60 and +15 per bullet left. Six misses and the trapdoor drops: the writer collects +50. Then swap.'}
];
Object.assign(exports,{engines:{},games,events:[]});
