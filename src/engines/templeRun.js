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
const WD=require("src/engines/trun/world.js"),{makeWorld,MB}=WD;
const {makeMusic}=require("src/engines/trun/music.js");

const DEATH={smack:'SMACK!',trip:'TRIPPED!',burn:'TORCHED!',fall:'FELL!',edge:'OFF THE EDGE!',spiked:'SPIKED!',sliced:'SLICED!',darted:'POISON DART!'};
const CAUGHT={boulder:'FLATTENED!',cart:'RUN OVER!',cobra:'BITTEN!',trex:'EATEN!',hovitos:'SPEARED!',rats:'SWARMED!',thuggee:'KALI MA!'};
const CHASER_LINE={boulder:'THE BOULDER!',cart:'RUNAWAY MINE CART!',cobra:'SNAKES! WHY\'D IT HAVE TO BE SNAKES?',trex:'T-REX!',hovitos:'THE HOVITOS! RUN FOR THE PLANE!',rats:'RATS! THOUSANDS OF THEM!',thuggee:'MOLA RAM\'S THUGGEE!'};
const LIFT={boulder:3.8,cart:2.6,cobra:3.6,trex:5.4,hovitos:3,rats:2.2,thuggee:3};
function nrm(v){const l=Math.hypot(...v);return v.map(a=>a/l);}
const SUN=nrm([.4,.8,.5]);
const SKIES={
 temple:{skyTop:[.36,.52,.62],skyHor:[.78,.8,.68],skyBot:[.42,.52,.42],sunCol:[1.5,1.32,1.05],sunGlow:[1,.85,.55],sky:[.48,.5,.42],ground:[.22,.2,.14],fog:[.66,.72,.62],fogNear:26,fogFar:95,hfog:.085},
 mines:{skyTop:[.05,.03,.025],skyHor:[.22,.1,.05],skyBot:[.42,.13,.04],sunCol:[1.15,.82,.55],sunGlow:[0,0,0],sky:[.36,.26,.2],ground:[.55,.2,.07],fog:[.17,.08,.045],fogNear:14,fogFar:72,hfog:.07},
 tomb:{skyTop:[.1,.07,.05],skyHor:[.44,.3,.17],skyBot:[.5,.36,.2],sunCol:[1.45,1.08,.72],sunGlow:[.4,.25,.1],sky:[.52,.42,.3],ground:[.46,.33,.18],fog:[.4,.29,.17],fogNear:18,fogFar:82,hfog:.08},
 jungle:{skyTop:[.3,.5,.45],skyHor:[.7,.8,.62],skyBot:[.3,.45,.3],sunCol:[1.4,1.35,1.05],sunGlow:[.8,.8,.5],sky:[.42,.52,.4],ground:[.18,.24,.12],fog:[.55,.68,.52],fogNear:20,fogFar:85,hfog:.1},
 catacombs:{skyTop:[.03,.03,.05],skyHor:[.12,.1,.12],skyBot:[.06,.07,.09],sunCol:[1.2,.9,.62],sunGlow:[0,0,0],sky:[.22,.22,.28],ground:[.1,.1,.12],fog:[.07,.065,.08],fogNear:10,fogFar:58,hfog:.06},
 bridge:{skyTop:[.32,.42,.62],skyHor:[.95,.72,.5],skyBot:[.4,.4,.42],sunCol:[1.6,1.25,.9],sunGlow:[1,.7,.4],sky:[.55,.5,.48],ground:[.22,.2,.18],fog:[.8,.68,.58],fogNear:34,fogFar:140,hfog:.03},
 valley:{skyTop:[.4,.6,.78],skyHor:[.85,.92,.88],skyBot:[.5,.62,.5],sunCol:[1.55,1.45,1.2],sunGlow:[1,.95,.8],sky:[.55,.63,.56],ground:[.25,.3,.18],fog:[.75,.85,.8],fogNear:30,fogFar:120,hfog:.05}};
const lerpSky=(a,b,k)=>{const o={};for(const n in b)o[n]=Array.isArray(a[n])?a[n].map((v,i)=>v+(b[n][i]-v)*k):a[n]+(b[n]-a[n])*k;o.sun=SUN;return o;};
// per-player best + run count live in this browser (a convenience: the scoreboard is the game's own results)
const STORE='sc-trun-v1';
function loadStore(){try{const o=JSON.parse(localStorage.getItem(STORE)||'{}');const slots=Array.isArray(o.slots)&&o.slots.length===3&&o.slots.every(n=>Number.isInteger(n)&&n>=0)?o.slots:[0,1,2];
  return {runs:o.runs|0,best:o.best&&typeof o.best==='object'?o.best:{},coins:Math.max(0,o.coins|0),slots,next:Math.max(3,o.next|0,...slots.map(n=>n+1)),goals:o.goals|0};}catch{return {runs:0,best:{},coins:0,slots:[0,1,2],next:3,goals:0};}}
// GOALS (Temple Run's objectives): three at a time, each done one is replaced by the next; reward = coins for the bank
const GOAL_LIST=[['dist',300],['coins',30],['zone',2],['pows',1],['dist',600],['coins',60],['slides',15],['zone',3],['jumps',25],['dist',1000],['clean',500],['coins',120],
 ['zone',4],['pows',3],['dist',1600],['idol',1],['zone',5],['coins',200],['dist',2500],['clean',1200],['zone',6],['dist',3500],['jumps',90],['zone',7],['coins',350],['dist',5000]];
function goalAt(i){if(i<GOAL_LIST.length){const [k,n]=GOAL_LIST[i];return {k,n,reward:50+Math.floor(i/3)*25};}
 const j=i-GOAL_LIST.length,k=['dist','coins','clean','zone'][j%4],lv=Math.floor(j/4)+1;
 return {k,n:k==='dist'?5000+lv*1500:k==='coins'?350+lv*60:k==='clean'?1200+lv*600:7+lv*2,reward:300+lv*25};}
const GOAL_TEXT={dist:n=>`Run ${n} m`,coins:n=>`Grab ${n} coins in one run`,zone:n=>`Reach zone ${n}`,pows:n=>`Pick up ${n} power-up${n>1?'s':''} in one run`,slides:n=>`Slide ${n} times in one run`,
 jumps:n=>`Jump ${n} times in one run`,clean:n=>`Run ${n} m without stumbling`,idol:()=>`Grab the golden idol`};
const goalText=g=>GOAL_TEXT[g.k](g.n);
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
 let clips=null,trex=null,crew=null;const chars={};const palT=R.texture(PR.paletteCanvas(),{mips:false});
 async function loadChar(b){if(chars[b])return chars[b];const M=await skm(b);const tex={};await Promise.all(M.groups.map(async g=>{tex[g.tex]=await pic(g.tex);}));
  const pp=PR.buildProps(b,M);if(b==='indy'||b==='lara')tuckFace(M,pp.facts);const ch=R.character(M,n=>tex[n]);const prop=R.skinnedProp({...pp.geo,tex:palT});chars[b]={M,ch,prop,facts:pp.facts,img:tex};return chars[b];}
 // the T-Rex (Quaternius CC0, tools/trun/build-creature.py): mesh + its own clips; optional (a missing file = no dinosaur, the cart stands in)
 // CC0 scenery models + their textures (tools/trun/build-props.py): optional, the world falls back to its drawn scenery
 async function loadProps(){try{const u=USER_PORTRAITS['trun:props'];if(!u)return;const u8=await gunzip(await assetBytes(u));
   if(String.fromCharCode(u8[0],u8[1],u8[2],u8[3])!=='PRP1')return;const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength),jl=dv.getUint32(4,true);
   const J=JSON.parse(new TextDecoder().decode(u8.subarray(8,8+jl)));let off=8+jl;while(off%4)off++;const blob=u8.slice(off).buffer;
   const P={models:J.models,vb:new Float32Array(blob,J.vb,J.verts*8),ib:new Uint32Array(blob,J.ib,(blob.byteLength-J.ib)/4),tex:{},surf:{}};
   const names=new Set();for(const m of Object.values(J.models))for(const g of m.groups)names.add(g.tex);
   await Promise.all([...names].map(async n=>{const im=await pic(n);if(im)P.tex[n]=R.texture(im,{mips:true});}));
   for(const [k,n,rep2] of [['cliff','trun:ptex-rocks-diffuse',1],['wood','trun:ptex-bark-normaltree',1],['sstone2','trun:ptex-rocks-desert-diffuse',1]]){const im=await pic(n);if(im)P.surf[k]=R.texture(im,{repeat:!!rep2,mips:true});}
   WD.setProps(P);}catch(e){console.warn('props',e);}}
 // the human chasers (Hovitos, Thuggee): optional like the T-Rex
 async function loadCrew(){crew={};for(const b of ['hovitos','thuggee'])try{crew[b]=await loadChar(b);}catch(e){console.warn(b,e);}}
 async function loadTrex(){try{const M=await skm('trex'),p=await pic('trun:trex-pal');trex={M,ch:R.character(M,()=>p),clips:S.makeClips(M)};}catch(e){console.warn('trex',e);trex=null;}}
 const ready=(async()=>{clips=S.makeClips(await skm('anims'));const need=on?bodies:s.solo?[bodies[0]]:bodies;for(const b of new Set(need))await loadChar(b);await loadTrex();await loadCrew();await loadProps();loaded=true;})()
  .catch(e=>{console.error(e);loadMsg='The temple failed to load: '+e.message;});

 // ---------------------------------------------------------------- a face decal glued to the head bone, painted from the player's portrait
 const W={phase:'load',t:0,speed:1,faces:[]};
 // The portrait is painted bigger than its own face box (k = face width / texture width) and a little wider (sx) so it
 // reaches ear to ear and brow to chin on the model; edges feathered; the model's skin is tinted to the photo's skin.
 const FACE_FIT={k:.72,cy:144,sx:1.14,sy:1.1,ay0:-1.6};// chin and beard inside the texture (cy 166 cut them off below the mouth)
 function feather(cv){const g=cv.getContext('2d');if(!('filter' in g))return;const c2=document.createElement('canvas');c2.width=c2.height=256;const g2=c2.getContext('2d');
  g2.filter='blur(2.5px)';g2.drawImage(cv,0,0);g.globalCompositeOperation='destination-in';g.drawImage(c2,0,0);g.drawImage(c2,0,0);g.globalCompositeOperation='source-over';}
 // median colour of the cheeks (opaque, not beard-dark, not highlight) or null while the portrait is still loading
 function cheekTone(cv,q){const fw=256*q.k*q.sx,d=cv.getContext('2d').getImageData(0,0,256,256).data,R0=[],G0=[],B0=[];
  for(const sd of [-1,1])for(let y=Math.round(q.cy-.02*fw);y<q.cy+.16*fw;y+=2)for(let x=Math.round(128+sd*.16*fw);Math.abs(x-128)<.34*fw;x+=sd*2){
   if(x<0||x>255||y<0||y>255)break;const o=(y*256+x)*4;if(d[o+3]<250)continue;const l=d[o]*.3+d[o+1]*.59+d[o+2]*.11;if(l<70||l>235||d[o]<d[o+2])continue;R0.push(d[o]);G0.push(d[o+1]);B0.push(d[o+2]);}
  if(R0.length<40)return null;const med=a=>a.sort((x,y)=>x-y)[a.length>>1];return [med(R0),med(G0),med(B0)];}
 const tinted=new Set();
 function tintSkin(b,tone){if(tinted.has(b))return;const C=chars[b],gr=C.M.groups.find(g=>/skin/.test(g.mat)||/skin/.test(g.tex));const img=gr&&C.img[gr.tex];if(!img)return;tinted.add(b);
  const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');g.drawImage(img,0,0);
  const id=g.getImageData(0,0,w,h),d=id.data,R0=[],G0=[],B0=[],isSkin=o=>d[o+3]>200&&d[o]>d[o+1]&&d[o+1]>=d[o+2]&&d[o]-d[o+2]>18&&d[o]-d[o+2]<110&&d[o]>70;for(let o=0;o<d.length;o+=4*7)if(isSkin(o)){R0.push(d[o]);G0.push(d[o+1]);B0.push(d[o+2]);}
  if(R0.length<50)return;const med=a=>a.sort((x,y)=>x-y)[a.length>>1],ref=[med(R0),med(G0),med(B0)],k0=tone.map((v,c)=>v/Math.max(1,ref[c])),avg=(k0[0]+k0[1]+k0[2])/3,k=k0.map(v=>Math.max(.8,Math.min(1.22,avg+(v-avg)*.6)));
  for(let o=0;o<d.length;o+=4){if(!isSkin(o))continue;const dr=d[o]-ref[0],dg=d[o+1]-ref[1],db=d[o+2]-ref[2],wt=.75*Math.exp(-(dr*dr+dg*dg+db*db)/(2*60*60));
   for(let c=0;c<3;c++)d[o+c]=Math.min(255,d[o+c]*(1+(k[c]-1)*wt));}
  g.putImageData(id,0,0);C.ch.setTexture(gr.mat,cv);}
 // The model's own nose, lips, jaw and chin stick out past the face patch (the photo then looks cut off at the mouth with
 // the model's chin hanging below it). Before the mesh is uploaded, every front-of-head vertex inside the patch's reach is
 // pulled in to TUCK of the patch shell, so only the photo shows there. Ears, hair and the back of the head stay as they are.
 const TUCK=.9;
 function tuckFace(M,F){const h=F.head,j=F.jointIndex('Head'),f=new Float32Array(M.blob,M.vb,M.verts*7),u8=new Uint8Array(M.blob,M.vb,M.verts*28);
  const rx=h.r[0]*1.07,ry=h.r[1]*1.02,rz=h.r[2]*1.06,cx=h.c[0],cy=h.c[1]-h.r[1]*.08,cz=h.c[2];let n=0;
  for(let i=0;i<M.verts;i++){const o=i*28;let w=0;for(let k=0;k<4;k++)if(u8[o+20+k]===j)w+=u8[o+24+k];if(w<20)continue;
   const dx=(f[i*7]-cx)/rx,dy=(f[i*7+1]-cy)/ry,dz=(f[i*7+2]-cz)/rz;if(dz<=.02)continue;const e=Math.hypot(dx,dy,dz),th=Math.atan2(dx,dz),ph=Math.asin(Math.max(-1,Math.min(1,dy/e)));
   if(Math.abs(th)>1.25||ph>.8||ph<-1.45||e<=TUCK)continue;const k=1-(1-TUCK/e)*Math.min(1,w/200);
   f[i*7]=cx+dx*k*rx;f[i*7+1]=cy+dy*k*ry;f[i*7+2]=cz+dz*k*rz;n++;}
  return n;}
 function faceProp(b,i){const F=chars[b].facts,h=F.head,j=F.jointIndex('Head'),cvf=document.createElement('canvas');cvf.width=cvf.height=256;
  const paint=()=>{const g=cvf.getContext('2d'),q=W.faceTune||FACE_FIT;g.clearRect(0,0,256,256);g.save();g.translate(128,q.cy);g.scale(q.sx,q.sy||1);try{require("src/headFacts.js").drawFace(s,g,i,0,0,256,'normal',1,q.k);}catch{}g.restore();
   let tone=null;try{tone=cheekTone(cvf,q);feather(cvf);if(tone&&!W.noTint)tintSkin(b,tone);}catch{}};paint();
  // patch: an ellipsoid shell just outside the head, pushed forward over the nose and mouth so the model's own lips and nose stay under it
  const P=[],N=[],U=[],J=[],I=[],NX=16,NY=16,ax=2.9,ay0=(W.faceTune&&W.faceTune.ay0)||FACE_FIT.ay0,ay1=1.05,rx=h.r[0]*1.07,ry=h.r[1]*1.02,rz=h.r[2]*1.06,cyy=h.c[1]-h.r[1]*.08;
  for(let yi=0;yi<=NY;yi++)for(let xi=0;xi<=NX;xi++){const u=xi/NX,v=yi/NY,th=(u-.5)*2*ax*.5,ph=ay1-(ay1-ay0)*v;
   const nx=Math.sin(th)*Math.cos(ph*.85),ny=Math.sin(ph*.85),nz=Math.cos(th)*Math.cos(ph*.85),bump=1+.1*Math.exp(-((th/.55)**2)-((ph+.4)/.5)**2);
   P.push(h.c[0]+nx*rx,cyy+ny*ry,h.c[2]+nz*rz*bump);N.push(nx,ny,nz);U.push(u,v);J.push(j);}
  for(let yi=0;yi<NY;yi++)for(let xi=0;xi<NX;xi++){const a=yi*(NX+1)+xi,b2=a+NX+1;I.push(a,b2,a+1,a+1,b2,b2+1);}
  const t=R.texture(cvf,{mips:true});W.faces[i]=cvf;(W.repaint=W.repaint||[])[i]=()=>{paint();R.retexture(t,cvf);};
  const prop=R.skinnedProp({pos:new Float32Array(P),nrm:new Float32Array(N),uv:new Float32Array(U),joint:new Uint8Array(J),idx:new Uint32Array(I),tex:t});
  let n=0;const iv=setInterval(()=>{paint();R.retexture(t,cvf);if(++n>8)clearInterval(iv);},500);s.cleanup(()=>clearInterval(iv));// the portrait may still be loading
  return prop;}

 // a runner on screen: body, rig, face, braid (Lara)
 function makeActor(pi){const body=bodies[pi],ch=chars[body],rig=S.makeRig(ch.M,clips),face=faceProp(body,pi);ch.ch.hide('eyes');
  const braid=body==='lara'?PR.makeBraid(ch.facts):null,braidMesh=braid?R.mesh({pos:braid.pos,nrm:braid.nrm,col:braid.col,idx:braid.idx},{dynamic:true}):null;
  const A={pi,body,ch,rig,face,braid,braidMesh,head:rig.jointIndex('Head'),last:'',
   play(n,o){if(A.last!==n||o?.restart){rig.play(n,o);A.last=n;}}};
  A.play('idle',{fade:0});(W.actors=W.actors||[]).push(A);return A;}

 // ---------------------------------------------------------------- input (touch swipes, keys, optional tilt)
 // The course's 'right' (+u = world +X when running +Z) shows on the SCREEN's left (the camera looks down +Z), so
 // screen swipes/keys/tilt and the corner arrows are swapped here; the course and sim keep their own L/R.
 let input=null;const sw={id:null,x:0,y:0,t:0,fired:false};
 s.on(c,'pointerdown',e=>{sw.id=e.pointerId;sw.x=e.clientX;sw.y=e.clientY;sw.t=performance.now();sw.fired=false;try{c.setPointerCapture(e.pointerId);}catch{}});
 s.on(c,'pointermove',e=>{if(e.pointerId!==sw.id||sw.fired)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;if(Math.hypot(dx,dy)<22)return;sw.fired=true;
  input&&input(Math.abs(dx)>Math.abs(dy)?(dx<0?'right':'left'):(dy<0?'up':'down'));});
 // a quick short flick that never reached the threshold still counts on release
 s.on(c,'pointerup',e=>{if(e.pointerId!==sw.id)return;sw.id=null;if(sw.fired)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y,dt=performance.now()-sw.t;
  if(Math.hypot(dx,dy)>=12&&dt<220)input&&input(Math.abs(dx)>Math.abs(dy)?(dx<0?'right':'left'):(dy<0?'up':'down'));
  else if(Math.hypot(dx,dy)<12&&dt<500&&tapper){const b=c.getBoundingClientRect();tapper(e.clientX-b.left,e.clientY-b.top);}});
 let tapper=null;
 s.on(window,'keydown',e=>{const k={ArrowUp:'up',KeyW:'up',Space:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'right',KeyA:'right',ArrowRight:'left',KeyD:'left'}[e.code];if(k&&input){e.preventDefault();input(k);}});
 let tiltOn=false,tiltG=0;try{tiltOn=localStorage.getItem('sc-trun-tilt')==='1';}catch{}
 s.on(window,'deviceorientation',e=>{const a=(screen.orientation&&screen.orientation.angle)||0;tiltG=a===90?(e.beta||0):a===270||a===-90?-(e.beta||0):(e.gamma||0);});
 const tiltBtn=document.createElement('button');tiltBtn.type='button';tiltBtn.className='trun-tilt';
 tiltBtn.style.cssText='position:absolute;z-index:5;left:10px;bottom:12px;padding:6px 11px;border-radius:999px;border:1px solid rgba(255,210,120,.45);background:rgba(20,14,8,.6);color:#f4e6c4;font:700 12px "SC Nunito",system-ui,sans-serif;touch-action:manipulation';
 const tiltLabel=()=>{tiltBtn.textContent=tiltOn?'TILT: ON':'TILT: OFF';};tiltLabel();frame.appendChild(tiltBtn);
 tiltBtn.addEventListener('click',async ev=>{ev.stopPropagation();if(!tiltOn&&typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){try{if(await DeviceOrientationEvent.requestPermission()!=='granted')return;}catch{return;}}
  tiltOn=!tiltOn;try{localStorage.setItem('sc-trun-tilt',tiltOn?'1':'0');}catch{}tiltLabel();});
 s.cleanup(()=>tiltBtn.remove());
 function tiltLane(Rn){if(!tiltOn||!Rn.alive||Rn.inWindow())return;{const e=Rn.brkT();if(e>=0&&e<BRK.go)return;}const g=tiltG;let want=Rn.lane;
  if(g>13)want=0;else if(g<-13)want=2;else if(Math.abs(g)<6)want=1;if(want!==Rn.lane){Rn.lane=want;Rn.ev('lane');}}

 // ---------------------------------------------------------------- sound
 const SFX={coin:()=>{},jump:()=>noise(.16,.05,{f0:700,f1:2200}),slide:()=>noise(.35,.05,{f0:1600,f1:400}),
  turn:()=>noise(.1,.035,{f0:2400,f1:900}),stumble:()=>{voice(150,.18,.08,'square',{slide:.6});noise(.2,.08,{f0:600,f1:120});},
  dead:()=>{noise(.7,.16,{f0:400,f1:50});voice(90,.5,.09,'sawtooth',{slide:.4});},land:()=>noise(.06,.04,{f0:300,f1:120}),power:()=>{[660,880,1320].forEach((f,i)=>voice(f,.12,.04,'triangle',{delay:i*.06}));},
  zone:()=>{[392,523,659,784].forEach((f,i)=>voice(f,.32,.05,'triangle',{delay:i*.09}));noise(.9,.05,{f0:200,f1:60});},
  mile:()=>{[784,988,1175].forEach((f,i)=>voice(f,.14,.035,'square',{delay:i*.07}));},
  best:()=>{[523,659,784,1047,1319].forEach((f,i)=>voice(f,.18,.045,'triangle',{delay:i*.08}));},
  phew:()=>{[523,659,784].forEach((f,i)=>voice(f,.22,.04,'triangle',{delay:i*.08}));noise(.6,.04,{f0:900,f1:200});},
  roar:()=>{voice(70,1.1,.12,'sawtooth',{slide:1.8});noise(1.1,.1,{f0:900,f1:140});},hiss:()=>noise(.9,.06,{f0:5200,f1:3800}),
  warcry:ch=>{for(let i=0;i<4;i++)voice((ch==='thuggee'?200:280)+i*37,.5,.05,'sawtooth',{slide:.7,delay:i*.12});noise(.6,.05,{f0:500,f1:200});},
  goal:()=>{[659,784,988,1319].forEach((f,i)=>voice(f,.16,.045,'triangle',{delay:i*.07}));},
  squeak:()=>{for(let i=0;i<10;i++)voice(2400+Math.random()*2200,.05,.03,'square',{slide:1.3,delay:i*.05});},
  crash:()=>{noise(.55,.13,{f0:700,f1:90});voice(60,.4,.08,'sawtooth',{slide:.5});},boom:()=>{noise(1.2,.07,{f0:160,f1:35});voice(42,.9,.07,'sine',{slide:.6});},
  rumble:()=>{noise(1,.09,{f0:240,f1:50});},thud:()=>{noise(.3,.12,{f0:260,f1:50});voice(55,.3,.09,'sine',{slide:.5});}};
 let coinChain=0,coinT=-9;
 function coinSound(t){coinChain=t-coinT<.5?Math.min(coinChain+1,12):0;coinT=t;const f=1320*Math.pow(2,coinChain/24);voice(f,.06,.035,'square');voice(f*1.5,.09,.03,'square',{delay:.05});}
 let rumbleT=0;function chaserSound(kind,dt,gap,t){rumbleT-=dt;if(rumbleT>0)return;const k=Math.max(0,Math.min(1,(16-gap)/14));
  if(kind==='boulder'){rumbleT=.22;if(k>.02)noise(.3,.02+.07*k,{f0:180,f1:60});}
  else if(kind==='cart'){rumbleT=.11;if(k>.02)noise(.06,.015+.05*k,{f0:2600,f1:1400});}
  else if(kind==='rats'){rumbleT=.09;if(k>.05)voice(2600+Math.random()*1600,.05,.01+.025*k,'square',{slide:1.3});}
  else if(kind==='hovitos'||kind==='thuggee'){rumbleT=.24;if(k>.05){noise(.12,.02+.04*k,{f0:260,f1:90});if(Math.random()<.18*k)voice(kind==='rats'?0:(kind==='thuggee'?220:300)+Math.random()*90,.35,.03+.03*k,'sawtooth',{slide:.75});}}
  else if(kind==='cobra'){rumbleT=.5;if(k>.15)noise(.45,.01+.04*k,{f0:5600,f1:4200});}
  else{rumbleT=.42;if(k>.02){noise(.25,.04+.1*k,{f0:120,f1:40});voice(48,.2,.05*k,'sine',{slide:.6});}}void t;}

 // ---------------------------------------------------------------- best-score flag on the path
 const flagTex=(()=>{const cv=document.createElement('canvas');cv.width=256;cv.height=128;const g=cv.getContext('2d');g.fillStyle='#d32f2f';g.fillRect(0,0,256,128);g.fillStyle='#ffd23a';g.fillRect(0,0,256,12);g.fillRect(0,116,256,12);
  g.font='900 62px Impact, "Arial Black", sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText('BEST',128,66);return R.texture(cv);})();
 const flagMesh=(()=>{const b=MB();b.quad([0,2.2,0],[-1.6,2.2,0],[-1.6,3.0,0],[0,3.0,0],[0,0,-1],[0,1],[1,1],[1,0],[0,0]);b.quad([-1.6,2.2,0],[0,2.2,0],[0,3.0,0],[-1.6,3.0,0],[0,0,1],[1,1],[0,1],[0,0],[1,0]);return R.mesh(b.out());})();
 const poleMesh=(()=>{const b=MB();b.tube([0,0,0],[0,3.1,0],.06,.05,8,1,[230,230,230]);b.box(-T.HALF,T.HALF,0,.03,-.12,.12,1,[255,210,60]);return R.mesh(b.out());})();

 // ---------------------------------------------------------------- the scene: world, chaser, camera (one per course shown)
 function makeView(course){const z0=course.get(0).zone,id0=T.ZONES[z0].id;return {course,world:makeWorld(R,course),trail:[],yawV:course.yaw(0),camYaw:course.yaw(0),fovK:1,lastSeg:null,cd:-1,
  zone:z0,sky:SKIES[id0],skyFrom:SKIES[id0],skyK:1,chaser:'boulder',chaserT:-9,prev:null,lean:0,uv:0,lastU:null,cu:0,brk:-9,trexRig:trex?S.makeRig(trex.M,trex.clips):null,shake:0,
  gang:crew?Object.fromEntries(Object.keys(crew).map(b=>[b,[0,1,2].map(i=>{const g=S.makeRig(crew[b].M,clips);g.play('run',{fade:0});g.update(i*.27);return g;})])):{}};}
 function chaserFor(V,z){let ch=T.ZONES[z].chaser;if(ch==='trex'&&!trex)ch='cart';if((ch==='hovitos'||ch==='thuggee')&&!V.gang[ch])ch='boulder';return ch;}
 // ---------------------------------------------------------------- the getaway (a new zone; timeline = sim.js BRK, the same on every phone)
 // The old chaser can't take the corner: it carries straight on over the corner's far wall and drops into the depths (the Hovitos/Thuggee
 // leader goes over, the other two pull up at the edge). The runner eases to a stop, turns to look at the drop, turns back relieved...
 // then the next chaser bursts in from somewhere (ENTRY) a few metres behind, the runner flinches and sprints off.
 const BRK=SIM.BRK,EDGE=T.CORNER+.35,FALL_G=30;
 const ENTRY={boulder:'drop',cart:'drop',hovitos:'drop',rats:'rise',cobra:'rise',thuggee:'climb',trex:'climb'};
 const ESCAPE={boulder:'THE BOULDER WENT OVER THE EDGE!',cart:'THE CART JUMPED THE TRACK!',cobra:'THE COBRA FELL!',trex:'THE T-REX WENT OVER!',hovitos:'THE HOVITOS LOST YOU!',rats:'THE RATS POURED OFF THE EDGE!',thuggee:'THE THUGGEE LOST YOU!'};
 function setZone(V,z,t,{brk=true,old=null,v=SIM.V0}={}){V.skyFrom=lerpSky(V.skyFrom,SKIES[T.ZONES[V.zone].id],V.skyK);V.zone=z;V.skyK=0;V.prev=null;
  if(brk&&old){const f=T.DIRS[old.dir],rt=T.DIRS[(old.dir+1)%4],p=trailAt(V.trail,old.s1-.3,V.course),u0=(p[0]-old.x)*rt[0]+(p[1]-old.z)*rt[1];
   V.prev={kind:V.chaser,t0:t,bd:V.cd,old,v:Math.max(7,v),u0,f,rt,fellAt:null,said:false};V.gw={corner:[old.ex+f[0]*T.CORNER/2,old.ez+f[1]*T.CORNER/2],side:z%2?1:-1};}
  const ch=chaserFor(V,z);V.chaser=ch;V.chaserT=brk?-9:t;if(V.trexRig)V.trexRig.play('run',{fade:0});}
 // where the old chaser is at path distance dd: on the trail until its straight ends, then straight on across the corner and down
 function missAt(V,P,at){const O=P.old;return dd=>{if(dd<=O.s1){const q=at(dd);return [q[0],q[1],q[2],0];}const s2=dd-O.s1,over=s2-EDGE;
  return [O.ex+P.f[0]*s2+P.rt[0]*P.u0,O.ez+P.f[1]*s2+P.rt[1]*P.u0,V.course.yaw(O.dir),over>0?-.5*FALL_G*(over/P.v)**2:0];};}
 // the new chaser's entrance offset (k 0..1 over BRK.enter..BRK.land): dropping from above, rising out of the floor, or climbing up over the side
 function entryOff(kind,k,side){const e=1-k,how=ENTRY[kind]||'drop';
  if(how==='drop')return {x:0,y:16*(1-k*k)};if(how==='rise')return {x:0,y:-3.4*e*e};
  return {x:side*4.6*e,y:-5*e*e+1.6*Math.sin(k*Math.PI)};}
 // the runner's part in the getaway (clips, face, sounds); e = seconds into it, V.ge = last frame's e
 function getawayActor(A,V,e,pi,dt){const was=V.ge??-1,cross=x=>was<x&&e>=x;V.ge=e;
  if(cross(BRK.slow))A.play('jog',{fade:.35});if(cross(BRK.stop-.35))A.play('idle',{fade:.45});
  if(cross(BRK.look))s.react(pi,'think',1.3);if(cross(BRK.back)){s.react(pi,'win',1.8);SFX.phew();}
  if(cross(BRK.enter)){const ch=V.chaser;if(ch==='trex')SFX.roar();else if(ch==='cobra')SFX.hiss();else if(ch==='hovitos'||ch==='thuggee')SFX.warcry(ch);else if(ch==='rats')SFX.squeak();else SFX.rumble();}
  if(cross(BRK.land)){A.play('stumble',{fade:.05,speed:1.25,restart:true});s.react(pi,'sad',1.4);V.shake=.8;SFX.thud();}
  if(cross(BRK.go))A.play('run',{fade:.2});
  // turn round to look at the drop, back again; a glance over the shoulder when the new one lands
  const want=e>=BRK.look+.1&&e<BRK.back?Math.PI*.88:e>=BRK.land+.05&&e<BRK.go?Math.PI*.42:0;V.turnY=(V.turnY||0)+(want-(V.turnY||0))*Math.min(1,dt*5);}
 // draw one frame of a runner (A = actor, Rn = runner or the partner's mirror) in view V
 function drawView(V,A,Rn,{phase,pt,dt,t,L,intro=false,bestDist=0,introLen=2.6}){
  const course=V.course,d=Rn.dist(),[px,pz]=course.pos(Rn.seg,Rn.a,Rn.u),py=Rn.y,ge=phase==='play'&&Rn.brkT?Rn.brkT():-1;
  // side-step lean: the body turns and banks into a lane change (from how fast it slides sideways); the camera follows the lane slowly
  if(V.lastU!==null&&dt>0){const vu=(Rn.u-V.lastU)/dt;V.uv+=(vu-V.uv)*Math.min(1,dt*18);}V.lastU=Rn.u;
  V.lean+=(Math.max(-.42,Math.min(.42,V.uv*.075))-V.lean)*Math.min(1,dt*14);V.cu+=(Rn.u-V.cu)*Math.min(1,dt*5);
  const [cx0,cz0]=course.pos(Rn.seg,Rn.a,Rn.u*.35+V.cu*.4);
  if(!V.trail.length||d-V.trail[V.trail.length-1].d>.25)V.trail.push({d,x:px,z:pz});if(V.trail.length>500)V.trail.shift();
  const tyaw=course.yaw(Rn.seg.dir);V.yawV=angLerp(V.yawV,tyaw,Math.min(1,dt*16));V.camYaw=angLerp(V.camYaw,tyaw,Math.min(1,dt*(phase==='play'?7:3)));
  V.skyK=Math.min(1,V.skyK+dt/2.2);const sky=lerpSky(V.skyFrom,SKIES[T.ZONES[V.zone].id],V.skyK*V.skyK*(3-2*V.skyK));
  // chaser distance: CHASE behind; a new zone's chaser charges in from further back; in the intro it bursts from the temple door
  const fresh=t<V.chaserT?9:Math.max(0,1-(t-V.chaserT)/2.4);let bd=d-Rn.chase-Math.min(fresh,1)*Math.min(fresh,1)*24-(fresh>1?60:0);
  if(intro)bd=Math.min(d-Rn.chase,-14+pt*6.5);
  const caught=phase==='dead'&&Rn.dead==='caught',fell=phase==='dead'&&(Rn.dead==='fall'||Rn.dead==='edge');
  if(phase==='dead'&&!fell)bd=Math.min(d+(caught?1.5:3),(V.cd<0?bd:V.cd)+dt*(caught?14:10));
  V.cd=bd;const at=x=>trailAt(V.trail,x,course),bp=at(bd);
  const lift=LIFT[V.chaser]||3.8,close=fresh>1?0:Math.max(0,Math.min(1,(8-(d-bd))/6)),fwd=[Math.sin(V.camYaw),Math.cos(V.camYaw)];
  let back=5.1-close*2.4,up=3.25+close*lift;const sh=V.shake*(Math.random()-.5)*.35;V.shake=Math.max(0,V.shake-dt*2.5);
  let eye,look;
  if(intro){const k=Math.max(0,Math.min(1,(pt-introLen*.5)/(introLen*.5))),e2=k*k*(3-2*k),ang=V.camYaw+Math.PI*e2,dist=3.4+e2*1.3;
   eye=[px+Math.sin(ang)*dist,1.55+Math.sin(e2*Math.PI)*1.8+e2*1.2,pz+Math.cos(ang)*dist];look=[px+fwd[0]*e2*4,1.25-e2*.25,pz+fwd[1]*e2*4];}
  else{eye=[cx0-fwd[0]*back+sh,(fell?2.8:py*.45+up)+sh,cz0-fwd[1]*back];look=[cx0+fwd[0]*4.6,py*.3+1.05,cz0+fwd[1]*4.6];
   // the getaway: in front looking back as the old chaser goes over the edge, beside the runner as they look at the drop, close on the
   // relieved face, pulled back to show the new chaser land behind them, then back behind as they run
   if(ge>=0&&V.gw){const ty=course.yaw(Rn.seg.dir),fx=Math.sin(ty),fz=Math.cos(ty),rx=fz,rz=-fx,[ccx,ccz]=V.gw.corner,sd=V.gw.side;
    const mix=(a,b,k)=>a.map((v,i)=>v+(b[i]-v)*k),sm=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},R0=[px,py+1.2,pz],C0=[ccx,.3,ccz];
    const P1=[[px+fx*4.6+rx*1.3*sd,py+2.6,pz+fz*4.6+rz*1.3*sd],mix(R0,C0,.5)],P2=[[px+rx*1.1*sd+fx*3.8,2.4,pz+rz*1.1*sd+fz*3.8],mix(R0,C0,.55)],
     P3=[[px+fx*2.5+rx*.4*sd,1.75,pz+fz*2.5+rz*.4*sd],[px,1.45,pz]],P4=[[px+fx*6.4-rx*1.2*sd,3.6,pz+fz*6.4-rz*1.2*sd],[px-fx*5.5,1.4,pz-fz*5.5]];
    let cur=[eye,look];const P0=[eye,look];
    // camera moves circle round the runner (angle, distance and height eased separately), so a swing from front to back never passes overhead
    const orb=(A2,B2,k)=>{const ax=A2[0]-px,az=A2[2]-pz,bx=B2[0]-px,bz=B2[2]-pz,a0=Math.atan2(ax,az),a1=Math.atan2(bx,bz),da=Math.atan2(Math.sin(a1-a0),Math.cos(a1-a0)),an=a0+da*k,sw=Math.sin(Math.PI*k)*Math.min(1,Math.abs(da)/1.2),r=(Math.hypot(ax,az)+(Math.hypot(bx,bz)-Math.hypot(ax,az))*k)*(1-.68*sw);// tight to the runner mid-swing (stays over the path)
     return [px+Math.sin(an)*r,A2[1]+(B2[1]-A2[1])*k+.9*sw,pz+Math.cos(an)*r];};
    for(const [a,P,dur] of [[0,P1,.7],[BRK.look,P2,.8],[BRK.back,P3,.8],[BRK.enter,P4,.4],[BRK.go,P0,1]]){if(ge<a)break;const k=sm((ge-a)/dur);cur=[orb(cur[0],P[0],k),mix(cur[1],P[1],k)];}
    eye=[cur[0][0]+sh,cur[0][1]+sh,cur[0][2]];look=cur[1];}}
  if(fell)look=[px,Math.max(-6,py+.8),pz];
  if(W.camBack){eye=[px+fwd[0]*7,3.6,pz+fwd[1]*7];look=[px-fwd[0]*10,2,pz-fwd[1]*10];}// tests: look back at the chaser
  if(W.camFace&&A&&W.camFace.world){const q=W.camFace,ang=V.yawV+(q.a||0),c0=[px,py+(q.y||1.35),pz];eye=[c0[0]+Math.sin(ang)*(q.d||1.6),c0[1]+(q.dy||0),c0[2]+Math.cos(ang)*(q.d||1.6)];look=c0;}
  else if(W.camFace&&A){const hc=A.ch.facts.head.c,c0=rot(xf(A.rig,A.head,hc,1),V.yawV,px,py,pz),nf=rot(xf(A.rig,A.head,[0,0,1],0),V.yawV,0,0,0),sa=W.camFace.a||0,dd=W.camFace.d||.9,c=Math.cos(sa),sn=Math.sin(sa),fx=nf[0]*c-nf[2]*sn,fz=nf[2]*c+nf[0]*sn,fy=nf[1];
   const dy=W.camFace.dy||0;eye=[c0[0]+fx*dd,c0[1]+fy*dd+dy,c0[2]+fz*dd];look=[c0[0],c0[1]+dy,c0[2]];}// tests: close-up of the face along the head's own forward
  const aspect=L.w/Math.max(1,L.h);V.fovK+=((Rn.pow==='boost'?1.18:1)-V.fovK)*Math.min(1,dt*4);const fov=(aspect<1?1.18:.9)*V.fovK;
  const view=G.lookAt(eye,look),proj=G.perspective(fov,aspect,.1,240);
  R.begin({w:Math.round(L.w*L.k),h:Math.round(L.h*L.k),view,proj,eye,...sky});
  const segs=V.world.visible(Rn.seg,3);if(Rn.seg!==V.lastSeg){V.lastSeg=Rn.seg;V.world.forget(segs);}
  V.world.draw(segs,t,[px,pz],V.zone);V.world.drawCoins(segs,t,Rn.got);V.world.drawPows(segs,t,Rn.got,eye);
  // best-score flag
  if(bestDist>30)for(const sg of segs)if(bestDist>=sg.s0&&bestDist<sg.s1+T.CORNER){const lz=bestDist-sg.s0,f=T.DIRS[sg.dir],rt=T.DIRS[(sg.dir+1)%4],yaw=course.yaw(sg.dir);
   const bx=sg.x+f[0]*lz,bz=sg.z+f[1]*lz;R.draw(poleMesh,G.placeY(bx,0,bz,yaw));R.draw(poleMesh,G.placeY(bx+rt[0]*(T.HALF+.2),0,bz+rt[1]*(T.HALF+.2),yaw));
   R.draw(flagMesh,G.placeY(bx+rt[0]*(T.HALF+.2),0,bz+rt[1]*(T.HALF+.2),yaw+Math.sin(t*3)*.15),{tex:flagTex});}
  // the chasers: the one that's after you, and during a breather the one you just got away from (falls behind / off the path)
  // atF(d) -> [x,z,yaw,dy]: the path the chaser follows plus a height offset (going over an edge, dropping in, rising up);
  // stopAt: the Hovitos/Thuggee behind the leader pull up there (the edge they won't follow him over)
  const drawChaser=(k,atF,bd,mood,stopAt=Infinity)=>{const bp=atF(bd);if(bp[3]<-45)return;
   if(k==='boulder')V.world.drawBoulder(bp[0],2.3+bp[3],bp[1],bp[2],bd/2.3);
   else if(k==='cart')V.world.drawCart(bp[0],bp[1],bp[2],t,bd/.42,-bp[3]/9);
   else if(k==='cobra')V.world.drawCobra(atF,bd+1.2,t,mood==='caught'||mood==='roar'?1:mood==='close'?close:0);
   else if(k==='rats')V.world.drawRats(atF,bd+1.4,t,56);
   else if(k==='trex'&&trex&&V.trexRig){const c2=atF(bd-4.2),rg=V.trexRig,want=mood==='caught'||mood==='roar'||c2[3]<-.3?'attack':'run';
    if(rg.clip()!==want)rg.play(want,{fade:.15});if(rg.clip()==='run')rg.setSpeed(.75+Rn.v/SIM.VMAX*.55);rg.update(dt);R.drawChar(trex.ch,rg,G.placeY(c2[0],c2[3],c2[1],c2[2]));}
   else if(V.gang[k]){const C=crew[k];V.gang[k].forEach((rg,i)=>{const [ob,ol]=[[0,0],[1.5,-.85],[2.3,.9]][i],d0=bd+1-ob,dd=i?Math.min(d0,stopAt-(i-1)*1.2):d0,held=dd<d0-.05,c2=atF(dd),side=[Math.cos(c2[2]),-Math.sin(c2[2])];
     if(c2[3]<-45)return;const want=mood==='caught'&&i===0||mood==='roar'||held?'yes':'run';if(rg.clip()!==want)rg.play(want,{fade:.15});
     if(rg.clip()==='run')rg.setSpeed(.85+Rn.v/SIM.VMAX*.35+i*.04);rg.update(dt);const Mg=G.placeY(c2[0]+side[0]*ol,c2[3],c2[1]+side[1]*ol,c2[2]);R.drawChar(C.ch,rg,Mg);R.drawProp(C.prop,rg,Mg);});}};
  // the old chaser carries on at full speed past the corner and over the edge
  if(V.prev){const P=V.prev,e=t-P.t0;if(e>4.2)V.prev=null;else{const hd=(P.bd<0?P.old.s1+T.CORNER/2-14:P.bd)+P.v*e;
    if(!P.fellAt&&hd-P.old.s1>EDGE+.2)P.fellAt=t;drawChaser(P.kind,missAt(V,P,at),hd,'run',P.old.s1+T.CORNER-.8);}}
  // the new one: hidden until it bursts in (ENTRY), then on your heels
  const hideNew=ge>=0&&ge<BRK.enter;let atNew=d2=>{const q=at(d2);return [q[0],q[1],q[2],0];};
  if(ge>=BRK.enter&&ge<BRK.land&&V.gw){const o=entryOff(V.chaser,(ge-BRK.enter)/(BRK.land-BRK.enter),V.gw.side);atNew=d2=>{const q=at(d2);return [q[0]+Math.cos(q[2])*o.x,q[1]-Math.sin(q[2])*o.x,q[2],o.y];};}
  if(!hideNew&&(fresh<=1||intro))drawChaser(V.chaser,atNew,bd,caught?'caught':ge>=BRK.enter&&ge<BRK.go?'roar':'close');
  // the runner
  const ry=V.yawV+V.lean*.75+(ge>=0?V.turnY||0:0),M=bank(G.placeY(px,py,pz,ry),-V.lean*.35);R.drawChar(A.ch.ch,A.rig,M);R.drawProp(A.ch.prop,A.rig,M);if(A.face)R.drawProp(A.face,A.rig,M);
  if(A.braid){const a=xf(A.rig,A.head,A.braid.anchorBind,1),b=xf(A.rig,A.head,[0,0,-1],0);const wa=rot(a,ry,px,py,pz),wb=rot(b,ry,0,0,0),bl=Math.hypot(wb[0],wb[2])||1;
   const sph=[['spine_03',[0,0,-.03],.17],['spine_02',[0,0,-.02],.15],['Head',[0,.08,0],.115]].map(([n,o,r])=>{const q=rot(xf(A.rig,A.rig.jointIndex(n),A.ch.facts.pos[n].map((v,k2)=>v+o[k2]),1),ry,px,py,pz);return [q[0],q[1],q[2],r];});
   R.update(A.braidMesh,A.braid.step(wa,[wb[0]/bl,0,wb[2]/bl],dt,phase==='play'&&Rn.alive?24:0,sph));R.draw(A.braidMesh,G.placeY(0,0,0));}
  if(Rn.pow==='shield'||Rn.safeT>0&&Math.floor(t*10)%2)V.world.drawShield(px,py,pz,t);
  V.world.drawFires(segs,t,eye);V.world.drawTraps(segs,t);
  return {gap:hideNew?99:d-bd};}

 // ---------------------------------------------------------------- layout + frame loop
 let onFrame=null;
 s.frame((dt,t)=>{if(!W.manual)W.t=t;if(!!s.paused!==wasPaused){wasPaused=!!s.paused;music.hold(wasPaused||!!W.quiet);}if(!onFrame||W.manual)return;const n=Math.max(1,Math.round(W.speed));for(let i=0;i<n&&onFrame;i++)onFrame(Math.min(dt,1/20),t,i<n-1);});
 function layout(){const r=c.getBoundingClientRect(),fr=frame.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height),k=dpr();
  for(const e of [glc,hud]){e.style.left=(r.left-fr.left)+'px';e.style.top=(r.top-fr.top)+'px';e.style.width=w+'px';e.style.height=h+'px';}
  const pw=Math.round(w*k),ph=Math.round(h*k);if(hud.width!==pw||hud.height!==ph){hud.width=pw;hud.height=ph;}return {w,h,k,pw,ph};}

 // ---------------------------------------------------------------- one run
 const nameOf=i=>s.players[i]?.name||('Player '+(i+1));
 function run(pi,{partner=null,onTurn=null}={}){return new Promise(async resolve=>{
  await ready;if(!loaded){resolve({score:0,dist:0,coins:0,dead:'load',zone:0});return;}
  const course=T.makeCourse(s.seed+':'+(on?'net':'run')),Rn=SIM.makeRunner(course,{who:pi});
  Rn.a=2;Rn.chase=7;
  const A=makeActor(pi),V=makeView(course);V.chaser=chaserFor(V,V.zone);
  const best=store.best[nameOf(pi)]||{score:0,dist:0},bestDist=best.dist|0;let beatBest=false;
  const tut=store.runs<3,hintN={};let hint=null;
  const bot=SIM.makeBot(Rn,{skill:.97,rnd:seededRandom(s.seed+':auto:'+pi)});let auto=false;
  s.debug={engine:'templeRun',get save(){return save?{cost:save.cost}:null;},saveMe(){doSave(W.t);},get goals(){return store.slots.map(i=>({...goalAt(i),text:goalText(goalAt(i))}));},runner:Rn,course,faces:W.faces,get phase(){return W.phase;},autopilot(on2=true){auto=on2;},speed(k){W.speed=k;},manual(on2=true){W.manual=on2;},tick(dt=1/30){W.t+=dt;onFrame&&onFrame(dt,W.t,false);},kill(k='smack'){Rn.kill(k);},bodies,
   get zone(){return T.ZONES[V.zone].id;},get chaser(){return V.chaser;},warpZone(z){// jump ahead to straight z*ZLEN (tests)
    let sg=Rn.seg;while(sg.k<z*T.ZLEN){sg=course.follow(sg,sg.turn==='T'?'L':sg.turn);}Rn.seg=sg;Rn.a=1;Rn.hit=new Set();Rn.got=new Set();Rn.zone=sg.zone;setZone(V,sg.zone,W.t,{brk:false});V.trail.length=0;},
   nearZone(z){// tests: just before the corner into zone z, so the getaway plays for real
    let sg=Rn.seg;while(sg.k<z*T.ZLEN-1){sg=course.follow(sg,sg.turn==='T'?'L':sg.turn);}Rn.seg=sg;Rn.a=sg.len-16;Rn.hit=new Set(sg.obs);Rn.got=new Set();Rn.zone=sg.zone;Rn.chase=SIM.CHASE;setZone(V,sg.zone,W.t,{brk:false});V.chaserT=-9;V.trail.length=0;},
   get brk(){return Rn.brkT();},
   get trex(){return !!trex;},camBack(on2=true){W.camBack=on2;},camFace(o){W.camFace=o||null;},faceTune(q){W.faceTune=q;for(const A2 of W.actors||[])A2.face=faceProp(A2.body,A2.pi);},get bot(){if(on){auto=true;return 'drive';}return null;},store};
  let banner=null,title=null,phase='intro',pt=0,deadT=0,introLen=2.6,ended=false;music.setZone(course.get(0).zone);W.quiet=false;V.ge=-1;
  input=k=>{if(phase!=='play')return;{const e=Rn.brkT();if(e>=0&&e<BRK.go)return;}Rn.input(k);};// no moves while the getaway plays (nothing to dodge)
  // run stats for the goals; Save Me (1 player, not online): pay coins to get back up, cost doubles each time
  const st={jumps:0,slides:0,pows:0,idol:0,zones:1,clean:-1},goalsOn=!on;let saves=0,save=null,goalPop=null;
  const canSave=()=>!on&&!!s.solo&&!auto;
  const progress=g=>({dist:Rn.dist(),coins:Rn.coins,zone:st.zones,pows:st.pows,slides:st.slides,jumps:st.jumps,idol:st.idol,clean:st.clean<0?Rn.dist():st.clean}[g.k]||0);
  function checkGoals(t){if(!goalsOn)return;for(let i=0;i<3;i++){const g=goalAt(store.slots[i]);if(progress(g)>=g.n){store.coins+=g.reward;store.goals++;store.slots[i]=store.next++;saveStore(store);
    goalPop=[goalText(g),g.reward,t];SFX.goal();vibrate([15,30,15]);}}}
  function doSave(t){if(!save)return;const cost=save.cost,fromBank=Math.min(store.coins,cost);store.coins-=fromBank;Rn.coins-=cost-fromBank;saveStore(store);saves++;save=null;
   Rn.revive();phase='play';deadT=0;V.cd=-1;banner=['SAVED!',t];SFX.power();A.play('run',{fade:.15});}
  tapper=(x,y)=>{if(save&&phase==='dead'){const L=layout(),bw=Math.min(L.w*.62,260),bh=74,bx=(L.w-bw)/2,by=L.h*.5;if(x>bx-20&&x<bx+bw+20&&y>by-20&&y<by+bh+20)doSave(W.t);}};
  onFrame=(dt,t,skipDraw)=>{
   const L=layout();pt+=dt;W.phase=phase;
   if(phase==='intro'){if(pt>introLen*.55)A.play('run',{fade:.25});if(pt>=introLen){phase='play';}if(pt>.3)music.start();}
   music.setLevel(Rn.calm>0?0:Rn.v<11?0:Rn.v<13?1:Rn.v<15.5?2:3);
   if(phase==='play'){if(auto)bot(dt);tiltLane(Rn);Rn.step(dt);
    for(const e of Rn.events){if(e.t==='coin')coinSound(t);else if(SFX[e.t])SFX[e.t]();
     if(e.t==='jump')st.jumps++;else if(e.t==='slide')st.slides++;else if(e.t==='power'){st.pows++;if(e.kind==='idol')st.idol++;vibrate(25);}else if(e.t==='zone')st.zones++;else if(e.t==='stumble'&&st.clean<0)st.clean=Rn.dist();
     if(e.t==='jump')A.play('ninjaStart',{fade:.06,speed:2.6,at:.25,restart:true});
     else if(e.t==='slide')A.play('slideStart',{fade:.06,speed:2.2,restart:true});else if(e.t==='land')A.play('run',{fade:.1});
     else if(e.t==='stumble'){A.play('stumble',{fade:.05,speed:1.6,restart:true});V.shake=.5;vibrate(40);s.react(pi,'sad');}
     else if(e.t==='coin')s.setScores(scores());
     else if(e.t==='power'){banner=[{magnet:'COIN MAGNET!',boost:'SPEED BOOST!',shield:'SHIELD!',idol:'GOLDEN IDOL! COINS X2'}[e.kind],t];}
     else if(e.t==='shieldPop'){SFX.stumble();V.shake=.6;banner=['SHIELD SAVED YOU!',t];}
     else if(e.t==='turn'){V.shake=Math.max(V.shake,.08);hintN.turn=(hintN.turn||0)+1;onTurn&&onTurn(e.k,e.side);}
     else if(e.t==='zone'){setZone(V,e.zone,t,{old:course.get(Rn.seg.k-1),v:Rn.v});s.setScores(scores());}
     else if(e.t==='mile')banner=[e.m+' M!',t];}
    Rn.events.length=0;
    if(!beatBest&&bestDist>30&&Rn.dist()>bestDist){beatBest=true;SFX.best();banner=['NEW BEST!',t];vibrate([20,40,20]);}
    if(tut)hint=hintFor(Rn,hintN);
    checkGoals(t);
    // the getaway (see getawayActor): the old one goes over the edge (banner, crash, a boom far below), the music drops out while you
    // catch your breath and comes back with the new zone as the next chaser lands (zone title)
    {const ge=Rn.brkT(),was=V.ge??-1;
     if(ge>=0){if(was<BRK.land&&ge>=BRK.land){title=[T.ZONES[V.zone].name,CHASER_LINE[V.chaser],t];vibrate([30,30,30]);}
      if(was<BRK.enter&&ge>=BRK.enter)music.setZone(V.zone);
      getawayActor(A,V,ge,pi,dt);
      const P=V.prev;if(P&&P.fellAt&&!P.said){P.said=true;P.boomAt=t+1.1;banner=[ESCAPE[P.kind]||'GOT AWAY!',t];SFX.crash();vibrate(30);V.shake=Math.max(V.shake,.25);}
      if(P&&P.boomAt&&t>=P.boomAt){P.boomAt=0;SFX.boom();}}
     else V.ge=-1;
     const q=ge>=BRK.stop-.3&&ge<BRK.enter;if(q!==!!W.quiet){W.quiet=q;music.hold(q||!!s.paused);}}
    if(!Rn.alive){phase='dead';deadT=0;vibrate([60,40,90]);s.react(pi,'sad');V.shake=1;
     {const cost=100*2**saves;save=canSave()&&store.coins+Rn.coins>=cost?{cost,until:t+3.4}:null;}
     if(Rn.dead==='fall'||Rn.dead==='edge')A.play('hit',{fade:.1});else if(Rn.dead!=='caught')A.play('die',{fade:.08});else A.play('hit',{fade:.05});}
    if(Rn.alive){if(A.last==='ninjaStart'&&A.rig.done())A.play('ninjaAir',{fade:.1});if(A.last==='slideStart'&&A.rig.done())A.play('slide',{fade:.08});
     if(A.last==='slide'&&Rn.slide<=0)A.play('run',{fade:.14});if(A.last==='stumble'&&A.rig.done()){const e2=Rn.brkT();A.play(e2>=0&&e2<BRK.go?'idle':'run',{fade:.15});}
     if(A.last==='run')A.rig.setSpeed(.82+Rn.v/SIM.VMAX*.55);if(A.last==='jog'&&!(Rn.calm>0))A.play('run',{fade:.2});}
    partnerTick&&partnerTick(Rn,dt);}
   if(phase==='dead'){deadT+=dt;if(Rn.dead==='fall'||Rn.dead==='edge'){Rn.y-=dt*(4+deadT*14);Rn.a+=dt*Rn.v*Math.max(0,.6-deadT);}
    if(save&&t>save.until)save=null;
    partnerTick&&partnerTick(Rn,dt);if(deadT>3.2&&!save&&!ended){ended=true;finishRun();}}
   A.rig.update(dt);if(skipDraw)return;
   const g=drawView(V,A,Rn,{phase,pt,dt,t,L,intro:phase==='intro',bestDist,introLen});
   if(phase!=='dead'||Rn.dead==='fall'||Rn.dead==='edge')chaserSound(V.chaser,dt,g.gap,t);
   drawHud(L,{pi,Rn,phase,pt,partner,banner,title,now:t,best:Math.max(best.score|0,beatBest?Rn.score():0),hint,gap:g.gap,chaser:V.chaser,next:course.zoneAt((Math.floor(Rn.seg.k/T.ZLEN)+1)*T.ZLEN),save,goalPop,goals:goalsOn&&(phase==='intro'||phase==='dead'&&!save)?store.slots.map(i=>{const g=goalAt(i);return [goalText(g),Math.min(1,progress(g)/g.n)];}):null});};
  function scores(){const a=[0,0];a[pi]=Rn.score();return a;}
  function finishRun(){onFrame=null;input=null;
   const res={score:Rn.score(),dist:Math.floor(Rn.dist()),coins:Rn.coins,dead:Rn.dead,zone:Rn.zone,chaser:V.chaser,best:false};
   store.runs++;store.coins+=Math.max(0,Rn.coins);tapper=null;const nm=nameOf(pi),b=store.best[nm];if(!b||res.score>b.score){store.best[nm]={score:res.score,dist:res.dist};res.best=!!b||res.score>0;}saveStore(store);
   V.world.forget([]);resolve(res);}
 });}
 let partnerTick=null;
 // first-run hints: what to do about the next thing on the path
 // (each kind is explained 3 times per run; n.seen = obstacles already passed)
 function hintFor(Rn,n){if(!Rn.alive)return null;const seg=Rn.seg,v=Rn.v;n.seen??=new Set();
  if(Rn.inWindow()&&!Rn.turnQ&&(n.turn||0)<3)return {k:'turn',text:seg.turn==='T'?'SWIPE LEFT OR RIGHT':seg.turn==='R'?'SWIPE LEFT TO TURN':'SWIPE RIGHT TO TURN'};
  for(const o of seg.obs){const d=o.at-Rn.a;if(n.seen.has(o))continue;if(d>v*1.25)break;
   const k=T.SLIDE_KINDS.has(o.kind)?'down':o.kind==='block'?'side':'up';
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
  // zone progress: how far through this zone, and what comes next
  if(phase==='play'||phase==='intro'){const zk=Rn.seg.k%T.ZLEN,f=Math.min(1,(zk+Math.max(0,Rn.a)/Rn.seg.len)/T.ZLEN),pw=Math.min(L.w*.52,240)-10,yb=top+ph+5;
   x.fillStyle='rgba(0,0,0,.45)';x.fillRect(10,yb,pw,5);x.fillStyle='#ffb347';x.fillRect(10,yb,pw*f,5);
   x.font=`700 ${fs*.48}px "SC Nunito", system-ui, sans-serif`;x.fillStyle='rgba(255,236,200,.85)';if(o.next!=null)x.fillText('NEXT ▸ '+T.ZONES[o.next].name,12,yb+8);}
  if(partner){x.fillStyle='#9fd0ff';x.font=`700 ${fs*.6}px "SC Nunito", system-ui, sans-serif`;x.fillText(partner.text(),20,top+fs*3.4);}
  x.restore();
  if(Rn.pow){const tot=SIM.POW[Rn.pow],k2=Math.max(0,Rn.powT/tot),col={magnet:'#ff6a5a',boost:'#6aff7a',shield:'#7ac8ff',idol:'#ffd23a'}[Rn.pow],bw=Math.min(L.w*.4,170);
   x.fillStyle='rgba(0,0,0,.45)';x.fillRect(L.w-bw-12,top+44,bw,10);x.fillStyle=col;x.fillRect(L.w-bw-12,top+44,bw*k2,10);
   x.font=`800 ${fs*.6}px "SC Nunito", system-ui, sans-serif`;x.textAlign='right';x.textBaseline='bottom';x.fillText({magnet:'MAGNET',boost:'BOOST',shield:'SHIELD',idol:'IDOL  COINS X2'}[Rn.pow],L.w-12,top+42);}
  // zone title card
  if(title&&now-title[2]<2.8){const e=now-title[2],a=Math.min(1,e*3,(2.8-e)*2.5);x.save();x.globalAlpha=a;x.textAlign='center';x.textBaseline='middle';
   const y=L.h*.2,sc=1+Math.max(0,.25-e)*1.2;x.translate(L.w/2,y);x.scale(sc,sc);
   x.fillStyle='rgba(15,8,4,.6)';x.fillRect(-L.w/2,-fs*1.6,L.w,fs*3.4);
   {let tf=Math.min(fs*1.9,L.w*.09);x.font=`900 ${tf}px Impact, "Arial Black", sans-serif`;const tw=x.measureText(title[0]).width;if(tw>L.w*.9){tf*=L.w*.9/tw;x.font=`900 ${tf}px Impact, "Arial Black", sans-serif`;}}x.lineWidth=fs*.25;x.strokeStyle='#1a0c04';x.strokeText(title[0],0,-fs*.35);x.fillStyle='#ffd36a';x.fillText(title[0],0,-fs*.35);
   x.font=`800 ${Math.min(fs*.78,L.w*.04)}px "SC Nunito", system-ui, sans-serif`;x.fillStyle='#ffb0a0';x.fillText(title[1]+'  +'+SIM.ZONE_BONUS,0,fs*.95);x.restore();}
  if(banner&&now-banner[1]<1.6){const a=Math.min(1,(1.6-(now-banner[1]))*2);x.save();x.globalAlpha=a;x.textAlign='center';x.textBaseline='middle';let bf=fs*1.5;x.font=`900 ${bf}px Impact, "Arial Black", sans-serif`;const bw0=x.measureText(banner[0]).width;if(bw0>L.w*.92){bf*=L.w*.92/bw0;x.font=`900 ${bf}px Impact, "Arial Black", sans-serif`;}
   x.lineWidth=bf*.15;x.strokeStyle='#1a1006';const by=title&&now-title[2]<2.8?L.h*.34:L.h*.24;x.strokeText(banner[0],L.w/2,by);x.fillStyle='#fff3b0';x.fillText(banner[0],L.w/2,by);x.restore();}
  if(phase==='play'&&Rn.alive&&Rn.inWindow()&&!Rn.turnQ){const tt=Rn.seg.turn,a=.35+.25*Math.sin(performance.now()/120);x.save();x.globalAlpha=a;x.fillStyle='#fff7d0';x.font=`900 ${fs*2.4}px system-ui, sans-serif`;x.textAlign='center';x.textBaseline='middle';
   if(tt==='R'||tt==='T')x.fillText('⬅',L.w*.3,L.h*.62);if(tt==='L'||tt==='T')x.fillText('➡',L.w*.7,L.h*.62);x.restore();}
  if(o.hint&&phase==='play'){const h=o.hint,a=.75+.25*Math.sin(now*8);x.save();x.globalAlpha=a;x.textAlign='center';x.textBaseline='middle';
   const arrow={up:'⬆',down:'⬇',side:'⬅ ➡',turn:''}[h.k];const y=L.h*.74;
   if(arrow){x.font=`900 ${fs*2.2}px system-ui, sans-serif`;x.fillStyle='#fff';x.fillText(arrow,L.w/2,y-fs*1.6+(h.k==='up'?-Math.abs(Math.sin(now*6))*10:h.k==='down'?Math.abs(Math.sin(now*6))*10:0));}
   x.font=`900 ${fs*.95}px "SC Nunito", system-ui, sans-serif`;x.lineWidth=fs*.2;x.strokeStyle='rgba(0,0,0,.75)';x.strokeText(h.text,L.w/2,y);x.fillStyle='#ffe38a';x.fillText(h.text,L.w/2,y);x.restore();}
  if(phase==='dead'){const a=Math.min(1,pt);x.save();x.textAlign='center';x.textBaseline='middle';x.font=`900 ${fs*2.3}px Impact, "Arial Black", sans-serif`;
   x.lineWidth=fs*.3;x.strokeStyle='#2a0a04';const msg=Rn.dead==='caught'?CAUGHT[o.chaser]||'CAUGHT!':DEATH[Rn.dead]||'OUCH!';x.globalAlpha=a;x.strokeText(msg,L.w/2,L.h*.34);x.fillStyle='#ff8a3a';x.fillText(msg,L.w/2,L.h*.34);x.restore();}
  // goal done
  if(o.goalPop&&now-o.goalPop[2]<2.6){const e=now-o.goalPop[2],a=Math.min(1,e*4,(2.6-e)*2);x.save();x.globalAlpha=a;const w=Math.min(L.w*.86,380),gx=(L.w-w)/2,gy=L.h*.845-Math.max(0,.2-e)*60;
   panel(x,gx,gy,w,fs*2.4);x.textAlign='center';x.textBaseline='middle';x.font=`900 ${fs*.8}px "SC Nunito", system-ui, sans-serif`;x.fillStyle='#8aff9a';x.fillText('✔ GOAL!  +'+o.goalPop[1]+' coins',L.w/2,gy+fs*.75);
   x.font=`700 ${fs*.62}px "SC Nunito", system-ui, sans-serif`;x.fillStyle='#fff';x.fillText(o.goalPop[0],L.w/2,gy+fs*1.65);x.restore();}
  // goals list (intro and the end of a run)
  if(o.goals){const a=phase==='intro'?Math.min(1,pt*2,(2.6-pt)*3):Math.min(1,(pt-.6)*2);if(a>0){x.save();x.globalAlpha=a;const w=Math.min(L.w*.86,380),gx=(L.w-w)/2,lh=fs*1.25,gy=L.h*.62;
   panel(x,gx,gy,w,lh*3+fs*1.5);x.textAlign='left';x.textBaseline='middle';x.font=`900 ${fs*.6}px "SC Nunito", system-ui, sans-serif`;x.fillStyle='#ffd23a';x.fillText('GOALS   ● '+store.coins+' banked',gx+12,gy+fs*.65);
   o.goals.forEach(([txt,f],i)=>{const y=gy+fs*1.5+i*lh;x.fillStyle='rgba(0,0,0,.4)';x.fillRect(gx+12,y+lh*.42,w-24,4);x.fillStyle=f>=1?'#8aff9a':'#ffb347';x.fillRect(gx+12,y+lh*.42,(w-24)*f,4);
    x.font=`700 ${fs*.6}px "SC Nunito", system-ui, sans-serif`;x.fillStyle='#fff';x.fillText(txt,gx+12,y+lh*.1);});x.restore();}}
  // Save Me
  if(o.save&&phase==='dead'){const bw=Math.min(L.w*.62,260),bh=74,bx=(L.w-bw)/2,by=L.h*.5,left=Math.max(0,o.save.until-now)/3.4,pulse=1+.04*Math.sin(now*10);x.save();
   x.translate(L.w/2,by+bh/2);x.scale(pulse,pulse);x.translate(-L.w/2,-(by+bh/2));x.fillStyle='#1d6a2c';x.strokeStyle='#ffe38a';x.lineWidth=3;x.beginPath();x.roundRect(bx,by,bw,bh,16);x.fill();x.stroke();
   x.fillStyle='rgba(255,255,255,.25)';x.fillRect(bx+8,by+bh-12,(bw-16)*left,5);x.textAlign='center';x.textBaseline='middle';x.font=`900 ${fs*1.1}px Impact, "Arial Black", sans-serif`;x.fillStyle='#fff';x.fillText('SAVE ME!',L.w/2,by+bh*.36);
   x.font=`800 ${fs*.62}px "SC Nunito", system-ui, sans-serif`;x.fillStyle='#ffd23a';x.fillText('● '+o.save.cost+' coins  (you have '+(store.coins+Rn.coins)+')',L.w/2,by+bh*.7);x.restore();}
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
    return {d:Math.floor(R0.dist()),sc:R0.score(),al:R0.alive?1:0,k:R0.seg.k,a:+R0.a.toFixed(2),u:+R0.u.toFixed(2),y:+R0.y.toFixed(2),sl:R0.slide>0?1:0,ch:+R0.chase.toFixed(1),z:R0.zone,dd:R0.dead||'',pw:R0.pow||'',co:R0.coins,v:+R0.v.toFixed(1),b:+R0.brkT().toFixed(2)};},
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
   const mirror={seg:pc.get(0),a:0,u:0,y:0,slide:0,v:SIM.V0,alive:true,dead:null,chase:14,pow:null,safeT:0,coins:0,zone:pc.get(0).zone,got:{has:()=>false},
    dist(){return mirror.seg.s0+mirror.a;},score(){return their.sc;},zt:-1,now:0,brkT(){// their own getaway clock (snapshot b, moved on by its age), else the time since we saw their zone change
     if(Number.isFinite(their.b)){if(their.b<0)return -1;const e=their.b+Math.min(.4,(performance.now()-(their.at||0))/1000);return e<SIM.CALM?e:-1;}
     const e=mirror.now-mirror.zt;return mirror.zt>=0&&e<SIM.CALM?e:-1;}};
   const taken=c2=>{// coins behind them on their straight are gone; ones on earlier straights too
    return mirror.seg.coins.includes(c2)?c2.at<mirror.a+.3:mirror.seg.pows?.includes(c2)?c2.at<mirror.a+.3:true;};
   mirror.got={has:taken};
   const A=makeActor(1-me),V=makeView(pc);V.chaser=chaserFor(V,V.zone);A.play('run',{fade:0});let ptS=0,lastZ=pc.get(0).zone,endT=0;tiltBtn.style.display='none';
   onFrame=(dt,t,skipDraw)=>{const L=layout();ptS+=dt;mirror.now=t;
    while(ti<turns.length){const [k,side]=turns[ti];const sg=pc.get(k);if(!sg)break;pc.follow(sg,side);ti++;}
    const tgt=pc.get(their.k);
    if(tgt&&tgt!==mirror.seg){mirror.seg=tgt;mirror.a=their.a;}
    // move on between snapshots at their speed, then ease to the latest one
    const age=(performance.now()-(their.at||0))/1000;
    if(their.al){const ge=mirror.brkT(),vk=(their.v||SIM.V0)*(ge>=0?SIM.calmSpeed(ge):1);mirror.a+=dt*vk;const want=their.a+Math.min(.4,age)*vk;mirror.a+=(want-mirror.a)*Math.min(1,dt*6);}
    mirror.u+=(their.u-mirror.u)*Math.min(1,dt*14);mirror.y+=(their.y-mirror.y)*Math.min(1,dt*16);
    mirror.slide=their.sl?1:0;mirror.chase+=(their.ch-mirror.chase)*Math.min(1,dt*4);mirror.pow=their.pw||null;mirror.coins=their.co|0;mirror.v=their.v||SIM.V0;
    if(their.z!==lastZ){lastZ=their.z;const old=pc.get(mirror.seg.k-1);if(old)mirror.zt=t;setZone(V,their.z,t,{brk:!!old,old,v:mirror.v});music.setZone(their.z);}
    if(!their.al&&mirror.alive){mirror.alive=false;mirror.dead=their.dd||'smack';A.play(mirror.dead==='fall'||mirror.dead==='edge'||mirror.dead==='caught'?'hit':'die',{fade:.08});endT=t;}
    const mge=mirror.brkT();if(mge<0)V.ge=-1;
    if(mirror.alive&&mge>=0&&mge<BRK.go)getawayActor(A,V,mge,1-me,dt);
    else if(mirror.alive){const want=mirror.y>.05?'ninjaAir':mirror.slide?'slide':'run';if(A.last!==want)A.play(want,{fade:.12});if(want==='run')A.rig.setSpeed(.82+mirror.v/SIM.VMAX*.55);}
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
// roll a placement matrix about its own forward (Z) axis
function bank(M,a){if(!a)return M;const c=Math.cos(a),n=Math.sin(a),o=new Float32Array(M);for(let r=0;r<3;r++){const x=M[r],y=M[4+r];o[r]=x*c+y*n;o[4+r]=-x*n+y*c;}return o;}
function xf(rig,j,p,w){const s=rig.skin,o=j*12;return [s[o]*p[0]+s[o+1]*p[1]+s[o+2]*p[2]+s[o+3]*w,s[o+4]*p[0]+s[o+5]*p[1]+s[o+6]*p[2]+s[o+7]*w,s[o+8]*p[0]+s[o+9]*p[1]+s[o+10]*p[2]+s[o+11]*w];}
function rot(p,yaw,tx,ty,tz){const c=Math.cos(yaw),n=Math.sin(yaw);return [c*p[0]+n*p[2]+tx,p[1]+ty,-n*p[0]+c*p[2]+tz];}
// position + heading on the runner's trail at distance d (before the trail starts: straight back the way it began)
function trailAt(tr,d,course){
 if(!tr.length){const y=course.yaw(0);return [Math.sin(y)*d,Math.cos(y)*d,y];}
 if(d<=tr[0].d){const a=tr[0],b=tr[Math.min(1,tr.length-1)],yaw=b!==a?Math.atan2(b.x-a.x,b.z-a.z):course.yaw(course.segs[0]?.dir||0),back=d-a.d;return [a.x+Math.sin(yaw)*back,a.z+Math.cos(yaw)*back,yaw];}
 let i=tr.length-1;while(i>0&&tr[i-1].d>d)i--;const b=tr[i],a=tr[Math.max(0,i-1)];if(b.d<=d)return [b.x,b.z,Math.atan2(b.x-a.x,b.z-a.z)||0];
 const k=(d-a.d)/Math.max(1e-6,b.d-a.d);return [a.x+(b.x-a.x)*k,a.z+(b.z-a.z)*k,Math.atan2(b.x-a.x,b.z-a.z)];}

Object.assign(exports,{ballrun2p});
