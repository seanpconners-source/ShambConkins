// Shooter McGavin's Pro Tour: the 3D course (WebGL 2 through bowl/gl.js). One hole at a time: the terrain as a coloured
// height mesh (lies, mown stripes on the fairway and green, sand, rough, waste ground), a finer mesh on the green, lakes, tree
// billboards (crossed quads, picture or drawn), a sky dome with the theme's horizon, the flag waving in the wind, the cup,
// tee markers, the ball + its shadow + trail, the aim marker on the ground and the putting grid with dots that run downhill.
const GLm=require("src/engines/bowl/gl.js");
const {mul}=require("src/engines/trun/skel.js");
const A=require("src/engines/golf/art.js");
const {THEMES}=require("src/engines/golf/courses.js");
const P=require("src/engines/golf/physics.js");
const hex=h=>{const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255];};
const LIE_COL={tee:[92,160,74],fair:[96,168,72],fringe:[110,178,82],green:[118,190,90],rough:[66,122,48],deep:[50,96,38],sand:[226,206,150],waste:[196,160,104],water:[40,70,80],ob:[52,86,40],path:[170,170,160]};
const DESERT={fair:[132,170,78],tee:[124,166,74],fringe:[140,180,84],green:[128,186,92],rough:[150,140,84],waste:[202,166,110],deep:[176,140,92],ob:[180,146,98]};
function createScene(G,hole,theme){
 const T=THEMES[theme]||THEMES.park,cols={...LIE_COL,...(theme==='desert'?DESERT:{})},meshes=[],texes=[];
 const tex=(src,o)=>{const t=G.texture(src,o);texes.push(t);return t;};
 const keep=m=>{meshes.push(m);return m;};
 const vary=(x,z)=>{const n=Math.sin(x*.21+z*.13)*Math.sin(z*.17-x*.07)+.5*Math.sin(x*.9)*Math.cos(z*.8);return 1+n*.04;};
 const colorAt=(x,z,lie,h,fine)=>{let c=cols[lie]||cols.rough,k=vary(x,z);
  if(lie==='fair'||lie==='tee'){const [,t]=hole._pd(x,z);k*=Math.floor(t/9)%2?1.06:.95;}
  if(lie==='green'){const u=Math.floor((x-hole.green.x+200)/1.6),w=Math.floor((z-hole.green.z+200)/1.6);k*=(u+w)%2?1.04:.97;}
  if(lie==='sand'||lie==='waste')k*=1+.03*Math.sin(x*3.1)*Math.cos(z*2.7);
  return [Math.min(255,c[0]*k),Math.min(255,c[1]*k),Math.min(255,c[2]*k),255];};
 hole._pd=hole._pd||((x,z)=>require("src/engines/golf/courses.js").polyDist(hole.pts,x,z));
 // ---- terrain (coarse) over the hole's box
 const bx0=Math.min(...hole.pts.map(p=>p.x))-125,bx1=Math.max(...hole.pts.map(p=>p.x))+125,bz0=-60,bz1=Math.max(...hole.pts.map(p=>p.z))+70,STEP=3;
 const grid=(x0,x1,z0,z1,step,keepFn,yOff=0)=>{const B=GLm.builder(),nx=Math.ceil((x1-x0)/step)+1,nz=Math.ceil((z1-z0)/step)+1,idx=new Int32Array(nx*nz).fill(-1);
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=x0+i*step,z=z0+j*step;if(keepFn&&!keepFn(x,z))continue;const h=hole.height(x,z),n=hole.normal(x,z),lie=hole.lie(x,z);
   idx[j*nx+i]=B.v(x,h+yOff,z,n[0],n[1],n[2],x/6,z/6,colorAt(x,z,lie,h,step<1));}
  for(let j=0;j+1<nz;j++)for(let i=0;i+1<nx;i++){const a=idx[j*nx+i],b=idx[j*nx+i+1],c=idx[(j+1)*nx+i+1],d=idx[(j+1)*nx+i];if(a<0||b<0||c<0||d<0)continue;B.tri(a,c,b);B.tri(a,d,c);}
  return G.mesh(B.done());};
 const terrain=keep(grid(bx0,bx1,bz0,bz1,STEP));
 const g=hole.green,gr=Math.max(g.a,g.b)+5;
 const greenMesh=keep(grid(g.x-gr,g.x+gr,g.z-gr,g.z+gr,.5,(x,z)=>{const l=hole.lie(x,z);return l==='green'||l==='fringe';},.025));
 const teeMesh=keep(grid(-7,7,-9,9,.5,(x,z)=>hole.lie(x,z)==='tee',.03));
 // far ground under everything (to the horizon)
 const far=(()=>{const B=GLm.builder(),c=hex(T.ground).map(v=>v*.8),y=hole.height(0,0)-6,R=2600,cx=(bx0+bx1)/2,cz=(bz0+bz1)/2;B.quad([cx-R,y,cz-R],[cx-R,y,cz+R],[cx+R,y,cz+R],[cx+R,y,cz-R],[0,1,0],[0,0,1,1],[...c,255]);return keep(G.mesh(B.done()));})();
 // water
 const waterTex=tex(A.waterCanvas(),{repeat:true});
 const water=hole.lakes.length?(()=>{const B=GLm.builder();for(const l of hole.lakes){const y=hole.height(l.x,l.z)+.38,c=Math.cos(l.rot||0),s=Math.sin(l.rot||0),N=40,a=l.a+4,b=l.b+4,ctr=B.v(l.x,y,l.z,0,1,0,l.x/14,l.z/14,[255,255,255,255]);const ring=[];
   for(let i=0;i<=N;i++){const t=i/N*6.283,u=Math.cos(t)*a,w=Math.sin(t)*b,x=l.x+u*c-w*s,z=l.z+u*s+w*c;ring.push(B.v(x,y,z,0,1,0,x/14,z/14,[255,255,255,255]));}
   for(let i=0;i<N;i++)B.tri(ctr,ring[i+1],ring[i]);}return keep(G.mesh(B.done()));})():null;
 // trees: crossed quads per kind
 const treeMeshes=[];const byKind=new Map();for(const t of hole.trees){if(!byKind.has(t.kind))byKind.set(t.kind,[]);byKind.get(t.kind).push(t);}
 for(const [kind,list] of byKind){const B=GLm.builder(),cac=kind.startsWith('cactus');
  for(const t of list){const y=t.y??hole.height(t.x,t.z),h=t.sh*1.04,w=cac?h*.6:Math.max(t.cr*2.5,h*.62),rot=(t.x*7.3+t.z*3.1)%3.14;
   for(const a of [rot,rot+Math.PI/2]){const dx=Math.cos(a)*w/2,dz=Math.sin(a)*w/2;B.quad([t.x-dx,y-.2,t.z-dz],[t.x+dx,y-.2,t.z+dz],[t.x+dx,y+h,t.z+dz],[t.x-dx,y+h,t.z-dz],[0,1,0],[0,1,1,0],[255,255,255,255]);}}
  treeMeshes.push({m:keep(G.mesh(B.done())),t:tex(A.treeCanvas(kind)),kind});}
 // sky dome around the camera
 const skyTex=tex(A.skyCanvas(theme)),sky=(()=>{const B=GLm.builder(),R=120,yT=R*.9,yB=-R*.3,N=48,hv=400/512;const rows=[[yT,0],[0,hv],[yB,1]];const idx=[];
  for(const [y,v] of rows){const row=[];for(let i=0;i<=N;i++){const a=i/N*6.283;row.push(B.v(Math.sin(a)*R,y,Math.cos(a)*R,0,1,0,i/N*2,v,[255,255,255,255]));}idx.push(row);}
  for(let k=0;k<2;k++)for(let i=0;i<N;i++){const a=idx[k][i],b=idx[k][i+1],c=idx[k+1][i+1],d=idx[k+1][i];B.tri(a,b,c);B.tri(a,c,d);}return keep(G.mesh(B.done()));})();
 // flag pole + cup + tee markers (static)
 const cup=hole.cup,cupY=hole.height(cup.x,cup.z),deco=(()=>{const B=GLm.builder();
  B.box(cup.x-.02,cupY,cup.z-.02,cup.x+.02,cupY+2.3,cup.z+.02,[245,245,245,255]);B.box(cup.x-.021,cupY+2.0,cup.z-.021,cup.x+.021,cupY+2.3,cup.z+.021,[220,30,40,255]);
  for(const [tx] of [[-3.2],[3.2]]){B.sphere(.14,10,6,tx,hole.height(tx,2)+.12,2,[240,200,40,255]);}return keep(G.mesh(B.done()));})();
 const cupMesh=(()=>{const B=GLm.builder(),N=20,y=cupY+.032,c=B.v(cup.x,y,cup.z,0,1,0,0,0,[8,8,8,255]),r=[];for(let i=0;i<=N;i++){const a=i/N*6.283;r.push(B.v(cup.x+Math.cos(a)*.11,y,cup.z+Math.sin(a)*.11,0,1,0,0,0,[8,8,8,255]));}for(let i=0;i<N;i++)B.tri(c,r[i+1],r[i]);
  const r2=[],r3=[];for(let i=0;i<=N;i++){const a=i/N*6.283;r2.push(B.v(cup.x+Math.cos(a)*.11,y,cup.z+Math.sin(a)*.11,0,1,0,0,0,[250,250,250,255]));r3.push(B.v(cup.x+Math.cos(a)*.15,y,cup.z+Math.sin(a)*.15,0,1,0,0,0,[250,250,250,255]));}
  for(let i=0;i<N;i++){B.tri(r2[i],r2[i+1],r3[i+1]);B.tri(r2[i],r3[i+1],r3[i]);}return keep(G.mesh(B.done()));})();
 const flagTex=tex(A.flagCanvas()),flagMesh=keep(G.mesh(GLm.builder().done())),ballMesh=keep(G.mesh((()=>{const B=GLm.builder();B.sphere(1,16,10,0,0,0,[250,250,250,255]);return B.done();})()));
 const shadowMesh=keep(G.mesh((()=>{const B=GLm.builder(),N=16,c=B.v(0,0,0,0,1,0,0,0,[0,0,0,120]),r=[];for(let i=0;i<=N;i++){const a=i/N*6.283;r.push(B.v(Math.cos(a),0,Math.sin(a),0,1,0,0,0,[0,0,0,0]));}for(let i=0;i<N;i++)B.tri(c,r[i+1],r[i]);return B.done();})()));
 const dyn={trail:keep(G.mesh(GLm.builder().done())),marker:keep(G.mesh(GLm.builder().done())),grid:keep(G.mesh(GLm.builder().done())),dots:keep(G.mesh(GLm.builder().done()))};
 // putting grid: lines every metre over the green, a little above it; dots flow downhill (slope speed)
 const gridLines=(()=>{const B=GLm.builder(),w=.03;for(let gx=Math.floor(g.x-gr);gx<=g.x+gr;gx+=1)for(let z=g.z-gr;z<g.z+gr;z+=.5){if(hole.lie(gx,z)!=='green'||hole.lie(gx,z+.5)!=='green')continue;const y0=hole.height(gx,z)+.04,y1=hole.height(gx,z+.5)+.04;B.quad([gx-w,y0,z],[gx-w,y1,z+.5],[gx+w,y1,z+.5],[gx+w,y0,z],[0,1,0],[0,0,1,1],[255,255,255,55]);}
  for(let gz=Math.floor(g.z-gr);gz<=g.z+gr;gz+=1)for(let x=g.x-gr;x<g.x+gr;x+=.5){if(hole.lie(x,gz)!=='green'||hole.lie(x+.5,gz)!=='green')continue;const y0=hole.height(x,gz)+.04,y1=hole.height(x+.5,gz)+.04;B.quad([x,y0,gz-w],[x,y0,gz+w],[x+.5,y1,gz+w],[x+.5,y1,gz-w],[0,1,0],[0,0,1,1],[255,255,255,55]);}
  return B.done();})();G.update(dyn.grid,gridLines);
 const dots=[];{const r=(i)=>((i*9301+49297)%233280)/233280;for(let i=0;i<160;i++){const x=g.x+(r(i)-.5)*2*gr,z=g.z+(r(i+999)-.5)*2*gr;if(hole.lie(x,z)==='green')dots.push({x,z,x0:x,z0:z,t:r(i+7)*3});}}
 const detail=tex(A.detailCanvas(),{repeat:true});
 let flagT=0;
 function stepDots(dt){for(const d of dots){const n=hole.normal(d.x,d.z),sx=-n[0],sz=-n[2],s=Math.hypot(sx,sz);d.t+=dt;if(s<.002||d.t>3||hole.lie(d.x,d.z)!=='green'){d.x=d.x0;d.z=d.z0;d.t=0;continue;}const v=Math.min(1.4,.3+s*40);d.x+=n[0]/s*v*dt;d.z+=n[2]/s*v*dt;}}
 function draw(W,H,cam,o={}){const {eye,tgt,fov=50}=cam,view=GLm.lookAt(eye,tgt),proj=GLm.perspective(fov*Math.PI/180,W/H,.1,4000);
  const fogC=hex(T.sky[1]).map(v=>v/255);
  if(!G.begin({w:W,h:H,view,proj,eye,key:[-.42,.82,.38],keyCol:[.82,.78,.68],ambTop:[.34,.38,.44],ambBot:[.2,.18,.15],fog:fogC,fogNear:220,fogFar:1500,clear:fogC}))return null;
  const at=(x,y,z,s=1)=>GLm.at(x,y,z,s);
  G.draw(sky,at(eye[0],eye[1]*.2,eye[2]),{tex:skyTex,emis:1,noDepth:true,depthWrite:false});
  G.draw(far,null,{emis:.2});
  G.draw(terrain,null,{tex:detail,spec:[.05,8]});G.draw(teeMesh,null,{tex:detail});G.draw(greenMesh,null,{tex:detail,spec:[.12,20]});
  if(water)G.draw(water,null,{tex:waterTex,tint:[.45,.75,.9,1],spec:[1.2,60],alpha:.88,blend:true});
  G.draw(deco,null,{spec:[.4,30]});G.draw(cupMesh,null,{emis:.3});
  // flag cloth: a waving strip at the top of the pole, blowing downwind
  flagT+=o.dt||0;{const wnd=hole.wind||{x:0,z:1},wl=Math.hypot(wnd.x,wnd.z)||1,dx=wnd.x/wl,dz=wnd.z/wl,B=GLm.builder(),N=8,L=.62,Hh=.4,top=cupY+2.28,flap=.1+Math.min(.25,wl*.03);
   for(let i=0;i<N;i++){const f0=i/N,f1=(i+1)/N,w0=Math.sin(flagT*7-f0*5)*flap*f0,w1=Math.sin(flagT*7-f1*5)*flap*f1,x0=cup.x+dx*L*f0-dz*w0,z0=cup.z+dz*L*f0+dx*w0,x1=cup.x+dx*L*f1-dz*w1,z1=cup.z+dz*L*f1+dx*w1;
    B.quad([x0,top-Hh,z0],[x1,top-Hh,z1],[x1,top,z1],[x0,top,z0],[0,1,0],[f0,1,f1,0],[255,255,255,255]);}
   G.update(flagMesh,B.done());G.draw(flagMesh,null,{tex:flagTex,emis:.35,cut:.3});}
  // trees (cut-out)
  for(const tm of treeMeshes)G.draw(tm.m,null,{tex:tm.t,cut:.45,emis:.15});
  // putting grid
  if(o.grid){G.draw(dyn.grid,null,{emis:1,blend:true,depthWrite:false});stepDots(o.dt||0);const B=GLm.builder(),cr=Math.hypot(eye[0]-g.x,eye[2]-g.z),w=Math.max(.05,cr*.006);
   for(const d of dots){const y=hole.height(d.x,d.z)+.06,n=hole.normal(d.x,d.z),s=Math.hypot(n[0],n[2]),k=Math.min(1,s*25),c=[255,255*(1-k*.6),60+120*(1-k),220];B.quad([d.x-w,y,d.z-w],[d.x-w,y,d.z+w],[d.x+w,y,d.z+w],[d.x+w,y,d.z-w],[0,1,0],[0,0,1,1],c);}
   G.update(dyn.dots,B.done());G.draw(dyn.dots,null,{emis:1,blend:true,depthWrite:false});}
  // aim marker (ring on the ground) + the dashed line to it
  if(o.marker){const {x,z,r=2.2,col=[255,220,70]}=o.marker,B=GLm.builder(),N=32,y0=hole.height(x,z)+.15;
   for(let i=0;i<N;i++){const a0=i/N*6.283,a1=(i+1)/N*6.283,ri=r*.78;B.quad([x+Math.cos(a0)*ri,y0,z+Math.sin(a0)*ri],[x+Math.cos(a0)*r,y0,z+Math.sin(a0)*r],[x+Math.cos(a1)*r,y0,z+Math.sin(a1)*r],[x+Math.cos(a1)*ri,y0,z+Math.sin(a1)*ri],[0,1,0],[0,0,1,1],[...col,230]);}
   if(o.marker.from){const f=o.marker.from,L=Math.hypot(x-f.x,z-f.z),n=Math.floor(L/2.4),dx=(x-f.x)/L,dz=(z-f.z)/L,w=Math.min(.12,Math.max(.03,L*.002));
    for(let i=1;i<n;i++){if(i%2)continue;const ax=f.x+dx*i*2.4,az=f.z+dz*i*2.4,bx=ax+dx*1.4,bz=az+dz*1.4,ya=hole.height(ax,az)+.12,yb=hole.height(bx,bz)+.12;B.quad([ax-dz*w,ya,az+dx*w],[ax+dz*w,ya,az-dx*w],[bx+dz*w,yb,bz-dx*w],[bx-dz*w,yb,bz+dx*w],[0,1,0],[0,0,1,1],[255,255,255,110]);}}
   G.update(dyn.marker,B.done());G.draw(dyn.marker,null,{emis:1,blend:true,depthWrite:false});}
  // ball trail (camera-facing ribbon)
  if(o.trail&&o.trail.length>1){const B=GLm.builder(),pts=o.trail;for(let i=0;i+1<pts.length;i++){const a=pts[i],b=pts[i+1],vx=b[0]-a[0],vy=b[1]-a[1],vz=b[2]-a[2],cx=eye[0]-a[0],cy=eye[1]-a[1],cz=eye[2]-a[2];
    let nx=vy*cz-vz*cy,ny=vz*cx-vx*cz,nz=vx*cy-vy*cx;const l=Math.hypot(nx,ny,nz)||1,d=Math.hypot(cx,cy,cz),w=Math.max(.05,d*.0028);nx*=w/l;ny*=w/l;nz*=w/l;const al=Math.round(200*(i+1)/pts.length);
    B.quad([a[0]-nx,a[1]-ny,a[2]-nz],[b[0]-nx,b[1]-ny,b[2]-nz],[b[0]+nx,b[1]+ny,b[2]+nz],[a[0]+nx,a[1]+ny,a[2]+nz],[0,1,0],[0,0,1,1],[255,255,240,al]);}
   G.update(dyn.trail,B.done());G.draw(dyn.trail,null,{emis:1,blend:true,depthWrite:false});}
  // ball + shadow (drawn bigger when far, so it never vanishes)
  for(const b of o.balls||[]){const d=Math.hypot(eye[0]-b.x,eye[1]-b.y,eye[2]-b.z),r=Math.max(P.BALL_R*1.4,d*.0045),gy=hole.height(b.x,b.z);
   G.draw(shadowMesh,GLm.poseM(b.x,gy+.03,b.z,[0,0,0,1],r*1.3),{blend:true,depthWrite:false,emis:1});
   G.draw(ballMesh,GLm.at(b.x,Math.max(b.y,gy)+r,b.z,r),{tint:b.tint||[1,1,1,1],spec:[.9,60],emis:.25});}
  return {view,proj};}
 function project(x,y,z){return G.project(x,y,z);}
 function dispose(){for(const m of meshes)try{G.freeMesh(m);}catch{}for(const t of texes)try{G.freeTexture(t);}catch{}}
 return {draw,project,dispose,cupY,bounds:{bx0,bx1,bz0,bz1}};}
// the hole map for the HUD (top-down, north up the screen = toward the green), cached
function holeMap(hole,theme,W,Hh){const T=THEMES[theme]||THEMES.park,c=document.createElement('canvas');c.width=W;c.height=Hh;const g=c.getContext('2d'),cols={...LIE_COL,...(theme==='desert'?DESERT:{})};
 const xs=hole.pts.map(p=>p.x),zs=hole.pts.map(p=>p.z),x0=Math.min(...xs)-45,x1=Math.max(...xs)+45,z0=-25,z1=Math.max(...zs)+25,k=Math.min(W/(x1-x0),Hh/(z1-z0)),ox=(W-(x1-x0)*k)/2,oy=(Hh-(z1-z0)*k)/2;
 const im=g.createImageData(W,Hh);for(let j=0;j<Hh;j++)for(let i=0;i<W;i++){const x=x1-(i-ox)/k,z=z1-(j-oy)/k,l=hole.lie(x,z),cc=l==='water'?[60,120,190]:cols[l]||cols.rough,o=(j*W+i)*4;im.data[o]=cc[0];im.data[o+1]=cc[1];im.data[o+2]=cc[2];im.data[o+3]=l==='ob'?120:235;}
 g.putImageData(im,0,0);for(const t of hole.trees){g.fillStyle='rgba(20,50,20,.75)';g.beginPath();g.arc(ox+(x1-t.x)*k,oy+(z1-t.z)*k,Math.max(1.2,t.cr*k*.8),0,6.28);g.fill();}
 const map=(x,z)=>[ox+(x1-x)*k,oy+(z1-z)*k];return {c,map,k};}
Object.assign(exports,{createScene,holeMap,LIE_COL});
