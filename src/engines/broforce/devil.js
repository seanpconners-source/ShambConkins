// BF-20: standalone, deterministic final devil encounter. No canvas, profile,
// assets, or other module side effects. Coordinates are world pixels (+y down).
// Input players use physics-style top-left x/y/w/h, stable id/owner, and alive.
// Boss hit receipts: {id, targetId:'devil', damage}; targetId may also be the
// boss's actual characterId. An omitted targetId means already boss-routed.
// The caller consumes events; this simulation never changes player HP/terrain.
const STEP=1/60, MAX_DT=.1, MAX_EVENTS=32, MAX_SHOTS=20;
const MAX_HIT_IDS=160, MAX_DAMAGE_EVENTS=32, TILE_SIZE=16;
const MAX_HP=36, HIT_IFRAMES=.24;
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=(n)=>Math.round(n*1000000)/1000000;
function seedToInt(seed){
 let n=typeof seed==='number'&&Number.isFinite(seed)?seed>>>0:2166136261;
 if(typeof seed==='string')for(let i=0;i<seed.length;i++)n=Math.imul(n^seed.charCodeAt(i),16777619)>>>0;
 return n||0x9e3779b9;
}
function createBroforceDevil({characterId,x=0,y=0,seed=1}={}){
 if(typeof characterId!=='string'||!characterId.trim())throw new TypeError('A chosen eligible devil characterId is required');
 return {
  id:'devil', characterId, seed, rngState:seedToInt(seed),
  x:finite(x),y:finite(y),originX:finite(x),originY:finite(y),
  w:58,h:72,vx:0,vy:0,hp:MAX_HP,maxHp:MAX_HP,phase:1,
  mode:'intro',modeTimer:1.15,attack:null,attackCount:0,attackSerial:0,patternOffset:0,
  attackElapsed:0,fired:0,aim:null,targetId:null,telegraph:null,
  revealed:false,defeatEmitted:false,projectiles:[],invulnerability:0,
  flash:0,hitIds:[],tick:0,remainder:0,nextEventId:0,deathTimer:0
 };
}
function emit(d,events,type,props={}){
 if(events.length>=MAX_EVENTS&&type!=='devil-defeated')return false;
 events.push({type,id:'devil:'+ ++d.nextEventId,tick:d.tick,characterId:d.characterId,...props});
 return true;
}
function nextRandom(d,external){
 if(typeof external==='function'){
  const value=external();
  return clamp(finite(value),0,.999999999);
 }
 let state=d.rngState>>>0;
 state^=state<<13;state^=state>>>17;state^=state<<5;
 d.rngState=state>>>0;
 return d.rngState/4294967296;
}
function livePlayers(players){
 if(!Array.isArray(players))return [];
 return players.slice(0,2).map((p,index)=>{
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.alive===false||
    p.dead===true||p.down===true||p.downed===true||p.boarded===true||
    (Number.isFinite(p.hp)&&p.hp<=0)||(Number.isFinite(p.health)&&p.health<=0))return null;
  return {id:String(p.id??p.owner??index),x:p.x,y:p.y,
   w:clamp(finite(p.w,12),1,128),h:clamp(finite(p.h,26),1,128),index};
 }).filter(Boolean);
}
function nearestTarget(d,players){
 return players.slice().sort((a,b)=>{
  const ax=a.x+a.w/2-d.x-d.w/2,ay=a.y+a.h/2-d.y-d.h/2;
  const bx=b.x+b.w/2-d.x-d.w/2,by=b.y+b.h/2-d.y-d.h/2;
  const diff=ax*ax+ay*ay-bx*bx-by*by;
  return diff||a.index-b.index;
 })[0];
}
function phaseOf(hp){return hp>24?1:hp>12?2:3;}
function newTelegraph(d,players,events,rand){
 const target=nearestTarget(d,players);
 if(!target)return;
 const patterns=d.phase===1?['fan','quake']:d.phase===2?
  ['fan','dive','quake']:['dive','fan','quake'];
 // A full ordered cycle ensures every advertised attack can occur; the seeded
 // offset varies which of the phase's attacks starts that cycle.
 const offset=d.attackCount%patterns.length===0?Math.floor(nextRandom(d,rand)*patterns.length):d.patternOffset;
 if(d.attackCount%patterns.length===0)d.patternOffset=offset;
 const attack=patterns[(d.attackCount+offset)%patterns.length];
 const duration=(attack==='fan'?.78:attack==='quake'?.98:1.08)-(d.phase-1)*.075;
 d.attack=attack;d.mode='windup';d.modeTimer=duration;d.attackElapsed=0;
 d.fired=0;d.attackSerial++;d.attackCount++;
 d.targetId=target.id;
 d.aim={x:round(target.x+target.w/2),y:round(target.y+target.h/2)};
 d.telegraph={attack,attackId:d.attackSerial,x:d.x+d.w/2,y:d.y+d.h/2,
  targetX:d.aim.x,targetY:d.aim.y,radius:attack==='fan'?0:attack==='quake'?35:39,
  duration,remaining:duration};
 emit(d,events,'devil-telegraph',{attack,attackId:d.attackSerial,targetId:target.id,
  x:d.x+d.w/2,y:d.y+d.h/2,targetX:d.aim.x,targetY:d.aim.y,
  radius:d.telegraph.radius,duration});
}
function damageBoss(d,hits,events){
 if(d.mode==='intro'||d.mode==='dying'||d.mode==='dead')return;
 const valid=[];
 for(let i=0;i<Math.min(hits.length,MAX_DAMAGE_EVENTS);i++){
  const h=hits[i];if(!h||typeof h!=='object')continue;
  const target=h.targetId??h.target;
  if(target!=null&&target!=='devil'&&target!==d.characterId)continue;
  const damage=finite(h.damage,finite(h.amount,0));
  if(damage<=0)continue;
  // Only an identifiable combat impact can hurt the boss. The combat resolver
  // uses projectileId/source; legacy already-boss-routed hits use id/eventId.
  // Projectile identity wins over event labels to prevent double counting.
  const owner=h.owner;
  if(typeof owner==='string'&&(owner==='devil'||owner.startsWith('devil:')||
      owner==='enemy'||owner.startsWith('enemy:')))continue;
  const id=h.projectileId??h.source??h.id??h.eventId;
  if(typeof id!=='string'&&!(typeof id==='number'&&Number.isSafeInteger(id)))continue;
  const key=String(id).slice(0,120);
  if(!key||key.startsWith('devil:')||key.startsWith('enemy:')||
     d.hitIds.includes(key))continue;
  d.hitIds.push(key);
  valid.push({key,damage:clamp(damage,0,6),index:i});
 }
 if(d.hitIds.length>MAX_HIT_IDS)d.hitIds.splice(0,d.hitIds.length-MAX_HIT_IDS);
 if(d.invulnerability>0||!valid.length)return;
 valid.sort((a,b)=>a.key.localeCompare(b.key)||a.index-b.index);
 // Several unique hits in the same tick count, but their *combined* damage
 // has a cap. One projectile ID may never count twice in that tick/window.
 const total=Math.min(6,valid.reduce((sum,h)=>sum+h.damage,0));
 d.hp=round(Math.max(0,d.hp-total));d.invulnerability=HIT_IFRAMES;d.flash=.13;
 emit(d,events,'devil-hit',{damage:round(total),hp:d.hp,maxHp:d.maxHp});
 if(d.hp===0){
  d.mode='dying';d.modeTimer=1.3;d.deathTimer=1.3;
  d.attack=null;d.telegraph=null;d.projectiles=[];d.vx=0;d.vy=0;
  if(!d.defeatEmitted){d.defeatEmitted=true;emit(d,events,'devil-defeated');}
  return;
 }
 const phase=phaseOf(d.hp);
 if(phase>d.phase){
  d.phase=phase;d.mode='recover';d.modeTimer=.44;
  d.telegraph=null;d.attack=null;d.projectiles=[];
  d.x=d.originX;d.y=d.originY;
  emit(d,events,'devil-phase',{phase,hp:d.hp});
 }
}
function hitRect(x,y,r,p){return x+r>=p.x&&x-r<=p.x+p.w&&y+r>=p.y&&y-r<=p.y+p.h;}
function damageArea(d,events,players,x,y,radius,attackId){
 emit(d,events,'devil-cover-damage',{x:round(x),y:round(y),radius,damage:2,attackId});
 emit(d,events,'devil-impact',{x:round(x),y:round(y),radius,attackId});
 for(const p of players){
  if(hitRect(x,y,radius,p))emit(d,events,'devil-hit-player',{
   playerId:p.id,sourceId:'devil:area:'+attackId,attackId,damage:1,x:round(x),y:round(y)});
 }
}
function shootFan(d,events){
 const count=d.phase===1?3:d.phase===2?4:5;
 const ox=d.x+d.w/2,oy=d.y+d.h*.34;
 const dx=d.aim.x-ox,dy=d.aim.y-oy;
 const angle=Math.atan2(dy,dx);
 for(let i=0;i<count;i++){
  if(d.projectiles.length>=MAX_SHOTS||events.length>=MAX_EVENTS)break;
  const spread=(i-(count-1)/2)*.12;
  const speed=180+d.phase*24;
  const vx=round(Math.cos(angle+spread)*speed),vy=round(Math.sin(angle+spread)*speed);
  const id='devil:shot:'+d.attackSerial+':'+d.fired+':'+i;
  d.projectiles.push({id,x:round(ox),y:round(oy),vx,vy,r:3.5,ttl:2.7});
  emit(d,events,'devil-shot',{projectileId:id,attackId:d.attackSerial,
   x:round(ox),y:round(oy),vx,vy,radius:3.5});
 }
}
function moveShots(d,events,players,isSolid){
 const solid=typeof isSolid==='function'?isSolid:()=>false;
 const kept=[];
 for(const shot of d.projectiles){
  shot.ttl-=STEP;
  const x=shot.x+shot.vx*STEP,y=shot.y+shot.vy*STEP;
  if(shot.ttl<=0||!Number.isFinite(x)||!Number.isFinite(y))continue;
  // Sweep at <=1px spacing: even a very narrow actor/cover edge must be
  // struck before the projectile reaches its endpoint. Boss-fired shots move
  // <5px per tick; discard malformed, implausibly fast injected shots.
  const distance=Math.hypot(x-shot.x,y-shot.y);
  if(!Number.isFinite(distance)||distance>64)continue;
  const slices=Math.max(1,Math.ceil(distance));
  let impact=null;
  for(let i=1;i<=slices;i++){
   const px=shot.x+(x-shot.x)*i/slices,py=shot.y+(y-shot.y)*i/slices;
   if(solid(Math.floor(px/TILE_SIZE),Math.floor(py/TILE_SIZE))){
    impact={kind:'cover',x:px,y:py};break;
   }
   const target=players.find(p=>hitRect(px,py,shot.r,p));
   if(target){impact={kind:'player',target,x:px,y:py};break;}
  }
  if(impact?.kind==='cover'){
   emit(d,events,'devil-cover-damage',{x:round(impact.x),y:round(impact.y),radius:12,
    damage:1,projectileId:shot.id});
   continue;
  }
  if(impact?.kind==='player'){
   emit(d,events,'devil-hit-player',{playerId:impact.target.id,sourceId:shot.id,
    projectileId:shot.id,damage:1,x:round(impact.x),y:round(impact.y)});
   continue;
  }
  shot.x=round(x);shot.y=round(y);
  kept.push(shot);
 }
 d.projectiles=kept;
}
function stepDevil(d,events,players,solid,rand){
 d.tick++;
 d.invulnerability=Math.max(0,round(d.invulnerability-STEP));
 d.flash=Math.max(0,round(d.flash-STEP));
 if(d.mode==='dying'){
  d.deathTimer=Math.max(0,round(d.deathTimer-STEP));
  d.modeTimer=d.deathTimer;
  if(d.deathTimer===0){d.mode='dead';emit(d,events,'devil-death-complete');}
  return;
 }
 if(d.mode==='dead')return;
 moveShots(d,events,players,solid);
 if(d.mode==='intro'){
  if(!d.revealed){d.revealed=true;emit(d,events,'devil-reveal',{x:d.x,y:d.y});}
  d.modeTimer=Math.max(0,round(d.modeTimer-STEP));
  if(d.modeTimer===0)newTelegraph(d,players,events,rand);
  return;
 }
 if(d.mode==='windup'){
  d.modeTimer=Math.max(0,round(d.modeTimer-STEP));
  if(d.telegraph)d.telegraph.remaining=d.modeTimer;
  if(d.modeTimer===0){d.mode='attack';d.attackElapsed=0;d.telegraph=null;d.fired=0;}
  return;
 }
 if(d.mode==='attack'){
  d.attackElapsed=round(d.attackElapsed+STEP);
  if(d.attack==='fan'){
   const volleys=d.phase===1?2:3;
   while(d.fired<volleys&&d.attackElapsed+1e-7>=d.fired*.19){
    shootFan(d,events);d.fired++;
   }
  }else if(d.attack==='quake'&&d.fired===0&&d.attackElapsed>=.2){
   damageArea(d,events,players,d.aim.x,d.aim.y+12,35,d.attackSerial);d.fired=1;
  }else if(d.attack==='dive'){
   const t=clamp(d.attackElapsed/.62,0,1);
   d.x=round(d.originX+(d.aim.x-d.w/2-d.originX)*t);
   d.y=round(d.originY-44*Math.sin(Math.PI*t));
   d.vx=round((d.aim.x-d.w/2-d.originX)/.62);
   d.vy=round(-44*Math.PI*Math.cos(Math.PI*t)/.62);
   if(t>=1&&d.fired===0){
    damageArea(d,events,players,d.x+d.w/2,d.y+d.h*.85,39,d.attackSerial);d.fired=1;
   }
  }
  const duration=d.attack==='fan'?.58:d.attack==='quake'?.4:.68;
  if(d.attackElapsed>=duration){d.mode='recover';d.modeTimer=d.phase===3?.26:.43;
   d.x=d.originX;d.y=d.originY;d.vx=0;d.vy=0;}
  return;
 }
 if(d.mode==='recover'){
  d.modeTimer=Math.max(0,round(d.modeTimer-STEP));
  if(d.modeTimer===0)newTelegraph(d,players,events,rand);
 }
}
function advanceBroforceDevil(devil,{dt,players,isSolid,damageEvents=[],rand,active=true}={}){
 if(!devil||typeof devil!=='object')throw new TypeError('Devil state required');
 if(active===false||devil.mode==='dead'||!Number.isFinite(dt)||dt<=0)
  return {devil,events:[]};
 const seconds=clamp(dt,0,MAX_DT),live=livePlayers(players);
 if(live.length===0&&devil.mode!=='dying'){
  // No living targets: never shoot corpses, land a delayed area hit or keep
  // airborne bullets around to kill a newly revived player without warning.
  if(!devil.projectiles.length&&devil.mode!=='attack'&&devil.mode!=='windup')return {devil,events:[]};
  return {devil:{...devil,projectiles:[],mode:devil.mode==='attack'||devil.mode==='windup'?'recover':devil.mode,
   modeTimer:(devil.mode==='attack'||devil.mode==='windup')?.43:devil.modeTimer,
   attack:devil.mode==='attack'||devil.mode==='windup'?null:devil.attack,
   telegraph:null,vx:0,vy:0,x:devil.originX,y:devil.originY},events:[]};
 }
 const d={...devil,projectiles:devil.projectiles.map(p=>({...p})),hitIds:[...devil.hitIds],
  aim:devil.aim?{...devil.aim}:null,telegraph:devil.telegraph?{...devil.telegraph}:null};
 const events=[];
 if(Array.isArray(damageEvents)&&damageEvents.length)damageBoss(d,damageEvents,events);
 const accumulated=d.remainder+seconds;
 const ticks=Math.floor((accumulated+1e-9)/STEP);
 d.remainder=clamp(accumulated-ticks*STEP,0,STEP);
 for(let i=0;i<ticks;i++){
  stepDevil(d,events,live,isSolid,rand);
  if(d.mode==='dead')break;
 }
 return {devil:d,events};
}
Object.assign(exports,{createBroforceDevil,advanceBroforceDevil});
