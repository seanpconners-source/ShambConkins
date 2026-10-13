// BF-44 shared camera regression checks; run with node tests/broforce-bf44-camera.mjs.
// Dependency-free and deterministic: load the browser CommonJS module in a VM.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import vm from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const exports={};
vm.runInNewContext(readFileSync(resolve(root,'src/engines/broforce/camera.js'),'utf8'),{exports},{filename:'camera.js'});
const {createBroforceCamera,advanceBroforceCamera,broforceWorldToScreen,broforceScreenToWorld}=exports;
const layouts=[
  {name:'portrait',width:390,height:780,inset:145},
  {name:'landscape',width:844,height:390,inset:36},
  {name:'Fold unfolded',width:840,height:700,inset:100},
  {name:'desktop',width:1100,height:700,inset:0}
];
const body=(x,y,props={})=>({x,y,w:16,h:30,owner:'Sean',alive:true,hp:1,status:'alive',...props});
const world={width:5000,height:1800};
const near=(a,b,eps=1e-5)=>assert.ok(Math.abs(a-b)<=eps,`expected ${a} ≈ ${b} (eps ${eps})`);
const frame=(cam,p,layout,dt=1/60,other={})=>advanceBroforceCamera(cam,{
  viewport:{width:layout.width,height:layout.height},world,controlsInset:layout.inset,
  players:p,dt,...other
});
const finite=(cam)=>{
  for(const key of ['x','y','zoom']) assert.ok(Number.isFinite(cam[key]),`nonfinite ${key}: ${cam[key]}`);
  assert.ok(cam.zoom>0&&cam.zoom<=2.5,`zoom ${cam.zoom}`);
  assert.equal(typeof cam.tetherExceeded,'boolean');
};
const fits=(cam,p,layout,inset=layout.inset)=>{
  const a=broforceWorldToScreen(cam,layout,p.x,p.y);
  const b=broforceWorldToScreen(cam,layout,p.x+p.w,p.y+p.h);
  assert.ok(a.x>=-1e-6&&b.x<=layout.width+1e-6,`horizontal clipping: ${a.x}…${b.x}`);
  assert.ok(a.y>=-1e-6&&b.y<=layout.height-inset+1e-6,`under controls: ${a.y}…${b.y}`);
};
const bounded=(c,w=world,layout)=>{
  assert.ok(c.x>=Math.min(0,(w.width-layout.width/c.zoom)/2)-1e-5);
  assert.ok(c.y>=Math.min(0,(w.height-layout.height/c.zoom)/2)-1e-5);
  assert.ok(c.x<=Math.max(0,w.width-layout.width/c.zoom)+1e-5);
  // The camera may look below the floor by the control inset (+ its <=30px
  // margin) so bottom-row fighters stay above the thumbs; never further.
  const below=layout.inset>0?(layout.inset+30)/c.zoom:0;
  assert.ok(c.y<=Math.max(0,w.height+below-layout.height/c.zoom)+1e-5);
};

// One shared pose regardless of player array order; no owner-specific camera.
for(const layout of layouts){
  const pair=[body(700,410),body(770,425,{owner:'Amber'})];
  let a=createBroforceCamera({x:600,y:330,zoom:2}),b=createBroforceCamera({x:600,y:330,zoom:2});
  for(let tick=0;tick<120;tick++){
    a=frame(a,pair,layout);b=frame(b,[...pair].reverse(),layout);
    finite(a);bounded(a,world,layout);
    near(a.x,b.x);near(a.y,b.y);near(a.zoom,b.zoom);
    assert.equal(a.tetherExceeded,false);
    pair.forEach(p=>fits(a,p,layout));
  }
}

// Both real players remain in safe canvas space while feasible, including
// opposite edges of a just-fit pair and reversible world/screen coordinates.
for(const layout of layouts){
  const nearLimit=(layout.width-60)/1.6;
  const pair=[body(1100,490),body(1100+nearLimit-25,510,{owner:'Amber'})];
  let cam=createBroforceCamera({x:1050,y:350,zoom:2.5});
  for(let i=0;i<60;i++)cam=frame(cam,pair,layout);
  finite(cam);assert.equal(cam.tetherExceeded,false);
  pair.forEach(p=>fits(cam,p,layout));
  for(const [x,y] of [[0,0],[1100.25,-30.5],[4999.875,1799.8]]){
    const sc=broforceWorldToScreen(cam,layout,x,y);
    const wp=broforceScreenToWorld(cam,layout,sc.x,sc.y);
    near(wp.x,x,1e-7);near(wp.y,y,1e-7);
  }
}

// BF-44 defect: a boarded hero remains alive in the mission snapshot and must
// no longer tether/focus the camera after physical boarding. The remaining
// living owner determines the shared camera's only active visibility target.
for(const layout of layouts){
  const active=body(2750,700,{owner:'Amber'}),boarded=body(120,700,{boarded:true,extracted:true,status:'boarded'});
  let cam=createBroforceCamera({x:2600,y:560,zoom:2});
  for(let i=0;i<40;i++)cam=frame(cam,[boarded,active],layout);
  assert.equal(cam.tetherExceeded,false,`boarded hero was included in ${layout.name}`);
  fits(cam,active,layout);
  finite(cam);
  const downed=body(80,690,{downed:true,status:'downed',hp:0});
  const dead=body(90,700,{dead:true,status:'dead'});
  cam=frame(cam,[downed,dead,active],layout);
  assert.equal(cam.tetherExceeded,false);fits(cam,active,layout);
  // Status-only snapshots and zero health must not pull a camera away.
  cam=frame(cam,[body(120,200,{status:'respawning'}),body(160,200,{health:0}),active],layout);
  assert.equal(cam.tetherExceeded,false);fits(cam,active,layout);
  const holding=frame(cam,[boarded,downed,dead],layout);
  finite(holding);assert.equal(holding.tetherExceeded,false);
  near(holding.x,cam.x);near(holding.y,cam.y);
}

// Boss arrival and a departing helicopter are external events: without a cue
// target the camera must stay deterministic, bounded, and centered on *living*
// actors, never switch to a per-player view or move because of an old boarder.
for(const layout of layouts){
  let cam=createBroforceCamera({x:600,y:250,zoom:2});
  const p=[body(760,450,{vx:32}),body(820,460,{owner:'Amber',vx:32})];
  for(let i=0;i<90;i++)cam=frame(cam,p,layout);
  const before={...cam};
  cam=frame(cam,[p[0],{...p[1],boarded:true,status:'boarded'}],layout);
  finite(cam);fits(cam,p[0],layout);bounded(cam,world,layout);
  cam=frame(cam,[{...p[0],boarded:true,status:'boarded'},p[1]],layout);
  finite(cam);fits(cam,p[1],layout);bounded(cam,world,layout);
  assert.ok(Math.abs(cam.x-before.x)<200,`large nearby boarding displacement in ${layout.name}`);
}

// Separate beyond minimum readable zoom, rejoin, and rotate while moving:
// no camera NaNs, spurious repeated tether state toggles or array mutation.
const layoutsRound=[layouts[0],layouts[1],layouts[2],layouts[0],layouts[3]];
const scenario=(fps)=>{
  let cam=createBroforceCamera({x:960,y:330,zoom:2});
  const record=[];
  for(let i=0;i<fps*5;i++){
    const t=i/fps,layout=layoutsRound[Math.floor(t)];
    const gap=t<1?100:t<2?900:t<3?900-800*(t-2):100;
    const p=[body(1050+60*t,400),body(1050+60*t+gap,420,{owner:'Amber'})];
    const snapshot=JSON.stringify(p);
    cam=frame(cam,p,layout,1/fps);
    assert.equal(JSON.stringify(p),snapshot,'camera mutated players');
    finite(cam);bounded(cam,world,layout);
    assert.ok(cam.zoom>=1.6-1e-8,'worldly zoom readability floor');
    if(t>=1.2&&t<2) assert.equal(cam.tetherExceeded,true);
    if(t>=3) {assert.equal(cam.tetherExceeded,false);p.forEach(q=>fits(cam,q,layout));}
    if((i+1)%fps===0) record.push({...cam});
  }
  return record;
};
const at30=scenario(30),at60=scenario(60);
for(let i=0;i<at30.length;i++){
  near(at30[i].x,at60[i].x,9);
  near(at30[i].y,at60[i].y,9);
  near(at30[i].zoom,at60[i].zoom,.025);
  assert.equal(at30[i].tetherExceeded,at60[i].tetherExceeded);
}

// World corners and tiny maps remain clamped/centered, even after rotation.
for(const layout of layouts){
  for(const [x,y] of [[0,0],[world.width-16,0],[0,world.height-30],[world.width-16,world.height-30]]){
    const cam=frame(createBroforceCamera({x:1e6,y:-1e6,zoom:2}),[body(x,y)],layout);
    finite(cam);bounded(cam,world,layout);
  }
  const tiny={width:120,height:90};
  const cam=frame(createBroforceCamera({zoom:2}),[body(60,30)],layout,1/60,{world:tiny});
  near(cam.x,(tiny.width-layout.width/cam.zoom)/2);
  near(cam.y,(tiny.height-layout.height/cam.zoom)/2);
}

// Corrupt snapshots and impossible dimensions cannot produce invalid geometry.
for(const layout of layouts){
  const cam=frame({x:Infinity,y:NaN,zoom:-Infinity},[
    body(NaN,Infinity),body(0,0,{alive:false}),body(100,100,{boarded:true})
  ],layout,Infinity,{world:{width:NaN,height:Infinity},controlsInset:Infinity});
  finite(cam);
  const next=advanceBroforceCamera(cam,{viewport:{width:0,height:NaN},players:[null,{},body(100,100)],dt:NaN,controlsInset:-1});
  finite(next);
}
console.log('BF-44 shared camera: all focused assertions passed');
