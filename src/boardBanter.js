const {character}=require("src/characters.js");
const {sourceMatches}=require("src/references.js");
const {hash}=require("src/utils.js");
function updateBoardBanter(run){
 if(run.turn%4!==0&&!run.latestRecruit)return;
 const [a,b]=run.players,ca=character(a.character),cb=character(b.character),na=run.board.nodes[a.node],nb=run.board.nodes[b.node];let lines;
 if(run.latestRecruit){lines=[`${run.latestRecruit.name} joined my roster!`,'We’re going to need a bigger party.'];if(run.latestRecruit.owner!==a.owner)lines.reverse();delete run.latestRecruit;}
 else if(sourceMatches(ca.source,cb.source))lines=ca.source==='Home'?['Home turf. Which road are you taking?','Whichever one has snacks.']:['A familiar face in a very strange place.','Same world. Different route. See you at the gate!'];
 else if(na.realm!==nb.realm||Math.abs(na.col-nb.col)>8)lines=['You’re a long way over there!','I’ll meet you at the finish.'];
 else if(/wins|takes|minigame|–/.test(run.history[0]||''))lines=['Rematch at the next minigame?','Absolutely. I’m taking the scenic route first.'];
 else lines=hash(run.seed+':banter:'+run.turn)%2?['There’s a visitor on my road.','Save me a spot at the next challenge.']:['Shortcut, or supplies?','I’m checking the interesting road.'];
 run.banter={turn:run.turn,untilTurn:run.turn+1,lines};return lines;
}

Object.assign(exports,{updateBoardBanter});