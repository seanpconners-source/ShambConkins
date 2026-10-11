// BF-56: regression for authored boss/heli cinematic readability only.
// Run with: node --test tests/broforce-bf56-cinematics.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createContext,runInContext} from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const code=readFileSync(resolve(root,'src/engines/broforce/cinematicArt.js'),'utf8');
const vm=createContext({exports:{}});
runInContext(code,vm,{filename:'cinematicArt.js'});
const draw=vm.exports.drawBroforceCinematics;
const sizes=[[390,780],[780,390],[840,750],[1100,700]];
const devil=(extra={})=>({characterId:'selected-locked-devil',x:150,y:110,w:58,h:72,
  mode:'intro',phase:1,attack:'fan',projectiles:[],...extra});
const extraction=(phase='hover',extra={})=>({
  phase,zone:{x:245,y:295,radius:44,open:phase==='hover',secondsRemaining:8.2},
  helicopter:{x:245,y:252,visible:true,rotorAngle:.8},boarded:[false,false],...extra
});
function mock(){
  let depth=0;const ops=[];
  const ctx=new Proxy({},{
    get(target,key){
      if(key==='ops')return ops;
      if(key==='depth')return depth;
      if(key==='save')return ()=>{depth++;ops.push(['save']);};
      if(key==='restore')return ()=>{depth--;assert.ok(depth>=0);ops.push(['restore']);};
      if(key==='measureText')return s=>({width:s.length*7});
      if(['translate','scale','rotate','moveTo','lineTo','ellipse','arc','fillRect','drawImage'].includes(key))
        return (...args)=>{assert.ok(args.every(v=>typeof v!=='number'||Number.isFinite(v)),
          key+' numeric arguments');ops.push([key,...args]);};
      if(key==='fillText')return (...args)=>ops.push([key,...args]);
      if(['beginPath','closePath','fill','stroke','clip'].includes(key))
        return ()=>ops.push([key]);
      return target[key];
    },
    set(target,key,value){target[key]=value;ops.push(['set',key,value]);return true;}
  });
  return ctx;
}
function paint({d=devil(),e=extraction(),viewport={width:390,height:780},
  camera={x:0,y:0,zoom:2},time=1,drawPortrait=null,reducedMotion=false,quality='high'}={}){
  const ctx=mock();
  draw(ctx,{devil:d,extraction:e,viewport,camera,time,drawPortrait,reducedMotion,quality});
  assert.equal(ctx.depth,0,'Canvas state must balance');
  return ctx.ops;
}
const labels=ops=>ops.filter(op=>op[0]==='fillText').map(op=>op[1]);
const opIndex=(ops,type,value)=>ops.findIndex(op=>op[0]===type&&op[1]===value);

test('real locked devil portrait draws once, never replaced by fallback at four viewports',()=>{
  for(const [width,height] of sizes){
    let visits=[];
    const d=devil({characterId:'exact-catalog-devil',phase:3,mode:'attack'});
    const before=JSON.stringify(d);
    const ops=paint({d,e:null,viewport:{width,height},drawPortrait:(g,id,x,y,w,h)=>{
      visits.push([id,x,y,w,h]);g.fillStyle='#ee00bb';g.fillRect(x,y,w,h);return true;
    }});
    assert.deepEqual(visits,[['exact-catalog-devil',-14,-63,28,28]]);
    assert.ok(opIndex(ops,'clip',undefined)>=0,'portrait is clipped into helmet');
    assert.ok(ops.some(o=>o[0]==='set'&&o[1]==='fillStyle'&&o[2]==='#ee00bb'));
    assert.ok(!ops.some(o=>o[0]==='set'&&o[1]==='fillStyle'&&o[2]==='#dbab85'),
      'success must never overpaint the portrait with fallback skin');
    assert.ok(!labels(ops).includes('EC'),'success must not paint fallback initials');
    assert.equal(JSON.stringify(d),before,'renderer cannot mutate devil state');
    assert.deepEqual(ops.slice(0,3),[['save'],['translate',0,0],['scale',2,2]],
      'camera transformation applied once before local sprite transforms');
  }
});

test('unavailable/throwing portrait uses a neutral, readable non-catalog face',()=>{
  const d=devil({characterId:'real-unlocked-catalog-id',mode:'attack'});
  for(const size of sizes){
    const opts={d,e:null,viewport:{width:size[0],height:size[1]}};
    const a=paint({...opts,drawPortrait:()=>false});
    const b=paint({...opts,drawPortrait:()=>{throw Error('offline image');}});
    assert.deepEqual(a,b,'throw and false have identical fallback');
    assert.ok(a.some(o=>o[0]==='set'&&o[1]==='fillStyle'&&o[2]==='#dbab85'));
    assert.ok(labels(a).includes('RU'),'source-ID initials remain readable');
  }
});

test('incoming, hovering countdown, boarding and departure labels overlay hull',()=>{
  for(const size of sizes){
    const viewport={width:size[0],height:size[1]};
    const incoming=paint({d:null,e:extraction('incoming'),viewport});
    assert.ok(labels(incoming).includes('HELI INBOUND'));
    const hovering=paint({d:null,e:extraction(),viewport});
    assert.ok(labels(hovering).includes('BOARD HERE'));
    assert.ok(labels(hovering).includes('9s'),'use remaining simulation seconds (ceil)');
    assert.ok(labels(hovering).includes('1')&&labels(hovering).includes('2'));
    assert.ok(opIndex(hovering,'fillText','BOARD HERE')>opIndex(hovering,'fillText','LIFTERN'),
      'hull or cover must never paint on top of the real boarding label');
    const nearing=paint({d:null,e:extraction('hover',{zone:{
      x:245,y:295,radius:44,open:true,secondsRemaining:.01}}),viewport});
    assert.ok(labels(nearing).includes('1s'));
    const exiting=paint({d:null,e:extraction('departure',{boarded:[true,false]}),viewport});
    assert.ok(labels(exiting).includes('DEPARTING'));
    assert.ok(!labels(exiting).includes('BOARD HERE'),'closed zone cannot invite boarding');
    assert.ok(!labels(exiting).includes('9s'),'no hover countdown during departure');
  }
});

test('painter uses simulation timing, independent boarder markers and reduced motion',()=>{
  const e=extraction('hover',{boarded:[false,true]});
  const before=JSON.stringify(e);
  const a=paint({d:null,e,time:1,reducedMotion:true});
  const b=paint({d:null,e,time:91,reducedMotion:true});
  assert.deepEqual(a,b,'rotors, wash and pulse freeze, boarding UI remains');
  assert.ok(labels(a).includes('9s'));
  assert.notDeepEqual(paint({d:null,e,time:1}),paint({d:null,e,time:91}),
    'normal rotor/wash animation remains enabled');
  assert.equal(JSON.stringify(e),before);
});

test('far-off cinematics cull, near-edge cues remain and invalid viewport is safe',()=>{
  const cam={x:100,y:50,zoom:2};
  const far=paint({d:devil({x:99999,y:99999}),
    e:extraction('hover',{zone:{x:99999,y:99999,radius:44,open:true},
      helicopter:{x:99999,y:99999,visible:true}}),camera:cam});
  assert.ok(!far.some(o=>o[0]==='fillRect'||o[0]==='fillText'),
    'no geometry for distant sprites and exit cues');
  const edge=paint({d:null,e:extraction('hover',{helicopter:{
    x:480,y:35,visible:true,rotorAngle:.8}}),camera:cam});
  assert.ok(labels(edge).includes('LIFTERN'),'conservative edge margin prevents popping');
  const malformed=paint({viewport:{width:NaN,height:0},camera:cam});
  assert.ok(labels(malformed).includes('BOARD HERE'),'missing view dimensions disable culling');
});
