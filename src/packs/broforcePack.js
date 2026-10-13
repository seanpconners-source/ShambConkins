// Four normal board/arcade Broforce missions. Resolve the engine only when one launches:
// requiring it while packs load creates a gameRegistry -> packs -> engines cycle.
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={broforce:lazy('src/engines/broforce.js','broforce')};
const COMMON={engine:'broforce',family:'broforce',source:'Broforce',category:'coop',level:'body',
 cooperative:true,duration:'90–180 seconds (target; untested)',reward:0};
const games=[
 {id:'broforce-jungle',title:'Broforce: Jungle',icon:'🌴',
  rules:'Two players fight together through the jungle. Move, jump and fire with your own controls; rescue prisoners to switch fighters, defeat the devil and board the extraction helicopter alive.'},
 {id:'broforce-factory',title:'Broforce: Factory',icon:'🏭',
  rules:'Cooperate through a dangerous factory. Move, jump and fire with your own controls; rescue prisoners to switch fighters, defeat the devil and board the extraction helicopter alive.'},
 {id:'broforce-city',title:'Broforce: City Siege',icon:'🏙️',
  rules:'Fight side by side through the besieged city. Move, jump and fire with your own controls; rescue prisoners to switch fighters, defeat the devil and board the extraction helicopter alive.'},
 {id:'broforce-desert',title:'Broforce: Desert Assault',icon:'🏜️',
  rules:'Battle together across the desert outpost. Move, jump and fire with your own controls; rescue prisoners to switch fighters, defeat the devil and board the extraction helicopter alive.'}
].map(game=>({...COMMON,...game,stageId:game.id}));
const events=[];
Object.assign(exports,{engines,games,events});
