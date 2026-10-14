// Breakout (Atari, 1976) remake: eight rows of bricks under the cabinet's red/orange/green/yellow cellophane bands,
// grey walls, blocky score digits, the ball speeding up after 4 and 12 hits and on first reaching the orange and red
// rows, and the paddle shrinking to half once the ball touches the top wall. Neon glow, brick shatter, your head
// riding the paddle. Turn-based on the same seeded serves.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,keyboard,makeShake}=require("src/engines/tarantinoKit.js");
const {pixText,scanlines,vignette,fitField,makeBits,turnRunner}=require("src/engines/retroKit.js");
const {drawDigits}=require("src/engines/atariPong.js");
const {vibrate}=require("src/audio.js");

const COLS=14,ROWS=8,BW=20,BH=7,FW=COLS*BW+12;
const ROW_COLOR=['#ff3b30','#ff3b30','#ff9b21','#ff9b21','#33e25f','#33e25f','#ffe03a','#ffe03a'];
const ROW_PTS=[7,7,5,5,3,3,1,1];

async function breakout(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const shake=makeShake();let L=null,cur=null;
 const keys={l:false,r:false};let finger=null;
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur||!L)return;ev.preventDefault();finger=ev.pointerId;s.capture(ev);const p=s.pointer(ev);cur.target=L.toField(p.x,p.y).x;});
 s.on(c,'pointermove',ev=>{if(ev.pointerId!==finger||!cur||!L||s.paused)return;ev.preventDefault();const p=s.pointer(ev);cur.target=L.toField(p.x,p.y).x;});
 for(const t of ['pointerup','pointercancel'])s.on(c,t,ev=>{if(ev.pointerId===finger){finger=null;s.release(ev);}});
 keyboard(s,(i,name,down)=>{if(name==='l')keys.l=down;if(name==='r')keys.r=down;});
 s.resetOnPause(()=>{keys.l=keys.r=false;finger=null;});
 s.hint('Drag anywhere to slide the paddle (your head rides it). Where the ball meets the paddle sets the angle. Yellow 1, green 3, orange 5, red 7; clear the wall for +100 and a fresh one. Keys: A/D or ←/→.');
 const rnd=seededRandom(s.seed+':breakout');const serves=Array.from({length:40},()=>({x:.2+rnd()*.6,dir:rnd()<.5?-1:1}));
 function wall(){return Array.from({length:ROWS},()=>Array(COLS).fill(true));}
 function make(){return {bricks:wall(),paddle:FW/2,target:null,ball:null,serve:1.4,serveN:0,lives:3,hits:0,stage:{orange:false,red:false},half:false,speed:1,score:0,walls:0,bits:makeBits(),pops:[],FH:340,flash:0};}
 const top=()=>30;
 function serve(w){const sv=serves[w.serveN++%serves.length];const sp=118*w.speed;w.ball={x:6+sv.x*(FW-12),y:top()+ROWS*BH+30,vx:sv.dir*sp*.6,vy:sp*.8};w.hits=0;}
 const sp=w=>Math.hypot(w.ball.vx,w.ball.vy);
 function setSpeed(w,mult){const b=w.ball,cur=sp(w),target=Math.max(cur,118*mult);b.vx*=target/cur;b.vy*=target/cur;}
 function step(w,dt){
  w.bits.step(dt);shake.step(dt);w.flash=Math.max(0,w.flash-dt*2);for(const p of w.pops)p.t-=dt;w.pops=w.pops.filter(p=>p.t>0);
  const pw=w.half?14:28,py=w.FH-26;
  if(keys.l||keys.r)w.paddle+=((keys.r?1:0)-(keys.l?1:0))*220*dt;else if(w.target!==null)w.paddle+=clamp(w.target-w.paddle,-400*dt,400*dt);
  w.paddle=clamp(w.paddle,6+pw/2,FW-6-pw/2);
  if(w.ending)return;
  if(!w.ball){w.serve-=dt;if(w.serve<=0)serve(w);return;}
  const b=w.ball,n=Math.ceil(sp(w)*dt/2.5);
  for(let k=0;k<n&&w.ball;k++){
   const px=b.x,pyb=b.y;b.x+=b.vx*dt/n;b.y+=b.vy*dt/n;
   if(b.x<8){b.x=8;b.vx=Math.abs(b.vx);voice(330,.02,.04,'square');}
   if(b.x>FW-8){b.x=FW-8;b.vx=-Math.abs(b.vx);voice(330,.02,.04,'square');}
   if(b.y<top()-6){b.y=top()-6;b.vy=Math.abs(b.vy);voice(330,.02,.04,'square');if(!w.half){w.half=true;w.pops.push({x:FW/2,y:top()+2,text:'HALF PADDLE!',t:1.2,color:'#ff9b21'});}}
   // paddle
   if(b.vy>0&&pyb<=py-2&&b.y>=py-2&&Math.abs(b.x-w.paddle)<=pw/2+2){const f=clamp((b.x-w.paddle)/(pw/2+2),-1,1),ang=f*1.05,s0=sp(w);b.vx=Math.sin(ang)*s0;b.vy=-Math.cos(ang)*s0;b.y=py-2;w.hits++;voice(220,.03,.06,'square');
    if(w.hits===4)setSpeed(w,1.18*w.speed);if(w.hits===12)setSpeed(w,1.36*w.speed);}
   // bricks
   const col=Math.floor((b.x-6)/BW),row=Math.floor((b.y-top())/BH);
   if(row>=0&&row<ROWS&&col>=0&&col<COLS&&w.bricks[row][col]){
    w.bricks[row][col]=false;const prow=Math.floor((pyb-top())/BH),pcol=Math.floor((px-6)/BW);if(prow!==row)b.vy=-b.vy;else if(pcol!==col)b.vx=-b.vx;else b.vy=-b.vy;
    const pts=ROW_PTS[row];w.score+=pts;const bx=6+col*BW+BW/2,by=top()+row*BH+BH/2;w.bits.burst(bx,by,{n:12,speed:70,color:ROW_COLOR[row],life:.6,size:1.6,g:120});w.pops.push({x:bx,y:by,text:'+'+pts,t:.7,color:ROW_COLOR[row]});
    voice(300+(ROWS-row)*70,.05,.05,'square');shake.kick(row<2?3:1.4);
    if(row<4&&!w.stage.orange){w.stage.orange=true;setSpeed(w,1.5*w.speed);}if(row<2&&!w.stage.red){w.stage.red=true;setSpeed(w,1.68*w.speed);}
    if(w.bricks.every(r=>r.every(v=>!v))){w.score+=100;w.walls++;w.bricks=wall();w.ball=null;w.serve=1.2;w.speed=1+w.walls*.12;w.half=false;w.stage={orange:false,red:false};w.pops.push({x:FW/2,y:w.FH*.55,text:'WALL CLEARED +100',t:1.6,color:'#ffe03a'});[523,659,784,1046].forEach((f,i)=>voice(f,.12,.05,'square',{delay:i*.08}));break;}
   }
   if(b.y>w.FH+6){w.lives--;w.ball=null;w.serve=1.2;w.flash=.6;noise(.4,.08,{f0:900,f1:120});voice(110,.4,.06,'sawtooth',{slide:.5,lp:700});vibrate(30);shake.kick(6);s.react?.(w.player,'sad',1.2);break;}
  }
 }
 function draw(w){
  const W=s.W,H=s.H;L=fitField(W,H,FW,{minH:300,maxH:470,top:50,bottom:6,anchor:'center'});if(w.FH!==L.FH)w.FH=L.FH;
  x.setTransform(1,0,0,1,0,0);x.fillStyle='#000';x.fillRect(0,0,W,H);
  const k=L.scale;let ox=L.ox,oy=L.oy;if(shake.mag>.3){ox+=(Math.random()-.5)*shake.mag;oy+=(Math.random()-.5)*shake.mag;}
  x.setTransform(k,0,0,k,ox,oy);
  // colour bands behind everything (cellophane overlay feel)
  for(let r=0;r<ROWS;r+=2){x.fillStyle=ROW_COLOR[r]+'10';x.fillRect(0,top()+r*BH,FW,BH*2);}
  x.fillStyle='#4aa8ff10';x.fillRect(0,w.FH-34,FW,20);
  // walls
  x.fillStyle='#9a9a9a';x.fillRect(0,top()-10,FW,4);x.fillRect(0,top()-10,4,w.FH);x.fillRect(FW-4,top()-10,4,w.FH);
  // score digits: player number + score left, balls + other score right
  x.fillStyle='#d8d8d8';x.shadowColor='#fff';x.shadowBlur=6;
  drawDigits(x,w.player+1,16,2,3.2);drawDigits(x,String(w.score).padStart(3,'0'),66,2,3.2);
  drawDigits(x,Math.max(0,w.lives),FW-110,2,3.2);x.globalAlpha=.4;drawDigits(x,w.player===0?'000':String(w.scores[0]).padStart(3,'0'),FW-50,2,3.2);x.globalAlpha=1;
  // bricks
  for(let r=0;r<ROWS;r++){x.fillStyle=ROW_COLOR[r];x.shadowColor=ROW_COLOR[r];x.shadowBlur=8;for(let cI=0;cI<COLS;cI++)if(w.bricks[r][cI])x.fillRect(6+cI*BW+1,top()+r*BH+1,BW-2,BH-2);}
  x.shadowBlur=0;
  // paddle + head
  const pw=w.half?14:28,py=w.FH-26;x.fillStyle='#4aa8ff';x.shadowColor='#4aa8ff';x.shadowBlur=10;x.fillRect(w.paddle-pw/2,py,pw,4);x.shadowBlur=0;
  s.sprite(x,w.player,w.paddle,py-11,22,{exact:true});
  // ball
  if(w.ball){x.fillStyle='#fff';x.shadowColor='#fff';x.shadowBlur=8;x.fillRect(w.ball.x-2,w.ball.y-2,4,4);x.shadowBlur=0;}
  else if(!w.ending&&Math.sin(w.time*12)>0)pixText(x,'READY',FW/2,w.FH*.62,1.2,'#ffffffaa',{align:'center'});
  w.bits.draw(x);
  for(const p of w.pops)pixText(x,p.text,p.x,p.y-(1-p.t)*10,p.text.length>4?1.3:.9,p.color,{align:'center',glow:6,alpha:clamp(p.t*2,0,1)});
  if(w.cap){const left=Math.max(0,Math.ceil(w.cap-w.time));pixText(x,`TIME ${left}`,FW/2,w.FH-12,1,left<=10?'#ff5a5a':'#ffffff88',{align:'center'});}
  if(w.ending)pixText(x,w.endReason==='time'?'TIME UP':'GAME OVER',FW/2,w.FH*.55,2.2,'#ff3b30',{align:'center',glow:10});
  x.setTransform(1,0,0,1,0,0);if(w.flash>0){x.fillStyle=`rgba(255,40,40,${w.flash*.2})`;x.fillRect(0,0,W,H);}
  scanlines(x,W,H,.16);vignette(x,W,H,.5);
  s.debug={engine:'breakout',world:w};
 }
 const scores=await turnRunner(s,{seconds:70,
  intro:(i,sc)=>i===0?`Breakout, Atari 1976. ${s.players[0].name} first: drag to move the paddle, three balls and 70 seconds. The ball speeds up as you dig into the orange and red rows, and the paddle halves once it hits the top wall.`:`${s.players[1].name}, same serves. Beat ${sc[0]}.`,
  make:()=>{const w=make();cur=w;return w;},
  step,draw,done:w=>w.lives<=0,score:w=>w.score});
 if(!scores)return;
 s.finish(scores,`Breakout · ${scores[0]} vs ${scores[1]}`);
}
Object.assign(exports,{breakout});
