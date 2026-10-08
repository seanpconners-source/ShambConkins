// BOSS FIGHT procedural bodies. Each builder draws around the origin (0,0), nominal 300 x 220 units.
// BODIES[name]={hit:[[dx,dy,r]...], muz:{mouth,eye,center,l,r:[dx,dy]}, draw(g,A)}
// A: {t, look{x,y}(-1..1), open(0..1 attacking), glow, phase, dmg(0..1), pal[4], v (boss.look), pose, face(g,cx,cy,size,opt)->bool}
const TAU=Math.PI*2,PI2=TAU,INK='#140a0c';
const lerp=(a,b,t)=>a+(b-a)*t;
function ell(g,x,y,rx,ry,fill,line=4,rot=0){g.beginPath();g.ellipse(x,y,Math.abs(rx),Math.abs(ry),rot,0,TAU);if(fill){g.fillStyle=fill;g.fill();}if(line){g.lineWidth=line;g.strokeStyle=INK;g.stroke();}}
function poly(g,pts,fill,line=4){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(line){g.lineWidth=line;g.strokeStyle=INK;g.lineJoin='round';g.stroke();}}
function limb(g,x1,y1,x2,y2,w,fill){g.lineCap='round';g.strokeStyle=INK;g.lineWidth=w+7;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();g.strokeStyle=fill;g.lineWidth=w;g.stroke();}
function lg(g,x0,y0,x1,y1,stops){const gr=g.createLinearGradient(x0,y0,x1,y1);stops.forEach((c,i)=>gr.addColorStop(i/(stops.length-1),c));return gr;}
function rg(g,x,y,r0,r1,stops){const gr=g.createRadialGradient(x,y,r0,x,y,r1);stops.forEach((c,i)=>gr.addColorStop(i/(stops.length-1),c));return gr;}
function rrect(g,x,y,w,h,r,fill,line=4){g.beginPath();g.roundRect?g.roundRect(x,y,w,h,r):g.rect(x,y,w,h);if(fill){g.fillStyle=fill;g.fill();}if(line){g.lineWidth=line;g.strokeStyle=INK;g.stroke();}}
function eye(g,x,y,r,A,iris='#222',white='#fff',lookAmt=.55){ell(g,x,y,r,r*1.08,white,3);const lx=A.look.x*r*lookAmt,ly=A.look.y*r*lookAmt;ell(g,x+lx,y+ly,r*.5,r*.5,iris,0);ell(g,x+lx-r*.12,y+ly-r*.15,r*.16,r*.16,'#fff',0);}
function brow(g,x,y,w,ang,col=INK){g.save();g.translate(x,y);g.rotate(ang);g.fillStyle=col;g.fillRect(-w/2,-3,w,7);g.restore();}
function spikes(g,cx,cy,r,n,len,fill,rot=0){for(let i=0;i<n;i++){const a=rot+i/n*TAU;poly(g,[[cx+Math.cos(a-.12)*r,cy+Math.sin(a-.12)*r],[cx+Math.cos(a)*(r+len),cy+Math.sin(a)*(r+len)],[cx+Math.cos(a+.12)*r,cy+Math.sin(a+.12)*r]],fill,3);}}
function teeth(g,x,y,w,n,h,col='#fff'){for(let i=0;i<n;i++){const tx=x-w/2+w*(i+.5)/n;poly(g,[[tx-w/n*.45,y],[tx,y+h],[tx+w/n*.45,y]],col,2);}}
function mouth(g,x,y,w,open,A,fill='#3a0a0e'){const h=6+open*28;ell(g,x,y+h/2,w/2,h/2,fill,4);if(open>.2)teeth(g,x,y+1,w*.8,5,8);}
const sway=(A,k=1,s=1)=>Math.sin(A.t*1.7*s)*k;

// ---------------------------------------------------------------- HAL
const lens={hit:[[0,0,100],[0,10,80]],muz:{mouth:[0,0],eye:[0,0],center:[0,0],l:[-90,10],r:[90,10]},
 draw(g,A){const [m,d,a,l]=A.pal;
  rrect(g,-132,-92,264,184,34,lg(g,0,-92,0,92,['#4a4a55','#1d1d24','#0e0e12']),5);
  rrect(g,-120,-80,240,160,28,null,2);
  for(let i=0;i<7;i++){ell(g,-96+i*32,-72,5,5,(Math.sin(A.t*3+i*1.7)>0?a:'#552')+'',2);ell(g,-96+i*32,72,5,5,(Math.sin(A.t*2.3+i)>0?l:'#443'),2);}
  ell(g,0,0,86,86,lg(g,0,-86,0,86,['#8a8a94','#2a2a30']),5);ell(g,0,0,72,72,'#0a0a0d',3);
  const gl=.6+A.glow*.4+Math.sin(A.t*2)*.08;ell(g,0,0,60,60,rg(g,0,0,4,60,['#ffe36a',a,m,'#3a0408']),0);
  g.globalAlpha=.3+gl*.5;ell(g,0,0,66,66,null,0);g.globalAlpha=1;
  ell(g,A.look.x*14,A.look.y*14,17+A.open*8,17+A.open*8,'#fff7c0',0);ell(g,A.look.x*14-8,A.look.y*14-10,8,6,'#fff',0,-.5);
  g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=3;g.beginPath();g.arc(0,0,50,3.6,5);g.stroke();
  limb(g,-60,-92,-76,-120,10,'#333');limb(g,60,-92,78,-122,10,'#333');ell(g,-76,-122,7,7,a,3);ell(g,78,-122,7,7,a,3);}};
// ---------------------------------------------------------------- Mother Brain
const brainjar={hit:[[0,-15,100],[0,40,70]],muz:{mouth:[0,0],eye:[0,0],center:[0,0],l:[-80,30],r:[80,30]},
 draw(g,A){const [m,d,a,l]=A.pal;rrect(g,-120,70,240,34,10,lg(g,0,70,0,104,['#666b7c','#2a2d38']),5);
  for(const sx of [-1,1]){limb(g,sx*70,100,sx*120,80,14,'#555a6a');limb(g,sx*40,100,sx*70,126,10,'#555a6a');}
  rrect(g,-112,-100,224,176,46,'rgba(120,240,230,.28)',5);const pul=1+Math.sin(A.t*3)*.03+A.glow*.04;g.save();g.scale(pul,pul);
  for(const [x,y,r] of [[-45,-30,48],[45,-30,48],[0,-60,46],[-30,18,42],[32,18,42],[0,-8,52]])ell(g,x,y,r,r*.85,rg(g,x-10,y-14,2,r,[l,m,'#a02a62']),3);
  g.strokeStyle='rgba(120,20,70,.55)';g.lineWidth=3;for(let i=0;i<9;i++){g.beginPath();g.arc(-60+i*15,-40+Math.sin(i*2)*30,18,0,3);g.stroke();}g.restore();
  eye(g,0,-8,26,A,a,'#fff',.5);ell(g,0,-8,12,12,'#101020',0);ell(g,A.look.x*8,-8+A.look.y*8,6,6,a,0);
  rrect(g,-112,-100,224,176,46,null,5);g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=4;g.beginPath();g.moveTo(-90,-80);g.lineTo(-90,10);g.stroke();
  if(A.open>.2){g.globalAlpha=A.open*.5;ell(g,0,-8,70,70,a,0);g.globalAlpha=1;}}};
// ---------------------------------------------------------------- saucer (Wily / Eggman)
const saucer={hit:[[0,-10,90],[0,35,80]],muz:{mouth:[0,40],eye:[0,0],center:[0,10],l:[-90,40],r:[90,40]},
 draw(g,A){const [m,d,a,l]=A.pal,egg=A.v.kind==='eggman',by=Math.sin(A.t*2)*3;
  if(egg){ell(g,0,34+by,112,78,lg(g,0,-40,0,110,['#ff5a4a',m,'#7a0d12']),5);ell(g,0,52+by,114,28,'#d8d8d8',4);ell(g,0,62+by,40,30,'#f0e8d0',3);
   for(const sx of [-1,1])limb(g,sx*108,30,sx*140,70,14,'#ccc');ell(g,0,-8,86,62,'rgba(180,230,255,.45)',4);}
  else{ell(g,0,50+by,138,34,lg(g,0,16,0,84,[l,m,d]),5);ell(g,0,34+by,100,26,lg(g,0,10,0,60,['#fff',m]),3);ell(g,0,-14,80,70,'rgba(190,235,255,.45)',4);
   for(let i=-3;i<=3;i++)ell(g,i*36,50+by,5,5,a,2);poly(g,[[-26,78],[26,78],[0,110]],'#444',3);poly(g,[[-120,60],[-100,100],[-80,60]],'#555',3);poly(g,[[120,60],[100,100],[80,60]],'#555',3);}
  A.face(g,0,-14,egg?100:98,{clipR:44,emoji:true});
  if(egg){g.fillStyle='#6a3a1a';poly(g,[[-34,16],[0,6],[34,16],[26,30],[0,20],[-26,30]],'#6a3a1a',3);}
  g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=5;g.beginPath();g.arc(0,-14,70,3.6,4.5);g.stroke();
  if(A.open>.2){g.globalAlpha=A.open*.6;ell(g,0,92+by,22,14,a,0);g.globalAlpha=1;}}};
// ---------------------------------------------------------------- bust (suits, kings, nurses...)
const bust={hit:[[0,-60,60],[0,20,92]],muz:{mouth:[0,-40],eye:[0,-60],center:[0,0],l:[-100,10],r:[100,10]},
 draw(g,A){const v=A.v,[m,d,a,l]=A.pal,suit=v.suit||m,up=A.open,sw=sway(A,5);
  if(v.cape)poly(g,[[-92,-30],[92,-30],[150,110],[-150,110]],v.cape,5);
  if(v.hunch)g.translate(0,10);
  // torso
  poly(g,[[-96,110],[-84,-24],[-40,-44],[40,-44],[84,-24],[96,110]],lg(g,0,-44,0,110,[suit,d]),5);
  poly(g,[[-26,-44],[0,40],[26,-44]],v.cross?'#fff':'#f1ede6',3);
  if(v.apron)poly(g,[[-56,20],[56,20],[66,110],[-66,110]],'#fff',4);
  if(v.nehru){poly(g,[[-28,-46],[28,-46],[24,110],[-24,110]],suit,3);rrect(g,-30,-52,60,14,5,lg(g,0,-52,0,-38,[suit,d]),3);g.fillStyle=d;for(let y=-20;y<100;y+=26){g.beginPath();g.arc(0,y,3.5,0,TAU);g.fill();}}
  else poly(g,[[-10,-38],[10,-38],[14,30],[0,48],[-14,30]],v.tie||a,3);
  if(v.cross){g.fillStyle='#d6283c';g.fillRect(-4,-4,8,24);g.fillRect(-12,4,24,8);}
  if(v.jacket){poly(g,[[-84,-24],[-40,-44],[-26,-44],[-40,110],[-96,110]],'#2a4678',3);poly(g,[[84,-24],[40,-44],[26,-44],[40,110],[96,110]],'#2a4678',3);}
  if(v.mark){g.fillStyle=l;g.font='bold 20px Arial Black,Arial';g.textAlign='center';for(const [x,y] of [[-60,10],[56,30],[-52,66],[52,80],[0,86]])g.fillText(v.mark,x,y);}
  // arms
  const raise=lerp(0,50,up),hx=118+sw,hy=30-raise;
  limb(g,-80,-20,-118-sw,34-raise,26,suit);limb(g,80,-20,hx,hy,26,suit);ell(g,-118-sw,34-raise,16,16,'#e8c19f',3);ell(g,hx,hy,16,16,'#e8c19f',3);
  // props in right hand
  g.save();g.translate(hx,hy);
  switch(v.prop){case 'cane':g.rotate(-.2);g.fillStyle='#222';g.fillRect(-4,-130,8,170);ell(g,0,-134,14,14,a,3);g.fillStyle='#fff';g.font='bold 18px Arial';g.textAlign='center';g.fillText('?',0,-128);break;
   case 'ladle':g.rotate(-.5+Math.sin(A.t*3)*.15*(1+up));g.fillStyle='#8a5a2a';g.fillRect(-4,-110,8,130);ell(g,0,-118,26,20,'#bbb',4);ell(g,0,-118,18,13,'#d9822b',0);break;
   case 'syringe':g.rotate(-.7);g.fillStyle='#ddd';g.fillRect(-9,-90,18,70);g.fillStyle=a;g.fillRect(-7,-60,14,40);g.fillStyle='#999';g.fillRect(-2,-120,4,32);g.fillRect(-18,-22,36,6);break;
   case 'plate':ell(g,0,-40,38,38,'#fff',4);ell(g,0,-40,28,28,'#ffd3e8',2);ell(g,0,-40,12,12,'#f08fc4',0);break;
   case 'fingers':g.rotate(-.5);for(const s of [-1,1])limb(g,0,0,s*10,-34,7,'#e8c19f');ell(g,0,-36,5,5,'#e8c19f',2);break;
   case 'crossbow':g.rotate(-.9);g.fillStyle='#6a3a1a';g.fillRect(-8,-70,16,70);g.strokeStyle='#3a2a1a';g.lineWidth=7;g.beginPath();g.arc(0,-60,34,3.6,5.8);g.stroke();break;
   case 'candle':g.rotate(-.2);g.fillStyle='#d9b24a';g.fillRect(-7,-60,14,70);ell(g,0,-62,13,6,'#f6d56a',3);ell(g,0,-82+Math.sin(A.t*9)*2,7,14,'#ffb02e',0);break;
   case 'board':g.rotate(.6);rrect(g,-66,-8,132,16,8,'#d94a8c',4);break;
   case 'scepter':g.rotate(-.2);g.fillStyle='#fff';g.fillRect(-4,-120,8,150);ell(g,0,-126,17,17,a,3);ell(g,0,-126,8,8,'#fff',0);break;
   case 'cat':{const purr=Math.sin(A.t*2.2)*2;g.rotate(.1);ell(g,-34,-6+purr,46,30,'#f4f2ee',4);ell(g,-4,-30+purr,7,20,'#f4f2ee',3);ell(g,-62,-30,26,24,'#f4f2ee',4);
    poly(g,[[-80,-44],[-76,-66],[-64,-50]],'#f4f2ee',3);poly(g,[[-56,-50],[-46,-68],[-42,-46]],'#f4f2ee',3);ell(g,-70,-32,4,5,'#3a8fd8',0);ell(g,-56,-32,4,5,'#3a8fd8',0);
    g.fillStyle='#e89aa8';g.beginPath();g.arc(-63,-24,3,0,TAU);g.fill();g.strokeStyle='#999';g.lineWidth=1.5;for(const s2 of [-1,1]){g.beginPath();g.moveTo(-63+s2*4,-22);g.lineTo(-63+s2*22,-26+s2*2);g.stroke();}break;}
   case 'moneybag':ell(g,0,-26,34,32,'#e8d8a0',4);g.fillStyle='#2e8b57';g.font='bold 30px Arial Black,Arial';g.textAlign='center';g.fillText('$',0,-14);break;}
  g.restore();
  // head
  const tx=A.look.x*7,ty=A.look.y*3;
  ell(g,tx,-84,50,52,'#e8c19f',0);
  if(!A.face(g,tx,-86+ty,106,{clipR:48,emoji:true,tilt:A.look.x*.1})){}
  // hats
  const hy2=-122+ty;g.save();g.translate(tx,0);
  switch(v.hat){case 'bowler':ell(g,0,hy2+14,60,10,'#1f9d55',4);ell(g,0,hy2-4,38,34,'#1f9d55',4);g.fillStyle='#6a2cb8';g.fillRect(-36,hy2+4,72,9);break;
   case 'top':rrect(g,-34,hy2-62,68,64,6,'#1b1b1b',4);ell(g,0,hy2+4,64,11,'#1b1b1b',4);g.fillStyle='#ffd23c';g.fillRect(-34,hy2-10,68,9);break;
   case 'chef':ell(g,-24,hy2-14,26,24,'#fff',4);ell(g,24,hy2-14,26,24,'#fff',4);ell(g,0,hy2-30,28,28,'#fff',4);rrect(g,-36,hy2-8,72,22,4,'#fff',4);break;
   case 'nurse':rrect(g,-40,hy2-22,80,34,8,'#fff',4);g.fillStyle='#d6283c';g.fillRect(-4,hy2-18,8,22);g.fillRect(-11,hy2-11,22,8);break;
   case 'bow':ell(g,0,hy2+2,48,12,'#c8161d',3);poly(g,[[-22,hy2-8],[-52,hy2-26],[-52,hy2+14]],'#c8161d',3);poly(g,[[22,hy2-8],[52,hy2-26],[52,hy2+14]],'#c8161d',3);break;
   case 'crown':case 'crown2':poly(g,[[-40,hy2+14],[-44,hy2-24],[-22,hy2-6],[0,hy2-34],[22,hy2-6],[44,hy2-24],[40,hy2+14]],'#f2c23c',4);ell(g,0,hy2-20,5,5,'#d6283c',2);break;
   case 'pomp':ell(g,0,hy2,52,24,'#2a1a10',4);poly(g,[[-48,hy2+4],[-10,hy2-34],[40,hy2-16],[52,hy2+4]],'#2a1a10',4);break;
   case 'shades':break;}
  if(v.prop==='shades'){g.fillStyle='#050505';g.fillRect(-38,-96+ty,76,14);g.fillStyle='rgba(120,255,160,.35)';g.fillRect(-34,-94+ty,24,3);}
  if(v.stache){g.fillStyle='#222';poly(g,[[-30,-68],[0,-76],[30,-68],[24,-60],[0,-66],[-24,-60]],'#222',2);}
  if(v.monocle){g.strokeStyle='#d8b24a';g.lineWidth=3;g.beginPath();g.arc(16,-96+ty,13,0,TAU);g.stroke();}
  if(v.scar){g.strokeStyle='#8a3a3a';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(10,-112+ty);g.quadraticCurveTo(22,-96+ty,18,-70+ty);g.stroke();g.strokeStyle='#d58a8a';g.lineWidth=1.5;g.stroke();}
  if(v.glasses){g.strokeStyle='#222';g.lineWidth=3;for(const x of [-16,16]){g.beginPath();g.arc(x,-94+ty,11,0,TAU);g.stroke();}}
  if(v.earpiece){g.strokeStyle='#ddd';g.lineWidth=2;g.beginPath();g.moveTo(44,-88);g.quadraticCurveTo(60,-60,40,-40);g.stroke();}
  g.restore();}};
// ---------------------------------------------------------------- brute (wrestlers, tyrants)
const brute={hit:[[0,-70,58],[0,10,100]],muz:{mouth:[0,-50],eye:[0,-70],center:[0,0],l:[-110,20],r:[110,20]},
 draw(g,A){const v=A.v,[m,d,a,l]=A.pal,skin=v.skin||'#d9a07a',up=A.open,sw=sway(A,6),pun=A.pose==='fire'?1:0;
  const arms=v.arms||2;
  const arm=(sx,y0,len,col,phase)=>{const bx=sx*92,by=y0,hx=sx*(150+len*10)+Math.sin(A.t*2+phase)*5*sx,hy=by+44-up*60+Math.cos(A.t*2+phase)*4;limb(g,bx,by,hx,hy,34,skin);ell(g,hx,hy,23,21,v.gloves||skin,4);if(v.gloves)ell(g,hx-sx*7,hy-6,8,6,'rgba(255,255,255,.35)',0);};
  if(v.ring){g.strokeStyle='#e8e8e8';g.lineWidth=7;for(let i=0;i<3;i++){g.beginPath();g.moveTo(-150,-40+i*50);g.lineTo(150,-40+i*50);g.stroke();}g.strokeStyle='#c8161d';g.lineWidth=3;for(let i=0;i<3;i++){g.beginPath();g.moveTo(-150,-40+i*50);g.lineTo(150,-40+i*50);g.stroke();}}
  if(v.outfit==='coat')poly(g,[[-120,120],[-100,-20],[-60,-60],[60,-60],[100,-20],[120,120]],lg(g,0,-60,0,120,[m,d]),5);
  if(arms===4){arm(-1,-4,0,skin,0);arm(1,-4,0,skin,1);arm(-1,40,-2,skin,2);arm(1,40,-2,skin,3);}else{arm(-1,-14,0,skin,0);arm(1,-14,0,skin,1);}
  // torso
  poly(g,[[-92,115],[-104,-22],[-58,-58],[58,-58],[104,-22],[92,115]],lg(g,0,-58,0,115,[skin,d]),5);
  if(v.outfit==='coat'||v.vest){poly(g,[[-92,115],[-104,-22],[-58,-58],[-24,-58],[-30,115]],v.vest||m,4);poly(g,[[92,115],[104,-22],[58,-58],[24,-58],[30,115]],v.vest||m,4);}
  if(v.outfit==='armor'){poly(g,[[-104,-22],[-58,-58],[-20,-48],[-30,50],[-96,60]],'#6c7078',4);poly(g,[[104,-22],[58,-58],[20,-48],[30,50],[96,60]],'#6c7078',4);ell(g,-100,-40,36,26,'#8a8f98',4);ell(g,100,-40,36,26,'#8a8f98',4);g.fillStyle='#4a4e56';g.fillRect(-60,10,120,26);}
  else if(v.outfit==='trunks'){poly(g,[[-80,80],[80,80],[92,118],[-92,118]],v.trunks||'#c8161d',4);g.fillStyle='#fff';g.fillRect(-82,80,164,8);}
  else if(v.outfit==='bare'){for(const sx of [-1,1]){ell(g,sx*34,-6,34,26,'rgba(0,0,0,.14)',2);}g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=3;g.beginPath();g.moveTo(0,-30);g.lineTo(0,70);g.stroke();g.fillStyle=v.belt||a;g.fillRect(-84,74,168,16);}
  if(v.tubes){g.strokeStyle='#222';g.lineWidth=7;g.beginPath();g.moveTo(-50,-80);g.quadraticCurveTo(-90,-20,-40,30);g.moveTo(50,-80);g.quadraticCurveTo(90,-20,40,30);g.stroke();}
  if(v.tentacles){g.strokeStyle='#b0507a';g.lineWidth=14;g.lineCap='round';for(let i=0;i<3;i++){g.beginPath();g.moveTo(-90+i*8,-10);g.quadraticCurveTo(-140-Math.sin(A.t*3+i)*20,30+i*30,-120,110);g.stroke();g.beginPath();g.moveTo(90-i*8,-10);g.quadraticCurveTo(140+Math.sin(A.t*3+i)*20,30+i*30,120,110);g.stroke();}}
  if(v.scars){g.strokeStyle='#8a4a3a';g.lineWidth=3;g.beginPath();g.moveTo(-40,-20);g.lineTo(-20,10);g.moveTo(30,-30);g.lineTo(50,0);g.stroke();}
  // head
  const tx=A.look.x*8,ty=-82+A.look.y*3;ell(g,tx,ty,48,50,skin,0);
  if(v.hair==='mohawk'||v.hair==='blond'){poly(g,[[-34+tx,ty-36],[-10+tx,ty-64],[16+tx,ty-60],[40+tx,ty-34]],v.hair==='blond'?'#f2d98a':'#222',4);}
  A.face(g,tx,ty,100,{clipR:47,emoji:true,tilt:A.look.x*.08});
  if(v.hair==='beard'){poly(g,[[-32+tx,ty+16],[32+tx,ty+16],[40+tx,ty+54],[0+tx,ty+68],[-40+tx,ty+54]],'#5a3a1a',4);}
  if(v.outfit==='mask'){poly(g,[[-34+tx,ty+4],[34+tx,ty+4],[34+tx,ty+34],[0+tx,ty+44],[-34+tx,ty+34]],'#2a2a2a',4);g.fillStyle='#777';for(let i=0;i<4;i++)g.fillRect(-20+tx+i*10,ty+14,4,16);}
  if(v.helmet){poly(g,[[-52+tx,ty+4],[-50+tx,ty-44],[0+tx,ty-62],[50+tx,ty-44],[52+tx,ty+4],[34+tx,ty-12],[-34+tx,ty-12]],v.skull?'#e9e2d2':'#8a8f98',4);if(v.skull){ell(g,-16+tx,ty-30,8,10,'#111',0);ell(g,16+tx,ty-30,8,10,'#111',0);poly(g,[[-6+tx,ty-18],[6+tx,ty-18],[0+tx,ty-8]],'#111',0);}else{g.fillStyle='#14161a';g.fillRect(-26+tx,ty-30,52,10);}}
  if(v.skull)for(const sx of [-1,1])poly(g,[[sx*40+tx,ty-48],[sx*76+tx,ty-90],[sx*54+tx,ty-30]],'#d9d2c2',4);}};
// ---------------------------------------------------------------- ninja (Sub-Zero)
const ninja={hit:[[0,-50,55],[0,30,90]],muz:{mouth:[0,-50],eye:[0,-50],center:[0,0],l:[-90,10],r:[90,10]},
 draw(g,A){const [m,d,a,l]=A.pal,up=A.open,t=A.t;
  for(let i=0;i<8;i++){const x=-130+i*37,h=30+((i*37)%5)*14+Math.sin(t*2+i)*4;poly(g,[[x-10,70],[x,70-h],[x+10,70]],'rgba(170,235,255,.65)',3);}
  poly(g,[[-100,120],[-70,-28],[-30,-56],[30,-56],[70,-28],[100,120]],lg(g,0,-56,0,120,[m,d]),5);poly(g,[[-34,-56],[34,-56],[22,100],[-22,100]],'#101a3a',3);g.fillStyle='#ffd23c';g.fillRect(-90,40,180,12);
  const ax=122+Math.sin(t*2)*6,ay=10-up*50;limb(g,-76,-20,-ax,ay+16,28,m);limb(g,76,-20,ax,ay,28,m);
  for(const sx of [-1,1]){const x=sx*ax,y=ay+(sx<0?16:0);ell(g,x,y,22,20,'#9fe8ff',4);for(let i=0;i<5;i++)poly(g,[[x-16+i*8,y-12],[x-14+i*8,y-34-(i%2)*10],[x-8+i*8,y-12]],'#e8fbff',2);}
  ell(g,0,-84,46,50,m,5);A.face(g,A.look.x*5,-84,92,{clipR:42,emoji:true});
  poly(g,[[-42,-80],[42,-80],[40,-50],[0,-40],[-40,-50]],'#101a3a',4);g.fillStyle='#fff';g.fillRect(-20,-60,40,4);
  poly(g,[[-48,-102],[48,-102],[44,-124],[0,-132],[-44,-124]],m,4);g.fillStyle=l;g.fillRect(-48,-102,96,10);
  poly(g,[[-30,-60],[-90,-80],[-120,-30]],m,3);g.globalAlpha=.8;ell(g,0,-90,70,76,rg(g,0,-90,40,76,['rgba(159,232,255,0)','rgba(159,232,255,.35)']),0);g.globalAlpha=1;}};
// ---------------------------------------------------------------- stalker (Predator)
const stalker={hit:[[0,-60,52],[0,30,88]],muz:{mouth:[0,-50],eye:[0,-50],center:[0,0],l:[-80,-70],r:[90,0]},
 draw(g,A){const [m,d,a,l]=A.pal,t=A.t,cloak=.78+Math.sin(t*6)*.12;g.globalAlpha=cloak;
  for(let i=0;i<9;i++){const x=-44+i*11,sw=Math.sin(t*2+i)*8;limb(g,x*.7,-100,x*1.4+sw,-30+(i%3)*14,8,'#3a2a14');}
  poly(g,[[-100,120],[-76,-20],[-34,-58],[34,-58],[76,-20],[100,120]],lg(g,0,-58,0,120,[m,d]),5);
  g.strokeStyle='#1a2a12';g.lineWidth=3;for(let i=0;i<6;i++){g.beginPath();g.moveTo(-84+i*10,-10+i*14);g.lineTo(84-i*10,-10+i*14);g.stroke();}
  limb(g,-70,-20,-120,30,26,m);limb(g,70,-20,120,10-A.open*40,26,m);ell(g,120,10-A.open*40,18,18,'#554',3);
  rrect(g,-130,-100,60,26,6,'#555a5e',4);ell(g,-100,-87,8,8,a,2);
  ell(g,0,-84,44,50,'#a8a070',5);poly(g,[[-44,-96],[44,-96],[34,-120],[-34,-120]],'#6a604a',4);
  for(const sx of [-1,1]){eye(g,sx*18,-90,9,A,'#ffcc22','#fffbd0',.6);}
  poly(g,[[-30,-62],[30,-62],[22,-34],[0,-26],[-22,-34]],'#3a3a20',4);
  for(const sx of [-1,1]){poly(g,[[sx*24,-52],[sx*50,-60],[sx*40,-30]],'#d8d0a0',3);poly(g,[[sx*10,-48],[sx*34,-30],[sx*16,-24]],'#d8d0a0',3);}
  for(const sx of [-1,0,1]){ell(g,sx*10+A.look.x*4,-6+A.look.y*3,5,5,'#ff2b2b',0);}
  g.globalAlpha=1;}};
// ---------------------------------------------------------------- liquid (T-1000)
const liquid={hit:[[0,-40,70],[0,40,90]],muz:{mouth:[0,-30],eye:[0,-40],center:[0,0],l:[-100,10],r:[100,10]},
 draw(g,A){const t=A.t,up=A.open,w=pts=>pts;const n=18,pts=[];
  for(let i=0;i<n;i++){const a=i/n*TAU,r=96+Math.sin(t*3+i*1.7)*10+(Math.sin(a*2)>.8?up*30:0);pts.push([Math.cos(a)*r*1.15,Math.sin(a)*r*.95+8]);}
  g.beginPath();pts.forEach((p,i)=>{const q=pts[(i+1)%n];const mx=(p[0]+q[0])/2,my=(p[1]+q[1])/2;i?g.quadraticCurveTo(p[0],p[1],mx,my):g.moveTo(mx,my);});g.closePath();
  g.fillStyle=lg(g,-100,-100,100,100,['#ffffff','#9aa6b6','#e8eef6','#59657a','#c4cedc']);g.fill();g.lineWidth=5;g.strokeStyle=INK;g.stroke();
  for(const s of [-1,1]){const ex=s*(120+up*60),ey=Math.sin(t*2+s)*20+10;poly(g,[[s*80,-10],[ex,ey],[s*86,24]],lg(g,0,0,ex,0,['#cfd8e3','#fff']),4);}
  ell(g,0,-44,48,52,'#b8c2d0',4);A.face(g,A.look.x*4,-44,90,{clipR:42,emoji:true,tint:'chrome'});
  g.fillStyle='rgba(255,255,255,.55)';ell(g,-34,-18,22,8,'rgba(255,255,255,.55)',0,-.5);
  for(let i=0;i<4;i++){const dx=-70+i*46,dy=((t*40+i*30)%50);ell(g,dx,96+dy*.5,6,9,'#cfd8e3',2);}}};
// ---------------------------------------------------------------- pyramid
const pyramid={hit:[[0,-58,64],[0,35,90]],muz:{mouth:[0,-40],eye:[0,-50],center:[0,10],l:[-110,50],r:[110,50]},
 draw(g,A){const [m,d,a,l]=A.pal,t=A.t,up=A.open;
  poly(g,[[-96,120],[-84,-14],[-40,-34],[40,-34],[84,-14],[96,120]],lg(g,0,-34,0,120,['#8a5a4a',d]),5);poly(g,[[-60,0],[60,0],[70,120],[-70,120]],'#6e1d12',4);
  g.strokeStyle='#d9d2c4';g.lineWidth=6;for(let i=0;i<4;i++){g.beginPath();g.moveTo(-90,10+i*26);g.lineTo(90,10+i*26);g.stroke();}
  const kx=-122-sway(A,6),ky=10;limb(g,-80,-10,kx,ky,28,'#8a5a4a');limb(g,80,-10,120,40-up*60,28,'#8a5a4a');
  g.save();g.translate(kx,ky);g.rotate(-.12+Math.sin(t*1.2)*.05);g.fillStyle='#5a5a5e';poly(g,[[-10,-170],[16,-170],[22,40],[-16,40]],'#aab0b8',5);g.fillStyle='#6a4a2a';g.fillRect(-12,40,24,50);g.restore();
  poly(g,[[-70,-44],[0,-150],[70,-44]],lg(g,0,-150,0,-44,['#9a9a9e','#4a4a50']),5);poly(g,[[0,-150],[70,-44],[30,-44],[0,-100]],'rgba(0,0,0,.25)',0);
  g.strokeStyle='#7a2a18';g.lineWidth=3;for(let i=0;i<5;i++){g.beginPath();g.moveTo(-50+i*22,-52-i*3);g.lineTo(-40+i*22,-90+(i%2)*10);g.stroke();}
  ell(g,-0,-44+A.look.y*2,34,8,'#2a2a2e',3);if(A.glow>.1){g.globalAlpha=A.glow*.5;ell(g,0,-86,24,24,a,0);g.globalAlpha=1;}}};
// ---------------------------------------------------------------- clown
const clown={hit:[[0,-50,76],[0,50,80]],muz:{mouth:[0,-26],eye:[0,-60],center:[0,0],l:[-100,10],r:[100,10]},
 draw(g,A){const [m,d,a,l]=A.pal,t=A.t,up=A.open;
  for(let i=0;i<3;i++){const bx=-120+i*120+Math.sin(t*1.5+i)*10,by=-100+(i%2)*30-Math.sin(t*2+i)*6;g.strokeStyle='#ddd';g.lineWidth=2;g.beginPath();g.moveTo(bx,by+26);g.quadraticCurveTo(bx+10,60,i*20-20,80);g.stroke();ell(g,bx,by,22,27,i===1?'#ffdb3b':a,3);ell(g,bx-8,by-10,5,8,'rgba(255,255,255,.7)',0);}
  poly(g,[[-96,120],[-80,10],[-40,-10],[40,-10],[80,10],[96,120]],lg(g,0,-10,0,120,['#f1ede6','#c9c0b0']),5);for(let i=0;i<3;i++)ell(g,0,30+i*32,12,12,a,3);
  limb(g,-76,10,-126-sway(A,5),50,26,'#f1ede6');limb(g,76,10,126+sway(A,5),50-up*40,26,'#f1ede6');ell(g,-126,50,16,16,'#fff',3);ell(g,126,50-up*40,16,16,'#fff',3);
  for(let i=0;i<9;i++){const an=-2.6+i*.33;ell(g,Math.cos(an)*54,-8+Math.sin(an)*20,22,16,i%2?'#fff':a,3);}
  for(const sx of [-1,1])poly(g,[[sx*34,-80],[sx*84,-110+Math.sin(t*3)*4],[sx*70,-60]],'#d9461e',4);
  ell(g,0,-64,52,56,'#f4efe6',5);A.face(g,A.look.x*4,-64,100,{clipR:50,emoji:false})||((()=>{
   for(const sx of [-1,1]){eye(g,sx*20,-78,11,A,'#e8a317','#fff',.6);}ell(g,0,-62,9,9,a,3);poly(g,[[-24,-38],[0,-34-up*10],[24,-38],[16,-24-up*16],[0,-20-up*18],[-16,-24-up*16]],'#c8161d',3);teeth(g,0,-36,34,6,6);
   g.strokeStyle=a;g.lineWidth=5;g.beginPath();g.moveTo(-18,-82);g.lineTo(-18,-58);g.moveTo(18,-82);g.lineTo(18,-58);g.stroke();})());
  poly(g,[[-42,-96],[-22,-132],[0,-100],[22,-132],[42,-96]],'#d9461e',4);}};
// ---------------------------------------------------------------- vampire
const vampire={hit:[[0,-60,56],[0,30,100]],muz:{mouth:[0,-50],eye:[0,-60],center:[0,0],l:[-110,10],r:[110,10]},
 draw(g,A){const [m,d,a,l]=A.pal,t=A.t,fl=Math.sin(t*2.4)*18+A.open*30;
  for(const sx of [-1,1]){poly(g,[[sx*30,-40],[sx*(140+fl),-110],[sx*(170+fl),30],[sx*(130+fl*.5),20],[sx*(110),90],[sx*(80),50],[sx*30,110]],lg(g,0,-100,sx*160,60,[m,d]),5);g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=3;g.beginPath();g.moveTo(sx*40,-30);g.lineTo(sx*(150+fl),-20);g.moveTo(sx*40,-10);g.lineTo(sx*(125+fl*.5),60);g.stroke();}
  poly(g,[[-70,120],[-60,-24],[-30,-44],[30,-44],[60,-24],[70,120]],'#14101c',5);poly(g,[[-24,-44],[0,40],[24,-44]],'#f4eee6',3);ell(g,0,-4,7,7,a,2);
  poly(g,[[-50,-48],[-30,-96],[-18,-44]],m,4);poly(g,[[50,-48],[30,-96],[18,-44]],m,4);
  limb(g,-64,-16,-100,30-A.open*40,22,'#14101c');limb(g,64,-16,100,30-A.open*40,22,'#14101c');ell(g,-100,30-A.open*40,14,14,'#e9e2d6',3);ell(g,100,30-A.open*40,14,14,'#e9e2d6',3);
  ell(g,0,-84,44,50,'#e9e2d6',0);A.face(g,A.look.x*5,-84,98,{clipR:44,emoji:true});poly(g,[[-40,-112],[-20,-130],[0,-112],[20,-130],[40,-112],[40,-92],[-40,-92]],'#171320',0);
  if(A.open>.3){poly(g,[[-8,-60],[-4,-48],[0,-60]],'#fff',1);poly(g,[[8,-60],[4,-48],[0,-60]],'#fff',1);}}};
// ---------------------------------------------------------------- reaper (Death, Castlevania)
const reaper={hit:[[0,-70,50],[0,30,92]],muz:{mouth:[0,-62],eye:[0,-84],center:[0,0],l:[-110,0],r:[110,0]},
 draw(g,A){const [m,d,a,l]=A.pal,t=A.t,arm=10-A.open*34;g.translate(0,Math.sin(t*1.6)*6);
  g.save();g.rotate(-.3+A.open*.45);limb(g,104,150,104,-112,9,'#6a4a2a');g.beginPath();g.moveTo(106,-112);g.quadraticCurveTo(16,-158,-70,-80);g.quadraticCurveTo(16,-122,104,-86);g.closePath();g.fillStyle=a;g.fill();g.lineWidth=4;g.strokeStyle=INK;g.stroke();g.restore();
  const hem=[];for(let i=0;i<=8;i++)hem.push([-96+i*24,118+(i%2?-18:6)+Math.sin(t*3+i)*6]);
  poly(g,[[-40,-104],[40,-104],[82,-30],[100,118],...hem.reverse(),[-100,118],[-82,-30]],lg(g,0,-104,0,120,[m,d]),5);
  limb(g,-60,-40,-112,arm,26,m);limb(g,60,-40,112,arm,26,m);
  for(const sx of [-1,1]){ell(g,sx*112,arm+4,11,10,l,3);g.strokeStyle=INK;g.lineWidth=2;for(let k=-1;k<=1;k++){g.beginPath();g.moveTo(sx*112+k*5,arm+10);g.lineTo(sx*112+k*6,arm+20);g.stroke();}}
  ell(g,0,-90,54,60,d,5);
  ell(g,0,-82,32,36,l,4);
  for(const sx of [-1,1]){ell(g,sx*12,-88,9,10,'#120a14',0);ell(g,sx*12+A.look.x*3,-88+A.look.y*2,3.5,3.5,A.glow>.3?'#ffd23c':'#ff3b3b',0);}
  poly(g,[[-4,-72],[4,-72],[0,-64]],'#120a14',0);
  g.fillStyle=INK;for(let k=0;k<5;k++)g.fillRect(-13+k*6,-58+A.open*4,2,9);g.lineWidth=3;g.strokeStyle=INK;g.beginPath();g.moveTo(-16,-58+A.open*4);g.lineTo(16,-58+A.open*4);g.stroke();}};
// ---------------------------------------------------------------- flesh (The Thing)
const flesh={hit:[[0,-20,90],[0,40,90]],muz:{mouth:[0,10],eye:[-50,-40],center:[0,0],l:[-110,30],r:[110,30]},
 draw(g,A){const [m,d,a,l]=A.pal,t=A.t,up=A.open;
  for(let i=0;i<7;i++){const x0=-110+i*37,wv=Math.sin(t*2.3+i*1.3);g.strokeStyle=INK;g.lineWidth=22;g.lineCap='round';g.beginPath();g.moveTo(x0,60);g.bezierCurveTo(x0-30*wv,110,x0+40*wv,130,x0+(i-3)*22,150+up*10);g.stroke();g.strokeStyle=i%2?m:'#8a3a30';g.lineWidth=16;g.stroke();}
  const n=16,pts=[];for(let i=0;i<n;i++){const an=i/n*TAU,r=100+Math.sin(t*2.7+i*2.1)*9+Math.sin(an*3+t)*6;pts.push([Math.cos(an)*r*1.3,Math.sin(an)*r*.95]);}
  g.beginPath();pts.forEach((p,i)=>{const q=pts[(i+1)%n];const mx=(p[0]+q[0])/2,my=(p[1]+q[1])/2;i?g.quadraticCurveTo(p[0],p[1],mx,my):g.moveTo(mx,my);});g.closePath();g.fillStyle=rg(g,-30,-30,10,150,['#e8907a',m,'#5a1a1a']);g.fill();g.lineWidth=5;g.strokeStyle=INK;g.stroke();
  g.strokeStyle='rgba(60,0,10,.5)';g.lineWidth=3;for(let i=0;i<8;i++){g.beginPath();g.moveTo(-90+i*25,-60+(i%3)*12);g.quadraticCurveTo(-80+i*25,-10,-96+i*25+Math.sin(t+i)*6,40);g.stroke();}
  const mo=.25+up*.75+(A.phase>0?.25:0);ell(g,0,18,60,14+mo*34,'#2a0508',5);teeth(g,0,-4-mo*10,100,9,12+mo*8,'#f4e6c8');ell(g,0,34,30,10+mo*10,'#a23a4a',0);
  for(const [x,y,r] of [[-70,-60,15],[66,-52,12],[-24,-76,10],[90,10,11]])eye(g,x,y,r,A,'#222','#ffe9a0',.5);
  for(const s of [-1,1]){limb(g,s*100,-10,s*(150+Math.sin(t*3)*8),-40-up*30,16,m);limb(g,s*150,-40-up*30,s*(172),-80-up*30,10,'#8a3a30');}}};
// ---------------------------------------------------------------- elder (Cthulhu)
const elder={hit:[[0,-40,76],[0,40,90]],muz:{mouth:[0,10],eye:[0,-40],center:[0,0],l:[-110,10],r:[110,10]},
 draw(g,A){const [m,d,a,l]=A.pal,t=A.t,up=A.open;
  for(const s of [-1,1]){poly(g,[[s*50,-60],[s*(170+Math.sin(t*1.6)*14),-130],[s*(150),-20],[s*(110),10],[s*(40),20]],lg(g,0,-60,s*170,0,[m,d]),5);}
  poly(g,[[-96,120],[-80,-10],[-40,-34],[40,-34],[80,-10],[96,120]],lg(g,0,-34,0,120,[m,d]),5);
  for(let i=0;i<7;i++){const x0=-48+i*16,wv=Math.sin(t*2.2+i*.9);g.strokeStyle=INK;g.lineWidth=17;g.lineCap='round';g.beginPath();g.moveTo(x0,-6);g.bezierCurveTo(x0+wv*30,40,x0-wv*34,80,x0+(i-3)*24,118+up*14);g.stroke();g.strokeStyle=i%2?l:a;g.lineWidth=11;g.stroke();g.strokeStyle=m;g.lineWidth=11;g.globalAlpha=.55;g.stroke();g.globalAlpha=1;}
  ell(g,0,-70,70,62,lg(g,0,-130,0,-10,[l,m,d]),5);
  for(const s of [-1,1]){poly(g,[[s*18,-96],[s*66,-84],[s*56,-62],[s*20,-72]],'#0a1210',3);eye(g,s*38,-76,9+up*3,A,'#ff3b2f','#d6ff7a',.5);}
  for(let i=0;i<5;i++){const x=-34+i*17;g.strokeStyle=INK;g.lineWidth=9;g.lineCap='round';g.beginPath();g.moveTo(x,-34);g.quadraticCurveTo(x+Math.sin(t*3+i)*12,-4,x+(i-2)*8,18+up*8);g.stroke();g.strokeStyle=a;g.lineWidth=5;g.stroke();}
  ell(g,0,-110,16,6,'rgba(0,0,0,.2)',0);}};
// ---------------------------------------------------------------- koopa (Bowser / Ganon)
const koopa={hit:[[0,-50,70],[0,40,95]],muz:{mouth:[0,-30],eye:[0,-60],center:[0,0],l:[-110,20],r:[110,20]},
 draw(g,A){const [m,d,a,l]=A.pal,t=A.t,up=A.open,gan=A.v.kind==='ganon';
  if(!gan){spikes(g,0,30,100,9,34,'#f2e8d0',-1.4);ell(g,0,30,108,80,lg(g,0,-40,0,110,['#58c458',m,'#1f5a1f']),5);for(let i=0;i<4;i++)poly(g,[[-70+i*46,30],[-48+i*46,0],[-26+i*46,30],[-48+i*46,60]],'rgba(255,255,255,.14)',2);}
  else{ell(g,0,40,112,82,lg(g,0,-40,0,120,['#5a4aa0',m,d]),5);for(const s of [-1,1]){poly(g,[[s*60,-50],[s*140,-100],[s*110,-30]],'#2a2060',4);}}
  const mx=A.look.x*8;
  // arms
  for(const s of [-1,1]){const hx=s*(124+Math.sin(t*2+s)*5),hy=40-up*60;limb(g,s*80,10,hx,hy,28,gan?'#3a3080':'#e6a128');ell(g,hx,hy,19,19,gan?'#3a3080':'#e6a128',4);for(let i=-1;i<=1;i++)poly(g,[[hx+i*8-3,hy-14],[hx+i*8,hy-28],[hx+i*8+3,hy-14]],'#fff',2);}
  if(gan){g.strokeStyle='#bbb';g.lineWidth=6;g.beginPath();g.moveTo(132,-60-up*30);g.lineTo(132,110);g.stroke();for(const dx of [-12,0,12]){g.beginPath();g.moveTo(132+dx,-60-up*30);g.lineTo(132+dx,-92-up*30);g.stroke();}}
  // head
  const hy=-72+A.look.y*3;ell(g,mx,hy,60,54,gan?'#4a3a8a':'#58c458',5);
  if(!gan){ell(g,mx,hy-26,66,26,'#d9461e',4);for(let i=0;i<5;i++)poly(g,[[mx-60+i*30,hy-34],[mx-45+i*30,hy-62-(i%2)*14],[mx-30+i*30,hy-34]],'#f6a02a',3);for(const s of [-1,1])poly(g,[[mx+s*36,hy-34],[mx+s*74,hy-84],[mx+s*52,hy-26]],'#f2e8d0',4);
   ell(g,mx,hy+22,48,32,'#e6c05a',4);for(const s of [-1,1])ell(g,mx+s*14,hy+10,4,4,'#222',0);mouth(g,mx,hy+26,60,up,A);for(const s of [-1,1]){eye(g,mx+s*24,hy-10,11,A,'#c8161d','#ffe9a0',.5);brow(g,mx+s*24,hy-24,28,-s*.4);}}
  else{for(const s of [-1,1])poly(g,[[mx+s*40,hy-34],[mx+s*78,hy-90],[mx+s*50,hy-20]],'#2a2060',4);ell(g,mx,hy+24,40,30,'#6a5ab0',4);for(const s of [-1,1])ell(g,mx+s*10,hy+22,4,5,'#222',0);mouth(g,mx,hy+30,56,up,A);teeth(g,mx,hy+28,50,2,12);
   for(const s of [-1,1]){eye(g,mx+s*26,hy-8,11,A,'#ffd23c','#ffe9a0',.5);brow(g,mx+s*26,hy-24,28,-s*.4);}poly(g,[[mx-12,hy-44],[mx,hy-64],[mx+12,hy-44]],a,3);}
 }};
// ---------------------------------------------------------------- serpent (Kaa)
const serpent={hit:[[0,-60,60],[0,40,100]],muz:{mouth:[0,-30],eye:[0,-60],center:[0,20],l:[-100,40],r:[100,40]},
 draw(g,A){const [m,d,a,l]=A.pal,t=A.t,up=A.open;
  for(let k=0;k<3;k++){const y=100-k*52,dir=k%2?1:-1,off=Math.sin(t*1.4+k)*10;g.beginPath();g.moveTo(-136+off,y);g.bezierCurveTo(-60,y-70*dir,60,y+70*dir,136+off,y);g.lineCap='round';g.strokeStyle=INK;g.lineWidth=52;g.stroke();g.strokeStyle=lg(g,0,y-30,0,y+30,[l,m,d]);g.lineWidth=44;g.stroke();g.setLineDash([10,16]);g.strokeStyle=a;g.lineWidth=14;g.stroke();g.setLineDash([]);}
  g.beginPath();g.moveTo(0,40);g.bezierCurveTo(-40+Math.sin(t*1.5)*20,0,40,-20,0,-62);g.strokeStyle=INK;g.lineWidth=58;g.stroke();g.strokeStyle=lg(g,0,-60,0,40,[l,m,d]);g.lineWidth=48;g.stroke();
  ell(g,0,-74,52,44,m,5);ell(g,0,-62,34,22,l,0);
  for(const s of [-1,1]){const ex=s*26+A.look.x*3,ey=-86;ell(g,ex,ey,17,17,'#ffe9a0',3);g.save();g.translate(ex,ey);g.rotate(t*3*s);g.strokeStyle='#c8161d';g.lineWidth=3;g.beginPath();for(let r=1;r<15;r+=.5){g.lineTo(Math.cos(r*.9)*r*.9,Math.sin(r*.9)*r*.9);}g.stroke();g.restore();}
  if(up>.2||Math.sin(t*5)>.7){g.strokeStyle='#d6283c';g.lineWidth=4;g.beginPath();g.moveTo(0,-52);g.lineTo(0,-30-up*16);g.lineTo(-6,-20-up*16);g.moveTo(0,-30-up*16);g.lineTo(6,-20-up*16);g.stroke();}}};
// ---------------------------------------------------------------- spinner (Boom Boom)
const spinner={hit:[[0,0,96]],muz:{mouth:[0,-20],eye:[0,-30],center:[0,0],l:[-90,0],r:[90,0]},
 draw(g,A){const [m,d,a,l]=A.pal,t=A.t,sp=A.pose==='spin'?t*9:Math.sin(t*2)*.3,up=A.open;
  g.save();g.rotate(A.pose==='spin'?t*2:0);spikes(g,0,0,92,10,28,'#f2e8d0',.2);g.restore();
  ell(g,0,0,100,92,lg(g,0,-90,0,90,['#ffb347',m,d]),5);ell(g,0,16,70,56,'#ffd9a0',3);
  for(const s of [-1,1]){const an=sp*s+(s<0?3.14:0)+(A.pose==='spin'?0:s*.6+Math.sin(t*4+s)*.8*(1+up));const ex=Math.cos(an)*150,ey=Math.sin(an)*110;limb(g,s*84,-10,ex*s*(s<0?-1:1),ey,26,'#e6a128');ell(g,ex*s*(s<0?-1:1),ey,21,21,'#e6a128',4);}
  for(const s of [-1,1]){eye(g,s*28,-24,15,A,'#222','#fff',.5);brow(g,s*28,-46,34,-s*.4);}
  poly(g,[[-14,-4],[14,-4],[0,12]],a,3);mouth(g,0,18,64,.4+up,A,'#4a0a10');}};

// ---------------------------------------------------------------- mecha (Mecha-Streisand): steel kaiju, her face behind the visor
const mecha={hit:[[0,-60,58],[0,30,96]],muz:{mouth:[0,-14],eye:[0,-66],center:[0,10],l:[-132,26],r:[132,26]},
 draw(g,A){const [m,d,a,l]=A.pal,t=A.t,up=A.open,sw=sway(A,4),mx=A.look.x*8,steel=lg(g,0,-60,0,130,['#d6dde4',m,'#4a525e']);
  g.lineCap='round';g.strokeStyle=INK;g.lineWidth=40;g.beginPath();g.moveTo(-60,80);g.quadraticCurveTo(-150,120+sw,-196,70+sw*2);g.stroke();g.strokeStyle=m;g.lineWidth=32;g.stroke();
  for(let i=0;i<4;i++)ell(g,-90-i*28,104-i*9+sw*(i/3),5,5,'#5a636e',2);
  for(const sx of [-1,1]){limb(g,sx*48,70,sx*58,124,40,'#7d8692');rrect(g,sx*58-30,116,60,22,8,'#5a636e',4);for(let k=-1;k<=1;k++)poly(g,[[sx*58+k*16-5,138],[sx*58+k*16,150],[sx*58+k*16+5,138]],'#eef3f8',2);}
  spikes(g,0,24,92,9,26,'#b9c2cc',-Math.PI*.95);
  ell(g,0,28,98,88,steel,5);
  g.strokeStyle='rgba(20,10,12,.35)';g.lineWidth=3;for(const y of [-10,40,84]){g.beginPath();g.moveTo(-86,y);g.quadraticCurveTo(0,y+14,86,y);g.stroke();}
  for(let i=0;i<10;i++)ell(g,-80+i*17.8,-10+Math.sin(i)*2,3,3,'#3a414c',0);
  // chest: the Triangle of Zinthar
  const gl=.55+A.glow*.45+Math.sin(t*4)*.12;g.save();g.translate(0,34);poly(g,[[0,-38],[36,26],[-36,26]],'#2a2f3a',5);g.globalAlpha=Math.min(1,gl);poly(g,[[0,-26],[25,18],[-25,18]],rg(g,0,2,2,36,['#fff4c8',a,'#6a0c26']),0);g.globalAlpha=1;g.restore();
  // arms with claws
  for(const sx of [-1,1]){const hx=sx*(130+Math.sin(t*2+sx)*5),hy=26-up*62;limb(g,sx*78,-6,hx,hy,30,'#8a939e');ell(g,hx,hy,20,18,'#5a636e',4);for(let k=-1;k<=1;k++)poly(g,[[hx+k*9-4,hy-12],[hx+k*11,hy-34],[hx+k*9+4,hy-12]],'#eef3f8',2);}
  // neck and head
  const hy=-66+A.look.y*3;limb(g,mx*.5,-40,mx,hy+30,44,'#7d8692');
  for(let i=0;i<5;i++)poly(g,[[mx-44+i*22,hy-40],[mx-33+i*22,hy-64-(i%2)*10],[mx-22+i*22,hy-40]],'#b9c2cc',3);
  ell(g,mx,hy,68,58,lg(g,mx,hy-58,mx,hy+58,['#e4e9ee',m,'#56606c']),5);
  // jaw drops open when she attacks
  const jaw=8+up*26;poly(g,[[mx-54,hy+30],[mx+54,hy+30],[mx+44,hy+40+jaw],[mx-44,hy+40+jaw]],'#3a0a14',4);teeth(g,mx,hy+31,96,7,10,'#eef3f8');
  rrect(g,mx-50,hy+36+jaw,100,14,6,'#7d8692',4);
  for(const sx of [-1,1]){ell(g,mx+sx*56,hy-6,9,9,'#2a2f3a',3);ell(g,mx+sx*56,hy-6,5,5,(Math.sin(t*6+sx)>-.3?a:'#5a1020'),0);}
  // visor with Barbra inside
  ell(g,mx,hy-6,44,40,'#1c2230',4);A.face(g,mx,hy-6,80,{clipR:38,emoji:true,tilt:A.look.x*.08});
  g.save();g.globalAlpha=.22;ell(g,mx-14,hy-24,16,9,'#fff',0,-.5);g.restore();
  if(A.dmg>.5){g.strokeStyle='#ffd23c';g.lineWidth=3;g.beginPath();g.moveTo(-30,10);g.lineTo(-10,24);g.lineTo(-24,40);g.moveTo(40,60);g.lineTo(54,74);g.stroke();}}};
const BODIES={mecha,lens,brainjar,saucer,bust,brute,ninja,stalker,liquid,pyramid,clown,vampire,reaper,flesh,elder,koopa,serpent,spinner};
for(const b of Object.values(BODIES)){b.muz=Object.assign({mouth:[0,40],eye:[0,0],center:[0,0],l:[-90,20],r:[90,20]},b.muz);}

// ---------------------------------------------------------------- minions (small drawings, centred)
function drawMinion(g,m,t){const r=m.r,k=m.kind;g.save();
 switch(k){
  case 'drone':ell(g,0,0,r,r*.8,'#9fb4d0',3);ell(g,0,-3,r*.55,r*.45,'#ff5a3c',2);for(const s of [-1,1])ell(g,s*(r+4),Math.sin(t*20)*3,8,3,'#ddd',2);break;
  case 'qmark':ell(g,0,0,r,r,'#2fd16d',3);g.fillStyle='#fff';g.font='bold 22px Arial Black,Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('?',0,2);break;
  case 'clone':rrect(g,-r*.7,-r*.2,r*1.4,r*1.2,4,'#10141a',3);ell(g,0,-r*.7,r*.55,r*.6,'#e8c19f',3);g.fillStyle='#050505';g.fillRect(-r*.5,-r*.85,r,5);break;
  case 'drip':ell(g,0,0,r,r*1.1,'#cfd8e3',3);poly(g,[[-6,-r],[0,-r*1.7],[6,-r]],'#cfd8e3',3);ell(g,-r*.3,-r*.3,r*.25,r*.15,'#fff',0);break;
  case 'clip':rrect(g,-r*.8,-r,r*1.6,r*2,3,'#c9a063',3);g.fillStyle='#fff';g.fillRect(-r*.6,-r*.7,r*1.2,r*1.5);g.fillStyle='#d6283c';g.fillRect(-r*.2,-r*.4,r*.4,r*.8);break;
  case 'nurse':ell(g,0,-r*.3,r*.7,r*.8,'#f1e4d6',3);poly(g,[[-r*.8,0],[0,-r*1.5],[r*.8,0]],'#9a9aa0',3);g.fillStyle='#8a1a1a';g.fillRect(-r*.5,-r*.2,r,4);g.fillRect(-r*.7,r*.2,r*1.4,r*.6);break;
  case 'bat':{const f=Math.sin(t*14)*.5;poly(g,[[0,0],[-r*2,-r*(.8+f)],[-r*1.2,r*.2],[-r*.7,-r*.1]],'#2a1a3a',2);poly(g,[[0,0],[r*2,-r*(.8+f)],[r*1.2,r*.2],[r*.7,-r*.1]],'#2a1a3a',2);ell(g,0,0,r*.6,r*.7,'#3a2a4a',2);ell(g,-3,-2,2,2,'#f44',0);ell(g,3,-2,2,2,'#f44',0);break;}
  case 'rinka':g.lineWidth=5;g.strokeStyle='#ff9ad0';g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();g.strokeStyle='#ffe6f4';g.lineWidth=2;g.beginPath();g.arc(0,0,r,t*4,t*4+3);g.stroke();ell(g,0,0,r*.4,r*.4,'#ff3b8a',2);break;
  case 'glove':ell(g,0,0,r,r*1.05,'#c8161d',5);rrect(g,-r*.6,r*.6,r*1.2,r*.7,6,'#fff',4);ell(g,-r*.3,-r*.4,r*.3,r*.2,'rgba(255,255,255,.5)',0);break;
  case 'hound':ell(g,0,0,r*.8,r,'#6a4a2a',3);ell(g,0,-r*.9,r*.55,r*.5,'#7a5a3a',3);poly(g,[[-r*.5,-r*1.2],[-r*.3,-r*1.6],[-r*.1,-r*1.2]],'#3a2a1a',2);ell(g,-4,-r,2.5,2.5,'#f44',0);ell(g,4,-r,2.5,2.5,'#f44',0);teeth(g,0,-r*.7,10,3,4);break;
  case 'rocket':poly(g,[[0,r*1.2],[-r*.6,-r*.6],[r*.6,-r*.6]],'#c8c8d0',3);poly(g,[[-r*.6,-r*.6],[-r*1.1,-r*1.1],[-r*.4,-r*.9]],'#c8161d',2);poly(g,[[r*.6,-r*.6],[r*1.1,-r*1.1],[r*.4,-r*.9]],'#c8161d',2);ell(g,0,-r*1.3,r*.4,r*(.6+Math.sin(t*30)*.2),'#ffb02e',0);break;
  case 'balloon':g.strokeStyle='#ddd';g.lineWidth=2;g.beginPath();g.moveTo(0,r);g.lineTo(0,r*2.2);g.stroke();ell(g,0,0,r*.9,r,'#d6283c',3);ell(g,-r*.3,-r*.35,r*.2,r*.3,'rgba(255,255,255,.6)',0);break;
  case 'head':ell(g,0,0,r,r*.9,'#e8907a',3);for(const s of [-1,1]){limb(g,s*r*.6,r*.5,s*r*1.3,r*1.1+Math.sin(t*10+s)*3,4,'#8a3a30');}for(const s of [-1,1])ell(g,s*r*.35,-r*.1,r*.25,r*.25,'#ffe9a0',2);mouth(g,0,r*.3,r*.9,.5,{},'#2a0508');break;
  case 'sickle':{g.rotate(t*12);g.beginPath();g.arc(0,0,r,0,PI2*.62);g.arc(r*.3,-r*.25,r*.72,PI2*.62,0,true);g.closePath();g.fillStyle='#d8dce4';g.fill();g.lineWidth=2.5;g.strokeStyle=INK;g.stroke();limb(g,-r*.2,r*.2,-r*.9,r*.9,4,'#6a4a2a');break;}
   default:ell(g,0,0,r,r,'#ff6aa0',3);ell(g,-r*.3,-r*.3,r*.3,r*.3,'rgba(255,255,255,.6)',0);}
 g.restore();}
Object.assign(exports,{BODIES,drawMinion,ell,poly,limb,lg,rg,INK,TAU});
