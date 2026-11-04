// Blackjack at a Vegas table (id `blackjack`, engine `blackjack`; ROADMAP G1, F10). A drawn half-moon table seen from
// the players' side: a themed dealer (data/casinoDealers.js) deals from a 3-deck shoe; the two players sit in seats 2
// and 4 of five, regulars from the table's show fill some of the others and play their own hands. Real rules: $1,000
// buy-in, $25-$500 table, blackjack pays 3 to 2, insurance pays 2 to 1 when the dealer shows an ace, the dealer peeks
// for blackjack, stands on all 17s; double on any two cards, split a pair once (split aces get one card each). Seats
// act in turn from the dealer's left (screen right). The session ends when the cut card comes out (that hand is the
// last), when both players have colored up, or when nobody can cover the minimum. Score = chips in front of you.
// Break the bank (finish with $1,500+) and the dealer is impressed and joins your party (unlockBy 'dealer').
// Touch: tap chips to bet (tap the circle to take the last one back), tap the felt to HIT, swipe sideways to STAND (the
// real hand signals), or use the floating buttons. Keys: 1-4 chips, H S D P, Enter deals.
// vs CPU: seat 4 plays basic strategy (a few mistakes on Easy). Online: one table on both phones from the seed; every
// choice is sent in order ({bet}|{leave}, {ins}, {a}), the other phone waits for it, so both deal the same cards.
const {store}=require('src/state.js');
const {isCpu,cpuSkill}=require('src/engines/cpuKit.js');
const {fullBleed}=require('src/engines/fullBleed.js');
const {holdMusic,releaseMusic}=require('src/audio.js');
const {CASINO_THEMES}=require('src/data/tacticalItems.js');
const {TABLES,VEGAS_DRIFTERS}=require('src/data/casinoDealers.js');
const V=require('src/engines/vegasTable.js');
const {money,ease,FONT,BODY}=V;

const BUY_IN=1000,MIN=25,MAX=500,DECKS=3,CUT_LEFT=32,BREAK_BANK=1.5,CHIP_VALUES=[5,25,100,500];
const STOP=Symbol('stop');
const {cardVal,total,isBJ,basic}=require('src/engines/blackjackRules.js');

async function vegasBlackjack(s){
 const [c,x]=s.canvas(680,780,{fill:true}),fb=fullBleed(s,{bg:'#0b0709'});
 const net=s.online||null,cpu=isCpu(s);if(net||cpu)s.hotseat=true;s.shared=true;
 const calm=!!store.profile?.settings.reducedMotion,snd=V.tableSound(s);holdMusic(6*3600);s.cleanup(()=>releaseMusic());
 const rand=()=>s.random();
 // ---- the table: theme, dealer, regulars
 const base=s.game.id.includes('bond')?CASINO_THEMES[0]:CASINO_THEMES[Math.floor(rand()*CASINO_THEMES.length)],TB=TABLES[base.id]||TABLES.bond,theme={...TB,id:base.id,source:base.source};
 let known=new Set();try{known=new Set(require('src/characters.js').CHARACTERS.map(q=>q.id));}catch{}
 const playerIds=new Set(s.players.map(p=>p.character));
 const regPool=[...TB.regulars,...(TB.regulars.length<3?VEGAS_DRIFTERS:[])].filter(id=>known.has(id)&&!playerIds.has(id)&&id!==TB.dealer);
 const dealerId=known.has(TB.dealer)?TB.dealer:(regPool.shift()||'quark');
 const nameOf=id=>{try{return require('src/characters.js').character(id)?.name||id;}catch{return id;}};
 const short=n=>String(n).split(' · ')[0].split(' ')[0].toUpperCase().slice(0,10);
 // seats: index 0..4 left to right on screen; players in 1 (P1) and 3 (P2); regulars in some of 0, 2, 4
 const seats=[0,1,2,3,4].map(i=>({i,kind:'empty',hands:[],ins:0,mood:'normal',moodT:0,say:'',sayT:0}));
 seats[1]=Object.assign(seats[1],{kind:'human',p:0,id:s.players[0].character,name:short(s.players[0].name)});
 seats[3]=Object.assign(seats[3],{kind:'human',p:1,id:s.players[1].character,name:short(s.players[1].name)});
 {const free=[0,2,4],n=Math.min(regPool.length,1+Math.floor(rand()*3)),pool=[...regPool];for(let k=0;k<n;k++){const at=free.splice(Math.floor(rand()*free.length),1)[0],id=pool.splice(Math.floor(rand()*pool.length),1)[0];seats[at]=Object.assign(seats[at],{kind:'extra',id,name:short(nameOf(id))});}}
 const seatOf=p=>seats[p===0?1:3];
 // ---- state
 const st={bank:[BUY_IN,BUY_IN],out:[false,false],lastBet:[MIN,MIN],round:0,phase:'intro',shoe:[],dealt:0,last:false,dealer:{cards:[]},
  active:null,ui:null,banner:null,flights:[],reach:null,say:'',sayT:0,dmood:'normal',dmoodT:0,peak:[BUY_IN,BUY_IN],bjs:[0,0],fast:false,auto:false,impressed:[false,false],leaveAt:net?3:Infinity,pressId:null,pressT:-9};
 let T=0,L=null,room=null,felt=null,layKey='',hits=[];
 const local=p=>net?p===net.me:!(cpu&&p===1);
 const W8=async ms=>{if(!await s.wait(st.fast?ms*.25:calm?ms*.7:ms))throw STOP;};
 const scores=()=>s.setScores?.(st.bank.map(v=>Math.floor(v)));
 const sayD=(kind,secs=2.4)=>{const l=TB.lines[kind];if(!l)return;st.say=l[Math.floor(Math.random()*l.length)];st.sayT=T+secs;};
 const dmood=(m,secs=2)=>{st.dmood=m;st.dmoodT=T+secs;};
 const moodS=(seat,m,secs=2.2)=>{seat.mood=m;seat.moodT=T+secs;};
 const banner=(text,color='#ffd23f',secs=1.6)=>{st.banner={text,color,t0:T,until:T+secs};};
 // ---- the shoe
 function newShoe(){const cards=[];for(let d=0;d<DECKS;d++)for(const su of V.SUITS)for(let r=1;r<=13;r++)cards.push({r,s:su});for(let i=cards.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}st.shoe=cards;st.last=false;}
 const cutLeft=()=>st.fast?Math.max(12,st.shoe.length-60):CUT_LEFT;
 // ---- layout
 function lay(){const k=s.W+'x'+s.H;if(k===layKey&&L)return L;layKey=k;L=V.tableLayout(s.W,s.H,(fb.top||40)+4);room=V.roomLayer(s.W,s.H,theme,L);felt=V.tableLayer(s.W,s.H,theme,L,{rules:['BLACKJACK PAYS 3 TO 2','DEALER STANDS ON ALL 17s'],ins:'INSURANCE PAYS 2 TO 1'});return L;}
 // where a seat's hand j (of n) and its card k sit
 // a hand sits in front of its bet circle, toward the dealer; split hands side by side; cards fan to the player's right
 function handBase(seat,j,n){const sp=L.spots[seat.i],off=(j-(n-1)/2)*L.cw*1.45,d=L.cw*.5+L.ch*.56;return {x:sp.bx+sp.nx*d+sp.tx*off,y:sp.by+sp.ny*d+sp.ty*off,bx:sp.bx+sp.tx*off,by:sp.by+sp.ty*off,ang:sp.ang*.8,sp};}
 function cardPos(seat,j,n,k){const b=handBase(seat,j,n),sp=b.sp,cnt=Math.max(1,seat.hands[j]?.cards.length||1),fan=L.cw*.27,shift=-(cnt-1)*fan*.5;
  return {x:b.x-sp.tx*(shift+k*fan)+sp.nx*k*L.ch*.06,y:b.y-sp.ty*(shift+k*fan)+sp.ny*k*L.ch*.06,a:b.ang};}
 const dealerPos=k=>{const n=Math.max(2,st.dealer.cards.length);return {x:L.dealerCards.x+(k-(n-1)/2)*L.cw*.62,y:L.dealerCards.y,a:0};};
 // ---- dealing
 function draw1(){if(st.shoe.length<=cutLeft()&&!st.last){st.last=true;banner('CUT CARD · LAST HAND','#ff7a6a',2);sayD('shuffle');}return st.shoe.pop()||{r:1+Math.floor(rand()*13),s:'s'};}
 async function dealTo(hand,up,where){const card=draw1();Object.assign(card,{up,t0:T,fx:L.shoe.x,fy:L.shoe.y,flipT:up?T+.12:null});hand.cards.push(card);st.dealt++;snd.card();st.reach={where,t0:T};await W8(st.fast?60:300);return card;}
 // ---- choices: local finger, the CPU, or the other phone
 function ask(p,mode,opts={}){
  if(net&&p!==net.me)return net.next().then(m=>m||(mode==='bet'?{leave:1}:mode==='ins'?{ins:0}:{a:'s'}));
  if(cpu&&p===1)return W8(500+Math.random()*700).then(()=>cpuChoice(mode,opts));
  return new Promise(res=>{st.ui={mode,p,opts,res:v=>{st.ui=null;if(net)net.send(v);res(v);}};if(mode==='bet')st.ui.opts={...opts,bet:[],};});}
 function cpuChoice(mode,o){const sk=cpuSkill(s),bank=st.bank[1];
  if(mode==='bet'){const want=Math.round(bank*(.06+.14*sk+Math.random()*.08)/5)*5;return {bet:Math.max(MIN,Math.min(MAX,bank,want))};}
  if(mode==='ins')return {ins:Math.random()<(1-sk)*.25?1:0};
  let a=basic(o.cards,st.dealer.cards[0],o.canD,o.canP);if(Math.random()<(1-sk)*.22)a=total(o.cards).t<15?'h':'s';if(a==='d'&&!o.canD)a='h';if(a==='p'&&!o.canP)a='h';return {a};}
 // ---- round flow
 async function round(){
  st.round++;st.phase='bet';st.dealer={cards:[]};for(const se of seats){se.hands=[];se.ins=0;}
  if(!st.shoe.length||st.shoe.length<=cutLeft()){st.phase='shuffle';sayD('shuffle',2.2);snd.riffle();await W8(1400);newShoe();}
  sayD('bet',2);
  // bets: regulars first (they're quick), then the players in seat order from the dealer's left
  for(const se of seats)if(se.kind==='extra'){const b=Math.round((MIN+rand()*150)/5)*5;se.hands=[{cards:[],bet:b,done:false}];snd.chips(2);}
  for(const p of [0,1]){if(st.out[p])continue;const se=seatOf(p);st.active={seat:se.i,hand:0,bet:true};
   const m=await ask(p,'bet',{bank:st.bank[p]});if(m.leave||!(m.bet>=MIN)){st.out[p]=true;banner(`${se.name} COLORS UP`,'#7dd3fc',1.6);snd.chips(6);moodS(se,'win');continue;}
   const b=Math.max(MIN,Math.min(MAX,st.bank[p],Math.round(m.bet*2)/2));st.bank[p]-=b;st.lastBet[p]=b;se.hands=[{cards:[],bet:b,done:false}];snd.chips(4);scores();}
  st.active=null;
  const live=seats.filter(se=>se.hands.length);if(!seats.some(se=>se.kind==='human'&&se.hands.length))return;
  // deal: two rounds from the dealer's left (screen right), dealer up card then hole card
  st.phase='deal';const order=[...live].sort((a,b)=>b.i-a.i);
  for(let r=0;r<2;r++){for(const se of order)await dealTo(se.hands[0],true,{seat:se,j:0});await dealTo(st.dealer,r===0,{dealer:true});}
  const up=st.dealer.cards[0];
  // insurance when the dealer shows an ace
  if(up.r===1){st.phase='ins';banner('INSURANCE?','#ffd23f',1.4);for(const se of order){if(se.kind==='extra'||isBJ(se.hands[0].cards))continue;const p=se.p,cost=Math.floor(se.hands[0].bet/2);if(st.bank[p]<cost||cost<1)continue;st.active={seat:se.i,hand:0};const m=await ask(p,'ins',{cost});if(m.ins){st.bank[p]-=cost;se.ins=cost;snd.chips(2);scores();}}st.active=null;}
  // dealer peeks with an ace or a ten showing
  if(cardVal(up)>=10){st.phase='peek';await W8(500);if(isBJ(st.dealer.cards)){await reveal();banner('DEALER BLACKJACK','#ff7a6a',1.8);dmood('win');sayD('house');for(const se of live){if(se.ins){const p=se.p;st.bank[p]+=se.ins*3;fly(se.ins*3,L.cx,L.y0,se);tag(se.hands[0],`INSURANCE +${money(se.ins*2)}`,'#7dff9a');}const h=se.hands[0];if(isBJ(h.cards))settle(se,h,'push');else settle(se,h,'lose');}await W8(1600);return endRound();}
   for(const se of live)if(se.ins){tag(se.hands[0],'INSURANCE LOST','#ff9a8a');flyBack(se.ins,se,0);se.ins=0;}}
  // naturals pay at once
  for(const se of live){const h=se.hands[0];if(isBJ(h.cards)){h.done=true;settle(se,h,'bj');snd.win(true);if(se.kind==='human'){st.bjs[se.p]++;moodS(se,'win',3);banner('BLACKJACK!','#ffd23f',1.5);}sayD('bj');await W8(700);}}
  // each seat plays in turn
  st.phase='play';
  for(const se of order){for(let j=0;j<se.hands.length;j++){const h=se.hands[j];if(h.done)continue;st.active={seat:se.i,hand:j};await playHand(se,h,j);await W8(240);}}
  st.active=null;
  // dealer's turn
  st.phase='dealer';const stillIn=live.flatMap(se=>se.hands.filter(h=>!h.settled));await reveal();
  if(stillIn.length){while(total(st.dealer.cards).t<17){await W8(380);await dealTo(st.dealer,true,{dealer:true});}}
  const dt=total(st.dealer.cards).t,dbust=dt>21;if(dbust){banner('DEALER BUSTS','#7dff9a',1.4);dmood('sad');sayD('bust');snd.crowd(1);}else if(stillIn.length){dealerSays(dt);}
  await W8(600);
  // pay from the dealer's right to left (screen left first, the way a dealer sweeps)
  for(const se of [...live].sort((a,b)=>a.i-b.i))for(const h of se.hands){if(h.settled)continue;const ht=total(h.cards).t;settle(se,h,dbust||ht>dt?'win':ht===dt?'push':'lose');await W8(320);}
  await W8(900);return endRound();}
 function dealerSays(dt){const won=seats.some(se=>se.hands.some(h=>!h.settled&&total(h.cards).t>dt&&total(h.cards).t<=21));if(won){dmood('sad');sayD('win');}else{dmood('win');sayD('house');}}
 async function reveal(){const hole=st.dealer.cards[1];if(hole&&!hole.up){hole.up=true;hole.flipT=T;snd.flip();await W8(450);}}
 async function playHand(se,h,j){
  for(;;){const {t}=total(h.cards);if(t>=21||h.done)break;
   const p=se.p,first=h.cards.length===2,canD=first&&(se.kind==='extra'||st.bank[p]>=h.bet)&&!h.aces,canP=first&&se.hands.length===1&&cardVal(h.cards[0])===cardVal(h.cards[1])&&(se.kind==='human'&&st.bank[p]>=h.bet);
   let a;if(se.kind==='extra'){await W8(650);a=basic(h.cards,st.dealer.cards[0],canD,false);if(a==='p')a='h';xSay(se,a);}else{const m=await ask(p,'play',{cards:h.cards,canD,canP});a=m?.a||'s';if(a==='d'&&!canD)a='h';if(a==='p'&&!canP)a='h';}
   if(a==='s'){h.done=true;tag(h,'STAND','#e8e8e8',.9);break;}
   if(a==='p'){st.bank[p]-=h.bet;scores();const old=cardPos(se,0,1,1),c2=h.cards.pop();Object.assign(c2,{t0:T,fx:old.x,fy:old.y});const h2={cards:[c2],bet:h.bet,done:false,aces:c2.r===1};h.aces=h.cards[0].r===1;se.hands.push(h2);snd.chips(3);banner('SPLIT','#7dd3fc',1);
    await dealTo(h,true,{seat:se,j:0});await dealTo(h2,true,{seat:se,j:1});
    if(h.aces){h.done=true;h2.done=true;tag(h,'ONE CARD','#e8e8e8',1);tag(h2,'ONE CARD','#e8e8e8',1);}
    for(const hh of se.hands)if(total(hh.cards).t===21)hh.done=true;
    if(h.done)break;continue;}
   if(a==='d'){if(se.kind==='human'){st.bank[p]-=h.bet;scores();}h.bet*=2;h.doubled=true;snd.chips(3);await dealTo(h,true,{seat:se,j});h.done=true;
    if(total(h.cards).t>21){bust(se,h);}break;}
   await dealTo(h,true,{seat:se,j});if(total(h.cards).t>21){bust(se,h);break;}}
}
 function bust(se,h){h.done=true;snd.bust();settle(se,h,'bust');if(se.kind==='human')moodS(se,'sad',2.6);else xSay(se,'bust');}
 const XLINES={h:['Hit me.','Card.','One more.'],s:['Stay.','I’m good.','Stick.'],d:['Double!','Double down!'],bust:['Ugh.','Too many!','Bust!'],win:['Yes!','Pay me!'],lose:['Ugh.','Figures.']};
 function xSay(se,a){const l=XLINES[a];if(!l||Math.random()<.45)return;se.say=l[Math.floor(Math.random()*l.length)];se.sayT=T+1.3;}
 function tag(h,text,color,secs=2.4){h.tag={text,color,t0:T,until:T+secs};}
 // settle one hand: result shows, chips fly (dealer pays from the rack, or sweeps the bet)
 function settle(se,h,res){if(h.settled)return;h.settled=true;h.res=res;const p=se.p,human=se.kind==='human';
  const back=res==='bj'?h.bet*2.5:res==='win'?h.bet*2:res==='push'?h.bet:0;
  if(human){st.bank[p]+=back;st.peak[p]=Math.max(st.peak[p],st.bank[p]);scores();}
  const j=se.hands.indexOf(h);
  if(res==='bj'||res==='win'){h.paid=back-h.bet;h.paidT=T+.45;}
  if(res==='bj'){tag(h,`BLACKJACK +${money(h.bet*1.5)}`,'#ffd23f',3);fly(h.bet*1.5,L.cx,L.y0,se,j);}
  else if(res==='win'){tag(h,`WIN +${money(h.bet)}`,'#7dff9a',3);fly(h.bet,L.cx,L.y0,se,j);if(human){moodS(se,'win');snd.win(h.bet>=200);}else xSay(se,'win');}
  else if(res==='push'){tag(h,'PUSH','#e8e8e8',2.4);}
  else{tag(h,res==='bust'?`BUST −${money(h.bet)}`:`LOSE −${money(h.bet)}`,'#ff8a7a',3);flyBack(h.bet,se,j,true);h.gone=true;if(human){moodS(se,'sad');if(res!=='bust')snd.lose();}else if(res!=='bust')xSay(se,'lose');}}
 // chip flights: winnings from the rack to the bet circle; a lost bet swept to the rack
 function fly(amount,fx,fy,se,j=0){const n=se.hands.length||1;st.flights.push({amount,fx,fy,to:()=>{const b=handBase(se,j,n);return {x:b.bx+L.cw*.42,y:b.by};},t0:T,dur:.45});snd.chips(3);}
 function flyBack(amount,se,j,toRack=true){const n=se.hands.length||1,b=handBase(se,j,n);st.flights.push({amount,fx:b.bx,fy:b.by,to:()=>({x:L.cx+(Math.random()-.5)*L.cw,y:L.y0-L.rail*.1}),t0:T,dur:.45});snd.chips(2);}
 async function endRound(){
  st.phase='result';await W8(400);
  // the players collect their chips, cards go to the discard tray
  for(const se of seats)for(const h of se.hands){for(const card of h.cards){card.lt0=T;card.lfx=null;}h.collect=T;}for(const card of st.dealer.cards)card.lt0=T;snd.slide();
  await W8(550);for(const se of seats){se.hands=[];se.ins=0;}st.dealer={cards:[]};
  if(st.last||st.out.every(Boolean)||[0,1].every(p=>st.out[p]||st.bank[p]<MIN))return;
  for(const p of [0,1])if(!st.out[p]&&st.bank[p]<MIN){st.out[p]=true;banner(`${seatOf(p).name} IS TAPPED OUT`,'#ff8a7a',2);moodS(seatOf(p),'sad',3);await W8(1200);}
 }
 function over(){return st.last&&st.phase==='result'||[0,1].every(p=>st.out[p]||st.bank[p]<MIN);}
 // ---- input
 const keyMap={'1':5,'2':25,'3':100,'4':500};
 function act(id){const u=st.ui;if(!u||s.paused)return;snd.tap();
  if(u.mode==='bet'){const o=u.opts,sum=o.bet.reduce((a,b)=>a+b,0);
   if(id.startsWith('chip:')){const v=+id.slice(5);if(sum+v<=Math.min(MAX,st.bank[u.p])){o.bet.push(v);snd.chips(1);}else{o.flash=T;}return;}
   if(id==='undo'){if(o.bet.length){o.bet.pop();snd.chips(1);}return;}
   if(id==='clear'){o.bet=[];return;}
   if(id==='rebet'){const v=Math.min(st.lastBet[u.p],MAX,st.bank[u.p]);o.bet=V.breakdown(v,[500,100,25,5]);snd.chips(3);return;}
   if(id==='deal'){if(sum>=MIN)u.res({bet:sum});return;}
   if(id==='leave'){u.res({leave:1});return;}return;}
  if(u.mode==='ins'){if(id==='yes')u.res({ins:1});if(id==='no')u.res({ins:0});return;}
  if(u.mode==='play'){const o=u.opts;if(id==='h')u.res({a:'h'});if(id==='s')u.res({a:'s'});if(id==='d'&&o.canD)u.res({a:'d'});if(id==='p'&&o.canP)u.res({a:'p'});}}
 let drag=null;
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev),b=hits.find(h=>h.on!==false&&p.x>=h.X&&p.x<=h.X+h.w&&p.y>=h.Y&&p.y<=h.Y+h.h);
  if(b){st.pressId=b.id;st.pressT=T;act(b.id);return;}drag={id:ev.pointerId,x:p.x,y:p.y,t:T};s.capture(ev);});
 for(const ty of ['pointerup','pointercancel'])s.on(c,ty,ev=>{if(!drag||ev.pointerId!==drag.id)return;s.release(ev);const p=s.pointer(ev),d=drag;drag=null;if(ty!=='pointerup'||!st.ui||!L)return;
  const dx=p.x-d.x,dy=p.y-d.y;if(st.ui.mode==='play'){if(Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy)*1.3){act('s');showSignal('wave');}else if(Math.hypot(dx,dy)<16&&d.y>L.y0&&d.y<L.B&&d.x<L.TW){act('h');showSignal('tap');}}
  else if(st.ui.mode==='bet'){const sp=L.spots[seatOf(st.ui.p).i];if(Math.hypot(d.x-sp.bx,d.y-sp.by)<L.cw*.8)act('undo');}});
 s.on(document,'keydown',ev=>{if(!st.ui||s.paused)return;const k=ev.key.toLowerCase();let id=null;if(st.ui.mode==='bet'){if(keyMap[k])id='chip:'+keyMap[k];else if(k==='enter'||k===' ')id='deal';else if(k==='backspace')id='undo';else if(k==='r')id='rebet';}
  else if(st.ui.mode==='ins'){if(k==='y')id='yes';if(k==='n'||k==='enter')id='no';}else if(st.ui.mode==='play'){if('hsdp'.includes(k)&&k.length===1)id=k;if(k==='enter')id='s';if(k===' ')id='h';}
  if(id){ev.preventDefault();act(id);}});
 let signal=null;const showSignal=k=>{signal={k,t0:T};};
 // ---- drawing
 function drawCard(card,pos,dim=false){const w=Math.round(L.cw),h=w*1.4;let px=pos.x,py=pos.y,a=pos.a||0,sx=1;
  const f=card.t0!=null?ease((T-card.t0)/(st.fast?.12:.32)):1;if(f<1){px=card.fx+(pos.x-card.fx)*f;py=card.fy+(pos.y-card.fy)*f-Math.sin(f*Math.PI)*L.cw*.35;a=a+(1-f)*.9;}
  if(card.lt0!=null){const g=ease((T-card.lt0)/.45);px=px+(L.discard.x-px)*g;py=py+(L.discard.y-py)*g;a=a*(1-g)+.1*g;}
  let faceUp=card.up&&(card.flipT==null||T>=card.flipT);if(card.up&&card.flipT!=null){const ft=(T-card.flipT)/.22;if(ft<1){sx=Math.abs(Math.cos(Math.max(0,ft)*Math.PI));faceUp=ft>.5;}}
  const img=faceUp?V.cardImg(card.r,card.s,w):V.backImg(w,theme);x.save();x.translate(px,py);x.rotate(a);x.scale(Math.max(.04,sx),1);x.shadowColor='rgba(0,0,0,.45)';x.shadowBlur=6;x.shadowOffsetY=2;x.drawImage(img,-w/2,-h/2,w,h);x.restore();if(dim){x.save();x.globalAlpha=.25;x.fillStyle='#000';x.translate(px,py);x.rotate(a);V.rr(x,-w/2,-h/2,w,h,w*.09);x.fill();x.restore();}}
 function pill(text,px,py,color='#111',bg='rgba(255,255,255,.92)',fs=11){x.save();x.font=`900 ${fs}px ${BODY}`;const w=x.measureText(text).width+fs*1.1,h=fs*1.55;V.rr(x,px-w/2,py-h/2,w,h,h/2);x.fillStyle=bg;x.fill();x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.fillText(text,px,py+.5);x.restore();}
 function render(){lay();const {W,H}=L;x.setTransform(1,0,0,1,0,0);x.drawImage(room,0,0,W,H);
  // dealer behind the table
  const rest={x:L.cx+L.hd*.62,y:L.y0+L.hd*.1};let hand=rest;if(st.reach){const t=(T-st.reach.t0)/.32;if(t<1){const w=st.reach.where,tgt=w.dealer?dealerPos(st.dealer.cards.length-1):(()=>{const se=w.seat,hh=se.hands[w.j]||se.hands[0];return cardPos(se,w.j,se.hands.length||1,(hh?.cards.length||1)-1);})(),k=Math.sin(t*Math.PI)*.55;const from={x:L.shoe.x-L.cw*.3,y:L.shoe.y-L.cw*.2};hand={x:from.x+(tgt.x-from.x)*k,y:Math.min(L.y0+L.ry*.45,from.y+(tgt.y-from.y)*k)};}}
  V.drawDealer(x,L,theme,dealerId,st.dmoodT>T?st.dmood:'normal',hand,T);
  x.drawImage(felt,0,0,W,H);
  // seats: bets, insurance, heads + name plates
  const act0=st.active;
  for(const se of seats){const sp=L.spots[se.i];
   if(se.kind==='empty')continue;const isAct=act0&&act0.seat===se.i;
   if(isAct){const pulse=.5+.5*Math.sin(T*6);x.save();x.strokeStyle=`rgba(255,226,120,${.45+.45*pulse})`;x.lineWidth=3;x.beginPath();x.ellipse(sp.bx,sp.by,L.cw*.62,L.cw*.62*V.SQ*1.1,0,0,7);x.stroke();x.restore();}
   const n=se.hands.length||1;se.hands.forEach((h,j)=>{if(h.gone&&T-h.tag?.t0>.5)return;const b=handBase(se,j,n);const coll=h.collect!=null?ease((T-h.collect)/.45):0;const px=b.bx+(sp.hx-b.bx)*coll,py=b.by+(sp.hy-b.by)*coll;if(!h.gone||T-h.tag.t0<.05)V.drawStack(x,h.bet,px,py,L.cw*.62);if(h.paid&&T>=h.paidT)V.drawStack(x,h.paid,px+L.cw*.42*(1-coll),py,L.cw*.62);});
   if(se.ins){const b=handBase(se,0,n),ix=b.bx+(L.cx-b.bx)*.42,iy=b.by+(L.y0-b.by)*.42;V.drawStack(x,se.ins,ix,iy,L.cw*.5);}
   // live bet being built
   if(st.ui?.mode==='bet'&&seatOf(st.ui.p)===se){const sum=st.ui.opts.bet.reduce((a,b)=>a+b,0);if(sum)V.drawStack(x,sum,sp.bx,sp.by,L.cw*.62);pill(sum?money(sum):'BET',sp.bx,sp.by+L.cw*.62,'#111','rgba(255,226,120,.95)',Math.max(10,L.cw*.24));}
   const hc=V.head(se.id,se.moodT>T?se.mood:'normal'),hs=L.ph*1.15,bob=isAct?Math.sin(T*4)*2:0;if(hc){x.save();x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=8;x.drawImage(hc,sp.hx-hs/2,sp.hy-hs*.62+bob,hs,hs);x.restore();}
   const bank=se.kind==='human'?money(st.bank[se.p]):'';pill(se.kind==='human'?`${se.name} ${bank}`:se.name,sp.hx,sp.hy+hs*.42,se.kind==='human'?'#2a1800':'#fff',se.kind==='human'?(se.p===0?'#ffd23f':'#9ad7ff'):'rgba(0,0,0,.6)',Math.max(9,L.ph*.2));
   if(se.kind==='human'&&st.out[se.p])pill('COLORED UP',sp.hx,sp.hy-hs*.55,'#fff','rgba(0,0,0,.7)',Math.max(8,L.ph*.16));
   if(se.say&&se.sayT>T)V.bubble(x,se.say,sp.hx,sp.hy-hs*.55,Math.max(10,L.ph*.2),{max:120});}
  // cards
  for(const se of seats){const n=se.hands.length;se.hands.forEach((h,j)=>{const dim=h.gone&&!h.cards[0]?.lt0;h.cards.forEach((card,k)=>drawCard(card,cardPos(se,j,n,k),dim));
   if(h.cards.length&&h.cards.every(cc=>cc.up)&&!h.collect){const tt=total(h.cards),p=cardPos(se,j,n,h.cards.length-1),label=isBJ(h.cards)&&se.hands.length===1?'BJ':tt.soft&&tt.t<21?`${tt.t-10}/${tt.t}`:String(tt.t);pill(label,p.x+L.cw*.42,p.y-L.ch*.42,tt.t>21?'#fff':'#111',tt.t>21?'#c8202f':'rgba(255,255,255,.92)',Math.max(9,L.cw*.22));}
   if(h.tag&&h.tag.until>T){const b=cardPos(se,j,n,Math.max(0,h.cards.length-1)),k=Math.min(1,(T-h.tag.t0)*5);x.save();x.globalAlpha=Math.min(1,(h.tag.until-T)*3);pill(h.tag.text,b.x,b.y-L.ch*(.62+.08*k),'#111',h.tag.color,Math.max(10,L.cw*.26));x.restore();}});}
  st.dealer.cards.forEach((card,k)=>drawCard(card,dealerPos(k)));
  if(st.dealer.cards.length>=2&&st.dealer.cards.every(cc=>cc.up&&(cc.flipT==null||T>cc.flipT+.2))&&!st.dealer.cards[0].lt0){const tt=total(st.dealer.cards);pill(tt.t>21?`BUST ${tt.t}`:String(tt.t),L.dealerCards.x,L.dealerCards.y+L.ch*.62,tt.t>21?'#fff':'#111',tt.t>21?'#c8202f':'rgba(255,255,255,.92)',Math.max(10,L.cw*.25));}
  // chip flights
  st.flights=st.flights.filter(f=>{const k=(T-f.t0)/f.dur;if(k>=1.2)return false;const to=f.to(),e=ease(Math.min(1,k));V.drawStack(x,f.amount,f.fx+(to.x-f.fx)*e,f.fy+(to.y-f.fy)*e-Math.sin(e*Math.PI)*L.cw*.4,L.cw*.62);return true;});
  // dealer's speech
  if(st.say&&st.sayT>T)V.bubble(x,st.say,L.cx-L.hd*.45,L.headY-L.hd*.2,Math.max(11,L.hd*.17),{dir:-1,max:Math.min(200,L.TW*.42)});
  // HUD: hand and shoe
  const hx=10,hy=(fb.top||40)<50?10:10,left=st.shoe.length,tot=DECKS*52;x.save();x.font=`400 ${Math.max(14,L.hd*.2)}px ${FONT}`;x.fillStyle='#ffe9a8';x.textAlign='left';x.textBaseline='top';x.fillText(st.round?`HAND ${st.round}`:'BLACKJACK',hx,hy);
  const bw=Math.min(90,L.W*.2),by=hy+Math.max(18,L.hd*.25);x.fillStyle='rgba(255,255,255,.18)';V.rr(x,hx,by,bw,6,3);x.fill();x.fillStyle=st.last?'#ff7a6a':'#ffd23f';V.rr(x,hx,by,bw*Math.max(0,Math.min(1,(left-cutLeft())/(tot-cutLeft()))),6,3);x.fill();
  x.font=`800 ${Math.max(9,L.hd*.12)}px ${BODY}`;x.fillStyle=st.last?'#ff9a8a':'rgba(255,255,255,.7)';x.fillText(st.last?'LAST HAND OF THE SHOE':`SHOE · ${DECKS} DECKS · $${MIN}-$${MAX}`,hx,by+10);x.restore();
  // signal ghost (tap = hit, wave = stand)
  if(signal&&T-signal.t0<.6){const k=(T-signal.t0)/.6;x.save();x.globalAlpha=1-k;x.font=`400 ${Math.max(22,L.hd*.35)}px ${FONT}`;x.fillStyle='#fff';x.textAlign='center';x.fillText(signal.k==='tap'?'HIT':'STAND',L.cx,L.B-L.ph*1.6-k*30);x.restore();}
  drawPanel();
  // banner
  if(st.banner&&st.banner.until>T){const b=st.banner,k=Math.min(1,(T-b.t0)*4),fs=Math.max(26,Math.min(L.W*.11,64));x.save();x.globalAlpha=Math.min(1,(b.until-T)*3);x.translate(L.cx,L.y0+L.ry*.36);x.scale(.7+.3*k,.7+.3*k);x.font=`400 ${fs}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=fs*.14;x.strokeStyle='#120a04';x.strokeText(b.text,0,0);x.fillStyle=b.color;x.fillText(b.text,0,0);x.restore();}}
 function wrap(text,max,size,font=`400 ${size}px ${FONT}`){x.font=font;const out=[];let cur='';for(const w of String(text).split(' ')){const t=cur?cur+' '+w:w;if(x.measureText(t).width>max&&cur){out.push(cur);cur=w;}else cur=t;}if(cur)out.push(cur);return out;}
 function drawPanel(){const {W,H,panel:P,wide}=L;hits=[];
  if(wide){const g=x.createLinearGradient(P.x,0,P.x+40,0);g.addColorStop(0,'rgba(8,5,7,.0)');g.addColorStop(1,'rgba(8,5,7,.9)');x.fillStyle=g;x.fillRect(P.x-30,0,P.w+30,H);x.fillStyle='rgba(8,5,7,.9)';x.fillRect(P.x+10,0,P.w,H);}
  else{const g=x.createLinearGradient(0,P.y-14,0,H);g.addColorStop(0,'rgba(10,6,8,0)');g.addColorStop(.2,'rgba(10,6,8,.85)');g.addColorStop(1,'rgba(10,6,8,.96)');x.fillStyle=g;x.fillRect(0,P.y-14,W,P.h+14);}
  const u=st.ui,pad=wide?12:10,fs=wide?Math.max(14,Math.min(20,P.w*.075)):Math.max(13,Math.min(19,P.h*.13)),X0=P.x+pad,Wd=P.w-pad*2,top=wide?(fb.top||40)+8:P.y+6,bottom=wide?H-34:H-32;
  const text=(t,X,Y,size=fs,col='#fff',al='left')=>{x.font=`400 ${size}px ${FONT}`;x.fillStyle=col;x.textAlign=al;x.textBaseline='middle';x.fillText(t,X,Y);};
  const small=(t,X,Y,al='left',col='rgba(255,255,255,.75)')=>{x.font=`800 ${fs*.68}px ${BODY}`;x.fillStyle=col;x.textAlign=al;x.textBaseline='middle';x.fillText(t,X,Y);};
  const btn=o=>{hits.push(V.button(x,{...o,hot:st.pressId===o.id&&T-st.pressT<.15}));};
  // a column of buttons (wide) or a row (tall), filling from the bottom
  const lay=(list,{h=wide?Math.min(58,(bottom-top)*.14):Math.min(60,P.h*.42),cols=wide?1:list.length}={})=>{const rows=Math.ceil(list.length/cols),bw=(Wd-pad*(cols-1))/cols;list.forEach((b,i)=>{const r=Math.floor(i/cols),c=i%cols;btn({...b,X:X0+c*(bw+pad),Y:bottom-(rows-r)*(h+pad*.8)+pad*.8,w:bw,h});});return bottom-rows*(h+pad*.8);};
  if(!u){const who=st.active?seats[st.active.seat]:null;let msg=st.phase==='shuffle'?'THE DEALER SHUFFLES A FRESH SHOE':st.phase==='deal'?'DEALING…':st.phase==='ins'?'INSURANCE?':st.phase==='dealer'?'DEALER’S TURN':st.phase==='result'?'SETTLING UP':st.phase==='end'?'THE TABLE IS CLOSING':'';
   if(who&&who.kind==='human')msg=net&&who.p!==net.me?`${who.name} IS PLAYING ON THEIR PHONE…`:cpu&&who.p===1?`${who.name} IS THINKING…`:msg;else if(who&&who.kind==='extra')msg=`${who.name} IS PLAYING`;
   const lines=wrap(msg,Wd,fs*1.05),cy=wide?H*.45:P.y+P.h*.42;lines.forEach((l,i)=>text(l,P.x+P.w/2,cy+(i-(lines.length-1)/2)*fs*1.25,fs*1.05,'#ffe9a8','center'));return;}
  const se=seatOf(u.p),col=u.p===0?'#ffd23f':'#9ad7ff';
  if(u.mode==='bet'){const o=u.opts,sum=o.bet.reduce((a,b)=>a+b,0),bank=st.bank[u.p],room=Math.min(MAX,bank);
   text(`${se.name}’S BET`,X0,top+fs*.6,fs,col);text(sum?money(sum):'—',X0+Wd,top+fs*.6,fs,'#fff','right');small(`BANK ${money(bank-sum)} · TABLE ${money(MIN)}-${money(MAX)}`,X0,top+fs*1.7);if(wide)small('Tap chips · tap the circle to take one back',X0,top+fs*2.5);
   const btnTop=lay([{id:'leave',label:'COLOR UP',sub:'leave the table'},{id:'rebet',label:'REBET',sub:money(Math.min(st.lastBet[u.p],room)),on:!sum},{id:'clear',label:'CLEAR',on:sum>0},{id:'deal',label:'DEAL',sub:sum<MIN?`min ${money(MIN)}`:money(sum),tone:'gold',on:sum>=MIN}],{cols:wide?2:4,h:wide?Math.min(54,(bottom-top)*.13):Math.min(46,P.h*.24)});
   // chips: a row (tall) or a 2x2 grid (wide), sized to the room left
   const n=CHIP_VALUES.length,cols=wide?2:4,rows=n/cols,areaTop=top+fs*(wide?3:2.4),areaH=btnTop-areaTop-pad,cd=Math.max(26,Math.min(Wd/cols*.66,areaH/rows/(V.SQ+.42),70));
   CHIP_VALUES.forEach((v,i)=>{const r=Math.floor(i/cols),c=i%cols,cx=X0+Wd*(c+.5)/cols,cy=areaTop+areaH*(r+.55)/rows,on=sum+v<=room,img=V.chipImg(v,Math.round(cd));x.save();x.globalAlpha=on?1:.35;for(let k=0;k<3;k++)x.drawImage(img,cx-cd/2,cy-cd*V.SQ/2-k*cd*.13,cd+2,cd*V.SQ+cd*.13+2);x.restore();hits.push({id:'chip:'+v,X:cx-cd*.62,Y:cy-cd*.75,w:cd*1.24,h:cd*1.2,on});});
   return;}
  if(u.mode==='ins'){const l=wrap(`${se.name} · INSURANCE? COSTS ${money(u.opts.cost)}`,Wd,fs);l.forEach((t,i)=>text(t,X0,top+fs*(.6+i*1.2),fs,col));lay([{id:'no',label:'NO THANKS'},{id:'yes',label:'INSURE',sub:'pays 2 to 1',tone:'green'}],{cols:wide?1:2});return;}
  if(u.mode==='play'){const o=u.opts,tt=total(o.cards),up=st.dealer.cards[0],uv=cardVal(up)===11?'ACE':cardVal(up);
   text(`${se.name} · ${tt.soft&&tt.t<21?`SOFT ${tt.t}`:tt.t}`,X0,top+fs*.6,fs,col);wrap(`DEALER SHOWS ${uv} · TAP THE FELT = HIT · SWIPE = STAND`,Wd,fs*.68,`800 ${fs*.68}px ${BODY}`).forEach((l,i)=>small(l,X0,top+fs*(1.7+i*.85)));
   const list=[{id:'s',label:'STAND',sub:'swipe ↔',tone:'red'},{id:'h',label:'HIT',sub:'tap the felt',tone:'green'},o.canD&&{id:'d',label:'DOUBLE',sub:'one card',tone:'gold'},o.canP&&{id:'p',label:'SPLIT',sub:'two hands',tone:'dark'}].filter(Boolean);
   lay(wide?list.reverse():list,{h:wide?Math.min(64,(bottom-top)*.16):Math.min(62,P.h*.46)});}}
 s.frame(dt=>{T+=dt;if(st.auto)botAct();render();});
 // ---- bots: s.debug.bot() plays this phone's own choice (online test); st.auto plays every local choice (offline test)
 let botT=0;function botAct(){const u=st.ui;if(!u)return null;if(T<botT)return null;botT=T+(st.fast?.05:.35);
  if(u.mode==='bet'){if(st.round>=st.leaveAt){u.res({leave:1});return 'leave';}u.res({bet:Math.min(st.bank[u.p],MIN*(1+Math.floor(Math.random()*4)))});return 'bet';}
  if(u.mode==='ins'){u.res({ins:0});return 'ins';}
  if(u.mode==='play'){const o=u.opts;u.res({a:basic(o.cards,st.dealer.cards[0],o.canD,o.canP)});return 'play';}return null;}
 s.debug={engine:'vegas-blackjack',st,seats,get T(){return T;},total,basic,bot:()=>botAct(),layout:()=>L,hits:()=>hits,dealerId,theme:theme.id};
 // ---- the session
 try{
  lay();snd.ambience(true);snd.music(true);sayD('hello',2.6);dmood('win',1.5);await W8(900);newShoe();st.phase='shuffle';snd.riffle();await W8(1300);
  while(!over()){await round();if(st.last)break;}
  st.phase='end';st.active=null;
  // the dealer is impressed by anyone who broke the bank
  const recruits=[[],[]];let canRec=()=>false;try{const {canRecruit}=require('src/profile.js');canRec=(id,owner)=>canRecruit(store.profile,id,owner,'dealer');}catch{}
  for(const p of [0,1]){if(cpu&&p===1)continue;if(st.bank[p]>=BUY_IN*BREAK_BANK){st.impressed[p]=true;moodS(seatOf(p),'win',4);if(canRec(dealerId,s.players[p].owner))recruits[p].push(dealerId);}}
  if(st.impressed.some(Boolean)){banner('YOU BROKE THE BANK!','#ffd23f',3);sayD('impressed',3.4);dmood('win',3.4);snd.win(true);await W8(3200);}
  else{banner(st.last?'THE SHOE IS DONE':'TABLE CLOSED','#ffe9a8',1.8);await W8(1600);}
  if(recruits.some(r=>r.length))s.gameRecruits=recruits;
  snd.stop();const fin=st.bank.map(v=>Math.floor(v)),n=s.players.map(p=>p.name);
  s.finish(fin,`${base.title} blackjack: ${n[0]} ${money(st.bank[0])} · ${n[1]} ${money(st.bank[1])}${st.impressed.some(Boolean)?` · ${nameOf(dealerId)} was impressed!`:''}`);
 }catch(e){if(e!==STOP)throw e;}
}
Object.assign(exports,{vegasBlackjack});
