// WORDS N' SHIT rules (Node-testable): the Words With Friends board, tiles and scoring.
// Board cell = null or {ch:'a'..'z', blank:bool}. A play = [{r,c,ch,blank}] of the tiles put down this turn.
const N=15,RACK=7,BINGO=35,CENTER=7;
// premium squares, rows 0-7 (rows 8-14 mirror them): T triple word, D double word, t triple letter, d double letter, * start
const HALF=[
 '...T..t.t..T...',
 '..d..D...D..d..',
 '.d..d.....d..d.',
 'T..t...D...t..T',
 '..d...d.d...d..',
 '.D...t...t...D.',
 't...d.....d...t',
 '...D...*...D...'];
const LAYOUT=[...HALF,...HALF.slice(0,7).reverse()];
const BONUS=LAYOUT.map(row=>[...row].map(ch=>({T:'TW',D:'DW',t:'TL',d:'DL','*':'ST'})[ch]||null));
// tile values and how many of each are in the bag (104 tiles, 2 blanks '?')
const VALUE={a:1,b:4,c:4,d:2,e:1,f:4,g:3,h:3,i:1,j:10,k:5,l:2,m:4,n:2,o:1,p:4,q:10,r:1,s:1,t:1,u:2,v:5,w:4,x:8,y:3,z:10,'?':0};
const COUNT={a:9,b:2,c:2,d:5,e:13,f:2,g:3,h:4,i:8,j:1,k:1,l:4,m:2,n:5,o:8,p:2,q:1,r:6,s:5,t:7,u:4,v:2,w:2,x:1,y:2,z:1,'?':2};
const emptyBoard=()=>Array.from({length:N},()=>Array(N).fill(null));
const isEmpty=b=>b.every(row=>row.every(q=>!q));
function newBag(rand){const bag=[];for(const [ch,n] of Object.entries(COUNT))for(let i=0;i<n;i++)bag.push(ch);
 for(let i=bag.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}return bag;}
// draw from the end of the bag until the rack has 7 (both phones online draw the same way)
function refill(rack,bag){while(rack.length<RACK&&bag.length)rack.push(bag.pop());return rack;}
// swap: the chosen tiles go back in the bag at seeded spots, then the rack refills
function swapTiles(rack,idx,bag,rand){const out=idx.slice().sort((a,b)=>b-a).map(i=>rack.splice(i,1)[0]);refill(rack,bag);
 for(const t of out){const j=Math.floor(rand()*(bag.length+1));bag.splice(j,0,t);}return out;}
const valueOf=t=>t.blank?0:VALUE[t.ch]||0;
const at=(b,r,c)=>r>=0&&r<N&&c>=0&&c<N?b[r][c]:undefined;
// check a play's shape and read the words it makes. Returns {ok,err} or {ok:true,words:[{word,cells,score}],score,bingo}
function evaluate(board,play){
 if(!play.length)return {ok:false,err:'Put some tiles on the board'};
 const key=new Set();for(const p of play){if(p.r<0||p.r>=N||p.c<0||p.c>=N)return {ok:false,err:'Off the board'};if(board[p.r][p.c])return {ok:false,err:'That square is taken'};
  const k=p.r*N+p.c;if(key.has(k))return {ok:false,err:'Two tiles in one square'};key.add(k);}
 const rows=new Set(play.map(p=>p.r)),cols=new Set(play.map(p=>p.c));
 if(rows.size>1&&cols.size>1)return {ok:false,err:'Tiles must go in one straight line'};
 const tmp=board.map(row=>row.slice());for(const p of play)tmp[p.r][p.c]={ch:p.ch,blank:!!p.blank,fresh:true};
 // direction: along the line of tiles; a single tile reads along whichever way makes a word (across first)
 let across=rows.size===1&&(play.length>1||at(tmp,play[0].r,play[0].c-1)||at(tmp,play[0].r,play[0].c+1));
 if(play.length===1&&!across&&!at(tmp,play[0].r-1,play[0].c)&&!at(tmp,play[0].r+1,play[0].c))across=true;
 const dr=across?0:1,dc=across?1:0;
 // no gaps between the first and last new tile
 const s0=play.reduce((m,p)=>Math.min(m,across?p.c:p.r),N),s1=play.reduce((m,p)=>Math.max(m,across?p.c:p.r),0),line=across?play[0].r:play[0].c;
 for(let k=s0;k<=s1;k++){const q=across?tmp[line][k]:tmp[k][line];if(!q)return {ok:false,err:'Leave no gaps between your tiles'};}
 const first=isEmpty(board);
 if(first){if(!key.has(CENTER*N+CENTER))return {ok:false,err:'The first word goes through the star'};if(play.length<2)return {ok:false,err:'The first word needs at least 2 letters'};}
 const read=(r,c,dr,dc)=>{while(at(tmp,r-dr,c-dc))r-=dr,c-=dc;const cells=[];while(at(tmp,r,c)){cells.push({r,c,...tmp[r][c]});r+=dr;c+=dc;}return cells;};
 const words=[];const main=read(play[0].r,play[0].c,dr,dc);if(main.length>1)words.push(main);
 for(const p of play){const cw=read(p.r,p.c,dc,dr);if(cw.length>1)words.push(cw);}
 if(!words.length)return {ok:false,err:'Make a word of at least 2 letters'};
 if(!first&&!words.some(w=>w.some(q=>!q.fresh)))return {ok:false,err:'Join your word to the tiles on the board'};
 let total=0;const out=words.map(cells=>{let sum=0,mult=1;for(const q of cells){let v=valueOf(q);if(q.fresh){const b=BONUS[q.r][q.c];if(b==='DL')v*=2;else if(b==='TL')v*=3;else if(b==='DW')mult*=2;else if(b==='TW')mult*=3;}sum+=v;}
  const score=sum*mult;total+=score;return {word:cells.map(q=>q.ch).join(''),cells:cells.map(q=>({r:q.r,c:q.c,fresh:!!q.fresh})),score};});
 const bingo=play.length===RACK;if(bingo)total+=BINGO;
 return {ok:true,words:out,score:total,bingo,across};}
function place(board,play){for(const p of play)board[p.r][p.c]={ch:p.ch,blank:!!p.blank};return board;}
const rackValue=rack=>rack.reduce((a,t)=>a+(t==='?'?0:VALUE[t]||0),0);
Object.assign(exports,{N,RACK,BINGO,CENTER,LAYOUT,BONUS,VALUE,COUNT,emptyBoard,isEmpty,newBag,refill,swapTiles,evaluate,place,rackValue,valueOf});
