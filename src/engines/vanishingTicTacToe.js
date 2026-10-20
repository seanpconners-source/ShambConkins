// WarGames · Vanishing Tic-Tac-Toe on the WOPR. Each player may only have THREE heads on the board: placing a
// fourth makes your oldest one vanish (it pulses before it goes). No draws, just mind games. First to two wins.
const {clamp}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {label,rr,makeFx,makeShake,sfx,voice}=require("src/engines/tarantinoKit.js");
const {isCpu,cpuHotseat}=require("src/engines/cpuKit.js");
const {pickTicTacToe}=require("src/engines/cpuBoards.js");
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const QUOTES=['SHALL WE PLAY A GAME?','A STRANGE GAME.','THE ONLY WINNING MOVE IS NOT TO PLAY.','HOW ABOUT A NICE GAME OF CHESS?','DEFCON 3','DEFCON 2','GREETINGS, PROFESSOR FALKEN.'];

async function tictactoe(s){
 const [c,x]=s.canvas(620,700,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 const fx=makeFx(),shake=makeShake(),wins=[0,0];
 let board=Array(9).fill(null),marks=[[],[]],turn=0,starter=0,game=1,moves=0,phase='play',line=null,endT=0,t=0,quote=QUOTES[0],typed=0,born=Array(9).fill(0);
 s.debug={engine:'tictactoe',get board(){return board;},wins,get turn(){return turn;},play:i=>place(i)};
 const L={};function layout(){const W=s.W,H=s.H,size=Math.min(W*.86,H*.62);Object.assign(L,{W,H,size,ox:(W-size)/2,oy:H*.24,cell:size/3});}
 const cellAt=p=>{const cx=Math.floor((p.x-L.ox)/L.cell),cy=Math.floor((p.y-L.oy)/L.cell);return cx>=0&&cx<3&&cy>=0&&cy<3?cy*3+cx:-1;};

 function place(i){if(phase!=='play'||s.paused||board[i]!==null)return;
  const mine=marks[turn];if(mine.length>=3){const old=mine.shift();board[old]=null;const p=centre(old);fx.spark(p.x,p.y,12,turn?'#ff9fc6':'#78b6ff',200);voice(300,.15,.04,'sine',{slide:.5});}
  board[i]=turn;mine.push(i);born[i]=t;moves++;sfx.click();voice(turn?660:520,.08,.05,'square');
  const w=LINES.find(l=>l.every(k=>board[k]===turn));
  if(w){line=w;wins[turn]++;s.setScores(wins);phase='won';endT=2;sfx.fanfare();shake.kick(8);vibrate(40);s.react(turn,'happy');s.react(1-turn,'sad');const a=centre(w[0]),b=centre(w[2]);fx.confetti((a.x+b.x)/2,(a.y+b.y)/2,40);quote=wins[turn]>=2?'WINNER: '+s.players[turn].name.toUpperCase():QUOTES[1+game%6];typed=0;return;}
  if(moves>=30){phase='won';line=null;endT=2;quote=QUOTES[2];typed=0;return;}
  turn=1-turn;}
 const centre=i=>({x:L.ox+(i%3+.5)*L.cell,y:L.oy+(Math.floor(i/3)+.5)*L.cell});

 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||isCpu(s)&&turn===1)return;ev.preventDefault();const i=cellAt(s.pointer(ev));if(i>=0)place(i);});
 s.on(document,'keydown',ev=>{const n=+ev.key;if(n>=1&&n<=9&&!(isCpu(s)&&turn===1)){ev.preventDefault();place(n-1);}});

 function nextGame(){if(wins[0]>=2||wins[1]>=2||game>=5){if(s.alive)s.finish([...wins],wins[0]===wins[1]?`The WOPR calls it a draw, ${wins[0]}–${wins[1]}.`:`${s.players[wins[0]>wins[1]?0:1].name} beats the WOPR’s game ${Math.max(...wins)}–${Math.min(...wins)}.`);return;}
  game++;starter=1-starter;turn=starter;board=Array(9).fill(null);marks=[[],[]];moves=0;line=null;phase='play';quote=QUOTES[3+game%4];typed=0;}

 function draw(){const {W,H,ox,oy,size,cell}=L;x.save();shake.apply(x);
  x.fillStyle='#020a06';x.fillRect(-20,-20,W+40,H+40);
  const g=x.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'#0a2a1a');g.addColorStop(1,'#000');x.fillStyle=g;x.fillRect(0,0,W,H);
  // terminal text
  const fs=clamp(W*.04,12,22),q=quote.slice(0,Math.floor(typed));label(x,q+(Math.floor(t*2)%2?'_':''),W/2,H*.07,fs,{fill:'#5fff9a',stroke:'transparent',font:'monospace'});
  for(let i=0;i<2;i++){const px=i?W-14:14,al=i?'right':'left',on=turn===i&&phase==='play';label(x,`${s.players[i].name.toUpperCase()} ${'■'.repeat(wins[i])}${'□'.repeat(2-wins[i])}`,px,H*.14,fs*.9,{align:al,fill:i?'#ff9fc6':'#78b6ff',alpha:on?1:.55});
   if(on)label(x,'YOUR MOVE',px,H*.14+fs*1.2,fs*.7,{align:al,fill:'#5fff9a'});}
  // grid
  x.strokeStyle='#5fff9a';x.lineWidth=3;x.shadowColor='#5fff9a';x.shadowBlur=10;for(let k=1;k<3;k++){x.beginPath();x.moveTo(ox+k*cell,oy+8);x.lineTo(ox+k*cell,oy+size-8);x.stroke();x.beginPath();x.moveTo(ox+8,oy+k*cell);x.lineTo(ox+size-8,oy+k*cell);x.stroke();}x.shadowBlur=0;
  // marks
  for(let i=0;i<9;i++){const o=board[i];if(o===null)continue;const p=centre(i),old=marks[o].length>=3&&marks[o][0]===i&&phase==='play'&&turn===o;
   const pop=clamp((t-born[i])/.18,0,1),sz=cell*.78*(.6+.4*pop)*(old?1+Math.sin(t*10)*.05:1);
   x.save();if(old)x.globalAlpha=.45+Math.sin(t*10)*.2;x.strokeStyle=o?'#ff9fc6':'#78b6ff';x.lineWidth=4;x.beginPath();x.arc(p.x,p.y,sz*.5,0,7);x.stroke();
   s.sprite(x,o,p.x,p.y,sz*.92,{exact:true,mood:phase==='won'&&line?(line.includes(i)?'happy':'sad'):undefined});x.restore();
   if(old)label(x,'VANISHES NEXT',p.x,p.y+sz*.52,clamp(cell*.09,8,12),{fill:'#ffd23f'});}
  if(line){const a=centre(line[0]),b=centre(line[2]);x.strokeStyle='#ffd23f';x.lineWidth=8;x.lineCap='round';x.shadowColor='#ffd23f';x.shadowBlur=16;x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();x.shadowBlur=0;}
  label(x,`GAME ${game} · each player keeps only 3 heads; your 4th wipes your oldest`,W/2,oy+size+fs*1.3,fs*.65,{fill:'#5fff9a99',stroke:'transparent'});
  x.fillStyle='#00000022';for(let yy=0;yy<H;yy+=3)x.fillRect(0,yy,W,1);
  fx.draw(x);x.restore();}

 s.hint('Take turns tapping an empty square. You can only own three squares: your fourth move removes your oldest head (it pulses and says VANISHES NEXT). Three in a row wins the game; first to two games wins. Keys 1–9.');
 if(isCpu(s))cpuHotseat(s,{isTurn:()=>turn===1&&phase==='play',think:()=>place(pickTicTacToe(s,board,marks)),delay:550});
 if(!await s.pass(0,'SHALL WE PLAY A GAME? Tic-tac-toe on the WOPR, but each of you can only keep three heads on the board. Your fourth move erases your oldest. No draws. First to two wins.','Both ready',{countdown:0}))return;
 s.frame(dt=>{layout();t+=dt;typed+=dt*24;if(phase==='won'){endT-=dt;if(endT<=0)nextGame();}fx.step(dt);shake.step(dt);draw();s.status(phase==='play'?`${s.players[turn].name} to move · game ${game}`:'');});
}
Object.assign(exports,{tictactoe});
