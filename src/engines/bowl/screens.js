// Kingpin Bowling: the overhead monitors. The score sheet and the cartoon animations a real alley's scoring system plays
// after a strike, a spare, a gutter ball, a split, a foul, a turkey... (owner, Nov 21: "fun animations ... just like in real
// bowling alleys when they show the animations on the score screen"). Drawn at 640 x 360 into a buffer that is both the
// 3D monitor's texture and the full-screen overlay. The SCREENS part's era sets the style: amber CRT blocks (Ocelot), cartoon
// colour TV (Star Lanes), neon party (Cosmic), slick HD (Reno), hologram (Galactic). Cartoon actors: drawn pins with faces,
// a turkey, a ham bone; the toon-pin / toon-ball / toon-turkey sheets in src/data/bowlSprites.js replace them.
const SP=require("src/data/bowlSprites.js");
const BW=640,BH=360;
const STYLE={
 ocelot:{bg:'#1a0d00',fg:'#ffb347',hi:'#ffd98a',lo:'#7a3e00',font:'"Courier New",monospace',pix:4,mono:'#ffb347'},
 starlanes:{bg:'#10225e',fg:'#ffffff',hi:'#ffd23f',lo:'#e5408c',font:'"Arial Black",Impact,sans-serif',pix:0},
 cosmic:{bg:'#05031a',fg:'#38f0ff',hi:'#ff2fb3',lo:'#d6ff3a',font:'"Arial Black",Impact,sans-serif',pix:0,neon:true},
 reno:{bg:'#05070c',fg:'#ffffff',hi:'#3aa8ff',lo:'#d01717',font:'"Helvetica Neue",Arial,sans-serif',pix:0,slick:true},
 galactic:{bg:'#02040c',fg:'#9ff4ff',hi:'#46e8ff',lo:'#ff4fd0',font:'"Arial Black",Impact,sans-serif',pix:0,holo:true,mono:'#46e8ff'},
};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const ease=t=>1-Math.pow(1-Math.max(0,Math.min(1,t)),3),back=t=>{t=Math.max(0,Math.min(1,t));const c=1.9;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};
const rnd=s=>{let x=s>>>0||7;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};};
// ---------------------------------------------------------------- cartoon actors
// pose: stand, scared, knocked, fly, dizzy, laugh, cry, dance
const POSES=['stand','scared','knocked','fly','dizzy','laugh','cry','dance'];
function toonPin(x,cx,cy,h,pose='stand',rot=0,t=0){
 const sh=SP.SHEETS['toon-pin'],pic=SP.picture('toon-pin');
 x.save();x.translate(cx,cy);x.rotate(rot);
 if(pic){const i=Math.max(0,POSES.indexOf(pose)),[cw,ch]=sh.cell,s=h/ch*1.12;x.drawImage(pic,i*cw*(pic.width/(cw*sh.n)),0,cw*(pic.width/(cw*sh.n)),pic.height,-cw*s/2,-ch*s,cw*s,ch*s);x.restore();return;}
 const w=h*.34;x.fillStyle='#fbf7ee';x.strokeStyle='#1c1410';x.lineWidth=Math.max(1.5,h*.025);
 x.beginPath();x.moveTo(0,-h);x.bezierCurveTo(w*.7,-h,w*.55,-h*.62,w*.34,-h*.55);x.bezierCurveTo(w*1.12,-h*.32,w*.85,0,w*.42,0);x.lineTo(-w*.42,0);
 x.bezierCurveTo(-w*.85,0,-w*1.12,-h*.32,-w*.34,-h*.55);x.bezierCurveTo(-w*.55,-h*.62,-w*.7,-h,0,-h);x.closePath();x.fill();x.stroke();
 x.fillStyle='#d01717';x.fillRect(-w*.34,-h*.66,w*.68,h*.045);x.fillRect(-w*.31,-h*.6,w*.62,h*.032);
 // face on the head
 const fy=-h*.83,ew=w*.13;x.fillStyle='#fff';x.strokeStyle='#1c1410';x.lineWidth=Math.max(1,h*.012);
 const eyes=(o=0)=>{for(const s of [-1,1]){x.beginPath();x.ellipse(s*w*.16,fy+o,ew,ew*1.25,0,0,7);x.fill();x.stroke();}};
 if(pose==='dizzy'){x.lineWidth=h*.015;for(const s of [-1,1]){x.beginPath();for(let a=0;a<12;a+=.5)x.lineTo(s*w*.16+Math.cos(a+t*9)*a*.6*h/120,fy+Math.sin(a+t*9)*a*.6*h/120);x.stroke();}}
 else if(pose==='laugh'){x.lineWidth=h*.018;for(const s of [-1,1]){x.beginPath();x.arc(s*w*.16,fy+ew*.4,ew,Math.PI*1.1,Math.PI*1.9);x.stroke();}}
 else if(pose==='cry'){eyes();x.fillStyle='#1c1410';for(const s of [-1,1]){x.beginPath();x.arc(s*w*.16,fy+ew*.3,ew*.45,0,7);x.fill();}x.fillStyle='#5ab4ff';for(const s of [-1,1]){const k=(t*2+s*.3)%1;x.beginPath();x.ellipse(s*w*.2,fy+ew+k*h*.25,ew*.35,ew*.55,0,0,7);x.fill();}}
 else{eyes();x.fillStyle='#1c1410';const look=pose==='scared'?0:Math.sin(t*3)*ew*.3;const pr=pose==='scared'?ew*.3:ew*.55;for(const s of [-1,1]){x.beginPath();x.arc(s*w*.16+look,fy+ew*.2,pr,0,7);x.fill();}}
 x.strokeStyle='#1c1410';x.fillStyle='#7a1010';x.lineWidth=Math.max(1,h*.014);const my=fy+h*.085;
 if(pose==='scared'||pose==='fly'||pose==='knocked'){x.beginPath();x.ellipse(0,my,w*.09,w*.12,0,0,7);x.fill();x.stroke();}
 else if(pose==='laugh'||pose==='dance'){x.beginPath();x.arc(0,my-w*.04,w*.16,.1,Math.PI-.1);x.closePath();x.fill();x.stroke();}
 else if(pose==='cry'||pose==='dizzy'){x.beginPath();x.arc(0,my+w*.1,w*.12,Math.PI+.3,-.3);x.stroke();}
 else{x.beginPath();x.arc(0,my-w*.06,w*.12,.4,Math.PI-.4);x.stroke();}
 if(pose==='scared'){x.strokeStyle='rgba(28,20,16,.6)';x.lineWidth=h*.01;for(const s of [-1,1]){x.beginPath();x.moveTo(s*w*.9,-h*.6);x.lineTo(s*w*1.15,-h*.66);x.moveTo(s*w*.95,-h*.45);x.lineTo(s*w*1.2,-h*.45);x.stroke();}}
 x.restore();}
function toonBall(x,cx,cy,r,pose=0,rot=0,col='#2a2a7a'){const pic=SP.picture('toon-ball');if(pic){const n=4,cw=pic.width/n;x.drawImage(pic,pose*cw,0,cw,pic.height,cx-r*1.2,cy-r*1.2,r*2.4,r*2.4);return;}
 x.save();x.translate(cx,cy);x.rotate(rot);const g=x.createRadialGradient(-r*.35,-r*.35,r*.1,0,0,r);g.addColorStop(0,'#8f8fff');g.addColorStop(.5,col);g.addColorStop(1,'#0a0a24');x.fillStyle=g;x.beginPath();x.arc(0,0,r,0,7);x.fill();
 x.fillStyle='#000';for(const [a,b,c] of [[-.25,-.35,.14],[.1,-.45,.11],[.3,-.25,.11]]){x.beginPath();x.arc(a*r,b*r,c*r,0,7);x.fill();}x.restore();}
function turkey(x,cx,cy,s,t,pose='strut'){const pic=SP.picture('toon-turkey');if(pic){const i={stand:0,strut:1,gobble:2,dance:3,fly:4,bow:5}[pose]??1,cw=pic.width/6;x.drawImage(pic,i*cw,0,cw,pic.height,cx-s*1.2,cy-s*2.2,s*2.4,s*2.4);return;}
 x.save();x.translate(cx,cy);const bob=Math.sin(t*12)*s*.04;
 // tail fan
 const cols=['#7a3a10','#c4561a','#e0a02a','#9c2a14','#5a2a0a'];for(let i=0;i<9;i++){const a=-Math.PI*.95+i*Math.PI*.95/8-.05;x.fillStyle=cols[i%5];x.beginPath();x.ellipse(-s*.25+Math.cos(a)*s*.55,-s*.9+Math.sin(a)*s*.55+bob,s*.18,s*.55,a+Math.PI/2,0,7);x.fill();}
 // body
 x.fillStyle='#6b3a16';x.beginPath();x.ellipse(0,-s*.75+bob,s*.55,s*.48,0,0,7);x.fill();
 // legs
 x.strokeStyle='#e0a02a';x.lineWidth=s*.07;const st=Math.sin(t*12)*s*.12;x.beginPath();x.moveTo(-s*.15,-s*.3);x.lineTo(-s*.15+st,0);x.moveTo(s*.15,-s*.3);x.lineTo(s*.15-st,0);x.stroke();
 // neck + head
 const gob=pose==='gobble'?Math.sin(t*30)*s*.06:0;x.fillStyle='#8a4a1e';x.beginPath();x.ellipse(s*.42,-s*1.1+bob,s*.13,s*.32,.3,0,7);x.fill();
 x.fillStyle='#e8d1b8';x.beginPath();x.arc(s*.52+gob,-s*1.38+bob,s*.17,0,7);x.fill();
 x.fillStyle='#d01717';x.beginPath();x.ellipse(s*.6+gob,-s*1.22+bob,s*.06,s*.14,0,0,7);x.fill();
 x.fillStyle='#e0a02a';x.beginPath();x.moveTo(s*.66+gob,-s*1.4+bob);x.lineTo(s*.82+gob,-s*1.36+bob);x.lineTo(s*.66+gob,-s*1.31+bob);x.fill();
 x.fillStyle='#000';x.beginPath();x.arc(s*.56+gob,-s*1.43+bob,s*.03,0,7);x.fill();
 x.restore();}
function ham(x,cx,cy,s,rot){x.save();x.translate(cx,cy);x.rotate(rot);x.fillStyle='#f4efe4';x.fillRect(-s*.9,-s*.07,s*.6,s*.14);x.beginPath();x.arc(-s*.95,-s*.1,s*.1,0,7);x.arc(-s*.95,s*.1,s*.1,0,7);x.fill();
 const g=x.createRadialGradient(s*.1,-s*.1,s*.1,s*.15,0,s*.6);g.addColorStop(0,'#f7a2a2');g.addColorStop(1,'#a8402c');x.fillStyle=g;x.beginPath();x.ellipse(s*.2,0,s*.55,s*.42,0,0,7);x.fill();
 x.strokeStyle='rgba(90,30,10,.6)';x.lineWidth=s*.03;for(let i=-2;i<=2;i++){x.beginPath();x.moveTo(s*(.0+i*.15),-s*.38);x.lineTo(s*(.25+i*.15),s*.38);x.stroke();}x.restore();}
// ---------------------------------------------------------------- text helpers
function bigText(x,st,text,cx,cy,size,k=1,col){x.save();x.translate(cx,cy);x.scale(k,k);x.font=`900 ${size}px ${st.font}`;x.textAlign='center';x.textBaseline='middle';
 let w=x.measureText(text).width;if(w>BW*.92){const f=BW*.92/w;x.scale(f,f);}
 if(st.neon){x.shadowColor=col||st.hi;x.shadowBlur=24;}
 x.lineJoin='round';x.lineWidth=size*.16;x.strokeStyle=st.slick?'rgba(0,0,0,.65)':'#000';x.strokeText(text,0,0);
 if(st.slick){const g=x.createLinearGradient(0,-size/2,0,size/2);g.addColorStop(0,'#ffffff');g.addColorStop(.5,col||st.hi);g.addColorStop(1,'#0b2a52');x.fillStyle=g;}else x.fillStyle=col||st.hi;
 x.fillText(text,0,0);x.restore();}
function rays(x,cx,cy,r,t,cols){x.save();x.translate(cx,cy);x.rotate(t*.8);for(let i=0;i<16;i++){x.fillStyle=cols[i%cols.length];x.globalAlpha=.55;x.beginPath();x.moveTo(0,0);x.arc(0,0,r,i*Math.PI/8,(i+.5)*Math.PI/8);x.closePath();x.fill();}x.restore();x.globalAlpha=1;}
function fireworks(x,t,seed,cols){const r=rnd(seed);for(let k=0;k<6;k++){const t0=r()*1.6,cx=80+r()*480,cy=50+r()*160,dt=t-t0;if(dt<0||dt>1.2)continue;
 for(let i=0;i<18;i++){const a=i/18*Math.PI*2,d=ease(dt/1.2)*70;x.fillStyle=cols[(k+i)%cols.length];x.globalAlpha=1-dt/1.2;x.fillRect(cx+Math.cos(a)*d-2,cy+Math.sin(a)*d+dt*dt*30-2,4,4);}}x.globalAlpha=1;}
// ---------------------------------------------------------------- animations
// kind: strike | spare | gutter | split | foul | double | turkey | hambone | bagger | perfect | pickup | count | open
// info: {name, n, standing:[pin numbers], text, streakName, leave}
const RACK=(()=>{const p=[];for(let r=0;r<4;r++)for(let j=0;j<=r;j++)p.push({x:(j-r/2),r});return p;})();
const DUR={strike:2.7,spare:2.3,gutter:2.6,split:2.6,foul:2.8,double:2.8,turkey:3.4,hambone:3.0,bagger:3.0,perfect:4.5,pickup:2.6,count:1.3,open:1.4};
const GUTTER_LINES=['GUTTER BALL!','MUNSONED!','NICE ROLL, ERNIE!','THAT\'S A GUTTER, DUDE','IN THE DRINK!'];
function createAnim(kind,era,info={}){const st=STYLE[era]||STYLE.starlanes,dur=DUR[kind]||2,seed=(info.seed||1)*977+kind.length;const r0=rnd(seed);
 const pick=a=>a[Math.floor(r0()*a.length)];const gl=pick(GUTTER_LINES);
 const A={kind,dur,t:0,era,
  draw(x,t){A.t=t;x.fillStyle=st.bg;x.fillRect(0,0,BW,BH);
   const bgp=SP.picture('screen-'+era);if(bgp){x.globalAlpha=.55;x.drawImage(bgp,0,0,BW,BH);x.globalAlpha=1;}
   const pinsAt=(cx,cy,sz,fn)=>{for(let i=9;i>=0;i--){const p=RACK[i];fn(i+1,cx+p.x*sz*.9,cy-(3-p.r)*sz*.42,sz);}};
   if(kind==='strike'||kind==='double'||kind==='bagger'||kind==='perfect'){
    const hit=.55,bx=-60+Math.min(t/hit,1)*520,cy=270;
    if(t>hit+.3)rays(x,BW/2,BH/2,520,t,[st.hi,st.lo,st.fg]);
    pinsAt(500,cy,70,(n,px,py,sz)=>{const dt=t-hit-(px-460)/400;if(dt<0){toonPin(x,px,py,sz,t>hit-.25?'scared':'stand',0,t);return;}
     const r=rnd(n*31+seed),vx=(r()-.3)*520,vy=-260-r()*260;toonPin(x,px+vx*dt,py+vy*dt+500*dt*dt,sz,'fly',dt*(6+r()*6)*(r()<.5?-1:1),t);});
    if(t<hit+.4)toonBall(x,bx,cy-22,24,1,t*12);
    const k=back((t-hit-.2)/.5);if(t>hit+.2){const word=kind==='strike'?'STRIKE!':kind==='double'?'DOUBLE!':kind==='perfect'?'PERFECT GAME!':(info.streakName||'STRIKE!');
     bigText(x,st,word,BW/2,BH*.42,kind==='perfect'?70:96,k);
     if(kind==='perfect'){fireworks(x,t-hit,seed,[st.hi,st.lo,st.fg,'#fff']);bigText(x,st,'300',BW/2,BH*.72,80,back((t-hit-.8)/.5),st.fg);}
     if(kind==='bagger'||kind==='double')fireworks(x,t-hit,seed,[st.hi,st.lo,st.fg]);}}
   else if(kind==='turkey'){rays(x,BW/2,BH*.6,520,t,[st.lo,st.hi]);const tx=-120+Math.min(1,t/1.4)*(BW/2+120);
    turkey(x,tx,BH*.92,90,t,t>1.4&&t<2.3?'gobble':t>2.3?'dance':'strut');
    if(t>1.2)bigText(x,st,info.streakName||'TURKEY!',BW/2,BH*.2,84,back((t-1.2)/.5));if(t>1.6&&t<2.6)bigText(x,st,'GOBBLE GOBBLE!',BW*.72,BH*.52,30,1,st.fg);}
   else if(kind==='hambone'){rays(x,BW/2,BH/2,520,t,[st.hi,'#f7a2a2']);ham(x,BW/2,BH*.62,110*ease(t/.6),t*2);bigText(x,st,'HAMBONE!',BW/2,BH*.22,84,back((t-.4)/.5));}
   else if(kind==='spare'||kind==='pickup'){const left=(info.standing||[10]).slice(0,4),hit=.6,bx=-60+Math.min(t/hit,1)*480;
    left.forEach((n,i)=>{const p=RACK[n-1],px=430+p.x*55,py=280-(3-p.r)*20,dt=t-hit;if(dt<0)toonPin(x,px,py,64,'scared',Math.sin(t*30)*.08,t);
     else{const r=rnd(n*13+seed);toonPin(x,px+(r()*300+80)*dt*(i%2?-1:1)*.6,py-(220+r()*120)*dt+420*dt*dt,64,'fly',dt*9,t);}});
    if(t<hit+.3)toonBall(x,bx,258,22,0,t*12);
    if(t>hit+.1){bigText(x,st,kind==='pickup'?'SPLIT CONVERTED!':'SPARE!',BW/2,BH*.34,kind==='pickup'?60:96,back((t-hit-.1)/.5));
     if(kind==='pickup')fireworks(x,t-hit,seed,[st.hi,st.lo]);}}
   else if(kind==='gutter'){// the ball drops into the gutter, the pins laugh at you
    x.fillStyle=st.lo;x.fillRect(0,BH*.8,BW,16);const bx=-40+ease(t/1.2)*680;toonBall(x,bx,BH*.8+2+(t>.3?6:0),20,2,t*10);
    pinsAt(470,BH*.66,62,(n,px,py,sz)=>toonPin(x,px,py+Math.abs(Math.sin(t*14+n))*(t>.9?-6:0),sz,t>.9?'laugh':'stand',t>.9?Math.sin(t*12+n)*.12:0,t));
    if(t>.8)bigText(x,st,gl,BW/2,BH*.2,70,back((t-.8)/.5),st.lo);}
   else if(kind==='split'){const left=info.standing||[7,10],sp=ease((t-.3)/.8);
    left.forEach(n=>{const p=RACK[n-1],dir=Math.sign(p.x)||(n%2?-1:1),px=BW/2+p.x*80+dir*sp*90,py=BH*.8-(3-p.r)*26;toonPin(x,px,py,80,'scared',Math.sin(t*40)*.06*(t>.3?1:0),t);});
    if(t>.6){bigText(x,st,info.leave||'SPLIT!',BW/2,BH*.22,info.leave?66:90,back((t-.6)/.5),st.hi);if(info.leave)bigText(x,st,'SPLIT',BW/2,BH*.42,34,1,st.fg);}}
   else if(kind==='foul'){const on=Math.floor(t*6)%2;x.fillStyle=on?'#7a0000':st.bg;x.fillRect(0,0,BW,BH);
    bigText(x,st,'FOUL!',BW/2,BH*.22,90,back(t/.4),'#ff3030');if(t>.8)bigText(x,st,'OVER THE LINE!',BW/2,BH*.5,50,back((t-.8)/.4),st.fg);
    if(t>1.5){bigText(x,st,'MARK IT ZERO!!',BW/2,BH*.76,58,back((t-1.5)/.4),st.hi);}}
   else if(kind==='count'||kind==='open'){const n=info.n||0;bigText(x,st,kind==='open'?(info.text||'OPEN'):String(n),BW/2,BH*.45,kind==='count'?140:80,back(t/.35),st.fg);
    if(kind==='count')bigText(x,st,n===1?'PIN':'PINS',BW/2,BH*.8,34,1,st.hi);}
   if(info.name&&t>.1){x.font=`700 22px ${st.font}`;x.fillStyle=st.fg;x.textAlign='left';x.textBaseline='top';x.fillText(info.name.toUpperCase(),16,12);}
   post(x,st,t);
   return t<dur;}};
 return A;}
// era look over the whole buffer (amber mono pixel CRT, hologram)
let pixBuf=null;
function post(x,st,t){const c=x.canvas;
 if(st.pix){if(!pixBuf)pixBuf=mk(BW/st.pix,BH/st.pix);const p=pixBuf.getContext('2d');p.imageSmoothingEnabled=true;p.drawImage(c,0,0,pixBuf.width,pixBuf.height);
  x.save();x.imageSmoothingEnabled=false;x.drawImage(pixBuf,0,0,BW,BH);x.restore();}
 if(st.mono){x.save();x.globalCompositeOperation='color';x.fillStyle=st.mono;x.fillRect(0,0,BW,BH);x.restore();}
 // scanlines + vignette (every CRT-ish era)
 x.fillStyle=st.holo?`rgba(70,232,255,${.05+.04*Math.sin(t*30)})`:'rgba(0,0,0,.18)';for(let y=0;y<BH;y+=3)x.fillRect(0,y,BW,1);
 if(!st.slick){const g=x.createRadialGradient(BW/2,BH/2,BH*.35,BW/2,BH/2,BW*.62);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.6)');x.fillStyle=g;x.fillRect(0,0,BW,BH);}
 else{const k=(t*.6)%1.6-.3;const g=x.createLinearGradient(BW*k,0,BW*(k+.2),BH);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.08)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,BW,BH);}}
// ---------------------------------------------------------------- the score sheet (monitor idle screen)
// players: [{name, rows: rules.sheet(), total, active}], frames, era. Draws the classic sheet: frame boxes, ball marks
// (X / - F, split balls circled), running totals.
function drawSheet(x,era,players,{frames=10,title='',face=null}={}){const st=STYLE[era]||STYLE.starlanes;x.fillStyle=st.bg;x.fillRect(0,0,BW,BH);
 const bgp=SP.picture('screen-'+era);if(bgp){x.globalAlpha=.4;x.drawImage(bgp,0,0,BW,BH);x.globalAlpha=1;}
 const n=players.length,top=48,rowH=Math.min(130,(BH-top-14)/Math.max(1,n)),nameW=118,fw=(BW-nameW-16-74)/frames;
 x.font=`700 20px ${st.font}`;x.fillStyle=st.hi;x.textAlign='left';x.textBaseline='middle';x.fillText(title,14,24);
 players.forEach((p,pi)=>{const y=top+pi*rowH,h=rowH-10;
  x.fillStyle=p.active?(st.slick?'rgba(58,168,255,.22)':'rgba(255,255,255,.12)'):'rgba(0,0,0,.25)';x.fillRect(8,y,BW-16,h);
  if(p.active){x.strokeStyle=st.hi;x.lineWidth=3;x.strokeRect(8,y,BW-16,h);}
  if(p.face){try{x.drawImage(p.face,14,y+6,h-12,h-12);}catch{}}
  x.fillStyle=st.fg;x.font=`700 ${Math.min(22,h*.24)}px ${st.font}`;x.textAlign='left';x.fillText(fitStr(x,p.name.toUpperCase(),nameW-(p.face?h-6:0)-8),14+(p.face?h-6:0),y+h*.28);
  for(let f=0;f<frames;f++){const fx=8+nameW+f*fw,row=p.rows[f]||{marks:[]};x.strokeStyle=st.fg;x.globalAlpha=.6;x.lineWidth=1.5;x.strokeRect(fx,y+4,fw,h-8);x.globalAlpha=1;
   const last=f===frames-1,nb=last?3:2,bw=Math.min(fw/nb,fw*.42);
   for(let b=0;b<nb;b++){const bx=fx+fw-(nb-b)*bw;x.strokeStyle=st.fg;x.globalAlpha=.5;x.strokeRect(bx,y+4,bw,h*.4);x.globalAlpha=1;
    const m=row.marks[b];if(m){x.fillStyle=m==='X'||m==='/'?st.hi:m==='F'?'#ff4040':st.fg;x.font=`800 ${Math.min(bw*.8,h*.3)}px ${st.font}`;x.textAlign='center';x.fillText(m,bx+bw/2,y+4+h*.21);
     if(row.split&&row.split[b]){x.strokeStyle=st.lo;x.lineWidth=2;x.beginPath();x.arc(bx+bw/2,y+4+h*.21,Math.min(bw,h*.38)*.42,0,7);x.stroke();}}}
   if(row.total!=null){x.fillStyle=st.fg;x.font=`700 ${Math.min(fw*.38,h*.3)}px ${st.font}`;x.textAlign='center';x.fillText(String(row.total),fx+fw/2,y+h*.68);}
   x.fillStyle=st.fg;x.globalAlpha=.55;x.font=`600 11px ${st.font}`;x.fillText(String(f+1),fx+fw*.2,y+12);x.globalAlpha=1;}
  x.fillStyle=st.hi;x.font=`900 ${Math.min(34,h*.4)}px ${st.font}`;x.textAlign='center';x.fillText(String(p.total),BW-8-37,y+h/2);});
 void face;post(x,st,0);}
function fitStr(x,s,w){if(x.measureText(s).width<=w)return s;while(s.length>2&&x.measureText(s+'…').width>w)s=s.slice(0,-1);return s+'…';}
// a fake game on the neighbours' monitors (the other bowlers in the alley)
function drawNeighbour(x,era,seed){const r=rnd(seed),names=['DONNY','WALTER','SMOKEY','JESUS','LIAM','BIG ERN','THE STRANGER','BUNNY'];
 const pl=[0,1].map(()=>{const rows=[];let tot=0;const nf=3+Math.floor(r()*6);for(let f=0;f<10;f++){if(f>=nf){rows.push({marks:[]});continue;}const a=Math.floor(r()*11);let marks;if(a===10)marks=['X'];else{const b=Math.floor(r()*(11-a));marks=[a?String(a):'-',a+b===10?'/':(b?String(b):'-')];}tot+=a===10?20:a+b>9?15:a+(marks[1]==='/'?10-a:+marks[1]||0);rows.push({marks,total:tot});}
  return {name:names[Math.floor(r()*names.length)],rows,total:tot};});
 drawSheet(x,era,pl,{title:'LANE '+(10+Math.floor(r()*20))});}
Object.assign(exports,{BW,BH,STYLE,DUR,createAnim,drawSheet,drawNeighbour,toonPin,toonBall,turkey,ham,bigText});
