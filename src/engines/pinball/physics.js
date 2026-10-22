// Pinball physics: steel balls on a sloped playfield, in table millimetres (y grows toward the flippers).
// Fixed 1/600 s steps. Static parts are capsules (segment + radius) in a uniform grid; flippers are kinematic
// tapered capsules; ramps and wireforms are guided paths with a height profile (the ball climbs, slows, can roll back).
// Everything the rules care about comes out as w.events ({type, id, ball, ...}); the caller clears the list.
const {seededRandom}=require("src/utils.js");
const STEP=1/600,MAXV=6200,CELL=40,BALL_R=13.5;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

function railTable(rail){
 // Arc-length samples along the path (planar length; z only shapes the speed).
 const pts=rail.pts,cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
 return {...rail,cum,len:cum[cum.length-1]};
}
function railAt(r,s){
 s=clamp(s,0,r.len);let lo=0,hi=r.cum.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(r.cum[m]<=s)lo=m;else hi=m;}
 const a=r.pts[lo],b=r.pts[hi],L=(r.cum[hi]-r.cum[lo])||1,t=(s-r.cum[lo])/L;
 return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,z:(a[2]||0)+((b[2]||0)-(a[2]||0))*t,tx:(b[0]-a[0])/L,ty:(b[1]-a[1])/L,dz:((b[2]||0)-(a[2]||0))/L};
}

function createWorld(def,seed=1){
 const w={def,t:0,g:def.gravity,G:def.gravity/Math.sin(def.slope*Math.PI/180),balls:[],segs:[],grid:new Map(),stamp:0,
  flippers:def.flippers.map(f=>({...f,a:f.rest,w:0,held:false})),parts:{},rails:def.rails.map(railTable),events:[],random:seededRandom(seed>>>0||1),
  plunger:def.plunger?{...def.plunger,pull:0,y:def.plunger.y}:null,tilted:false,nextBall:1,acc:0};
 for(const [id,p] of Object.entries(def.parts))w.parts[id]={...p,down:false,lit:false,on:p.kind==='diverter'?p.up:p.kind==='flag'?!!p.on:p.kind!=='magnet',flash:0,cool:0,angle:0,spin:p.spin??0,hits:0};
 for(const s of def.segs){const g={...s,dx:s.bx-s.ax,dy:s.by-s.ay};g.l2=g.dx*g.dx+g.dy*g.dy;g.part=s.id?w.parts[s.id]:null;g.e??=(s.kind==='rubber'?.72:s.kind==='bumper'?.7:s.kind==='sling'?.72:.42);g.fr??=(s.kind==='rubber'?.06:.02);w.segs.push(g);
  const x0=Math.floor((Math.min(s.ax,s.bx)-s.r)/CELL),x1=Math.floor((Math.max(s.ax,s.bx)+s.r)/CELL),y0=Math.floor((Math.min(s.ay,s.by)-s.r)/CELL),y1=Math.floor((Math.max(s.ay,s.by)+s.r)/CELL);
  for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){const k=cx*4096+cy;if(!w.grid.has(k))w.grid.set(k,[]);w.grid.get(k).push(g);}}
 w.lines=def.lines.map(l=>{const dx=l.b[0]-l.a[0],dy=l.b[1]-l.a[1],L=Math.hypot(dx,dy)||1;return {...l,nx:-dy/L,ny:dx/L,dx,dy,L};});
 // Ramp entries are line switches too: crossing one along the path puts the ball on the rail.
 for(const r of w.rails){if(r.noEntry)continue;const p=railAt(r,0),half=(r.width||40)/2;const a=[p.x-p.ty*half,p.y+p.tx*half],b=[p.x+p.ty*half,p.y-p.tx*half];const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1;w.lines.push({id:r.id+':entry',kind:'railEntry',rail:r,a,b,dx,dy,L,nx:-dy/L,ny:dx/L});}
 w.holes=def.holes.map(h=>({...h}));w.magnets=def.magnets.map(m=>({...m}));w.sensors=def.sensors.map(s=>({...s}));w.discs=(def.discs||[]).map(d=>({...d}));
 // Toys: moving parts (capsules at their rest pose); the rules set parts[id].tx/ty and the toy glides there.
 w.toys=(def.toys||[]).map(t=>({...t,ox:0,oy:0,vx:0,vy:0,segs:t.segs.map(s=>{const g={...s,kind:'toy',id:t.id,dx:s.bx-s.ax,dy:s.by-s.ay,e:s.e??.35,fr:.03};g.l2=g.dx*g.dx+g.dy*g.dy;g.part=w.parts[t.id];return g;})}));
 // Captive balls live in their own channel: they collide with everything but never drain or count as balls in play.
 w.captives=(def.captives||[]).map(c=>{const b=newBall(w,c.x,c.y);b.captive=c.id;return b;});
 return w;
}
const emit=(w,type,o={})=>{w.events.push({type,t:w.t,...o});};
function newBall(w,x,y,vx=0,vy=0){return {id:w.nextBall++,x,y,vx,vy,r:BALL_R,z:0,state:'free',rail:null,hold:null,inside:new Set(),ignoreHole:null,ignoreT:0,px:x,py:y,age:0};}
function addBall(w,x,y,vx=0,vy=0){const b=newBall(w,x,y,vx,vy);w.balls.push(b);return b;}
// A ball resting on the plunger (or a new ball for the shooter lane).
function serveBall(w){const p=w.plunger;return addBall(w,(p.x0+p.x1)/2,p.y-BALL_R-.5,0,0);}
function ballOnPlunger(w,b){const p=w.plunger;return p&&b.state==='free'&&b.x>p.x0&&b.x<p.x1&&b.y+b.r>=p.y-6&&Math.abs(b.vy)<400;}
function plunge(w,power){const p=w.plunger;let fired=false;for(const b of w.balls)if(ballOnPlunger(w,b)){b.vy=-(p.vmin+(p.vmax-p.vmin)*clamp(power,0,1))*(1+(w.random()-.5)*.01);b.vx=0;fired=true;emit(w,'plunge',{ball:b,power});}return fired;}
function nudge(w,vx,vy){for(const b of w.balls)if(b.state==='free'){b.vx+=vx;b.vy+=vy;}emit(w,'nudge',{vx,vy});}
// Release a held ball: back onto the playfield with eject=[vx,vy], or (a VUK) up onto its wireform (hole.toRail).
function ejectHole(w,b,eject){const h=b.hold?.hole;if(!h)return;const e=eject||h.eject,j=1+(w.random()-.5)*.06;b.hold=null;b.ignoreHole=h.id;b.ignoreT=.45;
 const rail=!eject&&h.toRail&&w.rails.find(r=>r.id===h.toRail);
 if(rail){b.state='rail';b.rail={r:rail,s:0,v:(h.railSpeed||2200)*j};emit(w,'eject',{id:h.id,ball:b,vuk:rail.id});return;}
 b.state='free';b.vx=e[0]*j;b.vy=e[1]*j;emit(w,'eject',{id:h.id,ball:b});}
function heldIn(w,id){return w.balls.filter(b=>b.state==='held'&&b.hold?.hole.id===id);}
// Rules hooks on parts: drop banks, lit kickbacks/magnets, diverters.
function resetBank(w,bank){for(const id of w.def.drops[bank]||[]){w.parts[id].down=false;w.parts[id].flash=.3;}emit(w,'bankReset',{id:bank});}

// ox/oy/mvx/mvy: pose offset and velocity of a moving toy (0 for the fixed playfield).
function hitSeg(w,b,s,ox=0,oy=0,mvx=0,mvy=0){
 const p=s.part;if(p&&((s.kind==='drop'&&p.down)||(s.kind==='diverter'&&!p.on)))return;
 const bx=b.x-ox,by=b.y-oy;let t=s.l2?((bx-s.ax)*s.dx+(by-s.ay)*s.dy)/s.l2:0;t=t<0?0:t>1?1:t;
 const px=s.ax+t*s.dx,py=s.ay+t*s.dy,reach=b.r+s.r;let nx=bx-px,ny=by-py;const d2=nx*nx+ny*ny;if(d2>=reach*reach)return;
 let d=Math.sqrt(d2);if(d<1e-6){const L=Math.sqrt(s.l2)||1;nx=-s.dy/L;ny=s.dx/L;if(!s.l2){nx=0;ny=-1;}}else{nx/=d;ny/=d;}
 const rvx=b.vx-mvx,rvy=b.vy-mvy,vn=rvx*nx+rvy*ny;
 if(s.pass){const side=(bx-s.ax)*s.pass[0]+(by-s.ay)*s.pass[1],along=rvx*s.pass[0]+rvy*s.pass[1];if(side<0||along>=0){if(along>0&&p)p.flash=.15;return;}}
 b.x=ox+px+nx*reach;b.y=oy+py+ny*reach;
 if(vn>=0)return;
 const tx=rvx-vn*nx,ty=rvy-vn*ny;let out=-vn*s.e;
 if(s.kind==='bumper'&&!w.tilted){if(p.cool<=0){out=Math.max(out,p.kick);p.cool=.06;p.flash=.12;p.hits++;emit(w,'bumper',{id:s.id,ball:b});}}
 else if(s.kind==='sling'&&!w.tilted){if(p.cool<=0&&-vn>60){out=Math.max(out,p.kick);p.cool=.12;p.flash=.12;emit(w,'sling',{id:s.id,ball:b});}}
 else if(s.kind==='drop'){p.down=true;p.flash=.2;emit(w,'drop',{id:s.id,bank:p.bank,index:p.index,ball:b});}
 else if(s.kind==='standup'){if(p.cool<=0){p.cool=.15;p.flash=.25;emit(w,'standup',{id:s.id,ball:b});}}
 else if(s.kind==='toy'){if(p.cool<=0&&-vn>120){p.cool=.3;p.flash=.25;p.hits++;emit(w,'toy',{id:s.id,ball:b,speed:-vn});}}
 else if(s.kind==='diverter'){if(p.cool<=0){p.cool=.3;p.flash=.3;emit(w,'post',{id:s.id,ball:b});}}
 else if(-vn>250)emit(w,'wallHit',{speed:-vn,kind:s.kind,ball:b});
 b.vx=mvx+tx*(1-s.fr)+out*nx;b.vy=mvy+ty*(1-s.fr)+out*ny;
}
function hitFlipper(w,b,f){
 const ca=Math.cos(f.a),sa=Math.sin(f.a);let t=((b.x-f.x)*ca+(b.y-f.y)*sa)/f.len;t=t<0?0:t>1?1:t;
 const px=f.x+ca*f.len*t,py=f.y+sa*f.len*t,rr=f.r0+(f.r1-f.r0)*t,reach=b.r+rr;let nx=b.x-px,ny=b.y-py;const d2=nx*nx+ny*ny;if(d2>=reach*reach)return;
 let d=Math.sqrt(d2);if(d<1e-6){nx=0;ny=-1;}else{nx/=d;ny/=d;}
 const cx=px+nx*rr,cy=py+ny*rr,vsx=-f.w*(cy-f.y),vsy=f.w*(cx-f.x);
 b.x=px+nx*reach;b.y=py+ny*reach;
 const rx=b.vx-vsx,ry=b.vy-vsy,vn=rx*nx+ry*ny;if(vn>=0)return;
 const tx=rx-vn*nx,ty=ry-vn*ny,e=Math.abs(f.w)>1?f.e:.12;
 b.vx=vsx+tx*.985-vn*e*nx;b.vy=vsy+ty*.985-vn*e*ny;
 if(-vn>500)emit(w,'flipperHit',{id:f.id,speed:-vn,ball:b});
}
function stepBall(w,b,h){
 const def=w.def;b.age+=h;if(b.ignoreT>0){b.ignoreT-=h;if(b.ignoreT<=0)b.ignoreHole=null;}
 if(b.state==='held')return;
 if(b.state==='rail'){
  const r=b.rail.r,p=railAt(r,b.rail.s);
  // Along the path: table slope pulls toward +y, height change pulls against climbing, plus rolling friction.
  if(r.carry)b.rail.v=r.carry;else{const a=w.g*p.ty-w.G*p.dz-Math.sign(b.rail.v)*90;b.rail.v+=a*h;}b.rail.s+=b.rail.v*h;
  const q=railAt(r,b.rail.s);b.px=b.x;b.py=b.y;b.x=q.x;b.y=q.y;b.z=q.z;
  if(b.rail.s<=0&&b.rail.v<=0){const v=b.rail.v;b.state='free';b.rail=null;b.z=0;b.vx=q.tx*v;b.vy=q.ty*v;emit(w,'railFail',{id:r.id,ball:b});}
  // Junction: the path continues on another rail (exit.next = 'id', or {switch:diverterId, on:'idA', off:'idB'}).
  else if(b.rail.s>=r.len&&r.exit.next){const n=r.exit.next,id=typeof n==='string'?n:(w.parts[n.switch]?.on?n.on:n.off),nr=w.rails.find(x=>x.id===id);
   if(nr){b.rail={r:nr,s:0,v:b.rail.v};emit(w,'junction',{id:r.id,to:nr.id,ball:b});return;}}
  else if(b.rail.s>=r.len){const v=b.rail.v;b.state='free';b.rail=null;b.z=0;
   const hole=r.exit.hole&&w.holes.find(x=>x.id===r.exit.hole);
   if(hole){b.x=hole.x;b.y=hole.y;b.vx=0;b.vy=0;b.state='held';b.hold={hole,t:hole.hold};emit(w,'rail',{id:r.id,ball:b});emit(w,'hole',{id:hole.id,ball:b,fromRail:r.id});}
   else{const s=Math.max(v*.85,r.exit.minOut||250);b.vx=q.tx*s;b.vy=q.ty*s;emit(w,'rail',{id:r.id,ball:b});}}
  return;
 }
 b.px=b.x;b.py=b.y;
 b.vy+=w.g*h;b.vx*=1-.04*h;b.vy*=1-.04*h;
 // Magnets (rules switch parts[id].on); with parts[id].grab they catch the ball dead and hold it like a hole,
 // then throw it with parts[id].fling after parts[id].holdT seconds.
 if(!b.captive)for(const m of w.magnets){const part=w.parts[m.id];if(!part?.on||b.ignoreHole===m.id)continue;const dx=m.x-b.x,dy=m.y-b.y,d=Math.hypot(dx,dy);
  if(part.grab&&d<9){b.state='held';b.hold={hole:{id:m.id,x:m.x,y:m.y,eject:part.fling||[0,400],magnet:true},t:part.holdT??1.2};b.x=m.x;b.y=m.y;b.vx=b.vy=0;emit(w,'magnet',{id:m.id,ball:b});return;}
  if(d<m.r&&d>.5){const k=m.force*(1-d/m.r)/d;b.vx+=dx*k*h;b.vy+=dy*k*h;if(d<8){b.vx*=1-6*h;b.vy*=1-6*h;}}}
 // Spinning discs (parts[id].spin rad/s, set by the rules): the turning floor drags the ball round with it.
 if(!b.captive)for(const d of w.discs){const dx=b.x-d.x,dy=b.y-d.y,inside=dx*dx+dy*dy<d.r*d.r,key='disc:'+d.id,was=b.inside.has(key);
  if(inside){const om=w.parts[d.id].spin||0,k=d.grip*h;b.vx+=(-om*dy-b.vx)*k;b.vy+=(om*dx-b.vy)*k;if(!was){b.inside.add(key);emit(w,'disc',{id:d.id,ball:b});}}
  else if(was)b.inside.delete(key);}
 const sp=Math.hypot(b.vx,b.vy);if(sp>MAXV){b.vx*=MAXV/sp;b.vy*=MAXV/sp;}
 b.x+=b.vx*h;b.y+=b.vy*h;
 // Plunger tip (the shooter lane floor); it sits lower while pulled.
 const pl=w.plunger;if(pl&&b.x>pl.x0-2&&b.x<pl.x1+2){const top=pl.y+pl.pull*pl.travel;if(b.y+b.r>top&&b.py+b.r<=top+8){b.y=top-b.r;if(b.vy>0)b.vy=-b.vy*.2;}}
 // Static parts near the ball.
 const st=++w.stamp,x0=Math.floor((b.x-b.r)/CELL),x1=Math.floor((b.x+b.r)/CELL),y0=Math.floor((b.y-b.r)/CELL),y1=Math.floor((b.y+b.r)/CELL);
 for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){const list=w.grid.get(cx*4096+cy);if(list)for(const s of list){if(s.st===st)continue;s.st=st;hitSeg(w,b,s);}}
 for(const toy of w.toys)for(const s of toy.segs)hitSeg(w,b,s,toy.ox,toy.oy,toy.vx,toy.vy);
 for(const f of w.flippers)hitFlipper(w,b,f);
 if(b.captive)return;
 // Switches.
 for(const s of w.sensors){const was=b.inside.has(s.id),inside=(b.x-s.x)**2+(b.y-s.y)**2<(s.r+b.r*.4+(was?6:0))**2;if(inside&&!was){b.inside.add(s.id);const p=w.parts[s.id];
   if(s.kind==='kickback'){if(p.lit&&!w.tilted){p.lit=false;p.flash=.4;b.vx=s.v[0];b.vy=s.v[1];emit(w,'kickback',{id:s.id,ball:b});}else emit(w,'outlane',{id:s.id,ball:b});}
   else{p.flash=.3;emit(w,s.kind,{id:s.id,ball:b,vy:b.vy});}}
  else if(!inside&&was)b.inside.delete(s.id);}
 for(const l of w.lines){const s0=(b.px-l.a[0])*l.nx+(b.py-l.a[1])*l.ny,s1=(b.x-l.a[0])*l.nx+(b.y-l.a[1])*l.ny;if((s0<0)===(s1<0))continue;
  const t=s0/(s0-s1),ix=b.px+(b.x-b.px)*t,iy=b.py+(b.y-b.py)*t,u=((ix-l.a[0])*l.dx+(iy-l.a[1])*l.dy)/(l.L*l.L);if(u<-.05||u>1.05)continue;
  const dir=s1>s0?1:-1;
  if(l.kind==='railEntry'){const r=l.rail,p=railAt(r,0),v=b.vx*p.tx+b.vy*p.ty;if(v>(r.minSpeed||0)){b.state='rail';b.rail={r,s:Math.max(0,(b.x-p.x)*p.tx+(b.y-p.y)*p.ty),v};emit(w,'railEnter',{id:r.id,ball:b});return;}}
  else if(l.kind==='spinner'){const p=w.parts[l.id],vn=Math.abs(b.vx*l.nx+b.vy*l.ny);p.spin=Math.min(40,p.spin+vn*.006);p.dir=dir;b.vx*=.94;b.vy*=.94;emit(w,'spinnerHit',{id:l.id,ball:b,dir});}
  else{w.parts[l.id].flash=.2;emit(w,'trigger',{id:l.id,ball:b,dir});}
 }
 for(const hole of w.holes){if(b.ignoreHole===hole.id)continue;const d2=(b.x-hole.x)**2+(b.y-hole.y)**2;if(d2<hole.r*hole.r&&Math.hypot(b.vx,b.vy)<hole.maxSpeed){b.state='held';b.hold={hole,t:hole.hold};b.vx=b.vy=0;b.x=hole.x;b.y=hole.y;emit(w,'hole',{id:hole.id,ball:b});return;}}
}
function collideBalls(w){
 const bs=w.captives.length?w.balls.concat(w.captives):w.balls;for(let i=0;i<bs.length;i++){const a=bs[i];if(a.state!=='free')continue;for(let j=i+1;j<bs.length;j++){const b=bs[j];if(b.state!=='free')continue;
  const dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy,R=a.r+b.r;if(d2>=R*R||d2<1e-6)continue;const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,o=(R-d)/2;
  a.x-=nx*o;a.y-=ny*o;b.x+=nx*o;b.y+=ny*o;const vn=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(vn<0){const j=-(1+.9)*vn/2;a.vx-=j*nx;a.vy-=j*ny;b.vx+=j*nx;b.vy+=j*ny;if(-vn>300)emit(w,'ballClick',{speed:-vn});}}}
}
// input: {flip:[left,right], pull:0..1}. Returns w.events (appended).
function stepWorld(w,dt,input={flip:[false,false],pull:0}){
 w.acc=Math.min(w.acc+dt,.05);
 while(w.acc>=STEP){w.acc-=STEP;const h=STEP;w.t+=h;
  if(w.plunger)w.plunger.pull=clamp(input.pull||0,0,1);
  for(const f of w.flippers){const on=!!input.flip[f.input]&&!w.tilted;if(on&&!f.held)emit(w,'flip',{id:f.id,input:f.input});if(!on&&f.held)emit(w,'flipDown',{id:f.id});f.held=on;
   // The coil accelerates the bat (so the ball is carried and the release angle depends on where it sits); the return
   // spring is gentler. End-of-stroke stops it dead.
   const target=on?f.up:f.rest,dir=Math.sign(target-f.a);
   if(dir){const max=on?f.wUp:f.wDown,acc=on?f.acc:f.acc*.6;let wv=f.w*dir>0?Math.abs(f.w):0;wv=Math.min(max,wv+acc*h);let na=f.a+dir*wv*h;if((target-na)*dir<=0)na=target;f.w=(na-f.a)/h;f.a=na;}else f.w=0;}
  for(const p of Object.values(w.parts)){if(p.cool>0)p.cool-=h;if(p.flash>0)p.flash-=h;
   if(p.kind==='spinner'&&p.spin>0){const before=Math.floor(p.angle);p.angle+=p.spin*h;p.spin=Math.max(0,p.spin*(1-1.1*h)-1.2*h);if(Math.floor(p.angle)!==before)emit(w,'spin',{id:p.id});}}
  for(const toy of w.toys){const p=w.parts[toy.id];let dx=(p.tx||0)-toy.ox,dy=(p.ty||0)-toy.oy;const d=Math.hypot(dx,dy),st=(toy.speed||120)*h;if(d>st){dx*=st/d;dy*=st/d;}toy.vx=dx/h;toy.vy=dy/h;toy.ox+=dx;toy.oy+=dy;p.ox=toy.ox;p.oy=toy.oy;}
  for(const b of w.balls)stepBall(w,b,h);
  for(const b of w.captives)stepBall(w,b,h);
  collideBalls(w);
  for(const b of w.balls)if(b.state==='held'&&b.hold&&b.hold.t!==Infinity){b.hold.t-=h;if(b.hold.t<=0)ejectHole(w,b);}
  for(let i=w.balls.length-1;i>=0;i--){const b=w.balls[i];if(b.state==='free'&&(b.y>w.def.drainY+b.r||b.y<-200||b.x<-100||b.x>w.def.W+100||!Number.isFinite(b.x+b.y))){w.balls.splice(i,1);emit(w,'drain',{ball:b});}}
 }
 return w.events;
}
Object.assign(exports,{STEP,BALL_R,createWorld,stepWorld,addBall,serveBall,ballOnPlunger,plunge,nudge,ejectHole,heldIn,resetBank,railAt,newBall});
