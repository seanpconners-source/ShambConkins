// Crappy Crush board logic (pure, seeded, no drawing). The engine (src/engines/crappyCrush.js) animates what these
// functions report. A board is R x C cells inside a mask; a cell holds a piece {id,k,sp} or crap {id,crap:n} or null.
//  k   0..K-1 = which of the world's items it is (-1 for the Golden Throne colour bomb)
//  sp  0 plain, 'h' clears its row, 'v' clears its column, 'w' wrapped (blast), 'b' Golden Throne (clears a whole kind)
//  crap a pile that never matches; a match next to it or a blast over it knocks a layer off (n layers, 0 = gone)
// Move flow: trySwap(st,a,b) → {ok}; then repeat {w=resolve(st); if(!w)break; g=gravity(st)} until resolve() returns null.
const {seededRandom}=require("src/utils.js");

const DIRS=[[0,1],[1,0],[0,-1],[-1,0]];
function make({R=9,C=8,K=6,seed='cc',mask=null,crap=[]}={}){
 const st={R,C,K,mask:mask||Array(R*C).fill(1),cells:Array(R*C).fill(null),rng:seededRandom(String(seed)),nid:0,
  score:0,moves:0,collected:Array(K).fill(0),crapLeft:0,crapCleared:0,lastSwap:null,pending:null,wave:0,stats:{waves:0,specials:0,combo:0,crapHit:0}};
 for(const [i,n] of crap)if(st.mask[i])st.cells[i]={id:++st.nid,crap:Math.max(1,n|0)};
 for(let i=0;i<R*C;i++)if(st.mask[i]&&!st.cells[i])st.cells[i]=fresh(st,i,true);
 let guard=0;while(!hasMove(st)&&guard++<50)shuffle(st);
 st.crapLeft=countCrap(st);return st;
}
const idx=(st,r,c)=>r*st.C+c;
const inB=(st,r,c)=>r>=0&&c>=0&&r<st.R&&c<st.C&&!!st.mask[r*st.C+c];
const isPiece=p=>!!p&&!p.crap;
const kindOf=p=>isPiece(p)&&p.sp!=='b'?p.k:-2;
function fresh(st,i,noMatch){const r=(i/st.C)|0,c=i%st.C;let k=(st.rng()*st.K)|0;
 if(noMatch){for(let t=0;t<12;t++){const L=c>=2&&kindOf(st.cells[i-1])===k&&kindOf(st.cells[i-2])===k,U=r>=2&&kindOf(st.cells[i-st.C])===k&&kindOf(st.cells[i-2*st.C])===k;if(!L&&!U)break;k=(k+1)%st.K;}}
 return {id:++st.nid,k,sp:0};}
function countCrap(st){let n=0;for(const p of st.cells)if(p?.crap)n+=p.crap;return n;}

// ---- matching -------------------------------------------------------------------------------------------------
function runs(st){const out=[];
 for(let r=0;r<st.R;r++)for(let c=0;c<st.C;){const k=inB(st,r,c)?kindOf(st.cells[idx(st,r,c)]):-2;let e=c+1;
  if(k>=0)while(e<st.C&&inB(st,r,e)&&kindOf(st.cells[idx(st,r,e)])===k)e++;
  if(k>=0&&e-c>=3)out.push({dir:'h',k,cells:Array.from({length:e-c},(_,j)=>idx(st,r,c+j))});c=e;}
 for(let c=0;c<st.C;c++)for(let r=0;r<st.R;){const k=inB(st,r,c)?kindOf(st.cells[idx(st,r,c)]):-2;let e=r+1;
  if(k>=0)while(e<st.R&&inB(st,e,c)&&kindOf(st.cells[idx(st,e,c)])===k)e++;
  if(k>=0&&e-r>=3)out.push({dir:'v',k,cells:Array.from({length:e-r},(_,j)=>idx(st,r+j,c))});r=e;}
 return out;}
function groups(st){const rs=runs(st),G=[];
 for(const run of rs){const hit=G.filter(g=>g.k===run.k&&run.cells.some(i=>g.set.has(i)));
  let g;if(!hit.length){g={k:run.k,set:new Set(),runs:[]};G.push(g);}else{g=hit[0];for(const o of hit.slice(1)){for(const i of o.set)g.set.add(i);g.runs.push(...o.runs);G.splice(G.indexOf(o),1);}}
  for(const i of run.cells)g.set.add(i);g.runs.push(run);}
 return G;}
function hasMatchAt(st){return runs(st).length>0;}

// ---- moves ----------------------------------------------------------------------------------------------------
const adj=(st,a,b)=>{const ra=(a/st.C)|0,ca=a%st.C,rb=(b/st.C)|0,cb=b%st.C;return Math.abs(ra-rb)+Math.abs(ca-cb)===1;};
function swapCells(st,a,b){const t=st.cells[a];st.cells[a]=st.cells[b];st.cells[b]=t;}
// Would swapping a,b do anything? (a match, or a Golden Throne / two specials together)
function validSwap(st,a,b){if(!adj(st,a,b)||!st.mask[a]||!st.mask[b])return false;const A=st.cells[a],B=st.cells[b];if(!isPiece(A)||!isPiece(B))return false;
 if(A.sp==='b'||B.sp==='b')return true;if(A.sp&&B.sp)return true;swapCells(st,a,b);const ok=hasMatchAt(st);swapCells(st,a,b);return ok;}
function allMoves(st){const out=[];for(let i=0;i<st.R*st.C;i++){if(!st.mask[i])continue;const c=i%st.C;
 if(c+1<st.C&&validSwap(st,i,i+1))out.push([i,i+1]);if(i+st.C<st.R*st.C&&validSwap(st,i,i+st.C))out.push([i,i+st.C]);}return out;}
function hasMove(st){for(let i=0;i<st.R*st.C;i++){if(!st.mask[i])continue;const c=i%st.C;if(c+1<st.C&&validSwap(st,i,i+1))return true;if(i+st.C<st.R*st.C&&validSwap(st,i,i+st.C))return true;}return false;}
function shuffle(st){const spots=[],ks=[];for(let i=0;i<st.R*st.C;i++){const p=st.cells[i];if(st.mask[i]&&isPiece(p)&&!p.sp){spots.push(i);ks.push(p.k);}}
 for(let t=0;t<40;t++){for(let j=ks.length-1;j>0;j--){const m=(st.rng()*(j+1))|0;[ks[j],ks[m]]=[ks[m],ks[j]];}spots.forEach((i,j)=>st.cells[i].k=ks[j]);if(!hasMatchAt(st)&&hasMove(st))return true;}
 // still stuck: repaint plain pieces from scratch
 for(const i of spots){st.cells[i]=null;}for(const i of spots)st.cells[i]=fresh(st,i,true);return hasMove(st);}
// trySwap: performs the swap when valid. Special pairs / the Golden Throne queue their blast for resolve().
function trySwap(st,a,b){if(!validSwap(st,a,b))return {ok:false};swapCells(st,a,b);st.moves++;st.wave=0;st.lastSwap=[a,b];
 const A=st.cells[a],B=st.cells[b];// A now sits at a (it came from b)
 if(A.sp==='b'||B.sp==='b'||(A.sp&&B.sp))st.pending={a,b};return {ok:true,combo:!!st.pending};}

// ---- resolving --------------------------------------------------------------------------------------------------
// One wave: clears matches (or the queued special combo), fires specials caught in it, damages crap, makes new
// specials. Returns null when the board is stable.
function resolve(st){
 const clear=new Map();// cell -> reason
 const made=[],beams=[],blasts=[],bombs=[],crapHits=[];let points=0,combo=null;
 const wave=++st.wave,mult=Math.min(6,wave);
 const want=(i,why)=>{if(i<0||i>=st.R*st.C||!st.mask[i])return;if(!clear.has(i))clear.set(i,why);};
 if(st.pending){const {a,b}=st.pending;st.pending=null;const A=st.cells[a],B=st.cells[b],r=(a/st.C)|0,c=a%st.C;combo=comboName(A,B);st.stats.combo++;
  if(A.sp==='b'&&B.sp==='b'){for(let i=0;i<st.R*st.C;i++)want(i,'bomb');bombs.push({at:a,k:-1,all:true});points+=2000;}
  else if(A.sp==='b'||B.sp==='b'){const bomb=A.sp==='b'?a:b,other=A.sp==='b'?B:A,k=other.k;want(bomb,'bomb');bombs.push({at:bomb,k});
   const targets=[];for(let i=0;i<st.R*st.C;i++){const p=st.cells[i];if(isPiece(p)&&p.sp!=='b'&&p.k===k)targets.push(i);}
   if(other.sp){for(const i of targets){const p=st.cells[i];if(!p.sp)p.sp=other.sp==='w'?'w':(st.rng()<.5?'h':'v');}points+=1000;}
   for(const i of targets)want(i,'bomb');points+=400;}
  else{// two specials
   const s2=[A.sp,B.sp].sort().join('');for(const i of [a,b])clear.set(i,'combo');
   if(s2==='ww'){for(let dr=-3;dr<=3;dr++)for(let dc=-3;dc<=3;dc++)if(inB(st,r+dr,c+dc))want(idx(st,r+dr,c+dc),'blast');blasts.push({at:a,rad:3});points+=800;}
   else if(s2.includes('w')){for(let d=-1;d<=1;d++){if(r+d>=0&&r+d<st.R){beams.push({dir:'h',line:r+d,at:a});for(let cc=0;cc<st.C;cc++)want(idx(st,r+d,cc),'beam');}if(c+d>=0&&c+d<st.C){beams.push({dir:'v',line:c+d,at:a});for(let rr2=0;rr2<st.R;rr2++)want(idx(st,rr2,c+d),'beam');}}points+=800;}
   else{beams.push({dir:'h',line:r,at:a},{dir:'v',line:c,at:a});for(let cc=0;cc<st.C;cc++)want(idx(st,r,cc),'beam');for(let rr2=0;rr2<st.R;rr2++)want(idx(st,rr2,c),'beam');points+=500;}
   // the two used specials are spent: don't fire them again below
   st.cells[a]={...A,sp:0};st.cells[b]={...B,sp:0};}
 }
 const G=groups(st);const keep=new Map();// cell -> new special piece
 for(const g of G){
  for(const i of g.set)want(i,'match');
  const long=Math.max(...g.runs.map(r=>r.cells.length)),cross=g.runs.some(r=>r.dir==='h')&&g.runs.some(r=>r.dir==='v');
  let sp=0;if(long>=5)sp='b';else if(cross)sp='w';else if(long===4)sp=g.runs.find(r=>r.cells.length===4).dir==='h'?'v':'h';
  points+=(g.set.size*20+(sp==='b'?200:sp==='w'?120:sp?60:0))*mult;
  if(sp){let at=null;const sw=st.lastSwap&&wave===1?st.lastSwap.filter(i=>g.set.has(i)):[];
   if(sw.length)at=sw[0];else if(sp==='w'){const h=g.runs.find(r=>r.dir==='h'),v=g.runs.find(r=>r.dir==='v');at=h.cells.find(i=>v.cells.includes(i))??[...g.set][0];}
   else{const r=g.runs.reduce((m,x)=>x.cells.length>m.cells.length?x:m);at=r.cells[(r.cells.length/2)|0];}
   if(keep.has(at))at=[...g.set].find(i=>!keep.has(i))??at;
   keep.set(at,{id:++st.nid,k:sp==='b'?-1:g.k,sp,born:true});made.push({at,sp,k:g.k});st.stats.specials++;}
 }
 if(!clear.size){st.lastSwap=null;return null;}
 // chain: specials caught in the clear fire (and specials they hit fire too)
 const fired=new Set(),queue=[...clear.keys()];
 while(queue.length){const i=queue.shift();const p=st.cells[i];if(!isPiece(p)||!p.sp||fired.has(i)||keep.has(i))continue;fired.add(i);const r=(i/st.C)|0,c=i%st.C,add=j=>{if(!clear.has(j)&&st.mask[j]){clear.set(j,'chain');queue.push(j);}};
  if(p.sp==='h'){beams.push({dir:'h',line:r,at:i});for(let cc=0;cc<st.C;cc++)add(idx(st,r,cc));points+=60*st.C;}
  else if(p.sp==='v'){beams.push({dir:'v',line:c,at:i});for(let rr2=0;rr2<st.R;rr2++)add(idx(st,rr2,c));points+=60*st.R;}
  else if(p.sp==='w'){blasts.push({at:i,rad:2});for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++)if(Math.abs(dr)+Math.abs(dc)<=3&&inB(st,r+dr,c+dc))add(idx(st,r+dr,c+dc));points+=300;}
  else if(p.sp==='b'){const k=mostCommon(st);bombs.push({at:i,k});for(let j=0;j<st.R*st.C;j++){const q=st.cells[j];if(isPiece(q)&&q.k===k&&q.sp!=='b')add(j);}points+=400;}}
 // crap: knocked by matches next to it (once per wave) and by blasts/beams over it
 const crapDmg=new Map();
 for(const [i,why] of clear){const p=st.cells[i];if(p?.crap){crapDmg.set(i,(crapDmg.get(i)||0)+1);continue;}
  if(why==='match'){const r=(i/st.C)|0,c=i%st.C;for(const [dr,dc] of DIRS){if(!inB(st,r+dr,c+dc))continue;const j=idx(st,r+dr,c+dc);if(st.cells[j]?.crap&&!clear.has(j))crapDmg.set(j,1);}}}
 // remove
 const cleared=[];
 for(const [i,why] of clear){const p=st.cells[i];if(!p||p.crap)continue;if(keep.has(i)&&(why==='match'||why==='combo')){cleared.push({id:p.id,at:i,k:p.k,sp:p.sp,why,into:keep.get(i).id});st.cells[i]=keep.get(i);continue;}
  cleared.push({id:p.id,at:i,k:p.k,sp:p.sp,why});if(p.k>=0)st.collected[p.k]++;points+=20*(why==='match'?0:mult);st.cells[i]=null;}
 for(const [i,sp] of keep)if(!clear.has(i)||st.cells[i]?.id!==sp.id){if(st.cells[i]&&!st.cells[i].crap&&st.cells[i].id!==sp.id){const p=st.cells[i];cleared.push({id:p.id,at:i,k:p.k,sp:p.sp,why:'match',into:sp.id});if(p.k>=0)st.collected[p.k]++;}if(!st.cells[i]?.crap)st.cells[i]=sp;}
 for(const [i,n] of crapDmg){const p=st.cells[i];if(!p?.crap)continue;const hit=Math.min(p.crap,n);p.crap-=hit;st.crapCleared+=hit;st.stats.crapHit++;points+=30*mult;crapHits.push({at:i,id:p.id,left:p.crap});if(p.crap<=0)st.cells[i]=null;}
 st.crapLeft=countCrap(st);st.score+=points;st.stats.waves=Math.max(st.stats.waves,wave);st.lastSwap=null;
 for(const p of st.cells)if(p&&p.born)delete p.born;
 return {wave,points,cleared,made,beams,blasts,bombs,crapHits,combo};
}
function comboName(A,B){if(A.sp==='b'&&B.sp==='b')return 'THRONE ROOM';if(A.sp==='b'||B.sp==='b')return (A.sp&&B.sp)?'FLUSH STORM':'FLUSHED';const s=[A.sp,B.sp].sort().join('');return s==='ww'?'MEGA BLAST':s.includes('w')?'CROSSFIRE':'CROSS BEAM';}
function mostCommon(st){const n=Array(st.K).fill(0);for(const p of st.cells)if(isPiece(p)&&p.k>=0&&p.sp!=='b')n[p.k]++;let best=0;for(let k=1;k<st.K;k++)if(n[k]>n[best])best=k;return best;}

// Gravity: everything (pieces and crap) falls down its column through holes in the mask, then new pieces drop in.
function gravity(st){const falls=[],spawns=[];
 for(let c=0;c<st.C;c++){const col=[];for(let r=st.R-1;r>=0;r--)if(st.mask[idx(st,r,c)])col.push(idx(st,r,c));// bottom → top
  let w=0;const stack=[];for(const i of col)if(st.cells[i])stack.push(i);
  for(const from of stack){const to=col[w++];if(from!==to){st.cells[to]=st.cells[from];st.cells[from]=null;falls.push({id:st.cells[to].id,from,to});}}
  let n=0;for(;w<col.length;w++){const to=col[w];st.cells[to]=fresh(st,to,false);spawns.push({id:st.cells[to].id,to,order:n++});}}
 return {falls,spawns};}

// Dump crap onto the board (Tetris-style attack / stage hazard): plain pieces, upper rows first. Returns the cells hit.
function dropCrap(st,n,{layers=1,maxShare=.4}={}){const out=[];let have=0;for(const p of st.cells)if(p?.crap)have++;
 const cap=Math.floor(st.mask.filter(Boolean).length*maxShare);
 const cand=[];for(let i=0;i<st.R*st.C;i++){const p=st.cells[i];if(st.mask[i]&&isPiece(p)&&!p.sp)cand.push(i);}
 cand.sort((a,b)=>((a/st.C)|0)-((b/st.C)|0)+(st.rng()-.5)*6);
 for(const i of cand){if(out.length>=n||have>=cap)break;const old=st.cells[i];st.cells[i]={id:++st.nid,crap:layers};out.push({at:i,id:st.cells[i].id,was:old.id});have++;}
 st.crapLeft=countCrap(st);return out;}

// Best move for hints / the CPU: try each valid swap on a copy and score the first wave (+ specials made).
function clone(st){return {...st,mask:st.mask,cells:st.cells.map(p=>p&&{...p}),collected:[...st.collected],stats:{...st.stats},rng:()=>.5,pending:null};}
function rateMoves(st,{goalKinds=null,crapFocus=false}={}){const out=[];for(const [a,b] of allMoves(st)){const t=clone(st);trySwap(t,a,b);const w=resolve(t);if(!w)continue;
 let v=w.points+w.made.length*250+w.crapHits.length*(crapFocus?400:120);if(goalKinds)v+=w.cleared.filter(c=>goalKinds.includes(c.k)).length*60;
 // lower on the board makes more cascades
 v+=((a/st.C)|0)*6;out.push({a,b,v});}
 return out.sort((x,y)=>y.v-x.v);}
function hint(st){const m=allMoves(st);if(!m.length)return null;const r=rateMoves(st);return r[0]?[r[0].a,r[0].b]:m[0];}

// Finale ("Crappy Crush!"): when a stage goal is met, each move left turns a random plain piece into a striped one.
function finaleStripes(st,n){const cand=[];for(let i=0;i<st.R*st.C;i++){const p=st.cells[i];if(isPiece(p)&&!p.sp)cand.push(i);}
 const out=[];for(let j=0;j<n&&cand.length;j++){const i=cand.splice((st.rng()*cand.length)|0,1)[0];st.cells[i].sp=st.rng()<.5?'h':'v';out.push(i);}return out;}
// Finale: fire every special still on the board at once (call resolveForced next, then gravity, then resolve as usual).
function fireAllSpecials(st){const marks=[];for(let i=0;i<st.R*st.C;i++){const p=st.cells[i];if(isPiece(p)&&p.sp)marks.push(i);}
 if(!marks.length)return null;st._seed=new Map(marks.map(i=>[i,'chain']));return marks;}
function resolveForced(st){return st._seed?baseResolveSeeded(st):resolve(st);}
function baseResolveSeeded(st){const seed=st._seed;st._seed=null;
 const clear=new Map(seed),beams=[],blasts=[],bombs=[],cleared=[],crapHits=[];let points=0;const wave=++st.wave,mult=Math.min(6,wave);
 const fired=new Set(),queue=[...clear.keys()];
 while(queue.length){const i=queue.shift();const p=st.cells[i];if(!isPiece(p)||!p.sp||fired.has(i))continue;fired.add(i);const r=(i/st.C)|0,c=i%st.C,add=j=>{if(!clear.has(j)&&st.mask[j]){clear.set(j,'chain');queue.push(j);}};
  if(p.sp==='h'){beams.push({dir:'h',line:r,at:i});for(let cc=0;cc<st.C;cc++)add(idx(st,r,cc));points+=60*st.C;}
  else if(p.sp==='v'){beams.push({dir:'v',line:c,at:i});for(let rr2=0;rr2<st.R;rr2++)add(idx(st,rr2,c));points+=60*st.R;}
  else if(p.sp==='w'){blasts.push({at:i,rad:2});for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++)if(Math.abs(dr)+Math.abs(dc)<=3&&inB(st,r+dr,c+dc))add(idx(st,r+dr,c+dc));points+=300;}
  else if(p.sp==='b'){const k=mostCommon(st);bombs.push({at:i,k});for(let j=0;j<st.R*st.C;j++){const q=st.cells[j];if(isPiece(q)&&q.k===k&&q.sp!=='b')add(j);}points+=400;}}
 for(const [i] of clear){const p=st.cells[i];if(!p)continue;if(p.crap){p.crap--;st.crapCleared++;crapHits.push({at:i,id:p.id,left:p.crap});points+=30;if(p.crap<=0)st.cells[i]=null;continue;}
  cleared.push({id:p.id,at:i,k:p.k,sp:p.sp,why:'chain'});if(p.k>=0)st.collected[p.k]++;points+=20*mult;st.cells[i]=null;}
 st.crapLeft=countCrap(st);st.score+=points;return {wave,points,cleared,made:[],beams,blasts,bombs,crapHits,combo:null};}

Object.assign(exports,{make,trySwap,validSwap,resolve,resolveForced,gravity,hasMove,allMoves,shuffle,dropCrap,rateMoves,hint,finaleStripes,fireAllSpecials,clone,idx,isPiece,countCrap});
// Stage goals (src/data/crappyCrushWorlds.js stage()). goalDone: the stage's goal is met now.
function stageBoard(stg,seed){return make({R:stg.R,C:stg.C,K:stg.K,seed,mask:stg.mask,crap:stg.crap});}
function goalDone(st,stg){const col=stg.collect.every(([k,n])=>st.collected[k]>=n),crap=st.crapCleared>=stg.crapGoal;
 return stg.kind==='score'?st.score>=stg.target:stg.kind==='collect'?col:stg.kind==='crap'?crap:col&&crap;}
function stars(st,stg){return goalDone(st,stg)?(st.score>=stg.s3?3:st.score>=stg.s2?2:1):0;}
Object.assign(exports,{stageBoard,goalDone,stars});
