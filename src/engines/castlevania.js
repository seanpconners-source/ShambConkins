// Castlevania · NES-style castle run. Played in turns on the full screen like the Mario engine: P1 whips through the
// seeded castle first, then P2 runs the same castle with P1's recorded ghost alongside (each player has their own
// candles, monsters and pickups). Simon-style controls: walk, committed jumps (a little air steering), the delayed whip
// (leather → short chain → long chain), up + attack for the sub-weapon (dagger, axe, holy water, cross, stopwatch; they
// cost hearts), diagonal stairs you climb with up/down, knockback when hit. Candles drop hearts, whip upgrades and
// sub-weapons; cracked blocks hide pot roast. Monsters: zombies, bats, Medusa heads, bone-throwing skeletons; the race
// ends with the Phantom Bat and its magic crystal. Modes: 'boss' (fastest to beat the Phantom Bat) and 'hearts' (most
// hearts after 60 s; the exit door sends you round the castle again with fresh candles). Everything is drawn
// procedurally in an NES-like palette; no ROM art and no Konami music.
// Online (s.online) both hunters run the castle AT ONCE, each on their own phone (P1 Simon, P2 in Richter blue), the
// partner drawn from snapshots with an edge arrow when off screen. Candles {cd}, cracked walls {wb} and placed monsters
// {fk} one of you destroys are gone for both (the drops go to whoever did it). 'boss' = co-op: a hunter who dies comes
// back next to the partner, player 1's phone runs the Phantom Bat (the other sends hits {bh}), a straggler is pulled into
// the arena, the bat's +3000 goes to both, everyone who grabs a crystal finishes, the other gets 10 s, highest score wins.
// 'hearts' = both in the same 60 s; most hearts wins. Both phones swap finals {fin}.
const {clamp,seededRandom}=require("src/utils.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {Fx,arenaTouch,snd,noise,jingle,outlined,PCOL,Countdown,settle}=require("src/engines/arenaKit.js");
const {netField}=require("src/engines/netField.js");
const {partnerArrow}=require("src/engines/partnerArrow.js");
const NET_GRACE=10;

const STEP=1/60,T=16,ROWS=12,FL=10,HUDH=44,MAXC=420; // tile size, rows, floor row, HUD height (logical px), column stride
const STONE=1,BLOCK=2,CRACK=3;
const WALK=1.15,JUMPV=4.1,GRAV=.2,MAXFALL=4.5,HP=16,HUNT_TIME=60,RACE_CAP=180;
const N={white:'#fcfcfc',lgray:'#bcbcbc',gray:'#7c7c7c',dgray:'#3c3c3c',red:'#d82800',dred:'#881400',orange:'#fc7460',peach:'#fcbcb0',skin2:'#c8846c',
 brown:'#503000',tan:'#ac7c00',gold:'#f8b800',cream:'#fce0a8',dblue:'#0000bc',sky:'#3cbcfc',green:'#00a800',dgreen:'#005800',lime:'#b8f818',plum:'#940084'};
const PALS=[{armor:'#c84c0c',light:'#fc9838',dark:'#503000',boots:'#881400',belt:N.gold,band:N.red},{armor:'#3c7cfc',light:'#a4c8fc',dark:'#0000bc',boots:'#503000',belt:N.white,band:N.white}];
const FLASH_PAL={armor:N.white,light:N.gold,dark:N.tan,boots:N.gold,belt:N.white,band:N.gold};
const SUBS={dagger:1,axe:1,holy:1,cross:1,watch:5}; // heart cost
const BAT_HP=12; // the Phantom Bat: hovers low enough for a jumping whip, swoops with a warning shiver
const WHIP_LEN=[0,30,30,46],WHIP_DMG=[0,1,2,2],PTS={zombie:100,bat:200,medusa:300,skeleton:300};

// ------------------------------------------------------------------ level generation (seeded, shared by both players)
function buildCastle(rand,mode){
 const tiles=new Uint8Array(MAXC*ROWS),bg=new Array(MAXC).fill('hall');
 const L={tiles,bg,candles:[],foes:[],stairs:[],zones:[],decor:[],checks:[],hidden:new Map(),W:0,start:40,end:0,arena:null,exitX:0,lapX:0};
 const pick=a=>a[Math.floor(rand()*a.length)];
 const set=(cc,r,t)=>{if(cc>=0&&cc<MAXC&&r>=0&&r<ROWS)tiles[r*MAXC+cc]=t;};
 let c=0,theme='hall';
 const floor=n=>{for(let k=0;k<n;k++){set(c,FL,STONE);set(c,FL+1,STONE);bg[c]=theme;c++;}};
 const gap=n=>{for(let k=0;k<n;k++){bg[c]=theme;c++;}};
 const blocks=(cc,r,w,h=1,t=BLOCK)=>{for(let x=0;x<w;x++)for(let y=0;y<h;y++)set(cc+x,r+y,t);};
 const candle=(cc,y,kind='candle')=>L.candles.push({x:cc*T+8,y,kind});
 const foe=(type,cc,y=FL*T)=>L.foes.push({type,x:cc*T+8,y});
 const stair=(cc,row,h,dir)=>L.stairs.push({bx:cc*T+8,by:row*T,dir,len:h*T});
 const zone=(kind,c0,c1)=>L.zones.push({kind,x0:c0*T,x1:c1*T,every:kind==='medusa'?[110,160]:[80,130]});
 const deco=(type,cc,o={})=>L.decor.push({type,x:cc*T,...o});
 const CY=FL*T-24; // whip height of a player standing on the floor
 const seg={
  // the courtyard and the castle gate, like the start of the 1986 game
  yard(){theme='yard';const c0=c;floor(20);theme='gate';floor(4);for(const k of [3,10,17])candle(c0+k,FL*T-30,'brazier');
   deco('moon',c0+3);deco('far',c0+7);for(const k of [1,6,13])deco('tree',c0+k);deco('fence',c0,{w:20});deco('gate',c0+20);L.start=c0*T+24;},
  hall(){theme='hall';const c0=c;floor(18);for(const k of [3,8,13])candle(c0+k,CY);deco('window',c0+1);deco('curtain',c0+5);deco('window',c0+10);deco('curtain',c0+14);zone('zombie',c0,c0+18);},
  // a staircase up to a long balcony; the floor underneath is the other way through
  stairs(){theme='gallery';const c0=c;floor(22);stair(c0+3,FL,4,1);blocks(c0+7,FL-4,11);candle(c0+9,(FL-4)*T-24);candle(c0+14,(FL-4)*T-24);candle(c0+12,CY);
   foe('bat',c0+19,5*T+4);for(const k of [1,12,19])deco('painting',c0+k);},
  pit(){theme='hall';const c0=c;floor(5);gap(2);floor(4);blocks(c0+8,FL-1,2);gap(2);floor(7);candle(c0+2,CY);candle(c0+9,(FL-1)*T-24);candle(c0+16,CY);
   deco('window',c0+2);deco('window',c0+15);zone('medusa',c0,c0+20);},
  crypt(){theme='crypt';const c0=c;floor(20);blocks(c0+5,FL-1,3);blocks(c0+8,FL-2,5,2);foe('skeleton',c0+10,(FL-2)*T);candle(c0+3,CY);candle(c0+11,(FL-2)*T-24);
   blocks(c0+16,FL-2,1,2,CRACK);L.hidden.set((FL-2)*MAXC+c0+16,rand()<.75?'roast':'bag');candle(c0+18,CY);deco('chains',c0+2);deco('chains',c0+14);},
  // stepping stones over a bottomless gap, with a bat waiting above
  ledges(){theme='gallery';const c0=c;floor(4);gap(12);blocks(c0+6,FL-1,2);blocks(c0+10,FL-1,2);blocks(c0+13,FL-1,2);floor(4);foe('bat',c0+12,4*T);candle(c0+10,(FL-1)*T-24);candle(c0+18,CY);
   deco('painting',c0+1);deco('painting',c0+17);},
  boss(){theme='boss';floor(2);const a0=c;floor(16);L.arena={x0:a0*T,x1:c*T,cx:(a0+8)*T};deco('bigwindow',a0+6);candle(a0+2,CY,'arena');candle(a0+14,CY,'arena');},
  exit(){theme='hall';const c0=c;floor(9);L.exitX=(c0+5)*T+8;deco('door',c0+5);deco('window',c0+1);}
 };
 seg.yard();L.checks.push(L.start);L.lapX=c*T+24;
 const rest=['stairs','pit','crypt','ledges'];for(let k=rest.length-1;k>0;k--){const j=Math.floor(rand()*(k+1));[rest[k],rest[j]]=[rest[j],rest[k]];}
 const order=['hall',...rest];if(mode==='boss')order.push(pick(['hall','stairs']));
 for(const k of order){L.checks.push(c*T+24);seg[k]();}
 L.checks.push(c*T+24);if(mode==='boss'){seg.boss();L.end=L.arena.x0+48;}else{seg.exit();L.end=L.exitX;}
 L.W=c;
 // what each candle holds: two whip upgrades early, a sub-weapon soon after, hearts otherwise
 const subs=['dagger','axe','holy','cross','watch'];let whips=0;
 L.candles.forEach((cd,k)=>{let it;if(cd.kind==='arena'){cd.kind='candle';cd.item=k%2?'axe':'bigheart';return;}if(k===0||k===4&&whips<2)it='whip';else{const r=rand();it=r<.15?pick(subs):r<(mode==='hearts'?.42:.26)?'bigheart':r<.32?'bag':'heart';}if(it==='whip')whips++;cd.item=it;});
 if(!L.candles.slice(1,6).some(cd=>subs.includes(cd.item)))L.candles[2].item=pick(['dagger','axe','cross']);
 return L;
}

// ------------------------------------------------------------------ per-player world state
function spawnFoe(e){return {...e,alive:true,active:false,hp:e.type==='skeleton'?2:1,vx:0,vy:0,t:0,inv:0,home:e.x,baseY:e.y,state:'idle',throwT:80,dir:1};}
function makeWorld(L,seed){return {tiles:L.tiles.slice(),hidden:new Map(L.hidden),candles:L.candles.map(cd=>({...cd,alive:true})),foes:L.foes.map(spawnFoe),items:[],shots:[],eshots:[],flames:[],
 zoneT:L.zones.map(()=>50),freeze:0,locked:false,boss:null,crystal:false,fx:new Fx(),rng:seededRandom(seed)};}
function makePlayer(i,L,mode){return {i,x:L.start,y:FL*T,vx:0,vy:0,grounded:true,jumped:false,facing:1,crouch:false,stair:null,whip:null,lvl:1,sub:null,hearts:mode==='hearts'?0:5,
 hp:HP,inv:0,hurt:false,dead:0,pit:false,best:L.start,finished:false,finishT:0,score:0,anim:0,lap:0,deaths:0,flash:0,throwT:0};}

// ------------------------------------------------------------------ the game
async function castlevania(s){
 const mode=s.game.cvMode==='hearts'?'hearts':'boss';
 const net=s.online||null,me=net?net.me:0,them=1-me,host=!net||me===0;
 const [c,g]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.updateScores();
 if(!await settle(s))return;
 let L=buildCastle(s.random,mode);const seedBase=Math.floor(s.random()*1e9);
 // Solo: the castle again and again; each clear tightens the clock (boss) or raises the heart goal (hearts).
 let soloTotal=0,soloCleared=0,soloOk=false;
 const raceCap=()=>s.solo?Math.max(75,RACE_CAP-20*soloCleared):RACE_CAP,heartGoal=()=>12+6*soloCleared;
 const worlds=[makeWorld(L,seedBase),makeWorld(L,seedBase)],pl=[makePlayer(0,L,mode),makePlayer(1,L,mode)];
 const cams=[{x:0,w:256},{x:0,w:256}];
 const touchUI=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
 let phase='title',titleT=0,cd=new Countdown(3),clock=0,acc=0,endT=0,winner=-1,simT=0,frames=0,turn=net?me:0,gi=0,turnText='',endText='';
 // P1's run is recorded every step and replayed as a ghost during P2's turn
 const ghost=[],ghostAt=i=>i===1&&gi<ghost.length?ghost[gi]:null;
 const snap=p=>({i:p.i,x:p.x,y:p.y,facing:p.facing,crouch:p.crouch,whip:p.whip&&{t:p.whip.t,crouch:p.whip.crouch},lvl:p.lvl,dead:p.dead,stair:!!p.stair,grounded:p.grounded,hurt:p.hurt,
  anim:p.anim,vx:p.vx,throwT:p.throwT,finished:p.finished,best:p.best,inv:0,flash:0,hearts:p.hearts});

 // ---------------- input: keyboard (whoever's turn it is) and touch (the whole screen)
 const inputs=[0,1].map(()=>({l:0,r:0,u:0,d:0,jump:0,press:0,atk:0,sub:0}));
 const keys={l:0,r:0,u:0,d:0,jump:0};
 const KEYMAP={arrowleft:'l',a:'l',arrowright:'r',d:'r',arrowup:'u',w:'u',arrowdown:'d',s:'d',' ':'jump',x:'jump',k:'jump',z:'atk',j:'atk',enter:'atk',shift:'atk'};
 const onKey=down=>ev=>{if(['INPUT','TEXTAREA','SELECT'].includes(ev.target?.tagName))return;const k=KEYMAP[String(ev.key).toLowerCase()];if(!k)return;ev.preventDefault();
  if(down&&(s.paused||!s.alive||ev.repeat))return;
  if(k==='atk'){if(down)inputs[turn].atk=1;return;}
  keys[k]=down?1:0;if(down&&k==='jump')inputs[turn].press=1;};
 const clearKeys=()=>{for(const k in keys)keys[k]=0;};
 s.on(document,'keydown',onKey(true));s.on(document,'keyup',onKey(false));s.on(window,'blur',clearKeys);s.resetOnPause?.(clearKeys);
 s.hint(mode==='hearts'?'NIGHT OF THE CANDLES: most hearts after 60 seconds. Whip candles and monsters for hearts (big hearts are worth 5); sub-weapons cost hearts, so spend wisely. The door at the end sends you round again with fresh candles.':'VAMPIRE KILLER DASH: fastest to beat the Phantom Bat at the end of the castle and grab its crystal.'
  +' Touch: drag on the left to walk (drag up/down at stairs to climb, down to crouch), tap the middle-right for the WHIP, the far right to JUMP; swipe up from the WHIP spot (or hold up and whip) to throw your sub-weapon. Keys: arrows/WASD move and climb, Space/X jump, Z/J/Enter whip, up + whip for the sub-weapon.');
 const pads={stick:null,jump:null};
 arenaTouch(s,{owner:()=>turn,maxFingers:3,
  onDown:f=>{if(f.x>s.W*.56){if(f.x>s.W*.78){f.data.role='jump';pads.jump=f;inputs[turn].press=1;}else{f.data.role='atk';inputs[turn].atk=1;}}else{f.data.role='stick';pads.stick=f;}},
  onMove:f=>{if(f.data.role==='atk'){if(!f.data.sub&&f.y-f.sy<-26&&Math.abs(f.x-f.sx)<40){f.data.sub=true;inputs[turn].sub=1;}return;}
   if(f.data.role!=='stick')return;const dx=f.x-f.sx,dy=f.y-f.sy,lim=56,d=Math.hypot(dx,dy);if(d>lim){const k=lim/d;f.sx=f.x-dx*k;f.sy=f.y-dy*k;}},
  onUp:f=>{if(pads.jump===f)pads.jump=null;if(pads.stick===f)pads.stick=null;}});
 const readInput=i=>{const inp=inputs[i],st=pads.stick;let {l,r,u,d,jump}=keys;
  if(st){const dx=st.x-st.sx,dy=st.y-st.sy;if(dx>10)r=1;if(dx<-10)l=1;if(dy<-18&&-dy>Math.abs(dx)*.6)u=1;if(dy>18&&dy>Math.abs(dx)*.6)d=1;}
  if(pads.jump)jump=1;Object.assign(inp,{l,r,u,d,jump});if(bot&&i===me)botInput(inp);};

 // ---------------- sounds (original synth effects)
 const sfx={
  whip:()=>{noise(.07,{vol:.05,freq:3200});snd(1500,.05,{type:'square',vol:.02,to:600,delay:.02});},
  hit:()=>{snd(220,.07,{type:'square',vol:.035,to:110});noise(.06,{vol:.04,freq:900});},
  candle:()=>{noise(.12,{vol:.045,freq:1600});snd(660,.06,{type:'triangle',vol:.03,to:300});},
  heart:()=>snd(1320,.12,{type:'square',vol:.025,to:1760}),
  big:()=>jingle([880,1175,1760],{step:.05,type:'square',vol:.03,dur:.07}),
  item:()=>jingle([523,784,1047,1568],{step:.05,type:'square',vol:.03,dur:.08}),
  sub:()=>snd(900,.08,{type:'square',vol:.025,to:400}),
  hurt:()=>snd(300,.25,{type:'square',vol:.04,to:70}),
  die:()=>jingle([392,370,330,294,262,196],{step:.12,type:'square',vol:.035,dur:.14}),
  boss:()=>{noise(.3,{vol:.07,freq:500});snd(120,.4,{type:'sawtooth',vol:.04,to:40});},
  wall:()=>noise(.15,{vol:.06,freq:700}),
  clear:()=>jingle([392,523,659,784,659,784,1047],{step:.11,type:'square',vol:.035,dur:.14}),
  freeze:()=>jingle([1568,1175,1568,1175],{step:.06,type:'triangle',vol:.03,dur:.06}),
  deny:()=>snd(160,.08,{type:'square',vol:.03})
 };

 // ---------------- map helpers
 const tileAt=(w,cc,r)=>{if(r<0||r>=ROWS)return 0;if(cc<0||cc>=L.W)return BLOCK;return w.tiles[r*MAXC+cc];};
 const solidAt=(w,px,py)=>tileAt(w,Math.floor(px/T),Math.floor(py/T))!==0;
 const pH=p=>p.crouch?20:30;
 // generic body vs tiles: returns {wall,landed}
 function moveBody(w,b,hw,h,grav=GRAV){
  const out={wall:false,landed:false};b.vy=Math.min(b.vy+grav,MAXFALL);
  b.x+=b.vx;const r0=Math.floor((b.y-h+2)/T),r1=Math.floor((b.y-1)/T);
  if(b.vx>0){const cc=Math.floor((b.x+hw)/T);for(let r=r0;r<=r1;r++)if(tileAt(w,cc,r)){b.x=cc*T-hw-.01;out.wall=true;break;}}
  else if(b.vx<0){const cc=Math.floor((b.x-hw)/T);for(let r=r0;r<=r1;r++)if(tileAt(w,cc,r)){b.x=(cc+1)*T+hw+.01;out.wall=true;break;}}
  const py=b.y;b.y+=b.vy;
  if(b.vy>=0){const r=Math.floor(b.y/T);if(r>=0&&r<ROWS&&py<=r*T+.5&&(tileAt(w,Math.floor((b.x-hw+1)/T),r)||tileAt(w,Math.floor((b.x+hw-1)/T),r))){b.y=r*T;b.vy=0;out.landed=true;}}
  else{const r=Math.floor((b.y-h)/T);if(r>=0&&(tileAt(w,Math.floor((b.x-hw+1)/T),r)||tileAt(w,Math.floor((b.x+hw-1)/T),r))){b.y=(r+1)*T+h;b.vy=0;}}
  return out;
 }
 const stairFoot=p=>{for(const st of L.stairs)if(Math.abs(p.y-st.by)<1&&Math.abs(p.x-st.bx)<14)return {s:st,top:false};return null;};
 const stairHead=p=>{for(const st of L.stairs){const tx=st.bx+st.dir*st.len,ty=st.by-st.len;if(Math.abs(p.y-ty)<1&&Math.abs(p.x-tx)<14)return {s:st,top:true};}return null;};
 const foeBox=e=>e.type==='bat'?{x0:e.x-7,x1:e.x+7,y0:e.y-5,y1:e.y+5}:e.type==='medusa'?{x0:e.x-7,x1:e.x+7,y0:e.y-7,y1:e.y+7}:{x0:e.x-6,x1:e.x+6,y0:e.y-30,y1:e.y};
 const bossBox=B=>({x0:B.x-18,x1:B.x+18,y0:B.y-8,y1:B.y+8});
 const overlap=(a,b)=>a.x1>b.x0&&a.x0<b.x1&&a.y1>b.y0&&a.y0<b.y1;
 const playerBox=p=>({x0:p.x-5,x1:p.x+5,y0:p.y-pH(p),y1:p.y});
 const log=[];const note=(p,what)=>{log.push(`${clock.toFixed(1)} P${p.i+1} ${what} x${Math.round(p.x)} hearts${p.hearts}`);if(log.length>60)log.shift();};

 // ---------------- player events
 function kill(p,pit){if(p.dead||p.finished)return;note(p,pit?'pit':'die');p.dead=1;p.pit=pit;p.deaths++;p.whip=null;p.stair=null;p.hurt=false;p.vx=0;p.vy=0;sfx.die();s.react(p.i,'sad');
  if(mode==='hearts')p.hearts-=Math.min(p.hearts,3);}
 function respawn(p){const w=worlds[p.i];let check=L.checks[0];for(const k of L.checks)if(k<=p.best+4)check=Math.max(check,k);
  // online boss run: back next to the partner (same castle lap, standing on the floor, further on)
  if(net&&mode==='boss'){const q=pl[them];if(q.net&&!q.dead&&q.lap===p.lap&&q.x>check&&q.grounded&&Math.abs(q.y-FL*T)<1){check=q.x-12;}
   if(w.locked){Object.assign(p,{x:L.arena.x0+48,y:FL*T,vx:0,vy:0,grounded:true,jumped:false,dead:0,pit:false,stair:null,whip:null,hurt:false,crouch:false,hp:HP,inv:90});return;}}
  if(w.locked&&w.boss&&!w.boss.dead&&!net){w.bossHp=w.boss.hp;w.locked=false;w.boss=null;check=Math.min(check,L.arena.x0-24);}
  Object.assign(p,{x:check,y:FL*T,vx:0,vy:0,grounded:true,jumped:false,dead:0,pit:false,stair:null,whip:null,hurt:false,crouch:false,hp:HP,inv:90});
  w.foes=L.foes.filter(e=>e.x>check+120).map(spawnFoe);w.eshots=[];w.flames=[];w.shots=[];w.zoneT=L.zones.map(()=>60);cams[p.i].x=check-cams[p.i].w*.4;}
 function hurt(p,w,dmg,fromX){if(p.inv>0||p.dead||p.finished)return;p.hp=Math.max(0,p.hp-dmg);sfx.hurt();s.react(p.i,'sad');w.fx.shake(3);note(p,'hurt');
  if(p.hp<=0){kill(p,false);return;}
  p.inv=100;if(p.stair)return;
  const d=p.x<fromX?-1:1;Object.assign(p,{whip:null,crouch:false,hurt:true,grounded:false,vx:d*1.1,vy:-2.8,facing:-d});}
 function nextLap(p){p.lap++;note(p,'lap');worlds[p.i]=makeWorld(L,seedBase+p.lap*7919);Object.assign(p,{x:L.lapX,y:FL*T,vx:0,vy:0,grounded:true,stair:null,whip:null,crouch:false});p.best=Math.max(p.best,p.x);
  cams[p.i].x=p.x-cams[p.i].w*.4;flash[p.i]=.8;sfx.clear();}
 const dropItem=(w,type,x,y)=>w.items.push({type,x,y,x0:x,vy:type==='heart'?0:-1.6,t:0,ground:false});
 function breakCandle(p,w,cd){cd.alive=false;if(net)ev({cd:[p.lap,w.candles.indexOf(cd)]});sfx.candle();w.fx.burst(cd.x,cd.y,{n:8,colors:[N.white,N.orange,N.gold],speed:50,life:.3,size:1.6});dropItem(w,cd.item,cd.x,cd.y);}
 function breakWall(p,w,cc,r){w.tiles[r*MAXC+cc]=0;if(net)ev({wb:[p.lap,cc,r]});sfx.wall();w.fx.burst(cc*T+8,r*T+8,{n:10,colors:['#a87848','#5c3818',N.lgray],speed:70,life:.4,size:2,gravity:200});
  const what=w.hidden.get(r*MAXC+cc);if(what){w.hidden.delete(r*MAXC+cc);dropItem(w,what,cc*T+8,r*T+8);}}
 function damageFoe(p,w,e,dmg){e.hp-=dmg;
  if(e.hp>0){e.inv=14;sfx.hit();if(e.type==='skeleton')e.x+=p.x<e.x?3:-3;return;}
  e.state='dying';e.t=0;if(net&&!e.spawned)ev({fk:[p.lap,e.home]});p.score+=PTS[e.type]||100;sfx.hit();w.fx.pop(e.x,e.y-(e.type==='bat'||e.type==='medusa'?10:34),String(PTS[e.type]||100),{color:N.white,stroke:'#000',size:7,rise:16,life:.6});
  const r=w.rng();if(r<(mode==='hearts'?.45:.25))dropItem(w,r<.06?'bigheart':'heart',e.x,e.type==='bat'||e.type==='medusa'?e.y:e.y-16);}
 function damageBoss(p,w,dmg,remote=false){const B=w.boss;B.inv=20;sfx.hit();w.fx.shake(2);w.fx.burst(B.x,B.y,{n:5,colors:[N.white,N.orange],speed:60,life:.25,size:1.6});
  // online the other phone sends its hits; player 1's phone owns the bat's HP
  if(net&&!host){ev({bh:dmg});return;}
  B.hp=Math.max(0,B.hp-dmg);
  if(B.hp<=0){B.dead=true;B.state='die';B.t=0;batDown(remote?pl[me]:p);}}
 // the bat falls: +3000 (online: to both hunters)
 function batDown(p){p.score+=3000;sfx.boss();note(p,'boss down');}
 // anything that hurts monsters: the whip, sub-weapons and holy-water flames
 function hitBox(p,w,b,dmg,hits,whip=false){let any=false;
  for(const cd of w.candles)if(cd.alive&&!hits.has(cd)&&overlap(b,{x0:cd.x-5,x1:cd.x+5,y0:cd.y-9,y1:cd.y+7})){hits.add(cd);breakCandle(p,w,cd);any=true;}
  for(const e of w.foes)if(e.alive&&e.active&&e.state!=='dying'&&e.inv<=0&&!hits.has(e)&&overlap(b,foeBox(e))){hits.add(e);damageFoe(p,w,e,dmg);any=true;}
  const B=w.boss;if(B&&B.state!=='sleep'&&!B.dead&&B.inv<=0&&!hits.has(B)&&overlap(b,bossBox(B))){hits.add(B);damageBoss(p,w,dmg);any=true;}
  if(whip){const c0=Math.floor(b.x0/T),c1=Math.floor(b.x1/T),r0=Math.floor(b.y0/T),r1=Math.floor(b.y1/T);
   for(let cc=c0;cc<=c1;cc++)for(let r=r0;r<=r1;r++){const key='t'+cc+'-'+r;if(tileAt(w,cc,r)===CRACK&&!hits.has(key)){hits.add(key);breakWall(p,w,cc,r);any=true;}}}
  return any;}
 const whipBox=p=>{const hy=p.y-(p.whip?.crouch?13:23),len=WHIP_LEN[p.lvl],x0=p.x+p.facing*7,x1=x0+p.facing*len;return {x0:Math.min(x0,x1),x1:Math.max(x0,x1),y0:hy-6,y1:hy+6};};
 function stepWhip(p,w){const wp=p.whip;wp.t++;if(wp.t===9)sfx.whip();
  if(wp.t>=12&&wp.t<=19)hitBox(p,w,whipBox(p),WHIP_DMG[p.lvl],wp.hits,true);
  if(wp.t>=26)p.whip=null;}
 function throwSub(p,w){const k=p.sub;if(!k)return false;
  if(p.hearts<SUBS[k]||k!=='watch'&&w.shots.length){sfx.deny();return true;}
  if(k==='watch'){if(w.freeze>0)return true;p.hearts-=SUBS[k];w.freeze=150;sfx.freeze();note(p,'stopwatch');return true;}
  p.hearts-=SUBS[k];sfx.sub();p.throwT=12;const f=p.facing,sh={kind:k,x:p.x+f*6,y:p.y-(p.crouch?13:23),vx:0,vy:0,g:0,t:0,f,hits:new Set()};
  if(k==='dagger')sh.vx=f*3.4;else if(k==='axe'){sh.vx=f*1.7;sh.vy=-4.6;sh.g=.16;}else if(k==='holy'){sh.vx=f*1.7;sh.vy=-1.6;sh.g=.22;}else sh.vx=f*3.2;
  w.shots.push(sh);note(p,'throw '+k);return true;}

 function stepPlayer(p,w,inp){
  const press=inp.press,atk=inp.atk,sub=inp.sub;inp.press=0;inp.atk=0;inp.sub=0;
  if(p.flash>0)p.flash--;if(p.throwT>0)p.throwT--;
  if(p.dead){p.dead++;if(p.dead>(p.pit?70:110))respawn(p);return;}
  if(p.finished){p.vx=0;p.whip=null;if(!p.stair){const r=moveBody(w,p,5,30);p.grounded=r.landed;}return;}
  if(p.inv>0)p.inv--;
  if(p.hurt){const r=moveBody(w,p,5,30);if(r.landed){p.hurt=false;p.vx=0;p.grounded=true;}afterMove(p,w);return;}
  const dir=(inp.r?1:0)-(inp.l?1:0);
  // attacks: a swipe up just after a whip starts swaps it for the sub-weapon
  if(sub&&p.whip&&p.whip.t<8)p.whip=null;
  if(!p.whip&&(sub||atk&&inp.u&&p.sub))throwSub(p,w);
  else if(atk&&!p.whip){p.whip={t:0,crouch:p.grounded&&!p.stair&&!!inp.d,hits:new Set()};if(p.grounded&&!p.stair)p.crouch=p.whip.crouch;}
  if(p.whip)stepWhip(p,w);
  // on a staircase: up/down (or towards/away along it) moves, no gravity, no jumping
  if(p.stair){const st=p.stair.s;
   if(!p.whip){const mv=inp.u?1:inp.d?-1:dir?(dir===st.dir?1:-1):0;
    if(mv){p.stair.t=clamp(p.stair.t+mv*.8,0,st.len);p.facing=mv>0?st.dir:-st.dir;p.anim+=.09;
     if(p.stair.t<=0||p.stair.t>=st.len){p.x=st.bx+st.dir*p.stair.t;p.y=st.by-p.stair.t;p.stair=null;p.grounded=true;p.vx=0;p.vy=0;return;}}}
   p.x=st.bx+st.dir*p.stair.t;p.y=st.by-p.stair.t;p.vx=0;p.vy=0;p.grounded=false;p.best=Math.max(p.best,p.x);return;}
  if(p.grounded){
   if(p.whip)p.vx=0;
   else{
    const want=inp.u?stairFoot(p):inp.d?stairHead(p):null;
    if(want){const tx=want.top?want.s.bx+want.s.dir*want.s.len:want.s.bx;p.crouch=false;
     if(Math.abs(p.x-tx)<=WALK){p.x=tx;p.stair={s:want.s,t:want.top?want.s.len:0};p.facing=want.top?-want.s.dir:want.s.dir;return;}
     p.vx=Math.sign(tx-p.x)*WALK;p.facing=Math.sign(p.vx);}
    else{p.crouch=!!inp.d;p.vx=p.crouch?0:dir*WALK;if(dir)p.facing=dir;}
    if(press&&!p.crouch){p.vy=-JUMPV;p.grounded=false;p.jumped=true;}
   }
  }else if(dir&&!p.whip)p.vx+=clamp(dir*WALK-p.vx,-.045,.045);
  const was=p.grounded,res=moveBody(w,p,5,pH(p));
  p.grounded=res.landed;
  if(was&&!p.grounded&&!p.jumped)p.vx=0; // Simon drops straight off a ledge
  if(p.grounded){p.jumped=false;if(!p.whip&&!inp.d)p.crouch=false;}
  if(p.grounded&&p.vx)p.anim+=.12;
  afterMove(p,w);
 }
 function afterMove(p,w){
  if(p.y-30>ROWS*T+8){kill(p,true);return;}
  p.best=Math.max(p.best,p.x);
  const A=L.arena;
  if(A&&!w.locked&&!w.crystal&&p.x>A.x0+40&&!p.dead&&host)wakeBat(w,p);
  if(A&&w.locked&&!w.crystal)p.x=Math.max(p.x,A.x0+6);
  if(L.exitX&&p.x>=L.exitX&&p.grounded&&!p.dead)nextLap(p);
 }

 // the boss room locks and the Phantom Bat wakes (online: a hunter still outside is pulled in)
 function wakeBat(w,p){const A=L.arena;w.locked=true;w.boss={x:A.cx,y:3*T,hp:w.bossHp||BAT_HP,max:BAT_HP,state:'sleep',t:0,inv:0,tx:A.cx,ty:56,vx:0,vy:0,flap:0,dead:false};sfx.boss();note(p,'boss room');
  const q=pl[me];if(net&&!q.dead&&q.x<A.x0+12){Object.assign(q,{x:A.x0+48,y:FL*T,vx:0,vy:0,grounded:true,jumped:false,stair:null,whip:null,hurt:false,crouch:false,inv:60});q.best=Math.max(q.best,q.x);cams[me].x=A.x0-20;flash[me]=.8;}}
 // ---------------- monsters, pickups, projectiles, the boss
 function pickUp(p,w,it){const t=it.type;
  if(t==='heart'){p.hearts++;sfx.heart();if(mode==='hearts')w.fx.pop(it.x,it.y-12,'+1',{color:N.orange,stroke:'#000',size:7,rise:16,life:.5});}
  else if(t==='bigheart'||t==='whip'&&p.lvl>=3){p.hearts+=5;sfx.big();w.fx.pop(it.x,it.y-14,'+5',{color:N.orange,stroke:'#000',size:8,rise:18,life:.6});}
  else if(t==='whip'){p.lvl++;p.flash=40;sfx.item();note(p,'whip '+p.lvl);}
  else if(SUBS[t]){p.sub=t;sfx.item();note(p,'got '+t);}
  else if(t==='bag'){const v=[400,700,1000][Math.floor(w.rng()*3)];p.score+=v;w.fx.pop(it.x,it.y-14,String(v),{color:N.white,stroke:'#000',size:7,rise:18,life:.8});sfx.item();}
  else if(t==='roast'){p.hp=HP;sfx.item();w.fx.pop(it.x,it.y-14,'HP MAX',{color:N.white,stroke:'#000',size:7,rise:18,life:.8});}
  else if(t==='crystal'){p.hp=HP;if(!p.finished){p.finished=true;p.finishT=clock;p.whip=null;sfx.clear();s.react(p.i,'win');note(p,'crystal');}}}
 function stepWorld(w,p){
  const cam=cams[p.i],fr=w.freeze>0;if(fr)w.freeze--;
  // zombies walk in from the screen edges in halls; Medusa heads drift in over the pits
  if(!fr&&!p.dead&&!w.locked&&phase==='play')L.zones.forEach((z,k)=>{if(p.x<z.x0||p.x>z.x1||--w.zoneT[k]>0)return;
   w.zoneT[k]=z.every[0]+Math.floor(w.rng()*(z.every[1]-z.every[0]));
   if(w.foes.filter(e=>e.alive&&e.spawned&&e.type===z.kind).length>=(z.kind==='zombie'?3:2))return;
   const side=z.kind==='medusa'?p.facing:w.rng()<.5?-1:1,x=side>0?cam.x+cam.w+8:cam.x-8;
   if(z.kind==='zombie'){const cc=Math.floor(x/T);if(!tileAt(w,cc,FL)||tileAt(w,cc,FL-1)||tileAt(w,cc,FL-2))return;w.foes.push({...spawnFoe({type:'zombie',x,y:FL*T}),spawned:true,active:true,state:'walk',vx:-side*.55});}
   else w.foes.push({...spawnFoe({type:'medusa',x,y:p.y-22}),spawned:true,active:true,state:'fly',vx:-side*1.05,baseY:clamp(p.y-22+(w.rng()-.5)*20,40,FL*T-20),t:Math.floor(w.rng()*60)});});
  for(const e of w.foes){
   if(!e.alive)continue;
   if(!e.active){if(e.x>cam.x-24&&e.x<cam.x+cam.w+24)e.active=true;else continue;}
   if(e.state==='dying'){e.t++;if(e.t>20)e.alive=false;continue;}
   if(e.x<cam.x-90||e.x>cam.x+cam.w+90){if(e.spawned||e.state!=='idle')e.alive=false;else e.active=false;continue;}
   if(e.inv>0)e.inv--;
   if(fr)continue;
   e.t++;
   if(e.type==='zombie'){const r=moveBody(w,e,5,30);if(r.wall)e.vx=-e.vx;if(e.y>ROWS*T+40)e.alive=false;}
   else if(e.type==='bat'){if(e.state==='idle'){if(Math.abs(p.x-e.x)<110&&!p.dead){e.state='fly';e.vx=(p.x<e.x?-1:1)*1.05;e.t=0;}}
    else{e.baseY+=clamp(p.y-20-e.baseY,-.45,.45);e.x+=e.vx;e.y=e.baseY+Math.sin(e.t*.13)*9;}}
   else if(e.type==='medusa'){e.x+=e.vx;e.y=e.baseY+Math.sin(e.t*.065)*30;}
   else if(e.type==='skeleton'){
    if(Math.abs(e.x-e.home)>22)e.dir=Math.sign(e.home-e.x);else if(w.rng()<.008)e.dir=-e.dir;
    e.vx=e.dir*.35;const ahead=Math.floor((e.x+e.dir*8)/T);if(!tileAt(w,ahead,Math.floor(e.y/T))){e.dir=-e.dir;e.vx=0;}
    const r=moveBody(w,e,5,30);if(r.wall)e.dir=-e.dir;if(e.y>ROWS*T+40)e.alive=false;
    if(--e.throwT<=0&&Math.abs(p.x-e.x)<170&&!p.dead){e.throwT=95+Math.floor(w.rng()*60);const face=p.x<e.x?-1:1;w.eshots.push({kind:'bone',x:e.x,y:e.y-26,vx:face*(.7+Math.min(1.2,Math.abs(p.x-e.x)/110)),vy:-4.2,g:.15,t:0});}}
  }
  if(!p.dead&&!p.finished){const pb=playerBox(p);for(const e of w.foes){if(!e.alive||!e.active||e.state==='dying'||e.state==='idle'&&e.type==='bat')continue;
   if(overlap(pb,foeBox(e))){hurt(p,w,e.type==='medusa'?3:2,e.x);if(e.type==='bat'){e.state='dying';e.t=0;}}}}
  // enemy bones and fireballs
  for(let k=w.eshots.length-1;k>=0;k--){const b=w.eshots[k];if(!fr){b.t++;b.vy+=b.g;b.x+=b.vx;b.y+=b.vy;}
   if(!p.dead&&!p.finished&&Math.abs(b.x-p.x)<8&&b.y>p.y-pH(p)-3&&b.y<p.y+2){hurt(p,w,2,b.x);w.eshots.splice(k,1);continue;}
   if(b.y>ROWS*T+20||b.x<cam.x-40||b.x>cam.x+cam.w+40||b.t>400)w.eshots.splice(k,1);}
  // the player's sub-weapons
  for(let k=w.shots.length-1;k>=0;k--){const sh=w.shots[k];sh.t++;let gone=false;
   if(sh.kind==='cross'){sh.vx-=sh.f*.075;sh.x+=sh.vx;if(sh.t>30&&Math.sign(sh.vx)!==sh.f&&Math.abs(sh.x-p.x)<10&&Math.abs(sh.y-(p.y-20))<26)gone=true;}
   else{sh.vy+=sh.g;sh.x+=sh.vx;sh.y+=sh.vy;}
   const box={x0:sh.x-5,x1:sh.x+5,y0:sh.y-5,y1:sh.y+5};
   if(sh.kind==='holy'){if(solidAt(w,sh.x,sh.y+3)||hitBox(p,w,box,1,sh.hits)){let r=Math.floor(sh.y/T);while(r<ROWS&&!tileAt(w,Math.floor(sh.x/T),r))r++;if(r<ROWS)w.flames.push({x:sh.x,y:r*T,t:0});gone=true;}}
   else{if(hitBox(p,w,box,2,sh.hits)&&sh.kind==='dagger')gone=true;if(sh.kind==='dagger'&&solidAt(w,sh.x+sh.f*4,sh.y))gone=true;}
   if(sh.x<cam.x-24||sh.x>cam.x+cam.w+24||sh.y>ROWS*T+16||sh.t>220)gone=true;
   if(gone)w.shots.splice(k,1);}
  for(let k=w.flames.length-1;k>=0;k--){const f=w.flames[k];f.t++;if(f.t%12===1)hitBox(p,w,{x0:f.x-9,x1:f.x+9,y0:f.y-16,y1:f.y},1,new Set());if(f.t>72)w.flames.splice(k,1);}
  // pickups: small hearts flutter down, everything else drops
  for(let k=w.items.length-1;k>=0;k--){const it=w.items[k];it.t++;
   if(!it.ground){if(it.type==='heart'){it.y+=.55;it.x=it.x0+Math.sin(it.t*.09)*9;}else{it.vy=Math.min(it.vy+.15,3);it.y+=it.vy;}
    const r=Math.floor(it.y/T);if((it.type==='heart'||it.vy>=0)&&tileAt(w,Math.floor(it.x/T),r)&&it.y-r*T<6){it.y=r*T;it.ground=true;}
    if(it.y>ROWS*T+20){w.items.splice(k,1);continue;}}
   if(it.t>420&&it.type!=='crystal'){w.items.splice(k,1);continue;}
   if(!p.dead&&Math.abs(it.x-p.x)<10&&it.y>p.y-pH(p)-6&&it.y-10<p.y){w.items.splice(k,1);pickUp(p,w,it);}}
  // the Phantom Bat
  const B=w.boss,A=L.arena;
  if(B){if(B.inv>0)B.inv--;B.flap+=B.state==='sleep'?.04:.25;
   // online the other phone's bat follows player 1's snapshots (its fireballs come as {bf})
   if(net&&!host){if(B.nx!=null&&B.state!=='die'){B.x+=(B.nx-B.x)*.25;B.y+=(B.ny-B.y)*.25;}if(B.state==='die'){B.t++;if(B.t%6===0)w.fx.burst(B.x+(w.rng()-.5)*34,B.y+(w.rng()-.5)*16,{n:6,colors:[N.white,N.orange,N.gold],speed:60,life:.35,size:2});}}
   else if(B.state==='die'){B.t++;if(B.t%6===0)w.fx.burst(B.x+(w.rng()-.5)*34,B.y+(w.rng()-.5)*16,{n:6,colors:[N.white,N.orange,N.gold],speed:60,life:.35,size:2});
    if(B.t>70){B.state='gone';w.crystal=true;dropItem(w,'crystal',A.cx,2*T);}}
   else if(B.state!=='gone'&&(!fr||B.state==='sleep')){B.t++;const tp=batTarget(p,w);
    const roam=()=>{B.state='hover';B.t=0;B.tx=A.x0+40+w.rng()*(A.x1-A.x0-80);B.ty=88+w.rng()*26;};
    if(B.state==='sleep'){if(B.t>50)roam();}
    else if(B.state==='hover'){B.x+=(B.tx-B.x)*.03;B.y+=(B.ty-B.y)*.03+Math.sin(B.t*.1)*.4;
     if(B.t>(B.hp<6?70:95)){B.t=0;B.state=w.rng()<.6&&!tp.dead?'tell':'shoot';}}
    else if(B.state==='tell'){B.x+=Math.sin(B.t*1.7)*1.2;if(B.t>26){B.t=0;B.state='swoop';const dx=tp.x-B.x,dy=tp.y-14-B.y,d=Math.max(1,Math.hypot(dx,dy));B.vx=dx/d*1.8;B.vy=dy/d*1.8;}}
    else if(B.state==='swoop'){B.x+=B.vx;B.y+=B.vy;if(B.y>FL*T-14||B.t>60||B.x<A.x0+22||B.x>A.x1-22)roam();}
    else if(B.state==='shoot'){if((B.t===24||B.t===46&&B.hp<5)&&!tp.dead){const dx=tp.x-B.x,dy=tp.y-16-B.y,d=Math.max(1,Math.hypot(dx,dy)),f={kind:'fire',x:B.x,y:B.y+6,vx:dx/d*1.4,vy:dy/d*1.4,g:0,t:0};w.eshots.push(f);if(net)ev({bf:[Math.round(f.x),Math.round(f.y),+f.vx.toFixed(2),+f.vy.toFixed(2)]});sfx.sub();}
     if(B.t>58)roam();}
    B.x=clamp(B.x,A.x0+24,A.x1-24);B.y=clamp(B.y,24,FL*T-12);}
   if(!['sleep','die','gone'].includes(B.state)&&!p.dead&&!p.finished&&overlap(playerBox(p),bossBox(B)))hurt(p,w,2,B.x);}
 }
 const updateCamera=(p,i)=>{const cam=cams[i],A=L.arena,w=worlds[i];let tx=p.x-cam.w*.5;
  if(A&&w.locked)tx=(A.x0+A.x1)/2-cam.w/2;
  const maxX=L.W*T-cam.w,want=maxX<0?maxX/2:A&&w.locked?tx:clamp(tx,0,maxX);
  cam.x=A&&w.locked&&Math.abs(want-cam.x)>1?cam.x+(want-cam.x)*.12:want;};

 // ---------------- art: 16x16 tiles and 32x32 wall patterns, drawn once
 const mk=(W,H,fn)=>{const cv=document.createElement('canvas');cv.width=W;cv.height=H;const q=cv.getContext('2d');fn((col,X,Y,w=1,h=1)=>{q.fillStyle=col;q.fillRect(X,Y,w,h);});return cv;};
 const art=(()=>{
  const stone=(base,hl,sh)=>mk(T,T,px=>{px(base,0,0,16,16);px(hl,0,0,15,1);px(hl,0,0,1,15);px(sh,1,14,14,1);px(sh,14,1,1,14);px('#000',0,15,16,1);px('#000',15,0,1,16);
   px(hl,4,5,2,1);px(sh,9,9,2,1);px(hl,11,3,1,1);px(sh,3,11,1,1);});
  const block=(crack)=>mk(T,T,px=>{px('#a87848',0,0,16,16);px('#e8b888',0,0,16,1);px('#e8b888',0,0,1,7);px('#e8b888',9,8,1,7);px('#5c3818',0,7,16,1);px('#5c3818',8,0,1,7);px('#5c3818',0,8,1,7);
   px('#000',0,15,16,1);px('#000',15,0,1,16);px('#c89868',3,3,2,1);px('#c89868',12,11,2,1);
   if(crack){px('#2c1808',5,1,1,3);px('#2c1808',6,4,1,2);px('#2c1808',7,6,2,1);px('#2c1808',10,9,1,3);px('#2c1808',11,12,1,2);px('#2c1808',3,10,2,1);}});
  const dirt=mk(T,T,px=>{px('#6c4c2c',0,0,16,16);px('#2c6c2c',0,0,16,2);px('#4c8c2c',2,0,3,1);px('#4c8c2c',10,0,4,1);px('#8c6c3c',3,5,3,2);px('#8c6c3c',10,9,4,2);px('#4c2c14',7,4,2,1);px('#4c2c14',2,12,3,1);px('#4c2c14',12,14,2,1);});
  const step=mk(8,8,px=>{px('#a87848',0,0,8,8);px('#e8b888',0,0,8,1);px('#5c3818',7,1,1,7);px('#000',0,7,8,1);});
  const wall=(mortar,brick,hl,bw,bh)=>mk(32,32,px=>{px(mortar,0,0,32,32);for(let r=0;r<32/bh;r++){const off=r%2?bw/2:0;for(let bx=-bw;bx<32;bx+=bw){px(brick,bx+off+1,r*bh+1,bw-2,bh-2);px(hl,bx+off+1,r*bh+1,bw-2,1);}}});
  const sky=mk(8,FL*T,px=>{const bands=[[0,'#000010'],[50,'#00002c'],[86,'#000050'],[116,'#14106c'],[140,'#2c1878']];bands.forEach(([y,col],k)=>px(col,0,y,8,(bands[k+1]?.[0]??FL*T)-y));
   for(const [y] of bands.slice(1))for(let x=0;x<8;x+=2)px(bands[Math.max(0,bands.findIndex(b=>b[0]===y)-1)][1],x+(y%4?1:0),y,1,1);});
  return {stone:stone('#7c7c7c','#bcbcbc','#4c4c4c'),dirt,block:block(false),crack:block(true),step,
   walls:{hall:wall('#140604','#4a1c0c','#6c2c14',16,8),gallery:wall('#0a0610','#2c1a3c','#40285a',16,16),crypt:wall('#00000c','#1c2650','#2c3c74',16,8),gate:wall('#1c1c1c','#5c5c5c','#8c8c8c',16,8),boss:wall('#0c0408','#3a1424','#58203a',16,8),sky}};})();
 const pats={};const pat=k=>pats[k]||(pats[k]=g.createPattern(k==='yard'?art.walls.sky:art.walls[k]||art.walls.hall,'repeat'));

 // ---------------- drawing
 const flash=[0,0];
 const R=(col,x,y,w,h)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
 function drawBG(x0,x1){const c0=Math.max(0,Math.floor(x0/T)),c1=Math.min(L.W-1,Math.floor(x1/T));
  for(let k=c0;k<=c1;){const th=L.bg[k];let e=k;while(e+1<=c1&&L.bg[e+1]===th)e++;g.fillStyle=pat(th);g.fillRect(k*T,0,(e-k+1)*T,FL*T);k=e+1;}
  // the castle walls beyond either end
  g.fillStyle=pat('gate');if(x0<0)g.fillRect(x0-T,0,-x0+T,ROWS*T);if(x1>L.W*T)g.fillRect(L.W*T,0,x1-L.W*T+T,ROWS*T);}
 function drawDecor(d){const x=d.x;
  switch(d.type){
   case 'moon':{g.fillStyle='rgba(252,224,168,.18)';g.beginPath();g.arc(x+12,40,30,0,7);g.fill();g.fillStyle=N.cream;g.beginPath();g.arc(x+12,40,21,0,7);g.fill();R('#e0c088',x+4,32,6,5);R('#e0c088',x+16,46,7,5);R('#e0c088',x+18,30,3,3);
    for(let k=0;k<26;k++){const sx=x-60+((k*97)%360),sy=8+((k*53)%70);R(k%3?N.lgray:N.white,sx,sy,1,1);}break;}
   case 'far':{g.fillStyle='#14143c';g.beginPath();g.moveTo(x,FL*T-30);for(const [dx,h] of [[0,70],[18,70],[18,100],[30,112],[42,100],[42,80],[70,80],[70,120],[78,140],[86,120],[86,84],[120,84],[120,104],[132,116],[144,104],[144,76],[180,76],[180,96],[196,96],[196,70],[230,70]])g.lineTo(x+dx,FL*T-h);g.lineTo(x+230,FL*T-30);g.fill();
    g.fillStyle=N.gold;for(const [dx,h] of [[34,96],[80,118],[134,100],[100,70],[60,66]])g.fillRect(x+dx,FL*T-h,2,3);break;}
   case 'tree':{g.fillStyle='#0c0814';g.fillRect(x+6,FL*T-80,6,80);for(const [a,b,c2,dd] of [[9,-60,-14,-78],[9,-50,26,-70],[9,-70,22,-92],[9,-40,-12,-52]]){g.fillRect(Math.min(x+a,x+c2),FL*T+dd,Math.abs(c2-a)+2,3);g.fillRect(x+a,FL*T+b,3,Math.abs(dd-b));}break;}
   case 'fence':{const x2=x+d.w*T;g.fillStyle='#1c1c34';g.fillRect(x,FL*T-34,x2-x,3);g.fillRect(x,FL*T-12,x2-x,3);for(let fx=x+3;fx<x2;fx+=7){g.fillRect(fx,FL*T-40,2,40);g.fillStyle='#5c5c8c';g.fillRect(fx-1,FL*T-43,4,3);g.fillRect(fx,FL*T-45,2,2);g.fillStyle='#1c1c34';}break;}
   case 'gate':{R('#000',x+T,FL*T-64,2*T,64);g.fillStyle='#000';g.beginPath();g.arc(x+2*T,FL*T-64,T,Math.PI,0);g.fill();R(N.gray,x+T-4,FL*T-82,4,82);R(N.gray,x+3*T,FL*T-82,4,82);
    g.fillStyle='#3c3c3c';for(let k=0;k<6;k++)g.fillRect(x+T+2+k*5,FL*T-84,2,22);g.fillRect(x+T,FL*T-66,2*T,2);g.fillStyle='#fc7460';g.fillRect(x+T-10,FL*T-60,4,8);g.fillRect(x+3*T+10,FL*T-60,4,8);break;}
   case 'window':{const y0=2*T,w=2*T,h=4*T;R(N.dgray,x-2,y0-2,w+4,h+4);g.fillStyle=N.dgray;g.beginPath();g.arc(x+w/2,y0,w/2+2,Math.PI,0);g.fill();R('#000088',x,y0,w,h);g.fillStyle='#000088';g.beginPath();g.arc(x+w/2,y0,w/2,Math.PI,0);g.fill();
    R(N.sky,x+4,y0+6,3,8);R(N.sky,x+8,y0+4,2,4);R(N.dgray,x+w/2-1,y0-T/2,2,h+T/2);R(N.dgray,x,y0+h/2,w,2);R(N.gray,x-4,y0+h,w+8,4);break;}
   case 'curtain':{const y0=T,h=6*T;R(N.dred,x,y0,2*T,6);for(let k=0;k<4;k++){R(k%2?N.red:N.dred,x+k*8,y0+4,8,h-(k%2?6:0));R('#5c0800',x+k*8+6,y0+4,2,h-8);}R(N.gold,x+2,y0+h*.62,28,3);R(N.gold,x,y0,2*T,2);break;}
   case 'painting':{const y0=3*T;R(N.gold,x-2,y0-2,2*T+4,2*T+4);R(N.tan,x,y0,2*T,2*T);R('#1c1428',x+3,y0+3,2*T-6,2*T-6);R(N.peach,x+12,y0+8,8,9);R('#000',x+13,y0+11,2,2);R('#000',x+17,y0+11,2,2);R(N.dred,x+9,y0+18,14,8);break;}
   case 'chains':{g.fillStyle=N.gray;for(let y=0;y<5*T;y+=5)g.fillRect(x+7+(y/5%2),y,3,3);R(N.dgray,x+4,5*T,9,4);break;}
   case 'bigwindow':{const y0=1.5*T,w=4*T,h=5*T;R('#000',x,y0,w,h);g.beginPath();g.arc(x+w/2,y0,w/2,Math.PI,0);g.fill();g.fillStyle='#0c0838';g.fillRect(x+3,y0,w-6,h-3);
    g.fillStyle=N.cream;g.beginPath();g.arc(x+w*.68,y0+18,12,0,7);g.fill();g.fillStyle='#0c0838';g.beginPath();g.arc(x+w*.68+6,y0+15,11,0,7);g.fill();
    R(N.gray,x-3,y0+h,w+6,4);R(N.dgray,x+w/2-1,y0-w/2+2,2,h+w/2-2);for(const [dx,dy] of [[4,40],[50,58],[8,70]])R('#0c0408',x+dx,y0+dy,6,4);break;}
   case 'door':{const y0=FL*T-3*T;R('#000',x-4,y0-6,2*T+8,3*T+6);R('#6c3c14',x,y0,2*T,3*T);R('#4c2808',x+T-1,y0,2,3*T);for(let k=1;k<4;k++)R('#4c2808',x,y0+k*12,2*T,1);R(N.gold,x+T-5,y0+26,2,3);R(N.gold,x+T+3,y0+26,2,3);
    g.fillStyle=N.white;g.font='bold 7px "Courier New",monospace';g.textAlign='center';g.fillText('EXIT',x+T,y0-9);break;}}}
 function drawStairs(x0,x1){for(const st of L.stairs){const n=st.len/8;if(Math.max(st.bx,st.bx+st.dir*st.len)<x0-T||Math.min(st.bx,st.bx+st.dir*st.len)>x1+T)continue;
  for(let k=1;k<n;k++){const sx=st.bx+st.dir*k*8-4,sy=st.by-k*8;g.drawImage(art.step,Math.round(sx),sy);}}}
 function drawTiles(w,x0,x1){const cs=Math.floor(x0/T),ce=Math.floor(x1/T);
  for(let cc=cs;cc<=ce;cc++){const out=cc<0||cc>=L.W;for(let r=0;r<ROWS;r++){const t=out?(r>=FL?STONE:0):w.tiles[r*MAXC+cc];if(!t)continue;
   g.drawImage(t===STONE?(L.bg[cc]==='yard'?art.dirt:art.stone):t===CRACK?art.crack:art.block,cc*T,r*T);}}}
 function drawCandle(cd){const fl=Math.floor(simT*12+cd.x)%3;
  if(cd.kind==='brazier'){R(N.dgray,cd.x-3,cd.y+4,6,FL*T-cd.y-4);R(N.gray,cd.x-2,cd.y+4,2,FL*T-cd.y-4);R(N.tan,cd.x-7,cd.y,14,5);R(N.brown,cd.x-6,cd.y+4,12,2);
   R(N.red,cd.x-5,cd.y-6,10,6);R(N.orange,cd.x-4+fl,cd.y-10,6,6);R(N.gold,cd.x-2+(fl===1?1:0),cd.y-13,3,5);return;}
  R(N.gold,cd.x-3,cd.y+4,7,2);R(N.tan,cd.x,cd.y+6,1,4);R(N.white,cd.x-1,cd.y-2,3,6);R(N.lgray,cd.x+1,cd.y-2,1,6);R(N.orange,cd.x-1,cd.y-6+(fl===2?1:0),3,4);R(N.gold,cd.x,cd.y-8+(fl?1:0),1,3);}
 function drawHeart(x,y,big){if(big){R(N.red,x-5,y-9,4,2);R(N.red,x+1,y-9,4,2);R(N.red,x-6,y-7,12,3);R(N.red,x-5,y-4,10,2);R(N.red,x-3,y-2,6,1);R(N.red,x-1,y-1,2,1);R(N.peach,x-4,y-8,2,1);}
  else{R(N.red,x-3,y-6,2,1);R(N.red,x+1,y-6,2,1);R(N.red,x-3,y-5,6,2);R(N.red,x-2,y-3,4,1);R(N.red,x-1,y-2,2,1);R(N.peach,x-2,y-5,1,1);}}
 function drawPickup(type,x,y){
  switch(type){
   case 'heart':drawHeart(x,y,false);break;case 'bigheart':drawHeart(x,y,true);break;
   case 'whip':R(N.tan,x-5,y-10,10,2);R(N.tan,x-6,y-9,2,7);R(N.tan,x+4,y-9,2,7);R(N.tan,x-5,y-3,10,2);R(N.gold,x-1,y-8,2,6);R(N.lgray,x-3,y-7,1,1);break;
   case 'dagger':R(N.lgray,x-6,y-5,9,2);R(N.white,x-5,y-5,7,1);R(N.gold,x+3,y-6,1,4);R(N.brown,x+4,y-5,3,2);break;
   case 'axe':R(N.brown,x-1,y-11,2,11);R(N.lgray,x+1,y-11,5,6);R(N.white,x+5,y-10,1,4);R(N.lgray,x-4,y-10,3,3);break;
   case 'holy':R(N.dblue,x-3,y-8,6,8);R(N.sky,x-2,y-7,2,5);R(N.lgray,x-1,y-11,2,3);R(N.brown,x-1,y-12,2,1);break;
   case 'cross':R(N.gold,x-1,y-11,3,11);R(N.gold,x-5,y-8,11,3);R(N.cream,x,y-10,1,8);break;
   case 'watch':g.fillStyle=N.gold;g.beginPath();g.arc(x,y-5,5,0,7);g.fill();R(N.white,x-3,y-8,6,6);R('#000',x,y-7,1,3);R('#000',x,y-5,2,1);R(N.gold,x-1,y-12,2,2);break;
   case 'bag':{const blink=Math.floor(simT*8)%3;R([N.red,N.white,N.dblue][blink],x-5,y-8,10,8);R(N.tan,x-2,y-11,4,3);R(N.gold,x-1,y-6,2,3);break;}
   case 'roast':R(N.white,x-7,y-3,14,3);R('#8c3c0c',x-6,y-9,11,6);R('#c86c2c',x-5,y-9,6,2);R(N.white,x+4,y-10,3,2);break;
   case 'crystal':{const k=Math.floor(simT*10)%4,col=[N.white,N.sky,N.plum,N.orange][k];g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.arc(x,y-8,10,0,7);g.fill();g.fillStyle=col;g.beginPath();g.arc(x,y-8,7,0,7);g.fill();R(N.white,x-3,y-12,2,2);break;}}}
 function drawItem(it){if(it.t>330&&it.type!=='crystal'&&(frames>>2)%2)return;drawPickup(it.type,Math.round(it.x),Math.round(it.y));}
 function drawFlamePuff(x,y,t){const k=Math.min(2,Math.floor(t/7));g.fillStyle=[N.white,N.gold,N.orange][k];for(const [dx,dy,s2] of [[-4,0,6],[2,-3,5],[-1,-7,4]])g.fillRect(x+dx,y+dy-k*2,s2-k,s2-k);}
 function drawFoe(e){if(e.inv>0&&(frames>>1)%2)return;const x=Math.round(e.x),y=Math.round(e.y);
  if(e.state==='dying'){drawFlamePuff(x,e.type==='bat'||e.type==='medusa'?y:y-14,e.t);return;}
  g.save();g.translate(x,y);
  if(e.type==='zombie'){const f=e.vx<0?-1:1,fr=Math.floor(e.t/12)%2;g.scale(f,1);
   R('#3c3c5c',-4,-11,3,11-(fr?2:0));R('#3c3c5c',1,-11,3,11-(fr?0:2));R('#5c7c3c',-5,-25,10,14);R('#3c5c2c',-5,-14,10,2);R('#a8c878',2,-23,9,3);R('#a8c878',-6,-21,3,5);R('#a8c878',-3,-33,8,8);R('#000',2,-30,2,2);R(N.red,1,-27,3,1);R('#5c7c3c',-4,-34,6,2);}
  else if(e.type==='skeleton'){const f=e.dir<0?-1:1;g.scale(f,1);R(N.white,-4,-31,9,7);R('#000',-1,-29,2,2);R('#000',2,-29,2,2);R(N.lgray,-2,-25,5,2);R(N.lgray,-1,-23,2,11);
   for(let k=0;k<3;k++)R(N.white,-4,-22+k*3,8,1);R(N.white,-4,-13,8,2);const fr=Math.floor(e.t/14)%2;R(N.white,-3,-11,2,11-(fr?1:0));R(N.white,2,-11,2,11-(fr?0:1));R(N.white,3,-22,6,2);R(N.white,-6,-21,2,7);}
  else if(e.type==='bat'){const idle=e.state==='idle',fl=Math.floor(e.t/6)%2;
   if(idle){R('#1c1c3c',-3,-4,6,9);R(N.dblue,-4,-2,2,6);R(N.dblue,2,-2,2,6);R(N.red,-2,2,1,1);R(N.red,1,2,1,1);}
   else{R('#1c1c3c',-3,-3,6,6);R(N.red,-2,-2,1,1);R(N.red,1,-2,1,1);if(fl){R(N.dblue,-10,-6,7,3);R(N.dblue,3,-6,7,3);R(N.dblue,-8,-3,4,2);R(N.dblue,4,-3,4,2);}else{R(N.dblue,-10,0,7,3);R(N.dblue,3,0,7,3);R(N.dblue,-8,-2,4,2);R(N.dblue,4,-2,4,2);}}}
  else if(e.type==='medusa'){const f=e.vx<0?-1:1;g.scale(f,1);g.fillStyle=N.green;g.beginPath();g.arc(0,0,7,0,7);g.fill();
   g.fillStyle=N.dgreen;for(let k=0;k<5;k++){const a=Math.PI*(.95+k*.2),wv=Math.sin(simT*10+k)*1.5;g.fillRect(Math.cos(a)*7-1,Math.sin(a)*7-1+wv,3,3);g.fillRect(Math.cos(a)*10-1,Math.sin(a)*10+wv*1.5,2,2);}
   R(N.gold,2,-3,2,2);R(N.gold,-2,-3,2,2);R(N.red,0,2,4,1);R(N.lime,-6,-1,2,2);}
  g.restore();}
 function drawShot(b){const x=Math.round(b.x),y=Math.round(b.y);g.save();g.translate(x,y);
  if(b.kind==='bone'){g.rotate(b.t*.3);R(N.white,-4,-1,8,2);R(N.white,-5,-2,2,4);R(N.white,3,-2,2,4);}
  else if(b.kind==='fire'){const k=Math.floor(simT*14)%2;R(k?N.orange:N.gold,-3,-3,6,6);R(N.white,-1,-1,2,2);}
  else if(b.kind==='dagger'){g.scale(b.f,1);R(N.lgray,-5,-1,8,2);R(N.white,-4,-1,6,1);R(N.gold,3,-2,1,4);R(N.brown,4,-1,3,2);}
  else if(b.kind==='axe'){g.rotate(b.t*.35*b.f);R(N.brown,-1,-6,2,12);R(N.lgray,1,-6,5,6);R(N.lgray,-5,-6,4,4);}
  else if(b.kind==='holy'){g.rotate(b.t*.2*b.f);R(N.dblue,-3,-4,6,7);R(N.sky,-2,-3,2,4);R(N.lgray,-1,-6,2,2);}
  else if(b.kind==='cross'){g.rotate(b.t*.5);R(N.gold,-1,-6,3,12);R(N.gold,-6,-1,12,3);}
  g.restore();}
 function drawFlames(f){const k=Math.floor((simT*12+f.x))%3;for(const dx of [-6,0,6]){R(N.dblue,f.x+dx-2,f.y-5,5,5);R([N.sky,N.white,N.dblue][(k+Math.abs(dx))%3],f.x+dx-1,f.y-10-(k===dx/6+1?2:0),3,6);}}
 function drawBoss(B){if(B.state==='gone')return;const x=Math.round(B.x),y=Math.round(B.y);if(B.inv>0&&(frames>>1)%2)return;g.save();g.translate(x,y);
  if(B.state==='sleep'){R('#181018',-8,-6,16,18);R('#6a1c4c',-10,-4,4,14);R('#6a1c4c',6,-4,4,14);R('#fc3c3c',-4,6,2,2);R('#fc3c3c',2,6,2,2);R('#181018',-2,-10,4,4);g.restore();return;}
  const up=Math.sin(B.flap)>0,wy=up?-10:6,die=B.state==='die'||B.state==='tell'&&(frames>>2)%2;
  for(const sd of [-1,1]){g.fillStyle=die&&(frames>>2)%2?N.white:'#6a1c4c';g.beginPath();g.moveTo(sd*6,-3);g.lineTo(sd*20,wy-4);g.lineTo(sd*32,wy);g.lineTo(sd*26,wy+5);g.lineTo(sd*20,wy+2);g.lineTo(sd*14,wy+7);g.lineTo(sd*8,4);g.closePath();g.fill();
   g.strokeStyle='#c8a8c8';g.lineWidth=1;g.beginPath();g.moveTo(sd*6,-2);g.lineTo(sd*20,wy-4);g.lineTo(sd*32,wy);g.stroke();}
  R('#181018',-8,-7,16,14);R('#2c1c2c',-6,-5,12,10);R('#181018',-7,-11,4,5);R('#181018',3,-11,4,5);R('#fc3c3c',-5,-4,3,2);R('#fc3c3c',2,-4,3,2);R(N.white,-3,2,1,3);R(N.white,2,2,1,3);
  g.restore();}

 // Simon's body (P2 in Richter blue) with the player's head under a headband. Feet at (0,0); facing right before mirroring.
 function drawHunter(q,alpha=1){
  const i=q.i;g.save();g.globalAlpha*=alpha;
  if(q.inv>0&&alpha===1&&(frames>>2)%2)g.globalAlpha*=.35;
  const pal=q.flash>0&&(frames>>2)%2?FLASH_PAL:PALS[i],f=q.facing||1;g.translate(Math.round(q.x),Math.round(q.y));
  const W=q.whip,crouch=W?W.crouch:q.crouch&&q.grounded&&!q.stair;
  let pose='stand';
  if(q.dead)pose='dead';else if(q.hurt)pose='hurt';else if(W)pose='whip';else if(q.throwT>0)pose='throw';else if(crouch)pose='crouch';else if(!q.grounded&&!q.stair)pose='jump';else if(q.stair||Math.abs(q.vx)>.05)pose='walk';
  const fr=Math.floor(q.anim)%3,dy=crouch?9:pose==='jump'?-2:0;
  g.save();g.scale(f,1);
  if(pose==='dead'){R(pal.armor,-10,-6,13,6);R(pal.belt,-3,-6,2,6);R(pal.boots,3,-5,6,5);R(N.peach,-12,-4,3,2);}
  else{
   // legs and boots
   if(crouch){R(pal.dark,-5,-5,10,2);R(pal.boots,-6,-3,5,3);R(pal.boots,2,-3,5,3);}
   else if(pose==='jump'){R(pal.dark,-4,-12,8,3);R(pal.boots,-5,-10,4,4);R(pal.boots,2,-8,4,4);}
   else if(pose==='walk'){const a=[[-5,1],[-3,0],[-1,2]][fr],b=[[1,2],[0,0],[-2,1]][fr];R(pal.dark,a[0],-9,3,5);R(pal.dark,b[0]+1,-9,3,5);R(pal.boots,a[0]-1,-4,4,4);R(pal.boots,b[0]+1,-4,4,4);}
   else{R(pal.dark,-4,-9,3,5);R(pal.dark,1,-9,3,5);R(pal.boots,-5,-4,4,4);R(pal.boots,1,-4,4,4);}
   // tunic, belt, arms
   const ty=-21+dy;R(pal.armor,-5,ty,10,12);R(pal.light,-4,ty+1,2,9);R(pal.belt,-5,ty+10,10,2);R(pal.dark,-5,ty,10,2);
   if(pose==='hurt'){R(N.skin2,-8,ty-5,2,7);R(N.peach,5,ty-5,2,7);}
   else if(pose==='whip'){const t=W.t;
    if(t<9){R(N.peach,-7,ty-6,2,8);drawWhipWind(q.lvl,-7,ty-6,0);}
    else if(t<12){R(N.peach,1,ty-8,2,9);drawWhipWind(q.lvl,2,ty-8,1);}
    else{R(N.peach,3,ty+1,7,2);drawWhipOut(q.lvl,9,ty+1);}
    R(N.skin2,-6,ty+1,2,6);}
   else if(pose==='throw'){R(N.peach,3,ty+1,7,2);R(N.skin2,-6,ty+1,2,6);}
   else{R(N.skin2,-7,ty+1,2,7);R(N.peach,4,ty+2,2,7);}
  }
  g.restore();
  // head: the player's portrait with a headband
  if(!q.dead){const hy=-32+dy+(pose==='hurt'?-1:0),size=24,hx=f*(pose==='hurt'?-1:1);
   s.sprite(g,i,hx,hy,size,{exact:true,mood:q.finished?'win':pose==='hurt'?'sad':W&&W.t>=12?'happy':undefined});
   g.fillStyle=pal.band;g.fillRect(hx-size*.48,hy-size*.32,size*.96,size*.14);g.fillRect(hx-f*size*.5-(f>0?3:0),hy-size*.3,3,size*.3);}
  else s.sprite(g,i,-15*f,-7,16,{exact:true,mood:'sad'});
  g.restore();
 }
 const whipCol=(lvl,k)=>lvl===3?[N.white,N.gold,N.orange,N.sky][(Math.floor(simT*20)+k)%4]:lvl===2?(k%2?N.lgray:N.gray):N.tan;
 function drawWhipWind(lvl,hx,hy,phase){const len=WHIP_LEN[lvl],pts=phase?[[hx+2,hy-4],[hx+4,hy-10],[hx+3,hy-15]]:[[hx-4,hy-2],[hx-len*.3,hy-6],[hx-len*.5,hy+2]];
  pts.forEach(([x,y],k)=>R(whipCol(lvl,k),Math.round(x)-1,Math.round(y)-1,lvl>1?3:2,lvl>1?3:2));}
 function drawWhipOut(lvl,hx,hy){const len=WHIP_LEN[lvl];if(lvl===1){R(N.tan,hx,hy,len,2);R(N.brown,hx+len-3,hy-1,3,3);return;}
  for(let k=0;k*4<len;k++)R(whipCol(lvl,k),hx+k*4,hy-(k%2),3,2);if(lvl===3){R(whipCol(3,1),hx+len-3,hy-2,5,5);}}

 // ---------------- screen layout: a 16-column NES screen (12 on a portrait phone) plus the status bar, scaled to fit, controls underneath
 // online the status bar starts below the duel chip
 const layout=()=>{const top=net?30:0,cols=s.W<s.H?12:16,sc=Math.max(.5,Math.min(s.W/(cols*T),(s.H-top)/(ROWS*T+HUDH))),hh=HUDH*sc,lh=ROWS*T*sc,oy=Math.max(top,(s.H-hh-lh)*.28);return {sc,oy,ly:oy+hh,lh,hh};};
 function drawView(i){
  const lay=layout(),{sc,ly,lh}=lay,p=pl[i],w=worlds[i],cam=cams[i];cam.w=s.W/sc;
  g.save();g.beginPath();g.rect(0,ly,s.W,lh);g.clip();
  g.fillStyle='#000';g.fillRect(0,ly,s.W,lh);
  w.fx.begin(g);g.translate(Math.round(-cam.x*sc),Math.round(ly));g.scale(sc,sc);g.imageSmoothingEnabled=false;
  const x0=cam.x-T,x1=cam.x+cam.w+T;
  drawBG(x0,x1);
  for(const d of L.decor)if(d.x>x0-260&&d.x<x1+40)drawDecor(d);
  drawStairs(x0,x1);
  drawTiles(w,x0,x1);
  for(const cd of w.candles)if(cd.alive&&cd.x>x0&&cd.x<x1)drawCandle(cd);
  for(const it of w.items)drawItem(it);
  for(const f of w.flames)drawFlames(f);
  for(const e of w.foes)if(e.alive&&e.active)drawFoe(e);
  if(w.boss)drawBoss(w.boss);
  for(const b of w.eshots)drawShot(b);
  for(const b of w.shots)drawShot(b);
  const o=ghostAt(i);if(o&&o.x>x0-20&&o.x<x1+20)drawHunter(o,.42);
  const q=net&&pl[them].net&&pl[them].lap===p.lap?pl[them]:null;if(q&&q.x>x0-20&&q.x<x1+20)drawHunter(q);
  drawHunter(p);
  if(w.freeze>0){g.fillStyle='rgba(60,120,255,.1)';g.fillRect(x0,0,x1-x0,ROWS*T);}
  w.fx.draw(g);w.fx.end(g);
  g.restore();
  if(flash[i]>0){g.fillStyle=`rgba(0,0,0,${flash[i]})`;g.fillRect(0,ly,s.W,lh);}
  if(q)partnerArrow(s,g,{x:0,y:ly,w:s.W,h:lh},(q.x-cam.x)*sc,ly+(q.y-18)*sc,{player:them,color:PCOL[them],label:`${Math.round(Math.abs(q.x-p.x)/T)} m`,size:Math.round(clamp(10*sc,14,24))});
  drawHUD(i,lay);
 }
 const prog=q=>{if(q.finished)return 100;const w=worlds[q.i],B=w.boss,boss=w.crystal?9:B?(B.max-B.hp)/B.max*9:0;return Math.min(99,Math.round(clamp((q.best-L.start)/(L.end-L.start),0,1)*90+boss));};
 const fmtRace=sec=>`${Math.floor(sec/60)}'${String(Math.floor(sec%60)).padStart(2,'0')}"${String(Math.floor(sec*100%100)).padStart(2,'0')}`;
 function txt(str,px,py,size,col=N.white,align='left'){g.font=`900 ${size}px "Courier New",ui-monospace,monospace`;g.textAlign=align;g.textBaseline='top';g.fillStyle=col;g.fillText(str,px,py);}
 function bar(px,py,w,h,n,col){const cw=w/16;for(let k=0;k<16;k++){g.fillStyle=k<n?col:'#3c1c1c';g.fillRect(px+k*cw,py,Math.max(1,cw-1.5),h);}}
 function drawHUD(i,lay){const {hh}=lay,hy=lay.oy,p=pl[i],w=worlds[i],B=w.boss;
  g.fillStyle='#000';g.fillRect(0,hy,s.W,hh);
  const size=Math.round(clamp(hh*.17,9,22)),pad=Math.max(6,s.W*.02),r1=hy+hh*.07,r2=hy+hh*.32,r3=hy+hh*.55,cellW=Math.min(s.W*.36,size*11);
  txt(mode==='hearts'?`HEARTS-${String(p.hearts).padStart(3,'0')}`:`SCORE-${String(p.score).padStart(6,'0')}`,pad,r1,size,mode==='hearts'?N.orange:N.white);
  const left=Math.max(0,HUNT_TIME-clock);txt(`TIME ${mode==='hearts'?String(Math.ceil(left)).padStart(4,'0'):fmtRace(p.finished?p.finishT:clock)}`,s.W*.43,r1,size,mode==='hearts'&&left<10&&(frames>>4)%2?N.orange:N.white);
  txt(`STAGE ${String(p.lap+1).padStart(2,'0')}`,s.W-pad,r1,size,N.white,'right');
  const lw=g.measureText('PLAYER ').width;txt('PLAYER',pad,r2,size);bar(pad+lw,r2+size*.12,cellW,size*.72,p.hp,N.orange);
  txt('ENEMY',pad,r3,size);bar(pad+lw,r3+size*.12,cellW,size*.72,B&&!B.dead?Math.ceil(B.hp/B.max*16):w.crystal?0:w.bossHp?Math.ceil(w.bossHp/BAT_HP*16):16,N.peach);
  // sub-weapon box, hearts, name
  const bx=pad+lw+cellW+size*.8,bw=size*2.6,bh=size*2.05;g.strokeStyle=N.red;g.lineWidth=Math.max(1.5,size*.14);g.strokeRect(bx,r2,bw,bh);
  if(p.sub){g.save();g.translate(bx+bw/2,r2+bh*.86);const k=size/9;g.scale(k,k);g.imageSmoothingEnabled=false;drawPickup(p.sub,0,0);g.restore();}
  const hx=bx+bw+size*.6;g.save();g.translate(hx+size*.35,r2+size*.95);g.scale(size/11,size/11);drawHeart(0,0,false);g.restore();txt(`-${String(p.hearts).padStart(2,'0')}`,hx+size*.75,r2,size);
  txt(`P-${s.players[i].name.toUpperCase().slice(0,8)}`,hx,r3,size,PCOL[i]);
  // progress strip (both players) and the target to beat
  const sw=Math.min(s.W*.5,320),sx=(s.W-sw)/2,sy=hy+hh*.88;g.fillStyle='rgba(255,255,255,.18)';g.fillRect(sx,sy-1,sw,2);
  const gh=net?(pl[them].net?pl[them]:null):ghostAt(i),track=q=>clamp((q.best-L.start)/(L.end-L.start),0,1);for(const q of gh?[gh,p]:[p]){g.save();g.globalAlpha=q===p?1:.6;g.fillStyle=PCOL[q.i];g.beginPath();g.arc(sx+track(q)*sw,sy,q===p?size*.32:size*.24,0,7);g.fill();g.restore();}
  if(net&&phase!=='title'){const q=pl[them],first=Math.min(p.finished?p.finishT:Infinity,q.finished?q.finishT:Infinity);
   txt(`${s.players[them].name.toUpperCase().slice(0,9)}: ${mode==='hearts'?q.hearts+' HEARTS':q.score+(q.finished?' · CRYSTAL':'')}`,s.W/2,hy+hh+size*.3,Math.round(size*.8),PCOL[them],'center');
   if(mode==='boss'&&first<Infinity&&!(p.finished&&q.finished)&&phase==='play'){const left=Math.max(0,Math.ceil(first+NET_GRACE-clock));outlined(g,p.finished?`${s.players[them].name.toUpperCase()} HAS ${left} s`:`GRAB THE CRYSTAL! ${left}`,s.W/2,lay.ly+lay.lh*.2,{size:size*1.3,fill:left<=3?N.orange:N.gold,stroke:'#000'});}}
  if(i===1&&phase!=='title'&&!net){const q=pl[0];txt(`BEAT ${s.players[0].name.toUpperCase().slice(0,9)}: ${mode==='hearts'?q.hearts+' HEARTS':q.finished?fmtRace(q.finishT):prog(q)+'%'}`,s.W/2,hy+hh+size*.3,Math.round(size*.8),PCOL[0],'center');}
  const ly=lay.ly,lh=lay.lh;
  if(p.dead&&p.dead>20)outlined(g,p.pit?'INTO THE ABYSS!':'YOU DIED',s.W/2,ly+lh*.45,{size:size*1.5,fill:N.white,stroke:'#000'});
  if(mode==='boss'&&p.finished&&phase==='play')outlined(g,'STAGE CLEAR',s.W/2,ly+lh*.42,{size:size*1.6,fill:N.gold,stroke:'#000'});
  if(w.locked&&B&&B.state==='sleep')outlined(g,'BOSS!',s.W/2,ly+lh*.3,{size:size*1.6,fill:N.orange,stroke:'#000'});
  // touch guides under the screen
  if(touchUI||clock<6&&phase==='play'){const a=touchUI?1:clamp(1-clock/6,0,1),gy=Math.min(s.H-Math.min(s.H*.12,52),Math.max(ly+lh+60,s.H*.82));g.save();g.strokeStyle=N.white;g.fillStyle=N.white;g.lineWidth=2;
   const rr=Math.min(s.W*.09,44,s.H*.1);
   for(const [x,label,on] of [[s.W*.67,'B · WHIP',0],[s.W*.89,'A · JUMP',pads.jump]]){g.globalAlpha=(on?.4:.16)*a;g.beginPath();g.arc(x,gy,rr,0,7);g.fill();g.globalAlpha=.6*a;outlined(g,label,x,gy,{size:Math.round(rr*.3),fill:N.white,stroke:'#000'});}
   const st=pads.stick;if(st){g.globalAlpha=.25;g.beginPath();g.arc(st.sx,st.sy,40,0,7);g.stroke();g.globalAlpha=.4;g.beginPath();g.arc(clamp(st.x,st.sx-44,st.sx+44),clamp(st.y,st.sy-44,st.sy+44),16,0,7);g.fill();}
   else{g.globalAlpha=.16*a;g.beginPath();g.arc(s.W*.2,gy,rr,0,7);g.stroke();g.globalAlpha=.5*a;outlined(g,'◀ WALK ▶',s.W*.2,gy-rr*.15,{size:Math.round(rr*.28),fill:N.white,stroke:'#000'});outlined(g,'▲ STAIRS ▼',s.W*.2,gy+rr*.3,{size:Math.round(rr*.22),fill:N.white,stroke:'#000'});}
   g.restore();}
 }
 function drawTitle(t){
  const W=s.W,H=s.H,a=t>2.0?Math.max(0,1-(t-2.0)/.45):1;g.save();g.globalAlpha=a;g.fillStyle='#000';g.fillRect(0,0,W,H);
  const size=Math.min(W*.065,H*.06,38);
  g.fillStyle='rgba(252,224,168,.9)';g.beginPath();g.arc(W*.78,H*.2,size*1.4,0,7);g.fill();
  g.fillStyle='#14143c';g.beginPath();g.moveTo(0,H*.62);for(const [x,y] of [[.1,.5],[.16,.5],[.16,.38],[.2,.32],[.24,.38],[.24,.46],[.4,.46],[.4,.3],[.44,.22],[.48,.3],[.48,.44],[.62,.44],[.62,.36],[.66,.3],[.7,.36],[.7,.5],[1,.5]])g.lineTo(W*x,H*y);g.lineTo(W,H*.62);g.fill();
  for(let k=0;k<5;k++){const bx=W*(.15+k*.17)+Math.sin(t*3+k)*12,by=H*(.14+(k%2)*.08);g.fillStyle='#3c3cbc';g.fillRect(bx-9,by-2+(Math.floor(t*8+k)%2)*3,7,3);g.fillRect(bx+2,by-2+(Math.floor(t*8+k)%2)*3,7,3);g.fillStyle='#000';g.fillRect(bx-2,by-2,4,4);}
  g.font=`900 ${size}px "Courier New",ui-monospace,monospace`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=N.red;g.fillText(mode==='hearts'?'NIGHT OF THE CANDLES':'VAMPIRE KILLER DASH',W/2,H*.68);
  for(let i=0;i<2;i++){const cx=W/2+(i?1:-1)*Math.min(W*.22,150),cy=H*.53;s.sprite(g,i,cx,cy,size*2,{exact:true,mood:'happy'});g.font=`900 ${size*.5}px "Courier New",ui-monospace,monospace`;g.fillStyle=PCOL[i];g.fillText(`PLAYER-${i+1} ${s.players[i].name.toUpperCase().slice(0,8)}`,cx,cy+size*1.4);}
  g.font=`900 ${size*.42}px "Courier New",ui-monospace,monospace`;g.fillStyle=N.cream;g.fillText(mode==='hearts'?'MOST HEARTS IN 60 SECONDS':'FASTEST TO SLAY THE PHANTOM BAT',W/2,H*.77);
  g.restore();
 }
 const teleport=(i,X)=>{const q=pl[i];let cc=Math.floor(X/T);while(cc<L.W-1&&!(worlds[i].tiles[FL*MAXC+cc]&&!worlds[i].tiles[(FL-1)*MAXC+cc]&&!worlds[i].tiles[(FL-2)*MAXC+cc]))cc++;
  Object.assign(q,{x:cc*T+8,y:FL*T,vx:0,vy:0,grounded:true,stair:null,dead:0,pit:false,hurt:false,whip:null});q.best=Math.max(q.best,q.x);cams[i].x=Math.max(0,q.x-120);};
 s.debug={log,get phase(){return phase;},get clock(){return clock;},get turn(){return turn;},ghost,pl,L,worlds,cams,inputs,setClock(v){clock=v;},teleport,
  toBoss(i){teleport(i,L.arena?L.arena.x0+60:L.end-40);},hurtBoss(i,n){const B=worlds[i].boss;if(B&&!B.dead){B.inv=0;damageBoss(pl[i],worlds[i],n);}}};
 if(net)setTimeout(()=>{if(s.debug)s.debug.bot=()=>{if(!bot){bot={t:0,stuck:0};return 'drive';}return '';};},0);

 // ---------------- online (see the top of the file)
 let nf=null,netStarted=false,netScores=null,bot=null;
 function ev(e){nf?.event(e);}
 // the bat goes after the nearer hunter in the arena (online, on player 1's phone)
 function batTarget(p,w){const q=pl[them];if(!net||!q.net||q.dead||q.lap!==p.lap||q.x<L.arena.x0)return p;if(p.dead)return q;return Math.abs(q.x-w.boss.x)<Math.abs(p.x-w.boss.x)?q:p;}
 const packP=p=>({...snap(p),i:p.i,sc:p.score,h:p.hearts,b:Math.round(p.best),lap:p.lap,f:p.finished?1:0,ft:+p.finishT.toFixed(2),hp:p.hp,sub:p.sub,inv:p.inv>0?1:0,flash:p.flash>0?1:0});
 function unpackP(o){const q=pl[them];if(!o||typeof o!=='object')return;const first=!q.net||q.lap!==o.lap;q.net={o,at:performance.now()};
  Object.assign(q,{facing:o.facing,crouch:o.crouch,whip:o.whip,lvl:o.lvl,dead:o.dead,stair:o.stair,grounded:o.grounded,hurt:o.hurt,vx:o.vx,throwT:o.throwT,score:o.sc,hearts:o.h,lap:o.lap,hp:o.hp,sub:o.sub,inv:o.inv?30:0,flash:o.flash?20:0});
  q.best=Math.max(q.best,o.b);if(o.f&&!q.finished){q.finished=true;q.finishT=o.ft;}if(first){q.x=o.x;q.y=o.y;}}
 function stepRemote(dt){const q=pl[them],n=q.net;if(!n)return;const o=n.o,k=1-Math.exp(-dt*16);if(Math.abs(o.x-q.x)>80){q.x=o.x;q.y=o.y;}else{q.x+=(o.x-q.x)*k;q.y+=(o.y-q.y)*k;}if(q.grounded&&Math.abs(q.vx)>.05||q.stair)q.anim+=.12*dt*60;}
 function unpackBat(b){const w=worlds[me],A=L.arena;if(!A||!Array.isArray(b))return;const [x0,y0,st,hp]=b;
  if(!w.boss){if(st==='gone'&&w.crystal)return;wakeBat(w,pl[me]);w.boss.x=x0;w.boss.y=y0;}
  const B=w.boss,prev=B.state;B.nx=x0;B.ny=y0;B.hp=hp;
  if(st!==prev){B.state=st;B.t=0;if((st==='die'||st==='gone')&&!B.dead){B.dead=true;batDown(pl[me]);}
   if(st==='gone'&&!w.crystal){w.crystal=true;dropItem(w,'crystal',A.cx,2*T);}}}
 function onNetEvent(e){const p=pl[me],w=worlds[me];
  if(e.cd){const [lap,k]=e.cd,cd0=lap===p.lap&&w.candles[k];if(cd0&&cd0.alive){cd0.alive=false;w.fx.burst(cd0.x,cd0.y,{n:6,colors:[N.white,N.orange,N.gold],speed:50,life:.3,size:1.6});}}
  else if(e.wb){const [lap,cc,r]=e.wb;if(lap===p.lap&&w.tiles[r*MAXC+cc]){w.tiles[r*MAXC+cc]=0;w.hidden.delete(r*MAXC+cc);w.fx.burst(cc*T+8,r*T+8,{n:8,colors:['#a87848','#5c3818',N.lgray],speed:70,life:.4,size:2,gravity:200});}}
  else if(e.fk){const [lap,home]=e.fk;if(lap===p.lap)for(const f of w.foes)if(f.alive&&!f.spawned&&f.home===home&&f.state!=='dying'){f.state='dying';f.t=0;f.active=true;break;}}
  else if(e.bh&&host){const B=w.boss;if(B&&!B.dead&&B.state!=='sleep')damageBoss(p,w,+e.bh||0,true);}
  else if(e.bf&&!host){const [x0,y0,vx,vy]=e.bf;w.eshots.push({kind:'fire',x:x0,y:y0,vx,vy,g:0,t:0});}}
 if(net){nf=netField(s,{hz:20,pack:()=>{const o={p:packP(pl[me]),c:+clock.toFixed(2)};const B=worlds[me].boss;if(host&&B)o.b=[Math.round(B.x),Math.round(B.y),B.state,B.hp];return o;},
  unpack:(i,d)=>{if(!d)return;unpackP(d.p);if(!host&&d.b&&mode==='boss')unpackBat(d.b);},onEvent:onNetEvent});}
 // the boss run ends 10 s after the first crystal (or when both have one); the candle hunt after 60 s
 const netOver=()=>{const p=pl[me],q=pl[them];if(mode==='hearts')return clock>=HUNT_TIME;if(clock>=RACE_CAP)return true;
  if(p.finished&&q.finished)return clock-Math.max(p.finishT,q.finishT)>2.5;return clock>Math.min(p.finished?p.finishT:Infinity,q.finished?q.finishT:Infinity)+NET_GRACE;};
 async function netEnd(){phase='net-end';endT=0;const p=pl[me],mine={sc:p.score,h:p.hearts,f:p.finished?1:0,t:+p.finishT.toFixed(2),b:Math.round(p.best)};nf.finish(mine);
  const o=await nf.remoteDone();if(!o||!s.alive)return;const q=pl[them];Object.assign(q,{score:o.sc,hearts:o.h,finished:!!o.f,finishT:o.t});q.best=Math.max(q.best,o.b);
  const F=[];F[me]=mine;F[them]=o;const v=F.map(f=>mode==='hearts'?f.h:f.sc);winner=v[0]===v[1]?-2:v[0]>v[1]?0:1;netScores=v;
  phase='end';endT=0;endText=winner===-2?'A DRAW IN THE DARK!':`${s.players[winner].name.toUpperCase()} WINS!`;if(winner>=0)s.react(winner,'win');jingle([523,659,784,1047,1319],{type:'square',vol:.035,step:.1});}
 // online test bot: walks right whipping, jumps when stuck, climbs the stairs it meets
 function botInput(inp){const p=pl[me];bot.t++;inp.r=1;inp.l=0;inp.u=0;inp.d=0;inp.jump=0;if(bot.t%28===0)inp.atk=1;
  if(p.grounded&&Math.abs(p.vx)<.1&&!p.whip)bot.stuck++;else bot.stuck=0;if(bot.stuck>20||bot.t%150===0){inp.press=1;bot.stuck=0;}
  const B=worlds[me].boss;if(B&&!B.dead&&B.state!=='sleep'){inp.r=p.x<B.x-20?1:0;inp.l=p.x>B.x+20?1:0;if(bot.t%40===0)inp.press=1;}
  const it=worlds[me].items.find(q=>q.type==='crystal');if(it){inp.r=p.x<it.x?1:0;inp.l=p.x>it.x?1:0;}}
 // ---------------- turns: title → P1 hand-off → countdown → run → P2 hand-off → countdown → run vs ghost → results
 const score=q=>mode==='hearts'?`${q.hearts} hearts`:q.finished?fmtRace(q.finishT):`${prog(q)}% of the way`;
 async function beginTurn(i){
  // online: no hand-off; both phones start the countdown together
  if(net){phase='wait';await nf.start('go');if(!s.alive||netStarted)return;netStarted=true;clock=0;acc=0;cd=new Countdown(3);phase='count';cams[me].x=0;return;}
  phase='handoff';turn=i;pads.stick=null;pads.jump=null;clearKeys();for(const inp of inputs)Object.assign(inp,{l:0,r:0,u:0,d:0,jump:0,press:0,atk:0,sub:0});
  const n0=s.players[0].name,desc=s.solo?(mode==='hearts'?`Night ${soloCleared+1}: whip candles and monsters for at least ${heartGoal()} hearts in 60 seconds to reach the next night.`:`Castle run ${soloCleared+1}: slay the Phantom Bat within ${fmtRace(raceCap())} to go again with less time.`):i===0?(mode==='hearts'?`You go first: whip candles and monsters for as many hearts as you can in 60 seconds. ${s.players[1].name} plays next against your ghost.`:`You go first: get through the castle and slay the Phantom Bat as fast as you can. ${s.players[1].name} plays next against your ghost.`)
   :(mode==='hearts'?`Beat ${n0}'s ${pl[0].hearts} hearts in 60 seconds. ${n0}'s ghost runs beside you.`:`Beat ${n0}'s ${pl[0].finished?'time of '+fmtRace(pl[0].finishT):'run'}. Follow or overtake ${n0}'s ghost.`);
  if(!await s.pass(i,desc,'Ready — start my countdown',s.solo?{soloTitle:mode==='hearts'?`Night ${soloCleared+1}`:`Castle run ${soloCleared+1}`,summary:soloCleared?`${soloTotal.toLocaleString()} points so far.`:null}:{summary:i?`${n0}: ${score(pl[0])}. ${s.players[1].name}, take the controls.`:null}))return;
  clock=0;acc=0;gi=0;cd=new Countdown(3);phase='count';cams[i].x=0;
 }
 const soloPoints=p=>mode==='hearts'?p.hearts*10:p.finished?1000+Math.max(0,Math.round((raceCap()-p.finishT)*10)):prog(p)*5;
 function soloAfter(){const p=pl[0],pts=soloPoints(p);soloTotal+=pts;
  if(!soloOk)return soloFinish(s,soloTotal,soloCleared,mode==='hearts'?`Night of the Candles solo: ${soloCleared} night${soloCleared===1?'':'s'} survived; ${p.hearts}/${heartGoal()} hearts on the last.`:`Vampire Killer solo: the bat fell ${soloCleared} time${soloCleared===1?'':'s'}; last run ${score(p)}.`);
  soloCleared++;soloProgress(s,soloTotal,soloCleared,mode==='hearts'?`Night of the Candles solo: ${soloCleared} night${soloCleared===1?'':'s'} survived.`:`Vampire Killer solo: the bat fell ${soloCleared} time${soloCleared===1?'':'s'}.`);
  L=buildCastle(s.random,mode);worlds[0]=makeWorld(L,Math.floor(s.random()*1e9));pl[0]=makePlayer(0,L,mode);beginTurn(0);}
 const turnOver=p=>mode==='hearts'?clock>=HUNT_TIME:p.finished&&clock-p.finishT>2.5||clock>=raceCap()||turn===1&&pl[0].finished&&!p.finished&&clock>pl[0].finishT+4;
 const still={l:0,r:0,u:0,d:0,jump:0,press:0,atk:0,sub:0};
 // ---------------- main loop
 s.frame((dt,t)=>{
  if(!s.alive)return;
  if(phase==='title'){titleT+=dt;if(titleT>2.45)beginTurn(0);}
  else if(phase==='count'){const lay=layout();cams[turn].w=s.W/lay.sc;updateCamera(pl[turn],turn);if(!cd.update(dt)){phase='play';for(const inp of inputs){inp.press=0;inp.atk=0;inp.sub=0;}}}
  else if(phase==='play'||phase==='turn-end'||phase==='end'||phase==='net-end'){
   if(!cd.done)cd.update(dt);acc+=dt;let steps=0;const i=turn,p=pl[i];
   if(net){stepRemote(dt);nf.tick(dt);
    // player 1's phone wakes the bat when the partner walks into the boss room first
    const w=worlds[me],q=pl[them],A=L.arena;if(host&&mode==='boss'&&A&&!w.locked&&!w.crystal&&q.net&&q.lap===p.lap&&q.x>A.x0+40&&!q.dead)wakeBat(w,p);}
   while(acc>=STEP&&steps<5){acc-=STEP;steps++;frames++;simT+=STEP;
    if(phase==='play'){clock+=STEP;const inp=inputs[i];readInput(i);stepPlayer(p,worlds[i],inp);stepWorld(worlds[i],p);}
    else{stepPlayer(p,worlds[i],still);}
    updateCamera(p,i);
    if(turn===0&&phase!=='end'&&!s.solo&&!net)ghost.push(snap(p));else if(turn===1)gi++;
   }
   if(steps===5)acc=0;
   for(const w of worlds)w.fx.update(dt);for(let k=0;k<2;k++)flash[k]=Math.max(0,flash[k]-dt*1.8);
   if(phase==='play'&&net){if(netOver())netEnd();}
   else if(phase==='net-end'){endT+=dt;}
   else if(phase==='play'){
    if(turnOver(p)){endT=0;
     if(s.solo){soloOk=mode==='hearts'?p.hearts>=heartGoal():p.finished;phase='turn-end';turnText=mode==='hearts'?`${p.hearts}/${heartGoal()} HEARTS`:p.finished?fmtRace(p.finishT):`${prog(p)}% OF THE WAY`;jingle(soloOk?[523,659,784,1047]:[392,330,262],{type:'square',vol:.03,step:.09});}
     else if(turn===0){phase='turn-end';turnText=mode==='hearts'?`${p.hearts} HEARTS`:p.finished?fmtRace(p.finishT):`${prog(p)}% OF THE WAY`;jingle([523,659,784,1047],{type:'square',vol:.03,step:.09});}
     else{phase='end';const a=pl[0],b=pl[1];
      if(mode==='hearts')winner=a.hearts===b.hearts?-2:a.hearts>b.hearts?0:1;
      else if(a.finished&&b.finished)winner=Math.abs(a.finishT-b.finishT)<.01?-2:a.finishT<b.finishT?0:1;
      else if(a.finished||b.finished)winner=a.finished?0:1;else{const pa=prog(a),pb=prog(b);winner=pa===pb?-2:pa>pb?0:1;}
      endText=winner===-2?'A DRAW IN THE DARK!':mode==='hearts'?`${s.players[winner].name.toUpperCase()} WINS!`:pl[winner].finished?`${s.players[winner].name.toUpperCase()} SLEW THE BAT!`:`${s.players[winner].name.toUpperCase()} GOT FURTHEST!`;
      if(winner>=0)s.react(winner,'win');jingle([523,659,784,1047,1319],{type:'square',vol:.035,step:.1});}}
   }else if(phase==='turn-end'){endT+=dt;if(endT>2.4){if(s.solo){phase='handoff';soloAfter();return;}beginTurn(1);}}
   else{endT+=dt;if(endT>3.4){
    if(net){s.finish(netScores,mode==='hearts'?`Night of the Candles live: ${s.players[0].name} ${pl[0].hearts} hearts, ${s.players[1].name} ${pl[1].hearts} hearts.`:`Vampire Killer together: ${s.players[0].name} ${pl[0].score} points${pl[0].finished?'':' (no crystal)'}, ${s.players[1].name} ${pl[1].score} points${pl[1].finished?'':' (no crystal)'}.`);return;}
    if(mode==='hearts'){const a=pl[0].hearts,b=pl[1].hearts;s.finish([a,b],`Night of the Candles: ${s.players[0].name} ${a} hearts, ${s.players[1].name} ${b} hearts.`);}
    else{const sc=[prog(pl[0]),prog(pl[1])];if(winner>=0){sc[winner]=100;sc[1-winner]=Math.min(sc[1-winner],99);}
     s.finish(sc,`Vampire Killer Dash: ${s.players[0].name} ${score(pl[0])}, ${s.players[1].name} ${score(pl[1])}.`);}
    return;}}
   if(s.solo)s.setScores([soloTotal+(phase==='play'||phase==='turn-end'?soloPoints(pl[0]):0),0]);else if(net&&mode==='boss')s.setScores(pl.map(q=>q.score));else if(mode==='hearts')s.setScores([pl[0].hearts,pl[1].hearts]);else s.setScores(pl.map(prog));
  }
  // draw
  g.fillStyle='#000';g.fillRect(0,0,s.W,s.H);
  drawView(turn);
  if(phase==='title')drawTitle(titleT);
  if(phase==='count'||!cd.done&&phase==='play')cd.draw(g,s.W,s.H);
  if(phase==='wait'||phase==='net-end')outlined(g,`WAITING FOR ${s.players[them].name.toUpperCase()}…`,s.W/2,s.H*.3,{size:Math.min(s.W*.05,22),fill:N.gold,stroke:'#000'});
  if(phase==='turn-end'||phase==='end'){const a=Math.min(1,endT*3),size=Math.min(s.W*.07,s.H*.07,46);g.save();g.globalAlpha=a;g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,s.H*.4,s.W,s.H*.2);
   if(phase==='turn-end'){outlined(g,s.solo&&!soloOk&&mode==='hearts'?'NOT ENOUGH HEARTS':mode==='boss'&&pl[0].finished?'STAGE CLEAR!':'TIME UP',s.W/2,s.H/2-size*.3,{size,fill:N.gold,stroke:'#000'});outlined(g,`${s.players[0].name.toUpperCase()}: ${turnText}`,s.W/2,s.H/2+size*.75,{size:size*.5,fill:N.white,stroke:'#000'});}
   else{outlined(g,mode==='hearts'&&endT<1.2?'TIME UP':endText,s.W/2,s.H/2-size*.3,{size,fill:N.gold,stroke:'#000'});
    const sub=mode==='hearts'?`${pl[0].hearts} HEARTS  ·  ${pl[1].hearts} HEARTS`:pl.map(q=>q.finished?fmtRace(q.finishT):`${prog(q)}%`).join('  ·  ');outlined(g,sub,s.W/2,s.H/2+size*.75,{size:size*.5,fill:N.white,stroke:'#000'});}
   g.restore();}
 });
}
Object.assign(exports,{castlevania,buildCastle});
