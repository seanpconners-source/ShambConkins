// Tiny WebGL renderer for Hole.it: instanced vertex-coloured meshes with soft
// plastic shading, a tiled floor with the hole cut out, the hole's rim/throat,
// floor decals (contact shadows, growth arc, level-up ring) and textured head tokens.
const {kindGeometry,rimGeometry,throatGeometry}=require("src/engines/holeIt/meshes.js");
const MESH_VS=`attribute vec3 aPos;attribute vec3 aNor;attribute vec3 aCol;attribute vec4 iA;attribute vec4 iB;attribute vec4 iC;attribute vec4 iT;
uniform mat4 uVP;varying vec3 vN;varying vec3 vC;varying vec3 vW;
void main(){vec4 p=vec4(aPos,1.);vec3 w=vec3(dot(iA,p),dot(iB,p),dot(iC,p));vN=vec3(dot(iA.xyz,aNor),dot(iB.xyz,aNor),dot(iC.xyz,aNor));vC=aCol*iT.rgb;vW=w;gl_Position=uVP*vec4(w,1.);}`;
const MESH_FS=`precision mediump float;varying vec3 vN;varying vec3 vC;varying vec3 vW;uniform vec3 uEye;uniform vec3 uLight;uniform vec4 uHole;
void main(){vec3 n=normalize(vN);vec3 l=normalize(uLight);float nl=dot(n,l);float wrap=max((nl+.4)/1.4,0.);vec3 v=normalize(uEye-vW);vec3 h=normalize(l+v);
float sp=pow(max(dot(n,h),0.),36.)*.42;float hemi=mix(.6,1.,n.y*.5+.5);float rim=pow(1.-max(dot(n,v),0.),3.)*.16;
vec3 col=vC*(.46*hemi+.66*wrap)+vec3(sp+rim)*step(-.01,vW.y+.02);
float below=clamp(-vW.y/(uHole.z*1.5+.2),0.,1.);col*=1.-below*.96;gl_FragColor=vec4(col,1.);}`;
const FLOOR_VS=`attribute vec3 aPos;uniform mat4 uVP;varying vec3 vW;void main(){vW=aPos;gl_Position=uVP*vec4(aPos,1.);}`;
const FLOOR_FS=`precision mediump float;varying vec3 vW;uniform vec4 uHole;uniform vec3 uFloor;uniform float uMode;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){float dh=length(vW.xz-uHole.xy);if(dh<uHole.z)discard;vec3 col;
if(uMode<.5){vec2 t=vW.xz/vec2(2.4,1.2);t.x+=floor(t.y)*.5;vec2 f=fract(t);float e=min(min(f.x,1.-f.x)*2.4,min(f.y,1.-f.y)*1.2);
float line=smoothstep(.0,.035,e);col=uFloor*(1.+(hash(floor(t))-.5)*.06)*(.86+.14*line);}
else{vec2 t=vW.xz*1.7;float n=hash(floor(t))*.5+hash(floor(t*2.3))*.5;col=mix(vec3(.24,.62,.2),vec3(.33,.74,.26),n);}
col*=mix(.7,1.,smoothstep(uHole.z*1.15,uHole.z*1.8,dh));gl_FragColor=vec4(col,1.);}`;
const DECAL_VS=`attribute vec2 aCorner;attribute vec4 iD;uniform mat4 uVP;uniform float uY;varying vec2 vUV;varying float vA;varying vec2 vW;
void main(){vec3 w=vec3(iD.x+aCorner.x*iD.z,uY,iD.y+aCorner.y*iD.z);vUV=aCorner;vA=iD.w;vW=w.xz;gl_Position=uVP*vec4(w,1.);}`;
const DECAL_FS=`precision mediump float;varying vec2 vUV;varying float vA;varying vec2 vW;uniform vec4 uHole;uniform float uMode;uniform vec3 uColor;uniform vec2 uArc;uniform float uThick;
void main(){float d=length(vUV);float a;
if(uMode<.5){if(length(vW-uHole.xy)<uHole.z*1.02)discard;a=(1.-smoothstep(.15,1.,d))*vA;}
else{a=vA*(1.-smoothstep(uThick*.55,uThick,abs(d-(1.-uThick))));if(uMode>1.5){float ang=atan(-vUV.x,vUV.y)/6.2831853+.5;float t=fract(ang-uArc.x);if(t>uArc.y)a*=.0;}}
if(a<.004)discard;gl_FragColor=vec4(uColor*a,a);}`;
const TEX_VS=`attribute vec3 aPos;attribute vec2 aUV;uniform mat4 uVP;uniform mat4 uM;varying vec2 vUV;varying float vY;void main(){vec4 w=uM*vec4(aPos,1.);vUV=aUV;vY=w.y;gl_Position=uVP*w;}`;
const TEX_FS=`precision mediump float;varying vec2 vUV;varying float vY;uniform sampler2D uTex;uniform vec4 uRect;uniform vec4 uHole;
void main(){vec2 c=vUV-.5;if(length(c)>.5)discard;vec4 t=texture2D(uTex,uRect.xy+vUV*uRect.zw);vec3 col=mix(vec3(1.,.86,.4),t.rgb,t.a);float below=clamp(-vY/(uHole.z*1.5+.2),0.,1.);gl_FragColor=vec4(col*(1.-below*.96),1.);}`;

// ---- matrices (column-major) ----
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(e,t,u=[0,1,0]){let z=[e[0]-t[0],e[1]-t[1],e[2]-t[2]];let l=Math.hypot(...z);z=z.map(v=>v/l);let x=[u[1]*z[2]-u[2]*z[1],u[2]*z[0]-u[0]*z[2],u[0]*z[1]-u[1]*z[0]];l=Math.hypot(...x);x=x.map(v=>v/l);const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*e[0]+x[1]*e[1]+x[2]*e[2]),-(y[0]*e[0]+y[1]*e[1]+y[2]*e[2]),-(z[0]*e[0]+z[1]*e[1]+z[2]*e[2]),1]);}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;}
// Write a 3x4 affine (rows) for centre-of-mass c, quaternion q, uniform scale s and pivot height py into out[o..o+11].
function affine(out,o,c,q,s,py){const [x,y,z,w]=q,r00=1-2*(y*y+z*z),r01=2*(x*y-z*w),r02=2*(x*z+y*w),r10=2*(x*y+z*w),r11=1-2*(x*x+z*z),r12=2*(y*z-x*w),r20=2*(x*z-y*w),r21=2*(y*z+x*w),r22=1-2*(x*x+y*y);
 out[o]=r00*s;out[o+1]=r01*s;out[o+2]=r02*s;out[o+3]=c[0]-r01*s*py;out[o+4]=r10*s;out[o+5]=r11*s;out[o+6]=r12*s;out[o+7]=c[1]-r11*s*py;out[o+8]=r20*s;out[o+9]=r21*s;out[o+10]=r22*s;out[o+11]=c[2]-r21*s*py;}

function createRenderer(canvas){
 let gl=null;try{gl=canvas.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:true,powerPreference:'high-performance'})||canvas.getContext('experimental-webgl');}catch{}
 if(!gl)return null;
 const ext=gl.getExtension('ANGLE_instanced_arrays');if(!ext)return null;
 const compile=(vs,fs)=>{const p=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error('Hole.it shader: '+gl.getShaderInfoLog(sh));gl.attachShader(p,sh);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('Hole.it link: '+gl.getProgramInfoLog(p));
  const a={},u={};const na=gl.getProgramParameter(p,gl.ACTIVE_ATTRIBUTES);for(let i=0;i<na;i++){const n=gl.getActiveAttrib(p,i).name;a[n]=gl.getAttribLocation(p,n);}const nu=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<nu;i++){const n=gl.getActiveUniform(p,i).name;u[n]=gl.getUniformLocation(p,n);}return {p,a,u};};
 const mesh=compile(MESH_VS,MESH_FS),floor=compile(FLOOR_VS,FLOOR_FS),decal=compile(DECAL_VS,DECAL_FS),tex=compile(TEX_VS,TEX_FS);
 const buf=(data,target=gl.ARRAY_BUFFER,usage=gl.STATIC_DRAW)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,usage);return b;};
 const upload=g=>{const p=g.p instanceof Float32Array?g:{p:new Float32Array(g.p),n:new Float32Array(g.n),c:new Float32Array(g.c),count:g.p.length/3};return {p:buf(p.p),n:buf(p.n),c:buf(p.c),count:p.count??p.p.length/3};};
 const kinds={};const kindBuf=id=>kinds[id]||(kinds[id]=upload(kindGeometry(id)));
 const rim=upload(rimGeometry()),throat=upload(throatGeometry());
 let walls=null;
 const instBuf=gl.createBuffer();let instCap=0;
 const quad=buf(new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]));
 const decalBuf=gl.createBuffer();let decalCap=0;
 const floorBuf=gl.createBuffer();
 const texQuad=buf(new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,-.5,0,.5,.5,0,-.5,.5,0])),texUV=buf(new Float32Array([0,1,1,1,1,0,0,1,1,0,0,0]));
 let headTex=null;
 const IDENT=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,1,1,1,1]);
 let vp=null,eye=[0,0,0],view={W:1,H:1};
 function attr(loc,b,size){if(loc==null||loc<0)return;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);ext.vertexAttribDivisorANGLE(loc,0);}
 function useMesh(hole){gl.useProgram(mesh.p);gl.uniformMatrix4fv(mesh.u.uVP,false,vp);gl.uniform3fv(mesh.u.uEye,eye);gl.uniform3f(mesh.u.uLight,-.45,1,.55);gl.uniform4f(mesh.u.uHole,hole.x,hole.z,hole.r,0);}
 function drawStatic(m,affine12,tint=[1,1,1,1]){attr(mesh.a.aPos,m.p,3);attr(mesh.a.aNor,m.n,3);attr(mesh.a.aCol,m.c,3);
  for(const [k,n] of [['iA',0],['iB',4],['iC',8]]){const l=mesh.a[k];gl.disableVertexAttribArray(l);gl.vertexAttrib4f(l,affine12[n],affine12[n+1],affine12[n+2],affine12[n+3]);}
  gl.disableVertexAttribArray(mesh.a.iT);gl.vertexAttrib4f(mesh.a.iT,...tint);gl.drawArrays(gl.TRIANGLES,0,m.count);}
 function drawInstanced(m,data,count){if(!count)return;attr(mesh.a.aPos,m.p,3);attr(mesh.a.aNor,m.n,3);attr(mesh.a.aCol,m.c,3);
  gl.bindBuffer(gl.ARRAY_BUFFER,instBuf);const bytes=count*64;if(bytes>instCap){instCap=Math.max(bytes,instCap*2,4096);gl.bufferData(gl.ARRAY_BUFFER,instCap,gl.DYNAMIC_DRAW);}gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,count*16));
  for(const [k,o] of [['iA',0],['iB',16],['iC',32],['iT',48]]){const l=mesh.a[k];gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,4,gl.FLOAT,false,64,o);ext.vertexAttribDivisorANGLE(l,1);}
  ext.drawArraysInstancedANGLE(gl.TRIANGLES,0,m.count,count);for(const k of ['iA','iB','iC','iT'])ext.vertexAttribDivisorANGLE(mesh.a[k],0),gl.disableVertexAttribArray(mesh.a[k]);}
 function drawDecals(hole,data,count,mode,color,{y=.006,arc=[0,1],thick=.2}={}){if(!count)return;gl.useProgram(decal.p);gl.uniformMatrix4fv(decal.u.uVP,false,vp);gl.uniform4f(decal.u.uHole,hole.x,hole.z,hole.r,0);gl.uniform1f(decal.u.uMode,mode);gl.uniform3fv(decal.u.uColor,color);gl.uniform2fv(decal.u.uArc,arc);gl.uniform1f(decal.u.uThick,thick);gl.uniform1f(decal.u.uY,y);
  attr(decal.a.aCorner,quad,2);gl.bindBuffer(gl.ARRAY_BUFFER,decalBuf);const bytes=count*16;if(bytes>decalCap){decalCap=Math.max(bytes,decalCap*2,4096);gl.bufferData(gl.ARRAY_BUFFER,decalCap,gl.DYNAMIC_DRAW);}gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,count*4));
  const l=decal.a.iD;gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,4,gl.FLOAT,false,16,0);ext.vertexAttribDivisorANGLE(l,1);ext.drawArraysInstancedANGLE(gl.TRIANGLES,0,6,count);ext.vertexAttribDivisorANGLE(l,0);gl.disableVertexAttribArray(l);}
 function setCamera(W,H,dpr,e,t,fov=.72){const w=Math.max(1,Math.round(W*dpr)),h=Math.max(1,Math.round(H*dpr));if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;gl.viewport(0,0,w,h);
  eye=e;view={W,H};const dist=Math.hypot(e[0]-t[0],e[1]-t[1],e[2]-t[2]);vp=mul(perspective(fov,W/H,Math.max(.1,dist*.08),dist*8+60),lookAt(e,t));}
 function project(x,y,z){if(!vp)return {x:0,y:0,w:0};const m=vp,cx=m[0]*x+m[4]*y+m[8]*z+m[12],cy=m[1]*x+m[5]*y+m[9]*z+m[13],cw=m[3]*x+m[7]*y+m[11]*z+m[15];return {x:(cx/cw*.5+.5)*view.W,y:(1-(cy/cw*.5+.5))*view.H,w:cw};}
 function drawFloor(hole,rect,color,mode){gl.useProgram(floor.p);gl.uniformMatrix4fv(floor.u.uVP,false,vp);gl.uniform4f(floor.u.uHole,hole.x,hole.z,hole.r,0);gl.uniform3fv(floor.u.uFloor,color);gl.uniform1f(floor.u.uMode,mode);
  const [x0,z0,x1,z1,y]=rect;gl.bindBuffer(gl.ARRAY_BUFFER,floorBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([x0,y,z0,x1,y,z0,x1,y,z1,x0,y,z0,x1,y,z1,x0,y,z1]),gl.DYNAMIC_DRAW);const l=floor.a.aPos;gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,3,gl.FLOAT,false,0,0);ext.vertexAttribDivisorANGLE(l,0);gl.drawArrays(gl.TRIANGLES,0,6);}
 // scene: {clear, hole:{x,z,r,hidden}, tray:[x0,z0,x1,z1], floorColor, groups:[{kind,data,count}], shadows:{data,count}, rings:[{x,z,r,a,color,thick}], arc:{x,z,r,progress,color}, heads:[{m:Float32Array(16),rect}]}
 function render(sc){
  gl.clearColor(...(sc.clear||[.1,.12,.18,1]));gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.depthMask(true);
  const hole=sc.hole.hidden?{x:1e5,z:1e5,r:.001}:sc.hole;
  if(sc.tray){const [x0,z0,x1,z1]=sc.tray;if(sc.grass!==false)drawFloor(hole,[x0-60,z0-60,x1+60,z1+60,-.03],[0,0,0],1);drawFloor(hole,[x0,z0,x1,z1,0],sc.floorColor,0);for(const o of sc.islands||[])drawFloor(hole,[o[0]+.4,o[1]+.4,o[2]-.4,o[3]-.4,.4],[0,0,0],1);}
  else if(sc.floorColor)drawFloor(hole,[hole.x-40,hole.z-40,hole.x+40,hole.z+40,0],sc.floorColor,0);
  useMesh(hole);
  if(walls&&sc.tray)drawStatic(walls,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0]));
  if(!sc.hole.hidden){const r=hole.r,a=new Float32Array([r,0,0,hole.x,0,r,0,0,0,0,r,hole.z]);drawStatic(throat,a);drawStatic(rim,a,sc.rimTint||[.84,.85,.88,1]);}
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  if(sc.shadows)drawDecals(hole,sc.shadows.data,sc.shadows.count,0,[0,0,0],{y:.004});
  gl.depthMask(true);gl.disable(gl.BLEND);
  useMesh(hole);for(const g of sc.groups||[])drawInstanced(kindBuf(g.kind),g.data,g.count);
  if(sc.heads?.length&&headTex){gl.useProgram(tex.p);gl.uniformMatrix4fv(tex.u.uVP,false,vp);gl.uniform4f(tex.u.uHole,hole.x,hole.z,hole.r,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,headTex);gl.uniform1i(tex.u.uTex,0);
   attr(tex.a.aPos,texQuad,3);attr(tex.a.aUV,texUV,2);for(const h of sc.heads){gl.uniformMatrix4fv(tex.u.uM,false,h.m);gl.uniform4fv(tex.u.uRect,h.rect);gl.drawArrays(gl.TRIANGLES,0,6);}}
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.disable(gl.DEPTH_TEST);
  if(sc.arc&&!sc.hole.hidden){const a=sc.arc;drawDecals(hole,new Float32Array([a.x,a.z,a.r,1]),1,2,a.color||[1,.78,.15],{y:.01,arc:[a.start??.62,Math.max(.001,a.progress)],thick:.09});}
  for(const g of sc.rings||[])drawDecals(hole,new Float32Array([g.x,g.z,g.r,g.a]),1,1,g.color||[1,.8,.2],{y:.012,thick:g.thick||.08});
  gl.depthMask(true);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
 }
 return {gl,canvas,render,setCamera,project,kindBuf,affine,
  setWalls(g){walls=g?upload(g):null;},
  setHeadTexture(src){if(!headTex)headTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,headTex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);},
  lost:()=>gl.isContextLost(),
  dispose(){const lose=gl.getExtension('WEBGL_lose_context');lose?.loseContext();}};
}
Object.assign(exports,{createRenderer,affine,perspective,lookAt,mul});
