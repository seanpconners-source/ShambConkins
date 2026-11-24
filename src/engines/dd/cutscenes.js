// THE WARRIORS: story CUTSCENES between the chapters (owner, Nov 24: "cutscenes between the stages so we can see the story
// play out... the Can you dig it guy and all the gangs at the meeting... all of it!"). Our own staging and words after the
// film (only the two famous short lines are the film's), drawn with the fighters' bodies (src/engines/dd/body.js): the
// Conclave in the park with every gang, Cyrus's speech, the shot, the cops and the blame; the radio DJ between chapters;
// each gang showing up; Luther on the beach; the Riffs at dawn. A shot can use a painted backdrop dropped in as
// ww:cut-<bg> (src/data/ddSprites.js PICTURES); without one the backdrop is drawn here.
//
// makeCuts(env) -> {start(key,done), draw(), tap(x,y), active}; env = {x (2d ctx), s (session), W(), H(), person(sx,sy,kk,p),
// portrait(who,cx,cy,size) , sfx, noise, snd, DS, BD, names, solo}. person p = {o outfit, pose, face ±1, head, char, pi, mood, big}.
const TAU=Math.PI*2;
const SHAPE=require("src/bgShape.js"),DJD=require("src/data/warriorsDJ.js");
const MOUTH_HZ=7;
const DJ_PICS={wide:'dj-wide',tall:'dj-tall',fold:'dj-fold'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=q=>q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2;
// who speaks: name, colour, and how their face is drawn
const CAST={
 cyrus:{name:'CYRUS',col:'#e8c84c',head:'cyrus',o:'cyrus',skin:'#7c5034'},
 cleon:{name:'CLEON',col:'#e8a04c',char:'cleon',o:'warrior'},
 swan:{name:'SWAN',col:'#e8a04c',char:'swan',o:'warrior'},
 ajax:{name:'AJAX',col:'#e8a04c',char:'ajax',o:'warrior'},
 cochise:{name:'COCHISE',col:'#e8a04c',char:'cochise',o:'warrior'},
 fox:{name:'FOX',col:'#e8a04c',o:'warrior',head:'thug'},
 luther:{name:'LUTHER',col:'#c84cff',char:'luther',o:'rogue',head:'rogue'},
 masai:{name:'MASAI',col:'#e8dcc8',head:'riff',o:'riff',skin:'#6c4428'},
 dj:{name:'THE DJ',col:'#ff6a8c',dj:1},
 orphan:{name:'ORPHANS LEADER',col:'#a8a090',head:'scruffy',o:'orphan'},
 fury:{name:'BASEBALL FURY',col:'#b88cff',char:'baseball-fury',head:'fury',o:'fury'},
 lizzie:{name:'LIZZIE',col:'#ff6a9c',head:'lizzie',o:'lizzie'},
 sarge:{name:'THE SERGEANT',col:'#8cb4ff',head:'sarge',o:'sarge'},
 punk:{name:'THE PUNKS',col:'#ff8c6a',head:'punk',o:'punk'},
 hero:{name:null,col:'#ffd23c',pi:0,o:'p1'},hero2:{name:null,col:'#ffd23c',pi:1,o:'p2'}};
// the gangs at the Conclave, left to right; the stage sits in the middle
const GANGS=[["TURNBULL AC'S",'turnbull','bald'],['THE ORPHANS','orphan','scruffy'],['BASEBALL FURIES','fury','fury'],['THE LIZZIES','lizzie','lizzie'],['THE HI-HATS','hihat','hihat'],
 ['THE RIFFS','riff','riff'],['THE WARRIORS','warrior','thug'],['THE BOPPERS','bopper','thug'],['THE PUNKS','punk','punk'],['THE ROGUES','rogue','rogue']];
const WW=1500,STAGE_X=750;   // the Conclave's width in scene units, the stage in the middle

// ---- the cutscenes: key -> list of shots. shot = {bg, dur, cam:[x0,z0,x1,z1] (scene x at the screen centre, zoom),
// cast:[[who|gang outfit, x, row 0 back..3 front | 'stage', pose, face]], crowd, cheer, caption, lines:[[at s, who, text]], at:[[s, sfx]], flash}
const CUTS={
 0:[{bg:'conclave',dur:6,cam:[180,.9,1320,.9],crowd:1,caption:['THE BRONX · MIDNIGHT','Every gang in the city sent nine men. No weapons. One night of truce.'],tags:1},
  {bg:'conclave',dur:5.5,cam:[1000,1.45,1000,1.6],crowd:1,warriors:1,lines:[[.3,'cleon','Nine of us, nine of them, a hundred gangs. Nobody starts nothing.'],[2.8,'hero','So who called the whole city here?']]},
  {bg:'conclave',dur:12,cam:[STAGE_X,.95,STAGE_X,1.35],crowd:1,cyrus:1,lines:[[.2,'cyrus','Look at you. All of you, in one place. Nobody\'s ever seen this.'],[3.4,'cyrus','Count it up. The cops are twenty thousand. We\'re sixty thousand!'],[7,'cyrus','One gang could run this city. Every street. Every block.']]},
  {bg:'conclave',dur:7,cam:[STAGE_X,1.3,STAGE_X,.95],crowd:1,cyrus:1,cheer:[[1.2,2.6],[3.4,4.8],[5.4,7]],lines:[[.2,'cyrus','CAN YOU DIG IT?'],[2.6,'cyrus','CAN YOU DIG IT?!'],[4.6,'cyrus','CAN YOU DIG IT?!!']],at:[[1.2,'roar'],[3.4,'roar'],[5.4,'roar']]},
  {bg:'conclave',dur:3.6,cam:[1160,1.55,1170,1.8],spot:1180,crowd:1,luther:1,lines:[[.2,'luther','...']],at:[[2.2,'gun']],flash:2.2},
  {bg:'conclave',dur:5,cam:[STAGE_X,1.35,STAGE_X,1.05],crowd:1,cyrus:'down',panic:1,at:[[.1,'siren'],[1.5,'siren']],lines:[[.4,'swan','Cyrus is down! Somebody shot him!']]},
  {bg:'conclave',dur:6.5,cam:[1100,1.4,1050,1.5],crowd:1,panic:1,luther:'point',warriors:'run',lines:[[.2,'luther','THERE! The Warriors did it! The Warriors shot Cyrus!'],[3.2,'swan','Cleon\'s gone. Split up, stay low, get out of the park!']],at:[[.1,'siren']]}],
 1:[{bg:'radio',dur:6,lines:[[.3,'dj','Boys and girls, a special request from the Riffs...'],[3,'dj','...the Warriors. Every gang in the city is looking for them tonight.']]},
  {bg:'riffs',dur:5.5,cam:[750,1.2,750,1.5],riffs:1,lines:[[.3,'masai','I want them. All of them. Alive if you can.'],[3,'masai','Put the word out. Every street between here and Coney.']]},
  {bg:'street',dur:6,cam:[600,1.6,700,1.6],warriors:1,lines:[[.3,'swan','Cleon\'s gone, so I\'m calling it. We go home. Coney.'],[3,'hero','Long way to Coney.'],[4.5,'ajax','Then let \'em come.']]},
  {bg:'street',dur:4,cam:[900,1.4,1000,1.4],gang:['turnbull','bald',4],lines:[[.3,'hero','...is that a bus full of skinheads?']],at:[[.2,'horn']]}],
 2:[{bg:'street',dur:6,cam:[700,1.5,700,1.7],warriors:1,gang:['orphan','scruffy',6],lines:[[.3,'orphan','You\'re on Orphans turf. Take those vests off and walk.'],[3.2,'swan','Not a chance. We\'re just passing through.']]}],
 3:[{bg:'radio',dur:5,lines:[[.3,'dj','Still out there, Warriors? The night\'s not over. This one\'s for you.']]},
  {bg:'subway',dur:5,cam:[700,1.4,800,1.4],warriors:1,lines:[[.3,'cochise','Finally, a train.'],[2.4,'swan','Keep your eyes open. We weren\'t the only ones waiting for it.']]}],
 4:[{bg:'subway',dur:5.5,cam:[700,1.4,800,1.5],warriors:1,gang:['cop','cop',4,'stick'],lines:[[.3,'fox','Cops! The whole platform is full of them.'],[2.6,'swan','Don\'t fight. RUN. Meet up at the park.']],at:[[.2,'siren']]},
  {bg:'park',dur:7,cam:[700,1.3,820,1.7],warriors:1,gang:['fury','fury',5,'bat'],lines:[[.5,'ajax','Who are these clowns?'],[3,'swan','Baseball Furies. They don\'t talk.'],[5,'fury','...']],at:[[1,'tap'],[1.6,'tap'],[2.2,'tap'],[2.8,'tap']]}],
 5:[{bg:'lizzies',dur:6,cam:[700,1.5,700,1.7],warriors:1,gang:['lizzie','lizzie',5],lines:[[.3,'lizzie','Come on in, Warriors. The party\'s inside.'],[3.2,'cochise','I don\'t like this. Nobody\'s this friendly tonight.']]}],
 6:[{bg:'radio',dur:5,lines:[[.3,'dj','Word on the wire: the Warriors are headed for Union Square.']]},
  {bg:'subway',dur:5,cam:[700,1.4,700,1.6],gang:['cop','cop',6,'stick'],lines:[[.3,'sarge','They\'re coming through here. Nobody gets on that train.']],at:[[.2,'siren']]}],
 7:[{bg:'restroom',dur:5.5,cam:[700,1.6,700,1.8],warriors:1,gang:['punk','punk',5],lines:[[.3,'punk','Well, look who rolled in.'],[2.8,'hero','...roller skates. Seriously.']]}],
 8:[{bg:'dawn',dur:6.5,cam:[700,1.3,760,1.5],warriors:1,lines:[[.4,'hero','The sun\'s coming up.'],[2.6,'swan','All night for this. Coney. Home.'],[4.6,'ajax','Never looked so good.']]}],
 9:[{bg:'coney',dur:7,cam:[600,1.2,900,1.6],warriors:1,luther:'bottles',lines:[[.4,'luther','Warriors... come out to play-ay!'],[3.6,'swan','Let\'s finish this.']],at:[[.6,'clink'],[1.6,'clink'],[2.6,'clink']]}],
 end:[{bg:'coney',dur:7,cam:[750,1.2,750,1.5],warriors:1,riffs:1,luther:'down',lines:[[.3,'masai','The Riffs know the truth now. Luther fired that shot.'],[3.4,'masai','You\'re good, Warriors. Go home.']],at:[[.1,'riffs']]},
  {bg:'radio',dur:5,lines:[[.3,'dj','Good morning, Warriors. You made it home.']]}]};

function makeCuts(env){const {x,s,BD,DS}=env;let cur=null;
 const W=()=>env.W(),H=()=>env.H();
 // screen geometry for a camera zoom z: u = scene unit (sized by the height on wide screens, by the width on tall phones so
 // nobody is cut off), sq = sideways squeeze on narrow screens (people keep their size, the spacing between them shrinks so a
 // shot shows the same people as on a wide screen), gy = the ground line (80% down on wide screens, the scene band centred on tall ones)
 function geom(z){const w=W(),h=H(),u=Math.min(h/400,w/470),sq=Math.min(1,w/(u*860));return {w,h,u,sq,S:u*z,gy:h/2+120*u+(z-1)*70*u};}
 function start(key,done){const shots=CUTS[key];if(!shots){done();return;}cur={shots,si:0,t:0,li:0,done,crowd:null,last:performance.now(),fired:new Set(),typed:0};}
 function finish(){const d=cur?.done;cur=null;d?.();}
 function nextShot(){if(!cur)return;cur.si++;cur.t=0;cur.fired=new Set();if(cur.si>=cur.shots.length)finish();}
 // ---- the crowd (cached: one picture standing, one cheering; redrawn when the screen size changes)
 // drawn once per screen height at a fixed scale CS and stretched to the camera's zoom (a cache per zoom step would
 // repaint ~150 bodies every frame of a zoom)
 const CROWD_ROWS=[[-150,.4],[-112,.48],[-66,.56],[-18,.66]],CROWD_H=280,CROWD_GROUND=262;
 function crowdCanvas(CS,cheer,panic,sq){const key=`${H()}:${W()}:${cheer}:${panic}`;cur.crowdCache=cur.crowdCache||{};if(cur.crowdCache[key])return cur.crowdCache[key];
  const cv=document.createElement('canvas');cv.width=Math.ceil(WW*CS*sq);cv.height=Math.ceil(CROWD_H*CS);const g=cv.getContext('2d');let n=0;
  for(let r=0;r<CROWD_ROWS.length;r++){const [yy,k0]=CROWD_ROWS[r],step=44*k0;
   for(let xx=20+(r%2)*step/2/sq;xx<WW-20;xx+=step/sq){if(Math.abs(xx-STAGE_X)<150*Math.max(sq,.7)/sq)continue;n++;const gi=Math.min(GANGS.length-1,Math.floor(xx/WW*GANGS.length)),G=GANGS[gi],
     face=panic?((n*7)%3?-1:1):xx<STAGE_X?1:-1,pose=panic?(n%2?'run1':'run2'):cheer?'win':'stand';
    env.person(xx*CS*sq,(CROWD_GROUND+yy)*CS,k0*CS*1.45,{o:G[1],pose,face,head:G[2],id:'c'+n+gi,mood:cheer?'win':panic?'sad':'normal'},g);}}
  return cur.crowdCache[key]=cv;}
 // ---- backdrops
 function picBg(name){const im=DS.picture('cut-'+name);if(!im)return false;const w=W(),h=H(),k=Math.max(w/im.width,h/im.height);x.drawImage(im,(w-im.width*k)/2,(h-im.height*k)/2,im.width*k,im.height*k);return true;}
 function sky(top,bot){const g=x.createLinearGradient(0,0,0,H());g.addColorStop(0,top);g.addColorStop(1,bot);x.fillStyle=g;x.fillRect(0,0,W(),H());}
 function skyline(y,col,seed){x.fillStyle=col;let xx=-20,i=seed;while(xx<W()+20){const w=30+((i*37)%50),h=40+((i*53)%120);x.fillRect(xx,y-h,w,h+2);i++;xx+=w+4;}}
 function windows(y,seed){let xx=-20,i=seed;while(xx<W()){const w=30+((i*37)%50),h=40+((i*53)%120);for(let a=6;a<w-6;a+=9)for(let b=8;b<h-6;b+=12)if(((a*7+b*13+i)%9)===0){x.fillStyle='rgba(255,220,140,.55)';x.fillRect(xx+a,y-h+b,3,4);}i++;xx+=w+4;}}
 // no painted cut-<bg> yet: build the scene from the stage pictures we have (far sky + back wall + floor, the floor line
 // under the people's feet, a little parallax with the camera); the first area/biome with art in each list wins
 function stageBg(bg,camX,z){const names=CUT_STAGE[bg];if(!names)return false;const pick=layer=>{for(const n of names){const im=DS.picture(layer+'-'+n);if(im)return im;}return null;};
  const far=pick('far'),wall=pick('wall'),floor=pick('floor');if(!wall||!floor)return false;
  const {w,h,u,sq,gy}=geom(z),ft=Math.min(h*.9,gy-46*u*z),wh=Math.max(h*.2,Math.min(h*.42,150*u*z));
  const tile=(im,top,ht,par)=>{const k=ht/im.height,tw=im.width*k;let x0=-(((camX*u*z*sq*par)%tw)+tw)%tw;for(;x0<w;x0+=tw)x.drawImage(im,x0,top,tw+1,ht);};
  if(far){const fh=Math.max(ft-wh*.55,h*.3)*1.08;tile(far,ft-wh*.55-fh+2,fh,.25);}else{sky('#05060e','#1a1430');}
  tile(wall,ft-wh,wh,.6);tile(floor,ft,Math.max(h-ft,40*u),1);
  x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,0,w,h);return true;}
 function drawBg(sh,camX,z){const {w,h,u,sq}=geom(z);
  if(picBg(sh.bg)||stageBg(sh.bg,camX,z))return;
  if(sh.bg==='conclave'||sh.bg==='riffs'){sky('#05060e','#1a1430');skyline(h*.5,'#0c0c18',3);windows(h*.5,3);
   // trees left and right, the park lawn
   x.fillStyle='#0a140c';for(let i=0;i<9;i++){const tx=((i*173-camX*.3)%(w+200)+w+200)%(w+200)-100;x.beginPath();x.ellipse(tx,h*.46,60*u,70*u,0,0,TAU);x.fill();}
   x.fillStyle='#121c14';x.fillRect(0,h*.5,w,h*.5);
   // flood lights glow over the stage
   const sx=w/2+(STAGE_X-camX)*u*z*sq;for(const d of [-1,1]){const lx=sx+d*150*u*z*sq;x.fillStyle='#2a2a30';x.fillRect(lx-2*u*z,h*.12,4*u*z,h*.4);
    const gl=x.createRadialGradient(lx,h*.13,2,lx,h*.13,120*u*z);gl.addColorStop(0,'rgba(255,248,220,.95)');gl.addColorStop(1,'rgba(255,248,220,0)');x.fillStyle=gl;x.beginPath();x.arc(lx,h*.13,120*u*z,0,TAU);x.fill();
    x.fillStyle='rgba(255,248,220,.08)';x.beginPath();x.moveTo(lx,h*.13);x.lineTo(sx-60*u*z,h*.6);x.lineTo(sx+60*u*z,h*.6);x.closePath();x.fill();}
   return;}
  if(sh.bg==='street'||sh.bg==='lizzies'){sky('#070812','#1c1626');skyline(h*.62,'#141420',7);windows(h*.62,7);x.fillStyle='#2a1e1a';x.fillRect(0,h*.42,w,h*.24);
   for(let i=0;i<12;i++){x.fillStyle=`rgba(${120+i*9%60},${40+i*13%40},${30},.35)`;x.fillRect(((i*97-camX*.6)%(w+120)+w+120)%(w+120)-60,h*.45,40,h*.18);}
   x.fillStyle='#1a1a1e';x.fillRect(0,h*.66,w,h*.34);x.fillStyle='rgba(255,255,255,.06)';x.fillRect(0,h*.66,w,3);
   if(sh.bg==='lizzies'){for(let i=0;i<5;i++){x.fillStyle=['rgba(255,60,140,.25)','rgba(80,140,255,.25)','rgba(255,200,60,.25)'][i%3];x.beginPath();x.arc(w*(.15+i*.18),h*.3,60*u,0,TAU);x.fill();}}
   const lamp=w*.8;x.fillStyle='#202024';x.fillRect(lamp,h*.25,4*u,h*.45);const gl=x.createRadialGradient(lamp,h*.25,1,lamp,h*.25,90*u);gl.addColorStop(0,'rgba(255,210,140,.7)');gl.addColorStop(1,'rgba(255,210,140,0)');x.fillStyle=gl;x.fillRect(lamp-90*u,h*.25-90*u,180*u,180*u);return;}
  if(sh.bg==='park'){sky('#04060c','#10141e');x.fillStyle='#0a120c';for(let i=0;i<8;i++){x.beginPath();x.ellipse(i*w/7,h*.42,70*u,80*u,0,0,TAU);x.fill();}x.fillStyle='#16201a';x.fillRect(0,h*.52,w,h*.48);
   const lamp=w*.55;x.fillStyle='#202024';x.fillRect(lamp,h*.2,4*u,h*.5);const gl=x.createRadialGradient(lamp,h*.6,1,lamp,h*.6,180*u);gl.addColorStop(0,'rgba(255,230,180,.45)');gl.addColorStop(1,'rgba(255,230,180,0)');x.fillStyle=gl;x.fillRect(0,0,w,h);return;}
  if(sh.bg==='subway'||sh.bg==='restroom'){sky(sh.bg==='restroom'?'#20262a':'#14161c','#08090c');x.fillStyle=sh.bg==='restroom'?'#d8dcd4':'#c8c0a8';x.fillRect(0,h*.2,w,h*.42);
   x.strokeStyle='rgba(0,0,0,.18)';x.lineWidth=1;for(let yy=h*.2;yy<h*.62;yy+=14*u){x.beginPath();x.moveTo(0,yy);x.lineTo(w,yy);x.stroke();}
   if(sh.bg==='subway'){x.fillStyle='#1c3c6c';x.fillRect(0,h*.3,w,h*.05);x.fillStyle='#fff';x.font=`900 ${16*u}px sans-serif`;x.textAlign='center';x.fillText('UNION SQ',w*.3,h*.338);x.fillText('UNION SQ',w*.8,h*.338);}
   else{for(let i=0;i<5;i++){x.fillStyle='#9ca4a4';x.fillRect(w*(.1+i*.2),h*.36,40*u,60*u);}}
   x.fillStyle='#3a3a3e';x.fillRect(0,h*.62,w,h*.38);x.fillStyle='#e8d43c';x.fillRect(0,h*.62,w,4*u);return;}
  if(sh.bg==='dawn'||sh.bg==='coney'){sky('#ff9a5c','#ffd9a0');const sun=x.createRadialGradient(w*.7,h*.48,4,w*.7,h*.48,120*u);sun.addColorStop(0,'rgba(255,255,220,1)');sun.addColorStop(1,'rgba(255,200,120,0)');x.fillStyle=sun;x.fillRect(0,0,w,h);
   if(sh.bg==='coney'){// the big wheel and the ocean
    const cx=w*.24,cy=h*.32,r=90*u;x.strokeStyle='rgba(60,30,40,.7)';x.lineWidth=3*u;x.beginPath();x.arc(cx,cy,r,0,TAU);x.stroke();for(let i=0;i<16;i++){const a=i/16*TAU;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);x.stroke();}
    x.beginPath();x.moveTo(cx-r*.7,h*.62);x.lineTo(cx,cy);x.lineTo(cx+r*.7,h*.62);x.stroke();x.fillStyle='#4a7ca8';x.fillRect(0,h*.55,w,h*.1);x.fillStyle='#e8d0a0';x.fillRect(0,h*.65,w,h*.35);}
   else{x.fillStyle='rgba(40,30,40,.85)';x.fillRect(0,h*.15,w,h*.06);x.fillRect(0,h*.62,w,h*.38);for(let i=0;i<6;i++){x.fillStyle='rgba(255,230,190,.35)';x.fillRect(i*w/6+10,h*.24,w/6-20,h*.32);}}
   return;}
  if(sh.bg==='radio'){x.fillStyle='#08060a';x.fillRect(0,0,w,h);}}
 // the mouth for this moment of the DJ's line (null = closed): MOUTH_HZ mouth changes a second (owner: 12 talked too fast), each from the letter being typed then
 function djMouth(){const sh=cur.shots[cur.si];let ln=null;for(const L of sh.lines||[])if(cur.t>=L[0])ln=L;if(!ln||ln[1]!=='dj')return null;
  const age=cur.t-ln[0],text=ln[2];if(age*38>=text.length+1)return null;const ci=Math.min(text.length-1,Math.floor(Math.floor(age*MOUTH_HZ)*38/MOUTH_HZ));return DJD.viseme(text[ci]);}
 // the painted DJ (ww:dj-<shape> + mouth/blink frames): placed so the face sits 40% down, a slow push-in over the shot
 function djPic(){const w=W(),h=H();for(const n of SHAPE.order(w,h,DJ_PICS)){const im=DS.picture(n);if(im)return {im,n,shape:n.slice(3)};}return null;}
 function djPlace(P,t){const w=W(),h=H(),G=DJD.DJ.guide[P.shape],[iw,ih]=G.size,k=Math.max(w/iw,h/ih)*(1.02+Math.min(t,12)*.003),[fx,fy]=G.face;
  return {k,ox:clamp(w*.5-fx*k,w-iw*k,0),oy:clamp(h*.4-fy*k,h-ih*k,0)};}
 // the DJ in shadow (owner: like the film, her face lost in the dark, only the lit mouth clear): a diagonal shadow over the face
 // and the left of the room (the window), a small pool of light on the lips; worked out once per shape at 1/4 size and
 // drawn with the picture's own transform
 const shadeCache={};
 function djShade(shape){if(shadeCache[shape])return shadeCache[shape];const G=DJD.DJ.guide[shape],S=DJD.DJ.shade||{face:.82,room:.35,deg:12,left:1},R=4;
  const [iw,ih]=G.size,w=Math.ceil(iw/R),h=Math.ceil(ih/R),cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d'),im=g.createImageData(w,h),d=im.data;
  const [bx,by,bw,bh]=G.mouth,mx=(bx+bw/2)/R,my=(by+bh/2)/R,mr=bw*.81/R,tn=Math.tan(S.deg*Math.PI/180);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const edge=my-mr*.55-(x-mx)*tn,above=clamp((edge-y)/(mr*1.1)+.5,0,1),left=clamp((mx-mr*3.2-x)/(mr*2.2),0,1)*S.left;
   const dark=S.room+(S.face-S.room)*Math.max(above,left),pool=Math.pow(clamp(1-Math.hypot((x-mx)/(mr*1.5),(y-my)/(mr*.85)),0,1),1.2);d[(y*w+x)*4+3]=Math.round(255*dark*(1-pool));}
  g.putImageData(im,0,0);return shadeCache[shape]=cv;}
 function drawDJPic(t){const P=djPic();if(!P)return false;const {k,ox,oy}=djPlace(P,t),G=DJD.DJ.guide[P.shape],box=DJD.DJ.box[P.shape]||{};
  x.drawImage(P.im,ox,oy,G.size[0]*k,G.size[1]*k);
  const frame=(n)=>{const b=box[n],im=b&&DS.picture(P.n+'-'+n);if(im)x.drawImage(im,ox+b[0]*k,oy+b[1]*k,b[2]*k,b[3]*k);};
  const m=djMouth();if(m)frame(m);if(t%3.7<.13)frame('blink');
  x.drawImage(djShade(P.shape),ox,oy,G.size[0]*k,G.size[1]*k);
  // the whole picture (studio, DJ and her shadow together) fades up from black as the shot opens (owner: the shadow used to arrive late)
  if(t<.8){x.fillStyle=`rgba(0,0,0,${1-t/.8})`;x.fillRect(0,0,W(),H());}
  return true;}
 // the radio DJ: lips at the microphone, in the dark (our own drawing; the painted DJ replaces it when it's in)
 function drawDJ(t){const w=W(),h=H(),u=Math.min(w/470,h/400),cx=w/2,cy=h*.46,talk={small:.4,ee:.5,oo:.7,ah:1}[djMouth()]||.08;
  const gl=x.createRadialGradient(cx,cy,10,cx,cy,260*u);gl.addColorStop(0,'rgba(120,20,40,.5)');gl.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gl;x.fillRect(0,0,w,h);
  x.fillStyle='#c8506c';x.beginPath();x.ellipse(cx,cy,150*u,60*u,0,0,TAU);x.fill();
  x.fillStyle='#e01848';x.beginPath();x.moveTo(cx-120*u,cy);x.quadraticCurveTo(cx-60*u,cy-44*u,cx,cy-24*u);x.quadraticCurveTo(cx+60*u,cy-44*u,cx+120*u,cy);x.quadraticCurveTo(cx,cy-6*u*talk,cx-120*u,cy);x.fill();
  x.beginPath();x.moveTo(cx-120*u,cy);x.quadraticCurveTo(cx,cy+(12+30*talk)*u,cx+120*u,cy);x.quadraticCurveTo(cx,cy+(48+20*talk)*u,cx-120*u,cy);x.fill();
  x.fillStyle='#14080c';x.beginPath();x.moveTo(cx-110*u,cy+1);x.quadraticCurveTo(cx,cy-4*u,cx+110*u,cy+1);x.quadraticCurveTo(cx,cy+(10+26*talk)*u,cx-110*u,cy+1);x.fill();
  x.fillStyle='rgba(255,255,255,.35)';x.beginPath();x.ellipse(cx-30*u,cy-26*u,22*u,5*u,-.15,0,TAU);x.fill();
  // the microphone and the ON AIR light
  x.fillStyle='#2c2c30';x.beginPath();x.roundRect(cx+150*u,cy-10*u,60*u,110*u,30*u);x.fill();x.strokeStyle='#5c5c64';x.lineWidth=2;for(let i=0;i<6;i++){x.beginPath();x.moveTo(cx+156*u,cy+i*16*u);x.lineTo(cx+204*u,cy+i*16*u);x.stroke();}
  x.fillStyle=Math.floor(t*2)%2?'#ff2c3c':'#8c1c24';x.beginPath();x.roundRect(w*.06,h*.08,120*u,34*u,6);x.fill();x.fillStyle='#fff';x.font=`900 ${18*u}px "SC Nunito",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('ON AIR',w*.06+60*u,h*.08+17*u);}
 // ---- one frame
 function draw(){if(!cur)return;const now=performance.now(),dt=Math.min(.05,(now-cur.last)/1000);cur.last=now;cur.t+=dt;
  const sh=cur.shots[cur.si],q=ease(clamp(cur.t/sh.dur,0,1)),cam=sh.cam||[700,1.4,700,1.4],camX=cam[0]+(cam[2]-cam[0])*q,z=cam[1]+(cam[3]-cam[1])*q,{w,h,u,sq,S,gy}=geom(z);
  for(const [at,what] of sh.at||[])if(cur.t>=at&&!cur.fired.has(at+what)){cur.fired.add(at+what);sound(what);}
  x.save();drawBg(sh,camX,z);
  if(sh.bg==='radio'){if(!drawDJPic(cur.t))drawDJ(cur.t);}
  else{// scene space: unit u*z, scene x camX at the screen centre
   const X=xx=>w/2+(xx-camX)*S*sq;
   if(sh.bg==='conclave'){// the stage and the crowd
    const sx=X(STAGE_X),ST=70;   // the stage: a wooden platform ST units high, steps, red bunting
    const cheer=(sh.cheer||[]).some(([a,b])=>cur.t>=a&&cur.t<b),bob=cheer?Math.abs(Math.sin(cur.t*9))*4*S:0;
    if(sh.crowd){const CS=u*1.6,cv=crowdCanvas(CS,cheer,!!sh.panic,sq);x.drawImage(cv,X(0),gy-CROWD_GROUND*S-bob,WW*S*sq,CROWD_H*S);}
    const SW=S*Math.max(sq,.7);x.fillStyle='#3a2a1c';x.fillRect(sx-120*SW,gy-ST*S,240*SW,ST*S);x.fillStyle='#5c4430';x.fillRect(sx-120*SW,gy-ST*S,240*SW,8*S);
    x.fillStyle='rgba(200,40,40,.9)';for(let i=0;i<6;i++){x.beginPath();x.moveTo(sx-120*SW+i*40*SW,gy-(ST-8)*S);x.quadraticCurveTo(sx-100*SW+i*40*SW,gy-(ST-26)*S,sx-80*SW+i*40*SW,gy-(ST-8)*S);x.fill();}
    x.fillStyle='#2a1e14';for(let i=0;i<3;i++)x.fillRect(sx-30*S+i*4*S,gy-(i+1)*ST/3*S,60*S-i*8*S,4*S);
    if(sh.cyrus){const down=sh.cyrus==='down';env.person(sx,gy-ST*S,1.25*S,{o:'cyrus',pose:down?'down':cheer?'win':(Math.floor(cur.t*1.3)%2?'win':'stand'),face:1,head:'cyrus',id:'cyrus',mood:down?'sad':'normal',skin:'#7c5034'});
     if(!down){x.strokeStyle='#e8c84c';x.lineWidth=2*S;x.beginPath();x.arc(sx+2*S,gy-ST*S-70*1.25*S,9*S,.2,Math.PI-.2);x.stroke();}}
    if(sh.tags){GANGS.forEach((G,i)=>{const gx=X((i+.5)/GANGS.length*WW);if(gx<-40||gx>w+40)return;const a=clamp(1-Math.abs(gx-w/2)/(w*.55),0,1);if(a<=0)return;
     x.globalAlpha=a;x.font=`900 ${clamp(14*u,11,22)}px "SC Bangers",Impact,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=4;x.strokeStyle='#000';x.strokeText(G[0],gx,h*.36);x.fillStyle='#ffd23c';x.fillText(G[0],gx,h*.36);x.globalAlpha=1;});}
    if(sh.panic){// flashlight beams and police lights sweeping the crowd
     for(let i=0;i<3;i++){const bx=w*(.2+i*.3)+Math.sin(cur.t*1.7+i)*w*.12;x.fillStyle='rgba(230,240,255,.1)';x.beginPath();x.moveTo(bx,0);x.lineTo(bx-60*u,h);x.lineTo(bx+60*u,h);x.closePath();x.fill();}
     x.fillStyle=Math.floor(cur.t*6)%2?'rgba(255,40,40,.16)':'rgba(40,80,255,.16)';x.fillRect(0,0,w,h);}}
   // the Warriors group, a gang, Luther, the Riffs
   const people=[];
   if(sh.warriors){const list=env.solo?['hero','swan','ajax','cochise','cleon']:['hero','hero2','swan','ajax','cochise'];if(sh.bg!=='conclave'||cur.si>=6)list.pop();
    const base=sh.bg==='conclave'?1000:camX-120;list.forEach((who,i)=>{const C=CAST[who];people.push({x:base+(i-list.length/2)*46,row:i%2,p:{o:C.o||'warrior',pose:sh.warriors==='run'?['run1','walk2','run2','walk2'][Math.floor(cur.t*10+i)%4]:'stand',face:sh.warriors==='run'?1:i<2?1:-1,char:C.char,pi:C.pi,id:who,mood:sh.warriors==='run'?'sad':'normal'}});});}
   if(sh.gang){const [o,head,n,wpn]=sh.gang;for(let i=0;i<n;i++)people.push({x:camX+120+i*40-(sh.warriors?0:160),row:i%2,p:{o,pose:wpn&&i%2?'batReady':'stand',face:-1,head,id:o+i,mood:'angry',wpn}});}
   if(sh.riffs){for(let i=0;i<7;i++)people.push({x:(sh.bg==='coney'?camX+60:camX-180)+i*42,row:i%2,p:{o:'riff',pose:'stand',face:sh.bg==='coney'?-1:1,head:'riff',id:'riff'+i}});
    if(sh.bg==='riffs')people.push({x:camX,row:1,big:1.15,p:{o:'riff',pose:'stand',face:-1,head:'riff',id:'masai',skin:'#6c4428'}});}
   if(sh.luther){const L=sh.luther;people.push({x:sh.bg==='conclave'?1180:camX+150,row:1,p:{o:'rogue',pose:L==='point'?'jab':L==='down'?'kneel':L===1&&cur.t>1.4?'aim':'stand',face:-1,char:'luther',head:'rogue',id:'luther',mood:L==='down'?'sad':'angry'},gun:L===1&&cur.t>1.4,bottles:L==='bottles'});}
   people.sort((a,b)=>a.row-b.row);
   for(const P of people){const k=S*(P.row?1.5:1.38)*(P.big||1),px=X(P.x),py=gy+(P.row?14:0)*S;if(px<-80||px>w+80)continue;const sp=env.person(px,py,k,P.p);
    const wim=P.p.wpn&&DS.picture(P.p.wpn);if(wim&&sp){const L=46*k,a=Math.atan2(-30,-24*(P.p.face||1)),h2=L*wim.height/wim.width;x.save();x.translate(sp.hand.x,sp.hand.y);x.rotate(a);x.drawImage(wim,-L*.12,-h2/2,L,h2);x.restore();}
    else if(P.p.wpn&&sp){x.strokeStyle='#c8944c';x.lineWidth=5*k;x.lineCap='round';x.beginPath();x.moveTo(sp.hand.x,sp.hand.y);x.lineTo(sp.hand.x-24*k,sp.hand.y-30*k);x.stroke();}
    if(P.gun&&sp){x.fillStyle='#141418';x.fillRect(sp.hand.x-14*k,sp.hand.y-4*k,14*k,6*k);}
    if(P.bottles&&sp){for(let b=0;b<3;b++){x.fillStyle='rgba(90,140,90,.9)';x.fillRect(sp.hand.x-4*k+b*5*k,sp.hand.y+2*k+(Math.floor(cur.t*3)%3===b?-2*k:0),4*k,13*k);}}}
   if(sh.spot){const lx=X(sh.spot),ly=gy-90*S,g2=x.createRadialGradient(lx,ly,40*S,lx,ly,Math.max(w,h)*.7);g2.addColorStop(0,'rgba(0,0,0,0)');g2.addColorStop(.35,'rgba(0,0,0,.55)');g2.addColorStop(1,'rgba(0,0,0,.85)');x.fillStyle=g2;x.fillRect(0,0,w,h);
    // draw him again over the dark so he's the only one lit
    const sp=env.person(lx,gy+14*S,S*1.5,{o:'rogue',pose:cur.t>1.4?'aim':'stand',face:-1,char:'luther',head:'rogue',id:'luther',mood:'angry'});
    if(cur.t>1.4&&sp){const k=S*1.5;x.fillStyle='#141418';x.fillRect(sp.hand.x-16*k,sp.hand.y-4*k,16*k,6*k);x.fillRect(sp.hand.x-6*k,sp.hand.y,5*k,9*k);}}
   if(sh.flash&&cur.t>=sh.flash&&cur.t<sh.flash+.35){x.fillStyle=`rgba(255,255,240,${1-(cur.t-sh.flash)/.35})`;x.fillRect(0,0,w,h);}}
  // letterbox bars
  const bar=h*.08;x.fillStyle='#000';x.fillRect(0,0,w,bar);x.fillRect(0,h-bar,w,bar);
  if(sh.caption){x.textAlign='center';x.textBaseline='middle';x.fillStyle='#ffd23c';x.font=`900 ${clamp(h*.05,14,30)}px "SC Bangers",Impact,sans-serif`;x.fillText(sh.caption[0],w/2,bar+h*.06);
   if(cur.t>1.2){x.fillStyle='#fff';x.font=`700 ${clamp(h*.032,11,18)}px "SC Nunito",sans-serif`;wrap(sh.caption[1],w/2,bar+h*.12,w*.86,clamp(h*.04,13,22));}}
  // the line being spoken
  const lines=sh.lines||[];let ln=null;for(const L of lines)if(cur.t>=L[0])ln=L;
  if(ln)speech(ln,cur.t-ln[0]);
  // skip
  x.fillStyle='rgba(255,255,255,.75)';x.font=`800 ${clamp(h*.028,10,15)}px "SC Nunito",sans-serif`;x.textAlign='left';x.textBaseline='middle';x.fillText('SKIP ▸▸',12,bar/2);
  x.restore();
  const lastAt=lines.length?lines[lines.length-1][0]:0,lastLen=lines.length?lines[lines.length-1][2].length/30+1.4:0;
  if(cur.t>Math.max(sh.dur,lastAt+lastLen)||env.auto&&cur.t>.3)nextShot();}
 function wrap(text,cx,y,maxW,lh){const words=text.split(' ');let line='',yy=y;for(const wd of words){const tt=line?line+' '+wd:wd;if(x.measureText(tt).width>maxW&&line){x.fillText(line,cx,yy);line=wd;yy+=lh;}else line=tt;}if(line)x.fillText(line,cx,yy);}
 function speech(L,age){const w=W(),h=H(),C=CAST[L[1]]||CAST.hero,fs=clamp(Math.min(w,h)*.042,12,22),bh=fs*4.6,bw=Math.min(w*.94,fs*34),bx=(w-bw)/2,by=h-h*.08-bh-6;
  x.fillStyle='rgba(8,6,12,.9)';x.beginPath();x.roundRect(bx,by,bw,bh,10);x.fill();x.strokeStyle=C.col;x.lineWidth=2;x.stroke();
  const ps=bh*.8;x.save();x.beginPath();x.roundRect(bx+8,by+(bh-ps)/2,ps,ps,8);x.fillStyle='#1c1820';x.fill();x.clip();
  const DP=C.dj&&djPic();
  if(DP){const G=DJD.DJ.guide[DP.shape],sc=DP.im.width/G.size[0],[fx,fy,rx,ry]=G.face,r=Math.max(rx,ry)*1.15*sc;x.drawImage(DP.im,fx*sc-r,fy*sc-r,r*2,r*2,bx+8,by+(bh-ps)/2,ps,ps);}
  else if(C.dj){x.fillStyle='#e01848';x.beginPath();x.ellipse(bx+8+ps/2,by+bh/2,ps*.36,ps*.16,0,0,TAU);x.fill();}
  else env.portrait({...C,id:L[1]},bx+8+ps/2,by+(bh-ps)/2+ps*.55,ps*.62);
  x.restore();
  const name=C.name||(env.names[C.pi||0]||'YOU').toUpperCase(),tx=bx+16+ps,typed=Math.min(L[2].length,Math.floor(age*38));
  x.textAlign='left';x.textBaseline='top';x.fillStyle=C.col;x.font=`900 ${fs*.85}px "SC Bangers",Impact,sans-serif`;x.fillText(name,tx,by+fs*.45);
  x.fillStyle='#fff';x.font=`700 ${fs}px "SC Nunito",sans-serif`;const big=/CAN YOU DIG IT/.test(L[2]);if(big)x.font=`900 ${fs*1.35}px "SC Bangers",Impact,sans-serif`;
  wrapL(L[2].slice(0,typed),tx,by+fs*1.55,bx+bw-tx-12,fs*1.2);}
 function wrapL(text,x0,y,maxW,lh){const words=text.split(' ');let line='',yy=y;for(const wd of words){const tt=line?line+' '+wd:wd;if(x.measureText(tt).width>maxW&&line){x.fillText(line,x0,yy);line=wd;yy+=lh;}else line=tt;}if(line)x.fillText(line,x0,yy);}
 function sound(what){const {sfx,noise,snd}=env;try{
  if(what==='roar'){noise(1.4,.12,{f0:900,q:.4});noise(1.1,.06,{f0:2200,q:.5,delay:.15});}
  else if(what==='tap')snd(480,.05,{type:'square',vol:.04,to:300});
  else sfx[what]?.();}catch{}}
 // tap: SKIP in the corner skips the whole scene, a tap elsewhere moves to the next shot
 function tap(px,py){if(!cur)return false;const h=H();if(px<120&&py<h*.1){finish();return true;}if(cur.t>.4)nextShot();return true;}
 return {start,draw,tap,get active(){return !!cur;},skip:finish,next:nextShot,info:()=>cur&&{si:cur.si,n:cur.shots.length,dur:cur.shots[cur.si]?.dur,bg:cur.shots[cur.si]?.bg}};}
const CUT_PICTURES=['conclave','riffs','street','lizzies','park','subway','restroom','dawn','coney','radio'];
// stage art standing in for a cut backdrop until its painted one comes: story area first, then the old biome set
const CUT_STAGE={conclave:['conclave','forest'],riffs:['gothic'],street:['tenement','elstreet','nyc'],lizzies:['apartment'],park:['riverside','park','forest'],
 subway:['station','platform','gotham'],restroom:['restroom'],dawn:['trainDawn'],coney:['boardwalk','beach']};
const djPictures=()=>Object.values(DJ_PICS).flatMap(n=>[n,...DJD.DJ.frames.map(f=>n+'-'+f)]);
// only for backdrops whose painted cut-<bg> isn't in the build
const stagePictures=(DS)=>[...new Set(Object.entries(CUT_STAGE).filter(([bg])=>!DS.has('cut-'+bg)).flatMap(([,v])=>v))].flatMap(n=>['far-'+n,'wall-'+n,'floor-'+n]);
Object.assign(exports,{makeCuts,CUTS,CAST,GANGS,CUT_PICTURES,CUT_STAGE,stagePictures,djPictures});
