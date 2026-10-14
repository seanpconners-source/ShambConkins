// Shared look for the arcade-classic remakes: a 5x7 arcade pixel font, cached glowing pixel sprites, a parallax
// starfield, CRT scanlines and a logical-field fitter. Pure canvas, no assets.
const {clamp}=require("src/utils.js");

// ---------------------------------------------------------------- 5x7 pixel font (bit 4 = leftmost column)
const FONT={A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[28,18,17,17,17,18,28],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],J:[7,2,2,2,2,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],N:[17,17,25,21,19,17,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],Y:[17,17,17,10,4,4,4],Z:[31,1,2,4,8,16,31],
 0:[14,17,19,21,25,17,14],1:[4,12,4,4,4,4,14],2:[14,17,1,2,4,8,31],3:[31,2,4,2,1,17,14],4:[2,6,10,18,31,2,2],5:[31,16,30,1,1,17,14],6:[6,8,16,30,17,17,14],7:[31,1,2,4,8,8,8],8:[14,17,17,14,17,17,14],9:[14,17,17,15,1,2,12],
 '<':[2,4,8,16,8,4,2],'>':[8,4,2,1,2,4,8],'-':[0,0,0,31,0,0,0],'!':[4,4,4,4,4,0,4],'?':[14,17,1,2,4,0,4],':':[0,12,12,0,12,12,0],'.':[0,0,0,0,0,12,12],'=':[0,0,31,0,31,0,0],'+':[0,4,4,31,4,4,0],'/':[1,1,2,4,8,16,16],',':[0,0,0,0,12,4,8],"'":[12,4,8,0,0,0,0],'*':[0,21,14,31,14,21,0],'#':[10,31,10,10,31,10,0],'%':[24,25,2,4,8,19,3],'(':[2,4,8,8,8,4,2],')':[8,4,2,2,2,4,8],'$':[4,15,20,14,5,30,4],'&':[12,18,20,8,21,18,13],'×':[0,17,10,4,10,17,0],' ':[0,0,0,0,0,0,0]};
const glyph=ch=>FONT[ch]||FONT[ch.toUpperCase?.()]||FONT['?'];
const textCache=new Map();
function textCanvas(text,color,glow){
 const key=text+'|'+color+'|'+glow;let cv=textCache.get(key);if(cv)return cv;
 const P=4,pad=glow?6:0,chars=[...String(text)],w=chars.length*6*P-P,h=7*P;
 cv=document.createElement('canvas');cv.width=Math.max(1,w+pad*2);cv.height=h+pad*2;const g=cv.getContext('2d');g.fillStyle=color;if(glow){g.shadowColor=color;g.shadowBlur=glow;}
 chars.forEach((ch,i)=>{const rows=glyph(ch);for(let r=0;r<7;r++)for(let c=0;c<5;c++)if(rows[r]&(16>>c))g.fillRect(pad+(i*6+c)*P,pad+r*P,P,P);});
 cv.pad=pad/P;if(textCache.size>400)textCache.delete(textCache.keys().next().value);textCache.set(key,cv);return cv;
}
// Draw pixel text; size = height of one font pixel in current canvas units. align: left|center|right.
function pixText(x,text,px,py,size,color='#fff',{align='left',glow=0,alpha=1}={}){
 text=String(text);if(!text)return 0;const cv=textCanvas(text,color,glow),k=size/4,w=(cv.width)*k,h=cv.height*k,pad=(cv.pad||0)*size;
 const left=align==='center'?px-(w-pad*2)/2:align==='right'?px-(w-pad*2):px;
 const smooth=x.imageSmoothingEnabled;x.imageSmoothingEnabled=false;const a=x.globalAlpha;x.globalAlpha=a*alpha;x.drawImage(cv,left-pad,py-pad,w,h);x.globalAlpha=a;x.imageSmoothingEnabled=smooth;return w-pad*2;
}
const textWidth=(text,size)=>Math.max(0,[...String(text)].length*6-1)*size;

// ---------------------------------------------------------------- pixel sprites (rows of '#'/'.' strings)
const spriteCache=new Map();
function spriteCanvas(rows,color,res=4,glow=0){
 const key=rows.join('/')+'|'+color+'|'+res+'|'+glow;let cv=spriteCache.get(key);if(cv)return cv;
 const w=rows[0].length,h=rows.length,pad=glow?Math.ceil(glow/res)+1:0;
 cv=document.createElement('canvas');cv.width=(w+pad*2)*res;cv.height=(h+pad*2)*res;const g=cv.getContext('2d');g.fillStyle=color;
 const draw=()=>{for(let r=0;r<h;r++)for(let c=0;c<w;c++)if(rows[r][c]!=='.'&&rows[r][c]!==' ')g.fillRect((c+pad)*res,(r+pad)*res,res,res);};
 if(glow){g.shadowColor=color;g.shadowBlur=glow;draw();g.shadowBlur=0;}draw();
 cv.pad=pad;cv.w=w;cv.h=h;if(spriteCache.size>600)spriteCache.delete(spriteCache.keys().next().value);spriteCache.set(key,cv);return cv;
}
// Draw a sprite with its top-left at (px,py), one sprite pixel = unit canvas units.
function drawSprite(x,rows,px,py,unit,color,{glow=0,alpha=1,res}={}){
 const r=res||clamp(Math.round(unit*(x.getTransform?.().a||1)),1,8),cv=spriteCanvas(rows,color,r,glow),p=cv.pad*unit;
 const a=x.globalAlpha;x.globalAlpha=a*alpha;const s=x.imageSmoothingEnabled;x.imageSmoothingEnabled=false;x.drawImage(cv,px-p,py-p,(cv.w+cv.pad*2)*unit,(cv.h+cv.pad*2)*unit);x.imageSmoothingEnabled=s;x.globalAlpha=a;
}

// ---------------------------------------------------------------- starfield / nebula / CRT
function makeStarfield(rand=Math.random,{count=140,layers=3,nebula=['#3a1a6e','#0e3a6a','#5a1240']}={}){
 const stars=Array.from({length:count},(_,i)=>({x:rand(),y:rand(),l:i%layers,tw:rand()*6.3,c:rand()<.15?'#9fd8ff':rand()<.1?'#ffd29f':'#ffffff'}));
 const blobs=nebula.map(c=>({x:rand(),y:rand()*.8,r:.35+rand()*.35,c}));
 let neb=null,nebKey='';
 return {
  draw(x,W,H,t,{drift=0,bg0='#04020b',bg1='#0b0720'}={}){
   const key=W+'x'+H;if(key!==nebKey){nebKey=key;neb=document.createElement('canvas');neb.width=Math.max(1,W>>1);neb.height=Math.max(1,H>>1);const g=neb.getContext('2d');const lg=g.createLinearGradient(0,0,0,neb.height);lg.addColorStop(0,bg1);lg.addColorStop(1,bg0);g.fillStyle=lg;g.fillRect(0,0,neb.width,neb.height);
    for(const b of blobs){const R=b.r*Math.max(neb.width,neb.height);const rg=g.createRadialGradient(b.x*neb.width,b.y*neb.height,0,b.x*neb.width,b.y*neb.height,R);rg.addColorStop(0,b.c+'66');rg.addColorStop(.5,b.c+'22');rg.addColorStop(1,b.c+'00');g.fillStyle=rg;g.fillRect(0,0,neb.width,neb.height);}}
   x.drawImage(neb,0,0,W,H);
   for(const s of stars){const sp=(s.l+1)/layers,y=((s.y+t*drift*sp*.02)%1+1)%1,a=.35+.65*Math.abs(Math.sin(t*(.6+s.l*.5)+s.tw));x.globalAlpha=a*(.4+sp*.6);x.fillStyle=s.c;const z=s.l===layers-1?2:1.2;x.fillRect(s.x*W,y*H,z,z);}
   x.globalAlpha=1;
  }
 };
}
let scanPat=null,scanCtx=null;
function scanlines(x,W,H,alpha=.18){if(!scanPat||scanCtx!==x){const t=document.createElement('canvas');t.width=1;t.height=3;const g=t.getContext('2d');g.fillStyle=`rgba(0,0,0,${alpha})`;g.fillRect(0,2,1,1);scanPat=x.createPattern(t,'repeat');scanCtx=x;}x.fillStyle=scanPat;x.fillRect(0,0,W,H);}
const vigCache=new WeakMap();
function vignette(x,W,H,strength=.55){let v=vigCache.get(x);const key=W+'x'+H+strength;if(!v||v.key!==key){const g=x.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.hypot(W,H)*.62);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${strength})`);v={key,g};vigCache.set(x,v);}x.fillStyle=v.g;x.fillRect(0,0,W,H);}
// Fit a logical field of width FW (height chosen from the screen aspect within [minH,maxH]) into W x H.
// Leaves `top` px free for the floating buttons in portrait; anchors to the bottom so spare room becomes sky.
function fitField(W,H,FW,{minH=256,maxH=360,top=50,bottom=6,anchor='bottom'}={}){
 const usable=H-top-bottom,FH=clamp(FW*usable/W,minH,maxH),scale=Math.min(W/FW,usable/FH),w=FW*scale,h=FH*scale;
 const ox=(W-w)/2,oy=anchor==='bottom'?H-bottom-h:top+(usable-h)/2;return {FW,FH,scale,ox,oy,w,h,toField:(px,py)=>({x:(px-ox)/scale,y:(py-oy)/scale})};
}
// Simple particle pool for pixel explosions.
function makeBits(){const parts=[];return {
 burst(px,py,{n=14,speed=60,color='#fff',life=.6,size=1.4,g=0}={}){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=speed*(.3+Math.random());parts.push({x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:life*(.6+Math.random()*.6),max:life,color,size:size*(.6+Math.random()*.8),g});}if(parts.length>700)parts.splice(0,parts.length-700);},
 step(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=1-1.5*dt;p.vy*=1-1.5*dt;if(p.life<=0)parts.splice(i,1);}},
 draw(x){for(const p of parts){x.globalAlpha=clamp(p.life/p.max*1.4,0,1);x.fillStyle=p.color;x.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}x.globalAlpha=1;},
 clear(){parts.length=0;},get count(){return parts.length;}
};}

// ---------------------------------------------------------------- vector stroke font (Asteroids / Lunar Lander), 4x6 grid
const VF={0:[[[0,0],[4,0],[4,6],[0,6],[0,0]]],1:[[[2,0],[2,6]]],2:[[[0,0],[4,0],[4,3],[0,3],[0,6],[4,6]]],3:[[[0,0],[4,0],[4,6],[0,6]],[[0,3],[4,3]]],4:[[[0,0],[0,3],[4,3]],[[4,0],[4,6]]],5:[[[4,0],[0,0],[0,3],[4,3],[4,6],[0,6]]],6:[[[0,0],[0,6],[4,6],[4,3],[0,3]]],7:[[[0,0],[4,0],[4,6]]],8:[[[0,0],[4,0],[4,6],[0,6],[0,0]],[[0,3],[4,3]]],9:[[[4,3],[0,3],[0,0],[4,0],[4,6]]],
 A:[[[0,6],[0,2],[2,0],[4,2],[4,6]],[[0,4],[4,4]]],B:[[[0,0],[3,0],[4,1],[4,2],[3,3],[0,3]],[[3,3],[4,4],[4,5],[3,6],[0,6],[0,0]]],C:[[[4,0],[0,0],[0,6],[4,6]]],D:[[[0,0],[3,0],[4,2],[4,4],[3,6],[0,6],[0,0]]],E:[[[4,0],[0,0],[0,6],[4,6]],[[0,3],[3,3]]],F:[[[4,0],[0,0],[0,6]],[[0,3],[3,3]]],G:[[[4,1],[4,0],[0,0],[0,6],[4,6],[4,3],[2,3]]],H:[[[0,0],[0,6]],[[4,0],[4,6]],[[0,3],[4,3]]],I:[[[0,0],[4,0]],[[2,0],[2,6]],[[0,6],[4,6]]],J:[[[4,0],[4,6],[0,6],[0,4]]],K:[[[0,0],[0,6]],[[4,0],[0,3],[4,6]]],L:[[[0,0],[0,6],[4,6]]],M:[[[0,6],[0,0],[2,2],[4,0],[4,6]]],N:[[[0,6],[0,0],[4,6],[4,0]]],O:[[[0,0],[4,0],[4,6],[0,6],[0,0]]],P:[[[0,6],[0,0],[4,0],[4,3],[0,3]]],Q:[[[0,0],[4,0],[4,6],[0,6],[0,0]],[[2,4],[4,6]]],R:[[[0,6],[0,0],[4,0],[4,3],[0,3],[4,6]]],S:[[[4,0],[0,0],[0,3],[4,3],[4,6],[0,6]]],T:[[[0,0],[4,0]],[[2,0],[2,6]]],U:[[[0,0],[0,6],[4,6],[4,0]]],V:[[[0,0],[2,6],[4,0]]],W:[[[0,0],[0,6],[2,4],[4,6],[4,0]]],X:[[[0,0],[4,6]],[[4,0],[0,6]]],Y:[[[0,0],[2,2],[4,0]],[[2,2],[2,6]]],Z:[[[0,0],[4,0],[0,6],[4,6]]],
 '-':[[[1,3],[3,3]]],'+':[[[0,3],[4,3]],[[2,1],[2,5]]],'.':[[[2,5.6],[2,6]]],':':[[[2,1.6],[2,2]],[[2,4.6],[2,5]]],'!':[[[2,0],[2,4]],[[2,5.6],[2,6]]],'×':[[[0,1],[4,5]],[[4,1],[0,5]]],'/':[[[4,0],[0,6]]],"'":[[[2,0],[2,1.5]]],' ':[]};
// size = glyph height; stroke with the current strokeStyle. Returns width.
function vectorText(x,text,px,py,size,{align='left',width=1.4}={}){
 text=String(text).toUpperCase();const k=size/6,adv=6*k,w=text.length*adv-2*k;const left=align==='center'?px-w/2:align==='right'?px-w:px;
 x.lineWidth=width;x.lineCap='round';x.lineJoin='round';x.beginPath();
 [...text].forEach((ch,i)=>{for(const line of (VF[ch]||[])){line.forEach(([gx,gy],j)=>{const X=left+i*adv+gx*k,Y=py+gy*k;j?x.lineTo(X,Y):x.moveTo(X,Y);});}});
 x.stroke();return w;
}
// Glow stroke helper: call fn() twice, first blurred and wide.
function glowStroke(x,color,fn,{blur=10,width=1.6}={}){x.save();x.strokeStyle=color;x.shadowColor=color;x.shadowBlur=blur;x.lineWidth=width;fn(width);x.restore();}

// ---------------------------------------------------------------- turn-based arcade runner
// Each player plays the same seeded world in turn; config: {seconds,intro(i,scores),make(i),step(w,dt),draw(w),done(w),score(w),readyText}
async function turnRunner(s,cfg){
 const scores=[0,0];let w=null,running=false,res=null;
 s.frame(dt=>{if(!w)return;if(running){w.time+=dt;cfg.step(w,dt);if(!w.ending&&(cfg.done(w)||w.time>=cfg.seconds)){w.ending=cfg.endDelay??1.6;w.endReason=w.time>=cfg.seconds&&!cfg.done(w)?'time':'over';}
   if(w.ending){w.ending-=dt;if(w.ending<=0){running=false;res?.();}}}
  cfg.draw(w,dt);const live=scores.slice();live[w.player]=Math.max(0,Math.round(cfg.score(w)));s.setScores(live);});
 for(let i=0;i<2;i++){
  w=cfg.make(i);w.player=i;w.time=0;w.ending=0;w.cap=cfg.seconds;w.scores=scores;
  if(!await s.pass(i,cfg.intro(i,scores),cfg.readyText||'Ready — start my countdown',{countdown:3,summary:i?`${s.players[0].name} scored ${scores[0]}. ${s.players[1].name}, your turn.`:null}))return null;
  running=true;await new Promise(r=>res=r);if(!s.alive)return null;scores[i]=Math.max(0,Math.round(cfg.score(w)));s.setScores(scores);
 }
 return scores;
}

Object.assign(exports,{vectorText,glowStroke,turnRunner,FONT,pixText,textWidth,spriteCanvas,drawSprite,makeStarfield,scanlines,vignette,fitField,makeBits});
