// Content pack: arenaPack. Split-screen real-time two-player games (both humans play at once).
// Engines live in src/engines/arena*.js; shared helpers in src/engines/arenaKit.js.
// Engines load lazily so this pack can be required early without circular module imports.
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={hippos:lazy("src/engines/arenaHippos.js","hippos"),snow:lazy("src/engines/arenaSnow.js","snow"),disc:lazy("src/engines/arenaDisc.js","disc")};
const games=[
 {id:'hungry-hungry-heads',engine:'hippos',title:'Hungry Hungry Hippos · Hungry Hungry Heads',source:'Hungry Hungry Hippos',icon:'🦛',category:'arcade',level:'body',duration:'60 seconds',
  rules:'Your head is the hippo. Tap your half to snap your neck out to that spot and chomp the marbles there; hold to keep your mouth open and steer it (it tires after a second). Clumps give bonus chomps, golden marbles are worth 5 and the last ten seconds count double. Most marbles wins. P1 WASD + Space, P2 arrows + Enter.'}
 ,{id:'snowball-fight',engine:'snow',title:'South Park · Snowball Fight',source:'South Park',icon:'⛄',category:'duel',level:'body',duration:'best of 3 rounds',
  rules:'Top-down snowy yard, three hearts each. Drag your half to run, flick to throw a snowball that way, hold a finger still to pack a bigger one (it smashes walls), tap to build a snow wall. A hit costs a heart and buries your rival\u2019s face in snow. Best of three rounds. P1 WASD + Space (hold = big) + E, P2 arrows + Enter + period.'}
 ,{id:'disc-duel',engine:'disc',title:'Windjammers · Disc Duel',source:'Windjammers',icon:'🥏',category:'sports',level:'body',duration:'first to 12 or 75s',
  rules:'One disc, two catchers. Drag to run, touch near the disc to dive for it. Holding it, swipe to throw: faster is harder, a curved swipe curves the disc, a tap lobs. Goals pay 3 in the corners and 5 in the middle; a lob that lands uncaught is 2. First to 12, or most points at 75 seconds. P1 WASD + Space, E lob; P2 arrows + Enter, period lob.'}
];
const events=[];
Object.assign(exports,{engines,games,events});
