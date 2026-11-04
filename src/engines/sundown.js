// SUNDOWN SHOWDOWN (ROADMAP H6): an original western run-and-gun in the Sunset Riders genre. Two gunslingers wearing the
// players' faces run right through a stage at once (one screen, shared world, 3 lives each, one hit = a life), shooting
// bandits on the street, in windows and on ledges, dodging lobbed dynamite and knife rushers, up to a WANTED boss who
// wears a character neither player has unlocked yet: shoot him down to recruit him. Kills score for the shooter; the
// boss's bounty is split by the damage each player did. 1P (solo 'levels'): stage after stage, harder each time.
// Stages: Main Street (town), Canyon Pass (rock ledges), Mission at Night (adobe + torches); all procedural from the seed.
// Sound: the owner's Sunset Riders songs and voices through engines/sunsetAudio.js (music director: play / tense at the
// boss or on a last life), synth gunshots from engines/westernSfx.js.
// Touch: each player owns their half of the screen. Drag = aim and fire in that direction (8 ways); drag further = run
// that way while firing; drag down = duck. Tap (or a second finger) = jump; a quick flick up while dragging jumps too.
// Keys: P1 A/D move, W/S aim up / duck, F fire, Space jump; P2 arrows, '.' fire, Enter jump.
const {fullBleed}=require("src/engines/fullBleed.js");
const {seededRandom}=require("src/utils.js");
const {store}=require("src/state.js");
const audio=require("src/audio.js");
const {SFX}=require("src/engines/westernSfx.js");
const {createSunsetMusic,preloadSunsetVoices,sunsetVoice}=require("src/engines/sunsetAudio.js");
const {soloProgress,soloFinish}=require("src/solo.js");

const VH=200,GY=172;                     // world units: view height, ground line
const STAGE_LEN=2300,CLOCK=180;          // stage length before the boss arena; seconds of daylight left
const WALK=74,JUMP=236,GRAV=610,PB=330,EB=118,FIRE=.22,RAPID=.12,INV=2.2,RESPAWN=1.5,POWER_T=14;
const THEMES=[
 {id:'town',name:'MAIN STREET',sky:['#2b1a4a','#a8395a','#ff8a3d','#ffd27a'],sun:'#ffe9a8',hills:'#6b2f3f',far:'#8a3b42',ground:'#7a4a2a',plank:'#9a6638',night:false},
 {id:'canyon',name:'CANYON PASS',sky:['#3a1d3f','#c2463d','#ff9a4a','#ffd889'],sun:'#fff0b8',hills:'#7e2e22',far:'#a5412c',ground:'#8a4b2b',plank:'#a8603a',night:false},
 {id:'mission',name:'MISSION AT NIGHT',sky:['#05061a','#141a44','#2c2a66','#5a3a6e'],sun:'#f4f1d8',hills:'#1a1838',far:'#24224a',ground:'#3e2c2a',plank:'#5a3f34',night:true},
];
const BOSS_NAMES=['THE BARON','ONE-EYED JACK','EL DIABLO','SIDEWINDER','THE UNDERTAKER','BLACK BART','DOC HOLLOWAY','THE GENERAL'];

async function sundown(s){
 const solo=!!s.solo,np=solo?1:2;
 const [c,x]=s.canvas(900,520,{fill:true});const fb=fullBleed(s,{bg:'#140a14',hint:true});
 s.shared=!solo;s.active=0;s.updateScores?.();
 s.hint('Drag in your half of the screen to aim and fire that way; drag further to run while you shoot; drag down to duck. Tap (or a second finger) to jump, or flick up while dragging. One hit costs a life (3 each). Shoot bandits on the street, in windows and on ledges; jump the knife men and the dynamite. The WANTED boss at the end pays a bounty split by the damage you each did, and beating him recruits him. Keys: P1 A/D, W/S, F fire, Space jump; P2 arrows, . fire, Enter jump.');
 let headOf=null;try{headOf=require("src/engines/broforce.js").headCanvas;}catch{}
 const head=(id,mood,size)=>{try{return headOf?.(id,mood,size)||null;}catch{return null;}};
 const female=id=>/amber|wife|woman|girl|queen|lady|ms-|mrs-/i.test(id||'');
 // music + voices
 const music=createSunsetMusic(()=>s.paused||!s.alive||document.hidden);try{audio.stopMusic();}catch{}preloadSunsetVoices();
 s.cleanup(()=>{music.stop();if(store.profile?.settings?.music)try{audio.startMusic();}catch{}});
 const voice=(n,o)=>{try{sunsetVoice(n,o);}catch{}};
 const R=s.random;   // seeded: stage layout and spawns
 const fxr=Math.random;   // looks only (particles), never decides anything

 // ---------------------------------------------------------------- stage
 let stageNo=0,diff=1,clock=CLOCK,T=0,shake=0,phase='intro',phaseT=0,cleared=0,total=[0,0],banner=null;
 const P=[0,1].slice(0,np).map(i=>({i,x:60+i*26,y:GY,vx:0,vy:0,face:1,ground:true,lives:3,alive:true,out:false,respawn:0,inv:INV,score:0,aim:[1,0],fire:0,power:null,powerT:0,duck:false,firing:false,walkT:0,dmg:0,kills:0,hurtT:0,mood:'normal',jumpQ:0,stick:null,keys:{}}));
 let W=s.W,H=s.H,view={x:0,y:0,w:W,h:H,k:1},cam=0;
 let L=null;   // the stage: {theme, buildings, ledges, crates, spawns, boss...}
 const E=[],B=[],EB_=[],FXs=[],items=[];   // enemies, player bullets, enemy bullets, particles, pickups
 let bossPool=[];
 try{const rw=require('src/rewards.js');bossPool=[...new Set(s.players.slice(0,np).flatMap(p=>{try{return rw.gameRecruitPool(s.game,store.profile,p).map(ch=>ch.id);}catch{return [];}}))];
  const {portraitMoods}=require('src/assets.js'),art=bossPool.filter(id=>{try{return portraitMoods(id).length>0;}catch{return false;}});if(art.length)bossPool=art;}catch{}
 s.gameRecruits=[[],[]];

 function buildStage(n){
  const r=seededRandom(`${s.seed}:sundown:${n}`),theme=THEMES[n%3];
  const bld=[],ledges=[],crates=[],spawns=[];
  // scenery along the road: buildings (town / mission) or rock ledges (canyon), crates and barrels as cover
  let xx=160;
  while(xx<STAGE_LEN+200){
   if(theme.id==='canyon'){const w=90+r()*90,h=46+r()*34;ledges.push({x:xx,w,y:GY-h});xx+=w+60+r()*90;}
   else{const w=96+r()*64,floors=theme.id==='town'?2:1+(r()<.5?1:0),h=floors*46+18;const wins=[];const cols=Math.max(2,Math.floor(w/34));
    for(let f=0;f<floors;f++)for(let k=0;k<cols;k++)wins.push({x:xx+(k+.5)*w/cols,y:GY-28-f*46,open:0,man:null});
    const signs=theme.id==='town'?['SALOON','BANK','HOTEL','SHERIFF','GENERAL STORE','BARBER','ASSAY OFFICE','STABLES','POST OFFICE']:['CANTINA','MISIÓN','POSADA','TIENDA','CAPILLA'];
    bld.push({x:xx,w,h,floors,wins,sign:signs[Math.floor(r()*signs.length)],hue:Math.floor(r()*4)});xx+=w+(r()<.3?40+r()*50:6);}
  }
  for(let cx=300;cx<STAGE_LEN;cx+=180+r()*220)crates.push({x:cx,w:r()<.5?20:28,h:r()<.5?18:24,kind:r()<.5?'crate':'barrel'});
  // waves: by camera position, from a weighted list that leans harder later in the stage
  for(let sx=120;sx<STAGE_LEN-120;sx+=70+r()*80){
   const k=sx/STAGE_LEN,roll=r();
   const kind=roll<.42?'gun':roll<.62?(theme.id==='canyon'?'ledge':'window'):roll<.8?'rush':'dyn';
   spawns.push({at:sx,kind,side:r()<.18+k*.12?-1:1,n:kind==='gun'&&r()<.3+k*.3?2:1,done:false});
  }
  for(let ix=500;ix<STAGE_LEN;ix+=420+r()*300)spawns.push({at:ix,kind:'item',done:false});
  const bossId=bossPool.length?bossPool[Math.floor(r()*bossPool.length)]:null;
  return {n,theme,bld,ledges,crates,spawns,boss:null,bossId,bossName:BOSS_NAMES[Math.floor(r()*BOSS_NAMES.length)],bounty:5000+n*1500,r};
 }

 // ---------------------------------------------------------------- layout
 function layout(){
  W=s.W;H=s.H;
  if(W/H>=1.25){const k=H/VH;view={x:0,y:0,w:W,h:H,k,ww:W/k};}
  else{const bh=Math.min(H*.62,W/1.12),k=bh/VH;view={x:0,y:Math.max(fb.top+90,H*.16),w:W,h:bh,k,ww:W/k};}
 }
 const sx=wx=>view.x+(wx-cam)*view.k,sy=wy=>view.y+wy*view.k;
 const inView=(wx,pad=0)=>wx>cam-pad&&wx<cam+view.ww+pad;

 // ---------------------------------------------------------------- input
 const half=px=>solo?0:px<W/2?0:1;
 const ptr=new Map();
 const pointer=ev=>s.pointer(ev);
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=pointer(ev);
  if(phase==='intro'||phase==='wanted'){skipIntro();return;}
  const i=half(p.x),pl=P[i];if(!pl)return;s.capture?.(ev);
  if(pl.stick&&pl.stick.id!==ev.pointerId){pl.jumpQ=.15;ptr.set(ev.pointerId,{i,tap:true});return;}
  pl.stick={id:ev.pointerId,ox:p.x,oy:p.y,x:p.x,y:p.y,t0:performance.now(),hist:[[performance.now(),p.y]]};ptr.set(ev.pointerId,{i});});
 s.on(c,'pointermove',ev=>{const o=ptr.get(ev.pointerId);if(!o||o.tap)return;ev.preventDefault();const pl=P[o.i],st=pl?.stick;if(!st)return;const p=pointer(ev),now=performance.now();st.x=p.x;st.y=p.y;
  st.hist.push([now,p.y]);while(st.hist.length&&now-st.hist[0][0]>140)st.hist.shift();
  // a quick flick up while dragging = jump (then the stick re-centres a little so it doesn't keep aiming up)
  if(st.hist.length>1&&st.hist[0][1]-p.y>34*Math.max(.7,W/900)&&now-(st.flick||0)>350){st.flick=now;pl.jumpQ=.15;st.oy=p.y+10;}});
 const up=ev=>{const o=ptr.get(ev.pointerId);if(!o)return;ptr.delete(ev.pointerId);s.release?.(ev);if(o.tap)return;const pl=P[o.i],st=pl?.stick;if(!st)return;
  const d=Math.hypot(st.x-st.ox,st.y-st.oy);if(performance.now()-st.t0<220&&d<16)pl.jumpQ=.15;pl.stick=null;};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',up);
 const KEYS={a:[0,'l'],d:[0,'r'],w:[0,'u'],s:[0,'d'],f:[0,'f'],' ':[0,'j'],arrowleft:[1,'l'],arrowright:[1,'r'],arrowup:[1,'u'],arrowdown:[1,'d'],'.':[1,'f'],enter:[1,'j']};
 s.on(window,'keydown',ev=>{const k=KEYS[ev.key.toLowerCase()];if(!k)return;const pl=P[solo?0:k[0]];if(!pl)return;ev.preventDefault();if(phase==='intro'||phase==='wanted'){skipIntro();return;}if(k[1]==='j'&&!pl.keys.j)pl.jumpQ=.15;pl.keys[k[1]]=true;});
 s.on(window,'keyup',ev=>{const k=KEYS[ev.key.toLowerCase()];if(!k)return;const pl=P[solo?0:k[0]];if(pl)pl.keys[k[1]]=false;});

 // what a player wants this frame: {move:-1|0|1, aim:[dx,dy]|null (null = not firing), duck}
 function intent(pl){
  if(s.debug.bot)return botIntent(pl);
  const k=pl.keys;if(k.l||k.r||k.u||k.d||k.f){const mx=(k.r?1:0)-(k.l?1:0),ay=k.u?-1:0;return {move:k.d&&pl.ground?0:mx,aim:k.f?[mx||(k.u?0:pl.face),ay]:null,duck:k.d&&pl.ground&&!mx};}
  const st=pl.stick;if(!st)return {move:0,aim:null,duck:false};
  const u=Math.max(.75,Math.min(1.6,Math.min(W,H)/420)),dx=st.x-st.ox,dy=st.y-st.oy,len=Math.hypot(dx,dy);
  if(len<12*u)return {move:0,aim:null,duck:false};
  const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4)),dir=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]][(a+8)%8];
  const duck=dir[1]>0&&Math.abs(dx)<30*u&&pl.ground;
  return {move:Math.abs(dx)>40*u?Math.sign(dx):0,aim:duck?[pl.face,0]:dir[1]>0&&pl.ground?[dir[0]||pl.face,0]:dir,duck};
 }

 // ---------------------------------------------------------------- spawning
 function addEnemy(kind,o){const e={kind,hp:1,t:0,fire:.9+R()*.8,face:-1,dead:false,deadT:0,flash:0,...o};E.push(e);return e;}
 const target=(x,y)=>{let best=null,bd=1e9;for(const p of P)if(p.alive){const d=Math.abs(p.x-x)+Math.abs(p.y-y)*.5;if(d<bd){bd=d;best=p;}}return best;};
 function spawn(sp){
  const right=cam+view.ww+16,left=cam-16;
  if(sp.kind==='gun')for(let k=0;k<sp.n;k++){const from=sp.side>0?right+k*22:left-k*22;addEnemy('gun',{x:from,y:GY,goal:sp.side>0?cam+view.ww*(.55+R()*.38):cam+view.ww*(.06+R()*.3),face:-sp.side});}
  else if(sp.kind==='rush'){const from=sp.side>0?right:left;addEnemy('rush',{x:from,y:GY,face:-sp.side,speed:104+R()*30});}
  else if(sp.kind==='dyn'){addEnemy('dyn',{x:right,y:GY,goal:cam+view.ww*(.7+R()*.25),fire:1.2,hp:1});}
  else if(sp.kind==='window'){const wins=L.bld.flatMap(b=>b.wins).filter(w=>w.x>cam+view.ww*.35&&w.x<cam+view.ww-10&&!w.man);if(wins.length){const w=wins[Math.floor(R()*wins.length)];w.man=addEnemy('window',{x:w.x,y:w.y,win:w,out:0,cycle:0,fire:1.1});}else addEnemy('gun',{x:right,y:GY,goal:cam+view.ww*.7,face:-1});}
  else if(sp.kind==='ledge'){const ls=L.ledges.filter(l=>l.x+l.w>cam+view.ww*.4&&l.x<cam+view.ww-10);if(ls.length){const l=ls[Math.floor(R()*ls.length)];addEnemy('ledge',{x:Math.min(l.x+l.w-8,Math.max(l.x+8,cam+view.ww*.75)),y:l.y,face:-1,fire:1});}else addEnemy('rush',{x:right,y:GY,face:-1,speed:110});}
  else if(sp.kind==='item'){items.push({x:right-30,y:GY-60,vy:0,kind:['two','rapid','gold','gold'][Math.floor(R()*4)],t:0,landed:false});}
 }
 function spawnBoss(){
  const bx=STAGE_LEN+view.ww-60;
  L.boss=addEnemy('boss',{x:bx+80,y:GY,goal:bx,hp:Math.round((26+L.n*8)*(np===2?1.5:1)*Math.min(1.6,diff)),max:0,face:-1,fire:1.6,pat:0,patT:0,dmg:[0,0]});
  L.boss.max=L.boss.hp;
 }

 // ---------------------------------------------------------------- combat
 function shoot(pl){
  const [ax,ay]=pl.aim,n=Math.hypot(ax,ay)||1,ux=ax/n,uy=ay/n,mx=pl.x+ux*12,my=pl.y-(pl.duck?12:22)+uy*10;
  const spread=pl.power==='two'?[-.2,0,.2]:[0];
  for(const a of spread){const ca=Math.cos(a),sa=Math.sin(a);B.push({x:mx,y:my,vx:(ux*ca-uy*sa)*PB,vy:(ux*sa+uy*ca)*PB,o:pl.i,t:0});}
  FXs.push({k:'flash',x:mx,y:my,t:0,life:.06});
  SFX.gunshot({vol:.32,pan:Math.max(-1,Math.min(1,(sx(pl.x)/W)*2-1)),far:true});
 }
 function enemyShot(e,tx,ty,speed=EB,spread=0){const ex=e.x,ey=e.y-(e.kind==='window'?6:e.kind==='boss'?30:22);let dx=tx-ex,dy=ty-ey;const n=Math.hypot(dx,dy)||1;
  const a=Math.atan2(dy,dx)+spread;EB_.push({x:ex,y:ey,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,t:0});FXs.push({k:'flash',x:ex+dx/n*8,y:ey+dy/n*8,t:0,life:.06,red:true});
  SFX.gunshot({vol:.18,far:true,pan:Math.max(-1,Math.min(1,(sx(ex)/W)*2-1))});}
 function lob(e,tx){const t=1.05,dx=tx-e.x;EB_.push({x:e.x,y:e.y-30,vx:dx/t,vy:-GRAV*.42*t,t:0,dyn:true,fuse:0});}
 function boom(x,y,r=30,hurt=true){shake=Math.max(shake,8);for(let k=0;k<24;k++){const a=fxr()*Math.PI*2,v=40+fxr()*120;FXs.push({k:'spark',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,t:0,life:.5+fxr()*.4,c:fxr()<.5?'#ffcf4a':'#ff6a2a'});}
  FXs.push({k:'ring',x,y,t:0,life:.35,r});SFX.gunshot({vol:.6});
  if(hurt)for(const p of P)if(p.alive&&!p.inv&&Math.hypot(p.x-x,(p.y-14)-y)<r)hurtPlayer(p);}
 function killEnemy(e,by){if(e.dead)return;e.dead=true;e.deadT=0;e.vx=(by!=null&&P[by]?Math.sign(e.x-P[by].x):1)*60;e.vy=-120;
  const pts={gun:100,window:200,ledge:200,rush:150,dyn:300}[e.kind]||100;
  if(by!=null&&P[by]){P[by].score+=pts;P[by].kills++;floatText(e.x,e.y-36,'+'+pts,by);}
  if(e.win){e.win.man=null;e.win.open=0;}
  voice(['bandit-death-1','bandit-death-2','bandit-death-3','bandit-death-short'][Math.floor(fxr()*4)],{vol:.55,pan:Math.max(-1,Math.min(1,(sx(e.x)/W)*2-1))});
  if(e.kind==='dyn'||fxr()<.07)items.push({x:e.x,y:e.y-20,vy:-90,kind:fxr()<.5?'gold':fxr()<.5?'two':'rapid',t:0,landed:false});}
 function hurtPlayer(p){if(!p.alive||p.inv>0)return;p.alive=false;p.lives--;p.respawn=RESPAWN;p.vx=-p.face*70;p.vy=-160;p.mood='sad';shake=Math.max(shake,6);
  voice(female(s.players[p.i].character)?'female-death':'player-death',{vol:.9});s.react?.(p.i,'sad');try{navigator.vibrate?.(80);}catch{}
  if(p.lives<=0)p.out=true;p.power=null;}
 function floatText(x,y,text,i){FXs.push({k:'text',x,y,text,t:0,life:.9,c:i===0?'#7fd3ff':i===1?'#ff9ad0':'#ffe27a'});}

 // ---------------------------------------------------------------- step
 const solid=(x)=>{let top=GY;for(const cr of L.crates)if(x>cr.x-2&&x<cr.x+cr.w+2)top=Math.min(top,GY-cr.h);if(L.theme.id==='canyon')for(const l of L.ledges)if(x>l.x&&x<l.x+l.w)top=top;return top;};
 function stepPlayer(p,dt){
  if(!p.alive){p.vy+=GRAV*dt;p.x+=p.vx*dt;p.y=Math.min(GY,p.y+p.vy*dt);
   if(!p.out&&(p.respawn-=dt)<=0){Object.assign(p,{alive:true,x:Math.max(cam+30,(P.find(q=>q!==p&&q.alive)?.x??cam+60)-20),y:-20,vx:0,vy:0,inv:INV,mood:'normal'});}return;}
  p.inv=Math.max(0,p.inv-dt);p.fire-=dt;p.hurtT=Math.max(0,p.hurtT-dt);if(p.power&&(p.powerT-=dt)<=0)p.power=null;
  const want=intent(p);p.duck=want.duck;
  p.vx=p.duck?0:want.move*WALK;if(want.move)p.face=want.move;
  if(want.aim){p.aim=want.aim;if(want.aim[0])p.face=Math.sign(want.aim[0]);p.firing=true;if(p.fire<=0){p.fire=p.power==='rapid'?RAPID:FIRE;shoot(p);}}else p.firing=false;
  if(p.jumpQ>0){p.jumpQ-=dt;if(p.ground){p.vy=-JUMP;p.ground=false;p.jumpQ=0;SFX.spurs?.({vol:.15,steps:1});}}
  p.vy+=GRAV*dt;p.x+=p.vx*dt;
  const left=cam+8,right=cam+view.ww-8;p.x=Math.max(left,Math.min(right,p.x));
  const floor=solid(p.x);let ny=p.y+p.vy*dt;
  if(p.vy>=0&&p.y<=floor+1&&ny>=floor){ny=floor;p.vy=0;p.ground=true;}else if(ny<floor-1)p.ground=false;
  if(ny>floor&&p.ground)ny=floor;p.y=ny;
  if(p.vx)p.walkT+=dt;
 }
 function stepEnemy(e,dt){
  e.t+=dt;e.flash=Math.max(0,e.flash-dt);
  if(e.dead){e.deadT+=dt;if(e.kind==='window')return;e.vy+=GRAV*dt;e.x+=e.vx*dt;e.y=Math.min(GY,e.y+e.vy*dt);return;}
  const p=target(e.x,e.y),rate=Math.min(2.2,diff);
  if(e.kind==='gun'){if(Math.abs(e.goal-e.x)>3){e.x+=Math.sign(e.goal-e.x)*58*dt;e.walkT=(e.walkT||0)+dt;}
   if(p){e.face=Math.sign(p.x-e.x)||-1;if((e.fire-=dt*rate)<=0&&inView(e.x,-6)){e.fire=1.5+R()*1.1;enemyShot(e,p.x,p.y-(p.duck?10:20));}}}
  else if(e.kind==='rush'){e.x+=e.face*e.speed*dt;e.walkT=(e.walkT||0)+dt;
   for(const q of P)if(q.alive&&!q.inv&&Math.abs(q.x-e.x)<10&&q.y>GY-18)hurtPlayer(q);
   if(e.x<cam-60||e.x>cam+view.ww+80)e.gone=true;}
  else if(e.kind==='dyn'){if(Math.abs(e.goal-e.x)>3)e.x+=Math.sign(e.goal-e.x)*50*dt;e.face=-1;
   if(p&&(e.fire-=dt*rate)<=0&&inView(e.x,-6)){e.fire=2.2+R()*.8;e.throwT=.35;lob(e,p.x+(R()-.5)*30);}e.throwT=Math.max(0,(e.throwT||0)-dt);}
  else if(e.kind==='window'){e.cycle+=dt;const out=(e.cycle%3.0)<1.7;e.out=out?Math.min(1,e.out+dt*6):Math.max(0,e.out-dt*6);e.win.open=e.out;
   if(p)e.face=Math.sign(p.x-e.x)||-1;if(e.out>.9&&p&&(e.fire-=dt*rate)<=0){e.fire=1.4+R()*.8;enemyShot(e,p.x,p.y-18);}}
  else if(e.kind==='ledge'){if(p){e.face=Math.sign(p.x-e.x)||-1;if((e.fire-=dt*rate)<=0&&inView(e.x,-6)){e.fire=1.6+R()*.9;if(R()<.35)lob(e,p.x);else enemyShot(e,p.x,p.y-18);}}}
  else if(e.kind==='boss')stepBoss(e,dt,p);
 }
 function stepBoss(e,dt,p){
  if(Math.abs(e.goal-e.x)>3){e.x+=Math.sign(e.goal-e.x)*64*dt;e.walkT=(e.walkT||0)+dt;}
  if(!p)return;e.face=Math.sign(p.x-e.x)||-1;
  const hurt=1-e.hp/e.max,rate=(1+hurt*.6)*Math.min(1.8,diff);e.patT-=dt*rate;
  if(e.patT<=0){e.pat=(e.pat+1)%4;const pat=hurt>.5&&R()<.35?3:e.pat;
   if(pat===0){for(const a of [-.18,0,.18])enemyShot(e,p.x,p.y-18,EB*1.1,a);e.patT=1.5;}
   else if(pat===1){e.goal=cam+view.ww*(.45+R()*.45);e.patT=1.1;}
   else if(pat===2){for(let k=0;k<7;k++)setTimeoutGame(k*.09,()=>{if(!e.dead){const q=target(e.x,e.y);if(q)enemyShot(e,q.x,q.y-18,EB*1.25,(R()-.5)*.25);}});e.patT=1.8;}
   else{for(let k=0;k<2+(hurt>.6?1:0);k++)lob(e,p.x+(k-1)*34);e.throwT=.4;e.patT=1.7;}}
  e.throwT=Math.max(0,(e.throwT||0)-dt);
 }
 const later=[];const setTimeoutGame=(sec,fn)=>later.push({at:T+sec,fn});
 function hitTest(b){
  for(const e of E){if(e.dead||e.gone)continue;
   let hx=e.x,hy=e.y-18,hw=9,hh=20;
   if(e.kind==='window'){if(e.out<.6)continue;hy=e.y-6;hh=10;}
   if(e.kind==='boss'){hy=e.y-26;hw=15;hh=28;}
   if(e.kind==='rush'){hy=e.y-15;hh=16;}
   if(Math.abs(b.x-hx)<hw&&Math.abs(b.y-hy)<hh)return e;}
  return null;}
 function step(dt){
  T+=dt;phaseT+=dt;shake=Math.max(0,shake-dt*22);
  for(let k=later.length-1;k>=0;k--)if(T>=later[k].at){const f=later[k].fn;later.splice(k,1);f();}
  if(phase==='play'||phase==='boss'){clock=Math.max(0,clock-dt);if(clock<=0){endStage('sundown');return;}}
  for(const p of P)stepPlayer(p,dt);
  // camera: only forward, follows the front runner, never leaves a live player behind
  const alive=P.filter(p=>p.alive);
  if(alive.length&&phase==='play'){const lead=Math.max(...alive.map(p=>p.x)),back=Math.min(...alive.map(p=>p.x));
   const want=Math.min(lead-view.ww*.45,back-12);cam=Math.max(cam,Math.min(STAGE_LEN,want));
   for(const sp of L.spawns)if(!sp.done&&cam+view.ww>=sp.at+view.ww*.5){sp.done=true;spawn(sp);}
   if(cam>=STAGE_LEN){phase='boss';phaseT=0;wantedFlash();spawnBoss();}}
  for(const e of E)stepEnemy(e,dt);
  for(let k=E.length-1;k>=0;k--){const e=E[k];if(e.gone||e.dead&&e.deadT>2.2||!e.dead&&e.kind!=='boss'&&(e.x<cam-140))E.splice(k,1);}
  for(let k=B.length-1;k>=0;k--){const b=B[k];b.x+=b.vx*dt;b.y+=b.vy*dt;b.t+=dt;
   const e=hitTest(b);if(e){B.splice(k,1);damage(e,b.o);continue;}
   if(b.t>1.6||!inView(b.x,40)||b.y<-20||b.y>GY+4)B.splice(k,1);}
  for(let k=EB_.length-1;k>=0;k--){const b=EB_[k];b.t+=dt;
   if(b.dyn){b.vy+=GRAV*.84*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y>=GY-2){b.y=GY-2;b.vx*=.2;b.vy=0;b.fuse+=dt;if(b.fuse>.55){EB_.splice(k,1);boom(b.x,b.y-6,30);}}continue;}
   b.x+=b.vx*dt;b.y+=b.vy*dt;
   for(const p of P)if(p.alive&&!p.inv){const top=p.y-(p.duck?16:32);if(Math.abs(b.x-p.x)<6&&b.y>top&&b.y<p.y){hurtPlayer(p);b.dead=true;break;}}
   if(b.dead||b.t>4||b.y>GY+2||!inView(b.x,60))EB_.splice(k,1);}
  for(let k=items.length-1;k>=0;k--){const it=items[k];it.t+=dt;if(!it.landed){it.vy+=GRAV*.6*dt;it.y+=it.vy*dt;if(it.y>=GY-8){it.y=GY-8;it.landed=true;}}
   for(const p of P)if(p.alive&&Math.abs(p.x-it.x)<12&&Math.abs(p.y-14-it.y)<20){items.splice(k,1);takeItem(p,it);break;}
   if(it.t>14||it.x<cam-30)items.splice(k,1);}
  for(let k=FXs.length-1;k>=0;k--){const f=FXs[k];f.t+=dt;if(f.vx!==undefined){f.vy+=300*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;}if(f.t>f.life)FXs.splice(k,1);}
  // the music: tense at the boss or when everyone left is on a last life
  if(phase==='play'||phase==='boss')music.mood(phase==='boss'||P.every(p=>p.out||p.lives<=1)?'tense':'play');
  if((phase==='play'||phase==='boss')&&P.every(p=>p.out&&!p.alive))endStage('dead');
  s.setScores?.(solo?[total[0]+P[0].score,0]:P.map(p=>p.score));
 }
 function damage(e,by){e.flash=.08;
  if(e.kind==='boss'){e.hp--;if(by!=null)e.dmg[by]=(e.dmg[by]||0)+1;if(by!=null)P[by].score+=20;
   if(T-(e.ouch||0)>1.1){e.ouch=T;voice('boss-damage',{vol:.6});}
   if(e.hp<=0){e.dead=true;e.deadT=0;e.vx=60;e.vy=-160;bossDown(e);}return;}
  if(--e.hp<=0)killEnemy(e,by);}
 function takeItem(p,it){if(it.kind==='gold'){p.score+=500;floatText(p.x,p.y-44,'+500',p.i);SFX.jingle?.({vol:.3});}
  else{p.power=it.kind;p.powerT=POWER_T;floatText(p.x,p.y-44,it.kind==='two'?'TWO GUNS!':'RAPID FIRE!',p.i);SFX.cock?.({vol:.5});}
  audio.sound?.('pickup');}
 function bossDown(e){
  boom(e.x,e.y-24,44,false);setTimeoutGame(.25,()=>boom(e.x+14,e.y-40,36,false));setTimeoutGame(.5,()=>boom(e.x-10,e.y-14,40,false));
  voice(fxr()<.5?'boss-death-1':'boss-death-2',{vol:.9});
  const tot=(e.dmg[0]||0)+(e.dmg[1]||0)||1;
  for(const p of P){const share=Math.round(L.bounty*(e.dmg[p.i]||0)/tot/10)*10;p.score+=share;if(share)floatText(p.x,p.y-50,'BOUNTY +'+share,p.i);}
  if(L.bossId){const by=e.dmg[1]>e.dmg[0]&&np>1?1:0;if(!s.gameRecruits[by].includes(L.bossId))s.gameRecruits[by].push(L.bossId);}
  for(const q of E)if(!q.dead&&q!==e)killEnemy(q,null);EB_.length=0;
  setTimeoutGame(1.6,()=>endStage('clear'));
 }
 let ending=false;
 function endStage(why){
  if(ending)return;ending=true;phase='end';phaseT=0;banner={why,t:T};
  if(why==='clear'){for(const p of P)if(!p.out)p.score+=250*Math.max(0,p.lives);voice(fxr()<.5?'player-taunt-1':'player-taunt-2',{vol:.9});music.sting('yippie');}
  else{music.sting('gameover');if(why==='dead')setTimeoutGame(1.2,()=>voice('please-continue',{vol:.9}));}
  setTimeoutGame(why==='clear'?3.4:3.2,()=>afterStage(why));
 }
 function afterStage(why){
  for(const p of P){total[p.i]+=p.score;p.score=0;}
  if(solo){
   if(why==='clear'){cleared++;soloProgress(s,total[0],cleared,`Stage ${cleared} cleared`);stageNo++;diff=1+stageNo*.14;P[0].lives=Math.min(5,P[0].lives+1);startStage();return;}
   soloFinish(s,total[0],cleared,`Sundown Showdown: ${total[0].toLocaleString()} points, ${cleared} stage${cleared===1?'':'s'} cleared.`);return;
  }
  const [a,b]=total,n=s.players.map(p=>p.name);
  s.finish([a,b],`Sundown Showdown: ${n[0]} ${a.toLocaleString()} · ${n[1]} ${b.toLocaleString()}${why==='clear'?' · the boss is down':why==='sundown'?' · the sun went down':''}.`);
 }
 function wantedFlash(){banner={why:'wanted',t:T};music.mood('tense');voice('sir-richard-laugh',{vol:.7});}
 function startStage(){
  L=buildStage(stageNo);E.length=0;B.length=0;EB_.length=0;FXs.length=0;items.length=0;later.length=0;cam=0;clock=CLOCK;ending=false;
  for(const p of P)if(!p.out||solo)Object.assign(p,{x:50+p.i*28,y:GY,vx:0,vy:0,alive:p.lives>0,out:p.lives<=0,inv:INV,power:null,score:0,ground:true,stick:null});
  phase='intro';phaseT=0;banner=null;
  music.sting('wanted',()=>music.start());
 }
 function skipIntro(){if(phase==='intro'&&phaseT>.4){phase='wanted';phaseT=0;}else if(phase==='wanted'&&phaseT>.4){phase='play';phaseT=0;}}

 // ---------------------------------------------------------------- bot (tests): walk right, aim at the nearest, jump threats
 function botIntent(pl){
  let best=null,bd=1e9;for(const e of E)if(!e.dead&&(e.kind!=='window'||e.out>.6)&&inView(e.x,-4)){const d=Math.hypot(e.x-pl.x,(e.y-18)-(pl.y-20));if(d<bd){bd=d;best=e;}}
  let aim=null;if(best){const dx=best.x-pl.x,dy=(best.y-(best.kind==='boss'?26:18))-(pl.y-22);const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4));aim=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]][(a+8)%8];if(pl.ground&&aim[1]>0)aim=[Math.sign(dx)||1,0];}
  const danger=EB_.some(b=>Math.abs(b.x-pl.x)<38&&(b.dyn?b.y>GY-30:b.y>pl.y-34&&b.y<pl.y))||E.some(e=>e.kind==='rush'&&!e.dead&&Math.abs(e.x-pl.x)<40);
  if(danger&&pl.ground)pl.jumpQ=.1;
  const ahead=phase==='boss'?0:best&&bd<120?0:1;
  return {move:ahead,aim,duck:false};
 }

 // ---------------------------------------------------------------- drawing
 const K=()=>view.k;
 function rect(wx,wy,w,h,col){x.fillStyle=col;x.fillRect(sx(wx),sy(wy),w*K(),h*K());}
 function drawSky(){const th=L.theme,g=x.createLinearGradient(0,view.y,0,view.y+view.h);th.sky.forEach((col,k)=>g.addColorStop(k/(th.sky.length-1),col));x.fillStyle=g;x.fillRect(0,view.y,W,view.h);
  const k=K(),sunX=W*.72-(cam*.03)*k,sunY=sy(th.night?60:150);x.fillStyle=th.sun;x.globalAlpha=th.night?.9:.95;x.beginPath();x.arc(sunX,sunY,(th.night?16:34)*k,0,7);x.fill();x.globalAlpha=1;
  if(th.night){x.fillStyle='#fff';for(let i=0;i<60;i++){const px=((i*137.5)%W),py=view.y+((i*71)%(view.h*.5));x.globalAlpha=.3+.5*Math.abs(Math.sin(T*1.3+i));x.fillRect(px,py,1.5,1.5);}x.globalAlpha=1;}
  // far mesas and near hills (parallax)
  for(const [col,par,base,amp,seed] of [[th.far,.12,GY-70,40,1],[th.hills,.3,GY-30,30,7]]){x.fillStyle=col;x.beginPath();x.moveTo(0,sy(GY));
   for(let px=0;px<=W+8;px+=8){const wx=(px/k+cam*par)*.02+seed;const h=Math.sin(wx)*.5+Math.sin(wx*2.3+seed)*.3+Math.sin(wx*.7)*.6;const top=base-amp*(.5+.5*h);x.lineTo(px,sy(Math.round(top/4)*4));}
   x.lineTo(W,sy(GY));x.closePath();x.fill();}
 }
 function drawGround(){const th=L.theme,k=K();rect(cam-10,GY,view.ww+20,VH-GY+40,th.ground);
  x.fillStyle=th.plank;for(let wx=Math.floor(cam/24)*24;wx<cam+view.ww+24;wx+=24){x.fillRect(sx(wx),sy(GY),1.5*k,(VH-GY)*k);}
  x.fillStyle='#0004';x.fillRect(0,sy(GY),W,3*k);
  if(th.id==='canyon'){for(let wx=Math.floor(cam/90)*90;wx<cam+view.ww+90;wx+=90){const h=((wx*7)%5);drawCactus(wx+30,GY,10+h*3);}}}
 function drawCactus(wx,wy,h){const k=K();x.fillStyle='#2f6b3a';x.fillRect(sx(wx-2),sy(wy-h),4*k,h*k);x.fillRect(sx(wx-8),sy(wy-h*.6),3*k,h*.3*k);x.fillRect(sx(wx-8),sy(wy-h*.6),6*k,2*k);x.fillRect(sx(wx+5),sy(wy-h*.8),3*k,h*.35*k);x.fillRect(sx(wx+2),sy(wy-h*.45),6*k,2*k);}
 const WALL=[['#8a5a3a','#6e4528'],['#7a6a58','#5e5040'],['#9a4a3a','#7a3626'],['#6a5a7a','#4e4060']],ADOBE=[['#c08a5a','#a06a40'],['#b8865e','#946640'],['#c49a6a','#a07850'],['#aa7a50','#8a5a38']];
 function drawBuildings(){const k=K(),th=L.theme;
  for(const b of L.bld){if(b.x>cam+view.ww+10||b.x+b.w<cam-10)continue;const pal=(th.id==='mission'?ADOBE:WALL)[b.hue],top=GY-b.h;
   rect(b.x,top,b.w,b.h,pal[0]);
   if(th.id==='town'){rect(b.x-4,top-10,b.w+8,12,pal[1]);for(let yy=top+6;yy<GY;yy+=7){x.fillStyle='#0002';x.fillRect(sx(b.x),sy(yy),b.w*k,1*k);}rect(b.x-6,GY-46,b.w+12,4,'#3a2414');for(let px=b.x;px<=b.x+b.w;px+=b.w/3)rect(px-1,GY-46,2.5,46,'#3a2414');}
   else{x.fillStyle=pal[1];x.beginPath();x.moveTo(sx(b.x),sy(top));x.quadraticCurveTo(sx(b.x+b.w/2),sy(top-14),sx(b.x+b.w),sy(top));x.fill();for(let px=b.x+8;px<b.x+b.w;px+=16)rect(px,top+4,4,3,'#3a2414');}
   // sign
   x.fillStyle=th.night?'#2a1810':'#3a2414';const sw=Math.min(b.w-8,b.sign.length*7+10);x.fillRect(sx(b.x+b.w/2-sw/2),sy(top+2),sw*k,11*k);
   x.fillStyle=th.night?'#ffcf7a':'#f4e2b0';x.font=`bold ${Math.max(7,8*k)}px "SC Bangers",Impact,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(b.sign,sx(b.x+b.w/2),sy(top+8));
   for(const w of b.wins){const lit=th.night;rect(w.x-8,w.y-10,16,16,lit?'#ffb54a':'#1a0f0a');
    if(w.open>0){x.fillStyle=lit?'#2a140a':'#000';x.fillRect(sx(w.x-8),sy(w.y-10),16*k,16*k);}
    const sh=(1-w.open)*8;rect(w.x-8,w.y-10,sh,16,pal[1]);rect(w.x+8-sh,w.y-10,sh,16,pal[1]);rect(w.x-9,w.y+6,18,2,'#2a1810');}
   if(th.night&&b.wins.length){const tx=b.x+b.w-6;rect(tx-1,GY-40,2,10,'#2a1810');x.fillStyle=`rgba(255,180,60,${.7+.3*Math.sin(T*9+b.x)})`;x.beginPath();x.arc(sx(tx),sy(GY-42),3.5*k,0,7);x.fill();x.fillStyle='rgba(255,150,40,.12)';x.beginPath();x.arc(sx(tx),sy(GY-42),26*k,0,7);x.fill();}
  }
  for(const l of L.ledges){if(l.x>cam+view.ww+10||l.x+l.w<cam-10)continue;x.fillStyle=th.hills;x.beginPath();x.moveTo(sx(l.x-14),sy(GY));x.lineTo(sx(l.x),sy(l.y));x.lineTo(sx(l.x+l.w),sy(l.y));x.lineTo(sx(l.x+l.w+14),sy(GY));x.fill();
   rect(l.x,l.y,l.w,4,'#c2643a');for(let yy=l.y+12;yy<GY;yy+=12){x.fillStyle='#0003';x.fillRect(sx(l.x+4),sy(yy),(l.w-8)*k,1.5*k);}}
  for(const cr of L.crates){if(!inView(cr.x,30))continue;if(cr.kind==='crate'){rect(cr.x,GY-cr.h,cr.w,cr.h,'#9a6a3a');x.strokeStyle='#5a3a1a';x.lineWidth=1.5*k;x.strokeRect(sx(cr.x),sy(GY-cr.h),cr.w*k,cr.h*k);x.beginPath();x.moveTo(sx(cr.x),sy(GY-cr.h));x.lineTo(sx(cr.x+cr.w),sy(GY));x.stroke();}
   else{rect(cr.x,GY-cr.h,cr.w,cr.h,'#7a4a26');rect(cr.x,GY-cr.h+3,cr.w,2,'#3a3a3a');rect(cr.x,GY-5,cr.w,2,'#3a3a3a');}}
 }
 // a gunslinger: boots, legs, coat in the player's colours, gun arm along the aim, the player's head under a Stetson
 const COATS=[['#2d6bd6','#1a3f86','#e8d3a0'],['#c93a4a','#7a1e2a','#e8d3a0']];
 function drawCowboy(p){
  if(p.out&&!p.alive&&p.y>=GY-1&&p.respawn<-1)return;
  const k=K(),X=sx(p.x),Y=sy(p.y),f=p.face,col=COATS[p.i],ducking=p.duck&&p.alive;
  if(p.alive&&p.inv>0&&Math.floor(T*14)%2)x.globalAlpha=.45;
  x.save();x.translate(X,Y);if(!p.alive){x.rotate(-f*Math.min(1.4,(RESPAWN-p.respawn)*3));}
  const legT=p.vx&&p.ground?Math.sin(p.walkT*14):0,bodyH=ducking?12:20;
  // legs + boots
  x.fillStyle='#3a2a1e';const lg=(dx,sw)=>{x.save();x.translate(dx*k,-bodyH*.5*k);x.rotate(sw*.5);x.fillRect(-2*k,0,4*k,(ducking?6:11)*k);x.fillStyle='#1a120c';x.fillRect(-2.5*k,(ducking?5:10)*k,6*k*f,3*k);x.fillStyle='#3a2a1e';x.restore();};
  lg(-2,legT);lg(2,-legT);
  // coat + belt
  x.fillStyle=col[0];x.fillRect(-6*k,-(bodyH+8)*k,12*k,(bodyH*.6+8)*k);x.fillStyle=col[1];x.fillRect(-6*k,-(bodyH*.4+2)*k,12*k,3*k);x.fillStyle=col[2];x.fillRect(-1*k,-(bodyH*.4+2)*k,3*k,3*k);
  x.fillStyle='#fff3';x.fillRect(-6*k,-(bodyH+8)*k,3*k,(bodyH*.6+8)*k);
  // gun arm along the aim
  const [ax,ay]=p.alive?p.aim:[f,0],an=Math.atan2(ay,ax);x.save();x.translate(0,-(bodyH+4)*k);x.rotate(an);
  x.fillStyle=col[0];x.fillRect(0,-2*k,9*k,4*k);x.fillStyle='#e0b08a';x.fillRect(8*k,-2*k,3*k,4*k);x.fillStyle='#2a2a2a';x.fillRect(10*k,-2.5*k,7*k,2.5*k);x.fillRect(10*k,-1*k,2*k,4*k);x.restore();
  // head + hat
  const hs=20*k,hy=-(bodyH+16)*k,hc=head(s.players[p.i].character,p.alive?(p.firing?'angry':'normal'):'sad',64);
  if(hc&&hc.width){x.save();if(f<0){x.scale(-1,1);}x.drawImage(hc,-hs/2,hy-hs/2,hs,hs);x.restore();}else{x.fillStyle='#e0b08a';x.beginPath();x.arc(0,hy,hs/2.4,0,7);x.fill();}
  x.fillStyle=p.i?'#5a1a1a':'#2a1a10';x.fillRect(-11*k,hy-hs*.42,22*k,2.5*k);x.beginPath();x.moveTo(-6*k,hy-hs*.42);x.quadraticCurveTo(0,hy-hs*.42-11*k,6*k,hy-hs*.42);x.fill();x.fillStyle=p.i?'#c93a4a':'#2d6bd6';x.fillRect(-6*k,hy-hs*.42-2.5*k,12*k,2*k);
  x.restore();x.globalAlpha=1;
  if(p.power&&p.alive){x.fillStyle=p.power==='two'?'#ffd34a':'#7affc8';x.font=`bold ${Math.max(8,7*k)}px "SC Nunito",sans-serif`;x.textAlign='center';x.fillText(p.power==='two'?'2×':'⚡',X,Y-(bodyH+34)*k);}
  if(np>1&&p.alive){x.fillStyle=p.i?'#ff9ad0':'#7fd3ff';x.font=`900 ${Math.max(8,7*k)}px "SC Nunito",sans-serif`;x.textAlign='center';x.fillText('P'+(p.i+1),X,Y-(bodyH+40)*k);}
 }
 function drawBandit(e){
  const k=K(),X=sx(e.x),Y=sy(e.y),f=e.face;
  if(e.kind==='window'){if(e.out<.05&&!e.dead)return;x.save();x.beginPath();x.rect(sx(e.win.x-8),sy(e.win.y-10),16*k,16*k);if(!e.dead)x.clip();
   const dy=e.dead?e.deadT*30:(1-e.out)*16;if(e.dead)x.globalAlpha=Math.max(0,1-e.deadT*1.5);x.translate(X,sy(e.y+29+dy));drawThug(0,0,k,f,e,true);x.restore();x.globalAlpha=1;return;}
  x.save();x.translate(X,Y);if(e.dead){x.globalAlpha=Math.max(0,1-e.deadT/2);x.rotate(-f*Math.min(1.5,e.deadT*4));}
  if(e.flash>0)x.filter='brightness(3)';
  if(e.kind==='boss')drawBossBody(e,k);else drawThug(0,0,k,f,e,false);
  x.restore();x.globalAlpha=1;x.filter='none';
 }
 function drawThug(X,Y,k,f,e,upper){
  const t=e.walkT||0,leg=Math.sin(t*14),cols={gun:['#5a3a26','#2a1a10'],rush:['#7a2a2a','#3a0a0a'],dyn:['#4a4a2a','#2a2a10'],ledge:['#5a3a26','#2a1a10'],window:['#5a3a26','#2a1a10']}[e.kind]||['#5a3a26','#2a1a10'];
  if(!upper){x.fillStyle='#2a2018';x.save();x.translate(-2*k,-10*k);x.rotate(leg*.5);x.fillRect(-2*k,0,4*k,11*k);x.restore();x.save();x.translate(2*k,-10*k);x.rotate(-leg*.5);x.fillRect(-2*k,0,4*k,11*k);x.restore();}
  x.fillStyle=cols[0];x.fillRect(-6*k,-28*k,12*k,18*k);x.fillStyle=cols[1];x.fillRect(-6*k,-14*k,12*k,3*k);
  // arm: gun, knife or dynamite
  x.save();x.translate(0,-24*k);
  if(e.kind==='rush'){x.rotate(f>0?-.3:Math.PI+.3);x.fillStyle=cols[0];x.fillRect(0,-2*k,9*k,4*k);x.fillStyle='#ddd';x.fillRect(9*k,-1*k,8*k,2*k);}
  else if(e.kind==='dyn'){x.rotate((e.throwT>0?-1.6:-.5)*(f>0?1:-1)+(f<0?Math.PI:0));x.fillStyle=cols[0];x.fillRect(0,-2*k,9*k,4*k);x.fillStyle='#d23';x.fillRect(9*k,-2*k,3*k,6*k);}
  else{x.rotate(f>0?0:Math.PI);x.fillStyle=cols[0];x.fillRect(0,-2*k,9*k,4*k);x.fillStyle='#222';x.fillRect(9*k,-2.5*k,7*k,2.5*k);}
  x.restore();
  // head: bandana bandit
  x.fillStyle='#d9a47a';x.beginPath();x.arc(0,-33*k,5.5*k,0,7);x.fill();x.fillStyle=e.kind==='rush'?'#c22':'#7a1a1a';x.fillRect(-5.5*k,-32*k,11*k,4.5*k);
  x.fillStyle='#000';x.fillRect((f>0?1:-3)*k,-35*k,2*k,1.5*k);
  x.fillStyle='#1a1410';x.fillRect(-9*k,-38*k,18*k,2.5*k);x.fillRect(-5*k,-44*k,10*k,6.5*k);
 }
 function drawBossBody(e,k){
  const t=e.walkT||0,leg=Math.sin(t*10),f=e.face;
  x.fillStyle='#1a1410';x.save();x.translate(-4*k,-14*k);x.rotate(leg*.4);x.fillRect(-3*k,0,6*k,15*k);x.restore();x.save();x.translate(4*k,-14*k);x.rotate(-leg*.4);x.fillRect(-3*k,0,6*k,15*k);x.restore();
  x.fillStyle='#2a2a32';x.fillRect(-11*k,-44*k,22*k,32*k);x.fillStyle='#6a1a2a';x.fillRect(-11*k,-20*k,22*k,4*k);x.fillStyle='#d4af37';x.fillRect(-2*k,-20*k,5*k,4*k);
  x.fillStyle='#8a1a1a';x.fillRect(-11*k,-44*k,4*k,32*k);
  x.save();x.translate(0,-36*k);x.rotate(f>0?(e.throwT>0?-1.4:0):Math.PI+(e.throwT>0?1.4:0));x.fillStyle='#2a2a32';x.fillRect(0,-3*k,14*k,6*k);x.fillStyle='#333';x.fillRect(14*k,-3*k,14*k,3.5*k);x.restore();
  const hs=24*k,hc=L.bossId?head(L.bossId,e.dead?'sad':e.hp<e.max*.4?'angry':'normal',96):null;
  if(hc&&hc.width){x.save();if(f<0)x.scale(-1,1);x.drawImage(hc,-hs/2,-58*k-hs/2,hs,hs);x.restore();}else{x.fillStyle='#d9a47a';x.beginPath();x.arc(0,-58*k,9*k,0,7);x.fill();}
  x.fillStyle='#0d0d10';x.fillRect(-15*k,-69*k,30*k,3.5*k);x.beginPath();x.moveTo(-8*k,-69*k);x.quadraticCurveTo(0,-84*k,8*k,-69*k);x.fill();x.fillStyle='#8a1a1a';x.fillRect(-8*k,-72*k,16*k,2.5*k);
 }
 function drawShots(){const k=K();
  for(const b of B){x.strokeStyle=b.o?'#ffc2e2':'#cfefff';x.lineWidth=2*k;x.beginPath();x.moveTo(sx(b.x),sy(b.y));x.lineTo(sx(b.x-b.vx*.018),sy(b.y-b.vy*.018));x.stroke();}
  for(const b of EB_){if(b.dyn){x.fillStyle='#d22';x.save();x.translate(sx(b.x),sy(b.y));x.rotate(b.t*9);x.fillRect(-2*k,-5*k,4*k,10*k);x.restore();if(Math.floor(T*20)%2){x.fillStyle='#ffd34a';x.beginPath();x.arc(sx(b.x),sy(b.y-6),2*k,0,7);x.fill();}continue;}
   x.fillStyle='#ff7a2a';x.beginPath();x.arc(sx(b.x),sy(b.y),3*k,0,7);x.fill();x.fillStyle='#ffe2a0';x.beginPath();x.arc(sx(b.x),sy(b.y),1.4*k,0,7);x.fill();}
  for(const it of items){const X=sx(it.x),Y=sy(it.y+Math.sin(it.t*5)*2);x.font=`${14*k}px serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(it.kind==='gold'?'💰':it.kind==='two'?'🔫':'⚡',X,Y);}
  for(const f of FXs){const a=1-f.t/f.life;
   if(f.k==='flash'){x.fillStyle=f.red?`rgba(255,120,60,${a})`:`rgba(255,240,180,${a})`;x.beginPath();x.arc(sx(f.x),sy(f.y),5*k,0,7);x.fill();}
   else if(f.k==='spark'){x.fillStyle=f.c;x.globalAlpha=a;x.fillRect(sx(f.x),sy(f.y),2.5*k,2.5*k);x.globalAlpha=1;}
   else if(f.k==='ring'){x.strokeStyle=`rgba(255,200,80,${a})`;x.lineWidth=4*k*a;x.beginPath();x.arc(sx(f.x),sy(f.y),f.r*k*(1-a*.6),0,7);x.stroke();x.fillStyle=`rgba(255,140,40,${a*.5})`;x.beginPath();x.arc(sx(f.x),sy(f.y),f.r*k*.6*(1-a*.3),0,7);x.fill();}
   else if(f.k==='text'){x.globalAlpha=a;x.fillStyle=f.c;x.font=`400 ${Math.max(12,11*k)}px "SC Bangers",Impact,sans-serif`;x.textAlign='center';x.strokeStyle='#000';x.lineWidth=3;x.strokeText(f.text,sx(f.x),sy(f.y-f.t*24));x.fillText(f.text,sx(f.x),sy(f.y-f.t*24));x.globalAlpha=1;}}
 }
 function drawHUD(){
  const u=Math.max(.8,Math.min(1.5,Math.min(W,H)/400)),top=view.y>0?Math.max(fb.top+40,view.y-38*u):Math.max(44,fb.top+10);
  x.textBaseline='middle';
  P.forEach((p,i)=>{const bx=8+i*Math.min(170*u,(W-(fb.top?140:20))/2),by=top+16*u;x.fillStyle='#000a';x.beginPath();x.roundRect?.(bx,by-14*u,158*u,30*u,10*u);x.fill();
   const hc=head(s.players[i].character,p.alive?'normal':'sad',48);if(hc&&hc.width)x.drawImage(hc,bx+4*u,by-12*u,24*u,24*u);
   x.fillStyle=i?'#ff9ad0':'#7fd3ff';x.font=`900 ${11*u}px "SC Nunito",sans-serif`;x.textAlign='left';x.fillText((solo?total[0]+p.score:p.score+total[i]).toLocaleString(),bx+32*u,by-4*u);
   x.font=`${10*u}px serif`;x.fillText('🤠'.repeat(Math.max(0,p.lives)),bx+32*u,by+8*u);
   if(p.out&&!p.alive){x.fillStyle='#ff6a6a';x.font=`900 ${10*u}px "SC Nunito",sans-serif`;x.fillText('OUT',bx+118*u,by);}});
  // stage + clock
  const cy=view.y>0?view.y+view.h+18*u:top+36*u;x.textAlign='center';x.fillStyle='#ffe2a0';x.font=`400 ${15*u}px "SC Bangers",Impact,sans-serif`;
  x.fillText(`${L.theme.name}  ·  ☀ ${Math.ceil(clock)}`,W/2,cy);
  if(phase==='boss'&&L.boss&&!L.boss.dead){const bw=Math.min(W*.6,360*u),bx=W/2-bw/2,by=view.y+view.h-16*u;x.fillStyle='#000b';x.fillRect(bx-2,by-2,bw+4,10*u+4);x.fillStyle='#c22';x.fillRect(bx,by,bw*L.boss.hp/L.boss.max,10*u);x.fillStyle='#fff';x.font=`900 ${9*u}px "SC Nunito",sans-serif`;x.fillText(`WANTED: ${L.bossName}`,W/2,by-8*u);}
 }
 function wantedPoster(alpha=1){const u=Math.max(.8,Math.min(1.6,Math.min(W,H)/400)),pw=Math.min(W*.7,240*u),ph=pw*1.3,px=W/2-pw/2,py=H/2-ph/2;
  x.globalAlpha=alpha;x.fillStyle='#e9d3a1';x.fillRect(px,py,pw,ph);x.strokeStyle='#6a4a2a';x.lineWidth=4;x.strokeRect(px+6,py+6,pw-12,ph-12);
  x.fillStyle='#3a1a0a';x.textAlign='center';x.textBaseline='middle';x.font=`400 ${pw*.2}px "SC Bangers",Impact,sans-serif`;x.fillText('WANTED',W/2,py+ph*.12);
  x.font=`700 ${pw*.06}px Georgia,serif`;x.fillText('DEAD OR ALIVE',W/2,py+ph*.22);
  const hc=L.bossId?head(L.bossId,'angry',160):null,hs=pw*.5;x.fillStyle='#cdb382';x.fillRect(W/2-hs/2-6,py+ph*.27,hs+12,hs+12);if(hc&&hc.width)x.drawImage(hc,W/2-hs/2,py+ph*.27+6,hs,hs);
  x.fillStyle='#3a1a0a';x.font=`400 ${pw*.1}px "SC Bangers",Impact,sans-serif`;x.fillText(L.bossName,W/2,py+ph*.27+hs+pw*.12);
  x.font=`400 ${pw*.13}px "SC Bangers",Impact,sans-serif`;x.fillText('$'+L.bounty.toLocaleString(),W/2,py+ph*.9);x.globalAlpha=1;}
 function draw(){
  layout();x.setTransform(1,0,0,1,0,0);x.fillStyle='#140a14';x.fillRect(0,0,W,H);
  if(view.y>0&&L){x.fillStyle=L.theme.sky[0];x.fillRect(0,0,W,view.y);x.fillStyle=L.theme.ground;x.fillRect(0,view.y+view.h,W,H-view.y-view.h);x.fillStyle='#0005';x.fillRect(0,view.y+view.h,W,H-view.y-view.h);}
  x.save();if(shake>0)x.translate((fxr()-.5)*shake,(fxr()-.5)*shake);
  x.save();x.beginPath();x.rect(view.x,view.y,view.w,view.h);x.clip();
  drawSky();drawBuildings();drawGround();for(const e of E)drawBandit(e);for(const p of P)drawCowboy(p);drawShots();
  if(L.theme.night){const g=x.createRadialGradient(W/2,view.y+view.h/2,view.h*.3,W/2,view.y+view.h/2,view.w*.7);g.addColorStop(0,'#0000');g.addColorStop(1,'#0008');x.fillStyle=g;x.fillRect(view.x,view.y,view.w,view.h);}
  x.restore();x.restore();
  drawHUD();
  // controls guide in the portrait control area
  if(view.y>0&&phase==='play'&&T<20){x.fillStyle='#ffffff55';x.font=`700 ${12*Math.max(.8,W/400)}px "SC Nunito",sans-serif`;x.textAlign='center';const gy=view.y+view.h+(H-view.y-view.h)/2;
   if(!solo){x.fillText('P1 · drag to aim & run · tap to jump',W*.25,gy);x.fillText('P2 · drag to aim & run · tap to jump',W*.75,gy);x.fillStyle='#ffffff22';x.fillRect(W/2-1,view.y+view.h+10,2,H-view.y-view.h-30);}else x.fillText('Drag to aim & run · tap to jump',W/2,gy);}
  if(phase==='intro'){x.fillStyle='#000a';x.fillRect(0,0,W,H);const u=Math.max(.8,Math.min(1.8,Math.min(W,H)/380));x.textAlign='center';x.textBaseline='middle';
   x.fillStyle='#ffb54a';x.font=`400 ${46*u}px "SC Bangers",Impact,sans-serif`;x.strokeStyle='#3a0a0a';x.lineWidth=6;x.strokeText('SUNDOWN',W/2,H/2-40*u);x.fillText('SUNDOWN',W/2,H/2-40*u);
   x.fillStyle='#ffe2a0';x.strokeText('SHOWDOWN',W/2,H/2+8*u);x.fillText('SHOWDOWN',W/2,H/2+8*u);
   x.font=`700 ${15*u}px "SC Nunito",sans-serif`;x.fillStyle='#fff';x.fillText(`${solo?`Stage ${stageNo+1}: `:''}${L.theme.name}`,W/2,H/2+50*u);x.fillStyle='#fff9';x.font=`700 ${12*u}px "SC Nunito",sans-serif`;x.fillText('tap to ride',W/2,H/2+76*u);}
  if(phase==='wanted')wantedPoster();
  if(banner?.why==='wanted'&&T-banner.t<2.4)wantedPoster(Math.min(1,(2.4-(T-banner.t))*2));
  if(phase==='end'&&banner){const u=Math.max(.8,Math.min(1.8,Math.min(W,H)/380)),txt=banner.why==='clear'?'BOUNTY COLLECTED!':banner.why==='sundown'?'THE SUN WENT DOWN':'GAME OVER';x.fillStyle='#000a';x.fillRect(0,H/2-40*u,W,80*u);x.textAlign='center';x.textBaseline='middle';x.fillStyle=banner.why==='clear'?'#ffd34a':'#ff6a6a';x.font=`400 ${36*u}px "SC Bangers",Impact,sans-serif`;x.fillText(txt,W/2,H/2);}
 }
 // tests: s.debug.bot (autopilot for every player), state(), boss() jumps to the boss arena, win() beats the boss
 Object.assign(s.debug,{sunset:music,state:()=>({phase,stage:stageNo,cam,clock,players:P.map(p=>({x:p.x,y:p.y,lives:p.lives,alive:p.alive,out:p.out,score:p.score,total:total[p.i]})),enemies:E.filter(e=>!e.dead).length,boss:L?.boss?{hp:L.boss.hp,max:L.boss.max,dead:L.boss.dead}:null,bossId:L?.bossId,recruits:s.gameRecruits}),
  boss(){cam=STAGE_LEN-1;for(const p of P)p.x=cam+60+p.i*20;for(const sp of L.spawns)sp.done=true;phase='play';},win(){if(L.boss&&!L.boss.dead){L.boss.dmg[0]=L.boss.hp;L.boss.hp=1;damage(L.boss,0);}},start(){phase='play';phaseT=0;},immortal:false});
 startStage();
 await new Promise(resolve=>{
  s.cleanup(resolve);
  s.frame(dt=>{if(!s.alive){resolve();return;}
   if(phase==='intro'&&phaseT>3.2){phase='wanted';phaseT=0;}else if(phase==='wanted'&&phaseT>2.6){phase='play';phaseT=0;}
   if(s.debug.immortal)for(const p of P)p.inv=Math.max(p.inv,.5);
   const d=Math.min(dt,1/30);if(phase==='intro'||phase==='wanted'){T+=d;phaseT+=d;}else step(d);draw();});
 });
}
Object.assign(exports,{sundown});
