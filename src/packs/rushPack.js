// Content pack: rushPack. Microgame Rush (WarioWare, Nintendo): simultaneous 4-8 s microgames on split halves.
// Lazy require: keeps this pack from joining the module-load cycle that runs through the registry.
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={rush:lazy("src/engines/rush.js","rush")};
const base={engine:'rush',family:'rush',source:'WarioWare (Nintendo)',icon:'💣',category:'skill',level:'body'};
const games=[
 {...base,id:'microgame-rush',title:'Microgame Rush',duration:'12 microgames · ~85 s',rush:{rounds:12},
  rules:'WarioWare-style, both of you at once. Each round flashes a one-word order (DODGE! SLICE! STACK!) and a 4 second microgame on your half of the screen: landscape left/right, portrait top/bottom. First to finish scores 2, second scores 1. Tempo jumps every 3 rounds; every 6th round is a BOSS worth double. Twelve rounds, most points wins.'},
 {...base,id:'rush-marathon',title:'Microgame Rush · Marathon',duration:'20 microgames · ~2.5 min',rush:{rounds:20},
  rules:'The long WarioWare run: twenty microgames at the same time on your half of the screen, tempo up every 3 rounds, a BOSS every 6th. First to finish scores 2, second 1. Most points after twenty rounds wins (ties go to sudden death).'}
];
const events=[
 {...base,id:'rush-nintendo',title:'Nintendo Rush',source:'Nintendo (Mario, Duck Hunt, Tetris, Donkey Kong)',duration:'12 video-game microgames',rush:{rounds:12,theme:'game'},
  rules:'A WarioWare-style rush with only video-game microgames: stomp Goombas, shoot the duck, rotate Tetris pieces, jump the barrels. Both of you at once, first to finish scores 2, second 1, BOSS every 6th round.'}
];
Object.assign(exports,{engines,games,events});
