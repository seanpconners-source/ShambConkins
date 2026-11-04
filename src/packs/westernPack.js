// Content pack: SUNDOWN SHOWDOWN (src/engines/sundown.js), an original western run-and-gun (ROADMAP H6) in the Sunset
// Riders genre, with the owner's Sunset Riders songs and voices. Lazy engine (packs must stay light, see CLAUDE.md).
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={sundown:lazy('src/engines/sundown.js','sundown')};
const games=[{id:'sundown-showdown',engine:'sundown',title:'Sundown Showdown',source:'Sunset Riders',icon:'🤠',category:'arcade',noBleed:true,soloKind:'levels',reward:10,
 duration:'one stage, about 90 seconds (1P: stage after stage)',
 rules:'Run and gun through a western town side by side. Drag in your half to aim and fire, drag further to run, tap to jump. One hit costs a life (3 each). Bandits score for whoever shoots them; the WANTED boss at the end pays a bounty split by damage, and beating him recruits him. Most points wins.'}];
Object.assign(exports,{engines,games,events:[]});
