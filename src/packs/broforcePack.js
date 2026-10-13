// Four Broforce missions (one per theme), each three stages long. Players take turns on the same seeded mission and
// the higher score wins. Resolve the engine only when one launches: requiring it while packs load creates a
// gameRegistry -> packs -> engines cycle.
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={broforce:lazy('src/engines/broforce.js','broforce')};
const RULES='Take turns: each player runs the same three-stage mission and the higher score wins. Blast through destructible terrain, tunnels and bunkers, climb any wall by pushing into it, and kill the enemy for points. Free caged prisoners to switch bros (+1 life); the GOLD cage on each stage holds a character you have not unlocked yet. Stage 3 ends with the Devil, then get to the chopper! Touch: drag left side to run (up = jump), hold right side to fire, swipe up there to jump, down to throw a grenade.';
const COMMON={engine:'broforce',family:'broforce',source:'Broforce',category:'arcade',level:'body',duration:'about 4 minutes each',rules:RULES};
const games=[
 {id:'broforce-jungle',title:'Broforce: Jungle',icon:'🌴'},
 {id:'broforce-factory',title:'Broforce: Factory',icon:'🏭'},
 {id:'broforce-city',title:'Broforce: City Siege',icon:'🏙️'},
 {id:'broforce-desert',title:'Broforce: Desert Assault',icon:'🏜️'}
].map(game=>({...COMMON,...game,stageId:game.id}));
const events=[];
Object.assign(exports,{engines,games,events});
