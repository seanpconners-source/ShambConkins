// PUNCH-A-BUNCH (game id punch-a-bunch, engine 'punchabunch'; in The Price Is Right's menu). Played like the show: four small prizes,
// one at a time the host shows a price and asks "is the real price HIGHER or LOWER?"; every right answer earns a punch on the 50-hole
// punchboard (5 rows of 10, one $25,000 slip, the rest $100 to $10,000). Punch a hole, the slip comes out: keep the money and stop, or
// throw it away and punch again; the last punch has to be kept, the $25,000 ends it at once. Score = the money kept.
// Slip mix (the page gives only the range): 1 x $25,000, 2 x $10,000, 5 x $5,000, 6 x $2,500, 10 x $1,000, 10 x $500, 10 x $250, 6 x $100.
// 1P vs CPU, 2P one phone (each their own board), board. Online: the contestant's phone sends {pb:'h'|'l'}, {pp:hole}, {pk:1 keep|0 again}.
// Pictures (optional): punch-board / punch-paper / punch-slip / punch-logo / stage-punch(-tall/-fold); sounds: ding/buzzer, bell for
// a big slip, the crowd, big-winner for $25,000.
const SS=require("src/data/showSprites.js");
const SP=require("src/data/showPrizes.js");
const {createKit,shuffle,txt}=require("src/engines/gameshow/pricingKit.js");
const {clamp,seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const BG=SS.PBOARD_GEOM,PPG=SS.PAPER_GEOM,SLG=SS.SLIP_GEOM,TAU=Math.PI*2;
const SLIPS=[[25000,1],[10000,2],[5000,5],[2500,6],[1000,10],[500,10],[250,10],[100,6]].flatMap(([v,n])=>Array(n).fill(v));
// ---- drawn fallbacks (picture px)
function drawBoard(g){const pic=SS.picture('punch-board'),[a,b,c,d]=BG.grid;if(pic){g.drawImage(pic,0,0,BG.w,BG.h);return;}
 const gr=g.createLinearGradient(0,0,0,BG.h);gr.addColorStop(0,'#d81e4a');gr.addColorStop(1,'#7a0a2a');g.fillStyle=gr;g.beginPath();g.roundRect(20,20,BG.w-40,BG.h-40,50);g.fill();g.strokeStyle='#ffd23f';g.lineWidth=20;g.stroke();
 g.font='900 120px "SC Bangers",Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=12;g.strokeStyle='#14062e';g.strokeText('PUNCH-A-BUNCH',BG.w/2,110);g.fillStyle='#ffe23a';g.fillText('PUNCH-A-BUNCH',BG.w/2,110);
 g.fillStyle='#14062e';g.fillRect(a-14,b-14,c-a+28,d-b+28);}
function drawPaper(g,lit=false){const pic=SS.picture('punch-paper');if(pic){g.drawImage(pic,0,0,PPG.w,PPG.h);return;}
 g.fillStyle='#2a1030';g.fillRect(0,0,PPG.w,PPG.h);const gr=g.createLinearGradient(0,0,PPG.w,PPG.h);gr.addColorStop(0,lit?'#fff6c0':'#ffe9a0');gr.addColorStop(.5,'#f2c84a');gr.addColorStop(1,'#c89a20');g.fillStyle=gr;g.beginPath();g.arc(PPG.w/2,PPG.h/2,PPG.w*.42,0,TAU);g.fill();
 g.strokeStyle='#8a6a10';g.lineWidth=6;g.stroke();g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(PPG.w*.4,PPG.h*.36,PPG.w*.16,PPG.h*.07,-.5,0,TAU);g.fill();}
function drawHole(g){g.fillStyle='#2a1030';g.fillRect(0,0,PPG.w,PPG.h);g.fillStyle='#050208';g.beginPath();g.arc(PPG.w/2,PPG.h/2,PPG.w*.42,0,TAU);g.fill();
 g.strokeStyle='#c89a20';g.lineWidth=5;for(let k=0;k<9;k++){const a=k/9*TAU;g.beginPath();g.moveTo(PPG.w/2+Math.cos(a)*PPG.w*.42,PPG.h/2+Math.sin(a)*PPG.h*.42);g.lineTo(PPG.w/2+Math.cos(a+.2)*PPG.w*.3,PPG.h/2+Math.sin(a+.2)*PPG.h*.3);g.stroke();}}
function drawSlip(g,value=null){const pic=SS.picture('punch-slip'),[a,b,c,d]=SLG.text;if(pic)g.drawImage(pic,0,0,SLG.w,SLG.h);
 else{g.fillStyle='#fffdf2';g.beginPath();g.roundRect(8,8,SLG.w-16,SLG.h-16,18);g.fill();g.strokeStyle='#c8102e';g.lineWidth=8;g.stroke();g.strokeStyle='rgba(0,0,0,.12)';g.lineWidth=3;g.beginPath();g.moveTo(SLG.w/2,12);g.lineTo(SLG.w/2,SLG.h-12);g.stroke();}
 if(value!=null){g.save();g.font=`900 ${(d-b)*.72}px "SC Bangers",Impact,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=value>=10000?'#c8102e':'#14388a';g.fillText('$'+value.toLocaleString('en-US'),(a+c)/2,(b+d)/2+6,c-a);g.restore();}}
async function punchABunch(s){
 const K=createKit(s,{kind:'punch',clips:['big-winner','buzzer','bell','ding','losing-horn']}),{net,names,snd,sfx}=K;
 const small=SP.PRIZES.filter(p=>p[2]>=12);
 const P=names.map((n,i)=>{const R=seededRandom(`${s.seed}:punch:${i}`),pr=shuffle(small,R).slice(0,4).map(([id,name,price,em])=>{let off=2+Math.floor(R()*9);if(price-off<5)off=-off;const shown=R()<.5?price+off:price-off;return {id,name,price,em,shown:Math.max(1,shown),ans:null};});
  return {prizes:pr,slips:shuffle(SLIPS,R),punched:new Set(),punches:0,cur:null,kept:0,done:false,score:0,mood:'normal',q:-1};});
 for(const p of P)for(const q of p.prizes)SP.prizePhoto(q.id);
 snd.prepare(P.flatMap(p=>p.prizes.map(q=>`${q.name}: is it higher or lower than ${K.money(q.shown)}?`)));
 let phase='',slipT=0,glove=null,L={};
 function layout(){K.base();const {W,H,top,fs,wide}=K,tagH=fs*3;
  if(wide){const bw=Math.min(W*.6,(H-top-tagH-fs)*BG.w/BG.h),bh=bw*BG.h/BG.w,bx=W-bw-W*.02,col=bx-W*.02;
   L={tags:{x:8,y:H-tagH-6,w:W-16,h:tagH},board:{x:bx,y:top+fs*.3,w:bw,h:bh},logo:{x:W*.02+col/2,y:top+fs*2,w:Math.min(col*.92,fs*14)},prize:{x:W*.02,y:top+fs*4.2,w:col,h:(H-top-tagH)*.36},
    btns:{x:W*.02,y:top+fs*4.6+(H-top-tagH)*.36+fs*2.2,w:col,h:fs*2.6},bub:{x:W*.02+col/2,y:top+fs*3.4,w:Math.min(col,fs*14)},slip:{x:bx+bw/2,y:top+bh*.5,w:Math.min(bw*.5,fs*18)}};}
  else{const lw=Math.min(W*.6,fs*14),ly=top+lw*.17,bw=W*.96,bh=bw*BG.h/BG.w,by=ly+lw*.2+fs*.3,py=by+bh+fs*.4,ph=Math.max(fs*5,H-py-tagH-fs*6.4);
   L={tags:{x:8,y:H-tagH-8,w:W-16,h:tagH},board:{x:W*.02,y:by,w:bw,h:bh},logo:{x:W/2,y:ly,w:lw},prize:{x:W*.05,y:py,w:W*.9,h:ph},btns:{x:W*.05,y:py+ph+fs*2.2,w:W*.9,h:fs*2.5},
    bub:{x:W/2,y:by+bh*.4,w:Math.min(W*.86,fs*15)},slip:{x:W/2,y:by+bh*.5,w:Math.min(W*.7,fs*16)}};}}
 const cell=(i)=>{const B=L.board,k=B.w/BG.w,[a,b,c,d]=BG.grid,cw=(c-a)/BG.cols,ch=(d-b)/BG.rows,col=i%BG.cols,row=Math.floor(i/BG.cols),sz=Math.min(cw,ch)*.9;return {x:B.x+(a+col*cw+(cw-sz)/2)*k,y:B.y+(b+row*ch+(ch-sz)/2)*k,w:sz*k,h:sz*k};};
 function draw(){K.hideCast=phase==='ask'||phase==='answer';const g=K.begin();layout();const {fs,t}=K,p=P[K.cur],B=L.board;
  g.save();g.translate(B.x,B.y);g.scale(B.w/BG.w,B.w/BG.w);drawBoard(g);g.restore();
  for(let i=0;i<50;i++){const cb=cell(i),k=cb.w/PPG.w;g.save();g.translate(cb.x,cb.y);g.scale(k,k);if(p.punched.has(i))drawHole(g);else drawPaper(g,phase==='punch'&&!K.waiting()&&Math.floor(t*4+i)%7===0);g.restore();
   if(p.punched.has(i)&&p.cur!==i)txt(g,p.slips[i]>=1000?`${p.slips[i]/1000}K`:String(p.slips[i]),cb.x+cb.w/2,cb.y+cb.h/2,cb.w*.34,'#ffd75a');
   if(phase==='punch'&&!K.waiting()&&!p.punched.has(i))K.hits.push({...cb,fn:()=>punch(i)});}
  ST().drawLogo(g,'punch-logo','PUNCH-A-BUNCH',L.logo.x,L.logo.y,L.logo.w,t,{cols:['#ffe23a','#ff3d6e']});
  // the prize + question
  const Pz=L.prize,q=p.prizes[Math.max(0,p.q)];if(phase==='ask'||phase==='answer'){
   // HIGHER OR LOWER (owner, Nov 26: "the item, its title, and the higher or lower buttons should just appear large in the center of the
   // screen"): the board dims, the prize stands big on a display stand in a card in the middle, its name, the question, two big buttons
   g.fillStyle='rgba(8,2,24,.62)';g.fillRect(0,0,K.W,K.H);
   const top=K.top+fs*.4,avail=K.H-top-L.tags.h-fs*1.2,side=K.W>K.H*1.25,cw=side?Math.min(K.W*.94,fs*46):Math.min(K.W*.94,fs*26),ch=side?avail:Math.min(avail,fs*30),cx=K.W/2,y0=top+Math.max(0,(avail+fs*.2-ch)/2);
   g.fillStyle='rgba(20,6,46,.94)';g.beginPath();g.roundRect(cx-cw/2,y0,cw,ch,18);g.fill();g.strokeStyle='#ffd75a';g.lineWidth=3;g.stroke();
   // upright: prize on top, the question and the buttons under it; landscape: the prize on the left, the rest on the right
   const px=side?cx-cw/2+cw*.24:cx,pcw=side?cw*.44:cw,tx=side?cx+cw*.24:cx,tw=side?cw*.46:cw,bh=Math.min(fs*3.6,ch*.24),qy=y0+ch-bh-fs*.9,ny=side?y0+ch*.3:qy-fs*4.2,iy=y0+fs*2.2,
    pedW=side?Math.min(pcw*.5,ch*.3):Math.min(cw*.4,(ny-fs*1.2-iy)*.5),pedTop=side?y0+ch-fs*.8-pedW*.45:ny-fs*1.6-pedW*.45;
   txt(g,`PRIZE ${p.q+1} OF 4`,side?px:cx,y0+fs*1.2,fs*.85,'#ffd75a');
   ST().drawPrizeOn(g,SP.prizePhoto(q.id),px,pedTop,pcw*.86,pedTop-iy-fs*.3,{emoji:q.em,ped:true,pedW});
   txt(g,q.name.toUpperCase(),tx,ny,fs*1.25,'#ffe23a',{max:tw*.92,font:'"SC Bangers",Impact,sans-serif',w:400});
   txt(g,phase==='answer'?`IT'S ${K.money(q.price)}!`:`HIGHER OR LOWER THAN ${K.money(q.shown)}?`,tx,ny+fs*2,fs*1.25,phase==='answer'?(q.right?'#7dff5a':'#ff8a6a'):'#fff',{max:tw*.92});
   if(phase==='ask'&&!K.waiting()){const w2=tw/2-fs*.9,bx=tx-tw/2;K.button(g,{x:bx+fs*.4,y:qy,w:w2,h:bh},'HIGHER ▲',()=>answer('h'),{col:'#2fa84f',size:Math.min(fs*1.4,bh*.42)});K.button(g,{x:bx+tw-fs*.4-w2,y:qy,w:w2,h:bh},'LOWER ▼',()=>answer('l'),{col:'#c8102e',size:Math.min(fs*1.4,bh*.42)});}
   else if(phase==='ask')txt(g,`${names[K.cur].toUpperCase()} IS THINKING…`,tx,qy+bh/2,fs*.95,'#bfe7ff',{max:tw*.9});}
  else{txt(g,`PUNCHES: ${p.punches}`,Pz.x+Pz.w/2,Pz.y+Pz.h*.4,fs*2,'#ffe23a',{font:'"SC Bangers",Impact,sans-serif',w:400});
   txt(g,phase==='punch'?(K.waiting()?`${names[K.cur].toUpperCase()} IS PICKING A HOLE…`:'PUNCH A HOLE!'):phase==='choose'?`YOU HAVE ${K.money(p.slips[p.cur])}`:'',Pz.x+Pz.w/2,Pz.y+Pz.h*.68,fs*.95,'#fff',{max:Pz.w});
   if(phase==='choose'&&!K.waiting()){const bb=L.btns,w2=bb.w/2-fs*.4;K.button(g,{x:bb.x,y:bb.y,w:w2,h:bb.h},'KEEP IT',()=>choose(1),{col:'#2fa84f'});K.button(g,{x:bb.x+bb.w-w2,y:bb.y,w:w2,h:bb.h},`PUNCH AGAIN (${p.punches})`,()=>choose(0),{col:'#c8102e'});}}
  // the slip coming out of the hole
  if(p.cur!=null&&slipT>0){const cb=cell(p.cur),S=L.slip,e=1-Math.pow(1-Math.min(1,slipT),3),w=cb.w+(S.w-cb.w)*e,h=w*SLG.h/SLG.w,x0=cb.x+cb.w/2+(S.x-cb.x-cb.w/2)*e-w/2,y0=cb.y+cb.h/2+(S.y-cb.y-cb.h/2)*e-h/2,k=w/SLG.w;
   g.save();g.translate(x0+w/2,y0+h/2);g.rotate((1-e)*.6);g.translate(-w/2,-h/2);g.scale(k,k);drawSlip(g,e>.6?p.slips[p.cur]:null);g.restore();}
  // the glove punching in
  if(glove){const cb=cell(glove.i),f=glove.t/.35,s2=cb.w*(1.8-.8*Math.min(1,f));g.save();g.globalAlpha=Math.min(1,2-f*1.4);g.font=`${s2}px serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('🥊',cb.x+cb.w/2,cb.y+cb.h/2);g.restore();}
  K.tags(g,L.tags,i=>P[i].done?K.money(P[i].score):i===K.cur&&P[i].punches?`${P[i].punches} PUNCHES`:'—',P.map(q2=>q2.mood));K.overlay(g,L.bub,{noCast:phase==='ask'||phase==='answer'});}
 // ---- input
 let wake=null;const go=()=>{const w=wake;wake=null;w?.();};
 function answer(v){const p=P[K.cur],q=p.prizes[p.q];if(phase!=='ask'||q.ans)return;q.ans=v;if(net&&K.mine(K.cur))net.send({pb:v});go();}
 function punch(i){const p=P[K.cur];if(phase!=='punch'||p.punched.has(i))return;p.punched.add(i);p.cur=i;p.punches--;phase='reveal';glove={i,t:0};slipT=0;sfx.punch?.();vibrate(40);if(net&&K.mine(K.cur))net.send({pp:i});go();}
 function choose(keep){if(phase!=='choose')return;if(net&&K.mine(K.cur))net.send({pk:keep?1:0});phase=keep?'kept':'again';go();}
 const waitFor=()=>new Promise(r=>{wake=r;});
 K.frame(dt=>{if(glove){glove.t+=dt;if(glove.t>.5)glove=null;}if(phase==='reveal'||phase==='choose'||phase==='kept')slipT=Math.min(1.2,slipT+dt*1.4);draw();});
 async function remote(key){for(;;){const m=await K.recv();if(!m)return null;if(m[key]!=null)return m[key];}}
 async function play(i){const p=P[i];K.cur=i;phase='';
  K.say('Four prizes. Tell me if the real price is higher or lower, and every right answer is a punch!',3000);await K.wait(3000);
  for(let k=0;k<4;k++){if(!s.alive)return;p.q=k;const q=p.prizes[k];phase='ask';K.yell=['crowd-higher','crowd-lower','crowd-shout'];K.mode='input';K.say(`${q.name}: is it higher or lower than ${K.money(q.shown)}?`,2600);
   if(K.cpuTurn()){await K.sleep(1500);const R=seededRandom(`${s.seed}:punchcpu:${k}`),right=q.price>q.shown?'h':'l';answer(R()<.6+.35*K.skill()?right:(right==='h'?'l':'h'));}
   else if(!K.mine(i)){const v=await remote('pb');if(v==null)return;answer(v);}
   else await waitFor();
   if(!s.alive)return;K.mode='play';phase='answer';q.right=(q.ans==='h')===(q.price>q.shown);if(q.right){p.punches++;sfx.ding();K.show('RIGHT!',`That's ${p.punches} punch${p.punches>1?'es':''}`,1.3,'#7dff5a');}else{if(!snd.clip('buzzer-wrong'))sfx.buzz();K.show('NO!',`It was ${K.money(q.price)}`,1.3,'#ff6a5a');}
   await K.wait(1500);}
  if(!p.punches){phase='';p.done=true;p.mood='sad';K.show('NO PUNCHES','Better luck next time',2.4,'#ff6a5a');if(!snd.clip('losing-horn'))sfx.aww?.();await K.wait(2600);return;}
  K.say(`You've earned ${p.punches} punch${p.punches>1?'es':''}! Pick a hole, any hole!`,2600);await K.wait(1400);
  for(;;){if(!s.alive)return;phase='punch';K.yell=['crowd-shout','crowd-leftright'];K.mode='input';p.cur=null;slipT=0;
   if(K.cpuTurn()){await K.sleep(1200);const R=seededRandom(`${s.seed}:punchhole:${p.punched.size}`),open=[...Array(50).keys()].filter(j=>!p.punched.has(j));punch(open[Math.floor(R()*open.length)]);}
   else if(!K.mine(i)){const v=await remote('pp');if(v==null)return;punch(+v);}
   else await waitFor();
   if(!s.alive)return;K.mode='play';await K.sleep(1100);const v=p.slips[p.cur];
   if(v>=25000){sfx.jackpot(true);snd.crowd(4,1);p.kept=v;K.show('$25,000!','The top prize!',3,'#ffe23a');await K.wait(3000);break;}
   if(v>=5000){if(!snd.clip('ding-ding-ding')&&!snd.clip('bell'))sfx.ding();snd.crowd(2.2,.8);}else if(v>=1000)sfx.ding();else{sfx.ding();snd.voice('crowd-aww',{at:.3})||sfx.aww?.(.3);}
   if(!p.punches){p.kept=v;K.say(`That was your last punch: you keep ${K.money(v)}!`,2400);await K.wait(2400);break;}
   phase='choose';K.yell=['crowd-yesno'];K.mode='input';K.say(`${K.money(v)}! Keep it, or throw it away and punch again?`,2600);
   if(K.cpuTurn()){await K.sleep(1600);choose(v>=2500||(v>=1000&&p.punches<2)?1:0);}
   else if(!K.mine(i)){const c=await remote('pk');if(c==null)return;choose(+c);}
   else await waitFor();
   if(!s.alive)return;K.mode='play';if(phase==='kept'){p.kept=v;break;}sfx.peg?.(1);K.say('Into the trash it goes! Punch again!',1600);await K.wait(1200);}
  if(!s.alive)return;phase='';p.done=true;p.score=p.kept;p.mood=p.kept>=2500?'win':'normal';K.show(`YOU WIN ${K.money(p.kept)}!`,'',2.6,'#ffe23a');sfx.applause(2,.7);await K.wait(2700);}
 s.debug={get mode(){return K.mode;},get phase(){return phase;},P,get cur(){return K.cur;},answer,punch,choose,cell:i=>cell(i),set hurry(v){K.hurry=!!v;},get hits(){return K.hits.map(h=>({x:h.x,y:h.y,w:h.w,h:h.h}));},
  bot:net?()=>{if(!K.mine(K.cur))return '';const p=P[K.cur];if(phase==='ask'){answer(Math.random()<.5?'h':'l');return 'ask';}if(phase==='punch'){const open=[...Array(50).keys()].filter(j=>!p.punched.has(j));punch(open[Math.floor(Math.random()*open.length)]);return 'punch';}if(phase==='choose'){choose(Math.random()<.5?1:0);return 'choose';}K.hurry=true;return '';}:null};
 await K.run({title:'PUNCH-A-BUNCH',sub:'Earn punches, find the $25,000',col:'#ff3d6e',pass:K.net?'PUNCH-A-BUNCH online: higher or lower on four prices earns punches; punch the board for up to $25,000.':'PUNCH-A-BUNCH: say higher or lower on four prices. Every right answer is a punch on the board, up to $25,000. Keep the slip or punch again!',
  intro:[['Fifty holes, and one of them is worth $25,000!',2600],['Every price you call right, higher or lower, is a punch. Keep what you find, or throw it away and punch again!',3600]],
  ready:['stage-punch','stage-punch-tall','stage-punch-fold','punch-board','punch-paper','punch-slip','punch-logo'],play,
  result:()=>({scores:P.map(p=>p.score),lines:P.map(p=>K.money(p.score)),summary:`PUNCH-A-BUNCH · ${names[0]} ${K.money(P[0].score)} – ${names[1]} ${K.money(P[1].score)}`})});}
function ST(){return require("src/engines/gameshow/stage.js");}
function drawRef(g,W,H,slot){if(slot==='punch-board')drawBoard(g);else if(slot==='punch-paper')drawPaper(g);else if(slot==='punch-slip')drawSlip(g,null);}
Object.assign(exports,{punchABunch,drawBoard,drawPaper,drawSlip,drawRef,SLIPS});
