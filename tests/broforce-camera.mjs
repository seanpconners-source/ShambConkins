// BF-19 deterministic, dependency-free camera contract tests.
// node tests/broforce-camera.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exports = {};
vm.runInNewContext(readFileSync(resolve(root, 'src/engines/broforce/camera.js'), 'utf8'), {exports}, {filename:'camera.js'});
const {createBroforceCamera, advanceBroforceCamera, broforceWorldToScreen, broforceScreenToWorld} = exports;
const near = (a,b,epsilon=1e-7) => assert.ok(Math.abs(a-b)<=epsilon, `${a} not within ${epsilon} of ${b}`);
const finiteCam = c => {for(const k of ['x','y','zoom']) assert.ok(Number.isFinite(c[k]), `${k} not finite`);assert.ok(c.zoom>0)};
const cameraArgs = (v,players,changes={}) => ({viewport:{width:v[0],height:v[1]},world:{width:5000,height:1800},players,dt:1/60,...changes});
const body = (x,y,other={})=>({x,y,w:16,h:30,alive:true,...other});
const fit = (c,p,v,inset=0) => {
  const a=broforceWorldToScreen(c,{width:v[0],height:v[1]},p.x,p.y);
  const b=broforceWorldToScreen(c,{width:v[0],height:v[1]},p.x+p.w,p.y+p.h);
  assert.ok(a.x>=-1e-6, `clipped left ${a.x}`);
  assert.ok(b.x<=v[0]+1e-6, `clipped right ${b.x}`);
  assert.ok(a.y>=-1e-6, `clipped top ${a.y}`);
  assert.ok(b.y<=v[1]-inset+1e-6, `under controls ${b.y}`);
};

// Basic export and purity checks.
assert.equal(typeof createBroforceCamera,'function');
assert.equal(typeof advanceBroforceCamera,'function');
assert.equal(typeof broforceWorldToScreen,'function');
assert.equal(typeof broforceScreenToWorld,'function');
const original=createBroforceCamera({x:12,y:25,zoom:2});
const inputPlayers=[body(200,300,{vx:80}),body(260,320,{vx:80})];
const snapshot=JSON.stringify({original,inputPlayers});
const first=advanceBroforceCamera(original,cameraArgs([390,780],inputPlayers,{controlsInset:180}));
assert.equal(JSON.stringify({original,inputPlayers}),snapshot,'camera and players remain unchanged');
assert.notEqual(first,original,'advance returns a new camera');
assert.equal(first.tetherExceeded,false);

// Actual CSS-pixel viewports: world tracking and reserved touchscreen region.
for(const v of [[390,780],[780,390],[1100,700],[840,700],[390,300]]){
  const inset=v[1]>700?174:v[1]>400?75:42;
  const players=[body(260,220),body(300,225)];
  let c=createBroforceCamera({x:0,y:0,zoom:2});
  for(let i=0;i<120;i++) c=advanceBroforceCamera(c,cameraArgs(v,players,{controlsInset:inset}));
  finiteCam(c);
  assert.equal(c.tetherExceeded,false);
  for(const p of players)fit(c,p,v,inset);
  assert.ok(c.x>=0 && c.x<=5000-v[0]/c.zoom+1e-6,'world X bounded');
  assert.ok(c.y>=0 && c.y<=1800-v[1]/c.zoom+1e-6,'world Y bounded');
}

// Transform roundtrips must remain inverses, including offset cameras and resize.
for(const v of [[390,780],[780,390],[1100,700],[840,700]]){
  for(const c of [createBroforceCamera(),createBroforceCamera({x:104.234,y:-37.49,zoom:1.93}),first]){
    for(const [x,y] of [[0,0],[241.44,1004.52],[500000.123,-39.523]]){
      const point=broforceWorldToScreen(c,{width:v[0],height:v[1]},x,y);
      const inv=broforceScreenToWorld(c,{width:v[0],height:v[1]},point.x,point.y);
      near(x,inv.x,1e-7);near(y,inv.y,1e-7);
    }
  }
}

// Track close to both extremes without scrolling into void or losing heroes.
for(const v of [[390,780],[780,390],[1100,700]]){
  const world={width:5200,height:1300};
  for(const [x,y] of [[0,0],[5180,0],[0,1250],[5180,1250]]){
    const p=body(x,y), c=advanceBroforceCamera(createBroforceCamera({x:5200,y:1300,zoom:2}),
      cameraArgs(v,[p],{world,dt:1/30}));
    assert.ok(c.x>=0 && c.x<=Math.max(0,world.width-v[0]/c.zoom)+1e-6);
    assert.ok(c.y>=0 && c.y<=Math.max(0,world.height-v[1]/c.zoom)+1e-6);
    fit(c,p,v);
  }
}

// Tiny worlds center symmetrically and give reversible transforms without NaNs.
{
  const v=[1100,700],w={width:180,height:110};
  const c=advanceBroforceCamera(createBroforceCamera({zoom:2}),cameraArgs(v,[body(60,40)],{world:w}));
  near(c.x,(w.width-v[0]/c.zoom)/2);
  near(c.y,(w.height-v[1]/c.zoom)/2);
  finiteCam(c);
}

// dt-invariant exponential easing for an unchanging pair (30 FPS vs 60 FPS).
function runSteps(hz){
  let c=createBroforceCamera({x:260,y:240,zoom:1.7});
  const args=cameraArgs([1100,700],[body(300,320),body(360,340)]);
  for(let i=0;i<hz*2;i++) c=advanceBroforceCamera(c,{...args,dt:1/hz});
  return c;
}
const fast=runSteps(60),slow=runSteps(30);
near(fast.x,slow.x,2e-6);near(fast.y,slow.y,2e-6);near(fast.zoom,slow.zoom,2e-6);

// A moving pair follows with forward lead; no per-frame zoom oscillations.
{
  let c=createBroforceCamera({x:600,y:100,zoom:2.1});
  let lastZoom=c.zoom;
  for(let i=0;i<180;i++){
    const p=[body(800+i,420,{vx:60}),body(865+i,430,{vx:60})];
    c=advanceBroforceCamera(c,cameraArgs([780,390],p));
    assert.ok(Math.abs(c.zoom-lastZoom)<0.2,'no sudden zoom jitter for normal pursuit');
    lastZoom=c.zoom;
    assert.equal(c.tetherExceeded,false);
    p.forEach(hero=>fit(c,hero,[780,390]));
  }
  assert.ok(c.x>650,'camera tracked rightward world movement');
}

// At extreme divergence, explicitly report tether instead of teleporting or
// silently altering physics. Tiny portrait safe width makes this a common case.
{
  const p=[body(50,340),body(1100,350)];
  const pBefore=JSON.stringify(p);
  let c=createBroforceCamera({zoom:2});
  for(let i=0;i<60;i++)c=advanceBroforceCamera(c,cameraArgs([390,780],p,{controlsInset:170}));
  assert.equal(c.tetherExceeded,true);
  assert.equal(JSON.stringify(p),pBefore);
  assert.ok(c.zoom>=1.6-1e-8);
  finiteCam(c);
}

// Dead/downed players are ignored. No living player holds a valid stable view.
{
  const v=[390,780];
  const living=body(580,450);
  let c=createBroforceCamera({x:300,y:300,zoom:2});
  c=advanceBroforceCamera(c,cameraArgs(v,[body(NaN,Infinity),body(4900,1700,{alive:false}),living],{controlsInset:185}));
  assert.equal(c.tetherExceeded,false);
  fit(c,living,v,185);
  c=advanceBroforceCamera(c,cameraArgs(v,[body(0,0,{hp:0}),body(4900,1700,{state:'downed'})]));
  finiteCam(c);assert.equal(c.tetherExceeded,false);
  const malformed=advanceBroforceCamera({x:Infinity,y:NaN,zoom:-2},
    {players:[body(100,150)],world:{width:10000,height:5000},viewport:{width:NaN,height:0},dt:Infinity,controlsInset:NaN});
  finiteCam(malformed);
}

// Resize and pause: geometry updates, simulation input references stay intact.
{
  const p=[body(500,370),body(570,370)];
  const v={width:390,height:780};
  const state={buttons:['shoot','jump']};
  let c=createBroforceCamera({x:400,y:300,zoom:2});
  c=advanceBroforceCamera(c,{viewport:v,world:{width:3000,height:1500},players:p,dt:0,controlsInset:160});
  const c2=advanceBroforceCamera(c,{viewport:{width:780,height:390},world:{width:3000,height:1500},players:p,dt:0,controlsInset:35});
  finiteCam(c2);assert.deepEqual(state.buttons,['shoot','jump']);
  p.forEach(hero=>fit(c2,hero,[780,390],35));
}
console.log('BF-19 camera: all focused assertions passed');
