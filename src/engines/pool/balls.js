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
function paint(d,S,px,id,o,rot,set){
 const c=S/2,stripe=id>=9,base=id===0?[248,246,236]:hexRGB(COL[id]),white=set.age?[233,222,186]:[247,245,236],glow=!!set.glow;
 const cr=Math.cos(rot),sr=Math.sin(rot),dm=id?digitMask(id):null;
 const cosN=Math.cos(.47),sinN=Math.sin(.47);
 for(let j=0;j<S;j++)for(let i=0;i<S;i++){
  const u=(i+.5-c)/px,v=(j+.5-c)/px,r2=u*u+v*v,k=(j*S+i)*4;
  if(r2>=1.08){d[k+3]=0;continue;}
  const r=Math.sqrt(Math.min(1,r2)),z=-Math.sqrt(Math.max(0,1-r*r)),nu=r2>1?u/Math.sqrt(r2):u,nv=r2>1?v/Math.sqrt(r2):v;
  // screen -> world (undo the view rotation), world -> body (transpose)
  const wx=nu*cr+nv*sr,wy=-nu*sr+nv*cr,wz=z;
  const bx=o[0]*wx+o[3]*wy+o[6]*wz,by=o[1]*wx+o[4]*wy+o[7]*wz,bz=o[2]*wx+o[5]*wy+o[8]*wz;
  let col=base;
  if(id===0){col=white;if(set.dots){const ax=Math.abs(bx),ay=Math.abs(by),az=Math.abs(bz);if(ax>.975||ay>.975||az>.975)col=[200,30,36];}}
  else{
   if(stripe&&Math.abs(bx)>.56)col=white;
   if(Math.abs(bz)>cosN){col=white;if(dm){const s=bz>0?1:-1,tx=(bx*s/sinN+1)/2,ty=(by/sinN+1)/2,mi=Math.floor(tx*dm.S),mj=Math.floor(ty*dm.S);if(mi>=0&&mj>=0&&mi<dm.S&&mj<dm.S&&dm.m[mj*dm.S+mi]>110)col=[22,20,22];}}
  }
  // light
  const nx=nu,ny=nv,nz=z,dif=Math.max(0,nx*L[0]+ny*L[1]+nz*L[2]),nh=Math.max(0,nx*H[0]+ny*H[1]+nz*H[2]);
  let sh=glow?.75+.35*dif:.28+.82*dif;sh*=1-.25*Math.pow(r,6);
  const sp=Math.pow(nh,70)*1.1+Math.pow(nh,9)*.1,spw=set.age?.6:1;
  let R=col[0]*sh+255*sp*spw,G=col[1]*sh+255*sp*spw,B=col[2]*sh+250*sp*spw;
  if(set.age){const n=((i*73856093)^(j*19349663)^(id*83492791))>>>0;if(n%97===0){R*=.6;G*=.58;B*=.52;}}
  d[k]=R>255?255:R;d[k+1]=G>255?255:G;d[k+2]=B>255?255:B;d[k+3]=Math.max(0,Math.min(255,((1-Math.sqrt(r2))*px+.5)*255));
 }
}
Object.assign(exports,{COL,makeBallArt});
