// Black Sabbath art, in table millimetres: black, purple and blood red. A full moon over bare trees and an old water
// mill with a cloaked witch before it (the 1970 debut's sleeve, in spirit), tombstones flanking the Graveyard,
// war-pig pop caps, bats and fog, Tony Iommi's devil-horned guitar between the slingshots, an iron Iron Man toy and
// the Into the Void disc. Every function takes the owner's drop-in pictures (imgs, see ../dropins.js) first.
const {seededRandom}=require("src/utils.js");
const {drawCover}=require("src/engines/pinball/dropins.js");
const TAU=Math.PI*2;
function playfieldPath(x){x.beginPath();x.moveTo(12,1067);x.lineTo(12,256);x.arc(256,256,244,Math.PI,TAU);x.lineTo(500,1067);x.closePath();}
function tree(x,bx,by,h,flip=1){x.save();x.strokeStyle='#07040b';x.lineCap='round';const br=(px,py,a,l,w)=>{if(l<6)return;const ex=px+Math.cos(a)*l,ey=py+Math.sin(a)*l;x.lineWidth=w;x.beginPath();x.moveTo(px,py);x.lineTo(ex,ey);x.stroke();br(ex,ey,a-.45*flip,l*.7,w*.65);br(ex,ey,a+.35*flip,l*.62,w*.6);};br(bx,by,-Math.PI/2,h*.4,h*.05);x.restore();}
function bat(x,cx,cy,s){x.save();x.translate(cx,cy);x.scale(s,s);x.fillStyle='#050308';x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(-6,-6,-14,-2);x.quadraticCurveTo(-10,0,-11,4);x.quadraticCurveTo(-6,1,-3,4);x.lineTo(0,2);x.lineTo(3,4);x.quadraticCurveTo(6,1,11,4);x.quadraticCurveTo(10,0,14,-2);x.quadraticCurveTo(6,-6,0,0);x.fill();x.restore();}
function mill(x,mx,my){x.save();x.fillStyle='#0b0710';x.beginPath();x.moveTo(mx,my);x.lineTo(mx,my-60);x.lineTo(mx+30,my-90);x.lineTo(mx+60,my-60);x.lineTo(mx+60,my);x.closePath();x.fill();
 x.fillStyle='rgba(255,170,60,.55)';x.fillRect(mx+12,my-46,8,10);x.fillRect(mx+38,my-30,8,10);
 x.strokeStyle='#120b18';x.lineWidth=3;x.beginPath();x.arc(mx-6,my-18,22,0,TAU);x.stroke();for(let i=0;i<8;i++){const a=i/8*TAU;x.beginPath();x.moveTo(mx-6,my-18);x.lineTo(mx-6+Math.cos(a)*22,my-18+Math.sin(a)*22);x.stroke();}x.restore();}
// The cloaked figure (s = height in mm, feet at cx,cy).
function witch(x,cx,cy,s){x.save();x.translate(cx,cy);x.scale(s/100,s/100);x.fillStyle='#050308';x.beginPath();x.moveTo(-26,0);x.quadraticCurveTo(-18,-60,-10,-80);x.quadraticCurveTo(0,-100,10,-80);x.quadraticCurveTo(18,-60,26,0);x.closePath();x.fill();
 const g=x.createRadialGradient(0,-74,1,0,-74,9);g.addColorStop(0,'#d8d2c4');g.addColorStop(1,'#6e665c');x.fillStyle=g;x.beginPath();x.ellipse(0,-74,6,8,0,0,TAU);x.fill();x.restore();}
// Iommi's twin-horned guitar (body centre 0,0, neck up -y), black with a white guard.
function sg(x){x.fillStyle='#120612';x.beginPath();x.moveTo(-22,30);x.quadraticCurveTo(-30,0,-24,-18);x.lineTo(-30,-34);x.quadraticCurveTo(-14,-30,-8,-20);x.lineTo(8,-20);x.quadraticCurveTo(14,-30,30,-34);x.lineTo(24,-18);x.quadraticCurveTo(30,0,22,30);x.quadraticCurveTo(0,40,-22,30);x.fill();
 x.strokeStyle='#8f2bd8';x.lineWidth=1.4;x.stroke();x.fillStyle='#e9e4da';x.beginPath();x.moveTo(-14,-16);x.lineTo(14,-16);x.lineTo(16,6);x.lineTo(-6,18);x.lineTo(-16,4);x.closePath();x.fill();
 x.fillStyle='#c9ccd6';x.fillRect(-7,-12,14,4);x.fillRect(-7,2,14,4);x.fillStyle='#2a1a10';x.fillRect(-4,-96,8,78);x.fillStyle='#120612';x.fillRect(-7,-112,14,16);
 x.fillStyle='#e9e4da';for(let i=0;i<6;i++){x.beginPath();x.arc(0,-88+i*12,1.2,0,TAU);x.fill();}}
function logo(x,cx,cy,size,imgs){if(imgs?.logo){const w=size*12,h=w*imgs.logo.height/imgs.logo.width;x.drawImage(imgs.logo,cx-w/2,cy-h/2,w,h);return;}
 x.save();x.textAlign='center';x.textBaseline='middle';x.font=`bold ${size}px "Times New Roman",Georgia,serif`;
 x.shadowColor='#8f2bd8';x.shadowBlur=size*.6;x.lineWidth=size*.18;x.strokeStyle='#000';x.strokeText('BLACK SABBATH',cx,cy);x.fillStyle='#e9e4da';x.fillText('BLACK SABBATH',cx,cy);x.shadowBlur=0;
 // blood drips off the letters
 const r=seededRandom(31);x.fillStyle='#8a0d1a';for(let i=0;i<10;i++){const dx=cx-size*5+r()*size*10,l=4+r()*size*.8;x.fillRect(dx,cy+size*.32,1.6,l);x.beginPath();x.arc(dx+.8,cy+size*.32+l,1.6,0,TAU);x.fill();}x.restore();}

const art={
 plastic:'#6b2fb3',sling:'#2a0b3d',drop:'#9aa0a8',flipper:'#2a2a33',flipperRubber:'#8f2bd8',flipperText:'SABBATH',postGlow:'#ff2d2d',
 base(x,def,imgs={}){
  x.fillStyle='#0d0a0e';x.fillRect(0,0,def.W,def.H);
  x.save();playfieldPath(x);x.clip();
  if(imgs.playfield){drawCover(x,imgs.playfield,0,0,def.W,def.H,'stretch');x.restore();return;}
  const g=x.createLinearGradient(0,0,0,def.H);g.addColorStop(0,'#06040c');g.addColorStop(.4,'#170a26');g.addColorStop(.75,'#2a0814');g.addColorStop(1,'#120307');x.fillStyle=g;x.fillRect(0,0,def.W,def.H);
  const r=seededRandom(13);for(let i=0;i<120;i++){x.fillStyle=`rgba(220,210,255,${.1+r()*.4})`;x.fillRect(r()*def.W,r()*460,1.1,1.1);}
  // the full moon, haloed, upper left
  const mh=x.createRadialGradient(150,150,40,150,150,150);mh.addColorStop(0,'rgba(230,220,255,.25)');mh.addColorStop(1,'rgba(230,220,255,0)');x.fillStyle=mh;x.fillRect(0,0,320,320);
  x.fillStyle='rgba(235,228,245,.32)';x.beginPath();x.arc(150,150,58,0,TAU);x.fill();x.fillStyle='rgba(120,100,140,.18)';for(const [cx,cy,cr] of [[132,140,10],[168,164,7],[150,176,5],[164,128,6]]){x.beginPath();x.arc(cx,cy,cr,0,TAU);x.fill();}
  for(const [bx,by,s] of [[260,160,.8],[300,120,.6],[420,110,.7],[90,300,.6],[200,90,.5],[460,240,.55]])bat(x,bx,by,s);
  tree(x,40,560,260,1);tree(x,470,520,220,-1);
  mill(x,380,470);witch(x,425,690,80);
  // tombstones flanking the Graveyard
  for(const [tx,ty,h] of [[166,470,30],[176,500,22],[300,470,28],[312,500,20]]){x.fillStyle='#2a2830';x.fillRect(tx-7,ty-h,14,h);x.beginPath();x.arc(tx,ty-h,7,Math.PI,TAU);x.fill();x.strokeStyle='#5d5a66';x.lineWidth=1;x.beginPath();x.moveTo(tx,ty-h+2);x.lineTo(tx,ty-h+12);x.moveTo(tx-4,ty-h+6);x.lineTo(tx+4,ty-h+6);x.stroke();}
  // ground fog bands
  for(let i=0;i<5;i++){const fy=520+i*70,fg=x.createLinearGradient(0,fy-20,0,fy+20);fg.addColorStop(0,'rgba(180,160,220,0)');fg.addColorStop(.5,'rgba(180,160,220,.07)');fg.addColorStop(1,'rgba(180,160,220,0)');x.fillStyle=fg;x.fillRect(0,fy-20,def.W,40);}
  // war-pig mud emblem behind the pops
  const pg=x.createRadialGradient(357,240,10,357,240,110);pg.addColorStop(0,'rgba(200,40,80,.35)');pg.addColorStop(1,'rgba(200,40,80,0)');x.fillStyle=pg;x.beginPath();x.arc(357,240,110,0,TAU);x.fill();
  x.fillStyle='rgba(255,200,220,.7)';x.font='bold 9px "Times New Roman",serif';x.textAlign='center';x.fillText('WAR PIGS',357,174);
  logo(x,236,692,24,imgs);
  for(const [ax,ay,c] of [[72,700,'#ff7a1a'],[400,700,'#ff7a1a'],[31,760,'#ff3b30'],[441,760,'#ff3b30']]){x.fillStyle=c;x.globalAlpha=.25;x.beginPath();x.moveTo(ax,ay+30);x.lineTo(ax-9,ay);x.lineTo(ax+9,ay);x.fill();x.globalAlpha=1;}
  if(imgs.character){const w=110,h=w*imgs.character.height/imgs.character.width;x.drawImage(imgs.character,236-w/2,830-h*.45,w,h);}
  else{x.save();x.translate(236,840);x.rotate(-.5);x.scale(.75,.75);sg(x);x.restore();}
  x.fillStyle='rgba(233,228,218,.55)';x.font='italic bold 7px "Times New Roman",serif';x.textAlign='center';x.fillText('BIRMINGHAM · 1970',236,880);
  x.restore();x.save();x.strokeStyle='rgba(143,43,216,.6)';x.lineWidth=1.2;x.beginPath();x.moveTo(20,872);x.lineTo(20,256);x.arc(256,256,236,Math.PI,TAU);x.lineTo(492,300);x.stroke();x.restore();
 },
 over(x,def,imgs={}){
  x.save();x.beginPath();x.moveTo(12,880);x.lineTo(110,976);x.lineTo(168,1004);x.lineTo(304,1004);x.lineTo(362,976);x.lineTo(460,880);x.lineTo(460,1067);x.lineTo(12,1067);x.closePath();
  if(imgs.apron){x.save();x.clip();drawCover(x,imgs.apron,12,880,448,187);x.restore();x.strokeStyle='#5d5a66';x.lineWidth=2;x.stroke();x.restore();}
  else{const g=x.createLinearGradient(0,970,0,1067);g.addColorStop(0,'#1f1a26');g.addColorStop(1,'#08060a');x.fillStyle=g;x.fill();x.strokeStyle='#6b2fb3';x.lineWidth=2;x.stroke();
   for(const [cx,title,l1,l2] of [[96,'BLACK SABBATH','3 BALLS PER GAME','BURY 3 FOR WAR PIGS'],[376,'SPELL M-A-S-T-E-R','RAISES THE HAND OF DOOM','EVERY 2ND: EXTRA BALL']]){
    x.fillStyle='rgba(0,0,0,.5)';x.fillRect(cx-54,1014,112,40);x.fillStyle='#e9e4da';x.fillRect(cx-56,1012,112,40);x.fillStyle='#3a0d52';x.fillRect(cx-56,1012,112,9);
    x.fillStyle='#fff';x.font='bold 6px Arial';x.textAlign='center';x.fillText(title,cx,1019);x.fillStyle='#1a1a1a';x.font='6px Arial';x.fillText(l1,cx,1032);x.fillText(l2,cx,1042);}
   x.fillStyle='#0b080e';x.fillRect(190,1016,92,24);x.strokeStyle='#8f2bd8';x.lineWidth=1;x.strokeRect(190,1016,92,24);x.fillStyle='#e9e4da';x.font='bold 9px "Times New Roman",serif';x.textAlign='center';x.fillText('HAND OF DOOM',236,1031);x.restore();}
  x.fillStyle='#18161c';x.fillRect(460,1050,40,17);
 },
 // War-pig caps: a pink pig face under a steel helmet.
 bumperCap(x,p,r,lit,t,imgs={}){
  x.save();x.translate(p.x,p.y);
  if(imgs.bumper){x.beginPath();x.arc(0,0,r*.86,0,TAU);x.clip();x.drawImage(imgs.bumper,-r*.86,-r*.86,r*1.72,r*1.72);if(lit){x.fillStyle='rgba(255,220,230,.35)';x.fill();}x.restore();return;}
  const f=x.createRadialGradient(-r*.3,-r*.3,2,0,0,r*.86);f.addColorStop(0,lit?'#ffd6e4':'#f3a3bf');f.addColorStop(1,lit?'#ff6a9a':'#b8506f');x.fillStyle=f;x.beginPath();x.arc(0,0,r*.86,0,TAU);x.fill();
  x.fillStyle='#4a5160';x.beginPath();x.arc(0,-r*.1,r*.86,Math.PI*1.08,Math.PI*1.92);x.closePath();x.fill();x.fillStyle='#6c7686';x.fillRect(-r*.86,-r*.28,r*1.72,r*.12);
  x.fillStyle=lit?'#ffb3cb':'#e07a9c';x.beginPath();x.ellipse(0,r*.32,r*.32,r*.22,0,0,TAU);x.fill();x.fillStyle='#5a1a2c';x.beginPath();x.arc(-r*.12,r*.32,r*.07,0,TAU);x.arc(r*.12,r*.32,r*.07,0,TAU);x.fill();
  x.fillStyle='#111';x.beginPath();x.arc(-r*.3,r*.02,r*.07,0,TAU);x.arc(r*.3,r*.02,r*.07,0,TAU);x.fill();x.restore();
 },
 // IRON MAN: riveted iron hulk, red eye slit (blazing while his mode runs); moves with p.ox/oy.
 toy(x,p,t,imgs={}){
  const cx=p.x+(p.ox||0),cy=p.y+(p.oy||0),hit=p.flash>0,step=Math.sin(t*4)*(p.armed?2:0);
  if(imgs.toy){x.save();x.fillStyle='rgba(0,0,0,.5)';x.fillRect(cx-p.w/2+5,cy-p.h/2+6,p.w,p.h);drawCover(x,imgs.toy,cx-p.w/2,cy-p.h/2,p.w,p.h,'stretch');if(hit){x.globalCompositeOperation='lighter';x.fillStyle='rgba(255,255,255,.35)';x.fillRect(cx-p.w/2,cy-p.h/2,p.w,p.h);}x.restore();return;}
  x.save();x.translate(cx,cy);
  x.fillStyle='rgba(0,0,0,.5)';x.fillRect(-38,-50,86,112);
  const iron=(a,b)=>{const g=x.createLinearGradient(a,0,b,0);g.addColorStop(0,'#3a3d44');g.addColorStop(.45,hit?'#e8e8ee':'#8a8f99');g.addColorStop(1,'#2a2c31');return g;};
  x.fillStyle=iron(-30,30);x.fillRect(-26,30+step,18,24);x.fillRect(8,30-step,18,24);       // legs
  x.fillStyle=iron(-44,44);x.fillRect(-46,-30,14,48);x.fillRect(32,-30,14,48);              // arms
  x.fillStyle='#2a2c31';x.beginPath();x.arc(-39,22,9,0,TAU);x.arc(39,22,9,0,TAU);x.fill();   // fists
  x.fillStyle=iron(-34,34);x.beginPath();x.moveTo(-34,-34);x.lineTo(34,-34);x.lineTo(28,34);x.lineTo(-28,34);x.closePath();x.fill();x.strokeStyle='#15161a';x.lineWidth=2;x.stroke();
  x.strokeStyle='#4a4d55';x.lineWidth=1.5;x.beginPath();x.moveTo(0,-30);x.lineTo(0,30);x.moveTo(-28,0);x.lineTo(28,0);x.stroke();
  x.fillStyle='#b8bcc6';for(const [rx,ry] of [[-28,-28],[28,-28],[-24,28],[24,28],[-12,-28],[12,-28]]){x.beginPath();x.arc(rx,ry,1.6,0,TAU);x.fill();}
  x.fillStyle=iron(-18,18);x.beginPath();x.moveTo(-18,-36);x.lineTo(-18,-58);x.lineTo(0,-66);x.lineTo(18,-58);x.lineTo(18,-36);x.closePath();x.fill();x.stroke();   // helmet head
  const eye=p.armed||hit?'#ff2020':'#a0140f';x.fillStyle=eye;x.fillRect(-12,-52,24,4);
  if(p.armed||hit){x.globalCompositeOperation='lighter';x.fillStyle='rgba(255,30,30,.45)';x.fillRect(-16,-55,32,10);}
  x.restore();
 },
 // INTO THE VOID: a black disc with turning purple spiral arms.
 disc(x,p,a,t){x.save();x.translate(p.x,p.y);const g=x.createRadialGradient(0,0,2,0,0,p.r);g.addColorStop(0,'#000');g.addColorStop(.7,'#14061f');g.addColorStop(1,'#3a1060');x.fillStyle=g;x.beginPath();x.arc(0,0,p.r,0,TAU);x.fill();
  x.rotate(a);for(let k=0;k<3;k++){x.rotate(TAU/3);x.strokeStyle=k%2?'#bf5af2':'#7a3cff';x.lineWidth=2.2;x.beginPath();for(let i=0;i<=24;i++){const s=i/24,ang=s*3.2,rr=s*p.r*.95;i?x.lineTo(Math.cos(ang)*rr,Math.sin(ang)*rr):x.moveTo(0,0);}x.stroke();}
  x.rotate(-a);x.strokeStyle='#c9ccd6';x.lineWidth=2;x.beginPath();x.arc(0,0,p.r,0,TAU);x.stroke();x.fillStyle='rgba(255,255,255,.7)';x.font='bold 5px Arial';x.textAlign='center';x.fillText('INTO THE VOID',0,p.r+7);x.restore();},
 slingArt(x,p){const [ax,ay]=p.a,[bx,by]=p.b,[cx,cy]=p.c;bat(x,(ax+bx+cx)/3,(ay+by+cy)/3,.7);},
 backbox(x,W,H,dx,dw,t,imgs={}){
  const side=dx-8;const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0b0612');g.addColorStop(1,'#2a0814');x.fillStyle=g;x.fillRect(0,0,W,H);
  if(side<70){for(let i=0;i<8;i++){const on=(Math.floor(t*4)+i)%4===0;x.fillStyle=on?'#bf5af2':'#2a1240';x.beginPath();x.arc(dx+dw+16+i*((W-dx-dw-30)/7),H-6,2,0,TAU);x.fill();}return;}
  if(imgs.logo){const w=Math.min(side-10,(H-14)*imgs.logo.width/imgs.logo.height),h=w*imgs.logo.height/imgs.logo.width;x.drawImage(imgs.logo,(dx-6-w)/2,(H-h)/2,w,h);}
  else logo(x,(dx-6)/2,H/2,Math.min(26,H*.32,side/7.5),null);
  const rx=dx+dw+6,rw=W-rx;if(imgs.backglass){x.save();x.beginPath();x.rect(rx,0,rw,H);x.clip();drawCover(x,imgs.backglass,rx,0,rw,H);x.restore();}
  else{x.fillStyle='rgba(235,228,245,.6)';x.beginPath();x.arc(rx+rw*.65,H*.35,H*.22,0,TAU);x.fill();witch(x,rx+rw*.4,H*.95,H*.8);}
 },
 // The painted backglass: moon, mill, the witch, Iron Man looming, war pigs marching, bats, lightning.
 backglass(x,bx,by,bw,bh,t){
  x.save();x.translate(bx,by);
  const g=x.createLinearGradient(0,0,0,bh);g.addColorStop(0,'#05030a');g.addColorStop(.6,'#1d0a2e');g.addColorStop(1,'#3a0814');x.fillStyle=g;x.fillRect(0,0,bw,bh);
  const u=Math.min(bw,bh*.75)/100;
  if(Math.floor(t*1.7)%5===0){x.strokeStyle='rgba(230,220,255,.8)';x.lineWidth=u*.6;x.beginPath();let px=bw*.8,py=0;x.moveTo(px,py);for(let i=0;i<7;i++){px+=(i%2?-1:1)*u*4;py+=bh*.07;x.lineTo(px,py);}x.stroke();x.fillStyle='rgba(200,180,255,.08)';x.fillRect(0,0,bw,bh);}
  x.fillStyle='rgba(235,228,245,.85)';x.beginPath();x.arc(bw*.7,bh*.3,u*16,0,TAU);x.fill();
  for(let i=0;i<7;i++)bat(x,(i*bw*.17+t*30*u)%(bw+40)-20,bh*.18+Math.sin(t*2+i)*u*3+i%3*u*6,u*.18*(1+i%2));
  tree(x,bw*.08,bh,bh*.9,1);mill(x,bw*.62,bh*.82);
  x.save();x.translate(bw*.22,bh*.56);x.scale(u*.5,u*.5);art.toy(x,{x:0,y:0,flash:0,armed:Math.floor(t*2)%2,w:84,h:116},t);x.restore();
  witch(x,bw*.52,bh*.92,u*34);
  for(let i=0;i<5;i++){const px=((t*14*u+i*bw*.22)%(bw+60))-30;x.save();x.translate(px,bh*.96);x.scale(u*.25,u*.25);art.bumperCap(x,{x:0,y:-30},30,false,t);x.restore();}
  const ly=bh*.12;x.fillStyle='rgba(0,0,0,.5)';x.fillRect(bw*.04,ly-u*9,bw*.92,u*18);logo(x,bw/2,ly,Math.min(u*8.5,bw/8.8),null);
  x.font=`bold ${Math.min(u*3.4,bw/26)}px Arial`;x.fillStyle='#d9b3ff';x.textAlign='center';x.fillText('A SHAMBCONKINS PINBALL TABLE',bw/2,ly+u*13);
  x.restore();
 },
};
Object.assign(exports,{art});
