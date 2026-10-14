// TRON Legacy light cycles ("Derezzed"), rebuilt in the style of the 1982 TRON arcade cycle grid with Legacy neon:
// cyan vs orange cycles on a glowing grid, 90-degree turns, solid light walls, a boost meter, derez explosions.
// Both players at once: swipe (or keep dragging) on your own half to turn; hold still for a moment to boost.
// First to three rounds.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,makeShake,label,SANS}=require("src/engines/tarantinoKit.js");
const {makeBits,scanlines,vignette}=require("src/engines/retroKit.js");
const {directionGestures}=require("src/engines/directionGestures.js");
const {vibrate}=require("src/audio.js");

const COL=['#2fe6ff','#ff8a1f'],GLOW=['#2fe6ffcc','#ff8a1fcc'],WIN=3;

async function lightcycle(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.shared=true;s.updateScores();s.ownHud(true,true);
 const shake=makeShake(),bits=makeBits();const wins=[0,0];let t=0,round=0,G=null,state='wait',banner=null,stillT=[0,0];
 const gest=directionGestures(s,(i,dx,dy)=>{const p=G?.p[i];if(!p||!p.alive||state!=='play')return;const last=p.queue.at(-1)||p.dir;if(dx===-last[0]&&dy===-last[1]||dx===last[0]&&dy===last[1]||p.queue.length>=2)return;p.queue.push([dx,dy]);stillT[i]=0;},{players:2,threshold:12});
 s.hint('P1 left half, P2 right half. Swipe in a direction to turn (keep your finger down and drag again for the next turn). Hold your finger still to boost while the meter lasts. Hit a light wall and you derez. First to three. Keys: WASD / arrows.');
 function setup(){
  const W=s.W,H=s.H,top=48,cell=Math.max(7,Math.floor(Math.min(W,H-top)/44)),cols=Math.floor((W-8)/cell),rows=Math.floor((H-top-8)/cell);
  const grid=new Uint8Array(cols*rows),my=Math.floor(rows/2);
  const mk=(i,cx,cy,d)=>({i,x:cx,y:cy,dir:d,queue:[],alive:true,trail:[[cx,cy]],boost:1,boosting:false,acc:0});
  G={cols,rows,cell,ox:Math.floor((W-cols*cell)/2),oy:top+Math.floor((H-top-8-rows*cell)/2),grid,speed:10,
   p:rows>cols*1.15?[mk(0,Math.floor(cols*.3),Math.floor(rows*.88),[0,-1]),mk(1,Math.floor(cols*.7),Math.floor(rows*.12),[0,1])]:[mk(0,Math.floor(cols*.12),my+Math.floor(rows*.12),[1,0]),mk(1,Math.floor(cols*.88),my-Math.floor(rows*.12),[-1,0])]};
  for(const p of G.p)G.grid[p.y*cols+p.x]=p.i+1;
 }
 function crash(p){if(!p.alive)return;p.alive=false;const X=G.ox+(p.x+.5)*G.cell,Y=G.oy+(p.y+.5)*G.cell;bits.burst(X,Y,{n:60,speed:260,color:COL[p.i],life:1.1,size:4});bits.burst(X,Y,{n:30,speed:120,color:'#ffffff',life:.6,size:3});noise(.9,.14,{f0:2400,f1:60});voice(90,.6,.08,'sawtooth',{slide:.3,lp:900});shake.kick(14);vibrate(60);s.react?.(p.i,'sad',1.5);}
 function tick(){
  const next=G.p.map(p=>{if(!p.alive)return null;if(p.queue.length){p.dir=p.queue.shift();p.trail.push([p.x,p.y]);}return [p.x+p.dir[0],p.y+p.dir[1]];});
  const bad=next.map(n=>!n||n[0]<0||n[1]<0||n[0]>=G.cols||n[1]>=G.rows||G.grid[n[1]*G.cols+n[0]]>0);
  if(next[0]&&next[1]&&next[0][0]===next[1][0]&&next[0][1]===next[1][1]){bad[0]=bad[1]=true;}
  G.p.forEach((p,i)=>{if(!p.alive)return;if(bad[i]){crash(p);return;}p.x=next[i][0];p.y=next[i][1];G.grid[p.y*G.cols+p.x]=i+1;});
 }
 function endRound(){const alive=G.p.filter(p=>p.alive);let text='DOUBLE DEREZ';if(alive.length===1){wins[alive[0].i]++;text=`${s.players[alive[0].i].name.toUpperCase()} WINS`;s.react?.(alive[0].i,'win',2);}s.setScores(wins);
  banner={text,t:2.4};state='between';[392,523,659].forEach((f,k)=>voice(f,.16,.05,'triangle',{delay:.3+k*.1}));}
 function drawCycle(p,fx,fy){const cs=G.cell,X=G.ox+(fx+.5)*cs,Y=G.oy+(fy+.5)*cs,a=Math.atan2(p.dir[1],p.dir[0]);
  x.save();x.translate(X,Y);x.rotate(a);x.shadowColor=COL[p.i];x.shadowBlur=14;x.fillStyle='#0b0b12';x.strokeStyle=COL[p.i];x.lineWidth=Math.max(1.5,cs*.22);
  const Lc=cs*2.6,Wc=cs*1.05;x.beginPath();x.roundRect?.(-Lc*.55,-Wc/2,Lc,Wc,Wc*.5);x.fill();x.stroke();
  x.fillStyle=COL[p.i];x.beginPath();x.arc(Lc*.3,0,Wc*.32,0,Math.PI*2);x.arc(-Lc*.38,0,Wc*.32,0,Math.PI*2);x.fill();x.restore();
  s.sprite(x,p.i,X-p.dir[0]*cs*.2,Y-p.dir[1]*cs*.2-cs*.2,Math.max(26,cs*2.6),{exact:true});}
 s.frame(dt=>{
  const W=s.W,H=s.H;t+=dt;shake.step(dt);bits.step(dt);if(!G)return;
  if(state==='play'){
   for(const p of G.p){const held=[...gest.fingers.values()].find(f=>f.owner===p.i);if(held&&!held.moved){stillT[p.i]+=dt;}else stillT[p.i]=0;p.boosting=stillT[p.i]>.25&&p.boost>0;p.boost=clamp(p.boost+(p.boosting?-dt*.7:dt*.18),0,1);}
   G.speed=Math.min(18,10+t*.06);
   // each cycle advances on its own clock so boosting is real
   const steps=G.p.map(p=>{if(!p.alive)return 0;p.acc+=dt*G.speed*(p.boosting?1.7:1);const n=Math.floor(p.acc);p.acc-=n;return n;});
   let guard=0;while((steps[0]>0||steps[1]>0)&&guard++<10){const movers=G.p.map((p,i)=>steps[i]>0&&p.alive);
    const saved=G.p.map(p=>p.alive);G.p.forEach((p,i)=>{if(!movers[i])p.alive=false;});tick();G.p.forEach((p,i)=>{if(!movers[i])p.alive=saved[i];});
    for(let i=0;i<2;i++)if(steps[i]>0)steps[i]--;}
   if(G.p.some(p=>!p.alive)){state='crashing';banner={t:.9};}
  }else if(state==='crashing'){banner.t-=dt;if(banner.t<=0)endRound();}
  else if(state==='between'){banner.t-=dt;if(banner.t<=0){if(wins.some(v=>v>=WIN)){state='over';s.finish(wins,`Light cycles · ${wins[0]}–${wins[1]}`);return;}round++;setup();state='play';t=0;}}
  // ---- draw
  x.setTransform(1,0,0,1,0,0);x.fillStyle='#010208';x.fillRect(0,0,W,H);
  if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  const {ox,oy,cell:cs,cols,rows}=G;
  // grid floor
  x.strokeStyle='#0f3a5c';x.lineWidth=1;x.beginPath();for(let cI=0;cI<=cols;cI+=4){x.moveTo(ox+cI*cs+.5,oy);x.lineTo(ox+cI*cs+.5,oy+rows*cs);}for(let r=0;r<=rows;r+=4){x.moveTo(ox,oy+r*cs+.5);x.lineTo(ox+cols*cs,oy+r*cs+.5);}x.stroke();
  x.strokeStyle='#7fe8ff';x.shadowColor='#2fe6ff';x.shadowBlur=12;x.lineWidth=2;x.strokeRect(ox-1,oy-1,cols*cs+2,rows*cs+2);x.shadowBlur=0;
  // light walls: glow pass then hot core
  for(const p of G.p){const pts=[...p.trail,[p.x,p.y]];const fr=state==='play'&&p.alive?p.acc:0;const head=[p.x+p.dir[0]*fr,p.y+p.dir[1]*fr];pts[pts.length-1]=head;
   const path=()=>{x.beginPath();pts.forEach(([a,b],k)=>{const X=ox+(a+.5)*cs,Y=oy+(b+.5)*cs;k?x.lineTo(X,Y):x.moveTo(X,Y);});};
   x.lineJoin='miter';x.lineCap='square';x.globalAlpha=p.alive||state!=='between'?1:.35;
   x.strokeStyle=GLOW[p.i];x.shadowColor=COL[p.i];x.shadowBlur=16;x.lineWidth=cs*.85;path();x.stroke();x.shadowBlur=0;x.strokeStyle='#ffffffdd';x.lineWidth=Math.max(1,cs*.22);path();x.stroke();x.globalAlpha=1;
   if(p.alive)drawCycle(p,head[0],head[1]);}
  bits.draw(x);
  x.setTransform(1,0,0,1,0,0);
  // HUD: round pips + boost meters
  for(let i=0;i<2;i++){const bx=i?W-170:16,by=12;label(x,s.players[i].name.toUpperCase(),i?W-140:16,by+8,13,{fill:COL[i],stroke:'#000',align:i?'right':'left',font:`900 13px ${SANS}`});
   for(let k=0;k<WIN;k++){x.fillStyle=k<wins[i]?COL[i]:'#ffffff22';x.fillRect((i?W-140-(k+1)*14:16+k*14),by+18,10,6);}
   const mw=60;x.fillStyle='#ffffff22';x.fillRect(i?W-140-mw:16,by+28,mw,4);x.fillStyle=COL[i];x.fillRect(i?W-140-mw:16,by+28,mw*G.p[i].boost,4);}
  if(state==='crashing'||state==='between')label(x,'DEREZZED',W/2,H*.4,clamp(W*.09,26,64),{fill:'#fff',stroke:'#000'});
  if(state==='between'&&banner)label(x,banner.text,W/2,H*.4+clamp(W*.07,22,50),clamp(W*.05,16,34),{fill:'#ffd23f',stroke:'#000'});
  scanlines(x,W,H,.1);vignette(x,W,H,.45);
  s.debug={engine:'lightcycle',G,state,wins,round};
 });
 if(!await s.pass(0,`TRON light cycles. ${s.players[0].name} (cyan) swipes on the LEFT half, ${s.players[1].name} (orange) on the RIGHT. Turn so your rival hits a light wall. Hold a finger still to boost. First to three rounds.`,'Both ready — enter the grid',{countdown:3}))return;
 setup();state='play';t=0;
}
Object.assign(exports,{lightcycle});
