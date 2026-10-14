// Lunar Lander (Atari, 1979) remake, Moonraker edition: glowing vector moonscape with 2X/3X/5X landing pads,
// a vector lander with your head at the window, limited fuel, the camera zooming in near the ground, and the
// classic read-outs (altitude, horizontal and vertical speed with arrows). Land as many times as fuel allows:
// soft landing 50 x pad, hard landing 15 x pad, a crash costs fuel. Touch: hold to thrust, drag sideways to tilt.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,keyboard,makeShake}=require("src/engines/tarantinoKit.js");
const {vectorText,turnRunner}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

async function lander(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const shake=makeShake();let cur=null;
 const stick={id:null,ox:0,oy:0,x:0,y:0},keys={l:false,r:false,u:false};
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur)return;ev.preventDefault();if(stick.id!==null)return;const p=s.pointer(ev);stick.id=ev.pointerId;stick.ox=stick.x=p.x;stick.oy=stick.y=p.y;stick.a0=cur.ship.a;s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(ev.pointerId!==stick.id||s.paused)return;ev.preventDefault();const p=s.pointer(ev);stick.x=p.x;stick.y=p.y;});
 for(const t of ['pointerup','pointercancel'])s.on(c,t,ev=>{if(ev.pointerId===stick.id){stick.id=null;s.release(ev);}});
 keyboard(s,(i,name,down)=>{if(name in keys)keys[name]=down;if(name==='act')keys.u=down;});
 s.resetOnPause(()=>{stick.id=null;keys.l=keys.r=keys.u=false;});
 s.hint('Hold anywhere to fire the engine; drag left or right while holding to tilt the lander. Touch a flat pad gently and upright: vertical speed under 6, sideways under 4. 2X/3X/5X pads multiply the score. Keys: ←/→ tilt, ↑ or Space thrust.');
 // World: 140 units wide (wraps), terrain stored as depth above the bottom edge so any screen shape works.
 const TWD=140,U=()=>s.W/TWD,portrait=()=>s.H>s.W*1.1;
 function terrain(rand){
  const pts=[],pads=[];const n=TWD/5+1;let d=20+rand()*14;
  const padAt=[{at:.08+rand()*.12,w:16,m:2},{at:.4+rand()*.12,w:9,m:3},{at:.7+rand()*.12,w:6,m:5}];
  for(let i=0;i<n;i++){d=clamp(d+(rand()-.5)*13,6,50);pts.push([i*5,d]);}pts[n-1][1]=pts[0][1];
  for(const p of padAt){const x0=p.at*TWD,dd=clamp(pts[Math.floor(x0/5)][1],10,40);for(const q of pts)if(q[0]>=x0-1&&q[0]<=x0+p.w+1)q[1]=dd;pads.push({x0,x1:x0+p.w,d:dd,m:p.m});}
  return {pts,pads};
 }
 function groundAt(w,X){X=(X%TWD+TWD)%TWD;const p=w.ter.pts;const i=clamp(Math.floor(X/5),0,p.length-2),t=(X-p[i][0])/5;return w.br-(p[i][1]+(p[i+1][1]-p[i][1])*clamp(t,0,1));}
 function spawn(w){const r=w.rand;w.ship={x:TWD*(.15+r()*.7),y:Math.max(6,w.br-98),vx:(r()-.5)*14,vy:0,a:0,alive:true};w.state='fly';}
 function make(){const w={rand:seededRandom(s.seed+':lander'),fuel:900,score:0,landings:0,crashes:0,zoom:1,cx:50,cy:50,debris:[],msg:null,state:'fly',thrust:0};w.ar=TWD;w.br=s.H/U();w.ter=terrain(w.rand);spawn(w);return w;}
 function finishLanding(w,kind,pad){
  const sh=w.ship;sh.alive=false;w.state='landed';w.wait=2.4;
  if(kind==='soft'){const pts=50*pad.m;w.score+=pts;w.fuel+=60;w.landings++;w.msg={a:'THE EAGLE HAS LANDED',b:`${pts} POINTS · +60 FUEL`};[523,659,784,1046].forEach((f,i)=>voice(f,.14,.05,'triangle',{delay:i*.09}));s.react?.(w.player,'win',1.8);}
  else if(kind==='hard'){const pts=15*pad.m;w.score+=pts;w.landings++;w.msg={a:'HARD LANDING',b:`${pts} POINTS`};voice(180,.25,.06,'square');s.react?.(w.player,'happy',1);}
  else{w.fuel=Math.max(0,w.fuel-150);w.crashes++;w.msg={a:'YOU CRASHED',b:'150 FUEL UNITS LOST'};w.state='crashed';
   for(let i=0;i<9;i++){const a=Math.random()*Math.PI*2;w.debris.push({x:sh.x,y:sh.y,vx:Math.cos(a)*14,vy:Math.sin(a)*14-8,a:Math.random()*6,va:(Math.random()-.5)*6,len:1.5+Math.random()*2.5,t:2.2});}
   noise(1,.15,{f0:1500,f1:60});vibrate(50);shake.kick(14);s.react?.(w.player,'sad',1.8);}
 }
 function step(w,dt){
  const u=U();w.ar=TWD;w.br=s.H/u;shake.step(dt);
  for(const d of w.debris){d.x+=d.vx*dt;d.y+=d.vy*dt;d.vy+=6*dt;d.a+=d.va*dt;d.t-=dt;}w.debris=w.debris.filter(d=>d.t>0);
  if(w.state!=='fly'){w.wait-=dt;if(w.wait<=0){w.msg=null;if(w.fuel>0)spawn(w);else w.out=true;}return;}
  const sh=w.ship;let turn=(keys.r?1:0)-(keys.l?1:0),thrust=keys.u?1:0;
  if(stick.id!==null){thrust=1;const target=clamp(stick.a0+(stick.x-stick.ox)/70,-1.5,1.5);turn=clamp((target-sh.a)*4,-1,1);}
  if(w.fuel<=0)thrust=0;
  sh.a=clamp(sh.a+turn*2.4*dt,-1.6,1.6);w.thrust=thrust;
  if(thrust){sh.vx+=Math.sin(sh.a)*15*dt;sh.vy-=Math.cos(sh.a)*15*dt;w.fuel=Math.max(0,w.fuel-55*dt);if(Math.random()<dt*16)noise(.08,.04,{f0:420,f1:160});}
  sh.vy+=5.2*dt;sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;if(sh.y<2){sh.y=2;sh.vy=Math.max(0,sh.vy);}
  // contact: lowest point of the legs
  const foot=sh.y+3.4;const gl=groundAt(w,sh.x-2.6),gr=groundAt(w,sh.x+2.6);
  if(foot>=Math.min(gl,gr)){const sx=(sh.x%TWD+TWD)%TWD,pad=w.ter.pads.find(p=>sx-2.2>=p.x0&&sx+2.2<=p.x1);const upright=Math.abs(sh.a)<.22;
   const padY=pad?w.br-pad.d:0;if(pad&&upright&&Math.abs(sh.vx)<4&&sh.vy<6){sh.y=padY-3.4;finishLanding(w,'soft',pad);}
   else if(pad&&upright&&Math.abs(sh.vx)<6&&sh.vy<10){sh.y=padY-3.4;finishLanding(w,'hard',pad);}
   else finishLanding(w,'crash');}
 }
 function draw(w){
  const W=s.W,H=s.H,u=U(),sh=w.ship;
  const alt=sh?groundAt(w,sh.x)-sh.y-3.4:99;const gyl=sh?groundAt(w,sh.x):w.br,zb=portrait()?clamp((H/u)/(gyl-(sh?sh.y:0)+46),1,1.45):1,wantZoom=(w.state==='fly'&&alt<16?2.1:1)*zb;w.zoom+=(wantZoom-w.zoom)*.08;
  const z=w.zoom,k=u*z,viewW=W/k,viewH=H/k;
  if(sh){w.cx+=((sh.x-viewW/2)-w.cx)*(Math.abs(sh.x-viewW/2-w.cx)>TWD/2?1:.12);let wantY=gyl+16-viewH;if(sh.y<wantY+12)wantY=sh.y-12;w.cy+=(wantY-w.cy)*.12;}
  x.setTransform(1,0,0,1,0,0);x.fillStyle='rgba(0,0,4,.5)';x.fillRect(0,0,W,H);
  let ox=0,oy=0;if(shake.mag>.3){ox=(Math.random()-.5)*shake.mag;oy=(Math.random()-.5)*shake.mag;}
  x.setTransform(k,0,0,k,-w.cx*k+ox,-w.cy*k+oy);
  const line=1.3/k;x.lineCap='round';x.lineJoin='round';
  const stroke=(col,blur,fn)=>{x.strokeStyle=col;x.shadowColor=col;x.shadowBlur=blur;x.lineWidth=line;x.beginPath();fn();x.stroke();};
  // moonscape (+ wrapped copies so the zoomed view never runs out)
  const base=Math.floor(w.cx/TWD)*TWD;for(const off of [base-TWD,base,base+TWD,base+2*TWD]){stroke('#e9f6ff',8,()=>{w.ter.pts.forEach(([X,D],i)=>i?x.lineTo(X+off,w.br-D):x.moveTo(X+off,w.br-D));});
   for(const p of w.ter.pads){const py=w.br-p.d;stroke('#ffffff',14,()=>{x.moveTo(p.x0+off,py);x.lineTo(p.x1+off,py);});x.lineWidth=line*2;x.stroke();x.strokeStyle='#cfe8ff';x.shadowBlur=6;vectorText(x,`${p.m}X`,(p.x0+p.x1)/2+off,py+2.2,2.6,{align:'center',width:line});}}
  // stars
  x.fillStyle='#ffffff55';x.shadowBlur=0;for(let i=0;i<70;i++){const X=base-TWD+(i*61.7)%(TWD*3),Y=(i*37.3)%(w.br*.6);x.fillRect(X,Y,.3,.3);}
  // lander
  if(sh&&(sh.alive||w.state==='landed')){x.save();x.translate(w.cx+(((sh.x-w.cx)%TWD)+TWD)%TWD,sh.y);x.rotate(sh.a);
   stroke('#f4fbff',12,()=>{// cabin
    x.moveTo(-1.6,-3.6);x.lineTo(1.6,-3.6);x.lineTo(2.6,-2.4);x.lineTo(2.6,-.6);x.lineTo(1.6,.4);x.lineTo(-1.6,.4);x.lineTo(-2.6,-.6);x.lineTo(-2.6,-2.4);x.closePath();
    x.moveTo(-2.4,.4);x.lineTo(2.4,.4);x.lineTo(2.4,1.6);x.lineTo(-2.4,1.6);x.closePath();
    x.moveTo(-1.8,1.6);x.lineTo(-3,3.4);x.moveTo(1.8,1.6);x.lineTo(3,3.4);x.moveTo(-3.6,3.4);x.lineTo(-2.4,3.4);x.moveTo(2.4,3.4);x.lineTo(3.6,3.4);x.moveTo(-.8,1.6);x.lineTo(-1.1,2.4);x.lineTo(1.1,2.4);x.lineTo(.8,1.6);
    if(w.thrust&&w.state==='fly'&&Math.random()<.85){const f=4.2+Math.random()*2.6;x.moveTo(-.9,2.4);x.lineTo(0,2.4+f);x.lineTo(.9,2.4);}});
   x.shadowBlur=0;x.rotate(-sh.a);s.sprite(x,w.player,0,-1.8,4.6,{exact:true});x.restore();}
  for(const d of w.debris){x.globalAlpha=clamp(d.t,0,1);stroke('#f4fbff',8,()=>{x.moveTo(d.x-Math.cos(d.a)*d.len/2,d.y-Math.sin(d.a)*d.len/2);x.lineTo(d.x+Math.cos(d.a)*d.len/2,d.y+Math.sin(d.a)*d.len/2);});}x.globalAlpha=1;
  // HUD
  x.setTransform(1,0,0,1,0,0);x.shadowColor='#bfe3ff';x.shadowBlur=6;x.strokeStyle='#f4fbff';
  const fs=clamp(Math.min(W,H)*.03,10,18),lw=1.5,col1=12,col2=Math.min(W*.5,260);
  const left=Math.max(0,Math.ceil(w.cap-w.time));
  vectorText(x,`SCORE ${String(w.score).padStart(4,'0')}`,col1,14,fs,{width:lw});vectorText(x,`TIME  ${left}`,col1,14+fs*1.7,fs,{width:lw});x.strokeStyle=w.fuel<150?'#ff8080':'#f4fbff';vectorText(x,`FUEL  ${Math.round(w.fuel)}`,col1,14+fs*3.4,fs,{width:lw});x.strokeStyle='#f4fbff';
  const rx=W<520?col1:col2,ry=W<520?14+fs*5.1:14;
  if(sh){const vx=Math.round(sh.vx*3),vy=Math.round(sh.vy*3);vectorText(x,`ALTITUDE ${Math.max(0,Math.round(alt*5))}`,rx,ry,fs,{width:lw});vectorText(x,`HORIZONTAL ${Math.abs(vx)} ${vx>0?'>':vx<0?'<':''}`,rx,ry+fs*1.7,fs,{width:lw});x.strokeStyle=sh.vy>6?'#ff8080':'#f4fbff';vectorText(x,`VERTICAL ${Math.abs(vy)} ${vy>0?'V':vy<0?'A':''}`,rx,ry+fs*3.4,fs,{width:lw});}
  x.strokeStyle='#f4fbff66';vectorText(x,w.player===0?'':`BEAT ${w.scores[0]}`,W/2,H-fs-8,fs*.8,{align:'center',width:1.2});
  x.strokeStyle='#f4fbff';if(w.msg){vectorText(x,w.msg.a,W/2,H*.36,fs*1.5,{align:'center',width:2});vectorText(x,w.msg.b,W/2,H*.36+fs*2.6,fs,{align:'center',width:1.5});}
  if(w.ending&&!w.msg)vectorText(x,w.endReason==='time'?'TIME UP':'OUT OF FUEL',W/2,H*.4,fs*1.8,{align:'center',width:2.4});
  x.shadowBlur=0;s.debug={engine:'lander',world:w,stick};
 }
 const scores=await turnRunner(s,{seconds:75,endDelay:1.8,
  intro:(i,sc)=>i===0?`Lunar Lander, Moonraker edition. ${s.players[0].name} first: hold anywhere to fire the engine and drag sideways to tilt. Land softly and upright on the flat pads (5X pads are tiny). Land as often as your fuel lasts in 75 seconds.`:`${s.players[1].name}, same moon. Beat ${sc[0]}.`,
  make:()=>{cur=make();cur.cx=cur.ship.x-TWD/2;cur.cy=0;x.setTransform(1,0,0,1,0,0);x.fillStyle='#000';x.fillRect(0,0,s.W,s.H);return cur;},step,draw,done:w=>!!w.out,score:w=>w.score});
 if(!scores)return;
 s.finish(scores,`Lunar Lander · ${scores[0]} vs ${scores[1]}`);
}
Object.assign(exports,{lander});
