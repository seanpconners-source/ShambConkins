// Baccarat at the Casino Royale table (id `bond-baccarat`, engine `baccarat`; ROADMAP G1). Punto Banco as dealt in a real
// casino: bet PLAYER (pays 1 to 1), BANKER (19 to 20: 5% commission) or TIE (8 to 1; player/banker bets push on a tie).
// The dealer lays two cards face down in the PLAYER and BANKER boxes; the biggest bettor on each side SQUEEZES that
// side's cards (drag up on the big cards to peel them, or tap REVEAL), the way the high roller does in the film. Then
// the third-card rules decide who draws. A bead road on the felt records the coups. Ten coups a shoe, or color up.
// Regulars from the table's film sit in the empty seats and bet too. vs CPU: seat 4 bets mostly banker. Online: every
// choice ({bet,side}|{leave}, {sq}) goes to the other phone in order; both deal the same shoe from the seed.
const {createVegas}=require('src/engines/vegasGame.js');
const {bacValue,bacTotal,bankerDraws}=require('src/engines/casinoRules.js');

const MIN=25,MAX=500,COUPS=10,CHIP_VALUES=[5,25,100,500];
const SIDES={player:{label:'PLAYER',pays:'1 to 1',col:'#3b82f6',win:1},banker:{label:'BANKER',pays:'19 to 20',col:'#ef4444',win:.95},tie:{label:'TIE',pays:'8 to 1',col:'#22c55e',win:8}};

async function vegasBaccarat(s){
 const G=createVegas(s,{themeId:'bond'}),{x,st,seats,V,money,FONT,BODY,snd}=G;
 Object.assign(st,{lastBet:[MIN,MIN],lastSide:['banker','banker'],shoe:[],hands:{player:[],banker:[]},road:[],squeeze:null,result:null,side:['banker','banker']});
 let room=null,felt=null,layKey='';
 function lay(){const k=s.W+'x'+s.H;if(k===layKey&&G.L)return G.L;layKey=k;const L=G.L=V.tableLayout(s.W,s.H,(G.fb.top||40)+4);
  // the PLAYER and BANKER boxes sit in front of the dealer, where blackjack has the dealer's cards
  const bw=Math.min(L.cw*3.5,(L.TW-L.cw*.5)/2-12),bh=L.ch*1.22,gap=L.cw*.5,y=L.y0+L.rail*.4+bh*.55;L.box={player:{x:L.cx-gap/2-bw/2,y,w:bw,h:bh},banker:{x:L.cx+gap/2+bw/2,y,w:bw,h:bh}};
  L.dealerCards={x:L.cx,y:y+bh*.15};
  room=V.roomLayer(s.W,s.H,G.theme,L);felt=V.tableLayer(s.W,s.H,G.theme,L,{rules:['BANKER PAYS 19 TO 20','TIE PAYS 8 TO 1']});return L;}
 function newShoe(){const cards=[];for(let d=0;d<8;d++)for(const su of V.SUITS)for(let r=1;r<=13;r++)cards.push({r,s:su});for(let i=cards.length-1;i>0;i--){const j=Math.floor(G.rand()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}st.shoe=cards;}
 const draw1=()=>st.shoe.pop()||{r:1+Math.floor(G.rand()*13),s:'h'};
 async function deal(side,up){const c=draw1();Object.assign(c,{up,t0:G.T,fx:G.L.shoe.x,fy:G.L.shoe.y,flipT:up?G.T+.12:null,third:st.hands[side].length===2});st.hands[side].push(c);snd.card();await G.W8(st.fast?60:340);return c;}
 const value=side=>bacTotal(st.hands[side]);
 // ---- a coup
 async function coup(){
  st.round++;st.phase='bet';st.hands={player:[],banker:[]};st.result=null;for(const se of seats){se.bet=0;se.side=null;se.res=null;se.paid=0;}
  G.sayD('bet',2);
  for(const se of seats)if(se.kind==='extra'){const r=G.rand();se.side=r<.5?'banker':r<.93?'player':'tie';se.bet=Math.round((MIN+G.rand()*(se.side==='tie'?40:160))/5)*5;snd.chips(2);}
  for(const p of [0,1]){if(st.out[p])continue;const se=G.seatOf(p);st.active=se.i;
   const m=await G.ask(p,'bet',{room:Math.min(MAX,st.bank[p]),cpu:()=>{const sk=G.cpuSkill(),r=Math.random(),side=r<.55+.15*sk?'banker':r<.95?'player':'tie',want=Math.round(st.bank[1]*(.05+.12*sk+Math.random()*.06)/5)*5;return {bet:Math.max(MIN,Math.min(MAX,st.bank[1],side==='tie'?MIN:want)),side};}});
   if(m.leave||!(m.bet>=MIN)||!SIDES[m.side]){st.out[p]=true;G.banner(`${se.name} COLORS UP`,'#7dd3fc',1.6);snd.chips(6);G.moodS(se,'win');continue;}
   const b=Math.max(MIN,Math.min(MAX,st.bank[p],Math.round(m.bet)));st.bank[p]-=b;st.lastBet[p]=b;st.lastSide[p]=m.side;se.bet=b;se.side=m.side;snd.chips(4);G.scores();}
  st.active=null;if(!seats.some(se=>se.kind==='human'&&se.bet))return;
  st.phase='deal';G.say('No more bets.',1.6);
  await deal('player',false);await deal('banker',false);await deal('player',false);await deal('banker',false);
  // the squeeze: the biggest bettor on each side turns that side's cards over
  for(const side of ['player','banker']){const who=seats.filter(se=>se.bet&&(se.side===side)).sort((a,b)=>b.bet-a.bet)[0]||null;await squeeze(side,who);}
  const p0=value('player'),b0=value('banker');
  if(p0>=8||b0>=8){G.banner('NATURAL '+Math.max(p0,b0),'#ffd23f',1.4);await G.W8(900);}
  else{let p3=null;if(p0<=5){G.say('Card for the player.',1.4);p3=await deal('player',true);await G.W8(400);}
   if(bankerDraws(b0,p3?bacValue(p3):null)){G.say('Card for the banker.',1.4);await deal('banker',true);await G.W8(400);}}
  const pv=value('player'),bv=value('banker'),win=pv>bv?'player':bv>pv?'banker':'tie';st.result={win,pv,bv};st.road.push(win);
  st.phase='result';G.banner(win==='tie'?`TIE ${pv} – ${bv}`:`${SIDES[win].label} WINS ${Math.max(pv,bv)} – ${Math.min(pv,bv)}`,SIDES[win].col==='#ef4444'?'#ff8a7a':SIDES[win].col==='#3b82f6'?'#9ad7ff':'#7dff9a',2);
  await G.W8(900);
  // settle from the dealer's right to left
  let lost=0,won=0;for(const se of [...seats].sort((a,b)=>a.i-b.i)){if(!se.bet)continue;const sp=G.L.spots[se.i];let back=0;
   if(se.side===win){back=se.bet*(1+SIDES[win].win);se.res='win';}else if(win==='tie'&&se.side!=='tie'){back=se.bet;se.res='push';}else se.res='lose';
   back=Math.round(back*100)/100;se.paid=back;
   if(se.res==='win'){G.fly(back-se.bet,{x:G.L.cx,y:G.L.y0},{x:sp.bx+G.L.cw*.42,y:sp.by});won++;}else if(se.res==='lose'){G.fly(se.bet,{x:sp.bx,y:sp.by},{x:G.L.cx,y:G.L.y0-G.L.rail*.1});lost++;}
   if(se.kind==='human'){st.bank[se.p]+=back;G.scores();G.moodS(se,se.res==='win'?'win':se.res==='lose'?'sad':'happy',2.4);if(se.res==='win')snd.win(back-se.bet>=200);else if(se.res==='lose')snd.lose();}
   else G.seatSay(se,se.res==='win'?(G.rand()<.5?'Yes!':'Pay me.'):se.res==='lose'?'Figures.':'Push.');
   await G.W8(260);}
  if(seats.some(se=>se.kind==='human'&&se.res==='win')){G.sayD('win');G.dmood('sad');}else{G.sayD('house');G.dmood('win');}
  await G.W8(1400);
  for(const side of ['player','banker'])for(const c of st.hands[side])c.lt0=G.T;snd.slide();await G.W8(500);st.hands={player:[],banker:[]};
  for(const p of [0,1])if(!st.out[p]&&st.bank[p]<MIN){st.out[p]=true;G.banner(`${G.seatOf(p).name} IS TAPPED OUT`,'#ff8a7a',2);await G.W8(1200);}}
 // squeezing: a local player drags the big cards up; anyone else's squeeze peels slowly by itself
 async function squeeze(side,who){const cards=st.hands[side].slice(0,2);st.squeeze={side,who,peel:0,t0:G.T,auto:true};
  if(who&&who.kind==='human'){st.active=who.i;st.squeeze.auto=!G.local(who.p);
   const m=await G.ask(who.p,'squeeze',{side,cpu:()=>({sq:1})},{sq:1});void m;st.active=null;}
  else{await G.W8(st.fast?200:1300);}
  st.squeeze.peel=1;for(const c of cards){c.up=true;c.flipT=G.T;}snd.flip();await G.W8(500);st.squeeze=null;
  const v=value(side);G.banner(`${SIDES[side].label} ${v}`,side==='player'?'#9ad7ff':'#ff8a7a',1.1);await G.W8(650);}
 // ---- input
 G.act=id=>{const u=st.ui;if(!u||s.paused)return;
  if(u.mode==='bet'){const o=u.opts;o.bet||=[];const sum=o.bet.reduce((a,b)=>a+b,0);
   if(id.startsWith('chip:')){const v=+id.slice(5);if(sum+v<=o.room){o.bet.push(v);snd.chips(1);}return;}
   if(id.startsWith('side:')){st.side[u.p]=id.slice(5);return;}
   if(id==='clear'){o.bet=[];return;}if(id==='rebet'){o.bet=V.breakdown(Math.min(st.lastBet[u.p],o.room),[500,100,25,5]);st.side[u.p]=st.lastSide[u.p];snd.chips(3);return;}
   if(id==='deal'&&sum>=MIN)u.res({bet:sum,side:st.side[u.p]});if(id==='leave')u.res({leave:1});return;}
  if(u.mode==='squeeze'&&id==='reveal')u.res({sq:1});};
 G.key=(k,u)=>{if(u.mode==='bet'){const m={'1':5,'2':25,'3':100,'4':500};if(m[k])return 'chip:'+m[k];if(k==='p')return 'side:player';if(k==='b')return 'side:banker';if(k==='t')return 'side:tie';if(k==='enter')return 'deal';}if(u.mode==='squeeze'&&(k==='enter'||k===' '))return 'reveal';return null;};
 let peelFrom=null;
 G.onDown=p=>{if(st.ui?.mode==='squeeze')peelFrom={y:p.y,k:st.squeeze?.peel||0};};
 G.onDrag=p=>{if(st.ui?.mode!=='squeeze'||!peelFrom||!st.squeeze)return;const h=G.L.ch*2.2;st.squeeze.peel=Math.max(0,Math.min(1,peelFrom.k+(peelFrom.y-p.y)/h));if(st.squeeze.peel>=.92)st.ui?.res({sq:1});};
 G.onUp=()=>{peelFrom=null;};
 G.onTap=d=>{if(st.ui?.mode==='bet'){const sp=G.L.spots[G.seatOf(st.ui.p).i];if(Math.hypot(d.x-sp.bx,d.y-sp.by)<G.L.cw*.8){st.ui.opts.bet?.pop();snd.chips(1);}}};
 G.bot=u=>u.mode==='bet'?{bet:Math.min(st.bank[u.p],MIN*(1+Math.floor(Math.random()*3))),side:Math.random()<.6?'banker':'player'}:u.mode==='squeeze'?{sq:1}:null;
 // ---- drawing
 function drawCard(c,pos,w){const h=w*1.4;let px=pos.x,py=pos.y,a=pos.a||0,sx=1;const f=c.t0!=null?V.ease((G.T-c.t0)/(st.fast?.12:.32)):1;
  if(f<1){px=c.fx+(pos.x-c.fx)*f;py=c.fy+(pos.y-c.fy)*f-Math.sin(f*Math.PI)*w*.35;a+=(1-f)*.9;}
  if(c.lt0!=null){const g=V.ease((G.T-c.lt0)/.45);px+=(G.L.discard.x-px)*g;py+=(G.L.discard.y-py)*g;}
  let up=c.up;if(c.up&&c.flipT!=null){const ft=(G.T-c.flipT)/.22;if(ft<1){sx=Math.abs(Math.cos(Math.max(0,ft)*Math.PI));up=ft>.5;}}
  const img=up?V.cardImg(c.r,c.s,Math.round(w)):V.backImg(Math.round(w),G.theme);x.save();x.translate(px,py);x.rotate(a);x.scale(Math.max(.04,sx),1);x.shadowColor='rgba(0,0,0,.45)';x.shadowBlur=6;x.shadowOffsetY=2;x.drawImage(img,-w/2,-h/2,w,h);x.restore();}
 // two cards side by side; a third card goes in sideways beside them, as dealers place it
 const boxCard=(side,k)=>{const b=G.L.box[side],w=G.L.cw,n=Math.max(2,st.hands[side].length);const at=n===3?[-1,-.14,1.02][k]:(k-.5)*.86;return {x:b.x+at*w,y:b.y,a:k===2?Math.PI/2:0};};
 // the big peeling cards during a squeeze: the face shows from the bottom up as the corner lifts
 function drawSqueeze(){const q=st.squeeze;if(!q)return;const L=G.L,cards=st.hands[q.side].slice(0,2),w=Math.min(L.cw*2.1,L.TW*.3),h=w*1.4,cy=L.y0+L.ry*.42;
  let peel=q.peel;if(q.auto&&peel<.9)peel=Math.min(.88,(G.T-q.t0)*.42);
  x.save();x.fillStyle='rgba(0,0,0,.45)';x.fillRect(0,0,L.TW,L.B);x.restore();
  cards.forEach((c,i)=>{const cx=L.cx+(i-.5)*w*1.12,X=cx-w/2,Y=cy-h/2,wob=Math.sin(G.T*3+i)*.02;x.save();x.translate(cx,cy);x.rotate(wob);x.translate(-cx,-cy);
   x.drawImage(V.backImg(Math.round(w),G.theme),X,Y,w,h);const ph=h*peel;if(ph>2){x.save();x.beginPath();x.rect(X,Y+h-ph,w,ph);x.clip();x.drawImage(V.cardImg(c.r,c.s,Math.round(w)),X,Y,w,h);x.restore();
    const g=x.createLinearGradient(0,Y+h-ph-10,0,Y+h-ph+6);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.6,'rgba(0,0,0,.35)');g.addColorStop(1,'rgba(255,255,255,.5)');x.fillStyle=g;x.fillRect(X,Y+h-ph-10,w,16);}
   x.restore();});
  const who=q.who;G.pill(who?`${who.name} SQUEEZES THE ${SIDES[q.side].label}`:`THE DEALER TURNS THE ${SIDES[q.side].label}`,L.cx,cy-h/2-18,'#fff',q.side==='player'?'#2563eb':'#dc2626',Math.max(11,L.cw*.26));
  if(st.ui?.mode==='squeeze')G.pill('DRAG UP TO PEEL',L.cx,cy+h/2+18,'#2a1800','#ffd23f',Math.max(11,L.cw*.26));}
 // the bead road: one dot per coup, down then across, under the coup counter
 function drawRoad(){const L=G.L,r=Math.max(3.5,Math.min(5.5,L.cw*.1)),x0=12,y0=58,rows=5;x.save();x.fillStyle='rgba(0,0,0,.45)';V.rr(x,x0-4,y0-4,Math.ceil(COUPS/rows)*r*2.5+8,rows*r*2.5+8,5);x.fill();x.strokeStyle='rgba(255,255,255,.25)';x.stroke();
  st.road.forEach((w,i)=>{const cx=x0+r+Math.floor(i/rows)*r*2.5,cy=y0+r+(i%rows)*r*2.5;x.fillStyle=SIDES[w].col;x.beginPath();x.arc(cx,cy,r,0,7);x.fill();});x.restore();}
 G.render=()=>{const L=lay(),{W,H}=L;x.setTransform(1,0,0,1,0,0);x.drawImage(room,0,0,W,H);
  V.drawDealer(x,L,G.theme,G.dealerId,st.dmoodT>G.T?st.dmood:'normal',{x:L.cx+L.hd*.62,y:L.y0+L.hd*.1},G.T);x.drawImage(felt,0,0,W,H);
  // the PLAYER and BANKER boxes
  for(const side of ['player','banker']){const b=L.box[side],S=SIDES[side],won=st.result?.win===side;x.save();x.strokeStyle=won?'#ffe07a':S.col;x.lineWidth=won?4:2.5;x.globalAlpha=.9;V.rr(x,b.x-b.w/2,b.y-b.h/2,b.w,b.h,10);x.stroke();x.restore();
   G.pill(S.label,b.x,b.y-b.h/2-2,'#fff',S.col,Math.max(10,L.cw*.24));
   const hand=st.hands[side];hand.forEach((c,k)=>drawCard(c,boxCard(side,k),L.cw));
   if(hand.length>=2&&hand.slice(0,2).every(c=>c.up&&G.T>(c.flipT||0)+.25)&&!hand[0].lt0)G.pill(String(value(side)),b.x,b.y+b.h/2+2,'#111','rgba(255,255,255,.92)',Math.max(10,L.cw*.26));}
  // seats: their bet and side
  for(const se of seats){if(se.kind==='empty')continue;const sp=L.spots[se.i],act=st.active===se.i;
   if(act){x.save();x.strokeStyle=`rgba(255,226,120,${.45+.45*Math.sin(G.T*6)})`;x.lineWidth=3;x.beginPath();x.ellipse(sp.bx,sp.by,L.cw*.62,L.cw*.62*V.SQ*1.1,0,0,7);x.stroke();x.restore();}
   let bet=se.bet,side=se.side;if(st.ui?.mode==='bet'&&G.seatOf(st.ui.p)===se){bet=(st.ui.opts.bet||[]).reduce((a,b)=>a+b,0);side=st.side[st.ui.p];}
   if(bet&&!(se.res==='lose'&&st.phase==='result'))V.drawStack(x,bet,sp.bx,sp.by,L.cw*.62);if(se.res==='win'&&st.phase==='result'&&se.paid)V.drawStack(x,se.paid-se.bet,sp.bx+L.cw*.42,sp.by,L.cw*.62);
   if(side&&(bet||st.ui?.mode==='bet'&&G.seatOf(st.ui.p)===se))G.pill(`${SIDES[side].label}${bet?' '+money(bet):''}`,sp.bx,sp.by+L.cw*.55,'#fff',SIDES[side].col,Math.max(9,L.cw*.2));
   if(se.res&&st.phase==='result')G.pill(se.res==='win'?`WIN +${money(se.paid-se.bet)}`:se.res==='push'?'PUSH':`LOSE −${money(se.bet)}`,sp.bx,sp.by-L.cw*.75,'#111',se.res==='win'?'#7dff9a':se.res==='push'?'#e8e8e8':'#ff8a7a',Math.max(9,L.cw*.22));
   G.drawSeat(se,sp.hx,sp.hy,L.ph,{active:act});}
  G.flightsDraw(L.cw*.62);drawRoad();drawSqueeze();
  G.dealerSpeech(L.cx-L.hd*.45,L.headY-L.hd*.2,Math.max(11,L.hd*.17),Math.min(200,L.TW*.42));
  G.hud(`COUP ${Math.max(1,st.round)} OF ${COUPS}`,`BACCARAT · $${MIN}-$${MAX}`,null);
  panel();G.bannerDraw(L.cx,L.y0+L.ry*.62);};
 function panel(){const A=G.panelFrame(),u=st.ui,{fs,X0,Wd,top,wide}=A;
  if(!u){A.wait(G.waitMsg(st.phase==='deal'?'DEALING…':st.phase==='result'?'SETTLING UP':st.phase==='shuffle'?'A FRESH EIGHT-DECK SHOE':''));return;}
  const se=G.seatOf(u.p),col=u.p===0?'#ffd23f':'#9ad7ff';
  if(u.mode==='squeeze'){A.text(`${se.name} · YOUR SQUEEZE`,X0,top+fs*.6,fs,col);A.smallWrap('Drag up on the cards to peel them, slowly. Or just turn them over.',top+fs*1.7);A.buttons([{id:'reveal',label:'REVEAL',sub:'turn them over',tone:'gold'}]);return;}
  const o=u.opts,sum=(o.bet||[]).reduce((a,b)=>a+b,0),side=st.side[u.p];
  A.text(`${se.name}’S BET`,X0,top+fs*.6,fs,col);A.text(sum?money(sum):'—',X0+Wd,top+fs*.6,fs,'#fff','right');A.small(`BANK ${money(st.bank[u.p]-sum)} · TABLE ${money(MIN)}-${money(MAX)}`,X0,top+fs*1.7);
  const btnTop=A.buttons([{id:'leave',label:'COLOR UP',sub:'leave the table'},{id:'rebet',label:'REBET',sub:money(Math.min(st.lastBet[u.p],o.room)),on:!sum},{id:'clear',label:'CLEAR',on:sum>0},{id:'deal',label:'DEAL',sub:sum<MIN?`min ${money(MIN)}`:money(sum),tone:'gold',on:sum>=MIN}],{cols:wide?2:4,h:wide?Math.min(52,(A.bottom-top)*.12):Math.min(44,A.P.h*.22)});
  // which side: three toggles
  const sy=top+fs*2.4,sh=wide?Math.min(46,(A.bottom-top)*.11):Math.min(36,A.P.h*.18),sw=(Wd-A.pad*2)/3;
  ['player','banker','tie'].forEach((k,i)=>{const S=SIDES[k];G.btn({id:'side:'+k,X:X0+i*(sw+A.pad),Y:sy,w:sw,h:sh,label:S.label,sub:'pays '+S.pays,tone:side===k?(k==='player'?'blue':k==='banker'?'red':'green'):'dark'});if(side===k){x.save();x.strokeStyle='#fff';x.lineWidth=2.5;V.rr(x,X0+i*(sw+A.pad),sy,sw,sh,Math.min(sh*.32,14));x.stroke();x.restore();}});
  A.chips(CHIP_VALUES,sy+sh+A.pad*.6,btnTop-A.pad,o.room-sum);}
 s.debug={engine:'vegas-baccarat',st,seats,get T(){return G.T;},bot:()=>G.botAct(),layout:()=>G.L,hits:()=>G.hits,dealerId:G.dealerId,theme:G.theme.id};
 await G.run(async()=>{lay();newShoe();st.phase='shuffle';snd.riffle();await G.W8(1300);
  while(st.round<COUPS&&![0,1].every(p=>st.out[p]||st.bank[p]<MIN))await coup();
  if(st.round>=COUPS){G.banner('THE SHOE IS DONE','#ffe9a8',1.6);await G.W8(1200);}
  await G.end('baccarat');});
}
Object.assign(exports,{vegasBaccarat});
