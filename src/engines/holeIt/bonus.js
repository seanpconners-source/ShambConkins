// Hole.it "Bravo!" bonus card, copied from the real game's level-clear screen (owner's Fold video, Levels 4-6): the
// board dims, "Bravo!" drops in, a pile of gold coins with "20" sits over a little black hole, and under it a curved
// bar of five tiles x2 x3 x5 x3 x2 with a white arrow sliding back and forth under them. In the real game the bigger
// reward needs an advert; here you simply get what the arrow is on when you tap Collect (20 coins x that tile).
// Drawn in the HUD's 1080-wide units (u = screen width / 1080), like the rest of the Hole.it HUD.
const MULTS=[2,3,5,3,2],TILE_COL=['#e8344a','#ff8a1e','#5bd12a','#ff8a1e','#e8344a'],BASE=20,PERIOD=2;
// arrow position -1..1 (a triangle wave: steady speed, turns at the ends) and the tile it is over
const arrowAt=t=>{const u=((t/PERIOD)%1+1)%1;return u<.5?-1+u*4:3-u*4;};
const multAt=p=>MULTS[Math.max(0,Math.min(4,Math.floor((p+1)/2*5)))];

function createBonus(){let t=0,stopped=null,collected=false,done=0;
 const value=()=>BASE*multAt(stopped??arrowAt(t));
 function layout(W,H){const u=Math.min(W,H*.95)/1080,cy=H*.36;return {u,cx:W/2,title:cy-250*u,coins:cy-40*u,bar:cy+150*u,btn:{x:W/2-170*u,y:cy+330*u,w:340*u,h:110*u}};}
 function rr(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath();}
 function text(x,s,X,Y,size,fill,stroke,lw,ang=0){x.save();x.translate(X,Y);x.rotate(ang);x.font=`900 ${size}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';
  if(lw){x.lineWidth=lw;x.strokeStyle=stroke;x.strokeText(s,0,0);}x.fillStyle=fill;x.fillText(s,0,0);x.restore();}
 function coin(x,cx,cy,r,face){const g=x.createLinearGradient(cx-r,cy-r,cx+r,cy+r);g.addColorStop(0,'#fff3a0');g.addColorStop(.5,'#ffc61e');g.addColorStop(1,'#d88a06');
  x.fillStyle='#b26a04';x.beginPath();x.ellipse(cx,cy+r*.16,r,r*(face?1:.42),0,0,7);x.fill();x.fillStyle=g;x.beginPath();x.ellipse(cx,cy,r,r*(face?1:.42),0,0,7);x.fill();
  if(face){x.strokeStyle='#e8a20e';x.lineWidth=r*.12;x.beginPath();x.arc(cx,cy,r*.72,0,7);x.stroke();x.fillStyle='#e89a0a';x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r*.2:r*.46;x.lineTo(cx+Math.cos(a)*q,cy+Math.sin(a)*q);}x.closePath();x.fill();}}
 function draw(x,W,H,dt,players){t+=stopped===null?dt:0;done+=collected?dt:0;const L=layout(W,H),u=L.u;
  // little black hole under the coins
  const hr=120*u;x.fillStyle='#1a1d26';x.beginPath();x.ellipse(L.cx,L.coins+70*u,hr*1.15,hr*.62,0,0,7);x.fill();const hg=x.createRadialGradient(L.cx,L.coins+70*u,0,L.cx,L.coins+70*u,hr);hg.addColorStop(0,'#000');hg.addColorStop(1,'#05060a');x.fillStyle=hg;x.beginPath();x.ellipse(L.cx,L.coins+74*u,hr,hr*.5,0,0,7);x.fill();
  // coin pile with a sparkle, "20" beside it (the collected total once tapped)
  const bob=Math.sin(t*3)*4*u;for(const [dx,dy,r,f] of [[-60,40,52,0],[40,46,50,0],[-10,26,54,0],[-40,-6,50,0],[34,6,50,0],[0,-30,52,0],[-30,-62,46,0],[30,-56,46,0],[8,40,70,1]])coin(x,L.cx+dx*u,L.coins+dy*u+bob,r*u,f);
  const tw=(Math.sin(t*6)+1)/2;x.fillStyle=`rgba(255,255,255,${.5+tw*.5})`;for(const [dx,dy,s] of [[-80,-80,14],[70,-90,10],[100,10,8]]){x.save();x.translate(L.cx+dx*u,L.coins+dy*u);x.rotate(Math.PI/4);x.fillRect(-s*u/2,-s*u/2,s*u,s*u);x.restore();}
  text(x,collected?String(value()):String(BASE),L.cx+110*u,L.coins+60*u+bob,70*u,'#fff','#3a2a06',12*u);
  // curved multiplier bar: wooden base, five tiles, the middle one raised
  const span=560*u,tile=104*u,curve=y=>L.bar+(y*y)*30*u;x.fillStyle='#c76a14';x.strokeStyle='#6b3205';x.lineWidth=6*u;x.beginPath();
  for(let i=0;i<=20;i++){const p=-1+i/10,X=L.cx+p*span/2*1.06,Y=curve(p)+36*u;i?x.lineTo(X,Y):x.moveTo(X,Y);}for(let i=20;i>=0;i--){const p=-1+i/10,X=L.cx+p*span/2*1.06,Y=curve(p)+70*u;x.lineTo(X,Y);}x.closePath();x.fill();x.stroke();
  MULTS.forEach((m,i)=>{const p=-.8+i*.4,X=L.cx+p*span/2,Y=curve(p)-(i===2?14*u:0),hot=multAt(stopped??arrowAt(t))===m&&Math.abs(((stopped??arrowAt(t))+1)/2*5-(i+.5))<.5;
   x.save();x.translate(X,Y);x.rotate(p*.32);const s=hot?1.1:1;x.scale(s,s);rr(x,-tile/2,-tile/2,tile,tile,16*u);x.fillStyle='#4a2004';x.fill();rr(x,-tile/2+5*u,-tile/2+5*u,tile-10*u,tile-14*u,13*u);x.fillStyle=TILE_COL[i];x.fill();
   rr(x,-tile/2+12*u,-tile/2+10*u,tile-24*u,tile*.32,10*u);x.fillStyle='#ffffff40';x.fill();text(x,'X'+m,0,2*u,46*u,'#fff','#3a1a06',9*u);x.restore();});
  // the arrow under the tiles (white with a green edge, like the real one)
  const p=stopped??arrowAt(t),ax=L.cx+p*span/2,ay=curve(p)+78*u;x.save();x.translate(ax,ay);x.rotate(p*.32);x.fillStyle='#fff';x.strokeStyle='#2d8a1e';x.lineWidth=7*u;x.lineJoin='round';
  x.beginPath();x.moveTo(0,-36*u);x.lineTo(30*u,16*u);x.lineTo(-30*u,16*u);x.closePath();x.stroke();x.fill();x.restore();
  // Collect button: green, with the coin and the live amount
  const b=L.btn,pulse=collected?1:1+Math.sin(t*5)*.03;x.save();x.translate(b.x+b.w/2,b.y+b.h/2);x.scale(pulse,pulse);x.translate(-b.w/2,-b.h/2);
  rr(x,0,0,b.w,b.h,b.h*.3);x.fillStyle='#f6c531';x.fill();rr(x,5*u,5*u,b.w-10*u,b.h-10*u,b.h*.26);const g=x.createLinearGradient(0,0,0,b.h);g.addColorStop(0,'#74e85a');g.addColorStop(1,'#25a52e');x.fillStyle=g;x.fill();
  rr(x,14*u,10*u,b.w-28*u,b.h*.3,b.h*.15);x.fillStyle='#ffffff40';x.fill();coin(x,b.w*.24,b.h/2,30*u,1);text(x,collected?'+'+value():`Collect ${value()}`,b.w*.6,b.h/2+2*u,44*u,'#fff','#1d6b21',9*u);x.restore();
  if(players)text(x,players,L.cx,b.y+b.h+60*u,32*u,'#c9d0ff','#141a33',7*u);}
 function tap(px,py,W,H){const b=layout(W,H).btn;if(collected||px<b.x-10||px>b.x+b.w+10||py<b.y-10||py>b.y+b.h+10)return false;stopped=arrowAt(t);collected=true;return true;}
 return {draw,tap,collect(){if(!collected){stopped=arrowAt(t);collected=true;}},get collected(){return collected;},get doneT(){return done;},get value(){return value();},get mult(){return multAt(stopped??arrowAt(t));}};}
Object.assign(exports,{createBonus,arrowAt,multAt,MULTS,BASE});
