// Sean of a Gun, our take on Broforce (the owner's name for it): one game in the Arcade (id 'broforce', the world is picked on its title screen). The four world ids stay as
// games because old saves and the board use them; `arcadeAs` keeps them off the Arcade's menus. Each mission is three
// stages. Players take turns on the same seeded mission and the higher score wins. Resolve the engine only when one
// launches: requiring it while packs load creates a gameRegistry -> packs -> engines cycle.
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={broforce:lazy('src/engines/broforce.js','broforce')};
const RULES='Take turns: each player runs the same three-stage mission and the higher score wins. Blast through destructible terrain, tunnels and bunkers, climb any wall by pushing into it, and kill the enemy for points. Free caged prisoners to switch bros (+1 life); the GOLD cage on each stage holds a character you have not unlocked yet. Stage 3 ends with the Devil, then get to the chopper! Touch: drag left side to run (up = jump), hold right side to fire, swipe up there to jump, down to throw a grenade.';
const COMMON={engine:'broforce',family:'broforce',source:'Broforce',srcLabel:'Run and gun',category:'arcade',level:'body',duration:'about 4 minutes each',rules:RULES};
const games=[
 {id:'broforce-jungle',title:'Sean of a Gun: Jungle',icon:'🌴'},
 {id:'broforce-factory',title:'Sean of a Gun: Factory',icon:'🏭'},
 {id:'broforce-city',title:'Sean of a Gun: City Siege',icon:'🏙️'},
 {id:'broforce-desert',title:'Sean of a Gun: Desert Assault',icon:'🏜️'}
].map(game=>({...COMMON,...game,stageId:game.id,arcadeAs:'broforce'}));
// the new worlds (Nov 14): Arcade only (the board keeps the first four, which its saves know), a boss on every stage
const NEW_RULES='Take turns on the same three-stage mission; the higher score wins. Every stage ends with a boss (two mini-bosses, then the world boss), then the chopper. New guns, new enemies (tanks, turrets, fliers, pop-ups you can stomp), lava, spikes, jump pads and warp portals. Touch: drag left side to run (up = jump), hold right side to fire, swipe up there to jump, down to throw a grenade.';
games.push(...[
 {id:'broforce-space',title:'Sean of a Gun: Space',icon:'🚀'},
 {id:'broforce-hell',title:'Sean of a Gun: Hell',icon:'🔥'},
 {id:'broforce-dimension',title:'Sean of a Gun: Upside Down',icon:'🌀'},
 {id:'broforce-games',title:'Sean of a Gun: Game World',icon:'🍄'}
].map(game=>({...COMMON,...game,rules:NEW_RULES,duration:'about 6 minutes each',stageId:game.id,arcadeAs:'broforce',randomEligible:false})));
games.unshift({...COMMON,id:'broforce',title:'Sean of a Gun',icon:'💥',worldSelect:true,randomEligible:false,rules:`Choose a world: Jungle, Factory, City, Desert, or the new Space, Hell, Upside Down and Game World (a boss on every stage). ${RULES}`});
const events=[];
Object.assign(exports,{engines,games,events});
