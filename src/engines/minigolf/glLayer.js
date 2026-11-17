// Sitabout Mini Golf: a WebGL2 layer drawn UNDER the 2D game canvas.
// Everything the game paints once per hole (the ground squares, the low copy, the lawn square, the standing sprites) is
// handed to the graphics chip ONE time as a texture; a frame then only draws those textures. Drawing big 2D canvases into
// the screen canvas every frame made the owner's phone (Galaxy Fold, Chrome) spend 14-23 ms on the ground alone and 16 ms
// on 139 sprites: the browser kept sending the big pictures to the graphics chip again. Painting stays 2D canvas code
// (same look); only the per-frame copying moved here. The 2D canvas on top keeps everything that moves.
// API (all sizes in canvas pixels): begin(W,H) / end(); tex(w,h[,repeat]) -> handle; put(h,src,x,y); from(src[,repeat]);
// quad(h,sx,sy,sw,sh,dx,dy,dw,dh); pattern(h,ox,oy,kx,ky); dyn(slot,src); free(h); bg(W,H) -> 2D context of a canvas
// under the GL layer (sky/space backdrops) or null to hide it; tick() once per frame; destroy(); lost (context gone).

const VS='#version 300 es\nin vec2 p;in vec2 t;uniform vec2 u_s;out vec2 v;void main(){v=t;gl_Position=vec4(p.x/u_s.x*2.-1.,1.-p.y/u_s.y*2.,0.,1.);}';
const FS='#version 300 es\nprecision highp float;in vec2 v;uniform sampler2D u_t;out vec4 o;void main(){o=texture(u_t,v);}';
// the lawn: one small square repeated, sampled at each pixel's centre through the pattern's offset and scale
const VS2='#version 300 es\nin vec2 p;in vec2 t;uniform vec2 u_s;out vec2 q;void main(){q=p;gl_Position=vec4(p.x/u_s.x*2.-1.,1.-p.y/u_s.y*2.,0.,1.);}';
const FS2='#version 300 es\nprecision highp float;in vec2 q;uniform vec2 u_o;uniform vec2 u_k;uniform sampler2D u_t;out vec4 o;void main(){o=texture(u_t,(q-u_o)/u_k);}';
const MAXQ=512;

function createGL(main){
 const frame=main&&main.parentElement;if(!frame||typeof document==='undefined')return null;
 let cv=null,gl=null;
 try{cv=document.createElement('canvas');gl=cv.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});}catch{gl=null;}
 if(!gl)return null;
 const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'shader');return s;};
 const prog=(vs,fs)=>{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.bindAttribLocation(p,0,'p');gl.bindAttribLocation(p,1,'t');gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'link');return p;};
 let P1,P2;try{P1=prog(VS,FS);P2=prog(VS2,FS2);}catch{return null;}
 const U1={s:gl.getUniformLocation(P1,'u_s'),t:gl.getUniformLocation(P1,'u_t')},U2={s:gl.getUniformLocation(P2,'u_s'),t:gl.getUniformLocation(P2,'u_t'),o:gl.getUniformLocation(P2,'u_o'),k:gl.getUniformLocation(P2,'u_k')};
 const vbo=gl.createBuffer(),vao=gl.createVertexArray(),buf=new Float32Array(MAXQ*24);
 gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,buf.byteLength,gl.DYNAMIC_DRAW);
 gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,16,8);
 gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);
 // 2D canvases hold premultiplied pixels: uploading them premultiplied is the browser's fast path, and ONE/1-a blends them
 gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
 const maxTex=gl.getParameter(gl.MAX_TEXTURE_SIZE)||4096;
 // ---- placement: exactly under the 2D canvas (same box, same backing size), never taking touches
 const keep={mp:main.style.position,mz:main.style.zIndex,fp:frame.style.position};
 if(getComputedStyle(frame).position==='static')frame.style.position='relative';
 main.style.position='relative';main.style.zIndex='1';
 let bgc=null,bgx=null;const radius=getComputedStyle(main).borderRadius||'';
 const place=c=>{if(!c)return;const s=c.style;s.position='absolute';s.pointerEvents='none';s.zIndex='0';s.left=(main.offsetLeft+main.clientLeft)+'px';s.top=(main.offsetTop+main.clientTop)+'px';
  s.width=main.clientWidth+'px';s.height=main.clientHeight+'px';if(radius)s.borderRadius=radius;};
 frame.insertBefore(cv,main);place(cv);cv.style.display='none';
 const placeAll=()=>{place(cv);place(bgc);};
 let ro=null;try{ro=new ResizeObserver(placeAll);ro.observe(main);}catch{ro=null;}
 if(typeof window!=='undefined')window.addEventListener('resize',placeAll);
 const api={cv,gl,maxTex,lost:false,bytes:0,texN:0,drawn:false,bgUsed:false,quads:0,uploads:0,upBytes:0};
 cv.addEventListener('webglcontextlost',()=>{api.lost=true;});
 let n=0,cur=null,W=1,H=1,mode=1;
 const flush=()=>{if(!n||!cur)return;gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferSubData(gl.ARRAY_BUFFER,0,buf,0,n*24);
  if(mode!==1){gl.useProgram(P1);gl.uniform2f(U1.s,W,H);gl.uniform1i(U1.t,0);mode=1;}
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,cur.t);gl.drawArrays(gl.TRIANGLES,0,n*6);n=0;};
 const show=(c,on)=>{const want=on?'':'none';if(c.style.display!==want){c.style.display=want;if(on)place(c);}};
 api.tick=()=>{if(!api.drawn)show(cv,false);if(bgc&&!api.bgUsed)show(bgc,false);api.drawn=false;api.bgUsed=false;};
 api.begin=(w,h)=>{if(api.lost)return false;W=w;H=h;if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}show(cv,true);api.drawn=true;
  gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(P1);gl.uniform2f(U1.s,w,h);gl.uniform1i(U1.t,0);mode=1;gl.bindVertexArray(vao);n=0;cur=null;api.quads=0;return true;};
 api.end=()=>{flush();cur=null;};
 const mk=(w,h,rep)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA8,w,h);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const wr=rep?gl.REPEAT:gl.CLAMP_TO_EDGE;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,wr);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,wr);
  api.bytes+=w*h*4;api.texN++;return {t,w,h,gl:api};};
 api.tex=(w,h,rep)=>{if(api.lost)return null;w=Math.max(1,Math.min(maxTex,Math.round(w)));h=Math.max(1,Math.min(maxTex,Math.round(h)));if(cur)flush();return mk(w,h,rep);};
 api.put=(hd,src,x,y)=>{if(!hd||api.lost||hd.dead)return;if(cur===hd)flush();gl.bindTexture(gl.TEXTURE_2D,hd.t);
  const w=Math.min(src.width,hd.w-x),h=Math.min(src.height,hd.h-y);if(w<=0||h<=0)return;
  if(w===src.width&&h===src.height)gl.texSubImage2D(gl.TEXTURE_2D,0,x,y,gl.RGBA,gl.UNSIGNED_BYTE,src);
  else gl.texSubImage2D(gl.TEXTURE_2D,0,x,y,w,h,gl.RGBA,gl.UNSIGNED_BYTE,src);
  api.uploads++;api.upBytes+=w*h*4;};
 // part of a canvas (sx,sy,w,h) into a texture at (dx,dy): only what changed goes to the graphics chip
 api.putRect=(hd,src,sx,sy,w,h,dx,dy)=>{if(!hd||api.lost||hd.dead||w<=0||h<=0)return;if(cur===hd)flush();gl.bindTexture(gl.TEXTURE_2D,hd.t);
  gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,sx);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,sy);gl.texSubImage2D(gl.TEXTURE_2D,0,dx,dy,w,h,gl.RGBA,gl.UNSIGNED_BYTE,src);
  gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,0);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,0);api.uploads++;api.upBytes+=w*h*4;};
 api.from=(src,rep)=>{const hd=api.tex(src.width,src.height,rep);if(hd)api.put(hd,src,0,0);return hd;};
 api.free=hd=>{if(!hd||hd.dead)return;hd.dead=true;if(cur===hd){n=0;cur=null;}if(!api.lost&&hd.gl===api){gl.deleteTexture(hd.t);api.bytes-=hd.w*hd.h*4;api.texN--;}};
 // a texture refilled every frame (the moving ground bits): same size = refill in place, else made again
 api.dyn=(slot,src)=>{if(api.lost)return null;if(cur===slot.h)flush();
  if(!slot.h||slot.h.dead||slot.h.gl!==api||slot.h.w!==src.width||slot.h.h!==src.height){if(slot.h)api.free(slot.h);slot.h=mk(src.width,src.height,false);}
  api.put(slot.h,src,0,0);return slot.h;};
 // same, but only the rectangle (x,y,w,h) of the canvas is refilled (the texture keeps the canvas's size)
 api.dynRect=(slot,src,x,y,w,h)=>{if(api.lost)return null;if(cur===slot.h)flush();
  if(!slot.h||slot.h.dead||slot.h.gl!==api||slot.h.w!==src.width||slot.h.h!==src.height){if(slot.h)api.free(slot.h);slot.h=mk(src.width,src.height,false);}
  api.putRect(slot.h,src,x,y,w,h,x,y);return slot.h;};
 api.quad=(hd,sx,sy,sw,sh,dx,dy,dw,dh)=>{if(!hd||hd.dead||api.lost)return;if(hd!==cur||n>=MAXQ){flush();cur=hd;}
  const u0=sx/hd.w,v0=sy/hd.h,u1=(sx+sw)/hd.w,v1=(sy+sh)/hd.h,x1=dx+dw,y1=dy+dh,o=n*24;
  buf[o]=dx;buf[o+1]=dy;buf[o+2]=u0;buf[o+3]=v0;buf[o+4]=x1;buf[o+5]=dy;buf[o+6]=u1;buf[o+7]=v0;buf[o+8]=dx;buf[o+9]=y1;buf[o+10]=u0;buf[o+11]=v1;
  buf[o+12]=dx;buf[o+13]=y1;buf[o+14]=u0;buf[o+15]=v1;buf[o+16]=x1;buf[o+17]=dy;buf[o+18]=u1;buf[o+19]=v0;buf[o+20]=x1;buf[o+21]=y1;buf[o+22]=u1;buf[o+23]=v1;n++;api.quads++;};
 api.pattern=(hd,ox,oy,kx,ky)=>{if(!hd||hd.dead||api.lost)return;flush();cur=null;
  gl.useProgram(P2);mode=2;gl.uniform2f(U2.s,W,H);gl.uniform1i(U2.t,0);gl.uniform2f(U2.o,ox,oy);gl.uniform2f(U2.k,kx,ky);
  const q=[0,0,W,0,0,H,0,H,W,0,W,H];for(let i=0;i<6;i++){buf[i*4]=q[i*2];buf[i*4+1]=q[i*2+1];buf[i*4+2]=0;buf[i*4+3]=0;}
  gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferSubData(gl.ARRAY_BUFFER,0,buf,0,24);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,hd.t);gl.drawArrays(gl.TRIANGLES,0,6);
  gl.useProgram(P1);gl.uniform2f(U1.s,W,H);gl.uniform1i(U1.t,0);mode=1;api.quads++;};
 // a plain 2D canvas under the GL layer for backdrops that change every frame (sky clouds, space stars)
 api.bg=(w,h)=>{if(!w){return null;}if(!bgc){bgc=document.createElement('canvas');frame.insertBefore(bgc,cv);place(bgc);bgx=bgc.getContext('2d');}
  if(bgc.width!==w||bgc.height!==h){bgc.width=w;bgc.height=h;}show(bgc,true);api.bgUsed=true;bgx.setTransform(1,0,0,1,0,0);return bgx;};
 api.destroy=()=>{try{ro&&ro.disconnect();}catch{}if(typeof window!=='undefined')window.removeEventListener('resize',placeAll);
  cv.remove();if(bgc)bgc.remove();main.style.position=keep.mp;main.style.zIndex=keep.mz;frame.style.position=keep.fp;
  api.lost=true;try{const e=gl.getExtension('WEBGL_lose_context');e&&e.loseContext();}catch{}};
 api.info=()=>{let r='';try{const e=gl.getExtension('WEBGL_debug_renderer_info');r=e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}catch{}return {renderer:String(r||''),maxTex};};
 return api;}

Object.assign(exports,{createGL});
