const {clamp}=require("src/utils.js");
const {PCOL,PDARK,PLIGHT,Fx,arenaKeys,arenaTouch,Countdown,banner,outlined,rr,snd,noise,jingle,mmss,gestureHint,settle}=require("src/engines/arenaKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
// Disc Duel (after Windjammers): one court, a goal on each end (3 / 5 / 3 points). Drag to run your catcher, touch near
// the disc to dive for it. When you hold the disc, swipe to throw: faster = harder, curve the swipe to curve the disc,
// tap for a lob. First to 12 or most points at 75 s.
const CW=1000,TARGET=12,TIME=75,PR=30,DR=15,CATCH=PR+DR+14,CLOCK=2.6,LOB_H=190,SPEED=640;
const zonePts=(y,CH)=>y<CH*.28||y>CH*.72?3:5;

async function disc(s){
 const [c,x]=s.canvas(900,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();if(!await settle(s))return;
 const fx=new Fx();let W=s.W,H=s.H;
 const portrait=H>W*1.05,long=portrait?H:W,short=portrait?W:H,CH=clamp(Math.round(CW*short/long),430,680);
 let sc=1,offx=0,offy=0;
 const fit=()=>{const lw=portrait?CH:CW,lh=portrait?CW:CH,pad=portrait?4:6;const top=Math.min(46,H*.07);sc=Math.min((W-pad*2)/lw,(H-top-pad)/lh);offx=(W-lw*sc)/2;offy=top+(H-top-pad-lh*sc)/2;};
 const toL=(px,py)=>portrait?{x:(py-offy)/sc,y:CH-(px-offx)/sc}:{x:(px-offx)/sc,y:(py-offy)/sc};
 const toS=(lx,ly)=>portrait?{x:offx+(CH-ly)*sc,y:offy+lx*sc}:{x:offx+lx*sc,y:offy+ly*sc};
 const keyVec=(dx,dy)=>portrait?{x:dy,y:-dx}:{x:dx,y:dy};
 fit();
 const pl=[0,1].map(i=>({i,x:i?CW*.8:CW*.2,y:CH/2,tx:i?CW*.8:CW*.2,ty:CH/2,dash:0,dvx:0,dvy:0,dcool:0,hold:0,flash:0,catchT:0,hurt:0,throwT:0,joy:null})),
  d={x:CW/2,y:CH/2,vx:0,vy:0,spin:0,z:0,vz:0,state:'held',holder:0,owner:0,lob:null,trail:[],age:0,immune:0,power:0,rot:0};
 const sco=[0,0];let phase='intro',clock=TIME,phaseT=0,note='',time=0,server=0,overtime=false,otT=0,zoneFlash=[],bounceFx=0;
 const intro=new Countdown(3),kb=arenaKeys(s);
 const half=i=>i?CW/2+PR+8:PR+8,halfMax=i=>i?CW-PR-8:CW/2-PR-8;
 const clampP=p=>{p.x=clamp(p.x,half(p.i),halfMax(p.i));p.y=clamp(p.y,PR+6,CH-PR-6);};
 const serve=who=>{
  d.state='held';d.holder=who;d.owner=who;d.vx=d.vy=0;d.z=0;d.vz=0;d.spin=0;d.trail=[];d.lob=null;d.immune=0;d.age=0;
  for(const p of pl){p.x=p.i?CW*.8:CW*.2;p.y=CH/2;p.tx=p.x;p.ty=p.y;p.hold=0;p.dash=0;}
  pl[who].hold=CLOCK;
 };
 s.hint('One disc, two catchers. DRAG to run your catcher (touch near the incoming disc to dive for it; a quick flick also dives). When you catch it, SWIPE to throw: a faster swipe is a harder throw, a curved swipe curves the disc, and a TAP is a lob. Goals: 3 points in the corners, 5 in the middle. First to 12 or most points at 75 seconds. P1: WASD run, Space throw (A/D curve, W/S aim), E lob. P2: arrows, Enter, . lob.');

 // ------------------------------------------------------------ throwing
 const throwDisc=(p,dirx,diry,speed,spin,lob=false)=>{
  const fwd=p.i?-1:1;
  if(!lob){let l=Math.hypot(dirx,diry)||1;dirx/=l;diry/=l;if(dirx*fwd<.26){dirx=.26*fwd;const m=Math.sqrt(1-.26*.26);diry=(diry<0?-1:1)*m;}
   d.vx=dirx*speed;d.vy=diry*speed;d.spin=spin*3.4;d.z=0;d.vz=0;d.lob=null;d.power=clamp((speed-520)/900,0,1);}
  else{const foe=pl[1-p.i];let tx=(p.i?CW*.27:CW*.73)+(Math.random()-.5)*90,ty=clamp(CH-foe.y+(Math.random()-.5)*70,PR+30,CH-PR-30);const T=1.05;
   d.vx=(tx-d.x)/T;d.vy=(ty-d.y)/T;d.vz=LOB_H*4/T*1.0;d.z=1;d.spin=0;d.lob={T,tx,ty};d.power=0;}
  d.state='fly';d.holder=-1;d.owner=p.i;d.immune=.35;d.age=0;d.trail=[];p.hold=0;p.throwT=.25;
  const k=lob?0:d.power;fx.burst(d.x,d.y,{n:6+Math.round(k*14),color:k>.6?'#ffb347':'#fff',speed:140+k*260,life:.35,size:3+k*3,angle:Math.atan2(d.vy,d.vx)+Math.PI,spread:1.2});
  if(k>.6){fx.shake(6+k*6);noise(.18,{vol:.07,freq:1400});}else if(!lob)noise(.1,{vol:.05,freq:2200});
  snd(lob?260:200+k*200,.18,{type:'sine',to:lob?460:90,vol:.05});
 };
 const swipeThrow=f=>{
  const p=pl[f.owner];if(d.state!=='held'||d.holder!==p.i||p.hold<=0)return;
  if(performance.now()<(f.data.ignoreUntil||0))return;
  const smp=f.samples,a=toL(smp[0].x,smp[0].y),e=toL(f.x,f.y);
  if(f.moved<20*1&&f.held<320){throwDisc(p,0,0,0,0,true);return;}
  if(f.moved<26)return;
  const m=smp[Math.floor(smp.length/2)],mid=toL(m.x,m.y);
  const a1=Math.atan2(mid.y-a.y,mid.x-a.x),a2=Math.atan2(e.y-mid.y,e.x-mid.x);let curve=a2-a1;while(curve>Math.PI)curve-=6.283;while(curve<-Math.PI)curve+=6.283;
  const vel=toLvec(f.vel),v=Math.hypot(vel.x,vel.y),speed=clamp(520+(v/sc-300)*.38,520,1450);
  let dir=Math.atan2(vel.y||(e.y-a.y),vel.x||(e.x-a.x));if(v<80)dir=Math.atan2(e.y-a.y,e.x-a.x);
  const spin=clamp(curve/1.0,-1,1);
  throwDisc(p,Math.cos(dir-spin*.18),Math.sin(dir-spin*.18),speed,spin);
 };
 const toLvec=v=>portrait?{x:v.y,y:-v.x}:{x:v.x,y:v.y};
 const touch=arenaTouch(s,{
  owner:p=>toL(p.x,p.y).x<CW/2?0:1,maxFingers:2,
  onDown:f=>{const p=pl[f.owner],l=toL(f.x,f.y);
   if(d.state==='held'&&d.holder===p.i)return;
   if(!p.joy||!touch.fingers.has(p.joy)){p.joy=f.id;f.data.move=true;}
   p.tx=l.x;p.ty=l.y;
   // touching near an incoming disc: dive for it
   if(d.state==='fly'&&p.dcool<=0&&Math.hypot(l.x-d.x,l.y-d.y)<150&&(d.x<CW/2)===(p.i===0)){startDash(p,d.x,d.y);}
  },
  onMove:f=>{const p=pl[f.owner];if(p.joy===f.id&&!(d.state==='held'&&d.holder===p.i)){const l=toL(f.x,f.y);p.tx=l.x;p.ty=l.y;}},
  onUp:(f,cancelled)=>{const p=pl[f.owner];if(p.joy===f.id)p.joy=null;if(cancelled||phase!=='play')return;
   if(d.state==='held'&&d.holder===p.i)swipeThrow(f);
   else if(f.vel.speed>1500&&f.moved>60&&p.dcool<=0){const v=toLvec(f.vel),l=Math.hypot(v.x,v.y)||1;startDash(p,p.x+v.x/l*200,p.y+v.y/l*200);}
  }
 });
 const startDash=(p,tx,ty)=>{const dx=tx-p.x,dy=ty-p.y,l=Math.hypot(dx,dy)||1;p.dash=.2;p.dvx=dx/l;p.dvy=dy/l;p.dcool=.7;p.tx=tx;p.ty=ty;fx.burst(p.x,p.y,{n:6,color:'#fff',speed:120,life:.3,size:3,angle:Math.atan2(-dy,-dx),spread:1});snd(500,.1,{type:'sawtooth',to:900,vol:.025});};
 for(const p of pl)p.dcool=0;
 kb.onDown((i,k)=>{if(k==='fire'&&phase==='play'&&d.state==='held'&&d.holder===i){const st=kb.state[i],v=keyVec(st.r-st.l,st.d-st.u);const fwd=i?-1:1;
   const sp=st.u||st.d?.0:0;void sp;const lv=toLvec({x:0,y:0});void lv;
   // keyboard: forward throw, biased by up/down on screen; left/right on screen curves
   const aim=keyVec(0,st.d-st.u),curv=(portrait?(st.r-st.l):(st.d-st.u))*0;void curv;void v;
   throwDisc(pl[i],fwd,aim.y*.8+(portrait?aim.x*0:0),1000,(portrait?0:0)+(st.r-st.l)*(portrait?0:0)+((i?-1:1)*(portrait?(st.r-st.l):0)),false);}});
 for(const [i,key] of [[0,'e'],[1,'.']])s.on(document,'keydown',ev=>{if(ev.key.toLowerCase()===key&&!ev.repeat&&!s.paused&&phase==='play'&&d.state==='held'&&d.holder===i){ev.preventDefault();throwDisc(pl[i],0,0,0,0,true);}});

 // ------------------------------------------------------------ scoring
 const point=(who,pts,why,gx,gy)=>{
  sco[who]+=pts;s.setScores(sco);phase='goal';phaseT=1.7;note=`${why} +${pts}`;s.react?.(who,'win');s.react?.(1-who,'sad');
  fx.shake(12);fx.ring(gx,gy,{color:'#ffe566',r1:160,life:.6,width:7});
  fx.burst(gx,gy,{n:40,colors:['#ffe566','#fff','#ff9a3d',PCOL[who]],speed:420,life:.9,size:5,gravity:260,shape:'star'});
  jingle(pts>=5?[523,659,784,1047,1319]:[523,659,784],{vol:.05,step:.07});noise(.3,{vol:.08,freq:600});
  zoneFlash.push({x:gx,y:gy,t:.9,pts});server=1-who;d.state='dead';d.vx=d.vy=0;
  if(sco[who]>=TARGET||(overtime&&sco[0]!==sco[1])){phase='gameover';phaseT=2.6;const w=sco[0]>sco[1]?0:1;note=`${s.players[w].name} wins!`;jingle([523,659,784,1047,1319,1568],{vol:.05,step:.08});}
 };

 // ------------------------------------------------------------ update
 // vs CPU: catcher 2 reads the disc's line to its half and dives when close; when holding it throws at a corner or the middle
 const cpu=isCpu(s);let cpuHold=null,cpuErr=0;
 function cpuThink(dt){const p=pl[1],sk=cpuSkill(s);p.joy='cpu';if(phase!=='play')return;
  if(d.state==='held'&&d.holder===1){if(cpuHold===null)cpuHold=.35+Math.random()*(.5+(1-sk)*.6);cpuHold-=dt;if(cpuHold<=0){cpuHold=null;if(Math.random()<.12)throwDisc(p,0,0,0,0,true);else{const ty=[PR+40,CH/2,CH-PR-40][Math.floor(Math.random()*3)]+(Math.random()-.5)*(1-sk)*120;throwDisc(p,-(d.x-0),ty-d.y,700+sk*650+Math.random()*150,(Math.random()-.5)*1.2);}}return;}
  cpuHold=null;if(d.state==='fly'&&d.vx>0&&!d.lob){let t=(p.x-d.x)/Math.max(1,d.vx),y=d.y+d.vy*t;const top=PR,bot=CH-PR,span=bot-top;y=((y-top)%(2*span)+2*span)%(2*span);y=top+(y>span?2*span-y:y);if(Math.random()<dt*3)cpuErr=(Math.random()-.5)*(1-sk)*140;p.tx=CW*.82;p.ty=y+cpuErr;
   if(p.dcool<=0&&d.x>CW/2&&Math.hypot(d.x-p.x,d.y-p.y)<120&&Math.random()<.4+sk*.5)startDash(p,d.x,d.y);}
  else if(d.state==='fly'&&d.lob&&d.lob.tx>CW/2){p.tx=d.lob.tx;p.ty=d.lob.ty;}else{p.tx=CW*.8;p.ty=CH/2;}}
 const update=dt=>{
  time+=dt;fx.update(dt);if(cpu)cpuThink(dt);
  if(phase==='intro'){if(!intro.update(dt)){phase='play';serve(0);}}
  else if(phase==='goal'||phase==='gameover'){phaseT-=dt;for(const z of zoneFlash)z.t-=dt;if(phaseT<=0){if(phase==='gameover'){s.finish(sco.slice(),`Disc Duel: ${sco[0]} to ${sco[1]}`);return;}
    if(clock<=0&&sco[0]===sco[1]&&!overtime){overtime=true;otT=15;}
    if(clock<=0&&!overtime||(overtime&&otT<=0)){phase='gameover';phaseT=2.4;note=sco[0]===sco[1]?'A TIE!':`${s.players[sco[0]>sco[1]?0:1].name} wins!`;}
    else{phase='play';serve(server);}}}
  else if(phase==='play'){
   if(!overtime){clock-=dt;if(clock<=0){clock=0;if(sco[0]!==sco[1]){phase='gameover';phaseT=2.6;const w=sco[0]>sco[1]?0:1;note=`${s.players[w].name} wins!`;jingle([523,659,784,1047],{vol:.05,step:.09});}else{overtime=true;otT=15;note='';fx.pop(CW/2,CH/2,'GOLDEN POINT!',{color:'#ffe566',size:40});jingle([784,988,1175],{vol:.05});}}}
   else{otT-=dt;if(otT<=0){phase='gameover';phaseT=2.4;note='A TIE!';}}
  }
  for(const z of zoneFlash)z.t-=dt;zoneFlash=zoneFlash.filter(z=>z.t>0);
  // players
  for(const p of pl){
   p.dcool=Math.max(0,p.dcool-dt);p.flash=Math.max(0,p.flash-dt);p.catchT=Math.max(0,p.catchT-dt);p.throwT=Math.max(0,p.throwT-dt);
   const live=phase==='play',holding=d.state==='held'&&d.holder===p.i;
   if(live&&holding){p.hold-=dt;if(p.hold<=0){throwDisc(p,p.i?-1:1,(Math.random()-.5)*.8,0,0,true);}}
   const k=kb.state[p.i];
   if(live&&p.dash>0){p.dash-=dt;p.x+=p.dvx*2300*dt;p.y+=p.dvy*2300*dt;}
   else if(live){
    let mx=0,my=0;const kv=keyVec(k.r-k.l,k.d-k.u);mx=kv.x;my=kv.y;
    if(!mx&&!my&&p.joy!==null&&!holding){const dx=p.tx-p.x,dy=p.ty-p.y,l=Math.hypot(dx,dy);if(l>6){const m=Math.min(1,l/60);mx=dx/l*m;my=dy/l*m;}}
    const sp=SPEED*(holding?.3:1);p.x+=mx*sp*dt;p.y+=my*sp*dt;
   }
   clampP(p);
  }
  // keep keyboard dive: none
  // disc
  if(d.state==='held'){const h=pl[d.holder],fw=h.i?-1:1;d.x=h.x+fw*(PR+4);d.y=h.y+4;d.z=0;d.rot+=dt*10;d.trail=[];}
  else if(d.state==='fly'){
   d.age+=dt;d.immune=Math.max(0,d.immune-dt);d.rot+=dt*(16+d.spin*6);
   const steps=Math.max(1,Math.ceil(Math.hypot(d.vx,d.vy)*dt/10)),h=dt/steps;let ended=false;
   for(let st=0;st<steps&&!ended;st++){
    if(!d.lob){const ang=d.spin*h,cs=Math.cos(ang),sn=Math.sin(ang),vx=d.vx*cs-d.vy*sn,vy=d.vx*sn+d.vy*cs;d.vx=vx;d.vy=vy;const f=Math.exp(-.12*h);d.vx*=f;d.vy*=f;}
    d.x+=d.vx*h;d.y+=d.vy*h;
    if(d.lob){d.vz-=LOB_H*8/d.lob.T/d.lob.T*h;d.z+=d.vz*h;if(d.z<=0){d.z=0;ended='ground';break;}}
    else{
     if(d.y<DR){d.y=DR;d.vy=Math.abs(d.vy);d.spin*=-.8;bounce();}else if(d.y>CH-DR){d.y=CH-DR;d.vy=-Math.abs(d.vy);d.spin*=-.8;bounce();}
     if(d.x<=0||d.x>=CW){ended='goal';break;}
    }
    // catching
    if(d.z<46)for(const p of pl){if(p.i===d.owner&&d.immune>0)continue;if(Math.hypot(d.x-p.x,d.y-p.y)<CATCH&&(p.x<CW/2)===(p.i===0)){catchDisc(p);ended='caught';break;}}
   }
   if(d.trail.length===0||Math.hypot(d.trail.at(-1).x-d.x,d.trail.at(-1).y-d.y)>9)d.trail.push({x:d.x,y:d.y,z:d.z,t:.35});
   for(const t of d.trail)t.t-=dt;d.trail=d.trail.filter(t=>t.t>0);
   if(ended==='goal'){const who=d.x<=0?1:0,pts=zonePts(d.y,CH);point(who,pts,pts===5?'BULLSEYE!':'GOAL!',who?0:CW,clamp(d.y,40,CH-40));}
   else if(ended==='ground'){const inLeft=d.x<CW/2,who=inLeft?1:0;fx.burst(d.x,d.y,{n:16,color:'#f4d58a',speed:200,life:.5,size:4,gravity:100});fx.ring(d.x,d.y,{color:'#fff',r1:60,life:.4});noise(.15,{vol:.07,freq:500});point(who,2,'LANDED!',d.x,d.y);}
  }
  s.setScores(sco);
 };
 const bounce=()=>{fx.burst(d.x,d.y<CH/2?0:CH,{n:5,color:'#fff',speed:100,life:.25,size:3});snd(700+Math.random()*200,.05,{type:'triangle',vol:.03});};
 const catchDisc=p=>{
  d.state='held';d.holder=p.i;d.vx=d.vy=0;d.z=0;d.trail=[];d.lob=null;p.hold=CLOCK;p.catchT=.3;p.flash=.2;
  for(const f of touch.fingers.values())if(f.owner===p.i)f.data.ignoreUntil=performance.now()+260;
  const big=d.power>.55;fx.ring(d.x,d.y,{color:big?'#ffb347':'#fff',r1:80,life:.35,width:5});fx.burst(d.x,d.y,{n:big?22:10,color:big?'#ffb347':'#fff',speed:220,life:.4,size:4});
  fx.pop(p.x,p.y-PR*2.4,big?'CAUGHT IT!':'CAUGHT',{color:'#fff',size:big?30:22});if(big)fx.shake(8);snd(big?140:300,.14,{type:'square',vol:.05,to:90});noise(.1,{vol:.06,freq:1800});s.react?.(p.i,'happy');
  p.tx=p.x;p.ty=p.y;
 };

 // ------------------------------------------------------------ drawing
 const upright=(lx,ly,fn)=>{x.save();x.translate(lx,ly);if(portrait)x.rotate(-Math.PI/2);fn();x.restore();};
 const drawCourt=()=>{
  // outside
  x.fillStyle='#0f1f3a';x.fillRect(0,0,W,H);
  x.save();portrait?x.setTransform(0,sc,-sc,0,offx+CH*sc,offy):x.setTransform(sc,0,0,sc,offx,offy);
  // stands
  x.fillStyle='#1b2f58';x.fillRect(-30,-50,CW+60,50);x.fillRect(-30,CH,CW+60,50);
  for(let k=0;k<40;k++){x.fillStyle=['#ff6fa8','#4aa3ff','#ffe566','#8affc1'][k%4]+'88';x.beginPath();x.arc(10+k*25,-20+Math.sin(k+time*4+(k%3))*3,7,0,6.283);x.fill();x.beginPath();x.arc(10+k*25,CH+22+Math.sin(k*2+time*4)*3,7,0,6.283);x.fill();}
  // sand court
  const gr=x.createLinearGradient(0,0,0,CH);gr.addColorStop(0,'#f2d79b');gr.addColorStop(1,'#e8c27c');x.fillStyle=gr;x.fillRect(0,0,CW,CH);
  x.fillStyle='#4aa3ff22';x.fillRect(0,0,CW/2,CH);x.fillStyle='#ff6fa822';x.fillRect(CW/2,0,CW/2,CH);
  x.strokeStyle='#ffffffcc';x.lineWidth=6;x.strokeRect(3,3,CW-6,CH-6);
  x.setLineDash([22,18]);x.lineWidth=5;x.beginPath();x.moveTo(CW/2,0);x.lineTo(CW/2,CH);x.stroke();x.setLineDash([]);
  x.lineWidth=4;x.beginPath();x.arc(CW/2,CH/2,CH*.12,0,6.283);x.stroke();
  // goals
  for(const side of [0,1]){const gx=side?CW-34:0;
   for(const [y0,y1,pts] of [[0,.28,3],[.28,.72,5],[.72,1,3]]){const fl=zoneFlash.find(z=>z.pts===pts&&((z.x<CW/2)===(side===0))&&Math.abs(z.y-(y0+y1)/2*CH)<CH*.3);
    x.fillStyle=fl&&fl.t>0?'#fff':(pts===5?'#ff5a4a':'#ffb347');x.fillRect(gx,y0*CH,34,(y1-y0)*CH);x.strokeStyle='#fff';x.lineWidth=3;x.strokeRect(gx,y0*CH,34,(y1-y0)*CH);
    upright(side?CW-17:17,(y0+y1)/2*CH,()=>outlined(x,String(pts),0,0,{size:pts===5?34:26,fill:'#fff',stroke:'#7a1d12'}));}}
  x.fillStyle='#ffffff80';x.fillRect(0,0,CW,5);x.fillRect(0,CH-5,CW,5);
  // players' shadows then players, disc
  const drawP=p=>{
   const hs=PR*2.5,hold=d.state==='held'&&d.holder===p.i;
   x.fillStyle='#00000033';x.beginPath();x.ellipse(p.x,p.y+PR*.95,PR*1.05,PR*.4,0,0,6.283);x.fill();
   if(p.dash>0){x.strokeStyle=PCOL[p.i]+'88';x.lineWidth=PR*1.4;x.lineCap='round';x.beginPath();x.moveTo(p.x-p.dvx*70,p.y-p.dvy*70);x.lineTo(p.x,p.y);x.stroke();}
   upright(p.x,p.y,()=>{
    x.fillStyle=PDARK[p.i];x.beginPath();x.ellipse(0,PR*.55,PR*.9,PR*.7,0,0,6.283);x.fill();x.fillStyle=PCOL[p.i];x.beginPath();x.ellipse(0,PR*.45,PR*.8,PR*.58,0,0,6.283);x.fill();x.strokeStyle='#fff';x.lineWidth=3;x.stroke();
    s.sprite(x,p.i,0,-PR*.3,hs,{exact:true,mood:p.flash>0?'win':hold?'angry':'walking'});
    if(hold){const a=clamp(p.hold/CLOCK,0,1);x.strokeStyle=a<.3?'#ff5a4a':'#ffffffcc';x.lineWidth=5;x.beginPath();x.arc(0,0,PR*1.55,-Math.PI/2,-Math.PI/2+6.283*a);x.stroke();}
   });
  };
  for(const p of pl)drawP(p);
  // disc trail + disc
  if(d.state!=='dead'||true){
   for(const t of d.trail){x.globalAlpha=clamp(t.t/.35,0,1)*.5;x.fillStyle=d.power>.55?'#ffb347':'#ffffff';x.beginPath();x.arc(t.x,t.y-t.z*.5,DR*.6*(t.t/.35+.3),0,6.283);x.fill();}x.globalAlpha=1;
   const lift=d.z*.55,scl=1+d.z/LOB_H*.7;
   x.fillStyle='#00000040';x.beginPath();x.ellipse(d.x,d.y+DR*.6,DR*(1-d.z/LOB_H*.25),DR*.45,0,0,6.283);x.fill();
   x.save();x.translate(d.x,d.y-lift);x.scale(scl,scl);
   x.rotate(d.rot);x.fillStyle='#ff4d4d';x.beginPath();x.arc(0,0,DR,0,6.283);x.fill();x.fillStyle='#ffe566';x.beginPath();x.arc(0,0,DR*.62,0,6.283);x.fill();x.fillStyle='#ff4d4d';x.beginPath();x.arc(0,0,DR*.28,0,6.283);x.fill();
   x.strokeStyle='#fff';x.lineWidth=2.5;x.beginPath();x.arc(0,0,DR,0,6.283);x.stroke();x.fillStyle='#ffffff99';x.fillRect(-DR*.9,-2,DR*.7,4);x.restore();
   if(d.state==='fly'&&d.lob){upright(d.x,d.y-lift-DR*2.6,()=>outlined(x,'LOB',0,0,{size:16,fill:'#fff',stroke:'#2a2a5a'}));x.strokeStyle='#ffffff77';x.lineWidth=3;x.setLineDash([6,8]);x.beginPath();x.arc(d.lob.tx,d.lob.ty,PR*1.2,0,6.283);x.stroke();x.setLineDash([]);}
  }
  fx.draw(x);
  // hints
  if(phase==='play'&&d.state==='held'&&time<999){const p=pl[d.holder],a=clamp(1-(CLOCK-p.hold)/2.2,0,1);}
  x.restore();
 };
 const draw=()=>{
  x.clearRect(0,0,W,H);fx.begin(x);drawCourt();fx.end(x);
  // HUD (screen space)
  const bar=Math.min(46,H*.07);x.fillStyle='#0a1630';x.fillRect(0,0,W,bar);
  const fs=clamp(bar*.62,13,26);
  outlined(x,String(sco[0]),W*.5-fs*3.2,bar/2,{size:fs*1.4,fill:PCOL[0],stroke:'#06101f'});outlined(x,String(sco[1]),W*.5+fs*3.2,bar/2,{size:fs*1.4,fill:PCOL[1],stroke:'#06101f'});
  outlined(x,overtime?'GOLDEN POINT':mmss(clock),W/2,bar/2,{size:fs,fill:clock<10||overtime?'#ff8a7a':'#fff',stroke:'#06101f'});
  if(W>560)outlined(x,`first to ${TARGET}`,W*.06,bar/2,{size:Math.max(9,fs*.55),fill:'#9fb4de',stroke:'#06101f',align:'left',lw:2});
  // prompts
  if(phase==='play'&&d.state==='held'){const p=pl[d.holder],q=toS(p.x,p.y);const t=CLOCK-p.hold;if(t<3.2){const a=clamp(1.2-t/3.2,0,1);x.globalAlpha=a;outlined(x,'SWIPE TO THROW · TAP TO LOB',W/2,H*.5,{size:Math.max(12,Math.min(W,H*1.4)*.028),fill:PLIGHT[p.i],stroke:'#06101f'});x.globalAlpha=1;
    if(time<999)gestureHint(x,q.x+(portrait?0:(p.i?-1:1)*sc*130),q.y+(portrait?(p.i?-1:1)*sc*130:0),'flick',t*1.3,{color:PLIGHT[p.i],size:sc*30});}}
  if(phase==='intro'){for(const p of pl){const q=toS(p.x,p.y);if(time<5.5){gestureHint(x,q.x,q.y+sc*PR*2.2,'drag',time,{color:PLIGHT[p.i],size:sc*30});}}intro.draw(x,W,H);}
  if(phase==='goal')banner(x,W,H,note,`${sco[0]} – ${sco[1]}`,{color:'#ffe566'});
  if(phase==='gameover')banner(x,W,H,note,`${sco[0]} – ${sco[1]}`,{color:'#ffe566'});
 };
 s.debug={engine:'disc',pl,d,sco,fx,touch,kb,toS,toL,get phase(){return phase;},CH,portrait,get sc(){return sc;}};
 draw();
 if(!await s.pass(0,'Disc Duel: Windjammers on one screen. Run to catch the disc, then swipe to throw it into the other goal. Corners are 3, the middle is 5. First to 12 wins.','Both ready — throw!'))return;
 s.frame(dt=>{
  if(s.W!==W||s.H!==H){W=s.W;H=s.H;fit();touch.clear();}
  update(Math.min(dt,.033));draw();
  s.status(`${s.players[0].name} ${sco[0]} · ${s.players[1].name} ${sco[1]} · first to ${TARGET}`);
 });
}
Object.assign(exports,{disc});
