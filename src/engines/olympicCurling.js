// Taskmaster · Phone Curling, rebuilt as Olympic curling on a pebbled ice sheet: the house (blue/white/red rings),
// hog and tee lines, granite stones with coloured handles and your head on top, curl that grows as the stone slows,
// and sweeping: rub your finger back and forth anywhere while your stone slides to make it run further and straighter.
// Take turns: drag back from your stone and release; tap ↺/↻ first to choose the turn. Four stones each per end, two
// ends; only the closest side scores, one point per stone nearer than the rival's best.
// Online (s.online): the thrower's phone runs the physics: {th:{vx,vy,spin}} on release, then stone snapshots
// {sn:[[id,x,y,rot,out]...],w: sweep} about 12 times a second (the other phone glides its stones to them), and {fin}
// with the exact resting stones when everything stops, so both phones score the end from the same sheet.
const {clamp}=require("src/utils.js");
const {voice,noise,makeShake,label,SANS,rr}=require("src/engines/tarantinoKit.js");
const {vibrate}=require("src/audio.js");
const {isCpu,isOnline,cpuSkill}=require("src/engines/cpuKit.js");

const SW=34,SL=96,HOUSE={x:17,y:18},RINGS=[13,9,4.6,1.8],SR=2.5,speedFor=w=>9+w*9.5,ENDS=2,PER=4,COL=['#e8c41e','#d8323a'];

async function curling(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const shake=makeShake();const score=[0,0];let sid=0,end=0,thrown=0,turn=0,stones=[],cur=null,state='wait',drag=null,spin=[1,1],sweep=0,banner=null,t=0,view=null,rub=null,endPts=null;
 const toSheet=(px,py)=>{const v=view;const lx=(px-v.ox)/v.k,ly=(py-v.oy)/v.k;return v.rot?{x:SW-ly,y:lx}:{x:lx,y:ly};};
 let sx=(X,Y)=>({x:X,y:Y});
 function newStone(){cur={id:++sid,x:SW/2,y:SL-8,vx:0,vy:0,o:turn,spin:spin[turn],moving:false,rot:0};}
 const net=isOnline(s)?s.online:null,theirs=()=>!!net&&turn===net.remote;if(net)s.hotseat=true;let snapT=0,fin=false;
 const snap=()=>[...stones,...(cur?[cur]:[])].map(st=>[st.id,+st.x.toFixed(3),+st.y.toFixed(3),+st.rot.toFixed(2),st.out?1:0]);
 function applySnap(list,exact){for(const [id,X,Y,R,out] of list){const st=cur?.id===id?cur:stones.find(q=>q.id===id);if(!st)continue;st.tx=X;st.ty=Y;st.rot=R;st.out=!!out;if(exact){st.x=X;st.y=Y;st.moving=false;st.vx=st.vy=0;}}stones=stones.filter(st=>!st.out);}
 function throwStone(vx,vy){if(net){if(theirs())return;net.send({th:{vx,vy,spin:cur.spin}});}cur.vx=vx;cur.vy=vy;cur.moving=true;state='slide';snapT=0;voice(160,.3,.04,'sine',{slide:.7});noise(.6,.03,{f0:500,f1:300});}
 function startEnd(){stones=[];thrown=0;turn=end%2;newStone();state='aim';banner={text:`END ${end+1} OF ${ENDS}`,t:1.6};}
 function chipRect(){const W=s.W,H=s.H;return {x:W-74,y:H-64,w:62,h:50};}
 // vs CPU: skip 2 simulates its own stone's curl and slow-down to pick the spin, line and weight that stop on the button (error on Easy)
 const cpu=isCpu(s);let cpuWait=0;
 function cpuThrow(dt){if(state!=='aim'||turn!==1){cpuWait=0;return;}cpuWait+=dt;if(cpuWait<1.3)return;cpuWait=-99;const sk=cpuSkill(s);let best=null,bd=1e9;
  const land=(sp,dx,w)=>{const dy=-Math.sqrt(1-dx*dx),v0=speedFor(w);let x0=SW/2,y0=SL-8,vx=dx*v0,vy=dy*v0;for(let k=0;k<1500;k++){const h=1/60,v=Math.hypot(vx,vy);if(v<.25)break;const nv=Math.max(0,v-1.55*h);vx*=nv/v;vy*=nv/v;const curl=sp*clamp(3.2/(v+2),0,1.1);vx+=-vy/v*curl*h*.9;x0+=vx*h;y0+=vy*h;if(x0<SR||x0>SW-SR||y0<-2)return null;}return {x:x0,y:y0};};
  for(const sp of [1,-1])for(let dx=-.3;dx<=.3;dx+=.025)for(let w=.25;w<=1;w+=.025){const L=land(sp,dx,w);if(!L)continue;const d=Math.hypot(L.x-HOUSE.x,L.y-HOUSE.y);if(d<bd){bd=d;best={sp,dx,w};}}
  if(!best)best={sp:1,dx:0,w:.7};const e=1-sk,dx=clamp(best.dx+(Math.random()-.5)*e*.06,-.6,.6),w=clamp(best.w+(Math.random()-.5)*e*.08,0,1),v0=speedFor(w);spin[1]=best.sp;cur.spin=best.sp;throwStone(dx*v0,-Math.sqrt(1-dx*dx)*v0);}
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!view)return;ev.preventDefault();const p=s.pointer(ev);if(cpu&&turn===1||theirs())return;
  if(state==='aim'){const r=chipRect();if(p.x>=r.x&&p.y>=r.y&&p.x<=r.x+r.w&&p.y<=r.y+r.h){spin[turn]*=-1;cur.spin=spin[turn];voice(900,.04,.03,'sine');return;}drag={id:ev.pointerId,sx:p.x,sy:p.y,x:p.x,y:p.y};s.capture(ev);}
  else if(state==='slide'){rub={id:ev.pointerId,x:p.x,y:p.y,dist:0};s.capture(ev);}});
 s.on(c,'pointermove',ev=>{const p=s.pointer(ev);if(drag&&ev.pointerId===drag.id){drag.x=p.x;drag.y=p.y;}if(rub&&ev.pointerId===rub.id){const d=Math.hypot(p.x-rub.x,p.y-rub.y);rub.dist+=d;rub.x=p.x;rub.y=p.y;sweep=Math.min(1,sweep+d/90);}});
 const shotVec=()=>{if(!drag)return null;const a=toSheet(drag.sx,drag.sy),b=toSheet(drag.x,drag.y);const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);if(d<1.5||dy>=0)return null;return {dx:dx/d,dy:dy/d,w:clamp(d/26,0,1)};};
 for(const ty of ['pointerup','pointercancel'])s.on(c,ty,ev=>{if(rub&&ev.pointerId===rub.id)rub=null;if(!drag||ev.pointerId!==drag.id)return;s.release(ev);const v=shotVec();drag=null;if(ty!=='pointerup'||!v||state!=='aim')return;const sp=speedFor(v.w);throwStone(v.dx*sp,v.dy*sp);});
 s.on(document,'keydown',ev=>{if(theirs())return;if(state==='slide'&&(ev.key===' '||ev.key==='Enter')){sweep=1;ev.preventDefault();}else if(state==='aim'&&(ev.key===' '||ev.key==='Enter')){ev.preventDefault();throwStone(0,-14.6);}else if(state==='aim'&&(ev.key==='ArrowLeft'||ev.key==='ArrowRight')){spin[turn]=ev.key==='ArrowLeft'?-1:1;cur.spin=spin[turn];}});
 s.hint('On your turn tap ↺/↻ to pick the turn, then drag back from anywhere toward the bottom and let go: direction is your line, length is the weight. While it slides, rub a finger back and forth anywhere to sweep (it travels further and curls less). Four stones each per end, two ends; the closest side scores a point per stone nearer than the rival\'s best.');
 function physics(dt){
  const all=[...stones,cur].filter(Boolean);
  for(const st of all){if(!st.moving)continue;const v=Math.hypot(st.vx,st.vy);if(v<.25){st.vx=st.vy=0;st.moving=false;continue;}
   const swept=st===cur?sweep:0,dec=(1.55-swept*.5)*dt;const nv=Math.max(0,v-dec);st.vx*=nv/v;st.vy*=nv/v;
   const curl=st.spin*(1-swept*.7)*clamp(3.2/(v+2),0,1.1);st.vx+=-st.vy/v*curl*dt*.9;
   st.x+=st.vx*dt;st.y+=st.vy*dt;st.rot+=st.spin*dt*1.4;
   if(st.x<SR||st.x>SW-SR||st.y<-2){st.out=true;st.moving=false;}}
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const a=all[i],b=all[j];if(a.out||b.out)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<SR*2&&d>0){const nx=dx/d,ny=dy/d,ov=SR*2-d;a.x-=nx*ov/2;a.y-=ny*ov/2;b.x+=nx*ov/2;b.y+=ny*ov/2;const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv<0){const j2=-rv*.92;a.vx-=nx*j2;a.vy-=ny*j2;b.vx+=nx*j2;b.vy+=ny*j2;a.moving=b.moving=true;if(-rv>2){voice(140+Math.random()*40,.08,.08,'triangle');noise(.06,.08,{f0:2000,f1:600});shake.kick(Math.min(6,-rv));vibrate(12);}}}}
  stones=stones.filter(st=>!st.out);
 }
 function scoreEnd(){const d=st=>Math.hypot(st.x-HOUSE.x,st.y-HOUSE.y);const inHouse=stones.filter(st=>d(st)<=RINGS[0]+SR).sort((a,b)=>d(a)-d(b));if(!inHouse.length)return {w:-1,n:0};const w=inHouse[0].o,best=Math.min(...inHouse.filter(st=>st.o!==w).map(d),99);const n=inHouse.filter(st=>st.o===w&&d(st)<best).length;return {w,n};}
 s.frame(dt=>{
  t+=dt;shake.step(dt);if(banner){banner.t-=dt;if(banner.t<=0&&state!=='over')banner=null;}sweep=Math.max(0,sweep-dt*1.4);if(cpu)cpuThrow(dt);
  if(state==='slide'&&theirs()&&!fin){for(const st of [...stones,cur])if(st&&st.tx!==undefined){const a=Math.min(1,dt*14);st.x+=(st.tx-st.x)*a;st.y+=(st.ty-st.y)*a;}}
  else if(state==='slide'){if(!theirs())physics(dt);fin=false;if(sweep>.2&&Math.random()<dt*20)noise(.05,.02,{type:'highpass',f0:3000});
   if(net&&!theirs()){snapT-=dt;const moving=[...stones,cur].some(st=>st&&st.moving);if(!moving){const f=snap();applySnap(f,true);net.send({fin:f});}else if(snapT<=0){snapT=1/12;net.send({sn:snap(),w:+sweep.toFixed(2)});}}
   if(![...stones,cur].some(st=>st&&st.moving)){if(!cur.out&&cur.y<SL-26)stones.push(cur);else if(!cur.out&&cur.y>=SL-26){cur.out=true;banner={text:'HOGGED!',t:1.2};}thrown++;cur=null;
    if(thrown>=PER*2){const r=scoreEnd();endPts=r;if(r.w>=0){score[r.w]+=r.n;s.setScores(score);s.react?.(r.w,'win',2);}state='endscore';banner={text:r.w<0?'BLANK END':`${s.players[r.w].name.toUpperCase()} SCORES ${r.n}`,t:2.6};}
    else{turn=1-turn;newStone();state='aim';}}}
  if(state==='endscore'&&!banner){end++;if(end>=ENDS){state='over';banner={text:'FINAL',t:9};setTimeout(()=>s.finish(score,`Curling · ${score[0]}–${score[1]}`),1200);}else startEnd();}
  // ---- draw
  const W=s.W,H=s.H,portrait=H>W*1.05,top=48;let k,ox,oy,rot=false;
  if(portrait){k=Math.min(W/(SW+2),(H-top-6)/(SL+2));ox=(W-SW*k)/2;oy=top+(H-top-SL*k)/2;}else{rot=true;k=Math.min((W-10)/(SL+2),(H-top-6)/(SW+2));ox=(W-SL*k)/2;oy=top+(H-top-SW*k)/2;}
  view={k,ox,oy,rot};sx=rot?(X,Y)=>({x:ox+Y*k,y:oy+(SW-X)*k}):(X,Y)=>({x:ox+X*k,y:oy+Y*k});
  x.setTransform(1,0,0,1,0,0);x.fillStyle='#1b2433';x.fillRect(0,0,W,H);if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  x.save();if(rot){x.translate(ox,oy+SW*k);x.rotate(-Math.PI/2);x.scale(k,k);}else{x.translate(ox,oy);x.scale(k,k);}
  const ice=x.createLinearGradient(0,0,SW,0);ice.addColorStop(0,'#dfe9f2');ice.addColorStop(.5,'#f4f9fc');ice.addColorStop(1,'#dfe9f2');x.fillStyle=ice;x.fillRect(0,0,SW,SL);
  x.fillStyle='#c9d6e266';for(let q=0;q<160;q++)x.fillRect((q*7.3)%SW,(q*13.7)%SL,.25,.25);
  [['#2a62c8',RINGS[0]],['#f4f9fc',RINGS[1]],['#d8323a',RINGS[2]],['#f4f9fc',RINGS[3]]].forEach(([col,r])=>{x.fillStyle=col;x.beginPath();x.arc(HOUSE.x,HOUSE.y,r,0,Math.PI*2);x.fill();});
  x.strokeStyle='#d8323a';x.lineWidth=.35;x.beginPath();x.moveTo(0,SL-26);x.lineTo(SW,SL-26);x.stroke();x.strokeStyle='#2a3a6a';x.lineWidth=.2;x.beginPath();x.moveTo(0,HOUSE.y);x.lineTo(SW,HOUSE.y);x.moveTo(HOUSE.x,0);x.lineTo(HOUSE.x,SL);x.stroke();
  x.fillStyle='#2a3a6a';x.fillRect(SW/2-1.2,SL-5,2.4,1);
  x.strokeStyle='#8aa0b8';x.lineWidth=.6;x.strokeRect(0,0,SW,SL);
  x.restore();
  // aim line
  const v=state==='aim'?shotVec():null;
  if(v&&cur){let px=cur.x,py=cur.y,vx=v.dx*speedFor(v.w),vy=v.dy*speedFor(v.w);x.fillStyle='#2a3a6acc';for(let q=0;q<40;q++){for(let z=0;z<4;z++){const sp=Math.hypot(vx,vy);if(sp<.3)break;const nv=Math.max(0,sp-1.55*.12);vx*=nv/sp;vy*=nv/sp;const curl=cur.spin*clamp(3.2/(nv+2),0,1.1);vx+=-vy/Math.max(.1,nv)*curl*.12*.9;px+=vx*.12;py+=vy*.12;}const P=sx(px,py);x.beginPath();x.arc(P.x,P.y,2,0,Math.PI*2);x.fill();}
   const mw=Math.min(170,W*.4),mx=W/2-mw/2,my=H-24;x.fillStyle='#000a';rr(x,mx-4,my-4,mw+8,16,8);x.fill();x.fillStyle=v.w>.85?'#ff5a3a':'#7dd8ff';x.fillRect(mx,my,mw*v.w,8);}
  // stones
  for(const st of [...stones,...(cur?[cur]:[])]){const P=sx(st.x,st.y),r=SR*k;x.fillStyle='#0003';x.beginPath();x.ellipse(P.x+2,P.y+3,r,r*.8,0,0,Math.PI*2);x.fill();const g=x.createRadialGradient(P.x-r*.3,P.y-r*.3,r*.1,P.x,P.y,r);g.addColorStop(0,'#c9c9cf');g.addColorStop(1,'#5a5a66');x.fillStyle=g;x.beginPath();x.arc(P.x,P.y,r,0,Math.PI*2);x.fill();
   x.fillStyle=COL[st.o];x.beginPath();x.arc(P.x,P.y,r*.72,0,Math.PI*2);x.fill();x.save();x.translate(P.x,P.y);x.rotate(st.rot);x.fillStyle='#ffffffaa';x.fillRect(-r*.15,-r*.82,r*.3,r*.3);x.restore();
   s.sprite(x,st.o,P.x,P.y,r*1.45,{exact:true});}
  // sweep brooms
  if(state==='slide'&&cur&&sweep>.05){const P=sx(cur.x+cur.vx*.18,cur.y+cur.vy*.18);x.strokeStyle='#ffffffcc';x.lineWidth=3;for(let q=-1;q<=1;q+=2){const off=Math.sin(t*30+q)*k*1.4;x.beginPath();x.moveTo(P.x+q*k*1.5+off,P.y-k*.6);x.lineTo(P.x+q*k*1.5+off,P.y+k*.6);x.stroke();}label(x,'SWEEP!',P.x,P.y-k*4,14,{fill:'#7dd8ff'});}
  // HUD
  for(let i=0;i<2;i++)label(x,`${s.players[i].name} ${score[i]}`,i?W-130:12,22,15,{fill:COL[i],align:i?'right':'left',font:`900 15px ${SANS}`});
  label(x,`END ${Math.min(end+1,ENDS)}/${ENDS} · STONE ${Math.min(thrown+1,PER*2)}/${PER*2}`,W/2,W<560?42:22,13,{fill:'#ffffffcc'});
  if(state==='aim'){const r=chipRect();x.fillStyle='#000b';rr(x,r.x,r.y,r.w,r.h,12);x.fill();x.strokeStyle=COL[turn];x.lineWidth=2;x.stroke();label(x,cur.spin>0?'↻':'↺',r.x+r.w/2,r.y+r.h/2-4,26,{fill:'#fff',stroke:null});label(x,'TURN',r.x+r.w/2,r.y+r.h-9,9,{fill:'#ffffffaa',stroke:null});}
  if(banner)label(x,banner.text,W/2,H*.45,clamp(W*.055,18,36),{fill:'#fff',stroke:'#1a2a4a',alpha:state==='over'?1:clamp(banner.t*2,0,1)});
  s.debug={engine:'curling',stones,cur,state,score,end,thrown,bot:net?()=>{if(state!=='aim'||theirs()||s.paused||!cur)return '';if(Math.random()<.5)return '';const dx=(Math.random()-.5)*.25,w=.45+Math.random()*.4;throwStone(dx*speedFor(w),-Math.sqrt(1-dx*dx)*speedFor(w));return 'throw';}:null};
 });
 if(net)void (async()=>{for(;;){const m=await net.next();if(!m||!s.alive)return;
  if(m.th){while(s.alive&&(s.paused||state!=='aim'||!theirs()||!cur))await new Promise(r=>setTimeout(r,50));if(!s.alive)return;const {vx,vy,spin:sp}=m.th;if(![vx,vy].every(Number.isFinite))continue;cur.spin=sp<0?-1:1;spin[turn]=cur.spin;cur.vx=vx;cur.vy=vy;cur.moving=true;cur.tx=cur.x;cur.ty=cur.y;state='slide';voice(160,.3,.04,'sine',{slide:.7});noise(.6,.03,{f0:500,f1:300});}
  else if(m.sn&&Array.isArray(m.sn)&&state==='slide'){applySnap(m.sn,false);sweep=Math.max(sweep,+m.w||0);}
  else if(m.fin&&Array.isArray(m.fin)){while(s.alive&&state!=='slide')await new Promise(r=>setTimeout(r,50));applySnap(m.fin,true);for(const st of [...stones,cur])if(st)st.moving=false;fin=true;}}})();
 if(!await s.pass(0,`Curling: four stones each per end, two ends. On your turn pick ↺/↻, drag back and release; rub the screen while it slides to sweep. ${s.players[end%2].name} throws first.`,'Hurry hard!',{countdown:0}))return;
 startEnd();
}
Object.assign(exports,{curling});
