// Snake II (Nokia 3310, 2000) remake: a backlit green dot-matrix LCD with ghosting, the chunky pixel snake, diamond
// food, bonus critters with a countdown every fifth bite, and your head as the snake's head, rendered in LCD ink.
// Swipe (or keep dragging) to turn. Three lives, 60 seconds each, taking turns on the same seed.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,makeShake}=require("src/engines/tarantinoKit.js");
const {pixText,drawSprite,turnRunner}=require("src/engines/retroKit.js");
const {directionGestures}=require("src/engines/directionGestures.js");
const {queueSnakeTurn,takeSnakeTurn,resetSnakeTurns}=require("src/engines/snakeRules.js");
const {ditherHead}=require("src/engines/atariPong.js");
const {vibrate}=require("src/audio.js");

const INK='#1f2a14',LCD0='#a9c27f',LCD1='#c6dc9a';
const CRITTERS=[['.#....#.','..#..#..','.######.','##.##.##','.######.','#.#..#.#'],['..####..','.#.##.#.','########','.######.','#......#'],['#......#','.#.##.#.','..####..','.######.','#.####.#','..#..#..'],['...##...','.######.','##.##.##','########','.#.##.#.']];

async function snake(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.ownHud(true,true);
 const shake=makeShake();let cur=null,grid=null,inkHead=null,headFor=-1;
 const controls=directionGestures(s,(i,dx,dy)=>{if(cur&&cur.alive)queueSnakeTurn(cur.snake,dx,dy);},{threshold:14});
 s.resetOnPause(()=>{if(cur)resetSnakeTurns([cur.snake]);});
 s.hint('Swipe to turn; keep your finger down and drag a new direction for quick turns. Eat the diamonds, catch the bonus critters before their timer runs out, never bite yourself or the wall. Arrows / WASD.');
 function layout(){const W=s.W,H=s.H,portrait=H>W*1.05,cols=portrait?17:28,head=Math.max(48,Math.min(64,H*.08)),cell=Math.floor(Math.min((W-16)/cols,(H-head-12)/12)),rows=Math.max(10,Math.floor((H-head-12)/cell));return {cols,rows,cell,ox:Math.floor((W-cols*cell)/2),oy:head,head};}
 function inkify(img){const cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;const g=cv.getContext('2d');g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle=INK;g.fillRect(0,0,cv.width,cv.height);return cv;}
 function freeCell(w){for(let k=0;k<400;k++){const p={x:Math.floor(w.rand()*w.cols),y:Math.floor(w.rand()*w.rows)};if(!w.snake.body.some(b=>b.x===p.x&&b.y===p.y)&&!(w.bonus&&w.bonus.x===p.x&&w.bonus.y===p.y)&&!(w.food&&w.food.x===p.x&&w.food.y===p.y))return p;}return {x:0,y:0};}
 function reset(w){const cy=Math.floor(w.rows/2);w.snake={body:[{x:5,y:cy},{x:4,y:cy},{x:3,y:cy},{x:2,y:cy}],dir:{x:1,y:0},next:{x:1,y:0},turns:[]};w.alive=true;w.clock=0;}
 function make(){const g=grid||layout();const w={rand:seededRandom(s.seed+':snake'),cols:g.cols,rows:g.rows,score:0,lives:3,eaten:0,bonus:null,dead:0,flash:0};w.sized=false;reset(w);return w;}
 function step(w,dt){
  if(!w.sized)return;
  shake.step(dt);w.flash=Math.max(0,w.flash-dt*3);
  if(!w.alive){w.dead-=dt;if(w.dead<=0&&w.lives>0){reset(w);}return;}
  const rate=7+Math.min(6,w.eaten*.35);w.clock+=dt;if(w.clock<1/rate)return;w.clock-=1/rate;
  if(w.bonus){w.bonus.left--;if(w.bonus.left<=0)w.bonus=null;}
  const sn=w.snake;takeSnakeTurn(sn);const h={x:sn.body[0].x+sn.dir.x,y:sn.body[0].y+sn.dir.y};
  const eat=w.food&&h.x===w.food.x&&h.y===w.food.y,bug=w.bonus&&h.x===w.bonus.x&&h.y===w.bonus.y;
  const body=eat?sn.body:sn.body.slice(0,-1);
  if(h.x<0||h.y<0||h.x>=w.cols||h.y>=w.rows||body.some(p=>p.x===h.x&&p.y===h.y)){w.alive=false;w.lives--;w.dead=1.4;w.flash=1;shake.kick(8);vibrate(60);voice(180,.12,.07,'square');voice(120,.3,.07,'square',{delay:.12});s.react?.(w.player,'sad',1.4);return;}
  sn.body.unshift(h);
  if(eat){w.eaten++;w.score+=10;w.food=freeCell(w);voice(1320,.04,.05,'square');vibrate(8);if(w.eaten%5===0&&!w.bonus){const p=freeCell(w);w.bonus={...p,left:24,kind:Math.floor(w.rand()*CRITTERS.length)};voice(990,.06,.04,'square',{delay:.06});}}
  else sn.body.pop();
  if(bug){const pts=30+w.bonus.left*3;w.score+=pts;w.pop={x:w.bonus.x,y:w.bonus.y,text:'+'+pts,t:1};w.bonus=null;for(let i=0;i<3;i++)voice(1046+i*260,.05,.05,'square',{delay:i*.05});s.react?.(w.player,'win',1);}
 }
 function draw(w,dt){
  if(!w.sized){const g0=layout();w.cols=g0.cols;w.rows=g0.rows;w.sized=true;reset(w);w.food=freeCell(w);}
  const W=s.W,H=s.H;const g=layout();grid=g;const oy=g.head,cell=Math.floor(Math.min((W-16)/w.cols,(H-oy-12)/w.rows)),ox=Math.floor((W-w.cols*cell)/2);
  // backlit LCD with ghosting: repaint at partial opacity so moving pixels smear like the real panel
  x.setTransform(1,0,0,1,0,0);const bg=x.createRadialGradient(W/2,H*.45,10,W/2,H*.45,Math.hypot(W,H)*.6);bg.addColorStop(0,LCD1);bg.addColorStop(1,LCD0);
  x.globalAlpha=w.flash>0?1:.62;x.fillStyle=bg;x.fillRect(0,0,W,H);x.globalAlpha=1;
  if(w.flash>0&&Math.sin(w.flash*30)>0){x.fillStyle=INK;x.fillRect(ox,oy,w.cols*cell,w.rows*cell);}
  let sx=0,sy=0;if(shake.mag>.3){sx=(Math.random()-.5)*shake.mag;sy=(Math.random()-.5)*shake.mag;}x.translate(sx,sy);
  // dot-matrix texture
  x.fillStyle='#00000010';for(let yy=oy;yy<oy+w.rows*cell;yy+=Math.max(3,cell/4))x.fillRect(ox,yy,w.cols*cell,1);
  // frame + header
  x.strokeStyle=INK;x.lineWidth=Math.max(2,cell*.18);x.strokeRect(ox-3,oy-3,w.cols*cell+6,w.rows*cell+6);
  const fs=clamp(cell*.22,1.8,3.4);pixText(x,String(w.score).padStart(4,'0'),ox,oy-fs*7-10,fs,INK);
  for(let i=0;i<w.lives;i++){const hx=ox+fs*30+i*fs*7;x.fillStyle=INK;x.fillRect(hx,oy-fs*7-8+fs,fs*5,fs*4);}
  const left=Math.max(0,Math.ceil(w.cap-w.time));pixText(x,String(left),ox+w.cols*cell*.62,oy-fs*7-10,fs,left<=10?'#5a1a10':INK,{align:'center'});
  if(w.bonus){drawSprite(x,CRITTERS[w.bonus.kind],ox+w.cols*cell*.62+fs*12,oy-fs*7-10,fs*.85,INK);pixText(x,String(w.bonus.left),ox+w.cols*cell*.62+fs*22,oy-fs*7-10,fs,INK);}
  // food diamond
  if(w.food){const fx=ox+w.food.x*cell+cell/2,fy=oy+w.food.y*cell+cell/2,r=cell*.32;x.fillStyle=INK;x.beginPath();x.moveTo(fx,fy-r);x.lineTo(fx+r,fy);x.lineTo(fx,fy+r);x.lineTo(fx-r,fy);x.fill();}
  if(w.bonus&&(w.bonus.left>6||Math.floor(w.time*8)%2))drawSprite(x,CRITTERS[w.bonus.kind],ox+w.bonus.x*cell-cell*.25,oy+w.bonus.y*cell+cell*.1,cell/6,INK);
  // snake: chunky blocks with the Nokia notch pattern
  const sn=w.snake;if(w.alive||Math.floor(w.dead*8)%2){
   x.fillStyle=INK;const q=cell/4;
   sn.body.forEach((p,i)=>{if(i===0)return;const px=ox+p.x*cell,py=oy+p.y*cell;x.fillRect(px+q*.4,py+q*.4,cell-q*.8,cell-q*.8);x.fillStyle=LCD1;if(i%2)x.fillRect(px+q*1.5,py+q*1.5,q,q);x.fillStyle=INK;
    const prev=sn.body[i-1];if(prev){x.fillRect(Math.min(px,ox+prev.x*cell)+q*.4,Math.min(py,oy+prev.y*cell)+q*.4,Math.abs(prev.x-p.x)*cell+cell-q*.8,Math.abs(prev.y-p.y)*cell+cell-q*.8);}});
   // head = your head in LCD ink
   if(headFor!==w.player||!inkHead||w.time<5&&Math.floor(w.time*2)!==Math.floor((w.time-dt)*2)){headFor=w.player;inkHead=inkify(ditherHead(s,w.player,26));}
   const h=sn.body[0],hs=cell*1.75;x.imageSmoothingEnabled=false;x.fillStyle=LCD1;x.beginPath();x.arc(ox+h.x*cell+cell/2,oy+h.y*cell+cell/2,hs*.5,0,Math.PI*2);x.fill();x.drawImage(inkHead,ox+h.x*cell+cell/2-hs/2,oy+h.y*cell+cell/2-hs/2,hs,hs);}
  if(w.pop){w.pop.t-=dt;if(w.pop.t>0)pixText(x,w.pop.text,ox+w.pop.x*cell,oy+w.pop.y*cell-(1-w.pop.t)*20,fs,INK,{align:'center'});else w.pop=null;}
  if(w.ending)pixText(x,w.endReason==='time'?'TIME UP':'GAME OVER',W/2,oy+w.rows*cell*.42,fs*2,INK,{align:'center'});
  else if(!w.alive&&w.lives>0)pixText(x,`${w.lives} LEFT`,W/2,oy+w.rows*cell*.42,fs*1.6,INK,{align:'center'});
  x.setTransform(1,0,0,1,0,0);
  s.debug={engine:'snake',world:w,controls};
 }
 const scores=await turnRunner(s,{seconds:60,
  intro:(i,sc)=>i===0?`Snake II, straight off a Nokia 3310. ${s.players[0].name} first: swipe to turn (keep dragging for quick turns). Diamonds are 10; every fifth bite a critter appears, worth more the faster you catch it. Three lives, 60 seconds.`:`${s.players[1].name}, same food. Beat ${sc[0]}.`,
  make:()=>{grid=layout();cur=make();return cur;},step,draw,done:w=>w.lives<=0&&!w.alive&&w.dead<=0,score:w=>w.score});
 if(!scores)return;
 s.finish(scores,`Snake II · ${scores[0]} vs ${scores[1]}`);
}
Object.assign(exports,{snake});
