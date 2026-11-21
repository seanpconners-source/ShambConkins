// Kingpin Bowling (Node, no browser): scoring rules, splits, the lane + pin physics and the CPU bowler.
// Usage: node tests/bowl-sim.mjs [--quick]
import {readFileSync} from 'node:fs';
const mods={};function req(id){if(mods[id])return mods[id].exports;const src=readFileSync(new URL('../'+id,import.meta.url),'utf8');const m={exports:{}};mods[id]=m;
 new Function('exports','require','module',src)(m.exports,req,m);return m.exports;}
const RU=req('src/engines/bowl/rules.js'),PH=req('src/engines/bowl/physics.js');
let fails=0;const ok=(c,msg)=>{if(!c){fails++;console.log('FAIL',msg);}else if(process.env.V)console.log('ok',msg);};
const FULL=[1,2,3,4,5,6,7,8,9,10];
// ---- scoring
function play(len,balls){const g=RU.newGame(len);const evs=[];for(const b of balls)evs.push(RU.addBall(g,typeof b==='number'?{standing:FULL.slice(b)}:b));return {g,evs};}
// a ball that knocks k of what stands (lowest numbers first)
function game(len,counts){const g=RU.newGame(len);const evs=[];for(const k of counts){const r=RU.rackFor(g);evs.push(RU.addBall(g,{standing:r.slice(k)}));}return {g,evs};}
{const {g,evs}=game(10,Array(12).fill(10));ok(RU.total(g)===300&&g.done,'perfect game 300 ('+RU.total(g)+')');ok(evs[2].streakName==='TURKEY!','turkey named');ok(evs[11].streakName==='PERFECT GAME!','perfect named');ok(evs[3].streakName==='HAMBONE!','hambone');}
{const {g}=game(10,Array(21).fill(0).map((_,i)=>i%2?1:9));ok(RU.total(g)===190&&g.done,'all 9 spares 190 ('+RU.total(g)+')');}
{const {g}=game(10,Array(20).fill(0));ok(RU.total(g)===0&&g.done,'gutter game');}
{const {g}=game(10,[10,7,3,9,0,10,0,8,8,2,0,6,10,10,10,8,1]);ok(RU.total(g)===167&&g.done,'sample game 167 ('+RU.total(g)+')');}
{const {g}=game(3,[10,10,10,10,10]);ok(RU.total(g)===90&&g.done,'3-frame perfect 90');}
{const {g}=game(5,[9,1,10,3,4,0,0,10,10,10]);ok(g.done&&RU.total(g)===20+17+7+0+30,'5 frames ('+RU.total(g)+')');}
{const g=RU.newGame(10);const e=RU.addBall(g,{standing:[],foul:true});ok(e.mark==='F'&&e.n===0&&RU.rackFor(g).length===10,'foul counts zero, pins back');const e2=RU.addBall(g,{standing:[]});ok(e2.mark==='/'&&!e2.strike,'foul then all = spare');}
{const g=RU.newGame(10);const e=RU.addBall(g,{standing:[7,10]});ok(e.split&&e.leave==='BEDPOSTS','7-10 split');}
for(const [s,want] of [[[7,10],true],[[4,5],false],[[2,4,5,8],false],[[3,10],true],[[1,2,10],false],[[4,6,7,10],true],[[5,7],true],[[10],false],[[6,10],false],[[8,10],true]])ok(RU.isSplit(s)===want,'split '+s.join('-'));
{const g=RU.newGame(10);RU.addBall(g,{standing:[1,2,3,4,5,6,7,8,9,10]});const rows=RU.sheet(g);ok(rows[0].marks[0]==='-'&&rows.length===10,'sheet marks');}
{// last frame: X then 7 then spare
 const g=RU.newGame(1);RU.addBall(g,{standing:[]});RU.addBall(g,{standing:[8,9,10]});const e=RU.addBall(g,{standing:[]});ok(g.done&&RU.total(g)===20&&e.mark==='/','10th: X 7 /');}
// ---- physics
const quick=process.argv.includes('--quick'),ball=PH.ballSpec({lb:15}),lane=PH.makeLane({});
const aim=(o,b)=>{let lo=-.12,hi=.12;for(let i=0;i<30;i++){const mid=(lo+hi)/2,tr=PH.trace(lane,ball,PH.release({...o,ang:mid},ball));const bb=tr.gutter?(tr.x>0?0:40):PH.xBoard(tr.x);if(bb<b)lo=mid;else hi=mid;}return lo;};
const roll=(o,ang)=>{const R=PH.makeRoll({lane,ball,rel:PH.release({...o,ang},ball),pins:PH.rack()});R.run(14);return R.result();};
const hook={x:PH.boardX(15),speed:8.3,revs:400,axis:45,hand:1};
{const a=aim(hook,17.5),r1=roll(hook,a),r2=roll(hook,a);ok(JSON.stringify(r1)===JSON.stringify(r2),'same release = same pins (deterministic)');
 ok(r1.entry&&r1.entry.ang>4.5&&r1.entry.ang<8,'hook enters at 4.5-8 deg ('+r1.entry?.ang.toFixed(1)+')');}
{let s=0,N=quick?6:14;const a=aim(hook,17.5);for(let i=0;i<N;i++)if(!roll(hook,a+(i-N/2)*.0004).standing.length)s++;ok(s/N>=.6,`pocket hook strikes ${s}/${N}`);}
{const o={x:PH.boardX(20),speed:8.3,revs:0,axis:0,hand:1};let s=0;for(let i=0;i<6;i++)if(!roll(o,(i-3)*.0004).standing.length)s++;ok(s<=2,`head-on nose hit rarely strikes (${s}/6)`);}
{const o={x:PH.boardX(3),speed:8,revs:0,axis:0,hand:1};const r=roll(o,-.02);ok(r.gutter&&r.standing.length===10,'gutter ball');}
{const lefty={x:PH.boardX(40-15),speed:8.3,revs:400,axis:45,hand:-1};const a=aim(lefty,40-17.5);const r=roll(lefty,a);ok(r.entry&&r.entry.ang<-4,'lefty hooks the other way ('+r.entry?.ang.toFixed(1)+')');}
{// spare: a 10 pin alone, ball aimed at it, must be able to take it
 const pins=PH.rack().filter(p=>p.n===10),o={x:PH.boardX(30),speed:8.5,revs:0,axis:0,hand:1};let lo=-.12,hi=.12;
 for(let i=0;i<30;i++){const mid=(lo+hi)/2,tr=PH.trace(lane,ball,PH.release({...o,ang:mid},ball));const xe=tr.x-Math.tan(tr.ang*Math.PI/180)*(pins[0].z-PH.Z1);if(tr.gutter?tr.x>0:xe>pins[0].x)lo=mid;else hi=mid;}
 const R=PH.makeRoll({lane,ball,rel:PH.release({...o,ang:lo},ball),pins});R.run(14);ok(R.result().standing.length===0,'cross-lane 10-pin spare');}
{const t0=Date.now();const a=aim(hook,17.5);for(let i=0;i<4;i++)roll(hook,a+i*.0007);const ms=(Date.now()-t0)/4;ok(ms<400,`a roll takes ${ms.toFixed(0)} ms of compute`);}
// ---- CPU bowler: whole games at two skill levels (a seeded hand)
const CPU=req('src/engines/bowl/cpu.js');
function cpuGame(skill,seed,style='hook'){let r=seed;const rand=()=>{r=(r*1103515245+12345)%2147483648;return r/2147483648;};
 const g=RU.newGame(10);let pins=PH.rack(),balls=0;
 while(!g.done&&balls<25){const rk=RU.rackFor(g);if(rk.length===10)pins=PH.rack();
  const o=CPU.plan({lane,ball,standing:pins,who:{style,hand:1,skill},rand});
  const R=PH.makeRoll({lane,ball,rel:PH.release(o,ball),pins});R.run(14);const res=R.result();
  RU.addBall(g,{standing:res.standing.map(p=>p.n),gutter:res.gutter});pins=res.standing;balls++;}
 return RU.total(g);}
if(!quick){const hi=[],lo=[];for(let i=0;i<3;i++){hi.push(cpuGame(.95,11+i));lo.push(cpuGame(.25,31+i));}
 const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;console.log('CPU games: skilled',hi.join(' '),'| weak',lo.join(' '));
 ok(avg(hi)>=170,'skilled CPU averages 170+ ('+avg(hi).toFixed(0)+')');ok(avg(lo)<avg(hi)-30,'weak CPU scores clearly less ('+avg(lo).toFixed(0)+')');ok(avg(lo)>=60,'weak CPU still knocks pins ('+avg(lo).toFixed(0)+')');}
console.log(fails?`bowl sim: ${fails} FAILED`:'bowl sim OK');process.exit(fails?1:0);
