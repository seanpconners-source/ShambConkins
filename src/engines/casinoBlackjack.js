const {casinoDeck, blackjackValue, blackjackOutcome}=require("src/engines/casinoCards.js");
const {casinoBot, casinoCpu, casinoTable, syncCards, casinoWait, casinoTap, paintBanks, announce, setCasinoStatus, showProfits, wireWagers, wireCashout, busted, casinoResultLabel}=require("src/engines/casinoTable.js");
const {sound}=require("src/audio.js");
async function playBlackjack(s){
 const state={chips:[10,10],bets:[2,2],locked:[false,false],hands:[[],[]],dealer:[],status:['betting','betting'],busy:[false,false],round:1,phase:'betting',revealed:false,outcomes:[]};let deck=[],before=[10,10];
 casinoTable(s,{kind:'BLACKJACK',help:'10 chips each · minimum bet 2 · below 2 chips is out · dealer stands on 17 · blackjack pays 3:2 · both players share one dealer',center:'<div class="casino-dealer"><strong>HOUSE DEALER</strong><span id="bj-dealer-total">?</span><div class="casino-hand playing-cards" id="bj-dealer-hand"></div><small>HIT BELOW 17 · STAND ON 17</small></div>'});
 for(let i=0;i<2;i++){
  document.getElementById('casino-actions-'+i).innerHTML=`<button id="bj-hit-${i}">HIT · draw a card</button><button id="bj-stand-${i}" class="primary">STAND · keep my hand</button>`;
  casinoTap(s,document.getElementById('bj-hit-'+i),()=>hit(i));casinoTap(s,document.getElementById('bj-stand-'+i),()=>stand(i));
 }
 const paintCashout=wireCashout(s,state),next=document.getElementById('casino-next');next.id='bj-next';
 casinoTap(s,next,()=>{if(state.phase!=='result')return;if(busted(state.chips))return finish();newHand();});
 function render(){
  paintBanks(s,state);syncCards(document.getElementById('bj-dealer-hand'),state.dealer,{hideIndex:state.revealed?-1:1});
  document.getElementById('bj-dealer-total').textContent=state.dealer.length?(state.revealed?blackjackValue(state.dealer):'Up card '+blackjackValue(state.dealer.slice(0,1))):'Waiting for both bets';
  state.hands.forEach((hand,i)=>{syncCards(document.getElementById('casino-hand-'+i),hand);document.getElementById('casino-total-'+i).textContent=hand.length?'HAND TOTAL · '+blackjackValue(hand):'';
   document.getElementById('casino-wager-'+i).hidden=state.phase!=='betting';document.getElementById('casino-actions-'+i).hidden=state.phase!=='playing';
   for(const action of ['hit','stand'])document.getElementById(`bj-${action}-${i}`).disabled=state.phase!=='playing'||state.status[i]!=='playing'||state.busy[i];
   document.getElementById('casino-seat-'+i).classList.toggle('seat-turn',state.phase==='playing'&&state.status[i]==='playing');
  });
  next.hidden=state.phase!=='result';next.textContent=busted(state.chips)?'See casino result':'Next shared hand';paintCashout();s.debug=state;
 }
 function finish(){s.finish(state.chips.every(n=>n<2)?[0,0]:state.chips,casinoResultLabel(state.chips,s.players));}
 function newHand(){state.round++;state.phase='betting';state.hands=[[],[]];state.dealer=[];state.locked=[false,false];state.bets=[2,2];state.status=['betting','betting'];state.busy=[false,false];state.revealed=false;state.outcomes=[];state.cashout=[false,false];for(let i=0;i<2;i++){setCasinoStatus(i,'PLACE YOUR BET');document.getElementById('casino-profit-'+i).textContent='';document.getElementById('casino-cashout-'+i).classList.remove('selected');}announce('Hand '+state.round+' · both players choose a wager');render();}
 async function deal(){
  state.phase='dealing';before=[...state.chips];deck=casinoDeck(s.random);state.chips=state.chips.map((n,i)=>n-state.bets[i]);announce('Dealing · both wagers are on the felt');for(let i=0;i<2;i++)setCasinoStatus(i,'DEALING');render();
  for(const owner of ['house',0,1,'house',0,1]){if(!s.alive)return;const hand=owner==='house'?state.dealer:state.hands[owner];hand.push(deck.pop());sound('card');render();if(!await casinoWait(s,180))return;}
  state.phase='playing';state.hands.forEach((h,i)=>{state.status[i]=blackjackValue(h)===21?'natural':'playing';setCasinoStatus(i,state.status[i]==='natural'?'BLACKJACK · WAITING FOR DEALER':'YOUR MOVE · HIT OR STAND');});announce('Both players can act on their own hand');render();
  if(blackjackValue(state.dealer)===21){state.status=['standing','standing'];void dealerTurn();}else maybeDealer();
 }
 function maybeDealer(){if(state.phase==='playing'&&state.status.every(v=>v!=='playing')&&!state.busy.some(Boolean))void dealerTurn();}
 async function hit(i){
  if(state.phase!=='playing'||state.status[i]!=='playing'||state.busy[i])return;state.busy[i]=true;state.hands[i].push(deck.pop());sound('card');setCasinoStatus(i,'DRAWING YOUR CARD');render();if(!await casinoWait(s,350))return;
  state.busy[i]=false;const total=blackjackValue(state.hands[i]);state.status[i]=total>21?'bust':total===21?'standing':'playing';setCasinoStatus(i,total>21?'BUST · HAND FINISHED':total===21?'21 · WAITING FOR DEALER':'YOUR MOVE · HIT OR STAND');s.react?.(i,total>21?'sad':'thinking');render();maybeDealer();
 }
 function stand(i){if(state.phase!=='playing'||state.status[i]!=='playing'||state.busy[i])return;state.status[i]='standing';setCasinoStatus(i,'STANDING · WAITING FOR DEALER');render();maybeDealer();}
 async function dealerTurn(){
  if(state.phase!=='playing')return;state.phase='dealer';announce('Dealer’s turn · revealing the hole card');render();if(!await casinoWait(s,400))return;state.revealed=true;sound('card');render();if(!await casinoWait(s,400))return;
  if(!state.status.every(v=>v==='bust'))while(blackjackValue(state.dealer)<17){state.dealer.push(deck.pop());announce('Dealer draws · '+blackjackValue(state.dealer));sound('card');render();if(!await casinoWait(s,450))return;}
  state.outcomes=state.hands.map(h=>blackjackOutcome(h,state.dealer));state.chips=state.chips.map((n,i)=>Math.round((n+state.bets[i]*state.outcomes[i].gross)*100)/100);state.phase='result';state.outcomes.forEach((out,i)=>setCasinoStatus(i,out.label.toUpperCase()));announce(busted(state.chips)?casinoResultLabel(state.chips,s.players):'Hand settled · study the cards, then deal again');showProfits(s,state,before);render();
 }
 // vs CPU: basic strategy: hit to 11, stand on 17, and on 12–16 hit against a dealer 7+ (looser on Easy)
 casinoCpu(s,{act:(st,sk)=>{if(st.phase!=='playing'||st.status[1]!=='playing'||st.busy[1])return;const total=blackjackValue(st.hands[1]),up=st.dealer[0]?(st.dealer[0].rank===1?11:Math.min(10,st.dealer[0].rank)):10,limit=sk>.5?17:15+Math.floor(Math.random()*3);
  const hitIt=total<=11||total<limit&&(up>=7||Math.random()<(1-sk)*.4)&&total<17;document.getElementById(hitIt?'bj-hit-1':'bj-stand-1')?.click();}});
 casinoBot(s,state,(st,me,click)=>st.phase==='playing'&&st.status[me]==='playing'&&!st.busy[me]?click(blackjackValue(st.hands[me])<=15?'bj-hit-'+me:'bj-stand-'+me):null);
 wireWagers(s,state,deal,render);render();await s.pass(0,'Both players start with 10 chips. Place separate wagers, then play your hands at the same time against ONE dealer. Minimum bet 2. Below the minimum is out. You may cash out only when both agree.','Both ready — take your seats');
}

Object.assign(exports,{playBlackjack});