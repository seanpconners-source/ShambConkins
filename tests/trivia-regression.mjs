// Run: node tests/trivia-regression.mjs (from repository root).
// Loads actual authored facts and trivia engines with a tiny session/DOM shim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
let active=null;
class El {
 constructor(){this.dataset={};this.children=[];this.textContent='';this.innerHTML='';this.style={};this.classList={values:new Set(),add:(...v)=>v.forEach(x=>this.classList.values.add(x))};}
 appendChild(v){this.children.push(v);}
}
const document={getElementById:id=>active?.nodes.get(id),createElement:()=>new El()};
const store={profile:{recentTrivia:[],triviaDifficultyBag:[],settings:{sound:false,reducedMotion:true}},run:{triviaSeen:[]}};
const tones=[],vibrations=[],cueDelays=[];
const modules={
 'src/state.js':{store},'src/profile.js':{saveProfile:()=>{}},
 'src/utils.js':{shuffle:a=>a.slice(),escapeHTML:String,pick:a=>a[0]},
 'src/assets.js':{brandHTML:()=>''},
 'src/audio.js':{tone:(...a)=>tones.push(a),vibrate:n=>{if(!store.profile.settings.reducedMotion)vibrations.push(n);}},
 'src/data/expandedTriviaV42.js':{EXPANDED_TRIVIA_THEMES_V42:[]},
 'src/data/partyTrivia.js':{PARTY_TRIVIA_THEMES:[]},
 'src/data/legendsTrivia.js':{LEGENDS_TRIVIA_THEMES:[]},
 'src/data/warpTrivia.js':{WARP_TRIVIA_THEMES:[]}
};
function load(path){
 const output={};
 const fn=vm.runInNewContext('(function(require,exports){'+readFileSync(path,'utf8')+'\n})',{document,setTimeout:(fn,ms=0)=>{cueDelays.push(ms);fn();}},{filename:path});
 fn(k=>{assert.ok(k in modules,'Unknown dependency '+k);return modules[k];},output);return output;
}
const authored=load('src/data/trivia3.js');modules['src/data/trivia3.js']=authored;
modules['src/triviaCatalog.js']={TRIVIA_QUESTIONS:authored.TRIVIA3.map((q,i)=>({...q,id:'t'+i})),triviaExplanationHTML:()=>'<p>fact</p>'};
modules['src/triviaFeedback.js']=load('src/triviaFeedback.js');
// Solo/vs-CPU hooks: these sessions have no s.solo, so isCpu() is false and the CPU paths stay idle.
modules['src/solo.js']={cpuSkill:()=>.5};
modules['src/engines/cpuKit.js']=load('src/engines/cpuKit.js');
modules['src/engines/triviaModes.js']=load('src/engines/triviaModes.js');
const engine=load('src/engines/trivia.js');
async function settle(){await Promise.resolve();await Promise.resolve();}
function make(game,practice=true){
 const t={nodes:new Map(),buttons:[],html:''};
 const body={
  get innerHTML(){return t.html;},
  set innerHTML(v){t.html=v;t.nodes.clear();t.buttons=[];
   for(const [,id]of v.matchAll(/id="([^"]+)"/g))t.nodes.set(id,new El());
   for(const [,kind,num]of v.matchAll(/data-(answer|wager)="(\d+)"/g)){const e=new El();e.dataset[kind]=num;t.buttons.push(e);}
  },
  querySelectorAll:selector=>t.buttons.filter(b=>selector==='[data-answer]'?b.dataset.answer!==undefined:b.dataset.wager!==undefined)
 };
 const s={body,game:{title:'Test Trivia',...game},players:[{name:'Sean'},{name:'Amber'}],random:()=>.5,practice,alive:true,paused:false,
  cleanup:()=>{},pass:async()=>true,on:(b,ev,fn)=>b.click=fn,updateScores:()=>{},react:()=>{},
  setScores:score=>s.score=[...score],timer:(sec,tick,end)=>{s.seconds=sec;s.timeout=end;return()=>{};},
  finish:(score,message)=>s.finished={score:[...score],message}};
 t.s=s;t.start=async()=>{active=t;await engine.trivia(s);};
 t.answer=i=>{active=t;const b=body.querySelectorAll('[data-answer]')[i];assert.ok(b,'Missing answer '+i);b.click();};
 t.wager=i=>{active=t;const b=body.querySelectorAll('[data-wager]')[i];assert.ok(b,'Missing wager '+i);b.click();};
 t.next=()=>{active=t;const node=t.nodes.get('trivia-next')||t.nodes.get('mode-next');assert.ok(node?.children.length);node.children.at(-1).click();};
 t.feedback=()=>t.nodes.get('trivia-feedback')?.textContent||'';return t;
}
for(const [tag,source,count] of [['farley','Chris Farley',15],['eastwood','Clint Eastwood',17]]){
 assert.equal(engine.triviaPool(tag).length,count);
 assert.equal(engine.chooseTriviaDifficulty(tag,()=>.5),'varied');
 const bag=[];assert.equal(engine.drawTriviaDifficulty({triviaDifficultyBag:bag},tag,()=>.5),'varied');assert.equal(bag.length,0);
 for(let attempt=0;attempt<2;attempt++){
  const t=make({triviaTag:tag},false);await t.start();assert.equal(t.s.debug.phase,'lead');assert.equal(t.s.debug.difficulty,'varied');
  assert.equal(t.s.seconds,engine.triviaSeconds(t.s.debug.question.difficulty));
  const q=t.s.debug.question;assert.equal(q.source,source);t.answer(t.s.debug.answers.findIndex(a=>a.index!==q.correct));
  assert.equal(t.s.debug.phase,'pass-steal');assert.match(t.feedback(),/this does not represent me/);
  assert.equal(t.nodes.get('trivia-fact').innerHTML,'','Do not reveal before steal');
  t.next();await settle();assert.equal(t.s.debug.phase,'steal');assert.equal(t.s.debug.question.id,q.id);
  assert.equal(t.s.debug.answers.length,3);t.answer(t.s.debug.answers.findIndex(a=>a.index===q.correct));
  assert.equal(t.s.debug.phase,'resolved');assert.equal(t.s.score[1],engine.triviaAward(q.difficulty,true));
  assert.match(t.nodes.get('trivia-fact').innerHTML,/fact/);t.next();await settle();assert.equal(t.s.debug.phase,'lead');
  assert.ok(store.profile.recentTrivia.length>0,'Question-history writes continue');
 }
 const timed=make({triviaTag:tag});await timed.start();timed.s.timeout();
 assert.match(timed.feedback(),/Time’s up!/);assert.doesNotMatch(timed.feedback(),/this does not represent me/);
 timed.next();await settle();assert.equal(timed.s.debug.phase,'steal');timed.s.timeout();assert.match(timed.feedback(),/Time’s up on the steal/);
 const win=make({triviaTag:tag});await win.start();win.answer(win.s.debug.answers.findIndex(a=>a.index===win.s.debug.question.correct));
 assert.match(win.feedback(),/CORRECT/);assert.equal(win.nodes.get('trivia-feedback').classList.values.has('trivia-burst'),false);
 const light=make({triviaTag:tag,triviaMode:'lightning'});await light.start();
 const per=Math.floor(count/2);assert.equal(light.s.debug.rounds.length,per*2);
 assert.equal(new Set(light.s.debug.rounds.map(q=>q.id)).size,per*2);
 for(let player=0;player<2;player++)for(let i=0;i<per;i++){
  assert.equal(light.s.debug.phase,'answer');assert.equal(light.s.debug.player,player);
  assert.equal(light.s.debug.question.source,source);
  light.answer(light.s.debug.answers.findIndex(a=>a.index===light.s.debug.question.correct));
  assert.match(light.html,/CORRECT!/);light.next();await settle();
 }
 assert.ok(light.s.finished,'Lightnings must finish even when topic has fewer than 24 questions');
}
for(const mode of ['wager','survival']){
 const t=make({triviaTag:'farley',triviaMode:mode});await t.start();
 if(mode==='wager')t.wager(0);
 const q=t.s.debug.question;t.answer(t.s.debug.answers.findIndex(a=>a.index!==q.correct));
 assert.doesNotMatch(t.html,/this does not represent me|<p>fact<\/p>/,'Answer stays sealed until player 2');
 t.next();await settle();if(mode==='wager')t.wager(0);
 assert.equal(t.s.debug.question.id,q.id);
 t.answer(t.s.debug.answers.findIndex(a=>a.index===q.correct));
 assert.match(t.html,/this does not represent me/);assert.match(t.html,/CORRECT!/);
 assert.deepEqual(t.s.score,mode==='wager'?[9,11]:[0,engine.triviaPoints(q.difficulty)]);
}
// Verify actual wager/survival scoring and both audible outcomes, after both answers lock.
function expectSound(frequencies,onsets){
 assert.deepEqual(tones.map(n=>n[0]),frequencies);
 assert.deepEqual(cueDelays,onsets);
 for(let i=1;i<tones.length;i++)assert.ok(cueDelays[i]>=cueDelays[i-1]+tones[i-1][1]*1000-0.01,'No overlapping notes in mixed cue');
}
store.profile.settings.sound=true;
for(const mode of ['wager','survival'])for(const wrongFirst of [true,false]){
 tones.length=0;cueDelays.length=0;vibrations.length=0;
 const t=make({triviaTag:'farley',triviaMode:mode});await t.start();
 if(mode==='wager')t.wager(0);
 const q=t.s.debug.question;
 t.answer(t.s.debug.answers.findIndex(a=>wrongFirst?a.index!==q.correct:a.index===q.correct));
 assert.equal(t.s.debug.phase,'locked');
 assert.deepEqual(tones,[],'No sound while the second player has not committed');
 assert.doesNotMatch(t.html,/this does not represent me|<p>fact<\/p>|CORRECT!/,'No early answer reveal');
 t.next();await settle();if(mode==='wager')t.wager(0);
 assert.equal(t.s.debug.question.id,q.id);
 t.answer(t.s.debug.answers.findIndex(a=>wrongFirst?a.index===q.correct:a.index!==q.correct));
 assert.match(t.html,/this does not represent me/);assert.match(t.html,/CORRECT!/);
 expectSound([180,125,659,831,1047],[0,115,245,330,415]);
 assert.equal(vibrations.length,0,'Reduced motion suppresses mixed feedback haptics');
 const winner=wrongFirst?1:0;
 assert.deepEqual(t.s.score,mode==='wager'?(winner?[9,11]:[11,9]):(winner?[0,engine.triviaPoints(q.difficulty)]:[engine.triviaPoints(q.difficulty),0]));
}
// Submitted wrong answers get the buzzer. Timeouts do not.
for(const [first,second,expected]of [
 ['correct','timeout',[659,831,1047]],
 ['wrong','wrong',[180,125]],
 ['timeout','timeout',[330,245]]
]){
 tones.length=0;cueDelays.length=0;
 const t=make({triviaTag:'farley',triviaMode:'survival'});await t.start();
 for(const [index,outcome]of [first,second].entries()){
  if(outcome==='timeout')t.s.timeout();
  else t.answer(t.s.debug.answers.findIndex(a=>outcome==='correct'?a.index===t.s.debug.question.correct:a.index!==t.s.debug.question.correct));
  if(!index){assert.equal(tones.length,0,'First locked answer remains secret');t.next();await settle();}
 }
 assert.deepEqual(tones.map(n=>n[0]),expected);
 assert.equal(t.html.includes('this does not represent me'),first==='wrong'||second==='wrong');
}
store.profile.settings.reducedMotion=false;
tones.length=0;cueDelays.length=0;vibrations.length=0;
modules['src/triviaFeedback.js'].triviaCue('mixed');
expectSound([180,125,659,831,1047],[0,115,245,330,415]);
assert.deepEqual(vibrations,[65],'Only one mixed-result haptic');
store.profile.settings.reducedMotion=true;store.profile.settings.sound=false;
tones.length=0;cueDelays.length=0;vibrations.length=0;
modules['src/triviaFeedback.js'].triviaCue('mixed');
assert.equal(tones.length,0,'Muted mixed cue');
assert.equal(vibrations.length,0,'Muted mixed haptic');
store.profile.settings.sound=false;modules['src/triviaFeedback.js'].triviaCue('wrong');assert.equal(tones.length,0);
store.profile.settings.sound=true;modules['src/triviaFeedback.js'].triviaCue('wrong');
assert.deepEqual(tones.map(a=>a[0]),[180,125]);assert.equal(vibrations.length,0);
tones.length=0;modules['src/triviaFeedback.js'].triviaCue('correct');
assert.deepEqual(tones.map(a=>a[0]),[659,831,1047]);
console.log('Trivia regression: both crash topics, repeats, steals, timeouts, lightning, wager, survival and settings PASS');
