const {shuffle,escapeHTML}=require("src/utils.js");
const {circle, COLORS}=require("src/engines/session.js");
const {sound}=require("src/audio.js");
const HANGMAN_WORDS = ['DJANGO UNCHAINED','KING SCHULTZ','BOUNTY HUNTER','CANDYLAND','THE BIG LEBOWSKI','HAPPY GILMORE','BLACK SABBATH','KITCHEN NIGHTMARES','BUNGEE GUM','CONES OF DUNSHIRE','GOLDEN BIRTHDAY CAKE OREOS','DING DONG DADDY FROM DUMAS','BUCKETHEADLAND','GREAT SCOTT','FLONKERTON','KITTEN MITTENS'];
function hangmanGuess(word, guessed, letter) {
 const value=letter.toUpperCase();
 if(!/^[A-Z]$/.test(value)||guessed.includes(value))return null;
 const hits=[...word].filter(c=>c===value).length;
 const letters=[...guessed,value];
 return {letters,hits,solved:[...word].every(c=>!/^[A-Z]$/.test(c)||letters.includes(c))};
}

function normalizeHangmanAnswer(value){return String(value).toUpperCase().replace(/[^A-Z0-9]/g,'');}
async function hangman(s) {
 const [c,x,W,H]=s.canvas(680,320),word=shuffle(HANGMAN_WORDS,s.random)[0],score=[0,0];
 let actor=0,guessed=[],mistakes=[0,0],clock=12,phase='guess',message='';
 s.shared=true;s.updateScores();
 function nextTurn(){if(mistakes.every(n=>n>=6)){message=`The bounty was ${word}.`;phase='reveal';clock=2;}else{actor=mistakes[1-actor]<6?1-actor:actor;phase='guess';clock=12;}s.active=actor;s.updateScores();}
 function solved(){score[actor]+=5;message=`${word} · ${s.players[actor].name} earns 5 rescue points!`;phase='reveal';clock=2;s.react?.(actor,'win');sound('win');}
 function choose(letter){
  if(!s.alive||s.paused||phase!=='guess'||mistakes[actor]>=6)return;
  const result=hangmanGuess(word,guessed,letter);if(!result)return;guessed=result.letters;
  if(result.hits){score[actor]+=result.hits*2;s.react?.(actor,'happy');sound('win');message=`${s.players[actor].name}: ${result.hits} × ${letter}!`;}
  else{mistakes[actor]++;score[actor]=Math.max(0,score[actor]-1);s.react?.(actor,'sad');sound('lose');message=`${letter} missed. ${6-mistakes[actor]} chances left.`;}
  if(result.solved)solved();else nextTurn();s.setScores(score);buttons();
 }
 function beginSolve(){if(!s.alive||s.paused||phase!=='guess')return;phase='solve';buttons();document.getElementById('hang-answer')?.focus();}
 function submitSolve(answer){if(!s.alive||s.paused||phase!=='solve'||!normalizeHangmanAnswer(answer))return;
  if(normalizeHangmanAnswer(answer)===normalizeHangmanAnswer(word))solved();else{mistakes[actor]++;score[actor]=Math.max(0,score[actor]-1);message='That solve missed: one chance and one point lost.';s.react?.(actor,'sad');sound('lose');nextTurn();}
  document.getElementById('hang-answer')?.blur?.();s.setScores(score);buttons();
 }
 function cancelSolve(){if(!s.alive||s.paused||phase!=='solve')return;phase='guess';document.getElementById('hang-answer')?.blur?.();buttons();}
 function buttons(){
  s.controls(phase==='reveal'?[]:phase==='solve'?[]:[...[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(letter=>({text:letter,id:`hang-${letter}`,click:()=>choose(letter)})),{text:'SOLVE · +5',id:'hang-solve',click:beginSolve}],'letter-controls');
  for(const b of document.querySelectorAll('.letter-controls button'))b.disabled=guessed.includes(b.textContent);
  if(phase==='solve'){const form=document.createElement('form');form.className='hangman-solve-panel';form.innerHTML=`<label for="hang-answer">${escapeHTML(s.players[actor].name)} · timer paused · correct solve +5</label><input id="hang-answer" maxlength="80" autocomplete="off" autocapitalize="characters" placeholder="Write the full answer"><button type="submit" class="primary">Submit solve</button><button type="button" id="hang-cancel">Keep guessing</button>`;document.getElementById('game-controls').appendChild(form);s.on(form,'submit',ev=>{ev.preventDefault();submitSolve(document.getElementById('hang-answer').value);});s.on(document.getElementById('hang-cancel'),'click',cancelSolve);s.queueCanvasFit?.();}
 }
 s.on(document,'keydown',ev=>{if(phase==='solve'||ev.target?.matches?.('input,textarea,[contenteditable]'))return;if(/^[a-z]$/i.test(ev.key)&&!ev.repeat){ev.preventDefault();choose(ev.key.toUpperCase());}});
 s.hint('One shared bounty. Alternate letters: +2 per occurrence. SOLVE pauses the clock while you write the full answer; a correct solve earns 5 points and ends the game. A miss costs 1 point and one chance.');
 s.frame(dt=>{
  if(phase!=='solve')clock-=dt;
  if(clock<=0){if(phase==='reveal'){s.finish(score,'Django’s word duel · one shared bounty.');return;}mistakes[actor]++;message=`${s.players[actor].name} took too long.`;nextTurn();buttons();}
  x.fillStyle='#e3c38b';x.fillRect(0,0,W,H);x.fillStyle='#ba895c';x.fillRect(0,H-24,W,24);circle(x,W/2,58,31,'#eddaae');
  for(let i=0;i<2;i++){
   const cx=i?W-106:106,n=mistakes[i];x.strokeStyle='#61432c';x.lineWidth=6;x.beginPath();x.moveTo(cx-60,H-30);x.lineTo(cx-60,38);x.lineTo(cx+10,38);x.lineTo(cx+10,70);x.stroke();
   if(n){x.strokeStyle=COLORS[i];x.lineWidth=5;const lines=[[cx+10,113,cx+10,174],[cx+10,133,cx-15,150],[cx+10,133,cx+35,150],[cx+10,174,cx-12,209],[cx+10,174,cx+32,209]];
    for(let j=0;j<n-1;j++){x.beginPath();x.moveTo(lines[j][0],lines[j][1]);x.lineTo(lines[j][2],lines[j][3]);x.stroke();}
    // Paint the head last so the stick body stays behind the portrait.
    s.sprite(x,i,cx+10,91,105,{exact:true,mood:n>=6?'sad':phase==='reveal'?'win':'thinking'});
   }else s.sprite(x,i,cx+10,178,118,{exact:true,mood:'happy'});
   x.fillStyle='#503720';x.textAlign='center';x.font='bold 13px Arial';x.fillText(s.players[i].name,cx,H-10);x.fillText(`${n}/6 misses`,cx,246);
  }
  x.textAlign='center';x.fillStyle='#513620';x.font='bold 20px Georgia';x.fillText('DJANGO · THE BOUNTY BOARD',W/2,31);
  let yy=98;for(const part of word.split(' ')){x.font=`bold ${part.length>12?17:22}px monospace`;x.fillText([...part].map(l=>phase==='reveal'||guessed.includes(l)?l:'_').join(' '),W/2,yy);yy+=30;}
  s.status(`One bounty · ${phase==='guess'?s.players[actor].name+' · '+Math.ceil(clock)+'s':phase==='solve'?s.players[actor].name+' · SOLVE · timer paused · +5 points':message}`);
  s.debug={round:0,actor,word,guessed,mistakes,phase,clock,choose,beginSolve,submitSolve,cancelSolve,score};
 });
 buttons();await s.pass(0,'Two cowboys, one word. Choose letters in turn or pause the clock to solve the full bounty for 5 points.');
}

Object.assign(exports,{HANGMAN_WORDS,hangmanGuess,normalizeHangmanAnswer,hangman});