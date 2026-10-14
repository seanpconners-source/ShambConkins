// Cardboard Box Tank Duel, rebuilt as Atari 2600 Combat (1977) "Tank-Pong": two blocky tanks in a symmetric maze
// rendered at 2600-style low resolution and scaled up with hard pixels, shells that ricochet twice, hit tanks that
// spin out, score digits in tank colours. Your head pops out of the hatch. Both at once: hold and drag on your half
// like a joystick to drive, tap (or tap a second finger) to fire. First to 7 hits or most after 90 seconds.
const {clamp}=require("src/utils.js");
const {voice,noise,makeShake,halfPointers,keyboard}=require("src/engines/tarantinoKit.js");
const {drawDigits}=require("src/engines/atariPong.js");
const {scanlines,vignette}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

const MAZES=[['....................','....................','..##............##..','..#..............#..','.......##..##.......','...#....#..#....#...','...#....#..#....#...','.......##..##.......','..#..............#..','..##............##..','....................','....................'],
 ['....................','.........##.........','...#............#...','...#....####....#...','...#............#...','......#......#......','......#......#......','...#............#...','...#....####....#...','...#............#...','.........##.........','....................']];
const BG='#b9853f',WALL='#5e3313',TCOL=['#46d17a','#5a8dff'],CELL=8,TARGET=7,SECONDS=90;

async function tank(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.shared=true;s.updateScores();s.ownHud(true,true);
 const shake=makeShake();const maze=MAZES[Math.floor(s.random()*MAZES.length)];
 let portrait=false,cols=20,rows=12,grid=null,buf=null,bx=null,t=0,state='wait';const score=[0,0];
 const tanks=[0,1].map(i=>({i,x:0,y:0,a:0,spin:0,shell:null,fireCD:0,drive:0,turn:0}));
 const keys=[{},{}];
 function build(){portrait=s.H>s.W*1.05;cols=portrait?12:20;rows=portrait?20:12;grid=[];for(let r=0;r<rows;r++){grid.push([]);for(let cI=0;cI<cols;cI++){const ch=portrait?maze[cI][19-r]:maze[r][cI];grid[r].push(ch==='#');}}
  buf=document.createElement('canvas');buf.width=cols*CELL;buf.height=rows*CELL+12;bx=buf.getContext('2d');
  const W=buf.width,H=rows*CELL;if(portrait){Object.assign(tanks[0],{x:W/2-8,y:H-10,a:-Math.PI/2});Object.assign(tanks[1],{x:W/2+8,y:10,a:Math.PI/2});}else{Object.assign(tanks[0],{x:10,y:H/2+6,a:0});Object.assign(tanks[1],{x:W-10,y:H/2-6,a:Math.PI});}
  for(const tk of tanks){tk.spin=0;tk.shell=null;}}
 const wallAt=(px,py)=>{const H=rows*CELL;if(px<0||py<0||px>=cols*CELL||py>=H)return true;return grid[Math.floor(py/CELL)]?.[Math.floor(px/CELL)];};
 const blocked=(px,py,r=3.2)=>wallAt(px-r,py-r)||wallAt(px+r,py-r)||wallAt(px-r,py+r)||wallAt(px+r,py+r);
 function fire(tk){if(state!=='play'||tk.spin>0||tk.shell||tk.fireCD>0)return;tk.shell={x:tk.x+Math.cos(tk.a)*5,y:tk.y+Math.sin(tk.a)*5,vx:Math.cos(tk.a)*78,vy:Math.sin(tk.a)*78,life:2.4,bounces:0};tk.fireCD=.35;noise(.12,.08,{f0:2600,f1:400});voice(220,.08,.05,'square',{slide:.5});}
 const fingers=halfPointers(s,{chooseOwner:p=>portrait?(p.y>s.H/2?0:1):(p.x<s.W/2?0:1),
  down:(i,r)=>{const others=[...fingers.values()].filter(q=>q.i===i&&q!==r);if(others.length)fire(tanks[i]);},
  up:(i,r,{cancelled})=>{if(!cancelled&&r.dist<14&&performance.now()-r.t0<300)fire(tanks[i]);}});
 keyboard(s,(i,name,down)=>{keys[i][name]=down;if(name==='act'&&down)fire(tanks[i]);});
 s.hint('Hold and drag on your own side like a joystick: the tank turns toward your drag and rolls forward. Tap to fire (or tap a second finger while driving). Shells ricochet twice. First to 7 hits. Keys: P1 WASD + Space, P2 arrows + Enter.');
 function step(dt){
  const H=rows*CELL;
  for(const tk of tanks){tk.fireCD=Math.max(0,tk.fireCD-dt);
   if(tk.spin>0){tk.spin-=dt;tk.a+=dt*14;const nx=tk.x-Math.cos(tk.hitA)*16*dt,ny=tk.y-Math.sin(tk.hitA)*16*dt;if(!blocked(nx,tk.y))tk.x=nx;if(!blocked(tk.x,ny))tk.y=ny;continue;}
   let turn=0,drive=0;const k=keys[tk.i];turn=(k.r?1:0)-(k.l?1:0);drive=(k.u?1:0)-(k.d?1:0)*.6;
   const f=[...fingers.values()].find(q=>q.i===tk.i);
   if(f){let dx=f.x-f.sx,dy=f.y-f.sy;const d=Math.hypot(dx,dy);if(d>14){const want=Math.atan2(dy,dx);let da=want-tk.a;da=Math.atan2(Math.sin(da),Math.cos(da));turn=clamp(da*2.5,-1,1);drive=Math.abs(da)<1.2?clamp(d/60,0,1):0;}}
   tk.a+=turn*2.8*dt;const sp=26*drive;const nx=tk.x+Math.cos(tk.a)*sp*dt,ny=tk.y+Math.sin(tk.a)*sp*dt;if(!blocked(nx,tk.y))tk.x=nx;if(!blocked(tk.x,ny))tk.y=ny;
   const o=tanks[1-tk.i];const d2=Math.hypot(o.x-tk.x,o.y-tk.y);if(d2<7&&d2>0){tk.x-=(o.x-tk.x)/d2*(7-d2)*.5;tk.y-=(o.y-tk.y)/d2*(7-d2)*.5;}
   if(drive&&Math.random()<dt*10)voice(55+Math.random()*10,.05,.02,'square',{lp:200});
  }
  for(const tk of tanks){const sh=tk.shell;if(!sh)continue;sh.life-=dt;const nx=sh.x+sh.vx*dt,ny=sh.y+sh.vy*dt;
   if(wallAt(nx,ny)){if(sh.bounces>=2){tk.shell=null;continue;}sh.bounces++;if(wallAt(nx,sh.y))sh.vx=-sh.vx;if(wallAt(sh.x,ny))sh.vy=-sh.vy;if(!wallAt(nx,sh.y)&&!wallAt(sh.x,ny)){sh.vx=-sh.vx;sh.vy=-sh.vy;}voice(700,.03,.03,'square');}
   else{sh.x=nx;sh.y=ny;}
   if(sh.life<=0){tk.shell=null;continue;}
   for(const o of tanks){if(o===tk&&sh.bounces===0)continue;if(o.spin>0)continue;if(Math.hypot(o.x-sh.x,o.y-sh.y)<4.2){tk.shell=null;o.spin=1.1;o.hitA=Math.atan2(sh.vy,sh.vx)+Math.PI;const scorer=o===tk?1-tk.i:tk.i;score[scorer]++;s.setScores(score);noise(.6,.14,{f0:1400,f1:60});voice(90,.5,.08,'sawtooth',{slide:.4,lp:700});shake.kick(10);vibrate(40);s.react?.(scorer,'win',1.2);s.react?.(o.i,'sad',1.2);break;}}
  }
 }
 function drawTank(g,tk){g.save();g.translate(Math.round(tk.x),Math.round(tk.y));g.rotate(Math.round(tk.a/(Math.PI/8))*(Math.PI/8));g.fillStyle=TCOL[tk.i];
  g.fillRect(-4,-4,8,2);g.fillRect(-4,2,8,2);g.fillRect(-3,-2,6,4);g.fillRect(0,-1,6,2);g.restore();}
 s.frame(dt=>{
  t+=dt;shake.step(dt);if(!grid)build();
  if(state==='play'){step(dt);if(score.some(v=>v>=TARGET)||t>=SECONDS){state='over';setTimeout(()=>s.finish(score,`Combat · ${score[0]}–${score[1]}`),1200);}}
  // low-res playfield
  const g=bx,BW=buf.width,BH=buf.height,H=rows*CELL;g.imageSmoothingEnabled=false;g.fillStyle=BG;g.fillRect(0,0,BW,BH);
  g.fillStyle=WALL;for(let r=0;r<rows;r++)for(let cI=0;cI<cols;cI++)if(grid[r][cI])g.fillRect(cI*CELL,r*CELL+12,CELL,CELL);
  g.save();g.translate(0,12);for(const tk of tanks){if(tk.spin>0&&Math.floor(t*20)%2)continue;drawTank(g,tk);}
  g.fillStyle='#fff7d0';for(const tk of tanks)if(tk.shell)g.fillRect(Math.round(tk.shell.x)-1,Math.round(tk.shell.y)-1,2,2);g.restore();
  g.fillStyle=TCOL[0];drawDigits(g,score[0],BW*.3,2,1.6);g.fillStyle=TCOL[1];drawDigits(g,score[1],BW*.7,2,1.6);
  // scale up with hard pixels to fill the screen
  const W=s.W,Hs=s.H;x.setTransform(1,0,0,1,0,0);x.fillStyle=BG;x.fillRect(0,0,W,Hs);
  const top=portrait?44:6,k=Math.min(W/BW,(Hs-top-4)/BH),ox=(W-BW*k)/2+(shake.mag>.3?(Math.random()-.5)*shake.mag:0),oy=top+(Hs-top-4-BH*k)/2;
  x.imageSmoothingEnabled=false;x.drawImage(buf,ox,oy,BW*k,BH*k);x.imageSmoothingEnabled=true;
  // heads pop out of the hatches
  for(const tk of tanks){if(tk.spin>0&&Math.floor(t*20)%2)continue;s.sprite(x,tk.i,ox+(tk.x-Math.cos(tk.a)*1.5)*k,oy+(tk.y+12-Math.sin(tk.a)*1.5)*k,Math.max(22,k*5.6),{exact:true});}
  const left=Math.max(0,Math.ceil(SECONDS-t));x.fillStyle='#3a1f0a';x.font=`900 ${Math.max(11,k*3.4)}px monospace`;x.textAlign='center';x.fillText(String(left),ox+BW*k/2,oy+k*9);
  scanlines(x,W,Hs,.14);vignette(x,W,Hs,.35);
  s.debug={engine:'tank',tanks,score,state,portrait};
 });
 if(!await s.pass(0,`Combat! ${s.players[0].name} drives the green tank (${'left / bottom'} side of the screen), ${s.players[1].name} the blue one. Hold and drag like a joystick to drive, tap to fire; shells ricochet twice. First to ${TARGET} hits.`,'Both ready — combat!',{countdown:3}))return;
 build();state='play';t=0;
}
Object.assign(exports,{tank});
