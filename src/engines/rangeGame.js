// RANGE GAME (game id range-game, engine 'rangegame'; in The Price Is Right's menu, tpirShow.js). Played like the show (2026 rules):
// a big prize, a $6,000 price scale and a $1,500 RANGE FINDER that starts at the bottom and slowly rises to the music. The contestant
// gets ONE press of the button to stop it; if the real price is inside the window, the prize is won. Score = the prize's price (0 if not).
// Each contestant plays for their own prize (real products, showPrizes.js GRAND_PRIZES). 1P = you, then a CPU; 2P one phone; board.
// Online: the contestant's phone sends {rg:f} (where the finder stopped, 0..1) and both phones show the same finish.
// Pictures (optional, drawn fallback): range-board / range-finder / range-button / range-logo / stage-range(-tall/-fold), the prize on the
// clock-platform; sounds: tpir-range-game (the finder music, looped while it rises), ding/bell/losing-horn, the crowd.
const SS=require("src/data/showSprites.js");
const SP=require("src/data/showPrizes.js");
const {createKit,shuffle,txt}=require("src/engines/gameshow/pricingKit.js");
const {clamp,seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const RG=SS.RANGE_GEOM,FG=SS.FINDER_GEOM;
const SCALE=6000,WIN=1500,RISE_S=16;
// ---- drawn fallbacks (picture px)
function drawBoard(g,lo=0){const pic=SS.picture('range-board'),[a,b,c,d]=RG.scale;if(pic)g.drawImage(pic,0,0,RG.w,RG.h);
 else{const gr=g.createLinearGradient(0,0,RG.w,0);gr.addColorStop(0,'#5a1060');gr.addColorStop(.5,'#9a2aa8');gr.addColorStop(1,'#5a1060');g.fillStyle=gr;g.beginPath();g.roundRect(20,20,RG.w-40,RG.h-40,40);g.fill();
  g.strokeStyle='#ffd23f';g.lineWidth=14;g.stroke();for(let i=0;i<26;i++){const yy=60+i*(RG.h-120)/25;for(const xx of [44,RG.w-44]){g.fillStyle=i%2?'#fff3b0':'#ffe070';g.beginPath();g.arc(xx,yy,9,0,Math.PI*2);g.fill();}}
  g.fillStyle='#14062e';g.fillRect(a-14,b-14,c-a+28,d-b+28);const sg=g.createLinearGradient(0,b,0,d);sg.addColorStop(0,'#ff4a2a');sg.addColorStop(.5,'#ffd23f');sg.addColorStop(1,'#2ac46a');g.fillStyle=sg;g.fillRect(a,b,c-a,d-b);}
 // the dollar marks: every $500, the game prints them
 g.save();g.textAlign='right';g.textBaseline='middle';for(let v=0;v<=SCALE;v+=500){const y=d-(d-b)*v/SCALE,big=v%1000===0;g.strokeStyle='#14062e';g.lineWidth=big?6:3;g.beginPath();g.moveTo(a,y);g.lineTo(a+(big?40:22),y);g.moveTo(c,y);g.lineTo(c-(big?40:22),y);g.stroke();
  if(big||v===SCALE){g.font=`900 ${big?44:34}px "SC Bangers",Impact,sans-serif`;const cream=!!SS.picture('range-board');g.lineWidth=cream?4:7;g.strokeStyle=cream?'rgba(255,248,230,.9)':'rgba(0,0,0,.8)';const s='$'+(lo+v).toLocaleString('en-US');g.strokeText(s,a-46,y);g.fillStyle=cream?'#123f12':'#fff';g.fillText(s,a-46,y);}}g.restore();}
function drawFinder(g,lit=false,t=0){const pic=SS.picture('range-finder'),[a,b,c,d]=FG.window;if(pic){g.drawImage(pic,0,0,FG.w,FG.h);return;}
 g.save();g.fillStyle=lit&&Math.floor(t*8)%2?'#fff':'#ffe23a';g.beginPath();g.rect(0,0,FG.w,FG.h);g.rect(a,b,c-a,d-b);g.fill('evenodd');g.strokeStyle='#14062e';g.lineWidth=6;g.strokeRect(a,b,c-a,d-b);g.strokeRect(3,3,FG.w-6,FG.h-6);
 g.fillStyle='rgba(255,255,255,.12)';g.fillRect(a,b,c-a,d-b);g.restore();}
function drawButton(g,down=false){const pic=SS.picture('range-button'),S=SS.BUTTON_GEOM;if(pic){g.drawImage(pic,0,down?8:0,S.w,S.h);return;}
 g.save();g.fillStyle='#3a3a44';g.beginPath();g.ellipse(200,300,170,70,0,0,Math.PI*2);g.fill();g.fillStyle='#8a8a96';g.fillRect(30,240,340,60);g.beginPath();g.ellipse(200,240,170,70,0,0,Math.PI*2);g.fill();
 const top=down?215:175;g.fillStyle='#8a0a10';g.fillRect(70,top,260,240-top+10);g.fillStyle='#e8202a';g.beginPath();g.ellipse(200,top,130,52,0,0,Math.PI*2);g.fill();g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(170,top-14,60,18,-.2,0,Math.PI*2);g.fill();g.restore();}
async function rangeGame(s){
 const K=createKit(s,{kind:'range',clips:['range-game','losing-horn','big-winner','ding','bell'],song:'range-game'}),{net,names,snd,sfx}=K;
 const R0=seededRandom(`${s.seed}:range`),order=shuffle(SP.GRAND_PRIZES,R0);
 const P=names.map((n,i)=>{const [id,name,price,em]=order[i%order.length],R=seededRandom(`${s.seed}:range:${i}`),lo=Math.max(0,Math.floor((price-300-R()*(SCALE-1100))/500)*500);
  return {prize:{id,name,price,em},lo,f:0,stopped:false,shown:0,won:false,score:0,done:false,mood:'normal'};});
 for(const p of P)SP.prizePhoto(p.prize.id);
 let rising=false,press=0,reveal=-1,L={};
 const finderLo=p=>p.lo+p.f*(SCALE-WIN);
 function layout(){K.base();const {W,H,top,fs,wide}=K,tagH=fs*3;
  if(wide){const bh=H-top-tagH-fs*1.6,bw=bh*RG.w/RG.h,bx=W*.4-bw/2,by=top+fs*.4;
   L={tags:{x:8,y:H-tagH-6,w:W-16,h:tagH},board:{x:bx,y:by,k:bh/RG.h},prize:{x:W*.02,y:top+fs*2,w:Math.max(fs*10,bx-W*.04),h:bh*.62},
    logo:{x:(bx+bw+W)/2,y:top+fs*2.2,w:Math.min(W-bx-bw-fs*2,fs*16)},button:{x:(bx+bw+W)/2,y:by+bh*.58,w:Math.min(W-bx-bw-fs*2,fs*11)},info:{x:(bx+bw+W)/2,y:by+bh*.3},bub:{x:W*.2,y:top+fs*3,w:Math.min(W*.36,fs*14)}};}
  else{const lw=Math.min(W*.6,fs*14),bh=H-top-lw*.36-tagH-fs*2.2,bw=Math.min(W*.42,bh*RG.w/RG.h),bh2=bw*RG.h/RG.w,by=top+lw*.36+fs*.6;
   L={tags:{x:8,y:H-tagH-8,w:W-16,h:tagH},board:{x:W*.03,y:by,k:bh2/RG.h},prize:{x:W*.03+bw+fs*.4,y:by,w:W-bw-W*.06-fs*.4,h:bh2*.42},
    logo:{x:W/2,y:top+lw*.18,w:lw},button:{x:W*.03+bw+(W-bw-W*.03)/2,y:by+bh2*.72,w:Math.min(W-bw-W*.08,fs*10)},info:{x:W*.03+bw+(W-bw-W*.03)/2,y:by+bh2*.48},bub:{x:W*.62,y:by+bh2*.12,w:Math.min(W*.6,fs*14)}};}
  // the board stands on the stage floor (owner, Nov 25: nothing floating): the studio picture's floor line goes just behind its foot
  K.floorY=L.board.y+RG.h*L.board.k*.97;}
 const by2=(p,v)=>{const [,b,,d]=RG.scale;return L.board.y+(d-(d-b)*(v-p.lo)/SCALE)*L.board.k;};
 function draw(){const g=K.begin();layout();const {fs,t}=K,p=P[K.cur],B=L.board,k=B.k;
  // the prize on its turntable
  {const Pz=L.prize,PG=SS.PLATFORM_GEOM,pk=Math.min(Pz.w/PG.w,Pz.h/PG.h*1.4),px=Pz.x+Pz.w/2,py=Pz.y+Pz.h;g.save();g.translate(px-PG.w*pk/2,py-PG.h*pk*.8);g.scale(pk,pk);require("src/engines/clockGame.js").drawPlatform(g);g.restore();
   const ph=SP.prizePhoto(p.prize.id),[tx,ty]=PG.top,cx=px-PG.w*pk/2+tx*pk,cy=py-PG.h*pk*.8+ty*pk,bw=Pz.w*.8,bh=Pz.h*.62;
   if(ph){const kk=Math.min(bw/ph.width,bh/ph.height);g.drawImage(ph,cx-ph.width*kk/2,cy-ph.height*kk,ph.width*kk,ph.height*kk);}else{g.font=`${bh*.7}px serif`;g.textAlign='center';g.textBaseline='alphabetic';g.fillText(p.prize.em,cx,cy-bh*.08);}
   txt(g,p.prize.name.toUpperCase(),px,py+fs*.7,fs*.8,'#ffe23a',{max:Pz.w*1.05});}
  // the board, the finder and (at the end) the price marker
  g.save();g.translate(B.x,B.y);g.scale(k,k);drawBoard(g,p.lo);const [a,bb,c2,d]=RG.scale,[wa,wb,wc,wd]=FG.window,sh=(d-bb)*WIN/SCALE,fy=d-(d-bb)*(p.f*(SCALE-WIN)+WIN)/SCALE,fk=sh/(wd-wb);
  g.save();g.translate((a+c2)/2-(wa+wc)/2*fk,fy-wb*fk);g.scale(fk,fk);drawFinder(g,p.won&&reveal===K.cur,t);g.restore();
  if(reveal===K.cur){const y=d-(d-bb)*(p.shown-p.lo)/SCALE;g.fillStyle='#fff';g.strokeStyle='#c8102e';g.lineWidth=6;g.beginPath();g.moveTo(c2+60,y);g.lineTo(c2+16,y-22);g.lineTo(c2+16,y+22);g.closePath();g.fill();g.stroke();
   g.beginPath();g.moveTo(a-6,y);g.lineTo(c2+16,y);g.stroke();}
  g.restore();
  const fl=finderLo(p);txt(g,`${K.money(Math.round(fl/10)*10)} – ${K.money(Math.round(fl/10)*10+WIN)}`,B.x+(a+c2)/2*k,by2(p,fl+WIN/2),fs*.78,'#fff',{max:(c2-a)*k*1.3});
  ST().drawLogo(g,'range-logo','RANGE GAME',L.logo.x,L.logo.y,L.logo.w,t,{cols:['#ffe23a','#ff8a2a']});
  const I=L.info;if(reveal===K.cur)txt(g,`PRICE: ${K.money(p.shown)}`,I.x,I.y,fs*1.4,p.won?'#7dff5a':'#fff',{font:'"SC Bangers",Impact,sans-serif',w:400,max:L.button.w*1.6});
  else txt(g,`WINDOW $1,500 WIDE ON A $6,000 SCALE`,I.x,I.y,fs*.62,'#bfe7ff',{max:L.button.w*1.6});
  // the stop button
  const Bt=L.button,S=SS.BUTTON_GEOM,bk=Bt.w/S.w;g.save();g.translate(Bt.x-Bt.w/2,Bt.y-S.h*bk/2);g.scale(bk,bk);drawButton(g,press>0);g.restore();
  if(rising&&!K.waiting()){K.hits.push({x:Bt.x-Bt.w/2,y:Bt.y-S.h*bk/2,w:Bt.w,h:S.h*bk,fn:stop});txt(g,'PRESS TO STOP!',Bt.x,Bt.y+S.h*bk*.55,fs*.95,Math.floor(t*3)%2?'#ffe23a':'#fff');}
  else if(rising)txt(g,`${names[K.cur].toUpperCase()}'S FINGER IS ON THE BUTTON…`,Bt.x,Bt.y+S.h*bk*.55,fs*.7,'#bfe7ff',{max:Bt.w*1.8});
  K.tags(g,L.tags,i=>P[i].done?(P[i].won?K.money(P[i].score):'MISSED'):i===K.cur&&rising?'STOP IT!':'—',P.map(q=>q.mood));
  K.overlay(g,L.bub);}
 // ---- stopping the finder
 let stopDone=null;
 function stop(f){if(!rising)return;const p=P[K.cur];if(f!=null)p.f=clamp(f,0,1);rising=false;p.stopped=true;press=.25;sfx.click?.();vibrate(25);snd.music(false);
  if(net&&K.mine(K.cur))net.send({rg:Math.round(p.f*1e5)/1e5});const d=stopDone;stopDone=null;d?.();}
 K.onTap=null;
 s.on(document,'keydown',ev=>{if(s.paused)return;if((ev.key===' '||ev.key==='Enter')&&rising&&!K.waiting())stop();});
 K.frame(dt=>{const p=P[K.cur];if(rising){p.f=Math.min(1,p.f+dt/RISE_S);if(p.f>=1&&!K.waiting())stop();}if(press>0)press-=dt;draw();});
 async function play(i){const p=P[i];K.cur=i;reveal=-1;p.f=0;
  K.say(`You're playing for ${p.prize.name}! The range finder covers $1,500. Stop it when you think the price is inside.`,3400);await K.wait(3400);if(!s.alive)return;
  K.mode='input';rising=true;snd.music(true);sfx.drumroll?.(.6);
  if(K.cpuTurn()){const sk=K.skill(),R=seededRandom(`${s.seed}:rangecpu`),belief=p.prize.price+(R()+R()+R()-1.5)*(1700-1200*sk),target=clamp((belief-WIN/2-p.lo)/(SCALE-WIN),0,1);
   while(s.alive&&rising&&p.f<target)await K.sleep(40);if(rising)stop();}
  else if(!K.mine(i)){for(;;){const m=await K.recv();if(!m)return;if(m.rg!=null){stop(+m.rg);break;}}}
  else await new Promise(r=>{stopDone=r;});
  if(!s.alive)return;K.mode='play';await K.wait(700);
  K.say('Let\'s see if the actual retail price is in your range…',2200);await K.wait(1600);reveal=i;p.shown=p.lo;const end=p.prize.price;sfx.drumroll?.(1.6);
  for(let k2=0;k2<=40&&s.alive;k2++){p.shown=p.lo+(end-p.lo)*(1-Math.pow(1-k2/40,2.2));await K.sleep(40);}p.shown=end;
  const fl=finderLo(p);p.won=end>=fl&&end<=fl+WIN;p.done=true;p.score=p.won?end:0;sfx.ding();
  if(p.won){p.mood='win';K.show('YOU WIN!',`${p.prize.name} · ${K.money(end)}`,2.8,'#7dff5a');sfx.jackpot(true);vibrate([30,40,30]);}
  else{p.mood='sad';K.show('SO CLOSE!',`It was ${K.money(end)}`,2.6,'#ff6a5a');if(!snd.clip('losing-horn'))sfx.aww?.();}
  await K.wait(2900);}
 s.debug={get mode(){return K.mode;},P,get cur(){return K.cur;},get rising(){return rising;},stop:f=>stop(f),set hurry(v){K.hurry=!!v;},finderLo:i=>finderLo(P[i??K.cur]),
  get button(){const b=K.hits[K.hits.length-1];return b?{x:b.x,y:b.y,w:b.w,h:b.h}:null;},
  bot:net?()=>{if(!K.mine(K.cur))return '';const p=P[K.cur];if(rising&&finderLo(p)+WIN/2>=p.prize.price+(Math.random()-.5)*900){stop();return 'stop';}K.hurry=!rising;return '';}:null};
 await K.run({title:'RANGE GAME',sub:'Stop the range finder on the price',col:'#ffb43a',pass:K.net?'RANGE GAME online: one press to stop the $1,500 range finder on the price of your prize.':'RANGE GAME: the range finder rises up a $6,000 price scale. One press stops it: if the price is inside the window, you win the prize.',
  intro:[['The range finder is $1,500 wide. It rises up a $6,000 price range…',3000],['…and you get ONE chance to stop it. If the actual retail price is inside, you win!',3200]],
  ready:['stage-range','stage-range-tall','stage-range-fold','range-board','range-finder','range-button','range-logo','clock-platform'],play,
  result:()=>({scores:P.map(p=>p.score),lines:P.map(p=>p.won?`${p.prize.name} · ${K.money(p.score)}`:'Missed it'),summary:`RANGE GAME · ${names[0]} ${P[0].won?'won '+K.money(P[0].score):'missed'} – ${names[1]} ${P[1].won?'won '+K.money(P[1].score):'missed'}`})});}
function ST(){return require("src/engines/gameshow/stage.js");}
// template reference drawings (tools/gameshow-templates.mjs)
function drawRef(g,W,H,slot){if(slot==='range-board')drawBoard(g,2000);else if(slot==='range-finder')drawFinder(g);else if(slot==='range-button')drawButton(g);}
Object.assign(exports,{rangeGame,drawBoard,drawFinder,drawButton,drawRef,SCALE,WIN});
