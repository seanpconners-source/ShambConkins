// Content-pack contract
//   engines: { engineName: async function(s) {...} }       merged into ENGINES
//   games:   [{id,engine,title,source,icon,category,duration,rules,reward?,...}]
//            appended to the random pool (family defaults to the engine name)
//   events:  same shape, but encounter-only (never rolled at random)
const packs=[require("src/packs/partyPack.js"),require("src/packs/arenaPack.js"),require("src/packs/tarantinoPack.js"),require("src/packs/rushPack.js"),require("src/packs/bossPack.js"),require("src/packs/warpPack.js"),require("src/packs/broforcePack.js"),require("src/packs/remakePack.js"),require("src/packs/bricksPack.js")];
const engines={},games=[],events=[],ids=new Set();
for(const p of packs){
 for(const [name,engine] of Object.entries(p.engines||{})){
  if(Object.prototype.hasOwnProperty.call(engines,name))throw new Error('Duplicate pack engine: '+name);
  engines[name]=engine;
 }
 for(const [entries,destination] of [[p.games||[],games],[p.events||[],events]]){
  for(const game of entries){
   if(ids.has(game.id))throw new Error('Duplicate pack game ID: '+game.id);
   ids.add(game.id);destination.push(game);
  }
 }
}
Object.assign(exports,{engines,games,events,packs});
