// Idiocracy · Brawndo Fruit Merge. Suika-style physics merge, both players at once on their own jar.
// Drag on your half to move the dropper, lift to drop. Two equal fruits that touch merge into the next one up;
// two of the biggest (your rival's head) explode for a jackpot. Fruit that sits over the line too long tops you out.
const {clamp,seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {label,rr,makeFx,makeShake,sfx,halfPointers,keyboard,voice}=require("src/engines/tarantinoKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");

const R=[4.6,6.2,7.8,9.6,11.6,13.8,16.2,18.6,21.4,24.4,28];
const FRUIT=[['🍒','#d6243a'],['🍓','#ff4f6d'],['🍇','#8f4fd8'],['🍊','#ff9a1f'],['🍎','#e8382c'],['🍐','#c9d64a'],['🍑','#ffb38a'],['🍍','#f2c230'],['🥥','#a7744a'],['🍉','#3fae4c'],[null,'#ffe36b']];
const POINTS=[0,1,3,6,10,15,21,28,36,45,55,66];
const JW=100,LINE=26,DUR=90;let JH=150;

async function fruitmerge(s){
 const [c,x]=s.canvas(760,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 const rnd=seededRandom(s.seed+':brawndo'),queue=Array.from({length:600},()=>{const r=rnd();return r<.3?0:r<.55?1:r<.75?2:r<.9?3:4;});
 const fx=makeFx(),shake=makeShake();
 const P=[0,1].map(i=>({i,fruits:[],aim:50,next:0,cool:0,score:0,over:0,out:false,combo:0,comboT:0,merges:0,best:0,flash:0,id:0}));
 let left=DUR,phase='play',endT=0,keysHeld=[{l:0,r:0},{l:0,r:0}];
 s.debug={engine:'fruitmerge',P,get left(){return left;},queue};

 // ------------------------------------------------------------- layout: each jar fits its half
 const L={};
 function layout(){const W=s.W,H=s.H,half=W/2,top=clamp(H*.12,46,84),pad=clamp(half*.06,6,18),aw=half-pad*2,ah=H-top-pad-8;if(!L.fixed){L.fixed=true;JH=clamp(Math.round(ah/aw*JW),120,240);}const sc=Math.min(aw/JW,ah/JH);
  Object.assign(L,{W,H,top,sc,jw:JW*sc,jh:JH*sc,ox:[0,1].map(i=>i*half+(half-JW*sc)/2),oy:top+(ah-JH*sc)/2+4});}
 const toUnit=(i,px)=>(px-L.ox[i])/L.sc;

 // ------------------------------------------------------------- input
 halfPointers(s,{
  down:(i,r)=>{const p=P[i];if(p.out||phase!=='play')return;p.aim=clamp(toUnit(i,r.x),R[queue[p.next]],JW-R[queue[p.next]]);},
  move:(i,r)=>{const p=P[i];if(p.out||phase!=='play')return;p.aim=clamp(toUnit(i,r.x),R[queue[p.next]],JW-R[queue[p.next]]);},
  up:(i,r,{cancelled})=>{if(!cancelled)drop(i);}
 });
 keyboard(s,(i,k,down)=>{if(k==='l'||k==='r')keysHeld[i][k]=down?1:0;if(down&&(k==='act'||k==='d'))drop(i);});

 function drop(i){const p=P[i];if(p.out||phase!=='play'||p.cool>0||s.paused)return;const lv=queue[p.next%queue.length];p.next++;
  p.fruits.push({lv,x:clamp(p.aim+(Math.random()-.5)*.8,R[lv],JW-R[lv]),y:LINE-R[lv]-2,vx:0,vy:20,age:0,id:++p.id,pop:0});p.cool=.45;sfx.whoosh(500,1400,.04,.1);}

 function merge(p,a,b){
  const lv=a.lv+1,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;p.fruits.splice(p.fruits.indexOf(a),1);p.fruits.splice(p.fruits.indexOf(b),1);
  p.combo=p.comboT>0?p.combo+1:1;p.comboT=1.1;p.merges++;
  const sx=L.ox[p.i]+mx*L.sc,sy=L.oy+my*L.sc;
  if(lv>10){const pts=150;p.score+=pts;fx.confetti(sx,sy,60);fx.pop(sx,sy-20,'HEAD JACKPOT +'+pts,{color:'#ffe36b',size:24});shake.kick(14);sfx.fanfare();vibrate(60);s.react(p.i,'happy');s.react(1-p.i,'sad');}
  else{const pts=POINTS[lv]*(p.combo>1?Math.min(4,p.combo):1);p.score+=pts;p.best=Math.max(p.best,lv);
   p.fruits.push({lv,x:mx,y:my,vx:(a.vx+b.vx)/2,vy:Math.min(a.vy,b.vy)-25,age:1,id:++p.id,pop:.25});
   fx.spark(sx,sy,8+lv*2,FRUIT[lv][1],180+lv*20);fx.pop(sx,sy-R[lv]*L.sc,(p.combo>1?`x${Math.min(4,p.combo)} `:'')+'+'+pts,{size:clamp(14+lv*2,14,30),color:p.combo>1?'#9dff5c':'#fff'});
   voice(300+lv*70,.12,.05,'triangle');if(lv>=7){shake.kick(4+lv);vibrate(20);}if(lv===10){fx.ring(sx,sy,{r:10,grow:300,color:'#ffe36b'});sfx.ding(1320);s.react(p.i,'happy');}}
  s.setScores(P.map(q=>q.score));
 }

 function physics(p,dt){
  const F=p.fruits,g=380;
  for(const f of F){f.age+=dt;f.pop=Math.max(0,f.pop-dt);f.vy+=g*dt;f.vx*=1-1.5*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;}
  for(let it=0;it<4;it++){
   for(let a=0;a<F.length;a++)for(let b=a+1;b<F.length;b++){const A=F[a],B=F[b],dx=B.x-A.x,dy=B.y-A.y,rr2=R[A.lv]+R[B.lv],d2=dx*dx+dy*dy;if(d2>=rr2*rr2)continue;
    if(A.lv===B.lv){merge(p,A,B);return physics(p,0);}
    const d=Math.sqrt(d2)||.01,nx=dx/d,ny=dy/d,ov=rr2-d,ma=R[A.lv]**2,mb=R[B.lv]**2,ta=mb/(ma+mb),tb=ma/(ma+mb);
    A.x-=nx*ov*ta;A.y-=ny*ov*ta;B.x+=nx*ov*tb;B.y+=ny*ov*tb;
    const rv=(B.vx-A.vx)*nx+(B.vy-A.vy)*ny;if(rv<0){const j=-(1.15)*rv;A.vx-=nx*j*ta;A.vy-=ny*j*ta;B.vx+=nx*j*tb;B.vy+=ny*j*tb;}}
   for(const f of F){const r=R[f.lv];if(f.x<r){f.x=r;f.vx=Math.abs(f.vx)*.3;}if(f.x>JW-r){f.x=JW-r;f.vx=-Math.abs(f.vx)*.3;}if(f.y>JH-r){f.y=JH-r;if(f.vy>0)f.vy*=-.15;f.vx*=.96;}}
  }
  // top-out check: a settled fruit poking above the line
  const danger=F.some(f=>f.age>1.4&&f.y-R[f.lv]<LINE&&Math.abs(f.vy)<60);p.over=danger?p.over+dt:Math.max(0,p.over-dt*2);
  if(p.over>2.6&&!p.out){p.out=true;p.flash=1;shake.kick(10);sfx.groan();s.react(p.i,'sad');fx.pop(L.ox[p.i]+L.jw/2,L.oy+L.jh*.4,'TOPPED OUT!',{color:'#ff6b6b',size:26,life:1.6});}
 }

 // ------------------------------------------------------------- drawing
 function drawFruit(p,f){const r=R[f.lv]*L.sc*(1+f.pop*.6),px=L.ox[p.i]+f.x*L.sc,py=L.oy+f.y*L.sc,[e,col]=FRUIT[f.lv];
  if(f.lv===10){x.save();x.fillStyle=col;x.beginPath();x.arc(px,py,r,0,7);x.fill();s.sprite(x,1-p.i,px,py,r*2.05,{exact:true,mood:'sad'});x.strokeStyle='#fff7';x.lineWidth=2;x.beginPath();x.arc(px,py,r,0,7);x.stroke();x.restore();return;}
  const gr=x.createRadialGradient(px-r*.35,py-r*.4,r*.1,px,py,r);gr.addColorStop(0,'#ffffffaa');gr.addColorStop(.25,col);gr.addColorStop(1,shade(col));x.fillStyle=gr;x.beginPath();x.arc(px,py,r,0,7);x.fill();
  x.font=`${r*1.25}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillText(e,px,py+r*.06);}
 function shade(h){const n=parseInt(h.slice(1),16);return `rgb(${(n>>16&255)*.55|0},${(n>>8&255)*.55|0},${(n&255)*.55|0})`;}

 function drawJar(p){const ox=L.ox[p.i],oy=L.oy,w=L.jw,h=L.jh,ly=oy+LINE*L.sc;
  x.fillStyle='#0b2a1a';rr(x,ox-6,oy-6,w+12,h+12,14);x.fill();
  const gl=x.createLinearGradient(ox,0,ox+w,0);gl.addColorStop(0,'#1b4d33');gl.addColorStop(.5,'#123826');gl.addColorStop(1,'#1b4d33');x.fillStyle=gl;rr(x,ox,oy,w,h,10);x.fill();
  // lightning bolt watermark
  x.save();x.globalAlpha=.08;x.fillStyle='#b6ff3a';x.beginPath();x.moveTo(ox+w*.55,oy+h*.25);x.lineTo(ox+w*.3,oy+h*.6);x.lineTo(ox+w*.48,oy+h*.6);x.lineTo(ox+w*.4,oy+h*.88);x.lineTo(ox+w*.72,oy+h*.48);x.lineTo(ox+w*.53,oy+h*.48);x.closePath();x.fill();x.restore();
  // danger line
  const warn=p.over>0?(Math.sin(performance.now()/80)*.5+.5):0;x.strokeStyle=p.over>0?`rgba(255,80,80,${.5+warn*.5})`:'#b6ff3a55';x.setLineDash([6,5]);x.lineWidth=2;x.beginPath();x.moveTo(ox+4,ly);x.lineTo(ox+w-4,ly);x.stroke();x.setLineDash([]);
  x.save();x.beginPath();rr(x,ox,oy-40,w,h+40,10);x.clip();
  if(!p.out&&phase==='play'){const lv=queue[p.next%queue.length],ax=ox+p.aim*L.sc;x.strokeStyle='#ffffff30';x.lineWidth=2;x.beginPath();x.moveTo(ax,ly);x.lineTo(ax,oy+h);x.stroke();
   x.globalAlpha=p.cool>0?.35:1;drawFruit(p,{lv,x:p.aim,y:LINE-R[lv]-2,pop:0});x.globalAlpha=1;}
  for(const f of p.fruits)drawFruit(p,f);x.restore();
  x.strokeStyle='#b6ff3a';x.lineWidth=2.5;rr(x,ox,oy,w,h,10);x.stroke();
  if(p.over>0&&!p.out)label(x,Math.max(0,2.6-p.over).toFixed(1),ox+w/2,ly-16,18,{fill:'#ff6b6b'});
  if(p.out){x.fillStyle='#000a';rr(x,ox,oy,w,h,10);x.fill();label(x,'TOPPED OUT',ox+w/2,oy+h*.42,clamp(w*.12,14,30),{fill:'#ff6b6b'});label(x,p.score+' pts',ox+w/2,oy+h*.52,clamp(w*.09,12,24));}
  // header
  const hy=L.top*.5,nx=ox+w-14;label(x,`${s.players[p.i].name}`,ox+4,hy-9,clamp(w*.075,11,18),{align:'left',fill:p.i?'#ff9fc6':'#78b6ff'});label(x,`${p.score}`,ox+4,hy+11,clamp(w*.1,14,26),{align:'left',fill:'#fff'});
  if(!p.out){const nl=queue[(p.next+1)%queue.length];label(x,'NEXT',nx-22,hy-9,10,{fill:'#b6ff3a',align:'right'});drawFruit(p,{lv:nl,x:(nx-L.ox[p.i])/L.sc,y:(hy+8-L.oy)/L.sc,pop:0});}
  if(p.combo>1&&p.comboT>0)label(x,`COMBO x${Math.min(4,p.combo)}`,ox+w/2,oy+h-16,clamp(w*.08,12,20),{fill:'#9dff5c'});
 }

 s.hint('Both play at once. Drag on your half to move the dropper, lift to drop. Two matching fruits merge into the next size up and score; quick chains multiply. Two of the biggest (your rival’s head) explode for +150. Keep fruit below the dashed line or you top out. Keys: A/D + Space, ←/→ + Enter.');
 if(!await s.pass(0,'BRAWNDO: it’s got electrolytes. Both of you drop fruit into your own jar at the same time. Matching fruits merge into bigger ones. The biggest fruit is your rival’s head; merge two for a jackpot. Don’t let the jar overflow the line.','Both ready — merge!',{countdown:3}))return;
 // vs CPU: jar 2 drops onto a matching fruit near the surface when it can, otherwise into the lowest spot
 const cpu=isCpu(s);let cpuT=1.5;
 function cpuThink(dt){const p=P[1];if(p.out||phase!=='play')return;cpuT-=dt;if(cpuT>0||p.cool>0)return;const sk=cpuSkill(s);cpuT=1.25-sk*.75+Math.random()*.4;
  const lv=queue[p.next%queue.length],r=R[lv],top=x=>p.fruits.filter(f=>Math.abs(f.x-x)<R[f.lv]+r).reduce((m,f)=>Math.min(m,f.y-R[f.lv]),JH);
  let best=null,bv=-1e9;for(let ax=r;ax<=JW-r;ax+=4){const surf=top(ax),match=p.fruits.some(f=>f.lv===lv&&Math.abs(f.x-ax)<R[f.lv]+r*.6&&f.y-R[f.lv]<=surf+2);const v=surf*.2+(match?40:0)+(Math.random()-.5)*(1-sk)*40;if(v>bv){bv=v;best=ax;}}
  p.aim=clamp(best??JW/2,r,JW-r);drop(1);}
 s.frame(dt=>{layout();if(cpu)cpuThink(dt);
  if(phase==='play'){left-=dt;
   for(const p of P){p.cool=Math.max(0,p.cool-dt);p.comboT=Math.max(0,p.comboT-dt);const k=keysHeld[p.i];if(k.l||k.r)p.aim=clamp(p.aim+(k.r-k.l)*70*dt,4,JW-4);if(!p.out)physics(p,dt);else for(const f of p.fruits)f.pop=0;}
   if(left<=0||P.every(p=>p.out)){phase='end';endT=1.6;sfx.ding(880);}
  }else{endT-=dt;if(endT<=0&&s.alive){const sc=P.map(p=>p.score);s.finish(sc,sc[0]===sc[1]?`Brawndo Fruit Merge ties ${sc[0]}–${sc[1]}.`:`${s.players[sc[0]>sc[1]?0:1].name} wins Brawndo Fruit Merge ${Math.max(...sc)}–${Math.min(...sc)}.`);return;}}
  fx.step(dt);shake.step(dt);
  const W=L.W,H=L.H;x.save();shake.apply(x);
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#07150e');bg.addColorStop(1,'#123d22');x.fillStyle=bg;x.fillRect(-20,-20,W+40,H+40);
  for(const p of P)drawJar(p);
  label(x,phase==='play'?String(Math.ceil(left)):'TIME',W/2,L.top*.5,clamp(W*.05,16,30),{fill:left<10?'#ff6b6b':'#b6ff3a'});
  fx.draw(x);x.restore();
  s.status(`${Math.ceil(Math.max(0,left))}s · drag your half to aim, lift to drop · merge two heads for +150`);
 });
}
Object.assign(exports,{fruitmerge});
