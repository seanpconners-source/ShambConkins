// CPU opponents for solo (1P arcade) play. Player 2 (index 1) is the CPU; s.solo.skill is 0.35 / 0.65 / 0.9.
const {cpuSkill}=require("src/solo.js");
const isCpu=s=>s?.solo?.kind==='cpu';
// Online (src/netPlay.js): this phone plays s.online.me; the other player's moves come from s.online.next() and the
// local player's go out with s.online.send(). Like vs CPU there is one person per phone, so hand-off cards are skipped.
const isOnline=s=>!!s?.online;
const remoteSeat=s=>s?.online?s.online.remote:1;
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
// Trivia: the CPU "knows" an answer with a chance set by the question's difficulty and the CPU level; otherwise it guesses.
// choices = [{index}] as shown; returns the position in choices to click.
function cpuTriviaPick(s,q,choices,rand=Math.random){const base={easy:.86,medium:.72,hard:.55,impossible:.36}[q?.difficulty]??.66,p=Math.min(.97,Math.max(.05,base*(.5+.65*cpuSkill(s))));
 const right=choices.findIndex(c=>c.index===q.correct);if(right>=0&&rand()<p)return right;const wrong=choices.map((c,i)=>i).filter(i=>i!==right);return wrong.length?pickRandom(wrong,rand):right;}
// A human-like pause before the CPU answers (seconds): quicker on Hard and on easy questions.
const cpuThinkTime=(s,q)=>(1.4+(1-cpuSkill(s))*2.2+({hard:1,impossible:1.6}[q?.difficulty]||0))*(.75+Math.random()*.5);
// The CPU's trivia turn, made visible: "is thinking…", then its pick lights up for a beat before it counts.
// hidden: modes where answers stay private until both players commit (wager, survival) only say it locked in.
function cpuTriviaTurn(s,{q,choices,buttons,feedback,live,pick,hidden=false}){
 const name=s.players?.[1]?.name||'CPU';buttons.forEach(b=>b.disabled=true);s.body?.querySelector('.trivia-answers')?.classList.add('cpu-turn');
 if(feedback){feedback.textContent=`🤖 ${name} is thinking…`;feedback.classList.add('cpu-thinking');}
 s.wait(cpuThinkTime(s,q)*1000).then(async ok=>{
  if(!ok||!live())return;const pos=cpuTriviaPick(s,q,choices);
  if(feedback){feedback.classList.remove('cpu-thinking');feedback.textContent=hidden?`🤖 ${name} locks in an answer.`:`🤖 ${name} picks “${choices[pos]?.text??''}”…`;}
  if(!hidden)buttons[pos]?.classList.add('cpu-pick');
  if(!await s.wait(hidden?600:1200)||!live())return;pick(pos);
 });
}
Object.assign(exports,{isCpu,isOnline,remoteSeat,cpuHotseat,cpuDepth,cpuBlunder,negamax,pickRandom,cpuSkill,cpuTriviaPick,cpuThinkTime,cpuTriviaTurn});
