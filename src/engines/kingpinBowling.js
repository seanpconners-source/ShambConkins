// KINGPIN BOWLING (owner, Nov 21: "the best bowling game ever... Kingpin and Lebowski themed... fun animations when players
// get gutter balls, strikes, turkeys, like on a real alley's score screen... upgrade the alley one thing at a time from a 70s
// dump to a sleek modern alley, then a space alley"). Ids kingpin-bowling and lebowski-bowling (engine 'bowling').
// 3D alley (bowl/gl.js + bowl/scene.js), real ball physics on an oil pattern with cannon-es pins (bowl/physics.js), ten-pin
// rules with splits and streak names (bowl/rules.js), a CPU bowler (bowl/cpu.js), overhead-monitor animations and score
// sheet (bowl/screens.js), the alley/pro shop (src/data/bowlAlley.js, saved in profile.bowlAlley; shop UI bowl/shop.js).
// CONTROLS (like the top mobile bowling games): drag the ball sideways to pick your spot on the approach, drag on the lane to
// move the aim arrow, then SWIPE UP from the ball: swipe speed = ball speed, swipe direction nudges the aim, and CURVE your
// swipe to hook it (curve left = hook left). Swipe too hard and you step over the line: "MARK IT ZERO!".
// Players alternate frames like a real league. Online (s.online): the bowler's phone sends the throw {th} (both phones roll the
// same physics from it) and then its exact pins {fin}; aim moves stream {aim}; seat 0 sends the alley {setup}.
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const {vibrate}=require("src/audio.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {voice,noise}=require("src/engines/tarantinoKit.js");
const {isCpu,isOnline,cpuSkill}=require("src/engines/cpuKit.js");
const {mul}=require("src/engines/trun/skel.js");
const PH=require("src/engines/bowl/physics.js");
const RU=require("src/engines/bowl/rules.js");
const CPU=require("src/engines/bowl/cpu.js");
const GLm=require("src/engines/bowl/gl.js");
const SC=require("src/engines/bowl/scene.js");
const SCR=require("src/engines/bowl/screens.js");
const AL=require("src/data/bowlAlley.js");
const SP=require("src/data/bowlSprites.js");
const HF=require("src/headFacts.js");
const FLIP=new Float32Array([-1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const STANCE_Z=-.9,MAX_REVS=470,FOUL_P=1.38;
// rivals the CPU plays as (Kingpin + Lebowski), by CPU level: style and ball
const CPU_BALL={easy:'house',normal:'munson',hard:'jesus'};
const CHEERS={strike:['That\'s a strike, Dude!','Yeah! Lord of the lanes!','You\'re on a gravy train with biscuit wheels!','Big Ern would be jealous.'],
 gutter:['Munsoned!','Nice marmot. I mean, roll.','That\'s a bummer, man.','You got Munsoned, buddy.'],
 foul:['Over the line! Mark it zero!','This is not \'Nam. This is bowling. There are rules.','Mark it zero, Smokey!'],
 split:['Ooh, that\'s a nasty leave.','Bedposts? Pray, man.','The ball zigged, the pins zagged.'],
 spare:['Nice pickup.','That\'s what I\'m talking about!','The Dude abides.'],
 turkey:['TURKEY! Gobble gobble!','Three in a row! Somebody call Reno!']};
async function kingpinBowling(s){
 const [c]=s.canvas(390,720,{fill:true});s.body.classList.add('drag-arena-body');const fb=fullBleed(s,{bg:'#050403'});s.controls?.([]);
 const frame=c.parentElement;frame.style.position='relative';c.style.touchAction='none';
 const mkc=()=>{const e=document.createElement('canvas');e.style.cssText='position:absolute;pointer-events:none;left:0;top:0';frame.appendChild(e);return e;};
 const glc=mkc(),hud=mkc(),hx=hud.getContext('2d');
 let G=null;try{G=GLm.createGL(glc);}catch(e){console.warn('bowling gl',e);G=null;}
 if(!G){await s.pass(0,'Kingpin Bowling needs WebGL 2 (3D graphics), which this browser has turned off. The game is skipped as a tie.','OK');s.finish([0,0],'Kingpin Bowling could not start: WebGL 2 is unavailable.');return;}
 s.cleanup(()=>{try{scene.destroy();G.destroy();}catch{}glc.remove();hud.remove();});
 const net=isOnline(s)?s.online:null,me=net?net.me:0,cpu=isCpu(s);if(net)s.hotseat=true;
 const arcade=s.origin==='arcade'&&!net&&!s.solo?.duel,board=s.origin==='board';
 const P=store.profile;if(P)P.bowlAlley=AL.validAlley(P.bowlAlley);
 const alley=P?.bowlAlley||AL.freshAlley();
 const save=()=>{if(P){P.bowlAlley=alley;try{saveProfile(P);}catch{}}};
 const scene=SC.createScene(G);
 const level=s.solo?.level||'normal';
 // ---------------------------------------------------------------- players
 const NP=Math.max(1,Math.min(2,s.players.length||2));
 const PL=[];for(let i=0;i<NP;i++){const p=s.players[i]||{};PL.push({i,name:p.name||('Player '+(i+1)),cpu:cpu&&i===1,remote:!!net&&i!==me,hand:1,stanceB:15,aimB:10,
  ballId:cpu&&i===1?CPU_BALL[level]||'munson':alley.ball,shoes:cpu&&i===1?'pro':alley.shoes,game:null,evs:[],face:null});}
 const nameOf=i=>PL[i]?.name||'Player';
 const spareBall=i=>!net&&!PL[i].cpu&&AL.hasPerk(alley,'spare-ball')&&S.pins&&S.pins.filter(q=>q.show!==false).length<10;
 const ballOf=i=>spareBall(i)?AL.BALLS[0]:AL.byId(AL.BALLS,PL[i].ballId)||AL.BALLS[0];
 const shoesOf=i=>AL.byId(AL.SHOES,PL[i].shoes)||AL.SHOES[0];
 // faces for the score sheets
 const faceCanvas=i=>{if(PL[i].face)return PL[i].face;const cv=document.createElement('canvas');cv.width=cv.height=96;try{HF.drawFace(s,cv.getContext('2d'),i,48,52,84,'normal',1,.62);}catch{}PL[i].face=cv;return cv;};
 // ---------------------------------------------------------------- sound
 let lastClack=0,rollT=0;
 const sfx={
  ball(v){const k=Math.min(1,v/7);voice(1700+Math.random()*500,.05,.2*k+.05,'triangle');noise(.14,.35*k+.08,{type:'bandpass',f0:2200,q:.9});voice(105,.16,.2*k,'sine',{slide:.6});},
  pin(v){const now=performance.now();if(now-lastClack<18)return;lastClack=now;const k=Math.min(1,v/5);if(k<.05)return;voice(2100+Math.random()*900,.035,.1*k+.02,'triangle');noise(.04,.12*k,{type:'highpass',f0:2400});},
  deck(v){const k=Math.min(1,v/4);noise(.07,.1*k+.02,{type:'bandpass',f0:850,q:1.2});voice(280+Math.random()*60,.06,.05*k,'sine');},
  wall(v){const k=Math.min(1,v/4);noise(.09,.12*k,{type:'lowpass',f0:500});},
  roll(sp,gutter){if(!Number.isFinite(sp))return;const k=Math.min(1,sp/9);noise(.09,(gutter?.07:.045)*k+.01,{type:'lowpass',f0:gutter?260:180+k*120});},
  release(){noise(.08,.1,{type:'lowpass',f0:400});voice(80,.1,.12,'sine',{slide:.7});},
  cheer(big){noise(big?1.4:.8,big?.14:.08,{type:'bandpass',f0:1100,f1:700,q:.6});for(let i=0;i<(big?7:4);i++)voice(240+Math.random()*260,.3,.03,'sawtooth',{delay:Math.random()*.5,slide:1.25,lp:1300});},
  aww(){for(let i=0;i<4;i++)voice(260+Math.random()*60,.7,.035,'sawtooth',{delay:Math.random()*.15,slide:.6,lp:900});},
  sweep(){noise(.25,.06,{type:'lowpass',f0:300});voice(70,.3,.06,'square',{lp:250,slide:.8});},
  thunk(){voice(90,.12,.1,'sine',{slide:.5});noise(.05,.06,{type:'lowpass',f0:600,delay:.05});},
  tap(){voice(1300,.03,.04,'sine');vibrate(6);},
  buzz(){voice(130,.4,.08,'square',{lp:900});voice(97,.4,.06,'square',{lp:900,delay:.02});},
 };
 // ---------------------------------------------------------------- alley look + lane
 let look=null,frames=board?3:arcade?alley.set.frames:(alley.set.frames||10);
 const eraOf=k=>AL.ERAS[alley.parts[k]].id;
 const makeLook=(parts,ballId)=>({room:AL.ERAS[parts.room].id,lanes:AL.ERAS[parts.lanes].id,masking:AL.ERAS[parts.masking].id,screens:AL.ERAS[parts.screens].id,lights:AL.ERAS[parts.lights].id,pins:AL.ERAS[parts.pins].id,ball:AL.byId(AL.BALLS,ballId)||AL.BALLS[0]});
 let parts={...alley.parts};
 const decorIds=()=>net?[]:AL.loadout(alley).decor;
 let lanesPlayed=0;
 const laneNow=()=>{const base=AL.PARTS.lanes.cond[parts.lanes],wear=AL.hasPerk(alley,'oil-man')&&!net?0:Math.min(1,lanesPlayed/40);
  return PH.makeLane({...base,len:base.len-wear*1.1,mid:base.mid+wear*.006});};
 // ---------------------------------------------------------------- state
 const S={phase:'load',cur:0,t:0,pins:null,roll:null,ballShow:null,cam:null,anim:null,animEnd:0,sweep:null,banner:null,toast:null,trail:[],
  aimHint:!alley.set.seen&&!net,aimLine:alley.set.guide!==false,throwInfo:null,summary:null,cash:null,remoteAim:null,throwT:0};
 const rack=()=>PH.rack().map(p=>({n:p.n,x:p.x,z:p.z,q:[0,0,0,1],y:0}));
 S.pins=rack();
 // ---------------------------------------------------------------- layout + camera
 let W=0,H=0,dpr=1;
 function resize(){const r=frame.getBoundingClientRect();const w=Math.max(200,Math.round(r.width)),h=Math.max(200,Math.round(r.height));dpr=Math.min(2,window.devicePixelRatio||1);
  if(w!==W||h!==H){W=w;H=h;for(const e of [glc,hud]){e.style.width=W+'px';e.style.height=H+'px';}hud.width=Math.round(W*dpr);hud.height=Math.round(H*dpr);}}
 const tall=()=>H>W*1.05;
 const sheetH=()=>Math.round(Math.min(tall()?74:62,H*.14));
 function camFor(ph,ball){const T=tall(),bx=ball?ball.x:PL[S.cur].stanceX??0,ax=aimX();
  if(ph==='shop'||ph==='load'||ph==='summary'){const a=S.t*.12;return {eye:[Math.sin(a)*.9,T?1.6:1.5,T?-2.6:-3.2],tgt:[Math.sin(a)*.25,.25,PH.Z1],fov:T?44:40,lift:T&&ph==='shop'?.5:0};}
  if(ph==='intro'){const u=Math.min(1,(S.t-(S.introT||0))/2.4),e=u*u*(3-2*u);return {eye:[0,.5+e*1.25,PH.Z1-2.4-e*(PH.Z1+1.2)],tgt:[0,.2,PH.Z1+.4+e*8],fov:T?55:40};}
  if(ph==='aim'||ph==='throw'){return {eye:[bx*.55,T?1.32:1.2,T?-3.35:-3.1],tgt:[bx*.2+ax*.25,0,T?7:9],fov:T?60:42};}
  if(ph==='roll'&&ball){const z=ball.z,k=Math.max(0,Math.min(1,(z-(PH.Z1-7.5))/3.5));
   const e0=[ball.x*.6,1.15,Math.max(-3,z-3.3)],t0=[ball.x*.4,.05,z+8],e1=[0,.62,PH.Z1-3],t1=[0,.15,PH.Z1+.7];
   const l=(a,b)=>a.map((v,i)=>v+(b[i]-v)*k*k*(3-2*k));return {eye:l(e0,e1),tgt:l(t0,t1),fov:T?50:36};}
  return {eye:[0,.62,PH.Z1-3],tgt:[0,.15,PH.Z1+.7],fov:T?50:36};}
 const aimX=()=>PH.boardX(PL[S.cur]?.aimB??10);
 let camS=null;
 function camera(dt){const ballP=S.ballShow&&S.ballShow.show?S.ballShow:null;const want=camFor(S.replay||S.phase==='pins'||S.phase==='sweep'||S.phase==='anim'?'pins':S.phase,ballP);
  if(!camS)camS={eye:[...want.eye],tgt:[...want.tgt],fov:want.fov};
  const k=S.phase==='roll'?1-Math.exp(-dt*9):1-Math.exp(-dt*4.5);
  for(let i=0;i<3;i++){camS.eye[i]+=(want.eye[i]-camS.eye[i])*k;camS.tgt[i]+=(want.tgt[i]-camS.tgt[i])*k;}camS.fov+=(want.fov-camS.fov)*k;camS.lift=(camS.lift||0)+((want.lift||0)-(camS.lift||0))*k;
  const view=mul(FLIP,GLm.lookAt(camS.eye,camS.tgt),new Float32Array(16));const proj=GLm.perspective(camS.fov*Math.PI/180,W/H,.05,90);if(camS.lift)proj[9]=-camS.lift;// off-centre: the picture sits higher (the shop panel covers the bottom)
  return {view,proj,eye:camS.eye};}
 // ---------------------------------------------------------------- monitors
 const scr=document.createElement('canvas');scr.width=SCR.BW;scr.height=SCR.BH;const sx=scr.getContext('2d');
 const scr2=document.createElement('canvas');scr2.width=SCR.BW;scr2.height=SCR.BH;
 let sheetDirty=true;
 function sheetPlayers(){return PL.map((p,i)=>({name:p.name+(p.cpu?' (CPU)':''),rows:p.game?RU.sheet(p.game):[],total:p.game?RU.total(p.game):0,active:i===S.cur,face:faceCanvas(i)}));}
 function paintMonitor(){if(S.anim){S.anim.draw(sx,S.t-S.anim.t0);scene.setScreen(scr);return;}
  if(!sheetDirty)return;sheetDirty=false;SCR.drawSheet(sx,look.screens,sheetPlayers(),{frames,title:AL.ERAS[parts.room].name.toUpperCase()+' · LANE 14'});scene.setScreen(scr);}
 // ---------------------------------------------------------------- waiting helpers
 const until=f=>new Promise(r=>{const go=()=>{if(!s.alive||f())return r();setTimeout(go,30);};go();});
 const sleep=ms=>until((t0=>()=>performance.now()-t0>=ms)(performance.now()));
 let skipReq=false;
 // ---------------------------------------------------------------- online
 const inbox=[];
 if(net)void (async()=>{for(;;){const m=await net.next();if(!m||!s.alive){S.netGone=true;return;}inbox.push(m);}})();
 const take=key=>{const i=inbox.findIndex(m=>m&&m[key]!==undefined);if(i<0)return undefined;return inbox.splice(i,1)[0][key];};
 const waitMsg=async(key,ms=1e9)=>{const t0=performance.now();let v;await until(()=>(v=take(key))!==undefined||S.netGone||performance.now()-t0>ms);return v;};
 // ---------------------------------------------------------------- input
 const sw={id:null,pts:[],mode:null,x0:0,y0:0,stance0:0,aim0:0};
 let throwRes=null;// resolver for the human's throw
 let botFlag=false;const auto=()=>s.debug.bot===true||botFlag;// tests: d.bot=true, or online-native calls d.bot()
 const myTurn=()=>S.phase==='aim'&&!PL[S.cur].cpu&&!PL[S.cur].remote&&!auto()&&!!throwRes;
 const ballScreen=()=>{const p=PL[S.cur];const q=G.project(p.stanceX,PH.BALL_R,STANCE_Z);return q?[q[0]/dpr,q[1]/dpr]:[W/2,H*.85];};
 const pxPerM=(z)=>{const a=G.project(0,0,z),b=G.project(.2,0,z);return a&&b?Math.abs(b[0]-a[0])/dpr/.2:200;};
 s.on(c,'pointerdown',e=>{if(S.phase==='summary'){summaryTap(e);return;}
  if(S.anim&&S.t-S.anim.t0>.6){skipReq=true;return;}
  if(S.phase==='intro'){skipReq=true;return;}
  if(!myTurn()||sw.id!=null)return;const r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  sw.id=e.pointerId;sw.pts=[{x,y,t:performance.now()}];sw.x0=x;sw.y0=y;const [bx,by]=ballScreen();
  sw.zone=y>Math.min(by-70,H*.62)||Math.hypot(x-bx,y-by)<80?'ball':'lane';sw.mode=null;const p=PL[S.cur];sw.stance0=p.stanceX;sw.aim0=p.aimB;try{c.setPointerCapture(e.pointerId);}catch{}});
 s.on(c,'pointermove',e=>{if(e.pointerId!==sw.id)return;const r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,p=PL[S.cur];sw.pts.push({x,y,t:performance.now()});if(sw.pts.length>80)sw.pts.splice(1,1);
  const dx=x-sw.x0,dy=y-sw.y0;
  if(!sw.mode){if(sw.zone==='ball'&&dy<-16&&-dy>Math.abs(dx)*.7)sw.mode='throw';else if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.2)sw.mode=sw.zone==='ball'?'stance':'aim';else if(sw.zone==='lane'&&Math.abs(dy)>14)sw.mode='aim';}
  if(sw.mode==='stance'){const m=pxPerM(STANCE_Z);p.stanceX=Math.max(-PH.HALF+.12,Math.min(PH.HALF-.12,sw.stance0+dx/m));p.stanceB=PH.xBoard(p.stanceX);netAim();}
  else if(sw.mode==='aim'){const m=pxPerM(PH.ARROWS_Z);p.aimB=Math.max(1,Math.min(39,sw.aim0-dx/m/PH.BOARD));netAim();}
  else if(sw.mode==='throw'){S.trail=sw.pts.slice();if(y<H*.2)release(e);}});
 const release=e=>{if(sw.mode==='throw'&&sw.pts.length>=3){const o=swipeToThrow(sw.pts);if(o&&throwRes){const r=throwRes;throwRes=null;r(o);}}
  sw.id=null;sw.mode=null;S.trail=[];try{c.releasePointerCapture(e.pointerId);}catch{}};
 s.on(c,'pointerup',e=>{if(e.pointerId===sw.id)release(e);});
 s.on(c,'pointercancel',e=>{if(e.pointerId===sw.id){sw.id=null;sw.mode=null;S.trail=[];}});
 // the swipe -> a release. speed from the last ~110 ms, direction from start->end, hook from how the path bends
 function swipeToThrow(pts){const a=pts[0],b=pts[pts.length-1],p=PL[S.cur];if(a.y-b.y<40)return null;
  let k=pts.length-1;while(k>0&&b.t-pts[k].t<110)k--;const q=pts[k],dt=Math.max(16,b.t-q.t)/1000,v=Math.hypot(b.x-q.x,b.y-q.y)/dt;
  const power=Math.max(.2,Math.min(1.6,v/(Math.min(W,H)*7)));// a brisk flick (~2,700 px/s on a 390 px phone) = full power
  const n=pts.length,i1=Math.max(1,Math.floor(n*.35)),i2=Math.min(n-2,Math.floor(n*.65));
  const d0=Math.atan2(pts[i1].x-a.x,a.y-pts[i1].y),d1=Math.atan2(b.x-pts[i2].x,pts[i2].y-b.y);let bend=d1-d0;// + = the path turns right
  const tot=Math.atan2(b.x-a.x,a.y-b.y);
  return makeRelease(p,power,tot,-bend);}
 // a release from the player's choices: power 0..1.45, dir (rad, + = swiped to the right), hook (+ = curve left)
 function makeRelease(p,power,dir,hookIn){const ball=ballOf(p.i),sh=shoesOf(p.i);
  const hk=Math.max(-1,Math.min(1,hookIn/.55));const hand=hk<-.08?-1:1,revs=Math.min(1,Math.abs(hk))*MAX_REVS*ball.revs;
  const x0=p.stanceX,xt=aimXOf(p),ang=Math.atan2(x0-xt,PH.ARROWS_Z)-dir*.06*(1-sh.steady*.6);
  const speed=5.4+Math.min(power,1.15)*4.2+sh.speed*10;
  return {x:x0,ang,speed,revs,axis:Math.abs(hk)>.08?38+Math.abs(hk)*20:0,hand,loft:.22,foul:power>FOUL_P};}
 const aimXOf=p=>PH.boardX(p.aimB);
 let aimSent=0;function netAim(){if(!net||PL[S.cur].remote)return;const now=performance.now();if(now-aimSent<120)return;aimSent=now;const p=PL[S.cur];net.send({aim:[+p.stanceX.toFixed(4),+p.aimB.toFixed(2)]});}
 // ---------------------------------------------------------------- the roll
 function runRoll(rel,pi,replayPins){S.lastRel=rel;const ball=ballOf(pi),spec=PH.ballSpec({lb:ball.lb,cover:ball.cover,rg:ball.rg});
  const pins=replayPins||S.pins.filter(p=>p.show!==false).map(p=>({n:p.n,x:p.x,z:p.z,qx:p.q[0],qy:p.q[1],qz:p.q[2],qw:p.q[3]}));S.rollPins=pins;if(replayPins)lanesPlayed--;
  const R=PH.makeRoll({lane:laneNow(),ball:spec,rel:PH.release(rel,spec),pins});S.roll=R;S.rollEvs=0;S.phase='roll';S.throwInfo={mph:rel.speed*2.237,rpm:Math.round(rel.revs),t:S.t};lanesPlayed++;
  return R;}
 // drive the roll each frame (real time; speed x for tests/bots)
 function stepRoll(dt){const R=S.roll;if(!R||R.done)return;const k=(s.debug.fast||1)*(S.replay?.33:1);R.advance(Math.min(.05,dt)*k);
  const bp=R.ballPose();S.ballShow={x:bp.x,y:bp.y||0,z:bp.z,q:bp.q,show:bp.z<PH.DECK_END+.25&&R.phase!=='settle'};
  if(R.phase==='lane'||R.phase==='gutter'){rollT+=dt;if(rollT>.08){rollT=0;sfx.roll(Math.hypot(R.ball.vx,R.ball.vz),R.phase==='gutter');}}
  if(R.ballBody&&S.phase==='roll')S.phase='pins';
  for(;S.rollEvs<R.events.length;S.rollEvs++){const e=R.events[S.rollEvs];if(e.k==='ball')sfx.ball(e.v);else if(e.k==='pin')sfx.pin(e.v);else if(e.k==='deck')sfx.deck(e.v);else if(e.k==='wall')sfx.wall(e.v);else if(e.k==='gutter'){sfx.thunk();}}
  const pp=R.pinPoses();for(let i=0;i<pp.length;i++){const q=pp[i],p=S.pins.find(z=>z.n===q.n);if(p){p.x=q.x;p.y=q.y;p.z=q.z;p.q=q.q;p.down=q.down;p.show=!q.gone&&q.z<PH.CURTAIN_Z;}}}
 // ---------------------------------------------------------------- the pinsetter: sweep the deadwood, re-rack
 async function sweep(full){S.phase='sweep';sfx.sweep();const t0=S.t,stand=S.pins.filter(p=>p.show!==false&&!p.down);
  const base=stand.map(p=>({p,y:p.y}));const D=1.5;S.sweep={on:true,y:.9,z:PH.Z1-.4};
  await until(()=>{const u=(S.t-t0)/D*(s.debug.fast||1);
   const lift=u<.15?u/.15:u<.75?1:Math.max(0,1-(u-.75)/.2);for(const b of base)b.p.y=b.y+lift*(full?0:.32);
   const yb=u<.15?.9-.86*(u/.15):u<.75?.04:.04+.86*Math.min(1,(u-.75)/.2),zb=u<.15?PH.Z1-.4:u<.5?PH.Z1-.4+(PH.DECK_END-PH.Z1+.6)*((u-.15)/.35):u<.75?PH.DECK_END+.2-(PH.DECK_END-PH.Z1+.6)*((u-.5)/.25):PH.Z1-.4;
   S.sweep.y=yb;S.sweep.z=zb;
   for(const p of S.pins)if(p.show!==false&&(p.down||full)&&!(stand.includes(p)&&!full)){if(p.z<zb+.05&&u>.15&&u<.5)p.z=Math.max(p.z,zb+.06);if(p.z>PH.DECK_END)p.show=false;}
   return u>=1;});
  S.sweep=null;
  if(full){S.pins=rack().map(p=>({...p,y:.4}));const t1=S.t;await until(()=>{const u=Math.min(1,(S.t-t1)/.5*(s.debug.fast||1));for(const p of S.pins)p.y=.4*(1-u);return u>=1;});sfx.thunk();}
  else S.pins=S.pins.filter(p=>p.show!==false&&!p.down).map(p=>({...p,y:0}));}
 // ---------------------------------------------------------------- one ball
 const pickAnim=(ev,frameBalls,pi)=>{const g=PL[pi].game;void g;
  if(ev.foul)return 'foul';
  if(ev.strike){const n=ev.streak||1;if(n>=12)return 'perfect';if(n>=5)return 'bagger';if(n===4)return 'hambone';if(n===3)return 'turkey';if(n===2)return 'double';return 'strike';}
  if(ev.spare){const prev=frameBalls[frameBalls.length-2];return prev&&prev.split?'pickup':'spare';}
  if(ev.gutter)return 'gutter';
  if(ev.split)return 'split';
  if(ev.standing.length===0)return null;
  return frameBalls.length>=2&&!ev.strike&&!ev.spare?'open':'count';};
 async function planThrow(p,pi){const standing=S.pins.filter(q=>q.show!==false).map(q=>({n:q.n,x:q.x,z:q.z}));
  let seed=(s.seed||'x').length*131+lanesPlayed*977+pi;const rand=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
  const who={style:p.cpu?(level==='hard'?'cranker':level==='easy'?'stroker':'hook'):'hook',hand:1,skill:p.cpu?Math.max(.05,Math.min(.97,cpuSkill(s))):.8};
  const o=CPU.plan({lane:laneNow(),ball:PH.ballSpec({lb:ballOf(pi).lb,cover:ballOf(pi).cover}),standing,who,rand});
  // walk the ball over and slide the arrow so you can see what it's doing
  const sx0=p.stanceX,ax0=p.aimB,t0=S.t,tb=Math.max(1,Math.min(39,PH.xBoard(o.x-Math.tan(o.ang)*PH.ARROWS_Z)));
  await until(()=>{const u=Math.min(1,(S.t-t0)/.7*(s.debug.fast||1));p.stanceX=sx0+(o.x-sx0)*u;p.aimB=ax0+(tb-ax0)*u;return u>=1;});
  return {...o,foul:false};}
 async function bowlBall(pi){const p=PL[pi];S.cur=pi;S.phase='aim';S.ballShow={x:p.stanceX,y:0,z:STANCE_Z,q:[0,0,0,1],show:true};sheetDirty=true;
  let rel=null;
  if(p.remote){S.remoteAim=null;while(!rel&&s.alive&&!S.netGone){const a=take('aim');if(a){p.stanceX=a[0];p.aimB=a[1];}const th=take('th');if(th){rel=th;break;}await sleep(40);}
   if(!rel){rel=makeRelease(p,.7,0,0);}}
  else if(p.cpu){await sleep(700);rel=await planThrow(p,pi);if(net)net.send({th:rel});}
  else{let got=null;throwRes=o=>{got=o;};await until(()=>got||auto());throwRes=null;if(!s.alive)return null;
   rel=got||await planThrow(p,pi);if(net)net.send({th:rel});}
  if(!s.alive)return null;
  if(p.i===0||!p.cpu){alley.set.seen=true;S.aimHint=false;}
  sfx.release();vibrate(12);
  const R=runRoll(rel,pi);
  await until(()=>R.done);if(!s.alive)return null;
  let res=R.result();
  if(net){if(!p.remote){net.send({fin:{s:res.standing.map(q=>[q.n,q.x,q.z,q.qx,q.qy,q.qz,q.qw]),g:res.gutter?1:0}});}
   else{const fin=await waitMsg('fin',20000);if(fin&&fin.s){res={...res,standing:fin.s.map(a=>({n:a[0],x:a[1],z:a[2],qx:a[3],qy:a[4],qz:a[5],qw:a[6]})),gutter:!!fin.g};
    for(const q of S.pins){const f=res.standing.find(z=>z.n===q.n);if(f){q.x=f.x;q.z=f.z;q.q=[f.qx,f.qy,f.qz,f.qw];q.down=false;q.show=true;q.y=0;}else q.down=true;}}}}
  const ev=RU.addBall(p.game,{standing:res.standing.map(q=>q.n),gutter:res.gutter,foul:!!rel.foul});p.evs.push(ev);sheetDirty=true;
  // the overhead monitor
  if(ev.strike&&AL.hasPerk(alley,'replay')&&!net&&!auto()&&!p.cpu){// slow-motion replay from the pin cam (the same roll again: physics is deterministic)
   const keep=S.pins.map(q=>({...q})),startPins=S.rollPins;S.pins=startPins.map(q=>({n:q.n,x:q.x,z:q.z,q:[q.qx??0,q.qy??0,q.qz??0,q.qw??1],y:0,show:true}));
   S.replay=true;S.banner={text:'REPLAY',sub:'SLOW MOTION',t:S.t};const R2=runRoll(rel,pi,startPins);S.phase='pins';skipReq=false;
   await until(()=>R2.done||skipReq);S.replay=false;S.banner=null;S.pins=keep;S.roll=null;}
  const f=p.game.frames[ev.frame].balls,kind=pickAnim(ev,f,pi);
  await sleep(250);
  if(kind){S.anim=SCR.createAnim(kind,look.screens,{name:p.name,n:ev.n,standing:ev.standing,leave:ev.leave,streakName:ev.streakName,seed:lanesPlayed});S.anim.t0=S.t;
   S.anim.big=kind!=='count'&&kind!=='open';skipReq=false;
   if(kind==='strike'||kind==='double'||kind==='turkey'||kind==='hambone'||kind==='bagger'||kind==='perfect'){sfx.cheer(kind!=='strike');vibrate([20,40,20]);}
   else if(kind==='spare'||kind==='pickup')sfx.cheer(false);else if(kind==='gutter')sfx.aww();else if(kind==='foul')sfx.buzz();
   const line=CHEERS[kind==='pickup'?'spare':kind==='double'||kind==='hambone'||kind==='bagger'?'strike':kind];if(line&&!net)S.toast={text:line[(lanesPlayed+pi)%line.length],t:S.t};
   const dur=S.anim.dur/(s.debug.fast||1);await until(()=>S.t-S.anim.t0>dur||skipReq);S.anim=null;sheetDirty=true;}
  const full=RU.frameDone(p.game,ev.frame)||RU.rackFor(p.game).length===10;
  await sweep(full);
  if(full)S.pins=rack();
  return ev;}
 // ---------------------------------------------------------------- intro + match
 async function intro(){S.phase='intro';const t0=S.t;S.introT=S.t;camS=null;skipReq=false;S.banner={text:AL.ERAS[parts.room].name.toUpperCase(),sub:frames+' FRAMES · '+PL.map(p=>p.name).join(' vs '),t:S.t};
  await until(()=>skipReq||S.t-t0>2.6/(s.debug.fast||1));S.banner=null;}
 function stanceDefault(p){p.stanceX=PH.boardX(p.hand>0?15:25);p.aimB=p.hand>0?10:30;}
 // ---------------------------------------------------------------- the frame loop
 S.t=0;let last=performance.now();
 s.frame(dt=>{S.t+=Math.min(.1,dt);resize();
  if(S.roll&&!S.roll.done)stepRoll(dt);
  if(!look)return;
  const cam=camera(dt);
  // the ball sits on the approach while aiming (and slides out on release)
  const p=PL[S.cur];if((S.phase==='aim')&&p)S.ballShow={x:p.stanceX,y:0,z:STANCE_Z,q:[0,0,0,1],show:true};
  paintMonitor();
  if(G.begin({w:Math.round(W*dpr),h:Math.round(H*dpr),...cam,...scene.frameOpts(S.t)}))scene.draw({pins:S.pins.map(q=>({...q,show:q.show!==false})),ball:S.ballShow,sweep:S.sweep,t:S.t});
  drawHud();});
 // ---------------------------------------------------------------- HUD
 function drawHud(){const x=hx;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
  const top=Math.max(4,(fb.top||0)>0&&W<520?fb.top+2:6),sh=sheetH(),pad=6;
  // score strip (left of the pills on wide screens, under them on phones)
  const sw0=W<520?W-pad*2:Math.min(W-pad*2-(fb.top?150:0),720);if(S.phase!=='shop'&&S.phase!=='load')drawStrip(x,pad,top,sw0,sh);
  // aim guides
  if(S.phase==='aim'){const p=PL[S.cur];const b=G.project(p.stanceX,PH.BALL_R,STANCE_Z),t=G.project(aimXOf(p),0,PH.ARROWS_Z);
   if(b&&t){const bx=b[0]/dpr,by=b[1]/dpr,tx=t[0]/dpr,ty=t[1]/dpr;
    if(S.aimLine){x.setLineDash([6,8]);x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=2;x.beginPath();x.moveTo(bx,by);x.lineTo(tx,ty);x.stroke();x.setLineDash([]);}
    x.fillStyle='#ffd23f';x.strokeStyle='#000';x.lineWidth=2;x.beginPath();x.moveTo(tx,ty-16);x.lineTo(tx+11,ty+6);x.lineTo(tx-11,ty+6);x.closePath();x.fill();x.stroke();
    x.font='700 12px system-ui,sans-serif';x.textAlign='center';x.fillStyle='#fff';x.strokeStyle='rgba(0,0,0,.8)';x.lineWidth=3;
    const lb=`BOARD ${Math.round(p.aimB)}`;x.strokeText(lb,tx,ty+22);x.fillText(lb,tx,ty+22);
    if(!p.cpu&&!p.remote){const hint=S.aimHint?['Drag the ball: your spot','Drag the lane: the aim arrow','SWIPE UP to bowl · curve it to hook']:['Swipe up to bowl'];
     x.font='800 14px system-ui,sans-serif';const hy=Math.min(by-46,H*.74);hint.forEach((h,i)=>{const yy=hy-(hint.length-1-i)*20;x.strokeText(h,W/2,yy);x.fillText(h,W/2,yy);});}
    else{x.font='800 15px system-ui,sans-serif';const t2=p.remote?`${p.name} is lining up…`:`${p.name} is lining up…`;x.strokeText(t2,W/2,H-22);x.fillText(t2,W/2,H-22);}}}
  // the swipe trail
  if(S.trail.length>1){const tr=S.trail,lb=tr[tr.length-1];let k=tr.length-1;while(k>0&&lb.t-tr[k].t<110)k--;const v=Math.hypot(lb.x-tr[k].x,lb.y-tr[k].y)/Math.max(.016,(lb.t-tr[k].t)/1000),pw=Math.min(1.6,v/(Math.min(W,H)*7));
   x.strokeStyle=`hsla(${Math.max(0,120-pw/FOUL_P*120)},95%,55%,.9)`;if(pw>FOUL_P){x.font='900 16px system-ui,sans-serif';x.textAlign='center';x.fillStyle='#ff4040';x.fillText('TOO HARD!',lb.x,lb.y-20);}x.lineWidth=6;x.lineCap='round';x.beginPath();S.trail.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();}
  // speed / revs readout during the roll
  if(S.throwInfo&&(S.phase==='roll'||S.phase==='pins')){x.font='800 15px system-ui,sans-serif';x.textAlign='left';x.fillStyle='#fff';x.strokeStyle='rgba(0,0,0,.8)';x.lineWidth=3;
   const tx=`${S.throwInfo.mph.toFixed(1)} mph${S.throwInfo.rpm>30?' · '+S.throwInfo.rpm+' rpm':''}`;x.strokeText(tx,10,top+sh+22);x.fillText(tx,10,top+sh+22);}
  // the overhead monitor animation (big ones full width, counts in a corner screen)
  if(S.anim){const big=S.anim.big,w=big?Math.min(W*.96,(H*.62)*16/9):Math.min(W*.5,220),h=w*9/16,ax=(W-w)/2,ay=big?Math.max(top+sh+8,(H-h)/2-H*.06):top+sh+10;
   const pop=Math.min(1,(S.t-S.anim.t0)/.18);x.save();x.translate(ax+w/2,ay+h/2);x.scale(.7+.3*pop,.7+.3*pop);x.globalAlpha=pop;
   x.fillStyle='#111';x.fillRect(-w/2-8,-h/2-8,w+16,h+16);x.strokeStyle='#444';x.lineWidth=3;x.strokeRect(-w/2-8,-h/2-8,w+16,h+16);
   x.drawImage(scr,-w/2,-h/2,w,h);x.restore();x.globalAlpha=1;}
  if(S.toast&&S.t-S.toast.t<2.6&&!S.anim){x.font='italic 700 15px Georgia,serif';x.textAlign='center';const a=Math.min(1,(2.6-(S.t-S.toast.t))*2);x.globalAlpha=a;
   x.fillStyle='rgba(0,0,0,.6)';const tw=x.measureText(S.toast.text).width+24;x.fillRect(W/2-tw/2,H*.66-16,tw,30);x.fillStyle='#ffe9b0';x.fillText(S.toast.text,W/2,H*.66+4);x.globalAlpha=1;}
  if(S.banner){const a=Math.min(1,(S.t-S.banner.t)*3);x.globalAlpha=a;x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,H*.38,W,H*.18);x.textAlign='center';x.fillStyle='#ffd23f';
   x.font=`900 ${Math.min(40,W/12)}px "Arial Black",Impact,sans-serif`;x.fillText(S.banner.text,W/2,H*.47);x.font='700 14px system-ui,sans-serif';x.fillStyle='#fff';x.fillText(S.banner.sub||'',W/2,H*.52);x.globalAlpha=1;}
  if(S.phase==='summary')drawSummary(x);}
 // the compact score strip: one row per player, ten frames
 function drawStrip(x,x0,y0,w,h){const rows=PL.length,rh=h/rows;x.fillStyle='rgba(8,8,12,.78)';x.fillRect(x0,y0,w,h);
  const nameW=Math.min(82,w*.2),totW=Math.min(40,w*.1),fw=(w-nameW-totW)/frames;
  PL.forEach((p,i)=>{const y=y0+i*rh,act=i===S.cur;if(act){x.fillStyle='rgba(255,210,63,.18)';x.fillRect(x0,y,w,rh);}
   x.font=`700 ${Math.min(12,rh*.42)}px system-ui,sans-serif`;x.textAlign='left';x.textBaseline='middle';x.fillStyle=act?'#ffd23f':'#ddd';
   let nm=p.name.replace(/\s*\(CPU\)$/,'');while(nm.length>3&&x.measureText(nm).width>nameW-6)nm=nm.slice(0,-1);x.fillText(nm,x0+4,y+rh/2);
   const rowsS=p.game?RU.sheet(p.game):[];
   for(let f=0;f<frames;f++){const fx=x0+nameW+f*fw,r=rowsS[f]||{marks:[]};x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=1;x.strokeRect(fx+.5,y+.5,fw-1,rh-1);
    const nb=f===frames-1?3:2,bw=fw/nb;x.font=`800 ${Math.min(11,rh*.36,bw*.8)}px system-ui,sans-serif`;x.textAlign='center';
    for(let b=0;b<nb;b++){const m=r.marks[b];if(!m)continue;x.fillStyle=m==='X'||m==='/'?'#ffd23f':m==='F'?'#ff5050':'#fff';x.fillText(m,fx+bw*(b+.5),y+rh*.3);
     if(r.split&&r.split[b]){x.strokeStyle='#ff7b7b';x.beginPath();x.arc(fx+bw*(b+.5),y+rh*.3,Math.min(bw,rh)*.32,0,7);x.stroke();}}
    if(r.total!=null){x.fillStyle='#fff';x.font=`600 ${Math.min(11,rh*.36,fw*.36)}px system-ui,sans-serif`;x.fillText(String(r.total),fx+fw/2,y+rh*.74);}}
   x.font=`900 ${Math.min(15,rh*.5)}px system-ui,sans-serif`;x.fillStyle='#ffd23f';x.textAlign='center';x.fillText(String(p.game?RU.total(p.game):0),x0+w-totW/2,y+rh/2);});
  x.textBaseline='alphabetic';}
 // ---------------------------------------------------------------- summary
 let summaryBtn=null;
 function drawSummary(x){const sm=S.summary;if(!sm)return;x.fillStyle='rgba(0,0,0,.72)';x.fillRect(0,0,W,H);
  const w=Math.min(W-20,560),h=Math.min(H-40,w*9/16+190),x0=(W-w)/2,y0=(H-h)/2;
  SCR.drawSheet(sx,look.screens,sheetPlayers().map(p=>({...p,active:false})),{frames,title:'FINAL'});x.drawImage(scr,x0,y0,w,w*9/16);
  x.textAlign='center';x.fillStyle='#ffd23f';x.font=`900 ${Math.min(30,w/14)}px "Arial Black",Impact,sans-serif`;x.fillText(sm.title,W/2,y0+w*9/16+38);
  x.font='600 14px system-ui,sans-serif';x.fillStyle='#fff';let yy=y0+w*9/16+62;
  if(sm.cash){x.fillText(`+$${sm.cash.cash} for the alley`+(sm.cash.lines.length?` (${sm.cash.lines.slice(0,3).map(l=>l[0]).join(', ')})`:''),W/2,yy);yy+=20;x.fillStyle='#9fe39f';x.fillText(`Alley cash: $${alley.cash}`,W/2,yy);yy+=20;}
  const bw=170,bh=44,bx=W/2-bw/2,by=Math.min(H-bh-14,yy+14);summaryBtn=[bx,by,bw,bh];x.fillStyle='#ffd23f';x.fillRect(bx,by,bw,bh);x.fillStyle='#1a1205';x.font='900 17px system-ui,sans-serif';x.fillText('CONTINUE',W/2,by+28);}
 function summaryTap(e){const r=c.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;const b=summaryBtn;if(b&&px>=b[0]&&px<=b[0]+b[2]&&py>=b[1]-10&&py<=b[1]+b[3]+10)S.summaryDone=true;}
 // ---------------------------------------------------------------- debug hooks (tests)
 Object.defineProperties(s.debug,Object.getOwnPropertyDescriptors({engine:'kingpinBowling',get phase(){return S.phase;},get cur(){return S.cur;},get players(){return PL.map(p=>({name:p.name,total:p.game?RU.total(p.game):0,done:!!p.game?.done,marks:p.game?RU.sheet(p.game).map(r=>r.marks.join('')):[]}));},
  get pins(){return S.pins.filter(p=>p.show!==false&&!p.down).map(p=>p.n);},get anim(){return S.anim?.kind||null;},get alley(){return alley;},state:()=>S,
  throw(o){if(throwRes){const r=throwRes;throwRes=null;r(o);return true;}return false;},swipe:(power,dir,hook)=>{if(!throwRes)return false;const r=throwRes;throwRes=null;r(makeRelease(PL[S.cur],power,dir,hook));return true;},
  skip(){skipReq=true;},finishSummary(){S.summaryDone=true;},bot(){botFlag=true;if(S.anim&&S.t-S.anim.t0>.6)skipReq=true;return null;},fast:1}));
 // ---------------------------------------------------------------- go
 // the alley screen (Arcade): pro shop + game length before the first frame
 if(arcade){const SHOP=require("src/engines/bowl/shop.js");look=makeLook(parts,alley.ball);scene.ensure(look);scene.setDecor(decorIds());S.phase='shop';
  const pick=await SHOP.alleyScreen(s,{alley,save,frame,preview:(pp,ball)=>{parts={...pp};look=makeLook(parts,ball||alley.ball);scene.ensure(look);scene.setDecor(decorIds());sheetDirty=true;},sfx});
  if(!s.alive)return;if(!pick){s.finish([0,0],'Left the alley.');return;}frames=pick.frames||frames;parts={...alley.parts};PL[0].ballId=alley.ball;PL[0].shoes=alley.shoes;if(!cpu&&PL[1])PL[1].ballId=alley.ball;}
 if(net){if(me===0){net.send({setup:{p:parts,f:frames}});}else{const st=await waitMsg('setup',8000);if(st){parts={...parts,...st.p};frames=[3,5,10].includes(st.f)?st.f:frames;}}
  net.send({ball:PL[me].ballId});const ob=await waitMsg('ball',5000);if(ob&&PL[1-me]&&AL.byId(AL.BALLS,ob))PL[1-me].ballId=ob;}
 for(const p of PL){p.game=RU.newGame(frames);stanceDefault(p);}
 look=makeLook(parts,PL[0].ballId);scene.ensure(look);
 await SP.ready(['masking-'+look.masking,'boards-'+look.lanes,'pins-'+look.pins,'ball-'+look.ball.id,'screen-'+look.screens],4000);
 if(!s.alive)return;scene.ensure(look);scene.setDecor(decorIds());sheetDirty=true;
 await intro();
 for(let f=0;f<frames&&s.alive;f++){
  for(const p of PL){if(!s.alive)return;if(p.game.done)continue;
   // the alley look follows the bowler's own ball
   look=makeLook(parts,p.ballId);scene.ensure(look);scene.setDecor(decorIds());S.cur=p.i;sheetDirty=true;
   S.banner={text:`${p.name.toUpperCase()}`,sub:`FRAME ${f+1}${f===frames-1?' · LAST FRAME':''}`,t:S.t};setTimeout(()=>{if(S.banner&&S.banner.text===p.name.toUpperCase())S.banner=null;},1100);
   S.pins=rack();let guard=0;
   while(!RU.frameDone(p.game,f)&&!p.game.done&&s.alive&&guard++<4){const ev=await bowlBall(p.i);if(!ev)return;}}}
 if(!s.alive)return;
 // ---------------------------------------------------------------- results
 const totals=PL.map(p=>RU.total(p.game)),best=Math.max(...totals),winners=totals.map((t,i)=>t===best?i:-1).filter(i=>i>=0);
 const local=PL.filter(p=>!p.cpu&&!p.remote);let cash=null;
 if(P&&local.length){let sum={cash:0,lines:[]};for(const p of local){const won=PL.length>1&&winners.length===1&&winners[0]===p.i;const e=AL.earnings(p.evs,RU.total(p.game),won,{tip:AL.hasPerk(alley,'tip-jar')});sum.cash+=e.cash;sum.lines.push(...e.lines);
   const st=alley.stats;st.games++;st.best=Math.max(st.best,RU.total(p.game));for(const ev of p.evs){if(ev.strike)st.strikes++;if(ev.spare)st.spares++;if(ev.strike&&ev.streak===3)st.turkeys++;if(ev.gutter)st.gutters++;}if(RU.total(p.game)>=RU.perfect(frames))st.perfect++;}
  alley.cash+=sum.cash;cash=sum;save();}
 const title=PL.length===1?`${totals[0]} PINS`:winners.length>1?`TIE GAME · ${best}`:`${nameOf(winners[0]).toUpperCase()} WINS ${totals[winners[0]]}-${totals[1-winners[0]]}`;
 S.summary={title,cash};S.phase='summary';S.summaryDone=false;
 await until(()=>S.summaryDone||auto());if(auto())await sleep(300);
 if(!s.alive)return;
 const sc=[totals[0]||0,totals[1]||0];
 s.finish(sc,PL.length===1?`Kingpin Bowling: ${totals[0]}`:winners.length>1?`Tie game at ${best}!`:`${nameOf(winners[0])} wins ${totals[winners[0]]} to ${totals[1-winners[0]]}`);
}
Object.assign(exports,{kingpinBowling});
