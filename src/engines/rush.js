// Microgame Rush (WarioWare, Nintendo): both humans play the same 4-8 s microgame at once on split halves.
// Landscape: left/right. Portrait: top/bottom, the top half rotated so the player across the table can read it.
const {clamp, seededRandom, shuffle}=require("src/utils.js");
const {sound, tone, vibrate}=require("src/audio.js");
const R=require("src/engines/rushCore.js");
const {GAMES_A}=require("src/engines/rushGamesA.js");
const {GAMES_B}=require("src/engines/rushGamesB.js");
const {GAMES_C}=require("src/engines/rushGamesC.js");
const {COL, txt, circ, rrect, poly, star, rays, easeOutBack, easeOut, TAU}=R;
const MICROGAMES=[...GAMES_A,...GAMES_B,...GAMES_C];
const BOSS_NAMES=['BOSS!'];
const VERB_FLASH=[COL.red,COL.blue,COL.green,COL.purple,COL.orange,COL.pink];

function layout(W,H){
 const portrait=W<H*.92,gap=Math.max(5,Math.round(Math.min(W,H)*.012));let rects;
 if(portrait){const h=Math.floor((H-gap)/2);rects=[{x:0,y:0,w:W,h,rot:true},{x:0,y:H-h,w:W,h,rot:false}];}
 else{const w=Math.floor((W-gap)/2);rects=[{x:0,y:0,w,h:H,rot:false},{x:W-w,y:0,w,h:H,rot:false}];}
 for(const r of rects)r.hd=clamp(Math.round(r.h*.1),24,38);
 return {portrait,rects};
}
const speedFor=(round,boss)=>{const sp=Math.min(1.6,1+.15*Math.floor(round/3));return boss?Math.max(1,sp-.1):sp;};

function rushTimeline(rounds){return Array.from({length:rounds},(_,i)=>({boss:(i+1)%6===0,speedUp:i>0&&i%3===0}));}

async function rush(s){
 const opt=s.game.rush||{},rounds=opt.rounds||12,theme=opt.theme||null;
 const [c,x]=s.canvas(900,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 const pool=MICROGAMES.filter(g=>!theme||g.theme===theme),timeline=rushTimeline(rounds);
 R.hooks.head=(cx,p,px,py,size,mood)=>s.sprite(cx,p,px,py,size,{exact:true,mood});
 const SFX={win:'win',lose:'lose',shot:'shot',rare:'rare',pickup:'pickup',tap:'tap',tick:'tick'};
 R.hooks.sfx=n=>sound(SFX[n]||'tap');s.cleanup(()=>{R.hooks.head=()=>{};R.hooks.sfx=()=>{};});
 s.hint('Two players, one screen, same microgame at the same time. Landscape: P1 plays the left half, P2 the right. Portrait: P1 top (upside down for the player across the table), P2 bottom. Read the one-word order, then tap, drag, swipe or scrub before the fuse burns out. First to finish scores 2, second scores 1. Every 3rd round the tempo jumps; every 6th round is a longer BOSS worth double. Desktop: P1 WASD + Space, P2 arrows + Enter move a cursor and click.');
 const scores=[0,0],seen=new Set(),used=new Set(),H=[0,1].map(i=>({i,st:null,res:null,at:0,pts:0,ripples:[],cursor:{x:0,y:0,on:false,down:false,was:false},lastSz:''}));
 let phase='intro',pt=0,round=-1,cur=null,curBoss=false,curSpeed=1,dur=5,endAt=Infinity,lastKind='',lastTick=-1,forced=null,bannerKind='',sudden=0,lay=layout(s.W,s.H),finalText='';
 const total=()=>rounds+sudden;
 const hl=i=>lay.rects[i];
 const playRect=i=>({w:hl(i).w,h:hl(i).h-hl(i).hd});
 function choose(boss){
  if(forced){const g=MICROGAMES.find(m=>m.id===forced);forced=null;if(g)return g;}
  let cands=pool.filter(g=>!used.has(g.id)&&(!boss||g.boss));if(!cands.length){for(const g of pool)if(!boss||g.boss)used.delete(g.id);cands=pool.filter(g=>!boss||g.boss);}if(!cands.length)cands=pool;
  const nice=cands.filter(g=>g.kind!==lastKind);const list=nice.length?nice:cands;return list[Math.floor(s.random()*list.length)];
 }
 function startPlay(){
  phase='play';pt=0;const g=cur;const first=!seen.has(g.verb);seen.add(g.verb);const seed=Math.floor(s.random()*1e9);
  dur=(curBoss?(g.bossDuration||8):g.duration)/(1+(curSpeed-1)*.5);endAt=Infinity;lastTick=-1;
  for(const h of H){const rg=seededRandom(seed),r=playRect(h.i);h.rect=r;h.st=g.init(r,rg,curSpeed,h.i,curBoss);Object.assign(h.st,{g,player:h.i,r,rng:rg,speed:curSpeed,boss:curBoss,t:0,result:undefined});h.res=null;h.pts=0;h.at=0;h.ripples=[];h.first=first;h.cursor={x:r.w/2,y:r.h/2,on:h.cursor.on,down:false,was:false};h.sig=r.w+'x'+r.h;}
  const base=curBoss?392:523;tone(base,.07,.05,'square');setTimeout(()=>{if(s.alive)tone(base*1.25,.07,.05,'square');},85);setTimeout(()=>{if(s.alive)tone(base*1.5,.1,.05,'square');},170);
 }
 function beginRound(){
  round++;const tl=timeline[round]||{boss:false,speedUp:false};const isSudden=round>=rounds;curBoss=!isSudden&&tl.boss;curSpeed=isSudden?1.3:speedFor(round,curBoss);
  cur=choose(curBoss);used.add(cur.id);lastKind=cur.kind;
  bannerKind=curBoss?'boss':isSudden?'sudden':tl.speedUp?'speed':'';
  if(bannerKind){phase='banner';pt=0;if(bannerKind==='speed')for(let i=0;i<5;i++)setTimeout(()=>{if(s.alive)tone(300+i*90,.06,.05,'sawtooth');},i*60);else{tone(110,.25,.08,'sawtooth');setTimeout(()=>{if(s.alive)tone(98,.4,.08,'sawtooth');},260);}}
  else startPlay();
 }
 function settle(i,res,at){
  const h=H[i],o=H[1-i],base=curBoss?2:1;h.res=res;h.at=at;
  if(res==='win'){let pts=2*base;if(o.res==='win'&&at-o.at>.03)pts=1*base;h.pts=pts;scores[i]+=pts;s.setScores([...scores]);sound(pts>=2*base?'win':'pickup');vibrate(18);s.react(i,'happy');}
  else{sound('lose');s.react(i,'sad');}
 }
 function toLocal(p,i){const r=hl(i);return r.rot?{x:r.x+r.w-p.x,y:r.y+r.h-p.y-r.hd}:{x:p.x-r.x,y:p.y-r.y-r.hd};}
 const ownerOf=p=>lay.portrait?(p.y<s.H/2?0:1):(p.x<s.W/2?0:1);
 const fingers=new Map();
 function deliver(i,type,lp,id){const h=H[i];if(phase!=='play'||h.res||!h.st)return;const g=h.st.g;if(type==='down'){h.ripples.push({x:lp.x,y:lp.y,t:0});}g[type]?.(h.st,lp,id);}
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev),i=ownerOf(p);let n=0;for(const v of fingers.values())if(v===i)n++;if(n>=3)return;fingers.set(ev.pointerId,i);s.capture(ev);H[i].cursor.on=false;deliver(i,'down',toLocal(p,i),ev.pointerId);});
 s.on(c,'pointermove',ev=>{const i=fingers.get(ev.pointerId);if(i===undefined||s.paused||!s.alive)return;ev.preventDefault();deliver(i,'move',toLocal(s.pointer(ev),i),ev.pointerId);});
 const up=ev=>{const i=fingers.get(ev.pointerId);if(i===undefined)return;fingers.delete(ev.pointerId);s.release(ev);deliver(i,'up',toLocal(s.pointer(ev),i),ev.pointerId);};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',up);s.resetOnPause(()=>fingers.clear());
 // Keyboard: virtual cursor per half. P1 WASD+Space, P2 arrows+Enter.
 const KEYMAP={w:[0,'u'],s:[0,'d'],a:[0,'l'],d:[0,'r'],' ':[0,'f'],arrowup:[1,'u'],arrowdown:[1,'d'],arrowleft:[1,'l'],arrowright:[1,'r'],enter:[1,'f']},keys=[{},{}];
 for(const type of ['keydown','keyup'])s.on(document,type,ev=>{const b=KEYMAP[ev.key.toLowerCase()];if(!b)return;ev.preventDefault();if(s.paused||!s.alive)return;keys[b[0]][b[1]]=type==='keydown';if(type==='keydown')H[b[0]].cursor.on=true;});
 function pumpKeys(dt){for(const h of H){const k=keys[h.i],cu=h.cursor,r=h.rect;if(!r||!cu.on)continue;const sp=Math.min(r.w,r.h)*1.1*dt;
  const dx=(k.r?1:0)-(k.l?1:0),dy=(k.d?1:0)-(k.u?1:0);if(dx||dy){cu.x=clamp(cu.x+dx*sp,0,r.w);cu.y=clamp(cu.y+dy*sp,0,r.h);if(cu.was&&phase==='play'&&!h.res)h.st.g.move?.(h.st,{x:cu.x,y:cu.y},'k'+h.i);}
  const f=!!k.f;if(f&&!cu.was){cu.was=true;deliver(h.i,'down',{x:cu.x,y:cu.y},'k'+h.i);}else if(!f&&cu.was){cu.was=false;deliver(h.i,'up',{x:cu.x,y:cu.y},'k'+h.i);}}}

 // ------------------------------------------------------------------ drawing per half
 const FONT_SM=px=>`900 ${Math.round(px)}px "Arial Black",Impact,Arial,sans-serif`;
 function fuse(g,w,hd,frac,label,boss,t){
  g.fillStyle=boss?'#3a0d12':COL.ink;g.fillRect(0,0,w,hd);const cy=hd/2,x0=hd*.95,chipW=hd*2.3,x1=w-chipW-hd*.3,th=hd*.36;
  rrect(g,x0,cy-th/2,x1-x0,th,th/2,'#3b3358',0);const len=(x1-x0)*clamp(frac,0,1);
  if(len>2){rrect(g,x0,cy-th/2,len,th,th/2,frac>.5?COL.green:frac>.25?COL.yellow:COL.red,0);}
  circ(g,hd*.5,cy,hd*.3,'#333',3);circ(g,hd*.42,cy-hd*.07,hd*.08,'#999',0);g.strokeStyle=COL.orange;g.lineWidth=3;g.beginPath();g.moveTo(hd*.5,cy-hd*.3);g.quadraticCurveTo(hd*.6,cy-hd*.5,hd*.82,cy-hd*.3);g.stroke();
  star(g,x0+len,cy,th*(.9+.25*Math.sin(t*40)),th*.4,6,t*8,frac>.25?COL.yellow:COL.white,2);
  txt(g,label,w-chipW/2-hd*.1,cy,hd*.42,boss?COL.orange:COL.white,{lw:3});}
 function wordOverlay(g,r,verb,t,g0,i){
  if(t>.95)return;const u=Math.min(r.w,r.h),a=t<.65?1:1-(t-.65)/.3,sc=easeOutBack(t/.22)*(1+(t>.65?(t-.65)*1.4:0)),size=Math.min(u*.3,r.w*.9/(verb.length*.62));
  g.save();g.globalAlpha=clamp(a,0,1);g.translate(r.w/2,r.h*.5);g.rotate(-.05+Math.sin(t*14)*.015);g.scale(sc,sc);
  g.fillStyle=VERB_FLASH[(Math.floor(t*14)+i+round)%VERB_FLASH.length];g.fillRect(-r.w,-size*.85,r.w*2,size*1.7);g.fillStyle=COL.ink;g.fillRect(-r.w,-size*.85-4,r.w*2,4);g.fillRect(-r.w,size*.85,r.w*2,4);
  txt(g,verb,0,0,size,COL.yellow,{lw:size*.22});g.restore();}
 function stamp(g,r,h,t,boss){
  const u=Math.min(r.w,r.h),win=h.res==='win',sc=easeOutBack(t/.22);if(sc<=0)return;g.save();g.translate(r.w/2,r.h*.46+(win?0:Math.sin(t*50)*(t<.5?3:0)));g.rotate(win?-.1:.08);g.scale(sc,sc);
  star(g,0,0,u*.5,u*.34,win?14:10,t*(win?.6:.2),win?COL.yellow:'#7a1b22',5);txt(g,win?'NICE!':'OOPS!',0,-u*.02,u*.2,win?COL.green:COL.red,{lw:u*.04});
  if(h.pts)txt(g,'+'+h.pts,0,u*.16,u*.12,COL.white);else txt(g,'0',0,u*.16,u*.1,COL.white);g.restore();}
 function caption(g,r,text,t){
  const u=Math.min(r.w,r.h),fs=clamp(u*.07,11,19);g.font=FONT_SM(fs);const w=Math.min(r.w-12,g.measureText(text).width+fs*1.6),k=easeOut(t/.25),y=r.h-fs*1.2-6+(1-k)*fs*3;
  rrect(g,(r.w-w)/2,y-fs*.8,w,fs*1.6,fs*.8,COL.white,3);g.fillStyle=COL.ink;g.textAlign='center';g.textBaseline='middle';g.fillText(text,r.w/2,y);}
 function drawIntro(g,r,i,t){
  const u=Math.min(r.w,r.h);g.fillStyle=VERB_FLASH[Math.floor(t*6)%VERB_FLASH.length];g.fillRect(0,0,r.w,r.h);g.save();g.globalAlpha=.25;rays(g,r.w/2,r.h/2,Math.hypot(r.w,r.h),16,t*.8,'#fff');g.restore();
  const k1=easeOutBack((t-.1)/.35),k2=easeOutBack((t-.45)/.35),size=Math.min(u*.2,r.w*.9/9*1.5);
  g.save();g.translate(r.w/2-(1-clamp(k1,0,1))*r.w,r.h*.32);g.rotate(-.06);g.scale(k1,k1);txt(g,'MICROGAME',0,0,size,COL.yellow,{lw:size*.22});g.restore();
  g.save();g.translate(r.w/2+(1-clamp(k2,0,1))*r.w,r.h*.5);g.rotate(.05+Math.sin(t*9)*.02);g.scale(k2*(1+Math.sin(t*10)*.03),k2*(1+Math.sin(t*10)*.03));txt(g,'RUSH!',0,0,size*1.7,COL.white,{lw:size*.3});g.restore();
  if(t>.8){const hs=u*.3,by=Math.abs(Math.sin(t*6))*u*.05;R.head(g,i,r.w*.3,r.h*.8-by,hs,'happy');R.head(g,1-i,r.w*.7,r.h*.8-by,hs,'angry');txt(g,'VS',r.w/2,r.h*.8,u*.12,COL.white);}
  if(t>1.2)txt(g,'FIRST TO FINISH WINS',r.w/2,r.h*.14,Math.min(u*.075,r.w*.06),COL.white,{lw:5});}
 function drawBanner(g,r,i,t){
  const u=Math.min(r.w,r.h),boss=bannerKind==='boss',sd=bannerKind==='sudden';g.fillStyle=boss?'#2a0710':sd?'#101030':'#0e2a5a';g.fillRect(0,0,r.w,r.h);
  g.save();g.globalAlpha=.5;rays(g,r.w/2,r.h/2,Math.hypot(r.w,r.h),18,t*(boss?-1.2:2.2),boss?COL.red:sd?COL.purple:COL.orange);g.restore();
  const k=easeOutBack(t/.25),shake=boss?Math.sin(t*60)*3:0;const word=boss?'BOSS!':sd?'SUDDEN DEATH':'SPEED UP!',size=Math.min(u*(boss?.34:.24),r.w*.92/(word.length*.6));
  g.save();g.translate(r.w/2+shake,r.h*.45);g.rotate(boss?0:-.05);g.scale(k,k);txt(g,word,0,0,size,boss?COL.red:COL.yellow,{lw:size*.22});g.restore();
  if(boss)txt(g,'DOUBLE POINTS',r.w/2,r.h*.7,u*.1,COL.white);else if(sd)txt(g,'TIED! ONE MORE',r.w/2,r.h*.7,u*.09,COL.white);else{txt(g,'TEMPO ×'+curSpeed.toFixed(2),r.w/2,r.h*.7,u*.1,COL.white);
   for(let n=0;n<3;n++){const ax=r.w*.5+(n-1)*u*.2+((t*r.w*.6)%(u*.2))-u*.1;poly(g,[[ax,r.h*.84],[ax-u*.07,r.h*.78],[ax-u*.07,r.h*.9]],COL.yellow,3);}}}
 function drawFinal(g,r,i,t){
  const u=Math.min(r.w,r.h),win=scores[i]>scores[1-i],tie=scores[0]===scores[1];g.fillStyle=win?'#12306a':tie?'#2b2146':'#3a1530';g.fillRect(0,0,r.w,r.h);
  g.save();g.globalAlpha=win?.4:.15;rays(g,r.w/2,r.h*.4,Math.hypot(r.w,r.h),16,t*.7,win?COL.yellow:'#fff');g.restore();
  const k=easeOutBack(t/.4);R.head(g,i,r.w/2,r.h*.4-(win?Math.abs(Math.sin(t*6))*u*.05:0),u*.42*k,win?'happy':tie?'normal':'sad');
  txt(g,win?'WINNER!':tie?'DRAW!':'NEXT TIME',r.w/2,r.h*.7,Math.min(u*.17,r.w*.9/(win?7:9)*1.5),win?COL.yellow:COL.white,{lw:u*.04});txt(g,String(scores[i]),r.w/2,r.h*.9,u*.14,COL.white);
  if(win)for(let n=0;n<14;n++){const a=n*2.4,px=r.w/2+Math.sin(a*3+t*1.4)*r.w*.45,py=((t*u*.6+n*u*.2)%r.h);g.fillStyle=VERB_FLASH[n%6];g.fillRect(px,py,u*.04,u*.07);}}
 function drawPlay(g,h,t,rect,i){
  const r=h.rect,st=h.st,gm=st.g,u=Math.min(r.w,r.h);
  g.save();g.translate(0,rect.hd);g.beginPath();g.rect(0,0,r.w,r.h);g.clip();
  gm.draw(g,st,r);
  if(h.res==='lose'){g.fillStyle='rgba(20,10,30,.28)';g.fillRect(0,0,r.w,r.h);}
  for(const rp of h.ripples){const k=rp.t/.28;if(k<1){g.globalAlpha=1-k;g.lineWidth=4;g.strokeStyle=COL.white;g.beginPath();g.arc(rp.x,rp.y,u*.04+k*u*.12,0,TAU);g.stroke();g.globalAlpha=1;}}
  if(h.first&&pt>.3&&pt<.9&&!h.res)R.drawHint(g,gm.hint?.(st),(pt-.3)/.6);
  if(h.cursor.on&&phase==='play'&&!h.res){const cu=h.cursor;g.lineWidth=3;g.strokeStyle=COL.ink;g.fillStyle=cu.was?COL.yellow:COL.white;g.beginPath();g.arc(cu.x,cu.y,u*.035,0,TAU);g.fill();g.stroke();g.beginPath();g.moveTo(cu.x-u*.07,cu.y);g.lineTo(cu.x+u*.07,cu.y);g.moveTo(cu.x,cu.y-u*.07);g.lineTo(cu.x,cu.y+u*.07);g.stroke();}
  if(pt<.95)wordOverlay(g,r,gm.verb,pt,gm,i);
  if(h.res)stamp(g,r,h,pt-h.at,curBoss);
  if(phase==='result'||H.every(o=>o.res))caption(g,r,gm.caption,phase==='result'?pt:Math.max(0,pt-endAt+.3));
  g.restore();
 }
 function render(){
  x.fillStyle=COL.ink;x.fillRect(0,0,s.W,s.H);
  for(const h of H){const rect=hl(h.i);x.save();x.beginPath();x.rect(rect.x,rect.y,rect.w,rect.h);x.clip();if(rect.rot){x.translate(rect.x+rect.w,rect.y+rect.h);x.rotate(Math.PI);}else x.translate(rect.x,rect.y);
   const loc={w:rect.w,h:rect.h};
   if(phase==='intro')drawIntro(x,loc,h.i,pt);else if(phase==='banner')drawBanner(x,loc,h.i,pt);else if(phase==='final')drawFinal(x,loc,h.i,pt);
   else if(h.st){drawPlay(x,h,pt,rect,h.i);const frac=phase==='play'?1-pt/dur:0;fuse(x,rect.w,rect.hd,frac,curBoss?'BOSS':`${Math.min(round+1,total())}/${total()}`,curBoss,performance.now()/1000);}
   x.restore();}
 }
 let lastSig='';
 s.debug={engine:'rush',halves:H,scores,get phase(){return phase;},get game(){return cur;},get round(){return round;},get speed(){return curSpeed;},get dur(){return dur;},get pt(){return pt;},force(id,boss){forced=id;if(boss!==undefined)timeline[round+1]={boss,speedUp:false};},skipIntro(){if(phase==='intro')pt=99;},layout:()=>lay,pool:()=>pool.map(g=>g.id)};
 function step(dt){
  pt+=dt;
  if(phase==='intro'){if(pt>2.5)beginRound();return;}
  if(phase==='banner'){if(pt>(bannerKind==='boss'?1.35:1))startPlay();return;}
  if(phase==='final'){if(pt>3.2){s.finish([...scores],finalText);}return;}
  const sig=lay.rects.map(r=>r.w+'x'+r.h).join();
  if(sig!==lastSig){if(lastSig&&phase==='play'&&!H.some(h=>h.res)&&pt<dur-.5){const p0=pt;startPlay();pt=Math.min(p0,.6);}lastSig=sig;}
  pumpKeys(dt);
  for(const h of H){if(!h.st)continue;for(const rp of h.ripples)rp.t+=dt;h.ripples=h.ripples.filter(rp=>rp.t<.3);h.st.t+=dt;h.st.g.update(h.st,dt);if(phase==='play'&&!h.res&&h.st.result)settle(h.i,h.st.result,pt);}
  if(phase==='play'){
   const left=dur-pt;if(left<1.3&&left>0){const n=Math.floor(left*3);if(n!==lastTick){lastTick=n;if(!H.every(h=>h.res))sound('tick');}}
   if(pt>=dur){for(const h of H)if(!h.res){const res=h.st.g.timeout==='win'?'win':'lose';h.st.result=h.st.result||res;settle(h.i,h.st.result,dur);}}
   if(H.every(h=>h.res)){if(endAt===Infinity)endAt=pt+.35;if(pt>=endAt){phase='result';pt=0;}}
  }else if(phase==='result'){
   if(pt>(curBoss?1.5:1.15)){
    if(round+1<rounds||(round+1>=rounds&&scores[0]===scores[1]&&sudden<2)){if(round+1>=rounds)sudden++;beginRound();}
    else{phase='final';pt=0;const a=scores[0],b=scores[1];finalText=a===b?`Microgame Rush: a ${a}-${b} draw`:`Microgame Rush: ${s.players[a>b?0:1].name} wins ${Math.max(a,b)}-${Math.min(a,b)}`;sound('win');}
   }
  }
 }
 if(!await s.pass(0,'Microgame Rush: one-word orders, 4 second microgames, both of you at once. Landscape: left half is Player 1, right half is Player 2. Portrait: Player 1 is the upside-down top half. First to finish scores 2, second scores 1.','Both ready',{countdown:3}))return;
 sound('start');for(let i=0;i<6;i++)setTimeout(()=>{if(s.alive)tone([523,659,784,1047,784,1047][i],.09,.05,'square');},i*110);
 s.frame(dt=>{lay=layout(s.W,s.H);step(dt);if(!s.alive)return;render();s.status(`${s.players[0].name} ${scores[0]} · ${s.players[1].name} ${scores[1]}`+(phase==='play'||phase==='result'?` · ${cur.verb.replace('!','')}`:''));});
}
Object.assign(exports,{rush,MICROGAMES,layout,speedFor});
