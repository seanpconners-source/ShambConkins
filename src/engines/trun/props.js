// Temple Run (Boulder Run revamp): props built in code and glued to the runners' bones (bind pose space: Y up,
// facing +Z, metres). Indy: fedora, satchel + strap, coiled whip. Lara: braid (swinging chain, drawn each frame),
// thigh holsters, small backpack. Colours come from an 8x1 palette texture (uv picks a cell).
const PAL=['#6a4120','#2a1a10','#6e4a2a','#3b2a1a','#8a6a44','#1e1e22','#7a5a30','#c9a46a'];// felt, band, satchel, strap, whip, gunmetal, leather2, brass
const CELL=i=>(i+.5)/PAL.length;

function paletteCanvas(){const c=document.createElement('canvas');c.width=PAL.length;c.height=1;const g=c.getContext('2d');PAL.forEach((p,i)=>{g.fillStyle=p;g.fillRect(i,0,1,1);});return c;}

// bind-space facts from the character mesh: joint bind positions and the head's box
function bindFacts(skm){
 const N=skm.joints.length,ibm=new Float32Array(skm.blob,skm.ibm,N*16),pos={};
 skm.joints.forEach((j,i)=>{const m=ibm.subarray(i*16,i*16+16),inv=inv4(m);pos[j.n]=[inv[12],inv[13],inv[14]];});
 const head=skm.joints.findIndex(j=>j.n==='Head'),f=new Float32Array(skm.blob,skm.vb,skm.verts*7),u8=new Uint8Array(skm.blob,skm.vb,skm.verts*28);
 let lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];
 for(let i=0;i<skm.verts;i++){const o=i*28;let w=0;for(let k=0;k<4;k++)if(u8[o+20+k]===head)w+=u8[o+24+k];if(w<200)continue;
  for(let d=0;d<3;d++){const v=f[i*7+d];if(v<lo[d])lo[d]=v;if(v>hi[d])hi[d]=v;}}
 return {pos,head:{lo,hi,c:lo.map((v,d)=>(v+hi[d])/2),r:lo.map((v,d)=>(hi[d]-v)/2)},jointIndex:n=>skm.joints.findIndex(j=>j.n===n)};}

function inv4(a){// affine inverse is enough for bind matrices
 const r=[a[0],a[1],a[2],a[4],a[5],a[6],a[8],a[9],a[10]];
 const det=r[0]*(r[4]*r[8]-r[5]*r[7])-r[3]*(r[1]*r[8]-r[2]*r[7])+r[6]*(r[1]*r[5]-r[2]*r[4]),id=1/det;
 const i0=(r[4]*r[8]-r[5]*r[7])*id,i1=(r[2]*r[7]-r[1]*r[8])*id,i2=(r[1]*r[5]-r[2]*r[4])*id,i3=(r[5]*r[6]-r[3]*r[8])*id,i4=(r[0]*r[8]-r[2]*r[6])*id,i5=(r[2]*r[3]-r[0]*r[5])*id,i6=(r[3]*r[7]-r[4]*r[6])*id,i7=(r[1]*r[6]-r[0]*r[7])*id,i8=(r[0]*r[4]-r[1]*r[3])*id;
 const t=[a[12],a[13],a[14]],o=new Float32Array(16);
 o[0]=i0;o[1]=i1;o[2]=i2;o[4]=i3;o[5]=i4;o[6]=i5;o[8]=i6;o[9]=i7;o[10]=i8;
 o[12]=-(i0*t[0]+i3*t[1]+i6*t[2]);o[13]=-(i1*t[0]+i4*t[1]+i7*t[2]);o[14]=-(i2*t[0]+i5*t[1]+i8*t[2]);o[15]=1;return o;}

// ---------------------------------------------------------------- geometry builder (smooth, palette uv, one joint per part)
function builder(){const P=[],N=[],U=[],J=[],I=[];
 const B={P,N,U,J,I,
  vert(p,n,cell,j){P.push(p[0],p[1],p[2]);const l=Math.hypot(n[0],n[1],n[2])||1;N.push(n[0]/l,n[1]/l,n[2]/l);U.push(CELL(cell),.5);J.push(j);return P.length/3-1;},
  // grid of rings: ring(i) -> array of {p,n}; joins consecutive rings
  rings(rings,cell,j,close=true){const base=P.length/3,m=rings[0].length;
   for(const r of rings)for(const v of r)B.vert(v.p,v.n,cell,j);
   for(let i=0;i<rings.length-1;i++)for(let k=0;k<(close?m:m-1);k++){const a=base+i*m+k,b=base+i*m+(k+1)%m,c=a+m,d=b+m;I.push(a,c,b,b,c,d);}},
  box(c,s,cell,j,rot=null){// axis box with optional 3x3 rotation (row-major)
   const R=rot||[1,0,0,0,1,0,0,0,1],T=v=>[c[0]+R[0]*v[0]+R[1]*v[1]+R[2]*v[2],c[1]+R[3]*v[0]+R[4]*v[1]+R[5]*v[2],c[2]+R[6]*v[0]+R[7]*v[1]+R[8]*v[2]],Tn=v=>[R[0]*v[0]+R[1]*v[1]+R[2]*v[2],R[3]*v[0]+R[4]*v[1]+R[5]*v[2],R[6]*v[0]+R[7]*v[1]+R[8]*v[2]];
   const F=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[0,1,0],[1,0,0]]];
   for(const [n,u,v] of F){const base=P.length/3;for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const q=[0,1,2].map(d=>n[d]*s[d]+u[d]*a*s[d]+v[d]*b*s[d]);B.vert(T(q),Tn(n),cell,j);}I.push(base,base+1,base+2,base,base+2,base+3);}},
  out(){return {pos:new Float32Array(P),nrm:new Float32Array(N),uv:new Float32Array(U),joint:new Uint8Array(J),idx:new Uint32Array(I)};}};
 return B;}

// ---------------------------------------------------------------- Indy
function fedora(B,F){const h=F.head,j=F.jointIndex('Head'),SEG=28;
 const cx=h.c[0],cz=h.c[2]-.004,rx=h.r[0]*1.06,rz=h.r[2]*1.04,top=h.hi[1],base=top-.085;
 // crown: from the band up, pinched at the front, centre crease on top
 const crown=[];const prof=[[0,1],[.45,1],[.75,.97],[.92,.86],[1,.62],[1.04,.30],[1.05,0]];// [height frac, radius frac] bottom->top
 for(const [hf,rf] of prof){const ring=[];for(let k=0;k<SEG;k++){const a=k/SEG*Math.PI*2,sx=Math.sin(a),cz_=Math.cos(a);
   const pinch=1-.13*Math.max(0,cz_)**4*Math.max(0,hf-.45)/.6,crease=hf>.9?(1-.25*Math.abs(sx)):1;
   const y=base+hf*.125*(hf>.95?crease:1)-(hf>.95&&Math.abs(sx)<.35?.012:0);
   const r=rf*pinch;ring.push({p:[cx+sx*rx*r,y,cz+cz_*rz*r],n:[sx*(hf<.9?1:.5),hf<.9?.15:.9,cz_*(hf<.9?1:.5)]});}crown.push(ring);}
 B.rings(crown,0,j);
 // band
 const band=[];for(const [hf,rf] of [[0,1.012],[.32,1.012]]){const ring=[];for(let k=0;k<SEG;k++){const a=k/SEG*Math.PI*2;ring.push({p:[cx+Math.sin(a)*rx*rf,base+hf*.125*.9,cz+Math.cos(a)*rz*rf],n:[Math.sin(a),0,Math.cos(a)]});}band.push(ring);}
 B.rings(band,1,j);
 // brim: snap-brim, down at the front, up at the sides, two layers (top + bottom)
 const brimR=.062;
 for(const side of [1,-1]){const rings=[];for(const t of [0,.5,1]){const ring=[];for(let k=0;k<SEG;k++){const a=k/SEG*Math.PI*2,sx=Math.sin(a),cz_=Math.cos(a);
    const ex=rx+brimR*t*(1+.15*Math.abs(cz_)),ez=rz+brimR*t*(1+.25*Math.max(0,cz_));
    const y=base+.002*side+t*t*(.02*sx*sx-.022*Math.max(0,cz_)**2+.006*Math.max(0,-cz_));
    ring.push({p:[cx+sx*ex,y,cz+cz_*ez],n:[0,side,0]});}rings.push(ring);}
  if(side<0)rings.reverse();B.rings(rings,side>0?0:3,j);}}

function satchel(B,F){const pel=F.jointIndex('pelvis'),sp=F.jointIndex('spine_03'),P=F.pos;
 const hip=P.thigh_r,pv=P.pelvis;
 // bag on the left hip, strap from the right shoulder
 B.box([pv[0]+.17,pv[1]-.06,pv[2]+.02],[.035,.085,.11],2,pel);
 B.box([pv[0]+.205,pv[1]-.02,pv[2]+.02],[.006,.05,.112],3,pel);// flap
 const sh=P.clavicle_r||P.spine_03,chest=P.spine_03;
 // strap: thin band over the chest from right shoulder to left hip (glued to the chest bone)
 const a=[sh[0]-.05,sh[1]+.03,chest[2]],b=[pv[0]+.16,pv[1]+.02,pv[2]];
 for(const zs of [1,-1]){const z=zs>0?.135:-.13,mid=[(a[0]+b[0])/2,(a[1]+b[1])/2,0],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy),ang=Math.atan2(dy,dx),c=Math.cos(ang),s=Math.sin(ang);
  B.box([mid[0],mid[1],chest[2]+z],[L/2,.018,.006],3,sp,[c,-s,0,s,c,0,0,0,1]);}
 void hip;}

function whip(B,F){const pel=F.jointIndex('pelvis'),pv=F.pos.pelvis,SEG=18,T=8;
 // coil on the right hip: torus around the X axis
 const c=[pv[0]-.175,pv[1]-.03,pv[2]+.01],R=.065,r=.011;
 for(const off of [0,.016,-.016]){const rings=[];for(let i=0;i<=SEG;i++){const a=i/SEG*Math.PI*2,ring=[];for(let k=0;k<T;k++){const b=k/T*Math.PI*2,cr=R+Math.cos(b)*r;
   ring.push({p:[c[0]+off-Math.sin(b)*r*.2+Math.sin(b)*r,c[1]+Math.cos(a)*cr,c[2]+Math.sin(a)*cr],n:[Math.sin(b),Math.cos(a)*Math.cos(b),Math.sin(a)*Math.cos(b)]});}rings.push(ring);}
  B.rings(rings,4,pel);}
 B.box([c[0],c[1]-R-.03,c[2]+.02],[.012,.05,.012],1,pel);}

// ---------------------------------------------------------------- Lara
function holsters(B,F){for(const s of ['l','r']){const j=F.jointIndex('thigh_'+s),t=F.pos['thigh_'+s],k=F.pos['calf_'+s],sx=s==='l'?1:-1;
  const y=t[1]+(k[1]-t[1])*.38,x=t[0]+sx*.095,z=t[2]+.0;
  B.box([x,y,z],[.022,.075,.045],3,j);B.box([x+sx*.006,y+.07,z-.01],[.02,.03,.018],5,j);// holster + grip
  // thigh straps
  B.box([t[0],y+.045,z],[.085,.012,.075],3,j);B.box([t[0],y-.04,z],[.083,.012,.073],3,j);}}
function backpack(B,F){const j=F.jointIndex('spine_03'),c=F.pos.spine_03;B.box([c[0],c[1]-.03,c[2]-.135],[.085,.1,.045],6,j);B.box([c[0],c[1]+.05,c[2]-.135],[.07,.02,.04],3,j);}

function buildProps(kind,skm){const F=bindFacts(skm),B=builder();
 if(kind==='indy'){fedora(B,F);satchel(B,F);whip(B,F);}
 else{holsters(B,F);backpack(B,F);}
 return {geo:B.out(),facts:F};}

// ---------------------------------------------------------------- Lara's braid: verlet chain in world space, tube mesh rebuilt per frame
function makeBraid(facts,{len=.62,seg=12,radius=.026}={}){
 const h=facts.head,anchorBind=[h.c[0],h.c[1]+h.r[1]*.25,h.lo[2]+.012];
 const pts=[],old=[];for(let i=0;i<=seg;i++){pts.push([0,-i*len/seg,0]);old.push([0,-i*len/seg,0]);}
 const SIDES=7,nV=(seg+1)*SIDES,pos=new Float32Array(nV*3),nrm=new Float32Array(nV*3),col=new Uint8Array(nV*4),idx=[];
 for(let i=0;i<seg;i++)for(let k=0;k<SIDES;k++){const a=i*SIDES+k,b=i*SIDES+(k+1)%SIDES;idx.push(a,a+SIDES,b,b,a+SIDES,b+SIDES);}
 let inited=false;
 return {anchorBind,idx:new Uint16Array(idx),pos,nrm,col,
  // anchor = world position of the braid root; headM = world matrix of the head (for the root direction); dt seconds
  // wind = backward pull in m/s^2 (running), spheres = [[x,y,z,r]...] body parts it must stay outside of
  step(anchor,back,dt,wind=0,spheres=null){if(!inited){for(let i=0;i<=seg;i++){const p=[anchor[0]+back[0]*i*.02,anchor[1]-i*len/seg,anchor[2]+back[2]*i*.02];pts[i]=p;old[i]=p.slice();}inited=true;}
   const g=-9.8*dt*dt,damp=.985,L=len/seg;
   const wk=wind*dt*dt;
   for(let i=1;i<=seg;i++){const p=pts[i],o=old[i];const vx=(p[0]-o[0])*damp,vy=(p[1]-o[1])*damp,vz=(p[2]-o[2])*damp;o[0]=p[0];o[1]=p[1];o[2]=p[2];p[0]+=vx+back[0]*wk;p[1]+=vy+g;p[2]+=vz+back[2]*wk;}
   pts[0]=anchor.slice();
   for(let it=0;it<6;it++){for(let i=1;i<=seg;i++){const a=pts[i-1],b=pts[i],dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],d=Math.hypot(dx,dy,dz)||1e-6,k=(d-L)/d;
     if(i===1){b[0]-=dx*k;b[1]-=dy*k;b[2]-=dz*k;}else{a[0]+=dx*k*.5;a[1]+=dy*k*.5;a[2]+=dz*k*.5;b[0]-=dx*k*.5;b[1]-=dy*k*.5;b[2]-=dz*k*.5;}}
    if(spheres)for(let i=1;i<=seg;i++){const p=pts[i];for(const sp of spheres){const dx=p[0]-sp[0],dy=p[1]-sp[1],dz=p[2]-sp[2],d=Math.hypot(dx,dy,dz),r=sp[3]+radius;
      if(d<r){if(d<1e-5){p[0]+=back[0]*r;p[2]+=back[2]*r;}else{const k=(r-d)/d;p[0]+=dx*k;p[1]+=dy*k;p[2]+=dz*k;}}}}
    // keep the first links behind the head
    const p1=pts[1];const bd=(p1[0]-anchor[0])*back[0]+(p1[2]-anchor[2])*back[2];if(bd<.01){p1[0]+=back[0]*(.01-bd);p1[2]+=back[2]*(.01-bd);}}
   // tube
   for(let i=0;i<=seg;i++){const p=pts[i],q=pts[Math.min(seg,i+1)],r0=pts[Math.max(0,i-1)];let tx=q[0]-r0[0],ty=q[1]-r0[1],tz=q[2]-r0[2];const tl=Math.hypot(tx,ty,tz)||1;tx/=tl;ty/=tl;tz/=tl;
    let ux=back[1]*tz-back[2]*ty,uy=back[2]*tx-back[0]*tz,uz=back[0]*ty-back[1]*tx;let ul=Math.hypot(ux,uy,uz);if(ul<1e-4){ux=1;uy=0;uz=0;ul=1;}ux/=ul;uy/=ul;uz/=ul;
    const vx=ty*uz-tz*uy,vy=tz*ux-tx*uz,vz=tx*uy-ty*ux,t=i/seg,rad=radius*(i===0?.8:1-.55*t)*(1+.18*Math.sin(i*2.2));
    for(let k=0;k<SIDES;k++){const a=k/SIDES*Math.PI*2,c=Math.cos(a),s=Math.sin(a),o=(i*SIDES+k)*3;
     nrm[o]=ux*c+vx*s;nrm[o+1]=uy*c+vy*s;nrm[o+2]=uz*c+vz*s;pos[o]=p[0]+nrm[o]*rad;pos[o+1]=p[1]+nrm[o+1]*rad;pos[o+2]=p[2]+nrm[o+2]*rad;
     const sh=i%2?.85:1,o4=(i*SIDES+k)*4;col[o4]=70*sh;col[o4+1]=38*sh;col[o4+2]=18*sh;col[o4+3]=255;}}
   return {pos,nrm,col,idx:this.idx};}};}

Object.assign(exports,{buildProps,bindFacts,makeBraid,paletteCanvas,PAL});
