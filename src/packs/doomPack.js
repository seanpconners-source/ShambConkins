// Content pack: DOOM and DOOM II (src/engines/doom.js on the engine rebuild in src/engines/doom/). Arcade only: a
// level of Doom is far longer than a board-game minigame, so neither joins the random pool.
// Resolve the engine only when the game launches (requiring it while packs load creates a registry cycle).
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={doom:lazy('src/engines/doom.js','doom')};
const D={engine:'doom',category:'arcade',randomEligible:false,noBleed:true,reward:10,duration:'one level each (1P: the whole game)'};
const RULES='The real thing: title screen, menus, every episode, the intermission tally. Monsters wear random roster heads and your character is the face on the status bar. 2P: player 1 picks the level and skill, then each player gets one life on it; score = kills% + items% + secrets%, +100 for reaching the exit and up to +100 for beating par. One monster per level is WANTED (a character you haven’t unlocked): kill it to recruit them. Touch: left thumb moves, drag on the right to turn, FIRE / USE buttons, tap the arms numbers to switch weapons. Keys: WASD/arrows, Ctrl or Space fire, Enter use, 1–7, Tab map, Esc menu. Uses your own DOOM.WAD / DOOM2.WAD when you add one (Options), otherwise Freedoom.';
const games=[
 {...D,id:'doom',doomGame:'doom1',title:'DOOM',source:'Doom',icon:'💀',rules:RULES},
 {...D,id:'doom-2',doomGame:'doom2',title:'DOOM II: Hell on Earth',source:'Doom II',icon:'🔥',rules:RULES},
];
Object.assign(exports,{engines,games,events:[]});
