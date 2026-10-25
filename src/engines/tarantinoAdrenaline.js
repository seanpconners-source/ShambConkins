// Pulp Fiction · Adrenaline Shot. Both players are Vincent with a giant needle on their own patient. Drag the needle
// onto the faint marker over the pounding heart, then RELEASE to plunge at the right moment on the dose meter.
// Online (netField): each phone treats its own patient (wide, left; the other one narrow on the right) on its own clock;
// rounds start together (nf.start), the needle streams {r,u,v,d} (tip relative to the patient, in patient widths) and the
// plunge goes over as {e:{pl:[round,result,u,v]}}; a round wraps once both results are in, so both phones score the same.
const {clamp,seededRandom}=require("src/utils.js");
const K=require("src/engines/tarantinoKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");
const {label,rr,lerp,filmOverlay,flash,titleCard,subtitle,makeFx,makeShake,sfx,voice,noise,halfPointers,keyboard}=K;

const ROUNDS=5,LIMITS=[9.5,8.5,7.5,6.8,6.2],MARKER_BASE=[1,.4,.22,.1,0],MARKER_FLASH=[1,.9,.75,.6,.5];
const LINES={bull:['Right in the sternum. Lance would be proud.','Dead centre. She is up!','Textbook. Somebody watched the video.'],chest:['Close enough for a Tuesday.','In the ballpark. Barely.','Fine, fine. She\'s breathing.'],rib:['That\'s a rib, Vincent.','Wrong spot. Crunchy.','Ow. That one was a rib.'],miss:['You stabbed the couch.','Missed her entirely. Impressive.','Needle: meet upholstery.'],slow:['Too slow. She is turning purple.','Hesitation kills, Vincent.']};

async function adrenaline(s){
 const [c,x]=s.canvas(900,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();s.queueCanvasFit?.();
 const rnd=seededRandom(s.seed+':adren'),fx=makeFx(),shake=makeShake(),pickL=(k)=>LINES[k][Math.floor(Math.random()*LINES[k].length)];
 const plan=Array.from({length:ROUNDS},(_,r)=>({u:(rnd()*2-1)*.7,v:(rnd()*2-1)*.7,ph:[rnd()*6.3,rnd()*6.3,rnd()*6.3,rnd()*6.3],f:[.7+rnd()*.5+r*.12,.9+rnd()*.5+r*.14],pw:rnd(),bpm:92+r*14}));
 const mk=()=>({state:'idle',finger:null,tipX:0,tipY:0,tx:0,ty:0,have:false,res:null,plunge:0,jolt:0,kbx:0,kby:0,kbMove:{}});
 const P=[mk(),mk()],score=[0,0],S={round:0,phase:'card',t:0,card:0,left:0,limit:9,over:false,beat:0,pulse:0,flashM:0,white:0,pend:0};
 const L={};
 const nf=netField(s,{hz:15,pack:i=>{const p=P[i];return {r:S.round,u:+((p.tipX-cxOf(i))/L.TW[i]).toFixed(3),v:+((p.tipY-L.cy)/L.TW[i]).toFixed(3),d:p.state==='drag'?1:0};},
  unpack:(i,d)=>{const p=P[i];if(d.r!==S.round||p.state==='done'||!Number.isFinite(d.u))return;p.tx=cxOf(i)+d.u*L.TW[i];p.ty=L.cy+d.v*L.TW[i];p.have=true;p.state=d.d?'drag':'idle';},
  onEvent:e=>{const q=e?.pl;if(!Array.isArray(q)||q[0]!==S.round||P[nf.remote].state==='done')return;const i=nf.remote,p=P[i];p.tipX=p.tx=cxOf(i)+q[2]*L.TW[i];p.tipY=p.ty=L.cy+q[3]*L.TW[i];applyPlunge(i,q[1]);}});
 const me=nf?nf.me:0;
 // each patient has its own strip: X0[i], HW[i] wide (online: yours 64% on the left), TW[i] = its patient's width
 const layout=()=>{const W=s.W,H=s.H,halfW=W/2,HW=nf?(me?[W*.36,W*.64]:[W*.64,W*.36]):[halfW,halfW],X0=nf?(me?[W*.64,0]:[0,W*.64]):[0,halfW],TW=HW.map(w=>Math.min(w,H*.62)*.9);
  Object.assign(L,{W,H,halfW,HW,X0,TW,tw:TW[0],cy:H*.52,head:H*.2,off:clamp(H*.07,26,48),sl:clamp(H*.36,110,250)});};
 const cxOf=i=>L.X0[i]+L.HW[i]/2;
 // target position (wobbling) for round r at time t
 const target=(i,t=S.t)=>{const p=plan[S.round-1]||plan[0],r=S.round||1,tw=L.TW[i],A=tw*(.012+r*.011),cx=cxOf(i),bx=cx+p.u*tw*.14,by=L.cy+p.v*tw*.12;
  return {x:bx+Math.sin(t*p.f[0]*2+p.ph[0])*A*1.2+Math.sin(t*p.f[1]*3.1+p.ph[1])*A*.5,y:by+Math.sin(t*p.f[1]*2.2+p.ph[2])*A*1.1+Math.cos(t*p.f[0]*2.9+p.ph[3])*A*.5};};
 const meter=()=>{const p=plan[S.round-1]||plan[0],period=1.7-.14*(S.round-1),ph=((S.t/period)+p.pw)%1;return ph<.5?ph*2:2-ph*2;};
 const R_CHEST=(i=0)=>L.TW[i]*.2,R_BULL=(i=0)=>L.TW[i]*.045;
 const bounds=i=>[L.X0[i]+6,L.X0[i]+L.HW[i]-6];
 const setTarget=(i,px,py)=>{const [lo,hi]=bounds(i),p=P[i];p.tx=clamp(px,lo,hi);p.ty=clamp(py-L.off,L.H*.12,L.H-8);p.have=true;};
 function startRound(){
  S.round++;S.phase='card';S.card=0;S.t=0;S.limit=LIMITS[S.round-1];S.left=S.limit;S.beat=0;S.pend=0;
  for(let i=0;i<2;i++){const p=P[i];Object.assign(p,{state:'idle',finger:null,res:null,plunge:0,jolt:0,have:false,tipX:cxOf(i),tipY:L.H*.8,tx:cxOf(i),ty:L.H*.8,kbx:0,kby:0});}
  fx.clear();
  if(nf){S.phase='sync';const r=S.round;nf.start('r'+r).then(()=>{if(S.round===r&&S.phase==='sync'){S.phase='card';S.card=0;}});}
 }
 function plungeNow(i,timeout){
  const p=P[i];if(p.state==='done')return;
  let res;
  if(timeout)res={total:0,aim:0,dose:0,speed:0,kind:'slow',line:pickL('slow'),tag:'TOO SLOW'};
  else{
  const tg=target(i),d=Math.hypot(p.tipX-tg.x,p.tipY-tg.y),R=R_CHEST(i),m=meter();
  let aim=Math.round(60*Math.pow(Math.max(0,1-d/R),1.2)),bull=d<R_BULL(i)?10:0;
  const inChest=d<R,rib=!inChest&&d<R*1.9;
  let dose=inChest?Math.round(40*Math.max(0,1-Math.abs(m-.85)/.38)):0,speed=inChest?Math.round(30*clamp(S.left/S.limit,0,1)):0;
  const total=aim+bull+dose+speed;
  const kind=bull?'bull':inChest?'chest':rib?'rib':'miss';
  res={total,aim:aim+bull,dose,speed,kind,line:pickL(kind),tag:kind==='bull'?'BULLSEYE!':kind==='chest'?'IN THE CHEST':kind==='rib'?'RIB!':'MISSED!',dosePct:Math.round(m*100)};
  if(!(inChest))res.total=Math.min(total,aim);
  }
  if(nf)nf.event({pl:[S.round,res,+((p.tipX-cxOf(i))/L.TW[i]).toFixed(3),+((p.tipY-L.cy)/L.TW[i]).toFixed(3)]});
  applyPlunge(i,res);
 }
 // a plunge (this phone's, or the other phone's result) lands: score it and show it
 function applyPlunge(i,res){
  const p=P[i];if(p.state==='done')return;p.state='done';p.finger=null;p.res=res;
  if(res.kind==='slow'){finish(i);return;}
  const kind=res.kind,tg=target(i),tw=L.TW[i];
  p.plunge=.0001;sfx.whoosh(500,1800,.08,.12);
  score[i]+=p.res.total;s.setScores([...score]);
  const px=cxOf(i);
  setTimeout(()=>{if(!s.alive)return;if(kind==='bull'||kind==='chest'){sfx.coin();s.react?.(i,'win');}else{sfx.groan();s.react?.(i,'sad');}},120);
  fx.pop(px,L.cy-tw*.38,p.res.tag,{color:kind==='bull'?'#9dffb0':kind==='chest'?'#ffe48a':'#ff8f80',size:clamp(tw*.11,16,34),life:1.3});
  fx.pop(px,L.cy+tw*.38,'+'+p.res.total,{color:'#fff',size:clamp(tw*.14,18,40),life:1.4});
  if(kind==='bull'||kind==='chest'){p.jolt=1;shake.kick(10);S.white=Math.max(S.white,.25);fx.spark(tg.x,tg.y,16,'#9dffb0',300);fx.ring(tg.x,tg.y,{r:10,grow:260,life:.4,color:'#fff'});}
  else{fx.splat(p.tipX,p.tipY,{n:8,speed:140,size:3,color:'#c4161c'});shake.kick(4);}
  finish(i);
 }
 function finish(i){if(P[0].state==='done'&&P[1].state==='done'&&S.phase==='live'){S.phase='wrap';S.t2=0;}}
 // input
 if(nf)s.debug.bot=()=>{const p=P[me];if(S.phase!=='live'||p.state==='done')return '';const tg=target(me);p.state='drag';p.finger='bot';p.tx=tg.x;p.ty=tg.y;p.have=true;if(S.t>1.2&&Math.abs(meter()-.85)<.2||S.left<.8){plungeNow(me,false);return 'plunge';}return 'aim';};
 halfPointers(s,{chooseOwner:nf?()=>me:undefined,
  down:(i,r)=>{const p=P[i];if(S.phase!=='live'||p.state==='done'||p.finger!==null)return;p.finger=r.id;p.state='drag';setTarget(i,r.x,r.y);},
  move:(i,r)=>{const p=P[i];if(p.finger===r.id)setTarget(i,r.x,r.y);},
  up:(i,r,info)=>{const p=P[i];if(p.finger!==r.id)return;if(info?.cancelled){p.finger=null;p.state='idle';return;}if(S.phase==='live'&&p.state==='drag')plungeNow(i,false);}
 });
 keyboard(s,(i,name,down)=>{if(nf)i=me;const p=P[i];if(name==='act'){if(down&&S.phase==='live'&&p.state==='drag')plungeNow(i,false);return;}p.kbMove[name]=down;if(down&&S.phase==='live'&&p.state==='idle'){p.state='drag';p.finger='kb';p.tx=p.tipX;p.ty=p.tipY;p.have=true;}},{repeat:false});
 s.hint('Drag your needle (anywhere on your half) onto the red marker over the pulsing heart. The marker fades as rounds get harder, so follow the heartbeat. RELEASE to plunge: land it in the chest AND time the release so the dose meter is in the green. Quicker and closer scores more. Keys: P1 WASD to move + Space to plunge, P2 arrows + Enter.');
 if(!await s.pass(0,'Adrenaline Shot: Mia has overdosed. Drag the giant needle onto the marker, then release to plunge when the dose meter hits green. Five rounds, getting shakier.','Both ready — hurry!',{countdown:3}))return;
 // vs CPU: needle 2 tracks the heart marker with a wobble (smaller on Hard) and plunges near the green dose window
 const cpu=isCpu(s);let cpuErr={x:0,y:0},cpuR=0;
 function cpuThink(dt){const p=P[1],sk=cpuSkill(s);if(p.state==='done')return;if(S.t<.45+(1-sk)*.6)return;
  if(p.state==='idle'){p.state='drag';p.finger='cpu';cpuR=S.round;const e=R_CHEST(1)*(1.1-sk)*.9;cpuErr={x:(Math.random()-.5)*e,y:(Math.random()-.5)*e};}
  const tg=target(1);p.tx=tg.x+cpuErr.x;p.ty=tg.y+cpuErr.y;p.have=true;cpuErr.x*=Math.pow(.6,dt*(.4+sk));cpuErr.y*=Math.pow(.6,dt*(.4+sk));
  const m=meter(),close=Math.hypot(p.tipX-tg.x,p.tipY-tg.y)<R_CHEST(1)*(.25+(1-sk)*.4);if(close&&Math.abs(m-.85)<.06+(1-sk)*.12||S.left<.6)plungeNow(1,false);}
 layout();startRound();

 s.frame((dt,tt)=>{
  layout();fx.step(dt);shake.step(dt);S.white=Math.max(0,S.white-dt*2.5);S.pulse=Math.max(0,S.pulse-dt*3.5);S.flashM=Math.max(0,S.flashM-dt*3);
  const p0=plan[Math.max(0,S.round-1)];
  if(S.phase==='card'){S.card+=dt;if(S.card>=1.7){S.phase='live';S.t=0;S.beat=0;}}
  else if(S.phase==='live'||S.phase==='wrap'){
   S.t+=dt;if(S.phase==='live')S.left-=dt;
   S.beat-=dt;if(S.beat<=0){S.beat=60/(p0.bpm+Math.max(0,1-S.left/S.limit)*30);S.pulse=1;S.flashM=1;sfx.thump(.09);voice(S.left<S.limit*.25?1200:880,.05,.018,'square');}
   if(cpu&&S.phase==='live')cpuThink(dt);
   for(let i=0;i<2;i++){const p=P[i];
    if(p.state==='drag'&&p.finger==='kb'){const k=p.kbMove,v=300*dt;p.tx=clamp(p.tx+((k.r?1:0)-(k.l?1:0))*v,...bounds(i));p.ty=clamp(p.ty+((k.d?1:0)-(k.u?1:0))*v,L.H*.12,L.H-8);}
    const e=1-Math.exp(-dt*(p.state==='drag'?20:6));if(p.have){p.tipX=lerp(p.tipX,p.tx,e);p.tipY=lerp(p.tipY,p.ty,e);}
    if(p.state==='drag'&&!(nf&&i===nf.remote)){const tr=L.TW[i]*(.003+.0035*S.round);p.tipX+=Math.sin(tt*37+i)*tr*dt*20;p.tipY+=Math.cos(tt*31+i*2)*tr*dt*20;}
    if(p.plunge>0)p.plunge=Math.min(1,p.plunge+dt*3.2);if(p.jolt>0)p.jolt=Math.max(0,p.jolt-dt*1.6);}
   if(S.phase==='live'&&S.left<=0){if(nf)plungeNow(me,true);else{for(let i=0;i<2;i++)if(P[i].state!=='done')plungeNow(i,true);S.phase='wrap';S.t2=0;}}
   if(S.phase==='wrap'){S.t2+=dt;if(S.t2>2.6){if(S.round>=ROUNDS){if(!S.over){S.over=true;s.finish([...score],'Adrenaline Shot');}}else startRound();}}
  }
  draw(tt);
 });

 function syringe(i,p,tt){
  const sgn=i?1:-1,dx=sgn*.45,dy=1,dl=Math.hypot(dx,dy),th=Math.atan2(-dx/dl,dy/dl),len=L.sl*Math.min(1,L.TW[i]/Math.max(...L.TW)*1.15),t=p.plunge,thrust=t*len*.06;
  x.save();x.translate(p.tipX,p.tipY);x.rotate(th);x.translate(0,-thrust);
  const nl=len*.2,bw=len*.15,bl=len*.5;
  x.fillStyle='#00000030';x.save();x.translate(8,8);x.fillRect(-1,0,2,nl);x.restore();
  x.strokeStyle='#e6edf2';x.lineWidth=Math.max(2,len*.016);x.beginPath();x.moveTo(0,0);x.lineTo(0,nl);x.stroke();x.strokeStyle='#8fa3b0';x.lineWidth=1;x.beginPath();x.moveTo(len*.006,0);x.lineTo(len*.006,nl);x.stroke();
  x.fillStyle='#d94a3a';rr(x,-bw*.22,nl,bw*.44,len*.04,3);x.fill();
  const by=nl+len*.04;x.fillStyle='#e8f6ff';x.globalAlpha=.9;rr(x,-bw/2,by,bw,bl,bw*.18);x.fill();x.globalAlpha=1;
  const fill=1-t*.92,pp=by+bl*fill;x.fillStyle='#ffa530';rr(x,-bw/2+3,by+3,bw-6,Math.max(2,pp-by-3),bw*.12);x.fill();
  x.strokeStyle='#5c7a8c';x.lineWidth=2;rr(x,-bw/2,by,bw,bl,bw*.18);x.stroke();x.lineWidth=1;for(let k=1;k<6;k++){x.beginPath();x.moveTo(-bw/2,by+bl*k/6);x.lineTo(-bw/2+bw*(k%2?.28:.4),by+bl*k/6);x.stroke();}
  x.fillStyle='#cfd8de';x.fillRect(-bw*.08,pp,bw*.16,len*.3);x.fillStyle='#3c4a52';rr(x,-bw*.42,pp-len*.02,bw*.84,len*.03,3);x.fill();
  x.fillStyle='#d94a3a';rr(x,-bw*.6,pp+len*.3,bw*1.2,len*.05,6);x.fill();
  x.fillStyle='#e8f6ff';rr(x,-bw*.9,by+bl-len*.02,bw*1.8,len*.04,5);x.fill();x.strokeStyle='#5c7a8c';x.lineWidth=1.5;rr(x,-bw*.9,by+bl-len*.02,bw*1.8,len*.04,5);x.stroke();
  x.restore();
 }
 function patient(i,tt){
  const cx=cxOf(i),{cy,H}=L,tw=L.TW[i],pulse=S.pulse,p=P[i],dead=S.phase==='live'?clamp(1-S.left/S.limit,0,1):0,jolt=p.jolt;
  x.save();x.translate(cx,0);if(jolt>0)x.translate(0,-Math.sin(jolt*Math.PI)*tw*.05);
  // couch / sheet
  x.fillStyle='#2b3a38';rr(x,-tw*.62,H*.05,tw*1.24,H*.9,tw*.1);x.fill();x.fillStyle='#34463f';rr(x,-tw*.56,H*.08,tw*1.12,H*.84,tw*.08);x.fill();
  // hair + head
  const hy=L.head,hr=tw*.19;x.fillStyle='#0b0b0f';x.beginPath();x.ellipse(0,hy+hr*.05,hr*1.28,hr*1.3,0,0,6.3);x.fill();
  const face=`rgb(${lerp(232,170,dead)|0},${lerp(218,185,dead)|0},${lerp(210,225,dead)|0})`;x.fillStyle=face;x.beginPath();x.ellipse(0,hy+hr*.1,hr*.95,hr*1.05,0,0,6.3);x.fill();
  x.fillStyle='#0b0b0f';x.beginPath();x.moveTo(-hr*1.05,hy-hr*.2);x.quadraticCurveTo(0,hy-hr*1.25,hr*1.05,hy-hr*.2);x.lineTo(hr*.9,hy+hr*.1-hr*.8);x.quadraticCurveTo(0,hy-hr*.55,-hr*.9,hy-hr*.7);x.closePath();x.fill();
  x.strokeStyle='#222';x.lineWidth=2;x.beginPath();x.moveTo(-hr*.5,hy+hr*.05);x.lineTo(-hr*.2,hy+hr*.08);x.moveTo(hr*.2,hy+hr*.08);x.lineTo(hr*.5,hy+hr*.05);x.stroke();
  x.fillStyle=dead>.6?'#5a5bd6':'#6a4ad0';x.beginPath();x.ellipse(0,hy+hr*.62,hr*.3,hr*.1,0,0,6.3);x.fill();
  // shoulders / blouse / chest skin
  x.fillStyle='#0d0d12';rr(x,-tw*.5,L.head+hr*1.15,tw,H*.55,tw*.18);x.fill();
  x.fillStyle=face;x.beginPath();x.ellipse(0,cy-H*.015,tw*.34,tw*.31,0,0,6.3);x.fill();
  x.strokeStyle='#0d0d12';x.lineWidth=tw*.04;x.beginPath();x.ellipse(0,cy-H*.015,tw*.34,tw*.31,0,0,6.3);x.stroke();
  x.restore();
  // heart under the skin (pulses)
  const tg=target(i);x.save();x.translate(tg.x,tg.y);const hs=tw*.12*(1+pulse*.18);x.fillStyle=`rgba(190,60,70,${.2+.18*pulse})`;x.beginPath();x.moveTo(0,hs*.9);x.bezierCurveTo(-hs*1.5,-hs*.2,-hs*.6,-hs*1.2,0,-hs*.4);x.bezierCurveTo(hs*.6,-hs*1.2,hs*1.5,-hs*.2,0,hs*.9);x.fill();
  // marker "X" in felt-tip, flashing on the heartbeat
  const r=S.round||1,a=clamp(MARKER_BASE[r-1]+(MARKER_FLASH[r-1]-MARKER_BASE[r-1])*S.flashM,0,1)*(p.state==='done'?.35:1);
  if(a>.02&&S.phase!=='card'){x.globalAlpha=a;x.strokeStyle='#e0261f';x.lineWidth=Math.max(2.5,tw*.018);x.lineCap='round';const m=tw*.045;x.beginPath();x.arc(0,0,tw*.07,0,6.3);x.moveTo(-m,-m);x.lineTo(m,m);x.moveTo(m,-m);x.lineTo(-m,m);x.stroke();x.globalAlpha=1;}
  x.restore();
 }
 function meterBar(i){
  const mx=i?L.X0[i]+L.HW[i]-26:L.X0[i]+12,my=L.H*.26,mh=L.H*.5,m=meter(),p=P[i];
  x.fillStyle='#000a';rr(x,mx-3,my-3,20,mh+6,8);x.fill();
  const band=(lo,hi,col)=>{x.fillStyle=col;x.fillRect(mx,my+mh*(1-hi),14,mh*(hi-lo));};
  band(0,.55,'#3a3f46');band(.55,.75,'#c9a93a');band(.75,.95,'#3ccf62');band(.95,1,'#d93a2c');
  x.fillStyle='#fff';x.fillRect(mx-2,my+mh*(1-.85)-1,18,3);
  const yy=my+mh*(1-m),done=p.state==='done';x.fillStyle=done?'#888':'#fff';x.beginPath();x.moveTo(mx-6,yy);x.lineTo(mx+20,yy-6);x.lineTo(mx+20,yy+6);x.closePath();x.fill();
  label(x,'DOSE',mx+7,my-14,clamp(L.W*.016,9,13),{fill:'#fff',stroke:'#000'});
 }
 function draw(tt){
  const {W,H,halfW}=L;x.save();shake.apply(x);
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1b2a2a');bg.addColorStop(1,'#0e1517');x.fillStyle=bg;x.fillRect(0,0,W,H);
  for(let i=0;i<2;i++){x.save();x.beginPath();x.rect(L.X0[i],0,L.HW[i],H);x.clip();patient(i,tt);fx.drawDecals(x);
   if(S.phase!=='card'){meterBar(i);syringe(i,P[i],tt);}
   // idle prompt
   if(S.phase==='live'&&P[i].state==='idle')label(x,'DRAG THE NEEDLE TO THE MARK',cxOf(i),H*.965,clamp(W*.017,9,15),{fill:'#fff',stroke:'#000',alpha:.6+.3*Math.sin(tt*5)});
   x.restore();}
  x.strokeStyle='#ffffff30';x.lineWidth=2;x.beginPath();x.moveTo(W/2,0);x.lineTo(W/2,H);x.stroke();
  fx.draw(x);
  // timer + round
  const fs=clamp(Math.min(W,H*1.5)*.03,12,22),frac=clamp(S.left/S.limit,0,1);
  if(S.phase!=='card'){label(x,`ROUND ${S.round}/${ROUNDS}`,W/2,H*.04,fs,{fill:'#d9bd4a',stroke:'#000'});
   x.fillStyle='#000a';rr(x,W/2-clamp(W*.1,40,90),H*.065,clamp(W*.2,80,180),10,5);x.fill();x.fillStyle=frac>.3?'#e9c84a':'#e0301f';rr(x,W/2-clamp(W*.1,40,90),H*.065,clamp(W*.2,80,180)*frac,10,5);x.fill();
   for(let i=0;i<2;i++)label(x,String(score[i]),cxOf(i),H*.045,fs*1.5,{fill:i?'#ff9fc6':'#78b6ff',stroke:'#000'});}
  // results
  if(S.phase==='wrap'||S.phase==='live'){for(let i=0;i<2;i++){const r=P[i].res;if(!r)continue;const a=Math.min(1,(S.phase==='wrap'?S.t2:.6)*3);x.globalAlpha=a;
    if(S.phase==='wrap'){x.fillStyle='#000b';rr(x,L.X0[i]+10,H*.74,L.HW[i]-20,H*.2,10);x.fill();label(x,r.tag,cxOf(i),H*.775,fs*1.1,{fill:r.kind==='bull'?'#9dffb0':r.kind==='chest'?'#ffe48a':'#ff8f80',stroke:'#000'});
     label(x,`aim ${r.aim} · dose ${r.dose} · speed ${r.speed}`,cxOf(i),H*.82,fs*.7,{fill:'#fff',stroke:null});
     x.font=`italic 600 ${fs*.78}px Georgia, serif`;x.fillStyle='#f4efd8';x.textAlign='center';x.textBaseline='middle';x.fillText(r.line,cxOf(i),H*.88,L.HW[i]-30);}
    x.globalAlpha=1;}}
  x.restore();flash(x,W,H,S.white*.6);
  if(nf&&(S.phase==='sync'||S.phase==='live'&&P[me].state==='done'&&P[nf.remote].state!=='done'))label(x,`Waiting for ${s.players[nf.remote].name}…`,W/2,H*.12,clamp(W*.04,13,24),{fill:'#fff',stroke:'#000'});
  if(S.phase==='card')titleCard(x,W,H,S.card,{chapter:Math.min(S.round+5,10),title:S.round===1?'THE OVERDOSE':['','THE SHAKES','COLD SWEAT','STEADY, VINCENT','LAST CHANCE'][S.round-1],sub:S.round===1?'Mia has stopped breathing. Find the mark. Plunge.':`round ${S.round} of ${ROUNDS} · the marker fades faster`,life:1.7});
  else filmOverlay(x,W,H,tt,{grain:.3,vignette:.45});
  s.setScores([...score]);s.status(`Round ${S.round}/${ROUNDS} · ${s.players[0].name} ${score[0]} · ${s.players[1].name} ${score[1]}`);
 }
 s.debug={...s.debug,engine:'adren',P,S,score,target:i=>target(i),meter,plan};
}
Object.assign(exports,{adrenaline});
