const {seededRandom, clamp}=require("src/utils.js");
const {cpuSkill,soloFinish,soloProgress}=require("src/solo.js");
// The two humans run relay legs against an actual driver each. Both sides use
// the same track, collision rules, steering speed, boost charge, and scoring.
function rivalCourse(seed) {
 const random=seededRandom(seed);
 return Array.from({length:110},(_,i)=>{
  const blocked=Math.floor(random()*3),coin=(blocked+1+Math.floor(random()*2))%3;
  return {id:i,distance:280+i*88,blocked,coin,pad:i%5===3?(blocked+1)%3:-1};
 });
}
function rivalActor() {return {distance:0,lane:1,target:1,coins:0,hits:0,boost:0,charge:1,stun:0,flash:0,decision:0,passed:new Set()};}
function rivalBoost(actor) {if(actor.charge<1||actor.stun>0)return false;actor.charge=0;actor.boost=1.05;return true;}
function rivalScore(actor) {return Math.floor(actor.distance/24)+actor.coins*12;}
function rivalStep(actor,dt,course) {
 actor.charge=Math.min(1,actor.charge+dt/4);actor.boost=Math.max(0,actor.boost-dt);actor.stun=Math.max(0,actor.stun-dt);actor.flash=Math.max(0,actor.flash-dt);
 actor.lane+=clamp(actor.target-actor.lane,-dt*6,dt*6);
 actor.distance+=(actor.stun>0?76:actor.boost>0?306:190)*dt;
 for(const row of course){
  if(row.distance>actor.distance||actor.passed.has(row.id))continue;
  actor.passed.add(row.id);const lane=Math.round(actor.lane);
  if(Math.abs(actor.lane-lane)>.43)continue;
  if(lane===row.blocked){actor.hits++;actor.stun=.72;actor.flash=.5;actor.boost=0;}
  if(lane===row.coin)actor.coins++;
  if(lane===row.pad)actor.boost=Math.max(actor.boost,.7);
 }
 return rivalScore(actor);
}
// goof (solo only): chance per row that the rival commits to a wrong lane for it (it may even hit the block).
function rivalThink(actor,dt,course,random,goof=0) {
 actor.decision-=dt;if(actor.decision>0)return;
 actor.decision=.16;
 const next=course.find(row=>!actor.passed.has(row.id)&&row.distance>actor.distance);
 if(!next)return;
 if(next.distance-actor.distance<285){
  let desired=next.coin;
  if(goof>0){if(actor.plan?.id!==next.id)actor.plan={id:next.id,lane:random()<goof?(next.coin+1+Math.floor(random()*2))%3:next.coin};desired=actor.plan.lane;}
  // A rare, seeded reaction error makes a hard opponent beatable; it never
  // changes its speed or awards itself points outside the normal simulation.
  if(random()>.025)actor.target=desired;
 }
 if(actor.charge>=1&&next.distance-actor.distance>75&&Math.round(actor.lane)!==next.blocked)rivalBoost(actor);
}
function rivalTeamResult(humans,cpus) {
 const humanTotal=humans.reduce((a,b)=>a+b,0),cpuTotal=cpus.reduce((a,b)=>a+b,0);
 return {cpuScores:[...cpus],humanTotal,cpuTotal,won:humanTotal>cpuTotal,tied:humanTotal===cpuTotal};
}

async function coopRivals(s) {
 const [canvas,x,W,H]=s.canvas(680,410),scores=[0,0],cpus=[0,0];
 // leg = whose turn (sprite), bro = 0 Mario / 1 Luigi, goof = the rival's per-row mistake chance (solo only)
 let course=rivalCourse(s.seed),leg=0,bro=0,goof=0,human=rivalActor(),cpu=rivalActor(),left=30,roundDone=false,ready=false,pointerLane=null,legLabel='';
 let aiRandom=seededRandom(s.seed+'-rival-0');
 s.cooperative=true;s.updateScores();
 const steer=delta=>{if(ready&&!roundDone)human.target=clamp(human.target+delta,0,2);};
 const boost=()=>{if(ready&&!roundDone)rivalBoost(human);};
 s.controls([]);
 s.on(document,'keydown',ev=>{if(s.paused||!s.alive)return;if(ev.key==='ArrowLeft'||ev.key==='a'){ev.preventDefault();if(!ev.repeat)steer(-1);}if(ev.key==='ArrowRight'||ev.key==='d'){ev.preventDefault();if(!ev.repeat)steer(1);}if(ev.key===' '||ev.key==='ArrowUp'){ev.preventDefault();boost();}});
 const pointer=ev=>{if(!ready||s.paused||!s.alive)return;const p=s.pointer(ev);if(p.x>W/2)return;human.target=clamp(Math.floor((p.x-28)/94),0,2);};
 s.on(canvas,'pointerdown',ev=>{if(s.paused||!s.alive)return;if(s.pointer(ev).x>W/2){boost();return;}pointerLane=ev.pointerId;s.capture(ev);pointer(ev);});
 s.on(canvas,'pointermove',ev=>{if(pointerLane===ev.pointerId)pointer(ev);});
 for(const event of ['pointerup','pointercancel'])s.on(canvas,event,ev=>{if(pointerLane===ev.pointerId)pointerLane=null;s.release(ev);});
 s.on(window,'blur',()=>{pointerLane=null;});
 s.hint('Both humans are one team. Touch or drag on your road (left side) to steer between lanes; tap the right side to boost. Keys: arrows steer, Space boosts. Collect coins, avoid blocks and use a charged boost. collect coins, avoid blocks, and use a charged boost. Beat the brothers’ combined actual scores.');
 const drawDriver=(actor,offset,isHuman)=>{
  const center=offset+32+actor.lane*94+47,y=H-66;
  x.fillStyle=isHuman?'#397be7':bro?'#3da35b':'#dc5552';
  x.fillRect(center-24,y-5,48,35);x.fillStyle='#172033';x.fillRect(center-31,y+4,8,21);x.fillRect(center+23,y+4,8,21);
  if(isHuman)s.sprite(x,leg,center,y-13,41);
  else{x.fillStyle='#ffe2bf';x.beginPath();x.arc(center,y-19,16,0,Math.PI*2);x.fill();x.fillStyle=bro?'#3da35b':'#dc5552';x.fillRect(center-19,y-37,38,11);x.fillStyle='#29201c';x.fillRect(center-11,y-15,22,5);x.fillStyle='white';x.font='bold 12px Arial';x.textAlign='center';x.fillText(bro?'L':'M',center,y+19);}
  if(actor.boost>0){x.fillStyle='#ffc963';x.beginPath();x.moveTo(center-12,y+32);x.lineTo(center,y+58+Math.sin(actor.distance)*7);x.lineTo(center+12,y+32);x.fill();}
  if(actor.flash>0){x.strokeStyle='#ff504a';x.lineWidth=4;x.strokeRect(center-32,y-42,64,79);}
 };
 const drawRoad=(actor,offset,label,isHuman)=>{
  x.fillStyle='#20263d';x.fillRect(offset+28,36,286,H-36);
  x.strokeStyle='#ffffff77';x.lineWidth=2;
  for(let lane=1;lane<3;lane++){const column=offset+28+lane*94;for(let y=36+(actor.distance*.7)%56;y<H;y+=56){x.beginPath();x.moveTo(column,y);x.lineTo(column,y+27);x.stroke();}}
  for(let i=0;i<14;i++){x.fillStyle=['#ee6ea8','#efa866','#f7df65','#79cb83','#7ba3ee','#bd7dde'][i%6];const y=H-i*36+(actor.distance*.65)%36;x.fillRect(offset+16,y,10,29);x.fillRect(offset+316,y,10,29);}
  for(const row of course){const y=H-66-(row.distance-actor.distance)*.75;if(y<48||y>H+35)continue;
   x.fillStyle='#e27e58';x.fillRect(offset+41+row.blocked*94,y-20,66,40);x.fillStyle='#ffe2a8';x.font='bold 23px Arial';x.textAlign='center';x.fillText('!',offset+74+row.blocked*94,y+8);
   x.fillStyle='#f8d256';x.beginPath();x.arc(offset+74+row.coin*94,y,13,0,Math.PI*2);x.fill();x.fillStyle='#a87323';x.fillRect(offset+72+row.coin*94,y-7,4,14);
   if(row.pad>=0){x.fillStyle='#64d9c6';x.fillRect(offset+44+row.pad*94,y+25,60,10);}
  }
  drawDriver(actor,offset,isHuman);x.fillStyle='#fff';x.font='bold 16px Arial';x.textAlign='center';x.fillText(label,offset+170,24);
  x.font='13px Arial';x.fillText(`${rivalScore(actor)} · ${actor.coins} coins · ${actor.hits} hits`,offset+170,52);
 };
 // One 30-second leg; resolves [human score, rival score] (null if the game was left on the hand-off card).
 const runLeg=async(player,brother,seedTag,text,passOpts)=>{
  leg=player;bro=brother;ready=false;roundDone=false;left=30;human=rivalActor();cpu=rivalActor();aiRandom=seededRandom(s.seed+seedTag);pointerLane=null;
  s.debug={course,human,cpu,scores,cpus,steer,boost};
  if(!await s.pass(player,text,undefined,passOpts))return null;
  ready=true;
  return new Promise(resolve=>s.timer(30,remaining=>left=remaining,()=>{if(roundDone||!s.alive)return;roundDone=true;ready=false;resolve([rivalScore(human),rivalScore(cpu)]);}));
 };
 let soloTotal=0,soloLeg=0;
 s.frame(dt=>{
  if(!ready||roundDone)return;
  rivalThink(cpu,dt,course,aiRandom,goof);rivalStep(human,dt,course);rivalStep(cpu,dt,course);
  const brother=bro?'LUIGI':'MARIO';
  x.fillStyle='#242c46';x.fillRect(0,0,W,H);drawRoad(human,0,s.players[leg].name,true);
  if(s.solo){s.setScores([soloTotal+rivalScore(human),rivalScore(cpu)]);drawRoad(cpu,W/2,`${brother} · LEG ${soloLeg+1}`,false);
   s.status(`${Math.ceil(left)}s · Boost ${Math.round(human.charge*100)}% · LEG ${soloLeg+1}: YOU ${rivalScore(human)} — ${brother} ${rivalScore(cpu)}`);return;}
  scores[leg]=rivalScore(human);cpus[leg]=rivalScore(cpu);s.setScores(scores);drawRoad(cpu,W/2,`${brother} · HARD CPU`,false);
  s.status(`${Math.ceil(left)}s · Boost ${Math.round(human.charge*100)}% · TEAM ${scores[0]+scores[1]} — BROTHERS ${cpus[0]+cpus[1]}`);
 });
 if(s.solo){
  // 1P: leg after leg on a fresh stretch of road against Mario, then Luigi, then Mario…; outscore the rival to move on.
  // He fumbles a row now and then (fewer on Hard) and gets sharper every leg.
  for(;;soloLeg++){
   const name=soloLeg%2?'Luigi':'Mario';course=rivalCourse(s.seed+'-solo-'+soloLeg);goof=Math.max(.02,(.3-.2*cpuSkill(s))*Math.pow(.82,soloLeg));
   const r=await runLeg(0,soloLeg%2,'-rival-solo-'+soloLeg,`Leg ${soloLeg+1}: race ${name} for 30 seconds. Steer on the left road, tap the right side to boost. Outscore him to win the leg; he gets sharper every leg.`,{soloTitle:`Leg ${soloLeg+1}`,summary:soloLeg?`${soloTotal.toLocaleString()} points so far.`:null});
   if(!r||!s.alive)return;
   if(r[0]<=r[1])return soloFinish(s,soloTotal+r[0],soloLeg,`Rainbow Rivals solo: ${soloLeg} leg${soloLeg===1?'':'s'} won; ${name} took leg ${soloLeg+1}, ${r[1]} to ${r[0]}.`);
   soloTotal+=r[0];soloProgress(s,soloTotal,soloLeg+1,`Rainbow Rivals solo: ${soloLeg+1} leg${soloLeg?'s':''} won, ${soloTotal} points.`);
  }
 }
 for(const player of [0,1]){
  const r=await runLeg(player,player,'-rival-'+player,`${s.players[player].name} races ${player?'Luigi':'Mario'} for 30 seconds. Your partner’s leg adds to your team score. The rival steers and boosts under the same rules.`);
  if(!r||!s.alive)return;scores[player]=r[0];cpus[player]=r[1];s.setScores(scores);
 }
 s.teamResult=rivalTeamResult(scores,cpus);s.finish(scores,`Relay team ${s.teamResult.humanTotal} · Mario + Luigi ${s.teamResult.cpuTotal}. ${s.teamResult.tied?'A photo-finish tie.':s.teamResult.won?'YOU BEAT THE BROTHERS!':'The brothers win this race.'}`);
}

Object.assign(exports,{rivalCourse,rivalActor,rivalBoost,rivalScore,rivalStep,rivalThink,rivalTeamResult,coopRivals});