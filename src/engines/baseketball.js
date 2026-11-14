// BASEketball (owner, Nov 14): a bar-top "Hoop Jones" style shooter seen FROM BEHIND the shooter, in a stadium like the movie
// BASEketball (1998), with a baseball jumbo scoreboard. Two modes (game.bkMode):
//  'movie' (baseketball-shootout): the movie's rules. The batter picks a base spot (single, double, triple, home run: further =
//    more bases), flicks the ball up to shoot; a make is a hit (runners advance that many bases), a miss is an out, three outs
//    and the sides switch. The DEFENDER psychs the shooter out while they line up (3 per half-inning): pick a filthy line from
//    the list or type your own (src/data/psychOuts.js); the shooter's hands shake for the next shot.
//  'hoop' (baseketball-hoop-jones): the arcade machine. Four shooting spots in turn (4 balls each, the last one = money ball x2),
//    40 s levels with a target score; every level the shots are longer and the basket slides side to side further and faster.
//    Miss the target and the run is over; the score adds up.
// Shooting: put a finger anywhere in the bottom of the screen and flick up: how far you flick = power, sideways = aim.
// Art: drop-ins in src/data/baseketballSprites.js (assets/baseketball), everything else drawn here.
// Online (s.online): movie = the batter's phone shoots and judges: base pick {sp}, launch {l:[x,y,z,vx,vy,vz]}, result {res};
// the defender's phone sends a psych {ps:text}, the batter's phone accepts it while aiming and confirms {psd:text} on both.
// Hoop Jones online = both play their own run at once (netField snapshots {sc,lv}), higher score wins.
const {clamp}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {makeFx,makeShake,sfx,voice,noise}=require("src/engines/tarantinoKit.js");
const {isCpu,isOnline,cpuSkill,cpuHotseat}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");
const BK=require("src/data/baseketballSprites.js");
const {PSYCH_SHOUTS,dealPsych,fillPsych}=require("src/data/psychOuts.js");
const {soloProgress,soloFinish}=require("src/solo.js");

// world units = feet; the rim's centre is at (hx, 10, 0), the court runs toward -z, the backboard's face is at z = BOARD_Z
const G=32,RIM_Y=10,RIM_R=.75,BALL_R=.39,BOARD_Z=1.25,REL_Y=6.6,ALPHA=58*Math.PI/180,CAM_UP=9.5,CAM_BACK=7,PITCH=-.14;
const BASES=[{k:'1B',name:'SINGLE',d:12,ang:.6},{k:'2B',name:'DOUBLE',d:17,ang:.22},{k:'3B',name:'TRIPLE',d:22,ang:-.32},{k:'HR',name:'HOME RUN',d:28,ang:0}];
const INNINGS=3,MAXSHOTS=10,PSYCHS=3;
const HJ_SPOTS=[-.7,-.25,.25,.7],HJ_TIME=40,HJ_BALLS=4;
const hjTarget=n=>12+4*n,hjDist=n=>Math.min(26,13+1.6*(n-1)),hjAmp=n=>Math.min(4.2,.95*(n-1)),hjSpeed=n=>.6+.22*(n-1);
const vFor=D=>{const h=RIM_Y-REL_Y,c=Math.cos(ALPHA);return Math.sqrt(G*D*D/(2*c*c*Math.max(.5,D*Math.tan(ALPHA)-h)));};
const V0=vFor(6),V1=vFor(38),speedOf=p=>V0+p*(V1-V0),powerFor=D=>(vFor(D)-V0)/(V1-V0);
const HOME=['#1f6b3a','#f2c230'],AWAY=['#e0601a','#161616'];   // Beers green/gold, visitors orange/black

async function basketball2p(s){
 // Hoop Jones is its own game now (owner, Nov 14 round 2: four shooters, tap to shoot, like the Megatouch machine)
 if(s.game?.bkMode==='hoop')return require("src/engines/hoopJones.js").hoopJones(s);
 const mode=s.game?.bkMode==='hoop'?'hoop':'movie';
 const [c,x]=s.canvas(760,560,{fill:true});const fb=fullBleed(s,{bg:'#05081a'});s.body.classList.add('drag-arena-body');s.controls([]);
 const fx=makeFx(),shake=makeShake(),net=isOnline(s)?s.online:null,me=net?net.me:0,cpu=isCpu(s);if(net&&mode==='movie')s.hotseat=true;
 BK.preloadBaseketball();
 // ---------------------------------------------------------------- state
 let t=0,phase='wait',msg='',msgT=0,msgCol='#ffd23f',ball=null,flick=null,shotT=0;
 // shooter view: spot distance d and angle ang (from straight in front of the board), hx = rim x (Hoop Jones slides it)
 const view={d:12,ang:0,hx:0};
 // movie
 const runs=[0,0],line=[[],[]];let half=0,bat=0,outs=0,bases=[0,0,0],spot=0,psychLeft=PSYCHS,shaken=0,psychText='',psychBy=0,psychT=0,shots=0;
 // hoop
 const H={who:0,level:1,score:0,lvScore:0,timeLeft:HJ_TIME,spotI:0,ballI:0,amp:0,spd:0,ph:0,over:false,scores:[0,0],levels:[0,0]};
 let remoteH=null;
 const shooterIdx=()=>mode==='movie'?bat:H.who;
 const theirs=()=>!!net&&mode==='movie'&&bat!==me;
 // ---------------------------------------------------------------- camera / projection
 const L={};let cam=null;
 function layout(){const W=s.W,Hh=s.H,wide=W>Hh*1.15,top=fb.top||44;
  const jw=wide?Math.min(W*.4,380):W-16,jh=wide?jw*.4:Math.min(W*.33,Hh*.19),jx=8,jy=wide?8:top+4;
  const topSafe=wide?Math.max(8,jy+jh*.2):jy+jh+6,cyS=Hh*(wide?.46:.52);
  const f=Math.min(1.75*Math.min(W,Hh),Math.max(200,(cyS-topSafe)*(12+CAM_BACK)/5.6));
  Object.assign(L,{W,H:Hh,wide,jx,jy,jw,jh,top,cyS,f,u:Math.min(W,Hh)/30});}
 function setCam(){const a=view.ang,sx=Math.sin(a)*view.d,sz=-Math.cos(a)*view.d,dx=-Math.sin(a),dz=Math.cos(a);   // dir from the shooter to the rim
  cam={x:sx-dx*CAM_BACK,y:CAM_UP,z:sz-dz*CAM_BACK,yaw:Math.atan2(dx,dz),sx,sz,dx,dz};cam.cy=Math.cos(cam.yaw);cam.sy=Math.sin(cam.yaw);cam.cp=Math.cos(PITCH);cam.sp=Math.sin(PITCH);}
 function P(px,py,pz){const dx=px-cam.x,dy=py-cam.y,dz=pz-cam.z,rx=dx*cam.cy-dz*cam.sy,rz=dx*cam.sy+dz*cam.cy,ry=dy*cam.cp-rz*cam.sp,zz=dy*cam.sp+rz*cam.cp;
  if(zz<.3)return null;return {x:L.W/2+L.f*rx/zz,y:L.cyS-L.f*ry/zz,z:zz,k:L.f/zz};}
 const relPos=()=>({x:cam.sx,y:REL_Y,z:cam.sz});
 // ---------------------------------------------------------------- shooting
 function launchFrom(p,aim){   // p = power 0..1.3, aim = sideways ratio (-1..1)
  const r=relPos(),tgt={x:view.hx,z:0},yaw0=Math.atan2(tgt.x-r.x,tgt.z-r.z),yaw=yaw0+clamp(aim,-1.2,1.2)*.12,v=speedOf(p),vh=v*Math.cos(ALPHA);
  return [r.x,r.y,r.z,Math.sin(yaw)*vh,v*Math.sin(ALPHA),Math.cos(yaw)*vh];}
 function launch(arr,remote=false){if(!arr||ball&&ball.fly)return;const [bx,by,bz,vx,vy,vz]=arr.map(Number);if(![bx,by,bz,vx,vy,vz].every(Number.isFinite))return;
  if(net&&mode==='movie'&&!remote)net.send({l:[bx,by,bz,vx,vy,vz].map(q=>+q.toFixed(3))});
  ball={x:bx,y:by,z:bz,vx,vy,vz,fly:true,made:false,touch:false,bounces:0,t:0,spin:0,done:false};phase='fly';shotT=.45;shots++;flick=null;
  sfx.whoosh(300,1100,.06,.2);if(mode==='movie')shaken=0;}
 // shot assist (like the bar machines): your power error shrinks to a third, your aim error to a half (Hoop Jones keeps
 // more of your aim so you can lead the sliding basket); a psych-out's shake comes on top, after the help
 const ASSIST_P=.33,ASSIST_A=mode==='hoop'?.8:.5;
 function assisted(p,aim){const D=Math.hypot(cam.sx-view.hx,cam.sz),pp=powerFor(D);return [pp*(1+.03*(12/D)**1.8)+(p-pp)*ASSIST_P*Math.sqrt(12/Math.max(12,D)),aim*ASSIST_A];}   // centred in the make window (short = front rim, long rolls in): +3% at 12 ft, +.7% at 28 ft
 function shoot(p,aim){if(phase!=='aim'||(ball&&ball.fly))return;[p,aim]=assisted(p,aim);
  if(shaken>0){const r=Math.random;p*=1+(r()-.5)*.12;aim+=(r()-.5)*.7;}   // psyched out: the hands shake
  launch(launchFrom(p,aim));}
 function cpuShot(){const sk=cpuSkill(s),D=Math.hypot(cam.sx-view.hx,cam.sz),e=((1-sk)*.11+.03)*2.6;
  const lead=mode==='hoop'?(H.amp*Math.cos(H.ph)*H.spd)*.06:0;shoot(powerFor(D)*(1+(Math.random()-.5)*e*1.3),(Math.random()-.5)*e*6+lead);}
 // ---------------------------------------------------------------- physics (sub-steps at 240 Hz)
 function physics(dt){const b=ball;b.t+=dt;b.spin+=dt*9;const n=Math.max(1,Math.ceil(dt*240)),h=dt/n,hx=view.hx;
  for(let i=0;i<n;i++){const py=b.y;b.vy-=G*h;b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h;
   // backboard: 6 ft wide, 9.5..13 ft up, face at z = BOARD_Z
   if(b.vz>0&&b.z+BALL_R>BOARD_Z&&b.z<BOARD_Z+.4&&Math.abs(b.x-hx)<3.05&&b.y>RIM_Y-.6&&b.y<RIM_Y+3.1){b.z=BOARD_Z-BALL_R;b.vz*=-.58;b.vx*=.86;b.vy*=.92;b.touch=true;sfx.thump(.12);}
   // rim: a ring (tube) of radius RIM_R round the rim centre
   const qx=b.x-hx,qz=b.z,ql=Math.hypot(qx,qz)||1e-6,cx=hx+qx/ql*RIM_R,cz=qz/ql*RIM_R,dx=b.x-cx,dy=b.y-RIM_Y,dz=b.z-cz,dd=Math.hypot(dx,dy,dz),lim=BALL_R+.025;   /* rim rod ~5/8 in */
   if(dd<lim&&dd>1e-6){const nx=dx/dd,ny=dy/dd,nz=dz/dd,vn=b.vx*nx+b.vy*ny+b.vz*nz;b.x=cx+nx*lim;b.y=RIM_Y+ny*lim;b.z=cz+nz*lim;
    if(vn<0){b.vx-=1.5*vn*nx;b.vy-=1.5*vn*ny;b.vz-=1.5*vn*nz;b.vx*=.84;b.vy*=.84;b.vz*=.84;if(!b.clankT||b.t-b.clankT>.08){voice(620+Math.random()*120,.07,.05,'triangle');b.clankT=b.t;}}b.touch=true;}
   if(!b.made&&py>RIM_Y&&b.y<=RIM_Y&&Math.hypot(b.x-hx,b.z)<RIM_R-BALL_R*.3){b.made=true;b.swish=!b.touch;b.netT=0;
    noise(.18,.05,{type:'highpass',f0:3000});if(b.swish)fx.pop(L.W/2,L.cyS-L.f*.12,'SWISH!',{color:'#9dff5c',size:clamp(L.f*.05,16,34)});}
   if(b.y<BALL_R){b.y=BALL_R;b.vy=Math.abs(b.vy)*.55;b.vx*=.8;b.vz*=.8;b.bounces++;sfx.thump(.07);}}
  if(b.netT!==undefined)b.netT+=dt;
  const out=Math.abs(b.x-hx)>24||b.z<-60||b.z>14;
  if(!b.done&&(b.made&&b.y<RIM_Y-2.6||b.bounces>=2||b.t>4.2||out)){if(b.sim)b.done=true;else finishShot(b.made);}
 }
 // ---------------------------------------------------------------- drawing: stadium (cached), court, hoop, ball, shooter
 let stad=null;
 function stadiumLayer(Wc,Hc,horizon,hoop){
  const key=[Wc,Hc,Math.round(horizon),hoop,BK.has(hoop?'stadium-hoop':'stadium')?(BK.picture(hoop?'stadium-hoop':'stadium')?1:0):0].join('|');if(stad&&stad.key===key)return stad;
  const cv=document.createElement('canvas');cv.width=Math.ceil(Wc);cv.height=Math.ceil(Hc);const g=cv.getContext('2d');
  const pic=BK.picture(hoop?'stadium-hoop':'stadium'),def=BK.PICTURES.stadium;
  if(pic){const hzPx=def.horizon*pic.height/def.size[1],kk=Math.max(horizon/hzPx,Wc/pic.width),w=pic.width*kk,h=pic.height*kk,y=horizon-hzPx*kk;   // the picture's horizon row on the court's far edge
   if(y>0){g.fillStyle='#05081a';g.fillRect(0,0,Wc,y+1);}g.drawImage(pic,(Wc-w)/2,y,w,h);}
  else drawStadium(g,Wc,Hc,horizon,hoop);
  return stad={key,cv};}
 function drawStadium(g,W,Hc,hz,hoop){
  const sky=g.createLinearGradient(0,0,0,hz);sky.addColorStop(0,hoop?'#12051f':'#03061a');sky.addColorStop(1,hoop?'#3a0d4d':'#16254d');g.fillStyle=sky;g.fillRect(0,0,W,hz+2);
  for(let i=0;i<60;i++){g.fillStyle=`rgba(255,255,255,${.2+(i%5)*.12})`;g.fillRect((i*137.5)%W,(i*61.7)%(hz*.35),1.5,1.5);}
  const deckTop=hz-Hc*.42,deck2=hz-Hc*.24,wallTop=hz-Hc*.075;
  // light towers with banks of lamps and glare
  for(const fx0 of [.08,.3,.7,.92]){const tx=W*fx0,ty=deckTop-Hc*.12;g.fillStyle='#1b2236';g.fillRect(tx-3,ty,6,deckTop-ty+20);
   const gl=g.createRadialGradient(tx,ty,2,tx,ty,Hc*.16);gl.addColorStop(0,'rgba(255,250,220,.75)');gl.addColorStop(1,'rgba(255,250,220,0)');g.fillStyle=gl;g.beginPath();g.arc(tx,ty,Hc*.16,0,7);g.fill();
   g.fillStyle='#fffbe0';for(let r=0;r<3;r++)for(let q=0;q<5;q++)g.fillRect(tx-Hc*.035+q*Hc*.015,ty-Hc*.03+r*Hc*.014,Hc*.011,Hc*.009);}
  // upper and lower decks packed with fans
  const deck=(y0,y1,base)=>{g.fillStyle=base;g.fillRect(0,y0,W,y1-y0);const rows=Math.max(4,Math.round((y1-y0)/5));
   for(let r=0;r<rows;r++){const yy=y0+(r+.5)*(y1-y0)/rows,step=4+r*.25;for(let xx=(r%2)*2;xx<W;xx+=step){const k=(Math.sin(xx*12.9898+yy*78.233)*43758.5)%1,hue=Math.abs(k);
     g.fillStyle=hue<.25?HOME[0]:hue<.38?HOME[1]:hue<.5?'#d0d0d0':hue<.62?'#7a4a32':hue<.72?'#d8a07a':hue<.8?AWAY[0]:'#2a2a3a';g.fillRect(xx,yy-1.5,2.4,3);}}
   g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,y1-3,W,3);};
  deck(deckTop,deck2-6,'#22283c');g.fillStyle='#39405a';g.fillRect(0,deck2-6,W,6);deck(deck2,wallTop,'#2a3046');
  // outfield-style wall of ads
  g.fillStyle=hoop?'#2a0f3a':'#16502c';g.fillRect(0,wallTop,W,hz-wallTop);
  const ADS=hoop?['HOOP JONES','INSERT COIN','MONEY BALL','2X','HOOP JONES','HIGH SCORE']:['FIGHT MILK','BRAWNDO','MILWAUKEE BEERS','RUM HAM','PSYCH!','BEERS','DENTAL DAMS R US','FIGHT MILK'];
  const pw=W/ADS.length;ADS.forEach((a,i)=>{const px=i*pw+3;g.fillStyle=i%2?(hoop?'#ff3fa4':HOME[1]):(hoop?'#22e3ff':'#f4f1e6');g.fillRect(px,wallTop+3,pw-6,hz-wallTop-6);
   g.fillStyle=i%2?'#14140f':(hoop?'#12051f':HOME[0]);g.font=`900 ${Math.min(pw*.13,(hz-wallTop)*.5)}px Impact,"Arial Black",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(a,px+(pw-6)/2,wallTop+(hz-wallTop)/2);});
 }
 function floorDraw(horizon){const W=L.W,Hh=L.H;
  const fl=x.createLinearGradient(0,horizon,0,Hh);fl.addColorStop(0,mode==='hoop'?'#3a2a4a':'#a8743c');fl.addColorStop(1,mode==='hoop'?'#5a3a6a':'#d29a58');x.fillStyle=fl;x.fillRect(0,horizon,W,Hh-horizon);
  // planks along z, painted key + base spots
  x.strokeStyle='rgba(0,0,0,.14)';x.lineWidth=1;x.beginPath();for(let k=-30;k<=30;k+=1.5){const a=P(view.hx*0+k,0,24),b=P(k,0,-view.d-CAM_BACK+1.5);if(a&&b){x.moveTo(a.x,Math.max(horizon,a.y));x.lineTo(b.x,b.y);}}x.stroke();
  const poly=(pts,fill,stroke,lw=2)=>{const q=pts.map(p=>P(p[0],0,p[1])).filter(Boolean);if(q.length<3)return;x.beginPath();q.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.closePath();if(fill){x.fillStyle=fill;x.fill();}if(stroke){x.strokeStyle=stroke;x.lineWidth=lw;x.stroke();}};
  const hx=mode==='hoop'?0:0;poly([[hx-6,BOARD_Z],[hx+6,BOARD_Z],[hx+6,-15],[hx-6,-15]],mode==='hoop'?'rgba(255,63,164,.35)':'rgba(31,107,58,.55)','rgba(255,255,255,.75)');
  // free-throw circle
  const ring=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;ring.push([Math.cos(a)*6,-15+Math.sin(a)*6]);}poly(ring,null,'rgba(255,255,255,.65)');
  if(mode==='movie')BASES.forEach((bs,i)=>{const px=Math.sin(bs.ang)*bs.d,pz=-Math.cos(bs.ang)*bs.d,c0=P(px,0,pz);if(!c0)return;const r=1.4*c0.k;x.fillStyle=i===spot?'#ffd23f':'rgba(255,255,255,.55)';x.beginPath();x.ellipse(c0.x,c0.y,r,r*.35,0,0,7);x.fill();
   x.fillStyle=i===spot?'#1a1406':'#1f6b3a';x.font=`900 ${Math.max(8,r*.5)}px Impact,"Arial Black",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(bs.k,c0.x,c0.y);});
  const logo=BK.picture('court-logo');if(logo){const c0=P(0,0,-24);if(c0){const w=14*c0.k;x.save();x.globalAlpha=.85;x.drawImage(logo,c0.x-w/2,c0.y-w*.12,w,w*.24);x.restore();}}
 }
 function drawHoop(beforeBall){const hx=view.hx,img=BK.picture('backboard'),pole=BK.picture('pole');
  if(beforeBall){
   // stanchion behind the board, then the board
   const pb=P(hx,0,BOARD_Z+4),pt=P(hx,RIM_Y-.6,BOARD_Z+3.2);if(pb&&pt){const w=Math.max(4,.7*pb.k);if(pole)x.drawImage(pole,pt.x-w/2,pt.y,w,pb.y-pt.y);else{x.fillStyle='#3c4150';x.fillRect(pt.x-w/2,pt.y,w,pb.y-pt.y);x.fillStyle='#2a2e3a';x.fillRect(pb.x-w*1.6,pb.y-w*.5,w*3.2,w*.6);}
    const arm=P(hx,RIM_Y-.3,BOARD_Z+.1);if(arm){x.strokeStyle='#3c4150';x.lineWidth=Math.max(3,.35*arm.k);x.beginPath();x.moveTo(pt.x,pt.y);x.lineTo(arm.x,arm.y);x.stroke();}}
   const tl=P(hx-3,RIM_Y+3,BOARD_Z),tr=P(hx+3,RIM_Y+3,BOARD_Z),bl=P(hx-3,RIM_Y-.5,BOARD_Z),br=P(hx+3,RIM_Y-.5,BOARD_Z);
   if(tl&&tr&&bl&&br){if(img){const d=BK.PICTURES.backboard;x.save();x.setTransform((tr.x-tl.x)/d.size[0],(tr.y-tl.y)/d.size[0],(bl.x-tl.x)/d.size[1],(bl.y-tl.y)/d.size[1],tl.x,tl.y);x.drawImage(img,0,0,d.size[0],d.size[1]);x.restore();}
    else{x.beginPath();x.moveTo(tl.x,tl.y);x.lineTo(tr.x,tr.y);x.lineTo(br.x,br.y);x.lineTo(bl.x,bl.y);x.closePath();x.fillStyle='rgba(235,240,248,.92)';x.fill();x.strokeStyle='#c8202a';x.lineWidth=Math.max(2,.12*tl.k);x.stroke();
     const q=[P(hx-1,RIM_Y+1.5,BOARD_Z),P(hx+1,RIM_Y+1.5,BOARD_Z),P(hx+1,RIM_Y,BOARD_Z),P(hx-1,RIM_Y,BOARD_Z)];if(q.every(Boolean)){x.beginPath();q.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.closePath();x.stroke();}
     const lg=P(hx,RIM_Y+2.3,BOARD_Z);if(lg){x.fillStyle=mode==='hoop'?'#ff3fa4':HOME[0];x.font=`900 ${Math.max(7,.55*lg.k)}px Impact,"Arial Black",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(mode==='hoop'?'HOOP JONES':'BEERS',lg.x,lg.y);}}}
   rimHalf(true);drawNet();}
  else rimHalf(false);
 }
 function rimPts(){const out=[];for(let i=0;i<32;i++){const a=i/32*Math.PI*2,p=P(view.hx+Math.cos(a)*RIM_R,RIM_Y,Math.sin(a)*RIM_R);if(p)out.push({p,back:Math.sin(a)>-.05});}return out;}
 function rimHalf(back){const pts=rimPts();if(pts.length<8)return;const k=pts[0].p.k;x.strokeStyle='#ff5a1a';x.lineWidth=Math.max(2.5,.09*k);x.lineCap='round';x.beginPath();
  let on=false;for(let i=0;i<=pts.length;i++){const q=pts[i%pts.length];if(q.back===back){if(!on){x.moveTo(q.p.x,q.p.y);on=true;}else x.lineTo(q.p.x,q.p.y);}else on=false;}x.stroke();}
 function drawNet(){const img=BK.sheet('net'),swish=ball&&ball.made&&ball.netT!==undefined&&ball.netT<.5,c0=P(view.hx,RIM_Y,0);if(!c0)return;const w=RIM_R*2*c0.k;
  if(img){const d=img.def,fr=BK.frameRect(img,swish?'swish':'rest',swish?Math.floor(ball.netT*8):0),sc=w/(d.rim[1]-d.rim[0]);x.drawImage(img.img,fr.sx,fr.sy,fr.sw,fr.sh,c0.x-(d.rim[0]+d.rim[1])/2*sc,c0.y,d.frame[0]*sc,d.frame[1]*sc);return;}
  const wob=swish?Math.sin(ball.netT*30)*(1-ball.netT*2)*.18:0;x.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=Math.max(1,.04*c0.k);x.beginPath();
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,top=P(view.hx+Math.cos(a)*RIM_R,RIM_Y,Math.sin(a)*RIM_R),bot=P(view.hx+Math.cos(a+.5)*RIM_R*.55+wob,RIM_Y-1.4,Math.sin(a+.5)*RIM_R*.55);if(top&&bot){x.moveTo(top.x,top.y);x.lineTo(bot.x,bot.y);}
   const bot2=P(view.hx+Math.cos(a-.5)*RIM_R*.55+wob,RIM_Y-1.4,Math.sin(a-.5)*RIM_R*.55);if(top&&bot2){x.moveTo(top.x,top.y);x.lineTo(bot2.x,bot2.y);}}x.stroke();}
 function drawBallAt(px,py,pr,spin){const img=BK.picture('ball');x.save();x.translate(px,py);x.rotate(spin);
  if(img)x.drawImage(img,-pr,-pr,pr*2,pr*2);else{const g=x.createRadialGradient(-pr*.35,-pr*.35,pr*.1,0,0,pr);g.addColorStop(0,'#ffa060');g.addColorStop(1,'#c4500e');x.fillStyle=g;x.beginPath();x.arc(0,0,pr,0,7);x.fill();
   x.strokeStyle='#3a1a06';x.lineWidth=Math.max(1,pr*.06);x.beginPath();x.arc(0,0,pr,0,7);x.moveTo(-pr,0);x.lineTo(pr,0);x.moveTo(0,-pr);x.lineTo(0,pr);x.stroke();x.beginPath();x.arc(-pr*1.15,0,pr*.85,-.9,.9);x.stroke();x.beginPath();x.arc(pr*1.15,0,pr*.85,Math.PI-.9,Math.PI+.9);x.stroke();}
  x.restore();}
 function drawBall(){const b=ball;if(!b||!b.fly)return;const c0=P(b.x,b.y,b.z),sh=P(b.x,0,b.z);if(!c0)return;
  if(sh){const r=BALL_R*sh.k;x.fillStyle='rgba(0,0,0,.28)';x.beginPath();x.ellipse(sh.x,sh.y,r*1.1,r*.35,0,0,7);x.fill();}drawBallAt(c0.x,c0.y,BALL_R*c0.k,b.spin);}
 // the shooter, from behind, at the bottom of the screen holding the ball up
 function readyBall(){const r=relPos(),p=P(r.x,r.y,r.z);return p?{x:p.x,y:p.y,r:BALL_R*p.k}:{x:L.W/2,y:L.H*.7,r:30};}
 function drawShooter(){const who=shooterIdx(),rb=readyBall(),sh=BK.sheet(who?'shooter-p2':'shooter-p1'),cols=who?AWAY:HOME;
  const pose=phase==='fly'&&shotT>0?'shoot':phase==='result'?(ball&&ball.made?'cheer':'slump'):'ready',f=pose==='shoot'?Math.min(3,Math.floor((.45-shotT)/.11)):Math.floor(t*2);
  const off=flick?clamp((flick.y0-flick.y)*.25,0,rb.r*1.2):0,shakeX=shaken>0?Math.sin(t*38)*rb.r*.12:0;
  if(sh){const d=sh.def,k=rb.r*2/86,fr=BK.frameRect(sh,pose,f);x.drawImage(sh.img,fr.sx,fr.sy,fr.sw,fr.sh,rb.x-d.ball[0]*k+shakeX,rb.y-d.ball[1]*k+off,d.frame[0]*k,d.frame[1]*k);
   nameOnBack(rb.x-d.ball[0]*k+d.nameBar[0]*k+d.nameBar[2]*k/2+shakeX,rb.y-d.ball[1]*k+(d.nameBar[1]+d.nameBar[3]/2)*k+off,d.nameBar[2]*k,who);}
  else{const R=rb.r,cx=rb.x+shakeX,by=rb.y+off,raise=pose==='shoot'?-R*.7:pose==='cheer'?-R*.35:0,skin='#d8a07a',hair='#2e1d12';
   const neck=by+R*2.25,shW=R*4,shY=neck+R*.55;x.strokeStyle='#0b0b0b';x.lineWidth=Math.max(2,R*.07);
   // jersey: shoulders and back, cut off by the bottom of the screen
   x.fillStyle=cols[0];x.beginPath();x.moveTo(cx-shW*.56,L.H+4);x.lineTo(cx-shW*.56,shY+R*.7);x.quadraticCurveTo(cx-shW*.55,shY,cx-R*.75,shY-R*.1);x.lineTo(cx+R*.75,shY-R*.1);x.quadraticCurveTo(cx+shW*.55,shY,cx+shW*.56,shY+R*.7);x.lineTo(cx+shW*.56,L.H+4);x.closePath();x.fill();x.stroke();
   x.fillStyle=cols[1];x.fillRect(cx-shW*.56,shY+R*.55,shW*1.12,R*.12);
   // arms: sleeves at the shoulders, bare forearms up to the ball (down by the sides on a slump)
   const arm=(side)=>{const sx2=cx+side*shW*.44,sy2=shY+R*.35,hx2=pose==='slump'?cx+side*shW*.62:cx+side*R*.92,hy2=pose==='slump'?L.H+R:by+R*.3+raise,mx=(sx2+hx2)/2+side*R*.5,my=(sy2+hy2)/2;
    x.lineCap='round';x.strokeStyle='#0b0b0b';x.lineWidth=R*.66;x.beginPath();x.moveTo(sx2,sy2);x.quadraticCurveTo(mx,my,hx2,hy2);x.stroke();
    x.strokeStyle=skin;x.lineWidth=R*.52;x.beginPath();x.moveTo(sx2,sy2);x.quadraticCurveTo(mx,my,hx2,hy2);x.stroke();
    x.strokeStyle=cols[0];x.lineWidth=R*.7;x.beginPath();x.moveTo(sx2,sy2);x.lineTo(sx2+(mx-sx2)*.35,sy2+(my-sy2)*.35);x.stroke();};
   arm(-1);arm(1);
   // back of the head: neck, ears, a full head of hair
   x.strokeStyle='#0b0b0b';x.lineWidth=Math.max(2,R*.07);x.fillStyle=skin;x.fillRect(cx-R*.34,neck-R*.2,R*.68,R*.75);
   x.beginPath();x.ellipse(cx-R*.8,neck-R*.75,R*.16,R*.26,0,0,7);x.ellipse(cx+R*.8,neck-R*.75,R*.16,R*.26,0,0,7);x.fill();x.stroke();
   x.fillStyle=skin;x.beginPath();x.ellipse(cx,neck-R*.8,R*.82,R*.9,0,0,7);x.fill();x.stroke();
   x.fillStyle=hair;x.beginPath();x.ellipse(cx,neck-R*.95,R*.84,R*.8,0,Math.PI*.93,Math.PI*2.07);x.closePath();x.fill();
   x.beginPath();x.ellipse(cx,neck-R*.92,R*.83,R*.78,0,0,7);x.save();x.clip();x.fillRect(cx-R,neck-R*1.9,R*2,R*1.62);x.fillStyle='rgba(255,255,255,.08)';x.fillRect(cx-R*.5,neck-R*1.6,R*.25,R*1);x.restore();   // seen from behind: hair down to the nape
   nameOnBack(cx,neck+R*1.7,shW*.6,who);}
  if((phase==='aim'||phase==='pick'||phase==='wait')&&!(ball&&ball.fly))drawBallAt(rb.x+shakeX,rb.y+off,rb.r,0);}
 function nameOnBack(cx,cy,w,who){const nm=(s.players[who]?.name||'').toUpperCase().slice(0,10);x.save();x.fillStyle=who?'#161616':HOME[1];x.font=`900 ${clamp(w/Math.max(4,nm.length)*1.5,8,w*.3)}px Impact,"Arial Black",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(nm,cx,cy);
  x.font=`900 ${clamp(w*.36,10,60)}px Impact,"Arial Black",sans-serif`;x.fillText(String(who?69:1),cx,cy+w*.32);x.restore();}
 // ---------------------------------------------------------------- jumbo scoreboard
 function text(t2,px,py,size,col='#fff',align='left',font='900'){x.font=`${font} ${Math.round(size)}px "Courier New",monospace`;x.fillStyle=col;x.textAlign=align;x.textBaseline='middle';x.fillText(t2,px,py);}
 function jumbo(){const {jx,jy,jw,jh}=L,img=BK.picture('jumbotron'),d=BK.PICTURES.jumbotron;let sx=jx,sy=jy,sw=jw,shh=jh;
  if(img){x.drawImage(img,jx,jy,jw,jh);sx=jx+d.screen[0]/d.size[0]*jw;sy=jy+d.screen[1]/d.size[1]*jh;sw=d.screen[2]/d.size[0]*jw;shh=d.screen[3]/d.size[1]*jh;}
  else{x.fillStyle='#202634';x.fillRect(jx,jy,jw,jh);x.fillStyle=mode==='hoop'?'#ff3fa4':HOME[0];x.fillRect(jx,jy,jw,jh*.1);
   for(let i=0;i<Math.floor(jw/9);i++){x.fillStyle=(Math.floor(t*6)+i)%3?'#ffe9a0':'#7a6a30';x.beginPath();x.arc(jx+5+i*9,jy+jh-3,1.6,0,7);x.fill();}
   sx=jx+4;sy=jy+jh*.12;sw=jw-8;shh=jh*.8;x.fillStyle='#000';x.fillRect(sx,sy,sw,shh);}
  x.save();x.beginPath();x.rect(sx,sy,sw,shh);x.clip();const fs=Math.max(8,Math.min(shh/4.6,sw/26));
  if(mode==='movie'){const faceW=Math.min(shh*.9,sw*.2),gx=sx+fs*.4,gw=sw-faceW-fs*1.2,cw=gw/(INNINGS+3.2);
   text('BASEKETBALL',gx,sy+fs*.75,fs*.8,'#ffd23f');for(let i=0;i<INNINGS;i++)text(String(i+1),gx+cw*(2.2+i)+cw/2,sy+fs*.75,fs*.8,'#9ab','center');text('R',gx+cw*(2.2+INNINGS)+cw/2,sy+fs*.75,fs*.8,'#ffd23f','center');
   for(let p=0;p<2;p++){const yy=sy+fs*(1.9+p*1.15),col=p===bat?'#ffd23f':'#e8e8e8';text((s.players[p]?.name||'').toUpperCase().slice(0,9),gx,yy,fs,col);
    for(let i=0;i<INNINGS;i++){const v=line[p][i];if(v!==undefined)text(String(v),gx+cw*(2.2+i)+cw/2,yy,fs,'#fff','center');}text(String(runs[p]),gx+cw*(2.2+INNINGS)+cw/2,yy,fs,'#ffd23f','center');}
   const yb=sy+fs*4.2;text('OUT',gx,yb,fs*.8,'#9ab');for(let i=0;i<3;i++){x.fillStyle=i<outs?'#ff3a2a':'#3a2a2a';x.beginPath();x.arc(gx+fs*2.6+i*fs*1.1,yb,fs*.38,0,7);x.fill();}
   // bases diamond
   const dx0=gx+fs*7,ds=fs*.55;[[ds*1.4,0],[0,-ds*1.4],[-ds*1.4,0]].forEach(([ox,oy],k)=>{x.save();x.translate(dx0+ox+ds*1.4,yb+oy);x.rotate(Math.PI/4);x.fillStyle=bases[k]?'#ffd23f':'#333';x.fillRect(-ds*.5,-ds*.5,ds,ds);x.restore();});
   text(`PSYCH ${'●'.repeat(psychLeft)}${'○'.repeat(PSYCHS-psychLeft)}`,gx+fs*10.6,yb,fs*.8,'#ff7ac0');
   // batter's face (the shooter has their back to us)
   const fcx=sx+sw-faceW/2-fs*.3,fcy=sy+shh*.52;x.fillStyle='#111';x.fillRect(fcx-faceW/2,sy+fs*.2,faceW,shh-fs*.4);try{s.sprite(x,bat,fcx,fcy,faceW*.9,{exact:true,noBadge:true,still:true,mood:shaken>0?'sad':undefined});}catch{}
   text('AT BAT',fcx,sy+shh-fs*.6,fs*.7,'#ffd23f','center');}
  else{const faceW=Math.min(shh*.9,sw*.2),gx=sx+fs*.4;text('HOOP JONES',gx,sy+fs*.8,fs*.85,'#ff3fa4');
   text(`LEVEL ${H.level}`,gx,sy+fs*2,fs,'#ffd23f');text(`TIME ${Math.max(0,Math.ceil(H.timeLeft))}`,gx+fs*6.5,sy+fs*2,fs,H.timeLeft<10?'#ff5a4a':'#fff');
   text(`SCORE ${H.score}`,gx,sy+fs*3.2,fs,'#fff');text(`GOAL ${H.lvScore}/${hjTarget(H.level)}`,gx+fs*6.5,sy+fs*3.2,fs,H.lvScore>=hjTarget(H.level)?'#7dff8a':'#9ab');
   const other=net?remoteH:(H.who===1?{score:H.scores[0],level:H.levels[0]}:null);if(other)text(`${(s.players[net?1-me:0]?.name||'').toUpperCase().slice(0,8)} ${other.score} · L${other.level}`,gx,sy+fs*4.3,fs*.8,'#9ab');
   const fcx=sx+sw-faceW/2-fs*.3,fcy=sy+shh*.52;try{s.sprite(x,H.who,fcx,fcy,faceW*.9,{exact:true,noBadge:true,still:true});}catch{}}
  x.restore();}
 // ---------------------------------------------------------------- psych-outs (the defender)
 let sheetEl=null,btnEl=null,dealt=[];
 const defender=()=>1-bat,canPsychLocal=()=>mode==='movie'&&!cpu&&(net?bat!==me:true)&&psychLeft>0&&phase==='aim'&&!(ball&&ball.fly)&&!shaken;
 function psychButton(){if(mode!=='movie')return;btnEl=document.createElement('button');btnEl.type='button';btnEl.className='bk-psych';
  Object.assign(btnEl.style,{position:'absolute',zIndex:6,padding:'10px 14px',borderRadius:'14px',border:'2px solid #ff7ac0',background:'rgba(60,8,36,.88)',color:'#fff',font:'900 15px Impact,"Arial Black",sans-serif',letterSpacing:'.5px',boxShadow:'0 4px 14px rgba(0,0,0,.5)',display:'none'});
  s.on(btnEl,'pointerdown',e=>{e.stopPropagation();});s.on(btnEl,'click',e=>{e.preventDefault();e.stopPropagation();openSheet();});
  (c.parentElement||s.body).appendChild(btnEl);s.cleanup(()=>{btnEl?.remove();sheetEl?.remove();});}
 let btnKey='';
 function placeButton(){if(!btnEl)return;const show=canPsychLocal()&&!sheetEl;const r=show?c.getBoundingClientRect():null,pr=show?(c.parentElement||s.body).getBoundingClientRect():null;
  const key=show?[defender(),psychLeft,Math.round(r.left-pr.left),Math.round(r.top-pr.top),L.wide,Math.round(L.jy+L.jh)].join('|'):'hide';if(key===btnKey)return;btnKey=key;btnEl.style.display=show?'block':'none';if(!show)return;   // DOM touched only when something changed
  btnEl.textContent=`🤬 ${(s.players[defender()]?.name||'').toUpperCase()}: PSYCH OUT (${psychLeft})`;btnEl.style.left=(r.left-pr.left+(L.wide?L.jx+L.jw+12:12))+'px';btnEl.style.top=(r.top-pr.top+(L.wide?(L.top||44)+8:L.jy+L.jh+8))+'px';}
 function openSheet(){if(sheetEl||!canPsychLocal())return;dealt=dealPsych(Math.random,6,dealt);const host=c.parentElement||s.body,r=c.getBoundingClientRect(),pr=host.getBoundingClientRect();
  sheetEl=document.createElement('div');Object.assign(sheetEl.style,{position:'absolute',zIndex:7,left:(r.left-pr.left+8)+'px',top:(r.top-pr.top+(L.wide?(L.top||44)+4:L.jy+L.jh+4))+'px',width:Math.min(r.width-16,520)+'px',maxHeight:(L.wide?r.height*.8:r.height*.5)+'px',overflow:'auto',
   background:'rgba(18,10,24,.96)',border:'2px solid #ff7ac0',borderRadius:'16px',padding:'10px',boxShadow:'0 8px 30px rgba(0,0,0,.6)',color:'#fff',font:'700 14px system-ui,sans-serif'});
  const nm=s.players[bat]?.name||'Rookie';
  sheetEl.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font:900 16px Impact,'Arial Black',sans-serif;color:#ff7ac0">PSYCH OUT ${nm.toUpperCase()}</b><span><button data-r type=button style="margin-right:6px">🎲</button><button data-x type=button>✕</button></span></div>`+
   dealt.map((l,i)=>`<button data-i="${i}" type=button style="display:block;width:100%;text-align:left;margin:4px 0;padding:9px 10px;border-radius:10px;border:1px solid #5a2a46;background:#2a1430;color:#fff;font:700 14px system-ui,sans-serif">${fillPsych(l,nm).replace(/</g,'&lt;')}</button>`).join('')+
   `<form style="display:flex;gap:6px;margin-top:6px"><input maxlength=70 placeholder="Type your own…" style="flex:1;padding:9px;border-radius:10px;border:1px solid #5a2a46;background:#120a18;color:#fff;font:700 14px system-ui"><button type=submit style="padding:9px 12px;border-radius:10px;border:0;background:#ff7ac0;color:#1a0610;font:900 14px system-ui">SEND</button></form>`;
  sheetEl.querySelectorAll('button[data-i]').forEach(b=>s.on(b,'click',e=>{e.preventDefault();sendPsych(fillPsych(dealt[+b.dataset.i],nm));}));
  s.on(sheetEl.querySelector('[data-x]'),'click',e=>{e.preventDefault();closeSheet();});s.on(sheetEl.querySelector('[data-r]'),'click',e=>{e.preventDefault();closeSheet();openSheet();});
  s.on(sheetEl.querySelector('form'),'submit',e=>{e.preventDefault();const v=sheetEl.querySelector('input').value.trim();if(v)sendPsych(v.slice(0,70));});
  s.on(sheetEl,'pointerdown',e=>e.stopPropagation());s.on(sheetEl,'keydown',e=>e.stopPropagation());host.appendChild(sheetEl);}
 function closeSheet(){sheetEl?.remove();sheetEl=null;}
 function sendPsych(text){closeSheet();if(net){net.send({ps:String(text).slice(0,70)});return;}applyPsych(text);}
 function applyPsych(text){if(psychLeft<=0||phase!=='aim'||shaken)return false;psychLeft--;shaken=3.2;psychText=String(text).slice(0,80);psychBy=defender();psychT=3.2;
  if(net&&bat===me)net.send({psd:psychText});shake.kick(10);noise(.5,.14,{type:'bandpass',f0:420,f1:900,q:2.5});voice(160,.5,.06,'sawtooth',{slide:.6});vibrate([30,40,30]);s.react?.(psychBy,'win',2);s.react?.(bat,'sad',2);return true;}
 function drawPsych(){if(psychT<=0)return;const a=clamp(psychT*2,0,1)*clamp((3.2-psychT)*5,0,1),W=L.W,img=BK.picture('psych-burst');x.save();x.globalAlpha=a;
  const bw=Math.min(W*.92,560,L.H*.4/.42),bh=bw*.42,bx=W/2-bw/2,by=L.wide?L.H*.18:L.jy+L.jh+L.H*.05,wob=Math.sin(t*22)*.025;x.translate(W/2,by+bh/2);x.rotate(wob);x.translate(-W/2,-(by+bh/2));
  if(img)x.drawImage(img,bx-bw*.05,by-bh*.1,bw*1.1,bh*1.2);else{x.fillStyle='#ff3fa4';x.beginPath();for(let i=0;i<22;i++){const ang=i/22*Math.PI*2,r=(i%2?.42:.56);x.lineTo(W/2+Math.cos(ang)*bw*r,by+bh/2+Math.sin(ang)*bh*r*1.05);}x.closePath();x.fill();x.strokeStyle='#1a0610';x.lineWidth=3;x.stroke();}
  const fw=bh*.62;try{s.sprite(x,psychBy,bx+fw*.62,by+bh*.5,fw,{exact:true,noBadge:true,still:true,mood:'win'});}catch{}
  // the line itself, wrapped
  const tx=bx+fw*1.25,tw=bw-fw*1.4;let fs=clamp(bh*.2,12,28);x.font=`900 ${fs}px Impact,"Arial Black",sans-serif`;const words=psychText.split(' '),lines=[];let ln='';
  for(const wd of words){const tr=ln?ln+' '+wd:wd;if(x.measureText(tr).width>tw&&ln){lines.push(ln);ln=wd;}else ln=tr;}if(ln)lines.push(ln);while(lines.length*fs*1.1>bh*.8&&fs>9){fs*=.9;}
  x.font=`900 ${fs}px Impact,"Arial Black",sans-serif`;x.fillStyle='#fff';x.strokeStyle='#1a0610';x.lineWidth=fs*.18;x.textAlign='left';x.textBaseline='middle';
  lines.slice(0,5).forEach((l,i)=>{const yy=by+bh/2+(i-(Math.min(5,lines.length)-1)/2)*fs*1.1;x.strokeText(l,tx,yy);x.fillText(l,tx,yy);});x.restore();}
 // ---------------------------------------------------------------- base picker (movie) and hints
 const baseBtns=()=>{const W=L.W,Hh=L.H,n=4,gap=8,bw=Math.min(150,(W-gap*5)/n),bh=Math.min(74,Hh*.11),y=Hh-bh-14,x0=(W-(bw*n+gap*(n-1)))/2;return BASES.map((b,i)=>({i,x:x0+i*(bw+gap),y,w:bw,h:bh}));};
 function drawPicker(){if(phase!=='pick'||theirs()||(cpu&&bat===1))return;x.fillStyle='rgba(0,0,0,.45)';x.fillRect(0,L.H-baseBtns()[0].h-28,L.W,baseBtns()[0].h+28);
  for(const b of baseBtns()){const bs=BASES[b.i];x.fillStyle=b.i===spot?'#ffd23f':'#1f6b3a';x.strokeStyle='#0b0b0b';x.lineWidth=2;x.beginPath();x.roundRect(b.x,b.y,b.w,b.h,12);x.fill();x.stroke();
   x.fillStyle=b.i===spot?'#1a1406':'#fff';x.font=`900 ${Math.min(b.h*.46,b.w*.36)}px Impact,"Arial Black",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(bs.k,b.x+b.w/2,b.y+b.h*.38);
   x.font=`800 ${Math.min(b.h*.19,b.w*.12,13)}px system-ui`;x.fillText(`${bs.name} · ${bs.d} ft`,b.x+b.w/2,b.y+b.h*.76);}
  label2(`${(s.players[bat]?.name||'').toUpperCase()}: PICK YOUR BASE`,L.W/2,baseBtns()[0].y-14,clamp(L.W*.04,13,20),'#ffd23f');}
 function label2(t2,px,py,size,col){x.font=`900 ${size}px Impact,"Arial Black",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=size*.2;x.strokeStyle='#000';x.strokeText(t2,px,py);x.fillStyle=col;x.fillText(t2,px,py);}
 function drawFlick(){if(!flick||phase!=='aim')return;const p=clamp((flick.y0-flick.y)/(L.H*.42),0,1.3),bx=L.W-26,by0=L.H*.86,bh=L.H*.42;
  x.fillStyle='rgba(0,0,0,.45)';x.fillRect(bx-9,by0-bh,18,bh);x.fillStyle=p>1?'#ff5a4a':'#ffd23f';x.fillRect(bx-7,by0-bh*Math.min(1,p/1.3),14,bh*Math.min(1,p/1.3));}
 // ---------------------------------------------------------------- input
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev);
  if(phase==='pick'&&!theirs()&&!(cpu&&bat===1)){for(const b of baseBtns())if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){pickBase(b.i);return;}return;}
  if(phase!=='aim'||theirs()||(cpu&&mode==='movie'&&bat===1)||(ball&&ball.fly))return;if(p.y<L.H*.4)return;
  s.capture?.(ev);flick={id:ev.pointerId,x0:p.x,y0:p.y,x:p.x,y:p.y,t0:performance.now()};});
 s.on(c,'pointermove',ev=>{if(!flick||flick.id!==ev.pointerId)return;const p=s.pointer(ev);flick.x=p.x;flick.y=p.y;});
 const up=ev=>{if(!flick||flick.id!==ev.pointerId)return;s.release?.(ev);const dy=flick.y0-flick.y,dx=flick.x-flick.x0;if(dy>L.H*.05){const p=clamp(dy/(L.H*.42),0,1.3),aim=dx/Math.max(1,dy);flick=null;shoot(p,aim);}else flick=null;};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',()=>{flick=null;});
 function pickBase(i,remote=false){if(phase!=='pick')return;spot=i;view.d=BASES[i].d;view.ang=BASES[i].ang;setCam();phase='aim';sfx.click();if(net&&!remote&&bat===me)net.send({sp:i});}
 // ---------------------------------------------------------------- results
 function finishShot(made){const b=ball;b.done=true;if(mode==='movie'){if(net&&bat!==me)return;if(net)net.send({res:made?1:0});movieResult(made);}else hoopResult(made);}
 function say(m,col,secs=1.5){msg=m;msgCol=col;msgT=secs;}
 function movieResult(made){const inning=Math.floor(half/2);line[bat][inning]=line[bat][inning]||0;
  if(made){const n=spot+1;let scored=0;const nb=[0,0,0];for(let k=2;k>=0;k--)if(bases[k]){const to=k+n;if(to>=3)scored++;else nb[to]=1;}if(n>=4)scored++;else nb[n-1]=1;bases=nb;runs[bat]+=scored;line[bat][inning]+=scored;s.setScores(runs.slice());
   say(`${BASES[spot].name}!${scored?` ${scored} RUN${scored>1?'S':''}`:''}`,'#ffd23f',1.6);sfx.coin();if(scored){sfx.fanfare();fx.confetti?.(L.W/2,L.cyS-L.f*.1,30+scored*10);}crowd(1);s.react?.(bat,'win',1.5);}
  else{outs++;say(outs>=3?'THREE OUTS!':`OUT ${outs}`,'#ff5a4a',1.5);voice(150,.35,.06,'square',{slide:.6});crowd(0);s.react?.(bat,'sad',1.5);}
  phase='result';}
 function crowd(good){noise(good?1.1:.7,good?.08:.05,{type:'bandpass',f0:good?900:500,f1:good?1400:300,q:.8,attack:.08});}
 // ---------------------------------------------------------------- MOVIE flow
 async function startHalf(){layout();bat=half%2;outs=0;bases=[0,0,0];psychLeft=PSYCHS;shots=0;shaken=0;psychT=0;closeSheet();line[bat][Math.floor(half/2)]=line[bat][Math.floor(half/2)]||0;
  spot=0;view.d=BASES[0].d;view.ang=BASES[0].ang;view.hx=0;setCam();ball=null;phase='wait';draw();
  if(!net||half===0){const solo=cpu&&bat===1;const txt=solo?`Inning ${Math.floor(half/2)+1}: ${s.players[1].name} bats. Psych them out! Tap the PSYCH OUT button while they line up... the CPU defends too when you bat.`:
   `Inning ${Math.floor(half/2)+1}, ${s.players[bat].name} at bat. Pick a base (further = more bases), then FLICK the ball up: how far you flick = power, sideways = aim. Make it = a hit, miss = an out, three outs and you switch. ${s.players[1-bat].name}: tap PSYCH OUT while they line up and pick something filthy (or type your own), ${PSYCHS} a half-inning.`;
   if(!await s.pass(net?me:bat,txt,'Play ball',{summary:half?`${s.players[0].name} ${runs[0]} – ${runs[1]} ${s.players[1].name}`:null}))return false;}
  phase='pick';if(cpu&&bat===1)setTimeout(()=>{if(phase==='pick'&&s.alive){const sk=cpuSkill(s),r=Math.random();pickBase(r<.4-sk*.15?0:r<.72?1:r<.92?2:3);}},700);
  return true;}
 function nextAtBat(){shaken=0;psychT=Math.min(psychT,.3);closeSheet();phase='pick';ball=null;if(cpu&&bat===1)setTimeout(()=>{if(phase==='pick'&&s.alive){const sk=cpuSkill(s),r=Math.random();pickBase(r<.4-sk*.15?0:r<.72?1:r<.92?2:3);}},700);}
 // vs CPU: batting, the CPU shoots after a beat; defending, it psychs you out while you line up
 if(cpu&&mode==='movie')cpuHotseat(s,{isTurn:()=>bat===1&&phase==='aim'&&!(ball&&ball.fly),delay:1300,think:()=>cpuShot()});
 let cpuPsychT=0;
 // ---------------------------------------------------------------- HOOP JONES flow
 function hoopSpot(){view.ang=HJ_SPOTS[H.spotI%4];view.d=hjDist(H.level);setCam();}
 function startHoopLevel(){H.lvScore=0;H.timeLeft=HJ_TIME;H.spotI=0;H.ballI=0;H.amp=hjAmp(H.level);H.spd=hjSpeed(H.level);H.ph=0;hoopSpot();ball=null;phase='aim';
  say(`LEVEL ${H.level} · GOAL ${hjTarget(H.level)}`,'#ff3fa4',1.8);}
 function hoopResult(made){const money=H.ballI===HJ_BALLS-1,pts=made?(view.d>=22?3:2)*(money?2:1)+(ball.swish?1:0):0;
  if(made){H.score+=pts;H.lvScore+=pts;say(`+${pts}${money?' MONEY BALL!':''}`,money?'#7dff8a':'#ffd23f',.9);crowd(1);s.setScores?.(net?(()=>{const sc=[0,0];sc[me]=H.score;sc[1-me]=remoteH?.score||0;return sc;})():H.who?[H.scores[0],H.score]:[H.score,H.scores[1]]);}
  else{voice(170,.2,.05,'square',{slide:.6});}
  H.ballI++;if(H.ballI>=HJ_BALLS){H.ballI=0;H.spotI++;}phase='result';msgT=Math.max(msgT,.45);nf?.push?.();}
 // ---------------------------------------------------------------- draw
 function draw(){layout();if(!cam)setCam();x.setTransform(1,0,0,1,0,0);x.save();shake.apply?.(x);
  // horizon = the court's far edge, behind the hoop
  const far=P(cam.dx*26,0,cam.dz*26),horizon=far?far.y:L.cyS;const pan=view.ang*L.W*.35;
  const st=stadiumLayer(L.W*1.6,L.H,horizon,mode==='hoop');x.drawImage(st.cv,-(st.cv.width-L.W)/2-pan,0);
  floorDraw(horizon);
  const deep=ball&&ball.fly&&ball.z>.05;drawHoop(true);if(deep)drawBall();drawHoop(false);if(!deep)drawBall();
  drawShooter();drawPicker();drawFlick();
  fx.draw(x);x.restore();jumbo();drawPsych();
  if(msgT>0)label2(msg,L.W/2,L.cyS+L.f*.06,clamp(L.W*.07,18,42),msgCol);
  if(phase==='aim'&&!flick&&!(ball&&ball.fly)&&!theirs()&&!(cpu&&mode==='movie'&&bat===1))label2('FLICK UP TO SHOOT',L.W/2,L.H*.93,clamp(L.W*.035,11,16),'#ffffffcc');
  if(theirs())label2(`${(s.players[bat]?.name||'').toUpperCase()} IS SHOOTING`,L.W/2,L.H*.93,clamp(L.W*.035,11,16),'#ffffffcc');
 }
 // ---------------------------------------------------------------- tests / bots
 s.debug={engine:'basketball2p',mode,runs,line,get phase(){return phase;},get ball(){return ball;},get spot(){return spot;},get hoop(){return H;},get view(){return view;},
  pick:i=>pickBase(i),shoot:(p,aim)=>shoot(p,aim),
  // balance check: fly one shot from distance d / angle ang with power p (1 = exact) and aim, without touching the game
  simShot:(d,ang,pErr=0,aim=0)=>{const keep={...view},kb=ball;view.d=d;view.ang=ang;view.hx=0;setCam();const D=Math.hypot(cam.sx,cam.sz),[pa,aa]=assisted(powerFor(D)*(1+pErr),aim),arr=launchFrom(pa,aa);
   ball={x:arr[0],y:arr[1],z:arr[2],vx:arr[3],vy:arr[4],vz:arr[5],fly:true,made:false,touch:false,bounces:0,t:0,spin:0,done:false,sim:true};for(let i=0;i<600&&!ball.done;i++)physics(1/120);const r=ball.made?(ball.swish?2:1):0;ball=kb;Object.assign(view,keep);setCam();return r;},perfect:()=>{const D=Math.hypot(cam.sx-view.hx,cam.sz);shoot(powerFor(D),0);},psych:t2=>applyPsych(t2||'TEST'),openSheet,
  state:()=>({mode,phase,bat,outs,bases:bases.slice(),runs:runs.slice(),psychLeft,shaken:shaken>0,hoop:{level:H.level,score:H.score,lv:H.lvScore,time:Math.ceil(H.timeLeft),over:H.over}})};
 let botOn=false;
 function botStep(){if(!botOn)return;if(mode==='movie'){if(phase==='pick'&&!theirs()&&!(cpu&&bat===1)&&Math.random()<.04)pickBase(Math.floor(Math.random()*4));
   else if(phase==='aim'&&!theirs()&&!(cpu&&bat===1)&&!(ball&&ball.fly)&&Math.random()<.03)cpuShot();
   else if(net&&theirs()&&phase==='aim'&&psychLeft>0&&!shaken&&Math.random()<.004)sendPsych(fillPsych(PSYCH_SHOUTS[Math.floor(Math.random()*PSYCH_SHOUTS.length)],s.players[bat]?.name));}
  else if(phase==='aim'&&!(ball&&ball.fly)&&Math.random()<.06)cpuShot();}
 s.debug.bot=()=>{if(!botOn){botOn=true;return 'drive';}return '';};
 // ---------------------------------------------------------------- online
 let nf=null;
 if(net&&mode==='movie'){
  void (async()=>{const wait=f=>(async()=>{while(s.alive&&!f())await new Promise(r=>setTimeout(r,50));})();for(;;){const m=await net.next();if(!m||!s.alive)return;
   if(typeof m.ps==='string'){if(bat===me)applyPsych(m.ps.slice(0,70));}
   else if(typeof m.psd==='string'){if(bat!==me&&!shaken){psychLeft=Math.max(0,psychLeft-1);shaken=3.2;psychText=m.psd.slice(0,80);psychBy=defender();psychT=3.2;shake.kick(10);noise(.5,.14,{type:'bandpass',f0:420,f1:900,q:2.5});}}
   else if(Number.isInteger(m.sp)&&m.sp>=0&&m.sp<4){await wait(()=>phase==='pick'&&bat!==me);if(!s.alive)return;pickBase(m.sp,true);}
   else if(Array.isArray(m.l)){await wait(()=>phase==='aim'&&bat!==me&&!(ball&&ball.fly));if(!s.alive)return;launch(m.l,true);}
   else if(m.res!==undefined){await wait(()=>bat!==me&&ball&&ball.fly);if(!s.alive)return;ball.made=!!m.res;ball.done=true;movieResult(!!m.res);}}})();}
 if(net&&mode==='hoop'){remoteH={score:0,level:1,over:false};
  nf=netField(s,{hz:6,pack:()=>({sc:H.score,lv:H.level,ov:H.over?1:0}),unpack:(i,d)=>{if(!d)return;remoteH.score=d.sc|0;remoteH.level=d.lv|0;remoteH.over=!!d.ov;}});}
 s.hint(mode==='movie'?'Pick a base spot (single to home run: further away = more bases), then put a finger near the bottom and flick up: the length of the flick is the power, a sideways flick aims. A make is a hit, a miss is an out. The defender taps PSYCH OUT while you line up and throws a filthy line at you: your hands shake for that shot.':
  'Flick up from the bottom of the screen to shoot: longer flick = more power, sideways = aim. Four spots, four balls each, the last ball of each spot is a money ball (double). Reach the goal before the clock runs out to go to the next level: longer shots and a basket that slides side to side.');
 layout();setCam();psychButton();
 // ---------------------------------------------------------------- frame
 let done=false;
 async function hoopRun(i){H.who=i;H.level=1;H.score=0;H.over=false;s.setScores?.(net?[0,0]:H.scores.slice());
  const txt=`HOOP JONES: ${s.players[i].name}, flick the ball up from the bottom to shoot (longer = harder, sideways = aim). Four spots, four balls each; the last ball at each spot is a MONEY BALL (x2). Hit the goal before the clock runs out: every level is further away and the basket moves faster.`;
  if(!await s.pass(net?me:i,txt,'Shoot'))return false;if(net)await nf.start('go');startHoopLevel();return true;}
 function hoopEnd(){H.over=true;phase='done';if(net){nf.push();nf.finish({score:H.score});}}
 let started=false,runIdx=0;
 const go=async()=>{if(mode==='movie'){started=await startHalf();}else{started=await hoopRun(0);}};
 s.frame(dt=>{if(!s.alive||done)return;t+=dt;layout();shake.step?.(dt);fx.step?.(dt);psychT=Math.max(0,psychT-dt);shaken=Math.max(0,shaken-dt);msgT=Math.max(0,msgT-dt);shotT=Math.max(0,shotT-dt);
  if(nf)nf.tick(dt);botStep();placeButton();
  if(mode==='hoop'&&started&&!H.over){if(phase==='aim'||phase==='fly'||phase==='result'){H.timeLeft-=dt;H.ph+=dt*H.spd;view.hx=H.amp*Math.sin(H.ph);}
   if(H.timeLeft<=0&&!(ball&&ball.fly&&!ball.done)){const ok=H.lvScore>=hjTarget(H.level);if(ok){const clear=H.level;H.level++;if(s.solo)soloProgress(s,H.score,clear,`Level ${clear+1}`);sfx.fanfare();say(`LEVEL ${clear} CLEARED!`,'#7dff8a',1.8);startHoopLevel();}
    else{say('TIME!','#ff5a4a',2.2);hoopEnd();const cleared=H.level-1;
     if(s.solo&&!net){done=true;setTimeout(()=>{if(s.alive)soloFinish(s,H.score,cleared,`Hoop Jones · level ${H.level} · ${H.score} points`,cleared>0);},1800);}
     else if(net){nf.remoteDone().then(v=>{if(!s.alive)return;const sc=[0,0];sc[me]=H.score;sc[1-me]=v&&typeof v.score==='number'?v.score|0:(remoteH?.score||0);done=true;s.setScores(sc);
       setTimeout(()=>{if(s.alive)s.finish(sc,sc[0]===sc[1]?`Hoop Jones tie at ${sc[0]}.`:`${s.players[sc[0]>sc[1]?0:1].name} wins Hoop Jones, ${Math.max(...sc)} to ${Math.min(...sc)}.`);},1500);});}
     else{H.scores[H.who]=H.score;H.levels[H.who]=H.level;const nxt=H.who+1;
      setTimeout(async()=>{if(!s.alive)return;if(nxt<2&&s.players.length>1){started=false;if(await hoopRun(nxt))started=true;}else{done=true;const sc=H.scores.slice();s.setScores(sc);s.finish(sc,sc[0]===sc[1]?`Hoop Jones tie at ${sc[0]}.`:`${s.players[sc[0]>sc[1]?0:1].name} wins Hoop Jones, ${Math.max(...sc)} to ${Math.min(...sc)}.`);}},2000);}}}}
  if(phase==='fly'&&ball)physics(dt);
  if(phase==='result'&&msgT<=0){
   if(mode==='hoop'){if(!H.over){hoopSpot();ball=null;phase='aim';}}
   else{if(outs>=3||shots>=MAXSHOTS){phase='switch';half++;if(half>=INNINGS*2){done=true;const w=runs[0]===runs[1]?null:runs[0]>runs[1]?0:1;if(s.alive)s.finish(runs.slice(),w===null?`BASEketball ties ${runs[0]}–${runs[1]}.`:`${s.players[w].name} wins BASEketball ${Math.max(...runs)}–${Math.min(...runs)}.`);return;}void startHalf();}
    else nextAtBat();}}
  if(cpu&&mode==='movie'&&bat===0&&phase==='aim'&&!(ball&&ball.fly)&&psychLeft>0&&!shaken){cpuPsychT+=dt;if(cpuPsychT>.8&&Math.random()<dt*(.25+cpuSkill(s)*.5)){cpuPsychT=0;applyPsych(fillPsych(PSYCH_SHOUTS.concat(dealPsych(Math.random,3))[Math.floor(Math.random()*11)]||'YOUR MOM!',s.players[0]?.name));}}
  if(phase!=='switch')draw();
  s.status(mode==='movie'?`${s.players[bat]?.name} at bat · ${outs} out`:`Level ${H.level} · ${H.score}`);
 });
 await go();
}
Object.assign(exports,{basketball2p});
