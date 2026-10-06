// The Price Is Right Bid-Off: privately bid on absurd items with a slider. Closest without going over wins the round.
const {ITEMS}=require("src/data/partyPrice.js");
const {PartyUI,sfx,head,pname,esc,burst,banner,titleCard,shuffle,extraCSS,tone}=require("src/engines/partyKit.js");

const ROUNDS=5;
const CSS=`
.pk-price{--pk-bg:linear-gradient(160deg,#1b3a8a,#3b2a9a 55%,#8a2a8a);--pk-accent:#ffc928}
.pk-price .pk-btn{color:#2a1a5a;text-shadow:none}
.pr-item{text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px}
.pr-em{font-size:clamp(64px,18vw,110px);line-height:1;filter:drop-shadow(0 8px 0 rgba(0,0,0,.3))}
.pr-name{font:900 clamp(20px,5vw,30px)/1.1 Arial}
.pr-tag{background:#fff;color:#2a1a5a;border-radius:14px;padding:6px 16px;font:900 clamp(30px,9vw,52px)/1.1 Arial;box-shadow:0 5px 0 rgba(0,0,0,.35);border:4px solid #ffc928;min-width:150px;text-align:center}
.pr-range{-webkit-appearance:none;appearance:none;width:100%;height:20px;border-radius:12px;background:linear-gradient(90deg,#4ab3ff,#ffc928,#ff5a5a);outline:none;border:3px solid #fff;margin:10px 0}
.pr-range::-webkit-slider-thumb{-webkit-appearance:none;width:48px;height:48px;border-radius:50%;background:#fff;border:5px solid #ffc928;box-shadow:0 4px 0 rgba(0,0,0,.4);cursor:pointer}
.pr-range::-moz-range-thumb{width:40px;height:40px;border-radius:50%;background:#fff;border:5px solid #ffc928;cursor:pointer}
.pr-nudge{display:flex;gap:8px;justify-content:center}
.pk-stage .pr-n{appearance:none;min-height:44px;padding:6px 14px;border-radius:12px;border:0;background:rgba(255,255,255,.18);color:#fff;font:800 15px Arial;cursor:pointer}
.pk-stage .pr-n:hover{background:rgba(255,255,255,.28);border:0}
.pr-bids{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pr-bid{background:rgba(255,255,255,.12);border:3px solid rgba(255,255,255,.25);border-radius:16px;padding:10px;display:flex;flex-direction:column;align-items:center;gap:6px;font:800 14px Arial}
.pr-bid b{font:900 clamp(20px,5.4vw,30px) Arial}
.pr-bid.win{background:#ffc92833;border-color:#ffc928;box-shadow:0 0 24px #ffc92877}
.pr-bid.over{opacity:.55;border-color:#ff6a5a}
`;
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
function niceStep(p){return p>=2000?50:p>=500?10:p>=100?5:1;}
function rangeFor(item,rand){if(item._r)return item._r;const step=niceStep(item.price),lo=Math.max(step,Math.round(item.price*(.08+rand()*.4)/step)*step),hi=Math.round(item.price*(1.7+rand()*1.3)/step)*step;return item._r={lo,hi,step};}

async function priceRight(s){
 extraCSS('pr-css',CSS);
 const ui=new PartyUI(s,{theme:'price'});
 const rand=s.random,names=[pname(s,0),pname(s,1)],score=[0,0],items=shuffle(ITEMS,rand).slice(0,ROUNDS).map(i=>({...i}));items.forEach(i=>rangeFor(i,rand));
 s.hint('Each round an item is shown. Secretly slide to your bid. Closest to the real retail price WITHOUT going over wins 2 points, and a bid within 5 percent earns a bonus point. If you both go over, nobody scores.');
 const blank=()=>ui.set(`<div class="pk-screen"><div class="pk-q" style="font-size:54px">🎡</div><div class="pk-sub">Pass the phone…</div></div>`);
 const itemHTML=(it,r)=>`<div class="pr-item"><div class="pk-over">Showcase ${r+1} of ${ROUNDS}</div><div class="pr-em">${it.emoji}</div><div class="pr-name">${esc(it.name)}</div><div class="pk-sub">${esc(it.blurb)}</div></div>`;
 function bidScreen(P,it,r){
  const {lo,hi,step}=rangeFor(it,rand);let v=Math.round((lo+hi)/2/step)*step;
  const html=()=>`<div class="pk-screen">${itemHTML(it,r)}<div class="pk-sub"><b>${esc(names[P])}</b>, your secret bid (don’t go over!)</div>
   <div class="pr-tag" data-v>${money(v)}</div><input class="pr-range" type="range" min="${lo}" max="${hi}" step="${step}" value="${v}" aria-label="your bid">
   <div class="pr-nudge"><button class="pr-n" data-act="n" data-d="-10">−10%</button><button class="pr-n" data-act="n" data-d="-1">−1%</button><button class="pr-n" data-act="n" data-d="1">+1%</button><button class="pr-n" data-act="n" data-d="10">+10%</button></div>
   <button class="pk-btn" data-act="lock">Lock in my bid 🔒</button></div>`;
  return new Promise(res=>{
   ui.set(html());const inp=ui.root.querySelector('input'),tag=ui.root.querySelector('[data-v]');
   const upd=()=>{tag.textContent=money(v);inp.value=v;};
   s.on(inp,'input',()=>{v=+inp.value;tag.textContent=money(v);if(Math.random()<.3)tone(300+v/hi*600,.04,.03,'triangle');});
   ui.handler=(a,el)=>{
    if(a==='n'){sfx.tap();v=Math.max(lo,Math.min(hi,Math.round(v*(1+el.dataset.d/100)/step)*step||v));if(el.dataset.d>0&&v<=0)v=lo;upd();}
    else if(a==='lock'){sfx.ok();ui.handler=null;res(v);}
   };
  });
 }
 if(!await titleCard(s,'🎡','Secretly bid on absurd showcase items. Closest to the real price without going over wins the round, and a bid within 5 percent earns a bonus.','Come on down!'))return;
 for(let r=0;r<ROUNDS;r++){
  const it=items[r],bids=[0,0],order=r%2?[1,0]:[0,1];
  for(const P of order){
   blank();
   if(!await s.pass(P,`Showcase ${r+1}: guess the retail price of a mystery item. ${names[1-P]}, look away!`,'Show me the prize'))return;
   bids[P]=await bidScreen(P,it,r);if(!s.alive)return;
  }
  s.shared=true;s.updateScores();
  ui.set(`<div class="pk-screen">${itemHTML(it,r)}<div class="pk-over">The actual retail price is…</div><div class="pr-tag" data-price>$0</div>
   <div class="pr-bids">${[0,1].map(i=>`<div class="pr-bid" data-b="${i}">${head(s,i,'think','')}<span>${esc(names[i])}</span><b>${money(bids[i])}</b></div>`).join('')}</div><div class="pk-q" data-res style="min-height:1.3em"></div><div data-out></div></div>`);
  sfx.drum();
  const tag=ui.root.querySelector('[data-price]');
  for(let k=1;k<=24;k++){tag.textContent=money(it.price*k/24*(k<24?(.6+rand()*.6):1));tone(300+k*30,.03,.03,'square');if(!await s.wait(55))return;}
  tag.textContent=money(it.price);sfx.ding();
  const under=[0,1].filter(i=>bids[i]<=it.price);
  let w=-1;if(under.length===1)w=under[0];else if(under.length===2)w=bids[0]===bids[1]?-1:bids[0]>bids[1]?0:1;
  for(const i of [0,1]){const e=ui.root.querySelector(`[data-b="${i}"]`);if(bids[i]>it.price)e.classList.add('over');else if(i===w)e.classList.add('win');}
  const res=ui.root.querySelector('[data-res]');
  if(w<0){res.textContent=under.length?'A tie! Nobody scores.':'You BOTH went over! Nobody scores.';sfx.boo();banner(ui.root,under.length?'TIE':'OVERBID!','#ffb3b3');}
  else{
   let pts=2;const close=Math.abs(it.price-bids[w])/it.price<=.05;if(close)pts++;
   score[w]+=pts;s.setScores([...score]);s.react(w,'happy');s.react(1-w,'sad');
   res.innerHTML=`${esc(names[w])} wins +${pts}${close?' (so close! bonus point)':''}`;sfx.big();burst(ui.root,{emojis:['💰','🎉','⭐'],n:28,spread:240});banner(ui.root,close?'SO CLOSE!':'WINNER!','#ffe27a');
   if(under.length===1&&bids[1-w]>it.price)res.innerHTML+=`<div class="pk-sub">${esc(names[1-w])} went over!</div>`;
  }
  if(!await s.wait(900))return;
  ui.root.querySelector('[data-out]').innerHTML=`<button class="pk-btn pk-in" data-act="go">${r===ROUNDS-1?'Final results ▸':'Next showcase ▸'}</button>`;
  await new Promise(res=>{ui.handler=a=>{if(a==='go'){sfx.tap();ui.handler=null;res(1);}};});if(!s.alive)return;
  s.shared=false;
 }
 const w=score[0]>score[1]?0:score[1]>score[0]?1:-1;
 s.shared=true;s.updateScores();
 ui.set(`<div class="pk-screen"><div class="pk-over">The Price Is Right · finale</div><div class="pk-row">${head(s,0,w===0?'win':w<0?'silly':'sad','xl')}${head(s,1,w===1?'win':w<0?'silly':'sad','xl')}</div>
  <h1 class="pk-h1 pk-pop">${w<0?'A tie! Everybody wins a (pretend) car!':esc(names[w])+' is the shrewdest shopper!'}</h1><div class="pk-q">${score[0]} – ${score[1]}</div><button class="pk-btn" data-act="go">Finish</button></div>`);
 sfx.cheer();burst(ui.root,{emojis:['💰','🎡','🎉'],n:30,spread:250});
 await new Promise(res=>{ui.handler=a=>{if(a==='go')res(1);};});if(!s.alive)return;
 s.finish([...score],w<0?'Dead even on the showcase.':`${names[w]} won the showcase ${score[w]}–${score[1-w]}.`);
}
Object.assign(exports,{priceRight});
