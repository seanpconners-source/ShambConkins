// Paddy's Darts (id paddys-darts), the first of the Paddy's bar games: three games on one proper board. 301 (count down to exactly
// zero, go under and the visit is a bust), Rickety Cricket's Cricket (close 20 to 15 and the bull, extra marks score until the other
// player closes), High Score (three visits). Players alternate visits of three darts on one phone. Hold a finger to aim: the sight
// floats above it and wobbles; let go to throw. Vs CPU the CPU throws its own visits; online each phone throws its own, the other
// watches ({mode}, {d:[x,y]} where the dart landed). Art and sound are drawn and synthesized here.
const {clamp}=require('src/utils.js');
const {store}=require('src/state.js');
const {audioContext,vibrate,holdMusic,releaseMusic}=require('src/audio.js');
const {isCpu,cpuSkill}=require('src/engines/cpuKit.js');
const {fullBleed}=require('src/engines/fullBleed.js');

const ORDER=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
const R={bull:.037,outer:.094,trebIn:.582,trebOut:.629,dblIn:.953,dbl:1};
const CRICKET=[20,19,18,17,16,15,25];
const MODES={x01:{name:'301',sub:'Count down to exactly zero. Go under and the visit is a bust.',cap:10},cricket:{name:'Rickety Cricket’s Cricket',sub:'Close 20 to 15 and the bull. Extra marks score until the other player closes.',cap:12},high:{name:'High Score',sub:'Three visits, three darts each. Biggest total wins.',cap:3}};
const QUIPS={miss:['Off the wall!','Into the bar stool.','Cricket felt that one.','Wildcard!'],big:['TON!','Paddy’s approves.','Golden God throw!'],bust:['BUST!','The Gang goes bust.']};
function hitAt(dx,dy){const r=Math.hypot(dx,dy);if(r<=R.bull)return {n:25,m:2,v:50,label:'BULLSEYE!'};if(r<=R.outer)return {n:25,m:1,v:25,label:'OUTER BULL'};if(r>R.dbl)return {n:0,m:0,v:0,label:'MISS'};
 let a=Math.atan2(dx,-dy)*180/Math.PI;a=(a+360+9)%360;const n=ORDER[Math.floor(a/18)];if(r>=R.dblIn)return {n,m:2,v:n*2,label:`DOUBLE ${n}`};if(r>=R.trebIn&&r<=R.trebOut)return {n,m:3,v:n*3,label:`TREBLE ${n}`};return {n,m:1,v:n,label:String(n)};}
// where to aim for a number and ring, in board units
const spot=(n,m=1)=>{if(n===25)return [0,0];const i=ORDER.indexOf(n),a=i*18*Math.PI/180,r=m===3?.605:m===2?.976:.78;return [Math.sin(a)*r,-Math.cos(a)*r];};

const CSS=`.dt-menu{position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:56px 16px 44px;background:#0d0705e6;color:#fff;text-align:center}
 .dt-menu h2{margin:0 0 6px;font:400 clamp(30px,9vmin,52px)/1 "SC Bangers",Impact,sans-serif;color:#7dff9a;text-shadow:0 0 16px #2fbf5a}
 .dt-menu p{margin:0 0 4px;font:800 14px/1.3 "SC Nunito",sans-serif;opacity:.85}
 .dt-menu button.dt-mode{margin:0;padding:12px 14px;border:2px solid #7a5a2a;border-radius:12px;background:linear-gradient(#3a2412,#1e120a);color:#fff;text-align:left;font:800 13px/1.25 "SC Nunito",sans-serif;box-shadow:0 5px 0 #0008}
 .dt-menu button.dt-mode b{display:block;margin-bottom:2px;font:400 clamp(20px,5.4vmin,28px)/1 "SC Bangers",Impact,sans-serif;letter-spacing:.03em;color:#ffd23f}
 .dt-menu button.dt-mode:active{transform:translateY(3px)}`;

function makeSound(){let a=null,bus=null,nb=null;
 const ok=()=>{if(!store.profile?.settings.sound&&!store.profile?.settings.music)return false;a=audioContext();if(!a)return false;if(!bus){bus=a.createGain();bus.gain.value=.6;bus.connect(a.destination);}return true;};
 const noise=(t,d,v,f0,f1)=>{nb||=(()=>{const b=a.createBuffer(1,a.sampleRate,a.sampleRate),x=b.getChannelData(0);for(let i=0;i<x.length;i++)x[i]=Math.random()*2-1;return b;})();const n=a.createBufferSource(),l=a.createBiquadFilter(),g=a.createGain();n.buffer=nb;l.type='bandpass';l.frequency.setValueAtTime(f0,t);l.frequency.exponentialRampToValueAtTime(f1,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);n.connect(l).connect(g).connect(bus);n.start(t);n.stop(t+d+.02);};
 const note=(f,t,d,v,type='triangle')=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(bus);o.start(t);o.stop(t+d+.02);};
 return {whoosh(){if(ok())noise(a.currentTime,.2,.12,900,2600);},thunk(){if(!ok())return;const t=a.currentTime;note(160,t,.09,.4,'square');noise(t,.07,.3,3000,800);},miss(){if(!ok())return;const t=a.currentTime;note(90,t,.2,.4,'sawtooth');},crowd(k=1){if(!ok())return;const t=a.currentTime;noise(t,1.1,.14*k,1400,2400);[523,659,784].forEach((f,i)=>note(f,t+i*.08,.18,.12));},bust(){if(!ok())return;const t=a.currentTime;[220,196,165].forEach((f,i)=>note(f,t+i*.16,.26,.26,'sawtooth'));}};}

async function darts(s){
 const [c,x]=s.canvas(680,780,{fill:true}),fb=fullBleed(s,{bg:'#150c07'});
 const net=s.online||null,cpu=isCpu(s),snd=makeSound(),calm=!!store.profile?.settings.reducedMotion;if(cpu||net)s.hotseat=true;
 const css=document.createElement('style');css.textContent=CSS;document.head.append(css);holdMusic(6*3600);s.cleanup(()=>{css.remove();releaseMusic();});
 const name=i=>String(s.players[i].name).toUpperCase().slice(0,10);
 let mode=null,turn=0,visit=0,dartN=0,visitPts=0,visitStart=0,marks=[{},{}],pts=[0,0],stuck=[],flying=null,pop=null,banner=null,phase='menu',boardImg=null,boardKey='',wall=null,wallKey='',resolveThrow=null,T=0;
 const remain=[301,301],shots=[0,0],aim={on:false,id:null,x:0,y:0};
 const local=i=>net?i===net.me:!(cpu&&i===1);

 // ---- layout: the board is the point of the screen
 function geo(){const W=s.W,H=s.H,top=(fb.top||40)+6,wide=W>H*1.05;if(wide){const r=Math.min((H-top-34)/2.72,W*.27);return {W,H,wide,r,cx:W*.02+r*1.36,cy:top+(H-top-30)/2,px:W*.02+r*2.8,py:top+4,pw:W-(W*.02+r*2.8)-12,ph:H-top-40};}
  const ph=Math.min(H*.3,230),r=Math.min((W-10)/2.72,(H-top-ph-52)/2.38);return {W,H,wide,r,cx:W/2,cy:top+r*1.36,px:10,py:H-ph-38,pw:W-20,ph};}
 function buildBoard(r){const S=Math.ceil(r*2.7*Math.min(2,devicePixelRatio||1)),k=S/2.7,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d');g.translate(S/2,S/2);
  const rim=g.createRadialGradient(0,0,k*1,0,0,k*1.34);rim.addColorStop(0,'#141414');rim.addColorStop(.8,'#232323');rim.addColorStop(1,'#050505');g.fillStyle=rim;g.beginPath();g.arc(0,0,k*1.34,0,7);g.fill();
  for(let i=0;i<20;i++){const a0=(-90-9+i*18)*Math.PI/180,a1=a0+18*Math.PI/180,dark=i%2===0;const ring=(r0,r1,col)=>{g.fillStyle=col;g.beginPath();g.arc(0,0,r1*k,a0,a1);g.arc(0,0,r0*k,a1,a0,true);g.closePath();g.fill();};
   ring(R.outer,R.trebIn,dark?'#191919':'#e9dcb8');ring(R.trebIn,R.trebOut,dark?'#c11f28':'#1b8236');ring(R.trebOut,R.dblIn,dark?'#191919':'#e9dcb8');ring(R.dblIn,R.dbl,dark?'#c11f28':'#1b8236');}
  g.fillStyle='#1b8236';g.beginPath();g.arc(0,0,R.outer*k,0,7);g.fill();g.fillStyle='#c11f28';g.beginPath();g.arc(0,0,R.bull*k,0,7);g.fill();
  // sisal fibres
  for(let i=0;i<S*6;i++){const a=Math.random()*6.28,q=Math.random()*k;g.fillStyle=Math.random()<.5?'#ffffff0d':'#0000001a';g.fillRect(Math.cos(a)*q,Math.sin(a)*q,1.4,1.4);}
  g.strokeStyle='#d4d6da';g.lineWidth=Math.max(1,k*.0075);for(const q of [R.bull,R.outer,R.trebIn,R.trebOut,R.dblIn,R.dbl]){g.beginPath();g.arc(0,0,q*k,0,7);g.stroke();}for(let i=0;i<20;i++){const a=(-90-9+i*18)*Math.PI/180;g.beginPath();g.moveTo(Math.cos(a)*R.outer*k,Math.sin(a)*R.outer*k);g.lineTo(Math.cos(a)*k,Math.sin(a)*k);g.stroke();}
  g.fillStyle='#f2f2ee';g.font=`900 ${k*.135}px Georgia,serif`;g.textAlign='center';g.textBaseline='middle';for(let i=0;i<20;i++){const a=(-90+i*18)*Math.PI/180;g.fillText(String(ORDER[i]),Math.cos(a)*k*1.17,Math.sin(a)*k*1.17);}
  boardImg=cv;}
 function buildWall(W,H){wall=document.createElement('canvas');wall.width=W;wall.height=H;const g=wall.getContext('2d'),bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#3e2714');bg.addColorStop(1,'#180d07');g.fillStyle=bg;g.fillRect(0,0,W,H);const pw=Math.max(54,W/9);for(let q=0;q<W;q+=pw){g.fillStyle='#00000040';g.fillRect(q,0,2,H);g.fillStyle='#ffffff08';g.fillRect(q+2,0,1,H);for(let n=0;n<7;n++){g.strokeStyle='#00000018';g.beginPath();const yy=Math.random()*H;g.moveTo(q+4,yy);g.bezierCurveTo(q+pw*.4,yy+20,q+pw*.6,yy-20,q+pw-4,yy+8);g.stroke();}}
  const v=g.createRadialGradient(W/2,H*.4,20,W/2,H*.4,Math.max(W,H)*.75);v.addColorStop(0,'#ffcf8a22');v.addColorStop(1,'#0009');g.fillStyle=v;g.fillRect(0,0,W,H);}
 const toScreen=(G,u,v)=>[G.cx+u*G.r,G.cy+v*G.r];
 function drawDart(px,py,k,col){x.save();x.translate(px,py);x.scale(k,k);x.fillStyle='#d8dade';x.fillRect(-1.4,0,2.8,16);x.fillStyle='#8a8d92';x.fillRect(-2.6,14,5.2,14);x.fillStyle='#444';x.fillRect(-1,28,2,9);x.fillStyle=col;x.beginPath();x.moveTo(0,35);x.lineTo(-9,50);x.lineTo(0,46);x.lineTo(9,50);x.closePath();x.fill();x.restore();}
 const wobble=()=>{const amp=.05+.015*Math.min(4,visit);return [(Math.sin(T*2.3)+Math.sin(T*3.7+1.1)*.6)*amp,(Math.cos(T*1.9+.4)+Math.sin(T*4.3)*.5)*amp];};

 // ---- rules
 function score(hit){const p=turn;shots[p]++;
  if(mode==='high'){pts[p]+=hit.v;visitPts+=hit.v;return;}
  if(mode==='x01'){const left=remain[p]-hit.v;if(left<0){remain[p]=visitStart;return 'bust';}remain[p]=left;visitPts+=hit.v;pts[p]=301-left;return left===0?'won':null;}
  if(!CRICKET.includes(hit.n))return;const o=1-p;let m=hit.m;const have=marks[p][hit.n]||0,add=Math.min(m,3-have);marks[p][hit.n]=have+add;m-=add;if(m>0&&(marks[o][hit.n]||0)<3){const val=(hit.n===25?25:hit.n)*m;pts[p]+=val;visitPts+=val;}
  const closed=CRICKET.every(n=>(marks[p][n]||0)>=3);if(closed&&pts[p]>=pts[o])return 'won';}
 function cpuAim(){const p=turn,o=1-p;if(mode==='high')return spot(20,3);if(mode==='x01'){const left=remain[p];if(left<=20)return spot(left,1);if(left===25||left===50)return spot(25);if(left<=40&&left%2===0)return spot(left/2,2);if(left<=60&&left%3===0)return spot(left/3,3);return spot(left>60?20:19,left>60?3:1);}
  const open=CRICKET.find(n=>(marks[p][n]||0)<3)||(CRICKET.find(n=>(marks[o][n]||0)<3))||20;return spot(open,open===25?1:3);}
 const gauss=()=>(Math.random()+Math.random()+Math.random()-1.5)/.75;

 // one dart: resolves where it landed, in board units (or null if the other phone is gone)
 function nextDart(){return new Promise(res=>{
  if(cpu&&turn===1){s.wait(calm?300:750).then(ok=>{if(!ok)return res(null);const [ax,ay]=cpuAim(),sp=.2*(1.2-cpuSkill(s));res([ax+gauss()*sp,ay+gauss()*sp]);});return;}
  if(net&&!local(turn)){net.next().then(m=>res(m&&Array.isArray(m.d)?[+m.d[0]||0,+m.d[1]||0]:null));return;}
  resolveThrow=p=>{resolveThrow=null;if(net)net.send({d:p});res(p);};});}
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!resolveThrow)return;ev.preventDefault();const p=s.pointer(ev);aim.on=true;aim.id=ev.pointerId;aim.x=p.x;aim.y=p.y-48;s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(ev.pointerId!==aim.id)return;const p=s.pointer(ev);aim.x=p.x;aim.y=p.y-48;});
 for(const ty of ['pointerup','pointercancel'])s.on(c,ty,ev=>{if(ev.pointerId!==aim.id)return;s.release(ev);aim.id=null;const was=aim.on;aim.on=false;if(ty==='pointerup'&&was&&resolveThrow){const G=geo(),[wx,wy]=wobble();resolveThrow([+((aim.x-G.cx)/G.r+wx).toFixed(3),+((aim.y-G.cy)/G.r+wy).toFixed(3)]);}});
 s.hint('Hold a finger on the board to aim: the sight floats just above your finger and wobbles. Let go to throw. Treble ring ×3, double ring ×2, outer bull 25, bullseye 50.');

 async function throwOne(){const land=await nextDart();if(!s.alive)return 'gone';if(!land)return 'gone';snd.whoosh();flying={u:land[0],v:land[1],t:0};await s.wait(calm?120:300);if(!s.alive)return 'gone';flying=null;
  const hit=hitAt(land[0],land[1]);stuck.push({u:land[0],v:land[1],p:turn});if(hit.v){snd.thunk();vibrate(12);}else snd.miss();
  const res=score(hit);s.setScores(mode==='x01'?[301-remain[0],301-remain[1]]:pts.slice());
  pop={text:res==='bust'?'BUST!':hit.v===0?QUIPS.miss[Math.floor(Math.random()*QUIPS.miss.length)]:hit.label,t:0,col:res==='bust'||!hit.v?'#ff6a5a':hit.v>=40?'#ffd23f':'#fff',u:land[0],v:land[1]};
  if(res==='bust')snd.bust();else if(hit.v>=50||hit.m===3&&hit.n>=18)snd.crowd(.8);
  return res;}
 async function playVisit(){visitPts=0;visitStart=remain[turn];stuck=[];banner={big:`${name(turn)}’S THROW`,small:mode==='x01'?`${remain[turn]} to go`:`Visit ${visit+1} of ${MODES[mode].cap}`,t:0,dur:calm?.5:1.1};s.react?.(turn,'thinking',1);await s.wait(calm?400:900);
  for(dartN=0;dartN<3;dartN++){const res=await throwOne();if(!s.alive||res==='gone')return res||'gone';await s.wait(calm?200:550);if(!s.alive)return 'gone';if(res==='won'||res==='bust')return res;}
  if(visitPts>=100){banner={big:visitPts>=180?'ONE HUNDRED AND EIGHTY!':QUIPS.big[0],small:`${visitPts} points`,t:0,dur:1.6};snd.crowd(1.2);s.react?.(turn,'win',1.4);await s.wait(1400);}
  return null;}

 function chooseMode(){return new Promise(res=>{const box=document.createElement('div');box.className='dt-menu';const picker=!net||net.me===0;
  box.innerHTML=`<h2>PADDY’S DARTS</h2>${picker?'<p>Pick the game. Loser buys the Fight Milk.</p>':`<p>${s.players[0].name} is picking the game…</p>`}${picker?Object.entries(MODES).map(([k,m])=>`<button class="dt-mode" data-mode="${k}"><b>${m.name}</b>${m.sub}</button>`).join(''):''}`;
  (s.body.closest('.game-shell')||s.body).append(box);s.cleanup(()=>box.remove());
  const go=k=>{box.remove();if(net&&picker)net.send({mode:k});res(k);};
  if(picker)for(const b of box.querySelectorAll('[data-mode]'))s.on(b,'click',()=>{snd.thunk();go(b.dataset.mode);});
  else net.next().then(m=>go(MODES[m?.mode]?m.mode:'high'));});}

 // ---- drawing
 function panel(G){const {px,py,pw,ph}=G;x.fillStyle='#4a3016';x.beginPath();x.roundRect(px-5,py-5,pw+10,ph+10,9);x.fill();x.fillStyle='#17231c';x.beginPath();x.roundRect(px,py,pw,ph,6);x.fill();
  const chalk=(t,tx,ty,sz,col='#f2f2ec',al='left')=>{x.fillStyle=col;x.font=`800 ${sz}px "Chalkboard SE","Comic Sans MS",cursive`;x.textAlign=al;x.textBaseline='middle';x.fillText(t,tx,ty);};
  const sz=Math.max(12,Math.min(20,ph/9.5,pw/16)),colW=(pw-20)/2;
  if(mode==='cricket'){const rowH=(ph-sz*2.6)/7,cxMid=px+pw/2;[0,1].forEach(i=>{const X=i?px+pw-10:px+10;chalk(`${name(i)} ${pts[i]}`,X,py+sz,sz,turn===i?'#ffd23f':'#f2f2ec',i?'right':'left');});
   CRICKET.forEach((n,k)=>{const y=py+sz*2.3+rowH*(k+.5);chalk(n===25?'BULL':String(n),cxMid,y,sz*.95,'#7dff9a','center');[0,1].forEach(i=>{const m=marks[i][n]||0,mx=i?px+pw*.8:px+pw*.2,r=Math.min(rowH*.38,sz*.6);x.strokeStyle=m>=3?'#ffd23f':'#f2f2ec';x.lineWidth=2.2;x.beginPath();if(m>=1){x.moveTo(mx-r,y+r);x.lineTo(mx+r,y-r);}if(m>=2){x.moveTo(mx-r,y-r);x.lineTo(mx+r,y+r);}if(m>=3){x.moveTo(mx+r,y);x.arc(mx,y,r,0,7);}x.stroke();});});return;}
  [0,1].forEach(i=>{const X=px+10+i*colW;s.sprite(x,i,X+sz,py+sz*1.5,sz*2.4,{exact:true,mood:turn===i?'thinking':'normal'});chalk(name(i),X+sz*2.4,py+sz*1.5,sz*.9,turn===i?'#ffd23f':'#f2f2ec');chalk(String(mode==='x01'?remain[i]:pts[i]),X+colW/2-10,py+sz*4.1,sz*2.3,turn===i?'#7dff9a':'#f2f2ec','center');});
  chalk(mode==='x01'?`Visit ${visit+1} of ${MODES.x01.cap}`:`Visit ${visit+1} of ${MODES.high.cap}`,px+pw/2,py+ph-sz*2.1,sz*.8,'#ffffffaa','center');chalk('darts: '+'➶'.repeat(Math.max(0,3-dartN)),px+pw/2,py+ph-sz*.9,sz*.85,'#f2f2ec','center');}
 s.frame(dt=>{if(!s.alive)return;T+=dt;const G=geo(),{W,H,cx,cy,r}=G;const wk=W+'x'+H;if(wk!==wallKey){wallKey=wk;buildWall(W,H);}x.setTransform(1,0,0,1,0,0);x.drawImage(wall,0,0);
  x.save();x.font=`900 ${Math.max(14,Math.min(22,r*.13))}px Georgia,serif`;x.textAlign='left';x.textBaseline='middle';x.shadowColor='#3dff74';x.shadowBlur=14;x.fillStyle='#8dffa8';x.fillText('PADDY’S PUB',12,Math.max(20,(fb.top||40)-16));x.restore();
  const bk=String(Math.round(r));if(bk!==boardKey){boardKey=bk;buildBoard(r);}const bs=r*2.7;x.fillStyle='#0007';x.beginPath();x.arc(cx+4,cy+7,r*1.35,0,7);x.fill();x.drawImage(boardImg,cx-bs/2,cy-bs/2,bs,bs);
  for(const d of stuck){const [X,Y]=toScreen(G,d.u,d.v);drawDart(X,Y,Math.max(.6,r/170),d.p?'#ff6aa0':'#58c8ff');}
  if(flying){flying.t+=dt/(calm?.12:.3);const k=clamp(flying.t,0,1),[tx,ty]=toScreen(G,flying.u,flying.v),X=tx+(1-k)*r*.5,Y=ty+(1-k)*H*.55-Math.sin(k*Math.PI)*r*.28;drawDart(X,Y,Math.max(.6,r/170)*(2.6-1.6*k),turn?'#ff6aa0':'#58c8ff');}
  if(aim.on&&resolveThrow){const [wx,wy]=wobble(),X=aim.x+wx*r,Y=aim.y+wy*r;x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.arc(X,Y,11,0,7);x.moveTo(X-18,Y);x.lineTo(X-5,Y);x.moveTo(X+5,Y);x.lineTo(X+18,Y);x.moveTo(X,Y-18);x.lineTo(X,Y-5);x.moveTo(X,Y+5);x.lineTo(X,Y+18);x.stroke();const h=hitAt((X-cx)/r,(Y-cy)/r);x.font='800 13px "SC Nunito",sans-serif';x.textAlign='center';x.fillStyle='#000a';x.fillRect(X-44,Y-42,88,18);x.fillStyle='#fff';x.fillText(h.label,X,Y-33);}
  if(mode)panel(G);
  if(resolveThrow&&!aim.on&&phase==='play'){x.font=`800 ${Math.max(12,Math.min(16,W*.036))}px "SC Nunito",sans-serif`;x.textAlign='center';x.fillStyle='#fff';x.fillText('HOLD TO AIM, LET GO TO THROW',G.wide?cx:W/2,H-24);}
  if(pop){pop.t+=dt;const [X,Y]=toScreen(G,clamp(pop.u,-1.1,1.1),clamp(pop.v,-1.1,1.1));x.globalAlpha=clamp((1.2-pop.t)*3,0,1);x.font=`900 ${Math.round(Math.max(18,r*.16))}px Impact,"Arial Black",sans-serif`;x.textAlign='center';x.lineWidth=5;x.strokeStyle='#000';x.lineJoin='round';const tx=clamp(X,90,W-90);x.strokeText(pop.text,tx,Y-26-pop.t*24);x.fillStyle=pop.col;x.fillText(pop.text,tx,Y-26-pop.t*24);x.globalAlpha=1;if(pop.t>1.2)pop=null;}
  if(banner){banner.t+=dt;const a=clamp(Math.min(banner.t*5,(banner.dur-banner.t)*4),0,1);if(a>0){x.globalAlpha=a;x.fillStyle='#000b';x.fillRect(0,cy-34,W,68);x.textAlign='center';x.font=`900 ${Math.round(Math.min(32,W*.075))}px Impact,"Arial Black",sans-serif`;x.fillStyle='#fff';x.fillText(banner.big,W/2,cy-8);if(banner.small){x.font='800 14px "SC Nunito",sans-serif';x.fillStyle='#ffd23f';x.fillText(banner.small,W/2,cy+18);}x.globalAlpha=1;}if(banner.t>banner.dur)banner=null;}
  s.debug={engine:'darts',get mode(){return mode;},get turn(){return turn;},get visit(){return visit;},remain,pts,marks,hitAt,spot,score,get ready(){return !!resolveThrow;},geo,bot(){if(phase==='menu'){const b=document.querySelector('[data-mode]');if(b){b.click();return 'mode';}return null;}if(resolveThrow&&!s.paused){const [a,b]=spot(20,1);resolveThrow([a+(Math.random()-.5)*.5,b+(Math.random()-.5)*.5]);return 'throw';}return null;},throwAt(u,v){resolveThrow?.([u,v]);}};});

 // ---- the match
 if(!net&&!await s.pass(0,'Darts at Paddy’s. Pick a game, then take turns: hold to aim, let go to throw.','To the oche'))return;
 mode=await chooseMode();if(!s.alive)return;phase='play';
 const cap=MODES[mode].cap;let won=-1;
 outer:for(visit=0;visit<cap;visit++)for(const p of [0,1]){turn=p;const r=await playVisit();if(!s.alive||r==='gone')break outer;if(r==='won'){won=p;break outer;}}
 if(!s.alive)return;
 if(won<0)won=mode==='x01'?(remain[0]===remain[1]?-1:remain[0]<remain[1]?0:1):pts[0]===pts[1]?-1:pts[0]>pts[1]?0:1;
 const final=mode==='x01'?[301-remain[0],301-remain[1]]:pts.slice();if(won>=0&&final[won]<=final[1-won])final[won]=final[1-won]+1;
 phase='end';banner={big:won<0?'DEAD EVEN':`${name(won)} WINS`,small:mode==='x01'?`${remain[0]} left · ${remain[1]} left`:`${pts[0]} to ${pts[1]}`,t:0,dur:9};snd.crowd(1.3);if(won>=0)s.react?.(won,'win',2);await s.wait(calm?900:2300);if(!s.alive)return;
 s.finish(final,`${MODES[mode].name}: ${s.players[0].name} ${final[0]} · ${s.players[1].name} ${final[1]}.`);
}
Object.assign(exports,{darts,hitAt,spot,MODES});
