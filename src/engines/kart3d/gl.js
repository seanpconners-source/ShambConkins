// Tiny WebGL 1 toolkit for the 3D kart game: column-major mat4 helpers, shader programs and a flat-shaded geometry
// builder (interleaved position, normal, colour).
const M4={
 ident:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 mul(a,b,o=new Float32Array(16)){for(let c=0;c<4;c++)for(let r=0;r<4;r++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];o[c*4+r]=v;}return o;},
 persp(fovy,aspect,near,far,o=new Float32Array(16)){const f=1/Math.tan(fovy/2),nf=1/(near-far);o.fill(0);o[0]=f/aspect;o[5]=f;o[10]=(far+near)*nf;o[11]=-1;o[14]=2*far*near*nf;return o;},
 lookAt(e,t,up,o=new Float32Array(16)){
  let zx=e[0]-t[0],zy=e[1]-t[1],zz=e[2]-t[2],l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;
  let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;
  const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
  o[0]=xx;o[1]=yx;o[2]=zx;o[3]=0;o[4]=xy;o[5]=yy;o[6]=zy;o[7]=0;o[8]=xz;o[9]=yz;o[10]=zz;o[11]=0;
  o[12]=-(xx*e[0]+xy*e[1]+xz*e[2]);o[13]=-(yx*e[0]+yy*e[1]+yz*e[2]);o[14]=-(zx*e[0]+zy*e[1]+zz*e[2]);o[15]=1;return o;},
 // local X → F, Y → N, Z → R, then translate to P (uniform scale s, optional extra Y scale)
 frame(P,F,N,R,s=1,o=new Float32Array(16),sy=1){o[0]=F[0]*s;o[1]=F[1]*s;o[2]=F[2]*s;o[3]=0;o[4]=N[0]*s*sy;o[5]=N[1]*s*sy;o[6]=N[2]*s*sy;o[7]=0;o[8]=R[0]*s;o[9]=R[1]*s;o[10]=R[2]*s;o[11]=0;o[12]=P[0];o[13]=P[1];o[14]=P[2];o[15]=1;return o;},
 trs(tx,ty,tz,ry=0,rx=0,s=1){// translate * rotY * rotX * scale
  const cy=Math.cos(ry),sy=Math.sin(ry),cx=Math.cos(rx),sx=Math.sin(rx);
  return new Float32Array([cy*s,0,-sy*s,0, sy*sx*s,cx*s,cy*sx*s,0, sy*cx*s,-sx*s,cy*cx*s,0, tx,ty,tz,1]);},
 apply(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
};
function shader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)&&!gl.isContextLost())throw new Error('kart shader: '+gl.getShaderInfoLog(s));return s;}
function program(gl,vs,fs){
 const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS)&&!gl.isContextLost())throw new Error('kart program: '+gl.getProgramInfoLog(p));
 const a={},u={};const na=gl.getProgramParameter(p,gl.ACTIVE_ATTRIBUTES)||0,nu=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS)||0;
 for(let i=0;i<na;i++){const n=gl.getActiveAttrib(p,i).name;a[n]=gl.getAttribLocation(p,n);}
 for(let i=0;i<nu;i++){const n=gl.getActiveUniform(p,i).name.replace(/\[0\]$/,'');u[n]=gl.getUniformLocation(p,n);}
 return {p,a,u};
}
const hex=h=>{const n=parseInt(h.slice(1),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];};
const shade=(c,k)=>c.map(v=>Math.min(1,v*k));
class Geo{
 constructor(){this.v=[];}
 tri(a,b,c,col){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
  for(const p of [a,b,c])this.v.push(p[0],p[1],p[2],nx,ny,nz,col[0],col[1],col[2]);}
 quad(a,b,c,d,col){this.tri(a,b,c,col);this.tri(a,c,d,col);}
 // axis-aligned box; top face optionally scaled (tx, tz) for wedges
 box(cx,cy,cz,sx,sy,sz,col,{tx=1,tz=1,sides=null}={}){
  const x0=cx-sx/2,x1=cx+sx/2,y0=cy-sy/2,y1=cy+sy/2,z0=cz-sz/2,z1=cz+sz/2,X0=cx-sx/2*tx,X1=cx+sx/2*tx,Z0=cz-sz/2*tz,Z1=cz+sz/2*tz;
  const b=[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],t=[[X0,y1,Z0],[X1,y1,Z0],[X1,y1,Z1],[X0,y1,Z1]],cs=sides||{};
  this.quad(t[0],t[3],t[2],t[1],cs.top||col);this.quad(b[0],b[1],b[2],b[3],cs.bottom||shade(col,.6));
  this.quad(b[1],t[1],t[2],b[2],cs.front||col);this.quad(b[3],t[3],t[0],b[0],cs.back||shade(col,.8));
  this.quad(b[2],t[2],t[3],b[3],cs.right||shade(col,.9));this.quad(b[0],t[0],t[1],b[1],cs.left||shade(col,.9));}
 // cylinder along the local Z axis (wheels, coins)
 cylZ(cx,cy,cz,r,w,seg,col,cap=col){for(let k=0;k<seg;k++){const a0=k/seg*Math.PI*2,a1=(k+1)/seg*Math.PI*2,p=(a,z)=>[cx+Math.cos(a)*r,cy+Math.sin(a)*r,cz+z];
  this.quad(p(a0,-w/2),p(a1,-w/2),p(a1,w/2),p(a0,w/2),col);this.tri([cx,cy,cz+w/2],p(a0,w/2),p(a1,w/2),cap);this.tri([cx,cy,cz-w/2],p(a1,-w/2),p(a0,-w/2),cap);}}
 cylX(cx,cy,cz,r,len,seg,col,cap=col){for(let k=0;k<seg;k++){const a0=k/seg*Math.PI*2,a1=(k+1)/seg*Math.PI*2,p=(a,x)=>[cx+x,cy+Math.cos(a)*r,cz+Math.sin(a)*r];
  this.quad(p(a0,-len/2),p(a1,-len/2),p(a1,len/2),p(a0,len/2),col);this.tri([cx+len/2,cy,cz],p(a0,len/2),p(a1,len/2),cap);this.tri([cx-len/2,cy,cz],p(a1,-len/2),p(a0,-len/2),cap);}}
 sphere(cx,cy,cz,r,seg,col,{sy=1,top=1}={}){const st=Math.ceil(seg/2);for(let i=0;i<st;i++){const t0=i/st*Math.PI,t1=(i+1)/st*Math.PI;if(t0>=Math.PI*top-1e-6)break;
  for(let k=0;k<seg;k++){const a0=k/seg*Math.PI*2,a1=(k+1)/seg*Math.PI*2,p=(t,a)=>[cx+Math.sin(t)*Math.cos(a)*r,cy+Math.cos(t)*r*sy,cz+Math.sin(t)*Math.sin(a)*r];
   this.quad(p(t0,a0),p(t0,a1),p(t1,a1),p(t1,a0),col);}}}
 // torus around the local X axis (rings the track passes through)
 torusX(R,r,segR,segr,col){for(let i=0;i<segR;i++)for(let j=0;j<segr;j++){const p=(i,j)=>{const a=i/segR*Math.PI*2,b=j/segr*Math.PI*2,rr=R+Math.cos(b)*r;return [Math.sin(b)*r,Math.cos(a)*rr,Math.sin(a)*rr];};
  this.quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),col);}}
 star(r1,r2,th,col){const pts=[];for(let k=0;k<10;k++){const a=k/10*Math.PI*2-Math.PI/2,r=k%2?r2:r1;pts.push([Math.cos(a)*r,-Math.sin(a)*r]);}
  for(let k=0;k<10;k++){const a=pts[k],b=pts[(k+1)%10];this.tri([0,0,th],[b[0],b[1],0],[a[0],a[1],0],col);this.tri([0,0,-th],[a[0],a[1],0],[b[0],b[1],0],shade(col,.8));}}
 upload(gl){const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.v),gl.STATIC_DRAW);return {buf,n:this.v.length/9};}
}
Object.assign(exports,{M4,program,Geo,hex,shade});
