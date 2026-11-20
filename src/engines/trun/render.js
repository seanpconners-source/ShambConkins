// Temple Run (Boulder Run revamp): WebGL2 renderer. Skinned characters (3x4 joint matrices in a uniform array) and
// static/dynamic meshes (pos, normal, uv, colour) share one lighting model: sky/ground hemisphere + sun + rim, sRGB
// textures lit in linear space, distance fog. Props glued to a bone (hat, face, satchel...) are skinned meshes whose
// vertices all follow one joint, defined in the character's bind pose.
// API: createRenderer(canvas) -> R | null
//   R.texture(src,{repeat,mips}) ; R.mesh(arrays,{dynamic}) ; R.update(mesh,arrays) ; R.character(skm, texLookup)
//   R.begin({w,h,view,proj,eye,sun,sky,ground,fog,fogNear,fogFar,clear}) ; R.draw(mesh,model,{tex,tint,alpha,unlit})
//   R.drawChar(char,rig,model,{tint}) ; R.drawSkinned(geo,rig,model,{tex}) ; R.lost ; R.destroy()
const {mul}=require("src/engines/trun/skel.js");

const HEAD=`#version 300 es
precision highp float;`;
const LIGHT=`
uniform vec3 uSun,uSunCol,uSky,uGround,uFogCol,uEye;uniform vec2 uFog;uniform float uHFog;uniform float uUnlit,uAlpha;uniform vec4 uTint;
vec3 toLin(vec3 c){return c*c;}
vec4 shade(vec3 base,vec3 n,vec3 wp){
 vec3 N=normalize(n),V=normalize(uEye-wp);
 vec3 lin=toLin(base)*uTint.rgb;
 float hemi=N.y*.5+.5;vec3 amb=mix(uGround,uSky,hemi);
 float d=max(dot(N,uSun),0.);float wrap=max((dot(N,uSun)+.35)/1.35,0.);
 vec3 col=lin*(amb+uSunCol*(d*.85+wrap*.15));
 float rim=pow(1.-max(dot(N,V),0.),3.);col+=lin*uSky*rim*.6;
 col=mix(col,lin,uUnlit);
 float dist=length(uEye-wp);float f=clamp((dist-uFog.x)/(uFog.y-uFog.x),0.,1.);
 float hf=clamp((-wp.y-1.2)*uHFog,0.,1.);f=max(f*f*(3.-2.*f),hf*hf*(3.-2.*hf));
 col=mix(col,toLin(uFogCol),f);
 return vec4(sqrt(max(col,0.)),uAlpha*uTint.a);}`;

const VS_SKIN=HEAD+`
in vec3 aP;in vec4 aN;in vec2 aU;in vec4 aJ;in vec4 aW;
uniform vec4 uB[195];uniform mat4 uM,uVP;
out vec3 vW,vN;out vec2 vU;
mat4 bone(int i){int k=i*3;vec4 a=uB[k],b=uB[k+1],c=uB[k+2];return mat4(a.x,b.x,c.x,0.,a.y,b.y,c.y,0.,a.z,b.z,c.z,0.,a.w,b.w,c.w,1.);}
void main(){
 mat4 S=bone(int(aJ.x))*aW.x+bone(int(aJ.y))*aW.y+bone(int(aJ.z))*aW.z+bone(int(aJ.w))*aW.w;
 vec4 w=uM*(S*vec4(aP,1.));vW=w.xyz;vN=mat3(uM)*mat3(S)*aN.xyz;vU=aU;gl_Position=uVP*w;}`;
const FS_TEX=HEAD+LIGHT+`
in vec3 vW,vN;in vec2 vU;uniform sampler2D uT;uniform float uCut;out vec4 o;
void main(){vec4 t=texture(uT,vU);if(t.a<uCut)discard;o=shade(t.rgb,gl_FrontFacing?vN:-vN,vW);}`;
const VS_MESH=HEAD+`
in vec3 aP;in vec3 aN;in vec2 aU;in vec4 aC;uniform mat4 uM,uVP;out vec3 vW,vN;out vec2 vU;out vec4 vC;
void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=mat3(uM)*aN;vU=aU;vC=aC;gl_Position=uVP*w;}`;
const FS_MESH=HEAD+LIGHT+`
in vec3 vW,vN;in vec2 vU;in vec4 vC;uniform sampler2D uT;uniform float uCut;out vec4 o;
void main(){vec4 t=texture(uT,vU)*vC;if(t.a<uCut)discard;vec4 c=shade(t.rgb,gl_FrontFacing?vN:-vN,vW);c.a*=t.a;o=c;}`;
// sky dome: gradient + sun glow, drawn first without depth
const VS_SKY=HEAD+`in vec2 aP;out vec2 vP;void main(){vP=aP;gl_Position=vec4(aP,.9999,1.);}`;
const FS_SKY=HEAD+`in vec2 vP;uniform mat4 uInvVP;uniform vec3 uTop,uHor,uBot,uSun,uSunCol;out vec4 o;
void main(){vec4 a=uInvVP*vec4(vP,-1.,1.),b=uInvVP*vec4(vP,1.,1.);vec3 d=normalize(b.xyz/b.w-a.xyz/a.w);
 float y=d.y;vec3 c=y>0.?mix(uHor,uTop,pow(clamp(y,0.,1.),.6)):mix(uHor,uBot,clamp(-y*3.,0.,1.));
 float s=max(dot(d,uSun),0.);c+=uSunCol*(pow(s,200.)*1.2+pow(s,12.)*.18);o=vec4(c,1.);}`;

function createRenderer(canvas){
 let gl=null;
 try{gl=canvas.getContext('webgl2',{antialias:true,alpha:false,depth:true,powerPreference:'high-performance',preserveDrawingBuffer:false});}catch{gl=null;}
 if(!gl)return null;
 const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)&&!gl.isContextLost())throw new Error('trun shader: '+gl.getShaderInfoLog(s));return s;};
 const prog=(vs,fs,attrs)=>{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));attrs.forEach((a,i)=>gl.bindAttribLocation(p,i,a));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)&&!gl.isContextLost())throw new Error('trun link: '+gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const nm=gl.getActiveUniform(p,i).name.replace(/\[0\]$/,'');u[nm]=gl.getUniformLocation(p,nm);}return {p,u};};
 const P={skin:prog(VS_SKIN,FS_TEX,['aP','aN','aU','aJ','aW']),mesh:prog(VS_MESH,FS_MESH,['aP','aN','aU','aC']),sky:prog(VS_SKY,FS_SKY,['aP'])};
 const white=tex1([255,255,255,255]);
 function tex1(c){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(c));return t;}
 const aniso=gl.getExtension('EXT_texture_filter_anisotropic');
 const skyBuf=gl.createBuffer(),skyVao=gl.createVertexArray();gl.bindVertexArray(skyVao);gl.bindBuffer(gl.ARRAY_BUFFER,skyBuf);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
 let F=null,VP=new Float32Array(16),lost=false;
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;R.lost=true;});
 const R={gl,lost:false,
  texture(src,{repeat=false,mips=true,flipY=false}={}){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flipY);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
   const w=repeat?gl.REPEAT:gl.CLAMP_TO_EDGE;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,w);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,w);
   if(mips){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);if(aniso)gl.texParameterf(gl.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));}
   else gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t;},
  retexture(t,src){gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);gl.generateMipmap(gl.TEXTURE_2D);},
  freeTexture(t){if(t&&t!==white)gl.deleteTexture(t);},
  // arrays: {pos:Float32Array(n*3), nrm(n*3), uv(n*2)?, col:Uint8Array(n*4)?, idx:Uint16Array|Uint32Array?}
  mesh(a,{dynamic=false}={}){const m={vao:gl.createVertexArray(),bufs:[],n:0,dynamic};R.update(m,a);return m;},
  update(m,a){const usage=m.dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW,n=a.pos.length/3;gl.bindVertexArray(m.vao);
   const put=(i,data,size,type,norm)=>{let b=m.bufs[i];if(!b){b=m.bufs[i]=gl.createBuffer();}gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,usage);gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,type,norm,0,0);};
   put(0,a.pos,3,gl.FLOAT,false);put(1,a.nrm,3,gl.FLOAT,false);
   if(a.uv)put(2,a.uv,2,gl.FLOAT,false);else{gl.disableVertexAttribArray(2);gl.vertexAttrib2f(2,0,0);}
   if(a.col)put(3,a.col,4,gl.UNSIGNED_BYTE,true);else{gl.disableVertexAttribArray(3);gl.vertexAttrib4f(3,1,1,1,1);}
   if(a.idx){let b=m.bufs[9];if(!b)b=m.bufs[9]=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,a.idx,usage);m.n=a.idx.length;m.it=a.idx instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT;}else{m.n=n;m.it=0;}
   gl.bindVertexArray(null);m.col=!!a.col;},
  freeMesh(m){for(const b of m.bufs)if(b)gl.deleteBuffer(b);gl.deleteVertexArray(m.vao);},
  // skm = parsed character; texLookup(name) -> image/canvas or null (white until it arrives)
  character(skm,texLookup){const c={skm,groups:[],vao:gl.createVertexArray()};gl.bindVertexArray(c.vao);
   const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(skm.blob,skm.vb,skm.verts*28),gl.STATIC_DRAW);
   gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);
   gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.BYTE,true,28,12);
   gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,2,gl.UNSIGNED_SHORT,true,28,16);
   gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,4,gl.UNSIGNED_BYTE,false,28,20);
   gl.enableVertexAttribArray(4);gl.vertexAttribPointer(4,4,gl.UNSIGNED_BYTE,true,28,24);
   const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(skm.blob,skm.ib,skm.indices),gl.STATIC_DRAW);
   gl.bindVertexArray(null);c.bufs=[vb,ib];
   for(const g of skm.groups){const src=texLookup&&texLookup(g.tex);c.groups.push({...g,t:src?R.texture(src):white,hide:false});}
   c.setTexture=(mat,src)=>{for(const g of c.groups)if(g.mat===mat){if(g.t!==white)gl.deleteTexture(g.t);g.t=src?R.texture(src):white;}};
   c.hide=(mat,on=true)=>{for(const g of c.groups)if(g.mat===mat)g.hide=on;};
   return c;},
  // a prop glued to bones: arrays {pos,nrm,uv,joint:Uint8Array(n) (joint index of the rig), idx}, all in bind space
  skinnedProp(a){const n=a.pos.length/3,buf=new ArrayBuffer(n*28),f=new Float32Array(buf),b=new Int8Array(buf),u=new Uint16Array(buf),c=new Uint8Array(buf);
   for(let i=0;i<n;i++){const o=i*7;f[o]=a.pos[i*3];f[o+1]=a.pos[i*3+1];f[o+2]=a.pos[i*3+2];
    b[o*4+12]=Math.round(a.nrm[i*3]*127);b[o*4+13]=Math.round(a.nrm[i*3+1]*127);b[o*4+14]=Math.round(a.nrm[i*3+2]*127);
    u[o*2+8]=Math.round((a.uv?a.uv[i*2]:0)*65535);u[o*2+9]=Math.round((a.uv?a.uv[i*2+1]:0)*65535);
    c[o*4+20]=a.joint[i];c[o*4+24]=255;}
   const skm={blob:buf,vb:0,verts:n,groups:[],indices:a.idx.length};
   const p={vao:gl.createVertexArray(),n:a.idx.length};gl.bindVertexArray(p.vao);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,buf,gl.STATIC_DRAW);
   gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.BYTE,true,28,12);
   gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,2,gl.UNSIGNED_SHORT,true,28,16);gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,4,gl.UNSIGNED_BYTE,false,28,20);
   gl.enableVertexAttribArray(4);gl.vertexAttribPointer(4,4,gl.UNSIGNED_BYTE,true,28,24);
   const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,a.idx instanceof Uint32Array?a.idx:new Uint32Array(a.idx),gl.STATIC_DRAW);
   gl.bindVertexArray(null);p.bufs=[vb,ib];p.t=a.tex||white;void skm;return p;},
  begin(f){if(lost)return false;F=f;const w=f.w,h=f.h;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   gl.viewport(0,0,w,h);mul(f.proj,f.view,VP);
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.disable(gl.BLEND);
   gl.clearColor(...(f.clear||[0,0,0]),1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   if(f.skyTop){const s=P.sky;gl.useProgram(s.p);gl.depthMask(false);gl.uniformMatrix4fv(s.u.uInvVP,false,invert(VP));
    gl.uniform3fv(s.u.uTop,f.skyTop);gl.uniform3fv(s.u.uHor,f.skyHor);gl.uniform3fv(s.u.uBot,f.skyBot||f.skyHor);gl.uniform3fv(s.u.uSun,f.sun);gl.uniform3fv(s.u.uSunCol,f.sunGlow||[1,.9,.7]);
    gl.bindVertexArray(skyVao);gl.drawArrays(gl.TRIANGLES,0,3);gl.bindVertexArray(null);gl.depthMask(true);}
   return true;},
  _common(p,o){const u=p.u;gl.uniformMatrix4fv(u.uVP,false,VP);gl.uniform3fv(u.uSun,F.sun);gl.uniform3fv(u.uSunCol,F.sunCol||[1,.95,.85]);gl.uniform3fv(u.uSky,F.sky||[.5,.6,.7]);gl.uniform3fv(u.uGround,F.ground||[.25,.22,.18]);
   gl.uniform3fv(u.uFogCol,F.fog||[.6,.65,.7]);gl.uniform2f(u.uFog,F.fogNear??30,F.fogFar??90);gl.uniform1f(u.uHFog,F.hfog??0);gl.uniform3fv(u.uEye,F.eye);gl.uniform1f(u.uUnlit,o.unlit||0);
   gl.uniform1f(u.uAlpha,o.alpha??1);gl.uniform4fv(u.uTint,o.tint||[1,1,1,1]);gl.uniform1f(u.uCut,o.cut??.02);
   if(o.alpha!=null&&o.alpha<1||o.blend){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(!o.noDepthWrite);}else{gl.disable(gl.BLEND);gl.depthMask(true);}
   if(o.cull){gl.enable(gl.CULL_FACE);}else gl.disable(gl.CULL_FACE);},
  draw(m,model,o={}){const p=P.mesh;gl.useProgram(p.p);R._common(p,o);gl.uniformMatrix4fv(p.u.uM,false,model);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,o.tex||white);gl.uniform1i(p.u.uT,0);
   gl.bindVertexArray(m.vao);if(m.it)gl.drawElements(gl.TRIANGLES,m.n,m.it,0);else gl.drawArrays(gl.TRIANGLES,0,m.n);gl.bindVertexArray(null);},
  drawChar(c,rig,model,o={}){const p=P.skin;gl.useProgram(p.p);R._common(p,o);gl.uniformMatrix4fv(p.u.uM,false,model);gl.uniform4fv(p.u.uB,rig.skin);
   gl.activeTexture(gl.TEXTURE0);gl.uniform1i(p.u.uT,0);gl.bindVertexArray(c.vao);
   for(const g of c.groups){if(g.hide)continue;gl.bindTexture(gl.TEXTURE_2D,g.t);gl.drawElements(gl.TRIANGLES,g.count,gl.UNSIGNED_INT,g.first*4);}
   gl.bindVertexArray(null);},
  drawProp(pr,rig,model,o={}){const p=P.skin;gl.useProgram(p.p);R._common(p,o);gl.uniformMatrix4fv(p.u.uM,false,model);gl.uniform4fv(p.u.uB,rig.skin);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,o.tex||pr.t);gl.uniform1i(p.u.uT,0);
   gl.bindVertexArray(pr.vao);gl.drawElements(gl.TRIANGLES,pr.n,gl.UNSIGNED_INT,0);gl.bindVertexArray(null);},
  white,
  destroy(){try{gl.getExtension('WEBGL_lose_context')?.loseContext();}catch{}}};
 return R;}

function invert(m){const o=new Float32Array(16),a=m;
 const a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
 const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
 let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(!det)return o;det=1/det;
 o[0]=(a11*b11-a12*b10+a13*b09)*det;o[1]=(a02*b10-a01*b11-a03*b09)*det;o[2]=(a31*b05-a32*b04+a33*b03)*det;o[3]=(a22*b04-a21*b05-a23*b03)*det;
 o[4]=(a12*b08-a10*b11-a13*b07)*det;o[5]=(a00*b11-a02*b08+a03*b07)*det;o[6]=(a32*b02-a30*b05-a33*b01)*det;o[7]=(a20*b05-a22*b02+a23*b01)*det;
 o[8]=(a10*b10-a11*b08+a13*b06)*det;o[9]=(a01*b08-a00*b10-a03*b06)*det;o[10]=(a30*b04-a31*b02+a33*b00)*det;o[11]=(a21*b02-a20*b04-a23*b00)*det;
 o[12]=(a11*b07-a10*b09-a12*b06)*det;o[13]=(a00*b09-a01*b07+a02*b06)*det;o[14]=(a31*b01-a30*b03-a32*b00)*det;o[15]=(a20*b03-a21*b01+a22*b00)*det;return o;}

// camera helpers (column-major)
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far),o=new Float32Array(16);o[0]=f/aspect;o[5]=f;o[10]=(far+near)*nf;o[11]=-1;o[14]=2*far*near*nf;return o;}
function lookAt(e,t,up=[0,1,0]){let zx=e[0]-t[0],zy=e[1]-t[1],zz=e[2]-t[2],l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;
 let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;
 const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx,o=new Float32Array(16);
 o[0]=xx;o[1]=yx;o[2]=zx;o[4]=xy;o[5]=yy;o[6]=zy;o[8]=xz;o[9]=yz;o[10]=zz;
 o[12]=-(xx*e[0]+xy*e[1]+xz*e[2]);o[13]=-(yx*e[0]+yy*e[1]+yz*e[2]);o[14]=-(zx*e[0]+zy*e[1]+zz*e[2]);o[15]=1;return o;}
// model matrix: translate (x,y,z), yaw about Y, optional uniform scale
function placeY(x,y,z,yaw=0,s=1){const c=Math.cos(yaw)*s,n=Math.sin(yaw)*s,o=new Float32Array(16);o[0]=c;o[2]=-n;o[5]=s;o[8]=n;o[10]=c;o[12]=x;o[13]=y;o[14]=z;o[15]=1;return o;}

Object.assign(exports,{createRenderer,perspective,lookAt,placeY,invert});
