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
// the WebGL layer under the 2D canvas (glLayer.js) when puttPutt made one; null = everything on the 2D canvas as before
let GL=null;
function setGL(g){GL=g||null;}
const glOn=()=>!!(GL&&!GL.lost);
// scratch canvases: a ground square or a sprite is painted here (same 2D code as ever) and then copied into its texture once
const SCR={};
function scratch(k,w,h){let c=SCR[k];if(!c)c=SCR[k]=canvas(w,h);else if(c.width!==w||c.height!==h){c.width=w;c.height=h;}return c;}
// Every picture the game draws comes through pic(). While a cache (ground, sprites, lawn) is being painted, MISS is that
// cache's set of pictures that exist but haven't loaded yet: a cache is repainted only when one of ITS missing pictures
// arrives (every picture loading used to repaint everything, and the game loads all 60 of them in the background)
let MISS=null;
function pic(name){const img=S.picture(name);if(!img&&MISS&&S.has(name))MISS.add(name);return img;}
function arrived(o,ver){if(o.ver===ver)return false;o.ver=ver;for(const n of o.miss)if(S.picture(n)){o.miss.clear();return true;}return false;}
function missing(set,f){const m=MISS;MISS=set;try{return f();}finally{MISS=m;}}
// pictures are drawn from a chain of halvings made once (mip levels: the art is 2x and bigger, and shrinking a big picture
// every frame is slow on phones): the smallest level still at least the drawn size, so the GPU never shrinks more than 2x.
// warmPictures() makes the chains on the loading screen; one made mid-play costs a few halvings, once.
// KREF = cache zoom / camera zoom while a hole is drawn: a picture is picked for its size at the cache zoom (the closest
// the camera gets), so a camera zooming with the ball's speed never asks for a new level.
const MIPS=new WeakMap();let KREF=1;
function mipChain(img){let m=MIPS.get(img);if(m)return m;m=[img];let src=img,w=img.width||img.naturalWidth,h=img.height||img.naturalHeight;
 while(w>48&&h>48){const c2=canvas(Math.ceil(w/2),Math.ceil(h/2)),g=c2.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(src,0,0,c2.width,c2.height);m.push(c2);src=c2;w=c2.width;h=c2.height;}
 MIPS.set(img,m);return m;}
// A picture drawn at half its size or more comes from a canvas copy made once: a phone's browser may drop an <img>'s
// decoded pixels to save memory and decode the whole picture again inside a frame (windmill, clown head: 1280 px)
const FULL=new WeakMap();
function full(img){let c=FULL.get(img);if(c)return c;const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;if(!(w>0&&h>0)||!(img instanceof HTMLImageElement))return img;
 c=canvas(w,h);c.getContext('2d').drawImage(img,0,0);FULL.set(img,c);return c;}
function shrunk(img,sc){
 if(!img||!(sc>0))return img;sc*=Math.max(1,KREF);if(sc>=.5)return full(img);
 const m=mipChain(img),lv=Math.min(m.length-1,Math.floor(Math.log2(1/sc)));return m[lv];}
function warmPictures(names){for(const n of names){const img=pic(n);if(img)mipChain(img);}}
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;if(f>0){r+=(255-r)*f;g+=(255-g)*f;b+=(255-b)*f;}else{r*=1+f;g*=1+f;b*=1+f;}return `rgb(${r|0},${g|0},${b|0})`;}
function speckle(g,w,h,base,n,amp,r,seed){g.fillStyle=base;g.fillRect(0,0,w,h);const R=rnd(seed);for(let i=0;i<n;i++){g.fillStyle=shade(base,(R()-.5)*amp);const s=r*(.5+R());g.fillRect(R()*w,R()*h,s,s);}}
function texture(key,look){
 // a drawn stand-in is replaced once the picture has loaded (it used to stay for good)
 if(TEX.has(key)){const t=TEX.get(key);if(t.art||!pic(key.split('|')[0]))return t;}
 const art=pic(key.split('|')[0]);let c;
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
function pattern(x,key,look,worldSize){const t=texture(key,look);if(!t.pats)t.pats=new WeakMap();let pat=t.pats.get(x);if(!pat){pat=x.createPattern(t.img,'repeat');t.pats.set(x,pat);}t.pat=pat;const s=worldSize/t.w;try{t.pat.setTransform(new DOMMatrix([s,0,0,s,0,0]));}catch{}return t.pat;}
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
 const def=S.PICTURES[name],img=pic(name);
 if(img&&def){const sc=wpx/img.width,fx=def.foot?def.foot[0]/def.size[0]*img.width:img.width/2,fy=def.foot?def.foot[1]/def.size[1]*img.height:img.height;
  x.drawImage(shrunk(img,sc),X-fx*sc,Y-fy*sc,img.width*sc,img.height*sc);return;}
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
// Speed: the view is affine (moving the camera only pans and zooms the picture), so everything that never moves is painted
// once per hole at one zoom (st.kc): the ground (greens, skirts, shading, banks, still ground pieces) into squares, every
// still standing thing (rail pieces, blocks, scenery) into its own small sprite. A frame draws those scaled, the lawn as
// one pattern fill, and only what moves (water ripples, pads, movers, bumpers, flag, balls) live. Painting happens within
// st.paintMs per frame (the flyover paints the hole); a camera that zooms or pans never causes any.
function drawHole(x,W,H,cam,st){
 const {C,course}=st,look=course.look,pf=st.prof,t0=pf?performance.now():0,cov=st.cover,gx=glOn()&&GL.begin(W,H)?GL:null;
 x.setTransform(1,0,0,1,0,0);if(gx)x.clearRect(0,0,W,H);OCC=0;
 // background (live: clouds drift, stars twinkle); with the GL layer it goes on a canvas of its own under that layer
 const bx=gx?(look.space||C.hole.sky?gx.bg(W,H):null):x;
 if(!bx);else if(look.space)drawStars(bx,W,H,cam,st.T);
 else if(C.hole.sky){const g=bx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#8fd3ff');g.addColorStop(1,'#ffe3f4');bx.fillStyle=g;bx.fillRect(0,0,W,H);for(let i=0;i<9;i++){const px=((i*0.37+st.T*.01*(1+i%3))%1.3-.15)*W,py=(i*.137%1)*H,r=Math.min(W,H)*(.08+(i%4)*.03);bx.fillStyle='rgba(255,255,255,.75)';for(const [dx,dy,rr] of [[0,0,1],[r*.8,r*.1,.8],[-r*.8,r*.15,.7]]){bx.beginPath();bx.arc(px+dx,py+dy,r*rr,0,7);bx.fill();}}}
 // ground: the lawn live (one pattern fill), then the cached runs with the moving bits (water, boosts...) between them
 deadline=performance.now()+(st.paintMs>=0?st.paintMs:4);KREF=st.kc>0?st.kc/cam.k:1;
 const G=groundCache(C,course,cam,st);paintGround(G,cam,W,H,st);const [ox,oy]=proj(cam,W,H,0,0,0);
 if(!C.hole.sky&&!look.space){if(gx)drawLawnGL(gx,W,H,cam,course,st.kc);else drawLawn(x,W,H,cam,course,st.kc);}
 // GL layer: moving ground bits under a later cached run (water) are drawn into a scratch canvas and uploaded in their place;
 // the ones after the last cached run and the shot's trail share one upload (all of it is under the standing things)
 const ls=lastStatic(G);let tail=null;
 G.runs.forEach((run,r)=>{x.setTransform(1,0,0,1,0,0);
  if(run.anim){if(!gx){for(const f of run.steps)f(x,W,H,cam,st);return;}
   if(r<ls)animGL(gx,'a'+r,W,H,g=>{for(const f of run.steps)f(g,W,H,cam,st);});else tail=run;return;}
  if(gx)drawGroundGL(gx,G,r,cam,W,H);else drawGround(x,G,r,cam,W,H);});
 const t1=pf?performance.now():0;x.setTransform(1,0,0,1,0,0);
 const trail=st.trail&&st.trail.pts.length>1?st.trail:null;
 if(gx){if(tail||trail)animGL(gx,'tail',W,H,g=>{if(tail)for(const f of tail.steps)f(g,W,H,cam,st);if(trail){drawTrail(g,W,H,cam,trail);g._drew=true;const e=Math.max(4,cam.k*1.2);for(const p of trail.pts){const [X,Y]=proj(cam,W,H,p[0],p[1],p[2]);growBB(g,X-e,Y-e,X+e,Y+e);}}});}
 else if(trail)drawTrail(x,W,H,cam,trail);
 // sorted standing things: still ones from their sprites, moving ones drawn live
 const items=[],dcam=depth(cam.rot,cam.x,cam.y,0);
 const SP=standingSprites(C,course,cam,st),later=[],vis=[];
 for(const it of SP.list){const b1=it.b1,X0=ox+b1.bx*cam.k,Y0=oy+b1.by*cam.k;
  if(X0>W||Y0>H||X0+b1.w*cam.k<0||Y0+b1.h*cam.k<0||(cov&&X0>=cov[0]&&Y0>=cov[1]&&X0+b1.w*cam.k<=cov[2]&&Y0+b1.h*cam.k<=cov[3])){if(!it.sp||it.sp.stale)later.push(it);continue;}it._bb=[X0,Y0,X0+b1.w*cam.k,Y0+b1.h*cam.k];vis.push(it);}
 // all of this frame's sprite painting before any drawing from the atlas (writing to a canvas that was just drawn from
 // makes the browser copy it), the ones on screen first
 for(const it of vis)if((!it.sp||it.sp.stale)&&timeLeft())paintSprite(it,SP);
 for(const it of later){if(!timeLeft())break;paintSprite(it,SP);}
 const t2=pf?performance.now():0;
 for(const it of vis){const y=H/2+cam.k*(it.d-dcam);
  if(gx&&it.sp){if(it.sp.tex)items.push({y,gl:it});continue;}
  items.push({y,bb:it._bb,f:()=>{const q=it.sp;
   if(!q){it.draw(x,W,H,cam);return;}// not painted yet: drawn live this frame
   if(!q.cv)return;const t=cam.k/q.kc;if(Math.abs(t-1)<EXACT)x.drawImage(q.cv,q.sx,q.sy,q.w,q.h,Math.round(ox+q.bx),Math.round(oy+q.by),q.w,q.h);else x.drawImage(q.cv,q.sx,q.sy,q.w,q.h,ox+q.bx*t,oy+q.by*t,q.w*t,q.h*t);}});}
 for(const m of C.movers)moverItems(x,W,H,cam,st,m,items);
 for(const [i,p] of C.bumpers.entries()){const y=proj(cam,W,H,p.x,p.y+p.r,p.z)[1],[X,Y]=proj(cam,W,H,p.x,p.y,p.z),r=p.r*cam.k,h=2.2*TS*cam.k;items.push({y,bb:BB(X-r*2.4,Y-h-r*2.4,X+r*2.4,Y+r*1.6),f:()=>drawBumper(x,W,H,cam,p,st.T-(st.hit&&st.hit['b'+i]||-9))});}
 for(const m of C.magnets){const g=C.topAt(m.x,m.y),z=g?g.z:0;const [X,Y]=proj(cam,W,H,m.x,m.y-6,z);items.push({y:Y,bb:propBB('magnet',X,Y,18*cam.k),f:()=>drawProp(x,'magnet',X,Y,18*cam.k,{t:st.T})});}
 for(const d of SP.live){const g=C.topAt(d.x,d.y),z=g?g.z:LAWN_Z;const [X,Y]=proj(cam,W,H,d.x,d.y,z);if(X<-d.w*cam.k*1.2||X>W+d.w*cam.k*1.2||Y<-10||Y>H+d.w*cam.k*2.5)continue;items.push({y:Y,bb:propBB(d.k==='flag-sign'?'sign':d.k,X,Y,d.w*cam.k),f:()=>drawProp(x,d.k==='flag-sign'?'sign':d.k,X,Y,d.w*cam.k,{t:st.T,text:d.text})});}
 {const cz=C.cupZ,[X,Y]=proj(cam,W,H,C.hole.cup[0],C.hole.cup[1],cz);items.push({y:Y+.02,bb:propBB('flag',X,Y,3.4*cam.k),f:()=>{if(st.flag===0)return;x.globalAlpha=st.flag??1;drawProp(x,'flag',X,Y,3.4*cam.k,{t:st.T,col:look.space?'#ffd23f':'#ff3b5c'});x.globalAlpha=1;}});}
 for(const bb of st.balls){if(bb.hidden)continue;const b=bb.b,gr=C.topAt(b.x,b.y),gz=b.air?(C.ground(b.x,b.y,b.z+.05)||{z:LAWN_Z}).z:b.z;const [X,Y]=proj(cam,W,H,b.x,b.y,gz);items.push({y:Y+.05,bb:ballBB(cam,W,H,bb,gz),f:()=>drawBall(x,W,H,cam,bb,gz,gr)});}
 items.sort((a,b)=>a.y-b.y);
 if(gx){// the standing sprites in order on the GL layer, under everything on the 2D canvas...
  for(const it of items)if(it.gl){const q=it.gl.sp,t=cam.k/q.kc;if(Math.abs(t-1)<EXACT)gx.quad(q.tex,q.sx,q.sy,q.w,q.h,Math.round(ox+q.bx),Math.round(oy+q.by),q.w,q.h);else gx.quad(q.tex,q.sx,q.sy,q.w,q.h,ox+q.bx*t,oy+q.by*t,q.w*t,q.h*t);}
  gx.end();
  // ...then the moving things on the 2D canvas in the same order. A standing sprite that comes after something moving and
  // overlaps it cuts its own shape out of what the 2D canvas holds so far (erase, from a small canvas of its own made the
  // first time): a ball that rolls behind a rail or a prop disappears behind it, and the sprite itself is still drawn only
  // once (on the GL layer), so its soft edges are not doubled
  const seen=[];for(const it of items){x.setTransform(1,0,0,1,0,0);
   if(it.gl){const b=it.gl._bb;for(const v of seen)if(v[0]<b[2]&&v[2]>b[0]&&v[1]<b[3]&&v[3]>b[1]){drawOcc(x,it.gl,ox,oy,cam,SP);break;}continue;}
   it.f();seen.push(it.bb||[-1e9,-1e9,1e9,1e9]);}}
 else for(const it of items){x.setTransform(1,0,0,1,0,0);it.f();}
 const t3=pf?performance.now():0;
 // particles
 KREF=1;x.setTransform(1,0,0,1,0,0);for(const p of st.fx||[]){const [X,Y]=proj(cam,W,H,p.x,p.y,p.z);const r=Math.max(1,p.s*cam.k);x.globalAlpha=Math.max(0,Math.min(1,p.life/p.max*1.5));x.fillStyle=p.col;if(p.kind==='confetti'){x.save();x.translate(X,Y);x.rotate(p.r);x.fillRect(-r,-r*.4,r*2,r*.8);x.restore();}else{x.beginPath();x.arc(X,Y,r,0,7);x.fill();}}x.globalAlpha=1;
 if(pf){const t4=performance.now();pf.ground=t1-t0;pf.paint=t2-t1;pf.things=t3-t2;pf.fx=t4-t3;pf.n=items.length;pf.occ=OCC;}
}
function drawTrail(x,W,H,cam,tr){const t=tr.pts;x.lineCap='round';for(let i=1;i<t.length;i++){const a=proj(cam,W,H,t[i-1][0],t[i-1][1],t[i-1][2]),b=proj(cam,W,H,t[i][0],t[i][1],t[i][2]);x.strokeStyle=tr.col;x.globalAlpha=.5*i/t.length;x.lineWidth=Math.max(2,cam.k*1.1*i/t.length);x.beginPath();x.moveTo(...a);x.lineTo(...b);x.stroke();}x.globalAlpha=1;}
// a box (screen px) round something drawn live, padded: standing sprites after it that overlap it are drawn again over it
const BB=(a,b,c,d,p=4)=>[Math.min(a,c)-p,Math.min(b,d)-p,Math.max(a,c)+p,Math.max(b,d)+p];
function propBB(name,X,Y,wpx){const def=S.PICTURES[name],img=S.picture(name);
 if(img&&def){const sc=wpx/img.width,fx=def.foot?def.foot[0]/def.size[0]*img.width:img.width/2,fy=def.foot?def.foot[1]/def.size[1]*img.height:img.height;return BB(X-fx*sc,Y-fy*sc,X-fx*sc+img.width*sc,Y-fy*sc+img.height*sc);}
 return BB(X-wpx*1.2,Y-wpx*2.4,X+wpx*1.2,Y+wpx*.6);}
function ballBB(cam,W,H,bb,gz){const b=bb.b,r=Math.max(5.5,P.BALL_R*cam.k*(bb.vis||1)),[sx,sy]=proj(cam,W,H,b.x,b.y,gz),[X,Y]=proj(cam,W,H,b.x,b.y,b.z+P.BALL_R*(bb.vis||1)-(bb.sinkDip||0)),e=r*1.7;
 return BB(Math.min(X,sx)-e,Math.min(Y,sy)-e,Math.max(X,sx)+e,Math.max(Y,sy)+e,bb.glow?18:4);}
function ptsBB(cam,W,H,pts,z0,z1){let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const p of pts)for(const z of [z0,z1]){const [X,Y]=proj(cam,W,H,p[0],p[1],z);a=Math.min(a,X);b=Math.min(b,Y);c=Math.max(c,X);d=Math.max(d,Y);}return BB(a,b,c,d,6);}
// a standing sprite in front of something moving: its shape erased from the 2D canvas (its own canvas, painted like its
// atlas copy, drawn with destination-out)
function drawOcc(x,it,ox,oy,cam,SP){const q=it.sp;let o=it.occ;
 if(!o||o.v!==q.v){const c=canvas(Math.max(1,q.w),Math.max(1,q.h)),g=c.getContext('2d'),kr=KREF,m=MISS;KREF=1;MISS=SP.miss;
  try{it.draw(g,-2*q.bx,-2*q.by,{x:0,y:0,k:q.kc,rot:it.rot});}finally{KREF=kr;MISS=m;}o=it.occ={c,v:q.v};}
 const t=cam.k/q.kc;x.globalCompositeOperation='destination-out';
 if(Math.abs(t-1)<EXACT)x.drawImage(o.c,Math.round(ox+q.bx),Math.round(oy+q.by));else x.drawImage(o.c,ox+q.bx*t,oy+q.by*t,q.w*t,q.h*t);
 x.globalCompositeOperation='source-over';OCC++;}
let OCC=0;
// moving ground bits drawn into the screen-size scratch canvas and uploaded as one texture (only if anything was drawn)
const DYN={};
function animGL(gx,key,W,H,draw){const resized=!SCR.anim||SCR.anim.width!==W||SCR.anim.height!==H,sc=scratch('anim',W,H),g=sc.getContext('2d'),dz=sc._dirty;
 g.setTransform(1,0,0,1,0,0);if(!resized&&dz)g.clearRect(dz[0],dz[1],dz[2],dz[3]);else if(!resized)g.clearRect(0,0,W,H);sc._dirty=null;
 g._drew=false;g._bbx=[1e9,1e9,-1e9,-1e9];g.save();
 try{draw(g);}finally{g.restore();g.setTransform(1,0,0,1,0,0);}
 const B=g._bbx;g._bbx=null;if(!g._drew){sc._dirty=[0,0,0,0];return;}
 // only the box round what was drawn goes up (water on screen, a pad, the trail), not the whole screen
 const x0=Math.max(0,Math.floor(B[0])-2),y0=Math.max(0,Math.floor(B[1])-2),x1=Math.min(W,Math.ceil(B[2])+2),y1=Math.min(H,Math.ceil(B[3])+2);
 if(!(x1>x0&&y1>y0)){sc._dirty=[0,0,W,H];return;}sc._dirty=[x0,y0,x1-x0,y1-y0];
 const slot=DYN[key]||(DYN[key]={h:null}),h=gx.dynRect(slot,sc,x0,y0,x1-x0,y1-y0);if(h)gx.quad(h,x0,y0,x1-x0,y1-y0,x0,y0,x1-x0,y1-y0);}
const lastStatic=G=>{if(G._ls==null){G._ls=-1;G.runs.forEach((r,i)=>{if(!r.anim)G._ls=i;});}return G._ls;};
// screen depth of a world point at k = 1 with the camera at the origin: proj(...)[1] = H/2 + k*(depth(p) - depth(camera))
const depth=(rot,x,y,z)=>(rot?x:y)*TC-z*TS;

// ---- the ground, as steps (static ones go into cached layers, anim ones are drawn live in their place)
// the plain lawn round the course, live: its picture is repeated from one small square made at the cache zoom kc (already
// squashed by the tilt), so a frame fills the screen with a pattern drawn at about 1:1 instead of resampling the big picture
// one square per course and turn (the next hole is prepared while this one is still drawn, so they don't evict each other)
const LAWNS=new Map();
function lawnFor(course,rot,kc){const cid=course.id,key=`${cid}-lawn|${cid}`,tw=tileWorld(`${cid}-lawn`),ver=S.version?S.version():0,mk=key+'|'+rot;let L=LAWNS.get(mk);
 if(!L||Math.abs(L.kc/kc-1)>.2||arrived(L,ver)){const miss=new Set();if(L&&L.tex&&L.tex.gl)L.tex.gl.free(L.tex);
  const cw=Math.max(8,Math.min(2048,Math.round(tw*kc))),ch=Math.max(8,Math.min(2048,Math.round(tw*kc*TC))),cv=L&&L.cv||canvas(cw,ch),g=cv.getContext('2d');cv.width=cw;cv.height=ch;
  const kx=cw/tw,ky=ch/tw;g.setTransform(...(rot?[0,ky,-kx,0,0,0]:[kx,0,0,ky,0,0]));missing(miss,()=>{g.fillStyle=pattern(g,key,course.look,tw);});g.fillRect(-2*tw,-2*tw,4*tw,4*tw);g.setTransform(1,0,0,1,0,0);
  L={key,rot,ver,miss,kc,cv,cw,ch,tw,pats:new WeakMap()};LAWNS.set(mk,L);}
 return L;}
function drawLawn(x,W,H,cam,course,kc){const L=lawnFor(course,cam.rot,kc>0?kc:cam.k);
 let pat=L.pats.get(x);if(!pat){pat=x.createPattern(L.cv,'repeat');L.pats.set(x,pat);}
 const [ox,oy]=proj(cam,W,H,0,0,LAWN_Z);try{pat.setTransform(new DOMMatrix([cam.k*L.tw/L.cw,0,0,cam.k*L.tw*TC/L.ch,ox,oy]));}catch{}
 x.setTransform(1,0,0,1,0,0);x.fillStyle=pat;x.fillRect(0,0,W,H);}
function drawLawnGL(gx,W,H,cam,course,kc){const L=lawnFor(course,cam.rot,kc>0?kc:cam.k);
 if(!L.tex||L.tex.dead||L.tex.gl!==gx)L.tex=gx.from(L.cv,true);
 const [ox,oy]=proj(cam,W,H,0,0,LAWN_Z);gx.pattern(L.tex,ox,oy,cam.k*L.tw,cam.k*L.tw*TC);}
function sortedGreens(C){return C._gs||(C._gs=C.greens.slice().sort((a,b)=>(a.water?-1:0)-(b.water?-1:0)||(a.a-b.a)||a.i-b.i));}
function groundRuns(C,course){
 if(C._runs)return C._runs;
 const look=course.look,cid=course.id,greens=sortedGreens(C),waters=C.greens.filter(g=>g.water),sky=!!C.hole.sky,steps=[];
 steps.push({f:(x,W,H,cam)=>{if(sky)return;const lawnA=aff(cam,W,H,LAWN_Z),on=greens.filter(g=>!g.water&&onCanvas(x,W,H,cam,g,look.space?6:0));if(!on.length)return;x._drew=true;
  // the space deck only under the greens (the rest is the star field); a plain lawn is drawn live under the cache (drawLawn)
  if(look.space){x.setTransform(...lawnA);x.fillStyle=pattern(x,`${cid}-lawn|${cid}`,look,tileWorld(`${cid}-lawn`));x.globalAlpha=.85;for(const g of on){const pad=6;x.beginPath();x.rect(g.box[0]-pad,g.box[1]-pad,g.box[2]-g.box[0]+pad*2,g.box[3]-g.box[1]+pad*2);x.fill();}x.globalAlpha=1;}
  // shadows of rails/blocks on the lawn: a soft dark band round every green
  x.setTransform(...lawnA);x.fillStyle='rgba(0,0,0,.22)';for(const g of on){x.beginPath();g.pts.forEach((p,i)=>i?x.lineTo(p[0]+.9,p[1]+1.3):x.moveTo(p[0]+.9,p[1]+1.3));x.closePath();x.fill();}}});
 for(const g of greens){steps.push({f:(x,W,H,cam,st)=>drawGreen(x,W,H,cam,st,g,waters,false)});if(g.water||g.type==='out')steps.push({anim:1,f:(x,W,H,cam,st)=>drawGreen(x,W,H,cam,st,g,waters,true)});}
 steps.push({f:(x,W,H,cam,st)=>groundThings(x,W,H,cam,st,false)});
 steps.push({anim:1,f:(x,W,H,cam,st)=>groundThings(x,W,H,cam,st,true)});
 const runs=[];for(const s of steps){const last=runs[runs.length-1];if(last&&!!last.anim===!!s.anim)last.steps.push(s.f);else runs.push({anim:!!s.anim,steps:[s.f]});}
 return C._runs=runs;}
// is any of this green (with its skirt down to the lawn and its hills) on the canvas being drawn? (tiles skip the rest)
function onCanvas(x,W,H,cam,g,grow=0){
 zRange(g);
 const x0=g.box[0]-grow,y0=g.box[1]-grow,x1=g.box[2]+grow,y1=g.box[3]+grow,cr=x._cr,cx0=cr?cr[0]:0,cy0=cr?cr[1]:0,cw=cr?cr[2]:x.canvas.width,ch=cr?cr[3]:x.canvas.height,pad=3*cam.k;let a=1e9,b=1e9,c=-1e9,d=-1e9;
 for(const px of [x0,x1])for(const py of [y0,y1])for(const z of g._zr){const [X,Y]=proj(cam,W,H,px,py,z);a=Math.min(a,X);b=Math.min(b,Y);c=Math.max(c,X);d=Math.max(d,Y);}
 const vis=c+pad>=cx0&&a-pad<=cw&&d+pad>=cy0&&b-pad<=ch;if(vis&&x._bbx)growBB(x,a-pad,b-pad,c+pad,d+pad);return vis;}
// the screen box of what an anim run draws into the GL layer's scratch canvas (only that part is uploaded)
function growBB(x,a,b,c,d){const B=x._bbx;if(!B)return;if(a<B[0])B[0]=a;if(b<B[1])B[1]=b;if(c>B[2])B[2]=c;if(d>B[3])B[3]=d;}
// one green: skirt, top, shading, fringe, banks (anim=false) or only its moving surface (anim=true: water ripples, the void)
function drawGreen(x,W,H,cam,st,g,waters,anim){
 const {C,course}=st,look=course.look,cid=course.id;
 if(!onCanvas(x,W,H,cam,g))return;
 x._drew=true;
 if(!anim&&!g.water){x.setTransform(1,0,0,1,0,0);for(const e of g.edges){if(e.same||vOf(cam,e.nx,e.ny)<=.02)continue;const mx=(e.x1+e.x2)/2+e.nx*.5,my=(e.y1+e.y2)/2+e.ny*.5,below=C.topAt(mx,my);const zb=below&&below.z<Math.min(e.z1,e.z2)-.05?below.z:LAWN_Z;
   const a=proj(cam,W,H,e.x1,e.y1,e.z1),b=proj(cam,W,H,e.x2,e.y2,e.z2),c=proj(cam,W,H,e.x2,e.y2,zb),d=proj(cam,W,H,e.x1,e.y1,zb);if(Math.max(c[1],d[1])-Math.min(a[1],b[1])<.5)continue;
   faceQuad(x,a,b,c,d,pattern(x,`${cid}-cliff|${cid}`,look,24),e.x1,e.y1,e.x2,e.y2,cam,W,H);}}
 const A=aff(cam,W,H,g.a,g.b,g.c);x.setTransform(...A);x.beginPath();g.pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();
 if(!g.water&&!g.bridge)for(const w of waters){w.pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();}
 x.save();x.clip('evenodd');
 if(anim){
  if(g.water){x.globalAlpha=.25;x.strokeStyle='#fff';x.lineWidth=.35;for(let i=0;i<6;i++){const yy=g.box[1]+((i*7+st.T*2.5)%(g.box[3]-g.box[1]+4));x.beginPath();for(let xx=g.box[0];xx<=g.box[2];xx+=2)x.lineTo(xx,yy+Math.sin(xx*.4+st.T*2+i)*.5);x.stroke();}x.globalAlpha=1;}
  if(g.type==='out'){x.globalAlpha=.9;x.translate((g.box[0]+g.box[2])/2,(g.box[1]+g.box[3])/2);for(let i=0;i<3;i++){x.rotate(st.T*1.4+i*2.1);x.strokeStyle=['#8a4dff','#ff4dd2','#4dc3ff'][i];x.lineWidth=.6;x.beginPath();for(let a=0;a<9;a+=.3)x.lineTo(Math.cos(a)*a*.6,Math.sin(a)*a*.6);x.stroke();}x.globalAlpha=1;}
  x.restore();return;}
 const tkey=g.water?(look.space?'water-space':'water'):g.bridge?'bridge':g.type==='turf'?`${cid}-turf`:g.type==='carpet'?'carpet':g.type==='rough'?`${cid}-lawn`:g.type;
 x.fillStyle=pattern(x,tkey+'|'+cid,look,tileWorld(tkey));x.fillRect(g.box[0]-1,g.box[1]-1,g.box[2]-g.box[0]+2,g.box[3]-g.box[1]+2);
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
// the ground cache: every still part of the ground is painted ONCE per hole at one fixed zoom kc (st.kc = the closest the
// automatic camera ever gets), in TILE px squares of "layer space" (pixels at zoom kc with the world origin at 0,0), plus
// one small copy of the whole hole (low) painted at once that stands in for any square not painted yet and is used when
// the camera is far out. Moving or zooming the camera never repaints anything: a frame only draws squares (scaled, or
// 1:1 on whole pixels when the camera sits at kc). Squares are painted a few each frame within a time budget (the
// visible ones first), so the flyover fills the whole hole before play. A picture that loads later marks everything
// stale: stale squares keep being drawn as they were until repainted.
const TILE=256,LOW_K=.4,LOW_MAX=3072,EXACT=.002,GROUND_PX=18e6;
let deadline=0;const timeLeft=()=>performance.now()<deadline;
function zRange(g){if(!g._zr){const [x0,y0,x1,y1]=g.box,zs=[[x0,y0],[x1,y0],[x0,y1],[x1,y1]].map(([px,py])=>g.a+g.b*px+g.c*py),hh=(g.hills||[]).reduce((m,h)=>m+Math.abs(h[3]||0),0);g._zr=[Math.min(LAWN_Z,...zs)-hh-3,Math.max(...zs)+hh+1];}return g._zr;}
// layer-space box (at k = 1) of everything the cached ground can draw
function extentOf(C,rot){const c1={x:0,y:0,k:1,rot};let a=1e9,b=1e9,c=-1e9,d=-1e9;
 for(const g of C.greens){const [x0,y0,x1,y1]=g.box,p=8;for(const px of [x0-p,x1+p])for(const py of [y0-p,y1+p])for(const z of zRange(g)){const [X,Y]=proj(c1,0,0,px,py,z);a=Math.min(a,X);b=Math.min(b,Y);c=Math.max(c,X);d=Math.max(d,Y);}}
 return a<c?[a,b,c,d]:[0,0,1,1];}
// The ground lives in a few big PAGES (PAGE px square in layer space at the cache zoom kc), painted TILE px block by block
// within the frame's time budget. Few big canvases instead of ~100 small ones: a phone's GPU draws a handful of textures a
// frame quickly, but switching between (or re-uploading) dozens of them every frame was what kept the frame rate down.
const PAGE=3840,BPP=PAGE/TILE;// 15 blocks: page + its 1 px rim stays under 4096 (the largest texture many phone GPUs take)
const pkey=(i,j)=>(i+512)*1024+(j+512);
function groundCache(C,course,cam,st){
 const ver=S.version?S.version():0;let kc=st.kc>0?st.kc:cam.k,G=C._ground;
 if(G&&(G.rot!==cam.rot||Math.abs(G.want/kc-1)>.2||G.gl!==glOn())){freeGround(C);G=null;}
 if(!G){const runs=groundRuns(C,course),E=extentOf(C,cam.rot),nr=runs.filter(r=>!r.anim).length,area=(E[2]-E[0])*(E[3]-E[1])*nr*kc*kc;
  // big screen + long hole: a softer cache rather than ~100 MB of canvases (the camera rarely sits that close anyway)
  if(area>GROUND_PX)kc*=Math.sqrt(GROUND_PX/area);const kl=Math.min(kc*LOW_K,LOW_MAX/Math.max(1,E[2]-E[0]),LOW_MAX/Math.max(1,E[3]-E[1]));
  G=C._ground={gl:glOn(),glh:glOn()?GL:null,rot:cam.rot,want:st.kc>0?st.kc:cam.k,kc,ver,runs,E,low:{k:kl,cvs:null,stale:true,x0:0,y0:0},pages:new Map(),
   i0:Math.floor(E[0]*kc/TILE),i1:Math.floor(E[2]*kc/TILE),j0:Math.floor(E[1]*kc/TILE),j1:Math.floor(E[3]*kc/TILE),fresh:true,todo:null,miss:new Set()};}
 if(arrived(G,ver)){G.low.stale=true;G.low.next=null;for(const P of G.pages.values())P.fresh.fill(0);G.todo=null;}
 return G;}
// the page holding block (i,j); made (empty) on first use. Its canvases cover the page plus 1 px all round (smooth scaling)
// pages are counted from the hole's first block and trimmed to its last one (no canvas past the hole)
function pageOf(G,i,j,make){const pi=Math.floor((i-G.i0)/BPP),pj=Math.floor((j-G.j0)/BPP),k=pkey(pi,pj);let P=G.pages.get(k);
 if(!P&&make){const x0=(G.i0+pi*BPP)*TILE-1,y0=(G.j0+pj*BPP)*TILE-1,w=Math.min(PAGE+2,(G.i1+1)*TILE+1-x0),h=Math.min(PAGE+2,(G.j1+1)*TILE+1-y0);
  P={pi,pj,x0,y0,w,h,cvs:G.runs.map(()=>null),tex:G.runs.map(()=>null),drew:G.runs.map(()=>false),has:new Uint8Array(BPP*BPP),fresh:new Uint8Array(BPP*BPP)};G.pages.set(k,P);}
 return P;}
const bix=(G,i,j)=>((j-G.j0)%BPP)*BPP+((i-G.i0)%BPP);
const isFresh=(G,i,j)=>{const P=pageOf(G,i,j,false);return !!P&&!!P.fresh[bix(G,i,j)];};
const hasBlock=(G,i,j)=>{const P=pageOf(G,i,j,false);return !!P&&!!P.has[bix(G,i,j)];};
// how far the one-time painting of this hole has got (tests / tuning)
function cacheStats(C){const G=C&&C._ground;let tiles=0,todo=0,stale=0,px=0,pages=0;
 if(G){for(let j=G.j0;j<=G.j1;j++)for(let i=G.i0;i<=G.i1;i++){if(isFresh(G,i,j))tiles++;else{todo++;if(hasBlock(G,i,j))stale++;}}
  for(const P of G.pages.values()){for(const cv of P.cvs)if(cv){pages++;px+=cv.width*cv.height;}for(const t of P.tex||[])if(t&&!t.dead){pages++;px+=t.w*t.h;}}}
 let sp=0,spDone=0,atlas=0;for(const ck of ['_sp0','_sp1']){const SP=C&&C[ck];if(SP){atlas+=SP.atlas.pages.filter(p=>p.cv||p.tex).length;for(const pg of SP.atlas.pages){if(pg.cv)px+=pg.cv.width*pg.cv.height;if(pg.tex)px+=pg.tex.w*pg.tex.h;}for(const it of SP.list){sp++;if(it.sp&&!it.sp.stale)spDone++;}}}
 return {gl:!!(G&&G.gl),kc:G&&G.kc,tiles,todo,stale,pages,mpx:+(px/1e6).toFixed(2),low:G&&G.low.cvs?G.low.cvs.filter(Boolean).map(c=>c.width+'x'+c.height).join(','):'',sprites:sp,spDone,atlas};}
function freeGround(C){const G=C._ground;if(!G)return;for(const P of G.pages.values()){for(const cv of P.cvs)if(cv)cv.width=cv.height=0;if(G.glh)for(const t of P.tex||[])G.glh.free(t);}
 if(G.glh&&G.low.tex)for(const t of G.low.tex)G.glh.free(t);G.pages.clear();if(G.low.cvs)for(const cv of G.low.cvs)if(cv)cv.width=cv.height=0;C._ground=null;}
function freeHole(C){if(!C)return;freeGround(C);
 for(const ck of ['_sp0','_sp1']){const SP=C[ck];if(SP){freeAtlas(SP);C[ck]=null;}}}
function freeAtlas(SP){const h=SP.glh;for(const pg of SP.atlas.pages){if(pg.cv)pg.cv.width=pg.cv.height=0;if(pg.tex&&h)h.free(pg.tex);pg.tex=null;}
 for(const it of SP.list){const sl=it.slot;if(sl&&sl.own){if(sl.cv)sl.cv.width=sl.cv.height=0;if(sl.tex&&h)h.free(sl.tex);sl.tex=null;}it.occ=null;}}
// paint one static run into a canvas: W/H passed to the steps put layer pixel (lx,ly) at canvas (lx-x0, ly-y0)
function paintRun(G,r,k,x0,y0,w,h,st,cv){
 // (KREF 1: these are painted at the cache zoom, so pictures are picked for the size they are painted at)
 const run=G.runs[r],lc={x:0,y:0,k,rot:G.rot},kr=KREF,m=MISS;KREF=1;MISS=G.miss;
 try{if(cv&&(cv.width!==w||cv.height!==h)){cv.width=cv.height=0;cv=null;}if(!cv)cv=canvas(w,h);const g=cv.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,w,h);
  g._drew=false;for(const f of run.steps){g.setTransform(1,0,0,1,0,0);f(g,-2*x0,-2*y0,lc,st);}g.setTransform(1,0,0,1,0,0);
  if(!g._drew){cv.width=cv.height=0;return null;}return cv;}finally{KREF=kr;MISS=m;}}
// the low copy of the whole hole, every static run (one=true: only the next run, for painting ahead a little at a time)
function paintLow(G,st,one){const L=G.low,[a,b,c,d]=G.E;L.x0=Math.floor(a*L.k)-1;L.y0=Math.floor(b*L.k)-1;const w=Math.ceil(c*L.k)+2-L.x0,h=Math.ceil(d*L.k)+2-L.y0;
 if(!L.cvs)L.cvs=G.runs.map(()=>null);if(L.next==null)L.next=0;
 while(L.next<G.runs.length){const r=L.next++;if(G.runs[r].anim)continue;const cv=paintRun(G,r,L.k,L.x0,L.y0,w,h,st,L.cvs[r]);
  if(G.gl){if(!L.tex)L.tex=G.runs.map(()=>null);if(L.tex[r])G.glh.free(L.tex[r]);L.tex[r]=cv?G.glh.from(cv):null;if(cv)cv.width=cv.height=0;L.cvs[r]=null;}else L.cvs[r]=cv;if(one)break;}
 if(L.next>=G.runs.length){L.stale=false;L.next=null;}}
// one TILE block of a page, every static run, clipped to the block (+1 px so neighbouring blocks and pages agree at the seams)
function paintTile(G,i,j,st){const P=pageOf(G,i,j,true),b=bix(G,i,j),lc={x:0,y:0,k:G.kc,rot:G.rot},kr=KREF,m=MISS;KREF=1;MISS=G.miss;
 const cx=Math.max(0,i*TILE-1-P.x0),cy=Math.max(0,j*TILE-1-P.y0),cw=Math.min(P.w,i*TILE+TILE+1-P.x0)-cx,ch=Math.min(P.h,j*TILE+TILE+1-P.y0)-cy;
 try{if(cw>0&&ch>0)G.runs.forEach((run,r)=>{if(run.anim)return;if(G.gl){tileGL(G,P,r,run,cx,cy,cw,ch,lc,st);return;}let cv=P.cvs[r];if(!cv)cv=P.cvs[r]=canvas(P.w,P.h);const g=cv.getContext('2d');
  g.setTransform(1,0,0,1,0,0);g.save();g.beginPath();g.rect(cx,cy,cw,ch);g.clip();g.clearRect(cx,cy,cw,ch);g._cr=[cx,cy,cx+cw,cy+ch];g._drew=false;
  try{for(const f of run.steps){g.setTransform(1,0,0,1,0,0);f(g,-2*P.x0,-2*P.y0,lc,st);}}finally{g.setTransform(1,0,0,1,0,0);g.restore();g._cr=null;}
  if(g._drew)P.drew[r]=true;});}finally{KREF=kr;MISS=m;}
 P.has[b]=1;P.fresh[b]=1;
 // a run that drew nothing on the whole page keeps no canvas
 if(P.fresh.every(v=>v)){P.cvs.forEach((cv,r)=>{if(cv&&!P.drew[r]){cv.width=cv.height=0;P.cvs[r]=null;}});if(G.glh)P.tex.forEach((t,r)=>{if(t&&!P.drew[r]){G.glh.free(t);P.tex[r]=null;}});}}
// GL layer: the square is painted into a scratch canvas of its own size (same steps, same pixels) and copied into the page's
// texture; a run gets its texture only once a square of it draws something
function tileGL(G,P,r,run,cx,cy,cw,ch,lc,st){const sc=scratch('tile',cw,ch),g=sc.getContext('2d');
 g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cw,ch);g.save();g._cr=[0,0,cw,ch];g._drew=false;
 try{for(const f of run.steps){g.setTransform(1,0,0,1,0,0);f(g,-2*(P.x0+cx),-2*(P.y0+cy),lc,st);}}finally{g.setTransform(1,0,0,1,0,0);g.restore();g._cr=null;}
 if(!g._drew&&!P.tex[r])return;if(!P.tex[r])P.tex[r]=G.glh.tex(P.w,P.h);G.glh.put(P.tex[r],sc,cx,cy);if(g._drew)P.drew[r]=true;}
function visRange(G,cam,W,H){const [ox,oy]=proj(cam,W,H,0,0,0),u=TILE*cam.k/G.kc;
 return {ox,oy,u,i0:Math.max(G.i0,Math.floor(-ox/u)),i1:Math.min(G.i1,Math.floor((W-ox)/u)),j0:Math.max(G.j0,Math.floor(-oy/u)),j1:Math.min(G.j1,Math.floor((H-oy)/u))};}
const usesLow=(G,cam)=>cam.k<=G.low.k*1.25;
// paint what the view needs first, then the rest of the hole, until this frame's time is up
function paintGround(G,cam,W,H,st){
 if(G.low.stale)paintLow(G,st);
 const R=visRange(G,cam,W,H),need=(i,j)=>!isFresh(G,i,j);
 if(!usesLow(G,cam)){const vis=[];for(let j=R.j0;j<=R.j1;j++)for(let i=R.i0;i<=R.i1;i++)if(need(i,j))vis.push([i,j]);
  const cx=(W/2-R.ox)/R.u,cy=(H/2-R.oy)/R.u;vis.sort((p,q)=>Math.hypot(p[0]+.5-cx,p[1]+.5-cy)-Math.hypot(q[0]+.5-cx,q[1]+.5-cy));
  for(const [i,j] of vis){if(!timeLeft())return;paintTile(G,i,j,st);}}
 G.fresh=false;
 if(!G.todo){// everything else, nearest to the view first
  const cx=(W/2-R.ox)/R.u,cy=(H/2-R.oy)/R.u;G.todo=[];for(let j=G.j0;j<=G.j1;j++)for(let i=G.i0;i<=G.i1;i++)G.todo.push([i,j]);G.todo.sort((p,q)=>Math.hypot(p[0]+.5-cx,p[1]+.5-cy)-Math.hypot(q[0]+.5-cx,q[1]+.5-cy));G.ti=0;}
 while(G.ti<G.todo.length&&timeLeft()){const [i,j]=G.todo[G.ti++];if(need(i,j))paintTile(G,i,j,st);}}
// one drawImage per visible page (its own core square, edges on whole screen pixels), the low copy under blocks not painted yet
function drawGround(x,G,r,cam,W,H){
 const [ox,oy]=proj(cam,W,H,0,0,0),L=G.low;
 const low=()=>{const cv=L.cvs&&L.cvs[r];if(!cv)return;const t=cam.k/L.k;x.drawImage(cv,ox+L.x0*t,oy+L.y0*t,cv.width*t,cv.height*t);};
 if(usesLow(G,cam)){low();return;}
 const R=visRange(G,cam,W,H),s=cam.k/G.kc,exact=Math.abs(s-1)<EXACT,sx=v=>exact?Math.round(ox)+v:Math.round(ox+v*s),sy=v=>exact?Math.round(oy)+v:Math.round(oy+v*s),holes=[];
 for(let j=R.j0;j<=R.j1;j++)for(let i=R.i0;i<=R.i1;i++)if(!hasBlock(G,i,j)){const X0=sx(i*TILE),Y0=sy(j*TILE);holes.push([X0,Y0,sx(i*TILE+TILE)-X0,sy(j*TILE+TILE)-Y0]);}
 if(holes.length){x.save();x.beginPath();for(const h of holes)x.rect(...h);x.clip();low();x.restore();}
 const pi0=Math.floor((R.i0-G.i0)/BPP),pi1=Math.floor((R.i1-G.i0)/BPP),pj0=Math.floor((R.j0-G.j0)/BPP),pj1=Math.floor((R.j1-G.j0)/BPP);
 for(let pj=pj0;pj<=pj1;pj++)for(let pi=pi0;pi<=pi1;pi++){const P=G.pages.get(pkey(pi,pj)),cv=P&&P.cvs[r];if(!cv)continue;
  const a=P.x0+1,b=P.y0+1,c=Math.min(a+PAGE,P.x0+P.w-1),d=Math.min(b+PAGE,P.y0+P.h-1);if(c<=a||d<=b)continue;
  const X0=sx(a),Y0=sy(b);x.drawImage(cv,a-P.x0,b-P.y0,c-a,d-b,X0,Y0,sx(c)-X0,sy(d)-Y0);}}
// the same squares, rectangles and low copy as drawGround, as quads of the GL layer's textures
function drawGroundGL(gx,G,r,cam,W,H){
 const [ox,oy]=proj(cam,W,H,0,0,0),L=G.low,lt=L.tex&&L.tex[r],lk=cam.k/L.k,lx=ox+L.x0*lk,ly=oy+L.y0*lk;
 if(usesLow(G,cam)){if(lt)gx.quad(lt,0,0,lt.w,lt.h,lx,ly,lt.w*lk,lt.h*lk);return;}
 const R=visRange(G,cam,W,H),s=cam.k/G.kc,exact=Math.abs(s-1)<EXACT,sx=v=>exact?Math.round(ox)+v:Math.round(ox+v*s),sy=v=>exact?Math.round(oy)+v:Math.round(oy+v*s);
 if(lt)for(let j=R.j0;j<=R.j1;j++)for(let i=R.i0;i<=R.i1;i++)if(!hasBlock(G,i,j)){const X0=sx(i*TILE),Y0=sy(j*TILE),w=sx(i*TILE+TILE)-X0,h=sy(j*TILE+TILE)-Y0;gx.quad(lt,(X0-lx)/lk,(Y0-ly)/lk,w/lk,h/lk,X0,Y0,w,h);}
 const pi0=Math.floor((R.i0-G.i0)/BPP),pi1=Math.floor((R.i1-G.i0)/BPP),pj0=Math.floor((R.j0-G.j0)/BPP),pj1=Math.floor((R.j1-G.j0)/BPP);
 for(let pj=pj0;pj<=pj1;pj++)for(let pi=pi0;pi<=pi1;pi++){const P=G.pages.get(pkey(pi,pj)),t=P&&P.tex[r];if(!t)continue;
  const a=P.x0+1,b=P.y0+1,c=Math.min(a+PAGE,P.x0+P.w-1),d=Math.min(b+PAGE,P.y0+P.h-1);if(c<=a||d<=b)continue;
  const X0=sx(a),Y0=sy(b);gx.quad(t,a-P.x0,b-P.y0,c-a,d-b,X0,Y0,sx(c)-X0,sy(d)-Y0);}}

// ---- painting a hole ahead of time (puttPutt: the first hole on the loading screen, the next one while the scorecard is
// up). It fills the very caches drawHole uses, so whatever is done here is never painted during play: the low copy one run
// at a time, then every ground square (nearest the cup first), then every standing sprite. Works until performance.now()
// reaches `until`; returns the share done (1 = all of it). rot/kc must be what the hole will be played with.
function prepareHole(C,course,rot,kc,until){
 const cam={x:0,y:0,k:kc,rot},st={C,course,T:0,kc,balls:[],fx:[]},d0=deadline,kr=KREF;deadline=until;KREF=1;
 try{// one-time pieces first, each in its own call: slope shading per green, the lawn square, the low copy run by run, and
  // the big ground canvases one at a time (making one is a large allocation; inside the first square it was a long frame)
  for(const g of C.greens)if(!g.water&&g._shade===undefined){shadeCanvas(g);if(!timeLeft())return .02;}
  if(!C.hole.sky&&!course.look.space)lawnFor(course,rot,kc);
  const G=groundCache(C,course,cam,st);
  if(G.low.stale){paintLow(G,st,true);if(G.low.stale||!timeLeft())return .05;}
  for(let pj=0;pj<=Math.floor((G.j1-G.j0)/BPP);pj++)for(let pi=0;pi<=Math.floor((G.i1-G.i0)/BPP);pi++){const P=pageOf(G,G.i0+pi*BPP,G.j0+pj*BPP,true);
   if(!G.gl)for(let r=0;r<G.runs.length;r++)if(!G.runs[r].anim&&!P.cvs[r]&&!P.fresh.every(v=>v)){P.cvs[r]=canvas(P.w,P.h);const g=P.cvs[r].getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,1,1);if(!timeLeft())return .08;}}
  if(!G.todo){const [cx,cy]=proj({x:0,y:0,k:G.kc,rot},0,0,C.hole.cup[0],C.hole.cup[1],C.cupZ||0),ci=cx/TILE-.5,cj=cy/TILE-.5;G.todo=[];
   for(let j=G.j0;j<=G.j1;j++)for(let i=G.i0;i<=G.i1;i++)G.todo.push([i,j]);G.todo.sort((p,q)=>Math.hypot(p[0]-ci,p[1]-cj)-Math.hypot(q[0]-ci,q[1]-cj));G.ti=0;}
  while(G.ti<G.todo.length&&timeLeft()){const [i,j]=G.todo[G.ti++];if(!isFresh(G,i,j))paintTile(G,i,j,st);}
  if(G.ti<G.todo.length)return .1+.6*G.ti/G.todo.length;
  const SP=standingSprites(C,course,cam,st);let n=0;
  for(const it of SP.list){if(it.sp&&!it.sp.stale){n++;continue;}if(!timeLeft())break;paintSprite(it,SP);n++;}
  return n>=SP.list.length?1:.7+.3*n/SP.list.length;
 }finally{deadline=d0;KREF=kr;}}

// ---- the still standing things, each in its own sprite at the same fixed zoom kc (sorted per frame with the moving ones)
function spriteBox(it,kc){
 const c0={x:0,y:0,k:kc,rot:it.rot};let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
 const add=(X,Y)=>{x0=Math.min(x0,X);y0=Math.min(y0,Y);x1=Math.max(x1,X);y1=Math.max(y1,Y);};
 if(it.prop){const p=it.prop,[X,Y]=proj(c0,0,0,p.x,p.y,p.z),wpx=p.w*kc,def=S.PICTURES[p.k],img=pic(p.k);
  if(img&&def){const sc=wpx/img.width,fx=def.foot?def.foot[0]/def.size[0]*img.width:img.width/2,fy=def.foot?def.foot[1]/def.size[1]*img.height:img.height;add(X-fx*sc,Y-fy*sc);add(X-fx*sc+img.width*sc,Y-fy*sc+img.height*sc);}
  else{add(X-wpx*.7,Y-wpx*1.8);add(X+wpx*.7,Y+wpx*.3);}}
 else for(const [px,py,pz] of it.pts){const [X,Y]=proj(c0,0,0,px,py,pz);add(X,Y);}
 const pad=3;return {bx:Math.floor(x0)-pad,by:Math.floor(y0)-pad,w:Math.min(MAXDIM,Math.ceil(x1)+pad-Math.floor(x0)+pad),h:Math.min(MAXDIM,Math.ceil(y1)+pad-Math.floor(y0)+pad)};}
const MAXDIM=4096;
function standingSprites(C,course,cam,st){
 const ck='_sp'+cam.rot,ver=S.version?S.version():0,kc=st.kc>0?st.kc:cam.k;let SP=C[ck];
 if(!SP){const look=course.look,cid=course.id,rot=cam.rot,list=[],live=[];
  for(const g of C.greens){if(g.water)continue;for(const e of g.edges){if(!e.rail)continue;const L=Math.hypot(e.x2-e.x1,e.y2-e.y1),n=Math.max(1,Math.ceil(L/7));for(let k=0;k<n;k++){const f0=k/n,f1=(k+1)/n,seg={x1:e.x1+(e.x2-e.x1)*f0,y1:e.y1+(e.y2-e.y1)*f0,x2:e.x1+(e.x2-e.x1)*f1,y2:e.y1+(e.y2-e.y1)*f1,z1:e.z1+(e.z2-e.z1)*f0,z2:e.z1+(e.z2-e.z1)*f1,nx:e.nx,ny:e.ny,h:g.rail};
    const ox=seg.nx*RAIL_W,oy=seg.ny*RAIL_W,pts=[];for(const [px,py,pz] of [[seg.x1,seg.y1,seg.z1],[seg.x2,seg.y2,seg.z2]])for(const [qx,qy] of [[px,py],[px+ox,py+oy]])for(const z of [pz,pz+seg.h,LAWN_Z])pts.push([qx,qy,z]);
    list.push({rot,d:Math.max(depth(rot,seg.x1+ox*.5,seg.y1+oy*.5,seg.z1),depth(rot,seg.x2+ox*.5,seg.y2+oy*.5,seg.z2))-1e-4,pts,draw:(x,W,H,cam)=>drawRail(x,W,H,cam,seg,cid,look)});}}}
  for(const b of C.blocks){if(b.look==='mill'||b.look==='clown')continue;let d=-1e9;const pts=[];for(const p of b.pts){d=Math.max(d,depth(rot,p[0],p[1],b.base));pts.push([p[0],p[1],b.base],[p[0],p[1],b.top]);}
   list.push({rot,d,pts,draw:(x,W,H,cam)=>drawBlock(x,W,H,cam,b.pts,b.base,b.top,b.look,look)});}
  for(const dd of decorFor(C,look,rot)){const k=dd.k==='flag-sign'?'sign':dd.k;if(k==='beacon'&&!S.has(k)){live.push(dd);continue;}
   const g=C.topAt(dd.x,dd.y),z=g?g.z:LAWN_Z;list.push({rot,d:depth(rot,dd.x,dd.y,z),prop:{k,x:dd.x,y:dd.y,z,w:dd.w,text:dd.text},draw:(x,W,H,cam)=>{const [X,Y]=proj(cam,W,H,dd.x,dd.y,z);drawProp(x,k,X,Y,dd.w*cam.k,{t:0,text:dd.text});}});}
  SP=C[ck]={list,live,kc,ver:-1,miss:new Set(),atlas:{pages:[]}};}
 const rezoom=Math.abs(SP.kc/kc-1)>.2||SP.gl!==glOn();
 if(!SP.packed||rezoom||arrived(SP,ver)){const repack=rezoom||!SP.packed,m=MISS;MISS=SP.miss;SP.ver=ver;SP.kc=kc;try{for(const it of SP.list){it.b1=spriteBox(it,1);if(it.sp)it.sp.stale=true;}
  // every sprite gets its place in the atlas up front, tallest first (shelves stay full: ~1/3 the atlas memory of packing as they come)
  if(repack){freeAtlas(SP);for(const it of SP.list){it.slot=null;it.sp=null;it.occ=null;}SP.atlas={pages:[]};SP.packed=true;SP.gl=glOn();SP.glh=SP.gl?GL:null;
   const bx=SP.list.map(it=>[it,spriteBox(it,kc)]).filter(([,b])=>b.w>0&&b.h>0&&isFinite(b.w+b.h)).sort((a,b)=>b[1].h-a[1].h);
   for(const [it,b] of bx)it.slot={...atlasSpot(SP.atlas,b.w,b.h),cw:b.w,ch:b.h};}}finally{MISS=m;}}
 return SP;}
// sprites share a few ATLAS px square canvases (shelf packing, 2 px gaps); one bigger than a page gets its own canvas
const ATLAS=2048,GAP=2;
// a place for a w x h sprite: {pg,sx,sy} on an atlas page (its canvas is made, at the size actually used, when first painted;
// a page with a canvas takes no more sprites) or {cv,own} for one too big for a page
function atlasSpot(A,w,h){
 if(w+GAP>ATLAS||h+GAP>ATLAS)return {cv:null,sx:0,sy:0,own:true,w,h};
 const fit=pg=>{if(pg.cv||pg.tex)return null;for(const sh of pg.shelves)if(h<=sh.h&&sh.x+w+GAP<=ATLAS){const at={pg,sx:sh.x,sy:sh.y};sh.x+=w+GAP;pg.wmax=Math.max(pg.wmax,sh.x);return at;}
  if(pg.y+h+GAP<=ATLAS){const sh={y:pg.y,h,x:w+GAP};pg.shelves.push(sh);pg.y+=h+GAP;pg.wmax=Math.max(pg.wmax,sh.x);return {pg,sx:0,sy:sh.y};}return null;};
 for(const pg of A.pages){const at=fit(pg);if(at)return at;}
 const pg={cv:null,shelves:[],y:0,wmax:0};A.pages.push(pg);return fit(pg);}
const slotCanvas=at=>at.own?(at.cv||(at.cv=canvas(at.w,at.h))):(at.pg.cv||(at.pg.cv=canvas(Math.max(1,at.pg.wmax),Math.max(1,at.pg.y))));
function paintSprite(it,SP){
 const kc=SP.kc,{bx,by,w,h}=spriteBox(it,kc),v=(it.sp&&it.sp.v||0)+1;
 if(!(w>0&&h>0)||!isFinite(w+h)){it.sp={cv:null,tex:null,kc,bx:0,by:0,sx:0,sy:0,w:0,h:0,v};return;}
 let at=it.slot&&w<=it.slot.cw&&h<=it.slot.ch?it.slot:null;
 if(!at){const sl=it.slot;if(sl&&sl.own){if(sl.cv)sl.cv.width=sl.cv.height=0;if(sl.tex&&SP.glh)SP.glh.free(sl.tex);}at=it.slot={...atlasSpot(SP.atlas,w,h),cw:w,ch:h};}
 // GL layer: painted in a scratch canvas at its own size and copied into the atlas texture at its slot
 if(SP.gl){const sc=scratch('spr',w,h),g=sc.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,w,h);g.save();
  const kr=KREF,m=MISS;KREF=1;MISS=SP.miss;try{it.draw(g,-2*bx,-2*by,{x:0,y:0,k:kc,rot:it.rot});}finally{KREF=kr;MISS=m;g.setTransform(1,0,0,1,0,0);g.restore();}
  const tex=at.own?(at.tex||(at.tex=SP.glh.tex(at.cw,at.ch))):(at.pg.tex||(at.pg.tex=SP.glh.tex(Math.max(1,at.pg.wmax),Math.max(1,at.pg.y))));
  SP.glh.put(tex,sc,at.sx,at.sy);it.sp={cv:null,tex,sx:at.sx,sy:at.sy,w,h,kc,bx,by,v};return;}
 const cv=slotCanvas(at),g=cv.getContext('2d');g.setTransform(1,0,0,1,0,0);g.save();g.beginPath();g.rect(at.sx,at.sy,w,h);g.clip();g.clearRect(at.sx,at.sy,w,h);
 const kr=KREF,m=MISS;KREF=1;MISS=SP.miss;try{it.draw(g,2*(at.sx-bx),2*(at.sy-by),{x:0,y:0,k:kc,rot:it.rot});}finally{KREF=kr;MISS=m;g.setTransform(1,0,0,1,0,0);g.restore();}
 it.sp={cv,sx:at.sx,sy:at.sy,w,h,kc,bx,by,v};}
// space backdrop: the star field is painted once and slid (wrapping) with the camera; a few stars twinkle live
let STARS=null;
function drawStars(x,W,H,cam,T){
 if(!STARS||STARS.w!==W||STARS.h!==H){const c=canvas(W,H),g=c.getContext('2d');g.fillStyle='#03021a';g.fillRect(0,0,W,H);const R=rnd(77);
  for(let i=0;i<160;i++){const px=R(),py=R(),d=.15+R()*.5;g.fillStyle=`rgba(255,255,255,${(.35+d)*.7})`;g.fillRect(px*W,py*H,d*3,d*3);}STARS={c,w:W,h:H};}
 const ox=Math.round(((-(cam.rot?-cam.y:cam.x)*cam.k*.08)%W+W)%W),oy=Math.round(((-(cam.rot?cam.x:cam.y)*cam.k*.08)%H+H)%H);
 for(const dx of [ox-W,ox])for(const dy of [oy-H,oy])if(dx<W&&dx+W>0&&dy<H&&dy+H>0)x.drawImage(STARS.c,dx,dy);
 const R=rnd(91);for(let i=0;i<14;i++){const px=R()*W,py=R()*H,tw=.5+.5*Math.sin(T*2+i*1.7);x.fillStyle=`rgba(255,255,255,${.8*tw})`;x.fillRect((px+ox)%W,(py+oy)%H,2,2);}
 const gx=W*.8,gy=H*.2,gr=W*.5,g=x.createRadialGradient(gx,gy,10,gx,gy,gr);g.addColorStop(0,'rgba(140,60,255,.25)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(gx-gr,gy-gr,gr*2,gr*2);
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
 const flash=Math.max(0,1-since*4),[X,Y]=proj(cam,W,H,p.x,p.y,p.z),r=p.r*cam.k,h=2.2*TS*cam.k,img=pic('bumper');
 x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(X+r*.15,Y+r*.15,r*1.05,r*TC*1.05,0,0,7);x.fill();
 if(img){x.drawImage(shrunk(img,r*2.1/img.width),X-r*1.05,Y-h-r*TC*1.05,r*2.1,r*2.1*TC);}
 else{x.fillStyle='#c0c6d2';x.fillRect(X-r,Y-h,r*2,h);x.beginPath();x.ellipse(X,Y,r,r*TC,0,0,Math.PI);x.fill();
  const g=x.createRadialGradient(X-r*.3,Y-h-r*.3,r*.1,X,Y-h,r);g.addColorStop(0,flash>0?'#fff':'#ff8ab0');g.addColorStop(1,flash>0?'#ffe14d':'#d81b60');x.fillStyle=g;x.beginPath();x.ellipse(X,Y-h,r,r*TC,0,0,7);x.fill();
  x.strokeStyle='#fff';x.lineWidth=Math.max(1,r*.12);x.beginPath();x.ellipse(X,Y-h,r*.6,r*.6*TC,0,0,7);x.stroke();}
 if(flash>0){x.fillStyle=`rgba(255,240,150,${flash*.5})`;x.beginPath();x.ellipse(X,Y-h,r*(1.3+flash),r*TC*(1.3+flash),0,0,7);x.fill();}
}
function flat(x,W,H,cam,name,cx,cy,z,w,ang,fb){
 // a picture lying on the ground centred on (cx,cy), w units across, turned by ang (radians, in world)
 {const [X,Y]=proj(cam,W,H,cx,cy,z),r=w*cam.k;const cr=x._cr;if(cr?(X+r<cr[0]||Y+r<cr[1]||X-r>cr[2]||Y-r>cr[3]):(X+r<0||Y+r<0||X-r>x.canvas.width||Y-r>x.canvas.height))return;if(x._bbx)growBB(x,X-r,Y-r,X+r,Y+r);}
 x._drew=true;
 const A=aff(cam,W,H,z);x.setTransform(...A);x.translate(cx,cy);if(ang)x.rotate(ang);
 let img=pic(name);const def=S.PICTURES[name];
 if(img&&def){img=shrunk(img,w*cam.k/((def.frame?def.frame[0]:def.size[0])*img.width/def.size[0]));const fw=def.frame?def.frame[0]:def.size[0],fh=def.frame?def.frame[1]:def.size[1],k=img.width/def.size[0],h=w*fh/fw,f=fb&&fb.frame||0;x.drawImage(img,f*fw*k,0,fw*k,fh*k,-w/2,-h/2,w,h);}
 else if(fb&&fb.draw)fb.draw(x);
 x.setTransform(1,0,0,1,0,0);
}
function groundThings(x,W,H,cam,st,anim){
 const {C,T}=st;
 if(anim)for(const b of C.boost){const g=C.topAt((b.box[0]+b.box[2])/2,(b.box[1]+b.box[3])/2),z=g?g.z:0,cx=(b.box[0]+b.box[2])/2,cy=(b.box[1]+b.box[3])/2,w=b.box[2]-b.box[0],h=b.box[3]-b.box[1],ang=Math.atan2(b.dir[1],b.dir[0])+Math.PI/2;
  flat(x,W,H,cam,'boost',cx,cy,z+.02,Math.max(w,h),ang,{draw:g2=>{g2.fillStyle='rgba(20,10,60,.85)';g2.fillRect(-w/2,-h/2,w,h);for(let i=0;i<4;i++){const f=((T*2.5+i/4)%1);g2.fillStyle=`hsla(${(T*200+i*40)%360},100%,60%,${.4+.6*(1-f)})`;const yy=h/2-f*h;g2.beginPath();g2.moveTo(-w*.35,yy+2);g2.lineTo(0,yy-1.5);g2.lineTo(w*.35,yy+2);g2.lineTo(w*.35,yy+3.2);g2.lineTo(0,yy-.3);g2.lineTo(-w*.35,yy+3.2);g2.fill();}g2.strokeStyle='#57e1ff';g2.lineWidth=.4;g2.strokeRect(-w/2,-h/2,w,h);}});}
 if(anim)for(const c of C.conv){const g=C.topAt(c.pts[0][0]+.5,c.pts[0][1]+.5),z=g?g.z:0;x._drew=true;if(x._bbx)for(const p of c.pts){const [X,Y]=proj(cam,W,H,p[0],p[1],z+.02);growBB(x,X-2,Y-2,X+2,Y+2);}const A=aff(cam,W,H,z+.02);x.setTransform(...A);x.beginPath();c.pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.save();x.clip();const pat=pattern(x,'conveyor|'+st.course.id,st.course.look,12),sp=Math.hypot(c.v[0],c.v[1]),off=(T*sp)%12;x.translate(0,c.v[1]<0?-off:off);x.fillStyle=pat;x.fillRect(c.box[0]-1,c.box[1]-13,c.box[2]-c.box[0]+2,c.box[3]-c.box[1]+26);x.restore();x.setTransform(1,0,0,1,0,0);}
 // a tunnel mouth right in front of the clown head is the clown's own mouth: no pipe drawn there
 const inClown=p=>C.blocks.some(b=>b.look==='clown'&&p[0]>=b.box[0]&&p[0]<=b.box[2]&&p[1]>=b.box[1]&&p[1]<=b.box[3]+4);
 for(const t of C.tunnels){const sp=st.course.look.space,live=sp&&!S.has('portal');if(live!==!!anim)continue;for(const [p,z,s] of [[t.a,t.z,1],[t.b,t.zb,.7]])if(!inClown(p))flat(x,W,H,cam,sp?'portal':'tunnel',p[0],p[1],z+.02,7*s,0,{draw:g=>{if(sp){for(let i=0;i<3;i++){g.strokeStyle=['#ff4dd2','#57e1ff','#ffe14d'][i];g.lineWidth=.5;g.beginPath();g.arc(0,0,2.9-i*.6+Math.sin(T*4+i)*.2,0,7);g.stroke();}g.fillStyle='#000';g.beginPath();g.arc(0,0,1.9,0,7);g.fill();}else{g.fillStyle='#6b7280';g.beginPath();g.arc(0,0,3.1,0,7);g.fill();g.fillStyle='#111';g.beginPath();g.arc(0,0,2.4,0,7);g.fill();g.fillStyle='rgba(255,255,255,.2)';g.beginPath();g.arc(0,0,3.1,3.6,5.2);g.lineTo(0,0);g.fill();}}});}
 if(!anim)for(const t of C.tramps)flat(x,W,H,cam,'tramp',t.x,t.y,t.z+.05,t.r*2.3,0,{draw:g=>{g.fillStyle='#333';g.beginPath();g.arc(0,0,t.r*1.12,0,7);g.fill();g.fillStyle='#2d7dff';g.beginPath();g.arc(0,0,t.r*.9,0,7);g.fill();g.strokeStyle='#ffd23f';g.lineWidth=.3;for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.beginPath();g.moveTo(Math.cos(a)*t.r*.9,Math.sin(a)*t.r*.9);g.lineTo(Math.cos(a)*t.r*1.1,Math.sin(a)*t.r*1.1);g.stroke();}}});
 if(!anim)for(const [mi,m] of C.movers.entries())if(m.kind==='gophers')for(const h of m.holes){const g=C.topAt(h[0],h[1]),z=g?g.z:0;flat(x,W,H,cam,'gopher-hole',h[0],h[1],z+.02,4,0,{draw:g2=>{g2.fillStyle='#6b4a2a';g2.beginPath();g2.ellipse(0,0,2,1.7,0,0,7);g2.fill();g2.fillStyle='#1a0f06';g2.beginPath();g2.ellipse(0,0,1.25,1.05,0,0,7);g2.fill();}});}
 // cup
 const cz=C.cupZ;if(!anim)flat(x,W,H,cam,'cup',C.hole.cup[0],C.hole.cup[1],cz+.01,P.CUP_R*2.4,0,{draw:g=>{g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(0,0,P.CUP_R+.35,0,7);g.fill();g.fillStyle='#0a0a0a';g.beginPath();g.arc(0,0,P.CUP_R,0,7);g.fill();g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.arc(0,P.CUP_R*.35,P.CUP_R*.7,3.3,6.1);g.fill();}});
 if(anim&&st.lost&&!st.lostFound){const [lx,ly]=st.lost,g=C.topAt(lx,ly),z=g?g.z:0,tw=.6+.4*Math.sin(T*6);flat(x,W,H,cam,'lost-ball',lx,ly,z+.03,3,0,{draw:g2=>{g2.fillStyle=`rgba(255,230,120,${.25*tw})`;g2.beginPath();g2.arc(0,0,2.6,0,7);g2.fill();g2.fillStyle='#ddd6c4';g2.beginPath();g2.arc(0,0,1,0,7);g2.fill();g2.fillStyle='rgba(120,90,40,.5)';g2.beginPath();g2.arc(.3,.2,.4,0,7);g2.fill();}});}
}
function moverItems(x,W,H,cam,st,m,items){
 const {C,T}=st,parts=st.parts||{segs:[],hazards:[]};
 if(m.kind==='windmill'){const [hx,hy,hw,hh]=m.house,cx=hx+hw/2,fy=hy+hh,g=C.topAt(cx,fy-1),z=g?g.z:0,[X,Y]=proj(cam,W,H,cx,fy,z),k=cam.k;
  items.push({y:Y,bb:millBB(X,Y,k,hw,m),f:()=>{drawWindmill(x,X,Y,k,hw,m,T);}});}
 else if(m.kind==='slider'){const per=m.period||3,f=.5-.5*Math.cos((T/per+(m.ph||0))*Math.PI*2),pts=m.pts.map(p=>[p[0]+m.a[0]*f,p[1]+m.a[1]*f]),g=C.topAt(pts[0][0],pts[0][1]),base=g?g.z:0;let my=-1e9;for(const p of pts)my=Math.max(my,proj(cam,W,H,p[0],p[1],base)[1]);
  items.push({y:my,bb:ptsBB(cam,W,H,pts,base,base+2.6),f:()=>drawBlock(x,W,H,cam,pts,base,base+2.6,'slider',st.course.look)});}
 else if(m.kind==='spinner'){const g=C.topAt(m.x,m.y),z=g?g.z:0,[,Y]=proj(cam,W,H,m.x,m.y,z),a=T*(m.speed||1.5)+(m.ph||0);
  const L1=m.len+1.5;items.push({y:Y,bb:ptsBB(cam,W,H,[[m.x-L1,m.y-L1],[m.x+L1,m.y-L1],[m.x-L1,m.y+L1],[m.x+L1,m.y+L1]],z,z+2.2),f:()=>{const c=Math.cos(a)*m.len,s=Math.sin(a)*m.len,w=.9;const pts=[[m.x-c-s/m.len*w,m.y-s+c/m.len*w],[m.x+c-s/m.len*w,m.y+s+c/m.len*w],[m.x+c+s/m.len*w,m.y+s-c/m.len*w],[m.x-c+s/m.len*w,m.y-s-c/m.len*w]];drawBlock(x,W,H,cam,pts,z,z+2,'spin',st.course.look);
   const [X2,Y2]=proj(cam,W,H,m.x,m.y,z+2);x.fillStyle='#ffd23f';x.beginPath();x.arc(X2,Y2,Math.max(2,cam.k*1.1),0,7);x.fill();}});}
 else if(m.kind==='gate'){const shut=parts.segs.some(s=>s.kind==='gate'&&Math.abs(s.x1-m.a[0])<.01&&Math.abs(s.y1-m.a[1])<.01),g=C.topAt(m.a[0],m.a[1]-2),z=g?g.z:0;
  if(m.look==='teeth'){const blk=C.blocks.find(b=>b.look==='clown');const cx=(m.a[0]+m.b[0])/2,[X,Y]=proj(cam,W,H,cx,blk?blk.box[3]:m.a[1],z),[,GY]=proj(cam,W,H,cx,m.a[1],z),gw=Math.abs(m.b[0]-m.a[0]);const wU=blk?(blk.artW||blk.box[2]-blk.box[0]):22;items.push({y:Y,bb:clownBB(X,Y,cam.k,wU,GY),f:()=>drawClown(x,X,Y,cam.k,wU,shut,T,GY,gw)});}
  else{const [,Y]=proj(cam,W,H,m.a[0],m.a[1],z);items.push({y:Y,bb:ptsBB(cam,W,H,[[m.a[0],m.a[1]-.5],[m.b[0],m.b[1]-.5],[m.b[0],m.b[1]+.5],[m.a[0],m.a[1]+.5]],z,z+2.2),f:()=>{if(!shut)return;const pts=[[m.a[0],m.a[1]-.5],[m.b[0],m.b[1]-.5],[m.b[0],m.b[1]+.5],[m.a[0],m.a[1]+.5]];drawBlock(x,W,H,cam,pts,z,z+2.2,'gate',st.course.look);}});}}
 else if(m.kind==='gator'){const p=P.gatorAt(m,T),g=C.topAt(p.x,p.y),z=g?g.z:0,[X,Y]=proj(cam,W,H,p.x,p.y,z),e=13*cam.k;
  items.push({y:Y,bb:BB(X-e,Y-e,X+e,Y+e),f:()=>{flat(x,W,H,cam,'gator',p.x,p.y,z+.3,16,p.ang,{frame:Math.floor(T*4)%2,draw:g2=>drawGator(g2,T)});}});}
 else if(m.kind==='gophers'){const mi=C.movers.indexOf(m),go=P.gopherAt(m,T,mi);if(go.up>0){const g=C.topAt(go.x,go.y),z=g?g.z:0,[X,Y]=proj(cam,W,H,go.x,go.y,z);const e=5*cam.k;items.push({y:Y+.1,bb:BB(X-e,Y-e*2.2,X+e,Y+e*.6),f:()=>drawGopher(x,X,Y,cam.k,go.up)});}}
}
const UB=(a,b)=>[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])];
function millBB(X,Y,k,hw,m){const img=S.picture('windmill-house'),d=S.PICTURES['windmill-house'],dw=d&&d.door?(d.door[1][0]-d.door[0][0])/d.size[0]:1,W2=(img?m.w/dw:hw)*k,H2=img?W2*img.height/img.width:W2*1.5,R=m.r*k*1.15,hy=Y-(m.hub||m.r)*k;
 return UB(BB(X-W2*1.2,Y-H2*1.25,X+W2*1.2,Y+W2*.3),BB(X-R,hy-R,X+R,hy+R));}
function clownBB(X,Y,k,wU,GY){const W2=wU*k,img=S.picture('clown-head'),H2=img?W2*img.height/img.width:W2*2.2;return BB(X-W2*1.15,Y-H2*1.25,X+W2*1.15,Math.max(Y,GY)+W2*.35);}
// the house picture is sized so its door is exactly the lane's door (m.w) and the sails turn at the height physics.js
// blocks them at (m.hub, reach m.r): what you see stopping the ball is what stops it
function drawWindmill(x,X,Y,k,hw,m,T){
 const img=pic('windmill-house'),bl=pic('windmill-blades'),d=S.PICTURES['windmill-house'],dw=(d.door[1][0]-d.door[0][0])/d.size[0];
 const W2=(img?m.w/dw:hw)*k;
 if(img){const sc=W2/img.width,dx=((d.door[0][0]+d.door[1][0])/2-d.foot[0])/d.size[0]*W2;x.drawImage(shrunk(img,sc),X-dx-d.foot[0]/d.size[0]*img.width*sc,Y-d.foot[1]/d.size[1]*img.height*sc,img.width*sc,img.height*sc);}
 else{const h=W2*.9;x.fillStyle='#b9874f';x.beginPath();x.moveTo(X-W2*.5,Y);x.lineTo(X-W2*.38,Y-h);x.lineTo(X+W2*.38,Y-h);x.lineTo(X+W2*.5,Y);x.closePath();x.fill();x.fillStyle='rgba(0,0,0,.15)';for(let i=1;i<6;i++){x.fillRect(X-W2*.46+i*0,Y-h*i/6,W2*.92,1.2);}
  x.fillStyle='#8a2f2a';x.beginPath();x.moveTo(X-W2*.46,Y-h);x.lineTo(X,Y-h-W2*.42);x.lineTo(X+W2*.46,Y-h);x.fill();
  const dw=m.w*k;x.fillStyle='#1a0f08';x.beginPath();x.moveTo(X-dw/2,Y);x.lineTo(X-dw/2,Y-dw*.8);x.arc(X,Y-dw*.8,dw/2,Math.PI,0);x.lineTo(X+dw/2,Y);x.fill();
  x.fillStyle='#ffe9a0';x.fillRect(X-W2*.25,Y-h*.62,W2*.12,W2*.12);x.fillRect(X+W2*.13,Y-h*.62,W2*.12,W2*.12);}
 const hubY=Y-(m.hub||m.r)*k,a=T*(m.speed||1.4)+(m.ph||0),n=m.blades||4,R=m.r*k,bw=R*.13;
 x.save();x.translate(X,hubY);
 if(bl){const bd=S.PICTURES['windmill-blades'],sc=(2*m.r*k/(bd.reach||1))/img_w(bl);x.rotate(a-Math.PI/2);x.drawImage(shrunk(bl,sc),-bl.width*sc/2,-bl.height*sc/2,bl.width*sc,bl.height*sc);}
 else for(let i=0;i<n;i++){x.save();x.rotate(a+i*Math.PI*2/n);x.fillStyle='#6b4423';x.fillRect(0,-R*.03,R,R*.06);x.fillStyle='rgba(245,240,225,.95)';x.fillRect(R*.3,-bw,R*.7,bw*2);x.strokeStyle='#6b4423';x.lineWidth=Math.max(1,R*.015);x.strokeRect(R*.3,-bw,R*.7,bw*2);for(let j=1;j<5;j++){x.beginPath();x.moveTo(R*(.3+j*.14),-bw);x.lineTo(R*(.3+j*.14),bw);x.stroke();}x.restore();}
 x.fillStyle='#3a2a1a';x.beginPath();x.arc(0,0,Math.max(3,R*.08),0,7);x.fill();x.restore();
}
const img_w=im=>im.width||im.naturalWidth||1;
function drawClown(x,X,Y,k,wU,shut,T,GY=Y,gw=9.5){
 const W2=wU*k,img=pic('clown-head'),tt=pic('clown-teeth'),mw=gw*k;
 if(img){const d=S.PICTURES['clown-head'],sc=W2/img.width;x.drawImage(shrunk(img,sc),X-d.foot[0]/d.size[0]*img.width*sc,Y-d.foot[1]/d.size[1]*img.height*sc,img.width*sc,img.height*sc);}
 else{const r=W2*.5,cy=Y-r*1.05;x.fillStyle='#ff6fa8';x.beginPath();x.arc(X-r*.95,cy-r*.45,r*.4,0,7);x.arc(X+r*.95,cy-r*.45,r*.4,0,7);x.fill();
  x.fillStyle='#fff3e4';x.beginPath();x.arc(X,cy,r,0,7);x.fill();x.fillStyle='#ff2d55';x.beginPath();x.arc(X,cy-r*.05,r*.16,0,7);x.fill();
  for(const s of [-1,1]){x.fillStyle='#111';x.beginPath();x.ellipse(X+s*r*.38,cy-r*.38,r*.1,r*.14,0,0,7);x.fill();x.fillStyle='#4da6ff';x.beginPath();x.moveTo(X+s*r*.38,cy-r*.62);x.lineTo(X+s*r*.3,cy-r*.75);x.lineTo(X+s*r*.46,cy-r*.75);x.fill();}
  x.fillStyle='#ffd23f';x.beginPath();x.moveTo(X-r*.45,cy-r*.85);x.lineTo(X,cy-r*1.75);x.lineTo(X+r*.45,cy-r*.85);x.fill();x.fillStyle='#ff2d55';x.beginPath();x.arc(X,cy-r*1.75,r*.1,0,7);x.fill();
  x.fillStyle='#c4002f';x.beginPath();x.moveTo(X-mw/2-r*.12,Y-r*.08);x.quadraticCurveTo(X,Y-r*.75,X+mw/2+r*.12,Y-r*.08);x.lineTo(X+mw/2,Y);x.lineTo(X-mw/2,Y);x.fill();x.fillStyle='#0b0b0b';x.beginPath();x.moveTo(X-mw/2,Y);x.quadraticCurveTo(X,Y-r*.58,X+mw/2,Y);x.fill();}
 // teeth: down = shut, drawn on the line where the jaw stops the ball (physics gate), as wide as it
 const ty=shut?GY-1:Y-mw*.55;x.fillStyle='#fffdf2';x.strokeStyle='#333';x.lineWidth=1;
 if(tt){const sc=mw/tt.width;x.drawImage(shrunk(tt,sc),X-mw/2,ty-tt.height*sc,mw,tt.height*sc);}else{for(let i=0;i<5;i++){const tx=X-mw/2+i*mw/5;x.beginPath();x.moveTo(tx,ty-mw*.32);x.lineTo(tx+mw/5,ty-mw*.32);x.lineTo(tx+mw/10,ty);x.closePath();x.fill();x.stroke();}}
}
function drawGator(g,T){const w=Math.sin(T*8)*.5;g.fillStyle='#3d7a34';g.beginPath();g.ellipse(0,0,5,1.8,0,0,7);g.fill();g.beginPath();g.moveTo(-4,0);g.quadraticCurveTo(-7,w*2,-8,w*3);g.lineTo(-4,1);g.fill();g.fillStyle='#4f9a44';g.beginPath();g.moveTo(4,-1.3);g.lineTo(8,-.6);g.lineTo(8,.6);g.lineTo(4,1.3);g.fill();for(const [lx,ly] of [[2.5,-1.8],[2.5,1.8],[-2.5,-1.8],[-2.5,1.8]]){g.fillStyle='#2f6228';g.beginPath();g.ellipse(lx+w*.3,ly*1.25,.8,.5,0,0,7);g.fill();}g.fillStyle='#ffe14d';g.beginPath();g.arc(5,-.8,.35,0,7);g.arc(5,.8,.35,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=.15;g.beginPath();for(let i=0;i<5;i++){g.moveTo(5.4+i*.5,-.6);g.lineTo(5.6+i*.5,-.3);}g.stroke();}
function drawGopher(x,X,Y,k,up){let img=pic('gopher');const w=5*k;if(img){img=shrunk(img,w/(img.width/3));const d=S.PICTURES.gopher,f=up<.5?0:up<.9?1:2,fw=img.width/3;x.drawImage(img,f*fw,0,fw,img.height,X-w/2,Y-w*(d.foot[1]/d.frame[1]),w,w);return;}
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
 const img=pic('ball');
 if(img)x.drawImage(shrunk(img,2*r/img.width),X-r,Y-r,r*2,r*2);else{const g=x.createRadialGradient(X-r*.35,Y-r*.4,r*.1,X,Y,r);g.addColorStop(0,'#ffffff');g.addColorStop(.7,'#eef0f2');g.addColorStop(1,'#b9bec6');x.fillStyle=g;x.beginPath();x.arc(X,Y,r,0,7);x.fill();}
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

Object.assign(exports,{setGL,TC,TS,LAWN_Z,proj,unproj,aff,drawHole,prepareHole,freeHole,cacheStats,warmPictures,drawProp,rollOrient,settleOrient,newOrient,texture,pattern,FALLBACK});
