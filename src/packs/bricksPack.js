// Bricks Breaker Quest: a replica of the neon mobile brick breaker (separate from the Daft Punk Neon Ball Storm).
// One stage (or a Classic / 100 Balls run) each, players take turns on the same stage, higher score wins.
// Resolve the engine only when the game launches (requiring it while packs load creates a registry cycle).
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={bricksQuest:lazy('src/engines/bricksQuest.js','bricksQuest')};
const games=[{id:'bricks-breaker-quest',engine:'bricksQuest',title:'Bricks Breaker Quest',source:'Bricks Breaker Quest',icon:'🧱',category:'arcade',level:'mind',
 duration:'1 stage each',noBleed:true,
 rules:'Pick a stage on the quest map, then take turns playing it. Drag up from the launcher to aim (the dotted line shows the shot) or use the slider, and let go to fire the whole chain of balls. Every hit knocks a number off a brick; white rings add a ball. After each shot the wall drops a line: clear every brick before one reaches the bottom. Orange arrow bricks fire lasers along their row or column, boxed bricks blast their neighbours. Lightning (×3) wipes the lowest line, Ball Plus (×3) doubles a shot, the red button calls the balls home. Bricks destroyed in one shot pay 10, 20, 30…; higher score wins.'}];
Object.assign(exports,{engines,games,events:[]});
