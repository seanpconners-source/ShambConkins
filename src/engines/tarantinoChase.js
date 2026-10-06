// Death Proof · Stunt Chase. Top-down chase on one shared road: one player drives Stuntman Mike's black Charger and
// tries to ram the other player's white Challenger before the clock runs out; then they swap. Drag sideways on your
// half to steer, tap for nitro. Ramps, oil, traffic and barriers hit both cars.
const {clamp,seededRandom}=require("src/utils.js");
const K=require("src/engines/tarantinoKit.js");
const {label,rr,lerp,filmOverlay,flash,titleCard,subtitle,makeFx,makeShake,makeSlowmo,sfx,voice,noise,halfPointers,keyboard}=K;

const ROUND_TIME=26,ROUNDS=2,BASE=330,CHASER_BONUS=1.025,GAP0=320;
const MIKE_LINES=['Stuntman Mike is not amused.','Death proof. For him, anyway.','That is a lot of Detroit steel.'],ESC_LINES=['Out of gas, out of luck.','The Challenger lives to drift again.','Chaser ran out of road.'];

async function chase(s){
 const [c,x]=s.canvas(900,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();s.queueCanvasFit?.();
 const fx=makeFx(),shake=makeShake(),slow=makeSlowmo(),L={};
 const S={round:0,phase:'card',card:0,t:0,go:0,res:null,over:false,white:0,camY:0,hint:5,wrap:0,obs:[],scroll:0};
 const score=[0,0],roles=[[0,1],[1,0]];// roles[round]=[chaserPlayer,runnerPlayer]
 const mkCar=()=>({y:0,x:0,tx:0,v:BASE,air:0,spin:0,slowT:0,boostT:0,nitro:3,nitroT:0,draft:false,yaw:0,flame:0,hitT:0,kb:0,tapT:0,finger:null,drag:0});
 let car={};// car[player]
 s.debug={engine:'chase',S,get car(){return car;},score};
 const layout=()=>{const W=s.W,H=s.H,U=clamp(Math.min(W/760,H/520),.55,1.4),RW=clamp(Math.min(W*.62,H*.75),190,420);Object.assign(L,{W,H,U,RW,cw:RW*.19,cl:RW*.19*1.95,lane:RW/3});};
 const chaserP=()=>roles[S.round-1][0],runnerP=()=>roles[S.round-1][1];
 function genObstacles(seed){
  const rnd=seededRandom(seed),out=[];let y=520;
  while(y<ROUND_TIME*BASE*1.45+1500){
   const n=rnd()<.3?2:1,used=new Set();
   for(let k=0;k<n;k++){let lane;do{lane=Math.floor(rnd()*3);}while(used.has(lane));used.add(lane);
    const r=rnd(),kind=r<.34?'car':r<.54?'barrier':r<.68?'oil':r<.8?'ramp':'nitro';
    out.push({kind,lane,y:y+rnd()*60,vy:kind==='car'?95+rnd()*60:0,sx:lane,hit:false,dx:0});}
   y+=210+rnd()*190;
  }
  return out;
 }
 function startRound(){
  S.round++;S.phase='card';S.card=0;S.t=0;S.go=0;S.res=null;S.hint=5;S.wrap=0;layout();fx.clear();
  const U=L.U;car={};for(const p of [0,1]){car[p]=mkCar();}
  const ch=chaserP(),ru=runnerP();car[ch].y=0;car[ru].y=GAP0*U;S.camY=GAP0*U/2;
  S.obs=genObstacles(s.seed+':chase'+S.round);
 }
 const half=p=>p*L.W/2;
 const steer=(p,dx)=>{const c=car[p];if(!c||S.phase!=='play')return;c.tx=clamp(c.tx+dx*(L.RW/(L.W*.36))*(p===chaserP()?1:1.05),-L.RW/2+L.cw*.6,L.RW/2-L.cw*.6);};
 halfPointers(s,{down:(i,r)=>{const c=car[i];if(!c)return;c.tapT=performance.now();c.drag=0;},move:(i,r)=>{const c=car[i];if(!c)return;c.drag+=Math.abs(r.x-r.px);steer(i,r.x-r.px);},
  up:(i,r)=>{const c=car[i];if(!c)return;if(c.drag<16&&performance.now()-r.t0<320)nitro(i);}});
 keyboard(s,(i,name,down)=>{const c=car[i];if(!c)return;if(name==='act'){if(down)nitro(i);return;}if(name==='l')c.kb=down?-1:(c.kb<0?0:c.kb);if(name==='r')c.kb=down?1:(c.kb>0?0:c.kb);});
 function nitro(p){const c=car[p];if(S.phase!=='play'||c.nitro<1||c.boostT>0||c.spin>0)return;c.nitro--;c.boostT=.9;c.flame=.9;sfx.whoosh(300,1400,.1,.35);voice(110,.5,.05,'sawtooth',{slide:2.2,lp:900});shake.kick(3);}
 s.hint('Drag sideways anywhere on your half to steer your car; tap to fire a nitro boost (3 charges, grab blue cans for more). Round 1: P1 drives the black Charger and must ram the white Challenger before 26 seconds run out; P2 flees. Then swap. Ramps jump, oil spins you out, traffic slows you. Keys: P1 A/D + Space, P2 arrows + Enter.');
 if(!await s.pass(0,'Stunt Chase: one driver is Stuntman Mike in the black Charger and must ram the other driver\'s white Challenger within 26 seconds. Then you swap roles. Drag to steer, tap for nitro.','Both ready — start your engines',{countdown:3}))return;
 layout();startRound();

 function endRound(kind){
  if(S.phase!=='play')return;S.phase='wrap';S.wrap=0;const ch=chaserP(),ru=runnerP();
  if(kind==='ram'){const bonus=Math.round((ROUND_TIME-S.t)*3);score[ch]+=100+bonus;score[ru]+=Math.floor(S.t*2);S.res={title:'SMASH!',line:MIKE_LINES[Math.floor(Math.random()*3)],winner:ch,t:S.t};
   const a=car[ru];fx.splat(a.x,a.y,{n:0,decal:false});slow.hit(1.2,.18);S.white=1;shake.kick(26);sfx.hit();noise(.6,.2,{f0:2400,f1:150});voice(70,.5,.15,'sine',{slide:.4});car[ru].hitT=.0001;s.react?.(ch,'win');s.react?.(ru,'sad');}
  else{score[ru]+=120;score[ch]+=0;S.res={title:'ESCAPED!',line:ESC_LINES[Math.floor(Math.random()*3)],winner:ru,t:S.t};sfx.fanfare();s.react?.(ru,'win');s.react?.(ch,'sad');}
  s.setScores([...score]);
 }
 const rect=(a,b,ow,ol,cw,cl)=>Math.abs(a.x-b.x)<(ow+cw)/2*.86&&Math.abs(a.y-b.y)<(ol+cl)/2*.86;
 function stepCar(p,dt,role){
  const c=car[p],U=L.U,ch=role==='chase';
  c.boostT=Math.max(0,c.boostT-dt);c.slowT=Math.max(0,c.slowT-dt);c.air=Math.max(0,c.air-dt);c.flame=Math.max(0,c.flame-dt);c.spin=Math.max(0,c.spin-dt);c.nitroT+=dt;
  if(c.nitroT>5.5&&c.nitro<3){c.nitro++;c.nitroT=0;}
  if(c.kb)c.tx=clamp(c.tx+c.kb*L.RW*1.0*dt,-L.RW/2+L.cw*.6,L.RW/2-L.cw*.6);
  const rate=c.spin>0?1.5:ch?5.2:9.5,ox=c.x;c.x+=(c.tx-c.x)*(1-Math.exp(-rate*dt));if(c.spin>0)c.x+=Math.sin(S.t*20)*L.cw*.6*dt*4;
  c.x=clamp(c.x,-L.RW/2+L.cw*.5,L.RW/2-L.cw*.5);c.yaw=lerp(c.yaw,clamp((c.x-ox)/Math.max(dt,.001)/(L.RW*1.2),-.45,.45),.2);
  let vt=BASE*U*(ch?CHASER_BONUS:1)*(c.slowT>0?.55:1)*(c.boostT>0?1.3:1)*(c.air>0?1.06:1)*(c.draft?1.07:1);c.v+=(vt-c.v)*(1-Math.exp(-4*dt));c.y+=c.v*dt;
 }
 function obstacleHit(p,dt){
  const c=car[p],U=L.U;if(c.air>.25)return;
  for(const o of S.obs){if(o.gone)continue;const ox=(o.lane-1)*L.lane,w=o.kind==='car'?L.cw:o.kind==='barrier'?L.lane*.8:o.kind==='oil'?L.cw*1.5:o.kind==='ramp'?L.lane*.78:L.cw*.9,l=o.kind==='car'?L.cl:o.kind==='barrier'?L.cw*.5:o.kind==='oil'?L.cw*1.5:o.kind==='ramp'?L.cl*1.2:L.cw*.9;
   if(!(Math.abs(c.x-ox)<(L.cw+w)/2*.86&&Math.abs(c.y-o.y)<(L.cl+l)/2*.86))continue;
   if(o.kind==='nitro'){o.gone=true;c.nitro=Math.min(5,c.nitro+1);sfx.coin();fx.pop(L.W/2+c.x,sy(c.y)-40,'+NITRO',{color:'#8fe3ff',size:18});}
   else if(o.kind==='ramp'){if(c.air<=0){c.air=.95;sfx.whoosh(200,900,.08,.3);fx.pop(L.W/2+c.x,sy(c.y)-40,'JUMP!',{color:'#fff',size:20});}}
   else if(o.kind==='oil'){if(c.spin<=0){c.spin=.9;sfx.groan();fx.pop(L.W/2+c.x,sy(c.y)-40,'OIL!',{color:'#222',size:22});}}
   else{if(c.slowT<=0){c.slowT=1.1;c.v*=.5;c.boostT=0;shake.kick(10);sfx.hit();fx.spark(L.W/2+c.x,sy(c.y),14,'#ffd9a0',320);fx.pop(L.W/2+c.x,sy(c.y)-40,'CRASH!',{color:'#ff8f80',size:20});if(o.kind==='barrier')o.gone=true;c.x+=(c.x>ox?1:-1)*L.cw*.4;c.tx=c.x;}}
  }
 }
 const sy=y=>L.H*.5-(y-S.camY);
 s.frame((rdt,tt)=>{
  layout();slow.step(rdt);const dt=rdt*(S.phase==='wrap'?slow.k:1);shake.step(rdt);fx.step(dt);S.white=Math.max(0,S.white-rdt*2.4);
  if(S.phase==='card'){S.card+=rdt;if(S.card>=2.4){S.phase='go';S.go=0;}}
  else if(S.phase==='go'){S.go+=rdt;S.camY=(car[chaserP()].y+car[runnerP()].y)/2;if(S.go>1.2){S.phase='play';S.t=0;sfx.draw();}}
  else if(S.phase==='play'||S.phase==='wrap'){
   if(S.phase==='play'){S.t+=dt;S.hint=Math.max(0,S.hint-dt);}
   const ch=chaserP(),ru=runnerP(),C=car[ch],R=car[ru];
   if(S.phase==='play'){
    stepCar(ch,dt,'chase');stepCar(ru,dt,'run');
    const gap=R.y-C.y;C.draft=gap>0&&gap<L.cl*3.5&&Math.abs(C.x-R.x)<L.cw*1.1;
    const maxGap=L.H*.74;if(gap>maxGap)R.y=C.y+maxGap;
    for(const o of S.obs)if(o.kind==='car')o.y+=o.vy*L.U*dt;
    obstacleHit(ch,dt);obstacleHit(ru,dt);
    // ramming
    if(C.air<.3&&R.air<.3&&gap<L.cl*.95&&gap>-L.cl*.5&&Math.abs(C.x-R.x)<L.cw*.86)endRound('ram');
    else if(S.t>=ROUND_TIME)endRound('time');
    for(const p of [ch,ru]){const c=car[p];if(Math.random()<dt*30&&c.air<.3)fx.spark(L.W/2+c.x+(Math.random()-.5)*L.cw*.6,sy(c.y)+L.cl*.5,1,'#c8b79a',60);if(c.boostT>0&&Math.random()<dt*60)fx.spark(L.W/2+c.x,sy(c.y)+L.cl*.55,1,'#8fe3ff',140);}
   } else {S.wrap+=rdt;R.y+=R.v*.35*dt;const sp=S.res?.title==='SMASH!';if(sp){R.x+=Math.sin(S.wrap*12)*dt*60;R.spin=1;}C.y+=C.v*.3*dt;
    if(S.wrap>3.2){if(S.round>=ROUNDS){if(!S.over){S.over=true;const a=score[0],b=score[1];s.finish([a,b],'Stunt Chase');}}else startRound();}}
   const target=(C.y+R.y)/2;S.camY+=(target-S.camY)*(1-Math.exp(-8*dt));
  }
  draw(tt);
 });

 function drawCar(p,tt,role){
  const c=car[p],px=L.W/2+c.x,py=sy(c.y),cw=L.cw,cl=L.cl,air=c.air>0?Math.sin(clamp(c.air/.95,0,1)*Math.PI):0,sc=1+air*.28,black=role==='chase';
  x.save();x.translate(px,py);
  x.fillStyle=`rgba(0,0,0,${.35-air*.15})`;x.beginPath();x.ellipse(air*6,air*14+4,cw*.62,cl*.52,0,0,6.3);x.fill();
  x.translate(0,-air*16);x.rotate(c.yaw+(c.spin>0?Math.sin(S.t*22)*.7+(S.phase==='wrap'?S.wrap*6:0):0)+(c.hitT>0?S.wrap*5:0));x.scale(sc,sc);
  if(c.flame>0){x.fillStyle=`rgba(120,220,255,${c.flame})`;x.beginPath();x.moveTo(-cw*.25,cl*.5);x.lineTo(0,cl*.5+cl*.7*Math.random()*c.flame+cl*.2);x.lineTo(cw*.25,cl*.5);x.fill();}
  const body=black?'#17171c':'#f2f2ee',acc=black?'#d8d8dd':'#16161c';
  x.fillStyle='#0b0b0b';rr(x,-cw*.55,-cl*.36,cw*.18,cl*.24,3);x.fill();rr(x,cw*.37,-cl*.36,cw*.18,cl*.24,3);x.fill();rr(x,-cw*.55,cl*.16,cw*.18,cl*.24,3);x.fill();rr(x,cw*.37,cl*.16,cw*.18,cl*.24,3);x.fill();
  x.fillStyle=body;rr(x,-cw*.5,-cl*.5,cw,cl,cw*.28);x.fill();x.strokeStyle='#00000066';x.lineWidth=1.5;x.stroke();
  x.fillStyle=acc;x.fillRect(-cw*.09,-cl*.5,cw*.07,cl);x.fillRect(cw*.02,-cl*.5,cw*.07,cl);
  x.fillStyle='#2b3a46';rr(x,-cw*.38,-cl*.2,cw*.76,cl*.2,5);x.fill();x.fillStyle='#2b3a46';rr(x,-cw*.36,cl*.12,cw*.72,cl*.12,4);x.fill();
  x.fillStyle=black?'#f4f4f4':'#d94a3a';x.beginPath();x.arc(0,-cl*.38,cw*.09,0,6.3);x.fill();
  x.fillStyle='#ffe9a0';x.fillRect(-cw*.42,-cl*.5,cw*.2,cl*.05);x.fillRect(cw*.22,-cl*.5,cw*.2,cl*.05);x.fillStyle='#ff3b2f';x.fillRect(-cw*.42,cl*.46,cw*.2,cl*.04);x.fillRect(cw*.22,cl*.46,cw*.2,cl*.04);
  s.sprite(x,p,0,-cl*.02,cw*.9,{exact:true,mood:role==='chase'?'angry':(c.spin>0||c.hitT>0)?'sad':'walking'});
  x.restore();
 }
 function drawObs(o){
  if(o.gone)return;const ox=L.W/2+(o.lane-1)*L.lane,oy=sy(o.y);if(oy<-L.cl*2||oy>L.H+L.cl*2)return;const cw=L.cw,cl=L.cl;x.save();x.translate(ox,oy);
  if(o.kind==='car'){x.fillStyle='#0004';x.beginPath();x.ellipse(2,4,cw*.55,cl*.5,0,0,6.3);x.fill();x.fillStyle=['#7a8a5a','#a8743a','#4a6a8a'][(o.lane+Math.floor(o.y/300))%3];rr(x,-cw*.5,-cl*.5,cw,cl,cw*.28);x.fill();x.fillStyle='#223';rr(x,-cw*.36,-cl*.18,cw*.72,cl*.2,4);x.fill();x.fillStyle='#ff3b2f';x.fillRect(-cw*.4,cl*.46,cw*.2,cl*.04);x.fillRect(cw*.2,cl*.46,cw*.2,cl*.04);}
  else if(o.kind==='barrier'){const w=L.lane*.8;for(let k=0;k<5;k++){x.fillStyle=k%2?'#f5f5f5':'#e0502a';x.fillRect(-w/2+k*w/5,-cw*.25,w/5,cw*.5);}x.strokeStyle='#222';x.lineWidth=2;x.strokeRect(-w/2,-cw*.25,w,cw*.5);}
  else if(o.kind==='oil'){x.fillStyle='#0a0a10';x.beginPath();x.ellipse(0,0,cw*.85,cw*.7,.3,0,6.3);x.fill();x.fillStyle='#4a3a6a55';x.beginPath();x.ellipse(-cw*.2,-cw*.1,cw*.4,cw*.2,.3,0,6.3);x.fill();}
  else if(o.kind==='ramp'){const w=L.lane*.78,l=cl*1.2;const g=x.createLinearGradient(0,-l/2,0,l/2);g.addColorStop(0,'#caa14a');g.addColorStop(1,'#7a5a22');x.fillStyle=g;x.fillRect(-w/2,-l/2,w,l);x.strokeStyle='#3a2a10';x.lineWidth=2;x.strokeRect(-w/2,-l/2,w,l);for(let k=0;k<4;k++){x.fillStyle='#fff';x.beginPath();x.moveTo(-w*.2,-l*.3+k*l*.18);x.lineTo(0,-l*.4+k*l*.18);x.lineTo(w*.2,-l*.3+k*l*.18);x.lineTo(w*.2,-l*.2+k*l*.18);x.lineTo(0,-l*.3+k*l*.18);x.lineTo(-w*.2,-l*.2+k*l*.18);x.closePath();x.globalAlpha=.7;x.fill();x.globalAlpha=1;}}
  else{const t=Math.sin(S.scroll*6+o.lane)*.1;x.fillStyle='#2a8fd6';rr(x,-cw*.28,-cw*.36,cw*.56,cw*.72,5);x.fill();x.fillStyle='#fff';x.fillRect(-cw*.08,-cw*.3,cw*.16,cw*.6);x.strokeStyle='#8fe3ff';x.lineWidth=2.5;x.beginPath();x.arc(0,0,cw*(.55+t),0,6.3);x.stroke();}
  x.restore();
 }
 function draw(tt){
  const {W,H,RW,U}=L,left=(W-RW)/2;S.scroll=S.camY;x.save();shake.apply(x);
  // desert shoulders
  x.fillStyle='#b99a64';x.fillRect(-10,-10,W+20,H+20);
  const off=((S.camY*1)%(90*U)+90*U)%(90*U);
  x.fillStyle='#a88b58';for(let i=-1;i<H/(90*U)+2;i++){const y=H-(i*90*U-off)-90*U*.5;x.fillRect(0,y,left,3);x.fillRect(left+RW,y,left,3);}
  // roadside props (hash on world cell)
  const cell=170*U,first=Math.floor((S.camY-H*.6)/cell),last=Math.ceil((S.camY+H*.6)/cell);
  for(let k=first;k<=last;k++)for(const side of [-1,1]){const h=Math.abs(Math.sin(k*12.9898+side*78.233)*43758.5453)%1;if(h<.35)continue;const px=side<0?left*(.15+h*.7):left+RW+left*(.15+(1-h)*.7),py=sy(k*cell+h*cell);
   if(h<.65){x.fillStyle='#00000030';x.beginPath();x.ellipse(px+4,py+6,16*U,10*U,0,0,6.3);x.fill();x.fillStyle='#4f6a3a';x.beginPath();x.arc(px,py,15*U,0,6.3);x.fill();x.fillStyle='#648048';x.beginPath();x.arc(px-3,py-3,9*U,0,6.3);x.fill();}
   else{x.fillStyle='#8a7a66';x.beginPath();x.ellipse(px,py,13*U,9*U,h*3,0,6.3);x.fill();}}
  // road
  x.fillStyle='#34343a';x.fillRect(left,-10,RW,H+20);x.fillStyle='#f0d070';x.fillRect(left-4,-10,4,H+20);x.fillRect(left+RW,-10,4,H+20);
  x.fillStyle='#e8e8e8';const dl=60*U,per=130*U,o2=((S.camY%per)+per)%per;for(let ln=1;ln<3;ln++)for(let i=-1;i<H/per+2;i++){const y=H-(i*per-o2)-per*.5;x.fillRect(left+ln*L.lane-2,y-dl/2,4,dl);}
  x.fillStyle='#ffffff10';for(let i=0;i<30;i++){const hy=((i*97+S.camY*0)%H);x.fillRect(left+((i*53)%RW),hy,2,2);}
  for(const o of S.obs)if(o.kind!=='car')drawObs(o);
  fx.drawDecals(x);
  const ch=chaserP(),ru=runnerP();
  for(const o of S.obs)if(o.kind==='car')drawObs(o);
  drawCar(ru,tt,'run');drawCar(ch,tt,'chase');
  fx.draw(x);
  x.restore();
  // HUD
  const fs=clamp(Math.min(W,H*1.4)*.03,11,20);
  for(let p=0;p<2;p++){const isCh=p===ch,cx=p?W-fs*.6:fs*.6,al=p?'right':'left',c=car[p];
   label(x,s.players[p].name.toUpperCase(),cx,H*.045,fs,{align:al,fill:p?'#ff9fc6':'#78b6ff',stroke:'#000'});
   label(x,isCh?'MIKE · CHASER':'RUNNER',cx,H*.045+fs*1.3,fs*.7,{align:al,fill:isCh?'#ff8f80':'#e8f4ff',stroke:'#000'});
   if(c)for(let k=0;k<5;k++){if(k>=Math.max(3,c.nitro))break;const bx=p?W-fs*.9-k*fs*1.1:fs*.9+k*fs*1.1,by=H*.045+fs*2.7;x.fillStyle=k<c.nitro?'#5fc8ff':'#ffffff22';rr(x,bx-fs*.35,by-fs*.5,fs*.7,fs,3);x.fill();x.strokeStyle='#000';x.lineWidth=1.5;x.stroke();}
   label(x,String(score[p]),cx,H*.045+fs*4.3,fs*1.3,{align:al,fill:'#fff',stroke:'#000'});}
  if(S.phase==='play'||S.phase==='wrap'){const f=clamp(1-S.t/ROUND_TIME,0,1),bw=Math.min(W*.3,200);x.fillStyle='#000a';rr(x,W/2-bw/2-2,H*.03-2,bw+4,14,7);x.fill();x.fillStyle=f>.3?'#e9c84a':'#ff5a3a';rr(x,W/2-bw/2,H*.03,bw*f,10,5);x.fill();label(x,`ROUND ${S.round}/${ROUNDS}`,W/2,H*.03+22,fs*.8,{fill:'#d9bd4a',stroke:'#000'});
   const R=car[ru],C=car[ch],gap=Math.max(0,(R.y-C.y-L.cl)/L.U);label(x,`GAP ${Math.round(gap)}`,W/2,H-fs*1.2,fs*.85,{fill:gap<80?'#ff8f80':'#fff',stroke:'#000'});if(C.draft)label(x,'DRAFTING!',W/2,H-fs*2.6,fs*.9,{fill:'#8fe3ff',stroke:'#000'});}
  if(S.phase==='play'&&S.hint>0){for(let p=0;p<2;p++)label(x,'◀  DRAG TO STEER  ▶  ·  TAP = NITRO',half(p)+W/4,H*.9,fs*.75,{fill:'#fff',stroke:'#000',alpha:Math.min(1,S.hint)});}
  if(S.phase==='go'){label(x,S.go<.9?'READY…':'GO!',W/2,H*.4,clamp(W*.1,28,80),{fill:S.go<.9?'#fff':'#9dffb0',stroke:'#000'});}
  flash(x,W,H,S.white*.85);
  if(S.phase==='wrap'&&S.res){const a=Math.min(1,S.wrap*3);x.fillStyle=`rgba(0,0,0,${.55*a})`;x.fillRect(0,H*.36,W,H*.26);x.globalAlpha=a;label(x,S.res.title,W/2,H*.43,clamp(W*.07,24,56),{fill:S.res.title==='SMASH!'?'#ff5a3a':'#9dffb0',stroke:'#000'});label(x,`${s.players[S.res.winner].name} wins the round · ${S.res.t.toFixed(1)}s`,W/2,H*.51,clamp(W*.03,13,24),{fill:'#fff',stroke:'#000'});subtitle(x,W,H,S.res.line,1,H*.58);x.globalAlpha=1;}
  if(S.phase==='card')titleCard(x,W,H,S.card,{chapter:S.round===1?9:10,title:S.round===1?'DEATH PROOF':'THE TABLES TURN',sub:`${s.players[chaserP()].name} drives the Charger · ${s.players[runnerP()].name} is the Challenger`,life:2.4});
  else filmOverlay(x,W,H,tt,{grain:.3,vignette:.4});
  s.setScores([...score]);s.status(`Round ${S.round}/${ROUNDS} · ${s.players[chaserP()].name} chases, ${s.players[runnerP()].name} flees · ${s.players[0].name} ${score[0]} – ${s.players[1].name} ${score[1]}`);
 }
}
Object.assign(exports,{chase});
