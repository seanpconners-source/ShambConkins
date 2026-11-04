// SUNDOWN SHOWDOWN stages: pure data built from a seed (same layout on every phone, every replay of the seed).
// World units: the view is 200 tall, the street is at GY (172). x runs right to `len`, where the boss arena starts.
// plats  = one-way floors you jump up through and land on (balconies, roofs, ledges, bridges, train roofs, couplings)
// boxes  = solid props: you stand on them, they stop you and stop bullets (crates, barrels, powder kegs, wagons)
// bld    = building fronts (drawn or the owner's art); wins = window gunman spots; door = where gunmen burst out
// spawns = enemies released as the camera reaches `at`; events = set pieces; locks = showdowns that hold the screen
// Four stages, played in order in 1P and the arcade: MAIN STREET, RUNAWAY TRAIN, CANYON PASS, MISSION AT NIGHT.
const SPR=require("src/data/sundownSprites.js");
const VH=200,GY=172,BALC=40,ROOF=100,TRAIN_ROOF=GY-44,COUPLING=GY-14;
const STAGES=[
 {id:'town',name:'MAIN STREET',len:2700,boss:'gunslinger',night:false},
 {id:'train',name:'RUNAWAY TRAIN',len:2600,boss:'engineer',night:false},
 {id:'canyon',name:'CANYON PASS',len:2700,boss:'rifleman',night:false},
 {id:'mission',name:'MISSION AT NIGHT',len:2700,boss:'general',night:true},
];
const TOWN_SIGNS=['SALOON','BANK','HOTEL','SHERIFF','GENERAL STORE','BARBER','ASSAY OFFICE','STABLES','POST OFFICE','GUNSMITH','UNDERTAKER','TELEGRAPH'];
const MISSION_SIGNS=['CANTINA','POSADA','TIENDA','CAPILLA','HERRERIA','PANADERIA'];

function buildStage(n,rand){
 const def=STAGES[n%STAGES.length],loop=Math.floor(n/STAGES.length),r=rand;
 const W={...def,n,loop,plats:[],boxes:[],bld:[],ledges:[],cars:[],decor:[],spawns:[],events:[],locks:[],arch:[],tower:null,ground:GY};
 const pick=a=>a[Math.floor(r()*a.length)];
 const box=(x,w,h,kind,o={})=>{const b={x,w,h,kind,y:o.y??GY,hp:{crate:3,barrel:4,keg:1,wagon:999,trough:999,boulder:999}[kind]??3,item:null,...o};W.boxes.push(b);return b;};
 const plat=(x0,x1,y,kind,o={})=>{const p={x0,x1,y,kind,...o};W.plats.push(p);return p;};
 // cover and props along a street
 function streetProps(from,to,{wagons=true,kegs=true}={}){
  for(let x=from;x<to;x+=150+r()*170){const roll=r();
   if(roll<.2&&wagons){box(x,58,22,'wagon');x+=50;}
   else if(roll<.42){box(x,20,22,'barrel');box(x+21,20,22,'barrel');if(r()<.5)box(x+10,20,22,'barrel',{y:GY-22});}
   else if(roll<.55&&kegs)box(x,18,20,'keg');
   else{const c=box(x,r()<.5?22:28,r()<.5?20:24,'crate');if(r()<.4)c.item=pick(['gold','gold','two','rapid']);}
  }
 }
 if(def.id==='town'||def.id==='mission'){
  const art=SPR.BUILDING_ART[def.id];let x=140;
  while(x<W.len+(def.id==='mission'?40:260)){
   const hue=Math.floor(r()*4),own=art&&SPR.has(`${def.id}-building-${hue+1}`)?art[hue]:null;
   const floors=own?own[2]:def.id==='town'?(r()<.82?2:1):(r()<.55?2:1);
   const w=own?own[0]*SPR.SCENE_SCALE:(floors===2?112+Math.floor(r()*4)*16:96+Math.floor(r()*3)*16);
   const h=own?own[1]*SPR.SCENE_SCALE:floors===2?118+Math.floor(r()*3)*6:76;
   const roofY=GY-(floors===2?ROOF:62);
   const b={x,w,h,floors,hue,own:!!own,sign:pick(def.id==='town'?TOWN_SIGNS:MISSION_SIGNS),door:x+w/2,doorT:-9,wins:[],roofY,style:def.id};
   const cols=Math.max(2,Math.floor(w/34));
   for(let f=0;f<floors;f++)for(let k=0;k<cols;k++){const wx=x+(k+.5)*w/cols;if(f===0&&Math.abs(wx-b.door)<18)continue;b.wins.push({x:wx,y:GY-30-f*46,open:0,man:null,broken:false});}
   W.bld.push(b);
   if(floors===2)plat(x-6,x+w+6,GY-BALC,'balcony',{b});
   plat(x+2,x+w-2,roofY,'roof',{b});
   const gap=r()<.35?34+r()*44:8;
   if(gap>30)W.decor.push({x:x+w+gap/2,kind:pick(['trough','post','lamp','post'])});
   x+=w+gap;
  }
  streetProps(260,W.len-120,{wagons:true,kegs:true});
  if(def.id==='mission'){
   // the bell tower closes the stage: three floors the general fights from
   const tx=W.len+140;W.tower={x:tx,w:96};plat(tx,tx+96,GY-40,'tower');plat(tx+8,tx+88,GY-76,'tower');plat(tx+16,tx+80,GY-110,'tower');
   for(let k=0;k<5;k++)W.decor.push({x:180+k*W.len/5+r()*60,kind:'torch'});
  }
 }
 else if(def.id==='canyon'){
  // rock shelves in climbs (low, mid, high), a rope bridge between two high shelves, cave mouths
  let x=200;
  while(x<W.len){const kind=r();
   if(kind<.45){const steps=2+Math.floor(r()*2);for(let k=0;k<steps;k++){const w=70+r()*40,y=GY-34-k*30;W.ledges.push({x:x+k*42,w,y});plat(x+k*42,x+k*42+w,y,'ledge');}x+=steps*42+140+r()*80;}
   else if(kind<.65){const w1=80,gap=110+r()*40;W.ledges.push({x,w:w1,y:GY-64},{x:x+w1+gap,w:w1,y:GY-64});plat(x,x+w1,GY-64,'ledge');plat(x+w1+gap,x+w1*2+gap,GY-64,'ledge');
    W.ledges.push({x:x-40,w:42,y:GY-32});plat(x-40,x+2,GY-32,'ledge');
    plat(x+w1,x+w1+gap,GY-60,'bridge');W.decor.push({x:x+w1,x2:x+w1+gap,y:GY-60,kind:'rope'});x+=w1*2+gap+150;}
   else{const w=90+r()*60;W.ledges.push({x,w,y:GY-40});plat(x,x+w,GY-40,'ledge');W.decor.push({x:x+w*.5,kind:'cave'});x+=w+120+r()*90;}
  }
  for(let x=240;x<W.len;x+=190+r()*240){const roll=r();if(roll<.35)box(x,24,20,'crate',{item:r()<.4?pick(['gold','two','rapid']):null});else if(roll<.55)box(x,18,20,'keg');else W.decor.push({x,kind:'cactus'});}
 }
 else if(def.id==='train'){
  W.ground=null;   // no street: you fall into a gap between cars, you land on the coupling
  let x=-40;const kinds=['box','box','flat','box','tank','box','coal','box','flat','box','box','tank','box','box'];
  for(let k=0;x<W.len+400;k++){const kind=x>W.len+40?(W.cars.some(c=>c.kind==='coal')&&x>W.len+200?'engine':'coal'):kinds[k%kinds.length];
   const w=kind==='engine'?230:kind==='flat'?150:kind==='coal'?130:170+Math.floor(r()*3)*10,y=kind==='flat'?GY-30:kind==='coal'?TRAIN_ROOF+8:kind==='engine'?TRAIN_ROOF+18:TRAIN_ROOF;
   W.cars.push({x,w,kind,y,cabY:kind==='engine'?TRAIN_ROOF:null});plat(x,x+w,y,'car',{solid:true});
   if(kind==='flat'){for(let c=0;c<2;c++)box(x+20+c*70+r()*20,26,22,r()<.3?'keg':'crate',{y,item:r()<.3?pick(['gold','two','rapid']):null});}
   if(kind==='engine'){box(x+Math.round(w*.62),Math.round(w*.38),18,'cab',{y,hp:999});break;}
   plat(x+w,x+w+14,COUPLING,'coupling',{solid:true});x+=w+14;
  }
 }
 // enemies: a steady stream, more of everything later in the stage and on later loops
 const kindsFor={town:['gun','gun','perch','window','door','rush','dyn','cover','gun','rider','sniper','drop'],
  train:['gun','climb','climb','rider','rider','dyn','rush','sniper','gun'],
  canyon:['gun','ledge','ledge','rush','dyn','cover','sniper','rider','gun'],
  mission:['gun','perch','window','door','rush','dyn','cover','sniper','gun','drop']}[def.id];
 for(let x=110;x<W.len-80;x+=48+r()*56-Math.min(20,loop*6)){const k=x/W.len;
  W.spawns.push({at:x,kind:pick(kindsFor),side:r()<.14+k*.12?-1:1,n:r()<.25+k*.3+loop*.1?2:1,done:false});}
 for(let x=420;x<W.len;x+=480+r()*300)W.spawns.push({at:x,kind:'item',done:false});
 // set pieces and showdowns (positions as a share of the stage)
 const EV={town:[[.14,'lock','street'],[.27,'stampede'],[.39,'keg'],[.5,'drop'],[.62,'gatling'],[.8,'lock','big']],
  train:[[.13,'riders'],[.24,'bridge'],[.36,'lock','climbers'],[.48,'bridge'],[.58,'riders'],[.7,'gatling'],[.82,'bridge'],[.9,'lock','big']],
  canyon:[[.12,'boulders'],[.26,'lock','street'],[.4,'boulders'],[.52,'riders'],[.64,'gatling'],[.78,'boulders'],[.86,'lock','big']],
  mission:[[.15,'lock','street'],[.3,'keg'],[.42,'stampede'],[.55,'drop'],[.66,'gatling'],[.82,'lock','big']]}[def.id];
 for(const [f,kind,size] of EV){const at=Math.round(W.len*f);
  if(kind==='lock'||kind==='gatling')W.locks.push({at,kind,size:size||'street',started:false,done:false,spawned:0,t0:0});
  else W.events.push({at,kind,done:false});}
 // keep showdowns clean of the stream, and give every stampede a refuge (a wagon in the street right there)
 for(const sp of W.spawns)if(W.locks.some(l=>Math.abs(sp.at-l.at)<90))sp.done=true;
 for(const e of W.events)if(e.kind==='stampede'&&!W.boxes.some(b=>b.kind==='wagon'&&Math.abs(b.x-(e.at+120))<120))box(e.at+110,58,22,'wagon');
 return W;
}
Object.assign(exports,{STAGES,buildStage,VH,GY,BALC,ROOF,TRAIN_ROOF,COUPLING});
