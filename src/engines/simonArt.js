// SIMON ART (owner, Nov 20: look like the real Simon, dead on; background = a 90s kid's bedroom with stuff everywhere).
// Every picture is optional: assets/simon/<name>.webp|png -> USER_PORTRAITS['simon:<name>'] (tools/build.mjs); with none in,
// everything is drawn here. Brief + sizes: docs/art-for-gpt/SIMON-ART.md, templates: node tools/simon-templates.mjs.
//  simon-dim                      the toy seen straight from above, all four pads dark, 1024x1024, transparent round it
//  simon-green|red|yellow|blue    the SAME picture with only that pad lit (the game shows only that pad's quarter of it)
//  bg (1080x1920 tall) / bg-wide (1920x1080) / bg-fold (1504x1670, near-square)   the kid's bedroom floor seen from above; the toy sits in the middle
// The toy's body circle is centred on the 1024 square with radius BODY (481 px); tools/simon/import.py finds the circle on
// the owner's pictures and scales/moves them to that.
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const NAMES=['green','red','yellow','blue'];      // pad order: top-left, top-right, bottom-left, bottom-right
const TEMPLATE=1024,BODY=481;
// geometry as fractions of the body radius (real Simon: thin black rim, a black cross between the pads, a centre console)
const G={padOut:.905,padIn:.445,disc:.415,gap:.052};
const DIM=['#0a6a35','#8a1612','#9c820c','#0b3a86'];
const LIT=['#35ff7c','#ff3d2e','#fff04d','#3d9bff'];
const HOT=['#d8ffe6','#ffd6cc','#fffbe0','#d8ecff'];

const imgs=new Map();
function picture(name){const url=USER['simon:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const has=name=>!!USER['simon:'+name];
function preload(){for(const n of ['simon-dim',...NAMES.map(n=>'simon-'+n),'bg','bg-wide','bg-fold'])if(has(n))picture(n);}
// art is ready to draw when the dim toy (and every lit one that exists) has loaded
function toyArt(){const d=picture('simon-dim');return d?{dim:d,lit:NAMES.map(n=>picture('simon-'+n))}:null;}

// which pad a point is on (tolerant: the whole quarter from just outside the console to the rim), or -1
function padAt(px,py,cx,cy,R){const dx=px-cx,dy=py-cy,d=Math.hypot(dx,dy);if(d<R*(G.disc+.03)||d>R*1.04)return -1;return (dy<0?0:2)+(dx<0?0:1);}

// the quarter a pad lives in, cut back from the black cross
function quarterClip(x,q,cx,cy,R,g=0){const sx=q%2?1:-1,sy=q<2?-1:1;x.beginPath();x.rect(cx+sx*g,cy+sy*g,sx*R*1.1,sy*R*1.1);x.clip();}
function padPath(x,q,cx,cy,R){const a0=[Math.PI,1.5*Math.PI,.5*Math.PI,0][q],ro=R*G.padOut,ri=R*G.padIn;
 x.beginPath();x.arc(cx,cy,ro,a0,a0+Math.PI/2);x.arc(cx,cy,ri,a0+Math.PI/2,a0,true);x.closePath();}

// ---- drawn toy (fallback). lit = [bool x4]
function drawToyShape(x,cx,cy,R,lit,t){
 // body
 let g=x.createRadialGradient(cx-R*.25,cy-R*.3,R*.1,cx,cy,R);g.addColorStop(0,'#3a3a3a');g.addColorStop(.7,'#161616');g.addColorStop(1,'#050505');
 x.fillStyle=g;x.beginPath();x.arc(cx,cy,R,0,7);x.fill();
 x.lineWidth=Math.max(1,R*.012);x.strokeStyle='rgba(255,255,255,.18)';x.beginPath();x.arc(cx,cy,R*.985,Math.PI*1.05,Math.PI*1.7);x.stroke();
 x.strokeStyle='rgba(0,0,0,.8)';x.beginPath();x.arc(cx,cy,R*.93,0,7);x.stroke();
 // pads
 for(let q=0;q<4;q++){x.save();quarterClip(x,q,cx,cy,R,R*G.gap/2);padPath(x,q,cx,cy,R);x.clip();
  const on=lit[q],sx=q%2?1:-1,sy=q<2?-1:1,mx=cx+sx*R*.48,my=cy+sy*R*.48;
  g=x.createRadialGradient(mx-sx*R*.05,my-sy*R*.05,R*.02,mx,my,R*.62);
  if(on){g.addColorStop(0,HOT[q]);g.addColorStop(.35,LIT[q]);g.addColorStop(1,shade(LIT[q],.7));}
  else{g.addColorStop(0,shade(DIM[q],1.18));g.addColorStop(1,shade(DIM[q],.62));}
  x.fillStyle=g;x.fillRect(cx-R,cy-R,R*2,R*2);
  // plastic: fine concentric ridges + a soft top-left sheen
  x.strokeStyle=on?'rgba(255,255,255,.08)':'rgba(0,0,0,.12)';x.lineWidth=Math.max(.5,R*.004);
  for(let r=R*G.padIn+R*.03;r<R*G.padOut;r+=R*.022){x.beginPath();x.arc(cx,cy,r,0,7);x.stroke();}
  g=x.createLinearGradient(cx-R,cy-R,cx+R*.2,cy+R*.2);g.addColorStop(0,'rgba(255,255,255,.22)');g.addColorStop(.45,'rgba(255,255,255,0)');
  x.fillStyle=g;x.fillRect(cx-R,cy-R,R*2,R*2);
  // edge bevel
  x.lineWidth=R*.03;x.strokeStyle='rgba(0,0,0,.45)';padPath(x,q,cx,cy,R);x.stroke();
  x.restore();}
 // centre console
 const D=R*G.disc;g=x.createRadialGradient(cx,cy-D*.3,D*.1,cx,cy,D);g.addColorStop(0,'#2b2b2b');g.addColorStop(1,'#111');
 x.fillStyle=g;x.beginPath();x.arc(cx,cy,D,0,7);x.fill();
 x.lineWidth=D*.05;x.strokeStyle='#3d3d3d';x.beginPath();x.arc(cx,cy,D*.97,0,7);x.stroke();
 x.lineWidth=D*.025;x.strokeStyle='#000';x.beginPath();x.arc(cx,cy,D*1.02,0,7);x.stroke();
 // name (our own plain lettering, no maker's logo)
 x.save();x.fillStyle='#f4f4f4';x.textAlign='center';x.textBaseline='middle';x.font=`italic 900 ${D*.42}px "Arial Black",Arial,sans-serif`;
 x.fillText('simon',cx,cy-D*.44);x.restore();
 // LAST  START  LONGEST buttons
 const by=cy+D*.06,bs=D*.15;
 const btn=(bx,col,label)=>{x.fillStyle='#000';x.beginPath();x.arc(bx,by,bs*1.18,0,7);x.fill();
  const bg=x.createRadialGradient(bx-bs*.3,by-bs*.3,bs*.1,bx,by,bs);bg.addColorStop(0,shade(col,1.35));bg.addColorStop(1,shade(col,.7));
  x.fillStyle=bg;x.beginPath();x.arc(bx,by,bs,0,7);x.fill();
  x.fillStyle='#cfcfcf';x.font=`700 ${D*.095}px Arial,sans-serif`;x.textAlign='center';x.textBaseline='top';x.fillText(label,bx,by+bs*1.35);};
 btn(cx-D*.5,'#d8b21c','LAST');btn(cx,'#c92a1c','START');btn(cx+D*.5,'#d8b21c','LONGEST');
 // slide switches
 const sw=(sx,w,n,pos,label)=>{const sy=cy+D*.62,h=D*.1;x.fillStyle='#050505';x.fillRect(sx-w/2,sy-h/2,w,h);x.fillStyle='#9a9a9a';x.fillRect(sx-w/2+w*(pos/(n-1))*.8,sy-h/2+1,w*.2,h-2);
  x.fillStyle='#9d9d9d';x.font=`700 ${D*.075}px Arial,sans-serif`;x.textAlign='center';x.textBaseline='top';x.fillText(label,sx,sy+h*.75);};
 sw(cx-D*.38,D*.36,2,1,'OFF  ON');sw(cx+D*.3,D*.5,4,0,'SKILL 1 2 3 4');
}
function shade(hex,k){const n=parseInt(hex.slice(1),16),c=v=>Math.max(0,Math.min(255,Math.round(v*k)));
 return `rgb(${c(n>>16)},${c(n>>8&255)},${c(n&255)})`;}

// lit glow spilling past the pad (both drawn and picture versions)
function drawGlow(x,q,cx,cy,R,k=1){const sx=q%2?1:-1,sy=q<2?-1:1,mx=cx+sx*R*.5,my=cy+sy*R*.5;
 x.save();x.globalCompositeOperation='lighter';const g=x.createRadialGradient(mx,my,0,mx,my,R*.95);
 g.addColorStop(0,hexA(LIT[q],.34*k));g.addColorStop(.5,hexA(LIT[q],.12*k));g.addColorStop(1,hexA(LIT[q],0));
 x.fillStyle=g;x.fillRect(mx-R,my-R,R*2,R*2);x.restore();}
function hexA(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`;}

// the toy: shadow on the floor, then the picture (dim + lit quarters) or the drawn one
function drawToy(x,cx,cy,R,lit,t=0){
 x.save();x.fillStyle='rgba(0,0,0,.45)';x.filter='blur('+Math.round(R*.06)+'px)';x.beginPath();x.ellipse(cx+R*.05,cy+R*.09,R*1.01,R*1.0,0,0,7);x.fill();x.restore();
 const art=toyArt();
 if(art){const k=R/BODY,S=TEMPLATE*k,x0=cx-S/2,y0=cy-S/2;x.drawImage(art.dim,x0,y0,S,S);
  for(let q=0;q<4;q++)if(lit[q]){const p=art.lit[q];x.save();quarterClip(x,q,cx,cy,R*1.02);
   if(p){x.beginPath();x.arc(cx,cy,R*1.0,0,Math.PI*2);x.moveTo(cx+R*G.disc,cy);x.arc(cx,cy,R*G.disc,0,Math.PI*2);x.clip('evenodd');x.drawImage(p,x0,y0,S,S);}
   else{padPath(x,q,cx,cy,R);x.clip();x.globalCompositeOperation='lighter';x.fillStyle=hexA(LIT[q],.75);x.fillRect(cx-R,cy-R,R*2,R*2);}
   x.restore();}}
 else drawToyShape(x,cx,cy,R,lit,t);
 for(let q=0;q<4;q++)if(lit[q])drawGlow(x,q,cx,cy,R,art?.7:1);
}

// ---- the room: picture (cover) or drawn: looking down at a 90s kid's bedroom carpet, stuff all over it, middle clear
const roomCache={key:'',cv:null};
function drawRoom(x,W,H,cx,cy,R){
 const pic=require("src/bgShape.js").pick(W,H,{tall:'bg',wide:'bg-wide',fold:'bg-fold'},picture);
 if(pic){const k=Math.max(W/pic.naturalWidth,H/pic.naturalHeight),w=pic.naturalWidth*k,h=pic.naturalHeight*k;x.drawImage(pic,(W-w)/2,(H-h)/2,w,h);return;}
 const key=[W,H,Math.round(cx),Math.round(cy),Math.round(R)].join(',');
 if(roomCache.key!==key&&typeof document!=='undefined'){const cv=document.createElement('canvas');cv.width=W;cv.height=H;paintRoom(cv.getContext('2d'),W,H,cx,cy,R);roomCache.key=key;roomCache.cv=cv;}
 if(roomCache.cv)x.drawImage(roomCache.cv,0,0);
}
function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function paintRoom(x,W,H,cx,cy,R){
 const r=rng(1990);
 // teal arcade-carpet with 90s squiggles, triangles and dots
 x.fillStyle='#173a4a';x.fillRect(0,0,W,H);
 const cols=['#ff3ea5','#ffd23f','#3ee7ff','#9b5cff','#7dff6a'];
 for(let i=0;i<W*H/900;i++){const px=r()*W,py=r()*H,c=cols[i%5],k=r();x.save();x.translate(px,py);x.rotate(r()*7);x.globalAlpha=.55;
  if(k<.4){x.strokeStyle=c;x.lineWidth=2.2;x.beginPath();x.moveTo(-7,0);x.quadraticCurveTo(-3,-6,0,0);x.quadraticCurveTo(3,6,7,0);x.stroke();}
  else if(k<.7){x.fillStyle=c;x.beginPath();x.moveTo(0,-5);x.lineTo(5,4);x.lineTo(-5,4);x.closePath();x.fill();}
  else{x.fillStyle=c;x.beginPath();x.arc(0,0,2.2,0,7);x.fill();}x.restore();}
 const shadow=(f)=>{x.save();x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=10;x.shadowOffsetX=4;x.shadowOffsetY=6;f();x.restore();};
 const clearOf=(px,py,m)=>Math.hypot(px-cx,py-cy)>R*1.12+m;
 const things=[];const spot=m=>{for(let k=0;k<60;k++){const px=r()*W,py=r()*H;if(clearOf(px,py,m)&&things.every(t=>Math.hypot(t[0]-px,t[1]-py)>t[2]+m))
  {things.push([px,py,m]);return [px,py];}}return null;};
 const u=Math.min(W,H)/390;
 // green slime splats
 for(let i=0;i<3;i++){const p=spot(34*u);if(!p)continue;shadow(()=>{x.fillStyle='#7ee81c';x.beginPath();for(let a=0;a<14;a++){const rr=(a%2?18:30)*u*(.8+r()*.4),an=a/14*Math.PI*2;x.lineTo(p[0]+Math.cos(an)*rr,p[1]+Math.sin(an)*rr);}x.closePath();x.fill();});
  x.fillStyle='rgba(255,255,255,.35)';x.beginPath();x.ellipse(p[0]-8*u,p[1]-8*u,7*u,4*u,-.6,0,7);x.fill();}
 // orange splat-shaped sticker
 {const p=spot(30*u);if(p)shadow(()=>{x.fillStyle='#ff7a12';x.beginPath();for(let a=0;a<18;a++){const rr=(a%2?15:26)*u,an=a/18*Math.PI*2;x.lineTo(p[0]+Math.cos(an)*rr,p[1]+Math.sin(an)*rr);}x.closePath();x.fill();});}
 // foam darts (blue body, orange tip)
 for(let i=0;i<9;i++){const p=spot(16*u);if(!p)continue;x.save();x.translate(p[0],p[1]);x.rotate(r()*7);shadow(()=>{x.fillStyle='#2f7cff';x.fillRect(-14*u,-3.2*u,22*u,6.4*u);x.fillStyle='#ff8a1c';x.beginPath();x.arc(8*u,0,3.6*u,-1.6,1.6);x.fill();});x.restore();}
 // black game cartridges with a label
 for(let i=0;i<5;i++){const p=spot(26*u);if(!p)continue;x.save();x.translate(p[0],p[1]);x.rotate(r()*1.2-.6);shadow(()=>{x.fillStyle='#151515';x.fillRect(-17*u,-21*u,34*u,42*u);});
  x.fillStyle=cols[i%5];x.fillRect(-13*u,-17*u,26*u,22*u);x.fillStyle='#222';for(let k=0;k<5;k++)x.fillRect(-13*u+k*6*u,12*u,3*u,7*u);x.restore();}
 // a black 3-button pad with its cord
 {const p=spot(40*u);if(p){x.save();x.translate(p[0],p[1]);x.rotate(r()*.8-.4);
  x.strokeStyle='#0c0c0c';x.lineWidth=2.5*u;x.beginPath();x.moveTo(0,-14*u);x.bezierCurveTo(10*u,-60*u,-40*u,-50*u,-30*u,-110*u);x.stroke();
  shadow(()=>{x.fillStyle='#1b1b1b';x.beginPath();x.ellipse(-16*u,0,18*u,15*u,0,0,7);x.ellipse(16*u,0,18*u,15*u,0,0,7);x.fill();x.fillRect(-16*u,-14*u,32*u,24*u);});
  x.fillStyle='#333';x.fillRect(-26*u,-3*u,14*u,5*u);x.fillRect(-21.5*u,-8*u,5*u,14*u);
  for(let k=0;k<3;k++){x.fillStyle='#555';x.beginPath();x.arc(8*u+k*7*u,3*u-k*3*u,3.2*u,0,7);x.fill();}x.restore();}}
 // a comic / magazine
 {const p=spot(34*u);if(p){x.save();x.translate(p[0],p[1]);x.rotate(r()*.9-.45);shadow(()=>{x.fillStyle='#ffe14a';x.fillRect(-26*u,-34*u,52*u,68*u);});
  x.fillStyle='#ff3ea5';x.fillRect(-22*u,-30*u,44*u,14*u);x.fillStyle='#3ee7ff';x.beginPath();x.arc(0,8*u,15*u,0,7);x.fill();x.restore();}}
 // scattered pogs
 for(let i=0;i<7;i++){const p=spot(9*u);if(!p)continue;shadow(()=>{x.fillStyle=cols[(i+2)%5];x.beginPath();x.arc(p[0],p[1],8*u,0,7);x.fill();});x.strokeStyle='#fff';x.lineWidth=1.2*u;x.beginPath();x.arc(p[0],p[1],5*u,0,7);x.stroke();}
 // glow-in-the-dark stars
 for(let i=0;i<10;i++){const p=spot(7*u);if(!p)continue;x.save();x.translate(p[0],p[1]);x.rotate(r()*7);x.fillStyle='rgba(214,255,170,.75)';x.beginPath();
  for(let a=0;a<10;a++){const rr=(a%2?2.6:6.5)*u,an=a/10*Math.PI*2;x.lineTo(Math.cos(an)*rr,Math.sin(an)*rr);}x.closePath();x.fill();x.restore();}
 // dim the edges a little so the toy stands out
 const v=x.createRadialGradient(cx,cy,R*.9,cx,cy,Math.hypot(W,H)*.65);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');x.fillStyle=v;x.fillRect(0,0,W,H);
}
Object.assign(exports,{NAMES,G,TEMPLATE,BODY,DIM,LIT,padAt,drawToy,drawToyShape,drawRoom,paintRoom,preload,toyArt,picture,has});
