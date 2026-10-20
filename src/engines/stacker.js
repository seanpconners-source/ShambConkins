// Stacker (LAI Games arcade) remake for Taskmaster's "build the tallest thing": two LED cabinets side by side, both
// players at once. A row of lit blocks slides back and forth; tap your half to stop it. Only blocks resting on the
// row below survive, overhangs fall away, the rows speed up, and the cabinet forces you down to two blocks (row 5)
// and one block (row 11). Minor prize line at row 11, major prize at the top. Two rounds; most points wins.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,keyboard,makeShake}=require("src/engines/tarantinoKit.js");
const {pixText,makeBits,scanlines}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");

const COLS=7,ROWS=15,MINOR=10,COLOR=['#38c8ff','#ff4fa8'];
const maxBlocks=r=>r>=10?1:r>=4?2:3;
const tickFor=r=>clamp(.17-r*.0082,.052,.17);

async function towerstack(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.shared=true;s.updateScores();s.ownHud(true,true);
 const shake=makeShake(),bits=makeBits();const total=[0,0];let round=0,t=0,state='intro',banner=null;
 let P=[];
 const fresh=()=>[0,1].map(i=>({i,stack:[],row:0,pos:0,dir:1,len:3,clock:0,done:false,won:'',score:0,fall:[],perfect:0,flash:0}));
 function stop(p){if(state!=='play'||p.done)return;
  const cells=[];for(let k=0;k<p.len;k++)cells.push(p.pos+k);
  let keep=cells;if(p.row>0){const below=new Set(p.stack[p.row-1]);keep=cells.filter(cc=>below.has(cc));const lost=cells.filter(cc=>!below.has(cc));for(const cc of lost)p.fall.push({c:cc,r:p.row,y:0,v:0});if(lost.length){noise(.25,.06,{type:'bandpass',f0:900,f1:200});}}
  if(!keep.length){p.done=true;p.won=p.row>=ROWS?'MAJOR':p.row>MINOR?'MINOR':'';voice(150,.4,.07,'sawtooth',{slide:.5,lp:600});shake.kick(6);vibrate(40);s.react?.(p.i,'sad',1.4);return;}
  const perfect=keep.length===cells.length;p.stack.push(keep);p.score+=10+(perfect?5:0);if(perfect){p.perfect++;}
  voice(220+p.row*40,.08,.07,'square');vibrate(10);p.flash=.25;
  p.row++;
  if(p.row===MINOR+1){voice(784,.12,.05,'triangle');voice(988,.16,.05,'triangle',{delay:.1});p.score+=20;s.react?.(p.i,'happy',1);}
  if(p.row>=ROWS){p.done=true;p.won='MAJOR';p.score+=60;[523,659,784,1046,1319].forEach((f,k)=>voice(f,.14,.06,'triangle',{delay:k*.08}));s.react?.(p.i,'win',2);return;}
  p.len=Math.min(keep.length,maxBlocks(p.row));p.pos=p.dir>0?0:COLS-p.len;p.clock=0;
 }
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const pt=s.pointer(ev);stop(P[cpu||pt.x<s.W/2?0:1]);});
 // vs CPU: cabinet 2 stops when its row lines up with the stack below, less reliably as rows speed up (and a block early on Easy)
 const cpu=isCpu(s);let cpuSeenPos=null;
 function cpuStack(){const p=P[1];if(!p||p.done||state!=='play')return;if(p.pos===cpuSeenPos)return;cpuSeenPos=p.pos;const sk=cpuSkill(s);
  const cells=[];for(let k=0;k<p.len;k++)cells.push(p.pos+k);const below=p.row?new Set(p.stack[p.row-1]):null,fit=below?cells.filter(cc=>below.has(cc)).length:p.len;
  const speed=.17/tickFor(p.row),chance=fit===p.len?clamp(.35+sk*.6-(speed-1)*.12*(1-sk),.12,.95):fit===p.len-1&&p.row>0?(1-sk)*.25:0;if(Math.random()<chance)stop(p);}
 keyboard(s,(i,name,down)=>{if(down&&(name==='act'||name==='u'||name==='d'))stop(P[i]);});
 s.hint('Tap your half of the screen (P1 left, P2 right) to stop your sliding row. Only blocks that land on the row below stay. Rows speed up; the cabinet drops you to two blocks at row 5 and one at row 11. 10 a row, +5 perfect, +20 at the minor prize line, +60 at the top. Keys: Space / Enter.');
 function layout(){const W=s.W,H=s.H,gap=8,pw=(W-gap*3)/2,top=48,bottom=36,cell=Math.floor(Math.min(pw/(COLS+1.3),(H-top-bottom)/(ROWS+3.2)));const used=cell*(ROWS+3.2);return {cell,top,panels:[0,1].map(i=>{const px=gap+i*(pw+gap);return {x:px+(pw-cell*COLS)/2,y:top+((H-top-bottom)-used)/2+cell*1.7,pw,px};})};}
 function drawPanel(p,lay){const L=lay.panels[p.i],cs=lay.cell,col=COLOR[p.i];
  // cabinet body
  const fx=L.x-cs*.6,fy=L.y-cs*1.6,fw=cs*COLS+cs*1.2,fh=cs*ROWS+cs*2.4;x.fillStyle='#08080d';x.strokeStyle=col+'aa';x.lineWidth=2;x.beginPath();x.roundRect?.(fx,fy,fw,fh,cs*.4);x.fill();x.stroke();
  // chaser lights round the frame
  const n=Math.floor((fw+fh)*2/(cs*.7));for(let k=0;k<n;k++){const d=k/n*(fw+fh)*2;let lx,ly;if(d<fw){lx=fx+d;ly=fy;}else if(d<fw+fh){lx=fx+fw;ly=fy+d-fw;}else if(d<fw*2+fh){lx=fx+fw-(d-fw-fh);ly=fy+fh;}else{lx=fx;ly=fy+fh-(d-fw*2-fh);}
   const on=(k+Math.floor(t*12))%4===0;x.fillStyle=on?'#ffe36a':'#3a3220';x.beginPath();x.arc(lx,ly,cs*.12,0,Math.PI*2);x.fill();}
  // prize lines
  const yOf=r=>L.y+(ROWS-1-r)*cs;
  const blink=Math.sin(t*6)>0;
  x.fillStyle=blink?'#ffd23f':'#c79a1a';x.fillRect(L.x-cs*.3,yOf(MINOR)-2,cs*COLS+cs*.6,2);pixText(x,'MINOR PRIZE',L.x+cs*COLS/2,yOf(MINOR)-cs*.62,Math.max(1.6,cs*.085),'#ffd23f',{align:'center'});
  pixText(x,'MAJOR PRIZE',L.x+cs*COLS/2,fy+cs*.35,cs*.085,blink?'#ff6b6b':'#ffd23f',{align:'center',glow:6});
  // LED grid
  for(let r=0;r<ROWS;r++)for(let cc=0;cc<COLS;cc++){x.fillStyle='#1a1a26';x.fillRect(L.x+cc*cs+cs*.08,yOf(r)+cs*.08,cs*.84,cs*.84);}
  x.shadowColor=col;x.shadowBlur=cs*.5;x.fillStyle=col;
  p.stack.forEach((row,r)=>{for(const cc of row)x.fillRect(L.x+cc*cs+cs*.08,yOf(r)+cs*.08,cs*.84,cs*.84);});
  if(!p.done&&state==='play'){x.fillStyle=p.flash>0?'#fff':col;for(let k=0;k<p.len;k++)x.fillRect(L.x+(p.pos+k)*cs+cs*.08,yOf(p.row)+cs*.08,cs*.84,cs*.84);}
  x.fillStyle='#ff6060';x.shadowColor='#ff6060';for(const f of p.fall)x.fillRect(L.x+f.c*cs+cs*.08,yOf(f.r)+f.y+cs*.08,cs*.84,cs*.84);x.shadowBlur=0;
  // the player's head rides the active row (or sits on top of the finished tower)
  const hr=p.done?Math.max(0,p.stack.length-1):p.row,hc=p.done?(p.stack.at(-1)||[3]).reduce((a,b)=>a+b,0)/Math.max(1,(p.stack.at(-1)||[3]).length):p.pos+(p.len-1)/2;
  s.sprite(x,p.i,L.x+(hc+.5)*cs,yOf(hr)-cs*(p.done?.55:.6),cs*1.3,{exact:true});
  pixText(x,String(total[p.i]+p.score).padStart(3,'0'),L.x+cs*COLS/2,fy+fh+cs*.35,cs*.13,col,{align:'center',glow:8});
  if(p.done)pixText(x,p.won==='MAJOR'?'MAJOR PRIZE!':p.won==='MINOR'?'MINOR PRIZE':'GAME OVER',L.x+cs*COLS/2,L.y+cs*ROWS*.45,cs*.12,p.won?'#ffd23f':'#ff6060',{align:'center',glow:8});
 }
 function frame(dt){if(cpu)cpuStack();
  const W=s.W,H=s.H;t+=dt;shake.step(dt);bits.step(dt);
  if(state==='play'){for(const p of P){p.flash=Math.max(0,p.flash-dt);for(const f of p.fall){f.v+=900*dt;f.y+=f.v*dt;}p.fall=p.fall.filter(f=>f.y<H);
    if(p.done)continue;p.clock+=dt;const tk=tickFor(p.row);while(p.clock>=tk){p.clock-=tk;p.pos+=p.dir;if(p.pos+p.len>COLS){p.pos=COLS-p.len-1;p.dir=-1;}if(p.pos<0){p.pos=1;p.dir=1;}if(p.i===0)voice(1500,.012,.012,'square');}}
   if(P.every(p=>p.done)&&P.every(p=>!p.fall.length)){state='between';banner={t:2.2};for(const p of P)total[p.i]+=p.score;s.setScores(total);}}
  else if(state==='between'){banner.t-=dt;if(banner.t<=0){round++;if(round>=2){state='over';s.finish(total,`Stacker · ${total[0]} vs ${total[1]}`);return;}P=fresh();state='play';}}
  // draw
  x.setTransform(1,0,0,1,0,0);const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#120a1e');bg.addColorStop(1,'#05030a');x.fillStyle=bg;x.fillRect(0,0,W,H);
  if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  const lay=layout();for(const p of P)drawPanel(p,lay);
  pixText(x,`ROUND ${Math.min(2,round+1)}/2`,W/2,14,2,'#ffffffaa',{align:'center'});
  if(state==='between')pixText(x,round>=1?'FINAL SCORE':'ROUND 2 NEXT',W/2,H-26,2.4,'#ffd23f',{align:'center',glow:10});
  x.setTransform(1,0,0,1,0,0);scanlines(x,W,H,.12);
  s.setScores(P.map(p=>total[p.i]+(state==='play'?p.score:0)));
  s.debug={engine:'towerstack',players:P,state,round,total};
 }
 P=fresh();
 if(!await s.pass(0,`Stacker: two cabinets, both of you at once. ${s.players[0].name} taps the left half, ${s.players[1].name} the right, to stop your sliding row. Only blocks that land on the row below survive. Reach the top for the major prize. Two rounds.`,'Both ready — stack!',{countdown:3}))return;
 state='play';s.frame(frame);
}
Object.assign(exports,{towerstack});
