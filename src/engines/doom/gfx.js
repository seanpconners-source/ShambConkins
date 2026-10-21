// Doom graphics data from a WAD: palettes, colormaps, patches (column-major pixels + opacity mask), composite wall
// textures (TEXTURE1/2 + PNAMES), flats, sprite frame tables, animated textures/flats and switch pairs.
const {SPRITES}=require("src/engines/doom/info.js");

// a decoded patch / composite: column-major pixels and a mask (1 = opaque)
function decodePatch(wad,bytes){
 if(!bytes||bytes.length<8)return null;
 const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),w=dv.getUint16(0,true),h=dv.getUint16(2,true);
 if(!w||!h||w>4096||h>4096||8+w*4>bytes.length)return null;
 const pix=new Uint8Array(w*h),mask=new Uint8Array(w*h);
 for(let x=0;x<w;x++){let p=dv.getUint32(8+x*4,true),top=-1;
  for(let guard=0;guard<256&&p<bytes.length;guard++){const td=bytes[p];if(td===255)break;top=td<=top?top+td:td;// tall patches
   const len=bytes[p+1];for(let i=0;i<len;i++){const y=top+i;if(y>=0&&y<h){pix[x*h+y]=bytes[p+3+i];mask[x*h+y]=1;}}p+=len+4;}}
 return {w,h,left:dv.getInt16(4,true),top:dv.getInt16(6,true),pix,mask};}

class Gfx{
 constructor(wad){
  this.wad=wad;
  const pp=wad.lump('PLAYPAL');this.palettes=[];
  for(let i=0;i*768+768<=pp.length;i++){const p=new Uint32Array(256);for(let c=0;c<256;c++){const o=i*768+c*3;p[c]=0xff000000|pp[o+2]<<16|pp[o+1]<<8|pp[o];}this.palettes.push(p);}
  this.paletteRGB=pp.subarray(0,768);
  this.colormaps=wad.lump('COLORMAP')||new Uint8Array(34*256).map((_,i)=>i&255);
  this.patchCache=new Map();
  // flats
  this.flats=[];this.flatNum=new Map();
  for(const l of wad.between('F_START','F_END')){if(this.flatNum.has(l.name))this.flats[this.flatNum.get(l.name)]=l;else{this.flatNum.set(l.name,this.flats.length);this.flats.push(l);}}
  this.flatData=new Array(this.flats.length);
  this.skyflatnum=this.flatNum.get('F_SKY1')??-1;
  // textures
  this.textures=[{name:'-',w:1,h:1,patches:[]}];this.texNum=new Map([['-',0]]);
  const pn=wad.lump('PNAMES'),pnames=[];
  if(pn){const n=new DataView(pn.buffer,pn.byteOffset,pn.byteLength).getInt32(0,true);for(let i=0;i<n;i++){let s='';for(let k=0;k<8;k++){const c=pn[4+i*8+k];if(!c)break;s+=String.fromCharCode(c);}pnames.push(s.toUpperCase());}}
  let first=true;
  for(const tl of ['TEXTURE1','TEXTURE2']){const b=wad.lump(tl);if(!b)continue;const dv=new DataView(b.buffer,b.byteOffset,b.byteLength),n=dv.getInt32(0,true);
   for(let i=0;i<n;i++){const o=dv.getInt32(4+i*4,true);let name='';for(let k=0;k<8;k++){const c=b[o+k];if(!c)break;name+=String.fromCharCode(c);}name=name.toUpperCase();
    const w=dv.getInt16(o+12,true),h=dv.getInt16(o+14,true),pc=dv.getInt16(o+20,true),patches=[];
    for(let p=0;p<pc;p++){const q=o+22+p*10;patches.push({x:dv.getInt16(q,true),y:dv.getInt16(q+2,true),name:pnames[dv.getInt16(q+4,true)]});}
    const t={name,w,h,patches};
    // texture 0 of TEXTURE1 is the "no texture" marker in vanilla
    if(first&&i===0){this.textures[0]={...t,name:'-'};this.texNum.set(name,0);continue;}
    if(!this.texNum.has(name)){this.texNum.set(name,this.textures.length);this.textures.push(t);}}
   first=false;}
  this.texData=new Array(this.textures.length);
  this.texTranslation=Int32Array.from(this.textures,(_,i)=>i);this.flatTranslation=Int32Array.from(this.flats,(_,i)=>i);
  this.initAnims();this.initSwitches();this.initSprites();
 }
 patch(name){let p=this.patchCache.get(name);if(p===undefined){p=decodePatch(this.wad,this.wad.lump(name));this.patchCache.set(name,p);}return p;}
 patchAt(i){const key='#'+i;let p=this.patchCache.get(key);if(p===undefined){p=decodePatch(this.wad,this.wad.lumpAt(i));this.patchCache.set(key,p);}return p;}
 tex(i){let t=this.texData[i];if(t)return t;const d=this.textures[i];const w=Math.max(1,d.w),h=Math.max(1,d.h),pix=new Uint8Array(w*h),mask=new Uint8Array(w*h);
  for(const pt of d.patches){const p=this.patch(pt.name);if(!p)continue;
   for(let x=0;x<p.w;x++){const tx=pt.x+x;if(tx<0||tx>=w)continue;for(let y=0;y<p.h;y++){if(!p.mask[x*p.h+y])continue;const ty=pt.y+y;if(ty<0||ty>=h)continue;pix[tx*h+ty]=p.pix[x*p.h+y];mask[tx*h+ty]=1;}}}
  t={w,h,pix,mask,name:d.name};this.texData[i]=t;return t;}
 texHeight(i){return this.textures[i]?.h||0;}
 flat(i){let f=this.flatData[i];if(f)return f;const l=this.flats[i];f=new Uint8Array(4096);if(l){const b=this.wad.bytes.subarray(l.off,l.off+Math.min(4096,l.size));f.set(b);}this.flatData[i]=f;return f;}
 texture(name){name=String(name||'-').toUpperCase();if(name==='-'||!name)return 0;return this.texNum.get(name)??0;}
 flatnum(name){return this.flatNum.get(String(name).toUpperCase())??0;}
 initAnims(){
  const FLATS=[['NUKAGE3','NUKAGE1'],['FWATER4','FWATER1'],['SWATER4','SWATER1'],['LAVA4','LAVA1'],['BLOOD3','BLOOD1'],['RROCK08','RROCK05'],['SLIME04','SLIME01'],['SLIME08','SLIME05'],['SLIME12','SLIME09']];
  const TEX=[['BLODGR4','BLODGR1'],['SLADRIP3','SLADRIP1'],['BLODRIP4','BLODRIP1'],['FIREWALL','FIREWALA'],['GSTFONT3','GSTFONT1'],['FIRELAVA','FIRELAV3'],['FIREMAG3','FIREMAG1'],['FIREBLU2','FIREBLU1'],['ROCKRED3','ROCKRED1'],['BFALL4','BFALL1'],['SFALL4','SFALL1'],['WFALL4','WFALL1'],['DBRAIN4','DBRAIN1']];
  this.anims=[];
  for(const [e,s] of FLATS){const a=this.flatNum.get(s),b=this.flatNum.get(e);if(a!==undefined&&b!==undefined&&b>a)this.anims.push({flat:true,base:a,num:b-a+1,speed:8});}
  for(const [e,s] of TEX){const a=this.texNum.get(s),b=this.texNum.get(e);if(a!==undefined&&b!==undefined&&b>a)this.anims.push({flat:false,base:a,num:b-a+1,speed:8});}}
 animate(leveltime){for(const a of this.anims)for(let i=a.base;i<a.base+a.num;i++){const pic=a.base+((leveltime/a.speed|0)+i)%a.num;if(a.flat)this.flatTranslation[i]=pic;else this.texTranslation[i]=pic;}}
 initSwitches(){this.switchOf=new Map();for(const [name,i] of this.texNum){if(!/^SW1/.test(name))continue;const j=this.texNum.get('SW2'+name.slice(3));if(j!==undefined){this.switchOf.set(i,j);this.switchOf.set(j,i);}}}
 initSprites(){
  // sprite lumps NNNNFR[FR]: frame letter + rotation (0 = all angles); the optional second pair is the mirrored use
  const lumps=new Map();
  let on=false;this.wad.dir.forEach((l,i)=>{if(l.name==='S_START'||l.name==='SS_START'){on=true;return;}if(l.name==='S_END'||l.name==='SS_END'){on=false;return;}if(on&&l.size>0&&l.name.length>=6)lumps.set(l.name,i);});
  this.sprites=SPRITES.map(()=>({frames:[]}));const idx=new Map(SPRITES.map((n,i)=>[n,i]));
  const put=(sp,fr,rot,lump,flip)=>{const f=sp.frames[fr]||={rotate:false,lump:new Int32Array(8).fill(-1),flip:new Uint8Array(8)};
   if(rot===0){f.rotate=false;f.lump.fill(lump);f.flip.fill(flip);}else{f.rotate=true;f.lump[rot-1]=lump;f.flip[rot-1]=flip;}};
  for(const [name,i] of lumps){const si=idx.get(name.slice(0,4));if(si===undefined)continue;const sp=this.sprites[si];
   put(sp,name.charCodeAt(4)-65,name.charCodeAt(5)-48,i,0);if(name.length>=8)put(sp,name.charCodeAt(6)-65,name.charCodeAt(7)-48,i,1);}
  // a rotated frame missing some angles borrows the nearest one
  for(const sp of this.sprites)for(const f of sp.frames){if(!f)continue;for(let r=0;r<8;r++)if(f.lump[r]<0){const k=[...f.lump].findIndex(v=>v>=0);f.lump[r]=k<0?-1:f.lump[k];f.flip[r]=k<0?0:f.flip[k];}}
 }
}
Object.assign(exports,{Gfx,decodePatch});
