// Mario Kart · Rainbow Road (3D). Split screen for two on one phone (P1 top, P2 bottom), each half driven like
// Mario Kart Tour: the kart accelerates by itself, drag sideways to steer, push all the way to drift (blue → orange →
// purple sparks; let go for a mini-turbo), tap to use an item, swipe up to throw it ahead or down to drop it behind.
// Real 3D course (kart3d/track.js): hills you catch air on, a jump and a glider over the void, an anti-gravity wall
// ride, a loop-the-loop and an upside-down corkscrew. Items: banana (x3), green shell (x3), red/blue shell, mushroom
// (x3), golden mushroom, star, lightning, bob-omb, blooper, coin, Bullet Bill, plus Tour's frenzy.
// Modes: 'race' (3 laps) and 'battle' (Balloon Battle on a floating ring). Falls back to the Mode 7 engine
// (kartClassic.js) when WebGL is unavailable.
const {clamp,seededRandom}=require("src/utils.js");
const {arenaKeys,arenaTouch,snd,noise,jingle,PCOL,settle}=require("src/engines/arenaKit.js");
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
const T=require("src/engines/kart3d/track.js");
const Ph=require("src/engines/kart3d/physics.js");
const {createRenderer,TILE}=require("src/engines/kart3d/render.js");
const {drawHUD}=require("src/engines/kart3d/hud.js");
const {createKartMusic}=require("src/engines/kart3d/music.js");

const LAPS=3,RACE_CAP=200,BATTLE_TIME=100;
const GL_OPTS={antialias:true,alpha:false,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'};
const POOLS={
 first:[['banana',4],['green',3],['banana3',1],['coin',2],['bomb',1],['blooper',1],['shell3',.6]],
 second:[['mushroom',2],['mush3',2],['red',2.2],['shell3',1.2],['star',1.2],['golden',.9],['bolt',.8],['blooper',.6],['bomb',.6]],
 far:[['mush3',2],['star',2],['golden',1.4],['bullet',1.2],['bolt',1],['red',1],['blue',.7]],
 battle:[['green',3],['shell3',1.3],['banana',2],['red',2],['bomb',2],['mushroom',1],['star',.9],['blooper',.8],['banana3',.6]]};
const COUNT={banana3:3,shell3:3,mush3:3,golden:99};

async function kart(s){
 const mode=s.game.kartMode==='battle'?'battle':'race';
 const glc=document.createElement('canvas');let gl0=null;try{gl0=glc.getContext('webgl',GL_OPTS)||glc.getContext('experimental-webgl',GL_OPTS);}catch{}
 const classic=()=>require("src/engines/kartClassic.js").kartClassic(s);
 if(!gl0)return classic();
 const [cv,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const course=mode==='race'?T.rainbowRoad():T.battleRing();
 let R;try{R=createRenderer(glc,course,{colors:PCOL,battle:mode==='battle'});}catch(e){console.warn('kart: 3D renderer unavailable, using Mode 7',e);return classic();}
 s.cleanup(()=>{try{R.gl.getExtension('WEBGL_lose_context')?.loseContext();}catch{}});
 const rand=seededRandom(Math.floor(s.random()*1e9)),itemRand=seededRandom(Math.floor(s.random()*1e9));
 // world placement of boxes and coins
 const place=(o,h)=>{const f=T.frame(course,o.s,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]});o.P=[f.P[0]+f.R[0]*o.d+f.U[0]*h,f.P[1]+f.R[1]*o.d+f.U[1]*h,f.P[2]+f.R[2]*o.d+f.U[2]*h];o.T=f.T.slice();o.U=f.U.slice();o.R=f.R.slice();o.t=0;o.pop=0;return o;};
 const boxes=course.boxes.map(b=>place(b,13)),coins=course.coins.map(cn=>place(cn,8));
 // minimap (top-down XZ)
 {let a=Infinity,b=-Infinity,c0=Infinity,d0=-Infinity;for(let i=0;i<course.N;i++){a=Math.min(a,course.px[i]);b=Math.max(b,course.px[i]);c0=Math.min(c0,course.pz[i]);d0=Math.max(d0,course.pz[i]);}
  const sc=1/Math.max(b-a,d0-c0),ox=(1-(b-a)*sc)/2,oz=(1-(d0-c0)*sc)/2;course.mini=[];for(let i=0;i<course.N;i+=6)course.mini.push([ox+(course.px[i]-a)*sc,oz+(course.pz[i]-c0)*sc]);
  course.miniAt=k=>[ox+(k.P2[0]-a)*sc,oz+(k.P2[2]-c0)*sc];}
 const K=[0,1].map(i=>Object.assign(Ph.makeKart(course,i),{items:[],rolling:false,rollT:0,frenzy:0,frenzyItem:null,frenzyCD:0,goldenT:0,balloons:3,out:false,finished:false,finishT:0,place:0,best:0,msgs:[],wrongT:0,rel:0}));
 const shells=[],bananas=[],bombs=[],parts=[];
 let phase='intro',introT=0,lights=0,clock=0,endT=0,winner=-1,endText='',simT=0,hintT=7;
 const auto=[false,false];
 // ---------------------------------------------------------------- sound
 const sfx={box:()=>jingle([880,1175,1568],{step:.04,type:'square',vol:.03}),item:()=>jingle([1319,1568],{step:.05,type:'square',vol:.03}),coin:()=>{snd(988,.05,{type:'square',vol:.03});snd(1319,.12,{type:'square',vol:.03,delay:.05});},
  boost:()=>{noise(.35,{vol:.06,freq:900});snd(180,.4,{type:'sawtooth',vol:.035,to:720});},spin:()=>{snd(620,.45,{type:'square',vol:.035,to:110});noise(.25,{vol:.06,freq:2200});},
  shell:()=>snd(320,.16,{type:'square',vol:.03,to:640}),fall:()=>snd(820,.8,{type:'triangle',vol:.04,to:110}),pop:()=>{noise(.12,{vol:.08,freq:3000});snd(1200,.08,{type:'square',vol:.03,to:300});},
  lap:()=>jingle([659,784,1047],{step:.08,type:'square',vol:.035}),final:()=>jingle([784,988,1175,1568],{step:.09,type:'square',vol:.04}),star:()=>jingle([1047,1319,1568,2093,1568,2093],{step:.06,type:'square',vol:.03}),
  light:hi=>snd(hi?1047:523,hi?.55:.28,{type:'square',vol:.045}),hop:()=>snd(300,.08,{type:'square',vol:.025,to:520}),spark:lv=>snd([0,880,1175,1568][lv],.1,{type:'triangle',vol:.03}),
  boom:()=>{noise(.6,{vol:.11,freq:400,q:.5});snd(90,.5,{type:'sawtooth',vol:.05,to:40});},wall:()=>noise(.08,{vol:.05,freq:700}),trick:()=>jingle([1175,1568],{step:.05,type:'square',vol:.03}),
  land:()=>noise(.1,{vol:.05,freq:300}),glide:()=>noise(.5,{vol:.04,freq:1500,q:.4}),zap:()=>{noise(.5,{vol:.08,freq:500});snd(1600,.4,{type:'sawtooth',vol:.03,to:200});},ink:()=>noise(.4,{vol:.06,freq:250,q:.4})};
 // engine hum per kart (two thumbs, two engines)
 const engines=[];{const ac=store.profile?.settings?.sound?audioContext():null;if(ac)try{for(let i=0;i<2;i++){const o=ac.createOscillator(),o2=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();o.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=600;g.gain.value=0;
   o.connect(f);o2.connect(f);f.connect(g);g.connect(ac.destination);o.start();o2.start();engines.push({o,o2,f,g,ac});}}catch{}}
 let song=null;try{song=store.profile?.settings?.music?createKartMusic(audioContext(),{transpose:mode==='battle'?3:0}):null;}catch{}
 s.cleanup(()=>song?.stop());
 s.cleanup(()=>{for(const e of engines)try{e.g.gain.cancelScheduledValues(0);e.g.gain.value=0;e.o.stop();e.o2.stop();e.g.disconnect();}catch{}});
 const updateEngines=()=>{for(let i=0;i<engines.length;i++){const e=engines[i],k=K[i],t=e.ac.currentTime,on=!s.paused&&s.alive&&phase!=='intro'&&!k.out&&k.lakitu<=0;
  const f=55+k.v*.24+(k.boostT>0?40:0)+(k.drift?8:0);e.o.frequency.setTargetAtTime(f,t,.05);e.o2.frequency.setTargetAtTime(f*.502,t,.05);e.f.frequency.setTargetAtTime(400+k.v*2.2,t,.08);e.g.gain.setTargetAtTime(on?.012+k.v/Ph.BOOST*.014:0,t,.08);}};
 // ---------------------------------------------------------------- messages, particles
 const msg=(k,text,color='#fff',size=22,life=1.1)=>{k.msgs=k.msgs.filter(m=>m.text!==text);k.msgs.push({text,color,size,life,t:0});if(k.msgs.length>3)k.msgs.shift();};
 const spawn=(P,o)=>{if(parts.length>700)return;parts.push(Object.assign({P:P.slice(),V:[0,0,0],life:.4,max:.4,size:4,grow:0,tile:TILE.spark,col:[1,1,1,1],add:true,fade:true,g:0,drag:2},o,{max:o.life||.4}));};
 const burst=(P,n,o)=>{for(let j=0;j<n;j++){const a=rand()*Math.PI*2,b=rand()*Math.PI-Math.PI/2,sp=(o.speed||80)*(.4+rand()*.8);spawn(P,{...o,V:[Math.cos(a)*Math.cos(b)*sp,Math.sin(b)*sp+(o.up||0),Math.sin(a)*Math.cos(b)*sp],life:(o.life||.5)*(.6+rand()*.7)});}};
 const local=(k,p)=>{const M=k._M;if(!M)return k.P2.slice();return [M[0]*p[0]+M[4]*p[1]+M[8]*p[2]+M[12],M[1]*p[0]+M[5]*p[1]+M[9]*p[2]+M[13],M[2]*p[0]+M[6]*p[1]+M[10]*p[2]+M[14]];};
 // ---------------------------------------------------------------- items
 const rankOf=k=>mode!=='race'?1:k.finished&&!K[1-k.i].finished?1:K[1-k.i].finished&&!k.finished?2:k.best>=K[1-k.i].best?1:2;
 const pick=list=>{let tot=0;for(const [,w] of list)tot+=w;let r=itemRand()*tot;for(const [id,w] of list){r-=w;if(r<=0)return id;}return list[0][0];};
 function rollItem(k){
  let pool=POOLS.battle;if(mode==='race'){const gap=K[1-k.i].best-k.best;pool=rankOf(k)===1?POOLS.first:gap>.22?POOLS.far:POOLS.second;}
  const id=pick(pool);
  if(itemRand()<(mode==='race'&&rankOf(k)===2?.045:.02)){k.frenzy=7;k.frenzyItem=['banana','green','mushroom','red','bomb'][Math.floor(itemRand()*5)];k.inv=Math.max(k.inv,7);k.items=[];msg(k,'FRENZY!','#ff7af2',28,1.6);sfx.star();return;}
  if(id==='blue'&&rankOf(k)===1)return rollItem(k);
  k.items.push({id,n:COUNT[id]||1});sfx.item();
 }
 const rival=k=>K[1-k.i];
 const hitKart=(k,type,why)=>{const ok=Ph.hit(k,type,ctx);if(ok){if(mode==='battle')loseBalloon(k);s.react?.(k.i,'sad');}return ok;};
 function loseBalloon(k){if(k.balloons<=0)return;k.balloons--;sfx.pop();burst(local(k,[-11,22,0]),14,{tile:TILE.glow,col:[1,.4,.5,1],speed:120,size:4,life:.5});if(k.balloons<=0){k.out=true;msg(k,'OUT!','#ff8aa8',30,2);}}
 function fire(k,id,dir){
  const fwd=dir!==-1;
  if(id==='mushroom'||id==='mush3'||id==='golden'){Ph.setBoost(k,1.15);k.v+=60;sfx.boost();msg(k,'BOOST!','#ffb02e',18,.6);if(id==='golden'&&!k.goldenT)k.goldenT=6;}
  else if(id==='star'){k.star=7.5;sfx.star();msg(k,'STAR POWER!','#ffe23a',22,1.2);}
  else if(id==='banana'||id==='banana3'){if(dir===1)bananas.push({s:k.s+12,d:k.d,h:8,vs:k.v+240,vh:150,air:true,owner:k.i,t:0});else bananas.push({s:T.wrapS(course,k.s-20),d:k.d,h:0,air:false,owner:k.i,t:0});snd(420,.1,{type:'square',vol:.03});}
  else if(id==='green'||id==='shell3'){shells.push({kind:'green',s:T.wrapS(course,k.s+(fwd?16:-18)),d:k.d,psi:fwd?k.psi:Ph.wrapA(k.psi+Math.PI),v:600,h:4,owner:k.i,t:0,bounce:0});sfx.shell();}
  else if(id==='red'){shells.push({kind:fwd?'red':'green',s:T.wrapS(course,k.s+(fwd?16:-18)),d:k.d,psi:fwd?k.psi*.3:Ph.wrapA(k.psi+Math.PI),v:fwd?560:600,h:4,owner:k.i,t:0,bounce:0,target:1-k.i});sfx.shell();}
  else if(id==='blue'){shells.push({kind:'blue',s:T.wrapS(course,k.s+10),d:k.d,psi:0,v:820,h:46,owner:k.i,t:0,target:1-k.i});sfx.shell();msg(rival(k),'BLUE SHELL!','#6aa0ff',22,1.6);}
  else if(id==='bomb'){bombs.push(fwd?{s:k.s+14,d:k.d,h:10,vs:k.v+200,vh:170,air:true,owner:k.i,t:0,fuse:2.4}:{s:T.wrapS(course,k.s-22),d:k.d,h:0,air:false,owner:k.i,t:0,fuse:2.4});snd(240,.12,{type:'square',vol:.03});}
  else if(id==='bolt'){const o=rival(k);sfx.zap();if(o.star<=0&&o.bullet<=0){o.shrink=4.5;o.items=[];o.rolling=false;hitKart(o,'spin','bolt');msg(o,'ZAPPED!','#ffe23a',22,1.2);}}
  else if(id==='blooper'){const o=rival(k);sfx.ink();if(o.bullet<=0){o.ink=4.6;msg(o,'BLOOPER!','#c9a0ff',20,1);}}
  else if(id==='coin'){k.coins=Math.min(10,k.coins+2);sfx.coin();}
  else if(id==='bullet'){k.bullet=4.5;k.inv=Math.max(k.inv,4.5);sfx.boost();msg(k,'BULLET BILL!','#fff',22,1.2);}
 }
 function useItem(k,dir){
  if(phase!=='play'||k.out||k.lakitu>0||k.falling>0||k.finished)return;
  if(k.frenzy>0){if(k.frenzyCD<=0){fire(k,k.frenzyItem,dir);k.frenzyCD=.3;}return;}
  const it=k.items[0];if(!it)return;
  if(it.id==='golden'){fire(k,'golden',dir);return;}
  fire(k,it.id,dir);it.n--;if(it.n<=0)k.items.shift();
 }
 // ---------------------------------------------------------------- input (Mario Kart Tour style)
 const kb=arenaKeys(s),pads=[0,1].map(()=>({f:null,ox:0,latch:0,keyLatch:0,second:null,holdSince:-1}));
 const RAD=()=>clamp(s.W*.15,46,90);
 kb.onDown((i,k)=>{if(k==='u')useItem(K[i],1);else if(k==='fire')useItem(K[i],0);if((k==='u'||k==='d'||k==='fire')&&pads[i].holdSince<0)pads[i].holdSince=lights;});
 kb.onUp((i,k)=>{if(!kb.state[i].u&&!kb.state[i].d&&!kb.state[i].fire&&!pads[i].f)pads[i].holdSince=-1;});
 const touch=arenaTouch(s,{owner:p=>p.y<s.H/2?0:1,maxFingers:3,
  onDown:f=>{const pd=pads[f.owner];if(pd.holdSince<0)pd.holdSince=lights;if(!pd.f){pd.f=f;pd.ox=f.x;f.data.role='steer';}else f.data.role='item';},
  onMove:f=>{const pd=pads[f.owner];if(f.data.role==='steer'){const r=RAD();if(f.x-pd.ox>r)pd.ox=f.x-r;if(f.x-pd.ox<-r)pd.ox=f.x+r;
    // vertical flick with the steering thumb throws the item
    const now=performance.now();let q=null;for(const sm of f.samples)if(now-sm.t<=140){q=sm;break;}
    if(q&&!f.data.flicked){const dy=f.y-q.y,dx=f.x-q.x,dtm=Math.max(.016,(now-q.t)/1000);if(Math.abs(dy)>34&&Math.abs(dy)>Math.abs(dx)*1.4&&Math.abs(dy)/dtm>650){f.data.flicked=true;useItem(K[f.owner],dy<0?1:-1);}}
    if(f.data.flicked&&f.samples.length&&now-f.samples[f.samples.length-1].t>200)f.data.flicked=false;}},
  onUp:(f,cancelled)=>{const pd=pads[f.owner];
   if(f.data.role==='steer'){if(pd.f===f){pd.f=null;pd.latch=0;}if(!cancelled&&!f.data.flicked&&f.held<260&&f.moved<14)useItem(K[f.owner],0);}
   else if(!cancelled){const dy=f.y-f.sy;useItem(K[f.owner],f.moved<18?0:dy<-24?1:dy>24?-1:0);}
   if(!pd.f&&!kb.state[f.owner].u&&!kb.state[f.owner].d)pd.holdSince=-1;}});
 function readInput(i){
  const k=K[i],pd=pads[i],ks=kb.state[i];
  if(auto[i]){if(mode==='battle'){const o=rival(k),ds=T.sdiff(course,k.s,o.s),half=course.half[T.idx(course,k.s)];let want=Math.atan2(o.d-k.d,ds);if(Math.abs(k.d)>half*.62)want=Math.atan2(-k.d,80*Math.sign(Math.cos(k.psi))||80);
    return {steer:clamp(Ph.wrapA(want-k.psi)*2.5,-1,1),drift:0};}
   return Ph.autoInput(course,k,{target:autoTarget(k)});}
  let steer=(ks.r?1:0)-(ks.l?1:0),fromTouch=false;
  if(pd.f){const r=RAD();let v=clamp((pd.f.x-pd.ox)/r,-1,1);v=Math.abs(v)<.08?0:Math.sign(v)*(Math.abs(v)-.08)/.92;steer=v;fromTouch=true;
   if(!pd.latch&&Math.abs(v)>=.97)pd.latch=Math.sign(v);else if(pd.latch&&v*pd.latch<-.3)pd.latch=0;}
  else pd.latch=0;
  if(ks.d){if(!pd.keyLatch&&steer)pd.keyLatch=Math.sign(steer);}else pd.keyLatch=0;
  return {steer,drift:pd.latch||pd.keyLatch||0,touch:fromTouch};
 }
 const autoTarget=k=>{for(const b of boxes){const ds=T.sdiff(course,k.s,b.s);if(b.t<=0&&ds>40&&ds<260&&k.items.length<2)return b.d;}return 0;};
 // ---------------------------------------------------------------- physics events → sound / particles / banners
 const ctx={ev:(k,name,data)=>{
  const P=k.P2;
  if(name==='miniturbo'){sfx.boost();msg(k,data===3?'ULTRA MINI-TURBO!':data===2?'SUPER MINI-TURBO!':'MINI-TURBO!',['','#5ab8ff','#ffa02e','#e46aff'][data],16,.8);}
  else if(name==='spark')sfx.spark(data);
  else if(name==='hop')sfx.hop();
  else if(name==='pad'){sfx.boost();}
  else if(name==='trick'){sfx.trick();msg(k,['NICE!','GREAT!','COOL!'][Math.floor(rand()*3)],'#7affb0',20,.8);burst(P,12,{tile:TILE.spark,col:[1,1,.6,1],speed:110,size:4,life:.45});}
  else if(name==='ramp'||name==='glide'){if(name==='glide')sfx.glide();else snd(500,.15,{type:'square',vol:.03,to:900});}
  else if(name==='land'){if(data>.3){sfx.land();shake(k,Math.min(6,data*5));burst(P,8,{tile:TILE.smoke,add:false,col:[1,1,1,.55],speed:50,size:6,grow:8,life:.5});}}
  else if(name==='wall'){sfx.wall();burst(local(k,[2,4,k.d>0?9:-9]),8,{tile:TILE.spark,col:[1,.85,.4,1],speed:140,size:3,life:.3});}
  else if(name==='hit'){sfx.spin();shake(k,data==='tumble'?7:3);if(data==='tumble')sfx.boom();burst(P,10,{tile:TILE.star,add:false,col:[1,1,1,1],speed:90,up:40,size:5,life:.7,g:-80});}
  else if(name==='fall'){sfx.fall();}
  else if(name==='lakitu'){if(mode==='battle')loseBalloon(k);cams[k.i].snap=true;}
 }};
 const shake=(k,a)=>{if(!store.profile?.settings?.reducedMotion)cams[k.i].shake=Math.max(cams[k.i].shake||0,a);};
 // ---------------------------------------------------------------- projectiles
 const dist2=(a,b)=>{const ds=T.sdiff(course,a.s,b.s),dd=b.d-a.d;return ds*ds+dd*dd;};
 const kartHittable=k=>!k.out&&k.lakitu<=0&&k.falling<=0;
 function blockFromBehind(k,src){const it=k.items[0];if(!it||k.rolling&&!it)return false;if(!['banana','banana3','green','shell3','red','bomb'].includes(it.id))return false;
  const ds=T.sdiff(course,k.s,src.s);const behind=ds*Math.cos(k.psi)<0;if(!behind&&it.id!=='shell3')return false;it.n--;if(it.n<=0)k.items.shift();sfx.pop();return true;}
 function stepProjectiles(dt){
  for(const sh of shells){if(sh.dead)continue;sh.t+=dt;let gone=false;
   if(sh.kind==='blue'){const tg=K[sh.target];const ds=T.sdiff(course,sh.s,tg.s);sh.s=T.wrapS(course,sh.s+Math.min(Math.abs(ds),sh.v*dt)*Math.sign(ds||1));sh.d+=(tg.d-sh.d)*Math.min(1,dt*3);sh.h=Math.abs(ds)<120?Math.max(4,sh.h-dt*160):46;
    if(Math.abs(ds)<16&&kartHittable(tg)){gone=true;explode(tg.s,tg.d,110,sh.owner,true);}}
   else{
    if(sh.kind==='red'){const tg=K[sh.target],ds=T.sdiff(course,sh.s,tg.s);if(ds>0&&ds<1600&&kartHittable(tg)){const want=Math.atan2(tg.d-sh.d,Math.max(30,ds*.6));sh.psi+=clamp(Ph.wrapA(want-sh.psi),-3*dt,3*dt);}else sh.psi*=Math.pow(.2,dt);}
    const f=T.frame(course,sh.s,FR),den=Math.max(.35,1-f.kg*sh.d),ds=sh.v*Math.cos(sh.psi)/den*dt;sh.s=T.wrapS(course,sh.s+ds);sh.d+=sh.v*Math.sin(sh.psi)*dt;sh.psi=Ph.wrapA(sh.psi-f.kg*ds);
    const i=T.idx(course,sh.s),half=course.half[i],rail=course.rail[i];
    if(Math.abs(sh.d)>half-6){const side=Math.sign(sh.d);if(rail&(side>0?2:1)){sh.d=side*(half-6);sh.psi=Math.atan2(-Math.sin(sh.psi),Math.cos(sh.psi));sh.bounce++;snd(900,.04,{type:'square',vol:.02});if(sh.bounce>6)gone=true;}else if(Math.abs(sh.d)>half+4)gone=true;}
    if(course.gap[i]||sh.t>8)gone=true;
    for(const k of K){if(gone)break;if(sh.t<.3&&k.i===sh.owner)continue;if(!kartHittable(k)||Math.abs(k.h-sh.h)>22)continue;
     if(dist2(k,sh)<18*18){gone=true;if(k.star>0||k.bullet>0){sfx.pop();continue;}if(blockFromBehind(k,sh))continue;hitKart(k,sh.kind==='red'?'hard':'spin','shell');}}
    if(!gone)for(let q=bananas.length-1;q>=0;q--)if(!bananas[q].air&&dist2(bananas[q],sh)<16*16){bananas.splice(q,1);gone=true;sfx.pop();break;}
    if(!gone&&sh.t>.2)for(const o of shells)if(o!==sh&&!o.dead&&o.kind!=='blue'&&o.t>.2&&dist2(o,sh)<14*14){o.dead=true;gone=true;sfx.pop();break;}
   }
   if(gone)sh.dead=true;}
  for(let j=shells.length-1;j>=0;j--)if(shells[j].dead){const sh=shells[j];burst(shellWorld(sh),8,{tile:TILE.glow,col:sh.kind==='red'?[1,.3,.2,1]:sh.kind==='blue'?[.3,.5,1,1]:[.3,1,.4,1],speed:90,size:4,life:.35});shells.splice(j,1);}
  for(const list of [bananas,bombs])for(let j=list.length-1;j>=0;j--){const b=list[j];b.t+=dt;
   if(b.air){b.s=T.wrapS(course,b.s+b.vs*dt);b.h+=b.vh*dt;b.vh-=Ph.G*dt;if(b.h<=0){b.h=0;b.air=false;if(!T.surfaceAt(course,b.s,b.d)){list.splice(j,1);continue;}}}
   if(list===bombs){if(!b.air)b.fuse-=dt;let boom=b.fuse<=0;if(b.t>.5)for(const k of K)if(kartHittable(k)&&dist2(k,b)<24*24&&k.h<20)boom=true;if(boom){list.splice(j,1);explode(b.s,b.d,95,b.owner);}continue;}
   if(b.air)continue;
   for(const k of K){if(b.t<.4&&k.i===b.owner)continue;if(!kartHittable(k)||k.h>12)continue;if(dist2(k,b)<15*15){list.splice(j,1);if(k.star<=0&&k.bullet<=0)hitKart(k,'spin','banana');else sfx.pop();break;}}}
  if(bananas.length>14)bananas.shift();
 }
 const FR={P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]};
 const shellWorld=sh=>T.point(course,sh.s,sh.d,sh.h+(sh.kind==='blue'?0:0));
 function explode(s0,d0,r,owner,blue){const P=T.point(course,s0,d0,8);sfx.boom();
  spawn(P,{tile:TILE.boom,add:false,size:30,grow:30,life:.5,col:[1,1,1,1]});burst(P,24,{tile:TILE.glow,col:blue?[.4,.6,1,1]:[1,.6,.2,1],speed:220,size:7,life:.6});burst(P,10,{tile:TILE.smoke,add:false,col:[.4,.35,.45,.7],speed:80,size:10,grow:16,life:1});
  spawn(P,{tile:TILE.ring,size:10,grow:r,life:.45,col:blue?[.5,.7,1,1]:[1,.8,.4,1]});
  for(const k of K)if(kartHittable(k)){const ds=T.sdiff(course,s0,k.s),dd=k.d-d0;if(ds*ds+dd*dd<r*r)hitKart(k,'tumble','boom');}}
 // ---------------------------------------------------------------- kart vs kart, pickups
 function contacts(dt){
  const [a,b]=K;if(!a.out&&!b.out&&kartHittable(a)&&kartHittable(b)&&Math.abs(a.h-b.h)<16){const ds=T.sdiff(course,a.s,b.s),dd=b.d-a.d,d=Math.hypot(ds,dd);
   if(d<19){const nx=ds/(d||1),ny=dd/(d||1),push=(19-d)/2+.5;if(!a.air&&!b.air){a.s=T.wrapS(course,a.s-nx*push);a.d-=ny*push;b.s=T.wrapS(course,b.s+nx*push);b.d+=ny*push;}
    if((a.bump||0)<=0&&(b.bump||0)<=0){a.bump=b.bump=.45;noise(.08,{vol:.06,freq:600});
     for(const [p,q] of [[a,b],[b,a]]){if((p.star>0||p.bullet>0)&&q.star<=0&&q.bullet<=0)hitKart(q,p.bullet>0?'tumble':'hard','ram');else if(q.shrink>0&&p.shrink<=0&&q.inv<=0){q.squash=1.4;hitKart(q,'spin','squash');}}
     if(course.glue[T.idx(course,a.s)]&&course.glue[T.idx(course,b.s)]){Ph.setBoost(a,.45);Ph.setBoost(b,.45);msg(a,'SPIN BOOST','#5af0ff',14,.6);msg(b,'SPIN BOOST','#5af0ff',14,.6);}
     else{const va=a.v,vb=b.v;a.v=vb*.6+va*.4;b.v=va*.6+vb*.4;}
     if(mode==='battle')for(const [p,q] of [[a,b],[b,a]])if(p.boostT>0&&q.star<=0&&q.inv<=0&&p.balloons<3&&q.balloons>0){hitKart(q,'spin','steal');p.balloons++;msg(p,'BALLOON STOLEN!','#ff8aa8',18,1);}}}}
  for(const k of K){k.bump=Math.max(0,(k.bump||0)-dt);if(!kartHittable(k)||k.h>34)continue;
   for(const b of boxes)if(b.t<=0&&dist2(k,b)<17*17){b.t=1.8;b.pop=.25;sfx.box();burst(b.P,14,{tile:TILE.glow,col:[...hsvc(rand()),1],speed:120,size:3.5,life:.45});
    if(k.frenzy<=0&&k.items.length+(k.rolling?1:0)<2){k.rolling=true;k.rollT=1.05;}}
   for(const cn of coins)if(cn.t<=0&&dist2(k,cn)<15*15){cn.t=9;if(k.coins<10){k.coins++;sfx.coin();}burst(cn.P,6,{tile:TILE.spark,col:[1,.85,.2,1],speed:70,size:3,life:.3});}}
  for(const b of boxes){if(b.t>0)b.t-=dt;b.pop=Math.max(0,b.pop-dt);}for(const cn of coins)if(cn.t>0)cn.t-=dt;
 }
 const hsvc=h=>{const f=n=>{const k=(n+h*6)%6;return 1-Math.max(0,Math.min(k,4-k,1))*.75;};return [f(5),f(3),f(1)];};
 // ---------------------------------------------------------------- per kart update
 function updateKart(k,dt){
  const inp=phase==='play'&&!k.out&&!k.finished?readInput(k.i):(phase==='end'||k.finished)&&!k.out?{steer:Ph.autoInput(course,k).steer,drift:0}:{steer:0,drift:0};
  if(k.out){k.v*=Math.pow(.3,dt);inp.steer=0;}
  if(k.rolling){k.rollT-=dt;if(k.rollT<=0){k.rolling=false;rollItem(k);}}
  if(k.frenzy>0){k.frenzy-=dt;k.frenzyCD-=dt;if(k.frenzy<=0){k.frenzyItem=null;}}
  if(k.goldenT>0){k.goldenT-=dt;if(k.goldenT<=0&&k.items[0]?.id==='golden')k.items.shift();}
  if(auto[k.i]&&phase==='play'&&(k.items[0]||k.frenzy>0)&&rand()<dt*.6)useItem(k,rand()<.75?1:-1);
  const n=Math.max(1,Math.ceil(dt/(1/120))),h=dt/n;for(let q=0;q<n;q++)Ph.stepKart(course,k,phase==='play'||phase==='end'?inp:{steer:0,drift:0},h,ctx);
  // laps
  if(mode==='race'){const rel=T.wrapS(course,k.s-course.startS),L=course.L;
   if(!k.finished&&k.lakitu<=0&&k.falling<=0){if(k.rel>L*.8&&rel<L*.2&&k.half){k.lap++;k.half=false;if(k.lap>=LAPS){k.finished=true;k.finishT=clock;k.place=winner<0?1:2;if(winner<0){winner=k.i;s.react?.(k.i,'win');}jingle([523,659,784,1047,1319],{step:.09,type:'square',vol:.04});msg(k,'FINISH!','#ffe23a',34,3);}
     else if(k.lap===LAPS-1){sfx.final();msg(k,'FINAL LAP!','#ff5a5a',28,1.8);}else{sfx.lap();msg(k,`LAP ${k.lap+1}`,'#fff',24,1.2);}}
    if(rel>L*.4&&rel<L*.62)k.half=true;}
   k.rel=rel;k.prog=k.finished?LAPS:k.lap+(rel>L*.9&&!k.half?0:rel/L);k.best=Math.max(k.best,k.prog);
   const back=!k.air&&k.lakitu<=0&&Math.abs(k.psi)>2.1&&k.v>40;k.wrongT=back?k.wrongT+dt:0;}
  for(const m of k.msgs)m.t+=dt;k.msgs=k.msgs.filter(m=>m.t<m.life);
  // particles from the kart
  if(k._M&&k.falling<=0&&k.lakitu<=0){
   if(k.drift&&!k.air){const lv=k.spark,col=[[1,.95,.7,.9],[.35,.7,1,1],[1,.6,.15,1],[.9,.35,1,1]][lv];for(const z of [-9,9])if(rand()<(lv?.9:.5)){const P=local(k,[-8,1,z]);spawn(P,{tile:TILE.spark,col,size:lv?3.4+lv:2.2,life:.22,V:[(rand()-.5)*60-k.F[0]*40,30+rand()*50,(rand()-.5)*60-k.F[2]*40],g:-140});}}
   if(k.boostT>0||k.bullet>0)for(const z of [-2.6,2.6])spawn(local(k,[-15,6.6,z]),{tile:TILE.flame,col:k.bullet>0?[1,.9,.7,1]:[1,.75,.4,1],size:5+rand()*3,grow:-3,life:.16,V:[-k.F[0]*90,-k.F[1]*90,-k.F[2]*90]});
   if(k.star>0&&rand()<.7)spawn(local(k,[(rand()-.5)*24,rand()*20,(rand()-.5)*20]),{tile:TILE.spark,col:[...hsvc(rand()),1],size:3,life:.35});
   if(k.glue>.5&&!k.air&&rand()<.6)for(const z of [-9,9])spawn(local(k,[-8,1,z]),{tile:TILE.glow,col:[.3,.9,1,.6],size:3,life:.25});
   if((k.spin>0||k.tumble>0)&&rand()<.5)spawn(local(k,[0,3,0]),{tile:TILE.smoke,add:false,col:[1,1,1,.5],size:5,grow:10,life:.5,V:[0,20,0]});}
 }
 // ---------------------------------------------------------------- cameras
 const cams=K.map(k=>({E:[k.P2[0]-k.F[0]*55+k.N[0]*22,k.P2[1]-k.F[1]*55+k.N[1]*22,k.P2[2]-k.F[2]*55+k.N[2]*22],F:k.F.slice(),N:k.N.slice(),fov:0,snap:false}));
 const lerp3=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
 function cameraFor(i,dt,view){
  const k=K[i],cm=cams[i],aspect=view.w/view.h,base=(aspect<1.25?74:aspect<1.7?66:58)*Math.PI/180;
  cm.fov+=((k.boostT>0||k.bullet>0?.12:0)-cm.fov)*Math.min(1,dt*4);
  if(phase==='intro'){const e=Math.min(1,introT/2.4),a=Math.PI*(1-(e*e*(3-2*e))),r=70-20*e;const F=k.F,N=k.N,Rv=k.R;
   const E=[k.P2[0]+(F[0]*Math.cos(a)+Rv[0]*Math.sin(a)*.6)*r+N[0]*(18+20*(1-e)),k.P2[1]+(F[1]*Math.cos(a)+Rv[1]*Math.sin(a)*.6)*r+N[1]*(18+20*(1-e)),k.P2[2]+(F[2]*Math.cos(a)+Rv[2]*Math.sin(a)*.6)*r+N[2]*(18+20*(1-e))];
   cm.E=E;cm.F=k.F.slice();cm.N=k.N.slice();return {eye:E,target:[k.P2[0]+N[0]*10,k.P2[1]+N[1]*10,k.P2[2]+N[2]*10],up:N,fov:base};}
  if(k.falling>0){return {eye:cm.E,target:k.P2,up:cm.N,fov:base};}
  const tF=k.F,tN=k.N,a1=cm.snap?1:1-Math.exp(-dt*(k.air?3:7)),a2=cm.snap?1:1-Math.exp(-dt*5);
  cm.F=T.norm(lerp3(cm.F,tF,a1));cm.N=T.norm(lerp3(cm.N,tN,a2));
  const back=52+(k.boostT>0?6:0),up=20;const want=[k.P2[0]-cm.F[0]*back+cm.N[0]*up,k.P2[1]-cm.F[1]*back+cm.N[1]*up,k.P2[2]-cm.F[2]*back+cm.N[2]*up];
  cm.E=cm.snap?want:lerp3(cm.E,want,1-Math.exp(-dt*14));cm.snap=false;
  let eye=cm.E;if(cm.shake>.05){const a=cm.shake;eye=[cm.E[0]+(rand()-.5)*a,cm.E[1]+(rand()-.5)*a,cm.E[2]+(rand()-.5)*a];cm.shake*=Math.pow(.02,dt);}
  return {eye,target:[k.P2[0]+cm.F[0]*26+cm.N[0]*8,k.P2[1]+cm.F[1]*26+cm.N[1]*8,k.P2[2]+cm.F[2]*26+cm.N[2]*8],up:cm.N,fov:base+cm.fov};
 }
 // ---------------------------------------------------------------- heads (portrait textures)
 const headCv=[0,1].map(()=>{const c2=document.createElement('canvas');c2.width=c2.height=128;return c2;}),headKey=['',''];let headTimer=0;
 function refreshHeads(force){for(let i=0;i<2;i++){const k=K[i],mood=k.spin>0||k.tumble>0||k.falling>0||k.lakitu>0||k.out?'sad':k.finished&&k.place===1?'win':k.star>0||k.boostT>.5||k.trick>0?'happy':'normal';
  if(!force&&headKey[i]===mood)continue;headKey[i]=mood;const g=headCv[i].getContext('2d');g.clearRect(0,0,128,128);s.sprite(g,i,64,64,124,{exact:true,mood:mood==='normal'?undefined:mood});R.setHead(i,headCv[i]);}}
 // ---------------------------------------------------------------- debug hooks for tests
 s.debug={get phase(){return phase;},get clock(){return clock;},K,course,auto,shells,bananas,bombs,
  give(i,id){K[i].items=[{id,n:COUNT[id]||1}];},use(i,dir=0){useItem(K[i],dir);},skip(){if(phase==='intro'){phase='count';}if(phase==='count'){lights=4;phase='play';}},
  teleport(i,s0,d=0){const k=K[i];k.s=T.wrapS(course,s0);k.d=d;k.air=false;k.falling=0;k.lakitu=0;k.rel=T.wrapS(course,k.s-course.startS);cams[i].snap=true;},
  finishLap(i){const k=K[i];k.lap=LAPS-1;k.half=true;this.teleport(i,course.startS-30);k.rel=T.wrapS(course,k.s-course.startS);},
  get headOK(){return R.headOK.slice();},get particles(){return parts.length;}};
 s.hint(mode==='race'?'RAINBOW ROAD: three laps in real 3D: hills, a jump and a glider over the void, an anti-gravity wall ride, a loop-the-loop and an upside-down corkscrew. Mario Kart Tour controls on your half of the screen (P1 top, P2 bottom): the kart drives itself; drag left/right to steer; push all the way to drift and hold it for blue, orange, then purple sparks; let go (or swing back) for a mini-turbo. Tap to use your item, swipe up to throw it ahead, swipe down to drop it behind. Keys: P1 A/D steer, S drift, W/Space item; P2 arrows, Down drift, Up/Enter item.':'BALLOON BATTLE: three balloons each on a floating rainbow ring. Hit your rival with shells, bananas and bob-ombs; a boosting bump steals a balloon; falling off costs one. Last kart with balloons, or the most when time runs out, wins. Mario Kart Tour controls on your half: drag to steer, push all the way to drift, tap for items, swipe up/down to throw ahead/behind.');
 refreshHeads(true);
 // ---------------------------------------------------------------- main loop
 s.frame((dt0)=>{
  if(!s.alive)return;const dt=Math.min(dt0,.05);simT+=dt;R.tick(dt);
  headTimer-=dt;if(headTimer<=0){headTimer=simT<6?.5:1.5;refreshHeads(simT<6);}else refreshHeads(false);
  if(phase==='intro'){introT+=dt;if(introT>2.4)phase='count';}
  else if(phase==='count'){const before=Math.floor(lights);lights+=dt*1.2;const now=Math.floor(lights);if(now!==before&&now>=1&&now<=4)sfx.light(now>=4);
   if(lights>=4){phase='play';for(let i=0;i<2;i++){const pd=pads[i],held=pd.f||kb.state[i].u||kb.state[i].d||kb.state[i].fire||auto[i];if(held&&pd.holdSince>=2&&pd.holdSince<4||auto[i]){Ph.setBoost(K[i],1);K[i].v=200;msg(K[i],'ROCKET START!','#ffb02e',20,1.1);sfx.boost();}}}}
  else{
   if(phase==='play'){clock+=dt;hintT-=dt;}
   for(const k of K)updateKart(k,dt);stepProjectiles(dt);contacts(dt);
   if(phase==='play'){
    if(mode==='race'&&(winner>=0||clock>=RACE_CAP)){phase='end';endT=0;if(winner<0){const a=K[0].best,b=K[1].best;winner=Math.abs(a-b)<.002?-2:a>b?0:1;}song?.victory();endText=winner===-2?'PHOTO FINISH!':`${s.players[winner].name.toUpperCase()} WINS THE CUP!`;}
    if(mode==='battle'&&(K.some(k=>k.out)||clock>=BATTLE_TIME)){phase='end';endT=0;const a=K[0].balloons,b=K[1].balloons;song?.victory();endText=a===b?'DRAW!':`${s.players[a>b?0:1].name.toUpperCase()} WINS THE BATTLE!`;jingle([523,659,784,1047],{step:.1,type:'square',vol:.04});}
   }else{endT+=dt;if(endT>3.2){
    if(mode==='race'){const prog=k=>k.finished?100:Math.min(99,Math.round(clamp(k.best/LAPS,0,1)*100)),sc=[prog(K[0]),prog(K[1])];if(winner>=0){sc[winner]=100;sc[1-winner]=Math.min(sc[1-winner],99);}
     const desc=k=>k.finished?`${Math.floor(k.finishT/60)}:${(k.finishT%60).toFixed(1).padStart(4,'0')}`:`lap ${Math.min(LAPS,k.lap+1)}`;s.finish(sc,`Rainbow Road: ${s.players[0].name} ${desc(K[0])}, ${s.players[1].name} ${desc(K[1])}.`);}
    else s.finish([K[0].balloons,K[1].balloons],`Balloon Battle: ${s.players[0].name} ${K[0].balloons} balloons left, ${s.players[1].name} ${K[1].balloons}.`);return;}}
  }
  for(let j=parts.length-1;j>=0;j--){const p=parts[j];p.life-=dt;if(p.life<=0){parts.splice(j,1);continue;}const dr=Math.exp(-p.drag*dt);p.V[0]*=dr;p.V[1]=p.V[1]*dr+(p.g||0)*dt;p.V[2]*=dr;p.P[0]+=p.V[0]*dt;p.P[1]+=p.V[1]*dt;p.P[2]+=p.V[2]*dt;}
  updateEngines();if(phase!=='intro'&&phase!=='end'&&!s.paused)song?.tick();if(mode==='race')song?.setRate(K.some(k=>k.lap===LAPS-1&&!k.finished)?1.08:1);
  if(mode==='race')s.setScores(K.map(k=>k.finished?100:Math.min(99,Math.round(clamp(k.best/LAPS,0,1)*100))));else s.setScores([K[0].balloons,K[1].balloons]);
  // render both halves into the GL canvas, then composite + HUD
  const W=s.W,H=s.H,half=Math.floor(H/2);R.resize(W,H);
  if(R.lost()){x.fillStyle='#120a2e';x.fillRect(0,0,W,H);return;}
  const views=[{x:0,y:0,w:W,h:half-1},{x:0,y:half+1,w:W,h:H-half-1}];
  const scene={course,karts:K,boxes,coins,particles:parts,blink:false,
   shells:shells.map(sh=>{const f=T.frame(course,sh.s,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]}),cp=Math.cos(sh.psi),sp=Math.sin(sh.psi);const F=[f.T[0]*cp+f.R[0]*sp,f.T[1]*cp+f.R[1]*sp,f.T[2]*cp+f.R[2]*sp];
    return {kind:sh.kind,P:[f.P[0]+f.R[0]*sh.d+f.U[0]*(sh.h+1),f.P[1]+f.R[1]*sh.d+f.U[1]*(sh.h+1),f.P[2]+f.R[2]*sh.d+f.U[2]*(sh.h+1)],F,N:f.U.slice(),R:T.cross(F,f.U)};}),
   bananas:bananas.map(b=>{const f=T.frame(course,b.s,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]});return {P:[f.P[0]+f.R[0]*b.d+f.U[0]*b.h,f.P[1]+f.R[1]*b.d+f.U[1]*b.h,f.P[2]+f.R[2]*b.d+f.U[2]*b.h],N:f.U.slice()};}),
   bombs:bombs.map(b=>{const f=T.frame(course,b.s,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]});return {P:[f.P[0]+f.R[0]*b.d+f.U[0]*b.h,f.P[1]+f.R[1]*b.d+f.U[1]*b.h,f.P[2]+f.R[2]*b.d+f.U[2]*b.h],N:f.U.slice(),fuse:b.fuse};})};
  const camsNow=views.map((v,i)=>cameraFor(i,dt,v));const proj=[];
  for(let i=0;i<2;i++){R.renderView(views[i],camsNow[i],scene,W,H);proj[i]=K.map(k=>k._head?R.project(k._head.P):null);}
  x.drawImage(glc,0,0,W,H);
  for(let i=0;i<2;i++){const v=views[i];x.save();x.beginPath();x.rect(v.x,v.y,v.w,v.h);x.clip();
   // heads drawn in 2D only when the portrait could not become a texture (cross-origin photo)
   for(const k of K)if(!R.headOK[k.i]&&proj[i][k.i]&&k._head){const p=proj[i][k.i],sz=k._head.size*2*v.h/(2*Math.tan(camsNow[i].fov/2)*p.w);if(sz>4&&sz<v.h)s.sprite(x,k.i,p.x,p.y,sz,{exact:true});}
   const k=K[i];drawHUD(x,v,{k,i,mode,laps:LAPS,rank:rankOf(k),t:simT,phase,lights,clock,course,other:K[1-i],pad:{f:pads[i].f,ox:pads[i].ox,latch:pads[i].latch},msgs:k.msgs,rad:RAD(),battleTime:BATTLE_TIME,
    names:s.players.map(p=>p.name),hint:phase==='play'||phase==='count'?Math.min(1,hintT):0,wrongWay:k.wrongT>1});
   x.restore();}
  x.fillStyle='#120a2e';x.fillRect(0,half-1,W,2);x.fillStyle='#ffe23a';x.fillRect(0,half-.5,W,1);
  if(phase==='end'){const a=Math.min(1,endT*3),size=Math.min(W*.065,H*.065,46);x.save();x.globalAlpha=a;x.fillStyle='rgba(18,10,46,.6)';x.fillRect(0,H*.42,W,H*.16);
   x.font=`900 ${size}px "Arial Black",Impact,system-ui,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=size*.2;x.strokeStyle='#120a2e';x.lineJoin='round';x.strokeText(endText,W/2,H/2);x.fillStyle='#ffe23a';x.fillText(endText,W/2,H/2);x.restore();}
 });
}
Object.assign(exports,{kart});
