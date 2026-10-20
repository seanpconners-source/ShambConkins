// James Bond warp-zone games (Volcano Lair, src/warpThemes.js 'bond-lair'). Both players at once on a split screen
// (P1 top / left, P2 bottom / right) with the same seeded patterns, like the other warp games.
//  bondLaser    Diamonds Are Forever · Laser Vault Heist. Drag your agent through sweeping, sliding and blinking
//               laser beams, grab the diamond and carry it back to the exit. A beam trips the alarm: back to the door.
//  bondFunhouse The Man with the Golden Gun · Funhouse Duel. Cut-outs pop up in Scaramanga's funhouse. Shoot
//               Scaramanga (+2) and Nick Nack (+1); never the cardboard Bond (−3) or a mirror reflection (−1).
//               The golden gun holds one bullet, so every tap is followed by a short reassembly.
//  bondBomb     Goldfinger · Stop the Bomb at 007. The Fort Knox device counts down; tap your half to stop your
//               own read-out as close to 007 as you dare. Hit zero and it goes off. Seven rounds.
const {clamp}=require("src/utils.js");
const {Fx,arenaKeys,arenaTouch,snd,noise,jingle,outlined,rr,PCOL,settle,Countdown}=require("src/engines/arenaKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");

const INK='#0b0b0d',GOLD='#e8c45a',RED='#ff2a2a';
const split=s=>{const side=()=>s.W>s.H*1.05;return {side,vp:i=>side()?{x:i?s.W/2+2:0,y:0,w:s.W/2-2,h:s.H}:{x:0,y:i?s.H/2+2:0,w:s.W,h:s.H/2-2},owner:p=>side()?(p.x<s.W/2?0:1):(p.y<s.H/2?0:1)};};
function divider(x,s,side){x.fillStyle=GOLD;if(side())x.fillRect(s.W/2-2,0,4,s.H);else x.fillRect(0,s.H/2-2,s.W,4);}
function endBanner(x,s,text){const size=Math.min(s.W*.06,s.H*.06,44);x.fillStyle='rgba(10,8,8,.78)';x.fillRect(0,s.H/2-size,s.W,size*2);outlined(x,text,s.W/2,s.H/2,{size,fill:GOLD,stroke:INK});}
function hud(x,s,i,v,text,sub){const size=Math.max(14,Math.min(v.w,v.h)*.055);outlined(x,text,v.x+10,v.y+size*.9,{size,fill:PCOL[i],stroke:'#fff',align:'left'});if(sub)outlined(x,sub,v.x+v.w-10,v.y+size*.9,{size:size*.85,fill:'#fff',stroke:INK,align:'right'});}
function segDist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy||1,t=clamp(((px-ax)*dx+(py-ay)*dy)/l,0,1);return Math.hypot(px-ax-dx*t,py-ay-dy*t);}

// ------------------------------------------------------------------ Laser Vault Heist
const HEIST_TIME=60,START=[10,90],R=3.6;
// Beams for the k-th heist (both players get the same list for the same k). Vault coordinates 0..100.
function heistPlan(random,k){
 const beams=[],n=Math.min(6,2+k);
 for(let j=0;j<n;j++){const r=random(),kind=j===0?'slide':r<.38?'slide':r<.7?'sweep':'blink',speed=(.45+random()*.35)*(1+k*.12);
  if(kind==='slide'){const vert=random()<.35;beams.push(vert?{kind,vert,x0:28,x1:92,y0:4,y1:76,speed,ph:random()*6.28}:{kind,vert,x0:24,x1:96,y0:24,y1:78,speed,ph:random()*6.28});}
  else if(kind==='sweep')beams.push({kind,px:34+random()*50,py:30+random()*40,len:10+random()*7+Math.min(6,k),speed:speed*(random()<.5?-1:1),ph:random()*6.28});
  else{const y=26+random()*48,x=22+random()*30;beams.push({kind,ax:x,ay:y,bx:x+26+random()*40,by:y+(random()-.5)*30,period:1.6+random()*1.2,on:.55+random()*.15,ph:random()*3});}}
 return {beams,gem:[22+random()*70,7+random()*12],egg:k>0&&k%3===2};
}
function beamAt(b,t){
 if(b.kind==='slide'){const u=(Math.sin(t*b.speed+b.ph)+1)/2;return b.vert?{on:true,ax:b.x0+(b.x1-b.x0)*u,ay:b.y0,bx:b.x0+(b.x1-b.x0)*u,by:b.y1}:{on:true,ax:b.x0,ay:b.y0+(b.y1-b.y0)*u,bx:b.x1,by:b.y0+(b.y1-b.y0)*u};}
 if(b.kind==='sweep'){const a=t*b.speed+b.ph;return {on:true,ax:b.px-Math.cos(a)*b.len,ay:b.py-Math.sin(a)*b.len,bx:b.px+Math.cos(a)*b.len,by:b.py+Math.sin(a)*b.len,pivot:true};}
 const ph=((t+b.ph)%b.period)/b.period;return {on:ph<b.on,warn:ph>.88,ax:b.ax,ay:b.ay,bx:b.bx,by:b.by};
}
async function bondLaser(s){
 const [c,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const {side,vp,owner}=split(s),fx=new Fx(),score=[0,0],kb=arenaKeys(s),cd=new Countdown(3);let phase='count',t=0,clock=0,endT=0,endText='';
 s.hint('Laser Vault Heist: drag anywhere on your half (P1 top, P2 bottom; left/right on wide screens) to move your agent. Grab the diamond at the back of the vault and carry it to the green EXIT. Red beams sweep, slide and blink: touch one and the alarm sends you back to the door, diamond and all. Every heist adds a beam. A Fabergé egg is worth 3. Most loot after 60 seconds wins. P1 WASD, P2 arrows.');
 const plans=[];const plan=k=>{while(plans.length<=k)plans.push(heistPlan(s.random,plans.length));return plans[k];};
 const agents=[0,1].map(()=>({x:START[0],y:START[1],carry:false,heist:0,stun:0,inv:0,flash:0,mood:0}));
 const box=v=>{const sz=Math.min(v.w-16,v.h-(side()?60:34)),ox=v.x+(v.w-sz)/2,oy=v.y+v.h-sz-8;return {ox,oy,k:sz/100};};
 const fingers=[null,null];
 arenaTouch(s,{owner,maxFingers:1,onDown:f=>{fingers[f.owner]={lx:f.x,ly:f.y};},onMove:f=>{const fi=fingers[f.owner],a=agents[f.owner];if(!fi||a.stun>0||phase!=='play'){if(fi){fi.lx=f.x;fi.ly=f.y;}return;}const b=box(vp(f.owner));move(a,(f.x-fi.lx)/b.k*1.15,(f.y-fi.ly)/b.k*1.15);fi.lx=f.x;fi.ly=f.y;},onUp:f=>{fingers[f.owner]=null;}});
 // Move in small steps so a fast swipe cannot jump over a beam.
 function move(a,dx,dy){const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/1.5));for(let k=0;k<n;k++){a.x=clamp(a.x+dx/n,R,100-R);a.y=clamp(a.y+dy/n,R,100-R);if(check(a))return;}}
 function check(a){const i=agents.indexOf(a);if(a.inv>0||a.stun>0||phase!=='play')return false;
  for(const b of plan(a.heist).beams){const L=beamAt(b,clock);if(L.on&&segDist(a.x,a.y,L.ax,L.ay,L.bx,L.by)<R*.9){trip(i);return true;}}
  const p=plan(a.heist);if(!a.carry&&Math.hypot(a.x-p.gem[0],a.y-p.gem[1])<R+3){a.carry=true;snd(1320,.12,{type:'triangle',vol:.04});snd(1760,.16,{type:'triangle',vol:.03,delay:.07});const bx=box(vp(i));fx.pop(bx.ox+a.x*bx.k,bx.oy+a.y*bx.k-20,p.egg?'FABERGÉ EGG!':'GOT IT!',{color:'#bff6ff',stroke:INK,size:18});}
  if(a.carry&&a.x<20&&a.y>80){const pts=p.egg?3:1;score[i]+=pts;a.carry=false;a.heist++;a.flash=.5;s.react(i,'happy');jingle([784,988,1175,1568],{step:.06,type:'triangle',vol:.04});const bx=box(vp(i));fx.pop(bx.ox+a.x*bx.k,bx.oy+a.y*bx.k-24,`+${pts}`,{color:GOLD,stroke:INK,size:28});fx.burst(bx.ox+a.x*bx.k,bx.oy+a.y*bx.k,{n:18,color:'#bff6ff',speed:220,life:.55,size:4,shape:'star'});}
  return false;}
 function trip(i){const a=agents[i],bx=box(vp(i));a.stun=.9;a.inv=1.8;a.carry=false;s.react(i,'sad');noise(.35,{vol:.06,freq:900});snd(880,.5,{type:'square',vol:.035,to:440});snd(880,.5,{type:'square',vol:.03,to:440,delay:.5});
  fx.pop(bx.ox+a.x*bx.k,bx.oy+a.y*bx.k-20,'ALARM!',{color:'#ff6a6a',stroke:INK,size:22});fx.shake(8);fx.burst(bx.ox+a.x*bx.k,bx.oy+a.y*bx.k,{n:14,color:RED,speed:200,life:.4,size:3});}
 s.debug={get phase(){return phase;},agents,score,plan,beamAt,segDist,clockNow:()=>clock,setClock(v){clock=v;},teleport(i,px,py){agents[i].x=px;agents[i].y=py;check(agents[i]);}};
 // vs CPU: agent 2 heads for the diamond, then the exit, taking the step that stays clear of beams now and a beat ahead
 const cpu=isCpu(s);
 function cpuHeist(dt){const a=agents[1],sk=cpuSkill(s);if(a.stun>0)return;const p=plan(a.heist),tx=a.carry?9:p.gem[0],ty=a.carry?91:p.gem[1],sp=(22+sk*16)*dt,look=.12+sk*.18;
  const safe=(px,py)=>p.beams.every(b=>{for(const tt of [0,look]){const L=beamAt(b,clock+tt);if((L.on||L.warn&&tt>0)&&segDist(px,py,L.ax,L.ay,L.bx,L.by)<R*(1.2+sk*.6))return false;}return true;});
  let best=null,bd=Math.hypot(tx-a.x,ty-a.y)+(safe(a.x,a.y)?0:1e3);for(let k=0;k<8;k++){const an=k*Math.PI/4,nx=clamp(a.x+Math.cos(an)*sp,R,100-R),ny=clamp(a.y+Math.sin(an)*sp,R,100-R);if(!safe(nx,ny)&&Math.random()<sk)continue;const d=Math.hypot(tx-nx,ty-ny);if(d<bd){bd=d;best=[nx-a.x,ny-a.y];}}
  if(best)move(a,best[0],best[1]);}
 function drawVault(i){const v=vp(i),b=box(v),a=agents[i],p=plan(a.heist),X=u=>b.ox+u*b.k,Y=u=>b.oy+u*b.k;
  x.fillStyle='#120c0b';x.fillRect(v.x,v.y,v.w,v.h);
  x.fillStyle='#1d1a1c';x.fillRect(b.ox,b.oy,100*b.k,100*b.k);x.strokeStyle='#2c2729';x.lineWidth=1;for(let g=10;g<100;g+=10){x.beginPath();x.moveTo(X(g),Y(0));x.lineTo(X(g),Y(100));x.moveTo(X(0),Y(g));x.lineTo(X(100),Y(g));x.stroke();}
  x.strokeStyle='#5d636e';x.lineWidth=Math.max(3,b.k*1.4);x.strokeRect(b.ox,b.oy,100*b.k,100*b.k);
  // exit and vault door
  x.fillStyle='rgba(60,220,120,.22)';x.fillRect(X(0),Y(80),20*b.k,20*b.k);outlined(x,'EXIT',X(10),Y(97),{size:Math.max(10,b.k*4),fill:'#7dffb0',stroke:INK});
  x.fillStyle='#3a3d44';x.beginPath();x.arc(X(p.gem[0]),Y(p.gem[1])+b.k*3,b.k*5,0,7);x.fill();
  if(!a.carry){const gx=X(p.gem[0]),gy=Y(p.gem[1]),r=b.k*(p.egg?3.4:3);if(p.egg){x.fillStyle=GOLD;x.beginPath();x.ellipse(gx,gy,r*.8,r,0,0,7);x.fill();x.strokeStyle='#c8161d';x.lineWidth=2;x.beginPath();x.moveTo(gx-r*.8,gy);x.lineTo(gx+r*.8,gy);x.stroke();}
   else{x.fillStyle='#bff6ff';x.beginPath();x.moveTo(gx,gy+r);x.lineTo(gx-r,gy-r*.2);x.lineTo(gx-r*.5,gy-r*.8);x.lineTo(gx+r*.5,gy-r*.8);x.lineTo(gx+r,gy-r*.2);x.closePath();x.fill();x.strokeStyle='#5fb7c8';x.lineWidth=1.5;x.stroke();}
   x.globalAlpha=.5+.5*Math.sin(t*6);x.fillStyle='#fff';x.fillRect(gx+r*.4,gy-r*1.2,2,6);x.fillRect(gx+r*.4-2,gy-r*1.2+2,6,2);x.globalAlpha=1;}
  // beams
  for(const bm of p.beams){const L=beamAt(bm,clock);
   if(bm.kind==='blink'){x.fillStyle='#5d636e';for(const [ex,ey] of [[L.ax,L.ay],[L.bx,L.by]]){x.beginPath();x.arc(X(ex),Y(ey),b.k*1.4,0,7);x.fill();}}
   if(L.pivot){x.fillStyle='#5d636e';x.beginPath();x.arc(X(bm.px),Y(bm.py),b.k*1.6,0,7);x.fill();}
   if(!L.on){if(L.warn){x.strokeStyle='rgba(255,60,60,.35)';x.lineWidth=1;x.setLineDash([4,4]);x.beginPath();x.moveTo(X(L.ax),Y(L.ay));x.lineTo(X(L.bx),Y(L.by));x.stroke();x.setLineDash([]);}continue;}
   x.lineCap='round';x.strokeStyle='rgba(255,40,40,.25)';x.lineWidth=b.k*2.6;x.beginPath();x.moveTo(X(L.ax),Y(L.ay));x.lineTo(X(L.bx),Y(L.by));x.stroke();
   x.strokeStyle=RED;x.lineWidth=Math.max(2,b.k*.8);x.stroke();x.strokeStyle='#ffd0d0';x.lineWidth=1;x.stroke();}
  // agent
  const ax=X(a.x),ay=Y(a.y),hs=b.k*R*3.4;if(a.inv>0&&Math.floor(t*12)%2)x.globalAlpha=.45;
  x.fillStyle='#111';x.beginPath();x.moveTo(ax-hs*.35,ay+hs*.55);x.lineTo(ax+hs*.35,ay+hs*.55);x.lineTo(ax,ay);x.fill();x.fillStyle='#fff';x.beginPath();x.moveTo(ax-hs*.08,ay+hs*.2);x.lineTo(ax+hs*.08,ay+hs*.2);x.lineTo(ax,ay+hs*.45);x.fill();
  s.sprite(x,i,ax,ay-hs*.05,hs,{exact:true,mood:a.stun>0?'sad':a.flash>0?'happy':undefined});x.globalAlpha=1;
  if(a.carry){x.fillStyle=p.egg?GOLD:'#bff6ff';x.beginPath();x.arc(ax+hs*.42,ay+hs*.22,b.k*1.8,0,7);x.fill();}
  if(a.stun>0){x.fillStyle=`rgba(255,0,0,${a.stun*.35})`;x.fillRect(v.x,v.y,v.w,v.h);}
  hud(x,s,i,v,`${s.players[i].name.toUpperCase()}  ${score[i]}`,`${Math.ceil(Math.max(0,HEIST_TIME-clock))}s`);}
 s.frame(dt=>{t+=dt;fx.update(dt);
  if(phase==='count'){if(!cd.update(dt))phase='play';}
  else if(phase==='play'){clock+=dt;if(cpu)cpuHeist(dt);
   for(let i=0;i<2;i++){const a=agents[i],k=kb.state[i];a.flash=Math.max(0,a.flash-dt);a.inv=Math.max(0,a.inv-dt);
    // Caught: frozen in the beam for a moment, then marched back to the vault door.
    if(a.stun>0){a.stun-=dt;if(a.stun<=0){a.stun=0;a.x=START[0];a.y=START[1];}continue;}
    if(k.l||k.r||k.u||k.d){const sp=34*dt;move(a,(k.r-k.l)*sp,(k.d-k.u)*sp);}else check(a);}
   if(clock>=HEIST_TIME){phase='end';endT=0;const [p0,p1]=score;endText=p0===p1?'DEAD HEAT':`${s.players[p0>p1?0:1].name.toUpperCase()} CRACKS THE VAULT`;jingle([523,659,784,1047],{step:.1,type:'triangle',vol:.04});}}
  else{endT+=dt;if(endT>2.6){s.finish(score,`Laser Vault Heist: ${s.players[0].name} ${score[0]}, ${s.players[1].name} ${score[1]}.`);return;}}
  s.setScores(score);fx.begin(x);
  for(let i=0;i<2;i++){const v=vp(i);x.save();x.beginPath();x.rect(v.x,v.y,v.w,v.h);x.clip();drawVault(i);x.restore();}
  fx.draw(x);fx.end(x);divider(x,s,side);
  if(phase==='count')cd.draw(x,s.W,s.H);if(phase==='end')endBanner(x,s,endText);
 });
}

// ------------------------------------------------------------------ Golden Gun Funhouse Duel
const FUN_TIME=45,RELOAD=.55;
const TARGETS={scaramanga:{pts:2,label:'SCARAMANGA +2'},nicknack:{pts:1,label:'NICK NACK +1'},bond:{pts:-3,label:'CARDBOARD BOND'},mirror:{pts:-1,label:'ONLY A MIRROR'}};
function drawCutout(x,kind,cx,cy,h,up){const w=h*.62;x.save();x.translate(cx,cy+h*(1-up));const mirror=kind==='mirror';if(mirror)x.scale(-1,1);
 const small=kind==='nicknack',s=small?.72:1,body=kind==='bond'?'#111':kind==='nicknack'?'#f2efe6':'#f4f1ea';
 x.fillStyle='#6a4a2a';x.fillRect(-w*.06,h*.2,w*.12,h*.3);
 x.translate(0,h*(1-s)*.3);x.scale(s,s);
 x.fillStyle=body;rr(x,-w*.4,-h*.12,w*.8,h*.42,w*.14);x.fill();x.strokeStyle=INK;x.lineWidth=2;x.stroke();
 x.fillStyle='#fff';x.beginPath();x.moveTo(-w*.1,-h*.12);x.lineTo(w*.1,-h*.12);x.lineTo(0,h*.06);x.fill();
 x.fillStyle=kind==='bond'?'#111':'#1a1a1a';x.beginPath();x.moveTo(-w*.09,-h*.1);x.lineTo(w*.09,-h*.06);x.lineTo(w*.09,-h*.1);x.lineTo(-w*.09,-h*.06);x.fill();
 x.fillStyle='#e8c19f';x.beginPath();x.arc(0,-h*.28,w*.24,0,7);x.fill();x.stroke();
 x.fillStyle=kind==='nicknack'?'#3a2a1a':'#2a1a10';x.beginPath();x.arc(0,-h*.33,w*.25,Math.PI*1.05,Math.PI*1.95);x.fill();
 x.fillStyle=INK;x.fillRect(-w*.11,-h*.3,w*.05,w*.05);x.fillRect(w*.06,-h*.3,w*.05,w*.05);
 x.strokeStyle=INK;x.lineWidth=2;x.beginPath();x.arc(0,-h*.22,w*.09,.2,Math.PI-.2);x.stroke();
 if(kind==='scaramanga'||mirror){x.fillStyle=GOLD;x.save();x.translate(w*.42,-h*.02);x.rotate(-.3);x.fillRect(0,-w*.05,w*.36,w*.1);x.fillRect(0,0,w*.08,w*.2);x.restore();}
 if(kind==='bond'){x.fillStyle='#fff';rr(x,-w*.32,h*.02,w*.64,h*.14,4);x.fill();outlined(x,'007',0,h*.09,{size:h*.1,fill:'#111',stroke:'#fff',lw:1});}
 if(kind==='nicknack'){x.fillStyle='#2a1a10';x.fillRect(-w*.3,-h*.48,w*.6,h*.05);x.fillRect(-w*.18,-h*.6,w*.36,h*.13);}
 x.restore();
 // Name plate on the stake. A mirror is flipped, so its plate reads backwards: the tell.
 x.save();x.translate(cx,cy+h*(1-up));if(mirror)x.scale(-1,1);x.fillStyle=kind==='bond'?'#e8e6e0':'#2a1a10';rr(x,-w*.48,h*.31,w*.96,h*.13,4);x.fill();x.strokeStyle=GOLD;x.lineWidth=1.5;x.stroke();
 x.font=`900 ${Math.max(8,h*.085)}px "Arial Black",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillStyle=kind==='bond'?'#111':GOLD;x.fillText(kind==='bond'?'JAMES BOND':kind==='nicknack'?'NICK NACK':'SCARAMANGA',0,h*.375);x.restore();
 if(mirror){const mx=cx-w*.56,my=cy-h*.64+h*(1-up),mw=w*1.12,mh=h*1.1;x.save();x.globalAlpha=.3;x.fillStyle='#bfe8ff';rr(x,mx,my,mw,mh,10);x.fill();x.globalAlpha=.55;x.strokeStyle='#fff';x.lineWidth=4;
  for(const f of [.25,.55]){x.beginPath();x.moveTo(mx+mw*f,my+6);x.lineTo(mx+mw*(f-.2),my+mh*.5);x.stroke();}x.globalAlpha=1;x.strokeStyle='#d8e4ea';x.lineWidth=6;rr(x,mx,my,mw,mh,10);x.stroke();x.strokeStyle='#7a8a92';x.lineWidth=2;x.stroke();x.restore();}}
async function bondFunhouse(s){
 const [c,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const {side,vp,owner}=split(s),fx=new Fx(),score=[0,0],cd=new Countdown(3);let phase='count',t=0,clock=0,endT=0,endText='';
 s.hint('Funhouse Duel: cut-outs pop up in the six funhouse windows on your half (P1 top, P2 bottom; left/right on wide screens). Tap Scaramanga (+2, holding the golden gun) and Nick Nack (+1). Do not shoot the cardboard Bond (−3) or a reflection in a mirror frame (−1). The golden gun holds one bullet: after every shot it takes a moment to reassemble. Most points after 45 seconds wins. Keyboard: P1 Q W E / A S D, P2 U I O / J K L.');
 // One shared schedule: [time, window, kind, stay]
 const sched=[];for(let tt=.4,n=0;tt<FUN_TIME-.6;n++){const r=s.random(),kind=r<.42?'scaramanga':r<.62?'nicknack':r<.82?'mirror':'bond';sched.push({at:tt,win:Math.floor(s.random()*6),kind,stay:Math.max(.75,1.35-tt/FUN_TIME*.55)});tt+=.38+s.random()*.5-Math.min(.12,tt/FUN_TIME*.12);}
 const fields=[[],[]],gun=[0,0],shots=[0,0],nextIdx=[0,0];
 const wins=i=>{const v=vp(i),top=v.y+v.h*.16,cw=v.w/3,ch=(v.h*.84)/2;return Array.from({length:6},(_,k)=>({k,x:v.x+(k%3)*cw+cw*.08,y:top+Math.floor(k/3)*ch+ch*.06,w:cw*.84,h:ch*.86}));};
 function shoot(i,k){if(phase!=='play')return;if(gun[i]>0){snd(160,.05,{type:'square',vol:.02});return;}gun[i]=RELOAD;shots[i]++;snd(1200,.05,{type:'square',vol:.05,to:200});noise(.08,{vol:.05,freq:3000});
  const w=wins(i)[k],tg=fields[i].find(o=>o.win===k&&!o.hit&&o.up>.35);fx.ring(w.x+w.w/2,w.y+w.h/2,{color:GOLD,r1:w.w*.4,life:.25});
  if(!tg){fx.pop(w.x+w.w/2,w.y+w.h*.4,'MISS',{color:'#bbb',stroke:INK,size:16});return;}
  tg.hit=true;const T=TARGETS[tg.kind];score[i]=Math.max(0,score[i]+T.pts);s.react(i,T.pts>0?'happy':'sad');
  fx.pop(w.x+w.w/2,w.y+w.h*.35,T.label,{color:T.pts>0?GOLD:'#ff6a6a',stroke:INK,size:Math.max(13,w.w*.12)});
  if(tg.kind==='mirror'){noise(.3,{vol:.06,freq:5000});fx.burst(w.x+w.w/2,w.y+w.h/2,{n:16,color:'#dff4ff',speed:240,life:.5,size:3,shape:'square'});}
  else if(T.pts>0){fx.burst(w.x+w.w/2,w.y+w.h/2,{n:12,color:GOLD,speed:180,life:.45,size:3,shape:'star'});jingle([880,1175],{step:.05,type:'triangle',vol:.035});}
  else{fx.shake(6);snd(140,.3,{type:'sawtooth',vol:.04});}}
 arenaTouch(s,{owner,maxFingers:2,onDown:f=>{const w=wins(f.owner).find(w=>f.x>=w.x&&f.x<=w.x+w.w&&f.y>=w.y&&f.y<=w.y+w.h);if(w)shoot(f.owner,w.k);}});
 s.on(document,'keydown',ev=>{if(s.paused||!s.alive||ev.repeat)return;const k=String(ev.key).toLowerCase(),a='qweasd'.indexOf(k),b='uiojkl'.indexOf(k);if(a>=0){ev.preventDefault();shoot(0,a);}else if(b>=0){ev.preventDefault();shoot(1,b);}});
 s.debug={get phase(){return phase;},fields,score,shoot,sched};
 // vs CPU: gunman 2 shoots Scaramanga and Nick Nack after a reaction delay, and on Easy sometimes a decoy
 const cpu=isCpu(s);
 function cpuFun(){if(gun[1]>0)return;const sk=cpuSkill(s);for(const o of fields[1]){if(o.hit||o.up<.4||o.cpuSeen)continue;if(o.cpuAt===undefined)o.cpuAt=.2+(1-sk)*.45+Math.random()*.15;if(o.age<o.cpuAt)continue;o.cpuSeen=true;const good=TARGETS[o.kind].pts>0;if(good?Math.random()<.65+sk*.33:Math.random()<(1-sk)*.18){shoot(1,o.win);break;}}}
 s.frame(dt=>{t+=dt;fx.update(dt);
  if(phase==='count'){if(!cd.update(dt))phase='play';}
  else if(phase==='play'){clock+=dt;if(cpu)cpuFun();
   for(let i=0;i<2;i++){gun[i]=Math.max(0,gun[i]-dt);while(nextIdx[i]<sched.length&&sched[nextIdx[i]].at<=clock){const e=sched[nextIdx[i]++];if(!fields[i].some(o=>o.win===e.win))fields[i].push({...e,age:0,up:0,hit:false});}
    for(const o of fields[i]){o.age+=dt;o.up=o.hit?Math.max(0,o.up-dt*5):o.age<.15?o.age/.15:o.age>o.stay?Math.max(0,1-(o.age-o.stay)/.15):1;}
    fields[i]=fields[i].filter(o=>!(o.up<=0&&o.age>.2));}
   if(clock>=FUN_TIME){phase='end';endT=0;const [a,b]=score;endText=a===b?'A GENTLEMAN’S DRAW':`${s.players[a>b?0:1].name.toUpperCase()} HAS THE GOLDEN GUN`;jingle([523,659,784,1047],{step:.1,type:'triangle',vol:.04});}}
  else{endT+=dt;if(endT>2.6){s.finish(score,`Funhouse Duel: ${s.players[0].name} ${score[0]}, ${s.players[1].name} ${score[1]}.`);return;}}
  s.setScores(score);fx.begin(x);
  for(let i=0;i<2;i++){const v=vp(i);x.save();x.beginPath();x.rect(v.x,v.y,v.w,v.h);x.clip();
   const g=x.createLinearGradient(0,v.y,0,v.y+v.h);g.addColorStop(0,'#2a0f2a');g.addColorStop(1,'#120812');x.fillStyle=g;x.fillRect(v.x,v.y,v.w,v.h);
   for(let k=0;k<8;k++){x.fillStyle=k%2?'rgba(232,196,90,.06)':'rgba(200,22,29,.07)';x.beginPath();x.moveTo(v.x+v.w/2,v.y+v.h*.6);x.arc(v.x+v.w/2,v.y+v.h*.6,v.w,k*.785+t*.1,k*.785+.39+t*.1);x.fill();}
   for(const w of wins(i)){x.fillStyle='#0a060a';rr(x,w.x,w.y,w.w,w.h,8);x.fill();x.strokeStyle=GOLD;x.lineWidth=3;x.stroke();
    const o=fields[i].find(o=>o.win===w.k);if(o&&o.up>0){x.save();rr(x,w.x,w.y,w.w,w.h,8);x.clip();drawCutout(x,o.kind,w.x+w.w/2,w.y+w.h*.55,w.h*.88,o.up);x.restore();}
    for(let b=0;b<5;b++){x.fillStyle=(Math.floor(t*4)+b+w.k)%2?'#ffe9a0':'#7a5a20';x.beginPath();x.arc(w.x+w.w*(.1+b*.2),w.y+4,2.6,0,7);x.fill();}}
   const hs=Math.min(v.w,v.h)*.12,hx=v.x+v.w-hs*.7,hy=v.y+hs*.62;s.sprite(x,i,hx,hy,hs,{exact:true});
   const ready=gun[i]<=0;x.fillStyle=ready?GOLD:'#6a5a30';x.save();x.translate(hx-hs*.95,hy+hs*.1);x.fillRect(-hs*.4,-hs*.06,hs*.5,hs*.12);x.fillRect(-hs*.05,0,hs*.1,hs*.22);x.restore();
   if(!ready){const k=1-gun[i]/RELOAD;x.strokeStyle=GOLD;x.lineWidth=3;x.beginPath();x.arc(hx-hs*.95,hy+hs*.12,hs*.28,-1.57,-1.57+k*6.28);x.stroke();}
   hud(x,s,i,v,`${s.players[i].name.toUpperCase()}  ${score[i]}`,'');outlined(x,`${Math.ceil(Math.max(0,FUN_TIME-clock))}s`,v.x+10,v.y+Math.max(14,Math.min(v.w,v.h)*.055)*2.1,{size:Math.max(12,Math.min(v.w,v.h)*.045),fill:'#fff',stroke:INK,align:'left'});
   x.restore();}
  fx.draw(x);fx.end(x);divider(x,s,side);
  if(phase==='count')cd.draw(x,s.W,s.H);if(phase==='end')endBanner(x,s,endText);
 });
}

// ------------------------------------------------------------------ Stop the Bomb at 007
const BOMB_ROUNDS=7;
// Points for stopping d seconds away from 7.00.
const bombPoints=d=>d<=.1?5:d<=.3?4:d<=.6?3:d<=1.2?2:d<=2.2?1:0;
async function bondBomb(s){
 const [c,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const {side,vp,owner}=split(s),fx=new Fx(),score=[0,0],kb=arenaKeys(s),cd=new Countdown(3);let phase='count',t=0,endT=0,endText='';
 s.hint('Stop the Bomb at 007: Goldfinger’s device in Fort Knox counts down. Tap anywhere on your half (P1 top, P2 bottom; left/right on wide screens) to stop YOUR read-out. 0:07.00 exactly scores 5; the further away, the less. Let it reach zero and it goes off. From round 4 the display blacks out partway down; later rounds speed up. Seven rounds. Keyboard: P1 Space, P2 Enter.');
 const rounds=Array.from({length:BOMB_ROUNDS},(_,k)=>({start:12+s.random()*8,rate:k<5?1+s.random()*.5:1.3+s.random()*.6,accel:k>=5?.25+s.random()*.25:0,dark:k>=3?9+s.random()*3:-1}));
 let r=-1,clockV=0,stopped=[null,null],state='wait',waitT=0,result=null,boom=0;
 const nextRound=()=>{r++;if(r>=BOMB_ROUNDS){phase='end';endT=0;const [a,b]=score;endText=a===b?'BOTH LICENSED TO DEFUSE':`${s.players[a>b?0:1].name.toUpperCase()} SAVES FORT KNOX`;jingle([523,659,784,1047],{step:.1,type:'triangle',vol:.04});return;}
  clockV=rounds[r].start;stopped=[null,null];state='wait';waitT=1.1;result=null;};
 const stop=i=>{if(phase!=='play'||state!=='run'||stopped[i]!==null)return;stopped[i]=clockV;snd(660,.08,{type:'square',vol:.04});fx.ring(vp(i).x+vp(i).w/2,vp(i).y+vp(i).h/2,{color:GOLD,r1:80,life:.3});if(stopped[0]!==null&&stopped[1]!==null)settleRound();};
 function settleRound(){state='done';waitT=2.2;const pts=[0,1].map(i=>stopped[i]===null||stopped[i]<=0?0:bombPoints(Math.abs(stopped[i]-7)));score[0]+=pts[0];score[1]+=pts[1];result=pts;
  for(let i=0;i<2;i++){const v=vp(i);fx.pop(v.x+v.w/2,v.y+v.h*.3,stopped[i]===null||stopped[i]<=0?'BOOM':pts[i]===5?'007! +5':pts[i]?`+${pts[i]}`:'TOO FAR',{color:pts[i]>=4?GOLD:pts[i]?'#fff':'#ff6a6a',stroke:INK,size:Math.min(v.w,v.h)*.1});if(pts[i]>=4)s.react(i,'happy');else if(!pts[i])s.react(i,'sad');}
  if(pts[0]===5||pts[1]===5)jingle([784,988,1175,1568],{step:.06,type:'triangle',vol:.045});}
 arenaTouch(s,{owner,maxFingers:1,onDown:f=>stop(f.owner)});kb.onDown((i,k)=>{if(k==='fire')stop(i);});
 s.debug={get phase(){return phase;},get state(){return state;},get clock(){return clockV;},score,stop,rounds};
 // vs CPU: agent 2 stops its read-out near 0:07, with a wider error on Easy and once the display goes dark
 const cpu=isCpu(s);let cpuAim=null,cpuR=-1;
 function cpuBomb(){if(state!=='run'||stopped[1]!==null)return;const sk=cpuSkill(s),R0=rounds[r];if(cpuR!==r){cpuR=r;const spread=(1.1-sk)*(R0.dark>0?1.1:.55)+R0.accel*.6;cpuAim=7+(Math.random()-.45)*spread*2;}if(clockV<=cpuAim)stop(1);}
 const fmt=v=>{const c2=Math.max(0,v),sec=Math.floor(c2),cs=Math.floor((c2-sec)*100);return `0:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;};
 function digits(txt,cx,cy,size,col,dim=false){x.save();x.font=`900 ${size}px "Courier New",monospace`;x.textAlign='center';x.textBaseline='middle';const w=x.measureText(txt).width+size*.6;x.fillStyle='#060404';rr(x,cx-w/2,cy-size*.65,w,size*1.3,size*.15);x.fill();x.strokeStyle='#3a3d44';x.lineWidth=3;x.stroke();
  x.fillStyle='rgba(255,40,40,.12)';x.fillText('8:88.88',cx,cy);x.fillStyle=dim?'#5a1010':col;x.shadowColor=col;x.shadowBlur=dim?0:size*.3;x.fillText(txt,cx,cy);x.restore();}
 s.frame(dt=>{t+=dt;fx.update(dt);boom=Math.max(0,boom-dt);
  if(phase==='count'){if(!cd.update(dt)){phase='play';nextRound();}}
  else if(phase==='play'){const R0=rounds[r];
   if(state==='wait'){waitT-=dt;if(waitT<=0){state='run';snd(330,.1,{type:'square',vol:.035});}}
   else if(state==='run'){if(cpu)cpuBomb();const before=clockV;clockV-=dt*(R0.rate+R0.accel*(R0.start-clockV));if(Math.floor(before)!==Math.floor(clockV)&&clockV>0)snd(clockV<8?1400:1000,.03,{type:'square',vol:.025});
    if(clockV<=0){clockV=0;boom=1;fx.shake(16);noise(.8,{vol:.09,freq:200});snd(80,.8,{type:'sawtooth',vol:.06,to:30});settleRound();}}
   else if(state==='done'){waitT-=dt;if(waitT<=0)nextRound();}}
  else{endT+=dt;if(endT>2.6){s.finish(score,`Stop the Bomb at 007: ${s.players[0].name} ${score[0]}, ${s.players[1].name} ${score[1]}.`);return;}}
  s.setScores(score);fx.begin(x);
  const g=x.createLinearGradient(0,0,0,s.H);g.addColorStop(0,'#2a2410');g.addColorStop(1,'#0e0c06');x.fillStyle=g;x.fillRect(0,0,s.W,s.H);
  // gold bars stacked in the vault
  for(let k=0;k<24;k++){const bx=(k%8)*s.W/8+(Math.floor(k/8)%2)*s.W/16,by=s.H-14-Math.floor(k/8)*14;x.fillStyle=k%3?'#b8902a':'#e8c45a';x.fillRect(bx+4,by,s.W/8-8,12);}
  const R0=rounds[Math.max(0,Math.min(BOMB_ROUNDS-1,r))],dark=phase==='play'&&state==='run'&&R0.dark>0&&clockV<R0.dark;
  for(let i=0;i<2;i++){const v=vp(i),hs=Math.min(v.w,v.h)*.2,cx=v.x+v.w*(side()?.5:.24),cy=v.y+v.h*(side()?.72:.55);
   if(stopped[i]===null&&state==='run'){x.fillStyle=`rgba(232,196,90,${.05+.04*Math.sin(t*5)})`;x.fillRect(v.x,v.y,v.w,v.h);}
   s.sprite(x,i,cx,cy-hs*.15,hs,{exact:true,mood:result?(result[i]>=4?'happy':result[i]?undefined:'sad'):undefined});
   const rx=v.x+v.w*(side()?.5:.7),ry=v.y+v.h*(side()?.88:.55),sz=Math.min(v.w*.09,v.h*.12,40);
   const show=stopped[i]===null?(state==='done'?'BOOM':'--:--.--'):(state==='done'||!dark?fmt(stopped[i]):'??:??.??');
   digits(stopped[i]===null&&state!=='done'?'TAP':show,rx,ry,sz,stopped[i]!==null?GOLD:'#ff4040',stopped[i]===null&&state!=='done'&&state!=='run');
   hud(x,s,i,v,`${s.players[i].name.toUpperCase()}  ${score[i]}`,state==='run'&&stopped[i]===null?'TAP TO STOP':'');}
  divider(x,s,side);
  // the device, centred (over the divider)
  const S=Math.min(s.W,s.H)*(side()?.34:.2),cx=side()?s.W/2:s.W*.5,cy=side()?s.H*.34:s.H/2;
  x.fillStyle='#3a3d44';rr(x,cx-S*.8,cy-S*.55,S*1.6,S*1.1,S*.12);x.fill();x.strokeStyle=INK;x.lineWidth=4;x.stroke();
  for(let k=0;k<6;k++){x.strokeStyle=['#c8161d','#3a8fd8','#e8c45a'][k%3];x.lineWidth=3;x.beginPath();x.moveTo(cx-S*.7+k*S*.28,cy+S*.55);x.quadraticCurveTo(cx-S*.6+k*S*.25,cy+S*.8,cx-S*.75+k*S*.3,cy+S*.95);x.stroke();}
  x.fillStyle='#d9d4c8';x.beginPath();x.arc(cx-S*.55,cy-S*.3,S*.1,0,7);x.arc(cx+S*.55,cy-S*.3,S*.1,0,7);x.fill();
  const txt=phase==='play'?(state==='wait'?fmt(R0.start):dark?(Math.floor(t*6)%2?'--:--.--':'  :  .  '):fmt(clockV)):phase==='end'?'0:07.00':'0:00.00';
  digits(txt,cx,cy+S*.08,S*.32,'#ff3030');outlined(x,phase==='play'?`ROUND ${r+1}/${BOMB_ROUNDS}`:'FORT KNOX',cx,cy-S*.38,{size:S*.11,fill:GOLD,stroke:INK});
  outlined(x,'TARGET 0:07.00',cx,cy+S*.42,{size:S*.09,fill:'#fff',stroke:INK});
  fx.draw(x);fx.end(x);
  if(boom>0){x.fillStyle=`rgba(255,${180*boom|0},60,${boom*.7})`;x.fillRect(0,0,s.W,s.H);}
  if(phase==='count')cd.draw(x,s.W,s.H);if(phase==='end')endBanner(x,s,endText);
 });
}
Object.assign(exports,{bondLaser,bondFunhouse,bondBomb,heistPlan,beamAt,bombPoints});
