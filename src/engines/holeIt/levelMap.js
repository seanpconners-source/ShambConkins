// Hole.it level screen, drawn like the real game's pre-level screen (owner's Fold video): a sunny meadow with a lake,
// a tree and a blue delivery truck (the picking player's face in the driver's window instead of the bunny mascot),
// the grey hole in the grass, the coin counter top-left and the big green "Level N" button. Like Bricks Breaker
// Quest's stage map it also lets player 1 choose any cleared level: a row of level bubbles under the button (drag to
// scroll, cleared ones show their best stars, the next level glows gold, later ones are padlocked). Pressing the
// button drops that level's goal props from the sky into the hole, as in the real game, then the level starts.
// Coins won on the last Bravo! card pop out of the hole when the screen opens. Laid out in 1080-wide units.
const BUB=128,GAP=34,STEP=BUB+GAP;
// Stars for a clear, by how much of the clock is left (the real game has none; the level bubbles show them).
const starsFor=(left,time)=>left>=time*2/3?3:left>=time/3?2:1;

// opts: W(),H(),top,cur,stars,coins,coinPop,who,head(x,cx,cy,size),info(n)->{thumbs:[canvas],score},h:{rr,outlined,drawStar,lockIcon},onPick(n)
function createLevelMap(o){const {h}=o;
 let sel=o.cur,scroll=null,drag=null,picked=0,toast=null,t=0,drop=null,coinT=o.coinPop?0:-1;
 const cache=new Map(),infoFor=n=>{if(!cache.has(n)){let v=null;try{v=o.info(n);}catch(e){console.warn(e);}cache.set(n,v);}return cache.get(n);};
 const last=()=>o.cur+30;
 const L=()=>{const W=o.W(),H=o.H(),u=Math.min(W,H*.95)/1080,holeY=H*.6,btnH=Math.max(54,150*u),btnW=Math.max(170,360*u);
  return {W,H,u,holeY,y0:holeY-750*u,btn:{x:W/2-btnW/2,y:H*.76-btnH/2,w:btnW,h:btnH},stripY:Math.min(H-Math.max(72,128*u),H*.76+btnH/2+Math.max(54,118*u))};};
 const bubX=(n,l)=>l.W/2+(n-1)*STEP*l.u-scroll;
 const scrollFor=(n,l)=>(n-1)*STEP*l.u;
 // ---- scenery ----
 function cloud(x,cx,cy,s){x.fillStyle='#ffffffd8';for(const [dx,dy,r] of [[-60,10,46],[0,-14,62],[64,6,48],[110,18,34],[-104,22,30]]){x.beginPath();x.arc(cx+dx*s,cy+dy*s,r*s,0,7);x.fill();}}
 function tree(x,l){const u=l.u,bx=l.W/2-300*u,by=l.y0+560*u;const g=x.createLinearGradient(bx-30*u,0,bx+30*u,0);g.addColorStop(0,'#7a4a22');g.addColorStop(1,'#a8693a');x.fillStyle=g;
  x.beginPath();x.moveTo(bx-34*u,by);x.lineTo(bx-14*u,l.y0-60*u);x.lineTo(bx+14*u,l.y0-60*u);x.lineTo(bx+40*u,by);x.closePath();x.fill();
  x.strokeStyle='#8a5a2a';x.lineWidth=14*u;x.lineCap='round';x.beginPath();x.moveTo(bx,l.y0+80*u);x.lineTo(bx+120*u,l.y0-10*u);x.stroke();x.lineCap='butt';
  for(const [dx,dy,r,c] of [[-60,-90,170,'#3f8f2a'],[90,-60,140,'#4aa032'],[-200,-30,120,'#3a8526'],[30,-170,150,'#55ad38'],[180,40,90,'#4aa032']]){x.fillStyle=c;x.beginPath();x.arc(bx+dx*u,l.y0+dy*u,r*u,0,7);x.fill();}}
 function truck(x,l){const u=l.u,X=l.W/2-90*u,Y=l.y0+300*u;x.save();x.translate(X,Y);
  x.fillStyle='#00000030';x.beginPath();x.ellipse(170*u,322*u,300*u,34*u,0,0,7);x.fill();
  // box body with ribs
  const bg=x.createLinearGradient(0,0,0,300*u);bg.addColorStop(0,'#3f86e0');bg.addColorStop(1,'#2a5fb0');x.fillStyle=bg;h.rr(x,90*u,0,350*u,270*u,18*u);x.fill();
  x.strokeStyle='#2350a0';x.lineWidth=5*u;for(let i=0;i<14;i++){const xx=120*u+i*22*u;x.beginPath();x.moveTo(xx,20*u);x.lineTo(xx,250*u);x.stroke();}
  // cab
  const cg=x.createLinearGradient(0,60*u,0,300*u);cg.addColorStop(0,'#3a7fd8');cg.addColorStop(1,'#2858a8');x.fillStyle=cg;x.beginPath();x.moveTo(-40*u,300*u);x.lineTo(-40*u,140*u);x.quadraticCurveTo(-30*u,70*u,40*u,60*u);x.lineTo(110*u,60*u);x.lineTo(110*u,300*u);x.closePath();x.fill();
  x.fillStyle='#9fd4ff';h.rr(x,-14*u,84*u,104*u,92*u,14*u);x.fill();
  // the picking player leans out of the driver's window
  x.save();h.rr(x,-14*u,84*u,104*u,92*u,14*u);x.clip();o.head?.(x,38*u,128*u,118*u);x.restore();x.strokeStyle='#1e4a90';x.lineWidth=6*u;h.rr(x,-14*u,84*u,104*u,92*u,14*u);x.stroke();
  x.fillStyle='#ffd23a';x.beginPath();x.arc(-34*u,250*u,12*u,0,7);x.fill();x.fillStyle='#d8dde6';h.rr(x,-48*u,282*u,500*u,26*u,10*u);x.fill();x.fillStyle='#e8344a';x.fillRect(430*u,236*u,16*u,26*u);
  for(const wx of [20,330]){x.fillStyle='#1b1d24';x.beginPath();x.arc(wx*u,300*u,46*u,0,7);x.fill();x.fillStyle='#c9ced8';x.beginPath();x.arc(wx*u,300*u,22*u,0,7);x.fill();}
  x.restore();}
 function scenery(x,l){const u=l.u;
  const sky=x.createLinearGradient(0,0,0,l.y0+470*u);sky.addColorStop(0,'#5fb6f0');sky.addColorStop(1,'#bfe6ff');x.fillStyle=sky;x.fillRect(0,0,l.W,l.H);
  cloud(x,l.W/2+260*u,l.y0+60*u,u);cloud(x,l.W/2-120*u,l.y0-160*u,u*.8);
  // far hills, lake, near shore
  x.fillStyle='#7cc06a';x.beginPath();x.moveTo(0,l.y0+400*u);for(let i=0;i<=8;i++)x.quadraticCurveTo(l.W*(i+.5)/8,l.y0+(330+(i%2)*40)*u,l.W*(i+1)/8,l.y0+400*u);x.lineTo(l.W,l.y0+470*u);x.lineTo(0,l.y0+470*u);x.fill();
  const lake=x.createLinearGradient(0,l.y0+420*u,0,l.y0+520*u);lake.addColorStop(0,'#4cb3e8');lake.addColorStop(1,'#8fd6f6');x.fillStyle=lake;x.fillRect(0,l.y0+420*u,l.W,100*u);
  const grass=x.createLinearGradient(0,l.y0+480*u,0,l.H);grass.addColorStop(0,'#8bd63a');grass.addColorStop(.35,'#6cc22a');grass.addColorStop(1,'#4ea81e');x.fillStyle=grass;
  x.beginPath();x.moveTo(0,l.y0+500*u);x.quadraticCurveTo(l.W*.3,l.y0+455*u,l.W*.6,l.y0+490*u);x.quadraticCurveTo(l.W*.85,l.y0+515*u,l.W,l.y0+480*u);x.lineTo(l.W,l.H);x.lineTo(0,l.H);x.fill();
  tree(x,l);truck(x,l);
  // tufts and pink flowers scattered over the field (fixed pattern)
  for(let i=0;i<26;i++){const fx=((i*397)%1000)/1000*l.W,fy=l.y0+560*u+((i*613)%1000)/1000*(l.H-l.y0-560*u);if(Math.abs(fx-l.W/2)<220*u&&Math.abs(fy-l.holeY)<120*u)continue;
   if(i%3){x.strokeStyle='#3f9a1c';x.lineWidth=5*u;x.beginPath();for(const d of [-12,0,12]){x.moveTo(fx+d*u,fy);x.lineTo(fx+d*1.8*u,fy-40*u);}x.stroke();}
   else{x.fillStyle='#ff9ab8';for(let k=0;k<5;k++){const a=k/5*6.283;x.beginPath();x.ellipse(fx+Math.cos(a)*10*u,fy+Math.sin(a)*5*u,9*u,6*u,0,0,7);x.fill();}x.fillStyle='#ffe066';x.beginPath();x.arc(fx,fy,6*u,0,7);x.fill();}}}
 function hole(x,l){const u=l.u,cx=l.W/2,cy=l.holeY,rx=130*u,ry=62*u;
  x.fillStyle='#00000026';x.beginPath();x.ellipse(cx,cy+8*u,rx*1.2,ry*1.25,0,0,7);x.fill();
  const rg=x.createLinearGradient(0,cy-ry,0,cy+ry);rg.addColorStop(0,'#eef1f5');rg.addColorStop(1,'#a3a9b4');x.fillStyle=rg;x.beginPath();x.ellipse(cx,cy,rx*1.16,ry*1.2,0,0,7);x.fill();
  const ig=x.createLinearGradient(0,cy-ry,0,cy+ry);ig.addColorStop(0,'#3a3f48');ig.addColorStop(.5,'#0b0c10');ig.addColorStop(1,'#000');x.fillStyle=ig;x.beginPath();x.ellipse(cx,cy+4*u,rx*.94,ry*.86,0,0,7);x.fill();}
 // ---- HUD pieces ----
 function coinIcon(x,cx,cy,r){const g=x.createLinearGradient(cx-r,cy-r,cx+r,cy+r);g.addColorStop(0,'#fff3a0');g.addColorStop(1,'#e8960a');x.fillStyle='#b26a04';x.beginPath();x.arc(cx,cy+r*.12,r,0,7);x.fill();x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,7);x.fill();
  x.fillStyle='#e8960a';x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r*.24:r*.55;x.lineTo(cx+Math.cos(a)*q,cy+Math.sin(a)*q);}x.closePath();x.fill();}
 function coinsPill(x,l){const u=l.u,y=Math.max(10,40*u),hh=Math.max(26,62*u),X=Math.max(8,24*u),w=Math.max(96,230*u),shown=o.coins-(coinT>=0&&coinT<1.4?o.coinPop*(1-Math.max(0,Math.min(1,(coinT-.8)/.5))):0);
  h.rr(x,X+hh*.5,y+hh*.1,w,hh*.8,hh*.4);x.fillStyle='#fff6e0';x.fill();x.strokeStyle='#d8a65a';x.lineWidth=Math.max(1,3*u);x.stroke();
  h.outlined(x,String(Math.round(shown)),X+hh*.5+w*.55,y+hh/2+1,Math.max(13,34*u),'#5a3a10','#00000000',undefined,900);
  coinIcon(x,X+hh*.5,y+hh/2,hh*.5);x.fillStyle='#3ec02a';x.beginPath();x.arc(X+hh*.85,y+hh*.85,hh*.2,0,7);x.fill();h.outlined(x,'+',X+hh*.85,y+hh*.85,hh*.34,'#fff','#00000000',undefined,900);}
 function button(x,l,label){const b=l.btn,p=1+Math.sin(t*4)*.025*(picked?0:1);x.save();x.translate(b.x+b.w/2,b.y+b.h/2);x.scale(p,p);x.translate(-b.w/2,-b.h/2);
  h.rr(x,0,0,b.w,b.h,b.h*.3);x.fillStyle='#ffd23a';x.fill();h.rr(x,6,6,b.w-12,b.h-12,b.h*.26);const g=x.createLinearGradient(0,0,0,b.h);g.addColorStop(0,'#6fe24a');g.addColorStop(.55,'#2fbf2a');g.addColorStop(1,'#1f9a22');x.fillStyle=g;x.fill();
  h.rr(x,14,10,b.w-28,b.h*.32,b.h*.15);x.fillStyle='#ffffff50';x.fill();h.outlined(x,label,b.w/2,b.h/2+2,b.h*.36,'#fff','#156b18');x.restore();}
 function bubble(x,l,n,cx,cy){const u=l.u,r=BUB/2*u*(n===sel?1.12:1),locked=n>o.cur,isCur=n===o.cur,st=+o.stars[n]||0;
  x.fillStyle='#00000030';x.beginPath();x.ellipse(cx,cy+r*.85,r*.9,r*.25,0,0,7);x.fill();
  if(isCur){x.shadowColor='#ffd23a';x.shadowBlur=20*u+Math.sin(t*4)*8*u;}
  x.fillStyle=n===sel?'#fff':locked?'#8c93a8':isCur?'#ffd23a':'#ffffffcc';x.beginPath();x.arc(cx,cy,r,0,7);x.fill();x.shadowBlur=0;
  const g=x.createLinearGradient(0,cy-r,0,cy+r);if(locked){g.addColorStop(0,'#9aa1b6');g.addColorStop(1,'#646b82');}else{g.addColorStop(0,'#6fe24a');g.addColorStop(1,'#1f9a22');}x.fillStyle=g;x.beginPath();x.arc(cx,cy,r*.86,0,7);x.fill();
  x.fillStyle='#ffffff40';x.beginPath();x.ellipse(cx,cy-r*.42,r*.56,r*.26,0,0,7);x.fill();
  if(locked)h.lockIcon(x,cx,cy,r*1.15);else h.outlined(x,String(n),cx,cy+2*u,r*(n>99?.62:.78),'#fff','#156b18',undefined,900);
  if(!locked)for(let i=0;i<3;i++){const sx=cx+(i-1)*r*.62,sy=cy+r*1.04+(i===1?r*.08:0),sr=r*.24;if(i<st)h.drawStar(x,sx,sy,sr);else{x.globalAlpha=.55;h.drawStar(x,sx,sy,sr*.85);x.globalAlpha=1;x.fillStyle='#2a3170aa';x.beginPath();x.arc(sx,sy,sr*.5,0,7);x.fill();}}}
 function strip(x,l){const u=l.u,cy=l.stripY;x.fillStyle='#1d5a1488';h.rr(x,10,cy-BUB*.75*u,l.W-20,BUB*1.6*u,BUB*.4*u);x.fill();
  x.save();h.rr(x,10,cy-BUB*.75*u,l.W-20,BUB*1.6*u,BUB*.4*u);x.clip();const n0=Math.max(1,Math.floor((scroll-l.W/2)/(STEP*u))),n1=Math.min(last(),Math.ceil((scroll+l.W/2)/(STEP*u))+2);
  for(let n=n0;n<=n1;n++){const bx=bubX(n,l);if(n>1)for(let k=1;k<4;k++){x.fillStyle=n>o.cur?'#ffffff40':'#ffffffa0';x.beginPath();x.arc(bx-STEP*u+STEP*u*k/4,cy,3*u+1,0,7);x.fill();}}
  for(let n=n0;n<=n1;n++)bubble(x,l,n,bubX(n,l),cy-8*u);x.restore();}
 // ---- props raining into the hole after Play, coins popping out of it after a clear ----
 function startDrop(n){const inf=infoFor(n),th=(inf?.thumbs||[]).filter(Boolean),list=[];
  for(let i=0;i<10;i++)list.push({c:th[i%Math.max(1,th.length)],dx:((i*37)%13-6)*7,delay:i*.09,rot:((i*53)%17)/17*6,spin:((i*29)%7-3)*2});drop={n,list,t:0};}
 function drawDrop(x,l){const u=l.u;for(const d of drop.list){const tt=drop.t-d.delay;if(tt<0||!d.c)continue;const f=Math.min(1,tt/.7),y=-200*u+(l.holeY+20*u)*f*f,s=170*u*(1-Math.max(0,f-.85)*4);
  if(f>=1)continue;x.save();x.translate(l.W/2+d.dx*u*(1-f),y);x.rotate(d.rot+d.spin*tt);x.drawImage(d.c,-s/2,-s/2,s,s);x.restore();}
  // keep the front lip of the rim over the falling props
  const cx=l.W/2,cy=l.holeY,rx=130*u,ry=62*u;x.save();x.beginPath();x.rect(0,cy+4*u,l.W,ry*2);x.clip();const rg=x.createLinearGradient(0,cy,0,cy+ry*1.2);rg.addColorStop(0,'#c9ced6');rg.addColorStop(1,'#a3a9b4');x.fillStyle=rg;x.beginPath();x.ellipse(cx,cy,rx*1.16,ry*1.2,0,0,7);x.ellipse(cx,cy+4*u,rx*.94,ry*.86,0,0,7);x.fill('evenodd');x.restore();}
 function drawCoinPop(x,l){const u=l.u;if(coinT<0||coinT>1.6)return;const n=8;for(let i=0;i<n;i++){const k=Math.max(0,Math.min(1,(coinT-.5-i*.03)/.7)),up=Math.min(1,coinT/.5);
  const sx=l.W/2+((i*37)%11-5)*14*u,sy=l.holeY-90*u*up-((i*53)%7)*10*u,tx=Math.max(8,24*u)+31*u,ty=Math.max(10,40*u)+31*u;if(k>=1)continue;coinIcon(x,sx+(tx-sx)*k*k,sy+(ty-sy)*k*k,22*u);}
  if(coinT<1)h.outlined(x,'+'+o.coinPop,l.W/2,l.holeY-120*u-coinT*60*u,Math.max(16,60*u),'#fff','#5a3a10',undefined,900);}
 function draw(x,dt){t+=dt;const l=L();if(scroll===null)scroll=scrollFor(sel,l);if(toast)toast.t-=dt;if(coinT>=0)coinT+=dt;
  if(!drag){const want=scroll;scroll=Math.max(0,Math.min(scrollFor(last(),l),want));}
  scenery(x,l);hole(x,l);if(drop){drop.t+=dt;drawDrop(x,l);}drawCoinPop(x,l);coinsPill(x,l);
  button(x,l,`Level ${sel}`);strip(x,l);
  h.outlined(x,picked?'':`${o.who}, pick a level`,l.W/2,l.btn.y-Math.max(22,46*l.u),Math.max(13,34*l.u),'#fff','#1d5a14',undefined,800);
  if(toast&&toast.t>0){x.globalAlpha=Math.min(1,toast.t*2);const tw=Math.min(l.W-30,780*l.u+60),th=Math.max(44,96*l.u),ty=l.H*.4;h.rr(x,l.W/2-tw/2,ty,tw,th,16*l.u);x.fillStyle='#141a33ee';x.fill();
   h.outlined(x,toast.msg,l.W/2,ty+th/2+1,Math.max(12,30*l.u),'#fff','#141a33',undefined,800);x.globalAlpha=1;}}
 function select(n){if(n>o.cur){toast={msg:`Level ${n} is locked: clear Level ${o.cur} first`,t:2.2};return 'locked';}sel=n;return 'select';}
 function pick(n=sel){if(picked||n<1||n>o.cur)return false;sel=n;picked=n;startDrop(n);setTimeout(()=>o.onPick(n),1500);return true;}
 function tap(p){const l=L(),b=l.btn;if(picked)return '';
  if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)return pick()?'pick':'';
  if(Math.abs(p.y-l.stripY)<BUB*.8*l.u){const n=Math.round((p.x-l.W/2+scroll)/(STEP*l.u))+1;if(n>=1&&n<=last()&&Math.abs(bubX(n,l)-p.x)<BUB*.6*l.u)return select(n);}
  return '';}
 return {draw,
  down(p){drag={x:p.x,start:scroll??0,moved:0};},
  move(p){if(!drag)return;const dx=p.x-drag.x;drag.moved=Math.max(drag.moved,Math.abs(dx));scroll=drag.start-dx;},
  up(p){const d=drag;drag=null;if(d&&d.moved<10)return tap(p);return '';},
  wheel(dy){scroll=(scroll??0)+dy;},
  pick,select,get picked(){return picked;},get selected(){return sel;},bubble:n=>{const l=L();return {x:bubX(n,l),y:l.stripY};},button:()=>L().btn};
}
Object.assign(exports,{createLevelMap,starsFor});
