// Sitabout Mini Golf: the drawing. A tilted top-down 3/4 view (like the pro mobile mini golf games): the ground is drawn
// flat and squashed by TC, heights lift things up the screen by TS. Greens are raised beds with a skirt, rails are 3D bars,
// ponds sit lower than the turf with banks, props stand up facing the camera. Every texture and prop has a drop-in art slot
// (src/data/minigolfSprites.js); missing ones are drawn here.
// cam = {x,y (world point at the screen centre), k (px per unit), rot (0 = tee at the bottom, 1 = tee on the left)}.
const P=require("src/engines/minigolf/physics.js");
const S=require("src/data/minigolfSprites.js");
const TC=.86,TS=.5,LAWN_Z=-1.2,RAIL_W=1.4;

function proj(cam,W,H,x,y,z=0){let u,v;if(cam.rot){u=cam.y-y;v=x-cam.x;}else{u=x-cam.x;v=y-cam.y;}return [W/2+u*cam.k,H/2+(v*TC-z*TS)*cam.k];}
// screen position -> world point on the plane z (inverse of proj)
function unproj(cam,W,H,X,Y,z=0){const u=(X-W/2)/cam.k,v=((Y-H/2)/cam.k+z*TS)/TC;return cam.rot?[cam.x+v,cam.y-u]:[cam.x+u,cam.y+v];}
// the affine matrix that draws world (x,y) onto the plane z=a+bx+cy
function aff(cam,W,H,a=0,b=0,c=0){const k=cam.k;
 if(cam.rot)return [0,k*TC-k*TS*b,-k,-k*TS*c,W/2+k*cam.y,H/2-k*TC*cam.x-k*TS*a];
 return [k,-k*TS*b,0,k*TC-k*TS*c,W/2-k*cam.x,H/2-k*TC*cam.y-k*TS*a];}
const vOf=(cam,nx,ny)=>cam.rot?nx:ny;   // how much a ground direction points toward the camera (down the screen)

// ------------------------------------------------------------------ textures
const TEX=new Map();
function rnd(seed){let n=seed>>>0||1;return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;if(f>0){r+=(255-r)*f;g+=(255-g)*f;b+=(255-b)*f;}else{r*=1+f;g*=1+f;b*=1+f;}return `rgb(${r|0},${g|0},${b|0})`;}
function speckle(g,w,h,base,n,amp,r,seed){g.fillStyle=base;g.fillRect(0,0,w,h);const R=rnd(seed);for(let i=0;i<n;i++){g.fillStyle=shade(base,(R()-.5)*amp);const s=r*(.5+R());g.fillRect(R()*w,R()*h,s,s);}}
function texture(key,look){
 if(TEX.has(key))return TEX.get(key);
 const art=S.picture(key.split('|')[0]);let c;
 if(art){c=art;}else{
  const [name,course]=key.split('|');c=canvas(256,256);const g=c.getContext('2d');
  if(name.endsWith('-turf')){const L=look;speckle(g,256,256,L.turf,2600,.22,2,11);g.globalAlpha=.32;g.fillStyle=L.turf2;g.fillRect(0,0,256,128);g.globalAlpha=1;
   if(course==='spaceballs'){g.strokeStyle='rgba(255,255,255,.07)';g.lineWidth=2;for(let i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.moveTo(0,i);g.lineTo(256,i);g.stroke();}}}
  else if(name.endsWith('-lawn')){const L=look;if(L.space){g.fillStyle='#15142c';g.fillRect(0,0,256,256);g.strokeStyle='#22204a';g.lineWidth=3;for(let i=0;i<=256;i+=128){g.strokeRect(i+2,2,124,124);g.strokeRect(i+2,130,124,124);}const R=rnd(5);for(let i=0;i<40;i++){g.fillStyle=R()<.5?'#2e2a66':'#3b2f80';g.beginPath();g.arc(R()*256,R()*256,1.5,0,7);g.fill();}g.fillStyle='rgba(90,200,255,.25)';for(const [x,y] of [[64,64],[192,192]]){g.fillRect(x-1,y-30,2,60);}}
   else{speckle(g,256,256,L.lawn,3400,.28,2.4,23);const R=rnd(9);for(let i=0;i<14;i++){g.fillStyle=shade(L.lawn2,(R()-.5)*.2);g.beginPath();g.ellipse(R()*256,R()*256,10+R()*24,6+R()*14,R()*3,0,7);g.globalAlpha=.45;g.fill();g.globalAlpha=1;}}}
  else if(name==='sand'){speckle(g,256,256,'#e6d29a',3000,.18,2,31);g.strokeStyle='rgba(150,120,70,.22)';g.lineWidth=2;for(let i=-256;i<512;i+=18){g.beginPath();g.arc(128,i,180,.3,2.8);g.stroke();}}
  else if(name==='water'||name==='water-space'){const sp=name==='water-space',gr=g.createLinearGradient(0,0,256,256);gr.addColorStop(0,sp?'#5b22d8':'#2f8fd2');gr.addColorStop(1,sp?'#3a0f9a':'#1f6aa8');g.fillStyle=gr;g.fillRect(0,0,256,256);const R=rnd(3);g.strokeStyle=sp?'rgba(255,140,255,.35)':'rgba(255,255,255,.28)';g.lineWidth=2;for(let i=0;i<22;i++){const x=R()*256,y=R()*256;g.beginPath();g.arc(x,y,6+R()*10,3.6,5.8);g.stroke();}}
  else if(name==='ice'){speckle(g,256,256,'#cfeeff',800,.12,3,41);g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1.5;const R=rnd(4);for(let i=0;i<10;i++){let x=R()*256,y=R()*256;g.beginPath();g.moveTo(x,y);for(let k=0;k<4;k++){x+=(R()-.5)*60;y+=(R()-.5)*60;g.lineTo(x,y);}g.stroke();}}
  else if(name==='carpet'){if(course==='gilmore'){const cols=['#ff4d6d','#ff9f1c','#ffe14d','#4dd97a','#4da6ff','#9b6bff'];cols.forEach((col,i)=>{g.fillStyle=col;g.fillRect(i*256/6,0,256/6+1,256);});g.globalAlpha=.15;speckle(g,256,256,'#ffffff',0,0,0,1);g.globalAlpha=1;const R=rnd(8);for(let i=0;i<900;i++){g.fillStyle=`rgba(255,255,255,${R()*.18})`;g.fillRect(R()*256,R()*256,2,2);}}
   else if(course==='spaceballs'){speckle(g,256,256,'#7a2fd0',2000,.25,2,51);g.fillStyle='rgba(255,230,120,.8)';const R=rnd(6);for(let i=0;i<20;i++){const x=R()*256,y=R()*256;g.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5,r=k%2?2:5;g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}g.fill();}}
   else{speckle(g,256,256,'#b8222c',2000,.2,2,61);}}
  else if(name==='conveyor'){g.fillStyle='#2a2d33';g.fillRect(0,0,256,256);for(let y=0;y<256;y+=32){g.fillStyle='#3d424b';g.fillRect(0,y,256,14);g.fillStyle='#ffd23f';g.beginPath();g.moveTo(128,y+2);g.lineTo(150,y+14);g.lineTo(106,y+14);g.fill();}}
  else if(name==='out'){const gr=g.createRadialGradient(128,128,4,128,128,128);gr.addColorStop(0,'#000');gr.addColorStop(.6,'#1a0636');gr.addColorStop(1,'#000');g.fillStyle=gr;g.fillRect(0,0,256,256);}
  else if(name==='bridge'){for(let y=0;y<256;y+=32){g.fillStyle=y%64?'#9a6a3a':'#8a5c30';g.fillRect(0,y,256,30);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,y+30,256,2);g.fillStyle='rgba(60,30,10,.6)';g.fillRect(20,y+12,5,5);g.fillRect(230,y+12,5,5);}}
  else if(name.endsWith('-rail')||name.endsWith('-railtop')||name.endsWith('-cliff')){c=canvas(256,name.endsWith('-cliff')?64:32);const h=c.height,g2=c.getContext('2d'),L=look,top=name.endsWith('-railtop');
   if(course==='gilmore'&&!name.endsWith('-cliff')){for(let x=0;x<256;x+=32){g2.fillStyle=top?((x/32)%2?'#ffffff':'#e03a2e'):((x/32)%2?'#f4f4f4':'#d8473a');g2.fillRect(x,0,32,h);}g2.fillStyle='rgba(0,0,0,.18)';g2.fillRect(0,h-3,256,3);}
   else if(course==='spaceballs'){const gr=g2.createLinearGradient(0,0,0,h);gr.addColorStop(0,top?'#ffffff':'#e8edf6');gr.addColorStop(.5,top?'#c9d0dd':'#9aa3b6');gr.addColorStop(1,'#6b7388');g2.fillStyle=gr;g2.fillRect(0,0,256,h);if(!top){for(let x=16;x<256;x+=48){g2.fillStyle='#57e1ff';g2.fillRect(x,h*.4,14,Math.max(2,h*.18));}}}
   else{const base=name.endsWith('-cliff')?(course==='gilmore'?'#8a8f99':'#6d5236'):(top?L.railTop:L.rail);g2.fillStyle=base;g2.fillRect(0,0,256,h);const R=rnd(7);g2.strokeStyle='rgba(40,20,5,.28)';g2.lineWidth=1;for(let i=0;i<9;i++){g2.beginPath();const y=R()*h;g2.moveTo(0,y);g2.bezierCurveTo(80,y+R()*4-2,170,y+R()*4-2,256,y);g2.stroke();}for(let x=0;x<256;x+=64){g2.fillStyle='rgba(0,0,0,.25)';g2.fillRect(x,0,2,h);}if(name.endsWith('-cliff')&&course==='gilmore'){g2.fillStyle='rgba(0,0,0,.2)';for(let y=0;y<h;y+=16)for(let x=(y/16%2)*16;x<256;x+=32)g2.fillRect(x,y,30,14);}}
  }
  else{speckle(g,256,256,'#888',100,.2,2,1);}
 }
 const e={img:c,w:c.width||c.naturalWidth,h:c.height||c.naturalHeight,art:!!art};TEX.set(key,e);return e;
}
function pattern(x,key,look,worldSize){const t=texture(key,look);if(!t.pat||t.patCtx!==x){t.pat=x.createPattern(t.img,'repeat');t.patCtx=x;}const s=worldSize/t.w;try{t.pat.setTransform(new DOMMatrix([s,0,0,s,0,0]));}catch{}return t.pat;}
const tileWorld=name=>(S.PICTURES[name]&&S.PICTURES[name].world)||24;

// ------------------------------------------------------------------ hill + slope shading, cached per green
function shadeCanvas(g){
 if(g._shade!==undefined)return g._shade;
 if(!g.hills&&!g.b&&!g.c){g._shade=null;return null;}
 const [x0,y0,x1,y1]=g.box,K=2,w=Math.max(2,Math.ceil((x1-x0)*K)),h=Math.max(2,Math.ceil((y1-y0)*K)),c=canvas(w,h),cx=c.getContext('2d'),im=cx.createImageData(w,h);
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){const x=x0+i/K,y=y0+j/K,[gx,gy]=P.surfGrad(g,x,y);const l=(-gx*.6-gy*.8)*1.3,a=Math.min(.28,Math.abs(l));const o=(j*w+i)*4;if(l>0){im.data[o]=255;im.data[o+1]=255;im.data[o+2]=230;}else{im.data[o]=0;im.data[o+1]=20;im.data[o+2]=0;}im.data[o+3]=a*255;}
 cx.putImageData(im,0,0);g._shade={c,x0,y0,K};return g._shade;
}

// ------------------------------------------------------------------ props (billboards), drawn fallback art
// draw(g) is in prop units: 1 unit = the prop's width, origin at the foot, up = -y
const FALLBACK={
 oak(g){g.fillStyle='#6b4423';g.fillRect(-.06,-.5,.12,.5);for(const [x,y,r,c] of [[0,-.72,.34,'#2f7a2a'],[-.22,-.6,.26,'#2a6d25'],[.22,-.6,.26,'#2a6d25'],[0,-.92,.26,'#3a8a33']]){g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,7);g.fill();}g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.arc(-.08,-.86,.14,0,7);g.fill();},
 pine(g){g.fillStyle='#5a3a1e';g.fillRect(-.07,-.3,.14,.3);for(let i=0;i<3;i++){g.fillStyle=['#1f5a2c','#256a33','#2e7a3a'][i];g.beginPath();g.moveTo(-.5+i*.1,-.25-i*.42);g.lineTo(0,-1.05-i*.4);g.lineTo(.5-i*.1,-.25-i*.42);g.fill();}},
 bush(g){for(const [x,y,r] of [[-.25,-.25,.25],[.25,-.25,.25],[0,-.38,.3]]){g.fillStyle='#2f7d2c';g.beginPath();g.arc(x,y,r,0,7);g.fill();}g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.arc(-.05,-.5,.12,0,7);g.fill();},
 flowers(g){g.fillStyle='#5a3b22';g.beginPath();g.ellipse(0,-.12,.5,.14,0,0,7);g.fill();const R=rnd(3);for(let i=0;i<14;i++){g.fillStyle=['#ff5a7a','#ffd23f','#ffffff','#b36bff'][i%4];g.beginPath();g.arc((R()-.5)*.85,-.16-R()*.14,.05,0,7);g.fill();}},
 cart(g){g.fillStyle='#f2f2f2';g.fillRect(-.45,-.42,.9,.28);g.fillStyle='#2c3e50';g.fillRect(-.4,-.72,.06,.3);g.fillRect(.34,-.72,.06,.3);g.fillStyle='#27ae60';g.fillRect(-.48,-.78,.96,.08);g.fillStyle='#222';for(const x of [-.3,.3]){g.beginPath();g.arc(x,-.1,.1,0,7);g.fill();}},
 sign(g,o){g.fillStyle='#6b4423';g.fillRect(-.35,-.6,.08,.6);g.fillRect(.27,-.6,.08,.6);g.fillStyle='#c8955a';g.fillRect(-.48,-.92,.96,.4);g.strokeStyle='#6b4423';g.lineWidth=.03;g.strokeRect(-.48,-.92,.96,.4);if(o&&o.text){g.fillStyle='#3a2210';g.font='900 .2px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(o.text,0,-.72);}},
 palm(g){g.strokeStyle='#8a6a3a';g.lineWidth=.08;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(.12,-.5,.04,-1.05);g.stroke();for(let i=0;i<6;i++){const a=-Math.PI/2+(i-2.5)*.55;g.strokeStyle='#2f9a3a';g.lineWidth=.07;g.beginPath();g.moveTo(.04,-1.05);g.quadraticCurveTo(.04+Math.cos(a)*.3,-1.05+Math.sin(a)*.3-.1,.04+Math.cos(a)*.5,-1.05+Math.sin(a)*.5+.12);g.stroke();}},
 castle(g){g.fillStyle='#d9c7a0';g.fillRect(-.42,-.62,.84,.62);for(const x of [-.42,.3]){g.fillRect(x,-.88,.12,.3);}g.fillStyle='#e85a8a';for(const x of [-.36,.36]){g.beginPath();g.moveTo(x-.1,-.88);g.lineTo(x,-1.05);g.lineTo(x+.1,-.88);g.fill();}g.fillStyle='#5a3a22';g.beginPath();g.arc(0,-.15,.14,Math.PI,0);g.fillRect(-.14,-.15,.28,.15);g.fill();},
 hockey(g){g.strokeStyle='#e33';g.lineWidth=.05;g.strokeRect(-.42,-.6,.84,.55);g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=.015;for(let x=-.4;x<.42;x+=.08){g.beginPath();g.moveTo(x,-.6);g.lineTo(x,-.05);g.stroke();}g.strokeStyle='#8a5a2e';g.lineWidth=.06;g.beginPath();g.moveTo(.48,-.95);g.lineTo(.3,-.05);g.lineTo(.08,-.03);g.stroke();},
 cloud(g){g.fillStyle='rgba(255,255,255,.95)';for(const [x,y,r] of [[-.25,-.25,.22],[.05,-.35,.28],[.3,-.24,.2],[0,-.18,.25]]){g.beginPath();g.arc(x,y,r,0,7);g.fill();}g.fillStyle='rgba(180,210,255,.4)';g.fillRect(-.45,-.12,.9,.06);},
 rock(g){g.fillStyle='#5a5470';g.beginPath();g.moveTo(-.48,0);g.lineTo(-.3,-.38);g.lineTo(.1,-.48);g.lineTo(.42,-.25);g.lineTo(.5,0);g.fill();g.fillStyle='#736c8e';g.beginPath();g.moveTo(-.3,-.38);g.lineTo(.1,-.48);g.lineTo(0,-.2);g.fill();},
 crystal(g){for(const [x,h,c] of [[-.2,.7,'#5ee6ff'],[.05,1,'#9b7bff'],[.28,.6,'#ff7bd9']]){g.fillStyle=c;g.beginPath();g.moveTo(x-.12,0);g.lineTo(x,-h);g.lineTo(x+.12,0);g.fill();}g.fillStyle='rgba(255,255,255,.4)';g.fillRect(.02,-.9,.03,.5);},
 beacon(g,o){g.fillStyle='#9aa3b6';g.fillRect(-.06,-1.4,.12,1.4);const on=((o&&o.t||0)*2%1)<.5;g.fillStyle=on?'#ff3b3b':'#661111';g.beginPath();g.arc(0,-1.48,.16,0,7);g.fill();if(on){g.fillStyle='rgba(255,60,60,.3)';g.beginPath();g.arc(0,-1.48,.4,0,7);g.fill();}},
 dish(g){g.fillStyle='#9aa3b6';g.fillRect(-.05,-.5,.1,.5);g.fillStyle='#d8dde8';g.beginPath();g.ellipse(0,-.62,.42,.22,-.5,0,7);g.fill();g.strokeStyle='#7b8296';g.lineWidth=.03;g.beginPath();g.moveTo(0,-.62);g.lineTo(.2,-.95);g.stroke();},
 'flag-sign'(g,o){FALLBACK.sign(g,o);},
 flag(g,o){const t=o&&o.t||0;g.strokeStyle='#e8e8e8';g.lineWidth=.08;g.beginPath();g.moveTo(0,0);g.lineTo(0,-3.1);g.stroke();g.fillStyle=o&&o.col||'#ff3b5c';g.beginPath();g.moveTo(.04,-3.1);for(let i=0;i<=8;i++){const f=i/8;g.lineTo(.04+f*.7,-3.1+.12*f+Math.sin(t*5+f*4)*.05*f);}for(let i=8;i>=0;i--){const f=i/8;g.lineTo(.04+f*.7,-2.62-.04*f+Math.sin(t*5+f*4)*.05*f);}g.fill();},
 magnet(g,o){const t=o&&o.t||0;g.fillStyle='#d0d6e2';g.fillRect(-.08,-1.2,.16,.85);g.fillStyle='#ffe14d';g.beginPath();g.moveTo(-.35,-.32);g.lineTo(.35,-.32);g.lineTo(.22,-.02);g.lineTo(-.22,-.02);g.fill();g.fillStyle='#e65aa8';g.beginPath();g.ellipse(0,-1.3,.34,.2,0,0,7);g.fill();g.strokeStyle='rgba(200,170,255,.6)';g.lineWidth=.03;for(let i=0;i<3;i++){const r=.25+((t*.8+i/3)%1)*.35;g.beginPath();g.ellipse(0,-.05,r,r*.35,0,0,7);g.stroke();}},
};
function drawProp(x,name,X,Y,wpx,o){
 const def=S.PICTURES[name],img=S.picture(name);
 if(img&&def){const sc=wpx/img.width,fx=def.foot?def.foot[0]/def.size[0]*img.width:img.width/2,fy=def.foot?def.foot[1]/def.size[1]*img.height:img.height;
  x.drawImage(img,X-fx*sc,Y-fy*sc,img.width*sc,img.height*sc);return;}
 const f=FALLBACK[name];if(!f)return;x.save();x.translate(X,Y);x.scale(wpx,wpx);f(x,o);x.restore();
}

// ------------------------------------------------------------------ the course scenery around a hole (seeded)
function decorFor(C,look,rot){
 const ck='_decor'+rot;if(C[ck])return C[ck];
 const R=rnd(P.hashN(...C.hole.key.split('').map(ch=>ch.charCodeAt(0)))*4e9+1),[x0,y0,x1,y1]=C.bbox,out=[];
 const free=(x,y,pad)=>{for(const g of C.greens){if(x<g.box[0]-pad||x>g.box[2]+pad||y<g.box[1]-pad||y>g.box[3]+pad)continue;if(P.inPoly(g.pts,x,y))return false;for(const e of g.edges||[]){const ex=e.x2-e.x1,ey=e.y2-e.y1,L2=ex*ex+ey*ey||1;let u=((x-e.x1)*ex+(y-e.y1)*ey)/L2;u=Math.max(0,Math.min(1,u));if(Math.hypot(x-e.x1-ex*u,y-e.y1-ey*u)<pad)return false;}}return true;};
 const props=C.hole.sky?['cloud']:look.props||['bush'];
 const tall=(k,w)=>{const d=S.PICTURES[k];return d&&d.size?w*d.size[1]/d.size[0]:w;};
 const clearAbove=(x,y,w,h)=>{for(let t=0;t<=h/TC*1.05;t+=2){const px=rot?x-t:x,py=rot?y:y-t;if(!free(px,py,w*.4))return false;}return true;};
 for(let i=0;i<120&&out.length<22;i++){const x=x0-26+R()*(x1-x0+52),y=y0-26+R()*(y1-y0+52),k=props[Math.floor(R()*props.length)],w=(S.PICTURES[k]||{w:10}).w*(.8+R()*.4);if(k==='sign')continue;if(!free(x,y,w*.45+2)||!clearAbove(x,y,w,tall(k,w)))continue;if(out.some(o=>Math.hypot(o.x-x,o.y-y)<(o.w+w)*.45))continue;out.push({k,x,y,w});}
 for(const p of C.hole.props||[])out.push({k:p.k,x:p.x,y:p.y,w:(S.PICTURES[p.k==='flag-sign'?'sign':p.k]||{w:10}).w*(p.s||1),text:p.text});
 C[ck]=out;return out;
}

// ------------------------------------------------------------------ the frame
// st = {C, course, T, balls:[{b, i, col, face(x,cx,cy,r), hidden, ghost}], cupFlag, fx (particles), lostFound, hit:{bumper:i->t}}
function drawHole(x,W,H,cam,st){
 const {C,course}=st,look=course.look,cid=course.id;
 // background
 x.setTransform(1,0,0,1,0,0);
 const sky=!!C.hole.sky;
 if(look.space){x.fillStyle='#03021a';x.fillRect(0,0,W,H);drawStars(x,W,H,cam,st.T);}
 else if(sky){const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#8fd3ff');g.addColorStop(1,'#ffe3f4');x.fillStyle=g;x.fillRect(0,0,W,H);for(let i=0;i<9;i++){const px=((i*0.37+st.T*.01*(1+i%3))%1.3-.15)*W,py=(i*.137%1)*H,r=Math.min(W,H)*(.08+(i%4)*.03);x.fillStyle='rgba(255,255,255,.75)';for(const [dx,dy,rr] of [[0,0,1],[r*.8,r*.1,.8],[-r*.8,r*.15,.7]]){x.beginPath();x.arc(px+dx,py+dy,r*rr,0,7);x.fill();}}}
 const lawnA=aff(cam,W,H,LAWN_Z);x.setTransform(...lawnA);x.fillStyle=pattern(x,`${cid}-lawn|${cid}`,look,tileWorld(`${cid}-lawn`));
 if(sky){}
 else if(!look.space){const [a,b]=unproj(cam,W,H,0,0,LAWN_Z),[c2,d]=unproj(cam,W,H,W,H,LAWN_Z),[e,f]=unproj(cam,W,H,W,0,LAWN_Z),[g2,h]=unproj(cam,W,H,0,H,LAWN_Z);const xs=[a,c2,e,g2],ys=[b,d,f,h];x.fillRect(Math.min(...xs)-2,Math.min(...ys)-2,Math.max(...xs)-Math.min(...xs)+4,Math.max(...ys)-Math.min(...ys)+4);}
 else{x.globalAlpha=.85;for(const g of C.greens){if(g.water)continue;const pad=6;x.beginPath();x.rect(g.box[0]-pad,g.box[1]-pad,g.box[2]-g.box[0]+pad*2,g.box[3]-g.box[1]+pad*2);x.fill();}x.globalAlpha=1;}
 const greens=C.greens.slice().sort((a,b)=>(a.water?-1:0)-(b.water?-1:0)||(a.a-b.a)||a.i-b.i);
 const waters=C.greens.filter(g=>g.water);
 // shadows of rails/blocks on the lawn: a soft dark band round every green
 x.setTransform(...lawnA);x.fillStyle='rgba(0,0,0,.22)';for(const g of greens){if(g.water)continue;x.beginPath();g.pts.forEach((p,i)=>i?x.lineTo(p[0]+.9,p[1]+1.3):x.moveTo(p[0]+.9,p[1]+1.3));x.closePath();x.fill();}
 for(const g of greens){
  // skirt (the bed's side facing us)
  if(!g.water){x.setTransform(1,0,0,1,0,0);for(const e of g.edges){if(e.same||vOf(cam,e.nx,e.ny)<=.02)continue;const mx=(e.x1+e.x2)/2+e.nx*.5,my=(e.y1+e.y2)/2+e.ny*.5,below=C.topAt(mx,my);const zb=below&&below.z<Math.min(e.z1,e.z2)-.05?below.z:LAWN_Z;
    const a=proj(cam,W,H,e.x1,e.y1,e.z1),b=proj(cam,W,H,e.x2,e.y2,e.z2),c=proj(cam,W,H,e.x2,e.y2,zb),d=proj(cam,W,H,e.x1,e.y1,zb);if(Math.max(c[1],d[1])-Math.min(a[1],b[1])<.5)continue;
    faceQuad(x,a,b,c,d,pattern(x,`${cid}-cliff|${cid}`,look,24),e.x1,e.y1,e.x2,e.y2,cam,W,H);}}
  // top
  const A=aff(cam,W,H,g.a,g.b,g.c);x.setTransform(...A);x.beginPath();g.pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();
  if(!g.water&&!g.bridge)for(const w of waters){w.pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();}
  x.save();x.clip('evenodd');
  const tkey=g.water?(look.space?'water-space':'water'):g.bridge?'bridge':g.type==='turf'?`${cid}-turf`:g.type==='carpet'?'carpet':g.type==='rough'?`${cid}-lawn`:g.type;
  x.fillStyle=pattern(x,tkey+'|'+cid,look,tileWorld(tkey));x.fillRect(g.box[0]-1,g.box[1]-1,g.box[2]-g.box[0]+2,g.box[3]-g.box[1]+2);
  if(g.water){x.globalAlpha=.25;x.strokeStyle='#fff';x.lineWidth=.35;for(let i=0;i<6;i++){const yy=g.box[1]+((i*7+st.T*2.5)%(g.box[3]-g.box[1]+4));x.beginPath();for(let xx=g.box[0];xx<=g.box[2];xx+=2)x.lineTo(xx,yy+Math.sin(xx*.4+st.T*2+i)*.5);x.stroke();}x.globalAlpha=1;}
  if(g.type==='out'){x.globalAlpha=.9;x.translate((g.box[0]+g.box[2])/2,(g.box[1]+g.box[3])/2);for(let i=0;i<3;i++){x.rotate(st.T*1.4+i*2.1);x.strokeStyle=['#8a4dff','#ff4dd2','#4dc3ff'][i];x.lineWidth=.6;x.beginPath();for(let a=0;a<9;a+=.3)x.lineTo(Math.cos(a)*a*.6,Math.sin(a)*a*.6);x.stroke();}x.globalAlpha=1;}
  if(!g.water){const sh=shadeCanvas(g);if(sh)x.drawImage(sh.c,sh.x0,sh.y0,sh.c.width/sh.K,sh.c.height/sh.K);
   // fringe: a darker band just inside every railed edge
   x.lineWidth=1.6;x.strokeStyle='rgba(0,30,0,.18)';for(const e of g.edges){if(e.same)continue;x.beginPath();x.moveTo(e.x1,e.y1);x.lineTo(e.x2,e.y2);x.stroke();}}
  x.restore();
  // water banks: the far side of a pond (its wall faces us)
  if(!g.water&&!g.bridge)for(const w of waters){if(!w.pts.some(p=>P.inPoly(g.pts,p[0],p[1])))continue;x.setTransform(1,0,0,1,0,0);const p=w.pts;
   for(let i=0;i<p.length;i++){const a0=p[i],b0=p[(i+1)%p.length],ex=b0[0]-a0[0],ey=b0[1]-a0[1],L=Math.hypot(ex,ey)||1;let nx=ey/L,ny=-ex/L;if(P.inPoly(p,(a0[0]+b0[0])/2+nx*.05,(a0[1]+b0[1])/2+ny*.05)){nx=-nx;ny=-ny;}
    if(vOf(cam,nx,ny)>=-.02)continue;const a=proj(cam,W,H,a0[0],a0[1],g.a),b=proj(cam,W,H,b0[0],b0[1],g.a),c=proj(cam,W,H,b0[0],b0[1],w.a),d=proj(cam,W,H,a0[0],a0[1],w.a);
    x.fillStyle=look.space?'#2a1a50':'#5c4630';x.beginPath();x.moveTo(...a);x.lineTo(...b);x.lineTo(...c);x.lineTo(...d);x.closePath();x.fill();x.fillStyle='rgba(0,0,0,.25)';x.fill();}
   if(w.pool){x.setTransform(...A);x.strokeStyle='#f4f1ea';x.lineWidth=1.4;x.beginPath();w.pts.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();x.stroke();}}
 }
 // ground things: boost pads, conveyors, tunnel mouths, tramps, gopher holes, the cup, lost ball
 groundThings(x,W,H,cam,st);
 if(st.trail&&st.trail.pts.length>1){const t=st.trail.pts;x.setTransform(1,0,0,1,0,0);x.lineCap='round';for(let i=1;i<t.length;i++){const a=proj(cam,W,H,t[i-1][0],t[i-1][1],t[i-1][2]),b=proj(cam,W,H,t[i][0],t[i][1],t[i][2]);x.strokeStyle=st.trail.col;x.globalAlpha=.5*i/t.length;x.lineWidth=Math.max(2,cam.k*1.1*i/t.length);x.beginPath();x.moveTo(...a);x.lineTo(...b);x.stroke();}x.globalAlpha=1;}
 // sorted standing things
 const items=[];const key=(X,Y)=>Y;
 for(const g of C.greens){if(g.water)continue;for(const e of g.edges){if(!e.rail)continue;const L=Math.hypot(e.x2-e.x1,e.y2-e.y1),n=Math.max(1,Math.ceil(L/7));for(let k=0;k<n;k++){const f0=k/n,f1=(k+1)/n,seg={x1:e.x1+(e.x2-e.x1)*f0,y1:e.y1+(e.y2-e.y1)*f0,x2:e.x1+(e.x2-e.x1)*f1,y2:e.y1+(e.y2-e.y1)*f1,z1:e.z1+(e.z2-e.z1)*f0,z2:e.z1+(e.z2-e.z1)*f1,nx:e.nx,ny:e.ny,h:g.rail};
   const y1=proj(cam,W,H,seg.x1+seg.nx*RAIL_W*.5,seg.y1+seg.ny*RAIL_W*.5,seg.z1)[1],y2=proj(cam,W,H,seg.x2+seg.nx*RAIL_W*.5,seg.y2+seg.ny*RAIL_W*.5,seg.z2)[1];items.push({y:Math.max(y1,y2)-.01,f:()=>drawRail(x,W,H,cam,seg,cid,look)});}}}
 for(const b of C.blocks){if(b.look==='mill'||b.look==='clown')continue;let my=-1e9;for(const p of b.pts)my=Math.max(my,proj(cam,W,H,p[0],p[1],b.base)[1]);items.push({y:my,f:()=>drawBlock(x,W,H,cam,b.pts,b.base,b.top,b.look,look)});}
 for(const m of C.movers)moverItems(x,W,H,cam,st,m,items);
 for(const [i,p] of C.bumpers.entries()){const y=proj(cam,W,H,p.x,p.y+p.r,p.z)[1];items.push({y,f:()=>drawBumper(x,W,H,cam,p,st.T-(st.hit&&st.hit['b'+i]||-9))});}
 for(const m of C.magnets){const g=C.topAt(m.x,m.y),z=g?g.z:0;const [X,Y]=proj(cam,W,H,m.x,m.y-6,z);items.push({y:Y,f:()=>drawProp(x,'magnet',X,Y,18*cam.k,{t:st.T})});}
 for(const d of decorFor(C,look,cam.rot)){const g=C.topAt(d.x,d.y),z=g?g.z:LAWN_Z;const [X,Y]=proj(cam,W,H,d.x,d.y,z);if(X<-d.w*cam.k*1.2||X>W+d.w*cam.k*1.2||Y<-10||Y>H+d.w*cam.k*2.5)continue;items.push({y:Y,f:()=>drawProp(x,d.k==='flag-sign'?'sign':d.k,X,Y,d.w*cam.k,{t:st.T,text:d.text})});}
 {const cz=C.cupZ,[X,Y]=proj(cam,W,H,C.hole.cup[0],C.hole.cup[1],cz);items.push({y:Y+.02,f:()=>{if(st.flag===0)return;x.globalAlpha=st.flag??1;drawProp(x,'flag',X,Y,3.4*cam.k,{t:st.T,col:look.space?'#ffd23f':'#ff3b5c'});x.globalAlpha=1;}});}
 for(const bb of st.balls){if(bb.hidden)continue;const b=bb.b,gr=C.topAt(b.x,b.y),gz=b.air?(C.ground(b.x,b.y,b.z+.05)||{z:LAWN_Z}).z:b.z;const [X,Y]=proj(cam,W,H,b.x,b.y,gz);items.push({y:Y+.05,f:()=>drawBall(x,W,H,cam,bb,gz,gr)});}
 items.sort((a,b)=>a.y-b.y);for(const it of items)it.f();
 // particles
 x.setTransform(1,0,0,1,0,0);for(const p of st.fx||[]){const [X,Y]=proj(cam,W,H,p.x,p.y,p.z);const r=Math.max(1,p.s*cam.k);x.globalAlpha=Math.max(0,Math.min(1,p.life/p.max*1.5));x.fillStyle=p.col;if(p.kind==='confetti'){x.save();x.translate(X,Y);x.rotate(p.r);x.fillRect(-r,-r*.4,r*2,r*.8);x.restore();}else{x.beginPath();x.arc(X,Y,r,0,7);x.fill();}}x.globalAlpha=1;
}
function drawStars(x,W,H,cam,T){const R=rnd(77);for(let i=0;i<160;i++){const px=R(),py=R(),d=.15+R()*.5,X=((px*W*2-cam.x*cam.k*d*.2)%W+W)%W,Y=((py*H*2-cam.y*cam.k*d*.2)%H+H)%H,tw=.5+.5*Math.sin(T*2+i);x.fillStyle=`rgba(255,255,255,${(.35+d)*tw})`;x.fillRect(X,Y,d*3,d*3);}
 const g=x.createRadialGradient(W*.8,H*.2,10,W*.8,H*.2,W*.5);g.addColorStop(0,'rgba(140,60,255,.25)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
 x.fillStyle='#e8a04a';x.beginPath();x.arc(W*.12,H*.18,Math.min(W,H)*.07,0,7);x.fill();x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.arc(W*.12+Math.min(W,H)*.025,H*.18,Math.min(W,H)*.07,0,7);x.fill();}
// fill the screen quad a,b,c,d with a strip pattern running along the world edge (x1,y1)->(x2,y2)
function faceQuad(x,a,b,c,d,pat,x1,y1,x2,y2,cam,W,H){
 const L=Math.hypot(x2-x1,y2-y1)||1,ux=(b[0]-a[0])/L,uy=(b[1]-a[1])/L,hy=TS*cam.k;
 x.save();x.beginPath();x.moveTo(...a);x.lineTo(...b);x.lineTo(...c);x.lineTo(...d);x.closePath();x.clip();x.setTransform(ux,uy,0,hy,a[0],a[1]);x.fillStyle=pat;x.fillRect(-2,-20,L+4,60);x.setTransform(1,0,0,1,0,0);
 const g=x.createLinearGradient(0,Math.min(a[1],b[1]),0,Math.max(c[1],d[1]));g.addColorStop(0,'rgba(0,0,0,.05)');g.addColorStop(1,'rgba(0,0,0,.4)');x.fillStyle=g;x.fillRect(Math.min(a[0],b[0],c[0],d[0]),Math.min(a[1],b[1]),Math.abs(b[0]-a[0])+Math.abs(c[0]-d[0])+4,Math.max(c[1],d[1])-Math.min(a[1],b[1])+2);x.restore();
}
function drawRail(x,W,H,cam,s,cid,look){
 const w=RAIL_W,ox=s.nx*w,oy=s.ny*w,t1=s.z1+s.h,t2=s.z2+s.h;
 const iA=proj(cam,W,H,s.x1,s.y1,t1),iB=proj(cam,W,H,s.x2,s.y2,t2),oA=proj(cam,W,H,s.x1+ox,s.y1+oy,t1),oB=proj(cam,W,H,s.x2+ox,s.y2+oy,t2);
 const v=vOf(cam,s.nx,s.ny),side=pattern(x,`${cid}-rail|${cid}`,look,24);
 if(v<-.02){const a=iA,b=iB,c=proj(cam,W,H,s.x2,s.y2,s.z2),d=proj(cam,W,H,s.x1,s.y1,s.z1);faceQuad(x,a,b,c,d,side,s.x1,s.y1,s.x2,s.y2,cam,W,H);}
 else if(v>.02){const a=oA,b=oB,c=proj(cam,W,H,s.x2+ox,s.y2+oy,LAWN_Z),d=proj(cam,W,H,s.x1+ox,s.y1+oy,LAWN_Z);faceQuad(x,a,b,c,d,side,s.x1,s.y1,s.x2,s.y2,cam,W,H);}
 // top
 x.save();x.beginPath();x.moveTo(...iA);x.lineTo(...iB);x.lineTo(...oB);x.lineTo(...oA);x.closePath();x.fillStyle=pattern(x,`${cid}-railtop|${cid}`,look,24);
 const L=Math.hypot(s.x2-s.x1,s.y2-s.y1)||1,ux=(iB[0]-iA[0])/L,uy=(iB[1]-iA[1])/L,vx=(oA[0]-iA[0])/w,vy=(oA[1]-iA[1])/w;x.clip();x.setTransform(ux,uy,vx,vy,iA[0],iA[1]);x.fillRect(-2,-2,L+4,w+4);x.restore();
 x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=Math.max(1,cam.k*.12);x.beginPath();x.moveTo(...iA);x.lineTo(...iB);x.stroke();
}
function drawBlock(x,W,H,cam,pts,base,top,lk,look){
 const cols=lk==='brick'?['#b5452f','#8a2f1f']:lk==='log'?['#9a6a3a','#6d4524']:look.space?['#aab2c4','#6b7388']:['#c8a070','#8a6a40'];
 for(let i=0;i<pts.length;i++){const A=pts[i],B=pts[(i+1)%pts.length],ex=B[0]-A[0],ey=B[1]-A[1],L=Math.hypot(ex,ey)||1;let nx=ey/L,ny=-ex/L;if(P.inPoly(pts,(A[0]+B[0])/2+nx*.05,(A[1]+B[1])/2+ny*.05)){nx=-nx;ny=-ny;}
  if(vOf(cam,nx,ny)<=.02)continue;const a=proj(cam,W,H,A[0],A[1],top),b=proj(cam,W,H,B[0],B[1],top),c=proj(cam,W,H,B[0],B[1],base),d=proj(cam,W,H,A[0],A[1],base);x.fillStyle=cols[1];x.beginPath();x.moveTo(...a);x.lineTo(...b);x.lineTo(...c);x.lineTo(...d);x.closePath();x.fill();
  if(lk==='brick'){x.save();x.clip();x.strokeStyle='rgba(255,220,200,.25)';x.lineWidth=1;const hh=Math.abs(d[1]-a[1]);for(let r=1;r<4;r++){x.beginPath();x.moveTo(a[0],a[1]+hh*r/4);x.lineTo(b[0],b[1]+hh*r/4);x.stroke();}x.restore();}}
 const A=aff(cam,W,H,top);x.setTransform(...A);x.fillStyle=cols[0];x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fill();x.strokeStyle='rgba(255,255,255,.3)';x.lineWidth=.3;x.stroke();x.setTransform(1,0,0,1,0,0);
}
function drawBumper(x,W,H,cam,p,since){
 const flash=Math.max(0,1-since*4),[X,Y]=proj(cam,W,H,p.x,p.y,p.z),r=p.r*cam.k,h=2.2*TS*cam.k,img=S.picture('bumper');
 x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(X+r*.15,Y+r*.15,r*1.05,r*TC*1.05,0,0,7);x.fill();
 if(img){x.drawImage(img,X-r*1.05,Y-h-r*TC*1.05,r*2.1,r*2.1*TC);}
 else{x.fillStyle='#c0c6d2';x.fillRect(X-r,Y-h,r*2,h);x.beginPath();x.ellipse(X,Y,r,r*TC,0,0,Math.PI);x.fill();
  const g=x.createRadialGradient(X-r*.3,Y-h-r*.3,r*.1,X,Y-h,r);g.addColorStop(0,flash>0?'#fff':'#ff8ab0');g.addColorStop(1,flash>0?'#ffe14d':'#d81b60');x.fillStyle=g;x.beginPath();x.ellipse(X,Y-h,r,r*TC,0,0,7);x.fill();
  x.strokeStyle='#fff';x.lineWidth=Math.max(1,r*.12);x.beginPath();x.ellipse(X,Y-h,r*.6,r*.6*TC,0,0,7);x.stroke();}
 if(flash>0){x.fillStyle=`rgba(255,240,150,${flash*.5})`;x.beginPath();x.ellipse(X,Y-h,r*(1.3+flash),r*TC*(1.3+flash),0,0,7);x.fill();}
}
function flat(x,W,H,cam,name,cx,cy,z,w,ang,fb){
 // a picture lying on the ground centred on (cx,cy), w units across, turned by ang (radians, in world)
 const A=aff(cam,W,H,z);x.setTransform(...A);x.translate(cx,cy);if(ang)x.rotate(ang);
 const img=S.picture(name),def=S.PICTURES[name];
 if(img&&def){const fw=def.frame?def.frame[0]:def.size[0],fh=def.frame?def.frame[1]:def.size[1],k=img.width/def.size[0],h=w*fh/fw,f=fb&&fb.frame||0;x.drawImage(img,f*fw*k,0,fw*k,fh*k,-w/2,-h/2,w,h);}
 else if(fb&&fb.draw)fb.draw(x);
 x.setTransform(1,0,0,1,0,0);
}
function groundThings(x,W,H,cam,st){
 const {C,T}=st;
 for(const b of C.boost){const g=C.topAt((b.box[0]+b.box[2])/2,(b.box[1]+b.box[3])/2),z=g?g.z:0,cx=(b.box[0]+b.box[2])/2,cy=(b.box[1]+b.box[3])/2,w=b.box[2]-b.box[0],h=b.box[3]-b.box[1],ang=Math.atan2(b.dir[1],b.dir[0])+Math.PI/2;
  flat(x,W,H,cam,'boost',cx,cy,z+.02,Math.max(w,h),ang,{draw:g2=>{g2.fillStyle='rgba(20,10,60,.85)';g2.fillRect(-w/2,-h/2,w,h);for(let i=0;i<4;i++){const f=((T*2.5+i/4)%1);g2.fillStyle=`hsla(${(T*200+i*40)%360},100%,60%,${.4+.6*(1-f)})`;const yy=h/2-f*h;g2.beginPath();g2.moveTo(-w*.35,yy+2);g2.lineTo(0,yy-1.5);g2.lineTo(w*.35,yy+2);g2.lineTo(w*.35,yy+3.2);g2.lineTo(0,yy-.3);g2.lineTo(-w*.35,yy+3.2);g2.fill();}g2.strokeStyle='#57e1ff';g2.lineWidth=.4;g2.strokeRect(-w/2,-h/2,w,h);}});}
 for(const c of C.conv){const g=C.topAt(c.pts[0][0]+.5,c.pts[0][1]+.5),z=g?g.z:0;const A=aff(cam,W,H,z+.02);x.setTransform(...A);x.beginPath();c.pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.save();x.clip();const pat=pattern(x,'conveyor|'+st.course.id,st.course.look,12),sp=Math.hypot(c.v[0],c.v[1]),off=(T*sp)%12;x.translate(0,c.v[1]<0?-off:off);x.fillStyle=pat;x.fillRect(c.box[0]-1,c.box[1]-13,c.box[2]-c.box[0]+2,c.box[3]-c.box[1]+26);x.restore();x.setTransform(1,0,0,1,0,0);}
 for(const t of C.tunnels){const sp=st.course.look.space;for(const [p,z,s] of [[t.a,t.z,1],[t.b,t.zb,.7]])flat(x,W,H,cam,sp?'portal':'tunnel',p[0],p[1],z+.02,7*s,0,{draw:g=>{if(sp){for(let i=0;i<3;i++){g.strokeStyle=['#ff4dd2','#57e1ff','#ffe14d'][i];g.lineWidth=.5;g.beginPath();g.arc(0,0,2.9-i*.6+Math.sin(T*4+i)*.2,0,7);g.stroke();}g.fillStyle='#000';g.beginPath();g.arc(0,0,1.9,0,7);g.fill();}else{g.fillStyle='#6b7280';g.beginPath();g.arc(0,0,3.1,0,7);g.fill();g.fillStyle='#111';g.beginPath();g.arc(0,0,2.4,0,7);g.fill();g.fillStyle='rgba(255,255,255,.2)';g.beginPath();g.arc(0,0,3.1,3.6,5.2);g.lineTo(0,0);g.fill();}}});}
 for(const t of C.tramps)flat(x,W,H,cam,'tramp',t.x,t.y,t.z+.05,t.r*2.3,0,{draw:g=>{g.fillStyle='#333';g.beginPath();g.arc(0,0,t.r*1.12,0,7);g.fill();g.fillStyle='#2d7dff';g.beginPath();g.arc(0,0,t.r*.9,0,7);g.fill();g.strokeStyle='#ffd23f';g.lineWidth=.3;for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.beginPath();g.moveTo(Math.cos(a)*t.r*.9,Math.sin(a)*t.r*.9);g.lineTo(Math.cos(a)*t.r*1.1,Math.sin(a)*t.r*1.1);g.stroke();}}});
 for(const [mi,m] of C.movers.entries())if(m.kind==='gophers')for(const h of m.holes){const g=C.topAt(h[0],h[1]),z=g?g.z:0;flat(x,W,H,cam,'gopher-hole',h[0],h[1],z+.02,4,0,{draw:g2=>{g2.fillStyle='#6b4a2a';g2.beginPath();g2.ellipse(0,0,2,1.7,0,0,7);g2.fill();g2.fillStyle='#1a0f06';g2.beginPath();g2.ellipse(0,0,1.25,1.05,0,0,7);g2.fill();}});}
 // cup
 const cz=C.cupZ;flat(x,W,H,cam,'cup',C.hole.cup[0],C.hole.cup[1],cz+.01,P.CUP_R*2.4,0,{draw:g=>{g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(0,0,P.CUP_R+.35,0,7);g.fill();g.fillStyle='#0a0a0a';g.beginPath();g.arc(0,0,P.CUP_R,0,7);g.fill();g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.arc(0,P.CUP_R*.35,P.CUP_R*.7,3.3,6.1);g.fill();}});
 if(st.lost&&!st.lostFound){const [lx,ly]=st.lost,g=C.topAt(lx,ly),z=g?g.z:0,tw=.6+.4*Math.sin(T*6);flat(x,W,H,cam,'lost-ball',lx,ly,z+.03,3,0,{draw:g2=>{g2.fillStyle=`rgba(255,230,120,${.25*tw})`;g2.beginPath();g2.arc(0,0,2.6,0,7);g2.fill();g2.fillStyle='#ddd6c4';g2.beginPath();g2.arc(0,0,1,0,7);g2.fill();g2.fillStyle='rgba(120,90,40,.5)';g2.beginPath();g2.arc(.3,.2,.4,0,7);g2.fill();}});}
}
function moverItems(x,W,H,cam,st,m,items){
 const {C,T}=st,parts=st.parts||{segs:[],hazards:[]};
 if(m.kind==='windmill'){const [hx,hy,hw,hh]=m.house,cx=hx+hw/2,fy=hy+hh,g=C.topAt(cx,fy-1),z=g?g.z:0,[X,Y]=proj(cam,W,H,cx,fy,z),k=cam.k;
  items.push({y:Y,f:()=>{drawWindmill(x,X,Y,k,hw,m,T);}});}
 else if(m.kind==='slider'){const per=m.period||3,f=.5-.5*Math.cos((T/per+(m.ph||0))*Math.PI*2),pts=m.pts.map(p=>[p[0]+m.a[0]*f,p[1]+m.a[1]*f]),g=C.topAt(pts[0][0],pts[0][1]),base=g?g.z:0;let my=-1e9;for(const p of pts)my=Math.max(my,proj(cam,W,H,p[0],p[1],base)[1]);
  items.push({y:my,f:()=>drawBlock(x,W,H,cam,pts,base,base+2.6,'slider',st.course.look)});}
 else if(m.kind==='spinner'){const g=C.topAt(m.x,m.y),z=g?g.z:0,[,Y]=proj(cam,W,H,m.x,m.y,z),a=T*(m.speed||1.5)+(m.ph||0);
  items.push({y:Y,f:()=>{const c=Math.cos(a)*m.len,s=Math.sin(a)*m.len,w=.9;const pts=[[m.x-c-s/m.len*w,m.y-s+c/m.len*w],[m.x+c-s/m.len*w,m.y+s+c/m.len*w],[m.x+c+s/m.len*w,m.y+s-c/m.len*w],[m.x-c+s/m.len*w,m.y-s-c/m.len*w]];drawBlock(x,W,H,cam,pts,z,z+2,'spin',st.course.look);
   const [X2,Y2]=proj(cam,W,H,m.x,m.y,z+2);x.fillStyle='#ffd23f';x.beginPath();x.arc(X2,Y2,Math.max(2,cam.k*1.1),0,7);x.fill();}});}
 else if(m.kind==='gate'){const shut=parts.segs.some(s=>s.kind==='gate'&&Math.abs(s.x1-m.a[0])<.01&&Math.abs(s.y1-m.a[1])<.01),g=C.topAt(m.a[0],m.a[1]-2),z=g?g.z:0;
  if(m.look==='teeth'){const blk=C.blocks.find(b=>b.look==='clown');const cx=(m.a[0]+m.b[0])/2,[X,Y]=proj(cam,W,H,cx,blk?blk.box[3]:m.a[1],z);items.push({y:Y,f:()=>drawClown(x,X,Y,cam.k,blk?blk.box[2]-blk.box[0]:22,shut,T)});}
  else{const [,Y]=proj(cam,W,H,m.a[0],m.a[1],z);items.push({y:Y,f:()=>{if(!shut)return;const pts=[[m.a[0],m.a[1]-.5],[m.b[0],m.b[1]-.5],[m.b[0],m.b[1]+.5],[m.a[0],m.a[1]+.5]];drawBlock(x,W,H,cam,pts,z,z+2.2,'gate',st.course.look);}});}}
 else if(m.kind==='gator'){const p=P.gatorAt(m,T),g=C.topAt(p.x,p.y),z=g?g.z:0,[,Y]=proj(cam,W,H,p.x,p.y,z);
  items.push({y:Y,f:()=>{flat(x,W,H,cam,'gator',p.x,p.y,z+.3,16,p.ang,{frame:Math.floor(T*4)%2,draw:g2=>drawGator(g2,T)});}});}
 else if(m.kind==='gophers'){const mi=C.movers.indexOf(m),go=P.gopherAt(m,T,mi);if(go.up>0){const g=C.topAt(go.x,go.y),z=g?g.z:0,[X,Y]=proj(cam,W,H,go.x,go.y,z);items.push({y:Y+.1,f:()=>drawGopher(x,X,Y,cam.k,go.up)});}}
}
function drawWindmill(x,X,Y,k,hw,m,T){
 const W2=hw*k,img=S.picture('windmill-house'),bl=S.picture('windmill-blades');
 if(img){const d=S.PICTURES['windmill-house'],sc=W2/img.width;x.drawImage(img,X-d.foot[0]/d.size[0]*img.width*sc,Y-d.foot[1]/d.size[1]*img.height*sc,img.width*sc,img.height*sc);}
 else{const h=W2*.9;x.fillStyle='#b9874f';x.beginPath();x.moveTo(X-W2*.5,Y);x.lineTo(X-W2*.38,Y-h);x.lineTo(X+W2*.38,Y-h);x.lineTo(X+W2*.5,Y);x.closePath();x.fill();x.fillStyle='rgba(0,0,0,.15)';for(let i=1;i<6;i++){x.fillRect(X-W2*.46+i*0,Y-h*i/6,W2*.92,1.2);}
  x.fillStyle='#8a2f2a';x.beginPath();x.moveTo(X-W2*.46,Y-h);x.lineTo(X,Y-h-W2*.42);x.lineTo(X+W2*.46,Y-h);x.fill();
  const dw=m.w*k;x.fillStyle='#1a0f08';x.beginPath();x.moveTo(X-dw/2,Y);x.lineTo(X-dw/2,Y-dw*.8);x.arc(X,Y-dw*.8,dw/2,Math.PI,0);x.lineTo(X+dw/2,Y);x.fill();
  x.fillStyle='#ffe9a0';x.fillRect(X-W2*.25,Y-h*.62,W2*.12,W2*.12);x.fillRect(X+W2*.13,Y-h*.62,W2*.12,W2*.12);}
 const hubY=Y-(m.r+1)*k,a=T*(m.speed||1.4)+(m.ph||0),n=m.blades||4,R=m.r*k;
 x.save();x.translate(X,hubY);
 if(bl){const sc=(m.r*2.2*k)/img_w(bl);x.rotate(a-Math.PI/2);x.drawImage(bl,-bl.width*sc/2,-bl.height*sc/2,bl.width*sc,bl.height*sc);}
 else for(let i=0;i<n;i++){x.save();x.rotate(a+i*Math.PI*2/n);x.fillStyle='#6b4423';x.fillRect(0,-R*.03,R,R*.06);x.fillStyle='rgba(245,240,225,.95)';x.fillRect(R*.18,R*.04,R*.82,R*.2);x.strokeStyle='#6b4423';x.lineWidth=Math.max(1,R*.015);for(let j=1;j<5;j++){x.beginPath();x.moveTo(R*(.18+j*.164),R*.04);x.lineTo(R*(.18+j*.164),R*.24);x.stroke();}x.restore();}
 x.fillStyle='#3a2a1a';x.beginPath();x.arc(0,0,Math.max(3,R*.08),0,7);x.fill();x.restore();
}
const img_w=im=>im.width||im.naturalWidth||1;
function drawClown(x,X,Y,k,wU,shut,T){
 const W2=wU*k,img=S.picture('clown-head'),tt=S.picture('clown-teeth'),mw=9.5*k;
 if(img){const d=S.PICTURES['clown-head'],sc=W2/img.width;x.drawImage(img,X-d.foot[0]/d.size[0]*img.width*sc,Y-d.foot[1]/d.size[1]*img.height*sc,img.width*sc,img.height*sc);}
 else{const r=W2*.5,cy=Y-r*1.05;x.fillStyle='#ff6fa8';x.beginPath();x.arc(X-r*.95,cy-r*.45,r*.4,0,7);x.arc(X+r*.95,cy-r*.45,r*.4,0,7);x.fill();
  x.fillStyle='#fff3e4';x.beginPath();x.arc(X,cy,r,0,7);x.fill();x.fillStyle='#ff2d55';x.beginPath();x.arc(X,cy-r*.05,r*.16,0,7);x.fill();
  for(const s of [-1,1]){x.fillStyle='#111';x.beginPath();x.ellipse(X+s*r*.38,cy-r*.38,r*.1,r*.14,0,0,7);x.fill();x.fillStyle='#4da6ff';x.beginPath();x.moveTo(X+s*r*.38,cy-r*.62);x.lineTo(X+s*r*.3,cy-r*.75);x.lineTo(X+s*r*.46,cy-r*.75);x.fill();}
  x.fillStyle='#ffd23f';x.beginPath();x.moveTo(X-r*.45,cy-r*.85);x.lineTo(X,cy-r*1.75);x.lineTo(X+r*.45,cy-r*.85);x.fill();x.fillStyle='#ff2d55';x.beginPath();x.arc(X,cy-r*1.75,r*.1,0,7);x.fill();
  x.fillStyle='#c4002f';x.beginPath();x.moveTo(X-mw/2-r*.12,Y-r*.08);x.quadraticCurveTo(X,Y-r*.75,X+mw/2+r*.12,Y-r*.08);x.lineTo(X+mw/2,Y);x.lineTo(X-mw/2,Y);x.fill();x.fillStyle='#0b0b0b';x.beginPath();x.moveTo(X-mw/2,Y);x.quadraticCurveTo(X,Y-r*.58,X+mw/2,Y);x.fill();}
 // teeth: down = shut
 const ty=shut?Y-1:Y-mw*.55;x.fillStyle='#fffdf2';x.strokeStyle='#333';x.lineWidth=1;
 if(tt){const sc=mw/tt.width;x.drawImage(tt,X-mw/2,ty-tt.height*sc,mw,tt.height*sc);}else{for(let i=0;i<5;i++){const tx=X-mw/2+i*mw/5;x.beginPath();x.moveTo(tx,ty-mw*.32);x.lineTo(tx+mw/5,ty-mw*.32);x.lineTo(tx+mw/10,ty);x.closePath();x.fill();x.stroke();}}
}
function drawGator(g,T){const w=Math.sin(T*8)*.5;g.fillStyle='#3d7a34';g.beginPath();g.ellipse(0,0,5,1.8,0,0,7);g.fill();g.beginPath();g.moveTo(-4,0);g.quadraticCurveTo(-7,w*2,-8,w*3);g.lineTo(-4,1);g.fill();g.fillStyle='#4f9a44';g.beginPath();g.moveTo(4,-1.3);g.lineTo(8,-.6);g.lineTo(8,.6);g.lineTo(4,1.3);g.fill();for(const [lx,ly] of [[2.5,-1.8],[2.5,1.8],[-2.5,-1.8],[-2.5,1.8]]){g.fillStyle='#2f6228';g.beginPath();g.ellipse(lx+w*.3,ly*1.25,.8,.5,0,0,7);g.fill();}g.fillStyle='#ffe14d';g.beginPath();g.arc(5,-.8,.35,0,7);g.arc(5,.8,.35,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=.15;g.beginPath();for(let i=0;i<5;i++){g.moveTo(5.4+i*.5,-.6);g.lineTo(5.6+i*.5,-.3);}g.stroke();}
function drawGopher(x,X,Y,k,up){const img=S.picture('gopher'),w=5*k;if(img){const d=S.PICTURES.gopher,f=up<.5?0:up<.9?1:2,fw=img.width/3;x.drawImage(img,f*fw,0,fw,img.height,X-w/2,Y-w*(d.foot[1]/d.frame[1]),w,w);return;}
 const h=w*1.1*up;x.save();x.beginPath();x.rect(X-w,Y-w*2,w*2,w*2);x.clip();x.fillStyle='#8a6232';x.beginPath();x.ellipse(X,Y-h*.55,w*.32,h*.6,0,0,7);x.fill();x.fillStyle='#c9a06a';x.beginPath();x.ellipse(X,Y-h*.45,w*.18,h*.35,0,0,7);x.fill();
 x.fillStyle='#000';x.beginPath();x.arc(X-w*.1,Y-h*.9,w*.05,0,7);x.arc(X+w*.1,Y-h*.9,w*.05,0,7);x.fill();x.fillStyle='#fff';x.fillRect(X-w*.06,Y-h*.75,w*.12,w*.09);x.fillStyle='#3a2210';x.beginPath();x.arc(X,Y-h*.82,w*.05,0,7);x.fill();x.restore();}

// the ball: shadow on the ground, then a white golf ball with the player's face printed on it (the face rolls with the ball)
function drawBall(x,W,H,cam,bb,gz,gr){
 const b=bb.b,k=cam.k,r=Math.max(5.5,P.BALL_R*k*(bb.vis||1));
 const [sx,sy]=proj(cam,W,H,b.x,b.y,gz),[X,Y]=proj(cam,W,H,b.x,b.y,b.z+P.BALL_R*(bb.vis||1)-(bb.sinkDip||0));
 const air=Math.max(0,b.z-gz);x.fillStyle=`rgba(0,0,0,${Math.max(.12,.35-air*.02)})`;x.beginPath();x.ellipse(sx+r*.25,sy+r*.15,r*(1+air*.03),r*TC*(1+air*.03),0,0,7);x.fill();
 if(bb.sinkDip){x.save();const [cx,cy]=proj(cam,W,H,bb.cup[0],bb.cup[1],gz);x.beginPath();x.rect(0,0,W,cy+P.CUP_R*TC*k*.2);x.clip();}
 x.globalAlpha=bb.ghost?.55:1;
 if(bb.glow){x.save();x.shadowColor=bb.col;x.shadowBlur=14;x.fillStyle='#fff';x.beginPath();x.arc(X,Y,r,0,7);x.fill();x.restore();}
 const img=S.picture('ball');
 if(img)x.drawImage(img,X-r,Y-r,r*2,r*2);else{const g=x.createRadialGradient(X-r*.35,Y-r*.4,r*.1,X,Y,r);g.addColorStop(0,'#ffffff');g.addColorStop(.7,'#eef0f2');g.addColorStop(1,'#b9bec6');x.fillStyle=g;x.beginPath();x.arc(X,Y,r,0,7);x.fill();}
 // face decal on the sphere
 const o=bb.orient;if(bb.face&&o&&o.n[2]>.05){const n=o.n,su=cam.rot?-n[1]:n[0],sv=cam.rot?n[0]:n[1];const ox=su*r*.95,oy=sv*r*.95*TC,th=Math.atan2(oy,ox),fz=n[2];
  x.save();x.beginPath();x.arc(X,Y,r*.98,0,7);x.clip();x.translate(X+ox*.85,Y+oy*.85);x.rotate(th);x.scale(Math.max(.15,fz),1);x.rotate(-th);
  const ua=cam.rot?Math.atan2(o.u[0],-o.u[1]):Math.atan2(o.u[1],o.u[0]);x.rotate(ua+Math.PI/2);bb.face(x,0,0,r*1.75);x.restore();
  x.save();x.beginPath();x.arc(X,Y,r,0,7);x.clip();const g2=x.createRadialGradient(X-r*.35,Y-r*.4,r*.2,X,Y,r*1.05);g2.addColorStop(0,'rgba(255,255,255,.22)');g2.addColorStop(.6,'rgba(255,255,255,0)');g2.addColorStop(1,'rgba(0,0,0,.28)');x.fillStyle=g2;x.fillRect(X-r,Y-r,r*2,r*2);x.restore();}
 x.strokeStyle=bb.col;x.lineWidth=Math.max(1.5,r*.16);x.beginPath();x.arc(X,Y,r,0,7);x.stroke();
 x.globalAlpha=1;if(bb.sinkDip)x.restore();
}
// roll the face decal: rotate the decal's normal n and up vector u about the axis lying flat and square to the motion
function rollOrient(o,dx,dy){const d=Math.hypot(dx,dy);if(d<1e-6)return;const ang=d/P.BALL_R,ax=-dy/d,ay=dx/d;// axis (ax,ay,0)
 const rot=v=>{const c=Math.cos(ang),s=Math.sin(ang),dot=v[0]*ax+v[1]*ay,cx=ay*v[2]-0,cy=-ax*v[2],cz=ax*v[1]-ay*v[0];return [v[0]*c+cx*s+ax*dot*(1-c),v[1]*c+cy*s+ay*dot*(1-c),v[2]*c+cz*s];};o.n=rot(o.n);o.u=rot(o.u);}
// ease the face back to looking straight up (and upright on screen) while the ball rests
function settleOrient(o,dt,rot){const up=rot?[-1,0,0]:[0,-1,0],k=Math.min(1,dt*5);o.n=nrm([o.n[0]*(1-k),o.n[1]*(1-k),o.n[2]*(1-k)+k]);o.u=nrm([o.u[0]*(1-k)+up[0]*k,o.u[1]*(1-k)+up[1]*k,o.u[2]*(1-k)]);}
const nrm=v=>{const l=Math.hypot(...v)||1;return v.map(c=>c/l);};
const newOrient=rot=>({n:[0,0,1],u:rot?[-1,0,0]:[0,-1,0]});

Object.assign(exports,{TC,TS,LAWN_Z,proj,unproj,aff,drawHole,drawProp,rollOrient,settleOrient,newOrient,texture,pattern,FALLBACK});
