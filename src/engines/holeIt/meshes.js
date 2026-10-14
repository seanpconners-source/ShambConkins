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
for(const [id,col] of [['lego-blue','#2e7bff'],['lego-purple','#8a3cf0'],['lego-yellow','#ffd21a'],['lego-pink','#ff5fb4'],['lego-teal','#25c7b2']])
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

// ShambConkins cameos (owner asked for occasional ones)
kind('rum-ham','Rum Ham',.4,.42,['cameo'],g=>{add(g,sphere(14,10),{at:[0,.16,0],s:[.34,.24,.3]},(p)=>p[1]>.55?C('#f08a7a'):C('#c9583e'));add(g,cyl(.05,.4),{at:[.2,.22,0],r:[0,0,-1.2]},C('#fff6e6'));for(const dy of [-.05,.05])add(g,sphere(8,6),{at:[.58,.36+dy,0],s:.06},C('#fff6e6'));});
kind('fight-milk','Fight Milk',.2,.56,['cameo'],g=>{add(g,lathe([[0,0],[.16,0,1],[.17,.32],[.1,.44],[.07,.48,1],[0,.48]],14),{},(p)=>p[1]>.12&&p[1]<.26?C('#d8232a'):WHITE);add(g,cyl(.08,.08),{at:[0,.48,0]},C('#d8232a'));});
kind('head','Head Token',.3,.45,['cameo'],g=>{add(g,cyl(.27,.07,20),{at:[0,.22,0],r:[.87,0,0]},C('#ffc93a'));add(g,torus(.27,.03,20,6),{at:[0,.22,0],r:[.87,0,0]},C('#ffe27a'));add(g,rbox(.3,.06,.18,.02),{at:[0,0,-.05]},C('#d99a1e'));});
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
