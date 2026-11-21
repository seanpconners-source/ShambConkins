// ANGRY HEADS (game id angry-heads, engine 'headlaunch'): Angry Birds with the players' heads. Endless, like the real
// game: every location in ShambConkins is an episode of five levels (the fifth a castle round the location's main
// character with a crown), the forts are built from the level number (angry/levels.js) and get harder level after level.
// The heads in the forts are the characters who belong to that location; the special birds are game items with a power
// (tap in the air: split, boost, bomb, egg, big); a game item hidden in a fort is a bonus. Real rigid-body physics
// (angry/physics.js). Episode map with stars per level, saved in profile.angryHeads.
// 1P: the map, then level after level (retry, next, back to the map); the score adds up as a solo run. 2P on one phone:
// player 1 picks where to start on the map, then three levels each (two on the board), pass and play, most points wins.
// Online (s.online): the same, in turns; the phone whose turn it is streams its fort (~15/s) and the other phone shows the
// shot live; seat 0 picks the start level.
const {clamp,seededRandom}=require("src/utils.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {netField}=require("src/engines/netField.js");
const {snd}=require("src/engines/arenaKit.js");
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const {LOCATIONS}=require("src/locations.js");
const {CHARACTERS}=require("src/characters.js");
const {ITEMS}=require("src/items.js");
const {ART}=require("src/data/art.js");
const {portraitURL}=require("src/assets.js");
const {isRasterArt}=require("src/data/userPortraits.js");
const {buildLevel,MAT,LEVELS_PER_EPISODE:LPE}=require("src/engines/angry/levels.js");
const {makePhys,BIRD_R}=require("src/engines/angry/physics.js");
const C=require("src/vendor/cannon.js");

const SLING={x:0,y:3.1},PULL=3.6,VMAX=31;
// ---- episodes: locations whose characters have their own pictures (the heads in the forts)
let EPISODES=null;
function episodes(){if(EPISODES)return EPISODES;const art=id=>{try{return isRasterArt(portraitURL(id,'normal'));}catch{return false;}};
 const itemArt=id=>!!ART['photo:item:'+id];const allItems=ITEMS.filter(i=>itemArt(i.id));
 EPISODES=LOCATIONS.map(l=>{const ids=[...new Set([...(l.characters||[]),...CHARACTERS.filter(c=>c.source===l.source).map(c=>c.id)])].filter(id=>CHARACTERS.some(c=>c.id===id)&&art(id));
  let items=allItems.filter(i=>i.source===l.source).map(i=>i.id);if(items.length<3){const r=seededRandom('ah-items:'+l.id);const extra=[...allItems].sort(()=>r()-.5).slice(0,4).map(i=>i.id);items=[...items,...extra];}
  return {id:l.id,name:l.name,source:l.source,icon:l.icon,realm:l.realm,pigs:ids,items};}).filter(e=>e.pigs.length);
 return EPISODES;}
const progress=()=>{const p=store.profile;if(!p)return {stars:{},best:{}};if(!p.angryHeads||typeof p.angryHeads!=='object')p.angryHeads={stars:{},best:{}};return p.angryHeads;};
const unlocked=n=>n===0||(progress().stars[n-1]||0)>0;
const levelData=n=>{const e=episodes()[Math.floor(n/LPE)%episodes().length];return {e,lv:buildLevel(n,{pigs:e.pigs,items:e.items})};};
const imgCache=new Map();const img=url=>{if(!url)return null;let im=imgCache.get(url);if(!im){im=new Image();im.src=url;imgCache.set(url,im);}return im.complete&&im.naturalWidth?im:null;};
const headOf=(id,mood='normal',size=128)=>{try{const c=require('src/engines/broforce.js').headCanvas(id,mood,size);return c?.width?c:null;}catch{return null;}};

async function headlaunch(s){
 const [c,x]=s.canvas(900,520,{fill:true});const fb=fullBleed(s,{bg:'#0c1424'});
 const online=!!s.online,solo=!!s.solo&&!online,board=s.origin==='board'&&!online,nP=solo?1:2,LEVELS=board?2:3;
 const names=s.players.map(p=>p.name||'Player'),total=[0,0];
 let t=0,phase='map',phaseT=0,cur=0,levelN=0,E=null,LV=null,ph=null,score=0,birdQ=[],birdI=0,flying=null,aim=null,pan=null,popups=[],parts=[],trail=[],lastTrail=[],result=null,shake=0,mapSel=0,mapX=0,mapDrag=null;
 const cam={x:-6,sc:20,tx:-6,follow:null};let W=s.W,H=s.H,GY=0;
 const sfx={pull:()=>snd(300,.12,{type:'triangle',vol:.03,to:520}),fling:()=>{snd(700,.12,{type:'triangle',vol:.05,to:200});snd(160,.25,{type:'sawtooth',vol:.03,to:80,delay:.03});},
  wood:()=>snd(180,.08,{type:'square',vol:.04,to:90}),glass:()=>{snd(2200,.06,{type:'triangle',vol:.04,to:3200});snd(1700,.08,{type:'triangle',vol:.03,delay:.03});},stone:()=>snd(90,.12,{type:'sawtooth',vol:.05,to:60}),
  pop:()=>{snd(520,.08,{type:'square',vol:.05,to:900});snd(140,.15,{type:'sawtooth',vol:.04,to:70,delay:.04});},boom:()=>{snd(60,.5,{type:'sawtooth',vol:.08,to:30});snd(240,.3,{type:'square',vol:.04,to:40});},
  power:()=>snd(900,.1,{type:'square',vol:.04,to:1500}),win:()=>[523,659,784,1047].forEach((f,i)=>snd(f,.16,{type:'square',vol:.035,delay:i*.12})),lose:()=>[392,330,262].forEach((f,i)=>snd(f,.22,{type:'triangle',vol:.04,delay:i*.18})),star:k=>snd(880+k*220,.14,{type:'square',vol:.04})};
 const mine=()=>!online||cur===nf?.me;
 // ---- online: the turn's phone streams its fort; the other shows it
 let watch=null;const doneGot={},doneWait=[];
 const nf=online?netField(s,{hz:15,pack:packSnap,unpack:(i,d)=>{if(d&&d.n===levelN&&d.c===cur)watch={...d,at:performance.now()};},onEvent:e=>{
   if(Array.isArray(e?.done)){doneGot[e.done[0]+':'+e.done[1]]=e.done;doneWait.splice(0).forEach(f=>f());}
   if(Number.isInteger(e?.lv)&&phase==='map'&&nf.me!==0){mapPick=e.lv;}
   if(e?.pw&&watchPh)powerFx(e.pw);}}):null;
 let mapPick=null,watchPh=null;
 function packSnap(){if(!ph||!mine())return {c:cur,n:levelN,ph:phase};const b=[];for(const it of ph.items)if(!it.static&&!it.gone&&(it.b.sleepState!==C.Body.SLEEPING||it.sent!==true)){const p=it.b.position,q=it.b.quaternion;b.push([it.i,+p.x.toFixed(2),+p.y.toFixed(2),+(2*Math.atan2(q.z,q.w)).toFixed(3),it.hp<it.max?1:0]);it.sent=it.b.sleepState===C.Body.SLEEPING;}
  return {c:cur,n:levelN,ph:phase,sc:score,bi:birdI,b,d:[...ph.dead],f:ph.birds.filter(bd=>!bd.gone).map(bd=>[+bd.b.position.x.toFixed(2),+bd.b.position.y.toFixed(2),+bd.r.toFixed(2),bd.kind==='item'?birdQ[birdI]?.item||bd.item||'':bd.kind,bd.egg?1:0]),a:aim?[+aim.x.toFixed(2),+aim.y.toFixed(2)]:null,cx:+cam.x.toFixed(2),tr:trail.slice(-60).map(p=>[+p[0].toFixed(1),+p[1].toFixed(1)])};}
 // ---- layout and camera: world units → screen
 const layout=()=>{W=s.W;H=s.H;GY=H*.84;};
 const sx=X=>(X-cam.x)*cam.sc,sy=Y=>GY-Y*cam.sc;
 // close like the real game: the whole level when it fits at a good size, else the camera pans between sling and fort
 function fitCam(){if(!LV)return;const u=Math.min(W,H)/420,span=LV.width+8,top=Math.max(10,...LV.bodies.map(b=>b.y+(b.h||b.r||b.s||1)))+2;cam.sc=Math.min(Math.max(W/span,W/34),Math.max(W/span,(GY-fb.top-30)/top),40*u);}
 const viewW=()=>W/cam.sc;
 // ---- the level
 function startLevel(n){levelN=n;({e:E,lv:LV}=levelData(n));score=0;birdI=0;birdQ=LV.birds.map(b=>({...b}));popups=[];parts=[];trail=[];lastTrail=[];result=null;flying=null;aim=null;watch=null;
  ph=makePhys(LV,{onBreak:it=>{const m=it.s.mat,v=MAT[m].score;score+=v;popup(it.b.position.x,it.b.position.y,v);debris(it,m);(m==='glass'||m==='ice'?sfx.glass:m==='stone'?sfx.stone:sfx.wood)();},
   onPig:it=>{const v=it.s.king?10000:5000;score+=v;popup(it.b.position.x,it.b.position.y+it.s.r,v,true);puff(it.b.position.x,it.b.position.y,it.s.r);sfx.pop();},
   onBoom:(X,Y,R)=>{shake=.5;sfx.boom();for(let i=0;i<40;i++){const a=Math.random()*6.28,v=4+Math.random()*12;parts.push({x:X,y:Y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.7,c:i%3?'#ff9c1c':'#fff3a0',sz:.25});}},
   onBonus:it=>{score+=3000;popup(it.b.position.x,it.b.position.y,3000,true,it.s.item);sfx.win();}});
  layout();fitCam();cam.x=Math.max(-3,LV.width-viewW()+2);cam.tx=-3;phase='intro';phaseT=0;}
 const popup=(X,Y,v,big,item)=>popups.push({x:X,y:Y,v,t:0,big,item});
 function debris(it,m){const p=it.b.position,col={wood:['#b07838','#7a4a1c'],glass:['#bce8ff','#ffffff'],stone:['#9c9c9c','#6c6c6c'],ice:['#d8f4ff','#8cc8e8']}[m];
  for(let i=0;i<10;i++)parts.push({x:p.x+(Math.random()-.5)*it.s.w,y:p.y+(Math.random()-.5)*it.s.h,vx:(Math.random()-.5)*8,vy:Math.random()*7,life:.9,c:col[i%2],sz:.18+Math.random()*.15,rot:Math.random()*6,g:1});}
 function puff(X,Y,r){for(let i=0;i<16;i++){const a=i/16*6.28;parts.push({x:X+Math.cos(a)*r*.6,y:Y+Math.sin(a)*r*.6,vx:Math.cos(a)*2.5,vy:Math.sin(a)*2.5+1,life:.8,c:'#f0f0f0',sz:.35+Math.random()*.2,smoke:1});}}
 // ---- input: pull the head back in the sling and let go; tap in the air for the special bird's power; drag elsewhere to look around
 let drag=null;
 const toWorld=(px,py)=>({x:px/cam.sc+cam.x,y:(GY-py)/cam.sc});
 s.on(c,'pointerdown',ev=>{ev.preventDefault();const p=pos(ev);if(phase==='map')return mapDown(p);if(phase==='result')return resultTap(p);if(phase==='intro'){phaseT=99;return;}
  if(!mine())return;
  if(phase==='fly'&&flying&&!flying.usedTap){const r=ph.power(flying.bd);flying.usedTap=true;if(r){sfx.power();powerFx(r);nf?.event({pw:r});}return;}
  if(phase!=='aim')return;const w=toWorld(p.x,p.y),d=Math.hypot(w.x-SLING.x,w.y-SLING.y);
  if(d<2.6*Math.max(1,22/cam.sc)){drag={kind:'sling'};aim={x:0,y:0};sfx.pull();}else drag={kind:'pan',x0:p.x,cx:cam.x};});
 s.on(c,'pointermove',ev=>{const p=pos(ev);if(phase==='map')return mapMove(p);if(!drag)return;
  if(drag.kind==='pan'){cam.x=clamp(drag.cx-(p.x-drag.x0)/cam.sc,-5,Math.max(-3,LV.width-viewW()+2));cam.tx=cam.x;return;}
  const w=toWorld(p.x,p.y);let dx=w.x-SLING.x,dy=w.y-SLING.y;const d=Math.hypot(dx,dy);if(d>PULL){dx*=PULL/d;dy*=PULL/d;}if(SLING.y+dy<.5)dy=.5-SLING.y;aim={x:dx,y:dy};});
 s.on(window,'pointerup',ev=>{if(phase==='map')return mapUp(pos(ev));const d=drag;drag=null;if(!d||d.kind!=='sling'||!aim)return;
  const pl=Math.hypot(aim.x,aim.y);if(pl<.6){aim=null;return;}fire(-aim.x/PULL*VMAX,-aim.y/PULL*VMAX);aim=null;});
 const pos=ev=>{const r=c.getBoundingClientRect();return {x:(ev.clientX-r.left)*(W/r.width),y:(ev.clientY-r.top)*(H/r.height)};};
 function fire(vx,vy){const b=birdQ[birdI];if(!b)return;const bd=ph.launch(SLING.x+(aim?aim.x:0),SLING.y+(aim?aim.y:0),vx,vy,{ability:b.ability,kind:b.kind,item:b.item});
  flying={bd,usedTap:!b.ability};lastTrail=trail;trail=[];phase='fly';phaseT=0;sfx.fling();s.react?.(cur,'angry');nf?.push();}
 function powerFx(kind){popups.push({screen:true,text:{split:'SPLIT!',boost:'BOOST!',bomb:'KABOOM!',egg:'EGG DROP!',big:'MASSIVE!'}[kind]||'',t:0});}
 // ---- flow
 const until=fn=>new Promise(r=>{const id=setInterval(()=>{if(!s.alive||fn()){clearInterval(id);r();}},50);});
 let mapResolve=null;
 async function playTurn(n){startLevel(n);await until(()=>phase==='result'&&result&&(solo||result.ready));return result;}
 function endShot(){if(!ph)return;ph.clearBirds();flying=null;birdI++;
  if(!ph.pigsLeft()){const left=birdQ.length-birdI;for(let i=0;i<left;i++)setTimeout(()=>{if(!s.alive)return;score+=10000;popup(SLING.x-1.5-i*1.4,1.5,10000,true);sfx.star(i);},300+i*350);
   setTimeout(()=>finishLevel(true),400+left*350+500);phase='won';return;}
  if(birdI>=birdQ.length){phase='lost';setTimeout(()=>finishLevel(false),900);return;}
  phase='aim';phaseT=0;cam.tx=-3;}
 function finishLevel(won){const st=won?(score>=LV.stars[2]?3:score>=LV.stars[1]?2:1):0;result={won,score,stars:st,t:0,ready:false};phase='result';phaseT=0;(won?sfx.win:sfx.lose)();
  if(won&&(solo||!online&&!board)){const P=progress();P.stars[levelN]=Math.max(P.stars[levelN]||0,st);P.best[levelN]=Math.max(P.best[levelN]||0,score);try{saveProfile(store.profile);}catch{}}
  if(mine())nf?.event({done:[cur,levelN,score,st]});
  if(!solo)setTimeout(()=>{if(result)result.ready=true;},3200);}
 // the watched turn: the other phone's done message ends it here
 async function watchTurn(n){startLevel(n);watchPh=true;const key=cur+':'+n;await new Promise(r=>{const chk=()=>{if(doneGot[key]||!s.alive)r();else doneWait.push(chk);};chk();});
  watchPh=null;if(!s.alive)return;const d=doneGot[key];score=d[2];result={won:d[3]>0,score:d[2],stars:d[3],t:0,ready:false};phase='result';phaseT=0;(d[3]?sfx.win:sfx.lose)();setTimeout(()=>{if(result)result.ready=true;},3200);await until(()=>result?.ready);}
 async function run(){
  // where to start: the map (1P / arcade), a level from the seed on the board
  let n0;
  if(board){const r=seededRandom((s.seed||1)+':ah-board');n0=Math.floor(r()*Math.min(episodes().length*LPE,30));}
  else if(online&&nf.me!==0){phase='map';await until(()=>mapPick!==null);n0=mapPick;}
  else{phase='map';n0=await new Promise(r=>{mapResolve=r;});if(online)nf.event({lv:n0});}
  if(!s.alive)return;
  if(solo){let n=n0,cleared=0,sum=0;
   for(;;){const res=await playTurn(n);if(!s.alive)return;
    const ch=await new Promise(r=>{result.choose=r;});if(!s.alive)return;
    if(res.won){sum+=res.score;cleared++;soloProgress(s,sum,cleared,`${E.name} ${E.id?'':''}· ${cleared} cleared`);}
    if(ch==='next')n=res.won?n+1:n;else if(ch==='map'){phase='map';mapSel=Math.floor(n/LPE);n=await new Promise(r=>{mapResolve=r;});}else if(ch==='quit'){soloFinish(s,sum,cleared,`Angry Heads · ${cleared} level${cleared===1?'':'s'} cleared`,cleared>0);return;}}}
  if(online){phase='wait';await nf.sync('ah-go');}
  for(let k=0;k<LEVELS;k++){const n=n0+k;
   for(cur=0;cur<2;cur++){
    if(!online){phase='pass';const {e}=levelData(n);await s.pass(cur,`${names[cur]}: ${e.name} ${Math.floor(n/LPE)+1}-${n%LPE+1}. Pull your head back in the sling and let go. Pop every head in the fort with the birds you have. ${cur?`${names[0]} scored ${result?.score||0}.`:''}`,'Ready');if(!s.alive)return;}
    else if(k===0&&cur===0){phase='pass';await s.pass(nf.me,nf.me===0?`You shoot first. ${names[1]} watches every shot live on their phone, then takes their turn at the same fort. ${LEVELS} levels each, most points wins.`:`${names[0]} shoots first: watch their shots live, then it's your turn at the same fort. ${LEVELS} levels each, most points wins.`,'Ready');if(!s.alive)return;}
    if(mine()){const res=await playTurn(n);if(!s.alive)return;total[cur]+=res.score;}
    else{await watchTurn(n);if(!s.alive)return;total[cur]+=result.score;}
    s.setScores?.([...total]);}}
  s.finish([...total],`Angry Heads · ${levelData(n0).e.name} · ${LEVELS} levels each`);}
 // ---- the map: a carousel of episodes (locations) and their five levels
 function mapDown(p){if(online&&nf.me!==0)return;mapDrag={x0:p.x,y0:p.y,m0:mapX,moved:false,t0:performance.now()};}
 function mapMove(p){if(!mapDrag)return;const dx=p.x-mapDrag.x0;if(Math.abs(dx)>8)mapDrag.moved=true;if(mapDrag.moved)mapX=mapDrag.m0-dx/cardW();}
 function mapUp(p){const d=mapDrag;mapDrag=null;if(!d)return;if(d.moved){mapX=clamp(Math.round(mapX),0,episodes().length-1);mapSel=mapX;return;}
  // a tap: a level bubble, or an episode card (centre on it)
  for(const b of mapBubbles)if(Math.hypot(p.x-b.x,p.y-b.y)<b.r+6){if(!b.open){shake=.2;return;}mapResolve?.(b.n);mapResolve=null;return;}
  for(const cd of mapCards)if(p.x>cd.x&&p.x<cd.x+cd.w&&p.y>cd.y&&p.y<cd.y+cd.h){mapSel=mapX=cd.e;return;}}
 const cardW=()=>Math.min(300,W*.62)+18;let mapBubbles=[],mapCards=[];
 function resultTap(p){if(!result)return;if(!solo){if(phaseT>.8)result.ready=true;return;}for(const b of result.buttons||[])if(Math.hypot(p.x-b.x,p.y-b.y)<b.r+6){result.choose?.(b.id);return;}}
 // ---- frame
 s.frame(dt=>{dt=Math.min(dt,.05);t+=dt;phaseT+=dt;layout();if(shake>0)shake-=dt;
  if(phase==='map'){mapX+=(mapSel-mapX)*(mapDrag?0:Math.min(1,dt*10));if(!mapDrag)mapX=mapX;drawMap();return;}
  if(!LV){x.fillStyle='#0c1424';x.fillRect(0,0,W,H);hudText('…',W/2,H/2,20);return;}
  fitCam();
  if(watchPh&&!mine())applyWatch();
  else if(ph&&(phase==='fly'||phase==='aim'||phase==='won'||phase==='lost'||phase==='intro'||phase==='result')){ph.step(dt);
   if(flying){const p=flying.bd.b.position;trail.push([p.x,p.y]);if(trail.length>400)trail.shift();
    const v=flying.bd.b.velocity;if((phaseT>1.2&&ph.settled())||phaseT>11||p.y<-8||p.x>LV.width+40){endShot();}}
   nf?.tick(dt);}
  // camera: intro pan from the fort to the sling, follow the bird, back to the sling for the next one
  if(phase==='intro'){cam.x+=(-3-cam.x)*Math.min(1,dt*1.3);if(phaseT>2.6||Math.abs(cam.x+3)<.3){phase='aim';phaseT=0;cam.x=-3;}}
  else if(phase==='fly'&&flying){const p=flying.bd.b.position;cam.tx=clamp(p.x-viewW()*.35,-3,Math.max(-3,LV.width-viewW()+2));cam.x+=(cam.tx-cam.x)*Math.min(1,dt*5);}
  else if(phase==='aim'&&!drag){cam.x+=(cam.tx-cam.x)*Math.min(1,dt*3);}
  for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.vy-=(q.g?18:q.smoke?-1:6)*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;q.rot=(q.rot||0)+dt*8;if(q.life<=0)parts.splice(i,1);}
  for(let i=popups.length-1;i>=0;i--){popups[i].t+=dt;if(popups[i].t>1.4)popups.splice(i,1);}
  // the autopilot (tests): aim at the nearest head with a found shot
  if(s.debug?.autopilot&&mine()&&phase==='aim'&&phaseT>.5)autoShot();
  if(s.debug?.autopilot&&mine()&&phase==='fly'&&flying&&!flying.usedTap&&phaseT>.7){const r=ph.power(flying.bd);flying.usedTap=true;if(r)powerFx(r);}
  draw();});
 // the watcher applies the stream: bodies, gone pieces (with their effects), birds, aim, camera, trail
 function applyWatch(){const d=watch;if(!d||!ph)return;
  if(d.ph==='aim'||d.ph==='fly'||d.ph==='won'||d.ph==='lost')phase=d.ph==='fly'?'fly':d.ph==='aim'?'aim':phase;score=d.sc??score;birdI=d.bi??birdI;
  for(const [i,X,Y,A,h] of d.b||[]){const it=ph.items.find(q=>q.i===i);if(!it||it.gone)continue;it.b.position.x+=(X-it.b.position.x)*.5;it.b.position.y+=(Y-it.b.position.y)*.5;it.b.quaternion.setFromAxisAngle(new C.Vec3(0,0,1),A);if(h)it.hp=Math.min(it.hp,it.max*.5);}
  for(const i of d.d||[]){const it=ph.items.find(q=>q.i===i);if(!it||it.gone)continue;it.gone=true;const s0=it.s;
   if(s0.kind==='pig'){puff(it.b.position.x,it.b.position.y,s0.r);popup(it.b.position.x,it.b.position.y+s0.r,s0.king?10000:5000,true);sfx.pop();}
   else if(s0.kind==='block'){debris(it,s0.mat);popup(it.b.position.x,it.b.position.y,MAT[s0.mat].score);}else if(s0.kind==='tnt'){shake=.5;sfx.boom();}}
  watchBirds=d.f||[];if(d.a)aim={x:d.a[0],y:d.a[1]};else aim=null;cam.x+=((d.cx??cam.x)-cam.x)*.3;trail=(d.tr||[]).map(p=>[p[0],p[1]]);}
 let watchBirds=null;
 function autoShot(){if(!ph||s.debug._aiming)return;const tgt=ph.items.find(it=>!it.gone&&it.s.kind==='pig');if(!tgt)return;const tx=tgt.b.position.x,ty=tgt.b.position.y;
  // simple ballistic solve for a flat-ish shot at full power, else a lob
  const g=22,v=VMAX*.98,dx=tx-SLING.x,dy=ty-SLING.y,disc=v**4-g*(g*dx*dx+2*dy*v*v);const a=disc>=0?Math.atan((v*v-Math.sqrt(disc))/(g*dx)):.7;
  aim={x:-Math.cos(a)*PULL,y:-Math.sin(a)*PULL};fire(Math.cos(a)*v,Math.sin(a)*v);aim=null;}
 // ---- drawing
 const R=(c0,X,Y,w,h)=>{x.fillStyle=c0;x.fillRect(X,Y,w,h);};
 function hudText(str,X,Y,size,fill='#fff',al='center',font='"SC Bangers",Impact,sans-serif'){x.font=`${size}px ${font}`;x.textAlign=al;x.textBaseline='middle';x.lineJoin='round';x.lineWidth=size*.2;x.strokeStyle='#000c';x.strokeText(str,X,Y);x.fillStyle=fill;x.fillText(str,X,Y);}
 function small(str,X,Y,size,fill='#fff',al='center'){x.font=`800 ${size}px "SC Nunito",sans-serif`;x.textAlign=al;x.textBaseline='middle';x.lineWidth=size*.25;x.strokeStyle='#0009';x.strokeText(str,X,Y);x.fillStyle=fill;x.fillText(str,X,Y);}
 const SKIES={mind:['#7ec8f8','#d8f0ff'],body:['#f8b878','#ffe8c8'],spirit:['#8c6cd8','#e8d8ff'],horror:['#2c2038','#6c4c6c']};
 function drawBg(){const sk=SKIES[E?.realm]||SKIES.mind,g=x.createLinearGradient(0,0,0,GY);g.addColorStop(0,sk[0]);g.addColorStop(1,sk[1]);x.fillStyle=g;x.fillRect(0,0,W,GY);
  // the location's own picture (when the game has one) as the far backdrop
  const la=img(E&&ART['photo:location:'+E.id]);if(la){const k=Math.max(W/la.naturalWidth,GY*.8/la.naturalHeight),w=la.naturalWidth*k,h=la.naturalHeight*k;x.globalAlpha=.85;x.drawImage(la,(W-w)/2-cam.x*cam.sc*.08,GY-h,w,h);x.globalAlpha=1;}
  else{x.font=`${Math.min(W,H)*.34}px sans-serif`;x.textAlign='center';x.textBaseline='middle';x.globalAlpha=.16;x.fillText(E?.icon||'',W*.62-cam.x*cam.sc*.06,GY*.45);x.globalAlpha=1;}
  // clouds and two rows of hills, parallax
  x.fillStyle='#ffffffcc';for(let i=0;i<6;i++){const X=((i*260-cam.x*cam.sc*.15+t*6)%(W+400)+W+400)%(W+400)-200,Y=40+((i*67)%120);for(const [dx,dy,r] of [[0,0,26],[28,-10,32],[60,0,24]]){x.beginPath();x.arc(X+dx,Y+dy,r,0,7);x.fill();}}
  for(const [k,col,hh] of [[.25,'#8cc87c',.3],[.5,'#5ca84c',.18]]){x.fillStyle=col;x.beginPath();x.moveTo(0,GY);for(let X=0;X<=W+20;X+=20){const wx=X/cam.sc+cam.x*k;x.lineTo(X,GY-(Math.sin(wx*.12)*.5+.6+Math.sin(wx*.031)*.4)*GY*hh);}x.lineTo(W,GY);x.fill();}}
 function drawGround(){R('#6cbc3c',0,GY,W,6);R('#8c5c2c',0,GY+6,W,H-GY);x.fillStyle='#7a4c22';for(let X=((-cam.x*cam.sc)%40+40)%40-40;X<W;X+=40)x.fillRect(X,GY+16,20,6);}
 function drawSling(front){const X=sx(0),Y=sy(0),k=cam.sc;x.fillStyle='#6c3c1c';x.strokeStyle='#3c1c0c';x.lineWidth=2;
  if(!front){x.beginPath();x.moveTo(X-.25*k,Y);x.lineTo(X-.2*k,Y-2*k);x.lineTo(X-.7*k,Y-3.3*k);x.lineTo(X-.35*k,Y-3.4*k);x.lineTo(X+.05*k,Y-2.3*k);x.lineTo(X+.25*k,Y);x.fill();x.stroke();return;}
  x.beginPath();x.moveTo(X+.05*k,Y-2.3*k);x.lineTo(X+.55*k,Y-3.4*k);x.lineTo(X+.85*k,Y-3.3*k);x.lineTo(X+.3*k,Y-2*k);x.fill();x.stroke();}
 function drawBands(bx,by){const k=cam.sc;x.strokeStyle='#3c1c0c';x.lineWidth=Math.max(3,k*.22);x.beginPath();x.moveTo(sx(-.55),sy(3.3));x.lineTo(bx,by);x.lineTo(sx(.7),sy(3.3));x.stroke();}
 function drawBird(kind,item,X,Y,r,ang,mood){const k=cam.sc;if(kind==='egg'){x.fillStyle='#fffaf0';x.beginPath();x.ellipse(X,Y,r*k*.85,r*k,0,0,7);x.fill();x.strokeStyle='#0006';x.lineWidth=1.5;x.stroke();return;}
  if(kind==='item'&&item){const im=img(ART['photo:item:'+item]);x.save();x.translate(X,Y);x.rotate(ang||0);x.fillStyle='#ffd84c';x.beginPath();x.arc(0,0,r*k*1.1,0,7);x.fill();x.strokeStyle='#5c3c00';x.lineWidth=2;x.stroke();if(im){const s0=r*k*2;x.drawImage(im,-s0/2,-s0/2,s0,s0);}x.restore();return;}
  x.save();x.translate(X,Y);x.rotate((ang||0)*.3);s.sprite(x,cur,0,0,r*k*2.6,{exact:true,mood});x.restore();}
 function drawBlock(it){const s0=it.s,b=it.b,p=b.position,a=2*Math.atan2(b.quaternion.z,b.quaternion.w),k=cam.sc,w=(s0.w||s0.s)*k,h=(s0.h||s0.s)*k;x.save();x.translate(sx(p.x),sy(p.y));x.rotate(-a);
  if(s0.kind==='tnt'){R('#c8281c',-w/2,-h/2,w,h);R('#e8483c',-w/2+2,-h/2+2,w-4,4);x.fillStyle='#fff';x.font=`900 ${h*.42}px sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('TNT',0,1);x.strokeStyle='#5c0c08';x.lineWidth=2;x.strokeRect(-w/2,-h/2,w,h);x.restore();return;}
  const m=s0.mat,st={wood:['#c88c44','#8c5420','#e8b46c'],glass:['#bce8ff99','#5ca8d8','#ffffffcc'],stone:['#a8a8a8','#5c5c5c','#d0d0d0'],ice:['#d8f4ffcc','#8cc8e8','#ffffff']}[m];
  R(st[1],-w/2,-h/2,w,h);R(st[0],-w/2+1.5,-h/2+1.5,w-3,h-3);x.fillStyle=st[2];x.fillRect(-w/2+2,-h/2+2,w-4,Math.min(3,h*.2));
  if(m==='wood'){x.strokeStyle='#a06a30';x.lineWidth=1;for(let k2=1;k2<4;k2++){x.beginPath();if(w>h){x.moveTo(-w/2+3,-h/2+h*k2/4);x.lineTo(w/2-3,-h/2+h*k2/4);}else{x.moveTo(-w/2+w*k2/4,-h/2+3);x.lineTo(-w/2+w*k2/4,h/2-3);}x.stroke();}}
  if(m==='stone'){x.fillStyle='#8c8c8c';x.fillRect(-w/4,-h/4,w*.2,h*.15);x.fillRect(w/8,h/10,w*.18,h*.12);}
  if(m==='glass'||m==='ice'){x.strokeStyle='#ffffffaa';x.lineWidth=1.5;x.beginPath();x.moveTo(-w/2+4,h/2-4);x.lineTo(-w/2+Math.min(w,h)*.6,-h/2+4);x.stroke();}
  // cracks as it takes damage, a flash when hit
  const dmg=1-it.hp/it.max;if(dmg>.3){x.strokeStyle='#0008';x.lineWidth=1.2;x.beginPath();x.moveTo(-w*.3,-h*.4);x.lineTo(0,0);x.lineTo(w*.2,-h*.2);x.lineTo(w*.35,h*.4);if(dmg>.6){x.moveTo(0,0);x.lineTo(-w*.25,h*.4);}x.stroke();}
  if(it.hit>0){x.fillStyle=`rgba(255,255,255,${it.hit*1.6})`;x.fillRect(-w/2,-h/2,w,h);}x.restore();}
 function drawPig(it){const s0=it.s,p=it.b.position,k=cam.sc,r=s0.r*k,X=sx(p.x),Y=sy(p.y),a=2*Math.atan2(it.b.quaternion.z,it.b.quaternion.w);
  const mood=it.hp<it.max*.6?'sad':phase==='lost'||phase==='result'&&result&&!result.won?'win':flying&&Math.abs(flying.bd.b.position.x-p.x)<8?'think':'normal';
  const hc=headOf(s0.char,mood,160);x.save();x.translate(X,Y);x.rotate(-a*.5+(it.hit>0?Math.sin(t*60)*.15:0));
  x.fillStyle='#0003';x.beginPath();x.ellipse(0,r*.9,r*.8,r*.2,0,0,7);x.fill();
  if(hc){const s1=r*2.5;x.drawImage(hc,-s1/2,-s1/2,s1,s1);}else{x.fillStyle='#7cd84c';x.beginPath();x.arc(0,0,r,0,7);x.fill();}
  if(s0.armor){x.fillStyle=s0.armor>1?'#5c5c6c':'#9c9cac';x.beginPath();x.arc(0,-r*.25,r*1.02,Math.PI*1.05,Math.PI*1.95);x.lineTo(r*.9,-r*.25);x.lineTo(-r*.9,-r*.25);x.fill();x.strokeStyle='#2c2c34';x.lineWidth=2;x.stroke();if(s0.armor>1){R('#3c3c4c',-r*.1,-r*1.25,r*.2,r*.6);}}
  if(s0.king){x.fillStyle='#f8c838';x.strokeStyle='#8c5c00';x.lineWidth=2;x.beginPath();x.moveTo(-r*.7,-r*.75);for(const [px,py] of [[-r*.7,-r*1.45],[-r*.35,-r*1.05],[0,-r*1.6],[r*.35,-r*1.05],[r*.7,-r*1.45],[r*.7,-r*.75]])x.lineTo(px,py);x.closePath();x.fill();x.stroke();for(const px of [-r*.35,0,r*.35])R('#e8203c',px-2,-r*.95,4,4);}
  x.restore();}
 function drawBonus(it){const p=it.b.position,k=cam.sc,X=sx(p.x),Y=sy(p.y),r=it.s.r*k,im=img(ART['photo:item:'+it.s.item]);const gl=.5+.5*Math.sin(t*4);
  x.fillStyle=`rgba(255,216,76,${.35+gl*.3})`;x.beginPath();x.arc(X,Y,r*1.6,0,7);x.fill();if(im)x.drawImage(im,X-r*1.2,Y-r*1.2,r*2.4,r*2.4);else{x.fillStyle='#ffd84c';x.beginPath();x.arc(X,Y,r,0,7);x.fill();}}
 function draw(){x.setTransform(1,0,0,1,0,0);const sh=shake>0?(Math.random()-.5)*shake*16:0;x.translate(sh,sh*.6);
  drawBg();drawGround();
  // the last shot's path, then this one
  x.fillStyle='#ffffff66';for(let i=0;i<lastTrail.length;i+=4)x.fillRect(sx(lastTrail[i][0])-1.5,sy(lastTrail[i][1])-1.5,3,3);x.fillStyle='#ffffffcc';for(let i=0;i<trail.length;i+=3){const q=trail[i];x.beginPath();x.arc(sx(q[0]),sy(q[1]),i%2?2:3,0,7);x.fill();}
  drawSling(false);
  if(ph){for(const it of ph.items){if(it.gone)continue;const s0=it.s;if(s0.kind==='terrain'){const X=sx(s0.x-s0.w/2),Y=sy(s0.y+s0.h/2);R('#8c5c2c',X,Y,s0.w*cam.sc,s0.h*cam.sc);R('#6cbc3c',X,Y,s0.w*cam.sc,5);continue;}
    if(s0.kind==='block'||s0.kind==='tnt')drawBlock(it);}
   for(const it of ph.items)if(!it.gone&&it.s.kind==='pig')drawPig(it);for(const it of ph.items)if(!it.gone&&it.s.kind==='bonus')drawBonus(it);}
  // the birds waiting behind the sling, the one in the sling (pulled back), the ones in the air
  const q=birdQ;for(let i=birdI+(phase==='aim'?1:0),j=0;i<q.length;i++,j++){const b=q[i];drawBird(b.kind,b.item,sx(-1.6-j*1.25),sy(BIRD_R)+Math.sin(t*3+j)*2,BIRD_R,0,'normal');}
  if(phase==='aim'&&q[birdI]){const ax=aim?aim.x:0,ay=aim?aim.y:0,bx=sx(SLING.x+ax),by=sy(SLING.y+ay);if(aim)drawBands(bx,by);
   // where it will go, for the first part of the flight
   if(aim&&Math.hypot(ax,ay)>.6){const vx=-ax/PULL*VMAX,vy=-ay/PULL*VMAX;x.fillStyle='#ffffffaa';for(let k2=1;k2<10;k2++){const tt=k2*.05;x.beginPath();x.arc(sx(SLING.x+ax+vx*tt),sy(SLING.y+ay+vy*tt-11*tt*tt),3.2-k2*.2,0,7);x.fill();}}
   drawBird(q[birdI].kind,q[birdI].item,bx,by,BIRD_R,0,aim?'angry':'normal');if(!aim){x.strokeStyle='#3c1c0c';x.lineWidth=Math.max(3,cam.sc*.22);x.beginPath();x.moveTo(sx(-.55),sy(3.3));x.lineTo(sx(.7),sy(3.3));x.stroke();}}
  if(ph&&!(watchPh&&!mine()))for(const bd of ph.birds){if(bd.gone)continue;const p=bd.b.position;drawBird(bd.kind,bd.item,sx(p.x),sy(p.y),bd.r,2*Math.atan2(bd.b.quaternion.z,bd.b.quaternion.w),bd.touched?'sad':'angry');}
  if(watchPh&&!mine())for(const f of watchBirds||[])drawBird(f[4]?'egg':f[3]&&f[3]!=='head'?'item':'head',f[3],sx(f[0]),sy(f[1]),f[2],0,'angry');
  drawSling(true);
  for(const p of parts){x.fillStyle=p.c;x.globalAlpha=Math.min(1,p.life*1.5)*(p.smoke?.7:1);const s0=p.sz*cam.sc;if(p.smoke){x.beginPath();x.arc(sx(p.x),sy(p.y),s0*(1.6-p.life),0,7);x.fill();}else{x.save();x.translate(sx(p.x),sy(p.y));x.rotate(p.rot||0);x.fillRect(-s0/2,-s0/4,s0,s0/2);x.restore();}}x.globalAlpha=1;
  for(const p of popups){if(p.screen){const a=Math.min(1,(1.4-p.t)*2);x.globalAlpha=a;hudText(p.text,W/2,H*.34-p.t*20,40+p.t*10,'#ffd84c');x.globalAlpha=1;continue;}
   x.globalAlpha=Math.min(1,(1.4-p.t)*2);hudText(String(p.v),sx(p.x),sy(p.y)-p.t*40,p.big?26:16,p.big?'#ffd84c':'#ffffff');x.globalAlpha=1;}
  x.setTransform(1,0,0,1,0,0);hud();if(phase==='result')drawResult();}
 function hud(){const u=Math.min(W,H)/420,top=fb.top+4;
  // level name (left), score (right, under the Pause/Exit pills)
  small(`${E?.name||''}  ${Math.floor(levelN/LPE)+1}-${levelN%LPE+1}`,14,top+12*u,13*u,'#fff','left');
  if(nP>1)small(online&&!mine()?`WATCHING ${names[cur].toUpperCase()}`:names[cur].toUpperCase(),14,top+32*u,12*u,'#ffd84c','left');
  hudText(String(score).replace(/\B(?=(\d{3})+(?!\d))/g,','),W-14,top+40*u,30*u,'#fff','right');
  const best=solo?(progress().best[levelN]||0):nP>1&&cur===1?total[0]:0;if(best)small(nP>1?`TO BEAT ${total[0]}`:`HIGHSCORE ${best}`,W-14,top+64*u,11*u,'#fff','right');
  if(phase==='intro'){x.globalAlpha=Math.min(1,phaseT*3,(2.6-phaseT)*3);hudText(LV.boss?'BOSS LEVEL':`LEVEL ${Math.floor(levelN/LPE)+1}-${levelN%LPE+1}`,W/2,H*.3,46*u,LV.boss?'#ff6c5c':'#ffd84c');small(E.name,W/2,H*.3+36*u,16*u);x.globalAlpha=1;}
  if(phase==='aim'&&mine()&&birdI===0&&phaseT<6&&!aim){small('PULL THE HEAD BACK AND LET GO',W/2,H*.2,14*u);}
  if(phase==='fly'&&flying&&!flying.usedTap&&flying.bd.ability)small('TAP!',W/2,H*.2,20*u,'#ffd84c');}
 function star(X,Y,r,on){x.save();x.translate(X,Y);x.beginPath();for(let k=0;k<10;k++){const rr=k%2?r*.45:r,a=k*Math.PI/5-Math.PI/2;x.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}x.closePath();x.fillStyle=on?'#ffd84c':'#3c3c4c';x.fill();x.strokeStyle='#000';x.lineWidth=3;x.stroke();x.restore();}
 function drawResult(){const u=Math.min(W,H)/420,r=result;x.fillStyle=`rgba(8,12,28,${Math.min(.72,phaseT*2)})`;x.fillRect(0,0,W,H);
  const pw=Math.min(W*.86,380*u),ph2=250*u,px=(W-pw)/2,py=H*.5-ph2/2;x.fillStyle='#1c2848';x.strokeStyle='#4d8dff';x.lineWidth=3;x.beginPath();x.roundRect(px,py,pw,ph2,20*u);x.fill();x.stroke();
  hudText(r.won?'LEVEL CLEARED!':'LEVEL FAILED',W/2,py+34*u,32*u,r.won?'#ffd84c':'#ff6c5c');
  for(let k=0;k<3;k++){const on=k<r.stars&&phaseT>.4+k*.35,sz=(k===1?30:24)*u*(on&&phaseT<.6+k*.35?1.3:1);star(W/2+(k-1)*64*u,py+92*u-(k===1?10*u:0),sz,on);if(on&&!r['s'+k]){r['s'+k]=1;sfx.star(k);}}
  hudText(String(r.score).replace(/\B(?=(\d{3})+(?!\d))/g,','),W/2,py+148*u,34*u);
  if(!r.won){const hc=E&&headOf(E.pigs[0],'win',160);if(hc)x.drawImage(hc,W/2-140*u,py+110*u,64*u,64*u);small('The heads are laughing at you.',W/2,py+182*u,12*u);}
  if(solo){r.buttons=[{id:'map',x:W/2-90*u,y:py+ph2-34*u,r:22*u,label:'☰'},{id:'retry',x:W/2,y:py+ph2-34*u,r:22*u,label:'↻'},...(r.won?[{id:'next',x:W/2+90*u,y:py+ph2-34*u,r:26*u,label:'▶'}]:[{id:'quit',x:W/2+90*u,y:py+ph2-34*u,r:22*u,label:'✕'}])];
   for(const b of r.buttons){x.fillStyle=b.id==='next'?'#4cc84c':b.id==='quit'?'#c84c4c':'#4d8dff';x.beginPath();x.arc(b.x,b.y,b.r,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=2.5;x.stroke();hudText(b.label,b.x,b.y+1,b.r*1.1);}}
  else small(phaseT>.8?'TAP TO CONTINUE':'',W/2,py+ph2-26*u,13*u,'#ffffffaa');}
 function drawMap(){const u=Math.min(W,H)/420,eps=episodes(),P=progress();x.setTransform(1,0,0,1,0,0);
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0c1838');g.addColorStop(1,'#2c1c4c');x.fillStyle=g;x.fillRect(0,0,W,H);
  hudText('ANGRY HEADS',W/2,fb.top+30*u,40*u,'#ff5c4c');const allStars=Object.values(P.stars).reduce((a,b)=>a+b,0);small(`★ ${allStars}   ·   ${eps.length} worlds, ${eps.length*LPE} levels`,W/2,fb.top+60*u,12*u,'#ffd84c');
  if(online&&nf.me!==0){small(`${names[0].toUpperCase()} IS PICKING THE STAGE…`,W/2,H*.9,14*u);}
  else if(nP>1)small(`${names[0].toUpperCase()} PICKS WHERE TO START · ${LEVELS} LEVELS EACH`,W/2,H*.93,12*u,'#ffffffaa');
  const cw=cardW()-18,ch=Math.min(H*.36,cw*.72),cy=H*.24;mapCards=[];
  for(let e=Math.max(0,Math.floor(mapX)-2);e<=Math.min(eps.length-1,Math.ceil(mapX)+2);e++){const ep=eps[e],X=W/2+(e-mapX)*(cw+18)-cw/2,on=unlocked(e*LPE);mapCards.push({e,x:X,y:cy,w:cw,h:ch});
   x.save();x.beginPath();x.roundRect(X,cy,cw,ch,18*u);x.clip();const sk=SKIES[ep.realm]||SKIES.mind,gg=x.createLinearGradient(0,cy,0,cy+ch);gg.addColorStop(0,sk[0]);gg.addColorStop(1,sk[1]);x.fillStyle=gg;x.fillRect(X,cy,cw,ch);
   const la=img(ART['photo:location:'+ep.id]);if(la){const k=Math.max(cw/la.naturalWidth,ch/la.naturalHeight);x.drawImage(la,X+cw/2-la.naturalWidth*k/2,cy+ch/2-la.naturalHeight*k/2,la.naturalWidth*k,la.naturalHeight*k);}
   else{x.font=`${ch*.42}px sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(ep.icon||'',X+cw*.72,cy+ch*.42);
    // the location's heads lined up along the bottom of the card
    ep.pigs.slice(0,4).forEach((id,k)=>{const hc=headOf(id,'normal',128);if(hc)x.drawImage(hc,X+10*u+k*ch*.3,cy+ch*.5,ch*.38,ch*.38);});}
   const sh=x.createLinearGradient(0,cy+ch*.55,0,cy+ch);sh.addColorStop(0,'#0000');sh.addColorStop(1,'#000a');x.fillStyle=sh;x.fillRect(X,cy+ch*.55,cw,ch*.45);
   small(ep.name,X+14*u,cy+ch-34*u,15*u,'#fff','left');let st=0;for(let k=0;k<LPE;k++)st+=P.stars[e*LPE+k]||0;small(`${e+1}  ·  ★ ${st}/${LPE*3}`,X+14*u,cy+ch-14*u,11*u,'#ffd84c','left');
   if(!on){x.fillStyle='#000a';x.fillRect(X,cy,cw,ch);hudText('🔒',X+cw/2,cy+ch/2,40*u);}x.restore();
   x.strokeStyle=Math.round(mapX)===e?'#ffd84c':'#ffffff33';x.lineWidth=3;x.beginPath();x.roundRect(X,cy,cw,ch,18*u);x.stroke();}
  // the five levels of the episode in the middle
  const e=clamp(Math.round(mapX),0,eps.length-1),by=cy+ch+70*u;mapBubbles=[];
  for(let k=0;k<LPE;k++){const n=e*LPE+k,X=W/2+(k-2)*Math.min(70*u,W/6),open=unlocked(n),boss=k===LPE-1,r=(boss?30:24)*u,y=by+(k%2?14*u:0);
   mapBubbles.push({n,x:X,y,r,open});x.fillStyle=open?(boss?'#c8381c':'#4d8dff'):'#3c3c4c';x.beginPath();x.arc(X,y,r,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=2.5;x.stroke();
   hudText(open?(boss?'👑':String(k+1)):'🔒',X,y+1,r*.9);const st=P.stars[n]||0;for(let j=0;j<3;j++)star(X+(j-1)*13*u,y+r+12*u,6*u,j<st);}}
 s.debug={engine:'headlaunch',get phase(){return phase;},get level(){return LV;},get ph(){return ph;},get score(){return score;},total,episodes,startLevel,pick:n=>{mapResolve?.(n);mapResolve=null;},choose:id=>result?.choose?.(id),autopilot:false,
  fire:(a,sp)=>{if(phase==='aim')fire(Math.cos(a)*sp,Math.sin(a)*sp);},
  // online test bot: start the first level on the map, fire at the heads, tap through results
  bot(){if(phase==='map'&&!(online&&nf.me!==0)&&mapResolve){mapResolve(0);mapResolve=null;return 'pick';}if(!mine())return null;s.debug.autopilot=true;if(phase==='intro'){phaseT=99;return 'skip';}return null;}};
 await run();
}
Object.assign(exports,{headlaunch,angryEpisodes:episodes});
