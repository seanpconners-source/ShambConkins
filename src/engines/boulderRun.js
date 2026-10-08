// Indiana Jones · Boulder Run. Both players at once, one temple corridor each (top = player 1, bottom = player 2),
// identical traps. Tap or swipe up to jump pits and spikes, swipe down to slide under darts. Every stumble lets
// the boulder roll closer; clean running slowly wins ground back. Golden idols are bonus points.
const {clamp,seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {label,rr,makeFx,makeShake,sfx,halfPointers,keyboard,voice,noise}=require("src/engines/tarantinoKit.js");
const DUR=60,G=44,JV=15.5,STAND=2,SLIDE=.9;

function course(seed){const r=seededRandom(seed+':boulder'),items=[];let x=14;
 while(x<1400){const t=r(),lvl=Math.min(1,x/700);
  if(t<.3)items.push({kind:'pit',x,w:2+r()*1.2+lvl*.8});
  else if(t<.52)items.push({kind:'spikes',x,w:1.1});
  else if(t<.78)items.push({kind:'dart',x,w:.9,h0:1.15,h1:1.75});
  else{items.push({kind:'spikes',x,w:1});items.push({kind:'dart',x:x+5.5,w:.9,h0:1.15,h1:1.75});x+=5;}
  if(r()<.45)items.push({kind:'idol',x:x+(r()<.5?0:3)+.6,w:.8,h0:2.2,h1:3});
  x+=7.5+r()*6-lvl*2.5;}
 return items.sort((a,b)=>a.x-b.x);}

async function ballrun2p(s){
 const [c,x]=s.canvas(760,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 const items=course(s.seed),fx=makeFx(),shake=makeShake();
 const P=[0,1].map(i=>({i,x:0,y:0,vy:0,slide:0,stum:0,inv:0,gap:6,alive:true,idols:0,hits:0,run:0,dead:0,got:new Set(),hitSet:new Set(),jumpQ:0}));
 let t=0,phase='play',endT=0,pace=8;
 s.debug={engine:'ballrun2p',P,items,get t(){return t;}};
 const score=p=>Math.round(p.x)+p.idols*15;

 function jump(p){if(!p.alive||phase!=='play')return;if(p.y<=.01){p.vy=JV;p.slide=0;sfx.whoosh(300,900,.04,.1);}else p.jumpQ=.15;}
 function slide(p){if(!p.alive||phase!=='play')return;if(p.y>.01){p.vy=Math.min(p.vy,-18);}p.slide=.65;noise(.15,.05,{f0:800,f1:300});}
 halfPointers(s,{chooseOwner:pt=>pt.y<s.H/2?0:1,
  up:(i,r,{cancelled})=>{if(cancelled)return;const dy=r.y-r.sy;if(dy>28)slide(P[i]);else jump(P[i]);}});
 keyboard(s,(i,k,down)=>{if(!down)return;if(k==='u'||k==='act')jump(P[i]);if(k==='d')slide(P[i]);});

 function hit(p,o){if(p.inv>0)return;p.stum=.45;p.inv=1;p.hits++;shake.kick(7);vibrate(30);voice(140,.2,.08,'square',{slide:.5});s.react(p.i,'sad');
  const L0=laneTop(p.i);fx.pop(L.rx,L0+L.lh*.35,o.kind==='dart'?'DART!':o.kind==='pit'?'STUMBLE!':'OUCH!',{color:'#ff6b6b',size:18});}
 function step(p,dt){if(!p.alive)return;
  const sp=p.stum>0?pace*.55:pace*1.08;p.stum=Math.max(0,p.stum-dt);p.inv=Math.max(0,p.inv-dt);p.slide=Math.max(0,p.slide-dt);p.jumpQ=Math.max(0,p.jumpQ-dt);
  p.x+=sp*dt;p.run+=dt*sp;p.gap=Math.min(8,p.gap+(sp-pace)*dt);
  p.vy-=G*dt;p.y+=p.vy*dt;
  let ground=0;const overPit=items.find(o=>o.kind==='pit'&&p.x>o.x+.25&&p.x<o.x+o.w-.25);if(overPit&&p.y<=0){if(!p.hitSet.has(overPit)){p.hitSet.add(overPit);hit(p,overPit);p.vy=JV*.75;}}
  if(p.y<ground){p.y=ground;p.vy=0;if(p.jumpQ>0){p.jumpQ=0;jump(p);}}
  const h=p.slide>0?SLIDE:STAND;
  for(const o of items){if(o.x>p.x+2)break;if(o.x+o.w<p.x-.5)continue;if(p.x+.35<o.x||p.x-.35>o.x+o.w)continue;
   if(o.kind==='idol'){if(!p.got.has(o)&&p.y+h>o.h0&&p.y<o.h1){p.got.add(o);p.idols++;sfx.coin();fx.spark(L.rx,laneTop(p.i)+L.lh*.4,14,'#ffd23f');s.setScores(P.map(score));}continue;}
   if(p.hitSet.has(o))continue;
   if(o.kind==='spikes'&&p.y<.75){p.hitSet.add(o);hit(p,o);}
   if(o.kind==='dart'&&p.y+h>o.h0&&p.y<o.h1){p.hitSet.add(o);hit(p,o);}}
  if(p.gap<=0){p.alive=false;p.dead=1;shake.kick(16);noise(.6,.18,{f0:300,f1:60});vibrate([60,40,90]);s.react(p.i,'sad');s.react(1-p.i,'happy');fx.pop(L.W/2,laneTop(p.i)+L.lh*.45,'FLATTENED!',{color:'#ffd23f',size:30,life:1.6});}
 }

 const L={};const laneTop=i=>i?L.H/2+2:0;
 function layout(){const W=s.W,H=s.H,lh=H/2-2,u=clamp(Math.min(lh/7.5,W/12),16,60);Object.assign(L,{W,H,lh,u,rx:W*.42});}
 function drawLane(p){const top=laneTop(p.i),lh=L.lh,u=L.u,W=L.W,floor=top+lh*.78,sxw=wx=>L.rx+(wx-p.x)*u;
  x.save();x.beginPath();x.rect(0,top,W,lh);x.clip();
  const bg=x.createLinearGradient(0,top,0,top+lh);bg.addColorStop(0,'#2a1a0e');bg.addColorStop(.75,'#5a3a1e');bg.addColorStop(1,'#2a1608');x.fillStyle=bg;x.fillRect(0,top,W,lh);
  // bricks (parallax)
  x.strokeStyle='#00000030';x.lineWidth=1;const bw=u*2.2,bh=u*.9,off=(p.x*u*.6)%bw;for(let row=0;row*bh<lh*.78;row++){const yy=top+row*bh;x.beginPath();x.moveTo(0,yy);x.lineTo(W,yy);x.stroke();for(let xx=-off+(row%2)*bw/2;xx<W;xx+=bw){x.beginPath();x.moveTo(xx,yy);x.lineTo(xx,yy+bh);x.stroke();}}
  // torches
  for(let k=Math.floor((p.x-20)/12);k<p.x/12+6;k++){const tx=L.rx+(k*12-p.x)*u*.6;if(tx<-20||tx>W+20)continue;const ty=top+lh*.3;x.fillStyle='#3a2410';x.fillRect(tx-2,ty,4,u*.8);const fl=Math.sin(t*14+k)*.15+1;const g=x.createRadialGradient(tx,ty,0,tx,ty,u*1.4*fl);g.addColorStop(0,'#ffcf5aaa');g.addColorStop(1,'#ff7a1a00');x.fillStyle=g;x.beginPath();x.arc(tx,ty,u*1.4*fl,0,7);x.fill();x.fillStyle='#ffd27a';x.beginPath();x.ellipse(tx,ty-u*.2,u*.15,u*.3*fl,0,0,7);x.fill();}
  // floor
  x.fillStyle='#7a5530';x.fillRect(0,floor,W,top+lh-floor);x.fillStyle='#9a7040';x.fillRect(0,floor,W,3);
  for(const o of items){const ox=sxw(o.x),ow=o.w*u;if(ox>W+40||ox+ow<-40)continue;
   if(o.kind==='pit'){x.fillStyle='#0a0503';x.fillRect(ox,floor,ow,top+lh-floor);x.fillStyle='#000';x.fillRect(ox,floor,ow,3);}
   else if(o.kind==='spikes'){x.fillStyle='#cfcfd6';const n=4;for(let k=0;k<n;k++){x.beginPath();x.moveTo(ox+k*ow/n,floor);x.lineTo(ox+(k+.5)*ow/n,floor-u*.75);x.lineTo(ox+(k+1)*ow/n,floor);x.fill();}}
   else if(o.kind==='dart'){const dy=floor-(o.h0+o.h1)/2*u;x.strokeStyle='#d8c8a0';x.lineWidth=3;x.beginPath();x.moveTo(ox,dy);x.lineTo(ox+ow,dy);x.stroke();x.fillStyle='#c33';x.beginPath();x.moveTo(ox,dy);x.lineTo(ox+u*.25,dy-u*.12);x.lineTo(ox+u*.25,dy+u*.12);x.fill();x.fillStyle='#5a3';x.fillRect(ox+ow-u*.2,dy-u*.15,u*.2,u*.3);
    x.fillStyle='#3a2410';x.fillRect(ox-u*.1,top,u*.2,dy-top-u*.15);}
   else if(o.kind==='idol'&&!p.got.has(o)){const iy=floor-(o.h0+.4)*u+Math.sin(t*4+o.x)*u*.1;x.font=`${u*.9}px system-ui`;x.textAlign='center';x.textBaseline='middle';const g=x.createRadialGradient(ox,iy,0,ox,iy,u);g.addColorStop(0,'#ffd23f88');g.addColorStop(1,'#ffd23f00');x.fillStyle=g;x.beginPath();x.arc(ox,iy,u,0,7);x.fill();x.fillStyle='#ffd23f';x.fillText('🗿',ox,iy);}}
  // boulder
  const br=u*2.6,bx=L.rx-u*.9-clamp(p.gap/8,0,1)*(L.rx-u*.9-br*.25),by=floor-br,rot=p.run*.8;x.save();x.translate(bx,by);x.rotate(rot);const bg2=x.createRadialGradient(-br*.3,-br*.3,br*.1,0,0,br);bg2.addColorStop(0,'#a08a70');bg2.addColorStop(1,'#4a3a2a');x.fillStyle=bg2;x.beginPath();x.arc(0,0,br,0,7);x.fill();x.strokeStyle='#2a1e14';x.lineWidth=3;for(let k=0;k<4;k++){x.beginPath();x.arc(0,0,br*(.3+k*.18),k,k+1.6);x.stroke();}x.restore();
  if(p.alive&&p.gap<2.2){x.fillStyle=`rgba(255,40,20,${(2.2-p.gap)/2.2*.35*(Math.sin(t*16)*.5+.5)})`;x.fillRect(0,top,W,lh);}
  // runner
  if(p.alive){const h=p.slide>0?SLIDE:STAND,ry=floor-p.y*u,legs=Math.sin(p.run*3.2);x.strokeStyle='#5a3a1a';x.lineWidth=u*.22;x.lineCap='round';
   if(p.slide>0){x.beginPath();x.moveTo(L.rx-u*.6,ry-u*.15);x.lineTo(L.rx+u*.5,ry-u*.2);x.stroke();}
   else{x.beginPath();x.moveTo(L.rx,ry-u*.9);x.lineTo(L.rx+legs*u*.4,ry);x.moveTo(L.rx,ry-u*.9);x.lineTo(L.rx-legs*u*.4,ry);x.stroke();x.fillStyle='#c9a46a';rr(x,L.rx-u*.32,ry-u*1.7,u*.64,u*.85,u*.15);x.fill();}
   const hy=ry-h*u-u*.25,hx=p.slide>0?L.rx+u*.75:L.rx;if(p.inv>0&&Math.floor(t*14)%2)x.globalAlpha=.5;s.sprite(x,p.i,hx,hy,u*1.35,{exact:true,mood:p.stum>0||p.gap<2?'sad':undefined});x.globalAlpha=1;
   x.fillStyle='#6a4520';x.beginPath();x.ellipse(hx,hy-u*.5,u*.65,u*.14,0,0,7);x.fill();rr(x,hx-u*.35,hy-u*.95,u*.7,u*.48,u*.12);x.fill();}
  else{x.fillStyle='#000a';x.fillRect(0,top,W,lh);label(x,'FLATTENED',W/2,top+lh*.42,clamp(lh*.12,14,34),{fill:'#ffd23f'});label(x,`${score(p)} pts`,W/2,top+lh*.58,clamp(lh*.08,12,22));}
  // HUD
  const fs=clamp(lh*.07,11,20);label(x,`${s.players[p.i].name}`,12,top+fs,fs,{align:'left',fill:p.i?'#ff9fc6':'#78b6ff'});label(x,`${Math.round(p.x)}m · 🗿${p.idols}`,12,top+fs*2.2,fs*.9,{align:'left',fill:'#fff'});
  if(p.alive){const gw=clamp(W*.25,70,200),gx=W-gw-12,gy=top+fs*.6;x.fillStyle='#0008';rr(x,gx,gy,gw,fs*.8,5);x.fill();x.fillStyle=p.gap<2.2?'#ff5a3a':'#ffd23f';rr(x,gx,gy,gw*clamp(p.gap/8,0,1),fs*.8,5);x.fill();label(x,'BOULDER GAP',gx,gy+fs*1.5,fs*.6,{align:'left',fill:'#ddd'});}
  x.restore();}

 s.hint('Both run at once: player 1 owns the TOP corridor, player 2 the BOTTOM. Tap or swipe up on your corridor to jump (pits, spikes); swipe down to slide under darts. Each stumble lets the boulder roll closer; clean running wins ground back. Last one standing, or the furthest runner, wins; idols add 15. Keys: W/S, ↑/↓.');
 if(!await s.pass(0,'The idol is yours. Now RUN. Player 1 runs the top corridor, player 2 the bottom. Tap or swipe up to jump, swipe down to slide. Stumbles let the boulder catch up. Grab idols for bonus points.','Both ready — run!',{countdown:3}))return;
 s.frame(dt=>{layout();
  if(phase==='play'){t+=dt;pace=8+Math.min(7,t*.14);for(const p of P)step(p,dt);s.setScores(P.map(score));
   if(t>=DUR||P.every(p=>!p.alive)||(P.some(p=>!p.alive)&&P.find(p=>p.alive)&&score(P.find(p=>p.alive))>score(P.find(p=>!p.alive))+40)){phase='end';endT=1.8;sfx.fanfare();}}
  else{endT-=dt;if(endT<=0&&s.alive){const sc=P.map(score);s.finish(sc,sc[0]===sc[1]?`Boulder Run ties ${sc[0]}–${sc[1]}.`:`${s.players[sc[0]>sc[1]?0:1].name} outruns the boulder ${Math.max(...sc)}–${Math.min(...sc)}.`);return;}}
  fx.step(dt);shake.step(dt);x.save();shake.apply(x);x.fillStyle='#000';x.fillRect(-20,-20,L.W+40,L.H+40);for(const p of P)drawLane(p);
  label(x,phase==='play'?String(Math.ceil(DUR-t)):'',L.W/2,L.H/2,clamp(L.u*.7,14,28),{fill:'#fff'});fx.draw(x);x.restore();
  s.status(`${Math.ceil(Math.max(0,DUR-t))}s · tap/swipe up = jump · swipe down = slide`);
 });
}
Object.assign(exports,{ballrun2p});
