// Happy Gilmore × Caddyshack, rebuilt as a full-screen putt-putt course: three holes at Bushwood (Happy's run-up with
// a slope, the windmill, and the gopher's lair with a water hazard). Your ball IS your head. Alternate strokes: drag
// back from anywhere and release (the dotted line and meter show the shot); pull all the way to the red zone for a
// Happy Gilmore run-up drive (more power, a little wild). Points per hole: 200 for an ace, 30 less per extra stroke.
// Online (s.online): the putter's phone rolls the ball: {sh:[vx,vy,happy]}, then {sn:[x,y],g: gopher} about 12 times a
// second (the other phone glides the ball there and shows that gopher), and {fin:{x,y,n: strokes,k:'sink'|'stop',w: water}}
// when it stops, so both phones score the hole from the same lie.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,sfx,makeShake,makeFx,label,SANS,rr}=require("src/engines/tarantinoKit.js");
const {vibrate}=require("src/audio.js");
const {isCpu,isOnline,cpuSkill}=require("src/engines/cpuKit.js");

// Holes in a 60 x 100 portrait frame (tee at the bottom). walls: closed outline; blocks: [x,y,w,h]; slope: [x,y,w,h,ax,ay].
const HOLES=[
 {name:"Happy's Run-Up",par:2,tee:[30,90],cup:[30,12],outline:[[18,96],[42,96],[42,60],[50,52],[50,6],[10,6],[10,52],[18,60]],blocks:[[22,40,6,4],[34,28,6,4]],slopes:[[10,44,40,14,0,26]],sand:[[38,8,10,10]],water:[],windmill:null,gophers:[]},
 {name:'Bushwood Windmill',par:3,tee:[14,90],cup:[46,12],outline:[[6,96],[24,96],[24,58],[54,58],[54,4],[34,4],[34,40],[6,40]],blocks:[[24,64,0,0]],slopes:[],sand:[[6,42,10,8]],water:[],windmill:{x:44,y:30,r:9,speed:1.6},gophers:[]},
 {name:"The Gopher's Lair",par:3,tee:[30,92],cup:[30,10],outline:[[14,97],[46,97],[46,70],[56,62],[56,4],[4,4],[4,62],[14,70]],blocks:[[20,50,20,3]],slopes:[],sand:[],water:[[4,24,18,16],[38,24,18,16]],windmill:null,gophers:[[18,62],[42,62],[30,34],[14,16],[46,16]]}
];
const COL=['#3aa8ff','#ff5a7a'];

async function minigolf(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const shake=makeShake(),fx=makeFx(),rand=seededRandom(s.seed+':putt');const score=[0,0];let hole=0,turn=0,state='wait',H0=HOLES[0],balls=[],drag=null,t=0,banner=null,view=null,gopher=null,gopherT=2,trail=[];
 const net=isOnline(s)?s.online:null,theirs=()=>!!net&&turn===net.remote;if(net)s.hotseat=true;let snapT=0,tgt=null;
 const finish=(b,k,w)=>{if(net&&!theirs())net.send({fin:{x:b.x,y:b.y,n:b.strokes,k,w:w?1:0}});};
 function segs(h){const out=[];const o=h.outline;for(let i=0;i<o.length;i++){const a=o[i],b=o[(i+1)%o.length];out.push([a[0],a[1],b[0],b[1]]);}for(const [bx,by,bw,bh] of h.blocks){if(!bw)continue;out.push([bx,by,bx+bw,by],[bx+bw,by,bx+bw,by+bh],[bx+bw,by+bh,bx,by+bh],[bx,by+bh,bx,by]);}return out;}
 function windSegs(h){const w=h.windmill;if(!w)return [];const out=[];for(let k=0;k<4;k++){const a=t*w.speed+k*Math.PI/2;out.push([w.x,w.y,w.x+Math.cos(a)*w.r,w.y+Math.sin(a)*w.r]);}return out;}
 const inRect=(px,py,[rx,ry,rw,rh])=>px>=rx&&px<=rx+rw&&py>=ry&&py<=ry+rh;
 function startHole(){H0=HOLES[hole];balls=[0,1].map(i=>({i,x:H0.tee[0]+(i?2:-2),y:H0.tee[1],vx:0,vy:0,strokes:0,done:false,safe:{x:H0.tee[0]+(i?2:-2),y:H0.tee[1]},moving:false}));turn=hole%2;state='aim';banner={text:`HOLE ${hole+1}: ${H0.name.toUpperCase()}`,sub:`Par ${H0.par}`,t:2.2};}
 function nextTurn(){const live=balls.filter(b=>!b.done);if(!live.length){hole++;if(hole>=HOLES.length){state='over';setTimeout(()=>s.finish(score,`Happy Gilmore putt-putt · ${score[0]}–${score[1]}`),1400);banner={text:'FINAL',t:9};return;}startHole();return;}
  const other=balls[1-turn];turn=other.done?turn:1-turn;state='aim';banner={text:`${s.players[turn].name.toUpperCase()}'S STROKE`,t:1};}
 function shoot(vx,vy,happy,remote=false){if(net&&!remote){if(theirs())return;net.send({sh:[vx,vy,happy?1:0]});}snapT=0;tgt=null;const b=balls[turn];b.safe={x:b.x,y:b.y};b.vx=vx;b.vy=vy;b.strokes++;b.moving=true;state='roll';trail=[];if(happy){sfx.whoosh(500,2500,.1,.3);noise(.08,.1,{f0:3000,f1:600,delay:.25});s.react?.(turn,'silly',1.2);banner={text:'HAPPY GILMORE!',t:1};}else{voice(520,.05,.05,'triangle');noise(.05,.05,{type:'highpass',f0:2800});}}
 // input: drag back anywhere
 const toCourse=(px,py)=>{const v=view;const lx=(px-v.ox)/v.k,ly=(py-v.oy)/v.k;return v.rot?{x:60-ly,y:lx}:{x:lx,y:ly};};
 // vs CPU: golfer 2 simulates putts (walls, sand, slopes, water) over a grid of angles and powers, plays the one that sinks or ends nearest the cup, with error on Easy
 const cpu=isCpu(s);let cpuWait=0;
 function simPutt(b0,vx,vy){const S=segs(H0);let x0=b0.x,y0=b0.y;for(let k=0;k<600;k++){const h=1/60,sp=Math.hypot(vx,vy);if(sp<1)break;const fr=H0.sand.some(r=>inRect(x0,y0,r))?4.5:1.05;for(const sl of H0.slopes)if(inRect(x0,y0,sl)){vx+=sl[4]*h;vy+=sl[5]*h;}const dec=Math.max(0,sp-(sp*fr+7)*h);vx*=dec/sp;vy*=dec/sp;x0+=vx*h;y0+=vy*h;
   for(const [x1,y1,x2,y2] of S){const ex=x2-x1,ey=y2-y1,L2=ex*ex+ey*ey||1;let u=clamp(((x0-x1)*ex+(y0-y1)*ey)/L2,0,1);const px=x1+ex*u,py=y1+ey*u,dx=x0-px,dy=y0-py,d=Math.hypot(dx,dy);if(d<1.2&&d>0){const nx=dx/d,ny=dy/d;x0=px+nx*1.2;y0=py+ny*1.2;const vn=vx*nx+vy*ny;if(vn<0){vx-=1.75*vn*nx;vy-=1.75*vn*ny;}}}
   const cd=Math.hypot(H0.cup[0]-x0,H0.cup[1]-y0);if(cd<2.1&&Math.hypot(vx,vy)<58)return 0;if(H0.water.some(r=>inRect(x0,y0,r)))return 99;}return Math.hypot(H0.cup[0]-x0,H0.cup[1]-y0);}
 function cpuPutt(dt){if(state!=='aim'||turn!==1){cpuWait=0;return;}cpuWait+=dt;if(cpuWait<1.1)return;cpuWait=-99;const b=balls[1],sk=cpuSkill(s);let best=null,bd=1e9;
  for(let a=0;a<Math.PI*2;a+=Math.PI/45)for(let pw=.12;pw<=1;pw+=.06){const d=simPutt(b,Math.cos(a)*pw*100,Math.sin(a)*pw*100);if(d<bd){bd=d;best={a,pw};}if(d===0)break;}
  if(!best)best={a:Math.atan2(H0.cup[1]-b.y,H0.cup[0]-b.x),pw:.5};const e=1-sk,a=best.a+(Math.random()-.5)*e*.18,pw=clamp(best.pw*(1+(Math.random()-.5)*e*.3),.05,1);shoot(Math.cos(a)*pw*100,Math.sin(a)*pw*100,false);}
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||state!=='aim'||!view||cpu&&turn===1||theirs())return;ev.preventDefault();const p=s.pointer(ev);drag={id:ev.pointerId,sx:p.x,sy:p.y,x:p.x,y:p.y};s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(!drag||ev.pointerId!==drag.id)return;ev.preventDefault();const p=s.pointer(ev);drag.x=p.x;drag.y=p.y;});
 const shotVec=()=>{if(!drag)return null;const a=toCourse(drag.sx,drag.sy),b=toCourse(drag.x,drag.y);let dx=a.x-b.x,dy=a.y-b.y;const d=Math.hypot(dx,dy);if(d<1.5)return null;const pw=clamp(d/32,0,1.25);return {dx:dx/d,dy:dy/d,pw};};
 for(const ty of ['pointerup','pointercancel'])s.on(c,ty,ev=>{if(!drag||ev.pointerId!==drag.id)return;s.release(ev);const v=shotVec();drag=null;if(ty!=='pointerup'||!v||state!=='aim')return;const happy=v.pw>1;const sp=(happy?118:v.pw*100);const wob=happy?(rand()-.5)*.25:0;const ca=Math.cos(wob),sa=Math.sin(wob);shoot((v.dx*ca-v.dy*sa)*sp,(v.dx*sa+v.dy*ca)*sp,happy);});
 s.on(document,'keydown',ev=>{if((ev.key===' '||ev.key==='Enter')&&state==='aim'&&!theirs()){ev.preventDefault();const b=balls[turn],dx=H0.cup[0]-b.x,dy=H0.cup[1]-b.y,d=Math.hypot(dx,dy)||1;shoot(dx/d*Math.min(95,d*1.9),dy/d*Math.min(95,d*1.9),false);}});
 s.hint('Take turns stroke by stroke. Drag back from anywhere and let go: the dotted line shows the direction, the meter the power. Drag into the red for a Happy Gilmore run-up (more power, a bit wild). Water returns your ball to its last lie with a penalty; the gopher bumps balls that roll past him. Space shoots straight at the cup.');
 function step(dt){
  if(cpu)cpuPutt(dt);
  if(state==='roll'&&theirs()){t+=dt;if(gopher){gopher.t-=dt;if(gopher.t<=0)gopher=null;}const b=balls[turn];if(tgt){const a=Math.min(1,dt*14);b.x+=(tgt[0]-b.x)*a;b.y+=(tgt[1]-b.y)*a;trail.push({x:b.x,y:b.y});if(trail.length>40)trail.shift();}return;}
  t+=dt;gopherT-=dt;if(H0.gophers.length&&gopherT<=0){gopherT=1.4+rand()*1.6;const g=H0.gophers[Math.floor(rand()*H0.gophers.length)];gopher={x:g[0],y:g[1],t:1.6};}if(gopher){gopher.t-=dt;if(gopher.t<=0)gopher=null;}
  if(state!=='roll')return;const b=balls[turn];
  if(net){snapT-=dt;if(snapT<=0){snapT=1/12;net.send({sn:[+b.x.toFixed(2),+b.y.toFixed(2)],g:gopher?[gopher.x,gopher.y,+gopher.t.toFixed(2)]:0});}}
  const n=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/.6));const S=[...segs(H0),...windSegs(H0)];
  for(let k=0;k<n;k++){const h=dt/n;let fr=inRect(b.x,b.y,H0.sand[0]||[0,0,0,0])||H0.sand.some(r=>inRect(b.x,b.y,r))?4.5:1.05;const sp=Math.hypot(b.vx,b.vy);
   for(const sl of H0.slopes)if(inRect(b.x,b.y,sl)){b.vx+=sl[4]*h;b.vy+=sl[5]*h;}
   const dec=Math.max(0,sp-(sp*fr+7)*h);if(sp>0){b.vx*=dec/sp;b.vy*=dec/sp;}b.x+=b.vx*h;b.y+=b.vy*h;
   for(const [x1,y1,x2,y2] of S){const ex=x2-x1,ey=y2-y1,L2=ex*ex+ey*ey||1;let u=((b.x-x1)*ex+(b.y-y1)*ey)/L2;u=clamp(u,0,1);const px=x1+ex*u,py=y1+ey*u,dx=b.x-px,dy=b.y-py,d=Math.hypot(dx,dy);
    if(d<1.2&&d>0){const nx=dx/d,ny=dy/d;b.x=px+nx*1.2;b.y=py+ny*1.2;const vn=b.vx*nx+b.vy*ny;if(vn<0){b.vx-=1.75*vn*nx;b.vy-=1.75*vn*ny;if(-vn>12){voice(240+Math.random()*60,.04,.04,'square');fx.spark(view?sx(b.x,b.y).x:0,view?sx(b.x,b.y).y:0,4,'#ffe9a8',120);}}}}
   if(gopher&&Math.hypot(b.x-gopher.x,b.y-gopher.y)<3){const a=rand()*Math.PI*2;b.vx=Math.cos(a)*45;b.vy=Math.sin(a)*45;gopher.t=0;banner={text:'GOPHER!',t:1};voice(800,.08,.05,'square',{slide:.5});s.react?.(turn,'angry',1.2);}
   const cdx=H0.cup[0]-b.x,cdy=H0.cup[1]-b.y,cd=Math.hypot(cdx,cdy);if(cd<2.1){const v=Math.hypot(b.vx,b.vy);if(v<58){finish(b,'sink');sink(b);return;}b.vx+=cdx*8*h;b.vy+=cdy*8*h;}
   if(H0.water.some(r=>inRect(b.x,b.y,r))){const P=sx(b.x,b.y);fx.splat(P.x,P.y,{n:20,speed:180,color:'#7fd0ff',size:3,decal:false});noise(.4,.08,{f0:600,f1:150});b.strokes++;b.x=b.safe.x;b.y=b.safe.y;b.vx=b.vy=0;banner={text:'WATER! +1',t:1.2};finish(b,'stop',true);endRoll(b);return;}}
  trail.push({x:b.x,y:b.y});if(trail.length>40)trail.shift();
  if(Math.hypot(b.vx,b.vy)<1.2){b.vx=b.vy=0;finish(b,'stop');endRoll(b);}
 }
 function sink(b){b.done=true;b.moving=false;b.vx=b.vy=0;b.x=H0.cup[0];b.y=H0.cup[1];const pts=Math.max(20,200-30*(b.strokes-1));score[b.i]+=pts;s.setScores(score);banner={text:b.strokes===1?'HOLE IN ONE!':`IN! +${pts}`,t:1.6};sfx.fanfare();s.react?.(b.i,'win',1.6);state='pause';setTimeout(()=>{if(s.alive&&state==='pause')nextTurn();},1300);}
 function endRoll(b){b.moving=false;if(b.strokes>=6&&!b.done){b.done=true;score[b.i]+=10;s.setScores(score);banner={text:'SIX STROKES · PICK UP',t:1.4};}state='pause';setTimeout(()=>{if(s.alive&&state==='pause')nextTurn();},500);}
 let sx=(X,Y)=>({x:X,y:Y});
 s.frame(dt=>{
  if(banner){banner.t-=dt;if(banner.t<=0&&state!=='over')banner=null;}shake.step(dt);fx.step(dt);if(state!=='wait'&&state!=='over')step(dt);else t+=dt;
  const W=s.W,H=s.H,portrait=H>W*1.05,top=48;let k,ox,oy,rot=false;
  if(portrait){k=Math.min(W/62,(H-top-8)/102);ox=(W-60*k)/2;oy=top+(H-top-100*k)/2;}else{rot=true;k=Math.min((W-20)/102,(H-top-8)/62);ox=(W-100*k)/2;oy=top+(H-top-60*k)/2;}
  view={k,ox,oy,rot};sx=rot?(X,Y)=>({x:ox+Y*k,y:oy+(60-X)*k}):(X,Y)=>({x:ox+X*k,y:oy+Y*k});
  x.setTransform(1,0,0,1,0,0);const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#2f6a2a');bg.addColorStop(1,'#1d4a1c');x.fillStyle=bg;x.fillRect(0,0,W,H);
  for(let q=0;q<40;q++){const X=(q*173)%W,Y=(q*97)%H;x.fillStyle='#173d17';x.beginPath();x.arc(X,Y,10+q%5*4,0,Math.PI*2);x.fill();}
  if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  // course in course space
  x.save();if(rot){x.translate(ox,oy+60*k);x.rotate(-Math.PI/2);x.scale(k,k);}else{x.translate(ox,oy);x.scale(k,k);}
  const o=H0.outline;x.beginPath();o.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fillStyle='#4fb84a';x.fill();
  x.save();x.clip();for(let yy=0;yy<100;yy+=4){x.fillStyle=yy%8?'#55c050':'#4ab345';x.fillRect(0,yy,60,4);}x.restore();
  x.lineWidth=2.2;x.strokeStyle='#7a4a24';x.lineJoin='round';x.stroke();x.lineWidth=.8;x.strokeStyle='#a8703c';x.stroke();
  for(const sl of H0.slopes){x.fillStyle='#3e9a3a66';x.fillRect(sl[0],sl[1],sl[2],sl[3]);x.strokeStyle='#ffffff66';x.lineWidth=.5;for(let q=0;q<4;q++){const ax=sl[0]+sl[2]*(q+.5)/4,ay=sl[1]+sl[3]/2+((t*8)%6)-3;x.beginPath();x.moveTo(ax-1.5,ay-1.5*Math.sign(sl[5]||1));x.lineTo(ax,ay);x.lineTo(ax+1.5,ay-1.5*Math.sign(sl[5]||1));x.stroke();}}
  for(const r of H0.sand){x.fillStyle='#e8d29a';rr(x,r[0],r[1],r[2],r[3],3);x.fill();}
  for(const r of H0.water){const g=x.createLinearGradient(r[0],r[1],r[0]+r[2],r[1]+r[3]);g.addColorStop(0,'#3a9ad8');g.addColorStop(1,'#1f6aa8');x.fillStyle=g;rr(x,r[0],r[1],r[2],r[3],4);x.fill();x.strokeStyle='#ffffff55';x.lineWidth=.4;for(let q=0;q<3;q++){x.beginPath();x.arc(r[0]+r[2]*(.3+q*.2),r[1]+r[3]*.5+Math.sin(t*2+q)*1.5,2,0,Math.PI);x.stroke();}}
  for(const [bx,by,bw,bh] of H0.blocks){if(!bw)continue;x.fillStyle='#7a4a24';x.fillRect(bx,by,bw,bh);x.fillStyle='#a8703c';x.fillRect(bx,by,bw,bh*.35);}
  // cup + flag
  const [cx2,cy2]=H0.cup;x.fillStyle='#0d2a0d';x.beginPath();x.arc(cx2,cy2,2.1,0,Math.PI*2);x.fill();x.strokeStyle='#ddd';x.lineWidth=.4;x.beginPath();x.moveTo(cx2,cy2);x.lineTo(cx2,cy2-9);x.stroke();x.fillStyle='#e8325a';x.beginPath();x.moveTo(cx2,cy2-9);x.lineTo(cx2+5+Math.sin(t*4)*.6,cy2-7.5);x.lineTo(cx2,cy2-6);x.fill();
  // windmill
  if(H0.windmill){const w=H0.windmill;x.fillStyle='#c8b090';x.beginPath();x.arc(w.x,w.y,2.4,0,Math.PI*2);x.fill();x.strokeStyle='#f4efe6';x.lineWidth=1.3;x.lineCap='round';for(const [a,b,c2,d] of windSegs(H0)){x.beginPath();x.moveTo(a,b);x.lineTo(c2,d);x.stroke();}x.fillStyle='#8a3a2a';x.beginPath();x.arc(w.x,w.y,1.2,0,Math.PI*2);x.fill();}
  // gopher holes
  for(const g of H0.gophers){x.fillStyle='#3a2a14';x.beginPath();x.ellipse(g[0],g[1],1.8,1.2,0,0,Math.PI*2);x.fill();}
  if(gopher){const up=Math.min(1,gopher.t*3,(1.6-gopher.t)*3);x.fillStyle='#8a6a3a';x.beginPath();x.ellipse(gopher.x,gopher.y-1.5*up,1.6,2.2*up,0,0,Math.PI*2);x.fill();x.fillStyle='#000';x.fillRect(gopher.x-.7,gopher.y-2.4*up,.35,.35);x.fillRect(gopher.x+.35,gopher.y-2.4*up,.35,.35);x.fillStyle='#fff';x.fillRect(gopher.x-.3,gopher.y-1.5*up,.6,.5);}
  x.restore();
  // trail, aim, balls (screen space)
  if(trail.length>1){x.strokeStyle='#ffffff55';x.lineWidth=2;x.beginPath();trail.forEach((p,i)=>{const P=sx(p.x,p.y);i?x.lineTo(P.x,P.y):x.moveTo(P.x,P.y);});x.stroke();}
  const v=state==='aim'?shotVec():null;
  if(v){const b=balls[turn],P=sx(b.x,b.y),Q=sx(b.x+v.dx*8,b.y+v.dy*8),len=Math.min(v.pw,1)*k*28;const ux=(Q.x-P.x),uy=(Q.y-P.y),ul=Math.hypot(ux,uy)||1;x.fillStyle='#ffffffcc';for(let q=1;q<=10;q++){const f=q/10*len;x.beginPath();x.arc(P.x+ux/ul*f,P.y+uy/ul*f,2.4,0,Math.PI*2);x.fill();}
   const mw=Math.min(180,W*.4),mx=W/2-mw/2,my=H-26;x.fillStyle='#000a';rr(x,mx-4,my-4,mw+8,16,8);x.fill();x.fillStyle=v.pw>1?'#ff3b3b':'#ffd23f';x.fillRect(mx,my,mw*Math.min(1,v.pw/1.25),8);x.fillStyle='#ff3b3b55';x.fillRect(mx+mw*.8,my,mw*.2,8);}
  for(const b of balls){if(b.done)continue;const P=sx(b.x,b.y),r=Math.max(12,k*1.7);x.fillStyle='#0005';x.beginPath();x.ellipse(P.x+2,P.y+3,r,r*.6,0,0,Math.PI*2);x.fill();x.save();if(b.i===turn&&state==='aim'){x.shadowColor=COL[b.i];x.shadowBlur=14;}x.fillStyle='#fff';x.beginPath();x.arc(P.x,P.y,r,0,Math.PI*2);x.fill();x.restore();s.sprite(x,b.i,P.x,P.y,r*2.3,{exact:true});x.strokeStyle=COL[b.i];x.lineWidth=2;x.beginPath();x.arc(P.x,P.y,r,0,Math.PI*2);x.stroke();}
  fx.draw(x);
  const narrow=W<560;for(let i=0;i<2;i++)label(x,`${s.players[i].name} ${score[i]}${balls[i]&&!narrow?` · stroke ${balls[i].strokes}`:''}`,i?W-130:12,22,14,{fill:COL[i],align:i?'right':'left',font:`900 14px ${SANS}`});
  label(x,`HOLE ${hole+1}/${HOLES.length}${balls[turn]?` · ${s.players[turn].name} stroke ${balls[turn].strokes+(state==='aim'?1:0)}`:''}`,W/2,narrow?42:22,13,{fill:'#ffffffcc'});
  if(banner){label(x,banner.text,W/2,H*.42,clamp(W*.055,18,36),{fill:'#fff3c0',stroke:'#1a3a10',alpha:state==='over'?1:clamp(banner.t*2,0,1)});if(banner.sub)label(x,banner.sub,W/2,H*.42+30,16,{fill:'#fff',alpha:clamp(banner.t*2,0,1)});}
  s.debug={engine:'minigolf',hole,turn,balls,state,score,bot:net?()=>{if(state!=='aim'||theirs()||s.paused||banner)return '';const b=balls[turn],dx=H0.cup[0]-b.x,dy=H0.cup[1]-b.y,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx)+(Math.random()-.5)*.6,p=Math.min(95,d*(1.4+Math.random()))*(1);shoot(Math.cos(a)*p,Math.sin(a)*p,false);return 'putt';}:null};
 });
 if(net)void (async()=>{const wait=f=>(async()=>{while(s.alive&&!f())await new Promise(r=>setTimeout(r,50));})();for(;;){const m=await net.next();if(!m||!s.alive)return;
  if(Array.isArray(m.sh)){await wait(()=>state==='aim'&&theirs());if(!s.alive)return;const [vx,vy,hp]=m.sh;if(!Number.isFinite(vx)||!Number.isFinite(vy))continue;shoot(vx,vy,hp===1,true);}
  else if(Array.isArray(m.sn)){if(state==='roll'&&theirs()){tgt=m.sn;gopher=Array.isArray(m.g)?{x:+m.g[0],y:+m.g[1],t:+m.g[2]}:gopher;}}
  else if(m.fin){await wait(()=>state==='roll'&&theirs());if(!s.alive)return;const b=balls[turn],f=m.fin;b.x=+f.x;b.y=+f.y;b.vx=b.vy=0;if(Number.isFinite(f.n))b.strokes=f.n;tgt=null;
   if(f.w){const P=sx(b.x,b.y);fx.splat(P.x,P.y,{n:20,speed:180,color:'#7fd0ff',size:3,decal:false});noise(.4,.08,{f0:600,f1:150});banner={text:'WATER! +1',t:1.2};}
   if(f.k==='sink')sink(b);else endRoll(b);}}})();
 if(!await s.pass(0,`Putt-putt at Bushwood: three holes, taking turns stroke by stroke. Your ball is your head. Drag back from anywhere and let go; drag into the red for a Happy Gilmore run-up. Watch out for the windmill, the water and the gopher.`,'Tee off',{countdown:0}))return;
 startHole();
}
Object.assign(exports,{minigolf});
