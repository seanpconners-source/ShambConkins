const {arcadeRounds}=require("src/engines/arcade.js");
const {clamp, seededRandom, shuffle, pick}=require("src/utils.js");
const {sound, pickupSound}=require("src/audio.js");
const HOLE_WORLD={w:2400,h:1800};
const GOALS=[
 {id:'rum-ham',name:'Rum Ham',icon:'🍖',r:24},
 {id:'fight-milk',name:'Fight Milk',icon:'🥛',r:10},
 {id:'kitten-mittens',name:'Kitten Mittens',icon:'🐾',r:12},
 {id:'birthday-oreos',name:'Birthday Oreos',icon:'🍪',r:10},
 {id:'orange-soda',name:'Kel’s Orange Soda',icon:'🥤',r:15},
 {id:'gak',name:'Nickelodeon Gak',icon:'🟢',r:18}
];
function holeObjectives(seed){return shuffle(GOALS,seededRandom(seed+'-goals')).slice(0,3).map((g,i)=>({...g,need:[3,2,1][i]}));}
function holeLayout(seed){
 const random=seededRandom(seed),objects=[];
 for(let i=0;i<126;i++){
  const tier=i<74?0:i<104?1:i<120?2:3,r=[7,14,27,43][tier];
  objects.push({id:i,x:105+i%14*162+(random()-.5)*50,y:120+Math.floor(i/14)*183+(random()-.5)*50,r,tier,
   icon:pick(tier===0?['📦','🍕','🗑','🚧']:tier===1?['🌳','🚲','🪑']:tier===2?['🚗','🍔','🛸']:['🏠','🏬','🦖'],random),
   value:[5,12,25,60][tier],mass:[1,3,9,22][tier],sink:0,gone:false});
 }
 let at=0;
 for(const goal of holeObjectives(seed))for(let j=0;j<goal.need;j++){
  const angle=at*1.17+.2,distance=260+at*85;
  objects.push({id:'goal-'+at++,goal:goal.id,name:goal.name,icon:goal.icon,x:clamp(360+Math.cos(angle)*distance,100,1300),
   y:clamp(430+Math.sin(angle)*distance,120,1150),r:goal.r,tier:goal.r>20?2:goal.r>15?1:0,value:50,mass:3,sink:0,gone:false});
 }
 for(let i=0;i<9;i++){
  let p;for(let tries=0;tries<50;tries++){p={x:180+random()*2030,y:130+random()*1500};if(Math.hypot(p.x-240,p.y-310)>260&&objects.every(o=>Math.hypot(o.x-p.x,o.y-p.y)>75))break;}
  objects.push({id:'bomb-'+i,...p,r:10,tier:0,bomb:true,icon:'💣',value:0,mass:0,sink:0,gone:false});
 }
 return objects;
}
function holeRadius(mass){return Math.min(91,22+Math.sqrt(Math.max(0,mass))*4.8);}
function holeProgress(a){return (a.objectives||[]).map(g=>({...g,got:a.objects.filter(o=>o.goal===g.id&&o.gone).length}));}
function swallowStep(a,dt){
 if(a.dead)return false;const r=holeRadius(a.mass);
 for(const o of a.objects){
  if(o.gone)continue;const d=Math.hypot(o.x-a.x,o.y-a.y);
  if(o.sink>0){
   o.sink+=dt;if(o.sink>=.42){
    o.gone=true;
    if(o.bomb){a.dead=true;a.hp=0;a.blast=.9;a.score=Math.max(0,a.score-100);return false;}
    a.mass+=o.mass;a.score+=o.value;a.combo++;a.pop=.45;
   }continue;
  }
  // Bombs only enter when their center is inside; their red halo is a warning.
  if(o.bomb){if(d<r-o.r*.3)o.sink=.001;continue;}
  if(o.r<=r*.72&&d<r+o.r*.6){const force=Math.min(1,dt*5);o.x+=(a.x-o.x)*force;o.y+=(a.y-o.y)*force;if(d<r-o.r*.25)o.sink=.001;}
 }
 const progress=holeProgress(a);
 return progress.length?progress.every(g=>g.got>=g.need):a.objects.every(o=>o.gone);
}
function holeView(W,H,camera){const scale=clamp(Math.min(W/980,H/560),.38,1.5);return {W,H,scale,camera,tilt:.66};}
function projectHole(p,view,elevation=0){return {x:view.W/2+(p.x-view.camera.x)*view.scale,y:view.H*.54+(p.y-view.camera.y)*view.scale*view.tilt-elevation*view.scale};}
function holeStick(origin,point){const dx=point.x-origin.x,dy=point.y-origin.y,d=Math.hypot(dx,dy);if(d<7)return {x:0,y:0};const strength=Math.min(1,(d-7)/50);return {x:dx/d*strength,y:dy/d*strength};}
function polygon(x,points,color){x.fillStyle=color;x.beginPath();x.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))x.lineTo(p.x,p.y);x.closePath();x.fill();}
function drawHoleProp(s,x,o,view,radius,elapsed,player){
 const t=o.sink?Math.max(0,1-o.sink/.42):1,base=projectHole(o,view),r=Math.max(6,o.r*view.scale),height=([16,32,45,86][o.tier]||20)*view.scale*t;
 x.save();x.globalAlpha=t;x.translate(base.x,base.y+o.sink*view.scale*40);x.scale(t,t);
 x.fillStyle='#1b303833';x.beginPath();x.ellipse(5,4,r*1.3,r*.58,0,0,Math.PI*2);x.fill();
 if(!o.bomb){
  polygon(x,[{x:-r,y:-r*.35},{x:r,y:-r*.35},{x:r,y:-height},{x:-r,y:-height} ],o.goal?'#b58a3a':'#648788');
  polygon(x,[{x:r,y:-r*.35},{x:r*1.3,y:-r*.8},{x:r*1.3,y:-height-r*.45},{x:r,y:-height}],o.goal?'#7a5625':'#3b626e');
  polygon(x,[{x:-r,y:-height},{x:r,y:-height},{x:r*1.3,y:-height-r*.45},{x:-r*.7,y:-height-r*.45}],o.goal?'#f3d98e':'#a4bbbe');
 }
 if(o.bomb){const size=Math.max(28,r*3.4);x.globalAlpha=1;x.fillStyle='#321427';x.beginPath();x.arc(0,-height-6,size*.58,0,Math.PI*2);x.fill();x.strokeStyle='#ff514f';x.lineWidth=3;x.stroke();s.sprite(x,1-player,0,-height-6,size,{exact:true,mood:'angry'});}
 x.textAlign='center';x.textBaseline='middle';x.font=`${Math.max(17,r*1.8)}px system-ui`;if(!o.bomb)x.fillText(o.icon,0,-height-6);
 if(o.goal){x.strokeStyle='#ffe290';x.lineWidth=2;x.setLineDash([3,3]);x.beginPath();x.ellipse(0,0,r*1.65,r*.85,0,0,Math.PI*2);x.stroke();x.setLineDash([]);x.fillStyle='#fff1aa';x.font='bold 12px monospace';x.fillText('GOAL',0,-height-r-14);}
 if(o.bomb){x.strokeStyle='#ef534f';x.lineWidth=3;x.beginPath();x.ellipse(0,0,Math.max(17,r*2),Math.max(9,r),0,0,Math.PI*2);x.stroke();x.fillStyle='#fff0a8';x.font='bold 14px monospace';x.fillText('!',0,-height-24-Math.sin(elapsed*8)*3);}
 else if(o.r>radius*.72){x.strokeStyle='#424f6c66';x.beginPath();x.ellipse(0,0,r*1.45,r*.7,0,0,Math.PI*2);x.stroke();}
 x.restore();
}
async function neighborhoodHole(s){
 const[c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body','hole-arena-body');
 const hud=document.createElement('div');hud.className='hole-objectives';hud.setAttribute('aria-label','Neighborhood collection goals');s.body.insertBefore(hud,s.body.firstChild);
 let api,contact=null,stick={x:0,y:0};
 const clear=()=>{contact=null;stick={x:0,y:0};const a=api?.get();if(a)a.keys={};};
 s.resetOnPause?.(clear);s.cleanup(clear);s.on(window,'blur',clear);s.on(window,'resize',clear);
 return arcadeRounds(s,{
  duration:60,instructions:'Collect the three named goal sets in a larger neighborhood. Eat small props to grow; gold markers are your deliveries. Red bombs kill your round. Touch anywhere, drag away from that starting point to steer, lift to stop. Both players get the same map and goals.',
  reset:()=>({x:240,y:310,camera:{x:240,y:310},mass:0,hp:1,objects:holeLayout(s.seed),objectives:holeObjectives(s.seed),keys:{},combo:0,pop:0,dead:false,blast:0,complete:false}),
  bind:a=>{
   api=a;s.on(c,'pointerdown',ev=>{const g=a.get();if(s.paused||!g||g.dead||contact)return;ev.preventDefault();contact={id:ev.pointerId,origin:s.pointer(ev),point:s.pointer(ev)};stick={x:0,y:0};s.capture(ev);});
   s.on(c,'pointermove',ev=>{if(s.paused||contact?.id!==ev.pointerId)return;contact.point=s.pointer(ev);stick=holeStick(contact.origin,contact.point);});
   const release=ev=>{if(contact?.id!==ev.pointerId)return;clear();s.release(ev);};s.on(c,'pointerup',release);s.on(c,'pointercancel',release);s.on(c,'lostpointercapture',release);
   const keys={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down'};
   s.on(document,'keydown',ev=>{if(keys[ev.key]&&!s.paused){ev.preventDefault();a.get().keys[keys[ev.key]]=true;}});s.on(document,'keyup',ev=>{if(keys[ev.key]&&a.get())a.get().keys[keys[ev.key]]=false;});
   s.hint('Touch anywhere to place your steering origin. Drag away from it to move, farther to move faster; lift to stop. Gold goal markers show required deliveries. Props grow the hole; bigger props only fit later. Red bombs end your turn with a 100-point penalty. Finish all goals for a 250-point bonus. Arrow keys/WASD also work.');
  },
  step:(a,dt)=>{
   if(a.dead){a.blast-=dt;return a.blast>0;}
   a.pop=Math.max(0,a.pop-dt);let dx=stick.x+((a.keys.right?1:0)-(a.keys.left?1:0)),dy=stick.y+((a.keys.down?1:0)-(a.keys.up?1:0)),l=Math.max(1,Math.hypot(dx,dy));
   a.x=clamp(a.x+dx/l*350*dt,25,HOLE_WORLD.w-25);a.y=clamp(a.y+dy/l*350*dt,25,HOLE_WORLD.h-25);
   a.camera.x+=(a.x-a.camera.x)*Math.min(1,dt*9);a.camera.y+=(a.y-a.camera.y)*Math.min(1,dt*9);
   const old=a.score,complete=swallowStep(a,dt);if(a.dead){clear();sound('shot');s.react?.(a.player,'sad',2);return true;}
   if(a.score>old)pickupSound(s);
   if(complete&&!a.complete){a.complete=true;a.score+=250;s.react?.(a.player,'win');sound('win');return false;}
   return true;
  },
  draw:a=>{
   const W=s.W,H=s.H,view=holeView(W,H,a.camera),radius=holeRadius(a.mass);
   x.fillStyle='#b9cbd0';x.fillRect(0,0,W,H);
   for(let yy=0;yy<HOLE_WORLD.h;yy+=240)for(let xx=0;xx<HOLE_WORLD.w;xx+=300){
    const p=[{x:xx+12,y:yy+15},{x:xx+277,y:yy+15},{x:xx+277,y:yy+218},{x:xx+12,y:yy+218}].map(p=>projectHole(p,view));polygon(x,p,(xx/300+yy/240)%2?'#d7dcc9':'#dde3df');
   }
   x.strokeStyle='#f2f2d677';x.lineWidth=2;x.setLineDash([8,14]);for(let yy=0;yy<HOLE_WORLD.h;yy+=240){const a=projectHole({x:0,y:yy},view),b=projectHole({x:HOLE_WORLD.w,y:yy},view);x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();}x.setLineDash([]);
   const p=projectHole(a,view),r=radius*view.scale;
   x.fillStyle='#101623';x.strokeStyle=a.dead?'#ff624b':a.player?'#ef72a6':'#58a4fb';x.lineWidth=4;x.beginPath();x.ellipse(p.x,p.y,r,r*.66,0,0,Math.PI*2);x.fill();x.stroke();
   x.strokeStyle='#b5ddf955';x.lineWidth=2;x.beginPath();x.ellipse(p.x,p.y+2,r*.7,r*.31,0,0,Math.PI*2);x.stroke();
   for(const o of a.objects.filter(o=>!o.gone).sort((a,b)=>a.y-b.y)){const q=projectHole(o,view);if(q.x<-100||q.x>W+100||q.y<-30||q.y>H+140)continue;drawHoleProp(s,x,o,view,radius,a.elapsed,a.player);}
   s.sprite(x,a.player,p.x,p.y-12,clamp(r*.8,32,62),{exact:true,mood:a.dead?'sad':'walking'});
   const progress=holeProgress(a);const markup=`<strong>${Math.ceil(a.time)}s</strong>${progress.map(g=>`<span class="${g.got>=g.need?'goal-done':''}">${g.icon} ${g.name} <b>${g.got}/${g.need}</b></span>`).join('')}`;if(hud.innerHTML!==markup)hud.innerHTML=markup;
   const size=Math.min(105,W*.24),ox=W-size-8,oy=10,mk=size/HOLE_WORLD.w;
   x.fillStyle='#162633bb';x.fillRect(ox,oy,size,HOLE_WORLD.h*mk);for(const o of a.objects)if(!o.gone&&(o.goal||o.bomb)){x.fillStyle=o.bomb?'#ff655a':'#ffd776';x.fillRect(ox+o.x*mk-2,oy+o.y*mk-2,4,4);}x.fillStyle='#fff';x.fillRect(ox+a.x*mk-3,oy+a.y*mk-3,6,6);
   const goal=a.objects.filter(o=>o.goal&&!o.gone).sort((b,c)=>Math.hypot(b.x-a.x,b.y-a.y)-Math.hypot(c.x-a.x,c.y-a.y))[0];
   if(goal){const gp=projectHole(goal,view);if(gp.x<25||gp.x>W-25||gp.y<25||gp.y>H-25){const tx=clamp(gp.x,22,W-22),ty=clamp(gp.y,105,H-26);x.fillStyle='#ffe3a3';x.font='bold 22px system-ui';x.textAlign='center';x.fillText(goal.icon,tx,ty);x.font='bold 11px monospace';x.fillText('GOAL',tx,ty+17);}}
   if(a.dead){x.fillStyle='#ef773577';x.beginPath();x.arc(p.x,p.y,(1-a.blast/.9)*120+12,0,Math.PI*2);x.fill();x.fillStyle='#fff4be';x.font='bold 24px monospace';x.textAlign='center';x.fillText('BOMB! ROUND OVER',W/2,H*.3);}
   else if(a.pop>0){x.fillStyle='#1c3849';x.font='bold 20px monospace';x.textAlign='center';x.fillText('GULP!',p.x,p.y-r-20);}
   s.status(`${s.players[a.player].name} · ${a.score} points · size ${Math.round(radius)} · collect gold goals, avoid red bombs`);
   s.debug={actor:a,world:HOLE_WORLD,radius,view,contact,stick,swallowStep,progress};
  }
 });
}

Object.assign(exports,{HOLE_WORLD,holeObjectives,holeLayout,holeRadius,holeProgress,swallowStep,holeView,projectHole,holeStick,drawHoleProp,neighborhoodHole});