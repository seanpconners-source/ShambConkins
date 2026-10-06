// Roast Battle: each player is dealt 5 roast cards, reads one aloud at the opponent, who rates it with OHHH levels.
// A hidden crowd (liking some card categories more than others) adds a surprise bonus/penalty.
const {CARDS,CATS,cardText,OHHH,CROWD_LINES}=require("src/data/partyRoast.js");
const {PartyUI,sfx,head,pname,cname,esc,burst,banner,titleCard,shuffle,extraCSS,shake}=require("src/engines/partyKit.js");

const ROUNDS=3,HAND=5;
const CSS=`
.pk-roast{--pk-bg:radial-gradient(ellipse at 50% -10%,#6b2d5c 0%,#2a1233 45%,#150a1c 100%);--pk-accent:#ff6a2b}
.pk-roast::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 22px,rgba(255,255,255,.035) 22px 24px),repeating-linear-gradient(90deg,transparent 0 46px,rgba(255,255,255,.03) 46px 48px);pointer-events:none}
.rb-hand{display:flex;flex-direction:column;gap:8px}
.pk-stage .rb-card{appearance:none;text-align:left;width:100%;padding:11px 13px;border-radius:14px;color:#2a1233;background:#fff6e6;border:3px solid #fff6e6;font:700 clamp(14px,3.3vw,17px)/1.25 Arial;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.35);display:flex;flex-direction:column;gap:5px;transition:transform .1s}
.pk-stage .rb-card:hover{background:#fff6e6;border-color:#fff6e6}
.pk-stage .rb-card:active{transform:scale(.985)}
.pk-stage .rb-card.sel{border-color:#ff6a2b;background:#ffe3bf;box-shadow:0 0 0 3px #ff6a2b66,0 4px 0 rgba(0,0,0,.35);transform:translateY(-2px)}
.rb-card .cat{font:800 10px Arial;letter-spacing:.12em;text-transform:uppercase;opacity:.6}
.rb-mic{display:flex;flex-direction:column;align-items:center;gap:10px}
.rb-big{background:#fff6e6;color:#2a1233;border-radius:20px;padding:clamp(14px,3vh,24px);font:800 clamp(19px,4.8vw,30px)/1.25 Arial;text-align:center;box-shadow:0 8px 0 rgba(0,0,0,.35);text-wrap:balance}
.rb-spot{width:100%;display:flex;justify-content:space-around;align-items:flex-end}
.rb-rate{display:flex;flex-direction:column;gap:10px}
.pk-stage .rb-rb{appearance:none;border:0;border-radius:16px;min-height:clamp(62px,11vh,84px);color:#fff;font:900 clamp(20px,5vw,28px)/1 Arial;display:flex;align-items:center;justify-content:space-between;padding:0 18px;cursor:pointer;box-shadow:0 5px 0 rgba(0,0,0,.35);text-shadow:0 2px 0 rgba(0,0,0,.3)}
.pk-stage .rb-rb.l1:hover{background:#e8a317}.pk-stage .rb-rb.l2:hover{background:#ef6a2b}.pk-stage .rb-rb.l3:hover{background:#d6243a}
.pk-stage .rb-rb:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(0,0,0,.35)}
.pk-stage .rb-rb small{font:700 13px Arial;opacity:.9;text-shadow:none}
.pk-stage .rb-rb em{font-style:normal;font-size:1.4em}
.rb-rb.l1{background:#e8a317}.rb-rb.l2{background:#ef6a2b}.rb-rb.l3{background:#d6243a}
.rb-meter{position:relative;height:24px;border-radius:14px;background:linear-gradient(90deg,#4b66d9,#7a7a8a 40%,#f2c230 65%,#ff4b2b);border:3px solid rgba(255,255,255,.85);box-shadow:0 3px 0 rgba(0,0,0,.35)}
.rb-meter i{position:absolute;top:-10px;bottom:-10px;width:8px;margin-left:-4px;border-radius:5px;background:#fff;box-shadow:0 0 10px #fff;left:50%;transition:left 1.1s cubic-bezier(.3,1.6,.5,1)}
.rb-crowd{display:flex;justify-content:center;gap:2px;font-size:clamp(22px,6vw,34px)}
.rb-crowd span{display:inline-block;animation:pk-bounce .6s ease-in-out infinite}
.rb-pts{font:900 clamp(30px,9vw,54px)/1 Arial;text-shadow:0 4px 0 rgba(0,0,0,.35)}
.rb-line{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rb-side{background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.2);border-radius:16px;padding:10px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;font:700 13px/1.3 Arial}
.rb-side.win{background:#ffb40033;border-color:#ffd24d;box-shadow:0 0 22px #ffb40066}
.rb-side .t{font:900 clamp(24px,6vw,36px) Arial}
`;

async function roast(s){
 extraCSS('rb-css',CSS);
 const ui=new PartyUI(s,{theme:'roast'});
 const rand=s.random,score=[0,0],cn=[cname(s,0),cname(s,1)],pn=[pname(s,0),pname(s,1)];
 // Hidden crowd taste
 const cats=shuffle(Object.keys(CATS),rand),crowd={[cats[0]]:2,[cats[1]]:1,[cats[2]]:-1};
 const deck=shuffle(CARDS,rand);
 const draw=()=>deck.length?deck.pop():CARDS[Math.floor(rand()*CARDS.length)];
 const hands=[Array.from({length:HAND},draw),Array.from({length:HAND},draw)];
 const history=[];
 s.hint('Each round you both roast once. Pick a card, read it aloud to your opponent, then they tap how hard it burned. The hidden crowd loves some kinds of jokes and hates others, so watch how it reacts!');

 const bar=r=>`<div class="pk-over">Round ${r+1} of ${ROUNDS} · ${'🔥'.repeat(r+1)}</div>`;
 const blank=()=>ui.set(`<div class="pk-screen"><div class="pk-q" style="font-size:44px">🎤</div><div class="pk-sub">Pass the phone…</div></div>`);

 async function turn(r,R,T,first){
  blank();
  if(!await s.pass(R,`Pick the roast you will read to ${pn[T]}. ${pn[T]}, don’t peek at the hand!`,'Show my cards'))return null;
  const hand=hands[R];
  const sel=await ui.ask(`<div class="pk-screen">${bar(r)}
   <div class="pk-row">${head(s,R,'silly','sm')}<div class="pk-sub"><b>${esc(pn[R])}</b>, roast <b>${esc(cn[T])}</b></div>${head(s,T,'think','sm')}</div>
   <div class="rb-hand">${hand.map((c,i)=>`<button class="rb-card pk-in" style="animation-delay:${i*50}ms" data-act="c" data-i="${i}"><span class="cat">${CATS[c.cat].icon} ${CATS[c.cat].label}</span>${esc(cardText(c,cn[T]))}</button>`).join('')}</div>
   <button class="pk-btn off" data-act="go">Roast them! 🎤</button></div>`,(a,el,done)=>{
    if(a==='c'){sfx.pick();ui.root.querySelectorAll('.rb-card').forEach(b=>b.classList.toggle('sel',b===el));ui.root.querySelector('[data-act=go]').classList.remove('off');ui.sel=+el.dataset.i;}
    else if(a==='go'&&ui.sel!=null){const v=ui.sel;ui.sel=null;done(v);}
  });
  if(!s.alive)return null;
  const card=hand.splice(sel,1)[0];hand.push(draw());
  const text=cardText(card,cn[T]);
  // Read aloud, then the target rates (shared screen)
  s.shared=true;s.updateScores();
  sfx.drum();
  await ui.ask(`<div class="pk-screen"><div class="pk-over">${esc(pn[R])} takes the mic</div>
   <div class="rb-spot">${head(s,R,'silly','lg')}${head(s,T,'think','lg')}</div>
   <div class="pk-sub">Read it OUT LOUD to <b>${esc(cn[T])}</b>!</div>
   <div class="rb-big pk-pop">${esc(text)}</div>
   <button class="pk-btn" data-act="go">I said it! 🎤</button></div>`,(a,el,done)=>{if(a==='go'){sfx.tap();done(1);}});
  if(!s.alive)return null;
  const lv=await ui.ask(`<div class="pk-screen"><div class="pk-over">${esc(pn[T])}, you are the crowd</div>
   <div class="rb-spot">${head(s,T,'think','lg')}</div>
   <div class="pk-q">How hard did that burn?</div>
   <div class="pk-sub">Be honest: a real laugh deserves the big one.</div>
   <div class="rb-rate">${OHHH.map(o=>`<button class="rb-rb l${o.lv}" data-act="rate" data-lv="${o.lv}"><em>${o.emoji}</em><span>${o.label}</span><small>${o.note}</small></button>`).join('')}</div></div>`,(a,el,done)=>{
    if(a==='rate'){sfx.pick();done(+el.dataset.lv);}
  });
  if(!s.alive)return null;
  // Crowd reaction
  const mod=crowd[card.cat]||0,pts=Math.max(0,lv+mod);
  ui.set(`<div class="pk-screen"><div class="pk-over">The crowd reacts</div>
   <div class="rb-big" style="font-size:clamp(14px,3.2vw,19px)">${esc(text)}</div>
   <div class="rb-spot">${head(s,R,'silly','lg')}</div>
   <div class="rb-meter"><i data-needle></i></div>
   <div class="rb-crowd" data-crowd></div><div class="pk-sub" data-line>&nbsp;</div><div class="rb-pts" data-pts></div><div data-btn></div></div>`);
  const needle=ui.root.querySelector('[data-needle]');
  await s.wait(300);if(!s.alive)return null;
  needle.style.left=({[-1]:'26%',0:'50%',1:'70%',2:'90%'}[mod])+'%';
  sfx.drum();await s.wait(1200);if(!s.alive)return null;
  const line=CROWD_LINES[mod][Math.floor(rand()*CROWD_LINES[mod].length)];
  ui.root.querySelector('[data-line]').innerHTML=`<b>${esc(line)}</b> ${mod>0?`(${CATS[card.cat].icon} ${CATS[card.cat].label} +${mod})`:mod<0?`(${CATS[card.cat].icon} ${CATS[card.cat].label} ${mod})`:''}`;
  ui.root.querySelector('[data-crowd]').innerHTML=(mod>=1?['👏','🎉','😂','🙌','👏']:mod<0?['😒','🥱','😬','🙄']:['😐','🙂','👏','😅']).map((e,i)=>`<span style="animation-delay:${i*90}ms">${e}</span>`).join('');
  if(mod>=1){sfx.cheer();sfx.laugh();burst(ui.root,{emojis:['🔥','😂','🎉'],n:24,spread:240});}else if(mod<0)sfx.boo();else sfx.ok();
  if(lv===3)banner(ui.root,'BURN!','#ffd24d');
  await s.wait(600);if(!s.alive)return null;
  const p=ui.root.querySelector('[data-pts]');p.innerHTML=`<span class="pk-pop" style="display:inline-block">+${pts} for ${esc(pn[R])}</span>`;
  score[R]+=pts;s.setScores([...score]);
  ui.root.querySelector('[data-btn]').innerHTML=`<button class="pk-btn pk-in" data-act="go">Next ▸</button>`;
  await new Promise(res=>{ui.handler=a=>{if(a==='go'){sfx.tap();ui.handler=null;res(1);}};});
  s.shared=false;
  return {R,T,text,lv,mod,pts,cat:card.cat};
 }

 if(!await titleCard(s,'🎤','Each round you both roast once: pick a card, read it out loud, and your opponent rates the burn with OHHH levels. The hidden crowd adds surprise bonuses, and the best roast of each round wins extra points.','Take the stage'))return;
 for(let r=0;r<ROUNDS;r++){
  const order=r%2?[1,0]:[0,1],res=[];
  for(const R of order){const t=await turn(r,R,1-R);if(!t||!s.alive)return;res.push(t);history.push(t);}
  // Judge's verdict for the round
  const [a,b]=res;let w=a.pts>b.pts?a.R:b.pts>a.pts?b.R:a.mod>b.mod?a.R:b.mod>a.mod?b.R:order[1];// ties: the closing act gets the nod
  const byR=[null,null];res.forEach(t=>byR[t.R]=t);
  s.shared=true;s.updateScores();
  score[w]+=2;s.setScores([...score]);
  ui.set(`<div class="pk-screen">${bar(r)}<div class="pk-over">The judge’s verdict</div>
   <div class="rb-line">${[0,1].map(i=>`<div class="rb-side ${i===w?'win':''}">${head(s,i,i===w?'win':'sad','lg')}<b>${esc(pn[i])}</b><div class="t">${byR[i].pts}</div><div>${esc(byR[i].text)}</div></div>`).join('')}</div>
   <div class="pk-q pk-pop">${esc(pn[w])} wins the round! +2</div>
   <button class="pk-btn" data-act="go">${r===ROUNDS-1?'Final scores ▸':'Next round ▸'}</button></div>`);
  sfx.big();burst(ui.root,{emojis:['👑','🔥','✨'],n:22,spread:230});
  await new Promise(res=>{ui.handler=a=>{if(a==='go'){sfx.tap();res(1);}};});if(!s.alive)return;
  s.shared=false;
 }
 const w=score[0]>score[1]?0:score[1]>score[0]?1:-1;
 s.shared=true;s.updateScores();
 const best=history.slice().sort((x,y)=>y.pts-x.pts)[0];
 ui.set(`<div class="pk-screen"><div class="pk-over">Roast Battle · final</div>
  <div class="pk-row">${head(s,0,w===0?'win':w<0?'silly':'sad','xl')}${head(s,1,w===1?'win':w<0?'silly':'sad','xl')}</div>
  <h1 class="pk-h1 pk-pop">${w<0?'Dead heat! Everybody burns.':esc(pn[w])+' wins the roast!'}</h1>
  <div class="pk-q">${score[0]} – ${score[1]}</div>
  <div class="pk-card pk-sub">Best burn of the night (${best.pts} pts): <b>${esc(best.text)}</b></div>
  <div class="pk-sub">The crowd secretly adored: ${Object.entries(crowd).filter(e=>e[1]>0).sort((x,y)=>y[1]-x[1]).map(e=>CATS[e[0]].icon+' '+CATS[e[0]].label).join(', ')}. It hated: ${Object.entries(crowd).filter(e=>e[1]<0).map(e=>CATS[e[0]].icon+' '+CATS[e[0]].label).join('')}.</div>
  <button class="pk-btn" data-act="go">Finish</button></div>`);
 sfx.cheer();burst(ui.root,{emojis:['🔥','🎤','👏'],n:36,spread:260});
 await new Promise(res=>{ui.handler=a=>{if(a==='go')res(1);};});if(!s.alive)return;
 s.debug={score,history,crowd};
 s.finish([...score],w<0?'A dead heat on the comedy stage.':`${pn[w]} took the roast battle ${score[w]}–${score[1-w]}. Best burn: ${best.text}`);
}

Object.assign(exports,{roast});
