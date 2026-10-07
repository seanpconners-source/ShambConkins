const {seededRandom,shuffle,pick}=require("src/utils.js");
const {LOCATIONS}=require("src/locations.js");
// Board generation 8: every level is a square-tile grid board, like a printed party
// board game. A stem leaves camp, splits at the crossroads into three roads that wind
// down their own column of the grid (west / centre / east) and meet again at the gate.
// Roads only ever step down, left or right, and never touch themselves or each other,
// so the tiles read as clean tracks around empty blocks where the landmarks stand.
// Planks across the gaps are bridges between roads; short hops across a switchback are
// shortcuts, each guarded by an obstacle (gear, a character skill or 3 points).
const GRID_P=100,GRID_X0=100,GRID_COLS=17,CENTER=8,TOP=3;
const BANDS=[[0,4],[6,10],[12,16]];
const GRID_LAYOUTS=['Serpent Streets','Staircase Gardens','Long Corridors','Switchback Blocks'];
const STYLES=['serpent','stairs','corridor','mixed'];
const DIFFICULTY=['CALM','ADVENTUROUS','HIGH REWARD'],LANE_KIND=['Parkway','Backroads','Gauntlet'];
const OBSTACLE_IDS=['bridge','lock','tree','flood','checkpoint','toxic','laser','pipe','haunted','heavy','cliff','fog'];
const GROUND_BASE={mind:'#2e1c3a',body:'#38220f',spirit:'#1e1a45',horror:'#1f0709'};
const playable=new Set(['game','trivia','casino','dice','task']);
const key=(c,r)=>c+','+r;
const N4=[[1,0],[-1,0],[0,1],[0,-1]];
// Weighted move order for the path search; the style gives each level its own shape.
function moveOrder(style,dir,run,random){
 const down=[0,1],horiz=[[1,0],[-1,0]],w=new Map();
 const horizontal=dir&&dir[1]===0;
 for(const m of [down,...horiz]){
  const same=dir&&m[0]===dir[0]&&m[1]===dir[1],isDown=m===down;let weight=1;
  if(style==='serpent')weight=horizontal?(same?7:isDown?1:1):(isDown?(run<1+random()*2?3:1):4);
  else if(style==='stairs')weight=horizontal?(isDown?(run>=1+Math.floor(random()*2)?6:1):same?2:1):(isDown?(run<1?3:1):5);
  else if(style==='corridor')weight=isDown?(dir&&!horizontal&&run>6?2:6):same?4:1.5;
  else weight=same?3:2;
  w.set(m,weight);
 }
 const order=[],pool=[...w.entries()];
 while(pool.length){const total=pool.reduce((s,[,v])=>s+v,0);let t=random()*total,i=0;for(;i<pool.length-1;i++){t-=pool[i][1];if(t<=0)break;}order.push(pool[i][0]);pool.splice(i,1);}
 return order;
}
// Exact-length path from start to end through allowed cells: steps down, left or right
// only, and no cell touches another non-consecutive cell (of this path or `occ`).
function gridPath({start,end,length,allowed,occ,random,style,okNeighbour=()=>false,width=5}){
 const path=[start],inPath=new Set([key(...start)]);let budget=25000;
 const touches=(c,r,prev,isFirst,isLast)=>{for(const[dc,dr]of N4){const nc=c+dc,nr=r+dr;if(prev&&nc===prev[0]&&nr===prev[1])continue;const k=key(nc,nr);if(inPath.has(k))return true;if(occ.has(k)&&!okNeighbour(k,isFirst,isLast))return true;}return false;};
 if(touches(start[0],start[1],null,true,length===1))return null;
 function dfs(cur,dir,run){
  if(--budget<0)return false;
  const left=length-path.length;
  if(left===0)return cur[0]===end[0]&&cur[1]===end[1];
  const dr=end[1]-cur[1],dc=Math.abs(end[0]-cur[0]);
  if(dr<0||dr+dc>left||(left-dr-dc)%2)return false;
  if(dr===0&&left!==dc)return false;
  if(left-dr>(Math.floor(dr/2)+1)*(width+3))return false;
  for(const m of moveOrder(style,dir,run,random)){
   if(dir&&m[0]===-dir[0]&&m[1]===-dir[1])continue;
   const nc=cur[0]+m[0],nr=cur[1]+m[1],k=key(nc,nr),isLast=left===1,isEnd=nc===end[0]&&nr===end[1];
   if(isLast!==isEnd||!allowed(nc,nr)||inPath.has(k)||occ.has(k)||touches(nc,nr,cur,false,isLast))continue;
   path.push([nc,nr]);inPath.add(k);
   if(dfs([nc,nr],m,dir&&m[0]===dir[0]&&m[1]===dir[1]?run+1:1))return true;
   path.pop();inPath.delete(k);if(budget<0)return false;
  }
  return false;
 }
 return dfs(start,null,0)?path:null;
}
// The three road shapes of one realm for rows R0 (crossroads) to R1 (gate).
function laneSpecs(R0,R1,random,relaxed){
 // Side roads run out toward the board edge at one end (top or bottom), so each road fills its own column of the board.
 const reach=()=>relaxed?4:Math.floor(random()*3),wTop=random()<.5,eTop=random()<.5,w0=wTop?reach():4,w1=wTop?4:reach(),e0=GRID_COLS-1-(eTop?reach():4),e1=GRID_COLS-1-(eTop?4:reach());
 return [
  {start:[CENTER-1,R0],end:[CENTER-1,R1],allowed:(c,r)=>r===R0||r===R1?c>=0&&c<=CENTER-1:r===R0+1?c<=w0:r===R1-1?c<=w1:r>R0&&r<R1&&c>=BANDS[0][0]&&c<=BANDS[0][1],width:5},
  {start:[CENTER,R0+1],end:[CENTER,R1-1],allowed:(c,r)=>r===R0+1||r===R1-1?c===CENTER:r>R0+1&&r<R1-1&&c>=BANDS[1][0]&&c<=BANDS[1][1],width:5},
  {start:[CENTER+1,R0],end:[CENTER+1,R1],allowed:(c,r)=>r===R0||r===R1?c>=CENTER+1&&c<=GRID_COLS-1:r===R0+1?c>=e0:r===R1-1?c>=e1:r>R0&&r<R1&&c>=BANDS[2][0]&&c<=BANDS[2][1],width:5}
 ];
}
// Lays out three roads of the given lengths. positions[lane] = 0 west, 1 centre, 2 east.
function solveRealm(lengths,positions,stemLength,random,style){
 const L0=Math.min(...lengths),ds=[L0-11,L0-9,L0-13,L0-7,L0-15].filter(d=>d>=6);
 for(const D of ds)for(let attempt=0;attempt<6;attempt++){
  const R0=TOP+stemLength-1,R1=R0+D,occ=new Map(),forkKey=key(CENTER,R0),gateKey=key(CENTER,R1);
  for(let r=TOP;r<=R0;r++)occ.set(key(CENTER,r),'stem');occ.set(gateKey,'gate');
  const specs=laneSpecs(R0,R1,random,attempt>=4),cells=[null,null,null];let ok=true;
  // Side roads first: their crossroads and gate bars cross the centre column.
  for(const lane of [0,1,2].sort((a,b)=>(positions[a]===1)-(positions[b]===1))){
   const spec=specs[positions[lane]];
   const path=gridPath({...spec,length:lengths[lane],occ,random,style:attempt>2?'mixed':style,okNeighbour:(k,isFirst,isLast)=>isFirst&&k===forkKey||isLast&&k===gateKey});
   if(!path){ok=false;break;}
   cells[lane]=path;for(const[c,r]of path)occ.set(key(c,r),'lane'+lane);
  }
  if(ok)return {R0,R1,cells,occ};
 }
 return null;
}
const cellXY=(c,r,yBase)=>({x:GRID_X0+c*GRID_P,y:yBase+70+r*GRID_P});
// Free rectangle of cells beside a space for its landmark card.
function cardSpot(cell,occ,reserved,rowMin,rowMax,random){
 const [nc,nr]=cell,spots=[];
 for(const[w,h] of [[3,2],[2,2]]){
  for(let oc=nc-w;oc<=nc+1;oc++)for(let or=nr-h;or<=nr+1;or++){
   if(oc<0||oc+w>GRID_COLS||or<rowMin||or+h-1>rowMax)continue;
   let touch=false,free=true;
   for(let c=oc;c<oc+w&&free;c++)for(let r=or;r<or+h;r++){const k=key(c,r);if(occ.has(k)||reserved.has(k)){free=false;break;}if(Math.abs(c-nc)<=1&&Math.abs(r-nr)<=1)touch=true;}
   if(free&&touch)spots.push({c:oc,r:or,w,h});
  }
  if(spots.length)break;
 }
 return spots.length?spots[Math.floor(random()*spots.length)]:null;
}
function reserveCard(spot,reserved){for(let c=spot.c;c<spot.c+spot.w;c++)for(let r=spot.r;r<spot.r+spot.h;r++)reserved.add(key(c,r));}
function cardBox(spot,yBase){const a=cellXY(spot.c,spot.r,yBase);return {x:a.x-GRID_P/2+6,y:a.y-GRID_P/2+6,w:spot.w*GRID_P-12,h:spot.h*GRID_P-12};}
// Shortcuts hop across one empty cell between two rungs of the same road.
function findShortcut(path,ids,board,reserved,occ,random,maxSkip=14){
 const at=new Map(path.map(([c,r],i)=>[key(c,r),i])),opts=[];
 for(let i=2;i<path.length-3;i++)for(const hop of [2,3]){const[c,r]=path[i],j=at.get(key(c,r+hop));if(j===undefined||j-i<5||j-i>maxSkip||j>path.length-2)continue;const mids=hop===2?[key(c,r+1)]:[key(c,r+1),key(c,r+2)];if(mids.some(mid=>occ.has(mid)||reserved.has(mid)))continue;if(board.nodes[ids[i]].next.length!==1)continue;opts.push({i,j,mid:mids[0],mids});}
 if(!opts.length)return null;
 opts.sort((a,b)=>Math.abs((a.i+a.j)/2-path.length/2)-Math.abs((b.i+b.j)/2-path.length/2));
 return opts[Math.floor(random()*Math.min(3,opts.length))];
}
function addShortcut(board,realm,lane,from,to,skip,id,random){
 board.nodes[from].next.push(to);board.nodes[from].shortcut=to;
 board.shortcuts.push({realm,from,to,lane,skip});
 board.obstacles.push({id,from,to,type:pick(OBSTACLE_IDS,random),open:false,openUntil:0,repairs:0});
}
function buildGridBoard(board){
 const random=seededRandom(board.seed+':grid-v8');
 board.layout=pick(GRID_LAYOUTS,random);board.generation=8;board.baseSpan=1050;board.grid={p:GRID_P,x0:GRID_X0,cols:GRID_COLS};
 board.pathNetworks=[];board.bridges=[];board.shortcuts=[];
 const oldSigns=board.signs.filter(s=>!s.branch);board.signs=[];board.obstacles=[];board.width=1800;
 let yBase=0;
 for(const realm of ['mind','body','spirit']){
  const data=board.realms[realm],all=data.ids.map(id=>board.nodes[id]),cards=board.routes.filter(r=>r.realm===realm),start=board.nodes[data.start],gate=board.nodes[data.gate],nextRealm=gate.next.filter(id=>board.nodes[id].realm!==realm);
  const main=[];let id=start.id;while(board.nodes[id]?.realm===realm&&!main.includes(id)){main.push(id);id=board.nodes[id].next[0];}
  const style=pick(STYLES,random),positions=shuffle([0,1,2],random);
  let stem,lengths,solved=null;
  for(let tries=0;tries<12&&!solved;tries++){
   stem=main.slice(0,4+Math.floor(random()*3));
   const T=all.length-stem.length-1,p=T%2;let base=Math.floor((T-4)/3);if(base%2!==p)base--;
   lengths=[base,base+2,T-2*base-2];if(lengths[2]-lengths[1]>=4){lengths[1]+=2;lengths[2]-=2;}
   solved=solveRealm(lengths,positions,stem.length,random,tries>5?'mixed':style);
  }
  if(!solved)throw new Error('grid board: no layout for '+realm);
  const {R0,R1,cells,occ}=solved,fork=stem.at(-1),entries=shuffle(cards.map(r=>r.entry),random),reserved=new Set([...stem,gate.id,...entries]);
  const pool=shuffle(all.filter(n=>!reserved.has(n.id)).map(n=>n.id),random),tracks=[[],[entries[0]],[entries[1]]];
  for(let lane=0;lane<3;lane++)while(tracks[lane].length<lengths[lane])tracks[lane].push(pool.shift());
  data.y=yBase;
  for(const n of all){delete n.route;delete n.branch;delete n.location;delete n.pathName;delete n.pathDifficulty;delete n.side;delete n.card;delete n.bridge;delete n.shortcut;if(n.type==='location')n.type='event';n.next=[];}
  const place=(n,c,r)=>{const p=cellXY(c,r,yBase);n.x=p.x;n.y=p.y;n.gx=c;n.gy=r;};
  stem.forEach((sid,i)=>{const n=board.nodes[sid];place(n,CENTER,TOP+i);n.col=i;n.lane=0;n.next=[stem[i+1]].filter(Boolean);n.stem=true;if(i>0&&i%2===1)n.type='game';});
  start.type='start';board.nodes[fork].next=tracks.map(p=>p[0]);
  place(gate,CENTER,R1);gate.col=stem.length+Math.max(...lengths);gate.lane=0;gate.next=nextRealm;gate.type='gate';
  const laneInfo=[];
  tracks.forEach((path,lane)=>{
   const route=lane?cards.find(r=>r.entry===path[0]):null,name=route?.name||cards[0].safe,source=route?.source||cards[0].source,difficulty=DIFFICULTY[lane],band=BANDS[positions[lane]];
   for(let i=0;i<path.length;i++){
    const n=board.nodes[path[i]];place(n,...cells[lane][i]);n.col=stem.length+i;n.lane=lane;n.next=[path[i+1]||gate.id];n.pathName=name;n.pathDifficulty=difficulty;n.pathRemaining=path.length-i;n.pathPosition=positions[lane];
    if(route){n.branch=name;n.source=route.source;}
    if(i%3===1&&!['item','shop','dice','casino'].includes(n.type))n.type='game';
    if(lane===0&&n.type==='penalty')n.type='bonus';
    if(lane===2&&i%7===3)n.type='item';else if(lane===2&&i%7===5)n.type='penalty';
   }
   for(const at of [.25,.68])board.nodes[path[Math.floor((path.length-1)*at)]].type='trivia';
   if(route){Object.assign(route,{fork,entry:path[0],rejoin:gate.id,forkIndex:stem.length-1,rejoinIndex:stem.length+lengths[0],spaces:path.length,difficulty});board.nodes[path[0]].route={...route,safe:false};}
   else board.nodes[path[0]].route={name,source,reward:'A free, calmer route. Fewer hazards and fewer visitors.',risk:'Fewer supplies and recruits than the adventurous roads.',safe:true,spaces:path.length,difficulty};
   const ys=path.map(id=>board.nodes[id].y);
   laneInfo.push({lane,position:positions[lane],cx:GRID_X0+(band[0]+band[1])/2*GRID_P,x0:GRID_X0+band[0]*GRID_P,x1:GRID_X0+band[1]*GRID_P,name,source,difficulty,kind:LANE_KIND[lane],route:route?.id||null,ids:path,reward:board.nodes[path[0]].route.reward,risk:board.nodes[path[0]].route.risk,top:Math.min(...ys),bottom:Math.max(...ys)});
  });
  // Bridges: a plank across the gap column to the neighbouring road, never far backwards.
  const blocked=new Set(),laneAt=new Map();tracks.forEach((path,lane)=>cells[lane].forEach(([c,r],i)=>laneAt.set(key(c,r),{lane,i})));
  const made=[];
  // Rows straight across first; a realm with no such crossing gets a steeper plank.
  const tryBridges=(back,ahead)=>{
  for(const drs of [[0,1,-1],[2,-2]])for(const lane of made.length&&drs.length===2?[]:shuffle([0,1,2],random)){
   const pos=positions[lane],dirs=[];if(pos<2)dirs.push(1);if(pos>0)dirs.push(-1);
   const opts=[];
   for(const dir of dirs)cells[lane].forEach(([c,r],i)=>{
    if(r<=R0+1||r>=R1-1||i<3||i>tracks[lane].length-4||board.nodes[tracks[lane][i]].next.length!==1)return;
    // Same row: a plank across up to three empty cells. One empty cell: may also step a row up or down.
    for(const dr of drs)for(let span=2;span<=4;span++){
     if(dr&&span!==2)continue;
     const t=laneAt.get(key(c+dir*span,r+dr));if(!t||t.lane===lane)continue;
     const gaps=[];for(let k=1;k<span;k++)gaps.push(key(c+dir*k,r));if(dr){gaps.push(key(c+dir,r+Math.sign(dr)),key(c+dir,r+dr));}
     if([...new Set(gaps)].some(g=>occ.has(g)||blocked.has(g)))continue;
     const len=tracks[t.lane].length,fi=i/tracks[lane].length,ti=t.i/len;if(t.i<2||t.i>len-3||ti<fi-back||ti>fi+ahead)continue;
     if(made.some(b=>b.lane===t.lane&&b.otherLane===lane&&Math.abs(b.toIndex-i)<=6))continue;
     opts.push({i,to:tracks[t.lane][t.i],toIndex:t.i,otherLane:t.lane,gaps:[...new Set(gaps)],dr:Math.abs(dr)+span-2});break;
    }
   });
   if(!opts.length)continue;
   const b=opts.sort((a,b)=>Math.abs(a.dr)-Math.abs(b.dr))[Math.floor(random()*Math.min(opts.length,4))],from=board.nodes[tracks[lane][b.i]];
   from.next.push(b.to);from.bridge=b.to;board.bridges.push({realm,from:from.id,to:b.to,lane,otherLane:b.otherLane});made.push({lane,otherLane:b.otherLane,at:b.i,toIndex:b.toIndex});b.gaps.forEach(g=>blocked.add(g));
  }
  };
  tryBridges(.08,.3);
  // A realm whose roads never line up gets one more look with a looser reach.
  if(!made.length)tryBridges(.2,.5);
  // One guarded shortcut per road where the road doubles back on itself.
  tracks.forEach((path,lane)=>{const s=findShortcut(cells[lane],path,board,blocked,occ,random);if(!s)return;s.mids.forEach(k=>blocked.add(k));addShortcut(board,realm,lane,path[s.i],path[s.j],s.j-s.i,'shortcut-'+path[s.i],random);});
  let taskKept=false;for(const n of all)if(n.type==='task'){if(taskKept)n.type='game';else taskKept=true;}
  const candidates=shuffle(LOCATIONS.filter(l=>l.realm===realm&&!['parents','upside-down','unlimited-savory-lab','planet-coaster-park'].includes(l.id)),random);
  // Landmark cards fill empty blocks of the grid right beside their space.
  tracks.forEach((path,lane)=>{
   const target=[1,2,3][lane],slots=shuffle(path.map((id,index)=>({id,index})).filter(p=>p.index>=3&&p.index<path.length-3&&!['trivia','dice'].includes(board.nodes[p.id].type)),random);let count=0;
   for(const slot of slots){
    const n=board.nodes[slot.id],spot=cardSpot(cells[lane][slot.index],occ,blocked,R0-1,R1,random);if(!spot)continue;
    let l=candidates.pop();if(realm==='mind'&&lane===0&&count===0)l=LOCATIONS.find(l=>l.id==='parents');else if(realm==='mind'&&lane===2&&count===0&&random()<.35)l=LOCATIONS.find(l=>l.id==='unlimited-savory-lab');else if(realm==='body'&&lane===1&&count===0)l=LOCATIONS.find(l=>l.id==='planet-coaster-park')||l;if(!l)break;
    reserveCard(spot,blocked);n.type='location';n.location=l.id;n.card=cardBox(spot,yBase);n.side=n.card.x+n.card.w/2<n.x?-1:1;if(++count>=target)break;
   }
   let gap=0;for(const id of path){const n=board.nodes[id];if(playable.has(n.type))gap=0;else if(++gap>=3&&['event','bonus','penalty'].includes(n.type)){n.type='game';gap=0;}}
  });
  // One warp pipe per realm, hidden among the encounter spaces of a road.
  {const lane=Math.floor(random()*3),path=tracks[lane],options=path.map((id,i)=>({id,i})).filter(q=>q.i>=4&&q.i<path.length-4&&['event','bonus','penalty','game'].includes(board.nodes[q.id].type)&&!board.nodes[q.id].location);if(options.length)board.nodes[options[Math.floor(random()*options.length)].id].type='warp';}
  // Pokémon trainer battles: Poké Ball spaces on two of the three roads (own random stream,
  // so the rest of the layout matches older builds).
  {const tr=seededRandom(board.seed+':trainers:'+realm);for(const lane of shuffle([0,1,2],tr).slice(0,2)){const path=tracks[lane],options=path.map((id,i)=>({id,i})).filter(q=>q.i>=3&&q.i<path.length-3&&['event','bonus','penalty'].includes(board.nodes[q.id].type));if(options.length)board.nodes[options[Math.floor(tr()*options.length)].id].type='trainer';}}
  const height=cellXY(0,R1+4,0).y;
  Object.assign(data,{color:GROUND_BASE[realm],height,cols:gate.col,paths:tracks,lanes:laneInfo,fork,stem,gridRows:{top:TOP,fork:R0,gate:R1,style}});
  board.pathNetworks.push({realm,fork,paths:tracks,lengths,difficulties:DIFFICULTY});
  for(const route of cards){const n=board.nodes[route.entry];board.signs.push({name:route.name,source:route.source,x:n.x,y:n.y-65,level:realm.toUpperCase(),branch:true,routeEntry:route.entry,routeId:route.id});}
  yBase+=height;
 }
 board.height=yBase;
 board.signs.push(...oldSigns.filter((_,i)=>i%9===0).map(s=>({...s,hidden:true})));return board;
}
// The Horror level as one long grid road with two guarded doors (shortcuts).
function layoutHorrorGrid(board,ids,base,kinds){
 const random=seededRandom(board.seed+':horror-grid'),body=ids.slice(1,-1),start=board.nodes[ids[0]],gate=board.nodes[ids.at(-1)];
 board.obstacles=(board.obstacles||[]).filter(o=>!String(o.id).startsWith('horror-door'));
 for(const id of ids){const n=board.nodes[id];n.next=n.next.filter(t=>!t.startsWith('horror-')||t===ids[ids.indexOf(id)+1]);delete n.card;delete n.side;}
 let solved=null,R1=0;
 const n=body.length;let D=Math.round(n*.42);if((n-D)%2)D++;
 for(let tries=0;tries<10&&!solved;tries++){
  const d=D+2*[0,1,-1,2,-2,3,0,1,-1,2][tries];R1=TOP+1+d;const occ=new Map([[key(CENTER,TOP),'start'],[key(CENTER,R1),'gate']]),rTop=TOP+1,rEnd=R1-1;
  const path=gridPath({start:[CENTER,rTop],end:[CENTER,rEnd],length:n,occ,random,style:tries>4?'mixed':'serpent',width:17,
   allowed:(c,r)=>r===rTop||r===rEnd?c===CENTER:r>rTop&&r<rEnd&&c>=0&&c<GRID_COLS,okNeighbour:(k,isFirst,isLast)=>isFirst&&k===key(CENTER,TOP)||isLast&&k===key(CENTER,R1)});
  if(path){for(const[c,r]of path)occ.set(key(c,r),'lane');solved={path,occ};}
 }
 if(!solved)return false;
 const {path,occ}=solved,place=(nd,c,r)=>{const p=cellXY(c,r,base);nd.x=p.x;nd.y=p.y;nd.gx=c;nd.gy=r;};
 place(start,CENTER,TOP);place(gate,CENTER,R1);body.forEach((id,i)=>place(board.nodes[id],...path[i]));
 board.shortcuts ||= [];const blocked=new Set();
 for(let k=0;k<2;k++){
  const half=k?path.slice(Math.floor(path.length/2)):path.slice(0,Math.floor(path.length/2)),offset=k?Math.floor(path.length/2):0,ids2=body.slice(offset,offset+half.length);
  const s=findShortcut(half,ids2,board,blocked,occ,random,20);if(!s)continue;s.mids.forEach(k=>blocked.add(k));
  const from=ids2[s.i],to=ids2[s.j];board.nodes[from].next.push(to);board.nodes[from].shortcut=to;board.shortcuts.push({realm:'horror',from,to,lane:3,skip:s.j-s.i});
  board.obstacles.push({id:'horror-door-'+k,from,to,type:kinds[k]||'haunted',open:false,openUntil:0,repairs:0});
 }
 body.forEach((id,i)=>{const nd=board.nodes[id];if(nd.type!=='location')return;const spot=cardSpot(path[i],occ,blocked,TOP+1,R1,random);if(spot){reserveCard(spot,blocked);nd.card=cardBox(spot,base);nd.side=nd.card.x+nd.card.w/2<nd.x?-1:1;}else{nd.type='game';delete nd.location;}});
 const height=cellXY(0,R1+4,0).y,ys=body.map(id=>board.nodes[id].y);
 Object.assign(board.realms.horror,{color:GROUND_BASE.horror,height,fork:ids[0],stem:[ids[0]],gridRows:{top:TOP,fork:TOP,gate:R1,style:'serpent'},lanes:[{lane:3,position:1,cx:900,x0:GRID_X0,x1:GRID_X0+(GRID_COLS-1)*GRID_P,name:'The Route Below',source:'Horror',difficulty:'HORROR',kind:'Descent',route:null,ids:body,reward:'Every landmark hides a visitor.',risk:'The dark has opinions.',top:Math.min(...ys),bottom:Math.max(...ys)}]});
 return true;
}

Object.assign(exports,{GRID_P,GRID_X0,GRID_COLS,BANDS,GRID_LAYOUTS,gridPath,buildGridBoard,layoutHorrorGrid});
