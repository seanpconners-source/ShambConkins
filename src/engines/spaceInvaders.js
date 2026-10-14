// Space Invaders (Taito, 1978) remake with a modern neon finish, themed on Mars Attacks!: the classic 5x11 formation
// that ripples one invader at a time (so it speeds up as it thins out), the four-note heartbeat, erodible bunkers,
// three bomb types and the mystery saucer, flown here by a Martian. Your head rides in your cannon's glass dome.
// Modes (s.game.invaderMode): 'turns' (P1 then P2 on the same seed), 'versus' (both cannons at once, most points),
// 'coop' (both cannons, shared lives, clear four waves).
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,keyboard,makeShake}=require("src/engines/tarantinoKit.js");
const {pixText,drawSprite,makeStarfield,scanlines,vignette,fitField,makeBits}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

const SQUID=[['...##...','..####..','.######.','##.##.##','########','..#..#..','.#.##.#.','#.#..#.#'],['...##...','..####..','.######.','##.##.##','########','.#.##.#.','#......#','.#....#.']];
const CRAB=[['..#.....#..','...#...#...','..#######..','.##.###.##.','###########','#.#######.#','#.#.....#.#','...##.##...'],['..#.....#..','#..#...#..#','#.#######.#','###.###.###','###########','.#########.','..#.....#..','.#.......#.']];
const OCTO=[['....####....','.##########.','############','###..##..###','############','...##..##...','..##.##.##..','##........##'],['....####....','.##########.','############','###..##..###','############','..###..###..','.##..##..##.','..##....##..']];
const BOOM=['....#...#....','.#...#.#...#.','..#.......#..','...#.....#...','##.........##','...#.....#...','..#.#...#.#..','.#..#...#..#.'];
const CANNON=['......#......','.....###.....','.....###.....','.###########.','#############','#############','#############','#############'];
const CANNON_BOOM=[['..#....#.#...','.....#....#..','#..#.##..#...','..##.###.#.#.','.###########.','#############'],['#.....#....#.','...#.....#...','.#..#.##...#.','#..####..#..#','.###########.','#############']];
const SAUCER=['.....######.....','...##########...','..############..','.##.##.##.##.##.','################','..###..##..###..','...#........#...'];
const MARTIAN_BRAIN=['..#####..','.#######.','#.#.#.#.#'];
const MARTIAN_FACE=['#########','#..#.#..#','.#######.','..#.#.#..','...###...'];
const SHIELD=['....##############....','...################...','..##################..','.####################.','######################','######################','######################','######################','######################','######################','######################','######################','#######........#######','######..........######','#####............#####','#####............#####'];
const TYPES=[{rows:SQUID,w:8,pts:30,color:'#ff5ad9'},{rows:CRAB,w:11,pts:20,color:'#4fe6ff'},{rows:OCTO,w:12,pts:10,color:'#8dff6a'}];
const ROW_TYPE=[0,1,1,2,2];
const PCOLOR=['#3dff8b','#ff5fae'];
const BEAT=[98,87,78,73];
const MODE_TEXT={turns:'TAKE TURNS',versus:'VERSUS',coop:'CO-OP'};

function makeWorld(seed,mode,humans){
 const rand=seededRandom(seed);const FW=224;
 const w={mode,rand,FW,FH:300,wave:0,time:0,over:false,overReason:'',freeze:0,banner:{text:'WAVE 1',t:1.6},
  cannons:humans.map((p,k)=>({p,x:humans.length>1?(k?FW*.68:FW*.32):FW/2,tx:null,alive:true,respawn:0,invuln:1.2,lives:3,shot:null,firing:false,keyL:false,keyR:false,boom:0})),
  teamLives:6,score:[0,0],kills:[0,0],inv:[],ptr:0,dir:1,dropping:false,edge:false,acc:0,beat:0,bombs:[],fireT:1.4,bombKind:0,shots:0,
  ufo:null,ufoT:16+rand()*8,ufoPts:null,booms:[],shields:[],shieldDirty:true,bits:makeBits(),flash:0};
 return w;
}
function layoutWorld(w){
 const FH=w.FH;w.groundY=FH-10;w.cannonY=FH-27;w.shieldY=FH-62;w.dropStep=Math.round(8*clamp(FH/256,1,1.4));
}
function newWave(w){
 layoutWorld(w);const FH=w.FH,top=Math.round(FH*.11+18)+Math.min(w.wave,4)*Math.round(w.dropStep*.75);w.inv=[];
 for(let r=4;r>=0;r--)for(let c=0;c<11;c++){const t=TYPES[ROW_TYPE[r]];w.inv.push({r,c,t,x:24+c*16,y:top+r*16,alive:true,frame:0});}
 w.ptr=0;w.dir=1;w.dropping=false;w.edge=false;w.acc=0;w.bombs.length=0;w.fireT=1.6;
 w.shields=[43,88,133,178].map(cx=>({x:cx-11,y:w.shieldY,bits:Uint8Array.from(SHIELD.join('').split(''),ch=>ch==='#'?1:0)}));w.shieldDirty=true;
}
const alive=w=>w.inv.filter(i=>i.alive).length;
function erode(w,sh,px,py,r=2.6){
 let hit=false;for(let y=Math.floor(py-r);y<=py+r;y++)for(let x=Math.floor(px-r);x<=px+r;x++){const lx=x-sh.x,ly=y-sh.y;if(lx<0||ly<0||lx>=22||ly>=16)continue;const d=Math.hypot(x-px,y-py);if(d<=r&&(d<r*.55||w.rand()<.6)){if(sh.bits[ly*22+lx])hit=true;sh.bits[ly*22+lx]=0;}}
 w.shieldDirty=true;return hit;
}
function shieldAt(w,px,py){for(const sh of w.shields){const lx=Math.floor(px-sh.x),ly=Math.floor(py-sh.y);if(lx>=0&&ly>=0&&lx<22&&ly<16&&sh.bits[ly*22+lx])return sh;}return null;}

async function galaga(s){
 const mode=s.game.invaderMode||'turns';
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 if(mode!=='turns'){s.shared=true;}if(mode==='coop'){s.cooperative=true;s.cooperativeLabel='DEFEND EARTH';}s.updateScores();
 const stars=makeStarfield(seededRandom(s.seed+':stars'),{count:160,nebula:['#3a1670','#0d3f6e','#6a1238']});const shake=makeShake();
 let w=null,turn=0,running=false,ended=null,shieldCanvas=null;const scores=[0,0];
 const sfx={
  shot(){noise(.09,.05,{type:'bandpass',f0:2400,f1:600,q:1.2});voice(880,.08,.03,'square',{slide:.45});},
  kill(){noise(.16,.07,{type:'bandpass',f0:1800,f1:300,q:.9});voice(260,.12,.04,'square',{slide:.35});},
  die(){noise(.7,.12,{f0:2200,f1:80});voice(140,.6,.06,'sawtooth',{slide:.2,lp:900});},
  ufoHit(){[784,988,1175,1568].forEach((f,i)=>voice(f,.09,.04,'square',{delay:i*.06}));},
  beat(i){voice(BEAT[i%4],.09,.09,'square',{lp:500});},
  wave(){[523,659,784,1046,1319].forEach((f,i)=>voice(f,.12,.045,'square',{delay:i*.07}));}
 };
 // ---------------------------------------------------------------- input
 const fingers=new Map();let L=null;
 const cannonFor=p=>{if(!w)return null;if(w.cannons.length===1)return w.cannons[0];return w.cannons[p.x<s.W/2?0:1];};
 const recount=()=>{if(!w)return;for(const cn of w.cannons)cn.firing=[...fingers.values()].some(f=>f===cn);};
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!w||!L)return;ev.preventDefault();const p=s.pointer(ev),cn=cannonFor(p);if(!cn)return;fingers.set(ev.pointerId,cn);s.capture(ev);cn.tx=L.toField(p.x,p.y).x;recount();});
 s.on(c,'pointermove',ev=>{const cn=fingers.get(ev.pointerId);if(!cn||s.paused||!L)return;ev.preventDefault();const p=s.pointer(ev);cn.tx=L.toField(p.x,p.y).x;});
 for(const t of ['pointerup','pointercancel'])s.on(c,t,ev=>{const cn=fingers.get(ev.pointerId);fingers.delete(ev.pointerId);s.release(ev);if(cn){cn.tx=null;recount();}});
 const keyCannon=i=>!w?null:w.cannons.length===1?w.cannons[0]:w.cannons[i];
 const keyFire=[false,false];
 keyboard(s,(i,name,down)=>{const cn=keyCannon(i);if(!cn)return;if(name==='l')cn.keyL=down;if(name==='r')cn.keyR=down;if(name==='act'){keyFire[i]=down;cn.keyFire=down;}});
 s.resetOnPause(()=>{fingers.clear();if(w)for(const cn of w.cannons){cn.firing=false;cn.keyL=cn.keyR=cn.keyFire=false;cn.tx=null;}});
 s.hint('Drag anywhere on your side to slide your cannon; it fires whenever your finger is down (one shot in the air at a time, like the arcade). Bunkers soak up fire from both sides. Keys: P1 A/D + Space, P2 ←/→ + Enter.');

 // ---------------------------------------------------------------- simulation
 function killCannon(cn){if(!cn.alive||cn.invuln>0)return;cn.alive=false;cn.boom=1.2;cn.shot=null;sfx.die();shake.kick(10);vibrate(40);w.flash=.5;s.react?.(cn.p,'sad',1.6);
  if(w.mode==='coop'){w.teamLives--;cn.respawn=w.teamLives>0?1.8:0;}else{cn.lives--;cn.respawn=cn.lives>0?1.8:0;}
  if(w.mode==='turns')w.freeze=1.2;}
 function award(cn,pts,px,py,color){w.score[cn.p]+=pts;w.kills[cn.p]++;if(w.mode!=='turns')scores[cn.p]=w.score[cn.p];}
 function stepInvaders(dt){
  const n=alive(w);if(!n)return;
  const rate=60*(w.mode==='coop'?1.12:w.mode==='versus'?1.06:1)*(1+w.wave*.1);
  w.acc+=dt*rate;let guard=0;
  while(w.acc>=1&&guard++<200){w.acc-=1;
   // find the next living invader in bottom-left -> top-right order
   let k=0;while(k<w.inv.length&&!w.inv[w.ptr]?.alive){w.ptr++;if(w.ptr>=w.inv.length){endSweep();w.ptr=0;}k++;}
   const iv=w.inv[w.ptr];if(!iv?.alive)break;
   iv.frame^=1;if(w.dropping)iv.y+=w.dropStep;else iv.x+=2*w.dir;
   const cx=iv.x+8,hw=iv.t.w/2;if(!w.dropping&&((w.dir<0&&cx-hw<=4)||(w.dir>0&&cx+hw>=w.FW-4)))w.edge=true;
   if(iv.y+8>=w.cannonY){w.over=true;w.overReason='invaded';}
   for(const sh of w.shields)if(iv.y+8>sh.y&&iv.y<sh.y+16&&cx+hw>sh.x&&cx-hw<sh.x+22){for(let yy=Math.max(iv.y,sh.y);yy<Math.min(iv.y+8,sh.y+16);yy++)for(let xx=Math.floor(cx-hw);xx<cx+hw;xx++){const lx=xx-sh.x,ly=yy-sh.y;if(lx>=0&&lx<22&&ly>=0&&ly<16)sh.bits[ly*22+lx]=0;}w.shieldDirty=true;}
   w.ptr++;if(w.ptr>=w.inv.length){endSweep();w.ptr=0;}
  }
 }
 function endSweep(){if(w.dropping){w.dropping=false;w.dir*=-1;}else if(w.edge)w.dropping=true;w.edge=false;sfx.beat(w.beat++);}
 function stepBombs(dt){
  const n=alive(w);w.fireT-=dt;
  const maxB=(w.cannons.length>1?4:3)+Math.min(2,Math.floor(w.wave/2));
  if(n&&w.fireT<=0&&w.bombs.length<maxB){
   w.fireT=clamp(1.05-w.wave*.09,.32,1.05)*(.45+.55*n/55)/(w.cannons.length>1?1.35:1);
   const cols=[...new Set(w.inv.filter(i=>i.alive).map(i=>i.c))];let col;
   const liveCannons=w.cannons.filter(cn=>cn.alive);
   if(w.shots++%3===0&&liveCannons.length){const cn=liveCannons[Math.floor(w.rand()*liveCannons.length)];col=cols.reduce((b,cc)=>{const iv=w.inv.find(i=>i.alive&&i.c===cc);return Math.abs(iv.x+8-cn.x)<Math.abs(w.inv.find(i=>i.alive&&i.c===b).x+8-cn.x)?cc:b;},cols[0]);}
   else col=cols[Math.floor(w.rand()*cols.length)];
   const shooter=w.inv.filter(i=>i.alive&&i.c===col).sort((a,b)=>b.y-a.y)[0];
   if(shooter)w.bombs.push({x:shooter.x+8,y:shooter.y+9,kind:w.bombKind++%3,t:0,v:72+w.wave*7+(w.mode==='coop'?8:0)});
  }
  for(const b of w.bombs){b.t+=dt;b.y+=b.v*dt;
   const sh=shieldAt(w,b.x,b.y+3);if(sh){erode(w,sh,b.x,b.y+3,2.8);b.dead=true;w.bits.burst(b.x,b.y+3,{n:6,speed:30,color:'#7dff9a',life:.35,size:1});continue;}
   for(const cn of w.cannons)if(cn.alive&&cn.invuln<=0&&Math.abs(b.x-cn.x)<6.5&&b.y+3>=w.cannonY+1&&b.y<w.cannonY+8){b.dead=true;killCannon(cn);w.bits.burst(cn.x,w.cannonY+4,{n:28,speed:80,color:PCOLOR[cn.p],life:.9,size:1.6});}
   if(b.y>w.groundY){b.dead=true;w.bits.burst(b.x,w.groundY,{n:5,speed:25,color:'#ff7a5a',life:.3,size:1});}
  }
  w.bombs=w.bombs.filter(b=>!b.dead);
 }
 function stepCannons(dt){
  for(const cn of w.cannons){
   if(cn.boom>0)cn.boom-=dt;cn.invuln=Math.max(0,cn.invuln-dt);
   if(!cn.alive){if(cn.respawn>0){cn.respawn-=dt;if(cn.respawn<=0){cn.alive=true;cn.invuln=1.6;cn.x=clamp(cn.x,10,w.FW-10);}}continue;}
   const key=(cn.keyR?1:0)-(cn.keyL?1:0),sp=150;
   if(key)cn.x+=key*sp*dt;else if(cn.tx!==null){const d=cn.tx-cn.x;cn.x+=clamp(d,-sp*dt*1.4,sp*dt*1.4);}
   cn.x=clamp(cn.x,8,w.FW-8);
   if((cn.firing||cn.keyFire)&&!cn.shot){cn.shot={x:cn.x,y:w.cannonY-2};sfx.shot();}
   const sh=cn.shot;if(!sh)continue;sh.y-=300*dt;
   // shot vs bombs, invaders, saucer, bunkers, sky
   for(const b of w.bombs)if(!b.dead&&Math.abs(b.x-sh.x)<3&&Math.abs(b.y+3-sh.y)<6){b.dead=true;cn.shot=null;w.bits.burst(sh.x,sh.y,{n:8,speed:40,color:'#fff',life:.3,size:1});break;}
   if(!cn.shot)continue;
   let hit=null;for(const iv of w.inv)if(iv.alive&&Math.abs(iv.x+8-sh.x)<=iv.t.w/2+.5&&sh.y<=iv.y+8&&sh.y+5>=iv.y){hit=iv;break;}
   if(hit){hit.alive=false;cn.shot=null;award(cn,hit.t.pts);w.booms.push({x:hit.x+8,y:hit.y,t:.28,color:hit.t.color});w.bits.burst(hit.x+8,hit.y+4,{n:16,speed:70,color:hit.t.color,life:.55,size:1.3});sfx.kill();shake.kick(2);if(w.mode!=='turns')s.react?.(cn.p,'happy',.4);continue;}
   if(w.ufo&&!w.ufo.dead&&Math.abs(w.ufo.x-sh.x)<8&&Math.abs(w.ufo.y+3-sh.y)<5){const pts=[50,100,150,100,50,300,100,150][Math.floor(w.rand()*8)];w.ufo.dead=true;w.ufoPts={x:w.ufo.x,y:w.ufo.y,pts,t:1.4};award(cn,pts);cn.shot=null;w.bits.burst(w.ufo.x,w.ufo.y+3,{n:36,speed:90,color:'#ff3b5c',life:.9,size:1.6});sfx.ufoHit();shake.kick(6);s.react?.(cn.p,'win',1.2);continue;}
   const shd=shieldAt(w,sh.x,sh.y);if(shd){erode(w,shd,sh.x,sh.y,2.2);cn.shot=null;w.bits.burst(sh.x,sh.y,{n:5,speed:30,color:'#7dff9a',life:.3,size:1});continue;}
   if(sh.y<12){cn.shot=null;w.bits.burst(sh.x,12,{n:6,speed:30,color:'#ff5a5a',life:.3,size:1});}
  }
 }
 function stepUfo(dt){
  if(w.ufoPts){w.ufoPts.t-=dt;if(w.ufoPts.t<=0)w.ufoPts=null;}
  if(w.ufo){w.ufo.x+=w.ufo.dir*42*dt;w.ufo.t+=dt;if(Math.floor(w.ufo.t*8)!==Math.floor((w.ufo.t-dt)*8))voice(w.ufo.t*8%2<1?620:540,.11,.018,'sine');if(w.ufo.dead||w.ufo.x<-20||w.ufo.x>w.FW+20)w.ufo=null;return;}
  w.ufoT-=dt;if(w.ufoT<=0&&alive(w)>=8){const dir=w.rand()<.5?1:-1;w.ufo={x:dir>0?-16:w.FW+16,y:24,dir,t:0};w.ufoT=18+w.rand()*10;}
 }
 function step(dt){
  w.time+=dt;w.flash=Math.max(0,w.flash-dt*2);shake.step(dt);w.bits.step(dt);
  for(const b of w.booms)b.t-=dt;w.booms=w.booms.filter(b=>b.t>0);
  if(w.banner){w.banner.t-=dt;if(w.banner.t<=0)w.banner=null;}
  if(w.over)return;
  if(w.freeze>0){w.freeze-=dt;stepCannons(dt);return;}
  if(!w.banner||w.banner.t<1)stepInvaders(dt);
  stepBombs(dt);stepCannons(dt);stepUfo(dt);
  if(!alive(w)&&!w.banner){w.wave++;if(w.mode==='coop'&&w.wave>=4){w.over=true;w.overReason='saved';return;}w.banner={text:`WAVE ${w.wave+1}`,t:1.8};sfx.wave();for(const cn of w.cannons)award(cn,50);newWave(w);}
  const out=w.mode==='coop'?w.teamLives<=0&&w.cannons.every(cn=>!cn.alive):w.cannons.every(cn=>!cn.alive&&cn.respawn<=0);
  if(out&&w.cannons.every(cn=>cn.boom<=0)){w.over=true;w.overReason='lives';}
  if(w.time>=w.cap){w.over=true;w.overReason='time';}
 }

 // ---------------------------------------------------------------- drawing
 function shieldImage(res){
  if(!w.shieldDirty&&shieldCanvas&&shieldCanvas.res===res)return shieldCanvas;
  const pad=3;shieldCanvas=document.createElement('canvas');shieldCanvas.res=res;shieldCanvas.width=(w.FW+pad*2)*res;shieldCanvas.height=(16+pad*2)*res;const g=shieldCanvas.getContext('2d');
  const paint=()=>{for(const sh of w.shields)for(let y=0;y<16;y++)for(let xx=0;xx<22;xx++)if(sh.bits[y*22+xx])g.fillRect((sh.x+xx+pad)*res,(y+pad)*res,res,res);};
  g.fillStyle='#45ff86';g.shadowColor='#45ff86';g.shadowBlur=res*2.2;paint();g.shadowBlur=0;paint();w.shieldDirty=false;return shieldCanvas;
 }
 function drawBomb(b){const f=Math.floor(b.t*12)%4;x.fillStyle='#fff';x.shadowColor='#ff8f6a';x.shadowBlur=4;
  if(b.kind===0){for(let i=0;i<7;i++){const o=((i+f)%4<2)?-1:0;x.fillRect(b.x+o,b.y+i-3,1,1);x.fillRect(b.x+o+1,b.y+i-3,1,1);}}
  else if(b.kind===1){x.fillRect(b.x,b.y-3,1,7);const yy=b.y-3+(f%3)*2;x.fillRect(b.x-1,yy,3,1);}
  else{x.fillRect(b.x,b.y-3,1,7);x.fillRect(b.x+(f%2?1:-1),b.y-1+(f%2),1,2);}
  x.shadowBlur=0;}
 function draw(){
  const W=s.W,H=s.H;L=fitField(W,H,224,{minH:256,maxH:400,top:52,bottom:6});
  if(w.FH!==L.FH){const old=w.FH;w.FH=L.FH;layoutWorld(w);const dy=w.FH-old;for(const iv of w.inv)iv.y+=dy*.5;for(const sh of w.shields)sh.y=w.shieldY;w.shieldDirty=true;}
  x.setTransform(1,0,0,1,0,0);stars.draw(x,W,H,w.time,{drift:.4});
  const k=L.scale,res=clamp(Math.round(k),1,8);let ox=L.ox,oy=L.oy;if(shake.mag>.3){ox+=(Math.random()-.5)*shake.mag;oy+=(Math.random()-.5)*shake.mag;}
  // ground glow strip across the whole screen
  const gy=oy+w.groundY*k;x.fillStyle='#45ff8622';x.fillRect(0,gy-2,W,4);x.fillStyle='#45ff86';x.fillRect(0,gy,W,Math.max(1,k*.8));
  x.setTransform(k,0,0,k,ox,oy);
  // cabinet edges on wide screens
  if(L.ox>12){x.fillStyle='#ffffff10';x.fillRect(-2,0,.6,w.groundY);x.fillRect(w.FW+1.4,0,.6,w.groundY);}
  // HUD
  const two=w.cannons.length>1,hs=1.15;
  const label=i=>two?`SCORE<${i+1}>`:`SCORE<${w.cannons[0].p+1}>`;
  pixText(x,two?label(0):`SCORE<${turn+1}>`,6,3,hs*.9,'#ffffffcc');pixText(x,String(two?w.score[0]:w.score[w.cannons[0].p]).padStart(4,'0'),6,12,hs,two?PCOLOR[0]:'#fff',{glow:6});
  pixText(x,w.mode==='coop'?'TEAM':'WAVE',w.FW/2,3,hs*.9,'#ffffffcc',{align:'center'});pixText(x,w.mode==='coop'?String(w.score[0]+w.score[1]).padStart(5,'0'):String(w.wave+1),w.FW/2,12,hs,'#ffd23f',{align:'center',glow:6});
  if(two){pixText(x,label(1),w.FW-6,3,hs*.9,'#ffffffcc',{align:'right'});pixText(x,String(w.score[1]).padStart(4,'0'),w.FW-6,12,hs,PCOLOR[1],{align:'right',glow:6});}
  else{const other=1-w.cannons[0].p;pixText(x,`SCORE<${other+1}>`,w.FW-6,3,hs*.9,'#ffffff77',{align:'right'});pixText(x,turn===0?'----':String(scores[other]).padStart(4,'0'),w.FW-6,12,hs,'#ffffff88',{align:'right'});}
  // saucer + Martian pilot
  if(w.ufo&&!w.ufo.dead){const u=w.ufo;drawSprite(x,MARTIAN_BRAIN,u.x-4.5,u.y-7,1,'#ff9ad5',{glow:res*3});drawSprite(x,MARTIAN_FACE,u.x-4.5,u.y-4,1,'#9dff7a',{glow:res*2});x.fillStyle='#bfe8ff33';x.beginPath();x.ellipse(u.x,u.y-2,7,5.5,0,Math.PI,0);x.fill();drawSprite(x,SAUCER,u.x-8,u.y,1,'#ff3b5c',{glow:res*4});}
  if(w.ufoPts){pixText(x,String(w.ufoPts.pts),w.ufoPts.x,w.ufoPts.y,1,'#ff3b5c',{align:'center',glow:6,alpha:clamp(w.ufoPts.t*2,0,1)});}
  // invaders
  for(const iv of w.inv)if(iv.alive)drawSprite(x,iv.t.rows[iv.frame],iv.x+8-iv.t.w/2,iv.y,1,iv.t.color,{glow:res*3});
  for(const b of w.booms)drawSprite(x,BOOM,b.x-6.5,b.y,1,b.color,{glow:res*3,alpha:clamp(b.t*5,0,1)});
  // bunkers
  const sc=shieldImage(res);x.imageSmoothingEnabled=false;x.drawImage(sc,-3,w.shieldY-3,w.FW+6,22);
  // shots & bombs
  for(const cn of w.cannons)if(cn.shot){x.fillStyle=PCOLOR[cn.p]+'55';x.fillRect(cn.shot.x-.5,cn.shot.y,1,10);x.fillStyle='#fff';x.shadowColor=PCOLOR[cn.p];x.shadowBlur=6;x.fillRect(cn.shot.x-.5,cn.shot.y,1,4);x.shadowBlur=0;}
  for(const b of w.bombs)drawBomb(b);
  w.bits.draw(x);
  // cannons with heads in glass domes
  for(const cn of w.cannons){const cy=w.cannonY;
   if(!cn.alive){if(cn.boom>0)drawSprite(x,CANNON_BOOM[Math.floor(cn.boom*10)%2],cn.x-6.5,cy+2,1,PCOLOR[cn.p],{glow:res*3});continue;}
   const blink=cn.invuln>0&&Math.sin(w.time*30)<0?.35:1;
   x.globalAlpha=blink;x.fillStyle='#bfe8ff22';x.strokeStyle='#bfe8ff66';x.lineWidth=.5;x.beginPath();x.arc(cn.x,cy-4,9.5,Math.PI,0);x.fill();x.stroke();
   s.sprite(x,cn.p,cn.x,cy-7,19,{exact:true});x.globalAlpha=1;
   drawSprite(x,CANNON,cn.x-6.5,cy,1,PCOLOR[cn.p],{glow:res*3,alpha:blink});
  }
  // lives row under the ground line
  const ly=w.groundY+2.5;
  if(w.mode==='coop'){pixText(x,String(Math.max(0,w.teamLives)),6,ly,.9,'#fff');for(let i=0;i<Math.min(5,w.teamLives-1);i++)drawSprite(x,CANNON,14+i*15,ly,.55,'#45ff86');}
  else w.cannons.forEach((cn,j)=>{const right=two&&j===1,lx=right?w.FW-6:6;pixText(x,String(Math.max(0,cn.lives)),lx,ly,.9,PCOLOR[cn.p],{align:right?'right':'left'});for(let i=0;i<Math.max(0,cn.lives-1);i++)drawSprite(x,CANNON,right?lx-20-i*10:lx+8+i*10,ly,.55,PCOLOR[cn.p]);});
  if(w.cap<9999){const left=Math.max(0,Math.ceil(w.cap-w.time));pixText(x,`TIME ${left}`,w.FW/2,ly,.9,left<=10?'#ff5a5a':'#ffffffaa',{align:'center'});}
  // banners
  if(w.banner)pixText(x,w.banner.text,w.FW/2,w.FH*.45,2.2,'#ffd23f',{align:'center',glow:10,alpha:clamp(w.banner.t*2,0,1)});
  if(w.over&&ended){pixText(x,ended,w.FW/2,w.FH*.42,2,'#ff5ad9',{align:'center',glow:10});}
  x.setTransform(1,0,0,1,0,0);
  if(w.flash>0){x.fillStyle=`rgba(255,80,80,${w.flash*.25})`;x.fillRect(0,0,W,H);}
  scanlines(x,W,H,.16);vignette(x,W,H,.5);
 }

 // ---------------------------------------------------------------- flow
 s.frame(dt=>{if(!w)return;if(running)step(dt);draw();s.setScores(mode==='turns'?scores.map((v,i)=>w.cannons[0].p===i?w.score[i]:v):[w.score[0],w.score[1]]);
  s.debug={engine:'galaga',mode,world:w,turn,scores,fingers};
  if(running&&w.over&&!ended){ended=w.overReason==='saved'?'EARTH SAVED!':w.overReason==='invaded'?'INVADED!':w.overReason==='time'?'TIME UP':'GAME OVER';if(w.overReason==='saved')sfx.wave();setTimeout(()=>{running=false;roundDone?.();},1600);}
 });
 let roundDone=null;
 const play=world=>new Promise(res=>{w=world;layoutWorld(w);newWave(w);ended=null;running=true;roundDone=res;});
 const caps={turns:75,versus:90,coop:9999};
 if(mode==='turns'){
  for(turn=0;turn<2;turn++){
   const world=makeWorld(s.seed+':invaders',mode,[turn]);world.cap=caps.turns;w=world;layoutWorld(w);newWave(w);
   if(!await s.pass(turn,turn===0?`Space Invaders, Martian edition. ${s.players[0].name} goes first: drag to move, hold to fire. Three cannons and ${caps.turns} seconds, then ${s.players[1].name} faces the identical invasion.`:`${s.players[1].name}, same invasion. Beat ${scores[0]}.`,'Ready — start my countdown',{countdown:3,summary:turn?`${s.players[0].name} scored ${scores[0]}.`:null}))return;
   await play(world);if(!s.alive)return;scores[turn]=w.score[turn];s.setScores(scores);
  }
  s.finish(scores,`Space Invaders · ${scores[0]} vs ${scores[1]}`);
 }else{
  const world=makeWorld(s.seed+':invaders-'+mode,mode,[0,1]);world.cap=caps[mode];w=world;layoutWorld(w);newWave(w);
  const intro=mode==='versus'?`Both cannons at once. ${s.players[0].name} touches the left half, ${s.players[1].name} the right; drag to move, hold to fire. Every kill is yours. Three cannons each, ${caps.versus} seconds. Most points wins.`:`Defend Earth together: ${s.players[0].name} left, ${s.players[1].name} right. Six cannons shared between you. Clear four waves before the Martians land.`;
  if(!await s.pass(0,intro,mode==='versus'?'Both ready — fight!':'Both ready — defend!',{countdown:3}))return;
  await play(world);if(!s.alive)return;
  const sc=[w.score[0],w.score[1]];
  if(mode==='coop'){const won=w.overReason==='saved',total=sc[0]+sc[1];s.teamResult={kind:'survival',won,tied:false,humanTotal:total,cpuTotal:0,cpuScores:[0,0],duration:Math.floor(w.time)};s.finish(sc,`${won?'Earth is saved!':'The Martians landed.'} Space Invaders co-op · wave ${Math.min(4,w.wave+1)} · ${total} team points.`);}
  else s.finish(sc,`Space Invaders versus · ${sc[0]} vs ${sc[1]}`);
 }
}
Object.assign(exports,{galaga,makeWorld,MODE_TEXT});
