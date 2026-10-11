// BF-31: deterministic Canvas2D contract tests. No actual device/network needed.
// Load real BF-22/23/24/25 modules when present; use call-spy doubles in a
// portable isolated worktree to assert compositor ordering/coordinates.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const filename=path.join(root,'src/engines/broforce/sceneRenderer.js');
const source=fs.readFileSync(filename,'utf8');
const require=createRequire(import.meta.url);

function canvas(width,height){
  const events=[],stack=[];let tx=[1,0,0,1,0,0];
  const g={canvas:{width,height},globalAlpha:1,imageSmoothingEnabled:true,
    save(){stack.push([...tx]);events.push(['save']);},
    restore(){assert.ok(stack.length,'balanced Canvas save/restore');tx=stack.pop();events.push(['restore']);},
    translate(x,y){assert.ok(Number.isFinite(x+y));tx[4]+=tx[0]*x+tx[2]*y;tx[5]+=tx[1]*x+tx[3]*y;events.push(['translate',x,y]);},
    scale(x,y){tx[0]*=x;tx[1]*=x;tx[2]*=y;tx[3]*=y;events.push(['scale',x,y]);},
    rotate(){},beginPath(){},closePath(){},rect(){},clip(){},moveTo(){},lineTo(){},
    stroke(){},fill(){},strokeRect(){},arc(){},ellipse(){},fillText(){},
    setLineDash(){},measureText(s){return {width:s.length*7};},
    fillRect(x,y,w,h){assert.ok([x,y,w,h].every(Number.isFinite));
      if(events.length<5000)events.push(['rect',x*tx[0]+y*tx[2]+tx[4],x*tx[1]+y*tx[3]+tx[5],w*tx[0],h*tx[3]]);},
    drawImage(){events.push(['image']);},
    createLinearGradient(){return {addColorStop(){}};},
    createRadialGradient(){return {addColorStop(){}};}
  };
  return {g,events,depth:()=>stack.length};
}
const spy=[];
const doubles={
 'worldArt.js':{drawBroforceWorld(g,o){spy.push(['world',o.camera,o.viewport]);g.fillRect(0,0,o.viewport.width,o.viewport.height);}},
 'actorArt.js':{drawBroforceActor(g,o){spy.push(['actor',o.x,o.y,o.team,o.pose,o.facing]);
   if(o.drawHead)o.drawHead(g,-10,-47,20);g.fillRect(o.x-5,o.y-9,10,9);}},
 'hudArt.js':{drawBroforceHud(g,o){spy.push(['hud',o.viewport,o.players]);
   g.fillRect(2,4,10,10);return {insets:{top:56,right:12,bottom:0,left:12},
      controlZones:{pause:{x:o.viewport.width-48,y:8,width:44,height:44}}};}},
 'fxArt.js':{drawBroforceFx(g,o){spy.push(['fx',o.layer,o.camera,o.viewport]);}}
};
const exportsObj={};
vm.runInNewContext(source,{exports:exportsObj,require(id){
  const name=id.split('/').at(-1);
  if(!id.startsWith('src/engines/broforce/'))throw new Error('Unexpected dependency: '+id);
  return doubles[name];
},Math,Number,Array,Object,Set,String}, {filename});
const {drawBroforceScene}=exportsObj;
assert.equal(typeof drawBroforceScene,'function');
function state(){return {stage:{stageId:'broforce-factory'},terrain:{width:12,height:8,tileSize:16,tiles:Array(96).fill(0)},
  camera:{x:100,y:50,zoom:2},players:[
   {owner:'Sean',name:'ONE',fighterId:'fighter-a',body:{x:110,y:70,w:12,h:26},facing:-1,alive:true,weapon:'rifle'},
   {owner:'Amber',name:'TWO',fighterId:'fighter-b',body:{x:150,y:80,w:12,h:26},alive:true,weapon:'shotgun'}],
  prisoners:[{id:'c',x:155,y:85,w:16,h:22}],enemies:[{type:'carrier',x:165,y:85,w:12,h:24,tellLeft:1}],
  projectiles:[{x:145,y:91,vx:400,vy:0}],devil:{x:190,y:50,w:58,h:72,hp:20,maxHp:36,mode:'windup',telegraph:{targetX:150,targetY:80}},
  extraction:{active:true,helicopter:{visible:true,x:188,y:54},zone:{open:true,x:200,y:100,radius:44}},
  fx:{particles:[],shakeOffset:{x:2,y:-1}},mission:{objective:'EXTRACT',message:'RESCUE NOW'}};}
// Portraits must use each fighterId, not selected board identities; flipping is
// corrected in face-local space without flipping the weapon/body a second time.
for(const [W,H] of [[390,780],[780,390],[840,690],[1100,700]]){
 spy.length=0;const a=canvas(W,H),s=state(),snapshot=JSON.stringify(s),calls=[];
 const portraitFor=id=>{calls.push(id);return {drawPortrait:(g,l,t,size)=>g.fillRect(l,t,size,size)};};
 const result=drawBroforceScene(a.g,{state:s,viewport:{width:W,height:H,safeInsets:{top:13}},time:2,
   portraitFor});
 assert.deepEqual(JSON.stringify(s),snapshot,'render does not mutate snapshot');
 assert.equal(a.depth(),0,'context restored');
 assert.ok(spy.find(e=>e[0]==='world'));assert.equal(JSON.stringify(spy.find(e=>e[0]==='world')[2]),JSON.stringify({width:W/2,height:H/2}));
 assert.deepEqual(spy.filter(e=>e[0]==='actor').map(e=>e.slice(1,4)),[[116,96,0],[156,106,1]]);
 assert.deepEqual(calls,['fighter-a','fighter-b']);
 assert.ok(spy.find(e=>e[0]==='hud'));assert.equal(result.insets.top,56);
 assert.equal(result.controlZones.pause.width,44);
 assert.deepEqual(spy.filter(e=>e[0]==='fx').map(e=>e[1]),['back','front']);
 const end=a.events.filter(e=>e[0]==='rect').at(-1);assert.ok(end,'rendered nonempty image');
}
// Verify host callbacks, scaled world viewport and fallback after callback fails.
{
 const a=canvas(780,390),s=state(),order=[];
 drawBroforceScene(a.g,{state:s,viewport:{width:780,height:390},
   environmentDraw(g,o){order.push(['environment',o.stageId,o.viewport.width]);},
   cinematicDraw(g,o){order.push(['cinematics',o.viewport.width]);}});
 assert.deepEqual(order,[['environment','broforce-factory',390],['cinematics',390]]);
 assert.equal(a.depth(),0);
}
{
 const a=canvas(390,780),s=state();
 drawBroforceScene(a.g,{state:s,viewport:{width:390,height:780},
   environmentDraw(){throw Error('missing theme')},cinematicDraw(){throw Error('missing boss')},
   portraitFor(){throw Error('unavailable image')}});
 assert.equal(a.depth(),0);assert.ok(a.events.some(e=>e[0]==='rect'));
}
// Host painter exceptions must be contained within an authored helmet inset.
{
 const a=canvas(390,780),s=state();
 assert.doesNotThrow(()=>drawBroforceScene(a.g,{state:s,viewport:{width:390,height:780},
   portraitFor:()=>({drawPortrait(){throw Error('asset no longer available')}})}));
 assert.equal(a.depth(),0);
}
// Empty, degenerate, down/boarded players and low-motion snapshots cannot throw.
for(const [ctx,options] of [[null,{}],[canvas(390,780).g,{}],
 [canvas(390,780).g,{state:{players:[{body:{x:0,y:0,w:12,h:26},down:true},{body:{x:0,y:0,w:12,h:26},boarded:true}]},viewport:{width:390,height:780},quality:'low'}]]){
 assert.doesNotThrow(()=>drawBroforceScene(ctx,options));
}
// If real foundation files are present, actually execute their functions with
// an API-complete recording Canvas rather than only exercising mocked imports.
if(['worldArt','actorArt','hudArt','fxArt'].every(p=>fs.existsSync(path.join(root,'src/engines/broforce',p+'.js')))){
 const real={};vm.runInNewContext(source,{exports:real,require(id){return require(path.join(root,id));},Math,Number,String,Object,Array,Set}, {filename});
 for(const [w,h] of [[390,780],[780,390],[840,690],[1100,700]]){
  const a=canvas(w,h),s=state();
  assert.doesNotThrow(()=>real.drawBroforceScene(a.g,{state:s,viewport:{width:w,height:h},time:1.3}));
  assert.equal(a.depth(),0,`real BF modules restore canvas at ${w}x${h}`);
 }
 console.log('BF-31 real art modules: Canvas mock integration PASS');
}else console.log('BF-31 real art modules: NOT AVAILABLE (isolated compositor test doubles only)');
console.log('BF-31 viewport/zoom/layers/portraits/fallbacks/purity: PASS');
