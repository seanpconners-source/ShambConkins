// Kingpin Bowling physics (plain data, no browser; Node-testable: tests/bowl-sim.mjs).
// Units: metres, seconds, kilograms. x across the lane (+ = right as the bowler looks down the lane), z down the lane from
// the foul line (head pin at Z1 = 60 ft), y up. Real sizes: lane 41.5" (39 boards), gutters 9.25", pins 15" tall spaced 12".
// THE BALL ON THE LANE is our own model (like real bowling-ball dynamics papers): a sphere on a plane with Coulomb friction
// that depends on where it is (the OIL PATTERN: slick up front and in the middle, dry back end), so a ball thrown with side
// rotation SKIDS on the oil, HOOKS when it reads the dry boards and ROLLS out; its cover (plastic / urethane / reactive)
// scales the friction it sees. THE PINS are cannon-es rigid bodies (a lathe-like compound per pin, centre of mass low like a
// real pin) on a pin deck with kickbacks, gutters and a pit, so pin action is real: messengers, tap 10s, splits, Brooklyns.
// The ball becomes a cannon body when it reaches the deck so it deflects off the pins.
// Everything runs at a fixed step and only uses + - * / sqrt after the release (the release itself is sent as numbers), so
// two phones playing the same throw see the same roll; the bowler's phone still sends its final pins (pool does the same).
const C=require("src/vendor/cannon.js");
const IN=.0254,FT=.3048;
const LANE_W=41.5*IN,HALF=LANE_W/2,BOARD=LANE_W/39,GUTTER_W=9.25*IN,Z1=60*FT,PIN_SP=12*IN,ROW=PIN_SP*Math.sqrt(3)/2;
const ARROWS_Z=15*FT,DOTS_Z=7*FT,APPROACH=15*FT,DECK_END=Z1+3*ROW+.33,PIT_Z=DECK_END+.05,CURTAIN_Z=Z1+1.75,KICK_X=HALF+GUTTER_W+.02;
const BALL_R=8.5*IN/2,G=9.81,PIN_H=15*IN,PIN_M=1.53;
// pin numbers 1..10: row 1 = 1; row 2 = 2 (left) 3; row 3 = 4 5 6; row 4 = 7 8 9 10
const PIN_POS=(()=>{const out=[];let n=0;for(let r=0;r<4;r++)for(let j=0;j<=r;j++){out.push({n:++n,x:(j-r/2)*PIN_SP,z:Z1+r*ROW});}return out;})();
// board number (1..39 from the RIGHT gutter, like a right-hander counts) <-> x
// contact numbers (pin/pin, pin/ball, pin/deck friction + restitution), kept in one place for tuning
const TUNE={ppF:.12,ppE:.65,pbF:.12,pbE:.62,pdF:.05,pdE:.35,bdF:.2,drive:1.6,drive0:.85,driveAng:5,seg:10,iters:18,shape:'balls',sap:true};
const boardX=b=>HALF-(b-.5)*BOARD,xBoard=x=>(HALF-x)/BOARD+.5;

// ---------------------------------------------------------------- the lane: oil pattern + wear
// cond: {len (m of oil), mid (friction in the oiled middle), edge (friction on the oiled outside boards), wall (how many boards
// from each gutter get less oil), dry (back end friction), spots [{x,z,r,k}] dead wood / dry patches, crown (sideways
// slope, m/s^2 pull), spread (how soft the oil's end is, m)}
function makeLane(cond={}){
 const c={len:13,mid:.02,edge:.06,wall:9,dry:.25,spread:1.6,spots:[],crown:0,...cond};
 const mu=(x,z)=>{
  if(z<0)return c.mid;
  const b=xBoard(x),fromEdge=Math.min(b,40-b);
  // across: the outside boards get less oil (a "house shot" funnels the ball back to the pocket)
  const t=Math.max(0,Math.min(1,(c.wall-fromEdge)/c.wall));let oil=c.mid+(c.edge-c.mid)*t*t;
  // down the lane: oil to c.len, then a soft hand-off to the dry back end
  const d=(z-c.len)/c.spread;let m;if(d<=-1)m=oil;else if(d>=1)m=c.dry;else{const k=(d+1)/2;m=oil+(c.dry-oil)*k*k*(3-2*k);}
  for(const s of c.spots){const dx=x-s.x,dz=z-s.z,q=1-(dx*dx+dz*dz)/(s.r*s.r);if(q>0)m+=s.k*q;}
  return m;};
 return {cond:c,mu};
}
// ---------------------------------------------------------------- the ball
// spec: {lb weight in pounds, cover friction factor, rg (radius of gyration factor: higher = gets into a roll later), flare}
function ballSpec(b={}){const lb=b.lb||14,m=lb*.4536,k=b.rg||.4;return {lb,m,R:BALL_R,I:k*m*BALL_R*BALL_R,cover:b.cover??1,flare:b.flare??1};}
// the release, made from the bowler's choices (sin/cos only here; the result is sent as numbers)
// {x: lateral position at the foul line, ang: direction (rad, + = to the left), speed m/s, revs rpm, axis (deg of axis
// rotation 0..90), hand 1 right / -1 left, loft m}
function release(o,ball){
 const v=o.speed,a=o.ang||0,vx=-Math.sin(a)*v,vz=Math.cos(a)*v,Om=(o.revs||0)*2*Math.PI/60,th=(o.axis||0)*Math.PI/180;
 // axis of rotation: the forward-roll axis (perpendicular to travel) turned by the axis rotation toward the direction of travel
 const rx=Math.cos(a),rz=Math.sin(a);          // roll axis (unit, horizontal, perpendicular to (vx,vz))
 const tx=vx/v,tz=vz/v;                         // travel direction
 const h=(o.hand||1);
 const ax=Math.cos(th)*rx+h*Math.sin(th)*tx,az=Math.cos(th)*rz+h*Math.sin(th)*tz;
 return {x:o.x||0,z:-(o.loft||.25),vx,vz,wx:Om*ax,wy:0,wz:Om*az,q:[0,0,0,1]};
}
// one fixed step of the ball on the lane. Returns 'gutter' if it dropped in.
function laneStep(s,dt,lane,ball){
 const R=ball.R,ux=s.vx+R*s.wz,uz=s.vz-R*s.wx,u=Math.sqrt(ux*ux+uz*uz);
 if(s.z<0){s.x+=s.vx*dt;s.z+=s.vz*dt;spin(s,dt);return;}   // in the air past the foul line (loft)
 const mu=lane.mu(s.x,s.z)*(s.slip?1:ball.cover),m=ball.m,I=ball.I;
 // the impulse that would stop the slip this step: if friction can do it, the ball rolls
 const kk=1/m+R*R/I,need=u/kk,can=mu*m*G*dt;
 let fx,fz;
 if(u<1e-6||can>=need){fx=-ux/kk/dt;fz=-uz/kk/dt;// exactly rolling now
  const rr=.012*m*G,vv=Math.sqrt(s.vx*s.vx+s.vz*s.vz)||1;fx-=rr*s.vx/vv;fz-=rr*s.vz/vv;}
 else{fx=-mu*m*G*ux/u;fz=-mu*m*G*uz/u;}
 fx+=lane.cond.crown*m;
 s.vx+=fx/m*dt;s.vz+=fz/m*dt;
 // torque r x F, r=(0,-R,0): (-R Fz, 0, R Fx)
 s.wx+=-R*fz/I*dt;s.wz+=R*fx/I*dt;
 s.x+=s.vx*dt;s.z+=s.vz*dt;spin(s,dt);
 if(Math.abs(s.x)>HALF-BALL_R*.35&&s.z<Z1-.15)return 'gutter';
}
// turn the ball's orientation quaternion by its spin (for drawing the ball's texture rolling)
function spin(s,dt){const q=s.q,wx=s.wx,wy=s.wy,wz=s.wz,h=dt*.5;
 const x=q[0],y=q[1],z=q[2],w=q[3];
 q[0]+=h*(wx*w+wy*z-wz*y);q[1]+=h*(wy*w+wz*x-wx*z);q[2]+=h*(wz*w+wx*y-wy*x);q[3]+=h*(-wx*x-wy*y-wz*z);
 const n=Math.sqrt(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3]);q[0]/=n;q[1]/=n;q[2]/=n;q[3]/=n;}

// ---------------------------------------------------------------- the pin deck (cannon)
const DT=1/400;
const PIN_SHAPES=(()=>{// [radiusTop, radiusBottom, height, centreY above the base]; CoM ~5.9" above the base
 const com=.15,parts=[[.0590,.0290,.10,.05],[.0480,.0605,.06,.13],[.0240,.0480,.10,.21],[.0275,.0225,.065,.2925]];
 // the fast pin (default): a flat foot + a chain of spheres along the lathe outline [radius, centreY]: sphere contacts are
 // ~5x cheaper than cylinder ones, so a phone keeps up with ten flying pins
 const balls=[[.046,.056],[.0605,.114],[.054,.165],[.042,.207],[.03,.243],[.024,.276],[.031,.343]];
 return {com,parts,balls,foot:{r:.028,h:.012},head:{r:.031,y:.343}};})();
function pinBody(mat){
 const b=new C.Body({mass:PIN_M,material:mat});
 const P=PIN_SHAPES,dy=-P.com;
 if(TUNE.shape==='lathe'){for(const [rt,rb,h,y] of P.parts)b.addShape(new C.Cylinder(rt,rb,h,TUNE.seg),new C.Vec3(0,y+dy,0));
  b.addShape(new C.Sphere(P.head.r),new C.Vec3(0,P.head.y+dy,0));}
 else{b.addShape(new C.Cylinder(P.foot.r,P.foot.r,P.foot.h,8),new C.Vec3(0,P.foot.h/2+dy,0));for(const [r,y] of P.balls)b.addShape(new C.Sphere(r),new C.Vec3(0,y+dy,0));}
 b.updateMassProperties();
 // the box inertia cannon guesses is too round for a pin: make it tall and tippy like a real pin (Ixx = Izz > Iyy)
 b.inertia.set(.0155,.0024,.0155);b.invInertia.set(1/.0155,1/.0024,1/.0155);b.updateInertiaWorld(true);
 b.linearDamping=.02;b.angularDamping=.04;b.allowSleep=true;b.sleepSpeedLimit=.05;b.sleepTimeLimit=.3;
 return b;}
// a roll from the release to settled pins. pins: [{n,x,z,qx,qy,qz,qw}] standing pins (their spots; walked pins keep theirs)
function makeRoll({lane,ball,rel,pins}){
 const st={...rel,q:[...(rel.q||[0,0,0,1])]};
 const R={phase:'lane',t:0,ball:st,lane,spec:ball,events:[],gutter:false,deckT:0,stillT:0,done:false,hitPin:false,
  path:[],pins:[],entry:null,firstHit:null};
 // ---- world
 const world=new C.World({gravity:new C.Vec3(0,-G,0)});world.allowSleep=true;world.solver.iterations=TUNE.iters;world.solver.tolerance=1e-4;world.narrowphase.enableFrictionReduction=true;
 world.broadphase=TUNE.sap?new C.SAPBroadphase(world):new C.NaiveBroadphase();world.broadphase.useBoundingBoxes=true;R.world=world;
 const mPin=new C.Material('pin'),mBall=new C.Material('ball'),mDeck=new C.Material('deck'),mWall=new C.Material('wall'),mPit=new C.Material('pit');
 const cm=(a,b,f,r)=>world.addContactMaterial(new C.ContactMaterial(a,b,{friction:f,restitution:r,contactEquationStiffness:5e7,contactEquationRelaxation:3,frictionEquationStiffness:5e7}));
 const K=TUNE;cm(mPin,mPin,K.ppF,K.ppE);cm(mPin,mBall,K.pbF,K.pbE);cm(mPin,mDeck,K.pdF,K.pdE);cm(mBall,mDeck,K.bdF,.05);cm(mPin,mWall,.15,.55);cm(mBall,mWall,.1,.3);cm(mPin,mPit,.6,.05);cm(mBall,mPit,.6,.05);
 const box=(hx,hy,hz,x,y,z,mat)=>{const b=new C.Body({mass:0,material:mat,shape:new C.Box(new C.Vec3(hx,hy,hz))});b.position.set(x,y,z);world.addBody(b);return b;};
 const deckLen=DECK_END-(Z1-1.2);
 // the pin deck = a plane (cheap contacts) cut to the lane's last metres: contacts past its end or over the gutters are
 // dropped each step, so pins fall off into the pit and the gutters
 const deck=new C.Body({mass:0,material:mDeck,shape:new C.Plane()});deck.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(deck);
 deck.updateAABB=()=>{deck.aabb.lowerBound.set(-5,-1,-50);deck.aabb.upperBound.set(5,.05,50);deck.aabbNeedsUpdate=false;};deck.updateAABB();// (a plane's own box ends exactly at y 0: a pin standing on it never touched it)
 const z0=Z1-1.2,keep=eq=>{const di=eq.bi===deck;if(!di&&eq.bj!==deck)return true;const o=di?eq.bj:eq.bi,r=di?eq.rj:eq.ri,x=o.position.x+r.x,z=o.position.z+r.z;
  return z>=z0&&z<=DECK_END&&x>=-HALF&&x<=HALF&&o.position.y+r.y>-.025;};// (a pin under the deck's level, in a gutter or the pit, never gets shoved back up)
 const np=world.narrowphase,orig=np.getContacts.bind(np);
 np.getContacts=(p1,p2,w,result,old,fr,fpool)=>{orig(p1,p2,w,result,old,fr,fpool);
  let j=0;for(let i=0;i<result.length;i++)if(keep(result[i]))result[j++]=result[i];result.length=j;j=0;for(let i=0;i<fr.length;i++)if(keep(fr[i]))fr[j++]=fr[i];else fpool.push(fr[i]);fr.length=j;};
 box(GUTTER_W/2,.05,deckLen/2+.3,HALF+GUTTER_W/2,-.115,Z1-1.2+deckLen/2,mWall);    // gutters (lower)
 box(GUTTER_W/2,.05,deckLen/2+.3,-HALF-GUTTER_W/2,-.115,Z1-1.2+deckLen/2,mWall);
 box(.05,.6,1.1,KICK_X+.03,.5,Z1+.55,mWall);box(.05,.6,1.1,-KICK_X-.03,.5,Z1+.55,mWall);   // kickbacks (side boards that throw pins back in)
 box(1.2,.1,1.2,0,-.62,DECK_END+1.0,mPit);                                         // the pit floor
 box(1.2,.6,.05,0,.2,CURTAIN_Z+.5,mPit);                                           // the back curtain
 // ---- pins
 for(const p of pins){const b=pinBody(mPin);b.position.set(p.x,PIN_SHAPES.com+(p.y||0),p.z);if(p.qw!=null)b.quaternion.set(p.qx,p.qy,p.qz,p.qw);
  b.sleep();world.addBody(b);const pin={n:p.n,b,x0:p.x,z0:p.z,hit:0};R.pins.push(pin);
  b.addEventListener('collide',e=>{const o=e.body,v=Math.abs(e.contact.getImpactVelocityAlongNormal());pin.hit=Math.max(pin.hit,v);
   if(v>.25&&o!==R.ballBody)R.events.push({t:R.t,k:o.mass===0?(o.material===mWall?'wall':'deck'):'pin',v,n:p.n});
   if(o===R.ballBody&&!R.firstHit)R.firstHit={n:p.n,t:R.t};});}
 let ballBody=null;
 function toDeck(){
  // a ball that comes in at an angle with roll keeps driving through the pins; a straight ball deflects (game feel: hook pays)
  const ent=Math.abs(Math.atan2(-st.vx,st.vz))*180/Math.PI,drv=TUNE.drive0+(TUNE.drive-TUNE.drive0)*Math.min(1,ent/TUNE.driveAng);
  ballBody=new C.Body({mass:ball.m*drv,material:mBall,shape:new C.Sphere(BALL_R)});const s=st;
  ballBody.position.set(s.x,BALL_R,s.z);ballBody.velocity.set(s.vx,0,s.vz);ballBody.angularVelocity.set(s.wx,s.wy,s.wz);
  const I=ball.I*drv;ballBody.inertia.set(I,I,I);ballBody.invInertia.set(1/I,1/I,1/I);ballBody.updateInertiaWorld(true);
  ballBody.quaternion.set(st.q[0],st.q[1],st.q[2],st.q[3]);ballBody.allowSleep=false;ballBody.linearDamping=0;ballBody.angularDamping=0;
  world.addBody(ballBody);R.ballBody=ballBody;
  ballBody.addEventListener('collide',e=>{if(e.body.mass>0){const v=Math.abs(e.contact.getImpactVelocityAlongNormal());if(v>.2)R.events.push({t:R.t,k:'ball',v});R.hitPin=true;}});
  R.entry={x:s.x,ang:Math.atan2(-s.vx,s.vz)*180/Math.PI,speed:Math.sqrt(s.vx*s.vx+s.vz*s.vz)};
  for(const p of R.pins)p.b.wakeUp();
  R.phase='deck';}
 // one fixed step
 function step(){
  R.t+=DT;
  if(R.phase==='lane'){
   const g=laneStep(st,DT,lane,ball);
   if(g){R.gutter=true;R.phase='gutter';R.events.push({t:R.t,k:'gutter'});st.gx=Math.sign(st.x)*(HALF+GUTTER_W/2);}
   else if(st.z>=Z1-.55)toDeck();
   if((R.path.length?R.t-R.path[R.path.length-1][2]:1)>.05)R.path.push([st.x,st.z,R.t]);
   if(st.vz<=.05&&R.phase==='lane'){R.phase='dead';}
  }else if(R.phase==='gutter'){// rolls down the gutter to the pit (it still hits nothing on the deck)
   st.x+=(st.gx-st.x)*Math.min(1,DT*14);st.vx=0;st.z+=Math.max(st.vz,1.5)*DT;spin(st,DT);
   if(st.z>PIT_Z+.3)R.phase='settle';
   world.step(DT);}
  else{world.step(DT);if(ballBody){const p=ballBody.position;st.x=p.x;st.z=p.z;st.y=p.y-BALL_R;const q=ballBody.quaternion;st.q=[q.x,q.y,q.z,q.w];
    if(R.phase==='deck'&&(p.z>DECK_END+.2||p.y<-.2)){R.phase='settle';world.removeBody(ballBody);}}
   if(R.phase==='deck'&&R.t>12)R.phase='settle';}
  if(R.phase!=='lane')for(const p of R.pins){if(p.gone)continue;const b=p.b,q=b.position;
   if(q.y<-.25||Math.abs(q.x)>KICK_X+.1||q.z>CURTAIN_Z+.6||q.y>2){p.gone=true;world.removeBody(b);continue;}// in the pit or flew off: gone (saves the phone the work)
   if(!p.damped&&pinDown(b)){p.damped=true;b.linearDamping=.25;b.angularDamping=.5;}}
  if(R.phase==='settle'||R.phase==='dead'){R.deckT+=DT;
   let moving=0;for(const p of R.pins){const b=p.b;if(p.gone||b.sleepState===C.Body.SLEEPING)continue;const v2=b.velocity.lengthSquared();
    if(pinDown(b)){if(b.position.y>-.05&&v2>.16)moving++;}else if(v2>.004||b.angularVelocity.lengthSquared()>.04)moving++;}
   R.stillT=moving?0:R.stillT+DT;
   if(R.stillT>.35||R.deckT>4.5)R.done=true;}
 }
 // advance by real seconds (fixed steps; leftover carried)
 let acc=0;
 R.advance=(sec)=>{acc+=Math.min(sec,.1);while(acc>=DT&&!R.done){acc-=DT;step();}return R.done;};
 R.run=(cap=16)=>{while(!R.done&&R.t<cap)step();return R;};
 // poses for drawing: ball {x,y,z,q}, pins [{n,x,y,z,q,down}]
 R.ballPose=()=>({x:st.x,y:R.phase==='gutter'?-.09:(st.y||0),z:st.z,q:st.q,phase:R.phase});
 R.pinPoses=()=>R.pins.map(p=>{const b=p.b,q=b.quaternion;return {n:p.n,x:b.position.x,y:b.position.y-PIN_SHAPES.com,z:b.position.z,q:[q.x,q.y,q.z,q.w],down:pinDown(b),gone:!!p.gone};});
 // the result: standing pins with where they stand now
 R.result=()=>{const standing=[];for(const p of R.pins){const b=p.b;if(!pinDown(b)){const q=b.quaternion;standing.push({n:p.n,x:+b.position.x.toFixed(4),z:+b.position.z.toFixed(4),qx:+q.x.toFixed(4),qy:+q.y.toFixed(4),qz:+q.z.toFixed(4),qw:+q.w.toFixed(4)});}}
  return {standing,gutter:R.gutter,entry:R.entry,firstHit:R.firstHit?.n||0,hitPin:R.hitPin};};
 return R;
}
// a pin is DOWN when it is tipped more than ~25 degrees, off the deck, or in the pit/gutter
function pinDown(b){const q=b.quaternion,up=1-2*(q.x*q.x+q.z*q.z);// y of the pin's up axis
 const p=b.position;return up<.9||p.y<PIN_SHAPES.com-.03||p.z>DECK_END||Math.abs(p.x)>HALF+.01;}
const rack=()=>PIN_POS.map(p=>({n:p.n,x:p.x,z:p.z}));

// ---------------------------------------------------------------- planning helpers (CPU, aim guide)
// roll the ball alone (no pins) to see where it reaches the head pin's row: {x at Z1, entry angle, gutter, path}
function trace(lane,ball,rel,stepDt=1/240){const s={...rel,q:[0,0,0,1]};const path=[];let t=0,g=false;
 while(s.z<Z1&&t<8){if(laneStep(s,stepDt,lane,ball)){g=true;break;}t+=stepDt;if(path.length===0||t-path[path.length-1][2]>.04)path.push([s.x,s.z,t]);if(s.vz<.05)break;}
 return {x:s.x,ang:Math.atan2(-s.vx,s.vz)*180/Math.PI,gutter:g,path,t};}

Object.assign(exports,{TUNE,IN,FT,LANE_W,HALF,BOARD,GUTTER_W,Z1,PIN_SP,ROW,ARROWS_Z,DOTS_Z,APPROACH,DECK_END,PIT_Z,CURTAIN_Z,KICK_X,BALL_R,PIN_H,PIN_POS,PIN_SHAPES,DT,
 boardX,xBoard,makeLane,ballSpec,release,laneStep,makeRoll,pinDown,rack,trace});
