// THE LEAGUE · PENALTY SHOOTOUT (id league-penalties, engine `penalty`). A mobile flick-kick football game in the style of
// the phone hits (Flick Kick Football, Score! Hero, Football Strike): the camera sits behind the ball, you SWIPE the ball
// at the goal (the swipe's angle aims left/right, its length lifts the shot, its speed is power, a bent swipe curls it),
// and when you keep goal you SWIPE (or tap) the way you dive. World in metres: goal line at z = D, posts at x = +-3.66,
// bar 2.44 high, ball spot at (bx0, 0, 0).
// Modes: SHOOTOUT (5 each then sudden death; vs CPU in 1P, both on one phone in 2P: striker swipes the ball from the bottom,
// keeper swipes in the goal), CHALLENGE (1P ladder: targets, free-kick walls, wind, moving keepers, stars; saved in
// localStorage sc-pk-v1) and TOURNAMENT (1P knockout: quarter-final, semi, final vs teams from the game's locations whose
// faces keep goal; the champion recruits a locked character). Board = 3 kicks each.
// Online (netField): each phone plays its own role. The striker's phone sends the shot {k:[n,tx,ty,p,c]} (both phones fly
// the same ball from it), the keeper's phone sends its dive {d:[n,tx,ty,at]} (at = ball time, -1 = guessed before the kick)
// and calls the kick {r:[n,res]}; the striker's phone holds the result until that call.
// Art: src/data/pkSprites.js (assets/penalty -> pk:<slot>), drawn stand-ins src/engines/pk/art.js.
const {clamp,seededRandom}=require("src/utils.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {netField}=require("src/engines/netField.js");
const {voice,noise,label,rr,keyboard}=require("src/engines/tarantinoKit.js");
const {vibrate}=require("src/audio.js");
const {store}=require("src/state.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const A=require("src/engines/pk/art.js");
const PS=require("src/data/pkSprites.js");
const BG=require("src/bgShape.js");
const {faceSprite}=require("src/headFacts.js");

const HW=3.66,BAR=2.44,BR=.11,G=9.81,KZ=.35,NET_D=2.0,BOARD_Z=4.6,SAVE='sc-pk-v1';
const ease=u=>u<0?0:u>1?1:1-Math.pow(1-u,2.4);
const LINES={
 goal:['Taco would have scored that. Probably.','Ruxin is screaming at the TV.','Shiva Bowl energy!','Kevin just spilled his beer.','Pete called that one.','Andre is already ordering a celebratory scarf.','Rafi wants to sing about it.','Ice cold. Absolutely ice cold.','Picked their spot and buried it.','The keeper never had a chance.'],
 save:['What a stop!','Jenny is NOT impressed with the striker.','Ruxin wants a VAR review of his own life.','Big gloves, big moment!','Read it all the way.','Rafi calls it a sexy save.','The keeper had his homework done.'],
 miss:['Ooof. That is in the car park.','Kevin has seen better shots at the Shiva Bowl.','Taco blames the wind. There is no wind.','That one is still climbing.','Someone get that ball back from the parking lot.','Pete is hiding his face.'],
 post:['CLANG! Hear that?','The woodwork says no.','Inches away!'],
 sudden:['Sudden death. Nobody breathe.','Next miss could be the end.','Nerves of steel needed now.']};
const AD=['PADDY\'S PUB','BRAWNDO','DUNDER MIFFLIN','LOS POLLOS HERMANOS','WAYNE ENTERPRISES','STAY PUFT','DUFF BEER','ACME CORP','INITECH','PIZZA PLANET','MONARCH','CHOTCHKIE\'S'];

// location teams for the Tournament: locations with 3+ characters that have their own pictures
let TEAMS=null;
function teams(){if(TEAMS)return TEAMS;let L=[],C=[],art=()=>false;
 try{L=require("src/locations.js").LOCATIONS;C=require("src/characters.js").CHARACTERS;const {portraitURL}=require("src/assets.js"),{isRasterArt}=require("src/data/userPortraits.js");art=id=>{try{return isRasterArt(portraitURL(id,'normal'));}catch{return false;}};}catch{}
 const ids=new Set(C.map(c=>c.id));
 TEAMS=L.map(l=>({id:l.id,name:l.name,source:l.source,cast:[...new Set([...(l.characters||[]),...C.filter(c=>c.source===l.source).map(c=>c.id)])].filter(id=>ids.has(id)&&art(id))})).filter(t=>t.cast.length>=3);
 return TEAMS;}

// CHALLENGE level n (1-based): spot, wall, keeper, targets, wind, what counts as a pass
function levelDef(n){const r=seededRandom('pk-ch:'+n),pick=a=>a[Math.floor(r()*a.length)],lv=n-1;
 const kind=n===1?'pen':n===2?'targets':n===3?'range':['free','targets','wind','pressure','free','curl'][(n-4)%6];
 const L={n,kind,shots:5,D:11,bx:0,wall:0,keeper:true,skill:clamp(.22+lv*.045,.22,.93),move:n>=8?Math.min(1.1,.3+lv*.04):0,wind:0,targets:[],need:{goals:3}};
 const spots=[[-2.75,1.95],[2.75,1.95],[-2.9,.45],[2.9,.45],[0,2.0],[-1.6,1.4],[1.6,1.4]];
 const ring=()=>.72-Math.min(.32,lv*.018);
 if(kind==='pen'){L.title='SPOT KICK';L.sub='Beat the keeper 3 times';}
 if(kind==='pressure'){L.title='PRESSURE';L.sub='A top keeper. Score 4 of 5';L.need={goals:4};L.skill=clamp(L.skill+.12,0,.96);}
 if(kind==='targets'){L.title='HIT THE TARGETS';L.sub='Rings pay extra. Score 3';for(const i of [0,1,2].map(()=>Math.floor(r()*spots.length)))L.targets.push({x:spots[i][0],y:spots[i][1],r:ring(),pts:150});}
 if(kind==='range'){L.title='TARGET PRACTICE';L.sub='No keeper. Hit 3 targets';L.keeper=false;L.need={targets:3};for(const i of [0,1,2,3])L.targets.push({x:spots[i][0],y:spots[i][1],r:ring()+.1,pts:150});}
 if(kind==='free'||kind==='curl'||kind==='wind'){L.D=16+Math.floor(r()*8)+Math.min(4,lv*.2);L.bx=(r()<.5?-1:1)*(kind==='curl'?3+r()*4:r()*5);L.wall=clamp(2+Math.floor(lv/4),2,6);
  L.title=kind==='curl'?'BEND IT':kind==='wind'?'WINDY NIGHT':'FREE KICK';L.sub=kind==='curl'?'Curl it round the wall. Score 2':'Over or round the wall. Score 2';L.need={goals:2};}
 if(kind==='wind'||n>=10&&r()<.35)L.wind=(r()<.5?-1:1)*(1+Math.min(2.5,lv*.12)+r());
 if(n>=5&&kind!=='range'&&r()<.4)L.targets.push({x:pick(spots)[0],y:pick(spots)[1],r:ring(),pts:200});
 const maxPer=100+50+Math.max(0,...L.targets.map(t=>t.pts));L.star=[.42*maxPer*L.shots,.7*maxPer*L.shots];
 return L;}

async function penalty(s){
 const [c,x]=s.canvas(560,760,{fill:true});const fb=fullBleed(s,{bg:'#06101c'});
 const on=s.online||null,me=on?on.me:0,board=s.origin==='board',solo1=!!s.solo&&!s.solo.board&&!s.solo.duel&&!on;
 const cpuGame=isCpu(s);let mode='shootout',skillBase=(()=>{try{return cpuSkill(s);}catch{return .5;}})();
 const save=(()=>{try{return JSON.parse(localStorage.getItem(SAVE)||'{}');}catch{return {};}})();
 const keep=v=>{try{localStorage.setItem(SAVE,JSON.stringify(Object.assign(save,v)));}catch{}};
 const dummy=document.createElement('canvas').getContext('2d');
 s.gameRecruits=[[],[]];
 // ---------------------------------------------------------------- match state
 const M={kicks:board?3:5,goals:[0,0],taken:[0,0],hist:[[],[]],kicker:0,names:s.players.map(p=>p.name||'Player'),faces:[null,null],teamName:null,round:0};
 let phase='menu',D=11,bx0=0,wall=[],targets=[],wind=0,keeperOn=true,moveAmp=0,skill=skillBase,level=null,lvScore=0,lvGoals=0,lvTargets=0,lvShot=0,total=0,cleared=0,retries=2;
 let ball=null,kp=null,striker={pose:'idle',t:0},msg='',sub='',msgT=0,swipe=null,rec=[],replay=null,netHit=null,banner=null,slow=0,crowdT=0,flash=0,camShake=0,buttons=[],result=null,cpuT=null,kDive=null,lastFrameT=0;
 const pend={k:null,d:null,r:null};
 const kickNo=()=>M.taken[0]+M.taken[1];
 const keeperSeat=()=>1-M.kicker;
 // who is a human on THIS phone
 const human=i=>on?i===me:mode!=='shootout'?i===0:!cpuGame||i===0;
 const keeperPerson=()=>mode!=='challenge'&&(on||!cpuGame||keeperSeat()===0);
 const strikerHuman=()=>mode==='challenge'?true:human(M.kicker),keeperHuman=()=>mode==='challenge'?false:human(keeperSeat());
 // ---------------------------------------------------------------- camera / projection
 const cam={x:0,y:1.55,z:-5.2},L={};
 function layout(){const W=s.W,H=s.H,top=(fb.top||0)+8;const zG=Math.hypot(D-cam.z,cam.x),per=(BAR-cam.y)/zG+cam.y/Math.hypot(cam.z,cam.x-bx0);
  const fW=W*.84*16.2/(2*HW),fH=(H-top-H*.14)/per,f=Math.min(fW,fH);let hy=top+H*.04+(BAR-cam.y)*f/zG;
  hy+=Math.max(0,(H*.9-(top+H*.04+per*f))*.42);Object.assign(L,{W,H,top,f,hy});}
 function P(X,Y,Z,cm=cam){const yw=cm.yaw||0,cs=Math.cos(yw),sn=Math.sin(yw),ex=X-cm.x,ez=Z-cm.z,fw=ex*sn+ez*cs,rt=ex*cs-ez*sn,dz=Math.max(.25,fw),k=L.f/dz;return [L.W/2+rt*k,L.hy-(Y-cm.y)*k,k];}
 function unproject(sx,sy,Z){const yw=cam.yaw||0,cs=Math.cos(yw),sn=Math.sin(yw),rt=(sx-L.W/2)/L.f,up=-(sy-L.hy)/L.f,dx=rt*cs+sn,dz=-rt*sn+cs,t=(Z-cam.z)/dz;return [cam.x+dx*t,cam.y+up*t];}
 // ---------------------------------------------------------------- sounds
 const snd={whistle(){voice(2950,.2,.045,'square');voice(3080,.3,.04,'square',{delay:.26});},
  kick(p){noise(.07,.16+p*.06,{f0:1600,f1:200});voice(85,.14,.15,'sine',{slide:.5});vibrate(14);},
  net(){noise(.4,.08,{type:'bandpass',f0:1900,f1:500,q:1.1,attack:.01});},
  post(){voice(1318,.7,.07,'triangle');voice(2010,.5,.035,'sine');voice(660,.4,.03,'triangle');vibrate([20,30,20]);},
  save(){voice(140,.12,.12,'square',{slide:.6});noise(.09,.13,{f0:900,f1:200});vibrate(25);},
  cheer(){noise(2.2,.12,{type:'bandpass',f0:650,f1:1300,q:.6,attack:.12});noise(1.8,.05,{type:'highpass',f0:2600,attack:.1});},
  ooh(){voice(300,.9,.045,'sawtooth',{slide:.72,lp:650});noise(1.1,.06,{type:'bandpass',f0:520,f1:330,q:.9,attack:.25});},
  murmur(){noise(1.8,.014,{type:'bandpass',f0:420,f1:560,q:.5,attack:.6});},
  tick(){voice(1600,.04,.03,'square');}};
 // ---------------------------------------------------------------- faces
 // a seat's face: player index (s.sprite) or a character id (faceSprite)
 function faceAt(who,cx,cy,d,mood='normal',dir=1){if(who==null)return;
  if(typeof who==='number'){s.sprite(x,who,cx,cy,d*1.3,{exact:true,still:true,noBadge:true,mood:mood==='normal'?undefined:mood});return;}
  const sp=faceSprite(who,mood,d*.95,dir)||faceSprite(who,'normal',d*.95,dir);if(sp)x.drawImage(sp.cv,cx+sp.x,cy+sp.y);
  else{x.fillStyle='#d9a27c';x.beginPath();x.arc(cx,cy,d*.45,0,7);x.fill();}}
 const keeperWho=()=>M.faces[keeperSeat()]??keeperSeat(),strikerWho=()=>M.faces[M.kicker]??M.kicker;
 // ---------------------------------------------------------------- kick setup
 function setScene(def){D=def.D??11;bx0=def.bx??0;const back=5.2+(D>11?Math.min(2.5,(D-11)*.18):0);cam.yaw=Math.atan2(-bx0,D);cam.x=bx0-Math.sin(cam.yaw)*back;cam.z=-Math.cos(cam.yaw)*back;cam.y=1.55+(D>11?.25:0);
  wind=def.wind||0;keeperOn=def.keeper!==false;moveAmp=def.move||0;targets=(def.targets||[]).map(t=>({...t,hit:0}));
  wall=[];if(def.wall){const n=def.wall,dist=Math.hypot(D,bx0),wz=9.15*D/dist,wx=bx0*(1-9.15/dist),sh=bx0?Math.sign(bx0)*.31*(n-1)/2:0;
   const cast=def.cast||[];for(let i=0;i<n;i++)wall.push({x:wx+(i-(n-1)/2)*.62+sh,z:wz,face:cast.length?cast[i%cast.length]:null,jump:0});}}
 function resetKick(){ball={p:[bx0,BR,0],v:[0,0,0],ac:0,t:0,flying:false,done:false,res:null,spin:0,pw:0,curve:0,crossed:false,kp:false,wallT:false};
  kp={x:0,x0:0,dive:null,t:0,save:null,early:false};striker={pose:'idle',t:0,run:0};swipe=null;rec=[];replay=null;netHit=null;cpuT=null;kDive=null;result=null;
  for(const w of wall)w.jump=0;phase='aim';snd.whistle();
  const sudden=mode!=='challenge'&&M.taken[0]>=M.kicks&&M.taken[1]>=M.kicks;
  banner={t:1.4,big:mode==='challenge'?`SHOT ${lvShot+1} / ${level.shots}`:sudden?'SUDDEN DEATH':strikerHuman()&&keeperHuman()?`${M.names[M.kicker].toUpperCase()} SHOOTS`:strikerHuman()?'YOUR KICK':'YOU\'RE IN GOAL',
   small:mode==='challenge'?level.sub:strikerHuman()&&keeperHuman()?`${M.names[keeperSeat()]} keeps goal`:strikerHuman()?'Swipe the ball at the goal':'Swipe or tap the way you dive'};
  if(sudden&&M.taken[0]===M.kicks&&M.taken[1]===M.kicks)sub=LINES.sudden[Math.floor(Math.random()*3)];
  if(on){const n=kickNo();if(pend.d?.[0]===n)remoteDive(pend.d);if(pend.k?.[0]===n)remoteKick(pend.k);pend.k=pend.d=null;}}
 // shot from aim (tx,ty on the goal plane), power p (.25..1.5) and curl c (-1..1)
 function shoot(tx,ty,p,c,remote=false){if(phase!=='aim')return;
  if(on&&!remote){if(M.kicker!==me)return;nf.event({k:[kickNo(),+tx.toFixed(3),+ty.toFixed(3),+p.toFixed(3),+c.toFixed(3)]});}
  const over=Math.max(0,p-1.18)*5.5,V=17+clamp(p,.25,1.5)*15,ac=-c*9,dz=D,T=dz/V;
  ball.v=[(tx-bx0-.5*ac*T*T)/T,(ty+over-BR+.5*G*T*T)/T,V];ball.ac=ac;ball.pw=p;ball.curve=c;ball.aim=[tx,ty];
  phase='run';striker.t=0;striker.run=.34;swipe=null;
  // a guessing CPU keeper commits as the striker runs in
  if(keeperOn&&!keeperHuman()&&!(on))cpuKeeperGuess();}
 function launch(){ball.flying=true;phase='fly';snd.kick(ball.pw);for(const w of wall)w.jump=.001;}
 function dive(tx,ty,remote=false,at){if(!keeperOn||kp.dive||phase!=='aim'&&phase!=='run'&&phase!=='fly')return;
  if(on&&!remote){if(keeperSeat()!==me)return;nf.event({d:[kickNo(),+tx.toFixed(3),+ty.toFixed(3),phase==='fly'?+ball.t.toFixed(3):-1]});}
  const dx=clamp(tx-kp.x,-3.05,3.05),tY=clamp(ty,.12,2.55),dur=.27+.07*Math.abs(dx)+.06*Math.max(0,tY-1.6)+(keeperHuman()?0:.12*(1-skill));
  kp.dive={tx:kp.x+dx,ty:tY,t:remote&&at>=0&&phase==='fly'?Math.max(0,ball.t-at):0,dur,x0:kp.x};kp.early=phase!=='fly';
  noise(.12,.05,{type:'bandpass',f0:500,f1:1500,q:1.5});}
 function remoteKick(k){const [n,tx,ty,p,cv]=k;if(n!==kickNo()||phase!=='aim'){if(n>kickNo()||phase==='result'||phase==='replay'||phase==='sync')pend.k=k;return;}shoot(clamp(+tx||0,-12,12),clamp(+ty||0,-1,6),clamp(+p||0,.25,1.5),clamp(+cv||0,-1,1),true);}
 function remoteDive(d){const [n,tx,ty,at]=d;if(n!==kickNo()||!['aim','run','fly'].includes(phase)){if(n>kickNo()||phase==='result'||phase==='replay'||phase==='sync')pend.d=d;return;}dive(+tx||0,+ty||1,true,+at);}
 // ---------------------------------------------------------------- keeper geometry at its current time
 function kGeo(){const d=kp.dive,cx=kp.x;if(!d)return {c:[cx,1.0],h:[cx,1.5],feet:[cx,.02],u:0,wide:.78,dir:0};
  const u=ease(d.t/d.dur),hx=d.x0+(d.tx-d.x0)*u,hy=1.45+(d.ty-1.45)*u,ccx=d.x0+(d.tx-d.x0)*u*.6,ccy=1.0+(d.ty-1.0)*u*.5;
  const vx=hx-ccx,vy=hy-ccy,len=Math.hypot(vx,vy)||1;return {c:[ccx,ccy],h:[hx,hy],feet:[ccx-vx/len*.95,Math.max(.02,ccy-vy/len*.95)],u,wide:.3,dir:Math.sign(d.tx-d.x0)};}
 function segDist(px,py,a,b){const vx=b[0]-a[0],vy=b[1]-a[1],L2=vx*vx+vy*vy||1,t=clamp(((px-a[0])*vx+(py-a[1])*vy)/L2,0,1);return Math.hypot(px-a[0]-vx*t,py-a[1]-vy*t);}
 function keeperTouch(bx,by,speed){if(!keeperOn)return null;const g=kGeo(),fast=speed>27.5?.1:0;
  const body=segDist(bx,by,g.feet,g.h)<.3+BR,hands=Math.hypot(bx-g.h[0],by-g.h[1])<.42-fast+BR;
  const arms=!kp.dive&&Math.abs(by-1.45)<.16+BR&&Math.abs(bx-kp.x)<.78;
  if(!body&&!hands&&!arms)return null;return {catch:speed<23.5&&(hands||body)&&g.u>.6&&Math.abs(bx-kp.x)<1.4,tip:hands&&!body};}
 // ---------------------------------------------------------------- ball flight
 function stepBall(h){const b=ball,p=b.p,v=b.v;
  v[0]+=(b.ac+wind)*h;b.ac*=1-.25*h;v[1]-=G*h;const sp=Math.hypot(...v),dr=1-.0035*sp*h;v[0]*=dr;v[1]*=dr;v[2]*=dr;
  const pz=p[2];p[0]+=v[0]*h;p[1]+=v[1]*h;p[2]+=v[2]*h;b.spin+=(sp*.6+Math.abs(b.ac)*1.5)*h;b.t+=h;
  // wall
  if(!b.wallT&&wall.length){for(const w of wall)if(pz<w.z&&p[2]>=w.z){const top=1.9+w.jump*.35;if(Math.abs(p[0]-w.x)<.3+BR&&p[1]<top+BR){b.wallT=true;v[2]=-Math.abs(v[2])*.25;v[0]+=(p[0]-w.x)*4;v[1]=Math.abs(v[1])*.3+1;settle('wall');snd.save();}}}
  // keeper plane
  const kz=D-KZ;if(!b.kp&&pz<kz&&p[2]>=kz){b.kp=true;const t=keeperTouch(p[0],p[1],sp);if(t){kp.save=t;
   if(t.catch){v[0]=v[1]=0;v[2]=0;b.caught=true;}else{v[2]=-Math.abs(v[2])*.28;v[0]+=(p[0]>=kGeo().c[0]?1:-1)*5.5;v[1]=Math.abs(v[1])*.4+2.6;}
   settle(t.catch?'catch':t.tip?'tip':'save');snd.save();}}
  // goal line: posts and bar
  if(!b.crossed&&pz<D&&p[2]>=D){b.crossed=true;const ax=Math.abs(p[0]),postHit=Math.abs(ax-HW)<BR+.06&&p[1]<BAR+.06,barHit=Math.abs(p[1]-BAR)<BR+.06&&ax<HW+.06;
   if(postHit||barHit){snd.post();camShake=.25;if(postHit?ax<HW:p[1]<BAR){v[2]*=.7;v[0]*=-.4;settle(postHit?'postin':'barin');}else{v[2]=-Math.abs(v[2])*.5;v[0]=(p[0]>0?1:-1)*Math.abs(v[0])*.6;settle(postHit?'post':'bar');}}
   else if(ax<HW&&p[1]<BAR)settle('goal');else settle(p[1]>=BAR?'over':'wide');}
  // net
  if(b.crossed&&b.res&&['goal','postin','barin'].includes(b.res)&&p[2]>D+NET_D-.15-(p[1]>1.6?(p[1]-1.6)*.9:0)&&v[2]>0){netHit={x:p[0],y:p[1],t:0};v[2]=-v[2]*.12;v[0]*=.3;v[1]*=.4;snd.net();}
  // ground
  if(p[1]<BR&&!b.caught){p[1]=BR;if(v[1]<0)v[1]=-v[1]*.48;v[0]*=.9;v[2]*=.9;}
  if(p[2]>D+BOARD_Z-.2){p[2]=D+BOARD_Z-.2;v[2]=-v[2]*.3;}
  if(b.caught){const g=kGeo();p[0]=g.h[0];p[1]=Math.max(BR,g.h[1]-.1);p[2]=D-KZ;}}
 function settle(r){if(!ball.res)ball.res=r;}
 const isGoal=r=>r==='goal'||r==='postin'||r==='barin';
 // ---------------------------------------------------------------- results
 function finishKick(forced){if(result)return;let r=forced||ball.res||'wide';ball.res=r;
  if(on&&!forced&&keeperSeat()===me)nf.event({r:[kickNo(),r]});
  const goal=isGoal(r),p=ball.p,c=ball.curve,ax=Math.abs(p[0]);let pts=0,head='',tags=[];
  if(goal){head=ax>2.55&&p[1]>1.6?'TOP BINS!':ball.pw<.5&&ax<1.2&&p[1]>.9?'PANENKA!':r==='postin'?'IN OFF THE POST!':r==='barin'?'OFF THE BAR AND IN!':Math.abs(c)>.55?'WHAT A BENDER!':kp.dive&&Math.sign(kp.dive.tx-kp.dive.x0)===-Math.sign(p[0])&&ax>1.2?'SENT THE WRONG WAY!':'GOAL!';
   pts=100;if(head==='TOP BINS!')pts+=50,tags.push('+50 top bins');if(Math.abs(c)>.55)pts+=50,tags.push('+50 bend');
   for(const t of targets)if(!t.hit&&Math.hypot(p[0]-t.x,p[1]-t.y)<t.r+BR*.5){t.hit=1;pts+=t.pts;lvTargets++;tags.push(`+${t.pts} target`);}
   snd.cheer();flash=.5;camShake=.3;}
  else{head=r==='catch'?'HELD!':r==='tip'?'FINGERTIP SAVE!':r==='save'?'SAVED!':r==='wall'?'BLOCKED BY THE WALL!':r==='post'?'OFF THE POST!':r==='bar'?'OFF THE BAR!':r==='over'?'OVER THE BAR!':'WIDE!';
   if(r==='over'&&ball.pw>1.2)head='WAY TOO MUCH POWER!';
   if(['catch','tip','save'].includes(r)){snd.cheer();}else snd.ooh();}
  if(mode==='challenge'&&!goal)for(const t of targets)if(!t.hit&&Math.hypot(p[0]-t.x,p[1]-t.y)<t.r+BR*.5&&!['wide','over'].includes(r)){t.hit=1;}
  const pool=goal?LINES.goal:['catch','tip','save'].includes(r)?LINES.save:['post','bar'].includes(r)?LINES.post:LINES.miss;msg=head;sub=tags.join('  ')||pool[Math.floor(Math.random()*pool.length)];
  msgT=1.9;result={r,goal,pts};
  if(mode==='challenge'){lvShot++;if(goal){lvGoals++;lvScore+=pts;}}
  else{M.hist[M.kicker].push(goal);M.taken[M.kicker]++;if(goal)M.goals[M.kicker]++;s.setScores?.(mode==='shootout'?[...M.goals]:[M.goals[0],M.goals[1]]);
   try{s.react(M.kicker,goal?'happy':'sad');s.react(keeperSeat(),goal?'sad':'happy');}catch{}}
  phase='result';}
 function decided(){const a=M.taken[0],b=M.taken[1],ga=M.goals[0],gb=M.goals[1],N=M.kicks;
  if(a<=N&&b<=N){if(ga+(N-a)<gb||gb+(N-b)<ga)return true;if(a===N&&b===N)return ga!==gb;return false;}
  return a===b&&ga!==gb;}
 // ---------------------------------------------------------------- CPU
 function cpuKeeperGuess(){const g=s.random()<.16+(1-skill)*.22;if(!g)return;const side=s.random()<.5?-1:1;kDive={at:-1,tx:side*(1.4+s.random()*1.6),ty:.3+s.random()*1.7};}
 function cpuKeeper(dt){if(on||!keeperOn||kp.dive||keeperHuman())return;
  if(kDive&&kDive.at<0&&phase==='run'&&striker.t>striker.run*.7){dive(kDive.tx,kDive.ty);kDive=null;return;}
  if(phase!=='fly')return;if(cpuT===null)cpuT=.2-.12*skill+s.random()*.08;cpuT-=dt;if(cpuT>0)return;
  // predict where the ball crosses: it knows gravity, not the curl (so a bender fools it)
  const p=ball.p,v=ball.v,t=Math.max(0,(D-KZ-p[2])/Math.max(1,v[2]));const ex=p[0]+v[0]*t,ey=p[1]+v[1]*t-.5*G*t*t;const err=(1.08-skill)*.95;
  const tx=ex+(s.random()-.5)*2*err,ty=ey+(s.random()-.5)*err;if(Math.abs(tx)>HW+.8||ty>BAR+.6){cpuT=99;return;}dive(tx,ty);}
 function cpuStrike(dt){if(on||phase!=='aim'||strikerHuman())return;if(cpuT===null)cpuT=1.0+s.random()*1.1;cpuT-=dt;if(cpuT>0)return;cpuT=null;
  const sk=skill,r=s.random;if(r()<.06){shoot(bx0+(r()-.5)*.6,1.3,.36,0);return;}
  const side=r()<.5?-1:1;shoot(side*(1.3+r()*(1.5+sk*.9)+(r()<.12*(1-sk)?1.3:0)),.25+r()*(1.2+sk*.8),.62+r()*.5,(r()-.5)*.9*(r()<.4?1:.3));}
 // online test bot: plays this phone's own role with the CPU brains (Math.random keeps the seeded stream alike)
 let bot=false,botT=null;
 function botStep(dt){if(!bot)return;if(phase==='aim'&&M.kicker===me){if(botT===null)botT=.6+Math.random();botT-=dt;if(botT<=0){botT=null;const sd=Math.random()<.5?-1:1;shoot(sd*(1.2+Math.random()*2.2),.3+Math.random()*1.8,.6+Math.random()*.5,(Math.random()-.5)*.6);}}
  if(keeperSeat()===me&&phase==='fly'&&!kp.dive&&Math.random()<dt*4){const p=ball.p,v=ball.v,t=(D-KZ-p[2])/Math.max(1,v[2]);dive(p[0]+v[0]*t+(Math.random()-.5)*1.5,p[1]+v[1]*t-.5*G*t*t);}}
 // ---------------------------------------------------------------- input
 // a shot from swipe points: angle aims across, length lifts it, speed is power, a bend curls it
 function shotFrom(pts){const a=pts[0],b=pts[pts.length-1],dx=b.x-a.x,dy=a.y-b.y;if(dy<22)return null;const Hn=Math.min(L.H,L.W*1.8);
  const dist=Math.hypot(dx,dy),dt=Math.max(45,b.t-a.t),p=clamp(dist/dt/(Hn*.0021),.25,1.5);
  const tx=dx/dy*Math.hypot(D,bx0)*.62,ty=.12+clamp(dy/(Hn*.36),0,1.6)*1.72;
  let off=0;for(const m of pts){const tau=(a.y-m.y)/dy;if(tau<.1||tau>.9)continue;const o=m.x-(a.x+dx*tau);if(Math.abs(o)>Math.abs(off))off=o;}
  const cv=clamp(off/(dist*.16),-1,1);return {tx,ty,p,c:Math.abs(cv)<.12?0:cv};}
 const isStrikerTouch=(px,py)=>{const gb=P(0,0,D)[1],by=P(bx0,0,0)[1];return py>gb+(by-gb)*.38;};
 let kTouch=null;
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev);
  for(const b of buttons)if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){b.go();return;}
  if(phase==='result'&&msgT<1.4){msgT=0;return;}if(phase==='replay'&&replay&&replay.t>.4){replay.t=replay.len;return;}
  if(phase!=='aim'&&phase!=='run'&&phase!=='fly')return;
  const sH=strikerHuman(),kH=keeperHuman(),asStriker=sH&&(!kH||isStrikerTouch(p.x,p.y));
  if(asStriker){if(phase==='aim'&&!swipe){swipe={id:ev.pointerId,pts:[{x:p.x,y:p.y,t:performance.now()}]};s.capture(ev);}}
  else if(kH&&!kp.dive){kTouch={id:ev.pointerId,x:p.x,y:p.y,t:performance.now()};s.capture(ev);}});
 s.on(c,'pointermove',ev=>{const p=s.pointer(ev);
  if(swipe&&ev.pointerId===swipe.id){swipe.pts.push({x:p.x,y:p.y,t:performance.now()});if(swipe.pts.length>60)swipe.pts.splice(1,1);}
  if(kTouch&&ev.pointerId===kTouch.id){const dx=p.x-kTouch.x,dy=p.y-kTouch.y;if(Math.hypot(dx,dy)>26){keeperSwipe(kTouch.x,kTouch.y,dx,dy);kTouch=null;}}});
 const up=ev=>{const p=s.pointer(ev);
  if(swipe&&ev.pointerId===swipe.id){swipe.pts.push({x:p.x,y:p.y,t:performance.now()});const sh=shotFrom(swipe.pts);swipe=null;s.release(ev);if(sh)shoot(sh.tx,sh.ty,sh.p,sh.c);}
  if(kTouch&&ev.pointerId===kTouch.id){const k=kTouch;kTouch=null;s.release(ev);const [tx,ty]=unproject(p.x,p.y,D-KZ);if(Math.hypot(p.x-k.x,p.y-k.y)<26)dive(tx,ty);}};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',ev=>{if(swipe?.id===ev.pointerId)swipe=null;if(kTouch?.id===ev.pointerId)kTouch=null;});
 function keeperSwipe(x0,y0,dx,dy){const sc=(D-KZ-cam.z)/L.f,len=Math.hypot(dx,dy);const tx=kp.x+dx/len*3.2*clamp(len/60,.55,1),ty=1.2-dy/len*1.3;dive(tx,ty);}
 // keys: striker aims a reticle (arrows / WASD) and shoots (space / enter); keeper dives left / right / up / down
 const aimK={x:0,y:1.2};
 keyboard(s,(i,k,down)=>{if(!down)return;const sH=strikerHuman(),kH=keeperHuman(),asK=kH&&(!sH||i===1);
  if(asK){if(k==='l')dive(kp.x-2.6,1.0);if(k==='r')dive(kp.x+2.6,1.0);if(k==='u')dive(kp.x,2.3);if(k==='d')dive(kp.x,.3);return;}
  if(!sH||phase!=='aim')return;if(k==='l')aimK.x=clamp(aimK.x-.6,-4.5,4.5);if(k==='r')aimK.x=clamp(aimK.x+.6,-4.5,4.5);if(k==='u')aimK.y=clamp(aimK.y+.35,.1,2.8);if(k==='d')aimK.y=clamp(aimK.y-.35,.1,2.8);if(k==='act')shoot(aimK.x,aimK.y,.85,0);});
 // ---------------------------------------------------------------- drawing: stadium, pitch, goal
 let stands=null;
 function standsLayer(W,H,yb){yb=Math.round(yb/8)*8;const key=W+'x'+H+'x'+yb+':'+PS.version();stands=stands||new Map();if(stands.has(key))return stands.get(key);if(stands.size>4)stands.clear();
  const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(W));cv.height=Math.max(1,Math.round(yb));const g=cv.getContext('2d');
  const pic=BG.pick(W,H,{tall:'stadium-tall',wide:'stadium-wide',fold:'stadium-fold'},PS.picture);
  if(pic){const k=Math.max(W/pic.width,yb/pic.height*.6),w=pic.width*k,h=pic.height*k;g.fillStyle='#050a14';g.fillRect(0,0,W,yb);g.drawImage(pic,(W-w)/2,yb-h,w,h);if(yb-h>0){g.drawImage(pic,0,0,pic.width,2,(W-w)/2,0,w,yb-h);}}
  else{const sky=g.createLinearGradient(0,0,0,yb);sky.addColorStop(0,'#02040c');sky.addColorStop(.6,'#0c1730');sky.addColorStop(1,'#1a2440');g.fillStyle=sky;g.fillRect(0,0,W,yb);
   const r=seededRandom('pk-stands');for(let t=0;t<3;t++){const y0=yb*(.22+t*.24),y1=yb*(.46+t*.24);g.fillStyle=['#121a2c','#18233a','#1f2c48'][t];g.fillRect(0,y0,W,y1-y0);
    for(let k=0;k<W*(y1-y0)/38;k++){g.fillStyle=['#e7e7ea','#c33a3a','#2f6fe0','#ffd23f','#7ad21e','#f08a3a'][Math.floor(r()*6)]+'aa';g.fillRect(r()*W,y0+r()*(y1-y0),2.2,2.6);}}
   for(const fx of [.12,.88]){const gl=g.createRadialGradient(W*fx,yb*.08,2,W*fx,yb*.08,W*.3);gl.addColorStop(0,'#fffbe0');gl.addColorStop(.08,'#fff6c088');gl.addColorStop(1,'#fff6c000');g.fillStyle=gl;g.fillRect(0,0,W,yb);
    g.fillStyle='#fffbe8';for(let i=0;i<4;i++)for(let j=0;j<2;j++)g.fillRect(W*fx-12+i*7,yb*.06+j*6,5,4);}}
  stands.set(key,cv);return cv;}
 function quad(pts,fill){x.fillStyle=fill;x.beginPath();pts.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();x.fill();}
 function line3(a,b,cm){const p=P(...a,cm),q=P(...b,cm);x.beginPath();x.moveTo(p[0],p[1]);x.lineTo(q[0],q[1]);x.stroke();}
 function drawScene(cm){const W=L.W,H=L.H,zb=D+BOARD_Z,yb=P(0,0,zb,cm)[1];
  {const sl=standsLayer(W,H,yb);x.fillStyle='#02040c';x.fillRect(0,0,W,yb);x.drawImage(sl,0,yb-sl.height,W,sl.height);}
  // ad boards
  const a0=P(-40,.95,zb,cm),a1=P(40,0,zb,cm);const ads=PS.picture('adboards');
  if(ads){const h=a1[1]-a0[1],w=ads.width*h/ads.height;for(let xx=a0[0]-((performance.now()*.02)%w);xx<a1[0];xx+=w)x.drawImage(ads,xx,a0[1],w,h);}
  else{x.fillStyle='#0b0f1a';x.fillRect(a0[0],a0[1],a1[0]-a0[0],a1[1]-a0[1]);const h=a1[1]-a0[1],seg=h*7,off=(performance.now()*.03)%(seg*AD.length);
   x.save();x.beginPath();x.rect(0,a0[1],W,h);x.clip();x.font=`900 ${h*.52}px sans-serif`;x.textBaseline='middle';x.textAlign='center';
   for(let i=-1;i<W/seg+2;i++){const k=Math.floor((i*seg+off)/seg),xx=i*seg-(off%seg)+seg/2;x.fillStyle=['#ffd23f','#7ad21e','#4fb4ff','#ff6b6b'][((k%4)+4)%4];x.fillText(AD[((k%AD.length)+AD.length)%AD.length],xx,a0[1]+h/2);}x.restore();}
  // pitch: stripes running across
  const g0=P(0,0,zb,cm)[1];x.fillStyle='#1e6a2c';x.fillRect(0,g0,W,H-g0);
  for(let z=zb,i=0;z>cm.z+.6;z-=2.5,i++){const ya=P(0,0,z,cm)[1],yb2=P(0,0,Math.max(cm.z+.6,z-2.5),cm)[1];x.fillStyle=i%2?'#237a33':'#1c6a2b';x.fillRect(0,ya,W,Math.min(H,yb2)-ya+1);}
  const vg=x.createLinearGradient(0,g0,0,H);vg.addColorStop(0,'#00000055');vg.addColorStop(.35,'#00000000');vg.addColorStop(1,'#00000030');x.fillStyle=vg;x.fillRect(0,g0,W,H-g0);
  // lines
  x.strokeStyle='#ffffffcc';x.lineWidth=Math.max(1.5,P(0,0,D,cm)[2]*.08);const zn=cm.z+.7,cl=z=>Math.max(zn,z);
  line3([-30,0,D],[30,0,D],cm);const box=(hw,dep)=>{line3([-hw,0,D],[-hw,0,cl(D-dep)],cm);line3([hw,0,D],[hw,0,cl(D-dep)],cm);if(D-dep>zn)line3([-hw,0,D-dep],[hw,0,D-dep],cm);};box(9.16,5.5);box(20.16,16.5);
  const ps=P(0,0,D-11,cm);if(D-11>zn){x.fillStyle='#ffffffcc';x.beginPath();x.ellipse(ps[0],ps[1],ps[2]*.13,ps[2]*.05,0,0,7);x.fill();}
  // goal: net behind, then posts
  drawNet(cm);drawGoalFrame(cm);}
 function drawNet(cm){const n=netHit,dsp=(px,py)=>{if(!n)return 0;const e=Math.exp(-((px-n.x)**2+(py-n.y)**2)/.9);return e*.55*Math.exp(-n.t*3.2)*Math.cos(n.t*16);};
  const back=y=>D+NET_D-(y>1.6?(y-1.6)*.9:0);x.strokeStyle='#ffffff38';x.lineWidth=1;
  // back
  for(let i=0;i<=18;i++){const px=-HW+i*HW*2/18;x.beginPath();for(let j=0;j<=8;j++){const py=j*BAR/8,q=P(px,py,back(py)+dsp(px,py),cm);j?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]);}x.stroke();}
  for(let j=0;j<=8;j++){const py=j*BAR/8;x.beginPath();for(let i=0;i<=18;i++){const px=-HW+i*HW*2/18,q=P(px,py,back(py)+dsp(px,py),cm);i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]);}x.stroke();}
  // sides + roof
  for(const sd of[-1,1]){for(let i=0;i<=6;i++){const z=D+i*NET_D/6;line3([sd*HW,0,z],[sd*HW,BAR,Math.min(z,back(BAR))],cm);}line3([sd*HW,BAR,D],[sd*HW,BAR,back(BAR)],cm);}
  for(let i=0;i<=8;i++){const z=D+i*(back(BAR)-D)/8;line3([-HW,BAR,z],[HW,BAR,z],cm);}
  const net=PS.picture('net');if(net){const a=P(-HW,BAR,back(BAR),cm),b=P(HW,0,back(0),cm);x.globalAlpha=.7;x.drawImage(net,a[0],a[1],b[0]-a[0],b[1]-a[1]);x.globalAlpha=1;}}
 function drawGoalFrame(cm){const gp=PS.picture('goal');const a=P(-HW-.06,BAR+.06,D,cm),b=P(HW+.06,0,D,cm);
  if(gp){x.drawImage(gp,a[0],a[1],b[0]-a[0],b[1]-a[1]);return;}
  const w=Math.max(2,P(0,0,D,cm)[2]*.12);x.lineCap='round';x.strokeStyle='#00000055';x.lineWidth=w*1.3;x.beginPath();x.moveTo(a[0]+w*.4,b[1]+w*.3);x.lineTo(a[0]+w*.4,a[1]+w*.4);x.lineTo(b[0]+w*.4,a[1]+w*.4);x.lineTo(b[0]+w*.4,b[1]+w*.3);x.stroke();
  x.strokeStyle='#f6f8fb';x.lineWidth=w;x.beginPath();x.moveTo(a[0],b[1]);x.lineTo(a[0],a[1]);x.lineTo(b[0],a[1]);x.lineTo(b[0],b[1]);x.stroke();}
 // keeper in goal (sprite sheet or drawn) + face
 const headCache={};
 function poseHead(table,name,fn){const k=fn+name;if(!headCache[k]){const r=A[fn](dummy,table[name],0,0,PS.UNIT);headCache[k]=r.head;}return headCache[k];}
 function drawKeeper(cm){if(!keeperOn)return;const g=kGeo(),[sx,sy,k]=P(g.c[0],g.c[1],D-KZ,cm),seat=keeperSeat(),kit=mode==='challenge'||typeof M.faces[seat]==='string'?'kcpu':seat?'kp2':'kp1';
  let name='ready',blendK=0;const d=kp.dive;const mir=d?d.tx<d.x0:false;
  if(d){const dx=Math.abs(d.tx-d.x0);name=dx<.7?(d.ty>1.7?'jump':d.ty<.6?'crouch':'catch'):d.ty<.7?'dive-low':d.ty<1.65?'dive-mid':'dive-high';blendK=g.u;}
  else if(phase==='run')name='set';
  if(ball?.caught&&phase!=='aim')name='catch';
  const mood=phase==='result'&&result?(result.goal?'sad':'happy'):kp.dive?'angry':'normal';
  const sheet=PS.picture('keeper-'+(kit==='kp1'?'p1':kit==='kp2'?'p2':'cpu')),cell=sheet&&PS.cellOf('keeper-'+(kit==='kp1'?'p1':kit==='kp2'?'p2':'cpu'),blendK>.35||!d?name:'set');
  let head;
  if(cell){const sc=k/PS.UNIT;x.save();x.translate(sx,sy);if(mir)x.scale(-1,1);x.drawImage(sheet,cell.sx,cell.sy,cell.w,cell.h,-PS.MID_K[0]*sc,-PS.MID_K[1]*sc,cell.w*sc,cell.h*sc);x.restore();
   const hh=poseHead(A.KEEPER,blendK>.35||!d?name:'set','drawKeeper');head=[sx+(mir?-1:1)*hh[0]*sc,sy+hh[1]*sc,hh[2]*sc];}
  else{let pose=d?A.blendPose(A.KEEPER.set,A.KEEPER[name],blendK):A.KEEPER[name];
   if(d&&Math.abs(d.tx-d.x0)>=.7)pose={...pose,rot:Math.atan2(Math.abs(g.h[0]-g.c[0]),g.h[1]-g.c[1])*blendK};
   if(!d&&phase==='aim'){const b=Math.sin(performance.now()/260)*.04;pose={...pose,crouch:pose.crouch+b};}
   head=A.drawKeeper(x,pose,sx,sy,k,A.KITS[kit],{mirror:mir}).head;}
  faceAt(keeperWho(),head[0],head[1],head[2],mood,mir?-1:1);}
 function drawStriker(cm){const pose=striker.pose,cheer=pose==='cheer';const ru=phase==='run'?Math.min(1,striker.t/striker.run):phase==='aim'||phase==='wait'||phase==='sync'?0:1,ra=-.95+ru*.62,fa=-1.35+ru*1.0,yw=cam.yaw||0,sp=P(bx0+ra*Math.cos(yw)+fa*Math.sin(yw),0,-ra*Math.sin(yw)+fa*Math.cos(yw),cm);
  if(sp[1]>L.H*1.25)return;const seat=M.kicker,kit=mode==='challenge'||seat===0?'p1':'p2';const k=Math.min(sp[2],L.H*.4/1.9);if(k<sp[2]){const bq=P(bx0,0,0,cm);sp[0]=bq[0]-(bq[0]-sp[0])*k/sp[2]-k*.35;sp[1]=Math.min(L.H*.99,bq[1]+(sp[1]-bq[1])*k/sp[2]);}
  const sheet=PS.picture('striker-'+kit),cell=sheet&&PS.cellOf('striker-'+kit,pose);let head;
  x.fillStyle='#0004';x.beginPath();x.ellipse(sp[0],sp[1],k*.42,k*.1,0,0,7);x.fill();
  if(cell){const sc=k/PS.UNIT;x.drawImage(sheet,cell.sx,cell.sy,cell.w,cell.h,sp[0]-PS.FOOT_S[0]*sc,sp[1]-PS.FOOT_S[1]*sc,cell.w*sc,cell.h*sc);const hh=poseHead(A.STRIKER,pose,'drawStriker');head=[sp[0]+hh[0]*sc,sp[1]+hh[1]*sc,hh[2]*sc];}
  else head=A.drawStriker(x,A.STRIKER[pose],sp[0],sp[1],k,A.KITS[kit]).head;
  if(cheer)faceAt(strikerWho(),head[0],head[1],head[2],'happy');else A.backOfHead(x,head[0],head[1],head[2],A.KITS[kit].hair,A.KITS[kit].skin);}
 function drawBall(cm,bp=ball.p,spin=ball.spin){const q=P(bp[0],bp[1],bp[2],cm),sh=P(bp[0],0,bp[2],cm),r=Math.max(2.5,BR*q[2]);
  x.fillStyle='#0006';x.beginPath();x.ellipse(sh[0],sh[1],r*1.1,r*.35,0,0,7);x.fill();A.drawBall(x,q[0],q[1],r,spin,PS.picture('ball'));}
 function drawWall(cm){for(const w of wall){const q=P(w.x,0,w.z,cm),j=w.jump>0?Math.sin(Math.min(1,w.jump/.5)*Math.PI)*.35:0,hd=A.drawWallMan(x,q[0],q[1],q[2],undefined,j).head;
  const pic=PS.picture('wall-player');void pic;faceAt(w.face,hd[0],hd[1],hd[2],w.jump>0?'angry':'normal');}}
 function drawTargets(cm){for(const t of targets){const q=P(t.x,t.y,D,cm),r=t.r*q[2],pic=PS.picture('target'),pulse=1+Math.sin(performance.now()/220)*.05;
  if(t.hit){x.globalAlpha=.35;}if(pic)x.drawImage(pic,q[0]-r*pulse,q[1]-r*pulse,r*2*pulse,r*2*pulse);
  else{x.strokeStyle=t.hit?'#7dff8a':'#ffd23f';x.lineWidth=Math.max(2,r*.16);x.shadowColor=x.strokeStyle;x.shadowBlur=12;x.beginPath();x.arc(q[0],q[1],r*pulse,0,7);x.stroke();x.shadowBlur=0;
   label(x,'+'+t.pts,q[0],q[1],Math.max(9,r*.55),{fill:'#fff'});}x.globalAlpha=1;}}
 // aiming guide while swiping: where the shot goes on the goal plane
 function drawAim(){const sh=swipe&&swipe.pts.length>2?shotFrom(swipe.pts):null;
  if(swipe){x.strokeStyle='#ffd23fcc';x.lineWidth=5;x.lineCap='round';x.beginPath();swipe.pts.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();}
  if(sh){const q=P(sh.tx,Math.min(3.2,sh.ty),D),r=Math.max(8,.3*q[2]);x.strokeStyle=sh.p>1.18?'#ff5a4a':'#ffffffdd';x.lineWidth=2.5;x.beginPath();x.arc(q[0],q[1],r,0,7);x.moveTo(q[0]-r*1.4,q[1]);x.lineTo(q[0]+r*1.4,q[1]);x.moveTo(q[0],q[1]-r*1.4);x.lineTo(q[0],q[1]+r*1.4);x.stroke();
   if(sh.c){x.strokeStyle='#4fd1ff';x.beginPath();x.arc(q[0]+sh.c*r*2.2,q[1],r*1.6,sh.c>0?Math.PI*.7:-Math.PI*.3,sh.c>0?Math.PI*1.3:Math.PI*.3);x.stroke();}}
  else if(phase==='aim'&&strikerHuman()&&!swipe){const b=P(bx0,BR,0),t=performance.now()/600%1;x.globalAlpha=.75*(1-t);x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(b[0],b[1],BR*b[2]*(1.6+t*2.4),0,7);x.stroke();x.globalAlpha=1;
   const hy=b[1]-BR*b[2]*3-t*40;x.fillStyle='#ffffffaa';x.beginPath();x.moveTo(b[0],hy-14);x.lineTo(b[0]-9,hy);x.lineTo(b[0]+9,hy);x.closePath();x.fill();}
  if(wind){const fs=Math.max(11,L.W*.03);label(x,`WIND ${wind>0?'→':'←'} ${Math.abs(wind).toFixed(1)}`,L.W-12,L.H-fs*1.3,fs,{align:'right',fill:'#bfe8ff'});}}
 // HUD: shootout scoreboard / challenge card
 function drawHUD(){const fs=clamp(Math.min(L.W,L.H)*.034,11,17),x0=10,y0=L.top+2;
  if(mode==='challenge'){const w=fs*12;x.fillStyle='#000000a8';rr(x,x0,y0,w,fs*4.4,8);x.fill();
   label(x,`LEVEL ${level.n} · ${level.title}`,x0+10,y0+fs*.9,fs,{align:'left',fill:'#ffd23f'});
   label(x,`Shot ${Math.min(lvShot+1,level.shots)}/${level.shots}   Goals ${lvGoals}${level.need.targets?`   Targets ${lvTargets}/${level.need.targets}`:`/${level.need.goals}`}`,x0+10,y0+fs*2.2,fs*.85,{align:'left'});
   const st=lvScore>=level.star[1]?3:lvScore>=level.star[0]?2:passNow()?1:0;label(x,`${lvScore} pts  ${'★'.repeat(st)}${'☆'.repeat(3-st)}`,x0+10,y0+fs*3.4,fs*.9,{align:'left',fill:'#ffe680'});return;}
  const rows=[0,1],w=Math.min(L.W*.66,fs*17.5);x.fillStyle='#000000b0';rr(x,x0,y0,w,fs*3.6+(M.teamName?fs*1.1:0),8);x.fill();let yy=y0+fs*.95;
  if(M.teamName){label(x,M.teamName,x0+10,yy,fs*.8,{align:'left',fill:'#ffd23f'});yy+=fs*1.1;}
  for(const i of rows){const nm=(i===1&&M.teamName?M.teamName.split(' ')[0]:M.names[i]).slice(0,12);label(x,nm,x0+10,yy,fs*.9,{align:'left',fill:i?'#ff9fc6':'#8ec5ff'});
   const n=Math.max(M.kicks,M.taken[i]);const dots=Math.min(n,8),off=Math.max(0,M.taken[i]-8);for(let k=0;k<dots;k++){const r=M.hist[i][k+off];x.fillStyle=r===undefined?'#ffffff30':r?'#5fe07a':'#e05a4a';x.beginPath();x.arc(x0+fs*7.6+k*fs*1.1,yy,fs*.38,0,7);x.fill();}
   label(x,String(M.goals[i]),x0+w-10,yy,fs*1.1,{align:'right'});yy+=fs*1.35;}}
 function drawBanner(dt){if(banner&&banner.t>0){banner.t-=dt;const a=Math.min(1,banner.t*3),fs=clamp(L.W*.07,20,38),gb=P(0,0,D)[1],by=gb+(P(bx0,0,0)[1]-gb)*.42;x.globalAlpha=a;
  label(x,banner.big,L.W/2,by,fs,{fill:'#fff'});label(x,banner.small,L.W/2,by+fs*1.05,fs*.45,{fill:'#ffe680'});x.globalAlpha=1;}
  if(phase==='result'||phase==='replay'){const fs=clamp(L.W*.085,24,48),pop=1+Math.max(0,msgT-1.6)*1.6,good=result?.goal;
   x.save();x.translate(L.W/2,L.H*.56);x.scale(pop,pop);label(x,msg,0,0,fs,{fill:good?'#9dff5c':['HELD!','SAVED!','FINGERTIP SAVE!'].includes(msg)?'#4fd1ff':'#ffd23f'});x.restore();
   if(sub)label(x,sub,L.W/2,L.H*.56+fs*1.0,fs*.36,{fill:'#fff'});}}
 // ---------------------------------------------------------------- menus & cards (drawn on the canvas, tap targets in `buttons`)
 function button(id,text,bx,by,w,h,go,{hot=false,sub:st=''}={}){buttons.push({id,x:bx,y:by,w,h,go});x.fillStyle=hot?'#ffd23f':'#0b1a33ee';rr(x,bx,by,w,h,h*.3);x.fill();x.strokeStyle=hot?'#fff2b0':'#4f8fffaa';x.lineWidth=2;x.stroke();
  label(x,text,bx+w/2,by+h*(st?.4:.52),h*.36,{fill:hot?'#1a1300':'#fff'});if(st)label(x,st,bx+w/2,by+h*.74,h*.2,{fill:hot?'#3a2a00':'#bcd'});}
 function drawLogo(cx,cy,w){const lg=PS.picture('logo');if(lg){const h=w*lg.height/lg.width;x.drawImage(lg,cx-w/2,cy-h/2,w,h);return;}
  label(x,'PENALTY',cx,cy-w*.07,w*.15,{fill:'#fff'});label(x,'SHOOTOUT',cx,cy+w*.08,w*.15,{fill:'#ffd23f'});label(x,'THE LEAGUE',cx,cy+w*.2,w*.05,{fill:'#8ec5ff'});}
 function drawTitleBg(){const p=BG.pick(L.W,L.H,{tall:'title-bg-tall',wide:'title-bg',fold:'title-bg-fold'},PS.picture);
  if(p){const k=Math.max(L.W/p.width,L.H/p.height);x.drawImage(p,(L.W-p.width*k)/2,(L.H-p.height*k)/2,p.width*k,p.height*k);x.fillStyle='#00000066';x.fillRect(0,0,L.W,L.H);return;}
  drawScene(cam);drawKeeper(cam);drawBall(cam);x.fillStyle='#000000a0';x.fillRect(0,0,L.W,L.H);}
 async function menu(){return new Promise(res=>{phase='menu';menuDraw=()=>{drawTitleBg();const W=L.W,H=L.H,bw=Math.min(W*.8,340),bh=clamp(H*.085,46,64),cx=W/2-bw/2;
   drawLogo(W/2,L.top+H*.17,Math.min(W*.86,520));let y=H*.38;
   button('so','SHOOTOUT',cx,y,bw,bh,()=>res({m:'shootout'}),{hot:true,sub:`vs ${M.names[1]} · 5 kicks each`});y+=bh*1.22;
   const reached=Math.max(1,save.reached||1);
   button('ch','CHALLENGE',cx,y,bw,bh,()=>res({m:'challenge',from:1}),{sub:`Targets, walls, wind · ${Object.values(save.stars||{}).reduce((a,b)=>a+b,0)} ★`});y+=bh*1.22;
   if(reached>1){button('cc',`CONTINUE · LEVEL ${reached}`,cx,y,bw,bh*.8,()=>res({m:'challenge',from:reached}));y+=bh;}
   button('tn','TOURNAMENT',cx,y,bw,bh,()=>res({m:'tournament'}),{sub:`Win 3 knockout shootouts${save.cups?` · ${save.cups} cup${save.cups>1?'s':''}`:''}`});y+=bh*1.3;
   label(x,'Swipe the ball to shoot · swipe in the goal to dive',W/2,Math.min(H-24,y+10),clamp(W*.03,10,15),{fill:'#cde'});};});}
 let menuDraw=null,card=null;
 function showCard(spec){return new Promise(res=>{card={...spec,done:res};phase='card';});}
 function drawCard(){const W=L.W,H=L.H,w=Math.min(W*.88,420),h=Math.min(H*.7,card.h||380),cx=(W-w)/2,cy=(H-h)/2;x.fillStyle='#000000b8';x.fillRect(0,0,W,H);
  x.fillStyle='#0b1628';rr(x,cx,cy,w,h,16);x.fill();x.strokeStyle='#4f8fff';x.lineWidth=2;x.stroke();const fs=clamp(w*.075,18,30);
  if(card.trophy){const t=PS.picture('trophy');if(t){const th=h*.34,tw=th*t.width/t.height;x.drawImage(t,W/2-tw/2,cy+h*.04,tw,th);}else{label(x,'🏆',W/2,cy+h*.2,h*.2);}}
  label(x,card.title,W/2,cy+h*(card.trophy?.44:.14),fs,{fill:card.color||'#ffd23f'});(card.lines||[]).forEach((l,i)=>label(x,l,W/2,cy+h*(card.trophy?.53:.27)+i*fs*.95,fs*.55,{fill:'#e6eefc'}));
  if(card.stars!=null){label(x,'★'.repeat(card.stars)+'☆'.repeat(3-card.stars),W/2,cy+h*.6,fs*1.4,{fill:'#ffd23f'});}
  if(card.face!=null)faceAt(card.face,W/2,cy+h*.62,h*.17,card.mood||'happy');
  const bb=card.buttons||[['OK','ok']],bh=clamp(h*.12,40,56),bw=(w-30-(bb.length-1)*10)/bb.length;bb.forEach(([t,id],i)=>button(id,t,cx+15+i*(bw+10),cy+h-bh-14,bw,bh,()=>{const d=card.done;card=null;d(id);},{hot:i===0}));}
 // ---------------------------------------------------------------- game loops
 function passNow(){return level.need.targets?lvTargets>=level.need.targets:lvGoals>=level.need.goals;}
 async function playKicks(done){// runs kicks until done() says stop
  while(s.alive){resetKick();if(mode==='challenge'){}const r=await new Promise(res=>{kickDone=res;});if(!s.alive)return;if(done())return;}}
 let kickDone=null;
 async function runShootout(opp){// opp: {name, faces:[ids], skill}
  M.goals=[0,0];M.taken=[0,0];M.hist=[[],[]];M.kicker=0;M.faces=[null,null];M.teamName=null;
  if(opp){M.teamName=opp.name;M.faces[1]=opp.faces[0];skill=opp.skill;}
  setScene({D:11});await playKicks(()=>{if(opp&&opp.faces.length)M.faces[1]=opp.faces[(M.taken[0]+M.taken[1])%opp.faces.length];
   if(decided()||M.taken[0]>=14&&M.taken[1]>=14)return true;M.kicker=M.taken[0]>M.taken[1]?1:0;return false;});}
 // ---------------------------------------------------------------- frame
 let tick=0;
 s.frame(dt=>{dt=Math.min(dt,.05);layout();buttons=[];tick+=dt;
  x.save();if(camShake>0){camShake-=dt;x.translate((Math.random()-.5)*12*camShake,(Math.random()-.5)*12*camShake);}
  if(phase==='menu'){menuDraw?.();x.restore();return;}
  // crowd murmur
  crowdT-=dt;if(crowdT<=0){crowdT=1.5;if(phase!=='card')snd.murmur();}
  const ts=keeperPerson()&&keeperOn?.62:1,slowK=slow>0?.35:1;slow=Math.max(0,slow-dt);
  if(phase==='aim'){cpuStrike(dt);botStep(dt);if(moveAmp)kp.x=Math.sin(tick*1.3)*moveAmp;}
  if(phase==='run'){striker.t+=dt;const u=striker.t/striker.run;striker.pose=u<.3?'run1':u<.55?'run2':u<.8?'run3':'plant';cpuKeeper(dt);botStep(dt);if(striker.t>=striker.run){striker.pose='strike';launch();}}
  if(phase==='fly'||phase==='result'&&!ball.caught&&ball.t<6){const gdt=dt*ts*slowK;if(phase==='fly'){cpuKeeper(gdt);botStep(dt);}
   let left=gdt;while(left>1e-6){const h=Math.min(1/240,left);stepBall(h);left-=h;}
   if(kp.dive)kp.dive.t+=gdt;for(const w of wall)if(w.jump>0)w.jump+=gdt;
   if(phase==='fly'){striker.pose=ball.t<.25?'strike':'follow';rec.push({p:[...ball.p],sp:ball.spin,kd:kp.dive?{...kp.dive}:null,kx:kp.x});
    if(isGoal(ball.res)&&!slow&&ball.p[2]>D-.5&&ball.p[2]<D+.4)slow=.45;
    const decidedNow=ball.res&&(ball.p[2]>D+.6||!isGoal(ball.res)&&ball.t>.25+(['wide','over'].includes(ball.res)?.15:0)),stuck=ball.t>4;
    if(decidedNow||stuck){if(on&&keeperSeat()!==me){if(pend.r){const r=pend.r;pend.r=null;finishKick(r);}else ball.t=Math.min(ball.t,6);}else finishKick();}}}
  if(kp.dive&&phase!=='fly'&&phase!=='result')kp.dive.t+=dt*ts;
  if(netHit)netHit.t+=dt;
  if(phase==='result'){msgT-=dt;if(result.goal&&msgT<1.2)striker.pose=mode==='challenge'||human(M.kicker)||!on?'cheer':'follow';
   if(msgT<=0){if(result.goal&&rec.length>8&&!on){phase='replay';replay={t:0,len:Math.min(2.6,rec.length/60/.4)};}else{phase='next';kickDone?.();}}}
  if(phase==='replay'){replay.t+=dt;if(replay.t>=replay.len){phase='next';kickDone?.();}}
  // draw
  if(phase==='replay'){const i=Math.min(rec.length-1,Math.floor(replay.t*.4*60)),fr=rec[i],cm={x:fr.p[0]*.4+bx0*.2,y:1.25,z:D-7.5};
   const sv={kd:kp.dive,kx:kp.x};kp.dive=fr.kd;kp.x=fr.kx;const nh=netHit;netHit=null;
   drawScene(cm);drawTargets(cm);if(fr.p[2]<D-KZ){drawKeeper(cm);drawBall(cm,fr.p,fr.sp);}else{drawBall(cm,fr.p,fr.sp);drawKeeper(cm);}
   kp.dive=sv.kd;kp.x=sv.kx;netHit=nh;x.fillStyle='#000';x.fillRect(0,0,L.W,L.H*.06);x.fillRect(0,L.H*.94,L.W,L.H*.06);
   const fs=clamp(L.W*.04,12,20);x.fillStyle=Math.floor(tick*2)%2?'#ff3b30':'#ff3b3044';x.beginPath();x.arc(L.W-fs*5.6,L.top+fs*1.2,fs*.4,0,7);x.fill();label(x,'REPLAY',L.W-fs*.8,L.top+fs*1.2,fs,{align:'right'});
   label(x,'tap to skip',L.W/2,L.H*.97,fs*.6,{fill:'#aaa'});}
  else if(phase!=='card'||!card?.noScene){drawScene(cam);drawTargets(cam);
   const items=[[D-KZ,()=>drawKeeper(cam)],[ball?ball.p[2]:0,()=>drawBall(cam)]];if(wall.length)items.push([wall[0].z,()=>drawWall(cam)]);items.sort((a,b)=>b[0]-a[0]).forEach(i=>i[1]());
   drawStriker(cam);drawAim();drawHUD();drawBanner(dt);
   if(flash>0){flash-=dt;x.fillStyle=`rgba(255,255,255,${flash*.5})`;x.fillRect(0,0,L.W,L.H);}
   // whose role, bottom
   if(phase==='aim'&&!on&&strikerHuman()&&keeperHuman()){const fs=clamp(L.W*.03,10,15);label(x,`▲ ${M.names[keeperSeat()]}: swipe in the goal to dive`,L.W/2,P(0,BAR,D)[1]-fs*1.2,fs,{fill:'#ff9fc6'});label(x,`${M.names[M.kicker]}: swipe the ball ▼`,L.W/2,L.H-fs*1.4,fs,{fill:'#8ec5ff'});}
   if(on&&phase==='fly'&&keeperSeat()!==me&&ball.res&&!pend.r){label(x,'…',L.W/2,L.H*.5,20);}}
  if(phase==='card'&&card)drawCard();
  x.restore();
  s.status?.(mode==='challenge'?`Level ${level?.n} · ${lvScore} pts`:`${M.names[M.kicker]} shoots · ${M.names[keeperSeat()]} keeps`);});
 // ---------------------------------------------------------------- debug (tests)
 s.debug={engine:'penalty',get phase(){return phase;},get mode(){return mode;},get ball(){return ball;},get keeper(){return kp;},get M(){return M;},get level(){return level;},get L(){return L;},
  shoot:(tx,ty,p=.8,cv=0)=>shoot(tx,ty,p,cv),dive:(tx,ty)=>dive(tx,ty),press:id=>{const b=buttons.find(b=>b.id===id);b?.go();},
  get buttons(){return buttons.map(b=>b.id);},proj:(X,Y,Z)=>P(X,Y,Z),skip:()=>{if(phase==='result')msgT=0;if(phase==='replay')replay.t=replay.len;if(card){const d=card.done,id=(card.buttons||[['OK','ok']])[0][1];card=null;d(id);}},
  bot:on?()=>{if(bot)return '';bot=true;return 'drive';}:null,set auto(v){autoAll=!!v;}};
 let autoAll=false;
 // autopilot for tests: plays every human role
 const autoTimer=setInterval(()=>{if(!autoAll||!s.alive)return;if(phase==='aim'&&strikerHuman()){const sd=Math.random()<.5?-1:1;shoot(bx0*.0+sd*(1+Math.random()*2.2),.3+Math.random()*1.8,.6+Math.random()*.5,(Math.random()-.5)*.5);}
  if(phase==='fly'&&keeperHuman()&&!kp.dive&&ball.t>.12){const p=ball.p,v=ball.v,t=(D-KZ-p[2])/Math.max(1,v[2]);dive(p[0]+v[0]*t+(Math.random()-.5)*1.6,p[1]+v[1]*t-.5*G*t*t);}
  if(phase==='result')msgT=Math.min(msgT,.05);if(phase==='replay')replay.t=replay.len;if(card){const d=card.done,id=(card.buttons||[['OK','ok']])[0][1];card=null;d(id);}},120);
 s.cleanup?.(()=>clearInterval(autoTimer));
 const nf=on?netField(s,{pack:()=>({}),unpack:()=>{},onEvent:e=>{
  if(Array.isArray(e?.k))remoteKick(e.k);else if(Array.isArray(e?.d))remoteDive(e.d);
  else if(Array.isArray(e?.r)){const [n,r]=e.r;if(n===kickNo()&&typeof r==='string')pend.r=r;}}}):null;
 // ---------------------------------------------------------------- start
 s.hint('Swipe the ball at the goal: the swipe\'s angle aims, a longer swipe lifts it, a faster swipe hits it harder (too hard flies over), a curved swipe bends it. In goal: swipe or tap the way you dive. 2 players on one phone: the striker swipes from the bottom, the keeper swipes in the goal. Keys: arrows/WASD aim + space shoots; keeper ←/→/↑/↓.');
 layout();setScene({D:11});resetKick();phase='menu';
 // the art is fetched the first time the game opens: wait for it (max 6 s) so the first round isn't played on the drawn stand-ins
 await PS.ready([...Object.keys(PS.SHEETS),...Object.keys(PS.PICTURES)],6000);if(!s.alive)return;
 if(solo1){const pick=await menu();if(!s.alive)return;mode=pick.m;if(mode!=='shootout')s.solo.kind='levels';
  if(mode==='challenge')return challenge(pick.from);if(mode==='tournament')return tournament();}
 else if(!on&&!cpuGame){phase='wait';if(!await s.pass(0,`Both of you hold the phone. ${M.names[0]} shoots first: swipe the ball at the goal from the bottom. The keeper swipes (or taps) in the goal to dive. ${M.kicks} kicks each, then sudden death.`,'Both ready',{countdown:3}))return;}
 if(on){phase='sync';await nf.start('go');if(!s.alive)return;}
 mode='shootout';await runShootout(null);if(!s.alive)return;
 const g=M.goals,tie=g[0]===g[1];
 s.finish([...g],tie?`Penalties end level ${g[0]}–${g[1]}.`:`${M.names[g[0]>g[1]?0:1]} wins the shootout ${Math.max(...g)}–${Math.min(...g)}.`);
 // ---------------------------------------------------------------- CHALLENGE
 async function challenge(from){mode='challenge';let n=from;total=0;cleared=0;retries=2;
  const T=teams();
  while(s.alive){level=levelDef(n);const tm=T.length?T[(n*7+3)%T.length]:null;level.cast=tm?tm.cast:[];M.faces[1]=tm?tm.cast[n%tm.cast.length]:null;setScene(level);skill=level.skill;lvScore=0;lvGoals=0;lvTargets=0;lvShot=0;
   await showCard({title:`LEVEL ${n}`,lines:[level.title,level.sub,level.wind?`Wind ${Math.abs(level.wind).toFixed(1)} ${level.wind>0?'→':'←'}`:'',level.wall?`Wall of ${level.wall} at 9.15 m`:''].filter(Boolean),buttons:[['KICK OFF','go']],h:300});if(!s.alive)return;
   await playKicks(()=>lvShot>=level.shots||(level.need.goals&&lvGoals+(level.shots-lvShot)<level.need.goals&&!level.need.targets));if(!s.alive)return;
   const pass=passNow(),stars=!pass?0:lvScore>=level.star[1]?3:lvScore>=level.star[0]?2:1;
   if(pass){if(lvGoals===level.shots){lvScore+=300;}total+=lvScore;cleared++;const st=save.stars||{};st[n]=Math.max(st[n]||0,stars);keep({stars:st,reached:Math.max(save.reached||1,n+1),best:Math.max(save.best||0,total)});
    soloProgress(s,total,cleared,`Penalty Challenge · level ${n} cleared · ${total}`);
    const r=await showCard({title:'LEVEL CLEARED!',stars,lines:[`${lvGoals} goals · ${lvScore} pts${lvGoals===level.shots?' (+300 perfect)':''}`,`Total ${total}`],buttons:[['NEXT LEVEL','next'],['FINISH','stop']],h:320});if(r==='stop'||!s.alive)break;n++;}
   else{const r=await showCard({title:'LEVEL FAILED',color:'#ff6b6b',lines:[level.need.targets?`${lvTargets}/${level.need.targets} targets`:`${lvGoals}/${level.need.goals} goals needed`,retries?`${retries} retr${retries>1?'ies':'y'} left`:'No retries left'],buttons:retries?[['RETRY','retry'],['FINISH','stop']]:[['FINISH','stop']],h:280});
    if(r==='retry'&&s.alive){retries--;continue;}break;}}
  if(!s.alive)return;keep({best:Math.max(save.best||0,total)});
  soloFinish(s,total,cleared,`Penalty Challenge · ${cleared} level${cleared===1?'':'s'} · ${total} points`,cleared>=1);}
 // ---------------------------------------------------------------- TOURNAMENT
 async function tournament(){mode='shootout';const T=teams(),r=seededRandom((s.seed||'pk')+':pk-cup'),pool=[...T];const picks=[];
  while(picks.length<3&&pool.length)picks.push(pool.splice(Math.floor(r()*pool.length),1)[0]);
  while(picks.length<3)picks.push({id:'x'+picks.length,name:['Paddy\'s Pub XI','Dunder Mifflin FC','Shiva Bowl Select'][picks.length],cast:[]});
  const rounds=['QUARTER-FINAL','SEMI-FINAL','FINAL'];let won=0,scored=0;
  let locked=[];try{const rw=require('src/rewards.js');locked=rw.gameRecruitPool(s.game,store.profile,s.players[0]).map(c=>c.id);}catch{}
  for(let i=0;i<3&&s.alive;i++){const t=picks[i],faces=[...t.cast].sort(()=>r()-.5).slice(0,6);
   const rs=await showCard({title:rounds[i],lines:[`vs ${t.name}`,t.source?`(${t.source})`:'',`Keeper: ${faces.length?nameOf(faces[0]):'their No. 1'}`],face:faces[0]??null,mood:'angry',buttons:[['PLAY','go']],h:360});if(!s.alive)return;void rs;
   await runShootout({name:t.name,faces,skill:clamp(skillBase*.6+.25+i*.14,.2,.95)});if(!s.alive)return;scored+=M.goals[0];
   const win=M.goals[0]>M.goals[1];soloProgress(s,scored+won*500+(win?500:0),won+(win?1:0),`Tournament · ${rounds[i]} ${win?'won':'lost'}`);
   if(!win){await showCard({title:'KNOCKED OUT',color:'#ff6b6b',lines:[`${rounds[i]} · ${M.goals[0]}–${M.goals[1]}`,`vs ${t.name}`],buttons:[['FINISH','ok']],h:260});break;}
   won++;if(i<2)await showCard({title:'THROUGH!',lines:[`${M.goals[0]}–${M.goals[1]} vs ${t.name}`,`Next: ${rounds[i+1]}`],buttons:[['NEXT','ok']],h:260});
   else{const rec=t.cast.find(id=>locked.includes(id))||locked[0]||null;if(rec&&!s.gameRecruits[0].includes(rec))s.gameRecruits[0].push(rec);keep({cups:(save.cups||0)+1});snd.cheer();
    await showCard({title:'CHAMPIONS!',trophy:true,lines:[`You won the cup vs ${t.name}!`,rec?`${nameOf(rec)} joins you!`:''],face:rec,buttons:[['LIFT IT','ok']],h:420});}}
  if(!s.alive)return;soloFinish(s,scored+won*500,won,`Penalty Tournament · ${won===3?'CHAMPIONS':won?`out in the ${rounds[won]}`:'out in the quarter-final'}`,won===3);}
 function nameOf(id){try{return require("src/characters.js").CHARACTERS.find(c=>c.id===id)?.name||id;}catch{return id;}}
}
Object.assign(exports,{penalty,levelDef});
