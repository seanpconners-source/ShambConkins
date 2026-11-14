// Paddy's Pool physics (src/engines/paddysPool.js). Units = inches and seconds, table centre (0,0), x along the long
// rail, y DOWN the screen (z points INTO the table, so the cloth contact point is at +z*R). Real-ish ball model:
// every ball has velocity v and spin w (3D); it slides (cloth friction works on the contact point, 7/2 rule) until the
// contact point stops, then rolls. So stun, follow and draw come out of the impact on their own; side spin (wz) bends the
// rebound off a cushion. Cushions are segments with knuckles and angled pocket jaws; a ball whose centre gets deep enough
// into a pocket drops. Table quirks (the ratty Paddy's table): dead cushions, a slope that drifts slow balls, torn felt
// patches that grab balls. Pure functions: Node-testable (tests/pool-rules.mjs), used by the CPU to try shots.
const R=1.125,G=386,HX=44,HY=22;               // 8-ft table: 88 x 44 between the cushion noses
const MU_S=.2,MU_R=.012,SPIN_DECEL=9,E_BALL=.94,MU_CUSH=.18;
const DT=1/480;
const CORNER=3.65,SIDE=2.75,JAW=2.6;           // jaw points: corner = this far from the corner along each rail; side = half mouth
function rot(v,deg){const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [v[0]*c-v[1]*s,v[0]*s+v[1]*c];}
function buildTable(opt={}){
 const segs=[],pockets=[];
 const seg=(a,b,kind='nose')=>segs.push({a,b,kind});
 // noses
 seg([-HX+CORNER,-HY],[-SIDE,-HY]);seg([SIDE,-HY],[HX-CORNER,-HY]);
 seg([-HX+CORNER,HY],[-SIDE,HY]);seg([SIDE,HY],[HX-CORNER,HY]);
 seg([-HX,-HY+CORNER],[-HX,HY-CORNER]);seg([HX,-HY+CORNER],[HX,HY-CORNER]);
 // corner pockets: jaws at 142 deg to the nose, back wall behind the capture point
 for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
  const pA=[sx*(HX-CORNER),sy*HY],pB=[sx*HX,sy*(HY-CORNER)];
  // along the long rail the nose runs away from the pocket = -sx; outward = sy
  const dA=[Math.cos(142*Math.PI/180)*-sx,Math.sin(142*Math.PI/180)*sy];
  const dB=[Math.sin(142*Math.PI/180)*sx,Math.cos(142*Math.PI/180)*-sy];
  const eA=[pA[0]+dA[0]*JAW,pA[1]+dA[1]*JAW],eB=[pB[0]+dB[0]*JAW,pB[1]+dB[1]*JAW];
  seg(pA,eA,'jaw');seg(pB,eB,'jaw');seg(eA,eB,'back');
  const c=[sx*(HX+.75),sy*(HY+.75)];
  pockets.push({x:c[0],y:c[1],r:2.45,kind:'corner',mouth:[[pA[0],pA[1]],[pB[0],pB[1]]],jaw:[eA,eB],dir:[sx,sy]});
 }
 for(const sy of [-1,1]){
  const pL=[-SIDE,sy*HY],pR=[SIDE,sy*HY],th=100*Math.PI/180;
  const dL=[-Math.cos(th)*-1,Math.sin(th)*sy],dR=[-Math.cos(th),Math.sin(th)*sy];   // lean in a touch (narrower behind)
  const eL=[pL[0]+dL[0]*JAW,pL[1]+dL[1]*JAW],eR=[pR[0]+dR[0]*JAW,pR[1]+dR[1]*JAW];
  seg(pL,eL,'jaw');seg(pR,eR,'jaw');seg(eL,eR,'back');
  pockets.push({x:0,y:sy*(HY+1.7),r:2.35,kind:'side',mouth:[pL,pR],jaw:[eL,eR],dir:[0,sy]});
 }
 for(const s of segs){const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1],L=Math.hypot(dx,dy);s.L=L;s.t=[dx/L,dy/L];}
 return {HX,HY,R,segs,pockets,
  ecush:opt.ecush??.8,          // cushion bounce
  slope:opt.slope||[0,0],       // in/s^2 drift on slow balls
  rough:opt.rough||[],          // torn felt: [{x,y,r,k}] k = extra rolling friction factor
  cloth:opt.cloth??1};          // cloth speed (rolling friction divisor)
}
// ---------------------------------------------------------------- balls
const IDENT=()=>[1,0,0,0,1,0,0,0,1];
function makeBall(id,x,y){return {id,x,y,vx:0,vy:0,wx:0,wy:0,wz:0,on:true,sink:0,pocket:-1,o:IDENT(),moving:false};}
// standard racks; `rand` shuffles where the rules allow it
function rack(game,rand=Math.random){
 const balls=[makeBall(0,-HX/2,0)],foot=HX/2,dx=R*2*Math.cos(Math.PI/6)+.003,dy=R*2+.003;
 const spots=[];
 if(game==='nine'){const rows=[1,2,3,2,1];rows.forEach((n,c)=>{for(let r=0;r<n;r++)spots.push([foot+c*dx,(r-(n-1)/2)*dy]);});
  // 1 at the apex, 9 in the middle, the rest shuffled
  const rest=[2,3,4,5,6,7,8].sort(()=>rand()-.5),order=[1,rest[0],rest[1],rest[2],9,rest[3],rest[4],rest[5],rest[6]];
  spots.forEach((p,i)=>balls.push(makeBall(order[i],p[0],p[1])));}
 else{for(let c=0;c<5;c++)for(let r=0;r<=c;r++)spots.push([foot+c*dx,(r-c/2)*dy]);
  // 8 in the middle of row 3, a solid and a stripe in the back corners, the rest shuffled
  const solids=[1,2,3,4,5,6,7].sort(()=>rand()-.5),stripes=[9,10,11,12,13,14,15].sort(()=>rand()-.5),order=new Array(15);
  order[4]=8;const flip=rand()<.5;order[10]=flip?solids.pop():stripes.pop();order[14]=flip?stripes.pop():solids.pop();
  const rest=[...solids,...stripes].sort(()=>rand()-.5);for(let i=0;i<15;i++)if(order[i]===undefined)order[i]=rest.pop();
  spots.forEach((p,i)=>balls.push(makeBall(order[i],p[0],p[1])));}
 for(const b of balls)randomTurn(b,rand);
 return balls;
}
function randomTurn(b,rand){let a=rand()*6.283,c=rand()*6.283;rotate(b.o,[Math.cos(a),Math.sin(a),0],c);rotate(b.o,[0,0,1],rand()*6.283);}
function rotate(m,axis,ang){   // m = R(axis,ang) * m, row-major 3x3
 const [x,y,z]=axis,c=Math.cos(ang),s=Math.sin(ang),t=1-c;
 const r=[t*x*x+c,t*x*y-s*z,t*x*z+s*y,t*x*y+s*z,t*y*y+c,t*y*z-s*x,t*x*z-s*y,t*y*z+s*x,t*z*z+c];
 const o=m.slice();for(let i=0;i<3;i++)for(let j=0;j<3;j++)m[i*3+j]=r[i*3]*o[j]+r[i*3+1]*o[3+j]+r[i*3+2]*o[6+j];
}
function orthonormal(m){   // Gram-Schmidt on the columns now and then
 const c=j=>[m[j],m[3+j],m[6+j]],set=(j,v)=>{m[j]=v[0];m[3+j]=v[1];m[6+j]=v[2];},n=v=>{const l=Math.hypot(...v)||1;return v.map(q=>q/l);};
 const a=n(c(0));let b=c(1);const d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2];b=n([b[0]-a[0]*d,b[1]-a[1]*d,b[2]-a[2]*d]);
 const k=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];set(0,a);set(1,b);set(2,k);
}
// ---------------------------------------------------------------- the cue strike
// dir = unit aim, speed in/s, side/vert = tip offset on the ball face as a fraction of R (-.5..+.5): vert > 0 = top
function strike(b,dir,speed,side=0,vert=0){
 // squirt: side spin pushes the ball a touch the other way
 const sq=-side*.035,d=rot(dir,sq*180/Math.PI),V=speed;
 b.vx=d[0]*V;b.vy=d[1]*V;
 const k=2.5*V/R;                      // (5/2) V b / R^2 with b = vert*R
 b.wx=d[1]*k*vert;b.wy=-d[0]*k*vert;   // rolling spin for v is (vy/R, -vx/R)
 b.wz=k*side*SIDE_SIGN;b.moving=true;
}
const SIDE_SIGN=-1;   // checked in tests: right english comes back off a cushion to the shooter's right
// ---------------------------------------------------------------- one sim step
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function applyImpulse(b,J,r){   // J (3D impulse / mass) at contact offset r from the centre
 b.vx+=J[0];b.vy+=J[1];const t=cross(r,J),k=2.5/(R*R);b.wx+=t[0]*k;b.wy+=t[1]*k;b.wz+=t[2]*k;
}
function cloth(b,T,dt){
 const sp=Math.hypot(b.vx,b.vy);
 // contact point velocity, contact at r=(0,0,R): w x r = (R wy, -R wx, 0)
 const ux=b.vx+R*b.wy,uy=b.vy-R*b.wx,u=Math.hypot(ux,uy);
 let mr=MU_R/T.cloth;for(const q of T.rough)if(Math.hypot(b.x-q.x,b.y-q.y)<q.r)mr*=q.k;
 if(u>.05){   // sliding
  const dv=MU_S*G*dt;
  if(3.5*dv>=u){applyImpulse(b,[-ux/3.5,-uy/3.5,0],[0,0,R]);}
  else applyImpulse(b,[-ux/u*dv,-uy/u*dv,0],[0,0,R]);
 }else if(sp>0){   // rolling
  const n=Math.max(0,sp-mr*G*dt),f=n/sp;b.vx*=f;b.vy*=f;b.wx=b.vy/R;b.wy=-b.vx/R;
 }
 if(b.wz){const d=SPIN_DECEL*dt;b.wz=Math.abs(b.wz)<=d?0:b.wz-Math.sign(b.wz)*d;}
 if(sp>0&&sp<6&&(T.slope[0]||T.slope[1])){b.vx+=T.slope[0]*dt;b.vy+=T.slope[1]*dt;}
 if(Math.hypot(b.vx,b.vy)<.25&&Math.hypot(b.vx+R*b.wy,b.vy-R*b.wx)<.5){b.vx=b.vy=b.wx=b.wy=0;if(Math.abs(b.wz)<1)b.wz=0;}
}
function spinBall(b,dt){const w=Math.hypot(b.wx,b.wy,b.wz);if(w>1e-4)rotate(b.o,[b.wx/w,b.wy/w,b.wz/w],w*dt);}
function hitCushion(b,T,ev){
 for(const s of T.segs){
  const px=b.x-s.a[0],py=b.y-s.a[1];let u=px*s.t[0]+py*s.t[1];u=Math.max(0,Math.min(s.L,u));
  const cx=s.a[0]+s.t[0]*u,cy=s.a[1]+s.t[1]*u,dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy);
  if(d>=R||d<1e-9)continue;
  const nx=dx/d,ny=dy/d,vn=b.vx*nx+b.vy*ny;b.x=cx+nx*R;b.y=cy+ny*R;if(vn>=0)continue;
  const e=s.kind==='nose'?T.ecush:T.ecush*.8;
  // normal: bounce with restitution
  const Jn=-(1+e)*vn;b.vx+=Jn*nx;b.vy+=Jn*ny;
  // the part of the ball's roll that drove it into the rail is mostly eaten by the cushion (nose above the centre)
  const rvx=-R*b.wy,rvy=R*b.wx,rn=rvx*nx+rvy*ny;b.wy+=rn*nx/R*.85;b.wx-=rn*ny/R*.85;
  // tangent: friction at the contact point (side spin bends the rebound)
  const tx=-ny,ty=nx,r=[-nx*R,-ny*R,0],wr=cross([b.wx,b.wy,b.wz],r),ut=(b.vx+wr[0])*tx+(b.vy+wr[1])*ty;
  const jt=Math.min(MU_CUSH*Jn,Math.abs(ut)/3.5)*-Math.sign(ut);applyImpulse(b,[tx*jt,ty*jt,0],r);
  ev&&ev.rail(b,-vn,s.kind);
 }
}
function hitBalls(a,b,ev){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=2*R||d<1e-9)return;
 const nx=dx/d,ny=dy/d,ov=(2*R-d)/2;a.x-=nx*ov;a.y-=ny*ov;b.x+=nx*ov;b.y+=ny*ov;
 const rel=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(rel<=0)return;
 const J=rel*(1+E_BALL)/2;a.vx-=J*nx;a.vy-=J*ny;b.vx+=J*nx;b.vy+=J*ny;
 // a little throw: the surfaces rub, the object ball goes a hair along the cut
 const tx=-ny,ty=nx,ra=[nx*R,ny*R,0],rb=[-nx*R,-ny*R,0];
 const wa=cross([a.wx,a.wy,a.wz],ra),wb=cross([b.wx,b.wy,b.wz],rb),ut=((a.vx+wa[0])-(b.vx+wb[0]))*tx+((a.vy+wa[1])-(b.vy+wb[1]))*ty;
 const jt=Math.min(.06*J,Math.abs(ut)/7)*-Math.sign(ut);applyImpulse(a,[tx*jt,ty*jt,0],ra);applyImpulse(b,[-tx*jt,-ty*jt,0],rb);
 a.moving=b.moving=true;ev&&ev.ball(a,b,rel);
}
function pocketCheck(b,T,ev){
 for(let i=0;i<T.pockets.length;i++){const p=T.pockets[i];if(Math.hypot(b.x-p.x,b.y-p.y)<p.r){b.on=false;b.pocket=i;b.sink=0;b.sinkV=Math.hypot(b.vx,b.vy);b.vx=b.vy=0;ev&&ev.pocket(b,i);return true;}}
 // safety: anything past the rails falls into the nearest pocket, or is put back on the table
 if(Math.abs(b.x)>HX+1.6||Math.abs(b.y)>HY+1.6){let best=-1,bd=1e9;T.pockets.forEach((p,i)=>{const d=Math.hypot(b.x-p.x,b.y-p.y);if(d<bd){bd=d;best=i;}});
  if(bd<7){b.on=false;b.pocket=best;b.vx=b.vy=0;ev&&ev.pocket(b,best);return true;}
  b.x=Math.max(-HX+R,Math.min(HX-R,b.x));b.y=Math.max(-HY+R,Math.min(HY-R,b.y));b.vx*=-.5;b.vy*=-.5;}
 return false;
}
const moving=b=>b.on&&(b.vx||b.vy||b.wx||b.wy);
// step the whole table by dt (sub-stepped). ev = {ball(a,b,speed), rail(b,speed,kind), pocket(b,i)}
function step(balls,T,dt,ev,fast=false){
 // sub-steps: a moving ball goes at most .45 in per sub-step (collisions can't be skipped), at most DT long
 let vmax=0;for(const b of balls)if(b.on){const v=Math.hypot(b.vx,b.vy);if(v>vmax)vmax=v;}
 const n=Math.max(Math.ceil(dt/(1/120)),Math.ceil(vmax*dt/.45)),h=dt/n;let any=false;
 for(let k=0;k<n;k++){
  any=false;
  for(const b of balls){if(!b.on||!moving(b))continue;any=true;b.x+=b.vx*h;b.y+=b.vy*h;if(!fast)spinBall(b,h);cloth(b,T,h);
   if(Math.abs(b.x)>HX-R-.01||Math.abs(b.y)>HY-R-.01)hitCushion(b,T,ev);
   if((Math.abs(b.x)>HX-3.4||Math.abs(b.y)>HY-1.4)&&pocketCheck(b,T,ev))continue;}
  for(let i=0;i<balls.length;i++){const a=balls[i];if(!a.on)continue;const am=moving(a);for(let j=i+1;j<balls.length;j++){const b=balls[j];if(!b.on)continue;
   if(Math.abs(a.x-b.x)<2*R&&Math.abs(a.y-b.y)<2*R&&(am||moving(b)))hitBalls(a,b,ev);}}
  if(!any)break;
 }
 if(!fast)for(const b of balls)if(b.on)orthonormal(b.o);
 return any;
}
const settled=balls=>!balls.some(moving);
// run a whole shot off-screen (CPU, tests). Returns the event record.
function simulate(balls,T,{maxT=14,dt=1/120,fast=true}={}){
 const rec=newRecord(balls);const ev=recorder(rec);let t=0;
 while(t<maxT){step(balls,T,dt,ev,fast);t+=dt;if(settled(balls))break;}
 rec.time=t;return rec;
}
function newRecord(balls){return {first:null,cueRailsBeforeHit:0,railAfter:false,railBalls:[],pots:[],touch:{},kissedBy:{},railsOf:{},time:0};}
function recorder(rec){return {
 ball(a,b){const [p,q]=a.id===0?[a,b]:b.id===0?[b,a]:[null,null];if(p&&rec.first===null)rec.first=q.id;
  if(a.id&&b.id){rec.kissedBy[a.id]=rec.kissedBy[a.id]??b.id;rec.kissedBy[b.id]=rec.kissedBy[b.id]??a.id;}rec.touch[a.id]=rec.touch[b.id]=1;},
 rail(b,v,kind){if(rec.first!==null)rec.railAfter=true;if(kind!=='nose')return;if(b.id===0&&rec.first===null)rec.cueRailsBeforeHit++;if(b.id&&!rec.railBalls.includes(b.id))rec.railBalls.push(b.id);rec.railsOf[b.id]=(rec.railsOf[b.id]||0)+1;},
 pocket(b,i){rec.pots.push({id:b.id,pocket:i,rails:rec.railsOf[b.id]||0,kissed:rec.kissedBy[b.id]});}};}
const clone=balls=>balls.map(b=>({...b,o:b.o.slice()}));
// a point where a ball can sit (ball in hand, re-spots)
function freeSpot(balls,x,y,except=-1){return Math.abs(x)<=HX-R&&Math.abs(y)<=HY-R&&balls.every(b=>!b.on||b.id===except||Math.hypot(b.x-x,b.y-y)>=2*R+.02);}
function spotBall(balls,b){for(let k=0;k<40;k++){const x=HX/2+k*(2*R+.05);if(x>HX-R)break;if(freeSpot(balls,x,0,b.id)){b.x=x;b.y=0;break;}}b.on=true;b.pocket=-1;b.vx=b.vy=b.wx=b.wy=b.wz=0;}
// first ball the aim line touches: returns {t,ball,ghost:{x,y}} or rail hit
function castAim(balls,T,from,dir,maxL=200){
 let best={t:maxL,ball:null};
 for(const b of balls){if(!b.on||b.id===0)continue;const px=b.x-from.x,py=b.y-from.y,along=px*dir[0]+py*dir[1];if(along<=0)continue;
  const perp=px*dir[1]-py*dir[0];if(Math.abs(perp)>=2*R)continue;const t=along-Math.sqrt(4*R*R-perp*perp);if(t<best.t)best={t,ball:b};}
 // rails (inner box shrunk by R)
 const lim=[HX-R,HY-R];for(let i=0;i<2;i++)if(dir[i]){const t=((dir[i]>0?lim[i]:-lim[i])-(i?from.y:from.x))/dir[i];if(t>0&&t<best.t)best={t,ball:null,rail:i};}
 best.ghost={x:from.x+dir[0]*best.t,y:from.y+dir[1]*best.t};return best;
}
Object.assign(exports,{R,G,HX,HY,DT,buildTable,makeBall,rack,strike,step,settled,simulate,newRecord,recorder,clone,freeSpot,spotBall,castAim,rotate,moving});
