// Content pack: SUNDOWN SHOWDOWN (src/engines/sundown.js), an original western run-and-gun (ROADMAP H6) in the Sunset
// Riders genre, with the owner's Sunset Riders songs and voices. Lazy engine (packs must stay light, see CLAUDE.md).
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={sundown:lazy('src/engines/sundown.js','sundown')};
const games=[{id:'sundown-showdown',engine:'sundown',title:'Sundown Showdown',source:'Sunset Riders',icon:'🤠',category:'arcade',noBleed:true,soloKind:'levels',reward:10,
 duration:'one stage, about 2-3 minutes (1P and the Arcade: four stages in a row, then harder)',
 rules:'Run and gun through four western stages side by side: Main Street, a runaway train, a canyon and a mission at night. Each of you has a stick (move, aim 8 ways, duck) and FIRE and JUMP buttons; down + JUMP slides under bullets. Jump onto balconies, roofs, wagons and train cars; shoot windows, crates and powder kegs. One hit costs a life (3 each). Bandits score for whoever shoots them, fast kills chain a combo; the WANTED boss at the end pays a bounty split by damage, and beating him recruits him. Most points wins.'}];
Object.assign(exports,{engines,games,events:[]});
