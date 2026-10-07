// Paddy's Pub look for Beer Pong and Flipadelphia: the bar room, the table, solo cups,
// particles, pop-up text and shake. Pure drawing: physics stays in pubPhysics.js.
const {clamp}=require("src/utils.js");
const {store}=require("src/state.js");
const PLAYER_CUPS=[{base:'#1f7fd6',light:'#7fd0ff',dark:'#0c3f78',lip:'#bfe8ff'},{base:'#d8264a',light:'#ff8aa2',dark:'#7a0f26',lip:'#ffd0da'}];
const reducedMotion=()=>!!store.profile?.settings?.reducedMotion;
function hashRandom(seed){let a=seed>>>0||1;return ()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296;};}
function layerCanvas(W,H){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(W));c.height=Math.max(1,Math.round(H));return c;}
function quad(x,pts){x.beginPath();x.moveTo(pts[0].x,pts[0].y);for(const p of pts.slice(1))x.lineTo(p.x,p.y);x.closePath();}
// Back wall: brick, wood wainscot, a lit back bar with bottles and pendant lamps.
function drawRoom(x,W,H,{wallBottom,accent}){
 const rand=hashRandom(Math.round(W*7+H*13));
 const wall=x.createLinearGradient(0,0,0,wallBottom);wall.addColorStop(0,'#1a1310');wall.addColorStop(1,'#2b1d15');x.fillStyle=wall;x.fillRect(0,0,W,H);
 const bh=clamp(H*.022,7,14),bw=bh*2.6;for(let row=0,y=0;y<wallBottom;row++,y+=bh){for(let bx=(row%2)*-bw/2;bx<W;bx+=bw){const v=rand();x.fillStyle=`rgba(${120+v*40|0},${48+v*20|0},${32+v*12|0},${.22+v*.12})`;x.fillRect(bx+1,y+1,bw-2,bh-2);}}
 const shelfTop=wallBottom*.36,shelfH=wallBottom*.5;
 const glow=x.createLinearGradient(0,shelfTop,0,shelfTop+shelfH);glow.addColorStop(0,'#3b2414');glow.addColorStop(.5,'#6b3e1c');glow.addColorStop(1,'#2a170c');x.fillStyle=glow;x.fillRect(W*.06,shelfTop,W*.88,shelfH);
 const mirror=x.createLinearGradient(0,shelfTop,W,shelfTop+shelfH);mirror.addColorStop(0,'#ffffff08');mirror.addColorStop(.45,'#ffffff1c');mirror.addColorStop(.55,'#ffffff05');mirror.addColorStop(1,'#ffffff10');x.fillStyle=mirror;x.fillRect(W*.06,shelfTop,W*.88,shelfH);
 const shelves=[shelfTop+shelfH*.45,shelfTop+shelfH*.95];
 for(const sy of shelves){const shelfLine=Math.max(3,bh*.45);
  for(let bx=W*.08;bx<W*.92;){const bwid=clamp(H*.016,5,11)*(0.8+rand()*.6),bht=shelfH*(.26+rand()*.16),hue=[30,95,140,45,0,200][rand()*6|0],light=hue===0?82:28+rand()*22;
   const g=x.createLinearGradient(bx,0,bx+bwid,0);g.addColorStop(0,`hsla(${hue},60%,${light*.6}%,.95)`);g.addColorStop(.35,`hsla(${hue},70%,${Math.min(92,light+25)}%,.95)`);g.addColorStop(1,`hsla(${hue},60%,${light*.5}%,.95)`);x.fillStyle=g;
   const bodyTop=sy-bht*.62;x.beginPath();x.moveTo(bx,sy);x.lineTo(bx,bodyTop+bwid*.3);x.quadraticCurveTo(bx,bodyTop,bx+bwid*.35,bodyTop-bwid*.2);x.lineTo(bx+bwid*.35,sy-bht);x.lineTo(bx+bwid*.65,sy-bht);x.lineTo(bx+bwid*.65,bodyTop-bwid*.2);x.quadraticCurveTo(bx+bwid,bodyTop,bx+bwid,bodyTop+bwid*.3);x.lineTo(bx+bwid,sy);x.closePath();x.fill();
   if(rand()<.6){x.fillStyle='#f3e6c8cc';x.fillRect(bx+bwid*.12,sy-bht*.38,bwid*.76,bht*.16);}
   bx+=bwid+2+rand()*5;}
  x.fillStyle='#4a2c16';x.fillRect(W*.05,sy,W*.9,shelfLine);x.fillStyle='#d9a2602a';x.fillRect(W*.05,sy,W*.9,1);}
 x.strokeStyle='#5c3a1f';x.lineWidth=Math.max(3,bh*.5);x.strokeRect(W*.06,shelfTop,W*.88,shelfH);
 const wains=x.createLinearGradient(0,wallBottom*.9,0,H);wains.addColorStop(0,'#3a2414');wains.addColorStop(1,'#140c07');x.fillStyle=wains;x.fillRect(0,wallBottom*.9,W,H-wallBottom*.9);
 x.fillStyle='#00000040';for(let px=W*.04;px<W;px+=W*.16)x.fillRect(px,wallBottom*.93,2,H);
 x.fillStyle=accent+'22';x.fillRect(0,wallBottom*.9,W,2);
 for(const lx of [.2,.5,.8]){const cx=W*lx,shade=clamp(W*.035,12,30),cy=wallBottom*.2;x.strokeStyle='#0b0705';x.lineWidth=2;x.beginPath();x.moveTo(cx,0);x.lineTo(cx,cy);x.stroke();
  const lg=x.createRadialGradient(cx,cy+shade*.5,2,cx,cy+shade*.5,shade*5);lg.addColorStop(0,'#ffd48a55');lg.addColorStop(1,'#ffd48a00');x.fillStyle=lg;x.fillRect(cx-shade*5,cy-shade*4,shade*10,shade*10);
  x.fillStyle='#1d3b2a';x.beginPath();x.moveTo(cx-shade*.35,cy);x.lineTo(cx+shade*.35,cy);x.lineTo(cx+shade,cy+shade*.65);x.lineTo(cx-shade,cy+shade*.65);x.closePath();x.fill();
  x.fillStyle='#fff3c8';x.beginPath();x.ellipse(cx,cy+shade*.65,shade*.8,shade*.18,0,0,Math.PI*2);x.fill();}
}
// Table top with planks, varnish, trim, front face and legs. `project` maps world -> screen.
function drawTableTop(x,W,H,project,{halfWidth=1.45,depth=4,logo='PADDY’S',lineZ=null}){
 const at=(px,pz)=>project({x:px,z:pz,y:0},W,H);
 const c=[at(-halfWidth,0),at(halfWidth,0),at(halfWidth,depth),at(-halfWidth,depth)];
 const thick=clamp(H*.035,8,22);
 x.fillStyle='#00000066';x.beginPath();x.ellipse(W/2,c[0].y+thick*1.6,(c[1].x-c[0].x)*.55,thick*1.4,0,0,Math.PI*2);x.fill();
 x.fillStyle='#24140b';for(const p of [c[0],c[1]]){const lx=clamp(p.x+(p.x<W/2?thick:-thick),thick,W-thick*2);x.fillRect(lx-thick*.35,p.y+thick,thick*.7,H);}
 const face=x.createLinearGradient(0,c[0].y,0,c[0].y+thick);face.addColorStop(0,'#6d4325');face.addColorStop(1,'#2f1a0d');x.fillStyle=face;quad(x,[c[0],c[1],{x:c[1].x,y:c[1].y+thick},{x:c[0].x,y:c[0].y+thick}]);x.fill();
 const top=x.createLinearGradient(0,c[3].y,0,c[0].y);top.addColorStop(0,'#5a3519');top.addColorStop(.55,'#8a5a30');top.addColorStop(1,'#a06a3a');x.fillStyle=top;quad(x,c);x.fill();
 x.save();quad(x,c);x.clip();
 const planks=7;for(let i=1;i<planks;i++){const px=-halfWidth+i*2*halfWidth/planks,a=at(px,0),b=at(px,depth);x.strokeStyle='#2b170a88';x.lineWidth=Math.max(1,W*.002);x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();x.strokeStyle='#e0a86422';x.beginPath();x.moveTo(a.x+1.5,a.y);x.lineTo(b.x+1,b.y);x.stroke();}
 const rand=hashRandom(Math.round(W+H*3));for(let i=0;i<60;i++){const px=-halfWidth+rand()*2*halfWidth,pz=rand()*depth,len=.2+rand()*.6,a=at(px,pz),b=at(px+(rand()-.5)*.03,Math.min(depth,pz+len));x.strokeStyle=`rgba(40,20,8,${.08+rand()*.12})`;x.lineWidth=1;x.beginPath();x.moveTo(a.x,a.y);x.quadraticCurveTo((a.x+b.x)/2+(rand()-.5)*6,(a.y+b.y)/2,b.x,b.y);x.stroke();}
 for(let i=0;i<5;i++){const p=at(-halfWidth*.8+rand()*halfWidth*1.6,.4+rand()*(depth-.8)),r=Math.abs(at(.16,0).x-at(0,0).x)*p.scale;x.strokeStyle='#2a14081f';x.lineWidth=Math.max(1.5,r*.12);x.beginPath();x.ellipse(p.x,p.y,r,r*.4,0,0,Math.PI*2);x.stroke();}
 if(logo){const p=at(0,depth*.47),r=Math.abs(at(.95,0).x-at(0,0).x)*p.scale;x.save();x.translate(p.x,p.y);x.scale(1,.42);x.strokeStyle='#f3d38a2e';x.lineWidth=Math.max(2,r*.05);x.beginPath();x.arc(0,0,r,0,Math.PI*2);x.stroke();x.beginPath();x.arc(0,0,r*.82,0,Math.PI*2);x.stroke();x.fillStyle='#f3d38a30';x.font=`bold ${r*.42}px Georgia`;x.textAlign='center';x.textBaseline='middle';x.fillText(logo,0,0);x.restore();}
 if(lineZ!==null){const a=at(-halfWidth,lineZ),b=at(halfWidth,lineZ);x.strokeStyle='#fff3d044';x.setLineDash([8,7]);x.lineWidth=2;x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();x.setLineDash([]);}
 const gloss=x.createLinearGradient(c[0].x,0,c[1].x,0);gloss.addColorStop(0,'#ffffff00');gloss.addColorStop(.42,'#ffe9c010');gloss.addColorStop(.5,'#ffe9c02a');gloss.addColorStop(.58,'#ffe9c010');gloss.addColorStop(1,'#ffffff00');x.fillStyle=gloss;x.fillRect(0,0,W,H);
 for(const lx of [-.9,0,.9]){const p=at(lx*halfWidth*.75,depth*.5),r=Math.abs(at(1.2,0).x-at(0,0).x)*p.scale;const g=x.createRadialGradient(p.x,p.y,1,p.x,p.y,r);g.addColorStop(0,'#ffd99033');g.addColorStop(1,'#ffd99000');x.fillStyle=g;x.fillRect(p.x-r,p.y-r,r*2,r*2);}
 x.restore();
 x.strokeStyle='#e9cf93';x.lineWidth=clamp(W*.006,2.5,5);quad(x,c);x.stroke();x.strokeStyle='#3a210f';x.lineWidth=1;x.beginPath();x.moveTo(c[0].x,c[0].y+thick);x.lineTo(c[1].x,c[1].y+thick);x.stroke();
}
function vignette(x,W,H){const g=x.createRadialGradient(W/2,H*.55,Math.min(W,H)*.35,W/2,H*.55,Math.max(W,H)*.78);g.addColorStop(0,'#00000000');g.addColorStop(1,'#000000a0');x.fillStyle=g;x.fillRect(0,0,W,H);}
// The static scene is drawn once per canvas size into an offscreen layer.
function pubScene(){let layer=null,key='';return (x,W,H,opts)=>{const k=W+'x'+H;if(k!==key||!layer){key=k;layer=layerCanvas(W,H);const lx=layer.getContext('2d');drawRoom(lx,W,H,opts);drawTableTop(lx,W,H,opts.project,opts);vignette(lx,W,H);}x.drawImage(layer,0,0);};}
// Flickering neon title.
function neonSign(x,W,H,text,sub,{y,color='#5dff8c',maxSize=34,t=0}){
 const size=Math.min(maxSize,W*.085,H*.07),flick=reducedMotion()?1:(Math.sin(t*23)>.97||Math.sin(t*3.1+1)>.995?.45:1);
 x.save();x.textAlign='center';x.textBaseline='middle';x.font=`900 ${size}px "Trebuchet MS",Arial`;
 const w=x.measureText(text).width+size*1.1,h=size*(sub?1.85:1.4);x.fillStyle='#0b0d0bcc';x.strokeStyle='#2a2f2b';x.lineWidth=2;x.beginPath();x.roundRect?.(W/2-w/2,y-size*.7,w,h,size*.3);x.fill();x.stroke();
 x.shadowColor=color;x.shadowBlur=size*.9*flick;x.fillStyle=flick<1?color+'88':'#f3fff6';x.strokeStyle=color;x.lineWidth=Math.max(1.5,size*.08);x.strokeText(text,W/2,y);x.fillText(text,W/2,y);
 if(sub){x.font=`700 ${size*.38}px "Trebuchet MS",Arial`;x.shadowColor='#ffb34a';x.shadowBlur=size*.5;x.fillStyle='#ffe2a8';x.fillText(sub,W/2,y+size*.78);}
 x.restore();
}
// Upright red-solo-style cup. rimY/baseY are screen y; r is rim radius in px.
function drawSoloCup(x,cx,rimY,baseY,r,player,{alpha=1,beer=true,glow=0}={}){
 const col=PLAYER_CUPS[player],rb=r*.7,e=.34,h=baseY-rimY;
 x.save();x.globalAlpha=alpha;
 x.fillStyle='#00000055';x.beginPath();x.ellipse(cx+r*.12,baseY+r*.05,rb*1.25,rb*e*1.25,0,0,Math.PI*2);x.fill();
 if(glow){x.shadowColor='#fff3b0';x.shadowBlur=glow;}
 const g=x.createLinearGradient(cx-r,0,cx+r,0);g.addColorStop(0,col.dark);g.addColorStop(.22,col.light);g.addColorStop(.38,col.base);g.addColorStop(.8,col.base);g.addColorStop(1,col.dark);x.fillStyle=g;
 x.beginPath();x.moveTo(cx-r,rimY);x.lineTo(cx-rb,baseY);x.ellipse(cx,baseY,rb,rb*e,0,Math.PI,0,true);x.lineTo(cx+r,rimY);x.closePath();x.fill();x.shadowBlur=0;
 x.strokeStyle='#00000038';x.lineWidth=Math.max(1,r*.06);
 for(const t of [.62,.72,.82]){const rr=r+(rb-r)*t,yy=rimY+h*t;x.beginPath();x.ellipse(cx,yy,rr,rr*e,0,0,Math.PI);x.stroke();}
 x.strokeStyle='#ffffff2a';for(const t of [.18,.3]){const rr=r+(rb-r)*t,yy=rimY+h*t;x.beginPath();x.ellipse(cx,yy,rr,rr*e,0,.15,Math.PI-.15);x.stroke();}
 x.fillStyle='#ffffff40';x.beginPath();x.moveTo(cx-r*.62,rimY+h*.08);x.lineTo(cx-rb*.6,baseY-h*.1);x.lineTo(cx-rb*.42,baseY-h*.1);x.lineTo(cx-r*.44,rimY+h*.08);x.closePath();x.fill();
 const inner=x.createLinearGradient(0,rimY-r*e,0,rimY+r*e);inner.addColorStop(0,'#c9c3b8');inner.addColorStop(1,'#fbf7ef');x.fillStyle=inner;x.beginPath();x.ellipse(cx,rimY,r,r*e,0,0,Math.PI*2);x.fill();
 if(beer){const br=r*.86,by=rimY+r*e*.25;const bg=x.createRadialGradient(cx-br*.3,by-br*e*.3,1,cx,by,br);bg.addColorStop(0,'#ffd36b');bg.addColorStop(.7,'#d98a1c');bg.addColorStop(1,'#9c5a0d');x.fillStyle=bg;x.beginPath();x.ellipse(cx,by,br,br*e*.9,0,0,Math.PI*2);x.fill();x.strokeStyle='#fff6dccc';x.lineWidth=Math.max(1.2,r*.1);x.beginPath();x.ellipse(cx,by,br*.94,br*e*.84,0,0,Math.PI*2);x.stroke();x.fillStyle='#ffffffaa';x.beginPath();x.ellipse(cx-br*.35,by-br*e*.25,br*.18,br*e*.18,0,0,Math.PI*2);x.fill();}
 x.strokeStyle=col.lip;x.lineWidth=Math.max(1.6,r*.13);x.beginPath();x.ellipse(cx,rimY,r,r*e,0,0,Math.PI*2);x.stroke();
 x.strokeStyle='#ffffff99';x.lineWidth=Math.max(1,r*.05);x.beginPath();x.ellipse(cx,rimY-r*.02,r*.98,r*e*.98,0,Math.PI*1.1,Math.PI*1.6);x.stroke();
 x.restore();
}
// Ping-pong ball with a soft shadow and the player's colour ring.
function drawBall(x,cx,cy,r,player){const g=x.createRadialGradient(cx-r*.35,cy-r*.4,r*.1,cx,cy,r);g.addColorStop(0,'#ffffff');g.addColorStop(.6,'#f4efe2');g.addColorStop(1,'#c9bfa8');x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();x.strokeStyle=PLAYER_CUPS[player].light;x.lineWidth=Math.max(1.5,r*.14);x.stroke();}
// Shaded truncated-cone cup from 32 projected points (16 rim, 16 base) with back-face culling.
function drawCup3D(x,points,angle,player,{inside='#f2ece0',ridges=[.14,.22,.3]}={}){
 const col=PLAYER_CUPS[player],n=16,area=pts=>{let a=0;for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length];a+=p.x*q.y-q.x*p.y;}return a;};
 const rim=points.slice(0,n),base=points.slice(n,n*2),light={x:-.45,y:.75,z:-.48};
 const sideVisible=[];for(let i=0;i<n;i++){const j=(i+1)%n;sideVisible.push(area([rim[i],rim[j],base[j],base[i]])<0);}
 const rimFront=area(rim)<0,baseFront=!rimFront;
 for(let i=0;i<n;i++){if(!sideVisible[i])continue;const j=(i+1)%n,a=(i+.5)/n*Math.PI*2,nx=Math.cos(a),nz=Math.sin(a),wy=-nz*Math.sin(angle),wz=nz*Math.cos(angle),lit=clamp(.38+.75*Math.max(0,nx*light.x+wy*light.y+wz*light.z),0,1.15);
  x.fillStyle=`hsl(${player===0?208:347} ${player===0?72:70}% ${18+lit*36}%)`;quad(x,[rim[i],rim[j],base[j],base[i]]);x.fill();x.strokeStyle=x.fillStyle;x.lineWidth=1;x.stroke();}
 const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 x.lineWidth=1.3;x.strokeStyle='#00000045';for(const t of ridges){x.beginPath();for(let i=0;i<n;i++){if(!sideVisible[i])continue;const j=(i+1)%n,p=lerp(base[i],rim[i],t),q=lerp(base[j],rim[j],t);x.moveTo(p.x,p.y);x.lineTo(q.x,q.y);}x.stroke();}
 x.strokeStyle='#ffffff26';for(const t of [.72,.84]){x.beginPath();for(let i=0;i<n;i++){if(!sideVisible[i])continue;const j=(i+1)%n,p=lerp(base[i],rim[i],t),q=lerp(base[j],rim[j],t);x.moveTo(p.x,p.y);x.lineTo(q.x,q.y);}x.stroke();}
 if(baseFront){x.fillStyle=col.dark;quad(x,base);x.fill();x.strokeStyle=col.base;x.lineWidth=1.5;x.stroke();}
 if(rimFront){x.fillStyle=inside;quad(x,rim);x.fill();x.fillStyle='#00000022';quad(x,base.map((p,i)=>lerp(rim[i],p,.35)));x.fill();}
 x.strokeStyle=col.lip;x.lineWidth=3;x.beginPath();for(let i=0;i<n;i++){const j=(i+1)%n;if(rimFront||sideVisible[i]){x.moveTo(rim[i].x,rim[i].y);x.lineTo(rim[j].x,rim[j].y);}}x.stroke();
}
// Shared juice: particles, rings, floating text and screen shake.
function makeFx(){
 const parts=[],pops=[],rings=[];let shake=0,shakeMax=1;
 return {
  burst(cx,cy,{count=20,colors=['#ffd36b','#fff6dc','#e8962a'],speed=180,up=120,size=3,gravity=520,life=.8}={}){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=speed*(.3+Math.random()*.7);parts.push({x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.6-up*(.5+Math.random()),r:size*(.5+Math.random()),c:colors[i%colors.length],life:life*(.6+Math.random()*.6),age:0,g:gravity,spin:Math.random()*6,rect:false});}},
  confetti(W,H,count=60){const colors=['#ff5f8f','#5fd0ff','#ffe066','#7dff8a','#c58bff','#ffffff'];for(let i=0;i<count;i++)parts.push({x:Math.random()*W,y:-10-Math.random()*H*.3,vx:(Math.random()-.5)*80,vy:60+Math.random()*120,r:3+Math.random()*4,c:colors[i%colors.length],life:2.2+Math.random(),age:0,g:60,spin:Math.random()*10,rect:true});},
  ring(cx,cy,r,color='#fff3c0',squash=.38){rings.push({x:cx,y:cy,r,color,squash,age:0});},
  pop(text,cx,cy,{color='#fff3c0',size=34,life=1.1}={}){pops.push({text,x:cx,y:cy,color,size,life,age:0});},
  shake(amount=8,time=.3){if(reducedMotion())return;shake=Math.max(shake,time);shakeMax=amount;},
  offset(){if(shake<=0)return {x:0,y:0};const k=shake*shakeMax*3;return {x:(Math.random()-.5)*k,y:(Math.random()-.5)*k};},
  step(dt){shake=Math.max(0,shake-dt);for(const p of parts){p.age+=dt;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.spin+=dt*8;}for(const r of rings)r.age+=dt;for(const p of pops)p.age+=dt;for(const list of [parts,rings,pops])for(let i=list.length-1;i>=0;i--)if(list[i].age>=(list[i].life||.6))list.splice(i,1);},
  draw(x){
   for(const r of rings){const k=r.age/.6;x.strokeStyle=r.color;x.globalAlpha=1-k;x.lineWidth=3*(1-k)+1;x.beginPath();x.ellipse(r.x,r.y,r.r*(1+k*1.6),r.r*r.squash*(1+k*1.6),0,0,Math.PI*2);x.stroke();}
   for(const p of parts){x.globalAlpha=clamp(1-p.age/p.life,0,1);x.fillStyle=p.c;if(p.rect){x.save();x.translate(p.x,p.y);x.rotate(p.spin);x.fillRect(-p.r,-p.r*.5,p.r*2,p.r);x.restore();}else{x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2);x.fill();}}
   x.globalAlpha=1;
   for(const p of pops){const k=p.age/p.life,grow=k<.15?.6+k/.15*.55:1.15-Math.min(.15,(k-.15)*.4),size=p.size*grow;x.save();x.globalAlpha=k>.7?1-(k-.7)/.3:1;x.translate(p.x,p.y-k*30);x.rotate(-.06);x.font=`900 ${size}px "Trebuchet MS",Arial`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=size*.18;x.strokeStyle='#1a0d06';x.strokeText(p.text,0,0);x.fillStyle=p.color;x.fillText(p.text,0,0);x.restore();}
  },
  get busy(){return parts.length+pops.length+rings.length>0;}
 };
}
// Drag guide: a chunky arrow showing direction and power (0..1).
function powerArrow(x,from,to,power){const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy);if(len<4)return;const ux=dx/len,uy=dy/len,w=clamp(len*.09,5,12),hue=120-power*120;
 x.save();x.globalAlpha=.9;x.fillStyle=`hsl(${hue} 90% 55%)`;x.strokeStyle='#1a0d06';x.lineWidth=2.5;x.beginPath();const head=Math.min(len*.4,w*3);const bx=to.x-ux*head,by=to.y-uy*head;
 x.moveTo(from.x-uy*w*.5,from.y+ux*w*.5);x.lineTo(bx-uy*w*.5,by+ux*w*.5);x.lineTo(bx-uy*w*1.4,by+ux*w*1.4);x.lineTo(to.x,to.y);x.lineTo(bx+uy*w*1.4,by-ux*w*1.4);x.lineTo(bx+uy*w*.5,by-ux*w*.5);x.lineTo(from.x+uy*w*.5,from.y-ux*w*.5);x.closePath();x.stroke();x.fill();x.restore();}
// Animated "flick up" chevrons for the idle aim state.
function flickHint(x,cx,cy,size,t){if(reducedMotion())t=0;x.save();x.lineWidth=Math.max(3,size*.12);x.lineCap='round';x.lineJoin='round';for(let i=0;i<3;i++){const k=((t*1.2+i/3)%1),y=cy-k*size*2.2;x.globalAlpha=Math.sin(k*Math.PI)*.85;x.strokeStyle='#fff3c0';x.beginPath();x.moveTo(cx-size*.45,y+size*.25);x.lineTo(cx,y-size*.15);x.lineTo(cx+size*.45,y+size*.25);x.stroke();}x.restore();}
// Small label plate on the wall (turn banner, chalk text).
function plate(x,cx,cy,text,{size=14,color='#f7d893',bg='#120b07d9',border='#7a5530'}={}){x.save();x.font=`800 ${size}px "Trebuchet MS",Arial`;x.textAlign='center';x.textBaseline='middle';const w=x.measureText(text).width+size*1.3,h=size*1.75;x.fillStyle=bg;x.strokeStyle=border;x.lineWidth=1.5;x.beginPath();x.roundRect?.(cx-w/2,cy-h/2,w,h,h*.35);x.fill();x.stroke();x.fillStyle=color;x.fillText(text,cx,cy+1);x.restore();return {x:cx-w/2,y:cy-h/2,w,h};}
Object.assign(exports,{PLAYER_CUPS,pubScene,neonSign,drawSoloCup,drawBall,drawCup3D,makeFx,powerArrow,flickHint,plate,reducedMotion});
