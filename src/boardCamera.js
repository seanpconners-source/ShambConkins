const {clamp}=require("src/utils.js");
function worldNode(run,n){if(run.board.format==='original-trail'||n.worldSpace)return n;const offset=['mind','body','spirit','horror','upside-down'].indexOf(n.realm);return {...n,x:n.x*1.5,y:n.y*1.75+Math.max(0,offset)*1000};}
// The camera and renderer share the same head coordinates, including large avatars.
// Journey-map boards (generation 7) pack spaces closer together, so heads are drawn smaller and the camera sits further back.
// Player heads are drawn at twice their original size so faces and expressions read on a phone.
const pieceScale=run=>2*(run.board.pieceScale||(run.board.generation>=7?.72:1));
const baseSpan=run=>run.board.baseSpan||(run.board.generation>=7?1500:720);
function boardPiecePoint(run,p,i){const n=worldNode(run,run.board.nodes[p.node]),size=p.large?2:1,k=pieceScale(run);return {x:clamp(n.x+(i?46:-46)*k,44*size*k,(run.board.width||1800)-44*size*k),y:Math.max(44*size*k,n.y-48*k)};}
function focusBoardAction(run,ids=null){
 if(!run)return;run.camera='follow';run.pan=null;
 const active=worldNode(run,run.board.nodes[run.players[run.current].node]);
 const nearby=run.players.filter(p=>{const n=worldNode(run,run.board.nodes[p.node]);return Math.hypot(n.x-active.x,n.y-active.y)<250;}).map(p=>p.node);
 run.focusNodes=[...new Set((ids||nearby).filter(id=>!!run.board.nodes[id]))];
 if(!run.focusNodes.length)run.focusNodes=[run.players[run.current].node];
}
function cameraBox(run,aspect=1.2){
 const w=run.board.width||1800,h=run.board.height||3030;
 if(run.camera==='overview'){const realm=run.board.realms[run.board.nodes[run.players[run.current].node]?.realm];if(run.board.generation>=7&&realm)return [0,realm.y,w,realm.height];return [0,0,w,h];}
 aspect=Number.isFinite(aspect)&&aspect>0?aspect:1.2;
 const nodes=(Array.isArray(run.focusNodes)&&run.focusNodes.length?run.focusNodes:[run.players[run.current].node]).map(id=>run.board.nodes[id]).filter(Boolean).map(n=>worldNode(run,n));
 if(!nodes.length)nodes.push(worldNode(run,run.board.nodes[run.players[run.current].node]));
 const points=nodes.flatMap(n=>{const players=run.players.flatMap((p,i)=>p.node===n.id?[boardPiecePoint(run,p,i)]:[]);return players.length?players:[n];});
 const minX=Math.min(...points.map(n=>n.x)),maxX=Math.max(...points.map(n=>n.x)),minY=Math.min(...points.map(n=>n.y)),maxY=Math.max(...points.map(n=>n.y));
 const large=run.players.some(p=>p.large>0&&nodes.some(n=>n.id===p.node)),verticalPadding=(nodes.some(n=>n.type==='location')?330:large?320:230)+70*pieceScale(run);
 const spanX=maxX-minX+(large?330:230),spanY=maxY-minY+verticalPadding;
 // Warp boards are wide scenes: on a portrait phone their landscape span shrank every space to a dot,
 // so there the span follows the screen's narrow side and the camera starts close enough to read the spaces.
 const span=baseSpan(run)/(run.zoom||1.2)*(run.board.format==='warp'&&aspect<1?aspect*.75:1);
 let width=Math.min(w,Math.max(span,aspect*verticalPadding));
 if(!run.pan)width=Math.min(w,Math.max(width,spanX,spanY*aspect));
 let height=width/aspect;if(!run.pan&&nodes.length>1)height=Math.max(height,Math.min(h,spanY));height=Math.min(h,height);
 const cx=Number.isFinite(run.pan?.x)?run.pan.x:(minX+maxX)/2,cy=Number.isFinite(run.pan?.y)?run.pan.y:(minY+maxY)/2;
 // Following may extend past the world edge: otherwise the opening heads sit at the top.
 return [run.pan?clamp(cx-width/2,-width/2,w-width/2):cx-width/2,run.pan?clamp(cy-height/2,-height/2,h-height/2):cy-height/2,width,height];
}

Object.assign(exports,{pieceScale,worldNode,boardPiecePoint,focusBoardAction,cameraBox});