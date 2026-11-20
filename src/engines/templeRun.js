// Boulder Run (Raiders) rebuilt as Temple Run in 3D. Engine key ballrun2p, game id raiders-ball-run.
// Indy (player 1's body) and Lara (player 2's) run a temple path over a jungle canyon with the boulder rolling behind:
// swipe up to jump, down to slide, left/right to turn at corners (and to change lane on the straights). Roots trip you
// (a stumble lets the boulder right up behind you; a second one soon after and it gets you), logs, arches, fire, gaps
// and rubble end the run. Score = metres + 10 per coin.
// 2 players on one phone: player 1 runs, then player 2 on the same course; higher score wins. 1P / board vs CPU: you run,
// then the CPU's run is played out of sight on the same course (src/engines/trun/sim.js bot) as the score to beat.
// Online: both run the same course at once on their own phones; each sees the other's metres; both finish on both scores.
// Files: trun/track.js (course), trun/sim.js (runner + bot), trun/world.js (3D world), trun/skel.js + render.js (3D
// characters, WebGL2), trun/props.js (hat, satchel, whip, holsters, backpack, braid). Art: assets/trun (trun:<name>).
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
const {makeWorld}=require("src/engines/trun/world.js");
const {makeMusic}=require("src/engines/trun/music.js");

const DEATH={smack:'SMACK!',trip:'TRIPPED!',burn:'TORCHED!',fall:'FELL!',edge:'OFF THE EDGE!',caught:'FLATTENED!'};
const SKY={skyTop:[.36,.52,.62],skyHor:[.78,.8,.68],skyBot:[.42,.52,.42],sun:nrm([.4,.8,.5]),sunCol:[1.5,1.32,1.05],sunGlow:[1,.85,.55],
 sky:[.48,.5,.42],ground:[.22,.2,.14],fog:[.66,.72,.62],fogNear:26,fogFar:95,hfog:.085};
function nrm(v){const l=Math.hypot(...v);return v.map(a=>a/l);}

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

 // ---------------------------------------------------------------- loading
 let loadMsg='Loading the temple…',loaded=false;
 const {USER_PORTRAITS,assetBytes}=require("src/data/userPortraits.js");
 const {gunzip}=require("src/engines/doom/wad.js");
 const skm=async n=>{const u=USER_PORTRAITS['trun:'+n];if(!u)throw new Error('missing trun:'+n);return S.parseSKM(await gunzip(await assetBytes(u)));};
 const pic=n=>new Promise(res=>{const u=USER_PORTRAITS[n];if(!u)return res(null);const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=u;});
 const owner=i=>s.players[i]?.owner;
 const bodyOf=i=>owner(i)==='Amber'?'lara':owner(i)==='Sean'?'indy':i===0?'indy':'lara';
 const bodies=[bodyOf(0),bodyOf(1)];if(bodies[0]===bodies[1]&&!s.solo)bodies[1]=bodies[0]==='indy'?'lara':'indy';
 let clips=null;const chars={};const palT=R.texture(PR.paletteCanvas(),{mips:false});
 async function loadChar(b){if(chars[b])return chars[b];const M=await skm(b);const tex={};await Promise.all(M.groups.map(async g=>{tex[g.tex]=await pic(g.tex);}));
  const ch=R.character(M,n=>tex[n]);const pp=PR.buildProps(b,M);const prop=R.skinnedProp({...pp.geo,tex:palT});chars[b]={M,ch,prop,facts:pp.facts};return chars[b];}
 const ready=(async()=>{clips=S.makeClips(await skm('anims'));const need=on?[bodies[me]]:s.solo?[bodies[0]]:bodies;for(const b of new Set(need))await loadChar(b);loaded=true;})()
  .catch(e=>{console.error(e);loadMsg='The temple failed to load: '+e.message;});

 // ---------------------------------------------------------------- a face decal glued to the head bone, painted from the player's portrait
 function faceProp(b,i){const F=chars[b].facts,h=F.head,j=F.jointIndex('Head'),cvf=document.createElement('canvas');cvf.width=cvf.height=256;
  const paint=()=>{const g=cvf.getContext('2d');g.clearRect(0,0,256,256);try{require("src/headFacts.js").drawFace(s,g,i,128,140,256,'normal',1,.56);}catch{}};paint();
  const P=[],N=[],U=[],J=[],I=[],NX=14,NY=12,ax=2.9,ay0=-1.15,ay1=1.05,rx=h.r[0]*1.07,ry=h.r[1]*1.02,rz=h.r[2]*1.06,cyy=h.c[1]-h.r[1]*.08;
  for(let yi=0;yi<=NY;yi++)for(let xi=0;xi<=NX;xi++){const u=xi/NX,v=yi/NY,th=(u-.5)*2*ax*.5,ph=ay1-(ay1-ay0)*v;
   const nx=Math.sin(th)*Math.cos(ph*.85),ny=Math.sin(ph*.85),nz=Math.cos(th)*Math.cos(ph*.85);
   P.push(h.c[0]+nx*rx,cyy+ny*ry,h.c[2]+nz*rz);N.push(nx,ny,nz);U.push(u,v);J.push(j);}
  for(let yi=0;yi<NY;yi++)for(let xi=0;xi<NX;xi++){const a=yi*(NX+1)+xi,b2=a+NX+1;I.push(a,b2,a+1,a+1,b2,b2+1);}
  const t=R.texture(cvf,{mips:true});(W.faces||(W.faces=[]))[i]=cvf;
  const prop=R.skinnedProp({pos:new Float32Array(P),nrm:new Float32Array(N),uv:new Float32Array(U),joint:new Uint8Array(J),idx:new Uint32Array(I),tex:t});
  // the portrait may still be loading: repaint a few times
  let n=0;const iv=setInterval(()=>{paint();R.retexture(t,cvf);if(++n>8)clearInterval(iv);},500);s.cleanup(()=>clearInterval(iv));
  return prop;}

 // ---------------------------------------------------------------- input
 // The course's 'right' (+u = world +X when running +Z) shows on the SCREEN's left (the camera looks down +Z), so
 // screen swipes/keys and the corner arrows are swapped here; the course and sim keep their own L/R.
 let input=null;const sw={id:null,x:0,y:0,t:0,fired:false};
 s.on(c,'pointerdown',e=>{sw.id=e.pointerId;sw.x=e.clientX;sw.y=e.clientY;sw.t=performance.now();sw.fired=false;try{c.setPointerCapture(e.pointerId);}catch{}});
 s.on(c,'pointermove',e=>{if(e.pointerId!==sw.id||sw.fired)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;if(Math.hypot(dx,dy)<24)return;sw.fired=true;
  input&&input(Math.abs(dx)>Math.abs(dy)?(dx<0?'right':'left'):(dy<0?'up':'down'));});
 s.on(c,'pointerup',e=>{if(e.pointerId===sw.id)sw.id=null;});
 s.on(window,'keydown',e=>{const k={ArrowUp:'up',KeyW:'up',Space:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'right',KeyA:'right',ArrowRight:'left',KeyD:'left'}[e.code];if(k&&input){e.preventDefault();input(k);}});

 // ---------------------------------------------------------------- sound
 const SFX={coin:()=>{voice(1320,.06,.035,'square');voice(1980,.09,.03,'square',{delay:.05});},jump:()=>noise(.16,.05,{f0:700,f1:2200}),slide:()=>noise(.35,.05,{f0:1600,f1:400}),
  turn:()=>noise(.1,.035,{f0:2400,f1:900}),stumble:()=>{voice(150,.18,.08,'square',{slide:.6});noise(.2,.08,{f0:600,f1:120});},
  dead:()=>{noise(.7,.16,{f0:400,f1:50});voice(90,.5,.09,'sawtooth',{slide:.4});},land:()=>noise(.06,.04,{f0:300,f1:120}),power:()=>{[660,880,1320].forEach((f,i)=>voice(f,.12,.04,'triangle',{delay:i*.06}));}};
 let rumbleT=0;function rumble(dt,close){rumbleT-=dt;if(rumbleT<=0){rumbleT=.22;const k=Math.max(0,Math.min(1,(16-close)/14));if(k>.02)noise(.3,.02+.07*k,{f0:180,f1:60});}}

 // ---------------------------------------------------------------- one run
 const W={phase:'load',t:0,speed:1};let onFrame=null;
 s.frame((dt,t)=>{W.t=t;if(!!s.paused!==wasPaused){wasPaused=!!s.paused;music.hold(wasPaused);}if(!onFrame||W.manual)return;const n=Math.max(1,Math.round(W.speed));for(let i=0;i<n&&onFrame;i++)onFrame(Math.min(dt,1/20),t,i<n-1);});
 function layout(){const r=c.getBoundingClientRect(),fr=frame.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height),k=dpr();
  for(const e of [glc,hud]){e.style.left=(r.left-fr.left)+'px';e.style.top=(r.top-fr.top)+'px';e.style.width=w+'px';e.style.height=h+'px';}
  const pw=Math.round(w*k),ph=Math.round(h*k);if(hud.width!==pw||hud.height!==ph){hud.width=pw;hud.height=ph;}return {w,h,k,pw,ph};}

 function run(pi,{partner=null}={}){return new Promise(async resolve=>{
  await ready;if(!loaded){resolve({score:0,dist:0,coins:0,dead:'load'});return;}
  const body=bodies[pi],ch=await loadChar(body),course=T.makeCourse(s.seed+':'+(on?'net':'run')),Rn=SIM.makeRunner(course,{who:pi});
  Rn.a=2;Rn.chase=7;
  const rig=S.makeRig(ch.M,clips),face=faceProp(body,pi);
  if(face){ch.ch.hide('eyes');}
  const world=makeWorld(R,course);
  const braid=body==='lara'?PR.makeBraid(ch.facts):null,braidMesh=braid?R.mesh({pos:braid.pos,nrm:braid.nrm,col:braid.col,idx:braid.idx},{dynamic:true}):null;
  const head=rig.jointIndex('Head');
  const bot=SIM.makeBot(Rn,{skill:.97,rnd:seededRandom(s.seed+':auto:'+pi)});let auto=false;
  s.debug={engine:'templeRun',runner:Rn,course,faces:W.faces,get phase(){return W.phase;},autopilot(on2=true){auto=on2;},speed(k){W.speed=k;},manual(on2=true){W.manual=on2;},tick(dt=1/30){W.t+=dt;onFrame&&onFrame(dt,W.t,false);},kill(k='smack'){Rn.kill(k);},bodies,
   get bot(){if(on){auto=true;return 'drive';}return null;}};
  let banner=null,fovK=1,lastSeg=null,phase='intro',pt=0,yawV=course.yaw(0),camYaw=yawV,lastClip='',deadT=0,introLen=2.6,ended=false,boulderD=-1;
  const trail=[];// recent runner world spots for the boulder
  const pos=()=>course.pos(Rn.seg,Rn.a,Rn.u);
  const play=(n,o)=>{if(lastClip!==n||o?.restart){rig.play(n,o);lastClip=n;}};
  play('idle',{fade:0});
  input=k=>{if(phase!=='play')return;Rn.input(k);};
  const shake={k:0};
  onFrame=(dt,t,skipDraw)=>{
   const L=layout();pt+=dt;W.phase=phase;
   if(phase==='intro'){if(pt>introLen*.55)play('run',{fade:.25});if(pt>=introLen){phase='play';}if(pt>.3)music.start();}
   music.setLevel(Rn.v<11?0:Rn.v<13?1:Rn.v<15.5?2:3);
   if(phase==='play'){if(auto)bot(dt);Rn.step(dt);
    for(const e of Rn.events){if(SFX[e.t])SFX[e.t]();if(e.t==='jump')play('ninjaStart',{fade:.06,speed:2.6,at:.25,restart:true});
     else if(e.t==='slide')play('slideStart',{fade:.06,speed:2.2,restart:true});else if(e.t==='land')play('run',{fade:.1});
     else if(e.t==='stumble'){play('stumble',{fade:.05,speed:1.6,restart:true});shake.k=.5;vibrate(40);s.react(pi,'sad');}
     else if(e.t==='coin')s.setScores(scores());
     else if(e.t==='power'){SFX.power();banner=[{magnet:'COIN MAGNET!',boost:'SPEED BOOST!',shield:'SHIELD!'}[e.kind],t];}
     else if(e.t==='shieldPop'){SFX.stumble();shake.k=.6;banner=['SHIELD SAVED YOU!',t];}else if(e.t==='turn')shake.k=Math.max(shake.k,.08);}
    Rn.events.length=0;
    if(!Rn.alive){phase='dead';deadT=0;vibrate([60,40,90]);s.react(pi,'sad');shake.k=1;
     if(Rn.dead==='fall'||Rn.dead==='edge')play('hit',{fade:.1});else if(Rn.dead!=='caught')play('die',{fade:.08});else play('hit',{fade:.05});}
    // clip upkeep
    if(Rn.alive){if(lastClip==='ninjaStart'&&rig.done())play('ninjaAir',{fade:.1});if(lastClip==='slideStart'&&rig.done())play('slide',{fade:.08});
     if(lastClip==='slide'&&Rn.slide<=0)play('run',{fade:.14});if(lastClip==='stumble'&&rig.done())play('run',{fade:.15});
     if(lastClip==='run')rig.setSpeed(.82+Rn.v/SIM.VMAX*.55);}
    partnerTick&&partnerTick(Rn);}
   if(phase==='dead'){deadT+=dt;if(Rn.dead==='fall'||Rn.dead==='edge'){Rn.y-=dt*(4+deadT*14);Rn.a+=dt*Rn.v*Math.max(0,.6-deadT);}
    if(deadT>2.6&&!ended){ended=true;finishRun();}}
   rig.update(dt);if(skipDraw)return;
   // world spots
   const [px,pz]=pos(),py=Rn.y;const d=Rn.dist();
   if(!trail.length||d-trail[trail.length-1].d>.25)trail.push({d,x:px,z:pz});if(trail.length>400)trail.shift();
   const tyaw=course.yaw(Rn.seg.dir);yawV=angLerp(yawV,tyaw,Math.min(1,dt*16));camYaw=angLerp(camYaw,tyaw,Math.min(1,dt*(phase==='play'?7:3)));
   // boulder: rolls along the trail CHASE metres behind; in the intro it bursts from the temple door
   let bd=d-Rn.chase;if(phase==='intro')bd=Math.min(d-Rn.chase,-14+pt*6.5);if(phase==='dead'&&(Rn.dead!=='fall'&&Rn.dead!=='edge'))bd=Math.min(d+3,(boulderD<0?d-Rn.chase:boulderD)+dt*12);
   boulderD=bd;const bp=trailAt(trail,bd,course);
   // camera: behind and above; lifts over the boulder when it is close
   const close=Math.max(0,Math.min(1,(8-(d-bd))/6)),fwd=[Math.sin(camYaw),Math.cos(camYaw)];
   let back=5.1-close*2.4,up=3.25+close*3.8;const sh=shake.k*(Math.random()-.5)*.35;shake.k=Math.max(0,shake.k-dt*2.5);
   let eye,look;
   if(phase==='intro'){// front of the runner (temple door behind him), then round to the behind view
    const k=Math.max(0,Math.min(1,(pt-introLen*.5)/(introLen*.5))),e2=k*k*(3-2*k),ang=camYaw+Math.PI*e2,dist=3.4+e2*1.3;
    eye=[px+Math.sin(ang)*dist,1.55+Math.sin(e2*Math.PI)*1.8+e2*1.2,pz+Math.cos(ang)*dist];look=[px+fwd[0]*e2*4,1.25-e2*.25,pz+fwd[1]*e2*4];}
   else{eye=[px-fwd[0]*back+sh,(phase==='dead'&&(Rn.dead==='fall'||Rn.dead==='edge')?2.8:py*.45+up)+sh,pz-fwd[1]*back];look=[px+fwd[0]*4.6,py*.3+1.05,pz+fwd[1]*4.6];}
   if(phase==='dead'&&(Rn.dead==='fall'||Rn.dead==='edge')){look=[px,Math.max(-6,py+.8),pz];}
   const aspect=L.w/Math.max(1,L.h);fovK+=((Rn.pow==='boost'?1.18:1)-fovK)*Math.min(1,dt*4);const fov=(aspect<1?1.18:.9)*fovK;
   const view=G.lookAt(eye,look),proj=G.perspective(fov,aspect,.1,240);
   if(phase!=='dead'||Rn.dead==='fall'||Rn.dead==='edge')rumble(dt,d-bd);
   R.begin({w:Math.round(L.w*L.k),h:Math.round(L.h*L.k),view,proj,eye,...SKY});
   const segs=world.visible(Rn.seg,3);if(Rn.seg!==lastSeg){lastSeg=Rn.seg;world.forget(segs);}world.draw(segs,t,[px,pz]);world.drawCoins(segs,t,Rn.got);world.drawPows(segs,t,Rn.got,eye);
   // boulder
   world.drawBoulder(bp[0],2.3,bp[1],bp[2],bd/2.3);
   // the runner (facing the way the path goes; intro: turned to face the camera first)
   const ry=yawV;
   const M=G.placeY(px,py,pz,ry);R.drawChar(ch.ch,rig,M);R.drawProp(ch.prop,rig,M);if(face)R.drawProp(face,rig,M);
   if(braid){const a=xf(rig,head,braid.anchorBind,1),b=xf(rig,head,[0,0,-1],0);const wa=rot(a,ry,px,py,pz),wb=rot(b,ry,0,0,0),bl=Math.hypot(wb[0],wb[2])||1;
    const sph=[['spine_03',[0,0,-.03],.17],['spine_02',[0,0,-.02],.15],['Head',[0,.08,0],.115]].map(([n,o,r])=>{const q=rot(xf(rig,rig.jointIndex(n),ch.facts.pos[n].map((v,k)=>v+o[k]),1),ry,px,py,pz);return [q[0],q[1],q[2],r];});
    R.update(braidMesh,braid.step(wa,[wb[0]/bl,0,wb[2]/bl],dt,phase==='play'&&Rn.alive?24:0,sph));R.draw(braidMesh,G.placeY(0,0,0));}
   if(Rn.pow==='shield'||Rn.safeT>0&&Math.floor(t*10)%2)world.drawShield(px,py,pz,t);
   world.drawFires(segs,t,eye);
   // HUD
   drawHud(L,pi,Rn,phase,pt,partner,banner,t);};
  function scores(){const a=[0,0];a[pi]=Rn.score();return a;}
  function finishRun(){onFrame=null;input=null;world.forget([]);resolve({score:Rn.score(),dist:Math.floor(Rn.dist()),coins:Rn.coins,dead:Rn.dead});}
 });}
 let partnerTick=null;

 // ---------------------------------------------------------------- HUD (2D canvas over the 3D one)
 function drawHud(L,pi,Rn,phase,pt,partner,banner,now){const x=hx,k=L.k;x.setTransform(k,0,0,k,0,0);x.clearRect(0,0,L.w,L.h);
  const top=Math.max(10,(fb&&fb.top)||0)+4,fs=Math.max(15,Math.min(26,L.w*.055));
  if(phase==='intro'&&pt>1.2){const a=Math.min(1,(pt-1.2)*2);x.save();x.globalAlpha=a;x.font=`900 ${fs*3}px Impact, "Arial Black", sans-serif`;x.textAlign='center';x.textBaseline='middle';
   x.lineWidth=fs*.35;x.strokeStyle='#2a1406';x.strokeText('RUN!',L.w/2,L.h*.36);x.fillStyle='#ffcf3a';x.fillText('RUN!',L.w/2,L.h*.36);x.restore();}
  // score panel top-left
  x.save();x.textAlign='left';x.textBaseline='top';
  const name=s.players[pi]?.name||'Player';
  panel(x,10,top,Math.min(L.w*.5,230),fs*3.3);
  x.font=`700 ${fs*.62}px "SC Nunito", system-ui, sans-serif`;x.fillStyle='#e8dcc0';x.fillText(name.toUpperCase(),20,top+6);
  x.font=`900 ${fs*1.25}px "SC Bangers", Impact, sans-serif`;x.fillStyle='#fff';x.fillText(String(Rn.score()).padStart(5,'0'),20,top+fs*.82);
  x.font=`700 ${fs*.66}px "SC Nunito", system-ui, sans-serif`;x.fillStyle='#ffd23a';x.fillText(`● ${Rn.coins}`,20,top+fs*2.3);x.fillStyle='#cfe7d0';x.fillText(`${Math.floor(Rn.dist())} m`,20+fs*3.2,top+fs*2.3);
  if(partner){x.fillStyle='#9fd0ff';x.font=`700 ${fs*.6}px "SC Nunito", system-ui, sans-serif`;x.fillText(partner.text(),20,top+fs*3.5);}
  x.restore();
  // power-up timer + banner
  if(Rn.pow){const tot=SIM.POW[Rn.pow],k2=Math.max(0,Rn.powT/tot),col={magnet:'#ff6a5a',boost:'#6aff7a',shield:'#7ac8ff'}[Rn.pow],bw=Math.min(L.w*.4,170);
   x.fillStyle='rgba(0,0,0,.45)';x.fillRect(L.w-bw-12,top+44,bw,10);x.fillStyle=col;x.fillRect(L.w-bw-12,top+44,bw*k2,10);
   x.font=`800 ${fs*.6}px "SC Nunito", system-ui, sans-serif`;x.textAlign='right';x.textBaseline='bottom';x.fillText({magnet:'MAGNET',boost:'BOOST',shield:'SHIELD'}[Rn.pow],L.w-12,top+42);}
  if(banner&&now-banner[1]<1.6){const a=Math.min(1,(1.6-(now-banner[1]))*2);x.save();x.globalAlpha=a;x.textAlign='center';x.textBaseline='middle';x.font=`900 ${fs*1.5}px Impact, "Arial Black", sans-serif`;
   x.lineWidth=fs*.22;x.strokeStyle='#1a1006';x.strokeText(banner[0],L.w/2,L.h*.24);x.fillStyle='#fff3b0';x.fillText(banner[0],L.w/2,L.h*.24);x.restore();}
  // turn arrows in the corner window
  if(phase==='play'&&Rn.alive&&Rn.inWindow()&&!Rn.turnQ){const tt=Rn.seg.turn,a=.35+.25*Math.sin(performance.now()/120);x.save();x.globalAlpha=a;x.fillStyle='#fff7d0';x.font=`900 ${fs*2.4}px system-ui, sans-serif`;x.textAlign='center';x.textBaseline='middle';
   if(tt==='R'||tt==='T')x.fillText('⬅',L.w*.3,L.h*.62);if(tt==='L'||tt==='T')x.fillText('➡',L.w*.7,L.h*.62);x.restore();}
  if(phase==='dead'){const a=Math.min(1,pt);x.save();x.textAlign='center';x.textBaseline='middle';x.font=`900 ${fs*2.3}px Impact, "Arial Black", sans-serif`;
   x.lineWidth=fs*.3;x.strokeStyle='#2a0a04';const msg=DEATH[Rn.dead]||'OUCH!';x.globalAlpha=a;x.strokeText(msg,L.w/2,L.h*.34);x.fillStyle='#ff8a3a';x.fillText(msg,L.w/2,L.h*.34);x.restore();}
  if(!loaded&&phase!=='play'){x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,L.h*.45,L.w,L.h*.1);x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font=`700 ${fs*.8}px system-ui`;x.fillText(loadMsg,L.w/2,L.h*.5);}}
 function panel(x,px,py,w,h){x.fillStyle='rgba(20,14,8,.55)';x.strokeStyle='rgba(255,210,120,.35)';x.lineWidth=1.5;x.beginPath();x.roundRect(px,py,w,h,12);x.fill();x.stroke();}

 // loading screen while waiting
 onFrame=()=>{const L=layout();hx.setTransform(L.k,0,0,L.k,0,0);hx.clearRect(0,0,L.w,L.h);hx.fillStyle='#16201a';hx.fillRect(0,0,L.w,L.h);hx.fillStyle='#ffcf3a';hx.textAlign='center';hx.textBaseline='middle';
  hx.font='900 34px Impact, "Arial Black", sans-serif';hx.fillText('BOULDER RUN',L.w/2,L.h*.42);hx.fillStyle='#d8ccb0';hx.font='600 16px system-ui';hx.fillText(loadMsg,L.w/2,L.h*.5);};
 await ready;
 if(!loaded){await s.pass(0,loadMsg,'OK');s.finish([0,0],'Boulder Run could not load.');return;}
 s.hint('Swipe up = jump · down = slide · left/right = turn at corners, change lane on straights. Coins +10. Roots trip you: two trips close together and the boulder gets you.');

 // ---------------------------------------------------------------- the match
 const res=[null,null];
 if(on){// both run at once
  let theirs={d:0,sc:0,al:1},theirFin=null;
  const nf=netField(s,{hz:6,pack:()=>W.mine?{d:Math.floor(W.mine.dist()),sc:W.mine.score(),al:W.mine.alive?1:0}:{d:0,sc:0,al:1},unpack:(i,d)=>{if(d&&Number.isFinite(d.d))theirs=d;}});
  const fin=nf?nf.remoteDone().then(v=>{theirFin=v==null?theirs.sc:v|0;}):Promise.resolve();
  partnerTick=Rn=>{W.mine=Rn;nf&&nf.push&&0;};
  const name=s.players[1-me]?.name||'Them';
  if(nf)await nf.start('run');
  res[me]=await run(me,{partner:{text:()=>`${name}: ${theirs.d} m${theirs.al?'':' (out)'}`}});
  nf&&nf.finish(res[me].score);
  onFrame=()=>{const L=layout();hx.setTransform(L.k,0,0,L.k,0,0);hx.clearRect(0,0,L.w,L.h);hx.fillStyle='rgba(0,0,0,.55)';hx.fillRect(0,0,L.w,L.h);hx.fillStyle='#fff';hx.textAlign='center';hx.font='700 18px system-ui';hx.fillText(`Waiting for ${name}… (${theirs.d} m)`,L.w/2,L.h/2);};
  await fin;res[1-me]={score:theirFin|0};
 }else{
  const order=s.solo?[0]:[0,1];
  for(const pi of order){
   if(!s.solo){const prev=pi>0?`${s.players[0]?.name}: ${res[0].dist} m, ${res[0].coins} coins = ${res[0].score} points. `:'';
    if(!await s.pass(pi,`${prev}${s.players[pi]?.name||'Player '+(pi+1)}, run! Swipe up to jump, down to slide, left/right to turn.`,'Ready',{countdown:0}))return;}
   res[pi]=await run(pi);s.setScores(res.map(r=>r?r.score:0));}
  if(s.solo){// the CPU (or the solo target) runs the same course out of sight
   const sk=cpu?cpuSkill(s):.65,bot=SIM.simulate(s.seed+':run',{skill:.8+sk*.16,rnd:seededRandom(s.seed+':cpu')});res[1]={score:bot.score,dist:bot.dist,coins:bot.coins,dead:bot.dead};}
 }
 const sc=[res[0]?.score|0,res[1]?.score|0];s.setScores(sc);
 const nm=i=>s.players[i]?.name||('Player '+(i+1));
 const line=i=>res[i]?.dist!=null?`${nm(i)} ${res[i].dist} m · ${res[i].coins} coins = ${sc[i]}`:`${nm(i)} ${sc[i]}`;
 s.finish(sc,sc[0]===sc[1]?`Dead heat! ${line(0)} / ${line(1)}`:`${nm(sc[0]>sc[1]?0:1)} outran the boulder! ${line(0)} · ${line(1)}`);
}

// ---------------------------------------------------------------- helpers
function angLerp(a,b,k){let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return a+d*k;}
function xf(rig,j,p,w){const s=rig.skin,o=j*12;return [s[o]*p[0]+s[o+1]*p[1]+s[o+2]*p[2]+s[o+3]*w,s[o+4]*p[0]+s[o+5]*p[1]+s[o+6]*p[2]+s[o+7]*w,s[o+8]*p[0]+s[o+9]*p[1]+s[o+10]*p[2]+s[o+11]*w];}
function rot(p,yaw,tx,ty,tz){const c=Math.cos(yaw),n=Math.sin(yaw);return [c*p[0]+n*p[2]+tx,p[1]+ty,-n*p[0]+c*p[2]+tz];}
// position + heading on the runner's trail at distance d (before the start: back along the first straight)
function trailAt(tr,d,course){if(!tr.length||d<=tr[0].d){const s0=course.segs[0]||{x:0,z:0,dir:0};const base=tr.length?tr[0]:{d:0,x:0,z:0};const back=d-base.d;return [base.x+Math.sin(course.yaw(0))*back,base.z+Math.cos(course.yaw(0))*back,course.yaw(0)];void s0;}
 let i=tr.length-1;while(i>0&&tr[i-1].d>d)i--;const b=tr[i],a=tr[Math.max(0,i-1)];if(b.d<=d)return [b.x,b.z,Math.atan2(b.x-a.x,b.z-a.z)||0];
 const k=(d-a.d)/Math.max(1e-6,b.d-a.d);return [a.x+(b.x-a.x)*k,a.z+(b.z-a.z)*k,Math.atan2(b.x-a.x,b.z-a.z)];}

Object.assign(exports,{ballrun2p});
