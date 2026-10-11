// Standalone VM test: no browser, network, packages, or ShambConkins engine.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
import {performance} from 'node:perf_hooks';
const file=new URL('../src/engines/broforce/actorArt.js',import.meta.url);
const code=readFileSync(file,'utf8');
const sandbox={exports:{},require(){throw Error('BF-25 must not require runtime modules');}};
new Script(code,{filename:'actorArt.js'}).runInContext(createContext(sandbox));
const {drawBroforceActor}=sandbox.exports;
assert.equal(typeof drawBroforceActor,'function');

function canvas({throwImage=false}={}){
  const ops=[];
  let depth=0,peak=0;
  const ctx={
    get depth(){return depth;},get peak(){return peak;},ops,
    save(){depth++;peak=Math.max(depth,peak);ops.push(['save']);},
    restore(){assert.ok(depth>0,'restore has matching save');depth--;ops.push(['restore']);},
    translate(...args){ops.push(['translate',...args]);},scale(...args){ops.push(['scale',...args]);},
    rotate(...args){ops.push(['rotate',...args]);},
    beginPath(){ops.push(['begin']);},closePath(){ops.push(['close']);},
    moveTo(...args){ops.push(['moveTo',...args]);},
    lineTo(...args){ops.push(['lineTo',...args]);},
    fill(){ops.push(['fill']);},stroke(){ops.push(['stroke']);},
    fillRect(...args){ops.push(['rect',this.fillStyle,...args]);},
    ellipse(...args){ops.push(['ellipse',...args]);},
    clip(){ops.push(['clip']);},
    drawImage(...args){ops.push(['image',...args]);if(throwImage)throw Error('not drawable');}
  };
  return ctx;
}
const poses=['idle','run','jump','fall','shoot','recoil','hurt','dead','rescue','celebrate'];
const signatures=new Set();
for(const pose of poses){
  const g=canvas();drawBroforceActor(g,{x:90,y:120,pose,time:0.12,team:0});
  assert.equal(g.depth,0,`${pose}: balanced save/restore`);
  assert.ok(g.ops.length>45,`${pose}: finished silhouette`);
  assert.deepEqual(g.ops.filter(o=>o[0]==='translate')[0],[ 'translate',90,120 ]);
  assert.ok(g.ops.some(o=>o[0]==='ellipse'),`${pose}: ground shadow`);
  signatures.add(g.ops.map(o=>JSON.stringify(o)).join(''));
}
assert.equal(signatures.size,poses.length,'ten genuinely distinct poses');
for(const time of [0,.087,.17,.254]){
  const g=canvas();drawBroforceActor(g,{x:4,y:30,pose:'run',time});
  assert.equal(g.depth,0);signatures.add(g.ops.map(o=>JSON.stringify(o)).join(''));
}
assert.ok(signatures.size>=poses.length+3,'run frames animate independently');
const shootA=canvas(),shootB=canvas();
drawBroforceActor(shootA,{x:0,y:0,pose:'shoot',time:0});
drawBroforceActor(shootB,{x:0,y:0,pose:'shoot',time:.10});
assert.notDeepEqual(shootA.ops,shootB.ops,'muzzle flashes change over time');
for(const w of ['rifle','pistol','shotgun','launcher','unexpected']){
  const g=canvas();drawBroforceActor(g,{x:0,y:0,weapon:w,pose:'shoot'});
  assert.ok(g.ops.some(o=>o[0]==='rect'));assert.equal(g.depth,0);
}
const left=canvas(),right=canvas();
drawBroforceActor(left,{x:100,y:80,facing:-1,scale:2,team:1});
drawBroforceActor(right,{x:100,y:80,facing:1,scale:2,team:0});
assert.ok(left.ops.some(o=>o[0]==='scale'&&o[1]===-2&&o[2]===2));
assert.ok(right.ops.some(o=>o[0]==='rect'&&o[1]==='#5de0d5'));
assert.ok(left.ops.some(o=>o[0]==='rect'&&o[1]==='#ffad65'));
assert.equal(left.depth,0);
let headCalls=0;
const headCtx=canvas();
drawBroforceActor(headCtx,{x:80,y:80,drawHead:(g,x,y,size)=>{
  assert.equal(g,headCtx);assert.equal(size,20);assert.ok(x<0&&y<0);
  headCalls++;g.fillRect(x,y,size,size);
}});
assert.equal(headCalls,1,'callback has priority');assert.equal(headCtx.depth,0);
const image={complete:true,naturalWidth:100,naturalHeight:160};
const imageCtx=canvas();drawBroforceActor(imageCtx,{x:0,y:0,headImage:image});
const imageCall=imageCtx.ops.find(o=>o[0]==='image');
assert.ok(imageCall,'loaded portrait drawn');
assert.equal(imageCall[1],image);
assert.deepEqual(imageCall.slice(2,6),[0,30,100,100],'centre square crop without stretching');
assert.deepEqual(imageCall.slice(6),[-10,-47,20,20]);
assert.equal(imageCtx.depth,0);
for(const invalid of [null,{}, {complete:false,naturalWidth:100,naturalHeight:100},
  {naturalWidth:0,naturalHeight:12}, {naturalWidth:NaN,naturalHeight:20}]){
  const g=canvas();drawBroforceActor(g,{x:0,y:0,headImage:invalid});
  assert.equal(g.depth,0);assert.equal(g.ops.filter(o=>o[0]==='image').length,0);
  assert.ok(g.ops.some(o=>o[0]==='rect'&&o[1]==='#dba779'),'offline face replaces invalid portrait');
}
const thrown=canvas({throwImage:true});
drawBroforceActor(thrown,{x:0,y:0,headImage:image,pose:'hurt',hitFlash:true});
assert.equal(thrown.depth,0,'canvas restored after image error');
assert.ok(thrown.ops.some(o=>o[0]==='rect'&&o[1]==='#dba779'));
const badHead=canvas();
assert.throws(()=>drawBroforceActor(badHead,{x:0,y:0,drawHead(){throw Error('caller error');}}),/caller error/);
assert.equal(badHead.depth,0,'canvas restored even when user callback fails');
for(const opts of [{x:NaN,y:0},{x:0,y:1,scale:0},{x:0,y:1,scale:Infinity}]){
  const g=canvas();drawBroforceActor(g,opts);assert.equal(g.ops.length,0,'invalid actor coordinates draw nothing');
}
const start=performance.now(),cycles=1300;
for(let i=0;i<cycles;i++){
  const g=canvas();drawBroforceActor(g,{x:i%320,y:300,pose:poses[i%poses.length],time:i/60,headImage:image});
  assert.equal(g.depth,0);
  assert.ok(g.ops.length<400,'per-frame draw-call budget');
}
const elapsed=performance.now()-start;
assert.ok(elapsed<7000,`draw ${cycles} sprites in ${Math.round(elapsed)} ms`);
console.log(`PASS BF-25: ${poses.length} poses, animation, palette, 5 weapons, head callback/images/fallback, balanced canvas, ${cycles} frames in ${Math.round(elapsed)} ms`);