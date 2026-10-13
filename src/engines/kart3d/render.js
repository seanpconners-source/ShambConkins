// WebGL renderer for the 3D kart game: a procedural space sky baked into a cube map, the rainbow ribbon track
// (procedural shader: flowing rainbow lanes, glowing edges, ramps, dash panels, neon rails), low-poly karts with the
// player's head as a billboard, item boxes, coins, shells, bananas, scenery rings/stars and additive particles.
const {M4,program,Geo,hex,shade}=require("src/engines/kart3d/gl.js");
const T=require("src/engines/kart3d/track.js");

const PREC=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;
const NOISE=`float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1.,0.,0.)),f.x),mix(hash(i+vec3(0.,1.,0.)),hash(i+vec3(1.,1.,0.)),f.x),f.y),
  mix(mix(hash(i+vec3(0.,0.,1.)),hash(i+vec3(1.,0.,1.)),f.x),mix(hash(i+vec3(0.,1.,1.)),hash(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return v;}
vec3 hsv(float h,float s,float v){vec3 k=clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);return v*mix(vec3(1.),k,s);}`;
const FULL_VS=`attribute vec2 aP;void main(){gl_Position=vec4(aP,0.,1.);}`;
const SKYGEN_FS=PREC+NOISE+`
uniform float uFace,uSize;
float stars(vec3 d,float sc,float th){vec3 c=floor(d*sc);float h=hash(c);if(h<th)return 0.;
 vec3 o=vec3(hash(c+11.),hash(c+23.),hash(c+37.));vec3 sp=(c+.2+.6*o);float dd=length(d*sc-sp);return smoothstep(.55,0.,dd)*(.4+.6*fract(h*91.));}
vec3 sky(vec3 d){
 vec3 col=mix(vec3(.015,.01,.05),vec3(.07,.03,.17),smoothstep(-1.,1.,d.y));
 vec3 gN=normalize(vec3(.35,.85,.4));float band=exp(-pow(dot(d,gN),2.)*14.);
 col+=band*mix(vec3(.18,.1,.35),vec3(.35,.2,.45),fbm(d*5.))*(.4+fbm(d*3.+2.));
 float neb=smoothstep(.48,.9,fbm(d*1.8+vec3(4.,1.,7.)));
 col+=neb*mix(vec3(.75,.12,.55),vec3(.12,.35,.95),fbm(d*3.5+3.))*.55;
 float neb2=smoothstep(.55,.95,fbm(d*2.6+vec3(9.,3.,1.)));col+=neb2*vec3(.1,.6,.7)*.3;
 col+=vec3(stars(d,170.,.975))*1.3+vec3(stars(d,380.,.986))*.8+vec3(.9,.8,1.)*stars(d,60.,.993)*1.6;
 // ringed planet
 vec3 pd=normalize(vec3(-.55,.32,-.75)),pu=normalize(cross(pd,vec3(0.,1.,0.))),pv=cross(pu,pd);float ps=.2;
 float x=dot(d,pu)/ps,y=dot(d,pv)/ps,front=dot(d,pd);
 if(front>0.){float ta=.35,rx=x*cos(ta)+y*sin(ta),ry=(-x*sin(ta)+y*cos(ta))/.28,rr=length(vec2(rx,ry));
  float r2=x*x+y*y;bool behindRing=ry>0.;
  float ring=smoothstep(1.35,1.4,rr)*smoothstep(2.15,2.05,rr)*(.55+.45*sin(rr*40.));vec3 ringC=vec3(.95,.8,.6)*ring*.8;
  if(behindRing)col=mix(col,ringC,ring*.85);
  if(r2<1.){float z=sqrt(1.-r2);vec3 n=vec3(x,y,z);float l=max(dot(n,normalize(vec3(.6,.5,.6))),0.);
   float bands=sin(y*9.+fbm(vec3(x,y,1.)*3.)*3.);vec3 pc=mix(vec3(.85,.45,.75),vec3(.45,.3,.85),.5+.5*bands);col=pc*(.12+.95*l)+vec3(.5,.3,.8)*pow(1.-z,3.)*.6;}
  else col+=vec3(.5,.3,.9)*exp(-(sqrt(r2)-1.)*6.)*.35;
  if(!behindRing&&ring>0.)col=mix(col,ringC,ring*.85);}
 // sun glow
 vec3 sd=normalize(vec3(.6,.45,.6));col+=vec3(1.,.8,.95)*pow(max(dot(d,sd),0.),180.)*1.5+vec3(.6,.3,.7)*pow(max(dot(d,sd),0.),12.)*.18;
 return col;}
void main(){float sc=gl_FragCoord.x/uSize*2.-1.,tc=gl_FragCoord.y/uSize*2.-1.;vec3 d;
 if(uFace<.5)d=vec3(1.,-tc,-sc);else if(uFace<1.5)d=vec3(-1.,-tc,sc);else if(uFace<2.5)d=vec3(sc,1.,tc);else if(uFace<3.5)d=vec3(sc,-1.,-tc);else if(uFace<4.5)d=vec3(sc,-tc,1.);else d=vec3(-sc,-tc,-1.);
 gl_FragColor=vec4(sky(normalize(d)),1.);}`;
const SKY_FS=PREC+`uniform samplerCube uSky;uniform vec3 uCR,uCU,uCF;uniform vec2 uTan;uniform vec4 uVP;
void main(){vec2 n=(gl_FragCoord.xy-uVP.xy)/uVP.zw*2.-1.;vec3 d=normalize(uCF+uCR*n.x*uTan.x+uCU*n.y*uTan.y);gl_FragColor=vec4(textureCube(uSky,d).rgb,1.);}`;
const ROAD_VS=`attribute vec3 aPos;attribute vec3 aNrm;attribute vec2 aUV;attribute vec2 aInfo;uniform mat4 uVP;
varying vec3 vW;varying vec3 vN;varying vec2 vUV;varying vec2 vInfo;
void main(){vW=aPos;vN=aNrm;vUV=aUV;vInfo=aInfo;gl_Position=uVP*vec4(aPos,1.);}`;
const ROAD_FS=PREC+NOISE+`uniform vec3 uCam,uFog;uniform float uFogD,uTime,uStart;
varying vec3 vW;varying vec3 vN;varying vec2 vUV;varying vec2 vInfo;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 float s=vUV.x,v=vUV.y,kind=floor(vInfo.x+.5),glue=vInfo.y;vec3 c;float e=abs(v);
 if(kind==0.||kind==3.||kind==4.){
  float lane=v*.5+.5;c=hsv(fract(lane*.8-s*.00016+uTime*.035),.72,1.);
  float tile=fract(s/36.);c*=.74+.26*smoothstep(0.,.07,tile)*smoothstep(1.,.93,tile);
  c+=.1*smoothstep(.46,.5,abs(fract(lane*6.)-.5));
  vec2 cell=floor(vec2(s/9.,lane*16.));float r=h2(cell);c+=step(.95,r)*(.5+.5*sin(uTime*6.+r*60.))*.7;
  float ph=fract(s/520.-uTime*.55);c+=vec3(.55,.5,.7)*exp(-pow((ph-.5)*10.,2.))*.45;
  if(kind==3.){float ch=fract(s/26.-e*.7-uTime*1.4);c=mix(c,ch<.5?vec3(1.,.5,.08):vec3(1.,.92,.35),.8);}
  if(kind==4.){float ch=fract(s/26.-e*.7-uTime*1.4);c=mix(c,ch<.5?vec3(.15,.45,1.):vec3(.6,.95,1.),.8);}
  vec3 ec=glue>.5?vec3(.35,1.,1.):vec3(1.,.97,.78);float dash=step(.5,fract(s/24.-uTime*(glue>.5?2.:0.)));
  c=mix(c,ec*(1.+.3*dash),smoothstep(.86,.9,e));c=mix(c,vec3(.12,.04,.28),smoothstep(.975,1.,e));
  float ds=s-uStart;if(ds>-12.&&ds<12.){float ck=mod(floor(lane*10.)+floor((ds+12.)/6.),2.);c=mix(c,vec3(ck),.92);}
 }else if(kind==1.){c=vec3(.09,.035,.2)+hsv(fract(s*.0004+uTime*.05),.7,.32)*(1.-e*.6);}
 else if(kind==2.){c=glue>.5?vec3(.3,.95,1.):hsv(fract(s*.0006-uTime*.08),.55,1.);}
 else if(kind==5.){float ch=fract(s*3.-uTime*3.5-e*.8);c=mix(vec3(1.,.4,.05),vec3(1.,.95,.4),step(.5,ch))*1.25;}
 else{vec3 rc=glue>.5?vec3(.25,.9,1.):hsv(fract(s*.0007-uTime*.1),.6,1.);
  float g=(1.-v)*.3+smoothstep(.8,.92,v)*smoothstep(1.,.94,v)*1.3+smoothstep(.9,1.,abs(fract(s/18.)-.5)*2.)*.5*(1.-v);c=rc*g;}
 float f=clamp(1.-exp(-length(vW-uCam)*uFogD),0.,1.);
 if(kind<6.)c=mix(c,uFog,f);else c*=1.-f;
 gl_FragColor=vec4(c,1.);}`;
const MESH_VS=`attribute vec3 aPos;attribute vec3 aNrm;attribute vec3 aCol;uniform mat4 uVP;uniform mat4 uM;
varying vec3 vW;varying vec3 vN;varying vec3 vC;
void main(){vec4 w=uM*vec4(aPos,1.);vW=w.xyz;vN=(uM*vec4(aNrm,0.)).xyz;vC=aCol;gl_Position=uVP*w;}`;
const MESH_FS=PREC+`uniform vec3 uCam,uFog,uLight,uTint,uEmit;uniform float uFogD,uAlpha;
varying vec3 vW;varying vec3 vN;varying vec3 vC;
void main(){vec3 n=normalize(vN),vd=normalize(uCam-vW);float dif=max(dot(n,uLight),0.),head=max(dot(n,vd),0.);
 vec3 c=vC*uTint*(.32+.55*dif+.3*head)+uEmit*vC+vec3(.55,.45,1.)*pow(1.-head,3.)*.35;
 float spec=pow(max(dot(reflect(-uLight,n),vd),0.),24.)*.35;c+=spec;
 float f=clamp(1.-exp(-length(vW-uCam)*uFogD),0.,1.);c=mix(c,uFog,f*uAlpha);
 gl_FragColor=vec4(c*mix(1.,1.-f,1.-uAlpha),uAlpha);}`;
const SPR_VS=`attribute vec3 aPos;attribute vec2 aUV;attribute vec4 aCol;uniform mat4 uVP;varying vec2 vUV;varying vec4 vCol;varying vec3 vW;
void main(){vUV=aUV;vCol=aCol;vW=aPos;gl_Position=uVP*vec4(aPos,1.);}`;
const SPR_FS=PREC+`uniform sampler2D uTex;uniform float uTest;uniform vec3 uCam;uniform float uFogD;varying vec2 vUV;varying vec4 vCol;varying vec3 vW;
void main(){vec4 t=texture2D(uTex,vUV)*vCol;if(uTest>.5&&t.a<.45)discard;float f=clamp(1.-exp(-length(vW-uCam)*uFogD),0.,1.);
 if(uTest>.5)t.rgb=mix(t.rgb,vec3(.06,.03,.14),f);else t*=1.-f;gl_FragColor=t;}`;

// atlas tiles (4x4 of 128px)
const TILE={glow:0,spark:1,smoke:2,banana:3,bomb:4,q:5,star:6,blooper:7,boom:8,shadow:9,lakitu:10,ring:11,wing:12,bolt:13,mush:14,flame:15};
function makeAtlas(){
 const cv=document.createElement('canvas');cv.width=cv.height=512;const g=cv.getContext('2d');
 const cell=(n,fn)=>{g.save();g.translate((n%4)*128+64,Math.floor(n/4)*128+64);fn();g.restore();};
 const radial=(stops)=>{const gr=g.createRadialGradient(0,0,0,0,0,62);for(const [o,c] of stops)gr.addColorStop(o,c);g.fillStyle=gr;g.fillRect(-64,-64,128,128);};
 const emoji=(e,sz=96)=>{g.font=`${sz}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(e,0,6);};
 cell(TILE.glow,()=>radial([[0,'rgba(255,255,255,1)'],[.25,'rgba(255,255,255,.75)'],[1,'rgba(255,255,255,0)']]));
 cell(TILE.spark,()=>{radial([[0,'rgba(255,255,255,1)'],[.12,'rgba(255,255,255,.6)'],[.4,'rgba(255,255,255,0)']]);g.fillStyle='#fff';for(const r of [0,Math.PI/2]){g.save();g.rotate(r);g.beginPath();g.moveTo(-60,0);g.quadraticCurveTo(0,-5,60,0);g.quadraticCurveTo(0,5,-60,0);g.fill();g.restore();}});
 cell(TILE.smoke,()=>{for(let k=0;k<7;k++){const a=k*2.4,r=k?24:0;const gr=g.createRadialGradient(Math.cos(a)*r,Math.sin(a)*r,0,Math.cos(a)*r,Math.sin(a)*r,40);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(-64,-64,128,128);}});
 cell(TILE.banana,()=>emoji('🍌'));cell(TILE.bomb,()=>emoji('💣'));cell(TILE.star,()=>emoji('⭐'));cell(TILE.blooper,()=>emoji('🦑'));cell(TILE.boom,()=>emoji('💥',110));cell(TILE.bolt,()=>emoji('⚡'));cell(TILE.mush,()=>emoji('🍄'));
 cell(TILE.q,()=>{g.font='900 100px "Arial Black",Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=12;g.strokeStyle='#5a1c8a';g.strokeText('?',0,6);g.fillStyle='#fff';g.fillText('?',0,6);});
 cell(TILE.shadow,()=>radial([[0,'rgba(0,0,0,.75)'],[.55,'rgba(0,0,0,.45)'],[1,'rgba(0,0,0,0)']]));
 cell(TILE.lakitu,()=>{g.fillStyle='#fff';for(const [x,y,r] of [[-30,22,26],[0,28,30],[30,22,26],[0,10,28]]){g.beginPath();g.arc(x,y,r,0,7);g.fill();}g.font='72px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('🐢',0,-22);});
 cell(TILE.ring,()=>{g.strokeStyle='#fff';g.lineWidth=10;g.beginPath();g.arc(0,0,52,0,7);g.stroke();});
 cell(TILE.wing,()=>{g.fillStyle='#fff';g.strokeStyle='#9ab';g.lineWidth=4;g.beginPath();g.moveTo(-60,10);g.quadraticCurveTo(-20,-60,60,-30);g.quadraticCurveTo(20,-10,40,0);g.quadraticCurveTo(10,10,20,20);g.quadraticCurveTo(-20,20,-60,10);g.fill();g.stroke();});
 cell(TILE.flame,()=>radial([[0,'rgba(255,255,220,1)'],[.3,'rgba(255,200,80,.9)'],[.7,'rgba(255,80,20,.35)'],[1,'rgba(255,40,0,0)']]));
 return cv;
}
const uvOf=t=>{if(t<0)return [0,0,1,1];const x=(t%4)*.25,y=Math.floor(t/4)*.25,e=.004;return [x+e,y+e,x+.25-e,y+.25-e];};

class Batch{
 constructor(gl,max){this.gl=gl;this.max=max;this.a=new Float32Array(max*6*9);this.n=0;this.buf=gl.createBuffer();}
 reset(){this.n=0;}
 // centre P, half axes ax/ay (world vectors already scaled), uv rect, colour
 quad(P,ax,ay,uv,col){if(this.n>=this.max)return;const a=this.a,o=this.n*54;this.n++;
  const c=[[-1,-1,uv[0],uv[3]],[1,-1,uv[2],uv[3]],[1,1,uv[2],uv[1]],[-1,-1,uv[0],uv[3]],[1,1,uv[2],uv[1]],[-1,1,uv[0],uv[1]]];
  for(let k=0;k<6;k++){const [u,v,tu,tv]=c[k],q=o+k*9;a[q]=P[0]+ax[0]*u+ay[0]*v;a[q+1]=P[1]+ax[1]*u+ay[1]*v;a[q+2]=P[2]+ax[2]*u+ay[2]*v;a[q+3]=tu;a[q+4]=tv;a[q+5]=col[0];a[q+6]=col[1];a[q+7]=col[2];a[q+8]=col[3];}}
 bill(P,w,h,tile,col,cam,rot=0){const cs=Math.cos(rot),sn=Math.sin(rot),R=cam.R,U=cam.U;
  const ax=[(R[0]*cs+U[0]*sn)*w,(R[1]*cs+U[1]*sn)*w,(R[2]*cs+U[2]*sn)*w],ay=[(U[0]*cs-R[0]*sn)*h,(U[1]*cs-R[1]*sn)*h,(U[2]*cs-R[2]*sn)*h];this.quad(P,ax,ay,uvOf(tile),col);}
}

function createRenderer(canvas,c,{colors=['#4aa3ff','#ff6fa8'],battle=false}={}){
 const gl=canvas.getContext('webgl',{antialias:true,alpha:false,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'})||canvas.getContext('experimental-webgl');
 if(!gl)throw new Error('no webgl');
 const P={skygen:program(gl,FULL_VS,SKYGEN_FS),sky:program(gl,FULL_VS,SKY_FS),road:program(gl,ROAD_VS,ROAD_FS),mesh:program(gl,MESH_VS,MESH_FS),spr:program(gl,SPR_VS,SPR_FS)};
 const tri=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,tri);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 // ---- sky cube map (baked once)
 const SKY=gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE)>=512?384:256,skyTex=gl.createTexture();
 gl.bindTexture(gl.TEXTURE_CUBE_MAP,skyTex);
 for(let f=0;f<6;f++)gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+f,0,gl.RGBA,SKY,SKY,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 {const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.useProgram(P.skygen.p);gl.bindBuffer(gl.ARRAY_BUFFER,tri);gl.enableVertexAttribArray(P.skygen.a.aP);gl.vertexAttribPointer(P.skygen.a.aP,2,gl.FLOAT,false,0,0);
  gl.viewport(0,0,SKY,SKY);gl.disable(gl.DEPTH_TEST);gl.uniform1f(P.skygen.u.uSize,SKY);
  for(let f=0;f<6;f++){gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_CUBE_MAP_POSITIVE_X+f,skyTex,0);gl.uniform1f(P.skygen.u.uFace,f);gl.drawArrays(gl.TRIANGLES,0,3);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteFramebuffer(fb);gl.disableVertexAttribArray(P.skygen.a.aP);}
 // ---- track meshes
 const road=[],rails=[],pads=[];
 const vtx=(arr,p,n,s,v,kind,glue)=>arr.push(p[0],p[1],p[2],n[0],n[1],n[2],s,v,kind,glue);
 const quadV=(arr,a,b,cc,d,na,nb,nc,nd,ua,ub,uc,ud,kind,glue)=>{vtx(arr,a,na,...ua,kind,glue);vtx(arr,b,nb,...ub,kind,glue);vtx(arr,cc,nc,...uc,kind,glue);vtx(arr,a,na,...ua,kind,glue);vtx(arr,cc,nc,...uc,kind,glue);vtx(arr,d,nd,...ud,kind,glue);};
 const get=(A,i)=>[A[i*3],A[i*3+1],A[i*3+2]],add=(p,v,k)=>[p[0]+v[0]*k,p[1]+v[1]*k,p[2]+v[2]*k],neg=v=>[-v[0],-v[1],-v[2]];
 const TH=7,RAILH=17;
 for(let i=0;i<c.N;i++){const j=(i+1)%c.N;if(c.gap[j])continue;const kind=[0,3,4][c.surf[j]],gl2=c.glue[j];
  const Pi=[c.px[i],c.py[i],c.pz[i]],Pj=[c.px[j],c.py[j],c.pz[j]],Ri=get(c.R,i),Rj=get(c.R,j),Ui=get(c.U,i),Uj=get(c.U,j),hi=c.half[i],hj=c.half[j],s0=i*T.DS,s1=s0+T.DS;
  const Li=add(Pi,Ri,-hi),Rr=add(Pi,Ri,hi),Lj=add(Pj,Rj,-hj),Rq=add(Pj,Rj,hj);
  quadV(road,Li,Lj,Rq,Rr,Ui,Uj,Uj,Ui,[s0,-1],[s1,-1],[s1,1],[s0,1],kind,gl2);
  const Lbi=add(Li,Ui,-TH),Rbi=add(Rr,Ui,-TH),Lbj=add(Lj,Uj,-TH),Rbj=add(Rq,Uj,-TH);
  quadV(road,Lbi,Rbi,Rbj,Lbj,neg(Ui),neg(Ui),neg(Uj),neg(Uj),[s0,-1],[s0,1],[s1,1],[s1,-1],1,gl2);
  quadV(road,Li,Lbi,Lbj,Lj,neg(Ri),neg(Ri),neg(Rj),neg(Rj),[s0,0],[s0,0],[s1,0],[s1,0],2,gl2);
  quadV(road,Rr,Rq,Rbj,Rbi,Ri,Rj,Rj,Ri,[s0,0],[s1,0],[s1,0],[s0,0],2,gl2);
  const rb=c.rail[j];
  if(rb&1)quadV(rails,add(Li,Ui,.5),add(Lj,Uj,.5),add(Lj,Uj,RAILH),add(Li,Ui,RAILH),Ri,Rj,Rj,Ri,[s0,0],[s1,0],[s1,1],[s0,1],6,gl2);
  if(rb&2)quadV(rails,add(Rr,Ui,.5),add(Rq,Uj,.5),add(Rq,Uj,RAILH),add(Rr,Ui,RAILH),neg(Ri),neg(Rj),neg(Rj),neg(Ri),[s0,0],[s1,0],[s1,1],[s0,1],6,gl2);}
 for(const p of c.pads){const n=5;for(let k=0;k<n;k++){const sa=p.s-p.len/2+p.len*k/n,sb=sa+p.len/n,fa=T.frame(c,sa,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]}),fb=T.frame(c,sb,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]});
  const A=T.point(c,sa,p.d-p.w/2,.7),B=T.point(c,sb,p.d-p.w/2,.7),C2=T.point(c,sb,p.d+p.w/2,.7),D=T.point(c,sa,p.d+p.w/2,.7);
  quadV(pads,A,B,C2,D,fa.U,fb.U,fb.U,fa.U,[k/n,-1],[(k+1)/n,-1],[(k+1)/n,1],[k/n,1],5,0);}}
 const upload=a=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.STATIC_DRAW);return {buf:b,n:a.length/10};};
 const roadM=upload(road),railM=upload(rails),padM=upload(pads);
 // ---- meshes
 const black=[.1,.1,.12],gray=[.5,.52,.58],chrome=[.88,.9,.95],white=[.96,.96,.98];
 const kartGeo=col=>{const g=new Geo(),C=hex(col),D=shade(C,.62);
  g.box(0,4.2,0,20,3.4,12.5,C);g.box(9.5,4.7,0,7,3,9.5,C,{tx:.55,tz:.75});g.box(13.4,3,0,1.8,2.6,15.5,gray);
  g.box(-1,6.6,0,10,2.2,11,shade(C,.85));g.box(0,5,6.6,12,3.8,1.8,D);g.box(0,5,-6.6,12,3.8,1.8,D);
  g.box(-4.6,8.8,0,3.6,6.4,8,black);g.box(-9.6,6.9,0,5,4.6,8.5,gray);g.cylX(-12.8,6.6,2.6,1.15,3.2,8,chrome,black);g.cylX(-12.8,6.6,-2.6,1.15,3.2,8,chrome,black);
  g.box(-12,11.8,0,3.2,.9,15.5,C);g.box(-11.2,9.4,4.6,1,4,1,D);g.box(-11.2,9.4,-4.6,1,4,1,D);
  g.box(4.8,9.2,0,.9,3.6,3.8,black);g.box(-1.7,11.2,0,4.8,6.2,7.4,D);g.box(2,10.6,3,6,1.7,1.7,D);g.box(2,10.6,-3,6,1.7,1.7,D);
  g.box(-1.7,14.6,0,3,1.6,3.4,shade(C,.9));return g.upload(gl);};
 const M={kart:colors.map(kartGeo)};
 {const g=new Geo();g.cylZ(0,0,0,1,1,14,black,gray);g.cylZ(0,0,0,.5,1.12,8,chrome,chrome);M.wheel=g.upload(gl);}
 {const g=new Geo();g.cylZ(0,0,0,6,1.8,16,[1,.78,.15],[1,.9,.35]);g.cylZ(0,0,0,3.8,2.1,12,[.95,.68,.1],[1,.82,.3]);M.coin=g.upload(gl);}
 {const g=new Geo(),s2=8.5,b=1.2;for(const y of [-s2,s2])for(const z of [-s2,s2]){g.box(0,y,z,s2*2+b,b,b,white);}for(const x of [-s2,s2])for(const z of [-s2,s2])g.box(x,0,z,b,s2*2,b,white);for(const x of [-s2,s2])for(const y of [-s2,s2])g.box(x,y,0,b,b,s2*2,white);M.boxEdge=g.upload(gl);}
 {const g=new Geo();g.box(0,0,0,17,17,17,[1,1,1]);M.boxFace=g.upload(gl);}
 const shellGeo=col=>{const g=new Geo(),C=hex(col);g.sphere(0,1,0,7,12,C,{top:.5});g.sphere(0,1,0,7.7,12,white,{sy:.3});g.sphere(0,.6,0,6.4,10,[1,.92,.6],{sy:.25});
  if(col==='#2e6bff'){for(let k=0;k<6;k++){const a=k/6*Math.PI*2;g.box(Math.cos(a)*4.6,5.6,Math.sin(a)*4.6,1.6,3,1.6,white,{tx:.2,tz:.2});}}return g.upload(gl);};
 M.shell={green:shellGeo('#2fbf3a'),red:shellGeo('#e8322b'),blue:shellGeo('#2e6bff')};
 {const g=new Geo(),bk=[.13,.13,.16],dk=[.07,.07,.09];g.cylX(-1,0,0,8,22,16,bk,dk);g.sphere(10,0,0,8,16,bk);g.cylX(-13,0,0,6.4,4,14,dk,[.25,.22,.2]);
  for(const [y,z] of [[1,0],[-1,0],[0,1],[0,-1]])g.box(-10,y*10,z*10,7,y?5:1.2,z?5:1.2,dk,{tx:.6,tz:.6});
  for(const z of [-3.8,3.8]){g.box(15.4,2.6,z,1.6,4.6,3.2,white);g.box(16.3,2.6,z*1.08,.6,2.4,1.4,black);g.box(15.4,5.6,z,1.8,1,3.8,dk);}
  g.box(14.6,-3.6,0,2.2,1.8,9,[.9,.12,.1]);g.box(15.2,-3.6,0,1.2,.6,8,white);M.bullet=g.upload(gl);}
 {const g=new Geo();g.torusX(c.decor.ringR||Math.max(...c.half)+44,4,40,6,[1,1,1]);M.ring=g.upload(gl);}
 {const g=new Geo();g.star(1,.45,.22,[1,.88,.25]);M.star=g.upload(gl);}
 {const g=new Geo();g.sphere(0,0,0,4.6,10,[1,1,1],{sy:1.2});g.box(0,-6.4,0,.4,4,.4,white);M.balloon=g.upload(gl);}
 {const g=new Geo(),A=[1,.85,.2],B=[.95,.3,.25];for(let k=-3;k<=3;k++)g.box(0,26,k*5,11,.7,5,k%2?A:B,{tx:.8});for(const z of [-13,13])g.box(0,19,z,.5,13,.5,white);M.glider=g.upload(gl);}
 // start gantry in the start frame (X along track, Y up, Z right)
 if(!c.arena){const g=new Geo(),h=c.half[T.idx(c,c.startS)]+12,pc=[.25,.15,.45];for(const z of [-h,h]){g.box(0,40,z,8,80,8,pc);g.box(0,82,z,10,4,10,[1,.85,.3]);}g.box(0,74,0,7,12,2*h+8,[.12,.08,.2]);
  for(let x=0;x<Math.floor(h*2/6);x++)for(let y=0;y<2;y++)g.box(3.8,71+y*6,-h+3+x*6,.6,6,6,(x+y)%2?white:black);
  for(let k=0;k<3;k++)g.sphere(0,86,-14+k*14,3.2,8,[1,.35,.3]);M.gantry=g.upload(gl);M.gantryAt=c.startS;}
 // scenery: floating stars around the course (seeded)
 const decor=[];{let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;const n=c.arena?18:46;
  for(let k=0;k<n;k++){const s=rnd()*c.L,f=T.frame(c,s,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]}),side=rnd()<.5?-1:1,off=c.arena?side*(330+rnd()*500):side*(260+rnd()*900),up=-260+rnd()*700;
   decor.push({P:[f.P[0]+f.R[0]*off+(c.arena?0:f.U[0]*up),f.P[1]+(c.arena?up*.6:f.U[1]*up),f.P[2]+f.R[2]*off+(c.arena?0:f.U[2]*up)],size:24+rnd()*60,spin:rnd()*6,rate:.3+rnd()*.8,hue:rnd()});}
  if(c.arena)decor.push({P:[0,c.py[0]+40,c.pz[0]+500],size:150,spin:0,rate:.25,hue:.14,big:true});}
 let cx0=0,cz0=0,cy0=0;for(let i=0;i<c.N;i++){cx0+=c.px[i];cy0+=c.py[i];cz0+=c.pz[i];}cx0/=c.N;cy0/=c.N;cz0/=c.N;
 const comets=[];let cometT=0,cseed=99;const crnd=()=>(cseed=(cseed*16807)%2147483647)/2147483647;
 function tickComets(dt){cometT-=dt;if(cometT<=0&&comets.length<6){cometT=.6+crnd()*1.4;const a=crnd()*Math.PI*2,r=3800+crnd()*1800,t=a+Math.PI/2+(crnd()-.5),d=T.norm([Math.cos(t),-.25-crnd()*.3,Math.sin(t)]);
  comets.push({P:[cx0+Math.cos(a)*r,cy0+1300+crnd()*1400,cz0+Math.sin(a)*r],V:[d[0]*2400,d[1]*2400,d[2]*2400],life:1.4,max:1.4,hue:crnd()});}
  for(let j=comets.length-1;j>=0;j--){const m=comets[j];m.life-=dt;if(m.life<=0){comets.splice(j,1);continue;}for(let q=0;q<3;q++)m.P[q]+=m.V[q]*dt;}}
 const ringsAt=c.rings.map(s=>{const f=T.frame(c,s,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]});return {P:f.P.slice(),T:f.T.slice(),U:f.U.slice(),R:f.R.slice()};});
 // ---- textures
 const tex=(src)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;};
 const atlas=tex(makeAtlas());
 const heads=[null,null],headOK=[false,false];
 function setHead(i,cv){try{if(!heads[i])heads[i]=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,heads[i]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cv);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);headOK[i]=true;}catch{headOK[i]=false;}return headOK[i];}
 const alphaB=new Batch(gl,700),addB=new Batch(gl,1600),shadB=new Batch(gl,40),headB=[new Batch(gl,2),new Batch(gl,2)];
 // ---- state
 const fog=battle?[.07,.035,.16]:[.06,.03,.15],LIGHT=T.norm([.35,.85,.3]);
 let VP=new Float32Array(16),view=new Float32Array(16),proj=new Float32Array(16),cam={E:[0,0,0],R:[1,0,0],U:[0,1,0],F:[0,0,-1]},vpRect={x:0,y:0,w:1,h:1},time=0,fogD=.00042;
 const tmpM=new Float32Array(16),tmpM2=new Float32Array(16);
 const en=(p,names,on)=>{for(const n of names){const l=p.a[n];if(l!=null&&l>=0)on?gl.enableVertexAttribArray(l):gl.disableVertexAttribArray(l);}};
 const ptr=(p,n,size,stride,off)=>{const l=p.a[n];if(l!=null&&l>=0)gl.vertexAttribPointer(l,size,gl.FLOAT,false,stride,off);};
 function useMesh(){const p=P.mesh;gl.useProgram(p.p);gl.uniformMatrix4fv(p.u.uVP,false,VP);gl.uniform3fv(p.u.uCam,cam.E);gl.uniform3fv(p.u.uFog,fog);gl.uniform3fv(p.u.uLight,LIGHT);gl.uniform1f(p.u.uFogD,fogD);
  en(p,['aPos','aNrm','aCol'],true);}
 function draw(m,Mx,tint=[1,1,1],emit=[0,0,0],alpha=1){const p=P.mesh;gl.bindBuffer(gl.ARRAY_BUFFER,m.buf);ptr(p,'aPos',3,36,0);ptr(p,'aNrm',3,36,12);ptr(p,'aCol',3,36,24);
  gl.uniformMatrix4fv(p.u.uM,false,Mx);gl.uniform3fv(p.u.uTint,tint);gl.uniform3fv(p.u.uEmit,emit);gl.uniform1f(p.u.uAlpha,alpha);gl.drawArrays(gl.TRIANGLES,0,m.n);}
 function endMesh(){en(P.mesh,['aPos','aNrm','aCol'],false);}
 function drawRoad(m){const p=P.road;gl.bindBuffer(gl.ARRAY_BUFFER,m.buf);ptr(p,'aPos',3,40,0);ptr(p,'aNrm',3,40,12);ptr(p,'aUV',2,40,24);ptr(p,'aInfo',2,40,32);gl.drawArrays(gl.TRIANGLES,0,m.n);}
 function drawBatch(b,texture,test){if(!b.n)return;const p=P.spr;gl.useProgram(p.p);gl.uniformMatrix4fv(p.u.uVP,false,VP);gl.uniform1f(p.u.uTest,test?1:0);gl.uniform3fv(p.u.uCam,cam.E);gl.uniform1f(p.u.uFogD,fogD);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(p.u.uTex,0);gl.bindBuffer(gl.ARRAY_BUFFER,b.buf);gl.bufferData(gl.ARRAY_BUFFER,b.a.subarray(0,b.n*54),gl.DYNAMIC_DRAW);
  en(p,['aPos','aUV','aCol'],true);ptr(p,'aPos',3,36,0);ptr(p,'aUV',2,36,12);ptr(p,'aCol',4,36,20);
  gl.drawArrays(gl.TRIANGLES,0,b.n*6);en(p,['aPos','aUV','aCol'],false);}
 const visible=(Pt,r=40,far=3200)=>{const dx=Pt[0]-cam.E[0],dy=Pt[1]-cam.E[1],dz=Pt[2]-cam.E[2],f=dx*cam.F[0]+dy*cam.F[1]+dz*cam.F[2];return f>-r&&f<far+r;};
 const hsv=(h,s,v)=>{const f=n=>{const k=(n+h*6)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1));};return [f(5),f(3),f(1)];};
 const rotAbout=(A,B,a)=>{const cs=Math.cos(a),sn=Math.sin(a);return [[A[0]*cs+B[0]*sn,A[1]*cs+B[1]*sn,A[2]*cs+B[2]*sn],[B[0]*cs-A[0]*sn,B[1]*cs-A[1]*sn,B[2]*cs-A[2]*sn]];};

 // kart pose → matrix (drift slide, tricks, tumbles, shrink/squash)
 function kartMatrix(k,o){let F=k.F,N=k.N,R=k.R;
  if(k.visYaw){[F,R]=rotAbout(F,R,k.visYaw);}
  if(k.trick>0&&k.trick<1){const a=k.trick*Math.PI*2;[N,R]=rotAbout(N,R,a);}
  if(k.tumble>0){const b=(1-k.tumble/1.35)*Math.PI*2;[F,N]=rotAbout(F,N,b);}
  const sc=k.shrink>0?.55:1,sy=k.squash>0?.35:1;return {M:M4.frame(k.P2,F,N,R,sc,o,sy),F,N,R,sc};}
 function drawKart(k,scene){
  const {M:Mk,F,N,R,sc}=kartMatrix(k,new Float32Array(16));k._M=Mk;
  if(k.lakitu>0&&scene.blink)return;
  const starTint=k.star>0||k.frenzy>0?hsv((time*2.5)%1,.7,1):null;
  if(k.bullet>0){draw(M.bullet,M4.mul(Mk,M4.trs(0,7,0,0,0,1.25),tmpM),[1,1,1],[.05,.05,.05]);}
  else{
   draw(M.kart[k.i],Mk,starTint||[1,1,1],starTint?[.35,.35,.35]:[.06,.06,.06],1);
   const steerA=-(k.drift?k.drift*.35:k.steer*.38),hover=k.glue*Math.PI/2;
   for(const [x,y,z,r,w,front] of [[8.3,3.6,8.6,3.6,3.4,1],[8.3,3.6,-8.6,3.6,3.4,1],[-8,4.3,8.8,4.3,4.2,0],[-8,4.3,-8.8,4.3,4.2,0]]){
    const Wm=M4.mul(Mk,M4.trs(x,y,z,front?steerA:0,hover*(z>0?1:-1),1),tmpM2);const S=M4.mul(Wm,new Float32Array([r,0,0,0,0,r,0,0,0,0,w,0,0,0,0,1]),tmpM);
    draw(M.wheel,S,starTint||[1,1,1],k.glue>.5?[.1,.5,.6]:[0,0,0]);}
   if(k.glide)draw(M.glider,Mk,[1,1,1],[.05,.05,.05]);
  }
  // balloons
  if(battle&&k.balloons>0){const cols=[[1,.25,.25],[1,.85,.2],[.25,.6,1]];for(let b=0;b<k.balloons;b++){const off=(b-(k.balloons-1)/2)*7.5,sw=Math.sin(time*3+b)*1.2;
   draw(M.balloon,M4.mul(Mk,M4.trs(-15+sw,13+Math.abs(off)*.12,off*1.5,0,0,.78),tmpM),cols[b],[.25,.25,.25]);}}
  // trailing / orbiting items
  const it=k.frenzy>0?null:k.items?.[0];if(it){
   if(it.id==='shell3'||it.id==='green'||it.id==='red'){const n=it.id==='shell3'?it.n:1,m=it.id==='red'?M.shell.red:M.shell.green;for(let q=0;q<n;q++){const a=n>1?time*5+q*Math.PI*2/3:Math.PI,x=n>1?Math.cos(a)*19:-18,z=n>1?Math.sin(a)*19:0;
     draw(m,M4.mul(Mk,M4.trs(x,2,z,time*8,0,.75),tmpM),[1,1,1],[.12,.12,.12]);}}
   else if(it.id==='banana'||it.id==='banana3'){const n=it.id==='banana3'?it.n:1;for(let q=0;q<n;q++){const p=M4.apply(Mk,[-17-q*11,5,0]);alphaB.bill(p,7*sc,7*sc,TILE.banana,[1,1,1,1],cam);}}
   else if(it.id==='bomb'){const p=M4.apply(Mk,[-17,6,0]);alphaB.bill(p,7.5,7.5,TILE.bomb,[1,1,1,1],cam);}}
  // head
  const hp=M4.apply(Mk,[-1.7,k.bullet>0?24:21.5,0]),hs=(k.bullet>0?9:10.5)*sc;
  k._head={P:hp,size:hs};
  if(headOK[k.i]){const b=headB[k.i];b.reset();b.bill(hp,hs,hs,-1,starTint?[...starTint.map(v=>.6+.4*v),1]:[1,1,1,1],cam,k.spin>0?Math.sin(k.spinA)*.3:0);b._full=true;}
  // shadow
  if(k.falling<=0&&k.lakitu<=0){const f=T.frame(scene.course,k.s,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]});const hgt=k.air?k.h:0;if(hgt<160&&T.surfaceAt(scene.course,k.s,k.d)){const a=.7*(1-hgt/160),P0=[f.P[0]+f.R[0]*k.d+f.U[0]*.8,f.P[1]+f.R[1]*k.d+f.U[1]*.8,f.P[2]+f.R[2]*k.d+f.U[2]*.8];
   shadB.quad(P0,[f.T[0]*15*sc,f.T[1]*15*sc,f.T[2]*15*sc],[f.R[0]*11*sc,f.R[1]*11*sc,f.R[2]*11*sc],uvOf(TILE.shadow),[1,1,1,a]);}}
  if(k.lakitu>0){const p=M4.apply(Mk,[0,46,0]);alphaB.bill(p,16,16,TILE.lakitu,[1,1,1,1],cam,Math.sin(time*3)*.08);}
 }
 function setView(rect,eye,target,up,fov,W,H){vpRect=rect;M4.persp(fov,rect.w/rect.h,3,9500,proj);M4.lookAt(eye,target,up,view);M4.mul(proj,view,VP);
  cam={E:eye.slice(),R:[view[0],view[4],view[8]],U:[view[1],view[5],view[9]],F:[-view[2],-view[6],-view[10]],tanY:Math.tan(fov/2),aspect:rect.w/rect.h};
  gl.viewport(rect.x,H-rect.y-rect.h,rect.w,rect.h);gl.enable(gl.SCISSOR_TEST);gl.scissor(rect.x,H-rect.y-rect.h,rect.w,rect.h);}
 function project(Pt){const x=VP[0]*Pt[0]+VP[4]*Pt[1]+VP[8]*Pt[2]+VP[12],y=VP[1]*Pt[0]+VP[5]*Pt[1]+VP[9]*Pt[2]+VP[13],w=VP[3]*Pt[0]+VP[7]*Pt[1]+VP[11]*Pt[2]+VP[15];
  if(w<1)return null;return {x:vpRect.x+(x/w*.5+.5)*vpRect.w,y:vpRect.y+(1-(y/w*.5+.5))*vpRect.h,w};}

 function renderView(rect,camera,scene,W,H){
  setView(rect,camera.eye,camera.target,camera.up,camera.fov,W,H);
  gl.clearColor(fog[0],fog[1],fog[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  // sky
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.BLEND);
  {const p=P.sky;gl.useProgram(p.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_CUBE_MAP,skyTex);gl.uniform1i(p.u.uSky,0);gl.uniform3fv(p.u.uCR,cam.R);gl.uniform3fv(p.u.uCU,cam.U);gl.uniform3fv(p.u.uCF,cam.F);
   gl.uniform2f(p.u.uTan,cam.tanY*cam.aspect,cam.tanY);gl.uniform4f(p.u.uVP,rect.x,H-rect.y-rect.h,rect.w,rect.h);gl.bindBuffer(gl.ARRAY_BUFFER,tri);en(p,['aP'],true);ptr(p,'aP',2,0,0);gl.drawArrays(gl.TRIANGLES,0,3);en(p,['aP'],false);}
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LEQUAL);
  // track
  {const p=P.road;gl.useProgram(p.p);gl.uniformMatrix4fv(p.u.uVP,false,VP);gl.uniform3fv(p.u.uCam,cam.E);gl.uniform3fv(p.u.uFog,fog);gl.uniform1f(p.u.uFogD,fogD);gl.uniform1f(p.u.uTime,time);gl.uniform1f(p.u.uStart,c.arena?-999:c.startS);
   en(p,['aPos','aNrm','aUV','aInfo'],true);drawRoad(roadM);
   gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-2);drawRoad(padM);gl.disable(gl.POLYGON_OFFSET_FILL);en(p,['aPos','aNrm','aUV','aInfo'],false);}
  // opaque meshes
  useMesh();
  const Mt=new Float32Array(16);
  if(M.gantry){const f=T.frame(c,M.gantryAt,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]});if(visible(f.P,120))draw(M.gantry,M4.frame(f.P,f.T,f.U,f.R,1,Mt),[1,1,1],[.15,.1,.2]);}
  for(const r of ringsAt)if(visible(r.P,200)){const col=hsv((time*.15+r.P[0]*.001)%1,.75,1);draw(M.ring,M4.frame(r.P,r.T,r.U,r.R,1,Mt),col,col.map(v=>v*.85));}
  for(const d of decor)if(visible(d.P,d.size*2,5000)){const a=d.spin+time*d.rate,F=[Math.cos(a),0,Math.sin(a)],R=[-Math.sin(a),0,Math.cos(a)];draw(M.star,M4.frame(d.P,F,[0,1,0],R,d.size,Mt),hsv(d.hue*.15+.1,.55,1),[.7,.6,.3]);}
  for(const b of scene.boxes)if(b.t<=0&&visible(b.P)){const a=time*1.6+b.s*.01,sc=b.pop>0?1+b.pop*.6:1;const F=[b.T[0]*Math.cos(a)+b.R[0]*Math.sin(a),b.T[1]*Math.cos(a)+b.R[1]*Math.sin(a),b.T[2]*Math.cos(a)+b.R[2]*Math.sin(a)];
   const N=b.U,R=T.cross(F,N),P0=[b.P[0]+N[0]*Math.sin(time*2+b.s)*2,b.P[1]+N[1]*Math.sin(time*2+b.s)*2,b.P[2]+N[2]*Math.sin(time*2+b.s)*2];b._M=M4.frame(P0,F,N,R,sc,new Float32Array(16));draw(M.boxEdge,b._M,[1,1,1],[.6,.6,.6]);alphaB.bill(P0,6.5,6.5,TILE.q,[1,1,1,1],cam,Math.sin(time*2+b.s)*.2);}
  for(const cn of scene.coins)if(cn.t<=0&&visible(cn.P,20,1800)){const a=time*4+cn.s*.05,F=[cn.T[0]*Math.cos(a)+cn.R[0]*Math.sin(a),cn.T[1]*Math.cos(a)+cn.R[1]*Math.sin(a),cn.T[2]*Math.cos(a)+cn.R[2]*Math.sin(a)];draw(M.coin,M4.frame(cn.P,F,cn.U,T.cross(F,cn.U),1,Mt),[1,1,1],[.45,.35,.05]);}
  for(const sh of scene.shells)if(visible(sh.P)){const F=sh.F||[1,0,0],N=sh.N||[0,1,0];const a=time*12;const Fx=[F[0]*Math.cos(a)+(sh.R||[0,0,1])[0]*Math.sin(a),F[1]*Math.cos(a)+(sh.R||[0,0,1])[1]*Math.sin(a),F[2]*Math.cos(a)+(sh.R||[0,0,1])[2]*Math.sin(a)];
   draw(M.shell[sh.kind],M4.frame(sh.P,Fx,N,T.cross(Fx,N),sh.kind==='blue'?1.3:1,Mt),[1,1,1],[.15,.15,.15]);if(sh.kind==='blue'){alphaB.bill([sh.P[0]+N[0]*8,sh.P[1]+N[1]*8,sh.P[2]+N[2]*8],9,6,TILE.wing,[1,1,1,1],cam,Math.sin(time*20)*.3);}
   addB.bill(sh.P,10,10,TILE.glow,sh.kind==='red'?[1,.3,.2,.5]:sh.kind==='blue'?[.3,.5,1,.6]:[.3,1,.4,.4],cam);}
  for(const k of scene.karts){if(k.falling>1.05)continue;drawKart(k,scene);}
  endMesh();
  for(const bn of scene.bananas)if(visible(bn.P))alphaB.bill([bn.P[0]+bn.N[0]*6,bn.P[1]+bn.N[1]*6,bn.P[2]+bn.N[2]*6],7,7,TILE.banana,[1,1,1,1],cam);
  for(const bm of scene.bombs)if(visible(bm.P)){const flash=bm.fuse<1&&(time*10|0)%2;alphaB.bill([bm.P[0]+bm.N[0]*7,bm.P[1]+bm.N[1]*7,bm.P[2]+bm.N[2]*7],8,8,TILE.bomb,flash?[1,.5,.5,1]:[1,1,1,1],cam);}
  // particles
  for(const p of scene.particles){if(!visible(p.P,30,2400))continue;const k=p.life/p.max,a=p.fade?Math.min(1,k*1.6):1,sz=p.size+p.grow*(1-k);(p.add?addB:alphaB).bill(p.P,sz,sz,p.tile,[p.col[0],p.col[1],p.col[2],p.col[3]*a],cam,p.rot||0);}
  // heads + alpha-tested sprites
  for(let i=0;i<2;i++)if(headOK[i]&&headB[i].n){drawBatch(headB[i],heads[i],true);headB[i].reset();}
  drawBatch(alphaB,atlas,true);alphaB.reset();
  // blended
  gl.enable(gl.BLEND);gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-2,-4);drawBatch(shadB,atlas,false);gl.disable(gl.POLYGON_OFFSET_FILL);shadB.reset();
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  {const p=P.road;gl.useProgram(p.p);en(p,['aPos','aNrm','aUV','aInfo'],true);drawRoad(railM);en(p,['aPos','aNrm','aUV','aInfo'],false);}
  useMesh();for(const b of scene.boxes)if(b.t<=0&&b._M&&visible(b.P)){draw(M.boxFace,b._M,hsv((time*.5+b.s*.002)%1,.8,.55),[0,0,0],1);}endMesh();
  drawBatch(addB,atlas,false);addB.reset();
  for(const m of comets){const dir=T.norm(m.V),side=T.norm(T.cross(dir,cam.F)),a=Math.sin(m.life/m.max*Math.PI),col=hsv(.55+m.hue*.35,.35,1);
   addB.quad(m.P,[dir[0]*260,dir[1]*260,dir[2]*260],[side[0]*9,side[1]*9,side[2]*9],uvOf(TILE.glow),[col[0],col[1],col[2],a*.8]);addB.quad([m.P[0]+dir[0]*240,m.P[1]+dir[1]*240,m.P[2]+dir[2]*240],[dir[0]*26,dir[1]*26,dir[2]*26],[side[0]*26,side[1]*26,side[2]*26],uvOf(TILE.glow),[1,1,1,a]);}
  {const fd=fogD;fogD=0;drawBatch(addB,atlas,false);fogD=fd;addB.reset();}
  gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.SCISSOR_TEST);
 }
 return {gl,setHead,headOK,renderView,project,tick(dt){time+=dt;tickComets(dt);},get time(){return time;},resize(w,h){if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;},TILE,
  lost:()=>gl.isContextLost()};
}
Object.assign(exports,{createRenderer,TILE});
