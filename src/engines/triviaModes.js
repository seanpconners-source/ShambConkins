const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const {shuffle, escapeHTML}=require("src/utils.js");
const {brandHTML}=require("src/assets.js");
const {triviaExplanationHTML}=require("src/triviaCatalog.js");
const {triviaCue}=require("src/triviaFeedback.js");
async function playTriviaMode(s,{difficulty,rounds,seconds,points,introHTML}){
 const mode=s.game.triviaMode,lightning=mode==='lightning',survival=mode==='survival',lightningPerPlayer=lightning?rounds.length/2:0,score=survival?[0,0]:mode==='wager'?[10,10]:[0,0],lives=[3,3],answersByPlayer=[null,null],bets=[1,1],streak=[0,0],time=[60,60];
 let round=0,player=0,q=null,choices=[],phase='handoff',stop=null,token=0,first=0;
 const clear=()=>{token++;stop?.();stop=null;};s.cleanup(clear);s.setScores(score);
 const remember=question=>{if(s.practice)return;store.profile.recentTrivia=[...(store.profile.recentTrivia||[]).filter(id=>id!==question.id),question.id].slice(-3000);if(store.run)store.run.triviaSeen=[...(store.run.triviaSeen||[]).filter(id=>id!==question.id),question.id].slice(-3000);saveProfile(store.profile);};
 function debug(left=null){s.debug={mode,difficulty,round,player,question:q,answers:choices,phase,score,lives,bets,time,left,rounds};}
 function action(text,fn){const button=document.createElement('button');button.textContent=text;button.className='primary';document.getElementById('mode-next').appendChild(button);let used=false;s.on(button,'click',()=>{if(!used&&!s.paused&&s.alive){used=true;void fn();}});}
 const value=()=>typeof points==='function'?points(q.difficulty):points;
 const duration=()=>typeof seconds==='function'?seconds(q.difficulty):seconds;
 const motion=()=>store.profile?.settings.reducedMotion?'':' trivia-burst';
 function frameHTML(extra=''){
  return `<div class="trivia-meta"><b>${escapeHTML(s.game.title)}</b><span>${(difficulty==='varied'?q?.difficulty||'varied':difficulty).toUpperCase()} · ${lightning?'QUESTION '+(round+1)+'/'+lightningPerPlayer:'ROUND '+(round+1)+'/'+rounds.length}</span></div><div class="trivia-mode-hud">${s.players.map((p,i)=>`<span class="${i===player?'active':''}"><b>${escapeHTML(p.name)}</b> ${survival?'♥'.repeat(lives[i])+' · '+score[i]+' correct points':mode==='wager'?score[i]+' CHIPS':score[i]+' POINTS · '+Math.ceil(time[i])+'s'}</span>`).join('')}</div>${extra}<div id="mode-feedback" class="trivia-feedback"></div><div id="mode-next" class="game-controls"></div>`;
 }
 function questionView(){
  clear();phase='answer';s.active=player;s.updateScores();remember(q);choices=shuffle(q.answers.map((text,index)=>({text,index})),s.random);
  const allowance=lightning?Math.min(12,time[player]):duration();
  s.body.innerHTML=frameHTML(`<div class="trivia-clock" role="timer"><span id="trivia-clock-number">${Math.ceil(allowance)}</span><small>${lightning?'ANSWER SECONDS · STREAK '+streak[player]:survival?'ONE MISS COSTS A LIFE':'WAGER '+bets[player]+' CHIPS'}</small><div class="trivia-clock-track"><i id="trivia-clock-bar"></i></div></div><div class="trivia-logo">${brandHTML(q.source)}</div><div class="trivia-question">${escapeHTML(q.q)}</div><div class="trivia-answers">${choices.map((a,i)=>`<button data-answer="${i}">${escapeHTML(a.text)}</button>`).join('')}</div>`);debug(allowance);
  s.body.querySelectorAll('[data-answer]').forEach(b=>s.on(b,'click',()=>answer(+b.dataset.answer)));
  let previous=allowance;const guard=token;stop=s.timer(allowance,left=>{if(guard!==token||phase!=='answer')return;if(lightning)time[player]=Math.max(0,time[player]-(previous-left));previous=left;s.debug.left=left;const number=document.getElementById('trivia-clock-number'),bar=document.getElementById('trivia-clock-bar');if(number)number.textContent=String(Math.ceil(left));if(bar)bar.style.width=(left/allowance*100)+'%';},()=>{if(guard===token)answer(null);});
 }
 function finish(){clear();phase='finished';const result=survival?score.map((v,i)=>lives[i]*100+v):score;s.finish(result,survival?`Lives ${lives[0]}–${lives[1]}; correct points ${score[0]}–${score[1]}.`:mode==='wager'?`Quiz bankrolls ${score[0]}–${score[1]}.`:`Lightning points ${score[0]}–${score[1]}.`);}
 async function beginPlayer(intro=false){
  clear();phase='handoff';s.body.innerHTML=frameHTML();debug();const description=lightning?`${s.players[player].name}: sixty seconds of answer time. Twelve questions maximum. Feedback pauses the clock. ${difficulty.toUpperCase()} questions.`:survival?'Private answer: three misses ends your run. Both players get the same question.':'Choose your wager BEFORE seeing the question. Both players answer privately before the result is revealed.';
  if(!await s.pass(player,description,'Ready — my turn',{countdown:lightning?3:0,introHTML:intro?introHTML:''}))return;
  if(mode==='wager')wagerView();else questionView();
 }
 function wagerView(){
  phase='wager';s.active=player;s.updateScores();s.body.innerHTML=frameHTML(`<div class="trivia-question">${escapeHTML(s.players[player].name)}, choose your wager.</div><p class="trivia-feedback">Question hidden · ${score[player]} chips available · ${duration()} seconds once it appears</p><div class="trivia-wagers">${[1,2,3].map(n=>`<button data-wager="${n}" ${n>score[player]?'disabled':''}>${n} CHIP${n>1?'S':''}</button>`).join('')}</div>`);debug();
  s.body.querySelectorAll('[data-wager]').forEach(b=>s.on(b,'click',()=>{const n=+b.dataset.wager;if(s.paused||phase!=='wager'||n>score[player])return;bets[player]=n;questionView();}));
 }
 function answer(index){
  if(s.paused||!s.alive||phase!=='answer')return;const selected=index===null?null:choices[index];if(index!==null&&!selected)return;clear();phase='locked';answersByPlayer[player]=selected?.index??null;  if(lightning){const correct=selected?.index===q.correct;if(correct){streak[player]++;score[player]+=value()+Math.min(3,streak[player]-1);s.react?.(player,'win');triviaCue('correct');}else{streak[player]=0;s.react?.(player,'sad');triviaCue(selected?'wrong':'timeout');}s.setScores(score);
   phase='feedback';const message=correct?'✨ CORRECT! ✨':selected?'BUZZ! MISSED — this does not represent me':'TIME’S UP';
   s.body.innerHTML=frameHTML(`<div class="trivia-question trivia-result ${correct?'trivia-celebrate'+motion():'trivia-incorrect'}">${message} · ${escapeHTML(q.answers[q.correct])}</div>${triviaExplanationHTML(q)}`);debug();
   const ended=time[player]<=.05||round+1>=lightningPerPlayer;
   action(ended?(player===0?'Pass to player 2':'See the result'):'Next lightning question',async()=>{round++;if(ended){if(player===1)return finish();player=1;round=0;q=rounds[lightningPerPlayer];await beginPlayer();}else{q=rounds[player*lightningPerPlayer+round];questionView();}});return;
  }
  // Wagers, selected answers and correctness remain hidden until BOTH commit.
  s.body.innerHTML=frameHTML(`<div class="trivia-question">Answer locked.</div><p class="trivia-feedback">The answer stays hidden until both players finish.</p>`);debug();
  if(player===first){action('Pass to '+s.players[1-first].name,async()=>{player=1-first;await beginPlayer();});return;}
  for(let i=0;i<2;i++){const correct=answersByPlayer[i]===q.correct;if(survival){if(correct)score[i]+=value();else lives[i]--;}else score[i]=Math.max(0,score[i]+(correct?bets[i]:-bets[i]));s.react?.(i,correct?'win':'sad');}
  s.setScores(score);phase='feedback';const somebodyRight=answersByPlayer.some(a=>a===q.correct),somebodyWrong=answersByPlayer.some(a=>a!==null&&a!==q.correct);triviaCue(somebodyRight?'correct':somebodyWrong?'wrong':'timeout');s.body.innerHTML=frameHTML(`<div class="trivia-question trivia-result ${somebodyRight?'trivia-celebrate'+motion():'trivia-incorrect'}">${somebodyRight?'✨ CORRECT! ✨ · ':''}${escapeHTML(q.answers[q.correct])}</div><p class="trivia-feedback">${s.players.map((p,i)=>escapeHTML(p.name)+': '+(answersByPlayer[i]===q.correct?'correct!':answersByPlayer[i]===null?'time’s up':'BUZZ! this does not represent me')+(mode==='wager'?' · '+(answersByPlayer[i]===q.correct?'+':'−')+bets[i]+' chips':'')).join(' · ')}</p>${triviaExplanationHTML(q)}`);debug();
  const over=round>=rounds.length-1||(survival?lives.some(v=>v===0):score.some(v=>v===0));action(over?'See the result':'Next shared question',async()=>{if(over)return finish();round++;first=round%2;player=first;q=rounds[round];answersByPlayer.fill(null);await beginPlayer();});
 }
 q=rounds[0];await beginPlayer(true);
}

Object.assign(exports,{playTriviaMode});