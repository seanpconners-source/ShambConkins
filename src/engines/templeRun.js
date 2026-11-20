// Boulder Run (Raiders) rebuilt as Temple Run in 3D. Engine key ballrun2p, game id raiders-ball-run.
// Indy (player 1's body) and Lara (player 2's) run a path over a canyon with something deadly behind: swipe up to jump,
// down to slide, left/right to turn at corners (and to change lane on the straights). Roots trip you (a stumble lets
// the chaser right up behind you; a second one soon after and it gets you), logs, arches, fire, gaps and rubble end the
// run. Score = metres + 10 per coin + a bonus for every new zone reached.
// ZONES (trun/track.js): the run goes through the Temple (boulder), Pankot Mines (mine cart), Well of Souls (cobra) and
// Lost Valley (T-Rex), then round again; each has its own look, sky, music key and chaser.
// 2 players on one phone: player 1 runs, then player 2 on the same course; higher score wins. 1P / board vs CPU: you run,
// then the CPU's run is played out of sight on the same course (trun/sim.js bot) as the score to beat.
// Online: both run the same course at once on their own phones. Snapshots carry each runner's place on the course and
// every turn taken, so when you're out you WATCH the other run (their path rebuilt on your phone) until they finish.
// Extras: personal best per player (flag on the path where it was set), first-run tutorial hints, milestone banners,
// optional tilt steering, danger glow when the chaser is close.
// Files: trun/track.js (course), trun/sim.js (runner + bot), trun/world.js (3D world + chasers), trun/skel.js + render.js
// (3D characters, WebGL2), trun/props.js (hat, satchel, whip, holsters, backpack, braid). Art: assets/trun (trun:<name>).
const {fullBleed}=require("src/engines/fullBleed.js");
const {vibrate}=require("src/audio.js");
const {voice,noise}=require("src/engines/tarantinoKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");
const {seededRandom}=require("src/utils.js");
const S=require("src/engines/trun/skel.js");
const G=require("src/engines/trun/render.js");
const T=require("src/engines/trun/track.js");
const SIM=require("src/engines/trun/sim.js");
const PR=require("src/engines/trun/props.js");
const {makeWorld,MB}=require("src/engines/trun/world.js");
const {makeMusic}=require("src/engines/trun/music.js");

const DEATH={smack:'SMACK!',trip:'TRIPPED!',burn:'TORCHED!',fall:'FELL!',edge:'OFF THE EDGE!'};
const CAUGHT={boulder:'FLATTENED!',cart:'RUN OVER!',cobra:'BITTEN!',trex:'EATEN!'};
const CHASER_LINE={boulder:'THE BOULDER!',cart:'RUNAWAY MINE CART!',cobra:'SNAKES! WHY\'D IT HAVE TO BE SNAKES?',trex:'T-REX!'};
const LIFT={boulder:3.8,cart:2.6,cobra:3.6,trex:5.4};
function nrm(v){const l=Math.hypot(...v);return v.map(a=>a/l);}
const SUN=nrm([.4,.8,.5]);
const SKIES={
 temple:{skyTop:[.36,.52,.62],skyHor:[.78,.8,.68],skyBot:[.42,.52,.42],sunCol:[1.5,1.32,1.05],sunGlow:[1,.85,.55],sky:[.48,.5,.42],ground:[.22,.2,.14],fog:[.66,.72,.62],fogNear:26,fogFar:95,hfog:.085},
 mines:{skyTop:[.05,.03,.025],skyHor:[.22,.1,.05],skyBot:[.42,.13,.04],sunCol:[1.15,.82,.55],sunGlow:[0,0,0],sky:[.36,.26,.2],ground:[.55,.2,.07],fog:[.17,.08,.045],fogNear:14,fogFar:72,hfog:.07},
 tomb:{skyTop:[.1,.07,.05],skyHor:[.44,.3,.17],skyBot:[.5,.36,.2],sunCol:[1.45,1.08,.72],sunGlow:[.4,.25,.1],sky:[.52,.42,.3],ground:[.46,.33,.18],fog:[.4,.29,.17],fogNear:18,fogFar:82,hfog:.08},
 valley:{skyTop:[.4,.6,.78],skyHor:[.85,.92,.88],skyBot:[.5,.62,.5],sunCol:[1.55,1.45,1.2],sunGlow:[1,.95,.8],sky:[.55,.63,.56],ground:[.25,.3,.18],fog:[.75,.85,.8],fogNear:30,fogFar:120,hfog:.05}};
const lerpSky=(a,b,k)=>{const o={};for(const n in b)o[n]=Array.isArray(a[n])?a[n].map((v,i)=>v+(b[n][i]-v)*k):a[n]+(b[n]-a[n])*k;o.sun=SUN;return o;};
// per-player best + run count live in this browser (a convenience: the scoreboard is the game's own results)
const STORE='sc-trun-v1';
function loadStore(){try{const o=JSON.parse(localStorage.getItem(STORE)||'{}');return {runs:o.runs|0,best:o.best&&typeof o.best==='object'?o.best:{}};}catch{return {runs:0,best:{}};}}
function saveStore(o){try{localStorage.setItem(STORE,JSON.stringify(o));}catch{}}

async function ballrun2p(s){
 const [c]=s.canvas(390,720,{fill:true});s.body.classList.add('drag-arena-body');const fb=fullBleed(s,{bg:'#0d1410'});
 const frame=c.parentElement;frame.style.position='relative';c.style.touchAction='none';
 const mk=()=>{const e=document.createElement('canvas');e.style.cssText='position:absolute;pointer-events:none;left:0;top:0';frame.appendChild(e);return e;};
 const glc=mk(),hud=mk(),hx=hud.getContext('2d');
 const R=G.createRenderer(glc);
 if(!R){await s.pass(0,'Boulder Run needs WebGL 2 (3D graphics), which this browser has turned off. The round is skipped as a tie.','OK');s.finish([0,0],'Boulder Run could not start: WebGL 2 is unavailable.');return;}
 s.cleanup(()=>R.destroy());
 const music=makeMusic();s.cleanup(()=>music.stop());let wasPaused=false;
 const on=s.online||null,me=on?on.me:0,cpu=!on&&isCpu(s);
 const dpr=()=>Math.min(1.75,window.devicePixelRatio||1);
 const store=loadStore();

 // ---------------------------------------------------------------- loading
 let loadMsg='Loading the temple…',loaded=false;
 const {USER_PORTRAITS,assetBytes}=require("src/data/userPortraits.js");
 const {gunzip}=require("src/engines/doom/wad.js");
 const skm=async n=>{const u=USER_PORTRAITS['trun:'+n];if(!u)throw new Error('missing trun:'+n);return S.parseSKM(await gunzip(await assetBytes(u)));};
 const pic=n=>new Promise(res=>{const u=USER_PORTRAITS[n];if(!u)return res(null);const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=u;});
 const owner=i=>s.players[i]?.owner;
 const bodyOf=i=>owner(i)==='Amber'?'lara':owner(i)==='Sean'?'indy':i===0?'indy':'lara';
 const bodies=[bodyOf(0),bodyOf(1)];if(bodies[0]===bodies[1]&&!s.solo)bodies[1]=bodies[0]==='indy'?'lara':'indy';
 let clips=null,trex=null;const chars={};const palT=R.texture(PR.paletteCanvas(),{mips:false});
 async function loadChar(b){if(chars[b])return chars[b];const M=await skm(b);const tex={};await Promise.all(M.groups.map(async g=>{tex[g.tex]=await pic(g.tex);}));
  const ch=R.character(M,n=>tex[n]);const pp=PR.buildProps(b,M);const prop=R.skinnedProp({...pp.geo,tex:palT});chars[b]={M,ch,prop,facts:pp.facts};return chars[b];}
 // the T-Rex (Quaternius CC0, tools/trun/build-creature.py): mesh + its own clips; optional (a missing file = no dinosaur, the cart stands in)
 async function loadTrex(){try{const M=await skm('trex'),p=await pic('trun:trex-pal');trex={M,ch:R.character(M,()=>p),clips:S.makeClips(M)};}catch(e){console.warn('trex',e);trex=null;}}
 const ready=(async()=>{clips=S.makeClips(await skm('anims'));const need=on?bodies:s.solo?[bodies[0]]:bodies;for(const b of new Set(need))await loadChar(b);await loadTrex();loaded=true;})()
  .catch(e=>{console.error(e);loadMsg='The temple failed to load: '+e.message;});

 // ---------------------------------------------------------------- a face decal glued to the head bone, painted from the player's portrait
 const W={phase:'load',t:0,speed:1,faces:[]};
 function faceProp(b,i){const F=chars[b].facts,h=F.head,j=F.jointIndex('Head'),cvf=document.createElement('canvas');cvf.width=cvf.height=256;
  const paint=()=>{const g=cvf.getContext('2d');g.clearRect(0,0,256,256);try{require("src/headFacts.js").drawFace(s,g,i,128,140,256,'normal',1,.56);}catch{}};paint();
  const P=[],N=[],U=[],J=[],I=[],NX=14,NY=12,ax=2.9,ay0=-1.15,ay1=1.05,rx=h.r[0]*1.07,ry=h.r[1]*1.02,rz=h.r[2]*1.06,cyy=h.c[1]-h.r[1]*.08;
  for(let yi=0;yi<=NY;yi++)for(let xi=0;xi<=NX;xi++){const u=xi/NX,v=yi/NY,th=(u-.5)*2*ax*.5,ph=ay1-(ay1-ay0)*v;
   const nx=Math.sin(th)*Math.cos(ph*.85),ny=Math.sin(ph*.85),nz=Math.cos(th)*Math.cos(ph*.85);
   P.push(h.c[0]+nx*rx,cyy+ny*ry,h.c[2]+nz*rz);N.push(nx,ny,nz);U.push(u,v);J.push(j);}
  for(let yi=0;yi<NY;yi++)for(let xi=0;xi<NX;xi++){const a=yi*(NX+1)+xi,b2=a+NX+1;I.push(a,b2,a+1,a+1,b2,b2+1);}
  const t=R.texture(cvf,{mips:true});W.faces[i]=cvf;
  const prop=R.skinnedProp({pos:new Float32Array(P),nrm:new Float32Array(N),uv:new Float32Array(U),joint:new Uint8Array(J),idx:new Uint32Array(I),tex:t});
  let n=0;const iv=setInterval(()=>{paint();R.retexture(t,cvf);if(++n>8)clearInterval(iv);},500);s.cleanup(()=>clearInterval(iv));// the portrait may still be loading
  return prop;}

 // a runner on screen: body, rig, face, braid (Lara)
 function makeActor(pi){const body=bodies[pi],ch=chars[body],rig=S.makeRig(ch.M,clips),face=faceProp(body,pi);ch.ch.hide('eyes');
  const braid=body==='lara'?PR.makeBraid(ch.facts):null,braidMesh=braid?R.mesh({pos:braid.pos,nrm:braid.nrm,col:braid.col,idx:braid.idx},{dynamic:true}):null;
  const A={pi,body,ch,rig,face,braid,braidMesh,head:rig.jointIndex('Head'),last:'',
   play(n,o){if(A.last!==n||o?.restart){rig.play(n,o);A.last=n;}}};
  A.play('idle',{fade:0});return A;}

 // ---------------------------------------------------------------- input (touch swipes, keys, optional tilt)
 // The course's 'right' (+u = world +X when running +Z) shows on the SCREEN's left (the camera looks down +Z), so
 // screen swipes/keys/tilt and the corner arrows are swapped here; the course and sim keep their own L/R.
 let input=null;const sw={id:null,x:0,y:0,t:0,fired:false};
 s.on(c,'pointerdown',e=>{sw.id=e.pointerId;sw.x=e.clientX;sw.y=e.clientY;sw.t=performance.now();sw.fired=false;try{c.setPointerCapture(e.pointerId);}catch{}});
 s.on(c,'pointermove',e=>{if(e.pointerId!==sw.id||sw.fired)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;if(Math.hypot(dx,dy)<22)return;sw.fired=true;
  input&&input(Math.abs(dx)>Math.abs(dy)?(dx<0?'right':'left'):(dy<0?'up':'down'));});
 // a quick short flick that never reached the threshold still counts on release
 s.on(c,'pointerup',e=>{if(e.pointerId!==sw.id)return;sw.id=null;if(sw.fired)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y,dt=performance.now()-sw.t;
  if(Math.hypot(dx,dy)>=12&&dt<220)input&&input(Math.abs(dx)>Math.abs(dy)?(dx<0?'right':'left'):(dy<0?'up':'down'));});
 s.on(window,'keydown',e=>{const k={ArrowUp:'up',KeyW:'up',Space:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'right',KeyA:'right',ArrowRight:'left',KeyD:'left'}[e.code];if(k&&input){e.preventDefault();input(k);}});
 let tiltOn=false,tiltG=0;try{tiltOn=localStorage.getItem('sc-trun-tilt')==='1';}catch{}
 s.on(window,'deviceorientation',e=>{const a=(screen.orientation&&screen.orientation.angle)||0;tiltG=a===90?(e.beta||0):a===270||a===-90?-(e.beta||0):(e.gamma||0);});
 const tiltBtn=document.createElement('button');tiltBtn.type='button';tiltBtn.className='trun-tilt';
 tiltBtn.style.cssText='position:absolute;z-index:5;left:10px;bottom:12px;padding:6px 11px;border-radius:999px;border:1px solid rgba(255,210,120,.45);background:rgba(20,14,8,.6);color:#f4e6c4;font:700 12px "SC Nunito",system-ui,sans-serif;touch-action:manipulation';
 const tiltLabel=()=>{tiltBtn.textContent=tiltOn?'TILT: ON':'TILT: OFF';};tiltLabel();frame.appendChild(tiltBtn);
 tiltBtn.addEventListener('click',async ev=>{ev.stopPropagation();if(!tiltOn&&typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){try{if(await DeviceOrientationEvent.requestPermission()!=='granted')return;}catch{return;}}
  tiltOn=!tiltOn;try{localStorage.setItem('sc-trun-tilt',tiltOn?'1':'0');}catch{}tiltLabel();});
 s.cleanup(()=>tiltBtn.remove());
 function tiltLane(Rn){if(!tiltOn||!Rn.alive||Rn.inWindow())return;const g=tiltG;let want=Rn.lane;
  if(g>13)want=0;else if(g<-13)want=2;else if(Math.abs(g)<6)want=1;if(want!==Rn.lane){Rn.lane=want;Rn.ev('lane');}}

 // ---------------------------------------------------------------- sound
 const SFX={coin:()=>{},jump:()=>noise(.16,.05,{f0:700,f1:2200}),slide:()=>noise(.35,.05,{f0:1600,f1:400}),
  turn:()=>noise(.1,.035,{f0:2400,f1:900}),stumble:()=>{voice(150,.18,.08,'square',{slide:.6});noise(.2,.08,{f0:600,f1:120});},
  dead:()=>{noise(.7,.16,{f0:400,f1:50});voice(90,.5,.09,'sawtooth',{slide:.4});},land:()=>noise(.06,.04,{f0:300,f1:120}),power:()=>{[660,880,1320].forEach((f,i)=>voice(f,.12,.04,'triangle',{delay:i*.06}));},
  zone:()=>{[392,523,659,784].forEach((f,i)=>voice(f,.32,.05,'triangle',{delay:i*.09}));noise(.9,.05,{f0:200,f1:60});},
  mile:()=>{[784,988,1175].forEach((f,i)=>voice(f,.14,.035,'square',{delay:i*.07}));},
  best:()=>{[523,659,784,1047,1319].forEach((f,i)=>voice(f,.18,.045,'triangle',{delay:i*.08}));},
  roar:()=>{voice(70,1.1,.12,'sawtooth',{slide:1.8});noise(1.1,.1,{f0:900,f1:140});},hiss:()=>noise(.9,.06,{f0:5200,f1:3800})};
 let coinChain=0,coinT=-9;
 function coinSound(t){coinChain=t-coinT<.5?Math.min(coinChain+1,12):0;coinT=t;const f=1320*Math.pow(2,coinChain/24);voice(f,.06,.035,'square');voice(f*1.5,.09,.03,'square',{delay:.05});}
 let rumbleT=0;function chaserSound(kind,dt,gap,t){rumbleT-=dt;if(rumbleT>0)return;const k=Math.max(0,Math.min(1,(16-gap)/14));
  if(kind==='boulder'){rumbleT=.22;if(k>.02)noise(.3,.02+.07*k,{f0:180,f1:60});}
  else if(kind==='cart'){rumbleT=.11;if(k>.02)noise(.06,.015+.05*k,{f0:2600,f1:1400});}
  else if(kind==='cobra'){rumbleT=.5;if(k>.15)noise(.45,.01+.04*k,{f0:5600,f1:4200});}
  else{rumbleT=.42;if(k>.02){noise(.25,.04+.1*k,{f0:120,f1:40});voice(48,.2,.05*k,'sine',{slide:.6});}}void t;}

 // ---------------------------------------------------------------- best-score flag on the path
 const flagTex=(()=>{const cv=document.createElement('canvas');cv.width=256;cv.height=128;const g=cv.getContext('2d');g.fillStyle='#d32f2f';g.fillRect(0,0,256,128);g.fillStyle='#ffd23a';g.fillRect(0,0,256,12);g.fillRect(0,116,256,12);
  g.font='900 62px Impact, "Arial Black", sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText('BEST',128,66);return R.texture(cv);})();
 const flagMesh=(()=>{const b=MB();b.quad([0,2.2,0],[-1.6,2.2,0],[-1.6,3.0,0],[0,3.0,0],[0,0,-1],[0,1],[1,1],[1,0],[0,0]);b.quad([-1.6,2.2,0],[0,2.2,0],[0,3.0,0],[-1.6,3.0,0],[0,0,1],[1,1],[0,1],[0,0],[1,0]);return R.mesh(b.out());})();
 const poleMesh=(()=>{const b=MB();b.tube([0,0,0],[0,3.1,0],.06,.05,8,1,[230,230,230]);b.box(-T.HALF,T.HALF,0,.03,-.12,.12,1,[255,210,60]);return R.mesh(b.out());})();

 // ---------------------------------------------------------------- the scene: world, chaser, camera (one per course shown)
 function makeView(course){return {course,world:makeWorld(R,course),trail:[],yawV:course.yaw(0),camYaw:course.yaw(0),fovK:1,lastSeg:null,cd:-1,
  zone:0,sky:SKIES.temple,skyFrom:SKIES.temple,skyK:1,chaser:'boulder',chaserT:-9,trexRig:trex?S.makeRig(trex.M,trex.clips):null,shake:0};}
 function setZone(V,z,t){const id=T.ZONES[z].id;V.skyFrom=lerpSky(V.skyFrom,SKIES[T.ZONES[V.zone].id],V.skyK);V.zone=z;V.skyK=0;
  let ch=T.ZONES[z].chaser;if(ch==='trex'&&!trex)ch='cart';V.chaser=ch;V.chaserT=t;if(V.trexRig)V.trexRig.play('run',{fade:0});void id;}
 // draw one frame of a runner (A = actor, Rn = runner or the partner's mirror) in view V
 function drawView(V,A,Rn,{phase,pt,dt,t,L,intro=false,bestDist=0,introLen=2.6}){
  const course=V.course,d=Rn.dist(),[px,pz]=course.pos(Rn.seg,Rn.a,Rn.u),py=Rn.y;
  if(!V.trail.length||d-V.trail[V.trail.length-1].d>.25)V.trail.push({d,x:px,z:pz});if(V.trail.length>500)V.trail.shift();
  const tyaw=course.yaw(Rn.seg.dir);V.yawV=angLerp(V.yawV,tyaw,Math.min(1,dt*16));V.camYaw=angLerp(V.camYaw,tyaw,Math.min(1,dt*(phase==='play'?7:3)));
  V.skyK=Math.min(1,V.skyK+dt/2.2);const sky=lerpSky(V.skyFrom,SKIES[T.ZONES[V.zone].id],V.skyK*V.skyK*(3-2*V.skyK));
  // chaser distance: CHASE behind; a new zone's chaser charges in from further back; in the intro it bursts from the temple door
  const fresh=Math.max(0,1-(t-V.chaserT)/2.4);let bd=d-Rn.chase-fresh*fresh*24;
  if(intro)bd=Math.min(d-Rn.chase,-14+pt*6.5);
  const caught=phase==='dead'&&Rn.dead==='caught',fell=phase==='dead'&&(Rn.dead==='fall'||Rn.dead==='edge');
  if(phase==='dead'&&!fell)bd=Math.min(d+(caught?1.5:3),(V.cd<0?bd:V.cd)+dt*(caught?14:10));
  V.cd=bd;const at=x=>trailAt(V.trail,x,course),bp=at(bd);
  const lift=LIFT[V.chaser]||3.8,close=Math.max(0,Math.min(1,(8-(d-bd))/6)),fwd=[Math.sin(V.camYaw),Math.cos(V.camYaw)];
  let back=5.1-close*2.4,up=3.25+close*lift;const sh=V.shake*(Math.random()-.5)*.35;V.shake=Math.max(0,V.shake-dt*2.5);
  let eye,look;
  if(intro){const k=Math.max(0,Math.min(1,(pt-introLen*.5)/(introLen*.5))),e2=k*k*(3-2*k),ang=V.camYaw+Math.PI*e2,dist=3.4+e2*1.3;
   eye=[px+Math.sin(ang)*dist,1.55+Math.sin(e2*Math.PI)*1.8+e2*1.2,pz+Math.cos(ang)*dist];look=[px+fwd[0]*e2*4,1.25-e2*.25,pz+fwd[1]*e2*4];}
  else{eye=[px-fwd[0]*back+sh,(fell?2.8:py*.45+up)+sh,pz-fwd[1]*back];look=[px+fwd[0]*4.6,py*.3+1.05,pz+fwd[1]*4.6];}
  if(fell)look=[px,Math.max(-6,py+.8),pz];
  if(W.camBack){eye=[px+fwd[0]*7,3.6,pz+fwd[1]*7];look=[px-fwd[0]*10,2,pz-fwd[1]*10];}// tests: look back at the chaser
  const aspect=L.w/Math.max(1,L.h);V.fovK+=((Rn.pow==='boost'?1.18:1)-V.fovK)*Math.min(1,dt*4);const fov=(aspect<1?1.18:.9)*V.fovK;
  const view=G.lookAt(eye,look),proj=G.perspective(fov,aspect,.1,240);
  R.begin({w:Math.round(L.w*L.k),h:Math.round(L.h*L.k),view,proj,eye,...sky});
  const segs=V.world.visible(Rn.seg,3);if(Rn.seg!==V.lastSeg){V.lastSeg=Rn.seg;V.world.forget(segs);}
  V.world.draw(segs,t,[px,pz],V.zone);V.world.drawCoins(segs,t,Rn.got);V.world.drawPows(segs,t,Rn.got,eye);
  // best-score flag
  if(bestDist>30)for(const sg of segs)if(bestDist>=sg.s0&&bestDist<sg.s1+T.CORNER){const lz=bestDist-sg.s0,f=T.DIRS[sg.dir],rt=T.DIRS[(sg.dir+1)%4],yaw=course.yaw(sg.dir);
   const bx=sg.x+f[0]*lz,bz=sg.z+f[1]*lz;R.draw(poleMesh,G.placeY(bx,0,bz,yaw));R.draw(poleMesh,G.placeY(bx+rt[0]*(T.HALF+.2),0,bz+rt[1]*(T.HALF+.2),yaw));
   R.draw(flagMesh,G.placeY(bx+rt[0]*(T.HALF+.2),0,bz+rt[1]*(T.HALF+.2),yaw+Math.sin(t*3)*.15),{tex:flagTex});}
  // the chaser
  const k=V.chaser;
  if(k==='boulder')V.world.drawBoulder(bp[0],2.3,bp[1],bp[2],bd/2.3);
  else if(k==='cart')V.world.drawCart(bp[0],bp[1],bp[2],t,bd/.42);
  else if(k==='cobra')V.world.drawCobra(at,bd+1.2,t,caught?1:close);
  else if(k==='trex'&&trex&&V.trexRig){const c2=at(bd-4.2),rg=V.trexRig;
   if(caught&&rg.clip()!=='attack')rg.play('attack',{fade:.15});else if(!caught&&rg.clip()!=='run')rg.play('run',{fade:.2});
   if(rg.clip()==='run')rg.setSpeed(.75+Rn.v/SIM.VMAX*.55);rg.update(dt);R.drawChar(trex.ch,rg,G.placeY(c2[0],0,c2[1],c2[2]));}
  // the runner
  const ry=V.yawV,M=G.placeY(px,py,pz,ry);R.drawChar(A.ch.ch,A.rig,M);R.drawProp(A.ch.prop,A.rig,M);if(A.face)R.drawProp(A.face,A.rig,M);
  if(A.braid){const a=xf(A.rig,A.head,A.braid.anchorBind,1),b=xf(A.rig,A.head,[0,0,-1],0);const wa=rot(a,ry,px,py,pz),wb=rot(b,ry,0,0,0),bl=Math.hypot(wb[0],wb[2])||1;
   const sph=[['spine_03',[0,0,-.03],.17],['spine_02',[0,0,-.02],.15],['Head',[0,.08,0],.115]].map(([n,o,r])=>{const q=rot(xf(A.rig,A.rig.jointIndex(n),A.ch.facts.pos[n].map((v,k2)=>v+o[k2]),1),ry,px,py,pz);return [q[0],q[1],q[2],r];});
   R.update(A.braidMesh,A.braid.step(wa,[wb[0]/bl,0,wb[2]/bl],dt,phase==='play'&&Rn.alive?24:0,sph));R.draw(A.braidMesh,G.placeY(0,0,0));}
  if(Rn.pow==='shield'||Rn.safeT>0&&Math.floor(t*10)%2)V.world.drawShield(px,py,pz,t);
  V.world.drawFires(segs,t,eye);
  return {gap:d-bd};}

 // ---------------------------------------------------------------- layout + frame loop
 let onFrame=null;
 s.frame((dt,t)=>{W.t=t;if(!!s.paused!==wasPaused){wasPaused=!!s.paused;music.hold(wasPaused);}if(!onFrame||W.manual)return;const n=Math.max(1,Math.round(W.speed));for(let i=0;i<n&&onFrame;i++)onFrame(Math.min(dt,1/20),t,i<n-1);});
 function layout(){const r=c.getBoundingClientRect(),fr=frame.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height),k=dpr();
  for(const e of [glc,hud]){e.style.left=(r.left-fr.left)+'px';e.style.top=(r.top-fr.top)+'px';e.style.width=w+'px';e.style.height=h+'px';}
  const pw=Math.round(w*k),ph=Math.round(h*k);if(hud.width!==pw||hud.height!==ph){hud.width=pw;hud.height=ph;}return {w,h,k,pw,ph};}

 // ---------------------------------------------------------------- one run
 const nameOf=i=>s.players[i]?.name||('Player '+(i+1));
 function run(pi,{partner=null,onTurn=null}={}){return new Promise(async resolve=>{
  await ready;if(!loaded){resolve({score:0,dist:0,coins:0,dead:'load',zone:0});return;}
  const course=T.makeCourse(s.seed+':'+(on?'net':'run')),Rn=SIM.makeRunner(course,{who:pi});
  Rn.a=2;Rn.chase=7;
  const A=makeActor(pi),V=makeView(course);
  const best=store.best[nameOf(pi)]||{score:0,dist:0},bestDist=best.dist|0;let beatBest=false;
  const tut=store.runs<3,hintN={};let hint=null;
  const bot=SIM.makeBot(Rn,{skill:.97,rnd:seededRandom(s.seed+':auto:'+pi)});let auto=false;
  s.debug={engine:'templeRun',runner:Rn,course,faces:W.faces,get phase(){return W.phase;},autopilot(on2=true){auto=on2;},speed(k){W.speed=k;},manual(on2=true){W.manual=on2;},tick(dt=1/30){W.t+=dt;onFrame&&onFrame(dt,W.t,false);},kill(k='smack'){Rn.kill(k);},bodies,
   get zone(){return T.ZONES[V.zone].id;},get chaser(){return V.chaser;},warpZone(z){// jump ahead to straight z*ZLEN (tests)
    let sg=Rn.seg;while(sg.k<z*T.ZLEN){sg=course.follow(sg,sg.turn==='T'?'L':sg.turn);}Rn.seg=sg;Rn.a=1;Rn.hit=new Set();Rn.got=new Set();Rn.zone=sg.zone;setZone(V,sg.zone,W.t);V.trail.length=0;},
   get trex(){return !!trex;},camBack(on2=true){W.camBack=on2;},get bot(){if(on){auto=true;return 'drive';}return null;},store};
  let banner=null,title=null,phase='intro',pt=0,deadT=0,introLen=2.6,ended=false;
  input=k=>{if(phase!=='play')return;Rn.input(k);};
  onFrame=(dt,t,skipDraw)=>{
   const L=layout();pt+=dt;W.phase=phase;
   if(phase==='intro'){if(pt>introLen*.55)A.play('run',{fade:.25});if(pt>=introLen){phase='play';}if(pt>.3)music.start();}
   music.setLevel(Rn.v<11?0:Rn.v<13?1:Rn.v<15.5?2:3);
   if(phase==='play'){if(auto)bot(dt);tiltLane(Rn);Rn.step(dt);
    for(const e of Rn.events){if(e.t==='coin')coinSound(t);else if(SFX[e.t])SFX[e.t]();
     if(e.t==='jump')A.play('ninjaStart',{fade:.06,speed:2.6,at:.25,restart:true});
     else if(e.t==='slide')A.play('slideStart',{fade:.06,speed:2.2,restart:true});else if(e.t==='land')A.play('run',{fade:.1});
     else if(e.t==='stumble'){A.play('stumble',{fade:.05,speed:1.6,restart:true});V.shake=.5;vibrate(40);s.react(pi,'sad');}
     else if(e.t==='coin')s.setScores(scores());
     else if(e.t==='power'){banner=[{magnet:'COIN MAGNET!',boost:'SPEED BOOST!',shield:'SHIELD!'}[e.kind],t];}
     else if(e.t==='shieldPop'){SFX.stumble();V.shake=.6;banner=['SHIELD SAVED YOU!',t];}
     else if(e.t==='turn'){V.shake=Math.max(V.shake,.08);hintN.turn=(hintN.turn||0)+1;onTurn&&onTurn(e.k,e.side);}
     else if(e.t==='zone'){setZone(V,e.zone,t);music.setZone(e.zone);const ch=V.chaser;title=[T.ZONES[e.zone].name,CHASER_LINE[ch],t];vibrate([30,30,30]);s.react(pi,'win');
      if(ch==='trex')setTimeout(()=>SFX.roar(),600);else if(ch==='cobra')setTimeout(()=>SFX.hiss(),500);s.setScores(scores());}
     else if(e.t==='mile')banner=[e.m+' M!',t];}
    Rn.events.length=0;
    if(!beatBest&&bestDist>30&&Rn.dist()>bestDist){beatBest=true;SFX.best();banner=['NEW BEST!',t];vibrate([20,40,20]);}
    if(tut)hint=hintFor(Rn,hintN);
    if(!Rn.alive){phase='dead';deadT=0;vibrate([60,40,90]);s.react(pi,'sad');V.shake=1;
     if(Rn.dead==='fall'||Rn.dead==='edge')A.play('hit',{fade:.1});else if(Rn.dead!=='caught')A.play('die',{fade:.08});else A.play('hit',{fade:.05});}
    if(Rn.alive){if(A.last==='ninjaStart'&&A.rig.done())A.play('ninjaAir',{fade:.1});if(A.last==='slideStart'&&A.rig.done())A.play('slide',{fade:.08});
     if(A.last==='slide'&&Rn.slide<=0)A.play('run',{fade:.14});if(A.last==='stumble'&&A.rig.done())A.play('run',{fade:.15});
     if(A.last==='run')A.rig.setSpeed(.82+Rn.v/SIM.VMAX*.55);}
    partnerTick&&partnerTick(Rn,dt);}
   if(phase==='dead'){deadT+=dt;if(Rn.dead==='fall'||Rn.dead==='edge'){Rn.y-=dt*(4+deadT*14);Rn.a+=dt*Rn.v*Math.max(0,.6-deadT);}
    partnerTick&&partnerTick(Rn,dt);if(deadT>2.6&&!ended){ended=true;finishRun();}}
   A.rig.update(dt);if(skipDraw)return;
   const g=drawView(V,A,Rn,{phase,pt,dt,t,L,intro:phase==='intro',bestDist,introLen});
   if(phase!=='dead'||Rn.dead==='fall'||Rn.dead==='edge')chaserSound(V.chaser,dt,g.gap,t);
   drawHud(L,{pi,Rn,phase,pt,partner,banner,title,now:t,best:Math.max(best.score|0,beatBest?Rn.score():0),hint,gap:g.gap,chaser:V.chaser});};
  function scores(){const a=[0,0];a[pi]=Rn.score();return a;}
  function finishRun(){onFrame=null;input=null;
   const res={score:Rn.score(),dist:Math.floor(Rn.dist()),coins:Rn.coins,dead:Rn.dead,zone:Rn.zone,chaser:V.chaser,best:false};
   store.runs++;const nm=nameOf(pi),b=store.best[nm];if(!b||res.score>b.score){store.best[nm]={score:res.score,dist:res.dist};res.best=!!b||res.score>0;}saveStore(store);
   V.world.forget([]);resolve(res);}
 });}
 let partnerTick=null;
 // first-run hints: what to do about the next thing on the path
 // (each kind is explained 3 times per run; n.seen = obstacles already passed)
 function hintFor(Rn,n){if(!Rn.alive)return null;const seg=Rn.seg,v=Rn.v;n.seen??=new Set();
  if(Rn.inWindow()&&!Rn.turnQ&&(n.turn||0)<3)return {k:'turn',text:seg.turn==='T'?'SWIPE LEFT OR RIGHT':seg.turn==='R'?'SWIPE LEFT TO TURN':'SWIPE RIGHT TO TURN'};
  for(const o of seg.obs){const d=o.at-Rn.a;if(n.seen.has(o))continue;if(d>v*1.25)break;
   const k=o.kind==='arch'||o.kind==='fire'?'down':o.kind==='block'?'side':'up';
   if(d<.4){n.seen.add(o);n[k]=(n[k]||0)+1;continue;}
   if(o.kind==='block'&&!o.lanes.includes(Rn.lane))continue;
   if((n[k]||0)>=3)return null;
   return {k,text:k==='down'?'SWIPE DOWN TO SLIDE':k==='side'?'SWIPE SIDEWAYS TO DODGE':'SWIPE UP TO JUMP'};}
  return null;}

 // ---------------------------------------------------------------- HUD (2D canvas over the 3D one)
 function drawHud(L,o){const x=hx,k=L.k,{pi,Rn,phase,pt,partner,banner,title,now}=o;x.setTransform(k,0,0,k,0,0);x.clearRect(0,0,L.w,L.h);
  const top=Math.max(10,(fb&&fb.top)||0)+4,fs=Math.max(15,Math.min(26,L.w*.055));
  // danger glow when the chaser is right behind
  if(phase==='play'&&o.gap<7){const a=Math.min(.55,(7-o.gap)/7*.6)*(.75+.25*Math.sin(now*12));const gr=x.createRadialGradient(L.w/2,L.h/2,Math.min(L.w,L.h)*.3,L.w/2,L.h/2,Math.max(L.w,L.h)*.75);
   gr.addColorStop(0,'rgba(200,0,0,0)');gr.addColorStop(1,`rgba(200,0,0,${a})`);x.fillStyle=gr;x.fillRect(0,0,L.w,L.h);}
  if(phase==='intro'&&pt>1.2){const a=Math.min(1,(pt-1.2)*2);x.save();x.globalAlpha=a;x.font=`900 ${fs*3}px Impact, "Arial Black", sans-serif`;x.textAlign='center';x.textBaseline='middle';
   x.lineWidth=fs*.35;x.strokeStyle='#2a1406';x.strokeText('RUN!',L.w/2,L.h*.36);x.fillStyle='#ffcf3a';x.fillText('RUN!',L.w/2,L.h*.36);x.restore();}
  x.save();x.textAlign='left';x.textBaseline='top';
  const name=s.players[pi]?.name||'Player',ph=fs*(partner?4.4:3.3);
  panel(x,10,top,Math.min(L.w*.52,240),ph);
  x.font=`700 ${fs*.62}px "SC Nunito", system-ui, sans-serif`;x.fillStyle='#e8dcc0';x.fillText(name.toUpperCase(),20,top+6);
  if(o.best){x.textAlign='right';x.fillStyle='#ffd23a';x.fillText('BEST '+o.best,Math.min(L.w*.52,240),top+6);x.textAlign='left';}
  x.font=`900 ${fs*1.25}px "SC Bangers", Impact, sans-serif`;x.fillStyle='#fff';x.fillText(String(Rn.score()).padStart(5,'0'),20,top+fs*.82);
  x.font=`700 ${fs*.66}px "SC Nunito", system-ui, sans-serif`;x.fillStyle='#ffd23a';x.fillText(`● ${Rn.coins}`,20,top+fs*2.3);x.fillStyle='#cfe7d0';x.fillText(`${Math.floor(Rn.dist())} m`,20+fs*3.2,top+fs*2.3);
  if(partner){x.fillStyle='#9fd0ff';x.font=`700 ${fs*.6}px "SC Nunito", system-ui, sans-serif`;x.fillText(partner.text(),20,top+fs*3.4);}
  x.restore();
  if(Rn.pow){const tot=SIM.POW[Rn.pow],k2=Math.max(0,Rn.powT/tot),col={magnet:'#ff6a5a',boost:'#6aff7a',shield:'#7ac8ff'}[Rn.pow],bw=Math.min(L.w*.4,170);
   x.fillStyle='rgba(0,0,0,.45)';x.fillRect(L.w-bw-12,top+44,bw,10);x.fillStyle=col;x.fillRect(L.w-bw-12,top+44,bw*k2,10);
   x.font=`800 ${fs*.6}px "SC Nunito", system-ui, sans-serif`;x.textAlign='right';x.textBaseline='bottom';x.fillText({magnet:'MAGNET',boost:'BOOST',shield:'SHIELD'}[Rn.pow],L.w-12,top+42);}
  // zone title card
  if(title&&now-title[2]<2.8){const e=now-title[2],a=Math.min(1,e*3,(2.8-e)*2.5);x.save();x.globalAlpha=a;x.textAlign='center';x.textBaseline='middle';
   const y=L.h*.2,sc=1+Math.max(0,.25-e)*1.2;x.translate(L.w/2,y);x.scale(sc,sc);
   x.fillStyle='rgba(15,8,4,.6)';x.fillRect(-L.w/2,-fs*1.6,L.w,fs*3.4);
   x.font=`900 ${Math.min(fs*1.9,L.w*.09)}px Impact, "Arial Black", sans-serif`;x.lineWidth=fs*.25;x.strokeStyle='#1a0c04';x.strokeText(title[0],0,-fs*.35);x.fillStyle='#ffd36a';x.fillText(title[0],0,-fs*.35);
   x.font=`800 ${Math.min(fs*.78,L.w*.04)}px "SC Nunito", system-ui, sans-serif`;x.fillStyle='#ffb0a0';x.fillText(title[1]+'  +'+SIM.ZONE_BONUS,0,fs*.95);x.restore();}
  if(banner&&now-banner[1]<1.6){const a=Math.min(1,(1.6-(now-banner[1]))*2);x.save();x.globalAlpha=a;x.textAlign='center';x.textBaseline='middle';x.font=`900 ${fs*1.5}px Impact, "Arial Black", sans-serif`;
   x.lineWidth=fs*.22;x.strokeStyle='#1a1006';const by=title&&now-title[2]<2.8?L.h*.34:L.h*.24;x.strokeText(banner[0],L.w/2,by);x.fillStyle='#fff3b0';x.fillText(banner[0],L.w/2,by);x.restore();}
  if(phase==='play'&&Rn.alive&&Rn.inWindow()&&!Rn.turnQ){const tt=Rn.seg.turn,a=.35+.25*Math.sin(performance.now()/120);x.save();x.globalAlpha=a;x.fillStyle='#fff7d0';x.font=`900 ${fs*2.4}px system-ui, sans-serif`;x.textAlign='center';x.textBaseline='middle';
   if(tt==='R'||tt==='T')x.fillText('⬅',L.w*.3,L.h*.62);if(tt==='L'||tt==='T')x.fillText('➡',L.w*.7,L.h*.62);x.restore();}
  if(o.hint&&phase==='play'){const h=o.hint,a=.75+.25*Math.sin(now*8);x.save();x.globalAlpha=a;x.textAlign='center';x.textBaseline='middle';
   const arrow={up:'⬆',down:'⬇',side:'⬅ ➡',turn:''}[h.k];const y=L.h*.74;
   if(arrow){x.font=`900 ${fs*2.2}px system-ui, sans-serif`;x.fillStyle='#fff';x.fillText(arrow,L.w/2,y-fs*1.6+(h.k==='up'?-Math.abs(Math.sin(now*6))*10:h.k==='down'?Math.abs(Math.sin(now*6))*10:0));}
   x.font=`900 ${fs*.95}px "SC Nunito", system-ui, sans-serif`;x.lineWidth=fs*.2;x.strokeStyle='rgba(0,0,0,.75)';x.strokeText(h.text,L.w/2,y);x.fillStyle='#ffe38a';x.fillText(h.text,L.w/2,y);x.restore();}
  if(phase==='dead'){const a=Math.min(1,pt);x.save();x.textAlign='center';x.textBaseline='middle';x.font=`900 ${fs*2.3}px Impact, "Arial Black", sans-serif`;
   x.lineWidth=fs*.3;x.strokeStyle='#2a0a04';const msg=Rn.dead==='caught'?CAUGHT[o.chaser]||'CAUGHT!':DEATH[Rn.dead]||'OUCH!';x.globalAlpha=a;x.strokeText(msg,L.w/2,L.h*.34);x.fillStyle='#ff8a3a';x.fillText(msg,L.w/2,L.h*.34);x.restore();}
  if(!loaded&&phase!=='play'){x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,L.h*.45,L.w,L.h*.1);x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font=`700 ${fs*.8}px system-ui`;x.fillText(loadMsg,L.w/2,L.h*.5);}}
 function panel(x,px,py,w,h){x.fillStyle='rgba(20,14,8,.55)';x.strokeStyle='rgba(255,210,120,.35)';x.lineWidth=1.5;x.beginPath();x.roundRect(px,py,w,h,12);x.fill();x.stroke();}

 // loading screen while waiting
 onFrame=()=>{const L=layout();hx.setTransform(L.k,0,0,L.k,0,0);hx.clearRect(0,0,L.w,L.h);hx.fillStyle='#16201a';hx.fillRect(0,0,L.w,L.h);hx.fillStyle='#ffcf3a';hx.textAlign='center';hx.textBaseline='middle';
  hx.font='900 34px Impact, "Arial Black", sans-serif';hx.fillText('BOULDER RUN',L.w/2,L.h*.42);hx.fillStyle='#d8ccb0';hx.font='600 16px system-ui';hx.fillText(loadMsg,L.w/2,L.h*.5);};
 await ready;
 if(!loaded){await s.pass(0,loadMsg,'OK');s.finish([0,0],'Boulder Run could not load.');return;}
 s.hint('Swipe up = jump · down = slide · left/right = turn at corners, change lane on straights. Coins +10, new zone +250. Roots trip you: two trips close together and the chaser gets you. TILT (bottom left) steers by tilting the phone.');

 // ---------------------------------------------------------------- the match
 const res=[null,null];
 if(on){// both run at once; when you're out you watch the other run
  const name=nameOf(1-me);
  const their={d:0,sc:0,al:1,k:0,a:0,u:0,y:0,sl:0,ch:14,z:0,dd:'',pw:'',co:0},turns=[];let theirFin=null;
  const nf=netField(s,{hz:10,pack:()=>{const R0=W.mine;if(!R0)return {d:0,sc:0,al:1};
    return {d:Math.floor(R0.dist()),sc:R0.score(),al:R0.alive?1:0,k:R0.seg.k,a:+R0.a.toFixed(2),u:+R0.u.toFixed(2),y:+R0.y.toFixed(2),sl:R0.slide>0?1:0,ch:+R0.chase.toFixed(1),z:R0.zone,dd:R0.dead||'',pw:R0.pow||'',co:R0.coins,v:+R0.v.toFixed(1)};},
   unpack:(i,d)=>{if(d&&Number.isFinite(d.d)){Object.assign(their,d);their.at=performance.now();}},
   onEvent:e=>{if(e&&Array.isArray(e.tn))turns.push(e.tn);}});
  const fin=nf?nf.remoteDone().then(v=>{theirFin=v==null?their.sc:v|0;}):Promise.resolve();
  partnerTick=(Rn,dt)=>{W.mine=Rn;nf&&nf.tick(dt);};
  if(nf)await nf.start('run');
  res[me]=await run(me,{partner:{text:()=>`${name}: ${their.d} m${their.al?'':' (out)'}`},onTurn:(k,side)=>nf&&nf.event({tn:[k,side]})});
  nf&&nf.finish(res[me].score);partnerTick=null;
  // spectate: rebuild their path from the turns they took and follow their runner
  let done=false;fin.then(()=>{done=true;});
  if(!done&&their.al&&chars[bodies[1-me]]){
   const pc=T.makeCourse(s.seed+':net');let ti=0;
   const mirror={seg:pc.get(0),a:0,u:0,y:0,slide:0,v:SIM.V0,alive:true,dead:null,chase:14,pow:null,safeT:0,coins:0,zone:0,got:{has:()=>false},
    dist(){return mirror.seg.s0+mirror.a;},score(){return their.sc;}};
   const taken=c2=>{// coins behind them on their straight are gone; ones on earlier straights too
    return mirror.seg.coins.includes(c2)?c2.at<mirror.a+.3:mirror.seg.pows?.includes(c2)?c2.at<mirror.a+.3:true;};
   mirror.got={has:taken};
   const A=makeActor(1-me),V=makeView(pc);A.play('run',{fade:0});let ptS=0,lastZ=0,endT=0;tiltBtn.style.display='none';
   onFrame=(dt,t,skipDraw)=>{const L=layout();ptS+=dt;
    while(ti<turns.length){const [k,side]=turns[ti];const sg=pc.get(k);if(!sg)break;pc.follow(sg,side);ti++;}
    const tgt=pc.get(their.k);
    if(tgt&&tgt!==mirror.seg){mirror.seg=tgt;mirror.a=their.a;}
    // move on between snapshots at their speed, then ease to the latest one
    const age=(performance.now()-(their.at||0))/1000;
    if(their.al){mirror.a+=dt*(their.v||SIM.V0);const want=their.a+Math.min(.4,age)*(their.v||SIM.V0);mirror.a+=(want-mirror.a)*Math.min(1,dt*6);}
    mirror.u+=(their.u-mirror.u)*Math.min(1,dt*14);mirror.y+=(their.y-mirror.y)*Math.min(1,dt*16);
    mirror.slide=their.sl?1:0;mirror.chase+=(their.ch-mirror.chase)*Math.min(1,dt*4);mirror.pow=their.pw||null;mirror.coins=their.co|0;mirror.v=their.v||SIM.V0;
    if(their.z!==lastZ){lastZ=their.z;setZone(V,their.z,t);}
    if(!their.al&&mirror.alive){mirror.alive=false;mirror.dead=their.dd||'smack';A.play(mirror.dead==='fall'||mirror.dead==='edge'||mirror.dead==='caught'?'hit':'die',{fade:.08});endT=t;}
    if(mirror.alive){const want=mirror.y>.05?'ninjaAir':mirror.slide?'slide':'run';if(A.last!==want)A.play(want,{fade:.12});if(want==='run')A.rig.setSpeed(.82+mirror.v/SIM.VMAX*.55);}
    A.rig.update(dt);if(skipDraw)return;
    const g=drawView(V,A,mirror,{phase:mirror.alive?'play':'dead',pt:ptS,dt,t,L});
    drawHud(L,{pi:1-me,Rn:{...mirror,score:()=>their.sc,dist:()=>their.d,inWindow:()=>false},phase:mirror.alive?'watch':'dead',pt:t-endT,partner:null,banner:null,title:null,now:t,best:0,hint:null,gap:g.gap,chaser:V.chaser});
    // spectator strip
    hx.save();hx.setTransform(L.k,0,0,L.k,0,0);hx.textAlign='center';hx.textBaseline='middle';const fs=Math.max(15,Math.min(24,L.w*.05));
    hx.translate(0,-fs*2.2);hx.fillStyle='rgba(10,6,4,.6)';hx.fillRect(0,L.h-fs*2.6,L.w,fs*2.6);const wt=`WATCHING ${name.toUpperCase()}`;
    hx.font=`900 ${fs*.9}px "SC Nunito", system-ui, sans-serif`;const tw=hx.measureText(wt).width;hx.fillStyle='#ff5a4a';hx.globalAlpha=.6+.4*Math.sin(t*5);hx.beginPath();hx.arc(L.w/2-tw/2-fs*.6,L.h-fs*1.55,fs*.26,0,7);hx.fill();hx.globalAlpha=1;
    hx.fillStyle='#fff';hx.fillText(wt,L.w/2,L.h-fs*1.55);
    hx.font=`700 ${fs*.6}px "SC Nunito", system-ui, sans-serif`;hx.fillStyle='#ffd23a';hx.fillText(`You: ${res[me].score} · ${name}: ${their.sc}`,L.w/2,L.h-fs*.6);hx.restore();};
   s.debug={...s.debug,watching:true,get mirror(){return mirror;}};
   await fin;
   if(mirror.alive){mirror.alive=false;}
   await new Promise(r=>setTimeout(r,1800));// let their fall play out
  }else{
   onFrame=()=>{const L=layout();hx.setTransform(L.k,0,0,L.k,0,0);hx.clearRect(0,0,L.w,L.h);hx.fillStyle='rgba(0,0,0,.55)';hx.fillRect(0,0,L.w,L.h);hx.fillStyle='#fff';hx.textAlign='center';hx.font='700 18px system-ui';hx.fillText(`Waiting for ${name}… (${their.d} m)`,L.w/2,L.h/2);};
   await fin;}
  onFrame=null;res[1-me]={score:theirFin|0};
 }else{
  const order=s.solo?[0]:[0,1];
  for(const pi of order){
   if(!s.solo){const prev=pi>0?`${nameOf(0)}: ${res[0].dist} m, ${res[0].coins} coins = ${res[0].score} points (reached ${T.ZONES[res[0].zone||0].name.toLowerCase()}). `:'';
    if(!await s.pass(pi,`${prev}${nameOf(pi)}, run! Swipe up to jump, down to slide, left/right to turn.`,'Ready',{countdown:0}))return;}
   res[pi]=await run(pi);s.setScores(res.map(r=>r?r.score:0));}
  if(s.solo){// the CPU (or the solo target) runs the same course out of sight
   const sk=cpu?cpuSkill(s):.65,bot=SIM.simulate(s.seed+':run',{skill:.8+sk*.16,rnd:seededRandom(s.seed+':cpu')});res[1]={score:bot.score,dist:bot.dist,coins:bot.coins,dead:bot.dead};}
 }
 const sc=[res[0]?.score|0,res[1]?.score|0];s.setScores(sc);
 const line=i=>res[i]?.dist!=null?`${nameOf(i)} ${res[i].dist} m · ${res[i].coins} coins = ${sc[i]}${res[i].best?' (new best!)':''}`:`${nameOf(i)} ${sc[i]}`;
 s.finish(sc,sc[0]===sc[1]?`Dead heat! ${line(0)} / ${line(1)}`:`${nameOf(sc[0]>sc[1]?0:1)} outran them all! ${line(0)} · ${line(1)}`);
}

// ---------------------------------------------------------------- helpers
function angLerp(a,b,k){let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return a+d*k;}
function xf(rig,j,p,w){const s=rig.skin,o=j*12;return [s[o]*p[0]+s[o+1]*p[1]+s[o+2]*p[2]+s[o+3]*w,s[o+4]*p[0]+s[o+5]*p[1]+s[o+6]*p[2]+s[o+7]*w,s[o+8]*p[0]+s[o+9]*p[1]+s[o+10]*p[2]+s[o+11]*w];}
function rot(p,yaw,tx,ty,tz){const c=Math.cos(yaw),n=Math.sin(yaw);return [c*p[0]+n*p[2]+tx,p[1]+ty,-n*p[0]+c*p[2]+tz];}
// position + heading on the runner's trail at distance d (before the trail starts: straight back the way it began)
function trailAt(tr,d,course){
 if(!tr.length){const y=course.yaw(0);return [Math.sin(y)*d,Math.cos(y)*d,y];}
 if(d<=tr[0].d){const a=tr[0],b=tr[Math.min(1,tr.length-1)],yaw=b!==a?Math.atan2(b.x-a.x,b.z-a.z):course.yaw(course.segs[0]?.dir||0),back=d-a.d;return [a.x+Math.sin(yaw)*back,a.z+Math.cos(yaw)*back,yaw];}
 let i=tr.length-1;while(i>0&&tr[i-1].d>d)i--;const b=tr[i],a=tr[Math.max(0,i-1)];if(b.d<=d)return [b.x,b.z,Math.atan2(b.x-a.x,b.z-a.z)||0];
 const k=(d-a.d)/Math.max(1e-6,b.d-a.d);return [a.x+(b.x-a.x)*k,a.z+(b.z-a.z)*k,Math.atan2(b.x-a.x,b.z-a.z)];}

Object.assign(exports,{ballrun2p});
