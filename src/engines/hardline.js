const {clamp,escapeHTML}=require("src/utils.js");
const {drawArena,circle}=require("src/engines/session.js");
const {pipeRotate,makePipePuzzle,pipeConnected}=require("src/engines/pipeRules.js");
const {sound}=require("src/audio.js");
const DIRS=[[1,0,-1,4],[2,1,0,8],[4,0,1,1],[8,-1,0,2]];

// Trace the actual two-ended wires, including the first disconnected edge.
function pipeFlowTrace(grid){
 const N=grid.length,row=Math.min(2,N-1),path=[],seen=new Set();let x=0,y=row,incoming=8;
 if(!N||grid.some(r=>r.length!==N))return {connected:false,path,fault:{x:0,y:row,edge:8,type:'closed-input'}};
 for(let step=0;step<=N*N;step++){
  const mask=grid[y][x],key=y*N+x;
  if(!(mask&incoming))return {connected:false,path,fault:{x,y,edge:incoming,type:'closed-input'}};
  if(seen.has(key))return {connected:false,path,fault:{x,y,edge:incoming,type:'loop'}};
  seen.add(key);const exit=DIRS.find(([bit])=>bit!==incoming&&(mask&bit));path.push({x,y,incoming,outgoing:exit?.[0]||0});
  if(!exit)return {connected:false,path,fault:{x,y,edge:0,type:'dead-end'}};
  const [edge,dx,dy,opposite]=exit,nx=x+dx,ny=y+dy;
  if(x===N-1&&y===row&&edge===2)return {connected:true,path,fault:null};
  if(nx<0||ny<0||nx>=N||ny>=N)return {connected:false,path,fault:{x,y,edge,type:'open-edge'}};
  if(!(grid[ny][nx]&opposite))return {connected:false,path,fault:{x,y,edge,type:'broken-link'}};
  x=nx;y=ny;incoming=opposite;
 }
 return {connected:false,path,fault:{x,y,edge:incoming,type:'loop'}};
}
function pipeLayout(W,H){const cell=Math.max(8,Math.min((W-90)/5,(H-22)/5)),ox=(W-cell*5)/2,oy=(H-cell*5)/2,cy=oy+2.5*cell;return {cell,ox,oy,cy,input:{x:ox-29,y:cy},output:{x:ox+5*cell+29,y:cy}};}
function pipeFlowPoints(trace,l){const points=[l.input,{x:l.ox,y:l.cy},...trace.path.map(p=>({x:l.ox+(p.x+.5)*l.cell,y:l.oy+(p.y+.5)*l.cell}))];
 if(trace.connected)points.push({x:l.ox+5*l.cell,y:l.cy},l.output);
 else{const f=trace.fault,dir=DIRS.find(d=>d[0]===f.edge);points.push({x:l.ox+(f.x+.5+(dir?.[1]||0)*.5)*l.cell,y:l.oy+(f.y+.5+(dir?.[2]||0)*.5)*l.cell});}
 return points;
}
async function pipeconnect(s){
 const[c,x]=s.canvas(680,430,{fill:true});s.body.classList.add('drag-arena-body','hardline-body');
 const hud=document.createElement('div');hud.className='hardline-hud';hud.innerHTML=`<div><small>CIRCUIT CLOCK</small><b id="hardline-clock" aria-live="off">00:45</b></div><div><strong id="hardline-stage">CONNECT THE HARDLINE</strong><small id="hardline-owner">${escapeHTML(s.players[0].name)}</small></div>`;s.body.insertBefore(hud,s.body.firstChild);
 const counter=document.getElementById('hardline-clock'),stage=document.getElementById('hardline-stage'),owner=document.getElementById('hardline-owner');
 const puzzle=makePipePuzzle(s.seed),scores=[0,0];let grid,player=0,moves=0,left=45,stop,phase='handoff',flow=null;
 function energize(){if(phase!=='edit'||!s.alive)return;stop?.();phase='flow';const trace=pipeFlowTrace(grid);flow={trace,elapsed:0,duration:clamp((trace.path.length+2)*.15,.65,3.5),outcome:0};sound('start');draw();}
 async function resolve(){if(phase!=='outcome'||!s.alive)return;phase='handoff';scores[player]=flow.trace.connected?Math.max(0,600+Math.ceil(left)*5-moves*3):0;s.setScores(scores);if(player===1)return s.finish(scores,'Hardline Hack · power routed to the exit; broken circuits short at their actual dead end.');player=1;await start();}
 function draw(){
  if(!grid)return;const W=s.W,H=s.H,l=pipeLayout(W,H),{cell,ox,oy}=l;drawArena(x,W,H,'#89ad77');
  for(let yy=0;yy<5;yy++)for(let xx=0;xx<5;xx++){const mask=grid[yy][xx],cx=ox+(xx+.5)*cell,cy=oy+(yy+.5)*cell;x.fillStyle='#223a2e';x.fillRect(ox+xx*cell+2,oy+yy*cell+2,cell-4,cell-4);x.strokeStyle='#85b58d';x.lineWidth=Math.max(3,cell*.12);x.lineCap='round';x.beginPath();for(const[bit,dx,dy]of DIRS)if(mask&bit){x.moveTo(cx,cy);x.lineTo(cx+dx*cell*.5,cy+dy*cell*.5);}x.stroke();circle(x,cx,cy,Math.max(2,cell*.045),'#d9e9b5');}
  for(const [p,label,color]of [[l.input,'IN','#76f4de'],[l.output,'OUT','#ffd273']]){x.fillStyle='#0c2425';x.fillRect(p.x-22,p.y-29,44,58);x.strokeStyle=color;x.lineWidth=2;x.strokeRect(p.x-22,p.y-29,44,58);x.fillStyle=color;x.font='bold 13px monospace';x.textAlign='center';x.fillText(label,p.x,p.y-8);x.font='bold 22px monospace';x.fillText('→',p.x,p.y+17);}
  let message='CONNECT THE HARDLINE';
  if(flow){
   const points=pipeFlowPoints(flow.trace,l),t=Math.min(1,flow.elapsed/flow.duration)*(points.length-1),i=Math.min(points.length-2,Math.floor(t)),f=t-i,front={x:points[i].x+(points[i+1].x-points[i].x)*f,y:points[i].y+(points[i+1].y-points[i].y)*f};
   x.save();x.strokeStyle=flow.trace.connected?'#80ffe1':'#ffcc71';x.lineWidth=clamp(cell*.1,3,8);x.lineJoin='round';x.lineCap='round';x.shadowBlur=15;x.shadowColor=x.strokeStyle;x.beginPath();x.moveTo(points[0].x,points[0].y);for(let j=1;j<=i;j++)x.lineTo(points[j].x,points[j].y);x.lineTo(front.x,front.y);x.stroke();circle(x,front.x,front.y,clamp(cell*.095,4,8),'#fffad1');x.restore();
   message=phase==='flow'?'POWER FLOWING…':flow.trace.connected?'CIRCUIT COMPLETE':'SHORT CIRCUIT · DEAD END';
   if(phase==='outcome'&&!flow.trace.connected){const p=points.at(-1),age=flow.outcome;x.save();x.globalAlpha=Math.max(0,1-age/1.05);for(let j=0;j<14;j++){const angle=j*Math.PI/7,r=age*cell*1.1;x.strokeStyle=j%2?'#ff773b':'#ffe68c';x.lineWidth=3;x.beginPath();x.moveTo(p.x+Math.cos(angle)*r*.3,p.y+Math.sin(angle)*r*.3);x.lineTo(p.x+Math.cos(angle)*r,p.y+Math.sin(angle)*r);x.stroke();}circle(x,p.x,p.y,Math.max(2,(1-age)*cell*.28),'#fff6cb');x.restore();}
  }
  const seconds=Math.ceil(Math.max(0,left)),clock='00:'+String(seconds).padStart(2,'0');if(counter.textContent!==clock)counter.textContent=clock;
  hud.classList.toggle('urgent',left<=10&&phase==='edit');stage.textContent=message;owner.textContent=s.players[player].name+' · '+moves+' rotations';
  s.status(phase==='edit'?'Tap pipes to rotate · power enters IN and must reach OUT':message);s.debug={grid,puzzle,player,moves,left,phase,flow,layout:l,energize};
 }
 s.on(c,'pointerdown',ev=>{if(s.paused||phase!=='edit')return;const p=s.pointer(ev),l=pipeLayout(s.W,s.H),xx=Math.floor((p.x-l.ox)/l.cell),yy=Math.floor((p.y-l.oy)/l.cell);if(xx<0||xx>=5||yy<0||yy>=5)return;grid[yy][xx]=pipeRotate(grid[yy][xx]);moves++;sound('tap');if(pipeConnected(grid))energize();else draw();});
 s.hint('Connect cyan IN to gold OUT. Tap a tile to rotate. At completion or timeout, power follows your actual wires. A dead end explodes. Same scramble and 45 seconds each.');
 s.cleanup(()=>stop?.());
 s.frame(dt=>{if(phase==='flow'){flow.elapsed=Math.min(flow.duration,flow.elapsed+dt);if(flow.elapsed>=flow.duration){phase='outcome';sound(flow.trace.connected?'win':'shot');s.react?.(player,flow.trace.connected?'win':'sad');}}else if(phase==='outcome'){flow.outcome+=dt;if(flow.outcome>=1.05)void resolve();}draw();});
 async function start(){stop?.();grid=puzzle.initial.map(r=>r.slice());moves=0;left=45;flow=null;phase='handoff';draw();if(!await s.pass(player,'Connect IN to OUT before the circuit clock ends. Watch power run through your route, or short out at its dead end. Same scramble for both.'))return;phase='edit';stop=s.timer(45,t=>{left=t;draw();},energize);draw();}
 await start();
}

Object.assign(exports,{pipeFlowTrace,pipeLayout,pipeFlowPoints,pipeconnect});