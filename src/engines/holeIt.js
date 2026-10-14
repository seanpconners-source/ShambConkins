// Hole.it (Rocket, Android/iOS) rebuilt: real 3D tray of glossy props, a grey hole
// with a growth arc and "Size N", goal cards, a 2:00 stopwatch, floating joystick,
// four boosters, "Level N" intro and "Bravo!" finish. Two players take turns on the
// exact same level; the shared level number is saved in the profile and moves on
// once somebody clears it.
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const {sound,tone,vibrate}=require("src/audio.js");
const {createRenderer,affine}=require("src/engines/holeIt/gl.js");
const {KINDS,HEAD_FACE,C,geo,add,rbox}=require("src/engines/holeIt/meshes.js");
const {buildLevel,holeRadius,TIME}=require("src/engines/holeIt/levels.js");
const {createSim,stepSim,useBoost,sizeProgress,goalTotal,goalNeed,qaxis,qmul}=require("src/engines/holeIt/sim.js");

const BOOST_ORDER=['grow','speed','magnet','freeze'];
const BOOST_HELP={grow:'Potion: +1 hole size',speed:'Lightning: faster hole for 10 s',magnet:'Magnet: pulls nearby props in for 8 s',freeze:'Freeze: stops the clock for 10 s'};
function currentHoleLevel(){return Math.max(1,Math.floor(Number(store.profile?.holeItLevel)||1));}
function hexRGB(h){return C(h);}
const fmt=t=>{t=Math.max(0,Math.ceil(t));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');};
function trayWalls(def){const g=geo(),W=def.W,D=def.D,t=.45,h=.42,wall=C('#8e95a3');
 add(g,rbox(W+t*2,h,t,.08),{at:[0,0,-D/2-t/2]},wall);add(g,rbox(W+t*2,h,t,.08),{at:[0,0,D/2+t/2]},wall);
 add(g,rbox(t,h,D,.08),{at:[-W/2-t/2,0,0]},wall);add(g,rbox(t,h,D,.08),{at:[W/2+t/2,0,0]},wall);return g;}
function rr(x,X,Y,W,H,R){x.beginPath();x.moveTo(X+R,Y);x.arcTo(X+W,Y,X+W,Y+H,R);x.arcTo(X+W,Y+H,X,Y+H,R);x.arcTo(X,Y+H,X,Y,R);x.arcTo(X,Y,X+W,Y,R);x.closePath();}
function outlined(x,text,X,Y,size,fill='#fff',stroke='#1a1d3a',align='center',weight=900){x.font=`${weight} ${size}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;x.textAlign=align;x.textBaseline='middle';x.lineJoin='round';x.lineWidth=Math.max(2,size*.2);x.strokeStyle=stroke;x.strokeText(text,X,Y);x.fillStyle=fill;x.fillText(text,X,Y);}
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
 const [c]=s.canvas(390,720,{fill:true});s.body.classList.add('drag-arena-body','holeit-body');
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
 for(const g of def.goals)thumb(g.k);
 if(def.items.some(it=>it.k==='head')){paintAtlas();for(const ms of [400,1500,4000])setTimeout(()=>{if(s.alive)paintAtlas();},ms);}

 const results=[null,null];let turn=null,finishResolve=null,contact=null,keys={};
 // ---- layout helpers (CSS px) ----
 const L={};
 function layout(){const W=s.W,H=s.H;L.W=W;L.H=H;const top=10;L.level={x:10,y:top,w:84,h:28};L.timer={x:W/2-58,y:top,w:116,h:32};L.pause={x:W-46,y:top,w:36,h:36};
  const n=def.goals.length,cw=Math.min(58,(W-24)/Math.max(4,n)-6);L.cards=def.goals.map((g,i)=>({x:10+i*(cw+6),y:top+40,w:cw,h:cw*1.16}));
  const bs=Math.min(58,W/6.2),gap=bs*.28,tw=bs*4+gap*3,by=H-bs-14;L.boost=BOOST_ORDER.map((id,i)=>({id,x:W/2-tw/2+i*(bs+gap),y:by,w:bs,h:bs}));
  L.play={x:W/2-80,y:Math.min(H*.78,H-130),w:160,h:58};L.cont={x:W/2-90,y:H*.72,w:180,h:60};}
 const inside=(p,r)=>r&&p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
 function syncCanvases(){const w=c.clientWidth,h=c.clientHeight,l=c.offsetLeft,t=c.offsetTop,k=dpr();for(const e of [glc,hud]){e.style.left=l+'px';e.style.top=t+'px';e.style.width=w+'px';e.style.height=h+'px';}
  const hw=Math.round(s.W*k),hh=Math.round(s.H*k);if(hud.width!==hw)hud.width=hw;if(hud.height!==hh)hud.height=hh;}

 // ---- per-kind instance buffers ----
 const byKind={};for(const it of def.items)byKind[it.k]=(byKind[it.k]||0)+1;
 const inst={};for(const k of Object.keys(byKind))inst[k]={data:new Float32Array(byKind[k]*16+16),count:0};
 let shadowData=new Float32Array(def.items.length*4+4);
 const intro=[{k:'duck',x:-1.05,y:1.25,z:.1},{k:'apple-red',x:.3,y:1.95,z:-.6},{k:'croissant',x:1.05,y:1.1,z:.3}];
 // ---- camera ----
 const cam={x:def.start.x,z:def.start.z,dist:0};
 function cameraFor(h,W,H){const fov=.72,aspect=W/H,span=4.5*Math.pow(h.r/.5,.72),axis=aspect<1?2*Math.atan(Math.tan(fov/2)*aspect):fov*.8;return {fov,dist:(span/2)/Math.tan(axis/2)*1.05};}
 function renderPlay(sim,t){const h=sim.hole,W=s.W,H=s.H,cf=cameraFor(h,W,H);if(!cam.dist)cam.dist=cf.dist;cam.dist+=(cf.dist-cam.dist)*.06;cam.x+=(h.x-cam.x)*.18;cam.z+=(h.z-cam.z)*.18;
  const pitch=1.0,tz=cam.z-cam.dist*.1,eye=[cam.x,cam.dist*Math.sin(pitch),tz+cam.dist*Math.cos(pitch)];R.setCamera(W,H,dpr(),eye,[cam.x,0,tz],cf.fov);
  for(const k in inst)inst[k].count=0;let ns=0;const vis=cam.dist*1.25+3;const heads=[];
  for(const it of sim.items){if(it.state===2)continue;if(Math.abs(it.x-cam.x)>vis||Math.abs(it.z-tz)>vis*1.3)continue;
   if(it.moved||!it.m){it.m=it.m||new Float32Array(12);let q=it.q;if(it.wob>0&&it.state===0){const dx=h.x-it.x,dz=h.z-it.z,l=Math.hypot(dx,dz)||1;q=qmul(qaxis(dz/l,0,-dx/l,-it.wob*.22*Math.sin(t*9+it.i)),q);}
    affine(it.m,0,[it.x,it.cy,it.z],q,1,it.h/2);it.moved=it.wob>0;}
   const b=inst[it.k];b.data.set(it.m,b.count*16);b.data[b.count*16+12]=1;b.data[b.count*16+13]=1;b.data[b.count*16+14]=1;b.data[b.count*16+15]=1;b.count++;
   if(it.k==='head')heads.push(it);
   if(it.state!==1&&it.cy-it.h/2<.6){shadowData[ns*4]=it.x+it.r*.14;shadowData[ns*4+1]=it.z-it.r*.1;shadowData[ns*4+2]=it.r*1.18;shadowData[ns*4+3]=.36;ns++;}}
  const rings=turn.rings.map(g=>({x:h.x,z:h.z,r:h.r*(1.3+g.t*2.4),a:Math.max(0,1-g.t/.75)*.95,color:[1,.8,.22],thick:.05}));
  if(sim.active.magnet>0)rings.push({x:h.x,z:h.z,r:h.r*(1.6+(t*2%1)*2.2),a:.35*(1-(t*2%1)),color:[.45,1,.55],thick:.04});
  R.render({clear:[.2,.55,.18,1],hole:{x:h.x,z:h.z,r:h.r},tray:[-def.W/2,-def.D/2,def.W/2,def.D/2],floorColor:hexRGB(def.floor),groups:Object.entries(inst).map(([kind,b])=>({kind,data:b.data,count:b.count})),
   shadows:{data:shadowData,count:ns},rings,arc:{x:h.x,z:h.z,r:h.r*1.4,progress:sizeProgress(sim),start:.6,color:[1,.78,.16]},heads:heads.map(it=>({m:headMatrix(it),rect:it.i%2?[.5,0,.5,1]:[0,0,.5,1]}))});}
 function headMatrix(it){const m=it.m,f=HEAD_FACE,ct=Math.cos(f.tilt),st=Math.sin(f.tilt),sz=f.size;
  // local face transform: translate(c) * rotX(tilt) * scale(sz), shifted by the item's pivot (h/2)
  const loc=[sz,0,0,0, 0,ct*sz,st*sz,0, 0,-st*sz,ct*sz,0, f.c[0],f.c[1],f.c[2],1];
  const M=[m[0],m[4],m[8],0, m[1],m[5],m[9],0, m[2],m[6],m[10],0, m[3],m[7],m[11],1];
  const o=new Float32Array(16);for(let col=0;col<4;col++)for(let r=0;r<4;r++){let v=0;for(let k=0;k<4;k++)v+=M[k*4+r]*loc[col*4+k];o[col*4+r]=v;}return o;}
 function renderIntro(t){const W=s.W,H=s.H,aspect=W/H,d=aspect<1?7.4/aspect*.62:7.4;R.setCamera(W,H,dpr(),[0,d*.5,d*.86],[0,.75,0],.72);
  const groups=intro.map((p,i)=>{const kd=KINDS[p.k],data=new Float32Array(16);affine(data,0,[p.x,p.y+Math.sin(t*2+i*1.7)*.12,p.z],qmul(qaxis(0,1,0,t*.6+i*2),qaxis(1,0,0,Math.sin(t+i)*.25)),1.5,kd.h/2);data.set([1,1,1,1],12);return {kind:p.k,data,count:1};});
  R.render({clear:[.11,.13,.24,1],hole:{x:0,z:0,r:.85},floorColor:[.2,.23,.36],groups});}

 // ---- HUD ----
 function drawHUD(sim,t){const k=dpr(),x=hx,W=s.W,H=s.H;x.setTransform(k,0,0,k,0,0);x.clearRect(0,0,W,H);layout();
  if(turn.phase==='intro'){const g=x.createLinearGradient(0,0,0,H*.3);g.addColorStop(0,'#141a33');g.addColorStop(1,'#141a3300');x.fillStyle=g;x.fillRect(0,0,W,H*.3);
   outlined(x,'Level',W/2,H*.11,Math.min(40,W*.1),'#e8ecff','#1a1d3a');outlined(x,String(level),W/2,H*.11+Math.min(46,W*.115),Math.min(52,W*.13),'#ffffff','#1a1d3a');
   const who=s.players[turn.player];outlined(x,`${who.name}’s turn · ${def.themeName}`,W/2,H*.11+Math.min(88,W*.22),14,'#c9d0ff','#141a33',undefined,800);
   greenButton(x,L.play.x,L.play.y,L.play.w,L.play.h,'Play',t);
   if(results[0]&&turn.player===1){const r0=results[0];outlined(x,r0.won?`${s.players[0].name}: cleared in ${r0.time.toFixed(1)} s`:`${s.players[0].name}: ${r0.goals}/${r0.need} items`,W/2,L.play.y+L.play.h+28,14,'#ffe27a','#141a33',undefined,800);}
   return;}
  // level pill
  const lv=L.level;rr(x,lv.x,lv.y,lv.w,lv.h,9);x.fillStyle='#232a5ccc';x.fill();x.strokeStyle='#7d89f0';x.lineWidth=1.5;x.stroke();outlined(x,`Level ${level}`,lv.x+lv.w/2,lv.y+lv.h/2+1,13,'#fff','#141a33',undefined,800);
  // timer
  const tm=L.timer,frozen=sim.active.freeze>0;rr(x,tm.x,tm.y,tm.w,tm.h,10);x.fillStyle=frozen?'#1f5c8acc':'#232a5ccc';x.fill();x.strokeStyle=frozen?'#9be8ff':'#7d89f0';x.stroke();
  x.fillStyle='#ffcf3a';x.beginPath();x.arc(tm.x+14,tm.y+tm.h/2,12,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(tm.x+14,tm.y+tm.h/2+1,8.5,0,7);x.fill();x.fillStyle='#ffcf3a';x.fillRect(tm.x+12,tm.y+2,4,4);
  x.strokeStyle='#e8344a';x.lineWidth=2;x.beginPath();x.moveTo(tm.x+14,tm.y+tm.h/2+1);const ang=-Math.PI/2+(1-sim.time/TIME)*Math.PI*2;x.lineTo(tm.x+14+Math.cos(ang)*6,tm.y+tm.h/2+1+Math.sin(ang)*6);x.stroke();
  outlined(x,fmt(sim.time),tm.x+tm.w/2+10,tm.y+tm.h/2+1,17,sim.time<15&&!frozen&&Math.floor(t*4)%2?'#ff7a7a':'#fff','#141a33');
  rr(x,tm.x+8,tm.y+tm.h+3,tm.w-16,6,3);x.fillStyle='#0f1430cc';x.fill();rr(x,tm.x+8,tm.y+tm.h+3,(tm.w-16)*Math.max(0,sim.time/TIME),6,3);x.fillStyle=frozen?'#6fd8ff':'#39d353';x.fill();
  // player chip
  const who=s.players[turn.player];outlined(x,who.name,tm.x+tm.w/2,tm.y+tm.h+20,11,turn.player?'#ff9ccc':'#8fc2ff','#141a33',undefined,800);
  // pause
  const pz=L.pause;rr(x,pz.x,pz.y,pz.w,pz.h,9);x.fillStyle='#4a55d8';x.fill();x.strokeStyle='#9aa6ff';x.stroke();x.fillStyle='#fff';x.fillRect(pz.x+12,pz.y+10,4,16);x.fillRect(pz.x+20,pz.y+10,4,16);
  // goal cards
  sim.goals.forEach((g,i)=>{const cd=L.cards[i];if(!cd)return;const grd=x.createLinearGradient(0,cd.y,0,cd.y+cd.h);grd.addColorStop(0,'#6476f0');grd.addColorStop(1,'#3a44b4');rr(x,cd.x,cd.y,cd.w,cd.h,8);x.fillStyle=grd;x.fill();x.strokeStyle='#a9b3ff';x.lineWidth=1.5;x.stroke();
   const pulse=turn.cardPulse[i]>0?1+turn.cardPulse[i]*.25:1,ts=cd.w*.78*pulse;x.drawImage(thumb(g.k),cd.x+cd.w/2-ts/2,cd.y+cd.w*.42-ts/2,ts,ts);
   rr(x,cd.x+3,cd.y+cd.h-17,cd.w-6,14,4);x.fillStyle='#1d235acc';x.fill();const left=Math.max(0,g.need-g.got);
   if(left===0){x.fillStyle='#39d353';x.beginPath();x.arc(cd.x+cd.w/2,cd.y+cd.h-10,8,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=2.4;x.beginPath();x.moveTo(cd.x+cd.w/2-4,cd.y+cd.h-10);x.lineTo(cd.x+cd.w/2-1,cd.y+cd.h-7);x.lineTo(cd.x+cd.w/2+4,cd.y+cd.h-13);x.stroke();}
   else outlined(x,String(left),cd.x+cd.w/2,cd.y+cd.h-10,11,'#fff','#141a33',undefined,800);});
  if(level===1&&sim.elapsed<4&&!turn.moved){const cd=L.cards.at(-1),bx=10,by=cd.y+cd.h+8;rr(x,bx,by,150,34,8);x.fillStyle='#ffffffee';x.fill();x.font='800 11px system-ui,sans-serif';x.fillStyle='#2a2f6a';x.textAlign='left';x.fillText('Collect these items',bx+10,by+12);x.fillText('to complete level!',bx+10,by+25);}
  // hole label + popups
  const h=sim.hole,lp=R.project(h.x,0,h.z+h.r*1.5);outlined(x,`Size ${h.size}`,lp.x,lp.y+4,Math.max(12,Math.min(18,W*.04)),'#ffd23a','#3a2a06');
  for(const p of turn.popups){const pp=R.project(p.x,h.r*.4,p.z),a=Math.max(0,1-p.t/.9);x.globalAlpha=a;outlined(x,p.text,pp.x+p.dx,pp.y-20-p.t*70,p.big?20:16,p.big?'#ffe27a':'#fff','#1a1d3a');x.globalAlpha=1;}
  // boosters
  for(const b of L.boost){const n=sim.charges[b.id],act=sim.active[b.id]>0,cx=b.x+b.w/2,cy=b.y+b.h/2,r=b.w/2;
   if(act){x.fillStyle='#ffe27a55';x.beginPath();x.arc(cx,cy,r+5+Math.sin(t*8)*2,0,7);x.fill();}
   x.fillStyle='#f3c22f';x.beginPath();x.arc(cx,cy,r,0,7);x.fill();const bg=x.createRadialGradient(cx-r*.3,cy-r*.4,2,cx,cy,r);bg.addColorStop(0,n||act?'#7b5cff':'#6b6f86');bg.addColorStop(1,n||act?'#3a21a8':'#3d4054');x.fillStyle=bg;x.beginPath();x.arc(cx,cy,r-4,0,7);x.fill();
   x.globalAlpha=n||act?1:.45;boosterIcon(x,b.id,cx,cy,r*1.25);x.globalAlpha=1;
   if(act){const tot=b.id==='speed'?10:b.id==='magnet'?8:10;x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(cx,cy,r-2,-Math.PI/2,-Math.PI/2+Math.PI*2*sim.active[b.id]/tot);x.stroke();}
   x.fillStyle=n?'#ff3b5c':'#555a70';x.beginPath();x.arc(b.x+b.w-6,b.y+8,9,0,7);x.fill();outlined(x,String(n),b.x+b.w-6,b.y+8.5,10,'#fff','#00000000',undefined,900);}
  // joystick
  if(contact&&turn.phase==='play'){const o=contact.origin,p=contact.point,dx=p.x-o.x,dy=p.y-o.y,l=Math.hypot(dx,dy),m=Math.min(l,46),kx=l?o.x+dx/l*m:o.x,ky=l?o.y+dy/l*m:o.y;
   x.fillStyle='#ffffff26';x.strokeStyle='#ffffff66';x.lineWidth=2;x.beginPath();x.arc(o.x,o.y,52,0,7);x.fill();x.stroke();const kg=x.createRadialGradient(kx-8,ky-10,3,kx,ky,26);kg.addColorStop(0,'#ffffff');kg.addColorStop(1,'#c9cedd');x.fillStyle=kg;x.beginPath();x.arc(kx,ky,24,0,7);x.fill();}
  else if(turn.phase==='play'&&!turn.moved&&level>1)outlined(x,'Touch and drag to move',W/2,H*.72,16,'#fff','#141a33',undefined,800);
  else if(turn.phase==='play'&&!turn.moved){const cx=W/2,cy=H*.78,tt=t*1.6,a=Math.sin(tt),bx=cx+Math.cos(tt)*60/(1+a*a),byy=cy+Math.sin(tt)*Math.cos(tt)*60/(1+a*a);
   x.strokeStyle='#a78bfa';x.lineWidth=8;x.globalAlpha=.75;x.beginPath();for(let i=0;i<=64;i++){const u=i/64*Math.PI*2,s2=Math.sin(u),d=1+s2*s2;const px=cx+Math.cos(u)*60/d,py=cy+Math.sin(u)*Math.cos(u)*60/d;i?x.lineTo(px,py):x.moveTo(px,py);}x.closePath();x.stroke();x.globalAlpha=1;
   x.font='34px system-ui';x.textAlign='center';x.fillText('👆',bx+6,byy+18);}
  // end card
  if(turn.phase==='end'){const tt=turn.endT;x.fillStyle=`rgba(8,10,24,${Math.min(.72,tt*1.6)})`;x.fillRect(0,0,W,H);
   if(sim.won){const sc=Math.min(1,tt*3.5),bounce=1+Math.sin(Math.min(1,tt*3)*Math.PI)*.18;x.save();x.translate(W/2,H*.24);x.scale(sc*bounce,sc*bounce);x.rotate(-.06);
     const g=x.createLinearGradient(0,-30,0,30);g.addColorStop(0,'#fff27a');g.addColorStop(1,'#ff9a1e');outlined(x,'Bravo!',0,0,Math.min(64,W*.16),g,'#7a2a10');x.restore();
     for(const f of turn.confetti){x.fillStyle=f.c;x.save();x.translate(f.x,f.y);x.rotate(f.a);x.fillRect(-4,-2,8,4);x.restore();}
     outlined(x,`Cleared in ${sim.clearTime.toFixed(1)} s`,W/2,H*.4,22,'#fff','#141a33');outlined(x,`${fmt(sim.time)} left on the clock`,W/2,H*.4+30,15,'#c9d0ff','#141a33',undefined,800);}
   else{outlined(x,'Time’s up!',W/2,H*.24,Math.min(54,W*.14),'#ff8a7a','#4a1010');outlined(x,`${goalTotal(sim)} / ${goalNeed(sim)} items collected`,W/2,H*.4,20,'#fff','#141a33');}
   if(tt>.7)greenButton(x,L.cont.x,L.cont.y,L.cont.w,L.cont.h,'Continue',t);}}

 // ---- input ----
 const toStick=()=>{if(!contact)return {x:0,z:0};const dx=contact.point.x-contact.origin.x,dy=contact.point.y-contact.origin.y,l=Math.hypot(dx,dy);if(l<4)return {x:0,z:0};const m=Math.min(1,l/46);return {x:dx/l*m,z:dy/l*m};};
 const release=ev=>{if(contact?.id!==ev.pointerId)return;contact=null;s.release?.(ev);};
 s.on(c,'pointerdown',ev=>{if(s.paused||!turn)return;const p=s.pointer(ev);ev.preventDefault();layout();
  if(turn.phase==='intro'){if(inside(p,L.play)||p.y>H50()){sound('tap');startPlay();}return;}
  if(turn.phase==='end'){if(turn.endT>.7&&(inside(p,L.cont)||p.y>H50()))endTurn();return;}
  if(inside(p,L.pause)){s.manualPause?.();return;}
  for(const b of L.boost)if(Math.hypot(p.x-b.x-b.w/2,p.y-b.y-b.h/2)<b.w/2+4){if(useBoost(turn.sim,b.id)){sound('pickup');vibrate(15);}else sound('tap');return;}
  if(contact)return;contact={id:ev.pointerId,origin:p,point:p};turn.moved=true;s.capture?.(ev);});
 const H50=()=>s.H*.5;
 s.on(c,'pointermove',ev=>{if(contact?.id!==ev.pointerId)return;contact.point=s.pointer(ev);});
 s.on(c,'pointerup',release);s.on(c,'pointercancel',release);s.on(c,'lostpointercapture',release);
 const KEYS={ArrowLeft:'l',a:'l',ArrowRight:'r',d:'r',ArrowUp:'u',w:'u',ArrowDown:'d',s:'d'};
 s.on(document,'keydown',ev=>{const k=KEYS[ev.key];if(k){keys[k]=true;if(turn)turn.moved=true;ev.preventDefault();}else if((ev.key==='Enter'||ev.key===' ')&&turn){if(turn.phase==='intro')startPlay();else if(turn.phase==='end'&&turn.endT>.7)endTurn();}else if(turn?.phase==='play'&&'1234'.includes(ev.key)&&ev.key.length===1)useBoost(turn.sim,BOOST_ORDER[Number(ev.key)-1]);});
 s.on(document,'keyup',ev=>{const k=KEYS[ev.key];if(k)keys[k]=false;});
 s.resetOnPause?.(()=>{contact=null;keys={};});s.on(window,'blur',()=>{contact=null;keys={};});
 s.hint('Drag anywhere: your first touch is the joystick. Swallow the props shown on the cards before the 2:00 clock runs out. Smaller things fit first; every prop you eat fills the yellow arc and grows the hole (Size N). Boosters (one each per turn): Potion +1 size, Lightning speed, Magnet pull, Snowflake stops the clock. Keyboard: arrows/WASD, 1–4 boosters.');

 function startPlay(){if(turn.phase!=='intro')return;turn.phase='play';cam.x=def.start.x;cam.z=def.start.z;cam.dist=0;sound('start');}
 function endTurn(){if(turn.phase!=='end'||turn.closing)return;turn.closing=true;sound('tap');finishResolve?.();}
 let lastPop=0;
 let frameMs=0;
 s.frame((dt,t)=>{if(!turn)return;const t0=performance.now();syncCanvases();turn.t+=dt;
  if(turn.phase==='intro'){renderIntro(turn.t);drawHUD(turn.sim,turn.t);return;}
  const sim=turn.sim;
  if(turn.phase==='play'){const st=toStick();const kx=(keys.r?1:0)-(keys.l?1:0),kz=(keys.d?1:0)-(keys.u?1:0);const input=contact?st:{x:kx,z:kz};
   stepSim(sim,dt,turn.moved?input:{x:0,z:0});if(!turn.moved){sim.time=TIME;sim.elapsed=0;}
   for(const e of sim.events.splice(0)){
    if(e.type==='eat'){const now=performance.now();if(now-lastPop>45&&store.profile?.settings.sound){lastPop=now;tone(520+Math.min(700,turn.combo*18),.05,.03,'sine');}turn.combo++;turn.comboT=.6;
     if(turn.popups.length<28)turn.popups.push({x:sim.hole.x,z:sim.hole.z,t:0,dx:(Math.random()-.5)*sim.hole.r*60,text:'+1',big:false});
     if(e.goal){const gi=sim.goals.findIndex(g=>g.k===e.k);if(gi>=0)turn.cardPulse[gi]=1;}}
    else if(e.type==='size'){turn.rings.push({t:0});sound('unlock');vibrate(25);turn.popups.push({x:sim.hole.x,z:sim.hole.z,t:0,dx:0,text:`Size ${e.size}!`,big:true});}
    else if(e.type==='boost'&&e.id==='grow')turn.rings.push({t:0});
    else if(e.type==='win'){turn.phase='end';turn.endT=0;sound('win');vibrate(40);s.react?.(turn.player,'win',2);turn.confetti=Array.from({length:70},()=>({x:Math.random()*s.W,y:-Math.random()*s.H*.6,vy:120+Math.random()*160,vx:(Math.random()-.5)*60,a:Math.random()*6,va:(Math.random()-.5)*8,c:['#ffd23a','#ff5fb4','#5ee06a','#3ad0ff','#ff7a3a'][Math.floor(Math.random()*5)]}));}
    else if(e.type==='lose'){turn.phase='end';turn.endT=0;sound('lose');s.react?.(turn.player,'sad',2);turn.confetti=[];}}
   if(turn.comboT>0){turn.comboT-=dt;if(turn.comboT<=0)turn.combo=0;}
   s.setScores(scoresWith(turn.player,sim));
  }else{turn.endT+=dt;stepSim(sim,dt,{x:0,z:0});sim.events.length=0;for(const f of turn.confetti){f.y+=f.vy*dt;f.x+=f.vx*dt;f.a+=f.va*dt;}}
  for(const p of turn.popups)p.t+=dt;turn.popups=turn.popups.filter(p=>p.t<.9);for(const g of turn.rings)g.t+=dt;turn.rings=turn.rings.filter(g=>g.t<.8);for(let i=0;i<turn.cardPulse.length;i++)turn.cardPulse[i]=Math.max(0,turn.cardPulse[i]-dt*4);
  renderPlay(sim,turn.t);drawHUD(sim,turn.t);
  s.status(`${s.players[turn.player].name} · Level ${level} · ${goalTotal(sim)}/${goalNeed(sim)} items · Size ${sim.hole.size}`);
  frameMs+=(performance.now()-t0-frameMs)*.05;
  s.debug={sim,turn,def,level,R,contact,startPlay,endTurn,frameMs,thumb,useBoost:id=>useBoost(sim,id)};});

 function points(r){return r?r.goals+(r.won?1000+Math.round(r.left*10):0):0;}
 function scoresWith(p,sim){const sc=[points(results[0]),points(results[1])];sc[p]=points({goals:goalTotal(sim),won:sim.won,left:sim.time});return sc;}
 async function playTurn(p){turn={player:p,phase:'intro',t:0,sim:createSim(def),popups:[],rings:[],cardPulse:def.goals.map(()=>0),combo:0,comboT:0,confetti:[],moved:false,endT:0};contact=null;keys={};cam.dist=0;
  await new Promise(res=>{finishResolve=res;});finishResolve=null;const sim=turn.sim;return {won:sim.won,time:sim.clearTime,left:sim.time,goals:goalTotal(sim),need:goalNeed(sim),size:sim.hole.size};}
 const introText=`Hole.it · Level ${level} (${def.themeName}). Drag to steer the hole and swallow the props on the cards before the 2:00 clock runs out. You both play this exact level: the faster clear wins; if nobody clears it, most items wins.`;
 for(const p of [0,1]){if(!await s.pass(p,p===0?introText:`${s.players[1].name}: same Level ${level}. ${results[0].won?`Beat ${results[0].time.toFixed(1)} s.`:`Collect more than ${results[0].goals} items, or clear it.`}`,'Ready'))return;
  if(!s.alive)return;results[p]=await playTurn(p);if(!s.alive)return;s.setScores([points(results[0]),points(results[1])]);}
 const [a,b]=results,names=s.players.map(pl=>pl.name),line=(r,i)=>r.won?`${names[i]} cleared it in ${r.time.toFixed(1)} s`:`${names[i]} got ${r.goals}/${r.need}`;
 if(a.won||b.won){if(store.profile){store.profile.holeItLevel=level+1;saveProfile(store.profile);}}
 turn=null;s.finish([points(a),points(b)],`Hole.it Level ${level}: ${line(a,0)} · ${line(b,1)}.${a.won||b.won?` Next time: Level ${level+1}.`:' Nobody cleared it, so Level '+level+' comes back next time.'}`);
}
Object.assign(exports,{holeIt,currentHoleLevel});
