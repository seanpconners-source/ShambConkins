// Crappy Crush stages (src/data/crappyCrushWorlds.js): every stage builds sanely, and a goal-aware "casual" bot's win rate
// climbs down from the Candy Land tutorial (~100%) to the last worlds (~45-65%). Usage: node tests/crappy-stages.mjs [tries]
// (TRIES per stage, default 12; STAGES=1,2,50 to pick; prints a table).
import {req} from './load.mjs';
const S=req('src/engines/crappy/sim.js'),Wd=req('src/data/crappyCrushWorlds.js');
let fails=0;const bad=m=>{fails++;console.log('FAIL',m);};
const N=Wd.STAGE_COUNT;
// 1) every stage (and the first Remix loop) is well formed
for(let n=1;n<=N+Wd.PER*Wd.WORLDS.length;n++){const st=Wd.stage(n);
 if(!st.world||st.world.items.length<st.K)bad(`stage ${n}: world/K`);
 if(st.moves<10||st.moves>32)bad(`stage ${n}: moves ${st.moves}`);
 for(const [k,c] of st.collect)if(k<0||k>=st.K||c<1)bad(`stage ${n}: collect ${k}x${c}`);
 for(const [i] of st.crap)if(st.mask&&!st.mask[i])bad(`stage ${n}: crap in a hole`);
 if((st.kind==='crap'||st.kind==='mix')&&!st.crapGoal)bad(`stage ${n}: no crap`);
 if(!(st.target>0&&st.s2>=st.target&&st.s3>=st.s2))bad(`stage ${n}: targets ${st.target}/${st.s2}/${st.s3}`);}
// 2) win rates
function settle(st){for(let w=0;w<300;w++){if(!S.resolve(st))return;S.gravity(st);}}
function play(stg,seed){const st=S.stageBoard(stg,seed);let r=0;const rnd=()=>{r=(r*1103515245+12345)&0x7fffffff;return r/0x7fffffff;};r=seed.length*7919;
 const goalKinds=stg.collect.map(([k])=>k),crapFocus=stg.crapGoal>0;
 for(let m=0,drip=0;m<stg.moves;m++){if(!S.hasMove(st))S.shuffle(st);
  const rated=S.rateMoves(st,{goalKinds,crapFocus}).sort((a,b)=>b.v-a.v),all=S.allMoves(st);if(!all.length)return false;
  const q=rnd();let mv=q<.55&&rated[0]?[rated[0].a,rated[0].b]:q<.85&&rated.length?(x=>[x.a,x.b])(rated[Math.min(rated.length-1,1+((rnd()*2)|0))]):all[(rnd()*all.length)|0];
  if(!S.trySwap(st,mv[0],mv[1]).ok)continue;settle(st);if(S.goalDone(st,stg))return true;
  if(stg.drip&&++drip%stg.drip===0){S.dropCrap(st,1);}}
 return S.goalDone(st,stg);}
const tries=+process.argv[2]||+process.env.TRIES||12;
const pick=process.env.STAGES?process.env.STAGES.split(',').map(Number):[1,2,3,4,5,6,7,8,9,12,15,16,24,40,72,100,140,190,240,290,340,390,440,490,530,560,576,577,600];
const rows=[];let tut=0,tutN=0,late=[];
for(const n of pick){const stg=Wd.stage(n);let wins=0;for(let t=0;t<tries;t++)if(play(stg,`b${n}:${t}`))wins++;const pct=Math.round(100*wins/tries);
 rows.push({n,world:stg.world.name,kind:stg.kind,K:stg.K,d:stg.d,moves:stg.moves,goal:stg.kind==='score'?stg.target:[...stg.collect.map(([k,c])=>c+'×'+k),stg.crapGoal?stg.crapGoal+'💩':''].join(' '),drip:stg.drip||'',shape:stg.mask?'yes':'',win:pct+'%'});
 if(n<=Wd.PER){tut+=pct;tutN++;}if(n>N*.85&&n<=N)late.push(pct);}
console.table(rows);
if(tutN&&tut/tutN<95)bad(`tutorial should be near-certain: ${Math.round(tut/tutN)}%`);
if(late.length&&late.reduce((a,b)=>a+b,0)/late.length>90)bad('last worlds too easy');
console.log(fails?`FAIL (${fails})`:'OK');process.exit(fails?1:0);
