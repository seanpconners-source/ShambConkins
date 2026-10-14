// Kill Bill · Five Point Sword Duel, rebuilt as a Nidhogg-style tug-of-war fencing duel in the House of Blue Leaves.
// One touch kills. Swords sit high, middle or low: a thrust at the same height as your rival's blade is parried,
// anything else lands. A kill gives you the right of way: run for your exit while your rival respawns ahead of you.
// Both at once on your own half: drag left/right to walk, swipe up/down to change stance, tap to thrust.
// Reach your exit twice to win (or be furthest along after 2 minutes).
const {clamp}=require("src/utils.js");
const {voice,noise,sfx,makeShake,makeFx,makeSlowmo,halfPointers,keyboard,label,SANS,mono}=require("src/engines/tarantinoKit.js");
const {vibrate}=require("src/audio.js");

const AL=360,COL=[{suit:'#f2c81e',stripe:'#151515'},{suit:'#f4f1ea',stripe:'#b8202a'}],STANCE_Y=[15.5,11,6.5],WIN=2,CAP=120;

async function sword2p(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.shared=true;s.updateScores();s.ownHud(true,true);
 const shake=makeShake(),fx=makeFx(),slow=makeSlowmo();const wins=[0,0];let state='wait',t=0,clock=0,camX=AL/2,way=-1,banner=null,silhouette=0;
 const F=[0,1].map(i=>({i,dir:i?-1:1,x:0,stance:1,lunge:0,cd:0,alive:true,respawn:0,walk:0,step:0,parried:0,kills:0}));
 const keys=[{},{}];
 function reset(){F[0].x=AL/2-14;F[1].x=AL/2+14;for(const f of F){f.alive=true;f.lunge=0;f.cd=.4;f.stance=1;f.respawn=0;f.parried=0;}way=-1;camX=AL/2;}
 const goal=f=>f.i===0?AL-8:8;
 function thrust(f){if(state!=='fight'||!f.alive||f.cd>0)return;f.lunge=.24;f.cd=.5;sfx.whoosh(900,2600,.06,.12);}
 function setStance(f,d){if(!f.alive)return;const n=clamp(f.stance+d,0,2);if(n!==f.stance){f.stance=n;voice(1500+n*200,.03,.02,'triangle');}}
 const fingers=halfPointers(s,{
  move:(i,r)=>{r.ly??=r.sy;const dy=r.y-r.ly;if(Math.abs(dy)>26&&Math.abs(dy)>Math.abs(r.x-r.px)*1.2){setStance(F[i],dy<0?-1:1);r.ly=r.y;r.sx=r.x;}},
  up:(i,r,{cancelled})=>{if(!cancelled&&r.dist<16&&performance.now()-r.t0<280)thrust(F[i]);}});
 keyboard(s,(i,name,down)=>{keys[i][name]=down;if(!down)return;if(name==='act')thrust(F[i]);if(name==='u')setStance(F[i],-1);if(name==='d')setStance(F[i],1);});
 s.hint('P1 left half, P2 right half. Drag left/right to walk, swipe up/down to raise or lower your sword (high, middle, low), tap to thrust. A thrust at the same height as your rival\'s sword is parried; anything else kills. After a kill, run for your exit (P1 right, P2 left) before your rival stops you. Keys: P1 A/D, W/S, Space · P2 arrows, Enter.');
 function kill(att,vic){vic.alive=false;vic.respawn=1.6;att.kills++;way=att.i;const P=toScreen(vic.x,STANCE_Y[att.stance]);fx.splat(P.x,P.y,{n:40,speed:380,dir:att.dir>0?-.3:Math.PI+.3,spread:1.4,size:5});sfx.splat();sfx.shing();slow.hit(.55,.2);shake.kick(9);silhouette=.45;vibrate(40);
  s.react?.(att.i,'win',1.4);s.react?.(vic.i,'sad',1.6);banner={text:'GO!',t:1.2,i:att.i};}
 let toScreen=(X,Y)=>({x:X,y:Y});
 function step(dt){
  clock+=dt;
  for(const f of F){f.cd=Math.max(0,f.cd-dt);f.parried=Math.max(0,f.parried-dt);
   if(!f.alive){f.respawn-=dt;if(f.respawn<=0){const k=F[1-f.i];let nx=clamp(k.x+k.dir*0+(way===k.i?(k.i===0?1:-1)*58:0),12,AL-12);if(Math.abs(nx-k.x)<20)nx=clamp(k.x+(k.i===0?1:-1)*28,12,AL-12);f.x=nx;f.alive=true;f.stance=1;f.cd=.3;way=-1;}continue;}
   const o=F[1-f.i];f.dir=o.alive?Math.sign(o.x-f.x)||f.dir:(f.i===0?1:-1);
   let w=(keys[f.i].r?1:0)-(keys[f.i].l?1:0);const fg=[...fingers.values()].find(q=>q.i===f.i);if(fg){const dx=fg.x-fg.sx;if(Math.abs(dx)>12)w=clamp(dx/55,-1,1);}
   f.walk=w;let nx=f.x+w*34*dt*(way===f.i?1.15:1);
   if(f.lunge>0){f.lunge-=dt;const ph=.24-f.lunge;if(ph<.1)nx+=f.dir*22*dt;}
   if(o.alive){const min=o.stance===f.stance?13:5;if(f.dir>0&&nx>o.x-min)nx=Math.min(f.x,o.x-min);if(f.dir<0&&nx<o.x+min)nx=Math.max(f.x,o.x+min);}
   f.x=clamp(nx,3,AL-3);if(w)f.step+=dt*8*Math.abs(w);
   if(f.alive&&(f.i===0?f.x>=goal(f):f.x<=goal(f))){wins[f.i]++;s.setScores(wins);state='scored';banner={text:`${s.players[f.i].name.toUpperCase()} ESCAPES!`,t:2.6,i:f.i};sfx.fanfare();s.react?.(f.i,'win',2.2);}}
  // thrust resolution
  for(const a of F){if(!a.alive||a.lunge<=0)continue;const ph=.24-a.lunge;if(ph<.06||ph>.18)continue;const v=F[1-a.i];if(!v.alive)continue;const tip=a.x+a.dir*(13+(ph>.08?5:2));
   if(a.dir*(tip-(v.x-a.dir*1.5))>=0&&Math.abs(v.x-a.x)<22){a.lunge=0;
    if(v.stance===a.stance&&v.dir===-a.dir){a.x-=a.dir*7;v.x+=a.dir*5;a.parried=v.parried=.3;sfx.shing();{const P=toScreen((a.x+v.x)/2,STANCE_Y[a.stance]);fx.spark(P.x,P.y,14,'#fff2b0',320);}shake.kick(3);voice(2600,.12,.03,'triangle');}
    else kill(a,v);}}
  if(clock>=CAP&&state==='fight'){state='timeup';const prog=[F[0].x/AL,1-F[1].x/AL];const w=prog[0]>prog[1]?0:prog[1]>prog[0]?1:-1;if(w>=0)wins[w]++;s.setScores(wins);banner={text:'TIME!',t:2.4,i:w};}
 }
 function drawFighter(f,ux,uy,bob){const C=COL[f.i],d=f.dir;x.save();x.translate(ux,0);
  const leg=Math.sin(f.step)*3*(Math.abs(f.walk)>0?1:0),lunge=f.lunge>0?1:0;
  x.lineCap='round';x.strokeStyle=C.suit;x.lineWidth=2.6;
  x.beginPath();x.moveTo(0,9);x.lineTo(-1.5*d+leg*.6,4.5);x.lineTo(-2*d+leg,0);x.moveTo(0,9);x.lineTo(1.6*d-leg*.6+lunge*2*d,4.5);x.lineTo(2.4*d-leg+lunge*3*d,0);x.stroke();
  x.fillStyle=C.suit;x.beginPath();x.moveTo(-2.6,9);x.lineTo(2.6,9);x.lineTo(2.2+lunge*d,17.5);x.lineTo(-2.2+lunge*d,17.5);x.closePath();x.fill();x.strokeStyle=C.stripe;x.lineWidth=.9;x.beginPath();x.moveTo(-2.2*d+lunge*d,17.4);x.lineTo(-2.5*d,9.2);x.stroke();
  const hy=STANCE_Y[f.stance],hx=d*(4.5+(f.lunge>0?5:0));x.strokeStyle=C.suit;x.lineWidth=2;x.beginPath();x.moveTo(.5*d+lunge*d,16);x.lineTo(hx,hy);x.stroke();
  // katana
  x.strokeStyle='#e8eef6';x.shadowColor=f.parried>0?'#fff2b0':'#9fd0ff';x.shadowBlur=f.parried>0?14:6;x.lineWidth=.8;x.beginPath();x.moveTo(hx,hy);x.lineTo(hx+d*13,hy-(f.stance===0?1.2:f.stance===2?-1.2:0));x.stroke();x.shadowBlur=0;
  x.strokeStyle='#2a2a2a';x.lineWidth=1.3;x.beginPath();x.moveTo(hx-d*1.8,hy+.3);x.lineTo(hx,hy);x.stroke();x.fillStyle='#c9a34a';x.fillRect(hx-.4,hy-1.2,.8,2.4);
  x.restore();}
 s.frame(rawDt=>{
  const W=s.W,H=s.H;slow.step(rawDt);const dt=rawDt*slow.k;t+=rawDt;shake.step(rawDt);fx.step(dt);silhouette=Math.max(0,silhouette-rawDt);if(banner){banner.t-=rawDt;}
  if(state==='fight')step(dt);
  if((state==='scored'||state==='timeup')&&banner.t<=0){if(wins.some(v=>v>=WIN)||state==='timeup'){state='over';s.finish(wins,`Blue Leaves duel · ${wins[0]}–${wins[1]}`);return;}reset();state='fight';banner={text:'ROUND '+(wins[0]+wins[1]+1),t:1.2,i:-1};}
  // camera
  const u=Math.min(W/62,(H-40)/52),VW=W/u,live=F.filter(f=>f.alive);let target=live.length===2?(F[0].x+F[1].x)/2:live.length?live[0].x+(live[0].i===0?1:-1)*VW*.2:camX;target=clamp(target,VW/2,AL-VW/2);camX+=(target-camX)*Math.min(1,rawDt*4);
  const floorY=H*.8,sx=X=>(X-camX)*u+W/2;toScreen=(X,Y)=>({x:sx(X),y:floorY-Y*u});
  x.setTransform(1,0,0,1,0,0);
  // House of Blue Leaves: wall, shoji panels, lanterns (parallax)
  const wall=x.createLinearGradient(0,0,0,floorY);wall.addColorStop(0,'#05081a');wall.addColorStop(1,'#0e1d4a');x.fillStyle=wall;x.fillRect(0,0,W,floorY);
  const pw=26*u*.8;for(let k=Math.floor((camX*.6-VW)/26);k<Math.ceil((camX*.6+VW)/26);k++){const X=(k*26-camX*.6)*u*.8+W/2;x.fillStyle='#e9f0ff18';x.fillRect(X,floorY*.18,pw*.86,floorY*.6);x.strokeStyle='#1a2a5a';x.lineWidth=2;for(let q=1;q<4;q++){x.beginPath();x.moveTo(X+pw*.86*q/4,floorY*.18);x.lineTo(X+pw*.86*q/4,floorY*.78);x.stroke();}for(let q=1;q<5;q++){x.beginPath();x.moveTo(X,floorY*.18+floorY*.6*q/5);x.lineTo(X+pw*.86,floorY*.18+floorY*.6*q/5);x.stroke();}
   if(k%3===0){const ly=floorY*.12+Math.sin(t*1.5+k)*3;x.fillStyle='#ff5a3a';x.shadowColor='#ff7a3a';x.shadowBlur=18;x.beginPath();x.ellipse(X+pw*.43,ly,pw*.1,pw*.14,0,0,Math.PI*2);x.fill();x.shadowBlur=0;}}
  // glass floor tiles
  x.fillStyle='#0b1636';x.fillRect(0,floorY,W,H-floorY);const tile=6*u;for(let k=Math.floor((camX-VW)/6);k<Math.ceil((camX+VW)/6);k++){const X=sx(k*6);x.fillStyle=k%2?'#2a6bd8':'#d9e8ff';x.globalAlpha=.55;x.fillRect(X,floorY,tile-1,(H-floorY)*.35);x.fillStyle=k%2?'#d9e8ff':'#2a6bd8';x.fillRect(X,floorY+(H-floorY)*.36,tile-1,(H-floorY)*.35);x.globalAlpha=1;}
  // exits
  for(const [gx,i] of [[AL-4,0],[4,1]]){const X=sx(gx);if(X<-80||X>W+80)continue;x.fillStyle=i===0?'#f2c81e':'#f4f1ea';x.globalAlpha=.25+.15*Math.sin(t*4);x.fillRect(X-8*u,floorY-34*u,16*u,34*u);x.globalAlpha=1;label(x,'EXIT',X,floorY-38*u,Math.max(12,5*u),{fill:i===0?'#f2c81e':'#f4f1ea'});}
  let sh=0,sv=0;if(shake.mag>.3){sh=(Math.random()-.5)*shake.mag;sv=(Math.random()-.5)*shake.mag;}
  x.setTransform(u,0,0,-u,W/2-camX*u+sh,floorY+sv);// world: y up from the floor
  for(const f of F){if(!f.alive)continue;x.fillStyle='#0006';x.beginPath();x.ellipse(f.x,-.6,5,1.2,0,0,Math.PI*2);x.fill();drawFighter(f,f.x,0,0);}
  x.setTransform(1,0,0,1,0,0);fx.drawDecals?.(x);fx.draw(x);
  for(const f of F){if(!f.alive)continue;s.sprite(x,f.i,sx(f.x)+f.dir*u*.6,floorY-21*u,Math.max(26,8.5*u),{exact:true});}
  if(silhouette>0){mono(x,W,H,1);x.fillStyle=`rgba(40,90,255,${.55*silhouette/.45})`;x.globalCompositeOperation='multiply';x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over';}
  // HUD: arena progress bar + stance hints
  const bw=Math.min(W*.5,360),bx=W/2-bw/2,by=14;x.fillStyle='#ffffff22';x.fillRect(bx,by,bw,4);for(const f of F){if(!f.alive)continue;x.fillStyle=COL[f.i].suit;x.fillRect(bx+f.x/AL*bw-3,by-4,6,12);}x.fillStyle='#f2c81e';x.fillRect(bx+bw-2,by-6,3,16);x.fillStyle='#f4f1ea';x.fillRect(bx-1,by-6,3,16);
  for(let i=0;i<2;i++){label(x,s.players[i].name,i?W-130:14,22,15,{fill:COL[i].suit,align:i?'right':'left',font:`900 15px ${SANS}`});for(let k=0;k<WIN;k++){x.fillStyle=k<wins[i]?COL[i].suit:'#ffffff22';x.fillRect(i?W-140-k*14:16+k*14,34,10,5);}
   const f=F[i];const gx=i?W-150:20;['HIGH','MID','LOW'].forEach((n,k)=>{x.fillStyle=f.stance===k?COL[i].suit:'#ffffff30';x.fillRect(i?gx-30:gx,46+k*8,24,5);});}
  label(x,String(Math.max(0,Math.ceil(CAP-clock))),W/2,36,14,{fill:'#ffffffaa'});
  if(way>=0&&state==='fight'){const f=F[way];label(x,way===0?'GO ▶▶':'◀◀ GO',W/2,H*.28,clamp(W*.07,22,44),{fill:COL[way].suit,alpha:.6+.4*Math.sin(t*10)});}
  if(banner&&banner.t>0)label(x,banner.text,W/2,H*.4,clamp(W*.06,18,40),{fill:banner.i>=0?COL[banner.i].suit:'#fff',alpha:clamp(banner.t*2,0,1)});
  s.debug={engine:'sword2p',F,state,wins,way,camX};
 });
 if(!await s.pass(0,`The House of Blue Leaves. ${s.players[0].name} (yellow) fights from the LEFT half and escapes right; ${s.players[1].name} (white) from the RIGHT half and escapes left. Drag to walk, swipe up/down to change sword height, tap to thrust. Same height = parry. A kill lets you run for your exit. Escape twice to win.`,'Both ready — fight!',{countdown:3}))return;
 reset();state='fight';clock=0;
}
Object.assign(exports,{sword2p});
