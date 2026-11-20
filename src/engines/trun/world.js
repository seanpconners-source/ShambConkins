// Temple Run (Boulder Run revamp): the 3D world of stage 1 (jungle temple). Each straight of the course is built once
// in its own local frame (x = runner's right, y up, z = forward along the straight) and drawn with a placement matrix,
// so geometry never depends on which way the path turned. Materials: stone (path), cliff (walls under the path and
// ruins), wood (logs, roots, trunks), leaf (canopies), gold (coins), rock (the boulder). Textures are painted on
// canvases here (no downloads). The path sits on a wall high over a misty canyon (height fog in the renderer).
const {seededRandom}=require("src/utils.js");
const T=require("src/engines/trun/track.js");
const {placeY}=require("src/engines/trun/render.js");

// ---------------------------------------------------------------- textures
function cv(n){const c=document.createElement('canvas');c.width=c.height=n;return [c,c.getContext('2d')];}
function noiseFill(g,n,r,base,amp,blob=3){const im=g.getImageData(0,0,n,n),d=im.data;for(let i=0;i<d.length;i+=4){const k=(r()-.5)*amp;d[i]=Math.max(0,Math.min(255,d[i]+k));d[i+1]=Math.max(0,Math.min(255,d[i+1]+k));d[i+2]=Math.max(0,Math.min(255,d[i+2]+k));}g.putImageData(im,0,0);void base;void blob;}
function blotch(g,n,r,count,col,rmin,rmax,alpha){for(let i=0;i<count;i++){const x=r()*n,y=r()*n,rad=rmin+r()*(rmax-rmin);const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,col.replace('A',alpha));gr.addColorStop(1,col.replace('A',0));g.fillStyle=gr;
 for(const ox of [-n,0,n])for(const oy of [-n,0,n]){g.save();g.translate(ox,oy);g.beginPath();g.arc(x,y,rad,0,7);g.fill();g.restore();}}}
function stoneTex(seed,pal=[138,122,98],bg='#8a7a62',moss=.32){const n=512,[c,g]=cv(n),r=seededRandom(seed);
 g.fillStyle=bg;g.fillRect(0,0,n,n);
 // big flagstones in rows, each its own tint, with a dark mortar line and a chipped bevel
 const rows=4;for(let y=0;y<rows;y++){const h=n/rows;let x=-(r()*n/3);while(x<n){const w=n/3*(.6+r()*.7);
   const t=(r()-.5)*28,base=[pal[0]+t,pal[1]+t,pal[2]+t*.8];g.fillStyle=`rgb(${base.map(v=>v|0)})`;
   for(const ox of [0,n])g.fillRect(x+ox+3,y*h+3,w-6,h-6);
   const gr=g.createLinearGradient(0,y*h,0,y*h+h);gr.addColorStop(0,'rgba(255,240,210,.18)');gr.addColorStop(.12,'rgba(255,240,210,0)');gr.addColorStop(.85,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.28)');g.fillStyle=gr;for(const ox of [0,n])g.fillRect(x+ox+3,y*h+3,w-6,h-6);
   x+=w;}}
 blotch(g,n,r,40,'rgba(60,52,40,A)',8,40,.35);if(moss)blotch(g,n,r,18,'rgba(70,110,50,A)',10,50,moss);blotch(g,n,r,30,'rgba(200,185,150,A)',4,18,.25);
 // cracks
 g.strokeStyle='rgba(40,32,24,.55)';g.lineWidth=1.4;for(let i=0;i<14;i++){let x=r()*n,y=r()*n;g.beginPath();g.moveTo(x,y);for(let k=0;k<5;k++){x+=(r()-.5)*40;y+=(r()-.5)*40;g.lineTo(x,y);}g.stroke();}
 noiseFill(g,n,r,0,22);return c;}
function cliffTex(seed,pal=[104,92,74],bg='#6d5f4c',moss=.4){const n=512,[c,g]=cv(n),r=seededRandom(seed);
 g.fillStyle=bg;g.fillRect(0,0,n,n);
 // rough stacked blocks, darker and mossier than the path
 for(let y=0;y<8;y++){let x=-(r()*80);const h=n/8;while(x<n){const w=50+r()*90,t=(r()-.5)*30;g.fillStyle=`rgb(${(pal[0]+t)|0},${(pal[1]+t)|0},${(pal[2]+t*.8)|0})`;for(const ox of [0,n])g.fillRect(x+ox+2,y*h+2,w-4,h-4);x+=w;}}
 if(moss)blotch(g,n,r,50,'rgba(55,95,40,A)',10,60,moss);blotch(g,n,r,40,'rgba(30,26,20,A)',10,50,.35);
 g.strokeStyle='rgba(60,110,45,.6)';g.lineWidth=3;for(let i=0;i<(moss?10:0);i++){let x=r()*n,y=0;g.beginPath();g.moveTo(x,y);while(y<n){y+=20;x+=(r()-.5)*14;g.lineTo(x,y);}g.stroke();}
 noiseFill(g,n,r,0,26);return c;}
function woodTex(seed){const n=256,[c,g]=cv(n),r=seededRandom(seed);g.fillStyle='#5a3d24';g.fillRect(0,0,n,n);
 for(let i=0;i<70;i++){const x=r()*n,w=1+r()*4,t=(r()-.5)*40;g.fillStyle=`rgba(${(80+t)|0},${(56+t)|0},${(34+t*.6)|0},.8)`;g.fillRect(x,0,w,n);}
 blotch(g,n,r,12,'rgba(70,100,45,A)',8,30,.35);noiseFill(g,n,r,0,20);return c;}
function leafTex(seed,pal=[50,100,40]){const n=256,[c,g]=cv(n),r=seededRandom(seed);g.fillStyle=`rgb(${pal[0]*.9|0},${pal[1]*.85|0},${pal[2]*.85|0})`;g.fillRect(0,0,n,n);
 for(let i=0;i<500;i++){const x=r()*n,y=r()*n,s=3+r()*9,t=(r()-.5)*60;g.fillStyle=`rgba(${(pal[0]+t*.5)|0},${(pal[1]+t)|0},${(pal[2]+t*.4)|0},.85)`;g.beginPath();g.ellipse(x,y,s,s*.5,r()*3,0,7);g.fill();}
 noiseFill(g,n,r,0,18);return c;}
function goldTex(){const n=128,[c,g]=cv(n);const gr=g.createLinearGradient(0,0,n,n);gr.addColorStop(0,'#fff3a0');gr.addColorStop(.45,'#f2b630');gr.addColorStop(1,'#a8661a');g.fillStyle=gr;g.fillRect(0,0,n,n);
 g.strokeStyle='rgba(120,70,10,.7)';g.lineWidth=6;g.beginPath();g.arc(n/2,n/2,n*.33,0,7);g.stroke();g.fillStyle='rgba(255,250,200,.6)';g.font='bold 52px serif';g.textAlign='center';g.textBaseline='middle';g.fillText('★',n/2,n/2+2);return c;}
function rockTex(seed){const n=512,[c,g]=cv(n),r=seededRandom(seed);g.fillStyle='#7d7062';g.fillRect(0,0,n,n);
 blotch(g,n,r,90,'rgba(50,44,38,A)',10,60,.4);blotch(g,n,r,60,'rgba(170,155,135,A)',8,40,.3);blotch(g,n,r,20,'rgba(80,100,60,A)',10,40,.25);
 g.strokeStyle='rgba(30,26,22,.7)';g.lineWidth=2.5;for(let i=0;i<22;i++){let x=r()*n,y=r()*n;g.beginPath();g.moveTo(x,y);for(let k=0;k<6;k++){x+=(r()-.5)*60;y+=(r()-.5)*60;g.lineTo(x,y);}g.stroke();}
 noiseFill(g,n,r,0,30);return c;}
function plankTex(seed){const n=256,[c,g]=cv(n),r=seededRandom(seed);g.fillStyle='#4a321e';g.fillRect(0,0,n,n);
 // boards run across the path (bands along v), each its own tint, with nail heads and dark gaps
 for(let y=0;y<n;y+=32){const t=(r()-.5)*36;g.fillStyle=`rgb(${(104+t)|0},${(74+t)|0},${(46+t*.6)|0})`;g.fillRect(0,y+2,n,28);
  for(let i=0;i<30;i++){g.fillStyle=`rgba(${(70+t)|0},${(48+t)|0},${(28+t)|0},.5)`;g.fillRect(0,y+2+r()*28,n,1+r()*2);}
  g.fillStyle='rgba(30,24,20,.9)';for(const x of [20,n-20])g.fillRect(x+(r()-.5)*8,y+12,4,4);}
 noiseFill(g,n,r,0,18);return c;}
function metalTex(seed){const n=128,[c,g]=cv(n),r=seededRandom(seed);const gr=g.createLinearGradient(0,0,0,n);gr.addColorStop(0,'#8f9296');gr.addColorStop(1,'#4a4c50');g.fillStyle=gr;g.fillRect(0,0,n,n);
 blotch(g,n,r,20,'rgba(120,70,40,A)',4,20,.45);noiseFill(g,n,r,0,24);return c;}
function glyphTex(seed){const [c,g]=[stoneTex(seed,[178,148,98],'#a8875a',0),null];const x=c.getContext('2d'),n=c.width,r=seededRandom(seed+'g');
 // rows of carved hieroglyphs (our own simple signs: eye, ankh, bird, wave, reed, sun disc)
 x.strokeStyle='rgba(70,46,22,.75)';x.fillStyle='rgba(70,46,22,.6)';x.lineWidth=3;
 for(let row=0;row<4;row++)for(let col=0;col<8;col++){const cx=32+col*64,cy=64+row*128,k=Math.floor(r()*6);x.beginPath();
  if(k===0){x.ellipse(cx,cy,18,9,0,0,7);x.moveTo(cx+4,cy);x.arc(cx,cy,5,0,7);x.moveTo(cx-6,cy+9);x.lineTo(cx-12,cy+22);}
  else if(k===1){x.arc(cx,cy-12,8,0,7);x.moveTo(cx,cy-4);x.lineTo(cx,cy+24);x.moveTo(cx-12,cy+2);x.lineTo(cx+12,cy+2);}
  else if(k===2){x.moveTo(cx-14,cy+16);x.quadraticCurveTo(cx-4,cy-14,cx+12,cy-16);x.lineTo(cx+18,cy-10);x.moveTo(cx-4,cy+2);x.lineTo(cx+10,cy+16);}
  else if(k===3){for(let w=0;w<3;w++){x.moveTo(cx-16,cy-8+w*8);for(let q=0;q<4;q++)x.lineTo(cx-12+q*8,cy-8+w*8+(q%2?-4:4));}}
  else if(k===4){x.moveTo(cx,cy+22);x.lineTo(cx,cy-18);x.quadraticCurveTo(cx+14,cy-14,cx+4,cy-4);}
  else{x.arc(cx,cy,13,0,7);x.moveTo(cx-20,cy+18);x.lineTo(cx+20,cy+18);}
  x.stroke();}
 x.fillStyle='rgba(60,40,20,.35)';for(const y of [0,128,256,384])x.fillRect(0,y,n,6);return c;}
function sandTex(seed){const n=256,[c,g]=cv(n),r=seededRandom(seed);g.fillStyle='#c9a46a';g.fillRect(0,0,n,n);
 for(let y=0;y<n;y+=6){g.strokeStyle=`rgba(${120+r()*30|0},${90+r()*20|0},50,.25)`;g.lineWidth=2;g.beginPath();g.moveTo(0,y);for(let x=0;x<=n;x+=16)g.lineTo(x,y+Math.sin(x*.05+y*.3)*3);g.stroke();}
 noiseFill(g,n,r,0,16);return c;}
function lavaTex(seed){const n=256,[c,g]=cv(n),r=seededRandom(seed);g.fillStyle='#5a1006';g.fillRect(0,0,n,n);
 blotch(g,n,r,40,'rgba(255,120,20,A)',8,40,.75);blotch(g,n,r,30,'rgba(255,220,90,A)',3,14,.8);blotch(g,n,r,30,'rgba(40,6,2,A)',10,50,.6);return c;}
function waterTex(seed){const n=128,[c,g]=cv(n),r=seededRandom(seed);g.fillStyle='rgba(150,200,230,.85)';g.fillRect(0,0,n,n);
 for(let i=0;i<60;i++){g.fillStyle=`rgba(255,255,255,${.2+r()*.5})`;g.fillRect(r()*n,0,1+r()*3,n);}return c;}
function snakeTex(seed){const n=256,[c,g]=cv(n),r=seededRandom(seed);g.fillStyle='#4a5a22';g.fillRect(0,0,n,n);
 // diamond back pattern, banded belly colours
 for(let y=0;y<n;y+=32)for(let x=0;x<n;x+=32){g.fillStyle=(x/32+y/32)%2?'#2e3a14':'#6b7a2c';g.beginPath();g.moveTo(x+16,y);g.lineTo(x+32,y+16);g.lineTo(x+16,y+32);g.lineTo(x,y+16);g.fill();}
 g.fillStyle='rgba(210,190,110,.8)';for(let x=0;x<n;x+=64)g.fillRect(x,0,10,n);
 for(let i=0;i<900;i++){g.fillStyle=`rgba(0,0,0,${r()*.25})`;g.beginPath();g.arc(r()*n,r()*n,2+r()*3,0,7);g.fill();}return c;}
function signTex(text,bg,ink){const W=512,H=128,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 g.fillStyle=bg;g.fillRect(0,0,W,H);g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=8;g.strokeRect(6,6,W-12,H-12);
 g.font='900 64px Impact, "Arial Black", sans-serif';g.textAlign='center';g.textBaseline='middle';
 g.fillStyle='rgba(0,0,0,.45)';g.fillText(text,W/2+3,H/2+4);g.fillStyle=ink;g.fillText(text,W/2,H/2);return c;}
function flameTex(){const n=128,[c,g]=cv(n);const gr=g.createRadialGradient(n/2,n*.7,4,n/2,n*.55,n*.5);gr.addColorStop(0,'rgba(255,255,220,1)');gr.addColorStop(.25,'rgba(255,200,60,.95)');gr.addColorStop(.6,'rgba(255,90,20,.6)');gr.addColorStop(1,'rgba(200,30,0,0)');g.fillStyle=gr;g.fillRect(0,0,n,n);return c;}

// ---------------------------------------------------------------- mesh builder (smooth or flat, uv in metres)
function MB(){const P=[],N=[],U=[],Cc=[],I=[];
 const B={P,N,U,Cc,I,
  v(p,n,uv,col=[255,255,255]){P.push(p[0],p[1],p[2]);N.push(n[0],n[1],n[2]);U.push(uv[0],uv[1]);Cc.push(col[0],col[1],col[2],255);return P.length/3-1;},
  quad(a,b,c,d,n,uva,uvb,uvc,uvd,col){const i=B.v(a,n,uva,col);B.v(b,n,uvb,col);B.v(c,n,uvc,col);B.v(d,n,uvd,col);I.push(i,i+1,i+2,i,i+2,i+3);},
  // axis box [x0,x1]x[y0,y1]x[z0,z1]; uv = world metres / tile; faces: skip set
  box(x0,x1,y0,y1,z0,z1,tile=2,col,skip={}){const t=1/tile;
   if(!skip.top)B.quad([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[0,1,0],[x0*t,z0*t],[x0*t,z1*t],[x1*t,z1*t],[x1*t,z0*t],col);
   if(!skip.bottom)B.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],[x0*t,z0*t],[x1*t,z0*t],[x1*t,z1*t],[x0*t,z1*t],col);
   if(!skip.right)B.quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],[1,0,0],[z0*t,y0*t],[z0*t,y1*t],[z1*t,y1*t],[z1*t,y0*t],col);
   if(!skip.left)B.quad([x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0],[-1,0,0],[z1*t,y0*t],[z1*t,y1*t],[z0*t,y1*t],[z0*t,y0*t],col);
   if(!skip.front)B.quad([x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[x0,y0,z1],[0,0,1],[x1*t,y0*t],[x1*t,y1*t],[x0*t,y1*t],[x0*t,y0*t],col);
   if(!skip.back)B.quad([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],[0,0,-1],[x0*t,y0*t],[x0*t,y1*t],[x1*t,y1*t],[x1*t,y0*t],col);},
  // cylinder along axis from p0 to p1 (radius r0->r1), seg sides, smooth normals, uv u around, v along (metres/tile)
  tube(p0,p1,r0,r1,seg=10,tile=1,col,caps=true){const ax=[p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]],L=Math.hypot(...ax)||1,d=ax.map(v=>v/L);
   const up=Math.abs(d[1])<.9?[0,1,0]:[1,0,0];let a=cross(d,up);a=nrm(a);const b=cross(d,a);const base=P.length/3;
   for(let i=0;i<=seg;i++){const t=i/seg*Math.PI*2,c=Math.cos(t),s=Math.sin(t),n=[a[0]*c+b[0]*s,a[1]*c+b[1]*s,a[2]*c+b[2]*s];
    B.v([p0[0]+n[0]*r0,p0[1]+n[1]*r0,p0[2]+n[2]*r0],n,[i/seg*2,0],col);B.v([p1[0]+n[0]*r1,p1[1]+n[1]*r1,p1[2]+n[2]*r1],n,[i/seg*2,L/tile],col);}
   for(let i=0;i<seg;i++){const k=base+i*2;I.push(k,k+2,k+1,k+1,k+2,k+3);}
   if(caps)for(const [p,r,sg] of [[p0,r0,-1],[p1,r1,1]]){const c0=B.v(p,d.map(v=>v*sg),[.5,.5],col);const first=P.length/3;
    for(let i=0;i<=seg;i++){const t=i/seg*Math.PI*2,c=Math.cos(t),s=Math.sin(t),n=[a[0]*c+b[0]*s,a[1]*c+b[1]*s,a[2]*c+b[2]*s];B.v([p[0]+n[0]*r,p[1]+n[1]*r,p[2]+n[2]*r],d.map(v=>v*sg),[.5+c*.5,.5+s*.5],col);}
    for(let i=0;i<seg;i++)if(sg>0)I.push(c0,first+i,first+i+1);else I.push(c0,first+i+1,first+i);}},
  // lumpy sphere (canopies, boulders)
  blob(c,r,seg=12,tile=1,col,lump=0,rnd=Math.random,sy=1){const base=P.length/3,st=Math.ceil(seg/2),bump=[];for(let i=0;i<=st;i++){bump[i]=[];for(let k=0;k<=seg;k++)bump[i][k]=k===seg?bump[i][0]:1+(rnd()-.5)*lump;}
   for(let i=0;i<=st;i++){const th=i/st*Math.PI;for(let k=0;k<=seg;k++){const ph=k/seg*Math.PI*2,n=[Math.sin(th)*Math.cos(ph),Math.cos(th),Math.sin(th)*Math.sin(ph)],rr=r*(i===0||i===st?1:bump[i][k]);
     B.v([c[0]+n[0]*rr,c[1]+n[1]*rr*sy,c[2]+n[2]*rr],n,[k/seg*3*r/tile,i/st*1.5*r/tile],col);}}
   for(let i=0;i<st;i++)for(let k=0;k<seg;k++){const a=base+i*(seg+1)+k,b=a+seg+1;I.push(a,b,a+1,a+1,b,b+1);}},
  out(){return {pos:new Float32Array(P),nrm:new Float32Array(N),uv:new Float32Array(U),col:new Uint8Array(Cc),idx:P.length/3>65535?new Uint32Array(I):new Uint16Array(I)};},
  empty(){return I.length===0;}};
 return B;}
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};

// ---------------------------------------------------------------- one straight + its corner, in local space
const H=T.HALF,CW=T.CORNER,DEPTH=7;
// CC0 scenery models (tools/trun/build-props.py), set once by the engine: PROPS={models,vb Float32 (pos3 nrm3 uv2),ib Uint32}
let PROPS=null;const setProps=P=>{PROPS=P;};
const has=n=>!!(PROPS&&PROPS.models[n]);
// a model into the straight's per-texture buckets ('p:<tex>' or 'p:<tex>|c' for cut-out leaves), placed at x,y,z turned yaw, scaled s
function prop(M,name,x,y,z,yaw=0,s=1){const m=PROPS&&PROPS.models[name];if(!m)return false;const vb=PROPS.vb,ib=PROPS.ib,c=Math.cos(yaw),n=Math.sin(yaw);
 for(const g of m.groups){const key='p:'+g.tex+(g.cut?'|c':''),B=M[key]||(M[key]=MB());
  if(g.v0==null){let lo=1e9,hi=-1;for(let i=g.first;i<g.first+g.count;i++){const v=ib[i];if(v<lo)lo=v;if(v>hi)hi=v;}g.v0=lo;g.v1=hi;}
  const base=B.P.length/3;
  for(let v=g.v0;v<=g.v1;v++){const o=v*8,px=vb[o],py=vb[o+1],pz=vb[o+2],nx=vb[o+3],nz=vb[o+5];
   B.P.push(x+(px*c+pz*n)*s,y+py*s,z+(-px*n+pz*c)*s);B.N.push(nx*c+nz*n,vb[o+4],-nx*n+nz*c);B.U.push(vb[o+6],vb[o+7]);B.Cc.push(255,255,255,255);}
  for(let i=g.first;i<g.first+g.count;i++)B.I.push(ib[i]-g.v0+base);}
 return true;}
const pick=(r,list)=>list[Math.floor(r()*list.length)];
const TREES=['CommonTree_1','CommonTree_2','CommonTree_3','CommonTree_4','CommonTree_5'],PINES=['Pine_1','Pine_2','Pine_3'],
 PLANTS=['Bush_Common','Bush_Common_Flowers','Fern_1','Plant_1_Big','Flower_3_Group','Flower_4_Group','Grass_Common_Tall'],ROCKS=['Rock_Medium_1','Rock_Medium_2','Rock_Medium_3'];
// a tree on its own rock pillar rising out of the depths beside the path (so nothing floats)
function treeOnRock(M,r,x,z,list,s){const top=-1.5-r()*3;M.cliff.box(x-1.1,x+1.1,-16,top,z-1.1,z+1.1,2.5);prop(M,pick(r,list),x,top,z,r()*6.28,s);
 if(r()<.6)prop(M,pick(r,PLANTS),x+(r()-.5)*1.2,top,z+(r()-.5)*1.2,r()*6.28,.9+r()*.4);}
// a ledge beside the path with props on it (mines, tomb, catacombs): kept outside the path edge
function ledge(M,r,side,z,len,mat,list){const x0=side*(H+.25),x1=side*(H+1.9);M[mat].box(Math.min(x0,x1),Math.max(x0,x1),-.6,-.05,z,z+len,1.4);
 for(let zz=z+.5;zz<z+len-.4;zz+=.9+r()*.8){const n=pick(r,list);prop(M,n,side*(H+1.05+(r()-.5)*.4),-.05,zz,r()*6.28,1+r()*.25);}}
// a seated jackal statue (Well of Souls guardians): plinth, body, head with snout and ears; side turns it toward the path
function jackal(M,x,z,side,k=1){const S=v=>v*k;M.sstone.box(x-S(.6),x+S(.6),-1,S(.5),z-S(.6),z+S(.6),1);M.cave.box(x-S(.42),x+S(.42),S(.5),S(1.7),z-S(.38),z+S(.38),1,[60,56,52]);
 M.cave.box(x-S(.28),x+S(.28),S(1.7),S(2.15),z-S(.3),z+S(.3),1,[60,56,52]);const fx=side?-side:0,fz=side?0:-1;
 M.cave.box(x+fx*S(.3)-S(.14),x+fx*S(.3)+S(.14),S(1.8),S(2.0),z+fz*S(.3)-S(.14),z+fz*S(.3)+S(.14),1,[60,56,52]);
 for(const e of [-1,1]){const ex=side?0:e*S(.16),ez=side?e*S(.16):0;M.cave.box(x+ex-S(.06),x+ex+S(.06),S(2.15),S(2.5),z+ez-S(.06),z+ez+S(.06),1,[60,56,52]);}
 M.glyph.box(x-S(.44),x+S(.44),S(1.35),S(1.62),z-S(.4),z+S(.4),1,[240,200,90]);}
// new zones borrow an older zone's obstacle and edge styles, then add their own deck, scenery and gate
const BASE={temple:'temple',jungle:'valley',mines:'mines',catacombs:'temple',tomb:'tomb',bridge:'valley',valley:'valley'};
function skull(M,x,y,z,s=1){M.stone.blob([x,y,z],.16*s,6,1,[226,214,190],.08,Math.random,1.05);M.cave.box(x-.09*s,x-.02*s,y-.02*s,y+.05*s,z+.12*s,z+.15*s,1,[20,16,12]);M.cave.box(x+.02*s,x+.09*s,y-.02*s,y+.05*s,z+.12*s,z+.15*s,1,[20,16,12]);}
function buildStraight(seg,corner=true){const r=seededRandom('w:'+seg.k+':'+seg.len),Z0=T.ZONES[seg.zone||0].id,Z=BASE[Z0]||Z0;
 const M={stone:MB(),cliff:MB(),wood:MB(),leaf:MB(),plank:MB(),metal:MB(),sstone:MB(),glyph:MB(),sand:MB(),cave:MB(),glow:MB(),sign:MB(),fern:MB()};
 const L=seg.len,zEnd=L+(corner?CW:0);
 const deckM={temple:'stone',mines:'plank',tomb:'sstone',valley:'plank'}[Z],stoneM=Z==='tomb'?'sstone':Z==='mines'?'cave':'stone',rockM=Z==='tomb'?'glyph':Z==='mines'?'cave':'cliff';
 const open=side=>corner&&(seg.turn==='T'||side===(seg.turn==='L'?-1:1));
 // deck pieces between gaps
 const gaps=seg.obs.filter(o=>o.kind==='gap').map(o=>[o.at,o.at+o.len]);
 let z=0;const spans=[];for(const [g0,g1] of gaps){if(g0>z)spans.push([z,g0]);z=g1;}spans.push([z,zEnd]);
 for(const [z0,z1] of spans){
  if(Z0==='jungle'){M.sand.box(-H,H,-.45,0,z0,z1,2,[120,92,64],{bottom:true});M.cliff.box(-H-.15,H+.15,-DEPTH,-.45,z0,z1,3,[90,100,70],{top:true,bottom:true});
   for(const sx of [-1,1])for(let zz=z0+.3;zz<z1-.2;zz+=.9+r()*.6)if(!(zz>L-.5&&open(sx)))M.fern.blob([sx*(H+.22),.05,zz],.2+r()*.15,7,1,undefined,.4,r,.6);}
  else if(Z==='temple'||Z==='tomb'){M[deckM].box(-H,H,-.45,0,z0,z1,2.4,undefined,{bottom:true});M[Z==='tomb'?'glyph':'cliff'].box(-H-.15,H+.15,-DEPTH,-.45,z0,z1,3,undefined,{top:true,bottom:true});}
  else{// wooden deck: planks on beams, trestle legs into the depths
   M.plank.box(-H,H,-.22,0,z0,z1,1.6,undefined,{bottom:true});
   for(const sx of [-1,1])M.wood.box(sx*(H-.12)-.14,sx*(H-.12)+.14,-.6,-.22,z0,z1,1.2);
   if(Z0!=='bridge')for(let zz=z0+.6;zz<z1-.3;zz+=Z==='mines'?3.2:4.2)for(const sx of [-1,1]){const x=sx*(H-.3);M.wood.tube([x,-.5,zz],[x+sx*(Z==='valley'?1.2:.4),Z==='valley'?-30:-16,zz],.16,.2,6,1.5,undefined,false);}
   if(Z0==='bridge')for(const sx of [-1,1]){M.wood.tube([sx*(H+.02),.05,z0],[sx*(H+.02),.05,z1],.05,.05,5,1,[190,160,110],false);M.wood.tube([sx*(H+.05),-.12,z0],[sx*(H+.05),-.12,z1],.04,.04,5,1,[190,160,110],false);}
   if(Z==='mines')for(let l=0;l<3;l++)for(const o of [-.32,.32]){const x=(l-1)*T.LANE+o;M.metal.box(x-.035,x+.035,0,.07,z0,z1,1);}}}
 // broken pieces hanging at gap edges
 for(const [g0,g1] of gaps){for(const zz of [g0,g1])for(let i=0;i<3;i++){const x=-H+.4+r()*(2*H-.8);M[deckM].box(x-.25,x+.25,-.7-r()*.4,-.15,zz-.25,zz+.25,1);}}
 // edges: parapet stones / rope rails
 for(const side of [-1,1]){
  if(Z==='temple'||Z==='tomb'){let zz=.4;while(zz<zEnd-.3){if(r()>.12&&!gaps.some(([a,b])=>zz>a-.6&&zz<b+.6)&&!(zz>L-.2&&open(side))){
     const w=.7+r()*.5,h=.28+r()*.22,x=side*(H-.17);M[stoneM].box(x-.17,x+.17,0,h,zz,zz+w,1.2);}zz+=1.0+r()*.9;}}
  else if(Z==='valley'){const x=side*(H-.08),posts=[];for(let zz=.5;zz<(open(side)?L-.3:zEnd-.2);zz+=2.4)if(!gaps.some(([a,b])=>zz>a-.3&&zz<b+.3))posts.push(zz);
   for(let i=0;i<posts.length;i++){const zz=posts[i];M.wood.tube([x,0,zz],[x,1.05,zz],.07,.06,6,1);if(i&&posts[i]-posts[i-1]<2.6)M.wood.tube([x,.98,posts[i-1]],[x,.9,zz],.03,.03,5,1,[200,175,120],false);}}}
 // corner closing wall
 if(corner){const zc=L+CW;
  if(Z==='valley'){for(let x=-H+.1;x<=H;x+=1.1)M.wood.tube([x,0,zc-.1],[x,1.05,zc-.1],.07,.06,6,1);M.wood.tube([-H,.95,zc-.1],[H,.95,zc-.1],.03,.03,5,1,[200,175,120],false);}
  else if(Z==='mines'){M.wood.box(-H,H,0,.55,zc-.4,zc-.1,1);M.wood.box(-H+.1,-H+.4,0,1.2,zc-.45,zc-.05,1);M.wood.box(H-.4,H-.1,0,1.2,zc-.45,zc-.05,1);}
  else{for(let x=-H+.2;x<H-.2;x+=.9){if(r()>.15)M[stoneM].box(x,x+.7,0,.3+r()*.2,zc-.34,zc,1.2);}
   if(seg.turn==='L'){for(let zz=L+.2;zz<zc-.3;zz+=.9)M[stoneM].box(H-.34,H,0,.35,zz,zz+.7,1.2);}
   if(seg.turn==='R'){for(let zz=L+.2;zz<zc-.3;zz+=.9)M[stoneM].box(-H,-H+.34,0,.35,zz,zz+.7,1.2);}}}
 // the temple the boulder bursts out of, behind the start line
 if(seg.k===0){M.stone.box(-H,H,-.45,0,-12,0,2.4,undefined,{bottom:true});M.cliff.box(-H-.15,H+.15,-DEPTH,-.45,-12,0,3,undefined,{top:true,bottom:true});
  const zf=-1.6,D=2.75;// facade plane, doorway half width
  M.cliff.box(-9,-D,-DEPTH,8,zf-1.4,zf,2.5);M.cliff.box(D,9,-DEPTH,8,zf-1.4,zf,2.5);M.cliff.box(-D,D,5.4,8,zf-1.4,zf,2.5);
  M.stone.box(-D-.5,-D,0,5.4,zf-.2,zf+.25,1.4);M.stone.box(D,D+.5,0,5.4,zf-.2,zf+.25,1.4);M.stone.box(-D-.6,D+.6,5.4,6.1,zf-.25,zf+.35,1.4);
  for(let i=0;i<4;i++){const w=8.5-i*1.8,y=8+i*1.3;M.cliff.box(-w,w,y,y+1.3,zf-1.4-i*.6,zf-i*.6,2.5);}
  M.cliff.box(-D-.6,-D,0,5.4,-12,zf-1.4,2,[70,62,52]);M.cliff.box(D,D+.6,0,5.4,-12,zf-1.4,2,[70,62,52]);M.cliff.box(-D,D,5.4,6,-12,zf-1.4,2,[60,54,46]);
  M.cliff.box(-D,D,0,5.4,-12.4,-12,2,[25,22,18]);
  for(const sx of [-1,1])M.stone.box(sx*(D+1.2)-.5,sx*(D+1.2)+.5,0,1.1,zf+.4,zf+1.4,1);}
 // zone gate: a big entrance you run through at the start of the zone's first straight (kept above the camera)
 if(seg.gate){const zg=6;
  if(Z==='mines'){for(const sx of [-1,1]){M.wood.box(sx*(H+.6)-.35,sx*(H+.6)+.35,-1,9.6,zg-.35,zg+.35,1.6);M.cave.box(sx*(H+1)-1.4,sx*(H+1)+1.4,-1,10.5,zg+.4,zg+3,3);}
   M.wood.box(-H-1.3,H+1.3,9.2,10,zg-.4,zg+.4,1.6);M.sign.quad([-2.6,9.25,zg-.42],[2.6,9.25,zg-.42],[2.6,10.55,zg-.42],[-2.6,10.55,zg-.42],[0,0,-1],[1,1],[0,1],[0,0],[1,0]);
   for(const sx of [-1,1])M.glow.box(sx*(H+1.4)-.16,sx*(H+1.4)+.16,6.2,6.6,zg-.6,zg-.3,1);}
  else if(Z==='tomb'){for(const sx of [-1,1]){M.glyph.box(sx*(H+1.4)-1.1,sx*(H+1.4)+1.1,-2,10.5,zg-1,zg+1,2.5);M.sstone.box(sx*(H+1.4)-1.3,sx*(H+1.4)+1.3,10.5,11.1,zg-1.2,zg+1.2,2);}
   M.sstone.box(-H-2.6,H+2.6,9.6,10.8,zg-.9,zg+.9,2);M.sign.quad([-2.6,9.7,zg-.92],[2.6,9.7,zg-.92],[2.6,10.7,zg-.92],[-2.6,10.7,zg-.92],[0,0,-1],[1,1],[0,1],[0,0],[1,0]);
   for(const sx of [-1,1])jackal(M,sx*(H+3.8),zg,sx);}
  else if(Z0==='jungle'){// Hovitos totems: carved posts topped with skulls, a rope of bones between
   for(const sx of [-1,1]){const x=sx*(H+.9);M.wood.tube([x,-1,zg],[x,9.6,zg],.45,.38,8,2,[150,110,70]);for(let i=0;i<4;i++)M.cave.box(x-.5,x+.5,1.6+i*2,2.1+i*2,zg-.5,zg+.5,1,[160,60,40]);skull(M,x,10,zg-.1,2.6);}
   M.wood.tube([-H-.9,9.4,zg],[H+.9,9.4,zg],.12,.12,6,1,[190,160,110]);M.sign.quad([-2.6,8,zg-.42],[2.6,8,zg-.42],[2.6,9.2,zg-.42],[-2.6,9.2,zg-.42],[0,0,-1],[1,1],[0,1],[0,0],[1,0]);}
  else if(Z0==='catacombs'){// a vault entrance lined with skulls
   for(const sx of [-1,1]){M.stone.box(sx*(H+1.1)-.9,sx*(H+1.1)+.9,-2,10,zg-.8,zg+.8,2,[120,120,132]);for(let i=0;i<6;i++)skull(M,sx*(H+.2),2.4+i*1.2,zg-.85,1.3);}
   M.stone.box(-H-2,H+2,9.2,10.6,zg-.8,zg+.8,2,[120,120,132]);M.sign.quad([-2.6,9.3,zg-.82],[2.6,9.3,zg-.82],[2.6,10.5,zg-.82],[-2.6,10.5,zg-.82],[0,0,-1],[1,1],[0,1],[0,0],[1,0]);
   for(const sx of [-1,1])M.glow.box(sx*(H+.35)-.12,sx*(H+.35)+.12,6.4,6.8,zg-.9,zg-.7,1);}
  else if(Z0==='bridge'){// the cliff-top posts the bridge hangs from, Kali's red stone and a glowing Sankara stone
   for(const sx of [-1,1]){M.cliff.box(sx*(H+1.3)-1,sx*(H+1.3)+1,-12,9.8,zg-1,zg+1,2.5,[150,80,60]);M.glow.blob([sx*(H+1.3),10.4,zg],.45,10,1,[255,240,200],0,r);}
   M.cliff.box(-H-2.3,H+2.3,9.2,10,zg-.9,zg+.9,2.5,[150,80,60]);M.sign.quad([-2.6,8.0,zg-.92],[2.6,8.0,zg-.92],[2.6,9.15,zg-.92],[-2.6,9.15,zg-.92],[0,0,-1],[1,1],[0,1],[0,0],[1,0]);}
  else if(Z==='valley'){for(const sx of [-1,1]){M.wood.tube([sx*(H+.7),-1,zg],[sx*(H+.7),10.4,zg],.38,.32,8,2);for(let i=0;i<4;i++)M.wood.box(sx*(H+.7)-.5,sx*(H+.7)+.5,2+i*2.1,2.6+i*2.1,zg-.45,zg+.45,1);}
   M.wood.tube([-H-1.4,9.7,zg],[H+1.4,9.9,zg],.3,.3,8,2);M.sign.quad([-2.6,8.2,zg-.32],[2.6,8.2,zg-.32],[2.6,9.4,zg-.32],[-2.6,9.4,zg-.32],[0,0,-1],[1,1],[0,1],[0,0],[1,0]);
   for(const sx of [-1,1])M.leaf.blob([sx*(H+.7),10.6,zg],1.5,10,2,undefined,.3,r,.6);}
  else{for(const sx of [-1,1])M.cliff.box(sx*(H+1.2)-1,sx*(H+1.2)+1,-2,10,zg-1,zg+1,2.5);M.cliff.box(-H-2.2,H+2.2,9.2,10.6,zg-1,zg+1,2.5);
   M.sign.quad([-2.6,9.3,zg-1.02],[2.6,9.3,zg-1.02],[2.6,10.5,zg-1.02],[-2.6,10.5,zg-1.02],[0,0,-1],[1,1],[0,1],[0,0],[1,0]);}}
 // obstacles
 for(const o of seg.obs){const a=o.at;
  if(o.kind==='log'){
   if(Z==='mines'){M.wood.box(-H-.3,H+.3,0,.36,a-.25,a+.25,1);M.wood.box(-H-.1,H+.1,.36,.7,a-.2,a+.2,1);M.wood.box(-H+.4,-H+.75,0,.9,a-.3,a+.3,1);}
   else if(Z==='tomb'){M.sstone.tube([-H-.5,.42,a],[H+.5,.42,a],.42,.42,12,1.2);for(const x of [-H-.5,H+.5])M.sstone.box(x-.2,x+.2,0,.95,a-.5,a+.5,1);}
   else{M.wood.tube([-H-.6,.45,a],[H+.6,.48,a],.42,.38,12,1.2);for(let i=0;i<3;i++){const x=-1+r()*2;M.wood.tube([x,.7,a],[x+(r()-.5)*.6,1.25,a+(r()-.5)*.4],.08,.04,6,.6);}
    if(Z==='valley')for(let i=0;i<3;i++)M.fern.blob([-1.2+r()*2.4,.8,a+(r()-.5)*.4],.35+r()*.2,8,1,undefined,.3,r,.6);}}
  else if(o.kind==='root'){
   if(Z==='mines'){for(let i=0;i<7;i++){const x=-H+.25+i*(2*H-.5)/6;M.cave.blob([x,.1,a+(r()-.5)*.3],.22+r()*.12,7,1,undefined,.4,r,.9);}}
   else if(Z==='tomb'){for(let i=0;i<6;i++){const x=-H+.3+i*(2*H-.6)/5;M.sstone.box(x-.25,x+.25,0,.22+r()*.12,a-.2,a+.2,1);}}
   else{let px=-H-.3,py=.12;for(let i=0;i<6;i++){const nx=px+(2*H+.6)/6,ny=.1+r()*.28;M.wood.tube([px,py,a+(r()-.5)*.2],[nx,ny,a+(r()-.5)*.2],.14,.12,8,.8);px=nx;py=ny;}}}
  else if(o.kind==='arch'){
   if(Z==='mines'){for(const side of [-1,1])M.wood.box(side*(H+.05)-.2,side*(H+.05)+.2,0,2,a-.2,a+.2,1);M.wood.box(-H-.3,H+.3,1.22,1.62,a-.24,a+.24,1);M.glow.box(-.15,.15,1.0,1.22,a-.15,a+.15,1);}
   else if(Z==='valley'){M.wood.tube([-H-1.4,1.42,a],[H+1.4,1.5,a+.3],.24,.18,10,1);for(let i=0;i<5;i++)M.leaf.blob([-H+r()*2*H,1.65+r()*.3,a+(r()-.5)*.6],.45+r()*.3,8,1,undefined,.35,r,.7);}
   else{const sm=Z==='tomb'?'sstone':'stone';for(const side of [-1,1])M[sm].box(side*(H+.05)-.32,side*(H+.05)+.32,0,2.3,a-.38,a+.38,1.6);
    M[sm].box(-H-.4,H+.4,1.2,1.78,a-.32,a+.32,1.6);M[sm].box(-H-.5,H+.5,1.78,1.98,a-.42,a+.42,1.6);
    M[Z==='tomb'?'glyph':'cliff'].box(-.45,.45,1.28,1.72,a+.32,a+.38,1);}}
  else if(o.kind==='fire'){
   if(Z==='mines'){for(const side of [-1,1])M.metal.tube([side*(H-.05),0,a],[side*(H-.05),1.45,a],.16,.16,8,1);}
   else{const sm=Z==='tomb'?'sstone':'stone';for(const side of [-1,1]){M[sm].box(side*(H+.15)-.3,side*(H+.15)+.3,0,1.5,a-.35,a+.35,1.2);M[Z==='tomb'?'glyph':'cliff'].box(side*(H+.15)-.36,side*(H+.15)+.36,1.5,1.62,a-.4,a+.4,1);}}}
  else if(o.kind==='blades'){// stone frame; the blades themselves spin (drawTraps)
   for(const side of [-1,1]){M.stone.box(side*(H+.05)-.3,side*(H+.05)+.3,0,2.2,a-.3,a+.3,1.4,[130,125,118]);M.metal.tube([side*(H-.25),1.4,a],[side*(H+.1),1.4,a],.07,.07,6,1);}
   M.stone.box(-H-.4,H+.4,2.2,2.55,a-.35,a+.35,1.4,[130,125,118]);}
  else if(o.kind==='darts'){// two carved walls full of dart holes; the darts fly (drawTraps)
   for(const side of [-1,1]){M.cliff.box(side*(H+.12)-.25,side*(H+.12)+.25,0,2.4,a-.9,a+.9,1.4);for(let i=0;i<4;i++)M.cave.box(side*(H-.14)-.03,side*(H-.14)+.03,1.15+i*.18,1.23+i*.18,a-.6+i*.35,a-.5+i*.35,1,[15,12,10]);}}
  else if(o.kind==='spikes'){// a bed of spikes across the path
   M.cave.box(-H,H,-.02,.06,a-.4,a+.4,1,[50,44,40]);for(let i=0;i<9;i++)for(let k=0;k<3;k++){const x=-H+.2+i*(2*H-.4)/8,zz=a-.28+k*.28;M.metal.tube([x,.05,zz],[x+(r()-.5)*.05,.5+r()*.08,zz],.07,.005,5,1,[200,200,205],false);}}
  else if(o.kind==='web'){// cobweb from post to post above chest height, its tarantula in the middle
   const C=[0,1.75],sp=[];for(let i=0;i<12;i++){const ang=i/12*Math.PI*2,R0=[Math.cos(ang)*2.05,Math.sin(ang)*.85];if(C[1]+R0[1]<1.12)R0[1]=1.12-C[1];sp.push([C[0]+R0[0],C[1]+R0[1]]);M.glow.tube([C[0],C[1],a],[C[0]+R0[0],C[1]+R0[1],a],.012,.012,4,1,[230,230,225],false);}
   for(let ring=1;ring<=4;ring++){const f=ring/4.4;for(let i=0;i<12;i++){const p0=sp[i],p1=sp[(i+1)%12];M.glow.tube([C[0]+(p0[0]-C[0])*f,C[1]+(p0[1]-C[1])*f,a],[C[0]+(p1[0]-C[0])*f,C[1]+(p1[1]-C[1])*f,a],.008,.008,3,1,[220,220,215],false);}}
   for(const side of [-1,1])M.wood.tube([side*(H+.1),0,a],[side*(H+.1),2.9,a],.1,.08,6,1);
   M.cave.blob([.3,1.95,a-.04],.16,8,1,[40,30,24],.2,r,.8);M.cave.blob([.3,2.12,a-.04],.1,7,1,[60,40,28],.2,r);for(let i=0;i<4;i++)for(const sx of [-1,1])M.cave.tube([.3,1.95,a-.05],[.3+sx*(.22+i*.02),1.95+(i-1.5)*.1,a-.08],.018,.012,3,1,[40,30,24],false);}
  else if(o.kind==='block'){for(const l of o.lanes){const x=(l-1)*T.LANE,kind=r();
    if(Z==='mines'){if(kind<.55){// a derailed ore cart
      M.metal.box(x-.42,x+.42,.3,1.3,a-.6,a+.6,1,undefined,{top:true});M.cave.blob([x,1.2,a],.36,8,1,undefined,.3,r,.7);
      for(const wz of [-.4,.4])for(const sx of [-1,1])M.metal.tube([x+sx*.42,.25,a+wz],[x+sx*.52,.25,a+wz],.22,.22,10,1);}
     else if(PROPS){prop(M,'Crate_Wooden',x,0,a,r()*.3,1.15);prop(M,r()<.5?'Crate_Metal':'Barrel',x,1.05,a,r()*6.28,.95);}
     else{M.wood.box(x-.5,x+.5,0,1,a-.5,a+.5,1);M.wood.box(x-.42,x+.38,1,1.75,a-.4,a+.4,1);}}
    else if(Z==='tomb'){if(kind<.5){M.sstone.box(x-.5,x+.5,0,.95,a-.7,a+.7,1);M.glyph.box(x-.52,x+.52,.95,1.25,a-.72,a+.72,1,[230,190,90]);}
     else jackal(M,x,a,0,.62);}
    else if(Z==='valley'){M.cliff.blob([x,.7,a],.56,10,1.5,[150,160,130],.18,r,1.25);if(kind<.4)M.stone.blob([x+.1,1.45,a],.3,8,1,[230,225,210],.2,r,.8);}
    else if(kind<.5){M.stone.box(x-.5,x+.5,0,1.6,a-.5,a+.5,1.4);M.stone.box(x-.42,x+.42,1.6,2.3,a-.42,a+.42,1.2);M.cliff.box(x-.55,x+.55,2.3,2.45,a-.55,a+.55,1);}
    else{M.stone.box(x-.55,x+.55,0,.9,a-.55,a+.55,1.2);M.stone.box(x-.4,x+.45,.9,1.6,a-.4,a+.3,1.2);M.stone.box(x-.3,x+.25,1.6,2.1,a-.3,a+.2,1.1);}}}}
 // scenery beside the path
 for(const side of [-1,1]){let zz=4+r()*6;while(zz<zEnd){const k=r(),dx=side*(H+2.6+r()*7);if(zz>L-6&&open(side)){zz+=3+r()*4;continue;}if(zz>L+1){zz+=4;continue;}
   if(PROPS&&(Z0==='jungle'||Z0==='temple')&&k<.3){treeOnRock(M,r,dx+side*1.5,zz,r()<.15&&Z0==='jungle'?['TwistedTree_1','TwistedTree_2']:TREES,Z0==='jungle'?1.5+r()*.5:1.3+r()*.4);}
   else if(PROPS&&Z==='valley'&&Z0==='valley'&&k<.3){treeOnRock(M,r,dx+side*1.5,zz,r()<.6?PINES:TREES,1.6+r()*.6);}
   else if(PROPS&&Z0==='valley'&&k<.55){const top=-1-r()*2;M.cliff.box(dx-1.6,dx+1.6,-18,top,zz-1.6,zz+1.6,2.5);prop(M,pick(r,ROCKS),dx,top,zz,r()*6.28,.8+r()*.5);prop(M,pick(r,PLANTS),dx+.8,top,zz-.6,r()*6.28,1);}
   else if(PROPS&&Z0==='mines'&&k<.3&&zz<L-12){ledge(M,r,side,zz,3+r()*3,'plank',['Barrel','Crate_Wooden','Crate_Metal','Bucket_Wooden_1','Anvil','Pickaxe_Bronze','Barrel_Holder']);if(r()<.6)prop(M,'Lantern_Wall',side*(H+1.95),.9,zz+1.2,side>0?-Math.PI/2:Math.PI/2,1.2);}
   else if(PROPS&&Z0==='tomb'&&k<.25&&zz<L-12){ledge(M,r,side,zz,3+r()*2,'sstone',['Vase_2','Vase_4','Vase_Rubble_Medium','Chest_Wood','Cauldron']);}
   else if(PROPS&&Z0==='catacombs'&&k<.25&&zz<L-12){ledge(M,r,side,zz,3+r()*2,'stone',['Barrel','Vase_2','Vase_4','Vase_Rubble_Medium','Crate_Wooden','Chest_Wood']);prop(M,r()<.5?'Banner_1':'Banner_2',side*(H+2.2),0,zz+1,side>0?-Math.PI/2:Math.PI/2,1.2);}
   else if(Z0==='jungle'){
    if(k<.55){const top=5+r()*8,base=-20;M.wood.tube([dx,base,zz],[dx+(r()-.5),top,zz+(r()-.5)],.55+r()*.3,.3,8,2,undefined,false);
     for(let i=0;i<4;i++)M.leaf.blob([dx+(r()-.5)*2.6,top+(r()-.3)*1.8,zz+(r()-.5)*2.6],1.7+r()*1.8,10,2,[90,150,80],.35,r,.7);
     for(let i=0;i<2;i++){const vx=dx-side*(r()*1.8);M.leaf.tube([vx,top,zz+i],[vx,top-3-r()*4,zz+i+.3],.06,.04,5,.5,[110,190,100],false);}}
    else if(k<.8){for(let i=0;i<6;i++){const a2=r()*Math.PI*2;M.fern.tube([dx,-.5,zz],[dx+Math.cos(a2)*1.8,.9+r(),zz+Math.sin(a2)*1.8],.2,.04,5,1,undefined,false);}}
    else if(zz<zEnd-3){const x=side*(H+2.2);M.wood.tube([x,-1,zz],[x,2.6,zz],.16,.14,6,1,[150,110,70]);skull(M,x,2.85,zz,1.3);}}
   else if(Z0==='catacombs'){// tall walls of skull niches, coffins, torches; the path runs between them
    const x=side*(H+1.6+r()*1.2);
    if(k<.6&&zz<zEnd-3){const len=2.5+r()*2;M.stone.box(x-.4,x+.4,-6,5.5+r()*2,zz,zz+len,2,[110,112,124]);
     for(let i=0;i<Math.floor(len/.8);i++)for(let row=0;row<2;row++)skull(M,x-side*.42,1.3+row*1.1,zz+.35+i*.8+(row?.4:0),1);
     if(r()<.5){M.wood.tube([x-side*.45,2.6,zz+len/2],[x-side*.8,3,zz+len/2],.05,.05,5,1);M.glow.box(x-side*.85-.11,x-side*.85+.11,3,3.3,zz+len/2-.11,zz+len/2+.11,1);}
     else if(PROPS&&r()<.35)prop(M,'CandleStick_Triple',x-side*.3,0,zz+len/2,side>0?-Math.PI/2:Math.PI/2,2.2);}
    else if(k<.8){M.wood.box(x-.45,x+.45,-.2,.6,zz,zz+2,1,[90,62,40]);M.wood.box(x-.5,x+.5,.6,.75,zz-.05,zz+2.05,1,[70,48,30]);}
    else{M.stone.tube([x,-6,zz],[x,6,zz],.5,.45,8,2,undefined,false);}}
   else if(Z0==='bridge'){// nothing beside a rope bridge but air: far cliffs (below), the odd crocodile rock and birds' perches
    if(k<.15){const x=side*(H+8+r()*10);M.cliff.blob([x,-40+r()*6,zz],2+r()*2,8,2,[110,100,80],.4,r,1.4);}}
   else if(Z==='temple'){
    if(k<.55){const top=4+r()*7,base=-14;M.wood.tube([dx,base,zz],[dx+(r()-.5),top,zz+(r()-.5)],.5+r()*.3,.28,8,2,undefined,false);
     for(let i=0;i<3;i++)M.leaf.blob([dx+(r()-.5)*2.2,top+(r()-.3)*1.6,zz+(r()-.5)*2.2],1.6+r()*1.6,10,2,undefined,.35,r,.7);
     if(r()<.5){const vx=dx-side*(r()*1.5);M.leaf.tube([vx,top,zz],[vx,top-3-r()*3,zz+.3],.06,.04,5,.5,[120,200,110],false);}}
    else if(k<.8){const h=1+r()*5;M.cliff.box(dx-.6,dx+.6,-10,h,zz-.6,zz+.6,2);if(r()<.6)M.stone.box(dx-.75,dx+.75,h,h+.35,zz-.75,zz+.75,1.4);}
    else if(k<.9&&zz<zEnd-6){M.cliff.box(dx-.4,dx+.4,-10,1.2+r()*1.5,zz,zz+5,3);}}
   else if(Z==='mines'){
    if(k<.5){const h=-2+r()*9,b=-17;M.cave.tube([dx,b,zz],[dx+(r()-.5),h,zz],.9+r()*.8,.15,7,3,undefined,false);}
    else if(k<.75){const h=6+r()*6;M.cave.tube([dx,14,zz],[dx+(r()-.5),h,zz],1+r()*.6,.12,7,3,undefined,false);}
    else if(zz<zEnd-4){// timber frame with a lantern beside the track
     const x=side*(H+1.9);M.wood.box(x-.17,x+.17,-.4,3.4,zz-.17,zz+.17,1);M.wood.box(x-.17-side*.5,x+.17,3.1,3.35,zz-.17,zz+.17,1);M.glow.box(x-side*.45-.11,x-side*.45+.11,2.2,2.55,zz-.11,zz+.11,1);}}
   else if(Z==='tomb'){
    if(k<.5){const x=side*(H+2.4+r()*3),h=5+r()*4;M.sstone.tube([x,-12,zz],[x,h,zz],.85,.75,10,2.5,undefined,false);M.sstone.box(x-1.05,x+1.05,h,h+.5,zz-1.05,zz+1.05,1.5);
     if(r()<.6){M.wood.tube([x-side*.85,2.4,zz],[x-side*1.2,2.9,zz],.06,.06,5,1);M.glow.box(x-side*1.25-.12,x-side*1.25+.12,2.9,3.2,zz-.12,zz+.12,1);}}
    else if(k<.7)jackal(M,side*(H+3+r()*3),zz,side,1.5+r()*.6);
    else if(zz<zEnd-6)M.glyph.box(dx-.5,dx+.5,-12,2+r()*3,zz,zz+5,2.5);}
   else{// valley: giant trees, ferns, dinosaur bones
    if(k<.5){const top=6+r()*9,base=-30;M.wood.tube([dx,base,zz],[dx+(r()-.5)*1.5,top,zz+(r()-.5)],.7+r()*.5,.35,9,2.5,undefined,false);
     for(let i=0;i<4;i++)M.fern.blob([dx+(r()-.5)*3,top+(r()-.3)*2,zz+(r()-.5)*3],1.8+r()*2,10,2,undefined,.4,r,.6);}
    else if(k<.8){const y=-1.5+r()*1.5;for(let i=0;i<5;i++){const a2=r()*Math.PI*2;M.fern.tube([dx,y,zz],[dx+Math.cos(a2)*1.6,y+1+r(),zz+Math.sin(a2)*1.6],.18,.04,5,1,undefined,false);}}
    else if(zz<zEnd-5){const x=side*(H+2.8);for(let i=0;i<5;i++)M.stone.tube([x,-1,zz+i*.7],[x-side*.9,1.4+Math.sin(i)*.3,zz+i*.7+.3],.07,.05,5,1,[225,218,200],false);}}
   zz+=(Z0==='catacombs'?1.5+r()*3:3+r()*7);}}
 // rope bridge: sheer cliff walls on both sides of the gorge, with waterfalls; jungle: a far canopy wall
 if(Z0==='bridge')for(const side of [-1,1])for(let zz=r()*6;zz<L;zz+=5+r()*7){const x=side*(7+r()*16),top=-4-r()*6;// rock spires rising out of the gorge, all below the deck
  M.cliff.tube([x,-52,zz],[x+(r()-.5)*2,top,zz+(r()-.5)*2],2.2+r()*1.6,.8+r()*.6,8,4,[140,110,90],true);if(r()<.5)M.fern.blob([x,top+.3,zz],1.2+r(),8,2,undefined,.4,r,.5);}
 const out={};for(const [k,b] of Object.entries(M))if(b&&!b.empty())out[k]=b.out();
 // coins (positions only; drawn spinning)
 out.coins=seg.coins.map(c=>({c,x:(c.lane-1)*T.LANE,y:c.y,z:c.at}));
 out.pows=(seg.pows||[]).map(q=>({c:q,x:(q.lane-1)*T.LANE,y:q.y,z:q.at,kind:q.kind}));
 out.fires=seg.obs.filter(o=>o.kind==='fire').map(o=>o.at);
 out.traps=seg.obs.filter(o=>o.kind==='blades'||o.kind==='darts').map(o=>({kind:o.kind,at:o.at}));
 return out;}

// ---------------------------------------------------------------- world: textures, segment cache, drawing
function makeWorld(R,course){
 // textures are made once per renderer (both the run and the spectator view share them)
 const tex=R._trunTex||(R._trunTex={stone:R.texture(stoneTex('stone'),{repeat:true}),cliff:R.texture(cliffTex('cliff'),{repeat:true}),wood:R.texture(woodTex('wood'),{repeat:true}),
  leaf:R.texture(leafTex('leaf'),{repeat:true}),gold:R.texture(goldTex()),rock:R.texture(rockTex('rock'),{repeat:true}),flame:R.texture(flameTex(),{mips:false}),
  plank:R.texture(plankTex('plank'),{repeat:true}),metal:R.texture(metalTex('metal'),{repeat:true}),sstone:R.texture(stoneTex('sstone',[196,164,112],'#b8935e',0),{repeat:true}),
  glyph:R.texture(glyphTex('glyph'),{repeat:true}),sand:R.texture(sandTex('sand'),{repeat:true}),cave:R.texture(cliffTex('cave',[78,66,58],'#4a3e36',0),{repeat:true}),
  glow:R.texture((()=>{const [c,g]=cv(8);g.fillStyle='#fff';g.fillRect(0,0,8,8);return c;})()),lava:R.texture(lavaTex('lava'),{repeat:true}),water:R.texture(waterTex('water'),{repeat:true}),snake:R.texture(snakeTex('snake'),{repeat:true}),
  fern:R.texture(leafTex('fern',[60,140,40]),{repeat:true}),
  signs:{temple:R.texture(signTex('THE TEMPLE','#6d5f4c','#ffd36a')),mines:R.texture(signTex('PANKOT MINES','#5a3d24','#ffcf8a')),
   tomb:R.texture(signTex('WELL OF SOULS','#b8935e','#4a2a10')),valley:R.texture(signTex('LOST VALLEY','#4a3a22','#d8ffb0')),
   jungle:R.texture(signTex('HOVITOS JUNGLE','#5a3a20','#ffd08a')),catacombs:R.texture(signTex('VENICE CATACOMBS','#5a5a66','#f0e6c8')),bridge:R.texture(signTex('ROPE BRIDGE','#7a3020','#ffe08a'))}});
 if(PROPS&&PROPS.surf&&!tex._surf){tex._surf=1;if(PROPS.surf.cliff){tex.cliffOld=tex.cliff;tex.cliff=PROPS.surf.cliff;}if(PROPS.surf.wood)tex.wood=PROPS.surf.wood;}// the CC0 rock / bark surfaces
 const UNLIT={glow:1,lava:1,water:1};
 const DRAWN=['stone','cliff','wood','leaf','plank','metal','sstone','glyph','sand','cave','fern','glow'];
 const cache=new Map();
 // a straight, built once, in local space; the T-junction arms are previews of the next straight both ways
 function geo(seg){let g=cache.get(seg);if(!g){const b=buildStraight(seg);g={};for(const [k,v] of Object.entries(b)){if(k==='coins'||k==='fires'||k==='pows'||k==='traps')g[k]=v;else g[k]=R.mesh(v);}g.pkeys=Object.keys(g).filter(k=>k.startsWith('p:'));cache.set(seg,g);}return g;}
 // coin + flame meshes
 const coinMesh=(()=>{const b=MB();b.tube([0,0,-.05],[0,0,.05],.32,.32,18,1,undefined,true);return R.mesh(b.out());})();
 const flameMesh=(()=>{const n=[0,0,1],b=MB();b.quad([-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[-.5,.5,0],n,[0,1],[1,1],[1,0],[0,0]);return R.mesh(b.out());})();
 const shieldMesh=(()=>{const b=MB();b.blob([0,1,0],1.15,18,1,undefined,0,Math.random,1.05);return R.mesh(b.out());})();
 const cartMesh=R._cart||(R._cart=(()=>{const b=MB();b.box(-1.15,1.15,.55,1.9,-1.45,1.45,1,[150,140,130],{top:true});b.box(-1.0,1.0,.6,1.85,-1.3,1.3,1,[60,55,50],{top:true,bottom:true});
  for(const y of [1.9,1.2])b.box(-1.2,1.2,y-.08,y+.04,-1.5,1.5,1,[110,90,70],{top:false});b.box(-.18,.18,.2,.6,-1.6,1.6,1,[90,80,70]);return R.mesh(b.out());})());
 const cartOre=R._cartOre||(R._cartOre=(()=>{const b=MB(),r=seededRandom('ore');for(let i=0;i<9;i++)b.blob([(r()-.5)*1.4,1.75+r()*.25,(r()-.5)*2],.32+r()*.18,7,1,i%3?[150,120,90]:[230,190,80],.4,r);return R.mesh(b.out());})());
 const cartWheel=R._cartWheel||(R._cartWheel=(()=>{const b=MB();b.tube([-1.25,0,0],[1.25,0,0],.12,.12,6,1);for(const sx of [-1,1])b.tube([sx*1.18,0,0],[sx*1.32,0,0],.42,.42,12,1);return R.mesh(b.out());})());
 const bladeMesh=R._blade||(R._blade=(()=>{const b=MB();b.tube([0,0,-.02],[0,0,.02],.5,.5,20,1,undefined,true);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;b.box(Math.cos(a)*.5-.06,Math.cos(a)*.5+.06,Math.sin(a)*.5-.06,Math.sin(a)*.5+.06,-.015,.015,1);}b.tube([0,0,-.08],[0,0,.08],.08,.08,8,1);return R.mesh(b.out());})());
 const dartMesh=R._dart||(R._dart=(()=>{const b=MB();b.tube([-.2,0,0],[.2,0,0],.015,.015,5,1,[200,180,140]);b.tube([.2,0,0],[.3,0,0],.02,.002,5,1,[60,60,60]);b.box(-.24,-.16,-.04,.04,-.003,.003,1,[200,40,30]);return R.mesh(b.out());})());
 // the golden idol (Raiders' opening): squat seated figure, big head
 const idolMesh=R._idol||(R._idol=(()=>{const b=MB();b.box(-.22,.22,0,.12,-.18,.18,1);b.blob([0,.32,0],.2,10,1,undefined,0,Math.random,1.1);b.blob([0,.66,.02],.19,10,1,undefined,0,Math.random,1.15);
  b.box(-.08,.08,.58,.66,.17,.22,1,[120,80,30]);for(const sx of [-1,1])b.blob([sx*.2,.62,0],.06,6,1);return R.mesh(b.out());})());
 const boulderMesh=(()=>{const b=MB();b.blob([0,0,0],2.3,22,1.5,undefined,.12,seededRandom('boulder'));return R.mesh(b.out());})();
 // far floor below the path, one per zone: jungle canopy, lava, sand, valley grass with a river
 const plane=(y,rep,col)=>{const b=MB(),S=400;b.quad([-S,y,-S],[-S,y,S],[S,y,S],[S,y,-S],[0,1,0],[0,0],[0,rep],[rep,rep],[rep,0],col);return R.mesh(b.out());};
 const FLOORS=R._trunFloors||(R._trunFloors={temple:{mesh:plane(-24,40,[90,120,70]),tex:'leaf'},mines:{mesh:plane(-15,60,[255,255,255]),tex:'lava',unlit:1,tint:[1.1,.8,.6,1]},
  tomb:{mesh:plane(-13,90,[220,200,170]),tex:'sand'},valley:{mesh:plane(-30,50,[120,170,90]),tex:'fern'},
  jungle:{mesh:plane(-24,40,[80,130,70]),tex:'leaf'},catacombs:{mesh:plane(-3.5,120,[255,255,255]),tex:'water',unlit:1,tint:[.18,.22,.26,1]},bridge:{mesh:plane(-52,80,[255,255,255]),tex:'water',unlit:1,tint:[.45,.6,.55,1]}});
 const GLOW={temple:[1.6,1.3,.8,1],mines:[2.2,1.4,.6,1],tomb:[2.2,1.5,.7,1],valley:[1,1.1,1.2,1],jungle:[1.1,1.15,1.1,1],catacombs:[2.3,1.4,.6,1],bridge:[2,1.6,.9,1]};
 // per-zone tint of the borrowed materials (catacomb stone cold and grey, jungle stone mossy)
 const ZT={catacombs:{stone:[.72,.74,.84,1],cliff:[.6,.62,.7,1]},jungle:{stone:[.8,.95,.72,1],cliff:[.8,.9,.7,1]},bridge:{cliff:[1.05,.85,.75,1]}};
 const W={tex,
  // the straights to draw: from the runner's straight on, following the course; T-junctions show both arms
  visible(seg,ahead=3){const out=[];const prev=seg.k>0&&course.segs[seg.k-1];if(prev&&prev.next===seg)out.push(prev);let s=seg,depth=0;
   while(s&&depth<=ahead){out.push(s);if(s.turn==='T'){if(s.next)s=s.next;else{for(const side of ['L','R'])out.push(peek(s,side));break;}}
    else s=s.next||course.follow(s,s.turn);depth++;}
   return out;},
  draw(segs,t,eyeXZ,zone=0){
   for(const s of segs){const g=geo(s),M=placeY(s.x,0,s.z,course.yaw(s.dir));
    const zid=T.ZONES[s.zone||0].id,zt=ZT[zid];
    for(const k of DRAWN)if(g[k])R.draw(g[k],M,{tex:tex[k],unlit:UNLIT[k]?1:0,tint:k==='glow'?GLOW[zid]:zt&&zt[k]});
    if(g.sign)R.draw(g.sign,M,{tex:tex.signs[T.ZONES[s.zone||0].id]});
    if(g.pkeys)for(const k of g.pkeys){const name=k.slice(2).replace('|c',''),t2=PROPS&&PROPS.tex[name];if(t2)R.draw(g[k],M,{tex:t2,cut:k.endsWith('|c')?.45:.02});}}
   const F=FLOORS[T.ZONES[zone].id];R.draw(F.mesh,placeY(eyeXZ[0],0,eyeXZ[1]),{tex:tex[F.tex],unlit:F.unlit?1:0,tint:F.tint});},
  drawCoins(segs,t,taken){for(const s of segs){const g=geo(s);const yaw=course.yaw(s.dir),f=T.DIRS[s.dir],rt=T.DIRS[(s.dir+1)%4];
    for(const c of g.coins){if(taken&&taken.has(c.c))continue;const wx=s.x+f[0]*c.z+rt[0]*c.x,wz=s.z+f[1]*c.z+rt[1]*c.x;
     R.draw(coinMesh,placeY(wx,c.y+Math.sin(t*3+c.z)*.05,wz,yaw+t*3.2),{tex:tex.gold,tint:[1.35,1.25,1,1]});}}},
  // power-ups: big spinning tokens in their colour, a soft halo behind
  drawPows(segs,t,taken,eye){const TINT={magnet:[1.7,.45,.4,1],boost:[.5,1.7,.6,1],shield:[.5,.9,1.8,1],idol:[1.8,1.5,.5,1]};
   for(const s of segs){const g=geo(s);if(!g.pows)continue;const f=T.DIRS[s.dir],rt=T.DIRS[(s.dir+1)%4];
    for(const q of g.pows){if(taken&&taken.has(q.c))continue;const wx=s.x+f[0]*q.z+rt[0]*q.x,wz=s.z+f[1]*q.z+rt[1]*q.x,y=q.y+Math.sin(t*2.5+q.z)*.12;
     if(q.kind==='idol')R.draw(idolMesh,mulScale(placeY(wx,y-.35,wz,t*2),1.1),{tex:tex.gold,tint:[1.5,1.3,.9,1]});
     else R.draw(coinMesh,mulScale(placeY(wx,y,wz,t*5),1.55),{tex:tex.gold,tint:TINT[q.kind]});
     const yaw=Math.atan2(eye[0]-wx,eye[2]-wz);R.draw(flameMesh,mulScale(placeY(wx,y,wz,yaw),1.6+Math.sin(t*6)*.15),{tex:tex.flame,unlit:1,blend:true,noDepthWrite:true,alpha:.5,tint:TINT[q.kind]});}}},
  drawShield(x,y,z,t){R.draw(shieldMesh,mulScale(placeY(x,y,z,t),1+Math.sin(t*7)*.03),{tex:tex.gold,tint:[.45,.75,1.4,.28],alpha:.28,blend:true,noDepthWrite:true,unlit:1});},
  drawFires(segs,t,eye){for(const s of segs){const g=geo(s);if(!g.fires.length)continue;const f=T.DIRS[s.dir],rt=T.DIRS[(s.dir+1)%4];
    for(const a of g.fires)for(let i=0;i<7;i++){const u=-T.HALF+.3+i*(2*T.HALF-.6)/6,h=1.45+Math.sin(t*11+i*1.7)*.08,wx=s.x+f[0]*a+rt[0]*u,wz=s.z+f[1]*a+rt[1]*u;
     const yaw=Math.atan2(eye[0]-wx,eye[2]-wz),sc=.75+Math.sin(t*17+i)*.12;
     R.draw(flameMesh,mulScale(placeY(wx,h,wz,yaw),sc),{tex:tex.flame,unlit:1,blend:true,noDepthWrite:true,alpha:.95});}}},
  // spinning blades and flying darts of the traps on these straights
  drawTraps(segs,t){for(const s of segs){const g=geo(s);if(!g.traps||!g.traps.length)continue;const yaw=course.yaw(s.dir),f=T.DIRS[s.dir];
    for(const q of g.traps){const M=placeY(s.x+f[0]*q.at,0,s.z+f[1]*q.at,yaw);
     if(q.kind==='blades')for(const [x,ph] of [[-1.05,0],[0,1.1],[1.05,2.2]]){const a=t*14+ph,c=Math.cos(a),sn=Math.sin(a);
       R.draw(bladeMesh,mul4(mul4(M,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,1.42,0,1])),new Float32Array([c,sn,0,0,-sn,c,0,0,0,0,1,0,0,0,0,1])),{tex:tex.metal,tint:[1.5,1.5,1.55,1]});}
     else for(let i=0;i<4;i++){const ph=(t*1.6+i*.27+q.at*.13)%1,x=(i%2?1:-1)*(T.HALF-.2)*(1-2*ph),y=1.18+i*.18;
       R.draw(dartMesh,mul4(M,new Float32Array([i%2?-1:1,0,0,0,0,1,0,0,0,0,1,0,x,y,-.55+i*.35,1])),{tex:tex.wood,tint:[1.2,1.1,1,1]});}}}},
  // the Venice rats: a carpet of them pouring along the trail behind you; at(d) -> [x,z,yaw]
  drawRats(at,hd,t,n=56){const b=MB(),rr=seededRandom('rats');
   for(let i=0;i<n;i++){const back=rr()*7,lat=(rr()-.5)*3.2,sp=7+rr()*5,d=hd-back+Math.sin(t*sp*.3+i)*.25,[x,z,yw]=at(d),rx=Math.cos(yw),rz=-Math.sin(yw),fx=Math.sin(yw),fz=Math.cos(yw);
    const px=x+rx*lat,pz=z+rz*lat,hop=Math.abs(Math.sin(t*sp+i*1.7))*.1,k=1.4+rr()*.6,pile=back>2.5?rr()*.5*(back/7):0,y=.1*k+hop+pile;
    b.blob([px,y,pz],.13*k,6,1,[70,58,50],.2,rr,.75);b.blob([px+fx*.15*k,y+.01,pz+fz*.15*k],.07*k,5,1,[85,70,60],.1,rr,.8);
    const tw=Math.sin(t*9+i)*.12;b.tube([px-fx*.12*k,y,pz-fz*.12*k],[px-fx*.42*k+rx*tw,.04,pz-fz*.42*k+rz*tw],.02,.008,3,1,[190,140,130],false);}
   const m=R._rats?R.update(R._rats,b.out())||R._rats:(R._rats=R.mesh(b.out(),{dynamic:true}));R.draw(m,placeY(0,0,0),{tex:tex.cave});},
  drawBoulder(x,y,z,yaw,roll){const M=placeY(x,y,z,yaw);// roll about the local X axis
   const c=Math.cos(roll),s=Math.sin(roll),Rx=new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);R.draw(boulderMesh,mul4(M,Rx),{tex:tex.rock,tint:[.72,.68,.62,1]});},
  // runaway mine cart: iron tub with ore, wheels spinning, sparks drawn by the caller
  drawCart(x,z,yaw,t,roll,drop=0){const M=placeY(x,Math.abs(Math.sin(t*9))*.06-drop*9,z,yaw+Math.sin(t*5)*.03+drop*.8);R.draw(cartMesh,M,{tex:tex.metal,tint:[1.4,1.3,1.2,1]});R.draw(cartOre,M,{tex:tex.cave});
   for(const wz of [-.85,.85]){const c=Math.cos(roll),s2=Math.sin(roll),W=mul4(mul4(M,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,.42,wz,1])),new Float32Array([1,0,0,0, 0,c,s2,0, 0,-s2,c,0, 0,0,0,1]));R.draw(cartWheel,W,{tex:tex.metal,tint:[.6,.58,.55,1]});}},
  // giant cobra: body follows the path behind its raised head; at(d) -> [x,z,yaw] on the runner's trail
  drawCobra(at,hd,t,lunge=0){const P=[],N=24,STEP=.75;
   for(let i=0;i<N;i++){const d=hd-i*STEP,[x,z,yw]=at(d),wig=Math.sin(t*5-i*.55)*(.35+Math.min(1,i/6)*.9),rx=Math.cos(yw),rz=-Math.sin(yw);
    const rise=i<6?(1-i/6)*(2.6+lunge*.8)*(1-i/6*.4):0;const rad=i<2?.55:i<5?.85:.85*(1-(i-5)/(N-4))+.12;P.push([x+rx*wig,.55+rise,z+rz*wig,rad]);}
   const b=MB();for(let i=0;i<N-1;i++){const a=P[i],c=P[i+1];b.tube([c[0],c[1],c[2]],[a[0],a[1],a[2]],c[3],a[3],10,1.2,undefined,false);}
   // head: snout pointing at the runner, hood behind it, eyes and fangs
   const [hx,hy,hz]=P[0],[fx,fz]=[Math.sin(at(hd+1)[2]),Math.cos(at(hd+1)[2])],up=[0,1,0],rt=[fz,0,-fx];
   const W=(u,v,w)=>[hx+rt[0]*u+fx*w,hy+v,hz+rt[2]*u+fz*w];
   b.blob(W(0,.1,.35),.55,10,1,undefined,0,Math.random,.7);b.blob(W(0,.02,.85),.32,8,1,undefined,0,Math.random,.6);
   b.tube(W(0,-.25,-.42),W(0,-.25,-.12),.82,.7,14,1,[205,190,120],true);// the hood: a wide disc behind the head
   const hm=R._cobra?R.update(R._cobra,b.out())||R._cobra:(R._cobra=R.mesh(b.out(),{dynamic:true}));R.draw(hm,placeY(0,0,0),{tex:tex.snake});
   const e=MB();for(const sx of [-1,1]){e.blob(W(sx*.28,.28,.62),.09,6,1,[255,210,40]);e.tube(W(sx*.14,-.12,1.02),W(sx*.13,-.42,1.0),.045,.01,5,1,[245,240,225]);}
   const em=R._cobraEyes?R.update(R._cobraEyes,e.out())||R._cobraEyes:(R._cobraEyes=R.mesh(e.out(),{dynamic:true}));R.draw(em,placeY(0,0,0),{tex:tex.glow,unlit:1});void up;},
  forget(keep){for(const [s,g] of cache)if(!keep.includes(s)){for(const [k,v] of Object.entries(g))if(k!=='coins'&&k!=='fires'&&k!=='pows'&&k!=='traps'&&k!=='pkeys')R.freeMesh(v);cache.delete(s);}}};
 // a T-junction arm drawn before the runner picks a side
 const peeks=new Map();
 function peek(seg,side){const key=seg.k+side;let p=peeks.get(key);if(p&&p.of===seg)return p.seg;
  const keepNext=seg.next,keepChoice=seg.choice;const n=course.follow(seg,side);// place it, then undo the choice
  seg.next=keepNext;seg.choice=keepChoice;if(keepNext&&course.segs[n.k]!==keepNext)course.segs[n.k]=keepNext;
  peeks.set(key,{of:seg,seg:n});return n;}
 return W;}

function mul4(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];o[c*4+r]=v;}return o;}
function mulScale(m,s){for(let i=0;i<12;i++)if(i%4!==3)m[i]*=s;return m;}

Object.assign(exports,{makeWorld,buildStraight,MB,setProps});
