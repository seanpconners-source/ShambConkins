// Kingpin Bowling: WebGL2 renderer for an indoor alley. One lit shader (hemisphere ambient + a key light + up to 8 point
// lights with Blinn specular, vertex colours, a texture, emissive for neon/glow, distance fog) and a MIRROR pass: things
// above the lacquered lane are drawn flipped under it first, then the lane is drawn half see-through over them, so the
// pins and the ball reflect in the oil like a real lane.
// API: createGL(canvas) -> G | null
//   G.texture(src,{repeat,mips}) ; G.retexture(t,src) ; G.mesh(arrays) ; G.update(mesh,arrays)
//   G.begin(frame) ; G.draw(mesh,model,opts) ; G.lost ; G.destroy()
//   frame: {w,h,view,proj,eye,lights:[[x,y,z,range,r,g,b]..],key,keyCol,ambTop,ambBot,fog,fogNear,fogFar,clear}
//   opts: {tex,tint,emis,spec:[strength,power],alpha,add,mirror,cull,noDepth,depthWrite}
const {mul}=require("src/engines/trun/skel.js");
const {perspective,lookAt,invert}=require("src/engines/trun/render.js");
const HEAD=`#version 300 es
precision highp float;`;
const VS=HEAD+`
in vec3 aP;in vec3 aN;in vec2 aU;in vec4 aC;uniform mat4 uM,uVP,uMir;out vec3 vW,vN;out vec2 vU;out vec4 vC;
void main(){vec4 w=uMir*(uM*vec4(aP,1.));vW=w.xyz;vN=mat3(uMir)*(mat3(uM)*aN);vU=aU;vC=aC;gl_Position=uVP*w;}`;
const FS=HEAD+`
in vec3 vW,vN;in vec2 vU;in vec4 vC;
uniform sampler2D uT;uniform vec4 uTint;uniform float uEmis,uAlpha,uMirror,uCut;uniform vec2 uSpec;
uniform vec4 uL[8];uniform vec3 uLC[8];uniform int uNL;
uniform vec3 uAmbTop,uAmbBot,uKey,uKeyCol,uEye,uFogCol;uniform vec2 uFog;
out vec4 o;
vec3 lin(vec3 c){return c*c;}
void main(){
 if(uMirror>.5&&vW.y>.002)discard;
 vec4 t=texture(uT,vU)*vC*uTint;if(t.a<uCut)discard;
 vec3 base=lin(t.rgb),N=normalize(gl_FrontFacing?vN:-vN),V=normalize(uEye-vW);
 vec3 amb=mix(uAmbBot,uAmbTop,N.y*.5+.5);
 vec3 dif=amb,spc=vec3(0.);
 float kd=max(dot(N,uKey),0.);dif+=uKeyCol*kd;
 if(uSpec.x>0.){vec3 H=normalize(uKey+V);spc+=uKeyCol*pow(max(dot(N,H),0.),uSpec.y)*kd;}
 for(int i=0;i<8;i++){if(i>=uNL)break;vec3 d=uL[i].xyz-vW;float r=length(d);d/=r;float a=clamp(1.-r/uL[i].w,0.,1.);a*=a;
  float nd=max(dot(N,d),0.);dif+=uLC[i]*nd*a;
  if(uSpec.x>0.){vec3 H=normalize(d+V);spc+=uLC[i]*pow(max(dot(N,H),0.),uSpec.y)*a*step(0.,nd);}}
 vec3 col=base*dif+spc*uSpec.x;
 col=mix(col,base,uEmis);
 float f=clamp((length(uEye-vW)-uFog.x)/(uFog.y-uFog.x),0.,1.);col=mix(col,lin(uFogCol),f*f);
 o=vec4(sqrt(max(col,0.)),t.a*uAlpha);}`;
const MIR=new Float32Array([1,0,0,0, 0,-1,0,0, 0,0,1,0, 0,0,0,1]),ID=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function createGL(canvas){
 let gl=null;try{gl=canvas.getContext('webgl2',{antialias:true,alpha:false,depth:true,powerPreference:'high-performance'});}catch{gl=null;}
 if(!gl)return null;
 const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)&&!gl.isContextLost())throw new Error('bowl shader: '+gl.getShaderInfoLog(s));return s;};
 const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,FS));['aP','aN','aU','aC'].forEach((a,i)=>gl.bindAttribLocation(p,i,a));gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS)&&!gl.isContextLost())throw new Error('bowl link: '+gl.getProgramInfoLog(p));
 const U={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const nm=gl.getActiveUniform(p,i).name.replace(/\[0\]$/,'');U[nm]=gl.getUniformLocation(p,nm);}
 const white=(()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));return t;})();
 const aniso=gl.getExtension('EXT_texture_filter_anisotropic');
 let VP=new Float32Array(16),F=null,lost=false;const LP=new Float32Array(32),LC=new Float32Array(24);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;G.lost=true;});
 const G={gl,lost:false,white,
  texture(src,{repeat=false,mips=true}={}){const t=gl.createTexture();G.retexture(t,src,{repeat,mips});return t;},
  retexture(t,src,{repeat=false,mips=true}={}){gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);const w=repeat?gl.REPEAT:gl.CLAMP_TO_EDGE;
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,w);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,w);
   if(mips){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);if(aniso)gl.texParameterf(gl.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));}
   else gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t;},
  freeTexture(t){if(t&&t!==white)gl.deleteTexture(t);},
  mesh(a){const m={vao:gl.createVertexArray(),bufs:[],n:0};G.update(m,a);return m;},
  update(m,a){gl.bindVertexArray(m.vao);
   const put=(i,data,size,type,norm)=>{let b=m.bufs[i];if(!b)b=m.bufs[i]=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,type,norm,0,0);};
   put(0,a.pos,3,gl.FLOAT,false);put(1,a.nrm,3,gl.FLOAT,false);
   if(a.uv)put(2,a.uv,2,gl.FLOAT,false);else{gl.disableVertexAttribArray(2);gl.vertexAttrib2f(2,0,0);}
   if(a.col)put(3,a.col,4,gl.UNSIGNED_BYTE,true);else{gl.disableVertexAttribArray(3);gl.vertexAttrib4f(3,1,1,1,1);}
   if(a.idx){let b=m.bufs[9];if(!b)b=m.bufs[9]=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,a.idx,gl.STATIC_DRAW);m.n=a.idx.length;m.it=a.idx instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT;}
   else{m.n=a.pos.length/3;m.it=0;}gl.bindVertexArray(null);},
  freeMesh(m){for(const b of m.bufs)if(b)gl.deleteBuffer(b);gl.deleteVertexArray(m.vao);},
  begin(f){if(lost)return false;F=f;if(canvas.width!==f.w||canvas.height!==f.h){canvas.width=f.w;canvas.height=f.h;}
   gl.viewport(0,0,f.w,f.h);mul(f.proj,f.view,VP);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.disable(gl.BLEND);
   gl.clearColor(...(f.clear||[0,0,0]),1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.useProgram(p);gl.uniformMatrix4fv(U.uVP,false,VP);
   const L=f.lights||[],nl=Math.min(8,L.length);for(let i=0;i<nl;i++){const l=L[i];LP.set([l[0],l[1],l[2],l[3]],i*4);LC.set([l[4],l[5],l[6]],i*3);}
   gl.uniform4fv(U.uL,LP);gl.uniform3fv(U.uLC,LC);gl.uniform1i(U.uNL,nl);
   gl.uniform3fv(U.uAmbTop,f.ambTop||[.25,.25,.28]);gl.uniform3fv(U.uAmbBot,f.ambBot||[.08,.07,.07]);gl.uniform3fv(U.uKey,f.key||[0,1,0]);gl.uniform3fv(U.uKeyCol,f.keyCol||[0,0,0]);
   gl.uniform3fv(U.uEye,f.eye);gl.uniform3fv(U.uFogCol,f.fog||[0,0,0]);gl.uniform2f(U.uFog,f.fogNear??30,f.fogFar??80);gl.uniform1i(U.uT,0);gl.activeTexture(gl.TEXTURE0);
   return true;},
  draw(m,model,o={}){if(!m||!m.n)return;
   gl.uniformMatrix4fv(U.uM,false,model||ID);gl.uniformMatrix4fv(U.uMir,false,o.mirror?MIR:ID);gl.uniform1f(U.uMirror,o.mirror?1:0);
   gl.uniform4fv(U.uTint,o.tint||[1,1,1,1]);gl.uniform1f(U.uEmis,o.emis||0);gl.uniform1f(U.uAlpha,o.alpha??1);gl.uniform1f(U.uCut,o.cut??.01);
   const s=o.spec||[0,1];gl.uniform2f(U.uSpec,s[0],s[1]);
   gl.bindTexture(gl.TEXTURE_2D,o.tex||white);
   if(o.add){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);}
   else if(o.alpha!=null&&o.alpha<1||o.blend){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(o.depthWrite??true);}
   else{gl.disable(gl.BLEND);gl.depthMask(true);}
   if(o.noDepth)gl.disable(gl.DEPTH_TEST);else gl.enable(gl.DEPTH_TEST);
   if(o.cull){gl.enable(gl.CULL_FACE);gl.frontFace(o.mirror?gl.CW:gl.CCW);}else gl.disable(gl.CULL_FACE);
   gl.bindVertexArray(m.vao);if(m.it)gl.drawElements(gl.TRIANGLES,m.n,m.it,0);else gl.drawArrays(gl.TRIANGLES,0,m.n);gl.bindVertexArray(null);},
  // world point -> screen px (for 2D labels over the 3D view)
  project(x,y,z){const v=VP,w=v[3]*x+v[7]*y+v[11]*z+v[15];if(w<=.01)return null;
   return [(1+(v[0]*x+v[4]*y+v[8]*z+v[12])/w)*F.w/2,(1-(v[1]*x+v[5]*y+v[9]*z+v[13])/w)*F.h/2,w];},
  destroy(){try{gl.getExtension('WEBGL_lose_context')?.loseContext();}catch{}}};
 return G;}

// ---------------------------------------------------------------- mesh builders (plain arrays)
function builder(){const P=[],N=[],UV=[],C=[],I=[];let n=0;
 const B={
  v(x,y,z,nx,ny,nz,u=0,w=0,c=[255,255,255,255]){P.push(x,y,z);N.push(nx,ny,nz);UV.push(u,w);C.push(c[0],c[1],c[2],c[3]??255);return n++;},
  tri(a,b,c){I.push(a,b,c);},
  // a quad from 4 corners (counter-clockwise seen from the normal side), uv rect
  quad(p0,p1,p2,p3,nrm,uv=[0,0,1,1],c){const a=B.v(...p0,...nrm,uv[0],uv[1],c),b=B.v(...p1,...nrm,uv[2],uv[1],c),d=B.v(...p2,...nrm,uv[2],uv[3],c),e=B.v(...p3,...nrm,uv[0],uv[3],c);I.push(a,b,d,a,d,e);},
  // axis box (x0..x1, y0..y1, z0..z1); faces = which faces to make (default all)
  box(x0,y0,z0,x1,y1,z1,c,faces='xXyYzZ',uv=[0,0,1,1]){
   if(faces.includes('Y'))B.quad([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[0,1,0],uv,c);
   if(faces.includes('y'))B.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],uv,c);
   if(faces.includes('Z'))B.quad([x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[x0,y0,z1],[0,0,1],uv,c);
   if(faces.includes('z'))B.quad([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],[0,0,-1],uv,c);
   if(faces.includes('X'))B.quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],[1,0,0],uv,c);
   if(faces.includes('x'))B.quad([x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0],[-1,0,0],uv,c);},
  // a lathe around +y: prof = [[r,y],...] bottom to top; seg sides; colour by height fn(y)->rgba; uv u around, v by y
  lathe(prof,seg,colAt,cx=0,cy=0,cz=0){const rows=[];const H=prof[prof.length-1][1]-prof[0][1]||1;
   for(let k=0;k<prof.length;k++){const [r,y]=prof[k],pr=prof[Math.max(0,k-1)],nx=prof[Math.min(prof.length-1,k+1)];
    const dr=nx[0]-pr[0],dy=nx[1]-pr[1],l=Math.hypot(dr,dy)||1,nr=dy/l,ny=-dr/l;const row=[];
    for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);row.push(B.v(cx+ca*r,cy+y,cz+sa*r,ca*nr,ny,sa*nr,i/seg,(y-prof[0][1])/H,colAt?colAt(y):undefined));}
    rows.push(row);}
   for(let k=0;k+1<rows.length;k++)for(let i=0;i<seg;i++){const a=rows[k][i],b=rows[k][i+1],c=rows[k+1][i+1],d=rows[k+1][i];I.push(a,d,c,a,c,b);}},
  sphere(r,seg=24,rings=16,cx=0,cy=0,cz=0,c){const st=n;
   for(let j=0;j<=rings;j++){const v=j/rings,ph=v*Math.PI,sy=Math.cos(ph),sr=Math.sin(ph);
    for(let i=0;i<=seg;i++){const u=i/seg,th=u*Math.PI*2,x=Math.cos(th)*sr,z=Math.sin(th)*sr;B.v(cx+x*r,cy+sy*r,cz+z*r,x,sy,z,u,v,c);}}
   for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){const a=st+j*(seg+1)+i,b=a+1,d=a+seg+1,e=d+1;I.push(a,b,e,a,e,d);}},
  // a half pipe along z (gutter): centre x, top y, radius, z0..z1, inside faces up
  trough(cx,ty,r,z0,z1,seg,c){const st=n;for(let i=0;i<=seg;i++){const a=Math.PI*(i/seg),x=cx-Math.cos(a)*r,y=ty-Math.sin(a)*r,nx=Math.cos(a),ny=Math.sin(a);
    B.v(x,y,z0,nx,ny,0,i/seg,0,c);B.v(x,y,z1,nx,ny,0,i/seg,1,c);}
   for(let i=0;i<seg;i++){const a=st+i*2;I.push(a,a+1,a+3,a,a+3,a+2);}},
  done(){const big=n>65535;return {pos:new Float32Array(P),nrm:new Float32Array(N),uv:new Float32Array(UV),col:new Uint8Array(C),idx:big?new Uint32Array(I):new Uint16Array(I)};},
  get count(){return n;}};
 return B;}
// model matrix: translate + quaternion [x,y,z,w] + uniform scale
function poseM(x,y,z,q=[0,0,0,1],s=1,o=new Float32Array(16)){const [qx,qy,qz,qw]=q,x2=qx+qx,y2=qy+qy,z2=qz+qz,xx=qx*x2,xy=qx*y2,xz=qx*z2,yy=qy*y2,yz=qy*z2,zz=qz*z2,wx=qw*x2,wy=qw*y2,wz=qw*z2;
 o[0]=(1-(yy+zz))*s;o[1]=(xy+wz)*s;o[2]=(xz-wy)*s;o[3]=0;o[4]=(xy-wz)*s;o[5]=(1-(xx+zz))*s;o[6]=(yz+wx)*s;o[7]=0;o[8]=(xz+wy)*s;o[9]=(yz-wx)*s;o[10]=(1-(xx+yy))*s;o[11]=0;o[12]=x;o[13]=y;o[14]=z;o[15]=1;return o;}
const at=(x,y,z,s=1)=>poseM(x,y,z,[0,0,0,1],s);
Object.assign(exports,{createGL,builder,poseM,at,perspective,lookAt,invert});
