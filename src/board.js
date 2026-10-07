const {seededRandom, hash, shuffle, pick,clamp}=require("src/utils.js");
const {LOCATIONS}=require("src/locations.js");
const {ORIGINAL_BOARD, ORIGINAL_SIGNS}=require("src/data/originalBoard.js");
const {installObstacles}=require("src/obstacles.js");
const {ROUTE_CHOICES}=require("src/data/routeChoices.js");
const {placeLandmarks}=require("src/landmarkPlacement.js");
const {roadPoints}=require("src/multiPathBoard.js");
const {buildGridBoard,layoutHorrorGrid}=require("src/gridBoard.js");
const REALMS = ['mind','body','spirit'];
// Pokémon spaces (trainer tiles on the board, the Pokémon warp zone's route).
const POKEMON_SPACES={trainer:'Trainer battle',grass:'Tall grass',center:'Pokémon Center',pkitem:'Item ball',path:'Route'};
const SPACE_TYPES = { start:'Camp',game:'Minigame',event:'Chance card',item:'Supply cache',bonus:'Good fortune',penalty:'Bad luck',location:'Landmark',task:'Taskmaster minigame',trivia:'Trivia duel',casino:'Casino',dice:'Full Yahtzee',shop:'Quark’s shop',gate:'Realm gate',warp:'Warp pipe' };
const SPACE_ICONS = { start:'⚑',game:'🎮',event:'🃏',item:'◆',bonus:'+',penalty:'−',location:'⌂',task:'📋',trivia:'Q&A',casino:'♠',dice:'⚄',shop:'🛒',gate:'✦',warp:'🌀' };
Object.assign(SPACE_TYPES,POKEMON_SPACES);for(const k of Object.keys(POKEMON_SPACES))SPACE_ICONS[k]='';
// One word under every grid tile: what landing there does.
const SPACE_CAPTIONS = { start:'CAMP',game:'MINIGAME',event:'CHANCE',item:'ITEM',bonus:'BONUS',penalty:'BAD LUCK',location:'LANDMARK',task:'TASK',trivia:'TRIVIA',casino:'CASINO',dice:'YAHTZEE',shop:'SHOP',gate:'GATE',warp:'WARP',trainer:'BATTLE',grass:'GRASS',center:'HEAL',pkitem:'ITEM' };
const ZONE_COLORS = {mind:'#f8e7a6',body:'#f4aa7f',spirit:'#c6a8ee',horror:'#9e1d28','upside-down':'#512633'};
const aliases={n0:'mind-start',n1:'mind-1-0',n2:'mind-2-0',n3:'mind-3-0',n4:'mind-4-0',n42:'mind-gate',n44:'body-start',n90:'body-gate',n92:'spirit-start',n137:'spirit-gate'};
const rename=id=>aliases[id]||id;
// Keep each uploaded branch chain and its stable node IDs. The card dealt to a
// chain, and where that chain leaves/rejoins the main road, change each run.
const ROUTES = [{fork:'n8',entry:'n138',realm:'mind'},{fork:'n25',entry:'n158',realm:'mind'},{fork:'n50',entry:'n173',realm:'body'},{fork:'n68',entry:'n187',realm:'body'},{fork:'n97',entry:'n200',realm:'spirit'},{fork:'n114',entry:'n214',realm:'spirit'}].map((chain,i)=>({...ROUTE_CHOICES[i],...chain}));
// Keep the uploaded trail's nodes and pacing, but generate its geometry and
// fork/rejoin positions. Existing saved trails keep their own complete graph.
function proceduralTrail(nodes,random){const routes=[],deck=shuffle(ROUTE_CHOICES,random);let dealt=0;for(const realm of REALMS){const main=[],seen=new Set();let id=realm+'-start';while(nodes[id]?.realm===realm&&!seen.has(id)){seen.add(id);main.push(id);id=nodes[id].next[0];}const branches=shuffle(ROUTES.filter(r=>r.realm===realm).map(chain=>{const ids=[];let n=nodes[chain.entry];while(n?.branch){ids.push(n.id);n=nodes[n.next[0]];}return {entry:chain.entry,ids};}),random);for(let i=0;i<main.length-1;i++)nodes[main[i]].next=[main[i+1]];
 const rows=4+Math.floor(random()*2),perRow=Math.ceil(main.length/rows),left=100+random()*60,right=1690-random()*70,mirror=random()<.5,base={mind:0,body:1030,spirit:1970}[realm],height={mind:1030,body:940,spirit:1060}[realm],top=base+120,bottom=base+height-100,spacing=(bottom-top)/(rows-1),wave=random()*6;
 for(let i=0;i<main.length;i++){const row=Math.floor(i/perRow),offset=i%perRow,count=Math.min(perRow,main.length-row*perRow),t=count===1?0:offset/(count-1),forward=(row%2===0)!==mirror;nodes[main[i]].x=Math.round(left+(right-left)*(forward?t:1-t)+Math.sin(i*.8+wave)*13);nodes[main[i]].y=Math.round(top+row*spacing+Math.sin(i*.65+wave)*15);}
 // Enumerate a finite set rather than searching for empty fork slots. Both
 // detours have breathing room, and their rejoins precede the next fork/gate.
 const placements=[];for(let first=5;first<=main.length-20;first++)for(let second=first+11;second<=main.length-9;second++)placements.push([first,second]);const indices=pick(placements,random);
 for(const[i,{entry,ids}]of branches.entries()){const route=deck[dealt++],index=indices[i],join=index+4+Math.floor(random()*4),fork=nodes[main[index]],end=nodes[main[join]],amplitude=150+random()*100,side=random()<.5?-1:1;fork.next.push(ids[0]);nodes[ids.at(-1)].next=[end.id];for(let j=0;j<ids.length;j++){const t=(j+1)/(ids.length+1),bend=Math.sin(t*Math.PI)*amplitude*side,dx=end.x-fork.x,dy=end.y-fork.y,length=Math.hypot(dx,dy)||1,n=nodes[ids[j]];n.branch=route.name;n.source=route.source;n.x=Math.round(clamp(fork.x+dx*t-dy/length*bend,70,1730));n.y=Math.round(clamp(fork.y+dy*t+dx/length*bend,base+70,base+height-60));}routes.push({...route,entry,fork:fork.id,rejoin:end.id,realm,forkIndex:index,rejoinIndex:join});}
 }return routes;}
function generateLegacyBoard(seed=Math.random().toString(36).slice(2,9).toUpperCase(),turns=24,theme='Mashup') {
 const random=seededRandom(seed),nodes={},realms={};
 const originals=ORIGINAL_BOARD.filter(n=>!n.hidden&&!['n43','n91'].includes(n.id));
 for(const original of originals){const realm=original.level.toLowerCase(),id=rename(original.id);nodes[id]={...original,id,realm,col:0,lane:original.branch?1:0,type:original.type==='classic'||original.type==='minigame'?'game':original.type,next:original.next.filter(id=>id!=='n0').map(rename)};}
 const routes=proceduralTrail(nodes,random);
 for(const realm of REALMS){const list=Object.values(nodes).filter(n=>n.realm===realm),start=realm+'-start',gate=realm+'-gate',y={mind:0,body:1030,spirit:1970}[realm];
  let changed=true;for(let pass=0;pass<list.length&&changed;pass++){changed=false;for(const n of list)for(const id of n.next){const t=nodes[id];if(t?.realm===realm&&t.col<n.col+1){t.col=n.col+1;changed=true;}}}
  const movable=list.filter(n=>!['start','gate'].includes(n.type)),types=shuffle(movable.map(n=>n.type==='location'?'event':n.type),random);
  movable.forEach((n,i)=>{n.type=types[i];delete n.location;n.cacheSeed=Math.floor(random()*0x7fffffff);if(theme==='City'&&n.type==='penalty')n.type='casino';});
  const diceTable=movable.find(n=>n.type==='casino'&&!n.branch);if(diceTable){diceTable.type='dice';delete diceTable.location;}nodes[start].type='start';realms[realm]={ids:list.map(n=>n.id),start,gate,cols:Math.max(...list.map(n=>n.col)),y,height:realm==='mind'?1030:realm==='body'?940:1060,color:ZONE_COLORS[realm],title:realm==='mind'?'Mind':realm==='body'?'Body':'Spirit'};
 }
 nodes['mind-3-0'].type='game';delete nodes['mind-3-0'].location;
 for(const route of routes){const entry=nodes[route.entry],main=nodes[nodes[route.fork].next[0]];entry.route={...route,safe:false};main.route={name:route.safe,source:route.source,reward:'Keep your points and follow the main road.',risk:'No detour bonus. Standard encounters ahead.',safe:true};}
 for(const realm of REALMS)placeLandmarks(nodes,realm,random);
 const signs=ORIGINAL_SIGNS.filter(s=>!s.hidden&&!s.branch).map(s=>{const nearest=originals.reduce((a,b)=>Math.hypot(b.x-s.x,b.y-s.y)<Math.hypot(a.x-s.x,a.y-s.y)?b:a),n=nodes[rename(nearest.id)];return {...s,x:clamp(n.x+(s.x-nearest.x)*.6,100,1700),y:clamp(n.y+(s.y-nearest.y)*.6,80,2980),source:sourceForSign(s.name)};});
 for(const route of routes){const entry=nodes[route.entry];signs.push({name:route.name,source:route.source,x:clamp(entry.x,100,1700),y:clamp(entry.y-72,80,2980),level:route.realm.toUpperCase(),branch:true,routeEntry:route.entry,routeId:route.id});}
 const board={seed,rng:hash(seed),theme,format:'original-trail',generation:5,width:1800,height:3030,nodes,realms,signs,routes};balanceEncounters(board);installObstacles(board);return board;
}
function generateBoard(seed,turns=24,theme='Mashup'){const board=buildGridBoard(generateLegacyBoard(seed,turns,theme));installObstacles(board);return board;}
function balanceEncounters(board,realms=REALMS){
 for(const realm of realms){const list=board.realms[realm].ids.map(id=>board.nodes[id]);let taskKept=false;
  for(const n of list)if(n.type==='task'){if(taskKept)n.type='game';else taskKept=true;}
  const main=list.filter(n=>!n.branch&&!['start','gate','location','casino','dice','shop','task'].includes(n.type));
 for(const at of [.22,.65]){const n=main[Math.floor((main.length-1)*at)];if(n){n.type='trivia';delete n.location;}}
  // More playable stops without overwriting landmarks, caches or shops.
  let gap=0,id=board.realms[realm].start;const seen=new Set();
  while(board.nodes[id]?.realm===realm&&!seen.has(id)){seen.add(id);const n=board.nodes[id];if(['game','trivia','casino','dice','task'].includes(n.type))gap=0;else if(!['start','gate'].includes(n.type)){gap++;if(gap>=3&&['event','bonus','penalty'].includes(n.type)){n.type='game';gap=0;}}id=n.next[0];}
 }
}
function sourceForSign(name=''){for(const[pattern,source]of [[/Paddy|Frank|Mac /,'Always Sunny'],[/Dunder|Schrute/,'The Office'],[/Pawnee|Dunshire/,'Parks and Recreation'],[/Taskmaster/,'Taskmaster'],[/Bluth/,'Arrested Development'],[/Quark|Federation|Starfleet/,'Star Trek'],[/South Park/,'South Park'],[/LV-426|Nostromo/,'Alien'],[/Predator/,'Predator'],[/Raccoon/,'Resident Evil'],[/Silent Hill/,'Silent Hill'],[/Arlen/,'King of the Hill'],[/Jurassic/,'Jurassic Park'],[/Brawndo/,'Idiocracy'],[/Fhloston/,'The Fifth Element'],[/Wayne/,'Wayne’s World'],[/Hill Valley/,'Back to the Future'],[/Traitors/,'The Traitors'],[/Ocean Ave/,'Bob’s Burgers'],[/Mortal/,'Mortal Kombat'],[/Planet Coaster/,'Planet Coaster'],[/Home Alone/,'Home Alone'],[/Shagadelic/,'Austin Powers'],[/KC |Mylo|Loki/,'Home'],[/Darkplace/,'Garth Marenghi’s Darkplace'],[/Cronenberg/,'David Cronenberg'],[/Troma/,'Troma'],[/Mars|Area 51/,'Mars Attacks!'],[/Beetlejuice/,'Beetlejuice'],[/Castlevania/,'Castlevania']])if(pattern.test(name))return source;return name;}
function addHorrorBoard(board){if(board.realms.horror)return;const base=Math.max(2980,(board.height||3030)>3030?board.height:2980),offset=base-2980;const list=ORIGINAL_BOARD.filter(n=>n.hidden),ids=list.map((_,i)=>'horror-'+i),map=new Map(list.map((n,i)=>[n.id,ids[i]]));for(let i=0;i<list.length;i++){const n=list[i],id=ids[i];board.nodes[id]={...n,id,y:n.y+offset,worldSpace:true,realm:'horror',col:i,lane:0,type:i===list.length-1?'gate':n.type==='minigame'||n.type==='classic'?'game':n.type,next:n.next.map(id=>map.get(id)).filter(Boolean)};}if(board.generation>=2){const r=seededRandom(board.seed+':horror'),rows=4,perRow=Math.ceil(ids.length/rows),mirror=r()<.5,places=shuffle(LOCATIONS.filter(l=>l.realm==='horror'),r),spare=shuffle(LOCATIONS.filter(l=>l.realm!=='horror'&&/evil dead|silent hill|resident evil|halloween|elm street|saw|alien|nightmare|troma|hellraiser|the thing|stranger things/i.test(l.source+' '+l.name)),r);let placedHorror=0;for(let i=0;i<ids.length;i++){const node=board.nodes[ids[i]],row=Math.floor(i/perRow),part=i%perRow,count=Math.min(perRow,ids.length-row*perRow),t=part/Math.max(1,count-1);node.x=Math.round(130+1540*((row%2===0)!==mirror?t:1-t)+Math.sin(i)*r()*15);node.y=Math.round(base+115+row*210+r()*18);if(i>0&&i<ids.length-1){node.type=pick(['game','event','item','penalty','task','casino'],r);node.cacheSeed=Math.floor(r()*0x7fffffff);if(i>=3&&(i-3)%4===0&&placedHorror<places.length+2){node.type='location';node.location=(places[placedHorror]||spare[placedHorror-places.length]||places[0]).id;placedHorror++;}}}}let doorKinds=[];if(board.generation>=3){const kinds=shuffle(['haunted','fog','laser','lock'],seededRandom(board.seed+':horror-obstacles'));doorKinds=kinds;for(const[i,at]of [5,18].entries()){if(!ids[at+4])continue;const from=ids[at],to=ids[at+4];if(!board.nodes[from].next.includes(to)){board.nodes[from].next.push(to);board.obstacles.push({id:'horror-door-'+i,from,to,type:kinds[i],open:false,openUntil:0,repairs:0});}}}board.realms.horror={ids,start:ids[0],gate:ids.at(-1),cols:ids.length-1,y:base,height:920,color:ZONE_COLORS.horror,title:'Horror'};
 // Journey-map boards lay the route below out as one long winding road with its landmarks beside it.
 if(board.grid&&layoutHorrorGrid(board,ids,base,doorKinds)){}
 else if(board.generation>=7){
  const H=2600,body=ids.slice(1,-1),top=base+330,bottom=base+H-380,pts=roadPoints(900,top,bottom,body.length,.4,2.2,170),start=board.nodes[ids[0]],gate=board.nodes[ids.at(-1)];
  start.x=900;start.y=base+170;gate.x=900;gate.y=base+H-130;let k=0;
  body.forEach((id,i)=>{const n=board.nodes[id];n.x=pts[i].x;n.y=pts[i].y;delete n.side;if(n.type==='location'){n.side=k++%2?1:-1;}});
  board.bridges ||= [];for(const o of board.obstacles||[])if(String(o.id).startsWith('horror-door')){board.nodes[o.from].bridge=o.to;board.bridges.push({realm:'horror',from:o.from,to:o.to});}
  Object.assign(board.realms.horror,{height:H,fork:ids[0],stem:[ids[0]],lanes:[{lane:3,position:1,cx:900,name:'The Route Below',source:'Horror',difficulty:'HORROR',kind:'Descent',route:null,ids:body,reward:'Every landmark hides a visitor.',risk:'The dark has opinions.',top,bottom}]});
 }if(board.generation>=4)balanceEncounters(board,['horror']);board.width=1800;board.height=base+(board.grid?board.realms.horror.height:board.generation>=7?2600:920);board.signs ||= [];board.signs.push(...ORIGINAL_SIGNS.filter(s=>s.hidden).map(s=>({...s,y:s.y+offset,source:sourceForSign(s.name)})));}
function routeOptions(run,nodeId){return (run.board.nodes[nodeId]?.next||[]).map(id=>run.board.nodes[id]).filter(Boolean);}
// Item/card moves stop at the door of a level gate whose boss has not been met; only a real step onto it starts the fight.
const bossAhead=(run,n)=>n.type==='gate'&&!run.endless&&run.board.format!=='warp'&&['mind','body','spirit','horror'].includes(n.realm)&&!(run.bossesSeen||{})[n.realm];
function advanceAlong(run,player,steps,lanePreference=0){for(let i=0;i<Math.abs(steps);i++){if(steps<0){const previous=player.visited.pop();if(previous)player.node=previous;else break;}else{const opts=routeOptions(run,player.node);if(!opts.length)break;const to=opts.find(n=>n.lane===lanePreference)||opts[0];if(bossAhead(run,to))break;player.visited.push(player.node);player.node=to.id;}}return player.node;}
function evolveBoard(run,random=Math.random){if(run.board.format==='warp')return false;const protectedIds=new Set(run.players.flatMap(p=>[p.node,...p.visited])),realm=run.board.nodes[run.players[run.current].node].realm;const list=shuffle(run.board.realms[realm].ids.map(id=>run.board.nodes[id]).filter(n=>!protectedIds.has(n.id)&&n.col>1&&!['start','gate','location','trivia','trainer'].includes(n.type)&&!n.route),random).slice(0,6);for(const n of list){const type=pick(['game','game','event','event','item','item','bonus','penalty','casino','dice','trivia','task'],random);n.type=type==='task'&&run.board.realms[realm].ids.some(id=>run.board.nodes[id].type==='task')?'game':type;}run.board.pulse=(run.board.pulse||0)+1;return list.length;}

Object.assign(exports,{REALMS,SPACE_TYPES,SPACE_ICONS,SPACE_CAPTIONS,ZONE_COLORS,ROUTES,proceduralTrail,generateLegacyBoard,generateBoard,balanceEncounters,sourceForSign,addHorrorBoard,routeOptions,advanceAlong,evolveBoard});