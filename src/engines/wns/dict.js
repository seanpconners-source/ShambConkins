// WORDS N' SHIT dictionary + move finder. The word list is ENABLE (public domain) minus slurs, packed as a DAWG by
// tools/wns/build-dict.mjs into assets/wordsnshit/dict.bin.gz ('wns:dict'). Edges are Uint32: bits 0-4 letter (a=0),
// bit 5 a word ends here, bit 6 last edge of its node, bits 7+ the child node's first edge (0 = none).
const R=require("src/engines/wns/rules.js");
const ALL=(1<<26)-1;
function makeDict(u8){
 if(String.fromCharCode(...u8.subarray(0,5))!=='WNSD1')throw new Error('Bad Words n\' Shit dictionary');
 const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength),n=dv.getUint32(5,true),root=dv.getUint32(9,true),count=dv.getUint32(13,true);
 const E=new Uint32Array(n);for(let i=0;i<n;i++)E[i]=dv.getUint32(17+i*4,true);
 // the edge for letter l (0-25) out of node, or -1
 const edge=(node,l)=>{if(!node)return -1;for(let e=node;;e++){const v=E[e];if((v&31)===l)return e;if(v&64)return -1;}};
 function has(w){let node=root;for(let i=0;i<w.length;i++){const e=edge(node,w.charCodeAt(i)-97);if(e<0)return false;if(i===w.length-1)return !!(E[e]&32);node=E[e]>>>7;}return false;}
 return {E,root,count,edge,has};}
let loading=null;
async function gunzip(u8){
 if(typeof DecompressionStream!=='undefined'){try{const st=new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));return new Uint8Array(await new Response(st).arrayBuffer());}catch{}}
 return require("src/engines/doom/wad.js").gunzip(u8);}
// the app's copy (fetched the first time the game opens)
function loadDict(){return loading||=(async()=>{const {USER_PORTRAITS,assetBytes}=require("src/data/userPortraits.js");const url=USER_PORTRAITS['wns:dict'];if(!url)throw new Error('The dictionary is missing from this build');
 return makeDict(await gunzip(await assetBytes(url)));})().catch(e=>{loading=null;throw e;});}

// ---- the move finder (Appel & Jacobson): every legal play for a rack, scored with the real rules.
// rack = letters ('?' = blank). Returns [{play,score,words}] (not sorted). opts.limitMs stops a very long search (two blanks).
function findMoves(D,board,rack,opts={}){
 const N=R.N,t0=Date.now(),limit=opts.limitMs||2500,moves=[],seen=new Set();let stop=false;
 const counts=new Array(27).fill(0);for(const t of rack){if(t==='?')counts[26]++;else counts[t.charCodeAt(0)-97]++;}
 const first=R.isEmpty(board);
 for(const across of [true,false]){
  // view the board so the word always runs left to right along a "row"
  const get=(r,c)=>across?board[r][c]:board[c][r];
  for(let row=0;row<N&&!stop;row++){
   // cross checks: letters allowed in each empty square so the word across it (in the other direction) is real
   const cross=new Array(N).fill(ALL);
   for(let c=0;c<N;c++){if(get(row,c))continue;const up=[],down=[];for(let r=row-1;r>=0&&get(r,c);r--)up.unshift(get(r,c).ch);for(let r=row+1;r<N&&get(r,c);r++)down.push(get(r,c).ch);
    if(!up.length&&!down.length)continue;let m=0;const pre=up.join(''),post=down.join('');for(let l=0;l<26;l++)if(D.has(pre+String.fromCharCode(97+l)+post))m|=1<<l;cross[c]=m;}
   // anchors: empty squares next to a tile (or the star on the first move)
   const anchor=c=>!get(row,c)&&(first?(row===R.CENTER&&c===R.CENTER):(row>0&&get(row-1,c))||(row<N-1&&get(row+1,c))||(c>0&&get(row,c-1))||(c<N-1&&get(row,c+1)));
   const placed=[];// [col,ch,blank]
   const record=()=>{const play=placed.map(([c,ch,bl])=>across?{r:row,c,ch,blank:bl}:{r:c,c:row,ch,blank:bl});
    const k=play.map(p=>p.r*N+p.c+(p.blank?'*':'')+p.ch).sort().join(',');if(seen.has(k))return;seen.add(k);
    const ev=R.evaluate(board,play);if(ev.ok&&ev.words.every(w=>D.has(w.word)))moves.push({play,score:ev.score,words:ev.words.map(w=>w.word),bingo:ev.bingo});};
   const extend=(node,c,fin,anchorCol)=>{if(stop)return;if((moves.length&255)===0&&Date.now()-t0>limit){stop=true;return;}
    if(c>=N||!get(row,c)){if(fin&&c>anchorCol&&placed.length)record();if(c>=N)return;
     const m=cross[c];for(let e=node;e&&!stop;e++){const v=D.E[e],l=v&31;
      if(m&(1<<l)){if(counts[l]){counts[l]--;placed.push([c,String.fromCharCode(97+l),false]);extend(v>>>7,c+1,v&32,anchorCol);placed.pop();counts[l]++;}
       if(counts[26]){counts[26]--;placed.push([c,String.fromCharCode(97+l),true]);extend(v>>>7,c+1,v&32,anchorCol);placed.pop();counts[26]++;}}
      if(v&64)break;}}
    else{const e=D.edge(node,get(row,c).ch.charCodeAt(0)-97);if(e>=0)extend(D.E[e]>>>7,c+1,D.E[e]&32,anchorCol);}};
   // left part: letters from the rack on empty squares before the anchor (not past another anchor)
   const left=(node,c0,lim,anchorCol)=>{extend(node,anchorCol,false,anchorCol);if(lim<=0||stop)return;
    for(let e=node;e;e++){const v=D.E[e],l=v&31,col=anchorCol-placed.length-1;
     // left-part letters need no cross check: the squares are not anchors, so nothing is above or below them
     if(counts[l]){counts[l]--;placed.unshift([col,String.fromCharCode(97+l),false]);left(v>>>7,c0,lim-1,anchorCol);placed.shift();counts[l]++;}
     if(counts[26]){counts[26]--;placed.unshift([col,String.fromCharCode(97+l),true]);left(v>>>7,c0,lim-1,anchorCol);placed.shift();counts[26]++;}
     if(v&64||stop)break;}};
   for(let c=0;c<N&&!stop;c++){if(!anchor(c))continue;
    if(c>0&&get(row,c-1)){// tiles already left of the anchor are the start of the word
     let s=c-1;while(s>0&&get(row,s-1))s--;let node=D.root,ok=true;for(let k=s;k<c;k++){const e=D.edge(node,get(row,k).ch.charCodeAt(0)-97);if(e<0){ok=false;break;}node=D.E[e]>>>7;}
     if(ok&&node)extend(node,c,false,c);}
    else{let lim=0;for(let k=c-1;k>=0&&!get(row,k)&&!anchor(k);k--)lim++;left(D.root,c,lim,c);}}}}
 return moves;}
Object.assign(exports,{makeDict,loadDict,findMoves});
