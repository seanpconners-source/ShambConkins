// Sonic 3 style terrain: the level's solid ground as 16x16 pixel tiles, like the Mega Drive game. Shapes (polygons, made
// from straight runs, curves, arcs) are rasterised into per-tile 16-row bit masks, deduplicated in a pool, so a 16000 px
// wide act costs about a megabyte. Four layers:
//   all   solid for everyone
//   a, b  the two collision paths (Sonic 3 "plane A/B"): a loop's right half is on path A and its left half on path B,
//         and plane switchers flip the runner's path as they go round, so the same spot can be a wall or open air
//   top   one-way platforms: only floors count, and only from above
// Pixel coords: x right, y down. A pixel (x,y) is solid when its bit is set in the layer's tile mask.
const T=16;
class Layer{
 constructor(tw,th,pool){this.tw=tw;this.th=th;this.map=new Uint32Array(tw*th);this.pool=pool;}
 mask(tx,ty){if(tx<0||ty<0||tx>=this.tw||ty>=this.th)return null;const i=this.map[ty*this.tw+tx];return i?this.pool.masks[i]:null;}
 get(x,y){x|=0;y|=0;if(x<0||y<0)return false;const m=this.mask(x>>4,y>>4);return !!m&&(m[y&15]>>(x&15)&1)===1;}
}
// Builder: collects shapes per layer, then rasterises them all at once with an even/odd scanline fill per shape.
class Terrain{
 constructor(w,h){this.w=w;this.h=h;this.tw=Math.ceil(w/T);this.th=Math.ceil(h/T);
  this.pool={masks:[null],keys:new Map()};this.L={all:new Layer(this.tw,this.th,this.pool),a:new Layer(this.tw,this.th,this.pool),b:new Layer(this.tw,this.th,this.pool),top:new Layer(this.tw,this.th,this.pool)};
  this.shapes=[];}
 // add a filled polygon (array of [x,y]) to a layer ('all' | 'a' | 'b' | 'top'); mode 'add' fills, 'cut' clears
 poly(pts,layer='all',mode='add'){this.shapes.push({pts,layer,mode});return this;}
 build(){const work={};for(const k of Object.keys(this.L))work[k]=new Map();// tile index -> Uint16Array(16) rows
  for(const sh of this.shapes){const W=work[sh.layer],pts=sh.pts,n=pts.length;let y0=Infinity,y1=-Infinity;
   for(const p of pts){if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1];}
   y0=Math.max(0,Math.floor(y0));y1=Math.min(this.h-1,Math.ceil(y1));
   const xs=[];
   for(let y=y0;y<=y1;y++){const cy=y+.5;xs.length=0;
    for(let i=0,j=n-1;i<n;j=i++){const a=pts[i],b=pts[j];if((a[1]>cy)!==(b[1]>cy))xs.push(a[0]+(cy-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
    if(!xs.length)continue;xs.sort((p,q)=>p-q);
    for(let k=0;k+1<xs.length;k+=2){const xa=Math.max(0,Math.ceil(xs[k]-.5)),xb=Math.min(this.w-1,Math.floor(xs[k+1]-.5));if(xb<xa)continue;
     const ty=y>>4,row=y&15;
     for(let tx=xa>>4;tx<=xb>>4;tx++){const lo=Math.max(xa,tx*T)-tx*T,hi=Math.min(xb,tx*T+15)-tx*T;const bits=((1<<(hi+1))-1)&~((1<<lo)-1);
      const key=ty*this.tw+tx;let m=W.get(key);if(!m){m=this.seed(sh.layer,key);W.set(key,m);}
      if(sh.mode==='cut')m[row]&=~bits;else m[row]|=bits;}}}}
  for(const [k,W] of Object.entries(work)){const Ly=this.L[k];for(const [key,m] of W){let any=0;for(let r=0;r<16;r++)any|=m[r];Ly.map[key]=any?this.intern(m):0;}}
  this.shapes=null;return this;}
 seed(layer,key){const m=new Uint16Array(16),i=this.L[layer].map[key];if(i){const o=this.pool.masks[i];for(let r=0;r<16;r++)m[r]=o[r];}return m;}
 intern(m){const k=m.join(',');let i=this.pool.keys.get(k);if(i===undefined){i=this.pool.masks.length;this.pool.masks.push(Uint16Array.from(m));this.pool.keys.set(k,i);}return i;}
 // solid for a runner on path `path` ('a'|'b'); floor=true lets one-way platforms count
 solid(x,y,path,floor){const L=this.L;return L.all.get(x,y)||(path==='b'?L.b.get(x,y):L.a.get(x,y))||(floor&&L.top.get(x,y));}
 tiles(){return this.pool.masks.length-1;}
}
// ---------------- shape helpers (all return point lists to splice into polygons)
// straight run from a to b, n points
const line=(a,b,n=2)=>{const o=[];for(let i=0;i<n;i++){const t=n===1?0:i/(n-1);o.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}return o;};
// cubic bezier
const bez=(p0,p1,p2,p3,n=24)=>{const o=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t;o.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]]);}return o;};
// arc round (cx,cy) radius r from angle a0 to a1 (radians, screen: 0 = right, PI/2 = down)
const arc=(cx,cy,r,a0,a1,n=Math.max(8,Math.ceil(Math.abs(a1-a0)*r/6)))=>{const o=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;o.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}return o;};
// a smooth hill/valley run from (x0,y0) to (x1,y1) (ease in and out)
const ease=(x0,y0,x1,y1,n=Math.max(6,Math.ceil(Math.abs(x1-x0)/8)))=>{const o=[];for(let i=0;i<=n;i++){const t=i/n;o.push([x0+(x1-x0)*t,y0+(y1-y0)*(1-Math.cos(Math.PI*t))/2]);}return o;};
Object.assign(exports,{Terrain,T,line,bez,arc,ease});
