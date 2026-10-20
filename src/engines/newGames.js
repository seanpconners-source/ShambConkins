const {clamp, seededRandom, shuffle}=require("src/utils.js");
const {sound, vibrate, tone}=require("src/audio.js");
const {ownedPointers}=require("src/engines/duelControls.js");
const {touchKeys}=require("src/engines/touchDuel.js");
const {arcadeRounds}=require("src/engines/arcade.js");
const {circle}=require("src/engines/session.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
// v0.44 additions: Block Battle, Shred Hero, Dodgeball, Fight Night, Gopher Hunt, Archery.
function relabel(i,key,text,label){const node=document.getElementById(`duel-${i}-${key}`);if(!node)return;node.textContent=text;node.setAttribute('aria-label',label);}
const rr=(x,px,py,w,h,r)=>{x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();};

// ===================================================================== Block Battle
const PIECES={
 I:{c:'#4fd6e8',cells:[[-1,0],[0,0],[1,0],[2,0]]},O:{c:'#f2d54a',cells:[[0,0],[1,0],[0,1],[1,1]]},T:{c:'#b36be0',cells:[[-1,0],[0,0],[1,0],[0,1]]},
 S:{c:'#66d17a',cells:[[0,0],[1,0],[-1,1],[0,1]]},Z:{c:'#ef5a5a',cells:[[-1,0],[0,0],[0,1],[1,1]]},J:{c:'#4f7be8',cells:[[-1,0],[0,0],[1,0],[-1,1]]},L:{c:'#f0983c',cells:[[-1,0],[0,0],[1,0],[1,1]]}
};
const BW=10,BH=20;
function rotateCells(cells,type){if(type==='O')return cells;return cells.map(([x,y])=>[-y,x]);}
function pieceCells(p){return p.cells.map(([dx,dy])=>[p.x+dx,p.y+dy]);}
function collides(grid,p){return pieceCells(p).some(([x,y])=>x<0||x>=BW||y>=BH||(y>=0&&grid[y][x]));}
function blockSequence(seed,length){const random=seededRandom(seed+':blocks'),out=[];while(out.length<length)out.push(...shuffle(Object.keys(PIECES),random));return out;}
function newPiece(type){return {type,cells:PIECES[type].cells.map(c=>[...c]),x:4,y:type==='I'?0:0};}
function lockPiece(grid,p){for(const [x,y] of pieceCells(p))if(y>=0)grid[y][x]=p.type;}
function clearRows(grid){let n=0;for(let y=BH-1;y>=0;y--)if(grid[y].every(Boolean)){grid.splice(y,1);grid.unshift(Array(BW).fill(0));n++;y++;}return n;}
function addGarbage(grid,rows,random){for(let i=0;i<rows;i++){const hole=Math.floor(random()*BW);grid.shift();grid.push(Array.from({length:BW},(_,x)=>x===hole?0:'G'));}}
function blockState(sequence){return {grid:Array.from({length:BH},()=>Array(BW).fill(0)),index:0,piece:null,next:[],sequence,timer:0,lock:0,lockMoves:0,das:{l:0,r:0},prev:{},score:0,lines:0,incoming:0,dead:false,combo:0,flash:[],rotations:0};}
function spawn(st){const type=st.sequence[st.index++];st.piece=newPiece(type);st.timer=0;st.lock=0;st.lockMoves=0;if(collides(st.grid,st.piece)){st.piece.y=-1;if(collides(st.grid,st.piece))st.dead=true;}}
function tryMove(st,dx,dy){const p={...st.piece,x:st.piece.x+dx,y:st.piece.y+dy};if(collides(st.grid,p))return false;st.piece=p;return true;}
function tryRotate(st){const rotated={...st.piece,cells:rotateCells(st.piece.cells,st.piece.type)};for(const kick of [0,-1,1,-2,2]){const p={...rotated,x:rotated.x+kick};if(!collides(st.grid,p)){st.piece=p;return true;}if(!collides(st.grid,{...p,y:p.y-1})){st.piece={...p,y:p.y-1};return true;}}return false;}
function ghostY(st){let p={...st.piece};while(!collides(st.grid,{...p,y:p.y+1}))p.y++;return p.y;}
async function blocks(s){
 const[,x]=s.canvas(900,560,{fill:true});s.shared=true;s.updateScores();
 const {keys,virt}=touchKeys(s),sequence=blockSequence(s.seed,600),random=seededRandom(s.seed+':garbage');
 const st=[blockState(sequence),blockState(sequence)];let left=150,over=null;
 const level=p=>1+Math.floor(p.lines/8),fall=p=>Math.max(.07,.85-level(p)*.075);
 const settle=(i)=>{
  const me=st[i],foe=st[1-i];lockPiece(me.grid,me.piece);const n=clearRows(me.grid);me.flash=n?[Date.now()]:[];
  if(n){me.lines+=n;me.combo++;me.score+=[0,100,300,500,800][n]*level(me)+Math.max(0,me.combo-1)*50;let send=[0,0,1,2,4][n]+(me.combo>2?1:0);const cancel=Math.min(send,me.incoming);me.incoming-=cancel;send-=cancel;foe.incoming+=send;sound(n>=3?'win':'pickup');s.react?.(i,n>=3?'win':'happy');vibrate(10);}
  else{me.combo=0;if(me.incoming>0){addGarbage(me.grid,Math.min(8,me.incoming),random);me.incoming=0;sound('shot');}}
  spawn(me);
 };
 const hardDrop=i=>{const me=st[i];if(me.dead||!me.piece)return;const y=ghostY(me);me.score+=(y-me.piece.y)*2;me.piece.y=y;settle(i);};
 const nudge=me=>{if(me.lock>0&&me.lockMoves<10){me.lock=0;me.lockMoves++;}};
 const drags=new Map();
 ownedPointers(s,(i,p,id)=>{
  const me=st[i],now=performance.now();let g=drags.get(id);
  if(!g){drags.set(id,{ax:p.x,sx:p.x,sy:p.y,t0:now,moved:0,hist:[[now,p.y]],soft:false,dropped:false});return;}
  if(me.dead||g.dropped)return;
  g.moved=Math.max(g.moved,Math.hypot(p.x-g.sx,p.y-g.sy));g.hist.push([now,p.y]);while(g.hist.length>2&&now-g.hist[0][0]>140)g.hist.shift();
  const step=clamp(s.W*.045,16,30);let n=Math.trunc((p.x-g.ax)/step);
  if(n&&Math.abs(p.x-g.sx)>=step*.6){const dx=Math.sign(n);for(let k=Math.abs(n);k--;)if(tryMove(me,dx,0))nudge(me);g.ax+=n*step;}
  const dy=p.y-g.sy,vy=(p.y-g.hist[0][1])/Math.max(16,now-g.hist[0][0]);
  if(dy>step*1.4&&vy>1.1&&now-g.t0<650){g.dropped=true;virt[i].d=false;g.soft=false;hardDrop(i);return;}
  const soft=dy>step*1.2;if(soft!==g.soft){g.soft=soft;virt[i].d=soft;}
 },(i,id,info)=>{
  const g=drags.get(id);drags.delete(id);if(!g)return;virt[i].d=false;
  if(!info.cancelled&&!g.dropped&&g.moved<12&&performance.now()-g.t0<350&&!st[i].dead&&tryRotate(st[i]))nudge(st[i]);
 });
 spawn(st[0]);spawn(st[1]);
 s.hint('Two boards, one shared piece sequence. On your half of the screen: drag left/right to shift the piece, tap to rotate, drag down to soft drop, flick down fast to hard drop. Clearing 2+ lines sends garbage to your rival. Keyboard: P1 A/D move, W rotate, S soft drop, Space hard drop; P2 arrows + Enter. Last survivor wins; after 2:30 the higher score wins.');
 s.debug={engine:'blocks',state:st,keys};
 // vs CPU: board 2 scores every rotation and column (lines, height, holes, bumpiness), then rotates, shifts and drops at a skill pace
 const cpu=isCpu(s);let cpuPlan=null,cpuIdx=-1,cpuT=0;
 function cpuBlocks(dt){const me=st[1];if(me.dead||!me.piece)return;const sk=cpuSkill(s);
  if(cpuIdx!==me.index){cpuIdx=me.index;let best=null,bv=-1e9;for(let r=0;r<4;r++){const sim={grid:me.grid,piece:{...me.piece}};let ok=true;for(let k=0;k<r;k++)ok=ok&&tryRotate(sim);if(!ok)continue;for(let dx=-BW;dx<=BW;dx++){const p={...sim.piece,x:sim.piece.x+dx};if(collides(me.grid,p))continue;const t2={grid:me.grid,piece:p};p.y=ghostY(t2);const g=me.grid.map(row=>row.slice());lockPiece(g,p);const lines=clearRows(g);
    let agg=0,holes=0,bump=0,prevH=null;for(let x0=0;x0<BW;x0++){let h=0;for(let y=0;y<BH;y++)if(g[y][x0]){h=BH-y;break;}agg+=h;for(let y=BH-h;y<BH;y++)if(!g[y][x0])holes++;if(prevH!==null)bump+=Math.abs(h-prevH);prevH=h;}
    const v=-.51*agg+.76*lines-.36*holes*(.5+sk)-.18*bump+Math.random()*(1-sk)*3;if(v>bv){bv=v;best={r,x:p.x};}}}cpuPlan=best?{...best,rot:0}:null;}
  cpuT-=dt;if(cpuT>0||!cpuPlan)return;cpuT=.07+(1-sk)*.22;if(cpuPlan.rot<cpuPlan.r){cpuPlan.rot++;tryRotate(me);return;}if(me.piece.x!==cpuPlan.x){tryMove(me,Math.sign(cpuPlan.x-me.piece.x),0);return;}if(sk>.5||Math.random()<.3){hardDrop(1);cpuPlan=null;}}
 if(!await s.pass(0,'Block Battle: both players get the identical piece order. Clear lines to send garbage rows to the other board. Top out and you lose.','Both ready — drop!'))return;
 s.frame(dt=>{
  left-=dt;if(cpu)cpuBlocks(dt);
  for(let i=0;i<2;i++){
   const me=st[i],k=keys[i];if(me.dead)continue;
   for(const dir of ['l','r']){if(k[dir]){me.das[dir]+=dt;}else me.das[dir]=0;}
   const stepSide=(dir,dx)=>{if(k[dir]&&!me.prev[dir]){tryMove(me,dx,0);me.das[dir]=0;if(me.lock>0&&me.lockMoves<10){me.lock=0;me.lockMoves++;}}else if(k[dir]&&me.das[dir]>.17){while(me.das[dir]>.17){me.das[dir]-=.055;tryMove(me,dx,0);}}};
   stepSide('l',-1);stepSide('r',1);
   if(k.u&&!me.prev.u&&tryRotate(me)&&me.lock>0&&me.lockMoves<10){me.lock=0;me.lockMoves++;}
   if(k.fire&&!me.prev.fire){hardDrop(i);if(me.dead)continue;}
   me.timer+=dt;const interval=k.d?.045:fall(me);
   while(me.timer>=interval){me.timer-=interval;if(!tryMove(me,0,1)){break;}if(k.d)me.score+=1;}
   if(collides(me.grid,{...me.piece,y:me.piece.y+1})){me.lock+=dt;if(me.lock>=.42){settle(i);}}else me.lock=0;
   for(const key of ['l','r','u','d','fire'])me.prev[key]=!!k[key];
  }
  if(!over){if(st[0].dead||st[1].dead)over=st[0].dead&&st[1].dead?'draw':st[0].dead?1:0;else if(left<=0)over=st[0].score===st[1].score?'draw':st[0].score>st[1].score?0:1;}
  // draw
  const W=s.W,H=s.H,port=W<H*.8,cell=port?Math.floor(Math.min((W-14)/(BW*2+2.3),(H-14)/(BH+4.4))):Math.floor(Math.min((W-120)/(BW*2+5),(H-86)/BH)),bw=cell*BW,bh=cell*BH,gap=port?Math.floor(cell*2.3):Math.max(cell*4,60),ox=[Math.floor(W/2-gap/2-bw),Math.floor(W/2+gap/2)],oy=port?Math.floor((H-bh+cell*4.4)/2):Math.floor((H-bh)/2)+14;
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#16142a');bg.addColorStop(1,'#241a3a');x.fillStyle=bg;x.fillRect(0,0,W,H);
  for(let i=0;i<2;i++){
   const me=st[i],px=ox[i];x.fillStyle='#0b0a18';x.fillRect(px-4,oy-4,bw+8,bh+8);x.strokeStyle=i?'#ff9fc6':'#78b6ff';x.lineWidth=3;x.strokeRect(px-4,oy-4,bw+8,bh+8);
   x.strokeStyle='#ffffff10';x.lineWidth=1;for(let c=1;c<BW;c++){x.beginPath();x.moveTo(px+c*cell,oy);x.lineTo(px+c*cell,oy+bh);x.stroke();}for(let r=1;r<BH;r++){x.beginPath();x.moveTo(px,oy+r*cell);x.lineTo(px+bw,oy+r*cell);x.stroke();}
   const block=(cx,cy,color,alpha=1)=>{x.globalAlpha=alpha;x.fillStyle=color;x.fillRect(px+cx*cell+1,oy+cy*cell+1,cell-2,cell-2);x.fillStyle='#ffffff55';x.fillRect(px+cx*cell+1,oy+cy*cell+1,cell-2,Math.max(2,cell*.18));x.fillStyle='#00000033';x.fillRect(px+cx*cell+1,oy+cy*cell+cell-Math.max(3,cell*.2),cell-2,Math.max(2,cell*.18)-1);x.globalAlpha=1;};
   for(let r=0;r<BH;r++)for(let c=0;c<BW;c++){const v=me.grid[r][c];if(v)block(c,r,v==='G'?'#6f7482':PIECES[v].c);}
   if(!me.dead&&me.piece){const gy=ghostY(me);for(const [cx,cy] of me.piece.cells.map(([dx,dy])=>[me.piece.x+dx,gy+dy]))if(cy>=0)block(cx,cy,PIECES[me.piece.type].c,.22);for(const [cx,cy] of pieceCells(me.piece))if(cy>=0)block(cx,cy,PIECES[me.piece.type].c);}
   // garbage meter
   x.fillStyle='#2a2540';const mx=port?px+(i?-12:bw+6):px+(i?bw+8:-16);x.fillRect(mx,oy,6,bh);x.fillStyle='#ff5a4a';const gh=Math.min(bh,me.incoming*cell);x.fillRect(mx,oy+bh-gh,6,gh);
   // next preview
   const nx=port?px+bw-cell*3.2:px+(i?bw+22:-22-cell*3.2),ny=port?oy-cell*4.1:oy,nt=sequence[me.index];x.fillStyle='#ffffffaa';x.font=`bold ${Math.max(9,cell*.55)}px monospace`;x.textAlign='left';x.fillText('NEXT',nx,ny+cell*.8);if(nt)for(const [dx,dy] of PIECES[nt].cells){x.fillStyle=PIECES[nt].c;x.fillRect(nx+(dx+1)*cell*.7,ny+cell*1.2+(dy+1)*cell*.7,cell*.66,cell*.66);}
   const tx=port?px+cell*2.6:nx,sy0=port?oy-cell*3.1:oy+cell*5.6;x.fillStyle='#fff';x.font=`bold ${Math.max(11,cell*.62)}px monospace`;x.textAlign='left';x.fillText(`${me.score}`,tx,sy0);x.fillStyle='#ffffff99';x.font=`${Math.max(9,cell*.5)}px monospace`;x.fillText(`LINES ${me.lines}`,tx,sy0+cell*(port?.85:.9));x.fillText(`LV ${level(me)}`,tx,sy0+cell*(port?1.65:1.7));
   if(port)s.sprite(x,i,px+cell*1.2,oy-cell*2.3,clamp(cell*2.1,26,48),{exact:true,mood:me.dead?'sad':'walking'});else s.sprite(x,i,px+bw/2,oy-cell*.8,clamp(cell*1.6,26,48),{exact:true,mood:me.dead?'sad':'walking'});
   if(me.dead){x.fillStyle='#000a';x.fillRect(px,oy,bw,bh);x.fillStyle='#ff8c7a';x.font=`bold ${cell*.9}px monospace`;x.textAlign='center';x.fillText('TOPPED OUT',px+bw/2,oy+bh/2);}
  }
  x.fillStyle='#fff3b9';x.font=`bold ${clamp(W*.022,13,22)}px monospace`;x.textAlign='center';x.fillText(`${Math.floor(Math.max(0,left)/60)}:${String(Math.ceil(Math.max(0,left))%60).padStart(2,'0')}`,W/2,oy+bh/2);
  s.setScores(st.map(p=>p.score));s.status(`${s.players[0].name} ${st[0].score} · ${s.players[1].name} ${st[1].score} · clear 2+ lines to send garbage`);
  if(over!==null){const scores=st.map(p=>p.score);if(over!=='draw'){const loser=1-over;scores[over]=Math.max(scores[over],scores[loser]+1);}s.finish(scores,'Block Battle');}
 });
}

// ===================================================================== Shred Hero
const SHRED={bpm:132,lanes:4,travel:1.55,perfect:.075,good:.15,length:72};
const LANE_COLORS=['#58d26b','#ef5a5a','#f2d54a','#58a4fb'],SCALE=[0,3,5,7,10,12,15,17];
function shredChart(seed){
 const random=seededRandom(seed+':shred'),beat=60/SHRED.bpm,notes=[],bars=Math.floor(SHRED.length/(beat*4));
 const motifs=Array.from({length:4},()=>Array.from({length:8},()=>random()<.62?Math.floor(random()*4):-1));
 for(let bar=2;bar<bars-1;bar++){
  const intensity=Math.min(1,.45+bar/bars*.7),motif=motifs[Math.floor(bar/2)%motifs.length];
  for(let step=0;step<8;step++){
   const t=(bar*4+step/2)*beat;let lane=motif[step];
   if(random()<.28)lane=random()<.5?-1:Math.floor(random()*4);
   if(lane<0&&random()<intensity*.25)lane=Math.floor(random()*4);
   if(lane>=0&&(step%2===0||random()<intensity))notes.push({t,lane,hit:null,y:0});
  }
 }
 return notes;
}
async function shred(s){
 const[c,x]=s.canvas(900,560,{fill:true});s.shared=true;s.updateScores();
 const chart=[shredChart(s.seed),shredChart(s.seed)].map(a=>a.map(n=>({...n}))),beat=60/SHRED.bpm;
 const st=[0,1].map(()=>({score:0,combo:0,best:0,perfect:0,good:0,miss:0,flash:[0,0,0,0],text:'',textT:0,held:[false,false,false,false]})),lastBeat={n:-1};let clock=-2.2,over=false;
 const mult=p=>Math.min(4,1+Math.floor(p.combo/10));
 const hit=(i,lane)=>{
  if(s.paused||!s.alive||clock<0&&clock>-.25)return;const me=st[i];me.flash[lane]=.14;
  let best=null;for(const n of chart[i])if(n.hit===null&&n.lane===lane&&Math.abs(n.t-clock)<=SHRED.good&&(!best||Math.abs(n.t-clock)<Math.abs(best.t-clock)))best=n;
  if(!best){return;}
  const d=Math.abs(best.t-clock);best.hit=d<=SHRED.perfect?'perfect':'good';me[best.hit]++;me.combo++;me.best=Math.max(me.best,me.combo);me.score+=(best.hit==='perfect'?100:60)*mult(me);me.text=best.hit==='perfect'?'PERFECT':'GOOD';me.textT=.45;
  tone(220*2**(SCALE[(lane*2+Math.floor(best.t/beat))%SCALE.length]/12),.16,.05,i?'sawtooth':'square');
 };
 const KEYS=[{a:0,s:1,d:2,f:3},{h:0,j:1,k:2,l:3}];
 s.on(document,'keydown',ev=>{if(ev.repeat)return;const k=ev.key.toLowerCase();for(let i=0;i<2;i++)if(KEYS[i][k]!==undefined){ev.preventDefault();hit(i,KEYS[i][k]);}});
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev),half=s.W/2,side=p.x<half?0:1,i=cpuS?0:side,lx=(p.x-(side?half:0))/half,lane=clamp(Math.floor(lx*4),0,3);hit(i,lane);});
 // vs CPU: guitarist 2 hits each note with a timing error that shrinks on Hard and skips a few on Easy
 const cpuS=isCpu(s);
 function cpuShred(){const sk=cpuSkill(s);for(const n of chart[1]){if(n.hit!==null||n.cpu)continue;if(n.t-clock>.3)break;if(n.cpuOff===undefined)n.cpuOff=(Math.random()-.5)*2*SHRED.good*(1.15-sk)*.8;if(clock>=n.t+n.cpuOff){n.cpu=true;if(Math.random()<.6+sk*.38)hit(1,n.lane);}}}
 s.hint('Hit notes as they reach the glowing line. Tap a lane at the bottom of your half (P1 left, P2 right), or use keys: P1 A S D F, P2 H J K L. Chain hits to build a multiplier up to ×4. Same song, same chart for both. Highest score wins.');
 s.debug={engine:'shred',chart,state:st,clock:()=>clock};
 if(!await s.pass(0,'Shred Hero: the same riff plays for both of you. Hit every note on the beat. Perfect hits score double the multiplier.','Both ready — rock!'))return;
 s.frame(dt=>{
  clock+=dt;if(cpuS)cpuShred();
  // Backing track: kick, hat and a bass riff on the beat grid.
  const sb=Math.floor(clock/(beat/2));if(clock>=0&&sb!==lastBeat.n){lastBeat.n=sb;const q=sb%8;if(q%2===0)tone(q%4===0?62:82,.09,.06,'sine');if(q===2||q===6)tone(180,.05,.03,'square');tone(q%2?7000:5200,.012,.006,'square');const riff=[0,0,7,0,10,7,3,5][q];if(clock>=beat*8)tone(55*2**(riff/12),.18,.045,'sawtooth');}
  for(let i=0;i<2;i++){const me=st[i];for(const n of chart[i])if(n.hit===null&&clock-n.t>SHRED.good){n.hit='miss';me.miss++;me.combo=0;me.text='MISS';me.textT=.35;}me.textT=Math.max(0,me.textT-dt);for(let l=0;l<4;l++)me.flash[l]=Math.max(0,me.flash[l]-dt);}
  const W=s.W,H=s.H;x.fillStyle='#0d0a18';x.fillRect(0,0,W,H);
  const half=W/2,topW=half*.34,botW=half*.86,hy=H*.8;
  for(let i=0;i<2;i++){
   const cx=half*i+half/2,me=st[i];
   const lane=(l,t)=>{const w=topW+(botW-topW)*t,left=cx-w/2;return {x:left+w*(l+.5)/4,w:w/4};};
   // highway
   x.fillStyle=i?'#201428':'#101a2c';x.beginPath();x.moveTo(cx-topW/2,0);x.lineTo(cx+topW/2,0);x.lineTo(cx+botW/2,H);x.lineTo(cx-botW/2,H);x.closePath();x.fill();
   for(let l=0;l<=4;l++){x.strokeStyle='#ffffff22';x.lineWidth=2;x.beginPath();const a=lane(Math.min(l,3),0),b=lane(Math.min(l,3),1);const off=l===4?.5:-.5;x.moveTo(a.x+a.w*off,0);x.lineTo(b.x+b.w*off,H);x.stroke();}
   for(let b=Math.floor((clock-.4)/beat);b<(clock+SHRED.travel)/beat;b++){const tt=1-(b*beat-clock)/SHRED.travel,y=hy-(1-tt)*hy*1.02;if(tt<0||tt>1.1)continue;const w=topW+(botW-topW)*clamp(y/H,0,1);x.strokeStyle=b%4===0?'#ffffff30':'#ffffff12';x.lineWidth=b%4===0?3:1;x.beginPath();x.moveTo(cx-w/2,y);x.lineTo(cx+w/2,y);x.stroke();}
   for(const n of chart[i]){const tt=1-(n.t-clock)/SHRED.travel;if(tt<-.05||tt>1.14||(n.hit&&n.hit!=='miss'))continue;const y=tt*hy,prog=clamp(y/H,0,1),l=lane(n.lane,prog),r=Math.max(5,l.w*.36);x.globalAlpha=n.hit==='miss'?.3:1;x.fillStyle=LANE_COLORS[n.lane];x.beginPath();x.ellipse(l.x,y,r*1.15,r*.7,0,0,Math.PI*2);x.fill();x.fillStyle='#ffffffcc';x.beginPath();x.ellipse(l.x,y-r*.12,r*.6,r*.3,0,0,Math.PI*2);x.fill();x.globalAlpha=1;}
   // fret line + pads
   for(let l=0;l<4;l++){const p=lane(l,hy/H),flash=me.flash[l]/.14;x.fillStyle=LANE_COLORS[l]+(flash>0?'':'99');x.beginPath();x.ellipse(p.x,hy,p.w*.4,p.w*.24,0,0,Math.PI*2);x.fill();x.lineWidth=3;x.strokeStyle='#fff';x.stroke();if(flash>0){x.fillStyle='#ffffff88';x.beginPath();x.ellipse(p.x,hy,p.w*.5*(1+flash*.3),p.w*.3*(1+flash*.3),0,0,Math.PI*2);x.fill();}
    x.fillStyle='#ffffff77';x.font=`bold ${clamp(W*.02,11,18)}px monospace`;x.textAlign='center';x.fillText(i?'HJKL'[l]:'ASDF'[l],p.x,hy+p.w*.5);}
   s.sprite(x,i,cx,34,clamp(H*.085,34,56),{exact:true,mood:me.combo>=10?'win':'walking'});
   x.fillStyle='#fff';x.font=`bold ${clamp(W*.03,16,28)}px monospace`;x.textAlign='center';x.fillText(String(me.score),cx,H*.2);x.fillStyle='#ffd24a';x.font=`bold ${clamp(W*.022,12,20)}px monospace`;x.fillText(`×${mult(me)}  ${me.combo?'combo '+me.combo:''}`,cx,H*.2+26);
   if(me.textT>0){x.globalAlpha=Math.min(1,me.textT*3);x.fillStyle=me.text==='MISS'?'#ff7a6a':me.text==='PERFECT'?'#9dffb0':'#ffe48a';x.font=`bold ${clamp(W*.03,16,28)}px monospace`;x.fillText(me.text,cx,H*.5);x.globalAlpha=1;}
  }
  x.strokeStyle='#ffffff40';x.lineWidth=2;x.beginPath();x.moveTo(half,0);x.lineTo(half,H);x.stroke();
  if(clock<0){x.fillStyle='#fff';x.font=`bold ${clamp(W*.08,30,70)}px monospace`;x.textAlign='center';x.fillText(String(Math.ceil(-clock/beat/2)),half,H*.45);}
  s.setScores(st.map(p=>p.score));s.status(`${s.players[0].name} ${st[0].score} · ${s.players[1].name} ${st[1].score} · hit the notes on the glowing line`);
  const end=Math.max(...chart[0].map(n=>n.t))+2;
  if(!over&&clock>end){over=true;s.finish(st.map(p=>p.score),'Shred Hero');}
 });
}

// ===================================================================== Dodgeball
const DODGE={W:900,H:560,r:26,speed:270,hp:3,rounds:2,throw:640};
function dodgeInit(round){return {players:[{x:170,y:280,hp:DODGE.hp,ball:null,catching:0,cool:0,face:0,hurt:0},{x:730,y:280,hp:DODGE.hp,ball:null,catching:0,cool:0,face:0,hurt:0}],balls:[0,1,2,3].map(i=>({x:i<2?400:500,y:150+(i%2)*260,vx:0,vy:0,live:false,owner:-1,held:-1,r:13,spin:0})),fx:[],round};}
async function dodgeball(s){
 const[,x]=s.canvas(900,560,{fill:true});s.shared=true;s.updateScores();
 const {keys}=touchKeys(s);
 let a=dodgeInit(1),wins=[0,0],left=95,pause=0,note='',prevFire=[false,false];const tgt=[null,null],drags=new Map();
 const doThrow=(i,aim)=>{const p=a.players[i];if(pause>0||!p.ball){return false;}const b=p.ball,dir=i?-1:1,vx=dir,vy=aim===undefined?p.face:aim,len=Math.hypot(vx,vy);b.vx=vx/len*DODGE.throw;b.vy=vy/len*DODGE.throw;b.live=true;b.owner=i;b.held=-1;b.x=p.x+dir*(DODGE.r+b.r+2);b.y=p.y;p.ball=null;sound('shot');vibrate(10);return true;};
 const doCatch=i=>{const p=a.players[i];if(pause>0||p.ball||p.cool>0)return;p.catching=.26;p.cool=.85;};
 ownedPointers(s,(i,pt,id)=>{
  const g=drags.get(id),now=performance.now(),p=a.players[i],sx=s.W/DODGE.W,sy=s.H/DODGE.H;
  if(!g){drags.set(id,{px:p.x,py:p.y,sx:pt.x,sy:pt.y,t0:now,moved:0,hist:[[now,pt.x,pt.y]]});return;}
  g.moved=Math.max(g.moved,Math.hypot(pt.x-g.sx,pt.y-g.sy));g.hist.push([now,pt.x,pt.y]);while(g.hist.length>2&&now-g.hist[0][0]>120)g.hist.shift();
  if(g.moved>=12){tgt[i]={x:g.px+(pt.x-g.sx)/sx*1.25,y:g.py+(pt.y-g.sy)/sy*1.25};}
 },(i,id,info)=>{
  const g=drags.get(id);drags.delete(id);tgt[i]=null;if(!g||info.cancelled)return;
  const now=performance.now(),h=g.hist[0],pt=info.point||{x:h[1],y:h[2]},dtm=Math.max(16,now-h[0]),vx=(pt.x-h[1])/dtm,vy=(pt.y-h[2])/dtm,dir=i?-1:1;
  if(g.moved<12&&now-g.t0<320){if(!doThrow(i))doCatch(i);}
  else if(vx*dir>.9&&a.players[i].ball)doThrow(i,clamp(vy/Math.max(.3,vx*dir),-1,1)*.7);
 });
 s.hint('Your half of the screen is your side of the court. Drag to move your player (relative to where you first touch). Tap to throw the ball you are holding, or flick toward the other side to throw with aim. Tap with no ball to make a quick catch: time it just as a ball arrives to snatch it and hurt the thrower. Walk over a loose ball to pick it up. Three hearts each; first to two rounds. Keyboard: P1 WASD + Space, P2 arrows + Enter.');
 s.debug={engine:'dodgeball',state:a,keys,wins};
 if(!await s.pass(0,'Dodgeball: a True Underdog Story. Dodge, catch and throw. Three hearts each.','Both ready — dodge!'))return;
 const boundsX=i=>i?[DODGE.W/2+DODGE.r+6,DODGE.W-DODGE.r-8]:[DODGE.r+8,DODGE.W/2-DODGE.r-6];
 // vs CPU: player 2 fetches loose balls on its side, dodges or snatches incoming throws, and throws when lined up with you
 const cpu=isCpu(s);let cpuT=0,cpuHoldT=0;
 function cpuDodge(dt){const p=a.players[1],o=a.players[0],sk=cpuSkill(s);if(pause>0)return;let tx=p.x,ty=p.y;
  for(const b of a.balls){if(!b.live||b.owner!==0||b.vx<=0)continue;const tt=(p.x-b.x)/b.vx;if(tt<0||tt>.9)continue;const yy=b.y+b.vy*tt;if(Math.abs(yy-p.y)<DODGE.r*2.2){if(!p.ball&&p.cool<=0&&tt<.18&&Math.random()<sk*.55){doCatch(1);}else if(Math.random()<.3+sk*.6){ty=p.y+(yy<p.y?1:-1)*DODGE.r*3;}}}
  if(!p.ball){let best=null,bd=1e9;for(const b of a.balls){if(b.held>=0||b.live||b.x<DODGE.W/2)continue;const d=Math.hypot(b.x-p.x,b.y-p.y);if(d<bd){bd=d;best=b;}}if(best&&ty===p.y){tx=best.x;ty=best.y;}}
  else{cpuHoldT+=dt;if(ty===p.y)ty=o.y+Math.sin(cpuHoldT*2)*20;tx=DODGE.W/2+DODGE.r+60;if(cpuHoldT>.5+(1-sk)*.8&&Math.abs(o.y-p.y)<120){cpuHoldT=0;const dxx=p.x-o.x;doThrow(1,clamp((o.y-p.y)/dxx+(Math.random()-.5)*(1-sk)*.5,-1,1)*.9);}}
  tgt[1]={x:tx,y:clamp(ty,DODGE.r+8,DODGE.H-DODGE.r-8)};}
 s.frame(dt=>{
  left-=dt;if(cpu)cpuDodge(dt);
  if(pause>0){pause-=dt;if(pause<=0){if(wins.some(n=>n>=DODGE.rounds)||left<=0){const scores=[wins[0]*10+a.players[0].hp,wins[1]*10+a.players[1].hp];s.finish(scores,'Dodgeball');return;}a=dodgeInit(a.round+1);s.debug.state=a;}}
  else{
   for(let i=0;i<2;i++){
    const p=a.players[i],k=keys[i];p.hurt=Math.max(0,p.hurt-dt);p.cool=Math.max(0,p.cool-dt);p.catching=Math.max(0,p.catching-dt);
    const dx=(k.r?1:0)-(k.l?1:0),dy=(k.d?1:0)-(k.u?1:0),l=Math.max(1,Math.hypot(dx,dy));const [lo,hi]=boundsX(i);
    p.x=clamp(p.x+dx/l*DODGE.speed*dt,lo,hi);p.y=clamp(p.y+dy/l*DODGE.speed*dt,DODGE.r+8,DODGE.H-DODGE.r-8);if(dy)p.face=dy*.55;
    if(k.fire&&!prevFire[i]){if(!doThrow(i))doCatch(i);}
    if(!dx&&!dy&&tgt[i]){const tx=tgt[i].x-p.x,ty=tgt[i].y-p.y,d=Math.hypot(tx,ty),stepD=Math.min(d,DODGE.speed*1.5*dt);if(d>1){const [lo2,hi2]=boundsX(i);p.x=clamp(p.x+tx/d*stepD,lo2,hi2);p.y=clamp(p.y+ty/d*stepD,DODGE.r+8,DODGE.H-DODGE.r-8);if(Math.abs(ty)>8)p.face=clamp(ty/90,-1,1)*.55;}}
    prevFire[i]=!!k.fire;
   }
   for(const b of a.balls){
    if(b.held>=0){const p=a.players[b.held];b.x=p.x+(b.held?-1:1)*(DODGE.r-2);b.y=p.y+8;continue;}
    const steps=Math.ceil(Math.hypot(b.vx,b.vy)*dt/10)||1,h=dt/steps;
    for(let st=0;st<steps;st++){
     b.x+=b.vx*h;b.y+=b.vy*h;
     if(b.y<b.r){b.y=b.r;b.vy=Math.abs(b.vy);}if(b.y>DODGE.H-b.r){b.y=DODGE.H-b.r;b.vy=-Math.abs(b.vy);}
     if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx)*.8;}if(b.x>DODGE.W-b.r){b.x=DODGE.W-b.r;b.vx=-Math.abs(b.vx)*.8;}
     if(b.live)for(let i=0;i<2;i++){
      const p=a.players[i];if(i===b.owner)continue;if(Math.hypot(b.x-p.x,b.y-p.y)<DODGE.r+b.r){
       if(p.catching>0&&!p.ball){p.ball=b;b.held=i;b.live=false;b.vx=b.vy=0;const th=a.players[b.owner];th.hp=Math.max(0,th.hp-1);th.hurt=.5;a.fx.push({x:p.x,y:p.y-40,text:'CAUGHT!',t:.9});sound('win');s.react?.(i,'win');s.react?.(b.owner,'sad');if(th.hp<=0)break;}
       else{p.hp=Math.max(0,p.hp-1);p.hurt=.6;b.live=false;b.vx*=-.35;b.vy*=-.35;a.fx.push({x:p.x,y:p.y-40,text:'OUCH!',t:.8});sound('shot');vibrate(25);s.react?.(i,'sad');}
       break;
      }
     }
    }
    const speed=Math.hypot(b.vx,b.vy);if(!b.live){const f=Math.exp(-1.6*dt);b.vx*=f;b.vy*=f;}else if(speed<230)b.live=false;
    if(!b.live)for(let i=0;i<2;i++){const p=a.players[i];if(!p.ball&&b.held<0&&Math.hypot(b.x-p.x,b.y-p.y)<DODGE.r+b.r+4&&speed<260&&((i?b.x>DODGE.W/2:b.x<DODGE.W/2))){p.ball=b;b.held=i;b.vx=b.vy=0;}}
   }
   for(const f of a.fx)f.t-=dt;a.fx=a.fx.filter(f=>f.t>0);
   const dead=a.players.findIndex(p=>p.hp<=0);
   if((dead>=0||left<=0)){const w=dead>=0?1-dead:a.players[0].hp===a.players[1].hp?-1:a.players[0].hp>a.players[1].hp?0:1;if(w>=0){wins[w]++;note=`${s.players[w].name} wins round ${a.round}`;s.react?.(w,'win');sound('win');}else note='Round drawn';pause=2;s.setScores(wins.map((n,i)=>n*10+a.players[i].hp));}
  }
  // draw
  const W=s.W,H=s.H,sx=W/DODGE.W,sy=H/DODGE.H;x.fillStyle='#d9b684';x.fillRect(0,0,W,H);
  for(let i=0;i<14;i++){x.fillStyle=i%2?'#d2ae7a':'#dcbb8a';x.fillRect(0,i*H/14,W,H/14);}
  x.strokeStyle='#fff';x.lineWidth=5;x.strokeRect(10,10,W-20,H-20);x.beginPath();x.moveTo(W/2,10);x.lineTo(W/2,H-10);x.stroke();x.beginPath();x.arc(W/2,H/2,H*.12,0,Math.PI*2);x.stroke();
  x.fillStyle='#b8402d33';x.fillRect(10,10,W/2-10,H-20);x.fillStyle='#2d5fb833';x.fillRect(W/2,10,W/2-10,H-20);
  const drawBalls=()=>{for(const b of a.balls){const px=b.x*sx,py=b.y*sy,br=Math.max(b.r*sx,9);x.fillStyle='#00000025';x.beginPath();x.ellipse(px,py+b.r*sy*.9,br,b.r*sy*.5,0,0,Math.PI*2);x.fill();const g=x.createRadialGradient(px-4,py-5,2,px,py,br+2);g.addColorStop(0,'#ff8a7a');g.addColorStop(1,'#b8261a');x.fillStyle=g;x.beginPath();x.arc(px,py-(b.held>=0?10:0),br,0,Math.PI*2);x.fill();x.strokeStyle='#fff8';x.lineWidth=2;x.beginPath();x.arc(px,py-(b.held>=0?10:0),br*.7,0,Math.PI);x.stroke();if(b.live){x.strokeStyle='#ffd24a';x.lineWidth=3;x.beginPath();x.arc(px,py,br+4,0,Math.PI*2);x.stroke();}}};
  for(let i=0;i<2;i++){const p=a.players[i],px=p.x*sx,py=p.y*sy,size=clamp(DODGE.r*2.6*sx,40,80);x.fillStyle='#00000030';x.beginPath();x.ellipse(px,py+size*.42,size*.4,size*.14,0,0,Math.PI*2);x.fill();
   if(p.catching>0){x.strokeStyle='#8fe3ff';x.lineWidth=4;x.beginPath();x.arc(px,py,size*.72,0,Math.PI*2);x.stroke();}
   s.sprite(x,i,px,py-size*.1+(p.hurt>0?Math.sin(p.hurt*60)*3:0),size,{exact:true,mood:p.hurt>0?'sad':p.catching>0?'angry':'walking'});
   for(let h=0;h<DODGE.hp;h++){x.font=`bold ${clamp(W*.028,15,26)}px Arial`;x.textAlign='center';x.fillStyle=h<p.hp?'#e0392f':'#4a4658';x.strokeStyle='#fff';x.lineWidth=3;x.strokeText('♥',px-22+h*22,py-size*.78);x.fillText('♥',px-22+h*22,py-size*.78);}}
  drawBalls();
  for(const f of a.fx){x.globalAlpha=Math.min(1,f.t*2);x.fillStyle='#fff';x.strokeStyle='#7a1d12';x.lineWidth=4;x.font=`bold ${clamp(W*.03,16,28)}px monospace`;x.textAlign='center';x.strokeText(f.text,f.x*sx,(f.y-(1-f.t)*30)*sy);x.fillText(f.text,f.x*sx,(f.y-(1-f.t)*30)*sy);x.globalAlpha=1;}
  x.fillStyle='#1c120acc';x.fillRect(0,0,W,30);x.fillStyle='#fff3b9';x.font=`bold ${clamp(W*.02,12,18)}px monospace`;x.textAlign='center';x.fillText(`ROUND ${a.round} · ${Math.ceil(Math.max(0,left))}s · ${wins[0]} – ${wins[1]}`,W/2,20);
  if(pause>0){x.fillStyle='#000a';x.fillRect(0,H*.4,W,H*.2);x.fillStyle='#fff';x.font=`bold ${clamp(W*.04,18,36)}px monospace`;x.textAlign='center';x.fillText(note,W/2,H*.52);}
  s.setScores(wins.map((n,i)=>n*10+a.players[i].hp));s.status(`Round ${a.round} · ${s.players[0].name} ${a.players[0].hp}♥ vs ${s.players[1].name} ${a.players[1].hp}♥`);
 });
}

// ===================================================================== Fight Night (boxing)
const BOX={W:900,H:560,hp:100,rounds:3,roundTime:35,reach:[120,150]};
function boxer(side){return {x:side?640:260,hp:BOX.hp,stamina:100,state:'idle',t:0,charge:0,pw:false,blocking:false,ducking:0,hurt:0,flash:0,combo:0};}
async function boxing(s){
 const[,x]=s.canvas(900,560,{fill:true});s.shared=true;s.updateScores();
 const {keys,virt,pulse}=touchKeys(s);
 let f=[boxer(0),boxer(1)],wins=[0,0],round=1,left=BOX.roundTime,pause=0,note='',shake=0,fx=[],down=[0,0];const prev=[false,false],held=[0,0];
 const fingers=new Map(),holdStart=[0,0];
 const startPunch=(i,power)=>{const me=f[i];if(pause>0||me.state!=='idle'||me.hurt>0||me.stamina<(power?30:8))return;me.state=power?'hook':'jab';me.pw=power;me.t=0;me.stamina-=power?30:8;me.landed=false;};
 ownedPointers(s,(i,p,id)=>{
  const g=fingers.get(id),now=performance.now();
  if(!g){fingers.set(id,{ax:p.x,sx:p.x,sy:p.y,t0:now,mode:null});holdStart[i]=now;return;}
  const dx=p.x-g.sx,dy=p.y-g.sy;
  if(!g.mode&&Math.hypot(dx,dy)>=16){g.mode=Math.abs(dx)>Math.abs(dy)?'move':dy<0?'guard':'duck';holdStart[i]=0;if(g.mode==='duck')pulse(i,'d',320);if(g.mode==='guard')virt[i].u=true;g.ax=p.x;}
  if(g.mode==='move'||g.mode==='duck'){const lead=p.x-g.ax,max=34;if(Math.abs(lead)>max)g.ax=p.x-Math.sign(lead)*max;const l=p.x-g.ax;virt[i].l=l<-12;virt[i].r=l>12;if(g.mode==='duck'&&Math.abs(dx)>40)g.mode='move';}
 },(i,id,info)=>{
  const g=fingers.get(id);fingers.delete(id);holdStart[i]=0;virt[i].l=virt[i].r=virt[i].u=false;
  if(g&&!g.mode&&!info.cancelled)startPunch(i,performance.now()-g.t0>450);
 });
 s.hint('Your half of the screen is your corner. Tap to jab. Press and hold still, then release, for a slow power hook. Swipe down to duck under a jab (not a hook). Swipe up and keep your finger down to guard: it cuts damage but drains stamina. Drag left or right to step in and out. KO, or most health at the bell, takes the round; first to two rounds. Keyboard: P1 A/D step, W block, S duck, Space punch; P2 arrows + Enter.');
 s.debug={engine:'boxing',state:f,keys,wins};
 if(!await s.pass(0,'Fight Night: three rounds of thirty-five seconds. Jab to build pressure, hook to finish, block and duck to survive.','Both ready — ding ding!'))return;
 const dist=()=>Math.abs(f[1].x-f[0].x);
 // vs CPU: boxer 2 keeps punching range, reads your wind-up (ducks jabs, blocks hooks) and mixes jabs with power hooks
 const cpu=isCpu(s);let cpuT=.6,cpuSeen=null;
 function cpuBox(dt){const me=f[1],o=f[0],v=virt[1],sk=cpuSkill(s),d=dist();if(pause>0){v.l=v.r=v.u=false;return;}
  v.l=d>135;v.r=d<85;if(o.state!=='idle'&&o.t<.12&&cpuSeen!==o){cpuSeen=o;if(Math.random()<.25+sk*.6){if(o.state==='jab')pulse(1,'d',320);else{v.u=true;cpuT=.5;}}}else if(o.state==='idle')cpuSeen=null;
  cpuT-=dt;if(cpuT>0)return;v.u=false;cpuT=.35+(1-sk)*.5+Math.random()*.3;if(d<150&&me.state==='idle'&&me.hurt<=0)startPunch(1,me.stamina>45&&Math.random()<.25+sk*.2);}
 const land=(i,power)=>{
  const me=f[i],foe=f[1-i];let dmg=power?18:6;
  if(foe.ducking>0&&!power){fx.push({x:foe.x,y:230,text:'SLIPPED',t:.7});return;}
  if(foe.blocking&&foe.stamina>0){dmg*=.2;foe.stamina=Math.max(0,foe.stamina-(power?30:10));fx.push({x:foe.x,y:230,text:'BLOCKED',t:.6});sound('tap');}
  else{foe.hurt=.35;shake=power?.35:.15;fx.push({x:foe.x,y:220,text:power?'POW!':'JAB',t:.7});sound(power?'shot':'tap');vibrate(power?30:10);s.react?.(1-i,'sad');me.combo++;}
  foe.hp=Math.max(0,foe.hp-dmg);foe.x+=(foe.x>me.x?1:-1)*(power?34:10);
 };
 s.frame(dt=>{
  shake=Math.max(0,shake-dt);
  if(pause>0){pause-=dt;if(pause<=0){if(wins.some(n=>n>=2)||round>=BOX.rounds+1){s.finish([wins[0]*100+f[0].hp,wins[1]*100+f[1].hp],'Fight Night');return;}round++;left=BOX.roundTime;f=[boxer(0),boxer(1)];s.debug.state=f;}}
  else{
   left-=dt;if(cpu)cpuBox(dt);
   for(let i=0;i<2;i++){
    const me=f[i],k=keys[i],dir=i?-1:1;me.hurt=Math.max(0,me.hurt-dt);me.ducking=Math.max(0,me.ducking-dt);me.stamina=Math.min(100,me.stamina+(me.blocking?7:16)*dt);
    me.blocking=!!k.u&&me.state==='idle';
    if(me.state==='idle'&&me.hurt<=0){
     const fwd=i?k.l:k.r,back=i?k.r:k.l,move=((fwd?1:0)-(back?1:0))*dir;me.x=clamp(me.x+move*170*dt,i?f[0].x+70:90,i?BOX.W-90:f[1].x-70);
     if(k.d&&me.ducking<=0&&me.stamina>=8){me.ducking=.3;me.stamina-=8;}
    }
    if(k.fire&&!prev[i]&&me.state==='idle'&&me.hurt<=0)held[i]=.001;
    if(k.fire&&held[i]>0)held[i]+=dt;
    if(!k.fire&&held[i]>0&&me.state==='idle'){const power=held[i]>.45;if(me.stamina>=(power?30:8)){me.state=power?'hook':'jab';me.pw=power;me.t=0;me.stamina-=power?30:8;me.landed=false;}held[i]=0;}
    prev[i]=!!k.fire;
    if(me.state==='jab'||me.state==='hook'){const wind=me.pw?.3:.1,total=me.pw?.62:.28;me.t+=dt;if(!me.landed&&me.t>=wind){me.landed=true;if(dist()<BOX.reach[me.pw?1:0]+40)land(i,me.pw);else fx.push({x:me.x+dir*80,y:240,text:'WHIFF',t:.4});}if(me.t>=total)me.state='idle';}
   }
   for(const e of fx)e.t-=dt;fx=fx.filter(e=>e.t>0);
   const ko=f.findIndex(b=>b.hp<=0);
   if(ko>=0||left<=0){const w=ko>=0?1-ko:f[0].hp===f[1].hp?-1:f[0].hp>f[1].hp?0:1;if(w>=0){wins[w]++;note=ko>=0?`KNOCKOUT! ${s.players[w].name} takes round ${round}`:`${s.players[w].name} wins round ${round} on points`;s.react?.(w,'win');s.react?.(1-w,'sad');sound('win');}else note=`Round ${round} drawn`;pause=2.4;if(ko>=0)down[ko]=1;s.setScores(wins.map((n,i)=>n*100+f[i].hp));}
  }
  // draw
  const W=s.W,H=s.H,sx=W/BOX.W,sy=H/BOX.H;x.save();if(shake>0)x.translate((Math.random()-.5)*8*shake*4,(Math.random()-.5)*6*shake*4);
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1d1830');bg.addColorStop(1,'#3a2a44');x.fillStyle=bg;x.fillRect(-10,-10,W+20,H+20);
  for(let i=0;i<26;i++){x.fillStyle='#ffffff10';x.beginPath();x.arc((i*97)%W,(i*53)%(H*.5),2,0,6.3);x.fill();}
  x.fillStyle='#2c4a8c';x.fillRect(0,H*.7,W,H*.3);x.fillStyle='#c9302c';x.fillRect(0,H*.7,W,6);
  for(let r=0;r<3;r++){x.strokeStyle=['#d6342c','#f2f2f2','#d6342c'][r];x.lineWidth=6;x.beginPath();x.moveTo(0,H*(.3+r*.12));x.lineTo(W,H*(.3+r*.12));x.stroke();}
  for(let i=0;i<2;i++){const me=f[i],px=me.x*sx,base=H*.78,size=clamp(150*sx,70,150),dir=i?-1:1;
   x.fillStyle='#00000040';x.beginPath();x.ellipse(px,base+4,size*.42,size*.1,0,0,Math.PI*2);x.fill();
   const lean=me.state==='jab'?Math.sin(clamp(me.t/.28,0,1)*Math.PI)*28:me.state==='hook'?Math.sin(clamp(me.t/.62,0,1)*Math.PI)*46:0,duck=me.ducking>0?size*.28:0;
   // body
   x.fillStyle=i?'#d94a8a':'#3f7be0';rr(x,px-size*.26+dir*lean*.4,base-size*.62+duck,size*.52,size*.62,14);x.fill();x.fillStyle='#fff';x.fillRect(px-size*.26+dir*lean*.4,base-size*.1+duck*.2,size*.52,size*.1);
   // head
   s.sprite(x,i,px+dir*lean*.5,base-size*.92+duck+(me.hurt>0?Math.sin(me.hurt*70)*4:0),size*.74,{exact:true,mood:me.hurt>0?'sad':me.state!=='idle'?'angry':'walking'});
   // gloves
   const reach=(me.state==='jab'?Math.sin(clamp(me.t/.28,0,1)*Math.PI)*BOX.reach[0]:me.state==='hook'?Math.sin(clamp(me.t/.62,0,1)*Math.PI)*BOX.reach[1]:0)*sx,gx=px+dir*(size*.38+reach),gy=base-size*(me.blocking?.78:.5)+duck;
   x.strokeStyle=i?'#b03a72':'#2f5fb8';x.lineWidth=9;x.lineCap='round';x.beginPath();x.moveTo(px+dir*size*.2,base-size*.42+duck);x.lineTo(gx,gy);x.stroke();
   x.fillStyle='#d6342c';x.beginPath();x.arc(gx,gy,size*.13,0,Math.PI*2);x.fill();x.strokeStyle='#7a1d12';x.lineWidth=3;x.stroke();
   if(holdStart[i]>0&&performance.now()-holdStart[i]>150){const c=Math.min(1,(performance.now()-holdStart[i])/450);x.strokeStyle=c>=1?'#ffd24a':'#ffffff99';x.lineWidth=4;x.beginPath();x.arc(gx,gy,size*(.2+.12*(1-c)),0,Math.PI*2);x.stroke();}
   if(me.blocking){x.strokeStyle='#8fe3ff';x.lineWidth=5;x.beginPath();x.arc(px+dir*size*.4,base-size*.7,size*.32,-1.2,1.2);x.stroke();}
  }
  // HUD
  for(let i=0;i<2;i++){const me=f[i],bx=i?W-W*.42-16:16,bw=W*.42;x.fillStyle='#000a';x.fillRect(bx,12,bw,22);x.fillStyle=me.hp>35?'#58d26b':'#ef5a5a';x.fillRect(bx+(i?bw*(1-me.hp/BOX.hp):0),12,bw*me.hp/BOX.hp,22);x.fillStyle='#000a';x.fillRect(bx,38,bw,10);x.fillStyle='#f2d54a';x.fillRect(bx+(i?bw*(1-me.stamina/100):0),38,bw*me.stamina/100,10);x.strokeStyle='#fff';x.lineWidth=2;x.strokeRect(bx,12,bw,22);
   x.fillStyle='#fff';x.font=`bold ${clamp(W*.017,11,15)}px monospace`;x.textAlign=i?'right':'left';x.fillText(`${s.players[i].name}  ${'★'.repeat(wins[i])}`,i?bx+bw:bx,62);}
  x.fillStyle='#fff3b9';x.font=`bold ${clamp(W*.03,16,28)}px monospace`;x.textAlign='center';x.fillText(String(Math.ceil(Math.max(0,left))),W/2,34);x.font=`bold ${clamp(W*.014,10,13)}px monospace`;x.fillText(`ROUND ${round}`,W/2,52);
  for(const e of fx){x.globalAlpha=Math.min(1,e.t*2);x.fillStyle='#fff';x.strokeStyle='#7a1d12';x.lineWidth=5;x.font=`bold ${clamp(W*.04,18,34)}px monospace`;x.textAlign='center';x.strokeText(e.text,e.x*sx,(e.y-(1-e.t)*40)*sy);x.fillText(e.text,e.x*sx,(e.y-(1-e.t)*40)*sy);x.globalAlpha=1;}
  if(pause>0){x.fillStyle='#000b';x.fillRect(0,H*.4,W,H*.18);x.fillStyle='#ffe48a';x.font=`bold ${clamp(W*.035,16,32)}px monospace`;x.textAlign='center';x.fillText(note,W/2,H*.51);}
  x.restore();
  s.setScores(wins.map((n,i)=>n*100+f[i].hp));s.status(`Round ${round} · ${s.players[0].name} ${Math.ceil(f[0].hp)} hp vs ${s.players[1].name} ${Math.ceil(f[1].hp)} hp`);
 });
}

// ===================================================================== Gopher Hunt (one player at a time)
const MOUNDS=[[.22,.3],[.5,.3],[.78,.3],[.18,.55],[.5,.55],[.82,.55],[.14,.82],[.5,.82],[.86,.82]];
async function gophers(s){
 const {portraitMoods,portraitURL}=require("src/assets.js");
 // Select distinct owned portraits; characters without variants retain their normal fallback.
 const moodsFor=id=>{
  const seen=new Set(),moods=['normal',...portraitMoods(id)].filter(mood=>{
   const url=portraitURL(id,mood);if(!url||seen.has(url))return false;seen.add(url);return true;
  });
  return moods.length?moods:['normal'];
 };
 const nextMood=a=>{
  const choices=a.moods.length>1?a.moods.filter(mood=>mood!==a.lastMood):a.moods;
  const mood=choices[Math.floor(a.artRandom()*choices.length)];a.lastMood=mood;return mood;
 };
 const[c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body','hole-arena-body');let api;
 const hud=document.createElement('div');hud.className='hole-objectives';s.body.insertBefore(hud,s.body.firstChild);
 return arcadeRounds(s,{
  duration:40,soloPass:(a,r)=>a.score>=15+5*r,soloGoal:r=>`Score at least ${15+5*r} to reach the next round.`,instructions:'Caddyshack gopher hunt. Your rival\u2019s head is the gopher: tap it the moment it pops out of a hole. A crowned head is worth three. Do NOT whack the golf bag or the groundskeeper. Faster pops as time runs out. Alternate rounds, same pop sequence.',
  reset:player=>({mounds:MOUNDS.map(()=>({kind:null,t:0,life:0,hit:0})),spawn:.6,combo:0,hits:0,misses:0,swing:0,fx:[],random:seededRandom(s.seed+':gophers'),moods:moodsFor(s.players[1-player].character),lastMood:null,artRandom:seededRandom(s.seed+':gophers:portraits:'+player)}),
  bind:a=>{api=a;s.on(c,'pointerdown',ev=>{const g=a.get();if(s.paused||!g)return;ev.preventDefault();const p=s.pointer(ev);g.swing=.18;let best=null,bd=1e9;MOUNDS.forEach(([mx,my],i)=>{const m=g.mounds[i];if(!m.kind||m.hit)return;const d=Math.hypot(p.x-mx*s.W,p.y-(my*s.H-26*(s.H/420)));if(d<bd){bd=d;best=i;}});const reach=Math.max(44,s.W*.075);
   if(best!==null&&bd<reach){const m=g.mounds[best];m.hit=.35;if(m.kind==='gopher'||m.kind==='gold'){const pts=(m.kind==='gold'?3:1)+Math.min(3,Math.floor(g.combo/4));g.score+=pts;g.combo++;g.hits++;g.fx.push({x:MOUNDS[best][0],y:MOUNDS[best][1],text:'+'+pts,t:.7});sound('pickup');}else{g.score=Math.max(0,g.score-3);g.combo=0;g.misses++;g.fx.push({x:MOUNDS[best][0],y:MOUNDS[best][1],text:'-3',t:.7});sound('shot');vibrate(25);}}
   else{g.combo=0;}});
   s.hint('Tap your rival\u2019s head before it ducks back down. Crowned heads are +3. Avoid the golf bag and the groundskeeper (-3). A streak of 4 adds bonus points. Missing taps break your streak.');},
  step:(a,dt)=>{
   const pace=Math.max(.32,.82-(1-a.time/40)*.5);a.spawn-=dt;a.swing=Math.max(0,a.swing-dt);
   if(a.spawn<=0){a.spawn=pace*(.7+a.random()*.6);const free=a.mounds.map((m,i)=>m.kind?-1:i).filter(i=>i>=0);if(free.length){const i=free[Math.floor(a.random()*free.length)],r=a.random(),kind=r<.1?'gold':r<.24?(a.random()<.5?'bag':'keeper'):'gopher';a.mounds[i]={kind,mood:kind==='gopher'||kind==='gold'?nextMood(a):null,t:0,life:Math.max(.55,1.25-(1-a.time/40)*.6),hit:0};}}
   for(const m of a.mounds){if(!m.kind)continue;m.t+=dt;m.hit=Math.max(0,m.hit-dt);if(m.t>=m.life+(m.hit>0?.0:0)||(m.hit<=0&&m.hit!==0&&false)){if(m.hit<=0&&m.t>=m.life){m.kind=null;m.t=0;}}if(m.hit>0&&m.hit<dt+.001){m.kind=null;m.t=0;m.hit=0;}}
   for(const f of a.fx)f.t-=dt;a.fx=a.fx.filter(f=>f.t>0);return a.time>0;
  },
  draw:a=>{
   const W=s.W,H=s.H,sc=H/420;const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#bfe3f5');bg.addColorStop(.3,'#cfeaa8');bg.addColorStop(1,'#6fbf5a');x.fillStyle=bg;x.fillRect(0,0,W,H);
   x.fillStyle='#5aa84a';for(let i=0;i<8;i++){x.fillRect(0,H*.2+i*H*.1,W,H*.05);}
   MOUNDS.forEach(([mx,my],i)=>{const m=a.mounds[i],px=mx*W,py=my*H,scale=.7+my*.5,rw=62*scale*sc,rh=24*scale*sc;
    x.fillStyle='#4a2f1c';x.beginPath();x.ellipse(px,py,rw,rh,0,0,Math.PI*2);x.fill();
    if(m.kind){const up=m.hit>0?0:Math.min(1,m.t/.12)*Math.min(1,(m.life-m.t)/.15+.0001),h=up*46*scale*sc,icon=m.kind==='gold'?'🐿':m.kind==='gopher'?'🐹':m.kind==='bag'?'🏌':'👷';
     x.save();x.beginPath();x.rect(px-rw*1.2,py-150*sc*scale,rw*2.4,150*sc*scale);x.clip();
     if(m.kind==='gopher'||m.kind==='gold'){const size=98*scale*sc,cy=py-size*.46*up+size*.56*(1-up);s.sprite(x,1-a.player,px,cy,size,{exact:true,mood:m.hit>0?'sad':m.mood||'normal'});if(m.hit>0){x.font=`${26*scale*sc}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillText('💫',px,cy-size*.5);}else if(m.kind==='gold'){x.font=`${30*scale*sc}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillText('👑',px,cy-size*.56);}}
     else{x.font=`${58*scale*sc}px system-ui`;x.textAlign='center';x.textBaseline='bottom';x.fillStyle='#000';x.fillText(icon,px,py+14*sc-(1-up)*58*scale*sc+rh*.2);}
     x.restore();void h;
     if(m.kind==='gold'){x.strokeStyle='#ffd24a';x.lineWidth=3;x.beginPath();x.ellipse(px,py-34*scale*sc,36*scale*sc,36*scale*sc,0,0,Math.PI*2);x.stroke();}}
    x.fillStyle='#6b4a2f';x.beginPath();x.ellipse(px,py+4*sc,rw,rh*.6,0,0,Math.PI);x.fill();});
   for(const f of a.fx){x.globalAlpha=Math.min(1,f.t*2);x.fillStyle=f.text[0]==='-'?'#ff6a5a':'#fff';x.strokeStyle='#1c3a12';x.lineWidth=4;x.font=`bold ${28*sc}px monospace`;x.textAlign='center';x.strokeText(f.text,f.x*W,f.y*H-50*sc-(1-f.t)*40);x.fillText(f.text,f.x*W,f.y*H-50*sc-(1-f.t)*40);x.globalAlpha=1;}
   if(a.swing>0){x.font=`${64*sc}px system-ui`;x.textAlign='center';x.fillText('🔨',W*.5,H*.97);}
   const markup=`<strong>${Math.ceil(a.time)}s</strong><span>🔨 ${a.hits}</span><span>streak <b>${a.combo}</b></span><span>misses <b>${a.misses}</b></span>`;if(hud.innerHTML!==markup)hud.innerHTML=markup;
   s.status(`${s.players[a.player].name} · ${a.score} points · crowned heads +3, avoid the golf bag and groundskeeper`);s.debug={actor:a,api};
  }
 });
}

// ===================================================================== Archery (one player at a time)
async function archery(s){
 const[c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body','hole-arena-body');let api,drag=null;
 const hud=document.createElement('div');hud.className='hole-objectives';s.body.insertBefore(hud,s.body.firstChild);
 const ARROWS=6;
 const windFor=(random)=>({x:(random()-.5)*2*60});
 return arcadeRounds(s,{
  duration:90,soloPass:(a,r)=>a.score>=Math.min(50,24+4*r),soloGoal:r=>`Score at least ${Math.min(50,24+4*r)} with your six arrows to reach the next round.`,instructions:'Archery with wind. Drag backwards from the bow to draw, aim along the dotted line, then release. Watch the wind flag: it pushes the arrow sideways. Six arrows each. Bullseye is ten points. Same targets and wind for both players.',
  reset:()=>{const random=seededRandom(s.seed+':archery');return {shots:[],arrow:null,wind:windFor(random),winds:Array.from({length:ARROWS},()=>windFor(random)),idx:0,tx:.8,ty:.5,target:{x:.82,y:.5,speed:0},fx:[],done:false,random};},
  bind:a=>{api=a;
   s.on(c,'pointerdown',ev=>{const g=a.get();if(s.paused||!g||g.arrow||g.done)return;ev.preventDefault();drag={id:ev.pointerId,start:s.pointer(ev),now:s.pointer(ev)};s.capture(ev);});
   s.on(c,'pointermove',ev=>{if(drag?.id===ev.pointerId)drag.now=s.pointer(ev);});
   const release=ev=>{if(drag?.id!==ev.pointerId)return;const g=a.get();s.release(ev);const d=drag;drag=null;if(!g||g.arrow||g.done)return;const dx=d.start.x-d.now.x,dy=d.start.y-d.now.y,len=Math.hypot(dx,dy);if(len<18)return;
    const power=clamp(len/(s.W*.32),.15,1),ang=Math.atan2(dy,dx);g.arrow={x:s.W*.12,y:s.H*.7,vx:Math.cos(ang)*power*s.W*1.1,vy:Math.sin(ang)*power*s.W*1.1,t:0,trail:[]};sound('shot');};
   s.on(c,'pointerup',release);s.on(c,'pointercancel',release);
   s.hint('Press anywhere and drag BACK (away from the target) to draw the bow. The farther you pull, the faster the arrow; the pull angle sets the aim. Release to shoot. The flag at the top shows the wind for this arrow.');},
  step:(a,dt)=>{
   const W=s.W,H=s.H;a.target.speed=a.idx>=2?(a.idx-1)*28:0;a.target.y=.5+Math.sin(a.elapsed*.9+a.idx)*(a.idx>=2?.18:0);
   if(a.arrow){const r=a.arrow,wind=a.winds[a.idx]||{x:0};r.t+=dt;r.vy+=H*1.05*dt;r.vx+=wind.x*dt*3.2;r.x+=r.vx*dt;r.y+=r.vy*dt;r.trail.push([r.x,r.y]);if(r.trail.length>26)r.trail.shift();
    const tx=a.target.x*W,ty=a.target.y*H,hitX=r.x>=tx-6&&r.x<=tx+10;
    if(hitX){const d=Math.abs(r.y-ty),R=H*.2,ring=d>R?0:Math.max(1,10-Math.floor(d/R*10));a.shots.push({x:r.x,y:r.y,ring});a.score+=ring;a.fx.push({x:r.x,y:r.y,text:ring?String(ring):'MISS',t:1.1});sound(ring>=9?'win':ring?'pickup':'tap');a.arrow=null;a.idx++;}
    else if(r.x>W+60||r.y>H+60||r.y<-300||r.x<-60){a.shots.push({x:r.x,y:r.y,ring:0,off:true});a.fx.push({x:clamp(r.x,40,W-40),y:clamp(r.y,40,H-40),text:'MISS',t:1});a.arrow=null;a.idx++;}}
   for(const f of a.fx)f.t-=dt;a.fx=a.fx.filter(f=>f.t>0);
   if(a.idx>=ARROWS&&!a.arrow&&!a.done){a.done=true;a.time=Math.min(a.time,1.2);}
   return true;
  },
  draw:a=>{
   const W=s.W,H=s.H,sc=H/420;const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#9fd0ec');bg.addColorStop(.62,'#d9eef7');bg.addColorStop(.62,'#7cbf5c');bg.addColorStop(1,'#4f9a46');x.fillStyle=bg;x.fillRect(0,0,W,H);
   x.fillStyle='#6a9f7a';x.beginPath();x.moveTo(0,H*.62);for(let i=0;i<=10;i++)x.lineTo(W*i/10,H*.56-Math.sin(i*1.3)*H*.04);x.lineTo(W,H*.62);x.closePath();x.fill();
   const tx=a.target.x*W,ty=a.target.y*H,R=H*.2;x.fillStyle='#6b4a2f';x.fillRect(tx-4,ty,8,H*.62-ty+H*.28);x.fillStyle='#00000030';x.beginPath();x.ellipse(tx,H*.9,R*.5,R*.1,0,0,Math.PI*2);x.fill();
   ['#f2f2f2','#222','#58a4fb','#ef5a5a','#f2d54a'].forEach((col,i)=>{x.fillStyle=col;x.beginPath();x.ellipse(tx,ty,R*(1-i*.2)*.5,R*(1-i*.2),0,0,Math.PI*2);x.fill();x.strokeStyle='#0004';x.lineWidth=1;x.stroke();});
   for(const sh of a.shots){if(sh.off)continue;x.strokeStyle='#3b2a1c';x.lineWidth=3;x.beginPath();x.moveTo(sh.x,sh.y);x.lineTo(sh.x-26,sh.y+3);x.stroke();x.fillStyle='#d6342c';x.fillRect(sh.x-30,sh.y,6,6);}
   // archer
   const bx=W*.12,by=H*.7;x.fillStyle='#3a2a1c';x.fillRect(bx-4,by+10,8,H*.18);s.sprite(x,a.player,bx-2,by-6,clamp(H*.16,50,84),{exact:true,mood:'walking'});
   if(drag&&!a.arrow){const dx=drag.start.x-drag.now.x,dy=drag.start.y-drag.now.y,len=Math.hypot(dx,dy),power=clamp(len/(W*.32),.15,1),ang=Math.atan2(dy,dx);x.strokeStyle='#ffffffaa';x.lineWidth=2;x.setLineDash([5,7]);x.beginPath();let px=bx,py=by,vx=Math.cos(ang)*power*W*1.1,vy=Math.sin(ang)*power*W*1.1;x.moveTo(px,py);const wind=a.winds[a.idx]||{x:0};for(let t=0;t<.9;t+=.03){vy+=H*1.05*.03;vx+=wind.x*.03*3.2;px+=vx*.03;py+=vy*.03;x.lineTo(px,py);if(px>W)break;}x.stroke();x.setLineDash([]);x.strokeStyle='#6b4a2f';x.lineWidth=4;x.beginPath();x.arc(bx+10-power*16,by,28,-1.2,1.2);x.stroke();x.strokeStyle='#fff';x.lineWidth=1.5;x.beginPath();x.moveTo(bx+10-power*16+Math.cos(-1.2)*28,by+Math.sin(-1.2)*28);x.lineTo(bx-power*30,by);x.lineTo(bx+10-power*16+Math.cos(1.2)*28,by+Math.sin(1.2)*28);x.stroke();}
   if(a.arrow){const r=a.arrow;x.strokeStyle='#ffffff55';x.lineWidth=2;x.beginPath();a.arrow.trail.forEach(([px,py],i)=>i?x.lineTo(px,py):x.moveTo(px,py));x.stroke();const ang=Math.atan2(r.vy,r.vx);x.save();x.translate(r.x,r.y);x.rotate(ang);x.strokeStyle='#3b2a1c';x.lineWidth=3;x.beginPath();x.moveTo(-26,0);x.lineTo(6,0);x.stroke();x.fillStyle='#c9c9c9';x.beginPath();x.moveTo(10,0);x.lineTo(2,-4);x.lineTo(2,4);x.fill();x.fillStyle='#d6342c';x.fillRect(-28,-3,6,6);x.restore();}
   // wind flag
   const wind=a.winds[Math.min(a.idx,ARROWS-1)]||{x:0},fx=W*.5,fy=H*.14;x.strokeStyle='#fff';x.lineWidth=4;x.beginPath();x.moveTo(fx,fy+30);x.lineTo(fx,fy-20);x.stroke();x.fillStyle='#ef5a5a';const len=clamp(wind.x*.9,-60,60);x.beginPath();x.moveTo(fx,fy-20);x.lineTo(fx+len,fy-14+Math.sin(a.elapsed*5)*3);x.lineTo(fx+len,fy+2+Math.sin(a.elapsed*5)*3);x.lineTo(fx,fy);x.closePath();x.fill();x.fillStyle='#fff';x.font=`bold ${clamp(W*.02,11,16)}px monospace`;x.textAlign='center';x.fillText(`WIND ${wind.x>0?'→':wind.x<0?'←':'·'} ${Math.abs(Math.round(wind.x/6))}`,fx,fy+48);
   for(const f of a.fx){x.globalAlpha=Math.min(1,f.t*2);x.fillStyle='#fff';x.strokeStyle='#123';x.lineWidth=4;x.font=`bold ${30*sc}px monospace`;x.textAlign='center';x.strokeText(f.text,f.x,f.y-(1.1-f.t)*40);x.fillText(f.text,f.x,f.y-(1.1-f.t)*40);x.globalAlpha=1;}
   const markup=`<strong>🏹 ${Math.min(a.idx+1,ARROWS)}/${ARROWS}</strong><span>score <b>${a.score}</b></span>`;if(hud.innerHTML!==markup)hud.innerHTML=markup;
   s.status(`${s.players[a.player].name} · ${a.score} points · arrow ${Math.min(a.idx+1,ARROWS)} of ${ARROWS}`);s.debug={actor:a,api};
  }
 });
}
Object.assign(exports,{blocks,shred,dodgeball,boxing,gophers,archery,PIECES,blockSequence,shredChart,SHRED,DODGE,BOX});
