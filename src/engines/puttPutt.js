// SITABOUT MINI GOLF (owner, Nov 14: "make it the best putt putt game ever made"; the name nods to Walkabout Mini Golf: you
// sit on the couch instead). Engine name stays `minigolf` and the ids stay (happy-gilmore-golf = the Arcade game,
// caddyshack-golf = Bushwood only, walkabout-golf = the old catalog variant), so saves and the board keep working.
// What the pro mini golf games do, and so does this: three themed courses of six holes (Bushwood from Caddyshack, the
// Waterbury putt-putt from Happy Gilmore, Spaceball City from Spaceballs) = a full 18; real ball physics (slopes and
// hills, rails, ramps and jumps, cliffs, sand, ice, water, the cup's lip), moving obstacles (windmill, clown's teeth,
// gator, gophers, sliders, spinners), bumpers, boost pads, tunnels and portals, trampolines, a vacuum, conveyors; a
// flyover of every hole, drag-back aiming from anywhere with a guide line that shows the first bounce, a camera that
// follows the ball, pinch to look around, the eye button for the whole hole; honours and the 'away' rule (the player
// farther from the cup putts next), par names, a golf scorecard, a hidden lost ball on every hole (Walkabout style),
// best rounds and aces saved. Your ball is your head: the face is printed on the ball and rolls with it.
// Physics/courses/drawing/CPU/sounds: src/engines/minigolf/. Art slots: src/data/minigolfSprites.js.
// Online (s.online): player 1's phone picks the course {setup:{c,n,st}}; the shooter's phone sends {sh:[vx,vy,T0]}
// (T0 = the hole clock, so moving obstacles are where they were), both phones roll the same ball through the same
// physics, and the shooter's phone sends the result {fin:[x,y,z,kind,strokes]} that both continue from.
const {clamp}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {isCpu,isOnline,cpuSkill}=require("src/engines/cpuKit.js");
const P=require("src/engines/minigolf/physics.js");
const {COURSES,courseById}=require("src/engines/minigolf/courses.js");
const R=require("src/engines/minigolf/render.js");
const CPU=require("src/engines/minigolf/cpu.js");
const {createSound}=require("src/engines/minigolf/sound.js");
const SP=require("src/data/minigolfSprites.js");
const {faceSprite}=require("src/headFacts.js");

const COL=['#3aa8ff','#ff5a8a'],VMAX=CPU.VMAX,FONT='"SC Bangers","Impact","Arial Black",sans-serif',UI='"SC Nunito","Arial Rounded MT Bold",Arial,sans-serif';
const NAMES={'-4':'CONDOR!!','-3':'ALBATROSS!','-2':'EAGLE!','-1':'BIRDIE!','0':'PAR','1':'BOGEY','2':'DOUBLE BOGEY','3':'TRIPLE BOGEY'};
const limitOf=h=>h.par+3;           // most strokes on a hole; not holed by then = picked up, scored par+4
const ptsOf=(h,n)=>30*(h.par+4-n);  // points (higher = better) for the launcher; only strokes count

async function minigolf(s){
 const [c,x]=s.canvas(720,1280,{fill:true});const fb=fullBleed(s,{bg:'#0b1a10'});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud?.(true,true);
 SP.preloadMinigolf();
 const net=isOnline(s)?s.online:null,me=net?net.me:-1,cpu=isCpu(s),snd=createSound();if(net)s.hotseat=true;s.cleanup(()=>snd.stop());
 const board=!store.arcade,np=2,human=i=>!(cpu&&i===1)&&!(net&&i!==me);
 const variant=s.game?.id==='caddyshack-golf'?'bushwood':null;
 s.hint('Drag back from anywhere and let go: the dotted line shows where the ball starts and its first bounce, the ring the power. Pull all the way into the red for a wild Happy Gilmore drive. Pinch or use two fingers to look around; the eye button shows the whole hole. The player farther from the cup putts next. Sand slows you, water and falling off cost a stroke. Find the hidden lost ball on every hole.');
 // ------------------------------------------------------------ state
 let phase='menu',W=s.W,H=s.H,T=0,cam={x:30,y:60,k:6,rot:0},tcam=null,hole=null,C=null,course=null,plan=null,hi=0,turn=0,balls=[],cards=[[],[]],honor=0;
 let aim=null,callout=null,fx=[],hits={},flyT=0,camMode='auto',manual=null,pinch=null,cpuJob=null,waitFin=null,lie=null,overview=false,scoreUI=null,menu={c:variant||'bushwood',n:board?3:6},menuHits=[],cardT=0,lostFound={},done=false;
 const moods=[{m:'normal',t:0},{m:'normal',t:0}],mood=(i,m,sec=1.6)=>{moods[i]={m,t:sec};if(m==='win')s.react?.(i,'happy',sec);else if(m==='sad'||m==='angry')s.react?.(i,'sad',sec);};
 const prof=()=>{const p=store.profile;if(!p)return null;const v=p.sitabout&&typeof p.sitabout==='object'?p.sitabout:{};p.sitabout={best:{...(v.best||{})},holes:{...(v.holes||{})},aces:+v.aces||0,lost:Array.isArray(v.lost)?v.lost.slice():[],rounds:+v.rounds||0};return p;};
 const saved=()=>store.profile?.sitabout||{best:{},holes:{},aces:0,lost:[],rounds:0};
 // ------------------------------------------------------------ input
 const touches=new Map();
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev);touches.set(ev.pointerId,{x:p.x,y:p.y,sx:p.x,sy:p.y,t:performance.now()});s.capture(ev);
  if(touches.size===2){aim=null;const [a,b]=[...touches.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),mx:(a.x+b.x)/2,my:(a.y+b.y)/2,cam:{...cam}};camMode='manual';return;}
  if(touches.size>2)return;
  if(tapUI(p.x,p.y))return;
  if(phase==='intro'){flyT=99;return;}
  if(phase==='card'){if(cardT>.6)scoreUI&&scoreUI.next();return;}
  if(phase==='aim'&&myTurn())aim={id:ev.pointerId,sx:p.x,sy:p.y,x:p.x,y:p.y,t0:performance.now()};
 });
 s.on(c,'pointermove',ev=>{const t=touches.get(ev.pointerId);if(!t)return;ev.preventDefault();const p=s.pointer(ev);t.x=p.x;t.y=p.y;
  if(pinch&&touches.size>=2){const [a,b]=[...touches.values()],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;const k=clamp(pinch.cam.k*d/Math.max(20,pinch.d),kFloor()*.7,kCeil()*1.6);
   const base={...pinch.cam,k};const [wx,wy]=R.unproj(base,W,H,pinch.mx,pinch.my),[nx,ny]=R.unproj(base,W,H,mx,my);manual={x:pinch.cam.x+(wx-nx),y:pinch.cam.y+(wy-ny),k,rot:cam.rot};return;}
  if(aim&&ev.pointerId===aim.id){aim.x=p.x;aim.y=p.y;const v=shotVec(),q=v?Math.min(5,Math.floor(v.pw*4+.001)):0;if(q!==aim.q){if(q>(aim.q||0)){vibrate(q>=5?25:6);snd.tick();}aim.q=q;}}});
 for(const ty of ['pointerup','pointercancel'])s.on(c,ty,ev=>{const t=touches.get(ev.pointerId);touches.delete(ev.pointerId);s.release(ev);if(touches.size<2)pinch=null;
  if(aim&&ev.pointerId===aim.id){const v=shotVec();aim=null;if(ty==='pointerup'&&v&&phase==='aim'&&myTurn())fire(v.vx,v.vy,v.happy,false);}});
 s.on(document,'keydown',ev=>{if(phase==='aim'&&myTurn()&&(ev.key===' '||ev.key==='Enter')){ev.preventDefault();const b=balls[turn].b,dx=hole.cup[0]-b.x,dy=hole.cup[1]-b.y,d=Math.hypot(dx,dy)||1,v=Math.min(VMAX,Math.sqrt(d)*15);fire(dx/d*v,dy/d*v,false,false);}
  if(ev.key==='v'||ev.key==='V')overview=!overview;});
 const myTurn=()=>phase==='aim'&&!balls[turn]?.cpuish&&human(turn);
 // the shot from the drag: pull back = power, opposite way = direction
 function shotVec(){if(!aim)return null;const dx=aim.sx-aim.x,dy=aim.sy-aim.y,L=Math.hypot(dx,dy);const full=Math.min(W,H)*.34;let pw=L/full;if(pw<.05)return null;pw=Math.min(pw,1.18);
  const du=dx/cam.k,dv=dy/(cam.k*R.TC),[wx,wy]=cam.rot?[dv,-du]:[du,dv],l=Math.hypot(wx,wy)||1;let ux=wx/l,uy=wy/l;const happy=pw>1;let sp=Math.min(1,pw)*VMAX;
  if(happy){const k=(pw-1)/.18,wob=Math.sin(aim.t0*.013+T*9)*.11*k,c2=Math.cos(wob),s2=Math.sin(wob);const nx=ux*c2-uy*s2,ny=ux*s2+uy*c2;ux=nx;uy=ny;sp=VMAX*(1+.14*k);}
  return {vx:ux*sp,vy:uy*sp,pw,happy,ux,uy};}
 // HUD buttons
 let uiHits=[];
 function tapUI(X,Y){for(const h of uiHits)if(X>=h.x&&X<=h.x+h.w&&Y>=h.y&&Y<=h.y+h.h){h.f();snd.tick();return true;}if(phase==='menu'){for(const h of menuHits)if(X>=h.x&&X<=h.x+h.w&&Y>=h.y&&Y<=h.y+h.h){h.f();snd.tick();return true;}}return false;}
 // ------------------------------------------------------------ the round
 function holesFor(cid,n,st=0){if(cid==='tour')return COURSES.flatMap(c=>c.holes).slice(0,18);const co=courseById(cid);return co.holes.slice(st,st+n);}
 async function chooseRound(){
  if(board){// board: three holes, a random course and side (both phones deal the same from the seed)
   const cid=variant||COURSES[Math.floor(s.random()*COURSES.length)].id,st=s.random()<.5?0:3;return {cid,list:holesFor(cid,3,st)};}
  if(net&&me!==0){phase='menu-wait';while(s.alive&&!gotSetup&&!netGone)await new Promise(r=>setTimeout(r,60));if(!gotSetup)return null;const {c:cid,n,st}=gotSetup;return {cid,list:holesFor(cid,n,st)};}
  phase='menu';await new Promise(res=>{menu.go=res;});
  const r={cid:menu.c,list:holesFor(menu.c,menu.c==='tour'?18:menu.n,0)};if(net)net.send({setup:{c:menu.c,n:r.list.length,st:0}});return r;
 }
 // ------------------------------------------------------------ holes
 function startHole(i){hi=i;hole=plan.list[i];course=courseById(hole.course);C=P.compile(hole);T=0;fx=[];hits={};overview=false;camMode='auto';manual=null;
  const rot=(W>H*1.1)!==((C.bbox[2]-C.bbox[0])>(C.bbox[3]-C.bbox[1]));cam.rot=rot?1:0;
  balls=[0,1].map(pi=>{const b=P.newBall(hole.tee[0]+(pi?1.6:-1.6),hole.tee[1],C);b.rest=true;return {b,i:pi,col:COL[pi],strokes:0,done:false,picked:false,orient:R.newOrient(cam.rot),face:faceFn(pi),lie:{x:b.x,y:b.y,z:b.z},vis:1.3,cup:hole.cup};});
  phase='intro';flyT=0;const f=frame('overview');cam={...f,rot:cam.rot};tcam=null;callout=null;
  snd.ambience(0,course.id);}
 function faceFn(i){return (g,cx,cy,size)=>{const id=s.players[i]?.character,m=moods[i].m,fw=size*.78,sp=id&&faceSprite(id,m,fw,1);if(sp){g.drawImage(sp.cv,cx+sp.x,cy+sp.y);}else s.sprite(g,i,cx,cy,size,{exact:true,mood:m,noBadge:true,still:true});};}
 // who putts: on the tee the honour (best last hole), then whoever is away (farther from the cup along the greens)
 function nextPlayer(){const live=balls.filter(b=>!b.done);if(!live.length)return -1;if(live.length===1)return live[0].i;
  const a=balls[0],b=balls[1];if(a.strokes===0&&b.strokes===0)return honor;if(a.strokes===0)return 0;if(b.strokes===0)return 1;
  const f=P.cupField(C),da=f(a.b.x,a.b.y)+(f(a.b.x,a.b.y)>=999?Math.hypot(a.b.x-hole.cup[0],a.b.y-hole.cup[1]):0),db=f(b.b.x,b.b.y)+(f(b.b.x,b.b.y)>=999?Math.hypot(b.b.x-hole.cup[0],b.b.y-hole.cup[1]):0);
  if(Math.abs(da-db)<.5)return a.strokes<=b.strokes?0:1;return da>db?0:1;}
 function beginTurn(){const n=nextPlayer();if(n<0){endHole();return;}turn=n;phase='aim';camMode='auto';manual=null;aim=null;
  for(const bb of balls)bb.glow=bb.i===turn;mood(turn,'think',99);
  say(`${s.players[turn].name.toUpperCase()}${s.players[turn].name.endsWith('s')?"'":"'S"} SHOT`,`stroke ${balls[turn].strokes+1} · par ${hole.par}`,1.1,'turn');
  if(cpu&&turn===1)startCpu();}
 function startCpu(){const bb=balls[1],tFire=T+1.4+Math.random()*.4,skill=cpuSkill(s),gen=CPU.plan(C,{x:bb.b.x,y:bb.b.y,z:bb.b.z},tFire,{skill,fine:skill>.5});cpuJob={gen,tFire,res:null,skill};}
 function stepCpu(){if(!cpuJob||phase!=='aim'||turn!==1)return;const j=cpuJob;if(!j.res){const t0=performance.now();while(performance.now()-t0<9){const r=j.gen.next();if(r.done){j.res=r.value;break;}}if(!j.res)return;}
  if(T<j.tFire)return;const e=CPU.errOf(j.skill),a=j.res.a+CPU.gauss(Math.random)*e.a,p=clamp(j.res.p*(1+CPU.gauss(Math.random)*e.p),.03,1),v=p*VMAX;cpuJob=null;fire(Math.cos(a)*v,Math.sin(a)*v,false,false);}
 function fire(vx,vy,happy,remote){
  if(phase!=='aim')return;const bb=balls[turn];
  if(net&&!remote){if(!human(turn))return;net.send({sh:[+vx.toFixed(4),+vy.toFixed(4),+T.toFixed(5),happy?1:0]});}
  bb.lie={x:bb.b.x,y:bb.b.y,z:bb.b.z};bb.strokes++;P.launch(bb.b,vx,vy);trail={pts:[],col:COL[turn]};phase='roll';rollT=0;shotPeak=Math.hypot(vx,vy);
  const pw=Math.hypot(vx,vy)/VMAX;snd.putt(pw);vibrate(pw>.8?18:8);if(happy){snd.happy();say('HAPPY GILMORE!','run-up drive',1.1,'happy');mood(turn,'silly',1.5);}else mood(turn,'normal',1);
  if(remote)return;}
 let rollT=0,shotPeak=0,lastSurf='turf';
 let simAcc=0,trail={pts:[],col:'#fff'};
 // fixed 240 Hz steps on the hole clock T (both phones step the same T's, so moving obstacles match)
 function physics(dt){
  if(phase!=='roll')return;const bb=balls[turn],b=bb.b;rollT+=dt;simAcc+=Math.min(dt,.05);let n=0;
  let ended=null;const ev=(k,d)=>{onEvent(k,d,bb);if(k==='sink'||k==='splash'||k==='ob'||k==='chomp'||k==='stop')ended=ended||{k,d};};
  while(simAcc>=P.DT&&n<14&&!ended){simAcc-=P.DT;n++;const px=b.x,py=b.y;P.stepBall(C,b,T,ev);T+=P.DT;R.rollOrient(bb.orient,b.x-px,b.y-py);}
  const g=C.topAt(b.x,b.y);lastSurf=g?g.g.type:'turf';snd.rolling(b.air||b.rest?0:Math.hypot(b.vx,b.vy),lastSurf);
  trail.pts.push([b.x,b.y,b.air?b.z:b.z+.05]);if(trail.pts.length>36)trail.pts.shift();
  if(!ended&&b.t>P.MAX_ROLL+.5)ended={k:'stop'};
  if(ended){simAcc=0;resolve(ended.k,bb);}}
 function onEvent(k,d,bb){
  const b=bb.b;
  if(k==='wall'){snd.wall(d.v,d.kind);if(d.v>60)puff(d.x,d.y,b.z+.8,'#ffffff',4,.25);}
  else if(k==='bumper'){snd.bumper();hits['b'+d.i]=T;burst(d.x,d.y,1.5,['#ffe14d','#ff5a8a','#fff'],12);vibrate(10);}
  else if(k==='boost'){snd.boost();say(course.id==='spaceballs'?'LUDICROUS SPEED!':'BOOST!',course.id==='spaceballs'?"they've gone to plaid":'',1,'fx');}
  else if(k==='tunnel'){course.look.space?snd.portal():snd.tunnel();if(course.id==='spaceballs')say('THE SCHWARTZ!','',.8,'fx');}
  else if(k==='tramp'){snd.tramp();say('BOING!','',.7,'fx');}
  else if(k==='land'){snd.thud(d.hard);puff(d.x,d.y,b.z,'#ddd',5,.3);}
  else if(k==='gopher'){snd.gopher();say('GOPHER!','"I\'m gonna get you, gopher"',1,'bad');mood(bb.i,'angry');}
  else if(k==='lip'){snd.lip();say('LIPPED OUT!','',1,'bad');mood(bb.i,'sad');}
  if(hole.lost&&!lostFound[hole.key]&&human(bb.i)&&Math.hypot(b.x-hole.lost[0],b.y-hole.lost[1])<2.6)findLost(bb);
 }
 function findLost(bb){lostFound[hole.key]=true;snd.lost();burst(hole.lost[0],hole.lost[1],1,['#ffe14d','#fff'],20);
  const p=prof();if(p&&!p.sitabout.lost.includes(hole.key)){p.sitabout.lost.push(hole.key);saveProfile(p);say('LOST BALL FOUND!',`${p.sitabout.lost.length} of 18 found`,1.8,'good');}else say('LOST BALL!','already in your collection',1.2,'good');}
 // a shot is over: sunk, stopped, or a penalty. Online the watching phone waits for the shooter's word on where it ended.
 function resolve(k,bb){
  snd.rolling(0);const b=bb.b;
  if(net&&!human(bb.i)){phase='fin';waitFin={bb,k};return;}
  if(net)net.send({fin:[+b.x.toFixed(3),+b.y.toFixed(3),+b.z.toFixed(3),k,bb.strokes]});
  settle(k,bb);}
 function settle(k,bb){
  const b=bb.b;
  if(k==='sink'){sinkBall(bb);return;}
  if(k==='splash'||k==='ob'||k==='chomp'){bb.strokes++;const txt=k==='splash'?'SPLASH!':k==='chomp'?'CHOMP!':'OUT OF BOUNDS!',sub=k==='chomp'?'"That gator ate my ball!" +1 stroke':'+1 stroke, back to your lie';
   if(k==='splash'){snd.splash();burst(b.x,b.y,0,[course.look.space?'#d27bff':'#9fd8ff','#fff'],22);}else if(k==='chomp')snd.chomp();else snd.splash();
   say(txt,sub,1.4,'bad');mood(bb.i,'angry',2);bb.hidden=true;phase='penalty';setTimeout(()=>{if(!s.alive)return;Object.assign(b,P.newBall(bb.lie.x,bb.lie.y,C));b.z=bb.lie.z;b.rest=true;bb.hidden=false;afterShot(bb);},900);return;}
  b.rest=true;b.vx=b.vy=0;afterShot(bb);}
 function afterShot(bb){if(!bb.done&&bb.strokes>=limitOf(hole)){bb.done=true;bb.picked=true;bb.hidden=true;cards[bb.i][hi]=hole.par+4;say('PICK UP',`${limitOf(hole)} strokes is the limit`,1.3,'bad');}
  phase='wait';setTimeout(()=>{if(s.alive&&phase==='wait')beginTurn();},bb.done?1300:650);}
 function sinkBall(bb){bb.done=true;bb.b.inCup=true;cards[bb.i][hi]=bb.strokes;const d=bb.strokes-hole.par,ace=bb.strokes===1;bb.sinkT=0;
  snd.cupRattle();snd.drop();vibrate([20,40,30]);
  if(ace){snd.ace();say('HOLE IN ONE!!','',2.6,'ace');for(let k=0;k<4;k++)setTimeout(()=>s.alive&&burst(hole.cup[0]+(Math.random()-.5)*16,hole.cup[1]+(Math.random()-.5)*16,4,['#ffe14d','#ff5a8a','#57e1ff','#7dff8a','#fff'],40,'confetti'),k*260);}
  else{const nm=NAMES[String(clamp(d,-4,3))]||`+${d}`;d<0?snd.birdie():d===0?snd.par():snd.bogey();say(nm,d<0?'under par':d===0?'right on par':`${d} over par`,1.7,d<0?'good':d===0?'ok':'bad');if(d<0)burst(hole.cup[0],hole.cup[1],2,['#ffe14d','#fff','#7dff8a'],24,'confetti');}
  mood(bb.i,d<=0?'win':'sad',2.2);
  if(human(bb.i)){const p=prof();if(p){const hs=p.sitabout.holes;if(!(hs[hole.key]<=bb.strokes))hs[hole.key]=bb.strokes;if(ace)p.sitabout.aces++;saveProfile(p);}}
  phase='sunk';setTimeout(()=>{if(s.alive&&phase==='sunk')afterSink();},ace?2600:1600);}
 function afterSink(){phase='wait';beginTurn();}
 function endHole(){// honour for the next tee: lower score on this hole (ties keep it)
  const a=cards[0][hi],b=cards[1][hi];if(a<b)honor=0;else if(b<a)honor=1;
  phase='card';cardT=0;s.setScores(pointsNow());scoreUI={next:()=>{scoreUI=null;if(hi+1<plan.list.length)startHole(hi+1);else finishRound();}};
  setTimeout(()=>{if(s.alive&&phase==='card'&&scoreUI)scoreUI.next();},board?3600:5200);}
 const strokesNow=i=>cards[i].reduce((a,v)=>a+(v||0),0),parNow=i=>plan.list.reduce((a,h,j)=>a+(cards[i][j]!=null?h.par:0),0);
 function pointsNow(){return [0,1].map(i=>plan.list.reduce((a,h,j)=>a+(cards[i][j]!=null?ptsOf(h,cards[i][j]):0),0));}
 const toPar=i=>{const d=strokesNow(i)-parNow(i);return d===0?'E':d>0?'+'+d:String(d);};
 function finishRound(){phase='over';done=true;const pts=pointsNow();s.setScores(pts);
  const p=prof();if(p&&!board&&!net&&plan.list.length>=3){const key=plan.cid+'-'+plan.list.length;for(let i=0;i<2;i++){if(!human(i))continue;const n=strokesNow(i);if(!(p.sitabout.best[key]<=n))p.sitabout.best[key]=n;}p.sitabout.rounds++;saveProfile(p);}
  const lbl=`Sitabout Mini Golf · ${s.players[0].name} ${strokesNow(0)} (${toPar(0)}) · ${s.players[1].name} ${strokesNow(1)} (${toPar(1)})`;
  setTimeout(()=>{if(s.alive)s.finish(pts,lbl);},2600);}
 // ------------------------------------------------------------ callouts + particles
 function say(t,sub,sec,kind){callout={t,sub,life:sec,max:sec,kind};}
 function burst(x,y,z,cols,n,kind){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=8+Math.random()*26;fx.push({x,y,z,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:20+Math.random()*40,life:1+Math.random()*.8,max:1.6,col:cols[i%cols.length],s:kind==='confetti'?.45:.3,kind,r:Math.random()*6,g:kind==='confetti'?30:60});}}
 function puff(x,y,z,col,n,s0){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=3+Math.random()*6;fx.push({x,y,z,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:4+Math.random()*6,life:.4,max:.4,col,s:s0,g:10});}}
 function stepFx(dt){for(const p of fx){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=p.g*dt;if(p.kind==='confetti'){p.vx*=.98;p.vy*=.98;p.r+=dt*8;if(p.vz<-6)p.vz=-6;}if(p.z<0&&p.kind!=='confetti'){p.z=0;p.vz*=-.3;}}fx=fx.filter(p=>p.life>0);}
 // ------------------------------------------------------------ camera
 const kCeil=()=>Math.min(W,H)/27,kFloor=()=>{const [x0,y0,x1,y1]=C?C.bbox:[0,0,60,100],w=cam.rot?(y1-y0):(x1-x0),h=cam.rot?(x1-x0):(y1-y0);return Math.min((W-20)/(w+16),(H-60)/((h+16)*R.TC));};
 function fitBox(x0,y0,x1,y1,pad,top=70,bot=40){const w=(cam.rot?(y1-y0):(x1-x0))+pad*2,h=((cam.rot?(x1-x0):(y1-y0))+pad*2)*R.TC+4;const k=Math.min((W-16)/w,(H-top-bot)/h);const cx=(x0+x1)/2,cy=(y0+y1)/2;
  // shift so the box sits between the HUD and the bottom
  const sh=(top-bot)/2/k/R.TC;return cam.rot?{x:cx-sh,y:cy,k}:{x:cx,y:cy-sh,k};}
 function frame(kind){
  if(!C)return {...cam};const [x0,y0,x1,y1]=C.bbox;
  if(kind==='overview'){const f=fitBox(x0,y0,x1,y1,6);return {...f,k:Math.min(f.k,kCeil())};}
  const bb=balls[turn],b=bb.b;
  if(kind==='roll'){const sp=Math.hypot(b.vx,b.vy),k=clamp(kCeil()*(1-Math.min(.45,sp/500)),kFloor(),kCeil());return {x:b.x+b.vx*.25,y:b.y+b.vy*.25,k};}
  // aim: show the ball and the cup if they fit, else the ball low on the screen looking toward the cup
  const cx=hole.cup[0],cy=hole.cup[1],f=fitBox(Math.min(b.x,cx),Math.min(b.y,cy),Math.max(b.x,cx),Math.max(b.y,cy),12);
  const kk=clamp(f.k,Math.max(kFloor(),kCeil()*.58),kCeil());if(kk<=f.k+1e-6)return {...f,k:kk};
  const d=Math.hypot(cx-b.x,cy-b.y)||1,reach=(cam.rot?W*.3:H*.27)/kk;return {x:b.x+(cx-b.x)/d*reach,y:b.y+(cy-b.y)/d*reach,k:kk};}
 function stepCam(dt){
  let goal;if(phase==='intro'){const f0=frame('overview'),t=clamp(flyT/2.6,0,1),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
   const cupF={x:hole.cup[0],y:hole.cup[1],k:kCeil()*.95},teeF={x:hole.tee[0],y:hole.tee[1]-14,k:kCeil()*.8};
   goal=t<.35?{x:cupF.x+(f0.x-cupF.x)*e*2,y:cupF.y+(f0.y-cupF.y)*e*2,k:cupF.k+(f0.k-cupF.k)*e*2}:{x:f0.x+(teeF.x-f0.x)*(t-.35)/.65,y:f0.y+(teeF.y-f0.y)*(t-.35)/.65,k:f0.k+(teeF.k-f0.k)*(t-.35)/.65};
   if(flyT<.05){cam={...goal,rot:cam.rot};return;}}
  else if(overview)goal=frame('overview');
  else if(camMode==='manual'&&manual)goal=manual;
  else if(phase==='roll'||phase==='fin')goal=frame('roll');
  else if(phase==='aim'||phase==='wait'||phase==='sunk'||phase==='penalty')goal=(phase==='aim'||phase==='wait')&&balls[turn]&&!balls[turn].done?frame('aim'):tcam||frame('overview');
  else goal=frame('overview');
  if(phase==='aim'||phase==='roll')tcam=goal;
  const a=1-Math.exp(-dt*(phase==='roll'?6:camMode==='manual'?20:3.2));cam.x+=(goal.x-cam.x)*a;cam.y+=(goal.y-cam.y)*a;cam.k+=(goal.k-cam.k)*a;}
 // ------------------------------------------------------------ drawing
 function drawWorld(){
  const parts=C.movers.length?P.moverParts(C,T):{segs:[],hazards:[]};const near=balls.some(bb=>!bb.done&&!bb.hidden&&Math.hypot(bb.b.x-hole.cup[0],bb.b.y-hole.cup[1])<14);
  R.drawHole(x,W,H,cam,{C,course,T,parts,fx,hit:hits,trail:phase==='roll'||phase==='fin'?trail:null,balls:balls.filter(bb=>!bb.done||bb.sinkT<.5).map(bb=>({...bb,ghost:phase!=='intro'&&bb.i!==turn&&!bb.done,sinkDip:bb.done&&!bb.picked?Math.min(1,bb.sinkT*3)*2.2:0})),flag:near?.35:1,lost:hole.lost,lostFound:lostFound[hole.key]||saved().lost?.includes(hole.key)});}
 function drawAim(){
  const bb=balls[turn];if(!bb)return;const b=bb.b,[BX,BY]=R.proj(cam,W,H,b.x,b.y,b.z+P.BALL_R);
  let v=aim?shotVec():null;
  if(!v&&cpu&&turn===1&&cpuJob?.res&&T>cpuJob.tFire-1){const r=cpuJob.res,k=clamp((T-(cpuJob.tFire-1))*1.2,0,1);v={ux:Math.cos(r.a),uy:Math.sin(r.a),pw:r.p*k,happy:false};}
  if(!v){// idle: a soft pulsing ring so you know whose ball it is
   const r=Math.max(10,cam.k*2.4)*(1+.12*Math.sin(T*5));x.strokeStyle=COL[turn];x.globalAlpha=.6;x.lineWidth=2;x.beginPath();x.ellipse(BX,BY+cam.k*R.TS*P.BALL_R,r,r*R.TC,0,0,7);x.stroke();x.globalAlpha=1;
   if(myTurn()&&T<6){const a=(T*1.2)%1;x.fillStyle=`rgba(255,255,255,${.6*(1-a)})`;x.font=`800 ${Math.round(clamp(W*.035,12,16))}px ${UI}`;x.textAlign='center';x.fillText('drag back from anywhere and let go',W/2,H-58);}
   return;}
  const pw=Math.min(1,v.pw),len=10+pw*pw*70,pts=P.aimRay(C,b.x,b.y,v.ux,v.uy,len,T);
  // guide dots with the first bounce
  let acc=0;const dots=[];for(let i=1;i<pts.length;i++){const [ax,ay]=pts[i-1],[bx2,by2]=pts[i],L=Math.hypot(bx2-ax,by2-ay);for(let d=(i===1?2.5:0);d<L;d+=2.2){const f=d/L;dots.push([ax+(bx2-ax)*f,ay+(by2-ay)*f,acc+d]);}acc+=L;}
  for(const [wx,wy,dd] of dots){const g=C.topAt(wx,wy),[X,Y]=R.proj(cam,W,H,wx,wy,(g?g.z:0)+.3),f=1-dd/len;x.fillStyle=`rgba(255,255,255,${.25+.7*f})`;x.beginPath();x.arc(X,Y,Math.max(1.6,cam.k*.38*(.6+.4*f)),0,7);x.fill();}
  // pull band behind the ball + power ring
  const col=v.happy?'#ff2d2d':pw<.5?'#7dff8a':pw<.8?'#ffd23f':'#ff8a2d';
  const [TX,TY]=R.proj(cam,W,H,b.x-v.ux*(4+pw*10),b.y-v.uy*(4+pw*10),b.z+P.BALL_R);x.strokeStyle=col;x.lineWidth=Math.max(3,cam.k*.6);x.lineCap='round';x.beginPath();x.moveTo(BX,BY);x.lineTo(TX,TY);x.stroke();
  const rr=Math.max(16,cam.k*3.2);x.lineWidth=5;x.strokeStyle='rgba(0,0,0,.45)';x.beginPath();x.arc(BX,BY,rr,-Math.PI/2,Math.PI*1.5);x.stroke();x.strokeStyle=col;x.beginPath();x.arc(BX,BY,rr,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,v.pw/1.18));x.stroke();
  x.font=`900 ${Math.round(clamp(W*.04,13,18))}px ${UI}`;x.textAlign='center';x.fillStyle='#fff';x.strokeStyle='rgba(0,0,0,.6)';x.lineWidth=3;const tx=v.happy?'HAPPY!':Math.round(pw*100)+'%';x.strokeText(tx,BX,BY-rr-8);x.fillText(tx,BX,BY-rr-8);
  if(aim){x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=2;x.setLineDash([6,6]);x.beginPath();x.moveTo(aim.sx,aim.sy);x.lineTo(aim.x,aim.y);x.stroke();x.setLineDash([]);x.fillStyle='rgba(255,255,255,.25)';x.beginPath();x.arc(aim.sx,aim.sy,10,0,7);x.fill();}
 }
 function pill(X,Y,w,h,fill,stroke){x.beginPath();x.roundRect(X,Y,w,h,h/2);x.fillStyle=fill;x.fill();if(stroke){x.strokeStyle=stroke;x.lineWidth=2;x.stroke();}}
 function text(t,X,Y,size,col='#fff',align='left',font=UI,weight=900){x.font=`${weight} ${Math.round(size)}px ${font}`;x.textAlign=align;x.textBaseline='middle';x.fillStyle=col;x.fillText(t,X,Y);}
 function fitText(t,size,maxW,font=UI,weight=900){x.font=`${weight} ${Math.round(size)}px ${font}`;const w=x.measureText(t).width;return w>maxW?size*maxW/w:size;}
 function faceAt(i,cx,cy,size){x.save();x.beginPath();x.arc(cx,cy,size/2,0,7);x.fillStyle='#fff';x.fill();x.clip();balls[i]?.face?balls[i].face(x,cx,cy,size*1.05):faceFn(i)(x,cx,cy,size*1.05);x.restore();x.strokeStyle=COL[i];x.lineWidth=2.5;x.beginPath();x.arc(cx,cy,size/2,0,7);x.stroke();}
 function drawHUD(){
  uiHits=[];const top=Math.max(8,(fb.top||0)>0?6:6),rw=Math.max(110,(fb.top?150:0));
  // hole plate (top-left)
  const pw=Math.min(W-rw-14,300),fs=clamp(W*.036,12,17);pill(8,top,pw,fs*2.6,'rgba(8,20,12,.78)','rgba(255,255,255,.15)');
  text(`HOLE ${hi+1}`,20,top+fs*.85,fs*.8,'#ffd23f');const nm=hole.name.toUpperCase();text(nm,20,top+fs*1.85,fitText(nm,fs*1.05,pw-90,FONT,400),'#fff','left',FONT,400);
  text(`PAR ${hole.par}`,8+pw-14,top+fs*1.3,fs*.95,'#fff','right');
  // player chips under it
  for(let i=0;i<2;i++){const y=top+fs*2.6+8+i*(fs*2+6),w=Math.min(pw,230),act=i===turn&&(phase==='aim'||phase==='roll'||phase==='fin');pill(8,y,w,fs*2,act?'rgba(0,0,0,.72)':'rgba(0,0,0,.45)',act?COL[i]:null);
   faceAt(i,8+fs,y+fs,fs*1.7);const nm2=s.players[i].name+(cpu&&i===1?' (CPU)':'');text(nm2,8+fs*2.2,y+fs,fitText(nm2,fs*.9,w-fs*2.2-70),'#fff');
   const st=balls[i]?.done?(balls[i].picked?'X':String(cards[i][hi])):String(balls[i]?.strokes||0);text(`${st} · ${toPar(i)}`,8+w-10,y+fs,fs*.85,act?'#ffd23f':'#cfd8d0','right');}
  // eye button (bottom-left) = the whole hole
  const bs=Math.max(40,Math.min(52,W*.11)),by=H-bs-14;pill(12,by,bs,bs,overview?'rgba(255,210,63,.9)':'rgba(0,0,0,.55)','rgba(255,255,255,.3)');
  x.strokeStyle=overview?'#000':'#fff';x.lineWidth=2.5;x.beginPath();x.ellipse(12+bs/2,by+bs/2,bs*.3,bs*.18,0,0,7);x.stroke();x.beginPath();x.arc(12+bs/2,by+bs/2,bs*.09,0,7);x.fillStyle=overview?'#000':'#fff';x.fill();
  uiHits.push({x:12,y:by,w:bs,h:bs,f:()=>{overview=!overview;if(!overview){camMode='auto';manual=null;}}});
  if(camMode==='manual'&&!overview){pill(12+bs+10,by+bs*.15,bs*1.9,bs*.7,'rgba(0,0,0,.55)','rgba(255,255,255,.3)');text('RECENTER',12+bs+10+bs*.95,by+bs*.5,bs*.26,'#fff','center');uiHits.push({x:12+bs+10,y:by,w:bs*1.9,h:bs,f:()=>{camMode='auto';manual=null;}});}
  if(phase==='aim'&&!myTurn()&&!(cpu&&turn===1)&&net){text(`${s.players[turn].name} is lining it up…`,W/2,H-30,clamp(W*.035,12,16),'#fff','center');}
  if(phase==='aim'&&cpu&&turn===1){text(`${s.players[1].name} is reading the green…`,W/2,H-30,clamp(W*.035,12,16),'#fff','center');}
 }
 function drawCallout(dt){if(!callout)return;callout.life-=dt;if(callout.life<=0){callout=null;return;}const c0=callout,age=c0.max-c0.life,pop=age<.18?.6+age/.18*.5:age<.3?1.1-(age-.18)/.12*.1:1,a=Math.min(1,c0.life*3);
  const big=c0.kind==='ace'?1.6:c0.kind==='turn'?.75:c0.kind==='fx'?.9:1.1,size=fitText(c0.t,clamp(W*.11,30,72)*big*pop,W*.92,FONT,400);
  const cy=c0.kind==='turn'?Math.max(fb.top+150,H*.26):H*.36;x.globalAlpha=a;x.font=`400 ${Math.round(size)}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=Math.max(4,size*.14);x.strokeStyle='rgba(0,0,0,.7)';x.strokeText(c0.t,W/2,cy);
  const col={ace:'#ffd23f',good:'#7dff8a',bad:'#ff6b6b',happy:'#ff4d4d',fx:'#57e1ff',ok:'#ffffff',turn:'#ffffff'}[c0.kind]||'#fff';const g=x.createLinearGradient(0,cy-size/2,0,cy+size/2);g.addColorStop(0,'#fff');g.addColorStop(.55,col);g.addColorStop(1,col);x.fillStyle=c0.kind==='ace'?`hsl(${(T*240)%360},100%,65%)`:g;x.fillText(c0.t,W/2,cy);
  if(c0.sub){const ss=fitText(c0.sub,size*.32,W*.9);x.font=`800 ${Math.round(ss)}px ${UI}`;x.lineWidth=4;x.strokeText(c0.sub,W/2,cy+size*.62);x.fillStyle='#fff';x.fillText(c0.sub,W/2,cy+size*.62);}x.globalAlpha=1;}
 function drawIntroCard(){const t=flyT,a=clamp(Math.min(t*3,(3.1-t)*3),0,1);if(a<=0)return;x.globalAlpha=a;const w=Math.min(W*.92,520),h=Math.min(H*.3,190),X=(W-w)/2,Y=H*.58;
  x.beginPath();x.roundRect(X,Y,w,h*.86,18);x.fillStyle='rgba(6,16,10,.86)';x.fill();x.strokeStyle='rgba(255,210,63,.7)';x.lineWidth=2;x.stroke();if(0)pill(X,Y,w,h*.62,'rgba(6,16,10,.86)','rgba(255,210,63,.7)');x.globalAlpha=a;text(`${course.name.toUpperCase()} · HOLE ${hole.n}`,W/2,Y+h*.12,clamp(w*.034,11,15),'#ffd23f','center');
  text(hole.name.toUpperCase(),W/2,Y+h*.28,fitText(hole.name.toUpperCase(),clamp(w*.09,22,44),w*.9,FONT,400),'#fff','center',FONT,400);text(`PAR ${hole.par}${plan.list.length>1?`  ·  ${hi+1} of ${plan.list.length}`:''}`,W/2,Y+h*.45,clamp(w*.032,11,15),'#cfe','center');
  if(hole.quote){const q=hole.quote;text(q,W/2,Y+h*.66,fitText(q,clamp(w*.03,10,14),w*.94,UI,700),'rgba(255,255,255,.85)','center',UI,700);}
  text('tap to skip',W/2,H-24,12,'rgba(255,255,255,.5)','center',UI,700);x.globalAlpha=1;}
 // the golf scorecard (birdies circled, bogeys boxed, like a real one)
 function drawCard(final){x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,0,W,H);const list=plan.list,n=list.length,rows=n>9?2:1,per=Math.ceil(n/rows);
  const w=Math.min(W*.94,760),cell=Math.min((w-110)/(per+1),46),rowH=Math.min(cell*.9,34),h=rows*rowH*4.3+(final?150:84),X=(W-w)/2,Y=Math.max(fb.top+6,(H-h)/2);
  const paper=SP.picture('scorecard');if(paper)x.drawImage(paper,X,Y,w,h);else{x.fillStyle='#f6f0dc';x.beginPath();x.roundRect(X,Y,w,h,14);x.fill();x.strokeStyle='#c9b98a';x.lineWidth=2;x.stroke();}
  text(final?'FINAL SCORECARD':`AFTER HOLE ${hi+1}`,W/2,Y+24,clamp(w*.045,16,26),'#2a3a22','center',FONT,400);text(`${course.name}${plan.cid==='tour'?' · Grand Tour':''}`,W/2,Y+46,12,'#6a5a3a','center',UI,800);
  const lx=X+12,cw=cell,c0=lx+100;
  for(let r=0;r<rows;r++){const y0=Y+60+r*rowH*4.3,from=r*per,to=Math.min(n,from+per);
   text('HOLE',lx,y0+rowH*.5,12,'#2a3a22');text('PAR',lx,y0+rowH*1.5,12,'#2a3a22');
   for(let j=from;j<to;j++){const cx=c0+(j-from)*cw+cw/2;text(String(j+1),cx,y0+rowH*.5,12,j===hi&&!final?'#c0392b':'#2a3a22','center');text(String(list[j].par),cx,y0+rowH*1.5,12,'#6a5a3a','center');}
   text(r===rows-1?'TOT':'',c0+(to-from)*cw+cw/2,y0+rowH*.5,12,'#2a3a22','center');
   for(let i=0;i<2;i++){const yy=y0+rowH*(2.6+i*1.05);faceAt(i,lx+10,yy,rowH*.8);text(s.players[i].name.slice(0,9),lx+24,yy,fitText(s.players[i].name.slice(0,9),12,72),'#2a3a22');
    for(let j=from;j<to;j++){const v=cards[i][j];if(v==null)continue;const cx=c0+(j-from)*cw+cw/2,d=v-list[j].par;text(v>list[j].par+3?'X':String(v),cx,yy,13,d<0?'#c0392b':'#1d2a18','center');
     x.strokeStyle=d<0?'#c0392b':'#1d2a18';x.lineWidth=1.4;if(d<0){x.beginPath();x.arc(cx,yy,rowH*.36,0,7);x.stroke();if(d<-1){x.beginPath();x.arc(cx,yy,rowH*.46,0,7);x.stroke();}}else if(d>0){x.strokeRect(cx-rowH*.34,yy-rowH*.34,rowH*.68,rowH*.68);if(d>1)x.strokeRect(cx-rowH*.44,yy-rowH*.44,rowH*.88,rowH*.88);}}
    if(r===rows-1)text(`${strokesNow(i)}`,c0+(to-from)*cw+cw/2,yy,14,'#1d2a18','center');}
   x.strokeStyle='rgba(60,50,20,.25)';x.lineWidth=1;for(let k=1;k<4;k++){const ly=y0+rowH*(k===1?1:k===2?2:3.1);x.beginPath();x.moveTo(lx,ly);x.lineTo(X+w-12,ly);x.stroke();}}
  if(final){const a=strokesNow(0),b=strokesNow(1),win=a===b?'ALL SQUARE!':`${s.players[a<b?0:1].name.toUpperCase()} WINS!`;text(win,W/2,Y+h-62,fitText(win,clamp(w*.07,22,40),w*.9,FONT,400),'#c0392b','center',FONT,400);
   text(`${s.players[0].name} ${a} (${toPar(0)})   ·   ${s.players[1].name} ${b} (${toPar(1)})`,W/2,Y+h-28,13,'#2a3a22','center',UI,800);}
  else text('tap to continue',W/2,Y+h-18,12,'#6a5a3a','center',UI,800);}
 // ------------------------------------------------------------ the course picker (Arcade)
 function drawMenu(){menuHits=[];W=s.W;H=s.H;
  const bg=SP.picture('title-bg');if(bg){const sc=Math.max(W/bg.width,H/bg.height);x.drawImage(bg,(W-bg.width*sc)/2,(H-bg.height*sc)/2,bg.width*sc,bg.height*sc);}
  else{const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#7cc8ff');g.addColorStop(.55,'#c8ecff');g.addColorStop(.56,'#4fb04a');g.addColorStop(1,'#2d6e2a');x.fillStyle=g;x.fillRect(0,0,W,H);
   x.fillStyle='rgba(255,255,255,.8)';for(const [cx,cy,r] of [[.2,.12,.06],[.27,.1,.045],[.75,.18,.05],[.82,.16,.04]]){x.beginPath();x.arc(cx*W,cy*H,r*Math.max(W,H),0,7);x.fill();}
   R.drawProp(x,'oak',W*.1,H*.6,W*.22,{});R.drawProp(x,'pine',W*.9,H*.6,W*.14,{});R.drawProp(x,'flag',W*.72,H*.62,W*.06,{t:T});}
  x.fillStyle='rgba(0,0,0,.25)';x.fillRect(0,0,W,H);
  const logo=SP.picture('logo'),lw=Math.min(W*.9,560);let y=Math.max(fb.top+10,H*.05);
  if(logo){const lh=lw*logo.height/logo.width;x.drawImage(logo,(W-lw)/2,y,lw,lh);y+=lh+6;}
  else{const fs=fitText('SITABOUT',clamp(W*.15,40,110),lw,FONT,400);x.font=`400 ${Math.round(fs)}px ${FONT}`;x.textAlign='center';x.textBaseline='top';x.lineJoin='round';x.lineWidth=fs*.16;x.strokeStyle='#0b3d1a';x.strokeText('SITABOUT',W/2,y);const g=x.createLinearGradient(0,y,0,y+fs);g.addColorStop(0,'#fff59a');g.addColorStop(1,'#ffb21f');x.fillStyle=g;x.fillText('SITABOUT',W/2,y);y+=fs*.92;
   const f2=fs*.42;x.font=`400 ${Math.round(f2)}px ${FONT}`;x.lineWidth=f2*.2;x.strokeText('MINI GOLF',W/2,y);x.fillStyle='#fff';x.fillText('MINI GOLF',W/2,y);y+=f2*1.15;x.textBaseline='middle';
   text('the couch-potato cousin of Walkabout Mini Golf',W/2,y+6,clamp(W*.03,10,14),'rgba(255,255,255,.9)','center',UI,800);y+=24;}
  const sv=saved(),opts=variant?[courseById(variant)]:[...COURSES,{id:'tour',name:'The Grand Tour',ref:'All 18 holes',tag:'Bushwood, Waterbury and Spaceball City back to back.',look:{turf:'#ffd23f'}}];
  const wide=W>H*1.1,cols=wide?opts.length:Math.min(2,opts.length),cw=Math.min((W-24-(cols-1)*10)/cols,wide?260:300),chh=Math.min(wide?H*.34:H*.2,170),rows=Math.ceil(opts.length/cols);
  const gx=(W-(cols*cw+(cols-1)*10))/2;
  opts.forEach((o,i)=>{const cx=gx+(i%cols)*(cw+10),cy=y+Math.floor(i/cols)*(chh+10),sel=menu.c===o.id;
   x.save();x.beginPath();x.roundRect(cx,cy,cw,chh,14);x.clip();const art=SP.picture(o.id+'-card');if(art){const sc=Math.max(cw/art.width,chh/art.height);x.drawImage(art,cx+(cw-art.width*sc)/2,cy+(chh-art.height*sc)/2,art.width*sc,art.height*sc);}
   else{const g=x.createLinearGradient(cx,cy,cx,cy+chh);const L=o.look;g.addColorStop(0,o.id==='spaceballs'?'#1a1050':o.id==='tour'?'#c0392b':'#7cc8ff');g.addColorStop(1,L.turf||'#4fae46');x.fillStyle=g;x.fillRect(cx,cy,cw,chh);
    const ic={bushwood:'oak',gilmore:'palm',spaceballs:'crystal',tour:'flag'}[o.id];R.drawProp(x,ic,cx+cw*.82,cy+chh*.95,chh*.5,{t:T});if(o.id==='gilmore')R.drawProp(x,'castle',cx+cw*.6,cy+chh*.95,chh*.42,{});if(o.id==='bushwood')R.drawProp(x,'cart',cx+cw*.6,cy+chh*.95,chh*.42,{});if(o.id==='spaceballs')R.drawProp(x,'dish',cx+cw*.62,cy+chh*.95,chh*.36,{});}
   const g2=x.createLinearGradient(0,cy,0,cy+chh);g2.addColorStop(0,'rgba(0,0,0,.65)');g2.addColorStop(.6,'rgba(0,0,0,.1)');x.fillStyle=g2;x.fillRect(cx,cy,cw,chh);x.restore();
   x.strokeStyle=sel?'#ffd23f':'rgba(255,255,255,.35)';x.lineWidth=sel?4:2;x.beginPath();x.roundRect(cx,cy,cw,chh,14);x.stroke();
   text(o.name.toUpperCase(),cx+12,cy+20,fitText(o.name.toUpperCase(),clamp(cw*.085,13,22),cw-24,FONT,400),'#fff','left',FONT,400);text(o.ref,cx+12,cy+40,11,'#ffd23f','left',UI,800);
   const best=o.id==='tour'?sv.best?.['tour-18']:sv.best?.[o.id+'-6'];text(best?`best 6: ${best}`:(o.tag||'').slice(0,40),cx+12,cy+56,10,'rgba(255,255,255,.85)','left',UI,700);
   menuHits.push({x:cx,y:cy,w:cw,h:chh,f:()=>{menu.c=o.id;}});});
  y+=rows*(chh+10)+4;
  if(menu.c!=='tour'){const lens=[3,6],bw=Math.min(130,(W-40)/2);lens.forEach((n,i)=>{const bx=W/2-(lens.length*bw+(lens.length-1)*10)/2+i*(bw+10),sel=menu.n===n;pill(bx,y,bw,38,sel?'#ffd23f':'rgba(0,0,0,.55)','rgba(255,255,255,.4)');text(n===3?'FRONT 3':'ALL 6 HOLES',bx+bw/2,y+19,14,sel?'#1a1a1a':'#fff','center');menuHits.push({x:bx,y,w:bw,h:38,f:()=>{menu.n=n;}});});y+=48;}
  const gw=Math.min(W*.7,320),gh=Math.min(64,H*.09),gx2=(W-gw)/2,gy=Math.min(y+6,H-gh-40);pill(gx2,gy,gw,gh,'#2fbf4a','#fff');text('TEE OFF',W/2,gy+gh/2,gh*.48,'#fff','center',FONT,400);
  menuHits.push({x:gx2,y:gy,w:gw,h:gh,f:()=>{if(menu.go){const g=menu.go;menu.go=null;snd.putt(.6);g();}}});
  const lostN=(sv.lost||[]).length;text(`Lost balls found: ${lostN}/18   ·   Aces: ${sv.aces||0}`,W/2,Math.min(H-18,gy+gh+22),12,'rgba(255,255,255,.85)','center',UI,800);
 }
 function drawMenuWait(){x.fillStyle='#0b1a10';x.fillRect(0,0,W,H);text(`${s.players[0].name} is picking the course…`,W/2,H/2,clamp(W*.045,14,20),'#fff','center');}
 // ------------------------------------------------------------ online: the other phone's shots
 let gotSetup=null,netGone=false;
 if(net)void (async()=>{const wait=f=>(async()=>{while(s.alive&&!f())await new Promise(r=>setTimeout(r,40));})();for(;;){const m=await net.next();if(!m||!s.alive){netGone=true;return;}
  if(m.setup&&typeof m.setup==='object'){const v=m.setup;if((v.c==='tour'||COURSES.some(c=>c.id===v.c))&&Number.isInteger(v.n)&&v.n>0&&v.n<=18)gotSetup={c:v.c,n:v.n,st:Number.isInteger(v.st)?v.st:0};continue;}
  if(Array.isArray(m.sh)){await wait(()=>phase==='aim'&&!human(turn));if(!s.alive)return;const [vx,vy,t0,hp]=m.sh;if(!Number.isFinite(vx)||!Number.isFinite(vy))continue;if(Number.isFinite(t0))T=t0;fire(vx,vy,hp===1,true);}
  else if(Array.isArray(m.fin)){await wait(()=>phase==='fin'&&waitFin);if(!s.alive)return;const {bb}=waitFin,[fx0,fy0,fz0,k,n]=m.fin;waitFin=null;const b=bb.b;
   if(k!=='splash'&&k!=='ob'&&k!=='chomp'){b.x=+fx0;b.y=+fy0;b.z=+fz0;}if(Number.isFinite(n))bb.strokes=n;b.vx=b.vy=0;settle(k,bb);}}})();
 // ------------------------------------------------------------ test hooks
 s.debug={engine:'minigolf',get phase(){return phase;},get hole(){return hole?.key;},get hi(){return hi;},get turn(){return turn;},get balls(){return balls;},get cards(){return cards;},get T(){return T;},
  pick(cid,n){menu.c=cid;menu.n=n||menu.n;menu.go&&menu.go();},skipIntro(){flyT=99;},go(i){startHole(i);},place(x0,y0){const bb=balls[turn];Object.assign(bb.b,P.newBall(x0,y0,C));},fire(vx,vy){fire(vx,vy,false,false);},aimAt(sx,sy,ex,ey){aim={id:-1,sx,sy,x:ex,y:ey,t0:performance.now()};},
  // one good shot for whoever is up (tests / online bot); returns a word when it acts
  shoot(skill=.8){if(phase!=='aim')return '';const bb=balls[turn],r=CPU.planNow(C,{x:bb.b.x,y:bb.b.y,z:bb.b.z},T,{skill,fine:false}),v=r.p*VMAX;fire(Math.cos(r.a)*v,Math.sin(r.a)*v,false,false);return 'shot';},
  get bot(){return ()=>{if(phase==='menu'&&menu.go){menu.go();return 'menu';}if(phase==='intro'){flyT=99;return 'skip';}if(phase==='card'&&scoreUI&&cardT>.8){scoreUI.next();return 'card';}if(phase==='aim'&&myTurn())return s.debug.shoot(.6);return '';};},
  state(){return {phase,hole:hole?.key,turn,strokes:balls.map(b=>b.strokes),cards,points:plan?pointsNow():[0,0]};}};
 // ------------------------------------------------------------ main loop
 s.frame(dt=>{
  W=s.W;H=s.H;x.setTransform(1,0,0,1,0,0);
  if(phase==='menu'){T+=dt;drawMenu();return;}
  if(phase==='menu-wait'){drawMenuWait();return;}
  if(!hole)return;
  if(phase!=='fin'&&phase!=='roll')T+=dt;
  for(const m of moods)if(m.t<90){m.t-=dt;if(m.t<=0)m.m='normal';}
  if(phase==='intro'){flyT+=dt;if(flyT>3.1){beginTurn();}}
  if(phase==='card')cardT+=dt;
  if(cpu)stepCpu();
  physics(dt);
  for(const bb of balls){if(bb.b.rest&&!bb.done&&phase!=='roll')R.settleOrient(bb.orient,dt,cam.rot);if(bb.done)bb.sinkT=(bb.sinkT||0)+dt;}
  stepFx(dt);stepCam(dt);snd.ambience(dt,course.id);
  drawWorld();
  if(phase==='aim')drawAim();
  drawHUD();drawCallout(dt);
  if(phase==='intro')drawIntroCard();
  if(phase==='card')drawCard(false);
  if(phase==='over')drawCard(true);
 });
 plan=await chooseRound();if(!plan||!s.alive)return;
 cards=[[],[]];startHole(0);
}
Object.assign(exports,{minigolf});
