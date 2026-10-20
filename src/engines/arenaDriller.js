const {clamp}=require("src/utils.js");
const {PCOL,PDARK,PLIGHT,Fx,arenaKeys,arenaTouch,Countdown,banner,outlined,rr,heart,snd,noise,jingle,gestureHint,settle,mmss}=require("src/engines/arenaKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
// Driller Duel (after Mr. Driller): two identical shafts side by side. Drag to walk, tap beside you to drill sideways, hold
// on your own column to drill down. Four same-colour blocks that touch pop; blocks fall (and crush); air drains.
let COLS=7;const GOAL=120,TIME=75,LIVES=3,COLORS=['#ff5a5a','#4fd06a','#4a90ff','#ffd84d','#b47bff'],COLORS_D=['#b32d2d','#238a3b','#1f55b8','#b8921a','#7a45c4'];
const DRILL=.24,STEP=.085,FALL=.075,WARN=.42;

function genLayout(rnd){
 const rows=[],ROWS=GOAL+6;let airIn=5;
 for(let r=0;r<ROWS;r++){
  const row=[];
  for(let c=0;c<COLS;c++){
   let cell;const hardP=r<6?0:Math.min(.3,.06+r*.0022);
   if(rnd()<hardP)cell={k:'hard',hp:3,c:0};
   else{const nc=r<8?4:5;let col,tries=0;do{col=Math.floor(rnd()*nc);tries++;}while(tries<8&&compSize(rows,row,r,c,col)>=4);cell={k:'blk',c:col};}
   row.push(cell);
  }
  rows.push(row);airIn--;if(airIn<=0&&r>2){airIn=7+Math.floor(rnd()*4);const c=Math.floor(rnd()*COLS);row[c]={k:'air',c:0};}
 }
 rows.push(Array.from({length:COLS},()=>({k:'bed',c:0})));
 return rows;
}
function compSize(rows,cur,r,c,col){
 const get=(rr_,cc)=>rr_===r?(cc<c?cur[cc]:cc===c?{k:'blk',c:col}:null):rows[rr_]?.[cc];
 const seen=new Set([r+','+c]),q=[[r,c]];let n=0;
 while(q.length){const [a,b]=q.pop();n++;for(const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]]){const y=a+dy,xx=b+dx,k=y+','+xx;if(xx<0||xx>=COLS||y<0||y>r||seen.has(k))continue;const o=get(y,xx);if(o&&o.k==='blk'&&o.c===col){seen.add(k);q.push([y,xx]);}}}
 return n;
}

async function driller(s){
 const [c,x]=s.canvas(900,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();if(!await settle(s))return;
 const fx=new Fx(),rnd=s.random;let W=s.W,H=s.H;
 COLS=W/2<260?6:7;const base=genLayout(rnd);
 const mkP=i=>({i,grid:base.map(row=>row.map(cell=>({...cell,wait:0,fall:false,oy:0}))),pr:-1,pc:Math.floor(COLS/2),fx:0,air:100,lives:LIVES,act:0,fallT:0,inv:0,stun:0,dir:'d',cam:-4,depth:0,score:0,chain:0,joy:null,combo:0,dead:false,done:false,lowT:0,oy:0,ox:0,tx:Math.floor(COLS/2),hold:null,blocksPopped:0,face:1});
 const ps=[mkP(0),mkP(1)];let phase='intro',clock=TIME,time=0,note='',phaseT=0,winner=-1;
 const intro=new Countdown(3),kb=arenaKeys(s);
 const L=p=>{const half=W/2,top=Math.min(44,H*.08),cell=Math.max(14,Math.floor(Math.min(half*.9/COLS,(H-top-6)/9))),sw=cell*COLS,x0=p.i*half+(half-sw)/2;return {half,top,cell,sw,x0,vis:Math.ceil((H-top)/cell)+2};};
 const at=(p,r,cc)=>{if(cc<0||cc>=COLS)return {k:'wall'};if(r<0)return null;return p.grid[r]?p.grid[r][cc]:{k:'bed'};};
 const solidC=(p,r,cc)=>{const o=at(p,r,cc);return !!o;};
 s.hint('Two shafts, same blocks. DRAG to walk your driller. TAP beside it to drill sideways, TAP or HOLD on its own column to drill down. Four or more same-colour blocks that touch pop when they land. Blocks you undermine fall after a wobble and will crush you: step aside! Grab AIR capsules, hard brown blocks cost air. First to 120 m, or deepest at 75 s. P1: A/D walk, S drill down; P2: arrows, Down drills.');

 // -------------------------------------------------------- block physics
 const recompute=p=>{
  const g=p.grid,R=g.length,gid=Array.from({length:R},()=>Array(COLS).fill(-1)),groups=[];
  for(let r=0;r<R;r++)for(let cc=0;cc<COLS;cc++){const o=g[r][cc];if(!o||gid[r][cc]>=0)continue;const id=groups.length,cells=[[r,cc]];gid[r][cc]=id;
   if(o.k==='blk')for(let i=0;i<cells.length;i++){const [a,b]=cells[i];for(const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]]){const y=a+dy,xx=b+dx;if(y<0||y>=R||xx<0||xx>=COLS||gid[y][xx]>=0)continue;const q=g[y][xx];if(q&&q.k==='blk'&&q.c===o.c){gid[y][xx]=id;cells.push([y,xx]);}}}
   groups.push({id,cells,stable:o.k==='bed'});}
  let ch=true;while(ch){ch=false;for(const gr of groups){if(gr.stable)continue;for(const [a,b] of gr.cells){const below=g[a+1]?.[b];if(below&&gid[a+1][b]!==gr.id&&groups[gid[a+1][b]].stable){gr.stable=true;ch=true;break;}}}}
  return {groups,gid};
 };
 const stepFalls=(p,allowMove)=>{
  const {groups,gid}=recompute(p),g=p.grid;
  const landed=[];
  for(const gr of groups)if(gr.stable)for(const [a,b] of gr.cells){const o=g[a][b];if(o.fall){o.fall=false;landed.push([a,b]);}if(o.warned){o.warned=false;o.wait=0;}}
  if(landed.length)popCheck(p,landed);
  const falling=groups.filter(gr=>!gr.stable);
  falling.sort((u,v)=>Math.max(...v.cells.map(q=>q[0]))-Math.max(...u.cells.map(q=>q[0])));
  for(const gr of falling){
   if(!gr.cells.every(([a,b])=>g[a][b]))continue;
   const cs=gr.cells.map(([a,b])=>g[a][b]);
   if(!cs.some(o=>o.fall)){
    if(!cs.some(o=>o.warned)){for(const o of cs){o.warned=true;o.wait=WARN;}continue;}
    if(cs.some(o=>o.wait>0))continue;
   }
   if(!allowMove)continue;
   const inG=new Set(gr.cells.map(q=>q[0]+','+q[1]));let free=true;
   for(const [a,b] of gr.cells){if(!inG.has((a+1)+','+b)&&g[a+1]?.[b]){free=false;break;}}
   if(!free)continue;
   if(!p.dead&&gr.cells.some(([a,b])=>a+1===p.pr&&b===p.pc))crush(p);
   if(!gr.cells.every(([a,b])=>g[a][b]))continue;
   gr.cells.sort((u,v)=>v[0]-u[0]);
   for(const [a,b] of gr.cells){const o=g[a][b];g[a][b]=null;o.fall=true;o.oy=-1;g[a+1][b]=o;}
  }
  void gid;
 };
 const popCheck=(p,cells)=>{
  const g=p.grid,seen=new Set();let total=0;
  for(const [a,b] of cells){const o=g[a][b];if(!o||o.k!=='blk'||seen.has(a+','+b))continue;
   const comp=[[a,b]],ks=new Set([a+','+b]);for(let i=0;i<comp.length;i++){const [y,xx]=comp[i];for(const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]]){const yy=y+dy,x2=xx+dx,k=yy+','+x2;if(x2<0||x2>=COLS||ks.has(k))continue;const q=g[yy]?.[x2];if(q&&q.k==='blk'&&q.c===o.c){ks.add(k);comp.push([yy,x2]);}}}
   for(const k of ks)seen.add(k);
   if(comp.length>=4){p.combo++;total+=comp.length;const l=L(p);for(const [y,xx] of comp){const q=g[y][xx];burstAt(p,y,xx,COLORS[q.c],7);g[y][xx]=null;}
    p.score+=comp.length*10*p.combo;const mid=comp[0];popText(p,mid[0],mid[1],p.combo>1?`${comp.length} · CHAIN x${p.combo}!`:`POP ${comp.length}`);
    jingle([523+p.combo*70,659+p.combo*70,784+p.combo*70].slice(0,Math.min(3,1+comp.length-3)),{vol:.045,step:.05});fx.shake(2+p.combo*1.5);p.blocksPopped+=comp.length;void l;}}
  if(!total&&!pendingFalls(p))p.combo=0;
 };
 const pendingFalls=p=>{const {groups}=recompute(p);return groups.some(gr=>!gr.stable);};
 const burstAt=(p,r,cc,col,n)=>{const l=L(p),px=l.x0+(cc+.5)*l.cell,py=l.top+(r-p.cam+.5)*l.cell;fx.burst(px,py,{n,color:col,speed:170,life:.5,size:l.cell*.12,gravity:300,shape:'square'});};
 const popText=(p,r,cc,t)=>{const l=L(p);fx.pop(l.x0+(cc+.5)*l.cell,l.top+(r-p.cam)*l.cell,t,{size:Math.max(13,l.cell*.45),color:'#fff'});};
 const crush=p=>{
  if(p.inv>0||p.dead)return;p.lives--;p.inv=2;p.stun=.7;p.air=Math.max(p.air,40);const l=L(p);
  fx.burst(l.x0+(p.pc+.5)*l.cell,l.top+(p.pr-p.cam+.5)*l.cell,{n:30,colors:[PCOL[p.i],'#fff','#ffd84d'],speed:260,life:.7,size:l.cell*.12,gravity:300,shape:'star'});fx.shake(12);noise(.3,{vol:.1,freq:300});snd(120,.3,{type:'sawtooth',to:40,vol:.07});s.react?.(p.i,'sad');
  popText(p,p.pr-1,p.pc,'CRUSHED!');
  // clear a pocket so the driller can go on
  for(const [dr,dc] of [[0,0],[-1,0]]){const o=p.grid[p.pr+dr]?.[p.pc+dc];if(o&&o.k!=='bed')p.grid[p.pr+dr][p.pc+dc]=null;}
  if(p.lives<=0)knockOut(p);
 };
 const knockOut=p=>{p.dead=true;fx.pop(L(p).x0+L(p).sw/2,H*.4,'OUT!',{size:30,color:'#ff8a7a'});};

 // -------------------------------------------------------- actions
 const drill=(p,dir)=>{
  if(p.act>0||p.stun>0||p.dead||phase!=='play')return false;
  const dr=dir==='d'?1:0,dc=dir==='l'?-1:dir==='r'?1:0,tr=p.pr+dr,tc=p.pc+dc;p.dir=dir;if(dc)p.face=dc;
  if(tc<0||tc>=COLS)return false;const o=at(p,tr,tc);if(!o)return false;
  if(o.k==='bed'){return false;}
  p.act=o.k==='hard'?DRILL*1.15:DRILL;const l=L(p),px=l.x0+(tc+.5)*l.cell,py=l.top+(tr-p.cam+.5)*l.cell;
  if(o.k==='hard'){o.hp--;p.air=Math.max(0,p.air-5);fx.burst(px,py,{n:6,color:'#c9a27a',speed:140,life:.3,size:l.cell*.08,gravity:200});noise(.08,{vol:.05,freq:500});snd(110,.07,{type:'square',vol:.04});fx.pop(px,py-l.cell*.3,'-5',{size:l.cell*.3,color:'#9ad8ff',life:.5,rise:20});
   if(o.hp<=0){p.grid[tr][tc]=null;burstAt(p,tr,tc,'#7a4a2b',10);}return true;}
  if(o.k==='air'){p.air=Math.min(100,p.air+30);p.grid[tr][tc]=null;jingle([880,1175,1568],{vol:.05,step:.06});fx.ring(px,py,{color:'#9ad8ff',r1:l.cell*2,life:.4});fx.burst(px,py,{n:14,color:'#9ad8ff',speed:150,life:.5,size:l.cell*.1,gravity:-60});fx.pop(px,py-l.cell*.4,'+AIR',{size:l.cell*.45,color:'#9ad8ff'});return true;}
  p.grid[tr][tc]=null;burstAt(p,tr,tc,COLORS[o.c],5);noise(.06,{vol:.045,freq:900+dr*400});snd(dir==='d'?200:260,.05,{type:'square',vol:.025});
  return true;
 };
 const moveSide=(p,d,push)=>{
  if(p.act>0||p.stun>0||p.dead||phase!=='play')return;const tc=p.pc+d;if(tc<0||tc>=COLS)return;p.face=d;
  const o=at(p,p.pr,tc);
  if(!o){p.pc=tc;p.ox=-d;p.act=STEP;return;}
  if(!at(p,p.pr-1,p.pc)&&!at(p,p.pr-1,tc)&&o.k!=='bed'){p.pr--;p.pc=tc;p.ox=-d;p.oy=1;p.act=STEP*1.4;return;}
  if(push)drill(p,d>0?'r':'l');
 };
 const touch=arenaTouch(s,{
  maxFingers:1,
  onDown:f=>{const p=ps[f.owner];p.hold=f;},
  onUp:(f,cancelled)=>{const p=ps[f.owner];p.hold=null;if(cancelled||phase!=='play')return;const l=L(p),col=clamp(Math.floor((f.x-l.x0)/l.cell),0,COLS-1);
   if(f.moved<16&&f.held<260){const d=col<p.pc?'l':col>p.pc?'r':'d';drill(p,d);}}
 });
 // vs CPU: driller 2 drills down, steps out from under wobbling blocks, and skirts hard blocks when air runs low
 const cpu=isCpu(s);let cpuT=0,cpuSide=0;
 function cpuThink(p,dt){const sk=cpuSkill(s),k=['l','r','d'];cpuT-=dt;if(cpuT>0)return;cpuT=.12+(1-sk)*.3;for(const q of k)kb.cpu(q,false);if(p.dead||phase!=='play')return;if(Math.random()<(1-sk)*.15){cpuT=.5;return;}
  const danger=[1,2,3].some(d=>{const o=at(p,p.pr-d,p.pc);return o&&o.k!=='bed'&&(o.warned||o.fall);}),below=at(p,p.pr+1,p.pc);
  if(danger||below?.k==='hard'&&p.air<45){if(!cpuSide)cpuSide=p.pc<COLS/2?1:-1;if(p.pc+cpuSide<0||p.pc+cpuSide>=COLS)cpuSide=-cpuSide;kb.cpu(cpuSide>0?'r':'l',true);return;}cpuSide=0;kb.cpu('d',true);}
 const control=(p,dt)=>{
  if(cpu&&p.i===1)cpuThink(p,dt);
  const k=kb.state[p.i];let want=null;
  if(k.l||k.r){want={d:k.r-k.l,push:true};}
  if(k.d||k.fire){drill(p,'d');}
  const f=p.hold&&touch.fingers.get(p.hold.id);
  if(f&&performance.now()-f.t0>170||f&&f.moved>=16){const l=L(p),col=clamp(Math.floor((f.x-l.x0)/l.cell),0,COLS-1);p.tx=col;
   if(col!==p.pc)want={d:Math.sign(col-p.pc),push:true};else if(performance.now()-f.t0>170)drill(p,'d');}
  if(want)moveSide(p,want.d,want.push);
 };

 // -------------------------------------------------------- update
 const end=(w,text)=>{if(phase==='over')return;phase='over';phaseT=2.6;winner=w;note=w<0?'A TIE!':`${s.players[w].name} wins!`;void text;jingle([523,659,784,1047,1319],{vol:.05,step:.08});if(w>=0){s.react?.(w,'win');}};
 const update=dt=>{
  time+=dt;fx.update(dt);
  if(phase==='intro'){if(!intro.update(dt))phase='play';}
  else if(phase==='play'){clock-=dt;if(clock<=0){clock=0;const a=ps[0].depth,b=ps[1].depth;end(a===b?-1:a>b?0:1);}if(ps.every(p=>p.dead))end(ps[0].depth===ps[1].depth?-1:ps[0].depth>ps[1].depth?0:1);}
  else if(phase==='over'){phaseT-=dt;if(phaseT<=0){const sc=[ps[0].depth,ps[1].depth];if(winner>=0&&sc[winner]<=sc[1-winner])sc[winner]=sc[1-winner]+1;s.finish(sc,`Driller Duel: ${ps[0].depth} m to ${ps[1].depth} m`);return;}}
  for(const p of ps){
   p.act=Math.max(0,p.act-dt);p.inv=Math.max(0,p.inv-dt);p.stun=Math.max(0,p.stun-dt);p.ox*=Math.exp(-14*dt);p.oy*=Math.exp(-14*dt);
   for(const row of p.grid.slice(Math.max(0,Math.floor(p.cam)-1),Math.floor(p.cam)+30))for(const o of row)if(o){if(o.oy)o.oy=Math.min(0,o.oy+dt/FALL);if(o.warned&&o.wait>0&&!o.fall)o.wait=Math.max(0,o.wait-dt);}
   if(phase==='play'&&!p.dead){
    p.air-=dt*(2.0+p.depth*.004);
    if(p.air<=0){p.air=0;p.lives--;p.air=60;p.stun=1.1;p.inv=2;fx.pop(L(p).x0+L(p).sw/2,H*.35,'OUT OF AIR!',{size:26,color:'#9ad8ff'});snd(180,.4,{type:'sawtooth',to:60,vol:.06});s.react?.(p.i,'sad');if(p.lives<=0)knockOut(p);}
    if(p.air<25){p.lowT-=dt;if(p.lowT<=0){p.lowT=.5;snd(900,.06,{type:'square',vol:.03});}}
    control(p,dt);
    // gravity
    p.fallT-=dt;if(p.act<=0&&!at(p,p.pr+1,p.pc)&&p.pr+1<p.grid.length&&p.fallT<=0){p.pr++;p.oy=-1;p.fallT=.075;p.act=0;}
    if(at(p,p.pr,p.pc)){/* buried: dig out */ p.grid[p.pr][p.pc]=null;}
    p.depth=Math.max(p.depth,p.pr+1);
    if(p.depth>=GOAL&&phase==='play'&&!p.done){p.done=true;end(p.i);}
   }
   const target=p.pr-3.2;p.cam+=(target-p.cam)*Math.min(1,dt*7);
  }
  // blocks
  for(const p of ps){p.sim=(p.sim||0)+dt;if(p.sim>=.03){p.sim=0;p.fm=(p.fm||0)+.03;const mv=p.fm>=FALL;if(mv)p.fm=0;if(phase!=='intro')stepFalls(p,mv);}}
  s.setScores([ps[0].depth,ps[1].depth]);
 };

 // -------------------------------------------------------- draw
 const drawShaft=p=>{
  const l=L(p),{cell,x0,top,sw}=l,g=p.grid;
  x.save();x.beginPath();x.rect(p.i*l.half,top,l.half,H-top);x.clip();
  const bg=x.createLinearGradient(0,top,0,H);bg.addColorStop(0,'#2a2038');bg.addColorStop(1,'#15101f');x.fillStyle=p.i?'#1f1830':'#16203a';x.fillRect(p.i*l.half,top,l.half,H-top);
  x.fillStyle=bg;x.globalAlpha=.55;x.fillRect(x0,top,sw,H-top);x.globalAlpha=1;
  x.fillStyle='#00000040';x.fillRect(x0-4,top,4,H-top);x.fillRect(x0+sw,top,4,H-top);
  const r0=Math.max(0,Math.floor(p.cam)-1),r1=Math.min(g.length-1,Math.floor(p.cam)+l.vis);
  // sky above the ground
  const gy=top+(0-p.cam)*cell;if(gy>top){x.fillStyle='#7ec8ff';x.fillRect(x0,top,sw,gy-top);x.fillStyle='#fff';for(let k=0;k<3;k++){x.globalAlpha=.7;x.beginPath();x.ellipse(x0+((k*57+time*6)%sw),top+cell*(.8+k*.7),cell*.9,cell*.3,0,0,6.283);x.fill();}x.globalAlpha=1;}
  for(let r=r0;r<=r1;r++)for(let cc=0;cc<COLS;cc++){const o=g[r][cc];if(!o)continue;
   const px=x0+cc*cell,py=top+(r-p.cam+(o.oy||0))*cell,sh=o.warned&&o.wait>0&&!o.fall?Math.sin(time*60)*cell*.04:0;
   if(o.k==='bed'){x.fillStyle='#3a3a44';x.fillRect(px,py,cell,cell);x.fillStyle='#55555f';x.fillRect(px,py,cell,cell*.15);continue;}
   if(o.k==='air'){x.fillStyle='#0b3a5a';rr(x,px+cell*.1,py+cell*.1,cell*.8,cell*.8,cell*.2);x.fill();x.fillStyle='#4fd8ff';rr(x,px+cell*.16+sh,py+cell*.16,cell*.68,cell*.68,cell*.2);x.fill();x.fillStyle='#fff';x.fillRect(px+cell*.28,py+cell*.28,cell*.12,cell*.4);outlined(x,'AIR',px+cell*.5,py+cell*.52,{size:cell*.3,fill:'#fff',stroke:'#0b3a5a',lw:2});x.globalAlpha=.35+.3*Math.sin(time*6);x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.arc(px+cell/2,py+cell/2,cell*.55,0,6.283);x.stroke();x.globalAlpha=1;continue;}
   if(o.k==='hard'){x.fillStyle='#4a2a14';rr(x,px+1,py+1,cell-2,cell-2,cell*.12);x.fill();x.fillStyle='#8a5a34';rr(x,px+2,py+2,cell-4,cell*.55,cell*.1);x.fill();x.strokeStyle='#2c1a0c';x.lineWidth=Math.max(2,cell*.1);x.beginPath();x.moveTo(px+cell*.25,py+cell*.25);x.lineTo(px+cell*.75,py+cell*.75);x.moveTo(px+cell*.75,py+cell*.25);x.lineTo(px+cell*.25,py+cell*.75);x.stroke();if(o.hp<3){x.strokeStyle='#ffd0a0';x.lineWidth=1.5;x.beginPath();x.moveTo(px+cell*.2,py+cell*.5);x.lineTo(px+cell*.45,py+cell*.4);x.lineTo(px+cell*.6,py+cell*.7);x.stroke();}continue;}
   // coloured block, merged with same-colour neighbours
   const same=(dr,dc)=>{const q=g[r+dr]?.[cc+dc];return q&&q.k==='blk'&&q.c===o.c;};
   const inset=cell*.06;x.fillStyle=COLORS_D[o.c];rr(x,px+inset+sh,py+inset,cell-inset*2,cell-inset*2,cell*.16);x.fill();
   x.fillStyle=COLORS[o.c];rr(x,px+inset+sh,py+inset,cell-inset*2,cell*.78-inset,cell*.16);x.fill();
   if(same(0,1)){x.fillStyle=COLORS[o.c];x.fillRect(px+cell-inset*1.5,py+inset+1,inset*3,cell*.7);}
   if(same(1,0)){x.fillStyle=COLORS[o.c];x.fillRect(px+inset+1,py+cell-inset*1.5,cell*.7,inset*3);}
   x.fillStyle='#ffffff55';x.fillRect(px+cell*.22+sh,py+cell*.16,cell*.28,cell*.09);
   if(o.warned&&o.wait>0&&!o.fall){x.strokeStyle='#fff';x.globalAlpha=.8;x.lineWidth=2;rr(x,px+inset+sh,py+inset,cell-inset*2,cell-inset*2,cell*.16);x.stroke();x.globalAlpha=1;}
  }
  // driller
  if(!p.dead||p.inv>0){
   const px=x0+(p.pc+.5-p.ox*.8)*cell,py=top+(p.pr-p.cam+.5-p.oy*.9)*cell,sz=cell*1.45;
   x.globalAlpha=p.inv>0&&Math.floor(time*16)%2?.5:1;
   x.fillStyle='#00000030';x.beginPath();x.ellipse(px,py+cell*.45,cell*.4,cell*.12,0,0,6.283);x.fill();
   x.fillStyle=PDARK[p.i];rr(x,px-cell*.3,py-cell*.05,cell*.6,cell*.5,cell*.14);x.fill();x.fillStyle=PCOL[p.i];rr(x,px-cell*.27,py-cell*.1,cell*.54,cell*.4,cell*.14);x.fill();
   // drill
   const dv={d:[0,1],l:[-1,0],r:[1,0],u:[0,-1]}[p.dir],spin=p.act>0?time*40:0;x.save();x.translate(px+dv[0]*cell*.3,py+dv[1]*cell*.3+cell*.12);x.rotate(Math.atan2(dv[1],dv[0]));x.fillStyle='#c9ccd6';x.beginPath();x.moveTo(0,-cell*.2);x.lineTo(cell*.5,0);x.lineTo(0,cell*.2);x.closePath();x.fill();x.strokeStyle='#6b6f80';x.lineWidth=2;for(let k=0;k<3;k++){const t=((k/3+spin*.1)%1);x.beginPath();x.moveTo(cell*.5*t,-cell*.2*(1-t));x.lineTo(cell*.5*t,cell*.2*(1-t));x.stroke();}x.restore();
   s.sprite(x,p.i,px,py-cell*.5,sz,{exact:true,mood:p.stun>0?'sad':p.act>0?'angry':'walking'});x.globalAlpha=1;
  }
  fx.draw(x);
  // gauges
  const gx=Math.max(2,x0-Math.min(12,(x0-p.i*l.half)-4)),gw=Math.max(6,Math.min(11,x0-p.i*l.half-5)),gh=(H-top)*.6,gy0=top+(H-top)*.2;
  if(gw>=5){const gxx=p.i?x0+sw+4:x0-4-gw;x.fillStyle='#0008';rr(x,gxx,gy0,gw,gh,gw/2);x.fill();const a=p.air/100;x.fillStyle=a<.25?(Math.floor(time*6)%2?'#ff5a4a':'#ffb3a8'):'#4fd8ff';rr(x,gxx+1,gy0+gh*(1-a)+1,gw-2,Math.max(0,gh*a-2),gw/2);x.fill();}
  x.restore();
 };
 const draw=()=>{
  x.clearRect(0,0,W,H);fx.begin(x);x.fillStyle='#0d0a18';x.fillRect(0,0,W,H);
  for(const p of ps)drawShaft(p);
  fx.end(x);
  const top=Math.min(44,H*.08),fs=clamp(top*.5,11,19);x.fillStyle='#0a0814';x.fillRect(0,0,W,top);
  for(const p of ps){const l=L(p),left=p.i===0,ax=left?l.x0:l.x0+l.sw;x.textAlign=left?'left':'right';
   outlined(x,`${p.depth} m`,ax,top/2,{size:fs*1.3,fill:PLIGHT[p.i],stroke:'#0a0814',align:left?'left':'right'});
   for(let h=0;h<LIVES;h++)heart(x,left?l.x0+fs*5.4+h*fs*1.3:l.x0+l.sw-fs*5.4-h*fs*1.3,top/2,fs*.95,h<p.lives?'#ff3b4e':'#5a6280',h<p.lives?'#fff':'#9aa3c0');}
  outlined(x,mmss(clock),W/2,top/2,{size:fs*1.2,fill:clock<10?'#ff8a7a':'#fff',stroke:'#0a0814'});
  // race strip down the middle
  const rh=H-top-20,rx=W/2;x.fillStyle='#ffffff18';x.fillRect(rx-2,top+10,4,rh);for(const p of ps){const y=top+10+rh*clamp(p.depth/GOAL,0,1);x.fillStyle=PCOL[p.i];x.beginPath();x.arc(rx+(p.i?5:-5),y,5,0,6.283);x.fill();}
  if(phase==='intro'||(phase==='play'&&time<8)){for(const p of ps){const l=L(p),hx=l.x0+l.sw/2;if(time<8){gestureHint(x,hx,H*.75,'tap',time,{color:PLIGHT[p.i],size:l.cell});outlined(x,'TAP / HOLD TO DRILL',hx,H*.75+l.cell*1.8,{size:Math.max(10,l.cell*.5),fill:PLIGHT[p.i],stroke:'#0a0814',alpha:clamp(1-time/8,0,1)});outlined(x,'DRAG TO WALK',hx,H*.75+l.cell*2.7,{size:Math.max(10,l.cell*.5),fill:PLIGHT[p.i],stroke:'#0a0814',alpha:clamp(1-time/8,0,1)});}}}
  if(phase==='intro')intro.draw(x,W,H);
  if(phase==='over')banner(x,W,H,note,`${ps[0].depth} m – ${ps[1].depth} m`,{color:'#ffe566'});
 };
 s.debug={engine:'driller',ps,fx,touch,kb,get phase(){return phase;},L,GOAL};
 draw();
 if(!await s.pass(0,'Driller Duel: dig! Drag to walk, tap beside you to drill sideways, hold on your column to drill down. Match four colours to pop, grab air, dodge falling blocks. First to 120 m wins.','Both ready — dig!'))return;
 s.frame(dt=>{
  if(s.W!==W||s.H!==H){W=s.W;H=s.H;touch.clear();}
  update(Math.min(dt,.033));draw();
  s.status(`${s.players[0].name} ${ps[0].depth} m · ${s.players[1].name} ${ps[1].depth} m · air ${Math.round(ps[0].air)}% / ${Math.round(ps[1].air)}%`);
 });
}
Object.assign(exports,{driller});
