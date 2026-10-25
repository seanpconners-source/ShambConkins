// Monopoly games on one shared screen.
//  'speed':   Speed Die Monopoly on a 24-space board with the real property names, prices, Chance and Community Chest
//             cards. Two white dice plus the red Speed Die (1, 2, 3, Mr. Monopoly ×2, Bus). Buy what you land on,
//             pay rent (doubled for a colour set), pass GO for $200. Eight rounds; richest (cash + deeds) wins.
//  'auction': Sealed-bid auction. Eight deeds (four colour pairs) come up one at a time; each player secretly bids
//             (pass the phone), highest bid buys it. Worth = cash + list prices + $300 per completed pair.
const {clamp,shuffle}=require("src/utils.js");
const {Fx,snd,noise,jingle,outlined,rr,FONT,PCOL,settle}=require("src/engines/arenaKit.js");
const {isCpu,isOnline,cpuHotseat,cpuSkill,cpuBlunder}=require("src/engines/cpuKit.js");

const G={brown:'#8b5a2b',lightblue:'#9ad0f0',pink:'#e0559a',orange:'#f08a1c',red:'#e03a3a',yellow:'#f3d52b',green:'#2fa75a',blue:'#2f4fd6'};
const BOARD=[['GO','go'],['Mediterranean Ave','prop','brown',60,2],['Community Chest','chest'],['Baltic Ave','prop','brown',60,4],['Oriental Ave','prop','lightblue',100,6],['Connecticut Ave','prop','lightblue',120,8],
 ['Jail','jail'],['St. Charles Place','prop','pink',140,10],['Virginia Ave','prop','pink',160,12],['Chance','chance'],['St. James Place','prop','orange',180,14],['New York Ave','prop','orange',200,16],
 ['Free Parking','parking'],['Kentucky Ave','prop','red',220,18],['Chance','chance'],['Illinois Ave','prop','red',240,20],['Ventnor Ave','prop','yellow',260,22],['Marvin Gardens','prop','yellow',280,24],
 ['Go to Jail','gojail'],['Pacific Ave','prop','green',300,26],['Pennsylvania Ave','prop','green',320,28],['Luxury Tax','tax'],['Park Place','prop','blue',350,35],['Boardwalk','prop','blue',400,50]]
 .map(([name,kind,group,price,rent],i)=>({i,name,kind,group,price,rent}));
const CHANCE=[['Advance to GO. Collect $200.','goto',0],['Advance to Boardwalk.','goto',23],['Go back three spaces.','back',3],['Go directly to Jail. Do not pass GO.','jail'],['Bank pays you a dividend of $50.','cash',50],['Your building loan matures. Collect $150.','cash',150],['Speeding fine: pay $15.','cash',-15],['Advance to Illinois Avenue.','goto',15]];
const CHEST=[['Bank error in your favour. Collect $200.','cash',200],['Doctor’s fee. Pay $50.','cash',-50],['From sale of stock you get $50.','cash',50],['Income tax refund. Collect $20.','cash',20],['It is your birthday. Collect $10 from your rival.','birthday',10],['Pay hospital fees of $100.','cash',-100],['You inherit $100.','cash',100],['Holiday fund matures. Receive $100.','cash',100]];
const SPEED=['1','2','3','mr','mr','bus'],ROUNDS=8,RENT_X=4;
const FELT='#cfe9d1',INK='#1d3a24',MONO_RED='#d8262c';

function cellOf(i){if(i<=6)return [6-i,6];if(i<=12)return [0,6-(i-6)];if(i<=18)return [i-12,0];return [6,i-18];}

async function monopoly(s){
 const mode=s.game.monopolyMode==='auction'?'auction':'speed';
 const [c,x]=s.canvas(900,640,{fill:true});s.body.classList.add('drag-arena-body');s.shared=mode==='speed';s.updateScores();
 if(!await settle(s))return;
 // Online (s.online): Speed Die = each phone plays its own turns; the other phone's choices {a:'roll'|'buy'|'pass'|'card'},
 // {bus:n} arrive in order and the dice come from the shared seed. Auction = both phones bid at once, each seals its own
 // bid {lot,bid}, and the deed is revealed when both bids are in.
 const net=isOnline(s)?s.online:null,me=net?net.me:0;if(net)s.hotseat=true;
 const fx=new Fx(),cpu=isCpu(s);if(cpu)s.hotseat=true;let t=0,msg='',msgT=0,buttons=[],cpuTurn=()=>false;
 const say=(m,d=2)=>{msg=m;msgT=d;};
 const button=(label,bx,by,bw,bh,onTap,{color='#fff',fill=MONO_RED,enabled=true}={})=>{buttons.push({bx,by,bw,bh,onTap,enabled});x.save();x.globalAlpha=enabled?1:.4;x.fillStyle=fill;rr(x,bx,by,bw,bh,bh*.25);x.fill();x.strokeStyle='#fff';x.lineWidth=3;x.stroke();outlined(x,label,bx+bw/2,by+bh/2+1,{size:Math.min(bh*.42,bw*.16),fill:color,stroke:INK});x.restore();};
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||cpuTurn())return;ev.preventDefault();const p=s.pointer(ev);for(const b of buttons)if(b.enabled&&p.x>=b.bx&&p.x<=b.bx+b.bw&&p.y>=b.by&&p.y<=b.by+b.bh){b.onTap();snd(700,.05,{type:'square',vol:.03});break;}});
 const keyAct={};s.on(document,'keydown',ev=>{if(s.paused||!s.alive||ev.repeat||cpuTurn())return;const k=ev.key.toLowerCase();const f=keyAct[k];if(f){ev.preventDefault();f();}});
 const money=n=>`$${Math.round(n).toLocaleString('en-US')}`;
 const deedCard=(sp,cx,cy,w,owner=-1)=>{const h=w*1.25;x.save();x.translate(cx,cy);x.fillStyle='#fff';rr(x,-w/2,-h/2,w,h,w*.05);x.fill();x.strokeStyle=INK;x.lineWidth=2;x.stroke();x.fillStyle=G[sp.group];x.fillRect(-w/2+w*.06,-h/2+w*.06,w*.88,h*.24);x.strokeRect(-w/2+w*.06,-h/2+w*.06,w*.88,h*.24);
  outlined(x,'TITLE DEED',0,-h/2+w*.13,{size:w*.06,fill:'#fff',stroke:INK,lw:1.5});outlined(x,sp.name.toUpperCase(),0,-h/2+w*.22,{size:Math.min(w*.085,w*1.25/sp.name.length),fill:'#fff',stroke:INK,lw:2});
  x.fillStyle=INK;x.font=`700 ${w*.07}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(`${mode==='auction'?'LIST PRICE':'PRICE'} ${money(sp.price)}`,0,h*.02);if(mode==='auction'){x.font=`600 ${w*.055}px ${FONT}`;x.fillText('Own both of this colour:',0,h*.16);x.fillText('+$300 at the final tally',0,h*.26);}else{x.fillText(`RENT ${money(sp.rent*RENT_X)}`,0,h*.14);x.font=`600 ${w*.055}px ${FONT}`;x.fillText(`Colour set: rent doubled`,0,h*.26);}
  if(owner>=0){x.fillStyle=PCOL[owner];rr(x,-w*.4,h*.33,w*.8,h*.11,h*.04);x.fill();outlined(x,`OWNED · ${s.players[owner].name.toUpperCase()}`,0,h*.385,{size:w*.06,fill:'#fff',stroke:INK,lw:2});}x.restore();};

 if(mode==='speed'){
  s.hint('Speed Die Monopoly. Tap ROLL: two white dice plus the red Speed Die. 1-3 adds spaces; Mr. Monopoly moves you on to the next unowned deed after your turn; the Bus lets you choose one white die or the total. Buy deeds you land on, pay rent (×2 for a colour set), draw Chance and Community Chest, pass GO for $200. Eight rounds; most cash + deed value wins. Keyboard: Space/Enter rolls or buys, N passes.');
  const P=[0,1].map(i=>({pos:0,cash:1500,jail:false,shown:0}));const owner=BOARD.map(()=>-1);let turn=0,round=1,state='roll',dice=[1,1],speed='1',diceT=0,steps=0,stepT=0,after=null,cardText='',cardKind='',winner=-1,endT=0;
  const deck={chance:shuffle(CHANCE.map((c,k)=>k),s.random),chest:shuffle(CHEST.map((c,k)=>k),s.random)};
  const worth=i=>P[i].cash+BOARD.filter(sp=>owner[sp.i]===i).reduce((a,sp)=>a+sp.price,0);
  const ownsSet=(i,g)=>BOARD.filter(sp=>sp.group===g).every(sp=>owner[sp.i]===i);
  const pay=(i,amt,to=-1)=>{P[i].cash-=amt;if(to>=0)P[to].cash+=amt;fx.pop(s.W/2,s.H*.45,`−${money(amt)}`,{color:'#ff8a8a',stroke:INK,size:24});noise(.12,{vol:.04,freq:1200});if(P[i].cash<0){state='end';winner=1-i;endT=0;say(`${s.players[i].name.toUpperCase()} IS BANKRUPT!`,4);}};
  const earn=(i,amt)=>{P[i].cash+=amt;fx.pop(s.W/2,s.H*.45,`+${money(amt)}`,{color:'#9effa8',stroke:INK,size:24});jingle([880,1175],{step:.05,type:'square',vol:.03});};
  const mineNow=remote=>!(net&&turn===net.remote&&!remote),tell=(remote,m)=>{if(net&&!remote)net.send(m);};
  const roll=(remote=false)=>{if(state!=='roll'||!mineNow(remote))return;tell(remote,{a:'roll'});state='rolling';diceT=.8;snd(300,.4,{type:'square',vol:.02,to:500});};
  const startMove=n=>{steps=n;stepT=.15;state='move';};
  const land=()=>{const p=P[turn],sp=BOARD[p.pos];
   if(sp.kind==='prop'){if(owner[sp.i]<0){if(p.cash>=sp.price){state='buy';say(`${sp.name}: buy for ${money(sp.price)}?`,2.5);return;}say(`Not enough cash for ${sp.name}.`);}
    else if(owner[sp.i]!==turn){const rent=sp.rent*RENT_X*(ownsSet(owner[sp.i],sp.group)?2:1);say(`Rent on ${sp.name}: ${money(rent)} to ${s.players[owner[sp.i]].name}`,2.4);pay(turn,rent,owner[sp.i]);s.react(turn,'sad');s.react(owner[sp.i],'happy');if(state==='end')return;}}
   else if(sp.kind==='chance'||sp.kind==='chest'){const d=sp.kind==='chance'?deck.chance:deck.chest;const k=d.shift();d.push(k);const card=(sp.kind==='chance'?CHANCE:CHEST)[k];cardText=card[0];cardKind=sp.kind;state='card';after={card};return;}
   else if(sp.kind==='tax'){say('Luxury Tax: pay $100.');pay(turn,100);if(state==='end')return;}
   else if(sp.kind==='gojail'){say('Go directly to Jail!');p.pos=6;p.shown=6;p.jail=true;snd(200,.4,{type:'square',vol:.03,to:80});}
   afterLanding();};
  const afterLanding=()=>{if(state==='end')return;if(speed==='mr'&&!after?.mrDone){after={mrDone:true};const p=P[turn];let k=1;while(k<24&&!(BOARD[(p.pos+k)%24].kind==='prop'&&owner[(p.pos+k)%24]<0))k++;if(k>=24){k=1;while(k<24&&!(BOARD[(p.pos+k)%24].kind==='prop'&&owner[(p.pos+k)%24]!==turn))k++;}if(k<24){say('Mr. Monopoly: on to the next deed!',1.6);startMove(k);return;}}
   endTurn();};
  const endTurn=()=>{after=null;if(state==='end')return;if(turn===1){round++;if(round>ROUNDS){state='end';const a=worth(0),b=worth(1);winner=a===b?-2:a>b?0:1;endT=0;say(winner===-2?'A PERFECT TIE!':`${s.players[winner].name.toUpperCase()} IS THE TYCOON!`,4);jingle([523,659,784,1047,1319],{step:.1,type:'square',vol:.04});return;}}
   turn=1-turn;state='roll';say(`${s.players[turn].name.toUpperCase()}’S TURN`,1.4);};
  const buy=(remote=false)=>{if(state!=='buy'||!mineNow(remote))return;tell(remote,{a:'buy'});const sp=BOARD[P[turn].pos];P[turn].cash-=sp.price;owner[sp.i]=turn;jingle([659,880,1175],{step:.06,type:'square',vol:.035});s.react(turn,'happy');say(ownsSet(turn,sp.group)?`Colour set! Rent doubled on ${sp.group}.`:`${s.players[turn].name} buys ${sp.name}.`,2);afterLanding();};
  const passBuy=(remote=false)=>{if(state!=='buy'||!mineNow(remote))return;tell(remote,{a:'pass'});afterLanding();};
  const bus=(n,remote=false)=>{if(state!=='bus'||!mineNow(remote))return;tell(remote,{bus:n});startMove(n);};
  keyAct[' ']=keyAct.enter=()=>{if(state==='roll')roll();else if(state==='buy')buy();else if(state==='card')resolveCard();else if(state==='bus')bus(dice[0]+dice[1]);};keyAct.n=passBuy;
  const resolveCard=(remote=false)=>{if(state!=='card'||!mineNow(remote))return;tell(remote,{a:'card'});const [text,kind,v]=after.card;after=null;const p=P[turn];
   if(kind==='cash'){if(v>0)earn(turn,v);else pay(turn,-v);if(state==='end')return;afterLanding();}
   else if(kind==='birthday'){pay(1-turn,v,turn);if(state==='end')return;afterLanding();}
   else if(kind==='jail'){p.pos=6;p.shown=6;p.jail=true;afterLanding();}
   else if(kind==='back'){p.pos=(p.pos-v+24)%24;p.shown=p.pos;state='landed';land();}
   else if(kind==='goto'){const k=(v-p.pos+24)%24;if(v===0){startMove(k||24);}else startMove(k);}};
  s.debug={P,owner,get state(){return state;},roll,buy,passBuy,resolveCard,bus,get turn(){return turn;},get round(){return round;},
   bot:net?()=>{if(s.paused||turn!==me)return null;if(state==='roll'){roll();return 'roll';}if(state==='buy'){Math.random()<.6?buy():passBuy();return 'buy';}if(state==='card'){resolveCard();return 'card';}if(state==='bus'){bus(dice[0]+dice[1]);return 'bus';}return null;}:null};
  if(net){cpuTurn=()=>turn===net.remote&&state!=='end';
   void (async()=>{const need={roll:'roll',buy:'buy',pass:'buy',card:'card'};for(;;){const m=await net.next();if(!m||!s.alive)return;const want=Number.isInteger(m.bus)?'bus':need[m.a];if(!want)continue;
    while(s.alive&&(s.paused||turn!==net.remote||state!==want))await new Promise(r=>setTimeout(r,60));if(!s.alive)return;
    if(want==='bus')bus(m.bus,true);else ({roll,buy,pass:passBuy,card:resolveCard})[m.a](true);}})();}
  // vs CPU: player 2 rolls, buys while it keeps a cash cushion (always when it completes or blocks a set),
  // rides the Bus to the best unowned deed in reach, and reads its own cards.
  if(cpu){cpuTurn=()=>turn===1&&state!=='end';
   cpuHotseat(s,{isTurn:()=>turn===1&&['roll','buy','bus','card'].includes(state),delay:900,think:()=>{
    if(state==='roll')return roll();if(state==='card')return resolveCard();
    if(state==='bus'){const opts=[dice[0],dice[1],dice[0]+dice[1]],score=n=>{const sp=BOARD[(P[1].pos+n)%24];return sp.kind==='prop'&&owner[sp.i]<0?sp.price:sp.kind==='prop'&&owner[sp.i]===0?-sp.rent*8:0;};return bus(opts.reduce((a,b)=>score(b)>score(a)?b:a));}
    const sp=BOARD[P[1].pos],key=BOARD.some(o=>o.group===sp.group&&o!==sp&&owner[o.i]>=0),cushion=key?0:350-250*cpuSkill(s);
    return P[1].cash-sp.price>=cushion&&!cpuBlunder(s)?buy():passBuy();}});}
  say(`${s.players[0].name.toUpperCase()} ROLLS FIRST`,1.8);
  s.frame(dt=>{t+=dt;fx.update(dt);if(msgT>0)msgT-=dt;buttons=[];
   if(state==='rolling'){diceT-=dt;dice=[1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];speed=SPEED[Math.floor(Math.random()*6)];if(diceT<=0){dice=[1+Math.floor(s.random()*6),1+Math.floor(s.random()*6)];speed=SPEED[Math.floor(s.random()*6)];
     if(P[turn].jail){P[turn].jail=false;pay(turn,50);say('Paid $50 to leave Jail.',1.4);if(state==='end')return;}
     if(speed==='bus'){state='bus';say('Bus! Choose how far to ride.',2);}else startMove(dice[0]+dice[1]+(/\d/.test(speed)?+speed:0));}}
   if(state==='move'){stepT-=dt;if(stepT<=0){const p=P[turn];p.pos=(p.pos+1)%24;p.shown=p.pos;steps--;stepT=.17;snd(520,.04,{type:'triangle',vol:.03});if(p.pos===0){earn(turn,200);say('Passed GO: collect $200!',1.2);}if(steps<=0){state='landed';land();}}}
   if(state==='end'){endT+=dt;if(endT>3.2){s.finish([worth(0),worth(1)],`Speed Die Monopoly: ${s.players[0].name} worth ${money(worth(0))}, ${s.players[1].name} ${money(worth(1))}.`);return;}}
   s.setScores([worth(0),worth(1)]);
   // draw board
   const W=s.W,H=s.H,wide=W>H*1.1,size=wide?Math.min(H*.96,W*.62):Math.min(W*.98,H*.62),cell=size/7,bx=wide?H*.02:(W-size)/2,by=wide?(H-size)/2:H*.01;
   x.fillStyle='#14321c';x.fillRect(0,0,W,H);x.fillStyle=FELT;x.fillRect(bx,by,size,size);x.strokeStyle=INK;x.lineWidth=3;x.strokeRect(bx,by,size,size);
   for(const sp of BOARD){const [cx0,cy0]=cellOf(sp.i),px=bx+cx0*cell,py=by+cy0*cell;x.fillStyle=['go','jail','parking','gojail'].includes(sp.kind)?'#fff1b8':'#f6fff3';x.fillRect(px,py,cell,cell);x.strokeStyle=INK;x.lineWidth=1.5;x.strokeRect(px,py,cell,cell);
    if(sp.kind==='prop'){x.fillStyle=G[sp.group];const band=cell*.24;if(cy0===6)x.fillRect(px,py,cell,band);else if(cy0===0)x.fillRect(px,py+cell-band,cell,band);else if(cx0===0)x.fillRect(px+cell-band,py,band,cell);else x.fillRect(px,py,band,cell);
     if(owner[sp.i]>=0){x.fillStyle=PCOL[owner[sp.i]];x.beginPath();x.arc(px+cell*.5,py+cell*.5,cell*.13,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=2;x.stroke();}}
    const label=sp.kind==='prop'?sp.name.split(' ').slice(0,-1).join(' ')||sp.name:sp.kind==='chance'?'❓':sp.kind==='chest'?'🧰':sp.kind==='tax'?'💍':sp.kind==='go'?'GO ➜':sp.kind==='jail'?'JAIL':sp.kind==='parking'?'🅿️':'👮';
    x.fillStyle=INK;x.font=`700 ${Math.max(7,cell*(sp.kind==='prop'?.13:.24))}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';const words=label.split(' ');words.forEach((wd,k)=>x.fillText(wd,px+cell/2,py+cell*(sp.kind==='prop'?.58:.5)+(k-(words.length-1)/2)*cell*.15));
    if(sp.kind==='prop'){x.font=`600 ${Math.max(7,cell*.11)}px ${FONT}`;x.fillText(money(sp.price),px+cell/2,py+cell*.86);}}
   // centre
   x.save();x.translate(bx+size/2,by+size*.3);x.rotate(-.12);x.fillStyle=MONO_RED;rr(x,-size*.27,-size*.055,size*.54,size*.11,4);x.fill();outlined(x,'MONOPOLY',0,1,{size:size*.07,fill:'#fff',stroke:'#7a0a0e'});x.restore();
   const dsz=cell*.55,dcx=bx+size/2,dcy=by+size*.47;const die=(v,cx,cy,red=false)=>{x.fillStyle=red?MONO_RED:'#fff';rr(x,cx-dsz/2,cy-dsz/2,dsz,dsz,dsz*.18);x.fill();x.strokeStyle=INK;x.lineWidth=2;x.stroke();
    if(v==='mr'){x.font=`${dsz*.6}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText('🎩',cx,cy);return;}if(v==='bus'){x.font=`${dsz*.6}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText('🚌',cx,cy);return;}
    const n=+v,pts={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]}[n]||[];x.fillStyle=red?'#fff':INK;for(const [a,b] of pts){x.beginPath();x.arc(cx+a*dsz*.26,cy+b*dsz*.26,dsz*.08,0,7);x.fill();}};
   die(dice[0],dcx-dsz*1.25,dcy);die(dice[1],dcx,dcy);die(speed,dcx+dsz*1.25,dcy,true);
   outlined(x,`ROUND ${Math.min(round,ROUNDS)} / ${ROUNDS}`,bx+size/2,by+size*.6,{size:cell*.2,fill:'#fff',stroke:INK});
   // tokens
   for(let i=0;i<2;i++){const [cx0,cy0]=cellOf(P[i].shown),off=P[0].shown===P[1].shown?(i?.2:-.2)*cell:0;s.sprite(x,i,bx+cx0*cell+cell/2+off,by+cy0*cell+cell*.45,cell*.62,{exact:true,mood:P[i].jail?'sad':undefined});}
   // panel: players + actions
   const px0=wide?bx+size+W*.02:W*.03,py0=wide?H*.04:by+size+H*.015,pw=wide?W-px0-W*.02:W*.94,ph=wide?H*.92:H-py0-H*.01;
   const unit=Math.min(pw/7,ph/9,46);
   for(let i=0;i<2;i++){const yy=py0+i*unit*1.6;x.fillStyle=turn===i&&state!=='end'?PCOL[i]:'rgba(255,255,255,.12)';rr(x,px0,yy,pw,unit*1.4,unit*.3);x.fill();s.sprite(x,i,px0+unit*.75,yy+unit*.7,unit*1.1,{exact:true});
    outlined(x,`${s.players[i].name.toUpperCase()}  ${money(P[i].cash)}`,px0+unit*1.5,yy+unit*.45,{size:unit*.42,fill:'#fff',stroke:INK,align:'left'});
    BOARD.filter(sp=>owner[sp.i]===i).forEach((sp,k)=>{x.fillStyle=G[sp.group];x.fillRect(px0+unit*1.5+k*unit*.36,yy+unit*.82,unit*.3,unit*.4);x.strokeStyle='#fff';x.lineWidth=1;x.strokeRect(px0+unit*1.5+k*unit*.36,yy+unit*.82,unit*.3,unit*.4);});}
   const ay=py0+unit*3.4,aw=pw,ah=Math.min(unit*1.2,ph*.14);
   if(state==='roll')button(`ROLL · ${s.players[turn].name.toUpperCase()}`,px0,ay,aw,ah,roll,{fill:PCOL[turn]});
   else if(state==='buy'){const sp=BOARD[P[turn].pos];if(wide)deedCard(sp,px0+pw/2,ay+unit*3.2+ah,Math.min(pw*.55,unit*4));button(`BUY ${money(sp.price)}`,px0,ay,aw*.58,ah,buy,{fill:'#2fa75a'});button('PASS',px0+aw*.62,ay,aw*.38,ah,passBuy,{fill:'#777'});}
   else if(state==='bus'){const opts=[dice[0],dice[1],dice[0]+dice[1]];opts.forEach((n,k)=>button(`RIDE ${n}`,px0+k*aw/3,ay,aw/3-6,ah,()=>bus(n),{fill:'#f08a1c'}));}
   else if(state==='card'){const cw=Math.min(aw,unit*7),chh=cw*.55,cxx=px0+aw/2,cyy=ay+chh/2;x.fillStyle=cardKind==='chance'?'#ffb347':'#7ec8ff';rr(x,cxx-cw/2,cyy-chh/2,cw,chh,10);x.fill();x.strokeStyle=INK;x.lineWidth=3;x.stroke();
    outlined(x,cardKind==='chance'?'CHANCE':'COMMUNITY CHEST',cxx,cyy-chh*.3,{size:chh*.14,fill:'#fff',stroke:INK});x.fillStyle=INK;x.font=`700 ${Math.max(11,chh*.11)}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';
    const words=cardText.split(' '),lines=[];let line='';for(const w of words){if(x.measureText(line+' '+w).width>cw*.86){lines.push(line);line=w;}else line=line?line+' '+w:w;}lines.push(line);lines.forEach((l,k)=>x.fillText(l,cxx,cyy+(k-(lines.length-1)/2)*chh*.14+chh*.08));
    button('OK',px0+aw*.3,ay+chh+10,aw*.4,ah*.9,resolveCard,{fill:INK});}
   if(msgT>0||state==='end'){const sz=Math.min(W*.045,H*.05,30);x.save();x.globalAlpha=state==='end'?1:clamp(msgT*3,0,1);outlined(x,msg,bx+size/2,by+size*.73,{size:sz*.8,fill:'#ffe23a',stroke:INK});x.restore();}
   fx.draw(x);
  });
  return;
 }

 // ---------------- sealed-bid auction
 s.hint('Monopoly Auction: eight deeds (four colour pairs) come up one at a time. Each player secretly sets a bid with the buttons and seals it; the phone is passed between bids. The higher bid buys the deed at that price; a tie means the bank keeps it. Final worth = cash + list prices + $300 for every completed colour pair. Keyboard: arrows change the bid, Enter seals.');
 const groups=shuffle(['brown','lightblue','pink','orange','red','yellow','green','blue'],s.random).slice(0,4),lots=shuffle(BOARD.filter(sp=>groups.includes(sp.group)),s.random);
 const P=[0,1].map(()=>({cash:1500,deeds:[]}));let lot=0,bidder=0,bids=[0,0],cur=0,state='intro',revealT=0,endT=0,lastWin=-1;
 const worth=i=>P[i].cash+P[i].deeds.reduce((a,sp)=>a+sp.price,0)+groups.filter(g=>P[i].deeds.filter(sp=>sp.group===g).length===2).length*300;
 const adj=d=>{if(state!=='bid')return;cur=clamp(cur+d,0,P[bidder].cash);};
 const theirBids=[];   // online: the other phone's sealed bid per lot
 const revealBids=()=>{state='reveal';revealT=0;const sp=lots[lot];const [a,b]=bids;lastWin=a===b?-1:a>b?0:1;if(lastWin>=0){P[lastWin].cash-=bids[lastWin];P[lastWin].deeds.push(sp);s.react(lastWin,'happy');jingle([659,880,1175],{step:.07,type:'square',vol:.035});}else noise(.2,{vol:.04,freq:800});};
 const tryReveal=()=>{if(net&&state==='wait'&&bids[me]!==null&&theirBids[lot]!==undefined){bids[net.remote]=clamp(theirBids[lot],0,P[net.remote].cash);revealBids();}};
 if(net)void (async()=>{for(;;){const m=await net.next();if(!m||!s.alive)return;if(Number.isInteger(m.lot)&&Number.isFinite(m.bid)){theirBids[m.lot]=m.bid;tryReveal();}}})();
 const seal=async()=>{if(state!=='bid')return;bids[bidder]=cur;snd(440,.08,{type:'square',vol:.03});
  if(net){net.send({lot,bid:cur});state='wait';tryReveal();return;}
  // vs CPU: the human always bids; the CPU then seals its own bid without seeing it: list price ± noise,
  // plus most of the $300 pair bonus when it holds the other deed of the colour, and some to block the human's pair.
  if(cpu){const sp=lots[lot],sk=cpuSkill(s),mine=P[1].deeds.some(d=>d.group===sp.group),theirs=P[0].deeds.some(d=>d.group===sp.group);
   const value=sp.price*(.75+.35*sk)+(mine?300*(.5+.4*sk):0)+(theirs?150*sk:0);bids[1]=Math.max(0,Math.min(P[1].cash,Math.round(value*(.8+Math.random()*.35)/10)*10));bidder=1;}
  if(bidder===0){state='wait';if(!await s.pass(1,`${s.players[0].name} has sealed a bid for ${lots[lot].name}. ${s.players[1].name}: your secret bid.`,'Ready to bid'))return;bidder=1;cur=0;state='bid';}
  else{state='wait';if(!cpu&&!await s.pass(0,'Both bids are sealed. Reveal them together.','Reveal the bids'))return;revealBids();}};
 const nextLot=async()=>{if(state!=='reveal')return;lot++;if(lot>=lots.length){state='end';endT=0;jingle([523,659,784,1047,1319],{step:.1,type:'square',vol:.04});return;}
  if(net){bidder=me;bids=[null,null];bids[me]=null;cur=0;state='bid';return;}
  state='wait';const first=cpu?0:lot%2;if(!await s.pass(first,`Next deed: ${lots[lot].name} (list price ${money(lots[lot].price)}). ${s.players[first].name} bids first, in secret.`,'Ready to bid'))return;bidder=first;bids=[0,0];cur=0;state='bid';};
 keyAct.arrowup=()=>adj(50);keyAct.arrowright=()=>adj(10);keyAct.arrowleft=()=>adj(-10);keyAct.arrowdown=()=>adj(-50);keyAct.enter=keyAct[' ']=()=>{if(state==='bid')seal();else if(state==='reveal'&&revealT>1.2)nextLot();};
 s.debug={P,get state(){return state;},get lot(){return lot;},adj,seal,nextLot,lots,get revealT(){return revealT;},
  bot:net?()=>{if(s.paused)return null;if(state==='bid'){adj(10*Math.floor(Math.random()*20));seal();return 'seal';}if(state==='reveal'&&revealT>1.2){nextLot();return 'next';}return null;}:null};
 (async()=>{if(!await s.pass(0,net?`Deed 1: ${lots[0].name} (list price ${money(lots[0].price)}). You both bid at once, in secret.`:`Deed 1: ${lots[0].name} (list price ${money(lots[0].price)}). ${s.players[0].name} bids first, in secret.`,'Ready to bid'))return;bidder=me;if(net)bids=[null,null];state='bid';})();
 s.frame(dt=>{t+=dt;fx.update(dt);buttons=[];if(state==='reveal')revealT+=dt;
  if(state==='end'){endT+=dt;if(endT>3.4){s.finish([worth(0),worth(1)],`Monopoly Auction: ${s.players[0].name} worth ${money(worth(0))}, ${s.players[1].name} ${money(worth(1))}.`);return;}}
  s.setScores(state==='end'?[worth(0),worth(1)]:[0,0]);
  const W=s.W,H=s.H;x.fillStyle='#14321c';x.fillRect(0,0,W,H);x.fillStyle=FELT;rr(x,W*.02,H*.02,W*.96,H*.96,16);x.fill();
  const sp=lots[Math.min(lot,lots.length-1)],u=Math.min(W,H)/600;
  outlined(x,`DEED ${Math.min(lot+1,lots.length)} OF ${lots.length}`,W/2,H*.07,{size:20*u,fill:'#fff',stroke:INK});
  if(state!=='end')deedCard(sp,W/2,H*.32,Math.min(W*.42,H*.3));
  if(state==='wait'&&net)outlined(x,`BID SEALED · WAITING FOR ${s.players[net.remote].name.toUpperCase()}`,W/2,H*.62,{size:20*u,fill:'#fff',stroke:INK});
  if(state==='bid'){const by=H*.6;outlined(x,`${s.players[bidder].name.toUpperCase()}’S SECRET BID`,W/2,by,{size:20*u,fill:PCOL[bidder],stroke:'#fff'});outlined(x,money(cur),W/2,by+46*u,{size:48*u,fill:'#fff',stroke:INK});
   outlined(x,`cash ${money(P[bidder].cash)}`,W/2,by+84*u,{size:14*u,fill:INK,stroke:'#fff'});
   const bw=Math.min(W*.18,110*u),bh=Math.min(H*.08,50*u),row=by+100*u,labels=[['−50',-50],['−10',-10],['+10',10],['+50',50],['+100',100]];labels.forEach(([l,d],k)=>button(l,W/2+(k-2)*(bw+8)-bw/2,row,bw,bh,()=>adj(d),{fill:d<0?'#777':'#2f4fd6'}));
   button('SEAL BID',W/2-bw*1.2,row+bh+12,bw*2.4,bh,seal,{fill:MONO_RED});}
  if(state==='reveal'||state==='end'){const by=state==='end'?H*.3:H*.62;for(let i=0;i<2;i++){const cx=W*(i?.72:.28);s.sprite(x,i,cx,by,70*u,{exact:true,mood:state==='reveal'&&lastWin===i?'win':undefined});outlined(x,state==='end'?money(worth(i)):money(bids[i]),cx,by+60*u,{size:30*u,fill:state==='reveal'&&lastWin===i?'#ffe23a':'#fff',stroke:INK});
    if(state==='end')outlined(x,`${P[i].deeds.length} deeds · ${money(P[i].cash)} cash`,cx,by+92*u,{size:14*u,fill:INK,stroke:'#fff'});}
   if(state==='reveal'){outlined(x,lastWin<0?'TIE: THE BANK KEEPS IT':`${s.players[lastWin].name.toUpperCase()} BUYS IT`,W/2,by+110*u,{size:24*u,fill:'#ffe23a',stroke:INK});if(revealT>1.2)button(lot+1>=lots.length?'FINAL TALLY':'NEXT DEED',W/2-90*u,by+135*u,180*u,46*u,nextLot,{fill:INK});}
   else{const a=worth(0),b=worth(1);outlined(x,a===b?'A PERFECT TIE!':`${s.players[a>b?0:1].name.toUpperCase()} IS THE TYCOON!`,W/2,H*.62,{size:30*u,fill:'#ffe23a',stroke:INK});}}
  // owned deeds strip
  for(let i=0;i<2;i++){const yy=H*.9,x0=i?W*.55:W*.05;outlined(x,s.players[i].name.toUpperCase(),x0,yy-18*u,{size:13*u,fill:PCOL[i],stroke:'#fff',align:'left'});P[i].deeds.forEach((d,k)=>{x.fillStyle=G[d.group];x.fillRect(x0+k*22*u,yy-6*u,18*u,24*u);x.strokeStyle='#fff';x.strokeRect(x0+k*22*u,yy-6*u,18*u,24*u);});}
  fx.draw(x);
 });
}
Object.assign(exports,{monopoly});
