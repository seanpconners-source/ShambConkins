const {blackjackValue:cardBlackjackValue, pokerRank:cardPokerRank, comparePoker:cardComparePoker, ROULETTE_RED:cardRouletteRed, roulettePayout:cardRoulettePayout}=require("src/engines/casinoCards.js");
const {playBlackjack}=require("src/engines/casinoBlackjack.js");
const {playPoker}=require("src/engines/casinoPoker.js");
const {playRoulette}=require("src/engines/casinoRoulette.js");
const {playYahtzee, YAHTZEE_CATEGORIES:diceCategories, yahtzeeScore:diceScore, yahtzeeTotal:diceTotal}=require("src/engines/yahtzee.js");
const {escapeHTML}=require("src/utils.js");
const {sound}=require("src/audio.js");
const {portraitHTML}=require("src/assets.js");
const {isCpu,cpuHotseat}=require("src/engines/cpuKit.js");
const {pickConnect4,pickReversi}=require("src/engines/cpuBoards.js");
function fourWinner(board){for(let r=0;r<6;r++)for(let c=0;c<7;c++){const v=board[r][c];if(v<0)continue;for(const[dc,dr]of [[1,0],[0,1],[1,1],[1,-1]])if([1,2,3].every(i=>board[r+dr*i]?.[c+dc*i]===v))return v;}return null;}
async function connect4(s){const board=Array.from({length:6},()=>Array(7).fill(-1));let player=0,moves=0,busy=false,last=null;const draw=()=>{s.body.classList.add('four-heads-body');s.body.innerHTML=`<div class="trivia-meta">${escapeHTML(s.players[player].name.toUpperCase())} · THERE ARE FOUR HEADS!</div><div class="grid-game four-heads" id="four-grid" style="grid-template-columns:repeat(7,1fr)"></div><p class="game-hint">Star Trek: THERE ARE FOUR LIGHTS! Drop your head into a column; connect four to win.</p>`;const root=document.getElementById('four-grid');for(let r=0;r<6;r++)for(let c=0;c<7;c++){const b=document.createElement('button');b.dataset.column=String(c);if(board[r][c]<0){b.textContent='';b.setAttribute('aria-label','Drop in column '+(c+1));}else {b.innerHTML=portraitHTML(s.players[board[r][c]].character,'portrait game-token');b.setAttribute('aria-label',s.players[board[r][c]].name+' head');}b.className=board[r][c]>=0?'p'+board[r][c]:'';if(last?.r===r&&last.c===c)b.classList.add('head-drop');b.style.setProperty('--drop-rows',String(r+1));b.disabled=busy;root.appendChild(b);s.on(b,'click',()=>{if(isCpu(s)&&player===1)return;void drop(c);});}s.debug={board,player,busy,drop};};
 async function drop(c){if(s.paused||!s.alive||busy)return;let r=5;while(r>=0&&board[r][c]>=0)r--;if(r<0)return;busy=true;board[r][c]=player;last={r,c};moves++;sound('tap');const win=fourWinner(board);draw();if(!await (s.wait?s.wait(420):s.delay(420)))return;if(win!==null)return s.finish(win===0?[1,0]:[0,1],'Star Trek · there are FOUR heads!');if(moves===42)return s.finish([0,0],'The board is full.');player=1-player;last=null;busy=false;draw();await s.pass(player,'Your turn. Drop your head into a column. Four in a line wins.');}
 if(isCpu(s))cpuHotseat(s,{isTurn:()=>player===1&&!busy,think:()=>drop(pickConnect4(s,board,1))});
 draw();await s.pass(player,'Star Trek: THERE ARE FOUR LIGHTS! Connect four floating heads. Watch your head drop and bounce into place; you share the board and alternate moves.');
}
const REV_DIRS=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
function reversiFlips(board,r,c,player){if(board[r]?.[c]!==-1)return [];const out=[];for(const[dx,dy]of REV_DIRS){let x=c+dx,y=r+dy,line=[];while(board[y]?.[x]===1-player){line.push([y,x]);x+=dx;y+=dy;}if(line.length&&board[y]?.[x]===player)out.push(...line);}return out;}
function reversiMoves(board,player){const out=[];for(let r=0;r<6;r++)for(let c=0;c<6;c++)if(reversiFlips(board,r,c,player).length)out.push([r,c]);return out;}
async function reversi(s){const board=Array.from({length:6},()=>Array(6).fill(-1));board[2][2]=board[3][3]=0;board[2][3]=board[3][2]=1;let player=0;
 const count=()=>[board.flat().filter(v=>v===0).length,board.flat().filter(v=>v===1).length];
 const draw=()=>{s.setScores(count());s.body.innerHTML=`<div class="trivia-meta">${escapeHTML(s.players[player].name.toUpperCase())} · CLAIM TERRITORY</div><div class="grid-game" id="rev-grid" style="grid-template-columns:repeat(6,1fr)"></div><p class="game-hint">Highlighted cells are legal moves. Trap an opposing line between your discs to flip it.</p>`;const root=document.getElementById('rev-grid');for(let r=0;r<6;r++)for(let c=0;c<6;c++){const b=document.createElement('button'),legal=reversiFlips(board,r,c,player).length>0;if(board[r][c]>=0){b.innerHTML=portraitHTML(s.players[board[r][c]].character,'portrait game-token');b.setAttribute('aria-label',s.players[board[r][c]].name+' disc');}else b.textContent=legal?'✦':'·';b.className=board[r][c]>=0?'p'+board[r][c]:legal?'legal':'';b.disabled=!legal;root.appendChild(b);s.on(b,'click',()=>{if(isCpu(s)&&player===1)return;void place(r,c);});}s.debug.board=board;};
 async function place(r,c){if(s.paused||!s.alive)return;const flips=reversiFlips(board,r,c,player);if(!flips.length)return;board[r][c]=player;flips.forEach(([y,x])=>board[y][x]=player);sound('tap');player=1-player;let note='Find a line to flip.';if(!reversiMoves(board,player).length){player=1-player;note='Your opponent has no legal move. You play again.';if(!reversiMoves(board,player).length)return s.finish(count(),'No legal moves remain.');}draw();await s.pass(player,note);}
 if(isCpu(s))cpuHotseat(s,{isTurn:()=>player===1,think:()=>{const m=pickReversi(s,board,reversiFlips,reversiMoves);return m&&place(m[0],m[1]);}});
 draw();await s.pass(player,'A 6 × 6 territory battle. Legal moves are highlighted. Most discs wins.');
}
const YAHTZEE_CATEGORIES=diceCategories;
const yahtzeeScore=diceScore;
const yahtzeeTotal=diceTotal;
const yahtzee=playYahtzee;
const blackjackValue=cardBlackjackValue;
const blackjack=playBlackjack;
const pokerRank=cardPokerRank;
const comparePoker=cardComparePoker;
const poker=playPoker;
const ROULETTE_RED=cardRouletteRed;
const roulettePayout=cardRoulettePayout;
const roulette=playRoulette;

Object.assign(exports,{fourWinner,connect4,reversiFlips,reversiMoves,reversi,YAHTZEE_CATEGORIES,yahtzeeScore,yahtzeeTotal,yahtzee,blackjackValue,blackjack,pokerRank,comparePoker,poker,ROULETTE_RED,roulettePayout,roulette});