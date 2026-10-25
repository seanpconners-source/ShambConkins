// Clue games.
//  'deduce': Whodunit. The real deduction game for two detectives plus Wadsworth the butler, who holds the spare
//            cards. Each turn (pass the phone; your notebook is private) make a suggestion: your rival shows you one
//            matching card if they can, otherwise Wadsworth does, otherwise nobody can disprove it. Accuse when sure:
//            right wins, wrong loses. After ten rounds each, the detective who has ruled out more cards wins.
//  'lineup': Lineup. Suspects, weapons or rooms are shown, the lights go out, and one is missing when they come back.
//            Race to tap the missing card on your own answer pad. Ten rounds.
const {clamp,shuffle}=require("src/utils.js");
const {Fx,arenaTouch,snd,noise,jingle,outlined,rr,FONT,PCOL,settle,Countdown}=require("src/engines/arenaKit.js");
const {isCpu,isOnline,cpuHotseat,cpuSkill,cpuBlunder,pickRandom}=require("src/engines/cpuKit.js");

const SUSPECTS=[['Miss Scarlet','#d8262c'],['Colonel Mustard','#e8b020'],['Mrs. White','#f4f4f4'],['Mr. Green','#2fa75a'],['Mrs. Peacock','#2f4fd6'],['Professor Plum','#8a3ab8']];
const WEAPONS=[['Candlestick','🕯️'],['Knife','🔪'],['Lead Pipe','🔩'],['Revolver','🔫'],['Rope','🪢'],['Wrench','🔧']];
const ROOMS=['Kitchen','Ballroom','Conservatory','Dining Room','Billiard Room','Library','Lounge','Hall','Study'];
const CARDS=[...SUSPECTS.map(([n,col])=>({id:'s:'+n,name:n,cat:0,col})),...WEAPONS.map(([n,ic])=>({id:'w:'+n,name:n,cat:1,icon:ic})),...ROOMS.map(n=>({id:'r:'+n,name:n,cat:2}))];
const WOOD='#3a2418',GOLD='#d9b87a',INK='#1c0f08',ROUNDS=10;

function drawCard(x,cd,cx,cy,w,h,{selected=false,known=null,hand=null,dim=false}={}){
 x.save();x.globalAlpha=dim?.35:1;x.fillStyle=cd.cat===0?'#f6ecd8':cd.cat===1?'#e8eef6':'#efe6f6';rr(x,cx-w/2,cy-h/2,w,h,Math.min(w,h)*.14);x.fill();x.strokeStyle=selected?'#ffd21c':GOLD;x.lineWidth=selected?5:2;x.stroke();
 const fs=Math.max(9,Math.min(h*.26,w*.13));
 if(cd.cat===0){x.fillStyle=cd.col;x.beginPath();x.arc(cx-w/2+h*.38,cy,h*.26,0,7);x.fill();x.strokeStyle=INK;x.lineWidth=1.5;x.stroke();x.fillStyle=INK;x.font=`700 ${fs}px ${FONT}`;x.textAlign='left';x.textBaseline='middle';x.fillText(cd.name,cx-w/2+h*.72,cy,w-h*.8);}
 else if(cd.cat===1){x.font=`${h*.48}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText(cd.icon,cx-w/2+h*.38,cy+1);x.fillStyle=INK;x.font=`700 ${fs}px ${FONT}`;x.textAlign='left';x.fillText(cd.name,cx-w/2+h*.72,cy,w-h*.8);}
 else{x.fillStyle=INK;x.font=`700 ${fs}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(cd.name,cx,cy,w*.9);}
 if(hand!==null){x.fillStyle=PCOL[hand];rr(x,cx+w/2-h*.62,cy-h/2+3,h*.58,h*.32,4);x.fill();x.fillStyle='#fff';x.font=`900 ${Math.max(7,h*.2)}px ${FONT}`;x.textAlign='center';x.fillText('HAND',cx+w/2-h*.33,cy-h/2+3+h*.16);}
 if(known){x.strokeStyle='rgba(200,30,30,.85)';x.lineWidth=3;x.beginPath();x.moveTo(cx-w/2+6,cy-h/2+6);x.lineTo(cx+w/2-6,cy+h/2-6);x.stroke();}
 x.restore();}
function wood(x,W,H){x.fillStyle=WOOD;x.fillRect(0,0,W,H);x.strokeStyle='rgba(0,0,0,.18)';x.lineWidth=2;for(let y=0;y<H;y+=22){x.beginPath();x.moveTo(0,y);for(let xx=0;xx<=W;xx+=40)x.lineTo(xx,y+Math.sin(xx*.02+y)*3);x.stroke();}}

async function clue(s){
 const mode=s.game.clueMode==='lineup'?'lineup':'deduce';
 const [c,x]=s.canvas(900,640,{fill:true});s.body.classList.add('drag-arena-body');s.shared=mode==='lineup';s.updateScores();
 if(!await settle(s))return;
 // Online (s.online, Whodunit only): each phone keeps its own notebook; the other detective's suggestions {sg:[ids]},
 // accusations {ac:[ids]} and end of turn {e} arrive in order, and the shown card is worked out the same way on both phones.
 const net=isOnline(s)&&mode==='deduce'?s.online:null,me=net?net.me:0;if(net)s.hotseat=true;
 const fx=new Fx(),cpu=isCpu(s),bot=i=>cpu&&i===1||!!net&&i===net.remote;let t=0,buttons=[];
 const button=(label,bx,by,bw,bh,onTap,{fill='#7b3a45',enabled=true}={})=>{buttons.push({bx,by,bw,bh,onTap,enabled});x.save();x.globalAlpha=enabled?1:.4;x.fillStyle=fill;rr(x,bx,by,bw,bh,bh*.25);x.fill();x.strokeStyle=GOLD;x.lineWidth=2.5;x.stroke();outlined(x,label,bx+bw/2,by+bh/2+1,{size:Math.min(bh*.42,bw*.13),fill:'#fff',stroke:INK});x.restore();};

 if(mode==='deduce'){
  s.hint('Whodunit: who did it, with what, where? Pass the phone each turn; your notebook is private. Tap one suspect, one weapon and one room, then SUGGEST: your rival shows you one of those cards if they hold any, otherwise Wadsworth shows one from the spare pile, otherwise nobody can disprove it. Crossed-out cards are ruled out. ACCUSE when sure: right wins, wrong loses. After ten rounds each, whoever has ruled out more cards wins.');
  const pickOne=list=>list[Math.floor(s.random()*list.length)];
  const answer=[pickOne(CARDS.filter(c=>c.cat===0)),pickOne(CARDS.filter(c=>c.cat===1)),pickOne(CARDS.filter(c=>c.cat===2))],rest=shuffle(CARDS.filter(c=>!answer.includes(c)),s.random);
  const hands=[rest.slice(0,6),rest.slice(6,12)],house=rest.slice(12);
  const seen=[new Set(hands[0].map(c=>c.id)),new Set(hands[1].map(c=>c.id))],shown=[new Set(),new Set()];
  let turn=0,turns=[0,0],sel=[null,null,null],state='intro',reveal=null,publicLog='',endT=0,winner=-1,endText='';
  const known=i=>seen[i].size;
  const begin=async()=>{state='wait';if(!await s.pass(turn,`${s.players[turn].name}, your detective turn (round ${turns[turn]+1} of ${ROUNDS}). Keep the notebook to yourself.`,'Open my notebook'))return;sel.fill(null);state='pick';};
  const ids=()=>sel.map(c=>c.id),fromIds=a=>{if(!Array.isArray(a))return false;a.forEach((id,k)=>sel[k]=CARDS.find(c=>c.cat===k&&c.id===id)||null);return sel.every(Boolean);};
  const suggest=(remote=false)=>{if(state!=='pick'||sel.some(v=>!v)||net&&turn===net.remote&&!remote)return;if(net&&!remote)net.send({sg:ids()});const other=1-turn,pool=hands[other].filter(c=>sel.includes(c));let by=-1,card=null;
   if(pool.length){by=other;const fresh=pool.filter(c=>!seen[turn].has(c.id));card=(fresh.length?fresh:pool)[Math.floor(s.random()*(fresh.length?fresh:pool).length)];}
   else{const hp=house.filter(c=>sel.includes(c));if(hp.length){by=2;const fresh=hp.filter(c=>!seen[turn].has(c.id));card=(fresh.length?fresh:hp)[Math.floor(s.random()*(fresh.length?fresh:hp).length)];}}
   if(card){seen[turn].add(card.id);shown[turn].add(card.id);snd(660,.1,{type:'triangle',vol:.03});}else{jingle([392,523,659],{step:.1,type:'triangle',vol:.035});}
   reveal={by,card};publicLog=`${s.players[turn].name} suggested ${sel[0].name}, ${sel[1].name}, ${sel[2].name}: ${by===other?s.players[other].name+' showed a card':by===2?'Wadsworth showed a card':'nobody could disprove it'}.`;state='reveal';};
  const accuse=(remote=false)=>{if(state!=='pick'||sel.some(v=>!v)||net&&turn===net.remote&&!remote)return;if(net&&!remote)net.send({ac:ids()});const right=sel.every((c,k)=>c===answer[k]);winner=right?turn:1-turn;state='end';endT=0;
   endText=right?`${s.players[turn].name.toUpperCase()} SOLVED IT!`:`WRONG! ${s.players[1-turn].name.toUpperCase()} WINS`;if(right){jingle([523,659,784,1047,1319],{step:.1,type:'triangle',vol:.04});s.react(turn,'win');}else{noise(.5,{vol:.06,freq:300});s.react(turn,'sad');}};
  const endTurn=(remote=false)=>{if(state!=='reveal'||net&&turn===net.remote&&!remote)return;if(net&&!remote)net.send({e:1});turns[turn]++;if(turns[0]>=ROUNDS&&turns[1]>=ROUNDS){state='end';endT=0;const a=known(0),b=known(1);winner=a===b?-2:a>b?0:1;endText=winner===-2?'THE CASE GOES COLD':`${s.players[winner].name.toUpperCase()} WAS CLOSER`;return;}turn=1-turn;begin();};
  s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||bot(turn))return;ev.preventDefault();const p=s.pointer(ev);for(const b of buttons)if(b.enabled&&p.x>=b.bx&&p.x<=b.bx+b.bw&&p.y>=b.by&&p.y<=b.by+b.bh){b.onTap();snd(560,.04,{type:'square',vol:.025});break;}});
  s.debug={answer,hands,house,seen,get state(){return state;},get turn(){return turn;},sel,pick:(cat,name)=>{sel[cat]=CARDS.find(c=>c.cat===cat&&c.name===name);},suggest,accuse,endTurn,
   bot:net?()=>{if(s.paused||turn!==me)return null;if(state==='reveal'){endTurn();return 'end';}if(state!=='pick')return null;const cand=[0,1,2].map(cat=>CARDS.filter(cd=>cd.cat===cat&&!seen[me].has(cd.id)));cand.forEach((l,k)=>sel[k]=pickRandom(l));if(cand.every(l=>l.length===1)||turns[me]>=ROUNDS-1){accuse();return 'accuse';}suggest();return 'suggest';}:null};
  if(net)void (async()=>{for(;;){const m=await net.next();if(!m||!s.alive)return;while(s.alive&&(s.paused||turn!==net.remote||state!==(m.e?'reveal':'pick')))await new Promise(r=>setTimeout(r,60));if(!s.alive)return;
   if(m.e)endTurn(true);else if(m.sg&&fromIds(m.sg))suggest(true);else if(m.ac&&fromIds(m.ac))accuse(true);}})();
  // vs CPU: player 2 keeps an honest notebook (its hand + cards shown to it), suggests unknown cards, accuses once each
  // category is down to one, and gambles on its last turn when behind. Its notebook stays hidden from the human.
  if(cpu)cpuHotseat(s,{isTurn:()=>turn===1&&(state==='pick'||state==='reveal'),delay:1500,think:()=>{if(state==='reveal')return endTurn();
   const cand=[0,1,2].map(cat=>CARDS.filter(cd=>cd.cat===cat&&!seen[1].has(cd.id)));
   if(cand.every(l=>l.length===1)||turns[1]>=ROUNDS-1&&known(1)<known(0)){cand.forEach((l,k)=>sel[k]=pickRandom(l));return accuse();}
   cand.forEach((l,k)=>sel[k]=pickRandom(cpuBlunder(s)?CARDS.filter(cd=>cd.cat===k):l));suggest();}});
  begin();
  s.frame(dt=>{t+=dt;fx.update(dt);buttons=[];const W=s.W,H=s.H;wood(x,W,H);
   if(state==='end'){endT+=dt;if(endT>4.2){const sc=winner>=0&&endText.includes('SOLVED')?(winner===0?[18,known(1)]:[known(0),18]):winner>=0&&endText.startsWith('WRONG')?(winner===0?[known(0)+1,0]:[0,known(1)+1]):[known(0),known(1)];
     s.finish(sc,`Clue: it was ${answer[0].name} with the ${answer[1].name} in the ${answer[2].name}. ${endText.toLowerCase().replace(/^./,m=>m.toUpperCase())}.`);return;}}
   s.setScores([known(0),known(1)]);
   const u=Math.min(W,H)/640,wide=W>H*1.05;
   if((state==='pick'||state==='reveal')&&bot(turn)){outlined(x,`${s.players[turn].name.toUpperCase()} IS INVESTIGATING${net?' ON THEIR PHONE':''} · ROUND ${turns[turn]+1}/${ROUNDS}`,W/2,H*.28,{size:20*u,fill:GOLD,stroke:INK});
    if(state==='reveal'){outlined(x,`${sel[0].name} · ${sel[1].name} · ${sel[2].name}`,W/2,H*.42,{size:16*u,fill:'#fff',stroke:INK});outlined(x,reveal.by===me?`YOU SHOWED ${reveal.card.name.toUpperCase()}`:reveal.by===2?'WADSWORTH SHOWED A CARD':'NOBODY COULD DISPROVE IT',W/2,H*.52,{size:16*u,fill:'#fff',stroke:INK});}
    s.sprite(x,turn,W/2,H*.72,90*u,{exact:true,mood:'think'});}
   else if(state==='pick'||state==='reveal'){const i=turn;
    outlined(x,`${s.players[i].name.toUpperCase()}’S NOTEBOOK · ROUND ${turns[i]+1}/${ROUNDS}`,W/2,22*u+8,{size:18*u,fill:GOLD,stroke:INK});
    if(publicLog&&state==='pick'){x.fillStyle='rgba(255,255,255,.75)';x.font=`600 ${Math.max(10,12*u)}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(publicLog,W/2,46*u+8,W*.95);}
    const cols=wide?[[0,0,.33],[1,.335,.33],[2,.67,.33]]:[[0,0,1],[1,0,1],[2,0,1]],top=62*u+10,bottomReserve=70*u;
    const area=H-top-bottomReserve;
    cols.forEach(([cat,fx0,fw],k)=>{const list=CARDS.filter(cd=>cd.cat===cat),perRow=wide?1:3,rows=Math.ceil(list.length/perRow),secH=wide?area:area*(cat===2?.42:.29),secY=wide?top:top+(cat===0?0:cat===1?area*.29:area*.58),
     cw=(W*fw-12)/perRow-6,ch=Math.min(secH/rows-6,44*u),x0=W*fx0+6;outlined(x,['SUSPECTS','WEAPONS','ROOMS'][cat],x0+W*fw/2-6,secY+8*u,{size:12*u,fill:'#fff',stroke:INK});
     list.forEach((cd,j)=>{const cx=x0+(j%perRow)*(cw+6)+cw/2,cy=secY+18*u+Math.floor(j/perRow)*(ch+6)+ch/2;const inHand=hands[i].includes(cd),wasShown=shown[i].has(cd.id);
      drawCard(x,cd,cx,cy,cw,ch,{selected:sel[cat]===cd,known:wasShown,hand:inHand?i:null,dim:inHand||wasShown});
      if(state==='pick')buttons.push({bx:cx-cw/2,by:cy-ch/2,bw:cw,bh:ch,enabled:true,onTap:()=>{sel[cat]=sel[cat]===cd?null:cd;}});});});
    const by=H-bottomReserve+10*u,bw=Math.min(W*.4,220*u),bh=Math.min(52*u,bottomReserve-20*u);
    if(state==='pick'){button('SUGGEST',W/2-bw-8,by,bw,bh,suggest,{enabled:sel.every(Boolean),fill:'#3f5f7b'});button('ACCUSE!',W/2+8,by,bw,bh,accuse,{enabled:sel.every(Boolean),fill:'#7b3a45'});}
    else{x.fillStyle='rgba(28,15,8,.88)';x.fillRect(0,0,W,H);const cw=Math.min(W*.6,320*u),chh=cw*.42;outlined(x,reveal.by===1-i?`${s.players[1-i].name.toUpperCase()} SHOWS YOU`:reveal.by===2?'WADSWORTH SHOWS YOU':'NOBODY CAN DISPROVE IT!',W/2,H*.3,{size:24*u,fill:GOLD,stroke:INK});
     if(reveal.card)drawCard(x,reveal.card,W/2,H*.45,cw,chh*.6);else{x.fillStyle='#fff';x.font=`600 ${15*u}px ${FONT}`;x.textAlign='center';x.fillText('Every card you named is either yours or in the envelope.',W/2,H*.45,W*.9);}
     outlined(x,`${sel[0].name} · ${sel[1].name} · ${sel[2].name}`,W/2,H*.58,{size:14*u,fill:'#fff',stroke:INK});button('END TURN',W/2-bw/2,H*.68,bw,bh,endTurn,{fill:'#3f5f7b'});}}
   else if(state==='end'){x.fillStyle='rgba(28,15,8,.6)';x.fillRect(0,0,W,H);outlined(x,endText,W/2,H*.3,{size:30*u,fill:GOLD,stroke:INK});outlined(x,'THE ENVELOPE',W/2,H*.42,{size:16*u,fill:'#fff',stroke:INK});
    const cw=Math.min(W*.3,190*u),chh=46*u;answer.forEach((cd,k)=>drawCard(x,cd,W/2+(k-1)*(cw+10),H*.52,cw,chh));for(let i=0;i<2;i++){s.sprite(x,i,W*(i?.7:.3),H*.7,70*u,{exact:true,mood:winner===i?'win':winner===1-i?'sad':undefined});outlined(x,`${known(i)} cards ruled out`,W*(i?.7:.3),H*.7+52*u,{size:13*u,fill:'#fff',stroke:INK});}}
   else{outlined(x,'CLUE',W/2,H*.4,{size:60*u,fill:GOLD,stroke:INK});outlined(x,'Tudor Mansion · the case file is sealed',W/2,H*.5,{size:16*u,fill:'#fff',stroke:INK});}
   fx.draw(x);
  });
  return;
 }

 // ---------------- Lineup
 const side=()=>s.W>s.H*1.05;
 s.hint('Lineup: the cards are shown, the lights go out, and one is missing when they come back. Be first to tap the missing card on your own answer pad (P1 top or left, P2 bottom or right). Right +1, wrong −1 and you sit out the rest of that round. Ten rounds: suspects, then weapons, then rooms.');
 const rounds=[];for(let r=0;r<10;r++){const cat=r<3?0:r<6?1:2,list=CARDS.filter(c=>c.cat===cat),shownList=cat===2?shuffle(list,s.random).slice(0,7):shuffle(list,s.random),missing=shownList[Math.floor(s.random()*shownList.length)];rounds.push({cat,shownList,missing,back:shuffle(shownList.filter(c=>c!==missing),s.random),pad:list});}
 const score=[0,0],cd=new Countdown(3);let phase='count',r=0,stage='show',stageT=0,locked=[false,false],solved=-1,endT=0,endText='';
 const zones=()=>{const W=s.W,H=s.H;return side()?{pads:[{x:0,y:0,w:W*.3,h:H},{x:W*.7,y:0,w:W*.3,h:H}],mid:{x:W*.3,y:0,w:W*.4,h:H}}:{pads:[{x:0,y:0,w:W,h:H*.33},{x:0,y:H*.67,w:W,h:H*.33}],mid:{x:0,y:H*.33,w:W,h:H*.34}};};
 const padButtons=i=>{const z=zones().pads[i],R=rounds[r],n=R.pad.length,cols=side()?(n>6?2:1):3,rows=Math.ceil(n/cols),gap=6,bw=(z.w-gap*(cols+1))/cols,bh=Math.min((z.h-gap*(rows+1)-24)/rows,48);
  return R.pad.map((cd,k)=>({cd,x:z.x+gap+(k%cols)*(bw+gap),y:z.y+24+gap+Math.floor(k/cols)*(bh+gap),w:bw,h:bh}));};
 const answer=(i,cd)=>{if(phase!=='play'||stage!=='ask'||locked[i]||solved>=0)return;const R=rounds[r];if(cd===R.missing){score[i]++;solved=i;stage='reveal';stageT=0;jingle([659,880,1175],{step:.06,type:'triangle',vol:.04});s.react(i,'happy');}
  else{score[i]=Math.max(0,score[i]-1);locked[i]=true;noise(.15,{vol:.05,freq:500});s.react(i,'sad');if(locked[0]&&locked[1]){stage='reveal';stageT=0;}}};
 arenaTouch(s,{owner:p=>{const z=zones().pads;for(let i=0;i<2;i++){const q=z[i];if(p.x>=q.x&&p.x<=q.x+q.w&&p.y>=q.y&&p.y<=q.y+q.h)return i;}return -1;},maxFingers:2,onDown:f=>{const b=padButtons(f.owner).find(b=>f.x>=b.x&&f.x<=b.x+b.w&&f.y>=b.y&&f.y<=b.y+b.h);if(b)answer(f.owner,b.cd);}});
 s.debug={rounds,score,get phase(){return phase;},get stage(){return stage;},get r(){return r;},answer};
 let cpuPlan=null;
 s.frame(dt=>{t+=dt;fx.update(dt);const W=s.W,H=s.H;wood(x,W,H);const Z=zones(),R=rounds[Math.min(r,rounds.length-1)];
  // vs CPU: player 2 answers after a reaction delay; it remembers the missing card less often on Easy and among the rooms.
  if(cpu&&phase==='play'&&stage==='ask'){const sk=cpuSkill(s);if(cpuPlan?.r!==r)cpuPlan={r,at:(3-1.8*sk)*(.7+Math.random()*.6),done:false};
   if(!cpuPlan.done&&stageT>=cpuPlan.at){cpuPlan.done=true;answer(1,Math.random()<.4+.5*sk-(R.cat===2?.1:0)?R.missing:pickRandom(R.pad.filter(cd=>cd!==R.missing)));}}
  if(phase==='count'){if(!cd.update(dt))phase='play';}
  else if(phase==='play'){stageT+=dt;
   if(stage==='show'&&stageT>(R.cat===2?3:2.4)){stage='dark';stageT=0;noise(.3,{vol:.04,freq:300});}
   else if(stage==='dark'&&stageT>.9){stage='ask';stageT=0;snd(520,.08,{type:'triangle',vol:.03});}
   else if(stage==='ask'&&stageT>8){stage='reveal';stageT=0;}
   else if(stage==='reveal'&&stageT>1.6){r++;locked=[false,false];solved=-1;stage='show';stageT=0;if(r>=rounds.length){phase='end';endT=0;const [a,b]=score;endText=a===b?'A DEAD HEAT':`${s.players[a>b?0:1].name.toUpperCase()} HAS THE SHARPER EYE`;jingle([523,659,784,1047],{step:.1,type:'triangle',vol:.04});}}}
  else{endT+=dt;if(endT>2.8){s.finish(score,`Clue Lineup: ${s.players[0].name} ${score[0]}, ${s.players[1].name} ${score[1]}.`);return;}}
  s.setScores(score);
  // middle: the lineup
  const m=Z.mid,list=stage==='show'?R.shownList:R.back,n=list.length,cols=side()?2:(n>6?4:3),rows=Math.ceil(n/cols),cw=(m.w-10*(cols+1))/cols,chh=Math.min((m.h-30-10*(rows+1))/rows,46);
  x.fillStyle='rgba(0,0,0,.25)';x.fillRect(m.x,m.y,m.w,m.h);
  if(phase!=='end'){outlined(x,`${['SUSPECTS','WEAPONS','ROOMS'][R.cat]} · ROUND ${Math.min(r+1,10)}/10`,m.x+m.w/2,m.y+14,{size:13,fill:GOLD,stroke:INK});
   if(stage==='dark'){x.fillStyle='#000';x.fillRect(m.x,m.y+24,m.w,m.h-24);outlined(x,'LIGHTS OUT…',m.x+m.w/2,m.y+m.h/2,{size:22,fill:'#fff',stroke:'#000'});}
   else if(phase==='play'){list.forEach((cd,k)=>drawCard(x,cd,m.x+10+(k%cols)*(cw+10)+cw/2,m.y+30+10+Math.floor(k/cols)*(chh+10)+chh/2,cw,chh));
    if(stage==='ask')outlined(x,'WHICH ONE IS MISSING?',m.x+m.w/2,m.y+m.h-12,{size:15,fill:'#fff',stroke:INK});
    if(stage==='reveal'){x.fillStyle='rgba(28,15,8,.8)';x.fillRect(m.x,m.y+m.h*.3,m.w,m.h*.4);outlined(x,`MISSING: ${R.missing.name.toUpperCase()}`,m.x+m.w/2,m.y+m.h*.45,{size:18,fill:GOLD,stroke:INK});outlined(x,solved>=0?`${s.players[solved].name} spotted it!`:'Nobody got it.',m.x+m.w/2,m.y+m.h*.58,{size:14,fill:'#fff',stroke:INK});}}}
  // answer pads
  for(let i=0;i<2;i++){const z=Z.pads[i];x.fillStyle=`rgba(${i?'255,111,168':'74,163,255'},.12)`;x.fillRect(z.x,z.y,z.w,z.h);outlined(x,`${s.players[i].name.toUpperCase()}  ${score[i]}`,z.x+z.w/2,z.y+13,{size:14,fill:PCOL[i],stroke:INK});
   if(phase==='play'&&stage==='ask')for(const b of padButtons(i))drawCard(x,b.cd,b.x+b.w/2,b.y+b.h/2,b.w,b.h,{dim:locked[i]});
   else{s.sprite(x,i,z.x+z.w/2,z.y+z.h*.55,Math.min(z.w,z.h)*.45,{exact:true,mood:solved===i?'win':locked[i]?'sad':undefined});}}
  fx.draw(x);if(phase==='count')cd.draw(x,W,H);
  if(phase==='end'){const size=Math.min(W*.05,H*.05,36);x.fillStyle='rgba(28,15,8,.8)';x.fillRect(0,H/2-size,W,size*2);outlined(x,endText,W/2,H/2,{size,fill:GOLD,stroke:INK});}
 });
}
Object.assign(exports,{clue});
