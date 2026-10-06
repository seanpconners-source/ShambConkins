// Liar's Dice (Perudo): 5 dice each under a cup, alternate bids, call LIAR. Ones are wild. Lose all dice, lose the game.
const {PartyUI,sfx,head,pname,esc,burst,banner,titleCard,extraCSS,shake,tone}=require("src/engines/partyKit.js");

const START=5;
const PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
const CSS=`
.pk-liars{--pk-bg:radial-gradient(ellipse at 50% 0,#6a4326 0%,#3a2314 55%,#22140b 100%);--pk-accent:#d99a1e}
.pk-liars::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(0,0,0,.12) 0 3px,transparent 3px 46px),repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 2px,transparent 2px 9px);pointer-events:none}
.pk-liars .pk-screen{position:relative}
.ld-die{--ds:44px;width:var(--ds);height:var(--ds);border-radius:20%;background:linear-gradient(145deg,#fff8e4,#e8d6a8);box-shadow:inset 0 -3px 0 rgba(0,0,0,.18),0 3px 0 rgba(0,0,0,.4);display:grid;grid-template:repeat(3,1fr)/repeat(3,1fr);padding:calc(var(--ds)*.14);flex:0 0 auto;position:relative}
.ld-die i{width:78%;height:78%;margin:auto;border-radius:50%;background:#2a1a10;box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}
.ld-die.ldw i{background:#c8281e}
.ld-die.ldhit{background:linear-gradient(145deg,#fff2a8,#ffd24d);box-shadow:0 0 0 3px #ffd24d,0 0 18px #ffd24d,0 3px 0 rgba(0,0,0,.4);transform:translateY(-5px)}
.ld-die.lddim{opacity:.35;filter:grayscale(.6)}
.ld-die.ldlg{--ds:clamp(44px,12vw,62px)}
.ld-die.ldsm{--ds:24px}
.ld-die.ldgone{animation:ld-gone .9s forwards}
.ld-die.ldroll{animation:ld-roll .7s ease-out}
@keyframes ld-gone{0%{transform:scale(1)}40%{transform:scale(1.4) rotate(20deg)}100%{transform:scale(0) rotate(180deg);opacity:0}}
@keyframes ld-roll{0%{transform:translateY(-30px) rotate(-200deg);opacity:0}60%{transform:translateY(0) rotate(30deg);opacity:1}100%{transform:rotate(0)}}
.ld-dice{display:flex;gap:clamp(5px,1.8vw,10px);justify-content:center;flex-wrap:wrap}
.ld-cupwrap{position:relative;min-height:calc(clamp(44px,12vw,62px) + 20px);display:flex;align-items:center;justify-content:center;width:100%}
.ld-cup{position:absolute;inset:-6px 0;margin:auto;max-width:360px;display:grid;place-items:center;border-radius:12px 12px 26px 26px;background:linear-gradient(180deg,#7a4a22,#4d2c12);border:3px solid #d99a1e;color:#ffe9b0;font:900 15px Arial;letter-spacing:.08em;box-shadow:0 8px 0 rgba(0,0,0,.4);cursor:pointer;transition:transform .45s cubic-bezier(.3,1.4,.5,1),opacity .4s;z-index:3}
.ld-cup.up{transform:translateY(-70px) rotate(-14deg);opacity:0;pointer-events:none}
.ld-dice[data-act]{cursor:pointer}
.ld-cup.shake{animation:ld-shake .5s infinite}
@keyframes ld-shake{0%,100%{transform:translate(0,0) rotate(0)}25%{transform:translate(-8px,-6px) rotate(-6deg)}75%{transform:translate(8px,-4px) rotate(6deg)}}
.ld-bid{text-align:center;background:rgba(0,0,0,.35);border:2px solid #d99a1e;border-radius:16px;padding:8px 12px;display:flex;flex-direction:column;align-items:center;gap:4px}
.ld-bid .big{display:flex;align-items:center;gap:10px;font:900 clamp(30px,8vw,46px)/1 Arial}
.ld-stepper{display:flex;align-items:center;justify-content:center;gap:12px}
.pk-stage .ld-step{appearance:none;width:56px;height:56px;border-radius:50%;border:0;background:#d99a1e;color:#2a1a10;font:900 30px/1 Arial;box-shadow:0 4px 0 rgba(0,0,0,.4);cursor:pointer;padding:0;min-height:0}
.pk-stage .ld-step:hover{background:#d99a1e;border:0}
.pk-stage .ld-face:hover{background:none;border:0}.pk-stage .ld-face.sel:hover{background:#d99a1e}
.pk-stage .ld-step:active{transform:translateY(3px)}
.ld-qty{font:900 44px/1 Arial;min-width:70px;text-align:center}
.pk-stage .ld-face{appearance:none;background:none;border:0;padding:4px;border-radius:14px;cursor:pointer;min-height:0}
.pk-stage .ld-face.sel{background:#d99a1e;box-shadow:0 0 0 3px #fff}
.ld-faces{display:flex;gap:6px;justify-content:center}
.ld-count{display:flex;align-items:center;gap:8px;justify-content:center;font:800 13px Arial}
.ld-stack{display:flex;gap:3px;flex-wrap:wrap;justify-content:center}
.ld-row{display:flex;flex-direction:column;align-items:center;gap:6px;background:rgba(0,0,0,.28);border-radius:16px;padding:8px 6px;width:100%}
.ld-tally{font:900 clamp(28px,8vw,48px)/1 Arial;text-align:center;text-shadow:0 4px 0 rgba(0,0,0,.4)}
`;
const dieHTML=(v,cls='')=>`<span class="ld-die ${v===1?'ldw':''} ${cls}" data-v="${v}">${PIPS[v].map(p=>`<i style="grid-area:${Math.ceil(p/3)}/${((p-1)%3)+1}"></i>`).join('')}</span>`;
const roll=rand=>Array.from({length:START},()=>1+Math.floor(rand()*6));

async function liarsDice(s){
 extraCSS('ld-css',CSS);
 const ui=new PartyUI(s,{theme:'liars'});
 const rand=s.random,names=[pname(s,0),pname(s,1)],dice=[START,START];
 let starter=0,roundNo=0;
 s.hint('Each player has hidden dice. Take turns bidding how many dice of one face are on the table in total (both players). Ones are wild. Raise the bid or call LIAR! If the bid was true the caller loses a die; if not, the bidder does.');
 const faceName=f=>`${f}s`;
 const stripHTML=()=>`<div class="ld-count">${[0,1].map(i=>`${head(s,i,'normal','ldsm')}<span class="ld-stack">${Array.from({length:dice[i]},()=>dieHTML(3,'ldsm')).join('')}</span>`).join('<span style="opacity:.5">vs</span>')}</div>`;
 const bidHTML=bid=>bid?`<div class="ld-bid"><div class="pk-over">Current bid</div><div class="big">${bid.q} × ${dieHTML(bid.f,'ldsm')} <span style="font-size:.55em;opacity:.8">${esc(names[bid.by])}</span></div></div>`:`<div class="ld-bid"><div class="pk-over">Opening bid</div><div class="pk-sub">You start. How many of one face are out there?</div></div>`;
 const blank=()=>ui.set(`<div class="pk-screen"><div class="pk-q" style="font-size:54px">🏴‍☠️</div><div class="pk-sub">Pass the phone…</div></div>`);
 const valid=(q,f,bid)=>!bid||q>bid.q||(q===bid.q&&f>bid.f);
 const total=()=>dice[0]+dice[1];

 async function turn(P,hand,bid){
  const minQ=bid?bid.q:1;let q=bid?(bid.f<6?bid.q:bid.q+1):1,f=bid?(bid.f<6?bid.f+1:2):2;
  const norm=()=>{q=Math.max(1,Math.min(total(),q));if(!valid(q,f,bid)){q=bid.q+1;}if(q>total()){q=total();}};
  const canRaise=()=>valid(Math.min(q,total()),f,bid)&&q<=total();
  const html=()=>`<div class="pk-screen">${stripHTML()}${bidHTML(bid)}
   <div class="pk-sub"><b>${esc(names[P])}</b>, tap the cup to peek, tap the dice to hide them again</div>
   <div class="ld-cupwrap"><div class="ld-dice" data-act="cup">${hand.map(v=>dieHTML(v,'ldlg')).join('')}</div><div class="ld-cup" data-act="cup">🏴‍☠️ TAP TO PEEK</div></div>
   <div class="ld-stepper"><button class="ld-step" data-act="qm">−</button><div class="ld-qty" data-qty>${q}</div><button class="ld-step" data-act="qp">+</button></div>
   <div class="ld-faces">${[2,3,4,5,6].map(v=>`<button class="ld-face ${v===f?'sel':''}" data-act="face" data-f="${v}">${dieHTML(v)}</button>`).join('')}</div>
   <button class="pk-btn good" data-act="bid" data-bid>BID ${q} × ${f}s</button>
   ${bid?`<button class="pk-btn bad" data-act="liar">LIAR! 🤥</button>`:''}</div>`;
  const redraw=()=>{norm();const cup=ui.root.querySelector('.ld-cup');const up=cup?.classList.contains('up'),hh=ui.handler;ui.set(html());ui.handler=hh;if(up)ui.root.querySelector('.ld-cup').classList.add('up');ui.root.querySelectorAll('.ld-dice .ld-die').forEach(d=>d.classList.remove('ldroll'));const b=ui.root.querySelector('[data-bid]');if(!valid(q,f,bid)||q>total()){b.classList.add('off');}};
  norm();
  return new Promise(res=>{
   ui.set(html());
   ui.handler=(a,el)=>{
    if(a==='cup'){const cup=ui.root.querySelector('.ld-cup');if(cup.classList.contains('up')){cup.classList.remove('up');sfx.tap();}else{sfx.rattle(6);cup.classList.add('up');ui.root.querySelectorAll('.ld-dice .ld-die').forEach(d=>d.classList.add('ldroll'));}}
    else if(a==='qm'){sfx.tap();q--;redraw();}
    else if(a==='qp'){sfx.tap();q++;redraw();}
    else if(a==='face'){sfx.tap();f=+el.dataset.f;redraw();}
    else if(a==='bid'){if(!valid(q,f,bid)||q>total())return;sfx.ok();ui.handler=null;res({type:'bid',q,f});}
    else if(a==='liar'){sfx.drum();ui.handler=null;res({type:'liar'});}
   };
  });
 }

 async function reveal(hands,bid,challenger){
  s.shared=true;s.updateScores();
  const rows=[0,1].map(i=>`<div class="ld-row"><div class="pk-row" style="gap:8px">${head(s,i,'normal','ldsm')}<b>${esc(names[i])}</b></div><div class="ld-cupwrap"><div class="ld-dice" data-d="${i}">${hands[i].map(v=>dieHTML(v,'ldlg lddim')).join('')}</div><div class="ld-cup" data-cup="${i}">🏴‍☠️</div></div></div>`).join('');
  ui.set(`<div class="pk-screen"><div class="pk-over">${esc(names[challenger])} calls LIAR!</div>
   <div class="ld-bid"><div class="pk-over">The bid was</div><div class="big">${bid.q} × ${dieHTML(bid.f,'ldsm')}</div></div>${rows}<div class="ld-tally" data-tally>&nbsp;</div><div data-out></div></div>`);
  banner(ui.root,'LIAR!','#ffd24d');sfx.boom();
  if(!await s.wait(900))return null;
  for(const i of [bid.by,challenger]){ui.root.querySelector(`[data-cup="${i}"]`).classList.add('up');sfx.whoosh();if(!await s.wait(550))return null;}
  let count=0;const tally=ui.root.querySelector('[data-tally]');
  tally.textContent=`Count: 0 / ${bid.q}`;
  for(const i of [0,1]){
   const els=[...ui.root.querySelectorAll(`[data-d="${i}"] .ld-die`)];
   for(let k=0;k<els.length;k++){
    els[k].classList.remove('lddim');
    const v=hands[i][k];
    if(v===bid.f||v===1){els[k].classList.add('ldhit');count++;tally.textContent=`Count: ${count} / ${bid.q}`;tone(500+count*90,.1,.06,'triangle');if(!await s.wait(420))return null;}
    else{els[k].classList.add('lddim');await s.wait(110);}
   }
  }
  // remove "dim" from non-hit so all are readable but hits glow
  ui.root.querySelectorAll('.ld-die.lddim').forEach(d=>{d.style.opacity='.55';});
  const truth=count>=bid.q,loser=truth?challenger:bid.by,winner=1-loser;
  tally.innerHTML=`${count} × ${bid.f}s (ones are wild) — ${truth?`<span style="color:#7dff9a">bid is TRUE</span>`:`<span style="color:#ff8a7a">it was a BLUFF</span>`}`;
  tally.style.fontSize='clamp(18px,5vw,28px)';
  if(!await s.wait(700))return null;
  dice[loser]--;
  ui.root.querySelector('[data-d="'+loser+'"] .ld-die:last-child')?.classList.add('ldgone');
  sfx.bad();shake(ui.root);s.react(loser,'sad');s.react(winner,'happy');
  s.setScores([...dice]);
  banner(ui.root,`${names[loser]} loses a die!`,'#ff9a8a');
  burst(ui.root,{emojis:['💀','🎲','⚓'],n:14,spread:200});
  if(!await s.wait(1100))return null;
  const over=dice[loser]===0;
  ui.root.querySelector('[data-out]').innerHTML=`<button class="pk-btn" data-act="go">${over?'Walk the plank ▸':'Next round ▸'}</button>`;
  await new Promise(res=>{ui.handler=a=>{if(a==='go'){sfx.tap();ui.handler=null;res(1);}};});
  s.shared=false;
  return {loser,truth,count};
 }

 if(!await titleCard(s,'🎲','Both of you hide five dice under a cup and take turns raising a bid on how many of one face are on the table. Ones are wild. Call LIAR and the loser of the showdown drops a die.','Shiver me timbers'))return;
 s.setScores([...dice]);
 while(dice[0]>0&&dice[1]>0){
  roundNo++;
  const hands=[roll(rand),roll(rand)];
  s.shared=true;s.updateScores();
  ui.set(`<div class="pk-screen"><div class="pk-over">Round ${roundNo}</div>${stripHTML()}<div class="ld-cupwrap" style="min-height:90px"><div class="ld-cup shake" style="position:relative;inset:auto;height:84px;width:min(260px,70%)">🏴‍☠️ SHAKING…</div></div><div class="pk-sub">Cups are shaken. Whoever lost last goes first.</div></div>`);
  sfx.rattle(14);await s.wait(1200);if(!s.alive)return;
  s.shared=false;
  let bid=null,turnP=starter,res=null;
  for(;;){
   blank();
   const sum=bid?`${names[bid.by]} bid ${bid.q} × ${bid.f}s. Raise it, or call LIAR!`:`You open the bidding.`;
   if(!await s.pass(turnP,`${sum} Peek at your dice privately.`,'Ready, matey'))return;
   const act=await turn(turnP,hands[turnP],bid);if(!s.alive)return;
   if(act.type==='bid'){bid={q:act.q,f:act.f,by:turnP};turnP=1-turnP;}
   else{res=await reveal(hands,bid,turnP);break;}
  }
  if(!res||!s.alive)return;
  starter=res.loser;
 }
 const loser=dice[0]===0?0:1,win=1-loser;
 s.shared=true;s.updateScores();
 ui.set(`<div class="pk-screen"><div class="pk-over">Dead Man’s Chest</div><div class="pk-row">${head(s,win,'win','xl')}${head(s,loser,'sad','ldlg')}</div>
  <h1 class="pk-h1 pk-pop">${esc(names[win])} rules the seas!</h1><div class="pk-sub">${esc(names[win])} keeps ${dice[win]} dice; ${esc(names[loser])} walks the plank.</div>
  <button class="pk-btn" data-act="go">Finish</button></div>`);
 sfx.cheer();burst(ui.root,{emojis:['🎲','💰','🏴‍☠️'],n:34,spread:250});
 await new Promise(res=>{ui.handler=a=>{if(a==='go')res(1);};});if(!s.alive)return;
 s.debug={dice,roundNo};
 s.finish([...dice],`${names[win]} won Liar’s Dice with ${dice[win]} dice left after ${roundNo} rounds.`);
}

Object.assign(exports,{liarsDice});
