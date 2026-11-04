// Things items leave on the board (ROADMAP F6): roadblocks on the opponent's road, toll booths that charge them as they
// pass, coin stacks anyone can grab, and the magnet jump. Saved in run.marks (one list per board: the main board's list
// waits in run.savedMarks during a warp zone), drawn by ui.js boardSVG (marksSVG), checked on every step by app.js
// moveSteps (passMarks). Pure rules on the run, no DOM, so tests can drive them in Node.
// mark: {kind:'block'|'toll'|'coin', node, owner (seat, -1 = nobody's), amount, group (roadblocks placed together), uses}
const COIN=3,TOLL_USES=3;
const realmOf=(run,id)=>run.board.nodes[id]?.realm;
// Spaces exactly `dist` steps ahead of `from` along the road (every branch), staying in the same realm, never a gate.
function spacesAhead(run,from,dist){
 const realm=realmOf(run,from);let frontier=[from];
 for(let d=0;d<dist;d++){const next=new Set();for(const id of frontier)for(const n of run.board.nodes[id]?.next||[])if(run.board.nodes[n]&&realmOf(run,n)===realm)next.add(n);frontier=[...next];if(!frontier.length)break;}
 return frontier.filter(id=>run.board.nodes[id]&&run.board.nodes[id].type!=='gate'&&id!==from);
}
// Spaces 1..max steps ahead (all branches), nearest first.
function roadAhead(run,from,max){const seen=new Set([from]),out=[];let frontier=[from];const realm=realmOf(run,from);
 for(let d=0;d<max&&frontier.length;d++){const next=[];for(const id of frontier)for(const n of run.board.nodes[id]?.next||[])if(!seen.has(n)&&run.board.nodes[n]&&realmOf(run,n)===realm){seen.add(n);next.push(n);if(run.board.nodes[n].type!=='gate')out.push(n);}frontier=next;}
 return out;}
const marks=run=>(run.marks||=[]);
// Roadblock: on every road 2-3 spaces ahead of the opponent (nearer when the road ends sooner). They stop on it.
function placeRoadblock(run,who){
 const other=run.players[1-who];let spots=[];
 for(const d of [3,2,1]){spots=spacesAhead(run,other.node,d).filter(id=>!marks(run).some(m=>m.node===id&&m.kind==='block'));if(spots.length)break;}
 if(!spots.length)return 0;const group=`b${run.turn}-${who}-${Math.floor(Math.random()*1e4)}`;
 for(const node of spots.slice(0,4))marks(run).push({kind:'block',node,owner:who,group});
 return Math.min(4,spots.length);
}
// Toll booth on the user's own space: the opponent pays `fee` each time they pass or land there (3 times).
function placeToll(run,who,fee){const node=run.players[who].node;if(run.board.nodes[node]?.type==='gate')return false;
 run.marks=marks(run).filter(m=>!(m.node===node&&m.kind==='toll'));marks(run).push({kind:'toll',node,owner:who,amount:fee,uses:TOLL_USES});return true;}
// Coin stacks on `n` spaces up to 8 ahead of the user: anyone who passes one takes 3 points.
function dropCoins(run,who,n,random=Math.random){
 const road=roadAhead(run,run.players[who].node,8).filter(id=>!marks(run).some(m=>m.node===id));
 const picks=[];while(picks.length<n&&road.length)picks.push(road.splice(Math.floor(random()*road.length),1)[0]);
 for(const node of picks)marks(run).push({kind:'coin',node,owner:-1,amount:COIN});return picks.length;
}
// Magnet: jump to the opponent's space when they are ahead on this realm's road (up to 30 spaces). Returns spaces gained.
function magnetJump(run,who){const p=run.players[who],o=run.players[1-who];if(o.finishedPlayer||realmOf(run,o.node)!==realmOf(run,p.node)||o.node===p.node)return 0;
 const road=roadAhead(run,p.node,30),i=road.indexOf(o.node);if(i<0)return 0;
 p.visited.push(p.node);p.node=o.node;return i+1;}
// The player in seat `who` steps onto `node`: what happens. Pays out and removes used marks. Returns events for the screen:
// {kind, owner, amount, blocked} (blocked = a shield or cloak stopped the toll).
function passMarks(run,who,node){
 const p=run.players[who],out=[];if(!run.marks?.length)return out;
 for(const m of [...run.marks]){if(m.node!==node)continue;
  if(m.kind==='coin'){p.points+=m.amount;out.push({kind:'coin',owner:m.owner,amount:m.amount});run.marks.splice(run.marks.indexOf(m),1);}
  else if(m.kind==='toll'&&m.owner!==who){const owner=run.players[m.owner];let blocked=false,paid=0;
   if(p.cloak)blocked=true;else if(p.shields>0){p.shields--;blocked=true;}else{paid=Math.min(m.amount,p.points);p.points-=paid;if(owner)owner.points+=paid;}
   out.push({kind:'toll',owner:m.owner,amount:paid,blocked});if(--m.uses<=0)run.marks.splice(run.marks.indexOf(m),1);}
  else if(m.kind==='block'&&m.owner!==who){out.push({kind:'block',owner:m.owner});run.marks=run.marks.filter(x=>x.group!==m.group);}
 }
 return out;
}
// For saves (persistence.js validRun): every mark on a real space of this board.
function validMarks(list,board){return list===undefined||Array.isArray(list)&&list.length<=80&&list.every(m=>m&&['block','toll','coin'].includes(m.kind)&&board.nodes[m.node]&&[-1,0,1].includes(m.owner)&&(m.amount===undefined||Number.isFinite(m.amount)));}
Object.assign(exports,{spacesAhead,roadAhead,placeRoadblock,placeToll,dropCoins,magnetJump,passMarks,validMarks,COIN});
