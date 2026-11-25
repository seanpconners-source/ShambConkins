// THE PRICE IS RIGHT STUDIO AUDIENCE (owner, Nov 25: "make the audience a random selection from all of our in-game characters
// instead of actual people on one prerendered image... a bunch of new bodies that look like Price Is Right audience members...
// pepper in a couple of bodies from our other games, not too many... animated, cheering and freaking out like the real show").
// Rows of people on the bleachers, drawn live back to front: each one = a body + the face of a random character from the game.
// Bodies, best first: the audience sheets cr-fan-1..8 (GPT, headless show-audience people), the contestant sheets cr-body-1..4,
// else a drawn stand-in. Now and then (CAMEO_RATE, at most CAMEO_MAX, never the front row) a body from another of our games pops
// up instead: Warriors, Seanic, Living Dead horde, Sean of a Gun, Castlevania, Sundown, Mario... (CAMEOS: one small adapter per game;
// a sheet that isn't in yet just isn't picked). Everyone animates with the house: idle claps and sways, and when `hype` is up
// (a call-down, a win) they jump, fist-pump, wave and point, each on their own beat. The bleachers are the cr-audience picture
// (EMPTY seats; three shapes) with a cr-riser strip in front of every row hiding the legs, else drawn ones.
const SS=require("src/data/showSprites.js");
const ST=require("src/engines/gameshow/stage.js");
const {seededRandom}=require("src/utils.js");
const {faceSprite,headFacts,faceGeom}=require("src/headFacts.js");
const TAU=Math.PI*2;
const CAMEO_RATE=.035,CAMEO_MAX=4;
const SHIRTS=['#e63946','#3a86ff','#ffbe0b','#8338ec','#06d6a0','#fb5607','#ff006e','#4cc9f0','#80b918','#f15bb5'];
const NAMES=['DEB','RAY','TINA','HANK','JOY','CARL','PAM','BOB','KAY','LOU','SUE','DON','BEA','MO','VAL','ED','IDA','GIL','NAN','AL'];
// ---- the drawn stand-ins (until the GPT pictures are in)
// a contestant / fan with feet on (fx,fy), h tall, no head (the face goes on at FACE_AT of h)
const FACE_AT=.865,FACE_W=.14;
function drawnBody(g,col,fx,fy,h,pose,t){const u=h/100,run=pose==='run',ph=t*11;
 g.save();g.translate(fx,fy);g.lineCap='round';g.lineJoin='round';const sw=run?Math.sin(ph)*.6:0;
 g.strokeStyle='#2b3550';g.lineWidth=7*u;g.beginPath();g.moveTo(-4*u,-46*u);g.lineTo(-4*u+sw*14*u,-2*u);g.moveTo(4*u,-46*u);g.lineTo(4*u-sw*14*u,-2*u);g.stroke();
 g.fillStyle='#14120f';g.beginPath();g.ellipse(-4*u+sw*14*u,-2*u,5*u,2.6*u,0,0,TAU);g.ellipse(4*u-sw*14*u,-2*u,5*u,2.6*u,0,0,TAU);g.fill();
 g.fillStyle=col;g.beginPath();g.roundRect(-13*u,-74*u,26*u,32*u,6*u);g.fill();g.fillStyle='rgba(255,255,255,.18)';g.fillRect(-13*u,-74*u,26*u,4*u);
 const up=pose==='jump'||pose==='cheer'||pose==='cheer1'||pose==='cheer2',wave=Math.sin(t*12)*.35;g.strokeStyle=col;g.lineWidth=6*u;g.beginPath();
 if(pose==='wave'){g.moveTo(-11*u,-70*u);g.lineTo(-15*u,-48*u);g.moveTo(11*u,-70*u);g.lineTo(24*u+wave*8*u,-94*u);}
 else if(pose==='point'){g.moveTo(-11*u,-70*u);g.lineTo(-15*u,-48*u);g.moveTo(11*u,-70*u);g.lineTo(34*u,-80*u);}
 else if(up){g.moveTo(-11*u,-70*u);g.lineTo(-22*u+wave*6*u,-96*u);g.moveTo(11*u,-70*u);g.lineTo(22*u-wave*6*u,-96*u);}
 else if(pose==='clap'||pose==='clap1'||pose==='clap2'){const c=Math.abs(Math.sin(t*9))*6*u;g.moveTo(-11*u,-70*u);g.lineTo(-c-2*u,-58*u);g.moveTo(11*u,-70*u);g.lineTo(c+2*u,-58*u);}
 else if(run){g.moveTo(-11*u,-70*u);g.lineTo(-14*u-sw*12*u,-50*u);g.moveTo(11*u,-70*u);g.lineTo(14*u+sw*12*u,-50*u);}
 else if(pose==='sad'){g.moveTo(-11*u,-70*u);g.lineTo(-13*u,-46*u);g.moveTo(11*u,-70*u);g.lineTo(13*u,-46*u);}
 else{g.moveTo(-11*u,-70*u);g.lineTo(-15*u,-48*u);g.moveTo(11*u,-70*u);g.lineTo(15*u,-48*u);}g.stroke();
 g.fillStyle='#f1c7a3';if(up)for(const [hx,hy] of [[-22+wave*6,-96],[22-wave*6,-96]]){g.beginPath();g.arc(hx*u,hy*u,3.4*u,0,TAU);g.fill();}
 g.fillStyle='#e8b896';g.fillRect(-3*u,-80*u,6*u,7*u);g.restore();}
// the drawn bleachers (until cr-audience art): dark studio, rows of seats with step edges
function drawnAudience(a,W,H){const gr=a.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#14061e');gr.addColorStop(1,'#3a1430');a.fillStyle=gr;a.fillRect(0,0,W,H);
 for(let i=0;i<9;i++){const x=W*(i+.5)/9;const sg=a.createRadialGradient(x,0,0,x,0,H*.5);sg.addColorStop(0,'rgba(255,240,200,.16)');sg.addColorStop(1,'rgba(255,240,200,0)');a.fillStyle=sg;a.fillRect(0,0,W,H*.5);}
 for(let r=0;r<16;r++){const y=H*(.12+r*.06);a.fillStyle=r%2?'#2a1440':'#321a4a';a.fillRect(0,y,W,H*.06);a.fillStyle='rgba(255,255,255,.08)';a.fillRect(0,y,W,2);}}
// the step in front of a row (hides the legs): the cr-riser strip tiled, or a drawn bleacher edge
function drawRiser(g,W,y,hh){const pic=SS.picture('cr-riser');if(pic){const k=hh/pic.height,w=pic.width*k;for(let x=0;x<W;x+=w-1)g.drawImage(pic,x,y,w,hh);return;}
 const gr=g.createLinearGradient(0,y,0,y+hh);gr.addColorStop(0,'#5a2a6a');gr.addColorStop(.12,'#3a1848');gr.addColorStop(1,'#1a0a22');g.fillStyle=gr;g.fillRect(0,y,W,hh);
 g.fillStyle='rgba(255,220,150,.35)';g.fillRect(0,y,W,Math.max(1,hh*.05));}
// ---- bodies from our other games (cameos): each returns {img,sx,sy,sw,sh,fx,fy,face:{x,y,w,rot,chin},tall} in source px, or null
// face: either the face's middle (x,y) or, with chin:true, the chin spot (the neck) the face sits on
const CAMEOS={
 warriors:{sheets:()=>{const H=req("src/data/ddHeads.js")?.HEADS||{},DS=req("src/data/ddSprites.js");return Object.keys(H).filter(n=>DS&&DS.SHEETS[n]&&H[n].stand);},
  load:n=>req("src/data/ddSprites.js")?.picture(n),
  frame(n,hype,t,ph){const DS=req("src/data/ddSprites.js"),H=req("src/data/ddHeads.js").HEADS[n],img=DS.picture(n);if(!img)return null;
   const pose=hype>.3&&H.win&&Math.sin(t*3+ph)>-.2?'win':'stand',c=DS.cellOf(n,pose)||DS.cellOf(n,'stand'),hd=H[pose]||H.stand,ft=DS.footOf(pose);
   return {img,sx:c.sx,sy:c.sy,sw:DS.CELL,sh:DS.CELL,fx:ft[0],fy:ft[1],face:{x:hd[0],y:hd[1],w:30*hd[3],rot:hd[2]*Math.PI/180,behind:!!hd[4]},tall:ft[1]-(hd[1]-30*hd[3]*.95)};}},
 seanic:{sheets:()=>['runner-p1','runner-p2','runner-p3','runner-p4'],load:n=>req("src/data/sonic3Sprites.js")?.picture(n),
  frame(n,hype,t,ph){const S3=req("src/data/sonic3Sprites.js"),sh=S3.sheet(n);if(!sh)return null;const row=hype>.3?'win':'stand',f=row==='win'?Math.floor(t*6+ph)%4:0;
   const r=S3.frameRect(n,row,f),sp=S3.spot(n,row,f),d=sh.def;if(!r||!sp||sp.hide)return null;const k=sh.res,fw=d.headSize*.8;
   return {img:sh.img,sx:r[0]*k,sy:r[1]*k,sw:r[2]*k,sh:r[3]*k,fx:d.foot[0]*k,fy:d.foot[1]*k,face:{x:sp.x*k,y:sp.y*k,w:fw*k,rot:sp.rot||0},tall:(d.foot[1]-(sp.y-fw*.9))*k};}},
 horde:{sheets:()=>['survivor-p1','survivor-p2'],load:n=>req("src/data/hordeSprites.js")?.picture(n),
  frame(n,hype,t,ph){const HS=req("src/data/hordeSprites.js"),sh=HS.sheet(n);if(!sh)return null;const row='idle',f=Math.floor(t*(hype>.3?8:3)+ph);
   const r=HS.frameRect(sh,row,f),nk=HS.neckAt(sh.def,row,r?f:0)||[sh.def.foot[0],sh.def.foot[1]*.62],k=sh.k,fw=24;
   return {img:sh.img,sx:r.sx,sy:r.sy,sw:r.sw,sh:r.sh,fx:sh.def.foot[0]*k,fy:sh.def.foot[1]*k,face:{x:nk[0]*k,y:nk[1]*k,w:fw*k,chin:true},tall:(sh.def.foot[1]-nk[1]+fw*1.25)*k};}},
 seanofagun:{sheets:()=>['bro-body'],load:n=>req("src/data/broforceSprites.js")?.picture(n),
  frame(n,hype,t,ph){const BS=req("src/data/broforceSprites.js"),sh=BS.sheet(n);if(!sh)return null;const jump=hype>.3&&Math.sin(t*4+ph)>.5,row=jump?'jump':'idle';
   const r=BS.frameRect(sh,row,Math.floor(t*3+ph)),d=sh.def,k=sh.k,fw=17;
   return {img:sh.img,sx:r.sx,sy:r.sy,sw:r.sw,sh:r.sh,fx:d.feet[0]*k,fy:d.feet[1]*k,face:{x:d.neck[0]*k,y:(d.neck[1]+7)*k,w:fw*k,chin:true},tall:(d.feet[1]-d.neck[1]+fw*1.25)*k};}},
 castlevania:{sheets:()=>['hero-p1','hero-p2'],load:n=>req("src/data/sotnSprites.js")?.picture(n),
  frame(n,hype,t,ph){const SP=req("src/data/sotnSprites.js"),sh=SP.sheet(n);if(!sh)return null;const d=sh.def,fr=SP.frameOf(d,'stand',{t:t+ph,fps:4});
   const cols=Math.max(...Object.values(d.rows)),k=sh.img.width/(cols*d.frame[0]),hd=SP.headOf(d,fr);if(!hd)return null;const hx=d.foot[0]+hd.x/SP.S,hy=d.foot[1]+hd.y/SP.S,size=hd.size/SP.S,fw=size*.48;
   return {img:sh.img,sx:fr.sx*k,sy:fr.sy*k,sw:fr.w*k,sh:fr.h*k,fx:d.foot[0]*k,fy:d.foot[1]*k,face:{x:hx*k,y:(hy+size*.26)*k,w:fw*k,chin:true},tall:(d.foot[1]-hy+fw*.4)*k};}},
 sundown:{sheets:()=>['cowboy-p1','cowboy-p2'],load:n=>req("src/data/sundownSprites.js")?.picture(n),
  frame(n,hype,t,ph){const SD=req("src/data/sundownSprites.js"),sh=SD.sheet(n);if(!sh)return null;const d=sh.def,fr=SD.frameOf(d,'idle',t+ph,{fps:5});
   const cols=Math.max(...Object.values(d.rows)),k=sh.img.width/(cols*d.frame[0]),nk=SD.neckAt(d,'idle',fr.f)||[d.head[0],d.head[1]+d.headSize*.5],fw=d.headSize*.66;
   return {img:sh.img,sx:fr.sx*k,sy:fr.sy*k,sw:fr.w*k,sh:fr.h*k,fx:d.foot[0]*k,fy:d.foot[1]*k,face:{x:nk[0]*k,y:nk[1]*k,w:fw*k,chin:true},tall:(d.foot[1]-nk[1]+fw*1.25)*k};}},
 // Mario's NES body is drawn (no sheet): red shirt, overalls, boots; his cap goes on over the face
 mario:{sheets:()=>['mario','luigi'],load:()=>true,drawn:true}};
const HAS={warriors:n=>req("src/data/ddSprites.js")?.has(n),seanic:n=>!!(req("src/data/userPortraits.js")?.USER_PORTRAITS||{})['s3:'+n],
 horde:n=>req("src/data/hordeSprites.js")?.has(n),seanofagun:n=>req("src/data/broforceSprites.js")?.has(n),castlevania:n=>req("src/data/sotnSprites.js")?.has(n),
 sundown:n=>req("src/data/sundownSprites.js")?.has(n),mario:()=>true};
const cache={};function req(id){if(id in cache)return cache[id];try{cache[id]=require(id);}catch{cache[id]=null;}return cache[id];}
function cameoReady(kind,n){const C=CAMEOS[kind];if(C.drawn)return true;try{return !!C.frame(n,0,0,0);}catch{return false;}}
// the NES Mario / Luigi standing (cheering = arms up, hopping), feet at 0, 32 units cap-to-boots; returns the chin spot
function drawMario(g,luigi,hype,t,ph){const shirt=luigi?'#0a8a1a':'#c8241c',over=luigi?'#f0f0f0':'#3a4ab8',shoe='#6a3a10',skin='#f0b080',R=(c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
 const up=hype>.3&&Math.sin(t*5+ph)>-.3,hop=up?Math.abs(Math.sin(t*7+ph))*3:0;g.translate(0,-hop);
 R(shirt,-5,-20,10,8);R(over,-5,-14,10,8);R(over,-4,-20,2,6);R(over,2,-20,2,6);R('#fcbc3c',-3,-14,1,1);R('#fcbc3c',2,-14,1,1);
 if(up){R(shirt,-7,-27,2,8);R(skin,-7,-29,2,2);R(shirt,5,-27,2,8);R(skin,5,-29,2,2);}else{R(shirt,-7,-19,2,7);R(skin,-7,-12,2,2);R(shirt,5,-19,2,7);R(skin,5,-12,2,2);}
 R(over,-5,-6,4,3);R(over,1,-6,4,3);R(shoe,-6,-3,5,3);R(shoe,1,-3,5,3);return {x:0,y:-20-hop,cap:shirt};}
// ---- the audience
// opts: seed, exclude (character ids not to use), fans (number of different looks)
function createAudience({seed='x',exclude=[]}={}){
 const R=seededRandom(`${seed}:audience`);let pool=null;
 const faces=()=>{if(pool)return pool;try{const UP=require("src/data/userPortraits.js"),A=require("src/assets.js"),ex=new Set(exclude);
  pool=require("src/contentPolicy.js").ACTIVE_CATALOG.characters.filter(c=>c.unlockBy!=='dogs'&&!ex.has(c.id)&&headFacts(c.id,'normal')&&UP.isRasterArt(A.portraitURL(c.id,'normal'))).map(c=>c.id);}catch{pool=[];}return pool;};
 // the people: made once per screen shape (rows depend on the size); each keeps its face, look and beat
 let people=null,key='',cameos=0;
 // rows: people are sized by the screen's short side (a tall phone shows more rows, not giants); the front row's feet are below
 // the screen, the back row high up; ROWS grows on tall screens
 let ROWS=6;
 function rowsFor(W,H){const hs=Math.min(H,W*1.2),tall=H>W*1.15,top=tall?.2:.25,front=.64;
  ROWS=Math.max(6,Math.min(11,Math.round((front-top)*H/(hs*.075))));const out=[];
  // like real bleachers: each row's heads sit above the heads of the row in front (head lines evenly up the screen), so every
  // face shows and the row in front covers the body below the shoulders
  for(let r=0;r<ROWS;r++){const k=r/(ROWS-1),h=hs*(.16+.40*Math.pow(k,1.4)),headY=H*(top+(front-top)*Math.pow(k,1.15)),base=headY+FACE_AT*h,gap=h*.43,n=Math.ceil(W/gap)+1;out.push({r,h,base,gap,n});}return out;}
 function build(W,H){people=[];cameos=0;const fp=faces(),r2=seededRandom(`${seed}:audience:${Math.round(W/40)}x${Math.round(H/40)}`);
  const kinds=Object.keys(CAMEOS),avail=[];for(const k of kinds){let ns=[];try{ns=CAMEOS[k].sheets().filter(n=>HAS[k](n));}catch{}for(const n of ns){try{CAMEOS[k].load(n);}catch{}avail.push([k,n]);}}
  for(const row of rowsFor(W,H)){for(let i=0;i<row.n;i++){const off=(row.r%2)*row.gap*.5-row.gap*.3,x=i*row.gap+off+(r2()-.5)*row.gap*.25,y=row.base+(r2()-.5)*row.h*.035;
   const p={row:row.r,x,y,h:row.h*(.92+r2()*.16),face:fp.length?fp[Math.floor(r2()*fp.length)]:null,col:SHIRTS[Math.floor(r2()*SHIRTS.length)],
    ph:r2()*TAU,beat:.8+r2()*.5,style:Math.floor(r2()*5),fan:Math.floor(r2()*8),dir:r2()<.5?-1:1,name:NAMES[Math.floor(r2()*NAMES.length)]};
   if((row.r===ROWS-2||row.r===ROWS-3)&&cameos<CAMEO_MAX&&avail.length&&r2()<CAMEO_RATE*2.2){const c=avail[Math.floor(r2()*avail.length)];p.cameo=c;cameos++;}
   people.push(p);}}
  // the called contestant's seat: the middle of row 3
  const mid=people.filter(p=>p.row===Math.round(ROWS*.55));mid.sort((a,b)=>Math.abs(a.x-W/2)-Math.abs(b.x-W/2));if(mid[0]){mid[0].called=true;delete mid[0].cameo;}}
 // which audience body sheet a fan uses: cr-fan-N, else a contestant sheet, else drawn
 function fanSheet(p){const f=SS.picture('cr-fan-'+(p.fan+1))||SS.picture('cr-fan-'+(1+p.fan%4));if(f)return {img:f,def:SS.CR_FAN};const b=SS.picture('cr-body-'+(1+p.fan%4));return b?{img:b,def:SS.CR_BODY}:null;}
 // the pose for this moment: idle = claps now and then, sways; hyped = their own cheer (jump / fist pump / wave / point / clap)
 function poseOf(p,hype,t){const b=t*p.beat+p.ph;if(hype<.3)return Math.sin(b*.7)>.6?(Math.sin(b*9)>0?'clap1':'clap2'):'stand';
  const s=(p.style+Math.floor(b*.5))%5;return s===0?'jump':s===1?(Math.sin(b*8)>0?'cheer1':'cheer2'):s===2?'wave':s===3?'point':(Math.sin(b*9)>0?'clap1':'clap2');}
 // a picture whose whole head (big hair, hats, a cartoon skull) is much wider than its face is shrunk so no head dwarfs the row
 const headK=new Map();function shrinkK(id){if(headK.has(id))return headK.get(id);let k=1;try{const geo=faceGeom(id,'normal',100,0,0,false);if(geo){const r=Math.max(geo.head.w,geo.head.h*.8)/100;if(r>1.9)k=1.9/r;}}catch{}headK.set(id,k);return k;}
 function drawFace(g,id,cx,cy,fw,dir,rot,mood){if(!id)return;fw*=shrinkK(id);const m=headFacts(id,mood)?mood:'normal',sp=faceSprite(id,m,Math.max(4,Math.round(fw)),dir);if(!sp)return;
  if(rot){g.save();g.translate(cx,cy);g.rotate(rot);g.drawImage(sp.cv,sp.x,sp.y);g.restore();}else g.drawImage(sp.cv,cx+sp.x,cy+sp.y);}
 function drawPerson(g,p,hype,t){const pose=poseOf(p,hype,t),jump=pose==='jump'?Math.abs(Math.sin((t*p.beat+p.ph)*6))*p.h*.07:0,x=p.x,y=p.y-jump,h=p.h,mood=hype>.3?'win':'normal';
  // a cameo body from one of our games
  if(p.cameo){const [kind,n]=p.cameo,C=CAMEOS[kind];
   if(C.drawn){const k=h/32;g.save();g.translate(x,y);g.scale(k*p.dir,k);const chin=drawMario(g,n==='luigi',hype,t,p.ph);g.restore();
    const fw=Math.min(10.8*k,FACE_W*h*1.15),fh=fw*1.25,cx=x,cy=y+chin.y*k-fh*.44;drawFace(g,p.face,cx,cy,fw,p.dir,0,mood);
    g.fillStyle=chin.cap;g.beginPath();g.ellipse(cx,cy-fh*.48,fw*.62,fh*.24,0,Math.PI,0);g.fill();g.fillRect(cx+(p.dir>0?0:-fw*.8),cy-fh*.5,fw*.8,fh*.1);return;}
   let fr=null;try{fr=C.frame(n,hype,t,p.ph);}catch{}
   if(fr){const k=h/fr.tall,face=fr.face,dx=(face.x-fr.fx)*k*p.dir,fw=Math.min(face.w*k,FACE_W*h*1.15),fh=fw*1.25,cx=x+dx,cy=y+(face.y-fr.fy)*k-(face.chin?fh*.44:0);
    if(face.behind)drawFace(g,p.face,cx,cy,fw,p.dir,(face.rot||0)*p.dir,mood);
    g.save();g.translate(x,y);g.scale(p.dir,1);g.drawImage(fr.img,fr.sx,fr.sy,fr.sw,fr.sh,-fr.fx*k,-fr.fy*k,fr.sw*k,fr.sh*k);g.restore();
    if(!face.behind)drawFace(g,p.face,cx,cy,fw,p.dir,(face.rot||0)*p.dir,mood);return;}}
  // a show-audience fan
  const sh=fanSheet(p);let fx=x,fy=y-FACE_AT*h;
  if(sh){const D=sh.def,fi=Math.max(0,D.frames.indexOf(pose)>=0?D.frames.indexOf(pose):D.frames.indexOf(pose.replace(/[12]$/,''))),fw=sh.img.width/D.frames.length,k=h/D.unit;
   g.save();g.translate(x,y);g.scale(p.dir,1);g.drawImage(sh.img,Math.max(0,fi)*fw,0,fw,sh.img.height,-D.feet[0]*k,-D.feet[1]*k,fw*k,sh.img.height*k);g.restore();
   fx=x+(D.spot[0]-D.feet[0])*k*p.dir;fy=y+(D.spot[1]-D.feet[1])*k;}
  else drawnBody(g,p.col,x,y,h,pose,t*p.beat+p.ph);
  drawFace(g,p.face,fx,fy,FACE_W*h,p.dir,0,mood);
  // every Price Is Right audience member wears a price-tag name tag (front rows, where you can read it)
  if(p.row>=ROWS-2&&h>60)ST.nameTag(g,x-p.dir*h*.03,y-h*.62,h*.15,p.name);}
 // draw the house: bleachers, then each row back to front with the step in front of it; skip = leave the called seat empty
 function draw(g,W,H,t,{hype=0,skipCalled=false}={}){const k=W+'x'+H;if(k!==key||!people){key=k;build(W,H);}
  const pic=require("src/bgShape.js").pick(W,H,{tall:'cr-audience-tall',wide:'cr-audience',fold:'cr-audience-fold'},SS.picture);if(pic)ST.cover(g,pic,W,H);else drawnAudience(g,W,H);
  const rows=rowsFor(W,H);for(const row of rows){for(const p of people)if(p.row===row.r&&!(skipCalled&&p.called))drawPerson(g,p,hype,t);
   drawRiser(g,W,row.base-row.h*.36,row.h*.42+H*.02);
   // the house further back is a little darker
   if(row.r<ROWS-1){g.fillStyle='rgba(12,4,24,.10)';g.fillRect(0,0,W,row.base-row.h*.36);}}}
 // where the called contestant sits (feet x, y, height): the call-down stands them up from there
 function calledSeat(W,H){const k=W+'x'+H;if(k!==key||!people){key=k;build(W,H);}const p=people.find(q=>q.called);return p?{x:p.x,y:p.y,h:p.h}:{x:W/2,y:H*.7,h:H*.3};}
 // wait (max ms) for the sheets and the faces this crowd uses (a crowd drawn before its faces load shows drawn heads)
 async function ready(W,H,ms=3000){if(!people)build(W,H);for(const p of people)if(p.face)faceSprite(p.face,'normal',8,1);
  await SS.ready(['cr-audience','cr-audience-tall','cr-audience-fold','cr-riser',...[1,2,3,4,5,6,7,8].map(i=>'cr-fan-'+i),...[1,2,3,4].map(i=>'cr-body-'+i)],ms);
  const end=Date.now()+ms,cam=people.filter(p=>p.cameo);
  while(Date.now()<end&&(((require("src/headFacts.js").facesLoading?.()||0)>0)||cam.some(p=>!cameoReady(...p.cameo))))await new Promise(r=>setTimeout(r,60));}
 return {probe:(k,n)=>{try{CAMEOS[k].load(n);const f=CAMEOS[k].frame?CAMEOS[k].frame(n,1,1,0):"drawn";return f&&f.img?{sw:f.sw,sh:f.sh,fx:f.fx,fy:f.fy,face:f.face,tall:f.tall}:f;}catch(e){return "err "+e.message;}},draw,calledSeat,ready,get people(){return people;},get cameos(){return (people||[]).filter(p=>p.cameo).map(p=>p.cameo.join(':'));}};}
Object.assign(exports,{createAudience,drawnBody,drawnAudience,drawRiser,CAMEOS,cameoReady,FACE_AT,FACE_W});
