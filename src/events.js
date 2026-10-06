const {ACTIVE_CATALOG:CATALOG}=require("src/contentPolicy.js");
const {character, CHARACTERS}=require("src/characters.js");
const {availableCharacters, recruit, recruitReward, canRecruitReward}=require("src/profile.js");
const {randomItem, pointChange, findItem, acquireItem}=require("src/items.js");
const {resolveEncounterGame}=require("src/encounterGames.js");
const {weighted, pick, shuffle}=require("src/utils.js");
const {addHorrorBoard, advanceAlong}=require("src/board.js");
const {selectReferenceSource, selectThemedEncounter}=require("src/references.js");
const RARE_EVENTS = [
 {id:'upside-down',title:'Oops. The Upside Down.',source:'Stranger Things',body:'You have fallen between worlds. Four of your turns on a twisted pocket board, then you return.',effect:'upside'},
 {id:'body-skip',title:'Express elevator to Body',source:'Star Trek',body:'A transporter operator pressed the wrong button. Skip straight to the entrance of Level 2.',effect:'body'},
 {id:'big-avatar',title:'An unnecessarily large problem',source:'Super Mario',body:'Your avatar is double-sized for four of your turns. You also gain two penalty shields. Subtle.',effect:'large'},
 {id:'board-shuffle',title:'The board has had an idea',source:'Taskmaster',body:'All unvisited encounter spaces in this realm change places. The routes stay connected. Nobody requested this.',effect:'shuffle'},
 {id:'body-swap',title:'Face / Off. Board edition.',source:'Face/Off',body:'You swap characters with your opponent for the rest of this run. Your unlocks stay yours.',effect:'characters'},
 {id:'time-loop',title:'Groundhog turn',source:'Groundhog Day',body:'Take another turn immediately. The opponent receives a consolation item.',effect:'extra'},
 {id:'dog-parade',title:'Absolutely no leash control',source:'Home',body:'KC and Mylo have found the game. Both permanently join the shared roster.',effect:'dogs'}
];
function drawEvent(run, profile, random=Math.random) {
 const p=run.players[run.current],realm=run.board.nodes[p.node].realm;
 if(random()<.055){const pool=RARE_EVENTS.filter(e=>e.effect!=='upside'||!run.upsideDown).filter(e=>e.effect!=='body'||realm==='mind');return {...pick(pool,random),rare:true};}
 const owned=availableCharacters(profile,p.owner),seen=new Set(run.cardsSeen);
 const eligible=CATALOG.cards.filter(c=>(c.level==='ANY'||c.level.toLowerCase()===realm)&&(!c.minTurn||run.turn>=c.minTurn)&&(!c.requiresItem||p.items.includes(c.requiresItem))&&c.e[0]!=='team'&&c.e[0]!=='horror'&&!(c.e[0]==='unlockChar'&&!canRecruitReward(profile,c.e[1],p.owner)));
 let pool=eligible.filter(c=>!seen.has(c.title));
 if(!pool.length&&eligible.length){const recycled=new Set(eligible.map(c=>c.title));run.cardsSeen=run.cardsSeen.filter(title=>!recycled.has(title));pool=eligible;}
 if(run.players.every(p=>p.cleared.includes('body'))&&!run.horror&&random()<.2)return {title:'FRANK',source:'Always Sunny',body:'Frank has been waiting. He has added a route. It does not look welcoming.',e:['horror'],rare:true};
 if(run.players.every(p=>p.cleared.includes('body'))&&['sean','amber'].every(id=>run.players.some(p=>p.character===id))&&!run.mutation&&['mario','luigi'].every(id=>[...profile.shared,...Object.values(profile.rosters).flat()].includes(id))&&random()<.035)return {title:'Oops. You’re on the same team now.',source:'Super Mario',body:'Mario and Luigi have taken over the arcade. You are one relay team for three races against their hard CPU drivers. Collect coins, dodge blocks and boost past them.',e:['team',3],rare:true};
 if(random()<.55||!pool.length){const node=run.board.nodes[p.node],source=node.source||selectReferenceSource(run,random);const event=selectThemedEncounter(source,{owned,items:p.items,player:p,profile,seen:run.cardsSeen,triviaSeen:profile.recentTrivia||run.triviaSeen,realm,turn:run.turn,random});rememberEvent(run,event.title);return event;}
 // Unlocks stay exciting without replacing every encounter with a roster entry.
 const freshChars=pool.filter(c=>c.e[0]==='unlockChar');const other=pool.filter(c=>c.e[0]!=='unlockChar');
 const subset=freshChars.length&&random()<.28?freshChars:other.length?other:freshChars;
 const selected=weighted(subset,random);rememberEvent(run,selected.title);return {...selected,id:selected.title};
}
function rememberEvent(run,title){if(!run.cardsSeen.includes(title))run.cardsSeen.push(title);}
function addPocketBoard(run) {
 if(run.board.realms['upside-down'])return;
 const base=run.board.height||3030;run.board.height=base+800;const ids=[];for(let i=0;i<12;i++){const id=`upside-${i}`;ids.push(id);run.board.nodes[id]={id,worldSpace:true,realm:'upside-down',col:i,lane:1,x:150+i*125,y:base+350+Math.cos(i*1.4)*130,type:i%3===0?'game':i%3===1?'event':'item',next:[`upside-${(i+1)%12}`]};}run.board.realms['upside-down']={ids,start:ids[0],gate:ids.at(-1),cols:11,y:base,height:800,color:'#512633',title:'The Upside Down'};
}
function applyEvent(run,profile,event,random=Math.random) {
 const p=run.players[run.current],other=run.players[1-run.current];let message='',unlocked=[],game=null,roulette=false,task=false;const acquisitions=[],unlockOwners={};
 const gainItem=(id,player=p)=>{const result=acquireItem(run,profile,player,findItem(id)||randomItem(random,{player,profile}));acquisitions.push(result);for(const id of result.unlocked){if(!unlocked.includes(id))unlocked.push(id);unlockOwners[id]=player.owner;}return result;};
 const requestedUnlocks=new Set();
 const unlock=id=>{if(requestedUnlocks.has(id))return null;requestedUnlocks.add(id);const actual=recruitReward(profile,id,p.owner,'encounter',random);if(actual){unlocked.push(actual);unlockOwners[actual]=p.owner;}return actual;};
 if(event.effect) switch(event.effect){
  case 'upside':addPocketBoard(run);run.upsideDown={owner:run.current,returnNode:p.node,turns:4,startTurn:run.turn};p.node='upside-0';message='Four turns in the Upside Down. The exit will find you.';break;
  case 'body':p.cleared=[...new Set([...p.cleared,'mind'])];p.node='body-start';message='Transported to Level 2: Body.';break;
  case 'large':p.large=4;p.largeStart=run.turn;p.shields+=2;message='Avatar size ×2 for four turns. +2 shields.';break;
  case 'shuffle':{const realm=run.board.nodes[p.node].realm;const nodes=run.board.realms[realm].ids.map(id=>run.board.nodes[id]).filter(n=>!['start','gate'].includes(n.type)&&!run.players.some(q=>q.node===n.id||q.visited.includes(n.id)));const payload=shuffle(nodes.map(n=>({type:n.type,location:n.location})),random);nodes.forEach((n,i)=>{n.type=payload[i].type;n.location=payload[i].location;});message='The encounters have shuffled. Reconsider your path.';break;}
  case 'characters':[p.character,other.character]=[other.character,p.character];message='Characters swapped for this run.';break;
  case 'extra':{p.extra=true;const found=gainItem(null,other);message='Extra turn gained; your opponent gets a consolation item. '+found.message;break;}
  case 'dogs':for(const id of ['kc','mylo'])if(recruit(profile,id,null,'dogs'))unlocked.push(id);message='KC and Mylo join both rosters.';break;
 }
 else { const [kind,a,b]=event.e||['points',3];switch(kind){
  case 'points':{const amount=Number(a)||0,r=pointChange(p,p.cloak&&amount<0?0:amount);message=p.cloak&&amount<0?'Your cloak avoided the penalty.':r.blocked?'Penalty shield used.':`${r.delta>=0?'+':''}${r.delta} points.`;break;}
  case 'item':message=gainItem(a).message;break;
  case 'unlockChar':{const actual=unlock(a);message=actual?`${character(actual).name} joins ${p.owner}'s roster.`:'An old friend brings +3 points.';if(!actual)p.points+=3;break;}
  case 'unlockDogs':for(const id of ['kc','mylo'])if(recruit(profile,id,null,'dogs'))unlocked.push(id);message='KC and Mylo join both rosters.';break;
  case 'mg':case 'unlockGame':game=resolveEncounterGame(a,{source:event.source});if(game){profile.games||=[];if(!profile.games.includes(game.id))profile.games.push(game.id);}roulette=!game;message='A new challenge awaits.';break;
  case 'classic':case 'casino':roulette=true;message='The arcade is open.';break;
  case 'task':task=true;message='Your time starts when you are ready.';break;
  case 'move':advanceAlong(run,p,Number(a)||0);message=`Moved ${Math.abs(Number(a)||0)} spaces ${Number(a)<0?'back':'forward'}.`;break;
  case 'swap':[p.node,other.node]=[other.node,p.node];[p.visited,other.visited]=[other.visited,p.visited];message='Positions swapped.';break;
  case 'steal':{if(other.antiSteal){other.antiSteal--;message='Kitten Mittens blocked the steal.';}else{const r=pointChange(other,other.cloak?0:-(Number(a)||3));if(!r.blocked)p.points-=r.delta;message=r.blocked||other.cloak?'The opponent blocked the steal.':`Stole ${-r.delta} points.`;}break;}
  case 'tradeItem':pointChange(p,Number(a)||-2,false);message=`${gainItem(null).message} Paid ${Math.abs(Number(a)||2)} points.`;break;
  case 'horror':addHorrorBoard(run.board);run.horror=true;profile.horrorSeen=true;profile.modes||=['versus'];if(!profile.modes.includes('horror'))profile.modes.push('horror');p.node='horror-0';message='A new route has opened.';break;
  case 'team':run.mutation={remaining:3,won:0};message='Three cooperative rounds against the plumber brothers.';break;
  case 'horrorTrap':run.traps||=[];run.traps.push({node:pick(run.board.realms[run.board.nodes[p.node].realm].ids,random),owner:-1});message='Something has changed ahead.';break;
  case 'unlockFeature':profile.equipment=true;message=`Equipment locker opened. ${gainItem('heavy-champion-belt').message}`;break;
  case 'musicCue':case 'musicGame':p.points+=2;if(kind==='musicGame'){game=resolveEncounterGame(a,{source:event.source});roulette=!game;}message='+2 points. A new original synth groove takes over.';break;
  case 'chaos':p.boost+=3;message='Next roll +3. The deck has shown mercy.';break;
  default:p.points+=3;message='+3 points.';break;
 }}
 if(event.unlock&&!requestedUnlocks.has(event.unlock)&&!unlocked.includes(event.unlock)){const actual=unlock(event.unlock);if(actual)message+=` ${character(actual).name} also joins your roster.`;}
 return {message,unlocked,unlockOwners,game,roulette,task,item:acquisitions[0]?.item,transformed:acquisitions.some(result=>result.transformed),acquisitions};
}

Object.assign(exports,{RARE_EVENTS,drawEvent,addPocketBoard,applyEvent});