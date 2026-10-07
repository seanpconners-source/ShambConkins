// Super Mario Bros. · World 1-1 style. Split-screen two-player NES platformer built like the Sonic engine:
// both players run the same seeded overworld at once (P1 top, P2 bottom), each with their own coins, blocks,
// enemies and power-ups. Movement uses the NES SMB1 speeds (px/frame at 60 fps, fixed timestep): walk and run
// acceleration, skids, speed-dependent jump gravity (hold to jump higher), stomps, ? blocks, bricks, Super Mushroom,
// Fire Flower, Starman, Koopa shells, piranha plants, a warp pipe down to an underground coin room, the flagpole and
// the castle. The camera never scrolls back, like the original. The runner is Mario's body (P2 in Luigi colours)
// wearing the player's head under the cap. Modes: 'coins' (most coins after 60 s; the castle sends you round the
// course again with fresh coins) and 'race' (first to the flagpole).
const {clamp}=require("src/utils.js");
const {Fx,arenaKeys,arenaTouch,snd,noise,jingle,outlined,PCOL,Countdown,settle}=require("src/engines/arenaKit.js");

const STEP=1/60,T=16,ROWS=15,S=400,RS=17; // tile size, rows, main-map stride, coin-room width
const PH={walkAcc:.037109375,runAcc:.0556640625,rel:.05078125,skid:.1015625,minWalk:.07421875,walk:1.5625,run:2.5625,maxFall:4.5};
const COIN_TIME=60,RACE_CAP=150;
const GROUND=1,BRICK=2,QBLOCK=3,USED=4,HARD=5,PTL=6,PTR=7,PL=8,PR=9,HMT=12,HMB=13,HBT=14,HBB=15;
const C={sky:'#5c94fc',brick:'#c84c0c',light:'#fcbcb0',q:'#fc9838',brown:'#883000',green:'#00a800',lime:'#b8f818',bush:'#80d010',white:'#fcfcfc',cloud:'#3cbcfc',skin:'#fca044',red:'#d82800',ug:'#0070ec',ugLight:'#9cfcf0'};
const PALS=[{cap:C.red,shirt:C.brown,over:C.red,shoe:C.brown},{cap:C.green,shirt:C.white,over:C.green,shoe:C.brown}];
const FIRE_PAL={cap:C.white,shirt:C.red,over:C.white,shoe:C.red};
const STAR_PALS=[FIRE_PAL,{cap:'#000',shirt:C.brick,over:'#000',shoe:C.brick},{cap:C.green,shirt:C.white,over:C.green,shoe:C.brown},{cap:C.red,shirt:C.brown,over:C.red,shoe:C.brown}];
const COMBO=[100,200,400,500,800,1000,2000,4000,5000,8000];

// ------------------------------------------------------------------ level generation (seeded, shared by both players)
function buildLevel(rand,mode){
 const tiles=new Uint8Array(S*ROWS),content=new Map();
 const L={tiles,content,coins:[],enemies:[],pipes:[],checks:[],decor:[],W:0,start:40,warp:null};
 const R=(a,b)=>a+rand()*(b-a),RI=(a,b)=>Math.floor(R(a,b+1)),pickR=a=>a[Math.floor(rand()*a.length)];
 const set=(cc,r,t,what)=>{tiles[r*S+cc]=t;if(what)content.set(r*S+cc,what);};
 let c=0;
 const ground=n=>{for(let k=0;k<n;k++){set(c,13,GROUND);set(c,14,GROUND);c++;}};
 const coin=(cc,r)=>L.coins.push({x:cc*T+8,y:r*T+8});
 const foe=(type,cc,r=13)=>L.enemies.push({type,x:cc*T+8,y:r*T});
 const pipe=(cc,h,o={})=>{const top=13-h;set(cc,top,PTL);set(cc+1,top,PTR);for(let r=top+1;r<13;r++){set(cc,r,PL);set(cc+1,r,PR);}const p={c:cc,h,top,...o};L.pipes.push(p);if(o.piranha)foe('piranha',cc+.5,top);return p;};
 const stairs=(cc,h,dir)=>{for(let k=0;k<h;k++){const hh=dir>0?k+1:h-k;for(let r=13-hh;r<13;r++)set(cc+k,r,HARD);}};
 const blocks=(cc,r,pat,special={})=>[...pat].forEach((ch,k)=>{if(ch==='?')set(cc+k,r,QBLOCK,special[k]||'coin');else if(ch==='B')set(cc+k,r,BRICK,special[k]);});
 const coinsMode=mode==='coins';
 const chunks={
  blocks(){const x0=c;ground(RI(14,17));const pat=pickR(['B?B?B','?B?','B??B','BB?BB','???','B?B']),bx=x0+RI(3,5),sp={};
   const qs=[...pat].map((ch,k)=>ch==='?'?k:-1).filter(k=>k>=0),bs=[...pat].map((ch,k)=>ch==='B'?k:-1).filter(k=>k>=0);
   if(rand()<.5)sp[pickR(qs)]='power';if(bs.length&&rand()<.3)sp[pickR(bs)]=rand()<.3?'star':'multi';blocks(bx,9,pat,sp);
   if(rand()<.5)blocks(bx+Math.floor(pat.length/2),5,'?');
   if(coinsMode)for(let k=0;k<pat.length;k++)coin(bx+k,7);
   foe('goomba',bx+pat.length+RI(1,3));if(rand()<.4)foe('goomba',bx+pat.length+RI(4,5));},
  pipes(warp=false){const x0=c,len=RI(26,30);ground(len);let px=x0+3;const n=3;
   for(let k=0;k<n&&px<x0+len-3;k++){const h=warp&&k===n-1?4:RI(2,4),isWarp=warp&&k===n-1,pp=pipe(px,h,{piranha:!isWarp&&rand()<.35,warp:isWarp});if(isWarp)L.warpEntry=pp;
    const next=px+RI(7,9);if(rand()<.7&&next-px>4)foe('goomba',px+RI(3,next-px-2));if(coinsMode&&rand()<.5)for(let j=0;j<2;j++)coin(px+j,pp.top-2);px=next;}},
  pit(){ground(RI(4,6));const g0=c,gap=RI(2,3);c+=gap;for(let k=-1;k<=gap;k++)coin(g0+k,k<0||k===gap?9:8);ground(RI(5,7));if(rand()<.5)foe('goomba',c-2);},
  highway(){ground(3);const g0=c;c+=2;if(coinsMode){coin(g0,9);coin(g0+1,9);}const x0=c;ground(RI(17,19));blocks(x0+2,9,'B?B',{1:'power'});for(let k=0;k<8;k++)set(x0+5+k,5,BRICK);
   blocks(x0+13,5,'?');foe('goomba',x0+8,5);foe('goomba',x0+10,5);foe('goomba',x0+14);if(coinsMode)for(let k=0;k<6;k++)coin(x0+6+k,4);},
  koopas(){const x0=c;ground(RI(18,20));blocks(x0+3,9,'BB',{1:rand()<.4?'star':'multi'});for(const k of [8,11,14])blocks(x0+k,9,'?');blocks(x0+11,5,'?',{0:rand()<.4?'power':'coin'});
   foe('koopa',x0+7);foe('goomba',x0+15);foe('goomba',x0+16);if(coinsMode)for(const k of [10,11,12])coin(x0+k,3);},
  pyramid(){const x0=c;ground(14);stairs(x0+1,4,1);stairs(x0+7,4,-1);coin(x0+5,7);coin(x0+6,7);if(coinsMode){coin(x0+4,7);coin(x0+7,7);}foe('goomba',x0+12);},
  stairPit(){const x0=c;ground(6);stairs(x0+1,4,1);for(let r=9;r<13;r++)set(x0+5,r,HARD);c+=2;const y0=c;ground(7);stairs(y0,4,-1);coin(x0+6,6);coin(x0+7,6);},
  coinRow(){const x0=c;ground(15);const n=RI(5,7);blocks(x0+4,9,'B'.repeat(n),{[RI(0,n-1)]:'multi'});for(let k=0;k<n;k++)coin(x0+4+k,8);if(coinsMode)for(let k=1;k<n-1;k++)coin(x0+4+k,5);foe('koopa',x0+n+7);}
 };
 const exitPipe=()=>{const x0=c;ground(9);L.warpExit=pipe(x0+4,2);if(coinsMode)coin(x0+7,11);};
 // opening, after World 1-1: a ? block, then brick ? brick ? brick with a ? above, then the pipe run (one is the warp pipe)
 ground(24);blocks(16,9,'?');blocks(20,9,'B?B?B',{1:'power'});blocks(22,5,'?');foe('goomba',22);if(coinsMode){coin(10,10);coin(11,10);coin(12,10);}
 L.checks.push(L.start);
 chunks.pipes(true);
 const want=coinsMode?5:8,bag=[],base=['blocks','pit','highway','koopas','pyramid','stairPit','coinRow','blocks','pit'];
 while(bag.length<want){const pool=base.slice().sort(()=>rand()-.5);for(const k of pool){if(bag.length>=want)break;if(bag.at(-1)!==k)bag.push(k);}}
 bag.forEach((k,idx)=>{if(idx%2===0)L.checks.push(c*T+8);chunks[k]();if(idx===(coinsMode?1:2))exitPipe();});
 // the goal: the big staircase, the flagpole on its block and the castle
 ground(3);const sx=c;ground(9);for(let k=0;k<8;k++)for(let r=12-k;r<13;r++)set(sx+k,r,HARD);for(let r=5;r<13;r++)set(sx+8,r,HARD);
 ground(16);L.flagCol=sx+13;set(L.flagCol,12,HARD);L.flagX=L.flagCol*T+8;L.castleX=(L.flagCol+4)*T;L.doorX=L.castleX+2.5*T;ground(14);L.W=c;
 L.end=L.flagX;
 if(L.warpEntry&&L.warpExit)L.warp={entry:L.warpEntry,exit:L.warpExit};
 // the underground coin room: brick wall, brick slab with coin rows, exit through the sideways pipe on the right
 const rt=new Uint8Array(RS*ROWS),rs=(cc,r,t)=>{rt[r*RS+cc]=t;};
 for(let cc=0;cc<RS;cc++){rs(cc,13,GROUND);rs(cc,14,GROUND);}
 for(let r=2;r<13;r++)rs(0,r,BRICK);
 for(let cc=4;cc<11;cc++){rs(cc,2,BRICK);for(let r=10;r<13;r++)rs(cc,r,BRICK);}
 rs(13,11,HMT);rs(13,12,HMB);rs(14,11,HBT);rs(14,12,HBB);for(let r=0;r<13;r++){rs(15,r,PL);rs(16,r,PR);}
 const rc=[];for(let cc=4;cc<11;cc++){rc.push({x:cc*T+8,y:8*T+8},{x:cc*T+8,y:9*T+8});}for(let cc=5;cc<10;cc++)rc.push({x:cc*T+8,y:5*T+8});
 L.room={tiles:rt,coins:rc.sort((a,b)=>a.x-b.x)};
 // scenery (non-solid): World 1-1's repeating hills, bushes and clouds
 const hasGround=(cc,w)=>{for(let k=0;k<w;k++)if(tiles[13*S+cc+k]!==GROUND)return false;return true;};
 const clear=(cc,w)=>{for(let k=0;k<w;k++)if(tiles[12*S+cc+k])return false;return true;};
 for(let cc=0;cc<L.W;cc++){const m=cc%48;
  if(m===0&&hasGround(cc,5))L.decor.push({type:'hill',x:cc*T,w:5});if(m===16&&hasGround(cc,3))L.decor.push({type:'hill',x:cc*T,w:3});
  if((m===11||m===23||m===41)&&hasGround(cc,m===11?5:m===23?3:4)&&clear(cc,m===11?5:m===23?3:4))L.decor.push({type:'bush',x:cc*T,n:m===11?3:m===23?1:2});
  if(m===8||m===19||m===27||m===36)L.decor.push({type:'cloud',x:cc*T,y:(m===19||m===36?2:3)*T,n:m===27?3:m===36?2:1});}
 L.coins.sort((a,b)=>a.x-b.x);
 return L;
}

// ------------------------------------------------------------------ per-player world state
function spawnFoe(e){return {...e,vx:e.type==='piranha'?0:-.5,vy:0,alive:true,active:false,state:e.type==='piranha'?'hidden':'walk',t:0,off:0,grace:0,home:e.y,frame:0};}
function makeWorld(L){
 return {tiles:L.tiles.slice(),room:L.room.tiles.slice(),content:new Map(L.content),got:new Uint8Array(L.coins.length),roomGot:new Uint8Array(L.room.coins.length),
  enemies:L.enemies.map(spawnFoe),items:[],fire:[],debris:[],bumps:new Map(),pops:[],multi:new Map(),fx:new Fx(),flagPos:0,castleFlag:0};
}
function makePlayer(i,L){return {i,x:L.start,y:13*T,prevY:13*T,vx:0,vy:0,grounded:true,facing:1,big:false,fire:false,star:0,inv:0,coins:0,score:0,dead:0,pit:false,area:'main',pipe:null,flag:null,tf:null,
 crouch:false,jumping:false,gHold:.125,gFall:.4375,airCap:PH.walk,anim:0,skid:0,combo:0,best:L.start,finished:false,finishT:0,lap:0,deaths:0,inCastle:false,castleT:0,auto:false,idle:0};}

// ------------------------------------------------------------------ the game
async function marioBros(s){
 const mode=s.game.marioMode==='race'?'race':'coins';
 const [c,g]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const L=buildLevel(s.random,mode),worlds=[makeWorld(L),makeWorld(L)],pl=[makePlayer(0,L),makePlayer(1,L)];
 const cams=pl.map(()=>({x:0,y:0,w:260,h:240}));
 const touchUI=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
 const inputs=[0,1].map(()=>({l:0,r:0,d:0,jump:0,b:0,press:0,bPress:0}));
 const pads=[{stick:null,jump:null},{stick:null,jump:null}];
 let phase='title',titleT=0,cd=new Countdown(3),clock=0,acc=0,endT=0,winner=-1,simT=0,frames=0;
 const kb=arenaKeys(s);
 kb.onDown((i,k)=>{if(k==='u')inputs[i].press=1;if(k==='fire')inputs[i].bPress=1;});
 s.hint(mode==='coins'?'COIN RUSH: grab the most coins in 60 seconds. Hit ? blocks, stomp Goombas, find the warp pipe down to the coin room (stand on it and hold down). Reach the castle to run the course again with fresh coins. Touch: your half of the screen (P1 top, P2 bottom). Drag on the left side to walk, drag further to run, drag down to duck or enter a pipe, tap there for a fireball; tap the right side to jump (hold for higher). Keys: P1 A/D/S + W jump + Space run/fire, P2 arrows + Up jump + Enter run/fire.'
  :'CASTLE DASH: first to the flagpole wins. Run, stomp, take the warp pipe shortcut if you can find it. Falling in a pit sends you back to the last checkpoint. Touch: your half of the screen (P1 top, P2 bottom). Drag on the left side to walk, drag further to run, drag down to duck or enter a pipe, tap there for a fireball; tap the right side to jump (hold for higher). Keys: P1 A/D/S + W jump + Space run/fire, P2 arrows + Up jump + Enter run/fire.');

 // ---------------- touch: P1 owns the top half, P2 the bottom half
 const vp=i=>({x:0,y:i?Math.floor(s.H/2)+2:0,w:s.W,h:Math.floor(s.H/2)-2});
 arenaTouch(s,{owner:p=>p.y<s.H/2?0:1,maxFingers:3,
  onDown:f=>{const pd=pads[f.owner];if(f.x>s.W*.56){f.data.role='jump';pd.jump=f;inputs[f.owner].press=1;}else{f.data.role='stick';pd.stick=f;}},
  onMove:f=>{if(f.data.role!=='stick')return;const dx=f.x-f.sx,dy=f.y-f.sy,lim=60;if(Math.hypot(dx,dy)>lim){const k=lim/Math.hypot(dx,dy);f.sx=f.x-dx*k;f.sy=f.y-dy*k;}
   const v=f.samples.length>1?(f.y-f.samples[0].y)/Math.max(.016,(performance.now()-f.samples[0].t)/1000):0;if(v<-700&&!f.data.flick&&dy<-18){f.data.flick=true;inputs[f.owner].press=1;}if(dy>-6)f.data.flick=false;},
  onUp:f=>{const pd=pads[f.owner];if(pd.jump===f)pd.jump=null;if(pd.stick===f){pd.stick=null;if(f.moved<10&&f.held<220)inputs[f.owner].bPress=1;}}});
 const readInput=i=>{const k=kb.state[i],st=pads[i].stick,inp=inputs[i];let l=k.l,r=k.r,d=k.d,jump=k.u,b=k.fire;
  if(st){const dx=st.x-st.sx,dy=st.y-st.sy;if(dx>10)r=1;if(dx<-10)l=1;if(Math.abs(dx)>34)b=1;if(dy>20&&Math.abs(dx)<dy)d=1;if(st.data.flick)jump=1;}
  if(pads[i].jump)jump=1;inp.l=l;inp.r=r;inp.d=d;inp.jump=jump;inp.b=b;};

 // ---------------- sounds (original synth effects)
 const sfx={
  jump:big=>snd(big?240:320,.16,{type:'square',vol:.03,to:big?620:860}),
  coin:()=>{snd(1175,.05,{type:'square',vol:.025});snd(1760,.18,{type:'square',vol:.022,delay:.05});},
  stomp:()=>snd(520,.09,{type:'square',vol:.035,to:160}),
  bump:()=>snd(140,.08,{type:'triangle',vol:.06,to:90}),
  brk:()=>{noise(.18,{vol:.07,freq:1200});snd(200,.12,{type:'square',vol:.03,to:60});},
  sprout:()=>snd(300,.35,{type:'square',vol:.03,to:900}),
  power:()=>jingle([392,523,659,784,1047,1319],{step:.05,type:'square',vol:.03,dur:.07}),
  shrink:()=>jingle([880,659,523,392,330],{step:.06,type:'square',vol:.03,dur:.07}),
  fire:()=>snd(1400,.06,{type:'square',vol:.025,to:500}),
  kick:()=>{snd(700,.05,{type:'square',vol:.035});noise(.05,{vol:.04,freq:2400});},
  pipe:()=>jingle([300,220,300,220,300,220],{step:.07,type:'square',vol:.025,dur:.05}),
  die:()=>snd(800,.7,{type:'square',vol:.035,to:80}),
  flag:()=>snd(1800,1.1,{type:'square',vol:.025,to:240}),
  clear:()=>jingle([523,659,784,1047,784,1047,1319],{step:.09,type:'square',vol:.035,dur:.12}),
  star:()=>jingle([1047,1319,1568,2093],{step:.04,type:'triangle',vol:.03})
 };

 // ---------------- map helpers
 const tileAt=(w,area,cc,r)=>{if(r<0||r>=ROWS)return 0;if(area==='room'){if(cc<0||cc>=RS)return HARD;return w.room[r*RS+cc];}if(cc<0)return HARD;if(cc>=L.W)return 0;return w.tiles[r*S+cc];};
 const setTile=(w,area,cc,r,t)=>{if(area==='room')w.room[r*RS+cc]=t;else w.tiles[r*S+cc]=t;};
 const solidAt=(w,area,px,py)=>tileAt(w,area,Math.floor(px/T),Math.floor(py/T))!==0;
 const pH=p=>p.big&&!p.crouch?40:26;
 const log=[];const note=(p,what)=>{log.push(`${clock.toFixed(1)} P${p.i+1} ${what} x${Math.round(p.x)} coins${p.coins}`);if(log.length>60)log.shift();};
 const addScore=(p,w,n,px,py)=>{p.score+=n;w.fx.pop(px,py,String(n),{color:'#fff',stroke:'#000',size:7,rise:20,life:.7});};
 const gainCoin=(p,w)=>{p.coins++;p.score+=200;sfx.coin();};

 // generic body vs tiles (enemies, items): returns {wall,landed}
 function moveBody(b,w,hw,h,grav=.25,maxFall=4){
  const out={wall:false,landed:false};b.vy=Math.min(b.vy+grav,maxFall);
  b.x+=b.vx;const r0=Math.floor((b.y-h+2)/T),r1=Math.floor((b.y-1)/T);
  if(b.vx>0){const cc=Math.floor((b.x+hw)/T);for(let r=r0;r<=r1;r++)if(tileAt(w,'main',cc,r)){b.x=cc*T-hw-.01;out.wall=true;break;}}
  else if(b.vx<0){const cc=Math.floor((b.x-hw)/T);for(let r=r0;r<=r1;r++)if(tileAt(w,'main',cc,r)){b.x=(cc+1)*T+hw+.01;out.wall=true;break;}}
  const py=b.y;b.y+=b.vy;
  if(b.vy>=0){const r=Math.floor(b.y/T);if(r>=0&&r<ROWS&&py<=r*T+.5&&(tileAt(w,'main',Math.floor((b.x-hw+1)/T),r)||tileAt(w,'main',Math.floor((b.x+hw-1)/T),r))){b.y=r*T;b.vy=0;out.landed=true;}}
  return out;
 }

 // ---------------- player events
 const hurt=(p,w)=>{if(p.inv>0||p.star>0||p.dead||p.tf||p.flag||p.inCastle)return;
  if(p.big){note(p,'shrink');p.tf={t:0,to:'small',from:p.fire?'fire':'big'};p.big=false;p.fire=false;p.inv=120;sfx.shrink();s.react(p.i,'sad');}else kill(p,w,false);};
 const kill=(p,w,pit)=>{if(p.dead)return;note(p,pit?'pit':'die');p.dead=1;p.pit=pit;p.deaths++;p.vx=0;p.vy=0;p.big=false;p.fire=false;p.star=0;p.tf=null;sfx.die();s.react(p.i,'sad');};
 const respawn=(p,i)=>{let check=L.checks[0];for(const k of L.checks)if(k<=p.best+4)check=Math.max(check,k);const w=worlds[i];
  Object.assign(p,{x:check,y:13*T,prevY:13*T,vx:0,vy:0,grounded:true,dead:0,pit:false,area:'main',pipe:null,flag:null,tf:null,crouch:false,jumping:false,inv:60,star:0,skid:0,combo:0});
  w.enemies=L.enemies.filter(e=>e.x>check+120).map(spawnFoe);w.items=[];w.fire=[];cams[i].x=Math.max(0,check-48);};
 const nextLap=i=>{const p=pl[i];worlds[i]=makeWorld(L);Object.assign(p,{x:L.start,y:13*T,prevY:13*T,vx:0,vy:0,grounded:true,area:'main',pipe:null,flag:null,inCastle:false,castleT:0,auto:false,flagged:false,best:L.start,lap:p.lap+1,inv:0,combo:0});cams[i].x=0;flash[i]=.9;note(p,'lap');};
 const grow=(p,to)=>{p.tf={t:0,to,from:p.fire?'fire':p.big?'big':'small'};p.big=true;if(to==='fire')p.fire=true;sfx.power();s.react(p.i,'happy');};
 const killFoe=(w,e,dir,p,n=100)=>{if(e.state==='dying')return;e.state='dying';e.vx=dir*1.1;e.vy=-3.4;e.active=true;if(p)addScore(p,w,n,e.x,e.y-16);sfx.kick();};

 // head bump on a tile (from below)
 function bumpTile(p,w,area,cc,r){
  const t=tileAt(w,area,cc,r),idx=area==='room'?-1-(r*RS+cc):r*S+cc,what=area==='main'?w.content.get(idx):undefined;
  if(t===QBLOCK||(t===BRICK&&what)){
   let spent=true;
   if(what==='coin'||what==='multi'){gainCoin(p,w);w.pops.push({x:cc*T+8,y:r*T-8,vy:-5,t:0});
    if(what==='multi'){const m=w.multi.get(idx)||{n:0,t:simT};m.n++;w.multi.set(idx,m);spent=m.n>=10||simT-m.t>5;}}
   else if(what==='power'){w.items.push({type:p.big?'flower':'mushroom',x:cc*T+8,y:r*T,emerge:16,vx:0,vy:0});sfx.sprout();}
   else if(what==='star'){w.items.push({type:'star',x:cc*T+8,y:r*T,emerge:16,vx:0,vy:0});sfx.sprout();}
   else gainCoin(p,w);
   if(spent){setTile(w,area,cc,r,USED);w.content.delete(idx);}
   w.bumps.set(idx,0);
  }else if(t===BRICK){
   if(p.big){setTile(w,area,cc,r,0);w.bumps.delete(idx);for(const [dx,dy] of [[-1,-1],[1,-1],[-1,0],[1,0]])w.debris.push({x:cc*T+8+dx*4,y:r*T+8+dy*4,vx:dx*1.2,vy:-4.5-(dy?0:-1.5),t:0});addScore(p,w,50,cc*T+8,r*T);sfx.brk();}
   else{w.bumps.set(idx,0);sfx.bump();}
  }else{sfx.bump();return;}
  // whatever stands on a bumped block gets knocked
  if(area!=='main')return;
  for(const e of w.enemies)if(e.alive&&e.state!=='dying'&&e.type!=='piranha'&&Math.abs(e.y-r*T)<2&&Math.abs(e.x-(cc*T+8))<14)killFoe(w,e,e.x<cc*T+8?-1:1,p,100);
  for(const it of w.items)if(!it.emerge&&Math.abs(it.y-r*T)<2&&Math.abs(it.x-(cc*T+8))<14){it.vy=-3.5;if(it.type==='mushroom')it.vx=it.x<cc*T+8?-1:1;}
  L.coins.forEach((q,k)=>{if(!w.got[k]&&Math.abs(q.x-(cc*T+8))<4&&Math.abs(q.y-(r*T-8))<4){w.got[k]=1;gainCoin(p,w);w.pops.push({x:q.x,y:q.y,vy:-4,t:0});}});
 }

 function stepPlayer(p,w,inp){
  const press=inp.press,bPress=inp.bPress;inp.press=0;inp.bPress=0;
  p.prevY=p.y;
  if(p.inCastle){p.castleT++;return;}
  if(p.dead){p.dead++;if(p.pit){if(p.dead>100)respawn(p,p.i);return;}if(p.dead<28)return;if(p.dead===28)p.vy=-4.4;p.vy=Math.min(p.vy+.2,5);p.y+=p.vy;if(p.dead>170)respawn(p,p.i);return;}
  if(p.tf){p.tf.t++;if(p.tf.t>=48)p.tf=null;return;}
  if(p.pipe){stepPipe(p);return;}
  if(p.flag){stepFlag(p,w);return;}
  if(p.inv>0)p.inv--;if(p.star>0)p.star--;if(p.skid>0)p.skid--;
  if(p.auto)inp={l:0,r:1,d:0,jump:0,b:0};
  const dir=(inp.r?1:0)-(inp.l?1:0),run=!!inp.b,a0=Math.abs(p.vx);
  if(!inp.jump)p.jumping=false;
  if(p.grounded){
   p.crouch=!!inp.d&&p.big;
   if(inp.d&&p.area==='main'&&L.warp&&Math.abs(p.y-L.warp.entry.top*T)<.5&&Math.abs(p.x-(L.warp.entry.c+1)*T)<=8){p.pipe={kind:'down',t:0};p.vx=0;p.crouch=false;sfx.pipe();note(p,'warp');return;}
   if(p.crouch||dir===0){if(Math.abs(p.vx)<=PH.rel)p.vx=0;else p.vx-=Math.sign(p.vx)*PH.rel;}
   else if(p.vx!==0&&Math.sign(p.vx)!==dir){p.vx+=dir*PH.skid;p.skid=4;}
   else{const cap=run?PH.run:PH.walk,a=Math.abs(p.vx);if(a>cap)p.vx=dir*Math.max(cap,a-PH.rel);else p.vx=dir*Math.max(PH.minWalk,Math.min(cap,a+(run?PH.runAcc:PH.walkAcc)));}
   if(dir&&!p.crouch)p.facing=dir;
   const a=Math.abs(p.vx);
   if(a<1){p.gHold=.125;p.gFall=.4375;}else if(a<2.3125){p.gHold=.1171875;p.gFall=.375;}else{p.gHold=.15625;p.gFall=.5625;}
   p.airCap=a>PH.walk+.01||run?PH.run:PH.walk;
   if(press){p.vy=a<2.3125?-4:-5;p.grounded=false;p.jumping=true;sfx.jump(p.big);}
   p.anim+=a*.11;p.idle=a<.01?p.idle+1:0;
  }else{
   if(dir){const back=p.vx!==0&&Math.sign(p.vx)!==dir;p.vx+=dir*(back||a0>=PH.walk?PH.runAcc:PH.walkAcc);if(Math.abs(p.vx)>p.airCap)p.vx=Math.sign(p.vx)*p.airCap;}
   p.vy=Math.min(p.vy+(p.jumping&&p.vy<0?p.gHold:p.gFall),PH.maxFall);
  }
  if(bPress&&p.fire&&!p.crouch&&w.fire.length<2){w.fire.push({x:p.x+p.facing*8,y:p.y-pH(p)*.55,vx:p.facing*4,vy:2,t:0,area:p.area});sfx.fire();}
  // ---- move and collide
  const hw=5.5,h=pH(p),cam=cams[p.i];
  p.x+=p.vx;
  if(p.area==='main'&&p.x-hw<cam.x){p.x=cam.x+hw;if(p.vx<0)p.vx=0;}
  const r0=Math.floor((p.y-h+3)/T),r1=Math.floor((p.y-1)/T);
  {const cr=Math.floor((p.x+hw)/T);for(let r=r0;r<=r1;r++)if(tileAt(w,p.area,cr,r)){p.x=cr*T-hw-.01;if(p.vx>0)p.vx=0;break;}}
  {const cl=Math.floor((p.x-hw)/T);for(let r=r0;r<=r1;r++)if(tileAt(w,p.area,cl,r)){p.x=(cl+1)*T+hw+.01;if(p.vx<0)p.vx=0;break;}}
  if(p.grounded){const r=Math.floor((p.y+1)/T);if(!(tileAt(w,p.area,Math.floor((p.x-hw+1)/T),r)||tileAt(w,p.area,Math.floor((p.x+hw-1)/T),r))){p.grounded=false;p.vy=0;}}
  if(!p.grounded){
   p.y+=p.vy;
   if(p.vy>=0){const r=Math.floor(p.y/T);if(p.prevY<=r*T+.5&&(tileAt(w,p.area,Math.floor((p.x-hw+1)/T),r)||tileAt(w,p.area,Math.floor((p.x+hw-1)/T),r))){p.y=r*T;p.vy=0;p.grounded=true;p.jumping=false;p.combo=0;}}
   else{const rh=Math.floor((p.y-h)/T),cc=Math.floor(p.x/T),cl=Math.floor((p.x-hw+3)/T),cr=Math.floor((p.x+hw-3)/T);
    const hit=tileAt(w,p.area,cc,rh)?cc:tileAt(w,p.area,cl,rh)?cl:tileAt(w,p.area,cr,rh)?cr:null;
    if(hit!==null&&rh>=0){p.y=(rh+1)*T+h;p.vy=1;p.jumping=false;bumpTile(p,w,p.area,hit,rh);}}
  }
  if(p.y-h>ROWS*T+8){kill(p,w,true);return;}
  if(p.area==='main')p.best=Math.max(p.best,p.x);
  // leaving the coin room through the sideways pipe
  if(p.area==='room'&&p.grounded&&inp.r&&p.x+hw>=13*T-.6&&p.y>=12*T){p.pipe={kind:'side',t:0};p.vx=0;sfx.pipe();return;}
  // the flagpole
  if(p.area==="main"&&!p.flag&&!p.flagged&&p.x+hw>=L.flagX-9&&p.x<L.flagX+12){
   const grab=clamp(12*T-p.y,0,10*T),pts=grab>8.5*T?5000:grab>6*T?2000:grab>4*T?800:grab>2*T?400:100;
   p.flag={t:0,phase:'slide'};p.flagged=true;p.x=L.flagX-6;p.vx=0;p.vy=0;p.facing=1;p.crouch=false;addScore(p,w,pts,L.flagX+14,p.y-30);sfx.flag();note(p,'flag');
   if(mode==='race'&&!p.finished){p.finished=true;p.finishT=clock;if(winner<0)winner=p.i;s.react(p.i,'win');}
  }
  if(p.auto&&p.x>=L.doorX){p.inCastle=true;p.castleT=0;sfx.clear();}
 }
 function stepPipe(p){
  const pp=p.pipe;pp.t++;
  if(pp.kind==='down'){p.y+=.8;if(pp.t>=40){Object.assign(p,{area:'room',x:2*T+8,y:2*T,prevY:2*T,vx:0,vy:0,grounded:false,jumping:false,pipe:null});cams[p.i].x=0;flash[p.i]=.5;}}
  else if(pp.kind==='side'){p.x+=.6;if(pp.t>=36){const ex=L.warp.exit;Object.assign(p,{area:'main',x:(ex.c+1)*T,y:ex.top*T+pH(p)+2,vx:0,vy:0,grounded:false});p.pipe={kind:'up',t:0};p.facing=1;cams[p.i].x=Math.max(0,p.x-cams[p.i].w*.4);sfx.pipe();}}
  else{p.y-=.8;const top=L.warp.exit.top*T;if(p.y<=top){p.y=top;p.prevY=top;p.pipe=null;p.grounded=true;p.best=Math.max(p.best,p.x);}}
 }
 function stepFlag(p,w){
  const f=p.flag;f.t++;const base=12*T;
  if(f.phase==='slide'){p.y=Math.min(base,p.y+2);w.flagPos=Math.min(base-3*T-16,w.flagPos+2);if(p.y>=base&&w.flagPos>=base-3*T-16){f.phase='hold';f.t=0;}}
  else if(f.phase==='hold'){if(f.t===1){p.x=L.flagX+7;p.facing=-1;}if(f.t>22){p.flag=null;p.auto=true;p.facing=1;p.grounded=true;p.vy=0;}}
 }

 // ---------------- per-player interactions (coins, enemies, items)
 function interact(p,w,inp){
  if(p.dead||p.pipe||p.tf||p.inCastle)return;
  const h=pH(p),top=p.y-h,list=p.area==='room'?L.room.coins:L.coins,got=p.area==='room'?w.roomGot:w.got;
  let lo=0,hi=list.length;while(lo<hi){const m=(lo+hi)>>1;if(list[m].x<p.x-14)lo=m+1;else hi=m;}
  for(let k=lo;k<list.length&&list[k].x<p.x+14;k++)if(!got[k]&&Math.abs(list[k].x-p.x)<11&&list[k].y>top-5&&list[k].y<p.y+5){got[k]=1;gainCoin(p,w);}
  if(p.area!=='main'||p.flag)return;
  for(const e of w.enemies){
   if(!e.alive||!e.active||e.state==='dying'||e.state==='squash')continue;
   let eTop,eBot=e.y,ew=7;
   if(e.type==='piranha'){if(e.off<4)continue;eTop=e.home-e.off;eBot=e.home;ew=6;}else eTop=e.y-(e.type==='koopa'&&e.state==='walk'?22:14);
   if(Math.abs(p.x-e.x)>=5.5+ew||p.y<=eTop||top>=eBot)continue;
   if(p.star>0){p.combo++;killFoe(w,e,e.x>p.x?1:-1,p,COMBO[Math.min(p.combo,9)]);continue;}
   if(e.type==='piranha'){hurt(p,w);continue;}
   const stomp=p.vy>0&&p.prevY<=eTop+6;
   if(stomp){
    addScore(p,w,COMBO[Math.min(p.combo,9)],e.x,eTop-6);p.combo++;sfx.stomp();
    if(e.type==='goomba'){e.state='squash';e.t=0;}
    else if(e.state==='walk'){e.state='shell';e.vx=0;e.t=0;}
    else if(e.vx!==0){e.vx=0;e.t=0;}
    else{e.vx=p.x<e.x?3.4:-3.4;e.grace=10;sfx.kick();}
    p.y=Math.min(p.y,eTop);p.vy=-4;p.jumping=!!inp.jump;p.gHold=.125;p.gFall=.4375;continue;
   }
   if(e.state==='shell'&&e.vx===0){e.vx=p.x<e.x?3.4:-3.4;e.grace=12;e.t=0;sfx.kick();addScore(p,w,400,e.x,eTop-6);continue;}
   if(e.state==='shell'&&e.grace>0)continue;
   hurt(p,w);
  }
  for(let k=w.items.length-1;k>=0;k--){const it=w.items[k];if(it.emerge>8)continue;
   if(Math.abs(it.x-p.x)<13&&it.y>top-2&&it.y-14<p.y){w.items.splice(k,1);addScore(p,w,1000,it.x,it.y-18);
    if(it.type==='mushroom'){if(!p.big)grow(p,'big');else sfx.power();}
    else if(it.type==='flower'){if(!p.big)grow(p,'big');else if(!p.fire)grow(p,'fire');else sfx.power();}
    else{p.star=600;sfx.star();s.react(p.i,'happy');}}}
 }

 function stepWorld(w,p){
  const cam=cams[p.i],inMain=p.area==='main';
  if(inMain&&!p.tf)for(const e of w.enemies){
   if(!e.alive)continue;
   if(!e.active){if(e.x<cam.x+cam.w+24)e.active=true;else continue;}
   if(e.x<cam.x-96||e.y>ROWS*T+48){e.alive=false;continue;}
   e.frame+=STEP;
   if(e.state==='dying'){e.vy+=.25;e.x+=e.vx;e.y+=e.vy;continue;}
   if(e.state==='squash'){e.t++;if(e.t>30)e.alive=false;continue;}
   if(e.type==='piranha'){e.t++;
    if(e.state==='hidden'){if(e.t>90&&Math.abs(p.x-e.x)>26){e.state='up';e.t=0;}}
    else if(e.state==='up'){e.off=Math.min(24,e.off+.8);if(e.off>=24){e.state='out';e.t=0;}}
    else if(e.state==='out'){if(e.t>72){e.state='down';e.t=0;}}
    else{e.off=Math.max(0,e.off-.8);if(e.off<=0){e.state='hidden';e.t=0;}}
    continue;}
   const hgt=e.type==='koopa'&&e.state==='walk'?22:14,res=moveBody(e,w,7,hgt);
   if(res.wall){e.vx=-e.vx;if(e.state==='shell'&&Math.abs(e.x-cam.x-cam.w/2)<cam.w/2+20)sfx.bump();}
   if(e.state==='shell'){if(e.grace>0)e.grace--;
    if(e.vx===0){e.t++;if(e.t>480){e.state='walk';e.vx=p.x<e.x?-.5:.5;}}
    else for(const o of w.enemies)if(o!==e&&o.alive&&o.active&&o.state!=='dying'&&o.state!=='squash'&&Math.abs(o.x-e.x)<14&&(o.type==='piranha'?o.off>4&&e.y>o.home-o.off&&e.y-14<o.home:Math.abs(o.y-e.y)<14)){killFoe(w,o,Math.sign(e.vx),p,500);}}
  }
  // walkers turn round when they meet
  if(inMain){const ws=w.enemies.filter(e=>e.alive&&e.active&&e.state==='walk'&&e.type!=='piranha');
   for(let a=0;a<ws.length;a++)for(let b=a+1;b<ws.length;b++){const A=ws[a],B=ws[b];if(Math.abs(A.x-B.x)<14&&Math.abs(A.y-B.y)<10&&(B.x-A.x)*(A.vx-B.vx)>0){A.vx=-A.vx;B.vx=-B.vx;}}}
  // power-ups
  for(let k=w.items.length-1;k>=0;k--){const it=w.items[k];
   if(it.emerge>0){it.y-=.5;it.emerge-=.5;if(it.emerge<=0){it.emerge=0;if(it.type==='mushroom')it.vx=1;if(it.type==='star'){it.vx=1.2;it.vy=-4;}}continue;}
   if(it.type==='flower')continue;
   const res=moveBody(it,w,6,14,it.type==='star'?.2:.25);if(res.wall)it.vx=-it.vx;if(it.type==='star'&&res.landed)it.vy=-4.5;
   if(it.y>ROWS*T+32||it.x<cam.x-64)w.items.splice(k,1);}
  // fireballs
  for(let k=w.fire.length-1;k>=0;k--){const f=w.fire[k];f.t++;f.x+=f.vx;f.vy=Math.min(f.vy+.38,4.5);f.y+=f.vy;let gone=false;
   if(f.area!==p.area){w.fire.splice(k,1);continue;}
   if(solidAt(w,f.area,f.x,f.y+4)&&f.vy>0){f.y=Math.floor((f.y+4)/T)*T-4;f.vy=-3;}
   if(solidAt(w,f.area,f.x+Math.sign(f.vx)*4,f.y))gone=true;
   if(f.area==='main')for(const e of w.enemies){if(!e.alive||!e.active||e.state==='dying'||e.state==='squash')continue;const eTop=e.type==='piranha'?e.home-e.off:e.y-(e.type==='koopa'&&e.state==='walk'?22:14),eBot=e.type==='piranha'?e.home:e.y;
    if(e.type==='piranha'&&e.off<4)continue;if(Math.abs(f.x-e.x)<10&&f.y>eTop-4&&f.y<eBot+4){killFoe(w,e,Math.sign(f.vx),p,200);gone=true;break;}}
   if(gone){w.fx.burst(f.x,f.y,{n:6,colors:['#fff','#fc9838','#d82800'],speed:60,life:.25,size:1.6});}
   if(gone||f.x<cam.x-16||f.x>cam.x+cam.w+16||f.y>ROWS*T+16||f.t>300)w.fire.splice(k,1);}
  for(let k=w.debris.length-1;k>=0;k--){const d=w.debris[k];d.t++;d.vy+=.3;d.x+=d.vx;d.y+=d.vy;if(d.y>ROWS*T+20)w.debris.splice(k,1);}
  for(let k=w.pops.length-1;k>=0;k--){const q=w.pops[k];q.t++;q.y+=q.vy;q.vy+=.32;if(q.t>30){w.pops.splice(k,1);w.fx.pop(q.x,q.y,'200',{color:'#fff',stroke:'#000',size:7,rise:20,life:.7});}}
  for(const [k,t] of w.bumps){if(t>=10)w.bumps.delete(k);else w.bumps.set(k,t+1);}
  if(p.inCastle)w.castleFlag=Math.min(1,w.castleFlag+.03);
 }
 const updateCamera=(p,i)=>{const cam=cams[i];
  if(p.area==='room'){cam.x=cam.w>RS*T?(RS*T-cam.w)/2:clamp(p.x-cam.w/2,0,RS*T-cam.w);}
  else{const tx=p.x-cam.w*.42;if(tx>cam.x)cam.x=tx;cam.x=Math.max(0,Math.min(cam.x,L.W*T-cam.w));}
  const ty=cam.h>=ROWS*T?ROWS*T-cam.h:clamp((p.dead?p.y-60:p.y)-cam.h*.62,0,ROWS*T-cam.h);cam.y+=(ty-cam.y)*(cam.h>=ROWS*T?1:.12);};

 // ---------------- tile art (16x16 pixel tiles, drawn once)
 const art=(()=>{const mk=(fn)=>{const cv=document.createElement('canvas');cv.width=cv.height=T;const q=cv.getContext('2d');const px=(col,X,Y,W=1,H=1)=>{q.fillStyle=col;q.fillRect(X,Y,W,H);};fn(px);return cv;};
  const ground=(base,light)=>mk(px=>{px(base,0,0,16,16);px(light,0,0,10,1);px(light,0,0,1,10);px(light,11,0,4,1);px(light,11,6,5,1);px(light,0,11,4,1);px(light,6,11,1,4);
   px('#000',15,0,1,16);px('#000',0,15,16,1);px('#000',10,0,1,6);px('#000',10,5,6,1);px('#000',4,10,1,6);px('#000',0,10,4,1);px('#000',7,10,8,1);px('#000',6,12,1,3);});
  const brick=(base,light)=>mk(px=>{px(base,0,0,16,16);px(light,0,0,16,1);for(const y of [3,7,11,15])px('#000',0,y,16,1);for(const [y,xs] of [[0,[7,15]],[4,[3,11]],[8,[7,15]],[12,[3,11]]])for(const X of xs)px('#000',X,y+(y?0:1),1,y?3:2);});
  const qglyph=[[5,3,5,1],[4,4,2,1],[9,4,2,1],[9,5,2,1],[8,6,2,1],[7,7,2,1],[7,8,2,1],[7,10,2,2]];
  const qb=(base,glyph)=>mk(px=>{px(base,0,0,16,16);px('#000',15,0,1,16);px('#000',0,15,16,1);px(C.brown,0,0,15,1);px(C.brown,0,0,1,15);for(const [X,Y] of [[2,2],[13,2],[2,13],[13,13]])px('#000',X,Y);for(const [X,Y,W,H] of qglyph){px('#000',X+1,Y+1,W,H);}for(const [X,Y,W,H] of qglyph)px(glyph,X,Y,W,H);});
  const used=mk(px=>{px(C.brick,0,0,16,16);px('#000',0,0,16,1);px('#000',0,0,1,16);px('#000',15,0,1,16);px('#000',0,15,16,1);for(const [X,Y] of [[2,2],[13,2],[2,13],[13,13]])px('#000',X,Y);});
  const hard=(base,light)=>mk(px=>{px(base,0,0,16,16);px(light,0,0,15,1);px(light,0,0,1,15);px(light,1,1,13,1);px(light,1,1,1,13);px('#000',15,0,1,16);px('#000',0,15,16,1);px('#000',14,1,1,14);px('#000',1,14,14,1);});
  const pipeTop=right=>mk(px=>{px(C.green,0,0,16,16);px('#000',0,0,16,1);px('#000',0,15,16,1);if(!right){px('#000',0,0,1,16);px(C.lime,2,1,2,14);px(C.lime,5,1,1,14);}else{px('#000',15,0,1,16);for(let y=1;y<15;y+=2){px('#000',10,y);px('#000',12,y+1);}px('#000',13,1,1,14);}});
  const pipeBody=right=>mk(px=>{if(!right){px('#000',2,0,1,16);px(C.green,3,0,13,16);px(C.lime,5,0,2,16);px(C.lime,8,0,1,16);}else{px(C.green,0,0,13,16);for(let y=0;y<16;y+=2){px('#000',8,y);px('#000',10,y+1);}px('#000',13,0,1,16);}});
  const side=(mouth,bottom)=>mk(px=>{px(C.green,0,0,16,16);if(mouth){px('#000',0,0,1,16);px(C.lime,2,bottom?0:2,2,14);}if(!bottom)px('#000',0,mouth?0:2,16,1);else px('#000',0,mouth?15:13,16,1);if(!bottom&&!mouth)px(C.lime,0,4,16,2);if(!bottom&&mouth)px(C.lime,4,3,12,2);});
  const sets={};
  for(const ug of [false,true]){const base=ug?C.ug:C.brick,light=ug?C.ugLight:C.light;
   sets[ug?'room':'main']={[GROUND]:ground(base,light),[BRICK]:brick(base,light),[USED]:used,[HARD]:hard(base,light),[PTL]:pipeTop(false),[PTR]:pipeTop(true),[PL]:pipeBody(false),[PR]:pipeBody(true),
    [HMT]:side(true,false),[HMB]:side(true,true),[HBT]:side(false,false),[HBB]:side(false,true),q:[qb(C.q,C.brick),qb('#e47a24',C.brown),qb(C.brick,'#5a1c00')]};}
  return sets;})();

 // ---------------- drawing
 const flash=[0,0];
 const qFrame=()=>[0,0,0,1,2,1][Math.floor(simT*8)%6];
 function drawCloud(cx,cy,n,fill,edge){g.fillStyle=edge;for(let k=0;k<n;k++){g.beginPath();g.arc(cx+12+k*16,cy+3,10,0,7);g.fill();}g.fillStyle=fill;for(let k=0;k<n;k++){g.beginPath();g.arc(cx+12+k*16,cy,10,0,7);g.arc(cx+20+k*16,cy-6,9,0,7);g.fill();}g.fillRect(cx+4,cy,n*16+16,8);g.fillStyle=edge;g.fillRect(cx+4,cy+8,n*16+16,2);}
 function drawHill(hx,w5){const w=w5*T,h=w5===5?2.4*T:1.2*T,base=13*T;g.fillStyle=C.green;g.strokeStyle='#000';g.lineWidth=1;g.beginPath();g.moveTo(hx,base);g.bezierCurveTo(hx+w*.28,base-h*.3,hx+w*.3,base-h,hx+w/2,base-h);g.bezierCurveTo(hx+w*.7,base-h,hx+w*.72,base-h*.3,hx+w,base);g.closePath();g.fill();g.stroke();
  g.fillStyle='#000';const sp=w5===5?[[.38,.45],[.62,.45],[.5,.75]]:[[.5,.6]];for(const [a,b] of sp){g.fillRect(hx+w*a-1.5,base-h*b-3,2,6);g.fillRect(hx+w*a+1.5,base-h*b-2,2,5);}}
 function drawDecor(d,x0,x1){if(d.x>x1+40||d.x+120<x0)return;
  if(d.type==='hill')drawHill(d.x,d.w);else if(d.type==='bush'){g.save();g.translate(0,13*T-8);drawCloud(d.x,0,d.n,C.bush,C.green);g.restore();}else drawCloud(d.x,d.y,d.n,C.white,C.cloud);}
 function drawCastle(){const X=L.castleX,base=13*T,pat=g.createPattern(art.main[BRICK],'repeat');g.fillStyle=pat;g.fillRect(X,base-5*T,5*T,5*T);
  g.fillStyle=C.sky;g.fillRect(X,base-5*T,T,2*T);g.fillRect(X+4*T,base-5*T,T,2*T);
  g.fillStyle=pat;for(let k=0;k<5;k++)g.fillRect(X+k*T+2,base-3*T-6,10,6);for(let k=1;k<4;k++)g.fillRect(X+k*T+2,base-5*T-6,10,6);
  g.fillStyle='#000';g.fillRect(X+2*T,base-2*T+4,T,2*T-4);g.beginPath();g.arc(X+2.5*T,base-2*T+4,T/2,Math.PI,0);g.fill();g.fillRect(X+1.5*T,base-4*T,5,10);g.fillRect(X+3.2*T,base-4*T,5,10);
  return pat;}
 function drawCastleFlag(w){if(w.castleFlag<=0)return;const X=L.castleX+2.5*T,y=13*T-5*T-6-w.castleFlag*20;g.fillStyle='#000';g.fillRect(X-1,y,2,w.castleFlag*20);g.fillStyle=C.white;g.fillRect(X+1,y,14,10);g.fillStyle=C.red;star5(X+8,y+5,4);}
 function star5(cx,cy,r){g.beginPath();for(let k=0;k<10;k++){const rr0=k%2?r*.45:r,a=k*Math.PI/5-Math.PI/2;g.lineTo(cx+Math.cos(a)*rr0,cy+Math.sin(a)*rr0);}g.closePath();g.fill();}
 function drawFlag(w){const X=L.flagX,top=2*T+8;g.fillStyle=C.bush;g.fillRect(X-1,top,2,12*T-top);g.fillStyle=C.green;g.beginPath();g.arc(X,top-4,4,0,7);g.fill();g.fillStyle=C.lime;g.fillRect(X-2,top-6,2,2);
  const fy=top+4+w.flagPos;g.fillStyle=C.white;g.beginPath();g.moveTo(X-1,fy);g.lineTo(X-17,fy+8);g.lineTo(X-1,fy+16);g.closePath();g.fill();g.fillStyle=C.green;g.beginPath();g.arc(X-6,fy+8,3.2,0,7);g.fill();}
 function drawCoin(cx,cy,ph){const wd=[5,3.6,1.4,3.6][Math.floor(ph)%4];g.fillStyle=C.brown;g.fillRect(cx-wd-1,cy-7,wd*2+2,14);g.fillStyle=C.q;g.fillRect(cx-wd,cy-6,wd*2,12);g.fillStyle=C.white;g.fillRect(cx-wd*.4,cy-4,Math.max(1,wd*.5),8);}
 function drawGoomba(e){const sq=e.state==='squash';g.save();g.translate(e.x,e.y);if(e.state==='dying')g.scale(1,-1),g.translate(0,14);
  if(sq){g.fillStyle=C.brick;g.fillRect(-8,-6,16,4);g.fillStyle=C.light;g.fillRect(-6,-3,12,3);g.fillStyle='#000';g.fillRect(-4,-5,2,1);g.fillRect(2,-5,2,1);g.restore();return;}
  const st=Math.floor(e.frame*6)%2;g.fillStyle=C.brick;g.beginPath();g.ellipse(0,-9,8,6.5,0,Math.PI,0);g.lineTo(8,-6);g.lineTo(-8,-6);g.fill();g.fillRect(-7,-9,14,4);
  g.fillStyle=C.light;g.fillRect(-4,-6,8,4);g.fillStyle=C.white;g.fillRect(-5,-11,3,4);g.fillRect(2,-11,3,4);g.fillStyle='#000';g.fillRect(-4,-10,2,3);g.fillRect(2,-10,2,3);g.fillRect(-6,-13,4,1);g.fillRect(2,-13,4,1);
  g.fillStyle='#000';g.fillRect(st?-8:-6,-2,6,2);g.fillRect(st?2:0,-2,6,2);g.restore();}
 function drawKoopa(e){g.save();g.translate(e.x,e.y);if(e.state==='dying'){g.scale(1,-1);g.translate(0,14);}const shell=e.state!=='walk';
  if(!shell){g.scale(e.vx>0?-1:1,1);const st=Math.floor(e.frame*6)%2;g.fillStyle='#f8b800';g.fillRect(-7,-24,5,9);g.fillRect(-9,-22,3,4);g.fillStyle='#000';g.fillRect(-7,-21,1,2);g.fillStyle=C.white;g.fillRect(-6,-16,3,3);
   g.fillStyle='#f8b800';g.fillRect(st?-5:-3,-3,4,3);g.fillRect(st?3:1,-3,4,3);}
  const y0=shell?-1:-3;g.fillStyle=C.white;g.beginPath();g.ellipse(shell?0:2,y0-6,7.5,7,0,Math.PI,0);g.lineTo(9.5,y0);g.lineTo(-5.5+(shell?-2:0),y0);g.fill();
  g.fillStyle=C.green;g.beginPath();g.ellipse(shell?0:2,y0-6,6,6,0,Math.PI,0);g.fill();g.fillStyle=C.lime;g.fillRect((shell?0:2)-3,y0-10,2,2);g.fillRect((shell?0:2)+1,y0-10,2,2);g.fillRect((shell?0:2)-1,y0-7,2,2);
  if(shell&&e.vx===0&&e.t>380&&Math.floor(e.t/6)%2){g.fillStyle='#f8b800';g.fillRect(-3,-3,6,2);}
  g.restore();}
 function drawPiranha(e){if(e.off<=0)return;const chomp=Math.floor(e.frame*5)%2,top=e.home-e.off;g.save();g.translate(e.x,top);
  g.fillStyle=C.green;g.fillRect(-1,8,2,e.off-8);g.beginPath();g.ellipse(-5,13,5,2.5,-.5,0,7);g.ellipse(5,13,5,2.5,.5,0,7);g.fill();
  g.fillStyle=C.green;g.beginPath();g.arc(0,4,7,0,7);g.fill();g.fillStyle=C.white;g.fillRect(-5,1,2,2);g.fillRect(3,6,2,2);g.fillRect(-2,8,2,1);
  g.fillStyle='#000';g.beginPath();g.moveTo(0,4);g.lineTo(chomp?-4:-2,-3);g.lineTo(chomp?4:2,-3);g.fill();g.fillStyle=C.white;g.fillRect(chomp?-4:-2,-3,1,2);g.fillRect(chomp?3:1,-3,1,2);g.restore();}
 function drawItem(it){g.save();g.translate(it.x,it.y);
  if(it.type==='mushroom'){g.fillStyle=C.light;g.fillRect(-4,-7,8,7);g.fillStyle='#000';g.fillRect(-2,-6,1,3);g.fillRect(1,-6,1,3);g.fillStyle=C.red;g.beginPath();g.ellipse(0,-8,8,7,0,Math.PI,0);g.fill();g.fillRect(-8,-8,16,2);g.fillStyle=C.white;g.beginPath();g.arc(0,-11,2.6,0,7);g.arc(-5,-9,1.8,0,7);g.arc(5,-9,1.8,0,7);g.fill();}
  else if(it.type==='flower'){const cyc=[C.red,C.q,'#f8b800',C.white][Math.floor(simT*10)%4];g.fillStyle=C.green;g.fillRect(-1,-7,2,7);g.fillRect(-6,-5,4,2);g.fillRect(2,-5,4,2);g.fillStyle=cyc;g.beginPath();g.ellipse(0,-11,7,4.5,0,0,7);g.fill();g.fillStyle='#f8b800';g.beginPath();g.ellipse(0,-11,4.5,2.8,0,0,7);g.fill();g.fillStyle=C.white;g.fillRect(-2,-12,4,2);}
  else{g.fillStyle=Math.floor(simT*12)%2?'#f8b800':C.q;star5(0,-7,8);g.fillStyle='#000';g.fillRect(-2,-9,1,3);g.fillRect(1,-9,1,3);}
  g.restore();}
 const tileImg=(area,t)=>t===QBLOCK?art[area].q[qFrame()]:art[area][t];
 function drawTiles(w,area,x0,x1,y0,y1){const cs=Math.max(0,Math.floor(x0/T)),ce=Math.min(area==='room'?RS-1:L.W-1,Math.floor(x1/T)),rsS=Math.max(0,Math.floor(y0/T)),re=Math.min(ROWS-1,Math.floor(y1/T));
  for(let r=rsS;r<=re;r++)for(let cc=cs;cc<=ce;cc++){const t=tileAt(w,area,cc,r);if(!t)continue;const idx=area==='room'?-1-(r*RS+cc):r*S+cc,b=w.bumps.get(idx);const off=b!==undefined?-Math.sin(b/10*Math.PI)*5:0;g.drawImage(tileImg(area,t),cc*T,r*T+off);}}
 // Mario's body (P2 in Luigi colours) with the player's head under the cap. Feet at (0,0); facing right before mirroring.
 function drawRunner(p,alpha=1,forceSmall=null){
  const i=p.i;g.save();g.globalAlpha*=alpha;
  if(p.inv>0&&!p.tf&&(frames>>2)%2&&alpha===1)g.globalAlpha*=.35;
  let big=p.big,pal=p.fire?FIRE_PAL:PALS[i];
  if(p.tf){const flick=(p.tf.t>>2)%2;if(p.tf.to==='small')big=flick===0;else if(p.tf.from==='small')big=flick===1;if(p.tf.to==='fire'&&flick)pal=FIRE_PAL;else if(p.tf.to==='fire')pal=PALS[i];}
  if(forceSmall)big=false;
  if(p.star>0)pal=STAR_PALS[(frames>>(p.star<120?3:1))%4];
  const f=p.facing,crouch=p.crouch&&big;g.translate(p.x,p.y);
  if(p.dead){const pose='dead';body(false,pose,0);head(false,'sad',0,f);g.restore();return;}
  const run=Math.abs(p.vx);let pose='stand';
  if(p.flag||p.pipe&&p.pipe.kind!=='down'&&p.pipe.kind!=='up')pose=p.flag?'pole':'walk';
  else if(crouch)pose='crouch';else if(!p.grounded&&!p.pipe)pose='jump';else if(p.skid>0&&p.vx!==0&&Math.sign(p.vx)!==f)pose='skid';else if(run>.05)pose='walk';
  const frame=Math.floor(p.anim)%3;
  g.save();g.scale(f,1);body(big,pose,frame);g.restore();
  head(big,p.dead?'sad':p.finished||p.inCastle?'win':p.star>0||run>2.3?'happy':undefined,crouch?1:0,f);
  g.restore();
  function R(col,X,Y,W,H){g.fillStyle=col;g.fillRect(X,Y,W,H);}
  function body(bg,pose,fr){
   if(pose==='dead'){R(pal.shirt,-5,-10,10,6);R(C.skin,-7,-16,2,6);R(C.skin,5,-16,2,6);R(pal.over,-4,-7,8,5);R(pal.shoe,-5,-2,4,2);R(pal.shoe,1,-2,4,2);return;}
   if(!bg){
    R(pal.shirt,-4,-10,8,5);R(pal.over,-3,-7,6,5);R(pal.over,-3,-10,1,3);R(pal.over,2,-10,1,3);
    if(pose==='jump'){R(pal.shirt,3,-15,2,6);R(C.skin,3,-17,2,2);R(pal.shirt,-6,-9,2,3);R(C.skin,-6,-6,2,2);R(pal.over,-4,-3,3,2);R(pal.over,1,-4,3,2);R(pal.shoe,-6,-2,4,2);R(pal.shoe,3,-4,4,2);return;}
    if(pose==='pole'){R(pal.shirt,3,-14,2,5);R(C.skin,4,-16,2,2);R(pal.shirt,-5,-12,2,4);R(C.skin,-4,-13,2,2);R(pal.shoe,-2,-2,4,2);R(pal.shoe,2,-4,3,2);return;}
    if(pose==='skid'){R(pal.shirt,-6,-11,2,4);R(C.skin,-7,-12,2,2);R(pal.shoe,1,-2,5,2);R(pal.shoe,-4,-2,3,2);R(pal.over,-2,-3,4,1);return;}
    R(pal.shirt,-6,-9,2,4);R(pal.shirt,4,-9,2,4);R(C.skin,-6,-5,2,2);R(C.skin,4,-5,2,2);
    if(pose==='walk'){const L0=[[-6,2],[-3,0],[-5,3]][fr],R0=[[2,2],[0,0],[3,1]][fr];R(pal.over,-3,-3,6,1);R(pal.shoe,L0[0],-2,4,2);R(pal.shoe,R0[0],-2-(fr===2?1:0),4,2);return;}
    R(pal.over,-3,-3,6,1);R(pal.shoe,-5,-2,4,2);R(pal.shoe,1,-2,4,2);return;}
   if(pose==='crouch'){R(pal.shirt,-5,-14,10,6);R(pal.over,-5,-10,10,6);R(pal.shirt,-7,-13,2,5);R(C.skin,-7,-8,2,2);R(pal.shoe,-6,-4,5,4);R(pal.shoe,1,-4,5,4);return;}
   R(pal.shirt,-5,-20,10,8);R(pal.over,-5,-14,10,8);R(pal.over,-4,-20,2,6);R(pal.over,2,-20,2,6);R('#fcbc3c',-3,-14,1,1);R('#fcbc3c',2,-14,1,1);
   if(pose==='jump'){R(pal.shirt,5,-27,2,9);R(C.skin,5,-29,2,2);R(pal.shirt,-7,-19,2,6);R(C.skin,-7,-13,2,2);R(pal.over,-5,-6,4,3);R(pal.over,1,-8,4,3);R(pal.shoe,-7,-3,5,3);R(pal.shoe,3,-7,5,3);return;}
   if(pose==='pole'){R(pal.shirt,4,-27,2,8);R(C.skin,5,-29,2,2);R(pal.shirt,-6,-24,2,6);R(C.skin,-5,-26,2,2);R(pal.over,-3,-6,4,3);R(pal.shoe,-3,-3,5,3);R(pal.shoe,2,-7,4,3);return;}
   if(pose==='skid'){R(pal.shirt,-8,-21,2,6);R(C.skin,-9,-22,2,2);R(pal.over,-3,-6,6,3);R(pal.shoe,1,-3,6,3);R(pal.shoe,-5,-3,4,3);return;}
   R(pal.shirt,-7,-19,2,7);R(pal.shirt,5,-19,2,7);R(C.skin,-7,-12,2,2);R(C.skin,5,-12,2,2);
   if(pose==='walk'){const a=[[-7,3],[-4,1],[-6,4]][fr],b=[[3,2],[0,0],[2,1]][fr];R(pal.over,-4,-6,8,3);R(pal.shoe,a[0],-3,5,3);R(pal.shoe,b[0],-3-(fr===2?1:0),5,3);return;}
   R(pal.over,-5,-6,4,3);R(pal.over,1,-6,4,3);R(pal.shoe,-6,-3,5,3);R(pal.shoe,1,-3,5,3);}
  function head(bg,mood,crouchK,fc){
   const size=bg&&!crouchK?30:26,hy=bg?(crouchK?-22:-33):-20,hx=fc*1,r=size/2;
   s.sprite(g,i,hx,hy,size,{exact:true,mood});
   g.fillStyle=pal.cap;g.beginPath();g.ellipse(hx,hy-r*.58,r*.95,r*.5,0,Math.PI,0);g.fill();g.fillRect(fc>0?hx-r*.2:hx-r*1.25,hy-r*.64,r*1.45,r*.17);
   g.fillStyle=C.white;g.beginPath();g.arc(hx+fc*r*.12,hy-r*.82,r*.17,0,7);g.fill();g.fillStyle=pal.cap===C.white?C.red:pal.cap;g.font=`900 ${Math.round(r*.26)}px Arial,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(i?'L':'M',hx+fc*r*.12,hy-r*.8);
  }
 }
 function drawFire(f){const a=Math.floor(f.t/3)%4;g.save();g.translate(f.x,f.y);g.rotate(a*Math.PI/2);g.fillStyle=C.red;g.fillRect(-3,-3,6,6);g.fillStyle='#f8b800';g.fillRect(-2,-2,3,3);g.fillStyle=C.white;g.fillRect(-1,-1,1,1);g.restore();}
 function drawView(i,t){
  const v=vp(i),p=pl[i],w=worlds[i],cam=cams[i],sc=Math.max(.6,v.h/(ROWS*T),v.w/760),vw=v.w/sc,vh=v.h/sc;cam.w=vw;cam.h=vh;
  const area=p.area;
  g.save();g.beginPath();g.rect(v.x,v.y,v.w,v.h);g.clip();
  g.fillStyle=area==='room'?'#000':C.sky;g.fillRect(v.x,v.y,v.w,v.h);
  g.save();w.fx.begin(g);g.translate(Math.round(v.x-cam.x*sc),Math.round(v.y-cam.y*sc));g.scale(sc,sc);g.imageSmoothingEnabled=false;
  const x0=cam.x-T,x1=cam.x+vw+T;
  if(area==='main'){for(const d of L.decor)drawDecor(d,x0,x1);if(L.castleX<x1&&L.castleX+5*T>x0){drawCastleFlag(w);drawCastle();}if(L.flagX>x0-30&&L.flagX<x1+30)drawFlag(w);}
  // things that sit behind the tiles: piranhas in pipes, power-ups rising out of blocks, a runner inside a pipe
  if(area==='main')for(const e of w.enemies)if(e.alive&&e.type==='piranha'&&e.state!=='dying'&&e.x>x0&&e.x<x1)drawPiranha(e);
  for(const it of w.items)if(it.emerge>0)drawItem(it);
  const o=pl[1-i];
  if(p.pipe)drawRunner(p);if(o.pipe&&o.area===area)drawRunner(o,.42);
  drawTiles(w,area,x0,x1,cam.y-T,cam.y+vh+T);
  const list=area==='room'?L.room.coins:L.coins,got=area==='room'?w.roomGot:w.got,ph=simT*6;
  for(let k=0;k<list.length;k++){const q=list[k];if(q.x<x0)continue;if(q.x>x1)break;if(!got[k])drawCoin(q.x,q.y,ph);}
  for(const q of w.pops)drawCoin(q.x,q.y,simT*14);
  for(const it of w.items)if(!it.emerge)drawItem(it);
  if(area==='main')for(const e of w.enemies){if(!e.alive||!e.active||e.type==='piranha'&&e.state!=='dying')continue;if(e.x<x0-16||e.x>x1+16)continue;if(e.type==='goomba')drawGoomba(e);else if(e.type==='koopa')drawKoopa(e);else drawPiranha(e);}
  for(const f of w.fire)drawFire(f);
  for(const d of w.debris){g.save();g.translate(d.x,d.y);g.rotate(d.t*.3);g.fillStyle=area==='room'?C.ug:C.brick;g.fillRect(-3,-3,6,6);g.fillStyle='#000';g.fillRect(-3,2,6,1);g.restore();}
  if(!o.pipe&&!o.inCastle&&o.area===area&&o.x>x0-20&&o.x<x1+20)drawRunner(o,.42);
  if(!p.pipe&&!p.inCastle)drawRunner(p);
  w.fx.draw(g);
  w.fx.end(g);g.restore();
  if(flash[i]>0){g.fillStyle=`rgba(0,0,0,${flash[i]})`;g.fillRect(v.x,v.y,v.w,v.h);}
  drawHUD(i,v,t);
  g.restore();
 }
 const fmtRace=sec=>`${Math.floor(sec/60)}'${String(Math.floor(sec%60)).padStart(2,'0')}"${String(Math.floor(sec*100%100)).padStart(2,'0')}`;
 function txt(str,px,py,size,col='#fff',align='left'){g.font=`900 ${size}px "Courier New",ui-monospace,monospace`;g.textAlign=align;g.textBaseline='top';g.lineJoin='round';g.lineWidth=Math.max(2.5,size*.3);g.strokeStyle='#000';g.strokeText(str,px,py);g.fillStyle=col;g.fillText(str,px,py);}
 function drawHUD(i,v,t){
  const p=pl[i],u=clamp(v.h/240,.6,2.4),size=Math.round(clamp(9*u,10,19)),pad=7*u,y1=v.y+pad,y2=y1+size*1.1;
  const name=s.players[i].name.toUpperCase().slice(0,9),cols=[.03,.33,.56,.8].map(k=>v.x+v.w*k);
  txt(name,cols[0],y1,size,PCOL[i]);txt(String(p.score).padStart(6,'0'),cols[0],y2,size);
  g.save();g.translate(cols[1]+size*.35,y2+size*.5);g.scale(size/16,size/16);drawCoin(0,0,simT*6);g.restore();txt(`×${String(p.coins).padStart(2,'0')}`,cols[1]+size*.8,y2,size,mode==='coins'?'#ffe23a':'#fff');
  if(mode==='coins')txt('COINS',cols[1],y1,size);
  txt('WORLD',cols[2],y1,size);txt(p.area==='room'?'1-1 ▼':`1-${p.lap+1}`,cols[2],y2,size);
  const left=Math.max(0,COIN_TIME-clock);txt('TIME',cols[3],y1,size);txt(mode==='coins'?String(Math.ceil(left)).padStart(3,'0'):fmtRace(p.finished?p.finishT:clock),cols[3],y2,size,mode==='coins'&&left<10&&(frames>>4)%2?'#ff5a3a':'#fff');
  // progress strip (both players)
  const bw=Math.min(v.w*.4,240*u),bx=v.x+(v.w-bw)/2,by=y2+size*1.55;g.fillStyle='rgba(0,0,0,.4)';g.fillRect(bx-3,by-3,bw+6,6);
  for(const j of [1-i,i]){const q=pl[j],k=clamp((q.best-L.start)/(L.end-L.start),0,1),hx=bx+k*bw;g.fillStyle=PCOL[j];g.beginPath();g.arc(hx,by,j===i?4.5*u:3.2*u,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=1.3;g.stroke();}
  g.fillStyle='#fff';g.fillRect(bx+bw,by-7*u,1.5,10*u);g.fillStyle=C.white;g.beginPath();g.moveTo(bx+bw,by-7*u);g.lineTo(bx+bw-6*u,by-4.5*u);g.lineTo(bx+bw,by-2*u);g.fill();
  if(p.dead&&p.dead>25)outlined(g,p.pit?'DOWN THE PIT!':'OUCH!',v.x+v.w/2,v.y+v.h*.45,{size:size*1.4,fill:'#fff',stroke:'#000'});
  if(mode==='race'&&p.finished)outlined(g,`${name} REACHED THE CASTLE`,v.x+v.w/2,v.y+v.h*.42,{size:size*1.4,fill:'#ffe23a',stroke:'#000'});
  if(mode==='coins'&&p.inCastle)outlined(g,'COURSE CLEAR! FRESH COINS…',v.x+v.w/2,v.y+v.h*.42,{size:size*1.3,fill:'#ffe23a',stroke:'#000'});
  if(p.area==='main'&&L.warp&&p.grounded&&!p.pipe&&Math.abs(p.y-L.warp.entry.top*T)<.5&&Math.abs(p.x-(L.warp.entry.c+1)*T)<=8&&(frames>>4)%2){const cam=cams[i],sc=v.w/cam.w;outlined(g,'▼',v.x+(L.warp.entry.c+1)*T*sc-cam.x*sc,v.y+(L.warp.entry.top*T-48-cam.y)*sc,{size:size*1.3,fill:'#fff',stroke:'#000'});}
  // touch pad guides
  if(touchUI||clock<6&&phase==='play'){const pd=pads[i],a=touchUI?1:clamp(1-clock/6,0,1);g.save();g.fillStyle='#fff';g.strokeStyle='#fff';g.lineWidth=2;
   const jr=Math.min(v.h*.15,44),jx=v.x+v.w-jr-pad*1.5,jy=v.y+v.h-jr-pad*1.5;g.globalAlpha=(pd.jump?.4:.18)*a;g.beginPath();g.arc(jx,jy,jr,0,7);g.fill();g.globalAlpha=.6*a;outlined(g,'A · JUMP',jx,jy,{size:Math.round(jr*.32),fill:'#fff',stroke:'#000'});
   if(pd.stick){const st=pd.stick;g.globalAlpha=.25;g.beginPath();g.arc(st.sx,st.sy,40,0,7);g.stroke();g.globalAlpha=.4;g.beginPath();g.arc(clamp(st.x,st.sx-44,st.sx+44),clamp(st.y,st.sy-44,st.sy+44),16,0,7);g.fill();}
   else{g.globalAlpha=.16*a;const sx=v.x+v.w*.18,sy=v.y+v.h*.8;g.beginPath();g.arc(sx,sy,Math.min(v.h*.13,40),0,7);g.stroke();g.globalAlpha=.4*a;outlined(g,p.fire?'◀ RUN ▶ · TAP 🔥':'◀ RUN ▶',sx,sy,{size:Math.round(size*.75),fill:'#fff',stroke:'#000'});}
   g.restore();}
 }
 function drawTitle(t){
  const W=s.W,H=s.H,a=t>2.0?Math.max(0,1-(t-2.0)/.45):1;g.save();g.globalAlpha=a;g.fillStyle='#000';g.fillRect(0,0,W,H);
  const size=Math.min(W*.07,H*.06,40);g.font=`900 ${size}px "Courier New",ui-monospace,monospace`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText('WORLD 1-1',W/2,H*.3);
  for(let i=0;i<2;i++){const cx=W/2+(i?1:-1)*Math.min(W*.22,150),cy=H*.5;s.sprite(g,i,cx,cy,size*2.2,{exact:true,mood:'happy'});g.font=`900 ${size*.55}px "Courier New",ui-monospace,monospace`;g.fillStyle=PCOL[i];g.fillText(s.players[i].name.toUpperCase().slice(0,12),cx,cy+size*1.6);}
  g.font=`900 ${size*.45}px "Courier New",ui-monospace,monospace`;g.fillStyle='#ffe23a';g.fillText(mode==='coins'?'COIN RUSH · MOST COINS IN 60 SECONDS':'CASTLE DASH · FIRST TO THE FLAGPOLE',W/2,H*.72);
  g.restore();
 }
 const teleport=(i,X)=>{const q=pl[i];let cc=Math.floor(X/T);while(cc<L.W-1&&!(worlds[i].tiles[13*S+cc]&&!worlds[i].tiles[12*S+cc]&&!worlds[i].tiles[11*S+cc]))cc++;
  Object.assign(q,{x:cc*T+8,y:13*T,prevY:13*T,vx:0,vy:0,grounded:true,area:'main',pipe:null,flag:null,dead:0,pit:false,tf:null});q.best=Math.max(q.best,q.x);cams[i].x=Math.max(0,q.x-120);};
 s.debug={log,get phase(){return phase;},get clock(){return clock;},pl,L,worlds,setClock(v){clock=v;},teleport,
  toWarp(i){const q=pl[i],e=L.warp.entry;Object.assign(q,{x:(e.c+1)*T,y:e.top*T,prevY:e.top*T,vx:0,vy:0,grounded:true,area:'main',pipe:null,dead:0,pit:false,tf:null});cams[i].x=Math.max(0,q.x-120);}};
 // ---------------- main loop
 s.frame((dt,t)=>{
  if(!s.alive)return;
  if(phase==='title'){titleT+=dt;if(titleT>2.45)phase='count';}
  else if(phase==='count'){if(!cd.update(dt)){phase='play';for(const inp of inputs){inp.press=0;inp.bPress=0;}}}
  else if(phase==='play'||phase==='end'){
   if(!cd.done)cd.update(dt);acc+=dt;let steps=0;
   while(acc>=STEP&&steps<5){acc-=STEP;steps++;frames++;simT+=STEP;
    if(phase==='play')clock+=STEP;
    for(let i=0;i<2;i++){const p=pl[i],w=worlds[i];readInput(i);stepPlayer(p,w,inputs[i]);interact(p,w,inputs[i]);stepWorld(worlds[i],p);updateCamera(p,i);
     if(mode==='coins'&&p.inCastle&&p.castleT>110&&phase==='play')nextLap(i);}
   }
   if(steps===5)acc=0;
   for(const w of worlds)w.fx.update(dt);for(let i=0;i<2;i++)flash[i]=Math.max(0,flash[i]-dt*1.8);
   if(phase==='play'){
    if(mode==='coins'&&clock>=COIN_TIME){phase='end';endT=0;jingle([523,659,784,1047,1319],{type:'square',vol:.035,step:.1});}
    if(mode==='race'&&(winner>=0||clock>=RACE_CAP)){phase='end';endT=0;if(winner<0){const a=pl[0].best,b=pl[1].best;winner=Math.abs(a-b)<4?-2:a>b?0:1;}}
   }else{endT+=dt;if(endT>3.2){
    if(mode==='coins'){const a=pl[0].coins,b=pl[1].coins;s.finish([a,b],`World 1-1 Coin Rush: ${s.players[0].name} ${a} coins, ${s.players[1].name} ${b} coins.`);}
    else{const prog=q=>q.finished?100:Math.min(99,Math.round(clamp((q.best-L.start)/(L.end-L.start),0,1)*100)),sc=[prog(pl[0]),prog(pl[1])];if(winner>=0){sc[winner]=100;sc[1-winner]=Math.min(sc[1-winner],99);}
     const desc=q=>q.finished?fmtRace(q.finishT):`${prog(q)}% of the way`;s.finish(sc,`World 1-1 Castle Dash: ${s.players[0].name} ${desc(pl[0])}, ${s.players[1].name} ${desc(pl[1])}.`);}
    return;}}
   if(mode==='coins')s.setScores([pl[0].coins,pl[1].coins]);else s.setScores(pl.map(q=>q.finished?100:Math.min(99,Math.round(clamp((q.best-L.start)/(L.end-L.start),0,1)*100))));
  }
  // draw
  g.fillStyle='#000';g.fillRect(0,0,s.W,s.H);
  drawView(0,t);drawView(1,t);
  g.fillStyle='#000';g.fillRect(0,Math.floor(s.H/2)-2,s.W,4);g.fillStyle=C.q;g.fillRect(0,Math.floor(s.H/2)-.5,s.W,1);
  if(phase==='title')drawTitle(titleT);
  if(phase==='count'||!cd.done&&phase==='play')cd.draw(g,s.W,s.H);
  if(phase==='end'&&(mode==='coins'||winner<0||endT>1.4)){const a=Math.min(1,mode==='coins'?endT*3:(endT-1.4)*3);g.save();g.globalAlpha=a;g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,s.H*.4,s.W,s.H*.2);const size=Math.min(s.W*.07,s.H*.07,46);
   let head;if(mode==='coins'){const A=pl[0].coins,B=pl[1].coins;head=A===B?'DEAD HEAT!':`${s.players[A>B?0:1].name.toUpperCase()} WINS!`;}else head=winner===-2?'DEAD HEAT!':winner>=0&&pl[winner].finished?`THANK YOU ${s.players[winner].name.toUpperCase()}!`:`${s.players[winner].name.toUpperCase()} GOT FURTHEST!`;
   outlined(g,head,s.W/2,s.H/2-size*.3,{size,fill:'#ffe23a',stroke:'#000'});
   const sub=mode==='coins'?`${pl[0].coins} COINS  ·  ${pl[1].coins} COINS`:pl.map(q=>q.finished?fmtRace(q.finishT):'—').join('  ·  ');outlined(g,sub,s.W/2,s.H/2+size*.75,{size:size*.5,fill:'#fff',stroke:'#000'});g.restore();}
 });
}
Object.assign(exports,{marioBros,buildLevel});
