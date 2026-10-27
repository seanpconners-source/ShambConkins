const {clamp}=require("src/utils.js");
const {ownedPointers}=require("src/engines/duelControls.js");
const {sound,tone,vibrate,pickupSound}=require("src/audio.js");
const {store}=require("src/state.js");
const {soloProgress}=require("src/solo.js");
const {netField}=require("src/engines/netField.js");
const HD=require("src/engines/hordeData.js");
const {WEAPONS,PASSIVES,ENEMIES,MODES,WEAPON_IDS,PASSIVE_IDS,MAX_LEVEL,weaponStats,calcStats,xpNeed}=HD;

const CS=480,CELL=56,HB=1024,MAXE=440,PSPD=176,PRAD=14,TAU=Math.PI*2,RW=120;
const AI={chase:0,runner:1,bat:2,spitter:3,barrel:4,charger:5,ghost:6,tarman:7,colonel:8,banshee:9,mama:10,titan:11,hunger:12};
const PCOL=['#78b6ff','#ff9fc6'];
const FONT='Arial, Helvetica, sans-serif';
const rnd=Math.random;
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// 1P: one survivor carries half the guns, so the horde is thinner and the bosses softer
const soloMode=m=>({...m,hp:m.hp*.8,cap:m.cap*.6,rate:m.rate*.6,boss:m.boss*.55,dmg:m.dmg*.9});
const fmtTime=t=>{t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};

async function horde(s){
 const [c,x]=s.canvas(700,390,{fill:true});let W=s.W,H=s.H;
 s.body.classList.add('drag-arena-body');s.queueCanvasFit?.();s.shared=true;
 // solo (1P arcade): the player survives alone; the horde is thinned to fit one survivor (soloMode)
 const alone=!!s.solo;if(!alone){s.cooperative=true;s.cooperativeLabel='SURVIVE TOGETHER';}s.updateScores();
 // online (s.online): co-op on two phones. Player 1's phone ("host") runs the night: the director, every enemy, enemy shots,
 // zones, drops and the end, and streams the enemies near the other survivor {f.e} (~8/s). Each phone runs only its own
 // survivor: movement, weapons, level-ups and chests (no pausing: a survivor choosing a card just stands still, safe), and
 // judges what hits it. The other phone's hits go to the host as {h}; gems/pickups it takes {g}/{k}; props it breaks {pb};
 // bombs {bomb}. Both phones show the partner's shots {pr}, weapon flashes {fx} and blasts {ex}. Each phone's own camera.
 const net=s.online||null,me=net?net.me:0,them=1-me,host=!net||me===0;
 const cabin=/evil dead/i.test(s.game.source),theme=cabin?'cabin':'dead';
 if(net)setTimeout(()=>s.hint('SURVIVE THE NIGHT TOGETHER, each on your own phone. Drag anywhere: your head walks the way you drag (or WASD / arrows). Weapons fire by themselves; the horde, the gems and the chests are shared. Level-ups do not pause the night: while you pick a card you stand still and nothing can hurt you. An arrow on the edge points to your partner; stand next to them for 2.5 s to revive them. Survive until dawn, or kill the final boss.'),0);
 const title=cabin?'EVIL DEAD · CABIN DEFENSE':'RETURN OF THE LIVING DEAD · HORDE';
 const reduced=!!store.profile?.settings?.reducedMotion;
 const wseed=Math.floor(s.random()*4294967296)>>>0;
 const wname=(id,evo)=>{const d=WEAPONS[id];return evo?(cabin&&d.evo.cabName?d.evo.cabName:d.evo.name):(cabin?d.cab:d.name);};
 const foe=id=>cabin?ENEMIES[id].cn:ENEMIES[id].n;
 s.hint(alone?'SURVIVE THE NIGHT. Drag anywhere: your head walks the way you drag (or WASD / arrow keys). Weapons fire by themselves. Pick up gems to level up and choose upgrades. Smash lamps and barrels for pickups. Open chests (from elites and bosses) to evolve a maxed weapon that has its matching passive. Survive until dawn, or kill the final boss.':'SURVIVE THE NIGHT TOGETHER. Each player touches their own half and drags: the head walks the way you drag (or P1 WASD / P2 arrow keys). Weapons fire by themselves. Pick up gems to level up and choose upgrades. Smash lamps and barrels for pickups. Open chests (from elites and bosses) to evolve a maxed weapon that has its matching passive. Stand next to a fallen partner for 2.5 s to revive. Survive until dawn, or kill the final boss.');

 // ---------- art ----------
 const enemyArt=HD.bakeEnemies(theme),propArt=HD.bakeProps(theme),building=HD.bakeBuilding(theme);
 const iconUI={},iconG={};
 for(const id of WEAPON_IDS)iconUI[id]=HD.bakeIcon(WEAPONS[id].icon,64,true,'#e0b64a');
 for(const id of PASSIVE_IDS)iconUI[id]=HD.bakeIcon(PASSIVES[id].icon,64,true,'#5fd3c4');
 for(const id of ['chicken','chest','bomb','magnet','coin','skull','medic','growth','revive'])iconG[id]=HD.bakeIcon(id,48,false);
 for(const id of WEAPON_IDS)iconG[id]=HD.bakeIcon(WEAPONS[id].icon,48,false);
 const gemArt=HD.XP_TIERS.map(([v,col])=>{const cv=HD.mk(28,28),g=cv.getContext('2d');g.translate(14,14);g.lineWidth=1.6;g.strokeStyle='#10150f';HD.poly(g,[0,-11,8,-2,0,11,-8,-2],col,'#10150f');g.globalAlpha=.55;HD.poly(g,[0,-9,5,-2,0,0,-5,-2],'#fff');return cv;});
 const groundPat=x.createPattern(HD.groundTile(theme,wseed^0x9e37),'repeat');
 const lightBig=HD.lightSprite(128,.3),lightSoft=HD.lightSprite(128,.05);
 const glowOrange=HD.glowSprite(64,'255,170,60'),glowGreen=HD.glowSprite(64,'110,255,90'),glowWhite=HD.glowSprite(64,'255,255,235'),glowRed=HD.glowSprite(64,'255,70,60');
 const lc=document.createElement('canvas'),lx=lc.getContext('2d');
 let vig=null;

 // ---------- state ----------
 let state='menu',mode=MODES[1],menuSel=1,clock=0,uiT=0,frameNo=0,endT=0,endKind='',won=false,bossBonus=false;
 let zoom=1,ui=1,hudH=90,cam={x:0,y:0,sx:0,sy:0},shake=0,hurtFlash=0,whiteFlash=0;
 let D=480,sched=[],evI=0,spAcc=0,curM=0,stormUntil=0,stormAcc=0,hungerAt=0,finalBoss=null,finalBossT=0,hungerOn=false;
 let kills=[0,0],bossKills=[0,0],coinsTeam=0,scoreDirty=0,scoreTick=0,totalKills=0;
 const banner={t:0,dur:0,text:'',sub:'',col:'#ff5a4a'},toasts=[];
 const keys={};
 const stick=[{on:false,ax:0,ay:0,fx:0,fy:0,id:-1},{on:false,ax:0,ay:0,fx:0,fy:0,id:-1}];
 const mkPlayer=i=>({i,dk:2,sy:0,x:i?64:-64,y:70,vx:0,vy:0,face:1,hp:100,maxHp:100,down:false,revT:0,inv:0,hurt:0,lvl:1,xp:0,need:xpNeed(1),weapons:[],passives:{},st:calcStats({}),wind:true,revLeft:0,slow:0,walk:0,moving:false,coins:0,pend:0,dmgDone:0,regen:0,dirx:1,diry:0,bob:0});
 const P=alone?[mkPlayer(0)]:[mkPlayer(0),mkPlayer(1)];
 const mate=p=>P[1-p.i]||p; // alone: no partner (tether, revive and XP catch-up see the player themself)
 let modal=null;const modalQ=[];
 const bot={on:false};

 // ---------- pools ----------
 const E=[],Epool=[],PR=[],PRpool=[],ES=[],ESpool=[],Z=[],Zpool=[],PT=[],PTpool=[],TX=[],TXpool=[],G=[],Gpool=[],K=[],Kpool=[],FX=[],FXpool=[];
 const head=new Int32Array(HB),nxt=new Int32Array(MAXE+8),cellOf=new Int32Array(MAXE+8);
 const hashOf=(cx,cy)=>(Math.imul(cx,92837111)^Math.imul(cy,689287499))&(HB-1);
 const bigs=[];
 const newEnemy=()=>({x:0,y:0,kx:0,ky:0,vx:0,vy:0,hp:1,mhp:1,r:10,spd:40,dmg:5,def:null,type:'',ai:0,fl:0,slow:0,slowF:0,haste:0,armor:0,xp:1,fly:0,ph:0,face:1,dead:0,lh:0,sc:1,st:0,t1:0,t2:0,ang:0,mode:0,life:0,elite:0,chest:0,aura:0,at:0,hc:0,cd0:0,cd1:0,burn:0,bt:0,kbr:1,immune:0,phase:0,boss:0,dk:1,sy:0,sz:40,fuse:0,uid:0,idx:0});
 const newProj=()=>({x:0,y:0,vx:0,vy:0,k:0,o:0,dmg:1,life:1,r:3,pierce:0,kb:0,t:0,ang:0,tx:0,ty:0,sx:0,sy:0,a:0,b:0,dead:0,hits:[],st:null,hh:0});
 const newES=()=>({x:0,y:0,vx:0,vy:0,r:6,dmg:5,life:2,k:0});
 const newZ=()=>({k:0,x:0,y:0,r:50,t:0,dur:1,tick:0,dmg:0,o:0,st:null,a:0});
 const newPT=()=>({x:0,y:0,vx:0,vy:0,life:0,max:1,sz:2,col:'#fff',g:0});
 const newTX=()=>({x:0,y:0,vy:0,life:0,max:1,txt:'',col:'#fff',sz:12});
 const newG=()=>({x:0,y:0,v:1,tier:0,pull:false,sp:0,age:0});
 const newK=()=>({x:0,y:0,k:'',v:0,age:0,life:30,pull:false,sp:0});
 const newFX=()=>({k:0,x:0,y:0,x2:0,y2:0,r:0,t:0,dur:.3,a:0,b:0,col:'#fff'});
 const take=(pool,make)=>pool.length?pool.pop():make();
 function release(list,pool,i){const o=list[i];list[i]=list[list.length-1];list.pop();pool.push(o);}

 // ---------- world ----------
 const chunks=new Map();let lastCh=null;const LM=[];
 const isRoadRow=cy=>cy!==0&&mulberry(Math.imul(cy,2654435761)^wseed)()<.2;
 const isRoadCol=cx=>cx!==0&&mulberry(Math.imul(cx,40503)^wseed^0x55)()<.17;
 function genChunk(cx,cy){
  const r=mulberry(Math.imul(cx,374761393)^Math.imul(cy,668265263)^wseed),ch={cx,cy,props:[],cols:[],dest:[],dn:0,roadH:isRoadRow(cy),roadV:isRoadCol(cx),decals:[]};
  const x0=cx*CS,y0=cy*CS,ry=y0+CS/2,rx=x0+CS/2;
  const onRoad=(px,py,m)=>(ch.roadH&&Math.abs(py-ry)<RW/2+m)||(ch.roadV&&Math.abs(px-rx)<RW/2+m);
  const bad=(px,py,m)=>px*px+py*py<(230+m)*(230+m)||(px>-190&&px<190&&py>-260&&py<-60);
  const add=(type,v,px,py,o={})=>{const p={dk:0,type,v,x:px,y:py,sy:py,r:o.r||0,hp:o.hp||0,dead:0,sc:o.sc||1,lit:!!o.lit,drop:!!o.drop,expl:!!o.expl};ch.props.push(p);if(p.r){if(o.col2){ch.cols.push({x:px-o.col2,y:py,r:p.r,p:null},{x:px+o.col2,y:py,r:p.r,p:null});}else ch.cols.push({x:px,y:py,r:p.r,p:o.hp?p:null});}if(o.hp){ch.dest.push(p);ch.dn++;}return p;};
  const spot=(m,road)=>{for(let k=0;k<8;k++){const px=x0+30+r()*(CS-60),py=y0+30+r()*(CS-60);if(bad(px,py,m))continue;if(!road&&onRoad(px,py,m))continue;let ok=true;for(const q of ch.props)if((q.x-px)**2+(q.y-py)**2<(m+22)**2){ok=false;break;}if(ok)return[px,py];}return null;};
  const b=r(),yard=b<.38,clear=b>=.38&&b<.6;
  const nTree=cabin?(yard?3:clear?1:9):(yard?2:clear?0:7);
  for(let i=0;i<nTree;i++){const p=spot(24);if(p)add('tree',cabin&&r()<.6?2:Math.floor(r()*2),p[0],p[1],{r:9,sc:.9+r()*.35});}
  if(yard||(!clear&&r()<.4)){const n=cabin?3+Math.floor(r()*4):6+Math.floor(r()*7);const gx=x0+80+r()*(CS-160),gy=y0+80+r()*(CS-160);for(let i=0;i<n;i++){const px=gx+(r()-.5)*190,py=gy+(r()-.5)*150;if(bad(px,py,10)||onRoad(px,py,10)||px<x0+20||px>x0+CS-20||py<y0+20||py>y0+CS-20)continue;const v=Math.floor(r()*3);add('grave',v,px,py,{r:v===2?5:8,sc:.95+r()*.15});}}
  const nb=clear?3+Math.floor(r()*3):r()<.3?1:0;
  for(let i=0;i<nb;i++){const p=spot(14);if(!p)continue;const v=r()<.22?1:r()<.3?2:0;add('barrel',v,p[0],p[1],{r:11,hp:v===1?8:10,drop:true,expl:v===1||v===2});}
  if(clear)for(let i=0;i<2+Math.floor(r()*2);i++){const p=spot(16);if(p)add('crate',0,p[0],p[1],{r:12,hp:12,drop:true});}
  for(let i=0;i<2+Math.floor(r()*3);i++){const p=spot(10,true);if(p)add('bush',0,p[0],p[1],{sc:.8+r()*.4});}
  if(r()<.6){const p=spot(8,true);if(p)add(r()<.5?'bones':'rubble',0,p[0],p[1]);}
  if(ch.roadH||ch.roadV){
   const n=ch.roadH&&ch.roadV?0:r()<.7?1+Math.floor(r()*2):0;
   for(let i=0;i<n;i++){const px=ch.roadH?x0+60+r()*(CS-120):rx+(r()-.5)*50,py=ch.roadH?ry+(r()-.5)*40:y0+60+r()*(CS-120);add('car',Math.floor(r()*2),px,py,{r:16,col2:22});}
   for(let i=0;i<2;i++){const lp=ch.roadH?[x0+90+i*270+r()*60,ry+(i?-1:1)*(RW/2+16)]:[rx+(i?-1:1)*(RW/2+16),y0+90+i*270+r()*60];if(!bad(lp[0],lp[1],6))add(cabin?'torch':'lamp',0,lp[0],lp[1],{r:5,hp:16,drop:true,lit:true});}
  }else if(r()<.35){const p=spot(10);if(p)add(cabin?'torch':'lamp',0,p[0],p[1],{r:5,hp:16,drop:true,lit:true});}
  return ch;
 }
 function getChunk(cx,cy){if(lastCh&&lastCh.cx===cx&&lastCh.cy===cy)return lastCh;const k=(cx+8192)*16384+(cy+8192);let ch=chunks.get(k);if(!ch){ch=genChunk(cx,cy);chunks.set(k,ch);}return(lastCh=ch);}
 // landmark: the starting building
 {const b={dk:0,type:'building',sy:-130,x:0,y:-130};LM.push(b);for(let i=-2;i<=2;i++)LM.push({x:i*52,y:-140,r:40,p:null,col:true});}
 function solidPush(e,r){
  const x0=Math.floor((e.x-r-24)/CS),x1=Math.floor((e.x+r+24)/CS),y0=Math.floor((e.y-r-24)/CS),y1=Math.floor((e.y+r+24)/CS);
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const cols=getChunk(cx,cy).cols;for(let i=0;i<cols.length;i++){const o=cols[i];if(o.p&&o.p.dead)continue;const dx=e.x-o.x,dy=e.y-o.y,rr=r+o.r,d2=dx*dx+dy*dy;if(d2<rr*rr){const d=Math.sqrt(d2)||.01;const k=(rr-d)/d;e.x+=dx*k;e.y+=dy*k;}}}
  if(Math.abs(e.x)<330&&e.y>-230&&e.y<30)for(let i=1;i<LM.length;i++){const o=LM[i],dx=e.x-o.x,dy=e.y-o.y,rr=r+o.r,d2=dx*dx+dy*dy;if(d2<rr*rr){const d=Math.sqrt(d2)||.01;const k=(rr-d)/d;e.x+=dx*k;e.y+=dy*k;}}
 }
 function ensureWorld(){const vw=W/zoom/2+260,vh=H/zoom/2+260;for(let cy=Math.floor((cam.y-vh)/CS);cy<=Math.floor((cam.y+vh)/CS);cy++)for(let cx=Math.floor((cam.x-vw)/CS);cx<=Math.floor((cam.x+vw)/CS);cx++)getChunk(cx,cy);}

 // ---------- helpers: sound / fx ----------
 const sfxT={};
 function sfx(name,gap,fn){const n=performance.now();if(n-(sfxT[name]||0)<gap)return;sfxT[name]=n;fn();}
 const chime=notes=>notes.forEach((f,i)=>setTimeout(()=>tone(f,.16,.045,'triangle'),i*75));
 function particle(px,py,vx,vy,life,sz,col,g){if(PT.length>=260)return;const p=take(PTpool,newPT);p.x=px;p.y=py;p.vx=vx;p.vy=vy;p.life=p.max=life;p.sz=sz;p.col=col;p.g=g||0;PT.push(p);}
 function burst(px,py,n,col,spd,life,sz){for(let i=0;i<n;i++){const a=rnd()*TAU,v=spd*(.3+rnd()*.7);particle(px,py,Math.cos(a)*v,Math.sin(a)*v,life*(.6+rnd()*.6),sz*(.6+rnd()*.7),col,0);}}
 function text(px,py,txt,col,sz,life){if(TX.length>=44)return;const t=take(TXpool,newTX);t.x=px+(rnd()-.5)*10;t.y=py;t.vy=-34-rnd()*10;t.life=t.max=life||.7;t.txt=txt;t.col=col||'#fff';t.sz=sz||12;TX.push(t);}
 function fx(k,px,py,r,dur,col,a,b,x2,y2){if(recFx)outbox.fx.push([k,Math.round(px),Math.round(py),Math.round(r),+dur.toFixed(2),col||'#fff',+(a||0).toFixed(2),+(b||0).toFixed(2),Math.round(x2||0),Math.round(y2||0)]);const f=take(FXpool,newFX);f.k=k;f.x=px;f.y=py;f.r=r;f.t=0;f.dur=dur;f.col=col||'#fff';f.a=a||0;f.b=b||0;f.x2=x2||0;f.y2=y2||0;FX.push(f);return f;}
 function addShake(v){if(!reduced)shake=Math.min(18,Math.max(shake,v));}
 function toast(txt,col){if(net&&host)outbox.ts.push([txt,col]);toasts.push({txt,col:col||'#ffe9a8',t:3});if(toasts.length>3)toasts.shift();}
 function showBanner(text,sub,col,dur){if(net&&host)outbox.bn.push([text,sub,col,dur]);banner.text=text;banner.sub=sub||'';banner.col=col||'#ff5a4a';banner.t=banner.dur=dur||2.6;}

 // ---------- spatial hash ----------
 let qid=0;const mark=new Int32Array(HB);let uidN=1;
 function buildHash(){head.fill(-1);bigs.length=0;for(let i=0;i<E.length;i++){const e=E[i];e.idx=i;if(e.dead)continue;if(e.r>24){bigs.push(e);continue;}const b=hashOf(Math.floor(e.x/CELL),Math.floor(e.y/CELL));nxt[i]=head[b];head[b]=i;}}
 function forNear(px,py,r,cb,a,b){
  if(r>240){for(let i=0;i<E.length;i++){const e=E[i];if(e.dead)continue;const dx=e.x-px,dy=e.y-py,rr=r+e.r;if(dx*dx+dy*dy<rr*rr)cb(e,a,b);}return;}
  qid++;const x0=Math.floor((px-r-24)/CELL),x1=Math.floor((px+r+24)/CELL),y0=Math.floor((py-r-24)/CELL),y1=Math.floor((py+r+24)/CELL);
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const bk=hashOf(cx,cy);if(mark[bk]===qid)continue;mark[bk]=qid;for(let i=head[bk];i>=0;i=nxt[i]){const e=E[i];if(e.dead)continue;const dx=e.x-px,dy=e.y-py,rr=r+e.r;if(dx*dx+dy*dy<rr*rr)cb(e,a,b);}}
  for(let j=0;j<bigs.length;j++){const e=bigs[j];if(e.dead)continue;const dx=e.x-px,dy=e.y-py,rr=r+e.r;if(dx*dx+dy*dy<rr*rr)cb(e,a,b);}
 }
 function nearestEnemy(px,py,maxR,skip){let best=null,bd=maxR*maxR;for(let i=0;i<E.length;i++){const e=E[i];if(e.dead||e===skip||e.immune)continue;const dx=e.x-px,dy=e.y-py,d=dx*dx+dy*dy;if(d<bd){bd=d;best=e;}}return best;}
 function randomEnemy(px,py,maxR){const n=E.length;if(!n)return null;const m2=maxR*maxR;for(let k=0;k<10;k++){const e=E[(rnd()*n)|0];if(e.dead||e.immune)continue;const dx=e.x-px,dy=e.y-py;if(dx*dx+dy*dy<m2)return e;}return null;}
 const onScreen=(px,py,m)=>Math.abs(px-cam.x)<W/zoom/2+m&&Math.abs(py-cam.y)<H/zoom/2+m;

 // ---------- players, weapons, cards ----------
 const critChance=p=>.05+p.st.luck*.04;
 function giveWeapon(p,id){let w=p.weapons.find(q=>q.id===id);if(w){if(w.lvl<MAX_LEVEL){w.lvl++;w.st=weaponStats(id,w.lvl,w.evo);}return w;}if(p.weapons.length>=6)return null;w={id,kind:WEAPONS[id].kind,lvl:1,evo:false,st:weaponStats(id,1,false),cd:.3+rnd()*.4,t:0,on:true,ang:rnd()*TAU,pulse:0};p.weapons.push(w);return w;}
 function givePassive(p,id){const l=p.passives[id]||0;if(l>=PASSIVES[id].max)return;p.passives[id]=l+1;p.st=calcStats(p.passives);const old=p.maxHp;p.maxHp=Math.round(100*p.st.maxHp);if(!p.down)p.hp+=p.maxHp-old;if(id==='revive')p.revLeft++;}
 const evoReady=(p,w)=>w.lvl>=MAX_LEVEL&&!w.evo&&(p.passives[WEAPONS[w.id].pass]||0)>0;
 const nPass=p=>Object.keys(p.passives).length;
 function options(p){
  const o=[];
  for(const w of p.weapons)if(w.lvl<MAX_LEVEL)o.push({k:'w',id:w.id,wt:3});
  if(p.weapons.length<6)for(const id of WEAPON_IDS)if(!p.weapons.some(w=>w.id===id))o.push({k:'w',id,wt:1.5});
  for(const id of PASSIVE_IDS){const l=p.passives[id]||0;if(l>=PASSIVES[id].max)continue;if(l>0)o.push({k:'p',id,wt:2.2});else if(nPass(p)<6){let wt=1.3;for(const w of p.weapons)if(WEAPONS[w.id].pass===id)wt=w.lvl>=MAX_LEVEL-2?6:3;o.push({k:'p',id,wt});}}
  return o;
 }
 function cardFor(p,o){
  if(o.k==='w'){const w=p.weapons.find(q=>q.id===o.id),lvl=w?w.lvl+1:1,d=WEAPONS[o.id];return{k:'w',id:o.id,lvl,title:wname(o.id,w&&w.evo),sub:w?`Lv ${w.lvl} → ${lvl}`:'NEW WEAPON',text:HD.weaponText(o.id,lvl)+(lvl===MAX_LEVEL?` MAX! Evolves with ${PASSIVES[d.pass].name}.`:''),icon:iconUI[o.id],col:'#e0b64a'};}
  if(o.k==='p'){const l=p.passives[o.id]||0,d=PASSIVES[o.id];return{k:'p',id:o.id,lvl:l+1,title:d.name,sub:l?`Lv ${l} → ${l+1}`:'NEW PASSIVE',text:d.text,icon:iconUI[o.id],col:'#5fd3c4'};}
  if(o.k==='coins')return{k:'coins',title:'Take 20 coins',sub:'EVERYTHING MAXED',text:'Nothing left to upgrade. Cash in instead.',icon:iconUI.greed,col:'#f6cd3a'};
  return{k:'heal',title:'Patch up',sub:'EVERYTHING MAXED',text:'Heal 35% of your health.',icon:iconUI.recovery,col:'#ff7a8a'};
 }
 function pickCards(p,n){
  const pool=options(p),out=[];
  while(out.length<n&&pool.length){let tot=0;for(const o of pool)tot+=o.wt;let r=rnd()*tot,j=0;for(;j<pool.length-1;j++){r-=pool[j].wt;if(r<=0)break;}out.push(cardFor(p,pool[j]));pool.splice(j,1);}
  if(!out.length)out.push(cardFor(p,{k:'coins'}),cardFor(p,{k:'heal'}));
  return out;
 }
 function applyCard(p,card){
  if(card.k==='w')giveWeapon(p,card.id);else if(card.k==='p')givePassive(p,card.id);
  else if(card.k==='coins')addCoins(p,20);else if(card.k==='heal'){p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.35);text(p.x,p.y-30,'+HP','#7dff9a',13,.8);}
 }
 function addCoins(p,v){const g=Math.round(v*p.st.greed);p.coins+=g;coinsTeam+=g;scoreDirty=1;}
 function openChest(p,big){
  const evos=p.weapons.filter(w=>evoReady(p,w)),got=[];
  if(evos.length){for(const w of evos){w.evo=true;w.st=weaponStats(w.id,w.lvl,true);got.push({k:'w',id:w.id,title:wname(w.id,true),sub:'EVOLVED!',text:WEAPONS[w.id].evo.text,icon:iconUI[w.id],col:'#ffd23a',evo:true});}}
  else{let n=1+(big?1:0)+(rnd()<.3+.12*p.st.luck?1:0);for(let i=0;i<n;i++){const o=options(p);if(!o.length)break;const pick=o[(rnd()*o.length)|0],card=cardFor(p,pick);applyCard(p,card);got.push({...card,sub:'FOUND'});}
   if(!got.length){addCoins(p,50);p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.5);got.push({k:'coins',title:'50 coins + a snack',sub:'BONUS',text:'Your loadout is already maxed out.',icon:iconUI.greed,col:'#f6cd3a'});}}
  scoreDirty=1;return got;
 }
 function queueLevel(i){modalQ.push({type:'level',pi:i});if(!modal)nextModal();}
 function gainXp(p,v){const o=mate(p),rb=1+clamp((o.lvl-p.lvl)*.04,0,.3);p.xp+=v*p.st.growth*mode.xp*rb;while(p.xp>=p.need){p.xp-=p.need;p.lvl++;p.need=xpNeed(p.lvl);queueLevel(p.i);text(p.x,p.y-48,'LEVEL UP!','#ffe27a',15,1.1);s.react?.(p.i,'win');sfx('lvl',200,()=>chime([523,659,784,1047]));scoreDirty=1;}}
 function nextModal(){
  if(modal||state==='ending')return;
  const q=modalQ.shift();if(!q)return;
  const p=P[q.pi];
  if(q.type==='level'){const n=3+(rnd()<Math.min(1,p.st.luck*.35)?1:0);modal={type:'level',pi:q.pi,title:'LEVEL UP!',sub:`${s.players[q.pi].name} · level ${p.lvl}`,cards:pickCards(p,n),sel:0,age:0};}
  else if(q.type==='start'){const ids=[...HD.STARTERS].sort(()=>rnd()-.5).slice(0,3);modal={type:'level',start:true,pi:q.pi,title:'CHOOSE YOUR WEAPON',sub:s.players[q.pi].name,cards:ids.map(id=>cardFor(p,{k:'w',id})),sel:0,age:0};}
  else if(q.type==='chest'){modal={type:'chest',pi:q.pi,title:q.got.some(g=>g.evo)?'EVOLUTION!':'TREASURE!',sub:s.players[q.pi].name,cards:q.got,sel:0,age:0};sfx('chest',100,()=>chime([392,523,659,784,1047]));}
  sfx('modal',120,()=>tone(440,.07,.03,'triangle'));
 }
 function chooseCard(idx){
  if(!modal)return;const m=modal;
  if(m.type==='level'){const card=m.cards[idx];if(!card)return;const p=P[m.pi];applyCard(p,card);sound('pickup');}
  modal=null;nextModal();
 }

 // ---------- damage ----------
 function hurtPlayer(p,amt,pct){
  if(p.down||p.inv>0||state!=='play'||net&&p.i!==me)return false;
  const d=pct?p.maxHp*pct:Math.max(1,amt-p.st.armor);
  p.hp-=d;p.inv=pct?1.1:.55;p.hurt=.3;hurtFlash=Math.min(.7,hurtFlash+.35);addShake(pct?10:3.5);
  text(p.x,p.y-34,'-'+Math.round(d),'#ff6a6a',13,.8);vibrate(18);s.react?.(p.i,'sad',.5);burst(p.x,p.y,5,'#ff3a3a',110,.4,2.4);
  sfx('hurt',110,()=>tone(110,.1,.05,'sawtooth'));
  if(p.hp<=0)dieOrRevive(p);return true;
 }
 function knockCb(e,px,py){const dx=e.x-px,dy=e.y-py,d=Math.sqrt(dx*dx+dy*dy)||1;e.kx+=dx/d*420*e.kbr;e.ky+=dy/d*420*e.kbr;}
 function reviveFx(p,frac,msg){p.down=false;p.hp=Math.max(1,Math.round(p.maxHp*frac));p.inv=2.6;p.revT=0;forNear(p.x,p.y,180,knockCb,p.x,p.y);fx(0,p.x,p.y,180,.55,'#fff2a8');burst(p.x,p.y,18,'#fff2a8',160,.7,3);text(p.x,p.y-52,msg,'#fff2a8',16,1.4);s.react?.(p.i,'happy',1.6);sound('win');addShake(6);}
 function dieOrRevive(p){
  p.hp=0;
  if(p.revLeft>0){p.revLeft--;reviveFx(p,.6,'REVIVED!');}
  else if(p.wind){p.wind=false;reviveFx(p,.4,'SECOND WIND!');}
  else{p.down=true;p.revT=0;text(p.x,p.y-52,'DOWN!','#ff6a6a',16,1.4);sound('lose');addShake(8);nf?.push();if(host&&P.every(q=>q.down))beginEnd('lose');}
 }
 let kcbDmg=0,kcbO=0,kcbX=0,kcbY=0,kcbKb=0;
 function areaCb(e){const dx=e.x-kcbX,dy=e.y-kcbY,d=Math.sqrt(dx*dx+dy*dy)||1;hitEnemy(e,kcbDmg,kcbO,dx/d*kcbKb,dy/d*kcbKb,false,true);}
 function areaHit(px,py,r,dmg,o,kb){kcbDmg=dmg;kcbO=o;kcbX=px;kcbY=py;kcbKb=kb||0;forNear(px,py,r,areaCb);}
 function hitEnemy(e,dmg,o,kx,ky,crit,ignoreArmor){
  if(e.dead||e.immune)return;
  if(e.armor&&!ignoreArmor)dmg=Math.max(1,dmg-e.armor);
  // online, the other phone reports the hit (batched) and only guesses the kill until player 1's phone confirms it
  if(net&&!host&&o===me){const h=outbox.h.get(e.uid)||[e.uid,0,0,0];h[1]+=dmg;h[2]+=kx;h[3]+=ky;outbox.h.set(e.uid,h);}
  e.hp-=dmg;e.fl=.09;e.lh=o;P[o].dmgDone+=dmg;e.kx+=kx*e.kbr;e.ky+=ky*e.kbr;
  if(TX.length<26&&(crit||rnd()<.5))text(e.x,e.y-e.r-8,String(Math.round(dmg)),crit?'#ffd23a':'#ffffff',crit?15:11,.55);
  if(e.hp<=0)killEnemy(e);else sfx('hit',65,()=>tone(150+rnd()*60,.03,.008,'square'));
 }
 function dmgRoll(p,base){const c=rnd()<critChance(p);return c?-base*p.st.might*2:base*p.st.might;}// negative = crit
 function hitW(e,p,base,kx,ky,ig){let d=dmgRoll(p,base),c=false;if(d<0){d=-d;c=true;}hitEnemy(e,d,p.i,kx,ky,c,ig);}
 function explode(px,py,r,dE,dP,o,col){
  if(net)outbox.ex.push([Math.round(px),Math.round(py),r,dP,col||'#ffb040']);
  fx(0,px,py,r,.45,col||'#ffb040');fx(2,px,py,r*.6,.18,'#fff');burst(px,py,14+(r>90?12:0),col||'#ffb040',r*2.2,.5,3);burst(px,py,6,'#444',r,.7,3);addShake(r>100?10:5);
  sfx('boom',90,()=>{tone(70,.28,.07,'sawtooth');tone(46,.35,.06,'square');});
  areaHit(px,py,r,dE,o,260);
  if(dP>0)for(const p of P)if(!p.down&&(p.x-px)**2+(p.y-py)**2<(r+PRAD)**2)hurtPlayer(p,dP);
  damageProps(px,py,r,30,o);
 }
 // ---------- props ----------
 function damageProps(px,py,r,dmg,o){
  const x0=Math.floor((px-r)/CS),x1=Math.floor((px+r)/CS),y0=Math.floor((py-r)/CS),y1=Math.floor((py+r)/CS);
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const ch=getChunk(cx,cy);if(ch.dn<=0)continue;for(let i=0;i<ch.dest.length;i++){const p=ch.dest[i];if(p.dead)continue;const dx=p.x-px,dy=p.y-py;if(dx*dx+dy*dy<(r+10)*(r+10))hitProp(p,dmg,o);}}
 }
 function hitProp(p,dmg,o){p.hp-=dmg;if(p.hp<=0)breakProp(p,o);else{p.shake=.15;burst(p.x,p.y-12,2,'#c9b48a',60,.3,2);}}
 // remote: online, the other phone broke it (its blast already went off there); drops come from player 1's phone only
 function breakProp(p,o,remote=false){
  p.dead=1;getChunk(Math.floor(p.x/CS),Math.floor(p.y/CS)).dn--;if(net&&!remote)outbox.pb.push([Math.round(p.x),Math.round(p.y)]);
  const lamp=p.type==='lamp'||p.type==='torch';burst(p.x,p.y-10,10,lamp?'#ffe58a':'#b99a68',130,.5,2.6);sfx('prop',80,()=>tone(240,.08,.03,'square'));
  if(p.expl&&!remote)explode(p.x,p.y-8,p.v===1?78:66,p.v===1?55:40,12,o,p.v===2?'#7dff4a':'#ff9a30');
  if(!host)return;
  if(p.v===2){Z.push(zone(0,p.x,p.y,56,4,6,.5,o));}
  const lk=P[o].st.luck;
  if(lamp||rnd()<.7+.05*lk){let tot=0;for(const d of HD.DROPS)tot+=d[1];let r=rnd()*tot,kind='gem';for(const d of HD.DROPS){r-=d[1];if(r<=0){kind=d[0];break;}}
   if(P[o].hp<P[o].maxHp*.4&&rnd()<.4)kind='chicken';
   if(kind==='gem')dropGem(p.x,p.y-6,5);else if(kind==='coin'){for(let i=0;i<3;i++)dropK('coin',p.x+(rnd()-.5)*30,p.y-6+(rnd()-.5)*20,1);}else dropK(kind,p.x,p.y-6,0);}
 }
 function zone(k,px,py,r,dur,dmg,tick,o){const z=take(Zpool,newZ);z.k=k;z.x=px;z.y=py;z.r=r;z.t=0;z.dur=dur;z.dmg=dmg;z.tick=tick;z.o=o||0;z.a=0;z.st=null;if(net)zOut.push(z);return z;}
 // ---------- pickups ----------
 function tierOf(v){return v>=100?3:v>=25?2:v>=5?1:0;}
 // online every gem / pickup has an id (dropped on player 1's phone, copied to the other phone {gm}/{km})
 let dropId=1;
 function dropGem(px,py,v){
  if(G.length>=300){const g=G[(rnd()*G.length)|0];g.v+=v;g.tier=tierOf(g.v);return;}
  const g=take(Gpool,newG);g.x=px+(rnd()-.5)*10;g.y=py+(rnd()-.5)*10;g.v=v;g.tier=tierOf(v);g.pull=false;g.sp=0;g.age=0;g.id=dropId++;G.push(g);
  if(net)outbox.gm.push([g.id,Math.round(g.x),Math.round(g.y),v]);
 }
 function dropK(k,px,py,v){if(K.length>=80)return;const q=take(Kpool,newK);q.x=px;q.y=py;q.k=k;q.v=v;q.age=0;q.life=k==='chest'?600:k==='coin'?24:40;q.pull=false;q.sp=0;q.id=dropId++;K.push(q);
  if(net)outbox.km.push([q.id,k,Math.round(px),Math.round(py),v]);}
 function killEnemy(e){
  if(e.dead)return;
  // online the other phone only guesses: the enemy vanishes until player 1's phone says otherwise
  if(net&&!host){e.dead=1;burst(e.x,e.y,e.boss?20:5,'#7a8e6a',110,.5,2.4);return;}
  e.dead=1;if(net)outbox.kd.push(e.uid);const o=e.lh,d=e.def,lk=P[o].st.luck;kills[o]++;totalKills++;scoreDirty=1;
  const col=e.type==='bloater'||e.type==='spitter'?'#a3b55a':e.type==='ghost'||e.type==='banshee'?'#bfe6ff':e.type==='tarman'?'#16181d':e.type==='bat'?'#4a3f5c':e.elite?'#d12020':'#7a8e6a';
  burst(e.x,e.y,e.boss?34:e.elite?14:5,col,e.boss?220:110,.55,e.boss?4:2.4);
  if(e.boss||e.elite)burst(e.x,e.y,8,'#8f1f1f',130,.6,3);
  if(e.boss||e.elite)addShake(e.boss?10:4);
  sfx('kill',55,()=>tone(95+rnd()*40,.05,.012,'triangle'));
  if(d.final){finalBoss=null;bossKills[o]++;bossBonus=true;for(let i=0;i<8;i++)dropGem(e.x+(rnd()-.5)*90,e.y+(rnd()-.5)*90,25);beginEnd('boss');return;}
  if(d.immune)return;
  if(e.boss){bossKills[o]++;const n=6;for(let i=0;i<n;i++)dropGem(e.x+(rnd()-.5)*90,e.y+(rnd()-.5)*90,Math.max(5,Math.round(d.xp/n*2)));for(let i=0;i<5;i++)dropK('coin',e.x+(rnd()-.5)*70,e.y+(rnd()-.5)*70,3);showBanner(foe(e.type)+' DOWN','',  '#ffd23a',2);}
  else if(e.xp>0)dropGem(e.x,e.y,e.xp);
  if(e.chest)dropK('chest',e.x,e.y,e.boss?1:0);
  if(!e.boss){const r=rnd(),l=1+lk*.25;if(r<.03*l)dropK('coin',e.x,e.y,mode.id==='short'?1:m5());else if(r<.03*l+.0045*l)dropK('chicken',e.x,e.y,0);else if(r<.03*l+.0045*l+.0012)dropK('magnet',e.x,e.y,0);else if(r<.03*l+.0045*l+.0012+.0008)dropK('bomb',e.x,e.y,0);}
  const a=e.ai;
  if(a===AI.barrel)explode(e.x,e.y,72,60,14,o,'#7dff4a');
  else if(e.type==='bloater')Z.push(zone(1,e.x,e.y,66,4,5,.5,0));
  else if(a===AI.mama){Z.push(zone(1,e.x,e.y,100,5,6,.5,0));for(let i=0;i<7;i++){const c2=spawnEnemy('crawler',e.x+(rnd()-.5)*80,e.y+(rnd()-.5)*80);if(c2)c2.mode=0;}}
 }
 const m5=()=>curM>4?5:1;
 // ---------- enemy spawning ----------
 const SP={x:0,y:0};
 // online the packs come in around either survivor, turn and turn about
 let edgeTurn=0;
 function edgePos(extra){const R=Math.hypot(W,H)/zoom/2+extra,a=rnd()*TAU,o=net&&!P[them].down&&(edgeTurn++&1)?P[them]:cam;SP.x=o.x+Math.cos(a)*R;SP.y=o.y+Math.sin(a)*R;}
 function spawnEnemy(type,px,py){
  if(E.length>=MAXE)return null;
  const d=ENEMIES[type],e=Epool.pop()||newEnemy(),m=curM;
  e.def=d;e.type=type;e.x=px;e.y=py;e.kx=e.ky=e.vx=e.vy=0;e.r=d.r;e.sz=d.sz;e.sc=1;e.ai=AI[d.ai];e.fly=d.fly||0;e.phase=d.phase||0;e.immune=d.immune||0;e.armor=d.armor||0;e.elite=d.elite||0;e.boss=d.boss||0;e.aura=d.aura?1:0;e.kbr=d.kb===undefined?1:d.kb;
  const hm=HD.hpMul(m,mode);
  e.mhp=e.hp=d.final?d.hp*mode.boss:d.boss&&!d.immune?d.hp*hm*.85:d.hp*hm;
  e.spd=d.spd*Math.min(1.25,1+.02*m);e.dmg=d.dmg*(1+.06*m)*mode.dmg;e.xp=d.xp;
  e.fl=0;e.slow=0;e.slowF=0;e.haste=0;e.dead=0;e.lh=0;e.st=0;e.t1=1+rnd()*2;e.t2=0;e.ang=0;e.mode=0;e.life=0;e.chest=0;e.at=0;e.hc=0;e.cd0=e.cd1=0;e.burn=0;e.bt=0;e.fuse=0;e.face=1;e.ph=rnd()*4;e.uid=uidN++;
  E.push(e);return e;
 }
 function chooseType(m){const w=wbuf;const tot=HD.spawnWeights(m,w);let r=rnd()*tot;for(let i=0;i<HD.SPAWNS.length;i++){r-=w[i];if(r<=0)return HD.SPAWNS[i][0];}return 'shambler';}
 const wbuf=new Array(HD.SPAWNS.length).fill(0);
 function spawnPack(){
  const t=chooseType(curM);edgePos(40+rnd()*60);
  const n=t==='crawler'||t==='runner'?2+((rnd()*2)|0):t==='shambler'?1+((rnd()*3)|0):t==='bat'?2:1;
  for(let i=0;i<n;i++){const e=spawnEnemy(t,SP.x+(rnd()-.5)*50,SP.y+(rnd()-.5)*50);if(e&&e.ai===AI.bat){e.vx=0;e.vy=0;}}
 }
 function announce(text,sub,col){showBanner(text,sub,col,2.6);sfx('boss',400,()=>{tone(70,.7,.08,'sawtooth');tone(52,.9,.06,'square');setTimeout(()=>tone(98,.4,.05,'sawtooth'),250);});addShake(8);}
 function fireEvent(ev){
  const mid={x:P.reduce((a,p)=>a+p.x,0)/P.length,y:P.reduce((a,p)=>a+p.y,0)/P.length};
  switch(ev.type){
   case 'elite':{edgePos(60);const t=ev.k%2?'nurse':'sergeant',e=spawnEnemy(t,SP.x,SP.y);if(e){e.chest=1;toast(foe(t)+' approaches. Kill it for a chest!','#ffb0a0');}break;}
   case 'mini':{const t=HD.MINIS[ev.k%4];edgePos(80);const e=spawnEnemy(t,SP.x,SP.y);if(e){e.chest=1;e.mhp=e.hp=e.hp*(1+Math.floor(ev.k/4)*.5);announce(foe(t),ENEMIES[t].line,'#ff5a4a');}break;}
   case 'bats':{const a=rnd()*TAU,ex=Math.cos(a),ey=Math.sin(a),R=Math.hypot(W,H)/zoom/2+60,n=Math.round(12+curM*1.2);toast('A swarm of bats!','#c9b6ff');for(let i=0;i<n;i++){const o=(i-n/2)*20,b=spawnEnemy('bat',mid.x+ex*R-ey*o+ex*(i%3)*16,mid.y+ey*R+ex*o+ey*(i%3)*16);if(b){b.mode=1;b.vx=-ex*165;b.vy=-ey*165;b.life=7;}}break;}
   case 'ring':{const R=Math.hypot(W,H)/zoom/2*.8+70,n=Math.min(44,Math.round(24+curM*3));toast('They are closing in!','#ffb0a0');for(let i=0;i<n;i++){const a=i/n*TAU,t=i%4===0?'crawler':'shambler',e=spawnEnemy(t,mid.x+Math.cos(a)*R,mid.y+Math.sin(a)*R);if(e){e.spd*=1.15;e.mhp=e.hp=e.hp*.8;}}break;}
   case 'wall':{const a=rnd()*TAU,ex=Math.cos(a),ey=Math.sin(a),R=Math.hypot(W,H)/zoom/2+50,span=Math.max(W,H)/zoom*.9,n=Math.min(34,Math.ceil(span/32));toast('A wall of the dead!','#ffb0a0');for(let i=0;i<n;i++){const o=(i-n/2)*32,e=spawnEnemy(i%5===2?'armored':'shambler',mid.x+ex*R-ey*o,mid.y+ey*R+ex*o);if(e){e.mode=1;e.vx=-ex*118;e.vy=-ey*118;e.life=9;e.xp=Math.max(1,e.xp);}}break;}
   case 'hazard':{stormUntil=clock+16;stormAcc=0;announce(cabin?'EVIL STORM':'TRIOXIN RAIN','Keep moving out of the red circles!','#ff7a3a');break;}
   case 'supply':{const a=rnd()*TAU;dropK('chest',mid.x+Math.cos(a)*170,mid.y+Math.sin(a)*170,0);toast('A supply chest dropped nearby!','#ffe27a');break;}
   case 'boss':{edgePos(90);const e=spawnEnemy('titan',SP.x,SP.y);if(e){e.chest=1;finalBoss=e;announce(foe('titan'),'The final boss. Kill it for a bonus, or survive until dawn.','#ff3a3a');}break;}
   case 'hunger':{edgePos(120);const e=spawnEnemy('hunger',SP.x,SP.y);if(e){hungerOn=true;hungerAt=clock;announce(foe('hunger'),'Cannot be killed. Survive until dawn!','#b06aff');}break;}
  }
 }
 function director(dt){
  curM=clock/D*mode.mt;
  while(evI<sched.length&&sched[evI].t<=clock)fireEvent(sched[evI++]);
  const cap=HD.capAt(curM,mode);spAcc+=HD.rateAt(curM,mode)*dt;
  let guard=0;while(spAcc>=1&&guard++<6){spAcc-=1;if(E.length<Math.min(cap,MAXE-30))spawnPack();}
  if(spAcc>8)spAcc=8;
  if(clock<stormUntil){stormAcc-=dt;if(stormAcc<=0){stormAcc=.38;for(const p of P){if(p.down||rnd()<.35)continue;const a=rnd()*TAU,r=40+rnd()*170;const z=zone(3,p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,58,1.1,16,0,0);z.a=60;}}}
 }

 // ---------- weapons ----------
 function spawnProj(k,o,px,py,vx,vy,dmg,life,r,pierce,kb){const q=take(PRpool,newProj);q.k=k;q.o=o;q.x=px;q.y=py;q.vx=vx;q.vy=vy;q.dmg=dmg;q.life=life;q.r=r;q.pierce=pierce;q.kb=kb;q.t=0;q.a=0;q.b=0;q.dead=0;q.hits.length=0;q.hh=0;q.sx=px;q.sy=py;q.tx=0;q.ty=0;q.st=null;q.ang=0;q.vis=0;PR.push(q);if(net&&o===me)prOut.push(q);return q;}
 let slA=0,slArc=0,slX=0,slY=0,slP=null,slD=0,slKb=0;
 function slashCb(e){const dx=e.x-slX,dy=e.y-slY,L=Math.sqrt(dx*dx+dy*dy)||1;let d=Math.atan2(dy,dx)-slA;d=Math.abs(Math.atan2(Math.sin(d),Math.cos(d)));if(d<=slArc/2+Math.atan2(e.r,L)){hitW(e,slP,slD,dx/L*slKb,dy/L*slKb,false);}}
 function slash(p,ang,arc,range,st){slP=p;slA=ang;slArc=arc;slX=p.x;slY=p.y;slD=st.dmg;slKb=st.kb;forNear(p.x,p.y,range,slashCb);damageProps(p.x+Math.cos(ang)*range*.5,p.y+Math.sin(ang)*range*.5,range*.5,st.dmg*p.st.might,p.i);fx(1,p.x,p.y,range,.22,'#e8f2ff',ang,arc);}
 let orbP=null,orbSt=null;
 function orbCb(e){const k=orbP.i;if((k?e.cd1:e.cd0)>0)return;if(k)e.cd1=orbSt.hitcd;else e.cd0=orbSt.hitcd;const dx=e.x-orbP.x,dy=e.y-orbP.y,L=Math.sqrt(dx*dx+dy*dy)||1;hitW(e,orbP,orbSt.dmg,dx/L*orbSt.kb,dy/L*orbSt.kb,false);}
 let auP=null,auSt=null,auHits=0;
 function auraCb(e){auHits++;const dx=e.x-auP.x,dy=e.y-auP.y;hitW(e,auP,auSt.dmg,0,0,true);e.slow=.8;if(auSt.slow>e.slowF||e.slow<=0)e.slowF=auSt.slow;}
 let pulP=null,pulSt=null;
 function pulseCb(e){const dx=e.x-pulP.x,dy=e.y-pulP.y,L=Math.sqrt(dx*dx+dy*dy)||1;hitW(e,pulP,pulSt.dmg,dx/L*pulSt.kb,dy/L*pulSt.kb,false);if(pulSt.burn){e.burn=3;e.lh=pulP.i;}}
 function lob(k,p,tx,ty,flight,dmg,r,split){const q=spawnProj(k,p.i,p.x,p.y,0,0,dmg,flight+1.5,r,split,0);q.sx=p.x;q.sy=p.y;q.tx=tx;q.ty=ty;q.a=flight;return q;}
 function updateWeapons(p,dt){
  const wl=p.weapons;
  for(let wi=0;wi<wl.length;wi++){
   const w=wl[wi],st=w.st,cdm=p.st.cd;
   switch(w.kind){
    case 'shot':{if((w.cd-=dt)>0)break;const t=nearestEnemy(p.x,p.y,440);if(!t){w.cd=0;break;}const a=Math.atan2(t.y-p.y,t.x-p.x),n=Math.round(st.count),sp=st.speed*p.st.pspeed;
     for(let j=0;j<n;j++){const aa=a+(n>1?(j/(n-1)-.5)*st.spread:0)+(rnd()-.5)*.07;spawnProj(0,p.i,p.x,p.y,Math.cos(aa)*sp,Math.sin(aa)*sp,st.dmg,st.life,st.size*p.st.area,st.pierce,st.kb);}
     w.cd=st.cd*cdm;sfx('shot'+p.i,80,()=>tone(95,.09,.03,'sawtooth'));fx(2,p.x+Math.cos(a)*16,p.y+Math.sin(a)*16,12,.08,'#ffd27a');break;}
    case 'rapid':{if((w.cd-=dt)>0)break;const t=nearestEnemy(p.x,p.y,460);if(!t){w.cd=0;break;}const a=Math.atan2(t.y-p.y,t.x-p.x),n=Math.round(st.count),sp=st.speed*p.st.pspeed;
     for(let j=0;j<n;j++){const aa=a+(n>1?(j-(n-1)/2)*.14:0)+(rnd()-.5)*st.spread*2;spawnProj(1,p.i,p.x,p.y,Math.cos(aa)*sp,Math.sin(aa)*sp,st.dmg,st.life,3,st.pierce,st.kb);}
     w.cd=st.cd*cdm;sfx('nail'+p.i,70,()=>tone(520,.03,.012,'square'));break;}
    case 'slash':{if((w.cd-=dt)>0)break;const range=st.range*p.st.area,t=nearestEnemy(p.x,p.y,range+50);if(!t){w.cd=0;break;}const a=Math.atan2(t.y-p.y,t.x-p.x);slash(p,a,st.arc,range,st);if(st.both&&st.arc<6)slash(p,a+Math.PI,st.arc,range*.85,st);w.cd=st.cd*cdm;sfx('saw'+p.i,100,()=>{tone(130,.1,.03,'sawtooth');});break;}
    case 'orbit':{const dur=st.dur*p.st.dur;
     if(w.on){w.t+=dt;w.ang+=st.spd*dt*(.6+.4*p.st.pspeed);if(st.gap>0&&w.t>=dur){w.on=false;w.t=0;}
      else{const n=Math.round(st.count),rad=st.radius*p.st.area;orbP=p;orbSt=st;for(let j=0;j<n;j++){const a=w.ang+j*TAU/n;forNear(p.x+Math.cos(a)*rad,p.y+Math.sin(a)*rad,st.size*p.st.area,orbCb);}}}
     else{w.t+=dt;if(w.t>=st.gap*cdm){w.on=true;w.t=0;}}
     break;}
    case 'pool':{if((w.cd-=dt)>0)break;if(!E.length){w.cd=0;break;}const n=Math.round(st.count);let thrown=0;for(let j=0;j<n;j++){const t=randomEnemy(p.x,p.y,st.range+80);let tx,ty;if(t){tx=t.x;ty=t.y;}else if(j===0){w.cd=0;break;}else continue;lob(6,p,tx,ty,.55,st.dmg*p.st.might,st.radius*p.st.area,0).b=st.dur*p.st.dur;thrown++;}
     if(thrown){w.cd=st.cd*cdm;sfx('lob'+p.i,120,()=>tone(300,.1,.03,'triangle'));}break;}
    case 'aura':{auP=p;auSt=st;w.t-=dt;w.pulse=Math.max(0,w.pulse-dt*3);if(w.t<=0){w.t=st.tick;w.pulse=1;auHits=0;forNear(p.x,p.y,st.radius*p.st.area,auraCb);if(st.heal&&auHits>0&&!p.down)p.hp=Math.min(p.maxHp,p.hp+st.heal);}break;}
    case 'boomerang':{if((w.cd-=dt)>0)break;const t=nearestEnemy(p.x,p.y,st.range+120);if(!t){w.cd=0;break;}const a=Math.atan2(t.y-p.y,t.x-p.x),n=Math.round(st.count);
     for(let j=0;j<n;j++){const aa=a+(n>1?(j-(n-1)/2)*.55:0),sp=st.speed*p.st.pspeed,q=spawnProj(2,p.i,p.x,p.y,Math.cos(aa)*sp,Math.sin(aa)*sp,st.dmg,8,st.size*p.st.area,0,st.kb);q.b=0;q.a=0;q.tx=st.range*p.st.area*(.8+.2*p.st.pspeed);}
     w.cd=st.cd*cdm;sfx('bar'+p.i,100,()=>tone(260,.08,.03,'triangle'));break;}
    case 'pulse':{if((w.cd-=dt)>0)break;const rad=st.radius*p.st.area;if(!nearestEnemy(p.x,p.y,rad*1.2)){w.cd=0;break;}pulP=p;pulSt=st;forNear(p.x,p.y,rad,pulseCb);damageProps(p.x,p.y,rad,st.dmg*p.st.might,p.i);fx(3,p.x,p.y,rad,.5,st.burn?'#ffd27a':'#fff2c0');fx(4,p.x,p.y,rad,.25,'#fff6cf');w.cd=st.cd*cdm;sfx('pulse'+p.i,150,()=>{tone(660,.15,.03,'sine');tone(990,.2,.02,'sine');});break;}
    case 'grenade':{if((w.cd-=dt)>0)break;if(!E.length){w.cd=0;break;}const n=Math.round(st.count);let thrown=0;
     for(let j=0;j<n;j++){let best=null,bc=-1;for(let k=0;k<7;k++){const e=randomEnemy(p.x,p.y,st.range+60);if(!e)continue;let c=0;for(let q=0;q<E.length&&q<400;q+=3){const o=E[q];if(!o.dead&&(o.x-e.x)**2+(o.y-e.y)**2<9000)c++;}if(c>bc){bc=c;best=e;}}
      if(!best)continue;const q=lob(5,p,best.x+(rnd()-.5)*30,best.y+(rnd()-.5)*30,.55,st.dmg*p.st.might,st.radius*p.st.area,st.split);q.b=st.fuse;thrown++;}
     if(thrown){w.cd=st.cd*cdm;sfx('gren'+p.i,120,()=>tone(330,.1,.03,'triangle'));}else w.cd=.3;break;}
    case 'summon':{if((w.cd-=dt)>0)break;if(!nearestEnemy(p.x,p.y,520)){w.cd=0;break;}const n=Math.round(st.count);
     for(let j=0;j<n;j++){const a=rnd()*TAU,q=spawnProj(4,p.i,p.x,p.y,Math.cos(a)*st.speed,Math.sin(a)*st.speed,st.dmg,st.life*p.st.dur,9,st.pierce,st.kb);q.a=st.shock;}
     w.cd=st.cd*cdm;sfx('med'+p.i,150,()=>{tone(880,.08,.025,'square');tone(660,.08,.025,'square');});break;}
    case 'bounce':{if((w.cd-=dt)>0)break;const t=nearestEnemy(p.x,p.y,420);if(!t){w.cd=0;break;}const a0=Math.atan2(t.y-p.y,t.x-p.x),n=Math.round(st.count);
     for(let j=0;j<n;j++){const a=a0+(n>1?(j-(n-1)/2)*.5:0),sp=st.speed*p.st.pspeed,q=spawnProj(3,p.i,p.x,p.y,Math.cos(a)*sp,Math.sin(a)*sp,st.dmg,st.life*p.st.dur,st.size*p.st.area,0,st.kb);q.b=Math.round(st.bounces);q.a=st.gold;q.tx=sp;}
     w.cd=st.cd*cdm;sfx('vin'+p.i,100,()=>tone(420,.07,.025,'triangle'));break;}
    case 'strike':{if((w.cd-=dt)>0)break;if(!E.length){w.cd=0;break;}const n=Math.round(st.count);let did=0;
     for(let j=0;j<n;j++){const e=randomEnemy(p.x,p.y,st.range+80);if(!e)continue;did++;strikeAt(p,e.x,e.y,st);}
     if(did){w.cd=st.cd*cdm;sfx('bolt'+p.i,100,()=>{tone(1200,.05,.04,'sawtooth');tone(300,.18,.04,'square');});}else w.cd=.25;break;}
   }
  }
 }
 function strikeAt(p,tx,ty,st){
  const r=st.radius*p.st.area,d=st.dmg*p.st.might;fx(5,tx,ty-420,0,.3,'#fff7a0',0,0,tx,ty);fx(2,tx,ty,r,.2,'#fff7a0');burst(tx,ty,5,'#fff7a0',100,.3,2.2);
  areaHit(tx,ty,r,d,p.i,60);damageProps(tx,ty,r,d,p.i);
  if(st.chain){let from=null;for(let k=0;k<2;k++){const o=nearestEnemyExcept(tx,ty,150,from);if(!o)break;fx(5,tx,ty,0,.2,'#fff7a0',0,0,o.x,o.y);hitEnemy(o,d*.6,p.i,0,0,false,true);from=o;}}
  addShake(2);
 }
 function nearestEnemyExcept(px,py,maxR,skip){let best=null,bd=maxR*maxR;for(let i=0;i<E.length;i++){const e=E[i];if(e.dead||e===skip||e.immune)continue;const dx=e.x-px,dy=e.y-py,d=dx*dx+dy*dy;if(d>1&&d<bd){bd=d;best=e;}}return best;}
 // ---------- projectiles ----------
 let pq=null,pqP=null;
 function projCb(e){
  const q=pq;if(q.dead)return;if(q.hits.length&&q.hits.indexOf(e.uid)>=0)return;
  q.hits.push(e.uid);const sp=Math.sqrt(q.vx*q.vx+q.vy*q.vy)||1;hitW(e,pqP,q.dmg,q.vx/sp*q.kb,q.vy/sp*q.kb,false);
  switch(q.k){
   case 0:case 1:if(q.pierce>0)q.pierce--;else q.dead=1;break;
   case 4:if(q.a){areaHit(e.x,e.y,46,q.dmg*pqP.st.might*.5,q.o,80);fx(2,e.x,e.y,40,.15,'#9ad8ff');}if(q.pierce>0)q.pierce--;else q.dead=1;break;
   case 3:{if(q.a&&rnd()<.4)dropK('coin',e.x,e.y,2);q.b--;if(q.b<0){q.dead=1;break;}const t=nearestEnemy(e.x,e.y,340,e);const v=q.tx||340;if(t){const a=Math.atan2(t.y-e.y,t.x-e.x);q.vx=Math.cos(a)*v;q.vy=Math.sin(a)*v;}else{const a=rnd()*TAU;q.vx=Math.cos(a)*v;q.vy=Math.sin(a)*v;}q.hits.length=0;q.hits.push(e.uid);break;}
  }
 }
 // online: the partner's shots are only shown here (their phone does the hitting)
 function visualProj(q,dt){q.t+=dt;q.life-=dt;
  if(q.k===2){q.ang+=dt*14;if(q.a===0){q.x+=q.vx*dt;q.y+=q.vy*dt;q.b+=Math.hypot(q.vx,q.vy)*dt;if(q.b>=q.tx)q.a=1;}else{const p=P[q.o],dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy)||1,sp=Math.hypot(q.vx,q.vy)*1.12;q.vx=dx/d*sp;q.vy=dy/d*sp;q.x+=q.vx*dt;q.y+=q.vy*dt;if(d<22||q.t>7)q.dead=1;}}
  else if(q.k===5||q.k===6){const f=Math.min(1,q.t/q.a);q.x=q.sx+(q.tx-q.sx)*f;q.y=q.sy+(q.ty-q.sy)*f;if(q.t>=q.a+(q.k===5?q.b:0))q.dead=1;}
  else{if(q.k===3)q.ang+=dt*12;q.x+=q.vx*dt;q.y+=q.vy*dt;}
  if(q.life<=0)q.dead=1;}
 function updateProjectiles(dt){
  for(let i=PR.length-1;i>=0;i--){
   const q=PR[i],p=P[q.o];if(q.vis){visualProj(q,dt);if(q.dead)release(PR,PRpool,i);continue;}pq=q;pqP=p;q.t+=dt;q.life-=dt;
   switch(q.k){
    case 0:case 1:{for(let s2=0;s2<2&&!q.dead;s2++){q.x+=q.vx*dt*.5;q.y+=q.vy*dt*.5;forNear(q.x,q.y,q.r,projCb);}if(((frameNo+i)&3)===0)damageProps(q.x,q.y,q.r+2,q.dmg*p.st.might*.6,q.o);break;}
    case 2:{q.ang+=dt*14;const dx0=q.vx,dy0=q.vy;
     if(q.a===0){q.x+=q.vx*dt;q.y+=q.vy*dt;q.b+=Math.sqrt(q.vx*q.vx+q.vy*q.vy)*dt;if(q.b>=q.tx){q.a=1;q.hits.length=0;}}
     else{const dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy)||1,sp=Math.sqrt(q.vx*q.vx+q.vy*q.vy)*1.12;q.vx=dx/d*sp;q.vy=dy/d*sp;q.x+=q.vx*dt;q.y+=q.vy*dt;if(d<22||q.t>7)q.dead=1;}
     forNear(q.x,q.y,q.r,projCb);if(((frameNo+i)&3)===0)damageProps(q.x,q.y,q.r+4,q.dmg*p.st.might,q.o);break;}
    case 3:{q.ang+=dt*12;q.x+=q.vx*dt;q.y+=q.vy*dt;forNear(q.x,q.y,q.r,projCb);if(q.life<=0)q.dead=1;break;}
    case 4:{q.hh-=dt;if(q.hh<=0){q.hh=.3;if(!q.st||q.st.dead||q.st.uid!==q.b){q.st=nearestEnemy(q.x,q.y,440);q.b=q.st?q.st.uid:0;}}
     const sp=Math.sqrt(q.vx*q.vx+q.vy*q.vy)||1;let a=Math.atan2(q.vy,q.vx);if(q.st&&!q.st.dead){const ta=Math.atan2(q.st.y-q.y,q.st.x-q.x);let d=ta-a;d=Math.atan2(Math.sin(d),Math.cos(d));const turn=6.5*dt;a+=clamp(d,-turn,turn);}
     const spd=Math.max(sp,P[q.o].weapons.length?200:200)*1;q.vx=Math.cos(a)*spd;q.vy=Math.sin(a)*spd;q.x+=q.vx*dt;q.y+=q.vy*dt;forNear(q.x,q.y,q.r,projCb);if(q.life<=0)q.dead=1;break;}
    case 5:case 6:{const f=Math.min(1,q.t/q.a);q.x=q.sx+(q.tx-q.sx)*f;q.y=q.sy+(q.ty-q.sy)*f;
     if(q.k===6&&q.t>=q.a){const z=zone(0,q.tx,q.ty,q.r,q.b,q.dmg,.45,q.o);z.a=.1;fx(2,q.tx,q.ty,q.r*.7,.2,'#9aff6a');sfx('splat',90,()=>tone(140,.14,.04,'sawtooth'));q.dead=1;}
     else if(q.k===5&&q.t>=q.a+q.b){explode(q.tx,q.ty,q.r,q.dmg,0,q.o,'#ffe27a');if(q.pierce){for(let j=0;j<3;j++){const a=rnd()*TAU,c2=lob(5,p,q.tx+Math.cos(a)*q.r*.9,q.ty+Math.sin(a)*q.r*.9,.3,q.dmg*.5,q.r*.65,0);c2.sx=q.tx;c2.sy=q.ty;c2.b=.15;}}q.dead=1;}
     break;}
   }
   if(q.life<=0&&q.k<5)q.dead=1;
   if(q.dead)release(PR,PRpool,i);
  }
 }
 function enemyShot(e,ang,spd,k,r,dm){if(ES.length>=120)return;const q=take(ESpool,newES);q.x=e.x;q.y=e.y;q.vx=Math.cos(ang)*spd;q.vy=Math.sin(ang)*spd;q.r=r;q.dmg=e.dmg*dm;q.life=3.2;q.k=k;ES.push(q);if(net)esOut.push(q);}
 function updateEnemyShots(dt){
  for(let i=ES.length-1;i>=0;i--){const q=ES[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;let dead=q.life<=0;
   if(!dead)for(let k=0;k<P.length;k++){const p=P[k];if(p.down)continue;const dx=p.x-q.x,dy=p.y-q.y,rr=q.r+PRAD-3;if(dx*dx+dy*dy<rr*rr){if(hurtPlayer(p,q.dmg)||p.inv>0)dead=true;break;}}
   if(dead){burst(q.x,q.y,3,q.k===0?'#8cff4a':q.k===1?'#ffb04a':'#c07aff',60,.3,2);release(ES,ESpool,i);}}
 }
 function updateZones(dt){
  for(let i=Z.length-1;i>=0;i--){const z=Z[i];z.t+=dt;let done=false;
   switch(z.k){
    case 0:z.a-=dt;if(z.a<=0){z.a=z.tick;if(!(net&&z.o!==me))areaHit(z.x,z.y,z.r,z.dmg,z.o,0);}if(rnd()<dt*12)particle(z.x+(rnd()-.5)*z.r*1.4,z.y+(rnd()-.5)*z.r,0,-40-rnd()*30,.6,2.4,cabin?'#ff9a30':'#8cff4a',0);if(z.t>=z.dur)done=true;break;
    case 1:z.a-=dt;if(z.a<=0){z.a=z.tick;for(const p of P)if(!p.down&&(p.x-z.x)**2+(p.y-z.y)**2<(z.r+8)**2)hurtPlayer(p,z.dmg);}if(rnd()<dt*8)particle(z.x+(rnd()-.5)*z.r*1.4,z.y+(rnd()-.5)*z.r,0,-20,.8,3,'#a3b55a',0);if(z.t>=z.dur)done=true;break;
    case 2:for(const p of P)if(!p.down&&(p.x-z.x)**2+(p.y-z.y)**2<z.r*z.r)p.slow=.4;if(z.t>=z.dur)done=true;break;
    case 3:if(z.t>=z.dur){fx(0,z.x,z.y,z.r,.4,z.st==='push'?'#e0c8ff':'#ff8a3a');fx(2,z.x,z.y,z.r*.6,.15,'#fff');burst(z.x,z.y,10,z.st==='push'?'#e0c8ff':'#ff8a3a',z.r*2,.4,2.6);addShake(z.st==='push'?7:3);sfx('zap',80,()=>tone(90,.2,.06,'sawtooth'));
      for(const p of P)if(!p.down&&(p.x-z.x)**2+(p.y-z.y)**2<(z.r+PRAD)**2){hurtPlayer(p,z.dmg);if(z.st==='push'){const dx=p.x-z.x,dy=p.y-z.y,d=Math.sqrt(dx*dx+dy*dy)||1;p.vx+=dx/d*420;p.vy+=dy/d*420;}}
      if(z.a>0&&host){areaHit(z.x,z.y,z.r,z.a,net?me:rnd()<.5?0:1,200);damageProps(z.x,z.y,z.r,20,0);}
      if(z.st==='push')forNear(z.x,z.y,z.r,knockCb,z.x,z.y);done=true;}break;
   }
   if(done)release(Z,Zpool,i);
  }
 }
 // ---------- enemies ----------
 let auE=null;
 function auraCb2(o){if(o===auE||o.boss)return;if(auE.def.aura==='haste')o.haste=.8;else o.hp=Math.min(o.mhp,o.hp+3+curM);}
 function updateEnemies(dt){
  const p0=P[0],p1=mate(p0),fwx=W/zoom/2+420,fwy=H/zoom/2+420,Dm=mode.dmg;
  for(let i=0;i<E.length;i++){
   const e=E[i];if(e.dead)continue;
   if(e.fl>0)e.fl-=dt;if(e.slow>0)e.slow-=dt;if(e.haste>0)e.haste-=dt;if(e.hc>0)e.hc-=dt;if(e.cd0>0)e.cd0-=dt;if(e.cd1>0)e.cd1-=dt;
   if(e.burn>0){e.burn-=dt;e.bt-=dt;if(e.bt<=0){e.bt=.5;hitEnemy(e,3+curM*1.2,e.lh,0,0,false,true);if(e.dead)continue;}if(rnd()<dt*10)particle(e.x,e.y-e.r,0,-30,.4,2,'#ff9a30',0);}
   let tp=null,bd=1e18;
   if(!p0.down){const dx=p0.x-e.x,dy=p0.y-e.y;bd=dx*dx+dy*dy;tp=p0;}
   if(!p1.down){const dx=p1.x-e.x,dy=p1.y-e.y,d2=dx*dx+dy*dy;if(d2<bd){bd=d2;tp=p1;}}
   if(!tp){tp=p0;const dx=tp.x-e.x,dy=tp.y-e.y;bd=dx*dx+dy*dy;}
   const dx=tp.x-e.x,dy=tp.y-e.y,d=Math.sqrt(bd)||1,nx=dx/d,ny=dy/d;
   const sp=e.spd*(e.slow>0?1-e.slowF:1)*(e.haste>0?1.3:1);let mx=0,my=0;
   if(e.mode===1){mx=e.vx;my=e.vy;e.life-=dt;if(e.life<=0)e.mode=0;}
   else switch(e.ai){
    case 0:mx=nx*sp;my=ny*sp;break;
    case 1:{const w=Math.sin(clock*4+e.ph)*.55;mx=(nx-ny*w)*sp;my=(ny+nx*w)*sp;break;}
    case 2:{if(e.st===0){const w=Math.sin(clock*7+e.ph)*.6;mx=(nx-ny*w)*sp;my=(ny+nx*w)*sp;if(d<46){e.st=1;e.t2=1.3;e.vx=nx*sp*1.1;e.vy=ny*sp*1.1;}}else{mx=e.vx;my=e.vy;e.t2-=dt;if(e.t2<=0)e.st=0;}break;}
    case 3:{const want=d>240?1:d<150?-1:0,w=Math.sin(clock*1.5+e.ph);mx=(nx*want-ny*w*.6)*sp;my=(ny*want+nx*w*.6)*sp;e.t1-=dt;
     if(e.st===0&&e.t1<=0&&d<350){e.st=1;e.t2=.5;}
     if(e.st===1){mx*=.15;my*=.15;e.t2-=dt;if(e.t2<=0){e.st=0;e.t1=2.1+rnd()*1.2;enemyShot(e,Math.atan2(dy,dx),175,0,6,1);sfx('spit',100,()=>tone(200,.08,.02,'sine'));}}break;}
    case 4:{if(e.fuse>0){e.fuse-=dt;if(e.fuse<=0){e.lh=tp.i;e.hp=0;killEnemy(e);continue;}}else if(d<e.r+PRAD+22)e.fuse=.55;else{mx=nx*sp;my=ny*sp;}break;}
    case 5:{if(e.st===0){mx=nx*sp;my=ny*sp;e.t1-=dt;if(d<300&&e.t1<=0){e.st=1;e.t2=.6;e.ang=Math.atan2(dy,dx);}}
     else if(e.st===1){e.t2-=dt;if(e.t2<=0){e.st=2;e.t2=.5;}}
     else if(e.st===2){mx=Math.cos(e.ang)*420;my=Math.sin(e.ang)*420;e.t2-=dt;if(e.t2<=0){e.st=3;e.t2=.9;}}
     else{e.t2-=dt;if(e.t2<=0){e.st=0;e.t1=2.2;}}break;}
    case 6:{const w=Math.sin(clock*2.2+e.ph)*.9;mx=(nx-ny*w)*sp;my=(ny+nx*w)*sp;break;}
    case 7:{e.t1-=dt;e.t2-=dt;
     if(e.st===0){mx=nx*sp;my=ny*sp;if(e.t1<=0){e.t1=2.6;if(Z.length<60)Z.push(zone(2,e.x,e.y,52,6,0,0,0));}if(e.t2<=0&&d<340){e.st=1;e.t2=.6;e.ang=Math.atan2(dy,dx);}}
     else if(e.st===1){e.t2-=dt;if(e.t2<=0){e.st=2;e.t2=.55;}}
     else{mx=Math.cos(e.ang)*340;my=Math.sin(e.ang)*340;e.t2-=dt;if(e.t2<=0){e.st=0;e.t2=7;}}break;}
    case 8:{const want=d>240?1:d<170?-1:0,w=Math.sin(clock*.9+e.ph);mx=(nx*want-ny*w*.5)*sp;my=(ny*want+nx*w*.5)*sp;e.t1-=dt;
     if(e.st===0&&e.t1<=0&&d<420){e.st=1;e.t2=.55;}
     if(e.st===1){mx*=.1;my*=.1;e.t2-=dt;if(e.t2<=0){e.st=0;e.t1=2.7;const a=Math.atan2(dy,dx);for(let k=-2;k<=2;k++)enemyShot(e,a+k*.2,250,1,6,.5);sfx('gun',100,()=>tone(150,.1,.04,'square'));}}break;}
    case 9:{const w=Math.sin(clock*2+e.ph)*.8;mx=(nx-ny*w)*sp;my=(ny+nx*w)*sp;e.t1-=dt;if(e.t1<=0){e.t1=5.5;const z=zone(3,e.x,e.y,190,.7,e.dmg*.6,0,0);z.a=0;z.st='push';sfx('shriek',200,()=>{tone(900,.4,.05,'sawtooth');tone(1300,.4,.03,'sawtooth');});for(let k=0;k<5;k++)spawnEnemy('bat',e.x+(rnd()-.5)*80,e.y+(rnd()-.5)*80);}break;}
    case 10:{mx=nx*sp;my=ny*sp;e.t1-=dt;if(e.t1<=0){e.t1=3.4;if(E.length<MAXE-20)for(let k=0;k<2;k++)spawnEnemy('crawler',e.x+(rnd()-.5)*70,e.y+(rnd()-.5)*70);}break;}
    case 11:{const low=e.hp<e.mhp*.4;e.t1-=dt;
     if(e.st===0){mx=nx*sp;my=ny*sp;if(e.t1<=0){const r=rnd();if(r<.4){e.st=1;e.t2=1;const z=zone(3,e.x,e.y,175,1,e.dmg,0,0);z.a=0;z.st='push';}else if(r<.75){e.st=2;e.t2=.6;}else{e.st=3;e.t2=.7;}}}
     else{e.t2-=dt;if(e.st===2&&e.t2<=0){const n=low?20:14,o=rnd()*TAU;for(let k=0;k<n;k++)enemyShot(e,o+k*TAU/n,150+(k&1)*35,2,7,.45);sfx('volley',100,()=>tone(110,.3,.06,'sawtooth'));}
      if(e.st===3&&e.t2<=0){if(E.length<MAXE-24)for(let k=0;k<(low?10:7);k++){const a=k/7*TAU;spawnEnemy(k%3===0?'armored':'shambler',e.x+Math.cos(a)*90,e.y+Math.sin(a)*90);}}
      if(e.t2<=0){e.st=0;e.t1=low?2.2:3.4;}}break;}
    case 12:{const sv=Math.min(235,78+(clock-hungerAt)*2.6);mx=nx*sv;my=ny*sv;break;}
   }
   e.x+=(mx+e.kx)*dt;e.y+=(my+e.ky)*dt;const kd=Math.max(0,1-dt*7);e.kx*=kd;e.ky*=kd;
   if(mx>1)e.face=1;else if(mx<-1)e.face=-1;
   if(!e.fly&&!e.phase)solidPush(e,e.r*.7);
   if(e.r<24&&((i+frameNo)&1)===0){const cx=Math.floor(e.x/CELL),cy=Math.floor(e.y/CELL),md=e.r*1.7;
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)for(let j=head[hashOf(cx+ox,cy+oy)];j>=0;j=nxt[j]){if(j===i)continue;const o=E[j];if(o.dead)continue;const ddx=e.x-o.x,ddy=e.y-o.y,dd=ddx*ddx+ddy*ddy,mm=md+o.r*.3;if(dd<mm*mm&&dd>.01){const l=Math.sqrt(dd),k=(mm-l)/l*.5;e.x+=ddx*k;e.y+=ddy*k;}}}
   if(e.aura){e.at-=dt;if(e.at<=0){e.at=.5;auE=e;forNear(e.x,e.y,150,auraCb2);}}
   // contact
   if(e.hc<=0&&e.fuse<=0&&!(e.ai===AI.charger&&e.st===1)){
    for(let k=0;k<P.length;k++){const p=P[k];if(p.down)continue;const ex=p.x-e.x,ey=p.y-e.y,rr=e.r+PRAD-2;if(ex*ex+ey*ey<rr*rr){const hit=e.ai===AI.hunger?hurtPlayer(p,0,.34):hurtPlayer(p,e.dmg);if(hit){e.hc=.8;if(e.ai===AI.hunger||e.boss){p.vx+=ex/(Math.sqrt(ex*ex+ey*ey)||1)*300;p.vy+=ey/(Math.sqrt(ex*ex+ey*ey)||1)*300;}}}}
   }
   // recycle stragglers (online: only once they are far from both survivors)
   if(!e.boss&&!e.elite&&e.mode===0&&(Math.abs(e.x-cam.x)>fwx||Math.abs(e.y-cam.y)>fwy)&&!(net&&Math.abs(e.x-P[them].x)<fwx&&Math.abs(e.y-P[them].y)<fwy)){edgePos(30+rnd()*60);e.x=SP.x;e.y=SP.y;e.kx=e.ky=0;}
  }
 }
 function sweepDead(){for(let i=E.length-1;i>=0;i--)if(E[i].dead){const e=E[i];E[i]=E[E.length-1];E.pop();Epool.push(e);}}
 // ---------- pickups ----------
 function bombBlast(p){
  if(net&&!host)outbox.bomb.push([Math.round(p.x),Math.round(p.y)]);
  whiteFlash=1;addShake(14);sound('win');fx(0,p.x,p.y,Math.max(W,H)/zoom*.6,.7,'#ffffff');text(p.x,p.y-50,'BOOM!','#ffe27a',18,1.2);
  for(let i=0;i<E.length;i++){const e=E[i];if(e.dead||e.immune||!onScreen(e.x,e.y,30))continue;e.lh=p.i;if(e.boss||e.elite){hitEnemy(e,e.mhp*.1,p.i,0,0,false,true);}else{e.hp=0;killEnemy(e);}}
  for(let i=0;i<ES.length;i++)ES[i].life=0;
 }
 // online each phone picks up only for its own survivor (and tells the other phone {g}/{k})
 const pickers=()=>net?[P[me]]:P;
 function updatePickups(dt){
  const PP=pickers();
  for(let i=G.length-1;i>=0;i--){
   const g=G[i];g.age+=dt;let best=null,bd=1e18;for(let k=0;k<PP.length;k++){const p=PP[k];if(p.down)continue;const dx=p.x-g.x,dy=p.y-g.y,d2=dx*dx+dy*dy;if(d2<bd){bd=d2;best=p;}}
   if(!best)continue;const R=92*best.st.magnet;if(!g.pull&&bd<R*R)g.pull=true;
   if(g.pull){g.sp=Math.min(620,g.sp+1100*dt);const d=Math.sqrt(bd)||1;g.x+=(best.x-g.x)/d*g.sp*dt;g.y+=(best.y-g.y)/d*g.sp*dt;}
   if(bd<17*17){gainXp(best,g.v);pickupSound(s);if(net)outbox.g.push(g.id);release(G,Gpool,i);}
  }
  for(let i=K.length-1;i>=0;i--){
   const q=K[i];q.age+=dt;if(q.age>q.life){release(K,Kpool,i);continue;}
   let best=null,bd=1e18;for(let k=0;k<PP.length;k++){const p=PP[k];if(p.down)continue;const dx=p.x-q.x,dy=p.y-q.y,d2=dx*dx+dy*dy;if(d2<bd){bd=d2;best=p;}}
   if(!best)continue;
   if(q.k==='coin'){const R=92*best.st.magnet;if(!q.pull&&bd<R*R)q.pull=true;if(q.pull){q.sp=Math.min(560,q.sp+1000*dt);const d=Math.sqrt(bd)||1;q.x+=(best.x-q.x)/d*q.sp*dt;q.y+=(best.y-q.y)/d*q.sp*dt;}}
   const tr=q.k==='chest'?34:26;if(bd<tr*tr){
    switch(q.k){
     case 'coin':addCoins(best,q.v);sfx('coin',50,()=>{tone(1318,.05,.03,'square');tone(1760,.08,.03,'square');});break;
     case 'chicken':best.hp=Math.min(best.maxHp,best.hp+best.maxHp*.3);text(best.x,best.y-40,'+'+Math.round(best.maxHp*.3),'#7dff9a',14,.9);sound('pickup');burst(best.x,best.y,8,'#7dff9a',90,.5,2.4);s.react?.(best.i,'happy');break;
     case 'magnet':for(const g of G)g.pull=true;for(const k2 of K)if(k2.k==='coin')k2.pull=true;text(best.x,best.y-40,'MAGNET!','#9ad8ff',14,1);sound('unlock');break;
     case 'bomb':bombBlast(best);break;
     case 'chest':{const got=openChest(best,q.v===1);modalQ.push({type:'chest',pi:best.i,got});nextModal();break;}
    }
    if(net)outbox.k.push(q.id);release(K,Kpool,i);
   }
  }
 }
 // ---------- players ----------
 const dirOut={x:0,y:0,m:0};
 const botCache=[{x:0,y:0,m:0,t:0},{x:0,y:0,m:0,t:0}];
 function botDir(i){
  const c2=botCache[i];if(frameNo-c2.t<3&&frameNo>=c2.t){dirOut.x=c2.x;dirOut.y=c2.y;dirOut.m=c2.m;return;}c2.t=frameNo;
  const p=P[i],o=mate(p);let tg=null,bd=1e18;
  for(const g of G){const d=(g.x-p.x)**2+(g.y-p.y)**2+(i?(g.x-o.x)**2*.3:0);if(d<bd){bd=d;tg=g;}}
  for(const k of K)if(k.k!=='bomb'){const d=(k.x-p.x)**2+(k.y-p.y)**2;if(d<bd*1.5){bd=d;tg=k;}}
  let best=-1e18,bx=0,by=0;
  for(let a=0;a<16;a++){const ang=a/16*TAU,dx=Math.cos(ang),dy=Math.sin(ang),nx=p.x+dx*100,ny=p.y+dy*100;let sc=0;
   for(let k=0;k<E.length;k++){const e=E[k];if(e.dead)continue;const ex=e.x-nx,ey=e.y-ny;if(ex>260||ex<-260||ey>260||ey<-260)continue;const d=Math.sqrt(ex*ex+ey*ey),R=e.r+36+(e.boss?50:0);if(d<R*3)sc-=(R*3/Math.max(d,R*.6))**2*(e.boss?3:1);}
   for(const z of Z)if(z.k===3||z.k===1||z.k===0){const zd=Math.hypot(z.x-nx,z.y-ny);if(zd<z.r+30)sc-=40;}
   if(tg&&bd<500*500)sc-=Math.hypot(tg.x-nx,tg.y-ny)*.07;
   const pd=Math.hypot(o.x-nx,o.y-ny);if(pd>230)sc-=(pd-230)*.05;if(o.down)sc-=pd*.05;
   if(sc>best){best=sc;bx=dx;by=dy;}}
  c2.x=dirOut.x=bx;c2.y=dirOut.y=by;c2.m=dirOut.m=1;
 }
 function readDir(i){
  dirOut.x=0;dirOut.y=0;dirOut.m=0;
  if(bot.on){botDir(i);return;}
  const st=stick[i];
  if(st.on){const vx=st.fx-st.ax,vy=st.fy-st.ay,d=Math.sqrt(vx*vx+vy*vy);if(d>6){if(d>60){const k=(d-60)/d;st.ax+=vx*k;st.ay+=vy*k;}dirOut.x=vx/d;dirOut.y=vy/d;dirOut.m=clamp((Math.min(d,60)-6)/36,.25,1);}return;}
  const one=alone||!!net;   // one survivor on this device: WASD and the arrows both steer it
  let dx=0,dy=0;if(i===0||net){dx=(keys.d||one&&keys.ArrowRight?1:0)-(keys.a||one&&keys.ArrowLeft?1:0);dy=(keys.s||one&&keys.ArrowDown?1:0)-(keys.w||one&&keys.ArrowUp?1:0);}else{dx=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0);dy=(keys.ArrowDown?1:0)-(keys.ArrowUp?1:0);}
  const l=Math.sqrt(dx*dx+dy*dy);if(l>0){dirOut.x=dx/l;dirOut.y=dy/l;dirOut.m=1;}
 }
 function updatePlayers(dt){
  const lx=W/zoom*.8,ly=(H-hudH)/zoom*.8;
  for(let i=0;i<P.length;i++){
   const p=P[i],o=mate(p);
   if(net&&i===them){stepPuppet(p,dt);continue;}
   if(p.inv>0)p.inv-=dt;if(p.hurt>0)p.hurt-=dt;if(p.slow>0)p.slow-=dt;
   if(p.down){if(!o.down&&Math.hypot(p.x-o.x,p.y-o.y)<58){p.revT+=dt;if(p.revT>=2.5)reviveFx(p,.45,'REVIVED!');}else p.revT=Math.max(0,p.revT-dt*.6);continue;}
   if(p.st.regen>0&&p.hp<p.maxHp)p.hp=Math.min(p.maxHp,p.hp+p.st.regen*dt);
   readDir(i);let dx=dirOut.x,dy=dirOut.y;let mag=dirOut.m;
   // online: picking a card (the game doesn't pause) = standing still and safe
   if(net&&modal){dx=dy=mag=0;p.inv=Math.max(p.inv,.3);}
   // soft tether to partner (one shared screen; online each phone has its own camera)
   const px=o.x-p.x,py=o.y-p.y,pl=Math.sqrt(px*px+py*py)||1,r=net?0:Math.max(Math.abs(px)/lx,Math.abs(py)/ly);
   if(r>.8&&mag>0){const away=-(dx*px+dy*py)/pl;if(away>0){const k=clamp((1-r)/.2,0,1);dx+=px/pl*away*(1-k);dy+=py/pl*away*(1-k);}}
   const spd=PSPD*(p.slow>0?.5:1)*mag;
   p.x+=dx*spd*dt+p.vx*dt;p.y+=dy*spd*dt+p.vy*dt;const kd=Math.max(0,1-dt*8);p.vx*=kd;p.vy*=kd;
   if(r>1){const k=Math.min(1,(r-1))*150*dt;p.x+=px/pl*k;p.y+=py/pl*k;}
   p.moving=mag>0;if(mag>0){p.walk+=dt*10;if(dx>.2)p.face=1;else if(dx<-.2)p.face=-1;}
   solidPush(p,PRAD-3);
  }
 }
 function updateCamera(dt,snap){
  let tx,ty;const a=P[0],b=mate(a);
  if(net){const p=P[me],o=P[them],f=p.down&&!o.down?.7:0;tx=p.x*(1-f)+o.x*f;ty=p.y*(1-f)+o.y*f;const k=snap?1:Math.min(1,dt*6);cam.x+=(tx-cam.x)*k;cam.y+=(ty-cam.y)*k;return;}
  if(a.down&&!b.down){tx=b.x*.7+a.x*.3;ty=b.y*.7+a.y*.3;}else if(b.down&&!a.down){tx=a.x*.7+b.x*.3;ty=a.y*.7+b.y*.3;}else{tx=(a.x+b.x)/2;ty=(a.y+b.y)/2;}
  const k=snap?1:Math.min(1,dt*6);cam.x+=(tx-cam.x)*k;cam.y+=(ty-cam.y)*k;
  // hard clamp: keep both heads on screen below the HUD
  const vw=W/zoom/2-26,top=cam.y-H/zoom/2+(hudH+14)/zoom,bot2=cam.y+H/zoom/2-24;
  for(const p of P){p.x=clamp(p.x,cam.x-vw,cam.x+vw);p.y=clamp(p.y,top,bot2);}
 }

 // ---------- step ----------
 function step(dt){
  frameNo++;
  // online the other phone follows player 1's clock and enemies (stepNetEnemies) and runs no director
  if(state==='play'){clock+=dt;if(!host){clock=Math.min(clock,D);}else if(clock>=D){clock=D;beginEnd('dawn');}else director(dt);}
  else if(state==='ending'){endT+=dt;}
  buildHash();
  updatePlayers(dt);updateCamera(dt,false);ensureWorld();
  if(host)updateEnemies(dt);else stepNetEnemies(dt);
  recFx=!!net;for(const p of P)if(!p.down&&(!net||p.i===me))updateWeapons(p,dt);recFx=false;
  updateProjectiles(dt);updateEnemyShots(dt);updateZones(dt);updatePickups(dt);if(host)sweepDead();else netSweep();
  updateFx(dt);
 }
 function updateFx(dt){
  for(let i=PT.length-1;i>=0;i--){const p=PT[i];p.life-=dt;if(p.life<=0){release(PT,PTpool,i);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;const d=Math.max(0,1-dt*3);p.vx*=d;p.vy*=d;}
  for(let i=TX.length-1;i>=0;i--){const t=TX[i];t.life-=dt;if(t.life<=0){release(TX,TXpool,i);continue;}t.y+=t.vy*dt;t.vy*=Math.max(0,1-dt*3);}
  for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.t+=dt;if(f.t>=f.dur)release(FX,FXpool,i);}
  shake*=Math.max(0,1-dt*7);if(shake<.15)shake=0;hurtFlash=Math.max(0,hurtFlash-dt*1.4);whiteFlash=Math.max(0,whiteFlash-dt*1.6);
  if(banner.t>0)banner.t-=dt;for(let i=toasts.length-1;i>=0;i--){toasts[i].t-=dt;if(toasts[i].t<=0)toasts.splice(i,1);}
  scoreTick-=dt;if(scoreTick<=0){scoreTick=.3;if(scoreDirty){scoreDirty=0;s.setScores(currentScores());if(alone)soloProgress(s,playerScore(0),0,`${cabin?'Evil Dead':'Return of the Living Dead'} solo: ${fmtTime(clock)} survived, ${totalKills} kills.`);}const left=Math.max(0,D-clock);s.status(`${title} · ${fmtTime(left)} left · ${totalKills} kills`);}
 }
 const evoBonusScore=()=>0;
 function playerScore(i){return kills[i]+P[i].lvl*8+P[i].coins+bossKills[i]*50;}
 function currentScores(){return[playerScore(0),alone?0:playerScore(1)];}
 function beginEnd(kind){
  if(state==='ending')return;state='ending';endKind=kind;endT=0;modal=null;modalQ.length=0;if(net&&host)nf.event({end:kind,bb:bossBonus?1:0});
  if(kind==='lose'){sound('lose');showBanner('THE HORDE WINS','You were overrun.','#ff5a4a',3.4);}
  else{won=true;for(const e of E){if(e.dead)continue;e.dead=1;if(onScreen(e.x,e.y,20))burst(e.x,e.y,4,e.type==='hunger'?'#b06aff':'#fff2c0',90,.6,2.4);}
   for(const g of G)g.pull=true;whiteFlash=1;sound('win');setTimeout(()=>sound('unlock'),300);addShake(8);
   showBanner(kind==='dawn'?'DAWN BREAKS':'BOSS DOWN',kind==='dawn'?'The sun burns the dead away. You survived!':'The night is yours. Bonus awarded!','#ffd23a',3.2);}
 }
 let finishing=false;
 async function finishRun(){
  if(!s.alive||finishing)return;finishing=true;
  const secs=Math.floor(clock),bonus=won?100+(bossBonus?300+Math.round((D-clock)*2):0):0,sc=[playerScore(0)+bonus,alone?0:playerScore(1)+bonus];
  // online each phone counts its own survivor (kills come from player 1's phone), then the two swap
  if(net){nf.finish({sc:sc[me]});const o=await nf.remoteDone();if(!s.alive)return;if(o&&Number.isFinite(o.sc))sc[them]=o.sc;}
  const total=sc[0]+sc[1];
  s.teamResult={kind:'survival',won,tied:false,humanTotal:total,cpuTotal:0,cpuScores:[0,0],duration:secs};
  if(alone){soloProgress(s,sc[0],0,'');s.solo.won=won;}
  const mmss=`${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
  s.finish(sc,`${won?(endKind==='boss'?'The final boss is dead!':alone?'Dawn broke and you survived!':'Dawn broke and you both survived!'):'The horde won this night.'} ${cabin?'Evil Dead':'Return of the Living Dead'}: survived ${mmss} · ${totalKills} kills · ${total} ${alone?'':'team '}points.`);
 }
 function startRun(idx,go=false){
  if(state!=='menu')return;
  // online player 1 picks the night; both start together
  if(net&&!go){if(host&&!netPick){netPick=true;menuSel=idx;nf.event({night:idx});nf.start('go').then(()=>startRun(idx,true));}return;}mode=alone?soloMode(MODES[idx]):MODES[idx];D=mode.time;sched=HD.buildSchedule(mode);evI=0;clock=0;curM=0;state='play';
  if(alone){P[0].x=0;P[0].y=70;}else{P[0].x=-64;P[1].x=64;P[0].y=P[1].y=70;}cam.x=0;cam.y=70;updateCamera(0,true);
  modalQ.push(...P.filter(p=>!net||p.i===me).map(p=>({type:'start',pi:p.i})));nextModal();sound('start');
  showBanner(cabin?'DEFEND THE CABIN':'SURVIVE THE NIGHT',`${mode.label} · until dawn`,'#ffd23a',2.6);
 }

 // ---------- layout ----------
 function layout(){
  if(s.W===W&&s.H===H&&vig)return;
  W=s.W;H=s.H;ui=clamp(Math.sqrt(W*H)/600,.85,1.3);zoom=clamp(Math.min(W,H*.85)/480,.78,1.15);hudH=Math.round(ui*96);
  lc.width=Math.max(8,Math.ceil(W/4));lc.height=Math.max(8,Math.ceil(H/4));
  vig=document.createElement('canvas');vig.width=Math.max(8,Math.ceil(W/2));vig.height=Math.max(8,Math.ceil(H/2));const vg=vig.getContext('2d'),g=vg.createRadialGradient(vig.width/2,vig.height/2,Math.min(vig.width,vig.height)*.3,vig.width/2,vig.height/2,Math.hypot(vig.width,vig.height)/2);g.addColorStop(0,'rgba(150,0,0,0)');g.addColorStop(1,'rgba(150,0,0,.85)');vg.fillStyle=g;vg.fillRect(0,0,vig.width,vig.height);
  for(const st of stick)st.on=false;seen.clear();
 }
 // ---------- text helpers ----------
 const fcache={};
 function setFont(sz,w){const k=sz*10+(w?1:0);let f=fcache[k];if(!f)f=fcache[k]=`${w||'bold'} ${sz}px ${FONT}`;x.font=f;}
 function txt(str,px,py,sz,col,align,outline,w){setFont(sz,w);x.textAlign=align||'left';x.textBaseline='middle';if(outline){x.lineWidth=Math.max(2,sz/5);x.strokeStyle='rgba(8,10,16,.9)';x.lineJoin='round';x.strokeText(str,px,py);}x.fillStyle=col||'#fff';x.fillText(str,px,py);}
 const wrapCache=new Map();
 function wrap(str,sz,maxW){const k=str+'|'+sz+'|'+Math.round(maxW);let r=wrapCache.get(k);if(r)return r;setFont(sz,'normal');const words=str.split(' '),lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(x.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}else cur=t;}if(cur)lines.push(cur);wrapCache.set(k,lines);return lines;}
 function panel(px,py,w,h,r,fill,stroke,lw){HD.rr(x,px,py,w,h,r);x.fillStyle=fill;x.fill();if(stroke){x.lineWidth=lw||2;x.strokeStyle=stroke;x.stroke();}}

 // ---------- rendering ----------
 const DL=[],LIGHTS=new Float32Array(3*64);let nLights=0;
 const byY=(a,b)=>a.sy-b.sy;
 function addLight(wx,wy,r,a){if(nLights<64){const o=nLights*3;LIGHTS[o]=wx;LIGHTS[o+1]=wy;LIGHTS[o+2]=r;nLights++;}}
 function drawProp(p,t){
  let v=p.v;if(p.dead){if(p.type==='lamp'||p.type==='torch')v=1;else return;}
  const a=propArt[p.type][v];if(!a)return;const sc=p.sc,sh=p.shake>0?Math.sin(t*60)*1.5:0;if(p.shake>0)p.shake-=.016;
  x.drawImage(a.img,p.x-a.ax*sc+sh,p.y-a.ay*sc,a.w*sc,a.h*sc);
 }
 function drawEnemy(e,t){
  const a=enemyArt[e.type],dsz=a.sz*e.sc,f=((t*4+e.ph)|0)&1,cy=e.y+e.r-dsz*20/48-(e.fly?8+Math.sin(t*6+e.ph)*3:0);
  let row=e.fl>0?1:0;if(e.fuse>0&&((t*14)&1))row=1;if(e.ai===AI.charger&&e.st===1&&((t*12)&1))row=1;
  if(e.phase)x.globalAlpha=.6+.2*Math.sin(t*3+e.ph);
  x.drawImage(a.img,((e.face<0?2:0)+f)*a.cell,row*a.cell,a.cell,a.cell,e.x-dsz/2,cy-dsz/2,dsz,dsz);
  if(e.phase)x.globalAlpha=1;
  if(e.elite||e.boss){const w=Math.max(30,e.r*2.2),by=e.y-e.r-(e.boss?22:14);x.fillStyle='rgba(0,0,0,.6)';x.fillRect(e.x-w/2-1,by-1,w+2,6);x.fillStyle=e.immune?'#9a6aff':e.boss?'#ff4a3a':'#ff8a3a';x.fillRect(e.x-w/2,by,w*clamp(e.hp/e.mhp,0,1),4);}
 }
 function drawPlayer(p,t){
  const i=p.i,bob=p.moving?Math.abs(Math.sin(p.walk))*3:Math.sin(t*3+i)*1;
  x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(p.x,p.y+16,14,5,0,0,TAU);x.fill();
  x.strokeStyle=PCOL[i];x.lineWidth=2;x.globalAlpha=p.down?.4:.85;x.beginPath();x.ellipse(p.x,p.y+16,17,6.5,0,0,TAU);x.stroke();
  if(p.inv>0&&!p.down&&((t*16)&1))x.globalAlpha=.45;else x.globalAlpha=p.down?.55:1;
  if(!p.down){const lg=Math.sin(p.walk)*(p.moving?5:0);x.strokeStyle='#1a1d26';x.lineWidth=4;x.lineCap='round';x.beginPath();x.moveTo(p.x-4,p.y+6);x.lineTo(p.x-4+lg,p.y+16);x.moveTo(p.x+4,p.y+6);x.lineTo(p.x+4-lg,p.y+16);x.stroke();
   HD.rr(x,p.x-8,p.y-5-bob*.5,16,15,5);x.fillStyle=PCOL[i];x.fill();x.lineWidth=1.5;x.strokeStyle='#10150f';x.stroke();}
  const hy=p.y-20-bob;x.save();x.translate(p.x,hy);if(p.face<0)x.scale(-1,1);
  s.sprite(x,i,0,0,52,{exact:true,mood:p.hurt>0||p.down?'sad':undefined});x.restore();x.globalAlpha=1;
  if(!p.down){x.fillStyle=PCOL[i];x.beginPath();x.moveTo(p.x-5,p.y-58-bob);x.lineTo(p.x+5,p.y-58-bob);x.lineTo(p.x,p.y-51-bob);x.closePath();x.fill();
   if(p.hp<p.maxHp){x.fillStyle='rgba(0,0,0,.65)';x.fillRect(p.x-18,p.y+22,36,5);x.fillStyle=p.hp<p.maxHp*.3?'#ff4a4a':'#5fe08a';x.fillRect(p.x-17,p.y+23,34*p.hp/p.maxHp,3);}}
  else{x.strokeStyle='#e8e2cf';x.lineWidth=3;x.beginPath();x.moveTo(p.x,p.y-8);x.lineTo(p.x,p.y+14);x.moveTo(p.x-7,p.y);x.lineTo(p.x+7,p.y);x.stroke();
   x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=5;x.beginPath();x.arc(p.x,p.y-4,26,0,TAU);x.stroke();x.strokeStyle='#7dff9a';x.beginPath();x.arc(p.x,p.y-4,26,-Math.PI/2,-Math.PI/2+TAU*clamp(p.revT/2.5,0,1));x.stroke();
   txt('HELP!',p.x,p.y-42,12,'#ffe27a',  'center',true);}
 }
 function gemRect(g,vx0,vx1,vy0,vy1){return g.x>vx0&&g.x<vx1&&g.y>vy0&&g.y<vy1;}
 function render(t){
  layout();
  const sx=reduced?0:(rnd()-.5)*shake,sy=reduced?0:(rnd()-.5)*shake,camX=cam.x+sx,camY=cam.y+sy,hw=W/zoom/2,hh=H/zoom/2;
  x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation='source-over';x.fillStyle='#0d130f';x.fillRect(0,0,W,H);
  x.setTransform(zoom,0,0,zoom,W/2-camX*zoom,H/2-camY*zoom);
  const vx0=camX-hw-60,vx1=camX+hw+60,vy0=camY-hh-60,vy1=camY+hh+80;
  if(!skip.ground){x.fillStyle=groundPat;x.fillRect(vx0,vy0,vx1-vx0,vy1-vy0);}
  DL.length=0;nLights=0;
  const cx0=Math.floor((vx0-120)/CS),cx1=Math.floor((vx1+120)/CS),cy0=Math.floor((vy0-120)/CS),cy1=Math.floor((vy1+120)/CS);
  const th=HD.THEMES[theme];
  for(let cy=cy0;cy<=cy1;cy++)for(let cx=cx0;cx<=cx1;cx++){const ch=getChunk(cx,cy);
   if(ch.roadH||ch.roadV){x.fillStyle=th.road;if(ch.roadH)x.fillRect(cx*CS,cy*CS+CS/2-RW/2,CS,RW);if(ch.roadV)x.fillRect(cx*CS+CS/2-RW/2,cy*CS,RW,CS);
    x.fillStyle=cabin?'rgba(0,0,0,.18)':'rgba(230,210,120,.35)';if(!cabin){if(ch.roadH)for(let k=0;k<CS;k+=60)x.fillRect(cx*CS+k,cy*CS+CS/2-2,32,4);if(ch.roadV)for(let k=0;k<CS;k+=60)x.fillRect(cx*CS+CS/2-2,cy*CS+k,4,32);}}
  }
  for(let cy=cy0;cy<=cy1;cy++)for(let cx=cx0;cx<=cx1;cx++){const ps=getChunk(cx,cy).props;for(let i=0;i<ps.length;i++){const p=ps[i];if(p.x<vx0-60||p.x>vx1+60||p.y<vy0||p.y>vy1+120)continue;
   if(p.type==='bones'||p.type==='rubble'){drawProp(p,t);continue;}p.sy=p.y;DL.push(p);
   if(p.lit&&!p.dead)addLight(p.x,p.y-48,200);}}
  {const b=LM[0];if(Math.abs(b.x-camX)<hw+200&&Math.abs(b.y-camY)<hh+200){b.sy=b.y;DL.push(b);}}
  // ground effects
  for(let i=0;i<Z.length;i++){const z=Z[i];
   if(z.k===0){const a=.5*Math.min(1,(z.dur-z.t)*1.5);x.fillStyle=cabin?`rgba(255,120,30,${a*.55})`:`rgba(90,230,60,${a*.5})`;x.beginPath();x.ellipse(z.x,z.y,z.r,z.r*.72,0,0,TAU);x.fill();x.strokeStyle=cabin?`rgba(255,200,80,${a})`:`rgba(180,255,120,${a})`;x.lineWidth=2;x.stroke();addLight(z.x,z.y,z.r*2.2);}
   else if(z.k===1){const a=.4*Math.min(1,(z.dur-z.t));x.fillStyle=`rgba(150,170,60,${a})`;x.beginPath();x.ellipse(z.x,z.y,z.r,z.r*.75,0,0,TAU);x.fill();}
   else if(z.k===2){const a=.7*Math.min(1,(z.dur-z.t));x.fillStyle=`rgba(10,10,14,${a})`;x.beginPath();x.ellipse(z.x,z.y,z.r,z.r*.7,0,0,TAU);x.fill();}
   else{const f=clamp(z.t/z.dur,0,1);x.strokeStyle=`rgba(255,70,50,${.4+.4*Math.sin(t*20)*(1-f)})`;x.lineWidth=3;x.fillStyle=`rgba(255,40,30,${.12+.18*f})`;x.beginPath();x.ellipse(z.x,z.y,z.r,z.r*.8,0,0,TAU);x.fill();x.stroke();x.beginPath();x.ellipse(z.x,z.y,z.r*f,z.r*f*.8,0,0,TAU);x.stroke();}}
  for(const p of P){if(p.down)continue;for(const w of p.weapons){
   if(w.kind==='aura'){const rad=w.st.radius*p.st.area,pl=w.pulse;x.fillStyle=`rgba(20,22,28,${.28+pl*.15})`;x.beginPath();x.ellipse(p.x,p.y+8,rad,rad*.75,0,0,TAU);x.fill();x.strokeStyle=`rgba(${w.evo?'255,210,90':'90,100,120'},${.5+pl*.4})`;x.lineWidth=2;x.stroke();}}}
  for(let i=0;i<E.length;i++){const e=E[i];if(!e.elite&&!e.boss)continue;const c2=e.boss?(e.immune?'160,100,255':'255,60,60'):'255,110,60';x.strokeStyle=`rgba(${c2},${.5+.25*Math.sin(t*5)})`;x.lineWidth=2;x.beginPath();x.ellipse(e.x,e.y+e.r*.7,e.r+8,(e.r+8)*.45,0,0,TAU);x.stroke();if(e.aura){x.strokeStyle=`rgba(${c2},.15)`;x.beginPath();x.ellipse(e.x,e.y+e.r*.7,150,110,0,0,TAU);x.stroke();}}
  // pickups below actors
  for(let i=0;i<G.length;i++){const g=G[i];if(!gemRect(g,vx0,vx1,vy0,vy1))continue;const gi=gemArt[g.tier],sz=g.tier===0?12:g.tier===1?15:g.tier===2?19:24;x.drawImage(gi,g.x-sz/2,g.y-sz/2+Math.sin(t*4+g.x)*1.2,sz,sz);}
  for(let i=0;i<K.length;i++){const q=K[i];if(!gemRect(q,vx0,vx1,vy0,vy1))continue;const bob=Math.sin(t*3+q.x)*2;
   if(q.k==='coin'){const w=18*Math.abs(Math.cos(t*5+q.x));x.drawImage(iconG.coin,q.x-w/2,q.y-9+bob,Math.max(2,w),18);continue;}
   if(q.k==='chest'){x.globalAlpha=.6+.3*Math.sin(t*4);x.drawImage(glowWhite,q.x-40,q.y-40,80,80);x.globalAlpha=1;x.drawImage(iconG.chest,q.x-18,q.y-18+bob,36,36);addLight(q.x,q.y,130);continue;}
   if(q.age>q.life-5&&((t*8)&1))continue;
   const ic=q.k==='chicken'?(cabin?iconG.chicken:iconG.growth):iconG[q.k];x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(q.x,q.y+12,10,4,0,0,TAU);x.fill();x.drawImage(ic,q.x-14,q.y-16+bob,28,28);if(q.k==='magnet'||q.k==='bomb'){x.globalAlpha=.5;x.drawImage(q.k==='bomb'?glowRed:glowWhite,q.x-26,q.y-28+bob,52,52);x.globalAlpha=1;}}
  // actors
  for(let i=0;i<E.length;i++){const e=E[i];if(e.dead||Math.abs(e.x-camX)>hw+70||Math.abs(e.y-camY)>hh+90)continue;e.sy=e.y+e.r*.5;DL.push(e);}
  for(const p of P){p.sy=p.y;DL.push(p);}
  DL.sort(byY);
  for(let i=0;i<DL.length;i++){const o=DL[i];if(o.dk===1)drawEnemy(o,t);else if(o.dk===2)drawPlayer(o,t);else if(o.type==='building'){x.drawImage(building.img,o.x-building.w/2,o.y-building.h+10);}else drawProp(o,t);}
  // orbiters
  for(const p of P){if(p.down)continue;for(const w of p.weapons){if(w.kind!=='orbit'||!w.on)continue;const n=Math.round(w.st.count),rad=w.st.radius*p.st.area,sz=w.st.size*p.st.area*2.6;for(let j=0;j<n;j++){const a=w.ang+j*TAU/n;x.drawImage(iconG.necro,p.x+Math.cos(a)*rad-sz/2,p.y+Math.sin(a)*rad*.9-sz/2-8,sz,sz);}}}
  // projectiles
  for(let i=0;i<PR.length;i++){const q=PR[i];
   switch(q.k){
    case 0:x.fillStyle='#ffd27a';x.beginPath();x.arc(q.x,q.y,q.r,0,TAU);x.fill();x.fillStyle='rgba(255,230,160,.35)';x.beginPath();x.arc(q.x-q.vx*.012,q.y-q.vy*.012,q.r*1.3,0,TAU);x.fill();break;
    case 1:x.strokeStyle='#e7edf2';x.lineWidth=2;x.beginPath();x.moveTo(q.x,q.y);x.lineTo(q.x-q.vx*.018,q.y-q.vy*.018);x.stroke();break;
    case 2:case 3:{const ic=q.k===2?iconG.crowbar:iconG.vinyl,sz=q.r*(q.k===2?3.4:2.6);x.save();x.translate(q.x,q.y);x.rotate(q.ang);x.drawImage(ic,-sz/2,-sz/2,sz,sz);x.restore();break;}
    case 4:x.drawImage(iconG.medic,q.x-10,q.y-10,20,20);if((t*10|0)&1){x.fillStyle='rgba(255,70,70,.5)';x.beginPath();x.arc(q.x,q.y-10,5,0,TAU);x.fill();}break;
    case 5:case 6:{const f=Math.min(1,q.t/q.a),h=Math.sin(f*Math.PI)*46,ic=q.k===5?iconG.grenade:iconG.barrel;
     x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(q.x,q.y,8,3,0,0,TAU);x.fill();
     if(q.k===5&&f>=1){x.strokeStyle=`rgba(255,220,120,${.3+.3*Math.sin(t*30)})`;x.lineWidth=2;x.beginPath();x.ellipse(q.tx,q.ty,q.r,q.r*.75,0,0,TAU);x.stroke();}
     x.save();x.translate(q.x,q.y-h-8);if(f<1)x.rotate(q.t*10);x.drawImage(ic,-11,-11,22,22);x.restore();break;}
   }}
  for(let i=0;i<ES.length;i++){const q=ES[i];const c2=q.k===0?'#8cff4a':q.k===1?'#ffb04a':'#c07aff';x.fillStyle=c2;x.beginPath();x.arc(q.x,q.y,q.r,0,TAU);x.fill();x.fillStyle='rgba(255,255,255,.6)';x.beginPath();x.arc(q.x-1.5,q.y-1.5,q.r*.35,0,TAU);x.fill();}
  // fx
  for(let i=0;i<FX.length;i++){const f=FX[i],u=f.t/f.dur,a=1-u;
   switch(f.k){
    case 0:{const r=f.r*(1-(1-u)*(1-u));x.strokeStyle=f.col;x.globalAlpha=a*.9;x.lineWidth=5*a+1;x.beginPath();x.arc(f.x,f.y,r,0,TAU);x.stroke();x.globalAlpha=a*.25;x.fillStyle=f.col;x.fill();x.globalAlpha=1;addLight(f.x,f.y,f.r*1.5);break;}
    case 1:{x.globalAlpha=a;x.fillStyle='rgba(235,245,255,.35)';x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.moveTo(f.x,f.y);x.arc(f.x,f.y,f.r*(.55+.45*u),f.a-f.b/2,f.a+f.b/2);x.closePath();x.fill();x.stroke();x.globalAlpha=1;break;}
    case 2:{x.globalAlpha=a;x.drawImage(glowWhite,f.x-f.r,f.y-f.r,f.r*2,f.r*2);x.globalAlpha=1;break;}
    case 3:{const r=f.r*u;x.strokeStyle=f.col;x.globalAlpha=a;x.lineWidth=10*a+2;x.beginPath();x.arc(f.x,f.y,r,0,TAU);x.stroke();x.globalAlpha=1;addLight(f.x,f.y,f.r*1.3);break;}
    case 4:{x.globalAlpha=a*.45;x.fillStyle=f.col;x.beginPath();x.arc(f.x,f.y,f.r*Math.min(1,u*3),0,TAU);x.fill();x.globalAlpha=1;break;}
    case 5:{x.strokeStyle='#fffbd0';x.globalAlpha=a;x.lineWidth=3;x.beginPath();x.moveTo(f.x,f.y);const n=7;for(let k=1;k<n;k++){const tt=k/n;x.lineTo(f.x+(f.x2-f.x)*tt+(rnd()-.5)*18,f.y+(f.y2-f.y)*tt);}x.lineTo(f.x2,f.y2);x.stroke();x.globalAlpha=1;addLight(f.x2,f.y2,120);break;}
   }}
  for(let i=0;i<PT.length;i++){const p=PT[i];x.globalAlpha=Math.min(1,p.life/p.max*1.6);x.fillStyle=p.col;x.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);}x.globalAlpha=1;
  for(let i=0;i<TX.length;i++){const q=TX[i];x.globalAlpha=Math.min(1,q.life/q.max*2);txt(q.txt,q.x,q.y,q.sz,q.col,'center',true);}x.globalAlpha=1;
  // lighting
  x.setTransform(1,0,0,1,0,0);
  if(!skip.light){const p=clock/D;let amb=clamp(.12+.48*p,0,.64)+(hungerOn?.1:0);if(state==='ending'&&endKind!=='lose'&&endKind!=='')amb*=clamp(1-endT/2,0,1);
   lx.setTransform(1,0,0,1,0,0);lx.globalCompositeOperation='source-over';lx.globalAlpha=1;lx.clearRect(0,0,lc.width,lc.height);lx.fillStyle=`rgba(4,6,20,${amb})`;lx.fillRect(0,0,lc.width,lc.height);lx.globalCompositeOperation='destination-out';
   const k=lc.width/W,pr=(400-130*p)*zoom;
   for(const pl of P){if(pl.down)continue;const lx0=(pl.x-camX)*zoom+W/2,ly0=(pl.y-camY)*zoom+H/2;lx.drawImage(lightBig,(lx0-pr)*k,(ly0-pr)*k,pr*2*k,pr*2*k);}
   for(let i=0;i<nLights;i++){const o=i*3,r=LIGHTS[o+2]*zoom,lx0=(LIGHTS[o]-camX)*zoom+W/2,ly0=(LIGHTS[o+1]-camY)*zoom+H/2;if(lx0<-r||lx0>W+r||ly0<-r||ly0>H+r)continue;lx.globalAlpha=.9;lx.drawImage(lightSoft,(lx0-r)*k,(ly0-r)*k,r*2*k,r*2*k);}
   lx.globalAlpha=1;x.drawImage(lc,0,0,W,H);}
  if(hurtFlash>0){x.globalAlpha=Math.min(1,hurtFlash*1.4);x.drawImage(vig,0,0,W,H);x.globalAlpha=1;}
  if(whiteFlash>0){x.fillStyle=`rgba(255,255,240,${whiteFlash*.8})`;x.fillRect(0,0,W,H);}
  drawArrows(camX,camY);
 }
 function drawArrows(camX,camY){
  const mk2=(wx,wy,col)=>{const sx=(wx-camX)*zoom+W/2,sy=(wy-camY)*zoom+H/2;if(sx>12&&sx<W-12&&sy>hudH&&sy<H-12)return;const ax=clamp(sx,22,W-22),ay=clamp(sy,hudH+14,H-22),ang=Math.atan2(sy-H/2,sx-W/2);x.save();x.translate(ax,ay);x.rotate(ang);x.fillStyle=col;x.strokeStyle='#10150f';x.lineWidth=2;x.beginPath();x.moveTo(11,0);x.lineTo(-7,-8);x.lineTo(-3,0);x.lineTo(-7,8);x.closePath();x.fill();x.stroke();x.restore();};
  for(const q of K)if(q.k==='chest')mk2(q.x,q.y,'#ffd23a');
  if(net&&P[them].nx!=null)mk2(P[them].x,P[them].y,PCOL[them]);   // online: where the partner is
  if(finalBoss&&!finalBoss.dead)mk2(finalBoss.x,finalBoss.y,'#ff4a3a');
 }
 function drawHUD(t){
  x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;
  const left=Math.max(0,D-clock),cx=W/2,tb=Math.round(42*ui);
  txt(fmtTime(left),cx,Math.round(15*ui),Math.round(24*ui),left<30&&hungerOn?'#ff6a6a':'#ffffff','center',true);
  const bw=Math.min(W*.5,340),bx=cx-bw/2,by=Math.round(33*ui);x.fillStyle='rgba(0,0,0,.55)';x.fillRect(bx-1,by-1,bw+2,7*ui);x.fillStyle='#ffd27a';x.fillRect(bx,by,bw*clamp(clock/D,0,1),5*ui);
  x.fillStyle='#ff4a4a';x.fillRect(bx+bw*(1-mode.bossLead/D)-1,by-3,3,10*ui);x.fillStyle='#b06aff';x.fillRect(bx+bw*(1-mode.hungerLead/D)-1,by-3,3,10*ui);
  const ks=Math.round(13*ui);x.drawImage(iconG.skull,cx-bw/2-0,Math.round(5*ui),ks,ks);txt(String(totalKills),cx-bw/2+ks+3,Math.round(11*ui),Math.round(12*ui),'#ffe9c8','left',true);
  x.drawImage(iconG.coin,cx+bw/2-ks-38*ui,Math.round(5*ui),ks,ks);txt(String(coinsTeam),cx+bw/2-ks-38*ui+ks+3,Math.round(11*ui),Math.round(12*ui),'#ffe27a','left',true);
  for(let i=0;i<P.length;i++){
   const p=P[i],pw=Math.min(W/2-10,300*ui),x0=i?W-pw-6:6,y0=tb,hs=Math.round(30*ui);
   panel(x0,y0,pw,Math.round(52*ui),8,'rgba(10,14,24,.62)',p.down?'#ff5a5a':PCOL[i],1.5);
   s.sprite(x,i,x0+hs/2+3,y0+hs/2+3,hs,{exact:true,mood:p.down?'sad':undefined});
   const bx0=x0+hs+8,bw2=pw-hs-14;
   txt(s.players[i].name,bx0,y0+Math.round(8*ui),Math.round(11*ui),PCOL[i],'left',false);txt('LV '+p.lvl,x0+pw-6,y0+Math.round(8*ui),Math.round(11*ui),'#ffe9c8','right',false);
   x.fillStyle='rgba(0,0,0,.6)';x.fillRect(bx0,y0+Math.round(14*ui),bw2,Math.round(9*ui));x.fillStyle=p.hp<p.maxHp*.3?'#ff4a4a':'#4fd37a';x.fillRect(bx0+1,y0+Math.round(15*ui),(bw2-2)*clamp(p.hp/p.maxHp,0,1),Math.round(7*ui));
   x.fillStyle='rgba(0,0,0,.6)';x.fillRect(bx0,y0+Math.round(25*ui),bw2,Math.round(4*ui));x.fillStyle='#58b8ff';x.fillRect(bx0,y0+Math.round(25*ui),bw2*clamp(p.xp/p.need,0,1),Math.round(4*ui));
   if(p.wind||p.revLeft>0){const n=(p.wind?1:0)+p.revLeft;x.drawImage(iconG.revive,x0+pw-Math.round(15*ui)-(n>1?10*ui:0),y0+Math.round(30*ui),Math.round(13*ui),Math.round(13*ui));}
   const ss=Math.round(16*ui),gy=y0+Math.round(33*ui);
   for(let k=0;k<6;k++){const w=p.weapons[k],sx=x0+4+k*(ss+1);if(w){x.drawImage(iconUI[w.id],sx,gy,ss,ss);if(w.evo){x.strokeStyle='#ffd23a';x.lineWidth=1.5;x.strokeRect(sx,gy,ss,ss);}else if(evoReady(p,w)){x.strokeStyle=`rgba(255,230,120,${.5+.5*Math.sin(t*8)})`;x.lineWidth=2;x.strokeRect(sx,gy,ss,ss);}txt(w.evo?'*':String(w.lvl),sx+ss-1,gy+ss-Math.round(3*ui),Math.round(8*ui),w.lvl>=MAX_LEVEL?'#ffd23a':'#fff','right',true);}else{x.fillStyle='rgba(255,255,255,.08)';x.fillRect(sx,gy,ss,ss);}}
   const pids=Object.keys(p.passives);
   for(let k=0;k<6;k++){const id=pids[k],sx=x0+pw-4-(6-k)*(ss+1)+1-(p.wind||p.revLeft?0:0);if(id){x.drawImage(iconUI[id],sx,gy,ss,ss);txt(String(p.passives[id]),sx+ss-1,gy+ss-Math.round(3*ui),Math.round(8*ui),'#fff','right',true);}else{x.fillStyle='rgba(255,255,255,.08)';x.fillRect(sx,gy,ss,ss);}}
  }
  // boss bar
  let boss=finalBoss&&!finalBoss.dead?finalBoss:null;if(!boss)for(const e of E)if(e.boss&&!e.dead&&!e.immune){boss=e;break;}
  if(boss){const w=Math.min(W*.6,420),y=hudH+Math.round(6*ui);x.fillStyle='rgba(0,0,0,.6)';x.fillRect(W/2-w/2-2,y-2,w+4,Math.round(12*ui)+4);x.fillStyle='#ff4a3a';x.fillRect(W/2-w/2,y,w*clamp(boss.hp/boss.mhp,0,1),Math.round(12*ui));txt(foe(boss.type),W/2,y+Math.round(6*ui),Math.round(10*ui),'#fff','center',true);}
  let ty=hudH+Math.round((boss?30:12)*ui);for(const tt of toasts){x.globalAlpha=Math.min(1,tt.t);txt(tt.txt,W/2,ty,Math.round(12*ui),tt.col,'center',true);ty+=Math.round(16*ui);}x.globalAlpha=1;
  if(banner.t>0){const u=1-banner.t/banner.dur,a=Math.min(1,banner.t*2,u*6),sc=1+Math.max(0,.25-u*1.2),by=H*.34;x.globalAlpha=a;x.fillStyle='rgba(0,0,0,.45)';x.fillRect(0,by-Math.round(34*ui),W,Math.round(86*ui));x.save();x.translate(W/2,by);x.scale(sc,sc);txt(banner.text,0,0,Math.round(34*ui),banner.col,'center',true);x.restore();if(banner.sub)txt(banner.sub,W/2,by+Math.round(32*ui),Math.round(14*ui),'#fff','center',true);x.globalAlpha=1;}
 }
 // ---------- menu / modal ----------
 let menuRects=[],cardRects=[];
 function drawMenu(t){
  x.setTransform(1,0,0,1,0,0);x.fillStyle='rgba(6,8,16,.78)';x.fillRect(0,0,W,H);
  const wide=W>=H*1.2&&W>=620,tY=Math.round(34*ui);
  txt(cabin?'EVIL DEAD':'RETURN OF THE LIVING DEAD',W/2,tY,Math.round((wide?30:22)*ui),'#ffd27a','center',true);
  txt(cabin?'CABIN DEFENSE':'HORDE',W/2,tY+Math.round(28*ui),Math.round((wide?24:20)*ui),'#ff7a5a','center',true);
  txt('How long will the night last?',W/2,tY+Math.round(58*ui),Math.round(14*ui),'#e8ecf5','center',true);
  const hs=Math.round(46*ui);s.sprite(x,0,W/2-hs*1.1,tY+Math.round(100*ui),hs,{exact:true});s.sprite(x,1,W/2+hs*1.1,tY+Math.round(100*ui),hs,{exact:true});
  const top=tY+Math.round(138*ui),n=MODES.length;menuRects.length=0;
  const gap=10,bw=wide?Math.min(300,(W-60-gap*2)/3):Math.min(W-28,420),bh=wide?Math.min(H-top-Math.round(70*ui),190*ui):Math.min((H-top-Math.round(88*ui)-gap*(n-1))/n,110*ui);
  for(let i=0;i<n;i++){const m=MODES[i],bx=wide?W/2-(bw*3+gap*2)/2+i*(bw+gap):W/2-bw/2,by=wide?top:top+i*(bh+gap),sel=i===menuSel;
   menuRects.push({x:bx,y:by,w:bw,h:bh});
   panel(bx,by,bw,bh,14,sel?'rgba(60,44,22,.95)':'rgba(20,26,40,.92)',sel?'#ffd27a':'#4a5878',sel?4:2);
   if(wide){txt(m.name,bx+bw/2,by+bh*.2,Math.round(19*ui),'#fff','center',false);txt(m.label,bx+bw/2,by+bh*.46,Math.round(44*ui),sel?'#ffd27a':'#cfd8ea','center',true);
    const ls=wrap(m.blurb,Math.round(12*ui),bw-24);ls.forEach((l,k)=>txt(l,bx+bw/2,by+bh*.7+k*Math.round(15*ui),Math.round(12*ui),'#b8c4dc','center',false,'normal'));}
   else{txt(m.name,bx+16,by+bh*.28,Math.round(19*ui),'#fff','left',false);txt(m.label,bx+bw-16,by+bh*.34,Math.round(34*ui),sel?'#ffd27a':'#cfd8ea','right',true);
    const ls=wrap(m.blurb,Math.round(12*ui),bw-32);ls.forEach((l,k)=>txt(l,bx+16,by+bh*.62+k*Math.round(15*ui),Math.round(12*ui),'#b8c4dc','left',false,'normal'));}
   if(i===1)txt('RECOMMENDED',bx+(wide?bw/2:bw-16),by+(wide?bh-10:bh-12),Math.round(10*ui),'#7dff9a',wide?'center':'right',false);}
  txt(net&&!host?`${s.players[them].name} picks the night…`:'Tap a night to begin',W/2,H-Math.round(38*ui),Math.round(15*ui),'#fff','center',true);
  txt('Touch your half of the screen and drag to walk · P1: WASD · P2: arrow keys',W/2,H-Math.round(18*ui),Math.round(11*ui),'#9fb0d0','center',false,'normal');
 }
 function drawModal(t){
  x.setTransform(1,0,0,1,0,0);x.fillStyle='rgba(5,7,16,.74)';x.fillRect(0,0,W,H);
  const m=modal,p=P[m.pi],n=m.cards.length,chest=m.type==='chest';
  const pulse=.5+.5*Math.sin(uiT*5),hs=Math.round(44*ui),top=Math.round(10*ui);
  setFont(Math.round(26*ui));const tw0=x.measureText(m.title).width;
  s.sprite(x,m.pi,Math.max(hs/2+6,W/2-tw0/2-hs*.7),top+hs/2,hs,{exact:true,mood:'win'});
  txt(m.title,W/2,top+Math.round(14*ui),Math.round(26*ui),m.title==='EVOLUTION!'?'#ffd23a':PCOL[m.pi],'center',true);
  txt(m.sub,W/2,top+Math.round(38*ui),Math.round(13*ui),'#e8ecf5','center',true);
  const wide=W>=H*1.15&&W>=640,areaTop=top+hs+Math.round(12*ui),areaH=H-areaTop-Math.round(30*ui),gap=10;cardRects.length=0;
  let cw,ch;if(wide){cw=Math.min(260*ui,(W-30-gap*(n-1))/n);ch=Math.min(areaH,290*ui);}else{cw=Math.min(W-24,520);ch=Math.min((areaH-gap*(n-1))/n,128*ui);}
  const tot=wide?cw*n+gap*(n-1):ch*n+gap*(n-1),ox=wide?W/2-tot/2:W/2-cw/2,oy=wide?areaTop+(areaH-ch)/2:areaTop+(areaH-tot)/2;
  for(let i=0;i<n;i++){
   const c2=m.cards[i],cx2=wide?ox+i*(cw+gap):ox,cy2=wide?oy:oy+i*(ch+gap),sel=i===m.sel&&!chest;cardRects.push({x:cx2,y:cy2,w:cw,h:ch});
   const g=x.createLinearGradient(0,cy2,0,cy2+ch);g.addColorStop(0,c2.evo?'#4a3a14':'#27324a');g.addColorStop(1,c2.evo?'#2a2008':'#161c2c');
   panel(cx2,cy2,cw,ch,14,g,c2.col,sel?5:2.5);if(sel){x.globalAlpha=.25+.2*pulse;panel(cx2,cy2,cw,ch,14,'#fff');x.globalAlpha=1;}
   if(wide){const is=Math.min(cw*.4,90*ui);x.drawImage(c2.icon,cx2+cw/2-is/2,cy2+14*ui,is,is);txt(c2.title,cx2+cw/2,cy2+is+34*ui,Math.round(17*ui),'#fff','center',true);txt(c2.sub,cx2+cw/2,cy2+is+56*ui,Math.round(12*ui),c2.col,'center',false);
    wrap(c2.text,Math.round(13*ui),cw-24).forEach((l,k)=>txt(l,cx2+cw/2,cy2+is+80*ui+k*Math.round(17*ui),Math.round(13*ui),'#d4dcee','center',false,'normal'));}
   else{const is=Math.min(ch-16,76*ui);x.drawImage(c2.icon,cx2+10,cy2+(ch-is)/2,is,is);const tx=cx2+is+22,tw=cw-is-32;txt(c2.title,tx,cy2+ch*.2,Math.round(17*ui),'#fff','left',true);txt(c2.sub,cx2+cw-12,cy2+ch*.2,Math.round(11*ui),c2.col,'right',false);
    wrap(c2.text,Math.round(12*ui),tw).slice(0,3).forEach((l,k)=>txt(l,tx,cy2+ch*.46+k*Math.round(15*ui),Math.round(12*ui),'#d4dcee','left',false,'normal'));}
   if(!chest&&!m.start)txt(String(i+1),cx2+10,cy2+10,Math.round(10*ui),'#7f8db0','left',false);
  }
  if(m.age<.45){x.fillStyle='rgba(5,7,16,.5)';x.fillRect(0,areaTop,W,H-areaTop);}
  txt(chest?'Tap to continue':'Tap a card',W/2,H-Math.round(14*ui),Math.round(13*ui),'#9fb0d0','center',true);
 }
 function uiTap(p){
  if(state==='menu'&&net&&!host)return;   // online player 1 picks the night
  if(state==='menu'){for(let i=0;i<menuRects.length;i++){const r=menuRects[i];if(p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h){menuSel=i;startRun(i);return;}}return;}
  if(!modal||modal.age<.45)return;
  if(modal.type==='chest'){if(modal.age>1)chooseCard(0);return;}
  for(let i=0;i<cardRects.length;i++){const r=cardRects[i];if(p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h){chooseCard(i);return;}}
 }
 // ---------- input ----------
 const seen=new Set();
 ownedPointers(s,(i,p,id)=>{
  const first=!seen.has(id),st=stick[i];
  if(first){seen.add(id);if(state==='menu'||modal)uiTap(p);st.on=true;st.id=id;st.ax=st.fx=p.x;st.ay=st.fy=p.y;}
  else{st.fx=p.x;st.fy=p.y;}
 },(i,id)=>{seen.delete(id);const st=stick[i];if(st.id===id){st.on=false;st.id=-1;}},alone?()=>0:net?()=>me:undefined);
 const navKeys={ArrowUp:-1,ArrowDown:1,ArrowLeft:-1,ArrowRight:1,w:-1,s:1,a:-1,d:1};
 for(const type of['keydown','keyup'])s.on(document,type,ev=>{
  if(!s.alive||s.paused)return;const k=ev.key.length===1?ev.key.toLowerCase():ev.key,down=type==='keydown';
  const handled=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' ','Enter','1','2','3','4'].includes(k);if(!handled)return;ev.preventDefault();
  if(down&&(state==='menu'||modal)){
   if(state==='menu'){if(k in navKeys)menuSel=clamp(menuSel+navKeys[k],0,MODES.length-1);else if(k===' '||k==='Enter')startRun(menuSel);else if(k>='1'&&k<='3')startRun(Number(k)-1);}
   else if(modal.age>.45){if(modal.type==='chest')chooseCard(0);else if(k in navKeys)modal.sel=clamp(modal.sel+navKeys[k],0,modal.cards.length-1);else if(k===' '||k==='Enter')chooseCard(modal.sel);else{const n=Number(k)-1;if(n>=0&&n<modal.cards.length)chooseCard(n);}}
   return;}
  keys[k]=down;
 });
 const clearInput=()=>{for(const k in keys)keys[k]=false;for(const st of stick)st.on=false;seen.clear();};
 s.on(window,'blur',clearInput);s.resetOnPause?.(clearInput);

 // ---------- online co-op (see the top) ----------
 let nf=null,recFx=false,netPick=false,flushT=0;
 const outbox={h:new Map(),fx:[],ex:[],pb:[],g:[],k:[],bomb:[],gm:[],km:[],kd:[],bn:[],ts:[]},prOut=[],zOut=[],esOut=[];
 const EIDS=Object.keys(ENEMIES),r1=v=>Math.round(v*10)/10,netE=new Map();
 const packP=p=>[r1(p.x),r1(p.y),p.face,p.moving?1:0,+p.walk.toFixed(1),Math.round(p.hp),p.maxHp,p.down?1:0,+p.revT.toFixed(2),p.inv>0?1:0,p.lvl,Math.round(p.xp),p.need,p.wind?1:0,p.revLeft,p.coins,
  p.weapons.map(w=>[w.id,w.lvl,w.evo?1:0,+w.ang.toFixed(2),w.on?1:0,+w.pulse.toFixed(2)]),p.passives,p.hurt>0?1:0];
 function unpackP(a){const q=P[them];if(!Array.isArray(a)||a.length<19)return;const first=q.nx==null;q.nx=a[0];q.ny=a[1];q.face=a[2];q.moving=!!a[3];q.walk=a[4];q.hp=a[5];q.maxHp=a[6];
  const wasDown=q.down;q.down=!!a[7];q.revT=a[8];q.inv=a[9]?.2:0;q.lvl=a[10];q.xp=a[11];q.need=a[12];q.wind=!!a[13];q.revLeft=a[14];q.coins=a[15];
  q.weapons=(a[16]||[]).filter(w=>WEAPONS[w[0]]).map(([id,lvl,evo,ang,on,pulse])=>{const old=q.weapons.find(w=>w.id===id);const w=old&&old.lvl===lvl&&old.evo===!!evo?old:{id,kind:WEAPONS[id].kind,lvl,evo:!!evo,st:weaponStats(id,lvl,!!evo),cd:0,t:0,on:true,ang,pulse:0};w.on=!!on;w.pulse=pulse;if(Math.abs(w.ang-ang)>.8)w.ang=ang;return w;});
  const ps=a[17]||{};if(JSON.stringify(ps)!==JSON.stringify(q.passives)){q.passives={...ps};q.st=calcStats(q.passives);}q.hurt=a[18]?.2:0;
  if(first){q.x=q.nx;q.y=q.ny;}
  if(host&&q.down&&!wasDown&&P.every(p=>p.down))beginEnd('lose');}
 // the partner: eased toward its snapshots; its orbiters keep turning here
 function stepPuppet(q,dt){if(q.nx==null)return;const k=1-Math.exp(-dt*12);if(Math.abs(q.nx-q.x)>300||Math.abs(q.ny-q.y)>300){q.x=q.nx;q.y=q.ny;}else{q.x+=(q.nx-q.x)*k;q.y+=(q.ny-q.y)*k;}if(q.moving)q.walk+=dt*10;
  for(const w of q.weapons)if(w.kind==='orbit'&&w.on)w.ang+=w.st.spd*dt*(.6+.4*q.st.pspeed);}
 // host: the enemies near the other survivor
 function packEnemies(){const q=P[them],R2=760*760,out=[];for(const e of E){if(e.dead)continue;const dx=e.x-q.x,dy=e.y-q.y;if(dx*dx+dy*dy>R2)continue;
  out.push([e.uid,EIDS.indexOf(e.type),Math.round(e.x),Math.round(e.y),e.face,Math.ceil(e.hp),Math.round(e.dmg),e.elite||e.boss?Math.ceil(e.mhp):0,(e.fuse>0?1:0)|(e.ai===AI.charger&&e.st===1?2:0)]);}return out;}
 function unpackEnemies(list){const now=performance.now(),seen=new Set();
  for(const a of list||[]){const [uid,ti,x0,y0,face,hp,dmg,mhp,fl]=a;seen.add(uid);let e=netE.get(uid);
   if(!e){const type=EIDS[ti],d=ENEMIES[type];if(!d)continue;e=newEnemy();Object.assign(e,{def:d,type,x:x0,y:y0,r:d.r,sz:d.sz,sc:1,ai:AI[d.ai],fly:d.fly||0,phase:d.phase||0,immune:d.immune||0,armor:d.armor||0,elite:d.elite||0,boss:d.boss||0,aura:d.aura?1:0,kbr:0,dead:0,uid,ph:rnd()*4,hp,mhp:mhp||hp});netE.set(uid,e);E.push(e);}
   else if(e.dead){if(now-(e.deadAt||0)<700)continue;e.dead=0;E.push(e);}
   e.tx=x0;e.ty=y0;e.face=face;e.hp=Math.min(e.hp,hp);if(hp>e.hp+5)e.hp=hp;e.dmg=dmg;if(mhp)e.mhp=mhp;e.fuse=fl&1?.3:0;e.st=fl&2?1:0;}
  for(const [uid,e] of netE)if(!seen.has(uid)){e.dead=1;netE.delete(uid);}}
 // the other phone's enemies: eased toward player 1's positions; what touches this survivor is judged here
 function stepNetEnemies(dt){const k=1-Math.exp(-dt*10),p=P[me];
  for(const e of E){if(e.dead)continue;if(e.fl>0)e.fl-=dt;if(e.hc>0)e.hc-=dt;if(e.tx!=null){e.x+=(e.tx-e.x)*k;e.y+=(e.ty-e.y)*k;}
   if(e.hp<=0&&!e.dead){e.dead=1;e.deadAt=performance.now();continue;}
   if(e.hc<=0&&e.fuse<=0&&!(e.ai===AI.charger&&e.st===1)&&!p.down){const ex=p.x-e.x,ey=p.y-e.y,rr=e.r+PRAD-2;if(ex*ex+ey*ey<rr*rr){const hit=e.ai===AI.hunger?hurtPlayer(p,0,.34):hurtPlayer(p,e.dmg);if(hit){e.hc=.8;if(e.ai===AI.hunger||e.boss){const l=Math.hypot(ex,ey)||1;p.vx+=ex/l*300;p.vy+=ey/l*300;}}}}}}
 // end of the other phone's step (like sweepDead): dead copies leave the list but stay known by id for a moment
 function netSweep(){for(let i=E.length-1;i>=0;i--)if(E[i].dead){if(!E[i].deadAt)E[i].deadAt=performance.now();E[i]=E[E.length-1];E.pop();}}
 function hostBomb(px,py){const R2=520*520;for(let i=0;i<E.length;i++){const e=E[i];if(e.dead||e.immune||(e.x-px)**2+(e.y-py)**2>R2)continue;e.lh=them;if(e.boss||e.elite)hitEnemy(e,e.mhp*.1,them,0,0,false,true);else{e.hp=0;killEnemy(e);}}}
 function remoteBlast([px,py,r,dP,col]){fx(0,px,py,r,.45,col);fx(2,px,py,r*.6,.18,'#fff');burst(px,py,14,col,r*2.2,.5,3);addShake(r>100?8:3);sfx('boom',90,()=>{tone(70,.28,.07,'sawtooth');tone(46,.35,.06,'square');});
  const p=P[me];if(dP>0&&!p.down&&(p.x-px)**2+(p.y-py)**2<(r+PRAD)**2)hurtPlayer(p,dP);}
 function remoteProp([px,py]){const ch=getChunk(Math.floor(px/CS),Math.floor(py/CS));for(const p of ch.dest)if(!p.dead&&Math.abs(p.x-px)<2&&Math.abs(p.y-py)<2){breakProp(p,them,true);break;}}
 const rd=v=>Math.round(v*100)/100;
 function netFlush(){const o=outbox,e={};
  if(o.h.size){e.h=[...o.h.values()].map(h=>[h[0],rd(h[1]),Math.round(h[2]),Math.round(h[3])]);o.h.clear();}
  if(prOut.length){e.pr=prOut.splice(0).filter(q=>!q.dead||q.k>=5).map(q=>[q.k,Math.round(q.x),Math.round(q.y),Math.round(q.vx),Math.round(q.vy),rd(q.life),rd(q.r),rd(q.a),rd(q.b),Math.round(q.tx),Math.round(q.ty),Math.round(q.sx),Math.round(q.sy)]);}
  if(zOut.length){e.z=zOut.splice(0).map(z=>[z.k,Math.round(z.x),Math.round(z.y),Math.round(z.r),rd(z.dur),rd(z.dmg),rd(z.tick),z.st||0,rd(z.a),z.o]);}
  if(esOut.length){e.es=esOut.splice(0).map(q=>[Math.round(q.x),Math.round(q.y),Math.round(q.vx),Math.round(q.vy),q.r,rd(q.dmg),q.k]);}
  for(const k of ['fx','ex','pb','g','k','bomb','gm','km','kd','bn','ts'])if(o[k].length)e[k]=o[k].splice(0);
  if(Object.keys(e).length)nf.event(e);}
 function onNetEvent(e){
  if(e.night!=null&&!host){menuSel=e.night;nf.start('go').then(()=>startRun(e.night,true));return;}
  if(e.end&&!host){bossBonus=!!e.bb;beginEnd(e.end);return;}
  if(e.h&&host)for(const [uid,dmg,kx,ky] of e.h){const en=E.find(q=>q.uid===uid&&!q.dead);if(en)hitEnemy(en,dmg,them,kx,ky,false,true);}
  if(e.pr)for(const a of e.pr){const q=take(PRpool,newProj);const [k,x0,y0,vx,vy,life,r,a2,b,tx,ty,sx,sy]=a;Object.assign(q,{k,o:them,x:x0,y:y0,vx,vy,life,r,a:a2,b,tx,ty,sx,sy,t:0,ang:0,dead:0,vis:1,pierce:0,dmg:0,kb:0,hh:0,st:null});q.hits.length=0;PR.push(q);}
  if(e.z)for(const [k,x0,y0,r,dur,dmg,tick,st,a2,o] of e.z){if(Z.length>=90)break;const z=take(Zpool,newZ);Object.assign(z,{k,x:x0,y:y0,r,t:0,dur,dmg,tick,st:st||null,a:a2,o:o===me?me:them});Z.push(z);}
  if(e.es)for(const [x0,y0,vx,vy,r,dmg,k] of e.es){if(ES.length>=160)break;const q=take(ESpool,newES);Object.assign(q,{x:x0,y:y0,vx,vy,r,dmg,k,life:3.2});ES.push(q);}
  if(e.fx)for(const a of e.fx)fx(...a);
  if(e.ex)for(const a of e.ex)remoteBlast(a);
  if(e.pb)for(const a of e.pb)remoteProp(a);
  if(e.g)for(const id of e.g){const j=G.findIndex(g=>g.id===id);if(j>=0)release(G,Gpool,j);}
  if(e.k)for(const id of e.k){const j=K.findIndex(q=>q.id===id);if(j>=0)release(K,Kpool,j);}
  if(e.bomb&&host)for(const [px,py] of e.bomb)hostBomb(px,py);
  if(e.gm&&!host)for(const [id,x0,y0,v] of e.gm){if(G.length>=320)break;const g=take(Gpool,newG);Object.assign(g,{x:x0,y:y0,v,tier:tierOf(v),pull:false,sp:0,age:0,id});G.push(g);}
  if(e.km&&!host)for(const [id,k,x0,y0,v] of e.km){if(K.length>=90)break;const q=take(Kpool,newK);Object.assign(q,{x:x0,y:y0,k,v,age:0,life:k==='chest'?600:k==='coin'?24:40,pull:false,sp:0,id});K.push(q);}
  if(e.kd&&!host)for(const uid of e.kd){const en=netE.get(uid);if(en){if(!en.dead)burst(en.x,en.y,en.boss?30:5,'#7a8e6a',110,.55,2.4);en.dead=1;en.deadAt=0;netE.delete(uid);}}
  if(e.bn&&!host)for(const a of e.bn)showBanner(...a);
  if(e.ts&&!host)for(const a of e.ts)toast(...a);}
 if(net){nf=netField(s,{hz:8,
  pack:()=>state==='menu'?{}:host?{c:+clock.toFixed(2),p:packP(P[me]),e:packEnemies(),kk:[kills[0],kills[1],bossKills[0],bossKills[1]],hu:hungerOn?1:0,fb:finalBoss&&!finalBoss.dead?finalBoss.uid:0}:{p:packP(P[me])},
  unpack:(i,d)=>{if(!d)return;if(d.p)unpackP(d.p);if(!host&&d.e){unpackEnemies(d.e);if(Number.isFinite(d.c)&&Math.abs(d.c-clock)>.25)clock=d.c;curM=clock/D*mode.mt;
   if(d.kk){kills[0]=d.kk[0];kills[1]=d.kk[1];bossKills[0]=d.kk[2];bossKills[1]=d.kk[3];totalKills=d.kk[0]+d.kk[1];scoreDirty=1;}hungerOn=!!d.hu;finalBoss=d.fb?netE.get(d.fb)||null:null;}},
  onEvent:onNetEvent});}
 // ---------- bot / test hooks ----------
 function botModal(){if(!modal)return;if(modal.type==='chest'){chooseCard(0);return;}let best=0,bs=-1;modal.cards.forEach((c2,i)=>{const sc=(c2.k==='w'?3:c2.k==='p'?2:1)+rnd();if(sc>bs){bs=sc;best=i;}});chooseCard(best);}
 const perf={u:0,d:0,n:0},skip={};
 function sim(sec,dt){dt=dt||1/30;for(let t=0;t<sec;t+=dt){if(state==='menu'){startRun(1);}if(modal){botModal();continue;}if(state==='ending'&&endT>3.5)break;const t0=performance.now();step(dt);perf.u+=performance.now()-t0;perf.n++;}}
 s.debug={engine:'horde',skip,dragOnly:true,players:P,enemies:E,
  get state(){return state;},get clock(){return clock;},get modal(){return modal;},get kills(){return totalKills;},get counts(){return{E:E.length,PR:PR.length,G:G.length,K:K.length,PT:PT.length,Z:Z.length,ES:ES.length};},
  get perf(){return perf;},get won(){return won;},get endKind(){return endKind;},
  start:i=>startRun(i),sim,botOn:v=>{bot.on=v;},choose:i=>chooseCard(i),
  fill(n,type){for(let i=0;i<n;i++){edgePos(-80+rnd()*60);spawnEnemy(type||'shambler',SP.x,SP.y);}},
  setClock(v){clock=v;curM=clock/D*mode.mt;evI=0;while(evI<sched.length&&sched[evI].t<v)evI++;},
  giveW:(i,id,l)=>{const w=giveWeapon(P[i],id);while(w&&w.lvl<(l||1))giveWeapon(P[i],id);},giveP:(i,id,l)=>{for(let k=0;k<(l||1);k++)givePassive(P[i],id);},
  evolve:i=>{for(const w of P[i].weapons){w.lvl=MAX_LEVEL;w.evo=true;w.st=weaponStats(w.id,w.lvl,true);}},
  event:(type,k)=>fireEvent({type,k:k||0}),chest:i=>{const got=openChest(P[i],true);modalQ.push({type:'chest',pi:i,got});nextModal();},
  level:i=>gainXp(P[i],P[i].need),
  gem:(n)=>{for(let i=0;i<n;i++)dropGem(cam.x+(rnd()-.5)*300,cam.y+(rnd()-.5)*300,1);},
  frame:{render:()=>render(performance.now()/1000)}};

 // ---------- loop ----------
 layout();updateCamera(0,true);ensureWorld();
 // online test bot: the bot walks this phone's survivor (and picks the night on player 1's phone)
 if(net)s.debug.bot=()=>{if(state==='menu'){if(host&&!netPick){startRun(0);return 'pick';}return '';}if(!bot.on){bot.on=true;return 'drive';}return '';};
 s.frame((dt,t)=>{
  const t0=performance.now();layout();uiT+=dt;
  if(net){if(state!=='menu')nf.tick(dt);flushT-=dt;if(flushT<=0){flushT=.1;netFlush();}}
  if(state==='menu'){render(t);drawMenu(t);return;}
  if(modal&&bot.on&&modal.age>.3)botModal();
  // online the night goes on while a card is picked (12 s, then the bot picks)
  if(modal&&net){modal.age+=dt;if(modal.age>12)botModal();}
  else if(modal){modal.age+=dt;render(t);drawHUD(t);drawModal(t);return;}
  if(state==='ending'){const sl=endKind==='lose'?.35:1;step(dt*sl);if(endT>3.4){render(t);drawHUD(t);finishRun();return;}}
  else step(dt);
  const t1=performance.now();render(t);drawHUD(t);if(net&&modal)drawModal(t);
  perf.u+=t1-t0;perf.d+=performance.now()-t1;perf.n++;
 });
}

Object.assign(exports,{horde});
