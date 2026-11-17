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
const {createGL}=require("src/engines/minigolf/glLayer.js");
const {createBench,deviceInfo,saveJSON}=require("src/engines/minigolf/diag.js");
const {VERSION}=require("src/version.js");
const CPU=require("src/engines/minigolf/cpu.js");
const {createSound}=require("src/engines/minigolf/sound.js");
const SP=require("src/data/minigolfSprites.js");
const {faceSprite}=require("src/headFacts.js");

const COL=['#3aa8ff','#ff5a8a'],VMAX=CPU.VMAX,FONT='"SC Bangers","Impact","Arial Black",sans-serif',UI='"SC Nunito","Arial Rounded MT Bold",Arial,sans-serif';
const NAMES={'-4':'CONDOR!!','-3':'ALBATROSS!','-2':'EAGLE!','-1':'BIRDIE!','0':'PAR','1':'BOGEY','2':'DOUBLE BOGEY','3':'TRIPLE BOGEY'};
const limitOf=h=>h.par+3;           // most strokes on a hole; not holed by then = picked up, scored par+4
const ptsOf=(h,n)=>30*(h.par+4-n);  // points (higher = better) for the launcher; only strokes count

async function minigolf(s){
 const [c,x0]=s.canvas(720,1280,{fill:true});let x=x0;const fb=fullBleed(s,{bg:'#0b1a10'});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud?.(true,true);
 SP.preloadMinigolf();
 // the WebGL layer under the canvas: everything painted once per hole goes to the graphics chip once (glLayer.js);
 // localStorage sc-mg-gl = '0' keeps it all on the 2D canvas (the old way), e.g. to compare on a phone
 let glx=(()=>{try{if(localStorage.getItem('sc-mg-gl')==='0')return null;}catch{}return createGL(c);})();R.setGL(glx);
 s.cleanup(()=>{R.setGL(null);if(glx)glx.destroy();glx=null;});
 const net=isOnline(s)?s.online:null,me=net?net.me:-1,cpu=isCpu(s),snd=createSound();if(net)s.hotseat=true;s.cleanup(()=>{snd.stop();R.freeHole(C);});
 const board=!store.arcade,np=2,human=i=>!(cpu&&i===1)&&!(net&&i!==me);
 const variant=s.game?.id==='caddyshack-golf'?'bushwood':null;
 s.hint('Drag back from anywhere and let go: the dotted line shows where the ball starts and its first bounce, the ring the power. Pull all the way into the red for a wild Happy Gilmore drive. Pinch or use two fingers to look around; the eye button shows the whole hole. The player farther from the cup putts next. Sand slows you, water and falling off cost a stroke. Find the hidden lost ball on every hole.');
 // ------------------------------------------------------------ state
 let phase='loading',W=s.W,H=s.H,T=0,cam={x:30,y:60,k:6,rot:0},tcam=null,hole=null,C=null,course=null,plan=null,hi=0,turn=0,balls=[],cards=[[],[]],honor=0;
 let aim=null,callout=null,fx=[],hits={},flyT=0,camMode='auto',manual=null,pinch=null,cpuJob=null,waitFin=null,lie=null,overview=false,scoreUI=null,menu={c:variant||'bushwood',n:board?3:6},menuHits=[],cardT=0,lostFound={},done=false;
 const moods=[{m:'normal',t:0},{m:'normal',t:0}],mood=(i,m,sec=1.6)=>{moods[i]={m,t:sec};if(m==='win')s.react?.(i,'happy',sec);else if(m==='sad'||m==='angry')s.react?.(i,'sad',sec);};
 const prof=()=>{const p=store.profile;if(!p)return null;const v=p.sitabout&&typeof p.sitabout==='object'?p.sitabout:{};p.sitabout={best:{...(v.best||{})},holes:{...(v.holes||{})},aces:+v.aces||0,lost:Array.isArray(v.lost)?v.lost.slice():[],rounds:+v.rounds||0};return p;};
 const saved=()=>store.profile?.sitabout||{best:{},holes:{},aces:0,lost:[],rounds:0};
 // saving reads, checks and rewrites the whole save (tens of ms on a phone): a sunk ball or a found lost ball only marks
 // it, and it is written while the scorecard is up, at the end of the round, or when the game is left
 let profDirty=false;const saveSoon=()=>{profDirty=true;},flushSave=()=>{if(!profDirty)return;profDirty=false;const p=store.profile;if(p)saveProfile(p);};
 s.cleanup(flushSave);
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
 function tapUI(X,Y){if(pace.meter&&pace.box&&performance.now()-pace.boxT<600&&phase!=='menu'&&phase!=='benchres'){const [bx,by,bw,bh]=pace.box;if(X>=bx&&X<=bx+bw&&Y>=by&&Y<=by+bh){saveLog();return true;}}
  for(const h of uiHits)if(X>=h.x&&X<=h.x+h.w&&Y>=h.y&&Y<=h.y+h.h){h.f();snd.tick();return true;}if(phase==='menu'||phase==='benchres'){for(const h of menuHits)if(X>=h.x&&X<=h.x+h.w&&Y>=h.y&&Y<=h.y+h.h){h.f();snd.tick();return true;}}return false;}
 // ------------------------------------------------------------ the round
 function holesFor(cid,n,st=0){if(cid==='tour')return COURSES.flatMap(c=>c.holes).slice(0,18);const co=courseById(cid);return co.holes.slice(st,st+n);}
 async function chooseRound(){
  if(board){// board: three holes, a random course and side (both phones deal the same from the seed)
   const cid=variant||COURSES[Math.floor(s.random()*COURSES.length)].id,st=s.random()<.5?0:3;return {cid,list:holesFor(cid,3,st)};}
  if(net&&me!==0){phase='menu-wait';while(s.alive&&!gotSetup&&!netGone)await new Promise(r=>setTimeout(r,60));if(!gotSetup)return null;const {c:cid,n,st}=gotSetup;return {cid,list:holesFor(cid,n,st)};}
  await loadPictures(SP.MENU_PICTURES,10000);if(!s.alive)return null;
  phase='menu';await new Promise(res=>{menu.go=res;if(menu.auto){menu.auto=false;menu.go=null;res();}});
  const r={cid:menu.c,list:holesFor(menu.c,menu.c==='tour'?18:menu.n,0)};if(net)net.send({setup:{c:menu.c,n:r.list.length,st:0}});return r;
 }
 // ------------------------------------------------------------ holes
 // a hole is turned (tee on the left) when that fits the screen better, but never one with a set piece built to face
 // the tee (windmill, clown head): those are pictures standing up toward the camera, so turned they'd sit sideways
 function rotFor(h,c){const facing=(h.movers||[]).some(m=>m.kind==='windmill')||(h.blocks||[]).some(b=>b.look==='clown');
  return !facing&&((W>H*1.1)!==((c.bbox[2]-c.bbox[0])>(c.bbox[3]-c.bbox[1])))?1:0;}
 // A hole is painted before it is shown: the first one on the loading screen, every next one while the scorecard of the
 // one before is up (P.compile keeps one C per hole, so the caches painted here are the ones the hole is drawn from).
 // Painting it during the flyover (and the first frames' one-time setup) was what made the start of every hole chug.
 let prep=null,warm=false;
 // painting ahead while the scorecard is up only uses what the frame leaves over (its last frames' own work, median),
 // so the card itself keeps its frame rate: 1-6 ms
 function prepBudget(){const fr=pace.half||pace.vs>=10.5?16.7:pace.vs,L=pace.parts.slice(-12).map(o=>(o.world||0)+(o.hud||0)+(o.ui||0)+(o.phys||0)+(o.cpu||0)).sort((a,b)=>a-b),used=L.length?L[L.length>>1]:fr/2;
  return Math.max(1,Math.min(6,fr-used-3));}
 // leaving mid-scorecard: the next hole's caches go too (each hole keeps its C between games)
 s.cleanup(()=>{if(prep&&plan&&plan.list[prep.i]){const pc=P.compile(plan.list[prep.i]);if(pc!==C)R.freeHole(pc);}});
 function prepStep(i,ms){if(!plan||i>=plan.list.length)return 1;const h=plan.list[i],c=P.compile(h),rot=rotFor(h,c),kc=kCeil();
  if(!prep||prep.i!==i)prep={i,done:0};if(prep.done>=1&&prep.rot===rot&&prep.kc===kc)return 1;prep.rot=rot;prep.kc=kc;
  const t0=performance.now();P.cupField(c);// who is away: worked out once per hole, 3-50 ms (it used to land mid-hole)
  prep.done=R.prepareHole(c,courseById(h.course),rot,kc,t0+ms);return prep.done;}
 function startHole(i){hi=i;hole=plan.list[i];course=courseById(hole.course);const next=P.compile(hole);if(C&&C!==next)R.freeHole(C);
  if(prep&&prep.i!==i){const pc=plan.list[prep.i]&&P.compile(plan.list[prep.i]);if(pc&&pc!==next)R.freeHole(pc);prep=null;}C=next;T=0;fx=[];hits={};overview=false;camMode='auto';manual=null;
  cam.rot=rotFor(hole,C);
  balls=[0,1].map(pi=>{const b=P.newBall(hole.tee[0]+(pi?1.6:-1.6),hole.tee[1],C);b.rest=true;return {b,i:pi,col:COL[pi],strokes:0,done:false,picked:false,orient:R.newOrient(cam.rot),face:faceFn(pi),lie:{x:b.x,y:b.y,z:b.z},vis:1.3,cup:hole.cup};});
  phase='intro';flyT=0;const f=frame('overview');cam={...f,rot:cam.rot};tcam=null;callout=null;
  snd.ambience(0,course.id);}
 // the face is made at sizes in ~12% steps and scaled to the exact size (the ball changes size with every zoom step of the
 // camera, and a new face picture per pixel of size was a fresh canvas almost every frame of a roll)
 function faceFn(i){return (g,cx,cy,size)=>{const id=s.players[i]?.character,m=moods[i].m,fw=size*.78,q=Math.pow(2,Math.ceil(Math.log2(Math.max(4,fw))*6)/6),sp=id&&faceSprite(id,m,q,1);if(sp){const k=fw/q;g.drawImage(sp.cv,cx+sp.x*k,cy+sp.y*k,sp.cv.width*k,sp.cv.height*k);}else s.sprite(g,i,cx,cy,size,{exact:true,mood:m,noBadge:true,still:true});};}
 // who putts: on the tee the honour (best last hole), then whoever is away (farther from the cup along the greens)
 function nextPlayer(){const live=balls.filter(b=>!b.done);if(!live.length)return -1;if(live.length===1)return live[0].i;
  const a=balls[0],b=balls[1];if(a.strokes===0&&b.strokes===0)return honor;if(a.strokes===0)return 0;if(b.strokes===0)return 1;
  const f=P.cupField(C),da=f(a.b.x,a.b.y)+(f(a.b.x,a.b.y)>=999?Math.hypot(a.b.x-hole.cup[0],a.b.y-hole.cup[1]):0),db=f(b.b.x,b.b.y)+(f(b.b.x,b.b.y)>=999?Math.hypot(b.b.x-hole.cup[0],b.b.y-hole.cup[1]):0);
  if(Math.abs(da-db)<.5)return a.strokes<=b.strokes?0:1;return da>db?0:1;}
 function beginTurn(){const n=nextPlayer();if(n<0){endHole();return;}turn=n;phase='aim';camMode='auto';manual=null;aim=null;
  for(const bb of balls)bb.glow=bb.i===turn;mood(turn,'think',99);
  say(`${s.players[turn].name.toUpperCase()}${s.players[turn].name.endsWith('s')?"'":"'S"} SHOT`,`stroke ${balls[turn].strokes+1} · par ${hole.par}`,1.1,'turn');
  if(cpu&&turn===1)startCpu();}
 // The CPU golfer thinks on its own thread when the phone allows it: a Worker built from the physics + CPU modules' own source
 // (require.src), so it plays exactly the shots the in-frame planner would. It used to think 7-9 ms of every frame while
 // lining up, which on a phone pushed frames past 16.7 ms for seconds. No Worker, or one that fails = the old in-frame planner.
 let planner=null,planId=0;
 function makePlanner(){if(planner!==null)return planner;planner=false;
  try{const ids=['src/engines/minigolf/physics.js','src/engines/minigolf/cpu.js'],src=typeof require.src==='function'?ids.map(id=>require.src(id)):[];
   if(typeof Worker==='undefined'||typeof Blob==='undefined'||src.length!==ids.length||src.some(t=>!t))return planner;
   const code="'use strict';const modules={"+ids.map((id,i)=>JSON.stringify(id)+':'+src[i]).join(',')+"};const cache={};function require(id){if(cache[id])return cache[id];const exports=cache[id]={};modules[id](exports,require);return exports;}"+
    "const P=require("+JSON.stringify(ids[0])+"),CPU=require("+JSON.stringify(ids[1])+"),HOLES=new Map();"+
    "onmessage=e=>{const m=e.data;try{let C=HOLES.get(m.key);if(!C){C=P.compile(m.hole);HOLES.set(m.key,C);}const r=CPU.planNow(C,m.lie,m.T0,m.opts);postMessage({id:m.id,a:r.a,p:r.p});}catch(err){postMessage({id:m.id,err:String(err&&err.message||err)});}};";
   const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'})),w=new Worker(url);setTimeout(()=>URL.revokeObjectURL(url),10000);
   const giveUp=()=>{const j=cpuJob;if(j&&j.worker&&!j.res)j.worker=false;};// back to the in-frame planner for this shot
   w.onmessage=e=>{const m=e.data,j=cpuJob;if(!j||j.id!==m.id)return;if(m.err){giveUp();return;}j.res={a:m.a,p:m.p};};
   w.onerror=ev=>{ev.preventDefault?.();planner=false;giveUp();try{w.terminate();}catch{}};
   s.cleanup(()=>{try{w.terminate();}catch{}});planner=w;}catch{planner=false;}
  return planner;}
 const plainHole=h=>{const o={};for(const k of Object.keys(h))if(k[0]!=='_')o[k]=h[k];return o;};
 function startCpu(){const bb=balls[1],tFire=T+1.4+Math.random()*.4,skill=cpuSkill(s),lie={x:bb.b.x,y:bb.b.y,z:bb.b.z},opts={skill,fine:skill>.5};
  const j=cpuJob={id:++planId,lie,tFire,opts,gen:null,res:null,skill,worker:false},w=makePlanner();
  if(w){try{w.postMessage({id:j.id,key:hole.key,hole:plainHole(hole),lie,T0:tFire,opts});j.worker=true;}catch{j.worker=false;}}}
 function stepCpu(){if(!cpuJob||phase!=='aim'||turn!==1)return;const j=cpuJob;if(!j.res){if(j.worker)return;if(!j.gen)j.gen=CPU.plan(C,j.lie,j.tFire,j.opts);
  const t0=performance.now(),ms=pace.vs<10.5&&!pace.half?3:7;while(performance.now()-t0<ms){const r=j.gen.next();if(r.done){j.res=r.value;break;}}if(!j.res)return;}
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
  const p=prof();if(p&&!p.sitabout.lost.includes(hole.key)){p.sitabout.lost.push(hole.key);saveSoon();say('LOST BALL FOUND!',`${p.sitabout.lost.length} of 18 found`,1.8,'good');}else say('LOST BALL!','already in your collection',1.2,'good');}
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
  if(human(bb.i)){const p=prof();if(p){const hs=p.sitabout.holes;if(!(hs[hole.key]<=bb.strokes))hs[hole.key]=bb.strokes;if(ace)p.sitabout.aces++;saveSoon();}}
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
  const p=prof();if(p&&!board&&!net&&plan.list.length>=3){const key=plan.cid+'-'+plan.list.length;for(let i=0;i<2;i++){if(!human(i))continue;const n=strokesNow(i);if(!(p.sitabout.best[key]<=n))p.sitabout.best[key]=n;}p.sitabout.rounds++;profDirty=false;saveProfile(p);}
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
  const a=1-Math.exp(-dt*(phase==='roll'?6:camMode==='manual'?20:3.2));cam.x+=(goal.x-cam.x)*a;cam.y+=(goal.y-cam.y)*a;cam.k+=(goal.k-cam.k)*a;
  // nearly there = there: an easing camera never quite stops, and a still one lets the course drawing copy 1:1
  if(Math.abs(goal.k-cam.k)<cam.k*.004&&Math.abs(goal.x-cam.x)*cam.k<.6&&Math.abs(goal.y-cam.y)*cam.k<.6){cam.x=goal.x;cam.y=goal.y;cam.k=goal.k;}}
 // ------------------------------------------------------------ drawing
 function drawWorld(){
  const parts=C.movers.length?P.moverParts(C,T):{segs:[],hazards:[]};const near=balls.some(bb=>!bb.done&&!bb.hidden&&Math.hypot(bb.b.x-hole.cup[0],bb.b.y-hole.cup[1])<14);
  R.drawHole(x,W,H,cam,{C,course,T,kc:kCeil(),paintMs:(phase==='roll'||phase==='fin'?2:phase==='intro'?7:5)*pace.paintK,parts,fx,hit:hits,trail:phase==='roll'||phase==='fin'?trail:null,balls:balls.filter(bb=>!bb.done||bb.sinkT<.5).map(bb=>({...bb,ghost:phase!=='intro'&&bb.i!==turn&&!bb.done,sinkDip:bb.done&&!bb.picked?Math.min(1,bb.sinkT*3)*2.2:0})),flag:near?.35:1,lost:hole.lost,lostFound:lostFound[hole.key]||saved().lost?.includes(hole.key),prof:pace.cur,cover:phase==='card'||phase==='over'?cardCover(phase==='over'):null});}
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
 // text widths are remembered (measuring text every frame showed up on the phone: callouts and the card measure each frame)
 const TW=new Map();
 function fitText(t,size,maxW,font=UI,weight=900){const k=`${weight}|${Math.round(size)}|${font}|${t}`;let w=TW.get(k);
  if(w===undefined){x.font=`${weight} ${Math.round(size)}px ${font}`;w=x.measureText(t).width;if(TW.size>600)TW.clear();TW.set(k,w);}return w>maxW?size*maxW/w:size;}
 function faceAt(i,cx,cy,size){x.save();x.beginPath();x.arc(cx,cy,size/2,0,7);x.fillStyle='#fff';x.fill();x.clip();balls[i]?.face?balls[i].face(x,cx,cy,size*1.05):faceFn(i)(x,cx,cy,size*1.05);x.restore();x.strokeStyle=COL[i];x.lineWidth=2.5;x.beginPath();x.arc(cx,cy,size/2,0,7);x.stroke();}
 let hudCv=null,hudSig='',hudAt=0;
 function drawHUD(){
  uiHits=[];const top=Math.max(8,(fb.top||0)>0?6:6),rw=Math.max(110,(fb.top?150:0));
  // the plate and the player chips are drawn into their own canvas and only redrawn when something on them changes
  const pw0=Math.min(W-rw-14,300),fs0=clamp(W*.036,12,17),hh=Math.ceil(top+fs0*2.6+8+2*(fs0*2+6)+6),hw=Math.ceil(pw0+16);
  const sig=[W,H,hi,turn,phase==='aim'||phase==='roll'||phase==='fin',balls.map(b=>b?[b.done?1:0,b.picked?1:0,b.strokes].join(':'):'').join(','),cards.map(r=>r.join(':')).join(','),moods.map(m=>m.m).join(','),s.players.map(p=>p.name).join(',')].join('|'),now=performance.now();
  if(!hudCv||sig!==hudSig||now-hudAt>1000){hudSig=sig;hudAt=now;if(!hudCv)hudCv=document.createElement('canvas');x=fresh(hudCv,hw,hh);
   try{
  // hole plate (top-left)
  const pw=Math.min(W-rw-14,300),fs=clamp(W*.036,12,17);pill(8,top,pw,fs*2.6,'rgba(8,20,12,.78)','rgba(255,255,255,.15)');
  text(`HOLE ${hi+1}`,20,top+fs*.85,fs*.8,'#ffd23f');const nm=hole.name.toUpperCase();text(nm,20,top+fs*1.85,fitText(nm,fs*1.05,pw-90,FONT,400),'#fff','left',FONT,400);
  text(`PAR ${hole.par}`,8+pw-14,top+fs*1.3,fs*.95,'#fff','right');
  // player chips under it
  for(let i=0;i<2;i++){const y=top+fs*2.6+8+i*(fs*2+6),w=Math.min(pw,230),act=i===turn&&(phase==='aim'||phase==='roll'||phase==='fin');pill(8,y,w,fs*2,act?'rgba(0,0,0,.72)':'rgba(0,0,0,.45)',act?COL[i]:null);
   faceAt(i,8+fs,y+fs,fs*1.7);const nm2=s.players[i].name+(cpu&&i===1&&!/\(CPU\)\s*$/.test(s.players[i].name)?' (CPU)':'');text(nm2,8+fs*2.2,y+fs,fitText(nm2,fs*.9,w-fs*2.2-70),'#fff');
   const st=balls[i]?.done?(balls[i].picked?'X':String(cards[i][hi])):String(balls[i]?.strokes||0);text(`${st} · ${toPar(i)}`,8+w-10,y+fs,fs*.85,act?'#ffd23f':'#cfd8d0','right');}
   }finally{x=x0;}}
  x.drawImage(hudCv,0,0);
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
  const cy=c0.kind==='turn'?Math.max(fb.top+150,H*.26):H*.36;
  // while it sits still and fully visible (most of its time) it is a picture drawn once; the pop and the fade draw live
  if(pop===1&&a>=1&&c0.kind!=='ace'&&!liveCallout){const fy=cy-Math.floor(cy),k=[c0.t,c0.sub||'',size,c0.kind,W,fy].join('|');
   if(!coC||coC.k!==k){const c=coC?coC.c:document.createElement('canvas'),top=Math.ceil(size*.8),hh=Math.ceil(size*2);c.width=W;c.height=hh;const xs=x;x=c.getContext('2d');try{x.clearRect(0,0,W,hh);calloutText(c0,size,top+fy,1);}finally{x=xs;}coC={c,k,top};}
   x.drawImage(coC.c,0,Math.floor(cy)-coC.top);return;}
  calloutText(c0,size,cy,a);}
 let coC=null,liveCallout=false;
 function calloutText(c0,size,cy,a){x.globalAlpha=a;x.font=`400 ${Math.round(size)}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=Math.max(4,size*.14);x.strokeStyle='rgba(0,0,0,.7)';x.strokeText(c0.t,W/2,cy);
  const col={ace:'#ffd23f',good:'#7dff8a',bad:'#ff6b6b',happy:'#ff4d4d',fx:'#57e1ff',ok:'#ffffff',turn:'#ffffff'}[c0.kind]||'#fff';const g=x.createLinearGradient(0,cy-size/2,0,cy+size/2);g.addColorStop(0,'#fff');g.addColorStop(.55,col);g.addColorStop(1,col);x.fillStyle=c0.kind==='ace'?`hsl(${(T*240)%360},100%,65%)`:g;x.fillText(c0.t,W/2,cy);
  if(c0.sub){const ss=fitText(c0.sub,size*.32,W*.9);x.font=`800 ${Math.round(ss)}px ${UI}`;x.lineWidth=4;x.strokeText(c0.sub,W/2,cy+size*.62);x.fillStyle='#fff';x.fillText(c0.sub,W/2,cy+size*.62);}x.globalAlpha=1;}
 function drawIntroCard(){const t=flyT,a=clamp(Math.min(t*3,(3.1-t)*3),0,1);if(a<=0)return;x.globalAlpha=a;const w=Math.min(W*.92,520),h=Math.min(H*.3,190),X=(W-w)/2,Y=H*.58;
  x.beginPath();x.roundRect(X,Y,w,h*.86,18);x.fillStyle='rgba(6,16,10,.86)';x.fill();x.strokeStyle='rgba(255,210,63,.7)';x.lineWidth=2;x.stroke();if(0)pill(X,Y,w,h*.62,'rgba(6,16,10,.86)','rgba(255,210,63,.7)');x.globalAlpha=a;text(`${course.name.toUpperCase()} · HOLE ${hole.n}`,W/2,Y+h*.12,clamp(w*.034,11,15),'#ffd23f','center');
  text(hole.name.toUpperCase(),W/2,Y+h*.28,fitText(hole.name.toUpperCase(),clamp(w*.09,22,44),w*.9,FONT,400),'#fff','center',FONT,400);text(`PAR ${hole.par}${plan.list.length>1?`  ·  ${hi+1} of ${plan.list.length}`:''}`,W/2,Y+h*.45,clamp(w*.032,11,15),'#cfe','center');
  if(hole.quote){const q=hole.quote;text(q,W/2,Y+h*.66,fitText(q,clamp(w*.03,10,14),w*.94,UI,700),'rgba(255,255,255,.85)','center',UI,700);}
  text('tap to skip',W/2,H-24,12,'rgba(255,255,255,.5)','center',UI,700);x.globalAlpha=1;}
 // the golf scorecard (birdies circled, bogeys boxed, like a real one)
 // a canvas ready to draw on at w x h: same size = cleared and its state reset in place (no new texture), else resized
 function fresh(cv,w,h){if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;return cv.getContext('2d');}const g=cv.getContext('2d');if(g.reset)g.reset();else{cv.width=w;}return g;}
 function cardBox(final){const list=plan.list,n=list.length,rows=n>9?2:1,per=Math.ceil(n/rows);
  const w=Math.min(W*.94,760),cell=Math.min((w-110)/(per+1),46),rowH=Math.min(cell*.9,34),h=rows*rowH*4.3+(final?150:84),X=(W-w)/2,Y=Math.max(fb.top+6,(H-h)/2);
  return {list,n,rows,per,w,cell,rowH,h,X,Y};}
 // the part of the screen the card hides completely (the paper picture is opaque; the drawn stand-in has round corners)
 function cardCover(final){const b=cardBox(final),m=SP.picture('scorecard')?2:16;return [b.X+m,b.Y+m,b.X+b.w-m,b.Y+b.h-m];}
 // The scorecard is painted into its own screen-size canvas and only repainted when something on it changes (about 60
 // text draws and the 2048 px paper picture every frame made every hole's card slow on a phone); a frame draws it once.
 let cardCv=null,cardKey='',cardMoods='',cardFor='';
 // the paper picture drawn once per screen size into its own screen-size layer (drawing the 2048 px picture was most of a
 // card's first frame); the card copies it 1:1, so it looks exactly as before. Made on the loading screen.
 const paperL=[null,null];
 function paperLayer(final){const img=SP.picture('scorecard');if(!img)return null;const b=cardBox(final),k=[W,H,fb.top,b.X,b.Y,b.w,b.h,SP.version()].join('|'),i=final?1:0;let L=paperL[i];
  if(!L||L.k!==k){const c=L?L.c:document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.clearRect(0,0,W,H);g.drawImage(img,b.X,b.Y,b.w,b.h);L=paperL[i]={c,k};}return L.c;}
 function drawCard(final){x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,0,W,H);
  // faces keep the mood they had when the card came up (a face easing back to normal used to repaint the whole card)
  if(cardFor!==phase+hi){cardFor=phase+hi;cardMoods=moods.map(m=>m.m).join(',');}
  const key=[W,H,final?1:0,hi,fb.top,cards.map(r=>r.join(':')).join(','),cardMoods,s.players.map(p=>p.name+'/'+(p.character||'')).join(','),SP.version()].join('|');
  if(!cardCv||key!==cardKey){cardKey=key;if(!cardCv)cardCv=document.createElement('canvas');const x0=x;x=fresh(cardCv,W,H);try{paintCard(final);}finally{x=x0;}}
  x.drawImage(cardCv,0,0);}
 function paintCard(final){const {list,n,rows,per,w,cell,rowH,h,X,Y}=cardBox(final);
  const paper=paperLayer(final);if(paper)x.drawImage(paper,0,0);else{x.fillStyle='#f6f0dc';x.beginPath();x.roundRect(X,Y,w,h,14);x.fill();x.strokeStyle='#c9b98a';x.lineWidth=2;x.stroke();}
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
 // pictures arrive the first time the game opens (and decode a moment after): wait for what the next screen shows rather
 // than flash the drawn stand-ins (a slow phone/network still gets in after ms)
 let loadP={n:0,of:0};
 async function loadPictures(names,ms){phase='loading';loadP={n:0,of:0};await SP.readyMinigolf(names,ms,(n,of)=>{loadP={n,of};});}
 function drawLoading(){x.fillStyle='#0b1a10';x.fillRect(0,0,W,H);const bw=Math.min(W*.6,280),bx=(W-bw)/2,by=H*.55;
  text('SITABOUT',W/2,H*.42,clamp(W*.11,30,64),'#ffd23f','center',FONT,400);text('MINI GOLF',W/2,H*.42+clamp(W*.07,22,40),clamp(W*.045,14,24),'#fff','center',FONT,400);
  pill(bx,by,bw,10,'rgba(255,255,255,.15)');if(loadP.of)pill(bx,by,Math.max(10,bw*loadP.n/loadP.of),10,'#2fbf4a');text('mowing the greens…',W/2,by+30,clamp(W*.032,11,14),'rgba(255,255,255,.75)','center',UI,800);}
 // the picker never changes while it sits there, so it is drawn once into its own canvas (the 4K backdrop used to be
 // scaled down every frame); drawn live only while a picture is missing (its stand-in flag waves)
 let menuCv=null,menuSig='';
 function drawMenuCached(){W=s.W;H=s.H;const ready=SP.MENU_PICTURES.every(n=>!SP.has(n)||SP.picture(n));
  if(!ready){drawMenu();return;}
  const sig=[W,H,menu.c,menu.n,SP.version(),fb.top,pace.meter].join('|');
  if(!menuCv||sig!==menuSig){menuSig=sig;if(!menuCv)menuCv=document.createElement('canvas');menuCv.width=W;menuCv.height=H;x=menuCv.getContext('2d');try{drawMenu();}finally{x=x0;}}
  x.drawImage(menuCv,0,0);}
 function drawMenu(){menuHits=[];W=s.W;H=s.H;
  const bg=SP.picture('title-bg');if(bg){const sc=Math.max(W/bg.width,H/bg.height),bw=bg.width*sc,bh=bg.height*sc,f=SP.PICTURES['title-bg'].focus||[.5,.5];x.drawImage(bg,clamp(W/2-f[0]*bw,W-bw,0),clamp(H/2-f[1]*bh,H-bh,0),bw,bh);}
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
  {const fs=clamp(W*.03,11,14),bw=fs*7.4,bh=fs*2.3,bx=10,by=H-bh-10;pill(bx,by,bw,bh,pace.meter?'rgba(255,210,63,.9)':'rgba(0,0,0,.5)','rgba(255,255,255,.3)');
   text(pace.meter?'FPS METER ON':'FPS METER',bx+bw/2,by+bh/2,fs*.82,pace.meter?'#000':'#fff','center');menuHits.push({x:bx,y:by,w:bw,h:bh,f:()=>{pace.meter=!pace.meter;try{localStorage.setItem('sc-mg-fps',pace.meter?'1':'');}catch{}}});
   if(!net){const b2=bx+bw+8;pill(b2,by,bw,bh,'rgba(0,0,0,.5)','rgba(255,255,255,.3)');text('SPEED TEST',b2+bw/2,by+bh/2,fs*.82,'#fff','center');menuHits.push({x:b2,y:by,w:bw,h:bh,f:()=>startBench()});}}
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
 s.debug={engine:'minigolf',get flog(){return {cols:FLOG_COLS,rows:flog.rows,events:flog.ev};},get bench(){return lastBench;},say(t,sub,sec,kind){say(t,sub,sec,kind);},set liveCallout(v){liveCallout=!!v;},startBench(){startBench();},get phase(){return phase;},get hole(){return hole?.key;},get hi(){return hi;},get turn(){return turn;},get balls(){return balls;},get cards(){return cards;},get T(){return T;},gfx(){return R.cacheStats(C);},planCheck(lie,T0,skill=.6){const w=makePlanner(),opts={skill,fine:skill>.5},m=CPU.planNow(C,lie,T0,opts);if(!w)return Promise.resolve({main:[m.a,m.p],worker:null});const id=-(++planId);
   return new Promise(res=>{const on=e=>{if(e.data.id!==id)return;w.removeEventListener('message',on);res({main:[m.a,m.p],worker:[e.data.a,e.data.p],err:e.data.err||null});};w.addEventListener('message',on);w.postMessage({id,key:hole.key,hole:plainHole(hole),lie,T0,opts});});},
  get planner(){return planner?'worker':planner===false?'frame':'none';},pace(){const now=performance.now();return {fps:pace.win.filter(w=>now-w[0]<1000).length,vs:pace.vs,paintK:pace.paintK};},
  pick(cid,n){menu.c=cid;menu.n=n||menu.n;if(menu.go)menu.go();else menu.auto=true;},skipIntro(){flyT=99;},go(i){startHole(i);},place(x0,y0){const bb=balls[turn];Object.assign(bb.b,P.newBall(x0,y0,C));},fire(vx,vy){fire(vx,vy,false,false);},aimAt(sx,sy,ex,ey){aim={id:-1,sx,sy,x:ex,y:ey,t0:performance.now()};},
  // one good shot for whoever is up (tests / online bot); returns a word when it acts
  shoot(skill=.8){if(phase!=='aim')return '';const bb=balls[turn],r=CPU.planNow(C,{x:bb.b.x,y:bb.b.y,z:bb.b.z},T,{skill,fine:false}),v=r.p*VMAX;fire(Math.cos(r.a)*v,Math.sin(r.a)*v,false,false);return 'shot';},
  get bot(){return ()=>{if(phase==='loading')return '';if(phase==='menu'&&menu.go){menu.go();return 'menu';}if(phase==='intro'){flyT=99;return 'skip';}if(phase==='card'&&scoreUI&&cardT>.8){scoreUI.next();return 'card';}if(phase==='aim'&&myTurn())return s.debug.shoot(.6);return '';};},
  state(){return {phase,hole:hole?.key,turn,strokes:balls.map(b=>b.strokes),cards,points:plan?pointsNow():[0,0]};}};
 // ------------------------------------------------------------ frame pacing + the FPS meter (toggle on the course picker)
 const pace={last0:0,ivs:[],n:0,vs:16.7,lastDraw:0,acc:0,slowT:0,paintK:1,half:false,halfUntil:0,hold:4000,miss:[],meter:(()=>{try{return !!localStorage.getItem('sc-mg-fps');}catch{return false;}})(),
  win:[],jsWin:[],cur:{},parts:[],shown:null,part(o){this.parts.push(o);if(this.parts.length>90)this.parts.shift();},frame(g){this.win.push([performance.now(),g]);if(this.win.length>400)this.win.splice(0,200);},js(ms){this.jsWin.push(ms);if(this.jsWin.length>400)this.jsWin.splice(0,200);}};
 function drawMeter(){const now=performance.now();while(pace.win.length&&now-pace.win[0][0]>1000)pace.win.shift();if(pace.jsWin.length>pace.win.length)pace.jsWin.splice(0,pace.jsWin.length-pace.win.length);
  if(!pace.shown||now-pace.shown.at>500){const g=pace.win.map(w=>w[1]),j=[...pace.jsWin].sort((a,b)=>a-b);pace.shown={at:now,fps:pace.win.length,worst:g.length?Math.max(...g):0,miss:g.filter(v=>v>24).length,
   js:j.length?j[Math.floor(j.length/2)]:0,js9:j.length?j[Math.floor(j.length*.9)]:0,hz:Math.round(1000/pace.vs),gfx:R.cacheStats(C)};
   const med=k=>{const v=pace.parts.map(o=>o[k]||0).sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:0;},f=v=>v<10?v.toFixed(1):v.toFixed(0);
   pace.shown.split=[`world ${f(med('world'))}: ground ${f(med('ground'))} things ${f(med('things'))} (${Math.round(med('n'))})`,
    `hud ${f(med('hud'))} ui ${f(med('ui'))} phys ${f(med('phys'))} cpu ${f(med('cpu'))}${planner?'*':''} prep ${f(med('prep'))}`];}
  const m=pace.shown,fs=11,lines=[`${m.fps} fps  (screen ${m.hz} Hz${pace.half?', held at 60':''})`,`worst gap ${m.worst.toFixed(0)} ms · missed ${m.miss}`,`frame work ${m.js.toFixed(1)} / ${m.js9.toFixed(1)} ms`,`ground ${m.gfx.todo?m.gfx.todo+' to paint':'ready'} · ${(m.gfx.pages||0)+(m.gfx.atlas||0)} sheets · ${glx?'GPU '+Math.round(glx.bytes/1048576)+' MB':'2D'}`,...(m.split||[])];
  x.setTransform(1,0,0,1,0,0);x.font=`700 ${fs}px monospace`;const w=Math.min(W-16,Math.max(170,...lines.map(l=>x.measureText(l).width+12))),h=lines.length*14+8,X=W-w-8,Y=H-h-8;pace.box=[X,Y,w,h];pace.boxT=performance.now();x.fillStyle='rgba(0,0,0,.7)';x.fillRect(X,Y,w,h);x.textAlign='left';x.textBaseline='top';
  lines.forEach((l,i)=>{x.fillStyle=i===0?(m.fps>=55?'#7dff8a':m.fps>=40?'#ffd23f':'#ff6b6b'):'#fff';x.fillText(l,X+6,Y+5+i*14);});
  x.fillStyle='rgba(255,255,255,.55)';x.font=`700 ${fs-1}px monospace`;x.textAlign='right';x.fillText('tap: save log',X+w-6,Y-12);}
 // ------------------------------------------------------------ frame log + speed test (diag.js): the phone's own numbers
 // The last ~60 s of frames are always kept; tapping the FPS meter saves them (with the phone's details and the last speed
 // test) as a file in Downloads to send for diagnosis. SPEED TEST on the course picker runs ~15 s of drawing tests.
 const FLOG_COLS=['t','gap','work','prep','cpu','phys','world','ground','things','n','ui','hud','phase','hole','zoom','up','upKB','occ'];
 const PHASES=['loading','menu','menu-wait','intro','aim','roll','fin','card','over','bench','benchres','sunk','wait','penalty'];
 const flog={rows:[],ev:[],t0:performance.now(),up:0,upB:0};let bench=null,lastBench=null,benchMsg='';
 function logEv(kind,o){flog.ev.push({t:Math.round(performance.now()-flog.t0),kind,...(o||{})});if(flog.ev.length>400)flog.ev.splice(0,100);}
 function logFrame(gap,work,PC){const g=glx,up=g?g.uploads-flog.up:0,ub=g?g.upBytes-flog.upB:0;if(g){flog.up=g.uploads;flog.upB=g.upBytes;}const f=v=>Math.round((v||0)*100)/100;
  flog.rows.push([Math.round(performance.now()-flog.t0),Math.round(gap*10)/10,f(work),f(PC.prep),f(PC.cpu),f(PC.phys),f(PC.world),f(PC.ground),f(PC.things),PC.n||0,f(PC.ui),f(PC.hud),PHASES.indexOf(phase),hi,Math.round(cam.k/(kCeil()||1)*1000)/1000,up,Math.round(ub/1024),PC.occ||0]);
  if(flog.rows.length>4000)flog.rows.splice(0,1000);
  if(gap>50)logEv('slow',{gap:Math.round(gap),work:f(work),phase,hole:hole&&hole.key,gfx:C?R.cacheStats(C):null});}
 function infoNow(){return deviceInfo(glx,{v:VERSION,canvas:[W,H],css:[c.clientWidth,c.clientHeight],hz:Math.round(1000/pace.vs),half:pace.half,mode:glx?'gpu':'2d',glMB:glx?Math.round(glx.bytes/1048576):0,course:course&&course.id,hole:hole&&hole.key,gfx:C?R.cacheStats(C):null});}
 function saveLog(){const ok=saveJSON('sitabout-frames',{format:'sitabout-frames',info:infoNow(),bench:lastBench,cols:FLOG_COLS,rows:flog.rows,events:flog.ev});
  if(phase==='benchres')benchMsg=ok?'Saved to Downloads':'Could not save';else say(ok?'LOG SAVED':'NOT SAVED',ok?'in Downloads':'',2.2,'fx');return ok;}
 function startBench(){bench=createBench({x:x0,get W(){return W;},get H(){return H;},glx});benchMsg='';phase='bench';logEv('bench');}
 function drawBenchLabel(){x0.setTransform(1,0,0,1,0,0);const fs=clamp(W*.035,12,16);x0.fillStyle='rgba(0,0,0,.6)';x0.fillRect(0,Math.max(fb.top,8),W,fs*3.6);
  const xs=x;x=x0;try{text(`SPEED TEST ${bench.index+1}/${bench.total}`,W/2,Math.max(fb.top,8)+fs*1.1,fs,'#ffd23f','center',UI,900);text(bench.name,W/2,Math.max(fb.top,8)+fs*2.5,fs*.85,'#fff','center',UI,800);}finally{x=xs;}}
 function drawBenchRes(){menuHits=[];const xs=x;x=x0;try{x.setTransform(1,0,0,1,0,0);x.fillStyle='#0b1a10';x.fillRect(0,0,W,H);
  const r=lastBench,inf=r.info,fs0=clamp(Math.min(W,H)*.032,10,15);let y=Math.max(fb.top+6,14)+fs0;
  text('SPEED TEST',W/2,y,fs0*1.9,'#ffd23f','center',FONT,400);y+=fs0*2.4;
  // every row fits above the buttons (12 tests + 4 info lines on a sideways phone)
  const lh=Math.min(fs0*1.6,(H-y-Math.min(48,H*.07)-24)/(r.results.length+6.5)),fs=Math.min(fs0,lh/1.35);
  const ua=inf.ua||'',L=[`v${VERSION} · canvas ${W}x${H} · dpr ${inf.dpr} · ${inf.hz||Math.round(1000/pace.vs)} Hz`,`${(ua.match(/Chrome\/[\d.]+/)||['?'])[0]} · ${(ua.match(/Android [\d.]+/)||[''])[0]} · mem ${inf.mem||'?'} GB · ${inf.cores||'?'} cores`,
   `GPU ${(inf.gl&&inf.gl.renderer||'none').slice(0,64)}`,`2D readback ${inf.readback2D} ms · max texture ${inf.gl&&inf.gl.maxTex||'?'}`];
  for(const l of L){text(l,14,y,fitText(l,fs*.9,W-28,UI,800),'rgba(255,255,255,.85)','left',UI,800);y+=lh;}y+=lh*.3;
  const c1=W*.66,c2=W*.82;text('test',14,y,fs,'#ffd23f','left');text('fps',c1,y,fs,'#ffd23f','right');text('ms',c2,y,fs,'#ffd23f','right');text('worst',W-14,y,fs,'#ffd23f','right');y+=lh;
  for(const t of r.results){text(t.name,14,y,fitText(t.name,fs*.9,c1-60,UI,800),'#fff','left',UI,800);
   if(t.skip)text(t.skip.slice(0,24),W-14,y,fs*.85,'#ff6b6b','right');else{text(String(t.fps),c1,y,fs,t.fps>=55?'#7dff8a':t.fps>=40?'#ffd23f':'#ff6b6b','right');text(String(t.js),c2,y,fs,'#fff','right');text(String(Math.round(t.gapMax)),W-14,y,fs,'#fff','right');}y+=lh;}
  y+=lh*.2;text('fps = frames a second   ms = our drawing time   worst = longest gap (ms)',W/2,y,fitText('fps = frames a second   ms = our drawing time   worst = longest gap (ms)',fs*.8,W-24,UI,700),'rgba(255,255,255,.6)','center',UI,700);
  const bw=Math.min(150,(W-40)/2),bh=Math.min(48,H*.07),by=Math.min(H-bh-14,y+lh),bx=W/2-bw-6;
  pill(bx,by,bw,bh,'#2fbf4a','#fff');text('SAVE FILE',bx+bw/2,by+bh/2,bh*.36,'#fff','center',FONT,400);menuHits.push({x:bx,y:by,w:bw,h:bh,f:()=>saveLog()});
  pill(W/2+6,by,bw,bh,'rgba(0,0,0,.55)','rgba(255,255,255,.4)');text('BACK',W/2+6+bw/2,by+bh/2,bh*.36,'#fff','center',FONT,400);menuHits.push({x:W/2+6,y:by,w:bw,h:bh,f:()=>{phase='menu';bench=null;}});
  if(benchMsg)text(benchMsg,W/2,by+bh+18,fs*.9,'#7dff8a','center',UI,800);}finally{x=xs;}}
 // ------------------------------------------------------------ main loop
 // frame pacing: full speed (120 on a 120 Hz screen) while frames keep up; if a fast screen keeps missing frames, drop to an
 // even 60 (every other vsync) rather than land on random vsyncs (judder). It tries full speed again later, only while a
 // player is aiming (the calmest moment), and waits twice as long after every failed try (4 s, 8 s ... up to a minute)
 s.frame((dt0,tS)=>{const t=tS*1000;
  if(phase==='bench'||phase==='benchres'){W=s.W;H=s.H;if(glx){if(glx.lost){R.setGL(null);glx.destroy();glx=null;}else glx.tick();}
   if(phase==='bench'){bench.frame(t);if(bench.done){lastBench={at:new Date().toISOString(),info:infoNow(),results:bench.results};logEv('bench-done');phase='benchres';}else drawBenchLabel();return;}
   drawBenchRes();return;}
  if(pace.last0){const iv=t-pace.last0;if(iv>=4)pace.ivs.push(iv);if(pace.ivs.length>60)pace.ivs.shift();}pace.last0=t;pace.acc+=dt0;
  if(pace.ivs.length>=30&&++pace.n%30===0){const a=[...pace.ivs].sort((p,q)=>p-q);pace.vs=a[Math.floor(a.length*.15)];}
  if(pace.half&&pace.lastDraw&&t-pace.lastDraw<16.67-pace.vs*.5)return;
  const gap=pace.lastDraw?t-pace.lastDraw:16.7;pace.lastDraw=t;const dt=Math.min(pace.acc,.05);pace.acc=0;
  if(pace.vs<10.5){if(pace.half){if(t>pace.halfUntil&&phase==='aim'&&!cpuJob){pace.half=false;pace.miss=[];pace.tryAt=t;}}
   else{pace.miss.push(gap>pace.vs*1.6?1:0);if(pace.miss.length>60)pace.miss.shift();
    if(pace.miss.length>=40&&pace.miss.reduce((a,b)=>a+b,0)>pace.miss.length*.25){pace.half=true;if(pace.tryAt&&t-pace.tryAt<20000)pace.hold=Math.min(60000,pace.hold*2);pace.halfUntil=t+pace.hold;}}}
  else pace.half=false;
  // a missed frame turns the background painting down for a while (it is the one thing that can wait)
  if(gap>Math.max(24,pace.vs*2.5))pace.slowT=1.5;else pace.slowT=Math.max(0,pace.slowT-dt);pace.paintK=pace.slowT>0?.35:1;
  const f0=performance.now();pace.frame(gap);
  if(glx){if(glx.lost){R.setGL(null);glx.destroy();glx=null;}else glx.tick();}
  W=s.W;H=s.H;x.setTransform(1,0,0,1,0,0);
  if(phase==='loading'){T+=dt;drawLoading();return;}
  if(phase==='menu'){T+=dt;drawMenuCached();return;}
  if(phase==='menu-wait'){drawMenuWait();return;}
  if(!hole)return;
  if(warm){warm=false;drawWorld();drawHUD();drawIntroCard();x.setTransform(1,0,0,1,0,0);drawLoading();pace.js(performance.now()-f0);return;}
  if(phase!=='fin'&&phase!=='roll')T+=dt;
  for(const m of moods)if(m.t<90){m.t-=dt;if(m.t<=0)m.m='normal';}
  if(phase==='intro'){flyT+=dt;if(flyT>3.1){beginTurn();}}
  // each part of the frame timed for the FPS meter's breakdown (a phone's numbers, not a guess from a desktop)
  const PC=pace.cur={};let tq=performance.now();const lap=k=>{const t=performance.now();PC[k]=(PC[k]||0)+t-tq;tq=t;};
  if(phase==='card'){cardT+=dt;if(cardT>.15)flushSave();if(cardT>.3&&hi+1<plan.list.length)prepStep(hi+1,prepBudget());}
  lap('prep');if(cpu)stepCpu();lap('cpu');
  physics(dt);
  for(const bb of balls){if(bb.b.rest&&!bb.done&&phase!=='roll')R.settleOrient(bb.orient,dt,cam.rot);if(bb.done)bb.sinkT=(bb.sinkT||0)+dt;}
  stepFx(dt);stepCam(dt);snd.ambience(dt,course.id);lap('phys');
  drawWorld();lap('world');
  if(phase==='aim')drawAim();lap('ui');
  drawHUD();lap('hud');drawCallout(dt);
  if(phase==='intro')drawIntroCard();
  if(phase==='card')drawCard(false);
  if(phase==='over')drawCard(true);
  lap('ui');pace.js(performance.now()-f0);pace.part(PC);logFrame(gap,performance.now()-f0,PC);if(pace.meter)drawMeter();
 });
 plan=await chooseRound();if(!plan||!s.alive)return;
 // the course's own pictures (ground, rails, props) before the first hole, so its ground is painted once with them
 phase='loading';const names=SP.coursePictures(plan.cid);await loadPictures(names,12000);if(!s.alive)return;
 // and their shrunk copies, a few a frame while the bar fills (made mid-hole they were the long first frames of a hole)
 const frame1=()=>new Promise(r=>requestAnimationFrame(()=>r()));
 for(let i=0;i<names.length;i+=4){R.warmPictures(names.slice(i,i+4));loadP={n:i*.3,of:names.length};await frame1();if(!s.alive)return;}
 // then the first hole, painted while the bar fills (at most a few seconds: whatever is left is painted during its flyover)
 {const t0=performance.now();let f=0;while(f<1&&performance.now()-t0<6000){f=prepStep(0,12);loadP={n:30+64*f,of:100};await frame1();if(!s.alive)return;}}
 W=s.W;H=s.H;paperLayer(false);await frame1();if(!s.alive)return;paperLayer(true);
 // the face on each ball at every size step the camera can show it at (made mid-flyover they were hitches of the first hole)
 for(const m of ['normal','win','sad','silly']){for(let i=0;i<2;i++){const id=s.players[i]?.character;if(!id)continue;const e1=Math.ceil(Math.log2(kCeil()*3)*6);for(let e=Math.floor(Math.log2(6)*6);e<=e1;e++)faceSprite(id,m,Math.pow(2,e/6),1);}
  loadP={n:loadP.n+1.5,of:100};await frame1();if(!s.alive)return;}
 cards=[[],[]];startHole(0);warm=true;
}
Object.assign(exports,{minigolf});
