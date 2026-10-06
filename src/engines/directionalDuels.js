const {directionGestures, gestureGrid, drawDirectionFeedback}=require("src/engines/directionGestures.js");
const {queueSnakeTurn, takeSnakeTurn, resetSnakeTurns}=require("src/engines/snakeRules.js");
const {pickupSound, sound}=require("src/audio.js");
const COLORS=['#78e9bf','#ff8ccc'];
function snakeDuelState(random,cols=56,rows=30){
 const y=Math.floor(rows/2),snakes=[{body:[{x:6,y},{x:5,y}],dir:{x:1,y:0},turns:[],grow:0},{body:[{x:cols-7,y},{x:cols-6,y}],dir:{x:-1,y:0},turns:[],grow:0}];
 const state={cols,rows,snakes,food:[],random,clock:0,left:40,done:false,winner:null};refillSnakeFood(state);return state;
}
function refillSnakeFood(a){if(a.food.length>=6)return;const blocked=new Set([...a.snakes.flatMap(s=>s.body),...a.food].map(p=>p.x+','+p.y)),free=[];for(let y=1;y<a.rows-1;y++)for(let x=1;x<a.cols-1;x++)if(!blocked.has(x+','+y))free.push({x,y});while(a.food.length<6&&free.length){const index=Math.floor(a.random()*free.length);a.food.push(free.splice(index,1)[0]);}}
function stepSnakeDuel(a){
 if(a.done)return [];a.snakes.forEach(takeSnakeTurn);
 const next=a.snakes.map(s=>({x:s.body[0].x+s.dir.x,y:s.body[0].y+s.dir.y})),eats=next.map(p=>a.food.some(f=>f.x===p.x&&f.y===p.y));
 const occupied=a.snakes.flatMap((s,i)=>s.grow||eats[i]?s.body:s.body.slice(0,-1));
 const crash=next.map(p=>p.x<0||p.x>=a.cols||p.y<0||p.y>=a.rows||occupied.some(q=>q.x===p.x&&q.y===p.y));
 if(next[0].x===next[1].x&&next[0].y===next[1].y)crash.fill(true);
 if(crash.some(Boolean)){a.done=true;a.winner=crash[0]&&crash[1]?null:crash[0]?1:0;return [{type:'crash',winner:a.winner}];}
 const events=[];a.snakes.forEach((s,i)=>{s.body.unshift(next[i]);if(eats[i]){a.food=a.food.filter(f=>f.x!==next[i].x||f.y!==next[i].y);s.grow+=2;events.push({type:'food',owner:i});}if(s.grow)s.grow--;else s.body.pop();});refillSnakeFood(a);return events;
}
async function swipeSnakeDuel(s){
 const [,x]=s.canvas(680,360,{fill:true}),a=snakeDuelState(s.random);s.shared=true;s.updateScores();
 const controls=directionGestures(s,(i,dx,dy)=>queueSnakeTurn(a.snakes[i],dx,dy),{players:2});s.resetOnPause?.(()=>resetSnakeTurns(a.snakes));
 s.debug={state:a,actors:a.snakes,controls,fingers:controls.fingers,edgeInputs:controls.keys};
 s.hint('Each player starts a finger on their own half: player 1 left, player 2 right. Swipe or keep dragging to turn. Direction follows the screen, even across the middle. P1 WASD; P2 arrows. Releasing keeps your snake moving; pause clears queued turns.');
 if(!await s.pass(0,'Snake vs. Snake: swipe or drag on your own half. Eat food, grow and outlast the other snake. Both humans steer together.','Both ready — slither!'))return;
 s.frame(dt=>{a.left-=dt;a.clock+=dt;while(a.clock>=.115&&!a.done){a.clock-=.115;for(const e of stepSnakeDuel(a))if(e.type==='food')pickupSound(s);else sound('lose');}
  const {ox,oy,sx,sy}=gestureGrid(s.W,s.H,a.cols,a.rows,16);x.fillStyle='#0c1b16';x.fillRect(0,0,s.W,s.H);x.strokeStyle='#24483a';x.lineWidth=1;
  for(let col=0;col<=a.cols;col++){x.beginPath();x.moveTo(ox+col*sx,oy);x.lineTo(ox+col*sx,s.H-oy);x.stroke();}for(let row=0;row<=a.rows;row++){x.beginPath();x.moveTo(ox,oy+row*sy);x.lineTo(s.W-ox,oy+row*sy);x.stroke();}
  for(const f of a.food){x.fillStyle='#ffdf78';x.fillRect(ox+f.x*sx+sx*.2,oy+f.y*sy+sy*.2,sx*.6,sy*.6);}
  a.snakes.forEach((snake,i)=>{snake.body.forEach((p,j)=>{x.fillStyle=j?(i?'#be4e89':'#429878'):COLORS[i];x.fillRect(ox+p.x*sx+1,oy+p.y*sy+1,Math.max(1,sx-2),Math.max(1,sy-2));});const p=snake.body[0];s.sprite(x,i,ox+(p.x+.5)*sx,oy+(p.y+.5)*sy,34,{exact:true});});drawDirectionFeedback(x,controls);
  s.status(`${s.players[0].name} LEFT · ${a.snakes[0].body.length} long · ${Math.ceil(Math.max(0,a.left))}s · ${s.players[1].name} RIGHT · ${a.snakes[1].body.length} long`);
  if(a.done||a.left<=0){if(!a.done){a.done=true;const [b,c]=a.snakes.map(s=>s.body.length);a.winner=b===c?null:b>c?0:1;}s.finish(a.winner===null?[0,0]:a.winner===0?[1,0]:[0,1],a.winner===null?'Both snakes share the result.':s.players[a.winner].name+' survives Snake vs. Snake.');}
 });
}

function lightcycleState(){return {cols:136,rows:72,actors:[{body:[{x:34,y:36}],dir:{x:1,y:0},turns:[],alive:true},{body:[{x:102,y:36}],dir:{x:-1,y:0},turns:[],alive:true}],trail:new Map(),clock:0,left:35,done:false};}
function stepLightcycles(a){
 if(a.done)return;a.actors.forEach((p,i)=>{takeSnakeTurn(p);a.trail.set(p.body[0].x+','+p.body[0].y,i);});
 const next=a.actors.map(p=>({x:p.body[0].x+p.dir.x,y:p.body[0].y+p.dir.y})),same=next[0].x===next[1].x&&next[0].y===next[1].y;
 a.actors.forEach((p,i)=>{const n=next[i];p.alive=!(same||n.x<1||n.y<1||n.x>=a.cols-1||n.y>=a.rows-1||a.trail.has(n.x+','+n.y));if(p.alive)p.body[0]=n;});a.done=a.actors.some(p=>!p.alive);
}
async function swipeLightcycles(s){
 const [,x]=s.canvas(680,360,{fill:true}),a=lightcycleState();s.shared=true;s.updateScores();const controls=directionGestures(s,(i,dx,dy)=>queueSnakeTurn(a.actors[i],dx,dy),{players:2});s.resetOnPause?.(()=>resetSnakeTurns(a.actors));s.debug={state:a,actors:a.actors,controls,fingers:controls.fingers,edgeInputs:controls.keys};
 s.hint('Steer with swipes or a held-finger drag: P1 starts on the left, P2 on the right. Your finger keeps its player across the middle. Direction follows the screen. P1 WASD; P2 arrows. Trails are permanent; an instant reverse is refused.');
 if(!await s.pass(0,'TRON / Daft Punk: swipe or drag to turn your lightcycle. Avoid both glowing trails and the walls. Player 1 starts left, player 2 right.','Both ready — enter the grid'))return;
 s.frame(dt=>{a.left-=dt;a.clock+=dt;while(a.clock>=.042&&!a.done){a.clock-=.042;stepLightcycles(a);}const {ox,oy,sx,sy}=gestureGrid(s.W,s.H,a.cols,a.rows);x.fillStyle='#050912';x.fillRect(0,0,s.W,s.H);x.strokeStyle='#1a2b43';x.lineWidth=1;for(let i=0;i<=a.cols;i+=5){x.beginPath();x.moveTo(ox+i*sx,oy);x.lineTo(ox+i*sx,s.H-oy);x.stroke();}for(let i=0;i<=a.rows;i+=5){x.beginPath();x.moveTo(ox,oy+i*sy);x.lineTo(s.W-ox,oy+i*sy);x.stroke();}
  for(const [key,i]of a.trail){const [col,row]=key.split(',').map(Number);x.fillStyle=i?'#e953b8':'#39d5ef';x.fillRect(ox+col*sx,oy+row*sy,Math.max(2,sx),Math.max(2,sy));}
  a.actors.forEach((p,i)=>{const h=p.body[0],px=ox+(h.x+.5)*sx,py=oy+(h.y+.5)*sy;x.fillStyle=i?'#ff69cf':'#52e6ff';x.shadowColor=x.fillStyle;x.shadowBlur=14;x.fillRect(px-5,py-5,10,10);x.shadowBlur=0;s.sprite(x,i,px,py,34,{exact:true});});drawDirectionFeedback(x,controls);s.status(`${s.players[0].name} LEFT · ${Math.ceil(Math.max(0,a.left))}s · ${s.players[1].name} RIGHT · swipe or drag`);
  if(a.done||a.left<=0){a.done=true;const winner=a.actors[0].alive===a.actors[1].alive?null:a.actors[0].alive?0:1;if(winner!==null)sound('lose');s.finish(winner===null?[0,0]:winner===0?[1,0]:[0,1],winner===null?'Both lightcycles share the grid.':s.players[winner].name+' survives the grid.');}
 });
}

Object.assign(exports,{snakeDuelState,stepSnakeDuel,swipeSnakeDuel,lightcycleState,stepLightcycles,swipeLightcycles});