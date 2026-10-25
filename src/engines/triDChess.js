// Star Trek · Three-Dimensional-ish Chess, rebuilt as Gardner minichess (5x5: king, queen, rook, bishop, knight and
// five pawns each) with real rules: check, checkmate, stalemate, single-step pawns and promotion to a queen. Drawn as
// a glowing holo board inside an LCARS console with Tri-D attack boards floating beside it. Pieces wear your heads.
// Take turns on one screen: tap a piece, then a highlighted square. 45 seconds a move.
const {clamp}=require("src/utils.js");
const {voice,label,SANS,rr}=require("src/engines/tarantinoKit.js");
const {vibrate}=require("src/audio.js");
const {versus,notMine,onlineMoves,tell,cpuHotseat,negamax,cpuDepth,cpuBlunder,pickRandom}=require("src/engines/cpuKit.js");

const N=5,GLYPH={K:'♚',Q:'♛',R:'♜',B:'♝',N:'♞',P:'♟'},VAL={P:1,N:3,B:3,R:5,Q:9,K:0},COL=['#ffb347','#b38bff'],LC={o:'#ff9c3a',p:'#cc99ff',b:'#9999ff',t:'#ffcc66',r:'#cc6666'};
const MOVE_SECS=45,MAX_PLY=120;

function start(){const back=['R','N','B','Q','K'],b=Array.from({length:N},()=>Array(N).fill(null));for(let c=0;c<N;c++){b[4][c]={t:back[c],o:0};b[3][c]={t:'P',o:0};b[1][c]={t:'P',o:1};b[0][c]={t:back[c],o:1};}return b;}
const inside=(r,c)=>r>=0&&c>=0&&r<N&&c<N;
function pseudo(b,r,c){const p=b[r][c];if(!p)return [];const out=[],add=(tr,tc)=>{if(!inside(tr,tc))return false;const q=b[tr][tc];if(q&&q.o===p.o)return false;out.push([tr,tc]);return !q;};
 const ray=dirs=>{for(const [dr,dc] of dirs){let k=1;while(add(r+dr*k,c+dc*k))k++;}};
 if(p.t==='P'){const d=p.o===0?-1:1;if(inside(r+d,c)&&!b[r+d][c])out.push([r+d,c]);for(const dc of [-1,1]){const q=inside(r+d,c+dc)&&b[r+d][c+dc];if(q&&q.o!==p.o)out.push([r+d,c+dc]);}}
 else if(p.t==='N')for(const [dr,dc] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]])add(r+dr,c+dc);
 else if(p.t==='K')for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])add(r+dr,c+dc);
 else{if(p.t!=='B')ray([[1,0],[-1,0],[0,1],[0,-1]]);if(p.t!=='R')ray([[1,1],[1,-1],[-1,1],[-1,-1]]);}
 return out;}
function kingAt(b,o){for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(b[r][c]?.t==='K'&&b[r][c].o===o)return [r,c];return null;}
function attacked(b,r,c,by){for(let i=0;i<N;i++)for(let j=0;j<N;j++){const p=b[i][j];if(p&&p.o===by&&pseudo(b,i,j).some(([a,d])=>a===r&&d===c))return true;}return false;}
function apply(b,m){const nb=b.map(row=>row.slice());const p=nb[m[0]][m[1]];nb[m[2]][m[3]]=p.t==='P'&&(m[2]===0||m[2]===N-1)?{t:'Q',o:p.o}:p;nb[m[0]][m[1]]=null;return nb;}
function inCheck(b,o){const k=kingAt(b,o);return !k||attacked(b,k[0],k[1],1-o);}
function legalFrom(b,r,c){const p=b[r][c];if(!p)return [];return pseudo(b,r,c).filter(([tr,tc])=>!inCheck(apply(b,[r,c,tr,tc]),p.o));}
function allLegal(b,o){const out=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(b[r][c]?.o===o)for(const [tr,tc] of legalFrom(b,r,c))out.push([r,c,tr,tc]);return out;}
const material=(b,o)=>b.flat().filter(p=>p&&p.o===o).reduce((a,p)=>a+VAL[p.t],0);

async function minichess(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.controls([]);s.ownHud(true,true);
 let b=start(),turn=0,sel=null,targets=[],last=null,ply=0,clock=MOVE_SECS,state='wait',t=0,banner=null,anim=null;const captured=[[],[]];
 function geo(){const W=s.W,H=s.H,portrait=H>W*1.05,top=52,size=portrait?Math.min(W-24,H-top-150):Math.min(H-top-74,W*.56),ox=portrait?(W-size)/2:W*.5-size/2,oy=portrait?top+70:top+(H-top-size)/2;return {W,H,portrait,size,ox,oy,cell:size/N};}
 function finish(winner,why){state='over';const sc=winner===0?[1,0]:winner===1?[0,1]:[0,0];banner={text:why,t:9};s.setScores(sc);if(winner!==null)s.react?.(winner,'win',2.5);setTimeout(()=>s.finish(sc,`Tri-D chess · ${why}`),1800);}
 function doMove(m){tell(s,'move',m);const cap=b[m[2]][m[3]];const mover=b[m[0]][m[1]];anim={m,p:mover,t:0};b=apply(b,m);last=m;if(cap){captured[turn].push(cap);voice(330,.12,.06,'triangle');voice(220,.18,.05,'triangle',{delay:.08});vibrate(15);s.react?.(turn,'happy',1);s.react?.(1-turn,'sad',1);}else voice(660,.06,.04,'sine');
  ply++;turn=1-turn;sel=null;targets=[];clock=MOVE_SECS;const moves=allLegal(b,turn),check=inCheck(b,turn);
  if(!moves.length){finish(check?1-turn:null,check?`CHECKMATE · ${s.players[1-turn].name.toUpperCase()} WINS`:'STALEMATE · DRAW');return;}
  if(check){banner={text:'CHECK',t:1.4};voice(880,.2,.05,'square');}
  if(ply>=MAX_PLY){const a=material(b,0),d=material(b,1);finish(a>d?0:d>a?1:null,a===d?'MOVE LIMIT · DRAW':`MOVE LIMIT · ${s.players[a>d?0:1].name.toUpperCase()} AHEAD ON MATERIAL`);}}
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||state!=='play'||notMine(s,turn))return;ev.preventDefault();const p=s.pointer(ev),g=geo(),cc=Math.floor((p.x-g.ox)/g.cell),r=Math.floor((p.y-g.oy)/g.cell);if(!inside(r,cc)){sel=null;targets=[];return;}
  if(sel&&targets.some(([a,d])=>a===r&&d===cc)){doMove([sel[0],sel[1],r,cc]);return;}
  if(b[r][cc]?.o===turn){sel=[r,cc];targets=legalFrom(b,r,cc);voice(1200,.03,.03,'sine');}else{sel=null;targets=[];}});
 s.hint('Gardner minichess on a 5×5 board: each side has a king, queen, rook, bishop, knight and five pawns. Pawns move one square and promote to a queen. Tap a piece to see its legal moves, then tap a highlighted square. Checkmate wins; 45 seconds a move (a random legal move is played if time runs out).');
 function lcarsBar(X,Y,w,h,col,text,align='left'){x.fillStyle=col;rr(x,X,Y,w,h,h/2);x.fill();if(text)label(x,text,align==='left'?X+h*.7:X+w-h*.7,Y+h/2+1,h*.55,{fill:'#000',stroke:null,align,font:`900 ${h*.55}px ${SANS}`});}
 s.frame(dt=>{
  t+=dt;if(banner&&state!=='over'){banner.t-=dt;if(banner.t<=0)banner=null;}if(anim){anim.t+=dt*5;if(anim.t>=1)anim=null;}
  // online only the phone whose move it is plays the timeout move (sent like any move, so the shared seeded stream is left alone)
  if(state==='play'){clock=Math.max(0,clock-dt);if(clock<=0&&!(s.net&&notMine(s,turn))){const moves=allLegal(b,turn);if(moves.length)doMove(moves[Math.floor((s.net?Math.random:s.random)()*moves.length)]);}}
  const g=geo(),{W,H,size,ox,oy,cell}=g;
  x.setTransform(1,0,0,1,0,0);const bg=x.createRadialGradient(W/2,H/2,10,W/2,H/2,Math.hypot(W,H)*.6);bg.addColorStop(0,'#141a3a');bg.addColorStop(1,'#04050c');x.fillStyle=bg;x.fillRect(0,0,W,H);
  for(let k=0;k<70;k++){x.fillStyle=`rgba(255,255,255,${.25+.5*Math.abs(Math.sin(t*.7+k))})`;x.fillRect((k*137.3)%W,(k*71.9)%H,1.4,1.4);}
  // LCARS frame
  const bh=Math.max(16,Math.min(26,H*.035));lcarsBar(8,8,Math.max(120,W*.42),bh,LC.o,g.portrait?'TRI-D CHESS':'TRI-DIMENSIONAL CHESS');
  lcarsBar(8,H-bh-8,W*.3,bh,LC.p,`PLY ${ply}/${MAX_PLY}`);lcarsBar(W*.3+14,H-bh-8,W*.2,bh,LC.b,'');lcarsBar(W*.5+20,H-bh-8,W*.5-28,bh,turn===0?COL[0]:COL[1],`${s.players[turn].name.toUpperCase()} · ${Math.ceil(clock)}s`,'right');
  // floating attack boards (decor)
  const ab=g.portrait?Math.min(cell*.8,54):cell*1.2;for(const [ax,ay] of g.portrait?[[ox+size-ab,oy-ab-10],[ox+size*.5-ab/2,oy+size+46]]:[[ox-ab*1.5,oy+size*.12],[ox+size+ab*.5,oy+size*.6]]){x.save();x.globalAlpha=.55;for(let i=0;i<2;i++)for(let j=0;j<2;j++){x.fillStyle=(i+j)%2?'#3a6aff44':'#9fd8ff33';x.fillRect(ax+i*ab/2,ay+j*ab/2,ab/2,ab/2);}x.strokeStyle='#9fd8ff';x.lineWidth=1.5;x.strokeRect(ax,ay,ab,ab);x.restore();}
  // holo board
  x.save();x.shadowColor='#58c8ff';x.shadowBlur=24;x.fillStyle='#0a1a33';x.fillRect(ox-6,oy-6,size+12,size+12);x.restore();
  for(let r=0;r<N;r++)for(let cc=0;cc<N;cc++){x.fillStyle=(r+cc)%2?'#2a4a8acc':'#9fc8f0cc';x.fillRect(ox+cc*cell,oy+r*cell,cell,cell);}
  x.strokeStyle='#bfe8ff88';x.lineWidth=1;for(let k=0;k<=N;k++){x.beginPath();x.moveTo(ox+k*cell,oy);x.lineTo(ox+k*cell,oy+size);x.moveTo(ox,oy+k*cell);x.lineTo(ox+size,oy+k*cell);x.stroke();}
  if(last){for(const [r,cc] of [[last[0],last[1]],[last[2],last[3]]]){x.fillStyle='#ffd23f33';x.fillRect(ox+cc*cell,oy+r*cell,cell,cell);}}
  const chk=state==='play'&&inCheck(b,turn)?kingAt(b,turn):null;if(chk){x.fillStyle=`rgba(255,40,40,${.35+.25*Math.sin(t*8)})`;x.fillRect(ox+chk[1]*cell,oy+chk[0]*cell,cell,cell);}
  if(sel){x.strokeStyle='#ffd23f';x.lineWidth=3;x.strokeRect(ox+sel[1]*cell+2,oy+sel[0]*cell+2,cell-4,cell-4);}
  for(const [r,cc] of targets){const X=ox+(cc+.5)*cell,Y=oy+(r+.5)*cell;if(b[r][cc]){x.strokeStyle='#ff5a5a';x.lineWidth=4;x.beginPath();x.arc(X,Y,cell*.44,0,Math.PI*2);x.stroke();}else{x.fillStyle='#58e8ffcc';x.beginPath();x.arc(X,Y,cell*.13,0,Math.PI*2);x.fill();}}
  // pieces
  for(let r=0;r<N;r++)for(let cc=0;cc<N;cc++){const p=b[r][cc];if(!p)continue;let X=ox+(cc+.5)*cell,Y=oy+(r+.5)*cell;if(anim&&anim.m[2]===r&&anim.m[3]===cc){const k=1-Math.pow(1-anim.t,3);X=ox+((anim.m[1]+(cc-anim.m[1])*k)+.5)*cell;Y=oy+((anim.m[0]+(r-anim.m[0])*k)+.5)*cell;}
   x.fillStyle='#0008';x.beginPath();x.ellipse(X,Y+cell*.34,cell*.3,cell*.08,0,0,Math.PI*2);x.fill();
   x.save();x.shadowColor=COL[p.o];x.shadowBlur=10;x.strokeStyle=COL[p.o];x.lineWidth=3;x.beginPath();x.arc(X,Y-cell*.04,cell*.36,0,Math.PI*2);x.stroke();x.restore();
   s.sprite(x,p.o,X,Y-cell*.06,cell*.66,{exact:true,mood:p.o===turn&&state==='play'?'thinking':'normal'});
   x.fillStyle=COL[p.o];x.beginPath();x.arc(X+cell*.27,Y+cell*.24,cell*.16,0,Math.PI*2);x.fill();x.fillStyle='#000';x.font=`${cell*.22}px serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(GLYPH[p.t],X+cell*.27,Y+cell*.255);}
  // captured trays
  for(let i=0;i<2;i++){const list=captured[i],tx=g.portrait?(i?W-16:16):(i?ox+size+cell*.6:ox-cell*.6),ty=g.portrait?(i?oy-36:oy+size+36):oy+size*.5;
   label(x,s.players[i].name,g.portrait?tx:tx,g.portrait?(i?oy-58:oy+size+14):ty-cell*1.2,14,{fill:COL[i],align:g.portrait?(i?'right':'left'):'center',font:`900 14px ${SANS}`});
   list.forEach((p,k)=>{x.fillStyle=COL[p.o];x.font=`${Math.max(14,cell*.24)}px serif`;x.textAlign='center';x.textBaseline='middle';if(g.portrait)x.fillText(GLYPH[p.t],i?tx-k*18-8:tx+k*18+8,ty);else x.fillText(GLYPH[p.t],tx+(k%3-1)*18,ty-cell*.6+Math.floor(k/3)*20);});}
  if(banner)label(x,banner.text,W/2,oy+size/2,clamp(W*.06,20,42),{fill:'#ffd23f',stroke:'#000',alpha:state==='over'?1:clamp(banner.t*2,0,1)});
  s.debug={engine:'minichess',b,turn,ply,state,legal:()=>allLegal(b,turn),move:m=>doMove(m)};
 });
 // vs CPU: material search over the 5x5 board
 if(versus(s)){const V={P:1,N:3,B:3,R:5,Q:9,K:0},value=x=>{let v=0;for(const row of x.b)for(const p of row)if(p)v+=(p.o===1?1:-1)*V[p.t];return v;};
  const g={moves:x=>allLegal(x.b,x.t),play:(x,m)=>({b:apply(x.b,m),t:1-x.t}),turn:x=>x.t,over:x=>allLegal(x.b,x.t).length?-1:inCheck(x.b,x.t)?1-x.t:2,value};
  onlineMoves(s,{move:doMove});cpuHotseat(s,{isTurn:()=>notMine(s,turn)&&state==='play'&&!anim,think:()=>{const ms=allLegal(b,1);if(!ms.length)return;doMove(cpuBlunder(s)?pickRandom(ms):negamax(g,{b,t:1},cpuDepth(s,1,3),{deadline:Date.now()+1200}));}});}
 if(!await s.pass(0,`Gardner minichess, Star Trek style. ${s.players[0].name} plays gold (bottom) and moves first; ${s.players[1].name} plays violet. Tap a piece, then a highlighted square. Checkmate wins. 45 seconds a move.`,'Engage',{countdown:0}))return;
 state='play';
}
Object.assign(exports,{minichess,allLegal,apply,inCheck,start});
