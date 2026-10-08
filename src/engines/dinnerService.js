// Kitchen Nightmares · Dinner Service. Pass-and-play burger line, same seeded tickets for both chefs.
// Tap a bin to add that layer to the plate (bottom first). Raw patties go on the grill: take them off when the
// ring turns green (gold = perfect); too early is RAW, too late is burnt. Tap the plate to send it: it goes to
// the ticket it matches. Tap the bin icon to scrape the plate. Faster service = bigger tips.
const {clamp,seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {label,rr,makeFx,makeShake,sfx,voice,noise}=require("src/engines/tarantinoKit.js");
const DUR=55,COOK=[3.2,4.2,6.2]; // raw until 3.2s, perfect 3.2–4.2, ok until 6.2, then burnt
const BINS=['bun','patty','cheese','lettuce','tomato','onion'];
const YELLS={raw:['IT’S RAW!','IT’S BLOODY RAW!','THIS IS STILL MOOING!'],burnt:['IT’S BURNT! LOOK AT IT!','CHARCOAL, DONKEY!'],wrong:['THAT’S NOT WHAT THEY ORDERED!','READ THE TICKET!','WAKE UP!'],late:['WHERE’S TABLE {n}?!','THEY’VE WALKED OUT!'],good:['BEAUTIFUL.','FINALLY. GOOD.','NOW WE’RE COOKING.','STUNNING.']};

function makeTickets(seed){const r=seededRandom(seed+':kitchen'),list=[];let t=0;
 for(let k=0;k<30;k++){const lvl=Math.min(1,k/10),inner=[];const patties=r()<.25+lvl*.25?2:1;
  for(let p=0;p<patties;p++){inner.push('patty');if(r()<.55)inner.push('cheese');}
  for(const extra of ['lettuce','tomato','onion'])if(r()<.35+lvl*.15)inner.splice(1+Math.floor(r()*inner.length),0,extra);
  list.push({at:t,stack:['bun',...inner,'bun'],table:1+Math.floor(r()*12),patience:24-lvl*6});t+=Math.max(4.5,9-k*.45)+r()*2.5;}
 return list;}

async function kitchen(s){
 const [c,x]=s.canvas(680,760,{fill:true});s.body.classList.add('drag-arena-body');
 const fx=makeFx(),shake=makeShake(),scores=[0,0],tickets=makeTickets(s.seed);let player=0,st=null,ending=false;
 s.debug={engine:'kitchen',get st(){return st;},scores};
 const L={};
 function layout(){const H=s.H,W=Math.min(s.W,H*.8),u=clamp(Math.min(W/10,H/13),20,64);Object.assign(L,{W,H,u,ox:(s.W-W)/2,railY:H*.03,railH:H*.25,grillY:H*.33,grillH:H*.17,plateY:H*.53,plateH:H*.2,binY:H*.78,binH:H*.17});}
 function reset(){st={t:0,next:0,active:[],grill:[null,null,null],plate:[],score:0,served:0,yell:'',yellT:0,lost:0};}

 function spawn(){while(st.next<tickets.length&&tickets[st.next].at<=st.t&&st.active.length<3){const tk=tickets[st.next++];st.active.push({...tk,left:tk.patience});voice(1200,.08,.04,'square');voice(1500,.1,.04,'square',{delay:.1});}}
 function yell(kind,n){const a=YELLS[kind];st.yell=a[Math.floor(Math.random()*a.length)].replace('{n}',n);st.yellT=1.6;if(kind!=='good'){shake.kick(6);voice(130,.35,.08,'sawtooth',{lp:900});vibrate(30);}}

 // hit-tests
 const binRect=k=>{const w=L.W/6;return {x:k*w+4,y:L.binY,w:w-8,h:L.binH};};
 const grillRect=k=>{const w=L.W*.62/3,ox=L.W*.04;return {x:ox+k*w+4,y:L.grillY,w:w-8,h:L.grillH};};
 const plateRect=()=>({x:L.W*.2,y:L.plateY,w:L.W*.6,h:L.plateH});
 const trashRect=()=>({x:L.W*.82,y:L.plateY+L.plateH*.25,w:L.W*.15,h:L.plateH*.6});
 const ticketRect=k=>{const w=L.W/3;return {x:k*w+4,y:L.railY,w:w-8,h:L.railH};};
 const inR=(p,r)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;

 s.on(c,'pointerdown',ev=>{if(s.paused||!st||ending)return;ev.preventDefault();const q=s.pointer(ev);handleTap({x:q.x-L.ox,y:q.y});});
 function handleTap(p){
  for(let k=0;k<6;k++)if(inR(p,binRect(k))){const it=BINS[k];
   if(it==='patty'){const slot=st.grill.findIndex(g=>!g);if(slot<0){fx.pop(p.x,p.y-20,'GRILL FULL',{size:14,color:'#ffb'});sfx.buzz();return;}st.grill[slot]={t:0};noise(.5,.06,{type:'highpass',f0:2000});sfx.thump(.06);return;}
   if(st.plate.length>=9){sfx.buzz();return;}st.plate.push({it});sfx.click();return;}
  for(let k=0;k<3;k++)if(inR(p,grillRect(k))&&st.grill[k]){const g=st.grill[k];if(st.plate.length>=9){sfx.buzz();return;}const done=g.t<COOK[0]?'raw':g.t<COOK[1]?'perfect':g.t<COOK[2]?'ok':'burnt';st.plate.push({it:'patty',done});st.grill[k]=null;sfx.click();if(done==='perfect')fx.pop(p.x,p.y-10,'PERFECT',{color:'#ffd23f',size:14});return;}
  if(inR(p,trashRect())){if(st.plate.length){st.plate=[];noise(.2,.08,{f0:600,f1:200});}return;}
  if(inR(p,plateRect())||[0,1,2].some(k=>inR(p,ticketRect(k))))serve();
 }
 const mid=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
 s.on(document,'keydown',ev=>{if(!st||s.paused||ending)return;const k=ev.key;if(k>='1'&&k<='6')handleTap(mid(binRect(+k-1)));else if(k==='g'){const i=st.grill.findIndex(Boolean);if(i>=0)handleTap(mid(grillRect(i)));}else if(k==='Enter'||k===' '){ev.preventDefault();serve();}else if(k==='Backspace'||k==='x')handleTap(mid(trashRect()));});

 function serve(){if(!st.plate.length)return;const names=st.plate.map(l=>l.it).join(',');const k=st.active.findIndex(tk=>tk.stack.join(',')===names);
  const pr=plateRect(),cx=pr.x+pr.w/2,cy=pr.y+pr.h/2;
  if(k<0){st.score=Math.max(0,st.score-3);yell('wrong');st.plate=[];fx.pop(cx,cy,'−3',{color:'#ff6b6b',size:20});scores[player]=st.score;s.setScores(scores);return;}
  const pat=st.plate.filter(l=>l.it==='patty');if(pat.some(l=>l.done==='raw')){st.score=Math.max(0,st.score-5);yell('raw');st.plate=[];fx.pop(cx,cy,'−5',{color:'#ff6b6b',size:20});scores[player]=st.score;s.setScores(scores);return;}
  if(pat.some(l=>l.done==='burnt')){st.score=Math.max(0,st.score-5);yell('burnt');st.plate=[];fx.pop(cx,cy,'−5',{color:'#ff6b6b',size:20});scores[player]=st.score;s.setScores(scores);return;}
  const tk=st.active[k],perfect=pat.filter(l=>l.done==='perfect').length,tip=Math.round(clamp(tk.left/tk.patience,0,1)*6);const pts=10+tip+perfect*3+(tk.stack.length>5?3:0);
  st.score+=pts;st.served++;st.active.splice(k,1);st.plate=[];const tr=ticketRect(k);fx.confetti(tr.x+tr.w/2,tr.y+tr.h/2,18);fx.pop(cx,cy,`+${pts}${perfect?' PERFECT':''}`,{color:'#9dff5c',size:22});sfx.coin();if(perfect||tip>=4)yell('good');s.react(player,'happy');scores[player]=st.score;s.setScores(scores);}

 function step(dt){st.t+=dt;st.yellT-=dt;spawn();
  for(const g of st.grill)if(g){g.t+=dt;if(g.t>COOK[2]&&!g.smoked){g.smoked=1;voice(90,.3,.04,'sawtooth');}}
  for(let k=st.active.length-1;k>=0;k--){const tk=st.active[k];tk.left-=dt;if(tk.left<=0){st.active.splice(k,1);st.score=Math.max(0,st.score-5);st.lost++;yell('late',tk.table);s.react(player,'sad');scores[player]=st.score;s.setScores(scores);}}
  if(st.t>=DUR)endTurn();}

 // drawing layers
 function layer(it,cx,cy,w,done){const h=w*.2;x.save();
  if(it==='bun'){x.fillStyle='#d99a4a';x.beginPath();x.ellipse(cx,cy,w*.5,h*.9,0,0,7);x.fill();x.fillStyle='#f3e0b0';for(let k=0;k<5;k++){x.beginPath();x.ellipse(cx-w*.3+k*w*.15,cy-h*.3,2,1.2,0,0,7);x.fill();}}
  else if(it==='patty'){x.fillStyle=done==='raw'?'#d36a7a':done==='burnt'?'#1e140e':done==='perfect'?'#6a3a1a':'#4a2a14';rr(x,cx-w*.48,cy-h*.6,w*.96,h*1.2,h*.6);x.fill();if(done==='perfect'){x.strokeStyle='#ffd23f';x.lineWidth=1.5;x.stroke();}}
  else if(it==='cheese'){x.fillStyle='#ffcf3a';x.beginPath();x.moveTo(cx-w*.5,cy-h*.3);x.lineTo(cx+w*.5,cy-h*.3);x.lineTo(cx+w*.42,cy+h*.5);x.lineTo(cx+w*.1,cy+h*.2);x.lineTo(cx-w*.2,cy+h*.6);x.lineTo(cx-w*.45,cy+h*.3);x.closePath();x.fill();}
  else if(it==='lettuce'){x.fillStyle='#5fbf3a';x.beginPath();for(let k=0;k<=10;k++){const px=cx-w*.52+k*w*.104;x.lineTo(px,cy+(k%2?h*.6:-h*.2));}x.lineTo(cx+w*.45,cy-h*.4);x.lineTo(cx-w*.45,cy-h*.4);x.closePath();x.fill();}
  else if(it==='tomato'){x.fillStyle='#e0402a';for(const dx of [-.22,.22]){x.beginPath();x.ellipse(cx+dx*w,cy,w*.24,h*.55,0,0,7);x.fill();}}
  else if(it==='onion'){x.strokeStyle='#f0e6ff';x.lineWidth=Math.max(2,h*.35);for(const dx of [-.25,0,.25]){x.beginPath();x.ellipse(cx+dx*w,cy,w*.13,h*.4,0,0,7);x.stroke();}}
  x.restore();}
 function stack(list,cx,bottom,w,gap){list.forEach((l,k)=>{const it=typeof l==='string'?l:l.it,done=typeof l==='string'?'ok':l.done,top=k===list.length-1&&it==='bun'&&k>0;
  if(top){x.fillStyle='#d99a4a';x.beginPath();x.ellipse(cx,bottom-k*gap,w*.5,w*.28,0,Math.PI,0);x.fill();x.fillStyle='#f3e0b0';for(let j=0;j<6;j++){x.beginPath();x.ellipse(cx-w*.3+j*w*.12,bottom-k*gap-w*.14-(j%2)*3,2,1.2,0,0,7);x.fill();}}
  else layer(it,cx,bottom-k*gap,w,done);});}

 function draw(){const W=L.W,H=L.H,u=L.u;x.save();shake.apply(x);
  x.fillStyle='#2a2f36';x.fillRect(-20,-20,s.W+40,H+40);x.translate(L.ox,0);
  const tile=u*.8;for(let yy=0;yy<H;yy+=tile)for(let xx=(yy/tile|0)%2*tile;xx<W;xx+=tile*2){x.fillStyle='#ffffff06';x.fillRect(xx,yy,tile,tile);}
  // rail + tickets
  x.fillStyle='#b8bcc4';x.fillRect(0,L.railY,W,4);
  for(let k=0;k<3;k++){const r=ticketRect(k),tk=st.active[k];if(!tk){x.strokeStyle='#ffffff18';x.setLineDash([5,5]);x.strokeRect(r.x,r.y+8,r.w,r.h-8);x.setLineDash([]);continue;}
   const q=clamp(tk.left/tk.patience,0,1),wob=q<.25?Math.sin(st.t*30)*2:0;x.save();x.translate(wob,0);x.fillStyle='#fffbe8';rr(x,r.x,r.y+8,r.w,r.h-8,6);x.fill();
   label(x,`TABLE ${tk.table}`,r.x+r.w/2,r.y+20,clamp(r.w*.11,9,15),{fill:'#5a4630',stroke:'transparent'});
   const sw=Math.min(r.w*.7,u*2.4),gap=clamp((r.h-50)/(tk.stack.length+1),5,sw*.2);stack(tk.stack,r.x+r.w/2,r.y+r.h-20,sw,gap);
   x.fillStyle=q>.5?'#5fbf3a':q>.25?'#e0b03a':'#e0402a';x.fillRect(r.x+6,r.y+r.h-10,(r.w-12)*q,5);x.restore();}
  // grill
  x.fillStyle='#14161a';rr(x,W*.03,L.grillY-6,W*.64,L.grillH+12,10);x.fill();
  for(let k=0;k<3;k++){const r=grillRect(k),g=st.grill[k];x.fillStyle='#2a2d33';rr(x,r.x,r.y,r.w,r.h,8);x.fill();x.strokeStyle='#44474e';x.lineWidth=2;for(let j=1;j<5;j++){x.beginPath();x.moveTo(r.x+6,r.y+j*r.h/5);x.lineTo(r.x+r.w-6,r.y+j*r.h/5);x.stroke();}
   if(g){const done=g.t<COOK[0]?'raw':g.t<COOK[1]?'perfect':g.t<COOK[2]?'ok':'burnt',cx=r.x+r.w/2,cy=r.y+r.h/2,w=Math.min(r.w*.8,r.h*1.3);
    const cook=clamp(g.t/COOK[0],0,1);x.fillStyle=done==='burnt'?'#1e140e':`rgb(${211-cook*120|0},${106-cook*60|0},${122-cook*100|0})`;x.beginPath();x.ellipse(cx,cy,w*.42,w*.3,0,0,7);x.fill();
    const ring=done==='raw'?'#e05a4a':done==='perfect'?'#ffd23f':done==='ok'?'#5fe07a':'#555';x.strokeStyle=ring;x.lineWidth=4;x.beginPath();x.arc(cx,cy,w*.46,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(g.t/COOK[2],0,1));x.stroke();
    if(done==='burnt'||g.t>COOK[1]){for(let j=0;j<3;j++){x.fillStyle=`rgba(${done==='burnt'?'60,60,60':'220,220,220'},${.3})`;x.beginPath();x.arc(cx-10+j*10,cy-w*.3-((st.t*30+j*13)%30),6,0,7);x.fill();}}
    label(x,done==='perfect'?'TAKE IT!':done==='raw'?'raw':done==='burnt'?'BURNT':'done',cx,r.y+r.h-9,clamp(r.w*.12,9,14),{fill:ring});}
   else label(x,'grill',r.x+r.w/2,r.y+r.h/2,12,{fill:'#ffffff30',stroke:'transparent'});}
  // chef + yell
  const chefX=W*.83,chefY=L.grillY+L.grillH*.5;s.sprite(x,player,chefX,chefY,clamp(L.grillH*.9,40,110),{exact:true,mood:st.yellT>0&&!YELLS.good.includes(st.yell)?'sad':undefined});
  label(x,`${st.score}`,chefX,L.grillY-2,clamp(u*.6,14,28),{fill:'#ffd23f'});
  // plate + trash
  const pr=plateRect();x.fillStyle='#e8ecf0';x.beginPath();x.ellipse(pr.x+pr.w/2,pr.y+pr.h*.82,pr.w*.45,pr.h*.14,0,0,7);x.fill();x.fillStyle='#cfd5db';x.beginPath();x.ellipse(pr.x+pr.w/2,pr.y+pr.h*.82,pr.w*.32,pr.h*.09,0,0,7);x.fill();
  const pw=Math.min(pr.w*.55,u*3.4),pg=clamp((pr.h*.7)/Math.max(6,st.plate.length+1),6,pw*.2);stack(st.plate,pr.x+pr.w/2,pr.y+pr.h*.78,pw,pg);
  if(st.plate.length)label(x,'TAP PLATE TO SERVE',pr.x+pr.w/2,pr.y+6,clamp(u*.32,9,13),{fill:'#9dff5c'});
  const tr=trashRect();x.fillStyle='#4a4f58';rr(x,tr.x,tr.y,tr.w,tr.h,6);x.fill();label(x,'🗑',tr.x+tr.w/2,tr.y+tr.h/2,clamp(tr.w*.45,14,30));
  // bins
  for(let k=0;k<6;k++){const r=binRect(k);x.fillStyle='#3a3f48';rr(x,r.x,r.y,r.w,r.h,8);x.fill();x.strokeStyle='#ffffff20';x.lineWidth=1;x.stroke();layer(BINS[k],r.x+r.w/2,r.y+r.h*.45,Math.min(r.w*.8,u*1.6),BINS[k]==='patty'?'raw':'ok');label(x,BINS[k].toUpperCase(),r.x+r.w/2,r.y+r.h-10,clamp(r.w*.13,8,13),{fill:'#ddd',stroke:'transparent'});}
  // hud
  const fs=clamp(u*.36,10,16);label(x,`${s.players[player].name} · ⏱ ${Math.ceil(Math.max(0,DUR-st.t))} · served ${st.served}`,W*.04,L.grillY-fs*1.1,fs,{align:'left',fill:player?'#ff9fc6':'#78b6ff'});
  if(st.yellT>0){const good=YELLS.good.includes(st.yell);x.fillStyle=good?'#1e5a2ae0':'#7a1a1ae8';rr(x,W*.08,H*.43-fs*1.5,W*.84,fs*3,12);x.fill();label(x,`👨‍🍳 ${st.yell}`,W/2,H*.43,clamp(W*.045,14,26),{fill:'#fff'});}
  fx.draw(x);x.restore();}

 async function endTurn(){if(ending)return;ending=true;scores[player]=st.score;s.setScores(scores);sfx.ding(880);
  if(player===0){player=1;await begin(`${s.players[0].name} made ${scores[0]} in tips (${st.served} served).`);}
  else{await s.wait(500);s.finish([...scores],scores[0]===scores[1]?`Dinner Service ties ${scores[0]}–${scores[1]}.`:`${s.players[scores[0]>scores[1]?0:1].name} survives the dinner rush ${Math.max(...scores)}–${Math.min(...scores)}.`);}}
 async function begin(summary){reset();layout();draw();if(!await s.pass(player,'Dinner rush! Build each ticket bottom-up by tapping the bins. Patties go on the grill: grab them when the ring is gold (perfect) or green; red is RAW, black is burnt. Tap the plate to send it to the matching ticket. Same tickets for both chefs.','Ready — service!',{countdown:3,summary}))return;ending=false;}
 s.hint('Tap a bin to add that layer to the plate, bottom bun first. PATTY puts a raw patty on the grill; tap it on the grill to plate it when its ring turns gold (perfect, +3) or green. Red = raw (−5), black = burnt (−5). Tap the plate to serve; it goes to whichever ticket matches exactly. 🗑 scrapes the plate. Expired tickets cost 5.');
 s.frame(dt=>{if(!st)return;layout();if(!ending)step(dt);fx.step(dt);shake.step(dt);draw();s.status(`${s.players[player].name} · ${st.score} tips · build bottom-up, gold patties are perfect`);});
 await begin(null);
}
Object.assign(exports,{kitchen});
