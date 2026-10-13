// BF-23 — Original, bounded, deterministic cosmetic effects for Broforce Mobile.
// World coordinates are pixels, Y points down. This module never reads game RNG.
// Integrator: advance once per active simulation tick (seconds); never advance when
// paused. Apply fx.shakeOffset to the WORLD render transform (terrain, actors,
// this FX service), restore the transform, then draw HUD and touch controls.
// For depth: draw layer:'back' after terrain/before actors, then layer:'front'
// after actors; layer:'all' (default) is a one-pass, non-occluding fallback.
// Event shape: {type,x,y,dx?,dy?,radius?,intensity?}; name/kind alias type.
const BF_FX_EVENTS=Object.freeze(['muzzle','hit','ricochet','burst','wall-break',
 'volatile-chain','smoke','sparks','rescue','hero-swap','boss-hit','boss-death',
 'helicopter-arrival','extraction']);
const BF_FX_SET=new Set(BF_FX_EVENTS);
const BF_FX_COLORS=Object.freeze({
 fire:['#fff1c3','#ffcb73','#fa8b37','#ba472d'],
 metal:['#e3e4d4','#9eb4b2','#53747b','#303e49'],
 wood:['#c5a273','#89623e','#5f4939','#d0aa68'],
 dust:['#b8c1a7','#86978c','#556965','#d7bf93'],
 mint:['#e7f9d5','#96f2cd','#4fcbb6','#388e96'],
 gold:['#fff2ad','#f7cf6d','#dca451','#fffce0'],
 sparks:['#fff6d6','#ffd280','#f79a48','#e7dcab']
});
const BF_FX_SPEC=Object.freeze({
 muzzle:{n:5,p:'fire',spread:14,speed:85,life:.11,size:3,ring:0,flash:1,shake:.25},
 hit:{n:7,p:'sparks',spread:25,speed:110,life:.30,size:2,ring:0,flash:0,shake:.6},
 ricochet:{n:8,p:'sparks',spread:17,speed:170,life:.25,size:2,ring:0,flash:0,shake:0},
 burst:{n:29,p:'fire',spread:39,speed:155,life:.62,size:5,ring:1,flash:1,shake:3},
 'wall-break':{n:19,p:'wood',spread:27,speed:125,life:.66,size:4,ring:1,flash:0,shake:1.5},
 'volatile-chain':{n:33,p:'fire',spread:48,speed:205,life:.76,size:6,ring:2,flash:1,shake:4.2},
 smoke:{n:10,p:'dust',spread:14,speed:30,life:.85,size:9,ring:0,flash:0,shake:0},
 sparks:{n:12,p:'sparks',spread:14,speed:155,life:.31,size:2,ring:0,flash:0,shake:0},
 rescue:{n:16,p:'gold',spread:24,speed:95,life:.78,size:3,ring:2,flash:0,shake:0},
 'hero-swap':{n:19,p:'mint',spread:23,speed:125,life:.62,size:3,ring:2,flash:1,shake:0},
 'boss-hit':{n:19,p:'sparks',spread:32,speed:160,life:.54,size:4,ring:1,flash:1,shake:2.5},
 'boss-death':{n:36,p:'fire',spread:60,speed:205,life:.92,size:6,ring:2,flash:1,shake:5},
 'helicopter-arrival':{n:20,p:'dust',spread:42,speed:88,life:.83,size:6,ring:0,flash:0,shake:.6},
 extraction:{n:22,p:'gold',spread:30,speed:118,life:.84,size:4,ring:2,flash:1,shake:.6}
});
const bfLimit=(n,a,b)=>Math.max(a,Math.min(b,n));
const bfSafe=n=>typeof n==='number'&&Number.isFinite(n);
function bfSeed(seed){
 let h=2166136261;
 const s=(typeof seed==='string'?seed:String(bfSafe(seed)?seed:1));
 for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);
 return h>>>0||0x9e3779b9;
}
function bfRandom(fx){
 let x=fx.rngState;x^=x<<13;x^=x>>>17;x^=x<<5;
 fx.rngState=x>>>0;return fx.rngState/4294967296;
}
function createBroforceFx(seed=1,{quality='high',reducedMotion=false}={}){
 const low=quality==='low',reduced=!!reducedMotion;
 return {rngState:bfSeed(seed),quality:low?'low':'high',reducedMotion:reduced,
  maxParticles:reduced?(low?18:28):(low?56:128),
  maxRings:reduced?3:(low?5:10),maxFlashes:reduced?0:(low?2:4),
  particles:[],rings:[],flashes:[],shakeOffset:{x:0,y:0},
  shake:{power:0,remaining:0},elapsed:0};
}
function bfStore(arr,obj,cap){
 if(cap<1)return;
 if(arr.length>=cap)arr.shift();
 arr.push(obj);
}
function bfParticle(fx,x,y,palette,spec,type,angle,intensity){
 const r=bfRandom(fx),r2=bfRandom(fx),r3=bfRandom(fx);
 const speed=spec.speed*(.26+r*.83)*intensity;
 const kind=(type==='smoke'||type==='helicopter-arrival')?'smoke':
  (type==='wall-break'&&r2<.77)?'chip':
  (type==='burst'||type==='volatile-chain'||type==='boss-death')?
    (r2<.28?'smoke':r2<.68?'ember':'chip'):
  (type==='ricochet'||type==='sparks'||type==='hit'||type==='boss-hit')?'streak':
  (type==='rescue'||type==='hero-swap'||type==='extraction')?'glint':
  r2<.64?'streak':'ember';
 const isSmoke=kind==='smoke',isGlint=kind==='glint',isStreak=kind==='streak';
 const p=BF_FX_COLORS[isSmoke?'dust':palette];
 const life=bfLimit(spec.life*(.46+r3*.92)*(isSmoke?1.2:1),.045,1.25);
 const size=bfLimit(spec.size*(.6+r2*.95)*(isSmoke?1.45:1)*intensity,1,23);
 const direction=angle+(r2-.5)*(type==='muzzle'?1.15:Math.PI*2);
 const d=isSmoke?.34:1;
 return {x,y,vx:Math.cos(direction)*speed*d,vy:Math.sin(direction)*speed*d-(isSmoke?24:isGlint?45:0),
  age:0,life,size,kind,color:p[Math.floor(r3*p.length)],
  layer:isSmoke?'back':'front',gravity:isSmoke?-18:isGlint?60:kind==='chip'?265:155,
  drag:isSmoke?1.8:kind==='streak'?.6:1.3,rotation:r*6.283185307179586,
  spin:(r3-.5)*9,parallax:isSmoke?.94:1};
}
function emitBroforceFx(fx,event){
 if(!fx||!event||typeof event!=='object'||!Array.isArray(fx.particles))return false;
 const type=event.type||event.name||event.kind;
 if(!BF_FX_SET.has(type)||!bfSafe(event.x)||!bfSafe(event.y))return false;
 const spec=BF_FX_SPEC[type];
 const intensity=bfLimit(bfSafe(event.intensity)?event.intensity:1,.35,1.5);
 const radius=bfLimit(bfSafe(event.radius)?event.radius:spec.spread,2,72);
 const angle=Math.atan2(bfSafe(event.dy)?event.dy:0,bfSafe(event.dx)?event.dx:1);
 const count=Math.max(1,Math.round(spec.n*(fx.reducedMotion?.30:fx.quality==='low'?.53:1)*intensity));
 const palette=spec.p;
 for(let i=0;i<count;i++){
  const p=bfParticle(fx,event.x,event.y,palette,spec,type,angle,intensity);
  // Initial spread is measured in world pixels; no dependence on screen size.
  const a=bfRandom(fx)*Math.PI*2,dist=Math.sqrt(bfRandom(fx))*radius*(type==='muzzle'?.07:.24);
  p.x+=Math.cos(a)*dist;p.y+=Math.sin(a)*dist;
  bfStore(fx.particles,p,fx.maxParticles);
 }
 if(spec.ring){
  for(let i=0;i<spec.ring;i++)bfStore(fx.rings,{
   x:event.x,y:event.y,age:0,life:fx.reducedMotion?.24:.31+i*.09,
   radius:radius*(i===0?.42:.7),expansion:radius*(i===0?1.15:1.32),
   color:(palette==='mint'?'#8efbe0':palette==='gold'?'#fff0b0':'#ffc277'),
   layer:'front',width:i?1.5:2.5
  },fx.maxRings);
 }
 if(spec.flash&&!fx.reducedMotion){
  bfStore(fx.flashes,{x:event.x,y:event.y,age:0,
   life:type==='muzzle'?.065:type==='boss-death'?.115:.095,
   radius:bfLimit(radius*(type==='muzzle'?.48:.93),4,62),
   color:palette==='mint'?'#c8ffee':palette==='gold'?'#fff9d0':'#fff1c3',layer:'back'
  },fx.maxFlashes);
 }
 if(!fx.reducedMotion&&spec.shake){
  fx.shake.power=Math.min(5,Math.max(fx.shake.power,spec.shake*intensity));
  fx.shake.remaining=Math.max(fx.shake.remaining,.16);
 }
 return true;
}
function advanceBroforceFx(fx,dt){
 if(!fx||!bfSafe(dt)||dt<=0)return fx;
 const d=Math.min(dt,2);fx.elapsed+=d;
 for(let i=fx.particles.length-1;i>=0;i--){
  const p=fx.particles[i];p.age+=d;
  if(p.age>=p.life){fx.particles.splice(i,1);continue;}
  const v=1/(1+p.drag*d);p.vx*=v;p.vy=(p.vy+p.gravity*d)*v;
  p.x+=p.vx*d;p.y+=p.vy*d;p.rotation+=p.spin*d;
  if(!bfSafe(p.x)||!bfSafe(p.y))fx.particles.splice(i,1);
 }
 for(const arr of [fx.rings,fx.flashes])for(let i=arr.length-1;i>=0;i--){
  arr[i].age+=d;if(arr[i].age>=arr[i].life)arr.splice(i,1);
 }
 if(fx.reducedMotion){fx.shake.power=0;fx.shake.remaining=0;fx.shakeOffset.x=0;fx.shakeOffset.y=0;}
 else if(fx.shake.remaining>0){
  fx.shake.remaining=Math.max(0,fx.shake.remaining-d);
  const factor=fx.shake.power*fx.shake.remaining/.16;
  if(fx.shake.remaining){
   fx.shakeOffset.x=(bfRandom(fx)*2-1)*factor;
   fx.shakeOffset.y=(bfRandom(fx)*2-1)*factor;
  }else{fx.shakeOffset.x=0;fx.shakeOffset.y=0;fx.shake.power=0;}
 }else{fx.shakeOffset.x=0;fx.shakeOffset.y=0;}
 return fx;
}
function bfPolygon(ctx,x,y,r,rotation=0,points=8){
 ctx.beginPath();
 for(let i=0;i<points;i++){
  const a=i*Math.PI*2/points+rotation;
  const px=Math.round(x+Math.cos(a)*r),py=Math.round(y+Math.sin(a)*r);
  if(!i)ctx.moveTo(px,py);else ctx.lineTo(px,py);
 }
 ctx.closePath();
}
function bfVisible(x,y,r,width,height){return bfSafe(x)&&bfSafe(y)&&x+r>=-8&&y+r>=-8&&x-r<=width+8&&y-r<=height+8;}
function bfDrawParticle(g,p,cam,view,alpha){
 const x=p.x-cam.x*p.parallax,y=p.y-cam.y*p.parallax;
 const r=p.size*(p.kind==='smoke'?1+p.age/p.life*.9:1);
 if(!bfVisible(x,y,r*2,view.width,view.height))return;
 g.globalAlpha=alpha*(p.kind==='smoke'?.23:p.kind==='ember'?.82:.92);
 g.fillStyle=p.color;
 const sx=Math.round(x),sy=Math.round(y),s=Math.max(1,Math.round(r));
 if(p.kind==='smoke'){
  // Staggered low-alpha pixel clusters; deliberately avoids the hero's face.
  g.fillRect(sx-s,sy-s/2,s*2,s*.8);g.fillRect(sx-s*.62,sy-s,s*1.2,s*.65);
  g.fillRect(sx+s*.35,sy-s*.6,s*.8,s*.8);
 }else if(p.kind==='streak'){
  const ex=Math.round(x-p.vx*.027),ey=Math.round(y-p.vy*.027);
  g.strokeStyle=p.color;g.lineWidth=Math.max(1,Math.round(s*.44));
  g.beginPath();g.moveTo(sx,sy);g.lineTo(ex,ey);g.stroke();
  g.fillRect(sx,sy,Math.max(1,s*.55),Math.max(1,s*.55));
 }else if(p.kind==='glint'){
  g.fillRect(sx-s,sy,s*2,Math.max(1,s*.32));
  g.fillRect(sx,sy-s*.9,Math.max(1,s*.32),s*1.8);
 }else if(p.kind==='ember'){
  bfPolygon(g,sx,sy,s,p.rotation,6);g.fill();
 }else{
  g.save();g.translate(sx,sy);g.rotate(p.rotation);
  g.fillRect(-s,-s*.5,s*1.9,s*.95);
  g.fillStyle='#293a3c';g.fillRect(-s,-s*.5,s*.45,s*.32);g.restore();
 }
}
function drawBroforceFx(ctx,{fx,camera,viewport,time=0,layer='all'}={}){
 if(!ctx||!fx||!viewport||!bfSafe(viewport.width)||!bfSafe(viewport.height)||
  viewport.width<=0||viewport.height<=0||!Array.isArray(fx.particles))return;
 const cam={x:bfSafe(camera?.x)?camera.x:0,y:bfSafe(camera?.y)?camera.y:0};
 const drawBack=layer==='all'||layer==='back';
 const drawFront=layer==='all'||layer==='front';
 if(!drawBack&&!drawFront)return;
 ctx.save();
 try{
  const baseAlpha=bfSafe(ctx.globalAlpha)?ctx.globalAlpha:1;
  ctx.imageSmoothingEnabled=false;
  if(drawBack){
   let blooms=0;
   for(const f of fx.flashes){
    const x=f.x-cam.x,y=f.y-cam.y,t=bfLimit(1-f.age/f.life,0,1);
    if(!bfVisible(x,y,f.radius,viewport.width,viewport.height))continue;
    if(blooms++<2&&typeof ctx.createRadialGradient==='function'){
     const grad=ctx.createRadialGradient(x,y,0,x,y,f.radius);
     grad.addColorStop(0,f.color);grad.addColorStop(.3,'#f7a956');grad.addColorStop(1,'rgba(255,156,63,0)');
     ctx.globalAlpha=baseAlpha*t*.28;ctx.fillStyle=grad;
     ctx.fillRect(x-f.radius,y-f.radius,f.radius*2,f.radius*2);
    }
    ctx.globalAlpha=baseAlpha*t*.48;ctx.fillStyle=f.color;
    bfPolygon(ctx,x,y,Math.max(2,f.radius*.28),Math.PI/8,8);ctx.fill();
   }
  }
  for(const p of fx.particles){
   if((p.layer==='back'&&!drawBack)||(p.layer==='front'&&!drawFront))continue;
   const t=bfLimit(1-p.age/p.life,0,1);
   bfDrawParticle(ctx,p,cam,viewport,baseAlpha*t);
  }
  if(drawFront)for(const r of fx.rings){
   const t=bfLimit(r.age/r.life,0,1),rad=r.radius+r.expansion*t;
   const x=r.x-cam.x,y=r.y-cam.y;
   if(!bfVisible(x,y,rad,viewport.width,viewport.height))continue;
   ctx.globalAlpha=baseAlpha*(1-t)*(fx.reducedMotion?.43:.72);
   ctx.strokeStyle=r.color;ctx.lineWidth=r.width*(1-t*.5);
   bfPolygon(ctx,x,y,rad,Math.PI/8,8);ctx.stroke();
  }
 }finally{ctx.restore();}
}
Object.assign(exports,{createBroforceFx,emitBroforceFx,advanceBroforceFx,drawBroforceFx});
