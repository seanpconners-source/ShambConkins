// Crappy Crush (crappy-crush): Candy Crush with the board game's items as the pieces (owner, Nov 18).
// Swipe (or tap two neighbours) to swap; 3 in a row clear, 4 make a Mylo Coin (= striped: clears its row/column), an L/T
// a KC Coin (= wrapped: blast), 5 the Loki Coin (= colour bomb: clears every piece of the kind it's swapped with). Crap piles never
// match: a match next to one, or a blast over it, knocks a layer off.
// Modes
//  1P stages: the real thing. A Candy Crush map of 5 stages per world (src/data/crappyCrushWorlds.js), goals (score,
//     collect, clear the crap), limited moves, 1-3 stars, a "Crappy Crush!" finale for moves left. Progress is saved in
//     profile.crappyCrush {cleared, stars:{n}, best:{n}}.
//  Versus (2P, vs CPU, online): both race the same board for 90 s; cascades and specials dump crap on the other board,
//     Tetris-style (your own sends cancel crap coming at you first). Higher score wins.
//  The Arcade's 1 Player asks which (stages or vs CPU); the board game and online always play versus.
// Board logic: src/engines/crappy/sim.js (tests/crappy-sim.mjs). World backgrounds: assets/crappycrush/<world>.webp.
const S=require("src/engines/crappy/sim.js");
const {WORLDS,PER,stage:stageDef,STAGE_COUNT}=require("src/data/crappyCrushWorlds.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {label,rr,makeFx,sfx,voice,halfPointers,keyboard}=require("src/engines/tarantinoKit.js");
const {isCpu,isOnline,cpuSkill}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const {clamp,seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {ART}=require("src/data/art.js");
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}

const KCOL=['#ff4d6d','#ffa23a','#ffe14d','#4fd66a','#4ab6ff','#b779ff'];
// Special pieces are the pack's coins (owner, Nov 18): 4 in a row = Mylo Coin, L/T = KC Coin, 5 = Loki Coin
const COINS={h:'mylo-token',v:'mylo-token',w:'kc-token',b:'loki-token'};
const VS_TIME=90,TAU=Math.PI*2;
const CALLOUT=['','','','NICE!','HOLY CRAP!','CRAP-TASTIC!','ROYAL FLUSH!'];

// ---- pictures ---------------------------------------------------------------------------------------------------
const pics=new Map();// item id -> {cv,ok}
function itemPic(id){let e=pics.get(id);if(e)return e.ok?e.cv:null;e={ok:false,cv:null};pics.set(id,e);if(typeof Image==='undefined')return null;
 const url=ART['photo:item:'+id];if(!url)return null;const img=new Image();img.decoding='async';
 img.onload=()=>{const N=160,cv=document.createElement('canvas');cv.width=cv.height=N;const g=cv.getContext('2d'),sc=Math.min(N*.9/img.naturalWidth,N*.9/img.naturalHeight),w=img.naturalWidth*sc,h=img.naturalHeight*sc;
  g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=8;g.shadowOffsetY=4;g.drawImage(img,(N-w)/2,(N-h)/2-2,w,h);e.cv=cv;e.ok=true;};img.src=url;return null;}
const bgs=new Map();
function worldBg(key){const url=USER['crappy:'+key];if(!url||typeof Image==='undefined')return null;let e=bgs.get(key);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=url;bgs.set(key,e);}return e.ok?e.img:null;}
function drawBackdrop(x,world,X,Y,W,H,dim=.35){const img=world&&worldBg(world.key);
 if(img){const sc=Math.max(W/img.naturalWidth,H/img.naturalHeight);x.drawImage(img,X+(W-img.naturalWidth*sc)/2,Y+(H-img.naturalHeight*sc)/2,img.naturalWidth*sc,img.naturalHeight*sc);x.fillStyle=`rgba(10,4,16,${dim})`;x.fillRect(X,Y,W,H);return;}
 const [a,b]=world?.tint||['#6a2a8a','#14061e'];const g=x.createLinearGradient(X,Y,X,Y+H);g.addColorStop(0,a);g.addColorStop(1,b);x.fillStyle=g;x.fillRect(X,Y,W,H);
 // soft polka dots so the empty backdrop isn't flat
 x.save();x.globalAlpha=.08;x.fillStyle='#fff';for(let j=0;j<26;j++){const px=X+((j*137)%97)/97*W,py=Y+((j*61)%89)/89*H;x.beginPath();x.arc(px,py,8+(j%5)*7,0,TAU);x.fill();}x.restore();}

// ---- piece drawing ----------------------------------------------------------------------------------------------
function drawCrap(x,cx,cy,sz,n,t){const s=sz*(.62+Math.min(n,3)*.09);x.save();x.translate(cx,cy+s*.08);
 const tiers=[[0,.32,.5],[-.24,.25,.38],[-.44,.17,.25]];
 for(let j=0;j<3;j++){const [oy,ry,rx]=tiers[j];const g=x.createLinearGradient(0,(oy-ry)*s,0,(oy+ry)*s);g.addColorStop(0,'#a8683a');g.addColorStop(1,'#4a2810');x.fillStyle=g;x.beginPath();x.ellipse(0,oy*s,rx*s,ry*s,0,0,TAU);x.fill();
  x.fillStyle='rgba(255,230,190,.22)';x.beginPath();x.ellipse(-rx*s*.35,(oy-ry*.35)*s,rx*s*.4,ry*s*.28,-.3,0,TAU);x.fill();}
 x.beginPath();x.moveTo(-.04*s,-.62*s);x.quadraticCurveTo(.1*s,-.72*s,.02*s,-.82*s);x.strokeStyle='#5a3216';x.lineWidth=s*.07;x.lineCap='round';x.stroke();
 if(n>=2){for(let f=0;f<n;f++){const a=t*4+f*2.1,fx=Math.cos(a)*s*.62,fy=-s*.55+Math.sin(a*1.3)*s*.18;x.fillStyle='#111';x.beginPath();x.arc(fx,fy,s*.05,0,TAU);x.fill();x.fillStyle='rgba(220,240,255,.7)';x.beginPath();x.ellipse(fx-s*.04,fy-s*.05,s*.04,s*.022,.5,0,TAU);x.fill();}}
 if(n>=2)label(x,String(n),s*.42,s*.3,s*.34,{fill:'#ffe14d'});
 x.restore();}
function drawThrone(x,cx,cy,sz,t){const r=sz*.42;x.save();x.translate(cx,cy);x.rotate(Math.sin(t*3)*.06);
 const g=x.createRadialGradient(-r*.3,-r*.35,r*.1,0,0,r);g.addColorStop(0,'#fff6c0');g.addColorStop(.45,'#ffc83a');g.addColorStop(1,'#a8600a');x.fillStyle=g;x.beginPath();x.arc(0,0,r,0,TAU);x.fill();
 for(let j=0;j<8;j++){const a=t*1.5+j*TAU/8;x.fillStyle=KCOL[j%6];x.beginPath();x.arc(Math.cos(a)*r*.78,Math.sin(a)*r*.78,r*.1,0,TAU);x.fill();}
 x.font=`${r*1.1}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('🚽',0,r*.06);x.restore();}
function drawPiece(x,world,p,cx,cy,sz,t,{alpha=1,scale=1}={}){if(!p)return;x.save();x.globalAlpha*=alpha;x.translate(cx,cy);x.scale(scale,scale);
 if(p.crap){drawCrap(x,0,0,sz,p.crap,t);x.restore();return;}
 if(p.sp==='b'){const loki=itemPic(COINS.b);if(loki){// LOKI COIN: the wildcard (clears every piece of the kind it's swapped with)
   x.rotate(Math.sin(t*3)*.08);const gl=.5+.5*Math.sin(t*5);x.fillStyle=`rgba(190,170,255,${.25+gl*.25})`;x.beginPath();x.arc(0,0,sz*.5,0,TAU);x.fill();
   x.drawImage(loki,-sz*.47,-sz*.47,sz*.94,sz*.94);for(let j=0;j<6;j++){const a=t*1.6+j*TAU/6;x.fillStyle=KCOL[j];x.beginPath();x.arc(Math.cos(a)*sz*.47,Math.sin(a)*sz*.47,sz*.045,0,TAU);x.fill();}}
  else drawThrone(x,0,0,sz,t);x.restore();return;}
 const col=KCOL[p.k]||'#888',r=sz*.44;
 const coin=(p.sp==='h'||p.sp==='v'||p.sp==='w')&&itemPic(COINS[p.sp]);
 if(coin){// MYLO COIN (4 in a row: clears a row/column) / KC COIN (L or T: blast). Ring = the piece's colour, badge = its item
  x.fillStyle=col;x.beginPath();x.arc(0,0,r*1.08,0,TAU);x.fill();x.drawImage(coin,-r*.98,-r*.98,r*1.96,r*1.96);
  const bp=itemPic(world.items[p.k]),br=r*.42,bx=r*.62,by=r*.62;x.fillStyle='#fff';x.beginPath();x.arc(bx,by,br,0,TAU);x.fill();x.strokeStyle=col;x.lineWidth=sz*.04;x.stroke();
  if(bp)x.drawImage(bp,bx-br*.9,by-br*.9,br*1.8,br*1.8);
  if(p.sp==='h'||p.sp==='v'){x.save();if(p.sp==='v')x.rotate(Math.PI/2);x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=2;for(const d of [-1,1]){x.beginPath();x.moveTo(d*r*1.22,0);x.lineTo(d*r*.92,-r*.2);x.lineTo(d*r*.92,r*.2);x.closePath();x.stroke();x.fill();}x.restore();}
  else{const k=.5+.5*Math.sin(t*6);x.strokeStyle=`rgba(255,215,90,${.6+k*.4})`;x.lineWidth=sz*.06;x.beginPath();x.arc(0,0,r*1.12,0,TAU);x.stroke();}
  x.restore();return;}
 const g=x.createRadialGradient(0,-r*.2,r*.1,0,0,r);g.addColorStop(0,col+'99');g.addColorStop(1,col+'10');x.fillStyle=g;x.beginPath();x.arc(0,0,r,0,TAU);x.fill();
 const pic=itemPic(world.items[p.k]);
 if(pic)x.drawImage(pic,-sz*.46,-sz*.46,sz*.92,sz*.92);else{x.fillStyle=col;x.beginPath();x.arc(0,0,r*.7,0,TAU);x.fill();label(x,'?',0,0,r*.8);}
 if(p.sp==='h'||p.sp==='v'){x.save();if(p.sp==='v')x.rotate(Math.PI/2);x.beginPath();x.arc(0,0,r*1.02,0,TAU);x.clip();x.globalAlpha*=.55;x.fillStyle='#fff';for(const o of [-.42,0,.42])x.fillRect(-r*1.1,o*r-r*.07,r*2.2,r*.14);x.restore();
  x.save();if(p.sp==='v')x.rotate(Math.PI/2);x.fillStyle='#fff';for(const d of [-1,1]){x.beginPath();x.moveTo(d*r*1.08,0);x.lineTo(d*r*.82,-r*.16);x.lineTo(d*r*.82,r*.16);x.closePath();x.fill();}x.restore();}
 if(p.sp==='w'){const k=.5+.5*Math.sin(t*6);x.strokeStyle=`rgba(255,215,90,${.6+k*.4})`;x.lineWidth=sz*.07;rr(x,-r*1.02,-r*1.02,r*2.04,r*2.04,r*.35);x.stroke();
  x.fillStyle='#ff4f9a';x.beginPath();x.moveTo(0,-r*1.02);x.lineTo(-r*.3,-r*1.3);x.lineTo(-r*.3,-r*.8);x.closePath();x.fill();x.beginPath();x.moveTo(0,-r*1.02);x.lineTo(r*.3,-r*1.3);x.lineTo(r*.3,-r*.8);x.closePath();x.fill();}
 x.restore();}

// ---- one board on screen ----------------------------------------------------------------------------------------
// view: the sim state + display positions + effects. Coordinates inside a view are local to its rect (see place()).
function makeView(st,world,{i=0,name='',human=true}={}){
 return {st,world,i,name,human,disp:new Map(),dying:[],fx:makeFx(),beams:[],bolts:[],phase:'idle',wait:0,sel:null,drag:null,bad:null,
  hintT:0,hint:null,callout:null,banner:null,lastWave:0,sentThisMove:0,madeThisMove:0,comboThisMove:false,incoming:0,shake:0,
  rect:{x:0,y:0,w:100,h:100,rot:false},hd:0,cell:30,bx:0,by:0,onSettled:null,forced:false,flash:0,cursor:null};}
function place(v,rect,hd,alignTop=false){v.rect=rect;v.hd=hd;const pad=Math.max(6,Math.min(rect.w,rect.h)*.02),aw=rect.w-pad*2,ah=rect.h-hd-pad*2,st=v.st;
 v.cell=Math.floor(Math.min(aw/st.C,ah/st.R));v.bx=Math.round((rect.w-v.cell*st.C)/2);v.by=Math.round(hd+pad+(alignTop?Math.min(12,(ah-v.cell*st.R)/2):(ah-v.cell*st.R)/2));}
const cellXY=(v,i)=>({x:v.bx+(i%v.st.C+.5)*v.cell,y:v.by+(((i/v.st.C)|0)+.5)*v.cell});
function toLocal(v,p){const r=v.rect;return r.rot?{x:r.x+r.w-p.x,y:r.y+r.h-p.y}:{x:p.x-r.x,y:p.y-r.y};}
function cellAt(v,lp){const c=Math.floor((lp.x-v.bx)/v.cell),r=Math.floor((lp.y-v.by)/v.cell);if(c<0||r<0||c>=v.st.C||r>=v.st.R)return -1;const i=r*v.st.C+c;return v.st.mask[i]?i:-1;}

function stepDisp(v,dt){const st=v.st;let settled=true;const seen=new Set();
 for(let i=0;i<st.R*st.C;i++){const p=st.cells[i];if(!p)continue;seen.add(p.id);const tx=i%st.C,ty=(i/st.C)|0;let d=v.disp.get(p.id);
  if(!d){d={x:tx,y:ty,vy:0,pop:0};v.disp.set(p.id,d);}
  d.x+=(tx-d.x)*Math.min(1,dt*20);if(Math.abs(tx-d.x)<.01)d.x=tx;
  if(d.y<ty){d.vy+=46*dt;d.y=Math.min(ty,d.y+d.vy*dt);if(d.y===ty){d.land=Math.min(.18,d.vy*.012);d.vy=0;}}else if(d.y>ty){d.y+=(ty-d.y)*Math.min(1,dt*20);if(Math.abs(ty-d.y)<.01)d.y=ty;}
  d.pop=Math.max(0,d.pop-dt*3);d.land=Math.max(0,(d.land||0)-dt*1.2);
  if(d.x!==tx||d.y!==ty)settled=false;}
 for(const id of [...v.disp.keys()])if(!seen.has(id))v.disp.delete(id);
 for(const dd of v.dying)dd.t+=dt;v.dying=v.dying.filter(dd=>dd.t<.32);
 for(const b of v.beams)b.t+=dt;v.beams=v.beams.filter(b=>b.t<.35);for(const b of v.bolts)b.t+=dt;v.bolts=v.bolts.filter(b=>b.t<.45);
 if(v.callout)v.callout.t+=dt;if(v.callout&&v.callout.t>1.1)v.callout=null;if(v.banner){v.banner.t+=dt;if(v.banner.t>v.banner.life)v.banner=null;}
 v.flash=Math.max(0,v.flash-dt*2);v.shake=Math.max(0,v.shake-dt*24);if(v.bad){v.bad.t+=dt;if(v.bad.t>.32)v.bad=null;}
 v.fx.step(dt);return settled&&!v.dying.length;}

// Apply what resolve() reported: pops, beams, bolts, score text, sounds.
function showWave(v,w){const st=v.st,cs=v.cell;
 for(const c of w.cleared){const d=v.disp.get(c.id),px=v.bx+((d?d.x:c.at%st.C)+.5)*cs,py=v.by+((d?d.y:(c.at/st.C)|0)+.5)*cs;
  v.dying.push({p:{k:c.k,sp:c.sp},x:px,y:py,t:0});if(c.into){const nd={x:c.at%st.C,y:(c.at/st.C)|0,vy:0,pop:1};v.disp.set(c.into,nd);}
  if(c.k>=0)v.fx.spark(px,py,5,KCOL[c.k],cs*5);v.disp.delete(c.id);}
 for(const m of w.made){const d=v.disp.get(st.cells[m.at]?.id);if(d)d.pop=1;const {x,y}=cellXY(v,m.at);v.fx.ring(x,y,{r:cs*.3,grow:cs*4,color:m.sp==='b'?'#ffd23f':'#fff',w:3});}
 for(const b of w.beams)v.beams.push({...b,t:0});
 for(const b of w.blasts){const {x,y}=cellXY(v,b.at);v.fx.ring(x,y,{r:cs*.4,grow:cs*(b.rad+1)*5,color:'#ffd23f',w:6});v.shake=Math.max(v.shake,8);}
 for(const b of w.bombs){const from=cellXY(v,b.at);for(const c of w.cleared.slice(0,40))v.bolts.push({x0:from.x,y0:from.y,...cellXY(v,c.at),t:0});v.shake=Math.max(v.shake,10);}
 for(const h of w.crapHits){const {x,y}=cellXY(v,h.at);v.fx.splat(x,y,{n:10,speed:cs*5,size:cs*.07,color:'#7a4520',decal:false});if(h.left<=0)v.fx.pop(x,y,'+30',{size:cs*.35,color:'#ffcf8a'});}
 if(w.cleared.length){const mid=w.cleared[(w.cleared.length/2)|0],{x,y}=cellXY(v,mid.at);v.fx.pop(x,y,'+'+w.points,{size:clamp(cs*.42+w.wave*2,12,34),color:w.wave>1?'#9dff5c':'#fff'});}
 if(w.combo){v.banner={text:w.combo+'!',t:0,life:1.2,color:'#ffd23f'};v.shake=Math.max(v.shake,12);sfx.fanfare();vibrate(40);}
 if(CALLOUT[w.wave])v.callout={text:CALLOUT[Math.min(6,w.wave)],t:0};
 voice(420+w.wave*90,.12,.05,'triangle');if(w.wave>=2)voice(620+w.wave*120,.1,.035,'sine',{delay:.06});
 if(w.made.length)sfx.ding(w.made.some(m=>m.sp==='b')?1568:1175);if(w.beams.length)sfx.whoosh(900,3200,.06,.2);if(w.bombs.length){sfx.whoosh(300,2400,.09,.4);vibrate(30);}
 if(w.crapHits.length)sfx.splat();}

// Drive one move from the swap to a settled board. onDone(view, summary) runs once at the end.
function stepMove(v,dt,onWave){
 if(v.phase==='swap'){v.wait-=dt;if(v.wait<=0)v.phase='resolve';}
 else if(v.phase==='resolve'){const w=v.forced?S.resolveForced(v.st):S.resolve(v.st);v.forced=false;
  if(!w){v.phase='settle';return;}v.lastWave=w.wave;v.madeThisMove+=w.made.length;if(w.combo)v.comboThisMove=true;showWave(v,w);onWave?.(v,w);v.phase='clear';v.wait=.2;}
 else if(v.phase==='clear'){v.wait-=dt;if(v.wait<=0){const g=S.gravity(v.st);for(const sp of g.spawns){const c=sp.to%v.st.C;let top=0;for(const o of g.spawns)if(o.to%v.st.C===c)top++;v.disp.set(sp.id,{x:c,y:-1-(top-1-sp.order)-.2,vy:2,pop:0});}v.phase='fall';}}
 else if(v.phase==='fall'){if(v.settled)v.phase='resolve';}
}
function startSwap(v,a,b){if(v.phase!=='idle')return false;const r=S.trySwap(v.st,a,b);v.sel=null;v.hint=null;v.hintT=0;
 if(!r.ok){v.bad={a,b,t:0};sfx.buzz();return false;}
 v.onSwap?.();
 v.phase='swap';v.wait=.16;v.lastWave=0;v.madeThisMove=0;v.comboThisMove=false;sfx.whoosh(600,1800,.05,.12);return true;}

function drawView(x,v,t,{dimmed=false,showHint=true}={}){const st=v.st,cs=v.cell,R=v.rect;
 x.save();if(R.rot){x.translate(R.x+R.w,R.y+R.h);x.rotate(Math.PI);}else x.translate(R.x,R.y);
 if(v.shake>.3)x.translate((Math.random()-.5)*v.shake,(Math.random()-.5)*v.shake);
 // board panel
 x.fillStyle='rgba(12,6,22,.62)';rr(x,v.bx-6,v.by-6,cs*st.C+12,cs*st.R+12,cs*.3);x.fill();
 for(let i=0;i<st.R*st.C;i++){if(!st.mask[i])continue;const c=i%st.C,r=(i/st.C)|0;x.fillStyle=(c+r)%2?'rgba(255,255,255,.07)':'rgba(255,255,255,.12)';x.fillRect(v.bx+c*cs,v.by+r*cs,cs,cs);}
 x.save();x.beginPath();x.rect(v.bx-4,v.by-4,cs*st.C+8,cs*st.R+8);x.clip();
 const hint=showHint&&v.hint&&v.phase==='idle'&&v.human?v.hint:null;
 for(let i=0;i<st.R*st.C;i++){const p=st.cells[i];if(!p)continue;const d=v.disp.get(p.id)||{x:i%st.C,y:(i/st.C)|0,pop:0};
  let px=v.bx+(d.x+.5)*cs,py=v.by+(d.y+.5)*cs,sc=1+d.pop*.35-(d.land||0)*.6;
  if(v.bad&&(i===v.bad.a||i===v.bad.b)){const o=v.bad.a===i?v.bad.b:v.bad.a,k=Math.sin(Math.min(1,v.bad.t/.32)*Math.PI)*.35,{x:ox,y:oy}=cellXY(v,o);px+=(ox-px)*k;py+=(oy-py)*k;}
  if(hint&&(i===hint[0]||i===hint[1]))sc*=1+Math.sin(t*10)*.08;
  if(v.sel===i){x.fillStyle='rgba(255,255,255,.28)';rr(x,v.bx+(i%st.C)*cs+2,v.by+((i/st.C)|0)*cs+2,cs-4,cs-4,cs*.2);x.fill();sc*=1.06;}
  if(v.cursor===i){x.strokeStyle=v.drag?'#ffd23f':'#fff';x.lineWidth=3;rr(x,v.bx+(i%st.C)*cs+2,v.by+((i/st.C)|0)*cs+2,cs-4,cs-4,cs*.2);x.stroke();}
  drawPiece(x,v.world,p,px,py,cs,t,{scale:sc});}
 for(const dd of v.dying)drawPiece(x,v.world,dd.p,dd.x,dd.y,cs,t,{scale:1+dd.t*2,alpha:1-dd.t/.32});
 for(const b of v.beams){const a=1-b.t/.35,w=cs*(.5+.5*a);x.fillStyle=`rgba(255,255,255,${a*.85})`;if(b.dir==='h')x.fillRect(v.bx,v.by+(b.line+.5)*cs-w/2,cs*st.C,w);else x.fillRect(v.bx+(b.line+.5)*cs-w/2,v.by,w,cs*st.R);}
 for(const b of v.bolts){const a=1-b.t/.45;x.strokeStyle=`rgba(255,240,140,${a})`;x.lineWidth=2.5;x.beginPath();x.moveTo(b.x0,b.y0);const mx=(b.x0+b.x)/2+(Math.random()-.5)*cs,my=(b.y0+b.y)/2+(Math.random()-.5)*cs;x.lineTo(mx,my);x.lineTo(b.x,b.y);x.stroke();}
 x.restore();
 v.fx.draw(x);
 if(v.flash>0){x.fillStyle=`rgba(255,80,80,${v.flash*.35})`;rr(x,v.bx-6,v.by-6,cs*st.C+12,cs*st.R+12,cs*.3);x.fill();}
 const cx=v.bx+cs*st.C/2,cy=v.by+cs*st.R/2;
 if(v.callout){const k=v.callout.t;label(x,v.callout.text,cx,cy-cs*.5-k*cs*.6,clamp(cs*.9,18,46)*(k<.15?k/.15:1),{fill:'#ffe14d',alpha:clamp(1.6-k*1.6,0,1),rot:-.06});}
 if(v.banner){const k=v.banner.t;label(x,v.banner.text,cx,cy,clamp(cs*1.1,20,58)*(k<.18?.6+k*2.2:1),{fill:v.banner.color,alpha:clamp((v.banner.life-k)*2.5,0,1),rot:-.05});}
 if(dimmed){x.fillStyle='rgba(0,0,0,.45)';rr(x,v.bx-6,v.by-6,cs*st.C+12,cs*st.R+12,cs*.3);x.fill();}
 x.restore();}

// ---- the engine -------------------------------------------------------------------------------------------------
async function crappyCrush(s){
 const [c,x]=s.canvas(900,600,{fill:true});const fb=fullBleed(s,{bg:'#14061e'});s.body.classList.add('drag-arena-body');
 const names=[0,1].map(i=>s.players[i]?.name||`P${i+1}`);let T=0,tick=null;
 s.frame(dt=>{if(tick)tick(dt);});// one loop; each screen swaps in its own tick
 s.debug={engine:'crappycrush',mode:null};
 // which mode?
 let mode='versus';
 if(s.solo&&!s.solo.board&&!s.solo.duel&&!isOnline(s)){mode=await pickMode();if(!s.alive)return;if(mode==='stages')s.solo.kind='levels';}
 s.debug.mode=mode;
 if(mode==='stages')return stagesMode();return versusMode();

 // ----------------------------------------------------------------- mode picker (Arcade 1 Player)
 function pickMode(){return new Promise(res=>{let pick=null;const cards=()=>{const W=s.W,H=s.H,cw=Math.min(W*.84,380),ch=Math.min(H*.25,170),gap=18,y0=H*.36;
   return [{id:'stages',x:(W-cw)/2,y:y0,w:cw,h:ch,title:'STAGES',sub:`The real thing: ${STAGE_COUNT} stages, goals, stars`,col:'#ff4f9a'},{id:'cpu',x:(W-cw)/2,y:y0+ch+gap,w:cw,h:ch,title:'VS CPU',sub:'Race the CPU for 90 s and dump crap on it',col:'#2fd6c9'}];};
  const off=s.on(c,'pointerup',ev=>{const p=s.pointer(ev);for(const k of cards())if(p.x>k.x&&p.x<k.x+k.w&&p.y>k.y&&p.y<k.y+k.h){pick=k.id;sfx.coin();}});void off;
  s.debug.pickMode=id=>{pick=id;};
  tick=(dt=>{T+=dt;if(pick){const p=pick;pick=null;tick=null;res(p);return;}const W=s.W,H=s.H;drawBackdrop(x,WORLDS[0],0,0,W,H,.2);
   logo(W/2,H*.17,Math.min(W*.11,58));label(x,'How do you want to play?',W/2,H*.29,clamp(W*.045,14,22),{fill:'#fff'});
   for(const k of cards()){x.fillStyle='rgba(12,6,22,.78)';rr(x,k.x,k.y,k.w,k.h,22);x.fill();x.strokeStyle=k.col;x.lineWidth=4;rr(x,k.x,k.y,k.w,k.h,22);x.stroke();
    label(x,k.title,k.x+k.w/2,k.y+k.h*.4,clamp(k.h*.28,20,44),{fill:k.col});label(x,k.sub,k.x+k.w/2,k.y+k.h*.72,clamp(k.h*.11,11,17),{fill:'#fff',stroke:null});}
  });});}
 function logo(cx,cy,size){label(x,'CRAPPY',cx,cy-size*.55,size,{fill:'#ffd23f',rot:-.04,lw:size*.2});label(x,'CRUSH',cx,cy+size*.45,size*1.1,{fill:'#ff4f9a',rot:-.04,lw:size*.2});
  x.font=`${size*.8}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('💩',cx+size*2.3,cy-size*.3);}

 // ================================================================= STAGES (1P, the real Candy Crush)
 async function stagesMode(){
  const prof=store.profile||{},Q=prof.crappyCrush&&typeof prof.crappyCrush==='object'?prof.crappyCrush:(prof.crappyCrush={cleared:0,stars:{},best:{}});
  if(!Number.isFinite(Q.cleared))Q.cleared=0;Q.stars||={};Q.best||={};
  let total=0,cleared=0,view='map',mapScroll=null,mapDrag=null,panel=null,cur=null,stg=null,v=null,movesLeft=0,result=null,dripN=0,finale=null;
  const save=()=>{try{saveProfile(store.profile);}catch{}};
  const totalStars=()=>Object.values(Q.stars).reduce((a,b)=>a+(+b||0),0);
  const maxShown=()=>Math.max(STAGE_COUNT,Q.cleared+8);
  // map geometry: stage n's node, stage 1 at the bottom
  const SP=96,nodeY=n=>(maxShown()-n)*SP+150,nodeX=n=>s.W/2+Math.sin(n*.95)*Math.min(s.W*.3,150);
  const mapH=()=>nodeY(1)+160;
  const clampScroll=v2=>clamp(v2,0,Math.max(0,mapH()-s.H));
  const scrollTo=n=>{mapScroll=clampScroll(nodeY(n)-s.H*.55);};
  s.hint('Stages: tap a stage on the map. Swap two neighbouring pieces (swipe, or tap one then the other) to line up 3 or more. 4 in a row = a Mylo Coin (clears its row or column), an L or T = a KC Coin (blast), 5 in a row = the Loki Coin (swap it with any piece to clear every piece of that kind). Crap never matches: match next to it to clear it. Meet the goal before the moves run out.');
  s.on(c,'pointerdown',ev=>{if(s.paused)return;const p=s.pointer(ev);
   if(view==='map'&&!panel){mapDrag={y:p.y,start:mapScroll,moved:0};return;}
   if(view==='play'&&v&&!panel&&!result)boardDown(v,p);});
  s.on(c,'pointermove',ev=>{if(s.paused)return;const p=s.pointer(ev);
   if(view==='map'&&mapDrag){mapDrag.moved=Math.max(mapDrag.moved,Math.abs(p.y-mapDrag.y));mapScroll=clampScroll(mapDrag.start-(p.y-mapDrag.y));return;}
   if(view==='play'&&v)boardMove(v,p);});
  s.on(c,'pointerup',ev=>{if(s.paused)return;const p=s.pointer(ev);
   if(view==='map'){const d=mapDrag;mapDrag=null;if(panel){panelTap(p);return;}if(d&&d.moved<10)mapTap(p);return;}
   if(view==='play'){if(panel||result){panelTap(p);return;}if(v)boardUp(v,p);}});
  s.on(c,'wheel',ev=>{if(view==='map'){ev.preventDefault();mapScroll=clampScroll(mapScroll+ev.deltaY);}},{passive:false});
  keyboard(s,(i,k,down)=>{if(!down||i!==0)return;if(view==='play'&&v&&!panel&&!result)keyMove(v,k);else if((panel||result)&&k==='act')panelTap(null,'primary');});
  s.debug.stages={get Q(){return Q;},get view(){return view;},get v(){return v;},get stg(){return stg;},open:n=>openStage(n),start:()=>{panel=null;startStage();},win:()=>{if(v)v.st.score=Math.max(v.st.score,stg.s3);}};

  function mapTap(p){const top=mapScroll;for(let n=1;n<=maxShown();n++){const nx=nodeX(n),ny=nodeY(n)-top;if(Math.hypot(p.x-nx,p.y-ny)<34){if(n<=Q.cleared+1){sfx.click();openStage(n);}else sfx.buzz();return;}}
   // "Done" pill
   const b=doneBtn();if(p.x>b.x&&p.x<b.x+b.w&&p.y>b.y&&p.y<b.y+b.h){sfx.click();finishRun();}}
  const doneBtn=()=>({x:12,y:s.H-58,w:110,h:44});
  function openStage(n){cur=n;stg=stageDef(n);panel={kind:'intro',t:0};}
  function panelButtons(){const W=s.W,H=s.H,pw=Math.min(W*.88,400),ph=Math.min(H*.62,440),px=(W-pw)/2,py=(H-ph)/2,bw=pw*.42,bh=52;
   if(panel?.kind==='intro')return {box:[px,py,pw,ph],btn:[{id:'play',label:'PLAY',x:px+pw/2-bw/2,y:py+ph-bh-18,w:bw,h:bh,col:'#ff4f9a',primary:true},{id:'close',label:'✕',x:px+pw-52,y:py+8,w:44,h:44,col:'#555'}]};
   if(result)return {box:[px,py,pw,ph],btn:result.win?[{id:'next',label:'NEXT',x:px+pw-bw-18,y:py+ph-bh-18,w:bw,h:bh,col:'#4fd66a',primary:true},{id:'map',label:'MAP',x:px+18,y:py+ph-bh-18,w:bw,h:bh,col:'#4ab6ff'}]:[{id:'retry',label:'TRY AGAIN',x:px+pw-bw-18,y:py+ph-bh-18,w:bw,h:bh,col:'#ff4f9a',primary:true},{id:'map',label:'MAP',x:px+18,y:py+ph-bh-18,w:bw,h:bh,col:'#4ab6ff'}]};
   return null;}
  function panelTap(p,force){const L=panelButtons();if(!L)return;const b=force==='primary'?L.btn.find(q=>q.primary):L.btn.find(q=>p&&p.x>q.x&&p.x<q.x+q.w&&p.y>q.y&&p.y<q.y+q.h);if(!b)return;sfx.click();
   if(b.id==='play'){panel=null;startStage();}
   else if(b.id==='close'){panel=null;}
   else if(b.id==='next'){result=null;view='map';openStage(Math.min(cur+1,maxShown()));scrollTo(cur);}
   else if(b.id==='retry'){result=null;startStage();}
   else if(b.id==='map'){result=null;view='map';scrollTo(cur);}}
  function startStage(){const seed=`${s.seed}:cc:${cur}:${Date.now()%100000}`;v=makeView(S.stageBoard(stg,seed),stg.world,{i:0,name:names[0]});
   v.onSwap=()=>{if(!finale)movesLeft=Math.max(0,movesLeft-1);};movesLeft=stg.moves;dripN=0;finale=null;result=null;view='play';T=0;v.banner={text:`STAGE ${cur}`,t:0,life:1.4,color:'#fff'};}
  function finishRun(){save();soloFinish(s,total,cleared,`Crappy Crush: ${cleared} stage${cleared===1?'':'s'} cleared, ${total.toLocaleString()} points.`,cleared>0);}

  // move finished (board settled): goal, drip, finale, out of moves
  function afterMove(){if(!v)return;
   if(finale){finaleStep();return;}
   if(S.goalDone(v.st,stg)){finale={left:movesLeft,stage:0};v.banner={text:'CRAPPY CRUSH!',t:0,life:1.6,color:'#ff4f9a'};sfx.fanfare();vibrate(60);finaleStep();return;}
   if(movesLeft<=0){endStage(false);return;}
   if(stg.drip&&++dripN%stg.drip===0){const hit=S.dropCrap(v.st,1);for(const h of hit){const {x:hx,y:hy}=cellXY(v,h.at);v.fx.splat(hx,hy,{n:14,speed:v.cell*6,size:v.cell*.08,color:'#7a4520',decal:false});}if(hit.length){v.banner={text:'THE TOILET BACKED UP!',t:0,life:1.2,color:'#c88a4a'};sfx.splat();}}
   if(!S.hasMove(v.st)){S.shuffle(v.st);v.banner={text:'SHUFFLE',t:0,life:1,color:'#fff'};}
   v.phase='idle';}
  function finaleStep(){// each move left: one striped piece fires; then everything on the board goes off
   if(finale.left>0){const n=Math.min(finale.left,3);finale.left-=n;movesLeft-=n;v.st.score+=n*300;S.finaleStripes(v.st,n);if(S.fireAllSpecials(v.st)){v.forced=true;v.phase='resolve';return;}}
   if(S.fireAllSpecials(v.st)&&finale.stage++<6){v.forced=true;v.phase='resolve';return;}
   endStage(true);}
  function endStage(win){v.phase='done';const sc=v.st.score,st3=win?S.stars(v.st,stg)||1:0;
   if(win){const prev=+Q.stars[cur]||0;Q.stars[cur]=Math.max(prev,st3);Q.best[cur]=Math.max(+Q.best[cur]||0,sc);if(cur>Q.cleared)Q.cleared=cur;total+=sc;cleared++;
    soloProgress(s,total,cleared,`Crappy Crush: ${cleared} stage${cleared===1?'':'s'} cleared, up to Stage ${cur}.`);s.setScores([total,0]);sfx.fanfare();vibrate(80);
    v.fx.confetti(v.bx+v.cell*v.st.C/2,v.by+v.cell*2,80);}
   else sfx.groan();
   save();result={win,stars:st3,score:sc,t:0};}

  tick=(dt=>{T+=dt;const W=s.W,H=s.H;
   if(view==='map'){if(mapScroll==null)scrollTo(Q.cleared+1);drawMap(W,H);if(panel)drawIntro(W,H);return;}
   // play
   const top=Math.max(fb.top,8);place(v,{x:0,y:top,w:W,h:H-top,rot:false},Math.min(150,H*.2),true);
   v.settled=stepDisp(v,dt);
   if(v.phase==='idle'&&!result){v.hintT+=dt;if(v.hintT>6&&!v.hint)v.hint=S.hint(v.st);}
   if(v.phase!=='idle'&&v.phase!=='done'&&v.phase!=='busy'){stepMove(v,dt,(vv,w)=>{if(finale)vv.st.score-=Math.round(w.points*.7);});/* the finale pays 30% */if(v.phase==='settle'){v.phase='busy';afterMove();}}
   drawBackdrop(x,stg.world,0,0,W,H);drawView(x,v,T);drawStageHud(W,H,top);
   if(result){result.t+=dt;if(result.t>.6)drawResult(W,H);}
  });

  function drawMap(W,H){const top=mapScroll;drawBackdrop(x,WORLDS[(Math.floor((Q.cleared)/PER))%WORLDS.length],0,0,W,H,.45);
   // world bands
   for(let wi=0;wi*PER<maxShown();wi++){const w=WORLDS[wi%WORLDS.length],n0=wi*PER+1,n1=n0+PER-1,y0=nodeY(n1)-top-60,y1=nodeY(n0)-top+60;if(y1<-80||y0>H+80)continue;
    const g=x.createLinearGradient(0,y0,0,y1);const art=!!USER['crappy:'+w.key];g.addColorStop(0,w.tint[1]+(art?'66':'cc'));g.addColorStop(1,w.tint[0]+(art?'22':'88'));x.fillStyle=g;x.fillRect(0,y0,W,y1-y0);
    label(x,(wi>=WORLDS.length?'REMIX · ':'')+w.name.toUpperCase(),W/2,y0+26,clamp(W*.05,15,24),{fill:'#fff'});
    for(let k=0;k<6;k++){const pic=itemPic(w.items[k]),px=W/2+(k-2.5)*30;if(pic)x.drawImage(pic,px-13,y0+40,26,26);}}
   // path
   x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=10;x.setLineDash([2,16]);x.lineCap='round';x.beginPath();
   for(let n=1;n<=maxShown();n++){const nx=nodeX(n),ny=nodeY(n)-top;if(n===1)x.moveTo(nx,ny);else x.lineTo(nx,ny);}x.stroke();x.setLineDash([]);
   for(let n=1;n<=maxShown();n++){const nx=nodeX(n),ny=nodeY(n)-top;if(ny<-50||ny>H+50)continue;const open=n<=Q.cleared+1,curN=n===Q.cleared+1,w=WORLDS[Math.floor((n-1)/PER)%WORLDS.length];
    const r=curN?30+Math.sin(T*5)*2:26;x.fillStyle=open?w.tint[0]:'#555';x.beginPath();x.arc(nx,ny,r,0,TAU);x.fill();x.strokeStyle=open?'#fff':'#888';x.lineWidth=4;x.stroke();
    label(x,open?String(n):'🔒',nx,ny+1,open?18:16,{fill:'#fff'});
    const st3=+Q.stars[n]||0;if(open&&n<=Q.cleared)for(let k=0;k<3;k++)label(x,'★',nx+(k-1)*15,ny+r+10-(k===1?4:0),15,{fill:k<st3?'#ffd23f':'#555',lw:3});
    if(curN)s.sprite(x,0,nx,ny-r-26,40,{exact:true});
    if((n-1)%PER===PER-1&&open)label(x,'💩',nx+r+6,ny-r+4,16,{stroke:null});}
   // header
   x.fillStyle='rgba(10,4,16,.75)';x.fillRect(0,0,W,Math.max(fb.top,10)+56);logo(W*.3,Math.max(fb.top,10)+26,18);label(x,`★ ${totalStars()}`,W*.62,Math.max(fb.top,10)+28,20,{fill:'#ffd23f'});
   const b=doneBtn();x.fillStyle='rgba(10,4,16,.8)';rr(x,b.x,b.y,b.w,b.h,22);x.fill();label(x,cleared?`DONE · ${cleared}`:'DONE',b.x+b.w/2,b.y+b.h/2,15,{fill:'#fff'});}

  function goalLines(){const out=[];if(stg.kind==='score')out.push({text:`Score ${stg.target.toLocaleString()}`});
   for(const [k,n] of stg.collect)out.push({k,n});if(stg.kind==='crap'||stg.kind==='mix')out.push({crap:stg.crapGoal});return out;}
  function drawIntro(W,H){const L=panelButtons(),[px,py,pw,ph]=L.box;x.fillStyle='rgba(0,0,0,.5)';x.fillRect(0,0,W,H);
   x.fillStyle='#24103a';rr(x,px,py,pw,ph,26);x.fill();x.strokeStyle=stg.world.tint[0];x.lineWidth=5;rr(x,px,py,pw,ph,26);x.stroke();
   label(x,`STAGE ${cur}`,px+pw/2,py+42,30,{fill:'#ffd23f'});label(x,stg.world.name+(stg.loop?' · REMIX':''),px+pw/2,py+76,17,{fill:'#fff',stroke:null});
   const gl=goalLines();label(x,stg.kind==='score'?'Reach the score':stg.kind==='collect'?'Collect them all':stg.kind==='crap'?'Clear the crap':'Collect AND clear the crap',px+pw/2,py+116,16,{fill:'#9dff5c',stroke:null});
   gl.forEach((g,j)=>{const gx=px+pw/2+(j-(gl.length-1)/2)*96,gy=py+ph*(stg.tip?.34:.42);if(g.text){label(x,g.text,px+pw/2,gy,22,{fill:'#fff'});return;}
    if(g.crap){drawCrap(x,gx,gy,56,1,T);label(x,'×'+g.crap,gx,gy+42,20);return;}drawPiece(x,stg.world,{k:g.k,sp:0},gx,gy,62,T);label(x,'×'+g.n,gx,gy+42,20);});
   label(x,`${stg.moves} moves`,px+pw/2,py+ph*(stg.tip?.675:.64),18,{fill:'#fff',stroke:null});
   if(stg.tip){x.save();x.font=`700 ${clamp(pw*.038,12,15)}px sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillStyle='#ffe9a8';const words=stg.tip.split(' '),lines=[];let ln='';for(const w of words){const t2=ln?ln+' '+w:w;if(x.measureText(t2).width>pw-44&&ln){lines.push(ln);ln=w;}else ln=t2;}lines.push(ln);
    const lh=clamp(pw*.05,15,19),y0=py+ph*.565-(lines.length-1)*lh/2;x.fillStyle='rgba(255,210,63,.14)';rr(x,px+14,y0-lh*.8,pw-28,lines.length*lh+lh*.5,12);x.fill();x.fillStyle='#ffe9a8';lines.forEach((l,j)=>x.fillText(l,px+pw/2,y0+j*lh));x.restore();}
   const st3=+Q.stars[cur]||0;for(let k=0;k<3;k++)label(x,'★',px+pw/2+(k-1)*34,py+ph*.74,30,{fill:k<st3?'#ffd23f':'#4a3a5a'});
   if(Q.best[cur])label(x,`Best ${(+Q.best[cur]).toLocaleString()}`,px+pw/2,py+ph*.82,13,{fill:'#bbb',stroke:null});
   for(const b of L.btn){x.fillStyle=b.col;rr(x,b.x,b.y,b.w,b.h,b.h/2);x.fill();label(x,b.label,b.x+b.w/2,b.y+b.h/2,b.h*.42,{fill:'#fff'});}}
  function drawStageHud(W,H,top){const hd=v.hd,y=top+4;x.fillStyle='rgba(12,6,22,.72)';rr(x,8,y,W-16,hd-12,18);x.fill();
   // moves
   const mw=Math.min(90,W*.2);x.fillStyle=stg.world.tint[0];rr(x,16,y+8,mw,hd-28,14);x.fill();label(x,'MOVES',16+mw/2,y+22,11,{fill:'#fff',stroke:null});label(x,String(movesLeft),16+mw/2,y+(hd-12)/2+10,clamp(hd*.28,18,40),{fill:movesLeft<=3?'#ffe14d':'#fff'});
   // goals
   const gl=goalLines(),gx0=16+mw+14,gw=W-gx0-Math.min(120,W*.27)-14;
   gl.forEach((g,j)=>{const gx=gx0+gw*(j+.5)/gl.length,gy=y+hd*.36,sz=Math.min(46,hd*.4);
    if(g.text){label(x,'TARGET',gx,gy-10,11,{fill:'#bbb',stroke:null});label(x,stg.target.toLocaleString(),gx,gy+10,18,{fill:v.st.score>=stg.target?'#9dff5c':'#fff'});return;}
    let left;if(g.crap){drawCrap(x,gx,gy,sz,1,T);left=Math.max(0,g.crap-v.st.crapCleared);}else{drawPiece(x,stg.world,{k:g.k,sp:0},gx,gy,sz,T);left=Math.max(0,g.n-v.st.collected[g.k]);}
    label(x,left?String(left):'✔',gx,gy+sz*.62,16,{fill:left?'#fff':'#9dff5c'});});
   // score + stars
   const sx=W-16-Math.min(120,W*.27),sw=Math.min(120,W*.27);label(x,v.st.score.toLocaleString(),sx+sw/2,y+24,clamp(hd*.17,14,24),{fill:'#fff'});
   const bar={x:sx+6,y:y+hd*.5,w:sw-12,h:12},max=stg.s3*1.05,k=clamp(v.st.score/max,0,1);x.fillStyle='#333';rr(x,bar.x,bar.y,bar.w,bar.h,6);x.fill();x.fillStyle='#ff4f9a';rr(x,bar.x,bar.y,Math.max(12,bar.w*k),bar.h,6);x.fill();
   for(const [j,thr] of [stg.target,stg.s2,stg.s3].entries()){const tx=bar.x+bar.w*clamp(thr/max,0,1);label(x,'★',tx,bar.y+bar.h+12,16,{fill:v.st.score>=thr?'#ffd23f':'#555',lw:3});void j;}
   label(x,`STAGE ${cur} · ${stg.world.name}`,W/2,top+hd-2,12,{fill:'#ddd',stroke:'#000'});}
  function drawResult(W,H){const L=panelButtons();if(!L)return;const [px,py,pw,ph]=L.box,k=Math.min(1,(result.t-.6)*3);x.fillStyle=`rgba(0,0,0,${.5*k})`;x.fillRect(0,0,W,H);
   x.save();x.translate(W/2,H/2);x.scale(.8+.2*k,.8+.2*k);x.translate(-W/2,-H/2);
   x.fillStyle='#24103a';rr(x,px,py,pw,ph,26);x.fill();x.strokeStyle=result.win?'#4fd66a':'#ff4d6d';x.lineWidth=5;rr(x,px,py,pw,ph,26);x.stroke();
   label(x,result.win?'STAGE CLEARED!':'OUT OF MOVES',px+pw/2,py+50,28,{fill:result.win?'#9dff5c':'#ff6b6b'});
   label(x,`Stage ${cur} · ${stg.world.name}`,px+pw/2,py+84,15,{fill:'#fff',stroke:null});
   for(let j=0;j<3;j++){const on=j<result.stars&&result.t>.8+j*.3;label(x,'★',px+pw/2+(j-1)*70,py+ph*.38-(j===1?14:0),on?64:54,{fill:on?'#ffd23f':'#3a2a4a',lw:6});}
   label(x,result.score.toLocaleString(),px+pw/2,py+ph*.58,34,{fill:'#fff'});
   if(!result.win){const gl=goalLines().map(g=>g.text?`score ${stg.target.toLocaleString()}`:g.crap?`${Math.max(0,g.crap-v.st.crapCleared)} crap left`:`${Math.max(0,g.n-v.st.collected[g.k])} left`).join(' · ');label(x,gl,px+pw/2,py+ph*.7,14,{fill:'#ffcf8a',stroke:null});}
   else label(x,`Total this run ${total.toLocaleString()}`,px+pw/2,py+ph*.7,14,{fill:'#bbb',stroke:null});
   for(const b of L.btn){x.fillStyle=b.col;rr(x,b.x,b.y,b.w,b.h,b.h/2);x.fill();label(x,b.label,b.x+b.w/2,b.y+b.h/2,b.h*.38,{fill:'#fff'});}
   x.restore();}
 }

 // ---- shared board input (pointer in screen coords) --------------------------------------------------------------
 function boardDown(v,p){if(v.phase!=='idle')return;const lp=toLocal(v,p),i=cellAt(v,lp);if(i<0){v.sel=null;return;}
  if(v.sel!=null&&v.sel!==i&&isAdj(v,v.sel,i)){const a=v.sel;v.sel=null;startSwap(v,a,i);v.drag=null;return;}
  v.sel=i;v.drag={i,x:lp.x,y:lp.y,done:false};v.hintT=0;v.hint=null;}
 function boardMove(v,p){const d=v.drag;if(!d||d.done||v.phase!=='idle')return;const lp=toLocal(v,p),dx=lp.x-d.x,dy=lp.y-d.y;if(Math.hypot(dx,dy)<v.cell*.4)return;
  const st=v.st,r=(d.i/st.C)|0,c2=d.i%st.C;let j=-1;if(Math.abs(dx)>Math.abs(dy)){if(dx>0&&c2+1<st.C)j=d.i+1;else if(dx<0&&c2>0)j=d.i-1;}else{if(dy>0&&r+1<st.R)j=d.i+st.C;else if(dy<0&&r>0)j=d.i-st.C;}
  d.done=true;v.drag=null;if(j>=0&&st.mask[j])startSwap(v,d.i,j);else v.sel=null;}
 function boardUp(v){v.drag=null;}
 function isAdj(v,a,b){const C=v.st.C;return (Math.abs(a-b)===1&&((a/C)|0)===((b/C)|0))||Math.abs(a-b)===C;}
 function keyMove(v,k){if(v.phase!=='idle')return;const st=v.st;if(v.cursor==null)v.cursor=st.mask.findIndex(Boolean);const r=(v.cursor/st.C)|0,c2=v.cursor%st.C;
  if(k==='act'){v.drag=v.drag?null:{key:true};return;}
  let j=-1;if(k==='l'&&c2>0)j=v.cursor-1;if(k==='r'&&c2+1<st.C)j=v.cursor+1;if(k==='u'&&r>0)j=v.cursor-st.C;if(k==='d'&&r+1<st.R)j=v.cursor+st.C;if(j<0||!st.mask[j])return;
  if(v.drag?.key){v.drag=null;startSwap(v,v.cursor,j);}v.cursor=j;}

 // ================================================================= VERSUS (2P local, vs CPU, online)
 async function versusMode(){
  const nf=netField(s,{pack:i=>packBoard(P[i]),unpack:(i,d)=>{remote=d;},onEvent:e=>{if(e&&e.crap>0)queueCrap(P[nf.me],e.crap|0);}});
  let remote=null;
  const rnd=seededRandom(s.seed+':cc-vs'),world=WORLDS[(rnd()*WORLDS.length)|0],seed=s.seed+':cc-board';
  const cpu=isCpu(s),solo1=cpu||!!nf;// one big board + a small one for the other side
  const P=[0,1].map(i=>{const v=makeView(S.make({R:8,C:8,K:6,seed}),world,{i,name:names[i],human:!(cpu&&i===1)});v.score=0;return v;});
  const me=nf?nf.me:0,other=1-me;
  let left=VS_TIME,phase='play',endT=0,netEnd=null,cpuT=1.4;
  s.shared=!nf;s.updateScores?.();
  s.debug.vs={P,get left(){return left;},set left(v){left=v;},world:world.key,get phase(){return phase;}};
  function queueCrap(v,n){v.incoming+=n;v.flash=1;}
  function packBoard(v){return {b:v.st.cells.map((p,i)=>!v.st.mask[i]?'.':!p?' ':p.crap?'xyz'[Math.min(3,p.crap)-1]:p.sp==='b'?'B':p.sp==='h'?'abcdef'[p.k]:p.sp==='v'?'ghijkl'[p.k]:p.sp==='w'?'mnopqr'[p.k]:String(p.k)).join(''),sc:v.st.score,inc:v.incoming};}
  function unpackCells(str){return [...str].map(ch=>ch==='.'||ch===' '?null:'xyz'.includes(ch)?{crap:'xyz'.indexOf(ch)+1}:ch==='B'?{k:-1,sp:'b'}:/[a-f]/.test(ch)?{k:ch.charCodeAt(0)-97,sp:'h'}:/[g-l]/.test(ch)?{k:ch.charCodeAt(0)-103,sp:'v'}:/[m-r]/.test(ch)?{k:ch.charCodeAt(0)-109,sp:'w'}:{k:+ch,sp:0});}
  function layout(){const W=s.W,H=s.H,top=Math.max(fb.top,6);
   if(solo1){const miniH=Math.round(clamp(H*.24,120,200));place(P[me],{x:0,y:top+miniH,w:W,h:H-top-miniH,rot:false},Math.min(64,H*.08),true);
    if(!nf)place(P[other],{x:W*.5,y:top,w:W*.5,h:miniH,rot:false},28);return {miniH,top};}
   const portrait=W<H*.95;if(portrait){const h=Math.floor((H-top)/2);place(P[0],{x:0,y:top,w:W,h,rot:true},46);place(P[1],{x:0,y:top+h,w:W,h:H-top-h,rot:false},46);}
   else{const w=Math.floor(W/2);place(P[0],{x:0,y:top,w,h:H-top,rot:false},52);place(P[1],{x:w,y:top,w:W-w,h:H-top,rot:false},52);}return {top};}
  // input: local 2P = the half you touch; vs CPU / online = everything is yours
  const ownerOf=p=>{if(solo1)return me;const W=s.W,H=s.H;return W<H*.95?(p.y<(Math.max(fb.top,6)+(H-Math.max(fb.top,6))/2)?0:1):(p.x<W/2?0:1);};
  halfPointers(s,{chooseOwner:ownerOf,cpuOwner:false,
   down:(i,r)=>{if(phase!=='play')return;const v=P[i];if(!v.human)return;boardDown(v,{x:r.x,y:r.y});},
   move:(i,r)=>{if(phase!=='play')return;const v=P[i];if(!v.human)return;boardMove(v,{x:r.x,y:r.y});},
   up:(i)=>{const v=P[i];if(v)boardUp(v);}});
  keyboard(s,(i,k,down)=>{if(!down||phase!=='play')return;const v=solo1?P[me]:P[i];if(v&&v.human)keyMove(v,k);});
  s.hint('Both race the same board for 90 seconds. Swipe a piece (or tap two neighbours) to swap: 3+ in a row clear, 4 = Mylo Coin, L/T = KC Coin, 5 = Loki Coin. Cascades and specials dump crap on the other board; your own combos cancel crap coming at you first. Highest score wins.');
  if(!await s.pass(0,`CRAPPY CRUSH · ${world.name}. ${cpu?`You vs ${names[1]}`:'Both of you'}: same board, 90 seconds. Line up 3+ of the same item. Big combos dump crap on the other board (and cancel crap coming at you).`,cpu?'Crush!':'Both ready — crush!',{countdown:3}))return;
  for(const v of P)v.banner={text:world.name.toUpperCase(),t:0,life:1.5,color:'#fff'};
  // a finished move: send crap, then take incoming
  function moveDone(v){const send=Math.min(6,Math.max(0,v.lastWave-1)+v.madeThisMove+(v.comboThisMove?3:0));
   let net=send;if(net>0&&v.incoming>0){const cut=Math.min(net,v.incoming);v.incoming-=cut;net-=cut;}
   if(net>0){const o=P[1-v.i];if(nf){if(v.i===me)nf.event({crap:net});}else queueCrap(o,net);v.banner={text:`💩 ×${net} SENT!`,t:0,life:1,color:'#c88a4a'};sfx.whoosh(300,1200,.08,.25);}
   if(v.incoming>0&&!(nf&&v.i!==me)){const hit=S.dropCrap(v.st,v.incoming,{layers:1});v.incoming=0;for(const h of hit){const {x:hx,y:hy}=cellXY(v,h.at);v.fx.splat(hx,hy,{n:12,speed:v.cell*6,size:v.cell*.08,color:'#7a4520',decal:false});}if(hit.length){sfx.splat();vibrate(25);v.shake=8;s.react?.(v.i,'sad');}}
   if(!S.hasMove(v.st)){S.shuffle(v.st);v.banner={text:'SHUFFLE',t:0,life:1,color:'#fff'};}
   v.phase='idle';v.score=v.st.score;s.setScores(P.map(q=>q.st.score));if(send>=4)s.react?.(v.i,'happy');nf?.push();}
  function cpuThink(dt){const v=P[1];if(v.phase!=='idle')return;cpuT-=dt;if(cpuT>0)return;const sk=cpuSkill(s);cpuT=(1.9-sk*1.25)+Math.random()*.6;
   const r=S.rateMoves(v.st);if(!r.length){S.shuffle(v.st);return;}const m=Math.random()<sk?r[0]:r[(Math.random()*Math.min(r.length,8))|0];v.sel=m.a;setTimeout(()=>{if(v.phase==='idle'&&phase==='play')startSwap(v,m.a,m.b);},180);}
  if(nf)s.debug.bot=()=>{const v=P[me];if(v.phase!=='idle'||phase!=='play')return '';const mv=S.hint(v.st);if(mv)startSwap(v,mv[0],mv[1]);return 'swap';};
  tick=(dt=>{T+=dt;const W=s.W,H=s.H,L=layout();
   if(phase==='play'){left-=dt;nf?.tick(dt);
    for(const v of P){if(nf&&v.i!==me)continue;v.settled=stepDisp(v,dt);if(v.phase!=='idle'){stepMove(v,dt);if(v.phase==='settle'){v.phase='busy';moveDone(v);}}else if(v.human){v.hintT+=dt;if(v.hintT>5&&!v.hint)v.hint=S.hint(v.st);}}
    if(cpu)cpuThink(dt);
    const idle=P.every(v=>(nf&&v.i!==me)||v.phase==='idle'||v.phase==='done');
    if(left<=0&&idle){if(nf){if(!netEnd){netEnd='wait';nf.finish(P[me].st.score);nf.remoteDone().then(val=>{remote={...(remote||{}),sc:+val||0};phase='end';endT=1.8;sfx.ding(880);});}}else{phase='end';endT=1.8;sfx.ding(880);}}
    if(left<=0)for(const v of P)if(v.phase==='idle')v.phase='done';}
   else{endT-=dt;for(const v of P)if(!(nf&&v.i!==me))stepDisp(v,dt);
    if(endT<=0&&s.alive){const sc=P.map(v=>v.st.score);if(nf)sc[other]=remote?.sc|0;const txt=sc[0]===sc[1]?`Crappy Crush ties ${sc[0]}–${sc[1]}.`:`${names[sc[0]>sc[1]?0:1]} wins Crappy Crush ${Math.max(...sc).toLocaleString()}–${Math.min(...sc).toLocaleString()}.`;s.finish(sc,txt);return;}}
   // draw
   drawBackdrop(x,world,0,0,W,H,.4);
   if(solo1){drawView(x,P[me],T,{dimmed:phase!=='play'});drawMini(L);hudVs(P[me],true);}
   else{for(const v of P){drawView(x,v,T,{dimmed:phase!=='play'});hudVs(v,false);}}
   const tl=Math.ceil(Math.max(0,left));
   if(solo1)label(x,String(tl),W*.25,L.top+L.miniH*.5,clamp(W*.09,24,48),{fill:left<10?'#ff6b6b':'#ffd23f'});
   else{const portrait=W<H*.95;if(portrait)label(x,String(tl),W/2,Math.max(fb.top,6)+(H-Math.max(fb.top,6))/2,26,{fill:left<10?'#ff6b6b':'#ffd23f'});else label(x,String(tl),W/2,Math.max(fb.top,6)+18,24,{fill:left<10?'#ff6b6b':'#ffd23f'});}
   if(netEnd==='wait'&&phase==='play')label(x,`Waiting for ${names[other]}…`,W/2,H*.5,20,{fill:'#fff'});
   if(phase==='end'){const sc=P.map(v=>v.st.score);if(nf)sc[other]=remote?.sc|0;label(x,'TIME!',W/2,H*.45,clamp(W*.12,30,70),{fill:'#ffd23f'});label(x,sc[0]===sc[1]?'TIE':`${names[sc[0]>sc[1]?0:1]} WINS`,W/2,H*.45+50,clamp(W*.06,18,34),{fill:'#fff'});}
  });
  function hudVs(v,big){const R=v.rect;x.save();if(R.rot){x.translate(R.x+R.w,R.y+R.h);x.rotate(Math.PI);}else x.translate(R.x,R.y);
   const hy=v.hd/2+2,hx=R.x>0&&!R.rot?62:28;/* clear of the timer in landscape */s.sprite(x,v.i,hx,hy,Math.min(40,v.hd*.8),{exact:true});label(x,v.name,hx+26,hy-8,14,{align:'left',fill:v.i?'#ff9fc6':'#78b6ff'});label(x,v.st.score.toLocaleString(),hx+26,hy+10,big?20:18,{align:'left',fill:'#fff'});
   if(v.incoming>0){const ix=R.w-70;drawCrap(x,ix,hy,30,1,T);label(x,'×'+v.incoming,ix+26,hy,18,{fill:'#ff6b6b'});}
   x.restore();}
  function drawMini(L){const W=s.W,top=L.top,h=L.miniH,o=P[other];
   x.fillStyle='rgba(10,4,16,.55)';rr(x,W*.5,top+4,W*.5-8,h-8,14);x.fill();
   if(!nf){drawView(x,o,T,{showHint:false});hudMini(o.st.score,o.incoming,top);return;}
   // online: the other phone's board from its snapshot
   const cells=remote?.b?unpackCells(remote.b):null;if(cells){const C=8,R2=8,cs=Math.min((W*.5-24)/C,(h-36)/R2),bx=W*.5+(W*.5-cs*C)/2,by=top+30;
    for(let i=0;i<cells.length;i++){const p=cells[i];if(p)drawPiece(x,world,p,bx+(i%C+.5)*cs,by+(((i/C)|0)+.5)*cs,cs,T);}}
   else label(x,`${names[other]}…`,W*.75,top+h/2,16,{fill:'#bbb',stroke:null});
   hudMini(remote?.sc|0,remote?.inc|0,top);}
  function hudMini(score,inc,top){const W=s.W;s.sprite(x,other,W*.5+22,top+18,26,{exact:true});label(x,`${names[other]} · ${Number(score).toLocaleString()}`,W*.5+40,top+18,13,{align:'left',fill:'#fff'});if(inc>0)label(x,'💩×'+inc,W-40,top+18,13,{fill:'#ff6b6b'});}
 }
}
Object.assign(exports,{crappyCrush});
