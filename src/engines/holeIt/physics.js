// Hole.it rigid-body physics (cannon-es, src/vendor/cannon.js), standing in for the Unity physics of the real game:
// every prop is a rigid body shaped from its 3D model (box, Y-up cylinder or sphere), the floor is a plane with the hole
// cut out of it (floor contacts inside the circle are dropped each step), the rim is a ring of kinematic beads that
// moves with the hole (so props too big to fit rest on it, get carried along, tilt and slip in or off), the tray walls
// and grass islands are static boxes. Props start asleep (stacks stand still for free) and wake when the hole comes
// near, when something they touch moves, or when whatever held them up is swallowed.
const CANNON=require("src/vendor/cannon.js");
const {KINDS,kindGeometry}=require("src/engines/holeIt/meshes.js");
const G=22,STEP=1/60,RIM_N=40;
// collision groups: the hole's helper bodies and the static floor/walls only ever test against props
const G_PROP=1,G_STATIC=2,G_HOLE=4,PULL=.35;
// round props get spheres, flat or upright round ones cylinders, everything else a box from the model's bounds
const SPHERE=new Set(['apple-red','apple-green','orange','tangerine','tomato','ball-orange','ball-pink','soccer','egg','egg-brown','egg-pink','egg-orange','watermelon','watermelon-lying','pumpkin','cabbage','strawberry','blueberry','grapes','pearl','cherry','bomb','kiwi-whole','peach','ball-star-blue','ball-spiky','peach']);
const BOXY=new Set(['dice','dice-white','crate','gift','popsicle-yellow','popsicle-lime','popsicle-orange','popsicle-blue','popsicle-pink','popsicle-rainbow','popsicle-melon','popsicle-ice','lego-blue','lego-purple','lego-yellow','lego-pink','lego-teal','lego-long','keyboard','toast','egg-carton','cookie-box','pop-lime','pop-orange','pop-blue','pop-pink','pop-red','fridge-green','fridge-yellow','tv-orange','microwave','boombox','console-yellow','calculator','toy-piano','phone-purple','monster-truck','helicopter','train-pink']);
const bounds={};
function kindBounds(k){if(bounds[k])return bounds[k];const g=kindGeometry(k),p=g.p,mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
 for(let i=0;i<p.length;i+=3)for(let a=0;a<3;a++){const v=p[i+a];if(v<mn[a])mn[a]=v;if(v>mx[a])mx[a]=v;}
 let ext=[mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]],c=[(mx[0]+mn[0])/2,(mx[1]+mn[1])/2,(mx[2]+mn[2])/2];
 // a kind can name its own collision box (the helicopter's thin rotor and tail would otherwise make it far too big)
 if(KINDS[k].hull){const hb=KINDS[k].hull;ext=[hb[0],hb[1],hb[2]];c=[hb[3]||0,hb[1]/2,hb[4]||0];}
 let type=KINDS[k].shape||(SPHERE.has(k)?'sphere':BOXY.has(k)?'box':Math.abs(ext[0]-ext[2])<Math.max(ext[0],ext[2])*.18?'cyl':'box');
 return bounds[k]={ext,c,type};}
// Build the collision shapes of one prop (scale sc) and add them to body b; returns the volume (for the mass).
function addShapes(b,k,sc){const B=kindBounds(k),h0=KINDS[k].h,e=B.ext.map(v=>Math.max(.04,v*sc)),off=new CANNON.Vec3(B.c[0]*sc,(B.c[1]-h0/2)*sc,B.c[2]*sc);
 if(B.type==='sphere'){const r=Math.min(e[0],e[1],e[2])/2,long=Math.max(e[0],e[2]);
  if(long>r*2*1.3){const ax=e[0]>=e[2]?0:2,d=long/2-r;for(const s of [-1,1]){const o=off.clone();if(ax===0)o.x+=s*d;else o.z+=s*d;b.addShape(new CANNON.Sphere(r),o);}return Math.PI*r*r*(long+r*.66);}
  b.addShape(new CANNON.Sphere(r),off);return 4.19*r*r*r;}
 if(B.type==='cyl'){const r=Math.max(e[0],e[2])/2;b.addShape(new CANNON.Cylinder(r,r,e[1],10),off);return Math.PI*r*r*e[1];}
 b.addShape(new CANNON.Box(new CANNON.Vec3(e[0]/2,e[1]/2,e[2]/2)),off);return e[0]*e[1]*e[2]*.8;}
const boundR=(k,sc)=>{const e=kindBounds(k).ext;return Math.hypot(e[0],e[1],e[2])/2*sc;};

function createPhysics(def,items){
 const world=new CANNON.World({gravity:new CANNON.Vec3(0,-G,0),allowSleep:true});
 world.broadphase=new CANNON.SAPBroadphase(world);world.solver.iterations=8;world.solver.tolerance=1e-4;
 world.defaultContactMaterial.friction=.5;world.defaultContactMaterial.restitution=.04;
 world.defaultContactMaterial.contactEquationStiffness=4e6;world.defaultContactMaterial.contactEquationRelaxation=4;
 const hole={x:0,z:0,r:.5};
 // props slide off the rim and down the throat (a slippery metal ring in the real game)
 const propMat=new CANNON.Material('prop'),holeMat=new CANNON.Material('hole');world.addContactMaterial(new CANNON.ContactMaterial(propMat,holeMat,{friction:.04,restitution:.02,contactEquationStiffness:4e6,contactEquationRelaxation:4}));
 // floor: a plane whose contacts inside the hole are thrown away
 const floor=new CANNON.Body({mass:0,type:CANNON.Body.STATIC,collisionFilterGroup:G_STATIC,collisionFilterMask:G_PROP});floor.addShape(new CANNON.Plane());floor.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(floor);
 const inHole=(x,z,m=0)=>(x-hole.x)*(x-hole.x)+(z-hole.z)*(z-hole.z)<(hole.r-m)*(hole.r-m);
 const keep=eq=>{const fi=eq.bi===floor,fj=eq.bj===floor;if(!fi&&!fj)return true;const o=fi?eq.bj:eq.bi,r=fi?eq.rj:eq.ri;return !inHole(o.position.x+r.x,o.position.z+r.z);};
 const np=world.narrowphase,orig=np.getContacts.bind(np);
 np.getContacts=(p1,p2,w,result,old,fr,fpool)=>{orig(p1,p2,w,result,old,fr,fpool);
  let j=0;for(let i=0;i<result.length;i++)if(keep(result[i]))result[j++]=result[i];result.length=j;j=0;for(let i=0;i<fr.length;i++)if(keep(fr[i]))fr[j++]=fr[i];else fpool.push(fr[i]);fr.length=j;};
 // tray walls and grass islands
 const wallH=3,addStatic=(x,y,z,hx,hy,hz)=>{const b=new CANNON.Body({mass:0,type:CANNON.Body.STATIC,collisionFilterGroup:G_STATIC,collisionFilterMask:G_PROP});b.addShape(new CANNON.Box(new CANNON.Vec3(hx,hy,hz)));b.position.set(x,y,z);world.addBody(b);};
 const W=def.W,D=def.D,t=.5;addStatic(0,wallH/2,-D/2-t,W/2+t*2,wallH/2,t);addStatic(0,wallH/2,D/2+t,W/2+t*2,wallH/2,t);addStatic(-W/2-t,wallH/2,0,t,wallH/2,D/2);addStatic(W/2+t,wallH/2,0,t,wallH/2,D/2);
 for(const [x0,z0,x1,z1] of def.islands||[])addStatic((x0+x1)/2,.25,(z0+z1)/2,(x1-x0)/2,.25,(z1-z0)/2);
 // rim: kinematic beads on the hole's edge (they carry and tip props that rest across the hole)
 const rim=[];for(let i=0;i<RIM_N;i++){const b=new CANNON.Body({mass:0,type:CANNON.Body.KINEMATIC,allowSleep:false,collisionFilterGroup:G_HOLE,collisionFilterMask:G_PROP,material:holeMat});b.addShape(new CANNON.Sphere(.05));world.addBody(b);rim.push(b);}
 // throat: a ring of kinematic staves under the rim, so a tall prop that tips in wedges across the hole (the fridge in
 // the owner's Level 6 video sticks diagonally in a Size 5 hole and only drops once the hole reaches Size 6)
 // (two rings of kinematic spheres: much cheaper to collide with than box staves)
 const STAVES=20,DEPTHS=[.42,1.25],staves=[];for(let k=0;k<DEPTHS.length;k++)for(let i=0;i<STAVES;i++){const b=new CANNON.Body({mass:0,type:CANNON.Body.KINEMATIC,allowSleep:false,collisionFilterGroup:G_HOLE,collisionFilterMask:G_PROP,material:holeMat});b.addShape(new CANNON.Sphere(.1));b.ring=k;b.slot=i;world.addBody(b);staves.push(b);}
 let rimR=-1,staveR=-1;
 function placeRim(h){const rr=Math.max(.045,h.r*.085);if(Math.abs(rr-rimR)>.002){rimR=rr;for(const b of rim){b.shapes[0].radius=rr;b.shapes[0].updateBoundingSphereRadius();b.updateBoundingRadius();b.aabbNeedsUpdate=true;}}
  for(let i=0;i<RIM_N;i++){const a=i/RIM_N*Math.PI*2,b=rim[i];b.position.set(h.x+Math.cos(a)*(h.r+rr*1.02),-rr-.01,h.z+Math.sin(a)*(h.r+rr*1.02)); /* tops flush with the floor: the hole slides under props instead of shoving them */b.velocity.set(h.vx||0,0,h.vz||0);}
  const sr=h.r*Math.sin(Math.PI/STAVES)*1.25+.02;
  if(Math.abs(h.r-staveR)>.01){staveR=h.r;for(const b of staves){b.shapes[0].radius=sr;b.shapes[0].updateBoundingSphereRadius();b.updateBoundingRadius();b.aabbNeedsUpdate=true;}}
  for(const b of staves){const a=(b.slot+b.ring*.5)/STAVES*Math.PI*2;b.position.set(h.x+Math.cos(a)*(h.r+sr*1.02),-DEPTHS[b.ring]*h.r*2,h.z+Math.sin(a)*(h.r+sr*1.02));b.velocity.set(h.vx||0,0,h.vz||0);}}
 // props
 // props. Only the props near the hole (or near something moving) are in the physics world; the rest wait outside it
 // with their last pose (cannon's per-step cost grows with every body in the world, asleep or not)
 const bodies=new Array(items.length),active=new Set();
 for(const it of items){const b=new CANNON.Body({material:propMat,collisionFilterGroup:G_PROP,collisionFilterMask:G_PROP|G_STATIC|G_HOLE,mass:1,linearDamping:.04,angularDamping:.12,sleepSpeedLimit:.18,sleepTimeLimit:.3});const vol=addShapes(b,it.k,it.sc||1);
  b.mass=Math.max(.02,vol);b.updateMassProperties();b.position.set(it.x,it.cy,it.z);b.quaternion.set(it.q[0],it.q[1],it.q[2],it.q[3]);b.it=it;it.body=b;it.br=boundR(it.k,it.sc||1);bodies[it.i]=b;}
 const SLEEPING=CANNON.Body.SLEEPING;
 function activate(it){const b=it.body;if(!b||b.world||b.gone)return;world.addBody(b);b.velocity.setZero();b.angularVelocity.setZero();b.sleep();active.add(b);}
 function deactivate(b){if(!b.world)return;world.removeBody(b);active.delete(b);}
 // let stacks and piles find their resting places (in patches, to keep each step small), then put everything to sleep.
 // A level's settled poses are cached on the level definition, so the second player's turn starts instantly.
 function settle(steps=20){
  if(def._settled){for(const it of items){const s=def._settled[it.i],b=it.body;b.position.set(s[0],s[1],s[2]);b.quaternion.set(s[3],s[4],s[5],s[6]);}return;}
  const cell=6,groups=new Map();for(const it of items){const k=Math.floor(it.x/cell)+','+Math.floor(it.z/cell);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(it);}
  for(const [k,list] of groups){const [gx,gz]=k.split(',').map(Number),near=items.filter(it=>it.x>=(gx-.15)*cell&&it.x<(gx+1.15)*cell&&it.z>=(gz-.15)*cell&&it.z<(gz+1.15)*cell);
   for(const it of near)activate(it);for(const b of active)b.wakeUp();for(let i=0;i<steps;i++)world.step(STEP);
   for(const b of [...active]){b.velocity.setZero();b.angularVelocity.setZero();deactivate(b);}}
  def._settled=items.map(it=>{const p=it.body.position,q=it.body.quaternion;return [p.x,p.y,p.z,q.x,q.y,q.z,q.w];});}
 function wakeNear(x,y,z,rad){for(const b of active){if(b.sleepState!==SLEEPING)continue;const p=b.position,d=Math.hypot(p.x-x,p.z-z);if(d<rad+b.it.br&&p.y>y-b.it.br-.2)b.wakeUp();}}
 function remove(it){const b=it.body;if(!b)return;b.gone=true;if(!b.world)return;const p=b.position;deactivate(b);bodies[it.i]=null;wakeNear(p.x,p.y,p.z,it.br+.4);}
 // drop sleeping props that are far from the hole out of the world again
 function prune(h,R){for(const b of [...active]){if(b.sleepState!==SLEEPING)continue;const p=b.position;if(Math.hypot(p.x-h.x,p.z-h.z)>R+b.it.br)deactivate(b);}}
 // the hole's pull: a prop hanging over the hole is drawn toward its centre and down, so anything that fits ends up
 // dropping in (a fridge that tilted and wedged at Size 6 still goes), while one that is too big stays caught on the rim
 const tmpF=new CANNON.Vec3();
 world.addEventListener('preStep',()=>{for(const b of active){if(b.sleepState===SLEEPING)continue;const p=b.position,it=b.it,dx=hole.x-p.x,dz=hole.z-p.z,d=Math.hypot(dx,dz);
  if(d>hole.r+it.br*.5||p.y>it.h*.75)continue;const over=Math.max(0,Math.min(1,(hole.r+it.br*.5-d)/(it.br+.01))),k=b.mass*G*PULL*over;
  tmpF.set(d>1e-3?dx/d*k:0,-k*.6,d>1e-3?dz/d*k:0);b.applyForce(tmpF);}});
 // one frame: wake what the hole reaches, step at 60 Hz, copy poses back to the items
 function step(dt,h){hole.x=h.x;hole.z=h.z;hole.r=h.r;placeRim(h);
  const reach=h.r+.25;for(const b of active){if(b.sleepState!==SLEEPING)continue;const p=b.position;if(Math.hypot(p.x-h.x,p.z-h.z)<reach+b.it.br)b.wakeUp();}
  world.step(STEP,Math.min(dt,.1),4);
  // stop wake-up chains through tightly packed fields: a prop resting on the floor well away from the hole that is only
  // being jostled goes straight back to sleep (props mid-fall, flung, or up on a stack keep simulating)
  // nothing may leave the tray: cap speeds (a deep overlap can fling a prop hard enough to pass a wall) and put back
  // anything that got past the walls
  for(const b of active){if(b.sleepState===SLEEPING||b.ghost)continue;const v=b.velocity,s2=v.lengthSquared();if(s2>144)v.scale(12/Math.sqrt(s2),v);
   const p=b.position,mx=def.W/2-b.it.br*.6,mz=def.D/2-b.it.br*.6;if(Math.abs(p.x)>mx+.3||Math.abs(p.z)>mz+.3){p.set(Math.max(-mx,Math.min(mx,p.x)),Math.max(p.y,b.it.h*.5+.05),Math.max(-mz,Math.min(mz,p.z)));v.setZero();}}
  const calm=h.r+1.4;for(const b of active){if(b.sleepState===SLEEPING)continue;const p=b.position,it=b.it;
   if(p.y<it.h*.5+.08&&Math.hypot(p.x-h.x,p.z-h.z)>calm+it.br&&b.velocity.lengthSquared()<.36&&b.angularVelocity.lengthSquared()<2.2){b.velocity.setZero();b.angularVelocity.setZero();b.sleep();}}
  const out=[];for(const b of active){if(b.sleepState===SLEEPING)continue;const it=b.it,p=b.position,q=b.quaternion;it.x=p.x;it.cy=p.y;it.z=p.z;it.q=[q.x,q.y,q.z,q.w];it.moved=true;out.push(it);}
  return out;}
 // a prop the hole is big enough for, hanging into it: it stops touching the floor, rim and throat and drops through
 function ghost(it){const b=it.body;if(!b||b.ghost)return;b.ghost=true;b.collisionFilterMask=G_PROP;b.wakeUp();}
 // ...and solid again if the hole moved on before it dropped
 function solid(it){const b=it.body;if(!b||!b.ghost)return;b.ghost=false;b.collisionFilterMask=G_PROP|G_STATIC|G_HOLE;}
 // top of a prop's bounding box (world y): a prop counts as swallowed once it is (nearly) all below the floor
 function topY(it){const b=it.body;if(!b)return -1e9;b.updateAABB?.();return b.aabb.upperBound.y;}
 function velocity(it){const b=it.body;return b?{x:b.velocity.x,y:b.velocity.y,z:b.velocity.z,wx:b.angularVelocity.x,wy:b.angularVelocity.y,wz:b.angularVelocity.z}:{x:0,y:0,z:0,wx:0,wy:0,wz:0};}
 function push(it,fx,fz){const b=it.body;if(!b)return;activate(it);b.wakeUp();b.applyForce(new CANNON.Vec3(fx*b.mass,0,fz*b.mass));}
 return {world,step,remove,wakeNear,settle,velocity,push,inHole,topY,ghost,solid,activate,prune,inWorld:it=>!!it.body?.world,activeCount:()=>active.size,awake:()=>{let n=0;for(const b of active)if(b.sleepState!==SLEEPING)n++;return n;}};
}
Object.assign(exports,{createPhysics,kindBounds,G});
