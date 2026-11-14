// Sitabout Mini Golf: the ball physics and the course compiler (pure: no DOM, no game state, so the CPU golfer, the aim
// preview and tests/minigolf-sim.mjs run the very same code as the game).
// World units: the ball's radius is 1 (about 2 cm); x right, y toward the tee (holes are drawn tee at the bottom, cup at
// the top), z up. Time in seconds; the hole clock T drives every moving obstacle, so a shot from the same lie at the same
// T always rolls the same way (fixed 240 Hz steps).
//
// A hole (src/engines/minigolf/courses.js) is made of
//  greens:  ground pieces {pts, z | zy:[y0,z0,y1,z1] | zx:[x0,z0,x1,z1] | plane:[a,b,c], type, hills, open, drop, rail}
//           (type turf / sand / ice / rough / water / out; hills [[x,y,r,h]] = round bumps, h<0 = dips; edges get a
//           rail unless listed in `open` or shared with a green at the same height; drop:true = no rail where the green
//           ends over lower ground, so the ball rolls off and falls)
//  blocks:  solid boxes [{pts,h}], bumpers [[x,y,r,kick]], boost pads [{pts,dir:[dx,dy],v}], tunnels [{a,r,b,dir,v}],
//           magnets [{x,y,r,k}], tramps [{x,y,r,vz}], conveyors [{pts,v:[vx,vy]}]
//  movers:  windmill, slider, spinner, gate, gator, gophers (see moverParts)
const BALL_R=1,CUP_R=2.3,HZ=240,DT=1/HZ,GRAV=520,STEP_UP=.55,MAX_ROLL=24;
const SURF={turf:{mu:46,lin:.32,e:.72},rough:{mu:120,lin:1.2,e:.6},sand:{mu:300,lin:3.4,e:.35},ice:{mu:7,lin:.04,e:.8},water:{mu:46,lin:.3,e:.5},out:{mu:200,lin:2,e:.4},boost:{mu:30,lin:.2,e:.75},carpet:{mu:56,lin:.42,e:.7}};
const RAIL_H=2.2;

const hashN=(...a)=>{let h=2166136261;for(const v of a){h^=(v|0);h=Math.imul(h,16777619);h^=h>>>13;}return (h>>>0)/4294967296;};
function inPoly(p,x,y){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
const bboxOf=p=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const [x,y] of p){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}return [x0,y0,x1,y1];};
const R=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
// a regular polygon / circle as points (for round greens, ponds, islands)
const circ=(cx,cy,rx,ry=rx,n=20,a0=0)=>Array.from({length:n},(_,i)=>{const a=a0+i/n*Math.PI*2;return [+(cx+Math.cos(a)*rx).toFixed(2),+(cy+Math.sin(a)*ry).toFixed(2)];});

function planeOf(g){
 if(Array.isArray(g.plane))return g.plane;
 if(Array.isArray(g.zy)){const [y0,z0,y1,z1]=g.zy,c=(z1-z0)/(y1-y0);return [z0-c*y0,0,c];}
 if(Array.isArray(g.zx)){const [x0,z0,x1,z1]=g.zx,b=(z1-z0)/(x1-x0);return [z0-b*x0,b,0];}
 return [g.z||0,0,0];
}
function surfZ(g,x,y){let z=g.a+g.b*x+g.c*y;if(g.hills)for(const [hx,hy,r,h] of g.hills){const d2=((x-hx)**2+(y-hy)**2)/(r*r);if(d2<9)z+=h*Math.exp(-d2);}return z;}
function surfGrad(g,x,y){let gx=g.b,gy=g.c;if(g.hills)for(const [hx,hy,r,h] of g.hills){const dx=x-hx,dy=y-hy,d2=(dx*dx+dy*dy)/(r*r);if(d2<9){const e=h*Math.exp(-d2)*-2/(r*r);gx+=e*dx;gy+=e*dy;}}return [gx,gy];}

// ---------------------------------------------------------------- compile a hole once (cached on the hole object)
function compile(hole){
 if(hole._c)return hole._c;
 const greens=(hole.greens||[]).map((g,i)=>{const [a,b,c]=planeOf(g);return {...g,i,a,b,c,pts:g.pts,box:bboxOf(g.pts),type:g.type||'turf',s:SURF[g.type||'turf']||SURF.turf,rail:g.rail??RAIL_H};});
 for(const w of hole.water||[]){const [a,b,c]=planeOf({z:w.z??-3});greens.push({pts:w.pts,i:greens.length,a,b,c,box:bboxOf(w.pts),type:'water',s:SURF.water,rail:0,water:true,open:'all'});}
 const C={hole,greens,segs:[],bumpers:[],blocks:[],boost:[],tunnels:[],magnets:[],tramps:[],conv:[],movers:hole.movers||[],G:GRAV*(hole.G||1)};
 // ground under a point: the highest piece at or below zMax (ties go to the piece listed later, so sand/ice/boost
 // overlays win over the turf they sit on). Water cuts a hole through every green except bridges (bridge:true).
 const wet=greens.filter(g=>g.water),dry=greens.filter(g=>!g.water);
 const look=(x,y,zMax)=>{let pond=null;for(const w of wet)if(x>=w.box[0]&&x<=w.box[2]&&y>=w.box[1]&&y<=w.box[3]&&inPoly(w.pts,x,y)){pond=w;break;}
  let best=null,bz=-1e9;for(const g of dry){if(x<g.box[0]||x>g.box[2]||y<g.box[1]||y>g.box[3]||!inPoly(g.pts,x,y))continue;const z=surfZ(g,x,y);if(pond&&!g.bridge)continue;if(z<=zMax&&z>=bz){bz=z;best=g;}}
  if(!best&&pond){const z=pond.a;if(z<=zMax)return {g:pond,z};}
  return best?{g:best,z:bz}:null;};
 const groundStatic=look;
 C.topAt=(x,y)=>look(x,y,1e9);
 // edges: rails + cliff faces. Each edge is cut into short pieces and every piece is classed by what lies just outside
 // it (nothing / a green at the same height / lower / higher), so greens can be drawn as overlapping rectangles: where
 // two pieces at one height overlap there is no wall, everywhere else there is a rail (or a drop for drop:true greens).
 for(const g of greens){const p=g.pts,openAll=g.open==='all';g.edges=[];
  for(let i=0;i<p.length;i++){const A=p[i],B=p[(i+1)%p.length],ex=B[0]-A[0],ey=B[1]-A[1],L=Math.hypot(ex,ey);if(L<1e-6)continue;
   let nx=ey/L,ny=-ex/L;const mx=(A[0]+B[0])/2,my=(A[1]+B[1])/2;if(inPoly(p,mx+nx*.05,my+ny*.05)){nx=-nx;ny=-ny;}
   const n=Math.max(1,Math.ceil(L/1.5)),cls=[];
   for(let k=0;k<n;k++){const f=(k+.5)/n,x=A[0]+ex*f,y=A[1]+ey*f,zm=surfZ(g,x,y),o=C.topAt(x+nx*.4,y+ny*.4);
    const same=!!o&&o.g!==g&&Math.abs(o.z-zm)<.3&&!o.g.water,lower=!same&&!!o&&o.z<zm-.3;
    const open=openAll||(Array.isArray(g.open)&&g.open.includes(i))||same||(g.drop&&lower)||(g.drop==='all');
    cls.push((same?'s':'c')+(open||g.water||!(g.rail>0)?'o':'r'));}
   for(let k=0;k<n;){let j=k;while(j+1<n&&cls[j+1]===cls[k])j++;const f0=k/n,f1=(j+1)/n,P={x1:A[0]+ex*f0,y1:A[1]+ey*f0,x2:A[0]+ex*f1,y2:A[1]+ey*f1};
    const z1=surfZ(g,P.x1,P.y1),z2=surfZ(g,P.x2,P.y2),c=cls[k];
    if(c[0]==='c'&&!g.water)C.segs.push({...P,t1:z1,t2:z2,kind:'cliff',e:.5,g});
    if(c[1]==='r')C.segs.push({...P,t1:z1+g.rail,t2:z2+g.rail,kind:'rail',e:g.s.e,g,nx,ny});
    g.edges.push({...P,nx,ny,rail:c[1]==='r',same:c[0]==='s',z1,z2});k=j+1;}
  }}
 for(const b of hole.blocks||[]){const box=bboxOf(b.pts),cx=(box[0]+box[2])/2,cy=(box[1]+box[3])/2,gr=C.topAt(cx,cy),base=b.z??(gr?gr.z:0);const blk={...b,base,top:base+(b.h||3),box};C.blocks.push(blk);
  const p=b.pts;for(let i=0;i<p.length;i++){const A=p[i],B=p[(i+1)%p.length];C.segs.push({x1:A[0],y1:A[1],x2:B[0],y2:B[1],t1:blk.top,t2:blk.top,kind:'block',e:b.e??.6,blk});}}
 for(const [x,y,r,kick] of hole.bumpers||[]){const gr=C.topAt(x,y);C.bumpers.push({x,y,r,kick:kick??140,z:gr?gr.z:0,hit:-9});}
 for(const b of hole.boost||[])C.boost.push({...b,box:bboxOf(b.pts),dir:norm(b.dir),v:b.v||260});
 for(const t of hole.tunnels||[])C.tunnels.push({...t,r:t.r||2.6,dir:norm(t.dir||[0,-1]),z:(C.topAt(t.a[0],t.a[1])||{z:0}).z,zb:(C.topAt(t.b[0],t.b[1])||{z:0}).z});
 for(const m of hole.magnets||[])C.magnets.push({...m});
 for(const t of hole.tramps||[])C.tramps.push({...t,z:(C.topAt(t.x,t.y)||{z:0}).z});
 for(const c of hole.conveyors||[])C.conv.push({...c,box:bboxOf(c.pts)});
 const cg=C.topAt(hole.cup[0],hole.cup[1]);C.cupZ=cg?cg.z:0;C.cupG=cg?cg.g:null;
 C.ground=(x,y,zMax)=>groundStatic(x,y,zMax);
 C.bbox=bboxOf(greens.flatMap(g=>g.pts));
 // static walls bucketed in 6-unit cells (a ball only tests the walls near it)
 const GS=6,grid=new Map();C.grid=grid;C.gs=GS;
 for(const s of C.segs){const x0=Math.floor((Math.min(s.x1,s.x2)-1.6)/GS),x1=Math.floor((Math.max(s.x1,s.x2)+1.6)/GS),y0=Math.floor((Math.min(s.y1,s.y2)-1.6)/GS),y1=Math.floor((Math.max(s.y1,s.y2)+1.6)/GS);
  for(let i=x0;i<=x1;i++)for(let j=y0;j<=y1;j++){const k=i*4096+j;let l=grid.get(k);if(!l)grid.set(k,l=[]);l.push(s);}}
 C.near=(x,y)=>grid.get(Math.floor(x/GS)*4096+Math.floor(y/GS))||EMPTY;
 hole._c=C;return C;
}
const EMPTY=[],NOPARTS={segs:[],hazards:[]};
const norm=([x,y])=>{const l=Math.hypot(x,y)||1;return [x/l,y/l];};

// ---------------------------------------------------------------- moving parts at hole time T
// windmill {x,y,w,r,speed,blades}: a house across the lane; its door (w wide, centred on x at y) is shut while a blade
//   points down. slider {pts,a:[dx,dy],period,ph}: a box gliding a->+a and back. spinner {x,y,len,speed}: a bar turning
//   flat on the green. gate {a,b,period,ph,duty}: a bar that is shut for `duty` of each period. gator {path,speed,r}: an
//   alligator swimming a loop; touching it = chomp. gophers {holes,period}: one gopher pops up at a time.
function moverParts(C,T){
 const segs=[],hazards=[];
 for(const [mi,m] of C.movers.entries()){
  if(m.kind==='windmill'){const n=m.blades||4,a=T*(m.speed||1.4)+(m.ph||0);let shut=0;for(let k=0;k<n;k++){let d=((a+k*Math.PI*2/n)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);d=Math.abs(d-Math.PI/2);shut=Math.max(shut,1-d/.42);}
   if(shut>0){const hw=m.w/2;segs.push({x1:m.x-hw,y1:m.y,x2:m.x+hw,y2:m.y,t1:99,t2:99,kind:'blade',e:.55,vx:0,vy:0});}}
  else if(m.kind==='slider'){const per=m.period||3,ph=(m.ph||0),f=.5-.5*Math.cos((T/per+ph)*Math.PI*2),df=Math.PI/per*Math.sin((T/per+ph)*Math.PI*2);const ox=m.a[0]*f,oy=m.a[1]*f,vx=m.a[0]*df,vy=m.a[1]*df;
   const p=m.pts;for(let i=0;i<p.length;i++){const A=p[i],B=p[(i+1)%p.length];segs.push({x1:A[0]+ox,y1:A[1]+oy,x2:B[0]+ox,y2:B[1]+oy,t1:99,t2:99,kind:'slider',e:.6,vx,vy});}}
  else if(m.kind==='spinner'){const a=T*(m.speed||1.5)+(m.ph||0),c=Math.cos(a),s=Math.sin(a),L=m.len,w=m.speed||1.5;
   segs.push({x1:m.x-c*L,y1:m.y-s*L,x2:m.x+c*L,y2:m.y+s*L,t1:99,t2:99,kind:'spinner',e:.65,spin:{x:m.x,y:m.y,w}});}
  else if(m.kind==='gate'){const per=m.period||3,f=((T/per+(m.ph||0))%1+1)%1;if(f<(m.duty??.5))segs.push({x1:m.a[0],y1:m.a[1],x2:m.b[0],y2:m.b[1],t1:99,t2:99,kind:'gate',e:.5,vx:0,vy:0});}
  else if(m.kind==='gator'){const p=gatorAt(m,T);hazards.push({kind:'gator',x:p.x,y:p.y,r:m.r||3.2,mi});}
  else if(m.kind==='gophers'){const g=gopherAt(m,T,mi);if(g&&g.up>.5)hazards.push({kind:'gopher',x:g.x,y:g.y,r:2.2,mi,slot:g.slot});}
 }
 return {segs,hazards};
}
function pathPoint(path,f){let L=0;const seg=[];for(let i=0;i<path.length;i++){const a=path[i],b=path[(i+1)%path.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);seg.push([a,b,l]);L+=l;}
 let d=((f%1)+1)%1*L;for(const [a,b,l] of seg){if(d<=l){const k=l?d/l:0;return {x:a[0]+(b[0]-a[0])*k,y:a[1]+(b[1]-a[1])*k,ang:Math.atan2(b[1]-a[1],b[0]-a[0])};}d-=l;}return {x:path[0][0],y:path[0][1],ang:0};}
function gatorAt(m,T){let L=0;for(let i=0;i<m.path.length;i++){const a=m.path[i],b=m.path[(i+1)%m.path.length];L+=Math.hypot(b[0]-a[0],b[1]-a[1]);}return pathPoint(m.path,T*(m.speed||10)/L+(m.ph||0));}
// gophers: time is cut into slots; in each slot one hole (picked by hash) has a gopher up for the middle of the slot
function gopherAt(m,T,mi=0){const per=m.period||2.4,slot=Math.floor(T/per),f=T/per-slot,i=Math.floor(hashN(slot,mi,77)*m.holes.length),h=m.holes[i];
 const up=f<.12||f>.78?0:Math.min(1,(f-.12)/.1,(.78-f)/.1);return {x:h[0],y:h[1],up,slot,i};}

// ---------------------------------------------------------------- one ball
function newBall(x,y,C){const g=C?C.topAt(x,y):null;return {x,y,z:g?g.z:0,vx:0,vy:0,vz:0,air:false,rest:true,t:0,still:0,inCup:false,cupT:0,lastTun:-9,lipT:-9,lip:false,spin:0};}
// fire a ball: speed in units/s
function launch(b,vx,vy){b.vx=vx;b.vy=vy;b.vz=0;b.rest=false;b.t=0;b.still=0;b.lip=false;b.cupIn=false;b.maxSp=Math.hypot(vx,vy);}

function closest(s,x,y){const ex=s.x2-s.x1,ey=s.y2-s.y1,L2=ex*ex+ey*ey||1e-9;let u=((x-s.x1)*ex+(y-s.y1)*ey)/L2;u=u<0?0:u>1?1:u;return [s.x1+ex*u,s.y1+ey*u,u];}

// advance the ball by DT at hole time T; ev(kind,data) gets events: wall, bumper, boost, tunnel, tramp, land, splash,
// ob, chomp, gopher, lip, sink, stop
function stepBall(C,b,T,ev,parts){
 if(b.rest||b.inCup)return;
 const sp0=Math.hypot(b.vx,b.vy),n=Math.max(1,Math.ceil(sp0*DT/.45));const h=DT/n;
 parts=parts||(C.movers.length?moverParts(C,T):NOPARTS);
 for(let k=0;k<n;k++){
  if(!b.air){
   const gr=C.ground(b.x,b.y,b.z+STEP_UP);
   if(!gr){b.air=true;}
   else{
    const g=gr.g;b.z=gr.z;
    if(g.water){ev('splash',{x:b.x,y:b.y});return;}
    if(g.type==='out'){ev('ob',{x:b.x,y:b.y});return;}
    const [gx,gy]=surfGrad(g,b.x,b.y),G=C.G*.714;
    b.vx-=G*gx*h;b.vy-=G*gy*h;
    // conveyors push toward their speed
    for(const cv of C.conv)if(b.x>=cv.box[0]&&b.x<=cv.box[2]&&b.y>=cv.box[1]&&b.y<=cv.box[3]&&inPoly(cv.pts,b.x,b.y)){b.vx+=(cv.v[0]-b.vx)*Math.min(1,4*h);b.vy+=(cv.v[1]-b.vy)*Math.min(1,4*h);}
    const sp=Math.hypot(b.vx,b.vy),dec=(g.s.mu+sp*g.s.lin)*h;
    if(sp>dec){b.vx*=(sp-dec)/sp;b.vy*=(sp-dec)/sp;}else{const slopeA=G*Math.hypot(gx,gy);b.vx=0;b.vy=0;if(slopeA<g.s.mu*1.05)b.still+=h;}
    b.vz=gx*b.vx+gy*b.vy;
    for(const p of C.boost)if(b.x>=p.box[0]&&b.x<=p.box[2]&&b.y>=p.box[1]&&b.y<=p.box[3]&&inPoly(p.pts,b.x,b.y)){const along=b.vx*p.dir[0]+b.vy*p.dir[1];if(along<p.v){b.vx+=p.dir[0]*(p.v-along)*Math.min(1,10*h);b.vy+=p.dir[1]*(p.v-along)*Math.min(1,10*h);if(!b.boostT||b.t-b.boostT>.5){b.boostT=b.t;ev('boost',{x:b.x,y:b.y});}}}
   }
  }
  if(b.air){b.vz-=C.G*h;}
  const px=b.x,py=b.y,pz=b.z;
  b.x+=b.vx*h;b.y+=b.vy*h;if(b.air)b.z+=b.vz*h;
  if(!b.air){
   const g2=C.ground(b.x,b.y,b.z+b.vz*h+STEP_UP);
   if(!g2)b.air=true;
   else if(g2.z<b.z+b.vz*h-.12){b.air=true;b.z+=b.vz*h;}
   else b.z=g2.z;
  }else{
   const g=C.ground(b.x,b.y,Math.max(b.z,pz)+.05);
   if(g&&b.z<=g.z){
    if(g.g.water){ev('splash',{x:b.x,y:b.y});return;}
    if(g.g.type==='out'){ev('ob',{x:b.x,y:b.y});return;}
    const [gx,gy]=surfGrad(g.g,b.x,b.y),vs=gx*b.vx+gy*b.vy,rel=b.vz-vs;
    b.z=g.z;
    if(rel<-70){b.vz=vs-rel*.38;b.vx*=.86;b.vy*=.86;ev('land',{x:b.x,y:b.y,hard:-rel});}
    else{b.air=false;b.vz=vs;b.vx*=.93;b.vy*=.93;if(rel<-25)ev('land',{x:b.x,y:b.y,hard:-rel});}
   }
   if(b.z<-80){ev('ob',{x:b.x,y:b.y,fell:true});return;}
  }
  // walls (static + moving): push out of any segment whose top is above the ball's bottom
  for(let pass=0;pass<2;pass++){
   const list=pass?parts.segs:C.near(b.x,b.y);
   for(const s of list){
    if(Math.max(s.x1,s.x2)<b.x-1.5||Math.min(s.x1,s.x2)>b.x+1.5||Math.max(s.y1,s.y2)<b.y-1.5||Math.min(s.y1,s.y2)>b.y+1.5)continue;
    const [qx,qy,u]=closest(s,b.x,b.y),top=s.t1+(s.t2-s.t1)*u;if(b.z>=top-.25)continue;
    let dx=b.x-qx,dy=b.y-qy,d=Math.hypot(dx,dy);if(d>=BALL_R)continue;
    if(d<1e-6){const ex=s.x2-s.x1,ey=s.y2-s.y1,l=Math.hypot(ex,ey)||1;dx=-ey/l;dy=ex/l;if((px-qx)*dx+(py-qy)*dy<0){dx=-dx;dy=-dy;}d=0;}else{dx/=d;dy/=d;}
    b.x=qx+dx*BALL_R;b.y=qy+dy*BALL_R;
    let wvx=s.vx||0,wvy=s.vy||0;if(s.spin){wvx=-s.spin.w*(qy-s.spin.y);wvy=s.spin.w*(qx-s.spin.x);}
    const rvx=b.vx-wvx,rvy=b.vy-wvy,vn=rvx*dx+rvy*dy;
    if(vn<0){const e=s.e;b.vx-=(1+e)*vn*dx;b.vy-=(1+e)*vn*dy;const tx=-dy,ty=dx,vt=b.vx*tx+b.vy*ty;b.vx-=vt*tx*.04;b.vy-=vt*ty*.04;b.spin+=vt*.05;if(-vn>8)ev('wall',{x:qx,y:qy,v:-vn,kind:s.kind});}
    else if(s.vx||s.vy||s.spin){/* the wall is catching up with a slow ball: carry it */const push=-(vn);if(push>0){b.vx+=push*dx;b.vy+=push*dy;}}
   }
  }
  for(const p of C.bumpers){if(b.z>p.z+3)continue;const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),rr=p.r+BALL_R;if(d<rr&&d>1e-6){const nx=dx/d,ny=dy/d;b.x=p.x+nx*rr;b.y=p.y+ny*rr;const vn=b.vx*nx+b.vy*ny;if(vn<0){b.vx-=vn*nx;b.vy-=vn*ny;}const out=Math.max(-vn*.9,p.kick);b.vx+=nx*out;b.vy+=ny*out;ev('bumper',{x:p.x,y:p.y,i:C.bumpers.indexOf(p)});}}
  for(const hz of parts.hazards){const dx=b.x-hz.x,dy=b.y-hz.y,d=Math.hypot(dx,dy);if(d>hz.r+BALL_R||b.z>(C.topAt(hz.x,hz.y)?.z||0)+3)continue;
   if(hz.kind==='gator'){ev('chomp',{x:hz.x,y:hz.y});return;}
   if(hz.kind==='gopher'&&b.gopherSlot!==hz.slot){b.gopherSlot=hz.slot;const a=hashN(hz.slot,hz.mi,5)*Math.PI*2,v=Math.max(50,Math.hypot(b.vx,b.vy)*.9);b.vx=Math.cos(a)*v;b.vy=Math.sin(a)*v;ev('gopher',{x:hz.x,y:hz.y});}}
  if(!b.air){
   for(const t of C.tunnels){if(b.t-b.lastTun<.4)continue;const d=Math.hypot(b.x-t.a[0],b.y-t.a[1]);if(d<t.r&&Math.abs(b.z-t.z)<1.5){const v=Math.max(t.v||0,Math.hypot(b.vx,b.vy)*.92,40);b.x=t.b[0];b.y=t.b[1];b.z=t.zb;b.vx=t.dir[0]*v;b.vy=t.dir[1]*v;b.lastTun=b.t;ev('tunnel',{x:t.a[0],y:t.a[1],to:t.b});break;}}
   for(const t of C.tramps){const d=Math.hypot(b.x-t.x,b.y-t.y);if(d<t.r&&b.z<t.z+.5){b.air=true;b.vz=t.vz||150;b.z=t.z+.6;ev('tramp',{x:t.x,y:t.y});}}
  }
  for(const m of C.magnets){const dx=m.x-b.x,dy=m.y-b.y,d=Math.hypot(dx,dy);if(d<m.r&&d>.5){const a=(m.k||300)*(1-d/m.r)*h;b.vx+=dx/d*a;b.vy+=dy/d*a;b.still=0;}}
  // the cup
  const cx=C.hole.cup[0],cy=C.hole.cup[1],dx=cx-b.x,dy=cy-b.y,d=Math.hypot(dx,dy);
  if(d<CUP_R&&b.z<C.cupZ+1.2){
   const sp=Math.hypot(b.vx,b.vy),pull=820*(1-d/CUP_R)*h;b.vx+=dx/(d||1)*pull;b.vy+=dy/(d||1)*pull;
   const cap=58*(1.15-.55*d/CUP_R);
   if(d<CUP_R-.55*BALL_R){b.lip=true;if(sp<cap){b.inCup=true;b.vx=b.vy=0;ev('sink',{speed:sp});return;}}
  }else if(b.lip&&d>=CUP_R){b.lip=false;b.vx*=.72;b.vy*=.72;const a=(hashN(Math.round(b.x*10),Math.round(b.y*10))-.5)*.5,c=Math.cos(a),s=Math.sin(a),vx=b.vx;b.vx=vx*c-b.vy*s;b.vy=vx*s+b.vy*c;ev('lip',{x:cx,y:cy});}
 }
 b.t+=DT;
 const sp=Math.hypot(b.vx,b.vy);
 if(!b.air&&sp<1.5)b.still+=DT;else if(sp>3)b.still=0;
 if(!b.air&&(b.still>.22||b.t>MAX_ROLL)){b.vx=b.vy=0;b.rest=true;ev('stop',{x:b.x,y:b.y});}
}

// Run a whole shot (for the CPU and tests). Returns {kind:'sink'|'stop'|'splash'|'ob'|'chomp', x,y, t, events}
function runShot(C,lie,vx,vy,T0,maxT=MAX_ROLL){
 const b=newBall(lie.x,lie.y,C);b.z=lie.z??b.z;launch(b,vx,vy);let out=null,T=T0,walls=0;
 const ev=(k,d)=>{if(k==='wall')walls++;else if(k==='sink'||k==='splash'||k==='ob'||k==='chomp'||k==='stop')out={kind:k==='stop'?'stop':k,x:b.x,y:b.y};};
 const steps=Math.ceil(maxT*HZ);for(let i=0;i<steps&&!out;i++){stepBall(C,b,T,ev);T+=DT;}
 if(!out)out={kind:'stop',x:b.x,y:b.y};out.t=T-T0;out.walls=walls;out.z=b.z;return out;
}

// Path distance from (x,y) to the cup over the greens (a coarse grid flood), so the CPU knows that 'near the cup through
// a wall' is not near. Cached per hole.
function cupField(C){
 if(C._field)return C._field;
 const [x0,y0,x1,y1]=C.bbox,S=2,W=Math.ceil((x1-x0)/S)+1,H=Math.ceil((y1-y0)/S)+1,dist=new Float32Array(W*H).fill(1e9),ok=new Uint8Array(W*H);
 for(let j=0;j<H;j++)for(let i=0;i<W;i++){const x=x0+i*S,y=y0+j*S,g=C.topAt(x,y);ok[j*W+i]=g&&!g.g.water&&g.g.type!=='out'?1:0;}
 const blocked=(ax,ay,bx,by)=>{for(const s of C.segs){if(s.kind==='cliff'&&!s.g)continue;if(segX(ax,ay,bx,by,s.x1,s.y1,s.x2,s.y2))return s;}return null;};
 const ci=Math.round((C.hole.cup[0]-x0)/S),cj=Math.round((C.hole.cup[1]-y0)/S),q=[];if(ci>=0&&cj>=0&&ci<W&&cj<H){dist[cj*W+ci]=0;q.push(cj*W+ci);}
 // Dijkstra-ish (BFS with 8 neighbours, few hundred cells: fine)
 const nb=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
 const flood=()=>{for(let qi=0;qi<q.length;qi++){const c=q[qi],i=c%W,j=(c-i)/W,ax=x0+i*S,ay=y0+j*S,za=(C.topAt(ax,ay)||{z:0}).z;
  for(const [di,dj,w] of nb){const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=W||nj>=H)continue;const n=nj*W+ni;if(!ok[n])continue;const nd=dist[c]+w*S;if(nd>=dist[n])continue;const bx=x0+ni*S,by=y0+nj*S;
   const s=blocked(ax,ay,bx,by);if(s){const zb=(C.topAt(bx,by)||{z:0}).z;/* rolling off a drop edge toward the cup side is fine, climbing a cliff is not */ if(s.kind!=='cliff'||za>zb+.3)continue;}
   dist[n]=nd;q.push(n);}}};
 flood();
 // a tunnel's mouth is as close as where it comes out
 const cell=(x,y)=>{const i=Math.round((x-x0)/S),j=Math.round((y-y0)/S);return i<0||j<0||i>=W||j>=H?-1:j*W+i;};
 const links=C.tunnels.map(t=>[t.a[0],t.a[1],t.b[0]+t.dir[0]*3,t.b[1]+t.dir[1]*3]).concat(C.hole.links||[]);
 for(let r=0;r<3;r++){q.length=0;for(const L of links){const a=cell(L[0],L[1]),b=cell(L[2],L[3]);if(a<0||b<0||dist[b]>=1e9)continue;if(dist[b]+4<dist[a]){dist[a]=dist[b]+4;q.push(a);}}if(!q.length)break;flood();}
 const f=(x,y)=>{const i=Math.round((x-x0)/S),j=Math.round((y-y0)/S);if(i<0||j<0||i>=W||j>=H)return 999;const d=dist[j*W+i];return d>=1e9?999:d;};
 C._field=f;return f;
}
function segX(ax,ay,bx,by,cx,cy,dx,dy){const d=(bx-ax)*(dy-cy)-(by-ay)*(dx-cx);if(Math.abs(d)<1e-9)return false;const u=((cx-ax)*(dy-cy)-(cy-ay)*(dx-cx))/d,v=((cx-ax)*(by-ay)-(cy-ay)*(bx-ax))/d;return u>=0&&u<=1&&v>=0&&v<=1;}

// The aim preview: a straight ray from the ball that bounces off the first wall (ignores slopes, like the pro games'
// guide line). Returns points [[x,y],...] covering `len` units.
function aimRay(C,x,y,dx,dy,len,T){
 const pts=[[x,y]];let left=len,bounces=0;const segs=C.segs.filter(s=>s.kind!=='cliff').concat(moverParts(C,T).segs);
 while(left>.5&&bounces<2){let best=1e9,bs=null;
  for(const s of segs){const ex=s.x2-s.x1,ey=s.y2-s.y1,L=Math.hypot(ex,ey)||1;let nx=-ey/L,ny=ex/L;if(nx*dx+ny*dy>0){nx=-nx;ny=-ny;}
   const ox=s.x1+nx*BALL_R,oy=s.y1+ny*BALL_R,den=dx*ey-dy*ex;if(Math.abs(den)<1e-9)continue;const t=((ox-x)*ey-(oy-y)*ex)/den,u=((ox-x)*dy-(oy-y)*dx)/den;if(t>.01&&t<best&&u>=-.02&&u<=1.02){best=t;bs={nx,ny};}}
  const go=Math.min(left,best);x+=dx*go;y+=dy*go;pts.push([x,y]);left-=go;if(!bs||best>left+go-1e-6)break;const vn=dx*bs.nx+dy*bs.ny;dx-=2*vn*bs.nx;dy-=2*vn*bs.ny;bounces++;}
 return pts;
}

Object.assign(exports,{BALL_R,CUP_R,HZ,DT,SURF,R,circ,compile,surfZ,surfGrad,inPoly,bboxOf,moverParts,gatorAt,gopherAt,newBall,launch,stepBall,runShot,cupField,aimRay,hashN,MAX_ROLL});
