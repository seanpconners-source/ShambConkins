// SUNDOWN SHOWDOWN (ROADMAP H6): an original 2-player western run-and-gun. Two gunslingers wearing the players' faces
// fight through four stages (Main Street, Runaway Train, Canyon Pass, Mission at Night) at once on one screen, each
// with layered streets (balconies, roofs, wagons, train roofs, rock shelves), set pieces (stampedes, powder kegs, a
// gatling wagon, low bridges, rolling boulders) and a WANTED boss who wears a character neither player has unlocked:
// shoot him down to recruit him. One hit costs a life (3 each, CONTINUE? after that). Kills score for the shooter, fast
// kills chain a combo multiplier, the boss's bounty is split by damage.
// Modes: 1P (solo 'levels') and the 2P Arcade play the stages in order, looping harder; a 2P board game plays one stage.
// Picture: everything in the world is drawn into a low-resolution buffer (sprite pixels 1:1, scenery as pixel art,
// src/engines/sundown/scenery.js) and scaled up sharp; faces, hats, text and the controls are drawn on top at full
// resolution. Sprite sheets: the owner's art in assets/sundown/ (layout in src/data/sundownSprites.js).
// Controls (src/engines/sundown/controls.js): per player a floating stick (move, aim 8 ways, down = duck) plus FIRE
// (hold) and JUMP (hold = higher); down + JUMP = slide under bullets or drop off a balcony. Keys and gamepads too.
// Sound: the owner's Sunset Riders songs and voices (engines/sunsetAudio.js), synth gun sounds (engines/westernSfx.js).
const {fullBleed}=require("src/engines/fullBleed.js");
const {seededRandom}=require("src/utils.js");
const {store}=require("src/state.js");
const audio=require("src/audio.js");
const {SFX}=require("src/engines/westernSfx.js");
const {createSunsetMusic,preloadSunsetVoices,sunsetVoice}=require("src/engines/sunsetAudio.js");
const {soloProgress,soloFinish}=require("src/solo.js");
const SPR=require("src/data/sundownSprites.js");
const {createControls}=require("src/engines/sundown/controls.js");
const {buildStage,STAGES,VH,GY,TRAIN_ROOF}=require("src/engines/sundown/stages.js");
const {createScenery,S}=require("src/engines/sundown/scenery.js");

const PH=Math.ceil(VH*S);                // buffer height in pixels
const RUN=84,ACC=1000,DEC=1300,AIR=760,GRAV=760,JUMPV=262,HOLD_T=.26,FALL=430,COYOTE=.09,JBUF=.13;
const SLIDE_V=200,SLIDE_T=.42,PB=390,FIRE_CD=.15,RAPID_CD=.085,INV=2.2,RESPAWN=1.4,POWER_T=15,CONT_T=10,HITSTOP=.04;
const TAUNTS=[['This is my town, cowboy.','Now you made me ANGRY!'],['Nobody collects on my head!','Boys! Get these varmints!'],['Ride on back where you came from.','I\'ll fill you full of lead!'],['Draw, if you got the guts!','No more games!'],['Your bounty\'s mine, not the other way round.','You\'re tougher than you look...']];
const BOSS_NAMES={gunslinger:['THE BARON','ONE-EYED JACK','BLACK BART','DOC HOLLOWAY'],engineer:['IRON MIKE','BOXCAR WILLIE','THE CONDUCTOR'],rifleman:['DEADEYE','THE VULTURE','LONG RIFLE LOU'],general:['EL GENERAL','EL DIABLO','THE COLONEL']};
const TITLE_SONG=['the-magnificent-four'],BOSS_SONGS=['its-time-to-pay','draw-your-gun','draw-pilgrim','quick-draw'];
const STAGE_SONGS={town:['gunfight-at-the-sunset-corral','shoot-out-at-the-sunset-ranch'],train:['train-stage-2','i-will-run-and-face-tomorrow','face-with-courage'],canyon:['mountain-stage-2','butch-cassidy-and-sunset-riders'],mission:['ay-chihuahua','aye-chihuaha','the-great-petal','splendid-flower-petal']};
const PTS={gun:100,perch:200,window:200,door:150,drop:150,rush:150,dyn:300,cover:250,rider:400,sniper:300,ledge:200,climb:150,gunner:3000,boulder:250,rollkeg:200};
const DIR8=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];

async function sundown(s){
 const solo=!!s.solo,np=solo?1:2,campaign=solo||!!store.arcade;
 const [c,cx]=s.canvas(900,520,{fill:true});const fb=fullBleed(s,{bg:'#140a14',hint:true});
 s.shared=!solo;s.active=0;s.updateScores?.();
 s.hint('Left side of your area: a stick. Push to run, aim 8 ways (up, diagonals), down to duck. FIRE: hold to keep shooting. JUMP: hold for a higher jump, up onto balconies, roofs, wagons and train cars. Down + JUMP: slide under bullets (or drop down off a balcony). One hit costs a life. Shoot the windows, kegs and crates too. Keys: P1 A/D/W/S, F fire, Space jump; P2 arrows, . fire, Enter jump. Gamepads work.');
 let headOf=null;try{headOf=require("src/engines/broforce.js").headCanvas;}catch{}
 const head=(id,mood,size)=>{try{return headOf?.(id,mood,size)||null;}catch{return null;}};
 const female=id=>/amber|wife|woman|girl|queen|lady|ms-|mrs-/i.test(id||'');
 const music=createSunsetMusic(()=>s.paused||!s.alive||document.hidden);try{audio.stopMusic();}catch{}preloadSunsetVoices();SPR.preloadSundown?.();
 s.cleanup(()=>{music.stop();if(store.profile?.settings?.music)try{audio.startMusic();}catch{}});
 const voice=(n,o)=>{try{sunsetVoice(n,o);}catch{}};
 const fxr=Math.random;   // looks only; s.random decides layouts and spawns
 let bossPool=[];
 try{const rw=require('src/rewards.js');bossPool=[...new Set(s.players.slice(0,np).flatMap(p=>{try{return rw.gameRecruitPool(s.game,store.profile,p).map(ch=>ch.id);}catch{return [];}}))];
  const {portraitMoods}=require('src/assets.js'),art=bossPool.filter(id=>{try{return portraitMoods(id).length>0;}catch{return false;}});if(art.length)bossPool=art;}catch{}
 s.gameRecruits=[[],[]];

 // ------------------------------------------------------------------------------------------------ state
 let stageNo=campaign?0:Math.floor(s.random()*STAGES.length),diff=1,T=0,phase='title',phaseT=0,cleared=0,banner=null,freeze=0,shake=0,goT=-9,ending=false;
 const total=[0,0];
 const P=[0,1].slice(0,np).map(i=>({i,x:60+i*28,y:GY,vx:0,vy:0,face:1,ground:true,coyote:0,jbuf:0,holdT:0,dropT:0,duck:false,slideT:0,slideCd:0,
  aim:[1,0],fireCd:0,firing:false,power:null,powerT:0,lives:3,alive:true,out:false,respawn:0,inv:INV,score:0,kills:0,combo:0,lastKill:-9,deadT:0,animT:0,walkT:0,
  contT:0,continues:0,bounty:0,lifeBonus:0,stageKills:0,mood:'normal',hatT:-9}));
 let firstStage=true,L=null,cam=0,lastSpawn=0,camMoved=0,lastCam=0;
 const E=[],B=[],EB=[],FX=[],TX=[],items=[],later=[];
 const after=(sec,fn)=>later.push({at:T+sec,fn});
 const scen=createScenery();
 const [pb,pg]=(()=>{const c2=document.createElement('canvas');c2.width=8;c2.height=PH;const g=c2.getContext('2d');g.imageSmoothingEnabled=false;return [c2,g];})();
 let W=s.W,H=s.H,view={x:0,y:0,w:W,h:H},PW=8,K=1,ww=100;
 function layout(){W=s.W;H=s.H;
  if(W/H>=1.25)view={x:0,y:0,w:W,h:H};else{const bh=Math.min(H*.6,W/1.05);view={x:0,y:Math.max(fb.top+64,H*.14),w:W,h:bh};}
  K=view.h/PH;PW=Math.ceil(view.w/K);if(pb.width!==PW){pb.width=PW;pb.height=PH;pg.imageSmoothingEnabled=false;}ww=PW/S;controls.layout(W,H);}
 const toX=wx=>view.x+(wx-cam)*S*K,toY=wy=>view.y+wy*S*K;
 const bx=wx=>Math.round((wx-cam)*S),by=wy=>Math.round(wy*S);
 const inView=(wx,pad=0)=>wx>cam-pad&&wx<cam+ww+pad;

 // ------------------------------------------------------------------------------------------------ input
 const controls=createControls(s,c,{np,solo,onDown:(i,p)=>{
  if(phase==='title'){if(phaseT>.5){phase='card';phaseT=0;music.sting('wanted',()=>music.theme(STAGE_SONGS[L.id]));}return true;}
  if(phase==='card'){if(phaseT>.6){phase='play';phaseT=0;}return true;}
  const pl=P[i];if(pl&&pl.out&&pl.contT>0){continuePlayer(pl);return true;}
  return false;}});

 // ------------------------------------------------------------------------------------------------ world queries
 // the floor under x at or below y: street, one-way plats (not while dropping through), solid plats, box tops
 function floorAt(x,y,drop=false,ignore=null){let best=L.ground??Infinity;
  for(const p of L.plats){if(x<p.x0||x>p.x1||p.y<y-1)continue;if(drop&&!p.solid)continue;if(p.y<best)best=p.y;}
  for(const b of L.boxes){if(b===ignore||b.dead||x<b.x-1||x>b.x+b.w+1)continue;const t=b.y-b.h;if(t>=y-1&&t<best)best=t;}
  return best;}
 const boxAt=(x,y)=>L.boxes.find(b=>!b.dead&&x>b.x&&x<b.x+b.w&&y>b.y-b.h&&y<b.y);
 const platsIn=(kinds,from,to)=>L.plats.filter(p=>kinds.includes(p.kind)&&p.x1>from&&p.x0<to);

 // ------------------------------------------------------------------------------------------------ enemies
 const living=()=>E.filter(e=>!e.dead&&!e.gone&&e.hostile!==false);
 function addEnemy(kind,o){const e={kind,hp:1,t:0,face:-1,dead:false,deadT:0,flash:0,vx:0,vy:0,ground:true,cool:.8+s.random()*.9,aimT:0,walkT:0,born:T,...o};E.push(e);return e;}
 const target=(x,y)=>{let best=null,bd=1e9;for(const p of P)if(p.alive){const d=Math.abs(p.x-x)+Math.abs(p.y-y)*.6;if(d<bd){bd=d;best=p;}}return best;};
 const edgeX=side=>side>0?cam+ww+14:cam-14;
 const streetY=x=>L.ground??floorAt(x,0);
 function spawnOne(kind,side=1){const R=s.random,right=cam+ww,mid=cam+ww*.5;
  const trySpot=(list,f)=>{if(!list.length)return false;f(list[Math.floor(R()*list.length)]);return true;};
  switch(kind){
   case 'gun':{const x=edgeX(side);return addEnemy('gun',{x,y:L.id==='train'?floorAt(x,0):GY,goal:side>0?cam+ww*(.55+R()*.38):cam+ww*(.06+R()*.3),face:-side});}
   case 'perch':if(trySpot(platsIn(['balcony','roof'],mid,right-12),p=>{const gx=Math.min(p.x1-10,Math.max(p.x0+10,cam+ww*(.55+R()*.4)));addEnemy('perch',{x:gx,y:p.y,face:-1,appear:0,cool:1+R()*.6});}))return;return spawnOne('gun',side);
   case 'window':{const ws=L.bld.flatMap(b=>b.wins.map(w=>({w,b}))).filter(o=>o.w.x>cam+ww*.35&&o.w.x<right-10&&!o.w.man);
    if(trySpot(ws,o=>{o.w.man=addEnemy('window',{x:o.w.x,y:o.w.y+16,win:o.w,out:0,cycle:0,cool:.9});}))return;return spawnOne('perch',side);}
   case 'door':if(trySpot(L.bld.filter(b=>b.door>cam+ww*.4&&b.door<right-16),b=>{b.doorT=T;addEnemy('gun',{x:b.door,y:GY,goal:b.door+(R()<.5?-1:1)*(16+R()*30),face:-1,appear:0,cool:1.2});}))return;return spawnOne('gun',side);
   case 'drop':if(trySpot(platsIn(['roof','balcony','ledge'],mid,right-10),p=>{const gx=Math.min(p.x1-6,Math.max(p.x0+6,cam+ww*(.55+R()*.35)));const e=addEnemy('drop',{x:gx,y:p.y,face:-1,appear:0,cool:1.4});e.leapAt=T+.5;}))return;return spawnOne('gun',side);
   case 'rush':{const x=edgeX(side);return addEnemy('rush',{x,y:L.id==='train'?floorAt(x,0):GY,face:-side,speed:112+R()*30});}
   case 'dyn':{if(R()<.5&&trySpot(platsIn(['roof','ledge','car'],mid,right-12),p=>addEnemy('dyn',{x:Math.min(p.x1-8,Math.max(p.x0+8,cam+ww*(.62+R()*.3))),y:p.y,face:-1,appear:0,cool:1.4})))return;
    const x=edgeX(1);return addEnemy('dyn',{x,y:L.id==='train'?floorAt(x,0):GY,goal:cam+ww*(.7+R()*.22),cool:1.3});}
   case 'cover':if(trySpot(L.boxes.filter(b=>!b.dead&&b.kind!=='keg'&&b.x>cam+ww*.42&&b.x<right-30&&b.h<=26&&!E.some(e=>e.crate===b&&!e.dead)),b=>addEnemy('cover',{x:b.x+b.w+7,y:b.y,crate:b,up:0,cyc:R()*2,face:-1,shotCyc:-1})))return;return spawnOne('gun',side);
   case 'rider':{const sd=side||(R()<.5?1:-1);SFX.gallop?.({vol:.35,beats:8});return addEnemy('rider',{x:sd>0?right+40:cam-40,y:GY,face:-sd,speed:L.id==='train'?55+R()*40:150+R()*30,hp:2,cool:.7});}
   case 'sniper':if(trySpot(platsIn(['roof','ledge','car'],cam+ww*.5,right-12),p=>addEnemy('sniper',{x:Math.min(p.x1-8,Math.max(p.x0+8,cam+ww*(.6+R()*.35))),y:p.y,face:-1,appear:0,cool:1.6,hp:1})))return;return spawnOne('perch',side);
   case 'ledge':if(trySpot(platsIn(['ledge','bridge'],mid,right-10),p=>addEnemy('perch',{x:Math.min(p.x1-8,Math.max(p.x0+8,cam+ww*(.55+R()*.4))),y:p.y,face:-1,appear:0,cool:1.1})))return;return spawnOne('gun',side);
   case 'climb':{const cars=L.plats.filter(p=>p.kind==='car'&&p.x0>cam+ww*.35&&p.x0<right-20);if(trySpot(cars,p=>{const ex=R()<.5?p.x0+6:p.x1-6;addEnemy('climb',{x:ex,y:GY,climbTo:p.y,face:-1,cool:1.3,appear:0});}))return;return spawnOne('gun',side);}
   case 'item':items.push({x:right-30,y:40,vy:0,kind:['two','rapid','gold','gold'][Math.floor(R()*4)],t:0,landed:false});return;
   default:return spawnOne('gun',side);
  }
 }
 function spawnWave(kinds,tag){kinds.forEach((k,i)=>after(.25+i*.65,()=>{const before=E.length;spawnOne(k,i%3===1?-1:1);for(const e of E.slice(before))e.wave=tag;if(tag)tag.spawned++;}));}

 // ------------------------------------------------------------------------------------------------ combat
 function shoot(p){
  const [ax,ay]=p.aim,n=Math.hypot(ax,ay)||1,ux=ax/n,uy=ay/n;
  // from the muzzle of the gun in the pose being drawn (the owner's sheet), else from the chest along the aim
  const def=SPR.sheet('cowboy-p'+(p.i+1))?.def,row=!p.ground?null:p.duck?'duckShoot':ay<0&&!ax?'shootUp':ay<0?'shootDiagUp':ay>0?'shootDiagDown':Math.abs(p.vx)>8?'runShoot':'shoot',tip=row&&def?.gun?.[row];
  const gy=p.y-(p.duck?16:28),mx=tip?p.x+(tip[0]-def.foot[0])*def.scale*p.face:p.x+ux*16,my=tip?p.y+(tip[1]-def.foot[1])*def.scale:gy+uy*12;
  const shots=p.power==='two'?[[-2.5,-.05],[2.5,.05]]:[[0,0]];
  for(const [off,a] of shots){const ca=Math.cos(a),sa=Math.sin(a),vx=(ux*ca-uy*sa)*PB,vy=(ux*sa+uy*ca)*PB;B.push({x:mx-uy*off,y:my+ux*off,vx,vy,o:p.i,t:0});}
  FX.push({k:'flash',x:mx,y:my,t:0,life:.06,dx:ux,dy:uy});
  FX.push({k:'shell',x:p.x,y:gy,vx:-p.face*(30+fxr()*30),vy:-60-fxr()*40,t:0,life:.6});
  p.shots=(p.shots||0)+1;SFX.shot?.({vol:.62,pan:Math.max(-1,Math.min(1,((toX(p.x)/W)*2-1)))*.6,echo:p.shots%3===1});
 }
 function enemyShot(e,tx,ty,{speed=0,spread=0,from=null}={}){
  const cap=6+Math.min(6,L.n)+(np-1)*3;if(EB.filter(b=>!b.dyn).length>=cap)return;
  const ex=from?from[0]:e.x+e.face*8,ey=from?from[1]:e.y-(e.kind==='window'?18:e.kind==='rider'?44:e.kind==='cover'?18:e.boss?34:24);
  const v=speed||(128+Math.min(70,(diff-1)*40)),a=Math.atan2(ty-ey,tx-ex)+spread;
  EB.push({x:ex,y:ey,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:0});e.fireAnim=.22;FX.push({k:'flash',x:ex,y:ey,t:0,life:.06,dx:Math.cos(a),dy:Math.sin(a),red:true});
  SFX.shot?.({vol:.34,low:true,pan:Math.max(-1,Math.min(1,(toX(ex)/W)*2-1))*.6});
 }
 function lob(e,tx,ty=null){const t=1+fxr()*.15,sx0=e.x,sy0=e.y-30,dx=tx-sx0,dy=(ty??(L.ground??TRAIN_ROOF))-sy0;
  EB.push({x:sx0,y:sy0,vx:dx/t,vy:(dy-.5*GRAV*.8*t*t)/t,t:0,dyn:true,fuse:0,spin:fxr()*6});e.throwT=.35;}
 function boom(x,y,r=34,{hurt=true,by=null,big=false}={}){shake=Math.max(shake,big?12:8);freeze=Math.max(freeze,.05);
  FX.push({k:'boom',x,y,t:0,life:.55,r});for(let k=0;k<26;k++){const a=fxr()*Math.PI*2,v=40+fxr()*150;FX.push({k:'spark',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,t:0,life:.4+fxr()*.5,c:fxr()<.5?'#ffd04a':'#ff6a2a'});}
  for(let k=0;k<8;k++)FX.push({k:'smoke',x:x+(fxr()-.5)*r,y:y-fxr()*r*.5,vx:(fxr()-.5)*20,vy:-20-fxr()*30,t:0,life:1+fxr()*.6,r:4+fxr()*6});
  SFX.blast?.({vol:.85,pan:Math.max(-1,Math.min(1,(toX(x)/W)*2-1))*.5});
  for(const e of E)if(!e.dead&&!e.boss&&e.kind!=='horse'&&e.kind!=='beam'&&Math.hypot(e.x-x,(e.y-14)-y)<r+6)killEnemy(e,by);
  for(const b of L.boxes)if(!b.dead&&b.kind!=='wagon'&&Math.hypot(b.x+b.w/2-x,b.y-b.h/2-y)<r+8){if(b.kind==='keg')after(.12,()=>breakBox(b,by));else breakBox(b,by);}
  if(L.boss&&!L.boss.dead&&Math.hypot(L.boss.x-x,L.boss.y-24-y)<r+10)for(let k=0;k<5;k++)damage(L.boss,by);
  if(hurt)for(const p of P)if(p.alive&&p.inv<=0&&Math.hypot(p.x-x,(p.y-14)-y)<r*.8)hurtPlayer(p);}
 function breakBox(b,by){if(b.dead)return;b.dead=true;
  if(b.kind==='keg'){boom(b.x+b.w/2,b.y-b.h/2,48,{by,big:true});if(by!=null)score(P[by],300,b.x,b.y-30);return;}
  for(let k=0;k<14;k++)FX.push({k:'splinter',x:b.x+fxr()*b.w,y:b.y-fxr()*b.h,vx:(fxr()-.5)*160,vy:-60-fxr()*120,t:0,life:.8,c:b.kind==='barrel'?'#8a5228':'#a8703c'});
  SFX.ricochet?.({vol:.2});if(by!=null)score(P[by],50,b.x,b.y-20);
  if(b.item||fxr()<.15)items.push({x:b.x+b.w/2,y:b.y-b.h,vy:-120,kind:b.item||(fxr()<.6?'gold':fxr()<.5?'two':'rapid'),t:0,landed:false});
  // whatever stood on it drops
  for(const e of E)if(!e.dead&&Math.abs(e.y-(b.y-b.h))<1&&e.x>b.x-2&&e.x<b.x+b.w+2)e.ground=false;}
 function score(p,pts,x,y,mult=1){if(!p)return;const v=pts*mult;p.score+=v;TX.push({x,y,text:mult>1?`+${v} ×${mult}`:`+${v}`,t:0,life:.9,c:p.i===0?'#8ad8ff':'#ffa0d4',big:mult>2});}
 function killEnemy(e,by){if(e.dead||e.kind==='horse'||e.kind==='beam')return;e.dead=true;e.deadT=0;const pl=by!=null?P[by]:null;
  e.vx=(pl?Math.sign(e.x-pl.x):1)*70;e.vy=-130;e.ground=false;freeze=Math.max(freeze,HITSTOP);
  if(e.kind==='rider')addEnemy('horse',{x:e.x,y:GY,face:e.face,speed:Math.max(160,e.speed*1.4),hostile:false,loose:true});
  if(e.win){e.win.man=null;e.win.open=0;}
  if(pl){if(T-pl.lastKill<1.3)pl.combo=Math.min(8,pl.combo+1);else pl.combo=1;pl.lastKill=T;pl.kills++;pl.stageKills++;
   score(pl,PTS[e.kind]||100,e.x,e.y-36,pl.combo);if(pl.combo>=3)TX.push({x:e.x,y:e.y-52,text:`${pl.combo} IN A ROW!`,t:0,life:1,c:'#ffd34a',big:true});}
  voice(['bandit-death-1','bandit-death-2','bandit-death-3','bandit-death-short'][Math.floor(fxr()*4)],{vol:.5,pan:Math.max(-1,Math.min(1,(toX(e.x)/W)*2-1))});
  if(e.kind==='dyn'&&fxr()<.5||fxr()<.06)items.push({x:e.x,y:e.y-20,vy:-110,kind:fxr()<.6?'gold':fxr()<.5?'two':'rapid',t:0,landed:false});
  if(e.kind==='gunner'&&e.wagon){after(.3,()=>{boom(e.wagon.x+30,e.wagon.y-16,56,{by,big:true,hurt:false});e.wagon.dead=true;});}}
 function damage(e,by){e.flash=.08;
  if(e.boss){if(phase!=='boss')return;e.hp--;e.dmg[by??0]=(e.dmg[by??0]||0)+1;if(by!=null)P[by].score+=20;
   if(T-(e.ouch||0)>1.1){e.ouch=T;voice('boss-damage',{vol:.55});}
   if(e.hp<=0){e.dead=true;e.deadT=0;e.vx=50;e.vy=-170;e.ground=false;bossDown(e);}return;}
  if(e.kind==='boulder'){if(--e.hp<=0){e.dead=true;e.gone=true;for(let k=0;k<16;k++)FX.push({k:'splinter',x:e.x,y:e.y-10,vx:(fxr()-.5)*180,vy:-80-fxr()*120,t:0,life:.8,c:'#8a4a2a'});if(by!=null)score(P[by],PTS.boulder,e.x,e.y-20);}return;}
  if(e.kind==='rollkeg'){e.dead=true;e.gone=true;boom(e.x,e.y-9,50,{by,big:true});if(by!=null)score(P[by],PTS.rollkeg,e.x,e.y-30);return;}
  if(--e.hp<=0)killEnemy(e,by);}
 function hurtPlayer(p,why='shot'){if(!p.alive||p.inv>0||s.debug.immortal)return;p.alive=false;p.lives--;p.respawn=RESPAWN;p.vx=-p.face*80;p.vy=-170;p.ground=false;p.slideT=0;p.mood='sad';p.deadT=0;p.hatT=T;
  shake=Math.max(shake,7);freeze=Math.max(freeze,.12);voice(female(s.players[p.i].character)?'female-death':'player-death',{vol:.9});s.react?.(p.i,'sad');try{navigator.vibrate?.(90);}catch{}
  if(p.lives<=0){p.out=true;p.contT=(solo&&p.continues>=3)||(!campaign&&p.continues>=2)?0:CONT_T;}p.power=null;p.combo=0;}
 function continuePlayer(p){if(!p.out||p.contT<=0)return;const cost=Math.min(1500,p.score+total[p.i]);p.score-=cost;
  Object.assign(p,{out:false,lives:3,respawn:.25,contT:0,continues:p.continues+1});voice(fxr()<.5?'player-taunt-1':'player-taunt-2',{vol:.8});TX.push({x:cam+ww/2,y:70,text:'HERE WE GO!',t:0,life:1.2,c:p.i?'#ffa0d4':'#8ad8ff',big:true});}
 function takeItem(p,it){if(it.kind==='gold'){score(p,500,p.x,p.y-44);SFX.jingle?.({vol:.3});}
  else{p.power=it.kind;p.powerT=POWER_T;TX.push({x:p.x,y:p.y-50,text:it.kind==='two'?'TWO GUNS!':'RAPID FIRE!',t:0,life:1.1,c:'#ffd34a',big:true});SFX.cock?.({vol:.5});}
  audio.sound?.('pickup');}

 // ------------------------------------------------------------------------------------------------ players
 function stepPlayer(p,dt){p.animT+=dt;
  if(!p.alive){p.deadT+=dt;if(p.out)p.contT=Math.max(0,p.contT-dt);p.vy=Math.min(FALL,p.vy+GRAV*dt);p.x+=p.vx*dt;const f=floorAt(p.x,p.y);p.y=Math.min(f,p.y+p.vy*dt);if(p.y>=f){p.vx*=.8;}
   if(!p.out&&(p.respawn-=dt)<=0){const mate=P.find(q=>q!==p&&q.alive);const rx=Math.max(cam+30,Math.min(cam+ww*.5,(mate?.x??cam+70)-24));Object.assign(p,{alive:true,x:rx,y:10,vx:0,vy:60,ground:false,inv:INV,mood:'normal',slideT:0,duck:false});}return;}
  p.inv=Math.max(0,p.inv-dt);p.fireCd-=dt;p.slideCd=Math.max(0,p.slideCd-dt);p.dropT=Math.max(0,p.dropT-dt);if(p.power&&(p.powerT-=dt)<=0)p.power=null;
  if(T-p.lastKill>1.3)p.combo=0;
  const inp=s.debug.bot?botInput(p):controls.read(p.i);
  if(inp.jumps)p.jbuf=JBUF;else p.jbuf=Math.max(0,p.jbuf-dt);
  p.coyote=p.ground?COYOTE:Math.max(0,p.coyote-dt);
  const onOneWay=p.ground&&L.plats.some(q=>!q.solid&&Math.abs(q.y-p.y)<1&&p.x>=q.x0&&p.x<=q.x1);
  // down + jump: drop off a balcony, else slide
  if(p.jbuf>0&&inp.y>0&&p.ground){p.jbuf=0;if(onOneWay&&!inp.x){p.dropT=.25;p.ground=false;p.vy=40;}else if(p.slideCd<=0){p.slideT=SLIDE_T;p.slideCd=.55;p.face=inp.x||p.face;SFX.whip?.({vol:.22});}}
  else if(p.jbuf>0&&p.coyote>0&&p.slideT<=0){p.jbuf=0;p.coyote=0;p.vy=-JUMPV;p.ground=false;p.holdT=HOLD_T;SFX.spurs?.({vol:.12,steps:1});}
  if(p.slideT>0){p.slideT-=dt;p.duck=true;p.vx=p.face*SLIDE_V*(.35+.65*Math.max(0,p.slideT)/SLIDE_T);p.firing=false;
   if(fxr()<.6)FX.push({k:'dust',x:p.x-p.face*6,y:p.y-2,vx:-p.face*(20+fxr()*30),vy:-20-fxr()*30,t:0,life:.4});}
  else{
   p.duck=p.ground&&inp.y>0&&!inp.x;
   const want=p.duck?0:inp.x*RUN,acc=p.ground?(want?ACC:DEC):AIR;
   if(p.vx<want)p.vx=Math.min(want,p.vx+acc*dt);else if(p.vx>want)p.vx=Math.max(want,p.vx-acc*dt);
   if(inp.x)p.face=inp.x;
   // aim: up / diagonal up, straight ahead, diagonal down or down only in the air
   p.aim=inp.y<0?[inp.x,-1]:inp.y>0&&!p.ground?[inp.x,1]:[p.face,0];
   p.firing=!!inp.fire;if(inp.fire&&p.fireCd<=0){p.fireCd=p.power==='rapid'?RAPID_CD:FIRE_CD;shoot(p);}
  }
  // gravity: lighter while JUMP is held on the way up (variable height)
  if(!p.ground){const g=p.vy<0&&inp.jump&&p.holdT>0?GRAV*.5:GRAV;p.holdT-=dt;if(!inp.jump)p.holdT=0;p.vy=Math.min(FALL,p.vy+g*dt);}
  // move x, stopped by the sides of boxes taller than your feet
  let nx=p.x+p.vx*dt;nx=Math.max(cam+8,Math.min(cam+ww-8,nx));
  for(const b of L.boxes){if(b.dead)continue;const top=b.y-b.h;if(p.y>top+2&&p.y-30<b.y){if(p.x<=b.x&&nx>b.x-4){nx=b.x-4;p.vx=0;}else if(p.x>=b.x+b.w&&nx<b.x+b.w+4){nx=b.x+b.w+4;p.vx=0;}}}
  for(const cr of L.cars){if(p.y>cr.y+2){if(p.x<=cr.x&&nx>cr.x-3){nx=cr.x-3;p.vx=0;}else if(p.x>=cr.x+cr.w&&nx<cr.x+cr.w+3){nx=cr.x+cr.w+3;p.vx=0;}}}
  p.x=nx;
  // move y and land
  const floor=floorAt(p.x,p.y,p.dropT>0);let ny=p.y+p.vy*dt;
  if(p.vy>=0&&ny>=floor&&p.y<=floor+1){if(!p.ground&&p.vy>220)FX.push({k:'dust',x:p.x,y:floor-1,vx:0,vy:-14,t:0,life:.3});ny=floor;p.vy=0;p.ground=true;}
  else if(p.ground&&floor>p.y+1){p.ground=false;}
  p.y=ny;if(p.ground&&p.vy===0&&floor!==Infinity)p.y=floor;
  if(p.vx&&p.ground)p.walkT+=dt*Math.abs(p.vx)/RUN;
  if(p.y>VH+40){p.inv=0;hurtPlayer(p,'fall');}
 }

 // ------------------------------------------------------------------------------------------------ enemy behaviour
 function canShoot(e){return inView(e.x,-6)&&T-e.born>.7&&(e.appear==null||e.appear>.8);}
 function aimAt(e,p,o){if(!p)return;enemyShot(e,p.x,p.y-(p.duck?9:20),o);}
 function stepEnemy(e,dt){e.t+=dt;e.flash=Math.max(0,e.flash-dt);e.fireAnim=Math.max(0,(e.fireAnim||0)-dt);e.throwT=Math.max(0,(e.throwT||0)-dt);
  if(e.appear!=null&&e.appear<1)e.appear=Math.min(1,e.appear+dt*2.4);
  if(e.dead){e.deadT+=dt;if(e.kind==='window')return;if(!e.ground){e.vy=Math.min(FALL,e.vy+GRAV*dt);e.x+=e.vx*dt;const f=floorAt(e.x,e.y,true);let ny=e.y+e.vy*dt;if(ny>=f){ny=f;e.ground=true;e.vx*=.3;FX.push({k:'dust',x:e.x,y:f-1,vx:0,vy:-14,t:0,life:.3});}e.y=ny;}else e.vx*=.9;return;}
  const p=target(e.x,e.y),rate=Math.min(2.4,diff),R=s.random;
  // anything on a box that broke falls
  if(!e.ground&&!e.boss&&!['window','rider','horse','beam','boulder','rollkeg','gunner'].includes(e.kind)){e.vy=Math.min(FALL,e.vy+GRAV*dt);e.x+=e.vx*dt;const f=floorAt(e.x,e.y);let ny=e.y+e.vy*dt;if(ny>=f){ny=f;e.ground=true;e.vx=0;}e.y=ny;return;}
  switch(e.kind){
   case 'gun':case 'climb':case 'drop':case 'perch':{
    if(e.kind==='climb'&&e.climbTo!=null){e.y-=70*dt;if(e.y<=e.climbTo){e.y=e.climbTo;e.climbTo=null;e.goal=e.x+(R()-.5)*60;}return;}
    if(e.kind==='drop'&&e.leapAt&&T>=e.leapAt){e.leapAt=null;e.ground=false;e.vx=(cam+ww*(.45+R()*.3)-e.x)/.7;e.vy=-150;e.kind='gun';e.goal=null;return;}
    if(e.goal!=null&&Math.abs(e.goal-e.x)>3){e.x+=Math.sign(e.goal-e.x)*60*dt;e.walkT+=dt;e.face=Math.sign(e.goal-e.x);
     if(e.y<=floorAt(e.x,e.y)-1)e.ground=false;}
    else if(p){e.face=Math.sign(p.x-e.x)||-1;
     if(e.aimT>0){e.aimT-=dt;if(e.aimT<=0){aimAt(e,p);e.cool=(1.5+R()*1.1)/rate;if(R()<.25&&e.kind==='gun')e.goal=e.x+(R()-.5)*70;}}
     else if((e.cool-=dt)<=0&&canShoot(e)){e.aimT=.32;e.fireAnim=.4;}}
    break;}
   case 'rush':{e.x+=e.face*e.speed*dt;e.walkT+=dt;
    const b=L.boxes.find(b=>!b.dead&&e.ground&&Math.abs(b.y-b.h-e.y)>2&&(e.face>0?b.x-e.x:e.x-b.x-b.w)>0&&(e.face>0?b.x-e.x:e.x-b.x-b.w)<18);
    if(b&&e.ground){e.ground=false;e.vy=-220;e.vx=e.face*e.speed;}
    if(!e.ground){e.vy+=GRAV*dt;e.y+=e.vy*dt;const f=floorAt(e.x,e.y);if(e.y>=f&&e.vy>0){e.y=f;e.ground=true;}}
    for(const q of P)if(q.alive&&q.inv<=0&&q.slideT<=0&&Math.abs(q.x-e.x)<11&&Math.abs(q.y-e.y)<20)hurtPlayer(q);
    if(e.x<cam-60||e.x>cam+ww+80)e.gone=true;break;}
   case 'dyn':{if(e.goal!=null&&Math.abs(e.goal-e.x)>3){e.x+=Math.sign(e.goal-e.x)*52*dt;e.walkT+=dt;}e.face=p?Math.sign(p.x-e.x)||-1:-1;
    if(p&&(e.cool-=dt*rate)<=0&&canShoot(e)){e.cool=2.3+R()*.8;lob(e,p.x+(R()-.5)*26,floorAt(p.x,p.y-4));}break;}
   case 'window':{e.cycle+=dt;const open=(e.cycle%3.2)<1.9;e.out=open?Math.min(1,e.out+dt*5):Math.max(0,e.out-dt*5);e.win.open=e.out;
    if(p)e.face=Math.sign(p.x-e.x)||-1;
    if(e.out>.9&&p){if(e.aimT>0){e.aimT-=dt;if(e.aimT<=0){aimAt(e,p);e.cool=(1.3+R()*.8)/rate;}}else if((e.cool-=dt)<=0&&canShoot(e)){e.aimT=.3;e.fireAnim=.4;}}break;}
   case 'cover':{e.cyc+=dt*Math.min(1.6,rate);const cyc=Math.floor(e.cyc/2.6),up=(e.cyc%2.6)>1.4;e.up=up?Math.min(1,e.up+dt*8):Math.max(0,e.up-dt*8);if(e.crate.dead){e.kind='gun';e.goal=null;e.up=1;}
    if(p)e.face=Math.sign(p.x-e.x)||-1;if(e.up>.9&&p&&e.shotCyc!==cyc&&canShoot(e)){e.shotCyc=cyc;aimAt(e,p);}break;}
   case 'sniper':{if(p)e.face=Math.sign(p.x-e.x)||-1;
    if(e.aimT>0){e.aimT-=dt;e.lock=p?[p.x,p.y-20]:e.lock;if(e.aimT<=0&&e.lock){enemyShot(e,e.lock[0],e.lock[1],{speed:290});e.cool=(2.6+R())/rate;}}
    else if((e.cool-=dt)<=0&&canShoot(e)&&p){e.aimT=.75;e.fireAnim=.8;}break;}
   case 'rider':{e.x+=e.face*e.speed*dt+(L.id==='train'?0:0);e.walkT+=dt;
    if(p&&(e.cool-=dt*rate)<=0&&inView(e.x,-10)){e.cool=.9+R()*.5;aimAt(e,p,{speed:150});}
    if(L.id!=='train')for(const q of P)if(q.alive&&q.inv<=0&&Math.abs(q.x-e.x)<18&&q.y>GY-30)hurtPlayer(q);
    if(L.id==='train'&&e.face<0&&e.x<cam+ww*.15)e.face=1;if(L.id==='train'&&e.face>0&&e.x>cam+ww*.95)e.face=-1;
    if(e.t>14||e.face<0?e.x<cam-90:e.x>cam+ww+90)if(L.id!=='train'||e.t>14)e.gone=true;break;}
   case 'horse':{e.x+=e.face*e.speed*dt;e.walkT+=dt;if(!e.loose)for(const q of P)if(q.alive&&q.inv<=0&&Math.abs(q.x-e.x)<20&&q.y>GY-28)hurtPlayer(q,'trampled');
    if(e.face>0?e.x>cam+ww+90:e.x<cam-90)e.gone=true;break;}
   case 'beam':{e.x-=330*dt;for(const q of P)if(q.alive&&q.inv<=0&&Math.abs(q.x-e.x)<16){const top=q.y-(q.slideT>0?10:q.duck?17:32);if(top<e.y)hurtPlayer(q,'bridge');}
    if(e.x<cam-80)e.gone=true;break;}
   case 'boulder':{e.x-=e.speed*dt;e.rot=(e.rot||0)-e.speed*dt/11;const f=floorAt(e.x,e.y-8);if(f<e.y-2&&f>e.y-30){e.y=f;}else if(f>e.y+1){e.vy=(e.vy||0)+GRAV*dt;e.y=Math.min(f,e.y+e.vy*dt);}else e.vy=0;
    for(const q of P)if(q.alive&&q.inv<=0&&Math.abs(q.x-e.x)<13&&q.y>e.y-22&&q.y<e.y+4)hurtPlayer(q,'boulder');if(e.x<cam-60)e.gone=true;break;}
   case 'rollkeg':{e.x-=e.speed*dt;e.rot=(e.rot||0)-e.speed*dt/9;for(const q of P)if(q.alive&&q.inv<=0&&Math.abs(q.x-e.x)<12&&q.y>GY-20){e.dead=true;e.gone=true;boom(e.x,e.y-9,44);}if(e.x<cam-50)e.gone=true;break;}
   case 'gunner':stepGunner(e,dt,p);break;
  }
  if(e.boss)stepBoss(e,dt,p);
 }
 // the gatling wagon: rolls in, the gunner sweeps bursts across the street, two pistoleros guard it
 function stepGunner(e,dt,p){const wg=e.wagon;if(wg.dead){killEnemy(e,null);return;}
  if(wg.x>e.stop){wg.x-=80*dt;e.x=wg.x+22;return;}e.x=wg.x+22;e.y=wg.y-wg.h;if(!p)return;e.face=-1;
  if(e.burst>0){e.burstT-=dt;if(e.burstT<=0){e.burstT=.09;e.burst--;const a=e.sweep0+(e.sweep1-e.sweep0)*(1-e.burst/12);EB.push({x:e.x-16,y:e.y-14,vx:Math.cos(a)*150,vy:Math.sin(a)*150,t:0});e.fireAnim=.15;FX.push({k:'flash',x:e.x-16,y:e.y-14,t:0,life:.05,dx:-1,dy:0,red:true});SFX.shot?.({vol:.3,low:true});}}
  else if((e.cool-=dt*Math.min(1.8,diff))<=0&&canShoot(e)){const tx=p.x,ty=p.y-14,base=Math.atan2(ty-(e.y-14),tx-(e.x-16));const up=s.random()<.5;e.sweep0=base+(up?-.32:.32);e.sweep1=base+(up?.3:-.3);e.burst=12;e.burstT=0;e.cool=1.6;}}

 // ------------------------------------------------------------------------------------------------ bosses
 function spawnBoss(){const type=STAGES[L.n%STAGES.length].boss,R=s.random,arena=cam;
  const hp=Math.round((70+L.n*14)*(np===2?1.6:1)*Math.min(1.7,diff));
  const b=addEnemy('boss',{boss:type,x:arena+ww+30,y:GY,goal:arena+ww*.74,hp,max:hp,face:-1,cool:1.4,pat:0,dmg:[0,0],stageT:0});
  if(type==='engineer'){const eng=L.cars.find(c=>c.kind==='engine');b.x=eng?eng.x+eng.w*.8:arena+ww*.8;b.y=TRAIN_ROOF;b.goal=b.x;b.perch=true;if(eng)L.arenaCam=Math.max(L.len,eng.x+eng.w+6-ww);}
  if(type==='rifleman'){const sh=[[.62,GY-92,64],[.24,GY-50,52],[.88,GY-58,46]].map(([f,y,w])=>{const x=cam+ww*f-w/2;L.ledges.push({x,w,y});L.plats.push({x0:x,x1:x+w,y,kind:'ledge'});return [x+w/2,y];});scen.clear();
   b.perches=sh;b.pi=0;b.x=b.perches[0][0];b.y=b.perches[0][1];b.goal=b.x;b.perch=true;}
  if(type==='general'){const t=L.tower;L.arenaCam=Math.max(L.len,t.x+t.w+12-ww);b.perches=[[t.x+48,GY-110],[t.x+48,GY-76],[t.x+48,GY-40]];b.pi=0;b.x=b.perches[0][0];b.y=b.perches[0][1];b.goal=b.x;b.perch=true;}
  L.boss=b;b.say={text:L.taunt[0],t:T};}
 function stepBoss(e,dt,p){
  if(e.goal!=null&&Math.abs(e.goal-e.x)>3&&!e.hop){e.x+=Math.sign(e.goal-e.x)*(e.dash?150:66)*dt;e.walkT+=dt;}else e.dash=false;
  if(e.hop){e.hop.t+=dt;const k=Math.min(1,e.hop.t/e.hop.d);e.x=e.hop.x0+(e.hop.x1-e.hop.x0)*k;e.y=e.hop.y0+(e.hop.y1-e.hop.y0)*k-Math.sin(k*Math.PI)*40;if(k>=1){e.x=e.hop.x1;e.y=e.hop.y1;e.goal=e.x;e.hop=null;}return;}
  if(!e.perch&&e.boss==='gunslinger'||e.boss==='engineer'&&e.down){const f=floorAt(e.x,e.y);if(e.y<f-1){e.vy=(e.vy||0)+GRAV*dt;e.y=Math.min(f,e.y+e.vy*dt);}}
  if(phase!=='boss'||!p)return;e.face=Math.sign(p.x-e.x)||-1;
  const hurt=1-e.hp/e.max,R=s.random,rate=(1+hurt*.6)*(e.mad?1.2:1)*Math.min(1.8,diff);
  if(hurt>=.5&&!e.mad){e.mad=true;e.cool=1.2;e.say={text:L.taunt[1],t:T};voice('sir-richard-laugh',{vol:.7});shake=Math.max(shake,6);spawnWave(['gun','rider',L.id==='train'?'climb':'perch'],null);}
  if((e.cool-=dt*rate)>0)return;
  const pats={gunslinger:['fan','burst','dash','dyn','fan','burst'],engineer:e.down?['fan','burst','dash','dyn']:['bundle','spread','coal','spread','bundle'],rifleman:['snipe','snipe','dyn','hop','snipe3'],general:['sweep','volley','hop','sweep','dyn']}[e.boss];
  const pat=pats[e.pat++%pats.length];
  const at=(tx,ty,o)=>enemyShot(e,tx,ty,o);
  if(pat==='fan'){for(const a of e.mad?[-.36,-.18,0,.18,.36]:[-.2,0,.2])at(p.x,p.y-18,{spread:a,speed:112});e.cool=1.5;}
  else if(pat==='burst'){for(let k=0;k<(e.mad?8:6);k++)after(k*.1,()=>{if(!e.dead&&phase==='boss'){const q=target(e.x,e.y);if(q)at(q.x,q.y-18,{speed:128,spread:(fxr()-.5)*.2});}});e.cool=1.9;}
  else if(pat==='dash'){e.goal=e.x<cam+ww/2?cam+ww*(.7+R()*.2):cam+ww*(.15+R()*.2);e.dash=true;for(let k=0;k<4;k++)after(.2+k*.22,()=>{if(!e.dead&&phase==='boss'){const q=target(e.x,e.y);if(q)at(q.x,q.y-18,{speed:120});}});e.cool=1.6;}
  else if(pat==='dyn'){for(let k=0;k<2+(hurt>.6?1:0);k++)lob(e,p.x+(k-1)*34,floorAt(p.x+(k-1)*34,p.y-4));e.cool=1.8;}
  else if(pat==='bundle'){for(let k=0;k<3;k++)after(k*.25,()=>{if(!e.dead){const q=target(e.x,e.y);if(q)lob(e,q.x+(fxr()-.5)*40,floorAt(q.x,q.y-4));}});e.cool=2;}
  else if(pat==='spread'){for(let k=-3;k<=3;k++)at(p.x,p.y-18,{spread:k*.1,speed:108});e.cool=1.6;}
  else if(pat==='coal'){for(let k=0;k<10;k++){const x=cam+ww*(.05+k*.09)+fxr()*12;EB.push({x,y:-10-k*14,vx:-16,vy:62+fxr()*30,t:0,coal:true});}e.cool=2.2;}
  else if(pat==='snipe'||pat==='snipe3'){const n=pat==='snipe3'?3:1;for(let k=0;k<n;k++)after(k*.45,()=>{if(!e.dead){const q=target(e.x,e.y);if(q){e.glint={t:T,x:q.x,y:q.y-18};after(.6,()=>{if(!e.dead&&phase==='boss'&&e.glint)at(e.glint.x,e.glint.y,{speed:215});});}}});e.cool=1.7+n*.3;}
  else if(pat==='sweep'){for(let k=0;k<10;k++)after(k*.08,()=>{if(!e.dead){const a=.2+k*.12;at(e.x+Math.cos(a)*-100,e.y+100,{speed:110});at(e.x+Math.cos(a)*100,e.y+100,{speed:110});}});e.cool=2;}
  else if(pat==='volley'){for(let k=0;k<5;k++)at(p.x,p.y-18,{spread:(k-2)*.08,speed:122});e.cool=1.4;}
  else if(pat==='hop'&&e.perches){let ni=e.pi;while(ni===e.pi)ni=Math.floor(R()*e.perches.length);e.pi=ni;const [x1,y1]=e.perches[ni];e.hop={t:0,d:.75,x0:e.x,y0:e.y,x1,y1};e.cool=1.1;}
  else e.cool=.8;
  // the engineer jumps down onto the train when he's hurt
  if(e.boss==='engineer'&&hurt>.55&&!e.down){e.down=true;e.perch=false;e.hop={t:0,d:.8,x0:e.x,y0:e.y,x1:cam+ww*.7,y1:floorAt(cam+ww*.7,0)};}}
 function bossDown(e){boom(e.x,e.y-24,44,{hurt:false});after(.25,()=>boom(e.x+14,e.y-40,36,{hurt:false}));after(.5,()=>boom(e.x-10,e.y-14,40,{hurt:false}));
  voice(fxr()<.5?'boss-death-1':'boss-death-2',{vol:.9});const tot=(e.dmg[0]||0)+(e.dmg[1]||0)||1;
  for(const p of P){const share=Math.round(L.bounty*(e.dmg[p.i]||0)/tot/10)*10;p.score+=share;p.bounty=share;if(share)TX.push({x:p.x,y:p.y-56,text:'BOUNTY +'+share,t:0,life:1.6,c:'#ffd34a',big:true});}
  if(L.bossId){const by=e.dmg[1]>e.dmg[0]&&np>1?1:0;if(!s.gameRecruits[by].includes(L.bossId))s.gameRecruits[by].push(L.bossId);}
  for(const q of E)if(!q.dead&&q!==e)killEnemy(q,null);EB.length=0;after(1.8,()=>endStage('clear'));}

 // ------------------------------------------------------------------------------------------------ set pieces
 function runEvent(ev){const R=s.random;
  switch(ev.kind){
   case 'stampede':banner={why:'warn',text:'STAMPEDE!',sub:'Get up high!',t:T};SFX.gallop?.({vol:.6,beats:18});SFX.whinny?.({vol:.5});
    after(1.9,()=>{for(let k=0;k<5+Math.min(3,L.loop);k++)after(k*.34,()=>addEnemy('horse',{x:cam-40-fxr()*10,y:GY,face:1,speed:250+fxr()*30,hostile:false}));});break;
   case 'keg':banner={why:'warn',text:'POWDER KEG!',sub:'Shoot it!',t:T};after(.8,()=>addEnemy('rollkeg',{x:cam+ww+20,y:GY,speed:72,hostile:false}));after(1.2,()=>spawnWave(['gun','gun'],null));break;
   case 'drop':for(let k=0;k<3;k++)after(k*.45,()=>spawnOne('drop'));break;
   case 'riders':for(let k=0;k<3+Math.min(2,L.loop);k++)after(k*1.1,()=>spawnOne('rider',k%2?-1:1));break;
   case 'bridge':banner={why:'warn',text:'LOW BRIDGE!',sub:'Duck!',t:T};SFX.whip?.({vol:.3});after(1.6,()=>addEnemy('beam',{x:cam+ww+30,y:TRAIN_ROOF-23,hostile:false}));break;
   case 'boulders':banner={why:'warn',text:'ROCKSLIDE!',sub:'Jump or shoot them',t:T};for(let k=0;k<3+Math.min(2,L.loop);k++)after(.8+k*1.3,()=>addEnemy('boulder',{x:cam+ww+20,y:floorAt(cam+ww+20,GY-40),speed:95+fxr()*25,hp:5,hostile:false}));break;
  }}
 function startLock(lk){lk.started=true;lk.t0=T;
  if(lk.kind==='gatling'){banner={why:'warn',text:'GATLING WAGON!',sub:'Shoot the gunner',t:T};const y=L.id==='train'?floorAt(cam+ww*.72,0):GY;
   const wg={x:cam+ww+30,w:58,h:22,kind:'wagon',y,hp:999,item:null,gatling:true};if(L.id!=='train')L.boxes.push(wg);
   const g=addEnemy('gunner',{x:wg.x+22,y:wg.y-wg.h,wagon:wg,stop:cam+ww*.66,hp:Math.round(24*(np===2?1.5:1)*Math.min(1.6,diff)),cool:1.6,burst:0,wave:lk});
   if(L.id==='train'){wg.y=floorAt(cam+ww*.7,0);wg.h=0;g.y=wg.y;}
   lk.spawned=1;lk.kinds=['gunner'];after(1.5,()=>spawnWave(['gun',L.id==='train'?'climb':'perch'],lk));return;}
  TX.push({x:cam+ww/2,y:60,text:'SHOWDOWN!',t:0,life:1.4,c:'#ffd34a',big:true});SFX.cock?.({vol:.5});
  const src=L.id==='train'?['climb','gun','sniper','climb','rider']:L.id==='canyon'?['ledge','gun','cover','rush','ledge','sniper','dyn']:['gun','window','door','perch','cover','drop','sniper','dyn'];
  const n=lk.size==='big'?8+Math.min(4,L.loop*2):5+Math.min(3,L.loop);lk.kinds=Array.from({length:n},(_,k)=>src[(k*3+Math.floor(s.random()*src.length))%src.length]);spawnWave(lk.kinds,lk);}

 // ------------------------------------------------------------------------------------------------ the frame
 function step(dt){T+=dt;phaseT+=dt;shake=Math.max(0,shake-dt*24);
  for(let k=later.length-1;k>=0;k--)if(T>=later[k].at){const f=later[k].fn;later.splice(k,1);f();}
  const live=phase==='play'||phase==='boss'||phase==='bossintro';
  for(const p of P)stepPlayer(p,dt);
  if(phase==='play'){const alive=P.filter(p=>p.alive);
   if(alive.length){const lead=Math.max(...alive.map(p=>p.x)),back=Math.min(...alive.map(p=>p.x)),lk=L.locks.find(l=>!l.done);
    const want=Math.min(lead-ww*.42,back-14);cam=Math.max(cam,Math.min(lk?lk.at:L.len,want));
    if(lk&&!lk.started&&cam>=lk.at-1)startLock(lk);
    if(lk&&lk.started){const left=E.filter(e=>e.wave===lk&&!e.dead&&!e.gone).length;if((lk.spawned>=lk.kinds.length&&left===0)||T-lk.t0>40){lk.done=true;goT=T;SFX.cock?.({vol:.4});}}
    for(const sp of L.spawns)if(!sp.done&&cam+ww>=sp.at+ww*.5){sp.done=true;for(let k=0;k<(sp.n||1);k++)after(k*.4,()=>spawnOne(sp.kind,sp.side));lastSpawn=T;}
    for(const ev of L.events)if(!ev.done&&cam>=ev.at-ww*.3){ev.done=true;runEvent(ev);}
    if(cam>lastCam+1){camMoved=T;lastCam=cam;}
    // never quiet: when the street empties, someone else shows up
    const lockOn=lk&&lk.started;const want2=2+Math.min(4,L.n+L.loop)+(np-1);
    if(!lockOn&&living().length<want2&&T-lastSpawn>(T-camMoved>8?3:1.15/Math.min(1.6,diff))){lastSpawn=T;const ks=['gun','gun','perch','window','rush','cover','dyn','sniper','drop'].filter(k=>L.id!=='train'||!['window','perch','cover','drop'].includes(k));spawnOne(ks[Math.floor(s.random()*ks.length)],s.random()<.15?-1:1);}
    if(cam>=L.len){phase='bossintro';phaseT=0;banner={why:'wanted',t:T};music.theme(BOSS_SONGS);voice('sir-richard-laugh',{vol:.7});spawnBoss();after(2.8,()=>{if(phase==='bossintro'){phase='boss';phaseT=0;}});}}}
  if((phase==='bossintro'||phase==='boss')&&L.arenaCam>cam)cam=Math.min(L.arenaCam,cam+140*dt);
  for(const e of E)stepEnemy(e,dt);
  for(let k=E.length-1;k>=0;k--){const e=E[k];if(e.gone||(e.dead&&e.deadT>2.4)||(!e.dead&&!e.boss&&!['horse','beam'].includes(e.kind)&&e.x<cam-150))E.splice(k,1);}
  // player bullets: enemies, kegs and crates, windows
  for(let k=B.length-1;k>=0;k--){const b=B[k];b.x+=b.vx*dt;b.y+=b.vy*dt;b.t+=dt;let used=false;
   for(const e of E){if(e.dead||e.gone||e.kind==='horse'||e.kind==='beam')continue;let hx=e.x,hy=e.y-20,hw=9,hh=21;
    if(e.kind==='window'){if(e.out<.6)continue;hy=e.y-18;hh=10;}else if(e.kind==='cover'){if(e.up<.5)continue;hy=e.y-18;hh=12;}
    else if(e.kind==='rider'){hy=e.y-40;hw=13;hh=16;}else if(e.boss){if(phase!=='boss')continue;hy=e.y-26;hw=13;hh=26;}else if(e.kind==='boulder'){hy=e.y-11;hw=11;hh=11;}else if(e.kind==='rollkeg'){hy=e.y-9;hw=9;hh=9;}else if(e.kind==='gunner'){hy=e.y-20;hw=9;hh=21;}
    if(Math.abs(b.x-hx)<hw&&Math.abs(b.y-hy)<hh){damage(e,b.o);used=true;spark(b.x,b.y,'#ffe8b0');break;}}
   if(!used){const bx0=boxAt(b.x,b.y);if(bx0){used=true;spark(b.x,b.y,'#ffe2a0');if(bx0.kind!=='wagon'){bx0.flash=.06;if(--bx0.hp<=0)breakBox(bx0,b.o);}else if(fxr()<.3)SFX.ricochet?.({vol:.12});}}
   if(!used&&!L.night)for(const bl of L.bld){if(b.x<bl.x||b.x>bl.x+bl.w)continue;for(const wn of bl.wins)if(!wn.broken&&!wn.man&&Math.abs(b.x-wn.x)<12&&Math.abs(b.y-wn.y)<12&&b.t>.08){wn.broken=true;for(let q=0;q<8;q++)FX.push({k:'splinter',x:wn.x,y:wn.y,vx:(fxr()-.5)*90,vy:-30-fxr()*60,t:0,life:.7,c:'#c8e0f0'});score(P[b.o],10,wn.x,wn.y-10);}}
   if(used||b.t>1.1||!inView(b.x,30)||b.y<-20||b.y>VH)B.splice(k,1);}
  // enemy shots
  for(let k=EB.length-1;k>=0;k--){const b=EB[k];b.t+=dt;
   if(b.dyn){b.vy+=GRAV*.8*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.spin+=dt*12;const f=floorAt(b.x,b.y-4);if(b.y>=f){b.y=f;b.vx*=.3;b.vy=0;b.fuse+=dt;if(b.fuse>.5){EB.splice(k,1);boom(b.x,b.y-6,32);}}continue;}
   b.x+=b.vx*dt;b.y+=b.vy*dt;if(!b.coal&&boxAt(b.x,b.y)){EB.splice(k,1);spark(b.x,b.y,'#ffb080');continue;}
   for(const p of P){if(!p.alive||p.inv>0)continue;if(p.slideT>0&&!b.coal)continue;const top=p.y-(p.duck?17:31);if(Math.abs(b.x-p.x)<6&&b.y>top&&b.y<p.y-1){hurtPlayer(p);b.dead=true;break;}}
   if(b.dead||b.t>5||b.y>VH||!inView(b.x,60))EB.splice(k,1);}
  for(let k=items.length-1;k>=0;k--){const it=items[k];it.t+=dt;if(!it.landed){it.vy+=GRAV*.6*dt;it.y+=it.vy*dt;const f=floorAt(it.x,it.y-6);if(it.y>=f-7&&it.vy>0){it.y=f-7;it.landed=true;}}
   for(const p of P)if(p.alive&&Math.abs(p.x-it.x)<13&&Math.abs(p.y-14-it.y)<22){items.splice(k,1);takeItem(p,it);break;}
   if(it.t>15||it.x<cam-30)items.splice(k,1);}
  for(let k=FX.length-1;k>=0;k--){const f=FX[k];f.t+=dt;if(f.vx!==undefined){f.vy+=(f.k==='smoke'?-10:300)*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;}if(f.t>f.life)FX.splice(k,1);}
  for(let k=TX.length-1;k>=0;k--){if((TX[k].t+=dt)>TX[k].life)TX.splice(k,1);}
  for(const b of L.boxes)if(b.flash>0)b.flash-=dt;
  if(live&&P.every(p=>p.out&&!p.alive&&p.contT<=0))endStage('dead');
  s.setScores?.(solo?[total[0]+P[0].score,0]:P.map(p=>p.score+total[p.i]));
 }
 const spark=(x,y,c)=>{for(let k=0;k<4;k++)FX.push({k:'spark',x,y,vx:(fxr()-.5)*90,vy:-fxr()*90,t:0,life:.22,c});};

 // ------------------------------------------------------------------------------------------------ stage flow
 function startStage(){
  L=buildStage(stageNo,seededRandom(`${s.seed}:sundown:${stageNo}`));diff=1+stageNo*.13;
  const names=BOSS_NAMES[STAGES[stageNo%STAGES.length].boss];L.bossName=names[Math.floor(s.random()*names.length)];
  L.taunt=TAUNTS[Math.floor(s.random()*TAUNTS.length)];L.bounty=5000+stageNo*2000;L.bossId=bossPool.length?bossPool[Math.floor(s.random()*bossPool.length)]:null;L.boss=null;
  E.length=0;B.length=0;EB.length=0;FX.length=0;TX.length=0;items.length=0;later.length=0;cam=0;lastCam=0;camMoved=T;lastSpawn=T;ending=false;banner=null;goT=-9;scen.clear();
  for(const p of P)if(!p.out||campaign){const y=floorAt(50+p.i*28,0);Object.assign(p,{x:50+p.i*28,y,vx:0,vy:0,alive:p.lives>0,out:p.lives<=0,inv:INV,power:null,score:0,ground:true,stageKills:0,bounty:0,lifeBonus:0,slideT:0,combo:0});}
  const theme=STAGE_SONGS[L.id];
  if(firstStage){music.theme(TITLE_SONG);music.start();}else music.sting('wanted',()=>music.theme(theme));
  phase=firstStage?'title':'card';firstStage=false;phaseT=0;controls.reset();
 }
 function endStage(why){if(ending)return;ending=true;phase='end';phaseT=0;banner={why,t:T};
  if(why==='clear'){for(const p of P){p.lifeBonus=p.out?0:500*Math.max(0,p.lives);p.score+=p.lifeBonus;}voice(fxr()<.5?'player-taunt-1':'player-taunt-2',{vol:.9});music.sting('yippie');}
  else{music.sting('gameover');if(why==='dead')after(1.2,()=>voice('please-continue',{vol:.9}));}
  after(why==='clear'?5:3.4,()=>afterStage(why));}
 function afterStage(why){for(const p of P){total[p.i]+=p.score;p.score=0;}
  if(campaign&&why==='clear'){cleared++;if(solo)soloProgress(s,total[0],cleared,`Stage ${cleared} cleared`);stageNo++;for(const p of P)if(!p.out)p.lives=Math.min(5,p.lives+1);startStage();return;}
  if(solo){soloFinish(s,total[0],cleared,`Sundown Showdown: ${total[0].toLocaleString()} points, ${cleared} stage${cleared===1?'':'s'} cleared.`);return;}
  const [a,b]=total,n=s.players.map(p=>p.name);
  s.finish([a,b],`Sundown Showdown: ${n[0]} ${a.toLocaleString()} · ${n[1]} ${b.toLocaleString()}${campaign?` · ${cleared} stage${cleared===1?'':'s'} cleared`:why==='clear'?' · the boss is down':''}.`);}

 // ------------------------------------------------------------------------------------------------ autopilot (tests)
 function botInput(p){let best=null,bd=1e9;
  for(const e of E){if(e.dead||e.gone||e.kind==='horse'||e.kind==='beam'||(e.kind==='window'&&e.out<.6)||(e.kind==='cover'&&e.up<.5)||!inView(e.x,-4)||(e.boss&&phase!=='boss'))continue;const d=Math.hypot(e.x-p.x,(e.y-18)-(p.y-20));if(d<bd){bd=d;best=e;}}
  let x=phase==='play'&&!(best&&bd<90)?1:0,y=0;
  if(best){const dx=best.x-p.x,dy=(best.y-(best.boss?26:16))-(p.y-22);const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4)),d=DIR8[(a+8)%8];
   if(d[1]<0){y=-1;x=d[0];}else if(d[1]>0&&!p.ground){y=1;x=d[0];}else if(!x)x=Math.sign(dx)||1;if(d[1]===0&&Math.sign(dx)!==Math.sign(x)&&x)x=Math.sign(dx);}
  const threat=EB.some(b=>Math.abs(b.x-p.x)<34&&(b.dyn?b.y>p.y-30:b.y>p.y-32&&b.y<p.y))||E.some(e=>!e.dead&&['rush','boulder','rollkeg','horse'].includes(e.kind)&&Math.abs(e.x-p.x)<46&&Math.abs(e.y-p.y)<24);
  const ahead=p.x+(x>0?10:-10),blocked=x&&p.ground&&(L.boxes.some(b=>!b.dead&&ahead>b.x-4&&ahead<b.x+b.w+4&&b.y-b.h<p.y-2&&b.y>p.y-30)||L.cars.some(c=>ahead>c.x-3&&ahead<c.x+c.w+3&&c.y<p.y-2)||floorAt(ahead,p.y)>p.y+12);
  if(blocked)return {x,y:0,fire:!!best,jump:true,jumps:1};
  const beam=E.some(e=>e.kind==='beam'&&e.x-p.x<70&&e.x>p.x-20);if(beam&&p.ground)return {x:0,y:1,fire:true,jump:false,jumps:0};
  return {x,y,fire:!!best,jump:threat,jumps:threat&&p.ground?1:0};}

 // ------------------------------------------------------------------------------------------------ drawing (buffer)
 const heads=[];   // faces + hats drawn after the buffer, at full resolution
 function sprite(name,row,{t=0,fps=10,loop=true,index=null}={},wx,wy,f=1,alpha=1){
  const sh=SPR.sheet(name);if(!sh)return null;const {img,def}=sh,fr=SPR.frameOf(def,row,t,{fps,loop,index}),sc=def.scale*S;
  const X=bx(wx),Y=by(wy),w=Math.round(fr.w*sc),h=Math.round(fr.h*sc);pg.save();pg.globalAlpha*=alpha;pg.translate(X,Y);if(f<0)pg.scale(-1,1);
  pg.drawImage(img,fr.sx,fr.sy,fr.w,fr.h,-Math.round(def.foot[0]*sc),-Math.round(def.foot[1]*sc),w,h);pg.restore();return {def,fr,sc,X,Y,f};}
 function headJob(at,id,mood,hat,alpha=1,label=null){const hp=SPR.headAt(at.def,at.fr.row,at.fr.f);if(!hp)return;heads.push({bx:at.X+(hp[0]-at.def.foot[0])*at.sc*at.f,by:at.Y+(hp[1]-at.def.foot[1])*at.sc,size:at.def.headSize*at.sc*1.12,id,mood,hat,flip:at.f<0,alpha,label});}
 function cowboyRow(p){
  if(!p.alive)return ['death',{index:Math.floor(p.deadT*10),loop:false}];
  if(p.slideT>0)return ['slide',{index:Math.min(2,Math.floor((1-p.slideT/SLIDE_T)*3))}];
  if(!p.ground)return ['jump',{index:p.vy<-120?0:p.vy<0?1:p.vy<160?2:3}];
  const [ax,ay]=p.aim;if(p.duck)return [p.firing?'duckShoot':'duck',{t:p.animT,fps:8}];
  if(Math.abs(p.vx)>8)return [p.firing&&ay===0?'runShoot':'run',{t:p.walkT,fps:13}];
  if(p.firing||ay)return [ay<0&&!ax?'shootUp':ay<0?'shootDiagUp':ay>0?'shootDiagDown':'shoot',{t:p.animT,fps:12}];
  return ['idle',{t:p.animT,fps:5}];}
 const SHEET={gun:'bandit',perch:'bandit',drop:'bandit',climb:'bandit',ledge:'bandit',cover:'bandit',sniper:'bandit',gunner:'bandit',rush:'knife',dyn:'dynamite',window:'window',rider:'rider',horse:'horse',boss:'boss'};
 function enemyRow(e){
  if(e.dead)return [e.kind==='rider'?'fall':'death',{index:Math.floor(e.deadT*10),loop:false}];
  switch(e.kind){
   case 'rush':return ['run',{t:e.walkT,fps:14}];
   case 'dyn':return e.throwT>0?['throw',{index:Math.floor((.35-e.throwT)/.35*3)}]:e.goal!=null&&Math.abs(e.goal-e.x)>3?['walk',{t:e.walkT,fps:10}]:['idle',{t:e.t,fps:4}];
   case 'cover':return e.up<.5?['cover',{t:e.t,fps:4}]:['shoot',{t:e.t,fps:8}];
   case 'sniper':return e.aimT>0?['shoot',{index:0}]:['cover',{t:e.t,fps:3}];
   case 'window':return e.fireAnim>0?['shoot',{t:e.t,fps:10}]:e.out<.95?['peek',{index:e.out<.5?0:1}]:['peek',{index:1}];
   case 'rider':return e.fireAnim>0?['shoot',{t:e.t,fps:10}]:['gallop',{t:e.walkT,fps:12}];
   case 'horse':return ['gallop',{t:e.walkT,fps:14}];
   case 'boss':return e.flash>0&&e.hp>0?['hurt',{t:e.t,fps:10}]:e.throwT>0?['throw',{index:Math.floor((.35-e.throwT)/.35*3)}]:e.fireAnim>0?['shoot',{t:e.t,fps:12}]:Math.abs((e.goal??e.x)-e.x)>3?['walk',{t:e.walkT,fps:9}]:['idle',{t:e.t,fps:4}];
   default:return e.fireAnim>0||e.aimT>0?['shoot',{t:e.t,fps:10}]:e.goal!=null&&Math.abs(e.goal-e.x)>3||!e.ground?['walk',{t:e.walkT,fps:10}]:['idle',{t:e.t,fps:4}];}}
 function drawPlayer(p){if(p.out&&!p.alive&&p.deadT>1.6)return;
  const blink=p.alive&&p.inv>.15&&Math.floor(T*14)%2,[row,o]=cowboyRow(p),a=blink?.4:1;
  const at=sprite('cowboy-p'+(p.i+1),row,o,p.x,p.y,p.face,a);
  if(at){headJob(at,s.players[p.i].character,p.alive?(p.firing?'angry':p.combo>=3?'win':'normal'):'sad',p.alive||p.deadT<.3?'hat-p'+(p.i+1):null,a,np>1&&p.alive?'P'+(p.i+1):null);}
  else{const X=bx(p.x),Y=by(p.y),hh=Math.round((p.duck?18:34)*S);pg.globalAlpha=a;pg.fillStyle=p.i?'#c93a4a':'#2d6bd6';pg.fillRect(X-7,Y-hh,14,hh);pg.globalAlpha=1;
   heads.push({bx:X,by:Y-hh-10,size:26,id:s.players[p.i].character,mood:'normal',hat:'hat-p'+(p.i+1),flip:p.face<0,alpha:a});}
  if(p.power&&p.alive){const X=bx(p.x),Y=by(p.y-48);pg.fillStyle=p.power==='two'?'#ffd34a':'#7affc8';pg.fillRect(X-1,Y,3,3);}
  if(!p.alive&&p.deadT<1.2){const t=T-p.hatT;const hx=bx(p.x-p.face*t*30),hy=by(p.y-40-60*t+120*t*t);if(hy<by(p.y)){heads.push({bx:hx,by:hy,size:0,hat:'hat-p'+(p.i+1),flip:false,alpha:1,onlyHat:true});}}}
 function drawEnemy(e){const fade=e.dead?Math.max(0,1-Math.max(0,e.deadT-1.4)):e.appear!=null?Math.min(1,e.appear*1.4):1;
  if(e.kind==='beam')return drawBeam(e);if(e.kind==='boulder')return drawBoulder(e);if(e.kind==='rollkeg')return drawKeg(e);
  if(e.kind==='gunner'){drawGatling(e);}
  if(e.boss&&!SPR.sheet('boss')){drawBossBody(e,fade);return;}
  const [row,o]=enemyRow(e),name=SHEET[e.kind]||'bandit';
  const at=e.kind==='window'?((e.out>.05||e.dead)?sprite('window',row,o,e.win.x,e.win.y+16,e.face,fade):null):sprite(name,row,o,e.x,e.y,e.face,fade);
  if(!at&&e.kind!=='window'){const X=bx(e.x),Y=by(e.y),hh=Math.round(34*S);pg.globalAlpha=fade;pg.fillStyle='#5a3a26';pg.fillRect(X-7,Y-hh,14,hh);pg.fillStyle='#7a1a1a';pg.fillRect(X-6,Y-hh-6,12,8);pg.globalAlpha=1;}
  if(at&&e.flash>0&&!e.dead){pg.save();pg.globalAlpha=.6;pg.globalCompositeOperation='lighter';sprite(e.kind==='window'?'window':name,row,o,e.kind==='window'?e.win.x:e.x,e.kind==='window'?e.win.y+16:e.y,e.face);pg.restore();}
  if(e.boss&&at&&L.bossId)headJob(at,L.bossId,e.dead?'sad':e.mad?'angry':'normal',null,fade);
  if(e.kind==='sniper'&&e.aimT>0&&!e.dead&&e.lock){pg.strokeStyle=`rgba(255,60,40,${.25+.5*Math.floor(T*16)%2})`;pg.lineWidth=1;pg.beginPath();pg.moveTo(bx(e.x+e.face*10),by(e.y-22));pg.lineTo(bx(e.lock[0]),by(e.lock[1]));pg.stroke();pg.fillStyle='#fff';pg.fillRect(bx(e.x+e.face*10)-1,by(e.y-22)-1,3,3);}}
 function drawBossBody(e,fade){const X=bx(e.x),Y=by(e.y),f=e.face,leg=Math.sin((e.walkT||0)*10);pg.save();pg.globalAlpha=fade;pg.translate(X,Y);if(f<0)pg.scale(-1,1);if(e.dead)pg.rotate(-Math.min(1.5,e.deadT*3));
  const hit=e.flash>0&&Math.floor(T*30)%2===0;const lift=c=>'#'+c.slice(1).match(/../g).map(h=>Math.min(255,parseInt(h,16)+90).toString(16).padStart(2,'0')).join('');const R=(x,y,w,h,c)=>{pg.fillStyle=hit?lift(c):c;pg.fillRect(x,y,w,h);};
  R(-7+Math.round(leg*2),-20,6,20,'#1a1410');R(1-Math.round(leg*2),-20,6,20,'#241a14');R(-9+Math.round(leg*2),-2,9,3,'#0a0806');R(0-Math.round(leg*2),-2,9,3,'#0a0806');
  R(-12,-58,24,40,'#1c1c24');R(-12,-58,24,2,'#34343e');R(-14,-30,4,16,'#1c1c24');R(10,-30,4,18,'#1c1c24');R(-10,-56,4,36,'#8a1a1a');R(-4,-56,8,10,'#e8d8b0');R(-2,-50,4,8,'#7a1a1a');
  R(-12,-30,24,4,'#3a2414');R(-2,-30,5,4,'#d8b040');
  const up=e.throwT>0;pg.save();pg.translate(6,-48);pg.rotate(up?-1.3:e.fireAnim>0?0:.5);R(0,-3,14,6,'#1c1c24');R(13,-3,4,6,'#d8a880');R(16,-4,12,3,'#3a3a44');R(16,-1,3,5,'#3a3a44');pg.restore();
  pg.restore();if(!e.dead||e.deadT<1.5)heads.push({bx:X,by:Y-Math.round(64*S/1.333),size:30,id:L.bossId,mood:e.dead?'sad':e.mad?'angry':'normal',hat:'boss',flip:f<0,alpha:fade});
  if(e.glint&&T-e.glint.t<.55){pg.strokeStyle=`rgba(255,60,40,${.3+.5*(Math.floor(T*18)%2)})`;pg.lineWidth=1;pg.beginPath();pg.moveTo(X+f*20,Y-60);pg.lineTo(bx(e.glint.x),by(e.glint.y));pg.stroke();}}
 function drawBeam(e){const X=bx(e.x),Y=by(e.y);pg.fillStyle='#2a2a32';pg.fillRect(X-14,0,28,Y);pg.fillStyle='#4a4a56';for(let y=0;y<Y;y+=14){pg.fillRect(X-14,y,28,2);pg.beginPath();pg.moveTo(X-14,y);pg.lineTo(X+14,y+14);pg.lineTo(X+12,y+14);pg.lineTo(X-14,y+2);pg.fill();}
  pg.fillStyle='#1a1a20';pg.fillRect(X-18,Y-6,36,6);pg.fillStyle='#8a8a96';for(let x=-16;x<16;x+=6)pg.fillRect(X+x,Y-4,2,2);}
 function drawBoulder(e){const X=bx(e.x),Y=by(e.y-11),r=Math.round(11*S);pg.fillStyle='#4a2414';pg.beginPath();pg.arc(X,Y,r+1,0,7);pg.fill();pg.fillStyle='#8a4a2a';pg.beginPath();pg.arc(X,Y,r,0,7);pg.fill();pg.fillStyle='#a8603a';pg.beginPath();pg.arc(X-3,Y-4,r*.5,0,7);pg.fill();
  pg.fillStyle='#3a1a0c';for(let k=0;k<3;k++){const a=(e.rot||0)+k*2.1;pg.fillRect(X+Math.round(Math.cos(a)*r*.6),Y+Math.round(Math.sin(a)*r*.6),3,2);}}
 function drawKeg(e){const X=bx(e.x),Y=by(e.y-9);pg.save();pg.translate(X,Y);pg.rotate(e.rot||0);pg.fillStyle='#1a0a04';pg.fillRect(-12,-12,24,24);pg.fillStyle='#a82020';pg.fillRect(-11,-11,22,22);pg.fillStyle='#3a3a3a';pg.fillRect(-11,-6,22,2);pg.fillRect(-11,4,22,2);pg.restore();
  if(Math.floor(T*8)%2){pg.fillStyle='#ffd04a';pg.fillRect(X+Math.round(Math.cos((e.rot||0)-1.6)*14),Y+Math.round(Math.sin((e.rot||0)-1.6)*14),3,3);}}
 function drawGatling(e){const X=bx(e.x-14),Y=by(e.y-16);pg.fillStyle='#2a2a30';pg.fillRect(X-10,Y-2,22,6);pg.fillStyle='#5a5a66';for(let k=0;k<3;k++)pg.fillRect(X-22,Y-1+k*2,14,1);pg.fillStyle='#6a4a24';pg.fillRect(X+8,Y+4,3,10);}
 function drawShots(){const bp=SPR.picture('bullet'),ep=SPR.picture('enemy-bullet'),dp=SPR.picture('dynamite-stick');
  for(const b of B){if(bp){pg.save();pg.translate(bx(b.x),by(b.y));pg.rotate(Math.atan2(b.vy,b.vx));pg.drawImage(bp,-Math.round(bp.width/2),-Math.round(bp.height/2));pg.restore();}
   else{pg.fillStyle=b.o?'#ffd0ea':'#e0f4ff';pg.fillRect(bx(b.x)-2,by(b.y)-1,4,2);}}
  for(const b of EB){const X=bx(b.x),Y=by(b.y);
   if(b.dyn){if(dp){pg.save();pg.translate(X,Y);pg.rotate(b.spin);pg.drawImage(dp,-4,-8);pg.restore();}else{pg.fillStyle='#d22';pg.fillRect(X-2,Y-5,4,10);}if(Math.floor(T*20)%2){pg.fillStyle='#ffd34a';pg.fillRect(X-1,Y-9,3,3);}continue;}
   if(b.coal){pg.fillStyle='#1a1a1e';pg.fillRect(X-3,Y-3,6,6);pg.fillStyle='#ff6a2a';pg.fillRect(X-1,Y-1,2,2);continue;}
   if(ep)pg.drawImage(ep,X-3,Y-3);else{pg.fillStyle='#ff7a2a';pg.fillRect(X-2,Y-2,5,5);pg.fillStyle='#ffe2a0';pg.fillRect(X-1,Y-1,2,2);}}
  for(const it of items){const X=bx(it.x),Y=by(it.y+Math.sin(it.t*5)*1.5),pic=SPR.picture('item-'+it.kind);if(it.t>12&&Math.floor(T*8)%2)continue;
   if(pic)pg.drawImage(pic,X-Math.round(pic.width/2),Y-Math.round(pic.height/2));else{pg.fillStyle=it.kind==='gold'?'#e8c040':it.kind==='two'?'#c0c0c8':'#7affc8';pg.fillRect(X-5,Y-5,10,10);}}
  for(const f of FX){const a=1-f.t/f.life,X=bx(f.x),Y=by(f.y);
   if(f.k==='flash'){const ms=SPR.sheet('muzzle');if(ms)sprite('muzzle','flash',{index:Math.floor(f.t/f.life*3)},f.x,f.y,Math.sign(f.dx)||1);else{pg.fillStyle=f.red?'#ffb070':'#fff6c0';pg.fillRect(X-3,Y-3,7,7);pg.fillStyle='#fff';pg.fillRect(X-1,Y-1,3,3);pg.fillRect(X+Math.round(f.dx*6)-1,Y+Math.round(f.dy*6)-1,3,3);}}
   else if(f.k==='spark'){pg.fillStyle=f.c;pg.fillRect(X,Y,2,2);}
   else if(f.k==='splinter'){pg.fillStyle=f.c;pg.fillRect(X,Y,3,2);}
   else if(f.k==='shell'){pg.fillStyle='#e8c060';pg.fillRect(X,Y,2,1);}
   else if(f.k==='dust'){pg.fillStyle=`rgba(210,170,120,${a*.6})`;const r=Math.round(2+f.t*10);pg.fillRect(X-r,Y-r,r*2,r*2);}
   else if(f.k==='smoke'){pg.fillStyle=`rgba(60,50,50,${a*.5})`;const r=Math.round(f.r*(1+f.t));pg.beginPath();pg.arc(X,Y,r,0,7);pg.fill();}
   else if(f.k==='boom'){const es=SPR.sheet('explosion');if(es){sprite('explosion','boom',{index:Math.floor(f.t/f.life*8)},f.x,f.y+f.r*.4,1);continue;}
    const r=Math.round(f.r*S*(.4+f.t/f.life*.8));pg.fillStyle=`rgba(255,${120+Math.round(a*120)},40,${a})`;pg.beginPath();pg.arc(X,Y,r,0,7);pg.fill();pg.fillStyle=`rgba(255,250,200,${a})`;pg.beginPath();pg.arc(X,Y,r*.55*a,0,7);pg.fill();}}}

 // ------------------------------------------------------------------------------------------------ drawing (screen)
 const U=()=>Math.max(.8,Math.min(1.8,Math.min(W,H)/380));
 const bangers=px=>`400 ${px}px "SC Bangers",Impact,sans-serif`,nunito=(px,w=800)=>`${w} ${px}px "SC Nunito",sans-serif`;
 function outlined(text,X,Y,fill,stroke='#2a0a04',lw=6){cx.lineJoin='round';cx.strokeStyle=stroke;cx.lineWidth=lw;cx.strokeText(text,X,Y);cx.fillStyle=fill;cx.fillText(text,X,Y);}
 function drawHeads(){const k=K;for(const h of heads){const X=view.x+h.bx*k,Y=view.y+h.by*k,sz=h.size*k;cx.save();cx.globalAlpha=h.alpha;
  if(!h.onlyHat&&h.id){const hc=head(h.id,h.mood,96);if(hc&&hc.width){cx.translate(X,Y);if(h.flip)cx.scale(-1,1);cx.drawImage(hc,-sz/2,-sz/2,sz,sz);cx.setTransform(1,0,0,1,0,0);}}
  const hatName=h.hat==='boss'?null:h.hat,hi=hatName&&SPR.picture(hatName);
  if(hi){const w=hi.width*k,hh=hi.height*k,top=h.onlyHat?Y:Y-sz*.3;cx.imageSmoothingEnabled=false;cx.translate(X,top);if(h.flip)cx.scale(-1,1);cx.drawImage(hi,-w/2,-hh,w,hh);cx.setTransform(1,0,0,1,0,0);}
  else if(h.hat){const hs=Math.max(sz,18*k),top=Y-hs*.36;cx.fillStyle=h.hat==='boss'?'#0d0d10':h.hat==='hat-p2'?'#5a1a1a':'#2a1a10';cx.fillRect(X-hs*.58,top,hs*1.16,hs*.12);cx.beginPath();cx.moveTo(X-hs*.32,top);cx.quadraticCurveTo(X,top-hs*.55,X+hs*.32,top);cx.fill();cx.fillStyle=h.hat==='boss'?'#8a1a1a':h.hat==='hat-p2'?'#c93a4a':'#2d6bd6';cx.fillRect(X-hs*.32,top-hs*.12,hs*.64,hs*.1);}
  if(h.label){cx.globalAlpha=1;cx.font=nunito(Math.max(9,9*k),900);cx.textAlign='center';cx.textBaseline='bottom';outlined(h.label,X,Y-sz*.55-(hi?hi.height*k:sz*.4),h.label==='P1'?'#8ad8ff':'#ffa0d4','#000',3);}
  cx.restore();}}
 function drawTexts(){const u=U();cx.textAlign='center';cx.textBaseline='middle';for(const t of TX){const a=Math.min(1,(1-t.t/t.life)*2.5);cx.globalAlpha=a;cx.font=bangers((t.big?19:13)*u);outlined(t.text,toX(t.x),toY(t.y-t.t*26),t.c,'#1a0604',4);}cx.globalAlpha=1;}
 function drawHUD(){const u=Math.max(.8,Math.min(1.5,Math.min(W,H)/400)),top=view.y>0?Math.max(fb.top+8,view.y-40*u):Math.max(44,fb.top+10);cx.textBaseline='middle';
  P.forEach((p,i)=>{const bw=168*u,bx0=8+i*Math.min(bw+8,(W-150)/2),by0=top+16*u;cx.fillStyle='#000a';cx.beginPath();cx.roundRect?.(bx0,by0-15*u,bw,32*u,10*u);cx.fill();
   const hc=head(s.players[i].character,p.alive?'normal':'sad',48);if(hc&&hc.width)cx.drawImage(hc,bx0+4*u,by0-13*u,26*u,26*u);
   cx.fillStyle=i?'#ffa0d4':'#8ad8ff';cx.font=nunito(12*u,900);cx.textAlign='left';cx.fillText((p.score+total[i]).toLocaleString(),bx0+34*u,by0-5*u);
   const hat=SPR.picture('hat-p'+(i+1));for(let k=0;k<Math.max(0,p.lives);k++){if(hat){cx.imageSmoothingEnabled=false;cx.drawImage(hat,bx0+34*u+k*17*u,by0+3*u,15*u,10*u);}else{cx.fillStyle=i?'#c93a4a':'#2d6bd6';cx.fillRect(bx0+34*u+k*14*u,by0+5*u,11*u,5*u);}}
   if(p.power){const w=Math.max(0,p.powerT/POWER_T);cx.fillStyle='#000';cx.fillRect(bx0+110*u,by0+4*u,48*u,6*u);cx.fillStyle=p.power==='two'?'#ffd34a':'#7affc8';cx.fillRect(bx0+110*u,by0+4*u,48*u*w,6*u);cx.font=nunito(8*u,900);cx.fillText(p.power==='two'?'2 GUNS':'RAPID',bx0+110*u,by0-6*u);}
   if(p.combo>=2&&p.alive){cx.fillStyle='#ffd34a';cx.font=bangers(14*u);cx.textAlign='right';cx.fillText(`×${p.combo}`,bx0+bw-8*u,by0-4*u);}
   if(p.out&&!p.alive){cx.fillStyle=p.contT>0?'#ffd34a':'#ff6a6a';cx.font=nunito(10*u,900);cx.textAlign='right';cx.fillText(p.contT>0?`CONTINUE? ${Math.ceil(p.contT)}`:'OUT',bx0+bw-8*u,by0+6*u);}});
  const name=STAGES[L.n%STAGES.length].name;cx.textAlign='center';cx.font=bangers(14*u);cx.fillStyle='#ffe2a0';
  const ty=view.y>0?view.y+view.h+16*u:top+40*u;if(view.y>0||phase==='play'&&phaseT<4)cx.fillText(`STAGE ${L.n+1} · ${name}`,W/2,ty);
  if((phase==='boss'||phase==='bossintro')&&L.boss&&!L.boss.dead){const bw=Math.min(W*.6,360*u),bx0=W/2-bw/2,by0=view.y+view.h-18*u;cx.fillStyle='#000b';cx.fillRect(bx0-2,by0-2,bw+4,10*u+4);cx.fillStyle='#c22';cx.fillRect(bx0,by0,bw*L.boss.hp/L.boss.max,10*u);cx.fillStyle='#fff';cx.font=nunito(9*u,900);cx.fillText(`WANTED: ${L.bossName}`,W/2,by0-8*u);}
  const lk=L.locks.find(l=>l.started&&!l.done);if(lk&&phase==='play'&&lk.kind!=='gatling'){const left=E.filter(e=>e.wave===lk&&!e.dead&&!e.gone).length+(lk.kinds.length-lk.spawned);cx.font=bangers(13*u);cx.fillStyle='#ffd34a';cx.fillText(`OUTLAWS LEFT: ${left}`,W/2,ty+18*u);}}
 function poster(alpha=1){const u=U(),pw=Math.min(W*.62,230*u,H*.62/1.3),ph=pw*1.3,px=W/2-pw/2,py=H*.52-ph/2;cx.globalAlpha=alpha;
  const pp=SPR.picture('poster');if(pp){cx.imageSmoothingEnabled=false;cx.drawImage(pp,px,py,pw,ph);}else{cx.fillStyle='#e9d3a1';cx.fillRect(px,py,pw,ph);cx.strokeStyle='#6a4a2a';cx.lineWidth=4;cx.strokeRect(px+6,py+6,pw-12,ph-12);}
  cx.fillStyle='#3a1a0a';cx.textAlign='center';cx.textBaseline='middle';cx.font=bangers(pw*.2);cx.fillText('WANTED',W/2,py+ph*.13);cx.font=`700 ${pw*.06}px Georgia,serif`;cx.fillText('DEAD OR ALIVE',W/2,py+ph*.23);
  const hc=L.bossId?head(L.bossId,'angry',160):null,hs=pw*.5;cx.fillStyle='#cdb38288';cx.fillRect(W/2-hs/2-5,py+ph*.28,hs+10,hs+10);if(hc&&hc.width)cx.drawImage(hc,W/2-hs/2,py+ph*.28+5,hs,hs);
  cx.fillStyle='#3a1a0a';cx.font=bangers(pw*.1);cx.fillText(L.bossName,W/2,py+ph*.28+hs+pw*.13);cx.font=bangers(pw*.13);cx.fillText('$'+L.bounty.toLocaleString(),W/2,py+ph*.89);cx.globalAlpha=1;}
 function titleScreen(){const u=U();const g=cx.createLinearGradient(0,0,0,H);['#1a0c2a','#7a2a4a','#e0603a','#ffb85a'].forEach((c2,i)=>g.addColorStop(i/3,c2));cx.fillStyle=g;cx.fillRect(0,0,W,H);
  cx.fillStyle='#ffe9a8';cx.beginPath();cx.arc(W/2,H*.64,Math.min(W,H)*.22,0,7);cx.fill();cx.fillStyle='#3a1426';cx.beginPath();cx.moveTo(0,H*.68);for(let px=0;px<=W;px+=W/12)cx.lineTo(px,H*.68-((px*7)%5)*u*6-u*10);cx.lineTo(W,H);cx.lineTo(0,H);cx.fill();
  const logo=SPR.picture('logo');
  if(logo){const w=Math.min(W*.9,logo.width*u*.9,H*.36*logo.width/logo.height),h=w*logo.height/logo.width;cx.imageSmoothingEnabled=false;cx.drawImage(logo,W/2-w/2,H*.27-h/2,w,h);}
  else{cx.textAlign='center';cx.textBaseline='middle';cx.font=bangers(48*u);outlined('SUNDOWN',W/2,H*.22,'#ffd34a','#5a0a04',7*u);cx.font=bangers(36*u);outlined('SHOWDOWN',W/2,H*.32,'#fff0c0','#5a0a04',6*u);}
  const fy=H*.6,fs=Math.min(W*.2,88*u,H*.2);P.forEach((p,i)=>{const X=np===1?W/2:W/2+(i?1:-1)*Math.min(W*.22,130*u),hc=head(s.players[i].character,'win',128);if(hc&&hc.width)cx.drawImage(hc,X-fs/2,fy-fs/2,fs,fs);
   const hat=SPR.picture('hat-p'+(i+1));if(hat){const w=fs*1.05,h=w*hat.height/hat.width;cx.imageSmoothingEnabled=false;cx.drawImage(hat,X-w/2,fy-fs*.3-h,w,h);}
   cx.font=nunito(13*u,900);cx.fillStyle='#fff';cx.textAlign='center';cx.fillText(s.players[i].name.toUpperCase(),X,fy+fs*.64);});
  if(Math.floor(T*2.2)%2===0){cx.font=bangers(22*u);cx.textAlign='center';outlined('TAP TO RIDE',W/2,H*.88,'#ffd34a','#3a0a04',5*u);}}
 function stageCard(){const u=U(),a=Math.min(1,phaseT*3);cx.fillStyle=`rgba(10,4,8,${.75*a})`;cx.fillRect(0,0,W,H);cx.globalAlpha=a;cx.textAlign='center';cx.textBaseline='middle';
  cx.font=bangers(20*u);outlined(`STAGE ${L.n+1}`,W/2,H*.11,'#fff','#000',4);cx.font=bangers(32*u);outlined(STAGES[L.n%STAGES.length].name,W/2,H*.19,'#ffd34a','#3a0a04',6*u);cx.globalAlpha=1;poster(a);
  if(phaseT>1&&Math.floor(T*2.2)%2===0){cx.font=nunito(12*u,900);cx.fillStyle='#fff';cx.fillText('tap to ride',W/2,H*.95);}}
 function bossIntro(){const u=U(),a=Math.min(1,phaseT*3),y0=view.y+view.h*.2;cx.globalAlpha=a;cx.fillStyle='#000c';cx.fillRect(0,y0,W,46*u);cx.textAlign='center';cx.textBaseline='middle';
  cx.font=bangers(26*u);outlined(`WANTED: ${L.bossName}`,W/2,y0+16*u,'#ffd34a','#3a0a04',5*u);cx.font=nunito(12*u,900);cx.fillStyle='#fff';cx.fillText(`DEAD OR ALIVE · $${L.bounty.toLocaleString()}`,W/2,y0+36*u);cx.globalAlpha=1;}
 function speech(e){const u=U(),Y=Math.max(view.y+30*u,toY(e.y-80));cx.font=nunito(12*u,900);const w=Math.min(W*.7,cx.measureText(e.say.text).width+20*u),X=Math.min(W-w/2-8,Math.max(w/2+8,toX(e.x)));
  cx.fillStyle='#fff';cx.strokeStyle='#000';cx.lineWidth=2;cx.beginPath();cx.roundRect?.(X-w/2,Y-14*u,w,26*u,8*u);cx.fill();cx.stroke();cx.fillStyle='#1a0a04';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(e.say.text,X,Y,w-12*u);}
 function warnBanner(){const u=U(),t=T-banner.t;if(t>2.4)return;const a=Math.min(1,t*4)*Math.min(1,(2.4-t)*3),Y=view.y+view.h*.3;cx.globalAlpha=a;cx.fillStyle='#000a';cx.fillRect(0,Y-26*u,W,52*u);cx.textAlign='center';cx.textBaseline='middle';
  if(Math.floor(t*6)%2===0||t>1){cx.font=bangers(30*u);outlined(banner.text,W/2,Y-6*u,'#ff5a3a','#2a0404',6*u);}cx.font=nunito(12*u,900);cx.fillStyle='#fff';cx.fillText(banner.sub||'',W/2,Y+16*u);cx.globalAlpha=1;}
 function goArrow(){const u=U(),X=view.x+view.w-70*u,Y=view.y+view.h*.35;cx.font=bangers(34*u);cx.textAlign='center';cx.textBaseline='middle';outlined('GO!',X,Y,'#ffd34a','#3a0a04',6*u);
  cx.fillStyle='#ffd34a';cx.strokeStyle='#3a0a04';cx.lineWidth=4*u;cx.beginPath();cx.moveTo(X-22*u,Y+22*u);cx.lineTo(X+14*u,Y+22*u);cx.lineTo(X+14*u,Y+14*u);cx.lineTo(X+30*u,Y+30*u);cx.lineTo(X+14*u,Y+46*u);cx.lineTo(X+14*u,Y+38*u);cx.lineTo(X-22*u,Y+38*u);cx.closePath();cx.stroke();cx.fill();}
 function continueScreen(){const u=U(),left=Math.max(...P.map(p=>p.contT));cx.fillStyle='#000a';cx.fillRect(0,0,W,H);cx.textAlign='center';cx.textBaseline='middle';
  cx.font=bangers(40*u);outlined('CONTINUE?',W/2,H*.4,'#ffd34a','#3a0a04',7*u);cx.font=bangers(70*u);outlined(String(Math.ceil(left)),W/2,H*.53,'#fff','#3a0a04',8*u);
  cx.font=nunito(14*u,800);cx.fillStyle='#fff';cx.fillText(`Tap ${solo?'the screen':'your side'} to keep riding (1,500 points)`,W/2,H*.66);}
 function endBanner(){const u=U(),why=banner.why;
  if(why!=='clear'){cx.fillStyle='#000a';cx.fillRect(0,H/2-40*u,W,80*u);cx.textAlign='center';cx.textBaseline='middle';cx.font=bangers(38*u);outlined('GAME OVER',W/2,H/2,'#ff6a6a','#2a0404',6*u);return;}
  const t=T-banner.t;cx.fillStyle='#000c';cx.fillRect(0,0,W,H);cx.textAlign='center';cx.textBaseline='middle';cx.font=bangers(34*u);outlined('BOUNTY COLLECTED!',W/2,H*.18,'#ffd34a','#3a0a04',6*u);
  const cw=Math.min(W/P.length,260*u);P.forEach((p,i)=>{const X=W/2+(i-(P.length-1)/2)*cw,hc=head(s.players[i].character,'win',96),fs=54*u;if(hc&&hc.width)cx.drawImage(hc,X-fs/2,H*.28,fs,fs);
   [['BANDITS',p.stageKills],['BOUNTY',p.bounty],['LIVES BONUS',p.lifeBonus],['STAGE',p.score]].forEach(([label,val],r)=>{const show=Math.min(1,Math.max(0,(t-.4-r*.55)/.45));if(show<=0)return;const y=H*.28+fs+18*u+r*24*u;
    cx.font=nunito(12*u,800);cx.fillStyle='#ffe2a0';cx.textAlign='right';cx.fillText(label,X-6*u,y);cx.font=bangers(18*u);cx.fillStyle=r===3?'#ffd34a':'#fff';cx.textAlign='left';cx.fillText(Math.round(val*show).toLocaleString(),X+6*u,y);});});}
 function draw(){layout();cx.setTransform(1,0,0,1,0,0);cx.fillStyle='#140a14';cx.fillRect(0,0,W,H);
  if(phase==='title'){titleScreen();return;}
  heads.length=0;const ctx={g:pg,pw:PW,ph:PH,cam,T,W:L};
  pg.setTransform(1,0,0,1,0,0);pg.save();if(shake>0)pg.translate(Math.round((fxr()-.5)*shake),Math.round((fxr()-.5)*shake));
  scen.backdrop(ctx);scen.ground(ctx);scen.world(ctx);scen.props(ctx);
  for(const e of E)if(e.dead)drawEnemy(e);for(const e of E)if(!e.dead)drawEnemy(e);for(const p of P)drawPlayer(p);drawShots();
  if(L.night){const gr=pg.createRadialGradient(PW/2,PH/2,PH*.35,PW/2,PH/2,PW*.75);gr.addColorStop(0,'#0000');gr.addColorStop(1,'#000a');pg.fillStyle=gr;pg.fillRect(0,0,PW,PH);}
  pg.restore();
  cx.imageSmoothingEnabled=false;cx.drawImage(pb,0,0,PW,PH,view.x,view.y,PW*K,view.h);
  // tall screens (owner, Nov 13: fill the whole screen like SotN/Mario/Sonic, no dark bars): the sky carries on above the band
  // (its top pixel row stretched up, then darkened toward the top) and the street's ground below it (its last rows repeated,
  // shaded deeper as it goes), so the touch controls float over the scene instead of a black strip
  if(view.y>0){cx.drawImage(pb,0,0,PW,1,view.x,0,PW*K,view.y+1);
   const g=cx.createLinearGradient(0,0,0,view.y);g.addColorStop(0,'rgba(0,0,0,.45)');g.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=g;cx.fillRect(0,0,W,view.y);}
  const y1=view.y+view.h;
  if(y1<H){const rows=Math.max(4,Math.round((VH-GY-4)*S)),h=rows*K;let flip=false;
   for(let y=y1-1;y<H;y+=h-1){cx.save();if(flip){cx.translate(0,y+h);cx.scale(1,-1);cx.drawImage(pb,0,PH-rows,PW,rows,view.x,0,PW*K,h);}else cx.drawImage(pb,0,PH-rows,PW,rows,view.x,y,PW*K,h);cx.restore();flip=!flip;}
   const g=cx.createLinearGradient(0,y1,0,H);g.addColorStop(0,'rgba(0,0,0,.15)');g.addColorStop(1,'rgba(0,0,0,.6)');cx.fillStyle=g;cx.fillRect(0,y1,W,H-y1);}
  cx.imageSmoothingEnabled=true;
  drawHeads();drawTexts();drawHUD();
  if(phase==='bossintro')bossIntro();if(L.boss?.say&&!L.boss.dead&&T-L.boss.say.t<2.6)speech(L.boss);
  if(banner?.why==='warn')warnBanner();if(T-goT<2.2&&phase==='play'&&Math.floor((T-goT)*3)%2===0)goArrow();
  controls.draw(cx,{alpha:phase==='play'||phase==='boss'?1:.4});
  if(phase==='card')stageCard();
  if(P.every(p=>p.out&&!p.alive)&&P.some(p=>p.contT>0)&&phase!=='end')continueScreen();
  if(phase==='end'&&banner)endBanner();}

 // tests: s.debug.bot (autopilot for every player), state(), boss() jumps to the boss arena, win() beats the boss
 Object.assign(s.debug,{sunset:music,controls,
  state:()=>({phase,stage:stageNo,stageId:L?.id,cam,len:L?.len,players:P.map(p=>({x:p.x,y:p.y,lives:p.lives,alive:p.alive,out:p.out,score:p.score,total:total[p.i],ground:p.ground})),enemies:living().length,kinds:[...new Set(living().map(e=>e.kind))],boss:L?.boss?{hp:L.boss.hp,max:L.boss.max,dead:L.boss.dead,type:L.boss.boss}:null,bossId:L?.bossId,recruits:s.gameRecruits,locks:L?.locks.map(l=>l.done)}),
  boss(){cam=L.len;for(const p of P){p.x=cam+40+p.i*20;p.y=floorAt(p.x,0);}for(const sp of L.spawns)sp.done=true;for(const l of L.locks)l.done=true;for(const ev of L.events)ev.done=true;E.length=0;phase='play';},
  win(){if(phase==='bossintro')phase='boss';if(L.boss&&!L.boss.dead){L.boss.dmg[0]=L.boss.hp;L.boss.hp=1;damage(L.boss,0);}},
  start(){if(phase==='title')music.theme(STAGE_SONGS[L.id]);phase='play';phaseT=0;},stage(n){stageNo=n;startStage();phase='play';},immortal:false});
 layout();startStage();
 await new Promise(resolve=>{s.cleanup(resolve);
  s.frame(dt=>{if(!s.alive){resolve();return;}
   const d=Math.min(dt,1/30);
   if(phase==='title'||phase==='card'){T+=d;phaseT+=d;if(phase==='card'&&phaseT>3.2){phase='play';phaseT=0;}}
   else if(freeze>0)freeze-=d;else step(d);
   if(s.debug.immortal)for(const p of P)p.inv=Math.max(p.inv,.05);
   draw();});});
}
Object.assign(exports,{sundown});
