// Shooter McGavin's Pro Tour: the 2D pieces (drawn stand-ins for every picture slot in src/data/golfSprites.js): tree billboards,
// the sky panorama, ground/water detail, the golfer (rear three-quarter view, the player's face on top), flag, trackball, logo.
// Used by the 3D scene (golf/render.js), the game screen (golfGame.js) and the template tool (tools/golf-templates.mjs).
const GS=require("src/data/golfSprites.js");
const {THEMES}=require("src/engines/golf/courses.js");
function rng(seed){let a=seed>>>0||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];};
const cache=new Map();
const memo=(key,fn)=>{const v=GS.version()+':'+key;if(!cache.has(v))cache.set(v,fn());return cache.get(v);};

// ---- trees: 512 x 768, trunk base at (256,760)
function drawTree(g,kind,W=512,H=768){const r=rng([...kind].reduce((a,c)=>a*31+c.charCodeAt(0),7));g.save();g.scale(W/512,H/768);
 const blob=(x,y,rx,ry,c1,c2)=>{const gr=g.createRadialGradient(x-rx*.35,y-ry*.4,rx*.1,x,y,Math.max(rx,ry));gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;g.beginPath();g.ellipse(x,y,rx,ry,0,0,6.28);g.fill();};
 const trunk=(w0,w1,top,col)=>{const gr=g.createLinearGradient(256-w0,0,256+w0,0);gr.addColorStop(0,col[0]);gr.addColorStop(.6,col[1]);gr.addColorStop(1,col[0]);g.fillStyle=gr;g.beginPath();g.moveTo(256-w0,760);g.lineTo(256-w1,top);g.lineTo(256+w1,top);g.lineTo(256+w0,760);g.fill();};
 if(kind==='pine'||kind==='pine2'){trunk(22,10,200,['#3a2614','#6a4628']);const dark=kind==='pine2'?'#16301f':'#1d3a22',lite=kind==='pine2'?'#3f6a3c':'#4b7a3e';
  for(let i=0;i<7;i++){const y=640-i*82,w=200-i*24;g.fillStyle=dark;g.beginPath();g.moveTo(256-w,y);g.lineTo(256,y-150);g.lineTo(256+w,y);g.closePath();g.fill();g.fillStyle=lite;g.beginPath();g.moveTo(256-w*.85,y-6);g.lineTo(256,y-140);g.lineTo(256-w*.1,y-10);g.closePath();g.fill();}}
 else if(kind==='cactus'||kind==='cactus2'){const c1='#3f7a3a',c2='#24512a',arm=(x,y,len,dir)=>{g.fillStyle=c2;g.beginPath();g.roundRect(x,y,60*dir,26,13);g.fill();g.beginPath();g.roundRect(x+(dir>0?34:-60),y-len,26,len+20,13);g.fill();g.fillStyle=c1;g.fillRect(x+(dir>0?40:-54),y-len+10,8,len);};
  const top=kind==='cactus'?150:260;g.fillStyle=c2;g.beginPath();g.roundRect(222,top,68,760-top,34);g.fill();g.fillStyle=c1;g.fillRect(238,top+20,12,740-top);g.fillRect(264,top+20,8,740-top);
  arm(282,kind==='cactus'?420:470,kind==='cactus'?170:120,1);if(kind==='cactus')arm(230,360,150,-1);g.strokeStyle='rgba(0,0,0,.15)';for(let x=230;x<285;x+=12){g.beginPath();g.moveTo(x,top+30);g.lineTo(x,750);g.stroke();}}
 else if(kind==='joshua'){trunk(24,16,430,['#5a4630','#8a7050']);const br=(x0,y0,a,len,d)=>{if(d>3)return;const x1=x0+Math.sin(a)*len,y1=y0-Math.cos(a)*len;g.strokeStyle='#6a5236';g.lineWidth=26-d*5;g.lineCap='round';g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();
   if(d>=2){for(let i=0;i<14;i++){const aa=i/14*6.28;g.strokeStyle=i%2?'#3f6a32':'#58844a';g.lineWidth=5;g.beginPath();g.moveTo(x1,y1);g.lineTo(x1+Math.cos(aa)*44,y1+Math.sin(aa)*44);g.stroke();}}else{br(x1,y1,a-.6,len*.8,d+1);br(x1,y1,a+.55,len*.75,d+1);}};
  br(256,440,0,120,0);}
 else{ // broadleaf: oak, oak2, elm, birch, maple, mesquite
  const bark=kind==='birch'?['#c9c3b4','#efe9dc']:kind==='mesquite'?['#4a3420','#6e5032']:['#3e2a18','#6a4a2a'];
  const leaf={oak:['#5f8f3e','#22451c'],oak2:['#6d9a44','#2b5020'],elm:['#4f8a44','#1d4020'],birch:['#9ac458','#4a7a2c'],maple:['#cf6a2a','#7a2a12'],mesquite:['#8a9a4a','#4a5a24']}[kind]||['#5f8f3e','#22451c'];
  trunk(kind==='mesquite'?20:28,14,kind==='mesquite'?420:300,bark);
  if(kind==='birch'){g.fillStyle='#2a2a2a';for(let y=340;y<740;y+=38){g.fillRect(250+r()*8,y,12,4);}}
  g.strokeStyle=bark[0];g.lineWidth=12;g.lineCap='round';for(const [dx,dy] of [[-70,-60],[80,-50],[-30,-110]]){g.beginPath();g.moveTo(256,360);g.lineTo(256+dx,360+dy);g.stroke();}
  const n=kind==='mesquite'?9:14,cy=kind==='mesquite'?300:250,spread=kind==='mesquite'?210:170;
  for(let i=0;i<n;i++){const a=r()*6.28,d=r()*.8;blob(256+Math.cos(a)*spread*d,cy+Math.sin(a)*120*d*(kind==='mesquite'?.6:1),80+r()*50,60+r()*44,leaf[0],leaf[1]);}
  for(let i=0;i<6;i++){g.fillStyle='rgba(255,255,220,.12)';g.beginPath();g.ellipse(200+r()*90,170+r()*120,26,16,0,0,6.28);g.fill();}}
 g.restore();}
function treeCanvas(kind){const pic=GS.picture('tree-'+kind);if(pic)return pic;return memo('tree:'+kind,()=>{const [c,g]=mk(512,768);drawTree(g,kind);return c;});}

// ---- sky panorama: 2048 x 512, horizon at y 400 (wraps all the way round the camera)
function drawSky(g,theme,W=2048,H=512){const T=THEMES[theme]||THEMES.park,r=rng(theme.length*977);g.save();g.scale(W/2048,H/512);
 const gr=g.createLinearGradient(0,0,0,400);gr.addColorStop(0,T.sky[0]);gr.addColorStop(1,T.sky[1]);g.fillStyle=gr;g.fillRect(0,0,2048,512);
 for(let i=0;i<26;i++){const x=r()*2048,y=60+r()*230,w=80+r()*220;g.fillStyle=`rgba(255,255,255,${.25+r()*.4})`;for(let k=0;k<5;k++){g.beginPath();g.ellipse(x+k*w*.18,y+Math.sin(k)*8,w*.22,w*.09,0,0,6.28);g.fill();}}
 const ridge=(base,amp,col,seed)=>{const rr=rng(seed);g.fillStyle=col;g.beginPath();g.moveTo(0,512);let y=base;for(let x=0;x<=2048;x+=16){y+=(rr()-.5)*amp;y=Math.max(base-amp*3,Math.min(base+amp,y));if(theme==='desert'&&rr()<.04)y-=amp*2.5;g.lineTo(x,y);}g.lineTo(2048,base);g.lineTo(2048,512);g.closePath();g.fill();};
 const far=T.far;ridge(372,10,shadeHex(far,.35),3);ridge(392,6,far,5);
 if(theme==='desert'){g.fillStyle='rgba(255,200,120,.25)';g.fillRect(0,380,2048,20);}
 g.fillStyle=shadeHex(T.ground,-.1);g.fillRect(0,400,2048,112);g.restore();}
function shadeHex(h,k){const n=parseInt(h.slice(1),16),c=[n>>16&255,n>>8&255,n&255].map(v=>Math.round(k>=0?v+(255-v)*k:v*(1+k)));return `rgb(${c.join(',')})`;}
function skyCanvas(theme){const pic=GS.picture('sky-'+theme);if(pic)return pic;return memo('sky:'+theme,()=>{const [c,g]=mk(2048,512);drawSky(g,theme);return c;});}
// ---- seamless detail textures
function detailCanvas(){const pic=GS.picture('ground-detail');if(pic)return pic;return memo('detail',()=>{const S=256,[c,g]=mk(S,S),im=g.createImageData(S,S),r=rng(11);
 const base=new Float32Array(S*S);for(let i=0;i<S*S;i++)base[i]=r();
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){let v=0;for(const [dx,dy,w] of [[0,0,.4],[1,0,.15],[0,1,.15],[-1,0,.15],[0,-1,.15]])v+=base[((y+dy+S)%S)*S+(x+dx+S)%S]*w;const k=(y*S+x)*4,l=Math.round(200+(v-.5)*80);im.data[k]=im.data[k+1]=im.data[k+2]=l;im.data[k+3]=255;}
 g.putImageData(im,0,0);return c;});}
function waterCanvas(){const pic=GS.picture('water');if(pic)return pic;return memo('water',()=>{const [c,g]=mk(256,256),r=rng(4);g.fillStyle='#8fb8d0';g.fillRect(0,0,256,256);
 for(let i=0;i<120;i++){const x=r()*256,y=r()*256,w=10+r()*30;g.strokeStyle=`rgba(255,255,255,${.15+r()*.25})`;g.lineWidth=1.5;for(const ox of [-256,0,256]){g.beginPath();g.moveTo(x-w/2+ox,y);g.quadraticCurveTo(x+ox,y-3,x+w/2+ox,y);g.stroke();}}return c;});}
function flagCanvas(){const pic=GS.picture('flag');if(pic)return pic;return memo('flag',()=>{const [c,g]=mk(256,160);g.fillStyle='#e3262e';g.beginPath();g.moveTo(0,8);g.quadraticCurveTo(130,-6,250,30);g.lineTo(250,130);g.quadraticCurveTo(130,110,0,150);g.closePath();g.fill();
 g.fillStyle='#fff';g.font='900 60px Georgia';g.textAlign='center';g.textBaseline='middle';g.fillText('SM',118,80);return c;});}

// ---- the golfer, in sheet units (256 x 384, feet at 118,372); frame 0..9 (GS.GOLFER.frames); col = shirt colour
const POSE={address:[18,12],back1:[-40,40],back2:[-100,80],top:[-165,100],down:[-70,70],impact:[12,0],follow:[85,-30],finish:[150,-70],putt:[8,0],'putt-through':[26,0]};
function drawGolferFrame(g,frame,col='#d43a3a',trousers='#c9b48a',{club=true}={}){const name=GS.GOLFER.frames[frame]||'address',[arm,wrist]=POSE[name],putt=name.startsWith('putt'),hd=GS.GOLFER.head[frame];
 const fx=118,fy=372,bend=putt?.6:name==='finish'?-.1:name==='follow'?.15:.35;
 // legs
 g.fillStyle=trousers;const legs=[[-26,0],[22,0]];for(const [lx] of legs){g.beginPath();g.moveTo(fx+lx-16,fy-6);g.lineTo(fx+lx*0.4-14,fy-150);g.lineTo(fx+lx*.4+14,fy-150);g.lineTo(fx+lx+16,fy-6);g.closePath();g.fill();}
 g.fillStyle='#2a2a2a';for(const [lx] of legs){g.beginPath();g.ellipse(fx+lx+6,fy-4,22,9,0,0,6.28);g.fill();}
 g.fillStyle='rgba(0,0,0,.18)';g.fillRect(fx-10,fy-150,8,140);
 // torso (leans over the ball)
 const hipX=fx,hipY=fy-150,shX=hipX+bend*60,shY=hd[1]+52;
 g.fillStyle=col;g.beginPath();g.moveTo(hipX-34,hipY+6);g.lineTo(shX-44,shY);g.quadraticCurveTo(shX,shY-14,shX+44,shY);g.lineTo(hipX+34,hipY+6);g.closePath();g.fill();
 g.fillStyle='rgba(255,255,255,.85)';g.fillRect(hipX-34,hipY-2,68,9);g.fillStyle='rgba(0,0,0,.15)';g.beginPath();g.moveTo(shX+10,shY);g.lineTo(shX+44,shY);g.lineTo(hipX+34,hipY);g.lineTo(hipX+14,hipY);g.fill();
 g.fillStyle='#1c1c1c';g.fillRect(hipX-36,hipY+2,72,8);
 // neck
 g.fillStyle='#d9a888';g.fillRect(hd[0]-10,hd[1]+26,20,shY-hd[1]-24);
 // arms + club from the shoulder: arm angle (deg, 0 = straight down, + = toward the ball side)
 const a=arm*Math.PI/180,AL=putt?96:104,hx=shX+Math.sin(a)*AL,hy=shY+Math.cos(a)*AL;
 g.strokeStyle=col;g.lineWidth=20;g.lineCap='round';g.beginPath();g.moveTo(shX-14,shY+10);g.lineTo(hx,hy);g.moveTo(shX+14,shY+10);g.lineTo(hx,hy);g.stroke();
 g.fillStyle='#f2f2f2';g.beginPath();g.arc(hx,hy,10,0,6.28);g.fill();
 if(club){const ca=(arm+wrist)*Math.PI/180,CL=putt?150:200,cx=hx+Math.sin(ca)*CL,cy=hy+Math.cos(ca)*CL;g.strokeStyle='#bfc4c9';g.lineWidth=5;g.beginPath();g.moveTo(hx,hy);g.lineTo(cx,cy);g.stroke();
  g.fillStyle='#e6e8ea';g.beginPath();g.ellipse(cx,cy,putt?18:14,7,ca,0,6.28);g.fill();g.fillStyle='#3a3a3a';g.fillRect(hx-4,hy-4,8,22);}
 return {x:hd[0],y:hd[1],d:hd[2]};}
// the golfer on screen: sheet picture if there is one, else drawn; returns the face circle in screen px
function drawGolfer(g,i,frame,x,y,h,{flip=false}={}){const pic=GS.picture('golfer-p'+(i+1)),k=h/384,F=GS.GOLFER;g.save();g.translate(x,y);if(flip)g.scale(-1,1);g.scale(k,k);g.translate(-F.feet[0],-F.feet[1]);
 let hd;if(pic){g.drawImage(pic,frame*F.w,0,F.w,F.h,0,0,F.w,F.h);hd=F.head[frame];hd={x:hd[0],y:hd[1],d:hd[2]};}else hd=drawGolferFrame(g,frame,i?'#2f6fd6':'#d43a3a',i?'#8a8f96':'#c9b48a');
 g.restore();return {x:x+(flip?-1:1)*(hd.x-F.feet[0])*k,y:y+(hd.y-F.feet[1])*k,d:hd.d*k};}

// ---- the trackball (cabinet ball seen from above), rolled by rx/ry (radians turned)
// the cabinet trackball seen from above. rot = 3x3 orientation (trackball.js rollRot) or the old {x,y} offsets; marks fixed on the
// ball's surface turn with it, so it rolls like the real one.
const TB_MARKS=(()=>{const out=[],n=46,ga=Math.PI*(3-Math.sqrt(5));for(let i=0;i<n;i++){const y=1-2*(i+.5)/n,r=Math.sqrt(1-y*y),a=i*ga;out.push([Math.cos(a)*r,y,Math.sin(a)*r,i%3]);}return out;})();
function drawTrackball(g,cx,cy,r,rot,opts={}){let M=rot;if(!Array.isArray(M)){const rx=(rot&&rot.x)||0,ry=(rot&&rot.y)||0;M=rollM([1,0,0,0,1,0,0,0,1],rx/3,ry/3);}
 const {glow=0,ring=true}=opts,pic=GS.picture('trackball');
 g.save();g.fillStyle='rgba(0,0,0,.45)';g.beginPath();g.arc(cx+r*.06,cy+r*.1,r*1.18,0,6.28);g.fill();
 if(ring){const rg=g.createLinearGradient(cx-r,cy-r,cx+r,cy+r);rg.addColorStop(0,'#f2f4f7');rg.addColorStop(.5,'#7a8088');rg.addColorStop(1,'#e6e9ee');g.fillStyle=rg;g.beginPath();g.arc(cx,cy,r*1.16,0,6.28);g.fill();
  g.fillStyle='#14161a';g.beginPath();g.arc(cx,cy,r*1.04,0,6.28);g.fill();}
 if(pic)g.drawImage(pic,cx-r*1.16,cy-r*1.16,r*2.32,r*2.32);
 else{const bg=g.createRadialGradient(cx-r*.35,cy-r*.4,r*.1,cx,cy,r);bg.addColorStop(0,'#ffd877');bg.addColorStop(.45,'#ef9d1c');bg.addColorStop(1,'#6e3205');g.fillStyle=bg;g.beginPath();g.arc(cx,cy,r,0,6.28);g.fill();}
 // marks on the surface, turned by the ball's orientation (only the near half shows)
 g.save();g.beginPath();g.arc(cx,cy,r,0,6.28);g.clip();
 for(const [px,py,pz,kind] of TB_MARKS){const qx=M[0]*px+M[1]*py+M[2]*pz,qy=M[3]*px+M[4]*py+M[5]*pz,qz=M[6]*px+M[7]*py+M[8]*pz;if(qz<=0)continue;
  const d=Math.hypot(qx,qy),sz=r*(kind?.055:.085),a=Math.atan2(qy,qx);g.fillStyle=pic?`rgba(255,255,255,${.12+.3*qz})`:kind?`rgba(255,236,170,${.18+.4*qz})`:`rgba(110,45,0,${.18+.35*qz})`;
  g.beginPath();g.ellipse(cx+qx*r,cy+qy*r,sz*Math.max(.15,qz),sz,a,0,6.28);g.fill();}
 const sp=g.createRadialGradient(cx-r*.38,cy-r*.45,0,cx-r*.38,cy-r*.45,r*.65);sp.addColorStop(0,'rgba(255,255,255,.75)');sp.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=sp;g.fillRect(cx-r,cy-r,r*2,r*2);
 const rim=g.createRadialGradient(cx,cy,r*.75,cx,cy,r);rim.addColorStop(0,'rgba(0,0,0,0)');rim.addColorStop(1,'rgba(0,0,0,.35)');g.fillStyle=rim;g.fillRect(cx-r,cy-r,r*2,r*2);g.restore();
 if(glow){g.strokeStyle=`rgba(255,226,120,${glow})`;g.lineWidth=r*.08;g.beginPath();g.arc(cx,cy,r*1.1,0,6.28);g.stroke();}
 g.restore();}
function rollM(M,dx,dy){const a=Math.hypot(dx,dy);if(a<1e-6)return M;const ax=-dy/a,ay=dx/a,c=Math.cos(a),s=Math.sin(a),t=1-c;
 const R=[t*ax*ax+c,t*ax*ay,s*ay,t*ax*ay,t*ay*ay+c,-s*ax,-s*ay,s*ax,c],o=[];for(let i=0;i<3;i++)for(let j=0;j<3;j++)o[i*3+j]=R[i*3]*M[j]+R[i*3+1]*M[3+j]+R[i*3+2]*M[6+j];return o;}
// ---- the CONTROL PANEL around the big trackball (our own cabinet: brushed black deck, gold block arrows that light up)
// geometry for a ball of radius R at (cx,cy): panel box, the 8 arrows (6 swing + 2 club), the backspin button
function panelGeom(cx,cy,R){const ar=R*1.55,as=R*.36,w=R*4.5,h=R*4.5,box={x:cx-w/2,y:cy-h*.5,w,h};
 const arrows=[['1',-135],['2',-90],['3',-45],['A',135],['B',90],['C',45],['club-',180],['club+',0]].map(([id,a])=>{const t=a*Math.PI/180;return {id,ang:t,x:cx+Math.cos(t)*ar,y:cy+Math.sin(t)*ar,s:as};});
 const spin={x:box.x+w-R*1.02,y:box.y+h-R*.62,w:R*.92,h:R*.46},close={x:box.x+w-R*.5,y:box.y+R*.12,w:R*.38,h:R*.38};
 return {box,arrows,spin,close,R};}
function blockArrow(g,x,y,ang,s,fill,edge){g.save();g.translate(x,y);g.rotate(ang);g.beginPath();
 g.moveTo(s*.95,0);g.lineTo(s*.12,-s*.78);g.lineTo(s*.12,-s*.36);g.lineTo(-s*.78,-s*.36);g.lineTo(-s*.78,s*.36);g.lineTo(s*.12,s*.36);g.lineTo(s*.12,s*.78);g.closePath();
 g.fillStyle=fill;g.fill();g.lineWidth=Math.max(1.5,s*.08);g.strokeStyle=edge;g.stroke();g.restore();}
// state: {lit:{A:1,...}, backspin, club:'7 IRON', hint, done:{combo,name}}
function drawPanel(g,cx,cy,R,st={}){const G=panelGeom(cx,cy,R),{box}=G,pic=GS.picture('control-panel');g.save();
 if(pic){g.drawImage(pic,box.x,box.y,box.w,box.h);}
 else{g.fillStyle='rgba(0,0,0,.5)';g.beginPath();g.roundRect(box.x+4,box.y+8,box.w,box.h,R*.3);g.fill();
  const bg=g.createLinearGradient(0,box.y,0,box.y+box.h);bg.addColorStop(0,'#2b2f36');bg.addColorStop(.5,'#16181c');bg.addColorStop(1,'#0c0d10');g.fillStyle=bg;g.beginPath();g.roundRect(box.x,box.y,box.w,box.h,R*.3);g.fill();
  g.save();g.beginPath();g.roundRect(box.x,box.y,box.w,box.h,R*.3);g.clip();g.globalAlpha=.08;g.strokeStyle='#fff';g.lineWidth=1;for(let yy=box.y;yy<box.y+box.h;yy+=3){g.beginPath();g.moveTo(box.x,yy);g.lineTo(box.x+box.w,yy+1.5);g.stroke();}g.restore();
  g.lineWidth=Math.max(2,R*.05);g.strokeStyle='#c9a227';g.beginPath();g.roundRect(box.x+R*.08,box.y+R*.08,box.w-R*.16,box.h-R*.16,R*.24);g.stroke();
  g.strokeStyle='rgba(255,210,63,.25)';g.lineWidth=R*.03;g.beginPath();g.arc(cx,cy,R*1.55,0,6.28);g.stroke();}
 const font=(px,w=900)=>`${w} ${px}px "SC Bangers","SC Nunito",Impact,sans-serif`,lit=st.lit||{};
 g.textAlign='center';g.textBaseline='middle';
 for(const a of G.arrows){const on=lit[a.id],club=a.id.startsWith('club');const fill=on?'#fff27a':club?'#9aa3ad':'#d7a21c',edge=on?'#ffffff':'#3a2a05';
  if(on){g.save();g.shadowColor='#ffe066';g.shadowBlur=R*.35;blockArrow(g,a.x,a.y,a.ang,a.s,fill,edge);g.restore();}else blockArrow(g,a.x,a.y,a.ang,a.s,fill,edge);
  if(!club){g.font=font(a.s*.62);g.fillStyle='#1a1304';g.fillText(a.id,a.x-Math.cos(a.ang)*a.s*.18,a.y-Math.sin(a.ang)*a.s*.18+1);}}
 g.font=font(R*.19);g.fillStyle='#ffd23f';g.fillText('FORWARD SWING',cx,G.box.y+R*.19);g.fillText('BACK SWING',cx,G.box.y+G.box.h-R*.19);
 g.font=font(R*.15,800);g.fillStyle='#cfd6de';const cl=G.arrows.find(a=>a.id==='club-'),cr=G.arrows.find(a=>a.id==='club+');
 g.fillText('CLUB',cl.x,cl.y-R*.36);g.fillText('CLUB',cr.x,cr.y-R*.36);
 if(st.club){g.textAlign='left';g.font=font(R*.14,800);g.fillStyle='#9fb0c0';g.fillText('CLUB',box.x+R*.22,box.y+R*.3);g.font=font(R*.2);g.fillStyle='#fff';g.fillText(st.club,box.x+R*.22,box.y+R*.52);g.textAlign='center';}
 // backspin button + close
 const b=G.spin;g.fillStyle=st.backspin?'#ff5a3c':'#3a3f47';g.beginPath();g.roundRect(b.x,b.y,b.w,b.h,b.h/2);g.fill();g.lineWidth=2;g.strokeStyle=st.backspin?'#ffd1c4':'#7b838d';g.stroke();
 g.font=font(b.h*.42);g.fillStyle='#fff';g.fillText(st.backspin?'BACKSPIN ON':'BACKSPIN',b.x+b.w/2,b.y+b.h/2+1);
 const c=G.close;g.fillStyle='rgba(255,255,255,.14)';g.beginPath();g.arc(c.x+c.w/2,c.y+c.h/2,c.w/2,0,6.28);g.fill();g.strokeStyle='#fff';g.lineWidth=Math.max(2,R*.04);g.beginPath();
 g.moveTo(c.x+c.w*.3,c.y+c.h*.3);g.lineTo(c.x+c.w*.7,c.y+c.h*.7);g.moveTo(c.x+c.w*.7,c.y+c.h*.3);g.lineTo(c.x+c.w*.3,c.y+c.h*.7);g.stroke();
 if(st.hint){g.textAlign='left';g.font=font(R*.14,800);g.fillStyle='#bfe7ff';const words=st.hint.split(' · ');words.forEach((w,k)=>g.fillText(w,box.x+R*.22,box.y+box.h-R*(.3+.2*(words.length-1-k))));g.textAlign='center';}
 g.restore();return G;}
// the combo card over the panel: 9 cells, hand motion arrows + the ball's flight path; lit = the combo just played
function drawComboChart(g,X,Y,W,H,{lit=null,TB,cols=9}={}){g.save();g.fillStyle='rgba(8,14,40,.92)';g.beginPath();g.roundRect(X,Y,W,H,8);g.fill();g.strokeStyle='#c9a227';g.lineWidth=2;g.stroke();
 const rows=9/cols,cw=W/cols,h=H/rows;g.textAlign='center';g.textBaseline='middle';let i=0;
 for(const b of ['A','B','C'])for(const f of ['1','2','3']){const col=i%cols,row=Math.floor(i/cols),x0=X+cw*col,y=Y+h*row,cx=x0+cw/2,on=lit===b+f;i++;
  if(on){g.fillStyle='rgba(255,226,102,.28)';g.fillRect(x0+1,y+1,cw-2,h-2);}
  g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=1;if(col){g.beginPath();g.moveTo(x0,y+3);g.lineTo(x0,y+h-3);g.stroke();}if(row&&!col){g.beginPath();g.moveTo(X+3,y);g.lineTo(X+W-3,y);g.stroke();}
  const s=Math.min(cw*.22,h*.17),ay=y+h*.21;
  blockArrow(g,cx-cw*.22,ay,{A:135,B:90,C:45}[b]*Math.PI/180,s,'#d7a21c','#3a2a05');blockArrow(g,cx+cw*.22,ay,{1:-135,2:-90,3:-45}[f]*Math.PI/180,s,'#d7a21c','#3a2a05');
  g.font=`900 ${s*.95}px "SC Bangers",Impact,sans-serif`;g.fillStyle='#1a1304';g.fillText(b,cx-cw*.22,ay+1);g.fillText(f,cx+cw*.22,ay+1);
  if(TB){const pts=TB.comboPath(b,f),sc=h*.5,bx=cx,by=y+h*.92;g.strokeStyle=on?'#fff27a':'#fff';g.lineWidth=Math.max(1.6,h*.05);g.lineCap='round';g.beginPath();
   pts.forEach(([px,py],k)=>{const X=bx+px*sc,Y=by-py*sc;k?g.lineTo(X,Y):g.moveTo(X,Y);});g.stroke();
   const [lx,ly]=pts[pts.length-1],[qx,qy]=pts[pts.length-3],an=Math.atan2(-(ly-qy),lx-qx);g.fillStyle=g.strokeStyle;g.beginPath();const X=bx+lx*sc,Y=by-ly*sc,hs=h*.09;
   g.moveTo(X+Math.cos(an)*hs,Y+Math.sin(an)*hs);g.lineTo(X+Math.cos(an+2.4)*hs,Y+Math.sin(an+2.4)*hs);g.lineTo(X+Math.cos(an-2.4)*hs,Y+Math.sin(an-2.4)*hs);g.fill();}}
 g.restore();}
function drawLogo(g,cx,cy,w){const pic=GS.picture('logo');if(pic){const h=w*pic.height/pic.width;g.drawImage(pic,cx-w/2,cy-h/2,w,h);return h;}
 g.save();g.textAlign='center';g.textBaseline='middle';const fs=w*.1;g.font=`900 ${fs*.42}px "SC Nunito",Georgia,serif`;g.fillStyle='#ffd23f';g.fillText("SHOOTER McGAVIN'S",cx,cy-fs*.62);
 g.font=`900 ${fs}px "SC Bangers",Impact,sans-serif`;g.lineWidth=fs*.14;g.strokeStyle='#0b2a14';g.strokeText('PRO TOUR',cx,cy+fs*.18);const gr=g.createLinearGradient(0,cy-fs*.3,0,cy+fs*.6);gr.addColorStop(0,'#fff6c8');gr.addColorStop(1,'#e8a91a');g.fillStyle=gr;g.fillText('PRO TOUR',cx,cy+fs*.18);
 g.font=`800 ${fs*.22}px "SC Nunito",sans-serif`;g.fillStyle='#e8f2e0';g.fillText('ARCADE TRACKBALL GOLF',cx,cy+fs*.85);g.restore();return fs*1.9;}
Object.assign(exports,{drawTree,treeCanvas,drawSky,skyCanvas,detailCanvas,waterCanvas,flagCanvas,drawGolferFrame,drawGolfer,drawTrackball,drawPanel,panelGeom,drawComboChart,blockArrow,drawLogo,shadeHex,POSE});
