// Doom WAD access for the Doom minigame. Sources, best first:
//  1. the owner's own IWAD picked on the phone (Options > Use my own WAD), kept in IndexedDB (never in the HTML),
//  2. the owner's own IWAD dropped into assets/doom/user/ before building (git-ignored),
//  3. Freedoom (BSD licence), embedded from assets/doom/freedoom.pack.gz (tools/doom-pack.mjs).
// Doom ('doom1') uses an IWAD with E1M1 (Ultimate > registered > shareware), Doom II ('doom2') one with MAP01.
const {USER_PORTRAITS}=require("src/data/userPortraits.js");

class Wad{
 constructor(bytes,dir,label,source){this.bytes=bytes;this.dir=dir;this.label=label;this.source=source;this.index=new Map();
  dir.forEach((l,i)=>this.index.set(l.name,i));// last one wins, like W_GetNumForName
  this.kind=this.has('MAP01')?'doom2':this.has('E1M1')?'doom1':null;
  this.mode=this.kind==='doom2'?'commercial':this.has('E4M1')?'retail':this.has('E3M1')?'registered':'shareware';
  this.freedoom=source==='freedoom';}
 has(name){return this.index.has(name);}
 num(name){const i=this.index.get(name);return i===undefined?-1:i;}
 lumpAt(i){const l=this.dir[i];return l?this.bytes.subarray(l.off,l.off+l.size):null;}
 lump(name){const i=this.num(name);return i<0?null:this.lumpAt(i);}
 // lumps between NAME_START/NAME_END markers (S_, F_ also accept SS_/FF_ and nested F1_ blocks)
 between(a,b){const out=[];let on=false;for(const l of this.dir){if(l.name===a||l.name===a[0]+a){on=true;continue;}if(l.name===b||l.name===b[0]+b){on=false;continue;}if(on&&l.size>0&&!/^[FPS]\d_(START|END)$/.test(l.name))out.push(l);}return out;}
 view(l){return new DataView(this.bytes.buffer,this.bytes.byteOffset+l.off,l.size);}
}
const name8=(u8,p)=>{let s='';for(let i=0;i<8;i++){const c=u8[p+i];if(!c)break;s+=String.fromCharCode(c);}return s.toUpperCase();};
function parseWad(bytes,label,source){
 const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),id=String.fromCharCode(...bytes.subarray(0,4));
 if(id!=='IWAD'&&id!=='PWAD')throw new Error('Not a WAD file');
 const n=dv.getInt32(4,true),at=dv.getInt32(8,true),dir=[];
 if(n<0||at<0||at+n*16>bytes.length)throw new Error('Broken WAD directory');
 for(let i=0;i<n;i++){const p=at+i*16;dir.push({off:dv.getInt32(p,true),size:dv.getInt32(p+4,true),name:name8(bytes,p+8)});}
 const w=new Wad(bytes,dir,label,source);w.iwad=id==='IWAD';return w;}

// ---- gzip ----
function b64bytes(url){const s=atob(url.slice(url.indexOf(',')+1)),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
async function gunzip(u8){
 if(typeof DecompressionStream!=='undefined'){try{const st=new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));return new Uint8Array(await new Response(st).arrayBuffer());}catch{}}
 let p=10;const flg=u8[3];if(flg&4)p+=2+(u8[10]|u8[11]<<8);if(flg&8){while(u8[p++]);}if(flg&16){while(u8[p++]);}if(flg&2)p+=2;
 const size=(u8[u8.length-4]|u8[u8.length-3]<<8|u8[u8.length-2]<<16|u8[u8.length-1]<<24)>>>0;return inflate(u8.subarray(p),new Uint8Array(size));}
// small raw-DEFLATE decoder (fallback for browsers without DecompressionStream)
function inflate(src,out){
 let pos=0,bit=0,cnt=0,o=0;
 const bits=n=>{while(cnt<n){bit|=src[pos++]<<cnt;cnt+=8;}const v=bit&((1<<n)-1);bit>>>=n;cnt-=n;return v;};
 const build=(lens,n)=>{const counts=new Uint16Array(16),offs=new Uint16Array(16),sym=new Uint16Array(n);for(let i=0;i<n;i++)counts[lens[i]]++;counts[0]=0;for(let i=1;i<16;i++)offs[i]=offs[i-1]+counts[i-1];for(let i=0;i<n;i++)if(lens[i])sym[offs[lens[i]]++]=i;return {counts,sym};};
 const decode=t=>{let code=0,first=0,index=0;for(let len=1;len<16;len++){code|=bits(1);const c=t.counts[len];if(code-c<first)return t.sym[index+(code-first)];index+=c;first+=c;first<<=1;code<<=1;}throw new Error('bad code');};
 const LB=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258],LE=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
 const DB=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],DE=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
 let fl,fd;{const l=new Uint8Array(288);l.fill(8,0,144);l.fill(9,144,256);l.fill(7,256,280);l.fill(8,280,288);fl=build(l,288);const d=new Uint8Array(30).fill(5);fd=build(d,30);}
 let last=0;
 while(!last){last=bits(1);const type=bits(2);
  if(type===0){bit=0;cnt=0;const len=src[pos]|src[pos+1]<<8;pos+=4;out.set(src.subarray(pos,pos+len),o);pos+=len;o+=len;continue;}
  let lt=fl,dt=fd;
  if(type===2){const hl=bits(5)+257,hd=bits(5)+1,hc=bits(4)+4,ORD=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],cl=new Uint8Array(19);
   for(let i=0;i<hc;i++)cl[ORD[i]]=bits(3);const ct=build(cl,19),lens=new Uint8Array(hl+hd);
   for(let i=0;i<hl+hd;){const s=decode(ct);if(s<16)lens[i++]=s;else if(s===16){const r=3+bits(2),v=lens[i-1];for(let k=0;k<r;k++)lens[i++]=v;}else if(s===17){i+=3+bits(3);}else i+=11+bits(7);}
   lt=build(lens.subarray(0,hl),hl);dt=build(lens.subarray(hl),hd);}
  for(;;){const s=decode(lt);if(s<256)out[o++]=s;else if(s===256)break;else{const li=s-257,len=LB[li]+bits(LE[li]),di=decode(dt),d=DB[di]+bits(DE[di]);for(let k=0;k<len;k++,o++)out[o]=out[o-d];}}
 }
 return out;}

// ---- Freedoom pack ----
let packPromise=null;
function loadPack(){
 return packPromise||=(async()=>{const url=USER_PORTRAITS['doom:pack:freedoom'];if(!url)return {};
  const u8=await gunzip(b64bytes(url)),dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
  if(String.fromCharCode(...u8.subarray(0,7))!=='SCDPAK1')throw new Error('Bad Doom pack');
  const jl=dv.getUint32(8,true),meta=JSON.parse(new TextDecoder().decode(u8.subarray(12,12+jl))),data=u8.subarray(12+jl),out={};
  for(const [name,w] of Object.entries(meta.wads)){const wad=new Wad(data,w.lumps.map(([n,off,size])=>({name:n,off,size})),name==='freedoom1'?'Freedoom: Phase 1':'Freedoom: Phase 2','freedoom');wad.iwad=true;out[name]=wad;}
  return out;})();}

// ---- the owner's own WADs ----
const DB='shambconkins-doom',STORE='wads';
function idb(){return new Promise((res,rej)=>{try{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});}
async function storedWads(){try{const db=await idb();return await new Promise(res=>{const out=[],tx=db.transaction(STORE,'readonly'),cur=tx.objectStore(STORE).openCursor();cur.onsuccess=()=>{const c=cur.result;if(c){out.push({key:c.key,...c.value});c.continue();}else res(out);};cur.onerror=()=>res(out);});}catch{return [];}}
async function storeWad(file){
 const bytes=new Uint8Array(await file.arrayBuffer()),w=parseWad(bytes,file.name,'phone');
 if(!w.iwad||!w.kind)throw new Error('That file is not a Doom or Doom II IWAD.');
 const db=await idb();await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({name:file.name,bytes:bytes.buffer},w.kind);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
 cache.delete(w.kind);return w;}
async function forgetWad(kind){try{const db=await idb();await new Promise(res=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(kind);tx.oncomplete=res;tx.onerror=res;});}catch{}cache.delete(kind);}
const RANK={retail:3,registered:2,shareware:1,commercial:2};
const cache=new Map();
// The best WAD for 'doom1' / 'doom2'. opts.freedoom forces the bundled Freedoom one.
function loadWad(kind,opts={}){
 const key=kind+(opts.freedoom?':fd':'');if(cache.has(key))return cache.get(key);
 const p=(async()=>{
  if(!opts.freedoom){
   for(const st of await storedWads())if(st.key===kind){try{const w=parseWad(new Uint8Array(st.bytes),st.name,'phone');if(w.kind===kind)return w;}catch{}}
   let best=null;
   for(const [k,url] of Object.entries(USER_PORTRAITS)){if(!k.startsWith('doom:wad:'))continue;
    try{const w=parseWad(await gunzip(b64bytes(url)),k.slice(9).toUpperCase()+'.WAD','build');if(w.iwad&&w.kind===kind&&(!best||RANK[w.mode]>RANK[best.mode]||kind==='doom2'&&/DOOM2/.test(w.label)))best=w;}catch{}}
   if(best)return best;}
  const pack=await loadPack(),w=pack[kind==='doom2'?'freedoom2':'freedoom1'];if(!w)throw new Error('No Doom data in this build.');return w;})();
 cache.set(key,p);p.catch(()=>cache.delete(key));return p;}

Object.assign(exports,{Wad,parseWad,loadWad,loadPack,storeWad,forgetWad,storedWads,gunzip,inflate,name8});
