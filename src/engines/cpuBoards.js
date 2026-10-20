// CPU move pickers for the board games (solo vs CPU). The CPU is always player 1 (index 1).
const R=require("src/engines/strategyRules.js");
const {negamax,cpuDepth,cpuBlunder,pickRandom}=require("src/engines/cpuKit.js");
const soon=ms=>Date.now()+ms;
// ---------------------------------------------------------------- Ultimate tic-tac-toe
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function boardThreat(cells,who){return LINES.some(l=>l.filter(k=>cells[k]===who).length===2&&l.some(k=>cells[k]===-1));}
function ultimateValue(st){let v=0;for(let b=0;b<9;b++){const o=st.boards[b];if(o===1)v+=b===4?14:10;else if(o===0)v-=b===4?14:10;else if(o<0){const cells=st.cells.slice(b*9,b*9+9);if(boardThreat(cells,1))v+=2;if(boardThreat(cells,0))v-=2;}}
 for(const l of LINES){const own=l.map(b=>st.boards[b]);if(own.filter(o=>o===1).length===2&&own.some(o=>o===-1))v+=12;if(own.filter(o=>o===0).length===2&&own.some(o=>o===-1))v-=12;}return v;}
function pickUltimate(s,st){const ms=R.ultimateMoves(st);if(cpuBlunder(s))return pickRandom(ms);
 return negamax({moves:R.ultimateMoves,play:R.ultimateMove,turn:x=>x.turn,over:x=>x.winner,value:ultimateValue},st,cpuDepth(s,1,4),{deadline:soon(900)});}
// ---------------------------------------------------------------- Mancala (Kalah)
function pickMancala(s,st){const ms=R.mancalaMoves(st);if(cpuBlunder(s))return pickRandom(ms);
 return negamax({moves:R.mancalaMoves,play:(x,m)=>R.mancalaMove(x,m)?.state,turn:x=>x.turn,over:x=>x.winner,value:x=>x.pits[13]-x.pits[6]+(x.pits.slice(7,13).reduce((a,b)=>a+b,0)-x.pits.slice(0,6).reduce((a,b)=>a+b,0))*.25},st,cpuDepth(s,2,7),{deadline:soon(900)});}
// ---------------------------------------------------------------- Dots and boxes: take boxes, never hand over a third side if avoidable
function dotsEdges(st){return [...st.h.flatMap((o,i)=>o<0?[['h',i]]:[]),...st.v.flatMap((o,i)=>o<0?[['v',i]]:[])];}
function dotsGiveaway(st){let n=0,cur=st;for(let guard=0;guard<40;guard++){const take=dotsEdges(cur).map(([o,i])=>R.dotsMove(cur,o,i)).find(m=>m?.claimed.length);if(!take)break;n+=take.claimed.length;cur=take.state;}return n;}
function pickDots(s,st){const edges=dotsEdges(st),tries=edges.map(e=>({e,m:R.dotsMove(st,e[0],e[1])})).filter(t=>t.m);
 const grab=tries.filter(t=>t.m.claimed.length);if(grab.length&&!cpuBlunder(s))return grab[0].e;if(cpuBlunder(s))return pickRandom(edges);
 const scored=tries.map(t=>({e:t.e,give:dotsGiveaway(t.m.state)}));const least=Math.min(...scored.map(t=>t.give));return pickRandom(scored.filter(t=>t.give===least)).e;}
// ---------------------------------------------------------------- Checkers / chess (material search)
function checkersValue(st){let v=0;for(const p of st.board)if(p)v+=(p.owner===1?1:-1)*(p.king?1.7:1);return v;}
function pickCheckers(s,st){const ms=R.checkersMoves(st);if(cpuBlunder(s))return pickRandom(ms);
 return negamax({moves:R.checkersMoves,play:(x,m)=>R.checkersMove(x,m.from,m.to)?.state,turn:x=>x.turn,over:x=>x.winner,value:checkersValue},st,cpuDepth(s,2,6),{deadline:soon(1200)});}
const PIECE={P:1,N:3,B:3.2,R:5,Q:9,K:0};
function chessValue(st){let v=0;st.board.forEach((p,i)=>{if(!p)return;const c=i%8,r=Math.floor(i/8),centre=(3.5-Math.abs(3.5-c))+(3.5-Math.abs(3.5-r));v+=(p.owner===1?1:-1)*(PIECE[p.type]+(p.type==='N'||p.type==='B'||p.type==='P'?centre*.04:0));});return v;}
function pickChess(s,st){const cache=new WeakMap(),moves=x=>{let m=cache.get(x);if(!m){m=R.chessMoves(x);cache.set(x,m);}return m;};const ms=moves(st);if(cpuBlunder(s))return pickRandom(ms);
 const over=x=>{if(moves(x).length)return x.half>=100?2:-1;return R.chessResult(x).winner;};
 return negamax({moves,play:(x,m)=>R.chessMove(x,m.from,m.to,m.promotion||'Q')?.state,turn:x=>x.turn,over,value:chessValue},st,cpuDepth(s,1,3),{deadline:soon(1500)});}
// ---------------------------------------------------------------- Connect four (board[r][c], -1 empty, 6x7)
function c4Drop(b,c,p){let r=5;while(r>=0&&b[r][c]>=0)r--;if(r<0)return null;const n=b.map(row=>row.slice());n[r][c]=p;return n;}
function c4Winner(b){for(let r=0;r<6;r++)for(let c=0;c<7;c++){const p=b[r][c];if(p<0)continue;for(const[dr,dc]of[[0,1],[1,0],[1,1],[1,-1]]){let k=1;while(k<4&&b[r+dr*k]?.[c+dc*k]===p)k++;if(k===4)return p;}}return b[0].every(v=>v>=0)?2:-1;}
function c4Value(b){let v=0;for(let r=0;r<6;r++)for(let c=0;c<7;c++)for(const[dr,dc]of[[0,1],[1,0],[1,1],[1,-1]]){const cells=[0,1,2,3].map(k=>b[r+dr*k]?.[c+dc*k]);if(cells.some(x=>x===undefined))continue;const a=cells.filter(x=>x===1).length,o=cells.filter(x=>x===0).length;if(a&&!o)v+=a===3?6:a===2?2:.3;if(o&&!a)v-=o===3?7:o===2?2:.3;}
 for(let r=0;r<6;r++)v+=(b[r][3]===1?1:b[r][3]===0?-1:0)*1.5;return v;}
function pickConnect4(s,board,player){const ms=[3,2,4,1,5,0,6].filter(c=>board[0][c]<0);if(cpuBlunder(s))return pickRandom(ms);
 return negamax({moves:x=>x.w>=0?[]:[3,2,4,1,5,0,6].filter(c=>x.b[0][c]<0),play:(x,c)=>{const b=c4Drop(x.b,c,x.t);return b&&{b,t:1-x.t,w:c4Winner(b)};},turn:x=>x.t,over:x=>x.w,value:x=>c4Value(x.b)},{b:board,t:player,w:-1},cpuDepth(s,2,6),{deadline:soon(1200)});}
// ---------------------------------------------------------------- Reversi 6x6 (flips(board,r,c,p), moves(board,p))
const REV_W=[[9,-3,2,2,-3,9],[-3,-4,-1,-1,-4,-3],[2,-1,1,1,-1,2],[2,-1,1,1,-1,2],[-3,-4,-1,-1,-4,-3],[9,-3,2,2,-3,9]];
function pickReversi(s,board,flips,movesFor){const ms=movesFor(board,1);if(cpuBlunder(s))return pickRandom(ms);
 const play=(x,[r,c])=>{const f=flips(x.b,r,c,x.t);if(!f.length)return null;const b=x.b.map(row=>row.slice());b[r][c]=x.t;f.forEach(([y,xx])=>b[y][xx]=x.t);let t=1-x.t;if(!movesFor(b,t).length)t=1-t;return {b,t};};
 const over=x=>{if(movesFor(x.b,x.t).length)return -1;let a=0,o=0;x.b.flat().forEach(v=>{if(v===1)a++;else if(v===0)o++;});return a===o?2:a>o?1:0;};
 return negamax({moves:x=>movesFor(x.b,x.t),play,turn:x=>x.t,over,value:x=>x.b.reduce((v,row,r)=>v+row.reduce((w,c,cc)=>w+(c===1?REV_W[r][cc]:c===0?-REV_W[r][cc]:0),0),0)},{b:board,t:1},cpuDepth(s,1,4),{deadline:soon(900)});}
// ---------------------------------------------------------------- Vanishing tic-tac-toe (3 marks each, the 4th removes your oldest)
function pickTicTacToe(s,board,marks){const free=board.flatMap((v,i)=>v===null?[i]:[]);if(cpuBlunder(s))return pickRandom(free);
 const wins=(b,who)=>LINES.some(l=>l.every(k=>b[k]===who));
 const after=(who,i)=>{const b=board.slice(),m=marks[who].slice();if(m.length>=3)b[m.shift()]=null;b[i]=who;return b;};
 const win=free.find(i=>wins(after(1,i),1));if(win!==undefined)return win;
 const block=free.find(i=>wins(after(0,i),0));if(block!==undefined&&Math.random()<.4+s.solo.skill*.6)return block;
 return free.includes(4)?4:pickRandom(free);}
Object.assign(exports,{pickUltimate,pickMancala,pickDots,pickCheckers,pickChess,pickConnect4,pickReversi,pickTicTacToe});
