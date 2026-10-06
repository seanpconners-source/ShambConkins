const {arcadeRounds}=require("src/engines/arcade.js");
const {clamp, seededRandom, shuffle, pick}=require("src/utils.js");
const {sound, pickupSound}=require("src/audio.js");
// Paddy's Neighborhood Hole: a pitched-camera 3D scene of a whole Philadelphia
// neighbourhood. Houses, cars, trees, buses and a pub sit on a 4800x3600 map; you are a
// hole that grows as it swallows things. Everything is real geometry (boxes, cylinders,
// cones, domes, prisms) projected through a perspective camera.
const BLOCK={w:800,h:900,cols:6,rows:4,road:180};
const HOLE_WORLD={w:BLOCK.w*BLOCK.cols,h:BLOCK.h*BLOCK.rows};
const GOALS=[
 {id:'rum-ham',name:'Rum Ham',icon:'🍖',r:24,shape:'dome',color:'#d97a6c',h:34},
 {id:'fight-milk',name:'Fight Milk',icon:'🥛',r:14,shape:'box',color:'#f4f6f9',h:44,w:26,d:26},
 {id:'kitten-mittens',name:'Kitten Mittens',icon:'🐾',r:16,shape:'dome',color:'#6b8fd6',h:26},
 {id:'birthday-oreos',name:'Birthday Oreos',icon:'🍪',r:18,shape:'cyl',color:'#4a3322',h:16},
 {id:'orange-soda',name:'Kel’s Orange Soda',icon:'🥤',r:15,shape:'cyl',color:'#f08a1c',h:42},
 {id:'gak',name:'Nickelodeon Gak',icon:'🟢',r:20,shape:'dome',color:'#7ee05c',h:24}
];
const TIERS=[{value:5,mass:1},{value:12,mass:3.5},{value:28,mass:10},{value:70,mass:30},{value:180,mass:85}];
// shape: box | cyl | cone | dome | tree | car | house | tower | gazebo | fountain | critter | pub
const SPEC={
 can:{tier:0,shape:'cyl',w:9,d:9,h:15,c:['#d94b3d']},bottle:{tier:0,shape:'cyl',w:7,d:7,h:22,c:['#3f9d5b']},
 pizza:{tier:0,shape:'box',w:16,d:16,h:3,c:['#e8b04a'],decal:'🍕'},paper:{tier:0,shape:'box',w:15,d:11,h:3,c:['#ece6d1']},
 rat:{tier:0,shape:'critter',w:12,d:12,h:10,icon:'🐀',flee:150},pigeon:{tier:0,shape:'critter',w:12,d:12,h:14,icon:'🐦',flee:210},
 clock:{tier:1,shape:'cyl',w:22,d:22,h:10,c:['#ffd24a'],decal:'⏱',bonusTime:4},
 trash:{tier:1,shape:'cyl',w:26,d:26,h:36,c:['#7d8a94']},hydrant:{tier:1,shape:'cyl',w:22,d:22,h:34,c:['#d6342c']},
 cone:{tier:1,shape:'cone',w:26,d:26,h:42,c:['#f28a2e']},bench:{tier:1,shape:'box',w:50,d:20,h:26,c:['#8a5a3a']},
 mailbox:{tier:1,shape:'box',w:22,d:20,h:38,c:['#2d6a9a'],decal:'✉'},barrel:{tier:1,shape:'cyl',w:30,d:30,h:38,c:['#7a4a2b']},
 crate:{tier:1,shape:'box',w:34,d:34,h:34,c:['#b98a52']},bush:{tier:1,shape:'dome',w:38,d:38,h:30,c:['#3f8a4a']},
 bike:{tier:1,shape:'box',w:42,d:14,h:26,c:['#2c6fb8'],decal:'🚲'},grill:{tier:1,shape:'dome',w:32,d:32,h:32,c:['#444b55'],decal:'🔥'},
 tree:{tier:2,shape:'tree',w:46,d:46,h:110,c:['#6b4a2f','#3f8a4a']},car:{tier:2,shape:'car',w:94,d:46,h:46},
 dumpster:{tier:2,shape:'box',w:80,d:48,h:46,c:['#2f7a4f']},cart:{tier:2,shape:'box',w:62,d:36,h:50,c:['#e8e0cf'],decal:'🌭'},
 booth:{tier:2,shape:'box',w:42,d:42,h:86,c:['#c9332b'],decal:'☎'},picnic:{tier:2,shape:'box',w:72,d:44,h:34,c:['#a56a3a']},
 house:{tier:3,shape:'house',w:150,d:130,h:110},truck:{tier:3,shape:'box',w:190,d:72,h:86,c:['#d8dde4'],decal:'🚚'},
 bus:{tier:3,shape:'box',w:220,d:74,h:82,c:['#f2c230'],decal:'🚌'},gazebo:{tier:3,shape:'gazebo',w:120,d:120,h:120},
 bigtree:{tier:3,shape:'tree',w:70,d:70,h:200,c:['#5a3f28','#2f7a3f']},fountain:{tier:3,shape:'fountain',w:140,d:140,h:70},
 apartment:{tier:4,shape:'tower',w:200,d:170,h:330,c:['#b85a3c']},warehouse:{tier:4,shape:'box',w:230,d:170,h:150,c:['#7d8791'],decal:'📦'},
 pub:{tier:4,shape:'pub',w:200,d:160,h:150}
};
const CAR_COLORS=['#d6342c','#2d6a9a','#f2c230','#2f7a4f','#7d5ac8','#e8e0cf','#303846'];
const HOUSE_COLORS=[['#e8d6b3','#8a4a3a'],['#c9d8e6','#4b5a73'],['#e6c9c9','#6b3a3a'],['#d6e6c9','#556b3a'],['#f0e3a8','#8a6b3a']];
function holeObjectives(seed){return shuffle(GOALS,seededRandom(seed+'-goals')).slice(0,3).map((g,i)=>({...g,need:[3,2,1][i]}));}
function blockType(bx,by,random,table){return table[by*BLOCK.cols+bx];}
function holeLayout(seed){
 const random=seededRandom(seed),objects=[],at=[];
 // Block types: a pub in the middle, homes near the start (south-west), parks, shops and a yard.
 const kinds=['residential','residential','residential','residential','residential','residential','park','park','park','park','commercial','commercial','commercial','commercial','commercial','commercial','industrial','industrial','industrial','industrial','residential','commercial','park','industrial'];
 const table=shuffle(kinds,random);table[1*BLOCK.cols+3]='pub';table[3*BLOCK.cols+0]='residential';table[3*BLOCK.cols+1]='residential';table[2*BLOCK.cols+0]='residential';
 const start={x:300,y:BLOCK.h*3+470};
 const free=(x,y,r)=>x>60&&y>60&&x<HOLE_WORLD.w-60&&y<HOLE_WORLD.h-60&&objects.every(o=>Math.hypot(o.x-x,o.y-y)>o.r+r+6);
 const add=(kind,x,y,extra={})=>{
  const s=SPEC[kind],tier=s.tier,r=Math.max(s.w,s.d)*.5*.88;
  if(!free(x,y,r))return false;
  const o={id:objects.length,kind,x,y,r,tier,w:s.w,d:s.d,h:s.h,shape:s.shape,decal:s.decal,icon:s.icon,flee:s.flee,bonusTime:s.bonusTime,
   color:extra.color||s.c?.[0],color2:extra.color2||s.c?.[1],value:TIERS[tier].value,mass:TIERS[tier].mass,sink:0,gone:false,spin:random()*6.28,...extra};
  objects.push(o);return true;
 };
 const place=(kind,count,x0,y0,x1,y1,tries=30,extra=()=>({}))=>{let placed=0;for(let n=0;n<count;n++)for(let t=0;t<tries;t++){const x=x0+random()*(x1-x0),y=y0+random()*(y1-y0);if(Math.hypot(x-start.x,y-start.y)<(SPEC[kind].tier>1?420:150))continue;if(add(kind,x,y,extra()))break;}return placed;};
 const smallJunk=['can','bottle','pizza','paper'];
 for(let by=0;by<BLOCK.rows;by++)for(let bx=0;bx<BLOCK.cols;bx++){
  const type=blockType(bx,by,random,table),x0=bx*BLOCK.w+BLOCK.road/2+40,x1=(bx+1)*BLOCK.w-BLOCK.road/2-40,y0=by*BLOCK.h+BLOCK.road/2+40,y1=(by+1)*BLOCK.h-BLOCK.road/2-40;
  const junk=()=>place(pick(smallJunk,random),1,x0,y0,x1,y1);
  if(type==='residential'){
   for(let i=0;i<2;i++){const [wall,roof]=pick(HOUSE_COLORS,random);place('house',1,x0+100*i,y0,x1,y1,40,()=>({color:wall,color2:roof}));}
   place('tree',3,x0,y0,x1,y1);place('car',2,x0,y0,x1,y1,30,()=>({color:pick(CAR_COLORS,random)}));place('mailbox',2,x0,y0,x1,y1);place('bike',2,x0,y0,x1,y1);place('bush',4,x0,y0,x1,y1);place('trash',2,x0,y0,x1,y1);place('grill',1,x0,y0,x1,y1);
   for(let i=0;i<12;i++)junk();place('rat',2,x0,y0,x1,y1);
  }else if(type==='park'){
   place('gazebo',1,x0,y0,x1,y1);place('fountain',1,x0,y0,x1,y1);place('bigtree',2,x0,y0,x1,y1);place('tree',5,x0,y0,x1,y1);place('bush',7,x0,y0,x1,y1);place('bench',4,x0,y0,x1,y1);place('picnic',2,x0,y0,x1,y1);
   for(let i=0;i<10;i++)junk();place('pigeon',5,x0,y0,x1,y1);
  }else if(type==='commercial'){
   place('apartment',1,x0,y0,x1,y1,50);place('bus',1,x0,y0,x1,y1,30,()=>({color:pick(['#f2c230','#e8e0cf','#2d6a9a'],random)}));place('cart',3,x0,y0,x1,y1);place('booth',2,x0,y0,x1,y1);place('cone',4,x0,y0,x1,y1);place('hydrant',2,x0,y0,x1,y1);place('trash',3,x0,y0,x1,y1);place('bench',2,x0,y0,x1,y1);place('car',2,x0,y0,x1,y1,30,()=>({color:pick(CAR_COLORS,random)}));
   for(let i=0;i<10;i++)junk();place('pigeon',3,x0,y0,x1,y1);
  }else if(type==='industrial'){
   place('warehouse',1,x0,y0,x1,y1,50);place('truck',2,x0,y0,x1,y1);place('dumpster',3,x0,y0,x1,y1);place('barrel',8,x0,y0,x1,y1);place('crate',6,x0,y0,x1,y1);place('cone',3,x0,y0,x1,y1);
   for(let i=0;i<8;i++)junk();place('rat',4,x0,y0,x1,y1);
  }else{ // pub block
   place('pub',1,(x0+x1)/2-30,(y0+y1)/2-20,(x0+x1)/2+30,(y0+y1)/2+20,60);place('barrel',9,x0,y0,x1,y1);place('bench',3,x0,y0,x1,y1);place('bike',3,x0,y0,x1,y1);place('car',2,x0,y0,x1,y1,30,()=>({color:'#2d6a9a'}));place('trash',3,x0,y0,x1,y1);
   for(let i=0;i<10;i++)junk();place('rat',3,x0,y0,x1,y1);
  }
 }
 // Streets: parked cars, cones, hydrants and wandering critters.
 for(let i=0;i<14;i++){const horizontal=random()<.5;if(horizontal)place('car',1,100,(1+Math.floor(random()*(BLOCK.rows-1)))*BLOCK.h-30,HOLE_WORLD.w-100,0+(1+Math.floor(random()*(BLOCK.rows-1)))*BLOCK.h+30,40,()=>({color:pick(CAR_COLORS,random)}));else{const col=1+Math.floor(random()*(BLOCK.cols-1));place('car',1,col*BLOCK.w-30,100,col*BLOCK.w+30,HOLE_WORLD.h-100,40,()=>({color:pick(CAR_COLORS,random),vertical:true}));}}
 place('cone',16,100,100,HOLE_WORLD.w-100,HOLE_WORLD.h-100);place('hydrant',10,100,100,HOLE_WORLD.w-100,HOLE_WORLD.h-100);place('pigeon',12,100,100,HOLE_WORLD.w-100,HOLE_WORLD.h-100);place('rat',8,100,100,HOLE_WORLD.w-100,HOLE_WORLD.h-100);
 // A little litter near the start so the first seconds are satisfying.
 for(let i=0;i<10;i++)for(let t=0;t<20;t++){const a=random()*6.28,d=70+random()*260;if(add(pick(smallJunk,random),start.x+Math.cos(a)*d,start.y+Math.sin(a)*d))break;}
 for(let i=0;i<5;i++)for(let t=0;t<20;t++){const a=random()*6.28,d=140+random()*300;if(add(pick(['trash','cone','crate','bush'],random),start.x+Math.cos(a)*d,start.y+Math.sin(a)*d))break;}
 // Time bonuses.
 for(let i=0;i<5;i++)for(let t=0;t<60;t++){const x=200+random()*(HOLE_WORLD.w-400),y=200+random()*(HOLE_WORLD.h-400);if(Math.hypot(x-start.x,y-start.y)>500&&add('clock',x,y))break;}
 // Goals: named sets spread across the map, away from the start.
 let n=0;
 for(const goal of holeObjectives(seed))for(let j=0;j<goal.need;j++){
  for(let tries=0;tries<200;tries++){
   const x=300+random()*(HOLE_WORLD.w-600),y=300+random()*(HOLE_WORLD.h-600);
   if(Math.hypot(x-start.x,y-start.y)<(500+n*140))continue;
   const o={id:'goal-'+n,kind:'goal',goal:goal.id,name:goal.name,icon:goal.icon,x,y,r:goal.r,tier:goal.r>20?2:goal.r>15?1:0,w:goal.w||goal.r*2,d:goal.d||goal.r*2,h:goal.h,shape:goal.shape,color:goal.color,value:60,mass:4,sink:0,gone:false,spin:0};
   if(objects.every(q=>Math.hypot(q.x-x,q.y-y)>q.r+o.r+10)){objects.push(o);n++;break;}
  }
 }
 // Bombs wear the other player's face.
 for(let i=0;i<12;i++)for(let t=0;t<80;t++){const p={x:200+random()*(HOLE_WORLD.w-400),y:200+random()*(HOLE_WORLD.h-400)};if(Math.hypot(p.x-start.x,p.y-start.y)>520&&objects.every(o=>Math.hypot(o.x-p.x,o.y-p.y)>o.r+36)){objects.push({id:'bomb-'+i,kind:'bomb',...p,r:10,tier:0,w:20,d:20,h:20,shape:'bomb',bomb:true,value:0,mass:0,sink:0,gone:false,spin:0});break;}}
 objects.forEach((o,i)=>{o.id=o.id??i;});
 return {objects,start,table};
}
function holeRadius(mass){return Math.min(150,26+Math.sqrt(Math.max(0,mass))*5.2);}
function holeProgress(a){return (a.objectives||[]).map(g=>({...g,got:a.objects.filter(o=>o.goal===g.id&&o.gone).length}));}
function swallowStep(a,dt){
 if(a.dead)return false;const r=holeRadius(a.mass);
 for(const o of a.objects){
  if(o.gone)continue;const d=Math.hypot(o.x-a.x,o.y-a.y);
  if(o.sink>0){
   o.sink+=dt;if(o.sink>=.5){
    o.gone=true;
    if(o.bomb){a.dead=true;a.hp=0;a.blast=.9;a.score=Math.max(0,a.score-100);return false;}
    a.mass+=o.mass;a.combo=(a.combo||0)+1;a.comboTime=1.6;a.score+=Math.round(o.value*(1+Math.min(.5,(a.combo-1)*.05)));a.pop=.45;
    if(o.bonusTime){a.time+=o.bonusTime;a.bonusFlash=1;}
   }continue;
  }
  if(o.bomb){if(d<r-o.r*.3)o.sink=.001;continue;}
  if(o.r<=r*.72&&d<r+o.r*.6){const force=Math.min(1,dt*4.5);o.x+=(a.x-o.x)*force;o.y+=(a.y-o.y)*force;if(d<r-o.r*.25)o.sink=.001;}
  else if(o.flee&&d<r*2.6+120){const l=Math.max(1,d);o.x=clamp(o.x+(o.x-a.x)/l*o.flee*dt,40,HOLE_WORLD.w-40);o.y=clamp(o.y+(o.y-a.y)/l*o.flee*dt,40,HOLE_WORLD.h-40);o.running=true;}
 }
 const progress=holeProgress(a);
 return progress.length?progress.every(g=>g.got>=g.need):a.objects.every(o=>o.gone);
}
// ---- camera ----------------------------------------------------------------
const PITCH=.92; // radians, looking down at the hole
function holeView(W,H,camera,radius=30){
 const zoom=1/(1+Math.max(0,radius-40)*.0042),k=clamp(Math.min(W/860,H/520),.4,1.5)*zoom;
 const camHeight=640,back=520,sin=Math.sin(PITCH),cos=Math.cos(PITCH);
 const z0=camHeight*sin+back*cos,F=k*z0;
 return {W,H,camera,k,F,camHeight,back,sin,cos,z0,cy0:H*.62,fogFar:z0*2.3};
}
// Projects a world point (gx,gy on the ground map, h metres up). Returns screen x,y, scale and depth.
function proj(v,gx,h,gy){
 const rx=gx-v.camera.x,ry=h-v.camHeight,rz=gy-(v.camera.y+v.back);
 const yc=ry*v.cos-rz*v.sin,zc=-ry*v.sin-rz*v.cos,s=v.F/Math.max(8,zc);
 return {x:v.W/2+rx*s,y:v.cy0-yc*s+v.F*0,s,z:zc};
}
function projectHole(p,view,elevation=0){const q=proj(view,p.x,elevation,p.y);return {x:q.x,y:q.y};}
function holeStick(origin,point){const dx=point.x-origin.x,dy=point.y-origin.y,d=Math.hypot(dx,dy);if(d<7)return {x:0,y:0};const strength=Math.min(1,(d-7)/50);return {x:dx/d*strength,y:dy/d*strength};}
// ---- drawing ---------------------------------------------------------------
const colorCache=new Map();
function rgb(hex){let c=colorCache.get(hex);if(!c){const h=hex.replace('#','');c=h.length===3?[...h].map(v=>parseInt(v+v,16)):[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));colorCache.set(hex,c);}return c;}
// light: multiplier; fog: 0..1 blend toward the haze colour.
function tone(hex,light,fog){const c=rgb(hex),f=[196,214,224];return `rgb(${Math.round((c[0]*light)*(1-fog)+f[0]*fog)},${Math.round((c[1]*light)*(1-fog)+f[1]*fog)},${Math.round((c[2]*light)*(1-fog)+f[2]*fog)})`;}
function poly(x,pts,fill,stroke){x.beginPath();x.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)x.lineTo(pts[i].x,pts[i].y);x.closePath();x.fillStyle=fill;x.fill();if(stroke){x.strokeStyle=stroke;x.lineWidth=1;x.stroke();}}
function blockAt(gx,gy,table){const bx=clamp(Math.floor(gx/BLOCK.w),0,BLOCK.cols-1),by=clamp(Math.floor(gy/BLOCK.h),0,BLOCK.rows-1);return table[by*BLOCK.cols+bx];}
const GROUND={residential:'#9fcf85',park:'#7fbf6a',commercial:'#c9c6bd',industrial:'#aaa59a',pub:'#cdb98d'};
function groundCell(gx,gy,table){
 const lx=gx-Math.floor(gx/BLOCK.w)*BLOCK.w,ly=gy-Math.floor(gy/BLOCK.h)*BLOCK.h,rd=BLOCK.road/2;
 const nearV=Math.min(lx,BLOCK.w-lx),nearH=Math.min(ly,BLOCK.h-ly);
 if(nearV<rd||nearH<rd)return {color:'#58606b',road:true,v:nearV<rd,h:nearH<rd,center:nearV<12||nearH<12};
 if(nearV<rd+30||nearH<rd+30)return {color:'#d8d4c8'};
 return {color:GROUND[blockAt(gx,gy,table)]||'#9fcf85'};
}
function drawGround(x,v,a,table){
 const cell=120,cam=v.camera,x0=Math.floor((cam.x-1500)/cell)*cell,x1=cam.x+1500,y0=Math.floor((cam.y-1900)/cell)*cell,y1=cam.y+440;
 for(let gy=Math.max(0,y0);gy<Math.min(HOLE_WORLD.h,y1);gy+=cell)for(let gx=Math.max(0,x0);gx<Math.min(HOLE_WORLD.w,x1);gx+=cell){
  const info=groundCell(gx+cell/2,gy+cell/2,table),A=proj(v,gx,0,gy),B=proj(v,gx+cell,0,gy),C=proj(v,gx+cell,0,gy+cell),D=proj(v,gx,0,gy+cell);
  if(A.z<70&&D.z<70)continue;if(B.x<-40&&C.x<-40||A.x>v.W+40&&D.x>v.W+40)continue;
  const fog=clamp((A.z-v.z0*.8)/(v.fogFar-v.z0*.8),0,.85),alt=((gx/cell+gy/cell)&1)?1:.965;
  poly(x,[A,B,C,D],tone(info.color,alt,fog));
  if(info.road&&!(info.v&&info.h)){
   const mx=gx+cell/2,my=gy+cell/2;
   if(info.v){const line=Math.round(mx/BLOCK.w)*BLOCK.w;if(Math.abs(line-mx)<cell/2&&((gy/cell)&1))poly(x,[proj(v,line-3,0,gy+14),proj(v,line+3,0,gy+14),proj(v,line+3,0,gy+cell-14),proj(v,line-3,0,gy+cell-14)],tone('#f0e8c8',1,fog));}
   else{const line=Math.round(my/BLOCK.h)*BLOCK.h;if(Math.abs(line-my)<cell/2&&((gx/cell)&1))poly(x,[proj(v,gx+14,0,line-3),proj(v,gx+cell-14,0,line-3),proj(v,gx+cell-14,0,line+3),proj(v,gx+14,0,line+3)],tone('#f0e8c8',1,fog));}
  }
 }
}
function circlePts(v,cx,cy,r,h,n=22){const pts=[];for(let i=0;i<n;i++){const t=i/n*Math.PI*2;pts.push(proj(v,cx+Math.cos(t)*r,h,cy+Math.sin(t)*r));}return pts;}
function shadow(x,v,o,k){const pts=circlePts(v,o.x,o.y,o.r*1.05*k,0,14);poly(x,pts,'rgba(20,30,45,.22)');}
// Faces of an axis-aligned box. Returns the front-face corner points for decals.
function drawBox(x,v,cx,cy,w,d,h0,h1,color,fog,k=1){
 const X0=cx-w/2*k,X1=cx+w/2*k,Y0=cy-d/2*k,Y1=cy+d/2*k;
 const b=[proj(v,X0,h0,Y1),proj(v,X1,h0,Y1),proj(v,X1,h1,Y1),proj(v,X0,h1,Y1)],tf=[proj(v,X0,h1,Y1),proj(v,X1,h1,Y1),proj(v,X1,h1,Y0),proj(v,X0,h1,Y0)];
 if(cx<v.camera.x)poly(x,[proj(v,X1,h0,Y1),proj(v,X1,h0,Y0),proj(v,X1,h1,Y0),proj(v,X1,h1,Y1)],tone(color,.62,fog));
 else poly(x,[proj(v,X0,h0,Y1),proj(v,X0,h0,Y0),proj(v,X0,h1,Y0),proj(v,X0,h1,Y1)],tone(color,.62,fog));
 poly(x,b,tone(color,.86,fog));poly(x,tf,tone(color,1.12,fog));
 return b;
}
function decal(x,front,icon,fog,scale=.62){if(!icon||fog>.7)return;const cxp=(front[0].x+front[1].x+front[2].x+front[3].x)/4,cyp=(front[0].y+front[1].y+front[2].y+front[3].y)/4,size=Math.min(Math.abs(front[1].x-front[0].x),Math.abs(front[0].y-front[3].y))*scale+6;x.font=`${Math.max(9,size)}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillStyle='#000';x.globalAlpha=1-fog;x.fillText(icon,cxp,cyp);x.globalAlpha=1;}
function drawCyl(x,v,cx,cy,r,h0,h1,color,fog,light=1){
 const N=18,top=[],base=[];for(let i=0;i<=N;i++){const t=Math.PI*i/N;base.push(proj(v,cx+Math.cos(t)*r,h0,cy+Math.sin(t)*r));top.push(proj(v,cx+Math.cos(t)*r,h1,cy+Math.sin(t)*r));}
 poly(x,[...top,...base.slice().reverse()],tone(color,.78*light,fog));
 poly(x,circlePts(v,cx,cy,r,h1,N),tone(color,1.1*light,fog));
}
function drawCone(x,v,cx,cy,r,h,color,fog){const N=16,base=[];for(let i=0;i<=N;i++){const t=Math.PI*i/N;base.push(proj(v,cx+Math.cos(t)*r,0,cy+Math.sin(t)*r));}const apex=proj(v,cx,h,cy);poly(x,[...base,apex],tone(color,.9,fog));poly(x,[proj(v,cx-r*.4,h*.45,cy+r*.35),proj(v,cx+r*.4,h*.45,cy+r*.35),proj(v,cx+r*.24,h*.62,cy+r*.2),proj(v,cx-r*.24,h*.62,cy+r*.2)],tone('#ffffff',1,fog));}
function drawDome(x,v,cx,cy,r,h,color,fog){const c=proj(v,cx,h*.5,cy),pr=r*c.s,g=x.createRadialGradient(c.x-pr*.3,c.y-pr*.4,pr*.1,c.x,c.y,pr*1.1);g.addColorStop(0,tone(color,1.25,fog));g.addColorStop(1,tone(color,.65,fog));x.fillStyle=g;x.beginPath();x.ellipse(c.x,c.y,pr,Math.max(2,h*.5*c.s*1.05+pr*.35),0,0,Math.PI*2);x.fill();}
function drawTree(x,v,o,fog,k,h1){drawCyl(x,v,o.x,o.y,o.w*.1*k,0,h1*.4*k,o.color||'#6b4a2f',fog);const leaf=o.color2||'#3f8a4a';drawDome(x,v,o.x,o.y,o.w*.62*k,h1*.5*k+h1*.35*k,leaf,fog);drawDome(x,v,o.x+o.w*.12*k,o.y,o.w*.46*k,h1*.35*k+h1*.62*k,leaf,fog);}
function drawCar(x,v,o,fog,k){
 const w=o.w,d=o.d,col=o.color||'#d6342c',vertical=o.vertical,ww=vertical?d:w,dd=vertical?w:d;
 drawBox(x,v,o.x,o.y,ww,dd,6*k,o.h*.55*k,col,fog,k);
 const cab=vertical?drawBox(x,v,o.x,o.y,ww*.8,dd*.5,o.h*.55*k,o.h*k,'#bcd7e6',fog,k):drawBox(x,v,o.x,o.y,ww*.5,dd*.8,o.h*.55*k,o.h*k,'#bcd7e6',fog,k);void cab;
 for(const sx of [-.3,.3])for(const sy of [-.5,.5]){const p=proj(v,o.x+(vertical?sy*ww:sx*ww),3*k,o.y+(vertical?sx*dd:sy*dd));x.fillStyle=tone('#1a1d24',1,fog);x.beginPath();x.ellipse(p.x,p.y,Math.max(2,7*p.s*k),Math.max(2,6*p.s*k),0,0,Math.PI*2);x.fill();}
}
function drawHouse(x,v,o,fog,k){
 const w=o.w*k,d=o.d*k,h=o.h*k,wall=o.color||'#e8d6b3',roof=o.color2||'#8a4a3a',X0=o.x-w/2,X1=o.x+w/2,Y0=o.y-d/2,Y1=o.y+d/2,ridge=h*1.55;
 drawBox(x,v,o.x,o.y,o.w,o.d,0,h,wall,fog,k);
 const front=[proj(v,X0-4,h,Y1+4),proj(v,X1+4,h,Y1+4),proj(v,X1+4,ridge,o.y),proj(v,X0-4,ridge,o.y)],back=[proj(v,X0-4,h,Y0-4),proj(v,X1+4,h,Y0-4),proj(v,X1+4,ridge,o.y),proj(v,X0-4,ridge,o.y)];
 poly(x,back,tone(roof,.8,fog));poly(x,front,tone(roof,1,fog));
 const door=[proj(v,o.x-w*.07,0,Y1+1),proj(v,o.x+w*.07,0,Y1+1),proj(v,o.x+w*.07,h*.55,Y1+1),proj(v,o.x-w*.07,h*.55,Y1+1)];poly(x,door,tone('#5a3a2a',1,fog));
 for(const dx of [-.3,.3])poly(x,[proj(v,o.x+dx*w-w*.07,h*.5,Y1+1),proj(v,o.x+dx*w+w*.07,h*.5,Y1+1),proj(v,o.x+dx*w+w*.07,h*.78,Y1+1),proj(v,o.x+dx*w-w*.07,h*.78,Y1+1)],tone('#bcd7e6',1,fog));
}
function drawTower(x,v,o,fog,k){
 const front=drawBox(x,v,o.x,o.y,o.w,o.d,0,o.h*k,o.color||'#b85a3c',fog,k),rows=Math.max(3,Math.floor(o.h/48)),cols=5;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const u=(c+.5)/cols,t=(r+.65)/rows,p=(a,b)=>({x:front[0].x+(front[1].x-front[0].x)*a+(front[3].x-front[0].x)*b,y:front[0].y+(front[1].y-front[0].y)*a+(front[3].y-front[0].y)*b});const du=.07,dt=.025,A=p(u-du,t-dt),B=p(u+du,t-dt),C=p(u+du,t+dt),D=p(u-du,t+dt);poly(x,[A,B,C,D],tone(r%2?'#f6dfa0':'#bcd7e6',1,fog));}
}
function drawGazebo(x,v,o,fog,k){const r=o.w*.5*k;for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]])drawCyl(x,v,o.x+dx*r*.8,o.y+dy*r*.8,6*k,0,o.h*.75*k,'#f1ead8',fog);drawCone(x,v,o.x,o.y,r*1.05,o.h*k+20*k,'#6b3a3a',fog);}
function drawFountain(x,v,o,fog,k){drawCyl(x,v,o.x,o.y,o.w*.5*k,0,18*k,'#c9c3b4',fog);poly(x,circlePts(v,o.x,o.y,o.w*.42*k,16*k,22),tone('#6fc2e6',1,fog));drawCyl(x,v,o.x,o.y,10*k,16*k,o.h*k,'#d8d3c4',fog);drawDome(x,v,o.x,o.y,18*k,o.h*k+10*k,'#8fd6f0',fog);}
function drawPub(x,v,o,fog,k){
 const front=drawBox(x,v,o.x,o.y,o.w,o.d,0,o.h*k,'#6b3a2a',fog,k);
 const roofTop=[proj(v,o.x-o.w*.5*k-6,o.h*k,o.y+o.d*.5*k+6),proj(v,o.x+o.w*.5*k+6,o.h*k,o.y+o.d*.5*k+6),proj(v,o.x+o.w*.5*k+6,o.h*k+16*k,o.y+o.d*.5*k+6),proj(v,o.x-o.w*.5*k-6,o.h*k+16*k,o.y+o.d*.5*k+6)];poly(x,roofTop,tone('#2c1c14',1,fog));
 const s=Math.abs(front[1].x-front[0].x);if(fog<.6&&s>40){x.fillStyle=tone('#101a2c',1,fog);const bx=(front[0].x+front[1].x)/2,by=front[3].y+(front[0].y-front[3].y)*.35;x.fillRect(bx-s*.4,by-s*.09,s*.8,s*.18);x.fillStyle='#ffdd55';x.font=`900 ${Math.max(8,s*.11)}px Arial Black,Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText('PADDY’S PUB',bx,by);}
 poly(x,[proj(v,o.x-o.w*.1*k,0,o.y+o.d*.5*k+1),proj(v,o.x+o.w*.1*k,0,o.y+o.d*.5*k+1),proj(v,o.x+o.w*.1*k,o.h*.45*k,o.y+o.d*.5*k+1),proj(v,o.x-o.w*.1*k,o.h*.45*k,o.y+o.d*.5*k+1)],tone('#2c1c14',1,fog));
}
function drawObject(s,x,v,o,radius,elapsed,player,hole){
 const sinkT=o.sink>0?Math.min(1,o.sink/.5):0,k=1-sinkT*.92,fog0=clamp((proj(v,o.x,0,o.y).z-v.z0*.8)/(v.fogFar-v.z0*.8),0,.85);
 let ox=o.x,oy=o.y;if(sinkT>0){ox=o.x+(hole.x-o.x)*sinkT*.7;oy=o.y+(hole.y-o.y)*sinkT*.7;}
 const draw={...o,x:ox,y:oy},fog=fog0,big=!o.bomb&&o.r>radius*.72;
 x.save();x.globalAlpha=1-sinkT*.45;
 if(sinkT===0)shadow(x,v,draw,1);
 const sh=o.shape;
 if(sh==='box'){const f=drawBox(x,v,ox,oy,o.w,o.d,0,o.h*k,o.color||'#b98a52',fog,k);if(o.decal&&sinkT<.6)decal(x,f,o.decal,fog);}
 else if(sh==='cyl'){drawCyl(x,v,ox,oy,o.w*.5*k,0,o.h*k,o.color||'#888',fog);if(o.decal){const p=proj(v,ox,o.h*k,oy);x.font=`${Math.max(8,o.w*.9*p.s)}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillStyle='#000';x.fillText(o.decal,p.x,p.y);}}
 else if(sh==='cone')drawCone(x,v,ox,oy,o.w*.5*k,o.h*k,o.color||'#f28a2e',fog);
 else if(sh==='dome'){drawDome(x,v,ox,oy,o.w*.5*k,o.h*k,o.color||'#3f8a4a',fog);if(o.decal){const p=proj(v,ox,o.h*k*.6,oy);x.font=`${Math.max(8,o.w*.8*p.s)}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillStyle='#000';x.fillText(o.decal,p.x,p.y);}}
 else if(sh==='tree')drawTree(x,v,{...draw,w:o.w},fog,k,o.h);
 else if(sh==='car')drawCar(x,v,draw,fog,k);
 else if(sh==='house')drawHouse(x,v,draw,fog,k);
 else if(sh==='tower')drawTower(x,v,draw,fog,k);
 else if(sh==='gazebo')drawGazebo(x,v,draw,fog,k);
 else if(sh==='fountain')drawFountain(x,v,draw,fog,k);
 else if(sh==='pub')drawPub(x,v,draw,fog,k);
 else if(sh==='critter'){const p=proj(v,ox,o.h*.5,oy),size=Math.max(10,o.w*p.s*1.7*k);x.font=`${size}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillStyle='#000';x.fillText(o.icon,p.x+(o.running?Math.sin(elapsed*20)*2:0),p.y);}
 else if(sh==='bomb'){const p=proj(v,ox,16,oy),size=Math.max(26,o.r*p.s*3.6);x.globalAlpha=1;x.fillStyle='#321427';x.beginPath();x.arc(p.x,p.y-size*.2,size*.58,0,Math.PI*2);x.fill();x.strokeStyle='#ff514f';x.lineWidth=3;x.stroke();s.sprite(x,1-player,p.x,p.y-size*.2,size,{exact:true,mood:'angry'});
  const g=proj(v,ox,0,oy),ring=circlePts(v,ox,oy,o.r*2.2,0,18);x.beginPath();x.moveTo(ring[0].x,ring[0].y);for(const q of ring.slice(1))x.lineTo(q.x,q.y);x.closePath();x.strokeStyle='#ef534f';x.lineWidth=3;x.stroke();x.fillStyle='#fff0a8';x.font='bold 14px monospace';x.textAlign='center';x.fillText('!',g.x,g.y-size-8-Math.sin(elapsed*8)*3);}
 if(o.goal){const g=circlePts(v,ox,oy,o.r*1.7,0,22);x.beginPath();x.moveTo(g[0].x,g[0].y);for(const q of g.slice(1))x.lineTo(q.x,q.y);x.closePath();x.strokeStyle='#ffe290';x.lineWidth=3;x.setLineDash([5,4]);x.stroke();x.setLineDash([]);const top=proj(v,ox,o.h+34+Math.sin(elapsed*3)*4,oy);x.font=`${Math.max(18,28*top.s)}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillStyle='#000';x.fillText(o.icon,top.x,top.y);x.font='bold 11px monospace';x.fillStyle='#fff1aa';x.strokeStyle='#4a3a10';x.lineWidth=3;x.strokeText('GOAL',top.x,top.y-18);x.fillText('GOAL',top.x,top.y-18);}
 if(big&&!o.bomb&&sinkT===0&&fog<.6){const ring=circlePts(v,ox,oy,o.r*1.12,0,18);x.beginPath();x.moveTo(ring[0].x,ring[0].y);for(const q of ring.slice(1))x.lineTo(q.x,q.y);x.closePath();x.strokeStyle='#424f6c88';x.lineWidth=1.5;x.stroke();}
 x.restore();
}
async function neighborhoodHole(s){
 const[c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body','hole-arena-body');
 const hud=document.createElement('div');hud.className='hole-objectives';hud.setAttribute('aria-label','Neighborhood collection goals');s.body.insertBefore(hud,s.body.firstChild);
 let api,contact=null,stick={x:0,y:0};
 const clear=()=>{contact=null;stick={x:0,y:0};const a=api?.get();if(a)a.keys={};};
 s.resetOnPause?.(clear);s.cleanup(clear);s.on(window,'blur',clear);s.on(window,'resize',clear);
 return arcadeRounds(s,{
  duration:60,instructions:'Explore a whole neighborhood in 3D. Eat small things first to grow, then cars, trees, houses and eventually the pub. Collect the three named goal sets. Grab ⏱ clocks for extra seconds. Red bombs wearing your rival’s face end your round. Touch anywhere, drag away from that starting point to steer, lift to stop. Both players get the same map and goals.',
  reset:()=>{const layout=holeLayout(s.seed);return {x:layout.start.x,y:layout.start.y,camera:{x:layout.start.x,y:layout.start.y},mass:0,hp:1,objects:layout.objects,table:layout.table,objectives:holeObjectives(s.seed),keys:{},combo:0,comboTime:0,pop:0,dead:false,blast:0,complete:false,bonusFlash:0};},
  bind:a=>{
   api=a;s.on(c,'pointerdown',ev=>{const g=a.get();if(s.paused||!g||g.dead||contact)return;ev.preventDefault();contact={id:ev.pointerId,origin:s.pointer(ev),point:s.pointer(ev)};stick={x:0,y:0};s.capture(ev);});
   s.on(c,'pointermove',ev=>{if(s.paused||contact?.id!==ev.pointerId)return;contact.point=s.pointer(ev);stick=holeStick(contact.origin,contact.point);});
   const release=ev=>{if(contact?.id!==ev.pointerId)return;clear();s.release(ev);};s.on(c,'pointerup',release);s.on(c,'pointercancel',release);s.on(c,'lostpointercapture',release);
   const keys={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down'};
   s.on(document,'keydown',ev=>{if(keys[ev.key]&&!s.paused){ev.preventDefault();a.get().keys[keys[ev.key]]=true;}});s.on(document,'keyup',ev=>{if(keys[ev.key]&&a.get())a.get().keys[keys[ev.key]]=false;});
   s.hint('Touch anywhere to place your steering origin. Drag away from it to move, farther to move faster; lift to stop. Gold GOAL markers are your deliveries. Things that fit inside your hole fall in; bigger things need you to grow. Chain quick gulps for a combo bonus. Rats and pigeons run away. ⏱ adds time. Red bombs end your turn with a 100-point penalty. Finish all goals for a 250-point bonus. Arrow keys/WASD also work.');
  },
  step:(a,dt)=>{
   if(a.dead){a.blast-=dt;return a.blast>0;}
   a.pop=Math.max(0,a.pop-dt);a.bonusFlash=Math.max(0,a.bonusFlash-dt);if(a.comboTime>0){a.comboTime-=dt;if(a.comboTime<=0)a.combo=0;}
   const radius=holeRadius(a.mass);let dx=stick.x+((a.keys.right?1:0)-(a.keys.left?1:0)),dy=stick.y+((a.keys.down?1:0)-(a.keys.up?1:0)),l=Math.max(1,Math.hypot(dx,dy)),speed=430+radius*1.4;
   a.x=clamp(a.x+dx/l*speed*dt,25,HOLE_WORLD.w-25);a.y=clamp(a.y+dy/l*speed*dt,25,HOLE_WORLD.h-25);
   a.camera.x+=(a.x-a.camera.x)*Math.min(1,dt*7);a.camera.y+=(a.y-a.camera.y)*Math.min(1,dt*7);
   const old=a.score,complete=swallowStep(a,dt);if(a.dead){clear();sound('shot');s.react?.(a.player,'sad',2);return true;}
   if(a.score>old)pickupSound(s);
   if(complete&&!a.complete){a.complete=true;a.score+=250;s.react?.(a.player,'win');sound('win');return false;}
   return true;
  },
  draw:a=>{
   const W=s.W,H=s.H,radius=holeRadius(a.mass),view=holeView(W,H,a.camera,radius);
   // Sky and haze behind the far ground.
   const sky=x.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#aebdb0');sky.addColorStop(1,'#8fa08f');x.fillStyle=sky;x.fillRect(0,0,W,H);
   drawGround(x,view,a,a.table);
   // The hole: a dark pit with a lit rim.
   const rim=circlePts(view,a.x,a.y,radius*1.08,0,32),mouth=circlePts(view,a.x,a.y,radius,0,32),deep=circlePts(view,a.x,a.y,radius*.8,-radius*.9,28);
   poly(x,rim,'#2f3a4a');poly(x,mouth,a.dead?'#4a1a14':'#0b0f19');poly(x,deep,'#000');
   const hc=proj(view,a.x,0,a.y),ringColor=a.dead?'#ff624b':a.player?'#ef72a6':'#58a4fb';x.beginPath();x.moveTo(mouth[0].x,mouth[0].y);for(const q of mouth.slice(1))x.lineTo(q.x,q.y);x.closePath();x.strokeStyle=ringColor;x.lineWidth=4;x.stroke();
   const list=a.objects.filter(o=>!o.gone).sort((p,q)=>p.y-q.y);
   for(const o of list){const p=proj(view,o.x,0,o.y);if(p.z<80||p.x<-220||p.x>W+220||p.y<-260||p.y>H+240)continue;drawObject(s,x,view,o,radius,a.elapsed,a.player,a);}
   // The player's head peeks over the rim.
   const headSize=clamp(radius*hc.s*1.3,34,76);s.sprite(x,a.player,hc.x,hc.y-headSize*.18,headSize,{exact:true,mood:a.dead?'sad':'walking'});
   const progress=holeProgress(a);const markup=`<strong>${Math.ceil(a.time)}s</strong>${progress.map(g=>`<span class="${g.got>=g.need?'goal-done':''}">${g.icon} ${g.name} <b>${g.got}/${g.need}</b></span>`).join('')}${a.combo>1?`<span class="hole-combo">combo ×${a.combo}</span>`:''}`;if(hud.innerHTML!==markup)hud.innerHTML=markup;
   // Mini-map.
   const size=Math.min(112,W*.26),ox=W-size-8,oy=10,mk=size/HOLE_WORLD.w,mh=HOLE_WORLD.h*mk;
   x.fillStyle='#162633cc';x.fillRect(ox,oy,size,mh);
   for(let by=0;by<BLOCK.rows;by++)for(let bx=0;bx<BLOCK.cols;bx++){x.fillStyle=({residential:'#4e7a48',park:'#3f8a4a',commercial:'#8a8a82',industrial:'#6d6a62',pub:'#b8995a'})[blockAt(bx*BLOCK.w+5,by*BLOCK.h+5,a.table)]||'#4e7a48';x.fillRect(ox+bx*BLOCK.w*mk+1,oy+by*BLOCK.h*mk+1,BLOCK.w*mk-2,BLOCK.h*mk-2);}
   for(const o of a.objects)if(!o.gone&&(o.goal||o.bomb||o.bonusTime)){x.fillStyle=o.bomb?'#ff655a':o.bonusTime?'#7fe3ff':'#ffd776';x.fillRect(ox+o.x*mk-2,oy+o.y*mk-2,4,4);}
   x.fillStyle='#fff';x.fillRect(ox+a.x*mk-3,oy+a.y*mk-3,6,6);
   const goal=a.objects.filter(o=>o.goal&&!o.gone).sort((b,c)=>Math.hypot(b.x-a.x,b.y-a.y)-Math.hypot(c.x-a.x,c.y-a.y))[0];
   if(goal){const gp=proj(view,goal.x,0,goal.y);if(gp.x<25||gp.x>W-25||gp.y<25||gp.y>H-25||gp.z<80){const ang=Math.atan2(goal.y-a.y,goal.x-a.x),tx=clamp(W/2+Math.cos(ang)*W*.4,26,W-26),ty=clamp(H*.5+Math.sin(ang)*H*.32,110,H-30);x.fillStyle='#ffe3a3';x.font='bold 22px system-ui';x.textAlign='center';x.fillText(goal.icon,tx,ty);x.font='bold 11px monospace';x.fillText('GOAL',tx,ty+17);}}
   if(a.dead){x.fillStyle='#ef773577';x.beginPath();x.arc(hc.x,hc.y,(1-a.blast/.9)*140+12,0,Math.PI*2);x.fill();x.fillStyle='#fff4be';x.font='bold 24px monospace';x.textAlign='center';x.fillText('BOMB! ROUND OVER',W/2,H*.3);}
   else if(a.pop>0){x.fillStyle='#1c3849';x.font='bold 20px monospace';x.textAlign='center';x.fillText(a.bonusFlash>0?'+TIME!':'GULP!',hc.x,hc.y-radius*hc.s-26);}
   s.status(`${s.players[a.player].name} · ${a.score} points · size ${Math.round(radius)} · collect gold goals, avoid red bombs`);
   s.debug={actor:a,world:HOLE_WORLD,radius,view,contact,stick,swallowStep,progress};
  }
 });
}
// Legacy helper kept for callers that draw a single prop in 2D.
function drawHoleProp(){}
Object.assign(exports,{HOLE_WORLD,BLOCK,SPEC,holeObjectives,holeLayout,holeRadius,holeProgress,swallowStep,holeView,projectHole,holeStick,drawHoleProp,neighborhoodHole});
