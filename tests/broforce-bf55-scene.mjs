// BF-55: real CommonJS VM art-provider scene composition regressions.
// Deliberately does NOT Node-require unbundled .js (the package uses type:module).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const BASE='src/engines/broforce/';
function loadModules(overrides={}){
  const cache=new Map();
  function load(id){
    assert.ok(id.startsWith(BASE),'Broforce art dependency: '+id);
    if(Object.prototype.hasOwnProperty.call(overrides,id))return overrides[id];
    if(cache.has(id))return cache.get(id);
    const out={};cache.set(id,out);
    const filename=path.join(root,id);
    vm.runInNewContext(fs.readFileSync(filename,'utf8'),
      {exports:out,require:load,OffscreenCanvas:undefined},{filename});
    return out;
  }
  return load;
}
function canvas(width,height){
  const events=[],stack=[];
  let m=[1,0,0,1,0,0],draws=0;
  const event=(kind,...args)=>{
    draws++;
    if(events.length<12000)events.push({kind,args});
  };
  const g={canvas:{width,height},fillStyle:'#000',strokeStyle:'#000',
    globalAlpha:1,imageSmoothingEnabled:true,
    matrix:()=>m.slice(),
    save(){stack.push({m:m.slice(),alpha:this.globalAlpha,smoothing:this.imageSmoothingEnabled});},
    restore(){assert.ok(stack.length,'Canvas restore must balance save');
      const s=stack.pop();m=s.m;this.globalAlpha=s.alpha;this.imageSmoothingEnabled=s.smoothing;},
    translate(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));
      m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},
    scale(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));
      m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},
    rotate(){},beginPath(){},closePath(){},moveTo(){},lineTo(){},rect(){},clip(){},
    arc(){},ellipse(){},quadraticCurveTo(){},bezierCurveTo(){},setLineDash(){},
    fill(){event('fill');},stroke(){event('stroke');},
    fillText(t){event('text',String(t));},strokeText(t){event('text',String(t));},
    measureText(t){return {width:String(t).length*7};},
    fillRect(x,y,w,h){assert.ok([x,y,w,h].every(Number.isFinite),'finite Canvas geometry');
      event('rect',this.fillStyle,m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5],w*m[0],h*m[3]);},
    strokeRect(x,y,w,h){assert.ok([x,y,w,h].every(Number.isFinite));event('strokeRect');},
    clearRect(){event('clearRect');},
    drawImage(){event('image');},
    createLinearGradient(){return {addColorStop(){}};},
    createRadialGradient(){return {addColorStop(){}};}
  };
  return {g,events,depth:()=>stack.length,count:()=>draws};
}
function state(stageId='broforce-jungle'){
  const tiles=new Array(40*24).fill(0);
  for(let x=0;x<40;x++)tiles[19*40+x]=x%5+1;
  return {stage:{stageId},terrain:{width:40,height:24,tileSize:16,tiles},
    camera:{x:100,y:50,zoom:2},
    players:[
      {owner:'Sean',name:'CHANGED DISPLAY NAME',fighterId:'fighter-a',body:{x:110,y:70,w:12,h:26},facing:-1,alive:true,weapon:'rifle'},
      {owner:'Amber',name:'P2',fighterId:'fighter-b',body:{x:150,y:80,w:12,h:26},alive:true,weapon:'shotgun'}],
    prisoners:[{id:'cage',x:155,y:85,w:16,h:22}],
    enemies:[{id:'bad',type:'carrier',x:165,y:85,w:12,h:24}],
    projectiles:[{id:'bullet',x:145,y:91,vx:400,vy:0}],
    devil:{characterId:'devil-test',x:190,y:50,w:58,h:72,hp:20,maxHp:36,mode:'windup'},
    extraction:{active:true,helicopter:{visible:true,x:188,y:54},zone:{open:true,x:200,y:100,radius:44}},
    fx:{particles:[],flashes:[],rings:[],shakeOffset:{x:2,y:-1},reducedMotion:false},
    mission:{objective:'EXTRACT',message:'RESCUE NOW'}};
}
const real=loadModules();
const draw=real(BASE+'sceneRenderer.js').drawBroforceScene;
const environment=real(BASE+'themeArt.js').drawBroforceEnvironment;
const cinematic=real(BASE+'cinematicArt.js').drawBroforceCinematics;
assert.equal(typeof draw,'function');
assert.equal(typeof environment,'function');
assert.equal(typeof cinematic,'function');
const VIEWPORTS=[[390,780],[780,390],[840,690],[1100,700]];
const STAGES=['broforce-jungle','broforce-factory','broforce-city','broforce-desert'];
for(const stageId of STAGES)for(const [width,height] of VIEWPORTS){
  for(const step of [1/30,1/60]){
    const c=canvas(width,height),s=state(stageId),before=JSON.stringify(s);
    const result=draw(c.g,{state:s,viewport:{width,height,safeInsets:{top:13}},
      time:2+step,environmentDraw:environment,cinematicDraw:cinematic,quality:'high'});
    assert.equal(c.depth(),0,'balanced real Canvas stack '+stageId);
    assert.equal(JSON.stringify(s),before,'render-only snapshot '+stageId);
    assert.ok(result.insets.top>0,'real HUD returned safe insets');
    assert.ok(c.events.some(e=>e.kind==='rect'&&e.args[1]!==undefined),'world geometry visible');
    assert.ok(c.count()>150 && c.count()<80000,'bounded real draw calls: '+stageId+' '+c.count());
  }
}

// Real BF-32 paints its own pixel face exactly once on unavailable portraits.
// BF-55 must report true only for a real painter/image, never its local fallback.
for(const [label,portraitFor,expect,marker] of [
  ['absent',()=>null,false,false],
  ['explicit-false',()=>({drawPortrait(){return false;}}),false,false],
  ['throw',()=>({drawPortrait(){throw Error('lost portrait');}}),false,false],
  ['painted-true',()=>({drawPortrait(g,x,y,size){g.fillStyle='#a1b2c3';g.fillRect(x,y,size,size);return true;}}),true,true],
  ['painted-legacy',()=>({drawPortrait(g,x,y,size){g.fillStyle='#a1b2c3';g.fillRect(x,y,size,size);}}),true,true],
  ['loaded-image',()=>({image:{width:48,height:32,complete:true}}),true,false]
]){
  const c=canvas(390,780),s=state(),proof=[];
  const cb=(g,{drawPortrait})=>{proof.push(drawPortrait(g,'devil-test',-14,-63,28,28));};
  draw(c.g,{state:s,viewport:{width:390,height:780},portraitFor,
    environmentDraw(){},cinematicDraw:cb});
  assert.deepEqual(proof,[expect],'BF-32 success contract '+label);
  assert.equal(c.depth(),0,'portrait stack '+label);
  if(marker)assert.ok(c.events.some(e=>e.kind==='rect'&&e.args[0]==='#a1b2c3'),label);
  const painted=canvas(390,780);
  draw(painted.g,{state:{...s,players:[]},portraitFor,
    environmentDraw(){},cinematicDraw:cinematic});
  const pixelFallbacks=painted.events.filter(e=>e.kind==='rect'&&e.args[0]==='#6a4b53');
  assert.equal(pixelFallbacks.length,expect?0:1,'BF-32 must not double-paint '+label);
}
// Failed global host callback does not claim a recognizable character.
{
  const c=canvas(390,780),s=state();let result=null;
  draw(c.g,{state:s,environmentDraw(){},drawPortrait(){return false;},
    cinematicDraw(g,{drawPortrait}){result=drawPortrait(g,'devil-test',-14,-63,28,28);}});
  assert.equal(result,false);
}
// One scale, correct body BOOTS conversion, single environment, and layer order.
{
  const calls=[],art={
    [BASE+'worldArt.js']:{drawBroforceWorld(){calls.push(['fallback-world']);}},
    [BASE+'actorArt.js']:{drawBroforceActor(g,o){
      calls.push(['actor',o.team,o.x,o.y,g.matrix().slice()]);
      if(o.drawHead)o.drawHead(g,-10,-47,20);
    }},
    [BASE+'fxArt.js']:{drawBroforceFx(g,o){calls.push(['fx-'+o.layer,g.matrix().slice()]);}},
    [BASE+'hudArt.js']:{drawBroforceHud(g,o){
      calls.push(['hud',g.matrix().slice(),o.players.map(p=>p.character)]);
      return {insets:{top:56,right:12,bottom:0,left:12},
        controlZones:{pause:{x:338,y:8,width:44,height:44}}};
    }}
  };
  const spy=loadModules(art)(BASE+'sceneRenderer.js').drawBroforceScene;
  const c=canvas(390,780),s=state(),ids=[];
  const r=spy(c.g,{state:s,viewport:{width:390,height:780},time:2,
    portraitFor:id=>{ids.push(id);return null;},
    environmentDraw(g,o){calls.push(['environment',g.matrix().slice(),o.viewport,o.camera]);},
    cinematicDraw(g,o){calls.push(['cinematic',g.matrix().slice(),o.viewport,o.camera]);}});
  assert.deepEqual(ids,['fighter-a','fighter-b'],'board avatars never replace temporary fighter IDs');
  assert.deepEqual(calls.map(x=>x[0]),
    ['environment','fx-back','actor','actor','cinematic','fx-front','hud']);
  assert.deepEqual(calls.filter(x=>x[0]==='actor').map(x=>x.slice(1,4)),
    [[0,116,96],[1,156,106]],'BF-13 top-left to BF-25 boots');
  const firstActor=calls.find(x=>x[0]==='actor');
  assert.equal(firstActor[4][0],2,'one world zoom');
  assert.equal(firstActor[2]*firstActor[4][0]+firstActor[4][4],36,'camera top-left + shake');
  assert.equal(calls[0][1][0],2,'background scaled once');
  assert.equal(calls[0][2].width,195,'world viewport not CSS viewport');
  assert.equal(calls.at(-1)[1][0],1,'HUD must be unscaled and above world');
  assert.equal(r.controlZones.pause.width,44,'return HUD touch callbacks');
  assert.equal(c.depth(),0);
  assert.ok(c.events.some(e=>e.kind==='rect'&&e.args[0]==='#081d25'),'cage visible');
  assert.ok(c.events.some(e=>e.kind==='rect'&&e.args[0]==='#1b252c'),'enemy visible');
  assert.ok(c.events.some(e=>e.kind==='rect'&&e.args[0]==='#fff4dc'),'bullet visible');
  const fallback=canvas(390,780),fCalls=[];
  const mod=loadModules({...art,[BASE+'worldArt.js']:{drawBroforceWorld(){fCalls.push('world');}}});
  mod(BASE+'sceneRenderer.js').drawBroforceScene(fallback.g,{state:s,viewport:{width:390,height:780},
    environmentDraw(){throw Error('theme unavailable');},cinematicDraw(){throw Error('cinematic unavailable');}});
  assert.deepEqual(fCalls,['world'],'never overlap canonical environment and fallback background');
  assert.equal(fallback.depth(),0);
}
console.log('BF-55 real-VM art, 4 themes x 4 viewports x 30/60fps, portraits, ordering, HUD: PASS');
