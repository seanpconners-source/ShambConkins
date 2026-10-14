// Asteroids (Atari, 1979) remake in glowing vector lines: three rock sizes (20/50/100), big and small saucers
// (200/1000), four shots on screen, wraparound, hyperspace and the two-note heartbeat that speeds up. Your head
// sits in the cockpit of the vector ship. Touch: hold anywhere and drag like a joystick; the ship turns that way,
// thrusts when you drag far and fires while you hold. Tap a second finger for hyperspace. Turn-based, same seed.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,keyboard,makeShake}=require("src/engines/tarantinoKit.js");
const {vectorText,turnRunner}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

const TAU=Math.PI*2;
const ROCK_R=[9.5,5.2,2.8],ROCK_PTS=[20,50,100];
function rockShape(rand){const n=10+Math.floor(rand()*3);return Array.from({length:n},(_,i)=>({a:i/n*TAU+(rand()-.5)*.35,r:.72+rand()*.32}));}

async function asteroids(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const shake=makeShake();let cur=null;
 // ---- input: virtual stick from where the finger first touched
 const stick={id:null,ox:0,oy:0,x:0,y:0},keys={l:false,r:false,u:false,f:false};
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur)return;ev.preventDefault();const p=s.pointer(ev);
  if(stick.id===null){stick.id=ev.pointerId;stick.ox=stick.x=p.x;stick.oy=stick.y=p.y;s.capture(ev);}else hyperspace(cur);});
 s.on(c,'pointermove',ev=>{if(ev.pointerId!==stick.id||s.paused)return;ev.preventDefault();const p=s.pointer(ev);stick.x=p.x;stick.y=p.y;});
 for(const t of ['pointerup','pointercancel'])s.on(c,t,ev=>{if(ev.pointerId===stick.id){stick.id=null;s.release(ev);}});
 keyboard(s,(i,name,down)=>{if(name in keys)keys[name]=down;if(name==='act')keys.f=down;if(name==='d'&&down&&cur)hyperspace(cur);});
 s.resetOnPause(()=>{stick.id=null;for(const k in keys)keys[k]=false;});
 s.hint('Hold anywhere and drag like a joystick: the ship turns toward your drag, thrusts when you drag far and fires while you hold. Tap with a second finger (or press Down) for hyperspace. Keys: ←/→ turn, ↑ thrust, Space fire.');
 const U=()=>Math.min(s.W,s.H)/100;
 function rock(w,size,px,py){const r=w.rand,a=r()*TAU,v=(6+r()*9+w.wave*1.2)*(1+size*.45);return {x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v,size,rot:r()*TAU,spin:(r()-.5)*1.2,shape:rockShape(r)};}
 function wave(w){const n=Math.min(11,4+w.wave*2),ar=s.W/U(),br=s.H/U();for(let i=0;i<n;i++){const edge=w.rand()<.5;w.rocks.push(rock(w,0,edge?0:w.rand()*ar,edge?w.rand()*br:0));}w.wave++;w.beatT=0;w.beatRate=1;}
 function make(){const w={rand:seededRandom(s.seed+':asteroids'),rocks:[],shots:[],eshots:[],debris:[],dots:[],ship:{x:50,y:50,vx:0,vy:0,a:-Math.PI/2,alive:true,inv:2.5,respawn:0},lives:3,score:0,wave:0,fireT:0,saucer:null,saucerT:14,beatT:0,beat:0,beatRate:1,thrust:false,ar:100,br:100,hyper:0};return w;}
 function hyperspace(w){const sh=w.ship;if(!sh.alive||w.hyper>0||w.ending)return;w.hyper=.6;sh.x=w.rand()*w.ar;sh.y=w.rand()*w.br;sh.vx=sh.vy=0;voice(200,.3,.05,'sine',{slide:4});if(w.rand()<.1)kill(w);}
 function burst(w,px,py,n,sp,life=.9){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=sp*(.2+Math.random());w.dots.push({x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:life*(.5+Math.random()*.7)});}}
 function kill(w){const sh=w.ship;if(!sh.alive)return;sh.alive=false;w.lives--;sh.respawn=2.2;for(let i=0;i<5;i++){const a=Math.random()*TAU;w.debris.push({x:sh.x,y:sh.y,vx:Math.cos(a)*6,vy:Math.sin(a)*6,a:Math.random()*TAU,va:(Math.random()-.5)*4,len:2+Math.random()*2.5,t:2});}
  burst(w,sh.x,sh.y,26,22,1.2);noise(.9,.14,{f0:1400,f1:60});vibrate(40);shake.kick(12);s.react?.(w.player,'sad',1.5);}
 function splitRock(w,r,idx,byShip=true){w.rocks.splice(idx,1);if(byShip)w.score+=ROCK_PTS[r.size];burst(w,r.x,r.y,8+(2-r.size)*6,14+r.size*6,.8);noise(.25+(2-r.size)*.15,.1,{f0:900-r.size*250,f1:80});shake.kick(3-r.size);
  if(r.size<2)for(let i=0;i<2;i++)w.rocks.push(rock(w,r.size+1,r.x,r.y));}
 const wrap=(o,w)=>{o.x=(o.x%w.ar+w.ar)%w.ar;o.y=(o.y%w.br+w.br)%w.br;};
 const dist=(a,b,w)=>{let dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);dx=Math.min(dx,w.ar-dx);dy=Math.min(dy,w.br-dy);return Math.hypot(dx,dy);};
 function step(w,dt){
  const u=U();w.ar=s.W/u;w.br=s.H/u;shake.step(dt);w.hyper=Math.max(0,w.hyper-dt);
  if(!w.rocks.length&&!w.saucer&&!w.ending){if(!w.nextWave)w.nextWave=1.5;w.nextWave-=dt;if(w.nextWave<=0){w.nextWave=0;wave(w);}}
  // heartbeat
  w.beatRate=Math.min(3.2,w.beatRate+dt*.02);w.beatT-=dt;if(w.beatT<=0&&w.rocks.length){w.beatT=1/w.beatRate;voice(w.beat++%2?55:62,.11,.12,'square',{lp:300});}
  const sh=w.ship;
  if(!sh.alive){if(sh.respawn>0){sh.respawn-=dt;if(sh.respawn<=0&&w.lives>0){const centre={x:w.ar/2,y:w.br/2};if(w.rocks.every(r=>dist(r,centre,w)>ROCK_R[r.size]+12)){Object.assign(sh,{x:w.ar/2,y:w.br/2,vx:0,vy:0,a:-Math.PI/2,alive:true,inv:2.2});}else sh.respawn=.2;}}}
  else if(!w.ending){
   sh.inv=Math.max(0,sh.inv-dt);let turn=(keys.r?1:0)-(keys.l?1:0),thrust=keys.u,fire=keys.f;
   if(stick.id!==null){const dx=stick.x-stick.ox,dy=stick.y-stick.oy,len=Math.hypot(dx,dy);fire=true;if(len>10){const want=Math.atan2(dy,dx);let d=want-sh.a;d=Math.atan2(Math.sin(d),Math.cos(d));turn=clamp(d*3,-1,1);if(len>48)thrust=true;}}
   sh.a+=turn*4.6*dt;w.thrust=thrust;
   if(thrust){sh.vx+=Math.cos(sh.a)*55*dt;sh.vy+=Math.sin(sh.a)*55*dt;const v=Math.hypot(sh.vx,sh.vy);if(v>48){sh.vx*=48/v;sh.vy*=48/v;}if(Math.random()<dt*14)noise(.07,.035,{f0:500,f1:200});}
   const drag=Math.pow(.55,dt);sh.vx*=drag;sh.vy*=drag;sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;wrap(sh,w);
   w.fireT-=dt;if(fire&&w.fireT<=0&&w.shots.length<4){w.fireT=.16;w.shots.push({x:sh.x+Math.cos(sh.a)*4,y:sh.y+Math.sin(sh.a)*4,vx:Math.cos(sh.a)*72+sh.vx,vy:Math.sin(sh.a)*72+sh.vy,t:1});voice(1400,.07,.035,'square',{slide:.35});}
  }
  for(const r of w.rocks){r.x+=r.vx*dt;r.y+=r.vy*dt;r.rot+=r.spin*dt;wrap(r,w);}
  for(const b of w.shots){b.x+=b.vx*dt;b.y+=b.vy*dt;b.t-=dt;wrap(b,w);}
  for(const b of w.eshots){b.x+=b.vx*dt;b.y+=b.vy*dt;b.t-=dt;wrap(b,w);}
  for(const d of w.debris){d.x+=d.vx*dt;d.y+=d.vy*dt;d.a+=d.va*dt;d.t-=dt;}for(const d of w.dots){d.x+=d.vx*dt;d.y+=d.vy*dt;d.t-=dt;}
  // shots vs rocks / saucer
  for(const b of w.shots){if(b.t<=0)continue;for(let i=w.rocks.length-1;i>=0;i--){const r=w.rocks[i];if(dist(b,r,w)<ROCK_R[r.size]){b.t=0;splitRock(w,r,i);break;}}
   if(b.t>0&&w.saucer&&dist(b,w.saucer,w)<w.saucer.r){b.t=0;w.score+=w.saucer.small?1000:200;burst(w,w.saucer.x,w.saucer.y,30,22);noise(.6,.12,{f0:1200,f1:80});shake.kick(6);s.react?.(w.player,'win',1);w.saucer=null;}}
  // ship collisions
  if(sh.alive&&sh.inv<=0&&!w.ending){for(let i=w.rocks.length-1;i>=0;i--){const r=w.rocks[i];if(dist(sh,r,w)<ROCK_R[r.size]+3){splitRock(w,r,i);kill(w);break;}}
   for(const b of w.eshots)if(b.t>0&&dist(b,sh,w)<2.8){b.t=0;kill(w);}
   if(w.saucer&&dist(w.saucer,sh,w)<w.saucer.r+2.4){w.saucer=null;kill(w);}}
  // saucer
  w.saucerT-=dt;if(!w.saucer&&w.saucerT<=0&&w.rocks.length){const small=w.time>30||w.wave>2&&w.rand()<.5;const dir=w.rand()<.5?1:-1;w.saucer={x:dir>0?0:w.ar,y:w.rand()*w.br,vx:dir*(small?16:11),vy:0,r:small?2.4:4.2,small,fire:1.2,turn:2,t:0};w.saucerT=12+w.rand()*8;}
  const sc=w.saucer;if(sc){sc.t+=dt;sc.x+=sc.vx*dt;sc.y+=sc.vy*dt;sc.y=(sc.y%w.br+w.br)%w.br;sc.turn-=dt;if(sc.turn<=0){sc.turn=1.5;sc.vy=(w.rand()-.5)*20;}
   if(Math.floor(sc.t*6)!==Math.floor((sc.t-dt)*6))voice(sc.small?1100:700,.08,.02,'square');
   sc.fire-=dt;if(sc.fire<=0&&!w.ending){sc.fire=sc.small?.9:1.3;let a=w.rand()*TAU;if(sc.small&&sh.alive)a=Math.atan2(sh.y-sc.y,sh.x-sc.x)+(w.rand()-.5)*.25;w.eshots.push({x:sc.x,y:sc.y,vx:Math.cos(a)*45,vy:Math.sin(a)*45,t:1.1});}
   for(let i=w.rocks.length-1;i>=0;i--){if(dist(w.rocks[i],sc,w)<ROCK_R[w.rocks[i].size]+sc.r){splitRock(w,w.rocks[i],i,false);w.saucer=null;break;}}
   if(sc&&(sc.x<-6||sc.x>w.ar+6))w.saucer=null;}
  w.shots=w.shots.filter(b=>b.t>0);w.eshots=w.eshots.filter(b=>b.t>0);w.debris=w.debris.filter(d=>d.t>0);w.dots=w.dots.filter(d=>d.t>0);
 }
 function draw(w){
  const W=s.W,H=s.H,u=U();
  x.setTransform(1,0,0,1,0,0);x.fillStyle='rgba(0,0,3,.42)';x.fillRect(0,0,W,H);
  let ox=0,oy=0;if(shake.mag>.3){ox=(Math.random()-.5)*shake.mag;oy=(Math.random()-.5)*shake.mag;}
  x.setTransform(u,0,0,u,ox,oy);
  const line=1.4/u;x.lineCap='round';x.lineJoin='round';
  const stroke=(col,blur,fn)=>{x.strokeStyle=col;x.shadowColor=col;x.shadowBlur=blur;x.lineWidth=line;x.beginPath();fn();x.stroke();};
  const glow='#bfe3ff';
  stroke('#f4fbff',10,()=>{for(const r of w.rocks){const R=ROCK_R[r.size];r.shape.forEach((p,i)=>{const X=r.x+Math.cos(p.a+r.rot)*R*p.r,Y=r.y+Math.sin(p.a+r.rot)*R*p.r;i?x.lineTo(X,Y):x.moveTo(X,Y);});x.closePath();}});
  const sc=w.saucer;if(sc){const k=sc.r/4.2;stroke('#f4fbff',10,()=>{const p=[[-4.2,0],[-1.8,1.6],[1.8,1.6],[4.2,0],[-4.2,0]];p.forEach(([a,b],i)=>i?x.lineTo(sc.x+a*k,sc.y+b*k):x.moveTo(sc.x+a*k,sc.y+b*k));x.moveTo(sc.x-4.2*k,sc.y);x.lineTo(sc.x-1.8*k,sc.y-1.4*k);x.lineTo(sc.x+1.8*k,sc.y-1.4*k);x.lineTo(sc.x+4.2*k,sc.y);x.moveTo(sc.x-1.4*k,sc.y-1.4*k);x.lineTo(sc.x-.8*k,sc.y-2.8*k);x.lineTo(sc.x+.8*k,sc.y-2.8*k);x.lineTo(sc.x+1.4*k,sc.y-1.4*k);});}
  x.fillStyle='#fff';x.shadowColor=glow;x.shadowBlur=8;for(const b of w.shots)x.fillRect(b.x-.45,b.y-.45,.9,.9);for(const b of w.eshots)x.fillRect(b.x-.45,b.y-.45,.9,.9);
  for(const d of w.dots){x.globalAlpha=clamp(d.t*1.4,0,1);x.fillRect(d.x-.25,d.y-.25,.5,.5);}x.globalAlpha=1;
  for(const d of w.debris){x.globalAlpha=clamp(d.t,0,1);stroke('#f4fbff',8,()=>{x.moveTo(d.x-Math.cos(d.a)*d.len/2,d.y-Math.sin(d.a)*d.len/2);x.lineTo(d.x+Math.cos(d.a)*d.len/2,d.y+Math.sin(d.a)*d.len/2);});}x.globalAlpha=1;
  const sh=w.ship;
  if(sh.alive&&!(sh.inv>0&&Math.sin(w.time*24)<0)){
   const S=6.6,pt=(a,r)=>[sh.x+Math.cos(sh.a+a)*r*S,sh.y+Math.sin(sh.a+a)*r*S];
   stroke('#f4fbff',12,()=>{const n=pt(0,1),l=pt(2.45,.95),r=pt(-2.45,.95),bl=pt(2.75,.62),br=pt(-2.75,.62);x.moveTo(...n);x.lineTo(...l);x.moveTo(...n);x.lineTo(...r);x.moveTo(...bl);x.lineTo(...br);
    if(w.thrust&&Math.random()<.8){const f=pt(Math.PI,.95+Math.random()*.25);x.moveTo(...pt(2.9,.6));x.lineTo(...f);x.lineTo(...pt(-2.9,.6));}});
   x.shadowBlur=0;s.sprite(x,w.player,sh.x-Math.cos(sh.a)*.6,sh.y-Math.sin(sh.a)*.6,6.4,{exact:true});
  }
  x.shadowBlur=0;
  // HUD (vector font)
  x.setTransform(1,0,0,1,0,0);
  const fs=clamp(Math.min(W,H)*.045,14,30);x.shadowColor=glow;x.shadowBlur=8;x.strokeStyle='#f4fbff';
  vectorText(x,String(w.score).padStart(2,'0'),16,14,fs,{width:2});
  for(let i=0;i<w.lives-(sh.alive?1:0)&&i<5;i++){const lx=24+i*fs*.8,ly=22+fs*1.45,S=fs*.32;x.beginPath();x.moveTo(lx,ly-S);x.lineTo(lx-S*.7,ly+S);x.moveTo(lx,ly-S);x.lineTo(lx+S*.7,ly+S);x.moveTo(lx-S*.5,ly+S*.55);x.lineTo(lx+S*.5,ly+S*.55);x.lineWidth=1.6;x.stroke();}
  const left=Math.max(0,Math.ceil(w.cap-w.time));x.strokeStyle=left<=10?'#ff8080':'#f4fbffaa';vectorText(x,String(left),W/2,14,fs*.7,{align:'center',width:1.6});
  x.strokeStyle='#f4fbff66';vectorText(x,w.player===0?'00':String(w.scores[0]).padStart(2,'0'),W/2,H-fs*.9-8,fs*.55,{align:'center',width:1.4});
  if(w.ending){x.strokeStyle='#f4fbff';vectorText(x,w.endReason==='time'?'TIME UP':'GAME OVER',W/2,H*.42,fs*1.2,{align:'center',width:2.4});}
  else if(w.time<1.8){x.strokeStyle='#f4fbff';vectorText(x,`PLAYER ${w.player+1}`,W/2,H*.32,fs,{align:'center',width:2});}
  x.shadowBlur=0;
  if(stick.id!==null){x.strokeStyle='#ffffff30';x.lineWidth=2;x.beginPath();x.arc(stick.ox,stick.oy,48,0,TAU);x.stroke();x.beginPath();x.arc(stick.x,stick.y,14,0,TAU);x.stroke();}
  s.debug={engine:'asteroids',world:w,stick};
 }
 const scores=await turnRunner(s,{seconds:60,
  intro:(i,sc)=>i===0?`Asteroids, Atari 1979. ${s.players[0].name} first: hold anywhere and drag like a joystick. The ship turns your way, thrusts when you drag far and fires while you hold. Second finger = hyperspace. Three ships, 60 seconds.`:`${s.players[1].name}, same rocks. Beat ${sc[0]}.`,
  make:()=>{const w=make();cur=w;w.ar=s.W/U();w.br=s.H/U();w.ship.x=w.ar/2;w.ship.y=w.br/2;wave(w);x.setTransform(1,0,0,1,0,0);x.fillStyle='#000';x.fillRect(0,0,s.W,s.H);return w;},
  step,draw,done:w=>w.lives<=0&&!w.ship.alive&&w.ship.respawn<=0,score:w=>w.score});
 if(!scores)return;
 s.finish(scores,`Asteroids · ${scores[0]} vs ${scores[1]}`);
}
Object.assign(exports,{asteroids});
