const {seededRandom,pick}=require("src/utils.js");
// Each player draws a different journey for every realm. Finishing one pays out at
// once, so the road you take (and who you cross paths with) matters.
const JOURNEYS=[
 {id:'pilgrim',name:'Landmark Pilgrim',icon:'⌂',goal:'landmark',count:2,reward:4,text:'Visit 2 landmarks in this realm.'},
 {id:'arcade',name:'Arcade Regular',icon:'🕹',goal:'win',count:2,reward:4,text:'Win 2 minigames in this realm.'},
 {id:'quizzer',name:'Pub Quizzer',icon:'❓',goal:'trivia',count:2,reward:4,text:'Land on 2 trivia spaces in this realm.'},
 {id:'daredevil',name:'Daredevil',icon:'🔥',goal:'road:2',count:1,reward:5,text:'Take the High Reward road.'},
 {id:'scenic',name:'Scenic Route',icon:'🌿',goal:'road:0',count:1,reward:3,text:'Take the Calm road.'},
 {id:'explorer',name:'Backroads Explorer',icon:'🧭',goal:'road:1',count:1,reward:4,text:'Take the Adventurous road.'},
 {id:'scavenger',name:'Supply Run',icon:'📦',goal:'item',count:2,reward:4,text:'Open 2 supply caches in this realm.'},
 {id:'bridge',name:'Bridge Crosser',icon:'🌉',goal:'bridge',count:1,reward:4,text:'Cross a bridge between roads.'}
];
const REALMS=['mind','body','spirit'];
const realmOf=(run,p)=>run.board.nodes[p.node]?.realm;
// Returns the player's journey for the realm they are in, drawing one if needed.
function ensureJourney(run,p){
 const realm=realmOf(run,p);if(!REALMS.includes(realm)||!run.board.realms[realm]?.lanes)return null;
 if(p.journey&&p.journey.realm===realm)return p.journey;
 const other=run.players.find(q=>q!==p)?.journey,random=seededRandom(`${run.seed}:journey:${p.owner||p.name}:${realm}`);
 const deck=JOURNEYS.filter(j=>!(other&&other.realm===realm&&other.id===j.id));
 const def=pick(deck,random);p.journey={id:def.id,realm,progress:0,done:false};return p.journey;
}
const definition=journey=>JOURNEYS.find(j=>j.id===journey?.id)||null;
function journeyLabel(run,p){const j=ensureJourney(run,p),d=definition(j);return d?{...d,progress:j.progress,done:j.done}:null;}
// Reports progress. Returns the messages for any journey this event completed.
function journeyEvent(run,p,kind,detail={}){
 const j=ensureJourney(run,p),d=definition(j);if(!j||!d||j.done)return [];
 let hit=false;
 if(d.goal==='road:'+detail.lane&&kind==='road')hit=true;else if(d.goal===kind&&kind!=='road')hit=true;
 if(!hit)return [];
 j.progress++;if(j.progress<d.count)return [`${d.icon} ${d.name}: ${j.progress}/${d.count}`];
 j.done=true;p.points+=d.reward;return [`${d.icon} ${p.name} completed ${d.name}! +${d.reward} points`];
}
const laneOf=(run,node)=>run.board.realms[node.realm]?.lanes?.find(l=>l.ids.includes(node.id))||null;
// Called as a player steps from one space to another. Entering a road by the fork
// or by a bridge both count as taking that road.
function journeyStep(run,p,fromId,target){
 const from=run.board.nodes[fromId],out=[];
 if(from?.bridge===target.id)out.push(...journeyEvent(run,p,'bridge'));
 const into=laneOf(run,target),leaving=laneOf(run,from);
 if(into&&(!leaving||leaving.lane!==into.lane))out.push(...journeyEvent(run,p,'road',{lane:into.lane}));
 return out;
}
// Text for the route chooser: does this option advance the active player's journey?
function journeyHint(run,p,node,from){
 const j=ensureJourney(run,p),d=definition(j);if(!d||j.done)return '';
 const into=laneOf(run,node),leaving=laneOf(run,from);
 const fits=(d.goal==='bridge'&&from.bridge===node.id)||(into&&(!leaving||leaving.lane!==into.lane)&&d.goal==='road:'+into.lane);
 return fits?`Fits your journey: ${d.name} (+${d.reward})`:'';
}
function assignJourneys(run){for(const p of run.players)ensureJourney(run,p);}
Object.assign(exports,{JOURNEYS,ensureJourney,journeyLabel,journeyEvent,journeyStep,journeyHint,assignJourneys});
