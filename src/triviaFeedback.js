// Short, non-blocking trivia-only cues. The sound toggle controls all cues.
const {store}=require("src/state.js");
const {tone,vibrate}=require("src/audio.js");
function triviaCue(outcome){
 if(!store.profile?.settings.sound)return;
 // One sequenced, non-overlapping buzzer then celebration after both private answers are revealed.
 const notes=outcome==='mixed'?[[180,.10,.026,'sawtooth',0],[125,.10,.023,'sawtooth',115],[659,.08,.031,'sine',245],[831,.08,.033,'sine',330],[1047,.12,.035,'triangle',415]]:
  outcome==='correct'?[[659,.09,.033,'sine',0],[831,.09,.035,'sine',75],[1047,.14,.038,'triangle',155]]:
  outcome==='wrong'?[[180,.19,.045,'sawtooth',0],[125,.17,.037,'sawtooth',95]]:
  [[330,.1,.018,'sine',0],[245,.13,.016,'sine',120]];
 for(const [hz,seconds,volume,wave,delay]of notes)setTimeout(()=>{if(store.profile?.settings.sound)tone(hz,seconds,volume,wave);},delay);
 if(outcome==='correct')vibrate(25);else if(outcome==='wrong'||outcome==='mixed')vibrate(65);
}
function triviaMark(el,outcome){
 el.classList.add(outcome==='correct'?'trivia-celebrate':outcome==='wrong'?'trivia-incorrect':'trivia-timeout');
 if(outcome==='correct'&&!store.profile?.settings.reducedMotion)el.classList.add('trivia-burst');
 triviaCue(outcome);
}
Object.assign(exports,{triviaCue,triviaMark});
