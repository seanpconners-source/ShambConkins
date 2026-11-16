// WORDS N' SHIT: a Words With Friends clone (owner, Nov 16: "make it look as close to the real one as possible"; our own
// name and logo). 15x15 board with the real premium squares (TW/DW/TL/DL), 104 tiles with the real letter values, 7-tile
// racks, 35-point bingo, word check against ENABLE (src/engines/wns/dict.js). Drag a tile from the rack to the board (or tap
// a tile, then a square); tap a placed tile to take it back; SHUFFLE / RECALL, SWAP, PASS, PLAY.
// Modes: 2 players on one phone (hand-off card hides the racks), vs CPU (src/engines/wns/dict.js findMoves, skill picks how
// good a move it takes), online (each phone sees only its own rack; moves {pl}/{sw}/{pa}; the bag is dealt from the shared
// seed so both phones draw the same tiles), and the board-game space (3 turns each). Arcade/online length: Quick (6 turns
// each) or Full (until the tiles run out).
const {store}=require("src/state.js");
const {vibrate}=require("src/audio.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {fullscreenSupported}=require("src/fullscreen.js");
const {voice,noise}=require("src/engines/tarantinoKit.js");
const {isCpu,isOnline,cpuSkill}=require("src/engines/cpuKit.js");
const {seededRandom}=require("src/utils.js");
const R=require("src/engines/wns/rules.js");
const DICT=require("src/engines/wns/dict.js");

const C={bg:'#dfe7ee',bg2:'#cbd8e2',frame:'#b9c7d3',sq:'#f6f8fa',sqLine:'#dbe3ea',TW:'#f08a24',DW:'#e2474f',TL:'#3a9f4a',DL:'#2f7fd0',star:'#f2b02a',
 tile0:'#fff0c9',tile1:'#f3cf83',tileEdge:'#c4924a',ink:'#3a2914',ink2:'#7a5a2e',fresh0:'#fff9df',fresh1:'#ffe39a',head0:'#2a86cf',head1:'#1b5e9c',
 text:'#20323f',soft:'#5d7282',green:'#28b14a',greenD:'#1d8c39',red:'#e2474f',btn:'#ffffff',btnText:'#1f6fb2'};
const FONT='"Helvetica Neue",Helvetica,Arial,sans-serif',RND='"Arial Rounded MT Bold","Helvetica Neue",Arial,sans-serif';
const rr=(x,X,Y,w,h,r)=>{x.beginPath();if(x.roundRect)x.roundRect(X,Y,w,h,r);else x.rect(X,Y,w,h);};

async function wordsNShit(s){
 const [c,x]=s.canvas(420,760,{fill:true});const fb=fullBleed(s,{bg:C.bg});s.body.classList.add('drag-arena-body');s.controls([]);
 const net=isOnline(s)?s.online:null,me=net?net.me:0,cpu=isCpu(s);if(net||cpu)s.hotseat=true;
 const board_=s.origin==='board'||!!s.solo?.board;
 const sound=store.profile?.settings.sound!==false;
 const sfx={
  pick(){if(sound)voice(880,.03,.03,'triangle');},
  drop(){if(sound){voice(420,.05,.05,'triangle');noise(.03,.03,{f0:2400,type:'highpass'});}vibrate(8);},
  back(){if(sound)voice(300,.05,.035,'triangle');},
  bad(){if(sound){voice(150,.14,.06,'square');voice(120,.14,.05,'square',{delay:.08});}vibrate(40);},
  play(n){if(!sound)return;[523,659,784,1047].slice(0,Math.min(4,1+Math.floor(n/12))).forEach((f,i)=>voice(f,.12,.05,'triangle',{delay:i*.07}));noise(.06,.03,{f0:3000,type:'highpass'});},
  bingo(){if(!sound)return;[523,659,784,1047,1319,1568].forEach((f,i)=>voice(f,.16,.05,'square',{delay:i*.07}));},
  swap(){if(sound)for(let i=0;i<6;i++)noise(.04,.04,{delay:i*.05,f0:1800+i*200,type:'bandpass',q:3});},
  turn(){if(sound){voice(660,.08,.04,'sine');voice(880,.1,.04,'sine',{delay:.09});}},
  win(){if(!sound)return;[392,523,659,784,1047].forEach((f,i)=>voice(f,.22,.05,'triangle',{delay:i*.12}));},
  lose(){if(sound){voice(330,.25,.05,'sine');voice(247,.4,.05,'sine',{delay:.22});}}};
 // ---------------------------------------------------------------- game state
 const rng=seededRandom(String(s.seed)+':wns');
 const G={board:R.emptyBoard(),bag:[],racks:[[],[]],score:[0,0],turn:0,passes:0,turns:[0,0],max:Infinity,last:null,log:[],over:false,best:[null,null]};
 let D=null,phase='load',viewer=net?me:cpu?0:-1,lenPick=null;
 // the human's tiles this turn: hand = tiles on the rack, pend = tiles put on the board (not played yet)
 let hand=[],pend=[],sel=null,drag=null,swapMode=false,swapSel=new Set(),passArm=0,picker=null,toast=null,anim=[],pops=[],shakeAt=0,think=null,endCard=null;
 let L=null,dpr=1,t=0,resolveTurn=null;
 const name=i=>s.players[i]?.name||`Player ${i+1}`;
 const say=(text,sec=1.8,col=C.text)=>{toast={text,until:t+sec,col};};
 // ---------------------------------------------------------------- layout
 function layout(){const W=s.W,H=s.H,top=Math.max(44,(fb?.top||0)+4),bot=fullscreenSupported()?36:8;const wide=W>H*1.08;
  if(!wide){const head=58,info=22,btnH=48;let rk=Math.min(56,(W-20)/7.4);let B=Math.min(W-8,H-top-head-info-rk-btnH-bot-26);
   if(B<W*.7){rk=Math.max(34,rk*.82);B=Math.min(W-8,H-top-head-info-rk-btnH-bot-22);}
   const btnY=H-bot-btnH,ry=btnY-14-rk,room=ry-12-(top+head+info),bx=(W-B)/2,by=top+head+info+Math.max(0,(room-B)/2),rx=(W-(rk*7+6*Math.max(3,rk*.08)))/2;
   return {W,H,wide,top,head:{x:6,y:top-2,w:W-12,h:head-4},info:{x:W/2,y:top+head+info/2-2},B,cs:B/15,bx,by,rk,rgap:Math.max(3,rk*.08),rx,ry,btn:{x:8,y:btnY,w:W-16,h:btnH}};}
  const B=Math.min(H-16,W*.6),bx=8,by=(H-B)/2,px=bx+B+14,pw=W-px-10;let rk=Math.min(54,(pw-10)/7.4);
  const head=60,y0=top+4;const ry=Math.min(H-bot-60-rk-6,y0+head+48);
  return {W,H,wide,top,head:{x:px,y:y0,w:pw,h:head},info:{x:px+pw/2,y:y0+head+18},B,cs:B/15,bx,by,rk,rgap:Math.max(3,rk*.08),rx:px+(pw-(rk*7+6*Math.max(3,rk*.08)))/2,ry,btn:{x:px,y:ry+rk+12,w:pw,h:48}};}
 const cellAt=(px,py)=>{const c_=Math.floor((px-L.bx)/L.cs),r_=Math.floor((py-L.by)/L.cs);return r_>=0&&r_<15&&c_>=0&&c_<15?{r:r_,c:c_}:null;};
 const rackSlot=i=>({x:L.rx+i*(L.rk+L.rgap),y:L.ry,w:L.rk,h:L.rk});
 function buttons(){const b=L.btn,gap=8;
  if(swapMode){const w=(b.w-gap)/2;return [{id:'cancel',label:'CANCEL',x:b.x,y:b.y,w,h:b.h},{id:'doswap',label:swapSel.size?`SWAP ${swapSel.size}`:'SWAP',x:b.x+w+gap,y:b.y,w,h:b.h,green:true,off:!swapSel.size}];}
  const w=(b.w-gap*3)/4.6;const play=myTurn()&&pend.length;
  return [{id:'swap',label:'SWAP',icon:'swap',x:b.x,y:b.y,w,h:b.h,off:!myTurn()||G.bag.length<1},
   {id:'pass',label:passArm>t?'PASS?':'PASS',icon:'pass',x:b.x+(w+gap),y:b.y,w,h:b.h,off:!myTurn(),warn:passArm>t},
   {id:pend.length?'recall':'shuffle',label:pend.length?'RECALL':'SHUFFLE',icon:pend.length?'recall':'shuffle',x:b.x+(w+gap)*2,y:b.y,w,h:b.h,off:viewer<0},
   {id:'play',label:'PLAY',x:b.x+(w+gap)*3,y:b.y,w:b.w-(w+gap)*3,h:b.h,green:true,off:!play}];}
 // ---------------------------------------------------------------- the current try: score bubble
 function tryPlay(){if(!pend.length)return null;const play=pend.map(p=>({r:p.r,c:p.c,ch:p.t==='?'?p.ch:p.t,blank:p.t==='?'}));const ev=R.evaluate(G.board,play);
  if(!ev.ok)return {ok:false,err:ev.err,play};const bad=ev.words.filter(w=>!D.has(w.word));return {...ev,play,bad};}
 const myTurn=()=>phase==='play'&&!G.over&&viewer===G.turn&&!!resolveTurn&&!think&&!picker;
 // ---------------------------------------------------------------- input
 let downAt=null;
 s.on(c,'pointerdown',ev=>{ev.preventDefault();if(!L)return;const p=s.pointer(ev);try{c.setPointerCapture(ev.pointerId);}catch{}
  if(phase==='len'){const hit=(lenPick?.hits||[]).find(h=>p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h);if(hit)hit.f();return;}
  if(endCard){if(t>endCard.at+1.2)endCard.done();return;}
  if(picker){const h=picker.hits.find(h=>p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h);if(h){h.f();}else picker.cancel();return;}
  const b=buttons().find(b=>p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h);if(b){press(b);return;}
  if(viewer<0)return;
  // rack tiles
  for(let i=0;i<hand.length;i++){const q=rackSlot(i);if(p.x>=q.x-L.rgap/2&&p.x<=q.x+q.w+L.rgap/2&&p.y>=q.y-6&&p.y<=q.y+q.h+6){
   if(swapMode){const id=hand[i].id;if(swapSel.has(id))swapSel.delete(id);else swapSel.add(id);sfx.pick();return;}
   drag={from:'hand',tile:hand[i],x:p.x,y:p.y,x0:p.x,y0:p.y,moved:false};sfx.pick();return;}}
  if(swapMode)return;
  const cell=cellAt(p.x,p.y);if(!cell)return;
  const pi=pend.findIndex(q=>q.r===cell.r&&q.c===cell.c);
  if(pi>=0&&myTurn()){drag={from:'board',tile:pend[pi],x:p.x,y:p.y,x0:p.x,y0:p.y,moved:false};sfx.pick();return;}
  if(sel&&myTurn()&&!G.board[cell.r][cell.c]){const tile=hand.find(h=>h.id===sel);sel=null;if(tile)putOnBoard(tile,cell);}});
 s.on(c,'pointermove',ev=>{if(!drag||!L)return;const p=s.pointer(ev);drag.x=p.x;drag.y=p.y;if(Math.hypot(p.x-drag.x0,p.y-drag.y0)>7)drag.moved=true;});
 s.on(c,'pointerup',ev=>{if(!drag||!L)return;const p=s.pointer(ev),d=drag;drag=null;
  if(!d.moved){// a tap: rack tile = select it, board tile = back to the rack
   if(d.from==='hand'){sel=sel===d.tile.id?null:d.tile.id;return;}
   pend=pend.filter(q=>q!==d.tile);hand.push(d.tile);delete d.tile.r;sfx.back();return;}
  const g=ghostPos(p.x,p.y),cell=cellAt(g.x,g.y);
  if(cell&&myTurn()&&!G.board[cell.r][cell.c]&&!pend.some(q=>q!==d.tile&&q.r===cell.r&&q.c===cell.c)){
   if(d.from==='board'){d.tile.r=cell.r;d.tile.c=cell.c;sfx.drop();}else putOnBoard(d.tile,cell);return;}
  // dropped on the rack: put it back / move it along the rack
  const slot=Math.max(0,Math.min(hand.length,Math.round((p.x-L.rx)/(L.rk+L.rgap)-.5)));
  if(p.y>L.ry-L.rk*.8){if(d.from==='board'){pend=pend.filter(q=>q!==d.tile);delete d.tile.r;hand.splice(slot,0,d.tile);sfx.back();}
   else{const i=hand.indexOf(d.tile);hand.splice(i,1);hand.splice(Math.min(slot,hand.length),0,d.tile);syncRack();}}
  else if(d.from==='board'){/* dropped nowhere: stays where it was */}});
 s.on(c,'pointercancel',()=>{drag=null;});
 // the dragged tile is drawn above the finger so it can be seen; it lands where it's drawn
 const ghostPos=(px,py)=>({x:px,y:py-(L?L.cs*1.4:30)});
 function putOnBoard(tile,cell){const i=hand.indexOf(tile);if(i<0)return;hand.splice(i,1);tile.r=cell.r;tile.c=cell.c;pend.push(tile);sfx.drop();
  if(tile.t==='?'){openPicker(tile);}}
 function openPicker(tile){picker={tile,hits:[],cancel(){pend=pend.filter(q=>q!==tile);delete tile.r;delete tile.ch;hand.push(tile);picker=null;},
  pick(ch){tile.ch=ch;picker=null;sfx.drop();}};}
 s.on(document,'keydown',ev=>{if(s.paused||ev.metaKey||ev.ctrlKey||ev.altKey||!myTurn())return;
  if(picker&&/^[a-zA-Z]$/.test(ev.key)){picker.pick(ev.key.toLowerCase());return;}
  if(ev.key==='Enter'){ev.preventDefault();press({id:'play'});}else if(ev.key==='Escape'||ev.key==='Backspace'){ev.preventDefault();recall();}});
 function syncRack(){if(viewer>=0)G.racks[viewer]=[...hand.map(h=>h.t),...pend.map(q=>q.t)];}
 function recall(){if(!pend.length)return;for(const p of pend){delete p.r;if(p.t==='?')delete p.ch;hand.push(p);}pend=[];sfx.back();}
 function press(b){if(b.off)return;
  switch(b.id){
   case 'shuffle':for(let i=hand.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[hand[i],hand[j]]=[hand[j],hand[i]];}syncRack();sfx.swap();break;
   case 'recall':recall();break;
   case 'swap':recall();swapMode=true;swapSel.clear();say('Tap the tiles to swap',1.6);break;
   case 'cancel':swapMode=false;swapSel.clear();break;
   case 'doswap':{if(!swapSel.size)return;if(G.bag.length<swapSel.size){say(`Only ${G.bag.length} tiles left in the bag`);sfx.bad();return;}
    const letters=hand.filter(h=>swapSel.has(h.id)).map(h=>h.t);swapMode=false;swapSel.clear();finishHuman({sw:letters.join('')});break;}
   case 'pass':if(passArm>t){passArm=0;recall();finishHuman({pa:1});}else{passArm=t+2.5;say('Tap PASS again to skip your turn',2.2);}break;
   case 'play':{const tp=tryPlay();if(!tp)return;
    if(!tp.ok){say(tp.err,2);shakeAt=t;sfx.bad();return;}
    if(tp.play.some(p=>!p.ch)){say('Pick a letter for the blank tile');return;}
    if(tp.bad.length){say(`${tp.bad.map(w=>w.word.toUpperCase()).join(', ')} ${tp.bad.length>1?'are not words':'is not a word'}`,2.4,C.red);shakeAt=t;sfx.bad();return;}
    finishHuman({pl:tp.play.map(p=>[p.r,p.c,p.ch,p.blank?1:0])});break;}}}
 function finishHuman(move){const done=resolveTurn;resolveTurn=null;pend=[];sel=null;passArm=0;done?.(move);}
 // ---------------------------------------------------------------- applying a move (same on both phones)
 function apply(p,move,{animate=false}={}){
  if(move.pl){const play=move.pl.map(([r,c_,ch,b])=>({r,c:c_,ch,blank:!!b}));const ev=R.evaluate(G.board,play);if(!ev.ok)return false;
   R.place(G.board,play);for(const q of play){const i=G.racks[p].indexOf(q.blank?'?':q.ch);if(i>=0)G.racks[p].splice(i,1);}R.refill(G.racks[p],G.bag);
   G.score[p]+=ev.score;G.passes=0;G.last={p,cells:play.map(q=>[q.r,q.c]),score:ev.score,words:ev.words.map(w=>w.word)};
   const top=ev.words.slice().sort((a,b)=>b.score-a.score)[0];if(!G.best[p]||ev.score>G.best[p].score)G.best[p]={word:top.word,score:ev.score};
   G.log.push(`${name(p)} played ${top.word.toUpperCase()} for ${ev.score}${ev.bingo?' (bingo!)':''}`);
   const lastQ=play.slice().sort((a,b)=>(a.r-b.r)||(a.c-b.c)).pop();const cx=L?L.bx+(lastQ.c+.5)*L.cs:0,cy=L?L.by+(lastQ.r+.5)*L.cs:0;
   pops.push({x:cx,y:cy,text:`+${ev.score}`,at:t,bingo:ev.bingo});if(ev.bingo){sfx.bingo();say('BINGO! +35',2.2,C.green);}else sfx.play(ev.score);
   if(animate)for(const q of play)anim.push({r:q.r,c:q.c,at:t});}
  else if(move.sw){const letters=[...String(move.sw)];for(const ch of letters){const i=G.racks[p].indexOf(ch);if(i>=0)G.racks[p].splice(i,1);}R.refill(G.racks[p],G.bag);
   for(const ch of letters){const j=Math.floor(rng()*(G.bag.length+1));G.bag.splice(j,0,ch);}G.passes++;G.log.push(`${name(p)} swapped ${letters.length} tile${letters.length>1?'s':''}`);sfx.swap();}
  else{G.passes++;G.log.push(`${name(p)} passed`);}
  G.turns[p]++;s.setScores(G.score.slice());return true;}
 function endCheck(p){
  if(G.racks[p].length===0&&G.bag.length===0){const o=1-p,v=R.rackValue(G.racks[o]);G.score[p]+=v;G.score[o]-=v;G.log.push(`${name(p)} went out: +${v} from ${name(o)}'s tiles`);return true;}
  if(G.passes>=4)return true;
  if(G.turns[0]>=G.max&&G.turns[1]>=G.max)return true;
  return false;}
 // ---------------------------------------------------------------- turns
 function startHand(p){hand=G.racks[p].map((t_,i)=>({id:`${G.turns[p]}-${i}`,t:t_}));pend=[];sel=null;swapMode=false;swapSel.clear();}
 function humanTurn(p){viewer=p;startHand(p);sfx.turn();return new Promise(res=>{resolveTurn=res;});}
 async function cpuMove(p){think={p,at:t};await s.wait(500);const t0=performance.now();
  const moves=DICT.findMoves(D,G.board,G.racks[p],{limitMs:1800});await s.wait(Math.max(300,900+Math.random()*900-(performance.now()-t0)));think=null;
  if(!moves.length){if(G.bag.length>=7){const rack=G.racks[p].slice().sort((a,b)=>R.VALUE[b]-R.VALUE[a]).filter(t_=>t_!=='?'&&t_!=='s').slice(0,3);if(rack.length)return {sw:rack.join('')};}return {pa:1};}
  moves.sort((a,b)=>b.score-a.score);const sk=cpuSkill(s),q=Math.max(0,(1-sk)*1.1+(Math.random()-.5)*.25),i=Math.min(moves.length-1,Math.floor(moves.length*Math.pow(q,1.6)));
  const m=moves[i];return {pl:m.play.map(q=>[q.r,q.c,q.ch,q.blank?1:0])};}
 async function remoteMove(){think={p:1-me,at:t,remote:true};const m=await net.next();think=null;return m;}
 async function runGame(){
  while(!G.over&&s.alive){const p=G.turn;let move;
   if(net&&p!==me){move=await remoteMove();if(!s.alive)return;if(!move){G.over=true;G.forfeit=p;break;}}
   else if(cpu&&p===1){move=await cpuMove(p);if(!s.alive)return;}
   else{if(!net&&!cpu&&!board_){viewer=-1;const last=G.log.length?G.log[G.log.length-1]+'. ':'';if(!await s.pass(p,`${last}${name(p)}'s turn. ${name(1-p)}, no peeking at the tiles!`,'Ready'))return;}
    else if(!net&&!cpu&&board_){viewer=-1;if(!await s.pass(p,`${name(p)}'s turn`,'Ready'))return;}
    move=await humanTurn(p);if(!s.alive)return;if(net)net.send(move);}
   const animate=!!(net&&p!==me)||!!(cpu&&p===1);
   if(!apply(p,move,{animate})){say('That move didn\'t fit the board',2);continue;}
   if(viewer===p&&!net&&!cpu)hand=[];// the next player's turn starts behind a hand-off card
   if(endCheck(p)){G.over=true;break;}
   G.turn=1-p;if(!net&&!cpu)viewer=-1;else{startHand(viewer);}}
  await showEnd();}
 function showEnd(){const [a,b]=G.score,w=G.forfeit!=null?1-G.forfeit:a===b?-1:a>b?0:1;
  const mine=net?me:cpu?0:-1;if(w<0||mine<0||w===mine)sfx.win();else sfx.lose();
  return new Promise(done=>{endCard={w,at:t,done:()=>{endCard=null;done();}};}).then(()=>{
   const best=[0,1].map(i=>G.best[i]?`${name(i)}'s best: ${G.best[i].word.toUpperCase()} ${G.best[i].score}`:'').filter(Boolean).join(' · ');
   s.finish(G.score.slice(),`${name(0)} ${G.score[0]} · ${name(1)} ${G.score[1]}${G.forfeit!=null?` · ${name(G.forfeit)} left`:''}${best?' · '+best:''}`);});}
 // ---------------------------------------------------------------- drawing
 function tileArt(X,Y,w,ch,val,{fresh=false,blank=false,glow=false,sel_=false}={}){
  const r=w*.14;x.save();x.fillStyle='rgba(60,40,10,.28)';rr(x,X+w*.04,Y+w*.07,w,w,r);x.fill();
  const g=x.createLinearGradient(0,Y,0,Y+w);g.addColorStop(0,fresh?C.fresh0:C.tile0);g.addColorStop(1,fresh?C.fresh1:C.tile1);x.fillStyle=g;rr(x,X,Y,w,w,r);x.fill();
  x.strokeStyle=sel_?C.green:glow?'#ff9a1f':C.tileEdge;x.lineWidth=sel_||glow?Math.max(2,w*.07):Math.max(1,w*.03);rr(x,X+.5,Y+.5,w-1,w-1,r);x.stroke();
  x.fillStyle='rgba(255,255,255,.55)';rr(x,X+w*.08,Y+w*.06,w*.84,w*.16,w*.08);x.fill();
  if(ch){x.fillStyle=blank?'#b25a1a':C.ink;x.font=`bold ${Math.round(w*.62)}px ${RND}`;x.textAlign='center';x.textBaseline='middle';x.fillText(ch.toUpperCase(),X+w*.47,Y+w*.56);}
  if(val!=null&&!blank){x.fillStyle=C.ink2;x.font=`bold ${Math.max(7,Math.round(w*.24))}px ${FONT}`;x.textAlign='right';x.textBaseline='top';x.fillText(String(val),X+w*.93,Y+w*.06);}
  x.restore();}
 function drawBoard(){const {bx,by,B,cs}=L;
  x.fillStyle=C.frame;rr(x,bx-3,by-3,B+6,B+6,8);x.fill();
  const lastSet=new Set((G.last?.cells||[]).map(([r,c_])=>r*15+c_));
  for(let r=0;r<15;r++)for(let c_=0;c_<15;c_++){const X=bx+c_*cs,Y=by+r*cs,q=G.board[r][c_],bn=R.BONUS[r][c_];
   if(q){const a=anim.find(a=>a.r===r&&a.c===c_),k=a?Math.min(1,(t-a.at)/.35):1;if(k<1){x.save();x.translate(X+cs/2,Y+cs/2);x.scale(.4+.6*k,.4+.6*k);x.translate(-X-cs/2,-Y-cs/2);}
    tileArt(X+.8,Y+.8,cs-1.6,q.ch,R.VALUE[q.ch],{blank:q.blank,glow:lastSet.has(r*15+c_)});if(k<1)x.restore();continue;}
   x.fillStyle=bn&&bn!=='ST'?C[bn]:C.sq;rr(x,X+.8,Y+.8,cs-1.6,cs-1.6,cs*.12);x.fill();
   if(bn==='ST'){x.fillStyle=C.star;star(X+cs/2,Y+cs/2,cs*.32);}
   else if(bn){x.fillStyle='#fff';x.font=`bold ${Math.round(cs*.36)}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(bn,X+cs/2,Y+cs/2+.5);}}
  // tiles being placed this turn
  const tp=pend.length?tryPlay():null;
  for(const p of pend){if(drag&&drag.tile===p)continue;const X=bx+p.c*cs,Y=by+p.r*cs,sh=shakeAt&&t-shakeAt<.4?Math.sin((t-shakeAt)*60)*cs*.08*(1-(t-shakeAt)/.4):0;
   tileArt(X+.8+sh,Y+.8,cs-1.6,p.t==='?'?p.ch||'':p.t,p.t==='?'?0:R.VALUE[p.t],{fresh:true,blank:p.t==='?'});}
  // score bubble on the last tile of the word (green = good to play, red = not a word / not allowed)
  if(tp&&pend.length&&!drag){const q=pend.slice().sort((a,b)=>(a.r-b.r)||(a.c-b.c)).pop(),X=bx+(q.c+1)*cs,Y=by+q.r*cs,ok=tp.ok&&!tp.bad.length,txt=tp.ok?String(tp.score):'?',rad=Math.max(11,cs*.48);
   x.save();x.fillStyle=ok?C.green:C.red;x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.arc(Math.min(X,bx+B-rad),Math.max(Y,by+rad),rad,0,7);x.fill();x.stroke();
   x.fillStyle='#fff';x.font=`bold ${Math.round(rad*(txt.length>2?.78:.95))}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(txt,Math.min(X,bx+B-rad),Math.max(Y,by+rad)+1);x.restore();}
  // where a dragged tile will land
  if(drag&&drag.moved){const g=ghostPos(drag.x,drag.y),cl=cellAt(g.x,g.y);if(cl&&!G.board[cl.r][cl.c]){x.strokeStyle=C.green;x.lineWidth=3;rr(x,bx+cl.c*cs+1.5,by+cl.r*cs+1.5,cs-3,cs-3,cs*.14);x.stroke();}}}
 function star(cx,cy,r){x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=i%2?r*.45:r;x.lineTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);}x.closePath();x.fill();}
 function logo(X,Y,h,maxW,center=false){// our own logo: an orange speech bubble with the name (center: X is the middle)
  x.save();x.font=`900 ${Math.round(h*.5)}px ${RND}`;const txt="Words n' Shit";let tw=x.measureText(txt).width;const k=Math.min(1,(maxW-h*.5)/(tw+h*.6));
  if(k<1){x.font=`900 ${Math.round(h*.5*k)}px ${RND}`;tw=x.measureText(txt).width;}const w=tw+h*.6;if(center)X-=w/2;
  x.fillStyle='#f39321';rr(x,X,Y,w,h*.8,h*.32);x.fill();x.beginPath();x.moveTo(X+h*.35,Y+h*.75);x.lineTo(X+h*.2,Y+h);x.lineTo(X+h*.65,Y+h*.75);x.fill();
  x.fillStyle='#fff';x.textAlign='left';x.textBaseline='middle';x.fillText(txt,X+h*.3,Y+h*.41);x.restore();return w;}
 function drawHead(){const h=L.head;
  if(!L.wide){x.fillStyle=C.head1;x.fillRect(0,0,L.W,L.top);logo(8,(L.top-30)/2+2,30,L.W-150);}
  else{x.fillStyle=C.head1;x.fillRect(h.x-6,0,L.W-h.x+6,L.top);logo(h.x,(L.top-30)/2+2,30,h.w-130);}
  const g=x.createLinearGradient(0,h.y,0,h.y+h.h);g.addColorStop(0,C.head0);g.addColorStop(1,C.head1);x.fillStyle=g;rr(x,h.x,h.y+4,h.w,h.h-4,12);x.fill();
  const cy=h.y+4+(h.h-4)/2,av=Math.min(36,h.h-14);
  for(const i of [0,1]){const left=i===0,ax=left?h.x+8+av/2:h.x+h.w-8-av/2,on=G.turn===i&&!G.over&&phase==='play';
   if(on){x.save();x.strokeStyle='#ffe066';x.lineWidth=3;x.beginPath();x.arc(ax,cy,av/2+3,0,7);x.stroke();x.restore();}
   s.sprite(x,i,ax,cy,av,{exact:true,still:true,noBadge:true,mood:G.over?(G.score[i]>=G.score[1-i]?'win':'sad'):undefined});
   x.fillStyle='#fff';x.textAlign=left?'left':'right';x.textBaseline='middle';const tx=left?ax+av/2+7:ax-av/2-7;
   x.font=`bold ${Math.round(Math.min(13,h.h*.24))}px ${FONT}`;x.fillText(name(i).slice(0,12),tx,cy-h.h*.15);
   x.font=`900 ${Math.round(Math.min(22,h.h*.38))}px ${RND}`;x.fillText(String(G.score[i]),tx,cy+h.h*.15);}
  // the bag in the middle
  const bx=h.x+h.w/2,bs=Math.min(22,h.h*.4);x.fillStyle='#ffffff26';rr(x,bx-bs*1.5,cy-bs*.95,bs*3,bs*1.9,8);x.fill();
  x.fillStyle='#fff';x.font=`900 ${Math.round(bs*.8)}px ${RND}`;x.textAlign='center';x.textBaseline='middle';x.fillText(String(G.bag.length),bx,cy-bs*.2);
  x.font=`bold ${Math.round(bs*.36)}px ${FONT}`;x.fillText('TILES LEFT',bx,cy+bs*.5);}
 function drawInfo(){let txt='';
  if(think)txt=`${name(think.p)} is ${think.remote?'playing':'thinking'}${'.'.repeat(1+Math.floor(t*3)%3)}`;
  else if(phase==='play'&&viewer>=0&&viewer===G.turn)txt=swapMode?'Pick the tiles to swap':G.max<Infinity?`Your move · turn ${G.turns[G.turn]+1} of ${G.max}`:'Your move';
  else if(G.log.length)txt=G.log[G.log.length-1];
  if(!txt)return;x.fillStyle=C.soft;x.font=`bold 12px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(txt,L.info.x,L.info.y);}
 function drawRack(){const showTiles=viewer>=0;
  // the tray
  const x0=L.rx-8,w=L.rk*7+L.rgap*6+16;const g=x.createLinearGradient(0,L.ry-6,0,L.ry+L.rk+8);g.addColorStop(0,'#3b7fb8');g.addColorStop(1,'#245d8f');x.fillStyle=g;rr(x,x0,L.ry-6,w,L.rk+14,10);x.fill();
  x.fillStyle='#ffffff30';x.fillRect(x0+6,L.ry+L.rk+2,w-12,2);
  if(!showTiles){x.fillStyle='#fff';x.font=`bold 14px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(think?'':'Tiles hidden',L.rx+(L.rk*7+L.rgap*6)/2,L.ry+L.rk/2);
   if(viewer<0)return;}
  hand.forEach((h,i)=>{if(drag&&drag.tile===h&&drag.moved)return;const q=rackSlot(i),lift=(swapMode&&swapSel.has(h.id))||sel===h.id?-L.rk*.18:0;
   tileArt(q.x,q.y+lift,q.w,h.t==='?'?'':h.t,h.t==='?'?null:R.VALUE[h.t],{sel_:sel===h.id||swapMode&&swapSel.has(h.id)});});
  if(drag&&drag.moved){const g_=ghostPos(drag.x,drag.y),sz=L.wide?L.rk*.8:Math.max(L.cs*1.35,L.rk*.8),tl=drag.tile;
   x.save();x.globalAlpha=.94;tileArt(g_.x-sz/2,g_.y-sz/2,sz,tl.t==='?'?tl.ch||'':tl.t,tl.t==='?'?0:R.VALUE[tl.t],{fresh:drag.from==='board'});x.restore();}}
 function drawButtons(){for(const b of buttons()){x.save();if(b.off)x.globalAlpha=.45;
  if(b.green){const g=x.createLinearGradient(0,b.y,0,b.y+b.h);g.addColorStop(0,'#3fcc5f');g.addColorStop(1,C.greenD);x.fillStyle=g;}else x.fillStyle=b.warn?C.red:C.btn;
  x.shadowColor='rgba(0,0,0,.18)';x.shadowBlur=4;x.shadowOffsetY=2;rr(x,b.x,b.y,b.w,b.h,12);x.fill();x.shadowColor='transparent';
  x.fillStyle=b.green||b.warn?'#fff':C.btnText;x.textAlign='center';x.textBaseline='middle';
  if(b.icon){icon(b.icon,b.x+b.w/2,b.y+b.h*.36,b.h*.22);x.font=`bold ${Math.round(Math.min(11,b.w*.15))}px ${FONT}`;x.fillText(b.label,b.x+b.w/2,b.y+b.h*.76);}
  else{x.font=`900 ${Math.round(Math.min(19,b.h*.42))}px ${RND}`;x.fillText(b.label,b.x+b.w/2,b.y+b.h/2+1);}
  x.restore();}}
 function icon(k,cx,cy,r){x.save();x.strokeStyle=x.fillStyle;x.lineWidth=Math.max(1.6,r*.22);x.lineCap='round';x.lineJoin='round';x.beginPath();
  if(k==='shuffle'){x.moveTo(cx-r,cy-r*.5);x.lineTo(cx-r*.2,cy-r*.5);x.lineTo(cx+r*.4,cy+r*.5);x.lineTo(cx+r,cy+r*.5);x.moveTo(cx-r,cy+r*.5);x.lineTo(cx-r*.2,cy+r*.5);x.lineTo(cx+r*.4,cy-r*.5);x.lineTo(cx+r,cy-r*.5);
   x.moveTo(cx+r*.7,cy-r*.8);x.lineTo(cx+r,cy-r*.5);x.lineTo(cx+r*.7,cy-r*.2);x.moveTo(cx+r*.7,cy+r*.2);x.lineTo(cx+r,cy+r*.5);x.lineTo(cx+r*.7,cy+r*.8);}
  else if(k==='recall'){x.moveTo(cx+r,cy-r*.4);x.lineTo(cx-r*.6,cy-r*.4);x.moveTo(cx-r*.2,cy-r*.85);x.lineTo(cx-r*.7,cy-r*.4);x.lineTo(cx-r*.2,cy+r*.05);x.moveTo(cx-r,cy+r*.7);x.lineTo(cx+r,cy+r*.7);}
  else if(k==='swap'){x.moveTo(cx-r,cy-r*.35);x.lineTo(cx+r*.8,cy-r*.35);x.moveTo(cx+r*.4,cy-r*.75);x.lineTo(cx+r*.85,cy-r*.35);x.lineTo(cx+r*.4,cy+r*.05);x.moveTo(cx+r,cy+r*.45);x.lineTo(cx-r*.8,cy+r*.45);x.moveTo(cx-r*.4,cy+r*.05);x.lineTo(cx-r*.85,cy+r*.45);x.lineTo(cx-r*.4,cy+r*.85);}
  else if(k==='pass'){x.arc(cx,cy,r*.85,0,7);x.moveTo(cx-r*.3,cy-r*.4);x.lineTo(cx+r*.25,cy);x.lineTo(cx-r*.3,cy+r*.4);}
  x.stroke();x.restore();}
 function drawPicker(){const W=L.W,H=L.H;x.fillStyle='rgba(15,30,45,.72)';x.fillRect(0,0,W,H);const cols=7,cw=Math.min(52,(W-40)/cols),pw=cw*cols+16,ph=cw*4+70,px=(W-pw)/2,py=(H-ph)/2;
  x.fillStyle='#fff';rr(x,px,py,pw,ph,14);x.fill();x.fillStyle=C.text;x.font=`bold 16px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText('Pick a letter for your blank',W/2,py+26);
  picker.hits=[];for(let i=0;i<26;i++){const ch=String.fromCharCode(97+i),X=px+8+(i%cols)*cw,Y=py+50+Math.floor(i/cols)*cw;tileArt(X+3,Y+3,cw-6,ch,null,{});picker.hits.push({x:X,y:Y,w:cw,h:cw,f:()=>picker.pick(ch)});}}
 function drawPops(){pops=pops.filter(p=>t-p.at<1.6);for(const p of pops){const k=(t-p.at)/1.6;x.save();x.globalAlpha=Math.min(1,(1-k)*2);x.fillStyle=p.bingo?'#ff9a1f':C.green;x.strokeStyle='#fff';x.lineWidth=4;
  x.font=`900 ${Math.round((L.cs||20)*(p.bingo?1.5:1.1))}px ${RND}`;x.textAlign='center';x.textBaseline='middle';const y=p.y-k*40;x.strokeText(p.text,p.x,y);x.fillText(p.text,p.x,y);x.restore();}}
 function drawToast(){if(!toast||t>toast.until)return;x.font=`bold 14px ${FONT}`;const w=Math.min(L.W-20,x.measureText(toast.text).width+30),X=(L.W-w)/2,Y=L.by+L.B*.42;
  x.fillStyle='rgba(20,30,40,.88)';rr(x,X,Y,w,36,18);x.fill();x.fillStyle=toast.col===C.text?'#fff':toast.col===C.red?'#ffb3b6':'#b8f5c6';x.textAlign='center';x.textBaseline='middle';x.fillText(toast.text,L.W/2,Y+18,w-16);}
 function drawLen(){const W=L.W,H=L.H;x.fillStyle=C.bg;x.fillRect(0,0,W,H);const lw=Math.min(W-40,360);logo(W/2,H*.16,Math.min(64,lw/5),lw,true);
  x.fillStyle=C.text;x.font=`bold 17px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(lenPick.waiting?`${name(0)} is picking the game`:'How long a game?',W/2,H*.16+Math.min(64,lw/5)+40);
  lenPick.hits=[];if(lenPick.waiting)return;
  [['quick','Quick game','6 turns each',6],['full','Full game','Until the tiles run out',Infinity]].forEach(([id,a,b,n],i)=>{const bw=Math.min(W-40,320),bh=64,X=(W-bw)/2,Y=H*.16+Math.min(64,lw/5)+70+i*(bh+14);
   const g=x.createLinearGradient(0,Y,0,Y+bh);g.addColorStop(0,i?C.head0:'#3fcc5f');g.addColorStop(1,i?C.head1:C.greenD);x.fillStyle=g;rr(x,X,Y,bw,bh,14);x.fill();
   x.fillStyle='#fff';x.font=`900 19px ${RND}`;x.fillText(a,W/2,Y+24);x.font=`13px ${FONT}`;x.fillText(b,W/2,Y+46);lenPick.hits.push({x:X,y:Y,w:bw,h:bh,f:()=>lenPick.done(n)});});}
 function drawEnd(){const W=L.W,H=L.H,e=endCard,k=Math.min(1,(t-e.at)/.4);x.fillStyle=`rgba(15,30,45,${.7*k})`;x.fillRect(0,0,W,H);
  const pw=Math.min(W-30,360),ph=270,px=(W-pw)/2,py=(H-ph)/2;x.save();x.translate(W/2,H/2);x.scale(.85+.15*k,.85+.15*k);x.translate(-W/2,-H/2);
  x.fillStyle='#fff';rr(x,px,py,pw,ph,18);x.fill();const g=x.createLinearGradient(0,py,0,py+60);g.addColorStop(0,C.head0);g.addColorStop(1,C.head1);x.fillStyle=g;rr(x,px,py,pw,60,18);x.fill();x.fillRect(px,py+40,pw,20);
  x.fillStyle='#fff';x.font=`900 24px ${RND}`;x.textAlign='center';x.textBaseline='middle';x.fillText(e.w<0?'It\'s a tie!':`${name(e.w)} wins!`,W/2,py+31);
  for(const i of [0,1]){const cx=W/2+(i?1:-1)*pw*.25,cy=py+112;s.sprite(x,i,cx,cy,58,{exact:true,still:true,noBadge:true,mood:e.w===i?'win':e.w<0?undefined:'sad'});
   x.fillStyle=C.text;x.font=`bold 14px ${FONT}`;x.fillText(name(i),cx,cy+44);x.font=`900 28px ${RND}`;x.fillStyle=e.w===i?C.green:C.text;x.fillText(String(G.score[i]),cx,cy+74);
   if(G.best[i]){x.fillStyle=C.soft;x.font=`11px ${FONT}`;x.fillText(`best: ${G.best[i].word.toUpperCase()} ${G.best[i].score}`,cx,cy+98);}}
  if(t>e.at+1.2){x.fillStyle=C.soft;x.font=`bold 13px ${FONT}`;x.fillText('Tap to continue',W/2,py+ph-16);}x.restore();}
 function drawLoad(msg){x.fillStyle=C.bg;x.fillRect(0,0,L.W,L.H);logo(L.W/2,L.H*.38,52,260,true);x.fillStyle=C.soft;x.font=`bold 14px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(msg,L.W/2,L.H*.38+90);}
 let loadMsg='Opening the dictionary…';
 s.frame(dt=>{t+=dt;dpr=Math.min(2,window.devicePixelRatio||1);const cw=Math.round(s.W*dpr),ch=Math.round(s.H*dpr);if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
  x.setTransform(dpr,0,0,dpr,0,0);L=layout();
  if(phase==='load'){drawLoad(loadMsg);return;}
  if(phase==='len'){drawLen();return;}
  const g=x.createLinearGradient(0,0,0,L.H);g.addColorStop(0,C.bg);g.addColorStop(1,C.bg2);x.fillStyle=g;x.fillRect(0,0,L.W,L.H);
  drawHead();drawInfo();drawBoard();drawRack();drawButtons();drawPops();drawToast();anim=anim.filter(a=>t-a.at<.5);
  if(picker)drawPicker();if(endCard)drawEnd();});
 s.hint('Make words on the board like Words With Friends. Drag tiles from your rack to the board (or tap a tile, then a square). Tap a placed tile to take it back. The bubble shows the score: green = good to play. TW/DW = triple/double word, TL/DL = triple/double letter; all 7 tiles = +35 bingo. SHUFFLE mixes your rack, SWAP trades tiles (uses your turn), PASS skips.');
 // test hooks
 s.debug={get state(){return {phase,turn:G.turn,score:G.score.slice(),bag:G.bag.length,racks:G.racks.map(r=>r.slice()),turns:G.turns.slice(),max:G.max,over:G.over,log:G.log.slice(),viewer,pend:pend.length,hand:hand.map(h=>h.t).join('')};},
  get board(){return G.board;},words:w=>D?.has(w),layout:()=>L,
  moves:()=>D&&viewer>=0?DICT.findMoves(D,G.board,G.racks[viewer]).sort((a,b)=>b.score-a.score):[],
  // put the best move's tiles on the board through the real hand, ready for PLAY
  stage(i=0){const ms=this.moves();const m=ms[Math.min(i,ms.length-1)];if(!m)return false;recall();for(const p of m.play){const tile=hand.find(h=>h.t===(p.blank?'?':p.ch));if(!tile)return false;hand.splice(hand.indexOf(tile),1);Object.assign(tile,{r:p.r,c:p.c});if(p.blank)tile.ch=p.ch;pend.push(tile);}return m;},
  press:id=>press(buttons().find(b=>b.id===id)||{id}),
  len:n=>lenPick?.done?.(n),
  step(){if(phase==='len'&&lenPick&&!lenPick.waiting){lenPick.done(4);return 'len';}if(endCard){if(t>endCard.at+1.2)endCard.done();return 'end';}if(!myTurn())return 'wait';
   const m=this.stage(Math.floor(Math.random()*3));if(m){press({id:'play'});return 'play';}if(G.bag.length>=3){swapMode=true;swapSel.clear();hand.slice(0,3).forEach(h=>swapSel.add(h.id));press({id:'doswap'});return 'swap';}finishHuman({pa:1});return 'pass';},
  // online-native: s.debug.bot() = one bot step for this phone
  get bot(){return ()=>this.step();}};
 // ---------------------------------------------------------------- go
 try{D=await DICT.loadDict();}catch(e){console.error(e);loadMsg='The word list is still downloading. Try again in a moment.';await s.wait(3500);if(!s.alive)return;s.finish([0,0],'No word list yet');return;}
 if(!s.alive)return;
 // length: board = 3 turns each; arcade / vs CPU / online pick Quick or Full (online: player 1's phone picks)
 if(board_)G.max=3;
 else{phase='len';const n=await new Promise(done=>{lenPick={waiting:net&&me!==0,done};
   if(net&&me!==0)void net.next().then(m=>done(m&&m.len!=null?(m.len<0?Infinity:m.len):6));});
  G.max=n;if(net&&me===0)net.send({len:n===Infinity?-1:n});}
 G.bag=R.newBag(rng);R.refill(G.racks[0],G.bag);R.refill(G.racks[1],G.bag);
 phase='play';if(viewer>=0)startHand(viewer);s.setScores([0,0]);
 await runGame();
}
Object.assign(exports,{wordsNShit});
