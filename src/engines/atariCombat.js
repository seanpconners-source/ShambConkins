// Cardboard Box Tank Duel, rebuilt as Atari 2600 Combat (1977) "Tank-Pong": two blocky tanks in a symmetric maze
// rendered at 2600-style low resolution and scaled up with hard pixels, shells that ricochet twice, hit tanks that
// spin out, score digits in tank colours. Your head pops out of the hatch. Both at once: hold and drag on your half
// like a joystick to drive, tap (or tap a second finger) to fire. First to 7 hits or most after 90 seconds.
// Online (netField): the upright maze on both phones, turned so your tank starts at the bottom. Each phone drives only
// its own tank and judges only shells hitting it (yours after a bounce, or theirs as this phone flies them). Tank
// {f:{p:[x,y,a],v:[vx,vy],sp}} 30/s (the other tank eases toward it, run on by its speed), {e:{fire:[id,x,y,vx,vy]}} a
// shell (both phones fly it), {e:{hit:[shooter,id,n]}} = hit n on the sender. Each phone's own count of hits taken is
// the other player's score; the end {fin:{h}} carries it, so both phones finish with the same numbers.
const {clamp}=require("src/utils.js");
const {voice,noise,makeShake,halfPointers,keyboard}=require("src/engines/tarantinoKit.js");
const {drawDigits}=require("src/engines/atariPong.js");
const {scanlines,vignette}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");

const MAZES=[['....................','....................','..##............##..','..#..............#..','.......##..##.......','...#....#..#....#...','...#....#..#....#...','.......##..##.......','..#..............#..','..##............##..','....................','....................'],
 ['....................','.........##.........','...#............#...','...#....####....#...','...#............#...','......#......#......','......#......#......','...#............#...','...#....####....#...','...#............#...','.........##.........','....................']];
const BG='#b9853f',WALL='#5e3313',TCOL=['#46d17a','#5a8dff'],CELL=8,TARGET=7,SECONDS=90;

async function tank(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.shared=true;s.updateScores();s.ownHud(true,true);
 const shake=makeShake();const maze=MAZES[Math.floor(s.random()*MAZES.length)];
 const on=s.online||null,me=on?on.me:0,them=1-me,STRIP=on?0:12;
 let portrait=false,cols=20,rows=12,grid=null,buf=null,bx=null,t=0,state='wait';const score=[0,0];
 const tanks=[0,1].map(i=>({i,x:0,y:0,a:0,spin:0,shell:null,fireCD:0,drive:0,turn:0}));
 const keys=[{},{}];
 // online view: the buffer turned to this screen (VM: sx=a·wx+b·wy, sy=c·wx+d·wy), scale VK about centre VO
 let VM=[1,0,0,1],VK=1,VO=[0,0],netBot=false,hitsTaken=0,shellN=0,R=null,endWait=false;const seen={x:0,y:0,a:0,vx:0,vy:0,at:0};
 function build(){portrait=!!on||s.H>s.W*1.05;cols=portrait?12:20;rows=portrait?20:12;grid=[];for(let r=0;r<rows;r++){grid.push([]);for(let cI=0;cI<cols;cI++){const ch=portrait?maze[cI][19-r]:maze[r][cI];grid[r].push(ch==='#');}}
  buf=document.createElement('canvas');buf.width=cols*CELL;buf.height=rows*CELL+STRIP;bx=buf.getContext('2d');
  const W=buf.width,H=rows*CELL;if(portrait){Object.assign(tanks[0],{x:W/2-8,y:H-10,a:-Math.PI/2});Object.assign(tanks[1],{x:W/2+8,y:10,a:Math.PI/2});}else{Object.assign(tanks[0],{x:10,y:H/2+6,a:0});Object.assign(tanks[1],{x:W-10,y:H/2-6,a:Math.PI});}
  for(const tk of tanks){tk.spin=0;tk.shell=null;}Object.assign(seen,{x:tanks[them].x,y:tanks[them].y,a:tanks[them].a,vx:0,vy:0,at:0});}
 const wallAt=(px,py)=>{const H=rows*CELL;if(px<0||py<0||px>=cols*CELL||py>=H)return true;return grid[Math.floor(py/CELL)]?.[Math.floor(px/CELL)];};
 const blocked=(px,py,r=3.2)=>wallAt(px-r,py-r)||wallAt(px+r,py-r)||wallAt(px-r,py+r)||wallAt(px+r,py+r);
 const nf=netField(s,{hz:30,
  pack:()=>{const tk=tanks[me];return {p:[+tk.x.toFixed(2),+tk.y.toFixed(2),+tk.a.toFixed(3)],v:[+(tk.vx||0).toFixed(1),+(tk.vy||0).toFixed(1)],sp:+tk.spin.toFixed(2)};},
  unpack:(i,d)=>{if(!Array.isArray(d?.p))return;const [px,py,pa]=d.p.map(Number);if(![px,py,pa].every(Number.isFinite))return;const v=Array.isArray(d.v)?d.v.map(Number):[0,0];
   Object.assign(seen,{x:px,y:py,a:pa,vx:Number.isFinite(v[0])?v[0]:0,vy:Number.isFinite(v[1])?v[1]:0,at:performance.now()});tanks[them].spin=Number.isFinite(d.sp)?d.sp:0;},
  onEvent:e=>{if(state!=='play'&&state!=='over')return;const o=tanks[them];
   if(Array.isArray(e.fire)){const [id,px,py,vx,vy]=e.fire;if([px,py,vx,vy].every(Number.isFinite)){o.shell={id,x:px,y:py,vx,vy,life:2.4,bounces:0};noise(.12,.08,{f0:2600,f1:400});voice(220,.08,.05,'square',{slide:.5});}}
   else if(Array.isArray(e.hit)){const [shooter,id,n]=e.hit;const tk=tanks[shooter===me?me:them];if(tk.shell&&tk.shell.id===id)tk.shell=null;if(Number.isFinite(n))score[me]=Math.max(score[me],n|0);o.spin=Math.max(o.spin,1);s.setScores(score);
    noise(.6,.14,{f0:1400,f1:60});voice(90,.5,.08,'sawtooth',{slide:.4,lp:700});shake.kick(6);s.react?.(me,'win',1.2);s.react?.(them,'sad',1.2);}}});
 function fire(tk){if(state!=='play'||tk.spin>0||tk.shell||tk.fireCD>0)return;tk.shell={id:shellN++,x:tk.x+Math.cos(tk.a)*5,y:tk.y+Math.sin(tk.a)*5,vx:Math.cos(tk.a)*78,vy:Math.sin(tk.a)*78,life:2.4,bounces:0};tk.fireCD=.35;noise(.12,.08,{f0:2600,f1:400});voice(220,.08,.05,'square',{slide:.5});
  if(on){const sh=tk.shell;nf.event({fire:[sh.id,+sh.x.toFixed(2),+sh.y.toFixed(2),+sh.vx.toFixed(2),+sh.vy.toFixed(2)]});}}
 const fingers=halfPointers(s,{chooseOwner:on?()=>me:p=>portrait?(p.y>s.H/2?0:1):(p.x<s.W/2?0:1),
  down:(i,r)=>{const others=[...fingers.values()].filter(q=>q.i===i&&q!==r);if(others.length)fire(tanks[i]);},
  up:(i,r,{cancelled})=>{if(!cancelled&&r.dist<14&&performance.now()-r.t0<300)fire(tanks[i]);}});
 keyboard(s,(i,name,down)=>{if(on)i=me;keys[i][name]=down;if(name==='act'&&down)fire(tanks[i]);});
 s.hint(on?'Hold and drag anywhere like a joystick: the tank turns toward your drag and rolls forward. Tap to fire (or tap a second finger while driving). Shells ricochet twice. First to 7 hits. Keys: WASD / arrows + Space / Enter.':'Hold and drag on your own side like a joystick: the tank turns toward your drag and rolls forward. Tap to fire (or tap a second finger while driving). Shells ricochet twice. First to 7 hits. Keys: P1 WASD + Space, P2 arrows + Enter.');
 // vs CPU: tank 2 follows a breadth-first path through the maze, turns to face you when the line is clear and fires
 const cpu=isCpu(s);let cpuT=0,cpuNext=null,cpuAim=0;
 const clearLine=(a,b)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/3);for(let q=1;q<n;q++)if(wallAt(a.x+(b.x-a.x)*q/n,a.y+(b.y-a.y)*q/n))return false;return true;};
 function cpuPath(from,o){const cell=p=>[Math.floor(p.y/CELL),Math.floor(p.x/CELL)],[sr,sc]=cell(from),[gr,gc]=cell(o),key=(r,c)=>r*cols+c,prev=new Map([[key(sr,sc),-1]]),q=[[sr,sc]];
  while(q.length){const [r,c]=q.shift();if(r===gr&&c===gc)break;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const nr=r+dr,nc=c+dc;if(nr<0||nc<0||nr>=rows||nc>=cols||grid[nr][nc]||prev.has(key(nr,nc)))continue;prev.set(key(nr,nc),key(r,c));q.push([nr,nc]);}}
  let k=key(gr,gc);if(!prev.has(k))return null;const path=[];while(k!==-1&&k!==key(sr,sc)){path.unshift(k);k=prev.get(k);}const n=path[Math.min(1,path.length-1)];return n===undefined?null:{x:(n%cols+.5)*CELL,y:(Math.floor(n/cols)+.5)*CELL};}
 // i = the tank it drives (online test bot: this phone's own)
 function cpuThink(dt,i=1){const tk=tanks[i],o=tanks[1-i],k=keys[i],rr=on?Math.random:s.random;k.l=k.r=k.u=k.d=false;if(state!=='play'||tk.spin>0)return;const sk=cpuSkill(s);
  cpuT-=dt;if(cpuT<=0){cpuT=.3;cpuNext=cpuPath(tk,o);cpuAim=(rr()-.5)*(1-sk)*.22;}
  const see=clearLine(tk,o),tgt=see?o:cpuNext||o,want=Math.atan2(tgt.y-tk.y,tgt.x-tk.x)+(see?cpuAim:0);let da=want-tk.a;da=Math.atan2(Math.sin(da),Math.cos(da));
  k.r=da>.12;k.l=da<-.12;k.u=!see&&Math.abs(da)<.9||see&&Math.hypot(o.x-tk.x,o.y-tk.y)>34&&Math.abs(da)<.5;
  if(see&&Math.abs(da)<.08+(1-sk)*.08&&!tk.shell&&rr()<dt*(2+sk*6)){fire(tk);cpuAim=(rr()-.5)*(1-sk)*.22;}}
 // online: the other tank eases toward where its last report says it is now
 function theirMove(tk,dt){const k=Math.min(.15,(performance.now()-(seen.at||performance.now()))/1000),tx=seen.x+seen.vx*k,ty=seen.y+seen.vy*k,e=Math.min(1,dt*18);
  tk.x+=(tx-tk.x)*e;tk.y+=(ty-tk.y)*e;let da=seen.a-tk.a;da=Math.atan2(Math.sin(da),Math.cos(da));tk.a+=da*Math.min(1,dt*24);tk.spin=Math.max(0,tk.spin-dt);tk.fireCD=Math.max(0,tk.fireCD-dt);}
 // online: a shell hit this phone's tank (hit n of the game)
 function hitMine(tk,sh){const o=tanks[me];tk.shell=null;o.spin=1.1;o.hitA=Math.atan2(sh.vy,sh.vx)+Math.PI;hitsTaken++;score[them]=hitsTaken;s.setScores(score);
  noise(.6,.14,{f0:1400,f1:60});voice(90,.5,.08,'sawtooth',{slide:.4,lp:700});shake.kick(10);vibrate(40);s.react?.(them,'win',1.2);s.react?.(me,'sad',1.2);
  nf.event({hit:[tk.i,sh.id,hitsTaken]});nf.push();}
 function step(dt){
  const H=rows*CELL;if(cpu)cpuThink(dt);if(on&&netBot)cpuThink(dt,me);
  for(const tk of tanks){
   if(on&&tk.i!==me){theirMove(tk,dt);continue;}
   tk.fireCD=Math.max(0,tk.fireCD-dt);const x0=tk.x,y0=tk.y;
   if(tk.spin>0){tk.spin-=dt;tk.a+=dt*14;const nx=tk.x-Math.cos(tk.hitA)*16*dt,ny=tk.y-Math.sin(tk.hitA)*16*dt;if(!blocked(nx,tk.y))tk.x=nx;if(!blocked(tk.x,ny))tk.y=ny;tk.vx=(tk.x-x0)/Math.max(dt,1e-3);tk.vy=(tk.y-y0)/Math.max(dt,1e-3);continue;}
   let turn=0,drive=0;const k=keys[tk.i];turn=(k.r?1:0)-(k.l?1:0);drive=(k.u?1:0)-(k.d?1:0)*.6;
   const f=[...fingers.values()].find(q=>q.i===tk.i);
   if(f){let dx=f.x-f.sx,dy=f.y-f.sy;const d=Math.hypot(dx,dy);if(on)[dx,dy]=[VM[0]*dx+VM[2]*dy,VM[1]*dx+VM[3]*dy];if(d>14){const want=Math.atan2(dy,dx);let da=want-tk.a;da=Math.atan2(Math.sin(da),Math.cos(da));turn=clamp(da*2.5,-1,1);drive=Math.abs(da)<1.2?clamp(d/60,0,1):0;}}
   tk.a+=turn*2.8*dt;const sp=26*drive;const nx=tk.x+Math.cos(tk.a)*sp*dt,ny=tk.y+Math.sin(tk.a)*sp*dt;if(!blocked(nx,tk.y))tk.x=nx;if(!blocked(tk.x,ny))tk.y=ny;
   const o=tanks[1-tk.i];const d2=Math.hypot(o.x-tk.x,o.y-tk.y);if(d2<7&&d2>0){tk.x-=(o.x-tk.x)/d2*(7-d2)*.5;tk.y-=(o.y-tk.y)/d2*(7-d2)*.5;}
   tk.vx=(tk.x-x0)/Math.max(dt,1e-3);tk.vy=(tk.y-y0)/Math.max(dt,1e-3);
   if(drive&&Math.random()<dt*10)voice(55+Math.random()*10,.05,.02,'square',{lp:200});
  }
  for(const tk of tanks){const sh=tk.shell;if(!sh)continue;sh.life-=dt;const nx=sh.x+sh.vx*dt,ny=sh.y+sh.vy*dt;
   if(wallAt(nx,ny)){if(sh.bounces>=2){tk.shell=null;continue;}sh.bounces++;if(wallAt(nx,sh.y))sh.vx=-sh.vx;if(wallAt(sh.x,ny))sh.vy=-sh.vy;if(!wallAt(nx,sh.y)&&!wallAt(sh.x,ny)){sh.vx=-sh.vx;sh.vy=-sh.vy;}voice(700,.03,.03,'square');}
   else{sh.x=nx;sh.y=ny;}
   if(sh.life<=0){tk.shell=null;continue;}
   for(const o of tanks){if(o===tk&&sh.bounces===0)continue;if(o.spin>0||on&&o.i!==me)continue;if(Math.hypot(o.x-sh.x,o.y-sh.y)<4.2){if(on){hitMine(tk,sh);break;}tk.shell=null;o.spin=1.1;o.hitA=Math.atan2(sh.vy,sh.vx)+Math.PI;const scorer=o===tk?1-tk.i:tk.i;score[scorer]++;s.setScores(score);noise(.6,.14,{f0:1400,f1:60});voice(90,.5,.08,'sawtooth',{slide:.4,lp:700});shake.kick(10);vibrate(40);s.react?.(scorer,'win',1.2);s.react?.(o.i,'sad',1.2);break;}}
  }
 }
 // online end: both phones stop and finish from each other's count of hits taken
 async function netEnd(){if(endWait)return;endWait=true;state='over';nf.finish({h:hitsTaken});const fin=await nf.remoteDone();if(!s.alive)return;
  if(fin&&Number.isFinite(fin.h))score[me]=fin.h|0;score[them]=hitsTaken;s.setScores(score);setTimeout(()=>s.finish(score.slice(),`Combat · ${score[0]}–${score[1]}`),1200);}
 function view(){const SW=s.W,SH=s.H,top=80,BW=buf.width,BH=buf.height,side=SW>SH-top;
  VM=side?(me?[0,1,-1,0]:[0,-1,1,0]):(me?[-1,0,0,-1]:[1,0,0,1]);const vw=side?BH:BW,vh=side?BW:BH;
  VK=Math.min(SW/vw,(SH-top-4)/vh);VO=[SW/2,top+(SH-top-4)/2];}
 const toScreen=(wx,wy)=>{const gx=wx-buf.width/2,gy=wy-buf.height/2;return [VO[0]+VK*(VM[0]*gx+VM[1]*gy),VO[1]+VK*(VM[2]*gx+VM[3]*gy)];};
 function drawTank(g,tk){g.save();g.translate(Math.round(tk.x),Math.round(tk.y));g.rotate(Math.round(tk.a/(Math.PI/8))*(Math.PI/8));g.fillStyle=TCOL[tk.i];
  g.fillRect(-4,-4,8,2);g.fillRect(-4,2,8,2);g.fillRect(-3,-2,6,4);g.fillRect(0,-1,6,2);g.restore();}
 s.frame(dt=>{
  t+=dt;shake.step(dt);if(!grid)build();if(on&&R&&state==='play')t=(performance.now()-R.t0)/1000;
  if(state==='play'){step(dt);
   if(on){nf.tick(dt);if(score.some(v=>v>=TARGET)||t>=SECONDS||nf.fin!==undefined)void netEnd();}
   else if(score.some(v=>v>=TARGET)||t>=SECONDS){state='over';setTimeout(()=>s.finish(score,`Combat · ${score[0]}–${score[1]}`),1200);}}
  // low-res playfield
  const g=bx,BW=buf.width,BH=buf.height,H=rows*CELL;g.imageSmoothingEnabled=false;g.fillStyle=BG;g.fillRect(0,0,BW,BH);
  g.fillStyle=WALL;for(let r=0;r<rows;r++)for(let cI=0;cI<cols;cI++)if(grid[r][cI])g.fillRect(cI*CELL,r*CELL+STRIP,CELL,CELL);
  g.save();g.translate(0,STRIP);for(const tk of tanks){if(tk.spin>0&&Math.floor(t*20)%2)continue;drawTank(g,tk);}
  g.fillStyle='#fff7d0';for(const tk of tanks)if(tk.shell)g.fillRect(Math.round(tk.shell.x)-1,Math.round(tk.shell.y)-1,2,2);g.restore();
  if(!on){g.fillStyle=TCOL[0];drawDigits(g,score[0],BW*.3,2,1.6);g.fillStyle=TCOL[1];drawDigits(g,score[1],BW*.7,2,1.6);}
  // scale up with hard pixels to fill the screen
  const W=s.W,Hs=s.H;x.setTransform(1,0,0,1,0,0);x.fillStyle=BG;x.fillRect(0,0,W,Hs);
  const left=Math.max(0,Math.ceil(SECONDS-t));
  if(on){view();const sk=shake.mag>.3?(Math.random()-.5)*shake.mag:0;x.imageSmoothingEnabled=false;x.setTransform(VK*VM[0],VK*VM[2],VK*VM[1],VK*VM[3],VO[0]+sk-VK*(VM[0]*BW/2+VM[1]*BH/2),VO[1]-VK*(VM[2]*BW/2+VM[3]*BH/2));x.drawImage(buf,0,0);x.setTransform(1,0,0,1,0,0);x.imageSmoothingEnabled=true;
   for(const tk of tanks){if(tk.spin>0&&Math.floor(t*20)%2)continue;const [X,Y]=toScreen(tk.x-Math.cos(tk.a)*1.5,tk.y-Math.sin(tk.a)*1.5);s.sprite(x,tk.i,X,Y,Math.max(22,VK*5.6),{exact:true});}
   const cell=clamp(VK*1.6,3,7);x.fillStyle=TCOL[me];drawDigits(x,score[me],W*.3,44,cell);x.fillStyle=TCOL[them];drawDigits(x,score[them],W*.7,44,cell);
   x.fillStyle='#3a1f0a';x.font=`900 ${clamp(VK*3.4,11,20)}px monospace`;x.textAlign='center';x.fillText(state==='sync'?'…':String(left),W/2,44+cell*4);}
  else{const top=portrait?44:6,k=Math.min(W/BW,(Hs-top-4)/BH),ox=(W-BW*k)/2+(shake.mag>.3?(Math.random()-.5)*shake.mag:0),oy=top+(Hs-top-4-BH*k)/2;
   x.imageSmoothingEnabled=false;x.drawImage(buf,ox,oy,BW*k,BH*k);x.imageSmoothingEnabled=true;
   // heads pop out of the hatches
   for(const tk of tanks){if(tk.spin>0&&Math.floor(t*20)%2)continue;s.sprite(x,tk.i,ox+(tk.x-Math.cos(tk.a)*1.5)*k,oy+(tk.y+12-Math.sin(tk.a)*1.5)*k,Math.max(22,k*5.6),{exact:true});}
   x.fillStyle='#3a1f0a';x.font=`900 ${Math.max(11,k*3.4)}px monospace`;x.textAlign='center';x.fillText(String(left),ox+BW*k/2,oy+k*9);}
  scanlines(x,W,Hs,.14);vignette(x,W,Hs,.35);
  s.debug={engine:'tank',tanks,score,state,portrait,hitsTaken,bot:on?()=>{netBot=true;return '';}:null};
 });
 const intro=on?`Combat! You drive the ${me?'blue':'green'} tank; ${s.players[them].name} plays on the other phone. Hold and drag anywhere like a joystick to drive, tap to fire; shells ricochet twice. First to ${TARGET} hits.`:`Combat! ${s.players[0].name} drives the green tank (${'left / bottom'} side of the screen), ${s.players[1].name} the blue one. Hold and drag like a joystick to drive, tap to fire; shells ricochet twice. First to ${TARGET} hits.`;
 if(!await s.pass(0,intro,'Both ready — combat!',{countdown:3}))return;
 build();if(on){state='sync';await nf.start('go');if(!s.alive)return;R={t0:performance.now()};t=0;}state='play';if(!on)t=0;
}
Object.assign(exports,{tank});
