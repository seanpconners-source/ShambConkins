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
const G_PROP=1,G_STATIC=2,G_HOLE=4,PULL=.35,LOOSEN=1.6,SHATTER=2.2;
// round props get spheres, flat or upright round ones cylinders, everything else a box from the model's bounds
const SPHERE=new Set(['apple-red','apple-green','orange','tangerine','tomato','ball-orange','ball-pink','soccer','egg','egg-brown','egg-pink','egg-orange','watermelon','watermelon-lying','pumpkin','cabbage','strawberry','blueberry','grapes','pearl','cherry','bomb','kiwi-whole','peach','ball-star-blue','ball-spiky','peach']);
const BOXY=new Set(['dice','dice-white','crate','gift','popsicle-yellow','popsicle-lime','popsicle-orange','popsicle-blue','popsicle-pink','popsicle-rainbow','popsicle-melon','popsicle-ice','lego-blue','lego-purple','lego-yellow','lego-pink','lego-teal','lego-long','keyboard','toast','egg-carton','cookie-box','pop-lime','pop-orange','pop-blue','pop-pink','pop-red','pop-amber','brick-red','brick-blue','brick-pink','brick-green','brick-purple','brick-yellow','fridge-green','fridge-yellow','tv-orange','microwave','boombox','console-yellow','calculator','toy-piano','phone-purple','monster-truck','helicopter','train-pink']);
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
 for(const it of items){const round=kindBounds(it.k).type!=='box';const b=new CANNON.Body({material:propMat,collisionFilterGroup:G_PROP,collisionFilterMask:G_PROP|G_STATIC|G_HOLE,mass:1,linearDamping:round?.35:.12,angularDamping:round?.75:.3,sleepSpeedLimit:.18,sleepTimeLimit:.3});const vol=addShapes(b,it.k,it.sc||1); // props barely roll in the real game: fruit that doesn't drop stays where it is
  b.mass=Math.max(.02,vol);b.updateMassProperties();b.position.set(it.x,it.cy,it.z);b.quaternion.set(it.q[0],it.q[1],it.q[2],it.q[3]);b.it=it;it.body=b;it.br=boundR(it.k,it.sc||1);bodies[it.i]=b;}
 const SLEEPING=CANNON.Body.SLEEPING;
 // Stacks are solid until disturbed, as in the real game: every column (props built up off the floor, plus whatever they
 // stand on) starts frozen exactly where the level put it (a static body: it can be hit but never drifts, leans or
 // sinks), and the whole column turns into loose physics when the hole reaches under it or something hits it hard.
 // Loose round piles (eggs, oranges) are left out: they settle and behave as normal props.
 const groups=[];{const parent=items.map((_,i)=>i),find=i=>{while(parent[i]!==i)i=parent[i]=parent[parent[i]];return i;};
  const elevated=items.filter(it=>(it.base||0)>.05&&kindBounds(it.k).type!=='sphere');
  for(const e of elevated)for(const o of items){if(o===e||(o.base||0)>=e.base-.01)continue;if(Math.hypot(o.x-e.x,o.z-e.z)<(e.r+o.r)*.55)parent[find(e.i)]=find(o.i);}
  for(let i=0;i<elevated.length;i++)for(let j=i+1;j<elevated.length;j++){const a=elevated[i],c=elevated[j];if(Math.abs(a.base-c.base)<.02&&Math.hypot(a.x-c.x,a.z-c.z)<(a.r+c.r)*.9)parent[find(a.i)]=find(c.i);}
  const byRoot=new Map();for(const it of items){const r=find(it.i);if(!byRoot.has(r))byRoot.set(r,[]);byRoot.get(r).push(it);}
  for(const list of byRoot.values()){if(list.length<2||!list.some(it=>(it.base||0)>.05))continue;const g={bodies:list.map(it=>it.body),loose:false};groups.push(g);
   for(const it of list){const b=it.body;b.group=g;b.frozen=true;b.dynMass=b.mass;b.type=CANNON.Body.STATIC;b.mass=0;b.updateMassProperties();}}}
 // A loose column is still one rigid thing, as in the video: all its pieces become a single compound body (perfectly
 // straight and stable, which separate bodies stacked 20 high are not in this engine). A piece splits off as its own
 // body when it is over the hole and low enough to drop in, so a column the hole is under sinks straight down piece by
 // piece; one the hole only catches at the edge topples like a rod, and a hard landing shatters it into loose pieces.
 const compounds=new Set(),pendingRelease=new Set();let settling=false; // (bodies are never added or removed inside a step: releases wait until it ends)
 function memberPose(C,b){const p=C.quaternion.vmult(b.local.p).vadd(C.position),q=C.quaternion.mult(b.local.q);return {p,q};}
 function memberVel(C,p){return C.velocity.vadd(C.angularVelocity.cross(p.vsub(C.position)));}
 // (re)build a compound from these member bodies at their current world poses, moving at the given velocities
 function buildCompound(mem,vel,ang){let M=0;const c=new CANNON.Vec3();for(const b of mem){M+=b.dynMass;c.x+=b.position.x*b.dynMass;c.y+=b.position.y*b.dynMass;c.z+=b.position.z*b.dynMass;}c.scale(1/M,c);
  const C=new CANNON.Body({material:propMat,collisionFilterGroup:G_PROP,collisionFilterMask:G_PROP|G_STATIC|G_HOLE,mass:M,linearDamping:.04,angularDamping:.12,sleepSpeedLimit:.18,sleepTimeLimit:.3});
  C.position.copy(c);C.members=new Set();
  for(const b of mem){const lp=b.position.vsub(c),lq=b.quaternion.clone();b.local={p:lp,q:lq};b.compound=C;C.members.add(b);
   for(let i=0;i<b.shapes.length;i++)C.addShape(b.shapes[i],lq.vmult(b.shapeOffsets[i]).vadd(lp),lq.mult(b.shapeOrientations[i]));}
  C.updateMassProperties();if(vel)C.velocity.copy(vel);if(ang)C.angularVelocity.copy(ang);
  {const cols=[];for(const b of mem){const p=b.position;if(!cols.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<b.it.r*.6))cols.push(p);}C.columns=cols.length;}
  C.addEventListener('collide',e=>{const o=e.body;if(!o||o.collisionFilterGroup===G_HOLE||C.members.has(o))return;if(Math.abs(e.contact.getImpactVelocityAlongNormal())>SHATTER)C.shatter=true;});
  world.addBody(C);compounds.add(C);return C;}
 // a member leaves the compound as an ordinary body with the speed it had as part of it
 function freeMember(C,b,calm){const {p,q}=memberPose(C,b);for(const s of b.shapes)s.body=b;b.compound=null;b.local=null;b.position.copy(p);b.quaternion.copy(q);
  // a column that lands and breaks up collapses into a heap: the pieces keep only a little of its motion
  b.velocity.copy(memberVel(C,p));b.angularVelocity.copy(C.angularVelocity);if(calm){b.velocity.scale(.25,b.velocity);b.angularVelocity.scale(.15,b.angularVelocity);}if(!b.world){world.addBody(b);active.add(b);}b.wakeUp();}
 // split some members off; the rest are rebuilt into a new compound (or freed too when only one is left)
 function split(C,leaving,calm=false){if(!compounds.has(C))return;compounds.delete(C);world.removeBody(C);const stay=[...C.members].filter(b=>!leaving.has(b));
  const v=C.velocity.clone(),w=C.angularVelocity.clone();for(const b of stay){const {p,q}=memberPose(C,b);b.position.copy(p);b.quaternion.copy(q);}
  for(const b of leaving)freeMember(C,b,calm);
  if(stay.length>1){const N=buildCompound(stay,null,w);N.velocity.copy(memberVel(C,N.position));if(C.sleepState===SLEEPING)N.sleep();}
  else for(const b of stay)freeMember(C,b,calm);}
 function release(g){if(!g||g.loose)return;g.loose=true;const mem=[];
  for(const b of g.bodies){if(!b.frozen||b.gone)continue;b.frozen=false;b.type=CANNON.Body.DYNAMIC;b.mass=b.dynMass;b.updateMassProperties();b.velocity.setZero();b.angularVelocity.setZero();if(b.world){world.removeBody(b);active.delete(b);}mem.push(b);}
  if(mem.length>1)buildCompound(mem);else for(const b of mem){activate(b.it);b.wakeUp();}}
 // each step: pose the members, split off pieces dropping into the hole, shatter a column that landed hard
 function stepCompounds(out){for(const C of [...compounds]){if(C.shatter){split(C,new Set(C.members),true);continue;}const leaving=new Set();
  for(const b of C.members){const it=b.it,{p,q}=memberPose(C,b);if(C.sleepState!==SLEEPING){it.x=p.x;it.cy=p.y;it.z=p.z;it.q=[q.x,q.y,q.z,q.w];it.moved=true;out.push(it);}
   if(it.r<=hole.r*.96&&Math.hypot(p.x-hole.x,p.z-hole.z)<hole.r-it.r*.3&&p.y<it.h*.6)leaving.add(b);}
  // whatever stood on a leaving piece loses its support: that whole column comes off too and drops (brick by brick)
  if(leaving.size){let grew=true;const pose=new Map();for(const b of C.members)pose.set(b,memberPose(C,b).p);
   while(grew){grew=false;for(const b of C.members){if(leaving.has(b))continue;const p=pose.get(b);for(const l of leaving){const q=pose.get(l);if(p.y>q.y+.05&&Math.hypot(p.x-q.x,p.z-q.z)<(b.it.r+l.it.r)*.55){leaving.add(b);grew=true;break;}}}}}
  // a stack of several columns (the Lego stacks) comes apart once the hole takes a piece: its bricks slump toward the hole
  // and pour in, as in the video; a single column (the disc towers) keeps sinking or toppling as one
  if(leaving.size){if(C.columns>1){const pose=new Map();for(const b of C.members)pose.set(b,memberPose(C,b).p);const near=new Set(leaving);
    for(const b of C.members){if(near.has(b))continue;const p=pose.get(b);for(const l of leaving){const q=pose.get(l);if(Math.hypot(p.x-q.x,p.z-q.z)<1.0){near.add(b);break;}}}
    split(C,near,true);}else split(C,leaving);}}}
 // a hard hit (a toppling neighbour, a flung prop) knocks a frozen column loose; a gentle nudge does not
 for(const g of groups)for(const b of g.bodies)b.addEventListener('collide',e=>{if(!settling&&b.frozen&&e.body&&!e.body.frozen&&e.body.type===CANNON.Body.DYNAMIC&&Math.abs(e.contact.getImpactVelocityAlongNormal())>LOOSEN)pendingRelease.add(b.group);});
 function activate(it){const b=it.body;if(!b||b.world||b.gone||b.compound)return;world.addBody(b);b.velocity.setZero();b.angularVelocity.setZero();b.sleep();active.add(b);}
 function deactivate(b){if(!b.world)return;world.removeBody(b);active.delete(b);}
 // let stacks and piles find their resting places (in patches, to keep each step small), then put everything to sleep.
 // A level's settled poses are cached on the level definition, so the second player's turn starts instantly.
 function settle(steps=20){settling=true;try{settleRun(steps);}finally{settling=false;pendingRelease.clear();}}
 function settleRun(steps){
  if(def._settled){for(const it of items){const s=def._settled[it.i],b=it.body;b.position.set(s[0],s[1],s[2]);b.quaternion.set(s[3],s[4],s[5],s[6]);}return;}
  const cell=6,groups=new Map();for(const it of items){const k=Math.floor(it.x/cell)+','+Math.floor(it.z/cell);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(it);}
  for(const [k,list] of groups){const [gx,gz]=k.split(',').map(Number),near=items.filter(it=>it.x>=(gx-.15)*cell&&it.x<(gx+1.15)*cell&&it.z>=(gz-.15)*cell&&it.z<(gz+1.15)*cell);
   for(const it of near)activate(it);for(const b of active)b.wakeUp();for(let i=0;i<steps;i++)world.step(STEP);
   for(const b of [...active]){b.velocity.setZero();b.angularVelocity.setZero();deactivate(b);}}
  def._settled=items.map(it=>{const p=it.body.position,q=it.body.quaternion;return [p.x,p.y,p.z,q.x,q.y,q.z,q.w];});}
 function wakeNear(x,y,z,rad){for(const C of compounds)if(C.sleepState===SLEEPING&&Math.hypot(C.position.x-x,C.position.z-z)<rad+3)C.wakeUp();for(const b of active){if(b.sleepState!==SLEEPING)continue;const p=b.position,d=Math.hypot(p.x-x,p.z-z);if(d<rad+b.it.br&&p.y>y-b.it.br-.2)b.wakeUp();}}
 function remove(it){const b=it.body;if(!b)return;if(b.compound)split(b.compound,new Set([b]));b.gone=true;if(!b.world)return;const p=b.position;deactivate(b);bodies[it.i]=null;wakeNear(p.x,p.y,p.z,it.br+.4);}
 // drop sleeping props that are far from the hole out of the world again
 // (never one that something awake is resting on or leaning against: a stack would lose its base)
 function prune(h,R){const awake=[];for(const b of active)if(b.sleepState!==SLEEPING&&!b.frozen)awake.push(b);
  for(const b of [...active]){if(b.sleepState!==SLEEPING&&!b.frozen)continue;const p=b.position;if(Math.hypot(p.x-h.x,p.z-h.z)<=R+b.it.br)continue;
   if(awake.some(o=>Math.hypot(o.position.x-p.x,o.position.z-p.z)<o.it.br+b.it.br+.3))continue;deactivate(b);}}
 // the hole's pull: a prop hanging over the hole is drawn toward its centre and down, so anything that fits ends up
 // dropping in (a fridge that tilted and wedged at Size 6 still goes), while one that is too big stays caught on the rim
 const tmpF=new CANNON.Vec3();
 world.addEventListener('preStep',()=>{for(const b of active){if(b.sleepState===SLEEPING||b.frozen)continue;const p=b.position,it=b.it,dx=hole.x-p.x,dz=hole.z-p.z,d=Math.hypot(dx,dz);
  if(d>hole.r+it.r*.25||p.y>it.h*.75)continue;const over=Math.max(0,Math.min(1,(hole.r+it.r*.25-d)/(it.r+.01))),k=b.mass*G*PULL*over; // only props hanging over the hole
  tmpF.set(d>1e-3?dx/d*k:0,-k*.6,d>1e-3?dz/d*k:0);b.applyForce(tmpF);}
  // columns: the same pull at their foot (which also tips them toward the hole), and a column sinking into the hole is
  // slowed a little (21 discs took about a second to go down in the video, not a free fall)
  for(const C of compounds){if(C.sleepState===SLEEPING)continue;let low=null;for(const b of C.members){const p=memberPose(C,b).p;if(!low||p.y<low.y)low=p;}
   const dx=hole.x-low.x,dz=hole.z-low.z,d=Math.hypot(dx,dz);if(d>hole.r+.3)continue;const k=C.mass*G*PULL*.5;
   tmpF.set(d>1e-3?dx/d*k:0,0,d>1e-3?dz/d*k:0);C.applyForce(tmpF,low.vsub(C.position));if(d<hole.r-.1&&C.velocity.y<0){tmpF.set(0,C.mass*G*.45,0);C.applyForce(tmpF);}}});
 // one frame: wake what the hole reaches, step at 60 Hz, copy poses back to the items
 function step(dt,h){hole.x=h.x;hole.z=h.z;hole.r=h.r;placeRim(h);
  // props small enough for the hole never touch its rim or throat: they stay put on the floor until the hole is under
  // them, then drop (as in the real game); only props too big to fit catch on the rim, get carried and wedge
  const fitR=h.r*.96;for(const b of active){if(b.ghost)continue;const m=b.it.r<=fitR?(G_PROP|G_STATIC):(G_PROP|G_STATIC|G_HOLE);if(b.collisionFilterMask!==m)b.collisionFilterMask=m;}
  for(const C of compounds){const m=G_PROP|G_STATIC|G_HOLE;if(C.collisionFilterMask!==m)C.collisionFilterMask=m;}
  const reach=h.r+.25;for(const b of active){const p=b.position,d=Math.hypot(p.x-h.x,p.z-h.z);
   if(b.frozen){if(d<h.r+b.it.r*.6)release(b.group);continue;} // the hole is under this column: it comes loose
   if(b.sleepState===SLEEPING&&d<reach+b.it.br)b.wakeUp();}
  for(const C of compounds)if(C.sleepState===SLEEPING&&Math.hypot(C.position.x-h.x,C.position.z-h.z)<reach+3)C.wakeUp();
  world.step(STEP,Math.min(dt,.1),4);for(const g of pendingRelease)release(g);pendingRelease.clear();
  // stop wake-up chains through tightly packed fields: a prop resting on the floor well away from the hole that is only
  // being jostled goes straight back to sleep (props mid-fall, flung, or up on a stack keep simulating)
  // nothing may leave the tray: cap speeds (a deep overlap can fling a prop hard enough to pass a wall) and put back
  // anything that got past the walls
  for(const b of active){if(b.sleepState===SLEEPING||b.ghost)continue;const v=b.velocity,s2=v.lengthSquared();if(s2>144)v.scale(12/Math.sqrt(s2),v);
   const p=b.position,mx=def.W/2-b.it.br*.6,mz=def.D/2-b.it.br*.6;if(Math.abs(p.x)>mx+.3||Math.abs(p.z)>mz+.3){p.set(Math.max(-mx,Math.min(mx,p.x)),Math.max(p.y,b.it.h*.5+.05),Math.max(-mz,Math.min(mz,p.z)));v.setZero();}}
  const calm=h.r+1.4;for(const b of active){if(b.sleepState===SLEEPING||b.frozen)continue;const p=b.position,it=b.it;
   if(p.y<it.h*.5+.08&&Math.hypot(p.x-h.x,p.z-h.z)>calm+it.br&&b.velocity.lengthSquared()<.36&&b.angularVelocity.lengthSquared()<2.2){b.velocity.setZero();b.angularVelocity.setZero();b.sleep();}}
  const out=[];for(const b of active){if(b.sleepState===SLEEPING||b.frozen)continue;const it=b.it,p=b.position,q=b.quaternion;it.x=p.x;it.cy=p.y;it.z=p.z;it.q=[q.x,q.y,q.z,q.w];it.moved=true;out.push(it);}
  stepCompounds(out);
  return out;}
 // a prop the hole is big enough for, hanging into it: it stops touching the floor, rim and throat and drops through
 function ghost(it){const b=it.body;if(!b||b.ghost||b.compound)return;b.ghost=true;b.collisionFilterMask=G_PROP;b.wakeUp();}
 // ...and solid again if the hole moved on before it dropped
 function solid(it){const b=it.body;if(!b||!b.ghost)return;b.ghost=false;b.collisionFilterMask=G_PROP|G_STATIC|G_HOLE;}
 // top of a prop's bounding box (world y): a prop counts as swallowed once it is (nearly) all below the floor
 function topY(it){const b=it.body;if(!b)return -1e9;if(b.compound)return it.cy+it.h;b.updateAABB?.();return b.aabb.upperBound.y;}
 function velocity(it){const b=it.body;if(b?.compound){const C=b.compound,v=memberVel(C,memberPose(C,b).p),w=C.angularVelocity;return {x:v.x,y:v.y,z:v.z,wx:w.x,wy:w.y,wz:w.z};}return b?{x:b.velocity.x,y:b.velocity.y,z:b.velocity.z,wx:b.angularVelocity.x,wy:b.angularVelocity.y,wz:b.angularVelocity.z}:{x:0,y:0,z:0,wx:0,wy:0,wz:0};}
 function push(it,fx,fz){const b=it.body;if(!b)return;activate(it);b.wakeUp();b.applyForce(new CANNON.Vec3(fx*b.mass,0,fz*b.mass));}
 return {world,step,remove,wakeNear,settle,velocity,push,inHole,topY,ghost,solid,activate,prune,release,groups,compoundCount:()=>compounds.size,inCompound:it=>!!it.body?.compound,frozen:it=>!!it.body?.frozen,inWorld:it=>!!it.body?.world,activeCount:()=>active.size,awake:()=>{let n=0;for(const b of active)if(b.sleepState!==SLEEPING)n++;return n;}};
}
Object.assign(exports,{createPhysics,kindBounds,G});
