// Node test for Paddy's Pool (src/engines/pool/physics.js + rules.js): english, draw, pockets, breaks, and the 8-ball /
// 9-ball calls. Run: node tests/pool-rules.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url),cache=new Map();
function load(id){if(cache.has(id))return cache.get(id).exports;const mod={exports:{}};cache.set(id,mod);
 runInNewContext(readFileSync(new URL(id,root),'utf8'),{exports:mod.exports,require:load,Math,console,Object,Array,Number,JSON,Infinity,NaN,isFinite},{filename:id});return mod.exports;}
const P=load('src/engines/pool/physics.js'),RU=load('src/engines/pool/rules.js');
const T=P.buildTable();let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;};
// english: straight up into the long rail, right english comes back to the right (+x)
const eng=side=>{const b=[P.makeBall(0,20,15)];P.strike(b[0],[0,-1],80,side,0);for(let i=0;i<90;i++)P.step(b,T,1/60);return b[0].x-20;};
ok(Math.abs(eng(0))<.05,'no english comes straight back');ok(eng(.45)>4,'right english goes right');ok(eng(-.45)<-4,'left english goes left');
// draw vs follow
const fd=vert=>{const b=[P.makeBall(0,-10,0),P.makeBall(1,10,0)];P.strike(b[0],[1,0],100,0,vert);for(let i=0;i<60;i++)P.step(b,T,1/60);return b[0].x;};
ok(fd(-.5)<0,'draw comes back');ok(fd(.25)>fd(0)&&fd(0)>fd(-.25),'follow > stun > draw');
// pockets: diagonal into a corner, down the rail, straight into the side
const pot=(x,y,d,V)=>{const b=[P.makeBall(0,x,y)];const L=Math.hypot(...d);P.strike(b[0],[d[0]/L,d[1]/L],V);return P.simulate(b,T).pots.length;};
ok(pot(0,0,[44,22],100)===1,'corner on the diagonal');ok(pot(-30,22-P.R,[1,0],90)===1,'down the rail');ok(pot(20,0,[-20,22],80)===1,'side pocket');
ok(pot(10,0,[1,.02],60)===0,'a rail shot stays up');
// a hard break keeps every ball on the table area or in a pocket
for(let k=0;k<6;k++){const balls=P.rack(k%2?'nine':'eight',Math.random);P.strike(balls[0],[1,(Math.random()-.5)*.02],330,0,-.1);P.simulate(balls,T);
 ok(balls.every(b=>!b.on||Math.abs(b.x)<=P.HX&&Math.abs(b.y)<=P.HY),'break: nothing off the table');}
// rack layouts
const r8=P.rack('eight',Math.random);ok(r8.length===16&&new Set(r8.map(b=>b.id)).size===16,'15 + cue');const r9=P.rack('nine',Math.random);ok(r9.length===10,'9 + cue');
ok(r9.find(b=>b.id===1).x===Math.min(...r9.filter(b=>b.id).map(b=>b.x)),'1 at the apex');
// ---------------- rules
const rec=(o={})=>({first:null,cueRailsBeforeHit:0,railAfter:false,railBalls:[],pots:[],...o});
const all8=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
let m=RU.newMatch('eight');
let o=RU.judge(m,all8,rec({first:1,railBalls:[1,2]}));ok(o.foul==='Illegal break','soft break = foul');
o=RU.judge(m,all8,rec({first:1,railBalls:[1,2,3,4]}));ok(!o.foul&&!o.keep,'legal break, nothing in');
o=RU.judge(m,all8,rec({first:1,pots:[{id:8,pocket:0}],railBalls:[]}));ok(o.winner===0&&o.why==='break8','8 on the break wins');
o=RU.judge(m,all8,rec({first:1,pots:[{id:8,pocket:0},{id:0,pocket:2}]}));ok(o.winner===null&&o.respot.includes(8)&&o.bih.kitchen,'8 + scratch on the break: respot, kitchen');
m=RU.newMatch('eight');m.isBreak=false;
o=RU.judge(m,all8,rec({first:3,railAfter:true,pots:[{id:3,pocket:1}]}));ok(o.assign==='solid'&&o.keep,'open table: solids');RU.apply(m,o);ok(m.group[0]==='solid'&&m.group[1]==='stripe','groups set');
o=RU.judge(m,all8,rec({first:11,railAfter:true}));ok(o.foul==='Wrong group first'&&o.bih.who===1,'wrong group');
o=RU.judge(m,all8,rec({first:8,railAfter:true}));ok(o.foul==='Hit the 8 first','8 first = foul');
o=RU.judge(m,all8,rec({first:2,railAfter:true,pots:[{id:8,pocket:3}]}));ok(o.winner===1&&o.why==='8early','8 early loses');
o=RU.judge(m,all8,rec({first:2,railAfter:true,pots:[{id:12,pocket:3}]}));ok(!o.keep&&!o.foul,'only their ball: turn over');
o=RU.judge(m,[8,9,10],rec({first:8,railAfter:true,pots:[{id:8,pocket:3}]}));m.call=3;o=RU.judge(m,[8,9,10],rec({first:8,railAfter:true,pots:[{id:8,pocket:3}]}));ok(o.winner===0,'called 8 wins');
o=RU.judge(m,[8,9,10],rec({first:8,railAfter:true,pots:[{id:8,pocket:1}]}));ok(o.winner===1&&o.why==='8wrong','8 in the wrong pocket');
o=RU.judge(m,[8,9],rec({first:8,railAfter:true,pots:[{id:8,pocket:3},{id:0,pocket:2}]}));ok(o.winner===1,'scratch on the 8 loses');
o=RU.judge(m,[1,8,9],rec({first:1,railAfter:false}));ok(o.foul==='No rail after contact','no rail');
// 9-ball
m=RU.newMatch('nine');const all9=[1,2,3,4,5,6,7,8,9];
o=RU.judge(m,all9,rec({first:2,pots:[{id:5,pocket:0}]}));ok(o.foul&&!o.keep,'break: the 1 first');
o=RU.judge(m,all9,rec({first:1,pots:[{id:9,pocket:0}]}));ok(o.winner===0&&o.why==='golden','golden break');
m.isBreak=false;o=RU.judge(m,[3,4,9],rec({first:3,railAfter:true,pots:[{id:9,pocket:2,kissed:3}]}));ok(o.winner===0&&o.tags.includes('combo'),'combo on the 9 wins');
o=RU.judge(m,[3,4,9],rec({first:4,railAfter:true,pots:[{id:9,pocket:2}]}));ok(o.foul&&o.respot.includes(9)&&o.winner===null,'fouled 9 comes back');
m.fouls[0]=2;o=RU.judge(m,[3,4,9],rec({first:null}));ok(o.winner===1&&o.why==='3fouls','three fouls lose');
m=RU.newMatch('nine',{race:2});RU.apply(m,{who:0,foul:null,keep:false,winner:0,pots:[9]});ok(m.racks[0]===1&&m.over===null,'race to 2: not over');RU.nextRack(m);ok(m.breaker===1&&m.isBreak,'alternate break');
console.log(`pool-rules: ${n} checks OK`);
