// Review · "Pancakes, Divorce, Pancakes". A two-player eating contest on one phone, both at once.
// Tap your half to take a bite (four bites a pancake). Bites on the chew beat are easy; mashing makes you queasy.
// Fill the queasy meter and you throw up (lose two pancakes). When Suzanne calls, put the fork DOWN.
// Online (netField): each phone eats on its own clock (tap anywhere; same seeded calls and golden stacks); the other
// side is drawn from snapshots {eaten,bites,need,q,stun,golden,chew,sl}; both end from both final counts.
const {clamp,seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {label,rr,makeFx,makeShake,sfx,halfPointers,keyboard,voice,noise}=require("src/engines/tarantinoKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");
const DUR=45,BEAT=.5;
const CALL_LINES=['“Forrest… are you eating pancakes right now?”','“We need to talk about the house.”','“Is that syrup I hear?”','“My lawyer says hi.”'];
const PUKE_LINES=['Zero stars.','The diner goes quiet.','Not on the menu.','A bold review.'];

async function pancakes(s){
 const [c,x]=s.canvas(760,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 const rnd=seededRandom(s.seed+':pancakes'),fx=makeFx(),shake=makeShake();
 // Same schedule for both: phone calls and golden stacks
 const calls=[];for(let t=7+rnd()*4;t<DUR-4;t+=7+rnd()*6)calls.push({t,len:2.2+rnd()*1.3,line:CALL_LINES[Math.floor(rnd()*CALL_LINES.length)]});
 const golden=new Set();for(let k=2;k<40;k+=3+Math.floor(rnd()*3))golden.add(k);
 const P=[0,1].map(i=>({i,eaten:0,bites:0,need:4,q:0,last:-9,stun:0,chew:0,pukes:0,streak:0,caught:0,face:0,beatT:0,goldenNow:false}));
 let t=0,phase='play',endT=0,callNow=null,ring=0;
 let netEnd=null;const nf=netField(s,{pack:i=>{const p=P[i];return {eaten:p.eaten,bites:p.bites,need:p.need,q:Math.round(p.q),stun:+p.stun.toFixed(2),golden:p.goldenNow,chew:+p.chew.toFixed(2),sl:+(t-p.last).toFixed(2)};},
  unpack:(i,d)=>{const p=P[i],was=p.eaten;Object.assign(p,{eaten:d.eaten|0,bites:d.bites|0,need:d.need|0||4,q:+d.q||0,stun:+d.stun||0,goldenNow:!!d.golden,chew:+d.chew||0,last:t-(+d.sl||9)});if(p.eaten>was)fx.confetti(cx(i),L.plateY,14,['#f3c27a','#fff','#8a4f1d']);s.setScores(P.map(q=>q.eaten));}});
 s.debug={engine:'pancakes',P,calls,get t(){return t;},bot:null};
 const setup=p=>{p.goldenNow=golden.has(p.eaten);p.need=p.goldenNow?6:4;p.bites=0;};P.forEach(setup);

 function bite(i){if(nf){if(netEnd)return;i=nf.me;}const p=P[i];if(phase!=='play'||s.paused)return;
  if(p.stun>0){p.q=Math.min(100,p.q+2);return;}
  if(callNow){p.q=Math.min(100,p.q+22);p.caught++;p.streak=0;shake.kick(6);sfx.buzz();fx.pop(cx(i),L.H*.36,'CAUGHT!',{color:'#ff6b6b',size:24});s.react(i,'sad');checkPuke(p);return;}
  const gap=t-p.last;p.last=t;const onBeat=gap>BEAT*.78&&gap<BEAT*1.7;
  const full=1+p.eaten*.03;let add;
  if(gap<BEAT*.55){add=9*full;p.streak=0;}else if(onBeat){add=2.1*full;p.streak++;}else{add=4*full;p.streak=0;}
  p.q=Math.min(100,p.q+add);p.chew=.18;p.bites++;
  voice(onBeat?520+Math.min(6,p.streak)*40:260,.06,.04,onBeat?'triangle':'square');
  if(onBeat&&p.streak>0&&p.streak%4===0)fx.pop(cx(i),L.H*.3,'CHEW RHYTHM ×'+p.streak,{color:'#ffe08a',size:16});
  if(p.bites>=p.need){const gain=p.goldenNow?2:1;p.eaten+=gain;fx.confetti(cx(i),L.plateY,p.goldenNow?40:14,p.goldenNow?['#ffd23f','#fff3b0','#ffb000']:['#f3c27a','#fff','#8a4f1d']);fx.pop(cx(i),L.plateY-40,'+'+gain+' 🥞',{color:'#fff',size:24});sfx.coin();s.setScores(P.map(q=>q.eaten));s.react(i,'happy');setup(p);}
  checkPuke(p);nf?.push();
 }
 function checkPuke(p){if(p.q<100)return;p.pukes++;const lost=Math.min(2,p.eaten);p.eaten-=lost;p.q=35;p.stun=2.4;p.streak=0;setup(p);s.setScores(P.map(q=>q.eaten));
  fx.splat(cx(p.i),L.headY+L.hs*.3,{n:40,speed:420,dir:Math.PI/2,spread:1.6,size:6,color:'#9fc23a'});shake.kick(14);noise(.5,.15,{f0:500,f1:120});vibrate([40,30,60]);s.react(p.i,'sad');
  fx.pop(cx(p.i),L.H*.24,lost?`-${lost} 🥞 ${PUKE_LINES[p.pukes%PUKE_LINES.length]}`:PUKE_LINES[p.pukes%PUKE_LINES.length],{color:'#c8f05a',size:18,life:1.6});}

 halfPointers(s,{down:i=>bite(i)});
 // vs CPU: eater 2 chews on the beat, stops for the phone after a reaction delay and eases off when queasy
 const cpu=isCpu(s);let cpuNext=1,cpuCall=0;
 function cpuThink(dt){const p=P[1];if(phase!=='play'||p.stun>0)return;const sk=cpuSkill(s);cpuNext-=dt;if(callNow){cpuCall+=dt;if(cpuCall>.15+(1-sk)*.6)return;}else cpuCall=0;
  if(cpuNext>0)return;cpuNext=BEAT*(1+(Math.random()-.5)*(1.15-sk)*.9);if(p.q>78-sk*10&&Math.random()<.4+sk*.5){cpuNext=BEAT*1.8;return;}bite(1);}
 keyboard(s,(i,k,down)=>{if(down&&(k==='act'||k==='u'||k==='d'))bite(i);});

 const L={};const cx=i=>L.W*(i?.75:.25);
 function layout(){const W=s.W,H=s.H;Object.assign(L,{W,H,hs:clamp(Math.min(W*.3,H*.2),56,150),headY:H*.32,plateY:H*.7,meterY:H*.86});}

 function drawStack(px,py,w,n,goldenNow,bites,need){
  x.fillStyle='#f2f2f2';x.beginPath();x.ellipse(px,py+6,w*.75,w*.18,0,0,7);x.fill();x.fillStyle='#d9d9d9';x.beginPath();x.ellipse(px,py+6,w*.55,w*.12,0,0,7);x.fill();
  const show=Math.min(7,n),ph=w*.12;
  for(let k=0;k<show;k++){const y=py-k*ph,top=k===show-1,ww=w*(.5-k*.008);
   x.fillStyle=goldenNow&&top?'#ffcf3a':'#c98a3f';x.beginPath();x.ellipse(px,y,ww,ph*.9,0,0,7);x.fill();
   x.fillStyle=goldenNow&&top?'#fff0a0':'#e9b46a';x.beginPath();x.ellipse(px,y-ph*.35,ww*.96,ph*.6,0,0,7);x.fill();
   if(top&&bites>0){x.fillStyle='#24140c';for(let b=0;b<bites;b++){const a=-.6+b*(1.2/Math.max(1,need-1));x.beginPath();x.arc(px+Math.cos(a)*ww*.95,y-ph*.35+Math.sin(a)*ph*.6,ww*.17,0,7);x.fill();}}}
  const ty=py-(show-1)*ph-ph*.6;x.fillStyle='#fff6c8';rr(x,px-w*.08,ty-w*.07,w*.16,w*.09,3);x.fill();
  x.fillStyle='#7a3b0dcc';x.beginPath();x.ellipse(px,ty+2,w*.32,ph*.45,0,0,7);x.fill();for(let d=-1;d<=1;d++){x.fillRect(px+d*w*.28-2,ty,4,ph*(1.4+Math.abs(d)));}
  if(goldenNow)label(x,'GOLDEN STACK ×2',px,py+w*.32,clamp(w*.13,10,16),{fill:'#ffd23f'});
 }

 function drawSide(p){const W=L.W,H=L.H,px=cx(p.i),q=p.q/100;
  // head: chew bob + green tint
  const bob=p.chew>0?Math.sin(p.chew*40)*L.hs*.05:0,shakeX=p.stun>0?Math.sin(t*60)*4:0,hs=L.hs*(1+(p.chew>0?.05:0));
  s.sprite(x,p.i,px+shakeX,L.headY+bob,hs,{exact:true,mood:p.stun>0||q>.75?'sad':p.chew>0?'happy':undefined});
  if(q>.35){x.save();x.globalAlpha=(q-.35)*.55;x.fillStyle='#86d23f';x.beginPath();x.arc(px+shakeX,L.headY+bob,hs*.42,0,7);x.fill();x.restore();}
  if(q>.8&&p.stun<=0){x.font=`${L.hs*.25}px system-ui`;x.textAlign='center';x.fillText('💦',px+hs*.42,L.headY-hs*.3);}
  if(p.stun>0)label(x,'🤢',px,L.headY-hs*.62,L.hs*.3);
  drawStack(px,L.plateY,clamp(Math.min(W*.32,H*.36),70,230),Math.max(1,6-Math.floor(p.eaten/6)),p.goldenNow,p.bites,p.need);
  // queasy meter
  const mw=clamp(W*.36,110,280),mx=px-mw/2,my=L.meterY,mh=14;x.fillStyle='#0008';rr(x,mx-3,my-3,mw+6,mh+6,9);x.fill();
  const g=x.createLinearGradient(mx,0,mx+mw,0);g.addColorStop(0,'#5fcf6a');g.addColorStop(.6,'#e2d640');g.addColorStop(1,'#d6402e');x.fillStyle=g;rr(x,mx,my,mw*q,mh,7);x.fill();
  label(x,'QUEASY',mx,my-10,10,{align:'left',fill:'#ffe9c7'});
  // chew beat ring
  const since=t-p.last,k=clamp(since/BEAT,0,2),ready=since>BEAT*.78&&since<BEAT*1.7;x.strokeStyle=ready?'#ffe08a':'#ffffff40';x.lineWidth=ready?4:2;x.beginPath();x.arc(px,L.headY,hs*.62+(1-Math.min(1,k))*hs*.25,0,7);x.stroke();
  const al=p.i?'right':'left',ex=p.i?W-18:18;label(x,`${p.eaten} 🥞`,ex,H*.07,clamp(W*.06,18,34),{align:al,fill:'#fff'});
  label(x,s.players[p.i].name,ex,H*.07+clamp(W*.05,16,28),12,{align:al,fill:p.i?'#ff9fc6':'#78b6ff'});
 }

 s.hint('Both eat at once. Tap your half to bite; four bites finish a pancake (golden stacks take six and count double). Bite on the beat (when the ring glows) to stay calm; mashing fills the QUEASY meter fast and the fuller you get, the worse each bite. Max it out and you throw up two pancakes. When Suzanne calls, stop eating! Keys: Space and Enter.');
 if(!await s.pass(0,'Forrest MacNeil was asked: what is it like to eat 15 pancakes? Find out. Tap your half to bite, ideally on the beat. Don’t get too queasy, and when the phone rings, put the fork down. Most pancakes in 45 seconds wins.','Both ready — dig in',{countdown:3}))return;
 if(nf)s.debug.bot=()=>{const p=P[nf.me];if(phase!=='play'||p.stun>0||callNow||netEnd)return '';if(t-p.last>BEAT*.85&&p.q<75){bite(nf.me);return 'bite';}return '';};
 s.frame(dt=>{layout();if(cpu)cpuThink(dt);
  if(phase==='play'){t+=dt;
   const call=calls.find(cl=>t>=cl.t&&t<cl.t+cl.len);if(call&&!callNow){ring=0;sfx.phone();}callNow=call||null;if(callNow){ring+=dt;if(ring>.6){ring=0;sfx.phone();}}
   nf?.tick(dt);for(const p of P){if(nf&&p.i===nf.remote)continue;p.chew=Math.max(0,p.chew-dt);if(p.stun>0)p.stun-=dt;const calm=t-p.last>.9?14:5;p.q=Math.max(0,p.q-calm*dt);}
   if(t>=DUR){if(nf){if(!netEnd){netEnd='wait';nf.finish(P[nf.me].eaten);nf.remoteDone().then(v=>{if(v!=null)P[nf.remote].eaten=v|0;s.setScores(P.map(q=>q.eaten));phase='end';endT=2.2;sfx.fanfare();});}}else{phase='end';endT=2.2;sfx.fanfare();}}
  }else{endT-=dt;if(endT<=0&&s.alive){const sc=P.map(p=>p.eaten);s.finish(sc,sc[0]===sc[1]?`Pancakes tie ${sc[0]}–${sc[1]}. Both reviews: three stars.`:`${s.players[sc[0]>sc[1]?0:1].name} eats ${Math.max(...sc)} pancakes to ${Math.min(...sc)}.`);return;}}
  fx.step(dt);shake.step(dt);const W=L.W,H=L.H;x.save();shake.apply(x);
  // diner
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#3b1f2b');bg.addColorStop(.55,'#6d2f35');bg.addColorStop(.56,'#e8e1cf');bg.addColorStop(1,'#cfc6b0');x.fillStyle=bg;x.fillRect(-20,-20,W+40,H+40);
  const tile=clamp(W/14,22,46);for(let yy=H*.56;yy<H;yy+=tile)for(let xx=((yy/tile)|0)%2*tile;xx<W;xx+=tile*2){x.fillStyle='#b9332e22';x.fillRect(xx,yy,tile,tile);}
  x.fillStyle='#ffffff10';for(let k=0;k<6;k++){x.fillRect(W*(k/6)+10,H*.06,W/8,H*.32);}
  x.strokeStyle='#ffffff22';x.lineWidth=2;x.beginPath();x.moveTo(W/2,0);x.lineTo(W/2,H);x.stroke();
  label(x,'REVIEW',W/2,H*.2,clamp(W*.03,10,16),{fill:'#ffd6a8'});
  for(const p of P)drawSide(p);
  if(netEnd==='wait'&&phase==='play')label(x,`Waiting for ${s.players[nf.remote].name}…`,W/2,H*.62,clamp(W*.04,14,24),{fill:'#fff'});
  if(phase==='play')label(x,String(Math.ceil(Math.max(0,DUR-t))),W/2,H*.11,clamp(W*.05,18,32),{fill:DUR-t<10?'#ff6b6b':'#fff'});
  if(callNow){const a=.75+Math.sin(t*20)*.25;x.fillStyle=`rgba(20,10,30,${.55*a})`;x.fillRect(0,H*.4,W,H*.16);label(x,'📞 SUZANNE IS CALLING — STOP EATING!',W/2,H*.45,clamp(W*.04,13,26),{fill:'#ffd23f'});label(x,callNow.line,W/2,H*.51,clamp(W*.028,11,18),{fill:'#fff'});}
  if(phase==='end'){const best=Math.max(...P.map(p=>p.eaten));for(const p of P){const stars=clamp(Math.round(p.eaten/3)/2,0,5);label(x,'★'.repeat(Math.floor(stars))+(stars%1?'½':''),cx(p.i),H*.16,clamp(W*.045,14,28),{fill:'#ffd23f'});label(x,p.eaten===best?'WINNER':'',cx(p.i),H*.21,14,{fill:'#9dff5c'});}}
  fx.draw(x);x.restore();
  s.status(`${Math.ceil(Math.max(0,DUR-t))}s · tap your half to bite on the beat · stop when the phone rings`);
 });
}
Object.assign(exports,{pancakes});
