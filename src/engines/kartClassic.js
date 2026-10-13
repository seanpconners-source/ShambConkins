// Classic Mode 7 kart engine: only used when the browser has no WebGL (see kart.js).
// Mario Kart · Rainbow Road. Split-screen (P1 top, P2 bottom) Mode 7-style kart racing: each player's view is a
// perspective floor drawn from a rotated top-down buffer, with billboard karts (driver = player's head), item boxes,
// coins, bananas and shells. No guardrails: drive off the edge and Lakitu fishes you back.
// Modes: 'race' (3 laps of a seeded Rainbow Road loop) and 'battle' (balloon battle on a floating rainbow disc).
const {clamp,seededRandom}=require("src/utils.js");
const {Fx,arenaKeys,arenaTouch,snd,noise,jingle,outlined,rr,FONT,PCOL,PDARK,settle}=require("src/engines/arenaKit.js");

const OW=640,OH=720,KY=640,K=2.2,CAMH=50,CAMBACK=90;
const LAPS=3,RACE_CAP=150,BATTLE_TIME=90,ARENA_R=820;
const ITEMS={mushroom:'🍄',banana:'🍌',shell:'🟢',star:'⭐',lightning:'⚡',coins:'🪙'};

function buildTrack(rand){
 const n=11,pts=[],base=760;
 for(let k=0;k<n;k++){const a=k/n*Math.PI*2,r=base*(.72+rand()*.5)*(k%2?1:.86);pts.push([Math.cos(a)*r*1.25,Math.sin(a)*r]);}
 const out=[];const N=520;
 const cr=(p0,p1,p2,p3,t)=>{const t2=t*t,t3=t2*t;return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);};
 for(let i=0;i<N;i++){const u=i/N*n,k=Math.floor(u),t=u-k,P=j=>pts[(k+j+n)%n];out.push([cr(P(-1)[0],P(0)[0],P(1)[0],P(2)[0],t),cr(P(-1)[1],P(0)[1],P(1)[1],P(2)[1],t)]);}
 const tr={pts:out,n:out.length,nx:[],ny:[],cum:[0],len:0,half:96};
 for(let i=0;i<tr.n;i++){const a=out[(i-1+tr.n)%tr.n],b=out[(i+1)%tr.n],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;tr.nx.push(-dy/l);tr.ny.push(dx/l);}
 for(let i=1;i<=tr.n;i++){const a=out[i-1],b=out[i%tr.n];tr.len+=Math.hypot(b[0]-a[0],b[1]-a[1]);tr.cum.push(tr.len);}
 // item box rows and coins
 tr.boxes=[];for(const f of [.2,.52,.8]){const i=Math.floor(f*tr.n);for(const off of [-.6,-.2,.2,.6])tr.boxes.push({x:out[i][0]+tr.nx[i]*tr.half*off,y:out[i][1]+tr.ny[i]*tr.half*off,t:0});}
 tr.coins=[];for(const f of [.1,.36,.66,.92]){const i0=Math.floor(f*tr.n),off=(rand()-.5)*1.1;for(let k=0;k<5;k++){const i=(i0+k*3)%tr.n;tr.coins.push({x:out[i][0]+tr.nx[i]*tr.half*off,y:out[i][1]+tr.ny[i]*tr.half*off,t:0});}}
 return tr;
}
function nearest(tr,x,y,hint){let best=hint,bd=Infinity;const span=hint<0?tr.n:40;for(let k=-span;k<=span;k++){const i=((hint<0?0:hint)+k+tr.n*4)%tr.n,p=tr.pts[i],d=(p[0]-x)**2+(p[1]-y)**2;if(d<bd){bd=d;best=i;}}
 const p=tr.pts[best],lat=(x-p[0])*tr.nx[best]+(y-p[1])*tr.ny[best];return {i:best,lat,dist:Math.sqrt(bd)};}

async function kartClassic(s){
 const mode=s.game.kartMode==='battle'?'battle':'race';
 const [c,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const tr=mode==='race'?buildTrack(s.random):null,itemSeq=seededRandom(Math.floor(s.random()*1e9));
 const arenaBoxes=[];if(mode==='battle'){for(let k=0;k<8;k++){const a=k/8*Math.PI*2;arenaBoxes.push({x:Math.cos(a)*430,y:Math.sin(a)*430,t:0});}for(const [bx,by] of [[0,-90],[0,90],[-90,0],[90,0]])arenaBoxes.push({x:bx,y:by,t:0});}
 const boxes=mode==='race'?tr.boxes:arenaBoxes,coins=mode==='race'?tr.coins:[];
 const mk=i=>{if(mode==='race'){const k=(tr.n-6)%tr.n,p=tr.pts[k],off=(i?1:-1)*tr.half*.4;const fx=tr.pts[(k+1)%tr.n][0]-p[0],fy=tr.pts[(k+1)%tr.n][1]-p[1];
   return {i,x:p[0]+tr.nx[k]*off,y:p[1]+tr.ny[k]*off,h:Math.atan2(fy,fx),v:0,steer:0,seg:k,lap:0,prog:0,best:0,coins:0,item:null,roll:0,boost:0,star:0,spin:0,shrink:0,fall:0,inv:0,finished:false,finishT:0,balloons:3,out:false,bump:0};}
  return {i,x:i?300:-300,y:0,h:i?Math.PI:0,v:0,steer:0,seg:0,lap:0,prog:0,best:0,coins:0,item:null,roll:0,boost:0,star:0,spin:0,shrink:0,fall:0,inv:0,finished:false,finishT:0,balloons:3,out:false,bump:0};};
 const K2=[mk(0),mk(1)];for(const k of K2){if(mode==='race'){const n=nearest(tr,k.x,k.y,-1);k.seg=n.i;k.startSeg=n.i;}}
 const peels=[],shells=[],fx=new Fx();
 let phase='count',lights=0,clock=0,endT=0,winner=-1,endText='',simT=0;
 const kb=arenaKeys(s),pads=[{steer:null,dx:0,brake:0},{steer:null,dx:0,brake:0}],press=[0,0];
 kb.onDown((i,k)=>{if(k==='u'||k==='fire')press[i]=1;});
 arenaTouch(s,{owner:p=>p.y<s.H/2?0:1,maxFingers:2,
  onDown:f=>{if(f.x>s.W*.6){press[f.owner]=1;f.data.role='item';}else{f.data.role='steer';pads[f.owner].steer=f;}},
  onMove:f=>{if(f.data.role!=='steer')return;const v=f.samples.length>1?(f.y-f.samples[0].y)/Math.max(.016,(performance.now()-f.samples[0].t)/1000):0;if(v<-800&&!f.data.flick&&f.y-f.sy<-20){f.data.flick=true;press[f.owner]=1;}if(f.y-f.sy>-6)f.data.flick=false;},
  onUp:f=>{if(pads[f.owner].steer===f)pads[f.owner].steer=null;}});
 s.hint(mode==='race'?'RAINBOW ROAD: three laps, no guardrails. Your kart accelerates by itself. Touch your half (P1 top, P2 bottom): drag left/right on the left side to steer, drag down to brake, tap the right side (or flick up) to use your item. Drive through ? boxes for items and coins for top speed. Fall off and Lakitu fishes you back. P1 A/D + W or Space; P2 arrows + Up or Enter.':'BALLOON BATTLE: three balloons each on a floating rainbow arena. Hit your rival with shells, bananas or a Star to pop their balloons; falling off costs one too. Last kart with balloons, or the most after 90 seconds, wins. Touch your half (P1 top, P2 bottom): drag on the left side to steer, tap the right side to use your item. P1 A/D + W or Space; P2 arrows + Up or Enter.');

 const sfx={box:()=>jingle([880,1175,1568],{step:.04,type:'square',vol:.03}),coin:()=>{snd(988,.05,{type:'square',vol:.03});snd(1319,.12,{type:'square',vol:.03,delay:.05});},
  boost:()=>{noise(.3,{vol:.05,freq:900});snd(200,.35,{type:'sawtooth',vol:.03,to:700});},spin:()=>{snd(600,.4,{type:'square',vol:.03,to:120});noise(.2,{vol:.05,freq:2000});},
  shell:()=>snd(300,.15,{type:'square',vol:.03,to:600}),fall:()=>snd(800,.7,{type:'triangle',vol:.04,to:120}),pop:()=>{noise(.12,{vol:.08,freq:3000});snd(1200,.08,{type:'square',vol:.03,to:300});},
  lap:()=>jingle([659,784,1047],{step:.08,type:'square',vol:.035}),star:()=>jingle([1047,1319,1568,2093,1568,2093],{step:.06,type:'square',vol:.03}),light:(hi)=>snd(hi?1047:523,hi?.5:.25,{type:'square',vol:.04})};

 // ---------------- helpers
 const rank=k=>mode==='race'?(K2[1-k.i].finished&&!k.finished||K2[1-k.i].prog>k.prog&&!k.finished?2:1):0;
 const giveItem=k=>{const behind=mode==='race'&&rank(k)===2,r=itemSeq();const pool=behind?['mushroom','mushroom','star','shell','lightning','shell']:mode==='battle'?['shell','shell','banana','mushroom','star','banana']:['banana','shell','banana','coins','mushroom','shell'];k.item=pool[Math.floor(r*pool.length)];k.roll=.9;sfx.box();};
 const hit=(k,why)=>{if(k.star>0||k.inv>0||k.fall>0)return false;k.spin=1;k.v*=.25;k.inv=1.6;sfx.spin();s.react(k.i,'sad');k.spinA=0;if(mode==='battle')loseBalloon(k);else if(k.coins>0){k.coins=Math.max(0,k.coins-2);}return true;};
 const loseBalloon=k=>{if(k.balloons<=0)return;k.balloons--;sfx.pop();if(k.balloons<=0){k.out=true;}};
 const useItem=k=>{if(!k.item||k.roll>0||k.fall>0||phase!=='play')return;const it=k.item;k.item=null;const fxd=Math.cos(k.h),fyd=Math.sin(k.h);
  if(it==='mushroom'){k.boost=1.3;sfx.boost();}
  else if(it==='star'){k.star=6;sfx.star();}
  else if(it==='banana'){peels.push({x:k.x-fxd*40,y:k.y-fyd*40,owner:k.i,t:0});snd(400,.1,{type:'square',vol:.03});if(peels.length>8)peels.shift();}
  else if(it==='shell'){shells.push({x:k.x+fxd*34,y:k.y+fyd*34,vx:fxd*560+Math.cos(k.h)*k.v*.3,vy:fyd*560+Math.sin(k.h)*k.v*.3,owner:k.i,t:0});sfx.shell();}
  else if(it==='lightning'){const o=K2[1-k.i];if(o.star<=0){o.shrink=3.5;o.v*=.5;}noise(.4,{vol:.07,freq:500});}
  else if(it==='coins'){k.coins=Math.min(10,k.coins+2);sfx.coin();}};
 const offTrack=k=>{if(mode==='battle')return Math.hypot(k.x,k.y)>ARENA_R;const n=nearest(tr,k.x,k.y,k.seg);return Math.abs(n.lat)>tr.half+14;};
 const respawn=k=>{if(mode==='battle'){const a=Math.atan2(k.y,k.x);k.x=Math.cos(a)*300;k.y=Math.sin(a)*300;k.h=a+Math.PI;}else{const i=k.seg,p=tr.pts[i];k.x=p[0];k.y=p[1];const q=tr.pts[(i+2)%tr.n];k.h=Math.atan2(q[1]-p[1],q[0]-p[0]);}k.v=0;k.fall=0;k.inv=1.5;k.boost=0;};

 function stepKart(k,dt,i){
  // input
  const st=pads[i].steer,kk=kb.state[i];let steer=(kk.r?1:0)-(kk.l?1:0),brake=kk.d?1:0;
  if(st){const dx=st.x-st.sx,dy=st.y-st.sy;steer=clamp(dx/58,-1,1);if(Math.abs(dx)<6)steer=0;if(dy>34)brake=1;}
  k.steer+=(steer-k.steer)*Math.min(1,dt*10);
  if(press[i]){press[i]=0;useItem(k);}
  if(k.roll>0)k.roll-=dt;k.inv=Math.max(0,k.inv-dt);k.star=Math.max(0,k.star-dt);k.boost=Math.max(0,k.boost-dt);k.shrink=Math.max(0,k.shrink-dt);k.bump=Math.max(0,k.bump-dt);
  if(k.out||phase==='end'&&(k.finished||mode==='battle')){k.v*=Math.pow(.3,dt);k.x+=Math.cos(k.h)*k.v*dt;k.y+=Math.sin(k.h)*k.v*dt;return;}
  if(k.fall>0){k.fall+=dt;if(k.fall>1.5)respawn(k);return;}
  if(k.spin>0){k.spin-=dt*1.1;k.v*=Math.pow(.25,dt);k.spinA=(k.spinA||0)+dt*14;}
  else{
   const top=(mode==='battle'?250:300)*(1+k.coins*.02)*(k.star>0?1.22:1)*(k.boost>0?1.45:1)*(k.shrink>0?.72:1);
   if(brake)k.v=Math.max(0,k.v-420*dt);else if(k.v<top)k.v=Math.min(top,k.v+(k.boost>0?600:240)*dt);else k.v=Math.max(top,k.v-200*dt);
   k.h+=k.steer*2.3*dt*clamp(k.v/90,0,1)*(brake?1.3:1);
  }
  k.x+=Math.cos(k.h)*k.v*dt;k.y+=Math.sin(k.h)*k.v*dt;
  if(offTrack(k)){k.fall=.001;sfx.fall();if(mode==='battle')loseBalloon(k);return;}
  if(mode==='race'){const n=nearest(tr,k.x,k.y,k.seg),prevRel=(k.seg-k.startSeg+tr.n)%tr.n;k.seg=n.i;const rel=(k.seg-k.startSeg+tr.n)%tr.n;
   if(prevRel>tr.n*.8&&rel<tr.n*.2&&k.halfway&&!k.finished){k.lap++;k.halfway=false;if(k.lap>=LAPS){k.finished=true;k.finishT=clock;if(winner<0){winner=k.i;s.react(k.i,'win');}jingle([523,659,784,1047,1319],{step:.09,type:'square',vol:.04});}else sfx.lap();}
   if(rel>tr.n*.45&&rel<tr.n*.6)k.halfway=true;
   k.prog=k.finished?LAPS:k.lap+(rel>tr.n*.9&&!k.halfway?0:rel/tr.n);k.best=Math.max(k.best,k.prog);}
  // pickups
  for(const b of boxes)if(b.t<=0&&Math.hypot(b.x-k.x,b.y-k.y)<34){b.t=2.5;if(!k.item)giveItem(k);}
  for(const cn of coins)if(cn.t<=0&&Math.hypot(cn.x-k.x,cn.y-k.y)<28){cn.t=6;k.coins=Math.min(10,k.coins+1);sfx.coin();}
  for(let j=peels.length-1;j>=0;j--){const p=peels[j];if(Math.hypot(p.x-k.x,p.y-k.y)<26){peels.splice(j,1);hit(k,'banana');}}
 }
 function stepWorld(dt){
  for(const b of boxes)if(b.t>0)b.t-=dt;for(const cn of coins)if(cn.t>0)cn.t-=dt;
  for(let j=shells.length-1;j>=0;j--){const sh=shells[j];sh.t+=dt;sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;let gone=sh.t>2.4;
   for(const k of K2){if(sh.t<.25&&k.i===sh.owner)continue;if(Math.hypot(sh.x-k.x,sh.y-k.y)<30&&k.fall<=0){if(hit(k,'shell')||k.star>0)gone=true;}}
   for(let q=peels.length-1;q>=0;q--)if(Math.hypot(peels[q].x-sh.x,peels[q].y-sh.y)<24){peels.splice(q,1);gone=true;}
   if(mode==='battle'&&Math.hypot(sh.x,sh.y)>ARENA_R)gone=true;if(mode==='race'&&Math.abs(nearest(tr,sh.x,sh.y,-1).lat)>tr.half+40)gone=true;if(gone)shells.splice(j,1);}
  // kart-kart bumps
  const [a,b]=K2;const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<32&&a.fall<=0&&b.fall<=0&&!a.out&&!b.out){const nx=(a.x-b.x)/(d||1),ny=(a.y-b.y)/(d||1),push=(32-d)/2+1;a.x+=nx*push;a.y+=ny*push;b.x-=nx*push;b.y-=ny*push;
   if(a.bump<=0&&b.bump<=0){a.bump=b.bump=.5;noise(.08,{vol:.05,freq:600});for(const [p,q] of [[a,b],[b,a]])if(p.star>0&&q.star<=0)hit(q,'star');if(mode==='battle')for(const [p,q] of [[a,b],[b,a]])if(p.boost>0&&q.star<=0&&q.inv<=0&&p.balloons<3){hit(q,'boost');p.balloons++;}}}
 }

 // ---------------- drawing
 const offs=[0,1].map(()=>{const cv=document.createElement('canvas');cv.width=OW;cv.height=OH;return {cv,g:cv.getContext('2d')};});
 const stars=Array.from({length:120},(_,k)=>({x:(k*97.13)%1,y:((k*57.7)%1)**1.4,r:k%7===0?1.6:.8}));
 function renderFloor(o,k){const g=o.g;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,OW,OH);g.translate(OW/2,KY);g.rotate(-Math.PI/2-k.h);g.scale(1/K,1/K);g.translate(-k.x,-k.y);
  if(mode==='race'){const R=OH*K*1.1,n=tr.n;g.lineJoin='round';
   for(let j=0;j<n;j++){const p=tr.pts[j];if(Math.abs(p[0]-k.x)>R||Math.abs(p[1]-k.y)>R)continue;const q=tr.pts[(j+1)%n],h=tr.half,j2=(j+1)%n;
    g.fillStyle=`hsl(${(j*9)%360},88%,${58+((j>>1)%2)*8}%)`;g.beginPath();g.moveTo(p[0]+tr.nx[j]*h,p[1]+tr.ny[j]*h);g.lineTo(q[0]+tr.nx[j2]*h,q[1]+tr.ny[j2]*h);g.lineTo(q[0]-tr.nx[j2]*h,q[1]-tr.ny[j2]*h);g.lineTo(p[0]-tr.nx[j]*h,p[1]-tr.ny[j]*h);g.closePath();g.fill();
    g.fillStyle=j%4<2?'#fff':'#ffe23a';for(const sd of [1,-1]){g.beginPath();g.moveTo(p[0]+tr.nx[j]*h*sd,p[1]+tr.ny[j]*h*sd);g.lineTo(q[0]+tr.nx[j2]*h*sd,q[1]+tr.ny[j2]*h*sd);g.lineTo(q[0]+tr.nx[j2]*(h-9)*sd,q[1]+tr.ny[j2]*(h-9)*sd);g.lineTo(p[0]+tr.nx[j]*(h-9)*sd,p[1]+tr.ny[j]*(h-9)*sd);g.closePath();g.fill();}}
   // start line
   const s0=K2[0].startSeg,p=tr.pts[s0];g.save();g.translate(p[0],p[1]);g.rotate(Math.atan2(tr.ny[s0],tr.nx[s0]));for(let a=-6;a<6;a++)for(let b=0;b<2;b++){g.fillStyle=(a+b)%2?'#111':'#fff';g.fillRect(a*16,b*12-12,16,12);}g.restore();}
  else{const rings=['#ff3b3b','#ff9c2a','#ffe23b','#4cd964','#3aa7ff','#5b4bff','#b45bff'];for(let j=0;j<7;j++){g.fillStyle=rings[j];g.beginPath();g.arc(0,0,ARENA_R-j*(ARENA_R/7.4),0,7);g.fill();}g.fillStyle='rgba(255,255,255,.18)';for(let a=0;a<24;a++){g.beginPath();g.moveTo(0,0);g.arc(0,0,ARENA_R,a*Math.PI/12,a*Math.PI/12+.05);g.fill();}g.strokeStyle='#fff';g.lineWidth=12;g.beginPath();g.arc(0,0,ARENA_R-4,0,7);g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(0,0,40,0,7);g.fill();}
 }
 function drawView(i){
  const vh=Math.floor(s.H/2)-2,v={x:0,y:i?Math.floor(s.H/2)+2:0,w:s.W,h:vh},k=K2[i],o=offs[i],hY=v.y+v.h*.36,F=v.h*.8;
  x.save();x.beginPath();x.rect(v.x,v.y,v.w,v.h);x.clip();
  // space
  const sg=x.createLinearGradient(0,v.y,0,v.y+v.h);sg.addColorStop(0,'#0a0626');sg.addColorStop(.36,'#2a1260');sg.addColorStop(1,'#120a2e');x.fillStyle=sg;x.fillRect(v.x,v.y,v.w,v.h);
  const pan=((k.h/(Math.PI*2))*v.w*2.2%v.w+v.w)%v.w;x.fillStyle='#fff';for(const st of stars){const sx=(st.x*v.w*1.0-pan+v.w*2)%v.w,sy=v.y+st.y*(hY-v.y);x.globalAlpha=.5+.5*Math.sin(simT*2+st.x*40);x.fillRect(v.x+sx,sy,st.r*1.6,st.r*1.6);}x.globalAlpha=1;
  const px=v.x+((v.w*.7-pan*1.3)%(v.w*1.6)+v.w*1.6)%(v.w*1.6)-v.w*.3;x.fillStyle='#7a5bd6';x.beginPath();x.arc(px,v.y+(hY-v.y)*.45,v.h*.12,0,7);x.fill();x.strokeStyle='rgba(201,180,255,.7)';x.lineWidth=v.h*.02;x.beginPath();x.ellipse(px,v.y+(hY-v.y)*.45,v.h*.2,v.h*.035,-.2,0,7);x.stroke();
  // floor (Mode 7)
  renderFloor(o,k);x.imageSmoothingEnabled=true;
  for(let r=Math.ceil(hY)+1;r<v.y+v.h;r++){const dz=r-hY,d=CAMH*F/dz,f=d-CAMBACK,oy=KY-f/K;if(oy<0||oy>=OH)continue;const hw=(v.w/2)*d/F/K,sx0=OW/2-hw,sx1=OW/2+hw,c0=Math.max(0,sx0),c1=Math.min(OW,sx1);if(c1<=c0)continue;
   const dx0=v.x+(c0-sx0)/(sx1-sx0)*v.w,dx1=v.x+(c1-sx0)/(sx1-sx0)*v.w;x.drawImage(o.cv,c0,oy,c1-c0,1,dx0,r,dx1-dx0,1.6);}
  // horizon haze
  const hz=x.createLinearGradient(0,hY,0,hY+v.h*.12);hz.addColorStop(0,'rgba(42,18,96,.9)');hz.addColorStop(1,'rgba(42,18,96,0)');x.fillStyle=hz;x.fillRect(v.x,hY,v.w,v.h*.12);
  // billboards
  const sprites=[],proj=(wx,wy)=>{const dx=wx-k.x,dy=wy-k.y,c=Math.cos(k.h),sn=Math.sin(k.h),f=dx*c+dy*sn,l=-dx*sn+dy*c,d=f+CAMBACK;if(d<12)return null;return {x:v.x+v.w/2+l*F/d,y:hY+CAMH*F/d,s:F/d,d};};
  for(const b of boxes)if(b.t<=0){const p=proj(b.x,b.y);if(p)sprites.push({p,draw:()=>drawBox(p)});}
  for(const cn of coins)if(cn.t<=0){const p=proj(cn.x,cn.y);if(p)sprites.push({p,draw:()=>drawCoin(p)});}
  for(const pe of peels){const p=proj(pe.x,pe.y);if(p)sprites.push({p,draw:()=>{x.font=`${Math.max(6,p.s*30)}px Arial`;x.textAlign='center';x.textBaseline='bottom';x.fillText('🍌',p.x,p.y);}});}
  for(const sh of shells){const p=proj(sh.x,sh.y);if(p)sprites.push({p,draw:()=>drawShell(p)});}
  const o2=K2[1-i];if(!(o2.fall>.9)){const p=proj(o2.x,o2.y);if(p)sprites.push({p,draw:()=>drawKart(o2,p,o2.h-k.h)});}
  sprites.sort((a,b)=>b.p.d-a.p.d);for(const sp of sprites){if(sp.p.y>v.y+v.h+40||sp.p.x<v.x-200||sp.p.x>v.x+v.w+200)continue;sp.draw();}
  // own kart
  const me=proj(k.x+Math.cos(k.h)*.01,k.y+Math.sin(k.h)*.01)||{x:v.x+v.w/2,y:hY+CAMH*F/CAMBACK,s:F/CAMBACK,d:CAMBACK};
  if(k.fall>0){me.y+=k.fall*v.h*.25;me.s*=Math.max(.2,1-k.fall*.5);}drawKart(k,me,0,true);
  if(k.fall>.6){const lx=me.x+30,ly=v.y+v.h*.18+Math.sin(simT*4)*4;x.fillStyle='#fff';x.beginPath();x.ellipse(lx,ly,34,14,0,0,7);x.fill();x.font='26px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('🐢',lx,ly-14);x.strokeStyle='#ddd';x.lineWidth=1.5;x.beginPath();x.moveTo(lx+16,ly-10);x.lineTo(me.x,me.y-30*me.s);x.stroke();}
  if(k.star>0){x.fillStyle=`hsla(${simT*600%360},100%,60%,.18)`;x.fillRect(v.x,v.y,v.w,v.h);}
  drawHUD(i,v);
  x.restore();
 }
 function drawBox(p){const sz=p.s*30;x.save();x.translate(p.x,p.y-sz*.7);x.rotate(Math.sin(simT*2)*.3);x.fillStyle=`hsla(${simT*200%360},90%,62%,.85)`;rr(x,-sz/2,-sz/2,sz,sz,sz*.18);x.fill();x.strokeStyle='#fff';x.lineWidth=Math.max(1,sz*.07);x.stroke();if(sz>8)outlined(x,'?',0,1,{size:sz*.7,fill:'#fff',stroke:'#5a2a8a'});x.restore();}
 function drawCoin(p){const sz=p.s*16;x.save();x.translate(p.x,p.y-sz);x.scale(Math.max(.2,Math.abs(Math.cos(simT*4+p.d*.01))),1);x.fillStyle='#ffd21c';x.beginPath();x.arc(0,0,sz/2,0,7);x.fill();x.strokeStyle='#b07800';x.lineWidth=Math.max(1,sz*.12);x.stroke();x.restore();}
 function drawShell(p){const sz=p.s*20;x.save();x.translate(p.x,p.y-sz*.5);x.fillStyle='#2fbf3a';x.beginPath();x.arc(0,0,sz/2,Math.PI,0);x.fill();x.fillStyle='#fff';x.fillRect(-sz/2,0,sz,sz*.18);x.strokeStyle='#145a1a';x.lineWidth=Math.max(1,sz*.08);x.beginPath();x.arc(0,0,sz/2,Math.PI,0);x.stroke();x.restore();}
 function drawKart(k,p,rel,own=false){const sz=p.s*30*(k.shrink>0?.6:1);if(sz<3)return;x.save();x.translate(p.x,p.y);
  x.rotate(k.spin>0?Math.sin(k.spinA||0)*.6:(own?k.steer*.08:0));if(k.spin>0)x.scale(Math.cos(k.spinA||0)>0?1:-1,1);
  x.globalAlpha=k.inv>0&&(simT*12|0)%2?.55:1;
  // shadow
  x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(0,0,sz*.62,sz*.14,0,0,7);x.fill();
  // body
  x.fillStyle=k.star>0?`hsl(${simT*720%360},90%,60%)`:PCOL[k.i];rr(x,-sz*.5,-sz*.42,sz,sz*.32,sz*.1);x.fill();x.fillStyle=PDARK[k.i];rr(x,-sz*.38,-sz*.56,sz*.76,sz*.18,sz*.06);x.fill();
  x.fillStyle='#222';for(const sd of [-1,1]){rr(x,sd*sz*.5-sz*.13,-sz*.3,sz*.26,sz*.3,sz*.06);x.fill();}
  x.fillStyle='#ff5a2a';if(k.boost>0||k.star>0){for(const sd of [-1,1]){x.beginPath();x.moveTo(sd*sz*.22-sz*.06,-sz*.12);x.lineTo(sd*sz*.22,sz*(.1+Math.random()*.15));x.lineTo(sd*sz*.22+sz*.06,-sz*.12);x.fill();}}
  x.fillStyle='#aaa';x.fillRect(-sz*.3,-sz*.16,sz*.6,sz*.06);
  s.sprite(x,k.i,0,-sz*.86,sz*.78,{exact:true,mood:k.spin>0||k.fall>0?'sad':k.finished?'win':k.star>0||k.boost>0?'happy':undefined});
  if(mode==='battle'&&k.balloons>0){const cols=['#ff3b3b','#ffe23b','#3aa7ff'];for(let b=0;b<k.balloons;b++){const bx=(b-(k.balloons-1)/2)*sz*.42,by=-sz*1.55-Math.abs(bx)*.2+Math.sin(simT*3+b)*sz*.03;x.strokeStyle='#ddd';x.lineWidth=1;x.beginPath();x.moveTo(0,-sz*1.1);x.lineTo(bx,by);x.stroke();x.fillStyle=cols[b];x.beginPath();x.ellipse(bx,by-sz*.14,sz*.17,sz*.21,0,0,7);x.fill();}}
  x.restore();}
 function drawHUD(i,v){const k=K2[i],u=clamp(v.h/224,.6,2.2),size=Math.round(clamp(12*u,10,22)),pad=8*u;
  // item slot
  const bs=size*2.6;x.fillStyle='rgba(10,6,38,.7)';rr(x,v.x+pad,v.y+pad,bs,bs,bs*.2);x.fill();x.strokeStyle='#ffe23a';x.lineWidth=2;x.stroke();
  const it=k.roll>0?Object.keys(ITEMS)[(simT*12|0)%6]:k.item;if(it){x.font=`${bs*.62}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText(ITEMS[it],v.x+pad+bs/2,v.y+pad+bs/2+1);}
  const nx=v.x+pad*2+bs;x.font=`italic 900 ${size}px ${FONT}`;x.textAlign='left';x.textBaseline='top';
  const txt=(t,tx,ty,col='#fff')=>{x.lineWidth=Math.max(3,size*.25);x.strokeStyle='#120a2e';x.strokeText(t,tx,ty);x.fillStyle=col;x.fillText(t,tx,ty);};
  txt(s.players[i].name.toUpperCase(),nx,v.y+pad,PCOL[i]);
  if(mode==='race'){txt(`LAP ${Math.min(LAPS,k.lap+1)}/${LAPS}`,nx,v.y+pad+size*1.2);txt(`🪙 ${k.coins}`,nx,v.y+pad+size*2.4,'#ffd21c');
   const r=rank(k);outlined(x,k.finished?'FINISH!':r===1?'1st':'2nd',v.x+v.w-pad,v.y+v.h-pad,{size:size*2.4,fill:r===1||k.finished?'#ffe23a':'#c9d4ff',stroke:'#120a2e',align:'right',base:'bottom'});
   // minimap
   const mw=Math.min(v.w*.26,150*u),mh=mw*.75,mx=v.x+v.w-pad-mw,my=v.y+pad;x.fillStyle='rgba(10,6,38,.5)';rr(x,mx-4,my-4,mw+8,mh+8,6);x.fill();let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const p of tr.pts){minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);}
   const sc=Math.min(mw/(maxX-minX),mh/(maxY-minY)),mp=(wx,wy)=>[mx+(wx-minX)*sc+(mw-(maxX-minX)*sc)/2,my+(wy-minY)*sc+(mh-(maxY-minY)*sc)/2];x.strokeStyle='rgba(255,255,255,.75)';x.lineWidth=2;x.beginPath();tr.pts.forEach((p,j)=>{if(j%4)return;const [a,b]=mp(p[0],p[1]);j?x.lineTo(a,b):x.moveTo(a,b);});x.closePath();x.stroke();
   for(const q of [K2[1-i],k]){const [a,b]=mp(q.x,q.y);x.fillStyle=PCOL[q.i];x.beginPath();x.arc(a,b,q===k?4:3,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=1;x.stroke();}}
  else{txt(`🎈 ${'●'.repeat(k.balloons)}${'○'.repeat(3-k.balloons)}`,nx,v.y+pad+size*1.2,'#ff8aa8');const left=Math.max(0,BATTLE_TIME-clock);txt(`${Math.floor(left/60)}:${String(Math.ceil(left)%60).padStart(2,'0')}`,nx,v.y+pad+size*2.4);
   if(k.out)outlined(x,'OUT OF BALLOONS',v.x+v.w/2,v.y+v.h*.4,{size:size*1.6,fill:'#ff8aa8',stroke:'#120a2e'});}
  if(k.fall>.6&&!k.out)outlined(x,'LAKITU TO THE RESCUE',v.x+v.w/2,v.y+v.h*.45,{size:size*1.2,fill:'#fff',stroke:'#120a2e'});
  if(phase==='count'){const n=3-Math.floor(lights);x.fillStyle='#222';rr(x,v.x+v.w/2-60*u,v.y+v.h*.18,120*u,34*u,10*u);x.fill();for(let j=0;j<3;j++){const on=lights>j;x.fillStyle=on?(lights>=3?'#3aff5a':'#ff3a3a'):'#550';x.beginPath();x.arc(v.x+v.w/2+(j-1)*36*u,v.y+v.h*.18+17*u,11*u,0,7);x.fill();}}
  if(phase==='play'&&clock<1.2){outlined(x,'GO!',v.x+v.w/2,v.y+v.h*.3,{size:size*3,fill:'#3aff5a',stroke:'#120a2e',alpha:1-clock/1.2});}
  if(clock<7&&phase!=='end'){x.save();x.globalAlpha=.25*clamp(1-(clock-4)/3,0,1);x.fillStyle='#fff';const jr=Math.min(v.h*.15,44);x.beginPath();x.arc(v.x+v.w-jr-pad*1.5,v.y+v.h-jr-pad*5,jr,0,7);x.fill();x.globalAlpha*=2.4;outlined(x,'ITEM',v.x+v.w-jr-pad*1.5,v.y+v.h-jr-pad*5,{size:jr*.4,fill:'#fff',stroke:'#120a2e'});outlined(x,'◀ STEER ▶',v.x+v.w*.2,v.y+v.h*.78,{size:size*.8,fill:'#fff',stroke:'#120a2e'});x.restore();}
 }

 s.debug={get phase(){return phase;},get clock(){return clock;},K2,tr,setClock(v){clock=v;},finishLap(i){const k=K2[i];k.lap=LAPS-1;k.halfway=true;k.seg=(k.startSeg-3+tr.n)%tr.n;const p=tr.pts[k.seg];k.x=p[0];k.y=p[1];}};
 s.frame((dt,t)=>{
  if(!s.alive)return;simT+=dt;
  if(phase==='count'){const before=Math.floor(lights);lights+=dt*1.15;if(Math.floor(lights)!==before&&Math.floor(lights)<=3)sfx.light(Math.floor(lights)>=3);if(lights>=3.3){phase='play';press[0]=press[1]=0;}}
  else{
   if(phase==='play')clock+=dt;
   for(let i=0;i<2;i++)stepKart(K2[i],Math.min(dt,.04),i);stepWorld(Math.min(dt,.04));fx.update(dt);
   if(phase==='play'){
    if(mode==='race'&&(winner>=0||clock>=RACE_CAP)){phase='end';endT=0;if(winner<0){const a=K2[0].best,b=K2[1].best;winner=Math.abs(a-b)<.01?-2:a>b?0:1;}endText=winner===-2?'PHOTO FINISH!':`${s.players[winner].name.toUpperCase()} WINS THE CUP!`;}
    if(mode==='battle'&&(K2.some(k=>k.out)||clock>=BATTLE_TIME)){phase='end';endT=0;const a=K2[0].balloons,b=K2[1].balloons;endText=a===b?'DRAW!':`${s.players[a>b?0:1].name.toUpperCase()} WINS THE BATTLE!`;jingle([523,659,784,1047],{step:.1,type:'square',vol:.04});}
   }else{endT+=dt;if(endT>3){
    if(mode==='race'){const prog=k=>k.finished?100:Math.min(99,Math.round(clamp(k.best/LAPS,0,1)*100)),sc=[prog(K2[0]),prog(K2[1])];if(winner>=0){sc[winner]=100;sc[1-winner]=Math.min(sc[1-winner],99);}
     const desc=k=>k.finished?`${Math.floor(k.finishT/60)}:${(k.finishT%60).toFixed(1).padStart(4,'0')}`:`lap ${Math.min(LAPS,k.lap+1)}`;s.finish(sc,`Rainbow Road: ${s.players[0].name} ${desc(K2[0])}, ${s.players[1].name} ${desc(K2[1])}.`);}
    else s.finish([K2[0].balloons,K2[1].balloons],`Balloon Battle: ${s.players[0].name} ${K2[0].balloons} balloons left, ${s.players[1].name} ${K2[1].balloons}.`);return;}}
  }
  if(mode==='race')s.setScores(K2.map(k=>k.finished?100:Math.min(99,Math.round(clamp(k.best/LAPS,0,1)*100))));else s.setScores([K2[0].balloons,K2[1].balloons]);
  x.fillStyle='#000';x.fillRect(0,0,s.W,s.H);drawView(0);drawView(1);
  x.fillStyle='#120a2e';x.fillRect(0,Math.floor(s.H/2)-2,s.W,4);x.fillStyle='#ffe23a';x.fillRect(0,Math.floor(s.H/2)-.5,s.W,1);
  if(phase==='end'){const a=Math.min(1,endT*3),size=Math.min(s.W*.065,s.H*.065,46);x.save();x.globalAlpha=a;x.fillStyle='rgba(18,10,46,.6)';x.fillRect(0,s.H*.42,s.W,s.H*.16);outlined(x,endText,s.W/2,s.H/2,{size,fill:'#ffe23a',stroke:'#120a2e'});x.restore();}
 });
}
Object.assign(exports,{kartClassic,buildTrack});
