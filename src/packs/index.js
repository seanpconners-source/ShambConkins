// Content-pack contract
//   engines: { engineName: async function(s) {...} }       merged into ENGINES
//   games:   [{id,engine,title,source,icon,category,duration,rules,reward?,...}]
//            appended to the random pool (family defaults to the engine name)
//   events:  same shape, but encounter-only (never rolled at random)
const packs=[require("src/packs/partyPack.js"),require("src/packs/arenaPack.js"),require("src/packs/tarantinoPack.js"),require("src/packs/rushPack.js"),require("src/packs/bossPack.js"),require("src/packs/warpPack.js")];
const engines={},games=[],events=[];
for(const p of packs){Object.assign(engines,p.engines||{});games.push(...(p.games||[]));events.push(...(p.events||[]));}
Object.assign(exports,{engines,games,events,packs});
