// Taskmaster · Sumo Suit, rebuilt as a top-down sumo bout on a proper dohyo: clay ring with straw tawara, salt
// throw, the gyoji's "HAKKEYOI!", inflatable suits that squash and wobble, slap-charges and ring-outs. Both at once:
// hold and drag on your half like a joystick to shuffle, tap to charge (short cooldown). The ring tightens if a bout
// drags on. First to three bouts.
const {clamp}=require("src/utils.js");
const {voice,noise,makeShake,halfPointers,keyboard,label,SANS}=require("src/engines/tarantinoKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {makeBits}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

const BELT=['#2a6bff','#e8325a'],WIN=3;

async function sumo(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.shared=true;s.updateScores();s.ownHud(true,true);
 const shake=makeShake(),bits=makeBits();const wins=[0,0];let state='wait',t=0,bout=0,ring=1,call=null,R=100,cx=0,cy=0,salt=[];
 const P=[0,1].map(i=>({i,x:0,y:0,vx:0,vy:0,cd:0,dash:0,squash:0,face:i?Math.PI:0,out:false}));
 const keys=[{},{}];
 function place(){for(const p of P){p.x=(p.i?.42:-.42);p.y=0;p.vx=p.vy=0;p.cd=.6;p.dash=0;p.squash=0;p.out=false;p.face=p.i?Math.PI:0;}ring=1;}
 function charge(p){if(state!=='fight'||p.cd>0||p.out)return;const f=[...fingers.values()].find(q=>q.i===p.i);let a=p.face;if(f){const dx=f.x-f.sx,dy=f.y-f.sy;if(Math.hypot(dx,dy)>10)a=Math.atan2(dy,dx);}else{const o=P[1-p.i];a=Math.atan2(o.y-p.y,o.x-p.x);}
  p.vx+=Math.cos(a)*1.25;p.vy+=Math.sin(a)*1.25;p.cd=1.1;p.dash=.25;p.squash=.3;noise(.12,.06,{type:'bandpass',f0:900,f1:300});voice(140,.1,.05,'sine',{slide:.6});}
 const fingers=halfPointers(s,{up:(i,r,{cancelled})=>{if(!cancelled&&r.dist<16&&performance.now()-r.t0<260)charge(P[i]);}});
 keyboard(s,(i,name,down)=>{keys[i][name]=down;if(name==='act'&&down)charge(P[i]);});
 s.hint('P1 left half, P2 right half. Hold and drag like a joystick to shuffle; a quick tap is a slap-charge (short cooldown). Push the other suit out of the straw ring. First to three bouts. Keys: P1 WASD + Space, P2 arrows + Enter.');
 // vs CPU: P2 shuffles toward the human while keeping clear of the straw, and slap-charges at close range
 const cpu=isCpu(s);let cpuTick=0;
 function cpuThink(dt){const me=P[1],o=P[0],k=keys[1];k.l=k.r=k.u=k.d=false;if(state!=='fight'||me.out)return;const sk=cpuSkill(s);
  let ax=o.x-me.x,ay=o.y-me.y;const r=Math.hypot(me.x,me.y);if(r>ring*.55){ax-=me.x/r*(r/ring)*2.2;ay-=me.y/r*(r/ring)*2.2;}
  const m=Math.hypot(ax,ay)||1;k.r=ax/m>.35;k.l=ax/m<-.35;k.d=ay/m>.35;k.u=ay/m<-.35;
  cpuTick-=dt;if(cpuTick<=0){cpuTick=.25;if(me.cd<=0&&Math.hypot(ax,ay)<.75&&s.random()<.25+sk*.6)charge(me);}}
 function step(dt){
  if(cpu)cpuThink(dt);
  if(state==='fight'){t+=dt;if(t>12)ring=Math.max(.72,ring-dt*.02);}
  for(const p of P){p.cd=Math.max(0,p.cd-dt);p.dash=Math.max(0,p.dash-dt);p.squash=Math.max(0,p.squash-dt*2);
   if(state==='fight'&&!p.out){let ax=0,ay=0;const k=keys[p.i];ax=(k.r?1:0)-(k.l?1:0);ay=(k.d?1:0)-(k.u?1:0);const f=[...fingers.values()].find(q=>q.i===p.i);
    if(f){const dx=f.x-f.sx,dy=f.y-f.sy,d=Math.hypot(dx,dy);if(d>8){ax=dx/d*clamp(d/50,0,1);ay=dy/d*clamp(d/50,0,1);}}
    const m=Math.hypot(ax,ay);if(m>0){p.vx+=ax*1.6*dt;p.vy+=ay*1.6*dt;p.face=Math.atan2(ay,ax);}}
   const fr=Math.pow(.18,dt);p.vx*=fr;p.vy*=fr;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  // suits collide: heavy elastic shove (charging suit hits harder)
  const a=P[0],b=P[1],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=.36;
  if(d<min&&d>0){const nx=dx/d,ny=dy/d,ov=min-d;a.x-=nx*ov/2;a.y-=ny*ov/2;b.x+=nx*ov/2;b.y+=ny*ov/2;const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
   if(rv<0){const ka=a.dash>0?1.5:1,kb=b.dash>0?1.5:1,j=-rv*1.7;a.vx-=nx*j*kb*.5;a.vy-=ny*j*kb*.5;b.vx+=nx*j*ka*.5;b.vy+=ny*j*ka*.5;
    if(-rv>.25){a.squash=b.squash=.35;shake.kick(Math.min(10,-rv*14));const X=cx+(a.x+nx*min/2)*R,Y=cy+(a.y+ny*min/2)*R;bits.burst(X,Y,{n:10,speed:120,color:'#e8d2a8',life:.5,size:3});voice(90,.12,.08,'sine',{slide:.5});noise(.08,.07,{f0:1200,f1:300});vibrate(15);}}}
  if(state==='fight')for(const p of P)if(!p.out&&Math.hypot(p.x,p.y)>ring+.02){p.out=true;state='call';call={t:2.6,loser:p.i};wins[1-p.i]++;s.setScores(wins);s.react?.(1-p.i,'win',2);s.react?.(p.i,'sad',2);noise(1.2,.05,{f0:500,f1:2500,type:'bandpass',q:.6});[392,523,659].forEach((f,k)=>voice(f,.16,.05,'triangle',{delay:.2+k*.1}));shake.kick(8);}
 }
 s.frame(dt=>{
  const W=s.W,H=s.H;shake.step(dt);bits.step(dt);for(const g of salt){g.t-=dt;g.x+=g.vx*dt;g.y+=g.vy*dt;g.vy+=300*dt;}salt=salt.filter(g=>g.t>0);
  R=Math.min(W*.42,(H-60)*.42);cx=W/2;cy=48+(H-48)/2;
  if(state==='ready'){call.t-=dt;if(call.t<=0){state='fight';t=0;voice(660,.18,.06,'square');voice(880,.3,.06,'square',{delay:.14});}}
  if(state==='fight'||state==='call')step(dt);
  if(state==='call'){call.t-=dt;if(call.t<=0){if(wins.some(v=>v>=WIN)){state='over';s.finish(wins,`Sumo · ${wins[0]}–${wins[1]}`);return;}bout++;startBout();}}
  // ---- draw
  x.setTransform(1,0,0,1,0,0);const bg=x.createRadialGradient(cx,cy,R*.5,cx,cy,Math.hypot(W,H)*.7);bg.addColorStop(0,'#3a2a1e');bg.addColorStop(1,'#120c08');x.fillStyle=bg;x.fillRect(0,0,W,H);
  if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  // raised square platform
  const S=Math.min(R*1.3,Math.min(W,H-48)*.49);x.fillStyle='#b98a5a';x.fillRect(cx-S,cy-S,S*2,S*2);x.fillStyle='#a07446';x.fillRect(cx-S,cy+S-8,S*2,8);
  // corner tassels (blue/red/white/black)
  [['#2e7d4f',-1,-1],['#c8302c',1,-1],['#f2efe6',1,1],['#1a1a1a',-1,1]].forEach(([col,sx,sy])=>{x.fillStyle=col;x.beginPath();x.arc(cx+sx*S*.92,cy+sy*S*.92,R*.07,0,Math.PI*2);x.fill();});
  // clay ring + tawara
  const cl=x.createRadialGradient(cx,cy,0,cx,cy,R);cl.addColorStop(0,'#e3c08a');cl.addColorStop(1,'#c99d64');x.fillStyle=cl;x.beginPath();x.arc(cx,cy,R*1.12,0,Math.PI*2);x.fill();
  x.strokeStyle='#d9c27a';x.lineWidth=R*.07;x.beginPath();x.arc(cx,cy,R*ring,0,Math.PI*2);x.stroke();x.strokeStyle='#a88a44';x.lineWidth=1.5;for(let k=0;k<48;k++){const a=k/48*Math.PI*2;x.beginPath();x.moveTo(cx+Math.cos(a)*R*ring*.965,cy+Math.sin(a)*R*ring*.965);x.lineTo(cx+Math.cos(a)*R*ring*1.035,cy+Math.sin(a)*R*ring*1.035);x.stroke();}
  if(ring<1){x.strokeStyle='#ffffff22';x.setLineDash([6,8]);x.lineWidth=2;x.beginPath();x.arc(cx,cy,R,0,Math.PI*2);x.stroke();x.setLineDash([]);}
  // shikiri-sen lines
  x.fillStyle='#f4efe6';x.fillRect(cx-R*.2,cy-R*.1,R*.06,R*.2);x.fillRect(cx+R*.14,cy-R*.1,R*.06,R*.2);
  for(const g of salt){x.fillStyle='#ffffff';x.globalAlpha=clamp(g.t,0,1);x.fillRect(g.x,g.y,2,2);}x.globalAlpha=1;
  // suits
  for(const p of [...P].sort((u,v)=>u.y-v.y)){const X=cx+p.x*R,Y=cy+p.y*R,r=R*.19,sq=1+Math.sin(p.squash*30)*p.squash*.35;
   x.save();x.translate(X,Y);x.fillStyle='#0004';x.beginPath();x.ellipse(4,8,r*1.05,r*.8,0,0,Math.PI*2);x.fill();
   x.scale(sq,2-sq);const g=x.createRadialGradient(-r*.3,-r*.4,r*.1,0,0,r);g.addColorStop(0,'#fff3e6');g.addColorStop(.6,'#f2c9a6');g.addColorStop(1,'#c9946e');x.fillStyle=g;x.beginPath();x.arc(0,0,r,0,Math.PI*2);x.fill();
   x.strokeStyle=BELT[p.i];x.lineWidth=r*.28;x.beginPath();x.arc(0,0,r*.72,p.face+Math.PI*.55,p.face+Math.PI*1.45);x.stroke();
   for(const side of [-1,1]){const ha=p.face+side*.95;x.fillStyle='#f0c4a0';x.beginPath();x.arc(Math.cos(ha)*r*.95,Math.sin(ha)*r*.95,r*.3,0,Math.PI*2);x.fill();}
   if(p.dash>0){x.strokeStyle='#ffffffaa';x.lineWidth=3;x.beginPath();x.arc(0,0,r*1.15,p.face-.6,p.face+.6);x.stroke();}
   x.restore();s.sprite(x,p.i,X,Y-r*.1,r*1.35,{exact:true});
   if(p.cd>0&&state==='fight'){x.strokeStyle=BELT[p.i];x.lineWidth=3;x.beginPath();x.arc(X,Y,r*1.25,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-p.cd/1.1));x.stroke();}}
  bits.draw(x);
  x.setTransform(1,0,0,1,0,0);
  for(let i=0;i<2;i++){label(x,s.players[i].name,i?W-130:14,22,16,{fill:BELT[i],align:i?'right':'left',font:`900 16px ${SANS}`});for(let k=0;k<WIN;k++){x.fillStyle=k<wins[i]?BELT[i]:'#ffffff22';x.beginPath();x.arc(i?W-140-k*16:20+k*16,40,5,0,Math.PI*2);x.fill();}}
  if(state==='ready')label(x,call.t>1?'MATTA… ':'HAKKEYOI!',W/2,cy-R*1.15<56?cy:cy-R*.62,clamp(W*.07,22,46),{fill:'#fff3d0',stroke:'#3a1a00'});
  if(state==='fight'&&t<.7)label(x,'NOKOTTA!',W/2,cy-R*.62,clamp(W*.07,22,46),{fill:'#ffd23f',stroke:'#3a1a00',alpha:1-t/.7});
  if(state==='call')label(x,`${s.players[1-call.loser].name.toUpperCase()} WINS THE BOUT`,W/2,cy,clamp(W*.055,16,34),{fill:BELT[1-call.loser],stroke:'#000'});
  s.debug={engine:'sumo',P,state,wins,ring};
 });
 function startBout(){place();state='ready';call={t:1.8};for(let k=0;k<50;k++){const side=k%2?1:-1;salt.push({x:cx+side*R*.5,y:cy-R*.1,vx:(Math.random()-.5)*160-side*60,vy:-120-Math.random()*160,t:1+Math.random()*.6});}noise(.4,.04,{type:'highpass',f0:3000});}
 if(!await s.pass(0,`Sumo! ${s.players[0].name} (blue belt) drags on the LEFT half, ${s.players[1].name} (red belt) on the RIGHT. Drag like a joystick to shuffle, tap to slap-charge. Push the other suit out of the ring. First to three bouts.`,'Both ready — HAKKEYOI!',{countdown:0}))return;
 startBout();
}
Object.assign(exports,{sumo});
