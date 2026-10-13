// Mario Kart, Mode 7 engine (kartMode7): runs Kart Time Trials, and every kart game on browsers without WebGL
// (the Grand Prix and Balloon Battle otherwise use the 3D engine in kart.js). Mode 7-style kart racing: each view's floor is a perspective projection of a pre-drawn top-down course
// texture, with billboard scenery, item boxes, coins, items and karts (a small 3D kart model pre-rendered at 24 angles per
// colour, the driver's head on top). Five courses after the real tracks: Rainbow Road, Bowser's Castle, Cheep Cheep Beach,
// DK Jungle and Moo Moo Meadows, each with its own edges (fall off / walls / sand and water / grass) and hazards.
// Modes: 'race' (both players at once, side-by-side split screen, 4 CPU racers, 3 laps), 'time' (time trials: P1 runs
// 3 laps alone with 3 mushrooms, then P2 against P1's ghost; fastest total wins) and 'battle' (balloon battle, split).
// Drifting: hold a turn for a moment and the kart hops into a drift; keep it going to charge a mini-turbo (blue, orange,
// purple sparks) and straighten out to fire the boost.
const {clamp,seededRandom}=require("src/utils.js");
const {Fx,arenaKeys,arenaTouch,snd,noise,jingle,outlined,rr,FONT,PCOL,PDARK,settle}=require("src/engines/arenaKit.js");

const OW=640,OH=720,KY=640,ZK=2.2,CAMH=46,CAMBACK=92,TS=.5;
const LAPS=3,RACE_CAP=240,TIME_CAP=210,BATTLE_TIME=90,ARENA_R=820,CPUS=4;
const TOP=330,TURN=2.05,KR=15;
const KFONT='italic 900 %spx "Arial Black",Impact,system-ui,sans-serif';
const ITEM_KEYS=['mushroom','banana','shell','red','star','lightning','coins','triple'];

// ------------------------------------------------------------------ courses (hand-laid loops, Catmull-Rom smoothed)
const COURSES={
 rainbow:{name:'Rainbow Road',short:'RAINBOW',half:96,edge:'fall',pts:[[0,0],[10,0],[17,2],[22,-2],[23,-9],[18,-13],[12,-11],[7,-14],[2,-19],[-5,-18],[-8,-12],[-5,-7],[-9,-3],[-7,1]],
  sky:['#05031a','#1a0b4a','#3a1a7a'],far:'#2a1260',fog:'rgba(42,18,96,.9)'},
 bowser:{name:"Bowser's Castle",short:'BOWSER',half:100,edge:'wall',pts:[[0,0],[12,0],[16,-2],[16,-8],[12,-10],[8,-10],[6,-13],[6,-18],[0,-19],[-6,-18],[-8,-13],[-8,-6],[-5,-2]],
  sky:['#1a0404','#4a0c08','#8a2410'],far:'#5a1408',fog:'rgba(120,30,10,.85)',ground:'#d0400a'},
 beach:{name:'Cheep Cheep Beach',short:'BEACH',half:108,edge:'beach',pts:[[0,0],[16,0],[22,-4],[22,-10],[16,-13],[11,-11],[6,-14],[0,-14],[-5,-11],[-6,-5],[-4,-1]],
  sky:['#2f7fe0','#6ab4ff','#bfe6ff'],far:'#2f8fd8',fog:'rgba(170,220,255,.85)',ground:'#2a8ad0'},
 jungle:{name:'DK Jungle',short:'JUNGLE',half:100,edge:'jungle',pts:[[0,0],[9,1],[14,-2],[13,-7],[17,-11],[22,-12],[23,-17],[17,-20],[9,-19],[4,-16],[-2,-18],[-7,-14],[-5,-9],[-8,-4],[-5,0]],
  sky:['#3a8ad0','#8ad0e8','#d8f0d0'],far:'#2a6a2a',fog:'rgba(150,200,150,.8)',ground:'#1f5a22'},
 meadow:{name:'Moo Moo Meadows',short:'MEADOWS',half:108,edge:'grass',pts:[[0,0],[14,0],[20,-3],[20,-9],[15,-12],[10,-10],[5,-12],[0,-13],[-6,-10],[-7,-4],[-4,0]],
  sky:['#3a86e8','#86c2ff','#d8eeff'],far:'#4aa83a',fog:'rgba(200,230,255,.8)',ground:'#5cb83c'}
};
const COURSE_IDS=Object.keys(COURSES),SCALE=100;
// offroad / wall / fall distances from the centre line, per edge type
const EDGES={fall:{slow:Infinity,wall:Infinity,fall:14},wall:{slow:Infinity,wall:0,fall:Infinity},beach:{slow:0,wall:Infinity,fall:95},jungle:{slow:0,wall:150,fall:Infinity},grass:{slow:0,wall:190,fall:Infinity}};

function buildTrack(rand,id='rainbow'){
 const C=COURSES[id]||COURSES.rainbow,pts=C.pts.map(([a,b])=>[a*SCALE,b*SCALE]),n=pts.length,N=560,out=[];
 const cr=(p0,p1,p2,p3,t)=>{const t2=t*t,t3=t2*t;return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);};
 for(let i=0;i<N;i++){const u=i/N*n,k=Math.floor(u),t=u-k,P=j=>pts[(k+j+n)%n];out.push([cr(P(-1)[0],P(0)[0],P(1)[0],P(2)[0],t),cr(P(-1)[1],P(0)[1],P(1)[1],P(2)[1],t)]);}
 const tr={id,C,pts:out,n:N,nx:[],ny:[],cum:[0],len:0,half:C.half,edge:EDGES[C.edge]};
 for(let i=0;i<N;i++){const a=out[(i-1+N)%N],b=out[(i+1)%N],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;tr.nx.push(-dy/l);tr.ny.push(dx/l);}
 for(let i=1;i<=N;i++){const a=out[i-1],b=out[i%N];tr.len+=Math.hypot(b[0]-a[0],b[1]-a[1]);tr.cum.push(tr.len);}
 const xs=out.map(p=>p[0]),ys=out.map(p=>p[1]),M=900;tr.box={x0:Math.min(...xs)-M,y0:Math.min(...ys)-M,x1:Math.max(...xs)+M,y1:Math.max(...ys)+M};
 const at=(f,off)=>{const i=Math.floor(f*N)%N;return {x:out[i][0]+tr.nx[i]*tr.half*off,y:out[i][1]+tr.ny[i]*tr.half*off,i};};
 tr.start=N-8;
 tr.boxes=[];for(const f of [.18,.47,.76])for(const off of [-.6,-.2,.2,.6])tr.boxes.push({...at(f,off),t:0});
 tr.coins=[];for(const f of [.08,.32,.6,.9]){const off=(rand()-.5)*1.1,i0=Math.floor(f*N);for(let k=0;k<5;k++){const i=(i0+k*3)%N;tr.coins.push({x:out[i][0]+tr.nx[i]*tr.half*off,y:out[i][1]+tr.ny[i]*tr.half*off,t:0});}}
 // scenery beside the road, never on another stretch of it
 const near=(x,y,r)=>{for(let j=0;j<N;j+=2){const p=out[j];if((p[0]-x)**2+(p[1]-y)**2<r*r)return true;}return false;};
 const kinds={rainbow:[],bowser:['pillar','pillar','statue'],beach:['palm','palm','umbrella','rock'],jungle:['jtree','jtree','bush','jtree'],meadow:['tree','tree','fence','barn']}[id];
 tr.decor=[];if(kinds.length)for(let i=0;i<N;i+=3){for(const side of [-1,1]){if(rand()<.45)continue;const kind=kinds[Math.floor(rand()*kinds.length)],off=tr.half+(kind==='fence'?60:id==='bowser'?70:110)+rand()*(kind==='barn'?260:180),x=out[i][0]+tr.nx[i]*off*side,y=out[i][1]+tr.ny[i]*off*side;
  if(!near(x,y,tr.half+(kind==='barn'?150:60)))tr.decor.push({x,y,kind,v:rand()});}}
 // hazards
 tr.haz=[];const H=(f,kind,extra)=>{const p=at(f,0);tr.haz.push({kind,i:p.i,x:p.x,y:p.y,ph:rand()*6,...extra});};
 if(id==='bowser')for(const f of [.27,.29,.55,.84])H(f,'thwomp',{off:rand()<.5?-.45:.45});
 if(id==='beach')for(const f of [.25,.42,.66,.88])H(f,'crab',{});
 if(id==='jungle')for(const f of [.22,.5,.71])H(f,'barrel',{});
 if(id==='meadow')for(const f of [.2,.38,.62,.8,.86])H(f,'cow',{off:(rand()-.5)*1.3});
 return tr;
}
function nearest(tr,x,y,hint){let best=hint,bd=Infinity;const span=hint<0?tr.n:40;for(let k=-span;k<=span;k++){const i=((hint<0?0:hint)+k+tr.n*4)%tr.n,p=tr.pts[i],d=(p[0]-x)**2+(p[1]-y)**2;if(d<bd){bd=d;best=i;}}
 const p=tr.pts[best],lat=(x-p[0])*tr.nx[best]+(y-p[1])*tr.ny[best];return {i:best,lat,dist:Math.sqrt(bd)};}

// ------------------------------------------------------------------ cached art (textures, patterns, icons, scenery)
const mkCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;};
function tile(size,fn){const c=mkCanvas(size,size),g=c.getContext('2d');fn(g,size);return c;}
function hashRand(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function patternTiles(id){
 const R=hashRand(id.length*977+13),speck=(g,n,cols,r0,r1,S)=>{for(let k=0;k<n;k++){g.fillStyle=cols[Math.floor(R()*cols.length)];g.beginPath();g.arc(R()*S,R()*S,r0+R()*(r1-r0),0,7);g.fill();}};
 const T={};
 T.asphalt=tile(64,(g,S)=>{g.fillStyle='#6a6e78';g.fillRect(0,0,S,S);speck(g,160,['#5e626c','#767a84','#808490','#585c66'],.5,1.4,S);});
 T.stone=tile(64,(g,S)=>{g.fillStyle='#7a7480';g.fillRect(0,0,S,S);for(let r=0;r<4;r++)for(let c=0;c<2;c++){const x0=c*32+(r%2)*16,y0=r*16;g.fillStyle=['#8a8490','#6e6874','#7e7884','#746e7a'][(r+c)%4];g.fillRect(x0%S+1,y0+1,30,14);if(x0+32>S){g.fillRect((x0%S)-S+1,y0+1,30,14);}}g.strokeStyle='#3a343e';g.lineWidth=1;for(let r=0;r<=4;r++){g.beginPath();g.moveTo(0,r*16);g.lineTo(S,r*16);g.stroke();}});
 T.lava=tile(64,(g,S)=>{const gr=g.createLinearGradient(0,0,S,S);gr.addColorStop(0,'#ff6a10');gr.addColorStop(.5,'#d8300a');gr.addColorStop(1,'#ff8a1a');g.fillStyle=gr;g.fillRect(0,0,S,S);speck(g,26,['#ffd040','#ffb020','#a01a04'],2,7,S);});
 T.sand=tile(64,(g,S)=>{g.fillStyle='#ecd59a';g.fillRect(0,0,S,S);speck(g,120,['#e0c588','#f6e2ac','#d8bc7c'],.6,1.6,S);});
 T.road_sand=tile(64,(g,S)=>{g.fillStyle='#c9a46a';g.fillRect(0,0,S,S);speck(g,120,['#b8935a','#d4b078','#a8844e'],.6,1.8,S);});
 T.water=tile(64,(g,S)=>{g.fillStyle='#2a8ad0';g.fillRect(0,0,S,S);g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;for(let k=0;k<4;k++){const y=k*16+6;g.beginPath();g.moveTo(4+k*9,y);g.quadraticCurveTo(14+k*9,y-4,24+k*9,y);g.stroke();}});
 T.grass=tile(64,(g,S)=>{g.fillStyle='#5cb83c';g.fillRect(0,0,S,S);g.fillStyle='#52ac34';g.fillRect(0,0,S,S/2);speck(g,60,['#4ea030','#68c448','#5ab03a'],.6,1.6,S);});
 T.jgrass=tile(64,(g,S)=>{g.fillStyle='#3a8a2a';g.fillRect(0,0,S,S);speck(g,70,['#2e7a22','#46a034','#347f26'],.8,2.4,S);});
 T.jfloor=tile(64,(g,S)=>{g.fillStyle='#1f5a22';g.fillRect(0,0,S,S);speck(g,30,['#174a1a','#2a6a2a','#2f7a2a'],3,9,S);});
 T.dirt=tile(64,(g,S)=>{g.fillStyle='#a8743e';g.fillRect(0,0,S,S);speck(g,110,['#946434','#b8844a','#8a5a2c'],.6,2,S);});
 return T;
}
// The whole course drawn once from above (TS px per world unit); Mode 7 views sample it every frame.
function courseTexture(tr){
 const C=tr.C,b=tr.box,W=(b.x1-b.x0)*TS,H=(b.y1-b.y0)*TS,cv=mkCanvas(W,H),g=cv.getContext('2d'),T=patternTiles(tr.id),P=k=>{const p=g.createPattern(T[k],'repeat');return p;};
 g.scale(TS,TS);g.translate(-b.x0,-b.y0);g.lineJoin='round';g.lineCap='round';
 const path=()=>{g.beginPath();tr.pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();};
 const band=(w,style,dash)=>{path();g.lineWidth=w;g.strokeStyle=style;g.setLineDash(dash||[]);g.stroke();g.setLineDash([]);};
 const h=tr.half,N=tr.n;
 if(tr.id==='rainbow'){
  for(let j=0;j<N;j++){const p=tr.pts[j],j2=(j+1)%N,q=tr.pts[j2];g.fillStyle=`hsl(${(j*8)%360},88%,${58+((j>>1)%2)*8}%)`;g.beginPath();g.moveTo(p[0]+tr.nx[j]*h,p[1]+tr.ny[j]*h);g.lineTo(q[0]+tr.nx[j2]*h,q[1]+tr.ny[j2]*h);g.lineTo(q[0]-tr.nx[j2]*h,q[1]-tr.ny[j2]*h);g.lineTo(p[0]-tr.nx[j]*h,p[1]-tr.ny[j]*h);g.closePath();g.fill();g.strokeStyle=g.fillStyle;g.lineWidth=2;g.stroke();
   g.fillStyle=j%4<2?'#fff':'#ffe23a';for(const sd of [1,-1]){g.beginPath();g.moveTo(p[0]+tr.nx[j]*h*sd,p[1]+tr.ny[j]*h*sd);g.lineTo(q[0]+tr.nx[j2]*h*sd,q[1]+tr.ny[j2]*h*sd);g.lineTo(q[0]+tr.nx[j2]*(h-10)*sd,q[1]+tr.ny[j2]*(h-10)*sd);g.lineTo(p[0]+tr.nx[j]*(h-10)*sd,p[1]+tr.ny[j]*(h-10)*sd);g.closePath();g.fill();}}
  band(5,'rgba(255,255,255,.35)',[18,30]);
 }else if(tr.id==='bowser'){
  g.fillStyle=P('lava');g.fillRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);
  band((h+60)*2,'#3a3038');band((h+44)*2,'#5a5060');band((h+18)*2,'#28222a');band(h*2,P('stone'));
  band(h*2-6,'rgba(0,0,0,0)');band(6,'rgba(255,200,80,.5)',[26,40]);
 }else if(tr.id==='beach'){
  g.fillStyle=P('water');g.fillRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);
  band((h+150)*2,'rgba(120,210,240,.75)');band((h+100)*2,'#f6e6b4');band((h+90)*2,P('sand'));band(h*2,P('road_sand'));
  band(h*2,'rgba(255,255,255,0)');band((h-6)*2,'rgba(0,0,0,0)');band(5,'rgba(255,255,255,.55)',[24,36]);
  path();g.lineWidth=h*2;g.strokeStyle='rgba(255,255,255,.18)';g.setLineDash([3,60]);g.stroke();g.setLineDash([]);
 }else if(tr.id==='jungle'){
  g.fillStyle=P('jfloor');g.fillRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);
  band((h+150)*2,P('jgrass'));band((h+14)*2,'#6a4a20');band(h*2,P('dirt'));band(4,'rgba(255,240,200,.35)',[20,40]);
 }else{
  // meadow: mowed stripes, white/red kerbs, asphalt
  g.fillStyle=P('grass');g.fillRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);
  g.fillStyle='rgba(255,255,255,.06)';for(let X=b.x0;X<b.x1;X+=160)g.fillRect(X,b.y0,80,b.y1-b.y0);
  band((h+14)*2,'#f4f4f4');band((h+14)*2,'#e8282c',[30,30]);band(h*2,P('asphalt'));band(5,'rgba(255,255,255,.8)',[30,44]);
 }
 // start / finish line
 const s0=tr.start,p=tr.pts[s0];g.save();g.translate(p[0],p[1]);g.rotate(Math.atan2(tr.ny[s0],tr.nx[s0]));const cells=Math.ceil(h*2/16);for(let a=-cells/2;a<cells/2;a++)for(let r=0;r<2;r++){g.fillStyle=(a+r)&1?'#111':'#fff';g.fillRect(a*16,r*12-12,16,12);}g.restore();
 // dash panels (boost pads)
 tr.pads=[];for(const f of [.12,.4,.68]){const i=Math.floor(f*N),q=tr.pts[i],off=(f*7%1-.5)*h*.8;const x=q[0]+tr.nx[i]*off,y=q[1]+tr.ny[i]*off;tr.pads.push({x,y,i});g.save();g.translate(x,y);g.rotate(Math.atan2(tr.ny[i],tr.nx[i])+Math.PI/2);g.fillStyle='#ff9a1a';rr(g,-22,-28,44,56,8);g.fill();g.fillStyle='#ffe23a';for(let k=0;k<3;k++){g.beginPath();g.moveTo(-14,10-k*16);g.lineTo(0,-2-k*16);g.lineTo(14,10-k*16);g.lineTo(14,16-k*16);g.lineTo(0,4-k*16);g.lineTo(-14,16-k*16);g.closePath();g.fill();}g.restore();}
 return {cv,x0:b.x0,y0:b.y0,w:b.x1-b.x0,h:b.y1-b.y0};
}

// Item icons (HUD, billboards) and scenery sprites, drawn once.
const ICONS=new Map();
function itemIcon(kind){
 if(ICONS.has(kind))return ICONS.get(kind);const S=96,c=mkCanvas(S,S),g=c.getContext('2d');g.translate(S/2,S/2);g.lineJoin='round';g.lineCap='round';const OL='#1a1030';
 const shroom=(dx,dy,k)=>{g.save();g.translate(dx,dy);g.scale(k,k);g.fillStyle='#f6e6c8';g.strokeStyle=OL;g.lineWidth=5;rr(g,-14,0,28,26,10);g.fill();g.stroke();g.fillStyle='#000';g.fillRect(-7,6,4,9);g.fillRect(3,6,4,9);
  g.fillStyle='#e8282c';g.beginPath();g.moveTo(-32,6);g.bezierCurveTo(-34,-34,34,-34,32,6);g.closePath();g.fill();g.stroke();g.fillStyle='#fff';for(const [x,y,r] of [[0,-16,9],[-20,-4,6],[20,-4,6]]){g.beginPath();g.arc(x,y,r,0,7);g.fill();}g.restore();};
 const shell=(col,dark)=>{g.fillStyle='#fff';g.strokeStyle=OL;g.lineWidth=5;g.beginPath();g.ellipse(0,14,30,10,0,0,7);g.fill();g.stroke();g.fillStyle=col;g.beginPath();g.moveTo(-30,12);g.bezierCurveTo(-30,-34,30,-34,30,12);g.closePath();g.fill();g.stroke();
  g.strokeStyle=dark;g.lineWidth=3;g.beginPath();g.moveTo(-12,-16);g.lineTo(12,-16);g.lineTo(18,0);g.lineTo(0,10);g.lineTo(-18,0);g.closePath();g.stroke();g.fillStyle='rgba(255,255,255,.45)';g.beginPath();g.ellipse(-12,-14,8,4,-.5,0,7);g.fill();};
 switch(kind){
  case 'mushroom':shroom(0,4,1.15);break;
  case 'triple':shroom(-16,14,.62);shroom(16,14,.62);shroom(0,-8,.62);break;
  case 'banana':g.fillStyle='#ffd21c';g.strokeStyle=OL;g.lineWidth=5;g.beginPath();g.moveTo(-26,-20);g.quadraticCurveTo(-30,26,24,28);g.quadraticCurveTo(-10,14,-14,-22);g.closePath();g.fill();g.stroke();g.fillStyle='#6a4a10';g.beginPath();g.arc(-20,-22,5,0,7);g.fill();g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.ellipse(-18,4,4,12,.2,0,7);g.fill();break;
  case 'shell':shell('#2fbf3a','#145a1a');break;
  case 'red':shell('#e8282c','#7a0a0a');break;
  case 'star':{g.fillStyle='#ffe23a';g.strokeStyle=OL;g.lineWidth=5;g.beginPath();for(let k=0;k<10;k++){const r=k%2?16:38,a=k*Math.PI/5-Math.PI/2;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();g.stroke();g.fillStyle='#000';g.fillRect(-9,-8,5,12);g.fillRect(4,-8,5,12);break;}
  case 'lightning':g.fillStyle='#ffe23a';g.strokeStyle=OL;g.lineWidth=5;g.beginPath();g.moveTo(8,-38);g.lineTo(-22,6);g.lineTo(-2,6);g.lineTo(-10,38);g.lineTo(24,-8);g.lineTo(4,-8);g.closePath();g.fill();g.stroke();break;
  case 'coins':case 'coin':{g.fillStyle='#ffd21c';g.strokeStyle=OL;g.lineWidth=5;g.beginPath();g.ellipse(0,0,26,32,0,0,7);g.fill();g.stroke();g.strokeStyle='#b07800';g.lineWidth=4;g.beginPath();g.moveTo(0,-14);g.lineTo(0,14);g.stroke();g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(-10,-10,5,10,0,0,7);g.fill();break;}
  case 'box':{g.fillStyle='rgba(255,255,255,.25)';g.strokeStyle='#fff';g.lineWidth=4;rr(g,-34,-34,68,68,12);g.fill();g.stroke();const gr=g.createLinearGradient(-30,-30,30,30);gr.addColorStop(0,'rgba(255,90,200,.55)');gr.addColorStop(.5,'rgba(90,200,255,.55)');gr.addColorStop(1,'rgba(255,230,60,.55)');g.fillStyle=gr;rr(g,-30,-30,60,60,10);g.fill();
   g.font='900 46px Arial Black,Arial';g.textAlign='center';g.textBaseline='middle';g.lineWidth=6;g.strokeStyle='#5a2a8a';g.strokeText('?',0,3);g.fillStyle='#fff';g.fillText('?',0,3);break;}
 }
 ICONS.set(kind,c);return c;
}
// Scenery and hazard billboards: anchor = bottom centre of the canvas; size in world units = c.wu.
const SPRITES=new Map();
function sceneSprite(kind,frame=0){
 const key=kind+frame;if(SPRITES.has(key))return SPRITES.get(key);let c;const OL='#1a1030';
 const make=(w,h,wu,fn)=>{c=mkCanvas(w,h);const g=c.getContext('2d');g.lineJoin='round';g.lineCap='round';fn(g,w,h);c.wu=wu;};
 switch(kind){
  case 'palm':make(128,192,120,(g,w,h)=>{g.strokeStyle='#7a5020';g.lineWidth=12;g.beginPath();g.moveTo(64,h);g.quadraticCurveTo(52,110,70,52);g.stroke();g.strokeStyle='#5a3810';g.lineWidth=12;g.setLineDash([4,10]);g.stroke();g.setLineDash([]);
   for(let k=0;k<7;k++){g.save();g.translate(70,52);g.rotate(-Math.PI+k*Math.PI/6);g.fillStyle=k%2?'#2ea83a':'#3ac04a';g.strokeStyle='#14601a';g.lineWidth=2;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(26,-16,56,8);g.quadraticCurveTo(26,0,0,0);g.fill();g.stroke();g.restore();}g.fillStyle='#7a4a1a';g.beginPath();g.arc(64,58,6,0,7);g.arc(76,60,6,0,7);g.fill();});break;
  case 'umbrella':make(96,128,70,(g,w,h)=>{g.strokeStyle='#ddd';g.lineWidth=4;g.beginPath();g.moveTo(48,h);g.lineTo(48,30);g.stroke();for(let k=0;k<6;k++){g.fillStyle=k%2?'#fff':'#e8282c';g.beginPath();g.moveTo(48,22);g.arc(48,48,44,Math.PI+k*Math.PI/6,Math.PI+(k+1)*Math.PI/6);g.closePath();g.fill();}g.strokeStyle=OL;g.lineWidth=2;g.beginPath();g.arc(48,48,44,Math.PI,0);g.stroke();});break;
  case 'rock':make(96,64,60,(g,w,h)=>{g.fillStyle='#9a8a7a';g.strokeStyle='#4a3a2a';g.lineWidth=3;g.beginPath();g.moveTo(6,h);g.quadraticCurveTo(10,10,48,8);g.quadraticCurveTo(90,12,90,h);g.closePath();g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(36,22,14,6,-.3,0,7);g.fill();});break;
  case 'jtree':make(160,224,170,(g,w,h)=>{g.fillStyle='#6a4420';g.strokeStyle='#2a1808';g.lineWidth=3;g.beginPath();g.moveTo(66,h);g.lineTo(72,90);g.lineTo(88,90);g.lineTo(96,h);g.closePath();g.fill();g.stroke();
   for(const [x,y,r,col] of [[50,90,46,'#1f7a2a'],[110,86,48,'#1a6a24'],[80,56,54,'#2a9a34'],[60,40,34,'#38b040'],[104,44,30,'#30a038']]){g.fillStyle=col;g.strokeStyle='#0e3a12';g.beginPath();g.arc(x,y,r,0,7);g.fill();g.stroke();}
   g.strokeStyle='#2a6a1a';g.lineWidth=3;for(const vx of [58,100]){g.beginPath();g.moveTo(vx,110);g.quadraticCurveTo(vx+6,150,vx-4,180);g.stroke();}});break;
  case 'bush':make(112,72,80,(g,w,h)=>{for(const [x,y,r,col] of [[30,h-24,24,'#2a8a2a'],[80,h-24,26,'#24802a'],[56,h-36,28,'#38a838']]){g.fillStyle=col;g.strokeStyle='#0e3a12';g.lineWidth=2;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.stroke();}g.fillStyle='#e83a5a';for(const [x,y] of [[40,h-40],[70,h-46],[86,h-30]]){g.beginPath();g.arc(x,y,4,0,7);g.fill();}});break;
  case 'tree':make(128,176,130,(g,w,h)=>{g.fillStyle='#7a5028';g.strokeStyle='#3a2410';g.lineWidth=3;g.fillRect(56,100,16,h-100);g.strokeRect(56,100,16,h-100);for(const [x,y,r,col] of [[64,70,50,'#3aa83a'],[40,84,30,'#2e9a30'],[90,82,32,'#34a034'],[64,46,34,'#4cbc44']]){g.fillStyle=col;g.strokeStyle='#14501a';g.beginPath();g.arc(x,y,r,0,7);g.fill();g.stroke();}});break;
  case 'fence':make(128,48,90,(g,w,h)=>{g.fillStyle='#f4ead0';g.strokeStyle='#6a5030';g.lineWidth=2;for(const x of [8,60,112]){g.fillRect(x,4,8,h-4);g.strokeRect(x,4,8,h-4);}g.fillRect(0,12,w,7);g.strokeRect(0,12,w,7);g.fillRect(0,28,w,7);g.strokeRect(0,28,w,7);});break;
  case 'barn':make(192,160,230,(g,w,h)=>{g.fillStyle='#c8282c';g.strokeStyle='#4a0a0a';g.lineWidth=4;g.beginPath();g.moveTo(16,h);g.lineTo(16,64);g.lineTo(96,14);g.lineTo(176,64);g.lineTo(176,h);g.closePath();g.fill();g.stroke();g.fillStyle='#f4f0e0';g.fillRect(66,96,60,h-96);g.strokeRect(66,96,60,h-96);g.strokeStyle='#c8282c';g.beginPath();g.moveTo(66,96);g.lineTo(126,h);g.moveTo(126,96);g.lineTo(66,h);g.stroke();g.fillStyle='#f4f0e0';g.fillRect(80,50,32,24);});break;
  case 'pillar':make(96,224,150,(g,w,h)=>{const gr=g.createLinearGradient(20,0,76,0);gr.addColorStop(0,'#3a3040');gr.addColorStop(.5,'#7a7088');gr.addColorStop(1,'#2a2230');g.fillStyle=gr;g.fillRect(22,30,52,h-30);g.strokeStyle='#18101c';g.lineWidth=3;g.strokeRect(22,30,52,h-30);g.fillStyle='#5a5066';g.fillRect(14,14,68,22);g.strokeRect(14,14,68,22);
   g.fillStyle='rgba(255,120,30,.55)';g.fillRect(22,h-40,52,40);for(let k=0;k<3;k++){g.strokeStyle='#18101c';g.beginPath();g.moveTo(22,70+k*50);g.lineTo(74,70+k*50);g.stroke();}});break;
  case 'statue':make(160,224,190,(g,w,h)=>{g.fillStyle='#5a5466';g.strokeStyle='#18101c';g.lineWidth=4;g.fillRect(24,h-50,112,50);g.strokeRect(24,h-50,112,50);g.fillStyle='#6e687a';g.beginPath();g.ellipse(80,h-90,52,44,0,0,7);g.fill();g.stroke();
   g.beginPath();g.ellipse(80,60,40,36,0,0,7);g.fill();g.stroke();g.fillStyle='#e8e0d0';for(const d of [-1,1]){g.beginPath();g.moveTo(80+d*22,34);g.lineTo(80+d*44,6);g.lineTo(80+d*34,38);g.closePath();g.fill();g.stroke();}g.fillStyle='#ff3a1a';g.beginPath();g.arc(66,56,6,0,7);g.arc(94,56,6,0,7);g.fill();});break;
  case 'thwomp':make(128,144,110,(g,w,h)=>{g.fillStyle='#8a90a8';g.strokeStyle='#1a1a2a';g.lineWidth=4;g.beginPath();g.moveTo(14,24);g.lineTo(114,24);g.lineTo(122,h-4);g.lineTo(6,h-4);g.closePath();g.fill();g.stroke();
   g.fillStyle='#b0b8cc';for(let k=0;k<5;k++){g.beginPath();g.moveTo(18+k*22,24);g.lineTo(29+k*22,6);g.lineTo(40+k*22,24);g.closePath();g.fill();g.stroke();}
   g.fillStyle='#fff';g.fillRect(28,52,26,22);g.fillRect(74,52,26,22);g.strokeRect(28,52,26,22);g.strokeRect(74,52,26,22);g.fillStyle='#000';g.fillRect(36,60,10,14);g.fillRect(82,60,10,14);g.lineWidth=6;g.beginPath();g.moveTo(24,46);g.lineTo(58,56);g.moveTo(104,46);g.lineTo(70,56);g.stroke();
   g.fillStyle='#f4f4f4';g.fillRect(34,96,60,18);g.strokeRect(34,96,60,18);for(let k=1;k<4;k++){g.beginPath();g.moveTo(34+k*15,96);g.lineTo(34+k*15,114);g.stroke();}});break;
  case 'crab':make(112,80,66,(g,w,h)=>{const up=frame%2;g.strokeStyle='#7a1a0a';g.lineWidth=5;for(const d of [-1,1])for(let k=0;k<3;k++){g.beginPath();g.moveTo(56+d*18,48);g.lineTo(56+d*(34+k*6),h-4-(up&&k===1?6:0));g.stroke();}
   g.fillStyle='#e8402a';g.strokeStyle=OL;g.lineWidth=3;g.beginPath();g.ellipse(56,44,34,20,0,0,7);g.fill();g.stroke();for(const d of [-1,1]){g.beginPath();g.ellipse(56+d*42,22-(up?6:0),12,10,0,0,7);g.fill();g.stroke();}
   g.fillStyle='#fff';g.beginPath();g.arc(46,30,7,0,7);g.arc(66,30,7,0,7);g.fill();g.stroke();g.fillStyle='#000';g.beginPath();g.arc(47,31,3,0,7);g.arc(65,31,3,0,7);g.fill();});break;
  case 'barrel':make(96,96,64,(g,w,h)=>{g.save();g.translate(48,48);g.rotate(frame*Math.PI/4);g.fillStyle='#a8682a';g.strokeStyle='#3a2008';g.lineWidth=4;g.beginPath();g.arc(0,0,40,0,7);g.fill();g.stroke();g.strokeStyle='#5a3a14';g.lineWidth=3;for(const r of [14,28]){g.beginPath();g.arc(0,0,r,0,7);g.stroke();}g.fillStyle='#3a2008';g.fillRect(-3,-40,6,80);g.restore();});break;
  case 'cow':make(144,112,96,(g,w,h)=>{g.strokeStyle=OL;g.lineWidth=3;g.fillStyle='#fff';for(const x of [30,50,92,112]){g.fillRect(x,64,10,h-66);g.strokeRect(x,64,10,h-66);}g.beginPath();g.ellipse(70,56,52,28,0,0,7);g.fill();g.stroke();
   g.fillStyle='#2a2a2a';for(const [x,y,r] of [[50,50,12],[86,62,10],[96,40,8]]){g.beginPath();g.arc(x,y,r,0,7);g.fill();}
   g.fillStyle='#fff';g.beginPath();g.ellipse(124,40,18,16,0,0,7);g.fill();g.stroke();g.fillStyle='#f4b0b8';g.beginPath();g.ellipse(132,48,12,9,0,0,7);g.fill();g.stroke();g.fillStyle='#000';g.beginPath();g.arc(120,34,3,0,7);g.fill();g.fillStyle='#f4e0a0';g.beginPath();g.moveTo(112,26);g.lineTo(106,14);g.lineTo(118,22);g.fill();g.stroke();});break;
 }
 SPRITES.set(key,c);return c;
}

// ------------------------------------------------------------------ the kart: tiny 3D model, pre-rendered at 24 yaws
const YAWS=24,PITCH=.34,MS=3.6;
const hexRGB=h=>{const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255];};
const rgb=(c,k)=>`rgb(${c.map(v=>Math.round(clamp(v*k,0,255))).join(',')})`;
function kartModel(body,dark){
 const F=[],B=hexRGB(body),D=hexRGB(dark),BLK=[34,34,40],GRY=[150,156,170],WHT=[240,240,244],SEAT=[60,52,70],SKIN=[246,200,150];
 const box=(x0,x1,y0,y1,z0,z1,col,taper=0)=>{const v=[[x0,y0,z0],[x1,y0+taper,z0],[x1,y1-taper,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0+taper,z1],[x1,y1-taper,z1],[x0,y1,z1]],c=[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2];
  for(const f of [[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])F.push({p:f.map(i=>v[i]),col,c});};
 const cyl=(cx,cy,cz,r,w,axis,col,cap,n=12)=>{const ring=s=>Array.from({length:n},(_,k)=>{const a=k/n*Math.PI*2,u=Math.cos(a)*r,v=Math.sin(a)*r;return axis==='y'?[cx+u,cy+s,cz+v]:[cx+s,cy+u,cz+v];});
  const A=ring(-w),Bv=ring(w),c=[cx,cy,cz];for(let k=0;k<n;k++){const k2=(k+1)%n;F.push({p:[A[k],A[k2],Bv[k2],Bv[k]],col,c});}F.push({p:A,col:cap,c});F.push({p:Bv,col:cap,c});
  const hub=s=>Array.from({length:8},(_,k)=>{const a=k/8*Math.PI*2,u=Math.cos(a)*r*.45,v=Math.sin(a)*r*.45;return axis==='y'?[cx+u,cy+s,cz+v]:[cx+s,cy+u,cz+v];});F.push({p:hub(-w-.4),col:GRY,c});F.push({p:hub(w+.4),col:GRY,c});};
 box(-17,15,-11,11,3,8,B,1.5);           // chassis
 box(15,23,-9,9,3,7,B,3);                // nose
 box(21,24,-11,11,2.5,5.5,BLK);          // front bumper
 box(-6,6,-13.5,-10,4,8,D);box(-6,6,10,13.5,4,8,D); // side pods
 box(-12,-3,-7,7,8,12,SEAT);box(-13,-10,-7,7,12,20,SEAT); // seat + back
 box(-21,-14,-8,8,5,13,GRY);             // engine
 cyl(-24,-4.5,10,1.6,3,'x',BLK,[60,60,70],8);cyl(-24,4.5,10,1.6,3,'x',BLK,[60,60,70],8);
 cyl(-13,-15,7,7,3.5,'y',BLK,[50,50,58]);cyl(-13,15,7,7,3.5,'y',BLK,[50,50,58]);
 cyl(13,-14,5.5,5.5,3,'y',BLK,[50,50,58]);cyl(13,14,5.5,5.5,3,'y',BLK,[50,50,58]);
 box(-9,-1,-6,6,11,21,B);                // driver torso (team colour)
 box(-2,6,-7,-4,16,19,B);box(-2,6,4,7,16,19,B); // arms
 box(5,8,-3,3,13,19,BLK);                // steering column + wheel
 box(5,8.5,-8,-4,16,19,WHT);box(5,8.5,4,8,16,19,WHT); // gloves
 box(16,22,-4,4,7,8,WHT);                // nose stripe
 return F;
}
const KART_CACHE=new Map();
function kartFrames(body,dark){
 const key=body+dark;if(KART_CACHE.has(key))return KART_CACHE.get(key);
 const F=kartModel(body,dark),frames=[],cp=Math.cos(PITCH),sp=Math.sin(PITCH),L=(()=>{const v=[-.55,.5,.7],l=Math.hypot(...v);return v.map(a=>a/l);})();
 const W=220,H=176,OX=W/2,OY=H*.78;
 for(let f=0;f<YAWS;f++){
  const a=f/YAWS*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),rot=p=>[p[0]*ca-p[1]*sa,p[0]*sa+p[1]*ca,p[2]];
  const proj=p=>({x:OX-p[1]*MS,y:OY-(p[2]*cp+p[0]*sp)*MS,d:p[0]*cp-p[2]*sp});
  const faces=[];
  for(const fc of F){const P=fc.p.map(rot),C=rot(fc.c);const u=[P[1][0]-P[0][0],P[1][1]-P[0][1],P[1][2]-P[0][2]],v=[P[2][0]-P[0][0],P[2][1]-P[0][1],P[2][2]-P[0][2]];let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const nl=Math.hypot(...n)||1;n=n.map(q=>q/nl);
   const cen=[0,1,2].map(k=>P.reduce((s0,q)=>s0+q[k],0)/P.length);if((cen[0]-C[0])*n[0]+(cen[1]-C[1])*n[1]+(cen[2]-C[2])*n[2]<0)n=n.map(q=>-q);
   if(n[0]*cp-n[2]*sp>.02)continue; // facing away from the camera
   const pr=P.map(proj),depth=pr.reduce((s0,q)=>s0+q.d,0)/pr.length,lit=.55+.5*Math.max(0,n[0]*L[0]+n[1]*L[1]+n[2]*L[2]);faces.push({pr,depth,fill:rgb(fc.col,lit),line:rgb(fc.col,.38)});}
  faces.sort((p,q)=>q.depth-p.depth);
  const c=mkCanvas(W,H),g=c.getContext('2d');g.lineJoin='round';g.lineWidth=1.1;
  for(const fc of faces){g.beginPath();fc.pr.forEach((q,i)=>i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y));g.closePath();g.fillStyle=fc.fill;g.fill();g.strokeStyle=fc.line;g.stroke();}
  const head=rot([-4,0,26]),hp=proj(head),rear=[[-13,-15,1],[-13,15,1]].map(p=>proj(rot(p))),pipes=[[-26,-4.5,10],[-26,4.5,10]].map(p=>proj(rot(p)));
  frames.push({c,ox:OX,oy:OY,hx:hp.x-OX,hy:hp.y-OY,rear:rear.map(q=>({x:q.x-OX,y:q.y-OY})),pipes:pipes.map(q=>({x:q.x-OX,y:q.y-OY,d:q.d}))});
 }
 KART_CACHE.set(key,frames);return frames;
}

// ------------------------------------------------------------------ CPU racers: Mario faces first, then anyone with art
function cpuRoster(rand,exclude){
 const out=[];try{
  const {CHARACTERS}=require('src/characters.js'),{portraitURL}=require('src/assets.js');
  const art=id=>{try{const u=portraitURL(id);return !!u&&!/^data:image\/svg/.test(u);}catch{return false;}};
  const pref=['mario','luigi','peach','princess-peach','toad','yoshi','bowser','donkey-kong','wario','waluigi','boom-boom','daisy','koopa-troopa'].filter(id=>!exclude.includes(id)&&CHARACTERS.some(c=>c.id===id)&&art(id));
  while(pref.length&&out.length<2){const k=Math.floor(rand()*pref.length);out.push(pref.splice(k,1)[0]);}
  const rest=CHARACTERS.filter(c=>!exclude.includes(c.id)&&!out.includes(c.id)&&art(c.id));
  while(out.length<CPUS&&rest.length){const k=Math.floor(rand()*rest.length);out.push(rest.splice(k,1)[0].id);}
 }catch{}
 return out;
}

// ------------------------------------------------------------------ the game
async function kartMode7(s){
 const mode=s.game.kartMode==='battle'?'battle':s.game.kartMode==='time'?'time':'race';
 const [c,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=mode!=='time';s.updateScores();
 if(!await settle(s))return;
 const itemSeq=seededRandom(Math.floor(s.random()*1e9)),aiRand=seededRandom(Math.floor(s.random()*1e9));
 let headOf=null;try{headOf=require('src/engines/broforce.js').headCanvas;}catch{}
 let phase=mode==='battle'?'count':'select',tr=null,tex=null,course=null,lights=0,clock=0,endT=0,simT=0,selT=0,turn=0,winner=-1,endText='',turnText='',msg=[null,null],results=null;
 const K=[],peels=[],shells=[],fx=new Fx(),ghost=[],times=[null,null];
 const arenaBoxes=[];if(mode==='battle'){for(let k=0;k<8;k++){const a=k/8*Math.PI*2;arenaBoxes.push({x:Math.cos(a)*430,y:Math.sin(a)*430,t:0});}for(const [bx,by] of [[0,-90],[0,90],[-90,0],[90,0]])arenaBoxes.push({x:bx,y:by,t:0});}
 let boxes=arenaBoxes,coins=[];
 const CPU_COLS=[['#3cbf4a','#1a7a26'],['#ffd21c','#b08a00'],['#9b59ff','#5a2ab0'],['#ff8a1c','#b04a00']];
 const name=i=>K[i]?.name||s.players[i]?.name||'CPU';

 // ---------------- karts
 function makeKart(i,slot,cpu){
  const k={i,cpu:!!cpu,human:!cpu,x:0,y:0,h:0,v:0,steer:0,seg:0,startSeg:0,lap:0,halfway:false,prog:0,best:0,coins:0,item:null,itemN:0,roll:0,boost:0,star:0,spin:0,spinA:0,shrink:0,fall:0,inv:0,finished:false,finishT:0,
   balloons:3,out:false,bump:0,drift:0,hold:0,charge:0,tier:0,hop:0,off:false,place:slot+1,lane:0,laneT:0,skill:1,itemT:0,wrong:0,splits:[],lapStart:0,spark:0};
  if(cpu){k.charId=cpu.id;k.name=cpu.name;k.cols=CPU_COLS[cpu.n%CPU_COLS.length];k.skill=.9+cpu.n*.025+aiRand()*.03;k.lane=(aiRand()-.5)*.9;}
  else{k.name=s.players[i].name;k.cols=[PCOL[i],PDARK[i]];}
  k.frames=kartFrames(k.cols[0],k.cols[1]);
  if(mode==='battle'){k.x=i?300:-300;k.y=0;k.h=i?Math.PI:0;}
  else{const row=Math.floor(slot/2),col=slot%2,j=(tr.start-5-row*9+tr.n)%tr.n,p=tr.pts[j],off=(col?1:-1)*tr.half*.42;k.x=p[0]+tr.nx[j]*off;k.y=p[1]+tr.ny[j]*off;const q=tr.pts[(j+1)%tr.n];k.h=Math.atan2(q[1]-p[1],q[0]-p[0]);k.seg=j;k.startSeg=tr.start;}
  return k;
 }
 function setupRace(id){
  course=id;tr=buildTrack(s.random,id);tex=courseTexture(tr);boxes=mode==='time'?[]:tr.boxes;coins=tr.coins;
  K.length=0;
  if(mode==='race'){const ex=s.players.map(p=>p.character).filter(Boolean),ids=cpuRoster(aiRand,ex);let names={};try{const {character}=require('src/characters.js');for(const id2 of ids)names[id2]=character(id2)?.name||id2;}catch{}
   K.push(makeKart(0,4),makeKart(1,5));ids.slice(0,CPUS).forEach((id2,n)=>K.push(makeKart(2+n,n,{id:id2,n,name:names[id2]||id2})));
   while(K.length<2+CPUS){const n=K.length-2;K.push(makeKart(K.length,n,{id:null,n,name:['Koopa','Shy Guy','Toad','Yoshi'][n]}));}
   for(const k of K)if(k.charId&&headOf)headOf(k.charId);}
  else K.push(makeKart(0,0),makeKart(1,0));
  if(mode==='time')for(const k of K){k.item='triple';k.itemN=3;}
 }
 if(mode==='battle'){K.push(makeKart(0,0),makeKart(1,1));tex=arenaTexture();}

 // ---------------- input: each player owns their half of the screen (whole screen in time trials)
 const kb=arenaKeys(s),pads=[{f:null},{f:null}],press=[0,0],auto=[false,false];
 const ownerOf=i=>mode==='time'?turn:i;
 kb.onDown((i,k)=>{if(phase==='select'){if(k==='fire'||k==='u')pickCourse(COURSE_IDS[0]);return;}if(k==='u'||k==='fire')press[ownerOf(i)]=1;});
 arenaTouch(s,{owner:p=>mode==='time'?turn:p.x<s.W/2?0:1,maxFingers:2,
  onDown:f=>{if(phase==='select'){selectTap(f.x,f.y);f.data.role='menu';return;}const pd=pads[f.owner];if(!pd.f){pd.f=f;f.data.role='steer';}else{f.data.role='item';press[f.owner]=1;}},
  onMove:f=>{if(f.data.role!=='steer')return;const dx=f.x-f.sx,lim=64;if(Math.abs(dx)>lim)f.sx=f.x-Math.sign(dx)*lim;},
  onUp:f=>{const pd=pads[f.owner];if(pd.f===f){pd.f=null;if(f.moved<14&&f.held<260)press[f.owner]=1;}}});
 function humanInput(i){
  const kk=mode==='time'?{l:kb.state[0].l||kb.state[1].l,r:kb.state[0].r||kb.state[1].r,d:kb.state[0].d||kb.state[1].d}:kb.state[i];
  let steer=(kk.r?1:0)-(kk.l?1:0),brake=kk.d?1:0;const f=pads[i].f;
  if(f){const dx=f.x-f.sx,dy=f.y-f.sy;steer=Math.abs(dx)<5?0:clamp(dx/46,-1,1);if(dy>48)brake=1;}
  const use=press[i];press[i]=0;return {steer,brake,use};
 }
 function cpuInput(k){
  if(mode==='battle'){const o=K[1-k.i],da=wrap(Math.atan2(o.y-k.y,o.x-k.x)-k.h);return {steer:clamp(da*2,-1,1),brake:0,use:k.item&&Math.abs(da)<.3?1:0};}
  k.laneT-=1/60;if(k.laneT<=0){k.lane=(aiRand()-.5)*1.0;k.laneT=2.5+aiRand()*4;}
  const look=9+Math.floor(k.v/40),t=(k.seg+look)%tr.n,p=tr.pts[t],tx=p[0]+tr.nx[t]*tr.half*k.lane,ty=p[1]+tr.ny[t]*tr.half*k.lane;
  const da=wrap(Math.atan2(ty-k.y,tx-k.x)-k.h);let use=0;
  if(k.item&&k.roll<=0){k.itemT-=1/60;if(k.itemT<=0){use=1;k.itemT=1+aiRand()*4;}}
  return {steer:clamp(da*2.6,-1,1),brake:Math.abs(da)>.8&&k.v>220?1:0,use};
 }
 const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

 // ---------------- sounds
 const sfx={box:()=>jingle([880,1175,1568],{step:.04,type:'square',vol:.03}),coin:()=>{snd(988,.05,{type:'square',vol:.03});snd(1319,.12,{type:'square',vol:.03,delay:.05});},
  boost:()=>{noise(.3,{vol:.05,freq:900});snd(200,.35,{type:'sawtooth',vol:.03,to:700});},spin:()=>{snd(600,.4,{type:'square',vol:.03,to:120});noise(.2,{vol:.05,freq:2000});},
  shell:()=>snd(300,.15,{type:'square',vol:.03,to:600}),fall:()=>snd(800,.7,{type:'triangle',vol:.04,to:120}),pop:()=>{noise(.12,{vol:.08,freq:3000});snd(1200,.08,{type:'square',vol:.03,to:300});},
  lap:()=>jingle([659,784,1047],{step:.08,type:'square',vol:.035}),final:()=>jingle([784,988,1175,1568,1175,1568],{step:.08,type:'square',vol:.035}),star:()=>jingle([1047,1319,1568,2093,1568,2093],{step:.06,type:'square',vol:.03}),
  light:hi=>snd(hi?1047:523,hi?.5:.25,{type:'square',vol:.04}),hop:()=>{snd(260,.08,{type:'square',vol:.025,to:420});noise(.12,{vol:.03,freq:4000,q:2});},
  tier:t=>snd([0,1319,1568,2093][t],.09,{type:'square',vol:.03}),bump:()=>noise(.1,{vol:.06,freq:500}),thwomp:()=>{noise(.3,{vol:.08,freq:240});snd(80,.3,{type:'sawtooth',vol:.04,to:40});},
  moo:()=>snd(180,.5,{type:'sawtooth',vol:.03,to:140}),finish:()=>jingle([523,659,784,1047,1319,1568],{step:.09,type:'square',vol:.04})};

 // ---------------- race rules
 const humans=()=>mode==='time'?[K[turn]]:[K[0],K[1]];
 const active=()=>mode==='time'?[K[turn]]:K;
 const progKey=k=>k.finished?100+(1000-k.finishT):k.prog;
 function rankAll(){const a=active().slice().sort((p,q)=>progKey(q)-progKey(p));a.forEach((k,n)=>k.place=n+1);}
 const rubber=k=>{if(mode!=='race')return 1;const hs=humans(),lead=Math.max(...hs.map(h=>h.prog)),tail=Math.min(...hs.map(h=>h.prog));return k.prog>lead+.25?.9:k.prog<tail-.15?1.1:k.prog<tail?1.04:1;};
 function giveItem(k){
  let pool;if(mode==='battle')pool=['shell','shell','banana','mushroom','star','banana','red'];
  else{const n=k.place;pool=n<=1?['banana','banana','shell','coins','banana','shell']:n<=3?['shell','red','mushroom','banana','coins','triple']:['mushroom','triple','red','star','lightning','red','triple'];}
  k.item=pool[Math.floor(itemSeq()*pool.length)];k.itemN=k.item==='triple'?3:1;k.roll=.9;k.itemT=1.5+aiRand()*3;if(k.human)sfx.box();
 }
 function hit(k,why){if(k.star>0||k.inv>0||k.fall>0)return false;k.spin=1;k.v*=.25;k.inv=1.6;k.drift=0;k.charge=0;k.hold=0;if(k.human){sfx.spin();s.react(k.i,'sad');}if(mode==='battle')loseBalloon(k);else if(k.coins>0)k.coins=Math.max(0,k.coins-2);return true;}
 function loseBalloon(k){if(k.balloons<=0)return;k.balloons--;sfx.pop();if(k.balloons<=0)k.out=true;}
 function useItem(k){
  if(!k.item||k.roll>0||k.fall>0||phase!=='play')return;const it=k.item,fxd=Math.cos(k.h),fyd=Math.sin(k.h);
  if(--k.itemN<=0){k.item=null;k.itemN=0;}
  if(it==='mushroom'||it==='triple'){k.boost=Math.max(k.boost,1.15);if(k.human)sfx.boost();}
  else if(it==='star'){k.star=7;if(k.human)sfx.star();}
  else if(it==='banana'){peels.push({x:k.x-fxd*40,y:k.y-fyd*40,owner:k.i,t:0});snd(400,.1,{type:'square',vol:.02});if(peels.length>14)peels.shift();}
  else if(it==='shell'||it==='red'){let target=null;if(it==='red'){const ahead=active().filter(o=>o!==k&&!o.finished&&(mode==='battle'||o.place<k.place)).sort((a,b)=>b.place-a.place)[0];target=ahead||null;}
   shells.push({x:k.x+fxd*34,y:k.y+fyd*34,h:k.h,v:Math.max(560,k.v+260),owner:k.i,t:0,red:it==='red',target,seg:k.seg});sfx.shell();}
  else if(it==='lightning'){for(const o of active())if(o!==k&&o.star<=0){o.shrink=4;o.v*=.5;hit(o,'zap');}noise(.4,{vol:.07,freq:500});for(let j=0;j<2;j++)msg[j]={t:1.4,text:'⚡ LIGHTNING!'};}
  else if(it==='coins'){k.coins=Math.min(10,k.coins+2);if(k.human)sfx.coin();}
 }
 function respawn(k){
  if(mode==='battle'){const a=Math.atan2(k.y,k.x);k.x=Math.cos(a)*300;k.y=Math.sin(a)*300;k.h=a+Math.PI;}
  else{const i=k.seg,p=tr.pts[i];k.x=p[0];k.y=p[1];const q=tr.pts[(i+2)%tr.n];k.h=Math.atan2(q[1]-p[1],q[0]-p[0]);}
  k.v=0;k.fall=0;k.inv=1.5;k.boost=0;k.drift=0;k.charge=0;
 }
 function edgeCheck(k){
  if(mode==='battle'){if(Math.hypot(k.x,k.y)>ARENA_R){k.fall=.001;sfx.fall();loseBalloon(k);}return;}
  const n=nearest(tr,k.x,k.y,k.seg),E=tr.edge,a=Math.abs(n.lat)-tr.half,sg=Math.sign(n.lat)||1;k.off=a>E.slow&&k.star<=0;
  if(a>E.wall){const back=a-E.wall,nx=tr.nx[n.i]*sg,ny=tr.ny[n.i]*sg;k.x-=nx*back;k.y-=ny*back;const hx=Math.cos(k.h),hy=Math.sin(k.h),dn=hx*nx+hy*ny;
   if(dn>0){const rx=hx-1.6*dn*nx,ry=hy-1.6*dn*ny;k.h=Math.atan2(ry,rx);k.v*=.72;if(k.bump<=0){k.bump=.35;if(k.human){sfx.bump();k.spark=.25;}}}}
  if(a>E.fall){k.fall=.001;k.drift=0;if(k.human)sfx.fall();}
  return n;
 }
 function lapLogic(k,n){
  const prevRel=(k.seg-k.startSeg+tr.n)%tr.n;k.seg=n.i;const rel=(k.seg-k.startSeg+tr.n)%tr.n;
  if(prevRel>tr.n*.8&&rel<tr.n*.2&&k.halfway&&!k.finished){k.lap++;k.halfway=false;k.splits.push(clock-k.lapStart);k.lapStart=clock;
   if(k.lap>=LAPS){k.finished=true;k.finishT=clock;if(k.human){sfx.finish();s.react(k.i,'win');msg[mode==='time'?0:k.i]={t:3,text:'FINISH!'};}}
   else if(k.human){if(k.lap===LAPS-1){sfx.final();msg[mode==='time'?0:k.i]={t:2,text:'FINAL LAP!'};}else{sfx.lap();msg[mode==='time'?0:k.i]={t:1.4,text:`LAP ${k.lap+1}`};}}}
  if(rel>tr.n*.45&&rel<tr.n*.6)k.halfway=true;
  k.prog=k.finished?LAPS:k.lap+(rel>tr.n*.85&&!k.halfway?(rel-tr.n)/tr.n:rel/tr.n);k.best=Math.max(k.best,k.prog);
  const tx=tr.ny[k.seg],ty=-tr.nx[k.seg];k.wrong=Math.cos(k.h)*tx+Math.sin(k.h)*ty<-.3&&k.v>60?k.wrong+1/60:0;
 }
 function stepKart(k,dt,inp){
  k.roll=Math.max(0,k.roll-dt);k.inv=Math.max(0,k.inv-dt);k.star=Math.max(0,k.star-dt);k.boost=Math.max(0,k.boost-dt);k.shrink=Math.max(0,k.shrink-dt);k.bump=Math.max(0,k.bump-dt);k.hop=Math.max(0,k.hop-dt);k.spark=Math.max(0,k.spark-dt);
  if(k.out||k.finished&&mode!=='battle'||phase==='end'){const top=k.finished&&mode!=='battle'?TOP*.55:0;k.v+=(top-k.v)*Math.min(1,dt*1.5);if(k.finished&&mode!=='battle'){const ci=cpuInput(k);k.h+=clamp(ci.steer,-1,1)*TURN*dt;}k.x+=Math.cos(k.h)*k.v*dt;k.y+=Math.sin(k.h)*k.v*dt;if(mode!=='battle'){const n=nearest(tr,k.x,k.y,k.seg);k.seg=n.i;}return;}
  if(k.fall>0){k.fall+=dt;if(k.fall>1.6)respawn(k);return;}
  if(inp.use)useItem(k);
  const sIn=inp.steer;k.steer+=(sIn-k.steer)*Math.min(1,dt*12);
  // drift: hold a turn and the kart hops into a slide; the longer it lasts the bigger the mini-turbo when you straighten out
  if(k.human&&!k.drift&&mode!=='battle'){if(Math.abs(sIn)>.55&&k.v>170&&k.spin<=0){k.hold+=dt;if(k.hold>.26){k.drift=Math.sign(sIn);k.charge=0;k.tier=0;k.hop=.2;sfx.hop();}}else k.hold=0;}
  if(k.drift){const into=clamp(sIn*k.drift,-1,1);k.charge+=dt*(1+.75*Math.max(0,into))*(k.off?.35:1);const tier=k.charge>2.9?3:k.charge>1.8?2:k.charge>.85?1:0;if(tier>k.tier){k.tier=tier;sfx.tier(tier);}
   if(Math.abs(sIn)<.2||into<-.45||k.v<110||k.spin>0){if(k.tier>0&&k.spin<=0){k.boost=Math.max(k.boost,[0,.75,1.25,1.9][k.tier]);sfx.boost();}k.drift=0;k.charge=0;k.tier=0;k.hold=0;}}
  if(k.spin>0){k.spin-=dt*1.1;k.v*=Math.pow(.25,dt);k.spinA+=dt*14;}
  else{
   const top=TOP*(mode==='battle'?.78:1)*(1+k.coins*.015)*(k.star>0?1.15:1)*(k.boost>0?1.36:1)*(k.shrink>0?.7:1)*(k.off&&k.boost<=0?.52:1)*(k.cpu?k.skill*rubber(k):1);
   if(inp.brake)k.v=Math.max(0,k.v-520*dt);else if(k.v<top)k.v=Math.min(top,k.v+(k.boost>0?760:240)*dt);else k.v=Math.max(top,k.v-(k.off?640:220)*dt);
   const grip=clamp(k.v/90,0,1);
   if(k.drift){const into=clamp(sIn*k.drift,-1,1);k.h+=k.drift*TURN*(.8+.6*into)*dt*grip;}
   else k.h+=k.steer*TURN*(k.cpu?1.3:1)*dt*grip*(inp.brake?1.25:1);
  }
  k.x+=Math.cos(k.h)*k.v*dt;k.y+=Math.sin(k.h)*k.v*dt;
  if(k.drift){const sl=-k.drift*k.v*.09*dt;k.x+=Math.cos(k.h+Math.PI/2)*sl;k.y+=Math.sin(k.h+Math.PI/2)*sl;}
  const n=edgeCheck(k);if(k.fall>0)return;
  if(mode!=='battle'){lapLogic(k,n);for(const p of tr.pads)if(Math.hypot(p.x-k.x,p.y-k.y)<34){if(k.boost<.5&&k.human)sfx.boost();k.boost=Math.max(k.boost,.9);}}
  // pickups
  for(const b of boxes)if(b.t<=0&&Math.hypot(b.x-k.x,b.y-k.y)<36){b.t=2.5;if(!k.item)giveItem(k);}
  for(const cn of coins)if(cn.t<=0&&Math.hypot(cn.x-k.x,cn.y-k.y)<30){cn.t=8;if(k.coins<10)k.coins++;if(k.human)sfx.coin();}
  for(let j=peels.length-1;j>=0;j--){const p=peels[j];if(Math.hypot(p.x-k.x,p.y-k.y)<26){peels.splice(j,1);hit(k,'banana');}}
 }
 // hazards: thwomps slam, crabs and barrels cross the road, cows stand in it
 function hazPos(hz){const i=hz.i,p=tr.pts[i];let lat=0,hgt=0;const t=simT+hz.ph;
  if(hz.kind==='thwomp'){lat=hz.off*tr.half;const ph=t%4.4;hgt=ph<2.6?120:ph<2.78?120*(1-(ph-2.6)/.18):ph<3.9?0:120*(ph-3.9)/.5;}
  else if(hz.kind==='crab')lat=Math.sin(t*.55)*tr.half*.85;
  else if(hz.kind==='barrel'){const u=(t*.32)%2.2;lat=(u-1.1)*tr.half*1.5;}
  else if(hz.kind==='cow')lat=hz.off*tr.half*.8+Math.sin(t*.3)*12;
  return {x:p[0]+tr.nx[i]*lat,y:p[1]+tr.ny[i]*lat,hgt,lat};}
 function stepHazards(){
  if(mode==='battle'||!tr)return;
  for(const hz of tr.haz){const q=hazPos(hz);hz.q=q;if(hz.kind==='thwomp'){const was=hz.down;hz.down=q.hgt<4;if(hz.down&&!was&&K.some(k=>k.human&&Math.hypot(k.x-q.x,k.y-q.y)<700))sfx.thwomp();}
   if(hz.kind==='barrel'&&Math.abs(q.lat)>tr.half*1.25)continue;
   for(const k of active()){if(k.fall>0||k.finished)continue;const d=Math.hypot(k.x-q.x,k.y-q.y),r=hz.kind==='thwomp'?44:hz.kind==='cow'?36:28;if(d>r)continue;
    if(hz.kind==='thwomp'){if(q.hgt<26){if(hit(k,'thwomp'))k.shrink=Math.max(k.shrink,1.6);}if(q.hgt<10){const nx=(k.x-q.x)/(d||1),ny=(k.y-q.y)/(d||1);k.x=q.x+nx*r;k.y=q.y+ny*r;}}
    else if(hz.kind==='cow'){const nx=(k.x-q.x)/(d||1),ny=(k.y-q.y)/(d||1);k.x=q.x+nx*r;k.y=q.y+ny*r;if(k.bump<=0){k.bump=.5;k.v*=k.star>0?1:.35;if(k.human){sfx.moo();sfx.bump();}}}
    else hit(k,hz.kind);}}
 }
 function stepWorld(dt){
  for(const b of boxes)if(b.t>0)b.t-=dt;for(const cn of coins)if(cn.t>0)cn.t-=dt;
  for(let j=shells.length-1;j>=0;j--){const sh=shells[j];sh.t+=dt;
   if(sh.red&&sh.target&&!sh.target.finished){const da=wrap(Math.atan2(sh.target.y-sh.y,sh.target.x-sh.x)-sh.h);sh.h+=clamp(da,-4*dt,4*dt);}
   else if(sh.red&&mode!=='battle'){const t=(sh.seg+12)%tr.n,p=tr.pts[t];sh.h+=clamp(wrap(Math.atan2(p[1]-sh.y,p[0]-sh.x)-sh.h),-3*dt,3*dt);}
   sh.x+=Math.cos(sh.h)*sh.v*dt;sh.y+=Math.sin(sh.h)*sh.v*dt;let gone=sh.t>(sh.red?4:5);
   if(mode!=='battle'){const n=nearest(tr,sh.x,sh.y,sh.seg);sh.seg=n.i;const a=Math.abs(n.lat)-tr.half,E=tr.edge;if(a>E.fall+10)gone=true;
    if(a>E.wall){const sg=Math.sign(n.lat),nx=tr.nx[n.i]*sg,ny=tr.ny[n.i]*sg,hx=Math.cos(sh.h),hy=Math.sin(sh.h),dn=hx*nx+hy*ny;sh.x-=nx*(a-E.wall);sh.y-=ny*(a-E.wall);if(dn>0)sh.h=Math.atan2(hy-2*dn*ny,hx-2*dn*nx);}}
   else if(Math.hypot(sh.x,sh.y)>ARENA_R)gone=true;
   for(const k of active()){if(sh.t<.25&&k.i===sh.owner)continue;if(Math.hypot(sh.x-k.x,sh.y-k.y)<30&&k.fall<=0){if(hit(k,'shell')||k.star>0)gone=true;}}
   for(let q=peels.length-1;q>=0;q--)if(Math.hypot(peels[q].x-sh.x,peels[q].y-sh.y)<24){peels.splice(q,1);gone=true;}
   if(gone)shells.splice(j,1);}
  stepHazards();
  // kart-to-kart bumps
  const A=active();for(let a=0;a<A.length;a++)for(let b=a+1;b<A.length;b++){const p=A[a],q=A[b];if(p.fall>0||q.fall>0||p.out||q.out)continue;const d=Math.hypot(p.x-q.x,p.y-q.y),R=KR*2;if(d>=R)continue;
   const nx=(p.x-q.x)/(d||1),ny=(p.y-q.y)/(d||1),push=(R-d)/2+1;p.x+=nx*push;p.y+=ny*push;q.x-=nx*push;q.y-=ny*push;
   if(p.bump<=0&&q.bump<=0){p.bump=q.bump=.5;if(p.human||q.human)noise(.08,{vol:.05,freq:600});for(const [u,w] of [[p,q],[q,p]])if(u.star>0&&w.star<=0)hit(w,'star');
    if(mode==='battle')for(const [u,w] of [[p,q],[q,p]])if(u.boost>0&&w.star<=0&&w.inv<=0&&u.balloons<3){hit(w,'boost');u.balloons++;}}}
 }

 // ---------------- course select (race and time trials)
 const cards=[];
 function layoutCards(){cards.length=0;const ids=[...COURSE_IDS,'random'],cols=s.W>=s.H*1.1?3:2,rows=Math.ceil(ids.length/cols),top=s.H*.2,gap=Math.max(8,s.W*.015),cw=Math.min((s.W*.92-gap*(cols-1))/cols,320),ch=Math.min((s.H*.76-gap*(rows-1))/rows,cw*.62),x0=(s.W-(cw*cols+gap*(cols-1)))/2;
  ids.forEach((id,n)=>cards.push({id,x:x0+(n%cols)*(cw+gap),y:top+Math.floor(n/cols)*(ch+gap),w:cw,h:ch}));}
 function selectTap(px,py){layoutCards();const cd=cards.find(q=>px>=q.x&&px<=q.x+q.w&&py>=q.y&&py<=q.y+q.h);if(!cd)return;pickCourse(cd.id==='random'?COURSE_IDS[Math.floor(s.random()*COURSE_IDS.length)]:cd.id);}
 function pickCourse(id){if(phase!=='select')return;snd(880,.08,{type:'square',vol:.03});setupRace(id);if(mode==='time')beginTurn(0);else{phase='count';lights=0;}}
 const thumbs=new Map();
 function thumb(id,w,h){const key=id+w+'x'+h;if(thumbs.has(key))return thumbs.get(key);const C=COURSES[id],cv=mkCanvas(w,h),g=cv.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,C.sky[1]);gr.addColorStop(1,id==='rainbow'?C.sky[0]:C.ground);g.fillStyle=gr;g.fillRect(0,0,w,h);
  const pts=C.pts,xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),mx=Math.min(...xs),Mx=Math.max(...xs),my=Math.min(...ys),My=Math.max(...ys),k=Math.min(w*.8/(Mx-mx),h*.7/(My-my));
  const tmp=buildTrack(()=>.5,id);g.save();g.translate(w/2-(mx+Mx)/2*k,h*.52-(my+My)/2*k);g.scale(k/SCALE,k/SCALE);g.lineJoin='round';
  g.beginPath();tmp.pts.forEach((p,j)=>j?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.lineWidth=tmp.half*2+160;g.strokeStyle='rgba(0,0,0,.35)';g.stroke();g.lineWidth=tmp.half*2;
  if(id==='rainbow'){const lg=g.createLinearGradient(mx*SCALE,0,Mx*SCALE,0);['#ff3b3b','#ffe23b','#4cd964','#3aa7ff','#b45bff'].forEach((c0,j)=>lg.addColorStop(j/4,c0));g.strokeStyle=lg;}else g.strokeStyle={bowser:'#8a8490',beach:'#e8cf96',jungle:'#b08048',meadow:'#7a7e88'}[id];g.stroke();g.restore();thumbs.set(key,cv);return cv;}
 function drawSelect(){
  const W=s.W,H=s.H;const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#14083a');bg.addColorStop(1,'#3a0a4a');x.fillStyle=bg;x.fillRect(0,0,W,H);
  x.save();x.globalAlpha=.12;x.fillStyle='#fff';for(let k=0;k<14;k++){const xx=((k*137+simT*30)%(W+200))-100;x.beginPath();x.moveTo(xx,0);x.lineTo(xx+60,0);x.lineTo(xx-80,H);x.lineTo(xx-140,H);x.fill();}x.restore();
  const size=Math.min(W*.06,H*.075,40);kText(mode==='time'?'TIME TRIALS':'GRAND PRIX',W/2,H*.08,size,'#ffe23a');kText('CHOOSE A COURSE',W/2,H*.08+size*1.15,size*.55,'#fff');
  layoutCards();for(const cd of cards){const pulse=cd.id==='random'?0:Math.sin(simT*3+cd.x*.01)*.5+.5;x.save();x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=12;rr(x,cd.x,cd.y,cd.w,cd.h,14);x.fillStyle='#1a1030';x.fill();x.restore();
   x.save();rr(x,cd.x+4,cd.y+4,cd.w-8,cd.h-8,11);x.clip();if(cd.id==='random'){const g2=x.createLinearGradient(cd.x,cd.y,cd.x+cd.w,cd.y+cd.h);g2.addColorStop(0,'#ff5ac8');g2.addColorStop(1,'#5ac8ff');x.fillStyle=g2;x.fillRect(cd.x,cd.y,cd.w,cd.h);const ic=itemIcon('box');x.drawImage(ic,cd.x+cd.w/2-cd.h*.3,cd.y+cd.h*.12,cd.h*.6,cd.h*.6);}
   else x.drawImage(thumb(cd.id,Math.round(cd.w),Math.round(cd.h)),cd.x,cd.y,cd.w,cd.h);x.restore();
   rr(x,cd.x+2,cd.y+2,cd.w-4,cd.h-4,13);x.lineWidth=3;x.strokeStyle=`rgba(255,226,58,${.5+pulse*.5})`;x.stroke();
   kText(cd.id==='random'?'RANDOM':COURSES[cd.id].name.toUpperCase(),cd.x+cd.w/2,cd.y+cd.h-Math.min(cd.h*.13,16),Math.min(cd.h*.14,cd.w*.075,22),'#fff');}
 }
 function kText(t,px,py,size,fill,align='center',base='middle'){x.save();x.font=KFONT.replace('%s',Math.round(size));x.textAlign=align;x.textBaseline=base;x.lineJoin='round';x.lineWidth=Math.max(3,size*.22);x.strokeStyle='#120a2e';x.strokeText(t,px,py);x.fillStyle=fill;x.fillText(t,px,py);x.restore();}

 // ---------------- drawing the views
 const offs=[0,1].map(()=>{const cv=mkCanvas(OW,OH);return {cv,g:cv.getContext('2d')};});
 const cams=[{x:0,y:0,h:0,set:false},{x:0,y:0,h:0,set:false}];
 function views(){if(mode==='time')return [{i:turn,x:0,y:0,w:s.W,h:s.H}];const hw=Math.floor(s.W/2);return [{i:0,x:0,y:0,w:hw-2,h:s.H},{i:1,x:hw+2,y:0,w:s.W-hw-2,h:s.H}];}
 function renderFloor(o,cam){const g=o.g;g.setTransform(1,0,0,1,0,0);
  if(mode==='battle'||course==='rainbow')g.clearRect(0,0,OW,OH);else{g.fillStyle=tr.C.ground;g.fillRect(0,0,OW,OH);}
  g.translate(OW/2,KY);g.rotate(-Math.PI/2-cam.h);g.scale(1/ZK,1/ZK);g.translate(-cam.x,-cam.y);g.imageSmoothingEnabled=true;g.drawImage(tex.cv,tex.x0,tex.y0,tex.w,tex.h);}
 function drawView(v,dt){
  const k=K[v.i],cam=cams[v.i],o=offs[v.i===turn&&mode==='time'?0:v.i];
  if(!cam.set){cam.x=k.x;cam.y=k.y;cam.h=k.h;cam.set=true;}
  cam.x=k.x;cam.y=k.y;cam.h+=wrap(k.h-cam.h)*Math.min(1,dt*(k.spin>0?2:7));
  const F=Math.min(v.h*.8,v.w*1.15),hY=v.y+clamp(v.h*.78-F*CAMH/CAMBACK,v.h*.28,v.h*.56);
  x.save();x.beginPath();x.rect(v.x,v.y,v.w,v.h);x.clip();
  // sky panorama scrolls with the heading
  const pano=panorama(mode==='battle'?'rainbow':course),ph=hY-v.y+2,pw=ph*pano.width/pano.height,span=Math.max(pw,v.w*2.4),pan=((cam.h/(Math.PI*2))*span%span+span)%span;
  for(let px=-pan;px<v.w;px+=span)x.drawImage(pano,v.x+px,v.y,span,ph);
  // ground under the far rows, then the Mode 7 floor
  const gc=mode==='battle'||course==='rainbow'?null:tr.C.ground;if(gc){x.fillStyle=gc;x.fillRect(v.x,hY,v.w,v.y+v.h-hY);}
  renderFloor(o,cam);x.imageSmoothingEnabled=true;
  for(let r=Math.ceil(hY)+1;r<v.y+v.h;r++){const dz=r-hY,d=CAMH*F/dz,f=d-CAMBACK,oy=KY-f/ZK;if(oy<0||oy>=OH)continue;const hw=(v.w/2)*d/F/ZK,sx0=OW/2-hw,sx1=OW/2+hw,c0=Math.max(0,sx0),c1=Math.min(OW,sx1);if(c1<=c0)continue;
   const dx0=v.x+(c0-sx0)/(sx1-sx0)*v.w,dx1=v.x+(c1-sx0)/(sx1-sx0)*v.w;x.drawImage(o.cv,c0,oy,c1-c0,1,dx0,r,dx1-dx0,1.6);}
  const fogC=mode==='battle'?'rgba(42,18,96,.9)':tr.C.fog,hz=x.createLinearGradient(0,hY,0,hY+v.h*.1);hz.addColorStop(0,fogC);hz.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=hz;x.fillRect(v.x,hY,v.w,v.h*.1);
  // billboards
  const c0=Math.cos(cam.h),s0=Math.sin(cam.h),cx=v.x+v.w/2;
  const proj=(wx,wy)=>{const dx=wx-cam.x,dy=wy-cam.y,f=dx*c0+dy*s0,l=-dx*s0+dy*c0,d=f+CAMBACK;if(d<14||d>2600)return null;return {x:cx+l*F/d,y:hY+CAMH*F/d,s:F/d,d};};
  const list=[],add=(wx,wy,draw)=>{const p=proj(wx,wy);if(p&&p.x>v.x-v.w&&p.x<v.x+v.w*2)list.push({p,draw});};
  if(tr){for(const d of tr.decor)add(d.x,d.y,p=>{const sp=sceneSprite(d.kind),w=sp.wu*p.s,h=w*sp.height/sp.width;if(p.x+w/2<v.x||p.x-w/2>v.x+v.w)return;x.drawImage(sp,p.x-w/2,p.y-h,w,h);});
   for(const hz0 of tr.haz){const q=hz0.q||hazPos(hz0);if(hz0.kind==='barrel'&&Math.abs(q.lat)>tr.half*1.25)continue;add(q.x,q.y,p=>{const sp=sceneSprite(hz0.kind,hz0.kind==='barrel'?Math.floor(simT*8)%8:hz0.kind==='crab'?Math.floor(simT*6)%2:0),w=sp.wu*p.s,h=w*sp.height/sp.width,lift=(q.hgt||0)*p.s;
    x.fillStyle='rgba(0,0,0,.28)';x.beginPath();x.ellipse(p.x,p.y,w*.42,w*.1,0,0,7);x.fill();x.drawImage(sp,p.x-w/2,p.y-h-lift,w,h);});}}
  for(const b of boxes)if(b.t<=0)add(b.x,b.y,p=>{const sz=p.s*34;x.save();x.translate(p.x,p.y-sz*.95+Math.sin(simT*3+b.x)*sz*.06);x.rotate(Math.sin(simT*1.6+b.y)*.25);x.drawImage(itemIcon('box'),-sz/2,-sz/2,sz,sz);x.restore();});
  for(const cn of coins)if(cn.t<=0)add(cn.x,cn.y,p=>{const sz=p.s*18,sw=Math.max(.15,Math.abs(Math.cos(simT*4+cn.x*.01)));x.drawImage(itemIcon('coin'),p.x-sz*sw/2,p.y-sz*1.3,sz*sw,sz);});
  for(const pe of peels)add(pe.x,pe.y,p=>{const sz=p.s*26;x.drawImage(itemIcon('banana'),p.x-sz/2,p.y-sz,sz,sz);});
  for(const sh of shells)add(sh.x,sh.y,p=>{const sz=p.s*22;x.save();x.translate(p.x,p.y-sz*.5);x.rotate(Math.sin(simT*20)*.15);x.drawImage(itemIcon(sh.red?'red':'shell'),-sz/2,-sz/2,sz,sz);x.restore();});
  for(const o2 of active())if(o2!==k&&!(o2.fall>.9))add(o2.x,o2.y,p=>drawKart(o2,p,wrap(o2.h-Math.atan2(o2.y-cam.y,o2.x-cam.x))));
  const gh=ghostAt();if(gh&&mode==='time'&&turn===1)add(gh.x,gh.y,p=>{x.save();x.globalAlpha=.45;drawKart({...K[0],x:gh.x,y:gh.y,h:gh.h,drift:gh.d,spin:0,inv:0,star:0,boost:0,shrink:0,fall:0,hop:0,tier:0,ghost:true},p,wrap(gh.h-Math.atan2(gh.y-cam.y,gh.x-cam.x)));x.restore();});
  list.sort((a,b)=>b.p.d-a.p.d);for(const it of list){if(it.p.y>v.y+v.h+60)continue;it.draw(it.p);}
  // own kart (rear view, angled into a drift)
  const me={x:cx,y:hY+CAMH*F/CAMBACK,s:F/CAMBACK,d:CAMBACK};if(k.fall>0){me.y+=k.fall*v.h*.22;me.s*=Math.max(.2,1-k.fall*.45);}
  drawKart(k,me,wrap(k.h-cam.h)+(k.drift?k.drift*.42:0),true);
  if(k.fall>.5)drawLakitu(me.x+me.s*24,v.y+v.h*.16+Math.sin(simT*4)*4,me.s*.9,me);
  if(k.star>0){x.fillStyle=`hsla(${simT*600%360},100%,60%,.14)`;x.fillRect(v.x,v.y,v.w,v.h);}
  if(k.boost>0&&k.fall<=0){x.save();x.globalAlpha=Math.min(.5,k.boost);x.strokeStyle='#fff';x.lineWidth=2;for(let j=0;j<10;j++){const a=(j*2.4+simT*7)%(Math.PI*2),r0=v.w*.32,r1=v.w*.62;x.beginPath();x.moveTo(cx+Math.cos(a)*r0,hY+v.h*.25+Math.sin(a)*r0*.5);x.lineTo(cx+Math.cos(a)*r1,hY+v.h*.25+Math.sin(a)*r1*.5);x.stroke();}x.restore();}
  drawHUD(v.i,v);
  x.restore();
 }
 function drawKart(k,p,rel,own=false){
  const fr0=k.frames,spinA=k.spin>0?k.spinA:0,idx=((Math.round(-(rel+spinA)/(Math.PI*2)*YAWS)%YAWS)+YAWS)%YAWS,fr=fr0[idx];
  const sc=p.s/MS*1.08*(k.shrink>0?.6:1);if(sc*fr.c.width<4)return;const hop=k.hop>0?Math.sin(k.hop/.2*Math.PI)*8*p.s:0,bob=k.v>40&&k.fall<=0?Math.sin(simT*30+k.i)*.6*p.s*.3:0,ky=p.y-hop+bob;
  x.save();if(k.inv>0&&!k.ghost&&(simT*12|0)%2)x.globalAlpha*=.55;
  x.fillStyle='rgba(0,0,0,.32)';x.beginPath();x.ellipse(p.x,p.y+1,15*p.s*(k.shrink>0?.6:1),4.5*p.s,0,0,7);x.fill();
  // drift sparks / smoke at the rear wheels
  if(k.drift&&!k.ghost){const col=['#e8e8f0','#4ab8ff','#ff9a1a','#d060ff'][k.tier];for(const w of fr.rear){const wx=p.x+w.x*sc,wy=ky+w.y*sc;for(let j=0;j<(k.tier?5:2);j++){const a=Math.random()*Math.PI*2,r=(2+Math.random()*6)*p.s*.35;x.fillStyle=col;x.globalAlpha=k.tier?.95:.45;x.beginPath();x.arc(wx+Math.cos(a)*r*1.6,wy-Math.abs(Math.sin(a))*r*1.2,(k.tier?1.6:3)*p.s*.32,0,7);x.fill();}}x.globalAlpha=1;}
  x.drawImage(fr.c,p.x-fr.ox*sc,ky-fr.oy*sc,fr.c.width*sc,fr.c.height*sc);
  if(k.star>0){x.save();x.globalCompositeOperation='lighter';x.globalAlpha=.35;x.fillStyle=`hsl(${simT*720%360},100%,55%)`;x.beginPath();x.ellipse(p.x,ky-10*p.s,22*p.s,15*p.s,0,0,7);x.fill();x.restore();}
  if((k.boost>0||k.star>0)&&!k.ghost)for(const q of fr.pipes){if(q.d>0)continue;const px=p.x+q.x*sc,py=ky+q.y*sc,L=(6+Math.random()*7)*p.s*.4;x.fillStyle='#ff6a1a';x.beginPath();x.arc(px,py,L*.55,0,7);x.fill();x.fillStyle='#ffe23a';x.beginPath();x.arc(px,py,L*.3,0,7);x.fill();}
  if(k.spark>0&&!k.ghost){x.fillStyle='#ffe23a';for(let j=0;j<6;j++){const a=Math.random()*6.28;x.fillRect(p.x+Math.cos(a)*14*p.s,ky-6*p.s+Math.sin(a)*6*p.s,2,2);}}
  // the driver's head
  const hsz=p.s*21*(k.shrink>0?.6:1),hx=p.x+fr.hx*sc,hy=ky+fr.hy*sc-hsz*.28,mood=k.spin>0||k.fall>0?'sad':k.finished?'win':k.star>0||k.boost>0?'happy':k.drift?'angry':undefined;
  if(k.human||k.ghost)s.sprite(x,k.i,hx,hy,hsz,{exact:true,mood});
  else{const hc=k.charId&&headOf?headOf(k.charId,mood==='sad'?'sad':mood==='win'||mood==='happy'?'win':'normal'):null;if(hc){const q=hsz/Math.max(hc.width,hc.height)*1.05;x.drawImage(hc,hx-hc.width*q/2,hy-hc.height*q/2,hc.width*q,hc.height*q);}
   else{x.fillStyle=k.cols[0];x.beginPath();x.arc(hx,hy,hsz*.42,0,7);x.fill();x.strokeStyle='#1a1030';x.lineWidth=2;x.stroke();}}
  if(mode==='battle'&&k.balloons>0){const cols=['#ff3b3b','#ffe23b','#3aa7ff'],sz=p.s*30;for(let b=0;b<k.balloons;b++){const bx=(b-(k.balloons-1)/2)*sz*.42,by=-sz*1.7-Math.abs(bx)*.2+Math.sin(simT*3+b)*sz*.03;x.strokeStyle='#ddd';x.lineWidth=1;x.beginPath();x.moveTo(hx,hy-hsz*.3);x.lineTo(p.x+bx,ky+by);x.stroke();x.fillStyle=cols[b];x.beginPath();x.ellipse(p.x+bx,ky+by-sz*.14,sz*.17,sz*.21,0,0,7);x.fill();}}
  x.restore();
 }
 function drawLakitu(lx,ly,sz,me){x.save();x.translate(lx,ly);x.scale(sz,sz);x.fillStyle='#fff';x.strokeStyle='#9ab';x.lineWidth=1.5;for(const [cx0,cy0,r] of [[-14,6,10],[0,8,12],[14,6,10],[0,0,12]]){x.beginPath();x.arc(cx0,cy0,r,0,7);x.fill();}
  x.fillStyle='#f6d33a';x.beginPath();x.ellipse(0,-14,9,11,0,0,7);x.fill();x.strokeStyle='#1a1030';x.stroke();x.fillStyle='#fff';x.beginPath();x.arc(-3,-17,3.5,0,7);x.arc(3,-17,3.5,0,7);x.fill();x.fillStyle='#000';x.fillRect(-3,-18,1.6,3);x.fillRect(3,-18,1.6,3);
  x.strokeStyle='#6a4a20';x.lineWidth=2;x.beginPath();x.moveTo(8,-8);x.lineTo(30,-28);x.stroke();x.restore();x.strokeStyle='#ddd';x.lineWidth=1;x.beginPath();x.moveTo(lx+30*sz,ly-28*sz);x.lineTo(me.x,me.y-30*me.s);x.stroke();}

 // ---------------- HUD (Mario Kart style: item box, lap, coins, time, place, position tracker, minimap)
 const fmtT=t=>`${Math.floor(t/60)}'${String(Math.floor(t%60)).padStart(2,'0')}"${String(Math.floor(t*100%100)).padStart(2,'0')}`;
 const ord=n=>n+(n===1?'st':n===2?'nd':n===3?'rd':'th');
 function drawHead(k,hx,hy,sz){if(k.human)s.sprite(x,k.i,hx,hy,sz,{exact:true});else{const hc=k.charId&&headOf?headOf(k.charId):null;if(hc){const q=sz/Math.max(hc.width,hc.height);x.drawImage(hc,hx-hc.width*q/2,hy-hc.height*q/2,hc.width*q,hc.height*q);}else{x.fillStyle=k.cols[0];x.beginPath();x.arc(hx,hy,sz*.4,0,7);x.fill();}}}
 function drawHUD(i,v){
  const k=K[i],u=clamp(Math.min(v.w/380,v.h/330),.55,2),pad=10*u;
  // item frame
  const bs=56*u,bx=v.x+pad,by=v.y+pad;x.save();const fg=x.createLinearGradient(0,by,0,by+bs);fg.addColorStop(0,'#ffffff');fg.addColorStop(1,'#9aa3b8');rr(x,bx,by,bs,bs,bs*.24);x.fillStyle=fg;x.fill();rr(x,bx+3*u,by+3*u,bs-6*u,bs-6*u,bs*.2);x.fillStyle='rgba(20,14,50,.85)';x.fill();
  const it=k.roll>0?ITEM_KEYS[(simT*14|0)%ITEM_KEYS.length]:k.item;if(it){const ic=itemIcon(it),q=bs*.78;x.drawImage(ic,bx+(bs-q)/2,by+(bs-q)/2,q,q);if(it==='triple'&&k.roll<=0&&k.itemN<3){x.fillStyle='rgba(20,14,50,.7)';x.fillRect(bx+3*u,by+bs*.55,bs-6*u,bs*.4);kText(`×${k.itemN}`,bx+bs/2,by+bs*.75,bs*.28,'#fff');}}x.restore();
  // position tracker (race): heads in order
  if(mode==='race'){const ord2=active().slice().sort((a,b)=>a.place-b.place),hs=Math.min(26*u,(v.h-bs-pad*6-80*u)/6);ord2.forEach((q,n)=>{const hy=by+bs+pad+hs*.6+n*hs*1.05,hx=bx+hs*.6;x.fillStyle=q===k?'#ffe23a':q.human?PCOL[q.i]:'rgba(255,255,255,.55)';x.beginPath();x.arc(hx,hy,hs*.55,0,7);x.fill();drawHead(q,hx,hy,hs*.95);});}
  // lap + coins (bottom left)
  if(mode!=='battle'){const ly=v.y+v.h-pad;const ci=itemIcon('coin');x.drawImage(ci,bx,ly-26*u,22*u,24*u);kText(`×${k.coins}`,bx+26*u,ly-13*u,16*u,'#fff','left');
   kText(`${Math.min(LAPS,k.lap+1)}/${LAPS}`,bx,ly-40*u,24*u,'#fff','left');kText('LAP',bx,ly-62*u,12*u,'#ffe23a','left');}
  // time (top right)
  if(mode!=='battle'){const t=k.finished?k.finishT:clock;kText(fmtT(t),v.x+v.w-pad,v.y+pad+10*u,16*u,'#fff','right');
   if(mode==='time'&&k.splits.length)k.splits.forEach((sp,n)=>kText(`LAP ${n+1}  ${fmtT(sp)}`,v.x+v.w-pad,v.y+pad+30*u+n*15*u,11*u,'#c9d4ff','right'));
   if(mode==='time'&&turn===1&&times[0]!=null)kText(`BEAT ${fmtT(times[0])}`,v.x+v.w-pad,v.y+pad+(30+k.splits.length*15+4)*u,12*u,PCOL[0],'right');}
  else{const left=Math.max(0,BATTLE_TIME-clock);kText(`${Math.floor(left/60)}:${String(Math.ceil(left)%60).padStart(2,'0')}`,v.x+v.w-pad,v.y+pad+10*u,18*u,'#fff','right');
   kText(`🎈 ${'●'.repeat(k.balloons)}${'○'.repeat(3-k.balloons)}`,v.x+v.w-pad,v.y+pad+34*u,14*u,'#ff8aa8','right');if(k.out)kText('OUT OF BALLOONS',v.x+v.w/2,v.y+v.h*.4,18*u,'#ff8aa8');}
  // place (bottom right)
  if(mode==='race'){const n=k.place,col=n===1?['#fff7a0','#ffd21c','#c88a00']:n===2?['#ffffff','#c8d0dc','#8a94a8']:n===3?['#ffe0c0','#e0904a','#9a5a20']:['#d8f0ff','#5ab4ff','#2a6ad0'];
   const sz=Math.min(64*u,v.w*.2),px=v.x+v.w-pad,py=v.y+v.h-pad;x.save();x.font=KFONT.replace('%s',Math.round(sz));x.textAlign='right';x.textBaseline='bottom';const sfxw=x.measureText(ord(n).slice(String(n).length)).width*.45;
   x.lineJoin='round';x.lineWidth=sz*.16;x.strokeStyle='#120a2e';const g=x.createLinearGradient(0,py-sz,0,py);g.addColorStop(0,col[0]);g.addColorStop(.55,col[1]);g.addColorStop(1,col[2]);
   x.strokeText(String(n),px-sfxw,py);x.fillStyle=g;x.fillText(String(n),px-sfxw,py);x.font=KFONT.replace('%s',Math.round(sz*.45));x.strokeText(ord(n).slice(String(n).length),px,py-sz*.1);x.fillText(ord(n).slice(String(n).length),px,py-sz*.1);x.restore();}
  // minimap
  if(tr&&v.w>240){const mw=Math.min(v.w*.26,130*u),b=tr.box,M=900,mh=mw*(b.y1-b.y0-2*M)/(b.x1-b.x0-2*M),mx=v.x+v.w-pad-mw,my=v.y+pad+(mode==='time'?(64+k.splits.length*15)*u:34*u),sc=mw/(b.x1-b.x0-2*M),mp=(wx,wy)=>[mx+(wx-b.x0-M)*sc,my+(wy-b.y0-M)*sc];
   x.save();x.globalAlpha=.85;x.lineJoin='round';x.strokeStyle='rgba(10,6,38,.65)';x.lineWidth=7*u;x.beginPath();tr.pts.forEach((p,j)=>{if(j%5)return;const [a,c1]=mp(p[0],p[1]);j?x.lineTo(a,c1):x.moveTo(a,c1);});x.closePath();x.stroke();x.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=3*u;x.stroke();
   for(const q of active().slice().sort((a,b)=>(a===k)-(b===k))){const [a,c1]=mp(q.x,q.y);x.fillStyle=q.human?PCOL[q.i]:q.cols[0];x.beginPath();x.arc(a,c1,(q===k?4.5:3)*u,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=1.2;x.stroke();}
   const gh=ghostAt();if(gh&&turn===1){const [a,c1]=mp(gh.x,gh.y);x.fillStyle='rgba(255,255,255,.7)';x.beginPath();x.arc(a,c1,3*u,0,7);x.fill();}x.restore();}
  // messages
  const m=msg[mode==='time'?0:i];if(m&&m.t>0)kText(m.text,v.x+v.w/2,v.y+v.h*.3,Math.min(34*u,v.w*.1),m.text==='FINISH!'?'#ffe23a':'#fff');
  if(k.wrong>1.2&&!k.finished&&(simT*3|0)%2)kText('WRONG WAY!',v.x+v.w/2,v.y+v.h*.42,Math.min(24*u,v.w*.08),'#ff5a5a');
  if(k.fall>.6&&!k.out)kText('LAKITU TO THE RESCUE',v.x+v.w/2,v.y+v.h*.45,Math.min(15*u,v.w*.06),'#fff');
  if(phase==='count'){const n=Math.floor(lights);drawLights(v.x+v.w/2,v.y+v.h*.2,u,n);}
  if(phase==='play'&&clock<1.2)kText('GO!',v.x+v.w/2,v.y+v.h*.3,Math.min(60*u,v.w*.2),'#3aff5a');
  if(clock<6&&(phase==='count'||phase==='play')){x.save();x.globalAlpha=clamp(1-(clock-3)/3,0,1)*.85;kText('◀ DRAG TO STEER ▶',v.x+v.w/2,v.y+v.h*.72,Math.min(13*u,v.w*.05),'#fff');kText(mode==='battle'?'TAP: USE ITEM':'TAP: USE ITEM · HOLD A TURN TO DRIFT',v.x+v.w/2,v.y+v.h*.72+18*u,Math.min(10*u,v.w*.035),'#ffe23a');x.restore();}
 }
 function drawLights(cx,cy,u,n){x.save();x.translate(cx,cy);x.scale(u,u);x.fillStyle='#fff';for(const [ox,oy,r] of [[-22,-40,14],[0,-44,17],[22,-40,14]]){x.beginPath();x.arc(ox,oy,r,0,7);x.fill();}
  x.fillStyle='#f6d33a';x.beginPath();x.ellipse(0,-58,10,12,0,0,7);x.fill();x.strokeStyle='#1a1030';x.lineWidth=1.5;x.stroke();x.fillStyle='#fff';x.beginPath();x.arc(-3.5,-61,3.5,0,7);x.arc(3.5,-61,3.5,0,7);x.fill();x.fillStyle='#000';x.fillRect(-3.5,-62,1.6,3);x.fillRect(3.5,-62,1.6,3);
  x.strokeStyle='#555';x.lineWidth=2;x.beginPath();x.moveTo(0,-30);x.lineTo(0,-10);x.stroke();rr(x,-16,-10,32,78,8);x.fillStyle='#22242c';x.fill();x.strokeStyle='#888';x.stroke();
  for(let j=0;j<3;j++){const on=n>j,go=n>=3;x.fillStyle=go?'#3aff5a':on?'#ff3a3a':'#4a1a1a';x.beginPath();x.arc(0,4+j*24,9,0,7);x.fill();if(on){x.fillStyle='rgba(255,255,255,.5)';x.beginPath();x.arc(-3,1+j*24,3,0,7);x.fill();}}x.restore();}
 function drawResults(){
  const W=s.W,H=s.H,a=Math.min(1,endT*2);x.save();x.globalAlpha=a;x.fillStyle='rgba(10,6,38,.72)';x.fillRect(0,0,W,H);
  const size=Math.min(W*.055,H*.07,40);kText(endText,W/2,H*.12,size,'#ffe23a');
  if(results){const rh=Math.min(H*.11,48),rw=Math.min(W*.8,520),x0=(W-rw)/2,y0=H*.2;results.forEach((r,n)=>{const y=y0+n*rh*1.05,hl=r.k.human;rr(x,x0,y,rw,rh,rh*.25);x.fillStyle=hl?(r.k.i===0?'rgba(74,163,255,.55)':'rgba(255,111,168,.55)'):'rgba(255,255,255,.12)';x.fill();
   kText(r.place,x0+rh*.7,y+rh/2,rh*.5,n===0?'#ffe23a':'#fff');drawHead(r.k,x0+rh*1.7,y+rh/2,rh*.85);kText(r.k.name.toUpperCase().slice(0,18),x0+rh*2.4,y+rh/2,rh*.36,'#fff','left');kText(r.time,x0+rw-rh*.3,y+rh/2,rh*.36,'#c9d4ff','right');});}
  x.restore();}

 // ---------------- turns (time trials), race flow, results
 let gi=0;const ghostAt=()=>{if(mode!=='time'||turn!==1||!ghost.length)return null;while(gi<ghost.length-1&&ghost[gi+1].t<=clock)gi++;const a=ghost[gi],b=ghost[Math.min(ghost.length-1,gi+1)];if(!a)return null;const f=b.t>a.t?clamp((clock-a.t)/(b.t-a.t),0,1):0;return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,h:a.h+wrap(b.h-a.h)*f,d:a.d};};
 async function beginTurn(i){
  phase='handoff';turn=i;for(const pd of pads)pd.f=null;press[0]=press[1]=0;
  const n0=s.players[0].name,C=COURSES[course];
  const desc=i===0?`Time trial on ${C.name}: three laps, three mushrooms, nobody else on the track. ${s.players[1].name} drives next against your ghost.`
   :`Beat ${n0}'s ${times[0]!=null?fmtT(times[0]):'run'} on ${C.name}. ${n0}'s ghost drives beside you.`;
  if(!await s.pass(i,desc,'Ready — start my countdown',{summary:i?`${n0}: ${times[0]!=null?fmtT(times[0]):'did not finish'}.`:null}))return;
  const k=K[i]=makeKart(i,0);k.item='triple';k.itemN=3;cams[i].set=false;clock=0;gi=0;lights=0;phase='count';for(const b of coins)b.t=0;peels.length=0;shells.length=0;
 }
 function endRace(){
  phase='end';endT=0;rankAll();
  if(mode==='race'){const [a,b]=[K[0],K[1]];winner=a.place<b.place?0:1;endText=`${s.players[winner].name.toUpperCase()} WINS THE ${COURSES[course].name.toUpperCase()} CUP!`;}
  else if(mode==='time'){const [ta,tb]=times;winner=ta!=null&&tb!=null?(Math.abs(ta-tb)<.005?-2:ta<tb?0:1):ta!=null?0:tb!=null?1:(Math.abs(K[0].best-K[1].best)<.01?-2:K[0].best>K[1].best?0:1);endText=winner===-2?'DEAD HEAT!':`${s.players[winner].name.toUpperCase()} SETS THE RECORD!`;}
  else{const a=K[0].balloons,b=K[1].balloons;winner=a===b?-2:a>b?0:1;endText=a===b?'DRAW!':`${s.players[winner].name.toUpperCase()} WINS THE BATTLE!`;}
  if(mode!=='battle'){const list=mode==='race'?active().slice().sort((a,b)=>a.place-b.place):[K[0],K[1]].slice().sort((a,b)=>(times[a.i]??1e9)-(times[b.i]??1e9));
   results=list.map((q,n)=>({k:q,place:ord(n+1),time:mode==='time'?(times[q.i]!=null?fmtT(times[q.i]):`LAP ${Math.min(LAPS,q.lap+1)}`):q.finished?fmtT(q.finishT):`LAP ${Math.min(LAPS,q.lap+1)}`}));}
  jingle([523,659,784,1047],{step:.1,type:'square',vol:.04});if(winner>=0)s.react(winner,'win');
 }
 function finishGame(){
  if(mode==='battle'){s.finish([K[0].balloons,K[1].balloons],`Balloon Battle: ${s.players[0].name} ${K[0].balloons} balloons left, ${s.players[1].name} ${K[1].balloons}.`);return;}
  const pct=q=>q.finished?100:Math.min(99,Math.round(clamp(q.best/LAPS,0,1)*100)),sc=[pct(K[0]),pct(K[1])];
  if(winner>=0){sc[winner]=100;sc[1-winner]=Math.min(sc[1-winner],99);}else sc[1]=sc[0];
  const C=COURSES[course];
  if(mode==='race')s.finish(sc,`${C.name}: ${s.players[0].name} ${ord(K[0].place)}${K[0].finished?' ('+fmtT(K[0].finishT)+')':''}, ${s.players[1].name} ${ord(K[1].place)}${K[1].finished?' ('+fmtT(K[1].finishT)+')':''}.`);
  else s.finish(sc,`${C.name} time trial: ${s.players[0].name} ${times[0]!=null?fmtT(times[0]):'no finish'}, ${s.players[1].name} ${times[1]!=null?fmtT(times[1]):'no finish'}.`);
 }

 s.debug={get phase(){return phase;},get clock(){return clock;},get turn(){return turn;},K,get tr(){return tr;},get course(){return course;},get tex(){return tex;},offs,auto,ghost,get results(){return results;},pick:id=>pickCourse(id),setClock(v){clock=v;},
  finishLap(i){const k=K[i];k.lap=LAPS-1;k.halfway=true;k.seg=(k.startSeg-14+tr.n)%tr.n;const p=tr.pts[k.seg],q=tr.pts[(k.seg+1)%tr.n];k.x=p[0];k.y=p[1];k.h=Math.atan2(q[1]-p[1],q[0]-p[0]);cams[i].set=false;}};

 // ---------------- main loop
 s.frame((dt0)=>{
  if(!s.alive)return;const dt=Math.min(dt0,.04);simT+=dt;for(const m of msg)if(m)m.t-=dt;
  if(phase==='select'){selT+=dt;if(selT>30)pickCourse(COURSE_IDS[Math.floor(s.random()*COURSE_IDS.length)]);drawSelect();return;}
  if(phase==='handoff'||!K.length){x.fillStyle='#0a0626';x.fillRect(0,0,s.W,s.H);return;}
  if(phase==='count'){const before=Math.floor(lights);lights+=dt*1.15;if(Math.floor(lights)!==before&&Math.floor(lights)<=3)sfx.light(Math.floor(lights)>=3);if(lights>=3.3){phase='play';clock=0;press[0]=press[1]=0;}}
  else if(phase==='play'||phase==='turn-end'||phase==='end'){
   if(phase==='play')clock+=dt;
   for(const k of active()){const inp=k.cpu?cpuInput(k):auto[k.i]?cpuInput(k):phase==='play'?humanInput(k.i):{steer:0,brake:0,use:0};if(auto[k.i]&&k.human)inp.use=k.item&&k.roll<=0?1:0;stepKart(k,dt,inp);}
   stepWorld(dt);fx.update(dt);if(mode!=='battle')rankAll();
   if(mode==='time'&&turn===0&&phase==='play'){const k=K[0];if(!ghost.length||clock-ghost[ghost.length-1].t>=1/30)ghost.push({t:clock,x:k.x,y:k.y,h:k.h,d:k.drift});}
   if(phase==='play'){
    if(mode==='race'){const [a,b]=[K[0],K[1]],one=a.finished?a:b.finished?b:null;if(a.finished&&b.finished||one&&clock>one.finishT+20||clock>=RACE_CAP)endRace();}
    else if(mode==='time'){const k=K[turn];if(k.finished||clock>=TIME_CAP||turn===1&&times[0]!=null&&clock>times[0]+15){times[turn]=k.finished?k.finishT:null;phase=turn===0?'turn-end':'end';endT=0;if(phase==='end')endRace();else turnText=times[0]!=null?fmtT(times[0]):'NO FINISH';}}
    else if(K.some(k=>k.out)||clock>=BATTLE_TIME)endRace();
   }else{endT+=dt;
    if(phase==='turn-end'&&endT>2.6)beginTurn(1);
    else if(phase==='end'&&endT>(mode==='battle'?3:5.5)){finishGame();return;}}
  }
  if(mode==='race')s.setScores([K[0],K[1]].map(q=>q.finished?100:Math.min(99,Math.round(clamp(q.best/LAPS,0,1)*100))));
  else if(mode==='time')s.setScores([0,1].map(i=>times[i]!=null?100:i===turn?Math.min(99,Math.round(clamp(K[i].best/LAPS,0,1)*100)):0));
  else s.setScores([K[0].balloons,K[1].balloons]);
  x.fillStyle='#000';x.fillRect(0,0,s.W,s.H);for(const v of views())drawView(v,dt);
  if(mode!=='time'){const hw=Math.floor(s.W/2);x.fillStyle='#120a2e';x.fillRect(hw-2,0,4,s.H);x.fillStyle='#ffe23a';x.fillRect(hw-.5,0,1,s.H);}
  if(phase==='turn-end'){const a=Math.min(1,endT*3),size=Math.min(s.W*.07,s.H*.08,48);x.save();x.globalAlpha=a;x.fillStyle='rgba(18,10,46,.6)';x.fillRect(0,s.H*.38,s.W,s.H*.24);kText(times[0]!=null?'FINISH!':'TIME UP',s.W/2,s.H/2-size*.35,size,'#ffe23a');kText(`${s.players[0].name.toUpperCase()}: ${turnText}`,s.W/2,s.H/2+size*.7,size*.5,'#fff');x.restore();}
  if(phase==='end')drawResults();
 });
}

// ------------------------------------------------------------------ sky panoramas and the battle arena floor
const PANOS=new Map();
function panorama(id){
 if(PANOS.has(id))return PANOS.get(id);const W=1024,H=256,cv=mkCanvas(W,H),g=cv.getContext('2d'),C=COURSES[id]||COURSES.rainbow,R=hashRand(id.length*31+7);
 const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,C.sky[0]);sky.addColorStop(.6,C.sky[1]);sky.addColorStop(1,C.sky[2]);g.fillStyle=sky;g.fillRect(0,0,W,H);
 const hills=(base,amp,col,freq,seed)=>{g.fillStyle=col;g.beginPath();g.moveTo(0,H);for(let px=0;px<=W;px+=8){const t=px/W*Math.PI*2;g.lineTo(px,H-base-amp*(.5+.5*Math.sin(t*freq+seed))*(.6+.4*Math.sin(t*freq*2.7+seed*2)));}g.lineTo(W,H);g.closePath();g.fill();};
 const cloud=(cx,cy,s0)=>{g.fillStyle='rgba(255,255,255,.92)';for(const [dx,dy,r] of [[-1.2,0,.7],[0,-.3,1],[1.1,0,.75],[.4,.2,.8],[-.5,.25,.7]]){g.beginPath();g.arc(cx+dx*s0,cy+dy*s0,r*s0,0,7);g.fill();}};
 if(id==='rainbow'){for(let k=0;k<220;k++){g.fillStyle=`rgba(255,255,255,${.3+R()*.7})`;const r=R()<.1?1.6:.8;g.fillRect(R()*W,R()*H*.95,r,r);}
  for(const [cx,cy,r,col] of [[180,90,40,'#7a5bd6'],[700,60,22,'#e0705a']]){const gr=g.createRadialGradient(cx-r*.3,cy-r*.3,r*.2,cx,cy,r);gr.addColorStop(0,'#fff');gr.addColorStop(.3,col);gr.addColorStop(1,'#1a0a40');g.fillStyle=gr;g.beginPath();g.arc(cx,cy,r,0,7);g.fill();}
  g.strokeStyle='rgba(201,180,255,.6)';g.lineWidth=4;g.beginPath();g.ellipse(180,90,70,12,-.2,0,7);g.stroke();
  for(let k=0;k<5;k++){const gr=g.createRadialGradient(R()*W,H*(.3+R()*.5),5,R()*W,H*.5,140);gr.addColorStop(0,`hsla(${R()*360},80%,60%,.18)`);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);}}
 else if(id==='bowser'){hills(30,110,'#3a0a08',3,1);hills(10,60,'#1a0404',5,2);g.fillStyle='rgba(255,90,20,.35)';for(let k=0;k<3;k++){const cx=150+k*340;g.beginPath();g.moveTo(cx-60,H-40);g.lineTo(cx,H-150);g.lineTo(cx+60,H-40);g.fill();g.fillStyle='rgba(255,150,40,.5)';g.fillRect(cx-6,H-150,12,30);g.fillStyle='rgba(255,90,20,.35)';}
  g.fillStyle='#120404';const cx0=560;g.fillRect(cx0-90,H-120,180,120);for(const [dx,w,h] of [[-110,40,160],[70,40,160],[-20,40,190]]){g.fillRect(cx0+dx,H-h,w,h);for(let b=0;b<3;b++)g.fillRect(cx0+dx+b*15,H-h-12,9,12);}g.fillStyle='#ff6a1a';g.fillRect(cx0-8,H-60,16,20);
  for(let k=0;k<60;k++){g.fillStyle=`rgba(255,${120+R()*100},40,${R()})`;g.fillRect(R()*W,R()*H,2,2);}}
 else if(id==='beach'){g.fillStyle='#fff7c0';g.beginPath();g.arc(820,60,30,0,7);g.fill();for(let k=0;k<6;k++)cloud(R()*W,30+R()*90,14+R()*14);
  g.fillStyle='#2f8fd8';g.fillRect(0,H-46,W,46);g.fillStyle='rgba(255,255,255,.45)';for(let k=0;k<40;k++)g.fillRect(R()*W,H-44+R()*40,10+R()*20,2);
  for(const ix of [200,620]){g.fillStyle='#3a9a4a';g.beginPath();g.ellipse(ix,H-46,90,26,0,Math.PI,0);g.fill();g.strokeStyle='#5a3a1a';g.lineWidth=4;g.beginPath();g.moveTo(ix,H-66);g.quadraticCurveTo(ix-6,H-100,ix+4,H-120);g.stroke();g.fillStyle='#2ea83a';for(let j=0;j<5;j++){g.save();g.translate(ix+4,H-120);g.rotate(-2.6+j*.95);g.beginPath();g.ellipse(18,0,20,5,.2,0,7);g.fill();g.restore();}}}
 else if(id==='jungle'){hills(40,120,'#4a7a9a',2,0);hills(20,90,'#2a6a3a',4,1);for(let k=0;k<40;k++){g.fillStyle=k%2?'#1a5a22':'#24702a';g.beginPath();g.arc(R()*W,H-10-R()*40,20+R()*30,0,7);g.fill();}g.fillStyle='#0e3a12';g.fillRect(0,H-12,W,12);for(let k=0;k<4;k++)cloud(R()*W,30+R()*50,12+R()*10);}
 else{for(let k=0;k<7;k++)cloud(R()*W,25+R()*80,14+R()*16);hills(40,70,'#7ac85a',2,0);hills(10,50,'#5cb83c',3,1.5);
  for(const bx of [300,760]){g.fillStyle='#b8282c';g.fillRect(bx,H-70,50,40);g.beginPath();g.moveTo(bx-6,H-70);g.lineTo(bx+25,H-92);g.lineTo(bx+56,H-70);g.fill();}
  g.strokeStyle='#eee';g.lineWidth=3;g.beginPath();g.moveTo(560,H-30);g.lineTo(560,H-100);g.stroke();g.save();g.translate(560,H-100);for(let j=0;j<4;j++){g.rotate(Math.PI/2);g.fillStyle='#ddd';g.fillRect(0,-4,34,8);}g.restore();}
 PANOS.set(id,cv);return cv;
}
function arenaTexture(){
 const R=ARENA_R+40,cv=mkCanvas(R*2*TS,R*2*TS),g=cv.getContext('2d');g.scale(TS,TS);g.translate(R,R);
 const rings=['#ff3b3b','#ff9c2a','#ffe23b','#4cd964','#3aa7ff','#5b4bff','#b45bff'];for(let j=0;j<7;j++){g.fillStyle=rings[j];g.beginPath();g.arc(0,0,ARENA_R-j*(ARENA_R/7.4),0,7);g.fill();}
 g.fillStyle='rgba(255,255,255,.18)';for(let a=0;a<24;a++){g.beginPath();g.moveTo(0,0);g.arc(0,0,ARENA_R,a*Math.PI/12,a*Math.PI/12+.05);g.fill();}
 g.strokeStyle='#fff';g.lineWidth=12;g.beginPath();g.arc(0,0,ARENA_R-4,0,7);g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(0,0,40,0,7);g.fill();
 return {cv,x0:-R,y0:-R,w:R*2,h:R*2};
}

Object.assign(exports,{kartMode7,buildTrack,COURSES,kartFrames});
