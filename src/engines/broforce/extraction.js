// Broforce helicopter objective. Pure simulation data: no profiles, DOM, audio or rewards.
// Coordinates and distances use world pixels; dt and all phase clocks use seconds.
// players[0]/players[1] are the canonical Sean/Amber participants. A board request
// is an intent for the frame END, not a held control or a queued future action.
const EXTRACTION_TIMING=Object.freeze({incoming:2.4,boarding:9,departure:2.2,rotorHz:7});
const BOARD_RADIUS=44;
const PLAYER_OWNERS=Object.freeze(['Sean','Amber']);
const TAU=Math.PI*2;
const EPS=1e-9;
const clamp01=n=>Math.min(1,Math.max(0,n));
const smooth=n=>{const t=clamp01(n);return t*t*(3-2*t);};
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;

function createBroforceExtraction({x=0,y=0,seed=1}={}){
 if(!Number.isFinite(x)||!Number.isFinite(y))throw new RangeError('Helicopter coordinates must be finite');
 if(!Number.isFinite(seed))throw new RangeError('Helicopter seed must be finite');
 const rotorOffset=((Math.trunc(seed)>>>0)%997)/997;
 return {
  x,y,seed,rotorOffset,phase:'dormant',active:false,phaseTime:0,elapsed:0,
  timing:{...EXTRACTION_TIMING},zone:{x,y,radius:BOARD_RADIUS,open:false,secondsRemaining:EXTRACTION_TIMING.boarding},
  helicopter:{x:x+180,y:y-125,visible:false,rotorPhase:rotorOffset,rotorAngle:rotorOffset*TAU,rotorHz:EXTRACTION_TIMING.rotorHz,progress:0},
  boarded:[false,false],receipts:[null,null],outcome:null,reason:null,
  sequence:0,events:[]
 };
}

function livePlayer(player,index){
 if(!player||typeof player!=='object'||player.owner!==PLAYER_OWNERS[index])return false;
 // An unspecified life state is never proof of survival; explicit death wins
 // over an apparently positive HP or an older alive=true snapshot.
 if(player.alive===false||player.dead===true||player.dying===true||player.downed===true)return false;
 const status=typeof player.status==='string'?player.status.toLowerCase():'';
 const state=typeof player.state==='string'?player.state.toLowerCase():'';
 if(['dead','dying','downed','defeated','respawning'].includes(status)||
    ['dead','dying','downed','defeated','respawning'].includes(state))return false;
 if(('hp' in player)&&(!Number.isFinite(player.hp)||player.hp<=0))return false;
 if(('health' in player)&&(!Number.isFinite(player.health)||player.health<=0))return false;
 return player.alive===true||status==='alive'||state==='alive'||
  (Number.isFinite(player.hp)&&player.hp>0)||(Number.isFinite(player.health)&&player.health>0);
}
function inBoardingZone(player,zone){
 if(!Number.isFinite(player.x)||!Number.isFinite(player.y))return false;
 // A physics body reports top-left x/y, whereas a point actor reports a centre.
 const cx=player.x+(Number.isFinite(player.w)&&player.w>0?player.w/2:0);
 const cy=player.y+(Number.isFinite(player.h)&&player.h>0?player.h/2:0);
 return Math.hypot(cx-zone.x,cy-zone.y)<=zone.radius;
}
function requested(requests,player,index){
 if(!Array.isArray(requests))return false;
 // [true,false] and [false,true] are positional control-frame snapshots.
 if(requests.length<=2&&requests.every(v=>typeof v==='boolean'))return requests[index]===true;
 return requests.some(request=>{
  if(typeof request==='number')return Number.isInteger(request)&&request===index;
  if(typeof request==='string')return request===player.id||request===player.owner;
  if(!request||typeof request!=='object'||request.board===false||request.requested===false)return false;
  // Every provided selector must agree with this player; missing selectors do
  // not constitute a board request and cannot attach to both players.
  const keys=['playerIndex','index','playerId','id','owner'];
  const selected=keys.filter(key=>Object.prototype.hasOwnProperty.call(request,key));
  if(!selected.length)return false;
  return selected.every(key=>key==='owner'?request[key]===player.owner:
   key==='playerId'||key==='id'?request[key]===player.id:request[key]===index);
 });
}
function emit(next,type,details){
 next.sequence++;
 next.events.push({sequence:next.sequence,type,...details});
}
function cue(next,name){emit(next,'cue',{name});}
function changePhase(next,phase){next.phase=phase;next.phaseTime=0;}
// Seal owner-index evidence when boarding closes. No caller can rewrite an
// extraction result while it is departing, completed or failed.
function sealBoarding(next){
 next.boarded=Object.freeze([...next.boarded]);
 next.receipts=Object.freeze(next.receipts.map(receipt=>receipt?Object.freeze({...receipt}):null));
}
function terminal(next,outcome,reason){
 if(next.outcome!==null)return;
 next.outcome=outcome;next.reason=reason;
 changePhase(next,outcome==='extracted'?'completed':'failed');
 sealBoarding(next);
 if(outcome==='extracted')cue(next,'win');
 else if(reason!=='cancelled')cue(next,'lose');
 emit(next,'terminal',{outcome,reason,boarded:Object.freeze([...next.boarded]),
  receipts:Object.freeze(next.receipts.map(receipt=>receipt?Object.freeze({...receipt}):null))});
}
function beginDeparture(next){
 changePhase(next,'departure');
 sealBoarding(next);
 next.zone.open=false;
 next.zone.secondsRemaining=0;
 cue(next,'extraction');
}
function takeBoardRequests(next,players,boardRequests){
 if(next.phase!=='hover'||next.phaseTime>=EXTRACTION_TIMING.boarding)return;
 for(let index=0;index<2;index++){
  if(next.boarded[index])continue;
  const player=Array.isArray(players)?players[index]:null;
  if(!livePlayer(player,index)||!inBoardingZone(player,next.zone)||!requested(boardRequests,player,index))continue;
  const playerId=(typeof player.id==='string'&&player.id.length)||Number.isSafeInteger(player.id)
   ?player.id:'P'+(index+1);
  next.boarded[index]=true;
  next.receipts[index]={playerIndex:index,playerId,owner:player.owner,boardedAt:next.elapsed};
  emit(next,'boarded',{playerIndex:index,playerId,owner:player.owner});
 }
 if(next.boarded[0]&&next.boarded[1])beginDeparture(next);
}
function refreshVisual(next){
 const {phase,x,y,phaseTime,elapsed,rotorOffset}=next;
 const rotorPhase=((rotorOffset+elapsed*EXTRACTION_TIMING.rotorHz)%1+1)%1;
 let px=x,py=y-44,progress=1,visible=phase!=='dormant';
 if(phase==='dormant'){px=x+180;py=y-125;progress=0;}
 if(phase==='incoming'){
  progress=smooth(phaseTime/EXTRACTION_TIMING.incoming);
  px=x+180*(1-progress);py=y-44-81*(1-progress);
 }
 if(phase==='departure'||phase==='completed'){
  progress=phase==='completed'?1:smooth(phaseTime/EXTRACTION_TIMING.departure);
  px=x+180*progress;py=y-44-155*progress;
 }
 next.helicopter={x:px,y:py,visible,rotorPhase,rotorAngle:rotorPhase*TAU,
  rotorHz:EXTRACTION_TIMING.rotorHz,progress};
 next.zone.open=phase==='hover'&&phaseTime<EXTRACTION_TIMING.boarding;
 next.zone.secondsRemaining=phase==='hover'?
  Math.max(0,EXTRACTION_TIMING.boarding-phaseTime):
  phase==='dormant'||phase==='incoming'?EXTRACTION_TIMING.boarding:0;
}

function advanceBroforceExtraction(state,{dt=0,devilDefeated=false,players=[],boardRequests=[],paused=false,cancelled=false,aborted=false}={}){
 if(!state||!['dormant','incoming','hover','departure','completed','failed'].includes(state.phase))
  throw new TypeError('Expected a Broforce extraction state');
 const next={...state,zone:{...state.zone},helicopter:{...state.helicopter},
  boarded:[...state.boarded],receipts:state.receipts.map(receipt=>receipt?{...receipt}:null),events:[]};
 if(next.phase==='completed'||next.phase==='failed'){sealBoarding(next);return next;}
 // Cancellation is allowed even while manually paused; no delayed callback may
 // finish an already-aborted session. Any boarded receipts are NOT a win.
 if(cancelled||aborted){terminal(next,'failed','cancelled');refreshVisual(next);return next;}
 if(paused){if(next.phase==='departure')sealBoarding(next);return next;}
 if(next.phase==='dormant'){
  if(devilDefeated!==true)return next;
  next.active=true;
  changePhase(next,'incoming');
  cue(next,'helicopter');
 }
 let remaining=Number.isFinite(dt)&&dt>0?dt:0;
 // Consume full active delta across phase boundaries. A long/stalled frame
 // must not extend the boarding deadline or admit a late request.
 for(let guard=0;guard<5;guard++){
  if(next.phase==='incoming'){
   const step=Math.min(remaining,Math.max(0,EXTRACTION_TIMING.incoming-next.phaseTime));
   next.phaseTime+=step;next.elapsed+=step;remaining-=step;
   if(next.phaseTime>=EXTRACTION_TIMING.incoming-EPS){
    changePhase(next,'hover');cue(next,'helicopter');
    continue;
   }
   break;
  }
  if(next.phase==='hover'){
   const step=Math.min(remaining,Math.max(0,EXTRACTION_TIMING.boarding-next.phaseTime));
   next.phaseTime+=step;next.elapsed+=step;remaining-=step;
   // Input is sampled at the end of this update; the exact deadline is closed.
   if(next.phaseTime>=EXTRACTION_TIMING.boarding){
    if(next.boarded.some(Boolean))beginDeparture(next);
    else terminal(next,'failed','timeout');
    continue;
   }
   takeBoardRequests(next,players,boardRequests);
   if(next.phase==='departure')continue;
   break;
  }
  if(next.phase==='departure'){
   const step=Math.min(remaining,Math.max(0,EXTRACTION_TIMING.departure-next.phaseTime));
   next.phaseTime+=step;next.elapsed+=step;remaining-=step;
   if(next.phaseTime>=EXTRACTION_TIMING.departure-EPS){
    terminal(next,'extracted','departure');
   }
   break;
  }
  break;
 }
 refreshVisual(next);
 if(next.phase==='departure')sealBoarding(next);
 return next;
}
Object.assign(exports,{createBroforceExtraction,advanceBroforceExtraction});
