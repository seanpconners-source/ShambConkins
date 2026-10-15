// Hole.it (Rocket, Android/iOS) rebuilt: real 3D tray of glossy props, a grey hole
// with a growth arc and "Size N", goal cards that pop in, the level's stopwatch (4:00 like the
// real game; hand levels carry their own), floating joystick, boosters (unlocked from Level 3)
// and the "Bravo!" finish. Like the original there is no intro screen: the level is there at
// once and the clock waits for the first drag. Two players take turns on the exact same level;
// the shared level number is saved in the profile and moves on once somebody clears it.
// Camera, HUD proportions and hole speed are measured from the owner's Oct 14 phone video
// (Galaxy Fold inner screen, 1080x1200): the HUD scales with the screen width like the real UI.
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const {sound,tone,vibrate}=require("src/audio.js");
const {createRenderer,affine}=require("src/engines/holeIt/gl.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {KINDS,HEAD_FACE,C,geo,add,rbox}=require("src/engines/holeIt/meshes.js");
const {buildLevel}=require("src/engines/holeIt/levels.js");
const {createSim,stepSim,useBoost,sizeProgress,goalTotal,goalNeed,qaxis,qmul}=require("src/engines/holeIt/sim.js");

const BOOST_ORDER=['grow','speed','magnet','freeze'];
// The video's Level 2 has no booster bar; Level 3 shows the potion (x1) and three padlocks. When the other three
// unlock in the real game is not on video yet (all four are open by Level 30): one every three levels is a guess.
const BOOST_UNLOCK={grow:3,speed:6,magnet:9,freeze:12};
// Camera from the video: Unity-style fixed 60° vertical field of view (a taller screen sees the same depth, less width),
// looking down at 64°, centred on the hole, 9.53 units away at Size 1 (rim = 11.8% of the screen height) and pulling
// back as the hole grows (∝ r^0.37: rim 16% of the height at Size 3, 18.5% at Size 4).
const FOV=60*Math.PI/180,PITCH=64*Math.PI/180;
const cameraFor=h=>({fov:FOV,dist:9.53*Math.pow(h.r/.5,.37)});
const BOOST_HELP={grow:'Potion: +1 hole size',speed:'Lightning: faster hole for 10 s',magnet:'Magnet: pulls nearby props in for 8 s',freeze:'Freeze: stops the clock for 10 s'};
function currentHoleLevel(){return Math.max(1,Math.floor(Number(store.profile?.holeItLevel)||1));}
function hexRGB(h){return C(h);}
const fmt=t=>{t=Math.max(0,Math.ceil(t));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');};
function trayWalls(def){const g=geo(),W=def.W,D=def.D,t=.45,h=.42,wall=C('#b2bccc');
 add(g,rbox(W+t*2,h,t,.08),{at:[0,0,-D/2-t/2]},wall);add(g,rbox(W+t*2,h,t,.08),{at:[0,0,D/2+t/2]},wall);
 add(g,rbox(t,h,D,.08),{at:[-W/2-t/2,0,0]},wall);add(g,rbox(t,h,D,.08),{at:[W/2+t/2,0,0]},wall);
 // grass islands: a low wall all round (their grass top is drawn by the renderer)
 for(const [x0,z0,x1,z1] of def.islands||[]){const w=x1-x0,d=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2;add(g,rbox(w,h,t,.08),{at:[cx,0,z0+t/2]},wall);add(g,rbox(w,h,t,.08),{at:[cx,0,z1-t/2]},wall);add(g,rbox(t,h,d-t*2,.08),{at:[x0+t/2,0,cz]},wall);add(g,rbox(t,h,d-t*2,.08),{at:[x1-t/2,0,cz]},wall);}
 return g;}
const baseKind=k=>String(k).replace(/\+$/,'');
function rr(x,X,Y,W,H,R){x.beginPath();x.moveTo(X+R,Y);x.arcTo(X+W,Y,X+W,Y+H,R);x.arcTo(X+W,Y+H,X,Y+H,R);x.arcTo(X,Y+H,X,Y,R);x.arcTo(X,Y,X+W,Y,R);x.closePath();}
function outlined(x,text,X,Y,size,fill='#fff',stroke='#1a1d3a',align='center',weight=900){x.font=`${weight} ${size}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;x.textAlign=align;x.textBaseline='middle';x.lineJoin='round';x.lineWidth=Math.max(2,size*.2);x.strokeStyle=stroke;x.strokeText(text,X,Y);x.fillStyle=fill;x.fillText(text,X,Y);}
function drawStar(x,cx,cy,r,rot=0){x.save();x.translate(cx,cy);x.rotate(rot*.2);x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr2=i%2?r*.48:r;x.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2);}x.closePath();
 const g=x.createLinearGradient(0,-r,0,r);g.addColorStop(0,'#fff27a');g.addColorStop(1,'#ff9a1e');x.fillStyle=g;x.fill();x.lineWidth=Math.max(1.5,r*.14);x.strokeStyle='#a2520e';x.stroke();x.restore();}
// Points-level goal card: star + "got/target" + green bar, in the same card style as the item cards.
function drawScoreCard(x,cd,g,pulse,inflight){const grd=x.createLinearGradient(0,cd.y,0,cd.y+cd.h);grd.addColorStop(0,'#6476f0');grd.addColorStop(1,'#3a44b4');rr(x,cd.x,cd.y,cd.w,cd.h,8);x.fillStyle=grd;x.fill();x.strokeStyle='#a9b3ff';x.lineWidth=1.5;x.stroke();
 drawStar(x,cd.x+22,cd.y+cd.h*.42,15*(1+pulse*.25));const shown=Math.max(0,g.got-inflight),done=g.got>=g.need;
 outlined(x,`${shown}/${g.need}`,cd.x+40+(cd.w-46)/2,cd.y+cd.h*.36,12,'#fff','#141a33',undefined,800);
 const bx=cd.x+40,bw=cd.w-48,by=cd.y+cd.h*.6;rr(x,bx,by,bw,8,4);x.fillStyle='#1d235acc';x.fill();rr(x,bx,by,Math.max(4,bw*Math.min(1,shown/g.need)),8,4);x.fillStyle=done?'#39d353':'#5ee06a';x.fill();
 if(done){x.fillStyle='#39d353';x.beginPath();x.arc(cd.x+cd.w-10,cd.y+10,8,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=2.4;x.beginPath();x.moveTo(cd.x+cd.w-14,cd.y+10);x.lineTo(cd.x+cd.w-11,cd.y+13);x.lineTo(cd.x+cd.w-6,cd.y+7);x.stroke();}}
function greenButton(x,X,Y,W,H,label,t=0){const p=1+Math.sin(t*4)*.03;x.save();x.translate(X+W/2,Y+H/2);x.scale(p,p);x.translate(-W/2,-H/2);
 rr(x,0,0,W,H,H*.3);x.fillStyle='#f6c531';x.fill();rr(x,3,3,W-6,H-6,H*.26);const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#74e85a');g.addColorStop(1,'#25a52e');x.fillStyle=g;x.fill();
 rr(x,7,6,W-14,H*.3,H*.15);x.fillStyle='#ffffff40';x.fill();outlined(x,label,W/2,H/2+1,H*.42,'#fff','#1d6b21');x.restore();}
function boosterIcon(x,id,cx,cy,s){x.save();x.translate(cx,cy);x.lineJoin='round';
 if(id==='grow'){x.fillStyle='#c46bff';x.beginPath();x.arc(0,s*.15,s*.32,0,7);x.fill();x.fillStyle='#e9d7ff';x.fillRect(-s*.09,-s*.42,s*.18,s*.3);x.fillStyle='#ff5fd2';x.beginPath();x.arc(0,s*.2,s*.22,0,Math.PI);x.fill();x.fillStyle='#ffffffaa';x.beginPath();x.arc(-s*.12,s*.05,s*.07,0,7);x.fill();}
 else if(id==='speed'){x.fillStyle='#ffd23a';x.strokeStyle='#c46a00';x.lineWidth=s*.06;x.beginPath();x.moveTo(s*.12,-s*.45);x.lineTo(-s*.25,s*.06);x.lineTo(-s*.02,s*.06);x.lineTo(-s*.14,s*.45);x.lineTo(s*.27,-s*.08);x.lineTo(s*.03,-s*.08);x.closePath();x.stroke();x.fill();}
 else if(id==='magnet'){x.lineWidth=s*.2;x.strokeStyle='#e8344a';x.beginPath();x.arc(0,-s*.02,s*.25,Math.PI,0,true);x.stroke();x.strokeStyle='#5ee06a';x.beginPath();x.moveTo(-s*.25,-s*.02);x.lineTo(-s*.25,-s*.3);x.moveTo(s*.25,-s*.02);x.lineTo(s*.25,-s*.3);x.stroke();x.fillStyle='#f2f2f2';x.fillRect(-s*.35,-s*.42,s*.2,s*.13);x.fillRect(s*.15,-s*.42,s*.2,s*.13);}
 else{x.strokeStyle='#bff3ff';x.lineWidth=s*.08;x.lineCap='round';for(let i=0;i<6;i++){x.rotate(Math.PI/3);x.beginPath();x.moveTo(0,0);x.lineTo(0,-s*.4);x.moveTo(0,-s*.24);x.lineTo(-s*.1,-s*.34);x.moveTo(0,-s*.24);x.lineTo(s*.1,-s*.34);x.stroke();}}
 x.restore();}

async function holeIt(s){
 const [c]=s.canvas(390,720,{fill:true});s.body.classList.add('drag-arena-body','holeit-body');const FB=fullBleed(s,{bg:'#1b2033'});
 const frame=c.parentElement;frame.style.position='relative';c.style.touchAction='none';
 const mk=()=>{const e=document.createElement('canvas');e.style.cssText='position:absolute;pointer-events:none;left:0;top:0';frame.appendChild(e);return e;};
 const glc=mk(),hud=mk(),hx=hud.getContext('2d');
 const R=(()=>{try{return createRenderer(glc);}catch(e){console.warn(e);return null;}})();
 if(!R){s.status('Hole.it needs WebGL, which this browser has turned off.');await s.pass(0,'Hole.it needs WebGL (3D graphics), which this browser has turned off. The round is skipped as a tie.','OK');s.finish([0,0],'Hole.it could not start: WebGL is unavailable.');return;}
 s.cleanup(()=>R.dispose());
 const dpr=()=>Math.min(2,window.devicePixelRatio||1);
 const level=currentHoleLevel(),def=buildLevel(level);
 R.setWalls(trayWalls(def));
 // Goal-card thumbnails rendered by the same 3D renderer.
 const thumbs={};
 function thumb(k){if(thumbs[k])return thumbs[k];const kd=KINDS[k],size=96,cv=document.createElement('canvas');cv.width=cv.height=size;
  const ext=Math.max(kd.r*1.25,kd.h*.62),d=ext*3.1,data=new Float32Array(16);affine(data,0,[0,kd.h/2,0],qaxis(0,1,0,.5),1,kd.h/2);data.set([1,1,1,1],12);
  R.setCamera(size,size,1,[0,kd.h/2+d*.55,d*.84],[0,kd.h/2,0],.62);R.render({clear:[0,0,0,0],hole:{hidden:true,x:0,z:0,r:.01},groups:[{kind:k,data,count:1}]});
  cv.getContext('2d').drawImage(glc,0,0,size,size);return thumbs[k]=cv;}
 // Head-token faces: both players' portraits on one atlas.
 const atlas=document.createElement('canvas');atlas.width=256;atlas.height=128;
 const paintAtlas=()=>{const ax=atlas.getContext('2d');ax.clearRect(0,0,256,128);for(let i=0;i<2;i++){try{s.sprite(ax,i,64+i*128,64,118,{exact:true});}catch{}}R.setHeadTexture(atlas);};
 for(const g of def.goals)if(KINDS[baseKind(g.k)])thumb(baseKind(g.k));
 if(def.items.some(it=>it.k==='head')){paintAtlas();for(const ms of [400,1500,4000])setTimeout(()=>{if(s.alive)paintAtlas();},ms);}

 const results=[null,null];let turn=null,finishResolve=null,contact=null,keys={};
 const boostOn=id=>level>=BOOST_UNLOCK[id],showBoosts=level>=BOOST_UNLOCK.grow;
 // ---- layout helpers (CSS px) ----
 // Every HUD size below is the video's pixel size on its 1080-wide screen times u (the real UI scales with the width).
 const L={};
 function layout(){const W=s.W,H=s.H,u=Math.min(W,H*.95)/1080;L.W=W;L.H=H;L.u=u;
  L.level={x:32*u,y:123*u,w:176*u,h:55*u};L.timer={x:W/2-103*u,y:100*u,w:205*u,h:95*u};
  // keep clear of the floating Pause/Exit pills (top-right, ~124 px wide, FB.top tall)
  const pills=W-128;if(L.timer.x+L.timer.w>pills)L.timer.x=Math.max(L.level.x+L.level.w+8,pills-L.timer.w);
  const n=def.goals.length,cw=Math.min(113*u,(W-40*u)/Math.max(1,n)-12*u),ch=cw*150/113;L.cards=def.goals.map((g,i)=>({x:32*u+i*(cw+12*u),y:208*u,w:g.k==='score'?cw*2.5:cw,h:ch}));
  // the real bar sits 76 px (of 1080) right of centre, leaving room for its pause button bottom-left
  const bs=125*u,gap=13.5*u,tw=bs*4+gap*3,by=Math.min(H-50*u,H-38)-bs;L.boost=BOOST_ORDER.map((id,i)=>({id,x:W/2+76*u-tw/2+i*(bs+gap),y:by,w:bs,h:bs}));
  L.cont={x:W/2-Math.max(70,190*u)/2,y:H*.72,w:Math.max(70,190*u),h:Math.max(34,82*u)};}
 const inside=(p,r)=>r&&p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
 function syncCanvases(){const w=c.clientWidth,h=c.clientHeight,l=c.offsetLeft,t=c.offsetTop,k=dpr();for(const e of [glc,hud]){e.style.left=l+'px';e.style.top=t+'px';e.style.width=w+'px';e.style.height=h+'px';}
  const hw=Math.round(s.W*k),hh=Math.round(s.H*k);if(hud.width!==hw)hud.width=hw;if(hud.height!==hh)hud.height=hh;}

 // ---- per-kind instance buffers ----
 const byKind={};for(const it of def.items)byKind[it.k]=(byKind[it.k]||0)+1;
 const inst={};for(const k of Object.keys(byKind))inst[k]={data:new Float32Array(byKind[k]*16+16),count:0};
 let shadowData=new Float32Array(def.items.length*4+4);
 // ---- camera ----
 const cam={x:def.start.x,z:def.start.z,dist:0};
 function renderPlay(sim,t,dt=1/60){const h=sim.hole,W=s.W,H=s.H,cf=cameraFor(h);if(!cam.dist)cam.dist=cf.dist;
  // frame-rate independent smoothing (same feel at 30, 60 or 120 fps); the video keeps the hole within a few px of the centre
  const kf=1-Math.exp(-dt*18),kz=1-Math.exp(-dt*3.2);cam.dist+=(cf.dist-cam.dist)*kz;cam.x+=(h.x-cam.x)*kf;cam.z+=(h.z-cam.z)*kf;
  // size arc: ease the shown value toward size+progress so it fills smoothly and rolls over on a size-up
  const want=(h.size-1)+sizeProgress(sim),gap=want-turn.arcV;turn.arcV+=Math.sign(gap)*Math.min(Math.abs(gap),Math.abs(gap)*(1-Math.exp(-dt*5))+dt*.35);
  const tz=cam.z,eye=[cam.x,cam.dist*Math.sin(PITCH),tz+cam.dist*Math.cos(PITCH)];R.setCamera(W,H,dpr(),eye,[cam.x,0,tz],cf.fov);
  for(const k in inst)inst[k].count=0;let ns=0;const vis=cam.dist*(1.1+Math.max(1,W/H))+3;const heads=[];
  for(const it of sim.items){if(it.state===2)continue;if(Math.abs(it.x-cam.x)>vis||Math.abs(it.z-tz)>vis*1.3)continue;
   if(it.moved||!it.m){it.m=it.m||new Float32Array(12);let q=it.q;if(it.wob>0&&it.state===0){const dx=h.x-it.x,dz=h.z-it.z,l=Math.hypot(dx,dz)||1;q=qmul(qaxis(dz/l,0,-dx/l,(it.lean||0)+it.wob*.03*Math.sin(t*4+it.i)),q);}
    affine(it.m,0,[it.x,it.cy,it.z],q,it.sc||1,it.h0/2);it.moved=it.wob>0;}
   const b=inst[it.k];b.data.set(it.m,b.count*16);const glow=it.k==='bomb'?1.15+.3*Math.sin(t*7):1;b.data[b.count*16+12]=glow;b.data[b.count*16+13]=it.k==='bomb'?1:glow;b.data[b.count*16+14]=it.k==='bomb'?1:glow;b.data[b.count*16+15]=1;b.count++;
   if(it.k==='head')heads.push(it);
   if(it.state!==1&&it.cy-it.h/2<.6){shadowData[ns*4]=it.x+it.r*.14;shadowData[ns*4+1]=it.z-it.r*.1;shadowData[ns*4+2]=it.r*1.18;shadowData[ns*4+3]=.36;ns++;}}
  const rings=turn.rings.map(g=>({x:h.x,z:h.z,r:h.r*(1.3+g.t*2.4),a:Math.max(0,1-g.t/.75)*.95,color:[1,.8,.22],thick:.05}));
  if(turn.boom){const u=turn.boom.t;for(const [k,c] of [[1,[1,.55,.1]],[.7,[1,.85,.3]]])rings.push({x:turn.boom.x,z:turn.boom.z,r:h.r*(1.2+u*7*k),a:Math.max(0,1-u/1.1),color:c,thick:.12});}
  if(sim.active.magnet>0)rings.push({x:h.x,z:h.z,r:h.r*(1.6+(t*2%1)*2.2),a:.35*(1-(t*2%1)),color:[.45,1,.55],thick:.04});
  R.render({clear:[.2,.55,.18,1],hole:{x:h.x,z:h.z,r:h.r},tray:[-def.W/2,-def.D/2,def.W/2,def.D/2],islands:def.islands,floorColor:hexRGB(def.floor),groups:Object.entries(inst).map(([kind,b])=>({kind,data:b.data,count:b.count})),
   shadows:{data:shadowData,count:ns},rings,arc:{x:h.x,z:h.z,r:h.r*1.4,progress:turn.arcV-Math.floor(turn.arcV),start:.6,color:[1,.78,.16]},heads:heads.map(it=>({m:headMatrix(it),rect:it.i%2?[.5,0,.5,1]:[0,0,.5,1]}))});}
 function headMatrix(it){const m=it.m,f=HEAD_FACE,ct=Math.cos(f.tilt),st=Math.sin(f.tilt),sz=f.size;
  // local face transform: translate(c) * rotX(tilt) * scale(sz), shifted by the item's pivot (h/2)
  const loc=[sz,0,0,0, 0,ct*sz,st*sz,0, 0,-st*sz,ct*sz,0, f.c[0],f.c[1],f.c[2],1];
  const M=[m[0],m[4],m[8],0, m[1],m[5],m[9],0, m[2],m[6],m[10],0, m[3],m[7],m[11],1];
  const o=new Float32Array(16);for(let col=0;col<4;col++)for(let r=0;r<4;r++){let v=0;for(let k=0;k<4;k++)v+=M[k*4+r]*loc[col*4+k];o[col*4+r]=v;}return o;}

 // ---- HUD ----
 function drawHUD(sim,t){const k=dpr(),x=hx,W=s.W,H=s.H;x.setTransform(k,0,0,k,0,0);x.clearRect(0,0,W,H);layout();const u=L.u,TT=sim.def.time;
  // level pill
  const lv=L.level;rr(x,lv.x,lv.y,lv.w,lv.h,12*u);x.fillStyle='#2a3170';x.fill();x.strokeStyle='#6f7cdc';x.lineWidth=Math.max(1,3*u);x.stroke();outlined(x,`Level ${level}`,lv.x+lv.w/2,lv.y+lv.h/2+1,Math.max(9,30*u),'#fff','#141a33',undefined,800);
  // timer: dark pill, alarm clock over its left end, mm:ss and a green bar that runs down with the clock
  const tm=L.timer,frozen=sim.active.freeze>0,cr=35*u,ccx=tm.x+cr*.95,ccy=tm.y+38*u;rr(x,tm.x,tm.y,tm.w,tm.h,14*u);x.fillStyle=frozen?'#1f5c8a':'#2a3170';x.fill();x.strokeStyle=frozen?'#9be8ff':'#6f7cdc';x.lineWidth=Math.max(1,3*u);x.stroke();
  x.fillStyle='#ffb41e';for(const sx of [-1,1]){x.beginPath();x.arc(ccx+sx*cr*.62,ccy-cr*.78,cr*.28,0,7);x.fill();}x.beginPath();x.arc(ccx,ccy,cr,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(ccx,ccy+1,cr*.74,0,7);x.fill();
  x.strokeStyle='#2a3170';x.lineWidth=Math.max(1.2,5*u);x.lineCap='round';x.beginPath();x.moveTo(ccx,ccy);x.lineTo(ccx,ccy-cr*.48);x.stroke();const ang=-Math.PI/2+(1-sim.time/TT)*Math.PI*2;x.strokeStyle='#e8344a';x.beginPath();x.moveTo(ccx,ccy);x.lineTo(ccx+Math.cos(ang)*cr*.42,ccy+Math.sin(ang)*cr*.42);x.stroke();x.lineCap='butt';
  outlined(x,fmt(sim.time),tm.x+tm.w*.62,tm.y+36*u,Math.max(11,44*u),sim.time<15&&!frozen&&Math.floor(t*4)%2?'#ff7a7a':'#fff','#141a33');
  const bx0=tm.x+12*u,bw=tm.w-24*u,by0=tm.y+72*u,bh=Math.max(3,14*u);rr(x,bx0,by0,bw,bh,bh/2);x.fillStyle='#141a40';x.fill();rr(x,bx0,by0,Math.max(bh,bw*Math.max(0,sim.time/TT)),bh,bh/2);x.fillStyle=frozen?'#6fd8ff':'#2bd42b';x.fill();
  // player chip
  const who=s.players[turn.player],nx=W-12,ny=FB.top+14;outlined(x,who.name,nx,ny,12,turn.player?'#ff9ccc':'#8fc2ff','#141a33','right',800);
  // the score bar is hidden in full bleed: show the target to beat on the second turn
  if(turn.player===1&&results[0]){const r0=results[0];outlined(x,r0.won?`Beat ${r0.time.toFixed(1)} s`:`Beat ${r0.goals} items`,nx,ny+16,11,'#ffe27a','#141a33','right',800);}
  // goal cards pop in one after another as the level appears (as in the video), then sit in a row under the level pill
  sim.goals.forEach((g,i)=>{const cd=L.cards[i];if(!cd)return;const ap=Math.max(0,Math.min(1,(turn.t-.1-i*.22)/.3));if(ap<=0)return;const pop=ap<1?Math.sin(ap*Math.PI/2)*(1+.18*Math.sin(ap*Math.PI)):1;
   x.save();x.translate(cd.x+cd.w/2,cd.y+cd.h/2);x.scale(pop,pop);x.translate(-cd.x-cd.w/2,-cd.y-cd.h/2);
   if(g.k==='score'){drawScoreCard(x,cd,g,turn.cardPulse[i]||0,turn.inflightPts);x.restore();return;}
   const cu=cd.w/113,grd=x.createLinearGradient(0,cd.y,0,cd.y+cd.h);grd.addColorStop(0,'#6f80ee');grd.addColorStop(1,'#4652c4');rr(x,cd.x,cd.y,cd.w,cd.h,9*cu);x.fillStyle=grd;x.fill();x.strokeStyle='#b4bdff';x.lineWidth=Math.max(1,3*cu);x.stroke();
   const ix=cd.x+9*cu,iy=cd.y+10*cu,iw=cd.w-18*cu;rr(x,ix,iy,iw,iw*.98,7*cu);x.fillStyle='#9eabf0';x.fill();x.strokeStyle='#5361cf';x.lineWidth=Math.max(1,2*cu);x.stroke();
   const pulse=turn.cardPulse[i]>0?1+turn.cardPulse[i]*.25:1,ts=iw*1.02*pulse;x.drawImage(thumb(baseKind(g.k)),ix+iw/2-ts/2,iy+iw*.49-ts/2,ts,ts);if(g.k.endsWith('+'))outlined(x,'BIG',cd.x+cd.w-14*cu,cd.y+12*cu,Math.max(7,20*cu),'#ffe27a','#141a33',undefined,900);
   const left=Math.max(0,g.need-g.got)+(turn.inflight[g.k]||0),ly=cd.y+cd.h-24*cu;
   if(left===0){const r=17*cu;x.fillStyle='#2bd42b';x.beginPath();x.arc(cd.x+cd.w/2,ly,r,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=Math.max(1.5,5*cu);x.beginPath();x.moveTo(cd.x+cd.w/2-r*.5,ly);x.lineTo(cd.x+cd.w/2-r*.12,ly+r*.38);x.lineTo(cd.x+cd.w/2+r*.5,ly-r*.4);x.stroke();}
   else outlined(x,String(left),cd.x+cd.w/2,ly,Math.max(9,30*cu),'#fff','#141a33',undefined,900);x.restore();});
  if(level===1&&sim.elapsed<4&&!turn.moved){const cd=L.cards.at(-1),bx=10,by=cd.y+cd.h+8;rr(x,bx,by,150,34,8);x.fillStyle='#ffffffee';x.fill();x.font='800 11px system-ui,sans-serif';x.fillStyle='#2a2f6a';x.textAlign='left';x.fillText('Collect these items',bx+10,by+12);x.fillText('to complete level!',bx+10,by+25);}
  // hole label (sized with the hole, like the real one) + heading arrow + popups
  const h=sim.hole,c0=R.project(h.x,0,h.z),rimPx=Math.abs(R.project(h.x+h.r*1.3,0,h.z).x-c0.x)*2,lp=R.project(h.x,0,h.z+h.r*1.42);outlined(x,`Size ${h.size}`,lp.x,lp.y+rimPx*.05,Math.max(8,rimPx*.115),'#ffc81e','#3a2a06');
  const st=turn.phase==='play'?toStick():{x:0,z:0},sm=Math.hypot(st.x,st.z);
  if(sm>.05){const ux=st.x/sm,uz=st.z/sm,a=R.project(h.x+ux*h.r*1.55,0,h.z+uz*h.r*1.55),b=R.project(h.x+ux*h.r*1.85,0,h.z+uz*h.r*1.85),dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,w=rimPx*.06;
   x.fillStyle='#c9ced8d0';x.beginPath();x.moveTo(b.x,b.y);x.lineTo(a.x-dy/l*w,a.y+dx/l*w);x.lineTo(a.x+dy/l*w,a.y-dx/l*w);x.closePath();x.fill();}
  for(const p of turn.popups){const pp=R.project(p.x,h.r*.4,p.z),a=Math.max(0,1-p.t/.9);x.globalAlpha=a;outlined(x,p.text,pp.x+p.dx*u*2.6,pp.y-20*u*2.6-p.t*170*u,Math.max(10,(p.big?52:40)*u),p.big?'#ffe27a':'#fff','#1a1d3a');x.globalAlpha=1;}
  // boosters (from Level 3): gold-ringed purple buttons, padlocks on the ones not unlocked yet, red count badge
  if(showBoosts)for(const b of L.boost){const on=boostOn(b.id),n=sim.charges[b.id],act=sim.active[b.id]>0,cx=b.x+b.w/2,cy=b.y+b.h/2,r=b.w/2;
   if(act){x.fillStyle='#ffe27a55';x.beginPath();x.arc(cx,cy,r+5+Math.sin(t*8)*2,0,7);x.fill();}
   const ring=x.createLinearGradient(0,cy-r,0,cy+r);ring.addColorStop(0,'#ffd84a');ring.addColorStop(1,'#d8920e');x.fillStyle=ring;x.beginPath();x.arc(cx,cy,r,0,7);x.fill();
   const bg=x.createRadialGradient(cx-r*.3,cy-r*.4,2,cx,cy,r);bg.addColorStop(0,on?'#7d74ff':'#6f78d8');bg.addColorStop(1,on?'#3b2fb0':'#38409a');x.fillStyle=bg;x.beginPath();x.arc(cx,cy,r*.86,0,7);x.fill();
   if(!on){lockIcon(x,cx,cy,r*.9);continue;}
   x.globalAlpha=n||act?1:.45;boosterIcon(x,b.id,cx,cy,r*1.25);x.globalAlpha=1;
   if(act){const tot=b.id==='speed'?10:b.id==='magnet'?8:10;x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(cx,cy,r-2,-Math.PI/2,-Math.PI/2+Math.PI*2*sim.active[b.id]/tot);x.stroke();}
   const br=r*.36,bxc=cx+r*.62,byc=cy+r*.66;x.fillStyle=n?'#e8235a':'#555a70';x.beginPath();x.arc(bxc,byc,br,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=Math.max(1,br*.18);x.stroke();outlined(x,String(n),bxc,byc+.5,Math.max(8,br*1.2),'#fff','#00000000',undefined,900);}
  // flying goal icons / stars
  for(const f of turn.flyers){const cd=L.cards[f.gi];if(!cd)continue;const u=Math.min(1,f.t/f.dur),e=u*u*(3-2*u),tx=cd.x+(sim.def.mode==='score'?22:cd.w/2),ty=cd.y+cd.w*.42,cx=(f.x0+tx)/2+f.wob,cy=Math.min(f.y0,ty)-60;
   const px=(1-e)*(1-e)*f.x0+2*(1-e)*e*cx+e*e*tx,py=(1-e)*(1-e)*f.y0+2*(1-e)*e*cy+e*e*ty,sz=30-12*e;
   if(f.k==='score'||!KINDS[baseKind(f.k)]||sim.def.mode==='score')drawStar(x,px,py,sz*.45,u*6);else x.drawImage(thumb(baseKind(f.k)),px-sz/2,py-sz/2,sz,sz);}
  // joystick
  // joystick: the video's ring (radius 78 px of 1080) and knob (42 px) that travels 37 px; full speed at full travel
  if(contact&&turn.phase==='play'){const o=contact.origin,p=contact.point,dx=p.x-o.x,dy=p.y-o.y,l=Math.hypot(dx,dy),m=Math.min(l,stickTravel()),kx=l?o.x+dx/l*m:o.x,ky=l?o.y+dy/l*m:o.y,R1=Math.max(26,78*u),R2=Math.max(14,42*u);
   x.fillStyle='#ffffff2a';x.strokeStyle='#ffffffb0';x.lineWidth=Math.max(1.5,4*u);x.beginPath();x.arc(o.x,o.y,R1,0,7);x.fill();x.stroke();
   x.fillStyle='#ffffff40';x.beginPath();x.arc(kx,ky,R2,0,7);x.fill();x.stroke();x.fillStyle='#ffffff70';for(let i=0;i<4;i++){const a=i*Math.PI/2,cx=kx+Math.cos(a)*R2*.55,cy=ky+Math.sin(a)*R2*.55,w=R2*.16;x.beginPath();x.moveTo(cx+Math.cos(a)*w,cy+Math.sin(a)*w);x.lineTo(cx-Math.cos(a)*w-Math.sin(a)*w,cy-Math.sin(a)*w+Math.cos(a)*w);x.lineTo(cx-Math.cos(a)*w+Math.sin(a)*w,cy-Math.sin(a)*w-Math.cos(a)*w);x.closePath();x.fill();}}
  else if(turn.phase==='play'&&!turn.moved&&level===1){const cx=W/2,cy=H*.78,tt=t*1.6,a=Math.sin(tt),bx=cx+Math.cos(tt)*60/(1+a*a),byy=cy+Math.sin(tt)*Math.cos(tt)*60/(1+a*a);
   x.strokeStyle='#a78bfa';x.lineWidth=8;x.globalAlpha=.75;x.beginPath();for(let i=0;i<=64;i++){const u=i/64*Math.PI*2,s2=Math.sin(u),d=1+s2*s2;const px=cx+Math.cos(u)*60/d,py=cy+Math.sin(u)*Math.cos(u)*60/d;i?x.lineTo(px,py):x.moveTo(px,py);}x.closePath();x.stroke();x.globalAlpha=1;
   x.font='34px system-ui';x.textAlign='center';x.fillText('👆',bx+6,byy+18);}
  // end card
  if(turn.phase==='end'){const tt=turn.endT;x.fillStyle=`rgba(8,10,24,${Math.min(.72,tt*1.6)})`;x.fillRect(0,0,W,H);
   if(turn.boom&&tt<.6){x.fillStyle=`rgba(255,${Math.round(180-tt*200)},60,${(.6-tt)*1.4})`;x.fillRect(0,0,W,H);}
   if(sim.won){const sc=Math.min(1,tt*3.5),bounce=1+Math.sin(Math.min(1,tt*3)*Math.PI)*.18;x.save();x.translate(W/2,H*.24);x.scale(sc*bounce,sc*bounce);x.rotate(-.06);
     const g=x.createLinearGradient(0,-30,0,30);g.addColorStop(0,'#fff27a');g.addColorStop(1,'#ff9a1e');outlined(x,'Bravo!',0,0,Math.min(64,W*.16),g,'#7a2a10');x.restore();
     for(const f of turn.confetti){x.fillStyle=f.c;x.save();x.translate(f.x,f.y);x.rotate(f.a);x.fillRect(-4,-2,8,4);x.restore();}
     outlined(x,`Cleared in ${sim.clearTime.toFixed(1)} s`,W/2,H*.4,22,'#fff','#141a33');outlined(x,`${fmt(sim.time)} left on the clock`,W/2,H*.4+30,15,'#c9d0ff','#141a33',undefined,800);}
   else if(sim.bombed){outlined(x,'BOOM!',W/2,H*.24,Math.min(64,W*.16),'#ffb02a','#5a1008');outlined(x,'You swallowed a bomb!',W/2,H*.33,18,'#fff','#141a33');outlined(x,`${goalTotal(sim)} / ${goalNeed(sim)} items collected`,W/2,H*.4,18,'#c9d0ff','#141a33',undefined,800);}
   else{outlined(x,'Time’s up!',W/2,H*.24,Math.min(54,W*.14),'#ff8a7a','#4a1010');outlined(x,`${goalTotal(sim)} / ${goalNeed(sim)} items collected`,W/2,H*.4,20,'#fff','#141a33');}
   if(tt>.7)greenButton(x,L.cont.x,L.cont.y,L.cont.w,L.cont.h,'Next',t);}}
 function lockIcon(x,cx,cy,s){x.save();x.translate(cx,cy);x.lineJoin='round';x.strokeStyle='#e8a812';x.lineWidth=s*.13;x.beginPath();x.arc(0,-s*.12,s*.22,Math.PI,0);x.lineTo(s*.22,s*.02);x.moveTo(-s*.22,s*.02);x.lineTo(-s*.22,-s*.12);x.stroke();
  const g=x.createLinearGradient(0,-s*.05,0,s*.42);g.addColorStop(0,'#ffe066');g.addColorStop(1,'#f0a812');rr(x,-s*.36,-s*.04,s*.72,s*.5,s*.1);x.fillStyle=g;x.fill();x.strokeStyle='#b87808';x.lineWidth=s*.05;x.stroke();
  x.fillStyle='#8a5a06';x.beginPath();x.arc(0,s*.17,s*.07,0,7);x.fill();x.fillRect(-s*.03,s*.17,s*.06,s*.13);x.restore();}

 // ---- input ----
 const stickTravel=()=>Math.max(12,37*(L.u||.4));
 const toStick=()=>{if(!contact)return {x:0,z:0};const dx=contact.point.x-contact.origin.x,dy=contact.point.y-contact.origin.y,l=Math.hypot(dx,dy);if(l<3)return {x:0,z:0};const m=Math.min(1,l/stickTravel());return {x:dx/l*m,z:dy/l*m};};
 const release=ev=>{if(contact?.id!==ev.pointerId)return;contact=null;s.release?.(ev);};
 s.on(c,'pointerdown',ev=>{if(s.paused||!turn)return;const p=s.pointer(ev);ev.preventDefault();layout();
  if(turn.phase==='end'){if(turn.endT>.7&&(inside(p,L.cont)||p.y>H50()))endTurn();return;}
  if(showBoosts)for(const b of L.boost)if(Math.hypot(p.x-b.x-b.w/2,p.y-b.y-b.h/2)<b.w/2+4){if(useBoost(turn.sim,b.id)){sound('pickup');vibrate(15);}else sound('tap');return;}
  if(contact)return;contact={id:ev.pointerId,origin:p,point:p};turn.moved=true;s.capture?.(ev);});
 const H50=()=>s.H*.5;
 s.on(c,'pointermove',ev=>{if(contact?.id!==ev.pointerId)return;contact.point=s.pointer(ev);});
 s.on(c,'pointerup',release);s.on(c,'pointercancel',release);s.on(c,'lostpointercapture',release);
 const KEYS={ArrowLeft:'l',a:'l',ArrowRight:'r',d:'r',ArrowUp:'u',w:'u',ArrowDown:'d',s:'d'};
 s.on(document,'keydown',ev=>{const k=KEYS[ev.key];if(k){keys[k]=true;if(turn)turn.moved=true;ev.preventDefault();}else if((ev.key==='Enter'||ev.key===' ')&&turn){if(turn.phase==='end'&&turn.endT>.7)endTurn();}else if(turn?.phase==='play'&&'1234'.includes(ev.key)&&ev.key.length===1)useBoost(turn.sim,BOOST_ORDER[Number(ev.key)-1]);});
 s.on(document,'keyup',ev=>{const k=KEYS[ev.key];if(k)keys[k]=false;});
 s.resetOnPause?.(()=>{contact=null;keys={};});s.on(window,'blur',()=>{contact=null;keys={};});
 s.hint(`Drag anywhere: your first touch is the joystick (the clock starts with your first drag). Swallow every prop shown on the cards before the ${fmt(def.time)} clock runs out. Smaller things fit first; every prop you eat fills the yellow arc and grows the hole (Size N). Towers fall over when you eat their base. Boosters (from Level 3, one each per turn): Potion +1 size, Lightning speed, Magnet pull, Snowflake stops the clock. Keyboard: arrows/WASD, 1–4 boosters.`);

 function endTurn(){if(turn.phase!=='end'||turn.closing)return;turn.closing=true;sound('tap');finishResolve?.();}
 let lastPop=0;
 let frameMs=0;
 s.frame((dt,t)=>{if(!turn)return;const t0=performance.now();syncCanvases();turn.t+=dt;
  const sim=turn.sim;
  if(turn.phase==='play'){const st=toStick();const kx=(keys.r?1:0)-(keys.l?1:0),kz=(keys.d?1:0)-(keys.u?1:0);const input=contact?st:{x:kx,z:kz};
   stepSim(sim,dt,turn.moved?input:{x:0,z:0});if(!turn.moved){sim.time=sim.def.time;sim.elapsed=0;}
   for(const e of sim.events.splice(0)){
    if(e.type==='eat'){const now=performance.now();if(now-lastPop>45&&store.profile?.settings.sound){lastPop=now;tone(520+Math.min(700,turn.combo*18),.05,.03,'sine');}turn.combo++;turn.comboT=.6;
     if(turn.popups.length<28)turn.popups.push({x:sim.hole.x,z:sim.hole.z,t:0,dx:(Math.random()-.5)*sim.hole.r*60,text:'+'+(e.xp||1),big:false});
     // goal props (or stars, on points levels) fly from the hole up into their card
     if(e.goal&&turn.flyers.length<40){const hp=R.project(sim.hole.x,0,sim.hole.z),gi=sim.def.mode==='score'?0:sim.goals.findIndex(g=>g.k===e.k);if(gi>=0){turn.flyers.push({k:e.k,gi,x0:hp.x+(Math.random()-.5)*20,y0:hp.y-10,t:0,dur:.55+Math.random()*.2,pts:e.xp||1,wob:(Math.random()-.5)*120});if(sim.def.mode==='score')turn.inflightPts+=e.xp||1;else turn.inflight[e.k]=(turn.inflight[e.k]||0)+1;}}
}
    else if(e.type==='size'){turn.rings.push({t:0});sound('unlock');vibrate(25);}
    else if(e.type==='topple'){if(store.profile?.settings.sound){tone(130,.22,.05,'triangle');tone(90,.3,.04,'sine');}vibrate(20);}
    else if(e.type==='boost'&&e.id==='grow')turn.rings.push({t:0});
    else if(e.type==='win'){turn.phase='end';turn.endT=0;sound('win');vibrate(40);s.react?.(turn.player,'win',2);turn.confetti=Array.from({length:70},()=>({x:Math.random()*s.W,y:-Math.random()*s.H*.6,vy:120+Math.random()*160,vx:(Math.random()-.5)*60,a:Math.random()*6,va:(Math.random()-.5)*8,c:['#ffd23a','#ff5fb4','#5ee06a','#3ad0ff','#ff7a3a'][Math.floor(Math.random()*5)]}));}
    else if(e.type==='bomb'){turn.phase='end';turn.endT=0;turn.boom={x:e.x,z:e.z,t:0};sound('lose');if(store.profile?.settings.sound){tone(70,.6,.12,'sawtooth');tone(45,.9,.1,'square');}vibrate(400);s.react?.(turn.player,'sad',2);turn.confetti=[];}
    else if(e.type==='lose'){turn.phase='end';turn.endT=0;sound('lose');s.react?.(turn.player,'sad',2);turn.confetti=[];}}
   if(turn.comboT>0){turn.comboT-=dt;if(turn.comboT<=0)turn.combo=0;}
   s.setScores(scoresWith(turn.player,sim));
  }else{turn.endT+=dt;stepSim(sim,dt,{x:0,z:0});sim.events.length=0;for(const f of turn.confetti){f.y+=f.vy*dt;f.x+=f.vx*dt;f.a+=f.va*dt;}}
  for(const f of turn.flyers){f.t+=dt;if(f.t>=f.dur&&!f.done){f.done=true;turn.cardPulse[f.gi]=1;if(turn.sim.def.mode==='score')turn.inflightPts-=f.pts;else turn.inflight[f.k]=Math.max(0,(turn.inflight[f.k]||0)-1);if(store.profile?.settings.sound)tone(980+f.gi*60,.04,.02,'triangle');}}turn.flyers=turn.flyers.filter(f=>!f.done);
  if(turn.boom)turn.boom.t+=dt;
  for(const p of turn.popups)p.t+=dt;turn.popups=turn.popups.filter(p=>p.t<.9);for(const g of turn.rings)g.t+=dt;turn.rings=turn.rings.filter(g=>g.t<.8);for(let i=0;i<turn.cardPulse.length;i++)turn.cardPulse[i]=Math.max(0,turn.cardPulse[i]-dt*4);
  renderPlay(sim,turn.t,dt);drawHUD(sim,turn.t);
  s.status(`${s.players[turn.player].name} · Level ${level} · ${goalTotal(sim)}/${goalNeed(sim)} items · Size ${sim.hole.size}`);
  frameMs+=(performance.now()-t0-frameMs)*.05;
  s.debug={sim,turn,def,level,R,contact,cam,endTurn,frameMs,thumb,useBoost:id=>useBoost(sim,id)};});

 function points(r){return r?r.goals+(r.won?1000+Math.round(r.left*10):0):0;}
 function scoresWith(p,sim){const sc=[points(results[0]),points(results[1])];sc[p]=points({goals:goalTotal(sim),won:sim.won,left:sim.time});return sc;}
 async function playTurn(p){const charges={};for(const id of BOOST_ORDER)charges[id]=boostOn(id)?1:0;
  turn={player:p,phase:'play',t:0,sim:createSim(def,{charges}),popups:[],rings:[],flyers:[],inflight:{},inflightPts:0,cardPulse:def.goals.map(()=>0),arcV:0,combo:0,comboT:0,confetti:[],moved:false,endT:0};contact=null;keys={};cam.x=def.start.x;cam.z=def.start.z;cam.dist=0;sound('start');
  await new Promise(res=>{finishResolve=res;});finishResolve=null;const sim=turn.sim;return {won:sim.won,time:sim.clearTime,left:sim.time,goals:goalTotal(sim),need:goalNeed(sim),size:sim.hole.size};}
 const introText=`Hole.it · Level ${level} (${def.themeName}). Drag to steer the hole and ${def.mode==='score'?`eat anything: every prop is worth points (bigger = more). Reach ${def.goals[0].need} ★`:'swallow every one of the props on the cards'} before the ${fmt(def.time)} clock runs out. You both play this exact level: the faster clear wins; if nobody clears it, most items wins.`;
 for(const p of [0,1]){if(!await s.pass(p,p===0?introText:`${s.players[1].name}: same Level ${level}. ${results[0].won?`Beat ${results[0].time.toFixed(1)} s.`:`Collect more than ${results[0].goals} items, or clear it.`}`,'Ready'))return;
  if(!s.alive)return;results[p]=await playTurn(p);if(!s.alive)return;s.setScores([points(results[0]),points(results[1])]);}
 const [a,b]=results,names=s.players.map(pl=>pl.name),line=(r,i)=>r.won?`${names[i]} cleared it in ${r.time.toFixed(1)} s`:`${names[i]} got ${r.goals}/${r.need}`;
 if(a.won||b.won){if(store.profile){store.profile.holeItLevel=level+1;saveProfile(store.profile);}}
 turn=null;s.finish([points(a),points(b)],`Hole.it Level ${level}: ${line(a,0)} · ${line(b,1)}.${a.won||b.won?` Next time: Level ${level+1}.`:' Nobody cleared it, so Level '+level+' comes back next time.'}`);
}
Object.assign(exports,{holeIt,currentHoleLevel});
