// Bucketheadland art, drawn in table millimetres: a night-time theme park (lit Ferris wheel, coaster lattice, big-top
// tent, park skyline) with Buckethead himself (white mask, striped bucket, white guitar) between the slingshots, plus
// the backglass card shown at the start. Every function takes the drop-in pictures (imgs: playfield, backglass, apron,
// logo, character, bumper, toy; see ../dropins.js) and uses them instead of the painted version when present.
const {seededRandom}=require("src/utils.js");
const {drawCover}=require("src/engines/pinball/dropins.js");
const TAU=Math.PI*2;
function playfieldPath(x){x.beginPath();x.moveTo(12,1067);x.lineTo(12,256);x.arc(256,256,244,Math.PI,TAU);x.lineTo(500,1067);x.closePath();}
// A white single-cut guitar (Buckethead's white Les Paul), body centre (0,0), neck up the -y axis, size ~100 units.
function guitar(x){
 x.fillStyle='#f4f1ea';x.beginPath();x.ellipse(0,18,30,26,0,0,TAU);x.fill();x.beginPath();x.ellipse(-2,-10,24,22,0,0,TAU);x.fill();
 x.strokeStyle='#bdb6a6';x.lineWidth=1.5;x.beginPath();x.ellipse(0,18,30,26,0,0,TAU);x.stroke();
 x.fillStyle='#111';x.beginPath();x.ellipse(-8,4,9,14,.3,0,TAU);x.fill();
 x.fillStyle='#c9ccd6';x.fillRect(-6,8,14,5);x.fillRect(-6,22,14,5);x.fillStyle='#2b2f38';x.fillRect(-8,32,18,3);
 x.fillStyle='#d9cbb0';x.fillRect(-4,-92,9,86);x.fillStyle='#f4f1ea';x.beginPath();x.moveTo(-8,-92);x.lineTo(10,-92);x.lineTo(8,-112);x.lineTo(-6,-112);x.closePath();x.fill();
 x.strokeStyle='rgba(60,50,40,.6)';x.lineWidth=.5;for(let i=0;i<6;i++){x.beginPath();x.moveTo(-3+i*1.4,-90);x.lineTo(-3+i*1.4,32);x.stroke();}
 for(let i=1;i<12;i++){x.strokeStyle='#8a8170';x.beginPath();x.moveTo(-4,-92+i*7);x.lineTo(5,-92+i*7);x.stroke();}
}
// Buckethead: striped bucket over a blank white mask (s = size in mm, centred on cx,cy = top of the mask).
function buckethead(x,cx,cy,s,o={}){
 x.save();x.translate(cx,cy);x.scale(s/100,s/100);
 if(o.guitar){x.save();x.translate(46,70);x.rotate(.55);guitar(x);x.restore();}
 x.fillStyle='#120a10';x.beginPath();x.ellipse(0,40,44,52,0,0,TAU);x.fill();
 const g=x.createLinearGradient(-30,0,30,90);g.addColorStop(0,'#fbfaf5');g.addColorStop(1,'#bdb8ad');x.fillStyle=g;x.beginPath();x.moveTo(-30,4);x.quadraticCurveTo(-34,62,0,92);x.quadraticCurveTo(34,62,30,4);x.closePath();x.fill();
 x.fillStyle='#1b1418';x.beginPath();x.ellipse(-12,34,7,4.5,.1,0,TAU);x.fill();x.beginPath();x.ellipse(12,34,7,4.5,-.1,0,TAU);x.fill();
 x.strokeStyle='rgba(60,50,50,.5)';x.lineWidth=1.5;x.beginPath();x.moveTo(-6,66);x.lineTo(6,66);x.stroke();
 x.save();x.beginPath();x.moveTo(-40,8);x.lineTo(-32,-58);x.lineTo(32,-58);x.lineTo(40,8);x.closePath();x.clip();
 for(let i=-6;i<6;i++){x.fillStyle=i%2?'#f5f2ea':'#c8102e';x.beginPath();x.moveTo(i*8,8);x.lineTo(i*6.4,-58);x.lineTo((i+1)*6.4,-58);x.lineTo((i+1)*8,8);x.fill();}
 const sh=x.createLinearGradient(-40,0,40,0);sh.addColorStop(0,'rgba(0,0,0,.25)');sh.addColorStop(.4,'rgba(255,255,255,.15)');sh.addColorStop(1,'rgba(0,0,0,.3)');x.fillStyle=sh;x.fillRect(-40,-60,80,70);
 x.restore();
 x.fillStyle='#f5f2ea';x.fillRect(-36,-64,72,8);x.fillStyle='#e8e2d4';x.fillRect(-42,2,84,8);
 x.fillStyle='#fff';x.fillRect(-20,-34,40,13);x.strokeStyle='#111';x.lineWidth=1;x.strokeRect(-20,-34,40,13);x.fillStyle='#111';x.font='bold 9px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('FUNERAL',0,-27);
 x.restore();
}
function ferris(x,cx,cy,r,a,bulbs=true){x.save();x.globalAlpha=a;x.strokeStyle='#ff9ecf';x.lineWidth=2;x.beginPath();x.arc(cx,cy,r,0,TAU);x.stroke();x.beginPath();x.arc(cx,cy,r*.7,0,TAU);x.stroke();
 for(let i=0;i<16;i++){const t=i/16*TAU;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(t)*r,cy+Math.sin(t)*r);x.stroke();x.fillStyle=i%2?'#ffd23f':'#64d2ff';x.fillRect(cx+Math.cos(t)*r-4,cy+Math.sin(t)*r-3,8,7);}
 if(bulbs)for(let i=0;i<48;i++){const t=i/48*TAU;x.fillStyle=i%3?'#fff6c8':'#ff6b9a';x.beginPath();x.arc(cx+Math.cos(t)*r*.85,cy+Math.sin(t)*r*.85,1.3,0,TAU);x.fill();}
 x.beginPath();x.moveTo(cx,cy);x.lineTo(cx-r*.6,cy+r*1.25);x.moveTo(cx,cy);x.lineTo(cx+r*.6,cy+r*1.25);x.stroke();x.restore();}
function coaster(x,a){x.save();x.globalAlpha=a;x.strokeStyle='#7cd7ff';x.lineWidth=2.5;x.beginPath();x.moveTo(14,760);x.bezierCurveTo(60,520,120,640,170,420);x.bezierCurveTo(190,330,220,360,230,300);x.stroke();
 x.lineWidth=1;for(let i=0;i<=24;i++){const t=i/24,px=(1-t)**3*14+3*(1-t)**2*t*60+3*(1-t)*t*t*120+t**3*170,py=(1-t)**3*760+3*(1-t)**2*t*520+3*(1-t)*t*t*640+t**3*420;x.beginPath();x.moveTo(px,py);x.lineTo(px,800);x.stroke();if(i%2){x.beginPath();x.moveTo(px,py+20);x.lineTo(px+18,800);x.stroke();}}x.restore();}
// Park skyline silhouette (castle, tents, a drop tower) along a baseline.
function skyline(x,y0,a){x.save();x.globalAlpha=a;x.fillStyle='#12051c';x.beginPath();x.moveTo(12,y0);
 const pts=[[40,y0-20],[60,y0-20],[60,y0-48],[66,y0-60],[72,y0-48],[72,y0-24],[100,y0-24],[118,y0-42],[136,y0-24],[180,y0-24],[180,y0-70],[186,y0-70],[186,y0-24],[300,y0-30],[312,y0-56],[324,y0-30],[350,y0-18],[400,y0-38],[420,y0-18],[460,y0-26],[460,y0]];
 for(const [px,py] of pts)x.lineTo(px,py);x.closePath();x.fill();
 for(let i=0;i<20;i++){x.fillStyle=i%2?'#ffd23f':'#ff6b35';x.fillRect(20+i*22,y0-6-(i%3)*4,2,2);}x.restore();}
// Painted sign (a decal on the playfield).
function sign(x,text,cx,cy,{size=8,color='#fff3c4',bg='rgba(20,6,30,.75)',edge='#ffd23f',w=null}={}){x.save();x.font=`bold ${size}px Georgia`;const tw=w||x.measureText(text).width+10;
 x.fillStyle=bg;x.beginPath();x.roundRect?x.roundRect(cx-tw/2,cy-size*.85,tw,size*1.7,3):x.rect(cx-tw/2,cy-size*.85,tw,size*1.7);x.fill();x.strokeStyle=edge;x.lineWidth=.8;x.stroke();
 x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.fillText(text,cx,cy+.5);x.restore();}
function logo(x,cx,cy,size,imgs){if(imgs?.logo){const w=size*13,h=w*imgs.logo.height/imgs.logo.width;x.drawImage(imgs.logo,cx-w/2,cy-h/2,w,h);return;}
 x.save();x.translate(cx,cy+size*15.7);const word='BUCKETHEADLAND';x.font=`bold ${size}px Georgia`;x.textBaseline='middle';x.textAlign='center';
 for(let i=0;i<word.length;i++){const a=(i-(word.length-1)/2)*.05;x.save();x.rotate(a);x.lineWidth=size*.2;x.strokeStyle='#1a0610';x.strokeText(word[i],0,-size*15.7);x.fillStyle=i%2?'#ffd23f':'#ff6b35';x.fillText(word[i],0,-size*15.7);x.restore();}
 x.restore();}

const art={
 plastic:'#ffbf3f',sling:'#c8102e',drop:'#ffb703',flipper:'#f7f4ec',flipperRubber:'#c8102e',flipperText:'BUCKETHEAD',
 base(x,def,imgs={}){
  x.fillStyle='#1d120c';x.fillRect(0,0,def.W,def.H);
  x.save();playfieldPath(x);x.clip();
  if(imgs.playfield){drawCover(x,imgs.playfield,0,0,def.W,def.H,'stretch');x.restore();return;}
  const g=x.createLinearGradient(0,0,0,def.H);g.addColorStop(0,'#0e0420');g.addColorStop(.45,'#2a0b3d');g.addColorStop(.8,'#4a0c27');g.addColorStop(1,'#260611');x.fillStyle=g;x.fillRect(0,0,def.W,def.H);
  const r=seededRandom(77);for(let i=0;i<160;i++){x.fillStyle=`rgba(255,255,255,${.15+r()*.5})`;x.fillRect(r()*def.W,r()*520,1.2,1.2);}
  // moon with a halo and craters
  const mh=x.createRadialGradient(120,150,30,120,150,90);mh.addColorStop(0,'rgba(255,240,200,.18)');mh.addColorStop(1,'rgba(255,240,200,0)');x.fillStyle=mh;x.fillRect(30,60,180,180);
  x.fillStyle='rgba(255,244,214,.22)';x.beginPath();x.arc(120,150,42,0,TAU);x.fill();x.fillStyle='rgba(120,100,80,.12)';for(const [cx,cy,cr] of [[108,140,8],[132,160,6],[118,170,4]]){x.beginPath();x.arc(cx,cy,cr,0,TAU);x.fill();}
  ferris(x,330,400,118,.24);coaster(x,.25);skyline(x,560,.55);
  // big-top tent behind the bonus ladder
  x.save();x.globalAlpha=.18;for(let i=0;i<14;i++){x.fillStyle=i%2?'#ffffff':'#ff2d55';x.beginPath();x.moveTo(236,560);x.lineTo(40+i*30,800);x.lineTo(70+i*30,800);x.closePath();x.fill();}
  x.globalAlpha=.35;x.fillStyle='#ffd23f';x.beginPath();x.moveTo(236,545);x.lineTo(236,560);x.lineTo(252,552);x.closePath();x.fill();x.restore();
  // warm light pool + straw under the coop bumpers
  const sg=x.createRadialGradient(241,240,10,241,240,120);sg.addColorStop(0,'rgba(255,214,102,.38)');sg.addColorStop(1,'rgba(255,214,102,0)');x.fillStyle=sg;x.beginPath();x.arc(241,240,120,0,TAU);x.fill();
  const rs=seededRandom(9);x.strokeStyle='rgba(255,220,130,.35)';x.lineWidth=.8;for(let i=0;i<70;i++){const a=rs()*TAU,d=rs()*95,px=241+Math.cos(a)*d,py=245+Math.sin(a)*d*.8;x.beginPath();x.moveTo(px,py);x.lineTo(px+(rs()-.5)*10,py+(rs()-.5)*4);x.stroke();}
  // painted signs
  sign(x,'CHICKEN COOP',241,168,{size:8});
  sign(x,'HAUNTED RIDE',418,690,{size:7,color:'#e9d5ff',edge:'#bf5af2'});sign(x,'GIANT ROBOT',404,326,{size:7,color:'#c7ffd2',edge:'#32d74b'});
  sign(x,'NUNCHUCK',35,440,{size:5,edge:'#64d2ff',w:40});sign(x,'GOLDEN EGG',330,338,{size:5,edge:'#ffd23f'});
  logo(x,236,700,21,imgs);
  // inlane / outlane arrows
  for(const [ax,ay,c] of [[72,700,'#ffd23f'],[400,700,'#ffd23f'],[31,760,'#ff3b30'],[441,760,'#ff3b30']]){x.fillStyle=c;x.globalAlpha=.25;x.beginPath();x.moveTo(ax,ay+30);x.lineTo(ax-9,ay);x.lineTo(ax+9,ay);x.fill();x.globalAlpha=1;}
  if(imgs.character){const w=110,h=w*imgs.character.height/imgs.character.width;x.drawImage(imgs.character,236-w/2,820-h*.4,w,h);}
  else buckethead(x,236,812,70,{guitar:true});
  x.fillStyle='rgba(255,255,255,.6)';x.font='bold 7px Arial';x.textAlign='center';x.fillText('WELCOME TO THE PARK',236,872);
  // gold pinstripe just inside the cabinet
  x.restore();x.save();x.strokeStyle='rgba(255,210,63,.55)';x.lineWidth=1.2;x.beginPath();x.moveTo(20,872);x.lineTo(20,256);x.arc(256,256,236,Math.PI,TAU);x.lineTo(492,300);x.stroke();x.restore();
 },
 over(x,def,imgs={}){
  // Apron: drained balls disappear under it.
  x.save();x.beginPath();x.moveTo(12,880);x.lineTo(110,976);x.lineTo(168,1004);x.lineTo(304,1004);x.lineTo(362,976);x.lineTo(460,880);x.lineTo(460,1067);x.lineTo(12,1067);x.closePath();
  if(imgs.apron){x.save();x.clip();drawCover(x,imgs.apron,12,880,448,187);x.restore();x.strokeStyle='#9aa1ad';x.lineWidth=2;x.stroke();x.restore();}
  else{const g=x.createLinearGradient(0,970,0,1067);g.addColorStop(0,'#4a4f5c');g.addColorStop(.3,'#2e323b');g.addColorStop(1,'#15171c');x.fillStyle=g;x.fill();
   x.save();x.clip();x.strokeStyle='rgba(255,255,255,.04)';x.lineWidth=1;for(let i=0;i<60;i++){x.beginPath();x.moveTo(12,900+i*3);x.lineTo(460,890+i*3);x.stroke();}x.restore();
   x.strokeStyle='#c4cad4';x.lineWidth=2;x.stroke();
   for(const [cx,title,l1,l2] of [[96,'BUCKETHEADLAND','3 BALLS PER GAME','LOCK 3 FOR JORDAN'],[376,'SPELL B-U-C-K-E-T','LIGHTS EXTRA BALL','AT THE HAUNTED RIDE']]){
    x.fillStyle='rgba(0,0,0,.4)';x.fillRect(cx-54,1014,112,40);x.fillStyle='#f4efe2';x.fillRect(cx-56,1012,112,40);x.fillStyle='#c8102e';x.fillRect(cx-56,1012,112,9);
    x.fillStyle='#fff';x.font='bold 6px Arial';x.textAlign='center';x.fillText(title,cx,1019);x.fillStyle='#1a1a1a';x.font='6px Arial';x.fillText(l1,cx,1032);x.fillText(l2,cx,1042);}
   x.fillStyle='#1b1e25';x.fillRect(196,1016,80,24);x.strokeStyle='#ffd23f';x.lineWidth=1;x.strokeRect(196,1016,80,24);x.fillStyle='#ffd23f';x.font='bold 9px Georgia';x.textAlign='center';x.fillText('BUCKETHEAD',236,1031);x.restore();}
  x.fillStyle='#24262c';x.fillRect(460,1050,40,17);
 },
 bumperCap(x,p,r,lit,t,imgs={}){
  x.save();x.translate(p.x,p.y);
  if(imgs.bumper){x.beginPath();x.arc(0,0,r*.86,0,TAU);x.clip();x.drawImage(imgs.bumper,-r*.86,-r*.86,r*1.72,r*1.72);if(lit){x.fillStyle='rgba(255,255,220,.35)';x.fill();}x.restore();return;}
  // top view of a striped bucket, with a domed sheen
  for(let i=0;i<12;i++){x.fillStyle=i%2?(lit?'#ffffff':'#ece6d8'):(lit?'#ff3355':'#c8102e');x.beginPath();x.moveTo(0,0);x.arc(0,0,r*.86,i/12*TAU,(i+1)/12*TAU);x.closePath();x.fill();}
  const sh=x.createRadialGradient(-r*.3,-r*.35,1,0,0,r*.9);sh.addColorStop(0,'rgba(255,255,255,.45)');sh.addColorStop(.5,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(0,0,0,.25)');x.fillStyle=sh;x.beginPath();x.arc(0,0,r*.86,0,TAU);x.fill();
  x.fillStyle=lit?'#fffbe0':'#f5f2ea';x.beginPath();x.arc(0,0,r*.42,0,TAU);x.fill();x.fillStyle='#1a1a1a';x.font='bold 9px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('BH',0,.5);x.restore();
 },
 // The Giant Robot toy (moves with p.ox/oy; flashes when hit; eyes blaze while the tractor beam is armed).
 toy(x,p,t,imgs={}){
  const cx=p.x+(p.ox||0),cy=p.y+(p.oy||0),hit=p.flash>0,walk=Math.sin(t*6)*(Math.abs(p.ox||0)>.5?3:0);
  if(imgs.toy){x.save();x.fillStyle='rgba(0,0,0,.45)';x.fillRect(cx-p.w/2+5,cy-p.h/2+6,p.w,p.h);drawCover(x,imgs.toy,cx-p.w/2,cy-p.h/2,p.w,p.h,'stretch');if(hit){x.globalCompositeOperation='lighter';x.fillStyle='rgba(255,255,255,.35)';x.fillRect(cx-p.w/2,cy-p.h/2,p.w,p.h);}x.restore();return;}
  x.save();x.translate(cx,cy);
  x.fillStyle='rgba(0,0,0,.45)';x.fillRect(-40,-28,90,76);
  x.fillStyle='#3a404c';x.fillRect(-30,22+walk,18,16);x.fillRect(12,22-walk,18,16);x.fillStyle='#5d6573';x.fillRect(-34,34+walk,26,8);x.fillRect(8,34-walk,26,8);
  x.fillStyle='#4a5160';x.fillRect(-50,-22,10,40);x.fillRect(40,-22,10,40);x.fillStyle='#c8102e';x.beginPath();x.arc(-45,22,7,0,TAU);x.arc(45,22,7,0,TAU);x.fill();
  const g=x.createLinearGradient(-42,0,42,0);g.addColorStop(0,'#6c7686');g.addColorStop(.5,hit?'#ffffff':'#d7dde8');g.addColorStop(1,'#596170');x.fillStyle=g;x.fillRect(-42,-30,84,58);
  x.strokeStyle='#22262e';x.lineWidth=2;x.strokeRect(-42,-30,84,58);
  for(const [rx,ry] of [[-38,-26],[34,-26],[-38,22],[34,22]]){x.fillStyle='#9aa2b1';x.beginPath();x.arc(rx+2,ry+2,1.6,0,TAU);x.fill();}
  x.fillStyle='#1b1f27';x.fillRect(-26,-18,52,26);for(let i=0;i<5;i++){x.fillStyle=(Math.floor(t*8)+i)%3?'#32d74b':'#0b3d14';x.fillRect(-22+i*10,-12,6,6);}
  x.fillStyle='#c8102e';x.fillRect(-26,12,52,6);
  x.fillStyle='#8a94a6';x.beginPath();x.moveTo(-20,-30);x.lineTo(-20,-50);x.lineTo(0,-58);x.lineTo(20,-50);x.lineTo(20,-30);x.closePath();x.fill();x.stroke();
  x.strokeStyle='#8a94a6';x.beginPath();x.moveTo(0,-58);x.lineTo(0,-66);x.stroke();x.fillStyle=(Math.floor(t*3)%2)?'#ff3b30':'#5a0f0b';x.beginPath();x.arc(0,-67,3,0,TAU);x.fill();
  const eye=p.armed||hit?'#ff2d2d':'#ff9f0a';x.fillStyle=eye;x.fillRect(-14,-46,10,6);x.fillRect(4,-46,10,6);
  if(p.armed){x.globalCompositeOperation='lighter';x.fillStyle='rgba(255,40,40,.35)';x.beginPath();x.arc(-9,-43,9,0,TAU);x.arc(9,-43,9,0,TAU);x.fill();}
  x.restore();
 },
 slingArt(x,p){x.save();x.fillStyle='rgba(255,255,255,.5)';const [ax,ay]=p.a,[bx,by]=p.b,[cx,cy]=p.c;x.beginPath();x.moveTo((ax*2+bx+cx)/4,(ay*2+by+cy)/4);x.lineTo((ax+bx*2+cx)/4,(ay+by*2+cy)/4);x.lineTo((ax+bx+cx*2)/4,(ay+by+cy*2)/4);x.closePath();x.fill();x.restore();},
 backbox(x,W,H,dx,dw,t,imgs={}){
  const side=dx-8;const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2a0b3d');g.addColorStop(1,'#4a0c27');x.fillStyle=g;x.fillRect(0,0,W,H);
  if(side<70){for(let i=0;i<8;i++){const on=(Math.floor(t*6)+i)%3===0;x.fillStyle=on?'#ffd23f':'#5a3a12';x.beginPath();x.arc(dx+dw+16+i*((W-dx-dw-30)/7),H-6,2,0,TAU);x.fill();}return;}
  if(imgs.logo){const w=Math.min(side-10,(H-14)*imgs.logo.width/imgs.logo.height),h=w*imgs.logo.height/imgs.logo.width;x.drawImage(imgs.logo,(dx-6-w)/2,(H-h)/2-3,w,h);}
  else{x.save();x.textAlign='center';x.textBaseline='middle';x.font=`bold ${Math.min(26,H*.32,side/7)}px Georgia`;x.lineWidth=4;x.strokeStyle='#1a0610';x.fillStyle='#ffd23f';
   x.strokeText('BUCKETHEADLAND',(dx-6)/2,H/2);x.fillText('BUCKETHEADLAND',(dx-6)/2,H/2);x.restore();}
  const rx=dx+dw+6,rw=W-rx;if(imgs.backglass){x.save();x.beginPath();x.rect(rx,0,rw,H);x.clip();drawCover(x,imgs.backglass,rx,0,rw,H);x.restore();}
  else buckethead(x,rx+rw/2,H*.42,H*.62);
  for(let i=0;i<12;i++){const on=(Math.floor(t*6)+i)%3===0;x.fillStyle=on?'#ffd23f':'#5a3a12';x.beginPath();x.arc(8+i*((dx-22)/11),H-5,2,0,TAU);x.fill();}
 },
 // The painted backglass (intro card): night park, Ferris wheel, the Giant Robot looming, Buckethead with his guitar.
 backglass(x,bx,by,bw,bh,t){
  x.save();x.translate(bx,by);
  const g=x.createLinearGradient(0,0,0,bh);g.addColorStop(0,'#0b0320');g.addColorStop(.6,'#3a0d45');g.addColorStop(1,'#5a0f2b');x.fillStyle=g;x.fillRect(0,0,bw,bh);
  const r=seededRandom(5);for(let i=0;i<120;i++){x.fillStyle=`rgba(255,255,255,${.2+r()*.6})`;x.fillRect(r()*bw,r()*bh*.6,1.5,1.5);}
  const u=Math.min(bw,bh*.75)/100;   // layout unit
  x.save();x.translate(bw*.72,bh*.5);x.rotate(t*.15);x.translate(-bw*.72,-bh*.5);ferris(x,bw*.72,bh*.5,u*30,.5);x.restore();
  // the robot looming on the left
  x.save();x.translate(bw*.2,bh*.55);x.scale(u*.55,u*.55);art.toy(x,{x:0,y:0,flash:0,armed:Math.floor(t*2)%2},t);x.restore();
  // skyline + Buckethead centre stage
  x.save();x.scale(bw/472,1);skyline(x,bh,.9);x.restore();
  const sp=x.createRadialGradient(bw/2,bh*.62,5,bw/2,bh*.62,u*40);sp.addColorStop(0,'rgba(255,240,200,.45)');sp.addColorStop(1,'rgba(255,240,200,0)');x.fillStyle=sp;x.fillRect(0,0,bw,bh);
  buckethead(x,bw/2,bh*.48,u*38,{guitar:true});
  // marquee: logo framed by chasing bulbs
  const ly=bh*.14;x.fillStyle='rgba(0,0,0,.45)';x.fillRect(bw*.06,ly-u*9,bw*.88,u*18);
  for(let i=0;i<30;i++){const on=(Math.floor(t*8)+i)%3===0;x.fillStyle=on?'#fff3b0':'#6a4a12';const px=bw*.06+i*(bw*.88/29);x.beginPath();x.arc(px,ly-u*9,u*.9,0,TAU);x.arc(px,ly+u*9,u*.9,0,TAU);x.fill();}
  x.textAlign='center';x.textBaseline='middle';x.font=`bold ${Math.min(u*9,bw/9)}px Georgia`;x.lineWidth=u*1.4;x.strokeStyle='#1a0610';x.strokeText('BUCKETHEADLAND',bw/2,ly);x.fillStyle='#ffd23f';x.fillText('BUCKETHEADLAND',bw/2,ly);
  x.font=`bold ${Math.min(u*3.6,bw/24)}px Arial`;x.fillStyle='#ffb3c8';x.fillText('A SHAMBCONKINS PINBALL TABLE',bw/2,ly+u*13);
  x.restore();
 },
};
Object.assign(exports,{art,buckethead});
