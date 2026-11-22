// SHOOTER McGAVIN'S PRO TOUR (game id mcgavin-pro-tour, engine 'arcadegolf'): 3D arcade trackball golf, played like the bar
// cabinets. Our own courses (golf/courses.js), physics (golf/physics.js), swing model (golf/trackball.js), CPU (golf/cpu.js),
// rules (golf/rules.js), 3D scene (golf/render.js) and art (golf/art.js + src/data/golfSprites.js picture slots).
// A shot: the camera sits behind the ball; drag the course left/right (or tap the hole map) to aim, ◀ ▶ picks a club (the
// caddie picks one first), then the TRACKBALL: roll it down (backswing) and up hard (the swing). Speed = power, a stroke that
// leans left/right draws/fades (hooks/slices when you over-swing). Keep rolling right after the hit for AFTERTOUCH: up = run,
// down = backspin, sideways = bend. On the green the grid shows the slope (dots run downhill) and the same stroke putts.
// Turns: the player whose ball is furthest from the hole plays next (honours on the tee). Stroke play; picked up at par + 4.
// 1P = vs a CPU golfer (solo kind 'cpu'). 2P = one phone. Board game: 2 holes. Online: turn by turn; the player's phone sends
// the shot numbers at impact {sh}, any aftertouch {en} in the first second and {ef} when it closes, and both phones fly the
// same deterministic shot; the aim is streamed {am} so the other phone sees the line move.
const {clamp}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {snd,noise}=require("src/engines/arenaKit.js");
const {isCpu,cpuSkill,isOnline}=require("src/engines/cpuKit.js");
const GLm=require("src/engines/bowl/gl.js");
const P=require("src/engines/golf/physics.js");
const C=require("src/engines/golf/courses.js");
const CPU=require("src/engines/golf/cpu.js");
const RU=require("src/engines/golf/rules.js");
const TB=require("src/engines/golf/trackball.js");
const R3=require("src/engines/golf/render.js");
const A=require("src/engines/golf/art.js");
const GS=require("src/data/golfSprites.js");
const YD=P.YD,FT=.3048,ENG_WINDOW=1.0;
const r4=v=>Math.round(v*1e4)/1e4;

async function arcadegolf(s){
 const [c]=s.canvas(900,560,{fill:true});const fb=fullBleed(s,{bg:'#0b1a0e'});s.controls?.([]);
 const frame=c.parentElement;frame.style.position='relative';c.style.touchAction='none';
 const mkc=()=>{const e=document.createElement('canvas');e.style.cssText='position:absolute;pointer-events:none;left:0;top:0';frame.appendChild(e);return e;};
 const glc=mkc(),hud=mkc(),x=hud.getContext('2d');
 let G=null;try{G=GLm.createGL(glc);}catch(e){console.warn('golf gl',e);G=null;}
 if(!G){await s.pass(0,"Shooter McGavin's Pro Tour needs WebGL 2 (3D graphics), which this browser has turned off. The round is called off as a tie.",'OK');s.finish([0,0],'Golf could not start: WebGL 2 is unavailable.');return;}
 let scene=null;s.cleanup(()=>{try{scene?.dispose();G.destroy();}catch{}glc.remove();hud.remove();});
 const net=isOnline(s)?s.online:null,me=net?net.me:0,cpu=!net&&isCpu(s),board=s.origin==='board',names=s.players.map(p=>p.name||'Player');
 if(net)s.hotseat=true;GS.preload();
 // ---- sounds (synth)
 const sfx={whoosh:k=>noise(.22,{vol:.05*k,freq:900+k*900,q:.6}),crack:(iron)=>{snd(iron?1900:1400,.05,{type:'square',vol:.07,to:600});noise(.06,{vol:.08,freq:iron?4200:2600,q:1.2});},
  putt:()=>snd(900,.04,{type:'triangle',vol:.06,to:700}),thud:()=>noise(.12,{vol:.05,freq:400,q:.7}),sand:()=>noise(.25,{vol:.06,freq:1800,q:.4}),splash:()=>{noise(.5,{vol:.08,freq:900,q:.4});snd(300,.3,{type:'sine',vol:.04,to:120});},
  tree:()=>{snd(220,.08,{type:'square',vol:.05,to:140});noise(.18,{vol:.05,freq:2600,q:.5,delay:.03});},cup:()=>{snd(700,.06,{type:'square',vol:.05});snd(500,.08,{type:'square',vol:.05,delay:.07});snd(380,.1,{type:'square',vol:.05,delay:.15});},
  cheer:()=>{for(let i=0;i<6;i++)noise(.5,{vol:.035,freq:1200+i*300,q:.5,delay:i*.05});},ooh:()=>snd(330,.6,{type:'sine',vol:.04,to:240}),
  tick:()=>snd(1500,.02,{type:'square',vol:.02}),bird:()=>{const f=2200+Math.random()*900;snd(f,.07,{type:'sine',vol:.012,to:f*1.3});snd(f*1.1,.06,{type:'sine',vol:.01,delay:.1,to:f*.9});}};
 // ---- round set-up
 let set={course:'bushwood',holes:3};
 const PL=[0,1].map(i=>({i,ball:{x:0,z:0},lie:'tee',strokes:0,done:false,cards:[],total:0,dist:0}));
 let course=null,hole=null,holeIdx=0,mapC=null,mode='loading',t=0,banner=null,cur=0,yaw=0,clubI=0,swing=null,shot=null,trail=[],cam={eye:[0,3,-8],tgt:[0,0,40],fov:50},camGoal=null;
 let fastK=1,flyU=0,result=null,card=null,frameNo=0,after=0,aftT=0,engBuf=[],remoteAim=null,autopilot=false,tbRot={x:0,y:0},swingFrame=0,followT=-1,birdT=4,pickBtns=[],hudBtns=[];
 const mine=i=>net?i===me:!(cpu&&i===1);
 const lieName=l=>({tee:'TEE',fair:'FAIRWAY',fringe:'FRINGE',green:'GREEN',rough:'ROUGH',deep:'DEEP ROUGH',sand:'BUNKER',waste:'DESERT',water:'WATER',ob:'OUT OF BOUNDS',cup:'IN THE CUP',path:'CART PATH'})[l]||String(l||'').toUpperCase();
 const clubsFor=lie=>P.CLUBS.filter(cl=>(cl.id!=='dr'||lie==='tee')&&(lie==='green'?true:cl.kind!=='putter'||lie==='fringe'));
 const dToCup=p=>Math.hypot(hole.cup.x-p.ball.x,hole.cup.z-p.ball.z);
 const dirOf=a=>[Math.sin(a),Math.cos(a)];
 // ---- layout
 let W=s.W,H=s.H,dpr=1,L={};
 function layout(){W=s.W;H=s.H;dpr=Math.min(1.75,window.devicePixelRatio||1);for(const e of [glc,hud]){e.style.width=W+'px';e.style.height=H+'px';}
  const cw=Math.round(W*dpr),ch=Math.round(H*dpr);if(hud.width!==cw||hud.height!==ch){hud.width=cw;hud.height=ch;}
  const tall=H>W*1.1,m=Math.min(W,H),tbR=clamp(m*(tall?.15:.13),46,96);
  L={tall,tbR,tbX:W-tbR*1.35-8,tbY:H-tbR*1.45-10,top:(fb.top||40)+6,fs:clamp(m*.036,12,19)};
  L.mapW=clamp(m*(tall?.27:.22),90,180);L.mapH=L.mapW*1.45;L.mapX=W-L.mapW-10;L.mapY=L.top+4;}
 // ---- course picker (Arcade); online seat 0 picks, board takes a course from the seed
 async function pickCourse(){
  if(board){const r=s.random();set={course:C.COURSES[Math.floor(r*C.COURSES.length)%C.COURSES.length].id,holes:2,start:Math.floor(s.random()*7)};return;}
  if(net&&me!==0){mode='waitpick';const m=await net.next();if(m?.setup)set=m.setup;return;}
  mode='pick';await new Promise(res=>{pickDone=()=>res();});if(net)net.send({setup:set});}
 let pickDone=null;
 // ---- the round
 async function play(){layout();await GS.ready(['logo','title-bg','golfer-p1','golfer-p2','trackball','flag','ground-detail','water'],4000);
  await pickCourse();if(!s.alive)return;
  course=C.getCourse(set.course);await GS.ready(['sky-'+course.theme,...GS.TREES.map(k=>'tree-'+k)],5000);
  const start=set.start||0,n=Math.min(set.holes,course.holes.length-start);
  for(let h=0;h<n;h++){if(!s.alive)return;await playHole(start+h,h,n);}
  finishRound();}
 async function playHole(hi,k,n){holeIdx=hi;hole=course.holes[hi];hole.wind=C.windFor(course.theme,String(s.seed||1)+':'+set.course,hi+1);
  scene?.dispose();scene=R3.createScene(G,hole,course.theme);mapC=R3.holeMap(hole,course.theme,Math.round(L.mapW*dpr),Math.round(L.mapH*dpr));
  for(const p of PL){p.ball={x:0,z:0};p.lie='tee';p.strokes=0;p.done=false;}
  // honours: the lower total so far tees off first
  const order=PL.map(p=>p.i).sort((a,b)=>PL[a].total-PL[b].total||a-b);
  mode='fly';flyU=0;banner={t:3.6,big:`HOLE ${hi+1}`,small:`PAR ${hole.par} · ${hole.yards} YDS${k===n-1&&n>1?' · LAST HOLE':''}`};
  await waitFor(()=>flyU>=1);
  while(PL.some(p=>!p.done)){if(!s.alive)return;
   const unteed=order.filter(q=>PL[q].strokes===0&&!PL[q].done);let i;
   if(unteed.length)i=unteed[0];else{const left=PL.filter(p=>!p.done);i=left.sort((a,b)=>dToCup(b)-dToCup(a)||a.i-b.i)[0].i;}
   await takeShot(i);}
  for(const p of PL){p.cards[hi]=p.strokes;p.total+=p.strokes-hole.par;}
  card={t:0,hi};mode='card';await waitFor(()=>card.t>(card.tap?0:6)||card.tap);card=null;}
 const waitFor=f=>new Promise(r=>{const go=()=>{if(!s.alive||f())return r();setTimeout(go,40);};go();});
 // ---- one shot
 // the caddie's club and line for a ball: the hole, or a lay-up spot along the fairway
 function initAim(p){const putt=p.lie==='green'||p.lie==='fringe'&&dToCup(p)<16;
  const list=clubsFor(p.lie);const sug=putt?P.CLUBS.find(q=>q.kind==='putter'):CPU.suggestClub(dToCup(p),p.lie);clubI=Math.max(0,list.indexOf(sug));
  const reach=P.clubDistance(list[clubI],1,p.lie).total*(P.LIES[p.lie]?.next||1),D=dToCup(p);
  const tgt=putt||D<reach*1.05?hole.cup:CPU.along(hole,p.ball.x,p.ball.z,Math.min(reach*.95,D-40));yaw=CPU.yawTo(p.ball.x,p.ball.z,tgt.x,tgt.z);return {putt,list,D};}
 async function takeShot(i){cur=i;const p=PL[i];const {putt,list,D}=initAim(p);
  swing=null;shot=null;trail=[];followT=-1;swingFrame=0;banner={t:1.4,big:`${names[i].toUpperCase()}`,small:`${lieName(p.lie)} · ${putt?Math.round(D/FT)+' FT':Math.round(D/YD)+' YDS'} TO THE PIN`};
  mode='aim';
  let sh=null;
  if(mine(i)&&!(net&&false)){sh=await new Promise(res=>{onImpact=res;});}
  else if(cpu&&i===1)sh=await cpuShot(p);
  else sh=await remoteShot(p);
  if(!sh||!s.alive)return;
  // fly it
  const club=P.CLUBS.find(q=>q.id===sh.c)||list[clubI];
  const shotIn={x:p.ball.x,y:hole.height(p.ball.x,p.ball.z),z:p.ball.z,yaw:sh.yaw,power:sh.power,curve:sh.curve,eng:sh.eng||[]};
  shot=P.makeShot(hole,shotIn,club,p.lie);shot.club=club;shot.owner=i;shot.live=mine(i)&&!sh.replay;trail=[[shotIn.x,shotIn.y+.05,shotIn.z]];
  if(club.kind==='putter')sfx.putt();else{sfx.whoosh(1);sfx.crack(club.kind!=='wood');}vibrate(12);
  followT=0;mode='flight';aftT=0;
  await waitFor(()=>shot.done&&shot.endT>1.4);if(!s.alive||!shot?.result)return;
  // settle
  const before={ball:p.ball,lie:p.lie,strokes:p.strokes},st=RU.settle(hole,before,shot.result,shot);
  p.strokes=st.strokes;if(st.ball)p.ball=st.ball;if(st.lie)p.lie=st.lie;if(st.holed||st.picked)p.done=true;
  const r=shot.result,yds=Math.round(r.total/YD);
  if(st.holed){const nm=RU.scoreName(p.strokes,hole.par);result={t:2.6,big:nm,small:`${names[i]} · ${p.strokes} STROKE${p.strokes>1?'S':''}`,good:p.strokes<=hole.par};sfx.cup();if(p.strokes<=hole.par)sfx.cheer();}
  else if(st.note==='WATER'){result={t:2.2,big:'WATER',small:'+1 stroke · drop'};}
  else if(st.note==='OUT OF BOUNDS'){result={t:2.2,big:'OUT OF BOUNDS',small:'+1 stroke · play it again'};sfx.ooh();}
  else if(st.picked){result={t:2.2,big:'PICKED UP',small:`${names[i]} takes ${p.strokes}`};}
  else{const left=dToCup(p);result={t:1.8,big:lieName(p.lie),small:club.kind==='putter'?`${Math.round(left/FT)} FT LEFT`:`${yds} YDS · ${left<20?Math.round(left/FT)+' FT':Math.round(left/YD)+' YDS'} TO GO`};}
  mode='result';await waitFor(()=>result.t<=0||result.tap);result=null;shot=null;trail=[];}
 let onImpact=null;
 // CPU: think, turn to the line, swing on the trackball
 async function cpuShot(p){await new Promise(r=>setTimeout(r,350));
  const pl=p.lie==='green'||p.lie==='fringe'&&dToCup(p)<16?CPU.planPutt(hole,p.ball,p.lie,.4+.55*cpuSkill(s),s.random):CPU.plan(hole,p.ball,p.lie,{skill:.4+.55*cpuSkill(s),rand:s.random});
  const list=clubsFor(p.lie);clubI=Math.max(0,list.findIndex(q=>q.id===pl.club.id));const y0=yaw,dy=pl.yaw-y0;
  for(let k=1;k<=20;k++){yaw=y0+dy*k/20;await new Promise(r=>setTimeout(r,30));}
  const pts=TB.strokeFor(pl.power,pl.curve),t0=performance.now();
  await new Promise(res=>{const go=()=>{if(!s.alive)return res();const tt=(performance.now()-t0)/1000*.9;const q=pts.find(q=>q.t>=tt)||pts[pts.length-1];tbRot={x:q.x*3,y:q.y*3};const back=Math.max(0,q.y);swingFrame=q.t<pts[12].t?Math.min(3,Math.round(back/1.1*3)):3;if(tt>=pts[pts.length-1].t)return res();setTimeout(go,16);};go();});
  return {c:pl.club.id,yaw:r4(pl.yaw),power:r4(pl.power),curve:r4(pl.curve),eng:[]};}
 // the other phone: aim stream, then the shot at impact, its aftertouch, and the go
 async function remoteShot(p){let sh=null;const eng=[];
  for(;;){const m=await net.next();if(!m||!s.alive)return null;
   if(m.am){yaw=+m.am[0]||yaw;clubI=+m.am[1]||0;swingFrame=+m.am[2]||0;}
   else if(m.sh){sh=m.sh;}
   else if(m.en&&sh)eng.push(m.en);
   else if(m.ef&&sh){return {...sh,eng};}}}
 // ---- input: aim drag on the course, the trackball, the buttons
 const ptrs=new Map();let aimDrag=null,lastAimSend=0;
 const inTB=(px,py)=>Math.hypot(px-L.tbX,py-L.tbY)<L.tbR*1.55||py>H*.62&&px>W*.45;
 s.on(c,'pointerdown',ev=>{if(s.paused)return;const pt=s.pointer(ev);ev.preventDefault();
  if(mode==='pick'){for(const b of pickBtns)if(pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h){b.act();sfx.tick();return;}return;}
  if(mode==='fly'){flyU=Math.max(flyU,.999);return;}
  if(mode==='result'&&result){if(result.t<1.4)result.tap=true;return;}
  if(mode==='card'&&card){if(card.t>.8)card.tap=true;return;}
  for(const b of hudBtns)if(pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h){if(mode==='aim'&&mine(cur))b.act();return;}
  if(mode==='aim'&&mine(cur)){
   // tap the hole map = aim there
   if(pt.x>=L.mapX&&pt.x<=L.mapX+L.mapW&&pt.y>=L.mapY&&pt.y<=L.mapY+L.mapH&&mapC){const m=mapToWorld(pt.x,pt.y);if(m){yaw=CPU.yawTo(PL[cur].ball.x,PL[cur].ball.z,m.x,m.z);sendAim();}return;}
   if(inTB(pt.x,pt.y)){swing={sw:TB.newSwing(),id:ev.pointerId,x0:pt.x,y0:pt.y,lx:pt.x,ly:pt.y,t0:performance.now()};s.capture?.(ev);return;}
   aimDrag={id:ev.pointerId,x:pt.x};s.capture?.(ev);return;}
  if(mode==='flight'&&shot&&shot.live&&aftT<ENG_WINDOW&&inTB(pt.x,pt.y)){after={id:ev.pointerId,x:pt.x,y:pt.y,t:performance.now()};s.capture?.(ev);}});
 s.on(c,'pointermove',ev=>{const pt=s.pointer(ev);
  if(aimDrag&&ev.pointerId===aimDrag.id&&mode==='aim'){const putt=clubOf().kind==='putter';yaw-=(pt.x-aimDrag.x)*(putt?.0012:.0028);aimDrag.x=pt.x;sendAim();return;}
  if(swing&&ev.pointerId===swing.id&&mode==='aim'){const R=L.tbR,q={x:(pt.x-swing.x0)/R,y:(pt.y-swing.y0)/R,t:(performance.now()-swing.t0)/1000};tbRot.x+= (pt.x-swing.lx)/R*1.2;tbRot.y+=(pt.y-swing.ly)/R*1.2;swing.lx=pt.x;swing.ly=pt.y;
   const ev2=TB.feed(swing.sw,q);const S=swing.sw;swingFrame=S.state==='back'?Math.min(3,1+Math.floor(S.back/1.1*2.2)):S.state==='forward'?4:swingFrame;
   if(net&&performance.now()-lastAimSend>120){lastAimSend=performance.now();net.send({am:[r4(yaw),clubI,swingFrame]});}
   if(ev2==='impact'){const im=swing.sw.impact,putt=clubOf().kind==='putter',sh=TB.toShot(im,{putt});const out={c:clubOf().id,yaw:r4(yaw+(sh.push||0)),power:r4(clamp(sh.power,.02,1.25)),curve:r4(sh.curve||0)};
    swing=null;after={id:ev.pointerId,x:pt.x,y:pt.y,t:performance.now()};if(net)net.send({sh:out});const f=onImpact;onImpact=null;f?.(out);}
   return;}
  if(after&&ev.pointerId===after.id&&shot&&shot.live&&shot.phase==='air'&&aftT<ENG_WINDOW){const now=performance.now();if(now-after.t<70)return;const R=L.tbR,dx=(pt.x-after.x)/R,dy=(pt.y-after.y)/R;after.x=pt.x;after.y=pt.y;after.t=now;tbRot.x+=dx*1.2;tbRot.y+=dy*1.2;
   const [spin,side]=TB.english(dx,dy);if(Math.abs(spin)+Math.abs(side)>.01){const evn=shot.english(spin,side);if(net&&evn)net.send({en:evn});}}});
 const up=ev=>{if(aimDrag&&ev.pointerId===aimDrag.id)aimDrag=null;if(swing&&ev.pointerId===swing.id){swing=null;swingFrame=0;}if(after&&ev.pointerId===after.id)after=null;s.release?.(ev);};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',up);
 s.on(window,'keydown',ev=>{if(mode!=='aim'||!mine(cur))return;const k=ev.key;if(k==='ArrowLeft'){yaw+=.02;sendAim();}else if(k==='ArrowRight'){yaw-=.02;sendAim();}else if(k==='ArrowUp')club(-1);else if(k==='ArrowDown')club(1);else if(k===' '){ev.preventDefault();botSwing(.95,0);}});
 function sendAim(){if(net&&performance.now()-lastAimSend>100){lastAimSend=performance.now();net.send({am:[r4(yaw),clubI,swingFrame]});}}
 const clubOf=()=>{const l=clubsFor(PL[cur].lie);return l[clamp(clubI,0,l.length-1)];};
 function club(d){const l=clubsFor(PL[cur].lie);clubI=clamp(clubI+d,0,l.length-1);sfx.tick();sendAim();}
 // autopilot / keyboard swing: a straight stroke at a power (tests, the online bot)
 function botSwing(power,curve){if(mode!=='aim'||!onImpact)return;const out={c:clubOf().id,yaw:r4(yaw),power:r4(power),curve:r4(curve)};if(net)net.send({sh:out});const f=onImpact;onImpact=null;f(out);}
 function mapToWorld(px,py){if(!mapC)return null;const xs=hole.pts.map(p=>p.x),zs=hole.pts.map(p=>p.z),x0=Math.min(...xs)-45,x1=Math.max(...xs)+45,z0=-25,z1=Math.max(...zs)+25,Wm=L.mapW,Hm=L.mapH,k=Math.min(Wm/(x1-x0),Hm/(z1-z0)),ox=(Wm-(x1-x0)*k)/2,oy=(Hm-(z1-z0)*k)/2;
  return {x:x1-(px-L.mapX-ox)/k,z:z1-(py-L.mapY-oy)/k};}
 // ---- frame
 s.frame(dt=>{dt=Math.min(dt,.05)*fastK;t+=dt;frameNo++;layout();if(s.paused){draw(0);return;}
  if(banner){banner.t-=dt;if(banner.t<=0)banner=null;}
  if(mode==='fly'){flyU=Math.min(1,flyU+dt/3.8);}
  if(result)result.t-=dt;if(card)card.t+=dt;
  if(shot){if(!shot.done)shot.advance(dt);else shot.endT=(shot.endT||0)+dt;const b=shot.b;if(!shot.done&&frameNo%2===0){trail.push([b.x,b.y+.05,b.z]);if(trail.length>160)trail.shift();}
   if(shot.live&&mode==='flight'){aftT+=dt;if(aftT>=ENG_WINDOW&&!shot.efSent){shot.efSent=true;after=null;if(net)net.send({ef:1});}}
   for(const e of shot.events.splice(0))sfxEvent(e);}
  if(followT>=0)followT+=dt;
  birdT-=dt;if(birdT<=0){birdT=3+Math.random()*6;if(course&&course.theme!=='desert')sfx.bird();}
  if(autopilot&&mode==='aim'&&mine(cur)&&onImpact){const p=PL[cur],putt=clubOf().kind==='putter';const pl=putt?CPU.planPutt(hole,p.ball,p.lie,.7,Math.random):CPU.plan(hole,p.ball,p.lie,{skill:.7,rand:Math.random});
   const l=clubsFor(p.lie);clubI=Math.max(0,l.findIndex(q=>q.id===pl.club.id));yaw=pl.yaw;botSwing(pl.power,pl.curve);}
  draw(dt);});
 function sfxEvent(e){if(e.k==='tree'||e.k==='trunk')sfx.tree();else if(e.k==='bounce'){if(e.lie==='sand')sfx.sand();else if(e.lie==='water')sfx.splash();else if(e.v>3)sfx.thud();}else if(e.k==='lip')sfx.ooh();}
 // ---- cameras
 function camFor(){const p=PL[cur]||PL[0];
  if(mode==='fly'&&hole){const pts=hole.pts,len=pts.reduce((s,q,k)=>k?s+Math.hypot(q.x-pts[k-1].x,q.z-pts[k-1].z):0,0),u=easeIO(flyU);
   const at=d=>{let acc=0;for(let k=0;k+1<pts.length;k++){const a=pts[k],b=pts[k+1],l=Math.hypot(b.x-a.x,b.z-a.z);if(acc+l>=d||k===pts.length-2){const f=clamp((d-acc)/l,0,1);return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,dx:(b.x-a.x)/l,dz:(b.z-a.z)/l};}acc+=l;}return {x:0,z:0,dx:0,dz:1};};
   const q=at(u*len*.92),f=at(Math.min(len,u*len*.92+60)),hgt=hole.height(q.x,q.z);return {eye:[q.x-q.dx*30,hgt+30-u*14,q.z-q.dz*30],tgt:[f.x,hole.height(f.x,f.z)+2,f.z],fov:55};}
  if(mode==='card'||mode==='pick'||mode==='waitpick'){const g=hole?hole.green:{x:0,z:60};const a=t*.15;return {eye:[g.x+Math.sin(a)*60,(hole?hole.height(g.x,g.z):0)+25,g.z+Math.cos(a)*60],tgt:[g.x,hole?hole.height(g.x,g.z):0,g.z],fov:48};}
  if((mode==='flight'||mode==='result')&&shot){const b=shot.b,vx=b.vx,vz=b.vz,v=Math.hypot(vx,vz),st=shot.start||{x:b.x,z:b.z},d0=Math.hypot(b.x-st.x,b.z-st.z),putt=shot.club.kind==='putter';
   let dx=Math.sin(yaw),dz=Math.cos(yaw);if(v>1){dx=vx/v;dz=vz/v;}const gy=hole.height(b.x,b.z),back=putt?3.2:clamp(8+d0*.06,8,22),up=putt?1.4:clamp(3+d0*.03,3,10);
   return {eye:[b.x-dx*back,Math.max(gy,b.y)+up,b.z-dz*back],tgt:[b.x+dx*4,Math.max(gy,b.y)+(putt?0:1),b.z+dz*4],fov:putt?46:52};}
  // aim
  const putt=clubOf().kind==='putter',[dx,dz]=dirOf(yaw),bx=p.ball.x,bz=p.ball.z,by=hole.height(bx,bz);
  if(putt){const d=Math.min(dToCup(p),30),back=2.6+d*.12;return {eye:[bx-dx*back,by+1.2+d*.06,bz-dz*back],tgt:[bx+dx*Math.max(3,d),by-.2,bz+dz*Math.max(3,d)],fov:48};}
  const ax=bx+dx*60,az=bz+dz*60;return {eye:[bx-dx*7.5,by+2.6,bz-dz*7.5],tgt:[ax,hole.height(ax,az)+3,az],fov:52};}
 const easeIO=u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
 // ---- draw
 function draw(dt){const cw=hud.width,ch=hud.height;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
  if(!hole||!scene){drawTitleBg();if(mode==='pick')drawPicker();else if(mode==='waitpick')centerMsg('WAITING FOR '+names[0].toUpperCase()+' TO PICK A COURSE');return;}
  const want=camFor();if(!camGoal||mode==='fly'||mode==='pick'||mode==='card')camGoal=want;
  const k=Math.min(1,dt*(mode==='flight'?4:6));for(const key of ['eye','tgt'])cam[key]=cam[key].map((v,j)=>mode==='fly'||!dt?want[key][j]:v+(want[key][j]-v)*k);cam.fov=want.fov;
  const p=PL[cur]||PL[0],putt=mode==='aim'&&clubOf().kind==='putter';
  let marker=null;if(mode==='aim'){const cl=clubOf(),[dx,dz]=dirOf(yaw);if(putt){const d=dToCup(p);marker={x:p.ball.x+dx*d,z:p.ball.z+dz*d,r:.25,col:[255,255,255],from:p.ball};}
   else{const dist=P.clubDistance(cl,1,p.lie).carry*(P.LIES[p.lie]?.next||1);marker={x:p.ball.x+dx*dist,z:p.ball.z+dz*dist,r:Math.max(2.2,dist*.03),from:p.ball};}}
  const balls=PL.filter(q=>!q.done&&!(shot&&shot.owner===q.i)).map(q=>({x:q.ball.x,y:hole.height(q.ball.x,q.ball.z),z:q.ball.z,tint:q.i===cur?[1,1,1,1]:[1,.92,.7,1]}));
  if(shot&&!(shot.done&&shot.result.why==='holed'))balls.push({x:shot.b.x,y:shot.b.y,z:shot.b.z});
  scene.draw(Math.round(W*dpr),Math.round(H*dpr),cam,{dt,marker,balls,trail:mode==='flight'||mode==='result'?trail:null,grid:putt||mode!=='aim'&&shot&&shot.club.kind==='putter'});
  // the golfer, at the ball, while aiming and through the follow-through
  if(mode==='aim'||(mode==='flight'&&followT>=0&&followT<1.1&&shot&&shot.club.kind!=='putter'&&cur===shot.owner)||(mode==='flight'&&shot&&shot.club.kind==='putter'&&followT<.8))drawGolferAt(p);
  hudLayer();}
 function proj(x0,y0,z0){const r=scene.project(x0,y0,z0);return r?[r[0]/dpr,r[1]/dpr,r[2]]:null;}
 function drawGolferAt(p){const [dx,dz]=dirOf(yaw),lx=dz,lz=-dx,putt=(shot?shot.club:clubOf()).kind==='putter',off=putt?.55:.78,gx=p.ball.x+lx*off-dx*.1,gz=p.ball.z+lz*off-dz*.1,gy=hole.height(gx,gz);
  const f=proj(gx,gy,gz),hd=proj(gx,gy+1.85,gz);if(!f||!hd)return;const h=(f[1]-hd[1])*1.12;if(h<20)return;
  let fr=putt?(followT>=0?9:8):swingFrame;if(!putt&&followT>=0)fr=followT<.12?5:followT<.45?6:7;
  const head=A.drawGolfer(x,cur,fr,f[0],f[1],h);try{s.sprite(x,cur,head.x,head.y,head.d,{exact:true,still:true,noBadge:true,mood:result?.good?'win':'normal'});}catch{}}
 // ---- HUD
 function panel(x0,y0,w,h,a=.62){x.fillStyle=`rgba(6,14,8,${a})`;x.beginPath();x.roundRect(x0,y0,w,h,10);x.fill();x.strokeStyle='rgba(255,255,255,.14)';x.lineWidth=1;x.stroke();}
 function txt(t0,x0,y0,{size=L.fs,col='#fff',w='800',align='left',font='"SC Nunito",sans-serif'}={}){x.font=`${w} ${size}px ${font}`;x.textAlign=align;x.textBaseline='middle';x.fillStyle=col;x.fillText(t0,x0,y0);}
 function hudLayer(){hudBtns=[];const fs=L.fs,p=PL[cur]||PL[0];
  // top-left: hole card + scores
  const pw=Math.min(W*.46,fs*14.5),ph=fs*4.6;panel(8,L.top,pw,ph);
  txt(`HOLE ${holeIdx+1}`,18,L.top+fs*1,{size:fs*1.15,col:'#ffd23f',w:'900',font:'"SC Bangers","SC Nunito",sans-serif'});txt(`PAR ${hole.par} · ${hole.yards} YDS`,18+fs*5.2,L.top+fs*1,{size:fs*.8,col:'#d8ecd8'});
  PL.forEach((q,j)=>{const y0=L.top+fs*(2.25+j*1.25),act=j===cur&&(mode==='aim'||mode==='flight');if(act){x.fillStyle='rgba(255,210,63,.22)';x.fillRect(12,y0-fs*.6,pw-8,fs*1.2);}
   const tot=q.total+(q.done?0:0),rel=tot===0?'E':tot>0?'+'+tot:String(tot);txt(`${names[j].slice(0,16)}`,18,y0,{size:fs*.82,col:act?'#ffe07a':'#fff'});
   txt(`${q.strokes} · ${rel}`,8+pw-10,y0,{size:fs*.82,align:'right',col:'#fff'});});
  // wind (relative to where the camera looks)
  const wnd=hole.wind,camYaw=Math.atan2(cam.tgt[0]-cam.eye[0],cam.tgt[2]-cam.eye[2]),wa=Math.atan2(wnd.x,wnd.z)-camYaw,narrow=8+pw+fs*6.6>L.mapX,wTop=narrow?L.top+ph+6:L.top,wx=narrow?8+fs*3.2:8+pw+8+fs*3.2,wy=wTop+fs*1.6;
  panel(wx-fs*3.2,wTop,fs*6.4,fs*3.4);x.save();x.translate(wx-fs*1.2,wy+fs*.1);x.rotate(-wa);x.fillStyle='#7fd6ff';x.beginPath();x.moveTo(0,-fs*1.1);x.lineTo(fs*.55,fs*.4);x.lineTo(0,fs*.1);x.lineTo(-fs*.55,fs*.4);x.closePath();x.fill();x.restore();
  txt(`${wnd.mph}`,wx+fs*.6,wy-fs*.1,{size:fs*1.25,w:'900',align:'center'});txt('MPH',wx+fs*.6,wy+fs*.9,{size:fs*.6,align:'center',col:'#cfe'});
  // hole map + balls + aim line
  if(mapC){x.save();x.globalAlpha=.92;panel(L.mapX-4,L.mapY-4,L.mapW+8,L.mapH+8,.5);x.drawImage(mapC.c,L.mapX,L.mapY,L.mapW,L.mapH);x.restore();
   const mp=(wx0,wz0)=>{const m=mapC.map(wx0,wz0);return [L.mapX+m[0]/dpr,L.mapY+m[1]/dpr];};
   const [fx,fy]=mp(hole.cup.x,hole.cup.z);x.fillStyle='#e3262e';x.fillRect(fx,fy-9,7,5);x.fillStyle='#fff';x.fillRect(fx-1,fy-9,1.5,10);
   if(mode==='aim'){const [dx,dz]=dirOf(yaw),cl=clubOf(),dist=cl.kind==='putter'?dToCup(p):P.clubDistance(cl,1,p.lie).total;const [ax,ay]=mp(p.ball.x,p.ball.z),[bx,by]=mp(p.ball.x+dx*dist,p.ball.z+dz*dist);x.strokeStyle='#ffe07a';x.lineWidth=2;x.setLineDash([4,3]);x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();x.setLineDash([]);x.beginPath();x.arc(bx,by,4,0,6.28);x.stroke();}
   PL.forEach(q=>{const b=shot&&shot.owner===q.i?shot.b:q.ball;const [qx,qy]=mp(b.x,b.z);x.fillStyle=q.i?'#7fb2ff':'#ff8a8a';x.strokeStyle='#000';x.lineWidth=1.5;x.beginPath();x.arc(qx,qy,4.5,0,6.28);x.fill();x.stroke();});}
  // bottom-left: club, lie, distance (aiming)
  if(mode==='aim'){const cl=clubOf(),putt=cl.kind==='putter',D=dToCup(p),bw=Math.min(W*.5,fs*13),by0=H-fs*5.4-10;panel(8,by0,bw,fs*5);
   const carry=P.clubDistance(cl,1,p.lie);txt(cl.name.toUpperCase(),8+bw/2,by0+fs*1.1,{size:fs*1.1,w:'900',align:'center',font:'"SC Bangers","SC Nunito",sans-serif'});
   txt(putt?'PUTTER':`${Math.round(carry.carry*(P.LIES[p.lie]?.next||1)/YD)} YD CARRY`,8+bw/2,by0+fs*2.2,{size:fs*.72,align:'center',col:'#cfe'});
   txt(`${lieName(p.lie)} · ${putt?Math.round(D/FT)+' FT':Math.round(D/YD)+' YDS'}`,8+bw/2,by0+fs*3.3,{size:fs*.78,align:'center',col:'#ffe07a'});
   if(mine(cur)){const bh=fs*1.6,bwid=fs*2.2;for(const [d,lbl,x0] of [[-1,'◀',14],[1,'▶',8+bw-bwid-6]]){const b={x:x0,y:by0+fs*.25,w:bwid,h:bh,act:()=>club(d)};hudBtns.push(b);x.fillStyle='rgba(255,255,255,.12)';x.beginPath();x.roundRect(b.x,b.y,b.w,b.h,8);x.fill();txt(lbl,b.x+b.w/2,b.y+b.h/2,{size:fs,align:'center'});}}
   if(!mine(cur))txt(cpu&&cur===1?`${names[1]} is lining it up…`:`${names[cur]} is lining it up…`,8+bw/2,by0+fs*4.35,{size:fs*.7,align:'center',col:'#fff'});
   else txt(putt?'Read the grid: dots run downhill':'Drag the course to aim · tap the map',8+bw/2,by0+fs*4.35,{size:fs*.62,align:'center',col:'#bcd'});}
  // trackball + power
  const glow=mode==='aim'&&mine(cur)?.35+.25*Math.sin(t*4):0;A.drawTrackball(x,L.tbX,L.tbY,L.tbR,tbRot.x,tbRot.y,{glow});
  if(mode==='aim'&&mine(cur)&&!swing){txt('ROLL ↓ THEN ↑',L.tbX,L.tbY-L.tbR*1.42,{size:fs*.72,align:'center',w:'900',col:'#ffe07a'});}
  if(swing){const S=swing.sw,k=clamp(S.back/1.1,0,1);x.strokeStyle='rgba(255,226,120,.95)';x.lineWidth=L.tbR*.12;x.beginPath();x.arc(L.tbX,L.tbY,L.tbR*1.28,Math.PI*.5,Math.PI*.5+k*Math.PI*1.6);x.stroke();}
  if(mode==='flight'&&shot&&shot.live&&aftT<ENG_WINDOW){txt('AFTERTOUCH!',L.tbX,L.tbY-L.tbR*1.42,{size:fs*.8,align:'center',w:'900',col:'#7fd6ff'});}
  // live distance in flight
  if((mode==='flight'||mode==='result')&&shot){const b=shot.b,st=shot.start||{x:0,z:0},yd=Math.round(Math.hypot(b.x-st.x,b.z-st.z)/YD);panel(W/2-fs*3.5,H-fs*3.4-8,fs*7,fs*2.6);txt(`${yd} YDS`,W/2,H-fs*2.1-8,{size:fs*1.3,w:'900',align:'center',font:'"SC Bangers","SC Nunito",sans-serif'});}
  // banners
  if(banner)bigBanner(banner.big,banner.small,Math.min(1,banner.t*2.5));
  if(result)bigBanner(result.big,result.small,Math.min(1,result.t*3),result.good?'#ffe07a':'#fff');
  if(card)scorecard();}
 function bigBanner(big,small,a,col='#fff'){x.save();x.globalAlpha=a;const fs=L.fs,y0=H*.34;x.fillStyle='rgba(4,12,6,.72)';x.fillRect(0,y0-fs*2.2,W,fs*4.4);
  txt(big,W/2,y0-fs*.3,{size:Math.min(fs*2.6,W/Math.max(6,big.length)*1.4),w:'900',align:'center',col,font:'"SC Bangers","SC Nunito",sans-serif'});txt(small,W/2,y0+fs*1.35,{size:fs*.9,align:'center',col:'#cfe'});x.restore();}
 function scorecard(){const fs=L.fs,n=course.holes.length,cw=Math.min(W-20,fs*2.2*(n+4)),ch=fs*7.5,x0=(W-cw)/2,y0=H*.5-ch/2,col=(cw-fs*7)/n;x.fillStyle='rgba(250,248,236,.97)';x.beginPath();x.roundRect(x0,y0,cw,ch,10);x.fill();
  txt(course.name.toUpperCase(),x0+12,y0+fs*.9,{size:fs*.85,col:'#1a3a20',w:'900'});
  const row=(lbl,vals,y,b)=>{txt(lbl,x0+12,y,{size:fs*.78,col:'#1a3a20',w:b?'900':'700'});vals.forEach((v,j)=>txt(v,x0+fs*5.5+col*(j+.5),y,{size:fs*.78,col:'#1a3a20',align:'center',w:b?'900':'700'}));};
  row('HOLE',course.holes.map((h,j)=>String(j+1)),y0+fs*2.3,true);row('PAR',course.holes.map(h=>String(h.par)),y0+fs*3.5);
  PL.forEach((q,j)=>{row(names[j].replace(/\s*\(CPU\)/,'').slice(0,7)+(cpu&&j===1?'*':''),course.holes.map((h,k)=>q.cards[k]!=null?String(q.cards[k]):''),y0+fs*(4.8+j*1.2));
   course.holes.forEach((h,k)=>{const v=q.cards[k];if(v==null)return;const cx=x0+fs*5.5+col*(k+.5),cy=y0+fs*(4.8+j*1.2);if(v<h.par){x.strokeStyle='#c22';x.lineWidth=1.5;x.beginPath();x.arc(cx,cy,fs*.52,0,6.28);x.stroke();}else if(v>h.par){x.strokeStyle='#335';x.lineWidth=1.2;x.strokeRect(cx-fs*.5,cy-fs*.5,fs,fs);}});
   const tot=q.total,rel=tot===0?'E':tot>0?'+'+tot:String(tot);txt(rel,x0+cw-12,y0+fs*(4.8+j*1.2),{size:fs*.85,col:tot<0?'#c22':'#1a3a20',align:'right',w:'900'});});
  txt('tap to continue',W/2,y0+ch+fs*.9,{size:fs*.7,align:'center',col:'#fff'});}
 function centerMsg(m){txt(m,W/2,H/2,{size:L.fs,align:'center',w:'900'});}
 let titleCv=null;function drawTitleBg(){const pic=GS.picture('title-bg');if(pic){const k=Math.max(W/pic.width,H/pic.height);x.drawImage(pic,(W-pic.width*k)/2,(H-pic.height*k)/2,pic.width*k,pic.height*k);}
  else{const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#6aa7e6');g.addColorStop(.55,'#cfe6ff');g.addColorStop(.56,'#4f8f46');g.addColorStop(1,'#2a5a2a');x.fillStyle=g;x.fillRect(0,0,W,H);
   if(!titleCv)titleCv=A.treeCanvas('oak');for(let i=0;i<7;i++){const s0=H*(.22+((i*37)%5)*.03);x.drawImage(titleCv,(i*W/6.2+((i*53)%40))-s0*.33,H*.56-s0,s0*.67,s0);}}
  x.fillStyle='rgba(0,0,0,.25)';x.fillRect(0,0,W,H);}
 function drawPicker(){const fs=L.fs;pickBtns=[];A.drawLogo(x,W/2,H*.2,Math.min(W*.9,560));
  const cw=Math.min(W*.86,520),bh=fs*3.6,x0=(W-cw)/2;let y=H*.36;
  for(const co of C.COURSES){const T=C.THEMES[co.theme],on=set.course===co.id,b={x:x0,y,w:cw,h:bh,act:()=>{set.course=co.id;}};pickBtns.push(b);
   x.fillStyle=on?'rgba(255,210,63,.92)':'rgba(6,20,10,.78)';x.beginPath();x.roundRect(b.x,b.y,b.w,b.h,12);x.fill();
   txt(T.name.toUpperCase(),b.x+16,b.y+bh*.36,{size:fs*1.05,w:'900',col:on?'#1a1000':'#fff'});txt(`${T.sub} · par ${co.pars.reduce((a,b2)=>a+b2,0)} · ${T.source}`,b.x+16,b.y+bh*.7,{size:fs*.7,col:on?'#3a2a00':'#cde'});y+=bh+8;}
  y+=4;const half=(cw-8)/2;for(const [n,lbl] of [[3,'QUICK · 3 HOLES'],[9,'FULL · 9 HOLES']]){const on=set.holes===n,b={x:x0+(n===3?0:half+8),y,w:half,h:fs*2.6,act:()=>{set.holes=n;}};pickBtns.push(b);x.fillStyle=on?'#ffd23f':'rgba(6,20,10,.78)';x.beginPath();x.roundRect(b.x,b.y,b.w,b.h,10);x.fill();txt(lbl,b.x+b.w/2,b.y+b.h/2,{size:fs*.85,w:'900',align:'center',col:on?'#1a1000':'#fff'});}
  y+=fs*2.6+12;const go={x:x0,y,w:cw,h:fs*3,act:()=>{const f=pickDone;pickDone=null;f?.();}};pickBtns.push(go);const gg=x.createLinearGradient(0,go.y,0,go.y+go.h);gg.addColorStop(0,'#ffe27a');gg.addColorStop(1,'#f2a81d');x.fillStyle=gg;x.beginPath();x.roundRect(go.x,go.y,go.w,go.h,14);x.fill();
  txt('TEE OFF ▶',W/2,go.y+go.h/2,{size:fs*1.4,w:'900',align:'center',col:'#1a1000',font:'"SC Bangers","SC Nunito",sans-serif'});}
 function finishRound(){const tot=PL.map(q=>q.cards.reduce((a,b)=>a+(b||0),0)),par=course.holes.slice(set.start||0,(set.start||0)+set.holes).reduce((a,h)=>a+h.par,0);
  const sc=tot.map(v=>Math.max(1,200-(v-par)*10));const rel=v=>{const d=v-par;return d===0?'E':d>0?'+'+d:String(d);};
  s.finish(sc,`${course.name}: ${names[0]} ${tot[0]} (${rel(tot[0])}) · ${names[1]} ${tot[1]} (${rel(tot[1])})`);}
 s.debug={get mode(){return mode;},PL,get hole(){return hole;},get cur(){return cur;},get shot(){return shot;},set autopilot(v){autopilot=!!v;},set fast(v){fastK=Math.max(1,+v||1);},get autopilot(){return autopilot;},
  place:(i,dx,dz)=>{const p=PL[i],c0=hole.cup;p.ball={x:c0.x+dx,z:c0.z+dz};p.lie=hole.lie(p.ball.x,p.ball.z);p.strokes=Math.max(p.strokes,1);if(i===cur)initAim(p);},
  pick:(co,n)=>{set.course=co||set.course;set.holes=n||set.holes;const f=pickDone;pickDone=null;f?.();},swing:(pw=.9,cv=0)=>botSwing(pw,cv),aim:(y)=>{yaw=y;},skipFly:()=>{flyU=1;},
  bot:net?()=>{if(!autopilot){autopilot=true;fastK=5;return 'auto';}if(mode==='pick'&&pickDone){s.debug.pick(null,3);return 'pick';}if(mode==='fly')flyU=1;if(mode==='result'&&result)result.tap=true;if(mode==='card'&&card)card.tap=true;return '';}:null};
 const intro=net?"Shooter McGavin's Pro Tour online: take turns; the ball furthest from the hole plays next.":cpu?`Shooter McGavin's Pro Tour vs ${names[1]}. Aim by dragging the course, then roll the trackball DOWN and UP to swing.`:"Shooter McGavin's Pro Tour: two golfers, one phone. Aim by dragging the course, roll the trackball DOWN and UP to swing.";
 if(!await s.pass(0,intro,'Tee it up'))return;
 await play();
}
Object.assign(exports,{arcadegolf});
