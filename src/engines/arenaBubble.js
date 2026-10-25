const {clamp,seededRandom}=require("src/utils.js");
const {PCOL,PDARK,PLIGHT,Fx,arenaKeys,arenaTouch,Countdown,banner,outlined,rr,snd,noise,jingle,gestureHint,settle,mmss}=require("src/engines/arenaKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField,roundOutcome}=require("src/engines/netField.js");
// Bubble Battle (after Puzzle Bobble): two mirrored bubble fields with identical bubbles. Drag to aim, release to fire.
// Match three or more to pop, orphans drop and send garbage to the other side. Overflow loses; 90 s decided by score.
// Online (netField): each phone plays its own field wide (fixed 7 columns, danger line at row 14, same seeded rows and
// shots, new rows on the shared clock); the other field is a small copy on the right from snapshots {g,o,sc,in}.
// Garbage goes over as {e:{g:n}} and flies in from that copy. roundOutcome ends it: overflow = die(t, score),
// time-up = timeUp(score); a tie on survival (both still up, or both over within .1 s) goes to the higher score.
const COL=['#ff5a5a','#4fd06a','#4a90ff','#ffd84d','#b47bff','#ff9a3d'],COL_D=['#a82a2a','#1f8a3a','#1c4fb0','#b08a14','#7141c4','#b45a14'];
const TIME=90,PRESS=14,FIRST_PRESS=11,START_ROWS=4,NCOL=5,NET_COLS=7,NET_MAXR=14,SIDE=62;

async function bubble(s){
 const [c,x]=s.canvas(900,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();if(!await settle(s))return;
 const fx=new Fx();let W=s.W,H=s.H;
 const on=s.online||null,me=on?on.me:0,them=1-me,HUDY=on?40:0;
 const rowRnd=seededRandom(s.seed+':bubbleRows'),seqSeed=s.seed+':bubbleSeq';
 const mk=i=>({i,grid:[],off:0,score:0,incoming:0,combo:0,shots:0,flying:null,cool:0,aim:Math.PI/2,aiming:false,cur:0,nxt:0,seq:seededRandom(seqSeed),falling:[],sent:[],dead:false,popped:0,dangerT:0,swapFlash:0,finger:null,shake:0});
 const ps=[mk(0),mk(1)];let phase='intro',clock=TIME,time=0,pressT=FIRST_PRESS,rowQueue=[],note='',phaseT=0,pressWarn=0;
 const intro=new Countdown(3),kb=arenaKeys(s);
 const geo=p=>{
  // online: this phone's field fills the screen left of a SIDE-wide column holding a small copy of the other field
  if(on){const top=Math.min(46,H*.08)+2+HUDY,COLS=NET_COLS;if(p.i===them){const r=(SIDE-10)/(2*COLS),left=W-SIDE+5,rowH=r*1.732;return {half:SIDE,x0:W-SIDE,COLS,r,left,top:top+30,yL:H,rowH,MAXR:NET_MAXR,cx:left+r*COLS,w:2*r*COLS,mini:true};}
   const half=W-SIDE,m=Math.max(4,W*.012),r=Math.min((half-m*2)/(2*COLS),(H-top)/28.8),left=(half-2*r*COLS)/2,rowH=r*1.732;
   return {half,x0:0,COLS,r,left,top,yL:H-r*2.3,rowH,MAXR:NET_MAXR,cx:left+r*COLS,w:2*r*COLS};}
  const half=W/2,m=Math.max(4,W*.012),fieldW=half-m*2,COLS=half<260?6:half<420?7:8,top=Math.min(46,H*.08)+2;
  let r=fieldW/(2*COLS);r=Math.min(r,(H-top)/24.5);const left=p.i*half+(half-2*r*COLS)/2,yL=H-r*2.3,rowH=r*1.732;
  const MAXR=clamp(Math.floor((yL-4*r-top)/rowH)+1,10,16);
  return {half,x0:p.i*half,COLS,r,left,top,yL,rowH,MAXR,cx:left+r*COLS,w:2*r*COLS};
 };
 const shift=(p,row)=>(row+p.off)%2,maxC=(p,g,row)=>shift(p,row)?g.COLS-1:g.COLS;
 const cellXY=(p,g,row,col)=>({x:g.left+g.r+col*2*g.r+shift(p,row)*g.r,y:g.top+g.r+row*g.rowH});
 const nbrs=(p,g,row,col)=>{const out=[[row,col-1],[row,col+1]],s0=shift(p,row);for(const dr of [-1,1]){const r2=row+dr;if(s0===0){out.push([r2,col-1],[r2,col]);}else{out.push([r2,col],[r2,col+1]);}}return out.filter(([a,b])=>a>=0&&b>=0&&b<maxC(p,g,a));};
 const getC=(p,r,c)=>p.grid[r]?.[c]||null;
 const ensureRows=(p,n)=>{while(p.grid.length<n)p.grid.push(Array(12).fill(null));};
 const newRow=(p,g)=>{const arr=rowRnd?rowQueue.shift():null;return arr;};
 // pre-seeded row stream: identical for both players
 const makeRow=idx=>Array.from({length:12},()=>Math.floor(rowRnd()*NCOL));
 const queueRow=n=>{while(rowQueue.length<=n)rowQueue.push(makeRow());};
 const initField=p=>{const g=geo(p);p.grid=[];ensureRows(p,40);queueRow(START_ROWS+2);for(let r=0;r<START_ROWS;r++){const row=rowQueue[r];for(let cc=0;cc<maxC(p,g,r);cc++)p.grid[r][cc]={c:row[cc]};}
  const sr=seededRandom(seqSeed+'x');void sr;p.cur=draw1(p);p.nxt=draw1(p);};
 const present=p=>{const set=new Set();for(const row of p.grid)for(const o of row)if(o&&o.c!==undefined&&!o.g)set.add(o.c);return [...set];};
 const draw1=p=>{const v=Math.floor(p.seq()*1000);const av=present(p);return av.length?av[v%av.length]:v%NCOL;};
 const rowIndexUsed=[0,0];
 for(const p of ps)p.rowPtr=START_ROWS;

 s.hint('Two fields, same bubbles. DRAG anywhere on your half to aim (a dotted guide shows the path), RELEASE to fire. Tap your cannon to swap with the next bubble. Match three or more to pop them; bubbles left hanging fall and send grey garbage to your rival. A new row drops every few seconds; if bubbles reach the red line you lose. After 90 seconds the higher score wins. P1: A/D aim, Space fire, S swap. P2: left/right, Enter, Down.');

 // ------------------------------------------------------------ actions
 const fire=p=>{
  if(p.flying||p.cool>0||phase!=='play'||p.dead||on&&OC?.R.frozen)return;const g=geo(p),sp=g.r*58;
  p.flying={x:g.cx,y:g.yL,vx:Math.cos(p.aim)*sp,vy:-Math.sin(p.aim)*sp,c:p.cur};p.cur=p.nxt;p.nxt=draw1(p);p.cool=.18;p.shots++;snd(420,.1,{type:'triangle',to:820,vol:.04});noise(.05,{vol:.03,freq:2500});
  fx.burst(g.cx,g.yL,{n:5,color:COL[p.flying.c],speed:90,life:.25,size:g.r*.12});
 };
 const swap=p=>{if(phase!=='play'||p.dead||on&&OC?.R.frozen)return;[p.cur,p.nxt]=[p.nxt,p.cur];p.swapFlash=.2;snd(600,.06,{type:'square',vol:.03});};
 const aimAt=(p,px,py)=>{const g=geo(p);const dx=px-g.cx,dy=g.yL-py;let a=Math.atan2(dy,dx);a=clamp(a,.2,Math.PI-.2);if(dy<g.r){a=dx>=0?Math.max(.2,Math.min(a,1.3)):Math.min(Math.PI-.2,Math.max(a,Math.PI-1.3));}p.aim=a;};
 const touch=arenaTouch(s,{maxFingers:1,
  onDown:f=>{const p=ps[f.owner],g=geo(p);p.finger=f.id;p.aiming=true;f.data.onCannon=Math.hypot(f.x-g.cx,f.y-g.yL)<g.r*2.6;aimAt(p,f.x,f.y);},
  onMove:f=>{const p=ps[f.owner];if(p.aiming)aimAt(p,f.x,f.y);},
  onUp:(f,cancelled)=>{const p=ps[f.owner];p.aiming=false;p.finger=null;if(cancelled)return;if(f.moved<12&&f.data.onCannon){swap(p);return;}aimAt(p,f.x,f.y);fire(p);}
 });
 kb.onDown((i,k)=>{const p=ps[i];if(k==='fire')fire(p);if(k==='d')swap(p);});

 // ------------------------------------------------------------ board logic
 const place=(p,b)=>{
  const g=geo(p);let row=Math.max(0,Math.round((b.y-g.top-g.r)/g.rowH)),col;void 0;
  const best=(rw)=>{const sh=shift(p,rw);const cc=Math.round((b.x-g.left-g.r-sh*g.r)/(2*g.r));return clamp(cc,0,maxC(p,g,rw)-1);};
  col=best(row);ensureRows(p,row+3);
  if(getC(p,row,col)){let bd=1e9,bc=null;for(const [r2,c2] of [[row,col],...nbrs(p,g,row,col),[row+1,col],[row+1,col-1],[row+1,col+1]]){if(r2<0||c2<0||c2>=maxC(p,g,r2)||getC(p,r2,c2))continue;const q=cellXY(p,g,r2,c2),d=Math.hypot(q.x-b.x,q.y-b.y);if(d<bd){bd=d;bc=[r2,c2];}}if(!bc)return null;[row,col]=bc;}
  ensureRows(p,row+3);p.grid[row][col]={c:b.c};return [row,col];
 };
 const addScore=(p,n)=>{p.score+=n;};
 const settleShot=(p,b)=>{
  const g=geo(p),cell=place(p,b);if(!cell){return;}
  const [row,col]=cell,color=b.c,seen=new Set([row+','+col]),comp=[[row,col]];
  for(let i=0;i<comp.length;i++){const [a,bb]=comp[i];for(const [r2,c2] of nbrs(p,g,a,bb)){const k=r2+','+c2,o=getC(p,r2,c2);if(!o||o.g||o.c!==color||seen.has(k))continue;seen.add(k);comp.push([r2,c2]);}}
  let popped=0,orphans=0,garb=0;
  if(comp.length>=3){
   p.combo++;popped=comp.length;
   const gset=new Set();for(const [a,bb] of comp)for(const [r2,c2] of nbrs(p,g,a,bb)){const o=getC(p,r2,c2);if(o&&o.g)gset.add(r2+','+c2);}
   for(const [a,bb] of comp)popAt(p,g,a,bb,true);
   for(const k of gset){const [a,bb]=k.split(',').map(Number);popAt(p,g,a,bb,false);garb++;}
   // orphans
   const att=new Set(),q=[];for(let cc=0;cc<maxC(p,g,0);cc++)if(getC(p,0,cc)){att.add('0,'+cc);q.push([0,cc]);}
   for(let i=0;i<q.length;i++){const [a,bb]=q[i];for(const [r2,c2] of nbrs(p,g,a,bb)){const k=r2+','+c2;if(att.has(k)||!getC(p,r2,c2))continue;att.add(k);q.push([r2,c2]);}}
   for(let r=0;r<p.grid.length;r++)for(let cc=0;cc<maxC(p,g,r);cc++){const o=getC(p,r,cc);if(o&&!att.has(r+','+cc)){const xy=cellXY(p,g,r,cc);p.falling.push({x:xy.x,y:xy.y,vx:(Math.random()-.5)*120,vy:-80-Math.random()*80,c:o.c,g:!!o.g,life:1.4});p.grid[r][cc]=null;orphans++;}}
   const pts=popped*10+orphans*25+garb*5+Math.max(0,p.combo-1)*20;addScore(p,pts);
   let send=(popped>3?popped-3:0)+orphans+(p.combo>=3?1:0);
   const xy=cellXY(p,g,row,col);
   fx.pop(xy.x,xy.y,orphans?`+${pts}  DROP ${orphans}!`:p.combo>1?`+${pts}  x${p.combo}`:`+${pts}`,{size:Math.max(13,g.r*.8),color:orphans?'#ffe566':'#fff'});
   fx.ring(xy.x,xy.y,{color:COL[color],r1:g.r*3,life:.35,width:4});fx.shake(2+Math.min(6,popped+orphans));
   jingle([523,659,784,988].slice(0,Math.min(4,popped-1)),{vol:.045,step:.045});if(orphans)noise(.2,{vol:.05,freq:600});
   const cancel=Math.min(send,p.incoming);p.incoming-=cancel;send-=cancel;
   if(send>0)sendGarbage(p,send);
   s.react?.(p.i,'happy');
  }else{
   p.combo=0;
   if(p.incoming>0)dropGarbage(p,g);
  }
  checkLose(p,g);
 };
 const popAt=(p,g,a,bb,score)=>{const o=getC(p,a,bb);if(!o)return;const xy=cellXY(p,g,a,bb);p.grid[a][bb]=null;fx.burst(xy.x,xy.y,{n:score?8:5,color:o.g?'#9aa0b4':COL[o.c],speed:170,life:.5,size:g.r*.14,gravity:260,shape:score?'circle':'square'});p.popped++;};
 const sendGarbage=(p,n)=>{const g=geo(p),o=ps[1-p.i],go=geo(o),from={x:g.cx,y:g.top};for(let k=0;k<Math.min(n,8);k++)p.sent.push({t:-k*.07,from,to:{x:go.cx,y:go.top-4},home:o.i,amt:k===Math.min(n,8)-1?n-Math.min(n,8)+1:1});snd(300,.15,{type:'sawtooth',to:600,vol:.04});if(on&&p.i===me)nf.event({g:n});};
 const pushRow=(p,g,colors,garbageN)=>{
  ensureRows(p,p.grid.length+2);p.grid.pop();p.grid.unshift(Array(12).fill(null));p.off=1-p.off;
  const n=maxC(p,g,0);
  if(colors)for(let cc=0;cc<n;cc++)p.grid[0][cc]={c:colors[cc]};
  else{const idx=[...Array(n).keys()].sort(()=>Math.random()-.5).slice(0,Math.min(n,garbageN));for(const cc of idx)p.grid[0][cc]={c:-1,g:true};}
  // anything now disconnected? (no: row 0 is the ceiling)
  fx.shake(4);noise(.12,{vol:.05,freq:400});
 };
 const dropGarbage=(p,g)=>{const n=Math.min(p.incoming,maxC(p,g,0)+1);p.incoming-=n;pushRow(p,g,null,n);fx.pop(g.cx,g.top+g.r*3,`GARBAGE x${n}`,{size:Math.max(13,g.r*.8),color:'#c8cde0'});snd(110,.2,{type:'sawtooth',to:60,vol:.06});s.react?.(p.i,'sad');};
 const checkLose=(p,g)=>{
  for(let r=g.MAXR;r<p.grid.length;r++)if(p.grid[r].some(o=>o)){p.dead=true;if(on){OC?.die(rt(),p.score);nf.push();}else end(1-p.i,'overflow');return;}
 };
 const end=(w,why)=>{if(phase==='over')return;phase='over';phaseT=2.8;
  if(w<0){note='A TIE!';}else{note=`${s.players[w].name} wins!`;s.react?.(w,'win');s.react?.(1-w,'sad');}
  s.debug.why=why;jingle([523,659,784,1047,1319],{vol:.05,step:.08});};

 // ------------------------------------------------------------ update
 const flyStep=(p,dt)=>{
  const b=p.flying;if(!b)return;const g=geo(p),steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/(g.r*.35))),h=dt/steps;
  for(let k=0;k<steps;k++){
   b.x+=b.vx*h;b.y+=b.vy*h;
   if(b.x<g.left+g.r){b.x=g.left+g.r;b.vx=Math.abs(b.vx);snd(500,.04,{type:'triangle',vol:.02});}else if(b.x>g.left+g.w-g.r){b.x=g.left+g.w-g.r;b.vx=-Math.abs(b.vx);snd(500,.04,{type:'triangle',vol:.02});}
   let hit=b.y<=g.top+g.r*1.05;
   if(!hit)for(let r=0;r<p.grid.length&&!hit;r++){const row=p.grid[r];for(let cc=0;cc<maxC(p,g,r);cc++){if(!row[cc])continue;const q=cellXY(p,g,r,cc);if(Math.hypot(q.x-b.x,q.y-b.y)<g.r*1.8){hit=true;break;}}}
   if(hit){p.flying=null;settleShot(p,b);return;}
  }
 };
 const pressure=()=>{
  queueRow(ps[0].rowPtr+1);const row=rowQueue[ps[0].rowPtr];ps[0].rowPtr++;ps[1].rowPtr=ps[0].rowPtr;
  for(const p of ps){if(p.dead||on&&p.i!==me)continue;const g=geo(p);pushRow(p,g,row,0);checkLose(p,g);}
  fx.pop(W/2,Math.min(46,H*.08)+30,'NEW ROW!',{size:Math.max(14,W*.03),color:'#ffb347'});snd(150,.25,{type:'square',to:80,vol:.05});
 };
 // vs CPU: shooter 2 picks the lowest exposed bubble of its colour in the biggest group, swaps if the next bubble is better, and fires
 const cpu=isCpu(s);let cpuT=1.2;
 function cpuThink(dt,i=1){const p=ps[i],sk=cpuSkill(s);if(phase!=='play'||p.dead||p.flying||on&&OC?.R.frozen)return;cpuT-=dt;if(cpuT>0)return;cpuT=.55+(1-sk)*.9+Math.random()*.3;const g=geo(p);
  const pickFor=col=>{let best=null,bv=-1;for(let r=0;r<p.grid.length;r++)for(let cc=0;cc<maxC(p,g,r);cc++){const o=getC(p,r,cc);if(!o||o.c!==col)continue;const open=nbrs(p,g,r,cc).some(([a,b])=>!getC(p,a,b)&&a>r)||r===p.grid.findLastIndex(row=>row.some(Boolean));if(!open)continue;let n=0;for(const [a,b] of nbrs(p,g,r,cc))if(getC(p,a,b)?.c===col)n++;const q=cellXY(p,g,r,cc);let clear=true;for(let t=.05;t<.92&&clear;t+=.05){const sx=g.cx+(q.x-g.cx)*t,sy=g.yL+(q.y-g.yL)*t;for(let r2=0;r2<p.grid.length&&clear;r2++)for(let c2=0;c2<maxC(p,g,r2);c2++){if(r2===r&&c2===cc||!getC(p,r2,c2))continue;const q2=cellXY(p,g,r2,c2);if(Math.hypot(q2.x-sx,q2.y-sy)<g.r*1.7){clear=false;break;}}}if(!clear&&Math.random()<.5+sk*.5)continue;const v=n*3+r+Math.random()*(1-sk)*4;if(v>bv){bv=v;best={r,cc};}}return best?{...best,v:bv}:null;};
  let t=pickFor(p.cur);const alt=pickFor(p.nxt);if(alt&&(!t||alt.v>t.v+2)&&Math.random()<sk){swap(p);t=alt;}
  const q=t?cellXY(p,g,t.r,t.cc):{x:g.cx+(Math.random()-.5)*g.w*.6,y:g.top};const err=(1-sk)*g.r*1.6;aimAt(p,q.x+(Math.random()-.5)*err,q.y+g.r*.8);fire(p);}
 // ------------------------------------------------------------ online
 let OC=null,playT0=0,netBot=false;const pendO=[];const rt=()=>(performance.now()-playT0)/1000;
 const CH='0123456789';
 const nf=netField(s,{hz:8,
  pack:()=>{const p=ps[me],g=geo(p);return {g:p.grid.slice(0,g.MAXR+1).map((row,r)=>row.slice(0,maxC(p,g,r)).map(o=>!o?'.':o.g?'x':CH[o.c]||'0').join('')),o:p.off,sc:p.score,in:p.incoming,d:p.dead?1:0};},
  unpack:(i,d)=>{const p=ps[them];if(!Array.isArray(d?.g))return;p.off=d.o?1:0;p.score=+d.sc||0;p.incoming=+d.in||0;p.dead=!!d.d;
   p.grid=d.g.map(row=>{const out=Array(12).fill(null);[...String(row)].slice(0,12).forEach((ch,k)=>{if(ch==='x')out[k]={c:-1,g:true};else if(ch!=='.')out[k]={c:clamp(CH.indexOf(ch),0,COL.length-1)};});return out;});ensureRows(p,40);},
  onEvent:e=>{if(Array.isArray(e.o)){if(OC)OC.feed(e.o);else pendO.push(e.o);return;}
   if(Number.isInteger(e.g)&&e.g>0&&e.g<40){const g=geo(ps[them]),go=geo(ps[me]),n=e.g,k8=Math.min(n,8);for(let k=0;k<k8;k++)ps[them].sent.push({t:-k*.07,from:{x:g.cx,y:g.top},to:{x:go.cx,y:go.top-4},home:me,amt:k===k8-1?n-k8+1:1});snd(300,.15,{type:'sawtooth',to:600,vol:.04});}}});
 const netResult=()=>{const R=OC.R,res=R.result,sc=[0,0];sc[me]=+R.extra||0;sc[them]=+R.theirExtra||0;ps[me].score=sc[me];ps[them].score=sc[them];
  const w=res==='me'?me:res==='them'?them:sc[0]===sc[1]?-1:sc[0]>sc[1]?0:1;netWin=w;end(w,res==='none'?'time':'overflow');};
 let netWin=null;
 const update=dt=>{if(cpu)cpuThink(dt);if(netBot)cpuThink(dt,me);
  time+=dt;fx.update(dt);
  if(phase==='intro'){if(!intro.update(dt)){phase='play';if(on){playT0=performance.now();OC=roundOutcome(nf,1);for(const o of pendO.splice(0))OC.feed(o);}}}
  else if(phase==='play'&&on){
   clock=Math.max(0,clock-dt);if(!OC.R.frozen){pressT-=dt;pressWarn=pressT<1.2?1:0;if(pressT<=0){pressT=PRESS;pressure();}}
   if(clock<=0)OC.timeUp(ps[me].score);if(OC.tick(rt(),()=>ps[me].score))netResult();nf.tick(dt);}
  else if(phase==='play'){
   clock-=dt;pressT-=dt;pressWarn=pressT<1.2?1:0;if(pressT<=0){pressT=PRESS;pressure();}
   if(clock<=0){clock=0;const a=ps[0].score,b=ps[1].score;end(a===b?-1:a>b?0:1,'time');}
  }else if(phase==='over'){phaseT-=dt;if(phaseT<=0){const sc=[ps[0].score,ps[1].score],w=on?netWin:ps[0].dead?1:ps[1].dead?0:sc[0]===sc[1]?-1:sc[0]>sc[1]?0:1;if(w>=0&&sc[w]<=sc[1-w])sc[w]=sc[1-w]+1;s.finish(sc,`Bubble Battle: ${ps[0].score} to ${ps[1].score}${ps[0].dead||ps[1].dead?' (overflow)':''}`);return;}}
  for(const p of ps){
   p.cool=Math.max(0,p.cool-dt);p.swapFlash=Math.max(0,p.swapFlash-dt);
   const k=kb.state[p.i];if(k.l||k.r){p.aim=clamp(p.aim+(k.l-k.r)*1.7*dt,.2,Math.PI-.2);}
   if((phase==='play'||phase==='over')&&!(on&&p.i!==me))flyStep(p,dt);
   for(const f of p.falling){f.vy+=900*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.life-=dt;}p.falling=p.falling.filter(f=>f.life>0&&f.y<H+40);
   for(const e of p.sent){e.t+=dt*1.8;}
   for(const e of p.sent)if(e.t>=1&&!e.done){e.done=true;if(!on||e.home===me)ps[e.home].incoming+=e.amt;}
   p.sent=p.sent.filter(e=>!e.done);
   // danger
   const g=geo(p);let low=0;for(let r=0;r<p.grid.length;r++)if(p.grid[r].some(o=>o))low=r;p.dangerT=low>=g.MAXR-3?1:0;
  }
  s.setScores([ps[0].score,ps[1].score]);
 };

 // ------------------------------------------------------------ draw
 const bub=(px,py,r,c,gar)=>{
  if(gar){const gr=x.createRadialGradient(px-r*.3,py-r*.3,r*.1,px,py,r);gr.addColorStop(0,'#c9cddc');gr.addColorStop(1,'#5c6176');x.fillStyle=gr;x.beginPath();x.arc(px,py,r*.95,0,6.283);x.fill();x.strokeStyle='#2c3042';x.lineWidth=Math.max(1.5,r*.1);x.stroke();x.strokeStyle='#3a3f56';x.lineWidth=r*.16;x.beginPath();x.moveTo(px-r*.4,py-r*.4);x.lineTo(px+r*.4,py+r*.4);x.moveTo(px+r*.4,py-r*.4);x.lineTo(px-r*.4,py+r*.4);x.stroke();return;}
  const gr=x.createRadialGradient(px-r*.32,py-r*.34,r*.08,px,py,r);gr.addColorStop(0,'#ffffff');gr.addColorStop(.22,COL[c]);gr.addColorStop(1,COL_D[c]);x.fillStyle=gr;x.beginPath();x.arc(px,py,r*.96,0,6.283);x.fill();x.strokeStyle=COL_D[c];x.lineWidth=Math.max(1.2,r*.08);x.stroke();
  x.fillStyle='#ffffffcc';x.beginPath();x.ellipse(px-r*.32,py-r*.38,r*.26,r*.15,-.7,0,6.283);x.fill();
 };
 const aimPath=(p,g)=>{
  const pts=[],sp=1;let px=g.cx,py=g.yL,vx=Math.cos(p.aim),vy=-Math.sin(p.aim),len=0;pts.push([px,py]);
  for(let i=0;i<500&&len<g.r*70;i++){const st=g.r*.5;px+=vx*st;py+=vy*st;len+=st;if(px<g.left+g.r){px=g.left+g.r;vx=Math.abs(vx);pts.push([px,py]);}else if(px>g.left+g.w-g.r){px=g.left+g.w-g.r;vx=-Math.abs(vx);pts.push([px,py]);}
   if(py<=g.top+g.r)break;let hit=false;for(let r=0;r<p.grid.length&&!hit;r++){if(!p.grid[r].some(o=>o))continue;for(let cc=0;cc<maxC(p,g,r);cc++){if(!p.grid[r][cc])continue;const q=cellXY(p,g,r,cc);if(Math.hypot(q.x-px,q.y-py)<g.r*1.8){hit=true;break;}}}if(hit)break;}
  pts.push([px,py]);void sp;return pts;
 };
 const drawField=p=>{
  const g=geo(p),i=p.i;x.save();x.beginPath();x.rect(g.x0,0,g.half,H);x.clip();
  const bg=x.createLinearGradient(0,g.top,0,H);bg.addColorStop(0,i?'#2a1840':'#16284a');bg.addColorStop(1,i?'#1a0f2c':'#0d1830');x.fillStyle=bg;x.fillRect(g.x0,0,g.half,H);
  x.fillStyle='#ffffff08';for(let k=0;k<10;k++){x.beginPath();x.arc(g.left+((k*83)%g.w),g.top+((k*131+time*8)%(H-g.top)),g.r*(1+(k%3)*.6),0,6.283);x.fill();}
  // well
  rr(x,g.left-3,g.top-2,g.w+6,H-g.top+2,6);x.fillStyle='#00000040';x.fill();x.strokeStyle=PCOL[i]+'aa';x.lineWidth=3;x.stroke();
  // ceiling
  x.fillStyle=pressWarn&&Math.floor(time*8)%2?'#ff8a4a':'#8a90b8';x.fillRect(g.left-3,g.top-4,g.w+6,5);
  // danger line
  const dy=g.top+g.r+(g.MAXR-1)*g.rowH+g.r*1.1;x.strokeStyle=p.dangerT?(Math.floor(time*6)%2?'#ff3b3b':'#ff9a9a'):'#ff6a6a66';x.lineWidth=2.5;x.setLineDash([8,6]);x.beginPath();x.moveTo(g.left,dy);x.lineTo(g.left+g.w,dy);x.stroke();x.setLineDash([]);
  for(let r=0;r<p.grid.length;r++){const row=p.grid[r];if(!row.some(o=>o))continue;for(let cc=0;cc<maxC(p,g,r);cc++){const o=row[cc];if(!o)continue;const q=cellXY(p,g,r,cc);bub(q.x,q.y,g.r,o.c,o.g);}}
  for(const f of p.falling){x.globalAlpha=clamp(f.life,0,1);bub(f.x,f.y,g.r,f.c,f.g);}x.globalAlpha=1;
  // aim guide
  if(phase==='play'&&!p.dead&&(p.aiming||time<9||true)){const pts=aimPath(p,g);x.strokeStyle=COL[p.cur]+(p.aiming?'ee':'66');x.lineWidth=Math.max(2,g.r*.14);x.setLineDash([g.r*.35,g.r*.55]);x.beginPath();pts.forEach(([a,b],k)=>k?x.lineTo(a,b):x.moveTo(a,b));x.stroke();x.setLineDash([]);}
  // flying
  if(p.flying)bub(p.flying.x,p.flying.y,g.r,p.flying.c);
  // cannon
  x.save();x.translate(g.cx,g.yL);x.fillStyle='#00000040';x.beginPath();x.ellipse(0,g.r*.9,g.r*2.1,g.r*.6,0,0,6.283);x.fill();
  x.rotate(Math.PI/2-p.aim);x.fillStyle=PDARK[i];rr(x,-g.r*.6,-g.r*2.5,g.r*1.2,g.r*2.4,g.r*.3);x.fill();x.fillStyle=PCOL[i];rr(x,-g.r*.45,-g.r*2.4,g.r*.9,g.r*2.1,g.r*.25);x.fill();x.fillStyle='#fff6';x.fillRect(-g.r*.3,-g.r*2.3,g.r*.18,g.r*1.9);x.restore();
  x.fillStyle=PDARK[i];x.beginPath();x.arc(g.cx,g.yL,g.r*1.55,0,6.283);x.fill();x.fillStyle=PCOL[i];x.beginPath();x.arc(g.cx,g.yL,g.r*1.3,0,6.283);x.fill();
  if(!p.flying||true)bub(g.cx,g.yL,g.r*(p.swapFlash>0?1.2:1),p.cur);
  // player head + next bubble
  const nx=i?g.cx-g.r*4.2:g.cx+g.r*4.2;bub(nx,g.yL+g.r*.3,g.r*.75,p.nxt);outlined(x,'NEXT',nx,g.yL-g.r*.9,{size:Math.max(8,g.r*.5),fill:'#fff',stroke:'#0a0a1a',lw:2});
  s.sprite(x,i,i?g.cx+g.r*4.4:g.cx-g.r*4.4,g.yL,Math.min(g.r*3,g.half*.2),{exact:true,mood:p.dead?'sad':p.combo>1?'win':'walking'});
  // incoming garbage tray
  const ty=g.top-1;x.fillStyle='#0008';x.fillRect(g.left,ty-g.r*.9-2,g.w,g.r*.9+2);
  for(let k=0;k<Math.min(p.incoming,g.COLS);k++){bub(g.left+g.r*.7+k*g.r*1.5,ty-g.r*.5,g.r*.45,0,true);}if(p.incoming>g.COLS)outlined(x,`+${p.incoming}`,g.left+g.w-g.r,ty-g.r*.5,{size:Math.max(9,g.r*.6),fill:'#ffb3a8',stroke:'#0a0a1a',lw:2,align:'right'});
  if(p.dead){x.fillStyle='#000a';x.fillRect(g.x0,0,g.half,H);outlined(x,'OVERFLOW!',g.cx,H*.45,{size:Math.max(16,g.half*.1),fill:'#ff8a7a',stroke:'#220'});}
  x.restore();
 };
 // online: the other field as a small copy in the right-hand column
 const drawMini=p=>{
  const g=geo(p);x.save();x.fillStyle='#120b22';x.fillRect(g.x0,0,g.half,H);
  outlined(x,s.players[p.i].name.toUpperCase().slice(0,8),g.cx,g.top-20,{size:11,fill:PLIGHT[p.i],stroke:'#0a0814',lw:2});
  const hh=g.r+(g.MAXR-1)*g.rowH+g.r*1.1;rr(x,g.left-3,g.top-2,g.w+6,hh+6,4);x.fillStyle='#00000055';x.fill();x.strokeStyle=PCOL[p.i]+'aa';x.lineWidth=2;x.stroke();
  for(let r=0;r<Math.min(p.grid.length,g.MAXR+1);r++){const row=p.grid[r];for(let cc=0;cc<maxC(p,g,r);cc++){const o=row[cc];if(!o)continue;const q=cellXY(p,g,r,cc);x.fillStyle=o.g?'#8a8fa6':COL[o.c];x.beginPath();x.arc(q.x,q.y,g.r*.92,0,6.283);x.fill();}}
  x.strokeStyle=p.dangerT&&Math.floor(time*6)%2?'#ff3b3b':'#ff6a6a88';x.lineWidth=1.5;x.beginPath();x.moveTo(g.left,g.top+hh);x.lineTo(g.left+g.w,g.top+hh);x.stroke();
  if(p.incoming>0)outlined(x,`+${p.incoming}`,g.cx,g.top+hh+16,{size:12,fill:'#c8cde0',stroke:'#0a0814',lw:2});
  if(p.dead)outlined(x,'OVER',g.cx,g.top+hh/2,{size:14,fill:'#ff8a7a',stroke:'#220',lw:3});
  x.restore();
 };
 const draw=()=>{
  x.clearRect(0,0,W,H);fx.begin(x);x.fillStyle='#0a0814';x.fillRect(0,0,W,H);
  for(const p of ps)if(on&&p.i===them)drawMini(p);else drawField(p);
  // garbage in flight
  for(const p of ps)for(const e of p.sent){if(e.t<0)continue;const t=clamp(e.t,0,1),px=e.from.x+(e.to.x-e.from.x)*t,py=e.from.y+(e.to.y-e.from.y)*t-Math.sin(t*Math.PI)*H*.12;const g=geo(p);x.globalAlpha=.95;bub(px,py,g.r*.8,0,true);x.globalAlpha=1;}
  fx.draw(x);fx.end(x);
  const top=Math.min(46,H*.08),fs=clamp(top*.5,11,19),cy=HUDY+top/2;x.fillStyle='#0a0814';x.fillRect(0,0,W,top+HUDY);
  if(on){const gm=geo(ps[me]),gt=geo(ps[them]);outlined(x,String(ps[me].score),gm.left+gm.w*.2,cy,{size:fs*1.3,fill:PLIGHT[me],stroke:'#0a0814'});outlined(x,String(ps[them].score),gt.cx,cy,{size:fs*1.1,fill:PLIGHT[them],stroke:'#0a0814'});outlined(x,mmss(clock),gm.left+gm.w*.62,cy,{size:fs*1.2,fill:clock<10?'#ff8a7a':'#fff',stroke:'#0a0814'});}
  else{outlined(x,String(ps[0].score),W*.25,cy,{size:fs*1.3,fill:PLIGHT[0],stroke:'#0a0814'});outlined(x,String(ps[1].score),W*.75,cy,{size:fs*1.3,fill:PLIGHT[1],stroke:'#0a0814'});
   outlined(x,mmss(clock),W/2,cy,{size:fs*1.2,fill:clock<10?'#ff8a7a':'#fff',stroke:'#0a0814'});
   x.strokeStyle='#ffffff22';x.lineWidth=2;x.beginPath();x.moveTo(W/2,top);x.lineTo(W/2,H);x.stroke();}
  if(on&&phase==='play'&&OC?.R.frozen)banner(x,W,H,ps[me].dead?'OVERFLOW!':'TIME!',`waiting for ${s.players[them].name}…`,{color:'#ffe566',size:Math.min(W*.08,48)});
  if(phase==='intro'||time<8){for(const p of ps){if(on&&p.i!==me)continue;const g=geo(p);if(phase!=='over'){gestureHint(x,g.cx,g.yL-g.r*7,'flick',time,{color:PLIGHT[p.i],size:g.r*1.1});outlined(x,'DRAG TO AIM · RELEASE TO FIRE',g.cx,g.yL-g.r*9.5,{size:Math.max(9,g.r*.75),fill:PLIGHT[p.i],stroke:'#0a0814',alpha:clamp(1-time/8,0,1)});}}}
  if(phase==='intro')intro.draw(x,W,H);
  if(phase==='over')banner(x,W,H,note,`${ps[0].score} – ${ps[1].score}`,{color:'#ffe566'});
 };
 s.debug={engine:'bubble',ps,fx,touch,kb,geo,cellXY,get phase(){return phase;},get clock(){return clock;},bot:on?()=>{netBot=true;return '';}:null,get oc(){return OC?.R;}};
 initField(ps[0]);initField(ps[1]);draw();
 if(!await s.pass(0,on?`Bubble Battle online: you shoot the ${me?'pink':'blue'} field; ${s.players[them].name} plays the same bubbles on the other phone (their field is the small one on the right). Drag to aim, release to fire, match three. Dropped bubbles send garbage over. Don’t overflow!`:'Bubble Battle: Puzzle Bobble head to head. Drag to aim, release to fire, match three. Dropped bubbles send garbage to your rival. Don’t overflow!','Both ready — pop!'))return;
 if(on){await nf.start('go');if(!s.alive)return;}
 s.frame(dt=>{
  if(s.W!==W||s.H!==H){W=s.W;H=s.H;touch.clear();for(const p of ps){p.flying=null;p.falling=[];}}
  update(Math.min(dt,.033));draw();
  s.status(`${s.players[0].name} ${ps[0].score} · ${s.players[1].name} ${ps[1].score} · ${Math.ceil(clock)}s`);
 });
}
Object.assign(exports,{bubble});
