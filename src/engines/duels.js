const {clamp}=require("src/utils.js");
const {store}=require("src/state.js");
const {circle, COLORS}=require("src/engines/session.js");
const {sound, vibrate,pickupSound,tone}=require("src/audio.js");
const {duelInputs, ownedPointers}=require("src/engines/duelControls.js");
const {directionGestures, gestureGrid, drawDirectionFeedback}=require("src/engines/directionGestures.js");
const {arenaGestures,gestureHint}=require("src/engines/arenaGestures.js");
const {makePacArena, pacNeighbor, pacNext}=require("src/engines/mobile.js");
const {airshootout:playShootout, shootoutStep:stepShootout}=require("src/engines/hockeyShootout.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");
const airshootout=playShootout;
const shootoutStep=stepShootout;

function tankArena(W=680,H=400) {
 const covers=[{x:W*.27-16,y:76,w:32,h:78},{x:W*.73-16,y:76,w:32,h:78},{x:W*.27-16,y:H-154,w:32,h:78},{x:W*.73-16,y:H-154,w:32,h:78},{x:W/2-30,y:45,w:60,h:38},{x:W/2-30,y:H-83,w:60,h:38}];
 const spawns=[{x:76,y:H/2},{x:W-76,y:H/2}];
 return {W,H,covers,spawns,tanks:spawns.map((p,i)=>({...p,hp:3,cooldown:0,invuln:1.2,angle:i?Math.PI:0})),bullets:[],scores:[0,0],explosions:[],targets:[null,null]};
}
function circleRectHit(p,r,b) { return Math.hypot(p.x-clamp(p.x,b.x,b.x+b.w),p.y-clamp(p.y,b.y,b.y+b.h))<r; }
function tankStep(a,dt,inputs) {
 const events=[],r=21;
 for(let i=0;i<2;i++){
  const p=a.tanks[i],op=a.tanks[1-i],k=inputs[i];p.cooldown=Math.max(0,p.cooldown-dt);p.invuln=Math.max(0,p.invuln-dt);
  let dx=(k.r?1:0)-(k.l?1:0),dy=(k.d?1:0)-(k.u?1:0),distance=Math.hypot(dx,dy);const digital=distance>0;
  if(!distance&&a.targets[i]){dx=a.targets[i].x-p.x;dy=a.targets[i].y-p.y;distance=Math.hypot(dx,dy);}
  if(distance){const step=digital?166*dt:Math.min(distance,166*dt);dx=dx/distance*step;dy=dy/distance*step;
   const free=pt=>!a.covers.some(b=>circleRectHit(pt,r,b))&&Math.hypot(pt.x-op.x,pt.y-op.y)>=r*2;
   const px={x:clamp(p.x+dx,28,a.W-28),y:p.y};if(free(px))p.x=px.x;
   const py={x:p.x,y:clamp(p.y+dy,28,a.H-28)};if(free(py))p.y=py.y;
  }
  p.angle=Math.atan2(op.y-p.y,op.x-p.x);
  if(k.fire&&p.cooldown===0){p.cooldown=.52;a.bullets.push({x:p.x+Math.cos(p.angle)*29,y:p.y+Math.sin(p.angle)*29,vx:Math.cos(p.angle)*350,vy:Math.sin(p.angle)*350,owner:i,life:2.5});events.push({type:'fire',owner:i});}
 }
 const steps=Math.ceil(dt*240),h=dt/steps;
 for(let step=0;step<steps;step++)for(const b of a.bullets){if(b.dead)continue;b.x+=b.vx*h;b.y+=b.vy*h;b.life-=h;
  if(b.life<=0||b.x<5||b.x>a.W-5||b.y<5||b.y>a.H-5||a.covers.some(w=>circleRectHit(b,5,w))){b.dead=true;continue;}
  const victim=1-b.owner,p=a.tanks[victim];
  if(Math.hypot(b.x-p.x,b.y-p.y)<r+5){b.dead=true;if(p.invuln>0)continue;p.hp--;events.push({type:'hit',owner:b.owner,victim});
   if(p.hp<=0){a.scores[b.owner]++;a.explosions.push({x:p.x,y:p.y,left:.7});Object.assign(p,a.spawns[victim],{hp:3,invuln:1.4});a.targets[victim]=null;events.push({type:'knockout',owner:b.owner,victim});}
  }
 }
 a.bullets=a.bullets.filter(b=>!b.dead);a.explosions.forEach(e=>e.left-=dt);a.explosions=a.explosions.filter(e=>e.left>0);
 return events;
}

async function tank(s) {
 const [c,x]=s.canvas(680,400,{fill:true}),a=tankArena();let W=680,H=400;s.shared=true;s.updateScores();
 const pulses=[false,false],controls=arenaGestures(s,{onTap:i=>pulses[i]=true}),keys=[{},{}],fingers=controls.fingers;s.resetOnPause?.(()=>pulses.fill(false));
 s.hint('P1 starts a finger on the left, P2 on the right. Drag from the first touch to drive; hold your finger down to auto-fire toward the opponent, or tap for one shot. P1 WASD + Space; P2 arrows + Enter. Cover blocks shells. Three hits destroy a tank; three knockouts or most in 60s.');
 if(!await s.pass(0,'Both players command a tank. Move into a firing lane, dodge shells, and use the mirrored cover. Respawning tanks get a short shield.','Both ready — battle!'))return;
 let left=60,time=0;
 s.frame(dt=>{left-=dt;time+=dt;
  if(W!==s.W||H!==s.H){const sx=s.W/W,sy=s.H/H;for(const p of [...a.tanks,...a.spawns,...a.bullets,...a.explosions]){p.x*=sx;p.y*=sy;if(p.vx!==undefined){p.vx*=sx;p.vy*=sy;}}for(const b of a.covers){b.x*=sx;b.y*=sy;b.w*=sx;b.h*=sy;}W=a.W=s.W;H=a.H=s.H;}
  for(let i=0;i<2;i++){const input=controls.input[i];Object.assign(keys[i],{l:input.x<0,r:input.x>0,u:input.y<0,d:input.y>0,fire:input.fire||pulses[i]||[...fingers.values()].some(f=>f.owner===i)});}
  for(const e of tankStep(a,dt,keys)){if(e.type==='fire')sound('shot');else{sound(e.type==='knockout'?'win':'lose');s.react?.(e.owner,e.type==='knockout'?'win':'happy');s.react?.(e.victim,'sad');vibrate(12);}}pulses.fill(false);
  x.fillStyle='#273b35';x.fillRect(0,0,W,H);x.strokeStyle='#57786655';x.lineWidth=1;for(let i=20;i<W;i+=40){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke();}
  for(const b of a.covers){x.fillStyle='#131d27';x.fillRect(b.x+4,b.y+5,b.w,b.h);x.fillStyle='#8e9e96';x.fillRect(b.x,b.y,b.w,b.h);x.strokeStyle='#c1ccc3';x.strokeRect(b.x+3,b.y+3,b.w-6,b.h-6);}
  for(const b of a.bullets){circle(x,b.x-b.vx*.012,b.y-b.vy*.012,3,'#f8b95466');circle(x,b.x,b.y,5,b.owner?'#ff9dbf':'#89c8ff');}
  for(const e of a.explosions){circle(x,e.x,e.y,(.7-e.left)*80+9,`rgba(255,166,65,${e.left})`);}
  for(let i=0;i<2;i++){const p=a.tanks[i];x.save();x.translate(p.x,p.y);x.rotate(p.angle);x.fillStyle='#0b1824';x.fillRect(-24,-25,48,10);x.fillRect(-24,15,48,10);x.fillStyle=COLORS[i];x.fillRect(-22,-17,44,34);x.fillStyle='#dce8df';x.fillRect(10,-5,31,10);x.restore();s.sprite(x,i,p.x,p.y,39);
   if(p.invuln>0){x.strokeStyle='#daefffaa';x.lineWidth=2;x.beginPath();x.arc(p.x,p.y,31+Math.sin(time*10)*2,0,Math.PI*2);x.stroke();}
   for(let j=0;j<3;j++){x.fillStyle=j<p.hp?'#84efa4':'#162324';x.fillRect(p.x-21+j*15,p.y+30,12,5);}
  }
  gestureHint(x,s,controls);s.setScores(a.scores);s.status(`${Math.ceil(Math.max(0,left))}s · ${s.players[0].name} ${a.scores[0]} – ${a.scores[1]} ${s.players[1].name} · 3 hits per tank`);s.debug={engine:'tank',state:a,keys,fingers,controls,left,tankStep};
  if(left<=0||a.scores.some(n=>n>=3))s.finish(a.scores,'Two-player tank battle');
 });
}

// Reflect the original looping maze across both axes. The resulting corridors
// are connected, have a tunnel, and give the two humans equal starting routes.
function makeDuelMaze(seed) {
 const base=makePacArena(seed),{N,M}=base,walls=new Set(base.walls);
 const reflect=k=>[k,Math.floor(k/N)*N+N-1-k%N,(M-1-Math.floor(k/N))*N+k%N,(M-1-Math.floor(k/N))*N+N-1-k%N];
 for(const k of base.pellets)for(const n of reflect(k))walls.delete(n);
 for(const n of reflect(base.hero))walls.delete(n);
 const homes=[N+1,2*N-2,(M-2)*N+1,(M-1)*N-2],spawns=[(M-2)*N+Math.floor(N/2),N+Math.floor(N/2)];
 for(const k of [...homes,...spawns])walls.delete(k);
 const pellets=new Set(Array.from({length:N*M},(_,k)=>k).filter(k=>!walls.has(k)&&!spawns.includes(k)));
 return {N,M,walls,homes,spawns,pellets,power:new Set(homes)};
}

// ---- classic ghost brains (ROADMAP D6), the same on both phones online: a ghost never turns round by itself; at each step it
// takes the open way (no U-turn) whose next cell is nearest its target in a straight line (ties: up, left, down, right), as in
// the arcade. Waves: 7 s scatter (each ghost to its own corner) then 20 s chase; every wave change turns them all round.
// Chase targets: Blinky (0) you, Pinky (1) four cells ahead of you, Inky (2) the point mirrored through two ahead of you from
// Blinky, Clyde (3) you when far, his corner when within 8. A ghost near a powered chomper is frightened: it turns round,
// runs from that chomper at half speed (moves every other step) and can be eaten by it. Players: [{pos,dir,lives,pow}].
const GHOST_STEP=.16; // ghosts move at 75% of a chomper's .12 s per cell, like the arcade (it used to be .24 = 50%)
const pacXY=(arena,k)=>[k%arena.N,Math.floor(k/arena.N)];
function ghostCorner(arena,i){return [[arena.N-2,-3],[1,-3],[arena.N-1,arena.M+2],[0,arena.M+2]][i];}
function ghostPick(arena,g,tx,ty){const N=arena.N;let best=null,bd=1e18;
 for(const d of [[0,-1],[-1,0],[0,1],[1,0]]){if(g.dir&&d[0]===-g.dir[0]&&d[1]===-g.dir[1])continue;const n=pacNeighbor(arena,g.pos,...d);if(n===null)continue;const dd=(n%N-tx)**2+(Math.floor(n/N)-ty)**2;if(dd<bd){bd=dd;best=[n,d];}}
 if(!best&&g.dir){const d=[-g.dir[0],-g.dir[1]],n=pacNeighbor(arena,g.pos,...d);if(n!==null)best=[n,d];}
 if(best){g.pos=best[0];g.dir=best[1];}}
// arcade-style sounds: waka-waka pellets, a rising power chime, the ghost-eaten whoop, the falling death warble
let pacW=0;const pacSfx=k=>{if(!store.profile?.settings?.sound)return;
 if(k==='waka'){pacW^=1;tone(pacW?220:330,.07,.03,'triangle');tone(pacW?440:300,.05,.012,'square');}
 else if(k==='power')[392,523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,.09,.03,'square'),i*55));
 else if(k==='ghost')[300,500,800,1200].forEach((f,i)=>setTimeout(()=>tone(f,.06,.03,'sawtooth'),i*40));
 else if(k==='death')[660,620,560,500,440,380,320,260].forEach((f,i)=>setTimeout(()=>tone(f,.1,.03,'triangle'),i*70));};
function ghostEyes(x,cx,cy,r,dir){for(const sd of [-1,1]){const ex=cx+sd*r*.38,ey=cy-r*.2;x.fillStyle='#fff';x.beginPath();x.ellipse(ex,ey,r*.26,r*.32,0,0,Math.PI*2);x.fill();x.fillStyle='#2121de';x.beginPath();x.arc(ex+dir[0]*r*.13,ey+dir[1]*r*.15,r*.14,0,Math.PI*2);x.fill();}}
function ghostsStep(arena,ghosts,players,j){const tm=j*GHOST_STEP,chase=tm%27>=7,live=players.filter(p=>p.lives>0);
 for(const g of ghosts){if(g.returning>0||g.out)continue;
  const [gx,gy]=pacXY(arena,g.pos),man=p=>{const [px,py]=pacXY(arena,p.pos);return Math.abs(px-gx)+Math.abs(py-gy);};
  const scarer=live.filter(p=>p.pow&&man(p)<7).sort((u,v)=>man(u)-man(v))[0],scared=!!scarer,turn=g.chase!==undefined&&g.chase!==chase||scared&&!g.scared;
  g.chase=chase;g.scared=scared;if(turn&&g.dir)g.dir=[-g.dir[0],-g.dir[1]];
  if(scared&&j%2&&!turn)continue;
  let t=ghostCorner(arena,g.index);
  if(scared){const [px,py]=pacXY(arena,scarer.pos);t=[gx+(gx-px)*4,gy+(gy-py)*4];}
  else{const vul=live.filter(p=>!p.pow).sort((u,v)=>man(u)-man(v));const p=vul[0];
   if(chase&&p){const [px,py]=pacXY(arena,p.pos),[dx,dy]=p.dir||[0,0];
    if(g.index===0)t=[px,py];else if(g.index===1)t=[px+4*dx,py+4*dy];
    else if(g.index===2){const [bx,by]=pacXY(arena,ghosts[0].pos);t=[2*(px+2*dx)-bx,2*(py+2*dy)-by];}
    else if(Math.hypot(px-gx,py-gy)>8)t=[px,py];}}
  ghostPick(arena,g,t[0],t[1]);}}
function pacDuelState(seed) {
 const arena=makeDuelMaze(seed);
 return {arena,actors:arena.spawns.map((pos,i)=>({pos,prev:pos,dir:[0,i?1:-1],next:[0,i?1:-1],powered:0,combo:0,lives:3,invuln:1.8})),ghosts:arena.homes.map((pos,i)=>({pos,prev:pos,home:pos,index:i,returning:0,dir:[0,-1]})),gsteps:0,pellets:new Set(arena.pellets),power:new Set(arena.power),scores:[0,0],clock:0,ghostClock:0,time:0,steps:0,clear:false};
}
function pacDuelStep(a,dt) {
 const {arena}=a,events=[];a.time+=dt;a.clock+=dt;a.ghostClock+=dt;
 a.actors.forEach(p=>{p.powered=Math.max(0,p.powered-dt);p.invuln=Math.max(0,p.invuln-dt);});a.ghosts.forEach(g=>g.returning=Math.max(0,g.returning-dt));
 let moved=false;
 if(a.clock>=.12){a.clock-=.12;moved=true;a.steps++;
  // Rotate update order so simultaneous claims do not always favour player 1.
  for(const i of a.steps%2?[0,1]:[1,0]){const p=a.actors[i];if(!p.lives)continue;p.prev=p.pos;
   if(pacNeighbor(arena,p.pos,...p.next)!==null)p.dir=[...p.next];const n=pacNeighbor(arena,p.pos,...p.dir);if(n!==null)p.pos=n;
   if(a.pellets.delete(p.pos)){a.scores[i]+=5;if(a.power.delete(p.pos)){p.powered=7;p.combo=0;events.push({type:'power',owner:i});}else events.push({type:'pickup',owner:i});}
  }
 }
 let ghostsMoved=false;
 if(a.ghostClock>=GHOST_STEP){a.ghostClock-=GHOST_STEP;ghostsMoved=true;a.gsteps++;for(const g of a.ghosts)g.prev=g.pos;
  ghostsStep(arena,a.ghosts,a.actors.map(p=>({pos:p.pos,dir:p.dir,lives:p.lives,pow:p.powered>0})),a.gsteps);
 }
 for(let i=0;i<2;i++){const p=a.actors[i];if(!p.lives)continue;
  for(const g of a.ghosts){const crossed=moved&&ghostsMoved&&g.prev===p.pos&&g.pos===p.prev;
   if(g.returning>0||g.pos!==p.pos&&!crossed)continue;
   if(p.powered>0){p.combo++;a.scores[i]+=50*2**Math.min(3,p.combo-1);g.eyes={from:g.pos,t:0};g.pos=g.prev=g.home;g.dir=[0,-1];g.returning=2;events.push({type:'ghost',owner:i});}
   else if(p.invuln===0){p.lives--;p.pos=p.prev=arena.spawns[i];p.invuln=2;p.dir=[0,i?1:-1];p.next=[...p.dir];events.push({type:'hurt',owner:i});break;}
  }
 }
 if(!a.pellets.size&&!a.clear){a.clear=true;for(let i=0;i<2;i++)if(a.actors[i].lives)a.scores[i]+=100;events.push({type:'clear'});}
 return events;
}

// Online (netField): the same seeded maze on both phones, turned round on player 2's phone so you start at the bottom. Each
// phone moves its own chomper (steps every .12 s on the shared clock) and streams {e:{t:[tick,cell,dir,lives,powered,ate]}}.
// The ghosts run the same deterministic steps on both phones, steering by where each player was DLY steps earlier, so
// both phones see the same ghosts; a step waits if the other phone's report for that moment hasn't come in. Each phone
// judges only ghosts touching its own chomper; an eaten ghost {ge:[ghost,step,points]} goes home at a step far enough ahead
// that the other phone knows in time. A pellet both phones ate goes to the earlier tick (odd ties to player 1, like the
// local game). The end waits for both finals {fin:{g,l}}: pellets ×5 from the shared record, ghost points, clear bonus.
const PAC_TICK=.12,PAC_GHOST=GHOST_STEP,PAC_DLY=3;
// ghost step j happens at j*PAC_GHOST: tickAt(j) = the chomper tick just at or before it; beat(j) = both move at that moment
const tickAt=j=>Math.floor(j*PAC_GHOST/PAC_TICK+1e-6),beat=j=>Math.abs(tickAt(j)*PAC_TICK-j*PAC_GHOST)<1e-6,stepAfter=n=>Math.ceil(n*PAC_TICK/PAC_GHOST-1e-6);
async function pacmaze(s) {
 const [,x]=s.canvas(620,480,{fill:true}),a=pacDuelState(s.seed),{arena}=a;
 const on=s.online||null,me=on?on.me:0,them=1-me,F=me===1,HUDY=on?40:0;
 s.shared=true;s.updateScores();const controls=directionGestures(s,(i,dx,dy)=>{a.actors[i].next=on&&F?[-dx,-dy]:[dx,dy];},{players:2}),{keys,fingers}=controls;
 s.resetOnPause?.(()=>{for(const p of a.actors)p.next=[...p.dir];});
 s.debug={engine:'pacmaze',state:a,arena,actors:a.actors,keys,fingers,controls,left:60,pacDuelStep};
 s.hint(on?'Swipe or keep dragging to turn; directions follow the screen. Arrows / WASD work too. Power pellets protect only the player who ate them. Most points in 60s wins.':'Shared maze, separate lives and power-ups. P1 starts a finger on the left; P2 on the right. Swipe or keep dragging to turn; directions follow the screen. P1 WASD; P2 arrows. Most points in 60s wins.');
 // ---- online state
 const N=arena.N,DIRS=[[1,0],[-1,0],[0,1],[0,-1]],dirIx=d=>DIRS.findIndex(q=>q[0]===d[0]&&q[1]===d[1]);
 const glog=[],hist=[[],[]],eaten=new Map(),ghostEats=new Map(),pend=new Set(),ghostPts=[0,0];let myTick=0,theirTick=0,gStep=0,playT0=0,phase='wait',netBot=false,fin=null,theirDone=false;
 a.actors.forEach((p,i)=>{hist[i][0]={pos:p.pos,dir:[...p.dir],lives:p.lives,pow:0};});
 const rt=()=>(performance.now()-playT0)/1000,tieFirst=n=>n%2?0:1;
 function claim(k,i,n){const c=eaten.get(k);if(!c||n<c.n||n===c.n&&tieFirst(n)===i)eaten.set(k,{i,n});a.pellets.delete(k);a.power.delete(k);}
 const nf=on?netField(s,{pack:()=>0,unpack:()=>{},onEvent:e=>{
  if(Array.isArray(e.t)){const [n,pos,d,lives,pow,ate]=e.t;if(!Number.isInteger(n)||!Number.isInteger(pos))return;const p=a.actors[them];
   hist[them][n]={pos,dir:DIRS[d]||p.dir,lives,pow};theirTick=Math.max(theirTick,n);p.prev=p.pos;p.pos=pos;p.dir=DIRS[d]||p.dir;if(lives<p.lives){s.react?.(them,'sad');sound('lose');}p.lives=lives;p.powered=pow?1:0;p.seen=performance.now();
   if(Number.isInteger(ate)&&ate>=0)claim(ate,them,n);}
  else if(Array.isArray(e.ge)){const [g,j,pts]=e.ge;if(!a.ghosts[g]||!Number.isInteger(j))return;
   // (too late for its step here: send it home now)
   if(j<=gStep){const q=a.ghosts[g];q.pos=q.prev=q.home;q.until=gStep*PAC_GHOST+2;}else{(ghostEats.get(j)||ghostEats.set(j,[]).get(j)).push(g);pend.add(g);}ghostPts[them]+=+pts||0;sound('win');}}}):null;
 // the deterministic ghost step j: players as they were at tick 2j-DLY, eaten ghosts sent home
 const at=(i,n)=>{const h=hist[i];for(let k=Math.max(0,n);k>=0;k--)if(h[k])return h[k];return h[0];};
 function ghostStep(j){const tm=j*PAC_GHOST,d=tickAt(j)-PAC_DLY;
  for(const g of ghostEats.get(j)||[]){const q=a.ghosts[g];q.eyes={from:q.pos,t:0};q.pos=q.prev=q.home;q.dir=[0,-1];q.until=tm+2;pend.delete(g);}ghostEats.delete(j);
  for(const g of a.ghosts){g.prev=g.pos;g.returning=(g.until||0)>tm?1:0;}
  ghostsStep(arena,a.ghosts,[0,1].map(i=>{const h=at(i,d);return {pos:h.pos,dir:h.dir,lives:h.lives,pow:!!h.pow};}),j);}
 // this phone's chomper meets the ghosts (crossed = swapped cells on the same beat)
 function meet(crossedAt){const p=a.actors[me];if(!p.lives||phase!=='play')return;
  for(const g of a.ghosts){if(g.returning||pend.has(g.index))continue;const crossed=crossedAt&&g.prev===crossedAt.pos&&g.pos===crossedAt.prev;if(g.pos!==p.pos&&!crossed)continue;
   if(p.powered>0){p.combo++;const pts=50*2**Math.min(3,p.combo-1),j=Math.max(stepAfter(myTick+4),gStep+1);ghostPts[me]+=pts;pend.add(g.index);(ghostEats.get(j)||ghostEats.set(j,[]).get(j)).push(g.index);nf.event({ge:[g.index,j,pts]});pacSfx('ghost');s.react?.(me,'win');}
   else if(p.invuln===0){p.lives--;p.pos=p.prev=arena.spawns[me];p.invuln=2;p.dir=[0,me?1:-1];p.next=[...p.dir];pacSfx('death');s.react?.(me,'sad');vibrate(15);break;}}}
 function myStep(n){const p=a.actors[me];p.prev=p.pos;let ate=-1;
  if(p.lives){if(pacNeighbor(arena,p.pos,...p.next)!==null)p.dir=[...p.next];const k=pacNeighbor(arena,p.pos,...p.dir);if(k!==null)p.pos=k;
   if(a.pellets.has(p.pos)){ate=p.pos;if(a.power.has(p.pos)){p.powered=7;p.combo=0;pacSfx('power');}else pacSfx('waka');claim(p.pos,me,n);}}
  myTick=n;meet(beat(gStep)&&tickAt(gStep)===n?{pos:p.pos,prev:p.prev}:null);
  hist[me][n]={pos:p.pos,dir:[...p.dir],lives:p.lives,pow:p.powered>0?1:0};nf.event({t:[n,p.pos,dirIx(p.dir),p.lives,p.powered>0?1:0,ate]});}
 function netFrame(dt){const now=rt();a.time=now;
  for(const p of a.actors){p.powered=Math.max(0,p.powered-dt);p.invuln=Math.max(0,p.invuln-dt);}
  if(phase==='play'){if(netBot)cpuPac(dt,me);while((myTick+1)*PAC_TICK<=now)myStep(myTick+1);}
  // ghost steps that are due and whose inputs are in (the other phone's report for tick 2j-DLY)
  while((gStep+1)*PAC_GHOST<=now&&(theirDone||nf.fin!==undefined||nf.gone||theirTick>=tickAt(gStep+1)-PAC_DLY)){gStep++;ghostStep(gStep);glog[gStep]=a.ghosts.map(g=>g.pos).join(',');const fresh=now-gStep*PAC_GHOST<.15;if(fresh)meet(beat(gStep)&&myTick>=tickAt(gStep)?{pos:at(me,tickAt(gStep)).pos,prev:at(me,tickAt(gStep)-1).pos}:null);}
  a.clock=now-myTick*PAC_TICK;a.ghostClock=now-gStep*PAC_GHOST;
  const sc=[0,0];for(const {i} of eaten.values())sc[i]+=5;sc[0]+=ghostPts[0];sc[1]+=ghostPts[1];a.scores=sc;
  if(phase==='play'&&(now>=60||!a.pellets.size||a.actors.every(p=>p.lives===0)))void netEnd();}
 async function netEnd(){phase='over';nf.finish({g:ghostPts[me],l:a.actors[me].lives});const f=await nf.remoteDone();theirDone=true;if(!s.alive)return;
  if(f&&Number.isFinite(f.g))ghostPts[them]=f.g;if(f&&Number.isFinite(f.l))a.actors[them].lives=f.l;
  const sc=[0,0];for(const {i} of eaten.values())sc[i]+=5;sc[0]+=ghostPts[0];sc[1]+=ghostPts[1];
  if(eaten.size===arena.pellets.size)for(let i=0;i<2;i++)if(a.actors[i].lives)sc[i]+=100;a.scores=sc;s.setScores(sc);fin=sc;setTimeout(()=>s.finish(sc,'Two-player maze race'),900);}
 if(!await s.pass(0,on?`Race ${s.players[them].name} through one maze, each on your own phone. Collect pellets before they do. Power pellets protect only the player who ate them. You each have three lives.`:'Race through one maze together. Collect pellets before your opponent does. Power pellets protect only the player who ate them. You each have three lives.','Both ready — chomp!'))return;
 let left=60;
 // vs CPU: chomper 2 paths to the nearest pellet (a power pellet first if ghosts are close), around ghosts, and hunts them while powered
 const cpu=isCpu(s);let cpuT=0;
 function cpuPac(dt,i=1){const p=a.actors[i],sk=cpuSkill(s);if(!p.lives)return;cpuT-=dt;if(cpuT>0)return;cpuT=.06+(1-sk)*.14;const M=arena.M,live=a.ghosts.filter(g=>!(g.returning>0)&&!pend.has(g.index)),near=k=>live.some(g=>{const d=Math.abs(g.pos%N-k%N)+Math.abs(Math.floor(g.pos/N)-Math.floor(k/N));return d<=(sk>.5?2:1);});
  const scary=p.powered<=0&&Math.random()<.5+sk*.5,goal=p.powered>1?k=>live.some(g=>g.pos===k):scary&&live.some(g=>near(p.pos))&&a.power.size?k=>a.power.has(k):k=>a.pellets.has(k);
  const prev=new Map([[p.pos,-1]]),q=[p.pos];let hit=null;while(q.length){const k=q.shift();if(k!==p.pos&&goal(k)){hit=k;break;}const r=Math.floor(k/N),cc=k%N;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){let nc=cc+dx;const nr=r+dy;if(nc<0)nc=N-1;if(nc>=N)nc=0;if(nr<0||nr>=M)continue;const n=nr*N+nc;if(arena.walls.has(n)||prev.has(n)||scary&&near(n))continue;prev.set(n,k);q.push(n);}}
  if(hit===null)return;let st=hit;while(prev.get(st)!==p.pos)st=prev.get(st);const r0=Math.floor(p.pos/N),c0=p.pos%N,r1=Math.floor(st/N),c1=st%N;let dx=c1-c0;if(Math.abs(dx)>1)dx=-Math.sign(dx);p.next=[dx,r1-r0];}
 if(on){phase='sync';void nf.start('go').then(()=>{if(!s.alive)return;playT0=performance.now();phase='play';});}
 s.frame(dt=>{
  if(on){if(phase!=='sync')netFrame(dt);}else{left-=dt;if(cpu)cpuPac(dt);
   for(const e of pacDuelStep(a,dt)){if(e.type==='pickup'){pacSfx('waka');}else if(e.type==='hurt'){pacSfx('death');s.react?.(e.owner,'sad');vibrate(15);}else if(e.type==='power'){pacSfx('power');s.react?.(e.owner,'win');}else if(e.type==='ghost'){pacSfx('ghost');s.react?.(e.owner,'win');}else{sound('win');}}}
  if(on)left=Math.max(0,60-a.time);
  const W=s.W,H=s.H,{ox,oy:oy0,sx,sy}=gestureGrid(W,H-HUDY,arena.N,arena.M),oy=oy0+HUDY,cell=Math.min(sx,sy),headSize=Math.max(32,Math.min(54,cell*1.45));x.fillStyle='#000';x.fillRect(0,0,W,H);
  // player 2's phone online: the maze turned round (vc/vr = drawn column/row of a cell)
  const vc=k=>F?N-1-k%N:k%N,vr=k=>F?arena.M-1-Math.floor(k/N):Math.floor(k/N);
  // walls, arcade look: the union of the wall cells (a little thinner than a cell, joined to wall neighbours) outlined in blue
  // with black inside; drawn in screen order (dr/dc), so player 2's turned-round maze joins the same way
  const kAt=(dr,dc)=>F?(arena.M-1-dr)*N+(N-1-dc):dr*N+dc,wallAt=(dr,dc)=>dr>=0&&dc>=0&&dr<arena.M&&dc<N&&arena.walls.has(kAt(dr,dc));
  const pad=Math.min(sx,sy)*.22,lw=Math.max(2,cell*.09);
  for(const [col1,sh] of [['#2121de',0],['#000',lw]]){x.fillStyle=col1;x.beginPath();
   for(let dr=0;dr<arena.M;dr++)for(let dc=0;dc<N;dc++){if(!wallAt(dr,dc))continue;const px=ox+dc*sx,py=oy+dr*sy,q=pad+sh,rr=Math.max(1,Math.min(sx,sy)*.25-sh);
    if(x.roundRect&&!sh)x.roundRect(px+q,py+q,sx-2*q,sy-2*q,rr);else x.rect(px+q,py+q,sx-2*q,sy-2*q);
    // joins reach past the rounded corners on both sides (else the outline shows a notch at every cell seam)
    if(wallAt(dr,dc+1))x.rect(px+sx-q-rr-1,py+q,2*(q+rr)+2,sy-2*q);if(wallAt(dr+1,dc))x.rect(px+q,py+sy-q-rr-1,sx-2*q,2*(q+rr)+2);
    if(wallAt(dr,dc+1)&&wallAt(dr+1,dc)&&wallAt(dr+1,dc+1))x.rect(px+sx-q-1,py+sy-q-1,2*q+2,2*q+2);}
   x.fill();}
  for(let row=0;row<arena.M;row++)for(let col=0;col<arena.N;col++){const k=row*arena.N+col,px=ox+vc(k)*sx,py=oy+vr(k)*sy;
   if(a.pellets.has(k)){if(a.power.has(k)){if(Math.floor(a.time*5)%2)circle(x,px+sx/2,py+sy/2,Math.max(4,cell*.24),'#ffb8ae');}else{const d=Math.max(2,cell*.13);x.fillStyle='#ffb8ae';x.fillRect(px+sx/2-d/2,py+sy/2-d/2,d,d);}}
  }
  const interp=(p,t)=>{const wrap=Math.abs(p.prev%arena.N-p.pos%arena.N)>2;return {x:ox+((wrap?vc(p.pos):vc(p.prev)*(1-t)+vc(p.pos)*t)+.5)*sx,y:oy+(vr(p.prev)*(1-t)+vr(p.pos)*t+.5)*sy};};
  for(const g of a.ghosts){const r=Math.max(8,Math.min(20,cell*.42));
   // eaten: just the eyes, flying home
   if(g.returning>0||pend.has(g.index)){if(g.eyes){g.eyes.t=Math.min(1,g.eyes.t+1/60/.9);const f=interp({prev:g.eyes.from,pos:g.home},g.eyes.t);ghostEyes(x,f.x,f.y,r,[0,-1]);}continue;}
   const p=interp(g,clamp(a.ghostClock/GHOST_STEP,0,1)),scared=g.scared,blink=scared&&a.actors.some(q=>q.powered>0&&q.powered<2)&&Math.floor(a.time*6)%2;
   const body=scared?(blink?'#ffffff':'#2121ff'):['#ff0000','#ffb8ff','#00ffff','#ffb852'][g.index],wave=Math.floor(a.time*8)%2;
   x.fillStyle=body;x.beginPath();x.arc(p.x,p.y-r*.15,r,Math.PI,0);x.lineTo(p.x+r,p.y+r*.85);for(let q=0;q<4;q++){const xa=p.x+r-(q+.5)*r/2,xb=p.x+r-(q+1)*r/2;x.lineTo(xa,p.y+r*(wave^q%2?.55:.85));x.lineTo(xb,p.y+r*.85);}x.closePath();x.fill();
   if(scared){x.fillStyle=blink?'#ff0000':'#ffb8ae';x.fillRect(p.x-r*.45,p.y-r*.35,r*.22,r*.22);x.fillRect(p.x+r*.23,p.y-r*.35,r*.22,r*.22);x.strokeStyle=x.fillStyle;x.lineWidth=Math.max(1.5,r*.1);x.beginPath();for(let q=0;q<=4;q++)x.lineTo(p.x-r*.6+q*r*.3,p.y+r*.25+(q%2?-1:1)*r*.1);x.stroke();}
   else ghostEyes(x,p.x,p.y,r,F?[-(g.dir?.[0]||0),-(g.dir?.[1]||0)]:g.dir||[0,0]);}
  for(let i=0;i<2;i++){const p=a.actors[i];if(!p.lives)continue;const tt=on&&i===them?clamp((performance.now()-(p.seen||0))/1000/.12,0,1):clamp(a.clock/.12,0,1),at=interp(p,tt);x.save();x.globalAlpha=p.invuln>0&&Math.sin(a.time*16)<0?.45:1;
   if(p.powered>0){x.strokeStyle='#fff079';x.lineWidth=3;x.beginPath();x.arc(at.x,at.y,headSize*.58,0,Math.PI*2);x.stroke();}s.sprite(x,i,at.x,at.y,headSize,{exact:true,mood:p.powered>0?'silly':undefined});x.restore();
  }
  drawDirectionFeedback(x,controls);
  s.setScores(a.scores);s.status(`${Math.ceil(Math.max(0,left))}s · ${s.players[0].name}: ${a.actors[0].lives} lives${a.actors[0].powered>0?' ⚡':''} · ${s.players[1].name}: ${a.actors[1].lives} lives${a.actors[1].powered>0?' ⚡':''} · ${a.pellets.size} pellets`);
  s.debug={engine:'pacmaze',state:a,arena,actors:a.actors,keys,fingers,controls,left,pacDuelStep,grid:{ox,oy,sx,sy},net:on?{myTick,theirTick,gStep,phase,eaten:eaten.size,ghostPts,glog}:null,bot:on?()=>{netBot=true;return '';}:null};
  if(!on&&(left<=0||a.clear||a.actors.every(p=>p.lives===0)))s.finish(a.scores,'Two-player maze race');
 });
}

Object.assign(exports,{airshootout,shootoutStep,tankArena,circleRectHit,tankStep,tank,makeDuelMaze,pacDuelState,pacDuelStep,pacmaze});