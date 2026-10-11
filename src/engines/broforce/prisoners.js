// BF-16: pure, pixel-space prisoner rescue. The caller supplies BF-17's
// snapshotFighters(profile, owner) arrays and applies returned fighter-swap
// events to its own temporary in-mission fighter state (never to s.players).
const {drawNextFighter}=require('src/engines/broforce/roster.js');

const OWNERS=['Sean','Amber'];
const RESCUE_RADIUS=28; // player body center to cage rectangle, world pixels
const BREAK_RADIUS=16; // impact point to cage rectangle, world pixels
const CAGE_WIDTH=16, CAGE_HEIGHT=22;
const ANIMATION_MS=520, STATUS_MS=950;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const positive=(n,fallback)=>finite(n)&&n>0?n:fallback;
const validId=id=>typeof id==='string'&&id.trim().length>0;
const byId=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0;

// x/y refer to the top-left corner, matching BF-13 actor coordinates.
function createBroforcePrisoners(spawnList=[]){
 if(!Array.isArray(spawnList))throw new TypeError('Prisoner spawns must be an array');
 const used=new Set();
 return spawnList.map((spawn,i)=>{
  if(!spawn||!finite(spawn.x)||!finite(spawn.y))
   throw new TypeError('Prisoner spawn requires finite pixel x/y at index '+i);
  const id=validId(spawn.id)?spawn.id:'prisoner-'+i;
  if(used.has(id))throw new Error('Duplicate prisoner ID: '+id);
  used.add(id);
  return {id,x:spawn.x,y:spawn.y,w:positive(spawn.w,CAGE_WIDTH),
   h:positive(spawn.h,CAGE_HEIGHT),rescued:false};
 });
}

function distanceToCage(x,y,cage){
 const dx=Math.max(cage.x-x,0,x-(cage.x+cage.w));
 const dy=Math.max(cage.y-y,0,y-(cage.y+cage.h));
 return Math.hypot(dx,dy);
}
function livePlayer(player,index){
 // An attributed impact is not proof that an actor is still alive. The
 // mission passes an explicit boolean; fail closed for missing/stale actors.
 return !!player&&player.owner===OWNERS[index]&&
  player.alive===true&&player.dead!==true&&player.downed!==true&&
  player.cancelled!==true&&player.canceled!==true&&
  player.extracted!==true&&player.boarded!==true&&
  !(finite(player.health)&&player.health<=0);
}
function playerCenter(player){
 const body=player.body&&typeof player.body==='object'?player.body:player;
 if(!finite(body.x)||!finite(body.y))return null;
 return {x:body.x+positive(body.w,12)/2,y:body.y+positive(body.h,26)/2};
}
function parsedInteractions(interactions){
 if(Array.isArray(interactions))return {actions:interactions,cancelled:false};
 if(!interactions||typeof interactions!=='object')return {actions:[],cancelled:false};
 return {actions:Array.isArray(interactions.actions)?interactions.actions:
  Array.isArray(interactions.events)?interactions.events:[],
  cancelled:interactions.cancelled===true||interactions.canceled===true||
   interactions.aborted===true||interactions.paused===true};
}

// Explicit intents:
// {type:'rescue',playerIndex,prisonerId?} requires a living adjacent player.
// {type:'cage-destroyed',playerIndex,prisonerId?,x,y} requires an impact at
// the cage, attributed to a living player (e.g. a projectile owner). A single
// untargeted intent selects only the closest eligible cage. Neither action can
// claim a cage remotely by merely supplying its ID.
function advanceBroforcePrisoners({prisoners=[],players=[],fightersByOwner={},
 activeFighterByOwner={},interactions=[],rand=Math.random}={}){
 const next=(Array.isArray(prisoners)?prisoners:[]).map(p=>({...p}));
 const events=[];
 const {actions,cancelled}=parsedInteractions(interactions);
 if(cancelled||!Array.isArray(players)||!actions.length)return {prisoners:next,events};
 const pending=new Map();
 for(const action of actions){
  if(!action||!Number.isInteger(action.playerIndex)||action.playerIndex<0||
     action.playerIndex>1||!livePlayer(players[action.playerIndex],action.playerIndex))continue;
  const index=action.playerIndex,player=players[index];
  let candidates=[];
  if(action.type==='rescue'||action.type==='touch'){
   const center=playerCenter(player);
   if(!center)continue;
   candidates=next.filter(p=>!p.rescued&&
    (action.prisonerId==null||p.id===action.prisonerId))
    .map(p=>({p,d:distanceToCage(center.x,center.y,p)}))
    .filter(c=>c.d<=RESCUE_RADIUS);
  }else if(action.type==='cage-destroyed'){
   if(!finite(action.x)||!finite(action.y))continue;
   candidates=next.filter(p=>!p.rescued&&
    (action.prisonerId==null||p.id===action.prisonerId))
    .map(p=>({p,d:distanceToCage(action.x,action.y,p)}))
    .filter(c=>c.d<=BREAK_RADIUS);
  }else continue;
  // One interaction, one cage; distance and ID tie breaks are stable.
  candidates.sort((a,b)=>a.d-b.d||byId(a.p,b.p));
  const chosen=candidates[0];
  if(!chosen)continue;
  if(!pending.has(chosen.p.id))pending.set(chosen.p.id,[]);
  pending.get(chosen.p.id).push({playerIndex:index,owner:player.owner});
 }
 const temporaryActive={...activeFighterByOwner};
 for(const cage of next.slice().sort(byId)){
  if(cage.rescued||!pending.has(cage.id))continue;
  const claimants=pending.get(cage.id);
  claimants.sort((a,b)=>OWNERS.indexOf(a.owner)-OWNERS.indexOf(b.owner)||a.playerIndex-b.playerIndex);
  const {playerIndex,owner}=claimants[0];
  cage.rescued=true;
  cage.rescuedBy=owner;
  const from=validId(temporaryActive[owner])?temporaryActive[owner]:null;
  const pool=Array.isArray(fightersByOwner[owner])?fightersByOwner[owner]:[];
  // BF-17 deduplicates canonical identities, excludes non-roster IDs, and
  // never consumes random for empty/singleton choices.
  const to=drawNextFighter(pool,from,typeof rand==='function'?rand:Math.random);
  const base={playerIndex,owner,prisonerId:cage.id,animationMs:ANIMATION_MS,statusMs:STATUS_MS};
  if(to===null){
   events.push({type:'prisoner-empty',...base});
  }else{
   temporaryActive[owner]=to;
   events.push({type:'fighter-swap',...base,from,to});
  }
 }
 return {prisoners:next,events};
}

Object.assign(exports,{createBroforcePrisoners,advanceBroforcePrisoners});
