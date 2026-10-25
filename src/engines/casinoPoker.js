const {casinoDeck, comparePoker, pokerRank, POKER_NAMES}=require("src/engines/casinoCards.js");
const {casinoBot, casinoCpu, casinoTable, syncCards, casinoWait, casinoTap, paintBanks, announce, setCasinoStatus, showProfits, wireWagers, wireCashout, busted, casinoResultLabel}=require("src/engines/casinoTable.js");
const {sound}=require("src/audio.js");
async function playPoker(s){
 const state={chips:[10,10],bets:[2,2],locked:[false,false],hands:[[],[]],discard:new Set(),active:0,phase:'betting',round:1,revealCount:[0,0],matched:2};let deck=[],before=[10,10];
 casinoTable(s,{kind:'FIVE CARD PANIC',help:'10 chips each · minimum wager 2 · both match the smaller chosen wager · discard up to 3 · first bankroll below 2 loses · private draws, shared showdown',center:'<div class="poker-pot"><span class="chip-stack" aria-hidden="true"><i></i><i></i><i></i></span><strong id="poker-pot">CHOOSE YOUR WAGER</strong><small>FIVE CARD DRAW · NO PEEKING</small></div>'});
 for(let i=0;i<2;i++){const actions=document.getElementById('casino-actions-'+i);actions.innerHTML=`<button id="poker-draw-${i}" class="primary">Draw replacements / stand</button>`;casinoTap(s,document.getElementById('poker-draw-'+i),()=>exchange(i));}
 const paintCashout=wireCashout(s,state),next=document.getElementById('casino-next');next.id='poker-next';
 function render(){
  paintBanks(s,state);for(let i=0;i<2;i++){
   const own=['drawing','exchanging'].includes(state.phase)&&state.active===i,all=state.phase==='result',reveal=state.phase==='revealing',root=document.getElementById('casino-hand-'+i);
   // online: your own hand stays face up on your phone; the other phone's stays face down until the reveal
   const mine=s.online?i===s.online.me:own;
   syncCards(root,state.hands[i],{hidden:reveal?index=>index>=state.revealCount[i]:!mine&&!all,selectable:true,selected:own?state.discard:new Set()});
   for(const node of root.children){node.disabled=state.phase!=='drawing'||state.active!==i;if(!node.dataset.bound){node.dataset.bound='true';casinoTap(s,node,()=>{if(state.phase!=='drawing'||state.active!==i)return;const index=+node.dataset.cardIndex;if(state.discard.has(index))state.discard.delete(index);else if(state.discard.size<3)state.discard.add(index);sound('tap');render();});}}
   document.getElementById('casino-wager-'+i).hidden=state.phase!=='betting';document.getElementById('casino-actions-'+i).hidden=state.phase!=='drawing'||state.active!==i;document.getElementById('poker-draw-'+i).textContent=state.discard.size?`Draw ${state.discard.size} replacement${state.discard.size>1?'s':''}`:'Stand · keep all five';
   document.getElementById('casino-total-'+i).textContent=state.hands[i].length===5&&(own||all||reveal&&state.revealCount[i]===5)?`${POKER_NAMES[pokerRank(state.hands[i])[0]]}${own?' · '+state.discard.size+' to exchange':''}`:state.hands[i].length?'HAND HIDDEN':'';
   document.getElementById('casino-seat-'+i).classList.toggle('seat-turn',state.phase==='drawing'&&state.active===i);
  }
  next.hidden=state.phase!=='result';next.textContent=busted(state.chips)?'See casino result':'Deal another hand';paintCashout();s.debug=state;
 }
 async function turn(i){state.active=i;state.discard=new Set();state.phase='handoff';setCasinoStatus(i,'READY TO DRAW');setCasinoStatus(1-i,'HAND HIDDEN');render();s.shared=false;if(!await s.pass(i,'Your hand is private. Choose up to THREE cards to exchange, or stand with all five. Your opponent’s hand stays face down.','Ready — show my hand'))return;s.shared=true;s.updateScores();state.phase='drawing';setCasinoStatus(i,'YOUR TURN · CHOOSE YOUR DRAW');announce(s.players[i].name+' · choose up to three cards');render();}
 async function deal(){state.phase='dealing';before=[...state.chips];state.matched=Math.min(...state.bets);state.bets=[state.matched,state.matched];state.chips=state.chips.map(n=>n-state.matched);deck=casinoDeck(s.random);document.getElementById('poker-pot').textContent=2*state.matched+' CHIP POT';announce('Dealing both hands · '+state.matched+' chips each');render();
  for(let card=0;card<5;card++)for(let owner=0;owner<2;owner++){state.hands[owner].push(deck.pop());sound('card');render();if(!await casinoWait(s,120))return;}await turn(0);
 }
 async function exchange(i){if(state.phase!=='drawing'||state.active!==i)return;state.phase='exchanging';announce(s.players[i].name+' · '+(state.discard.size?'discarding and drawing':'standing'));render();const indices=[...state.discard].sort((a,b)=>a-b);for(const index of indices)document.getElementById('casino-hand-'+i).children[index].classList.add('card-leave');if(indices.length&&!await casinoWait(s,280))return;
  for(const index of indices){state.hands[i][index]=deck.pop();state.discard.delete(index);sound('card');render();if(!await casinoWait(s,220))return;}if(!await casinoWait(s,350))return;
  if(i===0)return turn(1);state.discard=new Set();state.phase='revealing';state.revealCount=[0,0];announce('SHOWDOWN · both hands on the table');render();if(!await casinoWait(s,350))return;
  for(let count=1;count<=5;count++){state.revealCount=[count,count];sound('card');render();if(!await casinoWait(s,200))return;}
  const comparison=comparePoker(...state.hands);state.comparison=comparison;if(comparison===0)state.chips=state.chips.map(n=>n+state.matched);else state.chips[comparison>0?0:1]+=2*state.matched;state.phase='result';for(let j=0;j<2;j++)setCasinoStatus(j,comparison===0?'SPLIT POT':j===(comparison>0?0:1)?'WINNER · POT PAID':'HAND LOST');announce(comparison===0?'Split pot · matched wagers returned':s.players[comparison>0?0:1].name+' takes the '+2*state.matched+' chip pot');showProfits(s,state,before);render();
 }
 casinoTap(s,next,()=>{if(state.phase!=='result')return;if(busted(state.chips))return s.finish(state.chips,casinoResultLabel(state.chips,s.players));state.round++;state.phase='betting';state.hands=[[],[]];state.bets=[2,2];state.locked=[false,false];state.discard=new Set();state.cashout=[false,false];state.revealCount=[0,0];for(let i=0;i<2;i++){setCasinoStatus(i,'PLACE YOUR BET');document.getElementById('casino-profit-'+i).textContent='';document.getElementById('casino-cashout-'+i).classList.remove('selected');}document.getElementById('poker-pot').textContent='CHOOSE YOUR WAGER';announce('Hand '+state.round+' · choose the stakes');render();});
 // vs CPU: keep pairs and better (and four to a flush on Hard), otherwise keep the two highest cards and draw three
 casinoCpu(s,{act:(st,sk)=>{if(st.phase!=='drawing'||st.active!==1)return;const h=st.hands[1],val=c=>c.rank===1?14:c.rank,counts=new Map();h.forEach(c=>counts.set(c.rank,(counts.get(c.rank)||0)+1));
  const suits=new Map();h.forEach(c=>suits.set(c.suit,(suits.get(c.suit)||0)+1));const flushSuit=[...suits].find(([,n])=>n===4)?.[0];let keep;
  if([...counts.values()].some(n=>n>=2))keep=h.map((c,i)=>counts.get(c.rank)>=2?i:-1).filter(i=>i>=0);else if(flushSuit&&sk>.5)keep=h.map((c,i)=>c.suit===flushSuit?i:-1).filter(i=>i>=0);else keep=h.map((c,i)=>i).sort((a,b)=>val(h[b])-val(h[a])).slice(0,2);
  st.discard=new Set(h.map((c,i)=>i).filter(i=>!keep.includes(i)).slice(0,3));document.getElementById('poker-draw-1')?.click();}});
 casinoBot(s,state,(st,me,click)=>st.phase==='drawing'&&st.active===me?click('poker-draw-'+me):null);
 wireWagers(s,state,deal,render);render();await s.pass(0,'10 chips each, minimum wager 2. Both match the SMALLER chosen wager. Cards are dealt one at a time; private draws alternate, then a shared showdown pays the pot. First player unable to cover 2 chips loses, or both can agree to cash out.','Both ready — Five Card Panic');
}

Object.assign(exports,{playPoker});