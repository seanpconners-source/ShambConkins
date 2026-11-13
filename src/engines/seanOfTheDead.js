// SEAN OF THE DEAD (owner, Nov 13): a tower defense on Shaun of the Dead. The dead shamble up the street to THE WINCHESTER;
// you hold the pub with four fixed towers from the film (Vinyl Toss, Pool Cue Crew, The Winchester rifle, the Jukebox),
// each with 3 levels, and two heroes = the players' picked characters (drag them anywhere; they fight with cricket bats).
// The zombies wear random roster characters' faces, tinted dead-green; the last wave's boss is a locked character, and
// killing it cures them (they join the roster of whoever did the most damage to it).
// Kingdom Rush structure (fixed build spots, upgrades, blockers, call the next wave early for cash), touch first:
// tap a build spot (yours are your colour) for its ring menu; drag a hero to send them; tap the skull to call a wave.
// One phone, together: each player owns half of the spots and has their own money; kills pay whoever's tower or hero got
// them. Lose all 20 pints and the Winchester falls (both lose); survive 10 waves and you both win. Most points = top dog.
// Solo: one player, every spot, one hero. Layout is portrait (pub at the top); a wide screen gets the same map turned
// (pub on the left) with everything drawn upright.
const {fullBleed}=require("src/engines/fullBleed.js");
const {sound,tone,vibrate}=require("src/audio.js");
const {store}=require("src/state.js");
const {soloProgress}=require("src/solo.js");

const WW=360,WH=640,ROAD=21,SPOT=22;
// the street, from the spawn (below the screen) to the pub door
const PATH=[[60,690],[60,520],[300,520],[300,370],[80,370],[80,230],[270,230],[270,150],[180,150],[180,106]];
const SPOTS=[[40,445],[140,445],[220,445],[150,592],[250,592],[160,300],[240,300],[330,300],[110,172],[330,172]];
const PUB={x:66,y:0,w:228,h:106};
const DECOR=[['lamp',20,500],['lamp',340,520],['lamp',20,250],['box',340,410],['bin',115,530],['car',330,620],['hedge',110,395],['hedge',260,262],['bench',200,600],['lamp',220,175]];
const PCOL=['#4d8dff','#ff5a6a'];

const TOWERS={
 records:{name:'Vinyl Toss',icon:'💿',line:'Purple Rain? Not Purple Rain!',cost:[70,80,110],range:[95,105,118],rate:[.62,.52,.42],dmg:[6,10,15]},
 crew:{name:'Pool Cue Crew',icon:'🎱',line:'Don’t stop me now…',cost:[80,90,120],range:[60,64,70],men:[2,2,3],hp:[45,70,105],dmg:[5,8,12],rate:.8},
 rifle:{name:'The Winchester',icon:'🔫',line:'Is it real? It’s real.',cost:[100,115,150],range:[150,168,186],rate:[1.6,1.4,1.2],dmg:[28,46,72]},
 jukebox:{name:'Jukebox',icon:'🎵',line:'Turns the dead into dancers.',cost:[90,100,135],range:[70,80,90],rate:[1.2,1.1,1],dmg:[4,7,11],slow:[.35,.45,.55]}
};
const ORDER=['records','crew','rifle','jukebox'];
const ZT={
 shambler:{hp:30,sp:24,gold:4,pints:1,size:1,shirt:'#6b6f7a'},
 jogger:{hp:22,sp:42,gold:5,pints:1,size:.9,shirt:'#c9473f'},
 hivis:{hp:55,sp:20,gold:7,pints:1,size:1,shirt:'#e9d23a',armor:.4},
 fat:{hp:140,sp:15,gold:12,pints:2,size:1.35,shirt:'#4f6b3a'},
 boss:{hp:3600,sp:12,gold:100,pints:10,size:2.1,shirt:'#3a2a4a',boss:true}
};
const WAVES=[
 {shambler:8},{shambler:10,jogger:3},{shambler:12,jogger:4,hivis:2},{shambler:10,jogger:6,hivis:4,fat:1},{shambler:14,jogger:6,hivis:6,fat:2},
 {shambler:16,jogger:10,hivis:6,fat:3},{shambler:24,jogger:12,hivis:12,fat:5},{shambler:28,jogger:16,hivis:14,fat:8},{shambler:32,jogger:20,hivis:16,fat:10},
 {shambler:28,jogger:14,hivis:14,fat:8,boss:1}
];
const PINTS=20,BREAK=22;

async function seanOfTheDead(s){
 const solo=!!s.solo,np=solo?1:2;
 const [c,x]=s.canvas(390,780,{fill:true});const fb=fullBleed(s,{bg:'#14200f'});
 s.body.classList.add('drag-arena-body');
 if(!solo){s.cooperative=true;s.cooperativeLabel='HOLD THE WINCHESTER';}s.updateScores?.();
 s.hint('Tap a build spot in your colour to build: Vinyl Toss (fast), Pool Cue Crew (blocks the dead), The Winchester (long range), Jukebox (slows and hits everything near it). Tap a tower to upgrade or sell it. Drag your hero to send them somewhere. Tap the skull at the street to call the next wave early for bonus cash. Don’t let 20 zombies reach the pub.');
 const R=s.random;
 // --- faces: heroes = the players' picks; zombies = random roster characters with their own pictures
 let headOf=null;try{headOf=require("src/engines/broforce.js").headCanvas;}catch{}
 const head=(id,mood='normal',size=72)=>{try{return headOf?.(id,mood,size)||null;}catch{return null;}};
 const mine=new Set(s.players.slice(0,np).map(p=>p.character));
 let pool=[];
 try{const {CHARACTERS}=require("src/characters.js"),{portraitMoods}=require("src/assets.js");
  pool=CHARACTERS.filter(ch=>!mine.has(ch.id)&&!/^(sean|amber|loki|kc|mylo)$/.test(ch.id)).filter(ch=>{try{return portraitMoods(ch.id).length>0;}catch{return false;}}).map(ch=>ch.id);}catch{}
 const faces=[];for(let i=0;i<18&&pool.length;i++)faces.push(pool.splice(Math.floor(R()*pool.length),1)[0]);
 if(!faces.length)faces.push('shaun');
 let bossId=null;
 try{const rw=require('src/rewards.js'),{portraitMoods}=require('src/assets.js');
  const ids=[...new Set(s.players.slice(0,np).flatMap(p=>{try{return rw.gameRecruitPool(s.game,store.profile,p).map(ch=>ch.id);}catch{return [];}}))];
  const art=ids.filter(id=>{try{return portraitMoods(id).length>0;}catch{return false;}});const list=art.length?art:ids;
  if(list.length)bossId=list[Math.floor(R()*list.length)];}catch{}
 s.gameRecruits=[[],[]];
 const nameOf=id=>{try{return require("src/characters.js").character(id)?.name||id;}catch{return id;}};
 // dead-green copies of the face pictures (re-tinted when the real picture finishes loading)
 const ZH=new Map();
 function zhead(id,size=64){
  const src=head(id,'normal',size);if(!src||!src.width)return null;const k=id+':'+size;let z=ZH.get(k);if(z&&z.src===src)return z.c;
  const cc=document.createElement('canvas');cc.width=src.width;cc.height=src.height;const g=cc.getContext('2d');
  g.drawImage(src,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='rgba(70,140,60,.42)';g.fillRect(0,0,cc.width,cc.height);
  g.fillStyle='rgba(20,30,10,.18)';g.fillRect(0,cc.height*.55,cc.width,cc.height*.45);g.globalCompositeOperation='source-over';
  ZH.set(k,{src,c:cc});return cc;
 }

 // --- layout: portrait as drawn above, wide screens get it turned (x<->y) so the pub sits on the left. Picked once the
 // canvas has its real size (first frame), and again if the phone turns before anything is built.
 let heroesReady=false,wide=false,MW=WW,MH=WH,path=[],spots=[],pub=PUB,decor=[],segs=[],total=0,spawnBtn={x:0,y:0},door=[0,0],laidOut=null;
 const T=([a,b])=>wide?[b,a]:[a,b];
 function layout(w){
  wide=w;MW=wide?WH:WW;MH=wide?WW:WH;laidOut=w;
  path=PATH.map(T);spots=SPOTS.map((p,i)=>{const [sx,sy]=T(p);return {i,x:sx,y:sy,owner:solo?0:(SPOTS[i][0]<180?0:1),tower:null};});
  pub=wide?{x:PUB.y,y:PUB.x,w:PUB.h,h:PUB.w}:PUB;decor=DECOR.map(([kd,a,b])=>{const [dx,dy]=T([a,b]);return {k:kd,x:dx,y:dy};});
  segs=[];total=0;for(let i=1;i<path.length;i++){const [ax,ay]=path[i-1],[bx,by]=path[i],l=Math.hypot(bx-ax,by-ay);segs.push({ax,ay,bx,by,l,d0:total});total+=l;}
  const [bx,by]=T([100,610]);spawnBtn={x:bx,y:by};door=posAt(total);
  if(heroesReady)heroes.forEach((h,i)=>{const [hx,hy]=T([150+i*70,200]);h.x=h.tx=hx;h.y=h.ty=hy;});
 }
 const posAt=d=>{d=Math.max(0,Math.min(total,d));for(const g of segs)if(d<=g.d0+g.l){const t=(d-g.d0)/g.l;return [g.ax+(g.bx-g.ax)*t,g.ay+(g.by-g.ay)*t];}const g=segs[segs.length-1];return [g.bx,g.by];};
 const nearestD=(px,py)=>{let best=0,bd=1e9;for(const g of segs){const vx=g.bx-g.ax,vy=g.by-g.ay,t=Math.max(0,Math.min(1,((px-g.ax)*vx+(py-g.ay)*vy)/(g.l*g.l))),qx=g.ax+vx*t,qy=g.ay+vy*t,dd=Math.hypot(px-qx,py-qy);if(dd<bd){bd=dd;best=g.d0+g.l*t;}}return best;};
 const wantWide=()=>s.W>s.H*1.15;
 layout(wantWide());

 // --- view: world -> screen
 let k=1,ox=0,oy=0;
 function view(){const top=Math.max(84,fb.top+48),W=s.W,H=s.H-top;k=Math.min(W/MW,H/MH);ox=(W-MW*k)/2;oy=top+(H-MH*k)/2;}
 const SX=wx=>ox+wx*k,SY=wy=>oy+wy*k,WX=sx=>(sx-ox)/k,WY=sy=>(sy-oy)/k;

 // --- state
 let phase='intro',phaseT=0,wave=0,pints=PINTS,breakT=BREAK,speed=1,clock=0,ended=false,won=false;
 const money=[solo?220:130,130],score=[0,0],kills=[0,0],bossDmg=[0,0];
 const Z=[],SH=[],FX=[],TXT=[],DECAL=[];let queue=[],spawnT=0,nextId=1,menu=null,banner=null,shake=0;
 const heroes=s.players.slice(0,np).map((p,i)=>{const [hx,hy]=T([150+i*70,200]);return {i,owner:i,id:p.character,x:hx,y:hy,tx:hx,ty:hy,hp:120,max:120,cool:0,dead:0,face:1,target:null,walk:0,mood:'normal',moodT:0};});
 heroesReady=true;
 const living=()=>Z.filter(z=>!z.dead&&!z.gone);
 function say(text,sub,col='#ffd23a',t=2.6){banner={text,sub,col,t,max:t};}
 function pop(wx,wy,text,col='#fff'){TXT.push({x:wx,y:wy,text,col,t:1});}

 // --- waves
 function startWave(early=false){
  if(wave>=WAVES.length||phase==='wave'&&queue.length)return;
  if(early&&phase==='break'){const bonus=Math.ceil(breakT);for(let i=0;i<np;i++){money[i]+=bonus;}pop(spawnBtn.x,spawnBtn.y-20,`+£${bonus} each`,'#ffd23a');sound('pickup');}
  const w=WAVES[wave];wave++;phase='wave';const list=[];
  for(const [t,n] of Object.entries(w))for(let i=0;i<n;i++)if(t!=='boss')list.push(t);
  for(let i=list.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  if(w.boss){list.splice(Math.floor(list.length*.6),0,'boss');}
  queue=list;spawnT=.5;say(`WAVE ${wave}`,wave===WAVES.length?(bossId?`Here comes zombie ${nameOf(bossId)}!`:'The big one!'):`${list.length} of the dead`,'#ff6a5a',2);
  sound('rare');try{vibrate(30);}catch{}
 }
 function spawnZ(type){
  const t=ZT[type],hpK=(1+.42*(wave-1))*(np===2?1.4:1),hp=Math.round(t.hp*(t.boss?1:hpK)*(t.boss&&np===2?1.3:1));
  const id=t.boss&&bossId?bossId:faces[Math.floor(R()*faces.length)];
  Z.push({id:nextId++,type,t,face:id,hp,max:hp,d:0,lane:(R()-.5)*14,slow:0,slowT:0,blocker:null,bite:0,dead:0,gone:0,wob:R()*6,hitT:0,x:0,y:0});
 }

 // --- towers
 function build(sp,kind){
  const tw=TOWERS[kind],cost=tw.cost[0];if(money[sp.owner]<cost){pop(sp.x,sp.y-26,'Not enough £','#ff8a7a');sound('tap');return;}
  money[sp.owner]-=cost;sp.tower={kind,lv:0,cool:.3,spent:cost,men:[],aim:0,flash:0};
  if(kind==='crew'){const d=nearestD(sp.x,sp.y);const [rx,ry]=posAt(d);sp.tower.rally={x:rx,y:ry};}
  sound('card');pop(sp.x,sp.y-26,tw.name,'#fff');
 }
 function upgrade(sp){const t=sp.tower,tw=TOWERS[t.kind];if(t.lv>=2)return;const cost=tw.cost[t.lv+1];if(money[sp.owner]<cost){pop(sp.x,sp.y-26,'Not enough £','#ff8a7a');sound('tap');return;}
  money[sp.owner]-=cost;t.spent+=cost;t.lv++;sound('pickup');pop(sp.x,sp.y-26,'LEVEL '+(t.lv+1),'#ffd23a');for(const m of t.men){m.max=tw.hp[t.lv];m.hp=m.max;}}
 function sell(sp){const back=Math.floor(sp.tower.spent*.6);money[sp.owner]+=back;pop(sp.x,sp.y-26,`+£${back}`,'#ffd23a');sp.tower=null;sound('tap');}
 function owner(src){return src?.owner??0;}
 function hurt(z,dmg,src,phys=true){
  if(z.dead)return;const a=phys&&z.t.armor?1-z.t.armor:1;const d=dmg*a;z.hp-=d;z.hitT=.12;
  if(z.t.boss)bossDmg[owner(src)]+=d;
  if(z.hp<=0)kill(z,src);
 }
 function kill(z,src){
  z.dead=.6;const o=owner(src);money[o]+=z.t.gold;score[o]+=z.t.gold*10;kills[o]++;s.setScores?.(score.slice());
  pop(z.x,z.y-18,`+£${z.t.gold}`,'#ffd23a');DECAL.push({x:z.x,y:z.y,r:6+z.t.size*5,a:.55});if(DECAL.length>80)DECAL.shift();
  for(let i=0;i<8;i++)FX.push({x:z.x,y:z.y,vx:(Math.random()-.5)*90,vy:(Math.random()-.8)*90,t:.5,col:'#7a1010',r:2.5});
  if(z.blocker){z.blocker.foe=null;z.blocker=null;}
  try{tone(160+Math.random()*60,.08,.05,'square');}catch{}
  if(z.t.boss){shake=14;sound('win');
   if(bossId){const by=np>1&&bossDmg[1]>bossDmg[0]?1:0;if(!s.gameRecruits[by].includes(bossId))s.gameRecruits[by].push(bossId);
    say('CURED!',`${nameOf(bossId)} joins ${s.players[by].name}’s roster`,'#7dff8a',3.4);}}
 }
 function inRange(px,py,r){return living().filter(z=>Math.hypot(z.x-px,z.y-py)<=r);}
 function stepTower(sp,dt){
  const t=sp.tower,tw=TOWERS[t.kind],lv=t.lv;t.flash=Math.max(0,t.flash-dt);t.cool-=dt;
  if(t.kind==='crew'){
   while(t.men.length<tw.men[lv])t.men.push({x:sp.x,y:sp.y,hp:tw.hp[lv],max:tw.hp[lv],foe:null,cool:0,dead:0,slot:t.men.length,owner:sp.owner});
   t.men.forEach((m,j)=>{
    if(m.dead>0){m.dead-=dt;if(m.dead<=0){m.hp=m.max;m.x=sp.x;m.y=sp.y;}return;}
    const off=[[-10,-8],[10,8],[0,12]][j]||[0,0],hx=t.rally.x+off[0],hy=t.rally.y+off[1];
    if(m.foe&&(m.foe.dead||m.foe.gone)){m.foe=null;}
    if(!m.foe){const cand=inRange(t.rally.x,t.rally.y,tw.range[lv]).filter(z=>!z.blocker).sort((a,b)=>b.d-a.d)[0];if(cand){m.foe=cand;cand.blocker=m;}}
    const gx=m.foe?m.foe.x-8:hx,gy=m.foe?m.foe.y:hy,dx=gx-m.x,dy=gy-m.y,dd=Math.hypot(dx,dy);
    if(dd>2){const v=Math.min(dd,70*dt);m.x+=dx/dd*v;m.y+=dy/dd*v;}
    if(m.foe&&dd<14){m.cool-=dt;if(m.cool<=0){m.cool=tw.rate;hurt(m.foe,tw.dmg[lv],m);m.swing=.2;try{tone(320,.04,.03,'triangle');}catch{}}}
    m.swing=Math.max(0,(m.swing||0)-dt);
   });
   return;
  }
  if(t.kind==='jukebox'){
   for(const z of inRange(sp.x,sp.y,tw.range[lv])){z.slow=Math.max(z.slow,tw.slow[lv]);z.slowT=.3;}
   if(t.cool<=0){const near=inRange(sp.x,sp.y,tw.range[lv]);if(near.length){t.cool=tw.rate[lv];t.flash=.35;for(const z of near)hurt(z,tw.dmg[lv],sp,false);
     for(let i=0;i<3;i++)FX.push({x:sp.x+(Math.random()-.5)*20,y:sp.y-10,vx:(Math.random()-.5)*40,vy:-40-Math.random()*30,t:1,note:'♪♫'[i%2],col:['#ff7ad9','#7ad9ff','#ffd23a'][i]});try{tone(523+lv*60,.07,.04,'sine');setTimeout(()=>tone(659+lv*60,.07,.035,'sine'),80);}catch{}}}
   return;
  }
  if(t.cool>0)return;
  const near=inRange(sp.x,sp.y,tw.range[lv]);if(!near.length)return;
  const target=t.kind==='rifle'?near.sort((a,b)=>b.hp-a.hp)[0]:near.sort((a,b)=>b.d-a.d)[0];
  t.cool=tw.rate[lv];t.aim=Math.atan2(target.y-sp.y,target.x-sp.x);t.flash=.12;
  if(t.kind==='rifle'){hurt(target,tw.dmg[lv],sp);FX.push({line:[sp.x,sp.y-8,target.x,target.y-8],t:.12,col:'#fff6c0'});try{sound('shot');}catch{}shake=Math.max(shake,2);}
  else{SH.push({x:sp.x,y:sp.y-10,tgt:target,sp:330,dmg:tw.dmg[lv],src:sp,rot:0});try{tone(900,.03,.02,'triangle');}catch{}}
 }
 // --- heroes
 function stepHero(h,dt){
  if(h.dead>0){h.dead-=dt;if(h.dead<=0){h.hp=h.max;h.x=door[0];h.y=door[1]+(wide?0:14);h.tx=h.x;h.ty=h.y+(wide?0:30);if(wide)h.tx=h.x+30;}return;}
  h.moodT-=dt;if(h.moodT<=0)h.mood='normal';
  if(h.target&&(h.target.dead||h.target.gone||Math.hypot(h.target.x-h.x,h.target.y-h.y)>60)){if(h.target.blocker===h)h.target.blocker=null;h.target=null;}
  const moving=Math.hypot(h.tx-h.x,h.ty-h.y)>3;
  if(!h.target&&!moving){const cand=inRange(h.x,h.y,46).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];if(cand){h.target=cand;if(!cand.blocker)cand.blocker=h;}}
  let gx=h.tx,gy=h.ty;if(h.target&&!moving){gx=h.target.x+(h.x<h.target.x?-12:12);gy=h.target.y;}
  const dx=gx-h.x,dy=gy-h.y,dd=Math.hypot(dx,dy);if(dd>1.5){const v=Math.min(dd,82*dt);h.x+=dx/dd*v;h.y+=dy/dd*v;h.walk+=dt*8;if(Math.abs(dx)>1)h.face=dx>0?1:-1;}
  h.cool-=dt;if(h.target&&Math.hypot(h.target.x-h.x,h.target.y-h.y)<18&&h.cool<=0){h.cool=.7;hurt(h.target,9+wave,h);h.swing=.22;try{tone(260,.05,.04,'square');}catch{}}
  h.swing=Math.max(0,(h.swing||0)-dt);
  if(!h.target)h.hp=Math.min(h.max,h.hp+3*dt);
 }
 // --- zombies
 function stepZ(z,dt){
  if(z.dead){z.dead-=dt;if(z.dead<=0)z.gone=1;return;}
  z.slowT-=dt;if(z.slowT<=0)z.slow=0;z.hitT=Math.max(0,z.hitT-dt);z.wob+=dt*(z.t.sp/6);
  const b=z.blocker;
  if(b&&(b.dead>0||b.hp<=0||Math.hypot(b.x-z.x,b.y-z.y)>28)){if(b.foe===z)b.foe=null;if(b.target===z)b.target=null;z.blocker=null;}
  if(z.blocker){z.bite-=dt;if(z.bite<=0){z.bite=1;const dmg=z.t.boss?30:z.type==='fat'?10:5;b.hp-=dmg;if(b.mood!==undefined){b.mood='sad';b.moodT=.6;}
    if(b.hp<=0){if(b.max&&b.i!==undefined&&b.tx!==undefined){b.dead=8;b.target=null;pop(b.x,b.y-24,'DOWN!','#ff6a5a');sound('lose');}else{b.dead=8;b.foe=null;}z.blocker=null;}}}
  else z.d+=z.t.sp*(1-z.slow)*dt;
  const [px,py]=posAt(z.d);const g=segs.find(g=>z.d<=g.d0+g.l)||segs[segs.length-1],nx=-(g.by-g.ay)/g.l,ny=(g.bx-g.ax)/g.l;
  z.x=px+nx*z.lane;z.y=py+ny*z.lane;
  if(z.d>=total){z.gone=1;pints=Math.max(0,pints-z.t.pints);shake=8;try{vibrate(40);}catch{}sound('lose');pop(door[0],door[1]+20,`-${z.t.pints} 🍺`,'#ff6a5a');
   for(const h of heroes){h.mood='angry';h.moodT=1;}
   if(pints<=0)end(false);}
 }
 function end(win){if(ended)return;ended=true;won=win;phase='end';phaseT=0;
  if(win){const bonus=pints*20;for(let i=0;i<np;i++)score[i]+=bonus;say('THE WINCHESTER STANDS',`You survived! +${bonus} each for the pints left`,'#ffd23a',4);sound('win');}
  else{say('THE WINCHESTER HAS FALLEN','The dead are at the bar.','#ff5a4a',4);sound('lose');}
  for(const h of heroes){h.mood=win?'win':'sad';h.moodT=99;}
  s.setScores?.(score.slice());
 }
 function finish(){
  const total=score[0]+(np>1?score[1]:0),secs=Math.floor(clock),cleared=won?WAVES.length:Math.max(0,wave-1);
  s.teamResult={kind:'survival',won,tied:false,humanTotal:total,cpuTotal:0,cpuScores:[0,0],duration:secs};
  if(solo){soloProgress(s,score[0],cleared,`wave ${cleared}`);s.solo.won=won;}
  s.finish(np>1?score.slice():[score[0],0],`${won?'The Winchester stands!':'The Winchester fell'} · Sean of the Dead: ${cleared} of ${WAVES.length} waves · ${kills[0]+(kills[1]||0)} zombies · ${pints} pints left.`);
 }

 // --- input
 let drag=null;
 const heroAt=(wx,wy)=>heroes.filter(h=>h.dead<=0).find(h=>Math.hypot(h.x-wx,h.y-(wy+10))<30);
 function menuItems(sp){
  const r=40;if(!sp.tower)return ORDER.map((kd,j)=>{const a=-Math.PI/2+j*Math.PI/2;return {kind:kd,x:sp.x+Math.cos(a)*r,y:sp.y+Math.sin(a)*r,act:'build',cost:TOWERS[kd].cost[0]};});
  const t=sp.tower,items=[];if(t.lv<2)items.push({act:'up',x:sp.x,y:sp.y-r,cost:TOWERS[t.kind].cost[t.lv+1]});items.push({act:'sell',x:sp.x,y:sp.y+r,cost:-Math.floor(t.spent*.6)});return items;
 }
 s.on(c,'pointerdown',ev=>{ev.preventDefault();const p=s.pointer(ev),wx=WX(p.x),wy=WY(p.y);
  if(phase==='intro'){phase='break';breakT=BREAK;return;}
  if(phase==='end')return;
  if(p.x<62&&p.y<fb.top+40&&p.y>4){speed=speed===1?2:1;sound('tap');return;}
  if(menu){const it=menuItems(menu).find(m=>Math.hypot(m.x-wx,m.y-wy)<20);const sp=menu;menu=null;
   if(it){if(it.act==='build')build(sp,it.kind);else if(it.act==='up')upgrade(sp);else sell(sp);}return;}
  const h=heroAt(wx,wy);if(h){drag={h,id:ev.pointerId,sx:wx,sy:wy,moved:false};h.target=null;return;}
  if(Math.hypot(wx-spawnBtn.x,wy-spawnBtn.y)<26&&(phase==='break'||phase==='wave'&&!queue.length)&&wave<WAVES.length){startWave(phase==='break');return;}
  const sp=spots.find(q=>Math.hypot(q.x-wx,q.y-wy)<SPOT+4);if(sp){menu=sp;sound('tap');return;}
  // tap empty ground: send the nearest hero (solo: your hero)
  const near=heroes.filter(q=>q.dead<=0).sort((a,b)=>Math.hypot(a.x-wx,a.y-wy)-Math.hypot(b.x-wx,b.y-wy))[0];
  if(near&&wx>=0&&wy>=0&&wx<=MW&&wy<=MH){near.tx=wx;near.ty=wy;near.target=null;FX.push({ring:[wx,wy],t:.5,col:PCOL[near.i]});}
 });
 s.on(c,'pointermove',ev=>{if(!drag||ev.pointerId!==drag.id)return;const p=s.pointer(ev);drag.cx=WX(p.x);drag.cy=WY(p.y);if(Math.hypot(drag.cx-drag.sx,drag.cy-drag.sy)>8)drag.moved=true;});
 const up=ev=>{if(!drag||ev.pointerId!==drag.id)return;const d=drag;drag=null;if(d.moved){d.h.tx=Math.max(8,Math.min(MW-8,d.cx));d.h.ty=Math.max(8,Math.min(MH-8,d.cy));d.h.target=null;FX.push({ring:[d.h.tx,d.h.ty],t:.5,col:PCOL[d.h.i]});sound('tap');}};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',up);
 s.on(window,'keydown',ev=>{if(ev.key===' '||ev.key==='Enter'){if(phase==='intro'){phase='break';return;}if(phase==='break')startWave(true);}});

 // --- drawing
 function road(){
  x.lineCap='round';x.lineJoin='round';
  const line=(w,col)=>{x.strokeStyle=col;x.lineWidth=w*k;x.beginPath();path.forEach(([a,b],i)=>i?x.lineTo(SX(a),SY(b)):x.moveTo(SX(a),SY(b)));x.stroke();};
  line(ROAD*2+12,'#8a8a82');line(ROAD*2+6,'#5c5c58');line(ROAD*2,'#3b3b3e');
  x.setLineDash([9*k,10*k]);line(1.6,'#d8d4c4');x.setLineDash([]);
 }
 function drawPub(){
  const px=SX(pub.x),py=SY(pub.y),pw=pub.w*k,ph=pub.h*k;
  // building (front facing down on a tall screen, the door on its right side on a wide one)
  x.fillStyle='#2a1a14';x.fillRect(px,py-40*k,pw,ph+40*k);
  x.fillStyle='#5a2a22';x.fillRect(px+3*k,py,pw-6*k,ph-4*k);
  // roof edge + chimneys
  x.fillStyle='#1c1210';x.fillRect(px-4*k,py-6*k,pw+8*k,8*k);
  // sign board
  const sw=wide?ph*.9:pw*.86,sh=22*k,sx0=wide?px+(pw-Math.min(pw*.9,sw))/2:px+(pw-sw)/2,sy0=py+8*k,swd=wide?Math.min(pw*.94,sw):sw;
  x.fillStyle='#5b0f14';x.fillRect(sx0,sy0,swd,sh);x.strokeStyle='#c8a24a';x.lineWidth=2*k;x.strokeRect(sx0+2*k,sy0+2*k,swd-4*k,sh-4*k);
  x.fillStyle='#f2d27a';x.textAlign='center';x.textBaseline='middle';let fs=Math.round(15*k);x.font=`900 ${fs}px Georgia,serif`;
  while(x.measureText('THE WINCHESTER').width>swd-10*k&&fs>6){fs--;x.font=`900 ${fs}px Georgia,serif`;}
  x.fillText('THE WINCHESTER',sx0+swd/2,sy0+sh/2+1);
  // windows with warm light
  const nw=wide?3:4,wh0=wide?(ph-sh-60*k)/3-8*k:Math.max(10*k,ph-sh-38*k);
  for(let i=0;i<nw;i++){const ww=wide?pw*.56:pw/6,wx=wide?px+pw*.14:px+pw*(.08+i*.24)+(i>1?pw*.06:0),wy=sy0+sh+8*k+(wide?i*(wh0+8*k):0),wh=wh0;if(!wide&&i===2)continue;
   const gl=x.createLinearGradient(0,wy,0,wy+wh);gl.addColorStop(0,'#ffcf6a');gl.addColorStop(1,'#c9772a');x.fillStyle=gl;x.fillRect(wx,wy,ww,wh);x.strokeStyle='#1c1210';x.lineWidth=2*k;x.strokeRect(wx,wy,ww,wh);
   x.beginPath();x.moveTo(wx+ww/2,wy);x.lineTo(wx+ww/2,wy+wh);x.moveTo(wx,wy+wh/2);x.lineTo(wx+ww,wy+wh/2);x.stroke();}
  // the rifle over the bar door
  const [dx,dy]=door;x.save();x.translate(SX(dx),wide?SY(dy)-22*k:py+ph-38*k);if(wide)x.translate(-pw*.3,0);x.strokeStyle='#3a2410';x.lineWidth=3*k;x.beginPath();x.moveTo(-16*k,0);x.lineTo(16*k,0);x.stroke();x.strokeStyle='#888';x.lineWidth=1.5*k;x.beginPath();x.moveTo(-2*k,-1*k);x.lineTo(18*k,-1*k);x.stroke();x.restore();
  // door
  x.fillStyle='#1a0e08';if(wide)x.fillRect(px+pw-10*k,SY(dy)-14*k,10*k,28*k);else x.fillRect(SX(dx)-14*k,py+ph-30*k,28*k,30*k);
  x.fillStyle='#c8a24a';if(!wide)x.fillRect(SX(dx)+8*k,py+ph-16*k,3*k,3*k);
  // hanging pub sign (swings)
  const hx=wide?px+pw+14*k:px+pw-26*k,hy=wide?py+ph*.18:py+ph-18*k,sw2=Math.sin(clock*1.6)*.12;
  x.save();x.translate(hx,hy);x.strokeStyle='#222';x.lineWidth=2*k;x.beginPath();x.moveTo(-10*k,-14*k);x.lineTo(10*k,-14*k);x.stroke();x.rotate(sw2);
  x.fillStyle='#5b0f14';x.beginPath();x.ellipse(0,0,12*k,10*k,0,0,7);x.fill();x.strokeStyle='#c8a24a';x.stroke();x.fillStyle='#f2d27a';x.font=`900 ${Math.round(11*k)}px Georgia,serif`;x.fillText('W',0,1);x.restore();
  // pint count above the door
  x.font=`800 ${Math.round(12*k)}px system-ui,sans-serif`;x.fillStyle=pints<6?'#ff8a7a':'#fff';x.fillText(`🍺 ${pints}`,wide?px+pw/2:SX(dx),wide?py+ph-14*k:py+ph+12*k);
 }
 function drawDecor(d){
  const X=SX(d.x),Y=SY(d.y);
  if(d.k==='lamp'){x.fillStyle='#222';x.fillRect(X-1.5*k,Y-26*k,3*k,26*k);const g=x.createRadialGradient(X,Y-26*k,1,X,Y-26*k,26*k);g.addColorStop(0,'rgba(255,220,140,.5)');g.addColorStop(1,'rgba(255,220,140,0)');x.fillStyle=g;x.beginPath();x.arc(X,Y-26*k,26*k,0,7);x.fill();x.fillStyle='#ffe2a0';x.beginPath();x.arc(X,Y-26*k,3*k,0,7);x.fill();}
  else if(d.k==='box'){x.fillStyle='#c4121a';x.fillRect(X-7*k,Y-28*k,14*k,28*k);x.fillStyle='#ffd9b0';x.fillRect(X-5*k,Y-24*k,10*k,14*k);x.strokeStyle='#7a0a0f';x.lineWidth=1*k;x.strokeRect(X-7*k,Y-28*k,14*k,28*k);}
  else if(d.k==='bin'){x.fillStyle='#2d3a2d';x.fillRect(X-6*k,Y-12*k,12*k,12*k);x.fillStyle='#1d261d';x.fillRect(X-7*k,Y-14*k,14*k,3*k);}
  else if(d.k==='car'){x.fillStyle='#8a1a1a';x.beginPath();x.roundRect?.(X-18*k,Y-9*k,36*k,18*k,5*k);x.fill();x.fillStyle='#bcd7e8';x.fillRect(X-8*k,Y-7*k,10*k,14*k);}
  else if(d.k==='hedge'){x.fillStyle='#21401c';x.beginPath();x.ellipse(X,Y,26*k,9*k,0,0,7);x.fill();x.fillStyle='#2c5524';x.beginPath();x.ellipse(X-4*k,Y-2*k,20*k,6*k,0,0,7);x.fill();}
  else if(d.k==='bench'){x.fillStyle='#6a4a2a';x.fillRect(X-14*k,Y-4*k,28*k,5*k);x.fillRect(X-14*k,Y-10*k,28*k,3*k);}
 }
 function body(X,Y,sc,shirt,walk,hit,arms){
  const lg=Math.sin(walk)*4*sc;x.strokeStyle='#232323';x.lineWidth=3*sc;x.beginPath();x.moveTo(X-3*sc,Y);x.lineTo(X-3*sc+lg,Y+9*sc);x.moveTo(X+3*sc,Y);x.lineTo(X+3*sc-lg,Y+9*sc);x.stroke();
  x.fillStyle=hit?'#fff':shirt;x.beginPath();x.roundRect?x.roundRect(X-7*sc,Y-14*sc,14*sc,15*sc,3*sc):x.rect(X-7*sc,Y-14*sc,14*sc,15*sc);x.fill();
  if(arms){x.strokeStyle=hit?'#fff':'#7d9a62';x.lineWidth=2.6*sc;x.beginPath();x.moveTo(X-5*sc,Y-11*sc);x.lineTo(X-5*sc+arms*9*sc,Y-12*sc);x.moveTo(X+5*sc,Y-11*sc);x.lineTo(X+5*sc+arms*9*sc,Y-10*sc);x.stroke();}
 }
 function drawZ(z){
  const X=SX(z.x),Y=SY(z.y),sc=k*z.t.size*.9,dir=1;const al=z.dead?Math.max(0,z.dead/.6):1;x.globalAlpha=al;
  x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(X,Y+9*sc,8*sc,3*sc,0,0,7);x.fill();
  body(X,Y-2*sc+Math.sin(z.wob)*1*sc,sc,z.t.shirt,z.wob,z.hitT>0,dir);
  if(z.type==='hivis'){x.fillStyle='#f0f0f0';x.fillRect(X-7*sc,Y-9*sc,14*sc,2*sc);}
  const hs=(z.t.boss?46:25*Math.max(1,z.t.size*.9))*k,hc=zhead(z.face,z.t.boss?96:64);
  if(hc){x.drawImage(hc,X-hs/2,Y-14*sc-hs*.82,hs,hs);}else{x.fillStyle='#7d9a62';x.beginPath();x.arc(X,Y-20*sc,7*sc,0,7);x.fill();}
  if(z.slow>0){x.fillStyle='#ff7ad9';x.font=`${Math.round(9*k)}px sans-serif`;x.fillText('♪',X+10*sc,Y-24*sc);}
  if(!z.dead&&z.hp<z.max){const w=18*sc;x.fillStyle='#000a';x.fillRect(X-w/2,Y-16*sc-hs,w,3*k);x.fillStyle=z.t.boss?'#c45aff':'#e33';x.fillRect(X-w/2,Y-16*sc-hs,w*Math.max(0,z.hp/z.max),3*k);}
  x.globalAlpha=1;
 }
 function drawMan(m,col){
  if(m.dead>0)return;const X=SX(m.x),Y=SY(m.y),sc=k*.75;
  body(X,Y,sc,col,clock*6,false,0);x.fillStyle='#e8c09a';x.beginPath();x.arc(X,Y-19*sc,5*sc,0,7);x.fill();
  x.strokeStyle='#d8c08a';x.lineWidth=2*sc;x.beginPath();const a=m.swing>0?-1.2:.4;x.moveTo(X+5*sc,Y-10*sc);x.lineTo(X+5*sc+Math.cos(a)*18*sc,Y-10*sc+Math.sin(a)*18*sc);x.stroke();
  if(m.hp<m.max){x.fillStyle='#000a';x.fillRect(X-8*sc,Y-30*sc,16*sc,2.5*k);x.fillStyle='#5fd35f';x.fillRect(X-8*sc,Y-30*sc,16*sc*m.hp/m.max,2.5*k);}
 }
 function drawHero(h){
  if(h.dead>0){const X=SX(door[0]),Y=SY(door[1])+(wide?0:22*k);x.fillStyle='#fff';x.font=`800 ${Math.round(11*k)}px system-ui`;x.fillText(`${s.players[h.i].name} back in ${Math.ceil(h.dead)}`,X+(wide?60*k:0),Y+(wide?0:10*k));return;}
  const X=SX(h.x),Y=SY(h.y),sc=k*1.05;
  x.fillStyle=PCOL[h.i]+'55';x.beginPath();x.ellipse(X,Y+10*sc,12*sc,4.5*sc,0,0,7);x.fill();x.strokeStyle=PCOL[h.i];x.lineWidth=2;x.stroke();
  body(X,Y,sc,PCOL[h.i],h.walk,false,0);
  // cricket bat
  x.save();x.translate(X+6*sc*h.face,Y-10*sc);x.rotate((h.swing>0?-1.4:.5)*h.face);x.fillStyle='#e8d6a4';x.fillRect(-1.5*sc,0,3*sc,6*sc);x.fillRect(-3*sc,6*sc,6*sc,16*sc);x.restore();
  const hc=head(h.id,h.mood,96),hs=30*sc;if(hc&&hc.width){x.save();if(h.face<0){x.translate(X,0);x.scale(-1,1);x.translate(-X,0);}x.drawImage(hc,X-hs/2,Y-14*sc-hs*.8,hs,hs);x.restore();}
  if(h.hp<h.max){x.fillStyle='#000a';x.fillRect(X-12*sc,Y-16*sc-hs,24*sc,3*k);x.fillStyle='#5fd35f';x.fillRect(X-12*sc,Y-16*sc-hs,24*sc*h.hp/h.max,3*k);}
 }
 function drawSpot(sp){
  const X=SX(sp.x),Y=SY(sp.y),r=SPOT*k,col=PCOL[sp.owner];
  if(!sp.tower){x.fillStyle='rgba(30,22,14,.75)';x.beginPath();x.arc(X,Y,r,0,7);x.fill();x.strokeStyle=col;x.lineWidth=2;x.setLineDash([4,4]);x.stroke();x.setLineDash([]);
   x.fillStyle=col;x.font=`900 ${Math.round(14*k)}px system-ui`;x.fillText('+',X,Y+1);return;}
  const t=sp.tower,lv=t.lv;
  x.fillStyle='#3a2a1c';x.beginPath();x.arc(X,Y,r,0,7);x.fill();x.strokeStyle=col;x.lineWidth=2.5;x.stroke();
  for(let i=0;i<=lv;i++){x.fillStyle='#ffd23a';x.beginPath();x.arc(X-8*k+i*8*k,Y+r-4*k,2.2*k,0,7);x.fill();}
  if(t.kind==='records'){x.save();x.translate(X,Y-4*k);x.rotate(clock*2);x.fillStyle='#111';x.beginPath();x.arc(0,0,12*k,0,7);x.fill();x.fillStyle='#c4121a';x.beginPath();x.arc(0,0,4*k,0,7);x.fill();x.strokeStyle='#333';x.beginPath();x.arc(0,0,8*k,0,7);x.stroke();x.restore();}
  else if(t.kind==='crew'){x.fillStyle='#2d6a3a';x.fillRect(X-12*k,Y-12*k,24*k,14*k);x.strokeStyle='#6a4a2a';x.lineWidth=2*k;x.strokeRect(X-12*k,Y-12*k,24*k,14*k);x.fillStyle='#fff';x.beginPath();x.arc(X-4*k,Y-5*k,2.5*k,0,7);x.fill();x.fillStyle='#ffd23a';x.beginPath();x.arc(X+4*k,Y-6*k,2.5*k,0,7);x.fill();}
  else if(t.kind==='rifle'){x.save();x.translate(X,Y-4*k);x.rotate(t.aim);x.fillStyle='#5a3a1c';x.fillRect(-8*k,-2.5*k,12*k,5*k);x.fillStyle='#999';x.fillRect(2*k,-1.2*k,16*k,2.4*k);if(t.flash>0){x.fillStyle='#ffe28a';x.beginPath();x.arc(20*k,0,4*k,0,7);x.fill();}x.restore();}
  else if(t.kind==='jukebox'){const g=t.flash>0?1:.4;x.fillStyle='#6a2a7a';x.beginPath();x.roundRect?x.roundRect(X-11*k,Y-16*k,22*k,22*k,[10*k,10*k,2*k,2*k]):x.rect(X-11*k,Y-16*k,22*k,22*k);x.fill();
   x.fillStyle=`rgba(255,200,90,${g})`;x.beginPath();x.arc(X,Y-7*k,6*k,0,7);x.fill();x.fillStyle=`rgba(122,217,255,${g})`;x.fillRect(X-8*k,Y,16*k,3*k);
   if(t.flash>0){x.strokeStyle='rgba(255,122,217,.5)';x.lineWidth=2;x.beginPath();x.arc(X,Y,TOWERS.jukebox.range[lv]*k*(1-t.flash/.35),0,7);x.stroke();}}
 }
 function drawMenu(sp){
  const X=SX(sp.x),Y=SY(sp.y),col=PCOL[sp.owner];
  const rr=sp.tower?(TOWERS[sp.tower.kind].range[sp.tower.lv]):0;if(rr){x.strokeStyle=col+'aa';x.fillStyle=col+'18';x.lineWidth=1.5;x.beginPath();x.arc(X,Y,rr*k,0,7);x.fill();x.stroke();}
  x.strokeStyle=col;x.lineWidth=2;x.beginPath();x.arc(X,Y,40*k,0,7);x.stroke();
  for(const it of menuItems(sp)){const MX=SX(it.x),MY=SY(it.y),afford=it.cost<0||money[sp.owner]>=it.cost;
   x.fillStyle=afford?'#1b1420':'#3a3a3a';x.beginPath();x.arc(MX,MY,17*k,0,7);x.fill();x.strokeStyle=afford?'#ffd23a':'#777';x.lineWidth=2;x.stroke();
   x.font=`${Math.round(15*k)}px system-ui`;x.fillStyle='#fff';x.fillText(it.act==='build'?TOWERS[it.kind].icon:it.act==='up'?'⬆️':'💰',MX,MY-1*k);
   x.font=`800 ${Math.round(10*k)}px system-ui`;x.fillStyle=afford?'#ffd23a':'#bbb';x.fillText(it.cost<0?`+£${-it.cost}`:`£${it.cost}`,MX,MY+24*k);}
  const label=sp.tower?`${TOWERS[sp.tower.kind].name} · level ${sp.tower.lv+1}`:'Build';x.font=`800 ${Math.round(11*k)}px system-ui`;x.fillStyle='#fff';x.fillText(label,X,Y-64*k);
 }
 function hud(){
  const top=4,H=34;x.textBaseline='middle';x.textAlign='left';
  x.fillStyle='#000a';x.beginPath();x.roundRect?x.roundRect(6,top,56,H,10):x.rect(6,top,56,H);x.fill();x.fillStyle='#fff';x.font='800 15px system-ui';x.fillText(speed===2?'⏩ 2x':'▶ 1x',13,top+H/2);
  x.fillStyle='#000a';const wtxt=`WAVE ${wave}/${WAVES.length}`;x.font='900 14px system-ui';const ww=x.measureText(wtxt).width+20;x.beginPath();x.roundRect?x.roundRect(68,top,ww,H,10):x.rect(68,top,ww,H);x.fill();x.fillStyle='#ffd23a';x.fillText(wtxt,78,top+H/2);
  // second row: each player's money (P1 left, P2 right), clear of the Pause/Exit pills
  const y2=top+H+6;
  for(let i=0;i<np;i++){const t=`£${money[i]}`;x.font='900 14px system-ui';const w=x.measureText(t).width+44,px=i===0?6:s.W-6-w;
   x.fillStyle='#000a';x.beginPath();x.roundRect?x.roundRect(px,y2,w,H,10):x.rect(px,y2,w,H);x.fill();x.strokeStyle=PCOL[i];x.lineWidth=2;x.stroke();
   const hc=head(s.players[i].character,'normal',64);if(hc&&hc.width)x.drawImage(hc,px+4,y2+3,28,28);x.fillStyle='#fff';x.textAlign='left';x.fillText(t,px+34,y2+H/2);}
  x.textAlign='center';
 }
 function drawSpawn(){
  const X=SX(spawnBtn.x),Y=SY(spawnBtn.y),can=(phase==='break'||phase==='wave'&&!queue.length)&&wave<WAVES.length;if(!can)return;
  const pulse=1+Math.sin(clock*5)*.08,r=20*k*pulse;x.fillStyle='rgba(150,20,20,.85)';x.beginPath();x.arc(X,Y,r,0,7);x.fill();x.strokeStyle='#ffd23a';x.lineWidth=2;x.stroke();
  if(phase==='break'){x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(X,Y,r+3,-Math.PI/2,-Math.PI/2+Math.PI*2*(breakT/BREAK));x.stroke();}
  x.font=`${Math.round(18*k)}px system-ui`;x.fillStyle='#fff';x.fillText('💀',X,Y+1);x.font=`800 ${Math.round(10*k)}px system-ui`;x.fillText(phase==='break'?(wave?`NEXT WAVE · +£${Math.ceil(breakT)}`:'START'):'NEXT',X,Y+r+10*k);
 }
 function draw(){
  view();const W=s.W,H=s.H;
  x.save();if(shake>0){x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);}
  // grass + pavement texture
  const gg=x.createLinearGradient(0,0,0,H);gg.addColorStop(0,'#24361c');gg.addColorStop(1,'#1a2a14');x.fillStyle=gg;x.fillRect(-20,-20,W+40,H+40);
  x.fillStyle='rgba(255,255,255,.03)';for(let i=0;i<40;i++){const gx=(i*97)%Math.max(1,W),gy=(i*173)%Math.max(1,H);x.fillRect(gx,gy,2,2);}
  road();
  for(const d of DECAL){x.fillStyle=`rgba(90,8,8,${d.a})`;x.beginPath();x.ellipse(SX(d.x),SY(d.y)+6*k,d.r*k,d.r*.5*k,0,0,7);x.fill();}
  x.textAlign='center';x.textBaseline='middle';
  for(const d of decor)drawDecor(d);
  drawPub();
  for(const sp of spots)drawSpot(sp);
  drawSpawn();
  // things sorted by depth
  const things=[...Z.filter(z=>!z.gone).map(z=>({y:z.y,f:()=>drawZ(z)})),...heroes.map(h=>({y:h.y,f:()=>drawHero(h)}))];
  for(const sp of spots)if(sp.tower?.kind==='crew')for(const m of sp.tower.men)things.push({y:m.y,f:()=>drawMan(m,PCOL[sp.owner])});
  things.sort((a,b)=>a.y-b.y).forEach(o=>o.f());
  for(const p of SH){x.save();x.translate(SX(p.x),SY(p.y));x.rotate(p.rot);x.fillStyle='#111';x.beginPath();x.arc(0,0,5*k,0,7);x.fill();x.fillStyle='#c4121a';x.beginPath();x.arc(0,0,1.8*k,0,7);x.fill();x.restore();}
  for(const f of FX){
   if(f.line){x.strokeStyle=f.col;x.globalAlpha=f.t/.12;x.lineWidth=2;x.beginPath();x.moveTo(SX(f.line[0]),SY(f.line[1]));x.lineTo(SX(f.line[2]),SY(f.line[3]));x.stroke();x.globalAlpha=1;}
   else if(f.ring){x.strokeStyle=f.col;x.globalAlpha=f.t/.5;x.lineWidth=2;x.beginPath();x.arc(SX(f.ring[0]),SY(f.ring[1]),(1-f.t/.5)*16*k+4,0,7);x.stroke();x.globalAlpha=1;}
   else if(f.note){x.globalAlpha=Math.min(1,f.t);x.fillStyle=f.col;x.font=`${Math.round(12*k)}px sans-serif`;x.fillText(f.note,SX(f.x),SY(f.y));x.globalAlpha=1;}
   else{x.fillStyle=f.col;x.beginPath();x.arc(SX(f.x),SY(f.y),f.r*k,0,7);x.fill();}}
  for(const t of TXT){x.globalAlpha=Math.min(1,t.t*2);x.font=`900 ${Math.round(12*k)}px system-ui`;x.fillStyle='#000';x.fillText(t.text,SX(t.x)+1,SY(t.y)+1);x.fillStyle=t.col;x.fillText(t.text,SX(t.x),SY(t.y));x.globalAlpha=1;}
  if(menu)drawMenu(menu);
  if(drag?.moved){x.strokeStyle=PCOL[drag.h.i];x.setLineDash([5,5]);x.lineWidth=2;x.beginPath();x.moveTo(SX(drag.h.x),SY(drag.h.y));x.lineTo(SX(drag.cx),SY(drag.cy));x.stroke();x.setLineDash([]);}
  x.restore();
  hud();
  if(banner){const a=Math.min(1,banner.t*2,(banner.max-banner.t)*4+.2);x.globalAlpha=Math.max(0,a);x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,H*.38,W,H*.14);
   x.fillStyle=banner.col;let fs=Math.min(40,W/12);x.font=`900 ${fs}px Georgia,serif`;while(x.measureText(banner.text).width>W-20&&fs>12){fs--;x.font=`900 ${fs}px Georgia,serif`;}x.fillText(banner.text,W/2,H*.43);
   if(banner.sub){x.fillStyle='#fff';x.font=`700 ${Math.min(16,W/26)}px system-ui`;x.fillText(banner.sub,W/2,H*.485);}x.globalAlpha=1;}
  if(phase==='intro')drawIntro();
 }
 function drawIntro(){
  const W=s.W,H=s.H;x.fillStyle='rgba(8,10,6,.82)';x.fillRect(0,0,W,H);
  let fs=Math.min(64,W/7.5);x.font=`900 ${fs}px Georgia,serif`;x.fillStyle='#c4121a';x.strokeStyle='#000';x.lineWidth=6;
  x.strokeText('SEAN',W/2,H*.3);x.fillText('SEAN',W/2,H*.3);x.font=`900 ${fs*.45}px Georgia,serif`;x.fillStyle='#e8e0c8';x.fillText('OF THE',W/2,H*.3+fs*.62);x.font=`900 ${fs}px Georgia,serif`;x.fillStyle='#c4121a';x.strokeText('DEAD',W/2,H*.3+fs*1.25);x.fillText('DEAD',W/2,H*.3+fs*1.25);
  x.fillStyle='#f2d27a';let sf=Math.min(20,W/20);x.font=`800 ${sf}px system-ui`;while(x.measureText('Hold the Winchester. 10 waves of the dead.').width>W-24&&sf>9){sf--;x.font=`800 ${sf}px system-ui`;}x.fillText('Hold the Winchester. 10 waves of the dead.',W/2,H*.3+fs*2);
  x.fillStyle='#ccc';x.font=`italic ${Math.min(15,W/30)}px Georgia,serif`;x.fillText('“Go to the Winchester, have a nice cold pint,',W/2,H*.3+fs*2.6);x.fillText('and wait for all of this to blow over.”',W/2,H*.3+fs*2.6+20);
  const fy=H*.72,fsz=Math.min(90,W*.2);heroes.forEach((h,i)=>{const X=np===1?W/2:W/2+(i?1:-1)*fsz*.75;const hc=head(h.id,'win',128);if(hc&&hc.width)x.drawImage(hc,X-fsz/2,fy-fsz/2,fsz,fsz);x.fillStyle=PCOL[i];x.font='800 14px system-ui';x.fillText(s.players[i].name,X,fy+fsz/2+12);});
  x.fillStyle='#fff';x.globalAlpha=.6+.4*Math.sin(clock*4);x.font='800 16px system-ui';x.fillText('TAP TO START',W/2,H*.92);x.globalAlpha=1;
 }

 // --- tests / autopilot
 let bot=false,botT=0;
 function botStep(dt){botT-=dt;if(botT>0)return;botT=.4;
  for(let i=0;i<np;i++){const mineS=spots.filter(sp=>sp.owner===i);const empty=mineS.filter(sp=>!sp.tower);
   if(empty.length){const kd=ORDER[Math.floor(Math.random()*ORDER.length)];if(money[i]>=TOWERS[kd].cost[0])build(empty[Math.floor(Math.random()*empty.length)],kd);}
   else{const up=mineS.filter(sp=>sp.tower.lv<2&&money[i]>=TOWERS[sp.tower.kind].cost[sp.tower.lv+1]);if(up.length)upgrade(up[0]);}}
  if(phase==='intro'){phase='break';}if(phase==='break'&&breakT<BREAK-3)startWave(true);
  for(const h of heroes){const z=living().sort((a,b)=>b.d-a.d)[0];if(z&&h.dead<=0&&!h.target){h.tx=z.x;h.ty=z.y;}}
 }
 s.debug={get bot(){return bot;},set bot(v){bot=!!v;},
  state:()=>({phase,wave,pints,money:money.slice(0,np),score:score.slice(0,np),towers:spots.filter(q=>q.tower).length,zombies:living().length,wide,bossId,faces:faces.length,menu:!!menu}),
  build:(i,kind)=>build(spots[i],kind),upgrade:i=>upgrade(spots[i]),startWave:()=>{if(phase==='intro')phase='break';startWave(true);},
  speed:v=>{speed=v;},win:()=>{wave=WAVES.length;queue=[];for(const z of living())z.gone=1;end(true);},lose:()=>{pints=0;end(false);},spots:()=>spots.map(q=>({x:SX(q.x),y:SY(q.y),owner:q.owner,tower:q.tower?.kind||null}))};

 // --- loop
 await new Promise(resolve=>{
  s.frame(dt=>{
   if(!s.alive){resolve();return;}
   clock+=dt;const sdt=dt*speed;
   if(wantWide()!==laidOut&&wave===0&&!spots.some(q=>q.tower)){menu=null;layout(wantWide());}
   if(bot)botStep(sdt);
   if(banner){banner.t-=dt;if(banner.t<=0)banner=null;}
   shake=Math.max(0,shake-dt*30);
   if(phase==='break'){breakT-=sdt;if(breakT<=0)startWave(false);}
   if(phase==='wave'||phase==='break'){
    if(queue.length){spawnT-=sdt;if(spawnT<=0){spawnZ(queue.shift());spawnT=queue[0]==='boss'?2:.7+R()*.35;}}
    for(const z of Z)stepZ(z,sdt);
    for(const sp of spots)if(sp.tower)stepTower(sp,sdt);
    for(const h of heroes)stepHero(h,sdt);
    for(let i=SH.length-1;i>=0;i--){const p=SH[i],t=p.tgt;if(t.dead||t.gone){SH.splice(i,1);continue;}const dx=t.x-p.x,dy=(t.y-10)-p.y,dd=Math.hypot(dx,dy);p.rot+=sdt*20;
     if(dd<8){hurt(t,p.dmg,p.src);SH.splice(i,1);continue;}const v=p.sp*sdt;p.x+=dx/dd*v;p.y+=dy/dd*v;}
    for(let i=Z.length-1;i>=0;i--)if(Z[i].gone)Z.splice(i,1);
    if(phase==='wave'&&!queue.length&&!living().length&&!Z.some(z=>z.dead)&&!ended){
     if(wave>=WAVES.length)end(true);
     else{phase='break';breakT=BREAK;if(solo)soloProgress(s,score[0],wave,`wave ${wave}`);for(let i=0;i<np;i++)money[i]+=20;say(`WAVE ${wave} CLEARED`,`+£20 each · ${WAVES.length-wave} to go`,'#7dff8a',2.2);sound('pickup');}}
   }
   if(phase==='end'){phaseT+=dt;for(const z of Z)if(z.dead)stepZ(z,dt);if(phaseT>3.6&&s.alive){phase='done';finish();resolve();}}
   for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.t-=dt;if(f.vx!==undefined){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=(f.note?0:200)*dt;}if(f.t<=0)FX.splice(i,1);}
   for(let i=TXT.length-1;i>=0;i--){const t=TXT[i];t.t-=dt;t.y-=18*dt;if(t.t<=0)TXT.splice(i,1);}
   for(const d of DECAL)d.a=Math.max(.18,d.a-dt*.01);
   draw();
  });
 });
}
Object.assign(exports,{seanOfTheDead});
