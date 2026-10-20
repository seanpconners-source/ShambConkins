// CPU opponents for solo (1P arcade) play. Player 2 (index 1) is the CPU; s.solo.skill is 0.35 / 0.65 / 0.9.
const {cpuSkill}=require("src/solo.js");
const isCpu=s=>s?.solo?.kind==='cpu';
// Hot-seat games: hand-off cards are skipped after the first one (one human on the phone) and whenever
// isTurn() is true the CPU waits a beat, then think() plays its move through the engine's own move function.
function cpuHotseat(s,{isTurn,think,delay=700}){
 s.hotseat=true;let thinking=false;
 s.frame(()=>{if(thinking||!s.alive||s.paused||s.waiting||!isTurn())return;thinking=true;
  s.delay(delay*(1.25-cpuSkill(s)*.5)).then(async ok=>{try{if(ok&&s.alive&&!s.paused&&isTurn())await think();}catch(e){console.error('cpu move failed',e);}finally{thinking=false;}});});
}
// Search depth for the skill: easy / normal / hard → lo .. hi.
const cpuDepth=(s,lo,hi)=>Math.round(lo+(hi-lo)*Math.min(1,Math.max(0,(cpuSkill(s)-.35)/.55)));
// Easy CPUs blunder now and then: chance of a random legal move instead of the searched one.
const cpuBlunder=(s,rand=Math.random)=>rand()<Math.max(0,.55-cpuSkill(s)*.6);
// Negamax with alpha-beta. g = {moves(st), play(st,m) → next state, turn(st) → 0|1, over(st) → winner (-1 none, 2 draw),
// value(st) → score for player 1 (the CPU)}. Returns the best move for whoever moves in st.
function negamax(g,st,depth,{deadline=Infinity,rand=Math.random}={}){
 const sign=t=>t===1?1:-1;
 function search(st,d,a,b){const w=g.over(st);if(w===0||w===1)return sign(w)*sign(g.turn(st))*(1e6+d);if(w===2)return 0;
  const ms=g.moves(st);if(!d||!ms.length||Date.now()>deadline)return sign(g.turn(st))*g.value(st);
  let best=-Infinity;for(const m of ms){const n=g.play(st,m);if(!n)continue;const same=g.turn(n)===g.turn(st),v=same?search(n,d-1,a,b):-search(n,d-1,-b,-a);if(v>best)best=v;if(best>a)a=best;if(a>=b)break;}return best===-Infinity?0:best;}
 const ms=g.moves(st);let best=null,bv=-Infinity;
 for(const m of ms.slice().sort(()=>rand()-.5)){const n=g.play(st,m);if(!n)continue;const same=g.turn(n)===g.turn(st),v=same?search(n,depth-1,-Infinity,Infinity):-search(n,depth-1,-Infinity,Infinity);if(v>bv){bv=v;best=m;}}
 return best??ms[0];
}
const pickRandom=(list,rand=Math.random)=>list[Math.floor(rand()*list.length)];
Object.assign(exports,{isCpu,cpuHotseat,cpuDepth,cpuBlunder,negamax,pickRandom,cpuSkill});
