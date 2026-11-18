// Crappy Crush board logic: invariants over many random games + points-per-move calibration.
import {req} from './load.mjs';
const S=req('src/engines/crappy/sim.js');
let fails=0;const bad=m=>{fails++;console.log('FAIL',m);};
function settle(st){let waves=0;for(;;){const w=S.resolve(st);if(!w)break;waves++;S.gravity(st);if(waves>200){bad('runaway cascade');break;}}return waves;}
function check(st,tag){const ids=new Set();for(let i=0;i<st.R*st.C;i++){const p=st.cells[i];if(!st.mask[i]){if(p)bad(tag+' piece in hole');continue;}if(!p){bad(tag+' empty cell '+i);continue;}if(ids.has(p.id))bad(tag+' dup id');ids.add(p.id);}}
const stats={};
for(const [R,C,K] of [[9,8,5],[9,8,6],[8,8,6]])for(const greedy of [true,false]){let pts=0,moves=0,specials=0;
 for(let g=0;g<60;g++){const crap=g%3===0?[[20,1],[21,2],[30,1]]:[];const mask=g%4===1?Array.from({length:R*C},(_,i)=>(i%C===0&&i<2*C)||(i%C===C-1&&i>=(R-2)*C)?0:1):null;
  const st=S.make({R,C,K,seed:'t'+g+R+C+K,crap,mask});check(st,'start');
  for(let m=0;m<25;m++){const mv=greedy?S.hint(st):(()=>{const a=S.allMoves(st);return a[(Math.random()*a.length)|0];})();if(!mv){bad('no move');break;}
   const before=st.score;const r=S.trySwap(st,mv[0],mv[1]);if(!r.ok){bad('hint invalid');break;}settle(st);check(st,'after');pts+=st.score-before;moves++;
   if(!S.hasMove(st))S.shuffle(st);if(!S.hasMove(st))bad('stuck after shuffle');}
  specials+=st.stats.specials;
  if(g%5===0){const hit=S.dropCrap(st,6);if(hit.length<1)bad('dropCrap');check(st,'crap');}
  // finale
  S.finaleStripes(st,5);if(S.fireAllSpecials(st)){S.resolveForced(st);S.gravity(st);settle(st);check(st,'finale');}}
 stats[`${R}x${C} K${K} ${greedy?'greedy':'random'}`]={perMove:Math.round(pts/moves),specialsPerGame:(specials/60).toFixed(1)};}
console.table(stats);
// invalid swap is refused; combos
{const st=S.make({R:9,C:8,K:6,seed:'x'});const a=0,b=1;const v=S.validSwap(st,a,b);const r=S.trySwap(st,a,b);if(r.ok!==v)bad('trySwap disagrees');}
{const st=S.make({R:8,C:8,K:6,seed:'bomb'});st.cells[27]={id:9001,k:-1,sp:'b'};const k=st.cells[28].k;S.trySwap(st,27,28);const w=S.resolve(st);if(!w||!w.bombs.length)bad('throne swap');S.gravity(st);settle(st);check(st,'bomb');}
{const st=S.make({R:8,C:8,K:6,seed:'ww'});st.cells[27].sp='w';st.cells[28].sp='h';S.trySwap(st,27,28);const w=S.resolve(st);if(!w||!w.beams.length)bad('wrap+stripe');S.gravity(st);settle(st);check(st,'combo');}
console.log(fails?`${fails} failures`:'crappy sim OK');process.exit(fails?1:0);
