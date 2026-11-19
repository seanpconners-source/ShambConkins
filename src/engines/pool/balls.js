// Paddy's Pool balls: drawn pixel by pixel as real spheres (src/engines/paddysPool.js), so the numbers and stripes roll
// with the ball. Each ball keeps a small canvas that is only repainted when the ball turned or the size changed.
const COL={1:'#f2c12e',2:'#1f4fbf',3:'#d42a2a',4:'#5b2a8a',5:'#f07b1a',6:'#13804a',7:'#7a1f22',8:'#111114',9:'#f2c12e',10:'#1f4fbf',11:'#d42a2a',12:'#5b2a8a',13:'#f07b1a',14:'#13804a',15:'#7a1f22'};
const hexRGB=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const digits=new Map();
function digitMask(n){if(digits.has(n))return digits.get(n);const S=40,cv=typeof document!=='undefined'?document.createElement('canvas'):null;if(!cv)return null;cv.width=cv.height=S;const g=cv.getContext('2d');
 g.fillStyle='#000';g.font=`900 ${n>9?21:27}px Arial, Helvetica, sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(String(n),S/2,S/2+1.5);if(n===6||n===9){g.fillRect(S*.32,S*.8,S*.36,2.5);}
 const d=g.getImageData(0,0,S,S).data,m=new Uint8Array(S*S);for(let i=0;i<S*S;i++)m[i]=d[i*4+3];const e={S,m};digits.set(n,e);return e;}
// L = direction to the light in screen space (z toward the viewer is negative)
const L=(()=>{const v=[-.32,-.45,-1],l=Math.hypot(...v);return v.map(q=>q/l);})(),H=(()=>{const v=[L[0],L[1],L[2]-1],l=Math.hypot(...v);return v.map(q=>q/l);})();
function makeBallArt(){
 const cache=new Map();
 // b = physics ball, px = radius in device px, rot = view rotation (0 or -pi/2), set = ball set
 function draw(b,px,rot,set){
  const S=Math.ceil(px*2)+2,key=b.id;let e=cache.get(key);
  if(!e){const cv=document.createElement('canvas');e={cv,g:cv.getContext('2d'),img:null,S:0,o:null,set:null};cache.set(key,e);}
  const o=b.o;if(e.S===S&&e.set===set.id&&e.o&&!changed(e.o,o))return e.cv;
  if(e.S!==S){e.cv.width=e.cv.height=S;e.img=e.g.createImageData(S,S);e.S=S;}
  e.o=o.slice();e.set=set.id;paint(e.img.data,S,px,b.id,o,rot,set);e.g.putImageData(e.img,0,0);return e.cv;
 }
 return {draw,clear:()=>cache.clear()};
}
function changed(a,b){for(let i=0;i<9;i++)if(Math.abs(a[i]-b[i])>.004)return true;return false;}
// Each ball set has its own look (owner, Nov 19: "the sets don't look any different"): palette, how glossy, worn or metallic.
const mix=(a,b,k)=>a.map((v,i)=>v+(b[i]-v)*k);
const STYLES={
 // Paddy's Bar Set: yellowed, faded, matte, chipped (the chips are on the ball, so they roll with it)
 bar:{pal:id=>mix(hexRGB(COL[id]),[120,105,80],.32).map(v=>v*.88),white:[222,206,160],ink:[40,30,22],spec:[.38,40],shade:[.32,.74],chips:1,numR:.43},
 classic:{pal:id=>hexRGB(COL[id]),white:[247,245,236],ink:[22,20,22],spec:[1.1,70],shade:[.28,.82]},
 // Pro Set: deep tournament colours, mirror gloss, the red-dot "measle" cue ball
 pro:{pal:id=>({1:[255,196,0],2:[0,62,190],3:[226,16,30],4:[96,24,150],5:[255,110,0],6:[0,128,60],7:[150,24,24],8:[8,8,10]})[id>8?id-8:id],white:[253,253,251],ink:[10,10,12],spec:[1.6,140],spec2:.35,shade:[.2,.9],measle:true,numR:.4,ring:true,stripeW:.48},
 // Glow Set: fluorescent colours that light themselves (and the felt round them)
 glow:{pal:id=>({1:[255,240,0],2:[0,190,255],3:[255,40,90],4:[190,80,255],5:[255,140,0],6:[60,255,30],7:[255,0,170],8:[40,30,60]})[id>8?id-8:id],white:[235,245,255],ink:[30,0,60],spec:[.7,50],shade:[.86,.3],rim:1},
 // Golden God Set: polished gold instead of white, metallic colours, gold-rimmed numbers
 gold:{pal:id=>id===8?[14,12,10]:mix(hexRGB(COL[id]),[60,40,10],.2),white:[226,180,64],ink:[20,14,4],spec:[1.5,90],shade:[.22,.9],metal:1,numBg:[250,236,190]},
};
function styleOf(set){return STYLES[set.id]||(set.glow?STYLES.glow:set.age?STYLES.bar:set.dots?STYLES.pro:STYLES.classic);}
const hash3=(a,b,c)=>{let n=(a*73856093)^(b*19349663)^(c*83492791);n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)/4294967296;};
function paint(d,S,px,id,o,rot,set){
 const st=styleOf(set),c=S/2,stripe=id>=9,white=st.white,base=id===0?(st.metal?[244,240,232]:white):st.pal(id);
 const cr=Math.cos(rot),sr=Math.sin(rot),dm=id?digitMask(id):null;
 const nr=st.numR||.47,cosN=Math.cos(nr),sinN=Math.sin(nr),numBg=st.numBg||white;
 for(let j=0;j<S;j++)for(let i=0;i<S;i++){
  const u=(i+.5-c)/px,v=(j+.5-c)/px,r2=u*u+v*v,k=(j*S+i)*4;
  if(r2>=1.08){d[k+3]=0;continue;}
  const r=Math.sqrt(Math.min(1,r2)),z=-Math.sqrt(Math.max(0,1-r*r)),nu=r2>1?u/Math.sqrt(r2):u,nv=r2>1?v/Math.sqrt(r2):v;
  // screen -> world (undo the view rotation), world -> body (transpose)
  const wx=nu*cr+nv*sr,wy=-nu*sr+nv*cr,wz=z;
  const bx=o[0]*wx+o[3]*wy+o[6]*wz,by=o[1]*wx+o[4]*wy+o[7]*wz,bz=o[2]*wx+o[5]*wy+o[8]*wz;
  let col=base,isWhite=id===0;
  if(id===0){if(st.measle){const ax=Math.abs(bx),ay=Math.abs(by),az=Math.abs(bz);if(ax>.93||ay>.93||az>.93)col=[205,22,30];}
   else if(set.dots){const ax=Math.abs(bx),ay=Math.abs(by),az=Math.abs(bz);if(ax>.975||ay>.975||az>.975)col=[200,30,36];}
   else if(st.metal){const ax=Math.abs(bx),ay=Math.abs(by),az=Math.abs(bz);if(ax>.95||ay>.95||az>.95)col=[214,170,56];}}
  else{
   if(stripe&&Math.abs(bx)>(st.stripeW||.56)){col=white;isWhite=true;}
   if(st.ring&&Math.abs(bz)>cosN-.05&&Math.abs(bz)<=cosN)col=col.map(v=>v*.35);
   if(Math.abs(bz)>cosN){col=numBg;isWhite=true;if(st.numBg&&Math.abs(bz)<cosN+.02)col=white;if(dm){const s=bz>0?1:-1,tx=(bx*s/sinN+1)/2,ty=(by/sinN+1)/2,mi=Math.floor(tx*dm.S),mj=Math.floor(ty*dm.S);if(mi>=0&&mj>=0&&mi<dm.S&&mj<dm.S&&dm.m[mj*dm.S+mi]>110)col=st.ink;}}
  }
  // worn: chips and scuffs fixed on the ball's surface
  if(st.chips){const q=hash3(Math.floor(bx*13+20),Math.floor(by*13+20),Math.floor(bz*13+20)+id*31);if(q<.03)col=mix(col,[60,48,32],.6);else if(q<.09)col=mix(col,[160,140,100],.22);}
  // light
  const nx=nu,ny=nv,nz=z,dif=Math.max(0,nx*L[0]+ny*L[1]+nz*L[2]),nh=Math.max(0,nx*H[0]+ny*H[1]+nz*H[2]);
  let sh=st.shade[0]+st.shade[1]*dif;sh*=1-.25*Math.pow(r,6);
  // metal: a fake room reflected in the ball (bright above the horizon, dark below)
  if(st.metal&&(isWhite||id===8||!stripe&&id)){const ry=ny-2*nz*ny*nz,band=ry<-.15?1.15:ry<.1?.68:.9;sh*=band;}
  const sp=Math.pow(nh,st.spec[1])*st.spec[0]+Math.pow(nh,9)*(st.spec2??.1);
  let R=col[0]*sh+255*sp,G=col[1]*sh+255*sp,B=col[2]*sh+250*sp;
  if(st.rim){const e=Math.pow(r,4)*.55;R+=col[0]*e;G+=col[1]*e;B+=col[2]*e;}
  d[k]=R>255?255:R;d[k+1]=G>255?255:G;d[k+2]=B>255?255:B;d[k+3]=Math.max(0,Math.min(255,((1-Math.sqrt(r2))*px+.5)*255));
 }
}
// the colour a ball glows / is drawn in small (HUD dots, Glow Set halo)
function colorOf(id,set){const st=styleOf(set||{id:'classic'});const c=id?st.pal(id):st.white;return `rgb(${c.map(v=>Math.round(Math.min(255,v))).join(',')})`;}
Object.assign(exports,{COL,makeBallArt,colorOf,STYLES});
