// Temple Run (Boulder Run revamp): skinned characters + animation clips made by tools/trun/build-chars.py
// (Quaternius CC0 bodies/outfits/animations). Pure math, no WebGL: parse the 'SKM1' files, pose a skeleton from
// clips with cross-fades, and give the 3x4 joint matrices the renderer uploads. Characters face +Z, Y up, metres.
// skm.gz layout: 'SKM1' u32 jsonLen JSON (padded to 4) then the binary blob the JSON points into (see the tool).

function parseSKM(u8){
 if(String.fromCharCode(u8[0],u8[1],u8[2],u8[3])!=='SKM1')throw new Error('not an SKM1 file');
 const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength),jl=dv.getUint32(4,true);
 const J=JSON.parse(new TextDecoder().decode(u8.subarray(8,8+jl)));let off=8+jl;while(off%4)off++;
 const blob=u8.slice(off);J.blob=blob.buffer;return J;}

// ---------------------------------------------------------------- small mat4 / quat helpers (column-major)
function qnorm(q){const l=Math.hypot(q[0],q[1],q[2],q[3])||1;q[0]/=l;q[1]/=l;q[2]/=l;q[3]/=l;return q;}
function compose(o,t,q,s){// T * R * S into o (Float32Array(16) or plain array)
 const [x,y,z,w]=q,x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2,sx=s[0],sy=s[1],sz=s[2];
 o[0]=(1-(yy+zz))*sx;o[1]=(xy+wz)*sx;o[2]=(xz-wy)*sx;o[3]=0;
 o[4]=(xy-wz)*sy;o[5]=(1-(xx+zz))*sy;o[6]=(yz+wx)*sy;o[7]=0;
 o[8]=(xz+wy)*sz;o[9]=(yz-wx)*sz;o[10]=(1-(xx+yy))*sz;o[11]=0;
 o[12]=t[0];o[13]=t[1];o[14]=t[2];o[15]=1;return o;}
function mul(a,b,o){for(let c=0;c<4;c++){const b0=b[c*4],b1=b[c*4+1],b2=b[c*4+2],b3=b[c*4+3];
 o[c*4]=a[0]*b0+a[4]*b1+a[8]*b2+a[12]*b3;o[c*4+1]=a[1]*b0+a[5]*b1+a[9]*b2+a[13]*b3;
 o[c*4+2]=a[2]*b0+a[6]*b1+a[10]*b2+a[14]*b3;o[c*4+3]=a[3]*b0+a[7]*b1+a[11]*b2+a[15]*b3;}return o;}

// ---------------------------------------------------------------- clips
function makeClips(A){
 const names=A.clipJoints||A.joints,fps=A.fps,byName={};// a creature file carries its own clips (clipJoints)
 for(const c of A.clips){c.q=new Int16Array(A.blob,c.rot,c.frames*names.length*4);c.p=new Float32Array(A.blob,c.pel,c.frames*3);c.len=c.loop?c.frames/fps:(c.frames-1)/fps;byName[c.n]=c;}
 const rest={};for(const r of A.rest||[])rest[r.n]=r;
 return {names,fps,byName,rest};}

// sample clip c at time t into rot[j*4] (joint order = clip joint names) and pel[3]
function sampleClip(c,fps,J,t,rot,pel){
 let f=t*fps,n=c.frames;
 if(c.loop){f%=n;if(f<0)f+=n;}else f=Math.max(0,Math.min(n-1,f));
 const i=Math.floor(f),k=f-i,j=c.loop?(i+1)%n:Math.min(n-1,i+1),q=c.q,A=i*J*4,B=j*J*4;
 for(let m=0;m<J;m++){const a=A+m*4,b=B+m*4;let ax=q[a],ay=q[a+1],az=q[a+2],aw=q[a+3],bx=q[b],by=q[b+1],bz=q[b+2],bw=q[b+3];
  if(ax*bx+ay*by+az*bz+aw*bw<0){bx=-bx;by=-by;bz=-bz;bw=-bw;}
  const x=ax+(bx-ax)*k,y=ay+(by-ay)*k,z=az+(bz-az)*k,w=aw+(bw-aw)*k,l=Math.hypot(x,y,z,w)||1;
  rot[m*4]=x/l;rot[m*4+1]=y/l;rot[m*4+2]=z/l;rot[m*4+3]=w/l;}
 const p=c.p;for(let d=0;d<3;d++)pel[d]=p[i*3+d]+(p[j*3+d]-p[i*3+d])*k;}

// ---------------------------------------------------------------- a posed character
// mesh = parsed SKM (character), clips = makeClips(anims SKM)
function makeRig(mesh,clips){
 const joints=mesh.joints,N=joints.length,map=joints.map(j=>clips.names.indexOf(j.n));
 for(let i=0;i<N;i++)if(joints[i].p>=i)throw new Error('joint order: parent after child');
 const ibm=new Float32Array(mesh.blob,mesh.ibm,N*16),local=new Float32Array(16),world=new Float32Array(N*16),skin=new Float32Array(N*12),tmp=new Float32Array(16);
 const motion=mesh.rootMotion||'pelvis',pelvis=joints.findIndex(j=>j.n===motion),mr=!mesh.rootMotion&&clips.rest.pelvis,pk=mr&&pelvis>=0?Math.hypot(...joints[pelvis].t)/Math.max(1e-6,Math.hypot(...mr.t)):1;
 const CJ=clips.names.length,ra=new Float32Array(CJ*4),rb=new Float32Array(CJ*4),pa=new Float32Array(3),pb=new Float32Array(3);
 const rot=new Float32Array(N*4),tq=[0,0,0,1],tt=[0,0,0];for(let i=0;i<N;i++)rot.set(joints[i].r,i*4);
 // layers: current clip + the pose being faded out (snapshot of previous rotations)
 let cur=null,time=0,speed=1,fade=0,fadeLen=0,snap=new Float32Array(N*4),snapP=new Float32Array(3),hasSnap=false,curP=new Float32Array(3);
 const R={joints,N,skin,world,clip:()=>cur&&cur.n,time:()=>time,
  play(name,{fade:f=.15,speed:s=1,at=0,restart=false}={}){const c=clips.byName[name];if(!c)throw new Error('no clip '+name);
   if(cur===c&&!restart){speed=s;return;}
   if(cur&&f>0){snap.set(rot);snapP.set(curP);hasSnap=true;fade=0;fadeLen=f;}else hasSnap=false;
   cur=c;time=at*c.len;speed=s;},
  setSpeed(s){speed=s;},
  done(){return cur&&!cur.loop&&time>=cur.len-1e-4;},
  progress(){return cur?Math.min(1,time/cur.len):0;},
  update(dt){if(!cur)return;time+=dt*speed;if(!cur.loop)time=Math.min(time,cur.len);if(hasSnap){fade+=dt;if(fade>=fadeLen)hasSnap=false;}
   sampleClip(cur,clips.fps,CJ,time,ra,pa);
   const k=hasSnap?Math.min(1,fade/fadeLen):1,e=k*k*(3-2*k);
   for(let i=0;i<N;i++){const m=map[i],o=i*4;let x,y,z,w;
    if(m<0){const r=joints[i].r;x=r[0];y=r[1];z=r[2];w=r[3];}else{x=ra[m*4];y=ra[m*4+1];z=ra[m*4+2];w=ra[m*4+3];}
    if(hasSnap){let sx=snap[o],sy=snap[o+1],sz=snap[o+2],sw=snap[o+3];if(sx*x+sy*y+sz*z+sw*w<0){x=-x;y=-y;z=-z;w=-w;}
     x=sx+(x-sx)*e;y=sy+(y-sy)*e;z=sz+(z-sz)*e;w=sw+(w-sw)*e;const l=Math.hypot(x,y,z,w)||1;x/=l;y/=l;z/=l;w/=l;}
    rot[o]=x;rot[o+1]=y;rot[o+2]=z;rot[o+3]=w;}
   for(let d=0;d<3;d++)curP[d]=hasSnap?snapP[d]+(pa[d]*pk-snapP[d])*e:pa[d]*pk;
   this.pose();},
  // optional per-joint extra rotation (quaternion, applied after the clip): e.g. head look / lean
  extra:{},
  pose(){for(let i=0;i<N;i++){const j=joints[i],o=i*4;tq[0]=rot[o];tq[1]=rot[o+1];tq[2]=rot[o+2];tq[3]=rot[o+3];
    const ex=R.extra[j.n];if(ex)qmul(tq,ex);
    if(i===pelvis&&cur){tt[0]=curP[0];tt[1]=curP[1];tt[2]=curP[2];}else{tt[0]=j.t[0];tt[1]=j.t[1];tt[2]=j.t[2];}
    compose(local,tt,tq,j.s);
    if(j.p<0)world.set(local,i*16);else{mul(world.subarray(j.p*16,j.p*16+16),local,tmp);world.set(tmp,i*16);}
    mul(world.subarray(i*16,i*16+16),ibm.subarray(i*16,i*16+16),tmp);
    // 3x4 rows for the shader: row r = (m[r], m[4+r], m[8+r], m[12+r])
    const s=i*12;for(let r=0;r<3;r++){skin[s+r*4]=tmp[r];skin[s+r*4+1]=tmp[4+r];skin[s+r*4+2]=tmp[8+r];skin[s+r*4+3]=tmp[12+r];}}},
  // world matrix of a joint (model space) for attaching props
  jointMatrix(name,o=new Float32Array(16)){const i=joints.findIndex(j=>j.n===name);o.set(world.subarray(i*16,i*16+16));return o;},
  jointIndex(name){return joints.findIndex(j=>j.n===name);}};
 return R;}
function qmul(a,b){const [ax,ay,az,aw]=a,[bx,by,bz,bw]=b;a[0]=aw*bx+ax*bw+ay*bz-az*by;a[1]=aw*by-ax*bz+ay*bw+az*bx;a[2]=aw*bz+ax*by-ay*bx+az*bw;a[3]=aw*bw-ax*bx-ay*by-az*bz;return a;}
function qaxis(ax,ay,az,ang){const s=Math.sin(ang/2);return [ax*s,ay*s,az*s,Math.cos(ang/2)];}

Object.assign(exports,{parseSKM,makeClips,makeRig,sampleClip,compose,mul,qmul,qaxis,qnorm});
