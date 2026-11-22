// TMNT · SEWER CLASH: a single-screen sewer brawl played like the 1983 arcade Mario Bros. (same mechanics; our own
// sewer layouts, enemies and art). Turtles can't jump through ledges: jumping under one BUMPS it, and a bump flips the
// enemy standing on it onto its back. Touch a flipped enemy to KICK it out; touch an upright one and you lose a life.
// Flipped enemies get back up faster and angrier; the last one of a phase turns blue and fast. Enemies drop out of the top
// pipes, walk down ledge to ledge and go back in the bottom pipes. Every kick sends a PIZZA slice out of a top pipe (the
// arcade's coin). POW block in the middle: bump it to flip everything on the ground (3 uses). Phases get harder; some are
// PIZZA PARTY bonus phases (grab every slice before the clock runs out).
// Enemies: FOOT SOLDIER (one bump), MOUSER (two bumps: the first makes it mad), KRANG POD (hops; only flips while it is
// down on a ledge), OOZE (glowing mutagen blob drifting across the screen: dodge it, or bump it from under its ledge).
// 1P = solo kind 'levels' (phase after phase until the last life). 2P one phone = both turtles on the same screen, each
// with their own score; ends when both are out (board game: after phase 3). Online: player 1's phone runs the sewer
// (enemies, pizza, ooze, POW, phases, scores, lives) and streams it {f.w}; each phone moves its own turtle and judges its
// own deaths; the other phone's bumps/kicks/pizza grabs/POW hits/deaths go to player 1's phone as events.
const {clamp,seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {netField}=require("src/engines/netField.js");
const {snd}=require("src/engines/arenaKit.js");
const {createControls}=require("src/engines/sundown/controls.js");

// ---- world (units; the arena is 256 x 224 like an arcade screen)
const AW=256,AH=224,FLOOR=200,PW=12,PH=16,G=1000,JUMP=342,RUN=74,ACC=520,AIR=160,FALL=300,LIVES=3;
const POW={x0:118,x1:138,y0:160,y1:176};
const LAYOUTS=[
 [{x0:0,x1:100,y:152},{x0:156,x1:256,y:152},{x0:52,x1:204,y:104},{x0:0,x1:22,y:104},{x0:234,x1:256,y:104},{x0:0,x1:106,y:56},{x0:150,x1:256,y:56}],
 [{x0:0,x1:84,y:152},{x0:172,x1:256,y:152},{x0:36,x1:112,y:104},{x0:144,x1:220,y:104},{x0:0,x1:96,y:56},{x0:160,x1:256,y:56},{x0:112,x1:144,y:56}],
 [{x0:0,x1:92,y:152},{x0:164,x1:256,y:152},{x0:0,x1:60,y:104},{x0:84,x1:172,y:104},{x0:196,x1:256,y:104},{x0:0,x1:104,y:56},{x0:152,x1:256,y:56}]];
const PLAT_H=8;
const TYPES={foot:{sp:26,h:14,hp:1,pts:800},mouser:{sp:30,h:12,hp:2,pts:800},pod:{sp:30,h:14,hp:1,pts:800,hop:true}};
const TIER_K=[1,1.35,1.75,2.2];
const PALS=[['#3f6f9f','#86b7e8','#1e3a58'],['#2f8a4a','#86e09a','#16452a'],['#9a5a2a','#e0a86a','#4a2a12'],['#6a4a9a','#b89ae8','#30224a'],['#8a2a3a','#e07a8a','#40121a']];
const wrapX=x=>((x%AW)+AW)%AW;
const isBonus=n=>n===3||n>3&&(n-3)%5===0;
function phaseDef(n,seed){
 if(isBonus(n))return {bonus:true,layout:(n>>1)%LAYOUTS.length};
 const fixed={1:['foot','foot','foot'],2:['foot','foot','foot','foot','foot'],4:['mouser','mouser','mouser','mouser'],5:['foot','foot','mouser','mouser','mouser'],
  6:['pod','pod','pod','pod'],7:['foot','foot','pod','pod','mouser','mouser']};
 let list=fixed[n];
 if(!list){const r=seededRandom(seed+':sewer-phase:'+n),cnt=Math.min(9,4+Math.floor(n/3));list=[];for(let i=0;i<cnt;i++)list.push(['foot','mouser','pod'][Math.floor(r()*3)]);}
 return {list,layout:Math.floor((n-1)/2)%LAYOUTS.length,ooze:n>=2,speed:1+Math.min(.5,(n-1)*.04),flipT:clamp(7-n*.3,3.2,7)};
}

async function sewer(s){
 const [c,x]=s.canvas(900,560,{fill:true});const fb=fullBleed(s,{bg:'#05100c'});
 const on=s.online||null,me=on?on.me:0,them=1-me,host=!on||me===0,solo=!!s.solo&&!on,nP=solo?1:2,board=s.origin==='board'&&!on;
 const ctl=createControls(s,c,{np:on?1:nP,solo:solo||!!on,jumpOnly:true});
 const seed=String(s.seed||1),names=s.players.map(p=>p.name||'Player');
 // ---- state
 const P=[0,1].slice(0,nP).map(i=>({i,x:nP===1?128:i?168:88,y:FLOOR,vx:0,vy:0,g:true,face:i?-1:1,dead:0,inv:0,out:false,score:0,lives:LIVES,kickT:0,combo:0,mood:'walking',moodT:0,oneUp:false,spawnPlat:0}));
 const W={phase:0,def:null,plats:LAYOUTS[0],E:[],Z:[],O:[],bumps:[],pow:3,powT:0,spawnQ:[],spawnT:0,clearT:0,cardT:0,bonusT:0,oozeT:0,nid:1,over:false,shake:0,texts:[]};
 let mode='intro',t=0,cleared=0,remote=null,autodrive=false,lastE=new Map();
 const pending=new Set();   // guest: ids it kicked/grabbed, hidden until the next snapshot drops them
 const say=(txt,x0,y0,col='#fff3b9')=>W.texts.push({txt,x:x0,y:y0,t:0,col});
 const sfx={jump:()=>snd(330,.12,{type:'square',vol:.035,to:660}),bump:()=>snd(140,.08,{type:'square',vol:.05,to:90}),flip:()=>{snd(520,.06,{type:'square',vol:.04});snd(780,.08,{type:'square',vol:.04,delay:.05});},
  kick:()=>{snd(900,.05,{type:'square',vol:.05});snd(1200,.12,{type:'square',vol:.045,delay:.05,to:300});},pizza:()=>{snd(988,.06,{type:'square',vol:.04});snd(1319,.14,{type:'square',vol:.04,delay:.06});},
  die:()=>{snd(660,.15,{type:'square',vol:.05,to:180});snd(200,.4,{type:'triangle',vol:.05,delay:.15,to:60});},pow:()=>{snd(60,.35,{type:'sawtooth',vol:.09,to:30});snd(120,.2,{type:'square',vol:.05});},
  pipe:()=>snd(220,.18,{type:'square',vol:.03,to:440}),phase:()=>[523,659,784,1047].forEach((f,i)=>snd(f,.12,{type:'square',vol:.035,delay:i*.11})),up:()=>[659,784,988,1319].forEach((f,i)=>snd(f,.08,{type:'square',vol:.04,delay:i*.07})),
  ooze:()=>snd(90,.25,{type:'sine',vol:.05,to:200})};
 const mood=(p,m,d=.9)=>{p.mood=m;p.moodT=d;};
 const addScore=(i,n,x0,y0)=>{const p=P[i];if(!p)return;p.score+=n;if(x0!=null)say(String(n),x0,y0);if(!p.oneUp&&p.score>=20000){p.oneUp=true;p.lives++;sfx.up();say('1-UP',p.x,p.y-24,'#8fff7a');}};

 // ---- geometry
 const platAt=(px,y,tol=1.5)=>{for(let k=0;k<W.plats.length;k++){const q=W.plats[k];if(Math.abs(q.y-y)<=tol&&px>=q.x0-3&&px<=q.x1+3)return k;}return y>=FLOOR-tol?-1:-2;};
 const onPow=(px,y)=>W.pow>0&&Math.abs(y-POW.y0)<=1.5&&px>=POW.x0-3&&px<=POW.x1+3;
 // move a body (player/enemy/pizza) one step: vertical first with ledge landing; heads bump ledge undersides (players only)
 function body(b,dt,{bumper=-1,h=PH}={}){
  const py=b.y;b.vy=Math.min(FALL,b.vy+G*dt);b.y+=b.vy*dt;b.x=wrapX(b.x+b.vx*dt);b.g=false;
  if(b.vy>=0){ // land on a ledge, the POW block or the floor
   if(b.y>=FLOOR){b.y=FLOOR;b.vy=0;b.g=true;return;}
   for(const q of W.plats)if(py<=q.y+.01&&b.y>=q.y&&b.x>=q.x0-4&&b.x<=q.x1+4){b.y=q.y;b.vy=0;b.g=true;return;}
   if(W.pow>0&&py<=POW.y0+.01&&b.y>=POW.y0&&b.x>=POW.x0-4&&b.x<=POW.x1+4){b.y=POW.y0;b.vy=0;b.g=true;return;}
  }else if(bumper>=0){const head=b.y-h,phead=py-h;
   for(let k=0;k<W.plats.length;k++){const q=W.plats[k],bot=q.y+PLAT_H;if(phead>=bot-.01&&head<bot&&b.x>=q.x0&&b.x<=q.x1){b.y=bot+h;b.vy=40;bump(k,b.x,bumper);return;}}
   if(W.pow>0&&phead>=POW.y1-.01&&head<POW.y1&&b.x>=POW.x0-2&&b.x<=POW.x1+2){b.y=POW.y1+h;b.vy=40;powHit(bumper);return;}}
 }

 // ---- bumps, POW, flips, kicks (run on player 1's phone; the guest sends events and shows the wave at once)
 function bump(k,bx,by){W.bumps.push({k,x:bx,t:0});sfx.bump();vibrate(6);
  if(!host){nf?.event({bp:[k,Math.round(bx)]});return;}
  hitAt(k,bx,by);}
 function hitAt(k,bx,by){const q=W.plats[k];if(!q)return;
  for(const e of W.E)if(!e.dead&&e.g&&!(e.emerge>0)&&Math.abs(e.y-q.y)<1.5&&Math.abs(dx(e.x,bx))<16)hitEnemy(e,by);
  for(const z of W.Z)if(z.g&&Math.abs(z.y-q.y)<1.5&&Math.abs(dx(z.x,bx))<14){grab(z,by);}
  for(const o of W.O)if(!o.dead&&Math.abs(dx(o.x,bx))<20&&o.y<q.y&&o.y>q.y-30){o.dead=true;addScore(by,1000,o.x,o.y-10);sfx.kick();}
  for(const p of P)if(p.i!==by&&!p.dead&&p.g&&Math.abs(p.y-q.y)<1.5&&Math.abs(dx(p.x,bx))<14){p.vy=-200;p.g=false;remotePop(p.i);}}
 const remotePop=i=>{if(on&&i===them)nf?.event({pop:1});};
 function powHit(by){if(W.pow<=0)return;W.powT=.25;W.shake=.4;sfx.pow();vibrate(25);
  if(!host){W.pow--;nf?.event({pw:1});return;}
  W.pow--;for(const e of W.E)if(!e.dead&&e.g&&!(e.emerge>0))hitEnemy(e,by,true);for(const o of W.O)if(!o.dead){o.dead=true;addScore(by,1000,o.x,o.y-10);}
  for(const p of P)if(!p.dead&&p.g){p.vy=-150;p.g=false;}}
 const dx=(a,b)=>{let d=a-b;if(d>AW/2)d-=AW;if(d<-AW/2)d+=AW;return d;};
 function hitEnemy(e,by,pow=false){const T=TYPES[e.type];
  if(T.hop&&!e.g)return;
  if(e.flip>0){e.flip=0;e.vy=-120;e.g=false;sfx.flip();return;}        // bumped again: back on its feet
  if(e.type==='mouser'&&!e.mad&&!pow){e.mad=true;e.tier=Math.min(3,e.tier+1);e.vy=-90;e.g=false;sfx.bump();return;}
  e.flip=W.def.flipT;e.vy=-140;e.g=false;e.vx=0;e.by=by;sfx.flip();addScore(by,10);}
 function kick(e,i){if(e.dead)return;e.dead=true;e.flip=0;e.vy=-220;e.vx=(dx(e.x,P[i]?.x??e.x)>=0?1:-1)*70;e.dying=1.6;
  const p=P[i];if(p){p.combo=p.kickT>0?p.combo+1:1;p.kickT=1.2;addScore(i,TYPES[e.type].pts*Math.min(4,p.combo),e.x,e.y-14);mood(p,'happy');}
  sfx.kick();vibrate(12);W.Z.push(newPizza());}
 function grab(z,i){if(z.dead)return;z.dead=true;addScore(i,800,z.x,z.y-12);sfx.pizza();if(P[i])mood(P[i],'happy',.6);}
 const newPizza=(side=Math.random()<.5?0:1)=>({id:W.nid++,x:side?240:16,y:40,vx:side?-34:34,vy:0,g:false,emerge:.7,dead:false});

 // ---- phases
 function startPhase(n){W.phase=n;W.def=phaseDef(n,seed);W.plats=LAYOUTS[W.def.layout];W.E=[];W.Z=[];W.O=[];W.bumps=[];W.texts=[];W.clearT=0;W.cardT=2;
  W.spawnQ=W.def.bonus?[]:[...W.def.list];W.spawnT=1.6;W.oozeT=12+Math.random()*6;
  if(W.def.bonus){W.bonusT=20;W.pow=3;const spots=[];for(const q of W.plats){const n2=Math.max(1,Math.floor((q.x1-q.x0)/40));for(let j=0;j<n2;j++)spots.push([q.x0+(j+.5)*(q.x1-q.x0)/n2,q.y]);}
   const r=seededRandom(seed+':bonus:'+n);spots.sort(()=>r()-.5);for(const [px,py] of spots.slice(0,10))W.Z.push({id:W.nid++,x:px,y:py,vx:0,vy:0,g:true,still:true,dead:false});}
  for(const p of P)if(!p.out&&!p.dead){p.x=nP===1?128:p.i?168:88;p.y=FLOOR;p.vx=p.vy=0;p.inv=1;}
  sfx.phase();soloProgress(s,P[0].score,cleared,`Phase ${n}`);mode='play';}
 function spawnEnemy(type){const side=W.nid%2,T=TYPES[type];return {id:W.nid++,type,x:side?240:16,y:44,vx:0,vy:0,dir:side?-1:1,g:false,emerge:.8,flip:0,tier:0,mad:false,dead:false,hop:.5,h:T.h};}
 function enemyStep(e,dt){const T=TYPES[e.type];
  if(e.dead){e.vy+=G*dt;e.y+=e.vy*dt;e.x=wrapX(e.x+e.vx*dt);e.dying-=dt;return;}
  if(e.emerge>0){e.emerge-=dt;e.x+=e.dir*14*dt;if(e.emerge<=0){e.y=44;e.vy=0;}return;}
  const live=W.E.filter(q=>!q.dead).length,last=live===1&&!W.spawnQ.length,sp=T.sp*TIER_K[last?3:e.tier]*W.def.speed*(e.mad?1.3:1);
  if(e.flip>0){e.flip-=dt;e.vx=0;body(e,dt);if(e.flip<=0){e.tier=Math.min(3,e.tier+1);e.mad=false;e.vy=-100;}return;}
  if(T.hop){if(e.g){e.vx=0;e.hop-=dt;if(e.hop<=0){e.vy=-230;e.vx=e.dir*sp*1.2;e.hop=.55;}}}
  else e.vx=e.dir*sp;
  body(e,dt);
  // bottom pipes: back to the top
  if(e.g&&e.y>=FLOOR-.5&&((e.dir<0&&e.x<12)||(e.dir>0&&e.x>AW-12))){const side=e.dir<0?0:1;e.x=side?240:16;e.y=44;e.dir=side?-1:1;e.emerge=.8;e.g=false;sfx.pipe();}}
 function pizzaStep(z,dt){if(z.still||z.dead)return;if(z.emerge>0){z.emerge-=dt;z.x+=Math.sign(z.vx)*14*dt;if(z.emerge<=0){z.y=44;z.vy=0;}return;}
  body(z,dt);if(z.g&&z.y>=FLOOR-.5&&((z.vx<0&&z.x<12)||(z.vx>0&&z.x>AW-12)))z.dead=true;}
 function oozeStep(o,dt){o.x+=o.vx*dt;o.t+=dt;o.y=o.y0+Math.sin(o.t*2.6)*9;if(o.x<-20||o.x>AW+20){o.pass++;if(o.pass>2)o.dead=true;else{o.vx=-o.vx;o.y0=[48,96,144,188][Math.floor(Math.random()*4)]-6;}}}

 // ---- players
 function playerStep(p,inp,dt){
  if(p.out)return;
  if(p.dead>0){p.dead-=dt;p.vy+=G*.6*dt;p.y+=p.vy*dt;if(p.dead<=0)respawn(p);return;}
  p.inv=Math.max(0,p.inv-dt);p.kickT=Math.max(0,p.kickT-dt);if(p.moodT>0){p.moodT-=dt;if(p.moodT<=0)p.mood='walking';}
  const want=inp.x;if(want)p.face=want;
  if(p.g){const tgt=want*RUN;p.vx+=clamp(tgt-p.vx,-ACC*dt,ACC*dt);if(inp.jumps>0){p.vy=-JUMP;p.g=false;sfx.jump();}}
  else{p.vx+=clamp(want*RUN-p.vx,-AIR*dt,AIR*dt);}
  if(p.spawnPlat>0){p.spawnPlat-=dt;if(want||inp.jumps||p.spawnPlat<=0)p.spawnPlat=0;else{p.vx=0;p.vy=0;p.g=true;return;}}
  const steps=Math.ceil(dt*240),h=dt/steps;for(let k=0;k<steps;k++)body(p,h,{bumper:p.i});
  // touch enemies / pizza / ooze (each phone judges only its own turtle)
  if(!mine(p.i))return;
  for(const e of W.E){if(e.dead||e.emerge>0||pending.has('e'+e.id))continue;const ddx=Math.abs(dx(e.x,p.x)),ddy=Math.abs((e.y-e.h/2)-(p.y-PH/2));
   if(ddx<11&&ddy<(e.h+PH)/2-2){if(e.flip>0){if(host)kick(e,p.i);else{pending.add('e'+e.id);nf?.event({kk:e.id});e.dead=true;e.vy=-220;e.dying=1.6;sfx.kick();}}else if(!p.inv)die(p);}}
  for(const z of W.Z){if(z.dead||z.emerge>0||pending.has('z'+z.id))continue;if(Math.abs(dx(z.x,p.x))<11&&Math.abs(z.y-p.y)<14){if(host)grab(z,p.i);else{pending.add('z'+z.id);nf?.event({pz:z.id});z.dead=true;sfx.pizza();}}}
  for(const o of W.O)if(!o.dead&&!p.inv&&Math.abs(dx(o.x,p.x))<10&&Math.abs(o.y-(p.y-PH/2))<12)die(p);}
 const mine=i=>!on||i===me;
 function die(p){if(p.dead>0||p.out)return;p.dead=1.6;p.vy=-260;p.vx=0;mood(p,'sad',2);sfx.die();vibrate(40);if(on&&p.i===me&&!host)nf?.event({dd:1});if(host)p.lives--;}
 function respawn(p){if(host&&p.lives<=0){p.out=true;return;}if(!host&&remote?.lv&&remote.lv[p.i]<=0){p.out=true;return;}
  p.x=128;p.y=24;p.vx=p.vy=0;p.g=true;p.inv=2.5;p.spawnPlat=3;p.mood='walking';}

 // ---- online
 const packE=e=>[e.id,['foot','mouser','pod'].indexOf(e.type),Math.round(e.x*10)/10,Math.round(e.y*10)/10,e.dir,e.flip>0?1:0,e.tier+(e.mad?10:0),e.emerge>0?1:0,e.dead?1:0,Math.round(e.vx)];
 const nf=netField(s,{hz:20,
  pack:()=>{const p=P[me],o={p:[Math.round(p.x*10)/10,Math.round(p.y*10)/10,Math.round(p.vx),p.face,p.g?1:0,p.dead>0?1:0,p.inv>0?1:0,p.out?1:0,p.mood]};
   if(host)o.w={ph:W.phase,e:W.E.map(packE),z:W.Z.filter(z=>!z.dead).map(z=>[z.id,Math.round(z.x),Math.round(z.y),z.emerge>0?1:0,Math.round(z.vx)]),o:W.O.filter(q=>!q.dead).map(q=>[q.id,Math.round(q.x),Math.round(q.y)]),
    pw:W.pow,b:W.bumps.map(b=>[b.k,Math.round(b.x)]),sc:P.map(q=>q.score),lv:P.map(q=>q.lives),bt:Math.ceil(W.bonusT),cd:W.cardT>0?1:0,ov:W.over?1:0,cl:cleared,
    tx:W.texts.filter(q=>q.t<.1).map(q=>[q.txt,Math.round(q.x),Math.round(q.y),q.col])};
   return o;},
  unpack:(i,d)=>{if(!d)return;if(Array.isArray(d.p)){const [px,py,vx,face,g,dead,inv,out,md]=d.p;remote={...remote,x:+px,y:+py,vx:+vx||0,face:face||1,g:!!g,dead:!!dead,inv:!!inv,out:!!out,mood:md||'walking',at:performance.now()};}
   if(d.w&&!host)applyWorld(d.w);},
  onEvent:e=>{if(!e)return;if(!host){if(e.pop&&P[me]&&!P[me].dead){P[me].vy=-200;P[me].g=false;}return;}const i=them,p=P[i];
   if(Array.isArray(e.bp)){const [k,bx]=e.bp;W.bumps.push({k,x:bx,t:0});hitAt(k,bx,i);}
   if(e.pw){if(W.pow>0){W.powT=.25;W.shake=.4;W.pow--;for(const q of W.E)if(!q.dead&&q.g&&!(q.emerge>0))hitEnemy(q,i,true);for(const o of W.O)if(!o.dead){o.dead=true;addScore(i,1000,o.x,o.y-10);}sfx.pow();}}
   if(e.kk!=null){const q=W.E.find(q=>q.id===e.kk);if(q&&!q.dead&&q.flip>0)kick(q,i);}
   if(e.pz!=null){const z=W.Z.find(z=>z.id===e.pz);if(z&&!z.dead)grab(z,i);}
   if(e.dd&&p&&!p.out){p.lives--;p.dead=1.6;}}});
 function applyWorld(w){
  if(w.ph!==W.phase){W.phase=w.ph;W.def=phaseDef(w.ph,seed);W.plats=LAYOUTS[W.def.layout];W.E=[];W.Z=[];W.O=[];pending.clear();if(w.ph>0){sfx.phase();W.cardT=2;}}
  const E=new Map(W.E.map(e=>[e.id,e]));W.E=(w.e||[]).map(a=>{const [id,ti,ex,ey,dir,fl,tier,em,dead,vx]=a,old=E.get(id),type=['foot','mouser','pod'][ti]||'foot';
   const e=old||{id,type,x:ex,y:ey,h:TYPES[type].h,vy:0};e.tx=ex;e.ty=ey;e.dir=dir;e.flip=fl?1:0;e.tier=tier%10;e.mad=tier>=10;e.emerge=em?1:0;e.vx=vx;e.g=true;
   if(dead&&!e.dead){e.dead=true;e.vy=-220;e.dying=1.6;}if(!old){e.x=ex;e.y=ey;}if(pending.has('e'+id)&&!dead)e.dead=true;return e;});
  for(const id of [...pending])if(id[0]==='e'&&!W.E.some(e=>'e'+e.id===id))pending.delete(id);
  const Z=new Map(W.Z.map(z=>[z.id,z]));W.Z=(w.z||[]).filter(a=>!pending.has('z'+a[0])).map(([id,zx,zy,em,vx])=>{const z=Z.get(id)||{id,x:zx,y:zy};z.tx=zx;z.ty=zy;z.emerge=em;z.vx=vx;return z;});
  for(const id of [...pending])if(id[0]==='z'&&!(w.z||[]).some(a=>'z'+a[0]===id))pending.delete(id);
  W.O=(w.o||[]).map(([id,ox,oy])=>({id,x:ox,y:oy}));W.pow=w.pw;for(const b of w.b||[])if(!W.bumps.some(q=>q.k===b[0]&&Math.abs(q.x-b[1])<2))W.bumps.push({k:b[0],x:b[1],t:0});
  for(const [i,sc] of (w.sc||[]).entries())if(P[i])P[i].score=sc;for(const [i,lv] of (w.lv||[]).entries())if(P[i])P[i].lives=lv;
  for(const [txt,tx,ty,col] of w.tx||[])if(!W.texts.some(q=>q.txt===txt&&q.x===tx&&q.y===ty))say(txt,tx,ty,col);
  W.bonusT=w.bt;cleared=w.cl||0;remote={...remote,lv:w.lv};if(w.ov&&!W.over){W.over=true;}}

 // ---- CPU autopilot (tests, online bot): kick what is flipped on its level, else bump from under enemies, dodge the rest
 function auto(p){const inp={x:0,y:0,jumps:0};if(p.dead||p.out)return inp;
  const lvl=platAt(p.x,p.y,2),here=W.E.filter(e=>!e.dead&&!(e.emerge>0)&&Math.abs(e.y-p.y)<3);
  const flipped=here.find(e=>e.flip>0);if(flipped){inp.x=Math.sign(dx(flipped.x,p.x))||1;return inp;}
  const danger=here.find(e=>!e.flip&&Math.abs(dx(e.x,p.x))<30&&Math.sign(dx(p.x,e.x))===e.dir);
  if(danger&&p.g){inp.jumps=1;inp.x=-Math.sign(dx(danger.x,p.x));return inp;}
  // enemy on the ledge right above: get under it and jump
  const above=W.E.filter(e=>!e.dead&&!(e.emerge>0)&&!e.flip&&e.g&&e.y<p.y-30&&e.y>p.y-60).sort((a,b)=>Math.abs(dx(a.x,p.x))-Math.abs(dx(b.x,p.x)))[0];
  if(above){const d=dx(above.x,p.x);inp.x=Math.abs(d)>6?Math.sign(d):0;if(Math.abs(d)<14&&p.g&&platAt(above.x,above.y)>=0)inp.jumps=1;return inp;}
  const z=W.Z.find(z=>!z.dead&&Math.abs(z.y-p.y)<3);if(z){inp.x=Math.sign(dx(z.x,p.x));return inp;}
  if(lvl!==-1){inp.x=p.face||1;return inp;}   // up on a ledge with nothing to do: walk off it
  inp.x=Math.sin(t*.7+p.i)>0?1:-1;return inp;}

 s.debug={engine:'sewer',W,P,get mode(){return mode;},set autopilot(v){autodrive=!!v;},get autopilot(){return autodrive;},
  killAll(){for(const e of W.E)if(!e.dead)kick(e,0);W.spawnQ=[];},die:(i=0)=>{if(P[i]){P[i].inv=0;die(P[i]);}},flipAll(){for(const e of W.E)if(!e.dead&&!(e.emerge>0)){e.flip=5;e.g=true;}},
  phase:n=>startPhase(n),bot:on?()=>{if(autodrive)return '';autodrive=true;return 'drive';}:null};

 const intro=solo?'Sewer Clash! Jump UNDER a ledge to flip the enemy standing on it, then touch it to kick it out. Touching an upright enemy costs a life. Clear every enemy to finish the phase.'
  :on?'Sewer Clash together! Bump ledges from below to flip enemies, kick them out, grab the pizza. Most points wins.':'Both turtles on one screen: left half is P1, right half is P2. Bump ledges from below to flip enemies, kick them out, grab the pizza. Most points wins.';
 if(!await s.pass(0,intro,'Cowabunga!'))return;
 if(on){mode='sync';await nf.start('go');if(!s.alive)return;}
 if(host)startPhase(1);else{mode='play';W.def=phaseDef(1,seed);}

 // ---- layout on screen
 let k=1,ox=0,oy=0,hudY=0;
 function layout(){const Wd=s.W,Hd=s.H,top=(fb.top||40)+6,tall=Hd>Wd*1.15;
  const ctrlH=tall?Math.min(190,Hd*.24):0;k=Math.min(Wd/AW,(Hd-top-26-ctrlH)/AH);if(!tall)k=Math.min(k,(Wd-40)/AW);
  ox=(Wd-AW*k)/2;oy=top+26+Math.max(0,(Hd-top-26-ctrlH-AH*k)/2)*(tall?.6:1);hudY=Math.max(6,oy-24);ctl.layout(Wd,Hd);}
 const SX=v=>ox+v*k,SY=v=>oy+v*k;

 s.frame(dt=>{dt=Math.min(dt,.05);t+=dt;layout();
  if(s.paused)return draw();
  // inputs
  for(const p of P){if(!mine(p.i))continue;let inp=ctl.read(nP===1||on?0:p.i);if(autodrive||s.debug.autopilot)inp=auto(p);if(mode==='play'&&W.cardT<=0)playerStep(p,inp,dt);else if(mode==='play')playerStep(p,{x:0,y:0,jumps:0},dt);}
  if(on&&remote&&P[them]){const o=P[them],kk=Math.min(.15,(performance.now()-remote.at)/1000);const tx=wrapX(remote.x+remote.vx*kk);
   if(Math.abs(dx(tx,o.x))>40)o.x=tx;else o.x=wrapX(o.x+dx(tx,o.x)*Math.min(1,dt*16));o.y+=(remote.y-o.y)*Math.min(1,dt*16);o.vx=remote.vx;o.face=remote.face;o.g=remote.g;o.mood=remote.mood;o.out=remote.out;o.inv=remote.inv?1:0;o.dead=remote.dead?1:0;}
  if(W.cardT>0)W.cardT-=dt;
  for(const b of W.bumps)b.t+=dt;W.bumps=W.bumps.filter(b=>b.t<.3);W.powT=Math.max(0,W.powT-dt);W.shake=Math.max(0,W.shake-dt);
  for(const q of W.texts){q.t+=dt;q.y-=12*dt;}W.texts=W.texts.filter(q=>q.t<1);
  if(host&&mode==='play'&&W.cardT<=0)worldStep(dt);
  else if(!host&&mode==='play'){ // guest: ease the host's world
   for(const e of W.E){if(e.dead){e.vy+=G*dt;e.y+=e.vy*dt;continue;}if(e.tx==null)continue;e.tx=wrapX(e.tx+(e.flip||e.emerge?0:e.vx*dt));const d=dx(e.tx,e.x);e.x=Math.abs(d)>30?e.tx:wrapX(e.x+d*Math.min(1,dt*14));e.y+=(e.ty-e.y)*Math.min(1,dt*14);}
   for(const z of W.Z){if(z.tx==null)continue;z.tx=wrapX(z.tx+(z.emerge?0:z.vx*dt));const d=dx(z.tx,z.x);z.x=Math.abs(d)>30?z.tx:wrapX(z.x+d*Math.min(1,dt*14));z.y+=(z.ty-z.y)*Math.min(1,dt*14);}}
  if(nf&&mode!=='intro')nf.tick(dt);
  // the end
  if(mode==='play'){
   const allOut=P.every(p=>p.out)||on&&P[me].out&&(remote?.out||nf?.gone);
   if(host&&(allOut||W.over)){W.over=true;finish();}
   else if(!host&&(W.over||P[me].out&&remote?.out)){finish();}}
  draw();});

 function worldStep(dt){
  // spawn the phase's enemies from the top pipes one at a time
  if(W.spawnQ.length){W.spawnT-=dt;if(W.spawnT<=0){W.E.push(spawnEnemy(W.spawnQ.shift()));W.spawnT=2.2/W.def.speed;sfx.pipe();}}
  for(const e of W.E)enemyStep(e,dt);W.E=W.E.filter(e=>!e.dead||e.dying>0);
  for(const z of W.Z)pizzaStep(z,dt);W.Z=W.Z.filter(z=>!z.dead);
  if(W.def.ooze&&W.E.some(e=>!e.dead)){W.oozeT-=dt;if(W.oozeT<=0){W.oozeT=16+Math.random()*8;const side=Math.random()<.5;W.O.push({id:W.nid++,x:side?AW+10:-10,y0:[48,96,144,188][Math.floor(Math.random()*4)]-6,y:0,vx:side?-46:46,t:0,pass:0,dead:false});sfx.ooze();}}
  for(const o of W.O)oozeStep(o,dt);W.O=W.O.filter(o=>!o.dead);
  if(W.def.bonus){W.bonusT-=dt;const left=W.Z.filter(z=>!z.dead).length;
   if(left===0||W.bonusT<=0){if(left===0){for(const p of P)if(!p.out)addScore(p.i,nP===1?5000:3000,p.x,p.y-30);say('PERFECT!',128,90,'#8fff7a');sfx.up();}nextPhase();}return;}
  if(!W.spawnQ.length&&!W.E.some(e=>!e.dead)){W.clearT+=dt;if(W.clearT>1.4)nextPhase();}}
 function nextPhase(){cleared=W.phase;soloProgress(s,P[0].score,cleared,`Phase ${cleared} cleared`);
  if(board&&cleared>=3){W.over=true;return;}
  for(const p of P)if(p.out&&!solo){/* out stays out */}
  startPhase(W.phase+1);}
 let done=false;
 async function finish(){if(done)return;done=true;mode='over';
  const sc=P.map(p=>p.score);
  if(solo){soloFinish(s,sc[0],cleared,`Sewer Clash · phase ${W.phase} · ${sc[0].toLocaleString()} pts`,cleared>0);return;}
  if(on){if(host){nf.push();nf.finish({sc});s.finish(sc,'TMNT · Sewer Clash');}
   else{const r=await nf.remoteDone();const fsc=Array.isArray(r?.sc)?r.sc:sc;s.finish(fsc,'TMNT · Sewer Clash');}return;}
  s.finish(sc,'TMNT · Sewer Clash');}

 // ---- drawing
 const pal=()=>PALS[(Math.max(1,W.phase)-1)%PALS.length];
 function draw(){const Wd=s.W,Hd=s.H;x.setTransform(1,0,0,1,0,0);
  // sewer wall behind everything
  x.fillStyle='#05100c';x.fillRect(0,0,Wd,Hd);
  const sh=W.shake>0?(Math.random()-.5)*6*W.shake:0;x.save();x.translate(0,sh);
  x.save();x.beginPath();x.rect(ox,oy,AW*k,AH*k);x.clip();
  const bg=x.createLinearGradient(0,oy,0,oy+AH*k);bg.addColorStop(0,'#0c1d17');bg.addColorStop(1,'#13291f');x.fillStyle=bg;x.fillRect(ox,oy,AW*k,AH*k);
  x.fillStyle='#183428';for(let yy=0;yy<AH;yy+=8)for(let xx=(yy/8)%2*8;xx<AW;xx+=16)x.fillRect(SX(xx)+.5,SY(yy)+.5,15*k-1,7*k-1);
  // arches and drips
  x.fillStyle='#08140f';for(const ax of [64,192]){x.beginPath();x.moveTo(SX(ax-40),SY(FLOOR));x.lineTo(SX(ax-40),SY(120));x.arc(SX(ax),SY(120),40*k,Math.PI,0);x.lineTo(SX(ax+40),SY(FLOOR));x.fill();}
  for(let q=0;q<5;q++){const dxp=24+q*52,d=((t*.9+q*.31)%1);x.fillStyle=`rgba(125,255,106,${.7*(1-d)})`;x.beginPath();x.arc(SX(dxp),SY(10+d*180),1.6*k,0,7);x.fill();}
  const [c0,c1,c2]=pal();
  // ledges (bumped bricks rise)
  W.plats.forEach((q,ki)=>{for(let bx=q.x0;bx<q.x1;bx+=8){let lift=0;for(const b of W.bumps)if(b.k===ki){const d=Math.abs(dx(bx+4,b.x));if(d<16)lift=Math.max(lift,Math.sin(b.t/.3*Math.PI)*6*(1-d/16));}
    const X=SX(bx),Y=SY(q.y-lift);x.fillStyle=c2;x.fillRect(X,Y+2*k,8*k,PLAT_H*k-2*k);x.fillStyle=c0;x.fillRect(X+.5,Y,8*k-1,PLAT_H*k-2*k);x.fillStyle=c1;x.fillRect(X+.5,Y,8*k-1,1.4*k);
    x.fillStyle=c2;x.fillRect(X+2*k,Y+2.5*k,4*k,.9*k);x.fillRect(X+2*k,Y+4.3*k,4*k,.9*k);}});
  // floor: grate + ooze channel
  x.fillStyle='#3a434c';x.fillRect(SX(0),SY(FLOOR),AW*k,8*k);x.fillStyle='#5a656f';x.fillRect(SX(0),SY(FLOOR),AW*k,1.5*k);
  x.strokeStyle='#22292f';x.lineWidth=Math.max(1,k*.6);for(let gx=4;gx<AW;gx+=6){x.beginPath();x.moveTo(SX(gx),SY(FLOOR+2));x.lineTo(SX(gx),SY(FLOOR+7));x.stroke();}
  x.fillStyle='#2fae3a';x.fillRect(SX(0),SY(FLOOR+8),AW*k,(AH-FLOOR-8)*k);x.fillStyle='#7dff6a66';for(let wx=0;wx<AW;wx+=12){x.beginPath();x.arc(SX(wx+(t*10)%12),SY(FLOOR+9),3*k,Math.PI,0);x.fill();}
  // POW block
  if(W.pow>0){const hh=(POW.y1-POW.y0)*(W.pow/3)*(W.powT>0?.75:1),cy=POW.y1-hh;x.fillStyle='#1a2a6a';x.fillRect(SX(POW.x0),SY(cy),(POW.x1-POW.x0)*k,hh*k);x.fillStyle='#3a6ae8';x.fillRect(SX(POW.x0)+k,SY(cy)+k,(POW.x1-POW.x0-2)*k,(hh-2)*k);
   x.fillStyle='#fff';x.font=`900 ${Math.max(7,5.2*k*(W.pow/3+.4)/1.4)}px monospace`;x.textAlign='center';x.textBaseline='middle';x.fillText('POW',SX((POW.x0+POW.x1)/2),SY(cy+hh/2+.4));}
  // pipes (top: enemies come out; bottom: they go back in)
  const pipe=(px,py,dir,big)=>{const w=big?22:18,h=16;x.fillStyle='#0d3a1c';x.fillRect(SX(dir>0?px:px-w),SY(py),w*k,h*k);x.fillStyle='#2f8a3c';x.fillRect(SX(dir>0?px:px-w),SY(py+1.5),w*k,(h-3)*k);x.fillStyle='#6fd36a';x.fillRect(SX(dir>0?px:px-w),SY(py+3),w*k,2*k);
   const mx=dir>0?px+w:px-w-4;x.fillStyle='#0d3a1c';x.fillRect(SX(mx),SY(py-2),4*k,(h+4)*k);x.fillStyle='#3faa4c';x.fillRect(SX(mx)+.6*k,SY(py-1),2.8*k,(h+2)*k);};
  pipe(0,28,1,true);pipe(AW,28,-1,true);pipe(0,FLOOR-16,1,false);pipe(AW,FLOOR-16,-1,false);
  // pizzas, enemies, ooze, turtles
  for(const z of W.Z)if(!z.dead)drawPizza(z);
  for(const e of W.E)drawEnemy(e);
  for(const o of W.O)if(!o.dead)drawOoze(o);
  if(P.some(p=>p.spawnPlat>0)){for(const p of P)if(p.spawnPlat>0){x.fillStyle='#e8e0a8';x.fillRect(SX(p.x-12),SY(p.y),24*k,3*k);}}
  P.forEach(p=>drawTurtle(p));
  for(const q of W.texts){x.globalAlpha=1-q.t;x.fillStyle=q.col;x.font=`900 ${Math.max(9,6*k)}px monospace`;x.textAlign='center';x.fillText(q.txt,SX(q.x),SY(q.y));x.globalAlpha=1;}
  x.restore();
  // frame
  x.strokeStyle='#2a5a44';x.lineWidth=2;x.strokeRect(ox-1,oy-1,AW*k+2,AH*k+2);
  // phase card / bonus clock / waiting
  const big=Math.max(16,11*k);x.textAlign='center';x.textBaseline='middle';
  if(W.cardT>0&&W.phase>0){x.fillStyle='#000a';x.fillRect(ox,SY(84),AW*k,40*k);x.fillStyle='#fff3b9';x.font=`900 ${big}px monospace`;x.fillText(W.def?.bonus?'PIZZA PARTY!':`PHASE ${W.phase}`,SX(128),SY(98));
   x.font=`700 ${Math.max(10,5.5*k)}px monospace`;x.fillStyle='#8fff7a';x.fillText(W.def?.bonus?'GRAB EVERY SLICE IN 20 SECONDS':W.phase===1?'BUMP THEM FROM BELOW, THEN KICK THEM':'COWABUNGA!',SX(128),SY(114));}
  if(W.def?.bonus&&W.cardT<=0&&mode==='play'){x.fillStyle='#fff3b9';x.font=`900 ${Math.max(12,8*k)}px monospace`;x.fillText(String(Math.max(0,Math.ceil(W.bonusT))),SX(128),SY(20));}
  if(mode==='sync'){x.fillStyle='#000a';x.fillRect(ox,SY(96),AW*k,24*k);x.fillStyle='#fff';x.font=`900 ${Math.max(12,7*k)}px monospace`;x.fillText('WAITING FOR THE OTHER TURTLE…',SX(128),SY(108));}
  for(const p of P)if(p.out&&mine(p.i)&&mode==='play'){x.fillStyle='#000a';x.fillRect(ox,SY(132),AW*k,20*k);x.fillStyle='#ff9a9a';x.font=`900 ${Math.max(11,6*k)}px monospace`;x.fillText(nP>1?`${names[p.i].toUpperCase()} IS OUT · WATCHING`:'GAME OVER',SX(128),SY(142));}
  x.restore();
  // HUD above the arena (clear of the Pause/Exit pills at the top right)
  const fs=clamp(Math.min(Wd,Hd)*.04,12,20);x.font=`900 ${fs}px monospace`;x.textBaseline='middle';
  const cols=['#7fb2ff','#ff8a8a'];
  P.forEach((p,i)=>{const right=i===1,hx=right?Math.min(ox+AW*k,Wd-(fb.top?120:10)):ox+2;x.textAlign=right?'right':'left';x.fillStyle=cols[i];
   x.fillText(`${names[i].slice(0,8).toUpperCase()} ${String(p.score).padStart(6,'0')}`,hx,hudY);
   const lv=Math.max(0,p.lives);for(let j=0;j<Math.min(6,lv);j++){const lx=right?hx-6-j*12:hx+6+j*12;x.fillStyle='#3c8a2a';x.beginPath();x.ellipse(lx,hudY+fs*.95,5,4,0,0,7);x.fill();x.fillStyle='#8a5a2a';x.beginPath();x.ellipse(lx,hudY+fs*.95,3.3,2.6,0,0,7);x.fill();}});
  if(nP===1||Wd>560){x.textAlign='center';x.fillStyle='#fff3b9';x.font=`900 ${fs*.8}px monospace`;x.fillText(`PHASE ${Math.max(1,W.phase)}`,nP===1?Wd/2:Wd/2,hudY);}
  ctl.draw(x,{alpha:.9,hidden:mode!=='play'&&mode!=='sync'});
  s.setScores?.(P.map(p=>p.score).concat(nP===1?[0]:[]).slice(0,2));}

 function drawTurtle(p){if(p.out)return;if(p.inv>0&&p.dead<=0&&Math.floor(t*12)%2)return;
  const X=SX(p.x),Y=SY(p.y),sz=k,f=p.face||1;x.save();x.translate(X,Y);if(p.dead>0)x.rotate(Math.PI*(1.6-p.dead));
  const run=p.g&&Math.abs(p.vx)>5?Math.sin(t*16)*2:0;
  // legs, shell, plastron
  x.fillStyle='#3c8a2a';x.fillRect(-5*sz,-4*sz,3*sz,4*sz+run*sz*.5);x.fillRect(2*sz,-4*sz,3*sz,4*sz-run*sz*.5);
  x.fillStyle='#6a4520';x.beginPath();x.ellipse(-f*2*sz,-9*sz,6.5*sz,6*sz,0,0,7);x.fill();x.strokeStyle='#3a2410';x.lineWidth=sz*.8;x.stroke();
  x.fillStyle='#d8b850';x.beginPath();x.ellipse(f*1.5*sz,-9*sz,3.5*sz,5*sz,0,0,7);x.fill();
  x.fillStyle='#3c8a2a';x.fillRect(f>0?3*sz:-6*sz,-11*sz,3*sz,4*sz);
  x.restore();
  // head = the player's face, mask band in their colour
  const hs=Math.max(15,18*k);s.sprite(x,p.i,X+f*1.5*k,Y-21*k,hs,{exact:true,still:true,mood:p.dead>0?'sad':p.mood});
  x.fillStyle=p.i?'#d8323a':'#2a62d8';x.globalAlpha=.85;x.fillRect(X+f*1.5*k-hs*.42,Y-21*k-hs*.12,hs*.84,hs*.13);x.globalAlpha=1;}
 function drawEnemy(e){if(e.emerge>0&&!host&&e.tx==null)return;const T=TYPES[e.type],X=SX(e.x),Y=SY(e.y),sz=k,f=e.dir||1,last=W.E.filter(q=>!q.dead).length===1,tier=last?3:e.tier;
  x.save();x.translate(X,Y);if(e.flip>0||e.dead)x.scale(1,-1),x.translate(0,T.h*sz);
  const shake=e.flip>0&&e.flip<1.2?Math.sin(t*50)*1.2*sz:0;x.translate(shake,0);
  const tint=['','#ff8a3a','#ff3a6a','#3ab0ff'][tier];
  if(e.type==='foot'){ // Foot Soldier: dark ninja, red emblem
   const st=Math.sin(t*10+e.id)*1.5*sz;x.fillStyle='#1c1428';x.fillRect(-4*sz,-5*sz,3*sz,5*sz+st);x.fillRect(1*sz,-5*sz,3*sz,5*sz-st);
   x.fillStyle=tint||'#3a2a5a';x.fillRect(-5*sz,-12*sz,10*sz,8*sz);x.fillStyle='#c8202a';x.beginPath();x.arc(0,-8*sz,2*sz,0,7);x.fill();
   x.fillStyle='#1c1428';x.beginPath();x.arc(f*.5*sz,-14*sz,4*sz,0,7);x.fill();x.fillStyle='#f0e0c0';x.fillRect(f>0?0:-4*sz,-15*sz,4*sz,1.6*sz);x.fillStyle='#000';x.fillRect(f>0?2*sz:-3*sz,-15*sz,1.2*sz,1.6*sz);}
  else if(e.type==='mouser'){ // Mouser: little robot, giant jaw
   const st=Math.sin(t*14+e.id)*1.2*sz;x.fillStyle='#555c66';x.fillRect(-4*sz,-3*sz,2*sz,3*sz+st);x.fillRect(2*sz,-3*sz,2*sz,3*sz-st);
   x.fillStyle=e.mad?'#c86a6a':tint||'#9aa4ae';x.beginPath();x.ellipse(0,-7*sz,6*sz,5*sz,0,0,7);x.fill();
   x.fillStyle='#2a2e34';x.beginPath();x.moveTo(f*1*sz,-6*sz);x.lineTo(f*7*sz,-4*sz-Math.abs(Math.sin(t*8))*3*sz);x.lineTo(f*7*sz,-2*sz);x.closePath();x.fill();
   x.fillStyle='#fff';for(let j=0;j<3;j++)x.fillRect(f>0?(2+j*1.6)*sz:-(3.2+j*1.6)*sz,-5*sz,.9*sz,1.4*sz);x.fillStyle=e.mad?'#ff2020':'#ffd23f';x.beginPath();x.arc(f*-1*sz,-9*sz,1.4*sz,0,7);x.fill();}
  else{ // Krang Pod: pink brain in a glass dome on spring legs
   const sq=e.g?1.5:0;x.strokeStyle='#888';x.lineWidth=sz;x.beginPath();x.moveTo(-3*sz,0);x.lineTo(-2*sz,-4*sz+sq*sz);x.moveTo(3*sz,0);x.lineTo(2*sz,-4*sz+sq*sz);x.stroke();
   x.fillStyle=tint||'#5a6a7a';x.fillRect(-5*sz,-7*sz+sq*sz,10*sz,3*sz);x.fillStyle='#bfe8ff55';x.beginPath();x.arc(0,-8*sz+sq*sz,5.5*sz,Math.PI,0);x.fill();
   x.fillStyle='#ff8fb0';x.beginPath();x.ellipse(0,-9*sz+sq*sz,3.8*sz,3*sz,0,0,7);x.fill();x.strokeStyle='#c84a7a';x.lineWidth=.6*sz;x.beginPath();x.moveTo(-2*sz,-10*sz+sq*sz);x.quadraticCurveTo(0,-8*sz+sq*sz,2*sz,-10*sz+sq*sz);x.stroke();}
  x.restore();}
 function drawPizza(z){const X=SX(z.x),Y=SY(z.y-6),r=6*k;x.save();x.translate(X,Y);x.scale(Math.cos(t*5+z.id),1);x.shadowColor='#ffd23f';x.shadowBlur=8;
  x.fillStyle='#f2b84a';x.beginPath();x.moveTo(0,r);x.lineTo(-r*.9,-r*.6);x.quadraticCurveTo(0,-r*1.05,r*.9,-r*.6);x.closePath();x.fill();x.shadowBlur=0;
  x.fillStyle='#c8762a';x.fillRect(-r*.9,-r*.75,r*1.8,r*.3);x.fillStyle='#c8202a';for(const [a,b] of [[-.3,-.2],[.25,-.1],[0,.3]]){x.beginPath();x.arc(a*r,b*r,r*.16,0,7);x.fill();}x.restore();}
 function drawOoze(o){const X=SX(o.x),Y=SY(o.y),r=5*k+Math.sin(t*9)*k;x.save();x.shadowColor='#7dff6a';x.shadowBlur=14;x.fillStyle='#5aff4a';x.beginPath();x.arc(X,Y,r,0,7);x.fill();x.fillStyle='#d8ffc8';x.beginPath();x.arc(X-r*.3,Y-r*.3,r*.3,0,7);x.fill();x.restore();}
}

Object.assign(exports,{sewer,LAYOUTS,phaseDef,isBonus});
