// Boulder Run simulation (Node): the run gets faster and harder the longer it lasts (owner, Nov 24) and stays survivable:
// the perfect autopilot lives the whole 10 minutes, speed reaches the top, later straights are denser than early ones.
// Usage: node tests/trun-sim.mjs [seeds]
import {req} from './load.mjs';
const S=req('src/engines/trun/sim.js'),T=req('src/engines/trun/track.js');
const N=+(process.argv[2]||4);let bad=0;const fail=m=>{bad++;console.log('FAIL',m);};
// speed keeps climbing past the old cap
const v=t=>S.speedAt(t);console.log('speed', [0,60,120,180,300,420,600].map(t=>t+'s '+v(t).toFixed(1)).join(' · '));
if(!(v(300)>S.VMAX+1&&v(600)>=S.VTOP-.01))fail('speed should keep rising past VMAX to VTOP');
// obstacles met per minute by the perfect runner: early (1-2 min) vs late (6-7 min)
{const rates=[[],[]];for(const seed of ['a','b','c']){const C=T.makeCourse(seed),R=S.makeRunner(C),bot=S.makeBot(R,{skill:1,rnd:()=>.5});let lastK=-1,dt=1/30;
  while(R.alive&&R.t<430){bot(dt);R.step(dt);R.events.length=0;const k=R.seg.k;if(k!==lastK){lastK=k;const o=R.seg.obs,i=R.t>60&&R.t<120?0:R.t>370&&R.t<430?1:-1;
    if(i>=0)rates[i].push([o.length,o.filter(q=>!['root','web'].includes(q.kind)).length,o.filter(q=>q.kind==='block'&&q.lanes.length>1).length,R.seg.turn==='T'?1:0]);}}}
 const tot=(a,j)=>a.reduce((x,y)=>x+y[j],0)/3;
 console.log('per minute, early (1-2 min) vs late (6-7 min): obstacles',tot(rates[0],0),'/',tot(rates[1],0),'· deadly',tot(rates[0],1),'/',tot(rates[1],1),'· two-lane blocks',tot(rates[0],2),'/',tot(rates[1],2),'· corners',rates[0].length/3,'/',rates[1].length/3,'· T-junctions',tot(rates[0],3),'/',tot(rates[1],3));
 if(!(tot(rates[1],1)>tot(rates[0],1)))fail('late in the run should throw more deadly obstacles a minute than early');
 if(!(rates[1].length>rates[0].length))fail('late in the run should have more corners a minute');}
// survival: perfect bot 600 s, skilled bot distribution
for(const skill of [1,.9]){const rows=[];for(let i=0;i<N;i++){const r=S.simulate('s'+i,{skill,maxT:600});rows.push(r);}
 console.log(`skill ${skill}:`,rows.map(r=>`${Math.round(r.t)}s ${Math.round(r.dist)}m ${r.dead||'alive'}`).join(' | '));
 if(skill===1&&rows.some(r=>r.dead&&r.t<600))fail('the perfect autopilot died: '+rows.filter(r=>r.dead).map(r=>r.dead+'@'+Math.round(r.t)).join(','));}
console.log(bad?`${bad} FAILED`:'trun-sim OK');process.exit(bad?1:0);
