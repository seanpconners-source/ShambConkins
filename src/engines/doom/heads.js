// ShambConkins faces in Doom. Monsters wear roster characters' heads: each head is turned into a Doom-palette patch
// and drawn into the 8-bit frame on top of the sprite's own head (found from the sprite's pixels), so it is lit, faded
// with distance, clipped and fuzzed exactly like the sprite; it follows the sprite's rotation (front, three-quarter,
// profile, back of the head) and changes mood when the monster attacks, is hurt or dies. The status-bar face is the
// player's own character, with Doom's expressions (looking around, turning to the attacker, ouch, evil grin,
// rampage, god mode, dead) and Doom's five stages of getting bloodier as health drops.
const {headCanvas}=require("src/engines/broforce.js");
const {faceInfo}=require("src/engines/doom/hud.js");
const I=require("src/engines/doom/info.js");
const MT=I.MT;
// monsters whose whole sprite is a head (the face goes in the middle) / lower-middle for the flaming skull
const WHOLE={[MT.HEAD]:.62,[MT.PAIN]:.5,[MT.SKULL]:.7};
const BAND={[MT.SPIDER]:.34,[MT.BABY]:.42,[MT.CYBORG]:.16,[MT.FATSO]:.2,[MT.SERGEANT]:.3,[MT.SHADOWS]:.3,[MT.VILE]:.15,[MT.UNDEAD]:.15,[MT.KEEN]:.22};
const NOHEAD=new Set([MT.PLAYER,MT.BOSSBRAIN,MT.BOSSSPIT,MT.BOSSTARGET,MT.BARREL]);

class Heads{
 constructor(gfx){this.gfx=gfx;this.pal=gfx.paletteRGB;this.cube=null;this.cache=new Map();this.anchors=new Map();this.faces=new Map();}
 // nearest palette index for an RGB colour (32^3 lookup cube)
 nearest(r,g,b){if(!this.cube){this.cube=new Uint8Array(32768).fill(255);this.cubeSet=new Uint8Array(32768);}
  const k=(r>>3)<<10|(g>>3)<<5|(b>>3);if(this.cubeSet[k])return this.cube[k];
  const P=this.pal;let best=0,bd=1e9;for(let i=0;i<256;i++){const dr=P[i*3]-r,dg=P[i*3+1]-g,db=P[i*3+2]-b,d=dr*dr*.3+dg*dg*.59+db*db*.11;if(d<bd){bd=d;best=i;}}
  this.cubeSet[k]=1;this.cube[k]=best;return best;}
 // palettised head patch for a character + mood (rebuilt when the portrait finishes loading)
 head(id,mood){let src=headCanvas(id,mood);
  // a mood portrait still loading shows the stand-in (64px): use the face we already have meanwhile
  if(mood!=='normal'&&src.width===64){const n=headCanvas(id,'normal');if(n.width!==64)src=n;}
  const key=id+':'+mood;let h=this.cache.get(key);if(h&&h.src===src)return h;
  const N=40,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,0,0,N,N);
  let d;try{d=x.getImageData(0,0,N,N).data;}catch{return h||null;}
  const pix=new Uint8Array(N*N),mask=new Uint8Array(N*N);let hr=0,hg=0,hb=0,hn=0;
  for(let yy=0;yy<N;yy++)for(let xx=0;xx<N;xx++){const i=(yy*N+xx)*4;if(d[i+3]<110)continue;const o=xx*N+yy;pix[o]=this.nearest(d[i],d[i+1],d[i+2]);mask[o]=1;if(yy<N*.32){hr+=d[i];hg+=d[i+1];hb+=d[i+2];hn++;}}
  // the back of the head: the silhouette in the hair colour (the top of the head), darkened
  const back=new Uint8Array(N*N),hair=hn?this.nearest(hr/hn*.55,hg/hn*.55,hb/hn*.55):0;for(let i=0;i<N*N;i++)if(mask[i])back[i]=hair;
  // outline pixels stay dark
  h={src,w:N,h:N,pix,mask,back};this.cache.set(key,h);return h;}
 // where the sprite's own head is: [cx, cy, size] in patch pixels
 anchor(lump,patch,type){const key=lump+':'+type;let a=this.anchors.get(key);if(a)return a;
  const {w,h,mask}=patch;let top=h,bot=-1,l=w,r=-1;for(let x=0;x<w;x++)for(let y=0;y<h;y++)if(mask[x*h+y]){if(y<top)top=y;if(y>bot)bot=y;if(x<l)l=x;if(x>r)r=x;}
  if(bot<0){a=null;this.anchors.set(key,a);return a;}
  const bw=r-l+1,bh=bot-top+1;
  if(WHOLE[type]){const k=WHOLE[type];a=[(l+r+1)/2,type===MT.SKULL?top+bh*.6:(top+bot+1)/2,Math.min(bw,bh)*k];}
  else{const band=Math.max(4,Math.round(bh*(BAND[type]??.17)));let sx=0,n=0,minx=w,maxx=-1;
   for(let y=top;y<Math.min(h,top+band);y++)for(let x=0;x<w;x++)if(mask[x*h+y]){sx+=x;n++;if(x<minx)minx=x;if(x>maxx)maxx=x;}
   // arms raised over the head widen the top band: keep the head in proportion to the body
   const width=Math.max(4,Math.min(bw*.62,(maxx-minx+1)*1.05,bh*.2));a=[n?sx/n+.5:(l+r+1)/2,top+band*.55,Math.max(width,Math.min(band*.9,bh*.2))];}
  this.anchors.set(key,a);return a;}
 mood(mo){const info=mo.info,st=mo.stnum;if(mo.health<=0||mo.flags&0x100000)return 'sad';
  if(mo.flags&0x40&&info.painstate&&st>=info.painstate&&st<=info.painstate+2)return 'sad';
  const inSeq=(s0)=>s0&&st>=s0&&st<s0+12;if(inSeq(info.missilestate)||inSeq(info.meleestate))return 'angry';return 'normal';}
 // renderer hook: draw the head over vissprite v (clip arrays ct/cb)
 draw(r,v,ct,cb){
  const mo=v.thing;if(!mo.head||NOHEAD.has(mo.type))return;
  // blown to pieces: no head left after the first frames of the gib animation
  if(mo.info.xdeathstate&&mo.stnum>=mo.info.xdeathstate+2&&mo.stnum<mo.info.xdeathstate+12)return;
  const a=this.anchor(v.lump,v.patch,mo.type);if(!a)return;const hd=this.head(mo.head,this.mood(mo));if(!hd)return;
  const [ax,ay,size]=a;
  const rot=v.rot,side=rot===0?1:rot===1||rot===7?.86:rot===2||rot===6?.62:.8,useBack=rot>=3&&rot<=5;
  // patch column -> screen x
  const colToX=c=>v.x1+(c-v.startfrac)/v.xiscale,top=r.centery-v.texturemid*v.scale;
  const cxs=colToX(ax),cys=top+ay*v.scale,hw=size*v.scale*side,hh=size*v.scale*1.08;
  const shift=(rot===1||rot===2?-1:rot===6||rot===7?1:0)*hw*.08;
  const x0=Math.max(v.x1,Math.ceil(cxs-hw/2+shift)),x1=Math.min(v.x2,Math.ceil(cxs+hw/2+shift)-1),y0=Math.ceil(cys-hh/2),y1=Math.ceil(cys+hh/2)-1;
  if(x1<x0||y1<y0)return;
  const scr=r.screen,W=r.W,cm=r.gfx.colormaps,N=hd.w,src=useBack?hd.back:hd.pix,mirror=rot>=5;
  for(let x=x0;x<=x1;x++){let u=((x-(cxs-hw/2+shift))/hw);if(mirror)u=1-u;const col=Math.max(0,Math.min(N-1,Math.floor(u*N)));
   const ylo=Math.max(y0,ct[x]+1,v.fuzz?1:0),yhi=Math.min(y1,cb[x]-1,v.fuzz?r.viewH-2:1e9);
   for(let y=ylo;y<=yhi;y++){const row=Math.max(0,Math.min(N-1,Math.floor((y-(cys-hh/2))/hh*N))),o=col*N+row;if(!hd.mask[o])continue;
    const q=y*W+x;if(v.fuzz){scr[q]=cm[6*256+scr[q+(((x*7+y*3)&1)?W:-W)]];continue;}
    // the back of the head on the side views blends into the face edge
    let c=src[o];if(rot===3||rot===5){if(u>(rot===3?.55:.45)===(rot===3))c=hd.pix[o];}
    scr[q]=cm[v.cmap+c];}}}
 // ---- status bar face: an RGBA canvas (Doom palette) per face index for character id ----
 preload(ids){for(const id of ids)for(const m of ['normal','angry','sad','win'])headCanvas(id,m);}
 face(id,index){
  const info=faceInfo(index),mood={god:'win',dead:'sad',ouch:'sad',grin:'win',rampage:'angry',turnleft:'angry',turnright:'angry'}[info.kind]||'normal';
  let src=headCanvas(id,mood);if(mood!=='normal'&&src.width===64){const n=headCanvas(id,'normal');if(n.width!==64)src=n;}const key=id+':'+index;let f=this.faces.get(key);if(f&&f.src===src)return f.c;
  const S=64,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d',{willReadFrequently:true});
  x.save();x.translate(S/2,S/2+2);
  const turn={left:-.08,right:.08,turnleft:-.2,turnright:.2}[info.kind]||0;
  if(info.kind==='dead')x.rotate(.22);if(info.kind==='ouch')x.scale(1.06,1.06);
  x.scale(1-Math.abs(turn)*.9,1);x.translate(turn*30,0);
  x.drawImage(src,-S/2,-S/2,S,S);x.restore();
  // blood: Doom's face gets bloodier as health drops (pain levels 0..4)
  const pain=info.pain;x.save();x.globalCompositeOperation='source-atop';
  if(info.kind==='dead'){x.fillStyle='rgba(60,60,60,.45)';x.fillRect(0,0,S,S);}
  if(info.kind==='god'){x.fillStyle='rgba(255,210,40,.28)';x.fillRect(0,0,S,S);}
  const blood=(px,py,len,w)=>{x.fillStyle='rgba(170,0,0,.95)';x.beginPath();x.ellipse(px,py,w,w*.8,0,0,7);x.fill();x.fillRect(px-w*.35,py,w*.7,len);x.beginPath();x.ellipse(px,py+len,w*.45,w*.6,0,0,7);x.fill();};
  if(pain>=1){x.strokeStyle='rgba(150,0,0,.95)';x.lineWidth=2;x.beginPath();x.moveTo(24,15);x.lineTo(33,19);x.stroke();}
  if(pain>=2){x.fillStyle='rgba(80,20,90,.5)';x.beginPath();x.ellipse(41,29,6,4,0,0,7);x.fill();blood(33,36,9,2.4);}
  if(pain>=3){blood(19,24,14,2.6);blood(44,20,8,2);x.strokeStyle='rgba(140,0,0,.9)';x.lineWidth=2.5;x.beginPath();x.moveTo(15,36);x.lineTo(24,40);x.stroke();}
  if(pain>=4){x.fillStyle='rgba(120,0,0,.35)';x.fillRect(0,0,S,S);blood(27,10,18,3);blood(48,34,12,2.6);blood(12,42,10,2.2);}
  x.restore();
  // into the Doom palette
  try{const img=x.getImageData(0,0,S,S),d=img.data,P=this.pal;for(let i=0;i<d.length;i+=4){if(d[i+3]<100){d[i+3]=0;continue;}const k=this.nearest(d[i],d[i+1],d[i+2]);d[i]=P[k*3];d[i+1]=P[k*3+1];d[i+2]=P[k*3+2];d[i+3]=255;}x.putImageData(img,0,0);}catch{}
  this.faces.set(key,{src,c});return c;}
}
Object.assign(exports,{Heads,NOHEAD});
