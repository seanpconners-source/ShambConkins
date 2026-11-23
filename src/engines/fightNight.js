// ROCKY · FIGHT NIGHT (id fight-night, engine `boxing`): a Punch-Out style boxing game, somewhere between the NES and the
// SNES one. You box from behind (bottom of the screen) against a big opponent facing you. Every opponent is a character
// from the game with their own style: they telegraph (eye glint + wind-up) and throw jabs, hooks, uppercuts, body blows and a
// signature special; you dodge, duck or block, then punish while they're open. Counters and interrupting a wind-up earn
// STARS; swipe up to spend them on a star uppercut. HEARTS = stamina: blocked punches and hits taken drain them, at zero
// you're tired and can't punch until you dodge your way back. Knockdowns with the ref's 10 count (mash to get up), three in
// a round = TKO, 3-minute rounds (game clock x3), decision on points.
// 1P = CAREER (s.solo.kind 'levels'): Minor, Major, World circuits, the Title fight vs Drago and a Dream fight; Rocky is your
// trainer between rounds; beaten circuits are saved (sc-po-v1) and a locked opponent you beat joins your roster.
// 2P on one phone = both box the same opponent, best result wins; board = one round each; online = both box at once
// (netField: {sc,hp,ohp,rd} snapshots, final score swap).
// Touch: tap the TOP half = head punch, BOTTOM half = body punch (left/right side = which hand); swipe left/right = dodge,
// swipe down = duck, swipe up = star punch, hold = block (guard up). Keys: Z/X jab, A/S body, ←/→ dodge, ↓ duck, C block,
// space star.
// Art: src/data/poSprites.js (assets/fightnight -> po:<slot>), drawn stand-ins src/engines/po/art.js.
const {clamp,seededRandom}=require("src/utils.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {netField}=require("src/engines/netField.js");
const {voice,noise,label,rr}=require("src/engines/tarantinoKit.js");
const {vibrate}=require("src/audio.js");
const {store}=require("src/state.js");
const A=require("src/engines/po/art.js");
const PO=require("src/data/poSprites.js");
const {FIGHTERS,CIRCUITS,TRAINER}=require("src/data/poCircuit.js");
const BG=require("src/bgShape.js");
const {faceSprite}=require("src/headFacts.js");

const SAVE='sc-po-v1',CLOCK_K=3,ROUND=180;
const TELL={jab:.42,hook:.66,upper:.85,body:.55},DMG={jab:7,hook:12,upper:18,body:9,special:15},REC={jab:.35,hook:.8,upper:1.05,body:.55,special:1.3};
const KITS={p1:{skin:'#d9a27c',trunks:'#2a5fd8',gloves:'#2f6fe0',hair:'#2a1a10'},p2:{skin:'#e0b08c',trunks:'#b8202a',gloves:'#d42a2a',hair:'#5a2a12'}};
const ease=u=>u<0?0:u>1?1:u*u*(3-2*u);

async function boxing(s){
 const [c,x]=s.canvas(560,760,{fill:true});const fb=fullBleed(s,{bg:'#05060a'});
 const on=s.online||null,board=s.origin==='board',solo1=!!s.solo&&!s.solo.board&&!s.solo.duel&&!on;
 const names=s.players.map(p=>p.name||'Player');
 const save=(()=>{try{return JSON.parse(localStorage.getItem(SAVE)||'{}');}catch{return {};}})();
 const keep=v=>{try{localStorage.setItem(SAVE,JSON.stringify(Object.assign(save,v)));}catch{}};
 s.gameRecruits=[[],[]];
 // ---------------------------------------------------------------- sounds + music
 const snd={
  hit(k=1){noise(.08,.2*k,{f0:2400,f1:300});voice(110,.12,.17*k,'sine',{slide:.4});vibrate(18);},
  big(){noise(.3,.26,{f0:1800,f1:120});voice(70,.35,.25,'sine',{slide:.45});vibrate([30,20,40]);},
  block(){noise(.06,.12,{type:'lowpass',f0:700,f1:200});voice(150,.06,.07,'square');},
  whiff(){noise(.12,.05,{type:'bandpass',f0:800,f1:2400,q:2});},
  dodge(){noise(.14,.05,{type:'bandpass',f0:500,f1:1500,q:1.6});},
  tell(){voice(1568,.06,.05,'square');voice(2093,.09,.04,'square',{delay:.06});},
  bell(){for(const d of [0,.32]){voice(1760,1.1,.06,'sine',{delay:d});voice(2793,.8,.035,'sine',{delay:d});voice(3520,.5,.02,'sine',{delay:d});}},
  cheer(){noise(1.6,.1,{type:'bandpass',f0:700,f1:1250,q:.6,attack:.1});},
  star(){[1046,1318,1568,2093].forEach((f,i)=>voice(f,.12,.045,'square',{delay:i*.05}));},
  count(){voice(880,.12,.06,'square');},
  down(){voice(60,.5,.25,'sine',{slide:.5});noise(.4,.15,{f0:400,f1:80});},
  hurt(){voice(240,.18,.08,'sawtooth',{slide:.6,lp:900});noise(.1,.15,{f0:1200,f1:200});vibrate(40);}};
 // our own fight tune: A minor, 150 bpm sixteenths
 const mtof=m=>440*Math.pow(2,(m-69)/12);const BASS=[45,45,57,45,43,43,55,43,41,41,53,41,40,40,52,40],LEAD=[69,0,72,0,76,74,72,0,67,0,71,0,74,72,71,0,65,0,69,0,72,71,69,0,64,0,68,0,71,0,76,0];
 let music=false,seqT=0,step=0;const musicOn=()=>{try{return store.profile?.settings?.music!==false;}catch{return true;}};
 function stepMusic(){if(!music||!musicOn())return;const now=performance.now()/1000;if(seqT<now)seqT=now+.05;
  while(seqT<now+.25){const d=seqT-now,b=BASS[(step>>2)%16],l=LEAD[step%32];
   if(step%2===0)voice(mtof(b),.11,.035,'triangle',{delay:d});if(l)voice(mtof(l),.09,.018,'square',{delay:d,lp:2400});if(step%4===0)noise(.04,.02,{type:'highpass',f0:5000,delay:d});
   if(step%8===4)noise(.08,.035,{f0:1800,f1:400,delay:d});step++;seqT+=.1;}}
 // ---------------------------------------------------------------- layout
 const L={};
 function layout(){const W=s.W,H=s.H,top=(fb.top||0)+6,hud=clamp(H*.11,52,78);
  const wide=W>H*1.05,fs=clamp(Math.min(W,H)*.032,11,16);let uo,hipY;
  if(wide){const A=top+fs*2.6+6;uo=Math.min((H-A)/1.85,W*.5/1.25);hipY=A+uo*1.04;}else{const avail=H-top-hud;uo=Math.min(avail*.8/2.25,W*.82/1.25);hipY=top+hud+uo*1.1;}
  Object.assign(L,{W,H,top,hud,uo,um:uo*(wide?1.1:.95),fx:W/2,hipY,meX:W/2,meY:wide?H+uo*.36:H-uo*.02,ropeY:hipY-uo*.48,wide});}
 // ---------------------------------------------------------------- fight state
 let F=null,ME=null,R=null,phase='title',card=null,buttons=[],pops=[],fx=[],shake=0,hitStop=0,tick=0,hint=0,autoAll=false,partner=null;
 const kitMe=i=>KITS[i?'p2':'p1'];
 function newFight(def,i,{rounds}){
  const T=A.TYPES[def.type]||A.TYPES.heavy;
  F={def,T,hp:def.hp,max:def.hp,st:'idle',t:0,dur:0,wait:1.2,move:null,side:1,hitIdx:0,guard:def.guard==='switch'?'high':def.guard,combo:0,downs:0,rdDowns:0,flash:0,avoided:false,pts:0,glint:0,sway:0};
  ME={i,hp:100,hearts:20,stars:0,st:'idle',t:0,dur:0,side:-1,aim:'head',hit:false,counterT:0,downs:0,rdDowns:0,mash:0,queued:null,tiredDodges:0,score:0,landed:0,taken:0};
  R={def,rounds,round:1,clock:ROUND,count:-1,countT:0,who:null,over:null,firstFight:!save.played};
  hint=R.firstFight?6:0;pops=[];fx=[];}
 const rand=()=>Math.random();
 function pop(txt,col='#fff',big=false){pops.push({txt,col,t:0,big});if(pops.length>4)pops.shift();}
 // ---------------------------------------------------------------- opponent AI
 function pickMove(){const m=F.def.moves,tot=Object.values(m).reduce((a,b)=>a+b,0)||1;let r=rand()*tot;for(const [k,v] of Object.entries(m)){r-=v;if(r<=0)return k;}return 'jab';}
 function tellTime(k){const sp=F.def.speed*(1-.04*(R.round-1));return Math.max(.26,(k==='special'?F.def.special.tell:TELL[k])*sp);}
 function startAttack(k,quick=false){F.move=k;F.side=rand()<.5?-1:1;F.hitIdx=0;F.avoided=false;F.st='tell';F.t=0;F.dur=quick?Math.max(.22,tellTime(k)*.55):tellTime(k);F.glint=.32;snd.tell();
  if(k==='special'){pop(F.def.special.name+'!','#ff6b6b',true);}}
 function stepFoe(dt){if(!F)return;F.t+=dt;F.flash=Math.max(0,F.flash-dt*3);F.glint=Math.max(0,F.glint-dt);F.sway+=dt;
  switch(F.st){
   case 'idle':{if(R.count>=0||ME.st==='down')break;F.wait-=dt;if(F.def.guard==='switch'&&rand()<dt*.25)F.guard=F.guard==='high'?'low':'high';
    if(F.wait<=0){if(F.def.taunt&&rand()<F.def.taunt){F.st='taunt';F.t=0;F.dur=1.1;pop(F.def.lines[Math.floor(rand()*F.def.lines.length)],'#ffe680');break;}
     startAttack(rand()<.13+R.round*.02?'special':pickMove());}break;}
   case 'tell':if(F.t>=F.dur){F.st='atk';F.t=0;F.dur=F.move==='special'?.2:.15;}break;
   case 'atk':if(F.t>=F.dur){const k=F.move;resolveFoeHit();if(R.over||F.st!=='atk')break;
    if(k==='special'&&F.hitIdx+1<F.def.special.hits){F.hitIdx++;F.st='tell';F.t=0;F.dur=Math.max(.24,.36*F.def.speed);F.side*=-1;F.glint=.2;snd.tell();break;}
    if(!F.avoided&&rand()<F.def.combo){startAttack('jab',true);break;}
    F.st='recover';F.t=0;F.dur=F.avoided?REC[k]*(k==='special'?1:1):.3;}break;
   case 'recover':if(F.t>=F.dur){F.st='idle';F.wait=(.45+rand()*.9)*F.def.speed;F.combo=0;}break;
   case 'hurt':if(F.t>=F.dur){if(F.combo>=maxCombo()){F.st='block';F.t=0;F.dur=.55;}else{F.st='idle';F.wait=.3+rand()*.4;}}break;
   case 'stun':if(F.t>=F.dur){F.st='idle';F.wait=.4;F.combo=0;}break;
   case 'block':if(F.t>=F.dur){F.combo=0;if(rand()<.45)startAttack('jab',true);else{F.st='idle';F.wait=.3;}}break;
   case 'dodge':if(F.t>=F.dur){if(rand()<.55)startAttack('jab',true);else{F.st='idle';F.wait=.4;}}break;
   case 'taunt':if(F.t>=F.dur){F.st='idle';F.wait=.4;}break;
   case 'fall':if(F.t>=F.dur){F.st='down';F.t=0;R.count=0;R.countT=0;R.who='foe';}break;
   case 'getup':if(F.t>=F.dur){F.st='idle';F.wait=.8;F.combo=0;}break;}}
 const maxCombo=()=>F.def.circuit>=2?3:4;
 function avoidOf(){const t=ME.t;const dodge=(ME.st==='dodgeL'||ME.st==='dodgeR')&&t>=.02&&t<=.38,duck=ME.st==='duck'&&t>=.02&&t<=.4,block=ME.st==='block';return {dodge,duck,block};}
 function resolveFoeHit(){const k=F.move,{dodge,duck,block}=avoidOf();let mult=1,avoid=false,chip=0;
  if(k==='jab'){avoid=dodge||duck;chip=block?.15:0;}
  else if(k==='hook'){avoid=dodge||duck;chip=block?.45:0;}
  else if(k==='upper'){avoid=dodge;if(duck)mult=1.3;if(block)mult=.8;}
  else if(k==='body'){avoid=dodge;chip=block?.15:0;if(duck)mult=1.1;}
  else if(k==='special'){const a=F.def.special.avoid;avoid=a==='duck'?duck:a==='block'?block:dodge;if(!avoid&&block&&a!=='block')mult=.75;}
  if(ME.st==='down'||ME.st==='getup')avoid=true;
  if(avoid){F.avoided=true;ME.counterT=.6;ME.hearts=Math.min(30,ME.hearts+(k==='jab'?1:2));ME.score+=10;snd.whiff();
   if(ME.st==='tired'||ME.tired){ME.tiredDodges++;if(ME.tiredDodges>=2||ME.hearts>=6){ME.tired=false;pop('BREATHING AGAIN','#9dff5c');}}
   if(k!=='jab')pop('MISS!','#9ad8ff');return;}
  const dmg=DMG[k]*F.def.dmg*mult*(chip||1);
  if(chip){ME.hp-=dmg;snd.block();pop('BLOCKED','#cde');shake=.1;}
  else{ME.hp-=dmg;ME.hearts=Math.max(0,ME.hearts-3);ME.st='hurt';ME.t=0;ME.dur=.45;ME.taken+=dmg;F.pts+=dmg;snd.hurt();shake=.3;hitStop=.07;try{s.react(ME.i,'sad');}catch{}
   if(ME.hearts<=0&&!ME.tired){ME.tired=true;ME.tiredDodges=0;pop('TIRED! DODGE TO RECOVER','#ff9fc6');}}
  if(ME.hp<=0)myKnockdown();}
 // ---------------------------------------------------------------- your moves
 function canAct(){return ME&&(ME.st==='idle'||ME.st==='block'&&ME.blockHold!==true)&&phase==='fight'&&!R.over&&R.count<0;}
 function act(a){if(!ME||phase!=='fight'||R.over||R.count>=0&&a!=='mash')return;
  if(a==='mash'){if(ME.st==='down'){ME.mash+=1;voice(500+ME.mash*30,.05,.04,'square');}return;}
  if(!canAct()){ME.queued={a,t:.18};return;}
  ME.queued=null;
  if(a==='dodgeL'||a==='dodgeR'||a==='duck'){ME.st=a;ME.t=0;ME.dur=.44;snd.dodge();return;}
  if(a==='block'){ME.st='block';ME.t=0;ME.blockHold=true;return;}
  if(ME.tired){pop('TOO TIRED!','#ff9fc6');return;}
  if(a==='star'){if(!ME.stars){pop('NO STARS','#aaa');return;}ME.st='star';ME.t=0;ME.dur=.6;ME.hit=false;ME.side=1;ME.aim='head';return;}
  const [side,aim]={jabL:[-1,'head'],jabR:[1,'head'],bodyL:[-1,'body'],bodyR:[1,'body']}[a]||[-1,'head'];
  ME.st='punch';ME.t=0;ME.dur=.27;ME.hit=false;ME.side=side;ME.aim=aim;}
 function landOn(dmg,{counter=false,star=false}={}){const head=ME.aim==='head';
  if(F.def.armor&&head&&!counter&&!star)dmg*=1-F.def.armor;
  F.hp-=dmg;F.flash=1;F.combo++;F.st=star||dmg>14?'stun':'hurt';F.t=0;F.dur=star?1.3:.3;ME.landed+=dmg;ME.score+=Math.round(dmg*10)+(counter?50:0);
  const p=targetPt(ME.aim);fx.push({x:p[0],y:p[1],t:0,big:star||counter});if(star||counter){snd.big();shake=.35;hitStop=.12;}else{snd.hit();hitStop=.05;}
  if(F.def.guard==='switch'&&rand()<.5)F.guard=head?'high':'low';
  try{s.react(ME.i,'happy');}catch{}
  if(F.hp<=0)foeKnockdown();}
 function resolveMyHit(){const star=ME.st==='star',st=F.st;
  if(['down','fall','getup','win'].includes(st)){snd.whiff();return;}
  if(star){const n=ME.stars;ME.stars=0;if(st==='dodge'){snd.whiff();pop('SLIPPED IT','#aaa');return;}landOn(8+n*11+(n>=3?8:0),{star:true});pop(n>=3?'MEGA STAR PUNCH!':'STAR PUNCH!','#ffd23f',true);return;}
  const base=ME.aim==='head'?5:4;
  if(st==='tell'&&F.t<F.dur*.78){const big=F.move==='upper'||F.move==='special'||F.move==='hook'&&rand()<.5;landOn(base*1.5,{counter:true});pop('COUNTER!','#ffd23f',true);if(big)gainStar();return;}
  if(st==='atk'){landOn(base);return;}
  if(st==='recover'||st==='stun'||st==='taunt'){const ctr=ME.counterT>0&&F.avoided&&st==='recover';landOn(base*(ctr?1.6:1.2),{counter:ctr});
   if(ctr&&ME.counterT>0){pop('COUNTER!','#ffd23f',true);if(F.move==='upper'||F.move==='special'||F.move==='hook'&&rand()<.5)gainStar();ME.counterT=0;}return;}
  if(st==='hurt'){if(F.combo<maxCombo()){landOn(base);return;}blocked();return;}
  if(st==='idle'){if(ME.aim==='head'&&F.def.slip&&rand()<F.def.slip){F.st='dodge';F.t=0;F.dur=.32;F.slipDir=rand()<.5?-1:1;snd.whiff();pop('SLIPPED','#aaa');return;}
   const g=F.guard;if(g==='none'||g==='high'&&ME.aim==='body'||g==='low'&&ME.aim==='head'){landOn(base);return;}blocked();return;}
  blocked();}
 function blocked(){ME.hearts=Math.max(0,ME.hearts-1);snd.block();const p=targetPt(ME.aim);fx.push({x:p[0],y:p[1],t:0,blk:true});pop('BLOCKED','#cde');
  if(ME.hearts<=0&&!ME.tired){ME.tired=true;ME.tiredDodges=0;pop('TIRED! DODGE TO RECOVER','#ff9fc6');}}
 function gainStar(){if(ME.stars<3){ME.stars++;snd.star();pop('★ STAR!','#ffd23f');}}
 function stepMe(dt){if(!ME)return;ME.t+=dt;ME.counterT=Math.max(0,ME.counterT-dt);if(ME.queued){ME.queued.t-=dt;if(ME.queued.t<=0)ME.queued=null;}
  switch(ME.st){
   case 'punch':if(!ME.hit&&ME.t>=.1){ME.hit=true;resolveMyHit();}if(ME.t>=ME.dur)toIdle();break;
   case 'star':if(!ME.hit&&ME.t>=.32){ME.hit=true;resolveMyHit();}if(ME.t>=ME.dur)toIdle();break;
   case 'dodgeL':case 'dodgeR':case 'duck':case 'hurt':if(ME.t>=ME.dur)toIdle();break;
   case 'block':if(!ME.blockHold&&ME.t>.25)toIdle();break;
   case 'down':ME.mash=Math.max(0,ME.mash-dt*1.6);break;}}
 function toIdle(){ME.st='idle';ME.t=0;if(ME.queued){const q=ME.queued.a;ME.queued=null;act(q);}}
 // ---------------------------------------------------------------- knockdowns, counts, rounds
 function foeKnockdown(){F.hp=0;F.st='fall';F.t=0;F.dur=.85;F.downs++;F.rdDowns++;ME.score+=500;snd.down();snd.cheer();shake=.5;pop('DOWN!','#ff6b6b',true);
  if(F.rdDowns>=3){R.over={win:true,how:'TKO'};}}
 function myKnockdown(){ME.hp=0;ME.st='down';ME.t=0;ME.downs++;ME.rdDowns++;ME.mash=0;R.count=0;R.countT=0;R.who='me';snd.down();shake=.5;F.st='taunt';F.t=0;F.dur=1.2;
  if(ME.rdDowns>=3)R.over={win:false,how:'TKO'};}
 function stepCount(dt){if(R.count<0)return;R.countT+=dt;if(R.who==='foe'&&F.st!=='down')return;if(R.countT>=.8){R.countT=0;R.count++;snd.count();
   if(R.who==='foe'){const gu=F.def.getup[F.downs-1];if(gu!=null&&R.count>=gu){F.st='getup';F.t=0;F.dur=.9;F.hp=F.max*[.62,.45,.3][F.downs-1];R.count=-1;return;}}
   if(R.who==='me'&&ME.mash>=mashNeed()){ME.st='getup';ME.t=0;ME.hp=[55,40,28][ME.downs-1]||25;R.count=-1;ME.mash=0;setTimeout(()=>{if(ME&&ME.st==='getup')ME.st='idle';},700);pop('BACK UP!','#9dff5c');return;}
   if(R.count>=10){R.over=R.who==='foe'?{win:true,how:'KO'}:{win:false,how:'KO'};R.count=10;}}}
 const mashNeed=()=>8+ME.downs*6;
 // ---------------------------------------------------------------- input
 let tp=null;
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev);
  for(const b of buttons)if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){b.go();return;}
  if(phase!=='fight')return;if(R?.count>=0){act('mash');return;}
  tp={id:ev.pointerId,x:p.x,y:p.y,t:performance.now(),used:false,hold:setTimeout(()=>{if(tp&&!tp.used){tp.used=true;act('block');}},220)};s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(!tp||ev.pointerId!==tp.id||tp.used)return;const p=s.pointer(ev),dx=p.x-tp.x,dy=p.y-tp.y;if(Math.hypot(dx,dy)<24)return;
  tp.used=true;clearTimeout(tp.hold);act(Math.abs(dx)>Math.abs(dy)?(dx<0?'dodgeL':'dodgeR'):dy>0?'duck':'star');});
 const up=ev=>{if(!tp||ev.pointerId!==tp.id)return;const p=s.pointer(ev),t=tp;tp=null;clearTimeout(t.hold);s.release(ev);
  if(ME&&ME.st==='block'&&ME.blockHold){ME.blockHold=false;toIdle();}if(t.used)return;
  const side=p.x<L.W/2?'L':'R',head=p.y<L.hipY+L.uo*.05;act((head?'jab':'body')+side);};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',ev=>{if(tp?.id===ev.pointerId){clearTimeout(tp.hold);tp=null;if(ME?.blockHold){ME.blockHold=false;toIdle();}}});
 const KEYS={z:'jabL',x:'jabR',a:'bodyL',s:'bodyR',arrowleft:'dodgeL',arrowright:'dodgeR',arrowdown:'duck',' ':'star',arrowup:'star',c:'block'};
 s.on(document,'keydown',ev=>{const k=KEYS[ev.key.toLowerCase()];if(!k||ev.repeat||s.paused)return;ev.preventDefault();if(R?.count>=0){act('mash');return;}act(k);});
 s.on(document,'keyup',ev=>{if(ev.key.toLowerCase()==='c'&&ME?.blockHold){ME.blockHold=false;toIdle();}});
 // ---------------------------------------------------------------- drawing
 function faceOf(id,cx,cy,d,mood,dir=1){const sp=faceSprite(id,mood,d,dir)||faceSprite(id,'normal',d,dir);if(sp){x.drawImage(sp.cv,cx+sp.x,cy+sp.y);return true;}
  x.fillStyle='#d9a27c';x.beginPath();x.arc(cx,cy,d*.45,0,7);x.fill();return false;}
 function myFace(i,cx,cy,d,mood){s.sprite(x,i,cx,cy,d*1.3,{exact:true,still:true,noBadge:true,mood:mood==='normal'?undefined:mood});}
 let arena=null;
 function arenaLayer(){const ci=R?Math.min(3,R.def.circuit):0,key=L.W+'x'+L.H+':'+ci+':'+PO.version();if(arena?.key===key)return arena.cv;
  const cv=document.createElement('canvas');cv.width=Math.max(1,L.W|0);cv.height=Math.max(1,L.H|0);const g=cv.getContext('2d'),W=L.W,H=L.H;
  const nm=['minor','major','world','title'][ci],pic=BG.pick(W,H,{tall:`arena-${nm}-tall`,wide:`arena-${nm}-wide`,fold:`arena-${nm}-fold`},PO.picture);
  if(pic){const k=Math.max(W/pic.width,H/pic.height);g.drawImage(pic,(W-pic.width*k)/2,(H-pic.height*k)/2,pic.width*k,pic.height*k);}
  else{const tint=[['#141018','#2a1c22'],['#120c1e','#2c1a3a'],['#06101e','#14284a'],['#0a0608','#3a0e12']][ci];const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,tint[0]);gr.addColorStop(.55,tint[1]);gr.addColorStop(1,'#000');g.fillStyle=gr;g.fillRect(0,0,W,H);
   const r=seededRandom('po-crowd'+ci),ry=L.ropeY;for(let k=0;k<W*ry/55;k++){const y=r()*ry*.95,sz=1.5+y/ry*2.5;g.fillStyle=`hsla(${r()*360},40%,${30+r()*30}%,.55)`;g.beginPath();g.arc(r()*W,y,sz,0,7);g.fill();}
   for(const fx0 of [.2,.5,.8]){const gl=g.createRadialGradient(W*fx0,-20,4,W*fx0,-20,H*.5);gl.addColorStop(0,'#fff6d8aa');gl.addColorStop(1,'#fff6d800');g.fillStyle=gl;g.fillRect(0,0,W,H*.6);}}
  // ring: canvas floor, posts, ropes
  const fy=L.ropeY+L.uo*.15,floor=['#5a6a8a','#7a3a4a','#2a4a7a','#7a1a1a'][ci];g.fillStyle=floor;g.beginPath();g.moveTo(W*.08,fy);g.lineTo(W*.92,fy);g.lineTo(W*1.3,H);g.lineTo(-W*.3,H);g.closePath();g.fill();
  g.fillStyle='#ffffff18';g.font=`900 ${W*.09}px sans-serif`;g.textAlign='center';g.fillText('FIGHT NIGHT',W/2,fy+(H-fy)*.55);
  const ropeC=[['#d8d8d8','#c02a2a','#d8d8d8'],['#e8c21e','#e8e8e8','#e8c21e'],['#2a6fe0','#e8e8e8','#c02a2a'],['#c02a2a','#f2f2f2','#c02a2a']][ci];
  for(const [px] of [[W*.06],[W*.94]]){g.fillStyle='#22252c';g.fillRect(px-5,L.ropeY-L.uo*.9,10,L.uo*1.1);g.fillStyle=ropeC[0];g.fillRect(px-7,L.ropeY-L.uo*.92,14,10);}
  ropeC.forEach((col,i)=>{const y=L.ropeY-L.uo*(.85-i*.32);g.strokeStyle=col;g.lineWidth=Math.max(3,L.uo*.035);g.beginPath();g.moveTo(W*.06,y);g.quadraticCurveTo(W/2,y+L.uo*.03,W*.94,y);g.stroke();});
  arena={key,cv};return cv;}
 function targetPt(aim){const hy=L.hipY,dx=F?foeDX():0;return aim==='head'?[L.fx+dx,hy-.78*L.uo*F.T.h]:[L.fx+dx,hy-.28*L.uo];}
 function foeDX(){return Math.sin(F.sway*1.6)*L.uo*.05-(ME?myDX():0)*.22+(F.st==='dodge'?F.slipDir*L.uo*.4*Math.sin(Math.min(1,F.t/F.dur)*Math.PI):0);}
 function myDX(){const p=mePose();return (p.dx||0)*L.um;}
 const KIND={jab:'Jab',hook:'Hook',upper:'Upper',body:'Body',special:'Special'};
 function foePose(){const P=A.FOE,st=F.st,k=F.dur?clamp(F.t/F.dur,0,1):1;const guard=F.guard==='high'?P.guardHigh:F.guard==='low'?P.guardLow:P.idle;
  const idle=A.blendPose(guard,F.guard==='none'?P.idle2:guard,(Math.sin(F.sway*3)+1)/2*.6);
  switch(st){case 'tell':return {pose:A.blendPose(idle,P['tell'+KIND[F.move]],ease(k*1.8)),mir:F.side<0};
   case 'atk':return {pose:A.blendPose(P['tell'+KIND[F.move]],P[F.move],ease(k)),mir:F.side<0};
   case 'recover':return {pose:A.blendPose(P[F.move]||idle,idle,ease(k)),mir:F.side<0};
   case 'hurt':return {pose:ME.aim==='body'?P.hurtBody:P.hurtHead};
   case 'stun':return {pose:{...P.dizzy,rot:Math.sin(F.t*7)*.12}};
   case 'block':return {pose:P.block};case 'dodge':return {pose:{...idle,rot:F.slipDir*.2}};
   case 'taunt':return {pose:P.taunt};case 'fall':return {pose:A.blendPose(P.fall,P.down,ease(k))};case 'down':return {pose:P.down};
   case 'getup':return {pose:A.blendPose(P.getup,idle,ease(k))};case 'win':return {pose:P.win};default:return {pose:idle};}}
 function poseName(){const st=F.st;if(st==='tell')return 'tell'+KIND[F.move];if(st==='atk')return F.move;if(st==='recover')return F.t<F.dur*.5?F.move:'idle';
  if(st==='hurt')return ME.aim==='body'?'hurtBody':'hurtHead';if(st==='stun')return 'dizzy';if(st==='dodge')return 'idle';if(['block','taunt','fall','down','getup','win'].includes(st))return st;
  return F.guard==='high'?'guardHigh':F.guard==='low'?'guardLow':(Math.sin(F.sway*3)>0?'idle':'idle2');}
 function drawFoe(){const {pose,mir}=foePose(),fk=F.st==='fall'?ease(F.t/F.dur):F.st==='down'?1:F.st==='getup'?1-ease(F.t/F.dur):0,cx=L.fx+foeDX(),cy=L.hipY-L.uo*.32*fk,U=L.uo*(1-.3*fk);const sheetName=PO.has('foe-'+F.def.id)?'foe-'+F.def.id:'foe-'+F.def.type,sheet=PO.picture(sheetName);
  const def=PO.SHEETS[sheetName]||PO.SHEETS['foe-'+F.def.type],cell=sheet&&PO.cellOf(sheetName,poseName(),def);let head;
  x.save();if(F.flash>0)x.filter=`brightness(${1+F.flash*.35})`;
  if(cell){const sc=U/PO.UNIT;x.translate(cx,cy);if(mir)x.scale(-1,1);x.drawImage(sheet,cell.sx,cell.sy,cell.w,cell.h,-cell.hip[0]*sc,-cell.hip[1]*sc,cell.w*sc,cell.h*sc);x.restore();
   const hp=A.drawFoe(dummy,pose,0,0,U,F.T,{});head=[cx+(mir?-1:1)*hp.head[0],cy+hp.head[1],hp.head[2]];}
  else{if(mir){x.translate(cx,0);x.scale(-1,1);x.translate(-cx,0);}const r=A.drawFoe(x,pose,cx,cy,U,F.T,{trunks:F.def.trunks,gloves:F.def.gloves},{flash:F.st==='tell'?F.glint*3:0});x.restore();head=[mir?2*cx-r.head[0]:r.head[0],r.head[1],r.head[2]];}
  const mood=['tell','atk'].includes(F.st)?'angry':['hurt','stun','fall','down','getup'].includes(F.st)?'sad':F.st==='taunt'||F.st==='win'?'happy':'normal';
  faceOf(F.def.id,head[0],head[1],head[2]*.68,mood,mir?-1:1);
  if(F.glint>0){const k=F.glint/.32,gx=head[0]+head[2]*.14,gy=head[1]-head[2]*.05,r=head[2]*.5*k;x.save();x.globalAlpha=k;x.strokeStyle='#fff';x.lineWidth=3;x.shadowColor='#fff27a';x.shadowBlur=14;
   x.beginPath();x.moveTo(gx-r,gy);x.lineTo(gx+r,gy);x.moveTo(gx,gy-r);x.lineTo(gx,gy+r);x.stroke();x.restore();}}
 const dummy=document.createElement('canvas').getContext('2d');
 function mePose(){const P=A.ME,st=ME?.st,k=ME&&ME.dur?clamp(ME.t/ME.dur,0,1):0;if(!ME)return P.idle;
  const bob={...P.idle,dy:Math.sin(tick*5)*.015};
  switch(st){case 'punch':{const nm=(ME.aim==='head'?'jab':'body')+(ME.side<0?'L':'R');return A.blendPose(bob,P[nm],ME.t<.1?ME.t/.1:1-clamp((ME.t-.1)/.17,0,1));}
   case 'star':return ME.t<.3?A.blendPose(bob,P.star1,ME.t/.3):A.blendPose(P.star2,bob,clamp((ME.t-.32)/.28,0,1));
   case 'dodgeL':case 'dodgeR':case 'duck':return A.blendPose(bob,P[st],Math.sin(k*Math.PI));
   case 'block':return P.block;case 'hurt':return {...P.hurt,dx:Math.sin(ME.t*40)*.03};case 'down':return A.blendPose(P.hurt,P.down,clamp(ME.t/.6,0,1));
   case 'getup':return P.getup;case 'win':return P.win;default:return ME.tired?{...P.tired,dy:Math.sin(tick*3)*.03-.08}:bob;}}
 function reachK(){if(ME.st==='punch')return ME.t<.1?ease(ME.t/.1):1-ease(clamp((ME.t-.1)/.17,0,1));if(ME.st==='star')return ME.t<.3?0:1-ease(clamp((ME.t-.32)/.28,0,1));return 0;}
 function drawMe(){const pose=mePose(),kit=kitMe(ME.i),k=reachK(),tg=targetPt(ME.st==='star'?'head':ME.aim);
  const sheetName='me-'+(ME.i?'p2':'p1'),sheet=PO.picture(sheetName),nm=sheetPoseMe();const cell=sheet&&PO.cellOf(sheetName,nm);
  x.save();x.globalAlpha=.86;
  if(cell){const sc=L.um/PO.UNIT,dx=(pose.dx||0)*L.um,dy=(pose.dy||0)*L.um;x.drawImage(sheet,cell.sx,cell.sy,cell.w,cell.h,L.meX+dx-cell.hip[0]*sc,L.meY-dy-cell.hip[1]*sc,cell.w*sc,cell.h*sc);
   const r=A.drawMe(dummy,pose,L.meX,L.meY,L.um,kit);A.backOfHead(x,r.head[0],r.head[1],r.head[2],kit.hair,kit.skin);}
  else{const r=A.drawMe(x,pose,L.meX,L.meY,L.um,kit,{reach:k>0?{side:ME.st==='star'?1:ME.side,k,x:tg[0],y:tg[1]}:null});A.backOfHead(x,r.head[0],r.head[1],r.head[2],kit.hair,kit.skin);A.drawGloves(x,r.gloves,kit.gloves);}
  x.restore();}
 function sheetPoseMe(){const st=ME.st;if(st==='punch')return (ME.aim==='head'?'jab':'body')+(ME.side<0?'L':'R');if(st==='star')return ME.t<.3?'star1':'star2';
  if(['dodgeL','dodgeR','duck','block','hurt','down','getup','win'].includes(st))return st;return ME.tired?'tired':'idle';}
 function drawFx(dt){for(const f of fx){f.t+=dt;const k=f.t/.3,r=(f.big?60:34)*(1+k)*(L.uo/150);x.save();x.globalAlpha=Math.max(0,1-k);x.strokeStyle=f.blk?'#cde':f.big?'#ffd23f':'#fff';x.lineWidth=f.big?5:3;
  for(let i=0;i<10;i++){const a=i*.628+f.x;x.beginPath();x.moveTo(f.x+Math.cos(a)*r*.3,f.y+Math.sin(a)*r*.3);x.lineTo(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r);x.stroke();}x.restore();}fx=fx.filter(f=>f.t<.3);}
 function bar(bx,by,w,h,v,col){x.fillStyle='#000a';rr(x,bx,by,w,h,h/2);x.fill();x.fillStyle=col;rr(x,bx+2,by+2,Math.max(0,(w-4)*clamp(v,0,1)),h-4,(h-4)/2);x.fill();}
 function drawHUD(){const W=L.W,fs=clamp(Math.min(W,L.H)*.032,11,16),y0=L.top,pw=Math.min(W*(L.wide?.3:.4),250),ph=L.hud*.92;
  // you (left)
  x.fillStyle='#000000b0';rr(x,6,y0,pw,ph,10);x.fill();myFace(ME.i,6+ph*.42,y0+ph*.48,ph*.62,ME.st==='hurt'||ME.st==='down'?'sad':ME.tired?'think':'normal');
  label(x,names[ME.i].slice(0,12),6+ph*.85,y0+fs*.95,fs,{align:'left',fill:'#9ad8ff'});bar(6+ph*.85,y0+fs*1.7,pw-ph*.95,fs*.9,ME.hp/100,ME.hp>40?'#5fe07a':'#ff6b4a');
  label(x,`♥ ${ME.hearts}   ${'★'.repeat(ME.stars)}${'☆'.repeat(3-ME.stars)}`,6+ph*.85,y0+fs*3.3,fs*.95,{align:'left',fill:ME.tired?'#ff9fc6':'#ffd23f'});
  // opponent (right)
  const rx=W-6-pw;x.fillStyle='#000000b0';rr(x,rx,y0,pw,ph,10);x.fill();faceOf(F.def.id,rx+pw-ph*.42,y0+ph*.48,ph*.62,F.st==='hurt'||F.st==='stun'?'sad':'normal');
  label(x,F.def.name.toUpperCase().slice(0,14),rx+pw-ph*.85,y0+fs*.95,fs,{align:'right',fill:'#ff9fc6'});bar(rx+8,y0+fs*1.7,pw-ph*.95,fs*.9,F.hp/F.max,'#ffb43a');
  label(x,CIRCUITS[F.def.circuit],rx+pw-ph*.85,y0+fs*3.3,fs*.75,{align:'right',fill:'#ccc'});
  // round + clock
  const m=Math.max(0,Math.ceil(R.clock)),cs=`${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;const cyy=L.wide?y0:y0+ph+4;x.fillStyle='#000000c8';rr(x,W/2-fs*3.4,cyy,fs*6.8,fs*2.5,8);x.fill();
  label(x,`R${R.round}  ${cs}`,W/2,cyy+fs*.85,fs*1.05,{fill:'#fff'});label(x,String(ME.score),W/2,cyy+fs*1.95,fs*.8,{fill:'#ffe680'});
  if(partner)label(x,`${names[1-ME.i]}: ${partner.sc} · R${partner.rd}`,W/2,cyy+fs*3.3,fs*.75,{fill:'#bcd'});}
 function drawPops(dt){let yy=L.H*.42;for(const p of pops){p.t+=dt;const a=Math.min(1,(2-p.t)*2);if(a<=0)continue;x.globalAlpha=a;const fs=clamp(L.W*(p.big?.075:.045),14,p.big?40:24);
  label(x,p.txt,L.W/2,yy-Math.min(.25,p.t)*40,fs,{fill:p.col});yy+=fs*1.25;x.globalAlpha=1;}pops=pops.filter(p=>p.t<2);}
 function drawCount(){if(R.count<0)return;const n=Math.max(1,R.count),fs=clamp(L.W*.22,60,150);
  label(x,String(R.count||''),L.W/2,L.H*.42,fs,{fill:R.who==='me'?'#ff6b6b':'#fff'});void n;
  if(R.who==='me'){const fs2=clamp(L.W*.06,16,30);label(x,'TAP TAP TAP TO GET UP!',L.W/2,L.H*.55,fs2,{fill:'#ffd23f'});bar(L.W*.2,L.H*.58,L.W*.6,fs2*.8,ME.mash/mashNeed(),'#ffd23f');}}
 function drawHints(dt){if(hint<=0)return;hint-=dt;const a=Math.min(1,hint),W=L.W,H=L.H,fs=clamp(W*.034,11,16),split=L.hipY+L.uo*.05;x.save();x.globalAlpha=a*.85;
  x.setLineDash([6,6]);x.strokeStyle='#ffffff60';x.beginPath();x.moveTo(W/2,L.top+L.hud);x.lineTo(W/2,H);x.moveTo(0,split);x.lineTo(W,split);x.stroke();x.setLineDash([]);
  label(x,'TAP: LEFT JAB',W*.25,split-fs*1.4,fs);label(x,'TAP: RIGHT JAB',W*.75,split-fs*1.4,fs);label(x,'TAP: LEFT BODY',W*.25,split+fs*1.6,fs);label(x,'TAP: RIGHT BODY',W*.75,split+fs*1.6,fs);
  label(x,'SWIPE ← → DODGE · ↓ DUCK · ↑ STAR PUNCH · HOLD = BLOCK',W/2,H*.93,fs*.9,{fill:'#ffe680'});x.restore();}
 // ---------------------------------------------------------------- cards / menus
 function button(id,text,bx,by,w,h,go,{hot=false,sub=''}={}){buttons.push({id,x:bx,y:by,w,h,go});x.fillStyle=hot?'#ffd23f':'#1a0e14ee';rr(x,bx,by,w,h,h*.25);x.fill();x.strokeStyle=hot?'#fff2b0':'#c0262eaa';x.lineWidth=2;x.stroke();
  label(x,text,bx+w/2,by+h*(sub?.4:.52),h*.36,{fill:hot?'#1a1300':'#fff'});if(sub)label(x,sub,bx+w/2,by+h*.74,h*.2,{fill:hot?'#3a2a00':'#dbc'});}
 function showCard(spec){return new Promise(res=>{card={...spec,done:res};phase='card';});}
 function bg(){const p=BG.pick(L.W,L.H,{tall:'title-bg-tall',wide:'title-bg-wide',fold:'title-bg-fold'},PO.picture);
  if(p){const k=Math.max(L.W/p.width,L.H/p.height);x.drawImage(p,(L.W-p.width*k)/2,(L.H-p.height*k)/2,p.width*k,p.height*k);x.fillStyle='#0008';x.fillRect(0,0,L.W,L.H);}
  else{if(F)x.drawImage(arenaLayer(),0,0);else{const g=x.createRadialGradient(L.W/2,L.H*.3,10,L.W/2,L.H*.3,L.H);g.addColorStop(0,'#3a1418');g.addColorStop(1,'#05060a');x.fillStyle=g;x.fillRect(0,0,L.W,L.H);}x.fillStyle='#000a';x.fillRect(0,0,L.W,L.H);}}
 function drawLogo(cx,cy,w){const lg=PO.picture('logo');if(lg){const h=w*lg.height/lg.width;x.drawImage(lg,cx-w/2,cy-h/2,w,h);return;}
  x.save();x.translate(cx,cy);x.rotate(-.04);label(x,'FIGHT',0,-w*.09,w*.17,{fill:'#ffd23f'});label(x,'NIGHT',0,w*.08,w*.17,{fill:'#ff3b30'});label(x,'ROCKY\'S CIRCUIT',0,w*.2,w*.05,{fill:'#fff'});x.restore();}
 function drawCard(){const W=L.W,H=L.H,w=Math.min(W*.9,440),h=Math.min(H*.86,card.h||460),cx=(W-w)/2,cy=(H-h)/2;bg();
  x.fillStyle='#0d070bf0';rr(x,cx,cy,w,h,16);x.fill();x.strokeStyle='#c0262e';x.lineWidth=2;x.stroke();const fs=clamp(w*.07,16,28);let y=cy+fs*1.3;
  if(card.top){label(x,card.top,W/2,y,fs*.6,{fill:'#ffd23f'});y+=fs*.9;}
  if(card.face){const d=Math.min(h*.3,w*.42);if(card.mine!=null)myFace(card.mine,W/2,y+d*.55,d,card.mood||'happy');else faceOf(card.face,W/2,y+d*.55,d*.62,card.mood||'normal');y+=d*1.1+fs*.3;}
  if(card.belt){const b=PO.picture('belt');const bw=w*.7;if(b)x.drawImage(b,W/2-bw/2,y,bw,bw*b.height/b.width);else label(x,'🏆',W/2,y+fs*1.4,fs*2.6);y+=bw*.6;}
  label(x,card.title,W/2,y,fs*1.1,{fill:card.color||'#fff'});y+=fs*1.2;
  for(const l of card.lines||[]){label(x,l,W/2,y,fs*.55,{fill:'#e8dce4'});y+=fs*.85;}
  if(card.quote){x.fillStyle='#ffffff14';rr(x,cx+14,y,w-28,fs*1.9,10);x.fill();label(x,`"${card.quote}"`,W/2,y+fs*.95,fs*.5,{fill:'#ffe680'});}
  const bb=card.buttons||[['OK','ok']],bh=clamp(h*.1,40,56),bw=(w-30-(bb.length-1)*10)/bb.length;bb.forEach(([t,id],i)=>button(id,t,cx+15+i*(bw+10),cy+h-bh-14,bw,bh,()=>{const d=card.done;card=null;phase='wait';d(id);},{hot:i===0}));}
 let titleDraw=null;
 function title(){return new Promise(res=>{phase='title';titleDraw=()=>{bg();const W=L.W,H=L.H,bw=Math.min(W*.8,340),bh=clamp(H*.085,46,64),cx=W/2-bw/2;drawLogo(W/2,L.top+H*.15,Math.min(W*.85,520,H*1.1));
   const fd=Math.min(W,H)*.1;faceOf(TRAINER,W/2,L.top+H*.15+Math.min(W*.85,520,H*1.1)*.36+fd*.7,fd,'happy');let y=Math.max(H*.47,L.top+H*.15+Math.min(W*.85,520,H*1.1)*.36+fd*1.6);const reached=save.reached||0,startAt=reached>=10?10:reached>=9?9:reached>=6?6:reached>=3?3:0;
   button('new','NEW CAREER',cx,y,bw,bh,()=>res({from:0}),{hot:!startAt,sub:'Minor circuit · fight 1 of 11'});y+=bh*1.2;
   if(startAt)button('cont',`CONTINUE · ${CIRCUITS[FIGHTERS[startAt].circuit]}`,cx,y,bw,bh,()=>res({from:startAt}),{hot:true,sub:`vs ${FIGHTERS[startAt].name}`}),y+=bh*1.2;
   button('how','HOW TO BOX',cx,y,bw,bh*.8,()=>res({how:true}));};});}
 const HOW=['TAP the top half: punch the head (left side = left hand)','TAP the bottom half: punch the body','SWIPE ← or →: dodge   ·   SWIPE ↓: duck','HOLD a finger down: block','Dodge a big punch, then hit him while he\'s open = COUNTER','Hit him while he winds up (eyes flash) = COUNTER + ★','SWIPE ↑: STAR PUNCH (uses all your stars)','♥ = stamina. Blocked punches and hits drain it. At 0 you\'re tired: dodge to recover','Knocked down? TAP TAP TAP to get up before 10'];
 // ---------------------------------------------------------------- one fight
 async function fight(def,i,{rounds=3,career=false}={}){newFight(def,i,{rounds});phase='wait';
  await showCard({top:`${CIRCUITS[def.circuit]}${career?` · FIGHT ${FIGHTERS.indexOf(def)+1} OF ${FIGHTERS.length}`:''}`,face:def.id,mood:'angry',title:def.name.toUpperCase(),lines:[`FROM ${def.from.toUpperCase()}`,`RECORD ${def.record}`],quote:def.lines[0],buttons:[['FIGHT!','go']]});if(!s.alive)return null;
  for(;;){await roundIntro();if(!s.alive)return null;const r=await runRound();if(!s.alive)return null;
   if(R.over)break;if(R.round>=R.rounds){const myPts=ME.landed+F.downs*30,foePts=F.pts+ME.downs*30;R.over={win:myPts>=foePts,how:'DEC',pts:[Math.round(myPts),Math.round(foePts)]};break;}
   // corner between rounds
   const rec=Math.round((100-ME.hp)*.3);ME.hp=Math.min(100,ME.hp+rec);ME.hearts=Math.max(ME.hearts,14);ME.tired=false;R.round++;R.clock=ROUND;F.rdDowns=0;ME.rdDowns=0;F.hp=Math.min(F.max,F.hp+F.max*.08);
   await showCard({top:`END OF ROUND ${R.round-1}`,face:TRAINER,mood:'think',title:'ROCKY SAYS',lines:[def.tip.slice(0,46),def.tip.slice(46,92),def.tip.slice(92)].filter(Boolean),quote:`${def.name}: ${def.lines[R.round%def.lines.length]}`,buttons:[[`ROUND ${R.round}`,'go']]});if(!s.alive)return null;}
  music=false;const o=R.over,win=o.win;ME.st=win?'win':ME.st;F.st=win?F.st:'win';
  const bonus=win?(o.how==='KO'?3000+Math.round(R.clock*10):o.how==='TKO'?2500:1500):0;ME.score+=bonus;snd.bell();if(win)snd.cheer();
  // a locked opponent you beat joins your roster
  let joined=null;if(win){try{const rw=require('src/rewards.js');const pool=rw.gameRecruitPool(s.game,store.profile,s.players[i]).map(c=>c.id);if(pool.includes(def.id)&&!s.gameRecruits[i].includes(def.id)){s.gameRecruits[i].push(def.id);joined=def.name;}}catch{}}
  await wait(1.6);if(!s.alive)return null;
  await showCard({top:win?'WINNER':'DEFEATED',face:win?null:def.id,mine:win?i:null,face2:null,mood:win?'happy':'happy',title:win?`${o.how==='DEC'?'DECISION':o.how}!`:o.how==='DEC'?'LOST ON POINTS':`${o.how} LOSS`,color:win?'#9dff5c':'#ff6b6b',
   lines:[o.how==='DEC'?`Points ${o.pts[0]} – ${o.pts[1]}`:`Round ${R.round} · ${Math.floor((ROUND-R.clock)/60)}:${String(Math.floor((ROUND-R.clock)%60)).padStart(2,'0')}`,`Score ${ME.score}${bonus?` (+${bonus})`:''}`,joined?`${joined.toUpperCase()} JOINS YOUR ROSTER!`:''].filter(Boolean),
   ...(win?{face:'x',mine:i}:{}),buttons:[['CONTINUE','ok']]});
  keep({played:1});return {win,how:o.how,score:ME.score};}
 function wait(sec){return new Promise(r=>{const t0=performance.now();const go=()=>{if(!s.alive||performance.now()-t0>=sec*1000)return r();requestAnimationFrame(go);};go();});}
 async function roundIntro(){phase='intro';R.introT=0;snd.bell();music=true;await wait(1.3);phase='fight';}
 function runRound(){return new Promise(res=>{R.endRound=res;});}
 // ---------------------------------------------------------------- autopilot (tests): plays your boxer
 let botT=0;function bot(dt){if(!ME||phase!=='fight')return;if(R.count>=0){if(R.who==='me'&&rand()<.5)act('mash');return;}botT-=dt;
  if(F.st==='tell'&&F.t>F.dur*.55&&ME.st==='idle'){const k=F.move;act(k==='special'&&F.def.special.avoid==='duck'?'duck':k==='special'&&F.def.special.avoid==='block'?'block':rand()<.5?'dodgeL':'dodgeR');if(ME.blockHold)setTimeout(()=>{if(ME){ME.blockHold=false;}},400);return;}
  if(botT<=0&&ME.st==='idle'){botT=.18+rand()*.2;if(ME.stars&&(F.st==='recover'||F.st==='stun'))act('star');else if(F.st==='recover'||F.st==='hurt'||F.st==='stun'||F.st==='taunt')act(rand()<.5?'jabL':'jabR');else if(F.st==='idle')act(F.guard==='high'?(rand()<.5?'bodyL':'bodyR'):(rand()<.5?'jabL':'jabR'));}}
 // ---------------------------------------------------------------- frame
 s.frame(dt=>{dt=Math.min(dt,.05);layout();buttons=[];tick+=dt;stepMusic();
  if(phase==='title'){titleDraw?.();return;}
  if(phase==='card'&&card){drawCard();return;}
  if(!F){bg();return;}
  let gdt=dt;if(hitStop>0){hitStop-=dt;gdt=dt*.08;}
  if(phase==='fight'&&!R.over){if(autoAll||botOn)bot(dt);stepMe(gdt);stepFoe(gdt);stepCount(gdt);if(R.count<0&&F.st!=='fall'&&ME.st!=='down')R.clock-=gdt*CLOCK_K;
   if(R.clock<=0&&R.count<0){R.clock=0;music=false;snd.bell();const e=R.endRound;R.endRound=null;phase='wait';e?.();}
   if(R.over){music=false;const e=R.endRound;R.endRound=null;phase='wait';e?.();}}
  else if(phase==='wait'){stepFoe(gdt*.5);}
  nf?.tick(dt);
  x.save();if(shake>0){shake-=dt;x.translate((Math.random()-.5)*20*shake,(Math.random()-.5)*20*shake);}
  x.drawImage(arenaLayer(),0,0);
  if(R.count>=0||F.st==='fall')A.drawRef(x,L.W*.14,L.hipY+L.uo*.7,L.uo*.55,R.count>=0?'count':'stand',R.countT/.8);
  drawFoe();drawFx(dt);drawMe();x.restore();
  drawHUD();drawPops(dt);drawCount();drawHints(dt);
  if(phase==='intro'){const k=R.introT=(R.introT||0)+dt,fs=clamp(L.W*.12,30,70);x.globalAlpha=Math.min(1,(1.3-k)*3);label(x,k<.7?`ROUND ${R.round}`:'FIGHT!',L.W/2,L.H*.45,fs,{fill:k<.7?'#fff':'#ffd23f'});x.globalAlpha=1;}
  s.status?.(`${names[ME.i]} vs ${F.def.name} · R${R.round}`);});
 let botOn=false;
 // ---------------------------------------------------------------- debug (tests)
 s.debug={engine:'boxing',get phase(){return phase;},get F(){return F;},get ME(){return ME;},get R(){return R;},act:a=>act(a),press:id=>buttons.find(b=>b.id===id)?.go(),get buttons(){return buttons.map(b=>b.id);},
  set auto(v){autoAll=!!v;},bot:on?()=>{if(botOn)return '';botOn=true;return 'drive';}:null,
  skip(){if(card){const d=card.done,id=(card.buttons||[['OK','ok']])[0][1];card=null;phase='wait';d(id);}},ko(){if(F){F.hp=1;F.def={...F.def,getup:[null,null,null]};}}};
 const autoTimer=setInterval(()=>{if(!(autoAll||botOn)||!s.alive)return;if(card){const d=card.done,id=(card.buttons||[['OK','ok']])[0][1];card=null;phase='wait';d(id);}},150);s.cleanup?.(()=>clearInterval(autoTimer));
 let nf=null;
 s.hint('Tap the top half to punch the head, the bottom half for the body (left or right side = which hand). Swipe left/right to dodge, down to duck, hold to block, swipe up for a STAR PUNCH. Dodge his big punches and hit him while he is open; hit him while he winds up for a counter and a star. Keys: Z/X jab, A/S body, arrows dodge/duck, C block, space star.');
 layout();
 // ---------------------------------------------------------------- modes
 if(solo1){s.solo.kind='levels';let pick;for(;;){pick=await title();if(!s.alive)return;if(!pick.how)break;
   await showCard({top:'HOW TO BOX',face:TRAINER,mood:'happy',title:'ROCKY\'S RULES',lines:HOW,h:Math.min(L.H*.9,620),buttons:[['GOT IT','ok']]});if(!s.alive)return;}
  let n=pick.from,wins=0,score=0,losses=0;
  while(s.alive&&n<FIGHTERS.length){const def=FIGHTERS[n];const r=await fight(def,0,{rounds:3,career:true});if(!s.alive)return;score+=r.score;
   if(r.win){wins++;n++;keep({reached:Math.max(save.reached||0,n)});soloProgress(s,score,wins,`Fight Night · beat ${def.name} · ${score}`);
    if(n<FIGHTERS.length&&FIGHTERS[n].circuit!==def.circuit){await showCard({top:CIRCUITS[def.circuit],belt:true,title:def.circuit>=3?'WORLD CHAMPION!':'CIRCUIT CHAMPION!',color:'#ffd23f',lines:[`Next: ${CIRCUITS[FIGHTERS[n].circuit]}`],buttons:[['ON TO THE NEXT','ok']]});if(!s.alive)return;}}
   else{losses++;if(losses>=3){await showCard({face:TRAINER,mood:'sad',title:'CAREER OVER',lines:['Three losses. Time to hang up the gloves.',`Score ${score}`],buttons:[['FINISH','ok']]});break;}
    const c2=await showCard({face:TRAINER,mood:'think',title:'GET BACK UP',lines:[`${3-losses} loss${3-losses===1?'':'es'} left before retirement`],buttons:[['REMATCH','go'],['RETIRE','stop']]});if(c2==='stop'||!s.alive)break;}}
  if(!s.alive)return;if(n>=FIGHTERS.length)await showCard({belt:true,title:'UNDISPUTED LEGEND!',color:'#ffd23f',lines:['You beat everyone. Even the dream fight.'],buttons:[['FINISH','ok']]});
  soloFinish(s,score,wins,`Fight Night · ${wins} win${wins===1?'':'s'} · ${score} points`,n>FIGHTERS.findIndex(f=>f.circuit===3));return;}
 // two players: both box the same opponent from the seed
 const r=seededRandom((s.seed||'po')+':po-opp'),opp=FIGHTERS[Math.floor(r()*6)],rounds=board?1:3,scores=[0,0];
 if(on){nf=netField(s,{hz:4,pack:()=>({sc:ME?.score||0,rd:R?.round||1,hp:Math.round(ME?.hp||0)}),unpack:(i,d)=>{partner=d;}});
  phase='wait';await nf.start('go');if(!s.alive)return;const res=await fight(opp,nf.me,{rounds});if(!s.alive||!res)return;scores[nf.me]=res.score;nf.finish(res.score);
  phase='wait';const o=await nf.remoteDone();scores[1-nf.me]=o|0;s.finish([...scores],`Fight Night vs ${opp.name} · ${scores[0]} – ${scores[1]}`);return;}
 for(const i of [0,1]){if(!await s.pass(i,`${names[i]}: box ${opp.name} (${CIRCUITS[opp.circuit].toLowerCase()}). ${rounds===1?'One round.':'Three rounds.'} Best score wins: KOs pay big.`,'Ready'))return;
  const res=await fight(opp,i,{rounds});if(!s.alive||!res)return;scores[i]=res.score;}
 s.finish([...scores],`Fight Night vs ${opp.name} · ${scores[0]} – ${scores[1]}`);
}
Object.assign(exports,{boxing});
