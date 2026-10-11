import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createContext,runInContext} from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(resolve(root,'src/engines/broforce/cinematicArt.js'),'utf8');
const sandbox=createContext({exports:{}});
runInContext(source,sandbox,{filename:'cinematicArt.js'});
const {drawBroforceCinematics:draw}=sandbox.exports;
const plain=v=>JSON.parse(JSON.stringify(v));
function mock(){
 const calls=[];let depth=0;
 const ctx=new Proxy({}, {get(target,key){
   if(key==='calls')return calls;
   if(key==='depth')return depth;
   if(key==='save')return ()=>{depth++;calls.push(['save']);};
   if(key==='restore')return ()=>{depth--;assert.ok(depth>=0);calls.push(['restore']);};
   if(key==='measureText')return s=>({width:s.length*7});
   if(key==='fillText')return (...args)=>{calls.push([key,...args]);};
   if(['translate','scale','rotate','moveTo','lineTo','ellipse','arc','fillRect','strokeRect','rect','clearRect','drawImage'].includes(key))
     return (...args)=>{assert.ok(args.every(v=>typeof v!=='number'||Number.isFinite(v)),key+' finite args');calls.push([key,...args]);};
   if(['beginPath','closePath','fill','stroke','clip'].includes(key))return ()=>{calls.push([key]);};
   return target[key];
  },set(target,key,value){target[key]=value;calls.push(['set',key,value]);return true;}});
 return ctx;
}
const boss=(overrides={})=>({characterId:'captain-strange',x:160,y:120,w:58,h:72,phase:1,
 mode:'intro',modeTimer:1.15,flash:0,attack:null,telegraph:null,projectiles:[],...overrides});
const heli=(phase='hover',override={})=>({x:300,y:280,phase,zone:{x:300,y:280,radius:44,open:phase==='hover'},
 helicopter:{x:300,y:236,visible:phase!=='dormant'&&phase!=='failed',rotorAngle:.8},
 boarded:[false,false],...override});
function paint(devil,extraction,options={}){const g=mock();draw(g,{devil,extraction,camera:{x:100,y:50,zoom:2},
 viewport:{width:390,height:780},time:1.25,...options});assert.equal(g.depth,0);return g.calls;}
function texts(calls){return calls.filter(c=>c[0]==='fillText').map(c=>c[1]);}
function rects(calls){return calls.filter(c=>c[0]==='fillRect').length;}

test('export, no inputs, nullable context, screen camera mapping once and state purity',()=>{
 assert.equal(typeof draw,'function');assert.doesNotThrow(()=>draw());assert.doesNotThrow(()=>draw(null));
 const d=boss(),e=heli(),before=JSON.stringify([d,e]);
 const calls=paint(d,e);assert.deepEqual(calls.slice(0,3),[['save'],['translate',-200,-100],['scale',2,2]]);
 assert.equal(calls.at(-1)[0],'restore');assert.equal(JSON.stringify([d,e]),before);
 assert.ok(rects(calls)>65,'authored geometry, not a placeholder');
 assert.deepEqual(paint(d,e),calls,'same inputs render identical commands');
});

test('all BF-20 boss modes, HP phases and attacks remain visually distinct',()=>{
 const variants=[boss(),boss({mode:'windup',attack:'fan',telegraph:{attack:'fan',targetX:320,targetY:240,duration:.8,remaining:.3}}),
 boss({mode:'windup',attack:'quake',telegraph:{attack:'quake',targetX:320,targetY:240,radius:35,duration:.8,remaining:.3}}),
 boss({mode:'windup',attack:'dive',telegraph:{attack:'dive',targetX:320,targetY:240,radius:39,duration:.8,remaining:.3}}),
 boss({mode:'attack',attack:'fan'}),boss({mode:'attack',attack:'quake'}),boss({mode:'attack',attack:'dive'}),
 boss({mode:'recover',phase:2}),boss({mode:'recover',phase:3}),boss({mode:'dying',deathTimer:.5}),boss({mode:'dead'})];
 const images=variants.map(d=>JSON.stringify(paint(d,null)));
 assert.equal(new Set(images).size,images.length);
 assert.ok(images.at(-1).length<images[0].length/5,'dead sprite no longer renders');
 assert.ok(texts(paint(variants[0],null)).includes('BOSS INBOUND'));
 const reflected=paint(boss({mode:'attack',attack:'fan',flash:.12,projectiles:[{x:5,y:10}]}),null);
 assert.ok(reflected.some(c=>c[0]==='fillRect'&&c[1]===2&&c[2]===7));
});

test('telegraphs consume BF-20 targets, readable even with reduced motion',()=>{
 for(const attack of ['fan','quake','dive']){
  const d=boss({mode:'windup',attack,telegraph:{attack,targetX:1000,targetY:345,radius:39,duration:1,remaining:.2}});
  const old=paint(d,null);const reduced=paint(d,null,{reducedMotion:true});
  assert.ok(old.some(c=>c.includes(1000)));
  assert.ok(reduced.some(c=>c.includes(1000)));
 }
});

test('portrait passed the real devil characterId with dimensions; safe fallback on failure',()=>{
 let seen=[];const cb=(...args)=>{seen.push(args);return true;};
 const d=boss({characterId:'real-unlocked-catalog-id',mode:'attack'});
 paint(d,null,{drawPortrait:cb});
 assert.equal(seen.length,1);assert.equal(seen[0][1],'real-unlocked-catalog-id');
 assert.deepEqual(seen[0].slice(2),[-14,-63,28,28]);
 const fallback=paint(d,null,{drawPortrait:()=>false});
 assert.ok(texts(fallback).includes('RU'));
 const broken=paint(d,null,{drawPortrait:()=>{throw Error('not loaded');}});
 assert.deepEqual(broken,fallback);
});

test('every BF-21 extraction phase, independent boarding indicators, offscreen no-op',()=>{
 const phases=['dormant','incoming','hover','departure','completed','failed'];
 const scenes=phases.map(p=>paint(null,heli(p, p==='completed'?{helicopter:{x:480,y:35,visible:true,rotorAngle:.8}}:p==='departure'?{helicopter:{x:390,y:145,visible:true,rotorAngle:.8}}:{})));
 assert.equal(new Set(scenes.map(s=>JSON.stringify(s))).size,5,'dormant/failed intentionally invisible');
 assert.ok(rects(scenes[0])===0);assert.ok(rects(scenes[5])===0);
 for(const index of [1,2,3,4])assert.ok(rects(scenes[index])>15);
 assert.ok(texts(scenes[2]).includes('BOARD HERE'));
 for(const boarded of [[false,false],[true,false],[false,true],[true,true]]){
  const c=paint(null,heli('hover',{boarded}));
  assert.ok(texts(c).includes('1')&&texts(c).includes('2'));
  assert.equal(JSON.stringify(boarded),JSON.stringify([...boarded]));
 }
});

test('reduced motion freezes rotor, bob and pulse while keeping boarding UI',()=>{
 const d=boss({mode:'windup',attack:'quake',telegraph:{attack:'quake',targetX:315,targetY:265,duration:1,remaining:.4}});
 const e=heli('hover');
 const r1=JSON.stringify(paint(d,e,{time:1,reducedMotion:true}));
 const r2=JSON.stringify(paint(d,e,{time:99,reducedMotion:true}));
 assert.equal(r1,r2);
 const m1=JSON.stringify(paint(d,e,{time:1}));
 const m2=JSON.stringify(paint(d,e,{time:99}));
 assert.notEqual(m1,m2,'blades and wind animate in normal mode');
 assert.ok(texts(JSON.parse(r2)).includes('BOARD HERE'));
});

test('bad numeric/world input cannot throw, move renderer or lose canvas state',()=>{
 const d=boss({x:Infinity,y:NaN,projectiles:[{x:Infinity,y:2},null]});
 const e=heli('hover',{helicopter:{visible:true,x:NaN,y:220}});
 assert.doesNotThrow(()=>paint(d,e,{camera:{x:Infinity,y:NaN,zoom:-1},time:Infinity}));
 const g=mock();draw(g,{devil:boss(),extraction:heli(),drawPortrait:()=>{throw Error('offline');}});
 assert.equal(g.depth,0);
});
