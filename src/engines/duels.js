const {clamp}=require("src/utils.js");
const {circle, COLORS}=require("src/engines/session.js");
const {sound, vibrate,pickupSound}=require("src/audio.js");
const {duelInputs, ownedPointers}=require("src/engines/duelControls.js");
const {directionGestures, gestureGrid, drawDirectionFeedback}=require("src/engines/directionGestures.js");
const {arenaGestures,gestureHint}=require("src/engines/arenaGestures.js");
const {makePacArena, pacNeighbor, pacNext}=require("src/engines/mobile.js");
const {airshootout:playShootout, shootoutStep:stepShootout}=require("src/engines/hockeyShootout.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
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
function pacDuelState(seed) {
 const arena=makeDuelMaze(seed);
 return {arena,actors:arena.spawns.map((pos,i)=>({pos,prev:pos,dir:[0,i?1:-1],next:[0,i?1:-1],powered:0,combo:0,lives:3,invuln:1.8})),ghosts:arena.homes.map((pos,i)=>({pos,prev:pos,home:pos,index:i,returning:0})),pellets:new Set(arena.pellets),power:new Set(arena.power),scores:[0,0],clock:0,ghostClock:0,time:0,steps:0,clear:false};
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
 if(a.ghostClock>=.24){a.ghostClock-=.24;ghostsMoved=true;for(const g of a.ghosts){g.prev=g.pos;if(g.returning>0)continue;
   const live=a.actors.map((p,i)=>({p,i})).filter(o=>o.p.lives>0),distance=o=>Math.abs(g.pos%arena.N-o.p.pos%arena.N)+Math.abs(Math.floor(g.pos/arena.N)-Math.floor(o.p.pos/arena.N));
   const vulnerable=live.filter(o=>o.p.powered===0);let target=g.home;
   if(a.time%27>=7&&vulnerable.length){const {p}=vulnerable.sort((u,v)=>distance(u)-distance(v))[0];target=p.pos;
    if(g.index===1)target+=3*(p.dir[0]+p.dir[1]*arena.N);if(g.index===2)target-=2*(p.dir[0]+p.dir[1]*arena.N);if(g.index===3&&distance({p})<6)target=g.home;
   }
   g.pos=pacNext(arena,g.pos,target);
  }
 }
 for(let i=0;i<2;i++){const p=a.actors[i];if(!p.lives)continue;
  for(const g of a.ghosts){const crossed=moved&&ghostsMoved&&g.prev===p.pos&&g.pos===p.prev;
   if(g.returning>0||g.pos!==p.pos&&!crossed)continue;
   if(p.powered>0){p.combo++;a.scores[i]+=50*2**Math.min(3,p.combo-1);g.pos=g.prev=g.home;g.returning=2;events.push({type:'ghost',owner:i});}
   else if(p.invuln===0){p.lives--;p.pos=p.prev=arena.spawns[i];p.invuln=2;p.dir=[0,i?1:-1];p.next=[...p.dir];events.push({type:'hurt',owner:i});break;}
  }
 }
 if(!a.pellets.size&&!a.clear){a.clear=true;for(let i=0;i<2;i++)if(a.actors[i].lives)a.scores[i]+=100;events.push({type:'clear'});}
 return events;
}

async function pacmaze(s) {
 const [,x]=s.canvas(620,480,{fill:true}),a=pacDuelState(s.seed),{arena}=a;
 s.shared=true;s.updateScores();const controls=directionGestures(s,(i,dx,dy)=>{a.actors[i].next=[dx,dy];},{players:2}),{keys,fingers}=controls;
 s.resetOnPause?.(()=>{for(const p of a.actors)p.next=[...p.dir];});
 s.debug={engine:'pacmaze',state:a,arena,actors:a.actors,keys,fingers,controls,left:60,pacDuelStep};
 s.hint('Shared maze, separate lives and power-ups. P1 starts a finger on the left; P2 on the right. Swipe or keep dragging to turn; directions follow the screen. P1 WASD; P2 arrows. Most points in 60s wins.');
 if(!await s.pass(0,'Race through one maze together. Collect pellets before your opponent does. Power pellets protect only the player who ate them. You each have three lives.','Both ready — chomp!'))return;
 let left=60;
 // vs CPU: chomper 2 paths to the nearest pellet (a power pellet first if ghosts are close), around ghosts, and hunts them while powered
 const cpu=isCpu(s);let cpuT=0;
 function cpuPac(dt){const p=a.actors[1],sk=cpuSkill(s);if(!p.lives)return;cpuT-=dt;if(cpuT>0)return;cpuT=.06+(1-sk)*.14;const N=arena.N,M=arena.M,live=a.ghosts.filter(g=>!(g.returning>0)),near=k=>live.some(g=>{const d=Math.abs(g.pos%N-k%N)+Math.abs(Math.floor(g.pos/N)-Math.floor(k/N));return d<=(sk>.5?2:1);});
  const scary=p.powered<=0&&Math.random()<.5+sk*.5,goal=p.powered>1?k=>live.some(g=>g.pos===k):scary&&live.some(g=>near(p.pos))&&a.power.size?k=>a.power.has(k):k=>a.pellets.has(k);
  const prev=new Map([[p.pos,-1]]),q=[p.pos];let hit=null;while(q.length){const k=q.shift();if(k!==p.pos&&goal(k)){hit=k;break;}const r=Math.floor(k/N),cc=k%N;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){let nc=cc+dx;const nr=r+dy;if(nc<0)nc=N-1;if(nc>=N)nc=0;if(nr<0||nr>=M)continue;const n=nr*N+nc;if(arena.walls.has(n)||prev.has(n)||scary&&near(n))continue;prev.set(n,k);q.push(n);}}
  if(hit===null)return;let st=hit;while(prev.get(st)!==p.pos)st=prev.get(st);const r0=Math.floor(p.pos/N),c0=p.pos%N,r1=Math.floor(st/N),c1=st%N;let dx=c1-c0;if(Math.abs(dx)>1)dx=-Math.sign(dx);p.next=[dx,r1-r0];}
 s.frame(dt=>{left-=dt;if(cpu)cpuPac(dt);
  for(const e of pacDuelStep(a,dt)){if(e.type==='pickup'){pickupSound(s);}else if(e.type==='hurt'){sound('lose');s.react?.(e.owner,'sad');vibrate(15);}else{sound('win');if(e.owner!==undefined)s.react?.(e.owner,'win');}}
  const W=s.W,H=s.H,{ox,oy,sx,sy}=gestureGrid(W,H,arena.N,arena.M),cell=Math.min(sx,sy),headSize=Math.max(32,Math.min(54,cell*1.45));x.fillStyle='#101731';x.fillRect(0,0,W,H);
  for(let row=0;row<arena.M;row++)for(let col=0;col<arena.N;col++){const k=row*arena.N+col,px=ox+col*sx,py=oy+row*sy;
   if(arena.walls.has(k)){x.fillStyle='#21396e';x.fillRect(px+2,py+2,Math.max(1,sx-4),Math.max(1,sy-4));x.strokeStyle='#6396ee';x.lineWidth=1.5;x.strokeRect(px+4,py+4,Math.max(1,sx-8),Math.max(1,sy-8));}
   else if(a.pellets.has(k))circle(x,px+sx/2,py+sy/2,a.power.has(k)?Math.max(4,cell*.18)+Math.sin(a.time*7):Math.max(2,cell*.065),'#ffe4ab');
  }
  const interp=(p,t)=>{const wrap=Math.abs(p.prev%arena.N-p.pos%arena.N)>2;return {x:ox+((wrap?p.pos%arena.N:p.prev%arena.N*(1-t)+p.pos%arena.N*t)+.5)*sx,y:oy+(Math.floor(p.prev/arena.N)*(1-t)+Math.floor(p.pos/arena.N)*t+.5)*sy};};
  for(const g of a.ghosts){if(g.returning>0)continue;const p=interp(g,clamp(a.ghostClock/.24,0,1)),frightened=a.actors.every(p=>p.lives===0||p.powered>0);
   const r=Math.max(8,Math.min(20,cell*.35));x.fillStyle=frightened?'#668ded':['#ef5a75','#f7a6ce','#71dced','#fac76c'][g.index];x.beginPath();x.arc(p.x,p.y-2,r,Math.PI,0);x.lineTo(p.x+r,p.y+r);x.lineTo(p.x+r/2,p.y+r*.6);x.lineTo(p.x,p.y+r);x.lineTo(p.x-r/2,p.y+r*.6);x.lineTo(p.x-r,p.y+r);x.closePath();x.fill();circle(x,p.x-r*.4,p.y-2,r*.3,'#fff');circle(x,p.x+r*.4,p.y-2,r*.3,'#fff');
  }
  for(let i=0;i<2;i++){const p=a.actors[i];if(!p.lives)continue;const at=interp(p,clamp(a.clock/.12,0,1));x.save();x.globalAlpha=p.invuln>0&&Math.sin(a.time*16)<0?.45:1;
   if(p.powered>0){x.strokeStyle='#fff079';x.lineWidth=3;x.beginPath();x.arc(at.x,at.y,headSize*.58,0,Math.PI*2);x.stroke();}s.sprite(x,i,at.x,at.y,headSize,{exact:true,mood:p.powered>0?'silly':undefined});x.restore();
  }
  drawDirectionFeedback(x,controls);
  s.setScores(a.scores);s.status(`${Math.ceil(Math.max(0,left))}s · ${s.players[0].name}: ${a.actors[0].lives} lives${a.actors[0].powered>0?' ⚡':''} · ${s.players[1].name}: ${a.actors[1].lives} lives${a.actors[1].powered>0?' ⚡':''} · ${a.pellets.size} pellets`);
  s.debug={engine:'pacmaze',state:a,arena,actors:a.actors,keys,fingers,controls,left,pacDuelStep,grid:{ox,oy,sx,sy}};
  if(left<=0||a.clear||a.actors.every(p=>p.lives===0))s.finish(a.scores,'Two-player maze race');
 });
}

Object.assign(exports,{airshootout,shootoutStep,tankArena,circleRectHit,tankStep,tank,makeDuelMaze,pacDuelState,pacDuelStep,pacmaze});