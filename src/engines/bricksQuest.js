// Bricks Breaker Quest (bricks-breaker-quest): a replica of the mobile game, separate from the Daft Punk Neon Ball
// Storm (ballvolley). Opens on the neon stage map (BRICKS / BREAKER QUEST logo, gems, stars, the snaking stage tiles
// and the SHOP / BALL / CLASSIC / MULTI / 100BALLS bar); the player picks a stage, then P1 plays it and P2 plays the
// same stage. Higher score wins. Quest progress (stars per stage, gems) is shared and saved in profile.bricksQuest;
// stages never run out (src/data/bricksQuestLevels.js generates every number past the hand-built ones).
// Screen layout copies the 576x1024 phone screenshots: HUD (fast-forward ring, STAGE- N, star bar, score, pause ring),
// a 9x11 neon-framed field, and the bottom bar (lightning x3, aim slider, ball plus x3; while balls fly: the red
// recall button and the 200-gem rewind). Everything is drawn in those 576-wide units and scaled to fit the screen.
const S=require("src/engines/bricksQuestSim.js");
const {stage:stageDef}=require("src/data/bricksQuestLevels.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {sound,tone,vibrate}=require("src/audio.js");
const {seededRandom}=require("src/utils.js");

const VW=576,CELL=62,FX=(VW-CELL*S.COLS)/2,FT=118,FW=CELL*S.COLS,FH=CELL*S.ROWS,FB=FT+FH,BY=888,STACK=940,MAPH=1024;
const NEON={cyan:'#3fe3ff',pink:'#ff3fd0',purple:'#b04dff',red:'#ff3355',gold:'#ffd75a',white:'#f4fbff'};
const ITEMS=3,REWIND=200,CONTINUE=200,START_GEMS=120;
const TAU=Math.PI*2;

function questSave(){const p=store.profile;let q=p.bricksQuest;
 if(!q||typeof q!=='object')q=p.bricksQuest={cleared:0,stars:{},gems:START_GEMS,reward:0,gift:''};
 if(!Number.isFinite(q.cleared))q.cleared=0;if(!q.stars||typeof q.stars!=='object')q.stars={};if(!Number.isFinite(q.gems))q.gems=START_GEMS;if(!Number.isFinite(q.reward))q.reward=0;
 return q;}
const totalStars=q=>Object.values(q.stars).reduce((a,b)=>a+(+b||0),0);

// ---- drawing helpers -------------------------------------------------------------------------------------------
function rr(x,px,py,w,h,r){x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();}
function glow(x,color,blur){x.shadowColor=color;x.shadowBlur=blur;}
function noGlow(x){x.shadowBlur=0;x.shadowColor='transparent';}
function star(x,cx,cy,r,inner=.45){x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=i%2?r*inner:r;x.lineTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);}x.closePath();}
function text(x,str,px,py,{size=16,weight=600,color='#fff',align='center',base='middle',font='Arial, Helvetica, sans-serif',glowC=null,blur=0}={}){
 x.font=`${weight} ${size}px ${font}`;x.textAlign=align;x.textBaseline=base;x.fillStyle=color;if(glowC){glow(x,glowC,blur);}x.fillText(str,px,py);if(glowC)noGlow(x);}
function mix(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
function lighten(hex,t){const n=parseInt(hex.slice(1),16),c=[n>>16&255,n>>8&255,n&255].map(v=>Math.round(v+(255-v)*t));return `rgb(${c})`;}
function offscreen(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;}

// brick outline paths in cell-local virtual units (0..CELL)
function brickPath(x,shape,o=0){const g=S.GAP*CELL+o,a=g,b=CELL-g;
 if(shape==='s'){rr(x,a,a,b-a,b-a,7-o*.6);return;}
 const P=shape==='a'?[[a,a],[b,a],[a,b]]:shape==='b'?[[a,a],[b,a],[b,b]]:shape==='c'?[[a,a],[b,b],[a,b]]:[[b,a],[b,b],[a,b]];
 if(o){const cx=(P[0][0]+P[1][0]+P[2][0])/3,cy=(P[0][1]+P[1][1]+P[2][1])/3;for(const p of P){p[0]+=(cx-p[0])*o*.06;p[1]+=(cy-p[1])*o*.06;}}
 x.beginPath();x.moveTo(...P[0]);x.lineTo(...P[1]);x.lineTo(...P[2]);x.closePath();}
function textSpot(shape){const g=S.GAP*CELL,a=g,b=CELL-g;if(shape==='s')return [CELL/2,CELL/2+1];
 const P=shape==='a'?[[a,a],[b,a],[a,b]]:shape==='b'?[[a,a],[b,a],[b,b]]:shape==='c'?[[a,a],[b,b],[a,b]]:[[b,a],[b,b],[a,b]];
 return [(P[0][0]+P[1][0]+P[2][0])/3,(P[0][1]+P[1][1]+P[2][1])/3+1];}

// Sprite caches are rebuilt whenever the scale changes.
function makeCache(){return {k:0,bricks:new Map(),ball:null,tiles:new Map(),bg:null,bgKey:''};}
function brickSprite(C,k,color,shape,kind){const key=color+shape+kind;let sp=C.bricks.get(key);if(sp)return sp;
 const pad=12,cv=offscreen((CELL+pad*2)*k,(CELL+pad*2)*k),x=cv.getContext('2d');x.scale(k,k);x.translate(pad,pad);x.lineJoin='round';
 // dark tinted glass body
 brickPath(x,shape);const gr=x.createLinearGradient(0,0,0,CELL);gr.addColorStop(0,mix(color,.34));gr.addColorStop(1,mix(color,.2));x.fillStyle=gr;x.fill();
 // neon rim: outer glow, bright stroke, pale inner line
 glow(x,color,11);x.strokeStyle=color;x.lineWidth=3;brickPath(x,shape);x.stroke();x.stroke();noGlow(x);
 x.strokeStyle=lighten(color,.55);x.globalAlpha=.55;x.lineWidth=1.2;brickPath(x,shape,3.2);x.stroke();x.globalAlpha=1;
 if(kind==='h'||kind==='v'){x.save();x.translate(CELL/2,CELL/2);if(kind==='h')x.rotate(Math.PI/2);x.fillStyle=lighten(color,.15);glow(x,color,6);
  // a long double-headed arrow (the laser bricks in the screenshots)
  x.beginPath();x.moveTo(0,-24);x.lineTo(9,-12);x.lineTo(4,-12);x.lineTo(4,12);x.lineTo(9,12);x.lineTo(0,24);x.lineTo(-9,12);x.lineTo(-4,12);x.lineTo(-4,-12);x.lineTo(-9,-12);x.closePath();x.globalAlpha=.85;x.fill();x.restore();noGlow(x);}
 if(kind==='x'){x.strokeStyle=lighten(color,.2);x.lineWidth=2.4;glow(x,color,6);rr(x,15,15,CELL-30,CELL-30,4);x.stroke();noGlow(x);x.fillStyle=mix(color,.45);rr(x,19,19,CELL-38,CELL-38,3);x.fill();}
 sp={cv,pad};C.bricks.set(key,sp);return sp;}
function ballSprite(C,k){if(C.ball)return C.ball;const R=18,cv=offscreen(R*2*k,R*2*k),x=cv.getContext('2d');x.scale(k,k);
 const g=x.createRadialGradient(R,R,0,R,R,R);g.addColorStop(0,'#fff');g.addColorStop(.36,'#fff');g.addColorStop(.46,'#f3c8ff');g.addColorStop(.58,'rgba(214,80,255,.55)');g.addColorStop(1,'rgba(170,40,255,0)');
 x.fillStyle=g;x.fillRect(0,0,R*2,R*2);C.ball={cv,R};return C.ball;}

// ---- the engine --------------------------------------------------------------------------------------------------
async function bricksQuest(s){
 const [c,x]=s.canvas(576,1024,{fill:true});const fb=fullBleed(s,{bg:'#05080b'});s.body.classList.add('drag-arena-body');
 const Q=questSave(),arcade=!!store.arcade,names=[0,1].map(i=>s.players[i]?.name||`P${i+1}`);
 const C=makeCache(),fx={parts:[],pops:[],rings:[],beams:[],bolts:[],flies:[],presses:[],toast:null},beamOn=new Map();
 let view='map',turn=0,T=0,play=null,mapScroll=null,mapDrag=null,mapPick=null,tilePulse=0,lastHit=0,lastKill=0,lastBeam=0;
 const scores=[0,0],results=[null,null];
 s.debug={get view(){return view;},get play(){return play;},get turn(){return turn;},bot:false,pick:null,quest:Q};

 // layout: k scales 576-wide virtual units to the screen; the stack is centred with room for the floating pills
 let L={};
 function layout(){const W=s.W,H=s.H,topR=Math.max(fb.top||44,40),botR=36;
  if(view==='map'){const k=Math.min(W/VW,(H-topR-botR+30)/MAPH);L={k,ox:(W-VW*k)/2,oy:Math.max(topR-6,(H-MAPH*k)/2),W,H};}
  else{const k=Math.min(W/VW,(H-topR-botR)/STACK),spare=H-topR-botR-STACK*k;L={k,ox:(W-VW*k)/2,oy:topR+spare*.55,W,H};}
  if(C.k!==L.k){C.k=L.k;C.bricks.clear();C.ball=null;C.tiles.clear();C.bg=null;}}
 const toV=ev=>{const p=s.pointer(ev);return {x:(p.x-L.ox)/L.k,y:(p.y-L.oy)/L.k};};

 // ---- sounds (throttled: a hundred balls hitting at once must not flood WebAudio) ----
 function sfx(kind){const now=performance.now();
  if(kind==='hit'){if(now-lastHit<38)return;lastHit=now;tone(1250+Math.random()*250,.025,.012,'square');}
  else if(kind==='kill'){if(now-lastKill<45)return;lastKill=now;tone(660+Math.min(900,(play?.st.combo||0)*28),.07,.03,'triangle');}
  else if(kind==='launch')tone(520,.04,.015,'sine');
  else if(kind==='laser'){tone(1800,.12,.02,'sawtooth');}
  else if(kind==='beam'){if(now-lastBeam<90)return;lastBeam=now;tone(2200+Math.random()*300,.06,.012,'sawtooth');}
  else if(kind==='bolt'){sound('shot');vibrate(30);}
  else sound(kind);}
 // every button answers a tap: a short buzz (phones that support it) and a white flash ring where it was pressed
 function press(px,py,r=40){vibrate(9);fx.presses.push({x:px,y:py,r,t:0});}

 // ================================ STAGE MAP ================================
 function tileXY(n){const j=Math.floor((n-1)/5),i=(n-1)%5,col=j%2?4-i:i;return {x:68+col*110,y:-j*125};}
 const MAP_TOP=300,MAP_BOT=896;
 function current(){return Q.cleared+1;}
 // mapScroll = how far the snake is pushed down (0 = stage 1 on the bottom row); tile n sits ~2 rows above the bottom
 const mapScrollFor=n=>Math.max(0,Math.floor((n-1)/5)*125-250),maxScroll=()=>mapScrollFor(current()+150);
 const tileY=n=>MAP_BOT-60+tileXY(n).y+mapScroll;
 const visibleRange=()=>{const j0=Math.max(0,Math.floor((mapScroll-130)/125)),j1=Math.ceil((mapScroll+MAP_BOT-MAP_TOP+60)/125);return [j0*5+1,j1*5+5];};
 function drawMap(){
  const k=L.k;
  // background
  const bg=x.createLinearGradient(0,0,0,L.H);bg.addColorStop(0,'#0c2129');bg.addColorStop(.3,'#05090c');bg.addColorStop(1,'#07050c');x.fillStyle=bg;x.fillRect(0,0,L.W,L.H);
  x.save();x.translate(L.ox,L.oy);x.scale(k,k);
  // logo: BRICKS in six neon boxes, BREAKER QUEST beneath
  const letters=[['B','#47e6ff'],['R','#c4f04c'],['I','#ffe03a'],['C','#d65cff'],['K','#ff4b6b'],['S','#6c7dff']];
  letters.forEach(([ch,col],i)=>{const bx=104+i*62.5,by=26;x.fillStyle=mix(col,.25);rr(x,bx,by,56,58,9);x.fill();glow(x,col,12);x.strokeStyle=col;x.lineWidth=3.2;rr(x,bx,by,56,58,9);x.stroke();noGlow(x);
   text(x,ch,bx+28,by+31,{size:36,weight:500,color:lighten(col,.75),glowC:col,blur:8});});
  text(x,'BREAKER QUEST',288,99,{size:21,weight:700,color:'#7fe9ff',glowC:'#2ad0ff',blur:8});
  const divider=y=>{glow(x,NEON.cyan,8);x.strokeStyle=NEON.cyan;x.lineWidth=2.4;x.beginPath();x.moveTo(0,y);x.lineTo(VW,y);x.stroke();noGlow(x);};
  divider(125);divider(204);
  // icon row: gamepad, gift pill, share, MORE GAME, settings
  iconPad(x,40,164);
  x.fillStyle='#1a2a33';rr(x,110,143,182,44,8);x.fill();x.strokeStyle='#5d6c75';x.lineWidth=2;rr(x,110,143,182,44,8);x.stroke();
  gem(x,186,157,7,'#e8f4ff');text(x,'× 30',214,157,{size:14,color:'#e8f4ff'});
  const giftReady=Q.gift!==today();text(x,giftReady?'Tap for a free gift!':'Gift collected today',203,176,{size:12,color:giftReady?'#fff':'#9ab'});
  ringIcon(x,358,165,23,NEON.cyan);shareIcon(x,358,165);ringIcon(x,442,165,23,NEON.cyan);text(x,'MORE',442,159,{size:10,weight:800,color:'#e9fbff'});text(x,'GAME',442,171,{size:10,weight:800,color:'#e9fbff'});
  ringIcon(x,527,165,23,NEON.cyan);gearIcon(x,527,165);
  // currency row
  pill(x,52,222,118,32,NEON.cyan);gem(x,40,238,13,'#ff3048',true);text(x,String(Q.gems),136,238,{size:17,color:'#fff',align:'right'});text(x,'+',157,238,{size:22,weight:800,color:'#7ff0ff'});
  giftBox(x,232,238);pill(x,250,222,110,32,NEON.cyan);gem(x,288,238,7,'#e8f4ff');text(x,'× 30',318,238,{size:15,color:'#e8f4ff'});
  pill(x,438,222,120,32,NEON.cyan);star(x,442,238,17);x.fillStyle='#e6f6ff';glow(x,'#9be8ff',8);x.fill();noGlow(x);text(x,String(totalStars(Q)),538,238,{size:17,color:'#fff',align:'right'});
  // stage tiles (scrolling, snake order)
  if(mapScroll===null)mapScroll=mapScrollFor(Math.max(1,current()));
  x.save();x.beginPath();x.rect(0,MAP_TOP-8,VW,MAP_BOT-MAP_TOP+8);x.clip();
  const [first,last]=visibleRange();
  for(let n=first;n<=last;n++){const p=tileXY(n),ty=tileY(n);if(ty<MAP_TOP-120||ty>MAP_BOT+60)continue;
   drawTile(n,p.x,ty);
   // arrows: between tiles in a row, and '^' at the row's turning end
   const j=Math.floor((n-1)/5),i=(n-1)%5;
   if(i<4){const ax=p.x+(j%2?-55:55);text(x,j%2?'‹':'›',ax,ty,{size:22,weight:700,color:'#7fe4ff',glowC:'#3fd8ff',blur:6});}
   else text(x,'⌃',p.x,ty-62,{size:20,weight:700,color:'#7fe4ff',glowC:'#3fd8ff',blur:6});
  }
  x.restore();
  // bottom nav
  const ny=MAP_BOT+8;const nb=x.createLinearGradient(0,ny,0,MAPH);nb.addColorStop(0,'#2a1240');nb.addColorStop(1,'#3a1a56');x.fillStyle=nb;x.fillRect(0,ny,VW,MAPH-ny+200);
  glow(x,NEON.purple,10);x.strokeStyle='#c46bff';x.lineWidth=3;x.beginPath();x.moveTo(0,ny);x.lineTo(VW,ny);x.stroke();noGlow(x);
  NAV.forEach((t,i)=>{const cx=57+i*115.5,cy=ny+52;t.draw(x,cx,cy);x.fillStyle='#4a1f5e';rr(x,cx-40,cy+33,80,19,7);x.fill();x.strokeStyle='#ff5fd8';x.lineWidth=1.6;rr(x,cx-40,cy+33,80,19,7);x.stroke();
   text(x,t.label,cx,cy+43,{size:12,weight:700,color:'#ffd8f6'});});
  // who is choosing
  text(x,mapPick?'':`${names[0]}, pick a stage`,288,282,{size:15,weight:700,color:'#ffe9a8',glowC:'#ff9a2a',blur:6});
  drawPresses();
  if(fx.toast&&fx.toast.t>0){x.globalAlpha=Math.min(1,fx.toast.t*2);x.fillStyle='#000c';rr(x,60,560,456,64,14);x.fill();x.strokeStyle=NEON.pink;x.lineWidth=2;rr(x,60,560,456,64,14);x.stroke();
   text(x,fx.toast.msg,288,592,{size:17,weight:700,color:'#fff'});x.globalAlpha=1;}
  x.restore();
 }
 function drawTile(n,cx,cy){const k=L.k,cur=current(),stars=+Q.stars[n]||0,locked=n>cur,isCur=n===cur;
  const key=locked?'L':isCur?'C':'D';let sp=C.tiles.get(key);
  if(!sp){const pad=14,cv=offscreen((86+pad*2)*k,(92+pad*2)*k),t=cv.getContext('2d');t.scale(k,k);t.translate(pad,pad);
   const border=locked?'#cfc79a':isCur?'#ffffff':'#ffd75a';
   const g=t.createLinearGradient(0,0,0,92);if(locked){g.addColorStop(0,'#46463d');g.addColorStop(1,'#2c2c27');}else if(isCur){g.addColorStop(0,'#3d3a2a');g.addColorStop(1,'#1f1d14');}else{g.addColorStop(0,'#3b3a26');g.addColorStop(.62,'#2a2a1c');g.addColorStop(1,'#11605f');}
   t.fillStyle=g;rr(t,0,0,86,92,8);t.fill();glow(t,locked?'#9c9568':border,isCur?16:10);t.strokeStyle=border;t.lineWidth=isCur?4:3;rr(t,0,0,86,92,8);t.stroke();noGlow(t);
   if(!locked){t.globalAlpha=.6;t.strokeStyle='#5ff0ff';t.lineWidth=2;t.beginPath();t.moveTo(8,90);t.lineTo(78,90);t.stroke();t.globalAlpha=1;}
   sp={cv,pad};C.tiles.set(key,sp);}
  x.drawImage(sp.cv,cx-43-sp.pad,cy-46-sp.pad,86+sp.pad*2,92+sp.pad*2);
  text(x,String(n),cx,cy-17,{size:n>999?20:24,weight:500,color:'#fff'});
  if(locked)padlock(x,cx,cy+18);
  else for(let i=0;i<3;i++){star(x,cx-22+i*22,cy+22,10);x.fillStyle=i<stars?'#e4f7ff':'#0a0a08';if(i<stars)glow(x,'#7fdcff',7);x.fill();noGlow(x);if(i>=stars){x.strokeStyle='#3b3b30';x.lineWidth=1;x.stroke();}}
 }
 const NAV=[
  {label:'SHOP',draw:(x,cx,cy)=>{x.strokeStyle='#fff';x.lineWidth=3.4;x.lineJoin='round';x.beginPath();x.moveTo(cx-24,cy-17);x.lineTo(cx-16,cy-17);x.lineTo(cx-9,cy+8);x.lineTo(cx+18,cy+8);x.lineTo(cx+23,cy-9);x.lineTo(cx-13,cy-9);x.stroke();
   for(const dx of [-6,13]){x.beginPath();x.arc(cx+dx,cy+16,3.6,0,TAU);x.fillStyle='#fff';x.fill();}for(const gx of [-3,5,13]){x.beginPath();x.moveTo(cx+gx,cy-9);x.lineTo(cx+gx-1,cy+8);x.lineWidth=1.6;x.stroke();}}},
  {label:'BALL',draw:(x,cx,cy)=>{x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(cx+3,cy+2,19,-.3,Math.PI*1.25);x.stroke();x.beginPath();x.arc(cx+6,cy+4,9,0,TAU);x.fillStyle='#fff';x.fill();
   x.fillStyle='#ff3a2a';star(x,cx-16,cy-14,18,.72);x.fill();text(x,'-70%',cx-16,cy-14,{size:11,weight:800,color:'#fff'});}},
  {label:'CLASSIC',mode:'classic',draw:(x,cx,cy)=>{x.strokeStyle='#fff';x.lineWidth=3;rr(x,cx-18,cy-20,36,38,5);x.stroke();text(x,'9',cx,cy,{size:21,weight:700,color:'#fff'});}},
  {label:'MULTI',draw:(x,cx,cy)=>{x.strokeStyle='#fff';x.lineCap='round';for(const sgn of [-1,1]){x.lineWidth=4;x.beginPath();x.moveTo(cx-18*sgn,cy-20);x.lineTo(cx+12*sgn,cy+12);x.stroke();x.lineWidth=3;x.beginPath();x.moveTo(cx+6*sgn,cy+18);x.lineTo(cx+18*sgn,cy+6);x.stroke();}x.lineCap='butt';}},
  {label:'100BALLS',mode:'hundred',draw:(x,cx,cy)=>{x.fillStyle='#fff';star(x,cx,cy,23,.72);x.fill();x.beginPath();x.arc(cx,cy,8,0,TAU);x.fillStyle='#3a1a56';x.fill();x.beginPath();x.arc(cx,cy,4.5,0,TAU);x.fillStyle='#fff';x.fill();}}
 ];
 function toast(msg){fx.toast={msg,t:2.2};}
 function today(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;}
 function mapTap(p){
  if(p.y>MAP_BOT+8){const i=Math.max(0,Math.min(4,Math.floor(p.x/115.2))),t=NAV[i];press(57.6+i*115.2,p.y,44);if(t.mode)return choose({mode:t.mode});
   sfx('tap');return toast(t.label==='MULTI'?'MULTI: you two are already taking turns!':`${t.label} isn’t in ShambConkins — play the stages!`);}
  if(p.y>143&&p.y<187&&p.x>110&&p.x<292){press(p.x,p.y,30);if(Q.gift!==today()){Q.gift=today();Q.gems+=30;saveProfile(store.profile);sound('pickup');toast('Free gift: 💎 × 30');}else toast('Come back tomorrow for another gift');return;}
  if(p.y<MAP_TOP||p.y>MAP_BOT)return;
  const [first,last]=visibleRange();
  for(let n=first;n<=last;n++){const q=tileXY(n),ty=tileY(n);if(Math.abs(p.x-q.x)<46&&Math.abs(p.y-ty)<48){press(q.x,ty,48);
   if(n>current()){sound('lose');return toast(`Stage ${n} is locked — clear stage ${current()} first`);}return choose({mode:'stage',n});}}
 }
 let chooseResolve=null;
 function choose(pick){if(mapPick)return;mapPick=pick;sound('card');setTimeout(()=>chooseResolve?.(pick),220);}

 // ================================ STAGE PLAY ================================
 function newPlay(pick){
  const def=pick.mode==='stage'?stageDef(pick.n):{mode:pick.mode,balls:pick.mode==='hundred'?100:1,rows:[],rng:seededRandom(`${s.seed}-${pick.mode}`)};
  const st=S.newStage(def);
  return {pick,st,phase:'aim',angle:-Math.PI/2+.25,aiming:false,slider:false,bolt:ITEMS,plus:ITEMS,plusArmed:false,gems:arcade?Q.gems:300,snap:null,panel:null,t:0,doneT:0,resolve:null,shownBalls:st.balls};
 }
 // after a turn the wall slides down the rows it dropped (1, or 3 when the top line was cleared)
 // eased in and out over ~half a second (a bit longer for a 3-line drop), then a small dip and settle as it lands
 const slideDur=n=>.5+.16*(n-1);
 const sliding=()=>play?.drop&&play.drop.t<slideDur(play.drop.n);
 function slideY(){const d=play?.drop;if(!d)return 0;const u=Math.min(1,d.t/slideDur(d.n)),m=Math.min(1,u/.78);
  const glide=m<.5?4*m*m*m:1-Math.pow(-2*m+2,3)/2,settle=u>.78?Math.sin(Math.PI*(u-.78)/.22)*.08:0;
  return -(d.n*(1-glide)-settle)*CELL;}
 const originV=()=>({x:FX+play.st.origin*CELL,y:FT+FH-S.BALL_R*CELL});
 function setAngleFromPoint(p){const o=originV();if(p.y>o.y-6)return false;play.angle=S.launchAngleOK(Math.atan2(p.y-o.y,p.x-o.x));return true;}
 const sliderT=a=>(a-(-Math.PI+.14))/(Math.PI-.28);
 function fire(){if(!play||play.phase!=='aim')return;play.drop=null;const st=play.st;play.snap=S.snapshot(st);vibrate(12);
  const count=play.plusArmed?st.balls*2:st.balls;if(play.plusArmed){play.plusArmed=false;play.plus--;}
  S.startVolley(st,play.angle,{count});play.phase='flight';play.aiming=play.slider=false;sfx('launch');}
 function useBolt(){if(!play||play.phase!=='aim'||play.bolt<=0||!play.st.grid.size)return;play.bolt--;const ev=S.lightning(play.st,[]);consume(ev);sfx('bolt');
  if(play.st.result==='clear')finishStage('clear');}
 function usePlus(){if(!play||play.phase!=='aim'||play.plus<=0)return;play.plusArmed=!play.plusArmed;sound('tap');}
 function rewind(){if(!play||play.phase!=='flight'||!play.snap)return;if(play.gems<REWIND){toast('Not enough gems');return;}
  play.gems-=REWIND;if(arcade){Q.gems=play.gems;saveProfile(store.profile);}S.restore(play.st,play.snap);play.phase='aim';fx.parts.length=fx.pops.length=fx.rings.length=fx.beams.length=fx.flies.length=0;sound('card');}
 function recall(){if(play?.phase==='flight'){S.recall(play.st);sound('tap');}}
 function consume(events){for(const e of events){
  if(e.type==='hit'){sfx('hit');if(!e.b.ring||e.b.ring<T-.12){e.b.ring=T;fx.rings.push({c:e.b.c,r:e.b.r,shape:e.b.shape,t:0});}}
  else if(e.type==='kill'){sfx('kill');const b=e.b,cx=FX+(b.c+.5)*CELL,cy=FT+(b.r+.5)*CELL;
   for(let i=0;i<12;i++){const a=Math.random()*TAU,v=60+Math.random()*190;fx.parts.push({x:cx+(Math.random()-.5)*30,y:cy+(Math.random()-.5)*30,vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,s:3+Math.random()*6,color:b.color,t:0,life:.45+Math.random()*.4});}
   fx.pops.push({x:cx,y:cy,str:String(e.pts),t:0});fx.rings.push({c:b.c,r:b.r,shape:b.shape,t:0,kill:true});}
  else if(e.type==='laser'){sfx('laser');fx.beams.push({...e,t:0});}
  else if(e.type==='beam'){sfx('beam');beamOn.set(e.r*S.COLS+e.c,{dir:e.dir,c:e.c,r:e.r,t:T});}
  else if(e.type==='blast'){sfx('laser');fx.rings.push({c:e.c-1,r:e.r-1,shape:'s',t:0,big:true});}
  else if(e.type==='bolt'){fx.bolts.push({...e,t:0,seed:Math.random()});}
  else if(e.type==='pick'){sound('pickup');fx.flies.push({x:FX+e.x*CELL,y:FT+e.y*CELL,t:0});}
 }}
 function finishStage(result){const st=play.st;st.result=result;play.phase=result;play.panelT=0;
  if(result==='clear'){const stars=S.starsFor(st);sound('win');vibrate(60);play.stars=stars;
   if(play.pick.mode==='stage'){play.reward=Q.reward;}}
  else{sound('lose');vibrate([40,40,80]);play.stars=0;}}
 function stepPlay(dt){const st=play.st;play.t+=dt;
  if(play.phase==='flight'){const ev=[];st.events=ev;const done=S.stepFlight(st,dt,ev);consume(ev);
   if(st.mode==='stage'&&!st.grid.size&&!st.hidden.length&&!st.fl.recall)S.recall(st); // last brick gone: call the balls home
   if(done){beamOn.clear();const r=S.endTurn(st);play.snap=null;if(st.lastDrop)play.drop={n:st.lastDrop,t:0};if(st.lastDrop>1)sfx('card');
    if(r==='clear')finishStage('clear');else if(r==='fail')finishStage('fail');else play.phase='aim';}}
  if(play.drop){play.drop.t+=dt;if(!sliding())play.drop=null;}
  if(play.phase==='aim'&&s.debug.bot&&play.t>.15&&!sliding()){play.t=0;play.angle=S.botAngle(st,9);fire();}
  if((play.phase==='clear'||play.phase==='fail')&&s.debug.bot){play.panelT=(play.panelT||0)+dt;if(play.panelT>1.2)panelAction(play.phase==='fail'&&play.gems>=CONTINUE&&!play.continued?'continue':'next');}
  else if(play.phase==='clear'||play.phase==='fail')play.panelT=(play.panelT||0)+dt;
 }
 function panelAction(a){if(!play)return;
  if(a==='continue'&&play.phase==='fail'&&play.gems>=CONTINUE){play.gems-=CONTINUE;play.continued=true;if(arcade){Q.gems=play.gems;saveProfile(store.profile);}S.rescue(play.st);play.phase='aim';sound('pickup');return;}
  if(a==='next'){const r={score:play.st.score,stars:play.phase==='clear'?S.starsFor(play.st):0,result:play.phase,turns:play.st.turn};play.phase='done';sound('tap');play.resolve?.(r);}}

 // ---- play drawing ----
 function drawBackground(){
  const key=`${L.W}x${L.H}x${L.k}`;if(C.bgKey!==key||!C.bg){C.bgKey=key;const cv=offscreen(L.W,L.H),b=cv.getContext('2d');
   const g=b.createLinearGradient(0,0,0,L.H);g.addColorStop(0,'#123540');g.addColorStop(.18,'#0a1a20');g.addColorStop(.6,'#05070a');g.addColorStop(1,'#0c0614');b.fillStyle=g;b.fillRect(0,0,L.W,L.H);
   b.save();b.translate(L.ox,L.oy);b.scale(L.k,L.k);
   // field interior + violet floor glow
   b.fillStyle='#000';rr(b,FX-3,FT-3,FW+6,FH+6,12);b.fill();
   b.save();rr(b,FX-3,FT-3,FW+6,FH+6,12);b.clip();const rg=b.createRadialGradient(288,FB+30,10,288,FB+30,330);rg.addColorStop(0,'rgba(170,60,255,.42)');rg.addColorStop(.45,'rgba(120,30,200,.16)');rg.addColorStop(1,'rgba(0,0,0,0)');
   b.fillStyle=rg;b.fillRect(FX,FB-330,FW,360);b.restore();
   // neon frame: cyan along the top fading to violet / pink at the bottom
   const fg=b.createLinearGradient(0,FT,0,FB);fg.addColorStop(0,'#55d8ff');fg.addColorStop(.45,'#7d8cff');fg.addColorStop(1,'#d65cff');
   for(const [w,a,bl] of [[7,.35,22],[3.2,1,10]]){b.globalAlpha=a;glow(b,'#8f6bff',bl);b.strokeStyle=fg;b.lineWidth=w;rr(b,FX-6,FT-6,FW+12,FH+12,15);b.stroke();}
   noGlow(b);b.globalAlpha=1;
   // bottom bar backdrop
   const bb=b.createRadialGradient(288,BY+40,10,288,BY+40,330);bb.addColorStop(0,'rgba(150,40,210,.28)');bb.addColorStop(1,'rgba(0,0,0,0)');b.fillStyle=bb;b.fillRect(-200,FB+10,VW+400,260);
   b.restore();C.bg=cv;}
  x.drawImage(C.bg,0,0,L.W,L.H);
 }
 function drawPlay(){const st=play.st,k=L.k;drawBackground();
  x.save();x.translate(L.ox,L.oy);x.scale(k,k);
  drawHUD(st);
  // field contents, clipped to the frame
  x.save();x.beginPath();x.rect(FX,FT,FW,FH);x.clip();
  // aim guide
  if(play.phase==='aim'&&!sliding()&&(play.aiming||play.slider||s.debug.showAim)){const path=S.aimPath(st,play.angle);drawGuide(path);}
  // pickup rings
  const sy=slideY();
  for(const p of st.picks.values())drawRing(FX+(p.c+.5)*CELL,FT+(p.r+.5)*CELL+sy);
  // green beam rings: '-' fires along the row, '+' along the row and column; the beam glows while balls pass through
  for(const q of st.beams.values())drawBeamRing(FX+(q.c+.5)*CELL,FT+(q.r+.5)*CELL+sy,q);
  // bricks
  for(const b of st.grid.values()){const sp=brickSprite(C,k,b.color,b.shape,b.kind),bx=FX+b.c*CELL,by=FT+b.r*CELL+sy;
   x.drawImage(sp.cv,bx-sp.pad,by-sp.pad,CELL+sp.pad*2,CELL+sp.pad*2);
   if(b.flash>0){x.save();x.translate(bx,by);x.globalAlpha=b.flash*.55;x.strokeStyle='#fff';x.lineWidth=2.5;x.lineJoin='round';brickPath(x,b.shape,1);x.stroke();x.restore();b.flash=Math.max(0,b.flash-1/12);}
   const [tx,ty]=textSpot(b.shape);text(x,String(b.hp),bx+tx,by+ty,{size:b.hp>=1000?14:17,weight:500,color:'#eef8ff'});}
  drawFx();
  // balls
  const bs=ballSprite(C,k);
  if(st.fl)for(const b of st.fl.balls)if(!b.done)x.drawImage(bs.cv,FX+b.x*CELL-bs.R,FT+b.y*CELL-bs.R,bs.R*2,bs.R*2);
  x.restore();
  // launcher ball + count
  const o=originV();
  if(st.fl){if(st.fl.toLaunch>0){x.drawImage(bs.cv,o.x-bs.R,o.y-bs.R,bs.R*2,bs.R*2);const lx=o.x>FX+FW-70;text(x,'x '+st.fl.toLaunch,o.x+(lx?-16:16),o.y-14,{size:15,weight:500,color:'#fff',align:lx?'right':'left'});}
   if(st.fl.first!==null){const fx2=FX+st.fl.first*CELL;x.drawImage(bs.cv,fx2-bs.R,o.y-bs.R,bs.R*2,bs.R*2);}}
  else if(play.phase==='aim'){x.drawImage(bs.cv,o.x-bs.R,o.y-bs.R,bs.R*2,bs.R*2);const n=play.plusArmed?st.balls*2:st.balls,lx=o.x>FX+FW-70;text(x,'x'+n,o.x+(lx?-15:15),o.y-15,{size:15,weight:500,color:play.plusArmed?'#ffe27a':'#fff',align:lx?'right':'left'});}
  drawBottom(st);
  if(play.phase==='clear'||play.phase==='fail'||play.phase==='done')drawPanel(st);
  drawPresses();
  if(fx.toast&&fx.toast.t>0){x.globalAlpha=Math.min(1,fx.toast.t*2);x.fillStyle='#000c';rr(x,90,FT+300,396,56,14);x.fill();text(x,fx.toast.msg,288,FT+328,{size:17,weight:700});x.globalAlpha=1;}
  x.restore();
 }
 function drawHUD(st){
  // left ring: fast-forward toggle; right ring: pause
  ringIcon(x,58,75,30,NEON.cyan,st.fast?18:10);x.beginPath();x.arc(58,75,8.5,0,TAU);x.fillStyle=st.fast?'#fff':'#9aa6ad';x.fill();if(st.fast)text(x,'2x',58,103,{size:12,weight:800,color:'#9ff3ff'});
  ringIcon(x,518,75,30,NEON.cyan);x.fillStyle='#d8fbff';x.fillRect(509,62,6,26);x.fillRect(521,62,6,26);
  // player chip (whose turn) in the spare band above the HUD
  text(x,`${names[turn]}`,288,8,{size:14,weight:700,color:turn?'#ffb3ea':'#9ff3ff'});
  if(play.pick.mode==='stage'){text(x,`STAGE– ${play.pick.n}`,288,40,{size:15,weight:500,color:'#e8f4f8'});
   const x0=158,x1=418,frac=Math.min(1,st.score/st.stars[2]),s2=x0+(x1-x0)*st.stars[1]/st.stars[2];
   x.fillStyle='#2a2f33';rr(x,x0,58,x1-x0,6,3);x.fill();x.fillStyle='#bfe9ff';glow(x,'#6fd6ff',6);rr(x,x0,58,Math.max(6,(x1-x0)*frac),6,3);x.fill();noGlow(x);
   [[x0-4,1],[s2,st.score>=st.stars[1]],[x1+6,st.score>=st.stars[2]]].forEach(([sx,lit])=>{star(x,sx,61,9);x.fillStyle=lit?'#eaf8ff':'#050607';if(lit)glow(x,'#7fdcff',8);x.fill();noGlow(x);if(!lit){x.strokeStyle='#555';x.lineWidth=1;x.stroke();}});
  }else text(x,play.pick.mode==='hundred'?'100 BALLS':'CLASSIC',288,40,{size:15,weight:500,color:'#e8f4f8'});
  // with a line counter the real HUD reads "Line 31" left of centre and the score to the right
  const lines=play.pick.mode==='stage'?st.hidden.length:st.classicRow;
  if(lines){text(x,'Line',160,97,{size:15,weight:500,color:'#e8f4f8',align:'left'});text(x,String(lines),216,97,{size:15,weight:500,color:'#e8f4f8',align:'left'});text(x,String(st.score),396,97,{size:19,weight:500,color:'#fff'});}
  else text(x,String(st.score),288,98,{size:20,weight:500,color:'#fff'});
 }
 function drawGuide(path){const pts=path.pts;let carry=0;x.fillStyle='#fff';
  let total=0;for(let i=1;i<pts.length;i++)total+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);let run=0;
  for(let i=1;i<pts.length;i++){const [ax,ay]=pts[i-1],[bx,by]=pts[i],len=Math.hypot(bx-ax,by-ay);
   for(let d=carry;d<len;d+=.3){const t=d/len,px=FX+(ax+(bx-ax)*t)*CELL,py=FT+(ay+(by-ay)*t)*CELL,u=(run+d)/Math.max(1,total);x.globalAlpha=.95-u*.55;x.beginPath();x.arc(px,py,3.1-u*1.2,0,TAU);x.fill();}
   carry=(carry-len)%.3;if(carry<0)carry+=.3;run+=len;}
  x.globalAlpha=1;const [ex,ey]=path.end;x.strokeStyle='rgba(255,255,255,.75)';x.lineWidth=1.6;x.beginPath();x.arc(FX+ex*CELL,FT+ey*CELL,S.BALL_R*CELL,0,TAU);x.stroke();
  x.fillStyle='rgba(255,255,255,.35)';x.fill();}
 function drawBeam(q,a){const cy=FT+(q.r+.5)*CELL,cx=FX+(q.c+.5)*CELL,w=10+a*14;x.globalAlpha=Math.min(1,a*1.4);
  for(const [lw,col,bl] of [[w,'#58ff3a',22],[w*.45,'#f4ffe8',8]]){glow(x,'#3dff2a',bl);x.fillStyle=col;
   x.fillRect(FX,cy-lw/2,FW,lw);if(q.dir==='x')x.fillRect(cx-lw/2,FT,lw,FH);}
  noGlow(x);x.globalAlpha=1;}
 function drawBeamRing(cx,cy,q){const pulse=.5+.5*Math.sin(T*5+q.c);
  x.beginPath();x.arc(cx,cy,19,0,TAU);x.fillStyle='rgba(30,120,20,.55)';x.fill();
  glow(x,'#46ff2e',10+pulse*8);x.strokeStyle='#4cf03a';x.lineWidth=4;x.stroke();noGlow(x);
  x.beginPath();x.arc(cx,cy,14.5,0,TAU);x.strokeStyle='#eaffe0';x.lineWidth=2.2;x.stroke();
  x.fillStyle='#fbfff6';glow(x,'#9dff8a',6);rr(x,cx-10,cy-2.6,20,5.2,2.6);x.fill();if(q.dir==='x'){rr(x,cx-2.6,cy-10,5.2,20,2.6);x.fill();}noGlow(x);}
 function drawRing(cx,cy){const a=T*2.2;x.lineWidth=6;x.strokeStyle='rgba(214,80,255,.35)';x.beginPath();x.arc(cx,cy,14,0,TAU);x.stroke();
  x.lineWidth=2.4;x.strokeStyle='#fff';for(let i=0;i<3;i++){x.beginPath();x.arc(cx,cy,14,a+i*TAU/3,a+i*TAU/3+1.55);x.stroke();}
  x.beginPath();x.arc(cx,cy,6,0,TAU);x.fillStyle='#fff';glow(x,'#d24dff',8);x.fill();noGlow(x);}
 function drawPresses(){for(const f of fx.presses){const u=f.t/.25;x.globalAlpha=(1-u)*.55;x.strokeStyle='#fff';x.lineWidth=3*(1-u)+1;glow(x,'#ffffff',10);
  x.beginPath();x.arc(f.x,f.y,f.r*(.8+u*.35),0,TAU);x.stroke();x.fillStyle='rgba(255,255,255,.12)';x.fill();noGlow(x);}x.globalAlpha=1;}
 function drawFx(){
  for(const [k2,q] of beamOn){const age=T-q.t;if(age>.22){beamOn.delete(k2);continue;}drawBeam(q,1-age/.22);}
  for(const r of fx.rings){const u=r.t/(r.kill?.4:.32),bx=FX+r.c*CELL,by=FT+r.r*CELL,size=r.big?CELL*3:CELL,g=1+u*.25;x.save();x.translate(bx+size/2,by+size/2);x.scale(g,g);x.globalAlpha=(1-u)*.6;
   x.strokeStyle=r.kill?'#d6dde2':'#8d969c';x.lineWidth=3;if(r.big||r.shape==='s'){rr(x,-size/2,-size/2,size,size,8);}else{x.translate(-CELL/2,-CELL/2);brickPath(x,r.shape);}x.stroke();x.restore();}
  for(const b of fx.beams){const u=b.t/.32,w=(1-u)*12;x.globalAlpha=1-u;glow(x,b.color,18);x.fillStyle='#fff7e0';
   if(b.dir==='h')x.fillRect(FX,FT+(b.r+.5)*CELL-w/2,FW,w);else x.fillRect(FX+(b.c+.5)*CELL-w/2,FT,w,FH);noGlow(x);x.globalAlpha=1;}
  for(const b of fx.bolts){const u=b.t/.45,r=seededRandom(String(b.seed));x.globalAlpha=1-u;x.strokeStyle='#fff6b0';x.lineWidth=4;glow(x,'#ffe24a',16);x.beginPath();let px=FX+(b.c+.5)*CELL,py=FT;x.moveTo(px,py);
   const ty=FT+(b.r+.5)*CELL;while(py<ty){py=Math.min(ty,py+28);px+=(r()-.5)*34;x.lineTo(px,py);}x.stroke();noGlow(x);x.globalAlpha=1;}
  for(const p of fx.parts){const u=p.t/p.life;x.globalAlpha=Math.max(0,1-u);x.fillStyle=lighten(p.color,.25);x.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);x.strokeStyle=p.color;x.lineWidth=1;x.strokeRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);}
  x.globalAlpha=1;
  for(const p of fx.pops){const u=p.t/.8;x.globalAlpha=Math.max(0,1-u*u);x.font='700 24px Arial, Helvetica, sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=4;x.strokeStyle='#000a';x.strokeText(p.str,p.x,p.y-u*34);x.fillStyle='#fff';x.fillText(p.str,p.x,p.y-u*34);}
  x.globalAlpha=1;
  for(const f of fx.flies){const u=Math.min(1,f.t/.5),o=originV();drawRing(f.x+(o.x-f.x)*u*u,f.y+(o.y-f.y)*u*u);}
 }
 function drawBottom(st){
  if(play.phase==='flight'){
   // recall: red rounded button with a ball and a down arrow
   glow(x,NEON.red,14);x.strokeStyle='#ff4060';x.lineWidth=3.4;rr(x,192,BY-44,192,86,10);x.stroke();noGlow(x);x.fillStyle='rgba(255,40,80,.08)';rr(x,192,BY-44,192,86,10);x.fill();
   x.beginPath();x.arc(288,BY-18,8,0,TAU);x.fillStyle='#fff';x.fill();x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.moveTo(288,BY-6);x.lineTo(288,BY+20);x.moveTo(276,BY+8);x.lineTo(288,BY+20);x.lineTo(300,BY+8);x.stroke();
   if(play.snap){x.globalAlpha=play.gems>=REWIND?1:.4;ringIcon(x,518,BY+4,40,NEON.red,12);x.strokeStyle='#fff';x.lineWidth=3.6;x.beginPath();x.moveTo(500,BY-12);x.lineTo(528,BY-12);x.arc(528,BY,12,-Math.PI/2,Math.PI/2);x.lineTo(514,BY+12);x.stroke();
    x.beginPath();x.moveTo(508,BY-21);x.lineTo(499,BY-12);x.lineTo(508,BY-3);x.stroke();gem(x,506,BY+28,7,'#ffb2c0');text(x,String(REWIND),532,BY+28,{size:14,color:'#fff'});x.globalAlpha=1;}
   return;}
  if(play.phase!=='aim')return;
  // lightning item
  ringIcon(x,58,BY,40,NEON.red,12);x.globalAlpha=play.bolt>0?1:.35;x.fillStyle='#fff';x.beginPath();x.moveTo(64,BY-28);x.lineTo(44,BY+2);x.lineTo(58,BY+2);x.lineTo(50,BY+22);x.lineTo(73,BY-8);x.lineTo(59,BY-8);x.closePath();glow(x,'#ffd0e0',6);x.fill();noGlow(x);
  text(x,'× '+play.bolt,58,BY+30,{size:12,color:'#fff'});x.globalAlpha=1;
  // aim slider
  const x0=152,x1=424;glow(x,NEON.pink,12);x.strokeStyle='#ff4fd8';x.lineWidth=3;rr(x,x0,BY-13,x1-x0,26,13);x.stroke();noGlow(x);x.fillStyle='rgba(120,20,110,.35)';rr(x,x0,BY-13,x1-x0,26,13);x.fill();
  const kx=x0+16+(x1-x0-32)*sliderT(play.angle);x.beginPath();x.arc(kx,BY,15,0,TAU);x.fillStyle='#fff';glow(x,'#ffffff',10);x.fill();noGlow(x);
  // ball plus item
  ringIcon(x,518,BY,40,play.plusArmed?NEON.gold:NEON.red,play.plusArmed?20:12);x.globalAlpha=play.plus>0?1:.35;x.fillStyle='#fff';
  for(const [dx,dy] of [[0,-16],[-8,-4],[8,-4],[-16,8],[0,8],[16,8]]){x.beginPath();x.arc(518+dx,BY-2+dy,6.2,0,TAU);x.fill();}
  text(x,'× '+play.plus,518,BY+30,{size:12,color:'#fff'});x.globalAlpha=1;
 }
 function drawPanel(st){const u=Math.min(1,(play.panelT||0)/.35),clear=play.phase!=='fail'&&st.result==='clear';
  x.fillStyle=`rgba(0,0,0,${.72*u})`;x.fillRect(-500,-500,VW+1000,STACK+1000);
  x.save();x.globalAlpha=u;const py=150,ph=520;x.translate(288,py+ph/2);x.scale(.9+u*.1,.9+u*.1);x.translate(-288,-(py+ph/2));
  // header row: share, gift, gems, close
  ringIcon(x,62,py-56,30,'#5dff7a',10);shareIcon(x,62,py-56,'#5dff7a');
  pill(x,160,py-72,116,32,NEON.cyan);giftBox(x,148,py-56,true);gem(x,206,py-56,7,'#ffbcc8');text(x,'× 30',236,py-56,{size:14,color:'#fff'});
  pill(x,330,py-72,124,32,'#c75cff');gem(x,330,py-56,13,'#ff4fd0',true);text(x,String(play.gems),432,py-56,{size:16,color:'#fff',align:'right'});
  ringIcon(x,514,py-56,30,NEON.red,10);x.strokeStyle='#ff5a74';x.lineWidth=3.5;x.beginPath();x.moveTo(503,py-67);x.lineTo(525,py-45);x.moveTo(525,py-67);x.lineTo(503,py-45);x.stroke();
  // glass panel
  const pg=x.createLinearGradient(0,py,0,py+ph);pg.addColorStop(0,'#0f5059');pg.addColorStop(.5,'#0d3a46');pg.addColorStop(1,'#0b2a36');x.fillStyle=pg;rr(x,40,py,496,ph,18);x.fill();
  glow(x,NEON.cyan,16);x.strokeStyle='#5fe8ff';x.lineWidth=3;rr(x,40,py,496,ph,18);x.stroke();noGlow(x);
  const title=play.pick.mode==='stage'?`STAGE– ${play.pick.n}`:play.pick.mode==='hundred'?'100 BALLS':'CLASSIC';
  text(x,title,288,py+42,{size:21,weight:700,color:'#fff'});
  if(play.pick.mode==='stage')for(let i=0;i<3;i++){const lit=i<play.stars,cx=168+i*120,cy=py+128;star(x,cx,cy,52,.47);x.lineJoin='round';
   if(lit){x.fillStyle='#bfe9ff';glow(x,'#6fd6ff',26);x.fill();noGlow(x);x.fillStyle='rgba(255,255,255,.7)';star(x,cx,cy-4,34,.47);x.fill();}else{x.fillStyle='#0b1e24';x.fill();x.strokeStyle='#3d5a63';x.lineWidth=2;x.stroke();}}
  else text(x,st.score.toLocaleString('en-US'),288,py+128,{size:52,weight:700,color:'#e9fbff',glowC:'#6fd6ff',blur:16});
  const word=clear?'CLEAR!':play.pick.mode==='stage'?'FAILED':'GAME OVER';
  const tg=x.createLinearGradient(0,py+200,0,py+260);tg.addColorStop(0,'#ffffff');tg.addColorStop(.5,clear?'#efd2ff':'#ffd2e6');tg.addColorStop(1,clear?'#b46bff':'#ff4f8a');
  x.font='800 66px Arial, Helvetica, sans-serif';x.textAlign='center';x.textBaseline='middle';glow(x,clear?'#a04dff':'#ff2f6a',20);x.fillStyle=tg;x.fillText(word,288,py+232);noGlow(x);
  text(x,`SCORE ${st.score}`,288,py+282,{size:17,weight:600,color:'#cfeef7'});
  // reward bar (gems for clears) and the buttons
  text(x,'REWARD',60,py+326,{size:13,weight:700,color:'#fff',align:'left'});x.fillStyle='#08161b';rr(x,60,py+336,456,12,6);x.fill();
  const rw=Math.min(10,(Q.reward||0));x.fillStyle='#ffb53a';glow(x,'#ffb53a',8);rr(x,60,py+336,Math.max(10,456*rw/10),12,6);x.fill();noGlow(x);
  for(const [f,n] of [[.5,5],[1,10]]){const mx=60+456*f-(f===1?14:0);x.beginPath();x.arc(mx,py+318,15,0,TAU);x.fillStyle='#3a2a10';x.fill();x.strokeStyle='#e8b23a';x.lineWidth=2;x.stroke();gem(x,mx,py+316,6,'#ff4f6a',true);text(x,'×'+n,mx,py+326,{size:9,weight:700,color:'#fff'});}
  if(play.phase==='fail'){const can=play.gems>=CONTINUE&&!play.continued;
   x.globalAlpha=u*(can?1:.35);neonButton(x,62,py+380,220,96,'#ffd75a');text(x,'CONTINUE',172,py+414,{size:22,weight:700,color:'#fff'});gem(x,150,py+448,8,'#ff4f6a',true);text(x,String(CONTINUE),178,py+448,{size:16,color:'#fff'});
   x.globalAlpha=u;neonButton(x,294,py+380,220,96,NEON.cyan);text(x,'END',404,py+428,{size:26,weight:700,color:'#fff'});}
  else{neonButton(x,62,py+380,452,96,NEON.cyan);x.strokeStyle='#bff6ff';x.lineWidth=5;x.lineJoin='round';for(const dx of [0,26]){x.beginPath();x.moveTo(118+dx,py+402);x.lineTo(142+dx,py+428);x.lineTo(118+dx,py+454);x.stroke();}
   text(x,'NEXT',380,py+428,{size:30,weight:600,color:'#fff'});}
  x.restore();
 }
 function panelHit(p){const py=150;if(Math.hypot(p.x-514,p.y-(py-56))<34)return 'next';if(p.y<py+380||p.y>py+476)return null;if(play.phase==='fail')return p.x<288?'continue':'next';return p.x>62&&p.x<514?'next':null;}

 // ================================ INPUT ================================
 s.on(c,'pointerdown',ev=>{if(s.paused)return;ev.preventDefault();layout();const p=toV(ev);
  if(view==='map'){mapDrag={y:p.y,start:mapScroll,moved:0,x:p.x};try{c.setPointerCapture(ev.pointerId);}catch{}return;}
  if(!play)return;
  if(play.phase==='clear'||play.phase==='fail'){if((play.panelT||0)<.5)return;const a=panelHit(p);if(a){press(p.x,p.y,50);panelAction(a);}return;}
  // HUD rings
  if(Math.hypot(p.x-58,p.y-75)<38){press(58,75,30);play.st.fast=!play.st.fast;sound('tap');return;}
  if(Math.hypot(p.x-518,p.y-75)<38){press(518,75,30);s.manualPause();return;}
  if(play.phase==='flight'){if(p.y>BY-50&&p.x>186&&p.x<390){press(288,BY,60);recall();}else if(play.snap&&Math.hypot(p.x-518,p.y-BY)<46){press(518,BY+4);rewind();}return;}
  if(play.phase!=='aim')return;
  if(p.y>FB+10){
   if(Math.hypot(p.x-58,p.y-BY)<46){press(58,BY);return useBolt();}
   if(Math.hypot(p.x-518,p.y-BY)<46){press(518,BY);return usePlus();}
   if(p.x>140&&p.x<436&&Math.abs(p.y-BY)<40){vibrate(6);play.slider=true;sliderTo(p);try{c.setPointerCapture(ev.pointerId);}catch{}}
   return;}
  if(setAngleFromPoint(p)){play.aiming=true;try{c.setPointerCapture(ev.pointerId);}catch{}}
 });
 const sliderTo=p=>{const t=Math.max(0,Math.min(1,(p.x-168)/(424-152-32)));play.angle=-Math.PI+.14+t*(Math.PI-.28);};
 s.on(c,'pointermove',ev=>{if(s.paused)return;const p=toV(ev);
  if(view==='map'&&mapDrag){const dy=p.y-mapDrag.y;mapDrag.moved=Math.max(mapDrag.moved,Math.abs(dy));mapScroll=Math.max(0,Math.min(maxScroll(),mapDrag.start+dy));return;}
  if(!play||play.phase!=='aim')return;if(play.slider)sliderTo(p);else if(play.aiming){if(!setAngleFromPoint(p))play.cancelAim=true;else play.cancelAim=false;}});
 s.on(c,'pointerup',ev=>{if(s.paused)return;const p=toV(ev);
  if(view==='map'&&mapDrag){const d=mapDrag;mapDrag=null;if(d.moved<10)mapTap(p);return;}
  if(!play||play.phase!=='aim')return;
  if(play.slider){play.slider=false;fire();return;}
  if(play.aiming){play.aiming=false;if(!play.cancelAim)fire();play.cancelAim=false;}});
 s.on(c,'pointercancel',()=>{mapDrag=null;if(play){play.aiming=play.slider=false;}});
 s.on(c,'wheel',ev=>{if(view==='map'){ev.preventDefault();mapScroll=Math.max(0,Math.min(maxScroll(),mapScroll-ev.deltaY));}},{passive:false});
 s.on(window,'keydown',ev=>{if(s.paused||!play)return;const k=ev.key;
  if(play.phase==='aim'){if(k==='ArrowLeft'||k==='a'){play.angle=S.launchAngleOK(play.angle-.03);s.debug.showAim=true;}else if(k==='ArrowRight'||k==='d'){play.angle=S.launchAngleOK(play.angle+.03);s.debug.showAim=true;}
   else if(k===' '||k==='Enter'){s.debug.showAim=false;fire();}else if(k==='l')useBolt();else if(k==='b')usePlus();else return;ev.preventDefault();}
  else if(play.phase==='flight'&&(k==='ArrowDown'||k==='s')){recall();ev.preventDefault();}
  else if((play.phase==='clear'||play.phase==='fail')&&(k===' '||k==='Enter')&&(play.panelT||0)>.5){panelAction('next');ev.preventDefault();}});

 // ================================ LOOP + FLOW ================================
 s.frame(dt=>{T+=dt;layout();
  if(fx.toast)fx.toast.t-=dt;
  for(const list of [fx.parts,fx.pops,fx.rings,fx.beams,fx.bolts,fx.flies,fx.presses])for(const e of list)e.t+=dt;fx.presses=fx.presses.filter(f=>f.t<.25);
  for(const p of fx.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=420*dt;}
  fx.parts=fx.parts.filter(p=>p.t<p.life);fx.pops=fx.pops.filter(p=>p.t<.8);fx.rings=fx.rings.filter(r=>r.t<(r.kill?.4:.32));fx.beams=fx.beams.filter(b=>b.t<.32);fx.bolts=fx.bolts.filter(b=>b.t<.45);fx.flies=fx.flies.filter(f=>f.t<.5);
  if(fx.parts.length>500)fx.parts.splice(0,fx.parts.length-500);
  if(view==='map'){if(s.debug.pick&&!mapPick){const n=s.debug.pick;s.debug.pick=null;choose(typeof n==='object'?n:{mode:'stage',n});}drawMap();}
  else if(play){stepPlay(dt);drawPlay();}
  else{x.fillStyle='#05080b';x.fillRect(0,0,s.W,s.H);}
 });

 const pick=await new Promise(res=>{chooseResolve=res;});
 if(!s.alive)return;
 const label=pick.mode==='stage'?`Stage ${pick.n}`:pick.mode==='hundred'?'100 Balls':'Classic';
 const how=pick.mode==='stage'?'Clear every brick before the wall reaches the bottom.':'Survive as long as you can — a new line drops in every turn.';
 // Solo: stage after stage from the picked one until a stage is failed; Classic / 100 Balls is one endless game.
 if(s.solo){let total=0,cleared=0;const cur={...pick},stageReward=stars=>{Q.stars[cur.n]=Math.max(+Q.stars[cur.n]||0,stars);Q.cleared=Math.max(Q.cleared,cur.n);Q.reward=(Q.reward||0)+stars;if(Q.reward>=5&&Q.reward-stars<5)Q.gems+=5;if(Q.reward>=10){Q.gems+=10;Q.reward-=10;}};
  for(;;){turn=0;view='play';play=null;const name=cur.mode==='stage'?`Stage ${cur.n}`:label;
   if(!await s.pass(0,`Bricks Breaker Quest · ${name}. ${how}${cur.mode==='stage'?' Clear it to unlock the next stage.':''} Drag to aim (or use the slider), let go to shoot.`,'Ready',{soloTitle:name,summary:cleared?`Stage ${cur.n-1} cleared. ${total} points so far.`:null}))return;
   play=newPlay({...cur});fx.parts.length=fx.pops.length=fx.rings.length=fx.beams.length=fx.bolts.length=fx.flies.length=0;
   const r=await new Promise(res=>{play.resolve=res;});if(!s.alive)return;total+=r.score;s.setScores([total,0]);if(arcade)Q.gems=play.gems;
   if(cur.mode!=='stage'){saveProfile(store.profile);return soloFinish(s,total,0,`Bricks Breaker Quest · ${label} solo: ${total} points.`,total>0);}
   if(r.result!=='clear'){saveProfile(store.profile);return soloFinish(s,total,cleared,`Bricks Breaker Quest solo: ${cleared} stage${cleared===1?'':'s'} cleared, failed Stage ${cur.n}.`);}
   cleared++;stageReward(r.stars||1);saveProfile(store.profile);soloProgress(s,total,cleared,`Bricks Breaker Quest solo: ${cleared} stage${cleared===1?'':'s'} cleared, up to Stage ${cur.n}.`);cur.n++;}}
 for(const i of [0,1]){turn=i;view='play';play=null;
  const summary=i?`${names[0]}: ${scores[0]} points${results[0]?.result==='clear'?` (${results[0].stars}★)`:''}. ${names[1]}, your go on the same ${label}.`:null;
  if(!await s.pass(i,`Bricks Breaker Quest · ${label}. ${how} Drag to aim (or use the slider), let go to shoot. Lightning wipes the lowest line, Ball Plus doubles your next shot.`,'Ready',{summary}))return;
  play=newPlay(pick);fx.parts.length=fx.pops.length=fx.rings.length=fx.beams.length=fx.bolts.length=fx.flies.length=0;
  const r=await new Promise(res=>{play.resolve=res;});if(!s.alive)return;
  scores[i]=r.score;results[i]=r;s.setScores(scores);
  if(arcade)Q.gems=play.gems;
 }
 // shared quest progress: a clear by either player opens the next stage; best stars stay; clears fill the gem bar
 if(pick.mode==='stage'){const best=Math.max(results[0].stars,results[1].stars);if(best>0){Q.stars[pick.n]=Math.max(+Q.stars[pick.n]||0,best);Q.cleared=Math.max(Q.cleared,pick.n);
   Q.reward=(Q.reward||0)+best;if(Q.reward>=5&&Q.reward-best<5)Q.gems+=5;if(Q.reward>=10){Q.gems+=10;Q.reward-=10;}}}
 saveProfile(store.profile);
 const desc=i=>`${names[i]} ${scores[i]}${pick.mode==='stage'?results[i].result==='clear'?` ${'★'.repeat(results[i].stars)}`:' (failed)':''}`;
 s.finish(scores,`Bricks Breaker Quest · ${label}: ${desc(0)}, ${desc(1)}.`);
}

// ---- small icons ----
function ringIcon(x,cx,cy,r,color,blur=10){x.beginPath();x.arc(cx,cy,r,0,TAU);x.fillStyle='rgba(0,0,0,.35)';x.fill();glow(x,color,blur);x.strokeStyle=color;x.lineWidth=3.2;x.stroke();noGlow(x);
 x.save();x.strokeStyle=lighten(color,.6);x.lineWidth=1;x.globalAlpha*=.6;x.beginPath();x.arc(cx,cy,r-3,0,TAU);x.stroke();x.restore();}
function pill(x,px,py,w,h,color){x.fillStyle='rgba(0,0,0,.45)';rr(x,px,py,w,h,h/2);x.fill();glow(x,color,8);x.strokeStyle=color;x.lineWidth=2.4;rr(x,px,py,w,h,h/2);x.stroke();noGlow(x);}
function neonButton(x,px,py,w,h,color){const g=x.createLinearGradient(0,py,0,py+h);g.addColorStop(0,mix(color,.22));g.addColorStop(1,mix(color,.08));x.fillStyle=g;rr(x,px,py,w,h,10);x.fill();glow(x,color,14);x.strokeStyle=color;x.lineWidth=3;rr(x,px,py,w,h,10);x.stroke();noGlow(x);}
function gem(x,cx,cy,r,color,fill=false){x.beginPath();x.moveTo(cx-r,cy-r*.35);x.lineTo(cx-r*.5,cy-r*.85);x.lineTo(cx+r*.5,cy-r*.85);x.lineTo(cx+r,cy-r*.35);x.lineTo(cx,cy+r);x.closePath();
 if(fill){x.fillStyle=color;glow(x,color,8);x.fill();noGlow(x);x.strokeStyle='rgba(255,255,255,.7)';x.lineWidth=1;x.beginPath();x.moveTo(cx-r,cy-r*.35);x.lineTo(cx+r,cy-r*.35);x.moveTo(cx-r*.35,cy-r*.35);x.lineTo(cx,cy+r);x.lineTo(cx+r*.35,cy-r*.35);x.stroke();}
 else{x.strokeStyle=color;x.lineWidth=1.6;x.stroke();x.beginPath();x.moveTo(cx-r,cy-r*.35);x.lineTo(cx+r,cy-r*.35);x.stroke();}}
function giftBox(x,cx,cy,bright){x.fillStyle=bright?'#fff':'#9aa3a8';x.fillRect(cx-13,cy-6,26,18);x.fillRect(cx-15,cy-11,30,6);x.fillStyle='#1b2a30';x.fillRect(cx-2,cy-11,4,23);
 x.strokeStyle=bright?'#fff':'#9aa3a8';x.lineWidth=2;x.beginPath();x.ellipse(cx-6,cy-15,6,4,0,0,TAU);x.ellipse(cx+6,cy-15,6,4,0,0,TAU);x.stroke();}
function padlock(x,cx,cy){x.strokeStyle='#8e9091';x.lineWidth=4;x.beginPath();x.arc(cx,cy-8,8,Math.PI,0);x.stroke();x.fillStyle='#8e9091';rr(x,cx-12,cy-8,24,20,3);x.fill();x.fillStyle='#4a4a44';x.beginPath();x.arc(cx,cy+1,3,0,TAU);x.fill();}
function iconPad(x,cx,cy){x.fillStyle='#fff';rr(x,cx-24,cy-13,48,28,13);x.fill();x.fillStyle='#0b1a20';x.fillRect(cx-16,cy-2,11,3);x.fillRect(cx-12,cy-6,3,11);for(const [dx,dy] of [[10,-3],[16,2]]){x.beginPath();x.arc(cx+dx,cy+dy,2.6,0,TAU);x.fill();}}
function shareIcon(x,cx,cy,color='#e9fbff'){x.fillStyle=color;x.strokeStyle=color;x.lineWidth=2.4;const P=[[cx+7,cy-9],[cx-8,cy],[cx+7,cy+9]];x.beginPath();x.moveTo(...P[0]);x.lineTo(...P[1]);x.lineTo(...P[2]);x.stroke();for(const p of P){x.beginPath();x.arc(p[0],p[1],4.4,0,TAU);x.fill();}}
function gearIcon(x,cx,cy){x.fillStyle='#e9fbff';x.beginPath();for(let i=0;i<16;i++){const a=i*TAU/16,r=i%2?10:14;x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}x.closePath();x.fill();x.beginPath();x.arc(cx,cy,5,0,TAU);x.fillStyle='#0b1a20';x.fill();}

Object.assign(exports,{bricksQuest});
