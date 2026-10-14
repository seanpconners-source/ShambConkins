// Content pack: remakePack. New modes of remade arcade classics (the original game ids stay in gameRegistry.js).
// Engines live in the base ENGINES table, so this pack only adds game entries.
const games=[
 {id:'space-swarm-versus',engine:'galaga',invaderMode:'versus',title:'Space Invaders · Mars Attacks! Versus',source:'Space Invaders',icon:'👾',category:'duel',level:'body',duration:'90 seconds',
  rules:'Both cannons on one screen at once: P1 touches the left half, P2 the right. Drag to slide your cannon, hold to fire (one shot in the air at a time). Every invader you hit is yours: squid 30, crab 20, octopus 10, the Martian saucer up to 300. Three cannons each; most points after 90 seconds wins.'},
 {id:'space-swarm-coop',engine:'galaga',invaderMode:'coop',title:'Space Invaders · Mars Attacks! Co-op',source:'Space Invaders',icon:'🛸',category:'coop',level:'body',duration:'4 waves',
  rules:'Defend Earth together. Two cannons, six lives shared between you, and the waves come faster and lower each time. Drag on your half to move, hold to fire; bunkers soak up shots from both sides. Clear four waves before the Martians land.'}
];
Object.assign(exports,{engines:{},games,events:[]});
