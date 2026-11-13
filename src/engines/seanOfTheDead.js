// SEAN OF THE DEAD 2.0 (owner, Nov 13: "badass towers with super powered upgrade paths... make this fun as shit").
// A Kingdom Rush style tower defense at THE WINCHESTER: the dead come up the street, you hold the pub.
//  - Six tower lines (src/engines/sotd/data.js): tiers 1-3, then pick one of two apex paths (tier 4) and max it (tier 5).
//    Tap a build spot (yours are your colour) → pick a tower → its card says what it does → BUILD. Tap a tower for its card.
//  - Heroes = the players' picked characters (bigger now, no tint): tap one to select it, then tap the road to send it;
//    or drag it. They level up from kills, have a SMASH special (bottom-right buttons) and a weapon path in their card:
//    cricket bat → Lucille → chainsaw → boomstick + chainsaw.
//  - Tap the pub for its upgrades (barricades, a lock-in shotgun, a bar tab). Powers bottom-left: the Dawn of the Dead
//    armoured bus and a petrol strike.
//  - Zombies wear random roster faces; runners, crawlers, riot armour, bloaters (burst into crawlers), screamers (speed
//    up the crowd), brutes, and a boss in wave 15 = a locked character (kill it: cured, joins a roster).
// One phone, together: half the spots and own money each, kills pay whoever made them; pub upgrades cost half each.
// 20 pints: lose them and the Winchester falls. Layout portrait (pub at the top); wide screens get the map turned.
// Fixed from v1 (owner): heroes walked away from fights (they now hold a spot and chase within a leash), a hit swapped the
// face picture every frame (moods are preloaded and change at most every .8 s).
const {fullBleed}=require("src/engines/fullBleed.js");
const {sound,tone,vibrate}=require("src/audio.js");
const {store}=require("src/state.js");
const {soloProgress}=require("src/solo.js");
const DT=require("src/engines/sotd/data.js");
const {TOWERS,LINES,node,HERO_WEAPONS,HERO,PUB,POWERS,ZOMBIES,WAVES}=DT;

const WW=360,WH=640,ROAD=22,SPOT=24,BAR=78;
const PATH=[[60,700],[60,520],[300,520],[300,370],[80,370],[80,230],[270,230],[270,150],[180,150],[180,106]];
const SPOTS=[[40,445],[140,445],[220,445],[150,592],[250,592],[160,300],[240,300],[330,300],[110,172],[330,172]];
const PUBR={x:66,y:0,w:228,h:106};
const DECOR=[['lamp',20,500],['lamp',340,520],['lamp',20,250],['box',340,410],['bin',115,530],['car',330,622],['hedge',110,395],['hedge',260,262],['bench',200,606],['lamp',220,175],['wreck',20,610],['hedge',300,90]];
const PCOL=['#4d8dff','#ff5a6a'],PINTS=20,BREAK=24;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

async function seanOfTheDead(s){
 const solo=!!s.solo,np=solo?1:2,R=s.random,fxr=Math.random;
 const [c,x]=s.canvas(390,780,{fill:true});const fb=fullBleed(s,{bg:'#141d10'});
 s.body.classList.add('drag-arena-body');
 if(!solo){s.cooperative=true;s.cooperativeLabel='HOLD THE WINCHESTER';}s.updateScores?.();
 s.hint('Tap a build spot in your colour, pick a tower, read its card, tap BUILD. Tap a tower to upgrade it: after tier 3 you choose one of two super paths, then max it. Tap your hero, then tap the road to send them (or drag them). SMASH = hero special (bottom right). Bottom left: the armoured bus and a petrol strike. Tap the pub for its upgrades. Tap the skull to call the next wave early for cash.');
 // ---------------------------------------------------------------- faces
 let headOf=null;try{headOf=require("src/engines/broforce.js").headCanvas;}catch{}
 const head=(id,mood='normal',size=96)=>{try{return headOf?.(id,mood,size)||null;}catch{return null;}};
 const mine=new Set(s.players.slice(0,np).map(p=>p.character));
 let pool=[];
 try{const {CHARACTERS}=require("src/characters.js"),{portraitMoods}=require("src/assets.js");
  pool=CHARACTERS.filter(ch=>!mine.has(ch.id)&&!/^(sean|amber|loki|kc|mylo)$/.test(ch.id)).filter(ch=>{try{return portraitMoods(ch.id).length>0;}catch{return false;}}).map(ch=>ch.id);}catch{}
 const faces=[];for(let i=0;i<24&&pool.length;i++)faces.push(pool.splice(Math.floor(R()*pool.length),1)[0]);if(!faces.length)faces.push('shaun');
 let bossId=null;
 try{const rw=require('src/rewards.js'),{portraitMoods}=require('src/assets.js');
  const ids=[...new Set(s.players.slice(0,np).flatMap(p=>{try{return rw.gameRecruitPool(s.game,store.profile,p).map(ch=>ch.id);}catch{return [];}}))];
  const art=ids.filter(id=>{try{return portraitMoods(id).length>0;}catch{return false;}}),list=art.length?art:ids;if(list.length)bossId=list[Math.floor(R()*list.length)];}catch{}
 s.gameRecruits=[[],[]];
 const nameOf=id=>{try{return require("src/characters.js").character(id)?.name||id;}catch{return id;}};
 // warm the pictures up front so a mood change never shows a placeholder for a frame
 for(const id of faces)head(id,'normal',96);if(bossId)head(bossId,'normal',160);
 for(const p of s.players.slice(0,np))for(const m of ['normal','angry','sad','win'])head(p.character,m,128);

 // ---------------------------------------------------------------- layout (portrait; wide = turned)
 let wide=false,MW=WW,MH=WH,path=[],spots=[],pub=PUBR,decor=[],segs=[],total=0,spawnBtn={x:0,y:0},door=[0,0],laidOut=null,ready=false;
 const T=([a,b])=>wide?[b,a]:[a,b];
 const posAt=d=>{d=clamp(d,0,total);for(const g of segs)if(d<=g.d0+g.l){const t=(d-g.d0)/g.l;return [g.ax+(g.bx-g.ax)*t,g.ay+(g.by-g.ay)*t];}const g=segs[segs.length-1];return [g.bx,g.by];};
 const segAt=d=>segs.find(g=>d<=g.d0+g.l)||segs[segs.length-1];
 const nearestD=(px,py)=>{let best=0,bd=1e9;for(const g of segs){const vx=g.bx-g.ax,vy=g.by-g.ay,t=clamp(((px-g.ax)*vx+(py-g.ay)*vy)/(g.l*g.l),0,1),qx=g.ax+vx*t,qy=g.ay+vy*t,dd=Math.hypot(px-qx,py-qy);if(dd<bd){bd=dd;best=g.d0+g.l*t;}}return best;};
 function layout(w){
  wide=w;MW=wide?WH:WW;MH=wide?WW:WH;laidOut=w;
  path=PATH.map(T);spots=SPOTS.map((p,i)=>{const [sx,sy]=T(p);return {i,x:sx,y:sy,owner:solo?0:(SPOTS[i][0]<180?0:1),t:null};});
  pub=wide?{x:PUBR.y,y:PUBR.x,w:PUBR.h,h:PUBR.w}:PUBR;decor=DECOR.map(([kd,a,b])=>{const [dx,dy]=T([a,b]);return {k:kd,x:dx,y:dy};});
  segs=[];total=0;for(let i=1;i<path.length;i++){const [ax,ay]=path[i-1],[bx,by]=path[i],l=Math.hypot(bx-ax,by-ay);segs.push({ax,ay,bx,by,l,d0:total});total+=l;}
  const [bx,by]=T([104,612]);spawnBtn={x:bx,y:by};door=posAt(total);
  if(ready)heroes.forEach((h,i)=>{const [hx,hy]=T([150+i*70,196]);h.x=h.hx=hx;h.y=h.hy=hy;});
 }
 const wantWide=()=>s.W>s.H*1.15;layout(wantWide());
 // ---------------------------------------------------------------- view
 let k=1,ox=0,oy=0,top=84,bot=BAR;
 // tall screens: HUD rows on top, buttons in a bar at the bottom; wide screens: the map uses the full height and the
 // HUD/buttons float in the side margins
 function view(){if(wide){top=Math.max(46,fb.top+6);bot=6;const W=s.W-170,H=s.H-top-bot;k=Math.min(W/MW,H/MH);ox=(s.W-MW*k)/2;oy=top+(H-MH*k)/2;return;}
  top=Math.max(86,fb.top+50);bot=BAR;const W=s.W,H=s.H-top-bot;k=Math.min(W/MW,H/MH);ox=(W-MW*k)/2;oy=top+(H-MH*k)/2;}
 const SX=wx=>ox+wx*k,SY=wy=>oy+wy*k,WX=sx=>(sx-ox)/k,WY=sy=>(sy-oy)/k;

 // ---------------------------------------------------------------- state
 let phase='intro',phaseT=0,wave=0,pints=PINTS,maxPints=PINTS,breakT=BREAK,speed=1,clock=0,ended=false,won=false;
 const money=[solo?300:180,180],score=[0,0],kills=[0,0],bossDmg=[0,0];
 const Z=[],SHELL=[],FX=[],TXT=[],DECAL=[],MINES=[],POOLS=[],LINESFX=[],RINGS=[];
 const pubLv={door:0,turret:0,tab:0};let pubCool=0;
 const powers={bus:{cd:10},strike:{cd:6}};let bus=null,aiming=null;
 let queue=[],spawnT=0,nextId=1,sel=null,banner=null,shake=0,btns=[];
 const heroes=s.players.slice(0,np).map((p,i)=>{const [hx,hy]=T([150+i*70,196]);return {i,owner:i,id:p.character,x:hx,y:hy,hx,hy,hp:HERO.hp,max:HERO.hp,lvl:1,xp:0,w:0,cool:0,gunCool:0,smash:0,target:null,dead:0,face:1,walk:0,swing:0,mood:'normal',moodT:0,saw:0};});
 ready=true;
 const living=()=>Z.filter(z=>!z.dead&&!z.gone);
 function say(text,sub,col='#ffd23a',t=2.6){banner={text,sub,col,t,max:t};}
 function pop(wx,wy,text,col='#fff',big=false){TXT.push({x:wx,y:wy,text,col,t:big?1.4:1,big});if(TXT.length>60)TXT.shift();}
 let sfxN=0;const sfx=(f,d,v,type)=>{if(sfxN>14)return;sfxN++;try{tone(f,d,v,type);}catch{}};
 function boom(wx,wy,r,col='#ffb040'){RINGS.push({x:wx,y:wy,r,t:.45,max:.45,col});for(let i=0;i<14;i++){const a=fxr()*7,v=40+fxr()*120;FX.push({x:wx,y:wy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,t:.5+fxr()*.4,col:fxr()<.5?col:'#ffe08a',r:1.5+fxr()*2.5,g:160});}
  for(let i=0;i<6;i++)FX.push({x:wx+(fxr()-.5)*r,y:wy+(fxr()-.5)*r*.5,vx:(fxr()-.5)*20,vy:-20-fxr()*30,t:1+fxr(),col:'rgba(60,55,50,.6)',r:5+fxr()*6,g:-10,smoke:true});
  shake=Math.max(shake,Math.min(12,r/6));sfx(70+fxr()*30,.22,.07,'sawtooth');}

 // ---------------------------------------------------------------- waves
 function startWave(early=false){
  if(wave>=WAVES.length||phase==='wave'&&queue.length)return;
  if(early&&phase==='break'){const bonus=Math.ceil(breakT*1.2);for(let i=0;i<np;i++)money[i]+=bonus;pop(spawnBtn.x,spawnBtn.y-24,`+£${bonus} each`,'#ffd23a');sound('pickup');}
  const w=WAVES[wave];wave++;phase='wave';const list=[];
  for(const [t,n] of Object.entries(w))for(let i=0;i<n;i++)if(t!=='boss')list.push(t);
  for(let i=list.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  if(w.boss)list.splice(Math.floor(list.length*.5),0,'boss');
  queue=list;spawnT=.4;const n=list.length;
  say(`WAVE ${wave}`,w.boss?(bossId?`Zombie ${nameOf(bossId)} is coming!`:'The big one!'):w.brute?`${n} of the dead — BRUTES!`:`${n} of the dead`,'#ff6a5a',2);
  sound('rare');try{vibrate(30);}catch{}
 }
 function spawnZ(type,d=0){
  const t=ZOMBIES[type],hpK=t.boss?(np===2?1.3:1):(1+.3*(wave-1)+.013*(wave-1)*(wave-1))*(np===2?1.35:1),hp=Math.round(t.hp*hpK);
  const id=t.boss&&bossId?bossId:faces[Math.floor(R()*faces.length)];
  Z.push({id:nextId++,type,t,face:id,hp,max:hp,d,lane:(R()-.5)*(t.size>1.5?6:20),slow:0,stun:0,vuln:0,haste:0,burn:0,burnT:0,blocker:null,dead:0,gone:0,wob:R()*6,hitT:0,x:0,y:0,dmgBy:[0,0],spawnT:0,ang:0});
 }
 // ---------------------------------------------------------------- damage
 function hurt(z,dmg,type,src){
  if(z.dead||z.gone)return;let m=1+z.vuln;const ar=z.t.armor||0;
  if(type==='phys'&&!src?.armorPierce)m*=1-ar;else if(type==='blast')m*=1-ar/2;
  const d=dmg*m;z.hp-=d;z.hitT=.1;const o=src?.owner??0;z.dmgBy[o]+=d;if(z.t.boss)bossDmg[o]+=d;
  if(z.hp<=0)kill(z,src);
 }
 function burnZ(z,dps,t=3){if(z.dead)return;z.burn=Math.max(z.burn,dps);z.burnT=Math.max(z.burnT,t);}
 function kill(z,src){
  z.dead=.7;const o=src?.owner??(z.dmgBy[1]>z.dmgBy[0]?1:0),gold=Math.round(z.t.gold*(1+(PUB.tab.levels[pubLv.tab-1]?.gold||0)));
  money[o]+=gold;score[o]+=z.t.gold*10;kills[o]++;s.setScores?.(score.slice());
  pop(z.x,z.y-26,`+£${gold}`,'#ffd23a');DECAL.push({x:z.x,y:z.y+4,r:8+z.t.size*7,a:.6,seed:fxr()});if(DECAL.length>90)DECAL.shift();
  for(let i=0;i<10;i++)FX.push({x:z.x,y:z.y-10,vx:(fxr()-.5)*110,vy:-30-fxr()*90,t:.6,col:'#8a0f0f',r:2+fxr()*2,g:260});
  if(z.blocker){if(z.blocker.foe===z)z.blocker.foe=null;if(z.blocker.target===z)z.blocker.target=null;z.blocker=null;}
  for(const h of heroes){const share=src===h?1:.25;h.xp+=z.t.gold*share;levelUp(h);}
  sfx(150+fxr()*80,.07,.04,'square');
  if(z.t.burst){boom(z.x,z.y,40,'#9acd5a');for(const m of blockers())if(Math.hypot(m.x-z.x,m.y-z.y)<40)damageBlocker(m,30);for(let i=0;i<3;i++)spawnZ('crawler',Math.max(0,z.d-6-i*8));}
  if(z.t.boss){shake=16;sound('win');
   if(bossId){const by=np>1&&bossDmg[1]>bossDmg[0]?1:0;if(!s.gameRecruits[by].includes(bossId))s.gameRecruits[by].push(bossId);say('CURED!',`${nameOf(bossId)} joins ${s.players[by].name}’s roster`,'#7dff8a',3.6);}}
 }
 // ---------------------------------------------------------------- towers
 const curNode=t=>node(t.line,t.tier,t.branch);
 function pay(owner,cost){if(money[owner]<cost)return false;money[owner]-=cost;return true;}
 function noCash(wx,wy){pop(wx,wy,'Not enough £','#ff8a7a');sound('tap');}
 function build(sp,line){const n=node(line,1);if(!pay(sp.owner,n.cost))return noCash(sp.x,sp.y-30);
  sp.t={line,tier:1,branch:null,spent:n.cost,cool:.3,aim:-Math.PI/2,flash:0,men:[],mineT:0,stunT:0,blastT:0,buff:0,spin:0};setupCrew(sp);
  sound('card');pop(sp.x,sp.y-30,n.name,'#fff');RINGS.push({x:sp.x,y:sp.y,r:30,t:.4,max:.4,col:TOWERS[line].col});}
 function upgrade(sp,branch){const t=sp.t;let tier=t.tier+1;if(tier>5)return;const b=tier>=4?(t.branch||branch):null;if(tier===4&&!b)return;const n=node(t.line,tier,b);
  if(!pay(sp.owner,n.cost))return noCash(sp.x,sp.y-30);t.tier=tier;t.branch=b;t.spent+=n.cost;setupCrew(sp);
  sound(tier>=4?'unlock':'pickup');pop(sp.x,sp.y-34,tier>=4?n.name.toUpperCase()+'!':`TIER ${tier}`,tier>=4?'#ffd23a':'#fff',tier>=4);
  if(tier>=4){RINGS.push({x:sp.x,y:sp.y,r:60,t:.6,max:.6,col:'#ffd23a'});shake=4;if(n.quote)setTimeout(()=>pop(sp.x,sp.y-12,`“${n.quote}”`,'#ffe9a0'),400);}}
 function sell(sp){const back=Math.floor(sp.t.spent*.6);money[sp.owner]+=back;for(const m of sp.t.men)releaseFoes(m);pop(sp.x,sp.y-30,`+£${back}`,'#ffd23a');for(let i=MINES.length-1;i>=0;i--)if(MINES[i].sp===sp)MINES.splice(i,1);sp.t=null;sound('tap');}
 function setupCrew(sp){const t=sp.t,n=curNode(t);if(n.kind!=='crew'){for(const m of t.men)releaseFoes(m);t.men=[];return;}
  if(!t.rally){const d=nearestD(sp.x,sp.y);const [rx,ry]=posAt(d);t.rally={x:rx,y:ry};}
  while(t.men.length<n.men)t.men.push({x:sp.x,y:sp.y,hp:n.hp,max:n.hp,foe:null,cool:0,dead:0,owner:sp.owner,swing:0,sp,crew:true});
  for(const m of t.men){m.max=n.hp;if(!m.dead)m.hp=n.hp;}}
 function releaseFoes(m){for(const z of Z)if(z.blocker===m)z.blocker=null;m.foe=null;}
 function blockers(){const out=[];for(const sp of spots)if(sp.t)for(const m of sp.t.men)if(!m.dead)out.push(m);for(const h of heroes)if(h.dead<=0)out.push(h);return out;}
 function damageBlocker(b,d){const ar=b.crew?(curNode(b.sp.t)?.armor||0):0;b.hp-=d*(1-ar);if(b.hp<=0){if(b.crew){b.dead=12;releaseFoes(b);}else heroDown(b);}}
 const inRange=(px,py,r)=>living().filter(z=>Math.hypot(z.x-px,z.y-py)<=r);
 const angDiff=(a,b)=>{let d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return Math.abs(d);};
 function stepTower(sp,dt){
  const t=sp.t,n=curNode(t),own={owner:sp.owner,armorPierce:n.armorPierce};t.flash=Math.max(0,t.flash-dt);t.spin*=.95;
  const rate=1/(1+t.buff);t.cool-=dt;
  switch(n.kind){
   case 'spread':{if(t.cool>0)return;const near=inRange(sp.x,sp.y,n.range);if(!near.length)return;const tg=near.sort((a,b)=>b.d-a.d)[0];
    t.cool=n.rate*rate;t.aim=Math.atan2(tg.y-sp.y,tg.x-sp.x);t.flash=.12;
    const cone=near.filter(z=>angDiff(Math.atan2(z.y-sp.y,z.x-sp.x),t.aim)<n.cone/2+.15).sort((a,b)=>Math.hypot(a.x-sp.x,a.y-sp.y)-Math.hypot(b.x-sp.x,b.y-sp.y));
    for(let p=0;p<n.pellets;p++){const z=cone[p%Math.max(1,Math.min(cone.length,3+(p>>1)))];if(z){hurt(z,n.dmg,'phys',own);if(n.burn)burnZ(z,n.burn);if(n.kb&&!z.t.boss&&!z.blocker)z.d=Math.max(0,z.d-n.kb/n.pellets*2);}
     const a=t.aim+(fxr()-.5)*n.cone,l=n.range*(.7+fxr()*.3);LINESFX.push({x0:sp.x,y0:sp.y-10,x1:sp.x+Math.cos(a)*l,y1:sp.y-10+Math.sin(a)*l,t:.09,col:n.burn?'#ff9a3a':'#fff3c0',w:1.4});}
    sfx(90,.09,.06,'sawtooth');return;}
   case 'rifle':{if(t.cool>0)return;const near=inRange(sp.x,sp.y,n.range);if(!near.length)return;const tg=n.first?near.sort((a,b)=>b.d-a.d)[0]:near.sort((a,b)=>b.hp-a.hp)[0];
    t.cool=n.rate*rate;t.aim=Math.atan2(tg.y-sp.y,tg.x-sp.x);t.flash=.08;t.spin=1;
    const shoot=z=>{let d=n.dmg,txt=null;if(n.headshot&&!z.t.boss&&fxr()<n.headshot){d=z.hp/(1-(z.t.armor||0))+1;txt='HEADSHOT!';}else if(n.crit&&fxr()<n.crit){d*=3;txt='HEADSHOT!';}
     hurt(z,d,'phys',own);if(txt){pop(z.x,z.y-34,txt,'#ff5050',true);}};
    if(n.pierce){const ex=sp.x+Math.cos(t.aim)*n.range,ey=sp.y+Math.sin(t.aim)*n.range;for(const z of near){const vx=ex-sp.x,vy=ey-sp.y,tt=clamp(((z.x-sp.x)*vx+(z.y-sp.y)*vy)/(vx*vx+vy*vy),0,1);if(Math.hypot(sp.x+vx*tt-z.x,sp.y+vy*tt-z.y)<14)shoot(z);}
     LINESFX.push({x0:sp.x,y0:sp.y-12,x1:ex,y1:ey,t:.18,col:'#ffeaa0',w:3});sfx(140,.18,.08,'square');shake=Math.max(shake,3);}
    else{shoot(tg);LINESFX.push({x0:sp.x,y0:sp.y-12,x1:tg.x,y1:tg.y-14,t:n.first?.05:.12,col:'#fff6c0',w:n.first?1.2:2});if(!n.first||fxr()<.3)sfx(n.first?520:180,.05,.035,'square');}
    return;}
   case 'lob':{if(t.cool>0)return;const near=inRange(sp.x,sp.y,n.range);if(!near.length)return;const tg=near.sort((a,b)=>b.d-a.d)[0];
    t.cool=n.rate*rate;const ft=.6+Math.hypot(tg.x-sp.x,tg.y-sp.y)/420,v=tg.blocker||tg.stun>0?0:tg.t.sp*(1-tg.slow);const [px,py]=posAt(tg.d+v*ft);t.aim=Math.atan2(py-sp.y,px-sp.x);t.flash=.15;
    SHELL.push({x0:sp.x,y0:sp.y-14,x1:px,y1:py,t:0,ft,n,own,fire:t.line==='fire'});sfx(t.line==='fire'?300:120,.08,.04,'triangle');return;}
   case 'flame':{const near=inRange(sp.x,sp.y,n.range);if(!near.length)return;const tg=near.sort((a,b)=>Math.hypot(a.x-sp.x,a.y-sp.y)-Math.hypot(b.x-sp.x,b.y-sp.y))[0];
    t.aim=Math.atan2(tg.y-sp.y,tg.x-sp.x);t.flash=.1;
    for(const z of near)if(angDiff(Math.atan2(z.y-sp.y,z.x-sp.x),t.aim)<.34){hurt(z,n.dps*dt/rate,'fire',own);burnZ(z,n.burn,2.5);}
    for(let i=0;i<3;i++){const a=t.aim+(fxr()-.5)*.5,v=n.range*(1.4+fxr());FX.push({x:sp.x+Math.cos(t.aim)*12,y:sp.y-10+Math.sin(t.aim)*12,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:.45+fxr()*.2,col:fxr()<.5?'#ff7a20':'#ffd040',r:3+fxr()*3,g:-30,fire:true});}
    if(fxr()<.15)sfx(60+fxr()*40,.1,.02,'sawtooth');return;}
   case 'crew':stepCrew(sp,t,n,dt,rate);return;
   case 'pulse':{for(const z of inRange(sp.x,sp.y,n.range)){z.slow=Math.max(z.slow,n.slow);if(n.vuln)z.vuln=Math.max(z.vuln,n.vuln);}
    if(n.stun){t.stunT+=dt;if(t.stunT>=n.stun.every){t.stunT=0;for(const z of inRange(sp.x,sp.y,n.range))z.stun=Math.max(z.stun,n.stun.t);RINGS.push({x:sp.x,y:sp.y,r:n.range,t:.6,max:.6,col:'#ff7ad9'});pop(sp.x,sp.y-36,'FREEZE!','#ff9ae0',true);sfx(784,.3,.05,'sine');}}
    if(t.cool<=0){const near=inRange(sp.x,sp.y,n.range);if(near.length){t.cool=n.rate;t.flash=.35;for(const z of near)hurt(z,n.dmg,'true',own);
     for(let i=0;i<3;i++)FX.push({x:sp.x+(fxr()-.5)*20,y:sp.y-14,vx:(fxr()-.5)*40,vy:-40-fxr()*30,t:1,note:'♪♫'[i%2],col:['#ff7ad9','#7ad9ff','#ffd23a'][i],g:0});sfx(523+t.tier*40,.07,.035,'sine');}}
    return;}
   case 'mines':{t.mineT-=dt;const mine=MINES.filter(m=>m.sp===sp).length;if(t.mineT<=0&&mine<n.max){t.mineT=n.every;
     for(let tries=0;tries<12;tries++){const d=fxr()*total,[mx,my]=posAt(d);if(Math.hypot(mx-sp.x,my-sp.y)<=n.range&&d>40){MINES.push({x:mx+(fxr()-.5)*14,y:my+(fxr()-.5)*14,sp,n,own,arm:.6});t.flash=.3;break;}}}
    return;}
   case 'saw':{for(const z of inRange(sp.x,sp.y,n.range)){hurt(z,n.dps*dt/rate,'phys',own);if(fxr()<.3)FX.push({x:z.x,y:z.y-12,vx:(fxr()-.5)*80,vy:-40-fxr()*60,t:.35,col:fxr()<.5?'#8a0f0f':'#ffe08a',r:1.6,g:200});}
    if(inRange(sp.x,sp.y,n.range).length){t.spin=1;if(fxr()<.25)sfx(110+fxr()*30,.06,.025,'sawtooth');}
    if(n.blast){t.blastT+=dt;if(t.blastT>=n.blast.every){t.blastT=0;const near=inRange(sp.x,sp.y,n.range*1.5).slice(0,n.blast.pellets);for(const z of near)hurt(z,n.blast.dmg,'phys',own);
     for(let i=0;i<16;i++){const a=i/16*Math.PI*2;LINESFX.push({x0:sp.x,y0:sp.y-10,x1:sp.x+Math.cos(a)*n.range*1.5,y1:sp.y-10+Math.sin(a)*n.range*1.5,t:.12,col:'#fff3c0',w:1.5});}RINGS.push({x:sp.x,y:sp.y,r:n.range*1.5,t:.35,max:.35,col:'#fff'});sfx(70,.2,.08,'sawtooth');shake=Math.max(shake,4);}}
    return;}
  }
 }
 function stepCrew(sp,t,n,dt,rate){
  n.men>t.men.length&&setupCrew(sp);
  t.men.forEach((m,j)=>{
   if(m.dead>0){m.dead-=dt;if(m.dead<=0){m.hp=m.max;m.x=sp.x;m.y=sp.y;}return;}
   const off=[[-12,-9],[12,9],[0,14],[0,-14]][j]||[0,0],hx=t.rally.x+off[0],hy=t.rally.y+off[1];
   if(m.foe&&(m.foe.dead||m.foe.gone||Math.hypot(m.foe.x-t.rally.x,m.foe.y-t.rally.y)>n.range+30))m.foe=null;
   if(!m.foe){const cand=inRange(t.rally.x,t.rally.y,n.range).filter(z=>!z.t.dodge&&(!z.blocker||z.blocker===m)).sort((a,b)=>b.d-a.d)[0];if(cand){m.foe=cand;cand.blocker=m;}}
   const cap=n.block||1;if(m.foe&&cap>1){let held=Z.filter(z=>z.blocker===m).length;for(const z of inRange(m.x,m.y,18))if(held<cap&&!z.blocker&&!z.t.dodge){z.blocker=m;held++;}}
   const gx=m.foe?m.foe.x-10:hx,gy=m.foe?m.foe.y:hy,dx=gx-m.x,dy=gy-m.y,dd=Math.hypot(dx,dy);if(dd>2){const v=Math.min(dd,80*dt);m.x+=dx/dd*v;m.y+=dy/dd*v;m.walk=(m.walk||0)+dt*8;}
   m.cool-=dt;m.swing=Math.max(0,m.swing-dt);
   if(m.foe&&dd<16&&m.cool<=0){m.cool=n.rate*rate;m.swing=.2;if(n.cleave){for(const z of inRange(m.x,m.y,26))hurt(z,n.dmg,'phys',{owner:m.owner});}else hurt(m.foe,n.dmg,'phys',{owner:m.owner});sfx(330,.035,.025,'triangle');}
   else if(!m.foe&&n.shoot&&m.cool<=0){const z=inRange(m.x,m.y,90)[0];if(z){m.cool=n.rate*1.4;hurt(z,n.shoot,'phys',{owner:m.owner});LINESFX.push({x0:m.x,y0:m.y-14,x1:z.x,y1:z.y-14,t:.06,col:'#fff6c0',w:1});}}
   if(!m.foe&&m.hp<m.max)m.hp=Math.min(m.max,m.hp+6*dt);
  });
 }
 // ---------------------------------------------------------------- heroes
 const heroDmgK=h=>1+.11*(h.lvl-1);
 function levelUp(h){while(h.lvl<10&&h.xp>=40*Math.pow(h.lvl,1.6)){h.xp-=40*Math.pow(h.lvl,1.6);h.lvl++;h.max=Math.round(HERO.hp*(1+.11*(h.lvl-1)));h.hp=h.max;pop(h.x,h.y-50,`LEVEL ${h.lvl}!`,'#7dff8a',true);RINGS.push({x:h.x,y:h.y,r:30,t:.5,max:.5,col:'#7dff8a'});}}
 function heroDown(h){if(h.dead>0)return;h.dead=10;h.hp=0;if(h.target?.blocker===h)h.target.blocker=null;h.target=null;for(const z of Z)if(z.blocker===h)z.blocker=null;pop(h.x,h.y-40,'DOWN!','#ff6a5a',true);sound('lose');}
 function setMood(h,m){if(h.mood===m||h.moodT>0)return;h.mood=m;h.moodT=.8;}
 function stepHero(h,dt){
  if(h.dead>0){h.dead-=dt;if(h.dead<=0){h.hp=h.max;h.x=door[0];h.y=door[1]+(wide?0:10);pop(h.x,h.y-40,'BACK!','#7dff8a');}return;}
  h.moodT-=dt;h.smash=Math.max(0,h.smash-dt);h.swing=Math.max(0,h.swing-dt);
  const W=HERO_WEAPONS[h.w],reach=W.reach,leash=95;
  if(h.target&&(h.target.dead||h.target.gone||Math.hypot(h.target.x-h.hx,h.target.y-h.hy)>leash+25)){if(h.target.blocker===h)h.target.blocker=null;h.target=null;}
  if(!h.target){const cand=living().filter(z=>Math.hypot(z.x-h.hx,z.y-h.hy)<leash&&Math.hypot(z.x-h.x,z.y-h.y)<80).sort((a,b)=>(a.blocker===h?-1:0)-(b.blocker===h?-1:0)||Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];if(cand)h.target=cand;}
  const tg=h.target;let gx=h.hx,gy=h.hy;
  if(tg){const side=h.x<tg.x?-1:1;gx=tg.x+side*reach*.7;gy=tg.y;}
  const dx=gx-h.x,dy=gy-h.y,dd=Math.hypot(dx,dy);
  if(dd>2){const v=Math.min(dd,95*dt);h.x+=dx/dd*v;h.y+=dy/dd*v;h.walk+=dt*9;if(Math.abs(dx)>1.5)h.face=dx>0?1:-1;}
  if(tg){const dz=Math.hypot(tg.x-h.x,tg.y-h.y);if(Math.abs(tg.x-h.x)>2)h.face=tg.x>h.x?1:-1;
   if(dz<reach+10){if(!tg.blocker&&!tg.t.dodge)tg.blocker=h;setMood(h,'angry');
    if(W.dps){hurt(tg,W.dps*heroDmgK(h)*dt,'phys',h);h.saw=1;if(fxr()<.3)FX.push({x:tg.x,y:tg.y-14,vx:(fxr()-.5)*80,vy:-40-fxr()*60,t:.35,col:fxr()<.5?'#8a0f0f':'#ffe08a',r:1.6,g:200});if(fxr()<.2)sfx(120+fxr()*20,.05,.02,'sawtooth');}
    else{h.cool-=dt;if(h.cool<=0){h.cool=W.rate;h.swing=.22;hurt(tg,W.dmg*heroDmgK(h),'phys',h);if(W.kb&&!tg.t.boss&&tg.blocker!==h)tg.d=Math.max(0,tg.d-W.kb);sfx(240,.05,.04,'square');}}}}
  else{h.saw=Math.max(0,h.saw-dt*3);h.hp=Math.min(h.max,h.hp+5*dt);}
  if(W.gun){h.gunCool-=dt;if(h.gunCool<=0){const near=inRange(h.x,h.y,W.gun.range);if(near.length){h.gunCool=W.gun.rate;const z0=near[0],a=Math.atan2(z0.y-h.y,z0.x-h.x);
   for(let p=0;p<W.gun.pellets;p++){const z=near[p%Math.min(near.length,3)];hurt(z,W.gun.dmg*heroDmgK(h),'phys',h);const aa=a+(fxr()-.5)*.6;LINESFX.push({x0:h.x,y0:h.y-18,x1:h.x+Math.cos(aa)*W.gun.range,y1:h.y-18+Math.sin(aa)*W.gun.range,t:.08,col:'#fff3c0',w:1.3});}sfx(90,.08,.05,'sawtooth');}}}
  if(!tg)setMood(h,h.hp<h.max*.35?'sad':'normal');else if(h.hp<h.max*.35)setMood(h,'sad');
 }
 function smash(h){if(h.dead>0||h.smash>0)return;h.smash=HERO.smash.cd;const S=HERO.smash,d=S.dmg+12*h.lvl;
  for(const z of inRange(h.x,h.y,S.r)){hurt(z,d,'phys',h);z.stun=Math.max(z.stun,S.stun);if(!z.t.boss)z.d=Math.max(0,z.d-14);}
  RINGS.push({x:h.x,y:h.y,r:S.r,t:.5,max:.5,col:PCOL[h.i]});boom(h.x,h.y+6,S.r*.6,'#c9b48a');pop(h.x,h.y-50,'SMASH!','#fff',true);h.swing=.4;try{vibrate(25);}catch{}}
 function upgradeWeapon(h){const nx=HERO_WEAPONS[h.w+1];if(!nx)return;if(!pay(h.owner,nx.cost))return noCash(h.x,h.y-50);h.w++;sound('unlock');pop(h.x,h.y-50,nx.name.toUpperCase()+'!','#ffd23a',true);}
 // ---------------------------------------------------------------- zombies
 function stepZ(z,dt){
  if(z.dead){z.dead-=dt;if(z.dead<=0)z.gone=1;return;}
  z.spawnT+=dt;z.hitT=Math.max(0,z.hitT-dt);
  if(z.burnT>0){z.burnT-=dt;hurt(z,z.burn*dt,'fire',null);if(fxr()<.25)FX.push({x:z.x+(fxr()-.5)*10,y:z.y-14-fxr()*14,vx:0,vy:-30,t:.4,col:fxr()<.5?'#ff7a20':'#ffd040',r:2+fxr()*2,g:-20,fire:true});if(z.dead)return;}
  if(z.stun>0){z.stun-=dt;}
  const b=z.blocker;
  if(b&&(b.dead>0||b.hp<=0||Math.hypot(b.x-z.x,b.y-z.y)>34)){if(b.foe===z)b.foe=null;if(b.target===z)b.target=null;z.blocker=null;}
  if(z.blocker&&z.stun<=0){damageBlocker(z.blocker,z.t.bite*dt);if(z.blocker&&!z.blocker.crew){z.blocker.hurtT=.15;}}
  else if(!z.blocker&&z.stun<=0){const sp=z.t.sp*(1-z.slow)*(z.haste?1.3:1);z.d+=sp*dt;z.wob+=dt*sp/6;}
  if(z.t.boss){z.spawnCd=(z.spawnCd??6)-dt;if(z.spawnCd<=0){z.spawnCd=7;spawnZ('crawler',Math.max(0,z.d-10));spawnZ('crawler',Math.max(0,z.d-20));pop(z.x,z.y-60,'RAAARGH!','#ff5050',true);}}
  const [px,py]=posAt(z.d),g=segAt(z.d),nx=-(g.by-g.ay)/g.l,ny=(g.bx-g.ax)/g.l;
  z.x=px+nx*z.lane;z.y=py+ny*z.lane;z.ang=Math.atan2(g.by-g.ay,g.bx-g.ax);
  if(z.d>=total){z.gone=1;pints=Math.max(0,pints-z.t.pints);shake=10;try{vibrate(40);}catch{}sound('lose');pop(door[0],door[1]+24,`-${z.t.pints} 🍺`,'#ff6a5a',true);
   for(const h of heroes){h.moodT=0;setMood(h,'angry');}if(pints<=0)end(false);}
 }
 // ---------------------------------------------------------------- pub, powers
 function pubUpgrade(key){const L=PUB[key].levels[pubLv[key]];if(!L)return;const share=np>1?Math.ceil(L.cost/2):L.cost;
  if(money.slice(0,np).some(m=>m<share))return noCash(door[0],door[1]+30);for(let i=0;i<np;i++)money[i]-=share;pubLv[key]++;
  if(key==='door'){pints+=L.pints;maxPints+=L.pints;}sound('unlock');pop(door[0],door[1]+30,PUB[key].name.toUpperCase()+'!','#ffd23a',true);}
 function stepPub(dt){const L=PUB.turret.levels[pubLv.turret-1];if(!L)return;pubCool-=dt;if(pubCool>0)return;const near=inRange(door[0],door[1],L.range);if(!near.length)return;pubCool=L.rate;
  for(let p=0;p<5;p++){const z=near[p%Math.min(3,near.length)];hurt(z,L.dmg/2,'phys',{owner:p%np});const a=Math.atan2(z.y-door[1],z.x-door[0])+(fxr()-.5)*.4;LINESFX.push({x0:door[0],y0:door[1]-10,x1:door[0]+Math.cos(a)*L.range,y1:door[1]-10+Math.sin(a)*L.range,t:.08,col:'#fff3c0',w:1.3});}sfx(95,.08,.05,'sawtooth');}
 function usePower(key,wx,wy){const p=powers[key];if(p.cd>0)return;
  if(key==='bus'){p.cd=POWERS.bus.cd;bus={d:total,hit:new Set(),t:0};say('ARMOURED BUS!','Dawn of the Dead, baby','#ffd23a',1.6);sfx(220,.25,.06,'square');setTimeout(()=>sfx(196,.3,.06,'square'),180);}
  else{p.cd=POWERS.strike.cd;for(let i=0;i<6;i++)SHELL.push({x0:wx+(fxr()-.5)*30,y0:wy-260,x1:wx+(fxr()-.5)*70,y1:wy+(fxr()-.5)*50,t:-i*.13,ft:.6,n:{dmg:POWERS.strike.dmg,splash:POWERS.strike.r,burn:10,pool:{dps:20,t:2.5,r:30}},own:{owner:i%np},fire:true,strike:true});sfx(400,.3,.04,'triangle');}}
 function stepBus(dt){if(!bus)return;bus.t+=dt;bus.d-=210*dt;const [bx,by]=posAt(bus.d);bus.x=bx;bus.y=by;
  for(const z of living())if(!bus.hit.has(z)&&Math.hypot(z.x-bx,z.y-by)<26){bus.hit.add(z);hurt(z,POWERS.bus.dmg*(z.t.boss?1.5:1),'true',{owner:z.id%np});if(!z.t.boss){z.d=Math.max(0,z.d-30);}
   for(let i=0;i<6;i++)FX.push({x:z.x,y:z.y-10,vx:(fxr()-.5)*140,vy:-60-fxr()*80,t:.5,col:'#8a0f0f',r:2.2,g:260});shake=Math.max(shake,5);sfx(80,.08,.05,'square');}
  if(bus.d<=0)bus=null;}
 function end(win){if(ended)return;ended=true;won=win;phase='end';phaseT=0;
  if(win){const bonus=pints*25;for(let i=0;i<np;i++)score[i]+=bonus;const stars=pints>=maxPints?3:pints>=maxPints/2?2:1;say('THE WINCHESTER STANDS',`${'★'.repeat(stars)}${'☆'.repeat(3-stars)}  +${bonus} each for the pints left`,'#ffd23a',4);sound('win');}
  else{say('THE WINCHESTER HAS FALLEN','The dead are at the bar.','#ff5a4a',4);sound('lose');}
  for(const h of heroes){h.moodT=0;setMood(h,win?'win':'sad');h.moodT=99;}s.setScores?.(score.slice());}
 function finish(){const totalS=score[0]+(np>1?score[1]:0),secs=Math.floor(clock),cleared=won?WAVES.length:Math.max(0,wave-1);
  s.teamResult={kind:'survival',won,tied:false,humanTotal:totalS,cpuTotal:0,cpuScores:[0,0],duration:secs};
  if(solo){soloProgress(s,score[0],cleared,`wave ${cleared}`);s.solo.won=won;}
  s.finish(np>1?score.slice():[score[0],0],`${won?'The Winchester stands!':'The Winchester fell'} · Sean of the Dead: ${cleared} of ${WAVES.length} waves · ${kills[0]+(kills[1]||0)} zombies · ${pints} pints left.`);}

 // ---------------------------------------------------------------- input
 let drag=null;
 const heroAt=(wx,wy)=>heroes.filter(h=>h.dead<=0).find(h=>Math.hypot(h.x-wx,h.y-18-wy)<34);
 const radial=sp=>LINES.map((ln,j)=>{const a=-Math.PI/2+j*Math.PI*2/LINES.length,r=52;return {line:ln,x:sp.x+Math.cos(a)*r,y:sp.y+Math.sin(a)*r};});
 function tapAt(px,py){
  const wx=WX(px),wy=WY(py);
  for(let i=btns.length-1;i>=0;i--){const b=btns[i];if(px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h){b.act();return;}}
  if(aiming){if(py>top&&py<s.H-bot){usePower('strike',wx,wy);aiming=null;}else aiming=null;return;}
  if(sel?.type==='spot'&&!sel.sp.t){const it=radial(sel.sp).find(m=>Math.hypot(m.x-wx,m.y-wy)<22);if(it){if(sel.line===it.line)build(sel.sp,it.line),sel=null;else{sel.line=it.line;sound('tap');}return;}}
  if(sel?.type==='hero'&&!heroAt(wx,wy)){const h=sel.h;if(wx>=0&&wy>=0&&wx<=MW&&wy<=MH){const onPub=wx>pub.x&&wx<pub.x+pub.w&&wy<pub.y+pub.h;h.hx=onPub?door[0]:wx;h.hy=onPub?door[1]+(wide?0:18):wy;h.target=null;RINGS.push({x:wx,y:wy,r:16,t:.5,max:.5,col:PCOL[h.i]});sound('tap');}sel=null;return;}
  const h=heroAt(wx,wy);if(h){sel={type:'hero',h};sound('tap');return;}
  const sp=spots.find(q=>Math.hypot(q.x-wx,q.y-wy)<SPOT+6);if(sp){sel={type:sp.t?'tower':'spot',sp,line:null};sound('tap');return;}
  if(wx>pub.x&&wx<pub.x+pub.w&&wy>pub.y-30&&wy<pub.y+pub.h){sel={type:'pub'};sound('tap');return;}
  if(Math.hypot(wx-spawnBtn.x,wy-spawnBtn.y)<30&&(phase==='break'||phase==='wave'&&!queue.length)&&wave<WAVES.length){startWave(phase==='break');sel=null;return;}
  sel=null;
 }
 s.on(c,'pointerdown',ev=>{ev.preventDefault();const p=s.pointer(ev);
  if(phase==='intro'){phase='break';breakT=BREAK;return;}if(phase==='end'||phase==='done')return;
  if(p.x<64&&p.y<fb.top+44&&p.y>2){speed=speed===1?2:speed===2?3:1;sound('tap');return;}
  const h=!btns.some(b=>p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)&&heroAt(WX(p.x),WY(p.y));
  if(h){drag={h,id:ev.pointerId,sx:p.x,sy:p.y,cx:WX(p.x),cy:WY(p.y),moved:false};return;}
  tapAt(p.x,p.y);});
 s.on(c,'pointermove',ev=>{if(!drag||ev.pointerId!==drag.id)return;const p=s.pointer(ev);drag.cx=WX(p.x);drag.cy=WY(p.y);if(Math.hypot(p.x-drag.sx,p.y-drag.sy)>10)drag.moved=true;});
 const up=ev=>{if(!drag||ev.pointerId!==drag.id)return;const d=drag;drag=null;
  if(d.moved){const onPub=d.cx>pub.x&&d.cx<pub.x+pub.w&&d.cy<pub.y+pub.h;d.h.hx=onPub?door[0]:clamp(d.cx,8,MW-8);d.h.hy=onPub?door[1]+(wide?0:18):clamp(d.cy,8,MH-8);d.h.target=null;RINGS.push({x:d.h.hx,y:d.h.hy,r:16,t:.5,max:.5,col:PCOL[d.h.i]});sound('tap');sel=null;}
  else{sel=sel?.type==='hero'&&sel.h===d.h?null:{type:'hero',h:d.h};sound('tap');}};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',up);
 s.on(window,'keydown',ev=>{if(ev.key===' '||ev.key==='Enter'){if(phase==='intro'){phase='break';return;}if(phase==='break')startWave(true);}});

 // ---------------------------------------------------------------- drawing helpers
 const U=()=>clamp(Math.min(s.W/390,(s.H-160)/620),.85,1.6);
 const rr=(X,Y,w,h,r)=>{x.beginPath();x.roundRect?x.roundRect(X,Y,w,h,r):x.rect(X,Y,w,h);};
 function txt(t,X,Y,size,col='#fff',weight=800,align='center',max=0){x.font=`${weight} ${Math.round(size)}px system-ui,sans-serif`;x.textAlign=align;x.textBaseline='middle';if(max){let fs=size;while(x.measureText(t).width>max&&fs>8){fs--;x.font=`${weight} ${Math.round(fs)}px system-ui,sans-serif`;}}x.fillStyle=col;x.fillText(t,X,Y);}
 function outline(t,X,Y,size,col,weight=900){x.font=`${weight} ${Math.round(size)}px system-ui,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=Math.max(2,size/5);x.strokeStyle='#000';x.lineJoin='round';x.strokeText(t,X,Y);x.fillStyle=col;x.fillText(t,X,Y);}
 function wrap(t,X,Y,maxW,size,col,lh=1.25,maxLines=3){x.font=`600 ${Math.round(size)}px system-ui,sans-serif`;x.fillStyle=col;x.textAlign='left';x.textBaseline='top';const words=t.split(' ');let line='',n=0;
  for(const w of words){const tt=line?line+' '+w:w;if(x.measureText(tt).width>maxW&&line){x.fillText(line,X,Y+n*size*lh);n++;line=w;if(n>=maxLines)return n;}else line=tt;}if(line){x.fillText(line,X,Y+n*size*lh);n++;}return n;}
 function road(){
  x.lineCap='round';x.lineJoin='round';
  const line=(w,col)=>{x.strokeStyle=col;x.lineWidth=w*k;x.beginPath();path.forEach(([a,b],i)=>i?x.lineTo(SX(a),SY(b)):x.moveTo(SX(a),SY(b)));x.stroke();};
  line(ROAD*2+14,'#7d7d76');line(ROAD*2+7,'#55554f');line(ROAD*2,'#37373b');
  x.setLineDash([9*k,11*k]);line(1.8,'#d8d4c4');x.setLineDash([]);
 }
 function drawPub(){
  const px=SX(pub.x),py=SY(pub.y),pw=pub.w*k,ph=pub.h*k;
  x.fillStyle='#2a1a14';x.fillRect(px,py-44*k,pw,ph+44*k);x.fillStyle='#5a2a22';x.fillRect(px+3*k,py,pw-6*k,ph-4*k);
  for(let yy=py+4*k;yy<py+ph-4*k;yy+=7*k){x.fillStyle='rgba(0,0,0,.08)';x.fillRect(px+3*k,yy,pw-6*k,1);}
  x.fillStyle='#1c1210';x.fillRect(px-4*k,py-6*k,pw+8*k,8*k);
  if(pubLv.door){x.strokeStyle='#8a6a3a';x.lineWidth=4*k;for(let i=0;i<pubLv.door*2;i++){const xx=px+pw*(.1+i*.22);x.beginPath();x.moveTo(xx,py+ph*.45);x.lineTo(xx+pw*.12,py+ph*.95);x.stroke();}}
  const swd=wide?Math.min(pw*.94,ph*.9):pw*.86,sh=24*k,sx0=px+(pw-swd)/2,sy0=py+8*k;
  x.fillStyle='#5b0f14';x.fillRect(sx0,sy0,swd,sh);x.strokeStyle='#c8a24a';x.lineWidth=2*k;x.strokeRect(sx0+2*k,sy0+2*k,swd-4*k,sh-4*k);
  x.fillStyle='#f2d27a';x.textAlign='center';x.textBaseline='middle';let fs=Math.round(16*k);x.font=`900 ${fs}px Georgia,serif`;
  while(x.measureText('THE WINCHESTER').width>swd-10*k&&fs>6){fs--;x.font=`900 ${fs}px Georgia,serif`;}x.fillText('THE WINCHESTER',sx0+swd/2,sy0+sh/2+1);
  const nw=wide?3:4,wh0=wide?(ph-sh-60*k)/3-8*k:Math.max(10*k,ph-sh-40*k);
  for(let i=0;i<nw;i++){const ww=wide?pw*.56:pw/6,wx=wide?px+pw*.14:px+pw*(.08+i*.24)+(i>1?pw*.06:0),wy=sy0+sh+8*k+(wide?i*(wh0+8*k):0);if(!wide&&i===2)continue;
   const gl=x.createLinearGradient(0,wy,0,wy+wh0);gl.addColorStop(0,'#ffcf6a');gl.addColorStop(1,'#c9772a');x.fillStyle=gl;x.fillRect(wx,wy,ww,wh0);x.strokeStyle='#1c1210';x.lineWidth=2*k;x.strokeRect(wx,wy,ww,wh0);
   x.beginPath();x.moveTo(wx+ww/2,wy);x.lineTo(wx+ww/2,wy+wh0);x.moveTo(wx,wy+wh0/2);x.lineTo(wx+ww,wy+wh0/2);x.stroke();}
  const [dx,dy]=door;x.save();x.translate(SX(dx),wide?SY(dy)-22*k:py+ph-38*k);if(wide)x.translate(-pw*.3,0);x.strokeStyle='#3a2410';x.lineWidth=3*k;x.beginPath();x.moveTo(-16*k,0);x.lineTo(16*k,0);x.stroke();x.strokeStyle='#999';x.lineWidth=1.5*k;x.beginPath();x.moveTo(-2*k,-1*k);x.lineTo(18*k,-1*k);x.stroke();x.restore();
  x.fillStyle='#1a0e08';if(wide)x.fillRect(px+pw-10*k,SY(dy)-14*k,10*k,28*k);else x.fillRect(SX(dx)-14*k,py+ph-30*k,28*k,30*k);
  const hx=wide?px+pw+14*k:px+pw-26*k,hy=wide?py+ph*.18:py+ph-18*k;x.save();x.translate(hx,hy);x.strokeStyle='#222';x.lineWidth=2*k;x.beginPath();x.moveTo(-10*k,-14*k);x.lineTo(10*k,-14*k);x.stroke();x.rotate(Math.sin(clock*1.6)*.12);
  x.fillStyle='#5b0f14';x.beginPath();x.ellipse(0,0,12*k,10*k,0,0,7);x.fill();x.strokeStyle='#c8a24a';x.stroke();x.fillStyle='#f2d27a';x.font=`900 ${Math.round(11*k)}px Georgia,serif`;x.fillText('W',0,1);x.restore();
  if(pubLv.turret){const tx=SX(dx)+(wide?0:-pw*.3),ty=wide?SY(dy)+pw*.3:py+ph-12*k;x.fillStyle='#ffe28a';if(pubCool>PUB.turret.levels[pubLv.turret-1].rate-.08){x.beginPath();x.arc(tx,ty,4*k,0,7);x.fill();}}
  // pints
  const pX=wide?px+pw/2:SX(dx),pY=wide?py+ph-14*k:py+ph+14*k;rr(pX-30*k,pY-10*k,60*k,20*k,10*k);x.fillStyle='rgba(0,0,0,.6)';x.fill();txt(`🍺 ${pints}`,pX,pY+1,13*k,pints<6?'#ff8a7a':'#fff');
  if(sel?.type==='pub'){x.strokeStyle='#ffd23a';x.lineWidth=3;x.strokeRect(px-4,py-48*k,pw+8,ph+52*k);}
 }
 function drawDecor(d){
  const X=SX(d.x),Y=SY(d.y);
  if(d.k==='lamp'){x.fillStyle='#222';x.fillRect(X-1.5*k,Y-28*k,3*k,28*k);const g=x.createRadialGradient(X,Y-28*k,1,X,Y-28*k,30*k);g.addColorStop(0,'rgba(255,220,140,.45)');g.addColorStop(1,'rgba(255,220,140,0)');x.fillStyle=g;x.beginPath();x.arc(X,Y-28*k,30*k,0,7);x.fill();x.fillStyle='#ffe2a0';x.beginPath();x.arc(X,Y-28*k,3*k,0,7);x.fill();}
  else if(d.k==='box'){x.fillStyle='#c4121a';x.fillRect(X-7*k,Y-28*k,14*k,28*k);x.fillStyle='#ffd9b0';x.fillRect(X-5*k,Y-24*k,10*k,14*k);}
  else if(d.k==='bin'){x.fillStyle='#2d3a2d';x.fillRect(X-6*k,Y-12*k,12*k,12*k);x.fillStyle='#1d261d';x.fillRect(X-7*k,Y-14*k,14*k,3*k);}
  else if(d.k==='car'){x.fillStyle='#8a1a1a';rr(X-20*k,Y-10*k,40*k,20*k,6*k);x.fill();x.fillStyle='#bcd7e8';x.fillRect(X-8*k,Y-8*k,10*k,16*k);}
  else if(d.k==='wreck'){x.save();x.translate(X,Y);x.rotate(.5);x.fillStyle='#3a3a3e';rr(-18*k,-9*k,36*k,18*k,5*k);x.fill();x.fillStyle='#222';x.fillRect(-6*k,-7*k,10*k,14*k);x.restore();const t=clock*3;for(let i=0;i<3;i++){x.fillStyle=`rgba(255,${120+i*40},40,${.5+.3*Math.sin(t+i)})`;x.beginPath();x.arc(X+(i-1)*5*k,Y-6*k-Math.abs(Math.sin(t*1.3+i))*6*k,(3+i)*k,0,7);x.fill();}}
  else if(d.k==='hedge'){x.fillStyle='#21401c';x.beginPath();x.ellipse(X,Y,26*k,9*k,0,0,7);x.fill();x.fillStyle='#2c5524';x.beginPath();x.ellipse(X-4*k,Y-2*k,20*k,6*k,0,0,7);x.fill();}
  else if(d.k==='bench'){x.fillStyle='#6a4a2a';x.fillRect(X-14*k,Y-4*k,28*k,5*k);x.fillRect(X-14*k,Y-10*k,28*k,3*k);}
 }
 function body(X,Y,sc,shirt,pants,walk,hit,arms,lean=0){
  const lg=Math.sin(walk)*4*sc;x.save();x.translate(X,Y);x.rotate(lean);
  x.strokeStyle=hit?'#fff':pants;x.lineWidth=3.4*sc;x.lineCap='round';x.beginPath();x.moveTo(-3*sc,0);x.lineTo(-3*sc+lg,9*sc);x.moveTo(3*sc,0);x.lineTo(3*sc-lg,9*sc);x.stroke();
  x.fillStyle=hit?'#fff':shirt;rr(-7*sc,-15*sc,14*sc,16*sc,3*sc);x.fill();x.fillStyle='rgba(0,0,0,.18)';x.fillRect(2*sc,-15*sc,5*sc,16*sc);
  if(arms!==null){x.strokeStyle=hit?'#fff':shirt;x.lineWidth=2.8*sc;x.beginPath();x.moveTo(-5*sc,-12*sc);x.lineTo(-5*sc+arms*10*sc,-13*sc+Math.sin(walk*.7)*1.5*sc);x.moveTo(5*sc,-12*sc);x.lineTo(5*sc+arms*10*sc,-11*sc-Math.sin(walk*.7)*1.5*sc);x.stroke();
   x.fillStyle='#b8a890';x.beginPath();x.arc(-5*sc+arms*10*sc,-13*sc,1.8*sc,0,7);x.arc(5*sc+arms*10*sc,-11*sc,1.8*sc,0,7);x.fill();}
  x.restore();
 }
 function drawZ(z){
  const X=SX(z.x),Y=SY(z.y),t=z.t,sc=k*1.75*t.size,al=z.dead?Math.max(0,z.dead/.7):Math.min(1,z.spawnT*3);x.globalAlpha=al;
  const dir=Math.cos(z.ang)<-.2?-1:1,fall=z.dead?(1-z.dead/.7)*1.4*dir:0;
  x.fillStyle='rgba(0,0,0,.32)';x.beginPath();x.ellipse(X,Y+9*sc,9*sc,3.4*sc,0,0,7);x.fill();
  if(t.crawl){x.save();x.translate(X,Y+5*sc);x.fillStyle=t.shirt;rr(-10*sc,-6*sc,20*sc,9*sc,3*sc);x.fill();x.strokeStyle='#8a9a72';x.lineWidth=2.4*sc;x.beginPath();x.moveTo(dir*9*sc,-2*sc);x.lineTo(dir*15*sc,3*sc+Math.sin(z.wob)*2*sc);x.stroke();x.restore();}
  else body(X,Y-2*sc,sc,t.shirt,t.pants,z.wob,z.hitT>0,z.blocker?dir*.6:dir,fall+Math.sin(z.wob*.5)*.06);
  if(!z.dead){x.fillStyle='rgba(120,10,10,.55)';x.beginPath();x.arc(X-2*sc,Y-10*sc,2.4*sc,0,7);x.arc(X+3*sc,Y-5*sc,1.6*sc,0,7);x.fill();}
  const hs=(t.boss?28:21)*sc/(t.boss?1.35:1),hx=X+(t.crawl?dir*8*sc:fall*8*sc),hy=t.crawl?Y-2*sc:Y-15*sc-hs*.4;const hc=head(z.face,'normal',t.boss?160:96);
  if(hc&&hc.width){x.save();x.translate(hx,hy);if(dir<0)x.scale(-1,1);x.rotate(Math.sin(z.wob*.5)*.08+fall*.5);x.drawImage(hc,-hs/2,-hs/2,hs,hs);x.restore();}
  if(t.helmet){x.fillStyle='#1a2230';x.beginPath();x.arc(hx,hy-hs*.12,hs*.48,Math.PI,0);x.fill();x.fillStyle='rgba(160,200,255,.35)';x.fillRect(hx-hs*.45,hy-hs*.12,hs*.9,hs*.18);}
  if(t.scream&&!z.dead&&Math.sin(clock*6+z.id)>.4){x.strokeStyle='rgba(255,255,255,.5)';x.lineWidth=1.5;x.beginPath();x.arc(hx,hy,hs*.8,0,7);x.stroke();}
  if(z.stun>0){txt('💫',hx,hy-hs*.6,10*k);}else if(z.slow>.05){txt('♪',hx+hs*.55,hy-hs*.4,10*k,'#ff7ad9');}
  if(!z.dead&&z.hp<z.max){const w=Math.max(18*sc,22*k);x.fillStyle='#000a';x.fillRect(X-w/2,hy-hs*.65,w,3.5*k);x.fillStyle=t.boss?'#c45aff':z.t.armor?'#8fb4ff':'#e33';x.fillRect(X-w/2,hy-hs*.65,w*Math.max(0,z.hp/z.max),3.5*k);}
  x.globalAlpha=1;
 }
 function drawMan(m,sp){
  if(m.dead>0)return;const X=SX(m.x),Y=SY(m.y),sc=k*1.25,n=curNode(sp.t),col=PCOL[sp.owner];
  const riot=n.block>1,kat=n.cleave;body(X,Y,sc,riot?'#1e2a3a':col,riot?'#141c26':'#2a2a33',m.walk||0,false,null);
  x.fillStyle='#e8c09a';x.beginPath();x.arc(X,Y-21*sc,5.5*sc,0,7);x.fill();if(riot){x.fillStyle='#10161e';x.beginPath();x.arc(X,Y-22*sc,6.2*sc,Math.PI,0);x.fill();}
  if(riot){x.fillStyle='rgba(170,200,230,.55)';rr(X+3*sc,Y-20*sc,8*sc,20*sc,2*sc);x.fill();x.strokeStyle='#cfe0f0';x.lineWidth=1;x.stroke();}
  else{const a=m.swing>0?-1.3:.4;x.save();x.translate(X+5*sc,Y-11*sc);x.rotate(a);x.strokeStyle=kat?'#e8eef5':'#d8c08a';x.lineWidth=(kat?1.6:2.2)*sc;x.beginPath();x.moveTo(0,0);x.lineTo((kat?20:18)*sc,0);x.stroke();x.restore();}
  if(m.hp<m.max){x.fillStyle='#000a';x.fillRect(X-9*sc,Y-33*sc,18*sc,2.6*k);x.fillStyle='#5fd35f';x.fillRect(X-9*sc,Y-33*sc,18*sc*m.hp/m.max,2.6*k);}
 }
 function drawHero(h){
  if(h.dead>0){const X=SX(door[0]),Y=SY(door[1])+(wide?0:24*k);rr(X-50*k,Y-9*k,100*k,18*k,9*k);x.fillStyle='rgba(0,0,0,.6)';x.fill();txt(`${s.players[h.i].name} back in ${Math.ceil(h.dead)}`,X,Y+1,10*k,'#fff');return;}
  const X=SX(h.x),Y=SY(h.y),sc=k*1.8,W=HERO_WEAPONS[h.w],hurtNow=(h.hurtT||0)>0;h.hurtT=Math.max(0,(h.hurtT||0)-1/60);
  const isSel=sel?.type==='hero'&&sel.h===h;
  x.fillStyle=PCOL[h.i]+(isSel?'88':'44');x.beginPath();x.ellipse(X,Y+10*sc,13*sc,5*sc,0,0,7);x.fill();x.strokeStyle=PCOL[h.i];x.lineWidth=isSel?3:2;x.stroke();
  body(X,Y,sc,PCOL[h.i],'#2a2a33',h.walk,false,null);
  x.save();x.translate(X+6*sc*h.face,Y-11*sc);
  if(W.dps){x.scale(h.face,1);x.fillStyle='#e0a020';rr(-2*sc,-3*sc,10*sc,6*sc,1.5*sc);x.fill();x.fillStyle='#bbb';x.fillRect(7*sc,-1.5*sc,12*sc,3*sc);x.strokeStyle='#666';x.setLineDash([1.5*sc,1.5*sc]);x.lineDashOffset=-clock*60;x.lineWidth=1.2*sc;x.strokeRect(7*sc,-2*sc,12*sc,4*sc);x.setLineDash([]);}
  else{x.rotate((h.swing>0?-1.5:.5)*h.face);x.fillStyle=h.w===1?'#9a7a4a':'#e8d6a4';x.fillRect(-1.5*sc,0,3*sc,7*sc);x.fillRect(-3*sc,7*sc,6*sc,16*sc);if(h.w===1){x.strokeStyle='#ccc';x.lineWidth=.8*sc;for(let i=0;i<5;i++){x.beginPath();x.moveTo(-3.5*sc,9*sc+i*3*sc);x.lineTo(3.5*sc,10.5*sc+i*3*sc);x.stroke();}}}
  x.restore();
  if(W.gun){x.save();x.translate(X-6*sc*h.face,Y-10*sc);x.scale(-h.face,1);x.fillStyle='#4a3a2a';x.fillRect(0,-1.5*sc,6*sc,3*sc);x.fillStyle='#777';x.fillRect(6*sc,-1.5*sc,9*sc,1.4*sc);x.fillRect(6*sc,.2*sc,9*sc,1.4*sc);x.restore();}
  const hc=head(h.id,h.mood,128),hs=30*sc;if(hc&&hc.width){x.save();x.translate(X,Y-15*sc-hs*.4);if(h.face<0)x.scale(-1,1);x.drawImage(hc,-hs/2,-hs/2,hs,hs);x.restore();}
  if(hurtNow){x.globalAlpha=.3;x.fillStyle='#ff2020';x.beginPath();x.arc(X,Y-15*sc-hs*.4,hs*.42,0,7);x.fill();x.globalAlpha=1;}
  const by=Y-15*sc-hs*.95;x.fillStyle='#000a';x.fillRect(X-15*sc,by,30*sc,4*k);x.fillStyle=h.hp<h.max*.35?'#ff5a3a':'#5fd35f';x.fillRect(X-15*sc,by,30*sc*h.hp/h.max,4*k);
  rr(X-15*sc-16*k,by-4*k,14*k,12*k,3*k);x.fillStyle=PCOL[h.i];x.fill();txt(String(h.lvl),X-15*sc-9*k,by+2*k,9*k,'#fff',900);
  if(isSel){x.strokeStyle=PCOL[h.i]+'66';x.setLineDash([4,4]);x.beginPath();x.arc(SX(h.hx),SY(h.hy),95*k,0,7);x.stroke();x.setLineDash([]);}
 }
 function towerBody(sp,X,Y,r){
  const t=sp.t,n=curNode(t),L=TOWERS[t.line],apex=t.tier>=4;
  if(apex){const g=x.createRadialGradient(X,Y,r*.3,X,Y,r*1.5);g.addColorStop(0,'rgba(255,210,60,0)');g.addColorStop(1,`rgba(255,210,60,${.2+.1*Math.sin(clock*4)})`);x.fillStyle=g;x.beginPath();x.arc(X,Y,r*1.5,0,7);x.fill();}
  x.fillStyle=apex?'#2a1e10':'#2e2318';x.beginPath();x.arc(X,Y,r,0,7);x.fill();
  x.fillStyle='#8a7a5a';for(let i=0;i<8;i++){const a=i/8*Math.PI*2;x.beginPath();x.ellipse(X+Math.cos(a)*r*.82,Y+Math.sin(a)*r*.82,r*.22,r*.14,a,0,7);x.fill();}
  x.strokeStyle=apex?'#ffd23a':L.col;x.lineWidth=apex?3:2;x.beginPath();x.arc(X,Y,r,0,7);x.stroke();
  const kind=n.kind;x.save();x.translate(X,Y-4*k);
  if(kind==='spread'||kind==='rifle'){x.rotate(t.aim);const len=kind==='rifle'?(n.first?14:20+(n.pierce?6:0))*k:13*k,col=kind==='rifle'?'#999':'#5a4a3a';
   x.fillStyle=apex?'#3a2a1a':'#4a3a2a';rr(-7*k,-4*k,12*k,8*k,2*k);x.fill();
   if(n.first){x.fillStyle='#777';for(let i=0;i<(t.tier>=5?2:1);i++){const oy2=i?3.5*k:0;for(let j=0;j<4;j++)x.fillRect(4*k,oy2-1.5*k+Math.sin(clock*40*t.spin+j)*1.2*k,len,1.2*k);}}
   else{x.fillStyle=col;x.fillRect(3*k,-1.8*k,len,1.6*k);if(kind==='spread')x.fillRect(3*k,.4*k,len,1.6*k);}
   if(t.flash>0){x.fillStyle=n.burn?'#ff8a20':'#ffe28a';x.beginPath();x.arc(len+5*k,0,(kind==='rifle'&&n.pierce?7:5)*k,0,7);x.fill();}}
  else if(kind==='saw'){const sp2=clock*(t.spin?22:4);x.rotate(sp2);x.strokeStyle='#ccc';x.lineWidth=3*k;x.beginPath();x.arc(0,0,r*.55,0,7);x.stroke();for(let i=0;i<10;i++){const a=i/10*Math.PI*2;x.fillStyle='#ddd';x.fillRect(Math.cos(a)*r*.55-1.5,Math.sin(a)*r*.55-1.5,3,3);}x.rotate(-sp2);x.fillStyle='#e0a020';x.beginPath();x.arc(0,0,r*.3,0,7);x.fill();txt('🪚',0,0,10*k);}
  else if(kind==='lob'){x.rotate(t.aim);x.fillStyle=t.line==='fire'?'#6a3a1a':'#4a4a50';rr(-6*k,-6*k,12*k,12*k,3*k);x.fill();x.fillStyle=t.line==='fire'?'#c84a1a':'#777';const bl=(t.tier>=4&&t.branch==='B'?20:t.tier>=3?14:11)*k;x.fillRect(2*k,-3*k,bl,6*k);
   if(t.line==='fire'){x.rotate(-t.aim);x.fillStyle='#3a7a3a';x.fillRect(-3*k,-12*k,4*k,8*k);x.fillStyle=`rgba(255,${150+60*Math.sin(clock*12)},40,.9)`;x.beginPath();x.arc(-1*k,-13*k,2.5*k,0,7);x.fill();}}
  else if(kind==='flame'){x.rotate(t.aim);x.fillStyle='#8a2a1a';rr(-8*k,-7*k,13*k,14*k,4*k);x.fill();x.fillStyle='#666';x.fillRect(4*k,-2*k,(t.tier>=4?18:12)*k,4*k);if(t.flash>0){x.fillStyle='#ff9a30';x.beginPath();x.arc((t.tier>=4?24:18)*k,0,4*k,0,7);x.fill();}}
  else if(kind==='crew'){x.fillStyle='#2d6a3a';x.fillRect(-11*k,-11*k,22*k,13*k);x.strokeStyle='#6a4a2a';x.lineWidth=2*k;x.strokeRect(-11*k,-11*k,22*k,13*k);txt(n.cleave?'⚔️':n.block>1?'🛡️':'🎱',0,-4*k,11*k);}
  else if(kind==='pulse'){const g=t.flash>0?1:.45,siren=t.tier>=4&&t.branch==='B';x.fillStyle=siren?'#555':'#6a2a7a';rr(-11*k,-17*k,22*k,24*k,[10*k,10*k,2*k,2*k]);x.fill();
   if(siren){x.fillStyle=`rgba(255,80,60,${.5+.5*Math.sin(clock*8)})`;x.beginPath();x.arc(0,-8*k,6*k,0,7);x.fill();}else{x.fillStyle=`rgba(255,200,90,${g})`;x.beginPath();x.arc(0,-8*k,6*k,0,7);x.fill();x.fillStyle=`rgba(122,217,255,${g})`;x.fillRect(-8*k,0,16*k,3*k);}
   if(t.flash>0){x.strokeStyle='rgba(255,122,217,.45)';x.lineWidth=2;x.beginPath();x.arc(0,4*k,n.range*k*(1-t.flash/.35),0,7);x.stroke();}}
  else if(kind==='mines'){x.fillStyle='#3a4a2a';rr(-10*k,-8*k,20*k,14*k,3*k);x.fill();txt('💣',0,-1*k,11*k);}
  x.restore();
  for(let i=0;i<t.tier;i++){const px=X-(t.tier-1)*4.5*k+i*9*k;x.fillStyle=i>=3?'#ffd23a':'#fff';x.beginPath();x.arc(px,Y+r-3*k,2.6*k,0,7);x.fill();x.strokeStyle='#000';x.lineWidth=1;x.stroke();}
 }
 function drawSpot(sp){
  const X=SX(sp.x),Y=SY(sp.y),r=SPOT*k,col=PCOL[sp.owner];
  if(!sp.t){x.fillStyle='rgba(30,22,14,.78)';x.beginPath();x.arc(X,Y,r,0,7);x.fill();x.strokeStyle=col;x.lineWidth=2;x.setLineDash([5,4]);x.stroke();x.setLineDash([]);txt('+',X,Y+1,16*k,col,900);return;}
  towerBody(sp,X,Y,r);
 }
 function rangeRing(sp,rng,col){x.strokeStyle=col+'aa';x.fillStyle=col+'1c';x.lineWidth=1.5;x.beginPath();x.arc(SX(sp.x),SY(sp.y),rng*k,0,7);x.fill();x.stroke();}
 function drawRadial(sp){const col=PCOL[sp.owner];x.strokeStyle=col+'aa';x.lineWidth=2;x.beginPath();x.arc(SX(sp.x),SY(sp.y),52*k,0,7);x.stroke();
  if(sel.line)rangeRing(sp,node(sel.line,1).range,TOWERS[sel.line].col);
  for(const it of radial(sp)){const X=SX(it.x),Y=SY(it.y),L=TOWERS[it.line],n=node(it.line,1),afford=money[sp.owner]>=n.cost,on=sel.line===it.line;
   x.fillStyle=on?'#3a2a10':'#1b1420';x.beginPath();x.arc(X,Y,(on?21:18)*k,0,7);x.fill();x.strokeStyle=on?'#ffd23a':afford?L.col:'#666';x.lineWidth=on?3:2;x.stroke();
   txt(L.icon,X,Y,15*k);rr(X-17*k,Y+14*k,34*k,13*k,6*k);x.fillStyle='rgba(0,0,0,.75)';x.fill();txt(`£${n.cost}`,X,Y+20.5*k,9.5*k,afford?'#ffd23a':'#999',900);}}
 // ---------------------------------------------------------------- the card (bottom sheet)
 const cardH=()=>Math.min(s.H*(wide?.56:.36),210*U());
 // the card goes to the top when what it's about sits in the lower half (so it never covers its own ring menu)
 const cardTop=()=>{const o=sel?.sp||sel?.h;return !!o&&SY(o.y)>s.H*.5;};
 function button(X,Y,w,h,label,sub,act,{on=true,col='#ffd23a',dark=false}={}){rr(X,Y,w,h,12);x.fillStyle=!on?'#3a3a40':dark?'#1e1a26':col;x.fill();if(dark){x.strokeStyle=col;x.lineWidth=2;x.stroke();}
  txt(label,X+w/2,Y+h*(sub?.36:.5),Math.min(15*U(),h*.34),!on?'#999':dark?'#fff':'#1a1208',900,'center',w-10);if(sub)txt(sub,X+w/2,Y+h*.72,Math.min(12*U(),h*.26),!on?'#888':dark?'#ffd23a':'#3a2408',800,'center',w-8);
  btns.push({x:X,y:Y,w,h,act});}
 function drawCard(){
  if(!sel||sel.type==='spot'&&!sel.line)return;const u=U(),W=s.W,H=s.H,ch=cardH(),cx0=8,cw=W-16,cy0=cardTop()&&!wide?top+2:H-ch-6;
  rr(cx0,cy0,cw,ch,18);x.fillStyle='rgba(16,12,22,.95)';x.fill();x.strokeStyle='rgba(255,210,60,.5)';x.lineWidth=2;x.stroke();
  btns.push({x:cx0,y:cy0,w:cw,h:ch,act:()=>{}});   // taps on the card never fall through to the map
  const pad=14*u,X=cx0+pad,Y=cy0+pad,inner=cw-pad*2;
  btns.push({x:cx0+cw-44,y:cy0,w:44,h:40,act:()=>{sel=null;}});txt('✕',cx0+cw-22,cy0+20,18,'#aaa');
  if(sel.type==='spot'){const L=TOWERS[sel.line],n=node(sel.line,1),own=sel.sp.owner;
   txt(`${L.icon}  ${n.name}`,X,Y+10*u,19*u,'#fff',900,'left',inner-50);txt(`${L.name} line · tier 1 of 5 · tap the icon again to build`,X,Y+32*u,12*u,L.col,800,'left',inner-40);
   wrap(n.desc,X,Y+46*u,inner,13*u,'#ddd');statLine(n,X,cy0+ch-pad-80*u,inner);
   button(X,cy0+ch-pad-46*u,inner,46*u,`BUILD £${n.cost}`,null,()=>{build(sel.sp,sel.line);sel=null;},{on:money[own]>=n.cost});return;}
  if(sel.type==='tower'){const sp=sel.sp,t=sp.t;if(!t){sel=null;return;}const n=curNode(t),L=TOWERS[t.line],own=sp.owner;
   txt(`${L.icon}  ${n.name}`,X,Y+10*u,19*u,'#fff',900,'left',inner-130);
   txt(`${'★'.repeat(t.tier)}${'☆'.repeat(5-t.tier)}`,X+inner-50,Y+10*u,14*u,'#ffd23a',900,'right');
   const sellAmt=Math.floor(t.spent*.6);
   if(t.tier===3){const w2=(inner-10)/2;[['A',node(t.line,4,'A')],['B',node(t.line,4,'B')]].forEach(([b,nn],j)=>{const bx=X+j*(w2+10),by=Y+26*u,bh=ch-pad*2-26*u-40*u;
     rr(bx,by,w2,bh,12);x.fillStyle='rgba(255,210,60,.08)';x.fill();x.strokeStyle='rgba(255,210,60,.5)';x.lineWidth=1.5;x.stroke();
     txt(nn.name,bx+w2/2,by+14*u,14*u,'#ffd23a',900,'center',w2-10);wrap(nn.desc,bx+8,by+26*u,w2-16,11*u,'#ddd',1.2,4);
     button(bx+6,by+bh-38*u,w2-12,32*u,`£${nn.cost}`,null,()=>upgrade(sp,b),{on:money[own]>=nn.cost});});
    button(X,cy0+ch-pad-32*u,inner*.4,32*u,`SELL +£${sellAmt}`,null,()=>{sell(sp);sel=null;},{dark:true,col:'#ff8a7a'});
    txt('Pick a path — only one!',X+inner*.42+6,cy0+ch-pad-16*u,11*u,'#aaa',700,'left',inner*.58-6);return;}
   wrap(n.desc,X,Y+30*u,inner,13*u,'#ddd',1.25,2);statLine(n,X,Y+64*u,inner);
   const nx=t.tier<5?node(t.line,t.tier+1,t.branch):null,bw=inner*.62;
   if(nx){button(X,cy0+ch-pad-50*u,bw,50*u,`${t.tier===4?'MAX: ':'UPGRADE: '}${nx.name}`,`£${nx.cost}`,()=>upgrade(sp),{on:money[own]>=nx.cost});wrap(nx.desc,X,Y+84*u,inner,11*u,'#9a9aa8',1.2,1);}
   else{rr(X,cy0+ch-pad-50*u,bw,50*u,12);x.fillStyle='rgba(255,210,60,.15)';x.fill();txt('MAXED OUT 🔥',X+bw/2,cy0+ch-pad-25*u,15*u,'#ffd23a',900);}
   button(X+bw+10,cy0+ch-pad-50*u,inner-bw-10,50*u,'SELL',`+£${sellAmt}`,()=>{sell(sp);sel=null;},{dark:true,col:'#ff8a7a'});return;}
  if(sel.type==='hero'){const h=sel.h,W=HERO_WEAPONS[h.w],nx=HERO_WEAPONS[h.w+1],own=h.owner;
   const hc=head(h.id,'normal',128);if(hc&&hc.width)x.drawImage(hc,X,Y,48*u,48*u);
   txt(s.players[h.i].name,X+56*u,Y+12*u,18*u,'#fff',900,'left',inner-110);txt(`Level ${h.lvl}${h.lvl<10?` · ${Math.floor(h.xp)}/${Math.floor(40*Math.pow(h.lvl,1.6))} XP`:' · MAX'}`,X+56*u,Y+34*u,12*u,'#7dff8a',800,'left');
   txt(`🗡 ${W.name}  ·  ❤ ${Math.ceil(h.hp)}/${h.max}`,X,Y+64*u,13*u,'#ffd23a',800,'left',inner);
   txt('Tap the road to send them there (or drag them).',X,Y+86*u,12*u,'#aaa',600,'left',inner);
   if(nx)button(X,cy0+ch-pad-50*u,inner,50*u,`WEAPON: ${nx.name}  £${nx.cost}`,nx.desc,()=>upgradeWeapon(h),{on:money[own]>=nx.cost});
   else{rr(X,cy0+ch-pad-50*u,inner,50*u,12);x.fillStyle='rgba(255,210,60,.15)';x.fill();txt('FULLY ARMED: chainsaw + boomstick 🔥',X+inner/2,cy0+ch-pad-25*u,14*u,'#ffd23a',900,'center',inner-10);}return;}
  if(sel.type==='pub'){txt('🍺  The Winchester',X,Y+10*u,19*u,'#fff',900,'left');txt(np>1?'Upgrades cost half each':'Upgrades for the pub',X,Y+32*u,12*u,'#aaa',700,'left');
   const keys=['door','turret','tab'],w3=(inner-16)/3;keys.forEach((key,j)=>{const P=PUB[key],L=P.levels[pubLv[key]],bx=X+j*(w3+8),by=Y+46*u,bh=ch-pad*2-46*u;
    rr(bx,by,w3,bh,12);x.fillStyle='rgba(255,255,255,.05)';x.fill();txt(P.icon,bx+w3/2,by+16*u,18*u);txt(P.name,bx+w3/2,by+36*u,11*u,'#fff',900,'center',w3-8);
    txt(`${'●'.repeat(pubLv[key])}${'○'.repeat(P.levels.length-pubLv[key])}`,bx+w3/2,by+52*u,11*u,'#ffd23a');
    if(L){const share=np>1?Math.ceil(L.cost/2):L.cost;wrap(L.desc,bx+6,by+62*u,w3-12,10*u,'#ccc',1.2,2);button(bx+5,by+bh-40*u,w3-10,36*u,`£${L.cost}`,null,()=>pubUpgrade(key),{on:money.slice(0,np).every(m=>m>=share)});}
    else txt('MAX',bx+w3/2,by+bh-22*u,13*u,'#ffd23a',900);});return;}
 }
 function statLine(n,X,Y,w){const st=[];if(n.dmg)st.push(`💥 ${n.dmg}${n.pellets?`×${n.pellets}`:''}`);if(n.dps)st.push(`🔥 ${n.dps}/s`);if(n.range)st.push(`🎯 ${n.range}`);if(n.rate)st.push(`⏱ ${(1/n.rate).toFixed(1)}/s`);if(n.men)st.push(`👥 ${n.men} · ❤ ${n.hp}`);if(n.slow)st.push(`🐌 ${Math.round(n.slow*100)}%`);if(n.splash)st.push(`💣 ${n.splash}`);
  txt(st.join('   '),X,Y+8,12*U(),'#9fd0ff',800,'left',w);}
 // ---------------------------------------------------------------- HUD + bottom bar
 function hud(){
  const Ht=34,t0=4;x.textBaseline='middle';
  rr(6,t0,60,Ht,10);x.fillStyle='#000a';x.fill();txt(speed===1?'▶ 1x':speed===2?'⏩ 2x':'⏩ 3x',36,t0+Ht/2,14,'#fff',900);
  const wt=`WAVE ${wave}/${WAVES.length}`;x.font='900 14px system-ui';const ww=x.measureText(wt).width+20;rr(72,t0,ww,Ht,10);x.fillStyle='#000a';x.fill();txt(wt,72+ww/2,t0+Ht/2,14,'#ffd23a',900);
  rr(78+ww,t0,70,Ht,10);x.fillStyle='#000a';x.fill();txt(`🍺 ${pints}`,113+ww,t0+Ht/2,14,pints<6?'#ff8a7a':'#fff',900);
  const y2=t0+Ht+6;
  for(let i=0;i<np;i++){const t=`£${money[i]}`;x.font='900 15px system-ui';const w=x.measureText(t).width+46,px=i===0?6:s.W-6-w;
   rr(px,y2,w,Ht,10);x.fillStyle='#000a';x.fill();x.strokeStyle=PCOL[i];x.lineWidth=2;x.stroke();const hc=head(s.players[i].character,'normal',64);if(hc&&hc.width)x.drawImage(hc,px+4,y2+3,28,28);txt(t,px+36,y2+Ht/2,15,'#fff',900,'left');}
 }
 function circleBtn(X,Y,r,icon,cdFrac,label,act,col='#ffd23a',img=null){x.fillStyle='rgba(10,8,14,.88)';x.beginPath();x.arc(X,Y,r,0,7);x.fill();
  if(img&&img.width){x.save();x.beginPath();x.arc(X,Y,r-3,0,7);x.clip();x.drawImage(img,X-r,Y-r,r*2,r*2);x.restore();}else txt(icon,X,Y,r*.9);
  if(cdFrac>0){x.fillStyle='rgba(0,0,0,.6)';x.beginPath();x.moveTo(X,Y);x.arc(X,Y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*cdFrac);x.fill();}
  x.strokeStyle=cdFrac>0?'#555':col;x.lineWidth=3;x.beginPath();x.arc(X,Y,r,0,7);x.stroke();
  rr(X-r,Y+r-6,r*2,14,7);x.fillStyle='rgba(0,0,0,.8)';x.fill();txt(label,X,Y+r+1,9.5,cdFrac>0?'#aaa':col,900,'center',r*2-4);
  btns.push({x:X-r,y:Y-r,w:r*2,h:r*2+8,act});}
 function bar(){
  if(sel&&!(sel.type==='spot'&&!sel.line)&&!cardTop())return;const r=Math.min(28,s.W/14),Y=wide?s.H-r-16:s.H-bot/2-4;
  circleBtn(r+14,Y,r,POWERS.bus.icon,powers.bus.cd/POWERS.bus.cd,powers.bus.cd>0?Math.ceil(powers.bus.cd)+'s':'BUS',()=>usePower('bus'));
  circleBtn(r*3+26,Y,r,POWERS.strike.icon,powers.strike.cd/POWERS.strike.cd,powers.strike.cd>0?Math.ceil(powers.strike.cd)+'s':aiming?'TAP MAP':'STRIKE',()=>{if(powers.strike.cd<=0){aiming=aiming?null:'strike';sound('tap');}},aiming?'#ff7a3a':'#ffd23a');
  heroes.forEach((h,i)=>{const X=s.W-(r+14)-(np-1-i)*(r*2+12);circleBtn(X,Y,r,'💪',h.dead>0?1:h.smash/HERO.smash.cd,h.dead>0?'DOWN':h.smash>0?Math.ceil(h.smash)+'s':'SMASH',()=>smash(h),PCOL[i],head(h.id,'angry',96));});
 }
 const ZICON={shambler:'🧟',runner:'🏃',crawler:'🐛',riot:'🛡️',bloater:'🤢',screamer:'😱',brute:'💪',boss:'👑'};
 function drawSpawn(){
  const X=SX(spawnBtn.x),Y=SY(spawnBtn.y),can=(phase==='break'||phase==='wave'&&!queue.length)&&wave<WAVES.length;if(!can)return;
  const pulse=1+Math.sin(clock*5)*.08,r=22*k*pulse;x.fillStyle='rgba(150,20,20,.9)';x.beginPath();x.arc(X,Y,r,0,7);x.fill();x.strokeStyle='#ffd23a';x.lineWidth=2;x.stroke();
  if(phase==='break'){x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(X,Y,r+3,-Math.PI/2,-Math.PI/2+Math.PI*2*(breakT/BREAK));x.stroke();}
  txt('💀',X,Y+1,19*k);
  const w=WAVES[wave];if(w){const types=Object.keys(w);const lw=types.length*24*k+12*k,lx=X+r+6*k,ly=Y-12*k;rr(lx,ly,lw,24*k,8*k);x.fillStyle='rgba(0,0,0,.7)';x.fill();
   types.forEach((t,j)=>{txt(ZICON[t]||'🧟',lx+12*k+j*24*k,ly+12*k,13*k);});}
  txt(phase==='break'?(wave?`NEXT WAVE +£${Math.ceil(breakT*1.2)}`:'START'):'NEXT WAVE',X,Y+r+10*k,10*k,'#fff',900);
 }
 function draw(){
  view();btns=[];const W=s.W,H=s.H;
  x.save();if(shake>0)x.translate((fxr()-.5)*shake,(fxr()-.5)*shake);
  const gg=x.createLinearGradient(0,0,0,H);gg.addColorStop(0,'#253a1d');gg.addColorStop(1,'#182814');x.fillStyle=gg;x.fillRect(-20,-20,W+40,H+40);
  x.fillStyle='rgba(255,255,255,.03)';for(let i=0;i<60;i++){x.fillRect((i*97)%Math.max(1,W),(i*173)%Math.max(1,H),2,2);}
  road();
  for(const p of POOLS){const a=Math.min(1,p.t)*.55;const g=x.createRadialGradient(SX(p.x),SY(p.y),0,SX(p.x),SY(p.y),p.r*k);g.addColorStop(0,`rgba(255,140,30,${a})`);g.addColorStop(1,'rgba(255,60,0,0)');x.fillStyle=g;x.beginPath();x.ellipse(SX(p.x),SY(p.y),p.r*k,p.r*.6*k,0,0,7);x.fill();}
  for(const d of DECAL){x.fillStyle=`rgba(90,8,8,${d.a})`;x.beginPath();x.ellipse(SX(d.x),SY(d.y),d.r*k,d.r*.5*k,d.seed*3,0,7);x.fill();}
  for(const m of MINES){x.fillStyle=m.arm>0?'#555':'#3a4a2a';x.fillRect(SX(m.x)-5*k,SY(m.y)-3*k,10*k,6*k);x.fillStyle=(clock*3%1<.5)?'#ff3030':'#600';x.beginPath();x.arc(SX(m.x),SY(m.y)-3*k,1.6*k,0,7);x.fill();}
  for(const d of decor)drawDecor(d);
  drawPub();
  if(sel?.type==='tower'&&sel.sp.t)rangeRing(sel.sp,curNode(sel.sp.t).range,TOWERS[sel.sp.t.line].col);
  for(const sp of spots)drawSpot(sp);
  drawSpawn();
  const things=[...Z.filter(z=>!z.gone).map(z=>({y:z.y,f:()=>drawZ(z)})),...heroes.map(h=>({y:h.dead>0?-1e4:h.y,f:()=>drawHero(h)}))];
  for(const sp of spots)if(sp.t)for(const m of sp.t.men)things.push({y:m.y,f:()=>drawMan(m,sp)});
  things.sort((a,b)=>a.y-b.y).forEach(o=>o.f());
  if(bus)drawBus();
  for(const sh of SHELL){if(sh.t<0)continue;const p=sh.t/sh.ft,gx=sh.x0+(sh.x1-sh.x0)*p,gy=sh.y0+(sh.y1-sh.y0)*p,Y=gy-Math.sin(p*Math.PI)*(sh.strike?0:60);
   x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.ellipse(SX(gx),SY(sh.strike?sh.y1:gy),4*k,2*k,0,0,7);x.fill();
   if(sh.fire){x.fillStyle='rgba(255,90,20,.5)';x.beginPath();x.arc(SX(gx),SY(Y),(sh.strike?12:7)*k,0,7);x.fill();x.fillStyle='#ffd060';x.beginPath();x.arc(SX(gx),SY(Y),(sh.strike?7:4)*k,0,7);x.fill();}
   else{x.fillStyle='#333';x.beginPath();x.arc(SX(gx),SY(Y),4*k,0,7);x.fill();}}
  for(const l of LINESFX){x.globalAlpha=Math.min(1,l.t*10);x.strokeStyle=l.col;x.lineWidth=l.w*k;x.beginPath();x.moveTo(SX(l.x0),SY(l.y0));x.lineTo(SX(l.x1),SY(l.y1));x.stroke();}x.globalAlpha=1;
  for(const f of FX){x.globalAlpha=Math.max(0,Math.min(1,f.t*2));if(f.note){txt(f.note,SX(f.x),SY(f.y),12*k,f.col);}else{x.fillStyle=f.col;x.beginPath();x.arc(SX(f.x),SY(f.y),f.r*k*(f.smoke?2-Math.min(1.5,f.t):1),0,7);x.fill();}}x.globalAlpha=1;
  for(const r of RINGS){x.strokeStyle=r.col;x.globalAlpha=r.t/r.max;x.lineWidth=3;x.beginPath();x.arc(SX(r.x),SY(r.y),r.r*k*(1.1-r.t/r.max*.6),0,7);x.stroke();}x.globalAlpha=1;
  for(const t of TXT){x.globalAlpha=Math.min(1,t.t*2);outline(t.text,SX(t.x),SY(t.y),(t.big?17:12)*k,t.col);}x.globalAlpha=1;
  if(sel?.type==='spot'&&!sel.sp.t)drawRadial(sel.sp);
  if(drag?.moved){x.strokeStyle=PCOL[drag.h.i];x.setLineDash([6,5]);x.lineWidth=2;x.beginPath();x.moveTo(SX(drag.h.x),SY(drag.h.y));x.lineTo(SX(drag.cx),SY(drag.cy));x.stroke();x.setLineDash([]);x.beginPath();x.arc(SX(drag.cx),SY(drag.cy),10,0,7);x.stroke();}
  x.restore();
  hud();bar();drawCard();
  if(aiming){x.fillStyle='rgba(255,90,30,.12)';x.fillRect(0,top,W,H-top-bot);outline('TAP WHERE TO DROP THE PETROL STRIKE',W/2,top+20,14,'#ffb070');}
  if(banner){const a=Math.min(1,banner.t*2,(banner.max-banner.t)*4+.2);x.globalAlpha=Math.max(0,a);x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,H*.36,W,H*.14);
   let fs=Math.min(42,W/11);x.font=`900 ${fs}px Georgia,serif`;while(x.measureText(banner.text).width>W-20&&fs>12){fs--;x.font=`900 ${fs}px Georgia,serif`;}x.fillStyle=banner.col;x.textAlign='center';x.textBaseline='middle';x.fillText(banner.text,W/2,H*.41);
   if(banner.sub)txt(banner.sub,W/2,H*.465,Math.min(16,W/26),'#fff',700,'center',W-20);x.globalAlpha=1;}
  if(phase==='intro')drawIntro();
 }
 function drawBus(){const X=SX(bus.x),Y=SY(bus.y),g=segAt(bus.d),a=Math.atan2(g.ay-g.by,g.ax-g.bx);x.save();x.translate(X,Y-8*k);x.rotate(a);const L=46*k,Wd=22*k;
  x.fillStyle='#c8a020';rr(-L/2,-Wd/2,L,Wd,4*k);x.fill();x.fillStyle='#333';for(let i=0;i<5;i++)x.fillRect(-L/2+4*k+i*8.5*k,-Wd/2+2*k,6*k,4*k);x.fillStyle='#777';x.fillRect(-L/2,-Wd/2-2*k,L,3*k);x.fillRect(-L/2,Wd/2-1*k,L,3*k);
  x.strokeStyle='#ddd';x.lineWidth=1.5*k;for(let i=-3;i<=3;i++){x.beginPath();x.moveTo(L/2,i*3*k);x.lineTo(L/2+8*k,i*3*k+(fxr()-.5)*3*k);x.stroke();}
  x.fillStyle='#ffe28a';x.fillRect(L/2-3*k,-Wd/2+2*k,3*k,4*k);x.fillRect(L/2-3*k,Wd/2-6*k,3*k,4*k);x.restore();}
 function drawIntro(){
  const W=s.W,H=s.H;x.fillStyle='rgba(8,10,6,.86)';x.fillRect(0,0,W,H);
  let fs=Math.min(68,W/7);x.font=`900 ${fs}px Georgia,serif`;x.fillStyle='#c4121a';x.strokeStyle='#000';x.lineWidth=6;x.textAlign='center';x.textBaseline='middle';
  x.strokeText('SEAN',W/2,H*.26);x.fillText('SEAN',W/2,H*.26);x.font=`900 ${fs*.45}px Georgia,serif`;x.fillStyle='#e8e0c8';x.fillText('OF THE',W/2,H*.26+fs*.62);x.font=`900 ${fs}px Georgia,serif`;x.fillStyle='#c4121a';x.strokeText('DEAD',W/2,H*.26+fs*1.25);x.fillText('DEAD',W/2,H*.26+fs*1.25);
  txt(`Hold the Winchester. ${WAVES.length} waves of the dead.`,W/2,H*.26+fs*2,Math.min(20,W/20),'#f2d27a',800,'center',W-24);
  txt('Six tower lines · super upgrade paths · heroes, buses & airstrikes',W/2,H*.26+fs*2+26,Math.min(14,W/28),'#aaa',700,'center',W-24);
  const fy=H*.66,fsz=Math.min(96,W*.22);heroes.forEach((h,i)=>{const X=np===1?W/2:W/2+(i?1:-1)*fsz*.75;const hc=head(h.id,'win',128);if(hc&&hc.width)x.drawImage(hc,X-fsz/2,fy-fsz/2,fsz,fsz);txt(s.players[i].name,X,fy+fsz/2+12,14,PCOL[i],900);});
  x.globalAlpha=.6+.4*Math.sin(clock*4);txt('TAP TO START',W/2,H*.9,17,'#fff',900);x.globalAlpha=1;
 }

 // ---------------------------------------------------------------- autopilot (tests)
 let auto=false,botT=0;
 function botStep(dt){botT-=dt;if(botT>0)return;botT=.4;
  if(phase==='intro')phase='break';
  for(let i=0;i<np;i++){const own=spots.filter(sp=>sp.owner===i),empty=own.filter(sp=>!sp.t);
   if(empty.length){const ln=LINES[Math.floor(fxr()*LINES.length)];if(money[i]>=node(ln,1).cost)build(empty[Math.floor(fxr()*empty.length)],ln);}
   else{const up=own.filter(sp=>sp.t.tier<5).sort((a,b)=>a.t.tier-b.t.tier)[0];if(up){const b=up.t.branch||(fxr()<.5?'A':'B'),nx=node(up.t.line,up.t.tier+1,b);if(money[i]>=nx.cost)upgrade(up,b);}}}
  if(phase==='break'&&breakT<BREAK-4)startWave(true);
  if(powers.bus.cd<=0&&living().length>8)usePower('bus');
  if(powers.strike.cd<=0){const z=living().sort((a,b)=>b.d-a.d)[0];if(z)usePower('strike',z.x,z.y);}
  for(const h of heroes){if(h.dead<=0&&h.smash<=0&&inRange(h.x,h.y,50).length>=3)smash(h);if(money[h.owner]>(HERO_WEAPONS[h.w+1]?.cost||1e9)+150)upgradeWeapon(h);}
  if(pubLv.turret<2&&money.slice(0,np).every(m=>m>500))pubUpgrade('turret');
 }
 s.debug={get bot(){return auto;},set bot(v){auto=!!v;},
  state:()=>({phase,wave,pints,money:money.slice(0,np),score:score.slice(0,np),towers:spots.filter(q=>q.t).map(q=>q.t.line+q.t.tier+(q.t.branch||'')),zombies:living().length,wide,bossId,heroes:heroes.map(h=>({lvl:h.lvl,w:h.w,hp:Math.round(h.hp),dead:h.dead>0})),sel:sel?.type||null}),
  build:(i,line)=>build(spots[i],line),upgrade:(i,b)=>upgrade(spots[i],b),startWave:()=>{if(phase==='intro')phase='break';startWave(true);},give:(n=1000)=>{for(let i=0;i<np;i++)money[i]+=n;},
  speed:v=>{speed=v;},win:()=>{wave=WAVES.length;queue=[];for(const z of living())z.gone=1;end(true);},lose:()=>{pints=0;end(false);},power:(kk,a,b)=>usePower(kk,a,b),smash:i=>smash(heroes[i]),
  spots:()=>spots.map(q=>({x:SX(q.x),y:SY(q.y),owner:q.owner,t:q.t?q.t.line+q.t.tier:null})),heroXY:i=>({x:SX(heroes[i].x),y:SY(heroes[i].y)}),select:o=>{sel=o;},spotObj:i=>spots[i],hero:i=>heroes[i],
  wave:n=>{wave=n;},spawn:(t,d=0)=>spawnZ(t,d)};

 // ---------------------------------------------------------------- loop
 await new Promise(resolve=>{
  s.frame(dt=>{
   if(!s.alive){resolve();return;}
   clock+=dt;sfxN=0;const sdt=Math.min(dt,.05)*speed;
   if(wantWide()!==laidOut&&wave===0&&!spots.some(q=>q.t)){sel=null;layout(wantWide());}
   if(auto)botStep(sdt);
   if(banner){banner.t-=dt;if(banner.t<=0)banner=null;}
   shake=Math.max(0,shake-dt*30);
   if(phase==='break'){breakT-=sdt;if(breakT<=0)startWave(false);}
   if(phase==='wave'||phase==='break'){
    // fixed 1/60 steps (3x speed = 3 steps a frame) keep fights and auras stable
    const steps=Math.max(1,Math.round(sdt/(1/60))),h=sdt/steps;
    for(let st=0;st<steps;st++){
     for(const p of Object.values(powers))p.cd=Math.max(0,p.cd-h);
     if(queue.length){spawnT-=h;if(spawnT<=0){spawnZ(queue.shift());spawnT=queue[0]==='boss'?2.5:.4+R()*.22;}}
     for(const z of Z){z.slow=0;z.vuln=0;z.haste=0;}
     for(const z of Z)if(z.t.scream&&!z.dead)for(const o of Z)if(o!==z&&!o.dead&&Math.abs(o.d-z.d)<60)o.haste=1;
     for(const sp of spots)if(sp.t)sp.t.buff=0;
     for(const sp of spots){const n=sp.t&&curNode(sp.t);if(n?.buff)for(const o of spots)if(o.t&&o!==sp&&Math.hypot(o.x-sp.x,o.y-sp.y)<100)o.t.buff=Math.max(o.t.buff,n.buff);}
     for(const sp of spots)if(sp.t&&curNode(sp.t).kind==='pulse')stepTower(sp,h);
     for(const z of Z)stepZ(z,h);
     for(const sp of spots)if(sp.t&&curNode(sp.t).kind!=='pulse')stepTower(sp,h);
     for(const hr of heroes)stepHero(hr,h);
     stepPub(h);stepBus(h);
     for(let i=SHELL.length-1;i>=0;i--){const sh=SHELL[i];sh.t+=h;if(sh.t<sh.ft)continue;SHELL.splice(i,1);const n=sh.n;
      for(const z of inRange(sh.x1,sh.y1,n.splash)){hurt(z,n.dmg,sh.fire?'fire':n.blast?'blast':'phys',sh.own);if(n.burn)burnZ(z,n.burn);}
      if(n.pool)POOLS.push({x:sh.x1,y:sh.y1,r:n.pool.r,dps:n.pool.dps,t:n.pool.t,own:sh.own});boom(sh.x1,sh.y1,n.splash,sh.fire?'#ff7a20':'#ffb040');}
     for(let i=POOLS.length-1;i>=0;i--){const p=POOLS[i];p.t-=h;if(p.t<=0){POOLS.splice(i,1);continue;}for(const z of inRange(p.x,p.y,p.r)){hurt(z,p.dps*h,'fire',p.own);burnZ(z,p.dps*.3,1);}}
     for(let i=MINES.length-1;i>=0;i--){const m=MINES[i];m.arm-=h;if(m.arm>0)continue;if(inRange(m.x,m.y,15).length){MINES.splice(i,1);for(const z of inRange(m.x,m.y,m.n.splash))hurt(z,m.n.dmg,'blast',m.own);boom(m.x,m.y,m.n.splash);}}
     // inferno: burning zombies light the ones next to them
     if(spots.some(sp=>sp.t&&curNode(sp.t).spread))for(const z of Z)if(z.burnT>0&&!z.dead&&z.burn>0)for(const o of inRange(z.x,z.y,20))if(o!==z)burnZ(o,z.burn*.6,1.5);
     for(let i=Z.length-1;i>=0;i--)if(Z[i].gone)Z.splice(i,1);
    }
    if(phase==='wave'&&!queue.length&&!living().length&&!Z.some(z=>z.dead)&&!ended){
     if(wave>=WAVES.length)end(true);
     else{phase='break';breakT=BREAK;if(solo)soloProgress(s,score[0],wave,`wave ${wave}`);for(let i=0;i<np;i++)money[i]+=25;say(`WAVE ${wave} CLEARED`,`+£25 each · ${WAVES.length-wave} to go`,'#7dff8a',2.2);sound('pickup');for(const hr of heroes){hr.moodT=0;setMood(hr,'win');}}}
   }
   if(phase==='end'){phaseT+=dt;for(const z of Z)if(z.dead)stepZ(z,dt);if(phaseT>3.8&&s.alive){phase='done';finish();resolve();}}
   for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.t-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=(f.g||0)*dt;if(f.t<=0)FX.splice(i,1);}if(FX.length>500)FX.splice(0,FX.length-500);
   for(let i=LINESFX.length-1;i>=0;i--){LINESFX[i].t-=dt;if(LINESFX[i].t<=0)LINESFX.splice(i,1);}
   for(let i=RINGS.length-1;i>=0;i--){RINGS[i].t-=dt;if(RINGS[i].t<=0)RINGS.splice(i,1);}
   for(let i=TXT.length-1;i>=0;i--){const t=TXT[i];t.t-=dt;t.y-=20*dt;if(t.t<=0)TXT.splice(i,1);}
   for(const d of DECAL)d.a=Math.max(.2,d.a-dt*.008);
   draw();
  });
 });
}
Object.assign(exports,{seanOfTheDead});
