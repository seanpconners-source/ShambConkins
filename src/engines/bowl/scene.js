// Kingpin Bowling: the alley in 3D (src/engines/bowl/gl.js draws it). Seven lanes side by side (yours in the middle), the
// approach, gutters, capping, kickbacks, the masking unit over the pins, ceiling lights, side walls, the ball return and
// the overhead score monitors. Every PART has an era look (src/data/bowlAlley.js ERAS / PARTS): painted here as canvas
// textures (a drop-in picture from src/data/bowlSprites.js replaces the painted one). Physics coordinates (metres, x to the
// right as the bowler looks down the lane, z down the lane from the foul line, y up); the camera flips x for the screen.
const PH=require("src/engines/bowl/physics.js");
const {builder,poseM,at}=require("src/engines/bowl/gl.js");
const SP=require("src/data/bowlSprites.js");
const {HALF,LANE_W,GUTTER_W,Z1,DECK_END,CURTAIN_Z,BALL_R,PIN_SHAPES}=PH;
const CAP_W=.12,PITCH=LANE_W+2*GUTTER_W+CAP_W,NEIGH=3,APP=-4.6,CEIL=3.35,MASK_Z=Z1-.62,MASK_Y=.92,MASK_TOP=2.55,BACK=-9.5;
const WALL_X=PITCH*(NEIGH+.5);
// ---------------------------------------------------------------- era palettes (per part)
const ST={
 ocelot:{lane:'#cf9f5c',lane2:'#b98549',head:'#d9b072',gut:'#8b8d90',cap:'#6b4428',kick:'#5b3a20',wall:'#6a4325',wall2:'#4e2f18',ceil:'#b6a785',carpet:'#a9521d',carpet2:'#6e2e0e',
  appr:'#c49554',light:[1,.93,.78],lightK:1.05,flicker:true,fog:[.16,.11,.07],amb:[.30,.24,.18],ambB:[.10,.07,.05],pin:'#efe5c8',stripe:'#9c2a1c',mask:['#d9792a','#7a3c12','#f1d9a6'],screen:'#ff9d2a',glow:0,spec:.35},
 starlanes:{lane:'#dcb479',lane2:'#c99c5d',head:'#e5c48d',gut:'#c9ccd2',cap:'#1f6f7c',kick:'#4a2b6e',wall:'#1d5d6a',wall2:'#5a2f7d',ceil:'#251d3d',carpet:'#3c1f62',carpet2:'#1d8b96',
  appr:'#d8b27a',light:[1,.86,.62],lightK:1.15,fog:[.06,.04,.10],amb:[.22,.2,.3],ambB:[.06,.05,.09],pin:'#f7f6f1',stripe:'#c5201b',mask:['#0f1b4a','#f6c544','#e5408c'],screen:'#6fd3ff',glow:0,spec:.55},
 cosmic:{lane:'#7d5b3a',lane2:'#6b4b2e',head:'#86643f',gut:'#16121f',cap:'#0d0b14',kick:'#0c0a12',wall:'#0b0814',wall2:'#ff2fb3',ceil:'#07050d',carpet:'#08060f',carpet2:'#38f0ff',
  appr:'#5c4330',light:[.55,.32,1],lightK:1.3,fog:[.03,.02,.07],amb:[.12,.08,.22],ambB:[.04,.02,.07],pin:'#f5fff2',stripe:'#ff2fb3',mask:['#05031a','#38f0ff','#ff2fb3'],screen:'#ff2fb3',glow:1,spec:.7},
 reno:{lane:'#e7c995',lane2:'#d9b47b',head:'#efd5a5',gut:'#18191c',cap:'#0c0d0f',kick:'#111215',wall:'#1a1c20',wall2:'#3aa8ff',ceil:'#0b0c0f',carpet:'#202227',carpet2:'#3aa8ff',
  appr:'#e2c48f',light:[.95,.98,1],lightK:1.45,fog:[.03,.035,.045],amb:[.26,.27,.3],ambB:[.07,.07,.08],pin:'#ffffff',stripe:'#d01717',mask:['#05070c','#3aa8ff','#ffffff'],screen:'#3aa8ff',glow:.4,spec:1},
 galactic:{lane:'#1d3f86',lane2:'#14306c',head:'#2a56aa',gut:'#0a1c3a',cap:'#0b1430',kick:'#0b1430',wall:'#050914',wall2:'#46e8ff',ceil:'#02040c',carpet:'#060b1c',carpet2:'#46e8ff',
  appr:'#1a2f60',light:[.55,.85,1],lightK:1.3,fog:[.01,.015,.05],amb:[.14,.18,.3],ambB:[.03,.04,.09],pin:'#d9fbff',stripe:'#ff4fd0',mask:['#02030c','#46e8ff','#ff4fd0'],screen:'#46e8ff',glow:1,spec:1},
};
const ERA_IDS=Object.keys(ST);
// ---------------------------------------------------------------- canvas helpers
const mk=(w,h)=>{if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(w,h);const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const rnd=s=>{let x=s>>>0||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};};
const shade=(hex,k)=>{const n=parseInt(hex.slice(1),16);const r=n>>16&255,g=n>>8&255,b=n&255;const f=v=>Math.max(0,Math.min(255,Math.round(k>1?v+(255-v)*(k-1):v*k)));return `rgb(${f(r)},${f(g)},${f(b)})`;};
const rgba=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;};
const shadeHex=(hex,k)=>'#'+shade(hex,k).match(/\d+/g).map(v=>(+v).toString(16).padStart(2,'0')).join('');
const col4=(hex,a=255)=>{const n=parseInt(hex.slice(1),16);return [n>>16&255,n>>8&255,n&255,a];};
function tiled(pic,w,h,cw,ch){const c=mk(w,h),x=c.getContext('2d');for(let y=0;y<h;y+=ch)for(let i=0;i<w;i+=cw)x.drawImage(pic,i,y,cw,ch);return c;}
// THE LANE: 256 x 4096 over the 39 boards and z 0..DECK_END. Boards with grain, the darker heads (first 15 ft) and pin deck,
// arrows at 15 ft, dots at 7 ft, range finders, the foul line, the pin spots on the deck. Drop-in boards-<era> tiles under it.
function paintLane(era){const s=ST[era],W=256,H=4096,c=mk(W,H),x=c.getContext('2d'),r=rnd(era.length*977+13),bw=W/39,zp=H/DECK_END;
 const pic=SP.picture('boards-'+era);
 if(pic){for(let y=0;y<H;y+=W*2)x.drawImage(pic,0,y,W,W*2);}
 else{for(let b=0;b<39;b++){const base=b%2?s.lane:s.lane2;x.fillStyle=base;x.fillRect(b*bw,0,bw+.5,H);
   // grain streaks + knots
   for(let k=0;k<90;k++){const y=r()*H,l=40+r()*240;x.fillStyle=`rgba(${r()<.5?'60,30,10':'255,240,210'},${.05+r()*.07})`;x.fillRect(b*bw+r()*bw,y,.8+r()*1.2,l);}
   if(era!=='galactic')for(let k=0;k<6;k++){x.fillStyle='rgba(60,30,10,.12)';const y=r()*H;x.beginPath();x.ellipse(b*bw+bw/2,y,bw*.35,6+r()*10,0,0,7);x.fill();}
   x.fillStyle='rgba(0,0,0,.28)';x.fillRect(b*bw,0,.8,H);}
  // board seams across (the planks are spliced)
  for(let k=0;k<160;k++){const b=Math.floor(r()*39),y=r()*H;x.fillStyle='rgba(0,0,0,.25)';x.fillRect(b*bw,y,bw,1);}
  // maple heads and the pin deck are lighter (different wood)
  x.fillStyle=rgba(s.head,.55);x.fillRect(0,0,W,15*PH.FT*zp);x.fillRect(0,(Z1-.9)*zp,W,H);}
 if(era==='galactic'){x.strokeStyle='rgba(70,232,255,.25)';x.lineWidth=1;for(let y=0;y<H;y+=64){x.beginPath();x.moveTo(0,y);x.lineTo(W,y);x.stroke();}}
 if(era==='ocelot'){// worn: the track area is darker and scuffed
  const g=x.createLinearGradient(0,0,W,0);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.25,'rgba(70,40,15,.18)');g.addColorStop(.38,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,W,H);}
 // foul line
 x.fillStyle=s.glow?'#ff2fb3':'#1a1410';x.fillRect(0,0,W,10);
 // arrows (boards 5,10,15,20,25,30,35) at 15 ft, staggered like a real lane (the middle one furthest)
 const mark=s.glow?'#38f0ff':'#2a1a10';
 for(const b of [5,10,15,20,25,30,35]){const cx=W-(b-.5)*bw,stag=(20-Math.abs(b-20))/15,y=(PH.ARROWS_Z-.9+stag*.9)*zp;
  x.fillStyle=mark;x.beginPath();x.moveTo(cx,y-46);x.lineTo(cx+bw*.62,y+16);x.lineTo(cx-bw*.62,y+16);x.closePath();x.fill();}
 // dots at 7 ft and range finders at 40 ft
 for(const b of [3,5,8,11,14,26,29,32,35,37]){const cx=W-(b-.5)*bw;x.fillStyle=mark;x.beginPath();x.arc(cx,PH.DOTS_Z*zp,bw*.32,0,7);x.fill();}
 for(const b of [10,30]){const cx=W-(b-.5)*bw;x.fillRect(cx-1.5,40*PH.FT*zp,3,3*PH.FT*zp);}
 // pin spots on the deck
 for(const p of PH.PIN_POS){x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.arc(W/2+p.x/LANE_W*W,p.z*zp,bw*.9,0,7);x.fill();}
 return c;}
// glow layer for blacklight lanes (additive): arrows, dots, edges, a few streaks
function paintLaneGlow(era){const W=256,H=2048,c=mk(W,H),x=c.getContext('2d'),bw=W/39,zp=H/DECK_END,s=ST[era];x.fillStyle='#000';x.fillRect(0,0,W,H);
 const a=s.mask[1],b=s.mask[2];x.fillStyle=b;x.fillRect(0,0,W,6);
 for(const bd of [5,10,15,20,25,30,35]){const cx=W-(bd-.5)*bw,stag=(20-Math.abs(bd-20))/15,y=(PH.ARROWS_Z-.9+stag*.9)*zp;x.fillStyle=a;x.beginPath();x.moveTo(cx,y-24);x.lineTo(cx+bw*.62,y+8);x.lineTo(cx-bw*.62,y+8);x.closePath();x.fill();}
 x.fillStyle=rgba(a,.55);x.fillRect(0,0,3,H);x.fillRect(W-3,0,3,H);
 if(era==='galactic'){x.fillStyle=rgba(a,.18);for(let y=0;y<H;y+=48)x.fillRect(0,y,W,2);}
 return c;}
function paintTile(era,kind){const s=ST[era],pic=SP.picture(kind+'-'+era);if(pic)return pic;const N=512,c=mk(N,N),x=c.getContext('2d'),r=rnd(kind.length*131+era.length*7);
 if(kind==='approach'){x.fillStyle=s.appr;x.fillRect(0,0,N,N);const bw=N/12;for(let b=0;b<12;b++){x.fillStyle=b%2?'rgba(0,0,0,.06)':'rgba(255,255,255,.05)';x.fillRect(b*bw,0,bw,N);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(b*bw,0,1,N);}
  for(let k=0;k<400;k++){x.fillStyle=`rgba(0,0,0,${r()*.06})`;x.fillRect(r()*N,r()*N,1,10+r()*60);}}
 else if(kind==='wall'){x.fillStyle=s.wall;x.fillRect(0,0,N,N);
  if(era==='ocelot'){for(let i=0;i<N;i+=32){x.fillStyle=i%64?'rgba(0,0,0,.18)':'rgba(255,220,170,.06)';x.fillRect(i,0,3,N);}for(let k=0;k<300;k++){x.fillStyle='rgba(40,20,5,.08)';x.fillRect(r()*N,r()*N,2,30+r()*90);}}
  else if(era==='starlanes'){x.fillStyle=s.wall2;x.fillRect(0,N*.62,N,N*.38);x.fillStyle='#f6c544';x.fillRect(0,N*.6,N,10);for(let k=0;k<7;k++)star(x,r()*N,r()*N*.5,10+r()*16,'#f6c544');x.fillStyle='rgba(255,255,255,.08)';x.fillRect(0,N*.2,N,4);}
  else if(era==='cosmic'){for(let k=0;k<14;k++){x.strokeStyle=[s.wall2,'#38f0ff','#d6ff3a'][k%3];x.lineWidth=3+r()*4;x.beginPath();x.moveTo(r()*N,r()*N);for(let j=0;j<4;j++)x.quadraticCurveTo(r()*N,r()*N,r()*N,r()*N);x.stroke();}}
  else if(era==='reno'){x.fillStyle='#24272d';for(let i=0;i<N;i+=128)x.fillRect(i,0,124,N);x.fillStyle=s.wall2;x.fillRect(0,N*.7,N,4);x.fillRect(0,N*.25,N,2);}
  else{x.fillStyle='#000';x.fillRect(0,0,N,N);for(let k=0;k<260;k++){x.fillStyle=`rgba(255,255,255,${r()})`;x.fillRect(r()*N,r()*N,1.5,1.5);}x.strokeStyle=s.wall2;x.lineWidth=6;x.strokeRect(10,10,N-20,N*.7);}}
 else if(kind==='ceiling'){x.fillStyle=s.ceil;x.fillRect(0,0,N,N);
  if(era==='ocelot'){x.strokeStyle='rgba(0,0,0,.25)';x.lineWidth=3;for(let i=0;i<=N;i+=128){x.beginPath();x.moveTo(i,0);x.lineTo(i,N);x.moveTo(0,i);x.lineTo(N,i);x.stroke();}for(let k=0;k<900;k++){x.fillStyle=`rgba(80,60,30,${r()*.2})`;x.fillRect(r()*N,r()*N,2,2);}
   x.fillStyle='rgba(120,80,20,.22)';x.beginPath();x.ellipse(N*.7,N*.3,70,45,0,0,7);x.fill();}
  else if(era==='galactic'||era==='cosmic'||era==='starlanes'){for(let k=0;k<(era==='starlanes'?40:200);k++){x.fillStyle=`rgba(255,255,255,${.2+r()*.8})`;const z=r()*2+.5;x.fillRect(r()*N,r()*N,z,z);}}
  else{x.fillStyle='#15171b';x.fillRect(0,0,N,N);x.strokeStyle='#22252b';x.lineWidth=4;for(let i=0;i<=N;i+=256)x.strokeRect(i,0,256,N);}}
 else if(kind==='carpet'){x.fillStyle=s.carpet;x.fillRect(0,0,N,N);
  if(era==='ocelot'){for(let k=0;k<4000;k++){x.fillStyle=`rgba(${r()<.5?'60,20,0':'230,140,60'},${r()*.25})`;x.fillRect(r()*N,r()*N,2,3);}for(let k=0;k<8;k++){x.strokeStyle=s.carpet2;x.lineWidth=10;x.beginPath();x.arc(r()*N,r()*N,30+r()*40,0,7);x.stroke();}}
  else if(era==='starlanes'){for(let k=0;k<12;k++)star(x,r()*N,r()*N,12+r()*14,k%2?'#f6c544':s.carpet2);}
  else if(era==='cosmic'){for(let k=0;k<26;k++){x.fillStyle=['#38f0ff','#ff2fb3','#d6ff3a','#ff9d2a'][k%4];const cx=r()*N,cy=r()*N,z=10+r()*26;if(k%3===0){x.beginPath();x.arc(cx,cy,z,0,7);x.fill();}else if(k%3===1){x.beginPath();x.moveTo(cx,cy-z);x.lineTo(cx+z,cy+z);x.lineTo(cx-z,cy+z);x.fill();}else{x.save();x.translate(cx,cy);x.rotate(r()*3);x.fillRect(-z,-3,2*z,6);x.restore();}}}
  else{for(let k=0;k<3000;k++){x.fillStyle=`rgba(255,255,255,${r()*.05})`;x.fillRect(r()*N,r()*N,2,2);}x.strokeStyle=rgba(s.carpet2,.4);x.lineWidth=2;for(let i=0;i<N;i+=64){x.beginPath();x.moveTo(i,0);x.lineTo(i+64,N);x.stroke();}}}
 else if(kind==='kickback'){x.fillStyle=s.kick;x.fillRect(0,0,N,N);
  if(era==='ocelot'){for(let i=0;i<N;i+=48){x.fillStyle='rgba(0,0,0,.2)';x.fillRect(i,0,3,N);}x.fillStyle='#d9792a';x.fillRect(0,N*.12,N,24);x.fillStyle='#f1d9a6';x.fillRect(0,N*.12+28,N,8);}
  else if(era==='starlanes'){for(let k=0;k<6;k++)star(x,r()*N,r()*N,14+r()*20,'#f6c544');}
  else if(era==='cosmic'){for(let k=0;k<40;k++){x.fillStyle=['#38f0ff','#ff2fb3','#d6ff3a'][k%3];x.beginPath();x.arc(r()*N,r()*N,3+r()*16,0,7);x.fill();}}
  else{x.fillStyle=s.wall2;x.fillRect(0,N*.1,N,6);x.fillRect(0,N*.85,N,6);}}
 return c;}
function star(x,cx,cy,R,col){x.fillStyle=col;x.beginPath();for(let i=0;i<10;i++){const a=i/10*Math.PI*2-Math.PI/2,r=i%2?R*.42:R;x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}x.closePath();x.fill();}
// THE MASKING: one panel per lane (1600 x 560): era murals; the lane number is painted on by the scene
function paintMasking(era,lane){const s=ST[era],W=1600,H=560,c=mk(W,H),x=c.getContext('2d'),pic=SP.picture('masking-'+era),r=rnd(lane*31+era.length);
 if(pic)x.drawImage(pic,0,0,W,H);
 else{const [a,b,cc]=s.mask;x.fillStyle=a;x.fillRect(0,0,W,H);
  if(era==='ocelot'){for(let i=0;i<5;i++){x.fillStyle=[b,cc,a,b,cc][i];x.fillRect(0,60+i*70,W,46);}
   x.fillStyle='rgba(255,240,200,.85)';for(let i=0;i<10;i++){const px=200+i*130,py=330;pinShape(x,px,py,90,'#f1e7cf','#a02a1c');}
   x.fillStyle='rgba(60,25,5,.22)';for(let k=0;k<40;k++)x.fillRect(r()*W,r()*H,40+r()*120,3);}
  else if(era==='starlanes'){const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0b1236');g.addColorStop(1,'#2b1450');x.fillStyle=g;x.fillRect(0,0,W,H);
   for(let k=0;k<26;k++)star(x,r()*W,r()*H*.8,8+r()*22,k%3?'#f6c544':'#ffffff');
   // a bowling ball comet
   const gg=x.createLinearGradient(300,300,1100,140);gg.addColorStop(0,'rgba(229,64,140,0)');gg.addColorStop(1,'rgba(229,64,140,.9)');x.fillStyle=gg;x.beginPath();x.moveTo(300,330);x.lineTo(1120,110);x.lineTo(1160,210);x.closePath();x.fill();
   x.fillStyle='#1a1a2e';x.beginPath();x.arc(1160,160,70,0,7);x.fill();x.fillStyle='#e5408c';x.beginPath();x.arc(1140,140,10,0,7);x.arc(1172,132,10,0,7);x.arc(1160,168,10,0,7);x.fill();}
  else if(era==='cosmic'){for(let k=0;k<7;k++){const g=x.createRadialGradient(r()*W,r()*H,0,r()*W,r()*H,200+r()*300);g.addColorStop(0,rgba([b,cc,'#d6ff3a'][k%3],.55));g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,W,H);}
   for(let k=0;k<300;k++){x.fillStyle=`rgba(255,255,255,${r()})`;x.fillRect(r()*W,r()*H,2,2);}
   x.strokeStyle=b;x.lineWidth=8;x.beginPath();x.ellipse(W*.7,H*.4,160,50,-.3,0,7);x.stroke();x.fillStyle=cc;x.beginPath();x.arc(W*.7,H*.4,60,0,7);x.fill();}
  else if(era==='reno'){x.fillStyle='#05070c';x.fillRect(0,0,W,H);for(let i=0;i<W;i+=16)for(let j=0;j<H-80;j+=16){x.fillStyle=`rgba(58,168,255,${.05+.1*Math.max(0,Math.sin(i*.01+j*.02))})`;x.fillRect(i,j,12,12);}
   x.fillStyle=cc;x.font='bold 150px Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('RENO',W/2,H*.4);x.fillStyle=b;x.fillRect(W*.2,H*.62,W*.6,8);}
  else{const g=x.createRadialGradient(W*.5,H*.4,10,W*.5,H*.4,W*.6);g.addColorStop(0,'#3a1f6e');g.addColorStop(.5,'#0d0a2a');g.addColorStop(1,'#02030c');x.fillStyle=g;x.fillRect(0,0,W,H);
   for(let k=0;k<500;k++){x.fillStyle=`rgba(255,255,255,${r()})`;const z=r()*2.5;x.fillRect(r()*W,r()*H,z,z);}
   x.fillStyle='#2a7bd6';x.beginPath();x.arc(W*.25,H*.45,90,0,7);x.fill();x.fillStyle='rgba(70,200,90,.8)';x.beginPath();x.ellipse(W*.23,H*.42,40,26,.5,0,7);x.fill();
   x.strokeStyle=b;x.lineWidth=4;x.beginPath();x.ellipse(W*.72,H*.4,120,30,.2,0,7);x.stroke();x.fillStyle=cc;x.beginPath();x.arc(W*.72,H*.4,46,0,7);x.fill();}}
 // the pinsetter band at the bottom + the lane number
 x.fillStyle='rgba(0,0,0,.85)';x.fillRect(0,H-80,W,80);
 x.fillStyle='rgba(0,0,0,.7)';x.fillRect(W/2-46,8,92,54);x.fillStyle=s.glow?s.mask[1]:'#f1e7cf';x.font='bold 40px Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(lane),W/2,36);
 return c;}
function pinShape(x,cx,cy,h,body,stripe){const w=h*.32;x.fillStyle=body;x.beginPath();x.moveTo(cx,cy-h);x.bezierCurveTo(cx+w*.7,cy-h,cx+w*.5,cy-h*.62,cx+w*.34,cy-h*.55);x.bezierCurveTo(cx+w*1.1,cy-h*.3,cx+w*.8,cy,cx+w*.4,cy);
 x.lineTo(cx-w*.4,cy);x.bezierCurveTo(cx-w*.8,cy,cx-w*1.1,cy-h*.3,cx-w*.34,cy-h*.55);x.bezierCurveTo(cx-w*.5,cy-h*.62,cx-w*.7,cy-h,cx,cy-h);x.fill();
 x.fillStyle=stripe;x.fillRect(cx-w*.33,cy-h*.66,w*.66,h*.04);x.fillRect(cx-w*.3,cy-h*.6,w*.6,h*.03);}
// pin skin (512 x 1024, u around, v top->bottom)
function paintPin(era){const pic=SP.picture('pins-'+era);if(pic)return pic;const s=ST[era],c=mk(128,256),x=c.getContext('2d');x.fillStyle=s.pin;x.fillRect(0,0,128,256);
 const y=v=>256*(1-v/PH.PIN_H);// v = height above the base (m)
 x.fillStyle=s.stripe;x.fillRect(0,y(.262),128,256*.022);x.fillRect(0,y(.247),128,256*.014);
 if(era==='ocelot'){const r=rnd(5);for(let k=0;k<60;k++){x.fillStyle=`rgba(120,90,40,${r()*.3})`;x.fillRect(r()*128,r()*256,2+r()*4,1+r()*3);}x.fillStyle='rgba(150,120,60,.18)';x.fillRect(0,0,128,256);}
 if(era==='reno'){x.fillStyle='rgba(0,0,0,.1)';x.fillRect(0,y(.12),128,3);}
 return c;}
// ball cover: marbled swirl in two colours (equirect 512 x 256) + the finger holes
function paintBall(ball){const pic=SP.picture('ball-'+ball.id),W=512,H=256,c=mk(W,H),x=c.getContext('2d');
 if(pic)x.drawImage(pic,0,0,W,H);
 else{const [a,b]=ball.look,r=rnd(ball.id.length*97+ball.price);x.fillStyle=a;x.fillRect(0,0,W,H);
  if(ball.id==='house'){x.fillStyle=b;for(let k=0;k<30;k++){x.globalAlpha=.25;x.beginPath();x.ellipse(r()*W,r()*H,20+r()*60,6+r()*10,r()*3,0,7);x.fill();}x.globalAlpha=1;}
  else for(let k=0;k<26;k++){x.strokeStyle=k%3?b:shade(a,1.25);x.globalAlpha=.25+r()*.4;x.lineWidth=4+r()*16;x.beginPath();let px=r()*W,py=r()*H;x.moveTo(px,py);
   for(let j=0;j<5;j++){px+=(r()-.5)*220;py+=(r()-.5)*120;x.quadraticCurveTo(px+(r()-.5)*90,py+(r()-.5)*90,px,py);}x.stroke();}
  x.globalAlpha=1;if(ball.id==='big-ern'||ball.id==='gutterball'||ball.id==='reno-gold'){for(let k=0;k<500;k++){x.fillStyle=`rgba(255,255,255,${r()*.8})`;x.fillRect(r()*W,r()*H,1.5,1.5);}}}
 // finger holes near the top pole (v ~ .1): thumb + two fingers
 const hole=(u,v,rr)=>{x.fillStyle='#050505';x.beginPath();x.ellipse(u*W,v*H,rr*1.8,rr,0,0,7);x.fill();x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=1;x.stroke();};
 hole(.25,.13,7);hole(.21,.07,5.5);hole(.29,.07,5.5);
 return c;}
// ---------------------------------------------------------------- the scene
function createScene(G){
 const S={look:null,tex:{},mesh:{},laneCount:2*NEIGH+1,flick:1,t:0};
 const free=()=>{const all=o=>Object.values(o).flatMap(v=>Array.isArray(v)?v:[v]).filter(Boolean);for(const t of all(S.tex))G.freeTexture(t);for(const m of all(S.mesh))G.freeMesh(m.m||m);S.tex={};S.mesh={};S.ready=false;};
 // pin mesh (lathe, origin at the centre of mass)
 const PROF=[[.0001,0],[.0254,0],[.034,.008],[.047,.03],[.056,.062],[.0605,.114],[.058,.15],[.051,.19],[.039,.225],[.027,.255],[.0225,.27],[.024,.29],[.03,.316],[.0318,.334],[.0295,.354],[.021,.371],[.009,.38],[.0001,.381]];
 const pinM=(()=>{const B=builder();B.lathe(PROF,18,null,0,-PIN_SHAPES.com,0);return G.mesh(B.done());})();
 const ballM=(()=>{const B=builder();B.sphere(BALL_R,28,18);return G.mesh(B.done());})();
 S.pinM=pinM;S.ballM=ballM;
 function build(look){free();S.look=JSON.stringify(look);const L=look;S.L=L;
  const sl=ST[L.lanes],sr=ST[L.room],sm=ST[L.masking],sp=ST[L.pins];
  const T=S.tex;T.lane=G.texture(paintLane(L.lanes));if(sl.glow)T.laneGlow=G.texture(paintLaneGlow(L.lanes));
  T.appr=G.texture(paintTile(L.room,'approach'),{repeat:true});T.wall=G.texture(paintTile(L.room,'wall'),{repeat:true});T.ceil=G.texture(paintTile(L.room,'ceiling'),{repeat:true});
  T.carpet=G.texture(paintTile(L.room,'carpet'),{repeat:true});T.kick=G.texture(paintTile(L.lanes,'kickback'),{repeat:true});
  T.pin=G.texture(paintPin(L.pins));T.mask=[];for(let i=0;i<S.laneCount;i++)T.mask.push(G.texture(paintMasking(L.masking,11+i)));
  T.ball=G.texture(paintBall(L.ball));
  const M=S.mesh,B=()=>builder(),lanesX=[];for(let i=-NEIGH;i<=NEIGH;i++)lanesX.push(i*PITCH);S.lanesX=lanesX;
  // lanes
  {const b=B();for(const cx of lanesX)b.quad([cx-HALF,0,0],[cx+HALF,0,0],[cx+HALF,0,DECK_END],[cx-HALF,0,DECK_END],[0,1,0],[0,0,1,1]);M.lane=G.mesh(b.done());}
  // gutters (troughs), capping, kickbacks, pit
  {const b=B(),g=col4(sl.gut);for(const cx of lanesX){b.trough(cx-HALF-GUTTER_W/2,0,GUTTER_W/2,-.05,DECK_END+.05,10,g);b.trough(cx+HALF+GUTTER_W/2,0,GUTTER_W/2,-.05,DECK_END+.05,10,g);}M.gut=G.mesh(b.done());}
  {const b=B(),c=col4(sl.cap);for(let i=0;i<=lanesX.length;i++){const ex=(i-NEIGH-.5)*PITCH;b.box(ex-CAP_W/2,-.01,-.05,ex+CAP_W/2,.035,MASK_Z,c,'yYzZxX');}M.cap=G.mesh(b.done());}
  {const b=B();for(let i=0;i<=lanesX.length;i++){const ex=(i-NEIGH-.5)*PITCH;const z0=Z1-.55,z1=DECK_END+.6,yt=MASK_Y+.02,xr=ex+CAP_W/2,xl=ex-CAP_W/2;b.quad([xr,yt,z0],[xr,yt,z1],[xr,0,z1],[xr,0,z0],[1,0,0],[0,0,3,1]);b.quad([xl,yt,z1],[xl,yt,z0],[xl,0,z0],[xl,0,z1],[-1,0,0],[0,0,3,1]);b.box(xl,0,z0-.02,xr,yt,z0,[10,10,12,255],'zY');}M.kick=G.mesh(b.done());}
  {const b=B(),k=[6,6,8,255];b.box(-WALL_X,-.6,DECK_END,WALL_X,MASK_Y,CURTAIN_Z+.7,k,'yz');b.box(-WALL_X,-.6,CURTAIN_Z+.6,WALL_X,MASK_Y+.02,CURTAIN_Z+.7,[2,2,3,255],'z');
   b.box(-WALL_X,MASK_Y,MASK_Z,WALL_X,MASK_Y+.02,CURTAIN_Z+.7,[14,14,16,255],'y');M.pit=G.mesh(b.done());}
  // masking panels (one per lane) + the wall above to the ceiling
  M.mask=[];for(let i=0;i<lanesX.length;i++){const b=B(),x0=lanesX[i]-PITCH/2,x1=lanesX[i]+PITCH/2;b.quad([x0,MASK_TOP,MASK_Z],[x1,MASK_TOP,MASK_Z],[x1,MASK_Y,MASK_Z],[x0,MASK_Y,MASK_Z],[0,0,-1],[0,0,1,1]);M.mask.push(G.mesh(b.done()));}
  {const b=B(),c=col4(shadeHex(sr.wall,.55));b.quad([-WALL_X,MASK_TOP,MASK_Z],[-WALL_X,CEIL,MASK_Z],[WALL_X,CEIL,MASK_Z],[WALL_X,MASK_TOP,MASK_Z],[0,0,-1],[0,0,1,1],c);M.above=G.mesh(b.done());}
  // approach floor, carpet, ceiling, walls
  {const b=B();b.quad([-WALL_X,0,APP],[WALL_X,0,APP],[WALL_X,0,0],[-WALL_X,0,0],[0,1,0],[0,0,WALL_X*2/1.6,-APP/1.6]);M.appr=G.mesh(b.done());}
  {const b=B();b.quad([-WALL_X,-.003,BACK],[-WALL_X,-.003,APP],[WALL_X,-.003,APP],[WALL_X,-.003,BACK],[0,1,0],[0,0,WALL_X*2/1.2,(APP-BACK)/1.2]);M.carpet=G.mesh(b.done());}
  {const b=B();b.quad([-WALL_X,CEIL,BACK],[WALL_X,CEIL,BACK],[WALL_X,CEIL,MASK_Z],[-WALL_X,CEIL,MASK_Z],[0,-1,0],[0,0,WALL_X*2/1.4,(MASK_Z-BACK)/1.4]);M.ceil=G.mesh(b.done());}
  {const b=B(),len=MASK_Z-BACK;b.quad([-WALL_X,CEIL,BACK],[-WALL_X,CEIL,MASK_Z],[-WALL_X,0,MASK_Z],[-WALL_X,0,BACK],[1,0,0],[0,0,len/3.2,1]);
   b.quad([WALL_X,CEIL,MASK_Z],[WALL_X,CEIL,BACK],[WALL_X,0,BACK],[WALL_X,0,MASK_Z],[-1,0,0],[0,0,len/3.2,1]);
   b.quad([WALL_X,CEIL,BACK],[-WALL_X,CEIL,BACK],[-WALL_X,0,BACK],[WALL_X,0,BACK],[0,0,1],[0,0,WALL_X*2/3.2,1]);M.wall=G.mesh(b.done());}
  // ceiling light fixtures (emissive strips across the lanes)
  {const b=B(),lc=ST[L.lights],c=col4('#ffffff');for(let z=-3;z<MASK_Z-1;z+=2.6){if(L.lights==='reno'||L.lights==='galactic'){for(const cx of lanesX)b.box(cx-.05,CEIL-.02,z,cx+.05,CEIL,z+2.2,c,'y');}
    else if(L.lights==='starlanes'){for(const cx of lanesX)b.box(cx-.2,CEIL-.35,z+.9,cx+.2,CEIL-.3,z+1.3,c,'yxXzZ');}
    else b.box(-WALL_X+.4,CEIL-.05,z+1,WALL_X-.4,CEIL-.02,z+1.25,c,'y');}
   M.fix=G.mesh(b.done());S.fixCol=lc.light;}
  // ball returns (between lane pairs on the approach: yours on the left) + seats behind
  {const b=B(),cs=col4(ST[L.room].cap),hood=col4(ST[L.room].wall2||ST[L.room].wall);
   for(let i=-NEIGH;i<NEIGH;i+=2){const ex=(i+.5)*PITCH;b.box(ex-.22,0,-3.6,ex+.22,.55,-1.4,cs);b.sphere(.3,16,8,ex,.55,-2.8,hood);
    b.box(ex-.16,.55,-2.3,ex+.16,.62,-1.4,[30,30,30,255]);}
   for(let i=-NEIGH;i<=NEIGH;i++){const ex=i*PITCH;b.box(ex-.7,0,-7.2,ex+.7,.45,-6.4,col4(ST[L.room].carpet2));b.box(ex-.7,.45,-7.2,ex+.7,.95,-7.0,col4(ST[L.room].carpet2));
    b.box(ex-.3,0,-5.6,ex+.3,.72,-5.2,col4(ST[L.room].cap));}
   M.ret=G.mesh(b.done());}
  // the neighbours' pins (standing racks, one static mesh)
  {const b=B(),pc=col4(sp.pin);for(const cx of lanesX){if(cx===0)continue;for(const p of PH.PIN_POS)b.lathe(PROF,10,y=>y>.245&&y<.27?col4(sp.stripe):pc,cx+p.x,0,p.z);}M.npins=G.mesh(b.done());}
  // overhead monitors: a frame + screen quad over each ball return, tilted to the bowlers
  M.mon=[];{for(let i=-NEIGH;i<NEIGH;i+=2){const ex=(i+.5)*PITCH,b=B(),w=.95,h=.56,y=2.72,z=1.1,t=.25;
    const P=(u,v)=>[ex+u*w/2,y+v*h/2*Math.cos(t),z-.08+v*h/2*Math.sin(t)];b.quad(P(-1,1),P(1,1),P(1,-1),P(-1,-1),[0,-Math.sin(t),-Math.cos(t)],[0,0,1,1]);M.mon.push({m:G.mesh(b.done()),x:ex,mine:i===-1});}
   const b=B();for(let i=-NEIGH;i<NEIGH;i+=2){const ex=(i+.5)*PITCH;b.box(ex-.52,2.72-.33,1.04,ex+.52,2.72+.33,1.2,[12,12,14,255]);b.box(ex-.02,3.05,1.1,ex+.02,CEIL,1.14,[40,40,44,255]);}M.monFrame=G.mesh(b.done());}
  // the pinsetter sweep bar (moved by the game)
  {const b=B();b.box(-HALF-.04,0,-.03,HALF+.04,.2,.03,col4(sl.glow?'#38f0ff':'#2a2a2e'));M.sweep=G.mesh(b.done());}
  S.ready=true;}
 // the score monitor texture (canvas from the game), updated when it changes
 // DECOR: posters/signs on the side walls, the rug on the carpet, a disco ball over the lanes (look.decor = ids shown)
 function paintDecor(d){const pic=SP.picture('decor-'+d.id);if(pic)return pic;const c=mk(256,384),x=c.getContext('2d'),era=S.L.room,s=ST[era];
  x.fillStyle='#1b120c';x.fillRect(0,0,256,384);x.strokeStyle=s.mask?.[1]||'#ffd23f';x.lineWidth=10;x.strokeRect(5,5,246,374);
  x.fillStyle=s.mask?.[0]||'#c96b1e';x.fillRect(16,16,224,240);const icon={rug:'🟥','white-russian':'🥛','big-ern-poster':'🎳','munson-poster':'🏆','rubber-hand':'✋','mark-it-zero':'0','jesus-poster':'💜','coffee-can':'☕','amish-sign':'🐴','trophy':'🏆','neon-gutterballs':'✨'}[d.id]||'🎳';
  x.font='120px serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';x.fillText(icon,128,136);
  x.font='bold 26px Arial,sans-serif';x.fillStyle='#ffe9b0';const words=d.name.toUpperCase().split(' ');let line='',y=292;for(const w of words){if(x.measureText(line+w).width>220){x.fillText(line.trim(),128,y);y+=30;line='';}line+=w+' ';}x.fillText(line.trim(),128,y);
  return c;}
 S.setDecor=(ids)=>{const key=(ids||[]).join(',')+'|'+S.L.room;if(S.decorKey===key)return;S.decorKey=key;for(const d of S.decor||[]){G.freeTexture(d.tex);G.freeMesh(d.m);}S.decor=[];
  const AL=require("src/data/bowlAlley.js");let wallI=0;
  for(const id of ids||[]){const d=AL.byId(AL.DECOR,id);if(!d)continue;const b=builder();
   if(id==='rug'){b.quad([-1.6,.004,-8.4],[1.6,.004,-8.4],[1.6,.004,-5.2],[-1.6,.004,-5.2],[0,1,0],[0,0,1,1]);}
   else if(id==='disco-ball'){b.sphere(.32,20,12,0,CEIL-.75,6);}
   else{const side=wallI%2?1:-1,z=1.5+Math.floor(wallI/2)*2.6,wx=side*(WALL_X-.02),w=1.1,h=1.65,y=1.05;wallI++;
    if(side<0)b.quad([wx,y+h,z+w/2],[wx,y+h,z-w/2],[wx,y,z-w/2],[wx,y,z+w/2],[1,0,0],[0,0,1,1]);else b.quad([wx,y+h,z-w/2],[wx,y+h,z+w/2],[wx,y,z+w/2],[wx,y,z-w/2],[-1,0,0],[0,0,1,1]);}
   const tex=id==='disco-ball'?null:G.texture(id==='rug'?rugTex():paintDecor(d));S.decor.push({id,m:G.mesh(b.done()),tex});}};
 function rugTex(){const pic=SP.picture('decor-rug');if(pic)return pic;const c=mk(256,256),x=c.getContext('2d');x.fillStyle='#7a1d14';x.fillRect(0,0,256,256);x.strokeStyle='#d7b46a';x.lineWidth=10;x.strokeRect(14,14,228,228);
  x.strokeStyle='#1d3c78';x.lineWidth=6;x.strokeRect(34,34,188,188);for(let i=0;i<4;i++){x.fillStyle=['#d7b46a','#1d3c78','#e8d1b8','#3f8f4b'][i];x.beginPath();x.ellipse(128,128,90-i*20,50-i*10,i*.4,0,7);x.fill();}return c;}
 S.setScreen=(canvas)=>{if(!S.tex.screen){S.tex.screen=G.texture(canvas,{mips:false});}else G.retexture(S.tex.screen,canvas,{mips:false});};
 S.setOtherScreen=(canvas)=>{if(!S.tex.screen2)S.tex.screen2=G.texture(canvas,{mips:false});else G.retexture(S.tex.screen2,canvas,{mips:false});};
 // lights for a frame
 S.lights=(t)=>{const L=S.L,lc=ST[L.lights],k=lc.lightK;let f=1;
  if(lc.flicker){const ph=(t*7.3)%13;f=ph<.35?.55+.45*Math.abs(Math.sin(t*90)):1;}S.flick=f;
  const c=[lc.light[0]*k*f,lc.light[1]*k*f,lc.light[2]*k*f],deck=L.lights==='cosmic'?[.6,.4,1.2]:[1.25,1.2,1.1];
  return [[0,3.1,2,7,...c],[0,3.1,7.5,7,...c],[0,3.1,13,7,...c],[0,.85,Z1-.2,3.2,...deck.map(v=>v*1.25)],[-2.6,3,6,9,...c.map(v=>v*.7)],[2.6,3,6,9,...c.map(v=>v*.7)],
   [0,2.6,-2.6,5,...c.map(v=>v*.8)],[0,.85,Z1+.6,2.2,...deck.map(v=>v*.6)]];};
 S.frameOpts=(t)=>{const L=S.L,sr=ST[L.room],ll=ST[L.lights];return {lights:S.lights(t),ambTop:sr.amb.map((v,i)=>v*.6+ll.light[i]*.12),ambBot:sr.ambB,key:[.2,.9,.3],keyCol:[.08,.08,.09],fog:sr.fog,fogNear:16,fogFar:46,clear:sr.fog};};
 // draw everything. st: {ball:{x,y,z,q,show}, pins:[{x,y,z,q,show}], sweep:{y,z}, t}
 S.draw=(st)=>{if(!S.ready)return;const M=S.mesh,T=S.tex,L=S.L,sl=ST[L.lanes],sp=ST[L.pins],t=st.t||0;
  const pinTint=[1,1,1,1],pinEm=sp.glow?.55:0,spec=[sl.spec,40];
  const ballAt=st.ball&&st.ball.show?poseM(st.ball.x,BALL_R+st.ball.y,st.ball.z,st.ball.q):null;
  const pinM=(p)=>poseM(p.x,p.y+PIN_SHAPES.com,p.z,p.q);
  // 1) reflections (mirrored under the lane)
  const refl=sl.spec>.3;
  if(refl){for(const p of st.pins)if(p.show)G.draw(S.pinM,pinM(p),{tex:T.pin,mirror:true,emis:pinEm,spec:[.6,30]});
   G.draw(M.npins,null,{mirror:true,emis:pinEm});if(ballAt)G.draw(S.ballM,ballAt,{tex:T.ball,mirror:true,spec:[1,60]});
   for(let i=0;i<M.mask.length;i++)G.draw(M.mask[i],null,{tex:T.mask[i],mirror:true,emis:.85});}
  // 2) the lanes, glossy, half see-through over the reflections
  G.draw(M.lane,null,{tex:T.lane,spec,alpha:refl?(L.lanes==='reno'?.8:L.lanes==='galactic'?.72:.86):1,blend:true});
  if(T.laneGlow)G.draw(M.lane,at(0,.002,0),{tex:T.laneGlow,add:true,emis:1,alpha:.9});
  // 3) the room
  G.draw(M.appr,null,{tex:T.appr,spec:[.25,30]});G.draw(M.carpet,null,{tex:T.carpet});G.draw(M.ceil,null,{tex:T.ceil});G.draw(M.wall,null,{tex:T.wall});
  G.draw(M.gut,null,{spec:[.8,40]});G.draw(M.cap,null,{spec:[.3,20]});G.draw(M.kick,null,{tex:T.kick});G.draw(M.pit,null,{});
  for(let i=0;i<M.mask.length;i++)G.draw(M.mask[i],null,{tex:T.mask[i],emis:ST[L.masking].glow?.9:.55});G.draw(M.above,null,{});
  G.draw(M.fix,null,{emis:1,tint:[...S.fixCol.map(v=>Math.min(1,v*S.flick)),1]});G.draw(M.ret,null,{spec:[.4,20]});G.draw(M.monFrame,null,{});
  for(const mo of M.mon){const tx=mo.mine?T.screen:T.screen2;G.draw(mo.m,null,{tex:tx,emis:1});}
  G.draw(M.npins,null,{emis:pinEm,spec:[.5,30]});
  for(const p of st.pins)if(p.show)G.draw(S.pinM,pinM(p),{tex:T.pin,emis:pinEm,spec:[.7,40]});
  if(ballAt)G.draw(S.ballM,ballAt,{tex:T.ball,spec:[1.2,80]});
  if(st.sweep&&st.sweep.on)G.draw(M.sweep,at(0,st.sweep.y,st.sweep.z),{spec:[.5,20]});
  for(const d of S.decor||[]){if(d.id==='disco-ball'){G.draw(d.m,poseM(0,0,0,[0,Math.sin(t*.4),0,Math.cos(t*.4)]),{spec:[2,120],tint:[.85,.85,.9,1]});}else G.draw(d.m,null,{tex:d.tex,emis:.35});}
  void t;};
 S.ensure=(look)=>{const k=JSON.stringify(look);if(k!==S.look)build(look);};
 S.destroy=()=>{free();G.freeMesh(pinM);G.freeMesh(ballM);};
 return S;}
Object.assign(exports,{ST,ERA_IDS,PITCH,NEIGH,APP,CEIL,MASK_Z,MASK_Y,createScene,paintLane,paintMasking,paintTile,paintPin,paintBall});
