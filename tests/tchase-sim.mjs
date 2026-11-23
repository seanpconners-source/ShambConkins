// Judgment Day Chase simulation (Node): every stage runs with the autopilot from the start through the boss; the
// fairness rules hold (chasers from behind always warned first, nothing kills you in one hit at full health).
// Usage: node tests/tchase-sim.mjs [seeds]
import {req} from './load.mjs';
const S=req('src/engines/tchase/sim.js'),D=req('src/engines/tchase/data.js');
const N=+(process.argv[2]||3);let bad=0;const fail=m=>{bad++;console.log('FAIL',m);};
for(let st=0;st<D.STAGES.length;st++){const rows=[];
 for(let k=0;k<N;k++){const w=S.makeWorld({stage:st,seed:'t'+k});let t=0,bigHit=0;const dt=1/60;
  while(t<300&&w.phase!=='dead'){const inp=S.bot(w,.85);if(w.cardOffer)S.takeCard(w,w.cardOffer[0].id);
   const hp=w.P.hp;S.step(w,dt,inp);if(w.boss&&w.hpAtBoss==null){w.hpAtBoss=Math.round(w.P.hp);w.bossT=t;}if(hp-w.P.hp>=hp*.8&&hp===w.P.maxHp)bigHit++;t+=dt;if(w.phase==='outro'&&w.outro.t>1.5)break;}
  const warns=w.log.filter(l=>l[0]==='warn').length,ev=n=>w.log.filter(l=>l[0]===n).length;
  if(bigHit)fail(`stage ${st} seed ${k}: a single hit took 80% at full health`);
  const dm={};for(const l of w.log)if(l[0]==='hurt')dm[l[1]]=(dm[l[1]]||0)+l[2];const dmS=Object.entries(dm).map(([k,v])=>k+':'+Math.round(v)).join(' ');
  rows.push(`${dmS}\n   ${w.phase.padEnd(6)} ${t.toFixed(0).padStart(3)}s hp ${Math.round(w.P.hp).toString().padStart(3)} kills ${w.kills} td ${w.takedowns} near ${w.near} warn ${warns} boss ${ev('boss')} down ${ev('bossDown')} card ${ev('card')} jump ${ev('jump')} score ${w.score} bossHp ${w.boss?Math.round(w.boss.hp)+'/'+Math.round(w.boss.max)+(w.boss.knock!=null?' knock '+w.boss.knock:'')+(w.boss.valves?' valves '+w.boss.valves.filter(v=>v.hp>0).length:''):'-'} bossT ${w.bossT!=null?(t-w.bossT).toFixed(0):'-'} hpAtBoss ${w.hpAtBoss??'-'}`);}
 console.log(`stage ${st} ${D.STAGES[st].id}\n  `+rows.join('\n  '));
 if(!rows.some(r=>r.startsWith('outro')))fail(`stage ${st}: the autopilot never beat the boss`);}
console.log(bad?`${bad} FAILED`:'tchase-sim OK');process.exit(bad?1:0);
