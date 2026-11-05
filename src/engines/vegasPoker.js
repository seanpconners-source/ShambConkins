// Five-card draw at a Vegas table (id `five-card`, engine `poker`; ROADMAP G1). Fixed-limit draw poker as card rooms
// deal it: everyone antes $10, five cards each, a betting round at $20 (bet, call, raise, fold; four bets at most),
// the draw (throw away up to three cards, four if you keep an ace), a second round at $40, then the showdown; the best
// hand takes the pot (side pots when someone is all in). The dealer button moves round the table each hand. Regulars
// from the table's show sit in the other seats and play their own hands and stacks. Eight hands, or color up.
// Your cards: vs the CPU and online they are face up for you only; with two people on one phone they stay face down until
// you tap SHOW (the other player looks away). Tap a card to throw it away at the draw. Keys: F fold, C check/call,
// R bet/raise, 1-5 mark cards, Enter draw, S show.
// vs CPU: seat 4 plays the regulars' brain (hand strength, pot odds, a little bluffing). Online: every choice goes to the
// other phone in order ({in}|{leave}, {a}, {d}); the regulars decide from the shared seed, so both phones play the same hand.
const {createVegas}=require('src/engines/vegasGame.js');
const {pokerRank,compareRank,handName,drawPlan,handStrength}=require('src/engines/casinoRules.js');

const ANTE=10,LIMITS=[20,40],CAP=4,HANDS=8;

async function vegasPoker(s){
 const G=createVegas(s,{maxRegulars:3}),{x,st,seats,V,money,FONT,BODY,snd}=G;
 Object.assign(st,{hand:0,pot:0,button:4,betRound:0,peek:false,deck:[],toCall:0,level:0,bets:0,winners:[],showdown:false});
 let room=null,felt=null,layKey='';
 const first=p=>String(s.players[p].name).split(' ')[0].toUpperCase(),localUI=m=>st.ui?.mode===m&&G.local(st.ui.p);
 const F=G.useFront({key:'poker',title:'FIVE-CARD DRAW',dealerRole:'DEALER',sub:`Poker · ${money(ANTE)} ante · ${money(LIMITS[0])}/${money(LIMITS[1])} limit · ${HANDS} hands`,
  goal:`Classic draw poker against the table. Everyone antes ${money(ANTE)}, gets five cards, bets, swaps up to three cards once, bets again, and the best hand takes the pot. Most chips after ${HANDS} hands wins; break the bank (${money(G.BUY_IN*1.5)}+) and ${G.nameOf(G.dealerId)} joins your party.`,
  steps:[['Bet or fold','Look at your five cards. CHECK or CALL to stay in, RAISE when your hand is strong, FOLD a bad one.'],['Draw','Tap the cards you want to throw away (up to 3, or 4 when you keep an ace), then DRAW for new ones.'],['Showdown','After the second round of betting the hands are shown. The best poker hand wins the pot.']],
  rules:[['HANDS, BEST FIRST',[['Straight flush','5 in a row, one suit'],['Four of a kind','4 the same'],['Full house','3 + a pair'],['Flush','5 of one suit'],['Straight','5 in a row'],['Three of a kind','3 the same'],['Two pair',''],['One pair',''],['High card','']]],
   ['BETTING',[`Fixed limit: bets and raises are ${money(LIMITS[0])} before the draw and ${money(LIMITS[1])} after it, at most ${CAP} per round. CHECK = bet nothing when nobody has bet. CALL = match the bet. FOLD = give up the hand.`]],
   ['THE TABLE',['Pass and play: your cards stay face down until you tap SHOW, so the other player can look away. COLOR UP between hands to leave with your chips.']]],
  coach:[{title:'Your hand',text:'These are your five cards. CHECK/CALL to stay in, RAISE if they are strong, FOLD if not.',rect:()=>G.L?.coachBet,done:()=>st.coachBet,when:()=>localUI('bet')},
   {title:'The draw',text:'Tap the cards you want to swap (they lift up), then DRAW. Keep your pairs!',rect:()=>G.L?.coachDraw,done:()=>st.coachDrew,when:()=>localUI('draw')}]});
 const live=()=>seats.filter(se=>se.kind!=='empty'&&se.inHand);
 const bankOf=se=>se.kind==='human'?st.bank[se.p]:se.bank;
 const addBank=(se,v)=>{if(se.kind==='human'){st.bank[se.p]=Math.round((st.bank[se.p]+v)*100)/100;G.scores();}else se.bank+=v;};
 function lay(){const k=s.W+'x'+s.H;if(k===layKey&&G.L)return G.L;layKey=k;const L=G.L=V.tableLayout(s.W,s.H,(G.fb.top||40)+4);
  L.pot={x:L.cx,y:L.y0+L.ry*.34};room=V.roomLayer(s.W,s.H,G.theme,L);felt=V.tableLayer(s.W,s.H,G.theme,L,{rules:['FIVE CARD DRAW · $20/$40','DEALER BUTTON MOVES EACH HAND']});return L;}
 function newDeck(){const d=[];for(const su of V.SUITS)for(let r=1;r<=13;r++)d.push({r,s:su});for(let i=d.length-1;i>0;i--){const j=Math.floor(G.rand()*(i+1));[d[i],d[j]]=[d[j],d[i]];}st.deck=d;}
 // in turn from the seat after the button, the dealer's left first (screen right to left)
 const order=()=>{const list=live().sort((a,b)=>b.i-a.i),after=list.findIndex(se=>se.i<st.button);return after<0?list:[...list.slice(after),...list.slice(0,after)];};
 const visible=se=>st.showdown&&se.shown||se.kind==='human'&&G.local(se.p)&&!G.shared();
 // ---- the AI used by the regulars (shared seed) and the CPU (its own dice)
 function think(se,toCall,canRaise,rnd){const h=handStrength(se.cards)+(st.betRound===0&&drawPlan(se.cards).length===1&&pokerRank(se.cards)[0]<4?.12:0),r=rnd(),pot=st.pot+live().reduce((t,o)=>t+o.put,0),odds=toCall/(pot+toCall||1);
  if(toCall===0)return h>.58+r*.25||r<.06?(canRaise?'r':'c'):'c';
  if(canRaise&&h>.8+r*.14)return 'r';if(h>.28+odds*.9-(st.betRound?0:.06)||r<.07)return 'c';return 'f';}
 // ---- a hand
 async function playHand(){
  st.hand++;st.round=st.hand;st.phase='ready';st.showdown=false;st.winners=[];st.pot=0;
  for(const se of seats){se.inHand=false;se.cards=[];se.folded=false;se.put=0;se.total=0;se.allin=false;se.shown=false;se.res=null;se.disc=null;}
  // who plays: players say so (from the second hand), regulars play while they can pay
  for(const p of [0,1]){if(st.out[p])continue;const se=G.seatOf(p);if(st.bank[p]<ANTE){st.out[p]=true;continue;}
   if(st.hand>1){st.active=se.i;F.phase(G.local(p)?`${first(p)} — NEXT HAND?`:`${first(p)} IS DECIDING…`,G.local(p)?`Tap DEAL ME IN (${money(ANTE)} ante) or COLOR UP to leave`:'',{p});const m=await G.ask(p,'ready',{cpu:()=>({in:1})});st.active=null;if(m.leave){st.out[p]=true;G.banner(`${se.name} COLORS UP`,'#7dd3fc',1.6);snd.chips(6);continue;}}
   se.inHand=true;}
  for(const se of seats)if(se.kind==='extra'){if(se.bank>=LIMITS[1]*2)se.inHand=true;else if(!se.left){se.left=true;G.seatSay(se,'I’m out.',1.6);}}
  if(!seats.some(se=>se.kind==='human'&&se.inHand))return;
  // the button moves to the next live seat
  {const L=live().map(se=>se.i).sort((a,b)=>b-a);const nx=L.find(i=>i<st.button);st.button=nx??L[0];}
  st.phase='ante';F.phase(`HAND ${st.hand} OF ${HANDS} · ANTE ${money(ANTE)}`,'Everyone puts in the ante, then five cards each');G.sayD('bet',1.8);for(const se of live()){addBank(se,-ANTE);se.total+=ANTE;st.pot+=ANTE;}snd.chips(5);await G.W8(500);
  st.phase='deal';newDeck();for(let k=0;k<5;k++)for(const se of order()){const c=st.deck.pop();Object.assign(c,{t0:G.T,fx:G.L.shoe.x,fy:G.L.shoe.y});se.cards.push(c);snd.card();await G.W8(st.fast?30:120);}
  await G.W8(300);
  if(!await betting(0))return finishHand();
  // the draw
  st.phase='draw';for(const se of order()){if(se.folded)continue;st.active=se.i;let d;
   F.phase(se.kind==='extra'?`${se.name} IS DRAWING`:G.local(se.p)?`${first(se.p)} — THE DRAW`:`${first(se.p)} IS DRAWING…`,se.kind!=='extra'&&G.local(se.p)?'Tap the cards to swap (up to 3, 4 with an ace), then DRAW':'',{p:se.kind==='extra'?null:se.p});
   if(se.kind==='extra'){await G.W8(500);d=drawPlan(se.cards);}
   else{st.peek=false;const m=await G.ask(se.p,'draw',{cards:se.cards,max:se.cards.some(c=>c.r===1)?4:3,pick:[],cpu:()=>({d:drawPlan(se.cards)})},{d:[]});d=Array.isArray(m.d)?m.d:[];}
   d=[...new Set(d.filter(i=>i>=0&&i<5))].slice(0,se.cards.some(c=>c.r===1)?4:3);
   G.seatSay(se,d.length?`${d.length} card${d.length>1?'s':''}.`:'I’ll play these.',1.4);
   for(const i of d){se.cards[i].lt0=G.T;}if(d.length){snd.slide();await G.W8(350);}
   for(const i of d){const c=st.deck.pop();Object.assign(c,{t0:G.T,fx:G.L.shoe.x,fy:G.L.shoe.y});se.cards[i]=c;snd.card();await G.W8(st.fast?30:150);}
   await G.W8(250);}
  st.active=null;
  if(!await betting(1))return finishHand();
  // showdown
  st.phase='showdown';st.showdown=true;F.phase('SHOWDOWN','Cards up: the best hand takes the pot');for(const se of order()){if(se.folded)continue;se.shown=true;se.rank=pokerRank(se.cards);snd.flip();await G.W8(650);}
  return finishHand();}
 // one betting round; false when only one player is left
 async function betting(r){st.betRound=r;st.phase='bet';st.level=0;st.bets=0;for(const se of live())se.put=0;const size=LIMITS[r];
  let acted=new Set(),i=0,list=order().filter(se=>!se.folded);
  for(let guard=0;guard<60;guard++){const left=list.filter(se=>!se.folded);if(left.length<2)break;
   if(left.every(se=>se.allin||acted.has(se.i)&&se.put>=st.level))break;
   const se=list[i%list.length];i++;if(se.folded||se.allin)continue;if(acted.has(se.i)&&se.put>=st.level)continue;
   st.active=se.i;const toCall=Math.min(st.level-se.put,bankOf(se)),canRaise=st.bets<CAP&&bankOf(se)>st.level-se.put;let a;
   F.phase(se.kind==='extra'?`${se.name} IS DECIDING`:G.local(se.p)?`${first(se.p)} — ${toCall?`${money(toCall)} TO CALL`:'CHECK OR BET?'}`:`${first(se.p)} IS DECIDING…`,se.kind!=='extra'&&G.local(se.p)?`${G.shared()?'Tap SHOW to see your cards. ':`You hold ${handName(pokerRank(se.cards))}. `}${toCall?'CALL to stay in, RAISE to push, FOLD to give up':`CHECK for free or BET ${money(size)}`}`:'',{p:se.kind==='extra'?null:se.p});
   if(se.kind==='extra'){await G.W8(550);a=think(se,toCall,canRaise,G.rand);}
   else{const m=await G.ask(se.p,'bet',{noLeave:true,toCall,canRaise,size,cards:se.cards,cpu:()=>({a:think(se,toCall,canRaise,()=>Math.random()*(1.25-G.cpuSkill()*.5))})},{a:'f'});a=m.a;}
   if(a==='r'&&!canRaise)a='c';if(a==='f'&&toCall===0)a='c';
   if(a==='f'){se.folded=true;se.cards.forEach(c=>c.lt0=G.T);G.seatSay(se,'Fold.',1.2);snd.slide();if(se.kind==='human')G.moodS(se,'sad',2);}
   else{const want=a==='r'?st.level+size-se.put:st.level-se.put,pay=Math.min(want,bankOf(se));addBank(se,-pay);se.put+=pay;se.total+=pay;if(bankOf(se)<=0)se.allin=true;
    if(a==='r'){st.level=se.put;st.bets++;acted=new Set();G.seatSay(se,st.bets===1?`Bet ${money(size)}.`:`Raise to ${money(st.level)}.`,1.4);snd.chips(4);}
    else{G.seatSay(se,pay?(se.allin?'All in.':`Call ${money(pay)}.`):'Check.',1.2);if(pay)snd.chips(2);}}
   acted.add(se.i);await G.W8(250);}
  st.active=null;
  // the round's bets go into the pot
  for(const se of live()){if(se.put){const sp=G.L.spots[se.i];G.fly(se.put,{x:sp.bx,y:sp.by},G.L.pot,.4);st.pot+=se.put;se.put=0;}}
  await G.W8(500);return live().filter(se=>!se.folded).length>1;}
 // pay the pot: one winner if everyone else folded, else by side pots from what each put in
 async function finishHand(){st.phase='result';const inn=live().filter(se=>!se.folded);const pays=new Map();
  if(inn.length===1){pays.set(inn[0],st.pot);}
  else if(inn.length>1){const levels=[...new Set(live().map(se=>se.total))].sort((a,b)=>a-b);let prev=0;
   for(const lv of levels){const slice=live().reduce((t,se)=>t+Math.max(0,Math.min(se.total,lv)-prev),0);const elig=inn.filter(se=>se.total>=lv);prev=lv;if(!slice||!elig.length)continue;
    let best=[];for(const se of elig){if(!best.length)best=[se];else{const c=compareRank(se.rank,best[0].rank);if(c>0)best=[se];else if(c===0)best.push(se);}}
    const each=Math.floor(slice/best.length*100)/100;best.forEach(se=>pays.set(se,(pays.get(se)||0)+each));}}
  const winners=[...pays.keys()];st.winners=winners.map(se=>se.i);
  for(const [se,amt] of pays)if(se.kind==='human')F.note(se.p,amt-se.total,inn.length>1?handName(se.rank):'everyone folded');
  if(winners.length){const w=winners[0],how=inn.length>1?` WITH ${handName(w.rank).toUpperCase()}`:'';F.phase(winners.length>1?'SPLIT POT':`${w.kind==='human'?first(w.p):w.name} WINS ${money(st.pot)}`,inn.length>1?handName(w.rank):'Everyone else folded');G.banner(winners.length>1?'SPLIT POT':`${w.name} WINS${how}`,'#ffd23f',2.4);}
  for(const [se,amt] of pays){const sp=G.L.spots[se.i];G.fly(amt,G.L.pot,{x:sp.bx,y:sp.by});addBank(se,amt);se.res='win';if(se.kind==='human'){G.moodS(se,'win',3);snd.win(amt>=200);}else G.seatSay(se,'Ship it.',1.4);}
  for(const se of live())if(!pays.has(se)&&se.kind==='human')G.moodS(se,'sad',2.2);
  st.pot=0;if(seats.some(se=>se.kind==='human'&&se.res==='win')){G.sayD('win');G.dmood('happy');}else{G.sayD('house');}
  await G.W8(2400);for(const se of seats)for(const c of se.cards||[])c.lt0??=G.T;snd.slide();await G.W8(500);for(const se of seats)se.cards=[];}
 // ---- input
 G.act=id=>{const u=st.ui;if(!u||s.paused)return;
  if(id==='show'){st.peek=!st.peek;return;}
  if(u.mode==='ready'){if(id==='in')u.res({in:1});if(id==='leave')u.res({leave:1});return;}
  if(u.mode==='bet'&&'fcr'.includes(id))st.coachBet=true;
  if(u.mode==='bet'){if(id==='f')u.res({a:'f'});if(id==='c')u.res({a:'c'});if(id==='r'&&u.opts.canRaise)u.res({a:'r'});return;}
  if(u.mode==='draw'&&id==='draw')st.coachDrew=true;
  if(u.mode==='draw'){if(id.startsWith('card:')){if(G.shared()&&!st.peek)return;const i=+id.slice(5),o=u.opts,at=o.pick.indexOf(i);if(at>=0)o.pick.splice(at,1);else if(o.pick.length<o.max)o.pick.push(i);snd.card();return;}if(id==='draw')u.res({d:[...u.opts.pick]});}};
 G.key=(k,u)=>{if(k==='s')return 'show';if(u.mode==='ready')return k==='enter'?'in':null;if(u.mode==='bet')return {f:'f',c:'c',r:'r',enter:'c'}[k]||null;if(u.mode==='draw'){if('12345'.includes(k)&&k.length===1)return 'card:'+(+k-1);if(k==='enter')return 'draw';}return null;};
 G.bot=u=>u.mode==='ready'?(st.hand>st.leaveAt?{leave:1}:{in:1}):u.mode==='bet'?{a:handStrength(u.opts.cards)>.5&&u.opts.canRaise?'r':'c'}:u.mode==='draw'?{d:drawPlan(u.opts.cards)}:null;
 // ---- drawing
 function drawCard(c,pos,w,up){const h=w*1.4;let px=pos.x,py=pos.y,a=pos.a||0;const f=c.t0!=null?V.ease((G.T-c.t0)/(st.fast?.12:.3)):1;
  if(f<1){px=c.fx+(pos.x-c.fx)*f;py=c.fy+(pos.y-c.fy)*f-Math.sin(f*Math.PI)*w*.3;a+=(1-f)*.8;}
  if(c.lt0!=null){const g=V.ease((G.T-c.lt0)/.4);if(g>=1)return;px+=(G.L.discard.x-px)*g;py+=(G.L.discard.y-py)*g;}
  const img=up?V.cardImg(c.r,c.s,Math.round(w)):V.backImg(Math.round(w),G.theme);x.save();x.translate(px,py);x.rotate(a);x.shadowColor='rgba(0,0,0,.4)';x.shadowBlur=5;x.shadowOffsetY=2;x.drawImage(img,-w/2,-h/2,w,h);x.restore();}
 // a seat's five cards, fanned in front of its bet circle
 function seatCard(se,k){const L=G.L,sp=L.spots[se.i],w=L.cw*.82,d=L.cw*.5+L.ch*.5,fan=w*.3,bx=sp.bx+sp.nx*d,by=sp.by+sp.ny*d,off=(k-2)*fan;return {x:bx-sp.tx*off,y:by-sp.ty*off,a:sp.ang*.8+(k-2)*.06};}
 // the big hand of the player choosing now, along the bottom of the table
 function railGeom(){const L=G.L,w=Math.min(L.TW/5.8,L.cw*1.6,84),h=w*1.4;return {w,h,y:L.B-h*.55-(L.wide?8:4),x0:L.cx-w*2.2,step:w*1.1};}
 function drawRail(){const u=st.ui;if(!u||!(u.mode==='bet'||u.mode==='draw'))return;const se=G.seatOf(u.p),R=railGeom(),show=!G.shared()||st.peek;
  x.save();x.fillStyle='rgba(0,0,0,.5)';V.rr(x,R.x0-R.w*.7,R.y-R.h*.7,R.step*4+R.w*1.4,R.h*1.32,12);x.fill();x.restore();
  se.cards.forEach((c,i)=>{const up=u.mode==='draw'&&u.opts.pick.includes(i);const X=R.x0+i*R.step,Y=R.y-(up?R.h*.18:0);drawCard({r:c.r,s:c.s},{x:X,y:Y},R.w,show);if(up){x.save();x.fillStyle='rgba(0,0,0,.45)';V.rr(x,X-R.w/2,Y-R.h/2,R.w,R.h,R.w*.09);x.fill();x.restore();G.pill('DISCARD',X,Y,'#fff','#c8202f',Math.max(9,R.w*.15));}
   G.hits.push({id:'card:'+i,X:X-R.w/2,Y:Y-R.h/2,w:R.w,h:R.h});});
  if(show)G.pill(handName(pokerRank(se.cards)),G.L.cx,R.y-R.h*.82,'#111','rgba(255,255,255,.95)',Math.max(10,R.w*.17));
  else G.pill(`${se.name}: TAP SHOW TO SEE YOUR CARDS`,G.L.cx,R.y-R.h*.82,'#2a1800','#ffd23f',Math.max(10,R.w*.15));}
 G.render=()=>{const L=lay(),{W,H}=L;x.setTransform(1,0,0,1,0,0);x.drawImage(room,0,0,W,H);
  V.drawDealer(x,L,G.theme,G.dealerId,st.dmoodT>G.T?st.dmood:'normal',{x:L.cx+L.hd*.62,y:L.y0+L.hd*.1},G.T);x.drawImage(felt,0,0,W,H);
  // the pot
  const potNow=st.pot;if(potNow){V.drawStack(x,potNow,L.pot.x,L.pot.y,L.cw*.62,{max:12});G.pill(`POT ${money(potNow)}`,L.pot.x,L.pot.y+L.cw*.55,'#2a1800','#ffd23f',Math.max(10,L.cw*.24));}
  G.hits=[];
  for(const se of seats){if(se.kind==='empty')continue;const sp=L.spots[se.i],act=st.active===se.i;
   if(act){x.save();x.strokeStyle=`rgba(255,226,120,${.45+.45*Math.sin(G.T*6)})`;x.lineWidth=3;x.beginPath();x.ellipse(sp.bx,sp.by,L.cw*.62,L.cw*.62*V.SQ*1.1,0,0,7);x.stroke();x.restore();}
   if(se.put)V.drawStack(x,se.put,sp.bx,sp.by,L.cw*.6);
   (se.cards||[]).forEach((c,k)=>drawCard(c,seatCard(se,k),L.cw*.82,visible(se)));
   if(st.button===se.i&&st.hand){const bx=sp.bx+sp.tx*L.cw*.9,by=sp.by+sp.ty*L.cw*.9;x.save();x.fillStyle='#fff';x.strokeStyle='#111';x.lineWidth=2;x.beginPath();x.ellipse(bx,by,L.cw*.26,L.cw*.26*V.SQ*1.3,0,0,7);x.fill();x.stroke();x.fillStyle='#111';x.font=`900 ${L.cw*.2}px ${BODY}`;x.textAlign='center';x.textBaseline='middle';x.fillText('D',bx,by);x.restore();}
   if(se.folded&&st.phase!=='ready')G.pill('FOLDED',sp.bx,sp.by-L.cw*.6,'#fff','rgba(0,0,0,.65)',Math.max(9,L.cw*.2));
   if(st.showdown&&se.shown&&se.rank)G.pill(handName(se.rank),sp.bx,sp.by-L.cw*.62,'#111',st.winners.includes(se.i)?'#ffd23f':'rgba(255,255,255,.9)',Math.max(9,L.cw*.21));
   G.drawSeat(se,sp.hx,sp.hy,L.ph,{active:act,label:se.kind==='extra'?`${se.name} ${money(se.bank)}`:null});}
  G.flightsDraw(L.cw*.6);drawRail();
  G.dealerSpeech(L.cx-L.hd*.45,L.headY-L.hd*.2,Math.max(11,L.hd*.17),Math.min(200,L.TW*.42));
  G.hud(`HAND ${Math.max(1,st.hand)} OF ${HANDS}`,`FIVE CARD DRAW · ANTE $${ANTE}`,null);
  panel();G.bannerDraw(L.cx,L.y0+L.ry*.5);};
 function panel(){const keep=G.hits;const A=G.panelFrame();G.hits=keep;const u=st.ui,{fs,X0,Wd,top,wide}=A;
  if(!u){A.wait(G.waitMsg(st.phase==='deal'?'DEALING…':st.phase==='showdown'?'SHOWDOWN':st.phase==='result'?'THE POT IS PAID':''));return;}
  const se=G.seatOf(u.p),col=u.p===0?'#ffd23f':'#9ad7ff',showBtn=G.shared()&&(u.mode==='bet'||u.mode==='draw');
  if(u.mode==='ready'){A.text(`${se.name} · NEXT HAND`,X0,top+fs*.6,fs,col);A.smallWrap(`Bank ${money(st.bank[u.p])} · ante ${money(ANTE)}`,top+fs*1.7);A.buttons([{id:'leave',label:'COLOR UP',sub:'leave the table'},{id:'in',label:'DEAL ME IN',sub:`ante ${money(ANTE)}`,tone:'gold'}],{cols:wide?1:2});return;}
  const sw=Math.min(110,Wd*.34),infoW=showBtn?Wd-sw-A.pad:Wd;if(showBtn)G.btn({id:'show',X:X0+Wd-sw,Y:top-2,w:sw,h:fs*1.9,label:st.peek?'HIDE':'SHOW',sub:'my cards',tone:st.peek?'dark':'blue'});
  if(u.mode==='bet'){const o=u.opts;A.text(`${se.name}`,X0,top+fs*.6,fs,col);A.smallWrap(`POT ${money(st.pot+live().reduce((t,q)=>t+q.put,0))} · ${o.toCall?`${money(o.toCall)} TO CALL`:'NOTHING TO CALL'} · BANK ${money(st.bank[u.p])}`,top+fs*1.7,infoW);
   const raise=st.level?`RAISE ${money(st.level+o.size)}`:`BET ${money(o.size)}`;
   A.buttons([{id:'f',label:'FOLD',tone:'red',on:o.toCall>0},{id:'c',label:o.toCall?'CALL':'CHECK',sub:o.toCall?money(o.toCall):'free',tone:'green'},{id:'r',label:raise.split(' ')[0],sub:raise.split(' ')[1],tone:'gold',on:o.canRaise}],{cols:wide?1:3});return;}
  if(u.mode==='draw'){const o=u.opts;A.text(`${se.name} · THE DRAW`,X0,top+fs*.6,fs,col);A.smallWrap(G.shared()?'Tap the cards to throw away: up to 3, or 4 if you keep an ace.':`Tap the cards to throw away, up to ${o.max}${o.max===4?' (you hold an ace)':''}.`,top+fs*1.7,infoW);
   A.buttons([{id:'draw',label:o.pick.length?`DRAW ${o.pick.length}`:'STAND PAT',sub:o.pick.length?'new cards':'keep all five',tone:'gold'}]);}
  {const bs=G.hits.filter(h=>u.mode==='bet'?'fcr'.includes(h.id):h.id==='draw'||String(h.id).startsWith('card:'));if(bs.length){const x0=Math.min(...bs.map(b=>b.X)),y0=Math.min(...bs.map(b=>b.Y)),x1=Math.max(...bs.map(b=>b.X+b.w)),y1=Math.max(...bs.map(b=>b.Y+b.h));G.L[u.mode==='bet'?'coachBet':'coachDraw']={x:x0,y:y0,w:x1-x0,h:y1-y0};}}}
 s.debug={engine:'vegas-poker',st,seats,get T(){return G.T;},bot:()=>G.botAct(),layout:()=>G.L,hits:()=>G.hits,dealerId:G.dealerId,theme:G.theme.id};
 await G.run(async()=>{lay();snd.riffle();await G.W8(1200);
  while(st.hand<HANDS&&![0,1].every(p=>st.out[p]||st.bank[p]<ANTE))await playHand();
  if(st.hand>=HANDS){G.banner('LAST HAND PLAYED','#ffe9a8',1.6);await G.W8(1200);}
  await G.end('five card draw');});
}
Object.assign(exports,{vegasPoker});
