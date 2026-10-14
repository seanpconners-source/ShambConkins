// T-800 Freeway Chase, rebuilt as a Spy Hunter (Bally Midway, 1983) style vertical road shooter set on a Terminator
// night freeway: you ride the Harley (your head under the helmet), the road snakes and narrows, T-1000 police
// cruisers try to ram you, Cyberdyne trucks soak up bullets, and civilian cars cost points if you shoot them.
// Drag to steer, hold to fire. Leaving the road or getting rammed costs a bike. Turn-based on the same seed.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,keyboard,makeShake}=require("src/engines/tarantinoKit.js");
const {pixText,fitField,makeBits,turnRunner,vignette}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

const FW=160;
async function chase(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const shake=makeShake();let L=null,cur=null;let finger=null;const keys={l:false,r:false,f:false};
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur||!L)return;ev.preventDefault();finger={id:ev.pointerId,sx:s.pointer(ev).x,bx:cur.bike.x};s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(!finger||ev.pointerId!==finger.id||!cur||!L||s.paused)return;ev.preventDefault();const p=s.pointer(ev);cur.bike.tx=finger.bx+(p.x-finger.sx)/L.scale*1.25;});
 for(const t of ['pointerup','pointercancel'])s.on(c,t,ev=>{if(finger&&ev.pointerId===finger.id){finger=null;s.release(ev);if(cur)cur.bike.tx=null;}});
 keyboard(s,(i,name,down)=>{if(name in keys)keys[name]=down;if(name==='act')keys.f=down;});
 s.resetOnPause(()=>{finger=null;keys.l=keys.r=keys.f=false;});
 s.hint('Hold a finger anywhere and slide it left/right to steer; the bike fires while you hold. Stay on the road. Police cruisers ram you (150), Cyberdyne trucks take four hits (300), civilians cost 100. Keys: ←/→ steer, Space fire.');
 function road(w,d){const p=w.ph;return {c:FW/2+Math.sin(d*.0042+p[0])*26+Math.sin(d*.0113+p[1])*10,w:clamp(84+Math.sin(d*.0031+p[2])*30+Math.sin(d*.009+p[3])*8,52,120)};}
 function make(){const rand=seededRandom(s.seed+':chase');const w={rand,ph:[rand()*6,rand()*6,rand()*6,rand()*6],dist:0,speed:150,score:0,lives:3,cars:[],shots:[],bits:makeBits(),pops:[],spawnT:1.4,civT:2.2,fireT:0,FH:300,
  bike:{x:FW/2,tx:null,alive:true,inv:2,respawn:0,lean:0}};
  // lights along the shoulder
  w.lights=Array.from({length:24},(_,i)=>({d:i*60,side:i%2?1:-1,c:['#ff4fa8','#38c8ff','#ffd23f','#7dff6a'][i%4]}));return w;}
 function crash(w){const b=w.bike;if(!b.alive||b.inv>0)return;b.alive=false;w.lives--;b.respawn=1.6;w.bits.burst(b.x,w.bikeY,{n:40,speed:90,color:'#ffb347',life:1,size:2});w.bits.burst(b.x,w.bikeY,{n:20,speed:50,color:'#ff3b3b',life:.8,size:1.6});noise(.8,.14,{f0:1600,f1:60});vibrate(50);shake.kick(12);s.react?.(w.player,'sad',1.5);}
 function spawn(w,kind){const r=road(w,w.dist+w.FH*.9);const lane=r.c+(w.rand()-.5)*(r.w-26);
  if(kind==='civ')w.cars.push({kind,x:lane,y:-30,vy:-40-w.rand()*30,w:12,h:20,hp:1,col:['#3d7bff','#ffd23f','#7dff6a','#ff8a3a','#c9c9d6'][Math.floor(w.rand()*5)]});
  else if(kind==='truck')w.cars.push({kind,x:lane,y:-44,vy:-25,w:16,h:34,hp:4,col:'#7c8796'});
  else w.cars.push({kind:'cop',x:lane,y:w.FH+30,vy:-(w.speed+60),w:12,h:22,hp:1,col:'#111',ram:0});}
 function step(w,dt){
  w.bike.lean*=.9;shake.step(dt);w.bits.step(dt);for(const p of w.pops)p.t-=dt;w.pops=w.pops.filter(p=>p.t>0);
  w.speed=150+Math.min(70,w.time*1.2);w.dist+=w.speed*dt;if(!w.ending)w.score+=w.speed*dt*.05;
  w.bikeY=w.FH-46;const b=w.bike;
  if(!b.alive){b.respawn-=dt;if(b.respawn<=0&&w.lives>0){const r=road(w,w.dist+(w.FH-w.bikeY));Object.assign(b,{x:r.c,tx:null,alive:true,inv:2.2});w.cars=w.cars.filter(cc=>Math.abs(cc.y-w.bikeY)>60);}}
  else if(!w.ending){b.inv=Math.max(0,b.inv-dt);const key=(keys.r?1:0)-(keys.l?1:0);const old=b.x;if(key)b.x+=key*110*dt;else if(b.tx!==null)b.x+=clamp(b.tx-b.x,-140*dt,140*dt);b.x=clamp(b.x,4,FW-4);b.lean=clamp((b.x-old)/(dt*140),-1,1);
   const r=road(w,w.dist+(w.FH-w.bikeY));if(Math.abs(b.x-r.c)>r.w/2-3&&b.inv<=0)crash(w);
   const firing=finger||keys.f;w.fireT-=dt;if(firing&&w.fireT<=0){w.fireT=.085;w.shots.push({x:b.x-2,y:w.bikeY-12},{x:b.x+2,y:w.bikeY-12});voice(1800,.025,.02,'square',{slide:.4});}}
  // spawns on a fixed clock so both turns meet the same traffic
  w.spawnT-=dt;if(w.spawnT<=0){w.spawnT=clamp(2.2-w.time*.02,1,2.2)*(.7+w.rand()*.6);spawn(w,w.rand()<.25&&w.time>8?'truck':'cop');}
  w.civT-=dt;if(w.civT<=0){w.civT=1.6+w.rand()*1.6;spawn(w,'civ');}
  for(const s2 of w.shots)s2.y-=420*dt;
  for(const cc of w.cars){cc.y+=(w.speed+cc.vy)*dt;
   const r=road(w,w.dist+(w.FH-cc.y));
   if(cc.kind==='cop'&&b.alive){cc.ram+=dt;if(cc.y<w.bikeY+30&&cc.y>w.bikeY-60)cc.x+=clamp(b.x-cc.x,-60*dt,60*dt);}
   cc.x=clamp(cc.x,r.c-r.w/2+cc.w/2+2,r.c+r.w/2-cc.w/2-2);
   for(const sh of w.shots)if(!sh.dead&&Math.abs(sh.x-cc.x)<cc.w/2+1&&Math.abs(sh.y-cc.y)<cc.h/2){sh.dead=true;cc.hp--;cc.hit=.08;w.bits.burst(sh.x,sh.y,{n:3,speed:30,color:'#ffe9a8',life:.2,size:1});
    if(cc.hp<=0){cc.dead=true;const pts=cc.kind==='civ'?-100:cc.kind==='truck'?300:150;w.score+=pts;w.pops.push({x:cc.x,y:cc.y,text:(pts>0?'+':'')+pts,t:1,color:pts>0?'#ffd23f':'#ff5a5a'});w.bits.burst(cc.x,cc.y,{n:30,speed:80,color:'#ff9a3a',life:.8,size:2});noise(.4,.1,{f0:1200,f1:80});shake.kick(4);
     if(cc.kind==='civ'){voice(160,.3,.06,'sawtooth',{lp:700});s.react?.(w.player,'sad',.8);}else s.react?.(w.player,'happy',.6);}}
   if(!cc.dead&&b.alive&&b.inv<=0&&Math.abs(cc.x-b.x)<cc.w/2+3&&Math.abs(cc.y-w.bikeY)<cc.h/2+7){crash(w);cc.dead=cc.kind!=='truck';}
  }
  w.shots=w.shots.filter(sh=>!sh.dead&&sh.y>-10);w.cars=w.cars.filter(cc=>!cc.dead&&cc.y<w.FH+80&&cc.y>-90);
 }
 function drawCar(cc,t){const {x:cx,y:cy,w:cw,h:ch}=cc;x.save();x.translate(cx,cy);
  x.fillStyle='#0008';x.fillRect(-cw/2+1.5,-ch/2+2,cw,ch);
  x.fillStyle=cc.hit>0?'#fff':cc.col;x.beginPath();x.roundRect?.(-cw/2,-ch/2,cw,ch,3);x.fill();
  if(cc.kind==='cop'){x.fillStyle='#f4f4f4';x.fillRect(-cw/2,-ch*.12,cw,ch*.3);const on=Math.floor(t*10)%2;x.fillStyle=on?'#ff2a2a':'#2a6bff';x.fillRect(-cw/2+1,-ch*.18,cw/2-1,2.2);x.fillStyle=on?'#2a6bff':'#ff2a2a';x.fillRect(0,-ch*.18,cw/2-1,2.2);x.shadowColor=on?'#ff2a2a':'#2a6bff';x.shadowBlur=10;x.fillRect(-1,-ch*.18,2,2.2);x.shadowBlur=0;}
  if(cc.kind==='truck'){x.fillStyle='#4d5662';x.fillRect(-cw/2+1,-ch/2+8,cw-2,ch-10);x.fillStyle='#ffd23f';x.fillRect(-cw/2+2,ch/2-6,cw-4,2);pixText(x,'CYBERDYNE',0,0,.32,'#d8e2ee',{align:'center'});}
  x.fillStyle='#9fd8ff88';x.fillRect(-cw/2+2,-ch/2+3,cw-4,ch*.18);x.fillStyle='#0006';x.fillRect(-cw/2+2,ch/2-ch*.2,cw-4,ch*.12);
  x.fillStyle='#ff3030';x.fillRect(-cw/2+1,ch/2-1.5,2.4,1.5);x.fillRect(cw/2-3.4,ch/2-1.5,2.4,1.5);
  x.restore();if(cc.hit>0)cc.hit-=1/60;}
 function draw(w){
  const W=s.W,H=s.H;L=fitField(W,H,FW,{minH:240,maxH:520,top:0,bottom:0,anchor:'center'});w.FH=L.FH;
  x.setTransform(1,0,0,1,0,0);x.fillStyle='#07060c';x.fillRect(0,0,W,H);
  const k=L.scale;let ox=L.ox,oy=L.oy;if(shake.mag>.3){ox+=(Math.random()-.5)*shake.mag;oy+=(Math.random()-.5)*shake.mag;}
  x.setTransform(k,0,0,k,ox,oy);
  // shoulders: dark city, lit windows scrolling by
  const ext=L.ox/k+2;x.fillStyle='#0d0b18';x.fillRect(-ext,0,FW+ext*2,w.FH);
  const step=6;for(let y=-step;y<w.FH+step;y+=step){const yy=y+((w.dist%step)),d=w.dist+(w.FH-yy),r=road(w,d);
   x.fillStyle='#1b1a24';x.fillRect(r.c-r.w/2-6,yy,r.w+12,step+.5);x.fillStyle='#2b2a36';x.fillRect(r.c-r.w/2,yy,r.w,step+.5);
   x.fillStyle='#d8d8e0';x.fillRect(r.c-r.w/2+1,yy,1.2,step+.5);x.fillRect(r.c+r.w/2-2.2,yy,1.2,step+.5);
   if(Math.floor((d)/18)%2===0){x.fillStyle='#e8d36a';x.fillRect(r.c-.6,yy,1.2,step+.5);x.fillStyle='#ffffff55';x.fillRect(r.c-r.w/4-.4,yy,.8,step+.5);x.fillRect(r.c+r.w/4-.4,yy,.8,step+.5);}}
  // city blocks beyond the shoulders, windows lit at random (hash of the block index)
  const BL=34,first=Math.floor(w.dist/BL)-2;
  for(let n=first;n<first+Math.ceil(w.FH/BL)+4;n++){const y=w.FH-(n*BL-w.dist);const r=road(w,n*BL);const hsh=(v)=>{const q=Math.sin(n*127.1+v*311.7)*43758.5;return q-Math.floor(q);};
   for(const side of [-1,1]){const edge=r.c+side*(r.w/2+16),wid=18+hsh(side)*26,bx=side<0?edge-wid:edge;x.fillStyle=['#14121f','#191527','#110f1a'][Math.floor(hsh(side+3)*3)];x.fillRect(bx,y-BL+3,wid,BL-6);
    x.fillStyle='#ffd98a';for(let wy=0;wy<4;wy++)for(let wx=0;wx<Math.floor(wid/5);wx++)if(hsh(wx*7+wy*3+side)>.62){x.globalAlpha=.35+hsh(wx+wy)*.5;x.fillRect(bx+2+wx*5,y-BL+6+wy*6,2,3);}x.globalAlpha=1;}}
  // street lights along the shoulders
  for(const l of w.lights){const per=60*24;const d=((l.d-w.dist)%per+per)%per;const y=w.FH-d;if(y<-20||y>w.FH+20)continue;const r=road(w,w.dist+(w.FH-y)),lx=r.c+l.side*(r.w/2+9);const g=x.createRadialGradient(lx,y,0,lx,y,16);g.addColorStop(0,l.c+'66');g.addColorStop(1,l.c+'00');x.fillStyle=g;x.fillRect(lx-16,y-16,32,32);x.fillStyle=l.c;x.fillRect(lx-1,y-1,2,2);}
  // traffic
  for(const cc of w.cars)drawCar(cc,w.time);
  // bullets
  x.fillStyle='#fff6b0';x.shadowColor='#ffd23f';x.shadowBlur=6;for(const sh of w.shots)x.fillRect(sh.x-.5,sh.y-3,1,4);x.shadowBlur=0;
  // the Harley with your head
  const b=w.bike,by=w.FH-46;if(b.alive&&!(b.inv>0&&Math.sin(w.time*26)<0)){x.save();x.translate(b.x,by);x.rotate(b.lean*.18);
   const hl=x.createLinearGradient(0,-10,0,-60);hl.addColorStop(0,'#fff6c066');hl.addColorStop(1,'#fff6c000');x.fillStyle=hl;x.beginPath();x.moveTo(-3,-8);x.lineTo(-14,-60);x.lineTo(14,-60);x.lineTo(3,-8);x.fill();
   x.fillStyle='#0009';x.fillRect(-4,-7,9,18);x.fillStyle='#1c1c22';x.fillRect(-2.2,-9,4.4,20);x.fillStyle='#c8ccd6';x.fillRect(-4.5,-4,9,2);x.fillStyle='#ff3b3b';x.fillRect(-1,10,2,1.4);
   x.fillStyle='#2a2a30';x.fillRect(-3.4,-1,6.8,8);x.restore();s.sprite(x,w.player,b.x,by-1,13,{exact:true});}
  w.bits.draw(x);
  for(const p of w.pops)pixText(x,p.text,p.x,p.y-(1-p.t)*14,.8,p.color,{align:'center',glow:6,alpha:clamp(p.t*2,0,1)});
  x.setTransform(1,0,0,1,0,0);vignette(x,W,H,.55);
  // HUD (screen space, under the floating buttons on the left)
  const fs=clamp(Math.min(W,H)*.006,2,3.4);pixText(x,String(Math.max(0,Math.round(w.score))).padStart(5,'0'),12,12,fs,'#ffd23f',{glow:8});
  for(let i=0;i<Math.max(0,w.lives-(b.alive?1:0));i++){x.fillStyle='#ff4fa8';x.fillRect(14+i*fs*5,12+fs*9,fs*3,fs*4);}
  const left=Math.max(0,Math.ceil(w.cap-w.time));pixText(x,`TIME ${left}`,12,12+fs*15,fs*.8,left<=10?'#ff5a5a':'#ffffffaa');
  if(w.player===1)pixText(x,`BEAT ${w.scores[0]}`,12,12+fs*23,fs*.7,'#ffffff88');
  if(w.ending)pixText(x,w.endReason==='time'?'TIME UP':'TERMINATED',W/2,H*.42,fs*2,'#ff3b3b',{align:'center',glow:10});
  s.debug={engine:'chase',world:w};
 }
 const scores=await turnRunner(s,{seconds:60,
  intro:(i,sc)=>i===0?`T-800 Freeway Chase. ${s.players[0].name} rides first: hold a finger anywhere and slide it to steer; the Harley fires while you hold. Stay on the road, blast T-1000 cruisers and Cyberdyne trucks, spare the civilians. Three bikes, 60 seconds.`:`${s.players[1].name}, same freeway. Beat ${sc[0]}.`,
  make:()=>{cur=make();return cur;},step,draw,done:w=>w.lives<=0&&!w.bike.alive&&w.bike.respawn<=0,score:w=>w.score});
 if(!scores)return;
 s.finish(scores,`T-800 Freeway Chase · ${scores[0]} vs ${scores[1]}`);
}
Object.assign(exports,{chase});
