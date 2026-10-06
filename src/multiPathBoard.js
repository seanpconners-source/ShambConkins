const {seededRandom,shuffle,clamp,pick}=require("src/utils.js");
const {LOCATIONS}=require("src/locations.js");
const BOARD_LAYOUTS=['City Blocks','Braided Rivers','Switchback Gardens','Circuit City','Three Expeditions','Clockwork Streets'];
const playable=new Set(['game','trivia','casino','dice','task']);
// v0.44 "journey map" geometry. Every realm is a tall band: a short stem from camp,
// a crossroads, three parallel roads (west / centre / east) that each cross their own
// terrain, then a merge into the gate. Roads are smooth S-curves, never switchbacks.
const REALM_HEIGHT=2500,CORRIDOR_X=[300,900,1500],STEM_Y=120,ROAD_AMPLITUDE=100;
const DIFFICULTY=['CALM','ADVENTUROUS','HIGH REWARD'];
const LANE_KIND=['Parkway','Backroads','Gauntlet'];
// Samples a smooth S-curve and returns `count` points spaced evenly by arc length.
function roadPoints(cx,y0,y1,count,phase,waves,amplitude=ROAD_AMPLITUDE){
 const samples=[];const steps=400;let length=0,prev=null;
 for(let i=0;i<=steps;i++){const t=i/steps,x=cx+Math.sin(phase+t*waves*Math.PI*2)*amplitude*Math.sin(Math.min(1,t*5)*Math.PI/2)*Math.sin(Math.min(1,(1-t)*5)*Math.PI/2+.0001),y=y0+(y1-y0)*t;if(prev)length+=Math.hypot(x-prev.x,y-prev.y);samples.push({x,y,length});prev={x,y};}
 const points=[];let j=0;for(let i=0;i<count;i++){const target=count===1?0:length*i/(count-1);while(j<samples.length-1&&samples[j].length<target)j++;points.push({x:Math.round(samples[j].x),y:Math.round(samples[j].y)});}
 return points;
}
// Reuse stable uploaded space IDs, while dealing three full-length alternatives
// in each realm. Crossovers are optional, forward-only choices, never forced joins.
function buildMultiPathBoard(board){
 const random=seededRandom(board.seed+':multi-path-v41'),layout=pick(BOARD_LAYOUTS,random);board.layout=layout;board.generation=7;board.pathNetworks=[];board.bridges=[];
 const oldSigns=board.signs.filter(s=>!s.branch);board.signs=[];board.obstacles=[];board.width=1800;board.height=REALM_HEIGHT*3;
 const placed=[];
 for(const [realmIndex,realm] of ['mind','body','spirit'].entries()){
  const data=board.realms[realm],all=data.ids.map(id=>board.nodes[id]),cards=board.routes.filter(r=>r.realm===realm),start=board.nodes[data.start],gate=board.nodes[data.gate],nextRealm=gate.next.filter(id=>board.nodes[id].realm!==realm);
  const main=[];let id=start.id;while(board.nodes[id]?.realm===realm&&!main.includes(id)){main.push(id);id=board.nodes[id].next[0];}
  const stem=main.slice(0,4+Math.floor(random()*3)),fork=stem.at(-1),entries=shuffle(cards.map(r=>r.entry),random),reserved=new Set([...stem,gate.id,...entries]);
  const pool=shuffle(all.filter(n=>!reserved.has(n.id)).map(n=>n.id),random),tracks=[[],[entries[0]],[entries[1]]];
  // Differences are small: two extra spaces buy the richest route's rewards.
  const lengths=[Math.floor((pool.length+2)/3)-1,Math.floor((pool.length+2)/3),0];lengths[2]=pool.length+2-lengths[0]-lengths[1];
  for(let lane=0;lane<3;lane++)while(tracks[lane].length<lengths[lane])tracks[lane].push(pool.shift());
  // positions[lane] = 0 (west), 1 (centre) or 2 (east): which corridor this road runs through.
  const positions=shuffle([0,1,2],random),base=realmIndex*REALM_HEIGHT;
  data.y=base;data.height=REALM_HEIGHT;
  for(const n of all){delete n.route;delete n.branch;delete n.location;delete n.pathName;delete n.pathDifficulty;delete n.side;if(n.type==='location')n.type='event';n.next=[];}
  const stemStep=96;
  for(let i=0;i<stem.length;i++){const n=board.nodes[stem[i]];n.x=Math.round(900+Math.sin(i*1.1+realmIndex)*34);n.y=Math.round(base+STEM_Y+i*stemStep);n.col=i;n.lane=0;n.next=[stem[i+1]].filter(Boolean);n.stem=true;if(i>0&&i%2===1)n.type='game';}
  start.type='start';board.nodes[fork].next=tracks.map(p=>p[0]);
  const forkNode=board.nodes[fork],laneTop=forkNode.y+300,laneBottom=base+REALM_HEIGHT-380;
  gate.x=900;gate.y=base+REALM_HEIGHT-120;gate.col=stem.length+Math.max(...lengths);gate.lane=0;gate.next=nextRealm;gate.type='gate';
  const laneInfo=[];
  tracks.forEach((path,lane)=>{
   const route=lane?cards.find(r=>r.entry===path[0]):null,name=route?.name||cards[0].safe,source=route?.source||cards[0].source,difficulty=DIFFICULTY[lane],cx=CORRIDOR_X[positions[lane]];
   const points=roadPoints(cx,laneTop,laneBottom,path.length,random()*Math.PI*2,1.25+random()*.5);
   for(let i=0;i<path.length;i++){
    const n=board.nodes[path[i]];n.x=points[i].x;n.y=points[i].y;n.col=stem.length+i;n.lane=lane;n.next=[path[i+1]||gate.id];n.pathName=name;n.pathDifficulty=difficulty;n.pathRemaining=path.length-i;n.pathPosition=positions[lane];
    if(route){n.branch=name;n.source=route.source;}
    if(i%3===1&&!['item','shop','dice','casino'].includes(n.type))n.type='game';
    if(lane===0&&n.type==='penalty')n.type='bonus';
    if(lane===2&&i%7===3)n.type='item';else if(lane===2&&i%7===5)n.type='penalty';
   }
   for(const at of [.25,.68])board.nodes[path[Math.floor((path.length-1)*at)]].type='trivia';
   if(route){Object.assign(route,{fork,entry:path[0],rejoin:gate.id,forkIndex:stem.length-1,rejoinIndex:stem.length+lengths[0],spaces:path.length,difficulty});board.nodes[path[0]].route={...route,safe:false};}
   else board.nodes[path[0]].route={name,source,reward:'A free, calmer route. Fewer hazards and fewer visitors.',risk:'Fewer supplies and recruits than the adventurous roads.',safe:true,spaces:path.length,difficulty};
   laneInfo.push({lane,position:positions[lane],cx,name,source,difficulty,kind:LANE_KIND[lane],route:route?.id||null,ids:path,reward:board.nodes[path[0]].route.reward,risk:board.nodes[path[0]].route.risk,top:laneTop,bottom:laneBottom});
  });
  // Stay on your road, or explicitly choose a crossover bridge to the neighbouring corridor. Progress always rises.
  tracks.forEach((path,lane)=>{
   const pos=positions[lane],neighbours=[pos-1,pos+1].filter(p=>p>=0&&p<=2),targetPos=pos===1?pick(neighbours,random):neighbours[0],otherLane=positions.indexOf(targetPos),other=tracks[otherLane];
   const at=Math.floor(path.length*(.34+random()*.2)),from=board.nodes[path[at]];
   const forward=other.map((id,i)=>({id,i,dy:board.nodes[id].y-from.y})).filter(c=>c.i>=1&&c.i<other.length-2&&c.dy>40&&c.dy<230).sort((a,b)=>a.dy-b.dy)[0];
   if(!forward)return;from.next.push(forward.id);from.bridge=forward.id;board.bridges.push({realm,from:from.id,to:forward.id,lane,otherLane});
  });
  let taskKept=false;for(const n of all)if(n.type==='task'){if(taskKept)n.type='game';else taskKept=true;}
  const candidates=shuffle(LOCATIONS.filter(l=>l.realm===realm&&!['parents','upside-down','unlimited-savory-lab'].includes(l.id)),random);
  // Landmarks stand beside the road they belong to, on the side with room, and never on top of one another.
  const SCENE_W=300,SCENE_H=215;
  tracks.forEach((path,lane)=>{
   const target=[1,2,3][lane],pos=positions[lane],slots=shuffle(path.map((id,index)=>({id,index})).filter(p=>p.index>=3&&p.index<path.length-3&&!['trivia','dice'].includes(board.nodes[p.id].type)),random);let count=0;
   for(const slot of slots){
    const n=board.nodes[slot.id];
    const sides=pos===0?[1]:pos===2?[-1]:random()<.5?[1,-1]:[-1,1];
    let chosen=null;
    for(const side of sides){const cx=n.x+side*(ROAD_AMPLITUDE+SCENE_W/2-10),box={x:cx-SCENE_W/2,y:n.y-SCENE_H+40,w:SCENE_W,h:SCENE_H};if(box.x<12||box.x+box.w>1788)continue;if(placed.some(b=>box.x<b.x+b.w+20&&box.x+box.w+20>b.x&&box.y<b.y+b.h+20&&box.y+box.h+20>b.y))continue;chosen={side,box};break;}
    if(!chosen)continue;
    let l=candidates.pop();if(realm==='mind'&&lane===0&&count===0)l=LOCATIONS.find(l=>l.id==='parents');else if(realm==='mind'&&lane===2&&count===0&&random()<.35)l=LOCATIONS.find(l=>l.id==='unlimited-savory-lab');if(!l)break;
    n.type='location';n.location=l.id;n.side=chosen.side;placed.push(chosen.box);if(++count>=target)break;
   }
   let gap=0;for(const id of path){const n=board.nodes[id];if(playable.has(n.type))gap=0;else if(++gap>=3&&['event','bonus','penalty'].includes(n.type)){n.type='game';gap=0;}}
  });
  data.cols=gate.col;data.paths=tracks;data.lanes=laneInfo;data.fork=fork;data.stem=stem;board.pathNetworks.push({realm,fork,paths:tracks,lengths,difficulties:DIFFICULTY});
  for(const route of cards){const n=board.nodes[route.entry];board.signs.push({name:route.name,source:route.source,x:n.x,y:n.y-65,level:realm.toUpperCase(),branch:true,routeEntry:route.entry,routeId:route.id});}
 }
 // Retain just a few property signs; avoid irrelevant old names at new forks.
 board.signs.push(...oldSigns.filter((_,i)=>i%9===0).map(s=>({...s,hidden:true})));return board;
}

Object.assign(exports,{BOARD_LAYOUTS,REALM_HEIGHT,CORRIDOR_X,DIFFICULTY,buildMultiPathBoard});
