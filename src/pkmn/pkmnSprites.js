// Character portraits turned into first-generation Pokémon sprites: background
// removed, contrast stretched, Bayer-dithered to 4 shades with a black outline.
// Front sprites are 56x56; back sprites are 28x28 drawn at 2x (the blocky Gen 1 look).
// Sprites are stored as shade indices (0 transparent, 1 white … 4 black) and coloured by
// a palette at draw time, so the same art works in Game Boy Color and DMG-green modes.
const {portraitURL,portraitFallbackURL,portraitMoods}=require("src/assets.js");
const {character}=require("src/characters.js");
const {entityArtSpec,cachedEntityURL,queueEntityArt}=require("src/entityMedia.js");
const {headDisplayURL}=require("src/headCutouts.js");
const {speciesFor}=require("src/pkmn/pkmnData.js");

// ---------------------------------------------------------------- palettes
const DMG=['#e0f0c0','#9bbc0f','#4f7a28','#0f380f'];
const TYPE_TINT={NORMAL:['#f0d0a8','#a87048'],FIRE:['#f8b858','#d03818'],WATER:['#98c8f8','#3060c0'],ELECTRIC:['#f8e058','#b88800'],GRASS:['#b0e080','#389038'],ICE:['#b8f0f8','#4898c0'],
 FIGHTING:['#f0b090','#a84830'],POISON:['#d8a8f0','#8040a8'],GROUND:['#e0c080','#906030'],FLYING:['#c0d8f8','#6878c8'],PSYCHIC:['#f8b0d0','#c04880'],BUG:['#c8e070','#688020'],
 ROCK:['#d0c8b0','#7a7058'],GHOST:['#c8b0e8','#584088'],DRAGON:['#b0c0f8','#4850b8']};
let mode='color';
function setPaletteMode(m){mode=m==='dmg'?'dmg':'color';}
function paletteMode(){return mode;}
// [transparent, white, light, dark, black]
function pal(name){
 if(mode==='dmg')return [null,DMG[0],DMG[1],DMG[2],DMG[3]];
 if(name==='ui')return [null,'#f8f8f8','#a8a8a8','#585858','#181818'];
 if(name==='trainer')return [null,'#f8f8f8','#f0b890','#a05838','#181818'];
 if(name==='ball')return [null,'#f8f8f8','#e83828','#a0a0a0','#181818'];
 if(name==='overworld')return [null,'#f8f8f8','#a8d880','#507840','#181818'];
 const t=TYPE_TINT[name]||TYPE_TINT.NORMAL;return [null,'#f8f8f8',t[0],t[1],'#181818'];
}
const color=(name,i)=>pal(name)[i];

// ---------------------------------------------------------------- pixel art
// '.' transparent, '0' white, '1' light, '2' dark, '3' black.
function bitmap(rows){const r=rows.trim().split('\n').map(s=>s.trim()),w=r[0].length,h=r.length,data=new Uint8Array(w*h);r.forEach((row,y)=>{for(let x=0;x<w;x++){const ch=row[x];data[y*w+x]=ch==='.'||ch===undefined?0:1+(+ch);}});return {w,h,data};}
const ART={
 ball:bitmap(`
..3333..
.311113.
31111113
33300333
30033003
30000003
.300003.
..3333..`),
 ballOpen:bitmap(`
.33..33.
3113311.
31111113
.333333.
30033003
30000003
.300003.
..3333..`),
 // party/status ball icons for the trainer-intro bars
 partyBall:bitmap(`
..333..
.31113.
3311133
3330333
3000003
.30003.
..333..`),
 partyEmpty:bitmap(`
..333..
.3...3.
3.....3
3.....3
3.....3
.3...3.
..333..`),
 partyFaint:bitmap(`
..333..
.32223.
3322233
3332333
3222223
.32223.
..333..`),
 bang:bitmap(`
.333333.
30000003
30033003
30033003
30033003
30000003
30033003
30000003
.333333.
...33...`)
};

// ---------------------------------------------------------------- portraits
const imageCache=new Map(),spriteCache=new Map(),canvasCache=new Map();
function loadImage(src,cors){return new Promise(resolve=>{if(!src)return resolve(null);const im=new Image();if(cors)im.crossOrigin='anonymous';const t=setTimeout(()=>{im.onload=im.onerror=null;resolve(null);},4000);im.onload=()=>{clearTimeout(t);resolve(im.naturalWidth?im:null);};im.onerror=()=>{clearTimeout(t);resolve(null);};im.src=src;});}
async function portraitImage(id,mood='normal'){
 const ikey=id+':'+mood;if(imageCache.has(ikey))return imageCache.get(ikey);
 const job=(async()=>{
  try{queueEntityArt(entityArtSpec('character',character(id)));}catch{}
  let src=portraitURL(id,mood);
  if(!src){for(let i=0;i<10&&!src;i++){await new Promise(r=>setTimeout(r,150));src=cachedEntityURL('character',id);}}
  if(src){const display=headDisplayURL(src),img=await loadImage(display,/^https?:/.test(display));if(img&&readable(img))return img;}
  return null;
 })();
 imageCache.set(ikey,job);return job;
}
function readable(img){try{const c=document.createElement('canvas');c.width=c.height=2;const x=c.getContext('2d');x.drawImage(img,0,0,2,2);x.getImageData(0,0,1,1);return true;}catch{return false;}}
// Emoji stand-in (drawn on our own canvas so it can be read back).
function emojiCanvas(id,size){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');const ch=character(id);x.textAlign='center';x.textBaseline='middle';x.font=`${Math.round(size*.78)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;x.fillText(ch.icon||'?',size/2,size/2+size*.04);return c;}

const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
// Converts any drawable into shade indices at size x size.
function dither(source,size,opts={}){
 const S=size*2,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d',{willReadFrequently:true});
 const w=source.naturalWidth||source.width,h=source.naturalHeight||source.height,scale=Math.min(S/w,S/h)*(opts.zoom||1);
 x.imageSmoothingQuality='high';x.drawImage(source,(S-w*scale)/2,(S-h*scale)/2+(opts.drop||0)*S,w*scale,h*scale);
 const img=x.getImageData(0,0,S,S).data;
 // Opaque photo? Flood-fill the backdrop from the border.
 let opaqueBorder=0,border=0;for(let i=0;i<S;i++)for(const [px,py] of [[i,0],[i,S-1],[0,i],[S-1,i]]){border++;if(img[(py*S+px)*4+3]>200)opaqueBorder++;}
 if(opaqueBorder>border*.6){
  const seen=new Uint8Array(S*S),stack=[];
  const push=(px,py,ref)=>{if(px<0||py<0||px>=S||py>=S)return;const n=py*S+px;if(seen[n])return;const p=n*4,d=Math.abs(img[p]-ref[0])+Math.abs(img[p+1]-ref[1])+Math.abs(img[p+2]-ref[2]);if(d>78)return;seen[n]=1;stack.push([px,py,ref]);};
  for(let i=0;i<S;i+=3)for(const [px,py] of [[i,0],[i,S-1],[0,i],[S-1,i]]){const p=(py*S+px)*4;push(px,py,[img[p],img[p+1],img[p+2]]);}
  while(stack.length){const [px,py,ref]=stack.pop();img[(py*S+px)*4+3]=0;push(px+1,py,ref);push(px-1,py,ref);push(px,py+1,ref);push(px,py-1,ref);}

 }
 // Busy backdrop nothing cleared (a full rectangular photo): crop to a head oval inside the photo instead of a box.
 {const x0=Math.max(0,Math.round((S-w*scale)/2)),y0=Math.max(0,Math.round((S-h*scale)/2+(opts.drop||0)*S)),x1=Math.min(S-1,Math.round((S+w*scale)/2)-1),y1=Math.min(S-1,Math.round((S+h*scale)/2+(opts.drop||0)*S)-1);
  let edge=0,solid=0;for(let px=x0;px<=x1;px+=2)for(const py of [y0,y1]){edge++;if(img[(py*S+px)*4+3]>200)solid++;}for(let py=y0;py<=y1;py+=2)for(const px of [x0,x1]){edge++;if(img[(py*S+px)*4+3]>200)solid++;}
  if(edge&&solid>edge*.6){const cx=(x0+x1)/2,cy=(y0+y1)/2,rx=(x1-x0)/2*.94,ry=(y1-y0)/2*.97;for(let py=0;py<S;py++)for(let px=0;px<S;px++)if(((px-cx)/rx)**2+((py-cy)/ry)**2>1)img[(py*S+px)*4+3]=0;}}
 // 2x2 box down-sample, alpha-weighted luminance.
 const L=new Float32Array(size*size),A=new Float32Array(size*size);
 for(let y=0;y<size;y++)for(let xx=0;xx<size;xx++){let a=0,l=0;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const p=((y*2+dy)*S+xx*2+dx)*4,al=img[p+3]/255;a+=al;l+=al*(img[p]*.3+img[p+1]*.59+img[p+2]*.11);}A[y*size+xx]=a/4;L[y*size+xx]=a?l/a/255:1;}
 // Unsharp mask + percentile contrast stretch over the opaque pixels.
 const blur=new Float32Array(size*size);for(let y=0;y<size;y++)for(let xx=0;xx<size;xx++){let s=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,x2=xx+dx;if(yy<0||x2<0||yy>=size||x2>=size)continue;s+=L[yy*size+x2];n++;}blur[y*size+xx]=s/n;}
 const vals=[];for(let i=0;i<L.length;i++){L[i]=L[i]+.7*(L[i]-blur[i]);if(A[i]>.5)vals.push(L[i]);}
 vals.sort((a,b)=>a-b);const lo=vals[Math.floor(vals.length*.06)]??0,hi=vals[Math.floor(vals.length*.96)]??1,span=Math.max(.15,hi-lo);
 const out=new Uint8Array(size*size);
 for(let y=0;y<size;y++)for(let xx=0;xx<size;xx++){const i=y*size+xx;if(A[i]<=.5)continue;const v=Math.max(0,Math.min(1,(L[i]-lo)/span)),dark=1-v,level=Math.max(0,Math.min(3,Math.floor(dark*3.2+(BAYER[(y&3)*4+(xx&3)]-.5)*.95+.15)));out[i]=1+level;}
 // Outline: opaque pixels touching transparency turn black; lone specks vanish.
 const res=new Uint8Array(out);
 for(let y=0;y<size;y++)for(let xx=0;xx<size;xx++){const i=y*size+xx;if(!out[i])continue;let open=0,solid=0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const yy=y+dy,x2=xx+dx;if(yy<0||x2<0||yy>=size||x2>=size||!out[yy*size+x2])open++;else solid++;}if(solid===0)res[i]=0;else if(open)res[i]=4;}
 return {w:size,h:size,data:res};
}
// Front (56) and back (28, drawn doubled) sprites, cached per character and mood (moods only from the owner's own art).
const owner=new WeakMap();
async function characterSprite(id,kind='front',mood='normal'){
 const key=id+':'+kind+(mood==='normal'?'':':'+mood);if(spriteCache.has(key))return spriteCache.get(key);
 const job=(async()=>{const size=kind==='back'?28:kind==='icon'?16:56;const img=await portraitImage(id,mood);let sp;
  if(mood!=='normal'&&!img)return null;
  try{sp=dither(img||emojiCanvas(id,160),size,{zoom:img?1:.9});}catch{sp=null;}
  if(!sp||sp.data.every(v=>!v))sp=dither(emojiCanvas(id,160),size,{zoom:.9});
  if(kind==='back'){const d=new Uint8Array(sp.data.length);for(let y=0;y<size;y++)for(let x=0;x<size;x++)d[y*size+x]=sp.data[y*size+(size-1-x)];sp={...sp,data:d};}
  owner.set(sp,id);return sp;})();
 spriteCache.set(key,job);return job;
}
// Resolve and remember, so drawing code can stay synchronous.
const resolved=new Map();
// Mood variants of front/back sprites load in the background; drawing falls back to the normal sprite until they land.
async function prepareSprites(list){
 for(const [id,kind] of list)if(kind!=='icon')for(const mood of portraitMoods(id)){const k=id+':'+kind+':'+mood;if(!resolved.has(k))characterSprite(id,kind,mood).then(s=>{if(s)resolved.set(k,s);},()=>{});}
 await Promise.all(list.map(async([id,kind])=>{const s=await characterSprite(id,kind);resolved.set(id+':'+kind,s);}));
}
function spriteOf(id,kind,mood){return mood&&mood!=='normal'&&resolved.get(id+':'+kind+':'+mood)||resolved.get(id+':'+kind)||null;}
// The mood face of an on-screen sprite, or the sprite itself when that character has no picture for the mood.
function moodSprite(sp,mood){if(!sp||!mood||mood==='normal')return sp;const id=owner.get(sp);if(!id)return sp;const kind=sp.w===28?'back':sp.w===16?'icon':'front';return resolved.get(id+':'+kind+':'+mood)||sp;}
// Paint shade indices into a cached canvas for a palette.
function paint(sp,palName,silhouette=false){
 if(!sp)return null;const key=sp.data.length+':'+palName+':'+mode+':'+(silhouette?1:0);let per=canvasCache.get(sp);if(!per){per=new Map();canvasCache.set(sp,per);}if(per.has(key))return per.get(key);
 const c=document.createElement('canvas');c.width=sp.w;c.height=sp.h;const x=c.getContext('2d'),id=x.createImageData(sp.w,sp.h),colors=pal(palName).map(h=>h&&[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
 for(let i=0;i<sp.data.length;i++){const v=sp.data[i];if(!v)continue;const col=colors[silhouette?4:v];id.data.set([...col,255],i*4);}
 x.putImageData(id,0,0);per.set(key,c);return c;
}
function drawSprite(ctx,sp,palName,x,y,{scale=1,silhouette=false,clipBottom=null,squash=1}={}){
 const c=paint(sp,palName,silhouette);if(!c)return;
 const w=sp.w*scale,h=sp.h*scale;
 if(clipBottom!==null){const visible=Math.max(0,Math.min(h,clipBottom-y));if(visible<=0)return;ctx.drawImage(c,0,0,sp.w,visible/scale,x,y,w,visible);return;}
 if(squash!==1){const hh=Math.round(h*squash);ctx.drawImage(c,0,0,sp.w,sp.h,x+(w-Math.round(w*squash))/2,y+h-hh,Math.round(w*squash),hh);return;}
 ctx.drawImage(c,0,0,sp.w,sp.h,x,y,w,h);
}
const typePalette=id=>speciesFor(id).types[0];

Object.assign(exports,{DMG,TYPE_TINT,setPaletteMode,paletteMode,pal,color,bitmap,ART,characterSprite,prepareSprites,spriteOf,moodSprite,drawSprite,paint,typePalette,dither});
