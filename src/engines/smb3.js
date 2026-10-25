// Super Mario Bros. 3 bonus games, played on one shared screen.
//  'nspade': N-Spade, the card-matching game from the Toad houses. 18 face-down cards; take turns flipping two.
//             A pair scores and you go again, a miss passes the turn (both players watch, like Concentration).
//             Online (s.online): both phones deal the same table from the seed; each phone flips on its own turns and
//             sends {k: card}, the other phone flips the same card.
//  'slots':   the Spade Panel picture match. Three strips scroll at different speeds; tap to stop each one and line up
//             a Mushroom, Fire Flower or Star. Players alternate four spins each.
const {clamp,shuffle}=require("src/utils.js");
const {Fx,snd,noise,jingle,outlined,rr,FONT,PCOL,settle}=require("src/engines/arenaKit.js");
const {isCpu,isOnline,cpuHotseat,cpuSkill,pickRandom}=require("src/engines/cpuKit.js");

const CARD_FACES=[['mushroom',2],['mushroom',2],['flower',3],['flower',3],['star',5],['oneup',4],['coin10',1],['coin10',1],['coin20',2]];
const PANEL=['mushroom','flower','star'],PANEL_PTS={mushroom:2,flower:3,star:5};
const BLUE='#2a3ad0',DARK='#0c103a';

function drawIcon(x,kind,cx,cy,sz,part=null){
 // part: null = whole picture, else 0/1/2 = top/middle/bottom third (for the Spade Panel strips)
 x.save();x.translate(cx,cy);if(part!==null){x.beginPath();x.rect(-sz/2,-sz/2+part*sz/3,sz,sz/3+.5);x.clip();}
 const u=sz/32;x.scale(u,u);
 if(kind==='mushroom'||kind==='oneup'){const cap=kind==='oneup'?'#2fbf3a':'#e8282c';x.fillStyle='#f6dcb0';rr(x,-8,0,16,13,4);x.fill();x.fillStyle='#000';x.fillRect(-4,3,2.5,5);x.fillRect(1.5,3,2.5,5);x.fillStyle=cap;x.beginPath();x.ellipse(0,0,15,13,0,Math.PI,0);x.lineTo(15,2);x.lineTo(-15,2);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(0,-7,4.5,0,7);x.arc(-10,-2,3.5,0,7);x.arc(10,-2,3.5,0,7);x.fill();x.strokeStyle='#000';x.lineWidth=1.4;x.beginPath();x.ellipse(0,0,15,13,0,Math.PI,0);x.lineTo(15,2);x.lineTo(-15,2);x.stroke();}
 else if(kind==='flower'){x.fillStyle='#2fbf3a';x.fillRect(-2,2,4,14);x.beginPath();x.ellipse(-6,10,6,3,-.5,0,7);x.ellipse(6,10,6,3,.5,0,7);x.fill();x.fillStyle='#ff8a1c';x.beginPath();x.ellipse(0,-6,14,9,0,0,7);x.fill();x.fillStyle='#ffe23a';x.beginPath();x.ellipse(0,-6,10,6,0,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.ellipse(0,-6,6,3.5,0,0,7);x.fill();x.fillStyle='#000';x.fillRect(-3,-8,1.6,4);x.fillRect(1.4,-8,1.6,4);}
 else if(kind==='star'){x.fillStyle='#ffd21c';x.beginPath();for(let k=0;k<10;k++){const r=k%2?6.5:15,a=k*Math.PI/5-Math.PI/2;x.lineTo(Math.cos(a)*r,Math.sin(a)*r+1);}x.closePath();x.fill();x.strokeStyle='#b07800';x.lineWidth=1.4;x.stroke();x.fillStyle='#000';x.fillRect(-4,-3,2,5);x.fillRect(2,-3,2,5);}
 else if(kind==='coin10'||kind==='coin20'){x.fillStyle='#ffd21c';x.beginPath();x.ellipse(-3,-2,8,11,0,0,7);x.fill();x.strokeStyle='#b07800';x.lineWidth=1.6;x.stroke();x.fillStyle='#b07800';x.fillRect(-4,-8,2,12);x.font='900 10px Arial';x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=2.4;x.textAlign='center';x.textBaseline='middle';x.strokeText(kind==='coin10'?'10':'20',7,8);x.fillText(kind==='coin10'?'10':'20',7,8);}
 x.restore();
}
function cardBack(x,cx,cy,w,h){x.fillStyle='#111';rr(x,cx-w/2,cy-h/2,w,h,w*.1);x.fill();x.strokeStyle='#fff';x.lineWidth=Math.max(2,w*.05);rr(x,cx-w/2+w*.08,cy-h/2+w*.08,w*.84,h-w*.16,w*.07);x.stroke();
 x.fillStyle='#fff';x.save();x.translate(cx,cy);const u=w/40;x.scale(u,u);x.beginPath();x.moveTo(0,-12);x.bezierCurveTo(10,-4,14,2,8,8);x.bezierCurveTo(5,11,1,9,1,6);x.lineTo(3,13);x.lineTo(-3,13);x.lineTo(-1,6);x.bezierCurveTo(-1,9,-5,11,-8,8);x.bezierCurveTo(-14,2,-10,-4,0,-12);x.fill();x.fillStyle='#111';x.font='900 8px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('N',0,1);x.restore();}
function bg(x,W,H,t){x.fillStyle=BLUE;x.fillRect(0,0,W,H);x.fillStyle='rgba(255,255,255,.06)';const sz=Math.max(24,Math.min(W,H)/12);for(let gy=0;gy<H/sz+1;gy++)for(let gx=0;gx<W/sz+1;gx++)if((gx+gy)%2)x.fillRect(gx*sz,gy*sz,sz,sz);
 x.fillStyle='#000';x.fillRect(0,0,W,6);x.fillRect(0,H-6,W,6);}

async function smb3(s){
 const mode=s.game.smb3Mode==='slots'?'slots':'nspade';
 const [c,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const fx=new Fx(),score=[0,0];let turn=0,t=0,msg='',msgT=0,done=false,endT=0;
 const say=(m,dur=1.6)=>{msg=m;msgT=dur;};
 const headBar=(H0)=>{const W=s.W,u=Math.min(W,s.H)/600,size=Math.round(clamp(22*u,14,30));
  for(let i=0;i<2;i++){const cx=i?W-size*3.2:size*3.2,active=turn===i&&!done;x.save();x.globalAlpha=active?1:.55;x.fillStyle=active?PCOL[i]:'rgba(0,0,0,.35)';rr(x,cx-size*2.8,H0-size*1.2,size*5.6,size*2.4,size*.6);x.fill();
   s.sprite(x,i,cx-size*1.6,H0,size*2,{exact:true,mood:active?'happy':undefined});outlined(x,String(score[i]),cx+size*.9,H0,{size:size*1.2,fill:'#fff',stroke:DARK});x.restore();}
  outlined(x,done?'':`${s.players[turn].name.toUpperCase()}’S TURN${s.online&&turn===s.online.remote?' · THEIR PHONE':''}`,W/2,H0,{size:size*.9,fill:'#ffe23a',stroke:DARK});};

 if(mode==='nspade'){
  s.hint('N-Spade from Super Mario Bros. 3. Take turns flipping two cards. A matching pair scores its prize (Star 5, 1-Up 4, Flower 3, Mushroom 2, coins 1 or 2) and you go again; a miss passes the turn. Most points when the table is cleared wins. Tap a card to flip it (keyboard: arrows/WASD to move, Enter/Space to flip).');
  const faces=shuffle(CARD_FACES.flatMap(f=>[f,f]),s.random),cards=faces.map(([kind,pts],k)=>({kind,pts,k,up:false,gone:false,flip:0,matchedBy:-1}));
  let open=[],lock=0,cursor=0,keyUsed=false,misses=[0,0];
  const net=isOnline(s)?s.online:null,theirs=()=>!!net&&turn===net.remote;if(net)s.hotseat=true;
  const layout=()=>{const W=s.W,H=s.H,top=H*.16,avail=H-top-H*.06,cols=W>H*1.15?6:3,rows=18/cols,cw=Math.min((W*.92)/cols,(avail/rows)*.72),ch=cw/.72,gx=(W-cw*cols)/(cols+1),gy=(avail-ch*rows)/(rows+1);
   return cards.map((cd,k)=>({x:gx+(k%cols)*(cw+gx)+cw/2,y:top+gy+Math.floor(k/cols)*(ch+gy)+ch/2,w:cw*.94,h:ch*.94}));};
  const flip=(k,remote=false)=>{const cd=cards[k];if(!cd||done||lock>0||cd.up||cd.gone||open.length>=2||theirs()&&!remote)return false;if(net&&!remote)net.send({k});cd.up=true;cd.flip=0;open.push(k);snd(660,.06,{type:'square',vol:.03});
   if(open.length===2){const [a,b]=open.map(i=>cards[i]);if(a.kind===b.kind){lock=.7;setTimeout(()=>{if(!s.alive)return;a.gone=b.gone=true;a.matchedBy=b.matchedBy=turn;score[turn]+=a.pts;open=[];lock=0;jingle([784,988,1175,1568],{step:.07,type:'square',vol:.035});s.react(turn,'happy');say(`PAIR! +${a.pts}`);const L=layout()[a.k];fx.burst(L.x,L.y,{n:16,colors:['#ffe23a','#fff'],speed:200,life:.5,size:3,shape:'star'});
     if(cards.every(cd=>cd.gone))finish();},650);}
    else{lock=1.3;setTimeout(()=>{if(!s.alive)return;a.up=b.up=false;open=[];lock=0;misses[turn]++;turn=1-turn;snd(220,.18,{type:'square',vol:.03});say(`${s.players[turn].name.toUpperCase()}’S TURN`);},1200);}}};
  const finish=()=>{done=true;endT=0;s.setScores(score);const [a,b]=score;say(a===b?'TIE!':`${s.players[a>b?0:1].name.toUpperCase()} WINS!`,4);jingle([523,659,784,1047,1319,1568],{step:.1,type:'square',vol:.04});};
  s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||isCpu(s)&&turn===1||theirs())return;ev.preventDefault();const p=s.pointer(ev);layout().forEach((L,k)=>{if(Math.abs(p.x-L.x)<L.w/2&&Math.abs(p.y-L.y)<L.h/2)flip(k);});});
  s.on(document,'keydown',ev=>{if(s.paused||!s.alive)return;const k=ev.key.toLowerCase(),cols=s.W>s.H*1.15?6:3;const mv={arrowleft:-1,a:-1,arrowright:1,d:1,arrowup:-cols,w:-cols,arrowdown:cols,s:cols}[k];if(mv!==undefined){keyUsed=true;cursor=(cursor+mv+18)%18;ev.preventDefault();}else if((k===' '||k==='enter')&&!theirs()){keyUsed=true;flip(cursor);ev.preventDefault();}});
  s.debug={cards,get score(){return score;},get turn(){return turn;},flip,get done(){return done;},bot:net?()=>{if(done||lock>0||open.length>=2||theirs()||s.paused)return '';const live=cards.filter(cd=>!cd.gone&&!cd.up),cd=live[Math.floor(Math.random()*live.length)];return cd&&flip(cd.k)!==false?'card'+cd.k:'';}:null};
  if(net)void (async()=>{for(;;){const m=await net.next();if(!m||!s.alive)return;while(s.alive&&!done&&(s.paused||lock>0||open.length>=2||!theirs()))await new Promise(r=>setTimeout(r,60));if(!s.alive||done)return;if(Number.isInteger(m.k))flip(m.k,true);}})();
  // vs CPU: player 2 remembers each card it sees flipped (about 62% / 77% / 90% of them, by level), takes a known pair,
  // matches its first card from memory, and otherwise turns over a card nobody has seen.
  if(isCpu(s)){const memory=new Map(),recall=.45+.5*cpuSkill(s),seen=new Set();
   s.frame(()=>{cards.forEach(cd=>{if(cd.up&&!seen.has(cd.k)){seen.add(cd.k);if(Math.random()<recall)memory.set(cd.k,cd.kind);}if(!cd.up)seen.delete(cd.k);});});
   const live=k=>!cards[k].gone&&!cards[k].up,unknown=()=>cards.filter(cd=>live(cd.k)&&!memory.has(cd.k)).map(cd=>cd.k),any=()=>cards.filter(cd=>live(cd.k)).map(cd=>cd.k);
   const mate=(kind,not)=>[...memory].find(([k,v])=>v===kind&&k!==not&&live(k))?.[0];
   cpuHotseat(s,{isTurn:()=>turn===1&&!done&&lock<=0&&open.length<2,delay:800,think:()=>{
    if(open.length===1){const k=mate(cards[open[0]].kind,open[0]);return flip(k??pickRandom(unknown().length?unknown():any()));}
    const pair=[...memory].find(([k,v])=>live(k)&&mate(v,k)!==undefined);if(pair)return flip(pair[0]);
    const u=unknown();return flip(pickRandom(u.length?u:any()));}});}
  say(`${s.players[0].name.toUpperCase()} FLIPS FIRST`,2);
  s.frame(dt=>{t+=dt;fx.update(dt);if(msgT>0)msgT-=dt;
   const W=s.W,H=s.H;bg(x,W,H,t);headBar(H*.08);const L=layout();
   cards.forEach((cd,k)=>{const l=L[k];if(cd.gone){x.save();x.globalAlpha=.25;x.strokeStyle='#fff';x.setLineDash([6,6]);rr(x,l.x-l.w/2,l.y-l.h/2,l.w,l.h,l.w*.1);x.stroke();x.restore();return;}
    cd.flip=Math.min(1,cd.flip+dt*6);const show=cd.up?cd.flip:1-Math.min(1,cd.flip),sc=Math.abs(Math.cos(show*Math.PI));x.save();x.translate(l.x,l.y);x.scale(Math.max(.04,sc),1);
    if(cd.up&&cd.flip>.5){x.fillStyle='#fff';rr(x,-l.w/2,-l.h/2,l.w,l.h,l.w*.1);x.fill();x.strokeStyle='#000';x.lineWidth=2;x.stroke();drawIcon(x,cd.kind,0,0,l.w*.7);}else cardBack(x,0,0,l.w,l.h);x.restore();
    if(keyUsed&&k===cursor){x.strokeStyle='#ffe23a';x.lineWidth=4;rr(x,l.x-l.w/2-5,l.y-l.h/2-5,l.w+10,l.h+10,l.w*.12);x.stroke();}});
   fx.draw(x);
   if(msgT>0){const a=clamp(msgT*3,0,1),size=Math.min(W*.07,H*.08,52);x.save();x.globalAlpha=a;x.fillStyle='rgba(12,16,58,.7)';x.fillRect(0,H*.5-size,W,size*2);outlined(x,msg,W/2,H*.5,{size,fill:'#ffe23a',stroke:DARK});x.restore();}
   s.setScores(score);
   if(done){endT+=dt;if(endT>2.8){s.finish(score,`N-Spade: ${s.players[0].name} ${score[0]} points (${cards.filter(c=>c.matchedBy===0).length/2} pairs), ${s.players[1].name} ${score[1]} (${cards.filter(c=>c.matchedBy===1).length/2} pairs).`);}}
  });
  return;
 }

 // ---------------- Spade Panel slots
 s.hint('Spade Panel from Super Mario Bros. 3. Three strips slide past. Tap anywhere (or press Space/Enter) to stop the top strip, then the middle, then the bottom. Line up a whole picture: Star 5, Fire Flower 3, Mushroom 2. Four spins each; most points wins.');
 const SPINS=4,speeds=[2.3,1.75,1.35];let reel=null,spin=0,state='ready',resultT=0,lastResult=null;
 const newReel=()=>({pos:[s.random()*3,s.random()*3,s.random()*3],stopped:[false,false,false],slide:[0,0,0],next:0});
 const tap=()=>{if(done||s.paused)return;if(state==='ready'){reel=newReel();state='spin';snd(440,.08,{type:'square',vol:.03});return;}
  if(state==='spin'){const r=reel,k=r.next;if(k>2)return;r.stopped[k]=true;r.slide[k]=.25;r.next++;snd(330+k*110,.08,{type:'square',vol:.035});noise(.05,{vol:.04,freq:2400});}};
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();tap();});
 s.on(document,'keydown',ev=>{if(s.paused||!s.alive)return;if([' ','enter','w','arrowup'].includes(ev.key.toLowerCase())){ev.preventDefault();if(!ev.repeat)tap();}});
 s.debug={get score(){return score;},get state(){return state;},get spin(){return spin;},tap};
 say(`${s.players[0].name.toUpperCase()} SPINS FIRST`,2);
 s.frame(dt=>{t+=dt;fx.update(dt);if(msgT>0)msgT-=dt;
  const W=s.W,H=s.H;bg(x,W,H,t);headBar(H*.08);
  const box=Math.min(W*.8,H*.62),bx=W/2,by=H*.55,strip=box/3;
  // frame
  x.fillStyle='#000';rr(x,bx-box/2-14,by-box/2-14,box+28,box+28,18);x.fill();x.fillStyle='#fff';rr(x,bx-box/2-8,by-box/2-8,box+16,box+16,14);x.fill();
  x.save();x.beginPath();x.rect(bx-box/2,by-box/2,box,box);x.clip();x.fillStyle='#000';x.fillRect(bx-box/2,by-box/2,box,box);
  if(state==='spin'||state==='result'){const r=reel;for(let k=0;k<3;k++){
    if(!r.stopped[k])r.pos[k]=(r.pos[k]+speeds[k]*dt*(k===1?-1:1)+3)%3;else if(r.slide[k]>0){const target=Math.round(r.pos[k])%3,d=((target-r.pos[k]+4.5)%3)-1.5;r.pos[k]=(r.pos[k]+d*Math.min(1,dt*12)+3)%3;r.slide[k]-=dt;if(r.slide[k]<=0)r.pos[k]=Math.round(r.pos[k])%3;}
    const y=by-box/2+k*strip+strip/2;for(let j=-1;j<=3;j++){const idx=((Math.floor(r.pos[k])+j)%3+3)%3,off=(j-(r.pos[k]%1))*box;drawIcon(x,PANEL[idx],bx+off,by,box,k);}
    if(!r.stopped[k]){x.fillStyle='rgba(255,255,255,.06)';x.fillRect(bx-box/2,y-strip/2,box,strip);}}
   x.fillStyle='rgba(255,255,255,.35)';x.fillRect(bx-box/2,by-box/2+strip-1,box,2);x.fillRect(bx-box/2,by-box/2+strip*2-1,box,2);
   if(state==='spin'&&r.next>2&&r.slide.every(v=>v<=0)){state='result';resultT=0;const pics=r.pos.map(p=>PANEL[Math.round(p)%3]);const win=pics.every(p=>p===pics[0]);lastResult=win?pics[0]:null;
    if(win){score[turn]+=PANEL_PTS[pics[0]];jingle([523,659,784,1047,1319,1568],{step:.08,type:'square',vol:.04});say(`${pics[0]==='flower'?'FIRE FLOWER':pics[0].toUpperCase()}! +${PANEL_PTS[pics[0]]}`,1.8);s.react(turn,'happy');fx.burst(bx,by,{n:30,colors:['#ffe23a','#fff','#ff8a1c'],speed:300,life:.7,size:4,shape:'star'});}
    else{snd(200,.3,{type:'square',vol:.03,to:120});say('NO MATCH',1.3);s.react(turn,'sad');}}}
  else{drawIcon(x,PANEL[Math.floor(t*1.5)%3],bx,by,box);x.fillStyle='rgba(0,0,0,.55)';x.fillRect(bx-box/2,by-box/2,box,box);outlined(x,'TAP TO SPIN',bx,by,{size:box*.11,fill:'#fff',stroke:DARK});}
  x.restore();
  if(state==='spin'){const k=reel.next;if(k<3){x.fillStyle='#ffe23a';const ay=by-box/2+k*strip+strip/2;x.beginPath();x.moveTo(bx-box/2-22,ay-12);x.lineTo(bx-box/2-6,ay);x.lineTo(bx-box/2-22,ay+12);x.fill();x.beginPath();x.moveTo(bx+box/2+22,ay-12);x.lineTo(bx+box/2+6,ay);x.lineTo(bx+box/2+22,ay+12);x.fill();}}
  if(state==='result'){resultT+=dt;if(resultT>1.9){spin++;if(spin>=SPINS*2){done=true;endT=0;const [a,b]=score;say(a===b?'TIE!':`${s.players[a>b?0:1].name.toUpperCase()} WINS!`,4);}else{turn=1-turn;state='ready';say(`${s.players[turn].name.toUpperCase()}’S SPIN`,1.4);}}}
  const size=Math.min(W*.04,H*.04,22);outlined(x,`SPIN ${Math.min(SPINS,Math.floor(spin/2)+1)} OF ${SPINS}  ·  STAR 5 · FLOWER 3 · MUSHROOM 2`,W/2,by+box/2+30+size*.2,{size:size*.8,fill:'#fff',stroke:DARK});
  fx.draw(x);
  if(msgT>0){const a=clamp(msgT*3,0,1),sz=Math.min(W*.07,H*.08,52);x.save();x.globalAlpha=a;x.fillStyle='rgba(12,16,58,.7)';x.fillRect(0,H*.18-sz,W,sz*2);outlined(x,msg,W/2,H*.18,{size:sz,fill:'#ffe23a',stroke:DARK});x.restore();}
  s.setScores(score);
  if(done){endT+=dt;if(endT>2.6)s.finish(score,`Spade Panel: ${s.players[0].name} ${score[0]} points, ${s.players[1].name} ${score[1]}.`);}
 });
}
Object.assign(exports,{smb3});
