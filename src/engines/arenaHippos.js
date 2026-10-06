const {clamp}=require("src/utils.js");
const {PCOL,PDARK,PLIGHT,Fx,arenaKeys,arenaTouch,Countdown,banner,outlined,rr,snd,noise,jingle,mmss,gestureHint}=require("src/engines/arenaKit.js");
// Hungry Hungry Heads (after Hungry Hungry Hippos): two hippo mouths at the bottom of each half, a hub spitting marbles
// into the middle. Tap to lunge the neck to that spot, hold to keep the mouth open and steer it, release to recover.
const MARBLE_COLORS=['#ff5a5a','#4fa8ff','#4fd06a','#b47bff','#ff9a3d','#38d6d0','#ff7ac0'];
const HIPPO=['#6f8dff','#ff86b6'],HIPPO_DARK=['#2f46b8','#b8386f'];
const GAME_TIME=60,FRENZY=10;

function geo(W,H){
 const u=clamp(Math.min(W/900,H/500),.55,1.3),pit=clamp(H*.17,62,112),top=clamp(H*.09,34,54),m=10*u;
 const rH=Math.max(26,33*u),y0=top,y1=H-pit;
 return {u,pit,top,m,x0:m,x1:W-m,y0,y1,bx:[W*.25,W*.75],by:H-pit*.38,rM:Math.max(10,13*u),rH,rE:rH*1.18,R:Math.hypot(W*.27,y1-y0)*.95,cx:W/2,cy:(y0+y1)/2,restY:y1+rH*.15};
}
const mkHead=i=>({i,x:0,y:0,state:'rest',tx:0,ty:0,mouth:0,squash:0,cd:0,holdT:0,tired:0,touch:null,score:0,chomps:0,eaten:0,best:0,flash:0,hx:0,hy:-1});

async function hippos(s){
 const [c,x]=s.canvas(900,560,{fill:true});s.body.classList.add('drag-arena-body');s.queueCanvasFit?.();s.shared=true;s.updateScores();
 const rnd=s.random,fx=new Fx();let W=s.W,H=s.H,g=geo(W,H);
 const heads=[mkHead(0),mkHead(1)],marbles=[],cursors=[{x:0,y:0,used:false,down:false},{x:0,y:0,used:false,down:false}];
 let clock=GAME_TIME,phase='intro',over=0,time=0,hubPulse=0,nextGold=[12,30,45],frenzy=false,burstCd=0,intro=new Countdown(3),lastBurstT=0,banner1=0,bannerText='';
 const place=()=>{g=geo(W,H);for(const h of heads){h.x=g.bx[h.i];h.y=g.restY;h.tx=h.x;h.ty=h.y;}cursors[0].x=g.cx-g.R*.3;cursors[1].x=g.cx+g.R*.3;cursors[0].y=cursors[1].y=g.cy;};
 place();
 const kb=arenaKeys(s);
 s.hint('Two hippos, one pile of marbles. TAP on your half to snap your hippo’s neck out to that spot and chomp what is there; HOLD to keep the mouth open and drag it around (it tires after a second). Clumps of marbles give bonus chomps, golden marbles are worth 5, and the last ten seconds count double. P1: WASD moves a cursor, Space lunges; P2: arrows + Enter.');

 const spit=(n,gold=false)=>{
  hubPulse=1;noise(.25,{vol:.08,freq:700});snd(120,.2,{type:'sine',to:60,vol:.08});fx.ring(g.cx,g.cy,{color:'#fff',r1:g.rH*2.4,life:.4,width:5});fx.shake(5);
  for(let k=0;k<n;k++){const a=rnd()*6.283,v=(300+rnd()*420)*g.u;marbles.push({x:g.cx+Math.cos(a)*10,y:g.cy+Math.sin(a)*10,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:g.rM,color:MARBLE_COLORS[Math.floor(rnd()*MARBLE_COLORS.length)],gold:false,value:1,age:0});}
  if(gold){const a=rnd()*6.283,v=300*g.u;marbles.push({x:g.cx,y:g.cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:g.rM*1.25,color:'#ffd23d',gold:true,value:5,age:0});fx.pop(g.cx,g.cy-g.rH*2,'GOLDEN MARBLE!',{color:'#ffe566',size:Math.max(20,g.u*28)});jingle([784,988,1319],{type:'triangle',vol:.04});}
 };

 // ---------- head control
 const clampTarget=(h,px,py)=>{const bx=g.bx[h.i],by=g.by;let dx=px-bx,dy=py-by,d=Math.hypot(dx,dy)||1;const lo=g.pit*.5,hi=g.R;const dd=clamp(d,lo,hi);dy=Math.min(dy,-g.pit*.1)*(dd/d);dx*=dd/d;if(dy>-8){dy=-8;}return {x:bx+dx,y:by+dy};};
 const lunge=(h,px,py)=>{
  if(phase!=='play')return;const t=clampTarget(h,px,py);
  if(h.state==='out'||(h.cd<=0&&h.tired<=0)){if(h.state!=='out')h.cd=.2;h.state='out';h.tx=t.x;h.ty=t.y;h.holdT=0;h.mouth=Math.max(h.mouth,.6);snd(180,.09,{type:'sawtooth',to:420,vol:.03});}
 };
 const touchDown=f=>{const h=heads[f.owner];h.touch={x:f.x,y:f.y};lunge(h,f.x,f.y);};
 arenaTouch(s,{maxFingers:1,onDown:touchDown,onMove:f=>{const h=heads[f.owner];if(h.touch){h.touch.x=f.x;h.touch.y=f.y;if(h.state==='out')lunge(h,f.x,f.y);}},onUp:f=>{heads[f.owner].touch=null;}});
 kb.onDown((i,k)=>{cursors[i].used=true;if(k==='fire'){cursors[i].down=true;heads[i].touch={x:cursors[i].x,y:cursors[i].y};lunge(heads[i],cursors[i].x,cursors[i].y);}});
 kb.onUp((i,k)=>{if(k==='fire'){cursors[i].down=false;heads[i].touch=null;}});

 // ---------- eating / bumping
 const mouthPos=h=>({x:h.x+h.hx*g.rH*.5,y:h.y+h.hy*g.rH*.5});
 const eat=(h,radius)=>{
  const mp=mouthPos(h);let n=0,pts=0,gold=false;
  for(let k=marbles.length-1;k>=0;k--){const m=marbles[k];if(Math.hypot(m.x-mp.x,m.y-mp.y)<radius+m.r*.2){
   marbles.splice(k,1);n++;pts+=m.value*(frenzy?2:1);if(m.gold)gold=true;
   fx.burst(m.x,m.y,{n:m.gold?16:7,color:m.color,speed:240,life:.45,size:3.2*g.u+1,shape:m.gold?'star':'circle'});}}
  if(!n)return 0;
  const bonus=n>=2?n-1:0;pts+=bonus*(frenzy?2:1);h.score+=pts;h.eaten+=n;h.squash=1;h.flash=.25;h.best=Math.max(h.best,n);
  const px=mp.x,py=mp.y-g.rH*.9;
  fx.pop(px,py,gold?`+${pts} GOLD!`:n>=2?`+${pts}  x${n} CHOMP!`:`+${pts}`,{color:gold?'#ffe566':n>=2?'#ffffff':PLIGHT[h.i],size:Math.max(16,g.u*(n>=2||gold?26:20))});
  fx.ring(mp.x,mp.y,{color:'#fff',r1:g.rH*1.6,life:.28});
  snd(300+Math.min(n,6)*70,.12,{type:'square',vol:.04,to:130});noise(.07,{vol:.05,freq:1200});
  if(gold){jingle([880,1175,1568,2093],{type:'triangle',vol:.05,step:.06});fx.shake(10);}else if(n>=3){fx.shake(6);jingle([523,659,784],{type:'triangle',vol:.04,step:.05});}
  s.react?.(h.i,'happy');if(typeof navigator!=='undefined'&&navigator.vibrate&&!gold)try{navigator.vibrate(n>=3?20:8);}catch{}
  return n;
 };
 const bump=(h)=>{
  for(const m of marbles){const dx=m.x-h.x,dy=m.y-h.y,d=Math.hypot(dx,dy),min=g.rH*.95+m.r;if(d<min&&d>0.01){const nx=dx/d,ny=dy/d;m.x=h.x+nx*min;m.y=h.y+ny*min;const sp=Math.hypot(h.vx||0,h.vy||0);const push=Math.max(sp*.75,160*g.u);const vn=m.vx*nx+m.vy*ny;if(vn<push){m.vx+=nx*(push-vn);m.vy+=ny*(push-vn);}if(sp>300*g.u)snd(520+Math.random()*200,.04,{type:'triangle',vol:.025});}}
 };
 const headStep=(h,dt)=>{
  const bx=g.bx[h.i],by=g.by,rest={x:bx,y:g.restY};h.cd=Math.max(0,h.cd-dt);h.tired=Math.max(0,h.tired-dt);h.squash=Math.max(0,h.squash-dt*4);h.flash=Math.max(0,h.flash-dt);
  let goal=null,speed=0;
  if(h.state==='out'){goal={x:h.tx,y:h.ty};speed=2700*g.u;h.mouth=Math.min(1,h.mouth+dt*14);}
  else if(h.state==='chomp'){h.mouth=Math.max(0,h.mouth-dt*9);h.timer-=dt;if(h.timer<=0)h.state=h.touch&&h.tired<=0?'hold':'back';}
  else if(h.state==='hold'){if(!h.touch){h.state='back';}else{const t=clampTarget(h,h.touch.x,h.touch.y);goal=t;speed=1000*g.u;h.mouth=Math.min(.85,h.mouth+dt*10);h.holdT+=dt;if(h.holdT>.95){h.state='back';h.tired=.35;h.cd=.35;}}}
  else if(h.state==='back'||h.state==='rest'){goal=rest;speed=2000*g.u;h.mouth=Math.max(0,h.mouth-dt*9);}
  let moved=0;
  const ox=h.x,oy=h.y;
  if(goal){const dx=goal.x-h.x,dy=goal.y-h.y,d=Math.hypot(dx,dy);
   if(d>1){const step=Math.min(d,speed*dt),n=Math.max(1,Math.ceil(step/(g.rM*.8)));
    for(let k=0;k<n;k++){h.x+=dx/d*step/n;h.y+=dy/d*step/n;const ddx=h.x-bx,ddy=h.y-by,dl=Math.hypot(ddx,ddy)||1;h.hx=ddx/dl;h.hy=ddy/dl;
     h.vx=dx/d*speed;h.vy=dy/d*speed;
     if(h.state==='out'||h.state==='hold')eat(h,g.rE*(h.state==='out'?.62:.8));
     bump(h);}
    moved=step;}
   else if(h.state==='out'){h.x=goal.x;h.y=goal.y;h.state='chomp';h.timer=.12;h.mouth=1;h.holdT=0;eat(h,g.rE);h.vx=h.vy=0;
    if(!h.eaten||true){/* chomp whiff feedback */const n0=h.eaten;void n0;}}
   else if(h.state==='back'&&d<=1.5){h.state='rest';}
  }
  if(!moved){h.vx=0;h.vy=0;}
  const ddx=h.x-bx,ddy=h.y-by,dl=Math.hypot(ddx,ddy);if(dl>8){h.hx=ddx/dl;h.hy=ddy/dl;}
  void ox;void oy;
  if(h.state==='chomp'||h.state==='rest')bump(h);
 };

 // ---------- marbles
 const marblesStep=dt=>{
  const n=2,h=dt/n;
  for(let st=0;st<n;st++){
   for(const m of marbles){
    m.age+=h;m.vx+=(g.cx-m.x)*.42*h;m.vy+=(g.cy-m.y)*.42*h;const d=Math.exp(-.55*h);m.vx*=d;m.vy*=d;
    m.x+=m.vx*h;m.y+=m.vy*h;
    if(m.x<g.x0+m.r){m.x=g.x0+m.r;m.vx=Math.abs(m.vx)*.85;}if(m.x>g.x1-m.r){m.x=g.x1-m.r;m.vx=-Math.abs(m.vx)*.85;}
    if(m.y<g.y0+m.r){m.y=g.y0+m.r;m.vy=Math.abs(m.vy)*.85;}if(m.y>g.y1-m.r){m.y=g.y1-m.r;m.vy=-Math.abs(m.vy)*.85;}
   }
   for(let a=0;a<marbles.length;a++)for(let b=a+1;b<marbles.length;b++){
    const A=marbles[a],B=marbles[b],dx=B.x-A.x,dy=B.y-A.y,min=A.r+B.r,d2=dx*dx+dy*dy;if(d2>=min*min||d2<.0001)continue;
    const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,over=(min-d)/2;A.x-=nx*over;A.y-=ny*over;B.x+=nx*over;B.y+=ny*over;
    const rel=(B.vx-A.vx)*nx+(B.vy-A.vy)*ny;if(rel<0){const j=-rel*.95;A.vx-=nx*j;A.vy-=ny*j;B.vx+=nx*j;B.vy+=ny*j;if(-rel>260*g.u)snd(1100+Math.random()*500,.03,{type:'triangle',vol:.012});}
   }
  }
 };

 // ---------- keyboard cursors
 const cursorStep=dt=>{for(let i=0;i<2;i++){const k=kb.state[i],c=cursors[i],sp=620*g.u;if(k.l||k.r||k.u||k.d)c.used=true;c.x=clamp(c.x+(k.r-k.l)*sp*dt,g.x0,g.x1);c.y=clamp(c.y+(k.d-k.u)*sp*dt,g.y0,g.y1);if(c.down&&heads[i].touch){heads[i].touch.x=c.x;heads[i].touch.y=c.y;if(heads[i].state==='out')lunge(heads[i],c.x,c.y);}}};

 // ---------- update
 const update=dt=>{
  time+=dt;hubPulse=Math.max(0,hubPulse-dt*3);
  if(phase==='intro'){if(!intro.update(dt)){phase='play';spit(15);}}
  else if(phase==='play'){
   clock-=dt;burstCd-=dt;
   if(!frenzy&&clock<=FRENZY){frenzy=true;spit(18);fx.pop(g.cx,g.cy-g.rH*3.5,'DOUBLE POINTS!',{color:'#ff9a3d',size:Math.max(22,g.u*34),life:1.6});jingle([523,659,784,1047],{type:'square',vol:.035,step:.07});}
   while(nextGold.length&&clock<=GAME_TIME-nextGold[0]){nextGold.shift();spit(8,true);}
   if(marbles.filter(m=>!m.gold).length<4&&burstCd<=0){burstCd=2;spit(12);}
   cursorStep(dt);
   if(clock<=0){clock=0;phase='over';over=0;const a=heads[0].score,b=heads[1].score;bannerText=a===b?'DEAD HEAT!':`${s.players[a>b?0:1].name} wins!`;for(const h of heads){h.touch=null;if(h.state==='out'||h.state==='hold')h.state='back';}jingle([523,659,784,1047,1319],{type:'triangle',vol:.05,step:.09});s.react?.(a>=b?0:1,'win');if(a!==b)s.react?.(a>b?1:0,'sad');}
  }
  else{over+=dt;if(over>2.6){s.finish([heads[0].score,heads[1].score],`Hungry Hungry Heads: ${heads[0].score} to ${heads[1].score} (${heads[0].eaten+heads[1].eaten} marbles eaten)`);}}
  for(const h of shuffled())headStep(h,dt);
  marblesStep(dt);fx.update(dt);
  s.setScores([heads[0].score,heads[1].score]);
 };
 const shuffled=()=>Math.random()<.5?heads:[heads[1],heads[0]];

 // ---------- drawing
 const drawBoard=()=>{
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1d7f8c');bg.addColorStop(1,'#14566a');x.fillStyle=bg;x.fillRect(0,0,W,H);
  x.fillStyle='#ffffff10';for(let i=0;i<22;i++){x.beginPath();x.arc((i*137)%W,(i*91)%H,10+((i*13)%26),0,6.283);x.fill();}
  // rim and felt
  rr(x,g.x0-g.m*.6,g.y0-g.m*.6,g.x1-g.x0+g.m*1.2,g.y1-g.y0+g.m*1.2,g.rH);x.fillStyle='#ffd35c';x.fill();
  rr(x,g.x0,g.y0,g.x1-g.x0,g.y1-g.y0,g.rH*.8);const fg=x.createRadialGradient(g.cx,g.cy,10,g.cx,g.cy,Math.max(W,H)*.6);fg.addColorStop(0,'#58c476');fg.addColorStop(1,'#2b8f56');x.fillStyle=fg;x.fill();
  x.save();rr(x,g.x0,g.y0,g.x1-g.x0,g.y1-g.y0,g.rH*.8);x.clip();
  x.strokeStyle='#ffffff18';x.lineWidth=2;for(let r=g.rH*2;r<Math.max(W,H);r+=g.rH*2.4){x.beginPath();x.arc(g.cx,g.cy,r,0,6.283);x.stroke();}
  x.strokeStyle='#ffffff22';x.setLineDash([8,10]);x.beginPath();x.moveTo(g.cx,g.y0);x.lineTo(g.cx,g.y1);x.stroke();x.setLineDash([]);x.restore();
  // pit
  x.fillStyle='#103a4a';x.fillRect(0,g.y1+g.m*.7,W,H);
  for(let i=0;i<2;i++){const bx=g.bx[i];x.fillStyle=HIPPO_DARK[i]+'55';x.beginPath();x.ellipse(bx,g.by+g.pit*.1,g.pit*1.15,g.pit*.55,0,0,6.283);x.fill();}
  // hub
  const hr=g.rH*(1.05+hubPulse*.3);x.fillStyle='#0d3340';x.beginPath();x.arc(g.cx,g.cy,hr+5,0,6.283);x.fill();const hg=x.createRadialGradient(g.cx,g.cy,2,g.cx,g.cy,hr);hg.addColorStop(0,'#ffe27a');hg.addColorStop(1,'#e89a2e');x.fillStyle=hg;x.beginPath();x.arc(g.cx,g.cy,hr,0,6.283);x.fill();
  x.strokeStyle='#fff9';x.lineWidth=3;x.beginPath();x.arc(g.cx,g.cy,hr*.6,0,6.283);x.stroke();
  for(let k=0;k<6;k++){const a=k*1.047+time*.6;x.fillStyle='#fff7';x.beginPath();x.arc(g.cx+Math.cos(a)*hr*.6,g.cy+Math.sin(a)*hr*.6,3,0,6.283);x.fill();}
 };
 const drawMarble=m=>{
  const r=m.r;x.fillStyle='#00000030';x.beginPath();x.ellipse(m.x+r*.15,m.y+r*.3,r,r*.9,0,0,6.283);x.fill();
  if(m.gold){const gl=x.createRadialGradient(m.x,m.y,r*.5,m.x,m.y,r*2.3);gl.addColorStop(0,'#ffe56688');gl.addColorStop(1,'#ffe56600');x.fillStyle=gl;x.beginPath();x.arc(m.x,m.y,r*2.3,0,6.283);x.fill();}
  const gr=x.createRadialGradient(m.x-r*.35,m.y-r*.4,r*.1,m.x,m.y,r);gr.addColorStop(0,'#fff');gr.addColorStop(.25,m.color);gr.addColorStop(1,m.gold?'#b8860b':'#00000066');
  x.fillStyle=m.color;x.beginPath();x.arc(m.x,m.y,r,0,6.283);x.fill();x.fillStyle=gr;x.beginPath();x.arc(m.x,m.y,r,0,6.283);x.fill();
  x.fillStyle='#ffffffcc';x.beginPath();x.ellipse(m.x-r*.35,m.y-r*.4,r*.28,r*.17,-.7,0,6.283);x.fill();
  if(m.gold){x.save();x.translate(m.x,m.y);x.rotate(time*2);x.fillStyle='#fff';x.beginPath();for(let k=0;k<8;k++){const rad=k%2?r*.18:r*.7,an=k*Math.PI/4;x.lineTo(Math.cos(an)*rad,Math.sin(an)*rad);}x.closePath();x.globalAlpha=.55+.4*Math.sin(time*9);x.fill();x.restore();}
 };
 const drawHippo=h=>{
  const i=h.i,bx=g.bx[i],by=g.by,pit=g.pit,hp=HIPPO[i],hd=HIPPO_DARK[i];
  // body
  x.fillStyle=hd;x.beginPath();x.ellipse(bx,by+pit*.08,pit*1.05,pit*.62,0,0,6.283);x.fill();x.fillStyle=hp;x.beginPath();x.ellipse(bx,by,pit*1.0,pit*.58,0,0,6.283);x.fill();
  x.fillStyle='#ffffff30';x.beginPath();x.ellipse(bx-pit*.25,by-pit*.2,pit*.5,pit*.16,-.2,0,6.283);x.fill();
  // neck
  const nx=h.x,ny=h.y,len=Math.hypot(nx-bx,ny-by),nw=g.rH*1.35;
  x.lineCap='round';x.strokeStyle=hd;x.lineWidth=nw+6;x.beginPath();x.moveTo(bx,by);x.lineTo(nx,ny);x.stroke();x.strokeStyle=hp;x.lineWidth=nw;x.beginPath();x.moveTo(bx,by);x.lineTo(nx,ny);x.stroke();
  x.strokeStyle='#ffffff2a';x.lineWidth=nw*.35;x.setLineDash([g.rH*.7,g.rH*.9]);x.lineDashOffset=-len*.5;x.beginPath();x.moveTo(bx,by);x.lineTo(nx,ny);x.stroke();x.setLineDash([]);
  outlined(x,String(h.score),bx,by+pit*.12,{size:Math.max(20,pit*.55),fill:'#fff',stroke:hd,lw:Math.max(4,pit*.09)});
  // head
  const sq=1+h.squash*.22,ang=Math.atan2(h.hy,h.hx),open=h.mouth*.95;
  x.save();x.translate(nx,ny);x.rotate(ang);x.scale(sq,1/sq*(1+h.squash*.05));
  const R=g.rH;
  // ears
  x.fillStyle=hd;for(const sgn of [-1,1]){x.beginPath();x.arc(-R*.55,sgn*R*.85,R*.3,0,6.283);x.fill();}
  // skull with a wedge cut out for the mouth (Pac-Man style)
  const hA=Math.max(.04,open)*.95;
  x.fillStyle=hd;x.beginPath();x.arc(0,0,R+3,0,6.283);x.fill();
  x.fillStyle='#8d1c3f';x.beginPath();x.moveTo(0,0);x.arc(0,0,R*1.04,-hA,hA);x.closePath();x.fill();
  if(open>.12){x.fillStyle='#ff7a9a';x.beginPath();x.ellipse(R*.25,0,R*.35,R*.2*open,0,0,6.283);x.fill();}
  x.fillStyle=h.flash>0?'#fff':hp;x.beginPath();x.moveTo(0,0);x.arc(0,0,R,hA,6.283-hA);x.closePath();x.fill();
  // lips + teeth
  x.fillStyle='#fff';for(const sgn of [-1,1])for(let k=0;k<3;k++){const tr=R*(.45+k*.2),ta=hA;x.save();x.rotate(sgn*ta);x.beginPath();x.moveTo(tr,0);x.lineTo(tr+R*.1,sgn*R*.13);x.lineTo(tr+R*.2,0);x.closePath();x.fill();x.restore();}
  x.strokeStyle=hd;x.lineWidth=2.5;x.beginPath();x.arc(0,0,R,hA,6.283-hA);x.stroke();
  // nostrils
  x.fillStyle=hd;x.beginPath();x.arc(R*.78,-R*.3,R*.07,0,6.283);x.arc(R*.78,R*.3,R*.07,0,6.283);x.fill();
  x.restore();
  // the player's face on the hippo's forehead
  s.sprite(x,i,nx-h.hx*R*.5,ny-h.hy*R*.5,R*1.55,{exact:true,mood:h.flash>0?'win':h.state==='rest'?'walking':'angry'});
  if(h.tired>0){x.fillStyle='#bfe9ff';for(let k=0;k<3;k++){x.beginPath();x.arc(nx+Math.sin(time*9+k*2)*R*.9,ny-R*1.1-((time*60+k*20)%30),3,0,6.283);x.fill();}}
 };
 const draw=()=>{
  x.clearRect(0,0,W,H);fx.begin(x);drawBoard();
  for(const m of marbles)drawMarble(m);
  for(const h of heads)drawHippo(h);
  // lunge target markers
  for(const h of heads)if(h.state==='out'){x.strokeStyle=PCOL[h.i];x.lineWidth=3;x.globalAlpha=.7;x.beginPath();x.arc(h.tx,h.ty,g.rE*.8,0,6.283);x.stroke();x.globalAlpha=1;}
  fx.draw(x);
  // keyboard cursors
  for(let i=0;i<2;i++){const c=cursors[i];if(!c.used)continue;x.strokeStyle=PCOL[i];x.lineWidth=3;x.beginPath();x.arc(c.x,c.y,10*g.u+4,0,6.283);x.moveTo(c.x-18*g.u-4,c.y);x.lineTo(c.x+18*g.u+4,c.y);x.moveTo(c.x,c.y-18*g.u-4);x.lineTo(c.x,c.y+18*g.u+4);x.stroke();}
  fx.end(x);
  // HUD
  const tsz=clamp(H*.065,18,34);x.fillStyle='#0b2530cc';rr(x,W/2-tsz*1.6,4,tsz*3.2,tsz*1.5,tsz*.5);x.fill();
  outlined(x,mmss(clock),W/2,4+tsz*.78,{size:tsz,fill:frenzy?'#ffb347':'#fff',stroke:'#0b2530'});
  if(frenzy&&phase==='play')outlined(x,'×2 FRENZY',W/2,g.cy+g.rH*2.4+Math.sin(time*8)*3,{size:Math.max(16,g.u*24),fill:'#ffb347',stroke:'#5a2a00',alpha:.9});
  if(phase==='intro'||(phase==='play'&&GAME_TIME-clock<4.5)){for(let i=0;i<2;i++){outlined(x,i?'TAP TO LUNGE':'TAP TO LUNGE',g.bx[i],g.y1-g.R*.55,{size:Math.max(13,g.u*18),fill:PLIGHT[i],stroke:'#10303c',alpha:phase==='intro'?1:clamp((4.5-(GAME_TIME-clock))/1.5,0,1)});if(phase==='intro'||GAME_TIME-clock<4)gestureHint(x,g.bx[i],g.y1-g.R*.35,'tap',time,{color:PLIGHT[i],size:g.u*26});}}
  if(phase==='intro')intro.draw(x,W,H,{y:g.cy-g.rH*2.6});
  if(phase==='over'){banner(x,W,H,bannerText,`${heads[0].score} – ${heads[1].score}`,{color:'#ffe566'});}
 };

 s.debug={engine:'hippos',heads,marbles,fx,kb,cursors,get phase(){return phase;},get clock(){return clock;},geo:()=>g};
 draw();
 if(!await s.pass(0,'Hungry Hungry Heads: your head is the hippo. Tap your half to lunge for marbles, hold to keep your mouth open. Golden marbles are worth five. Most marbles in sixty seconds wins.','Both ready — chomp!'))return;
 s.frame(dt=>{
  if(s.W!==W||s.H!==H){const sx=s.W/W,sy=s.H/H;for(const m of marbles){m.x*=sx;m.y*=sy;}for(const h of heads){h.x*=sx;h.y*=sy;h.tx*=sx;h.ty*=sy;if(h.touch)h.touch=null;h.state=h.state==='rest'?'rest':'back';}W=s.W;H=s.H;g=geo(W,H);for(const c of cursors){c.x*=sx;c.y*=sy;}for(const m of marbles)m.r=m.gold?g.rM*1.25:g.rM;}
  update(Math.min(dt,.033));draw();
  s.status(`${s.players[0].name} ${heads[0].score} · ${s.players[1].name} ${heads[1].score} · ${Math.ceil(clock)}s${frenzy?' · DOUBLE POINTS':''}`);
 });
}
Object.assign(exports,{hippos});
