// Django Unchained · Bounty Hunter. Saloon-street shooting gallery, 40 seconds each, played at the same time on split
// halves with an identical seeded pattern. Tap outlaws, spare the townsfolk, snipe the big bounty (the rival's face),
// swipe along your gun belt to reload.
const {clamp,seededRandom}=require("src/utils.js");
const K=require("src/engines/tarantinoKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {label,rr,lerp,ease,filmOverlay,flash,titleCard,makeFx,makeShake,sfx,voice,halfPointers,keyboard}=K;

const DURATION=40,AMMO=6,RELOAD=.55;
const QUIPS={bounty:['Dead or alive. Mostly dead.','That one paid for the horse.','Five thousand dollars, easy.'],innocent:['Not the baker!','Town is upset.','Look first!']};

function buildSchedule(seed,slots){
 const rnd=seededRandom(seed+':bounty'),out=[];let t=1.4,bounties=0;const busy=Array(slots).fill(0);
 while(t<DURATION-1){
  const k=t/DURATION,pairs=k>.3&&rnd()<.25?2:1;
  for(let n=0;n<pairs;n++){
   const free=[...Array(slots).keys()].filter(i=>busy[i]<=t);if(!free.length)break;
   const slot=free[Math.floor(rnd()*free.length)],r=rnd();
   let kind=r<.58?'outlaw':r<.82?'innocent':'armored';
   if(kind==='armored'&&k<.3)kind='outlaw';
   if(bounties<5&&k>.12&&rnd()<.09+k*.06&&out.every(o=>o.kind!=='bounty'||t-o.at>4)){kind='bounty';bounties++;}
   const life=kind==='bounty'?1.25:lerp(1.9,1.05,k)*(kind==='armored'?1.2:1)*(.9+rnd()*.25);
   out.push({at:t,slot,kind,life});busy[slot]=t+life+.2;
  }
  t+=lerp(.85,.45,k)*(.75+rnd()*.5);
 }
 return out;
}

async function bounty(s){
 const [c,x]=s.canvas(900,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();s.queueCanvasFit?.();
 const fx=[makeFx(),makeFx()],shake=makeShake(),L={};
 let COLS=0,ROWS=0;
 const layout=()=>{const W=s.W,H=s.H,hw=W/2;if(!COLS){COLS=hw<260?2:3;ROWS=COLS===2?4:3;}
  const top=H*.14,beltY=H*.84,sh=beltY-top-H*.02,cw=(hw-16)/COLS,ch=sh/ROWS;Object.assign(L,{W,H,hw,top,beltY,cw,ch,th:Math.min(ch*1.02,cw*1.3),tw:Math.min(cw*.86,Math.min(ch*1.02,cw*1.3)*.74)});};
 layout();
 const slotXY=(i,slot)=>{const col=slot%COLS,row=Math.floor(slot/COLS);return {x:i*L.hw+8+L.cw*(col+.5),y:L.top+L.ch*(row+1)-L.ch*.06,cx:i*L.hw+8+L.cw*(col+.5),cy:L.top+L.ch*(row+.5)};};
 let sched=buildSchedule(s.seed,COLS*ROWS);
 const mk=i=>({score:0,ammo:AMMO,reload:0,combo:0,hits:0,shots:0,outlaws:0,bounties:0,innocents:0,cursor:0,hurt:0,belt:null,flashMiss:0,note:''});
 const mkItems=()=>[0,1].map(()=>sched.map(o=>({...o,hp:o.kind==='armored'?2:1,hit:null,done:false})));
 let items=mkItems();const P=[mk(0),mk(1)],S={t:0,card:0,phase:'card',over:false,white:0,end:0};
 s.debug={engine:'bounty',P,S,items,sched,slotXY:(i,slot)=>slotXY(i,slot)};
 const active=(it)=>S.t>=it.at&&S.t<=it.at+it.life&&(it.hit===null||S.t-it.hit<.35);
 const up=(it)=>{if(it.hit!==null)return Math.max(0,1-(S.t-it.hit)/.3);const a=S.t-it.at,b=it.at+it.life-S.t;return ease(clamp(Math.min(a/.14,b/.14),0,1));};
 function fire(i,px,py){
  const p=P[i];if(S.phase!=='play')return;
  if(p.reload>0)return;
  if(p.ammo<=0){fx[i].pop(px,py,'CLICK!',{color:'#ffe48a',size:clamp(L.tw*.35,13,24)});sfx.click();p.note='SWIPE THE BELT TO RELOAD';return;}
  p.ammo--;p.shots++;sfx.gun();shake.kick(3);
  let best=null,bd=1e9;
  items[i].forEach((it,k)=>{if(it.hit!==null||!active(it)||up(it)<.35)return;const q=slotXY(i,it.slot),d=Math.hypot(px-q.cx,py-(q.y-L.th*.45));if(d<Math.max(L.tw*.75,28)&&d<bd){bd=d;best=it;}});
  if(!best){p.combo=0;fx[i].spark(px,py,5,'#ffd9a0',160);fx[i].pop(px,py-8,'MISS',{color:'#fff',size:clamp(L.tw*.3,12,20),life:.5});return;}
  const q=slotXY(i,best.slot),tx=q.cx,ty=q.y-L.th*.5;
  best.hp--;fx[i].spark(px,py,8,'#fff2b0',200);
  if(best.hp>0){best.flash=.15;p.score+=3;s.setScores(P.map(a=>a.score));fx[i].pop(tx,ty-L.th*.3,'CLANG +3',{color:'#cfd8de',size:clamp(L.tw*.3,12,20)});sfx.hit();return;}
  best.hit=S.t;const quick=S.t-best.at<.4;
  if(best.kind==='innocent'){p.score=Math.max(0,p.score-20);p.combo=0;p.innocents++;p.hurt=.5;fx[i].pop(tx,ty-L.th*.3,'-20',{color:'#ff6a5a',size:clamp(L.tw*.5,16,30)});fx[i].pop(tx,ty+L.th*.1,QUIPS.innocent[Math.floor(Math.random()*3)],{color:'#ffd0c8',size:clamp(L.tw*.22,9,14),life:1.1});sfx.groan();shake.kick(6);s.react?.(i,'sad');}
  else{const mult=Math.min(4,1+Math.floor(p.combo/4));let pts=best.kind==='bounty'?50:best.kind==='armored'?20:10;pts*=best.kind==='bounty'?1:mult;if(quick&&best.kind!=='bounty')pts+=5;p.score+=pts;p.combo++;p.hits++;
   if(best.kind==='bounty'){p.bounties++;fx[i].confetti(tx,ty,26,['#ffd23f','#fff4a8','#e8b93a']);fx[i].pop(tx,ty-L.th*.4,'BOUNTY! +50',{color:'#ffe14a',size:clamp(L.tw*.45,16,28),life:1.3});sfx.fanfare();s.react?.(i,'win');}
   else{p.outlaws++;fx[i].pop(tx,ty-L.th*.35,'+'+pts+(quick?' ⚡':''),{color:'#fff',size:clamp(L.tw*.42,14,26)});sfx.coin();}
   fx[i].splat(tx,ty,{n:7,speed:130,size:3,color:'#8a5a2a',decal:false});}
  s.setScores(P.map(a=>a.score));
 }
 const down=(i,r)=>{if(r.y>=L.beltY){P[i].belt={id:r.id,x0:r.x,done:false};return;}fire(i,r.x,r.y);};
 const moveBelt=(i,r)=>{const b=P[i].belt;if(!b||b.id!==r.id||b.done)return;if(Math.abs(r.x-b.x0)>L.hw*.18)startReload(i,b);};
 function startReload(i,b){const p=P[i];if(b)b.done=true;if(p.reload>0||p.ammo>=AMMO||S.phase!=='play')return;p.reload=RELOAD;p.note='';sfx.click();for(let k=0;k<AMMO;k++)setTimeout(()=>{if(s.alive)voice(1500+k*70,.03,.02,'square');},k*(RELOAD*1000/AMMO));}
 // vs CPU: gunslinger 2 shoots outlaws after a reaction delay, sometimes plugs a townsperson on Easy, reloads when empty
 const cpu=isCpu(s);let cpuCd=0;
 function cpuThink(){const p=P[1],sk=cpuSkill(s);if(p.reload>0)return;if(p.ammo<=0){startReload(1);return;}if(S.t<cpuCd)return;
  for(const it of items[1]){if(it.hit!==null||!active(it)||it.cpuSeen)continue;if(it.cpuAt===undefined)it.cpuAt=it.at+.28+(1-sk)*.55+Math.random()*.2;if(S.t<it.cpuAt)continue;it.cpuSeen=true;
   if(it.kind==='innocent'&&Math.random()>(1-sk)*.3)continue;if(Math.random()>.7+sk*.28)continue;const q=slotXY(1,it.slot);fire(1,q.cx,q.y-L.th*.45);cpuCd=S.t+.12+(1-sk)*.2;break;}}
 halfPointers(s,{down,move:moveBelt,up:(i,r)=>{if(P[i].belt?.id===r.id)P[i].belt=null;}});
 keyboard(s,(i,name,d)=>{if(!d||S.phase!=='play')return;const p=P[i],n=COLS*ROWS;
  if(name==='act'){const q=slotXY(i,p.cursor);if(p.ammo<=0&&p.reload<=0)startReload(i);else fire(i,q.cx,q.cy-L.th*.45);return;}
  const col=p.cursor%COLS,row=Math.floor(p.cursor/COLS);if(name==='l')p.cursor=row*COLS+(col+COLS-1)%COLS;if(name==='r')p.cursor=row*COLS+(col+1)%COLS;if(name==='u')p.cursor=((row+ROWS-1)%ROWS)*COLS+col;if(name==='d')p.cursor=((row+1)%ROWS)*COLS+col;void n;});
 s.hint('Tap the outlaws (red WANTED posters) the moment they pop up. Do NOT shoot townsfolk (green). The gold poster with your rival\'s face is worth 50! You have 6 bullets: swipe sideways along your gun belt at the bottom of your half to reload. Chain hits for a x4 multiplier. Keys: P1 WASD aim + Space fire/reload, P2 arrows + Enter.');
 if(!await s.pass(0,'Bounty Hunter: forty seconds on the same street, side by side. Shoot outlaws, spare the townsfolk, and cash in the gold poster with your rival\'s face on it. Swipe the belt to reload.','Both ready — saddle up',{countdown:3}))return;
 // the canvas has its real size by now: fix the grid and build the (seeded) pattern
 COLS=0;layout();sched=buildSchedule(s.seed,COLS*ROWS);items=mkItems();s.debug.items=items;s.debug.sched=sched;

 s.frame((dt,tt)=>{
  layout();shake.step(dt);for(const f of fx)f.step(dt);S.white=Math.max(0,S.white-dt*3);
  if(S.phase==='card'){S.card+=dt;if(S.card>=1.9)S.phase='play';}
  else if(S.phase==='play'){S.t+=dt;
   for(let i=0;i<2;i++){const p=P[i];p.hurt=Math.max(0,p.hurt-dt);if(p.reload>0){p.reload-=dt;if(p.reload<=0){p.ammo=AMMO;p.reload=0;}}
    for(const it of items[i])if(!it.done&&it.hit===null&&S.t>it.at+it.life){it.done=true;}}
   if(cpu)cpuThink();
   if(S.t>=DURATION){S.phase='end';S.end=0;sfx.fanfare();}}
  else if(S.phase==='end'){S.end+=dt;if(S.end>2.8&&!S.over){S.over=true;s.finish(P.map(a=>a.score),'Bounty Hunter');}}
  draw(tt);
 });

 function poster(i,it,tt){
  const q=slotXY(i,it.slot),u=up(it);if(u<=0.01)return;const w=L.tw,h=L.th,hit=it.hit!==null;
  x.save();x.beginPath();x.rect(q.cx-L.cw/2,q.cy-L.ch*.55,L.cw,L.ch*1.0+L.ch*.03);x.clip();
  const py=q.y-h*u+(hit?h*.2:0);x.translate(q.cx,py+h*.5);if(hit)x.rotate((i?1:-1)*(1-u)*.5);else x.rotate(Math.sin(tt*9+it.slot)*.01);
  const flashW=it.flash>0;it.flash=Math.max(0,(it.flash||0)-.016);
  x.fillStyle='#6a4a2c';x.fillRect(-w*.04,h*.2,w*.08,h*.5);
  const col=it.kind==='bounty'?'#e8c040':it.kind==='innocent'?'#5fa86a':'#c2443a';
  x.fillStyle=flashW?'#fff':it.kind==='bounty'?'#f7e4a0':'#e9d9b4';rr(x,-w/2,-h/2,w,h*.92,w*.06);x.fill();x.fillStyle=col;rr(x,-w/2,-h/2,w,h*.2,w*.06);x.fill();
  x.strokeStyle='#4a3520';x.lineWidth=2;rr(x,-w/2,-h/2,w,h*.92,w*.06);x.stroke();
  label(x,it.kind==='innocent'?'TOWN':it.kind==='bounty'?'$5000':'WANTED',0,-h*.4,Math.max(8,w*.17),{fill:'#fff',stroke:null});
  const fy=-h*.04,fr=w*.28;
  if(it.kind==='bounty'){s.sprite(x,1-i,0,fy,fr*2.3,{exact:true,mood:'angry'});x.strokeStyle='#e8b93a';x.lineWidth=3;x.beginPath();x.arc(0,fy,fr*1.25,0,6.3);x.stroke();label(x,'DEAD OR ALIVE',0,h*.32,Math.max(7,w*.1),{fill:'#5a3a10',stroke:null});}
  else{
   x.fillStyle='#e0b894';x.beginPath();x.arc(0,fy,fr,0,6.3);x.fill();
   if(it.kind==='innocent'){x.fillStyle='#d8b25a';x.beginPath();x.ellipse(0,fy-fr*.7,fr*1.5,fr*.35,0,0,6.3);x.fill();x.beginPath();x.arc(0,fy-fr*.8,fr*.7,Math.PI,6.3);x.fill();x.fillStyle='#222';x.beginPath();x.arc(-fr*.35,fy-fr*.05,fr*.09,0,6.3);x.arc(fr*.35,fy-fr*.05,fr*.09,0,6.3);x.fill();x.strokeStyle='#222';x.lineWidth=2;x.beginPath();x.arc(0,fy+fr*.15,fr*.4,.2,Math.PI-.2);x.stroke();label(x,'DON\'T!',0,h*.32,Math.max(7,w*.12),{fill:'#2f6a3a',stroke:null});}
   else{x.fillStyle='#161212';x.beginPath();x.ellipse(0,fy-fr*.75,fr*1.5,fr*.3,0,0,6.3);x.fill();x.beginPath();x.arc(0,fy-fr*.85,fr*.75,Math.PI,6.3);x.fill();x.fillStyle='#a02a22';x.beginPath();x.moveTo(-fr,fy+fr*.1);x.lineTo(fr,fy+fr*.1);x.lineTo(0,fy+fr*1.1);x.closePath();x.fill();x.fillStyle='#111';x.fillRect(-fr*.6,fy-fr*.25,fr*.45,fr*.18);x.fillRect(fr*.15,fy-fr*.25,fr*.45,fr*.18);x.strokeStyle='#111';x.lineWidth=2.5;x.beginPath();x.moveTo(-fr*.7,fy-fr*.38);x.lineTo(-fr*.1,fy-fr*.28);x.moveTo(fr*.7,fy-fr*.38);x.lineTo(fr*.1,fy-fr*.28);x.stroke();
    if(it.kind==='armored'){x.fillStyle='#8b96a0';rr(x,-w*.3,h*.18,w*.6,h*.2,4);x.fill();for(let k=0;k<2;k++){x.fillStyle=k<it.hp?'#ff6a5a':'#ffffff40';x.beginPath();x.arc((k-.5)*w*.2,h*.28,w*.05,0,6.3);x.fill();}}
    else label(x,'$'+(100+it.slot*50),0,h*.32,Math.max(7,w*.12),{fill:'#7a2a22',stroke:null});}
  }
  if(hit){x.fillStyle='#000a';x.beginPath();x.arc(w*.1,0,w*.07,0,6.3);x.fill();}
  x.restore();
 }
 function draw(tt){
  const {W,H,hw}=L;x.save();shake.apply(x);
  for(let i=0;i<2;i++){
   x.save();x.beginPath();x.rect(i*hw,0,hw,H);x.clip();
   const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#c9915a');bg.addColorStop(.3,'#e3c08a');bg.addColorStop(1,'#8a6a44');x.fillStyle=bg;x.fillRect(i*hw,0,hw,H);
   // building fronts
   x.fillStyle='#6a4a30';x.fillRect(i*hw+4,L.top-H*.02,hw-8,L.beltY-L.top+H*.02);x.strokeStyle='#4a3220';x.lineWidth=1;for(let k=1;k<12;k++){x.beginPath();x.moveTo(i*hw+4,L.top+k*H*.06);x.lineTo(i*hw+hw-4,L.top+k*H*.06);x.stroke();}
   x.fillStyle='#4a3020';x.fillRect(i*hw+4,L.top-H*.02,hw-8,H*.025);
   label(x,i?'LONE PINE SALOON':'DODGE CITY BANK',i*hw+hw/2,L.top-H*.005,clamp(hw*.042,8,15),{fill:'#e8d9a8',stroke:null});
   for(let slot=0;slot<COLS*ROWS;slot++){const q=slotXY(i,slot),row=Math.floor(slot/COLS),fw=L.cw*.92,fh=L.ch*.9;
    x.fillStyle='#1a0f08';rr(x,q.cx-fw/2,q.cy-fh*.5,fw,fh,6);x.fill();x.strokeStyle='#8a6a40';x.lineWidth=3;rr(x,q.cx-fw/2,q.cy-fh*.5,fw,fh,6);x.stroke();void row;}
   for(const it of items[i])if(active(it)||(it.hit!==null&&S.t-it.hit<.35))poster(i,it,tt);
   // ledges (front of each slot)
   for(let slot=0;slot<COLS*ROWS;slot++){const q=slotXY(i,slot),fw=L.cw*.92,fh=L.ch*.9;x.fillStyle='#7a5632';x.fillRect(q.cx-fw/2-2,q.cy+fh*.5-L.ch*.1,fw+4,L.ch*.12);x.fillStyle='#00000030';x.fillRect(q.cx-fw/2-2,q.cy+fh*.5-L.ch*.02,fw+4,L.ch*.04);}
   fx[i].drawDecals(x);fx[i].draw(x);
   const p=P[i];
   if(p.hurt>0){x.fillStyle=`rgba(220,40,30,${p.hurt*.5})`;x.fillRect(i*hw,0,hw,H);}
   // keyboard cursor
   if(S.phase==='play'){const q=slotXY(i,p.cursor);x.strokeStyle='#ffffff55';x.setLineDash([4,6]);x.lineWidth=2;rr(x,q.cx-L.cw*.46,q.cy-L.ch*.45,L.cw*.92,L.ch*.9,6);x.stroke();x.setLineDash([]);}
   // gun belt
   x.fillStyle='#3a2414';x.fillRect(i*hw,L.beltY,hw,H-L.beltY);x.fillStyle='#5a3a20';x.fillRect(i*hw,L.beltY+3,hw,H*.012);
   const bs=Math.min((hw-24)/AMMO,(H-L.beltY)*.55),bx0=i*hw+hw/2-bs*AMMO/2;
   for(let k=0;k<AMMO;k++){const have=p.reload>0?k<p.ammo||(p.reload<RELOAD*(1-k/AMMO)):k<p.ammo;x.fillStyle=have?'#d8a93a':'#00000055';rr(x,bx0+k*bs+bs*.2,L.beltY+(H-L.beltY)*.2,bs*.6,(H-L.beltY)*.5,bs*.2);x.fill();if(have){x.fillStyle='#e8d98a';x.fillRect(bx0+k*bs+bs*.3,L.beltY+(H-L.beltY)*.24,bs*.12,(H-L.beltY)*.3);}}
   const fs=clamp(Math.min(W,H*1.4)*.03,11,20);
   label(x,p.reload>0?'RELOADING…':p.ammo<=0?'◀  SWIPE BELT TO RELOAD  ▶':p.note||'',i*hw+hw/2,H-(H-L.beltY)*.15,fs*.7,{fill:p.ammo<=0?'#ffe48a':'#fff',stroke:'#000',alpha:p.ammo<=0?.7+.3*Math.sin(tt*8):.8});
   label(x,String(p.score),i*hw+hw/2,H*.045,fs*1.8,{fill:i?'#ffd0e4':'#cfe4ff',stroke:'#000'});
   label(x,p.combo>=4?`×${Math.min(4,1+Math.floor(p.combo/4))} streak ${p.combo}`:`streak ${p.combo}`,i*hw+hw/2,H*.045+fs*1.5,fs*.7,{fill:'#fff3b9',stroke:'#000'});
   x.restore();}
  x.fillStyle='#000';x.fillRect(hw-2,0,4,H);
  const left=Math.max(0,DURATION-S.t);label(x,String(Math.ceil(left)),W/2,H*.05,clamp(W*.035,16,28),{fill:'#fff3b9',stroke:'#000'});
  x.restore();
  if(S.phase==='end'){x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,H*.38,W,H*.22);const a=P[0].score,b=P[1].score;label(x,'TIME!',W/2,H*.45,clamp(W*.06,22,48),{fill:'#ffe48a',stroke:'#000'});label(x,a===b?'A DEAD HEAT':`${s.players[a>b?0:1].name} COLLECTS THE BOUNTY`,W/2,H*.54,clamp(W*.03,13,26),{fill:'#fff',stroke:'#000'});}
  if(S.phase==='card')titleCard(x,W,H,S.card,{chapter:8,title:'THE BOUNTY HUNTER',sub:'outlaws yes · townsfolk no · gold poster = jackpot',life:1.9});
  else filmOverlay(x,W,H,tt,{grain:.3,vignette:.4});
  s.setScores(P.map(a=>a.score));s.status(`${s.players[0].name} ${P[0].score} · ${s.players[1].name} ${P[1].score} · ${Math.ceil(Math.max(0,DURATION-S.t))}s left`);
 }
}
Object.assign(exports,{bounty,buildSchedule});
