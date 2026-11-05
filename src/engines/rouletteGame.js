// ROULETTE, rebuilt as a full game (ROADMAP G13, owner Nov 5: "roulette is terrible... I want a real thought-out game").
// Engine key `roulette` (ids roulette + the Bond table's). A European single-zero wheel at one of the Vegas tables:
//  - an intro card (engines/casinoFront.js) introduces the table, the croupier, the regulars, the goal and how to bet,
//    and a first-time tour points at the chips, the board and SPIN;
//  - the betting board has every real bet: straight 35, split 17, trio/street 11, corner/first four 8, six line 5,
//    dozen/column 2, red/black/odd/even/1-18/19-36 1 to 1 (rules + payouts in casinoRules rCover/rPays/rReturn). Hold a finger on
//    the board: the numbers it covers light up and the banner names the bet; let go to place the chip. Tap between two numbers
//    for a split, on a crossing for a corner, on the board's outer edge for a street / six line, on the zero line for trios.
//  - the bottom bar: chip picker, UNDO, CLEAR, REBET (last spin's bets), ×2 (double them), and SPIN / DONE;
//  - everyone bets on the same spin with their own chip colour (Sean gold, Amber blue, each regular their own): on one phone
//    player 1 then player 2; vs the CPU, the CPU after you; online both at once ({bets:[[key,amount]..]} | {leave});
//  - the spin: the wheel comes up big, the ball runs against it, drops, rattles and settles in the number drawn from the shared
//    seed; the croupier calls it, the dolly marks it, losers are swept, winners paid with their odds shown;
//  - the table history (tonight + earlier) with hot and cold numbers; ten spins, or cash out; then the summary card.
// Break the bank ($1,500+) and the croupier joins your party (G.end, unlockBy 'dealer').
const {createVegas}=require('src/engines/vegasGame.js');
const {createFront}=require('src/engines/casinoFront.js');
const R=require('src/engines/casinoRules.js');

const SPINS=10,MAX=500,CHIP_VALUES=[5,25,100,500],EDGE=.24;
const OWN=['#ffd23f','#5aa8ff'],REG_COL=['#ff6fae','#6fe38a','#ff9a3c'];
const COL={red:'#b3141f',black:'#141418',green:'#0d7a3e'};

async function rouletteGame(s){
 const G=createVegas(s,{seatsUsed:[0,2,4],maxRegulars:3});
 const {x,st,V,FONT,BODY,money,seats}=G,rand=G.rand;
 const regs=seats.filter(q=>q.kind==='extra');regs.forEach((q,i)=>{q.col=REG_COL[i%REG_COL.length];});
 Object.assign(st,{bets:[],chip:25,last:[[],[]],press:null,spin:null,result:null,wheelA:rand()*Math.PI*2,coachChip:false,betting:null,done:[false,false],pays:null,sweepT:-9});
 // earlier tonight: a table history from the seed (both phones alike), tonight's spins are added on top
 st.history=Array.from({length:18},()=>({n:Math.floor(rand()*37),old:true}));
 const nameP=p=>s.players[p].name+(G.cpu&&p===1?' (CPU)':''),first=p=>String(s.players[p].name).split(' ')[0].toUpperCase();
 const humans=()=>[0,1].filter(p=>!st.out[p]);
 const F=createFront(G,{key:'roulette',title:'ROULETTE',dealerRole:'CROUPIER',
  sub:`European wheel · single zero · up to ${money(MAX)} a spin`,
  goal:`Ten spins of the wheel. Everyone bets on the same spin with their own chip colour. Finish with the most chips, and if you break the bank (${money(G.BUY_IN*1.5)} or more) ${G.nameOf(G.dealerId)} joins your party.`,
  steps:[['Pick a chip','The chips along the bottom are the bet amounts: $5, $25, $100, $500.'],
   ['Tap the board to bet','A single number pays 35 to 1. Red or black, odd or even pay even money. Tap between numbers to cover two or four at once.'],
   [G.cpu||G.net?'Spin':'Done, then the next player',G.cpu||G.net?'Press SPIN. The ball decides; winning chips are paid where they lie.':`Tap DONE and pass the phone; when you have both bet, the wheel spins.`]],
  rules:[['THE BETS',[['Straight: one number','35 to 1'],['Split: two numbers side by side','17 to 1'],['Street: a row of three · Trio: 0 with two','11 to 1'],['Corner: four numbers · First four: 0-1-2-3','8 to 1'],['Six line: two rows','5 to 1'],['Dozen · Column (2 to 1 cells)','2 to 1'],['Red · Black · Odd · Even · 1-18 · 19-36','1 to 1']]],
   ['HOW TO PLACE THEM',['Hold a finger on the board: the numbers you would cover light up and the banner names the bet. Let go to place the chip. Between two numbers = split, where four meet = corner, on the board\'s outer edge = street (or six line on a line), on the zero line = splits with 0, trios, first four.']],
   ['THE TABLE',['Single zero (European). Zero loses every outside bet. Up to '+money(MAX)+' a spin each. Ten spins; CASH OUT any time to keep your chips.']]],
  coach:[{title:'Pick a chip',text:'Each chip is a bet amount. Tap one to choose how much to bet.',rect:()=>G.L?.chipRect,done:()=>st.coachChip,when:()=>localBetting()},
   {title:'Place your bet',text:'Tap a number, a colour or a dozen. Hold your finger to see what it covers first.',rect:()=>G.L?.board,done:()=>mine().length>0,when:()=>localBetting()},
   {title:'Spin it',text:'Happy with your bets? Tap here.',rect:()=>G.L?.primary,done:()=>st.coachDone||!localBetting(),when:()=>localBetting()}]});
 const localBetting=()=>st.ui?.mode==='bet'&&G.local(st.ui.p);
 const mine=()=>st.ui?.mode==='bet'?st.bets.filter(b=>b.who===st.ui.p):[];
 const staked=who=>st.bets.filter(b=>b.who===who).reduce((a,b)=>a+b.amt,0);
 // ---- layout: the board is one model (L along: 0 zero, 1..13 the twelve rows, 13..14 column bets; C across: 0..1 even-money,
 // 1..2 dozens, 2..5 the three number columns) drawn upright on a tall screen or lying down like a real table on a wide one
 let L=null;const lay=()=>{const W=s.W,H=s.H,top=(G.fb.top||40)+4,wide=W>H*1.12;
  const l={W,H,wide,top};
  if(!wide){const zone=Math.max(96,Math.min(H*.17,150));l.wheel={cx:14+zone*.47,cy:top+zone*.5,r:zone*.46};l.dealer={x:l.wheel.cx+l.wheel.r+12,y:top+4,h:zone*.5};
   l.hist={x:l.wheel.cx+l.wheel.r+12,y:top+zone*.62,w:W-(l.wheel.cx+l.wheel.r+12)-10,h:zone*.3};l.people={x:8,y:top+zone+2,w:W-16,h:34};
   l.phase={x:0,y:l.people.y+38,w:W,h:44};const barH=Math.max(128,Math.min(H*.2,150));l.bar={x:0,y:H-barH,w:W,h:barH};
   const by=l.phase.y+l.phase.h+4,bh=l.bar.y-by-8;l.board={x:8,y:by,w:W-16,h:bh,vertical:true};}
  else{const side=Math.min(W*.31,360),need=4*24+14,r0=Math.min(H*.22,side*.36),r1=Math.max(H*.12,Math.min(r0,(H-top-need-Math.min(H*.12,60)-Math.min(28,H*.07)-40)/2));l.wheel={cx:side/2,cy:top+r1+6,r:r1};l.dealer={x:side*.06,y:l.wheel.cy+l.wheel.r+10,h:Math.min(H*.12,60)};
   l.hist={x:10,y:l.dealer.y+l.dealer.h+8,w:side-20,h:Math.min(28,H*.07)};l.people={x:10,y:l.hist.y+l.hist.h+8,w:side-20,h:Math.min(H-(l.hist.y+l.hist.h+16),150),column:true};
   const barH=Math.max(100,Math.min(H*.26,130));l.bar={x:side,y:H-barH,w:W-side,h:barH};l.phase={x:side,y:top,w:W-side,h:42};
   const by=l.phase.y+l.phase.h+4;l.board={x:side+8,y:by,w:W-side-16,h:l.bar.y-by-6,vertical:false};}
  // the cross axis: even-money, dozens, then three number columns
  const B=l.board,cross=B.vertical?B.w:B.h,along=B.vertical?B.h:B.w,cw=[.16,.16,.226,.226,.226].map(f=>f*cross/1.054),edges=[0];cw.forEach(v=>edges.push(edges[edges.length-1]+v));
  B.cross=edges;B.unit=along/14;B.span=edges[5];
  B.off=B.vertical?(B.w-B.span)/2:(B.h-B.span)/2;
  l.chipRect=null;l.primary=null;l.hd=56;L=l;G.L=l;return l;};
 // abstract (along, across) <-> screen
 const crossPx=C=>{const e=L.board.cross,i=Math.max(0,Math.min(4,Math.floor(C)));return e[i]+(e[i+1]-e[i])*(C-i);};
 const toS=(a,c)=>{const B=L.board;return B.vertical?{x:B.x+B.off+crossPx(c),y:B.y+a*B.unit}:{x:B.x+a*B.unit,y:B.y+B.off+(B.span-crossPx(c))};};
 const fromS=(px,py)=>{const B=L.board,a=B.vertical?(py-B.y)/B.unit:(px-B.x)/B.unit,o=B.vertical?px-B.x-B.off:B.span-(py-B.y-B.off),e=B.cross;let c=-1;
  for(let i=0;i<5;i++)if(o>=e[i]&&o<=e[i+1]){c=i+(o-e[i])/(e[i+1]-e[i]);break;}if(o<0)c=-.01;if(o>e[5])c=5.01;return {a,c};};
 const rectOf=(a0,c0,a1,c1)=>{const p=toS(a0,c0),q=toS(a1,c1);return {x:Math.min(p.x,q.x),y:Math.min(p.y,q.y),w:Math.abs(q.x-p.x),h:Math.abs(q.y-p.y)};};
 // what a touch at (along, across) bets on, and where its chip sits (abstract)
 function betAt(a,c){if(c<0||c>5||a<0||a>14)return null;
  if(c>=2&&a>=13)return {key:'col:'+Math.min(2,Math.floor(c-2)),at:[13.5,Math.floor(c-2)+2.5]};
  if(c<1&&a>=1&&a<13){const i=Math.min(5,Math.floor((a-1)/2));return {key:['low','even','red','black','odd','high'][i],at:[1+i*2+1,.5]};}
  if(c<2&&a>=1&&a<13){const d=Math.min(2,Math.floor((a-1)/4));return {key:'doz:'+d,at:[1+d*4+2,1.5]};}
  if(c<2)return null;
  const col=Math.min(2,Math.floor(c-2)),fc=(c-2)-col;
  // the zero and its line
  if(a<1-EDGE)return {key:'n:0',at:[.5,3.5]};
  if(a<1+EDGE){const n=col+1;if(col===0&&fc<EDGE)return {key:'f4',at:[1,2]};
   if(fc<EDGE&&col>0)return {key:col===1?'t:0:1:2':'t:0:2:3',at:[1,2+col]};if(fc>1-EDGE&&col<2)return {key:col===0?'t:0:1:2':'t:0:2:3',at:[1,3+col]};return {key:'s:0:'+n,at:[1,2.5+col]};}
  const r=Math.min(11,Math.floor(a-1)),fa=(a-1)-r,n=3*r+col+1;
  const nearRow=fa<EDGE&&r>0?-1:fa>1-EDGE&&r<11?1:0,nearCol=fc<EDGE&&col>0?-1:fc>1-EDGE&&col<2?1:0,outer=col===0&&fc<EDGE;
  if(outer){if(nearRow){const rr=nearRow<0?r-1:r;return {key:'sl:'+rr,at:[rr+2,2]};}return {key:'st:'+r,at:[r+1.5,2]};}
  if(nearRow&&nearCol){const tr=nearRow<0?r-1:r,lc=nearCol<0?col-1:col,tl=3*tr+lc+1;return {key:'c:'+tl,at:[tr+2,lc+3]};}
  if(nearCol){const lc=nearCol<0?col-1:col,m=3*r+lc+1;return {key:`s:${m}:${m+1}`,at:[r+1.5,lc+3]};}
  if(nearRow){const tr=nearRow<0?r-1:r,m=3*tr+col+1;return {key:`s:${m}:${m+3}`,at:[tr+2,col+2.5]};}
  return {key:'n:'+n,at:[r+1.5,col+2.5]};}
 // where a placed bet's chips sit (the same as when it was placed)
 const chipAt={};
 // ---- placing chips
 const roomFor=p=>Math.max(0,Math.min(MAX-staked(p),st.bank[p]));
 function place(p,key,amt,at){if(!R.rCover(key).length||amt<=0)return false;amt=Math.min(amt,roomFor(p));if(amt<=0)return false;if(at)chipAt[key]=at;
  st.bank[p]-=amt;st.bets.push({key,amt,who:p});G.snd.chips(2);G.scores();return true;}
 function unplace(p,b){const i=st.bets.lastIndexOf(b);if(i<0)return;st.bets.splice(i,1);st.bank[p]+=b.amt;G.scores();}
 // ---- input
 G.onDown=pt=>{if(F.blocking()||!localBetting())return;const q=fromS(pt.x,pt.y),b=betAt(q.a,q.c);st.press=b?{...b,pt}:null;};
 G.onDrag=pt=>{if(!st.press||!localBetting())return;const q=fromS(pt.x,pt.y),b=betAt(q.a,q.c);st.press=b?{...b,pt}:null;};
 G.onUp=(pt)=>{const b=st.press;st.press=null;if(!pt||!b||!localBetting())return;const p=st.ui.p;if(!place(p,b.key,st.chip,b.at))G.say(roomFor(p)<=0?`That's the table limit, ${first(p)}.`:'Not enough chips.',1.6);};
 G.act=id=>{if(F.act(id))return;const u=st.ui;
  if(id==='next'){st.skip=true;return;}
  if(!u||u.mode!=='bet'||!G.local(u.p))return;const p=u.p;
  if(id.startsWith('chip:')){st.chip=+id.slice(5);st.coachChip=true;return;}
  if(id==='undo'){const m=mine();if(m.length)unplace(p,m[m.length-1]);return;}
  if(id==='clear'){for(const b of mine().reverse())unplace(p,b);return;}
  if(id==='rebet'){for(const b of mine().reverse())unplace(p,b);for(const b of st.last[p])place(p,b.key,b.amt,chipAt[b.key]);return;}
  if(id==='double'){for(const b of [...mine()])place(p,b.key,b.amt,chipAt[b.key]);return;}
  if(id==='leave'){for(const b of mine().reverse())unplace(p,b);u.res({leave:1});return;}
  if(id==='done'){st.coachDone=true;u.res({bets:mine().map(b=>[b.key,b.amt])});}};
 G.key=(k,u)=>u.mode==='bet'?({enter:'done',' ':'done',backspace:'undo',z:'undo',r:'rebet',d:'double',1:'chip:5',2:'chip:25',3:'chip:100',4:'chip:500'}[k]||null):u.mode.startsWith('front')?'front:seat':null;
 // the bots (tests / s.debug.bot): a couple of bets, then done
 G.bot=u=>{const f=F.bot(u);if(f){F.res?.();return null;}
  if(u.mode==='bet'){const p=u.p,picks=cpuPicks(p);for(const [k,a] of picks)place(p,k,a,null);return {bets:mine().map(b=>[b.key,b.amt])};}return null;};
 function cpuPicks(p){const out=[],bank=st.bank[p],sk=G.cpuSkill?.()??.5,unit=bank>=600?25:bank>=150?10:5;if(bank<5)return out;
  const outside=['red','black','odd','even','low','high','doz:0','doz:1','doz:2','col:0','col:1','col:2'];
  out.push([outside[Math.floor(Math.random()*outside.length)],unit*(1+Math.floor(Math.random()*3))]);
  if(Math.random()<.6)out.push(['n:'+Math.floor(Math.random()*37),unit]);if(Math.random()<.35*(1-sk*.4))out.push([Math.random()<.5?'c:'+(1+3*Math.floor(Math.random()*10)+Math.floor(Math.random()*2)):'st:'+Math.floor(Math.random()*12),unit]);
  return out.map(([k,a])=>[k,a===5||a===25||a===100?a:25]);}
 // ---- regulars bet too (from the seed, so both phones match); their chips fly in from their seat in the people strip
 function regularBets(){for(const q of regs){if(q.bank<5||rand()>.75)continue;const n=1+Math.floor(rand()*3),opts=['red','black','odd','even','low','high','doz:0','doz:1','doz:2'];
  for(let i=0;i<n;i++){const k=rand()<.45?'n:'+Math.floor(rand()*37):opts[Math.floor(rand()*opts.length)],amt=[5,25,25,100][Math.floor(rand()*4)];if(q.bank<amt)continue;q.bank-=amt;st.bets.push({key:k,amt,who:'r'+regs.indexOf(q)});}}}
 // ---- one betting round
 async function askBets(p){const local=G.local(p);
  if(local){F.phase(`${first(p)} — PLACE YOUR BETS`,G.cpu||G.net?'Pick a chip, then tap the board. SPIN when you are ready.':(p===0&&!st.out[1]?`Pick a chip, then tap the board. Tap DONE, then pass to ${first(1)}.`:`Pick a chip, then tap the board. Your chips go on top of ${first(0)}'s.`),{p});}
  else F.phase(G.net?`${first(p)} IS BETTING ON THEIR PHONE…`:`${first(p)} IS BETTING…`,'',{p});
  st.betting=p;const m=await G.ask(p,'bet',{p,cpu:()=>({bets:cpuPicks(p)})},{leave:1});st.betting=null;
  if(m.leave){st.out[p]=true;for(const b of st.bets.filter(b=>b.who===p))unplace(p,b);G.seatSay(G.seatOf(p),'Cashing out!',1.6);return;}
  if(!local){let room=Math.min(MAX,st.bank[p]);for(const [k,a] of (Array.isArray(m.bets)?m.bets:[]).slice(0,40)){const amt=Math.max(0,Math.min(+a||0,room));if(amt&&R.rCover(k).length){place(p,k,amt,null);room-=amt;}if(G.net)await G.W8(60);else await G.W8(260);}}
  st.last[p]=st.bets.filter(b=>b.who===p).map(b=>({key:b.key,amt:b.amt}));}
 async function bettingRound(){regularBets();await G.W8(400);const ps=humans();
  if(G.net)await Promise.all(ps.map(askBets));else for(const p of ps)await askBets(p);}
 // ---- the spin
 const POCKET=2*Math.PI/37,pocketA=n=>R.WHEEL.indexOf(n)*POCKET;
 async function spinWheel(n){const D=st.fast?1:5.6,t0=G.T,w0=st.wheelA,laps=3+Math.floor(Math.random()*2);
  st.spin={n,t0,D,w0,laps,dir:-1};G.snd.whir(D*.9);F.phase('NO MORE BETS',`${G.nameOf(G.dealerId)} spins the wheel…`);G.say(['No more bets.','Rien ne va plus.','Here we go.'][Math.floor(Math.random()*3)],1.8);
  while(G.T-t0<D)await G.W8(16);G.snd.clack(1.2);st.spin.done=G.T;}
 const wheelAt=t=>{const sp=st.spin;if(!sp)return st.wheelA;const k=Math.min(1,(t-sp.t0)/sp.D);return sp.w0+Math.PI*2*1.3*(k-k*k/2)*2/1.3;};
 function ballAt(t){const sp=st.spin;if(!sp)return null;const k=Math.min(1,(t-sp.t0)/sp.D),lock=.9,wa=wheelAt(t),home=wa+pocketA(sp.n);
  const off=k>=lock?0:Math.pow(1-k/lock,2.2)*sp.laps*Math.PI*2*sp.dir*-1;let rr;
  if(k<.6)rr=1;else if(k<.9){const q=(k-.6)/.3;rr=1-(1-.72)*q-Math.abs(Math.sin(q*Math.PI*5))*.06*(1-q);}else rr=.72;
  return {a:home+off,r:rr};}
 async function spinAndPay(){const n=Math.floor(rand()*37);await spinWheel(n);st.wheelA=wheelAt(G.T);
  const col=R.rColor(n);st.result={n,t:G.T};st.history.push({n,old:false});G.say(`${n}, ${col}${n&&n<=18?', low':n?', high':''}${n?n%2?', odd':', even':''}.`,2.6);
  // pay: winners get stake + winnings back, losers are swept
  const delta={0:0,1:0},rows=[];for(const b of st.bets){const back=R.rReturn(b.key,b.amt,n);b.win=back>0;b.back=back;
   if(typeof b.who==='number'){delta[b.who]+=back-b.amt;if(back){st.bank[b.who]+=back;F.note(b.who,back-b.amt,R.rLabel(b.key));}}
   else{const q=regs[+b.who.slice(1)];if(q&&back)q.bank+=back;}}
  for(const p of [0,1])if(st.bets.some(b=>b.who===p))rows.push([p,delta[p]]);
  st.pays={rows,t:G.T};st.sweepT=G.T+1.1;G.scores();
  const won=rows.some(([,d])=>d>0);if(won)G.snd.win(rows.some(([,d])=>d>=300));else if(rows.length)G.snd.lose();
  for(const [p,d] of rows)G.moodS(G.seatOf(p),d>0?'win':d<0?'sad':'normal',2.6);
  for(const q of regs){const d=st.bets.filter(b=>b.who==='r'+regs.indexOf(q)).reduce((a,b)=>a+b.back-b.amt,0);if(d>0)G.seatSay(q,['Yes!','Lucky me.','Pay me!'][Math.floor(Math.random()*3)],1.6);}
  F.phase(`${n} ${col.toUpperCase()}`,rows.length?rows.map(([p,d])=>`${first(p)} ${d>=0?'+':'−'}${money(Math.abs(d))}`).join('   ·   '):'No bets this spin',{color:col==='red'?'#ff6a6a':col==='green'?'#5dff9a':'#ffffff'});
  st.skip=false;const t0=G.T;while(G.T-t0<(st.fast?.4:3.4)&&!(st.skip&&G.T-t0>1))await G.W8(30);
  st.bets=[];st.result=null;st.pays=null;st.spin=null;}
 // ---- drawing
 const wheelCache=new Map();
 function wheelImg(r){const k=Math.min(2,devicePixelRatio||1),key=Math.round(r)+':'+k;let c=wheelCache.get(key);if(c)return c;c=document.createElement('canvas');c.width=c.height=Math.ceil(r*2*k);const w=c.getContext('2d');w.scale(k,k);w.translate(r,r);
  // wood rim, ball track, pockets, numbers, the cone and the turret
  let g=w.createRadialGradient(0,0,r*.6,0,0,r);g.addColorStop(0,'#5a2c12');g.addColorStop(.85,'#3a1a08');g.addColorStop(1,'#1c0c04');w.fillStyle=g;w.beginPath();w.arc(0,0,r,0,7);w.fill();
  w.fillStyle='#d8c7a0';w.beginPath();w.arc(0,0,r*.9,0,7);w.fill();w.fillStyle='#2a1a10';w.beginPath();w.arc(0,0,r*.84,0,7);w.fill();
  for(let i=0;i<37;i++){const n=R.WHEEL[i],a0=i*POCKET-POCKET/2-Math.PI/2,a1=a0+POCKET;w.beginPath();w.moveTo(0,0);w.arc(0,0,r*.82,a0,a1);w.closePath();w.fillStyle=COL[R.rColor(n)];w.fill();
   w.save();w.rotate(i*POCKET);w.fillStyle='#fff';w.font=`800 ${Math.max(6,r*.085)}px ${BODY}`;w.textAlign='center';w.textBaseline='middle';w.fillText(String(n),0,-r*.74);w.restore();}
  w.strokeStyle='rgba(230,200,120,.7)';w.lineWidth=Math.max(.6,r*.008);for(let i=0;i<37;i++){const a=i*POCKET-POCKET/2-Math.PI/2;w.beginPath();w.moveTo(Math.cos(a)*r*.56,Math.sin(a)*r*.56);w.lineTo(Math.cos(a)*r*.82,Math.sin(a)*r*.82);w.stroke();}
  g=w.createRadialGradient(-r*.1,-r*.1,r*.05,0,0,r*.6);g.addColorStop(0,'#c9a25a');g.addColorStop(.5,'#7a4a1e');g.addColorStop(1,'#3a200c');w.fillStyle=g;w.beginPath();w.arc(0,0,r*.56,0,7);w.fill();
  w.strokeStyle='#e8cf8a';w.lineWidth=r*.035;for(let i=0;i<4;i++){const a=i*Math.PI/2;w.beginPath();w.moveTo(0,0);w.lineTo(Math.cos(a)*r*.32,Math.sin(a)*r*.32);w.stroke();}
  w.fillStyle='#f3dc96';w.beginPath();w.arc(0,0,r*.09,0,7);w.fill();wheelCache.set(key,c);return c;}
 function drawWheel(cx,cy,r,t){const img=wheelImg(r),a=st.spin?wheelAt(t):st.wheelA;x.save();x.translate(cx,cy);x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=r*.2;x.beginPath();x.arc(0,0,r,0,7);x.fillStyle='#120804';x.fill();x.shadowBlur=0;
  x.save();x.rotate(a);x.drawImage(img,-r,-r,r*2,r*2);x.restore();
  const b=ballAt(t)||(st.result?{a:a+pocketA(st.result.n),r:.72}:null);if(b){const br=r*(.69+Math.max(0,Math.min(1,(b.r-.72)/.28))*.18),bx=Math.cos(b.a-Math.PI/2)*br,by=Math.sin(b.a-Math.PI/2)*br;
   x.fillStyle='#fff';x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=3;x.beginPath();x.arc(bx,by,Math.max(2.2,r*.04),0,7);x.fill();x.shadowBlur=0;}
  x.restore();}
 function chip(cx,cy,d,col,amt,glow=false){x.save();if(glow){x.shadowColor='#fff4a0';x.shadowBlur=d*.6;}x.fillStyle=col;x.beginPath();x.arc(cx,cy,d/2,0,7);x.fill();x.shadowBlur=0;
  x.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=d*.12;x.setLineDash([d*.18,d*.18]);x.beginPath();x.arc(cx,cy,d*.4,0,7);x.stroke();x.setLineDash([]);
  x.fillStyle='rgba(0,0,0,.72)';x.beginPath();x.arc(cx,cy,d*.28,0,7);x.fill();x.fillStyle='#fff';x.font=`900 ${Math.max(7,d*.3)}px ${BODY}`;x.textAlign='center';x.textBaseline='middle';
  x.fillText(amt>=1000?(amt/1000)+'K':String(amt),cx,cy+.5);x.restore();}
 const ownerCol=w=>typeof w==='number'?OWN[w]:regs[+String(w).slice(1)]?.col||'#ccc';
 function drawBoard(){const B=L.board,u=B.unit,T=G.T;x.save();
  const fr=rectOf(0,0,14,5);x.fillStyle='#0b4a2c';V.rr(x,fr.x-4,fr.y-4,fr.w+8,fr.h+8,10);x.fill();
  const lit=new Set(st.press?R.rCover(st.press.key):[]),win=st.result?st.result.n:null;
  const cell=(a0,c0,a1,c1,fill,label,o={})=>{const r=rectOf(a0,c0,a1,c1),inset=Math.max(1,u*.05);x.fillStyle=fill;V.rr(x,r.x+inset,r.y+inset,r.w-inset*2,r.h-inset*2,Math.min(6,u*.18));x.fill();
   if(o.lit){x.fillStyle='rgba(255,255,255,.38)';V.rr(x,r.x+inset,r.y+inset,r.w-inset*2,r.h-inset*2,Math.min(6,u*.18));x.fill();}
   if(o.win){x.strokeStyle='#fff7b0';x.lineWidth=3;x.shadowColor='#fff7b0';x.shadowBlur=12;V.rr(x,r.x+inset,r.y+inset,r.w-inset*2,r.h-inset*2,6);x.stroke();x.shadowBlur=0;}
   if(o.diamond){x.save();x.translate(r.x+r.w/2,r.y+r.h/2);const dd=Math.min(r.w,r.h)*.34;x.fillStyle=o.diamond;x.strokeStyle='rgba(255,233,168,.8)';x.lineWidth=1.5;x.beginPath();x.moveTo(0,-dd*1.3);x.lineTo(dd*.75,0);x.lineTo(0,dd*1.3);x.lineTo(-dd*.75,0);x.closePath();x.fill();x.stroke();x.restore();}
   if(label==null)return;const rot=r.h>r.w*1.25&&!o.upright;let fs=Math.min(rot?r.w:r.h,u)*(o.small?.42:.5);x.font=`900 ${fs}px ${o.font||BODY}`;let tw=x.measureText(label).width,room=(rot?r.h:r.w)*.86;if(tw>room)fs*=room/tw;
   x.save();x.translate(r.x+r.w/2,r.y+r.h/2);if(rot)x.rotate(-Math.PI/2);x.font=`900 ${fs}px ${o.font||BODY}`;x.fillStyle=o.ink||'#fff';x.textAlign='center';x.textBaseline='middle';x.fillText(label,0,1);x.restore();
};
  cell(0,2,1,5,COL.green,'0',{lit:lit.has(0),win:win===0,font:FONT});
  for(let r=0;r<12;r++)for(let c=0;c<3;c++){const n=3*r+c+1;cell(r+1,c+2,r+2,c+3,COL[R.rColor(n)],String(n),{lit:lit.has(n),win:win===n,font:FONT,upright:true});}
  for(let c=0;c<3;c++)cell(13,c+2,14,c+3,'#0f5c36','2 TO 1',{small:true,lit:st.press?.key==='col:'+c,upright:true});
  ['1ST 12','2ND 12','3RD 12'].forEach((t,d)=>cell(1+d*4,1,5+d*4,2,'#0f5c36',t,{lit:st.press?.key==='doz:'+d}));
  [['low','1-18'],['even','EVEN'],['red',''],['black',''],['odd','ODD'],['high','19-36']].forEach(([k,t],i)=>cell(1+i*2,0,3+i*2,1,'#0f5c36',t||null,{lit:st.press?.key===k,diamond:k==='red'?COL.red:k==='black'?'#0a0a0a':null,small:true}));
  // the chips: grouped by bet and owner
  const d=Math.max(14,Math.min(u*.86,(B.span/5)*.6)),groups=new Map();for(const b of st.bets){const g=b.key+'|'+b.who;const e=groups.get(g)||{key:b.key,who:b.who,amt:0,win:b.win,back:0};e.amt+=b.amt;e.win=b.win;e.back=(e.back||0)+(b.back||0);groups.set(g,e);}
  const sweep=st.pays&&G.T>st.sweepT?Math.min(1,(G.T-st.sweepT)/.6):0;
  for(const e of groups.values()){const at=chipAt[e.key]||defaultAt(e.key);if(!at)continue;const p=toS(at[0],at[1]),ow=typeof e.who==='number'?e.who:2+(+String(e.who).slice(1)),jx=(ow%3-1)*d*.18,jy=-Math.floor(ow/3)*d*.14;
   if(st.pays&&!e.win){if(sweep>=1)continue;x.save();x.globalAlpha=1-sweep;const tx=L.wheel.cx,ty=L.wheel.cy;chip(p.x+jx+(tx-p.x)*sweep,p.y+jy+(ty-p.y)*sweep,d,ownerCol(e.who),e.amt);x.restore();continue;}
   chip(p.x+jx,p.y+jy,d,ownerCol(e.who),e.amt,e.win&&!!st.pays);
   if(e.win&&st.pays&&typeof e.who==='number'){const k=Math.min(1,(G.T-st.pays.t)/.5);x.save();x.globalAlpha=k;x.font=`900 ${Math.max(11,d*.55)}px ${BODY}`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=3;x.strokeStyle='#000';
    const t=`+${money(e.back-e.amt)}`;x.strokeText(t,p.x,p.y-d*.85-k*6);x.fillStyle='#7dff9a';x.fillText(t,p.x,p.y-d*.85-k*6);x.restore();}}
  // the dolly on the winning number
  if(win!=null){const at=win===0?[.5,3.5]:[Math.floor((win-1)/3)+1.5,(win-1)%3+2.5],p=toS(at[0],at[1]),h=d*1.1;x.save();x.fillStyle='rgba(255,255,255,.95)';x.beginPath();x.ellipse(p.x,p.y+h*.35,h*.42,h*.16,0,0,7);x.fill();
   const g=x.createLinearGradient(p.x-h*.2,0,p.x+h*.2,0);g.addColorStop(0,'#d9d9d9');g.addColorStop(.5,'#fff');g.addColorStop(1,'#bdbdbd');x.fillStyle=g;x.fillRect(p.x-h*.16,p.y-h*.55,h*.32,h*.9);x.beginPath();x.arc(p.x,p.y-h*.55,h*.2,0,7);x.fill();x.restore();}
  x.restore();}
 function defaultAt(key){const c=R.rCover(key),m=String(key).split(':');if(!c.length)return null;if(m[0]==='n'){const n=c[0];return n===0?[.5,3.5]:[Math.floor((n-1)/3)+1.5,(n-1)%3+2.5];}
  if(m[0]==='col')return [13.5,+m[1]+2.5];if(m[0]==='doz')return [1+(+m[1])*4+2,1.5];const em=['low','even','red','black','odd','high'].indexOf(key);if(em>=0)return [1+em*2+1,.5];
  // inside bets: the middle of the numbers they cover (zero counts as the row above)
  const pts=c.map(n=>n===0?[.5,3.5]:[Math.floor((n-1)/3)+1.5,(n-1)%3+2.5]);const a=pts.reduce((s,p)=>s+p[0],0)/pts.length,cc=pts.reduce((s,p)=>s+p[1],0)/pts.length;return m[0]==='st'||m[0]==='sl'?[a,2]:[a,cc];}
 function drawHistory(){const h=L.hist,list=st.history.slice(-14),n=list.length,sz=Math.min(h.h,h.w/Math.max(10,n)-2);x.save();
  list.forEach((e,i)=>{const cx=h.x+h.w-(n-i-.5)*(sz+2),cy=h.y+h.h/2,last=i===n-1&&!e.old;x.globalAlpha=e.old?.55:1;x.fillStyle=COL[R.rColor(e.n)];x.beginPath();x.arc(cx,cy,sz/2,0,7);x.fill();
   if(last){x.strokeStyle='#ffd23f';x.lineWidth=2;x.stroke();}x.fillStyle='#fff';x.font=`900 ${sz*.5}px ${BODY}`;x.textAlign='center';x.textBaseline='middle';x.fillText(String(e.n),cx,cy+.5);});
  // hot and cold over the whole history
  const cnt=new Map();for(const e of st.history)cnt.set(e.n,(cnt.get(e.n)||0)+1);const hot=[...cnt.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  x.globalAlpha=1;x.font=`900 ${Math.max(9,sz*.42)}px ${BODY}`;x.textAlign='left';x.fillStyle='#ff9a6a';x.fillText('HOT '+hot.join(' '),h.x,h.y-sz*.45);x.restore();}
 function drawPeople(){const pp=L.people,list=[...[0,1].map(p=>({kind:'p',p})),...regs.map((q,i)=>({kind:'r',q,i}))],n=list.length;x.save();
  if(pp.column){const rowH=Math.min(30,pp.h/n);list.forEach((e,i)=>drawPerson(e,pp.x,pp.y+i*rowH,pp.w,rowH-3));}
  else{const cw=pp.w/n;list.forEach((e,i)=>drawPerson(e,pp.x+i*cw,pp.y,cw-4,pp.h));}x.restore();}
 function drawPerson(e,X,Y,w,h){const isP=e.kind==='p',id=isP?s.players[e.p].character:e.q.id,col=isP?OWN[e.p]:e.q.col,active=isP&&st.betting===e.p,seat=isP?G.seatOf(e.p):e.q;
  x.fillStyle=active?'rgba(255,255,255,.16)':'rgba(0,0,0,.35)';V.rr(x,X,Y,w,h,h/2);x.fill();if(active){x.strokeStyle=col;x.lineWidth=2;V.rr(x,X,Y,w,h,h/2);x.stroke();}
  const hc=V.head(id,seat.moodT>G.T?seat.mood:'normal');if(hc)x.drawImage(hc,X+2,Y+1,h-2,h-2);x.fillStyle=col;x.beginPath();x.arc(X+h+3,Y+h/2,3.5,0,7);x.fill();
  const name=isP?first(e.p):(L.people.column?G.nameOf(e.q.id):e.q.name),bank=isP?(st.out[e.p]?'OUT':money(st.bank[e.p])):money(e.q.bank);let fs=Math.max(8,Math.min(h*.36,12));x.font=`900 ${fs}px ${BODY}`;const room=w-h-12;
  const tw=Math.max(x.measureText(name).width,x.measureText(bank).width);if(tw>room)fs*=room/tw;x.font=`900 ${fs}px ${BODY}`;x.fillStyle='#fff';x.textAlign='left';x.textBaseline='middle';x.fillText(name,X+h+9,Y+h*.33);x.fillStyle=isP?col:'rgba(255,255,255,.7)';x.fillText(bank,X+h+9,Y+h*.72);
  if(seat.say&&seat.sayT>G.T)V.bubble(x,seat.say,X+w/2,Y,11,{max:120});}
 function drawDealer(){const d=L.dealer,hc=V.head(G.dealerId,st.dmoodT>G.T?st.dmood:'normal'),hs=d.h;if(hc)x.drawImage(hc,d.x,d.y,hs,hs);
  G.pill(`${G.nameOf(G.dealerId).toUpperCase().slice(0,16)} · CROUPIER`,d.x+hs+48,d.y+hs*.3,'#2a1800','#ffe9a8',Math.max(9,hs*.19));
  if(st.say&&st.sayT>G.T)V.bubble(x,st.say,d.x+hs+20,d.y+hs*.92,Math.max(10,hs*.2),{dir:-1,max:Math.min(220,L.W*.5)});}
 function drawBar(){const b=L.bar,u=st.ui,me=u?.mode==='bet'&&G.local(u.p)?u.p:null;x.save();const g=x.createLinearGradient(0,b.y,0,b.y+b.h);g.addColorStop(0,'rgba(8,5,10,.0)');g.addColorStop(.12,'rgba(8,5,10,.9)');g.addColorStop(1,'rgba(8,5,10,.98)');x.fillStyle=g;x.fillRect(b.x,b.y,b.w,b.h);
  const pad=10,X0=b.x+pad,Wd=b.w-pad*2;
  if(me==null){L.chipRect=null;L.primary=null;
   if(st.pays){G.btn({id:'next',X:X0+Wd*.25,Y:b.y+b.h*.45,w:Wd*.5,h:Math.min(48,b.h*.36),label:st.round>=SPINS?'SEE RESULTS':'NEXT SPIN',tone:'gold'});}
   else{x.font=`400 ${Math.min(18,b.h*.16)}px ${FONT}`;x.fillStyle='#ffe9a8';x.textAlign='center';x.textBaseline='middle';x.fillText(st.spin?'GOOD LUCK!':st.betting!=null?(G.net?`WAITING FOR ${first(st.betting)}…`:`${first(st.betting)} IS BETTING…`):'',b.x+b.w/2,b.y+b.h*.55);}
   x.restore();return;}
  const total=staked(me),fs=Math.max(11,Math.min(15,b.h*.11));
  x.font=`900 ${fs}px ${BODY}`;x.textAlign='left';x.textBaseline='middle';x.fillStyle=OWN[me];x.fillText(`${first(me)}  ·  BET ${money(total)}  ·  CHIPS ${money(st.bank[me])}`,X0,b.y+b.h*.13);
  {const bw=fs*6.6,bh=fs*1.9;G.btn({id:'leave',X:X0+Wd-bw,Y:b.y+b.h*.13-bh/2,w:bw,h:bh,label:'CASH OUT',tone:'dark'});}
  // the chips
  const cy=b.y+b.h*.36,cd=Math.min(b.h*.32,Wd/CHIP_VALUES.length*.62,54);const cx0=X0+Wd*.04,cstep=(Wd*.92)/CHIP_VALUES.length;
  CHIP_VALUES.forEach((v,i)=>{const cx=cx0+cstep*(i+.5),on=v<=st.bank[me],sel=st.chip===v,lift=sel?-cd*.18:0;x.save();x.globalAlpha=on?1:.32;
   if(sel){x.shadowColor='#ffd23f';x.shadowBlur=14;}const img=V.chipImg(v,Math.round(cd));x.drawImage(img,cx-cd/2,cy-cd*V.SQ/2-cd*.2+lift,cd,cd*V.SQ+cd*.13);x.restore();
   x.font=`900 ${Math.max(9,cd*.24)}px ${BODY}`;x.fillStyle=sel?'#ffd23f':'rgba(255,255,255,.75)';x.textAlign='center';x.fillText(money(v),cx,cy+cd*.42);
   G.hits.push({id:'chip:'+v,X:cx-cstep/2,Y:cy-cd*.6,w:cstep,h:cd*1.15,on});});
  L.chipRect={x:X0,y:cy-cd*.62,w:Wd,h:cd*1.2};
  // the actions and the big button
  const ay=b.y+b.h*.64,ah=Math.min(48,b.h*.3),last=G.net||G.cpu||me===1||st.out[1-me],prim=Wd*.34,small=(Wd-prim-pad*4)/4,has=mine().length>0;
  const acts=[['undo','UNDO',has],['clear','CLEAR',has],['rebet','REBET',st.last[me].length>0&&!has],['double','×2',has]];
  acts.forEach(([id,label,on],i)=>G.btn({id,X:X0+i*(small+pad),Y:ay,w:small,h:ah,label,tone:'dark',on}));
  const pr={id:'done',X:X0+Wd-prim,Y:ay,w:prim,h:ah,label:last?'SPIN':'DONE',sub:last?(has?'':'no bet'):`${first(1-me)} next`,tone:has?'green':'dark'};G.btn(pr);L.primary={x:pr.X,y:pr.Y,w:pr.w,h:pr.h};
  x.restore();}
 function drawSpinView(){const sp=st.spin,res=st.result;if(!sp&&!res)return;const t=G.T,k=sp?Math.min(1,(t-sp.t0)/.35):1,out=res?Math.min(1,Math.max(0,(t-res.t-1.4)/.4)):0,z=k*(1-out);if(z<=0)return;
  const w=L.W,h=L.H,big=Math.min(w,h)*.36,cx=L.wheel.cx+(w/2-L.wheel.cx)*z,cy=L.wheel.cy+(h*.45-L.wheel.cy)*z,r=L.wheel.r+(big-L.wheel.r)*z;
  x.save();x.fillStyle=`rgba(0,0,0,${.55*z})`;x.fillRect(0,0,w,h);drawWheel(cx,cy,r,t);
  if(res){const col=R.rColor(res.n),q=Math.min(1,(t-res.t)/.25);x.globalAlpha=q*(1-out);x.font=`400 ${r*.42}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=r*.05;x.strokeStyle='#000';
   const lab=`${res.n} ${col.toUpperCase()}`;x.strokeText(lab,cx,cy+r*1.25);x.fillStyle=col==='red'?'#ff5a5a':col==='green'?'#5dff9a':'#fff';x.fillText(lab,cx,cy+r*1.25);}
  x.restore();}
 G.render=()=>{if(!L||L.W!==s.W||L.H!==s.H)lay();const {W,H}=L;G.hits=[];
  const g=x.createRadialGradient(W*.5,H*.35,20,W*.5,H*.5,Math.max(W,H)*.85);g.addColorStop(0,G.theme.felt||'#0f5a4c');g.addColorStop(1,G.theme.felt2||'#06241e');x.fillStyle=g;x.fillRect(0,0,W,H);
  drawBoard();drawWheel(L.wheel.cx,L.wheel.cy,L.wheel.r,G.T);drawDealer();drawHistory();drawPeople();
  // the press preview: what this touch would bet on
  const ph=st.press?{...F.phaseInfo,text:R.rLabel(st.press.key),sub:`Pays ${R.rPays(st.press.key)} to 1 · let go to bet ${money(Math.min(st.chip,roomFor(st.ui?.p??0)))}`,p:st.ui?.p}:null;
  const keep=F.phaseInfo;if(ph)F.phaseInfo={...ph,t0:keep?.t0??0,color:'#fff'};F.drawPhase(L.phase.x,L.phase.y,L.phase.w,L.phase.h);F.phaseInfo=keep;
  drawBar();F.topBar('ROULETTE',`SPIN ${Math.min(st.round,SPINS)} OF ${SPINS}`);
  drawSpinView();G.flightsDraw(20);F.draw();};
 s.debug={engine:'vegas-roulette',st,seats,regs,F,get T(){return G.T;},bot:()=>G.botAct(),layout:()=>L,hits:()=>G.hits,dealerId:G.dealerId,theme:G.theme.id,
  betAt:(px,py)=>{const q=fromS(px,py);return betAt(q.a,q.c);},screenOf:(a,c)=>toS(a,c),cover:R.rCover};
 await G.run(async()=>{lay();await F.intro();F.coachStart();
  for(st.round=1;st.round<=SPINS;st.round++){if(!humans().length)break;await bettingRound();if(!humans().length&&!st.bets.length)break;await spinAndPay();if([0,1].every(p=>st.out[p]||st.bank[p]<5))break;}
  st.ui=null;st.betting=null;F.phase('TABLE CLOSED','');for(const p of [0,1])if(!(G.cpu&&p===1)&&st.bank[p]>=G.BUY_IN*1.5)st.impressed[p]=true;
  await F.summary();await G.end('roulette');});}
Object.assign(exports,{rouletteGame});
