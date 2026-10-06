const {generateBoard, addHorrorBoard}=require("src/board.js");
const {pairForRun, addPairTrail}=require("src/pairs.js");
const {addPocketBoard}=require("src/events.js");
// Carry a v0.20–22 expedition onto the uploaded trail without resetting its
// scores, inventory, unlocks, pending result, or already-rolled movement.
function upgradeRunFormat(run){
 if(!run||run.board.format==='original-trail')return false;
 const old=run.board,currentOld=run.board.nodes[run.players[run.current].node],board=generateBoard(run.seed,run.maxTurns,old.theme||'Mashup');
 const rule=pairForRun(run);if(rule?.trail)addPairTrail(board,rule);
 if(run.horror||old.realms.horror)addHorrorBoard(board);
 if(old.realms['upside-down'])addPocketBoard({...run,board});
 const remap=new Map();
 function mapId(id){if(remap.has(id))return remap.get(id);const node=old.nodes[id];if(!node)return board.realms.mind.start;const from=old.realms[node.realm],to=board.realms[node.realm];if(!to)return board.realms.mind.start;if(id===from.start){remap.set(id,to.start);return to.start;}if(id===from.gate){remap.set(id,to.gate);return to.gate;}
  const main=to.ids.map(id=>board.nodes[id]).filter(n=>!n.branch&&n.lane===0).sort((a,b)=>a.col-b.col);const candidates=main.length?main:to.ids.map(id=>board.nodes[id]);const ratio=Math.max(0,Math.min(1,node.col/Math.max(1,from.cols)));const target=candidates[Math.round(ratio*(candidates.length-1))]?.id||to.start;remap.set(id,target);return target;
 }
 for(const player of run.players){player.node=mapId(player.node);player.visited=player.visited.map(mapId);player.routeChoices ||= [];player.mood ||= 'normal';}
 if(run.upsideDown)run.upsideDown.returnNode=mapId(run.upsideDown.returnNode);
 for(const trap of run.traps||[])trap.node=mapId(trap.node);
 // An interrupted landing still resolves the encounter already reached.
 if(run.phase==='landing'){const oldPlayer=currentOld;if(oldPlayer){const current=board.nodes[run.players[run.current].node];current.type=oldPlayer.type;current.location=oldPlayer.location;current.source=oldPlayer.source;}}
 run.board=board;run.camera='follow';run.pan=null;run.formatMigratedFrom=old.format||'lane-board';run.history.unshift('The original winding trail is back. Scores, items and this turn carried over.');run.history=run.history.slice(0,60);return true;
}

Object.assign(exports,{upgradeRunFormat});