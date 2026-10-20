const {escapeHTML}=require("src/utils.js");
const {portraitHTML, brandHTML}=require("src/assets.js");
const {referenceArtHTML}=require("src/media.js");
const {CASINO_THEMES}=require("src/data/tacticalItems.js");
const {CARD_NAMES}=require("src/engines/casinoCards.js");
const {sound}=require("src/audio.js");
const chipsText=value=>Number(value.toFixed(2)).toString();
const casinoWait=(s,ms)=>s.wait?s.wait(ms):s.delay(ms);
function casinoTap(s,button,action){s.on(button,'pointerdown',ev=>{if(s.paused||!s.alive||button.disabled)return;ev.preventDefault();void action(ev);});s.on(button,'click',ev=>{if(!ev.detail&&!ev.sourceCapabilities?.firesTouchEvents&&!s.paused&&s.alive&&!button.disabled)void action(ev);});}
function syncCards(root,cards,{hidden=false,hideIndex=-1,selectable=false,selected=new Set()}={}){
 while(root.children.length>cards.length)root.children[root.children.length-1].remove();
 cards.forEach((c,i)=>{
  const back=(typeof hidden==='function'?hidden(i,c):hidden)||i===hideIndex,identity=String(c.id??c.rank+':'+c.suit),key=identity+':'+back;let node=root.children[i];
  if(!node){node=document.createElement(selectable?'button':'div');node.className='playing-card casino-card card-arrive';node.dataset.cardIndex=String(i);root.appendChild(node);}
  if(node.dataset.cardKey!==key){const flipping=node.dataset.cardIdentity===identity;node.dataset.cardIdentity=identity;node.dataset.cardKey=key;node.dataset.motionSerial=String((+node.dataset.motionSerial||0)+1);node.className='playing-card casino-card '+(back?'back':'')+(!back&&['♦','♥'].includes(c.suit)?' red':'')+' '+(flipping?'card-flip':'card-arrive')+(+node.dataset.motionSerial%2?' motion-alt':'');node.innerHTML=back?'<span class="card-back-pattern">♠</span>':`<span class="card-corner">${CARD_NAMES[c.rank]}<small>${c.suit}</small></span><span class="card-pip">${c.suit}</span><span class="card-corner bottom">${CARD_NAMES[c.rank]}<small>${c.suit}</small></span>`;node.setAttribute('aria-label',back?'Hidden card':CARD_NAMES[c.rank]+' '+c.suit);}
  node.classList.toggle('discard-selected',selected.has(i));if(selectable){node.dataset.pokerCard=String(i);node.setAttribute('aria-pressed',String(selected.has(i)));}
 });
}
function casinoTable(s,{kind,help,center,seatExtras=['','']}){
 const theme=s.game.id.includes('bond')?CASINO_THEMES[0]:CASINO_THEMES[Math.floor(s.random()*CASINO_THEMES.length)];s.shared=true;s.updateScores();s.body.classList.add('casino-body');
 s.body.innerHTML=`<div class="casino-table casino-${theme.id}" data-casino-kind="${escapeHTML(kind.toLowerCase())}" style="--casino-felt:${theme.color}"><div class="casino-reference">${referenceArtHTML(theme.source,'casino-reference-art',theme.title)}</div><header class="casino-marquee">${brandHTML(theme.source)}<div><strong>${escapeHTML(theme.title)}</strong><small>${escapeHTML(theme.tag)}</small></div><span class="casino-shoe" aria-label="Dealer’s card shoe">♠</span></header><div class="casino-announcer" id="casino-announcer" aria-live="polite">Place your wagers</div><div class="casino-center">${center}</div><div class="casino-seats">${s.players.map((p,i)=>`<section class="casino-seat seat-${i}" id="casino-seat-${i}"><div class="casino-seat-heading">${portraitHTML(p.character,'portrait mini')}<div><strong>${escapeHTML(p.name)}</strong><span class="casino-seat-status" id="casino-status-${i}">PLACE YOUR BET</span></div><div class="casino-bank"><span class="chip-stack" aria-hidden="true"><i></i><i></i><i></i></span><b id="casino-bank-${i}">10</b><small>CHIPS</small></div></div>${seatExtras[i]}<div class="casino-wager" id="casino-wager-${i}"><button id="casino-less-${i}" aria-label="Reduce ${escapeHTML(p.name)}'s wager">−</button><b id="casino-stake-${i}">2</b><button id="casino-more-${i}" aria-label="Increase ${escapeHTML(p.name)}'s wager">+</button><button id="casino-all-${i}" class="small">All-in</button><button id="casino-lock-${i}" class="primary">Bet 2 chips</button></div><div class="casino-hand playing-cards" id="casino-hand-${i}"></div><div class="casino-seat-total" id="casino-total-${i}"></div><div class="casino-person-actions" id="casino-actions-${i}"></div><div class="casino-profit" id="casino-profit-${i}"></div></section>`).join('')}</div><div class="casino-footer"><button id="casino-next" class="primary" hidden>Next hand</button><div id="casino-cashout" class="casino-cashout" hidden><button id="casino-cashout-0" class="small">${escapeHTML(s.players[0].name)}: cash out</button><button id="casino-cashout-1" class="small">${escapeHTML(s.players[1].name)}: cash out</button></div></div><p class="casino-rules">${escapeHTML(help)} · Play chips. ${escapeHTML(kind)}</p></div>`;
 return theme;
}
function paintBanks(s,state){for(let i=0;i<2;i++){const b=document.getElementById('casino-bank-'+i),value=chipsText(state.chips[i]);if(b.textContent!==value){b.classList.remove('chip-bank-change');b.textContent=value;b.classList.add('chip-bank-change');}document.getElementById('casino-stake-'+i).textContent=chipsText(state.bets[i]);document.getElementById('casino-lock-'+i).textContent=state.locked[i]?'Wager locked':`Bet ${chipsText(state.bets[i])} chips`;for(const name of ['less','more','all','lock'])document.getElementById(`casino-${name}-${i}`).disabled=state.phase!=='betting'||state.locked[i];}s.setScores(state.chips);}
function setCasinoStatus(i,text){document.getElementById('casino-status-'+i).textContent=text;}
function announce(text){document.getElementById('casino-announcer').textContent=text;}
function busted(chips){return chips.some(n=>n<2);}
function casinoResultLabel(chips,players){const out=chips.map(n=>n<2);return out.every(Boolean)?'Both bankrolls are below the minimum. The house takes the table.':out.some(Boolean)?`${players[out[0]?0:1].name} cannot cover the 2-chip minimum.`:'Both players cash out their stacks.';}
function showProfits(s,state,before){for(let i=0;i<2;i++){const delta=Math.round((state.chips[i]-before[i])*100)/100,root=document.getElementById('casino-profit-'+i);root.textContent=`${delta>=0?'+':''}${chipsText(delta)} chips`;root.className='casino-profit '+(delta>0?'profit-win':delta<0?'profit-loss':'profit-push');s.react?.(i,delta>0?'win':delta<0?'sad':'happy',2);}sound(state.chips.some((n,i)=>n>before[i])?'win':'card');}
function wireWagers(s,state,locked,render){for(let i=0;i<2;i++){
 const change=delta=>{if(state.phase!=='betting'||state.locked[i])return;state.bets[i]=Math.round(Math.max(2,Math.min(state.chips[i],state.bets[i]+delta))*100)/100;render();};
 casinoTap(s,document.getElementById('casino-less-'+i),()=>change(-1));casinoTap(s,document.getElementById('casino-more-'+i),()=>change(1));
 casinoTap(s,document.getElementById('casino-all-'+i),()=>{if(state.phase==='betting'&&!state.locked[i]){state.bets[i]=state.chips[i];render();}});
 casinoTap(s,document.getElementById('casino-lock-'+i),()=>{if(state.phase!=='betting'||state.locked[i]||state.bets[i]<2||state.bets[i]>state.chips[i])return;state.locked[i]=true;setCasinoStatus(i,'WAGER LOCKED');render();if(state.locked.every(Boolean))void locked();});
}}
function wireCashout(s,state){const root=document.getElementById('casino-cashout');state.cashout=[false,false];for(let i=0;i<2;i++)casinoTap(s,document.getElementById('casino-cashout-'+i),()=>{if(state.phase!=='result'||busted(state.chips))return;state.cashout[i]=!state.cashout[i];document.getElementById('casino-cashout-'+i).classList.toggle('selected',state.cashout[i]);announce(`${s.players[i].name} ${state.cashout[i]?'is ready to cash out':'keeps playing'}. Both players must agree.`);if(state.cashout.every(Boolean))s.finish(state.chips,casinoResultLabel(state.chips,s.players));});return ()=>{root.hidden=state.phase!=='result'||busted(state.chips);};}

// vs CPU: seat 2 is played for the human's opponent. It sizes and locks its wager (bolder on Hard), takes a side via choose(state),
// plays its hand via act(state,skill), and agrees to cash out whenever the human asks. Its controls ignore the human's taps.
function casinoCpu(s,{choose,act}={}){
 if(s.solo?.kind!=='cpu')return;const {cpuSkill}=require("src/engines/cpuKit.js");s.hotseat=true;document.getElementById('casino-seat-1')?.classList.add('cpu-seat');let t=0,lastRound=-1;
 s.frame(dt=>{t+=dt;if(t<.75)return;t=0;const st=s.debug;if(!st||!Array.isArray(st.chips)||s.paused)return;const sk=cpuSkill(s);
  if(st.phase==='betting'&&!st.locked[1]){if(lastRound!==st.round){lastRound=st.round;choose?.(st,sk);st.bets[1]=Math.max(2,Math.min(st.chips[1],Math.round(2+Math.random()*st.chips[1]*(.12+.3*sk))));}document.getElementById('casino-lock-1')?.click();return;}
  if(st.phase==='result'&&st.cashout?.[0]&&!st.cashout[1]){document.getElementById('casino-cashout-1')?.click();return;}
  act?.(st,sk);});
}
Object.assign(exports,{casinoCpu,chipsText,casinoWait,casinoTap,syncCards,casinoTable,paintBanks,setCasinoStatus,announce,busted,casinoResultLabel,showProfits,wireWagers,wireCashout});