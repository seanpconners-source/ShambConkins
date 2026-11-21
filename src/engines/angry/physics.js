// Angry Heads physics: real rigid bodies (cannon-es, the 3D engine the Hole.it game uses, held flat: every body may only
// move in x/y and turn about z) so towers topple, planks see-saw and blocks tumble. Forts start asleep (a perfectly still
// stack) and wake when something hits them; when anything breaks, everything wakes so what it held up falls.
// Damage: every hit takes hp by how hard it was (impact speed) and how heavy the other thing is. Heads pop when their hp is
// gone; TNT explodes; the special birds' powers live here too (split, boost, bomb, egg, big).
const C=require("src/vendor/cannon.js");
const {MAT}=require("src/engines/angry/levels.js");
const G=-22,BIRD_R=.62,BIRD_M=3.2,DT=1/120;
function makePhys(level,{onBreak,onPig,onBoom,onBonus}={}){
 const world=new C.World({gravity:new C.Vec3(0,G,0)});world.allowSleep=true;world.solver.iterations=20;world.broadphase=new C.SAPBroadphase(world);
 world.defaultContactMaterial.friction=.6;world.defaultContactMaterial.restitution=.08;world.defaultContactMaterial.contactEquationStiffness=5e6;world.defaultContactMaterial.contactEquationRelaxation=4;
 const flat=b=>{b.linearFactor=new C.Vec3(1,1,0);b.angularFactor=new C.Vec3(0,0,1);b.allowSleep=true;b.sleepSpeedLimit=.25;b.sleepTimeLimit=.6;b.linearDamping=.05;b.angularDamping=.12;return b;};
 const ground=new C.Body({mass:0,shape:new C.Box(new C.Vec3(400,5,2))});ground.position.set(150,-5,0);world.addBody(ground);
 const items=[],dead=[],pending=[];let woke=false,birds=[];
 level.bodies.forEach((s,i)=>{let b;
  if(s.kind==='terrain'){b=new C.Body({mass:0,shape:new C.Box(new C.Vec3(s.w/2,s.h/2,1.2))});b.position.set(s.x,s.y,0);world.addBody(b);items.push({i,s,b,hp:Infinity,static:true});return;}
  if(s.kind==='block'||s.kind==='tnt'){const w=s.w||s.s,h=s.h||s.s,m=s.kind==='tnt'?.8:MAT[s.mat].density*w*h;b=flat(new C.Body({mass:m,shape:new C.Box(new C.Vec3(w/2,h/2,.6))}));}
  else{const m=s.kind==='pig'?(s.king?3:.9)*s.r*s.r/.3:.4;b=flat(new C.Body({mass:m,shape:new C.Sphere(s.r)}));}
  b.position.set(s.x,s.y,0);world.addBody(b);b.sleep();
  const hp=s.kind==='block'?MAT[s.mat].hp:s.kind==='pig'?(s.king?3.2:1)*(1+(s.armor||0)*1.6):s.kind==='tnt'?.6:.8;
  const it={i,s,b,hp,max:hp};b.item=it;items.push(it);
  b.addEventListener('collide',e=>{if(it.gone)return;const o=e.body,v=Math.abs(e.contact.getImpactVelocityAlongNormal());if(v<1.4)return;
   const om=o.mass||b.mass*1.2,ratio=Math.min(3.2,Math.max(.35,om/b.mass)),thr=s.kind==='pig'?1.6:2.1;
   const dmg=Math.max(0,v-thr)*ratio*(s.kind==='pig'?.55:.42)*(o.isBird?1.5:1);if(dmg<=0)return;it.hp-=dmg;it.hit=.25;if(it.hp<=0)pending.push(it);});
 });
 // a body breaks: off the world, points and effects, and whatever it held up wakes
 function breakItem(it,why){if(it.gone)return;it.gone=true;world.removeBody(it.b);dead.push(it.i);const s=it.s;
  if(s.kind==='pig')onPig?.(it,why);else if(s.kind==='tnt'){boom(it.b.position.x,it.b.position.y,4.2,7);onBoom?.(it.b.position.x,it.b.position.y,4.2);}else if(s.kind==='bonus')onBonus?.(it);else onBreak?.(it,why);woke=true;}
 function boom(x,y,R,power){for(const it of items){if(it.gone||it.static)continue;const p=it.b.position,dx=p.x-x,dy=p.y-y,d=Math.hypot(dx,dy);if(d>R)continue;
   const k=1-d/R;it.b.wakeUp();it.b.applyImpulse(new C.Vec3(dx/(d||1)*power*k*it.b.mass*1.4,(dy/(d||1)+.4)*power*k*it.b.mass*1.4,0),it.b.position);it.hp-=k*power*.9;if(it.hp<=0)pending.push(it);}
  for(const bd of birds){const p=bd.b.position,dx=p.x-x,dy=p.y-y,d=Math.hypot(dx,dy);if(d<R&&d>.1)bd.b.applyImpulse(new C.Vec3(dx/d*power*bd.b.mass,dy/d*power*bd.b.mass,0),p);}woke=true;}
 // ---- birds
 function launch(x,y,vx,vy,o={}){const r=o.r||BIRD_R,b=flat(new C.Body({mass:o.m||BIRD_M,shape:new C.Sphere(r)}));b.isBird=true;b.allowSleep=false;b.angularDamping=.3;b.linearDamping=.01;
  b.position.set(x,y,0);b.velocity.set(vx,vy,0);world.addBody(b);const bd={b,r,t:0,used:false,ability:o.ability||null,kind:o.kind||'head',item:o.item||null,touched:false,parent:o.parent||null};
  b.addEventListener('collide',()=>{bd.touched=true;});birds.push(bd);return bd;}
 // the bird's power, on a tap in the air
 function power(bd){if(!bd||bd.used||bd.touched||!bd.ability)return false;bd.used=true;const b=bd.b,v=b.velocity,p=b.position;
  switch(bd.ability){
   case 'split':{const sp=Math.hypot(v.x,v.y),a=Math.atan2(v.y,v.x);for(const da of [-.22,.22])launch(p.x,p.y+da,Math.cos(a+da)*sp,Math.sin(a+da)*sp,{r:bd.r*.75,m:BIRD_M*.6,kind:bd.kind,item:bd.item,parent:bd});return 'split';}
   case 'boost':{const sp=Math.hypot(v.x,v.y)||1;b.velocity.set(v.x/sp*Math.max(38,sp*2.1),v.y/sp*Math.max(38,sp*2.1),0);b.mass*=1.4;b.updateMassProperties();return 'boost';}
   case 'bomb':{boom(p.x,p.y,4.6,8.5);onBoom?.(p.x,p.y,4.6);world.removeBody(b);bd.gone=true;return 'bomb';}
   case 'egg':{const e=launch(p.x,p.y-.9,0,-34,{r:.55,m:9,kind:'egg',parent:bd});e.egg=true;b.velocity.set(v.x*.6,Math.abs(v.y)+16,0);return 'egg';}
   case 'big':{world.removeBody(b);const nb=launch(p.x,p.y,v.x,v.y,{r:bd.r*2.1,m:BIRD_M*6,kind:bd.kind,item:bd.item});bd.gone=true;nb.used=true;nb.big=true;return 'big';}}
  return false;}
 let acc=0;
 function step(dt){acc+=Math.min(dt,.05);while(acc>=DT){acc-=DT;world.step(DT);for(const bd of birds)bd.t+=DT;
   while(pending.length)breakItem(pending.shift(),'hit');
   for(const it of items)if(!it.gone&&!it.static&&(it.b.position.y<-6||Math.abs(it.b.position.x)>400))breakItem(it,'fall');
   if(woke){woke=false;for(const it of items)if(!it.gone&&!it.static)it.b.wakeUp();}
   for(const it of items)if(it.hit>0)it.hit-=DT;}}
 // still: the shot is over once the birds have stopped (or flown off) and nothing in the fort moves
 function settled(){for(const bd of birds){if(bd.gone)continue;const v=bd.b.velocity,p=bd.b.position;if(p.y<-5||p.x>500||p.x<-60)continue;if(bd.t<12&&Math.hypot(v.x,v.y)>.6)return false;}
  for(const it of items){if(it.gone||it.static)continue;const v=it.b.velocity;if(it.b.sleepState!==C.Body.SLEEPING&&(Math.hypot(v.x,v.y)>.35||Math.abs(it.b.angularVelocity.z)>.4))return false;}return true;}
 const pigsLeft=()=>items.filter(it=>!it.gone&&it.s.kind==='pig').length;
 return {world,items,birds,dead,step,launch,power,boom,settled,pigsLeft,clearBirds(){for(const bd of birds)if(!bd.gone)world.removeBody(bd.b);birds.length=0;birds=birds;}};
}
Object.assign(exports,{makePhys,BIRD_R,G});
