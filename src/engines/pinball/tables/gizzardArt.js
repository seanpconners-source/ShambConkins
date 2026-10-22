// King Gizzard & the Lizard Wizard art, in table millimetres: a psychedelic 70s-poster palette (violet, acid green,
// tangerine, hot pink) on deep night purple. Melting concentric NONAGON rings radiate from the middle; the RATS' NEST
// up top has its own floor (the green dust of Planet B, with a raised rim); the RATTLESNAKE is drawn every frame
// (overlay) along its carry rail, wiggling, mouth agape at its pocket, with a bulge sliding through it while it carries
// a ball; the Lizard Wizard stands between the slingshots. Every function takes the owner's drop-in pictures (imgs).
const {seededRandom}=require("src/utils.js");
const {drawCover,drawToy}=require("src/engines/pinball/dropins.js");
const TAU=Math.PI*2;
function playfieldPath(x){x.beginPath();x.moveTo(12,1067);x.lineTo(12,256);x.arc(256,256,244,Math.PI,TAU);x.lineTo(500,1067);x.closePath();}
// The Nest floor: inside the loop's inner wall, down to its flipper guides.
function nestPath(x){x.beginPath();x.arc(256,256,190,Math.PI,Math.PI*1.807);x.lineTo(412,186);x.lineTo(312,234);x.lineTo(265,272);x.lineTo(207,272);x.lineTo(160,234);x.lineTo(77.5,191);x.closePath();}
const lift=(p,k=.22)=>[p[0]-(p[2]||0)*k*.35,p[1]-(p[2]||0)*k];
function nonagonPath(x,cx,cy,r,rot=0){x.beginPath();for(let i=0;i<9;i++){const a=rot-Math.PI/2+i/9*TAU;i?x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):x.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}x.closePath();}
// Melting psychedelic rings (wobbly nonagons) around a point.
function rings(x,cx,cy,n,step,cols,alpha=.18,seed=5){const r=seededRandom(seed);for(let i=n;i>=1;i--){x.beginPath();for(let k=0;k<=90;k++){const a=k/90*TAU,rr=i*step*(1+.05*Math.sin(a*9))+Math.sin(a*3+i)*step*.25;k?x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr):x.moveTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}x.closePath();
 x.fillStyle=cols[i%cols.length];x.globalAlpha=alpha*(.7+.3*r());x.fill();}x.globalAlpha=1;}
// The Lizard Wizard (feet at 0,0, about 120 tall): pointed starry hat, green lizard head, violet robe, glowing staff.
function lizardWizard(x,t=0){
 x.save();
 x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(4,4,34,8,0,0,TAU);x.fill();
 const robe=x.createLinearGradient(-30,0,30,0);robe.addColorStop(0,'#3a1468');robe.addColorStop(.5,'#7a3cff');robe.addColorStop(1,'#2a0d52');
 x.fillStyle=robe;x.beginPath();x.moveTo(-32,0);x.quadraticCurveTo(-22,-40,-14,-66);x.lineTo(14,-66);x.quadraticCurveTo(22,-40,32,0);x.closePath();x.fill();
 x.fillStyle='#ffd23f';for(const [sx,sy] of [[-12,-14],[10,-30],[-4,-46],[16,-8],[-18,-34]]){x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?1.4:3.4;x.lineTo(sx+Math.cos(a)*r,sy+Math.sin(a)*r);}x.fill();}
 // arm + staff
 x.strokeStyle='#5a2a14';x.lineWidth=3;x.beginPath();x.moveTo(24,6);x.lineTo(30,-92);x.stroke();
 const glow=x.createRadialGradient(30,-96,1,30,-96,14);glow.addColorStop(0,'#ffffff');glow.addColorStop(.3,'#7cff4f');glow.addColorStop(1,'rgba(124,255,79,0)');x.fillStyle=glow;x.beginPath();x.arc(30,-96,14+Math.sin(t*4)*2,0,TAU);x.fill();
 x.fillStyle='#4fbf2a';x.beginPath();x.ellipse(22,-52,6,4,-.5,0,TAU);x.fill();
 // lizard head: snout to the right, yellow eye
 const skin=x.createLinearGradient(-12,-86,16,-64);skin.addColorStop(0,'#9cff5a');skin.addColorStop(1,'#2f8f1a');x.fillStyle=skin;
 x.beginPath();x.ellipse(0,-74,12,10,0,0,TAU);x.fill();x.beginPath();x.ellipse(13,-71,11,5.5,.1,0,TAU);x.fill();
 x.fillStyle='#ffe14a';x.beginPath();x.arc(4,-78,3.4,0,TAU);x.fill();x.fillStyle='#111';x.fillRect(3.4,-81,1.2,6);
 x.strokeStyle='#1d5a10';x.lineWidth=.8;x.beginPath();x.moveTo(6,-68);x.quadraticCurveTo(15,-66,23,-70);x.stroke();
 for(let i=0;i<5;i++){x.fillStyle='#ff7a1a';x.beginPath();x.moveTo(-10+i*3,-84);x.lineTo(-8+i*3,-90);x.lineTo(-6+i*3,-84);x.fill();}
 // the hat
 const hat=x.createLinearGradient(-20,-130,20,-80);hat.addColorStop(0,'#bf5af2');hat.addColorStop(1,'#3a1468');x.fillStyle=hat;
 x.beginPath();x.moveTo(-22,-82);x.lineTo(24,-84);x.quadraticCurveTo(6,-104,-2,-136);x.quadraticCurveTo(-8,-104,-22,-82);x.fill();
 x.fillStyle='#2a0d52';x.beginPath();x.ellipse(1,-83,24,4,0,0,TAU);x.fill();
 x.fillStyle='#ffd23f';x.beginPath();x.arc(-2,-104,2,0,TAU);x.arc(4,-94,1.6,0,TAU);x.fill();
 x.restore();
}
function logo(x,cx,cy,size,imgs){if(imgs?.logo){const w=size*12,h=w*imgs.logo.height/imgs.logo.width;x.drawImage(imgs.logo,cx-w/2,cy-h/2,w,h);return;}
 x.save();x.textAlign='center';x.textBaseline='middle';
 const g=x.createLinearGradient(cx,cy-size*.6,cx,cy+size*.4);g.addColorStop(0,'#ffe14a');g.addColorStop(.45,'#ff7a1a');g.addColorStop(1,'#ff2d95');
 x.font=`900 ${size}px "Arial Black",Impact,sans-serif`;
 // a melting wobble: each letter bobs on a sine
 const word='KING GIZZARD',w=x.measureText(word).width;let px=cx-w/2;
 for(const [i,ch] of [...word].entries()){const cw=x.measureText(ch).width,dy=Math.sin(i*.9)*size*.08;
  x.lineWidth=size*.22;x.strokeStyle='#14051f';x.strokeText(ch,px+cw/2,cy-size*.18+dy);x.fillStyle=g;x.fillText(ch,px+cw/2,cy-size*.18+dy);px+=cw;}
 x.font=`bold italic ${size*.42}px Georgia,serif`;x.lineWidth=size*.12;x.strokeStyle='#14051f';x.strokeText('& THE LIZARD WIZARD',cx,cy+size*.52);x.fillStyle='#7cff4f';x.fillText('& THE LIZARD WIZARD',cx,cy+size*.52);
 x.restore();}

// Snake geometry: the carry rail, wiggled sideways along its length (k = 0 head → 1 tail).
function snakePts(def,t){const r=def.rails.find(q=>q.id==='snakeBody');if(!r)return [];const P=r.pts,out=[];
 for(let i=0;i<P.length;i++){const a=P[Math.max(0,i-1)],b=P[Math.min(P.length-1,i+1)];let tx=b[0]-a[0],ty=b[1]-a[1];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;
  const k=i/(P.length-1),wig=Math.sin(k*14-t*5)*3.2*Math.sin(Math.min(1,k*6)*Math.PI/2);const p=lift([P[i][0]-ty*wig,P[i][1]+tx*wig,P[i][2]||0]);out.push({x:p[0],y:p[1],k,tx,ty});}
 return out;}
function drawSnake(x,def,w,t){
 const pts=snakePts(def,t);if(!pts.length)return;
 // the ball inside (if any): where along the body
 const rail=w?.rails.find(q=>q.id==='snakeBody'),inside=(w?.balls||[]).filter(b=>b.state==='rail'&&b.rail.r===rail).map(b=>b.rail.s/rail.len);
 const held=(w?.balls||[]).some(b=>b.state==='held'&&b.hold?.hole.id==='snake');
 const width=k=>{let wd=11-6*k;for(const s of inside){const d=(k-s)*rail.len/16;wd+=7*Math.exp(-d*d);}return wd;};
 // shadow, then the body as overlapping discs (so the bulge swells smoothly), then the diamond back pattern
 x.save();x.fillStyle='rgba(0,0,0,.35)';for(let i=0;i<pts.length-1;i++){const p=pts[i];for(let j=0;j<3;j++){const q={x:p.x+(pts[i+1].x-p.x)*j/3,y:p.y+(pts[i+1].y-p.y)*j/3};x.beginPath();x.arc(q.x+5,q.y+7,width(p.k),0,TAU);x.fill();}}
 for(let i=pts.length-1;i>=0;i--){const p=pts[i],n=pts[Math.min(pts.length-1,i+1)];for(let j=2;j>=0;j--){const qx=p.x+(n.x-p.x)*j/3,qy=p.y+(n.y-p.y)*j/3,wd=width(p.k);
   const g=x.createRadialGradient(qx-wd*.35,qy-wd*.4,1,qx,qy,wd);g.addColorStop(0,'#e8ff9a');g.addColorStop(.35,'#7ccf3a');g.addColorStop(1,'#1f4a12');x.fillStyle=g;x.beginPath();x.arc(qx,qy,wd,0,TAU);x.fill();}}
 for(let i=2;i<pts.length-2;i+=3){const p=pts[i],wd=width(p.k)*.55;x.fillStyle=i%6?'#ff7a1a':'#3a1468';x.beginPath();x.moveTo(p.x+p.tx*wd*1.3,p.y+p.ty*wd*1.3);x.lineTo(p.x-p.ty*wd,p.y+p.tx*wd);x.lineTo(p.x-p.tx*wd*1.3,p.y-p.ty*wd*1.3);x.lineTo(p.x+p.ty*wd,p.y-p.tx*wd);x.closePath();x.fill();}
 // the ball shows as a chrome glint through the stretched skin
 for(const s of inside){const i=Math.min(pts.length-1,Math.round(s*(pts.length-1))),p=pts[i];x.fillStyle='rgba(230,240,255,.55)';x.beginPath();x.ellipse(p.x-3,p.y-4,4,2.4,-.6,0,TAU);x.fill();}
 // rattle at the tail
 const tl=pts[pts.length-1],shake=Math.sin(t*40)*(inside.length?2:.6);for(let j=0;j<4;j++){x.fillStyle=j%2?'#d9c48a':'#a8915a';x.beginPath();x.ellipse(tl.x+tl.tx*(4+j*4)+shake,tl.y+tl.ty*(4+j*4),4-j*.6,3-j*.5,Math.atan2(tl.ty,tl.tx),0,TAU);x.fill();}
 // head at the mouth pocket, facing the player; jaws gape while it swallows
 const gape=held?1:.35+.15*Math.sin(t*3);x.translate(348,536);
 x.fillStyle='#2f6b1a';x.beginPath();x.ellipse(0,0,20,15,0,0,TAU);x.fill();
 const hg=x.createRadialGradient(-6,-6,2,0,0,20);hg.addColorStop(0,'#d8ff8a');hg.addColorStop(1,'#3f8f22');x.fillStyle=hg;x.beginPath();x.ellipse(0,-2,18,13,0,0,TAU);x.fill();
 x.fillStyle='#ffe14a';for(const s of [-1,1]){x.beginPath();x.ellipse(s*9,-6,4.5,3.2,s*.3,0,TAU);x.fill();x.fillStyle='#111';x.fillRect(s*9-.8,-9,1.6,6);x.fillStyle='#ffe14a';}
 x.fillStyle='#2a0a0a';x.beginPath();x.ellipse(0,9,13*gape+3,7*gape+2,0,0,TAU);x.fill();
 x.fillStyle='#fff';for(const s of [-1,1]){x.beginPath();x.moveTo(s*8,4);x.lineTo(s*6,4+7*gape);x.lineTo(s*4,4);x.fill();}
 if(!held&&Math.floor(t*2.5)%3===0){x.strokeStyle='#ff2d55';x.lineWidth=1.6;x.beginPath();x.moveTo(0,10);x.lineTo(0,22);x.lineTo(-3,26);x.moveTo(0,22);x.lineTo(3,26);x.stroke();}
 x.restore();
}

const art={
 plastic:'#ffd23f',sling:'#3a1468',drop:'#ff7a1a',flipper:'#f4f1ea',flipperRubber:'#7cff4f',flipperText:'GIZZARD',postGlow:'#7cff4f',
 base(x,def,imgs={}){
  x.fillStyle='#0b0612';x.fillRect(0,0,def.W,def.H);
  x.save();playfieldPath(x);x.clip();
  if(imgs.playfield){drawCover(x,imgs.playfield,0,0,def.W,def.H,'stretch');x.restore();return;}
  const g=x.createLinearGradient(0,0,0,def.H);g.addColorStop(0,'#120626');g.addColorStop(.45,'#1d0a36');g.addColorStop(.8,'#2a0a26');g.addColorStop(1,'#10040e');x.fillStyle=g;x.fillRect(0,0,def.W,def.H);
  rings(x,236,612,14,34,['#bf5af2','#ff7a1a','#7cff4f','#ff2d95','#64d2ff'],.13,5);
  const r=seededRandom(17);for(let i=0;i<140;i++){x.fillStyle=`rgba(255,240,200,${.08+r()*.35})`;x.fillRect(r()*def.W,r()*def.H,1.1,1.1);}
  // the loop lane: a dark track with nonagon ticks
  x.save();x.strokeStyle='rgba(0,0,0,.45)';x.lineWidth=46;x.beginPath();x.moveTo(39,560);x.lineTo(39,256);x.arc(256,256,217,Math.PI,Math.PI*1.9);x.stroke();
  x.strokeStyle='rgba(191,90,242,.35)';x.lineWidth=1.2;x.setLineDash([2,14]);x.stroke();x.setLineDash([]);x.restore();
  // ---- THE RATS' NEST floor: Planet B's green dust, craters, a raised rim casting a shadow onto the main field
  x.save();nestPath(x);x.shadowColor='rgba(0,0,0,.8)';x.shadowBlur=14;x.shadowOffsetY=8;x.fillStyle='#0d2a1c';x.fill();x.restore();
  x.save();nestPath(x);x.clip();
  const ng=x.createRadialGradient(236,150,10,236,170,220);ng.addColorStop(0,'#3d8f4a');ng.addColorStop(.6,'#1a4a2e');ng.addColorStop(1,'#0b2216');x.fillStyle=ng;x.fillRect(60,40,360,240);
  const rc=seededRandom(23);for(let i=0;i<26;i++){const cx=80+rc()*320,cy=70+rc()*170,cr=3+rc()*12;x.fillStyle='rgba(0,0,0,.22)';x.beginPath();x.arc(cx,cy,cr,0,TAU);x.fill();x.strokeStyle='rgba(180,255,160,.18)';x.lineWidth=1;x.beginPath();x.arc(cx-1,cy-1,cr,Math.PI,TAU*.9);x.stroke();}
  x.strokeStyle='rgba(124,255,79,.12)';x.lineWidth=1;for(let gx=70;gx<420;gx+=22){x.beginPath();x.moveTo(gx,40);x.lineTo(gx,280);x.stroke();}for(let gy=60;gy<280;gy+=22){x.beginPath();x.moveTo(60,gy);x.lineTo(420,gy);x.stroke();}
  x.fillStyle='rgba(124,255,79,.55)';x.font='bold 8px "Arial Black",Arial';x.textAlign='center';x.fillText("THE RATS' NEST",236,196);
  x.fillStyle='rgba(200,255,200,.35)';x.font='bold 5px Arial';x.fillText('UPPER PLAYFIELD',236,205);
  x.restore();
  x.save();nestPath(x);x.strokeStyle='#7cff4f';x.globalAlpha=.6;x.lineWidth=1.4;x.stroke();x.restore();
  // ---- main field motifs: the NONAGON emblem, the Gila monster by its drops, the flying banana near the pops
  x.save();x.strokeStyle='rgba(191,90,242,.6)';x.lineWidth=2;nonagonPath(x,236,612,46);x.stroke();x.strokeStyle='rgba(255,122,26,.4)';nonagonPath(x,236,612,56,.17);x.stroke();
  x.fillStyle='rgba(255,255,255,.5)';x.font='bold 6px Arial';x.textAlign='center';x.fillText('NONAGON INFINITY',236,676);x.restore();
  x.save();x.translate(236,500);x.fillStyle='rgba(255,122,26,.25)';for(let i=0;i<10;i++){x.beginPath();x.ellipse(-56+i*12,Math.sin(i)*3,7,4,0,0,TAU);x.fill();}x.fillStyle='rgba(255,180,90,.4)';x.font='bold 7px Arial';x.textAlign='center';x.fillText('G I L A   M O N S T E R',0,16);x.restore();
  const pg=x.createRadialGradient(236,360,10,236,360,120);pg.addColorStop(0,'rgba(255,225,74,.28)');pg.addColorStop(1,'rgba(255,225,74,0)');x.fillStyle=pg;x.beginPath();x.arc(236,360,120,0,TAU);x.fill();
  x.fillStyle='rgba(255,230,120,.65)';x.font='bold 7px Arial';x.textAlign='center';x.fillText('MICROTONAL',236,436);
  // the snake's trail glow under the overlay body, and the GIZZVERSE swirl round the saucer
  x.save();const sv=x.createRadialGradient(100,710,4,100,710,48);sv.addColorStop(0,'rgba(191,90,242,.55)');sv.addColorStop(1,'rgba(191,90,242,0)');x.fillStyle=sv;x.beginPath();x.arc(100,710,48,0,TAU);x.fill();x.restore();
  logo(x,236,712,22,imgs);
  for(const [ax,ay,c] of [[72,700,'#7cff4f'],[400,700,'#7cff4f'],[31,760,'#ff3b30'],[441,760,'#ff3b30']]){x.fillStyle=c;x.globalAlpha=.25;x.beginPath();x.moveTo(ax,ay+30);x.lineTo(ax-9,ay);x.lineTo(ax+9,ay);x.fill();x.globalAlpha=1;}
  if(imgs.character){const w=110,h=w*imgs.character.height/imgs.character.width;x.drawImage(imgs.character,236-w/2,830-h*.45,w,h);}
  else drawCharacter(x);
  x.fillStyle='rgba(124,255,79,.6)';x.font='italic bold 7px Georgia,serif';x.textAlign='center';x.fillText('MELBOURNE · GIZZVERSE',236,880);
  x.restore();x.save();x.strokeStyle='rgba(124,255,79,.5)';x.lineWidth=1.2;x.beginPath();x.moveTo(20,872);x.lineTo(20,256);x.arc(256,256,236,Math.PI,TAU);x.lineTo(492,300);x.stroke();x.restore();
 },
 over(x,def,imgs={}){
  x.save();x.beginPath();x.moveTo(12,880);x.lineTo(110,976);x.lineTo(168,1004);x.lineTo(304,1004);x.lineTo(362,976);x.lineTo(460,880);x.lineTo(460,1067);x.lineTo(12,1067);x.closePath();
  if(imgs.apron){x.save();x.clip();drawCover(x,imgs.apron,12,880,448,187);x.restore();x.strokeStyle='#5d5a66';x.lineWidth=2;x.stroke();x.restore();}
  else{const g=x.createLinearGradient(0,970,0,1067);g.addColorStop(0,'#24103a');g.addColorStop(1,'#0b0612');x.fillStyle=g;x.fill();x.strokeStyle='#7cff4f';x.lineWidth=2;x.stroke();
   for(const [cx,title,l1,l2] of [[96,'KING GIZZARD','3 BALLS PER GAME','G-I-L-A LIGHTS SNAKE LOCKS'],[376,'SPELL R-A-T-S','IN THE NEST: PLANET B','EVERY 2ND: EXTRA BALL']]){
    x.fillStyle='rgba(0,0,0,.5)';x.fillRect(cx-54,1014,112,40);x.fillStyle='#f6eedc';x.fillRect(cx-56,1012,112,40);x.fillStyle='#3a1468';x.fillRect(cx-56,1012,112,9);
    x.fillStyle='#fff';x.font='bold 6px Arial';x.textAlign='center';x.fillText(title,cx,1019);x.fillStyle='#1a1a1a';x.font='6px Arial';x.fillText(l1,cx,1032);x.fillText(l2,cx,1042);}
   x.fillStyle='#0b0612';x.fillRect(184,1016,104,24);x.strokeStyle='#bf5af2';x.lineWidth=1;x.strokeRect(184,1016,104,24);x.fillStyle='#7cff4f';x.font='bold 8px "Arial Black",Arial';x.textAlign='center';x.fillText('NONAGON INFINITY',236,1031);x.restore();}
  x.fillStyle='#18161c';x.fillRect(460,1050,40,17);
 },
 // The snake, every frame, above the balls (it hides the one it carries).
 overlay(x,def,w,t){drawSnake(x,def,w,t);},
 // MICROTONAL pop caps: a violet third eye inside a nonagon.
 bumperCap(x,p,r,lit,t,imgs={}){
  x.save();x.translate(p.x,p.y);
  if(imgs.bumper){x.beginPath();x.arc(0,0,r*.86,0,TAU);x.clip();x.drawImage(imgs.bumper,-r*.86,-r*.86,r*1.72,r*1.72);if(lit){x.fillStyle='rgba(220,255,200,.35)';x.fill();}x.restore();return;}
  const f=x.createRadialGradient(-r*.3,-r*.3,2,0,0,r*.86);f.addColorStop(0,lit?'#f4e1ff':'#d49bff');f.addColorStop(1,lit?'#bf5af2':'#5a1fa0');x.fillStyle=f;x.beginPath();x.arc(0,0,r*.86,0,TAU);x.fill();
  x.strokeStyle=lit?'#ffffff':'#ffd23f';x.lineWidth=1.4;nonagonPath(x,0,0,r*.66,t*(lit?3:.6));x.stroke();
  x.fillStyle='#f6eedc';x.beginPath();x.ellipse(0,0,r*.42,r*.24,0,0,TAU);x.fill();x.fillStyle=lit?'#ff2d95':'#7cff4f';x.beginPath();x.arc(0,0,r*.18,0,TAU);x.fill();x.fillStyle='#111';x.beginPath();x.arc(0,0,r*.08,0,TAU);x.fill();
  x.restore();
 },
 slingArt(x,p){const [ax,ay]=p.a,[bx,by]=p.b,[cx,cy]=p.c,mx=(ax+bx+cx)/3,my=(ay+by+cy)/3;x.save();x.strokeStyle='rgba(124,255,79,.7)';x.lineWidth=1;nonagonPath(x,mx,my,7);x.stroke();x.restore();},
 backbox(x,W,H,dx,dw,t,imgs={}){
  const side=dx-8;const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#1d0a36');g.addColorStop(1,'#3a0a2a');x.fillStyle=g;x.fillRect(0,0,W,H);
  if(side<70){for(let i=0;i<9;i++){const on=(Math.floor(t*6)+i)%3===0;x.fillStyle=on?'#7cff4f':'#1d3a12';x.beginPath();x.arc(dx+dw+16+i*((W-dx-dw-30)/8),H-6,2,0,TAU);x.fill();}return;}
  if(imgs.logo){const w=Math.min(side-10,(H-14)*imgs.logo.width/imgs.logo.height),h=w*imgs.logo.height/imgs.logo.width;x.drawImage(imgs.logo,(dx-6-w)/2,(H-h)/2,w,h);}
  else logo(x,(dx-6)/2,H/2,Math.min(24,H*.34,side/7),null);
  const rx=dx+dw+6,rw=W-rx;if(imgs.backglass){x.save();x.beginPath();x.rect(rx,0,rw,H);x.clip();drawCover(x,imgs.backglass,rx,0,rw,H);x.restore();}
  else{x.save();x.beginPath();x.rect(rx,0,rw,H);x.clip();rings(x,rx+rw/2,H/2,8,H*.12,['#bf5af2','#ff7a1a','#7cff4f'],.35,9);x.translate(rx+rw*.5,H*.98);x.scale(H/150,H/150);lizardWizard(x,t);x.restore();}
 },
 // The painted backglass: psychedelic rings behind the Lizard Wizard, the rattlesnake coiled at his feet, the
 // nonagon halo, the logo across the top.
 backglass(x,bx,by,bw,bh,t){
  x.save();x.translate(bx,by);x.beginPath();x.rect(0,0,bw,bh);x.clip();
  const g=x.createLinearGradient(0,0,0,bh);g.addColorStop(0,'#120626');g.addColorStop(.6,'#2a0a46');g.addColorStop(1,'#3a0a2a');x.fillStyle=g;x.fillRect(0,0,bw,bh);
  const u=Math.min(bw,bh*.75)/100;
  x.save();x.translate(bw/2,bh*.55);x.rotate(t*.15);x.translate(-bw/2,-bh*.55);rings(x,bw/2,bh*.55,18,u*5,['#bf5af2','#ff7a1a','#7cff4f','#ff2d95','#64d2ff'],.28,3);x.restore();
  x.strokeStyle='#ffd23f';x.lineWidth=u*.8;nonagonPath(x,bw/2,bh*.42,u*24,t*.4);x.stroke();
  x.save();x.translate(bw/2,bh*.9);x.scale(u*.62,u*.62);lizardWizard(x,t);x.restore();
  // a coiled snake at his feet (a wobbling ring of scales)
  for(let i=0;i<40;i++){const a=i/40*TAU*1.4+t,rr=u*(14-i*.18),px=bw*.3+Math.cos(a)*rr,py=bh*.88+Math.sin(a)*rr*.4;x.fillStyle=i%4<2?'#7ccf3a':'#ff7a1a';x.beginPath();x.arc(px,py,u*(2.2-i*.03),0,TAU);x.fill();}
  const ly=bh*.13;x.fillStyle='rgba(0,0,0,.45)';x.fillRect(bw*.03,ly-u*10,bw*.94,u*22);logo(x,bw/2,ly,Math.min(u*9,bw/9),null);
  x.font=`bold ${Math.min(u*3.2,bw/28)}px Arial`;x.fillStyle='#d9ffb3';x.textAlign='center';x.fillText('A SHAMBCONKINS PINBALL TABLE',bw/2,ly+u*15);
  x.restore();
 },
};
// The hero art between the slings (also used by tools/pinball-art-templates.mjs to frame the character template).
function drawCharacter(x,t=0){x.save();x.translate(236,866);x.scale(.62,.62);lizardWizard(x,t);x.restore();}
Object.assign(exports,{art,logo,drawCharacter,drawSnake});
