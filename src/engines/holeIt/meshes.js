// Hole.it 3D props: procedural low-poly meshes with per-vertex colour.
// World units: a Size 1 hole has radius 0.5. Every kind sits on y=0 with its
// footprint radius `r` (what must fit through the hole) and height `h`.
const C=h=>{h=h.replace('#','');return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255];};
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const TAU=Math.PI*2;
function rot(v,r){let [x,y,z]=v;
 if(r[2]){const c=Math.cos(r[2]),s=Math.sin(r[2]);[x,y]=[x*c-y*s,x*s+y*c];}
 if(r[0]){const c=Math.cos(r[0]),s=Math.sin(r[0]);[y,z]=[y*c-z*s,y*s+z*c];}
 if(r[1]){const c=Math.cos(r[1]),s=Math.sin(r[1]);[x,z]=[x*c+z*s,-x*s+z*c];}
 return [x,y,z];}
function geo(){return {p:[],n:[],c:[]};}
// Append primitive triangles (local p/n arrays) to g with scale s, rotation r, offset at.
// col is [r,g,b] or (localPos,localNormal)=>[r,g,b].
function add(g,t,o={},col=[1,1,1]){
 const s=o.s==null?[1,1,1]:typeof o.s==='number'?[o.s,o.s,o.s]:o.s,r=o.r||[0,0,0],at=o.at||[0,0,0];
 for(let i=0;i<t.p.length;i+=3){const lp=[t.p[i],t.p[i+1],t.p[i+2]],ln=[t.n[i],t.n[i+1],t.n[i+2]];
  const c=typeof col==='function'?col(lp,ln):col;
  const p=rot([lp[0]*s[0],lp[1]*s[1],lp[2]*s[2]],r),n=rot([ln[0]/s[0],ln[1]/s[1],ln[2]/s[2]],r),l=Math.hypot(n[0],n[1],n[2])||1;
  g.p.push(p[0]+at[0],p[1]+at[1],p[2]+at[2]);g.n.push(n[0]/l,n[1]/l,n[2]/l);g.c.push(c[0],c[1],c[2]);}
 return g;}
function tri(P,N,a,b,c,na,nb,nc){P.push(...a,...b,...c);N.push(...na,...nb,...nc);}
// Surface of revolution around y. prof: [[radius,y,hard?],...] bottom to top.
function lathe(prof,seg=14){
 const P=[],N=[],m=prof.length,sn=[];
 for(let i=0;i<m-1;i++){const dr=prof[i+1][0]-prof[i][0],dy=prof[i+1][1]-prof[i][1],l=Math.hypot(dr,dy)||1;sn.push([dy/l,-dr/l]);}
 const jn=(i,j)=>{if(prof[i][2]||i===0||i===m-1)return sn[j];const a=sn[i-1],b=sn[i],x=a[0]+b[0],y=a[1]+b[1],l=Math.hypot(x,y)||1;return [x/l,y/l];};
 for(let j=0;j<m-1;j++){const n0=jn(j,j),n1=jn(j+1,j),[r0,y0]=prof[j],[r1,y1]=prof[j+1];
  for(let k=0;k<seg;k++){const a0=k/seg*TAU,a1=(k+1)/seg*TAU,v=(r,y,a)=>[r*Math.cos(a),y,r*Math.sin(a)],nv=(n,a)=>[n[0]*Math.cos(a),n[1],n[0]*Math.sin(a)];
   const A=v(r0,y0,a0),B=v(r1,y1,a0),D2=v(r1,y1,a1),E=v(r0,y0,a1);
   if(r1>0)tri(P,N,A,B,D2,nv(n0,a0),nv(n1,a0),nv(n1,a1));
   if(r0>0)tri(P,N,A,D2,E,nv(n0,a0),nv(n1,a1),nv(n0,a1));}}
 return {p:P,n:N};}
function sphere(seg=12,rings=8){const prof=[];for(let i=0;i<=rings;i++){const t=i/rings*Math.PI;prof.push([Math.sin(t),-Math.cos(t)]);}prof[0][0]=0;prof[rings][0]=0;return lathe(prof,seg);}
const cylP=(r,h,r2=r)=>[[0,0],[r,0,1],[r2,h,1],[0,h]];
function cyl(r,h,seg=14,r2=r){return lathe(cylP(r,h,r2),seg);}
// Rounded box centred on its base: w (x), h (y), d (z), corner radius rad.
function rbox(w,h,d,rad=.04){
 const P=[],N=[],hs=[w/2,h/2,d/2],rr=Math.min(rad,w/2-.001,h/2-.001,d/2-.001),
  coords=a=>[-hs[a],-(hs[a]-rr),hs[a]-rr,hs[a]];
 const map=(p)=>{const inner=p.map((v,a)=>Math.max(-(hs[a]-rr),Math.min(hs[a]-rr,v)));const d0=p.map((v,a)=>v-inner[a]);const l=Math.hypot(...d0);
  if(l<1e-9)return null;const n=d0.map(v=>v/l);return {p:inner.map((v,a)=>v+n[a]*rr+(a===1?hs[1]:0)),n};};
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const u=(axis+1)%3,v=(axis+2)%3,cu=coords(u),cv=coords(v);
  for(let i=0;i<3;i++)for(let j=0;j<3;j++){const q=(a,b)=>{const p=[0,0,0];p[axis]=sign*hs[axis];p[u]=cu[a];p[v]=cv[b];let m=map(p);if(!m){const n=[0,0,0];n[axis]=sign;m={p:[p[0],p[1]+hs[1],p[2]],n};}return m;};
   const A=q(i,j),B=q(i+1,j),Cq=q(i+1,j+1),D=q(i,j+1);tri(P,N,A.p,B.p,Cq.p,A.n,B.n,Cq.n);tri(P,N,A.p,Cq.p,D.p,A.n,Cq.n,D.n);}}
 return {p:P,n:N};}
// Prism from a star-shaped polygon in the x/z plane, y=0..h.
function extrude(poly,h,smooth=false){
 const P=[],N=[],m=poly.length,cx=poly.reduce((s,p)=>s+p[0],0)/m,cz=poly.reduce((s,p)=>s+p[1],0)/m;
 const en=[];for(let i=0;i<m;i++){const a=poly[i],b=poly[(i+1)%m];let nx=b[1]-a[1],nz=-(b[0]-a[0]);const mx=(a[0]+b[0])/2-cx,mz=(a[1]+b[1])/2-cz;if(nx*mx+nz*mz<0){nx=-nx;nz=-nz;}const l=Math.hypot(nx,nz)||1;en.push([nx/l,0,nz/l]);}
 const vn=i=>{if(!smooth)return null;const a=en[(i-1+m)%m],b=en[i],x=a[0]+b[0],z=a[2]+b[2],l=Math.hypot(x,z)||1;return [x/l,0,z/l];};
 for(let i=0;i<m;i++){const a=poly[i],b=poly[(i+1)%m],na=vn(i)||en[i],nb=vn((i+1)%m)||en[i];
  tri(P,N,[a[0],0,a[1]],[b[0],0,b[1]],[b[0],h,b[1]],na,nb,nb);tri(P,N,[a[0],0,a[1]],[b[0],h,b[1]],[a[0],h,a[1]],na,nb,na);
  tri(P,N,[cx,h,cz],[a[0],h,a[1]],[b[0],h,b[1]],[0,1,0],[0,1,0],[0,1,0]);tri(P,N,[cx,0,cz],[b[0],0,b[1]],[a[0],0,a[1]],[0,-1,0],[0,-1,0],[0,-1,0]);}
 return {p:P,n:N};}
function torus(R,r,su=16,sv=8,arc=TAU){
 const P=[],N=[],pt=(u,v)=>{const cu=Math.cos(u),su_=Math.sin(u),cv=Math.cos(v),sv_=Math.sin(v);return {p:[(R+r*cv)*cu,r*sv_,(R+r*cv)*su_],n:[cv*cu,sv_,cv*su_]};};
 for(let i=0;i<su;i++)for(let j=0;j<sv;j++){const u0=i/su*arc,u1=(i+1)/su*arc,v0=j/sv*TAU,v1=(j+1)/sv*TAU,A=pt(u0,v0),B=pt(u1,v0),Cc=pt(u1,v1),D=pt(u0,v1);tri(P,N,A.p,B.p,Cc.p,A.n,B.n,Cc.n);tri(P,N,A.p,Cc.p,D.p,A.n,Cc.n,D.n);}
 return {p:P,n:N};}
const starPoly=(n,ro,ri,a0=-Math.PI/2)=>Array.from({length:n*2},(_,i)=>{const a=a0+i/(n*2)*TAU,r=i%2?ri:ro;return [Math.cos(a)*r,Math.sin(a)*r];});
const sectorPoly=(r,a0,a1,steps=8)=>[[0,0],...Array.from({length:steps+1},(_,i)=>{const a=a0+(a1-a0)*i/steps;return [Math.cos(a)*r,Math.sin(a)*r];})];
const roundPoly=(r,n=16,sx=1,sz=1)=>Array.from({length:n},(_,i)=>[Math.cos(i/n*TAU)*r*sx,Math.sin(i/n*TAU)*r*sz]);

// ---- Item kinds ---------------------------------------------------------
const KINDS={};
function kind(id,name,r,h,themes,build){KINDS[id]={id,name,r,h,themes,build};}
const EYE=C('#111318'),WHITE=C('#ffffff');
function eyes(g,y,z,dx,rr=.035){for(const sx of [-1,1]){add(g,sphere(8,6),{at:[sx*dx,y,z],s:rr*1.3},WHITE);add(g,sphere(6,4),{at:[sx*dx,y,z+rr*.7],s:rr*.75},EYE);}}

// Toys
kind('duck','Rubber Duck',.3,.5,['toys'],g=>{const Y=C('#ffc81e');
 add(g,sphere(14,9),{at:[0,.17,-.02],s:[.25,.17,.27]},Y);add(g,sphere(14,9),{at:[0,.38,.08],s:.14},Y);
 add(g,sphere(10,6),{at:[0,.35,.22],s:[.08,.035,.08]},C('#ff7a14'));add(g,sphere(8,5),{at:[0,.24,-.24],s:[.08,.06,.07],r:[-.6,0,0]},Y);
 add(g,sphere(10,6),{at:[0,.2,.05],s:[.27,.08,.2]},C('#ffb400'));eyes(g,.42,.19,.06);});
kind('octopus','Octopus',.3,.48,['toys'],g=>{const P=C('#e322c8');
 add(g,sphere(14,9),{at:[0,.25,0],s:[.19,.22,.19]},P);
 for(let i=0;i<8;i++){const a=i/8*TAU;add(g,sphere(8,6),{at:[Math.cos(a)*.17,.05,Math.sin(a)*.17],s:[.07,.05,.07]},mix(P,C('#ff8ae8'),.25));}
 eyes(g,.29,.16,.07,.04);});
kind('robot','Robot',.27,.62,['toys'],g=>{const B=C('#2fd2e6'),D=C('#178fa8');
 add(g,rbox(.3,.26,.24,.05),{at:[0,.12,0]},B);add(g,rbox(.26,.18,.22,.05),{at:[0,.39,0]},B);
 add(g,cyl(.012,.08),{at:[0,.57,0]},D);add(g,sphere(8,5),{at:[0,.66,0],s:.035},C('#ff4a5a'));
 for(const sx of [-1,1]){add(g,cyl(.045,.12),{at:[sx*.08,0,0]},D);add(g,sphere(8,5),{at:[sx*.06,.48,.11],s:.035},C('#ffe14a'));add(g,rbox(.06,.16,.06,.02),{at:[sx*.19,.16,0]},D);}
 add(g,rbox(.14,.07,.02,.01),{at:[0,.2,.12]},C('#ffe14a'));});
for(const [id,col] of [['lego-blue','#2e7bff'],['lego-purple','#8a3cf0'],['lego-yellow','#ffd21a'],['lego-pink','#ff5fb4'],['lego-teal','#25c7b2'],['lego-red','#e8283a'],['lego-green','#46c83a'],['lego-orange','#ff8a1e']])
 kind(id,'Lego Brick',.3,.28,['toys'],g=>{const c=C(col);add(g,rbox(.5,.2,.25,.025),{at:[0,0,0]},c);for(let i=0;i<4;i++)for(let j=0;j<2;j++)add(g,cyl(.045,.06,10),{at:[-.18+i*.12,.2,-.06+j*.12]},mix(c,WHITE,.08));});
for(const [id,base,spot] of [['ball-orange','#ffa25c','#ff6e1a'],['ball-pink','#ff7ad0','#e8299e']])
 kind(id,'Bouncy Ball',.28,.56,['toys'],g=>{const b=C(base),s=C(spot),sp=[[0,1,0],[.8,.4,.4],[-.7,.5,-.3],[.2,.3,.95],[-.4,-.1,.9],[.6,-.2,-.7],[-.9,-.1,.2]].map(v=>{const l=Math.hypot(...v);return v.map(x=>x/l);});
  add(g,sphere(18,12),{at:[0,.28,0],s:.28},(p)=>{for(const v of sp)if(p[0]*v[0]+p[1]*v[1]+p[2]*v[2]>.84)return s;return b;});});
kind('soccer','Soccer Ball',.85,1.7,['toys'],g=>{const dirs=[];for(let i=0;i<12;i++){const y=1-2*(i+.5)/12,r=Math.sqrt(1-y*y),a=i*2.4;dirs.push([Math.cos(a)*r,y,Math.sin(a)*r]);}
 add(g,sphere(28,18),{at:[0,.85,0],s:.85},(p)=>{for(const v of dirs)if(p[0]*v[0]+p[1]*v[1]+p[2]*v[2]>.93)return C('#1b1d24');return C('#f4f4f6');});});
kind('maraca','Maraca',.34,.24,['toys'],g=>{const st=[C('#3b8cff'),C('#ffffff'),C('#ff5a8a')];
 add(g,lathe([[0,0],[.08,.02],[.13,.1],[.12,.2],[.06,.27],[.025,.3],[.025,.5],[.035,.52],[0,.53]],12),{at:[0,.13,-.2],r:[Math.PI/2,0,0]},(p)=>p[1]>.29?C('#c98a4a'):st[Math.floor((p[1]+.02)*22)%3]);});
kind('star','Star',.3,.14,['toys'],g=>{add(g,extrude(starPoly(5,.3,.14),.13),{},C('#ffaa1e'));add(g,extrude(starPoly(5,.22,.1),.03),{at:[0,.13,0]},C('#ffd04a'));});
kind('plane','Toy Plane',.5,.3,['toys'],g=>{const B=C('#3a7bff'),Y=C('#ffd21a');
 add(g,lathe([[0,0],[.08,.04],[.1,.3],[.07,.62],[0,.7]],12),{at:[0,.14,-.35],r:[Math.PI/2,0,0]},B);
 add(g,rbox(.95,.04,.2,.02),{at:[0,.13,.02]},Y);add(g,rbox(.36,.03,.12,.015),{at:[0,.17,-.3]},Y);add(g,rbox(.03,.16,.12,.015),{at:[0,.2,-.3]},C('#ff4a4a'));
 add(g,rbox(.03,.18,.04,.01),{at:[0,.06,.36]},C('#cccccc'));});
kind('dice','Dice',.22,.3,['toys'],g=>{add(g,rbox(.3,.3,.3,.05),{},C('#ffdc2e'));for(const [x,z] of [[0,0],[-.08,-.08],[.08,.08],[-.08,.08],[.08,-.08]])add(g,sphere(6,4),{at:[x,.3,z],s:[.03,.012,.03]},EYE);for(const [x,y] of [[-.07,.08],[.07,.22]])add(g,sphere(6,4),{at:[x,y,.15],s:[.03,.03,.012]},EYE);});
kind('headphones','Headphones',.36,.2,['toys'],g=>{const P=C('#ff6fae');add(g,torus(.2,.035,14,6,Math.PI),{at:[0,.05,0],r:[-Math.PI/2,0,0]},P);
 for(const sx of [-1,1])add(g,cyl(.1,.09),{at:[sx*.21,0,0]},sx<0?C('#ffffff'):mix(P,WHITE,.4));});
kind('keyboard','Toy Piano',.5,.24,['toys'],g=>{add(g,rbox(.95,.16,.36,.05),{},C('#8b3cf2'));for(let i=0;i<9;i++)add(g,rbox(.085,.05,.18,.015),{at:[-.37+i*.093,.15,.05]},WHITE);for(const i of [0,1,3,4,5,7])add(g,rbox(.05,.05,.1,.01),{at:[-.32+i*.093,.19,0]},EYE);});
kind('gift','Gift Box',.3,.46,['toys','party'],g=>{const R=C('#ff3b4e'),Y=C('#ffd23a');add(g,rbox(.4,.32,.4,.03),{},R);add(g,rbox(.44,.06,.44,.02),{at:[0,.31,0]},R);
 add(g,rbox(.08,.38,.42,.01),{},Y);add(g,rbox(.42,.38,.08,.01),{},Y);for(const sx of [-1,1])add(g,torus(.07,.025,10,5),{at:[sx*.06,.42,0],r:[0,0,sx*.5]},Y);});
kind('crayon','Crayon',.3,.1,['toys'],g=>{const c=C('#ff6a2a');add(g,lathe([[0,0],[.05,0,1],[.05,.42,1],[.008,.56],[0,.57]],10),{at:[0,.05,-.27],r:[Math.PI/2,0,0]},(p)=>p[1]>.12&&p[1]<.32?mix(c,WHITE,.3):c);});

// Fruit
kind('cherry','Cherries',.2,.36,['fruit'],g=>{const R=C('#d8102c');for(const sx of [-1,1]){add(g,sphere(10,7),{at:[sx*.07,.09,0],s:.09},R);add(g,cyl(.01,.25),{at:[sx*.04,.15,0],r:[0,0,sx*.25]},C('#3e8a2a'));}add(g,sphere(8,5),{at:[0,.33,0],s:[.06,.02,.03]},C('#4ab030'));});
kind('strawberry','Strawberry',.2,.3,['fruit'],g=>{add(g,lathe([[0,0],[.06,.02],[.13,.1],[.16,.2],[.13,.27],[0,.28]],12),{},(p)=>((Math.floor(p[1]*40)+Math.floor(Math.atan2(p[2],p[0])*3))%5===0)?C('#ffe08a'):C('#ec1f37'));
 add(g,extrude(starPoly(5,.13,.05),.03),{at:[0,.27,0]},C('#3dbb3a'));});
for(const [id,name,col] of [['apple-red','Red Apple','#e8202c'],['apple-green','Green Apple','#7ed321']])
 kind(id,name,.3,.56,['fruit'],g=>{add(g,lathe([[0,.02],[.12,0],[.25,.1],[.3,.27],[.26,.45],[.13,.5],[0,.46]],14),{},C(col));add(g,cyl(.015,.12),{at:[0,.45,0],r:[0,0,.2]},C('#6b3e1e'));add(g,sphere(8,5),{at:[.07,.55,0],s:[.07,.015,.035],r:[0,.4,.3]},C('#3fa02c'));});
kind('orange','Orange',.3,.58,['fruit'],g=>{add(g,sphere(14,10),{at:[0,.29,0],s:[.3,.29,.3]},C('#ff8a12'));add(g,sphere(8,5),{at:[0,.58,0],s:[.05,.02,.05]},C('#3fa02c'));});
kind('pumpkin','Pumpkin',.75,1.1,['fruit'],g=>{const O=C('#ff7a0e');for(let i=0;i<8;i++){const a=i/8*TAU;add(g,sphere(12,9),{at:[Math.cos(a)*.38,.48,Math.sin(a)*.38],s:[.36,.46,.36]},mix(O,C('#ff9a3a'),i%2*.4));}
 add(g,sphere(12,8),{at:[0,.5,0],s:[.5,.48,.5]},O);add(g,cyl(.07,.25,8,.05),{at:[0,.9,0],r:[0,0,.2]},C('#5b8a2a'));});
kind('melon-slice','Watermelon Slice',.4,.2,['fruit'],g=>{const a0=-Math.PI/2-.6,a1=-Math.PI/2+.6;
 add(g,extrude(sectorPoly(.48,a0,a1,10).map(([x,z])=>[x,z+.24]),.16),{},C('#ec2a3a'));
 const rind=[];for(let i=0;i<=10;i++){const a=a0+(a1-a0)*i/10;rind.push([Math.cos(a)*.56,Math.sin(a)*.56+.24]);}for(let i=10;i>=0;i--){const a=a0+(a1-a0)*i/10;rind.push([Math.cos(a)*.46,Math.sin(a)*.46+.24]);}
 // rind as thin quads (non-convex, so build segment-wise)
 for(let i=0;i<10;i++){const q=[rind[i],rind[i+1],rind[21-i-1],rind[21-i]];add(g,extrude(q,.18),{},(p)=>Math.hypot(p[0],p[2]-.24)>.51?C('#38b03a'):C('#f2f7d6'));}
 for(const [x,z] of [[-.08,-.08],[.07,-.06],[0,-.16],[-.04,0],[.05,.04]])add(g,sphere(6,4),{at:[x,.165,z],s:[.025,.01,.04]},EYE);});
kind('watermelon','Watermelon',1.0,1.8,['fruit'],g=>{add(g,sphere(20,14),{at:[0,.88,0],s:[1,.88,1]},(p)=>{const a=Math.atan2(p[2],p[0]);return Math.sin(a*14+p[1]*3)>.2?C('#1f8a2c'):C('#4bc04a');});add(g,cyl(.05,.12),{at:[0,1.74,0]},C('#6b4a1e'));});
kind('pear','Pear',.3,.7,['fruit'],g=>{add(g,lathe([[0,0],[.18,.02],[.29,.15],[.27,.32],[.16,.48],[.11,.6],[.05,.67],[0,.68]],14),{},C('#b6d82e'));add(g,cyl(.015,.12),{at:[0,.66,0],r:[0,0,.3]},C('#6b3e1e'));});
kind('banana','Banana',.42,.16,['fruit'],g=>{add(g,torus(.32,.07,12,7,Math.PI*.9),{at:[0,.08,-.15],s:[1,1,1],r:[0,-Math.PI*.05,0]},(p)=>Math.atan2(p[2],p[0])<.2?C('#5b4a1e'):C('#ffd83a'));});
kind('grapes','Grapes',.3,.36,['fruit'],g=>{const P=C('#7a2bb8');const pts=[[0,.07,0],[.1,.07,.06],[-.1,.07,.06],[.06,.07,-.1],[-.07,.07,-.09],[0,.18,.04],[.08,.18,-.04],[-.08,.18,-.03],[0,.27,-.01]];for(const p of pts)add(g,sphere(8,6),{at:p,s:.075},mix(P,C('#a35ae0'),(p[1]*3)%1));add(g,cyl(.012,.08),{at:[0,.32,0]},C('#6b3e1e'));});

// Kitchen
for(const [id,name,col] of [['egg','Egg','#f6ead9'],['egg-brown','Brown Egg','#d8956a']])
 kind(id,name,.17,.4,['kitchen'],g=>{add(g,lathe([[0,0],[.1,.02],[.16,.12],[.15,.25],[.1,.36],[0,.4]],12),{},C(col));});
kind('fried-egg','Fried Egg',.33,.1,['kitchen'],g=>{add(g,extrude([[.3,0],[.22,.2],[0,.28],[-.24,.22],[-.3,0],[-.2,-.24],[.05,-.3],[.26,-.18]],.05,true),{},WHITE);add(g,sphere(10,6),{at:[.02,.05,0],s:[.11,.07,.11]},C('#ffb21a'));});
kind('croissant','Croissant',.36,.22,['kitchen'],g=>{add(g,torus(.2,.09,14,8,Math.PI*1.2),{at:[0,.09,.06],r:[0,Math.PI*.4,0],s:[1,.9,1]},(p)=>{const a=Math.atan2(p[2],p[0]);return Math.sin(a*12)>.4?C('#c9701c'):C('#f0a83a');});});
kind('burger','Burger',.32,.42,['kitchen'],g=>{const bun=C('#e89a3c');add(g,lathe([[0,0],[.27,0,1],[.29,.06],[0,.08]],14),{},bun);add(g,lathe([[0,.07],[.3,.07,1],[.3,.14,1],[0,.14]],14),{},C('#6a3518'));
 add(g,rbox(.48,.03,.48,.01),{at:[0,.14,0],r:[0,.6,0]},C('#ffd21a'));add(g,lathe([[0,.17],[.32,.17,1],[.33,.2],[0,.2]],14),{},C('#58c23a'));
 add(g,lathe([[0,.2],[.3,.2,1],[.29,.3],[.2,.39],[0,.42]],14),{},bun);for(let i=0;i<7;i++){const a=i*2.3;add(g,sphere(5,3),{at:[Math.cos(a)*.15,.39,Math.sin(a)*.15],s:[.02,.012,.03]},C('#fff3d6'));}});
kind('donut','Donut',.3,.2,['kitchen'],g=>{add(g,torus(.18,.1,14,8),{at:[0,.1,0]},(p,n)=>n[1]>.1?C('#ff7ab8'):C('#e8a050'));const sp=[C('#ffffff'),C('#3ad0ff'),C('#ffe14a')];for(let i=0;i<10;i++){const a=i*.7;add(g,rbox(.04,.012,.012,.004),{at:[Math.cos(a)*(.18+(i%3-1)*.04),.2,Math.sin(a)*(.18+(i%3-1)*.04)],r:[0,a*3,0]},sp[i%3]);}});
kind('cupcake','Cupcake',.3,.56,['kitchen','party'],g=>{add(g,lathe([[0,0],[.18,0,1],[.25,.24,1],[0,.24]],14),{},(p)=>Math.floor((Math.atan2(p[2],p[0])+4)*2.2)%2?C('#ff89c0'):WHITE);
 add(g,lathe([[0,.22],[.29,.24],[.27,.32],[.18,.38],[.13,.44],[.06,.5],[0,.51]],14),{},C('#fff1f8'));add(g,sphere(8,6),{at:[0,.55,0],s:.06},C('#e8102c'));});
kind('pie','Pie',.55,.26,['kitchen'],g=>{add(g,lathe([[0,0],[.45,0,1],[.55,.18,1],[.5,.2],[0,.2]],16),{},C('#e8a24a'));for(let i=-2;i<=2;i++){add(g,rbox(.1,.04,.8-Math.abs(i)*.14,.02),{at:[i*.17,.19,0]},C('#f6c06a'));add(g,rbox(.8-Math.abs(i)*.14,.04,.1,.02),{at:[0,.21,i*.17]},C('#f6c06a'));}});
kind('jam-jar','Jam Jar',1.3,2.4,['kitchen'],g=>{const R=C('#e0302a');
 add(g,lathe([[0,0],[1.1,0,1],[1.25,.25],[1.28,1.1],[1.18,1.75],[1.0,1.9,1],[0,1.9]],22),{},(p)=>{const a=Math.atan2(p[2],p[0]);return (Math.abs(((a*6/Math.PI)%1+1)%1-.5)+Math.abs(((p[1]*2.4)%1+1)%1-.5))<.22?C('#ffffff'):R;});
 add(g,lathe([[0,1.88],[1.32,1.86],[1.4,1.95],[1.25,2.2],[.9,2.32],[0,2.36]],22),{},(p)=>((Math.floor(p[0]*5+5)+Math.floor(p[2]*5+5))%2?C('#ff3c3c'):WHITE));
 add(g,torus(1.22,.07,22,6),{at:[0,2.02,0]},C('#d9a24a'));});
kind('juice-jar','Juice Jar',1.15,2.3,['kitchen'],g=>{add(g,lathe([[0,0],[1.0,0,1],[1.12,.2],[1.15,1.5],[1.0,1.85,1],[.9,1.9],[0,1.9]],22),{},(p)=>p[1]>.6&&p[1]<1.2?C('#fff4dc'):C('#ff8a1a'));add(g,cyl(.95,.4,22),{at:[0,1.88,0]},C('#f2f2f2'));});
kind('cheese','Cheese Wedge',.5,.45,['kitchen'],g=>{add(g,extrude(sectorPoly(.62,-.45,.45,6).map(([x,z])=>[x-.3,z]),.42),{},C('#ffc93a'));for(const [x,y,z] of [[.1,.2,.2],[-.05,.3,.08],[.2,.12,-.18]])add(g,sphere(8,5),{at:[x,y,z],s:[.06,.05,.06]},C('#e0a020'));});
kind('toast','Toast',.35,.1,['kitchen'],g=>{const poly=[[-.25,-.26],[.25,-.26],[.27,.1],[.2,.24],[0,.29],[-.2,.24],[-.27,.1]];add(g,extrude(poly,.08,true),{},C('#c47a2a'));add(g,extrude(poly.map(([x,z])=>[x*.84,z*.84-.01]),.02),{at:[0,.08,0]},C('#f6d9a0'));});
kind('sausage','Sausage',.3,.2,['kitchen'],g=>{add(g,sphere(12,8),{at:[0,.1,0],s:[.28,.1,.1],r:[0,.3,0]},(p)=>p[1]>.5?C('#d0603a'):C('#a8381e'));});
for(const [id,col] of [['cup-red','#e8232e'],['cup-green','#2a9a3a']])
 kind(id,'Party Cup',.24,.45,['kitchen','party'],g=>{add(g,lathe([[0,0],[.17,0,1],[.24,.45,1],[.21,.45],[.15,.04],[0,.04]],14),{},(p)=>p[1]>.36&&p[0]>.2?WHITE:C(col));});
kind('pot','Casserole Pot',.55,.55,['kitchen'],g=>{const B=C('#3aa0ec');add(g,lathe([[0,0],[.42,0,1],[.46,.06],[.46,.38,1],[0,.38]],18),{},B);add(g,lathe([[0,.37],[.48,.38],[.4,.47],[0,.5]],18),{},mix(B,WHITE,.15));add(g,sphere(8,5),{at:[0,.52,0],s:[.07,.04,.07]},C('#1e5f9a'));for(const sx of [-1,1])add(g,rbox(.12,.05,.14,.02),{at:[sx*.5,.3,0]},C('#1e5f9a'));});
kind('pan','Frying Pan',.55,.14,['kitchen'],g=>{const G=C('#36cfa2');add(g,lathe([[0,0],[.34,0,1],[.4,.1],[.36,.11],[.3,.03],[0,.03]],18),{},(p)=>p[1]<.035&&Math.hypot(p[0],p[2])<.3?C('#1f2a30'):G);add(g,rbox(.36,.04,.07,.02),{at:[.56,.06,0]},G);});
kind('egg-carton','Egg Carton',.7,.32,['kitchen'],g=>{add(g,rbox(.9,.14,.6,.04),{},C('#c99a62'));for(let i=0;i<4;i++)for(let j=0;j<2;j++)add(g,lathe([[0,0],[.08,.02],[.11,.1],[.08,.17],[0,.2]],10),{at:[-.3+i*.2,.12,-.13+j*.26]},C('#f6ead9'));});
kind('crate','Wooden Crate',.52,.75,['kitchen','fruit','toys','sushi'],g=>{add(g,rbox(.74,.72,.74,.03),{},(p,n)=>{const t=Math.abs(n[1])>.5?p[0]:(Math.abs(n[0])>.5?p[1]:p[1]);return Math.floor((t+1)*7)%2?C('#b8783e'):C('#cf8e4e');});for(const sx of [-1,1])for(const sz of [-1,1])add(g,rbox(.07,.74,.07,.01),{at:[sx*.35,0,sz*.35]},C('#8a5428'));});
kind('pillar','Cake Pillar',.4,.9,['kitchen','party'],g=>{for(let i=0;i<6;i++)add(g,cyl(.32,.15,14,.3),{at:[0,i*.15,0]},i%2?C('#7a4422'):C('#9a5a2e'));});

// Sweet shop (from the owner's second video: popsicle spirals around Lego towers)
for(const [id,cols] of [['popsicle-yellow',['#ffd21a']],['popsicle-lime',['#b8f02a']],['popsicle-orange',['#ff9a1e']],['popsicle-blue',['#2ec8f0']],['popsicle-pink',['#ff6fb4']],['popsicle-rainbow',['#ff3b4e','#ffd21a','#5ee06a']]])
 kind(id,'Popsicle',.3,.13,['treats'],g=>{const band=p=>{const t=Math.max(0,Math.min(.999,(p[2]+.25)/.36));return C(cols[Math.floor(t*cols.length)]);};
  add(g,rbox(.27,.11,.38,.1),{at:[0,0,-.06]},band);add(g,rbox(.07,.04,.22,.02),{at:[0,.03,.22]},C('#e8c890'));});
kind('kiwi','Kiwi Slice',.24,.09,['fruit','treats'],g=>{add(g,cyl(.24,.08,16),{},(p,n)=>{const r=Math.hypot(p[0],p[2]);if(n[1]<.5&&r>.2)return C('#7a5a2a');if(r<.05)return C('#f4f0c8');if(r<.1&&Math.floor(Math.atan2(p[2],p[0])*4+8)%2)return C('#2a2010');return r>.21?C('#8ac43a'):C('#9ed64a');});});
kind('tomato','Tomato',.26,.42,['fruit','kitchen'],g=>{add(g,sphere(14,9),{at:[0,.2,0],s:[.26,.2,.26]},C('#e8302a'));add(g,extrude([[.1,0],[.03,.03],[0,.1],[-.03,.03],[-.1,0],[-.03,-.03],[0,-.1],[.03,-.03]],.02),{at:[0,.39,0]},C('#3fa02c'));});
// Sushi
kind('nigiri','Salmon Nigiri',.3,.24,['sushi'],g=>{add(g,rbox(.48,.13,.22,.07),{},C('#fbfbf6'));add(g,rbox(.54,.08,.26,.05),{at:[0,.12,0]},(p)=>Math.sin(p[0]*36+p[2]*10)>.6?C('#ffd2b4'):C('#ff7a3a'));});
kind('tamago','Tamago Nigiri',.3,.26,['sushi'],g=>{add(g,rbox(.48,.13,.22,.07),{},C('#fbfbf6'));add(g,rbox(.5,.1,.24,.03),{at:[0,.12,0]},C('#ffd84a'));add(g,rbox(.1,.25,.27,.01),{at:[0,0,0]},C('#1d2a22'));});
kind('maki','Maki Roll',.2,.24,['sushi'],g=>{add(g,cyl(.19,.22,14),{},C('#14281c'));add(g,cyl(.16,.23,12),{},(p)=>Math.hypot(p[0],p[2])<.07?C('#ff6a4a'):(Math.hypot(p[0],p[2])<.1?C('#7ad06a'):C('#fbfbf6')));});
kind('onigiri','Onigiri',.34,.48,['sushi'],g=>{add(g,extrude([[-.3,0],[.3,0],[.22,.25],[.08,.42],[-.08,.42],[-.22,.25]],.22,true),{at:[0,0,.11],r:[-Math.PI/2,0,0]},C('#fbfbf6'));add(g,rbox(.3,.2,.24,.02),{at:[0,0,0]},C('#14281c'));});
kind('chopsticks','Chopsticks',.48,.06,['sushi'],g=>{for(const sx of [-1,1])add(g,rbox(.035,.035,.9,.012),{at:[sx*.04,0,0],r:[0,sx*.04,0]},(p)=>p[2]>.25?C('#c8202a'):C('#e8c890'));});
kind('soy-dish','Soy Dish',.36,.1,['sushi'],g=>{add(g,lathe([[0,0],[.22,0,1],[.34,.09],[.3,.1],[0,.05]],16),{},(p)=>p[1]>.04&&Math.hypot(p[0],p[2])<.29?C('#3a1a0e'):WHITE);});

// ---- Props from the owner's third video (Hard Level 30, Levels 31-34) ----
const PI=Math.PI;
// Level 30 (bakery & veg)
kind('blueberry','Blueberry',.12,.2,['treats','fruit'],g=>{add(g,sphere(10,7),{at:[0,.1,0],s:[.12,.1,.12]},C('#2f5fe0'));add(g,extrude(starPoly(5,.05,.025),.02),{at:[0,.19,0]},C('#1d3a9a'));});
kind('choc-muffin','Chocolate Muffin',.3,.5,['treats'],g=>{add(g,lathe([[0,0],[.19,0,1],[.25,.22,1],[0,.22]],14),{},(p)=>Math.floor((Math.atan2(p[2],p[0])+4)*2.2)%2?C('#c98a4a'):C('#b07438'));
 add(g,lathe([[0,.2],[.3,.22],[.29,.3],[.2,.37],[0,.4]],14),{},C('#5a2e18'));add(g,lathe([[0,.36],[.12,.37],[.08,.42],[0,.43]],10),{},C('#fff2e0'));add(g,sphere(8,6),{at:[0,.47,0],s:.06},C('#e8102c'));});
for(const [id,name,foam,art] of [['latte','Latte','#c9874a','#fff3e0'],['matcha','Matcha Latte','#9cc25a','#f6f7e6']])
 kind(id,name,.26,.22,['treats','kitchen'],g=>{add(g,lathe([[0,0],[.25,0,1],[.27,.02],[.25,.04],[0,.04]],16),{},WHITE);
  add(g,lathe([[0,.04],[.12,.04,1],[.19,.2,1],[.17,.2],[0,.18]],16),{},(p)=>p[1]>.17&&Math.hypot(p[0],p[2])<.17?(Math.abs(Math.hypot(p[0]*1.2,p[2]+.03)-.07)<.025||Math.hypot(p[0],p[2]+.03)<.03?C(art):C(foam)):WHITE);
  add(g,torus(.05,.015,8,5,PI),{at:[.2,.12,0],r:[PI/2,0,PI/2]},WHITE);});
kind('cabbage','Cabbage',.9,1.6,['fruit','kitchen'],g=>{add(g,sphere(18,12),{at:[0,.8,0],s:[.9,.8,.9]},(p,n)=>{const v=Math.sin(Math.atan2(p[2],p[0])*7+p[1]*4);return v>.75?C('#d8ef9a'):mix(C('#8cc63a'),C('#a8d84e'),p[1]*.5+.5);});
 for(let i=0;i<5;i++){const a=i/5*TAU;add(g,sphere(10,6),{at:[Math.cos(a)*.55,.62,Math.sin(a)*.55],s:[.45,.6,.18],r:[0,-a,0]},C('#9cd048'));}});
for(const [id,name,body,top] of [['carrot','Carrot','#ff7a1a','#3fa02c'],['radish','White Radish','#f4f0e6','#5aa83a']])
 kind(id,name,.3,.13,['fruit','kitchen'],g=>{add(g,lathe([[0,0],[.07,.06],[.06,.3],[.02,.45],[0,.48]],10),{at:[0,.07,.16],r:[-PI/2,0,0]},(p)=>Math.floor(p[1]*28)%3===0?mix(C(body),EYE,.12):C(body));
  for(const a of [-.4,0,.4])add(g,sphere(6,4),{at:[Math.sin(a)*.05,.08,.2+Math.cos(a)*.06],s:[.025,.025,.08],r:[0,a,0]},C(top));});
kind('tray-strawberry','Strawberry Tray',.55,.2,['fruit','kitchen'],g=>{add(g,rbox(.9,.12,.6,.04),{},C('#3dbb4a'));for(let i=0;i<4;i++)for(let j=0;j<2;j++)add(g,sphere(8,6),{at:[-.3+i*.2,.15,-.12+j*.24],s:[.09,.08,.09]},C('#e8263a'));});
kind('tray-cookies','Cookie Tray',.6,.12,['treats'],g=>{add(g,rbox(1.0,.06,.66,.03),{},C('#c2c8d2'));for(let i=0;i<4;i++)for(let j=0;j<3;j++)add(g,extrude(starPoly(5,.08,.04),.03),{at:[-.33+i*.22,.06,-.2+j*.2]},C('#ffc93a'));});
kind('cookie-box','Chocolate Cookies Box',.7,.95,['treats'],g=>{add(g,rbox(1.0,.95,.5,.04),{},(p,n)=>n[2]>.5&&p[1]>.35&&p[1]<.62?C('#5a2e18'):C('#ff8a2a'));add(g,rbox(.7,.04,.05,.01),{at:[0,.5,.26]},C('#fff2e0'));
 for(const [x,y] of [[-.3,.2],[0,.25],[.3,.18],[-.15,.78],[.2,.8]])add(g,cyl(.08,.02,10),{at:[x,y,.25],r:[PI/2,0,0]},C('#a5652e'));});
for(const [id,col] of [['snack-purple','#8a3cf0'],['snack-orange','#ff9a1e']])
 kind(id,'Snack Bag',.26,.1,['treats'],g=>{add(g,rbox(.36,.08,.46,.04),{},(p)=>Math.abs(p[2])>.2?mix(C(col),WHITE,.25):C(col));add(g,cyl(.08,.01,12),{at:[0,.08,0]},C('#fff2e0'));});
kind('candy','Wrapped Candy',.14,.08,['treats'],g=>{add(g,sphere(8,6),{at:[0,.06,0],s:[.07,.055,.07]},C('#ff3b4e'));for(const sx of [-1,1])add(g,lathe([[0,0],[.05,.06],[0,.07]],6),{at:[sx*.06,.06,0],r:[0,0,-sx*PI/2]},C('#ffd23a'));});
kind('cakepop','Cake Pop',.15,.12,['treats'],g=>{add(g,sphere(8,6),{at:[0,.08,-.08],s:.08},C('#9ad83a'));add(g,cyl(.012,.22,6),{at:[0,.06,-.02],r:[-PI/2,0,0]},WHITE);});
kind('bread','Swirl Loaf',.55,.42,['kitchen','treats'],g=>{add(g,rbox(.5,.4,.95,.18),{},(p)=>Math.sin(p[0]*12+p[1]*14)>.55?C('#7a3a12'):C('#d27a2a'));});
kind('hotdog','Hot Dog',.42,.2,['kitchen'],g=>{add(g,sphere(12,8),{at:[0,.08,0],s:[.15,.08,.4]},C('#f2b25a'));add(g,sphere(12,8),{at:[0,.13,0],s:[.08,.07,.45]},C('#b8442a'));for(let i=0;i<4;i++)add(g,rbox(.12,.015,.03,.008),{at:[0,.2,-.24+i*.16],r:[0,.6,0]},C('#ffd21a'));});
kind('eggplant','Eggplant',.5,.3,['fruit','kitchen'],g=>{add(g,lathe([[0,0],[.12,.05],[.16,.3],[.13,.55],[.08,.7],[0,.75]],12),{at:[0,.15,.38],r:[-PI/2,0,0],s:[1.2,1,1.2]},C('#7a2bb8'));add(g,extrude(starPoly(5,.1,.05),.04),{at:[0,.12,-.38],r:[PI/2,0,0]},C('#3fa02c'));});
for(const [id,a,b] of [['block-red','#ff6a5a','#ffb0a0'],['block-blue','#3ab8f0','#a8e4ff'],['block-green','#9ad83a','#d8f49a'],['block-yellow','#ffc93a','#ffe9a0']])
 kind(id,'Toy Block',.7,1.0,['toys'],g=>{add(g,rbox(1.0,1.0,1.0,.06),{},(p)=>(Math.floor(p[0]*8+8)+Math.floor(p[1]*8)+Math.floor(p[2]*8+8))%2?C(a):C(b));});
kind('cannoli','Cannoli',.28,.12,['treats'],g=>{add(g,cyl(.07,.4,10),{at:[0,.07,-.2],r:[PI/2,0,0]},C('#e8a050'));for(const z of [-.22,.22])add(g,sphere(8,5),{at:[0,.07,z],s:[.06,.06,.04]},C('#fff2e0'));});
kind('jelly','Blue Jelly',.25,.25,['treats'],g=>{add(g,lathe([[0,0],[.22,0,1],[.18,.2],[.1,.24],[0,.25]],8),{},C('#3ab8f0'));add(g,sphere(8,5),{at:[0,.26,0],s:.06},C('#fff2e0'));});
// Level 31 (sea & toys)
kind('shark','Toy Shark',.6,.35,['toys'],g=>{const B=C('#3a7be8');add(g,sphere(14,9),{at:[0,.17,0],s:[.18,.15,.55]},(p)=>p[1]<-.4?C('#dfe8f6'):B);add(g,extrude([[0,0],[.2,0],[0,.25]],.04),{at:[-.02,.27,-.05],r:[0,PI/2,0]},B);
 add(g,extrude([[0,0],[.25,.12],[.25,-.12]],.04),{at:[0,.17,-.5],r:[PI/2,0,0]},B);for(const sx of [-1,1])add(g,sphere(6,4),{at:[sx*.1,.22,.35],s:.03},EYE);});
kind('pineapple-toy','Pineapple Buddy',.3,.48,['toys'],g=>{add(g,sphere(12,8),{at:[0,.2,0],s:[.24,.2,.24]},(p)=>(Math.floor(p[1]*6+6)+Math.floor(Math.atan2(p[2],p[0])*2))%2?C('#ffc21e'):C('#ffad14'));
 for(let i=0;i<5;i++){const a=i/5*TAU;add(g,sphere(6,4),{at:[Math.cos(a)*.05,.42,Math.sin(a)*.05],s:[.03,.09,.03],r:[Math.sin(a)*.5,0,Math.cos(a)*.5]},C('#4ab030'));}
 for(const sx of [-1,1])add(g,torus(.05,.015,10,5),{at:[sx*.07,.25,.21],r:[PI/2,0,0]},C('#2ab0e0'));eyes(g,.25,.22,.07,.03);});
for(const [id,body] of [['penguin','#3a8af0'],['penguin-green','#6ad048']])
 kind(id,'Toy Penguin',.24,.42,['toys'],g=>{add(g,sphere(12,8),{at:[0,.2,0],s:[.2,.21,.19]},(p)=>p[2]>.35?WHITE:C(body));add(g,sphere(8,5),{at:[0,.25,.2],s:[.05,.03,.05]},C('#ff9a1e'));eyes(g,.3,.17,.06,.03);});
kind('frog-ball','Green Fish',.3,.3,['toys'],g=>{add(g,sphere(12,8),{at:[0,.15,0],s:[.26,.15,.22]},C('#8ad83a'));add(g,extrude([[0,0],[.12,.08],[.12,-.08]],.03),{at:[0,.15,-.22],r:[PI/2,0,0]},C('#6ab828'));eyes(g,.22,.16,.08,.04);});
kind('pig','Toy Pig',.55,.6,['toys'],g=>{const P=C('#ff9ab8');add(g,sphere(14,10),{at:[0,.32,0],s:[.42,.3,.5]},P);add(g,cyl(.12,.08,10),{at:[0,.34,.48],r:[PI/2,0,0]},mix(P,C('#ff6a9a'),.4));
 for(const sx of [-1,1]){add(g,extrude([[0,0],[.1,.06],[.04,.14]],.03),{at:[sx*.18,.58,.25]},P);for(const sz of [-1,1])add(g,cyl(.07,.12,8),{at:[sx*.22,0,sz*.25]},P);}eyes(g,.44,.42,.12,.04);});
kind('dolphin','Toy Dolphin',.55,.5,['toys'],g=>{const B=C('#48b8f0');add(g,sphere(14,9),{at:[0,.22,0],s:[.18,.2,.5]},B);add(g,lathe([[0,0],[.06,.05],[0,.15]],8),{at:[0,.22,.55],r:[PI/2,0,0]},B);add(g,extrude([[0,0],[.18,0],[0,.22]],.04),{at:[0,.38,0],r:[0,PI/2,0]},B);eyes(g,.3,.32,.08,.03);});
kind('boat','Toy Boat',.55,.45,['toys'],g=>{add(g,extrude([[-.25,-.5],[.25,-.5],[.25,.25],[0,.55],[-.25,.25]],.2,true),{},(p)=>p[1]<.08?C('#ffffff'):C('#3a7be8'));add(g,rbox(.3,.2,.4,.05),{at:[0,.2,-.1]},C('#f2f6ff'));add(g,rbox(.32,.03,.42,.02),{at:[0,.4,-.1]},C('#3a7be8'));});
kind('fox','Toy Fox',.3,.4,['toys'],g=>{const O=C('#ff8a2a');add(g,sphere(12,8),{at:[0,.17,0],s:[.2,.16,.24]},O);add(g,sphere(10,7),{at:[0,.3,.16],s:.13},O);for(const sx of [-1,1])add(g,extrude([[0,0],[.07,.03],[.02,.11]],.03),{at:[sx*.08,.38,.14]},O);add(g,sphere(8,5),{at:[0,.27,.3],s:[.05,.04,.04]},WHITE);eyes(g,.33,.27,.05,.025);});
kind('pearl','Pearl',.1,.18,['toys'],g=>{add(g,sphere(10,7),{at:[0,.09,0],s:.09},C('#f6f2f2'));});
kind('pin-stack','Stacking Toy',.17,.42,['toys'],g=>{add(g,lathe([[0,0],[.15,0,1],[.16,.18],[.12,.22,1],[0,.22]],12),{},C('#ff9a2a'));add(g,lathe([[0,.22],[.13,.22,1],[.12,.36],[.06,.42],[0,.42]],12),{},C('#2ec8f0'));});
kind('lego-long','Long Lego Brick',.5,.2,['toys'],g=>{const c=C('#8a3cf0');add(g,rbox(.25,.18,.95,.02),{},c);for(let i=0;i<6;i++)add(g,cyl(.045,.05,8),{at:[0,.18,-.39+i*.156]},mix(c,WHITE,.08));});
// Level 32 (toy shop)
kind('alien-bot','Alien Bot',.3,.48,['toys'],g=>{const G=C('#8ad83a');add(g,sphere(12,8),{at:[0,.22,0],s:[.24,.22,.22]},G);add(g,rbox(.28,.12,.06,.05),{at:[0,.22,.18]},C('#1b2a4a'));for(const sx of [-1,1])add(g,sphere(6,4),{at:[sx*.07,.28,.22],s:.03},C('#3ad0ff'));
 for(const sx of [-1,1]){add(g,cyl(.012,.12,6),{at:[sx*.09,.4,0],r:[0,0,-sx*.4]},G);add(g,sphere(6,4),{at:[sx*.14,.52,0],s:.03},C('#ffd23a'));}});
kind('toy-car','Toy Car',.38,.26,['toys'],g=>{const O=C('#ff8a2a');add(g,rbox(.3,.14,.66,.05),{at:[0,.06,0]},O);add(g,rbox(.26,.1,.3,.04),{at:[0,.2,-.05]},mix(O,C('#ffb060'),.4));
 for(const sx of [-1,1])for(const sz of [-1,1])add(g,cyl(.07,.06,10),{at:[sx*.17,.07,sz*.22],r:[0,0,PI/2]},EYE);});
kind('mixer','Stand Mixer',.5,.75,['kitchen'],g=>{const R=C('#e8302a');add(g,rbox(.5,.08,.6,.03),{},R);add(g,rbox(.16,.6,.16,.05),{at:[0,0,-.2]},R);add(g,rbox(.24,.18,.5,.08),{at:[0,.58,-.02]},R);add(g,lathe([[0,0],[.14,.02],[.2,.18],[.19,.22,1],[0,.22]],14),{at:[0,.08,.08]},C('#d0d4dc'));});
kind('pawn','White Pawn',.12,.32,['toys'],g=>{add(g,lathe([[0,0],[.11,0,1],[.11,.04],[.06,.08],[.04,.2],[.07,.22],[.04,.24],[.07,.28],[.05,.32],[0,.33]],10),{},C('#eef0f4'));});
for(const [id,name,col] of [['smoothie-green','Lime Smoothie','#8ad83a'],['milkshake','Milkshake','#ff9ab8'],['milkshake-blue','Blue Shake','#3a8af0']])
 kind(id,name,.2,.48,['treats','kitchen'],g=>{add(g,lathe([[0,0],[.13,0,1],[.18,.32,1],[0,.32]],12),{},C(col));add(g,lathe([[0,.31],[.18,.31],[.15,.38],[.06,.43],[0,.44]],12),{},WHITE);add(g,cyl(.015,.22,6),{at:[.05,.3,0],r:[0,0,-.3]},C('#e8302a'));});
// Level 33 (market)
kind('corn','Corn Cob',.32,.15,['fruit','kitchen'],g=>{add(g,sphere(12,8),{at:[0,.08,0],s:[.09,.08,.3]},(p)=>(Math.floor(p[2]*14+14)+Math.floor(Math.atan2(p[1],p[0])*3))%2?C('#ffd23a'):C('#ffb800'));for(const sx of [-1,1])add(g,sphere(6,4),{at:[sx*.05,.08,.12],s:[.04,.04,.2],r:[0,sx*.3,0]},C('#5aa83a'));});
kind('cake-pink','Pink Layer Cake',.45,.85,['treats'],g=>{for(const [r,y,hh,c] of [[.42,0,.28,'#ffd0e0'],[.32,.28,.25,'#ff9ab8'],[.22,.53,.2,'#fff0f6']])add(g,cyl(r,hh,16),{at:[0,y,0]},C(c));for(let i=0;i<3;i++){const a=i/3*TAU;add(g,cyl(.02,.12,6),{at:[Math.cos(a)*.1,.73,Math.sin(a)*.1]},C(['#3a8af0','#ffd23a','#e8302a'][i]));}});
kind('lollipop','Swirl Lollipop',.24,.45,['treats'],g=>{add(g,cyl(.015,.25,6),{},WHITE);add(g,cyl(.18,.06,16),{at:[0,.25,.03],r:[PI/2-.4,0,0]},(p)=>Math.sin(Math.atan2(p[2],p[0])*2+Math.hypot(p[0],p[2])*40)>0?C('#a83cf0'):C('#ff7ab8'));});
kind('macaron','Green Macaron',.24,.25,['treats'],g=>{const G=C('#8ad83a');add(g,cyl(.22,.09,14),{},G);add(g,cyl(.19,.06,14),{at:[0,.09,0]},C('#f6f2e0'));add(g,lathe([[0,.15],[.22,.15],[.2,.22],[0,.25]],14),{},G);});
kind('shrimp','Tempura Shrimp',.25,.14,['sushi','kitchen'],g=>{add(g,torus(.12,.06,10,6,PI*1.1),{at:[0,.07,0]},C('#ff7a2a'));add(g,extrude([[0,0],[.08,.05],[.08,-.05]],.02),{at:[.12,.06,-.04]},C('#ff4a2a'));});
kind('pepper','Bell Pepper',.3,.36,['fruit','kitchen'],g=>{for(let i=0;i<4;i++){const a=i/4*TAU;add(g,sphere(10,7),{at:[Math.cos(a)*.1,.16,Math.sin(a)*.1],s:[.17,.17,.17]},C('#e8201a'));}add(g,cyl(.03,.1,6),{at:[0,.3,0]},C('#3fa02c'));});
kind('teapot','Teapot',.45,.5,['kitchen'],g=>{const T=C('#e8783a');add(g,sphere(14,9),{at:[0,.22,0],s:[.3,.22,.3]},T);add(g,sphere(8,5),{at:[0,.45,0],s:[.1,.04,.1]},WHITE);add(g,cyl(.04,.25,6),{at:[.28,.15,0],r:[0,0,-.9]},T);add(g,torus(.1,.025,8,5,PI),{at:[-.3,.25,0],r:[PI/2,0,PI/2]},T);});
kind('pot-pink','Pink Pot',.45,.5,['kitchen'],g=>{const B=C('#ff8ac0');add(g,lathe([[0,0],[.36,0,1],[.38,.05],[.38,.32,1],[0,.32]],16),{},B);add(g,lathe([[0,.31],[.4,.32],[.33,.4],[0,.42]],16),{},mix(B,WHITE,.2));add(g,sphere(8,5),{at:[0,.44,0],s:[.06,.03,.06]},WHITE);});
// Level 34 (diner)
kind('waffle','Waffle',.36,.08,['treats','kitchen'],g=>{add(g,cyl(.36,.07,18),{},(p,n)=>n[1]>.5&&(Math.abs(((p[0]*9)%1+1)%1-.5)<.12||Math.abs(((p[2]*9)%1+1)%1-.5)<.12)?C('#c87a2a'):C('#f0b25a'));});
for(const [id,col] of [['candy-pink','#ff6ad0'],['candy-purple','#a83cf0'],['candy-orange','#ffb02a']])
 kind(id,'Candy Square',.13,.07,['treats'],g=>{add(g,rbox(.18,.06,.18,.02),{},C(col));add(g,rbox(.06,.02,.06,.01),{at:[0,.06,0]},WHITE);});
kind('cake-strawberry','Strawberry Cake',.5,.5,['treats'],g=>{add(g,cyl(.45,.36,18),{},(p)=>Math.sin(p[0]*30)*Math.sin(p[2]*30)>.6?C('#e8263a'):C('#fff0f4'));add(g,cyl(.47,.05,18),{at:[0,.34,0]},C('#ffd0e0'));add(g,sphere(10,7),{at:[0,.45,0],s:.1},C('#e8263a'));});
kind('jar-orange','Orange Jam Jar',.6,1.0,['kitchen'],g=>{add(g,lathe([[0,0],[.5,0,1],[.56,.12],[.56,.7],[.5,.8,1],[0,.8]],18),{},(p)=>p[1]>.3&&p[1]<.56?C('#fff4dc'):C('#ff8a1a'));add(g,cyl(.46,.2,18),{at:[0,.8,0]},C('#f2f2f2'));});
kind('jar-apple','Apple Juice Jar',.6,1.0,['kitchen'],g=>{add(g,lathe([[0,0],[.5,0,1],[.56,.12],[.56,.7],[.5,.8,1],[0,.8]],18),{},(p)=>p[1]>.3&&p[1]<.56?C('#fff4dc'):C('#9ad83a'));add(g,cyl(.46,.2,18),{at:[0,.8,0]},C('#d8dce4'));});
kind('cake-birthday','Birthday Cake',.9,1.1,['treats'],g=>{for(const [r,y,hh] of [[.85,0,.4],[.62,.4,.35],[.4,.75,.25]])add(g,cyl(r,hh,20),{at:[0,y,0]},(p)=>Math.sin(p[0]*40+p[1]*20)*Math.sin(p[2]*40)>.7?C(['#3a8af0','#ffd23a','#5ee06a'][Math.floor(Math.abs(p[0]*10))%3]):C('#ff9ac8'));for(let i=0;i<3;i++)add(g,cyl(.03,.18,6),{at:[(i-1)*.15,1.0,0]},C(['#3a8af0','#ffd23a','#e8302a'][i]));});
// Hazard from the owner's video: a glowing red bomb with a radiation sign. Swallow it and it explodes (turn over).
kind('bomb','Bomb',.45,.9,['hazard'],g=>{const R=C('#e0202a');add(g,sphere(18,12),{at:[0,.45,0],s:.45},R);add(g,cyl(.06,.1,10),{at:[0,.85,0]},C('#3a3a40'));
 const face=[-.64,0,0],at=[0,.45+.45*.62*1.0,.45*.78];add(g,cyl(.22,.02,18),{at,r:[PI/2-.66,0,0]},C('#ffd21a'));
 for(let i=0;i<3;i++)add(g,extrude(sectorPoly(.19,-PI/6+i*TAU/3,PI/6+i*TAU/3,5).map(([x,z])=>[x,z]),.015),{at:[at[0],at[1]+.012*.78,at[2]+.012*.62],r:[PI/2-.66,0,0]},C('#141418'));
 add(g,cyl(.045,.03,10),{at:[at[0],at[1]+.012,at[2]+.012],r:[PI/2-.66,0,0]},C('#141418'));});
// ShambConkins cameos (owner asked for occasional ones)
kind('rum-ham','Rum Ham',.4,.42,['cameo'],g=>{add(g,sphere(14,10),{at:[0,.16,0],s:[.34,.24,.3]},(p)=>p[1]>.55?C('#f08a7a'):C('#c9583e'));add(g,cyl(.05,.4),{at:[.2,.22,0],r:[0,0,-1.2]},C('#fff6e6'));for(const dy of [-.05,.05])add(g,sphere(8,6),{at:[.58,.36+dy,0],s:.06},C('#fff6e6'));});
kind('fight-milk','Fight Milk',.2,.56,['cameo'],g=>{add(g,lathe([[0,0],[.16,0,1],[.17,.32],[.1,.44],[.07,.48,1],[0,.48]],14),{},(p)=>p[1]>.12&&p[1]<.26?C('#d8232a'):WHITE);add(g,cyl(.08,.08),{at:[0,.48,0]},C('#d8232a'));});
kind('head','Head Token',.3,.45,['cameo'],g=>{add(g,cyl(.27,.07,20),{at:[0,.22,0],r:[.87,0,0]},C('#ffc93a'));add(g,torus(.27,.03,20,6),{at:[0,.22,0],r:[.87,0,0]},C('#ffe27a'));add(g,rbox(.3,.06,.18,.02),{at:[0,0,-.05]},C('#d99a1e'));});
// Levels 2-4 from the owner's Oct 14 phone video (sizes measured against the Size 1 hole: black opening = 1.0 across).
kind('orange-slice','Orange Slice',.27,.08,['fruit'],g=>{add(g,cyl(.27,.07,22),{},(p,n)=>{const r=Math.hypot(p[0],p[2]);if(n[1]<.5)return C('#f39a1c');if(r>.25)return C('#f7a828');if(r>.225)return C('#fff6dc');const a=Math.atan2(p[2],p[0]);return Math.abs(((a/TAU*9)%1+1)%1-.5)>.44||r<.03?C('#fff6dc'):C('#ffd660');});});
kind('dice-white','Dice',.33,.46,['toys'],g=>{add(g,rbox(.46,.46,.46,.08),{},C('#f4f4f6'));const P=C('#1c1d22');
 for(const [x,z] of [[-.12,-.12],[-.12,0],[-.12,.12],[.12,-.12],[.12,0],[.12,.12]])add(g,sphere(6,4),{at:[x,.46,z],s:[.045,.012,.045]},P);
 for(const [x,y] of [[-.12,.11],[.12,.11],[0,.23],[-.12,.35],[.12,.35]])add(g,sphere(6,4),{at:[x,y,.23],s:[.045,.045,.012]},P);
 for(const [z,y] of [[-.12,.11],[.12,.11],[-.12,.35],[.12,.35]])add(g,sphere(6,4),{at:[.23,y,z],s:[.012,.045,.045]},P);});
for(const [id,name,col] of [['jelly-green','Green Jelly','#86dc22'],['jelly-red','Red Jelly','#ec1a22'],['jelly-orange','Orange Jelly','#ff9c12']])
 kind(id,name,.5,.5,['treats'],g=>{const c=C(col),hi=mix(c,WHITE,.25),lo=mix(c,C('#000000'),.25);
  for(let i=0;i<8;i++){const a=i/8*TAU;add(g,sphere(12,9),{at:[Math.cos(a)*.3,.21,Math.sin(a)*.3],s:[.2,.22,.2]},(p)=>p[1]>.3?hi:c);}
  add(g,lathe([[0,0],[.36,0,1],[.38,.2],[.3,.4],[.22,.46],[.13,.47],[.1,.4],[0,.38]],16),{},(p)=>Math.hypot(p[0],p[2])<.12&&p[1]>.36?lo:c);});
kind('wood-disc','Wooden Disc',.43,.2,['toys'],g=>{add(g,cyl(.43,.19,22),{},(p,n)=>{if(n[1]<.5)return Math.sin(p[1]*90)>.6?C('#c97f4c'):C('#d9915a');const r=Math.hypot(p[0],p[2]);return Math.sin(r*55)>.75?C('#e3a774'):C('#f2bf8c');});});
for(const [id,name,base,spot] of [['egg-pink','Pink Dino Egg','#ff92d2','#e8459f'],['egg-orange','Spotted Egg','#ffc2a4','#e8784e']])
 kind(id,name,.26,.56,['toys'],g=>{const sp=[[0,1,0],[.8,.5,.3],[-.7,.4,-.5],[.2,.2,.95],[-.5,0,.8],[.6,-.1,-.75],[-.95,-.1,.1],[.3,.7,-.6]].map(v=>{const l=Math.hypot(...v);return v.map(x=>x/l);});
  add(g,lathe([[0,0],[.15,.03],[.25,.16],[.26,.3],[.2,.46],[.11,.54],[0,.56]],14),{},(p)=>{const l=Math.hypot(p[0],p[1]-.28,p[2])||1,u=[p[0]/l,(p[1]-.28)/l,p[2]/l];for(const v of sp)if(u[0]*v[0]+u[1]*v[1]+u[2]*v[2]>.9)return C(spot);return C(base);});});
for(const [id,body,band] of [['popsicle-melon','#f0404c','#58c04a'],['popsicle-ice','#3d8ff2',null]])
 kind(id,'Popsicle',.46,.14,['treats'],g=>{const B=C(body);
  if(band){add(g,rbox(.44,.13,.56,.12),{at:[0,0,-.21]},B);add(g,rbox(.43,.125,.05,.01),{at:[0,0,.09]},C('#f4f6ea'));add(g,rbox(.44,.13,.16,.05),{at:[0,0,.18]},C(band));}
  else{add(g,rbox(.44,.13,.74,.12),{at:[0,0,-.12]},B);add(g,rbox(.32,.02,.5,.08),{at:[0,.125,-.16]},mix(B,WHITE,.22));}
  add(g,rbox(.1,.05,.24,.03),{at:[0,.04,.36]},C('#e8c890'));});
kind('strawberry-half','Strawberry Half',.26,.12,['fruit'],g=>{const poly=[[0,-.27],[.14,-.22],[.22,-.08],[.2,.08],[.12,.2],[0,.25],[-.12,.2],[-.2,.08],[-.22,-.08],[-.14,-.22]];
 add(g,extrude(poly,.1,true),{},(p,n)=>{if(n[1]<.5)return C('#b00c18');const r=Math.hypot(p[0]/.75,p[2]-.02);if(r<.06)return C('#ffe2dc');if(r<.12)return C('#f25058');return Math.sin(p[0]*70)*Math.sin(p[2]*70)>.85?C('#ffd27a'):C('#cc1222');});
 add(g,extrude(starPoly(5,.1,.04),.03),{at:[0,.06,-.24]},C('#3dbb3a'));});
kind('tangerine','Tangerine',.26,.44,['fruit'],g=>{add(g,sphere(16,10),{at:[0,.21,0],s:[.26,.21,.26]},(p)=>p[1]>.6?C('#f77a26'):C('#ee6418'));add(g,sphere(6,4),{at:[0,.42,0],s:[.03,.015,.03]},C('#3a6a1e'));add(g,sphere(8,5),{at:[.05,.42,.02],s:[.07,.015,.035],r:[0,.5,0]},C('#3fa02c'));});
kind('onion-red','Red Onion',.24,.5,['fruit','kitchen'],g=>{add(g,lathe([[0,0],[.12,.02],[.22,.12],[.24,.24],[.18,.36],[.08,.44],[0,.46]],14),{},(p)=>{const a=Math.atan2(p[2],p[0]);return Math.sin(a*7)>.7?C('#c86ad8'):C('#9a3ab4');});
 for(const s of [-1,1])add(g,cyl(.02,.2,6),{at:[s*.02,.42,0],r:[0,0,s*.25]},C('#8ad05a'));});
kind('watermelon-lying','Watermelon',.86,1.36,['fruit'],g=>{add(g,sphere(22,14),{at:[0,.68,0],s:[.86,.68,.7]},(p)=>{const a=Math.atan2(p[1],p[2]);return Math.sin(a*11+p[0]*1.5)>.15?C('#1f8a2c'):C('#4bc04a');});});
// Levels 4-6 from the owner's second Fold video
kind('peach','Peach',.62,1.1,['fruit'],g=>{const P=C('#ff9a4a'),R=C('#ff6a3a');add(g,sphere(18,12),{at:[0,.55,0],s:[.6,.55,.58]},(p,n)=>{const blush=Math.max(0,n[0]*.6+n[2]*.5);return mix(mix(C('#ffc070'),P,.6),R,Math.min(1,blush));});
 add(g,torus(.25,.03,10,5,Math.PI),{at:[0,.62,.02],r:[0,Math.PI/2,Math.PI/2],s:[1,1,1.6]},C('#e8703a'));add(g,cyl(.04,.14,6),{at:[0,1.04,0],r:[0,0,.3]},C('#6b3e1e'));
 add(g,sphere(10,5),{at:[.17,1.08,0],s:[.22,.04,.1],r:[0,.4,.25]},C('#3fa02c'));});
for(const [id,cols] of [['pop-lime',['#a8e82a']],['pop-orange',['#ff7a2a','#ffb21e','#ffd84a','#ff7aa0']],['pop-blue',['#4aa8f8']],['pop-pink',['#ff8a9a','#ffd0d8']],['pop-red',['#f0384a']]])
 kind(id,'Popsicle',.27,.09,['treats'],g=>{const band=p=>{const t=Math.max(0,Math.min(.999,(p[2]+.31)/.42));return C(cols[Math.floor(t*cols.length)]);};
  add(g,rbox(.26,.08,.42,.07),{at:[0,0,-.07]},band);add(g,rbox(.06,.03,.16,.015),{at:[0,.025,.2]},C('#e8c890'));});
kind('train-pink','Toy Train',.55,.78,['toys'],g=>{const P=C('#ff3fa0'),D=C('#c8207a'),Y=C('#ffd23a');
 add(g,rbox(.5,.1,.92,.04),{at:[0,.1,0]},D);add(g,lathe([[0,0],[.2,0,1],[.2,.5,1],[0,.5]],14),{at:[0,.36,-.12],r:[Math.PI/2,0,0]},P);
 add(g,rbox(.48,.42,.36,.06),{at:[0,.2,.26]},P);add(g,rbox(.54,.07,.42,.03),{at:[0,.62,.26]},D);add(g,rbox(.3,.16,.02,.02),{at:[0,.38,.45]},C('#9fd4ff'));
 add(g,cyl(.07,.24,10,.1),{at:[0,.56,-.3]},D);add(g,cyl(.11,.05,10),{at:[0,.78,-.3]},Y);add(g,sphere(8,6),{at:[0,.36,-.63],s:[.08,.08,.04]},Y);
 for(const sz of [-.3,-.02,.28])for(const sx of [-1,1])add(g,cyl(.13,.06,12),{at:[sx*.27,.14,sz],r:[0,0,Math.PI/2]},Y);});
// Level 6 (toys and gadgets): sizes measured against the hole in the video (a fridge wedges in a Size 5 hole)
for(const [id,body,trim] of [['fridge-green','#7ed321','#e05ac8'],['fridge-yellow','#ffc61e','#ff6ab0']])
 kind(id,'Fridge',1.15,2.6,['kitchen'],g=>{const B=C(body),T=C(trim);add(g,rbox(1.8,2.6,1.45,.14),{},B);add(g,rbox(1.82,.05,1.47,.02),{at:[0,1.62,0]},T);add(g,rbox(1.84,.04,1.49,.02),{at:[0,.06,0]},T);
  for(const [y,h] of [[1.75,.55],[.5,.8]])add(g,rbox(.08,h,.1,.03),{at:[-.62,y,.76]},C('#2ac8b0'));add(g,rbox(.5,.4,.02,.02),{at:[.3,2.0,.73]},C('#fff6e0'));add(g,rbox(.4,.14,.02,.01),{at:[.55,.9,.73]},C('#ffffff'));});
kind('tv-orange','Retro TV',.95,1.4,['toys'],g=>{add(g,rbox(1.8,1.3,1.3,.28),{},C('#ff7a1e'));add(g,rbox(1.42,.92,.06,.12),{at:[-.08,.2,.64]},C('#3a6ae8'));add(g,rbox(1.3,.82,.04,.1),{at:[-.08,.25,.66]},C('#7fb4ff'));
 for(const y of [.4,.8])add(g,cyl(.07,.06,10),{at:[.72,y,.62],r:[Math.PI/2,0,0]},C('#ffd23a'));add(g,rbox(1.6,.12,1.1,.04),{at:[0,-.02,0]},C('#d85a10'));});
kind('helicopter','Toy Helicopter',.9,1.1,['toys'],g=>{const B=C('#2a8af0'),Y=C('#ffd21a');add(g,sphere(16,10),{at:[0,.5,.1],s:[.48,.42,.55]},B);add(g,lathe([[0,0],[.16,0],[.08,.9],[0,.95]],10),{at:[0,.55,-.2],r:[-Math.PI/2+.1,0,0]},B);
 add(g,sphere(10,8),{at:[0,.58,.55],s:[.3,.24,.12]},C('#ffffff'));for(const sx of [-1,1])add(g,sphere(8,6),{at:[sx*.11,.6,.64],s:.06},EYE);add(g,cyl(.05,.2,8),{at:[0,.9,.1]},Y);
 for(const a of [0,Math.PI/2])add(g,rbox(1.7,.04,.2,.03),{at:[0,1.08,.1],r:[0,a+.4,0]},Y);for(const sx of [-1,1])add(g,rbox(.06,.06,.9,.02),{at:[sx*.32,.06,.12]},Y);add(g,rbox(.5,.06,.12,.03),{at:[0,.62,-1.05]},Y);});
for(const [id,col,star] of [['ball-star-blue','#2a7ae0','#7fc8ff'],['ball-spiky','#6cc02a','#b8ec5a']])
 kind(id,'Star Ball',.8,1.6,['toys'],g=>{const dirs=[];for(let i=0;i<14;i++){const y=1-2*(i+.5)/14,r=Math.sqrt(1-y*y),a=i*2.4;dirs.push([Math.cos(a)*r,y,Math.sin(a)*r]);}
  add(g,sphere(20,14),{at:[0,.8,0],s:.8},(p)=>{for(const v of dirs)if(p[0]*v[0]+p[1]*v[1]+p[2]*v[2]>.93)return C(star);return C(col);});
  if(id==='ball-spiky')for(const v of dirs)add(g,sphere(6,4),{at:[v[0]*.8,.8+v[1]*.8,v[2]*.8],s:.1},C('#4a9a1a'));});
kind('monster-truck','Monster Truck',.95,1.0,['toys'],g=>{const G2=C('#7ed321');add(g,rbox(1.1,.55,1.7,.1),{at:[0,.42,0]},G2);add(g,rbox(.9,.35,.8,.08),{at:[0,.95,-.1]},G2);add(g,rbox(.8,.26,.04,.03),{at:[0,1.0,.31]},C('#9fd4ff'));
 for(const sz of [-.55,.55])for(const sx of [-1,1])add(g,cyl(.32,.3,12),{at:[sx*.62,.32,sz],r:[0,0,Math.PI/2]},(p,n)=>Math.abs(n[0])>.6?C('#c9ced8'):C('#1e2026'));
 add(g,rbox(1.12,.12,1.2,.03),{at:[0,.62,.1]},(p)=>Math.sin(p[2]*14)>0?C('#2a8af0'):G2);});
kind('microwave','Microwave',1.05,1.1,['kitchen'],g=>{add(g,rbox(1.9,1.05,1.2,.12),{},C('#f39ad8'));add(g,rbox(1.1,.72,.04,.06),{at:[-.3,.16,.6]},C('#5a2a6a'));add(g,rbox(.9,.55,.03,.04),{at:[-.3,.24,.62]},C('#a066c8'));
 for(let i=0;i<3;i++)add(g,cyl(.06,.04,8),{at:[.6,.3+i*.2,.6],r:[Math.PI/2,0,0]},C(['#ff4a5a','#ffd23a','#3ad0ff'][i]));for(let i=0;i<4;i++)add(g,rbox(.5,.04,.08,.02),{at:[-.2,1.04,-.3+i*.18]},C('#c870b0'));});
kind('hairdryer','Hair Dryer',.6,.5,['toys'],g=>{const B=C('#2ab4f0');add(g,lathe([[0,0],[.22,0],[.24,.55],[.2,.62],[0,.62]],12),{at:[0,.25,-.3],r:[Math.PI/2,0,0]},B);add(g,cyl(.13,.42,10),{at:[0,.05,.1],r:[.35,0,0]},B);
 add(g,cyl(.25,.06,12),{at:[0,.25,.32],r:[Math.PI/2,0,0]},C('#ff4a8a'));add(g,cyl(.09,.08,8),{at:[0,.25,-.36],r:[Math.PI/2,0,0]},C('#0a3a6a'));});
kind('kettle','Thermos',.42,.95,['kitchen'],g=>{add(g,lathe([[0,0],[.36,0,1],[.4,.2],[.4,.62,1],[.3,.75],[0,.75]],14),{},C('#2ac8b0'));add(g,cyl(.28,.12,12),{at:[0,.74,0]},C('#ff5a7a'));add(g,cyl(.12,.08,10),{at:[0,.86,0]},C('#2ac8b0'));
 add(g,rbox(.12,.36,.1,.04),{at:[.42,.22,0]},C('#1a9a88'));add(g,torus(.4,.03,14,4),{at:[0,.35,0]},C('#ffffff'));});
kind('boombox','Boombox',.95,.95,['toys'],g=>{add(g,rbox(1.8,.85,.95,.14),{},C('#ff9a3a'));for(const sx of [-1,1]){add(g,cyl(.3,.06,14),{at:[sx*.52,.4,.47],r:[Math.PI/2,0,0]},C('#2ac8b0'));add(g,cyl(.16,.07,12),{at:[sx*.52,.4,.5],r:[Math.PI/2,0,0]},C('#0a6a5a'));}
 add(g,rbox(1.3,.08,.12,.04),{at:[0,.95,0]},C('#2ac8b0'));add(g,rbox(.42,.2,.02,.02),{at:[0,.58,.48]},C('#ffe066'));});
kind('console-yellow','Handheld Console',.6,.16,['toys'],g=>{add(g,rbox(1.15,.14,.7,.1),{},C('#ffc61e'));add(g,rbox(.55,.02,.42,.03),{at:[0,.14,0]},C('#b8a8ff'));
 add(g,rbox(.16,.03,.05,.01),{at:[-.42,.14,.05]},C('#5a3aa0'));add(g,rbox(.05,.03,.16,.01),{at:[-.42,.14,.05]},C('#5a3aa0'));for(const [x,z,c] of [[.38,-.04,'#ff4a5a'],[.46,.08,'#3ad0ff']])add(g,cyl(.045,.03,8),{at:[x,.14,z]},C(c));});
kind('calculator','Calculator',.4,.12,['toys'],g=>{add(g,rbox(.55,.1,.75,.06),{},C('#3a9af0'));add(g,rbox(.4,.02,.15,.02),{at:[0,.1,-.24]},C('#d8f0ff'));for(let i=0;i<3;i++)for(let j=0;j<4;j++)add(g,rbox(.09,.03,.08,.015),{at:[-.13+i*.13,.1,-.06+j*.11]},C('#ffffff'));});
kind('toy-piano','Toy Keyboard',.45,.2,['toys'],g=>{add(g,rbox(.85,.16,.38,.07),{},C('#a03ae8'));for(let i=0;i<7;i++)add(g,rbox(.08,.04,.16,.01),{at:[-.27+i*.09,.15,.05]},C('#ffffff'));add(g,rbox(.5,.03,.08,.01),{at:[0,.15,-.12]},C('#ff7ae0'));});
kind('phone-purple','Toy Phone',.2,.1,['toys'],g=>{add(g,rbox(.22,.08,.36,.05),{},C('#b04de8'));add(g,rbox(.15,.02,.14,.01),{at:[0,.08,-.08]},C('#f0d0ff'));add(g,rbox(.15,.02,.1,.01),{at:[0,.08,.1]},C('#ffd23a'));});
kind('pin','Bowling Pin',.1,.36,['toys'],g=>{add(g,lathe([[0,0],[.08,.02],[.1,.12],[.05,.24],[.07,.32],[0,.36]],8),{},(p)=>p[1]>.22&&p[1]<.26?C('#2a8af0'):C('#e8ecf2'));});
kind('bracelet','Bead Bracelet',.5,.16,['toys'],g=>{for(let i=0;i<10;i++){const a=i/10*Math.PI*2;add(g,rbox(.2,.16,.16,.05),{at:[Math.cos(a)*.38,0,Math.sin(a)*.38],r:[0,-a,0]},C(i%2?'#ff9ac8':'#ffc0dc'));}});
KINDS.helicopter.hull=[1.0,.95,1.3,0,.05];KINDS.helicopter.shape='box';
for(const [id,xp] of [['fridge-green',15],['fridge-yellow',15],['tv-orange',15],['helicopter',15],['ball-star-blue',4],['ball-spiky',4],['monster-truck',6],['microwave',10],['hairdryer',4],['kettle',4],['boombox',6],['console-yellow',2],['calculator',2],['toy-piano',2],['phone-purple',1],['pin',1],['bracelet',2]])KINDS[id].xp=xp;
for(const [id,xp] of [['peach',4],['train-pink',6],['pop-lime',1],['pop-orange',1],['pop-blue',1],['pop-pink',1],['pop-red',1],['wood-disc',1],['popsicle-melon',1],['popsicle-ice',1],['watermelon-lying',10],['jelly-green',2],['jelly-red',2],['jelly-orange',2]])KINDS[id].xp=xp;
// Face quad placement on the head token (local space): centre and normal of the coin's front face.
const HEAD_FACE={c:[0,.22+.075*.64,.075*.766],tilt:-(Math.PI/2-.87),size:.5};
const THEMES={
 toys:{name:'Toy Box',floor:'#3a4152',small:['duck','octopus','robot','lego-blue','lego-purple','lego-yellow','lego-pink','lego-teal','ball-orange','ball-pink','star','maraca','dice','crayon','headphones','gift'],mid:['plane','keyboard','crate'],big:['soccer']},
 fruit:{name:'Fruit Stand',floor:'#3b4254',small:['cherry','strawberry','apple-red','apple-green','orange','melon-slice','pear','banana','grapes','kiwi','tomato'],mid:['crate','pumpkin'],big:['watermelon']},
 kitchen:{name:'Kitchen',floor:'#394050',small:['egg','egg-brown','fried-egg','croissant','burger','donut','cupcake','toast','sausage','cup-red','cup-green'],mid:['pie','cheese','pot','pan','egg-carton','pillar'],big:['jam-jar','juice-jar']},
 treats:{name:'Sweet Shop',floor:'#3a4052',small:['popsicle-yellow','popsicle-lime','popsicle-orange','popsicle-blue','popsicle-pink','popsicle-rainbow','donut','cupcake'],mid:['gift','keyboard','crate'],big:['soccer']},
 sushi:{name:'Sushi Bar',floor:'#373e4f',small:['nigiri','tamago','maki','onigiri','soy-dish','chopsticks'],mid:['crate','pot'],big:['jam-jar']}
};
// Built geometry is cached per kind.
const built={};
function kindGeometry(id){if(!built[id]){const g=geo();KINDS[id].build(g);built[id]={p:new Float32Array(g.p),n:new Float32Array(g.n),c:new Float32Array(g.c),count:g.p.length/3};}return built[id];}
// Hole pieces, unit radius.
function rimGeometry(){const g=geo();add(g,lathe([[1.3,0],[1.27,.045],[1.18,.08],[1.08,.07],[1.02,.02],[.99,-.06],[.985,-.16]],48),{},(p)=>{const r=Math.hypot(p[0],p[2]);if(r>1.17)return mix(C('#9aa0ab'),C('#c3c7cf'),(1.3-r)/.13);if(r>1.06)return C('#c9cdd5');return mix(C('#6d727c'),C('#a9aeb8'),Math.max(0,Math.min(1,(p[1]+.16)/.2)));});return g;}
function throatGeometry(){const g=geo();add(g,lathe([[.972,-.1],[.968,-.6],[.96,-1.6],[.95,-3.2],[0,-3.25]],40),{},(p)=>mix(C('#404652'),C('#000000'),Math.min(1,-p[1]/1.3)));
 // flip normals inward
 for(let i=0;i<g.n.length;i+=3){g.n[i]*=-1;g.n[i+2]*=-1;}return g;}
Object.assign(exports,{HEAD_FACE,KINDS,THEMES,kindGeometry,rimGeometry,throatGeometry,geo,add,lathe,sphere,cyl,rbox,extrude,torus,C,mix});
