// JUDGMENT DAY CHASE (Terminator 2): the rebuilt T-800 Freeway Chase (id t800-scan-long, engine 'chase').
// Owner (Nov 23): the old one was impossible (cops came from the bottom and you died at once); make it a cinematic,
// fast, super fun car chase with weapon upgrades, lots of enemies, cutscenes, the T-1000 on foot, liquid metal, the
// truck chase and the motorcycle chase; take inspiration from the best chase games; GPT templates for the art.
// Five stages (src/engines/tchase/data.js): the Galleria + storm drain on the Harley (tow truck boss), the T-1000 on
// foot, Pescadero in the station wagon (police-bike boss), Cyberdyne in the SWAT van with the minigun (helicopter
// boss), Judgment Day in the pickup (liquid nitrogen tanker, the freeze and the steel mill finale).
// Drag anywhere to drive (left/right steers, up/down = faster/slower), the T-800 fires by himself at the nearest
// threat, tap M79 for a grenade, hold NITRO. Health instead of one-hit deaths, warnings before anything arrives from
// behind, a weapons rig and Sarah's stash with upgrade cards (roguelite), takedowns and near misses fill the nitro.
// 1P = the campaign (kind 'levels', 2 continues, then an endless harder loop); 2P on one phone = take turns stage by
// stage, own health and upgrades each; board = one stage each; an online duel = both play the 1P run on one seed.
const {clamp,hash}=require("src/utils.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {vibrate}=require("src/audio.js");
const HF=require("src/headFacts.js");
const D=require("src/engines/tchase/data.js");
const S=require("src/engines/tchase/sim.js");
const A=require("src/engines/tchase/art.js");
const C=require("src/engines/tchase/cut.js");
const TS=require("src/data/tchaseSprites.js");
const {makeSound}=require("src/engines/tchase/sound.js");

const STORE='sc-tchase-v1';
const load=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch{return {};}};
const save=o=>{try{localStorage.setItem(STORE,JSON.stringify(o));}catch{}};
const FACE={bike:[0,-3,20],wagon:[0,-5,24],van:[0,-18,24],pickup:[0,-13,24]};
const lerp=(a,b,t)=>a+(b-a)*t;

async function terminatorChase(s){
 const [c,x]=s.canvas(680,420,{fill:true});const fb=fullBleed(s,{bg:'#000'});s.controls?.([]);
 const snd=makeSound();s.cleanup(()=>snd.stop());
 const board=s.origin==='board',duel=!!s.solo?.duel,solo=!!s.solo&&!s.solo.board,two=!solo&&s.players.length>1;
 const names=s.players.map(p=>p.name||'Player');
 const mem=load();mem.reached=mem.reached|0;mem.best=mem.best|0;
 let W=s.W,H=s.H,mode='boot',w=null,cut=null,cutT=0,cutDone=null,cur=0,ui={},tallyData=null,titleData=null,cardsFor=null;
 let cam={x:0,y:0,k:1,z:1},finger=null,nitroPtr=null,keys={},grenadeQ=false,logI=0,shownMood='normal',moodT=0,t=0,bossLetter=0;
 const dbg={engine:'chase',bot:false,get w(){return w;},get mode(){return mode;},cards:()=>cardsFor,skip:()=>skipCut(true),toBoss:()=>{if(w){w.camY=w.st.len-200;}},S};s.debug=dbg;
 // pause: hold the sound
 const pz=setInterval(()=>snd.hold(!!s.paused||!s.alive),200);s.cleanup(()=>clearInterval(pz));
 s.on(document,'keydown',e=>{keys[e.key]=true;if(e.key===' '||e.key==='g')grenadeQ=true;if(e.key==='Enter'||e.key===' ')tapAnywhere();});
 s.on(document,'keyup',e=>{keys[e.key]=false;});

 // ------------------------------------------------------------------ faces
 const pFace=(i,mood)=> (g,cx,cy,size)=>{try{HF.drawFace(s,g,i,cx,cy,size/.6,mood||'normal',1,.6);}catch{}};
 const tFace=(mood='normal')=> (g,cx,cy,size)=>{const sp=HF.faceSprite('t-1000',mood,size,1);if(sp)g.drawImage(sp.cv,cx+sp.x,cy+sp.y);else{g.fillStyle='#c9d3df';g.beginPath();g.arc(cx,cy,size/2,0,7);g.fill();}};
 const radioFace=(g,cx,cy,size)=>{g.fillStyle='#ffb347';g.font=`${size*.7}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('📻',cx,cy);};

 // ------------------------------------------------------------------ cutscenes
 function play(scene){return new Promise(r=>{cut=scene;cutT=0;mode='cut';cutDone=r;});}
 function skipCut(force){if(mode!=='cut'||!cut)return;if(!force&&cutT<.6)return;if(cut.qte&&cutT<cut.qte[1]&&!force)return;const r=cutDone;cut=null;cutDone=null;r?.();}

 // ------------------------------------------------------------------ input
 const btns=()=>{const r=clamp(Math.min(W,H)*.085,30,54),m=r*.5+10;return {nitro:{x:m+r,y:H-m-r,r},m79:{x:W-m-r,y:H-m-r,r}};};
 const inB=(b,p)=>Math.hypot(p.x-b.x,p.y-b.y)<b.r*1.25;
 function tapAnywhere(p){
  if(mode==='cut'){if(cut?.tap&&cut.tap(cutT))return;skipCut(false);return;}
  if(mode==='tally'&&tallyData&&tallyData.t>1){const r=tallyData.done;tallyData=null;r?.();return;}
  if(mode==='title'&&p){for(const b of ui.title||[])if(p.x>b.x&&p.x<b.x+b.w&&p.y>b.y&&p.y<b.y+b.h){const r=titleData.done;titleData=null;r(b.v);return;}}
  if(mode==='cards'&&p&&cardsFor){for(const b of ui.cards||[])if(p.x>b.x&&p.x<b.x+b.w&&p.y>b.y&&p.y<b.y+b.h){pickCard(b.v);return;}}}
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev);
  if(mode!=='play'||!w){tapAnywhere(p);return;}
  const B=btns();if(inB(B.m79,p)){grenadeQ=true;vibrate(10);return;}if(inB(B.nitro,p)){nitroPtr=ev.pointerId;s.capture(ev);return;}
  if(!finger){finger={id:ev.pointerId,sx:p.x,sy:p.y,px:w.P.x,pr:w.P.rel,t0:performance.now()};s.capture(ev);}else grenadeQ=true;});// a second finger fires the M79
 s.on(c,'pointermove',ev=>{if(!finger||ev.pointerId!==finger.id||!w||s.paused)return;ev.preventDefault();const p=s.pointer(ev);
  w.P.tx=finger.px+(p.x-finger.sx)/cam.k*1.25;w.P.trel=finger.pr-(p.y-finger.sy)/cam.k*1.1;});
 for(const tp of ['pointerup','pointercancel'])s.on(c,tp,ev=>{if(finger&&ev.pointerId===finger.id){finger=null;s.release(ev);if(w){w.P.tx=null;w.P.trel=null;}}if(nitroPtr===ev.pointerId){nitroPtr=null;s.release(ev);}});
 s.resetOnPause?.(()=>{finger=null;nitroPtr=null;keys={};if(w){w.P.tx=null;w.P.trel=null;}});

 // ------------------------------------------------------------------ cards
 let cardRes=null;
 function offerCards(list,title){cardsFor={list,title,t:0};mode='cards';return new Promise(r=>{cardRes=r;});}
 function pickCard(id){if(!cardsFor)return;snd.sfx('card');vibrate(15);const r=cardRes;cardsFor=null;cardRes=null;mode='play';r?.(id);}

 // ------------------------------------------------------------------ the frame
 s.frame((dt,now)=>{W=s.W;H=s.H;t+=dt;
  if(mode==='cut'&&cut){cutT+=dt;drawCut();if(cutT>=cut.len)skipCut(true);return;}
  if(mode==='title'){drawTitle(dt);return;}
  if(mode==='tally'){tallyData.t+=dt;drawWorld(dt);drawTally();return;}
  if(mode==='cards'){cardsFor.t+=dt;drawWorld(0);drawCards();return;}
  if(mode==='play'&&w){stepPlay(dt);drawWorld(dt);return;}
  x.fillStyle='#000';x.fillRect(0,0,W,H);});

 function stepPlay(dt){const P=w.P;
  // camera + view so the sim knows what is on screen
  const k0=Math.min(W/360,H/600),zt=(P.nitroOn?.9:1)*(w.boss&&!w.bossDone?.93:1)*(w.slow<1?1.08:1);cam.z=lerp(cam.z,zt,dt*2.5);cam.k=k0*cam.z;
  const cy=w.camY+H*.18/cam.k;cam.y=cam.y?lerp(cam.y,cy,clamp(dt*10,0,1)):cy;
  const rc=w.course.road(cam.y).c;cam.x=cam.x?lerp(cam.x,lerp(rc,P.x,.45),clamp(dt*4,0,1)):rc;
  w.viewAhead=cam.y+H/2/cam.k-P.y;w.viewBehind=P.y-(cam.y-H/2/cam.k);
  // input
  const kx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),ky=(keys.ArrowUp||keys.w?1:0)-(keys.ArrowDown||keys.s?1:0);
  let inp={dx:kx,dy:ky,nitro:nitroPtr!=null||!!keys.Shift,grenade:grenadeQ};grenadeQ=false;
  if(dbg.bot){const b=S.bot(w,.85);inp={tx:b.tx,trel:b.trel,nitro:b.nitro,grenade:b.grenade};}
  // fixed steps
  let left=Math.min(dt,.05);while(left>1e-4){const h=Math.min(left,1/120);S.step(w,h,inp);inp={...inp,grenade:false};left-=h;}
  if(w.cardOffer&&mode==='play'){const list=w.cardOffer;offerCards(list,'WEAPONS RIG').then(id=>{S.takeCard(w,id);});}
  sounds();moodT-=dt;if(moodT<=0)shownMood='normal';if(P.hitT>0){shownMood='angry';moodT=.6;}
  bossLetter=lerp(bossLetter,w.banner?.boss?1:0,dt*4);}
 function sounds(){const P=w.P;
  for(;logI<w.log.length;logI++){const [ev,a,b]=w.log[logI];
   if(ev==='fire')snd.sfx(D.GUNS[a].sound);else if(ev==='boom')snd.sfx('boom',a);else if(ev==='hurt'){snd.sfx(String(a).startsWith('ram')?'crash':a==='wall'?'scrape':'hurt');vibrate(b>10?40:12);}
   else if(ev==='ram')snd.sfx('crash');else if(ev==='takedown'){snd.sfx('takedown');shownMood='win';moodT=1.2;vibrate(30);}else if(ev==='warn'||ev==='static')snd.sfx('warn');
   else if(ev==='pick')snd.sfx('pick');else if(ev==='jump')snd.sfx('jump');else if(ev==='land')snd.sfx('land');else if(ev==='grenade')snd.sfx('m79');else if(ev==='spiked')snd.sfx('screech');
   else if(ev==='knock'||ev==='valve')snd.sfx('metal');else if(ev==='eshot')snd.sfx('uzi');else if(ev==='boss'){snd.level(3);snd.sfx('warn');}else if(ev==='bossDown'){snd.level(1);}}
  if(w.log.length>4000){w.log.length=0;logI=0;}
  let sir=0,rot=0;for(const e of w.E){if(e.dead)continue;const d=Math.hypot(e.x-P.x,e.y-P.y);if(e.type==='cruiser'||e.type==='moto'||e.type==='t1000bike')sir=Math.max(sir,clamp(1-d/700,0,1));if(e.type==='heli'||e.type==='heliboss')rot=Math.max(rot,clamp(1-d/900,0,1));}
  snd.setLoops({speed:w.cruise||0,nitro:P.nitroOn,siren:sir,rotor:rot,on:!P.dead});
  if(!w.boss)snd.level(w.heat>3.2?2:1);if(P.nitroOn)snd.sfx('nitro');}

 // ------------------------------------------------------------------ drawing the world
 const SX=wx=>W/2+(wx-cam.x)*cam.k,SY=wy=>H/2-(wy-cam.y)*cam.k;
 function at(wx,wy,a=0,sc=1){x.setTransform(cam.k*sc,0,0,cam.k*sc,SX(wx),SY(wy));if(a)x.rotate(a);}
 function drawWorld(dt){const P=w.P,night=w.st.time==='night',k=cam.k;x.setTransform(1,0,0,1,0,0);
  // shake
  const sh=w.shake>.3&&!s.profile?.settings?.reducedMotion?w.shake:0,ox=(Math.random()-.5)*sh,oy=(Math.random()-.5)*sh;
  x.save();x.translate(ox,oy);
  const y0=cam.y-H/2/k-40,y1=cam.y+H/2/k+40,look=w.course.road(cam.y).look;
  // ground
  const gp=A.pattern(x,'ground-'+(look==='canal'?'canal':look),night);x.save();x.fillStyle=gp.p;const gm=new DOMMatrix().translate(SX(0),SY(0)).scale(k*256/gp.size*1);try{gp.p.setTransform(gm);}catch{}x.fillRect(-20,-20,W+40,H+40);x.restore();
  // road polygon
  const STEP=18,L=[],R=[],M=[];for(let y=y0;y<=y1+STEP;y+=STEP){const r=w.course.road(y);L.push([SX(r.c-r.w/2),SY(y),r]);R.push([SX(r.c+r.w/2),SY(y)]);M.push([SX(r.c),SY(y),r.med]);}
  // edges outside the road: canal slopes, curbs, rails
  const edge=w.course.road(cam.y).edge;
  if(edge==='canal'){for(const side of [-1,1]){x.beginPath();const pts=side<0?L:R;pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));for(let i=pts.length-1;i>=0;i--)x.lineTo(pts[i][0]+side*60*k,pts[i][1]);x.closePath();
    const g=x.createLinearGradient(W/2+side*0,0,W/2+side*W*.5,0);x.fillStyle=night?'#4a4a48':'#b9b5aa';x.fill();x.strokeStyle='rgba(0,0,0,.25)';x.lineWidth=2*k;x.stroke();void g;}}
  x.beginPath();L.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));for(let i=R.length-1;i>=0;i--)x.lineTo(R[i][0],R[i][1]);x.closePath();
  const ap=A.pattern(x,look==='canal'?'asphalt-canal':'asphalt-street',night);x.save();x.fillStyle=ap.p;try{ap.p.setTransform(new DOMMatrix().translate(SX(0),SY(0)).scale(k*256/ap.size));}catch{}x.fill();x.restore();
  if(look==='canal'){// the low-flow channel in the middle of the drain
   x.beginPath();M.forEach((p,i)=>i?x.lineTo(p[0]-10*k,p[1]):x.moveTo(p[0]-10*k,p[1]));for(let i=M.length-1;i>=0;i--)x.lineTo(M[i][0]+10*k,M[i][1]);x.closePath();x.fillStyle=night?'rgba(40,60,80,.8)':'rgba(70,110,130,.75)';x.fill();}
  // lane dashes + edge lines
  const lanes=w.course.road(cam.y).lanes;x.fillStyle=look==='canal'?'rgba(0,0,0,.12)':'rgba(255,255,240,.75)';
  for(let li=1;li<lanes;li++){if(look==='canal')continue;for(let y=Math.floor(y0/90)*90;y<y1;y+=90){const r=w.course.road(y);if(r.med>2&&Math.abs(li-lanes/2)<.6)continue;const xx=r.c-r.w/2+r.w*li/lanes;x.save();x.translate(SX(xx),SY(y));x.fillRect(-1.5*k,-22*k,3*k,22*k);x.restore();}}
  x.strokeStyle=look==='canal'?'rgba(0,0,0,.3)':'rgba(255,210,70,.85)';x.lineWidth=3*k;for(const pts of [L,R]){x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();}
  if(edge==='rail'){x.strokeStyle='#b8bec8';x.lineWidth=4*k;for(const [pts,sg] of [[L,-1],[R,1]]){x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0]+sg*5*k,p[1]):x.moveTo(p[0]+sg*5*k,p[1]));x.stroke();}}
  if(edge==='curb'){x.strokeStyle='#d8d3c6';x.lineWidth=6*k;for(const [pts,sg] of [[L,-1],[R,1]]){x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0]+sg*3*k,p[1]):x.moveTo(p[0]+sg*3*k,p[1]));x.stroke();}}
  // medians
  for(let i=0;i<M.length-1;i++){const m=M[i][2];if(m<=2)continue;x.fillStyle='#bdb8ad';x.fillRect(M[i][0]-m*k,M[i+1][1],m*2*k,M[i][1]-M[i+1][1]+1);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(M[i][0]-m*k,M[i+1][1],3*k,M[i][1]-M[i+1][1]+1);}
  // ramps
  for(const rp of w.course.ramps){if(rp.y<y0-80||rp.y>y1)continue;const r=w.course.road(rp.y),hw=rp.wide?r.w/2:r.w/4,cx=rp.wide?r.c:r.c+rp.side*r.w/4;
   x.save();x.translate(SX(cx),SY(rp.y+70));const g=x.createLinearGradient(0,0,0,70*k);g.addColorStop(0,'#e6e6e6');g.addColorStop(1,'#6b6b6b');x.fillStyle=g;x.fillRect(-hw*k,0,hw*2*k,70*k);
   x.fillStyle='#ffd23f';for(let i=-3;i<=3;i++){x.beginPath();x.moveTo(i*hw*k/3.5-8*k,60*k);x.lineTo(i*hw*k/3.5,48*k);x.lineTo(i*hw*k/3.5+8*k,60*k);x.lineTo(i*hw*k/3.5,52*k);x.fill();}x.restore();}
  decor(y0,y1,look,night);
  // decals: skids, scorch, wrecks
  for(const d of w.decals){if(d.y<y0||d.y>y1)continue;at(d.x,d.y,d.yaw||0);if(d.kind==='skid'){x.fillStyle='rgba(0,0,0,.18)';x.fillRect(-4,-4,3,8);x.fillRect(2,-4,3,8);}else if(d.kind==='scorch'){x.fillStyle='rgba(0,0,0,.28)';x.beginPath();x.arc(0,0,d.r,0,7);x.fill();}
   else if(d.kind==='wreck'){if(!TS.pic(x,'wreck',0,0)){x.fillStyle='#1d1b1a';A.rr(x,-d.r*.6,-d.r,d.r*1.2,d.r*2,6);x.fill();x.fillStyle='rgba(255,120,30,.5)';x.beginPath();x.arc(0,0,d.r*.4*(1+.2*Math.sin(t*9+d.x)),0,7);x.fill();}}}
  for(const o of w.O){at(o.x,o.y);x.fillStyle=`rgba(10,10,14,${.7*(1-o.t/o.life)})`;x.beginPath();x.ellipse(0,0,o.r,o.r*.7,0,0,7);x.fill();x.fillStyle='rgba(120,80,200,.18)';x.beginPath();x.ellipse(-4,-3,o.r*.5,o.r*.3,0,0,7);x.fill();}
  for(const kk of w.K){at(kk.x,kk.y);A.pickup(x,kk.kind,t+kk.id,D.PICKUPS[kk.kind].col);}
  // strafing lines + rocket targets on the road
  for(const e of w.E){if(e.strafe&&e.strafe.t<e.strafe.tell){const s2=e.strafe,a=.4+.4*Math.sin(t*30);x.setTransform(1,0,0,1,ox,oy);x.strokeStyle=`rgba(255,40,40,${a})`;x.lineWidth=Math.max(2,6*k);x.setLineDash([12,8]);x.beginPath();x.moveTo(SX(s2.x0),SY(s2.y0+w.speed*s2.t));x.lineTo(SX(s2.x1),SY(s2.y1+w.speed*s2.t));x.stroke();x.setLineDash([]);}
   if(e.rockets)for(const r of e.rockets){if(r.t<0)continue;at(r.x,r.y);x.strokeStyle=`rgba(255,60,40,${.5+.5*Math.sin(t*20)})`;x.lineWidth=3;x.beginPath();x.arc(0,0,70*Math.max(.2,1-r.t/1.2),0,7);x.stroke();x.beginPath();x.arc(0,0,70,0,7);x.stroke();}}
  // ground vehicles + people, back to front
  const list=w.E.filter(e=>!e.dead&&e.type!=='heli'&&e.type!=='heliboss'&&e.y>y0-200&&e.y<y1+200).sort((a,b)=>b.y-a.y);
  for(const e of list)drawFoe(e,night);
  drawPlayer(night);
  for(const g of w.G){at(g.x,g.y);x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.arc(0,0,5,0,7);x.fill();at(g.x,g.y+g.z*.6,0,1+g.z/120);x.fillStyle='#4a5a2a';x.beginPath();x.arc(0,0,4,0,7);x.fill();x.fillStyle='#ffb347';x.fillRect(-1,-1,2,2);}
  // bullets
  x.setTransform(1,0,0,1,ox,oy);x.lineCap='round';
  for(const b of w.B){x.strokeStyle='#fff2a0';x.lineWidth=Math.max(1.5,2.2*k);x.beginPath();x.moveTo(SX(b.x),SY(b.y));x.lineTo(SX(b.x-b.vx*.018),SY(b.y-(b.vy-w.cruise)*.018));x.stroke();}
  for(const b of w.EB){if(b.ground)continue;x.fillStyle='#ff5a3a';x.beginPath();x.arc(SX(b.x),SY(b.y),Math.max(2,3.2*k),0,7);x.fill();x.fillStyle='rgba(255,90,60,.3)';x.beginPath();x.arc(SX(b.x),SY(b.y),Math.max(4,7*k),0,7);x.fill();}
  for(const r of w.R){at(r.x,r.y,Math.atan2(r.vx,r.vy-w.cruise));x.fillStyle='#ddd';x.fillRect(-2,-7,4,12);x.fillStyle='#ffb347';x.fillRect(-2,5,4,4);}
  if(w.muzzle&&(w.muzzle.t-=dt)>0){at(P.x,P.y);x.rotate(-w.muzzle.a+Math.PI/2*0);x.globalCompositeOperation='lighter';x.fillStyle='rgba(255,230,140,.9)';x.beginPath();x.arc(Math.cos(w.muzzle.a)*18,-Math.sin(w.muzzle.a)*18,6,0,7);x.fill();x.globalCompositeOperation='source-over';}
  // particles
  for(const f of w.fx){if(f.y<y0-100||f.y>y1+100)continue;at(f.x,f.y);A.particle(x,f);}
  // helicopters fly above everything: shadow on the road, the body bigger and offset
  for(const e of w.E){if(e.dead||(e.type!=='heli'&&e.type!=='heliboss'))continue;const sc=e.type==='heliboss'?1.25:1;at(e.x+30,e.y-40,0,sc);A.heliShadow(x);
   // spotlight cone at night
   if(night){x.setTransform(1,0,0,1,ox,oy);const px2=SX(e.x+Math.sin(t*.9)*60),py2=SY(e.y-160);x.globalCompositeOperation='lighter';const g=x.createRadialGradient(px2,py2,0,px2,py2,90*k);g.addColorStop(0,'rgba(255,255,230,.35)');g.addColorStop(1,'rgba(255,255,230,0)');x.fillStyle=g;x.beginPath();x.arc(px2,py2,90*k,0,7);x.fill();x.globalCompositeOperation='source-over';}
   at(e.x,e.y,e.yaw||0,sc*1.15);A.heli(x,{t});if(e.flash>0){x.globalCompositeOperation='lighter';x.fillStyle='rgba(255,255,255,.4)';x.beginPath();x.arc(0,0,30,0,7);x.fill();x.globalCompositeOperation='source-over';}}
  // overpasses cross above
  for(const ov of w.course.overs){if(ov.y<y0-200||ov.y>y1+200)continue;x.setTransform(1,0,0,1,ox,oy);const yy=SY(ov.y),hh=ov.h*k*.5;
   x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,yy+hh,W,hh*.7);const op=TS.picture('overpass');if(op){const tw=op.width/TS.PX*k,th=op.height/TS.PX*k;for(let xx=SX(0)%tw-tw;xx<W;xx+=tw)x.drawImage(op,xx,yy-th/2,tw,th);}
   else{const g=x.createLinearGradient(0,yy-hh,0,yy+hh);g.addColorStop(0,'#8a8780');g.addColorStop(.5,'#a9a69d');g.addColorStop(1,'#6b6862');x.fillStyle=g;x.fillRect(0,yy-hh,W,hh*2);x.fillStyle='#55534e';x.fillRect(0,yy-hh,W,4*k);x.fillRect(0,yy+hh-4*k,W,4*k);
    x.fillStyle='rgba(255,255,255,.08)';for(let xx=(SX(0)%(60*k))-60*k;xx<W;xx+=60*k)x.fillRect(xx,yy-hh,3*k,hh*2);}}
  // night: darkness + lights
  x.setTransform(1,0,0,1,ox,oy);
  if(night){x.fillStyle='rgba(4,8,22,.52)';x.fillRect(-20,-20,W+40,H+40);x.globalCompositeOperation='lighter';
   const V=D.VEHICLES[P.veh];if(!P.dead)cone(P.x,P.y+V.h/2,220,'255,250,220',.33);
   for(const e of list){if(e.type==='roadcar'||e.type==='spikes'||e.type==='t1000foot')continue;cone(e.x,e.y+e.h/2,150,'255,248,210',.18);if(e.type==='cruiser'||e.type==='moto'||e.type==='swat'||e.type==='roadcar'){glow(e.x,e.y,(t*6+e.id|0)%2?'255,40,40':'40,90,255',70,.35);}}
   for(const f of w.fx)if(f.kind==='boom'||f.kind==='fire')glow(f.x,f.y,'255,150,40',f.kind==='boom'?f.r*2.2:f.r*3,.25*(1-f.t/f.life));
   x.globalCompositeOperation='source-over';}
  else{x.fillStyle='rgba(255,120,40,.09)';x.fillRect(-20,-20,W+40,H+40);}
  // freeze tint
  if(P.freeze>.05){x.fillStyle=`rgba(200,235,255,${Math.min(.35,P.freeze*.25)})`;x.fillRect(0,0,W,H);}
  // floating texts
  for(const p of w.pops){const a=clamp((p.life-p.t)*3,0,1),fs=(p.big?20:13)*clamp(k,.8,1.4);x.globalAlpha=a;x.font=`900 ${fs}px Impact,"Arial Black",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=4;x.strokeStyle='rgba(0,0,0,.8)';const py=SY(p.y)-p.t*30;x.strokeText(p.text,SX(p.x),py);x.fillStyle=p.col;x.fillText(p.text,SX(p.x),py);x.globalAlpha=1;}
  x.restore();x.setTransform(1,0,0,1,0,0);
  // vignette + speed lines on nitro
  const vg=x.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');x.fillStyle=vg;x.fillRect(0,0,W,H);
  if(w.P.nitroOn){x.strokeStyle='rgba(180,220,255,.35)';x.lineWidth=2;for(let i=0;i<14;i++){const lx=((i*137+t*900)%W),ly=((i*311+t*1800)%H);x.beginPath();x.moveTo(lx,ly);x.lineTo(lx,ly+60);x.stroke();}}
  if(w.flash>0){x.fillStyle=`rgba(255,240,220,${Math.min(.7,w.flash)})`;x.fillRect(0,0,W,H);}
  if(bossLetter>.02){const h=H*.08*bossLetter;x.fillStyle='#000';x.fillRect(0,0,W,h);x.fillRect(0,H-h,W,h);}
  hud();}
 function cone(wx,wy,len,col,a){const px=SX(wx),py=SY(wy),L=len*cam.k;const g=x.createLinearGradient(px,py,px,py-L);g.addColorStop(0,`rgba(${col},${a})`);g.addColorStop(1,`rgba(${col},0)`);x.fillStyle=g;x.beginPath();x.moveTo(px-8*cam.k,py);x.lineTo(px-L*.45,py-L);x.lineTo(px+L*.45,py-L);x.lineTo(px+8*cam.k,py);x.fill();}
 function glow(wx,wy,col,r,a){const px=SX(wx),py=SY(wy),R=r*cam.k;const g=x.createRadialGradient(px,py,0,px,py,R);g.addColorStop(0,`rgba(${col},${a})`);g.addColorStop(1,`rgba(${col},0)`);x.fillStyle=g;x.beginPath();x.arc(px,py,R,0,7);x.fill();}
 // roadside scenery from the distance, so it is the same every time you pass a spot
 function decor(y0,y1,look,night){const CELL=200;for(let cy0=Math.floor(y0/CELL)*CELL;cy0<y1+CELL;cy0+=CELL)for(const side of [-1,1]){const hsh=hash(w.seed+':d:'+cy0+':'+side)>>>0,r=w.course.road(cy0),edgeX=r.c+side*(r.w/2+(look==='canal'?70:24));
   const kind=look==='street'||look==='city'?(hsh%3===0?'building':hsh%3===1?'palm':'lamp'):look==='canal'?(hsh%4===0?'grate':'none'):(hsh%3===0?'tree':hsh%3===1?'palm':'lamp');if(kind==='none')continue;
   const off=(hsh%60)+10,xx=edgeX+side*off,yy=cy0+(hsh>>8)%CELL;
   if(kind==='building'){at(xx+side*120,yy);if(!TS.pic(x,'building-'+(hsh%3+1),0,0)){x.fillStyle=night?'#262a33':['#6f6a63','#8a7f72','#5f6670'][hsh%3];x.fillRect(-90,-90,180,180);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(-90,80,180,10);x.fillStyle=night?'#3a3f4a':'#9a958d';x.fillRect(-30,-30,24,24);x.fillRect(20,10,30,18);if(night){x.fillStyle='rgba(255,210,120,.5)';for(let i=0;i<5;i++)x.fillRect(-80+i*34,-80,10,6);}}}
   else if(kind==='palm'){at(xx,yy);if(!TS.pic(x,'palm',0,0)){x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.arc(12,10,28,0,7);x.fill();x.fillStyle=night?'#1d3a24':'#2f6b3a';for(let i=0;i<8;i++){x.save();x.rotate(i*.785+hsh%5);x.beginPath();x.ellipse(0,-18,7,22,0,0,7);x.fill();x.restore();}x.fillStyle='#5a4628';x.beginPath();x.arc(0,0,5,0,7);x.fill();}}
   else if(kind==='tree'){at(xx,yy);if(!TS.pic(x,'tree',0,0)){x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.arc(10,10,30,0,7);x.fill();x.fillStyle=night?'#173020':'#3c6b2f';x.beginPath();x.arc(0,0,28,0,7);x.fill();x.fillStyle=night?'#22402b':'#4d8a3c';x.beginPath();x.arc(-8,-8,16,0,7);x.fill();}}
   else if(kind==='lamp'){at(edgeX-side*6,yy);if(!TS.pic(x,'lamp',0,0)){x.fillStyle='#777';x.fillRect(-2,-2,4,4);x.fillRect(-side*18,-1.5,18*side,3);}if(night){x.globalCompositeOperation='lighter';const g=x.createRadialGradient(-side*20,0,0,-side*20,0,80);g.addColorStop(0,'rgba(255,200,120,.35)');g.addColorStop(1,'rgba(255,200,120,0)');x.fillStyle=g;x.beginPath();x.arc(-side*20,0,80,0,7);x.fill();x.globalCompositeOperation='source-over';}}
   else if(kind==='grate'){at(edgeX-side*30,yy);x.fillStyle='#2a2a2c';x.fillRect(-14,-20,28,40);x.fillStyle='#555';for(let i=0;i<5;i++)x.fillRect(-12,-18+i*8,24,3);}}}
 function drawFoe(e,night){const sc=1;at(e.x,e.y,e.yaw||0,sc);
  if(e.type==='spikes'){if(!TS.pic(x,'spikes',0,0,0,e.w/128)){x.fillStyle=e.popped?'#555':'#222';x.fillRect(-e.w/2,-5,e.w,10);x.fillStyle='#bbb';for(let i=-e.w/2;i<e.w/2;i+=8){x.beginPath();x.moveTo(i,-5);x.lineTo(i+4,-12);x.lineTo(i+8,-5);x.fill();}}return;}
  if(e.type==='t1000foot'){const lean=clamp((e.vx||0)/300,-.4,.4);const head=A.t1000(x,{t:e.t*1.2,state:e.state,st:e.t,splash:e.splash,lean});
   if(head){const fs=26*cam.k,hx=SX(e.x)+lean*6*cam.k,hy=SY(e.y)-(e.state==='crouch'?6:14)*cam.k;x.setTransform(1,0,0,1,0,0);tFace(e.state==='leap'?'win':'normal')(x,hx,hy,fs);if(e.hit>0){x.globalCompositeOperation='lighter';x.fillStyle='rgba(220,235,255,.4)';x.beginPath();x.arc(hx,hy+10*cam.k,18*cam.k,0,7);x.fill();x.globalCompositeOperation='source-over';}}
   return;}
  if(e.type==='moto'||e.type==='t1000bike'){A.moto(x,{t:e.t,boss:e.type==='t1000bike',blade:e.state==='blade',lean:clamp((e.vx||0)/300,-1,1)});if(e.type==='t1000bike'){x.setTransform(1,0,0,1,0,0);tFace(e.state==='blade'?'win':'normal')(x,SX(e.x),SY(e.y)+2*cam.k,22*cam.k);}
   if(e.aim>0){x.setTransform(1,0,0,1,0,0);x.fillStyle=`rgba(255,80,40,${.5+.5*Math.sin(t*40)})`;x.beginPath();x.arc(SX(e.x),SY(e.y)-14*cam.k,5*cam.k,0,7);x.fill();}return;}
  const kind=e.type==='roadcar'?'roadcar':e.type==='civ'?'civ':e.type==='truck'?'truck':e.type;
  A.car(x,kind,{t:e.t+e.id,night,id:e.id,col:e.col,blink:e.blink,bdir:e.bdir,brake:e.v<w.cruise*.95,rig:e.rig||e.state==='leave'&&e.type==='truck'&&false,flash:e.flash,valves:e.valves});
  if(e.type==='truck'&&(e.rig)){x.setTransform(1,0,0,1,0,0);x.fillStyle=`rgba(80,255,120,${.4+.3*Math.sin(t*6)})`;x.font=`900 ${12*cam.k}px sans-serif`;x.textAlign='center';x.fillText('▼ RAMP ▼',SX(e.x),SY(e.y-e.h/2-14));}
  if(e.state==='tell'||e.state==='rev'){x.setTransform(1,0,0,1,0,0);const a=.4+.4*Math.sin(t*40);x.fillStyle=`rgba(255,230,120,${a})`;x.beginPath();x.arc(SX(e.x),SY(e.y+e.h/2),14*cam.k,0,7);x.fill();
   if(e.state==='rev'){x.strokeStyle=`rgba(255,40,40,${a})`;x.lineWidth=Math.max(2,4*cam.k);x.setLineDash([10,8]);x.beginPath();x.moveTo(SX(e.lockX??e.x),SY(e.y));x.lineTo(SX(e.lockX??e.x),SY(e.y+900));x.stroke();x.setLineDash([]);}}
  if(e.boss&&(e.type==='towtruck'||e.type==='tanker')){x.setTransform(1,0,0,1,0,0);tFace('normal')(x,SX(e.x-10),SY(e.y+e.h/2-22),20*cam.k);}}
 function drawPlayer(night){const P=w.P,V=D.VEHICLES[P.veh];if(P.dead)return;const air=P.air>0?Math.sin((1-P.air/P.airT)*Math.PI):0,sc=1+air*.35;
  if(air>0){at(P.x+air*10,P.y-air*14);x.fillStyle='rgba(0,0,0,.3)';A.rr(x,-V.w/2,-V.h/2,V.w,V.h,8);x.fill();}
  const blink=P.invT>0&&P.hitT<=0&&Math.sin(t*30)<-.3;if(blink)return;
  at(P.x,P.y,P.yaw,sc);let fo=FACE[P.veh];
  if(P.veh==='bike')A.bike(x,{lean:P.yaw/.35,headlight:night});else A.car(x,P.veh,{t,night});
  if(P.shieldT>0){x.strokeStyle=`rgba(197,139,255,${.5+.3*Math.sin(t*8)})`;x.lineWidth=3;x.beginPath();x.ellipse(0,0,V.w*.9,V.h*.65,0,0,7);x.stroke();}
  if(P.hitT>0){x.globalCompositeOperation='lighter';x.fillStyle=`rgba(255,60,40,${P.hitT})`;A.rr(x,-V.w/2,-V.h/2,V.w,V.h,8);x.fill();x.globalCompositeOperation='source-over';}
  if(P.nitroOn){x.fillStyle=`rgba(80,180,255,${.6+.4*Math.random()})`;for(const sx of [-V.w*.25,V.w*.25]){x.beginPath();x.moveTo(sx-4,V.h/2);x.lineTo(sx,V.h/2+18+Math.random()*14);x.lineTo(sx+4,V.h/2);x.fill();}}
  // the player's face on the rider / out of the roof hatch
  const ca=Math.cos(P.yaw),sa=Math.sin(P.yaw),fx=fo[0]*ca-fo[1]*sa,fy=fo[0]*sa+fo[1]*ca;x.setTransform(1,0,0,1,0,0);
  pFace(cur,shownMood)(x,SX(P.x)+fx*cam.k*sc,SY(P.y)+fy*cam.k*sc,fo[2]*cam.k*sc);}

 // ------------------------------------------------------------------ HUD
 function hud(){const P=w.P,top=Math.max(8,(fb.top||0)+6),fs=clamp(Math.min(W,H)*.032,11,17),pad=10;
  // portrait + health
  const pr=fs*2.1;x.fillStyle='rgba(0,0,0,.55)';A.rr(x,pad,top,Math.min(W*.42,230),pr*1.15+fs*1.6,10);x.fill();
  x.save();x.beginPath();x.arc(pad+pr*.62,top+pr*.6,pr*.5,0,7);x.clip();x.fillStyle='#1b2433';x.fillRect(pad,top,pr*1.3,pr*1.3);pFace(cur,shownMood)(x,pad+pr*.62,top+pr*.66,pr*.85);x.restore();
  const bx=pad+pr*1.25,bw=Math.min(W*.42,230)-pr*1.35,hpK=clamp(P.hp/P.maxHp,0,1);x.fillStyle='#300';A.rr(x,bx,top+pr*.25,bw,fs*.75,4);x.fill();
  x.fillStyle=hpK>.5?'#5dff7a':hpK>.25?'#ffd23f':'#ff4d4d';A.rr(x,bx,top+pr*.25,bw*hpK,fs*.75,4);x.fill();
  x.font=`900 ${fs}px Impact,"Arial Black",sans-serif`;x.textAlign='left';x.textBaseline='top';x.fillStyle='#fff';x.fillText(w.score.toLocaleString(),bx,top+pr*.25+fs*.95);
  if(w.combo>1){x.fillStyle='#ffd23f';x.fillText('x'+w.combo.toFixed(1).replace('.0',''),bx+x.measureText(w.score.toLocaleString()).width+8,top+pr*.25+fs*.95);}
  x.font=`700 ${fs*.72}px sans-serif`;x.fillStyle='#cfd8e6';x.fillText(`${D.GUNS[P.gun].name}${two?' · '+names[cur]:''}`,pad+6,top+pr*1.18);
  // progress or boss bar (top centre, below the pills on narrow screens)
  const pw=Math.min(W*.5,320),px=(W-pw)/2,py=W<520?top+pr*1.15+fs*2:top+4;
  if(w.boss&&!w.bossDone){const b=w.boss,F=D.FOES[b.type];let k2=b.max<1e8?clamp(b.hp/b.max,0,1):b.type==='t1000foot'?1-b.knock/b.need:b.valves?b.valves.filter(v=>v.hp>0).length/3:1;
   x.fillStyle='rgba(0,0,0,.6)';A.rr(x,px-4,py-2,pw+8,fs*1.9,6);x.fill();x.fillStyle='#ff5a3a';x.font=`900 ${fs*.8}px Impact,sans-serif`;x.textAlign='center';x.fillText(F.name,W/2,py);x.fillStyle='#400';x.fillRect(px,py+fs*.95,pw,fs*.6);x.fillStyle='#ff3b30';x.fillRect(px,py+fs*.95,pw*k2,fs*.6);}
  else if(!w.bossDone){x.fillStyle='rgba(0,0,0,.45)';A.rr(x,px,py,pw,fs*.6,4);x.fill();x.fillStyle='#4fc3ff';A.rr(x,px,py,pw*w.progress,fs*.6,4);x.fill();x.font=`${fs}px sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('💀',px+pw,py+fs*.3);x.fillText(P.veh==='bike'?'🏍️':'🚗',px+pw*w.progress,py+fs*.3);}
  // warnings from behind
  for(const k of w.warns){if(k.done)continue;const sx=clamp(SX(k.x),24,W-24),a=.5+.5*Math.sin(t*16),big=k.type==='boss';x.fillStyle=big?`rgba(255,40,40,${a})`:`rgba(255,${(t*8|0)%2?60:60},${(t*8|0)%2?60:255},${a})`;
   const sz=big?34:22;x.beginPath();x.moveTo(sx,H-sz*2.4);x.lineTo(sx-sz,H-sz*.9);x.lineTo(sx+sz,H-sz*.9);x.fill();x.fillStyle='#fff';x.font=`900 ${sz*.8}px Impact,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('!',sx,H-sz*1.45);
   if(big){x.font=`900 ${fs*1.4}px Impact,sans-serif`;x.fillText('IT\'S RIGHT BEHIND YOU',W/2,H*.78);}}
  // banners
  if(w.banner){const b=w.banner,a=clamp(b.t*3,0,1),bf=C.fitFs(x,b.text,W*.9,Math.min(W,H)*.075);x.globalAlpha=a;C.chrome(x,b.text,W/2,H*.3,bf,1,{glow:b.boss?'#ff2a2a':'#ff8a00'});x.globalAlpha=1;}
  // buttons
  const B=btns();x.textAlign='center';x.textBaseline='middle';
  x.fillStyle='rgba(0,0,0,.45)';x.beginPath();x.arc(B.nitro.x,B.nitro.y,B.nitro.r,0,7);x.fill();x.strokeStyle='#4fc3ff';x.lineWidth=5;x.beginPath();x.arc(B.nitro.x,B.nitro.y,B.nitro.r-3,-Math.PI/2,-Math.PI/2+6.283*P.nitro/100);x.stroke();
  x.fillStyle=P.nitroOn?'#bfe9ff':'#fff';x.font=`900 ${B.nitro.r*.42}px Impact,sans-serif`;x.fillText('NITRO',B.nitro.x,B.nitro.y);
  const gOn=P.grenades>0;x.fillStyle=gOn?'rgba(80,30,0,.6)':'rgba(0,0,0,.4)';x.beginPath();x.arc(B.m79.x,B.m79.y,B.m79.r,0,7);x.fill();x.strokeStyle=gOn?'#ffb347':'#555';x.lineWidth=3;x.stroke();
  const gi=TS.picture('gun-m79');if(gi){const gw=B.m79.r*1.5;x.drawImage(gi,B.m79.x-gw/2,B.m79.y-gw/4-B.m79.r*.15,gw,gw/2);}else{x.fillStyle='#fff';x.font=`900 ${B.m79.r*.45}px Impact,sans-serif`;x.fillText('M79',B.m79.x,B.m79.y-B.m79.r*.12);}
  x.fillStyle=gOn?'#ffd23f':'#888';x.font=`900 ${B.m79.r*.4}px Impact,sans-serif`;x.fillText('×'+P.grenades,B.m79.x,B.m79.y+B.m79.r*.42);
  if(w.boss?.m79&&gOn){x.strokeStyle=`rgba(255,210,60,${.5+.5*Math.sin(t*12)})`;x.lineWidth=4;x.beginPath();x.arc(B.m79.x,B.m79.y,B.m79.r*1.25,0,7);x.stroke();}
  if(mem.runs<2&&w.t<9&&w.st.tip&&!two){x.globalAlpha=clamp(9-w.t,0,1);C.caption(x,W,H,w.st.tip,99,{y:H*.55,size:fs*1.05,typed:false});x.globalAlpha=1;}}

 // ------------------------------------------------------------------ overlays
 function drawCut(){x.setTransform(1,0,0,1,0,0);x.fillStyle='#000';x.fillRect(0,0,W,H);try{cut.draw(x,W,H,cutT);}catch(e){console.warn(e);}
  if(cutT>.6&&!(cut.qte&&cutT>cut.qte[0]-.5)){x.fillStyle='rgba(255,255,255,.5)';x.font=`700 ${clamp(W*.03,10,13)}px sans-serif`;x.textAlign='right';x.textBaseline='bottom';x.fillText('TAP TO SKIP ▸',W-12,H-8);}}
 function drawCards(){x.setTransform(1,0,0,1,0,0);const a=clamp(cardsFor.t*4,0,1);x.fillStyle=`rgba(0,0,0,${.7*a})`;x.fillRect(0,0,W,H);
  const fs=clamp(Math.min(W,H)*.06,18,34);C.chrome(x,cardsFor.title,W/2,H*.13+(fb.top||0)*.5,C.fitFs(x,cardsFor.title,W*.9,fs),a,{glow:'#5dff7a'});
  x.font=`700 ${fs*.4}px sans-serif`;x.fillStyle='#cfd8e6';x.textAlign='center';x.fillText('Pick one upgrade for the rest of the run',W/2,H*.13+fs*.9);
  const list=cardsFor.list,n=list.length,wide=W>H*1.05,cw=wide?Math.min(220,(W-40)/n-14):Math.min(W-40,420),ch=wide?Math.min(H*.55,260):Math.min((H*.66)/n-12,120);ui.cards=[];
  list.forEach((cd,i)=>{const bx=wide?W/2+(i-(n-1)/2)*(cw+14)-cw/2:(W-cw)/2,by=wide?H*.3:H*.24+i*(ch+12),pop=clamp(cardsFor.t*5-i*.5,0,1),lv=w?.cards?.[cd.id]|0;
   x.save();x.translate(bx+cw/2,by+ch/2);x.scale(.7+.3*pop,.7+.3*pop);x.globalAlpha=pop;x.fillStyle='#101826';A.rr(x,-cw/2,-ch/2,cw,ch,14);x.fill();x.strokeStyle='#5dff7a';x.lineWidth=2;x.stroke();
   const ic=Math.min(ch*.4,cw*.3);x.font=`${ic}px sans-serif`;x.textAlign='center';x.textBaseline='middle';if(wide){x.fillText(cd.icon,0,-ch*.25);}else x.fillText(cd.icon,-cw/2+ic*.8,0);
   const tx=wide?0:-cw/2+ic*1.6,ta=wide?'center':'left';x.textAlign=ta;x.fillStyle='#fff';x.font=`900 ${clamp(ch*.17,13,20)}px Impact,sans-serif`;x.fillText(cd.name+(lv?` (${lv+1})`:''),tx,wide?ch*.02:-ch*.18);
   x.fillStyle='#b8c4d6';x.font=`600 ${clamp(ch*.12,10,14)}px sans-serif`;const words=cd.text.split(' ');let line='',ly=wide?ch*.18:ch*.06,maxW=wide?cw-20:cw-ic*1.8;for(const wd of words){const tl=line?line+' '+wd:wd;if(x.measureText(tl).width>maxW&&line){x.fillText(line,tx,ly);line=wd;ly+=clamp(ch*.13,11,16);}else line=tl;}x.fillText(line,tx,ly);
   x.restore();ui.cards.push({x:bx,y:by,w:cw,h:ch,v:cd.id});});}
 function drawTally(){const d=tallyData,a=clamp(d.t*3,0,1);x.setTransform(1,0,0,1,0,0);x.fillStyle=`rgba(0,0,0,${.72*a})`;x.fillRect(0,0,W,H);
  const fs=clamp(Math.min(W,H)*.09,24,54);C.chrome(x,d.title,W/2,H*.24,C.fitFs(x,d.title,W*.9,fs),a,{glow:d.good?'#4fc3ff':'#ff2a2a'});
  x.font=`700 ${fs*.36}px sans-serif`;x.textAlign='center';x.textBaseline='middle';d.rows.forEach((r,i)=>{const ra=clamp(d.t*4-i*.6-1,0,1);x.globalAlpha=ra;x.fillStyle=i===d.rows.length-1?'#ffd23f':'#e6edf7';x.fillText(r,W/2,H*.38+i*fs*.55);});x.globalAlpha=1;
  if(d.t>1){x.fillStyle=`rgba(255,255,255,${.5+.4*Math.sin(t*4)})`;x.font=`700 ${fs*.3}px sans-serif`;x.fillText(d.hint||'TAP TO CONTINUE',W/2,H*.86);}}
 function drawTitle(dt){titleData.t+=dt;const T=titleData.t;x.setTransform(1,0,0,1,0,0);
  const sh=require("src/bgShape.js").shape(W,H),bg=TS.picture(sh==='wide'?'title-bg':'title-bg-'+sh)||TS.picture('title-bg');
  if(bg){const kk=Math.max(W/bg.width,H/bg.height);x.drawImage(bg,(W-bg.width*kk)/2,(H-bg.height*kk)/2,bg.width*kk,bg.height*kk);}
  else{const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#14070a');g.addColorStop(.5,'#c2451c');g.addColorStop(.52,'#2a1810');g.addColorStop(1,'#080606');x.fillStyle=g;x.fillRect(0,0,W,H);
   x.fillStyle='#ffcf6a';x.globalAlpha=.8;x.beginPath();x.arc(W/2,H*.5,Math.min(W,H)*.16,Math.PI,0);x.fill();x.globalAlpha=1;
   // the storm drain rushing toward us
   x.fillStyle='#3c342e';x.beginPath();x.moveTo(W*.44,H*.52);x.lineTo(W*.56,H*.52);x.lineTo(W*1.1,H);x.lineTo(-W*.1,H);x.fill();x.strokeStyle='rgba(255,210,120,.35)';x.lineWidth=2;for(let i=0;i<8;i++){const p=((i/8+T*.6)%1),yy=H*.52+p*p*H*.48;x.beginPath();x.moveTo(W/2-(W*.06+p*W*.55),yy);x.lineTo(W/2+(W*.06+p*W*.55),yy);x.stroke();}
   const ss=Math.min(W,H)/260;x.save();x.translate(W/2,H*.82);x.scale(ss*1.4,ss*1.4);A.bike(x,{lean:Math.sin(T*1.5)*.4});x.restore();pFace(0,'normal')(x,W/2,H*.82-3*ss*1.4,30*ss*1.4);}
  const logo=TS.picture('logo');if(logo){const kk=Math.min(W*.86/logo.width,H*.3/logo.height);x.drawImage(logo,W/2-logo.width*kk/2,H*.2-logo.height*kk/2,logo.width*kk,logo.height*kk);}
  else{const f1=C.fitFs(x,'JUDGMENT DAY',W*.88,Math.min(W,H)*.13);C.chrome(x,'JUDGMENT DAY',W/2,H*.15,f1);C.chrome(x,'CHASE',W/2,H*.15+f1*1.02,f1*.85);}
  const opts=titleData.opts,bw=Math.min(W*.7,300),bh=clamp(H*.075,40,58);ui.title=[];
  opts.forEach((o,i)=>{const bx=(W-bw)/2,by=H*.48+i*(bh+12);x.fillStyle=i===0?'#c0281b':'rgba(0,0,0,.65)';A.rr(x,bx,by,bw,bh,12);x.fill();x.strokeStyle='#ffd23f';x.lineWidth=2;x.stroke();
   x.fillStyle='#fff';x.font=`900 ${bh*.42}px Impact,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(o.label,W/2,by+bh/2);ui.title.push({x:bx,y:by,w:bw,h:bh,v:o.v});});
  x.font=`700 ${clamp(W*.03,11,15)}px sans-serif`;x.fillStyle='#ffd23f';x.textAlign='center';x.fillText(mem.best?`BEST ${mem.best.toLocaleString()}`:'5 stages · bosses · upgrades',W/2,H*.48+opts.length*(bh+12)+14);}
 function tally(title,rows,good,hint){return new Promise(r=>{tallyData={title,rows,good,t:0,done:r,hint};mode='tally';});}

 // ------------------------------------------------------------------ one stage
 async function runStage(pi,run,stage,loop){cur=pi;const st=D.STAGES[stage];
  await play(C.stageCard(st,stage,[pFace(pi,'angry'),stage===0?tFace():radioFace]));if(!s.alive)return 'quit';
  w=S.makeWorld({stage,seed:s.seed+(board?':b':''),run,loop});logI=0;cam={x:0,y:0,k:1,z:1};mode='play';snd.music(true);snd.level(1);
  if(run.gun&&D.GUNS[run.gun])w.P.gun=run.gun;
  // play until the boss falls or we die
  for(;;){await s.wait(100);if(!s.alive)return 'quit';
   if(w.phase==='dead'&&w.slowT<=0){await s.wait(900);break;}
   if(w.phase==='outro'&&w.outro.t>1.6)break;}
  const P=w.P,won=w.phase==='outro';
  run.score=w.score;run.hp=P.hp;run.gun=P.gun;run.grenades=P.grenades;run.nitro=P.nitro;run.cards=w.cards;
  if(!won)return 'dead';
  // the boss cutscene
  const kind=w.outro.kind;snd.setLoops({on:false});
  if(kind==='towtruck')await play(C.crash(tFace()));else if(kind==='t1000foot')await play(C.lose(tFace()));
  else if(kind==='tanker'){await play(C.finale(tFace(),ok=>{snd.sfx('boom',1.4);if(ok)run.score+=10000;}));snd.sfx('shatter');}
  else await play(C.down(kind));
  if(!s.alive)return 'quit';
  const bonus=1500*(stage+1)*(1+loop)+Math.round(P.hp)*10;run.score+=bonus;
  await tally(`${st.title} CLEARED`,[`Kills ${w.kills}`,`Takedowns ${w.takedowns}`,`Near misses ${w.near}`,`Health bonus ${Math.round(P.hp)*10}`,`Stage bonus ${1500*(stage+1)*(1+loop)}`,`SCORE ${run.score.toLocaleString()}`],true);
  return 'clear';}
 async function stash(run){// Sarah's stash between stages: repair half, pick a card
  const fake={cards:run.cards,seed:s.seed,stage:run.stage,loop:run.loop,kills:run.score%97};const list=S.dealCards(fake,3);if(!list.length)return;
  mode='play';const id=await offerCards(list,'SARAH\'S STASH');run.cards[id]=(run.cards[id]|0)+1;if(id==='m79')run.grenades=(run.grenades??3)+3;}

 // ------------------------------------------------------------------ the game
 await TS.ready(['logo','title-bg','title-bg-tall','title-bg-fold'],2500);
 const freshRun=()=>({stage:0,loop:0,score:0,hp:9999,gun:null,grenades:3,nitro:60,cards:{},cont:duel?0:2,out:false,cleared:0});
 if(solo){let start=0;
  if(!duel){titleData={t:0,opts:[{label:'START',v:0},...(mem.reached>0?[{label:`CONTINUE · STAGE ${Math.min(5,mem.reached+1)}`,v:Math.min(4,mem.reached)}]:[])]};mode='title';start=await new Promise(r=>{titleData.done=r;});if(!s.alive)return;}
  if(!mem.seenIntro||start===0){await play(C.intro());mem.seenIntro=1;save(mem);}
  const run=freshRun();run.stage=start;
  for(;;){const res=await runStage(0,run,run.stage,run.loop);if(res==='quit'||!s.alive)return;
   mem.runs=(mem.runs|0)+1;
   if(res==='clear'){run.cleared++;soloProgress(s,run.score,run.cleared,`${D.STAGES[run.stage].title} cleared`);mem.reached=Math.max(mem.reached,run.loop?4:run.stage+1);mem.best=Math.max(mem.best,run.score);save(mem);
    run.stage++;if(run.stage>=D.STAGES.length){await play(C.ending(run.score,pFace(0,'win')));run.stage=0;run.loop++;await tally('JUDGMENT DAY MODE',[`Loop ${run.loop+1}: everything faster and tougher`,'Your upgrades come with you'],true,'TAP TO KEEP DRIVING');}
    run.hp=Math.max(run.hp,(D.VEHICLES[D.STAGES[run.stage].vehicle].hp+30*(run.cards.armor|0))*.5)+30;await stash(run);continue;}
   // dead: continue?
   if(run.cont>0){const c2=await new Promise(r=>{titleData={t:0,opts:[{label:`CONTINUE (${run.cont} LEFT, SCORE HALVED)`,v:1},{label:'GAME OVER',v:0}],done:r};mode='title';});
    if(c2&&s.alive){run.cont--;run.score=Math.floor(run.score/2);run.hp=9999;continue;}}
   break;}
  mem.best=Math.max(mem.best,run.score);save(mem);snd.stop();
  soloFinish(s,run.score,run.cleared,`Judgment Day Chase · ${run.cleared} stage${run.cleared===1?'':'s'} · ${run.score.toLocaleString()}`,run.cleared>0);return;}
 // two players on one phone: stage by stage, each with their own run; board = one stage each
 const runs=[freshRun(),freshRun()];runs.forEach(r=>r.cont=0);const boardStage=board?(hash(s.seed+':tcstage')>>>0)%3:0;
 if(!board){await play(C.intro());if(!s.alive)return;}
 for(let stage=board?boardStage:0;stage<D.STAGES.length;stage++){
  for(let pi=0;pi<2;pi++){const run=runs[pi];if(run.out)continue;mode='boot';
   if(!await s.pass(pi,`${names[pi]}: ${D.STAGES[stage].title}. Drag anywhere to drive; the T-800 shoots by himself. Tap M79 for grenades, hold NITRO. ${pi&&runs[0].score?`Beat ${runs[0].score.toLocaleString()}.`:''}`,'Ready — drive',{summary:`${names[0]} ${runs[0].score.toLocaleString()} · ${names[1]} ${runs[1].score.toLocaleString()}`}))return;
   mode='boot';run.stage=stage;const res=await runStage(pi,run,stage,0);if(res==='quit'||!s.alive)return;
   if(res==='dead'){run.out=true;await tally(`${names[pi].toUpperCase()} IS DOWN`,[`Score ${run.score.toLocaleString()}`],false);}
   else{run.cleared++;if(!board&&stage<D.STAGES.length-1)await stash(run);run.hp=Math.max(run.hp,60)+30;}}
  if(board||runs.every(r=>r.out))break;}
 snd.stop();const sc=runs.map(r=>r.score);s.finish(sc,`Judgment Day Chase · ${names[0]} ${sc[0].toLocaleString()} vs ${names[1]} ${sc[1].toLocaleString()}`);}

Object.assign(exports,{terminatorChase});
