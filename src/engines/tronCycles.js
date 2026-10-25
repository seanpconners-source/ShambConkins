// TRON Legacy light cycles ("Derezzed"), rebuilt in the style of the 1982 TRON arcade cycle grid with Legacy neon:
// cyan vs orange cycles on a glowing grid, 90-degree turns, solid light walls, a boost meter, derez explosions.
// Both players at once: swipe (or keep dragging) on your own half to turn; hold still for a moment to boost.
// First to three rounds.
// Online (netField): one fixed grid (NET) on both phones, turned so your own cycle starts at the bottom (on the left when
// the phone is sideways). Each phone moves only its own cycle and judges only its own crash; every cell it enters is
// stamped with the time since the round's shared start (nf.start) and streamed {e:{s:[round,x,y,ms,...],h,b,bo}} ~30/s.
// A cell the other cycle entered first (or within TIE) is a wall; one that turns up late derezzes you where you entered
// it. {dead:[round,ms,cells]} = crashed (may still move earlier); {out:[round,ms|-1]} = final, sent once nothing still on
// its way could change it. Both phones settle the round from the two outs: earlier crash loses, within TIE a double derez.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,makeShake,label,SANS}=require("src/engines/tarantinoKit.js");
const {makeBits,scanlines,vignette}=require("src/engines/retroKit.js");
const {directionGestures}=require("src/engines/directionGestures.js");
const {vibrate}=require("src/audio.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");

const COL=['#2fe6ff','#ff8a1f'],GLOW=['#2fe6ffcc','#ff8a1fcc'],WIN=3;
const NET={cols:46,rows:84},TIE=.05;

async function lightcycle(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.shared=true;s.updateScores();s.ownHud(true,true);
 const shake=makeShake(),bits=makeBits();const wins=[0,0];let t=0,round=0,G=null,state='wait',banner=null,stillT=[0,0];
 // M turns grid directions into screen directions ([a,b,c,d]: sx=a·gx+b·gy, sy=c·gx+d·gy); V = the grid as drawn
 const on=s.online||null,me=on?on.me:0,them=1-me;let M=[1,0,0,1],V={c:1,r:1},R=null,netBot=false;const early=[];
 const toGrid=(dx,dy)=>[M[0]*dx+M[2]*dy,M[1]*dx+M[3]*dy],toView=d=>[M[0]*d[0]+M[1]*d[1],M[2]*d[0]+M[3]*d[1]];
 const gest=directionGestures(s,(i,dx,dy)=>{if(on)[dx,dy]=toGrid(dx,dy);const p=G?.p[i];if(!p||!p.alive||state!=='play'||R?.frozen)return;const last=p.queue.at(-1)||p.dir;if(dx===-last[0]&&dy===-last[1]||dx===last[0]&&dy===last[1]||p.queue.length>=2)return;p.queue.push([dx,dy]);stillT[i]=0;},{players:2,threshold:12});
 s.hint(on?'Swipe anywhere to turn (keep your finger down and drag again for the next turn). Hold your finger still to boost while the meter lasts. Hit a light wall and you derez. First to three. Keys: arrows / WASD.':'P1 left half, P2 right half. Swipe in a direction to turn (keep your finger down and drag again for the next turn). Hold your finger still to boost while the meter lasts. Hit a light wall and you derez. First to three. Keys: WASD / arrows.');
 const nf=netField(s,{pack:()=>0,unpack:()=>{},onEvent:e=>handle(e)});
 function setup(){
  const W=s.W,H=s.H,top=48;let cols=NET.cols,rows=NET.rows,cell=8;
  if(!on){cell=Math.max(7,Math.floor(Math.min(W,H-top)/44));cols=Math.floor((W-8)/cell);rows=Math.floor((H-top-8)/cell);}
  const grid=new Uint8Array(cols*rows),my=Math.floor(rows/2);
  const mk=(i,cx,cy,d)=>({i,x:cx,y:cy,dir:d,queue:[],alive:true,trail:[[cx,cy,0]],boost:1,boosting:false,acc:0});
  G={cols,rows,cell,ox:Math.floor((W-cols*cell)/2),oy:top+Math.floor((H-top-8-rows*cell)/2),grid,speed:10,
   p:on||rows>cols*1.15?[mk(0,Math.floor(cols*.3),Math.floor(rows*.88),[0,-1]),mk(1,Math.floor(cols*.7),Math.floor(rows*.12),[0,1])]:[mk(0,Math.floor(cols*.12),my+Math.floor(rows*.12),[1,0]),mk(1,Math.floor(cols*.88),my-Math.floor(rows*.12),[-1,0])]};
  V={c:cols,r:rows};
  for(const p of G.p)G.grid[p.y*cols+p.x]=on?1<<p.i:p.i+1;
  if(on){G.T=[new Float32Array(cols*rows),new Float32Array(cols*rows)];
   R={live:false,t0:0,cells:G.p.map(p=>[p.y*cols+p.x]),send:[],sendT:0,dead:[null,null],out:[null,null],rH:0,frozen:false,seen:0,done:false};}
 }
 // online: the fixed grid turned and scaled to this screen
 function view(){const W=s.W,H=s.H,top=74,side=W>H-top;
  M=side?(me?[0,1,-1,0]:[0,-1,1,0]):(me?[-1,0,0,-1]:[1,0,0,1]);V=side?{c:G.rows,r:G.cols}:{c:G.cols,r:G.rows};
  G.cell=Math.min((W-8)/V.c,(H-top-8)/V.r);G.ox=(W-V.c*G.cell)/2;G.oy=top+(H-top-8-V.r*G.cell)/2;}
 // centre of cell (a,b) on screen (fractions allowed)
 const P=(a,b)=>{const gx=a+.5-G.cols/2,gy=b+.5-G.rows/2;return [G.ox+(M[0]*gx+M[1]*gy+V.c/2)*G.cell,G.oy+(M[2]*gx+M[3]*gy+V.r/2)*G.cell];};
 function crash(p){if(!p.alive)return;p.alive=false;const [X,Y]=P(p.x,p.y);bits.burst(X,Y,{n:60,speed:260,color:COL[p.i],life:1.1,size:4});bits.burst(X,Y,{n:30,speed:120,color:'#ffffff',life:.6,size:3});noise(.9,.14,{f0:2400,f1:60});voice(90,.6,.08,'sawtooth',{slide:.3,lp:900});shake.kick(14);vibrate(60);s.react?.(p.i,'sad',1.5);}
 // vs CPU: cycle 2 scores straight/left/right by the open space it can still reach (flood fill) and, on Hard, by cutting you off
 const cpu=isCpu(s);
 function cpuThink(i=1,sk=cpuSkill(s)){const p=G.p[i],o=G.p[1-i];if(!p.alive||p.queue.length)return;const {cols,rows,grid}=G,free=(x0,y0)=>x0>=0&&y0>=0&&x0<cols&&y0<rows&&!grid[y0*cols+x0];
  const room=(x0,y0)=>{if(!free(x0,y0))return -1;const seen=new Set([y0*cols+x0]),q=[[x0,y0]];let n=0;const cap=60+sk*340;while(q.length&&n<cap){const [a,b]=q.shift();n++;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(b+dy)*cols+a+dx;if(free(a+dx,b+dy)&&!seen.has(k)){seen.add(k);q.push([a+dx,b+dy]);}}}return n;};
  const d=p.dir,opts=[d,[-d[1],d[0]],[d[1],-d[0]]];let best=d,bv=-1e9;for(const dd of opts){const nx=p.x+dd[0],ny=p.y+dd[1];let v=Math.random()<(1-sk)*.25?(free(nx,ny)?1:-1):room(nx,ny);if(v<0)v=-1e6;else{v+=(dd===d?3:0)-Math.hypot(nx-o.x,ny-o.y)*sk*.6+Math.random()*(1-sk)*8;}if(v>bv){bv=v;best=dd;}}
  if(best!==d)p.queue.push(best);}
 function tick(){
  if(cpu)cpuThink();
  const next=G.p.map(p=>{if(!p.alive)return null;if(p.queue.length){p.dir=p.queue.shift();p.trail.push([p.x,p.y]);}return [p.x+p.dir[0],p.y+p.dir[1]];});
  const bad=next.map(n=>!n||n[0]<0||n[1]<0||n[0]>=G.cols||n[1]>=G.rows||G.grid[n[1]*G.cols+n[0]]>0);
  if(next[0]&&next[1]&&next[0][0]===next[1][0]&&next[0][1]===next[1][1]){bad[0]=bad[1]=true;}
  G.p.forEach((p,i)=>{if(!p.alive)return;if(bad[i]){crash(p);return;}p.x=next[i][0];p.y=next[i][1];G.grid[p.y*G.cols+p.x]=i+1;});
 }
 // ---- online round: own cycle moves here, the other one is drawn from its cells
 const nowT=()=>R?.live?(performance.now()-R.t0)/1000:0;
 const cellXY=k=>{const cx=k%G.cols;return [cx,(k-cx)/G.cols];};
 function netMove(){const p=G.p[me];if(p.queue.length){p.dir=p.queue.shift();p.trail.push([p.x,p.y,R.cells[me].length-1]);}
  const nx=p.x+p.dir[0],ny=p.y+p.dir[1],{cols,rows,grid}=G,k=ny*cols+nx,tm=nowT();
  if(nx<0||ny<0||nx>=cols||ny>=rows||grid[k]&(1<<me)||(grid[k]&(1<<them))&&G.T[them][k]<=tm+TIE){netCrash(tm);return;}
  p.x=nx;p.y=ny;grid[k]|=1<<me;G.T[me][k]=tm;R.cells[me].push(k);R.send.push(nx,ny,Math.round(tm*1000));}
 function flush(){const p=G.p[me];nf.event({s:[round,...R.send],h:Math.round(nowT()*1000),b:+p.boost.toFixed(2),bo:p.boosting?1:0});R.send.length=0;R.sendT=performance.now();}
 function netCrash(tm){const p=G.p[me];if(R.dead[me]!==null&&R.dead[me]<=tm)return;R.dead[me]=tm;flush();
  if(p.alive)crash(p);else{const [X,Y]=P(p.x,p.y);bits.burst(X,Y,{n:30,speed:200,color:COL[me],life:.8,size:4});}
  nf.event({dead:[round,Math.round(tm*1000),R.cells[me].length]});}
 // a wall of theirs turned up where this cycle already went, laid first: derez where it entered (cell n of its path)
 function retro(n){const cells=R.cells[me],tm=G.T[me][cells[n]],p=G.p[me];
  for(let j=n;j<cells.length;j++)G.grid[cells[j]]&=~(1<<me);cells.length=n;
  [p.x,p.y]=cellXY(cells[n-1]);p.trail=p.trail.filter(q=>q[2]<n);p.queue.length=0;p.acc=0;netCrash(tm);}
 function theirCell(x,y,tr){const {cols,rows,grid}=G;if(x<0||y<0||x>=cols||y>=rows||R.dead[them]!==null)return;const k=y*cols+x,q=G.p[them],cells=R.cells[them];
  const [lx,ly]=cellXY(cells.at(-1)),d=[Math.sign(x-lx),Math.sign(y-ly)];
  if(d[0]!==q.dir[0]||d[1]!==q.dir[1]){q.trail.push([lx,ly,cells.length-1]);q.dir=d;}
  cells.push(k);grid[k]|=1<<them;G.T[them][k]=tr;q.x=x;q.y=y;R.seen=performance.now();
  if(grid[k]&(1<<me)&&G.T[me][k]>=tr-TIE&&R.out[me]===null){const n=R.cells[me].indexOf(k);if(n>0&&(R.dead[me]===null||G.T[me][k]<R.dead[me]))retro(n);}}
 function theirDead(tm,count){const cells=R.cells[them],q=G.p[them];
  if(count>0&&count<cells.length){for(let j=count;j<cells.length;j++)G.grid[cells[j]]&=~(1<<them);cells.length=count;[q.x,q.y]=cellXY(cells.at(-1));q.trail=q.trail.filter(c=>c[2]<count);}
  R.dead[them]=R.dead[them]===null?tm:Math.min(R.dead[them],tm);R.rH=Infinity;crash(q);}
 function handle(e){const a=e?.s||e?.dead||e?.out;if(!Array.isArray(a))return;const r=a[0];if(!(r>=round))return;if(r>round||!R?.live){early.push(e);return;}
  if(e.s){for(let j=1;j+2<a.length;j+=3)theirCell(a[j]|0,a[j+1]|0,a[j+2]/1000);if(Number.isFinite(e.h))R.rH=Math.max(R.rH,e.h/1000);const q=G.p[them];if(Number.isFinite(e.b))q.boost=clamp(e.b,0,1);q.boosting=!!e.bo;}
  else if(e.dead)theirDead(a[1]/1000,a[2]|0);
  else if(e.out){R.out[them]=a[1]<0?-1:a[1]|0;R.rH=Infinity;}}
 function sendOut(v){R.out[me]=v<0?-1:Math.round(v*1000);nf.event({out:[round,R.out[me]]});}
 function netFrame(dt){const p=G.p[me],tm=nowT();
  if(p.alive&&!R.frozen){if(netBot)cpuThink(me,.35);p.acc+=dt*G.speed*(p.boosting?1.7:1);let n=Math.floor(p.acc);p.acc-=n;while(n-->0&&p.alive)netMove();}
  if(R.out[me]===null&&(R.send.length||performance.now()-R.sendT>150))flush();
  if(R.out[me]===null){if(R.dead[me]!==null){if(R.dead[them]!==null||R.rH>=R.dead[me])sendOut(R.dead[me]);}
   else if(R.dead[them]!==null&&tm>=R.dead[them]+TIE){R.frozen=true;p.acc=0;sendOut(-1);}}
  if(R.out[me]!==null&&R.out[them]!==null&&!R.done){R.done=true;const a=R.out[me],b=R.out[them];
   const w=a<0?me:b<0?them:Math.abs(a-b)<=TIE*1000?-1:a<b?them:me;for(const q of G.p)if(q.i!==w)crash(q);state='crashing';banner={t:.9,w};}}
 async function startRound(){state='sync';await nf.start('r'+round);if(!s.alive)return;R.live=true;R.t0=performance.now();t=0;state='play';for(const e of early.splice(0))handle(e);}
 function endRound(w){if(w===undefined){const alive=G.p.filter(p=>p.alive);w=alive.length===1?alive[0].i:-1;}let text='DOUBLE DEREZ';if(w>=0){wins[w]++;text=`${s.players[w].name.toUpperCase()} WINS`;s.react?.(w,'win',2);}s.setScores(wins);
  banner={text,t:2.4};state='between';[392,523,659].forEach((f,k)=>voice(f,.16,.05,'triangle',{delay:.3+k*.1}));}
 function drawCycle(p,fx,fy){const cs=G.cell,[X,Y]=P(fx,fy),vd=toView(p.dir),a=Math.atan2(vd[1],vd[0]);
  x.save();x.translate(X,Y);x.rotate(a);x.shadowColor=COL[p.i];x.shadowBlur=14;x.fillStyle='#0b0b12';x.strokeStyle=COL[p.i];x.lineWidth=Math.max(1.5,cs*.22);
  const Lc=cs*2.6,Wc=cs*1.05;x.beginPath();x.roundRect?.(-Lc*.55,-Wc/2,Lc,Wc,Wc*.5);x.fill();x.stroke();
  x.fillStyle=COL[p.i];x.beginPath();x.arc(Lc*.3,0,Wc*.32,0,Math.PI*2);x.arc(-Lc*.38,0,Wc*.32,0,Math.PI*2);x.fill();x.restore();
  s.sprite(x,p.i,X-vd[0]*cs*.2,Y-vd[1]*cs*.2-cs*.2,Math.max(26,cs*2.6),{exact:true});}
 s.frame(dt=>{
  const W=s.W,H=s.H;t+=dt;shake.step(dt);bits.step(dt);if(!G)return;if(on)view();
  if(state==='play'&&on){t=nowT();const p=G.p[me],held=[...gest.fingers.values()].find(f=>f.owner===me);if(held&&!held.moved)stillT[me]+=dt;else stillT[me]=0;p.boosting=stillT[me]>.25&&p.boost>0&&p.alive&&!R.frozen;p.boost=clamp(p.boost+(p.boosting?-dt*.7:dt*.18),0,1);
   G.speed=Math.min(18,10+t*.06);netFrame(dt);}
  else if(state==='play'){
   for(const p of G.p){const held=[...gest.fingers.values()].find(f=>f.owner===p.i);if(held&&!held.moved){stillT[p.i]+=dt;}else stillT[p.i]=0;p.boosting=stillT[p.i]>.25&&p.boost>0;p.boost=clamp(p.boost+(p.boosting?-dt*.7:dt*.18),0,1);}
   G.speed=Math.min(18,10+t*.06);
   // each cycle advances on its own clock so boosting is real
   const steps=G.p.map(p=>{if(!p.alive)return 0;p.acc+=dt*G.speed*(p.boosting?1.7:1);const n=Math.floor(p.acc);p.acc-=n;return n;});
   let guard=0;while((steps[0]>0||steps[1]>0)&&guard++<10){const movers=G.p.map((p,i)=>steps[i]>0&&p.alive);
    const saved=G.p.map(p=>p.alive);G.p.forEach((p,i)=>{if(!movers[i])p.alive=false;});tick();G.p.forEach((p,i)=>{if(!movers[i])p.alive=saved[i];});
    for(let i=0;i<2;i++)if(steps[i]>0)steps[i]--;}
   if(G.p.some(p=>!p.alive)){state='crashing';banner={t:.9};}
  }else if(state==='crashing'){banner.t-=dt;if(banner.t<=0)endRound(banner.w);}
  else if(state==='between'){banner.t-=dt;if(banner.t<=0){if(wins.some(v=>v>=WIN)){state='over';s.finish(wins,`Light cycles · ${wins[0]}–${wins[1]}`);return;}round++;setup();if(on)void startRound();else{state='play';t=0;}}}
  // ---- draw
  x.setTransform(1,0,0,1,0,0);x.fillStyle='#010208';x.fillRect(0,0,W,H);
  if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  const {ox,oy,cell:cs}=G,{c:cols,r:rows}=V;
  // grid floor
  x.strokeStyle='#0f3a5c';x.lineWidth=1;x.beginPath();for(let cI=0;cI<=cols;cI+=4){x.moveTo(ox+cI*cs+.5,oy);x.lineTo(ox+cI*cs+.5,oy+rows*cs);}for(let r=0;r<=rows;r+=4){x.moveTo(ox,oy+r*cs+.5);x.lineTo(ox+cols*cs,oy+r*cs+.5);}x.stroke();
  x.strokeStyle='#7fe8ff';x.shadowColor='#2fe6ff';x.shadowBlur=12;x.lineWidth=2;x.strokeRect(ox-1,oy-1,cols*cs+2,rows*cs+2);x.shadowBlur=0;
  // light walls: glow pass then hot core
  for(const p of G.p){const pts=[...p.trail,[p.x,p.y]];
   // the other phone's cycle runs on from its last reported cell, at most one cell
   const fr=state!=='play'||!p.alive?0:!on||p.i===me?(R?.frozen?0:p.acc):clamp((performance.now()-R.seen)/1000*G.speed*(p.boosting?1.7:1),0,1);const head=[p.x+p.dir[0]*fr,p.y+p.dir[1]*fr];pts[pts.length-1]=head;
   const path=()=>{x.beginPath();pts.forEach(([a,b],k)=>{const [X,Y]=P(a,b);k?x.lineTo(X,Y):x.moveTo(X,Y);});};
   x.lineJoin='miter';x.lineCap='square';x.globalAlpha=p.alive||state!=='between'?1:.35;
   x.strokeStyle=GLOW[p.i];x.shadowColor=COL[p.i];x.shadowBlur=16;x.lineWidth=cs*.85;path();x.stroke();x.shadowBlur=0;x.strokeStyle='#ffffffdd';x.lineWidth=Math.max(1,cs*.22);path();x.stroke();x.globalAlpha=1;
   if(p.alive)drawCycle(p,head[0],head[1]);}
  bits.draw(x);
  x.setTransform(1,0,0,1,0,0);
  // HUD: round pips + boost meters
  for(let i=0;i<2;i++){const bx=i?W-170:16,by=on?44:12;label(x,s.players[i].name.toUpperCase(),i?W-140:16,by+8,13,{fill:COL[i],stroke:'#000',align:i?'right':'left',font:`900 13px ${SANS}`});
   for(let k=0;k<WIN;k++){x.fillStyle=k<wins[i]?COL[i]:'#ffffff22';x.fillRect((i?W-140-(k+1)*14:16+k*14),by+18,10,6);}
   const mw=60;x.fillStyle='#ffffff22';x.fillRect(i?W-140-mw:16,by+28,mw,4);x.fillStyle=COL[i];x.fillRect(i?W-140-mw:16,by+28,mw*G.p[i].boost,4);}
  if(state==='crashing'||state==='between'||on&&state==='play'&&G.p.some(p=>!p.alive))label(x,'DEREZZED',W/2,H*.4,clamp(W*.09,26,64),{fill:'#fff',stroke:'#000'});
  if(state==='between'&&banner)label(x,banner.text,W/2,H*.4+clamp(W*.07,22,50),clamp(W*.05,16,34),{fill:'#ffd23f',stroke:'#000'});
  if(state==='sync')label(x,'WAITING FOR THE GRID…',W/2,H*.4,clamp(W*.05,16,30),{fill:'#7fe8ff',stroke:'#000'});
  scanlines(x,W,H,.1);vignette(x,W,H,.45);
  s.debug={engine:'lightcycle',G,state,wins,round,net:R,bot:on?()=>{netBot=true;return '';}:null};
 });
 const intro=on?`TRON light cycles. You ride the ${me?'orange':'cyan'} cycle; ${s.players[them].name} rides on the other phone. Swipe anywhere to turn so your rival hits a light wall. Hold a finger still to boost. First to three rounds.`:`TRON light cycles. ${s.players[0].name} (cyan) swipes on the LEFT half, ${s.players[1].name} (orange) on the RIGHT. Turn so your rival hits a light wall. Hold a finger still to boost. First to three rounds.`;
 if(!await s.pass(0,intro,'Both ready — enter the grid',{countdown:3}))return;
 setup();if(on)await startRound();else{state='play';t=0;}
}
Object.assign(exports,{lightcycle});
