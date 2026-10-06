const {seededRandom,shuffle,clamp,pick}=require("src/utils.js");
const {LOCATIONS}=require("src/locations.js");
const BOARD_LAYOUTS=['City Blocks','Braided Rivers','Switchback Gardens','Circuit City','Three Expeditions','Clockwork Streets'];
const playable=new Set(['game','trivia','casino','dice','task']);
// Reuse stable uploaded space IDs, while dealing three full-length alternatives
// in each realm. Crossovers are optional, forward-only choices, never forced joins.
function buildMultiPathBoard(board){
 const random=seededRandom(board.seed+':multi-path-v41'),layout=pick(BOARD_LAYOUTS,random);board.layout=layout;board.generation=6;board.pathNetworks=[];
 const oldSigns=board.signs.filter(s=>!s.branch);board.signs=[];board.obstacles=[];
 for(const realm of ['mind','body','spirit']){
  const data=board.realms[realm],all=data.ids.map(id=>board.nodes[id]),cards=board.routes.filter(r=>r.realm===realm),start=board.nodes[data.start],gate=board.nodes[data.gate],nextRealm=gate.next.filter(id=>board.nodes[id].realm!==realm);
  const main=[];let id=start.id;while(board.nodes[id]?.realm===realm&&!main.includes(id)){main.push(id);id=board.nodes[id].next[0];}
  const stem=main.slice(0,4+Math.floor(random()*3)),fork=stem.at(-1),entries=shuffle(cards.map(r=>r.entry),random),reserved=new Set([...stem,gate.id,...entries]);
  const pool=shuffle(all.filter(n=>!reserved.has(n.id)).map(n=>n.id),random),tracks=[[],[entries[0]],[entries[1]]];
  // Differences are small: two extra spaces buy the richest route's rewards.
  const lengths=[Math.floor((pool.length+2)/3)-1,Math.floor((pool.length+2)/3),0];lengths[2]=pool.length+2-lengths[0]-lengths[1];
  for(let lane=0;lane<3;lane++)while(tracks[lane].length<lengths[lane])tracks[lane].push(pool.shift());
  const laneOrder=shuffle([0,1,2],random),base=data.y||0,height=data.height,columns=layout==='Circuit City'||layout==='Clockwork Streets'?5:4,mirror=random()<.5;
  for(const n of all){delete n.route;delete n.branch;delete n.location;delete n.pathName;delete n.pathDifficulty;if(n.type==='location')n.type='event';n.next=[];}
  for(let i=0;i<stem.length;i++){const n=board.nodes[stem[i]];n.x=Math.round(900+Math.sin(i*.9+random())*85);n.y=Math.round(base+55+i*210/(stem.length-1));n.col=i;n.lane=0;n.next=[stem[i+1]].filter(Boolean);if(i>0&&i%2===1)n.type='game';}
  start.type='start';board.nodes[fork].next=tracks.map(p=>p[0]);gate.x=900;gate.y=base+height-55;gate.col=stem.length+Math.max(...lengths);gate.lane=0;gate.next=nextRealm;gate.type='gate';
  tracks.forEach((path,lane)=>{
   const route=lane?cards.find(r=>r.entry===path[0]):null,name=route?.name||cards[0].safe,difficulty=['CALM','ADVENTUROUS','HIGH REWARD'][lane],rows=Math.ceil(path.length/columns),center=310+laneOrder[lane]*590;
   for(let i=0;i<path.length;i++){
    const n=board.nodes[path[i]],row=Math.floor(i/columns),count=Math.min(columns,path.length-row*columns),t=count===1?.5:(i%columns)/(count-1),forward=(row%2===0)!==mirror;
    n.x=Math.round(clamp(center+(forward?t:1-t)*390-195+(layout==='Braided Rivers'?Math.sin(row)*35:0),70,1730));n.y=Math.round(base+330+row*(height-490)/Math.max(1,rows-1));n.col=stem.length+i;n.lane=lane;n.next=[path[i+1]||gate.id];n.pathName=name;n.pathDifficulty=difficulty;n.pathRemaining=path.length-i;
    if(route){n.branch=name;n.source=route.source;}
    if(i%3===1&&!['item','shop','dice','casino'].includes(n.type))n.type='game';
    if(lane===0&&n.type==='penalty')n.type='bonus';
    if(lane===2&&i%7===3)n.type='item';else if(lane===2&&i%7===5)n.type='penalty';
   }
   for(const at of [.25,.68])board.nodes[path[Math.floor((path.length-1)*at)]].type='trivia';
   if(route){Object.assign(route,{fork,entry:path[0],rejoin:gate.id,forkIndex:stem.length-1,rejoinIndex:stem.length+lengths[0],spaces:path.length,difficulty});board.nodes[path[0]].route={...route,safe:false};}
   else board.nodes[path[0]].route={name,source:cards[0].source,reward:'A free, calmer route. Fewer hazards and fewer visitors.',risk:'Fewer supplies and recruits than the adventurous roads.',safe:true,spaces:path.length,difficulty};
  });
  // Stay on your road, or explicitly choose a crossover. Progress always rises.
  tracks.forEach((path,lane)=>{const at=Math.floor(path.length*(.35+random()*.16)),other=tracks[(lane+1)%3],target=Math.min(other.length-2,at+3);board.nodes[path[at]].next.push(other[target]);});
  let taskKept=false;for(const n of all)if(n.type==='task'){if(taskKept)n.type='game';else taskKept=true;}
  const candidates=shuffle(LOCATIONS.filter(l=>l.realm===realm&&!['parents','upside-down','unlimited-savory-lab'].includes(l.id)),random),placed=[];
  tracks.forEach((path,lane)=>{
   const target=[1,2,3][lane],slots=shuffle(path.map((id,index)=>({id,index})).filter(p=>p.index>=4&&p.index<path.length-3&&!['trivia','dice'].includes(board.nodes[p.id].type)),random);let count=0;
   for(const slot of slots){const n=board.nodes[slot.id];if(placed.some(p=>Math.hypot(n.x-p.x,n.y-p.y)<205))continue;let l=candidates.pop();if(realm==='mind'&&lane===0&&count===0)l=LOCATIONS.find(l=>l.id==='parents');else if(realm==='mind'&&lane===2&&count===0&&random()<.35)l=LOCATIONS.find(l=>l.id==='unlimited-savory-lab');if(!l)break;n.type='location';n.location=l.id;placed.push(n);if(++count>=target)break;}
   let gap=0;for(const id of path){const n=board.nodes[id];if(playable.has(n.type))gap=0;else if(++gap>=3&&['event','bonus','penalty'].includes(n.type)){n.type='game';gap=0;}}
  });
  data.cols=gate.col;data.paths=tracks;board.pathNetworks.push({realm,fork,paths:tracks,lengths,difficulties:['CALM','ADVENTUROUS','HIGH REWARD']});
  for(const route of cards){const n=board.nodes[route.entry];board.signs.push({name:route.name,source:route.source,x:n.x,y:n.y-65,level:realm.toUpperCase(),branch:true,routeEntry:route.entry,routeId:route.id});}
 }
 // Retain just a few property signs; avoid irrelevant old names at new forks.
 board.signs.push(...oldSigns.filter((_,i)=>i%9===0));return board;
}

Object.assign(exports,{BOARD_LAYOUTS,buildMultiPathBoard});