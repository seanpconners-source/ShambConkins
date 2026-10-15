// Hole.it placement toolkit shared by the level generator and the hand-built levels.
// Every helper drops props into one items list: {k,x,z,y,yaw,on,sc,gk}. sc scales a prop (a giant duck is a
// duck at sc 4.5); gk is the goal key when it differs from the kind (big variants of a small prop).
const {KINDS}=require("src/engines/holeIt/meshes.js");
const TAU=Math.PI*2;
function makeBuilder(rnd){
 const items=[];
 const R=(k,o)=>KINDS[k].r*(o.sc||1),H=(k,o)=>KINDS[k].h*(o.sc||1);
 const add=(k,x,z,o={})=>{const it={k,x,z,y:o.y||0,yaw:o.yaw??(o.rand?rnd()*TAU:0),on:o.on??-1,sc:o.sc||1,gk:o.gk};if(o.xp)it.xp=o.xp;items.push(it);return items.length-1;};
 const B={items,add,rnd,
  // n props evenly along a straight line
  row(k,x0,z0,x1,z1,n,o={}){const yaw=o.yaw??Math.atan2(x1-x0,z1-z0);for(let i=0;i<n;i++){const t=n<2?.5:i/(n-1);add(k,x0+(x1-x0)*t,z0+(z1-z0)*t,{...o,yaw});}},
  // cols x rows block centred on (cx,cz); sp = spacing (default 2.2 radii)
  grid(k,cx,cz,cols,rows,o={}){const sp=o.sp||R(k,o)*2.2,spz=o.spz||sp;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)add(k,cx+(i-(cols-1)/2)*sp+(o.stagger&&j%2?sp/2:0),cz+(j-(rows-1)/2)*spz,o);},
  // n props on a circle, facing along it (o.face='out' points them outward)
  ring(k,cx,cz,rad,n,o={}){for(let i=0;i<n;i++){const a=(o.a0||0)+i/n*TAU;add(k,cx+Math.cos(a)*rad,cz+Math.sin(a)*rad,{...o,yaw:o.face==='out'?-a+Math.PI/2:-a});}},
  // concentric rings from r0 to r1, spacing sp
  rings(k,cx,cz,r0,r1,o={}){const sp=o.sp||R(k,o)*2.3;for(let rr=r0;rr<=r1+1e-6;rr+=o.rsp||sp){const n=Math.max(1,Math.floor(TAU*rr/sp));B.ring(k,cx,cz,rr,n,o);}},
  // rectangle outline w x d with spacing sp
  rectRing(k,cx,cz,w,d,o={}){const sp=o.sp||R(k,o)*2.3,nx=Math.max(1,Math.round(w/sp)),nz=Math.max(1,Math.round(d/sp));
   for(let i=0;i<nx;i++){add(k,cx-w/2+i*w/nx,cz-d/2,{...o,yaw:Math.PI/2});add(k,cx+w/2-i*w/nx,cz+d/2,{...o,yaw:Math.PI/2});}
   for(let j=0;j<nz;j++){add(k,cx+w/2,cz-d/2+j*d/nz,o);add(k,cx-w/2,cz+d/2-j*d/nz,o);}},
  // archimedean spiral out to radius r1
  spiral(k,cx,cz,r0,r1,o={}){const sp=o.sp||R(k,o)*2.3,b=(o.rsp||sp*1.05)/TAU;let a=o.a0||0,rr=r0;while(rr<=r1){add(k,cx+Math.cos(a)*rr,cz+Math.sin(a)*rr,{...o,yaw:-a});a+=sp/Math.max(rr,sp*.6);rr=r0+b*(a-(o.a0||0));}},
  // wavy lane(s) running along z
  snake(k,cx,cz,len,lanes,o={}){const sp=o.sp||R(k,o)*2.2,amp=o.amp??sp*.8;for(let l=0;l<lanes;l++){const x0=cx+(l-(lanes-1)/2)*(o.lsp||sp*2.6),ph=rnd()*TAU;for(let z=-len/2;z<=len/2;z+=sp*.95)add(k,x0+Math.sin(z*.6+ph)*amp,cz+z,{...o,yaw:Math.sin(z*.6+ph)*.8});}},
  // diagonal stripes inside a w x d box: stripes alternate between the listed kinds
  diag(kinds,cx,cz,w,d,o={}){const ang=o.angle??Math.PI/4,ca=Math.cos(ang),sa=Math.sin(ang),sp=o.sp||.62,rsp=o.rsp||.66,ext=Math.hypot(w,d)/2;let s=0;
   for(let v=-ext;v<=ext;v+=rsp,s++){const k=kinds[s%kinds.length];for(let u=-ext;u<=ext;u+=sp){const x=cx+u*ca-v*sa,z=cz+u*sa+v*ca;if(Math.abs(x-cx)<=w/2&&Math.abs(z-cz)<=d/2)add(k,x,z,{...o,yaw:-ang+Math.PI/2});}}},
  // random but non-overlapping scatter of n props in a disc
  scatter(k,cx,cz,rad,n,o={}){const r=R(k,o),got=[];for(let t=0;t<n*60&&got.length<n;t++){const a=rnd()*TAU,rr=Math.sqrt(rnd())*rad,x=cx+Math.cos(a)*rr,z=cz+Math.sin(a)*rr;if(got.every(p=>Math.hypot(p[0]-x,p[1]-z)>r*2.05)){got.push([x,z]);add(k,x,z,{...o,yaw:o.yaw??rnd()*TAU});}}},
  // mound: hex layers shrinking upward, each prop resting on one below
  pile(k,cx,cz,rad,o={}){const r=R(k,o),h=H(k,o),sp=r*2.05,first=items.length;let layer=0,rr=rad;const lay=[];
   while(rr>=r*.8&&layer<(o.layers||5)){const cur=[];for(let x=-rr;x<=rr;x+=sp)for(let z=-rr,row=0;z<=rr;z+=sp*.87,row++){const xx=x+(row%2?sp/2:0);if(Math.hypot(xx,z)>rr)continue;
     let on=-1;if(layer){let bd=1e9;for(const i of lay[layer-1]){const d=Math.hypot(items[i].x-cx-xx-layer*.1,items[i].z-cz-z-layer*.1);if(d<bd){bd=d;on=i;}}}
     cur.push(add(k,cx+xx+layer*.1,cz+z+layer*.1,{...o,y:layer*h*.62,on,yaw:rnd()*TAU}));}
    if(!cur.length)break;lay.push(cur);layer++;rr-=sp*.9;}
   return items.length-first;},
  // stacked column of n (dy = rise per piece)
  tower(k,x,z,n,o={}){const dy=o.dy??H(k,o)*.95;let prev=o.on??-1;for(let s=0;s<n;s++)prev=add(k,x,z,{...o,y:(o.y||0)+s*dy,on:prev});return prev;},
  // triangle of n rows pointing away from +z
  triangle(k,cx,cz,rows,o={}){const sp=o.sp||R(k,o)*2.1;for(let r=0;r<rows;r++)for(let i=0;i<=r;i++)add(k,cx+(i-r/2)*sp,cz-(rows-1-r)*sp*.87+((rows-1)*sp*.87)/2,o);},
 };
 return B;
}
// Remove items matching pred(it,index) and repair the stacks: whatever stood on a removed prop takes its place
// (height and support), so nothing is left floating.
function removeItems(items,pred){const dead=new Set();items.forEach((it,i)=>{if(pred(it,i))dead.add(i);});if(!dead.size)return;
 for(let i=0;i<items.length;i++){const it=items[i];if(dead.has(i)||it.on<0||!dead.has(it.on))continue;let j=it.on;while(j>=0&&dead.has(j))j=items[j].on;
  it.on=j;it.y=j>=0?(items[j].y||0)+KINDS[items[j].k].h*(items[j].sc||1)*.95:0;}
 const map=new Map();let n=0;const keep=[];items.forEach((it,i)=>{if(!dead.has(i)){map.set(i,n++);keep.push(it);}});
 for(const it of keep)it.on=it.on>=0?map.get(it.on):-1;items.length=0;items.push(...keep);}
// Add n more copies of kind k (scale sc) in free spots of the tray: clear of other props, islands and the start.
function topUp(B,k,n,{sc=1,gk,W,D,islands=[],start,pad=0,yaw}){const r=KINDS[k].r*sc,cell=1.2,grid=new Map(),keyOf=(x,z)=>Math.floor(x/cell)*7919+Math.floor(z/cell);
 const reach=it=>KINDS[it.k].r*(it.sc||1);for(const it of B.items){const kk=keyOf(it.x,it.z);if(!grid.has(kk))grid.set(kk,[]);grid.get(kk).push(it);}
 const free=(x,z)=>{const reachCells=2+Math.ceil(pad/cell);for(let i=-reachCells;i<=reachCells;i++)for(let j=-reachCells;j<=reachCells;j++){const l=grid.get(keyOf(x+i*cell,z+j*cell));if(l)for(const it of l)if(Math.hypot(it.x-x,it.z-z)<reach(it)+r*1.02+pad)return false;}return true;};
 let placed=0;for(let t=0;t<n*400&&placed<n;t++){const x=(B.rnd()-.5)*(W-r*2.4),z=(B.rnd()-.5)*(D-r*2.4);
  if(islands.some(o=>insideRect(x,z,o,r+.2))||(start&&Math.hypot(x-start.x,z-start.z)<2+r)||!free(x,z))continue;
  B.add(k,x,z,{sc,gk,yaw:yaw??B.rnd()*TAU});const it=B.items[B.items.length-1],kk=keyOf(x,z);if(!grid.has(kk))grid.set(kk,[]);grid.get(kk).push(it);placed++;}
 return placed;}
const insideRect=(x,z,r,m=0)=>x>r[0]-m&&x<r[2]+m&&z>r[1]-m&&z<r[3]+m;
Object.assign(exports,{topUp,makeBuilder,removeItems,insideRect,TAU});
