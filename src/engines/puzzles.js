const {pipeRotate:rotatePipe,makePipePuzzle:createPipePuzzle,pipeConnected:connectedPipe}=require("src/engines/pipeRules.js");
const {pipeconnect:hardlineHack}=require("src/engines/hardline.js");
const {seededRandom, shuffle, pick, clamp}=require("src/utils.js");
const {drawArena, circle, COLORS}=require("src/engines/session.js");
const {sound}=require("src/audio.js");
const {directionGestures,gestureGrid}=require("src/engines/directionGestures.js");
const SOKOBAN_MAPS=[
 ['#######','#  .. #','#     #','#  $$ #','#     #','#  @  #','#######'],
 ['#######','#     #','# . . #','# $ $ #','#     #','#  @  #','#######'],
 ['#######','# . . #','#     #','# $ $ #','#  #  #','# @   #','#######']
];
function parseSokoban(rows){const walls=[],goals=[],boxes=[];let hero;rows.forEach((row,y)=>[...row].forEach((c,x)=>{const key=y*7+x;if(c==='#')walls.push(key);if(c==='.')goals.push(key);if(c==='$')boxes.push(key);if(c==='@')hero=key;}));return {walls,goals,boxes,hero,moves:0};}
function sokobanMove(board,dx,dy){const x=board.hero%7,y=Math.floor(board.hero/7),nx=x+dx,ny=y+dy,n=ny*7+nx;if(nx<0||nx>6||ny<0||ny>6||board.walls.includes(n))return false;if(board.boxes.includes(n)){const bx=nx+dx,by=ny+dy,b=by*7+bx;if(bx<0||bx>6||by<0||by>6||board.walls.includes(b)||board.boxes.includes(b))return false;board.boxes=board.boxes.map(v=>v===n?b:v);}board.hero=n;board.moves++;return true;}
async function sokoban(s){const [c,x]=s.canvas(680,420,{fill:true});let player=0,board,history=[],left=45,stop,finishing=false;const original=pick(SOKOBAN_MAPS,s.random);const scores=[0,0];
 const draw=()=>{const W=s.W,H=s.H,{ox,oy,sx,sy}=gestureGrid(W,H,7,7),cell=Math.min(sx,sy);drawArena(x,W,H);for(let y=0;y<7;y++)for(let xx=0;xx<7;xx++){const k=y*7+xx,px=ox+xx*sx,py=oy+y*sy;x.fillStyle=board.walls.includes(k)?'#5d6249':'#263626';x.fillRect(px+1,py+1,sx-2,sy-2);if(board.goals.includes(k))circle(x,px+sx/2,py+sy/2,cell*.22,'#bfb676');if(board.boxes.includes(k)){x.fillStyle=board.goals.includes(k)?'#91a778':'#ad8150';x.fillRect(px+sx*.16,py+sy*.16,sx*.68,sy*.68);x.strokeStyle='#e1c895';x.strokeRect(px+sx*.24,py+sy*.24,sx*.52,sy*.52);}}s.sprite(x,player,ox+(board.hero%7+.5)*sx,oy+(Math.floor(board.hero/7)+.5)*sy,clamp(cell*.85,28,65),{exact:true});s.status(`${s.players[player].name} · ${Math.ceil(left)}s · ${board.moves} moves · ${board.boxes.filter(k=>board.goals.includes(k)).length}/${board.goals.length} crates`);s.debug.board=board;};
 const finish=async()=>{if(finishing||!s.alive)return;finishing=true;stop?.();const solved=board.boxes.every(k=>board.goals.includes(k));scores[player]=board.boxes.filter(k=>board.goals.includes(k)).length*150+(solved?500+Math.ceil(left)*5:0)-board.moves*2;s.setScores(scores);if(player===0){player=1;await start();}else s.finish(scores);};
 const move=(dx,dy)=>{if(finishing||s.paused)return;const before=structuredClone(board);if(sokobanMove(board,dx,dy)){history.push(before);sound('tap');draw();if(board.boxes.every(k=>board.goals.includes(k)))void finish();}};
 const controls=directionGestures(s,(i,dx,dy)=>move(dx,dy),{repeat:.19});const extra=document.createElement('button');extra.textContent='Undo';extra.className='arena-undo';c.parentElement.appendChild(extra);s.on(extra,'click',()=>{if(!s.paused&&history.length&&!finishing){board=history.pop();draw();}});s.hint('Swipe to move one square, or hold-drag to keep walking. Crates push; they never pull. Tap Undo inside the arena to rescue a bad decision. Arrows / WASD also work.');s.frame(()=>{if(board)draw();});
 async function start(){board=parseSokoban(original);history=[];left=45;draw();if(!await s.pass(player,'The same warehouse puzzle. Push both crates to their marked squares.'))return;finishing=false;stop=s.timer(45,t=>{left=t;draw();},()=>void finish());draw();}
 await start();
}
const pipeRotate=rotatePipe;
const makePipePuzzle=createPipePuzzle;
const pipeConnected=connectedPipe;
const pipeconnect=hardlineHack;
async function sonargrid(s){let player=0,shots=10,hits=new Set(),scans=new Map(),finishing=false;const scores=[0,0],aliens=shuffle(Array.from({length:36},(_,i)=>i),s.random).slice(0,3);s.debug.aliens=aliens;
 const draw=()=>{s.body.innerHTML=`<div class="trivia-meta">${shots} SCANS LEFT · ${hits.size}/3 SIGNALS FOUND</div><div class="grid-game" id="sonar-grid" style="grid-template-columns:repeat(6,1fr)"></div><p class="game-hint">Numbers are the distance in grid steps to the nearest signal. Every scan gives you a clue.</p>`;const root=document.getElementById('sonar-grid');for(let i=0;i<36;i++){const b=document.createElement('button');b.textContent=hits.has(i)?'◉':scans.has(i)?scans.get(i):'·';b.disabled=scans.has(i);if(hits.has(i))b.className='p'+player;root.appendChild(b);s.on(b,'click',()=>scan(i));}};
 async function scan(i){if(finishing||s.paused||scans.has(i)||!s.alive)return;shots--;const dist=Math.min(...aliens.map(a=>Math.abs(a%6-i%6)+Math.abs(Math.floor(a/6)-Math.floor(i/6))));scans.set(i,dist);if(dist===0){hits.add(i);scores[player]+=5;sound('win');}else sound('tap');s.setScores(scores);draw();if(shots===0||hits.size===3){finishing=true;scores[player]+=hits.size===3?shots:0;s.setScores(scores);if(player===0){player=1;await start();}else s.finish(scores);}}
 async function start(){shots=10;hits=new Set();scans=new Map();draw();if(!await s.pass(player,'Ten scans. Three hidden signals. Use the distance clues to find them. Same grid for both players.'))return;finishing=false;}
 await start();
}

Object.assign(exports,{SOKOBAN_MAPS,parseSokoban,sokobanMove,sokoban,pipeRotate,makePipePuzzle,pipeConnected,pipeconnect,sonargrid});