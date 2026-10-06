// The Newlywed Game · Spirit Level. Player A privately answers about themselves, B privately predicts, the reveal shows the match.
const {QUESTIONS,CATEGORY_LABEL,MATCH_QUIPS,MISS_QUIPS,verdictFor,fill}=require("src/data/partyNewlywed.js");
const {PartyUI,sfx,head,pname,esc,burst,burstAt,banner,titleCard,shuffle,extraCSS}=require("src/engines/partyKit.js");

const CAT_ICON={food:'🍕',habit:'⏰',cringe:'😳',wyr:'🤔',movie:'🎬',likely:'🙋',sweet:'💗',spicy:'🌶️'};
const LETTERS='ABCD';
const TOTAL=7;

const CSS=`
.pk-newlywed{--pk-bg:linear-gradient(165deg,#3b1456 0%,#7a2576 52%,#c93d79 100%);--pk-accent:#ffb400}
.pk-newlywed .pk-btn{color:#2a1240;text-shadow:none}
.pk-newlywed .pk-opt.sel{color:#2a1240}
.nw-batt{display:flex;align-items:center;justify-content:center;gap:5px}
.nw-batt b{font:900 13px Arial;letter-spacing:.1em;opacity:.9;margin-right:2px}
.nw-batt .tip{width:6px;height:12px;border-radius:2px;background:rgba(255,255,255,.5);margin-left:-3px}
.nw-batt .cells{display:flex;gap:3px;padding:3px;border:2px solid rgba(255,255,255,.6);border-radius:7px}
.nw-batt .c{width:clamp(14px,4.4vw,26px);height:14px;border-radius:3px;background:rgba(255,255,255,.14)}
.nw-batt .c.on{background:#43e07f;box-shadow:0 0 8px #43e07f}
.nw-batt .c.miss{background:#ff5a5a}
.nw-batt .c.now{animation:pk-pulse .9s infinite;background:rgba(255,255,255,.4)}
.nw-who{display:flex;align-items:center;justify-content:center;gap:10px}
.nw-who .pk-sub{text-align:left}
.nw-opts{display:flex;flex-direction:column;gap:clamp(6px,1.2vh,10px)}
.nw-reveal{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start}
.nw-side{display:flex;flex-direction:column;align-items:center;gap:7px;min-width:0}
.nw-side .nm{font:900 15px Arial;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nw-side .lbl{font:800 11px Arial;letter-spacing:.14em;opacity:.75}
.nw-card{width:100%;min-height:clamp(84px,14vh,120px);border-radius:16px;padding:10px;background:rgba(255,255,255,.12);border:2px dashed rgba(255,255,255,.45);display:grid;place-items:center;text-align:center;font:800 clamp(14px,3.5vw,19px)/1.22 Arial;word-break:break-word}
.nw-card.q{font-size:38px;opacity:.8}
.nw-card.face{background:#fff;color:#2a1240;border:2px solid #fff;box-shadow:0 6px 18px rgba(0,0,0,.3)}
.nw-card.good{background:#43e07f;color:#0b3a1d;border-color:#fff}
.nw-card.bad{background:#ff6b6b;color:#4a0d0d;border-color:#fff}
.nw-quip{font:900 clamp(18px,4.6vw,28px)/1.15 Arial;text-align:center;text-shadow:0 3px 0 rgba(0,0,0,.25)}
.nw-pts{display:inline-block;padding:6px 14px;border-radius:99px;background:#ffb400;color:#2a1240;font:900 18px Arial}
.nw-lock{font-size:46px;text-align:center}
`;

function pickQuestions(rand,n){
 const pool=shuffle(QUESTIONS,rand),out=[],cnt={};
 for(const q of pool){if((cnt[q.cat]||0)>=2)continue;cnt[q.cat]=(cnt[q.cat]||0)+1;out.push(q);if(out.length>=n)break;}
 for(const q of pool){if(out.length>=n)break;if(!out.includes(q))out.push(q);}
 return out;
}

async function newlywed(s){
 extraCSS('nw-css',CSS);
 const ui=new PartyUI(s,{theme:'newlywed'});
 const rand=s.random,qs=pickQuestions(rand,TOTAL);
 const rounds=qs.map((q,i)=>({q,order:shuffle([0,1,2,3],rand),finale:i===TOTAL-1,S:i%2,G:1-(i%2)}));
 const names=[pname(s,0),pname(s,1)],score=[0,0],cells=[];// cells: 'on'|'miss'
 let matches=0,attempts=0,log=[];
 s.hint('Each round one of you answers a question about yourself in secret. The other tries to guess that answer. Match = points. Final round: both answer and both guess for double points.');
 const total=()=>TOTAL+1;
 const batt=(now=-1)=>`<div class="nw-batt"><b>💞 SYNC</b><div class="cells">${Array.from({length:total()},(_,i)=>`<span class="c ${cells[i]||''}${i===cells.length&&now>=0?' now':''}"></span>`).join('')}</div><div class="tip"></div></div>`;
 const optsOf=(r,S)=>r.order.map(k=>fill(r.q.o[k],{you:false,name:names[S],other:names[1-S]}));
 const qText=(r,S,you)=>fill(r.q.q,{you,name:names[S],other:names[1-S]});
 const header=(r,idx)=>`<div class="pk-over">Question ${idx+1} of ${TOTAL} · ${CAT_ICON[r.q.cat]} ${CATEGORY_LABEL[r.q.cat]}${r.finale?' · FINALE · DOUBLE POINTS':''}</div>`;

 // One private screen where somebody picks one of the four options. mode 'answer' (about themselves) or 'guess' (about S).
 function pickScreen(r,idx,S,who,mode,part=''){
  const you=mode==='answer',opts=optsOf(r,S);
  const html=`<div class="pk-screen">${batt(cells.length)}${header(r,idx)}
   <div class="nw-who">${head(s,who,'think','')}<div class="pk-sub">${mode==='answer'?`<b>${esc(names[who])}</b> · answer about <b>YOURSELF</b>`:`<b>${esc(names[who])}</b> · what did <b>${esc(names[S])}</b> pick?`}${part?`<br>${part}`:''}</div></div>
   <h2 class="pk-q">${esc(qText(r,S,you))}</h2>
   <div class="nw-opts">${opts.map((o,i)=>`<button class="pk-opt pk-in" style="animation-delay:${i*50}ms" data-act="opt" data-i="${i}"><span class="ltr">${LETTERS[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>
   <button class="pk-btn off" data-act="lock">Lock it in 🔒</button></div>`;
  return ui.ask(html,(a,el,done)=>{
   if(a==='opt'){sfx.pick();ui.root.querySelectorAll('.pk-opt').forEach(b=>b.classList.toggle('sel',b===el));ui.root.querySelector('[data-act=lock]').classList.remove('off');ui.sel=+el.dataset.i;}
   else if(a==='lock'&&ui.sel!=null){const v=ui.sel;ui.sel=null;sfx.ok();done(v);}
  }).then(v=>{ui.sel=null;return v;});
 }
 const blank=()=>ui.set(`<div class="pk-screen"><div class="nw-lock">🔒</div><div class="pk-sub">Locked in. Pass the phone!</div></div>`);

 async function reveal(r,idx,S,G,ansIdx,guessIdx,pts,label=''){
  const opts=optsOf(r,S),hit=ansIdx===guessIdx;
  const card=(txt,cls='')=>`<div class="nw-card ${cls}">${txt}</div>`;
  ui.set(`<div class="pk-screen">${batt()}${header(r,idx)}
   <h2 class="pk-q" style="font-size:clamp(16px,3.8vw,24px)">${esc(qText(r,S,false))}</h2>
   <div class="nw-reveal">
    <div class="nw-side"><div data-h="${S}">${head(s,S,'think','lg')}</div><div class="nm">${esc(names[S])}</div><div class="lbl">REAL ANSWER</div><div data-c="a">${card('?','q')}</div></div>
    <div class="nw-side"><div data-h="${G}">${head(s,G,'think','lg')}</div><div class="nm">${esc(names[G])}</div><div class="lbl">GUESS</div><div data-c="g">${card('?','q')}</div></div>
   </div>${label?`<div class="pk-over">${label}</div>`:''}<div data-out style="min-height:100px;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center"></div></div>`);
  const mood=(i,m)=>{const h=ui.root.querySelector(`[data-h="${i}"]`);if(h)h.innerHTML=head(s,i,m,'lg');};
  const slot=k=>ui.root.querySelector(`[data-c=${k}]`);
  sfx.drum();if(!await s.wait(750))return;
  slot('a').innerHTML=card(esc(opts[ansIdx]),'face pk-flip');sfx.whoosh();mood(S,'normal');if(!await s.wait(900))return;
  slot('g').innerHTML=card(esc(opts[guessIdx]),'face pk-flip');sfx.whoosh();if(!await s.wait(750))return;
  attempts++;if(hit)matches++;cells.push(hit?'on':'miss');
  slot('g').firstChild.classList.add(hit?'good':'bad');
  if(hit){slot('a').firstChild.classList.add('good');mood(S,'win');mood(G,'win');sfx.cheer();burst(ui.root,{emojis:['💖','💞','✨','💗'],n:26,spread:220});banner(ui.root,'MATCH!','#ffe27a');score[G]+=pts;s.react(G,'happy');s.react(S,'happy');}
  else{mood(S,'silly');mood(G,'sad');sfx.boo();banner(ui.root,'NOPE!','#ffb3b3');s.react(G,'sad');}
  s.setScores([...score]);
  const quip=hit?MATCH_QUIPS[Math.floor(rand()*MATCH_QUIPS.length)]:MISS_QUIPS[Math.floor(rand()*MISS_QUIPS.length)];
  log.push({q:r.q.q,S,G,hit,pts:hit?pts:0});
  const out=ui.root.querySelector('[data-out]');
  const bat=ui.root.querySelector('.nw-batt');if(bat)bat.outerHTML=batt();
  out.innerHTML=`<div class="nw-quip pk-pop">${esc(quip)}</div>${hit?`<span class="nw-pts pk-pop">${esc(names[G])} +${pts}</span>`:`<div class="pk-sub">${esc(names[S])} really picked <b>“${esc(opts[ansIdx])}”</b></div>`}<button class="pk-btn" data-act="go">${idx===TOTAL-1&&label.includes('2')?'See the verdict ▸':idx===TOTAL-1&&!label?'See the verdict ▸':'Next ▸'}</button>`;
  return new Promise(res=>{ui.handler=(a)=>{if(a==='go'){sfx.tap();ui.handler=null;res(true);}};});
 }

 if(!await titleCard(s,'💞','Each round one of you secretly answers a question about yourself and the other secretly guesses it. A match scores points, and the sync battery shows how well you know each other.','Start the show'))return;

 for(let idx=0;idx<rounds.length;idx++){
  const r=rounds[idx];
  if(!r.finale){
   const {S,G}=r;
   blank();
   if(!await s.pass(S,`Question ${idx+1}: answer about YOURSELF, honestly. ${names[G]}, look away!`,'I’m ready, hide it'))return;
   const ans=await pickScreen(r,idx,S,S,'answer');if(!s.alive)return;
   blank();
   if(!await s.pass(G,`${names[S]} has locked in an answer. Which one did they pick?`,'Show me the question'))return;
   const guess=await pickScreen(r,idx,S,G,'guess');if(!s.alive)return;
   blank();
   s.shared=true;s.updateScores();
   const ok=await reveal(r,idx,S,G,ans,guess,2);
   s.shared=false;if(!ok||!s.alive)return;
  }else{
   // Finale: both answer about themselves, both predict. P1 answers and predicts in one go, then P0 predicts.
   blank();
   if(!await s.pass(0,`FINALE (double points)! ${names[0]}, answer about YOURSELF. ${names[1]}, look away!`,'I’m ready, hide it'))return;
   const a0=await pickScreen(r,idx,0,0,'answer');if(!s.alive)return;
   blank();
   if(!await s.pass(1,`FINALE (double points)! First answer about YOURSELF, then guess ${names[0]}’s answer.`,'Show me the question'))return;
   const a1=await pickScreen(r,idx,1,1,'answer','Part 1 of 2');if(!s.alive)return;
   const g1=await pickScreen(r,idx,0,1,'guess','Part 2 of 2');if(!s.alive)return;
   blank();
   if(!await s.pass(0,`Now guess what ${names[1]} picked about themselves.`,'Show me the question'))return;
   const g0=await pickScreen(r,idx,1,0,'guess');if(!s.alive)return;
   blank();
   s.shared=true;s.updateScores();
   if(!await reveal(r,idx,0,1,a0,g1,4,'1 of 2 · '+names[1]+' guessed '+names[0]))return;
   if(!await reveal(r,idx,1,0,a1,g0,4,'2 of 2 · '+names[0]+' guessed '+names[1]))return;
   s.shared=false;
  }
 }
 // Verdict screen
 const pct=Math.round(matches/attempts*100),v=verdictFor(pct);
 s.shared=true;s.updateScores();
 const reading=[0,1].map(g=>log.filter(l=>l.G===g&&l.hit).length+'/'+log.filter(l=>l.G===g).length);
 ui.set(`<div class="pk-screen">${batt()}<div class="pk-over">Final verdict</div>
  <div class="pk-row">${head(s,0,pct>=50?'win':'sad','lg')}${head(s,1,pct>=50?'win':'sad','lg')}</div>
  <h1 class="pk-h1 pk-pop">${esc(v.name)}</h1><div class="pk-q" style="font-size:clamp(34px,10vw,64px)">${pct}% in sync</div>
  <div class="pk-sub">${esc(v.line)}</div>
  <div class="pk-card pk-sub">${esc(names[0])} read ${esc(names[1])} correctly <b>${reading[0]}</b> times. ${esc(names[1])} read ${esc(names[0])} <b>${reading[1]}</b> times.</div>
  <button class="pk-btn" data-act="go">Finish</button></div>`);
 if(pct>=50){sfx.big();burst(ui.root,{emojis:['💖','✨','🎉','💞'],n:40,spread:260});}else sfx.boo();
 await new Promise(res=>{ui.handler=a=>{if(a==='go')res(true);};});
 if(!s.alive)return;
 const verdictLine=`Sync battery ${matches}/${attempts} (${pct}%): ${v.name}. ${names[0]} read ${names[1]} ${reading[0]}, ${names[1]} read ${names[0]} ${reading[1]}.`;
 s.debug={score,matches,attempts,log};
 s.finish([...score],verdictLine);
}

Object.assign(exports,{newlywed,pickQuestions});
