const {clamp}=require("src/utils.js");
const {PCOL,PDARK,PLIGHT,Fx,arenaKeys,arenaTouch,Countdown,banner,outlined,rr,snd,noise,jingle,gestureHint,settle}=require("src/engines/arenaKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField,roundOutcome}=require("src/engines/netField.js");
// Arrow Arena (after TowerFall): side-view arena, wrap-around edges, one hit kills. Drag to run, flick up to jump,
// tap to shoot toward the tap, stomp heads. Three arrows each; stuck arrows can be picked up again. First to 3 rounds.
// Online (netField): one fixed 12x19 tower on both phones (same seeded levels). Each phone runs its own archer and judges
// only what hits it: arrows (its own after a moment, or theirs, flown on this phone from {f}) and stomps by the other
// archer as shown here. Archer {f:{r,x,y,vx,vy,...}} 30/s; {k:[by,why,arrow,x,y]} = I went down, {pk:id} = picked an arrow up.
// Rounds settle with roundOutcome (deaths within .1 s = both down, no point).
const T=16,GRAV=900,RUN=112,JUMP=335,ARROW_V=360,ARROW_G=70,QUIVER=3,WIN_ROUNDS=3,MAX_ROUNDS=7,ROUND_CAP=22;
const HW=5,HH=7;

async function arrow(s){
 const [c,x]=s.canvas(900,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();if(!await settle(s))return;
 const fx=new Fx(),rnd=s.random;let W=s.W,H=s.H;
 const on=s.online||null,me=on?on.me:0,them=1-me,HUDY=on?40:0;
 const aspect=W/Math.max(1,H-40),C=on?12:aspect>1.3?24:12,R=on?19:aspect>1.3?12:clamp(Math.round(C/Math.max(.5,aspect)),14,19);
 const WW=C*T,WH=R*T;let sc=1,offx=0,offy=0,bgc=null,bgKey='';
 const fit=()=>{const top=Math.min(40,H*.07)+HUDY;sc=Math.min(W/WW,(H-top-4)/WH);offx=(W-WW*sc)/2;offy=top+(H-top-4-WH*sc)/2;};fit();
 const grid=Array.from({length:R},()=>Array(C).fill(false));
 const solid=(cx,cy)=>{if(cy<0||cy>=R)return true;return grid[cy][((cx%C)+C)%C];};
 const makeLevel=()=>{
  for(const row of grid)row.fill(false);for(let cx=0;cx<C;cx++){grid[R-1][cx]=true;grid[0][cx]=true;}
  const half=C/2,levels=[];for(let y=R-4;y>=3;y-=3)levels.push(y);
  levels.forEach((y,li)=>{const n=li%2?2:1;for(let k=0;k<n;k++){const len=3+Math.floor(rnd()*3),x0=1+Math.floor(rnd()*Math.max(1,half-len-1)),sx=n===2&&k===1?Math.min(half-len,x0+len+1):x0;for(let cx=sx;cx<Math.min(half,sx+len);cx++){grid[y][cx]=true;grid[y][C-1-cx]=true;}}});
  const my=levels[Math.min(1,levels.length-1)]||R-7;for(let cx=half-2;cx<half+2;cx++)grid[my][cx]=true;
  // never wall in the spawn areas
  for(const cx of [2,3,C-3,C-4])for(let y=R-4;y<R-1;y++)grid[y][cx]=false;
  bgc=null;
 };
 const mk=i=>({i,x:(i?C-3:2)*T+T/2,y:(R-1)*T-HH,vx:0,vy:0,face:i?-1:1,ground:false,coyote:0,buffer:0,arrows:QUIVER,cd:0,dead:false,deadT:0,joy:null,anchor:null,run:0,anim:0,aim:{x:i?-1:1,y:0},flash:0,head:null,jumps:0,stompBounce:0,kills:0});
 let ps=[mk(0),mk(1)],arrows=[],wins=[0,0],round=1,phase='intro',phaseT=0,note='',roundT=ROUND_CAP,time=0,endCheck=0,tapMarks=[];
 const intro=new Countdown(3),kb=arenaKeys(s);
 s.hint('Drag on your half to run. FLICK UP to jump. TAP to shoot an arrow toward where you tapped (tap right next to your archer to shoot the way you face). You have three arrows: pick stuck ones back up by running over them. One hit kills, and you can stomp heads. The screen wraps left to right. First to three rounds. P1: A/D run, W jump, Space shoot (hold W/S to aim up/down). P2: arrows + Enter.');

 const resetRound=()=>{makeLevel();arrows=[];ps=[mk(0),mk(1)];seen.at=0;OC=null;for(const p of ps){p.joy=null;p.anchor=null;}roundT=ROUND_CAP;endCheck=0;tapMarks=[];s.debug.ps=ps;s.debug.arrows=arrows;};
 // ------------------------------------------------------------------ physics
 const wrapX=v=>((v%WW)+WW)%WW;
 const dxw=(a,b)=>{let d=a-b;if(d>WW/2)d-=WW;if(d<-WW/2)d+=WW;return d;};
 const overlapTile=(p,px,py)=>{const x0=Math.floor((px-HW)/T),x1=Math.floor((px+HW-.001)/T),y0=Math.floor((py-HH)/T),y1=Math.floor((py+HH-.001)/T);for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++)if(solid(cx,cy))return true;return false;};
 const moveArcher=(p,dt)=>{
  let nx=p.x+p.vx*dt;if(overlapTile(p,nx,p.y)){let k=0;while(k++<6&&overlapTile(p,nx,p.y))nx-=Math.sign(p.vx)*.5;p.vx=0;}p.x=wrapX(nx);
  let ny=p.y+p.vy*dt;p.ground=false;
  if(overlapTile(p,p.x,ny)){const dir=Math.sign(p.vy);let k=0;while(k++<40&&overlapTile(p,p.x,ny))ny-=dir*.5;if(dir>0)p.ground=true;else if(p.vy<0)fx.burst(p.x,p.y-HH,{n:3,color:'#8a78c8',speed:50,life:.2,size:1.5});p.vy=0;}
  p.y=ny;
 };
 const jump=p=>{if(p.dead||phase!=='play')return;p.buffer=.13;};
 const fire=(p,dx,dy)=>{
  if(p.dead||phase!=='play'||p.cd>0)return;
  if(p.arrows<=0){snd(150,.08,{type:'square',vol:.03});fx.pop(p.x,p.y-14,'EMPTY',{size:9,color:'#ffd0d0'});p.cd=.2;return;}
  let l=Math.hypot(dx,dy);if(l<.01){dx=p.face;dy=0;l=1;}const ang=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4),ax=Math.cos(ang),ay=Math.sin(ang);
  p.aim={x:ax,y:ay};if(Math.abs(ax)>.3)p.face=Math.sign(ax);
  const ar={id:`${p.i}:${arrowN++}`,x:p.x+ax*7,y:p.y+ay*7-1,vx:ax*ARROW_V,vy:ay*ARROW_V,state:'fly',owner:p.i,age:0,ang,life:2.6};arrows.push(ar);p.arrows--;p.cd=.24;
  if(on)nf.event({r:round,f:[ar.id,+ar.x.toFixed(2),+ar.y.toFixed(2),+ar.vx.toFixed(2),+ar.vy.toFixed(2),+ang.toFixed(4)]});
  snd(520,.1,{type:'triangle',to:260,vol:.05});noise(.06,{vol:.04,freq:3000});fx.burst(p.x+ax*7,p.y+ay*7,{n:3,color:'#fff',speed:40,life:.2,size:1.2});
 };
 const kill=(p,by,why)=>{
  if(p.dead)return;p.dead=true;p.deadT=0;p.head={x:p.x,y:p.y-8,vx:(Math.random()-.5)*120+(by?Math.sign(dxw(p.x,by.x))*60:0),vy:-220,rot:0,vr:(Math.random()-.5)*14};
  fx.burst(p.x,p.y,{n:26,colors:[PCOL[p.i],'#fff',PLIGHT[p.i]],speed:200,life:.7,size:2.6,gravity:300,shape:'star'});fx.ring(p.x,p.y,{color:'#fff',r1:30,life:.35,width:3});fx.shake(10*sc/2.4+4);
  noise(.25,{vol:.09,freq:900});snd(260,.3,{type:'sawtooth',to:50,vol:.06});s.react?.(p.i,'sad');if(by)s.react?.(by.i,'happy');
  fx.pop(p.x,p.y-18,why==='stomp'?'STOMPED!':why==='self'?'OOPS!':'SKEWERED!',{size:14,color:'#fff'});
  try{navigator.vibrate?.(35);}catch{}
 };

 // ------------------------------------------------------------------ online
 let OC=null,playT0=0,arrowN=0,netBot=false;const pendO=[],seen={x:0,y:0,vx:0,vy:0,at:0};
 const rt=()=>(performance.now()-playT0)/1000;
 const nf=netField(s,{hz:30,
  pack:()=>{const p=ps[me];return {r:round,x:+p.x.toFixed(1),y:+p.y.toFixed(1),vx:Math.round(p.vx),vy:Math.round(p.vy),f:p.face,g:p.ground?1:0,a:p.arrows,ai:[+p.aim.x.toFixed(2),+p.aim.y.toFixed(2)],u:p.run,c:p.cd>0?1:0};},
  unpack:(i,d)=>{if(d?.r!==round||![d.x,d.y].every(Number.isFinite))return;const p=ps[them];Object.assign(seen,{x:d.x,y:d.y,vx:+d.vx||0,vy:+d.vy||0,at:performance.now()});p.face=d.f===-1?-1:1;p.ground=!!d.g;if(Number.isFinite(d.a))p.arrows=d.a;if(Array.isArray(d.ai))p.aim={x:+d.ai[0]||0,y:+d.ai[1]||0};p.run=d.u|0;p.cd=d.c?.1:0;},
  onEvent:e=>{if(Array.isArray(e.o)){if(OC&&e.o[0]===round)OC.feed(e.o);else if(e.o[0]>=round)pendO.push(e.o);return;}if(e.r!==round)return;const p=ps[them];
   if(Array.isArray(e.f)){const [id,ax,ay,vx,vy,ang]=e.f;if([ax,ay,vx,vy].every(Number.isFinite)){arrows.push({id,x:ax,y:ay,vx,vy,state:'fly',owner:them,age:0,ang:+ang||0,life:2.6});snd(520,.1,{type:'triangle',to:260,vol:.05});}}
   else if(Array.isArray(e.k)){const [by,why,id,kx,ky]=e.k;if(Number.isFinite(kx)&&Number.isFinite(ky)){p.x=kx;p.y=ky;}const a=id!=null&&arrows.find(q=>q.id===id);if(a){a.state='stuck';a.vx=a.vy=0;a.x=p.x;a.y=p.y;}
    if(by===me){ps[me].kills++;if(why==='stomp'){ps[me].vy=-JUMP*.7;ps[me].ground=false;}}kill(p,by===me?ps[me]:null,why);}
   else if(e.pk!==undefined){const a=arrows.find(q=>q.id===e.pk);if(a)a.state='gone';}}});
 // online: this phone's archer went down (by = the other archer, or -1)
 const netDie=(by,why,id)=>{const p=ps[me];nf.event({r:round,k:[by,why,id??null,+p.x.toFixed(1),+p.y.toFixed(1)]});OC?.die(rt());nf.push();};
 function theirStep(p,dt){if(!seen.at)return;const k=Math.min(.1,(performance.now()-seen.at)/1000),tx=wrapX(seen.x+seen.vx*k),ty=seen.y+seen.vy*k,e=Math.min(1,dt*20);
  p.x=wrapX(p.x+dxw(tx,p.x)*e);p.y+=(ty-p.y)*e;p.vx=seen.vx;p.vy=seen.vy;if(p.ground)p.anim+=Math.abs(p.vx)*dt*.12;p.cd=Math.max(0,p.cd-dt);p.flash=Math.max(0,p.flash-dt);}

 // ------------------------------------------------------------------ input
 const aimFromTap=(p,f)=>{const sx=offx+p.x*sc,sy=offy+p.y*sc,dx=f.x-sx,dy=f.y-sy;if(Math.hypot(dx,dy)<T*sc*1.3)return {x:p.face,y:0};return {x:dx,y:dy};};
 const touch=arenaTouch(s,{
  maxFingers:2,
  onDown:f=>{const p=ps[f.owner];if(p.joy===null||!touch.fingers.has(p.joy)){p.joy=f.id;p.anchor={x:f.x,y:f.y};f.data.move=true;}},
  onUp:(f,cancelled)=>{const p=ps[f.owner];if(p.joy===f.id){p.joy=null;p.anchor=null;}if(cancelled||phase!=='play')return;
   if(f.moved<14&&f.held<280){const a=aimFromTap(p,f);tapMarks.push({x:f.x,y:f.y,t:.25,i:p.i});fire(p,a.x,a.y);}
   else if(f.vel.y<-650&&!f.data.jumped)jump(p);}
 });
 kb.onDown((i,k)=>{const p=ps[i],st=kb.state[i];if(k==='u')jump(p);if(k==='fire'){const dx=st.r-st.l,dy=st.d-st.u;fire(p,dx||(dy?0:p.face),dy);}});
 const readInput=p=>{
  const st=kb.state[p.i];let run=st.r-st.l;
  if(p.joy!==null){const f=touch.fingers.get(p.joy);if(f){const dx=f.x-p.anchor.x;if(Math.abs(dx)>46){p.anchor.x=f.x-Math.sign(dx)*46;}if(Math.abs(f.x-p.anchor.x)>9)run=Math.sign(f.x-p.anchor.x);}}
  for(const f of touch.fingers.values()){if(f.owner!==p.i)continue;const v=touch.velocity(f);if(v.y<-700&&Math.abs(v.y)>Math.abs(v.x)*.8&&!f.data.jumped){f.data.jumped=true;jump(p);}else if(v.y>-250)f.data.jumped=false;}
  p.run=run;
 };

 // ------------------------------------------------------------------ update
 const stepArcher=(p,dt)=>{
  if(p.dead){p.deadT+=dt;if(p.head){const h=p.head;h.vy+=GRAV*.8*dt;h.x+=h.vx*dt;h.y+=h.vy*dt;h.rot+=h.vr*dt;if(h.y>WH-T-4){h.y=WH-T-4;h.vy*=-.45;h.vx*=.7;h.vr*=.6;}h.x=wrapX(h.x);}return;}
  if(on&&p.i!==me){theirStep(p,dt);return;}
  p.cd=Math.max(0,p.cd-dt);p.flash=Math.max(0,p.flash-dt);p.coyote=p.ground?.09:Math.max(0,p.coyote-dt);p.buffer=Math.max(0,p.buffer-dt);
  if(phase==='play'&&!OC?.R.frozen){readInput(p);const target=p.run*RUN,acc=p.ground?1500:900;p.vx+=clamp(target-p.vx,-acc*dt,acc*dt);if(p.run)p.face=p.run;
   if(p.buffer>0&&p.coyote>0){p.vy=-JUMP;p.buffer=0;p.coyote=0;p.ground=false;snd(380,.1,{type:'square',to:620,vol:.03});fx.burst(p.x,p.y+HH,{n:4,color:'#c8bfff',speed:50,life:.25,size:1.4});}}
  else p.vx*=Math.exp(-8*dt);
  p.vy=Math.min(p.vy+GRAV*dt,520);moveArcher(p,dt);if(p.ground)p.anim+=Math.abs(p.vx)*dt*.12;
  // pick up arrows
  for(const a of arrows)if(a.state==='stuck'&&p.arrows<QUIVER&&Math.abs(dxw(a.x,p.x))<HW+4&&Math.abs(a.y-p.y)<HH+4){a.state='gone';p.arrows++;if(on)nf.event({r:round,pk:a.id});snd(700,.08,{type:'triangle',to:1000,vol:.04});fx.burst(a.x,a.y,{n:4,color:'#ffe566',speed:60,life:.3,size:1.4});fx.pop(p.x,p.y-14,'+1',{size:10,color:'#ffe566',life:.6,rise:14});}
 };
 // vs CPU: archer 2 closes in (or backs off to keep range), jumps toward higher ground or over walls, refills its quiver and shoots along the 8 directions
 const cpu=isCpu(s);
 function cpuThink(dt,i=1){const p=ps[i],o=ps[1-i],sk=cpuSkill(s);const set=r=>{if(on){kb.state[i].r=r>0?1:0;kb.state[i].l=r<0?1:0;}else{kb.cpu('r',r>0);kb.cpu('l',r<0);}};if(phase!=='play'||p.dead){set(0);return;}
  let tx=o.x,ty=o.y;if(p.arrows<=0){let bd=1e9;for(const a of arrows)if(a.state==='stuck'){const d=Math.abs(dxw(a.x,p.x))+Math.abs(a.y-p.y);if(d<bd){bd=d;tx=a.x;ty=a.y;}}}
  const dx=dxw(o.x,p.x),dy=o.y-p.y,tdx=dxw(tx,p.x),away=p.arrows>0&&!o.dead&&Math.abs(dx)<T*2.5&&Math.abs(dy)<T*.8;let run=away?-Math.sign(dx):Math.abs(tdx)>T*.5?Math.sign(tdx):0;set(run);
  if(p.ground&&(ty<p.y-T*1.1&&Math.random()<dt*(2+sk*3)||run&&overlapTile(p,p.x+run*T*.7,p.y)))jump(p);
  if(p.arrows>0&&p.cd<=0&&!o.dead){const ang=Math.atan2(dy,dx),snap=Math.round(ang/(Math.PI/4))*(Math.PI/4);if(Math.abs(ang-snap)<.16+(1-sk)*.14&&Math.hypot(dx,dy)<WW*.6&&Math.random()<dt*(1.5+sk*5))fire(p,Math.cos(snap),Math.sin(snap));}}
 const update=dt=>{
  time+=dt;fx.update(dt);if(cpu)cpuThink(dt);if(on&&netBot)cpuThink(dt,me);for(const m of tapMarks)m.t-=dt;tapMarks=tapMarks.filter(m=>m.t>0);
  if(phase==='intro'){if(!intro.update(dt)){resetRound();phase='ready';phaseT=1;note='ROUND 1';}}
  else if(phase==='ready'){phaseT-=dt;if(phaseT<=0){phase='play';snd(700,.2,{type:'square',vol:.05});
   if(on){playT0=performance.now();OC=roundOutcome(nf,round);const keep=[];for(const o of pendO.splice(0))if(o[0]===round)OC.feed(o);else if(o[0]>round)keep.push(o);pendO.push(...keep);}}}
  else if(phase==='play'){roundT-=dt;
   // online: the round ends when both phones have called it (roundOutcome)
   if(on){if(roundT<=0)OC.timeUp();const res=OC.tick(rt());if(res)endRound(res==='me'?me:res==='them'?them:-1,res==='none'&&!ps.some(p=>p.dead)?'time':'kill');}
   else if(roundT<=0)endRound(-1,'time');}
  else if(phase==='roundover'||phase==='gameover'){phaseT-=dt;if(phaseT<=0){
   if(phase==='gameover'){s.finish(wins.slice(),`Arrow Arena: ${wins[0]} to ${wins[1]}`);return;}
   if(wins.some(w=>w>=WIN_ROUNDS)||round>=MAX_ROUNDS){phase='gameover';phaseT=2.4;const w=wins[0]===wins[1]?-1:wins[0]>wins[1]?0:1;note=w<0?'A TIE!':`${s.players[w].name} wins!`;jingle([523,659,784,1047,1319],{vol:.05,step:.09});}
   else if(on){round++;resetRound();phase='sync';void nf.start('r'+round).then(()=>{if(!s.alive)return;phase='ready';phaseT=1;note=`ROUND ${round}`;});}
   else{round++;resetRound();phase='ready';phaseT=1;note=`ROUND ${round}`;}}}
  // physics at fixed sub-steps
  const n=Math.max(1,Math.ceil(dt/(1/120))),h=dt/n;
  for(let k=0;k<n;k++){
   for(const p of ps)stepArcher(p,h);
   for(const a of arrows){
    if(a.state==='fly'){
     a.age+=h;a.life-=h;a.vy+=ARROW_G*h;const sp=Math.hypot(a.vx,a.vy);a.ang=Math.atan2(a.vy,a.vx);
     const nx=a.x+a.vx*h,ny=a.y+a.vy*h,tx=nx+Math.cos(a.ang)*5,ty=ny+Math.sin(a.ang)*5;
     if(solid(Math.floor(wrapX(tx)/T),Math.floor(ty/T))){a.state='stuck';a.vx=a.vy=0;a.x=wrapX(a.x+Math.cos(a.ang)*2);a.y=a.y+Math.sin(a.ang)*2;a.t=0;fx.burst(a.x+Math.cos(a.ang)*4,a.y+Math.sin(a.ang)*4,{n:5,color:'#c8bfff',speed:70,life:.25,size:1.4});noise(.05,{vol:.04,freq:2500});snd(220,.05,{type:'square',vol:.03});}
     else{a.x=wrapX(nx);a.y=ny;if(a.life<=0)a.state='gone';
      for(const p of ps){if(p.dead||phase!=='play')continue;if(a.owner===p.i&&a.age<.12)continue;if(on&&(p.i!==me||OC?.R.frozen))continue;
       if(Math.abs(dxw(a.x+Math.cos(a.ang)*4,p.x))<HW+1&&Math.abs(a.y+Math.sin(a.ang)*4-p.y)<HH+1){kill(p,ps[a.owner],a.owner===p.i?'self':'arrow');a.state='stuck';a.vx=a.vy=0;if(a.owner!==p.i)ps[a.owner].kills++;a.x=wrapX(a.x);if(on)netDie(a.owner===p.i?-1:a.owner,a.owner===p.i?'self':'arrow',a.id);break;}}}
    }
   }
   // stomps
   if(phase==='play')for(const a of ps){const b=ps[1-a.i];if(a.dead||b.dead)continue;if(on&&(b.i!==me||OC?.R.frozen))continue;if(a.vy>30&&Math.abs(dxw(a.x,b.x))<HW+HW-1&&a.y+HH>b.y-HH&&a.y+HH<b.y-HH+7&&a.y<b.y){kill(b,a,'stomp');if(!on){a.vy=-JUMP*.7;a.ground=false;}a.kills++;if(on)netDie(a.i,'stomp',null);}}
  }
  arrows=arrows.filter(a=>a.state!=='gone');s.debug.arrows=arrows;if(on&&phase!=='sync')nf.tick(dt);
  // round end detection
  if(phase==='play'&&!on){const d0=ps[0].dead,d1=ps[1].dead;if(d0||d1){endCheck+=dt;if(endCheck>.05)endRound(d0&&d1?-1:d0?1:0,'kill');}}
  s.setScores(wins.slice());
 };
 const endRound=(winner,why)=>{
  phase='roundover';phaseT=1.9;if(winner>=0){wins[winner]++;note=`${s.players[winner].name} takes the round`;s.react?.(winner,'win');jingle([523,659,784],{vol:.05});}else note=why==='time'?'Time! No point':'Both down!';
  s.setScores(wins.slice());
 };

 // ------------------------------------------------------------------ drawing
 const buildBg=()=>{
  const key=`${W}x${H}:${round}`;if(bgc&&bgKey===key)return;bgKey=key;bgc=document.createElement('canvas');bgc.width=Math.max(1,Math.ceil(WW*sc));bgc.height=Math.max(1,Math.ceil(WH*sc));const g=bgc.getContext('2d');g.scale(sc,sc);
  const sky=g.createLinearGradient(0,0,0,WH);sky.addColorStop(0,'#201a45');sky.addColorStop(.6,'#4a2f6e');sky.addColorStop(1,'#7a3d6a');g.fillStyle=sky;g.fillRect(0,0,WW,WH);
  g.fillStyle='#fff6d8';g.beginPath();g.arc(WW*.5,WH*.28,WH*.09,0,6.283);g.fill();g.fillStyle='#e8dcb4';g.beginPath();g.arc(WW*.5+WH*.03,WH*.26,WH*.025,0,6.283);g.fill();
  for(let k=0;k<40;k++){g.fillStyle=`rgba(255,255,255,${.2+((k*37)%10)/20})`;g.fillRect((k*97)%WW,(k*53)%(WH*.6),1,1);}
  g.fillStyle='#2b2058';g.beginPath();g.moveTo(0,WH);for(let k=0;k<=12;k++)g.lineTo(k*WW/12,WH*(.62-.12*Math.abs(Math.sin(k*1.9))));g.lineTo(WW,WH);g.fill();
  g.fillStyle='#1d1640';g.beginPath();g.moveTo(0,WH);for(let k=0;k<=9;k++)g.lineTo(k*WW/9,WH*(.74-.08*Math.abs(Math.sin(k*2.7+1))));g.lineTo(WW,WH);g.fill();
  for(let cy=0;cy<R;cy++)for(let cx=0;cx<C;cx++){if(!grid[cy][cx])continue;const px=cx*T,py=cy*T,top=!solid(cx,cy-1);
   g.fillStyle='#4d4380';g.fillRect(px,py,T,T);g.fillStyle='#5f54a0';g.fillRect(px+1,py+1,T-2,T/2-1);g.fillStyle='#3a3162';g.fillRect(px,py+T-3,T,3);
   g.strokeStyle='#2b2450';g.lineWidth=.6;g.strokeRect(px+.3,py+.3,T-.6,T-.6);g.beginPath();g.moveTo(px,py+T/2);g.lineTo(px+T,py+T/2);g.moveTo(px+T/2,py+T/2);g.lineTo(px+T/2,py+T);g.moveTo(px+T/4,py);g.lineTo(px+T/4,py+T/2);g.stroke();
   if(top){g.fillStyle='#7fe08a';g.fillRect(px,py-1.2,T,3.2);g.fillStyle='#a8f2a8';g.fillRect(px,py-1.2,T,1.2);for(let k=0;k<4;k++){g.fillStyle='#7fe08a';g.fillRect(px+k*4+1,py+1.5,1.4,2+((cx+k)%2));}}}
 };
 const drawArcher=(p,ox)=>{
  const f=p.face;x.save();x.translate(p.x+ox,p.y);
  if(p.dead){x.restore();return;}
  const blink=p.flash>0&&Math.floor(time*30)%2;if(blink)x.globalAlpha=.5;
  x.fillStyle='#00000030';x.beginPath();x.ellipse(0,HH+.5,6,1.6,0,0,6.283);x.fill();
  const step=p.ground&&Math.abs(p.vx)>10?Math.sin(p.anim*6)*2.4:0,air=!p.ground;
  x.fillStyle='#2a2140';x.fillRect(-3.4+(air?0:step)-.5,HH-4,3,4.5);x.fillRect(.6-(air?0:step)-.5,HH-4,3,4.5);
  // cloak
  x.fillStyle=PDARK[p.i];x.beginPath();x.moveTo(-f*3,-1);x.lineTo(-f*(7+Math.min(4,Math.abs(p.vx)*.04)),HH-1.5+(air?-2:0));x.lineTo(f*3,HH-1);x.lineTo(f*3,-1);x.closePath();x.fill();
  x.fillStyle=PCOL[p.i];rr(x,-4,-3,8,9.5,2.4);x.fill();x.strokeStyle='#fff';x.lineWidth=.7;x.stroke();
  // bow
  const ba=Math.atan2(p.aim.y,p.aim.x);x.save();x.translate(f*1,-.5);x.rotate(p.cd>0?ba:Math.atan2(0,f));x.strokeStyle='#d9a066';x.lineWidth=1.3;x.beginPath();x.arc(4,0,6.5,-1.2,1.2);x.stroke();x.strokeStyle='#fff9';x.lineWidth=.5;x.beginPath();x.moveTo(4+6.5*Math.cos(-1.2),6.5*Math.sin(-1.2));x.lineTo(4+(p.cd>0?0:-2),0);x.lineTo(4+6.5*Math.cos(1.2),6.5*Math.sin(1.2));x.stroke();
  if(p.arrows>0&&p.cd<=0){x.strokeStyle='#e8e0cc';x.lineWidth=.8;x.beginPath();x.moveTo(1,0);x.lineTo(10,0);x.stroke();x.fillStyle='#fff';x.beginPath();x.moveTo(11.5,0);x.lineTo(9.5,-1.2);x.lineTo(9.5,1.2);x.fill();}x.restore();
  s.sprite(x,p.i,0,-10,19,{exact:true,mood:p.flash>0?'sad':p.run?'walking':'normal'});
  // quiver pips
  for(let k=0;k<QUIVER;k++){const filled=k<p.arrows;x.fillStyle=filled?'#ffe566':'#ffffff30';x.fillRect(-5+k*3.6,-22,2,5);if(filled){x.fillStyle='#fff';x.beginPath();x.moveTo(-4+k*3.6,-23.5);x.lineTo(-5.2+k*3.6,-22);x.lineTo(-2.8+k*3.6,-22);x.fill();}}
  x.restore();
 };
 const drawArrow=(a,ox)=>{x.save();x.translate(a.x+ox,a.y);x.rotate(a.ang);x.strokeStyle='#e8e0cc';x.lineWidth=1.3;x.beginPath();x.moveTo(-9,0);x.lineTo(5,0);x.stroke();x.fillStyle='#fff';x.beginPath();x.moveTo(8,0);x.lineTo(4,-2);x.lineTo(4,2);x.closePath();x.fill();x.fillStyle=PCOL[a.owner];x.beginPath();x.moveTo(-9,0);x.lineTo(-12,-2);x.lineTo(-7,0);x.lineTo(-12,2);x.closePath();x.fill();
  if(a.state==='stuck'&&Math.floor(time*2.5)%2){x.fillStyle='#ffe56688';x.beginPath();x.arc(-3,0,3.2,0,6.283);x.fill();}x.restore();};
 const draw=()=>{
  x.clearRect(0,0,W,H);x.fillStyle='#120d2c';x.fillRect(0,0,W,H);
  buildBg();fx.begin(x);x.drawImage(bgc,offx,offy);
  x.save();x.beginPath();x.rect(offx,offy,WW*sc,WH*sc);x.clip();x.translate(offx,offy);x.scale(sc,sc);
  for(const a of arrows){drawArrow(a,0);if(a.x<14)drawArrow(a,WW);if(a.x>WW-14)drawArrow(a,-WW);}
  for(const p of ps){drawArcher(p,0);if(p.x<12)drawArcher(p,WW);if(p.x>WW-12)drawArcher(p,-WW);if(p.dead&&p.head){const h=p.head;x.save();x.translate(h.x,h.y);x.rotate(h.rot);s.sprite(x,p.i,0,0,19,{exact:true,mood:'sad'});x.restore();}}
  fx.draw(x);x.restore();fx.end(x);
  for(const m of tapMarks){x.globalAlpha=m.t/.25*.6;x.strokeStyle=PCOL[m.i];x.lineWidth=3;x.beginPath();x.arc(m.x,m.y,10+(.25-m.t)*60,0,6.283);x.stroke();}x.globalAlpha=1;
  // HUD
  x.save();x.translate(0,HUDY);const bar=Math.min(40,H*.07);x.fillStyle='#0c0820';x.fillRect(0,0,W,bar);const fs=clamp(bar*.5,11,18);
  for(const p of ps){const left=p.i===0;for(let r=0;r<WIN_ROUNDS;r++){const cx=left?18+r*fs*1.5:W-18-r*fs*1.5;x.fillStyle=r<wins[p.i]?'#ffe566':'#ffffff26';x.beginPath();x.moveTo(cx,bar/2+fs*.55);x.lineTo(cx-fs*.6,bar/2-fs*.1);x.lineTo(cx-fs*.35,bar/2-fs*.6);x.lineTo(cx,bar/2-fs*.1);x.lineTo(cx+fs*.35,bar/2-fs*.6);x.lineTo(cx+fs*.6,bar/2-fs*.1);x.closePath();x.fill();}
   for(let k=0;k<QUIVER;k++){x.fillStyle=k<p.arrows?PLIGHT[p.i]:'#ffffff22';const bx=left?18+WIN_ROUNDS*fs*1.5+8+k*7:W-18-WIN_ROUNDS*fs*1.5-8-k*7;x.fillRect(bx-1,bar/2-fs*.5,2.4,fs);}}
  outlined(x,`R${round}`,W/2-fs*2,bar/2,{size:fs*.9,fill:'#c8bfff',stroke:'#0c0820',lw:3});outlined(x,String(Math.max(0,Math.ceil(roundT))),W/2+fs*.4,bar/2,{size:fs*1.2,fill:roundT<6?'#ff8a7a':'#fff',stroke:'#0c0820'});x.restore();
  if(phase==='intro'||(phase==='ready'&&round===1)){for(const p of ps){const sx=offx+p.x*sc+(p.i?-1:1)*sc*T*3,sy=offy+p.y*sc-sc*T*2.5;if(time<7){gestureHint(x,sx,sy,'drag',time,{color:PLIGHT[p.i],size:sc*T*1.2});outlined(x,'DRAG · FLICK UP · TAP',sx,sy+sc*T*2.6,{size:Math.max(10,sc*T*.8),fill:PLIGHT[p.i],stroke:'#0c0820',alpha:clamp(1-time/7,0,1)});}}}
  if(phase==='intro')intro.draw(x,W,H);
  if(phase==='sync')outlined(x,'…',W/2,H*.4,{size:Math.min(W*.08,48),fill:'#ffe566',stroke:'#0c0820'});
  if(phase==='ready')banner(x,W,H,note,`${wins[0]} – ${wins[1]}`,{color:'#ffe566',size:Math.min(W*.07,H*.11,56)});
  if(phase==='play'&&roundT>ROUND_CAP-.8)outlined(x,'FIGHT!',W/2,H*.4,{size:Math.min(W*.1,H*.16,80),fill:'#ffe566',stroke:'#7a3a00',alpha:1-(ROUND_CAP-roundT)/.8});
  if(phase==='roundover')banner(x,W,H,note,`${wins[0]} – ${wins[1]}`,{color:'#ffe566',size:Math.min(W*.06,H*.1,48)});
  if(phase==='gameover')banner(x,W,H,note,`${wins[0]} – ${wins[1]} in rounds`,{color:'#ffe566'});
 };
 s.debug={engine:'arrow',ps,arrows,wins,fx,touch,kb,C,R,grid,bot:on?()=>{netBot=true;return '';}:null,get oc(){return OC?.R;},get phase(){return phase;},get round(){return round;},sc:()=>sc,off:()=>({x:offx,y:offy})};
 makeLevel();draw();
 if(!await s.pass(0,on?`Arrow Arena: TowerFall online. You're the ${me?'pink':'blue'} archer; ${s.players[them].name} plays on the other phone. Drag to run, flick up to jump, tap to shoot toward your tap. One hit kills; you only have three arrows, so pick them back up. First to three rounds.`:'Arrow Arena: TowerFall for two thumbs. Run, jump, shoot and stomp. One hit kills; you only have three arrows, so pick them back up. First to three rounds.','Both ready — to arms!'))return;
 if(on){await nf.start('r1');if(!s.alive)return;}
 s.frame(dt=>{
  if(s.W!==W||s.H!==H){W=s.W;H=s.H;fit();bgc=null;touch.clear();}
  update(Math.min(dt,.033));draw();
  s.status(`Round ${round} · ${s.players[0].name} ${wins[0]} – ${wins[1]} ${s.players[1].name}`);
 });
}
Object.assign(exports,{arrow});
