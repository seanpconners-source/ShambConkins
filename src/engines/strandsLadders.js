// STRANDS & LADDERS (game id chutes-spinner-showdown): the whole Chutes and Ladders board game, dressed as a Death
// Stranding board game (pictures and words only; the rules are the classic 1943 board). Two porters, one board, one
// spinner. Flick the arrow (or tap SPIN): it spins like a real cardboard spinner, slows down by itself and can't be
// stopped. Your pawn hops that many squares; a good deed at a ladder's foot climbs you up, a slip at a chute's top slides
// you down. First to square 100 (Edge Knot City) wins; by default you need the exact number to get there, like the box says.
// Quality of life: options before the game (exact finish on/off, normal/fast), tap anywhere to hurry an animation, tap a
// ladder or chute square to see where it goes, the landing square lights up the moment the arrow stops, a log of the last
// moves, both porters' squares in the HUD, the CPU spins by itself, haptics on ladders/chutes.
// 1P = vs CPU (solo kind 'cpu'). 2P = one phone, take turns (no hand-off: nothing is secret). Board game: 8 spins each (fast moves),
// furthest wins if nobody reaches 100. Online: turn by turn; the spinning phone sends {sp:[w0,a0]} (start speed and angle)
// and both phones run the same fixed-step spin, so the arrow stops on the same number on both.
const {clamp}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {snd}=require("src/engines/arenaKit.js");
const {isCpu,isOnline}=require("src/engines/cpuKit.js");
const SA=require("src/data/strandsArt.js");
const D=require("src/engines/strandsDraw.js");
const {LADDERS,CHUTES,STORIES,BOARD,SQ,squareXY,chutePath,bez}=SA;
const OPT_KEY='sc-strands-opts';
// the spinner: angular speed falls by (c + k·w) per second, run in fixed 1/240 s steps so both phones agree
const SPIN={normal:{c:2.6,k:.55},fast:{c:5.5,k:1.1}};
function simulateSpin(w0,a0,speed){const {c,k}=SPIN[speed]||SPIN.normal,dt=1/240,path=[];let a=a0,w=w0;
 while(Math.abs(w)>.04&&path.length<240*12){path.push(a);const dec=(c+k*Math.abs(w))*dt;w=Math.sign(w)*Math.max(0,Math.abs(w)-dec);a+=w*dt;}path.push(a);return path;}
const sectorOf=a=>{const T=Math.PI*2;let v=((a+Math.PI/6)%T+T)%T;return Math.floor(v/(Math.PI/3))%6;};   // 0..5 -> spins 1..6

async function strands(s){
 const [c,x]=s.canvas(900,560,{fill:true});const fb=fullBleed(s,{bg:'#14120f'});SA.preload();
 const net=isOnline(s)?s.online:null,me=net?net.me:0,cpu=!net&&isCpu(s),board=s.origin==='board',names=s.players.map(p=>p.name||'Player');
 if(net)s.hotseat=true;
 let opts={exact:true,speed:'normal'};if(!net)try{Object.assign(opts,JSON.parse(localStorage.getItem(OPT_KEY)||'{}'));}catch{}   // online: both phones play the box rules
 const SPIN_CAP=board?8:60;if(board)opts.speed='fast';   // a board-game turn: 8 spins each, quick moves
 const P=[0,1].map(i=>({i,sq:0,spins:0,ladders:0,chutes:0,pos:null,hop:0}));
 let cur=0,mode='options',spinLock=false,t=0,spinA=0,spinPath=null,spinT=0,spinDone=null,result=-1,flick=null,card=null,hurry=false,tip=null,log=[],winner=-1,banner=null,hi=null;
 const sfx={tick:()=>snd(1800,.012,{type:'square',vol:.025}),hop:()=>snd(420,.05,{type:'triangle',vol:.05,to:520}),
  climb:()=>[392,494,587,784].forEach((f,i)=>snd(f,.09,{type:'triangle',vol:.05,delay:i*.07})),slide:()=>{snd(700,.7,{type:'sine',vol:.05,to:120});snd(60,.5,{type:'sawtooth',vol:.03,delay:.3,to:40});},
  win:()=>[523,659,784,1047,784,1047].forEach((f,i)=>snd(f,.14,{type:'triangle',vol:.06,delay:i*.12})),stuck:()=>snd(200,.18,{type:'square',vol:.03,to:150}),turn:()=>snd(660,.06,{type:'sine',vol:.035})};
 const say=txt=>{log.unshift(txt);log=log.slice(0,3);};
 const wait=ms=>new Promise(r=>{const end=performance.now()+ms;const f=()=>{if(!s.alive||hurry||performance.now()>=end){r();return;}setTimeout(f,30);};f();});
 // pawn display position (board px): off the board below square 1 at the start, side by side when sharing a square
 function spot(i,sq){if(sq<=0){const p=squareXY(1);return {x:p.x-SQ*.22+i*SQ*.44,y:BOARD.G0+BOARD.GS+46};}
  const p=squareXY(sq),both=P[1-i].sq===sq;return {x:p.x+(both?(i?SQ*.2:-SQ*.2):0),y:p.y+SQ*.28};}
 for(const p of P)p.pos=spot(p.i,0);
 // ---- layout
 let L=null;
 function layout(){const W=s.W,H=s.H,top=(fb.top||40)+8,wide=W>H*.85,fs=clamp(Math.min(W,H)*.036,12,18),promptH=fs*1.6;
  if(wide){const bs=Math.min(H-top-12,W*.6),k=bs/BOARD.S,bx=12,by=top+Math.max(0,(H-top-12-bs)/2),cx0=bx+bs+12,cw=W-cx0-12;
   // stacked: HUD + log on top of the column, spinner under them; side: HUD + log on the left of the column, spinner beside
   const spinTop=top+fs*9.8+6,availA=H-spinTop-promptH-10,rA=Math.min(cw*.47,availA/2.3);
   const hudW=Math.min(cw*.45,260),rB=Math.min((cw-hudW-24)/2.2,(H-top-promptH-20)/2.3);
   if(rB>rA*1.08){const r=Math.max(40,rB),sx=cx0+hudW+12+(cw-hudW-12)/2;
    L={wide,k,bx,by,bs,hud:{x:cx0,y:top,w:hudW},sp:{x:sx,y:top+(H-top-promptH-2.3*r)/2+1.12*r,r},log:{x:cx0,y:top+fs*6.8,w:hudW}};}
   else{const r=Math.max(40,rA);L={wide,k,bx,by,bs,hud:{x:cx0,y:top,w:cw},sp:{x:cx0+cw/2,y:spinTop+Math.max(0,availA-2.3*r)/2+1.12*r,r},log:{x:cx0,y:top+fs*6.8,w:cw}};}}
  else{const hudH=58,bs=Math.min(W-12,H-top-hudH-190),k=bs/BOARD.S,bx=(W-bs)/2,by=top+hudH,rest=H-by-bs,sr=Math.max(40,Math.min(W*.46,(rest-promptH-14)/2.3));
   L={wide,k,bx,by,bs,hud:{x:8,y:top,w:W-16},sp:{x:W/2,y:by+bs+6+Math.max(0,rest-promptH-14-2.3*sr)/2+sr*1.12,r:sr},log:{x:8,y:by+bs+6,w:W*.3}};}
  const zb=clamp(L.bs*.075,26,36);L.zb=[{d:-1,x:L.bx+L.bs-zb*2.35,y:L.by+L.bs-zb*1.15,r:zb/2},{d:1,x:L.bx+L.bs-zb*1.15,y:L.by+L.bs-zb*1.15,r:zb/2}];}
 // ---- camera over the board: the whole board while a porter spins, zoomed in and following the porter who is moving,
 // back out for the next turn. Small -/+ buttons zoom by hand; zoomed in, a drag scrolls the board.
 const Z_MOVE=2.4,Z_MAX=3.4,cam={z:1,cx:BOARD.S/2,cy:BOARD.S/2,man:null,hold:0},moving=()=>mode==='move'||!!card;
 const K=()=>L.k*cam.z,sx=bx=>L.bx+L.bs/2+(bx-cam.cx)*K(),sy=by=>L.by+L.bs/2+(by-cam.cy)*K();
 function camClamp(z,cx,cy){const h=BOARD.S/(2*z);return {z,cx:clamp(cx,h,BOARD.S-h),cy:clamp(cy,h,BOARD.S-h+(z>1.05?60:0))};}
 function camGoal(){if(moving()&&cam.hold<=0){const p=P[cur];return camClamp(cam.man?cam.man.z:Z_MOVE,p.pos.x,p.pos.y-SQ*.35);}
  if(cam.man)return camClamp(cam.man.z,cam.man.cx,cam.man.cy);return camClamp(1,BOARD.S/2,BOARD.S/2);}
 function camStep(dt){cam.hold-=dt;const g=camGoal(),fast=moving()&&P[cur].anim?9:5,a=1-Math.exp(-dt*fast);
  cam.z=Math.exp(Math.log(cam.z)+(Math.log(g.z)-Math.log(cam.z))*a);cam.cx+=(g.cx-cam.cx)*a;cam.cy+=(g.cy-cam.cy)*a;
  if(Math.abs(cam.z-g.z)<.002&&Math.hypot(cam.cx-g.cx,cam.cy-g.cy)<.5)Object.assign(cam,{z:g.z,cx:g.cx,cy:g.cy});}
 function zoomBy(f){const z=clamp(cam.z*f,1,Z_MAX);cam.man=z<=1.04&&!moving()?null:camClamp(z<=1.04?1:z,cam.cx,cam.cy);}
 let pan=null;
 const toBoard=(px,py)=>({x:cam.cx+(px-L.bx-L.bs/2)/K(),y:cam.cy+(py-L.by-L.bs/2)/K()});
 // ---- board cache (redrawn when the size or pictures change)
 let boardCv=null,boardKey='';
 function boardLayer(){const hiRes=cam.z>1.15,key=Math.round(L.bs)+':'+(hiRes?'h':'l')+':'+Object.keys(SA.SLOTS).filter(n=>SA.picture(n)).length;
  if(boardKey!==key){boardKey=key;boardCv=document.createElement('canvas');boardCv.width=boardCv.height=Math.min(3072,Math.ceil(L.bs*Math.min(2,devicePixelRatio||1)*(hiRes?Z_MOVE:1)));const g=boardCv.getContext('2d'),kk=boardCv.width/BOARD.S;D.drawBoard(g,kk,0);}return boardCv;}

 // ---- input
 s.on(c,'pointerdown',ev=>{const p=s.pointer(ev);if(!L)return;
  if(mode==='options'){for(const b of optButtons())if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){b.act();return;}return;}
  for(const zb of L.zb)if(Math.hypot(p.x-zb.x,p.y-zb.y)<zb.r*1.5){zoomBy(zb.d>0?1.5:1/1.5);zb.flash=.25;return;}
  if(card||mode==='move'){hurry=true;return;}
  const d=Math.hypot(p.x-L.sp.x,p.y-L.sp.y);
  if(mode==='spin'&&canSpinHere()&&d<L.sp.r*1.35){flick={pts:[{a:Math.atan2(p.y-L.sp.y,p.x-L.sp.x),t:performance.now()}],id:ev.pointerId,moved:0};s.capture?.(ev);return;}
  // zoomed in: a drag on the board scrolls it (a tap without moving still opens the tooltip)
  const inBoard=p.x>=L.bx&&p.x<=L.bx+L.bs&&p.y>=L.by&&p.y<=L.by+L.bs;
  if(inBoard&&cam.z>1.05){pan={id:ev.pointerId,x:p.x,y:p.y,cx:cam.cx,cy:cam.cy,moved:0};s.capture?.(ev);return;}
  tapTip(p);});
 function tapTip(p){// tap a ladder/chute square: where does it go?
  const b=toBoard(p.x,p.y);for(const n of [...Object.keys(LADDERS),...Object.keys(CHUTES)].map(Number)){const q=squareXY(n);if(Math.abs(b.x-q.x)<SQ/2&&Math.abs(b.y-q.y)<SQ/2){tip={n,t:3};return;}}
  tip=null;}
 s.on(c,'pointermove',ev=>{if(pan&&ev.pointerId===pan.id){const p=s.pointer(ev),dx=p.x-pan.x,dy=p.y-pan.y;pan.moved=Math.max(pan.moved,Math.hypot(dx,dy));
   if(pan.moved>6){const g=camClamp(cam.z,pan.cx-dx/K(),pan.cy-dy/K());cam.man=g;cam.cx=g.cx;cam.cy=g.cy;cam.hold=1.2;}return;}
  if(!flick||ev.pointerId!==flick.id)return;const p=s.pointer(ev),a=Math.atan2(p.y-L.sp.y,p.x-L.sp.x),last=flick.pts[flick.pts.length-1];let da=a-last.a;if(da>Math.PI)da-=Math.PI*2;if(da<-Math.PI)da+=Math.PI*2;
  flick.moved+=Math.abs(da);spinA+=da;flick.pts.push({a,t:performance.now(),da});if(flick.pts.length>12)flick.pts.shift();});
 const up=ev=>{if(pan&&ev.pointerId===pan.id){const q=pan;pan=null;s.release?.(ev);if(q.moved<=6)tapTip(s.pointer(ev));return;}
  if(!flick||ev.pointerId!==flick.id)return;s.release?.(ev);const f=flick;flick=null;
  const now=performance.now(),recent=f.pts.filter(q=>now-q.t<110&&q.da!=null),dt=recent.length?(now-recent[0].t+16)/1000:1,da=recent.reduce((a,q)=>a+q.da,0),w=da/dt;
  // a flick sets the speed (a real spinner); a tap or a lazy drag gets a good hard spin
  const w0=Math.abs(w)>4?Math.sign(w)*clamp(Math.abs(w)*1.15,13,36):(Math.random()<.5?-1:1)*(15+Math.random()*14);
  startSpin(w0*(.9+Math.random()*.2),spinA,true);};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',up);
 s.on(c,'wheel',ev=>{if(!L||mode==='options')return;ev.preventDefault();zoomBy(Math.exp(-clamp(ev.deltaY,-120,120)*.004));},{passive:false});
 s.on(window,'keydown',ev=>{if(ev.key==='+'||ev.key==='='){zoomBy(1.5);return;}if(ev.key==='-'){zoomBy(1/1.5);return;}if(ev.key===' '||ev.key==='Enter'){ev.preventDefault();if(mode==='options')return beginGame();if(card||mode==='move'){hurry=true;return;}if(mode==='spin'&&canSpinHere())startSpin((Math.random()<.5?-1:1)*(16+Math.random()*14),spinA,true);}});
 const canSpinHere=()=>!spinPath&&!spinLock&&(!net||cur===me)&&!(cpu&&cur===1)&&winner<0;
 function startSpin(w0,a0,send){if(spinPath||spinLock||mode!=='spin')return;spinLock=true;w0=Math.round(w0*1000)/1000;a0=Math.round(a0*1e4)/1e4;spinPath=simulateSpin(w0,a0,opts.speed);spinT=0;spinA=a0;result=-1;
  if(send&&net)net.send({sp:[w0,a0]});tip=null;}

 // ---- options card (Arcade; board/online use the saved options)
 function optButtons(){const W=s.W,H=s.H,bw=Math.min(320,W*.8),bh=46,x0=(W-bw)/2,y0=H*.46;
  return [{x:x0,y:y0,w:bw,h:bh,label:`Exact spin to finish: ${opts.exact?'ON':'OFF'}`,act:()=>{opts.exact=!opts.exact;save();}},
   {x:x0,y:y0+bh+12,w:bw,h:bh,label:`Spinner & moves: ${opts.speed==='fast'?'FAST':'NORMAL'}`,act:()=>{opts.speed=opts.speed==='fast'?'normal':'fast';save();}},
   {x:x0,y:y0+(bh+12)*2+10,w:bw,h:bh*1.25,label:'DELIVER!',main:true,act:()=>beginGame()}];}
 const save=()=>{try{localStorage.setItem(OPT_KEY,JSON.stringify(opts));}catch{}};
 let started=null;const startP=new Promise(r=>started=r);
 function beginGame(){if(mode!=='options')return;mode='spin';started();}

 // ---- one turn
 async function turn(){const p=P[cur];spinLock=false;cam.man=null;cam.hold=0;banner={txt:`${names[cur].toUpperCase()}'S TURN`,t:1.2};sfx.turn();mode='spin';spinPath=null;result=-1;
  if(cpu&&cur===1){await wait(700+Math.random()*500);startSpin((Math.random()<.5?-1:1)*(15+Math.random()*16),spinA,false);}
  else if(net&&cur!==me){const m=await net.next();if(!m||!s.alive)return false;const [w0,a0]=Array.isArray(m.sp)?m.sp:[20,spinA];startSpin(+w0||20,+a0||0,false);}
  await new Promise(r=>{spinDone=r;});if(!s.alive)return false;
  const n=result+1;p.spins++;hurry=false;
  let to=p.sq+n;
  if(to>100){if(opts.exact){say(`${names[cur]} spun ${n}: needs exactly ${100-p.sq}`);sfx.stuck();banner={txt:`NEED EXACTLY ${100-p.sq}`,t:1.3};await wait(opts.speed==='fast'?500:900);return true;}to=100;}
  say(`${names[cur]} spun ${n}`);mode='move';
  for(let sq=p.sq+1;sq<=to;sq++){await hopTo(p,sq);}
  const lad=LADDERS[to],chu=CHUTES[to];
  if(lad||chu){const ladder=!!lad;card={n:to,ladder,t:0};vibrate(ladder?[15,40,15]:50);await wait(opts.speed==='fast'?1300:2300);card=null;hurry=false;
   const dest=lad||chu;if(ladder){p.ladders++;sfx.climb();await travel(p,to,dest,'ladder');}else{p.chutes++;sfx.slide();await travel(p,to,dest,'chute');}
   say(`${names[cur]}: ${STORIES[to][0]} → ${dest}`);}
  mode='spin';hurry=false;
  if(P[cur].sq>=100){winner=cur;return false;}
  return true;}
 async function hopTo(p,sq){const from={...p.pos};p.sq=sq;const to=spot(p.i,sq),T=opts.speed==='fast'?.11:.2;let k=0;sfx.hop();
  await new Promise(r=>{p.anim=dt=>{k+=dt/(hurry?.03:T);if(k>=1){p.pos=to;p.hop=0;p.anim=null;r();return;}p.pos={x:from.x+(to.x-from.x)*k,y:from.y+(to.y-from.y)*k};p.hop=Math.sin(k*Math.PI)*SQ*.28;};});
  for(const q of P)if(q!==p&&!q.anim)q.pos=spot(q.i,q.sq);}
 async function travel(p,a,b,kind){p.sq=b;const end=spot(p.i,b),pa=squareXY(a),pb=squareXY(b),path=kind==='chute'?chutePath(a,b):null,
  dur=(kind==='chute'?1.4:Math.hypot(pb.x-pa.x,pb.y-pa.y)/SQ*.22+.4)*(opts.speed==='fast'?.55:1);let k=0;
  await new Promise(r=>{p.anim=dt=>{k+=dt/(hurry?.05:dur);const e=kind==='chute'?k*k:(1-Math.cos(Math.min(1,k)*Math.PI))/2;
   if(k>=1){p.pos=end;p.hop=0;p.anim=null;r();return;}
   const q=kind==='chute'?bez(path,e):{x:pa.x+(pb.x-pa.x)*e,y:pa.y+(pb.y-pa.y)*e};p.pos={x:q.x,y:q.y+SQ*.28};p.hop=kind==='ladder'?Math.abs(Math.sin(k*30))*SQ*.06:0;};});
  for(const q of P)if(!q.anim)q.pos=spot(q.i,q.sq);}

 // ---- the frame
 s.frame(dt=>{dt=Math.min(dt,.05);t+=dt;layout();
  if(!s.paused){
   if(spinPath){const steps=Math.round(dt*240*(hurry&&false?4:1));const before=spinA;spinT=Math.min(spinPath.length-1,spinT+steps);spinA=spinPath[spinT];
    if(sectorOf(before)!==sectorOf(spinA))sfx.tick();
    if(spinT>=spinPath.length-1){result=sectorOf(spinA);spinPath=null;const n=result+1,target=Math.min(100,P[cur].sq+n);hi={sq:opts.exact&&P[cur].sq+n>100?-1:target,t:1.2};const r=spinDone;spinDone=null;setTimeout(()=>r?.(),opts.speed==='fast'?250:550);}}
   for(const p of P)p.anim?.(dt);for(const zb of L?.zb||[])if(zb.flash)zb.flash=Math.max(0,zb.flash-dt);
   if(card)card.t+=dt;if(banner){banner.t-=dt;if(banner.t<=0)banner=null;}if(tip){tip.t-=dt;if(tip.t<=0)tip=null;}if(hi){hi.t-=dt;if(hi.t<=0)hi=null;}}
  if(L)camStep(dt);draw();});
 s.debug={get mode(){return mode;},P,cam,get L(){return L;},zoomBy,get cur(){return cur;},get winner(){return winner;},opts,simulateSpin,sectorOf,
  start:()=>beginGame(),spin:(w0=22)=>startSpin(w0,spinA,true),set hurry(v){hurry=!!v;},
  bot:net?()=>{if(mode==='options'){beginGame();return 'start';}if(mode==='spin'&&canSpinHere()){startSpin(18+Math.random()*12,spinA,true);return 'spin';}if(card||mode==='move'){hurry=true;return 'hurry';}return '';}:null};

 // ---- game flow
 if(!await s.pass(0,net?'Strands & Ladders online: take turns flicking the spinner. First porter to Edge Knot City (square 100) wins.':cpu?'Strands & Ladders vs the CPU. Flick the spinner, climb the good deeds, slide down the slips. First to Edge Knot City (100) wins.':'Strands & Ladders: take turns on this phone. Flick the spinner, climb the ladders, dodge the BT tar. First to Edge Knot City (100) wins.','Ready'))return;
 if(board||net)beginGame();
 await startP;
 for(;;){if(!s.alive)return;const go=await turn();if(!go||!s.alive)break;
  if(P.every(p=>p.spins>=SPIN_CAP)){winner=P[0].sq===P[1].sq?-1:P[0].sq>P[1].sq?0:1;break;}
  cur=1-cur;}
 if(!s.alive)return;
 mode='over';if(winner>=0){sfx.win();banner={txt:`${names[winner].toUpperCase()} DELIVERED!`,t:3};vibrate([30,60,30,60,80]);s.react?.(winner,'win');}
 await wait(2200);
 const sc=P.map(p=>p.sq);if(winner>=0)sc[winner]=Math.max(sc[winner],sc[1-winner]+1,100);
 s.finish(sc,`Strands & Ladders · ${names[0]} ${P[0].sq} – ${P[1].sq} ${names[1]} · ladders ${P[0].ladders}/${P[1].ladders}, chutes ${P[0].chutes}/${P[1].chutes}`);

 // ---- drawing
 function draw(){const W=s.W,H=s.H;x.setTransform(1,0,0,1,0,0);D.drawTable(x,W,H);if(!L)return;
  if(mode==='options'){drawOptions();return;}
  const bc=boardLayer(),kz=K(),zoomed=cam.z>1.01;
  if(zoomed){x.save();x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=18;x.shadowOffsetY=6;x.fillStyle='#000';x.fillRect(L.bx,L.by,L.bs,L.bs);x.restore();x.save();x.beginPath();x.rect(L.bx,L.by,L.bs,L.bs);x.clip();D.drawTable(x,s.W,s.H);}
  else{x.save();x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=18;x.shadowOffsetY=6;}
  x.drawImage(bc,sx(0),sy(0),BOARD.S*kz,BOARD.S*kz);if(!zoomed)x.restore();
  // the tar oozes (live shine over the cached board)
  x.save();x.globalAlpha=.5;for(const [a,b] of Object.entries(CHUTES)){const P2=chutePath(+a,b),u=((t*.35+(+a)*.13)%1),q=bez(P2,u);x.fillStyle='rgba(220,210,190,.35)';x.beginPath();x.arc(sx(q.x),sy(q.y),SQ*kz*.07,0,7);x.fill();}x.restore();
  // highlight the landing square when the arrow stops
  if(hi&&hi.sq>0){const q=squareXY(hi.sq);x.save();x.globalAlpha=Math.min(1,hi.t*2)*.8;x.strokeStyle='#ffe07a';x.lineWidth=4;x.shadowColor='#ffe07a';x.shadowBlur=14;x.strokeRect(sx(q.x-SQ/2)+2,sy(q.y-SQ/2)+2,SQ*kz-4,SQ*kz-4);x.restore();}
  // pawns (lower one drawn last)
  const order=[...P].sort((a,b)=>a.pos.y-b.pos.y);
  for(const p of order){const px=sx(p.pos.x),py=sy(p.pos.y),h=Math.max(44,SQ*kz*1.5);const head=D.drawPawn(x,p.i,px,py,h,{lift:p.hop*kz});
   s.sprite(x,p.i,head.x,head.y,head.d,{exact:true,still:true,mood:winner===p.i?'win':card&&cur===p.i?(card.ladder?'happy':'sad'):'normal'});
   if(p.i===cur&&winner<0&&mode!=='over'){x.fillStyle='#ffe07a';x.beginPath();const ay=head.y-head.d*.75+Math.sin(t*6)*3;x.moveTo(px,ay+8);x.lineTo(px-6,ay);x.lineTo(px+6,ay);x.fill();}}
  if(zoomed)x.restore();
  // zoom buttons: small and quiet in the board's corner
  if(mode!=='over')for(const zb of L.zb){const on=zb.flash>0,dis=zb.d<0?cam.z<=1.01&&!cam.man:cam.z>=Z_MAX-.01;x.save();x.globalAlpha=dis?.25:on?.95:.55;
   x.fillStyle='rgba(12,14,16,.78)';x.beginPath();x.arc(zb.x,zb.y,zb.r,0,7);x.fill();x.strokeStyle='rgba(232,226,208,.55)';x.lineWidth=1.2;x.stroke();
   x.strokeStyle='#e8e2d0';x.lineWidth=Math.max(1.6,zb.r*.13);x.lineCap='round';x.beginPath();x.moveTo(zb.x-zb.r*.42,zb.y);x.lineTo(zb.x+zb.r*.42,zb.y);if(zb.d>0){x.moveTo(zb.x,zb.y-zb.r*.42);x.lineTo(zb.x,zb.y+zb.r*.42);}x.stroke();x.restore();}
  // HUD: both porters
  const fs=clamp(Math.min(W,H)*.036,12,18),hw=L.wide?L.hud.w:(L.hud.w-8)/2;
  for(let i=0;i<2;i++){const hx=L.wide?L.hud.x:L.hud.x+i*(hw+8),hy=L.wide?L.hud.y+i*(fs*3.2):L.hud.y,act=i===cur&&winner<0;
   x.fillStyle=act?'rgba(201,162,74,.9)':'rgba(20,24,28,.75)';x.beginPath();x.roundRect(hx,hy,hw,fs*2.7,10);x.fill();
   s.sprite(x,i,hx+fs*1.4,hy+fs*1.35,fs*2.1,{exact:true,still:true,mood:'normal'});
   x.fillStyle=act?'#14120f':'#e8e2d0';x.textAlign='left';x.textBaseline='middle';x.font=`900 ${fs}px "SC Nunito",sans-serif`;
   x.fillText(`${names[i].slice(0,16)}`,hx+fs*2.7,hy+fs*.9);x.font=`700 ${fs*.82}px "SC Nunito",sans-serif`;
   x.fillText(P[i].sq?`Square ${P[i].sq}${board?` · ${Math.max(0,SPIN_CAP-P[i].spins)} spins left`:''}`:'At the start',hx+fs*2.7,hy+fs*1.95);}
  // spinner
  D.drawSpinner(x,L.sp.x,L.sp.y,L.sp.r,spinA);
  const mine=canSpinHere()&&mode==='spin';
  x.textAlign='center';x.textBaseline='middle';x.font=`900 ${fs}px "SC Nunito",sans-serif`;
  const prompt=mode==='over'?'':spinPath?'Spinning…':result>=0&&mode==='spin'&&!mine&&cur>=0?'':mine?'FLICK THE ARROW · or tap it':cpu&&cur===1?`${names[1]} is spinning…`:net&&cur!==me?`${names[cur]}'s turn…`:'';
  if(prompt){x.fillStyle=mine?'#ffe07a':'#e8e2d0';const below=L.sp.y+L.sp.r*1.18+fs*.2;if(L.wide||below<s.H-34)x.fillText(prompt,L.sp.x,below);else{x.textAlign='left';const px2=L.sp.x+L.sp.r*1.25;x.font=`900 ${fs*.9}px "SC Nunito",sans-serif`;const words=prompt.split(' · ');words.forEach((w2,j)=>x.fillText(w2,px2,L.sp.y-fs*.6*(words.length-1)+j*fs*1.2,s.W-px2-8));x.textAlign='center';}}
  if(result>=0&&!spinPath&&mode!=='spin'){x.fillStyle='#fff';x.font=`900 ${fs*1.6}px "SC Bangers","SC Nunito",sans-serif`;x.fillText(String(result+1),Math.min(L.sp.x+L.sp.r*1.25,W-fs*1.2),L.sp.y-L.sp.r*.7);}
  if(mine&&!flick){x.save();x.globalAlpha=.35+.25*Math.sin(t*4);x.strokeStyle='#ffe07a';x.lineWidth=3;x.beginPath();x.arc(L.sp.x,L.sp.y,L.sp.r*1.08,-Math.PI*.8,-Math.PI*.2);x.stroke();x.restore();}
  // log
  x.textAlign='left';x.font=`700 ${fs*.72}px "SC Nunito",sans-serif`;log.forEach((l,j)=>{x.fillStyle=`rgba(232,226,208,${1-j*.3})`;const lx=L.wide?L.log.x:8,ly=L.wide?L.log.y+j*fs:L.by+L.bs+fs*.8+j*fs*.95;if(!L.wide&&lx+x.measureText(l).width>L.sp.x-L.sp.r-8)return;x.fillText(l,lx,ly);});
  // tooltip on a tapped ladder/chute
  if(tip){const ladder=!!LADDERS[tip.n],to=LADDERS[tip.n]||CHUTES[tip.n],q=squareXY(tip.n),px=sx(q.x),py=sy(q.y),kz2=K(),tw=Math.min(W*.7,260),th=fs*3.4,tx=clamp(px-tw/2,6,W-tw-6),ty=py-SQ*kz2*.6-th<6?py+SQ*kz2*.6:py-SQ*kz2*.6-th;
   x.fillStyle='rgba(239,230,207,.97)';x.beginPath();x.roundRect(tx,ty,tw,th,10);x.fill();x.fillStyle='#1d2429';x.textAlign='left';x.font=`800 ${fs*.85}px "SC Nunito",sans-serif`;x.fillText(STORIES[tip.n][0],tx+10,ty+fs*1.05);
   x.fillStyle=ladder?'#7a5a10':'#7a1a2a';x.font=`900 ${fs*.85}px "SC Nunito",sans-serif`;x.fillText(`${ladder?'Ladder up':'Chute down'} to ${to}: ${STORIES[tip.n][1]}`,tx+10,ty+fs*2.3,tw-20);}
  // the event card
  if(card){const cw=Math.min(W*.92,560),k2=Math.min(1,card.t*5);x.save();x.globalAlpha=k2;x.translate(W/2,H/2);x.scale(.8+.2*k2,.8+.2*k2);x.translate(-W/2,-H/2);
   D.drawCard(x,W/2,H/2,cw,card.n,{line1:STORIES[card.n][0],line2:STORIES[card.n][1],ladder:card.ladder});x.restore();}
  if(banner){x.save();x.globalAlpha=Math.min(1,banner.t*3);x.fillStyle='rgba(13,17,20,.85)';const bh=fs*3;x.fillRect(0,L.by+L.bs*.42,W,bh);x.fillStyle='#ffe07a';x.textAlign='center';x.font=`900 ${fs*1.8}px "SC Bangers","SC Nunito",sans-serif`;x.fillText(banner.txt,W/2,L.by+L.bs*.42+bh/2);x.restore();}
  s.setScores?.(P.map(p=>p.sq));}
 function drawOptions(){const W=s.W,H=s.H;D.drawLogo(x,W/2,H*.24,Math.min(W*.92,640));
  const fs=clamp(Math.min(W,H)*.035,12,17);x.fillStyle='#e8e2d0';x.textAlign='center';x.font=`700 ${fs}px "SC Nunito",sans-serif`;
  x.fillText('Deliver your cargo from Capital Knot City to Edge Knot City.',W/2,H*.36);x.fillText('Good deeds climb ladders. Slips slide you down BT tar.',W/2,H*.36+fs*1.4);
  for(const b of optButtons()){x.fillStyle=b.main?'#c9a24a':'rgba(20,24,28,.85)';x.beginPath();x.roundRect(b.x,b.y,b.w,b.h,12);x.fill();x.strokeStyle='#c9a24a';x.lineWidth=2;x.stroke();
   x.fillStyle=b.main?'#14120f':'#e8e2d0';x.font=`900 ${b.main?fs*1.3:fs}px "SC Nunito",sans-serif`;x.textBaseline='middle';x.fillText(b.label,b.x+b.w/2,b.y+b.h/2);}}
}
Object.assign(exports,{strands,simulateSpin,sectorOf});
