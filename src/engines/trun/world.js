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
function stoneTex(seed){const n=512,[c,g]=cv(n),r=seededRandom(seed);
 g.fillStyle='#8a7a62';g.fillRect(0,0,n,n);
 // big flagstones in rows, each its own tint, with a dark mortar line and a chipped bevel
 const rows=4;for(let y=0;y<rows;y++){const h=n/rows;let x=-(r()*n/3);while(x<n){const w=n/3*(.6+r()*.7);
   const t=(r()-.5)*28,base=[138+t,122+t,98+t*.8];g.fillStyle=`rgb(${base.map(v=>v|0)})`;
   for(const ox of [0,n])g.fillRect(x+ox+3,y*h+3,w-6,h-6);
   const gr=g.createLinearGradient(0,y*h,0,y*h+h);gr.addColorStop(0,'rgba(255,240,210,.18)');gr.addColorStop(.12,'rgba(255,240,210,0)');gr.addColorStop(.85,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.28)');g.fillStyle=gr;for(const ox of [0,n])g.fillRect(x+ox+3,y*h+3,w-6,h-6);
   x+=w;}}
 blotch(g,n,r,40,'rgba(60,52,40,A)',8,40,.35);blotch(g,n,r,18,'rgba(70,110,50,A)',10,50,.32);blotch(g,n,r,30,'rgba(200,185,150,A)',4,18,.25);
 // cracks
 g.strokeStyle='rgba(40,32,24,.55)';g.lineWidth=1.4;for(let i=0;i<14;i++){let x=r()*n,y=r()*n;g.beginPath();g.moveTo(x,y);for(let k=0;k<5;k++){x+=(r()-.5)*40;y+=(r()-.5)*40;g.lineTo(x,y);}g.stroke();}
 noiseFill(g,n,r,0,22);return c;}
function cliffTex(seed){const n=512,[c,g]=cv(n),r=seededRandom(seed);
 g.fillStyle='#6d5f4c';g.fillRect(0,0,n,n);
 // rough stacked blocks, darker and mossier than the path
 for(let y=0;y<8;y++){let x=-(r()*80);const h=n/8;while(x<n){const w=50+r()*90,t=(r()-.5)*30;g.fillStyle=`rgb(${(104+t)|0},${(92+t)|0},${(74+t*.8)|0})`;for(const ox of [0,n])g.fillRect(x+ox+2,y*h+2,w-4,h-4);x+=w;}}
 blotch(g,n,r,50,'rgba(55,95,40,A)',10,60,.4);blotch(g,n,r,40,'rgba(30,26,20,A)',10,50,.35);
 g.strokeStyle='rgba(60,110,45,.6)';g.lineWidth=3;for(let i=0;i<10;i++){let x=r()*n,y=0;g.beginPath();g.moveTo(x,y);while(y<n){y+=20;x+=(r()-.5)*14;g.lineTo(x,y);}g.stroke();}
 noiseFill(g,n,r,0,26);return c;}
function woodTex(seed){const n=256,[c,g]=cv(n),r=seededRandom(seed);g.fillStyle='#5a3d24';g.fillRect(0,0,n,n);
 for(let i=0;i<70;i++){const x=r()*n,w=1+r()*4,t=(r()-.5)*40;g.fillStyle=`rgba(${(80+t)|0},${(56+t)|0},${(34+t*.6)|0},.8)`;g.fillRect(x,0,w,n);}
 blotch(g,n,r,12,'rgba(70,100,45,A)',8,30,.35);noiseFill(g,n,r,0,20);return c;}
function leafTex(seed){const n=256,[c,g]=cv(n),r=seededRandom(seed);g.fillStyle='#2f5a24';g.fillRect(0,0,n,n);
 for(let i=0;i<500;i++){const x=r()*n,y=r()*n,s=3+r()*9,t=(r()-.5)*60;g.fillStyle=`rgba(${(50+t*.5)|0},${(100+t)|0},${(40+t*.4)|0},.85)`;g.beginPath();g.ellipse(x,y,s,s*.5,r()*3,0,7);g.fill();}
 noiseFill(g,n,r,0,18);return c;}
function goldTex(){const n=128,[c,g]=cv(n);const gr=g.createLinearGradient(0,0,n,n);gr.addColorStop(0,'#fff3a0');gr.addColorStop(.45,'#f2b630');gr.addColorStop(1,'#a8661a');g.fillStyle=gr;g.fillRect(0,0,n,n);
 g.strokeStyle='rgba(120,70,10,.7)';g.lineWidth=6;g.beginPath();g.arc(n/2,n/2,n*.33,0,7);g.stroke();g.fillStyle='rgba(255,250,200,.6)';g.font='bold 52px serif';g.textAlign='center';g.textBaseline='middle';g.fillText('★',n/2,n/2+2);return c;}
function rockTex(seed){const n=512,[c,g]=cv(n),r=seededRandom(seed);g.fillStyle='#7d7062';g.fillRect(0,0,n,n);
 blotch(g,n,r,90,'rgba(50,44,38,A)',10,60,.4);blotch(g,n,r,60,'rgba(170,155,135,A)',8,40,.3);blotch(g,n,r,20,'rgba(80,100,60,A)',10,40,.25);
 g.strokeStyle='rgba(30,26,22,.7)';g.lineWidth=2.5;for(let i=0;i<22;i++){let x=r()*n,y=r()*n;g.beginPath();g.moveTo(x,y);for(let k=0;k<6;k++){x+=(r()-.5)*60;y+=(r()-.5)*60;g.lineTo(x,y);}g.stroke();}
 noiseFill(g,n,r,0,30);return c;}
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
function buildStraight(seg,corner=true){const r=seededRandom('w:'+seg.k+':'+seg.len);
 const M={stone:MB(),cliff:MB(),wood:MB(),leaf:MB(),gold:null};
 const L=seg.len;
 // deck pieces between gaps
 const gaps=seg.obs.filter(o=>o.kind==='gap').map(o=>[o.at,o.at+o.len]);
 let z=0;const spans=[];for(const [g0,g1] of gaps){if(g0>z)spans.push([z,g0]);z=g1;}spans.push([z,L+(corner?CW:0)]);
 for(const [z0,z1] of spans){M.stone.box(-H,H,-.45,0,z0,z1,2.4,undefined,{bottom:true});
  // the wall under the path, down into the mist
  M.cliff.box(-H-.15,H+.15,-DEPTH,-.45,z0,z1,3,undefined,{top:true,bottom:true});}
 // broken stones hanging at gap edges
 for(const [g0,g1] of gaps){for(const zz of [g0,g1])for(let i=0;i<3;i++){const x=-H+.4+r()*(2*H-.8);M.stone.box(x-.25,x+.25,-.7-r()*.4,-.2,zz-.25,zz+.25,1);}}
 // parapet stones along both edges (gaps in them now and then)
 const zEnd=L+(corner?CW:0);
 for(const side of [-1,1]){let zz=.4;while(zz<zEnd-.3){if(r()>.12&&!gaps.some(([a,b])=>zz>a-.6&&zz<b+.6)&&!(corner&&zz>L-.2&&side===(seg.turn==='L'?-1:seg.turn==='R'?1:2))){
    const w=.7+r()*.5,h=.28+r()*.22,x=side*(H-.17);M.stone.box(x-.17,x+.17,0,h,zz,zz+w,1.2);}
   zz+=1.0+r()*.9;}}
 // corner: closing wall stones on the far edge (and the open side(s) get nothing)
 if(corner){const zc=L+CW;for(let x=-H+.2;x<H-.2;x+=.9){if(r()>.15)M.stone.box(x,x+.7,0,.3+r()*.2,zc-.34,zc,1.2);}
  if(seg.turn==='L'){for(let zz=L+.2;zz<zc-.3;zz+=.9)M.stone.box(H-.34,H,0,.35,zz,zz+.7,1.2);}
  if(seg.turn==='R'){for(let zz=L+.2;zz<zc-.3;zz+=.9)M.stone.box(-H,-H+.34,0,.35,zz,zz+.7,1.2);}}
 // the temple the boulder bursts out of, behind the start line
 if(seg.k===0){M.stone.box(-H,H,-.45,0,-12,0,2.4,undefined,{bottom:true});M.cliff.box(-H-.15,H+.15,-DEPTH,-.45,-12,0,3,undefined,{top:true,bottom:true});
  const zf=-1.6,D=2.75;// facade plane, doorway half width
  M.cliff.box(-9,-D,-DEPTH,8,zf-1.4,zf,2.5);M.cliff.box(D,9,-DEPTH,8,zf-1.4,zf,2.5);M.cliff.box(-D,D,5.4,8,zf-1.4,zf,2.5);
  M.stone.box(-D-.5,-D,0,5.4,zf-.2,zf+.25,1.4);M.stone.box(D,D+.5,0,5.4,zf-.2,zf+.25,1.4);M.stone.box(-D-.6,D+.6,5.4,6.1,zf-.25,zf+.35,1.4);
  for(let i=0;i<4;i++){const w=8.5-i*1.8,y=8+i*1.3;M.cliff.box(-w,w,y,y+1.3,zf-1.4-i*.6,zf-i*.6,2.5);}
  // dark tunnel inside the door
  M.cliff.box(-D-.6,-D,0,5.4,-12,zf-1.4,2,[70,62,52]);M.cliff.box(D,D+.6,0,5.4,-12,zf-1.4,2,[70,62,52]);M.cliff.box(-D,D,5.4,6,-12,zf-1.4,2,[60,54,46]);
  M.cliff.box(-D,D,0,5.4,-12.4,-12,2,[25,22,18]);
  // idol pedestal by the door
  for(const sx of [-1,1])M.stone.box(sx*(D+1.2)-.5,sx*(D+1.2)+.5,0,1.1,zf+.4,zf+1.4,1);}
 // obstacles
 for(const o of seg.obs){const a=o.at;
  if(o.kind==='log'){M.wood.tube([-H-.6,.45,a],[H+.6,.48,a],.42,.38,12,1.2);for(let i=0;i<3;i++){const x=-1+r()*2;M.wood.tube([x,.7,a],[x+(r()-.5)*.6,1.25,a+(r()-.5)*.4],.08,.04,6,.6);}}
  else if(o.kind==='root'){let px=-H-.3,py=.12;for(let i=0;i<6;i++){const nx=px+(2*H+.6)/6,ny=.1+r()*.28;M.wood.tube([px,py,a+(r()-.5)*.2],[nx,ny,a+(r()-.5)*.2],.14,.12,8,.8);px=nx;py=ny;}}
  else if(o.kind==='arch'){for(const side of [-1,1])M.stone.box(side*(H+.05)-.32,side*(H+.05)+.32,0,2.3,a-.38,a+.38,1.6);
   M.stone.box(-H-.4,H+.4,1.2,1.78,a-.32,a+.32,1.6);M.stone.box(-H-.5,H+.5,1.78,1.98,a-.42,a+.42,1.6);
   // carved face stones on the beam
   M.cliff.box(-.45,.45,1.28,1.72,a+.32,a+.38,1);}
  else if(o.kind==='fire'){for(const side of [-1,1]){M.stone.box(side*(H-.05)-.3,side*(H-.05)+.3,0,1.5,a-.35,a+.35,1.2);M.cliff.box(side*(H-.05)-.36,side*(H-.05)+.36,1.5,1.62,a-.4,a+.4,1);}}
  else if(o.kind==='block'){for(const l of o.lanes){const x=(l-1)*T.LANE;const kind=r();
    if(kind<.5){M.stone.box(x-.5,x+.5,0,1.6,a-.5,a+.5,1.4);M.stone.box(x-.42,x+.42,1.6,2.3,a-.42,a+.42,1.2);M.cliff.box(x-.55,x+.55,2.3,2.45,a-.55,a+.55,1);}
    else{M.stone.box(x-.55,x+.55,0,.9,a-.55,a+.55,1.2);M.stone.box(x-.4,x+.45,.9,1.6,a-.4,a+.3,1.2);M.stone.box(x-.3,x+.25,1.6,2.1,a-.3,a+.2,1.1);}}}}
 // scenery: trees rising from the canyon, ruined pillars, the odd temple wall
 for(const side of [-1,1]){let zz=r()*8;while(zz<zEnd){const k=r(),dx=side*(H+2.6+r()*7);
   if(k<.55){// jungle tree: trunk from far below, canopy above path height
    const top=4+r()*7,base=-14;M.wood.tube([dx,base,zz],[dx+(r()-.5),top,zz+(r()-.5)],.5+r()*.3,.28,8,2,undefined,false);
    for(let i=0;i<3;i++)M.leaf.blob([dx+(r()-.5)*2.2,top+(r()-.3)*1.6,zz+(r()-.5)*2.2],1.6+r()*1.6,10,2,undefined,.35,r,.7);
    if(r()<.5){const vx=dx-side*(r()*1.5);M.leaf.tube([vx,top,zz],[vx,top-3-r()*3,zz+.3],.06,.04,5,.5,[120,200,110],false);}}
   else if(k<.8){// ruined pillar
    const h=1+r()*5;M.cliff.box(dx-.6,dx+.6,-10,h,zz-.6,zz+.6,2);if(r()<.6)M.stone.box(dx-.75,dx+.75,h,h+.35,zz-.75,zz+.75,1.4);}
   else if(k<.9&&zz<zEnd-6){// low temple wall running alongside
    M.cliff.box(dx-.4,dx+.4,-10,1.2+r()*1.5,zz,zz+5,3);}
   zz+=3+r()*7;}}
 const out={};for(const [k,b] of Object.entries(M))if(b&&!b.empty())out[k]=b.out();
 // coins (positions only; drawn spinning)
 out.coins=seg.coins.map(c=>({c,x:(c.lane-1)*T.LANE,y:c.y,z:c.at}));
 out.pows=(seg.pows||[]).map(q=>({c:q,x:(q.lane-1)*T.LANE,y:q.y,z:q.at,kind:q.kind}));
 out.fires=seg.obs.filter(o=>o.kind==='fire').map(o=>o.at);
 return out;}

// ---------------------------------------------------------------- world: textures, segment cache, drawing
function makeWorld(R,course){
 const tex={stone:R.texture(stoneTex('stone'),{repeat:true}),cliff:R.texture(cliffTex('cliff'),{repeat:true}),wood:R.texture(woodTex('wood'),{repeat:true}),
  leaf:R.texture(leafTex('leaf'),{repeat:true}),gold:R.texture(goldTex()),rock:R.texture(rockTex('rock'),{repeat:true}),flame:R.texture(flameTex(),{mips:false})};
 const cache=new Map();
 // a straight, built once, in local space; the T-junction arms are previews of the next straight both ways
 function geo(seg){let g=cache.get(seg);if(!g){const b=buildStraight(seg);g={};for(const [k,v] of Object.entries(b)){if(k==='coins'||k==='fires'||k==='pows')g[k]=v;else g[k]=R.mesh(v);}cache.set(seg,g);}return g;}
 // coin + flame meshes
 const coinMesh=(()=>{const b=MB();b.tube([0,0,-.05],[0,0,.05],.32,.32,18,1,undefined,true);return R.mesh(b.out());})();
 const flameMesh=(()=>{const n=[0,0,1],b=MB();b.quad([-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[-.5,.5,0],n,[0,1],[1,1],[1,0],[0,0]);return R.mesh(b.out());})();
 const shieldMesh=(()=>{const b=MB();b.blob([0,1,0],1.15,18,1,undefined,0,Math.random,1.05);return R.mesh(b.out());})();
 const boulderMesh=(()=>{const b=MB();b.blob([0,0,0],2.3,22,1.5,undefined,.12,seededRandom('boulder'));return R.mesh(b.out());})();
 // far canyon floor: a huge dark jungle plane far below
 const floor=(()=>{const b=MB(),S=400;b.quad([-S,-24,-S],[-S,-24,S],[S,-24,S],[S,-24,-S],[0,1,0],[0,0],[0,40],[40,40],[40,0],[90,120,70]);return R.mesh(b.out());})();
 const W={tex,
  // the straights to draw: from the runner's straight on, following the course; T-junctions show both arms
  visible(seg,ahead=3){const out=[];const prev=seg.k>0&&course.segs[seg.k-1];if(prev&&prev.next===seg)out.push(prev);let s=seg,depth=0;
   while(s&&depth<=ahead){out.push(s);if(s.turn==='T'){if(s.next)s=s.next;else{for(const side of ['L','R'])out.push(peek(s,side));break;}}
    else s=s.next||course.follow(s,s.turn);depth++;}
   return out;},
  draw(segs,t,eyeXZ){
   for(const s of segs){const g=geo(s),M=placeY(s.x,0,s.z,course.yaw(s.dir));
    for(const k of ['stone','cliff','wood','leaf'])if(g[k])R.draw(g[k],M,{tex:tex[k]});}
   R.draw(floor,placeY(eyeXZ[0],0,eyeXZ[1]),{tex:tex.leaf});},
  drawCoins(segs,t,taken){for(const s of segs){const g=geo(s);const yaw=course.yaw(s.dir),f=T.DIRS[s.dir],rt=T.DIRS[(s.dir+1)%4];
    for(const c of g.coins){if(taken&&taken.has(c.c))continue;const wx=s.x+f[0]*c.z+rt[0]*c.x,wz=s.z+f[1]*c.z+rt[1]*c.x;
     R.draw(coinMesh,placeY(wx,c.y+Math.sin(t*3+c.z)*.05,wz,yaw+t*3.2),{tex:tex.gold,tint:[1.35,1.25,1,1]});}}},
  // power-ups: big spinning tokens in their colour, a soft halo behind
  drawPows(segs,t,taken,eye){const TINT={magnet:[1.7,.45,.4,1],boost:[.5,1.7,.6,1],shield:[.5,.9,1.8,1]};
   for(const s of segs){const g=geo(s);if(!g.pows)continue;const f=T.DIRS[s.dir],rt=T.DIRS[(s.dir+1)%4];
    for(const q of g.pows){if(taken&&taken.has(q.c))continue;const wx=s.x+f[0]*q.z+rt[0]*q.x,wz=s.z+f[1]*q.z+rt[1]*q.x,y=q.y+Math.sin(t*2.5+q.z)*.12;
     R.draw(coinMesh,mulScale(placeY(wx,y,wz,t*5),1.55),{tex:tex.gold,tint:TINT[q.kind]});
     const yaw=Math.atan2(eye[0]-wx,eye[2]-wz);R.draw(flameMesh,mulScale(placeY(wx,y,wz,yaw),1.6+Math.sin(t*6)*.15),{tex:tex.flame,unlit:1,blend:true,noDepthWrite:true,alpha:.5,tint:TINT[q.kind]});}}},
  drawShield(x,y,z,t){R.draw(shieldMesh,mulScale(placeY(x,y,z,t),1+Math.sin(t*7)*.03),{tex:tex.gold,tint:[.45,.75,1.4,.28],alpha:.28,blend:true,noDepthWrite:true,unlit:1});},
  drawFires(segs,t,eye){for(const s of segs){const g=geo(s);if(!g.fires.length)continue;const f=T.DIRS[s.dir],rt=T.DIRS[(s.dir+1)%4];
    for(const a of g.fires)for(let i=0;i<7;i++){const u=-T.HALF+.3+i*(2*T.HALF-.6)/6,h=1.45+Math.sin(t*11+i*1.7)*.08,wx=s.x+f[0]*a+rt[0]*u,wz=s.z+f[1]*a+rt[1]*u;
     const yaw=Math.atan2(eye[0]-wx,eye[2]-wz),sc=.75+Math.sin(t*17+i)*.12;
     R.draw(flameMesh,mulScale(placeY(wx,h,wz,yaw),sc),{tex:tex.flame,unlit:1,blend:true,noDepthWrite:true,alpha:.95});}}},
  drawBoulder(x,y,z,yaw,roll){const M=placeY(x,y,z,yaw);// roll about the local X axis
   const c=Math.cos(roll),s=Math.sin(roll),Rx=new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);R.draw(boulderMesh,mul4(M,Rx),{tex:tex.rock,tint:[.72,.68,.62,1]});},
  forget(keep){for(const [s,g] of cache)if(!keep.includes(s)){for(const [k,v] of Object.entries(g))if(k!=='coins'&&k!=='fires'&&k!=='pows')R.freeMesh(v);cache.delete(s);}}};
 // a T-junction arm drawn before the runner picks a side
 const peeks=new Map();
 function peek(seg,side){const key=seg.k+side;let p=peeks.get(key);if(p&&p.of===seg)return p.seg;
  const keepNext=seg.next,keepChoice=seg.choice;const n=course.follow(seg,side);// place it, then undo the choice
  seg.next=keepNext;seg.choice=keepChoice;if(keepNext&&course.segs[n.k]!==keepNext)course.segs[n.k]=keepNext;
  peeks.set(key,{of:seg,seg:n});return n;}
 return W;}

function mul4(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];o[c*4+r]=v;}return o;}
function mulScale(m,s){for(let i=0;i<12;i++)if(i%4!==3)m[i]*=s;return m;}

Object.assign(exports,{makeWorld,buildStraight,MB});
