const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const {shuffle, escapeHTML, pick}=require("src/utils.js");
const {brandHTML}=require("src/assets.js");
const {triviaMark}=require("src/triviaFeedback.js");
const {TRIVIA_QUESTIONS, triviaExplanationHTML}=require("src/triviaCatalog.js");
const {EXPANDED_TRIVIA_THEMES_V42}=require("src/data/expandedTriviaV42.js");
const {PARTY_TRIVIA_THEMES}=require("src/data/partyTrivia.js");
const {LEGENDS_TRIVIA_THEMES}=require("src/data/legendsTrivia.js");
const {TRIVIA3_THEMES}=require("src/data/trivia3.js");
const {WARP_TRIVIA_THEMES}=require("src/data/warpTrivia.js");
const {playTriviaMode}=require("src/engines/triviaModes.js");
const TRIVIA=TRIVIA_QUESTIONS;
const TRIVIA_LEVELS=['easy','medium','hard','impossible'];
const triviaPoints=d=>d==='impossible'?4:d==='hard'?3:d==='medium'?2:1;
const triviaSeconds=d=>({easy:18,medium:22,hard:26,impossible:30}[d]||22);
const sourceKey=s=>String(s).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const topicSources=new Map([...PARTY_TRIVIA_THEMES,...EXPANDED_TRIVIA_THEMES_V42,...LEGENDS_TRIVIA_THEMES,...TRIVIA3_THEMES,...WARP_TRIVIA_THEMES].map(t=>[t.tag,new Set(t.sources.map(sourceKey))]));
function triviaPool(tag='mixed',difficulty=null) {
 const sources=topicSources.get(tag);
 return TRIVIA.filter(q=>(sources?sources.has(sourceKey(q.source)):tag==='dbz'?q.source==='Dragon Ball Z':tag==='hxh'?q.source==='Hunter × Hunter':
  tag==='nick'?q.category==='nick':tag==='sitcom'?q.category==='comedy':tag==='hard'?q.category!=='lore':
  tag==='animation'?['nick','animation'].includes(q.category):tag==='mixed'?q.category!=='lore':q.category===tag)&&(!difficulty||q.difficulty===difficulty));
}
function selectTrivia(tag='mixed',recent=[],sessionSeen=[],random=Math.random,count=8,difficulty=null) {
 const pool=triviaPool(tag,difficulty);if(pool.length<count)throw new Error(`Trivia pool ${tag} ${difficulty||''} needs at least ${count} questions`);
 const recentSet=new Set(recent),seen=new Set(sessionSeen),uses=new Map(),out=[];
 const priority=q=>seen.has(q.id)?recentSet.has(q.id)?3:2:recentSet.has(q.id)?1:0;
 const remaining=shuffle(pool,random);
 while(out.length<count) {
  const fresh=Math.min(...remaining.map(priority)),candidates=remaining.filter(q=>priority(q)===fresh);
  const least=Math.min(...candidates.map(q=>uses.get(sourceKey(q.source))||0));
  const worlds=candidates.filter(q=>(uses.get(sourceKey(q.source))||0)===least),level=TRIVIA_LEVELS[out.length%4];
  const question=worlds.find(q=>q.difficulty===level)||worlds[0];
  out.push(question);uses.set(sourceKey(question.source),(uses.get(sourceKey(question.source))||0)+1);remaining.splice(remaining.indexOf(question),1);
 }
 return shuffle(out,random);
}
function triviaAward(difficulty,steal=false){return Math.max(1,triviaPoints(difficulty)-(steal?1:0));}
function chooseTriviaDifficulty(tag,random=Math.random){const count=tag==='lore'?6:8,levels=TRIVIA_LEVELS.filter(d=>triviaPool(tag,d).length>=count);return levels.length?pick(levels,random):'varied';}
// One of each level per shuffled four-quiz bag, independent of topic and of the
// number of questions at that level. Saved bags survive restarting the game.
function drawTriviaDifficulty(state,tag,random=Math.random){
 const count=tag==='lore'?6:8,levels=TRIVIA_LEVELS.filter(d=>triviaPool(tag,d).length>=count);
 if(!levels.length)return 'varied';// Small authored topics use their own mixed-difficulty set, leaving the level bag unchanged.
 let bag=[...new Set((state.triviaDifficultyBag||[]).filter(d=>levels.includes(d)))];
 if(!bag.length)bag=shuffle(levels,random);
 const difficulty=bag.pop();state.triviaDifficultyBag=bag;return difficulty;
}
function difficultyDrawHTML(difficulty){
 if(difficulty==='varied')return '<aside class="difficulty-draw" data-difficulty="varied"><strong>VARIED DIFFICULTY · POINTS AND TIME FOLLOW EACH QUESTION</strong></aside>';
 const reel=[...TRIVIA_LEVELS,...TRIVIA_LEVELS,difficulty];
 return `<aside class="difficulty-draw" data-difficulty="${difficulty}" aria-label="Trivia difficulty drawn: ${escapeHTML(difficulty)}"><span>DIFFICULTY DRAW · ONE OF EACH LEVEL EVERY FOUR QUIZZES</span><div class="difficulty-reel" aria-hidden="true"><div class="difficulty-track" style="--difficulty-stop:-${(reel.length-1)*24}px">${reel.map(d=>`<b class="level-${d}">${d.toUpperCase()}</b>`).join('')}</div></div><strong class="difficulty-reveal level-${difficulty}">${difficulty.toUpperCase()} · ${triviaPoints(difficulty)} POINT${triviaPoints(difficulty)===1?'':'S'} · ${triviaSeconds(difficulty)}s</strong></aside>`;
}
async function trivia(s) {
 const tag=s.game.triviaTag||'mixed',mode=s.game.triviaMode;
 const drawn=TRIVIA_LEVELS.includes(s.game.triviaDifficulty)?s.game.triviaDifficulty:s.practice?chooseTriviaDifficulty(tag,s.random):drawTriviaDifficulty(store.profile,tag,s.random);
 const difficulty=TRIVIA_LEVELS.includes(drawn)?drawn:'varied',pool=triviaPool(tag,difficulty==='varied'?null:difficulty);
 // Limit a small authored topic to distinct, on-topic questions, split evenly for lightning.
 const count=mode==='lightning'?Math.min(24,Math.floor(pool.length/2)*2):Math.min(tag==='lore'?6:8,pool.length);
 if(count<(mode==='lightning'?2:1))throw new Error('No playable trivia questions for topic '+tag);
 const rounds=selectTrivia(tag,store.profile.recentTrivia||[],store.run?.triviaSeen||[],s.random,count,difficulty==='varied'?null:difficulty);
 if(mode)return playTriviaMode(s,{difficulty,rounds,seconds:triviaSeconds,points:triviaPoints,introHTML:difficultyDrawHTML(difficulty)});
 const score=[0,0];let round=0,lead=0,q,wrong=-1,locked=false,answers=[],stopClock=null,clockToken=0;
 const clearClock=()=>{clockToken++;stopClock?.();stopClock=null;};s.cleanup(clearClock);
 function questionView(player,steal) {
  clearClock();s.active=player;s.updateScores();
  answers=shuffle(q.answers.map((text,i)=>({text,index:i})).filter(a=>!steal||a.index!==wrong),s.random);
  const seconds=triviaSeconds(q.difficulty);
  s.body.innerHTML=`<div class="trivia-meta"><span>ROUND ${round+1} / ${rounds.length}</span><span class="difficulty-chip level-${difficulty}">${(difficulty==='varied'?q.difficulty:difficulty).toUpperCase()}${steal?' · STEAL':''} · ${triviaAward(q.difficulty,steal)} PT</span></div><div class="trivia-clock" role="timer" aria-label="Answer time remaining"><span id="trivia-clock-number">${seconds}</span><small>SECONDS TO ANSWER</small><div class="trivia-clock-track"><i id="trivia-clock-bar"></i></div></div><div class="trivia-logo">${brandHTML(q.source)}</div><div class="trivia-question">${escapeHTML(q.q)}</div><div class="trivia-answers">${answers.map((a,i)=>`<button data-answer="${i}">${escapeHTML(a.text)}</button>`).join('')}</div><div id="trivia-feedback" class="trivia-feedback">${escapeHTML(s.players[player].name)} ${steal?'gets the steal.':'answers first.'}</div><div id="trivia-fact"></div><div id="trivia-next" class="game-controls"></div>`;
  locked=false;s.debug={question:q,round,lead,difficulty,phase:steal?'steal':'lead',answers,left:seconds};
  s.body.querySelectorAll('[data-answer]').forEach(b=>s.on(b,'click',()=>void answer(+b.dataset.answer,player,steal,b)));
  const token=clockToken;stopClock=s.timer(seconds,left=>{if(token!==clockToken)return;s.debug.left=left;const number=document.getElementById('trivia-clock-number'),bar=document.getElementById('trivia-clock-bar');if(number)number.textContent=String(Math.ceil(left));if(bar)bar.style.width=(left/seconds*100)+'%';if(left<5)number?.parentElement?.classList.add('urgent');},()=>{if(token===clockToken&&!locked)void answer(null,player,steal,null);});
 }
 function nextButton(label,fn){const b=document.createElement('button');b.textContent=label;b.className='primary';document.getElementById('trivia-next').appendChild(b);let used=false;s.on(b,'click',()=>{if(used||s.paused||!s.alive)return;used=true;void fn();});}
 function resolved() {document.getElementById('trivia-fact').innerHTML=triviaExplanationHTML(q);s.debug.phase='resolved';nextButton(round===rounds.length-1?'See the result':'Next round',()=>{if(s.paused)return;round++;void startRound();});}
 async function answer(i,player,steal,button) {
  if(locked||s.paused||!s.alive)return;locked=true;clearClock();
  const choice=i===null?null:answers[i],correct=choice?.index===q.correct;button?.classList.add(correct?'correct':'wrong');
  s.body.querySelectorAll('[data-answer]').forEach(b=>b.disabled=true);const feedback=document.getElementById('trivia-feedback');
  if(correct) {const pts=triviaAward(q.difficulty,steal);score[player]+=pts;s.setScores(score);s.react?.(player,'win');triviaMark(feedback,'correct');feedback.textContent=`✨ ${steal?'STEAL!':'CORRECT!'} +${pts} points! ✨ ${q.answers[q.correct]}.`;resolved();}
  else if(!steal) {wrong=choice?.index??-1;s.react?.(player,'sad');triviaMark(feedback,choice?'wrong':'timeout');feedback.textContent=`${choice?'BUZZ! Wrong — this does not represent me.':'Time’s up!'} The answer stays hidden. ${s.players[1-lead].name} gets a steal.`;s.debug.phase='pass-steal';nextButton(`Pass to ${s.players[1-lead].name}`,async()=>{if(!await s.pass(1-lead,`Steal chance: ${difficulty.toUpperCase()} · ${triviaSeconds(q.difficulty)} seconds. Same question${wrong<0?'':', with the previous wrong answer removed'}.`))return;questionView(1-lead,true);});}
  else {s.react?.(player,'sad');triviaMark(feedback,choice?'wrong':'timeout');feedback.textContent=`${choice?'BUZZ! No steal — this does not represent me.':'Time’s up on the steal.'} Correct answer: ${q.answers[q.correct]}.`;s.body.querySelectorAll('[data-answer]').forEach((b,i)=>{if(answers[i].index===q.correct)b.classList.add('correct');});resolved();}
 }
 async function startRound() {
  clearClock();if(round>=rounds.length)return s.finish(score,`${difficulty.toUpperCase()} · ${rounds.length} timed shared rounds complete.`);
  lead=round%2;q=rounds[round];wrong=-1;
  if(!s.practice) {store.profile.recentTrivia=[...store.profile.recentTrivia.filter(id=>id!==q.id),q.id].slice(-TRIVIA.length);if(store.run)store.run.triviaSeen=[...(store.run.triviaSeen||[]).filter(id=>id!==q.id),q.id].slice(-TRIVIA.length);saveProfile(store.profile);}
  if(!await s.pass(lead,`${difficulty.toUpperCase()} · Round ${round+1} of ${rounds.length}. ${triviaSeconds(q.difficulty)} seconds per answer; a miss or timeout passes this question to ${s.players[1-lead].name}.`,'Ready — answer',{introHTML:round===0?difficultyDrawHTML(difficulty):''}))return;
  questionView(lead,false);
 }
 await startRound();
}

Object.assign(exports,{TRIVIA,TRIVIA_LEVELS,triviaPoints,triviaSeconds,triviaPool,selectTrivia,triviaAward,chooseTriviaDifficulty,drawTriviaDifficulty,difficultyDrawHTML,trivia});