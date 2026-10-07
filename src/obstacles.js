const {character}=require("src/characters.js");
const {seededRandom,shuffle}=require("src/utils.js");
const {TRAVEL_ITEMS}=require("src/data/travelItems.js");
const OBSTACLE_TYPES = [
 {id:'bridge',name:'Goon Docks Broken Bridge',source:'The Goonies',icon:'🪢',trait:['flight'],tools:['goonies-rope','trooper-rope','paint-can-rope','paint-can','kurapika-chain'],hint:'Fly across, or rig a reusable rope bridge.',kind:'bridge'},
 {id:'lock',name:'Spencer Mansion Locked Gate',source:'Resident Evil',icon:'🔒',trait:['lockpick','force'],tools:['bond-lockpick','spencer-key','saw-key','basement-key'],hint:'Use a key/lockpick, a master thief or the Force.',kind:'lock'},
 {id:'tree',name:'Evil Dead Fallen Tree',source:'Evil Dead',icon:'🪵',trait:['strength','fire'],tools:['ash-chainsaw','buster-sword','hanzo-sword','daywalker-sword','jurassic-winch'],hint:'Cut, burn or lift the fallen tree.',kind:'tree'},
 {id:'flood',name:'TMNT Flooded Sewer',source:'Teenage Mutant Ninja Turtles',icon:'🌊',trait:['flight','swim'],tools:['turtle-raft','lotus-key'],hint:'A raft, submarine, swimmer or flying character can cross.',kind:'water'},
 {id:'checkpoint',name:'Area 51 Security Checkpoint',source:'Area 51',icon:'🪪',trait:['stealth','tech'],tools:['area51-keycard','predator-cloak','bond-lockpick','matrix-emp','they-live-glasses'],hint:'A keycard, disguise, EMP or stealth/tech skill gets past the guards.',kind:'checkpoint'},
 {id:'toxic',name:'Nuke ’Em High Toxic Spill',source:'Troma',icon:'☢',trait:['machine','undead'],tools:['troma-hazmat'],hint:'Wear hazmat gear; machines and undead ignore the spill.',kind:'toxic'},
 {id:'laser',name:'Matrix Laser Grid',source:'The Matrix',icon:'⚡',trait:['tech','force'],tools:['matrix-emp','area51-keycard'],hint:'Hack it, use the Force, or disable it with an EMP.',kind:'laser'},
 {id:'pipe',name:'Mario Mini Pipe',source:'Super Mario Bros.',icon:'🍄',trait:['small'],tools:['mini-mushroom'],hint:'Small characters squeeze through. Giant heads need a Mini Mushroom.',kind:'pipe',personalTool:true},
 {id:'haunted',name:'Castlevania Haunted Ward',source:'Castlevania',icon:'🦇',trait:['undead','hunter'],tools:['belmont-lantern','daywalker-sword','ash-chainsaw'],hint:'A monster hunter, undead traveler or holy gear breaks the ward.',kind:'haunted'},
 {id:'heavy',name:'Jurassic Park Emergency Gate',source:'Jurassic Park',icon:'🦕',trait:['strength','force'],tools:['jurassic-winch','warehouse-forklift-key','box-tank-key'],hint:'A winch, forklift, strong character or double-sized head can lift it.',kind:'heavy'},
 {id:'cliff',name:'Princess Bride Cliff Climb',source:'The Princess Bride',icon:'🧗',trait:['flight','climb'],tools:['goonies-rope','trooper-rope','kurapika-chain','jurassic-winch'],hint:'Bring rope or a winch, climb, or fly to the top.',kind:'cliff'},
 {id:'fog',name:'Silent Hill Blind Alley',source:'Silent Hill',icon:'🌫',trait:['tracker','machine'],tools:['belmont-lantern','scouter','dragon-radar'],hint:'A lantern, radar, machine vision or the dogs’ noses find the way.',kind:'fog'}
];
const TRAVEL_SKILLS={flight:'Flight',lockpick:'Lockpicking',force:'The Force',strength:'Strength',fire:'Fire breath',swim:'Swimming',stealth:'Stealth',tech:'Tech',machine:'Machine',undead:'Undead',small:'Small',hunter:'Monster hunter',climb:'Climbing',tracker:'Tracking'};
function characterTravelSkills(id){
 const c=character(id),name=c.name.toLowerCase(),skills=[];
 const add=(skill,pattern)=>{if(pattern.test(name))skills.push(skill);};
 add('flight',/\b(draco|goku|vegeta|gohan|piccolo|krillin|trunks|frieza|cell|majin buu|android 18|boba fett|alucard|dracula)\b/);
 add('force',/\b(yoda|luke skywalker|darth vader|obi.wan|qui.gon)\b/);
 add('strength',/\b(draco|reptar|t.800|terminator|goku|vegeta|gohan|piccolo|arnold schwarzenegger|rambo|frank dux|rocky|majin buu)\b/);
 add('fire',/\bdraco\b/);add('swim',/\b(leonardo|donatello|raphael|michelangelo)\b/);
 add('stealth',/\b(solid snake|snake|predator|john mcclane|james bond|neo|trinity)\b/);
 add('tech',/\b(neo|trinity|donatello|doc brown|emmett brown|bulma|natalya|spock|t.800)\b/);
 add('machine',/\b(t.800|terminator|robocop|r2.d2|c.3po|android 18)\b/);
 add('undead',/\b(alucard|dracula|freddy|jason|beetlejuice|death)\b/);
 add('small',/\b(kc|mylo|loki|yoda|tommy pickles|chuckie finster|angelica|ickis|krumm|ren|stimpy)\b/);
 add('hunter',/\b(ash williams|ash|blade|simon belmont|richter belmont|alucard|maria renard|van helsing)\b/);
 add('lockpick',/\b(james bond|snake|john mcclane|neo)\b/);
 add('climb',/\b(jackie chan|john mcclane|westley|inigo montoya|fezzik|spider.man)\b/);
 add('tracker',/\b(kc|mylo|loki|predator|gon|killua|kurapika|leorio)\b/);
 return [...new Set(skills)];
}
function obstacleType(obstacle){return OBSTACLE_TYPES.find(t=>t.id===obstacle?.type);}
function installObstacles(board,random=seededRandom(board.seed+':obstacles')){
 const types=shuffle(OBSTACLE_TYPES,random);board.obstacles ||= [];
 // Grid boards: roads at a fork are a free choice. Level 1 never bars a road; later levels
 // occasionally bar one of the two adventurous roads. Shortcuts and bridges keep their guards.
 const barred=new Set();
 if(board.generation>=8){const pick=seededRandom(board.seed+':fork-barriers');for(const realm of ['body','spirit']){const rs=(board.routes||[]).filter(r=>r.realm===realm);if(rs.length&&pick()<.3)barred.add(rs[Math.floor(pick()*rs.length)].entry);}}
 for(const [i,route]of (board.routes||[]).entries()){
  if(!board.nodes[route.fork]?.next.includes(route.entry))continue;
  if(board.generation>=8&&!barred.has(route.entry))continue;
  board.obstacles.push({id:`trail-${route.entry}`,from:route.fork,to:route.entry,type:types[i%types.length].id,open:false,openUntil:0,repairs:0});
 }
 return board.obstacles;
}
function edgeObstacle(run,from,to){return run.board.obstacles?.find(o=>o.from===from&&o.to===to)||null;}
function obstacleIsOpen(run,o){return !!o&&(o.open===true||o.openUntil>=run.turn);}
function obstacleChoices(run,player,o){
 const t=obstacleType(o);if(!t)return [];
 if(obstacleIsOpen(run,o))return [{id:'open',label:o.open?'Take the opened path':'Use the temporary opening',sub:o.open?'The route has been permanently cleared.':`Open through turn ${o.openUntil}.`,shared:false}];
 const choices=[],skills=characterTravelSkills(player.character),trait=t.trait.find(k=>skills.includes(k)&&!(k==='small'&&player.large>0));
 if(trait||t.id==='heavy'&&player.large>0||t.id==='checkpoint'&&player.cloak>0)choices.push({id:'character',label:`${character(player.character).name}: ${trait?TRAVEL_SKILLS[trait]:player.large>0?'Giant head':'Active cloak'}`,sub:'Your character crosses for free; the obstacle stays for everyone else.',shared:false});
 for(const id of t.tools.filter(id=>player.items.includes(id)))choices.push({id:'tool:'+id,itemId:id,label:'Use carried equipment',sub:t.personalTool?'Reusable gear gets you through; the pipe stays narrow.':'Clear this path for both players. Keep the reusable tool in your bag.',shared:!t.personalTool});
 if(player.travelPasses>0)choices.push({id:'pass',label:'Use a single-crossing pass',sub:'Spend one stored pass. Cross any barrier; it stays closed to other travelers.',shared:false});
 choices.push({id:'crew',label:'Hire the repair crew · 3 points',sub:'Permanently clear this route for both players.',cost:3,shared:true,disabled:player.points<3});
 return choices;
}
function obstacleRequirement(run,player,o){const t=obstacleType(o);if(!t)return '';const available=obstacleChoices(run,player,o).filter(c=>!c.disabled);return `${obstacleIsOpen(run,o)?'OPEN':'BARRIER'} · ${t.name}. ${t.hint}${available.length?' You have a way through.':' Take the free main road or return with gear / 3 points.'}`;}
function crossObstacle(run,player,o,choiceId){
 const t=obstacleType(o),owner=run.players.indexOf(player);
 if(!t||owner!==run.current||player.node!==o.from||!run.board.nodes[o.from]?.next.includes(o.to))return {blocked:true,message:'This crossing is no longer current.'};
 const key=`${run.turn}:${owner}:${o.id}`;run.obstacleResults ||= {};
 if(run.obstacleResults[key])return {...run.obstacleResults[key],repeated:true};
 const choice=obstacleChoices(run,player,o).find(c=>c.id===choiceId);
 if(!choice||choice.disabled)return {blocked:true,message:'That solution is unavailable. Your items and points are unchanged.'};
 if(choice.cost)player.points-=choice.cost;if(choice.id==='pass')player.travelPasses--;
 if(choice.shared){o.open=true;o.openUntil=0;o.repairs++;o.openedTurn=run.turn;}
 const result={blocked:false,obstacleId:o.id,choiceId,shared:!!choice.shared,cost:choice.cost||0,itemId:choice.itemId||null,message:`${player.name} passes ${t.name}.${choice.cost?' Paid 3 points.':''}${choice.shared?' The path is now open to both players.':choice.id==='open'?'':' The obstacle remains for other travelers.'}${choice.itemId?' Your carried tool stays in the bag.':''}${choice.id==='pass'?' One crossing pass spent.':''}`};
 run.obstacleResults[key]=result;const keys=Object.keys(run.obstacleResults);for(const key of keys.slice(0,Math.max(0,keys.length-64)))delete run.obstacleResults[key];
 return result;
}
function shiftObstacles(run){
 const messages=[];for(const o of run.board.obstacles||[])if(!o.open&&o.openUntil&&o.openUntil<run.turn){o.openUntil=0;messages.push(`${obstacleType(o).name}: the temporary opening closes.`);}
 if(run.turn%6===0){const pool=(run.board.obstacles||[]).filter(o=>!o.open&&!obstacleIsOpen(run,o));if(pool.length){const r=seededRandom(run.seed+':opening:'+run.turn),o=pool[Math.floor(r()*pool.length)];o.openUntil=run.turn+1;messages.push(`${obstacleType(o).name}: maintenance opens the route through turn ${o.openUntil}!`);}}
 return messages;
}
function validObstacles(board){return !board.obstacles||Array.isArray(board.obstacles)&&board.obstacles.length<=32&&new Set(board.obstacles.map(o=>o?.id)).size===board.obstacles.length&&board.obstacles.every(o=>typeof o?.id==='string'&&!!obstacleType(o)&&board.nodes[o.from]?.next.includes(o.to)&&board.nodes[o.from].next[0]!==o.to&&typeof o.open==='boolean'&&Number.isInteger(o.openUntil)&&o.openUntil>=0&&Number.isInteger(o.repairs)&&o.repairs>=0);}
function nearbyTravelTool(run,player,random=Math.random){const node=run.board.nodes[player.node],pool=(run.board.obstacles||[]).filter(o=>!obstacleIsOpen(run,o)&&run.board.nodes[o.from].realm===node.realm&&run.board.nodes[o.from].col>=node.col).sort((a,b)=>run.board.nodes[a.from].col-run.board.nodes[b.from].col);for(const o of pool){const tools=TRAVEL_ITEMS.filter(it=>obstacleType(o).tools.includes(it.id)&&!player.items.includes(it.id));if(tools.length)return tools[Math.min(tools.length-1,Math.floor(random()*tools.length))];}const tools=TRAVEL_ITEMS.filter(it=>!player.items.includes(it.id));return tools[Math.min(tools.length-1,Math.floor(random()*tools.length))]||null;}

Object.assign(exports,{OBSTACLE_TYPES,TRAVEL_SKILLS,characterTravelSkills,obstacleType,installObstacles,edgeObstacle,obstacleIsOpen,obstacleChoices,obstacleRequirement,crossObstacle,shiftObstacles,validObstacles,nearbyTravelTool});