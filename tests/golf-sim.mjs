// Tin Cup Tour (Node): physics numbers, the trackball model, every hole is playable, CPU rounds by skill.
// Usage: node tests/golf-sim.mjs [--quick]
import {readFileSync} from 'node:fs';
const mods={};function req(id){if(mods[id])return mods[id].exports;const src=readFileSync(new URL('../'+id,import.meta.url),'utf8');const m={exports:{}};mods[id]=m;
 new Function('exports','require','module',src)(m.exports,req,m);return m.exports;}
const P=req('src/engines/golf/physics.js'),C=req('src/engines/golf/courses.js'),CPU=req('src/engines/golf/cpu.js'),RU=req('src/engines/golf/rules.js'),TB=req('src/engines/golf/trackball.js');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m);}else if(process.env.V)console.log('ok',m);};const quick=process.argv.includes('--quick');
// clubs go in order and the driver goes ~260-300 yd
{const tot=P.CLUBS.filter(c=>c.kind!=='putter').map(c=>P.clubDistance(c,1,c.id==='dr'?'tee':'fair').total/P.YD);
 ok(tot.every((d,i)=>i===0||d<tot[i-1]),'clubs shorter in order ('+tot.map(Math.round).join(' ')+')');ok(tot[0]>255&&tot[0]<305,'driver ~280 yd ('+Math.round(tot[0])+')');}
// curve bends the right way: + = right of travel (facing +z, right is -x)
{const S=P.makeShot(P.FLAT,{x:0,y:0,z:0,yaw:0,power:1,curve:1},P.CLUBS[0],'tee');const r=S.run();ok(r.x<-15,'slice bends right ('+r.x.toFixed(1)+')');}
// aftertouch backspin shortens the roll on a green
{const G={...P.FLAT,lie:()=>'green'},sh={x:0,y:0,z:0,yaw:0,power:1};const a=P.makeShot(G,sh,P.CLUBS[6],'fair').run(),b=P.makeShot(G,{...sh,eng:[[.3,.6,0]]},P.CLUBS[6],'fair').run();
 ok(b.total<a.total-1,'aftertouch backspin stops it sooner ('+a.total.toFixed(1)+' -> '+b.total.toFixed(1)+')');}
// deterministic
{const h=C.getCourse('bushwood').holes[0];const a=P.makeShot(h,{x:0,y:h.height(0,0),z:0,yaw:.05,power:.97,curve:.2},P.CLUBS[0],'tee').run(),b=P.makeShot(h,{x:0,y:h.height(0,0),z:0,yaw:.05,power:.97,curve:.2},P.CLUBS[0],'tee').run();ok(JSON.stringify(a)===JSON.stringify(b),'same shot = same result');}
// trackball: a straight full stroke = full power, no curve; leaning right = slice; tiny wiggle = no swing
{const run=(pts)=>{const S=TB.newSwing();for(const q of pts)if(TB.feed(S,q)==='impact')return TB.toShot(S.impact);return null;};
 const s=run(TB.strokeFor(.95,0));ok(s&&Math.abs(s.power-.95)<.12&&s.curve===0,'trackball straight ('+(s&&s.power.toFixed(2))+')');
 const r=run(TB.strokeFor(.9,.6));ok(r&&r.curve>.2,'trackball lean right = slice ('+(r&&r.curve.toFixed(2))+')');
 ok(run([{x:0,y:0,t:0},{x:0,y:.1,t:.1},{x:0,y:-.1,t:.2}])===null,'a wiggle is not a swing');}
// putting: a 3 m putt on a flat green with the right speed drops
{const G={...P.FLAT,lie:()=>'green',cup:{x:0,z:3}};const pt=P.CLUBS.find(c=>c.kind==='putter');let holed=0;for(const pw of [.3,.33,.36,.39,.42]){const r=P.makeShot(G,{x:0,y:0,z:0,yaw:0,power:pw},pt,'green').run();if(r.why==='holed')holed++;}
 ok(holed>=2,'straight 3 m putts drop ('+holed+'/5)');}
// CPU rounds
function playHole(h,skill,seed){let r=0;const rand=()=>{r=(r*1103515245+12345+seed)%2147483648;return r/2147483648;};
 let st={ball:{x:0,z:0},lie:'tee',strokes:0},guard=0;
 while(guard++<14){const pl=CPU.plan(h,st.ball,st.lie,{skill,rand});const S=P.makeShot(h,{x:st.ball.x,y:h.height(st.ball.x,st.ball.z),z:st.ball.z,yaw:pl.yaw,power:pl.power,curve:pl.curve},pl.club,st.lie);
  const res=S.run();const nx=RU.settle(h,st,res,S);st={...st,...nx};if(nx.holed||nx.picked)return nx.strokes;}
 return 99;}
const courses=quick?['bushwood']:['tincup','bushwood','waterbury'];
for(const id of courses){const c=C.getCourse(id);const t0=Date.now();const pro=[],hack=[];
 for(const h of c.holes){pro.push(playHole(h,.95,h.n*7));if(!quick)hack.push(playHole(h,.3,h.n*13));}
 const sum=a=>a.reduce((x,y)=>x+y,0);console.log(`${c.name} par ${c.par}: skilled ${sum(pro)} [${pro.join(' ')}]`+(quick?'':` weak ${sum(hack)} [${hack.join(' ')}]`)+` (${((Date.now()-t0)/1000).toFixed(1)} s)`);
 ok(sum(pro)<=c.par+8,`${id}: skilled CPU within par+8 (${sum(pro)-c.par})`);ok(pro.every(s=>s<99),`${id}: every hole finishes`);
 if(!quick)ok(sum(hack)>sum(pro),`${id}: weak CPU scores worse`);}
console.log(fails?`golf sim: ${fails} FAILED`:'golf sim OK');process.exit(fails?1:0);
