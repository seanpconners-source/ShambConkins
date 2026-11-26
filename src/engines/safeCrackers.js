// SAFE CRACKERS (game id safe-crackers, engine 'safecrackers'; in The Price Is Right's menu). Played like the show: two prizes are put
// in a giant safe. The combination is the price of the cheaper prize: three different digits, given to the contestant out of order;
// they arrange them (each digit used once) and try the combination ONCE. Right = the safe opens and both prizes are won.
// Score = both prices (0 if it stays shut). Prizes: a three-digit real product with no repeated digit (showPrizes MID_PRIZES) + a big
// one (GRAND_PRIZES). 1P vs CPU, 2P one phone, board. Online: the contestant's phone sends {sc:'430'}; both phones dial the same.
// Pictures (optional): safe / safe-open / safe-tile / safe-logo / stage-safe(-tall/-fold); sounds: tpir-safe-crackers (the music while
// they think, looped), bell / big-winner when it opens, buzzer + losing horn when it doesn't.
const SS=require("src/data/showSprites.js");
const SP=require("src/data/showPrizes.js");
const {createKit,shuffle,txt}=require("src/engines/gameshow/pricingKit.js");
const {seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const SG=SS.SAFE_GEOM,TG=SS.TILE_GEOM,TAU=Math.PI*2;
const uniq=n=>{const d=String(n);return d.length===3&&new Set(d).size===3;};
// ---- drawn fallbacks (picture px)
function drawSafe(g,open=false,t=0){const pic=SS.picture(open?'safe-open':'safe');if(pic){g.drawImage(pic,0,0,SG.w,SG.h);return;}
 g.save();const steel=g.createLinearGradient(0,0,SG.w,0);steel.addColorStop(0,'#5d6670');steel.addColorStop(.5,'#c3cad2');steel.addColorStop(1,'#5d6670');
 g.fillStyle='#2a2f36';g.beginPath();g.roundRect(40,40,SG.w-80,SG.h-80,40);g.fill();g.fillStyle=steel;g.beginPath();g.roundRect(70,70,SG.w-140,SG.h-170,30);g.fill();
 g.fillStyle='#22272d';g.fillRect(110,SG.h-110,120,70);g.fillRect(SG.w-230,SG.h-110,120,70);
 if(open){const [a,b,c,d]=SG.inside;g.fillStyle='#14100c';g.fillRect(a,b,c-a,d-b);g.strokeStyle='#ffd23f';g.lineWidth=8;g.strokeRect(a,b,c-a,d-b);g.fillStyle='#3a2a18';g.fillRect(a,(b+d)/2-8,c-a,16);
  const gl=g.createRadialGradient((a+c)/2,b+60,10,(a+c)/2,b+60,(c-a)*.8);gl.addColorStop(0,'rgba(255,240,170,.45)');gl.addColorStop(1,'rgba(255,240,170,0)');g.fillStyle=gl;g.fillRect(a,b,c-a,d-b);
  // the door swung open to the left
  g.fillStyle=steel;g.beginPath();g.moveTo(70,70);g.lineTo(150,110);g.lineTo(150,SG.h-150);g.lineTo(70,SG.h-100);g.closePath();g.fill();g.restore();return;}
 // rivets, hinges, the brass plate, the handle, the dial windows
 g.fillStyle='#8a929c';for(let i=0;i<10;i++)for(const yy of [100,SG.h-130]){g.beginPath();g.arc(110+i*(SG.w-220)/9,yy,9,0,TAU);g.fill();}
 g.fillStyle='#3a3f46';g.fillRect(52,200,30,120);g.fillRect(52,SG.h-380,30,120);
 const [a,b,c,d]=SG.dial;g.fillStyle='#b8902a';g.beginPath();g.roundRect(a-40,b-80,c-a+80,d-b+120,24);g.fill();g.fillStyle='#14100c';g.font='900 46px "SC Bangers",Impact,sans-serif';g.textAlign='center';g.fillText('COMBINATION',(a+c)/2,b-28);
 for(let k=0;k<3;k++){const w=(c-a)/3;g.fillStyle='#0c0e12';g.beginPath();g.roundRect(a+k*w+12,b,w-24,d-b,14);g.fill();}
 const hx=SG.w/2,hy=SG.handle[1];g.fillStyle='#2a2f36';g.beginPath();g.arc(hx,hy,90,0,TAU);g.fill();g.fillStyle='#d8dde2';g.beginPath();g.arc(hx,hy,62,0,TAU);g.fill();
 g.save();g.translate(hx,hy);g.rotate(t);g.strokeStyle='#d8dde2';g.lineWidth=26;g.lineCap='round';for(let k=0;k<3;k++){g.rotate(TAU/3);g.beginPath();g.moveTo(0,0);g.lineTo(0,-150);g.stroke();}g.restore();
 g.fillStyle='#14100c';g.beginPath();g.arc(hx,hy,22,0,TAU);g.fill();g.restore();}
function drawTile(g,digit='',lit=false){const pic=SS.picture('safe-tile');if(pic)g.drawImage(pic,0,0,TG.w,TG.h);
 else{g.save();g.fillStyle=lit?'#fff6c0':'#ffd23f';g.beginPath();g.roundRect(10,10,TG.w-20,TG.h-20,40);g.fill();g.strokeStyle='#8a5a10';g.lineWidth=12;g.stroke();g.fillStyle='#14062e';g.beginPath();g.roundRect(50,50,TG.w-100,TG.h-100,24);g.fill();g.restore();}
 if(digit!==''){g.save();g.font='900 220px "SC Bangers",Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#ff3a2a';g.shadowColor='#ff3a2a';g.shadowBlur=24;g.fillText(digit,TG.w/2,TG.h/2+10);g.restore();}}
async function safeCrackers(s){
 const K=createKit(s,{kind:'safe',clips:['safe-crackers','big-winner','losing-horn','buzzer','bell','ding','safe-creak','safe-slam'],song:'safe-crackers'}),{net,names,snd,sfx}=K;
 const smalls=SP.MID_PRIZES.filter(p=>uniq(p[2]));
 const P=names.map((n,i)=>{const R=seededRandom(`${s.seed}:safe:${i}`),sm=smalls[Math.floor(R()*smalls.length)],bg=SP.GRAND_PRIZES[Math.floor(R()*SP.GRAND_PRIZES.length)],code=String(sm[2]);
  let dg=shuffle(code.split(''),R);if(dg.join('')===code)dg=[dg[1],dg[2],dg[0]];
  return {small:{id:sm[0],name:sm[1],price:sm[2],em:sm[3]},big:{id:bg[0],name:bg[1],price:bg[2],em:bg[3]},code,digits:dg,slots:[null,null,null],tried:null,open:false,done:false,score:0,mood:'normal'};});
 for(const p of P){SP.prizePhoto(p.small.id);SP.prizePhoto(p.big.id);}
 let doorOpen=true,spin=0,dialRoll=-1,L={};
 function layout(){K.base();const {W,H,top,fs,wide}=K,tagH=fs*3;
  if(wide){const sh=H-top-tagH-fs*1.4,sw=Math.min(W*.5,sh*SG.w/SG.h),sk=sw/SG.w,col=W*.53;
   L={tags:{x:8,y:H-tagH-6,w:W-16,h:tagH},safe:{x:W*.03+(W*.5-sw)/2,y:top+fs*.2,k:sk},logo:{x:col+(W-col)/2,y:top+fs*2,w:Math.min(W-col-fs,fs*15)},
    prizes:{x:col,y:top+fs*4,w:W-col-fs,h:fs*4.4},tiles:{x:col,y:top+fs*9.6,w:W-col-fs,h:Math.min(fs*5.6,(H-top-tagH)*.28)},btn:{x:col+(W-col)*.18,y:top+fs*9.6+Math.min(fs*5.6,(H-top-tagH)*.28)+fs*.8,w:(W-col)*.64,h:fs*2.6},bub:{x:W*.27,y:top+fs*2.5,w:Math.min(W*.42,fs*15)}};}
  else{const lw=Math.min(W*.6,fs*14),ly=top+lw*.17,sy=ly+lw*.2+fs*.3,rest=H-sy-tagH-fs*1.2,tilesH=Math.min(fs*5.4,W*.22),sw=Math.min(W*.86,(rest-tilesH-fs*7.4)*SG.w/SG.h),sk=sw/SG.w,sh=SG.h*sk;
   L={tags:{x:8,y:H-tagH-8,w:W-16,h:tagH},safe:{x:(W-sw)/2,y:sy,k:sk},logo:{x:W/2,y:ly,w:lw},prizes:{x:W*.04,y:sy+sh+fs*.3,w:W*.92,h:fs*2.4},
    tiles:{x:W*.15,y:sy+sh+fs*2.9,w:W*.7,h:tilesH},btn:{x:W*.2,y:sy+sh+fs*3.3+tilesH,w:W*.6,h:fs*2.5},bub:{x:W/2,y:sy+sh*.25,w:Math.min(W*.86,fs*16)}};}
  // the safe stands on the stage floor (owner, Nov 25: "the safe [is] floating above the floor"): the studio picture is laid with its
  // floor line just behind the safe's foot
  L.foot=L.safe.y+SG.h*L.safe.k*.975;K.floorY=L.foot-SG.h*L.safe.k*.05;}
 function draw(){const g=K.begin();layout();const {fs,t}=K,p=P[K.cur],Sf=L.safe,k=Sf.k;
  ST().floorShadow(g,Sf.x+SG.w*k/2,L.foot,SG.w*k*1.05,.5);g.save();g.translate(Sf.x,Sf.y);g.scale(k,k);drawSafe(g,doorOpen,spin);
  if(doorOpen){const [a,b,c,d]=SG.inside,mid=(b+d)/2;[[p.big,b+20,mid-20],[p.small,mid+20,d-20]].forEach(([q,y0,y1])=>{const ph=SP.prizePhoto(q.id),bw=(c-a)*.8,bh=y1-y0-30;
   if(ph){const kk=Math.min(bw/ph.width,bh/ph.height);g.drawImage(ph,(a+c)/2-ph.width*kk/2,y1-ph.height*kk,ph.width*kk,ph.height*kk);}else{g.font=`${bh*.75}px serif`;g.textAlign='center';g.textBaseline='alphabetic';g.fillText(q.em,(a+c)/2,y1-bh*.05);}});}
  else{const [a,b,c,d]=SG.dial,w=(c-a)/3;for(let j=0;j<3;j++){const v=p.slots[j];let dg=v==null?'':p.digits[v];if(dialRoll>=0&&j>=dialRoll)dg=String(Math.floor(t*30+j*3)%10);
   g.save();g.translate(a+j*w+w/2,(b+d)/2);g.font=`900 ${(d-b)*.78}px "SC Bangers",Impact,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=p.open?'#7dff5a':'#ff3a2a';g.shadowColor=g.fillStyle;g.shadowBlur=20;g.fillText(dg,0,4);g.restore();
   if(K.mode==='input'&&!K.waiting()&&v!=null)K.hits.push({x:Sf.x+(a+j*w)*k,y:Sf.y+b*k,w:w*k,h:(d-b)*k,fn:()=>take(j)});}}
  g.restore();
  // GPT's safe picture carries the SAFE CRACKERS sign on top: no second logo then
  K.txt(g,'',0,0,1,'#fff');if(!SS.picture('safe'))ST().drawLogo(g,'safe-logo','SAFE CRACKERS',L.logo.x,L.logo.y,L.logo.w,t,{cols:['#ffe23a','#b8c4d0']});
  // what's in the safe
  const Pz=L.prizes;txt(g,`${p.small.name}  +  ${p.big.name.replace(/^an? /,'')}`.toUpperCase(),Pz.x+Pz.w/2,Pz.y+fs*.6,fs*.72,'#ffe23a',{max:Pz.w});
  txt(g,p.done?(p.open?`COMBINATION ${p.code} · WON ${K.money(p.score)}`:`IT WAS ${p.code}`):'The combination is the price of the smaller prize',Pz.x+Pz.w/2,Pz.y+fs*1.7,fs*.66,p.done?(p.open?'#7dff5a':'#ff8a6a'):'#bfe7ff',{max:Pz.w});
  // the three digits they were given
  if(!p.done){const T=L.tiles,tw=Math.min(T.w/3-fs,T.h*TG.w/TG.h),tk=tw/TG.w;p.digits.forEach((dg,j)=>{const used=p.slots.includes(j),x0=T.x+T.w/6*(j*2+1)-tw/2;g.save();g.globalAlpha=used?.25:1;g.translate(x0,T.y);g.scale(tk,tk);drawTile(g,dg,!used&&K.mode==='input');g.restore();
    if(K.mode==='input'&&!K.waiting()&&!used)K.hits.push({x:x0,y:T.y,w:tw,h:TG.h*tk,fn:()=>put(j)});});
   if(K.mode==='input'&&!K.waiting()){const full=p.slots.every(v=>v!=null);K.button(g,L.btn,full?'TRY THE COMBINATION':'TAP THE DIGITS IN ORDER',full?tryIt:null,{col:'#2fa84f',dim:!full});}
   else if(K.mode==='input')txt(g,`${names[K.cur].toUpperCase()} IS WORKING THE DIAL…`,L.btn.x+L.btn.w/2,L.btn.y+L.btn.h/2,fs*.85,'#bfe7ff',{max:L.btn.w*1.2});}
  K.tags(g,L.tags,i=>P[i].done?(P[i].open?K.money(P[i].score):'LOCKED OUT'):'—',P.map(q=>q.mood));K.overlay(g,L.bub);}
 // ---- arranging
 let tryDone=null;
 function put(j){const p=P[K.cur],at=p.slots.indexOf(null);if(at<0||p.slots.includes(j))return;p.slots[at]=j;sfx.click?.();}
 function take(at){const p=P[K.cur];p.slots[at]=null;sfx.click?.();}
 function tryIt(code){const p=P[K.cur];if(p.tried)return;if(code!=null){const ds=p.digits.slice();p.slots=code.split('').map(ch=>{const j=ds.findIndex((d,k)=>d===ch&&!p.slots.includes(k));return j;});
  const used=new Set();p.slots=code.split('').map(ch=>{const j=p.digits.findIndex((d,k)=>d===ch&&!used.has(k));used.add(j);return j;});}
  p.tried=p.slots.map(j=>p.digits[j]).join('');if(net&&K.mine(K.cur))net.send({sc:p.tried});const d=tryDone;tryDone=null;d?.();}
 s.on(document,'keydown',ev=>{if(s.paused||K.mode!=='input'||K.waiting())return;const p=P[K.cur];if(/^\d$/.test(ev.key)){const j=p.digits.findIndex((d,k)=>d===ev.key&&!p.slots.includes(k));if(j>=0)put(j);}
  else if(ev.key==='Backspace'){const at=[2,1,0].find(a=>p.slots[a]!=null);if(at!=null)take(at);}else if(ev.key==='Enter'&&p.slots.every(v=>v!=null))tryIt();});
 K.frame(dt=>{if(dialRoll>=0)spin+=dt*6;draw();});
 async function play(i){const p=P[i];K.cur=i;if(!doorOpen)snd.clip('safe-creak',{max:2,fout:.5});doorOpen=true;dialRoll=-1;
  K.say(`In the safe: ${p.small.name} and ${p.big.name}! The combination is the price of the ${p.small.name}.`,3600);await K.wait(3600);if(!s.alive)return;
  // the show's own door: tpir-safe-slam = the door swinging, a beat, then the slam (at 1.9 s); start it 1.2 s in so the slam lands as
  // the door shuts on screen; drawn thud if the recording isn't in
  if(snd.clip('safe-slam',{off:1.2})){await K.sleep(650);doorOpen=false;vibrate(30);await K.sleep(500);}else{doorOpen=false;sfx.clunk?.();vibrate(30);await K.sleep(450);}
  // the digits are on the tiles: the host says only what's in his bubble (owner, Nov 25: lines must match the screen)
  K.say('Here are your three digits. Use each one once. You get one try!',3000);await K.wait(1200);
  K.mode='input';snd.music(true);
  if(K.cpuTurn()){const sk=K.skill(),R=seededRandom(`${s.seed}:safecpu`),perms=[...new Set(['012','021','102','120','201','210'].map(o=>o.split('').map(n=>p.digits[+n]).join('')))];
   const pick=R()<.2+.45*sk?p.code:perms.filter(x=>x!==p.code)[Math.floor(R()*5)%Math.max(1,perms.length-1)]||p.code;
   await K.sleep(1800);const used=new Set();for(const ch of pick){const j=p.digits.findIndex((d,k)=>d===ch&&!used.has(k));used.add(j);put(j);await K.sleep(700);}await K.sleep(600);tryIt();}
  else if(!K.mine(i)){for(;;){const m=await K.recv();if(!m)return;if(m.sc){tryIt(String(m.sc));break;}}}
  else await new Promise(r=>{tryDone=r;});
  if(!s.alive)return;K.mode='play';snd.music(false);K.say('Let\'s try it…',1600);dialRoll=0;sfx.drumroll?.(1.6);
  for(let j=0;j<3;j++){await K.sleep(550);dialRoll=j+1;sfx.click?.();}dialRoll=-1;await K.sleep(500);
  p.open=p.tried===p.code;p.done=true;
  if(p.open){spin=0;for(let k2=0;k2<14;k2++){spin+=.12;await K.sleep(40);}snd.clip('safe-creak',{max:2.6,fout:.6});doorOpen=true;p.score=p.small.price+p.big.price;p.mood='win';sfx.bell?.();if(!snd.clip('bell'))sfx.ding();
   K.show('THE SAFE IS OPEN!',`${p.small.name} + ${p.big.name.replace(/^an? /,'')} · ${K.money(p.score)}`,3,'#7dff5a');sfx.jackpot(true);vibrate([30,40,30]);}
  else{p.mood='sad';sfx.buzz();await K.sleep(500);K.show('LOCKED!',`The combination was ${p.code}`,2.6,'#ff6a5a');if(!snd.clip('losing-horn'))sfx.aww?.();}
  await K.wait(3000);}
 s.debug={get mode(){return K.mode;},P,get cur(){return K.cur;},put,take,tryIt:c=>tryIt(c),set hurry(v){K.hurry=!!v;},get hits(){return K.hits.map(h=>({x:h.x,y:h.y,w:h.w,h:h.h}));},
  bot:net?()=>{if(!K.mine(K.cur))return '';const p=P[K.cur];if(K.mode==='input'&&!p.tried){tryIt(Math.random()<.5?p.code:p.digits.join(''));return 'try';}K.hurry=true;return '';}:null};
 await K.run({title:'SAFE CRACKERS',sub:'Crack the combination, win what\'s inside',col:'#c8d4e0',pass:K.net?'SAFE CRACKERS online: arrange three digits into the price of the smaller prize. One try opens the safe.':'SAFE CRACKERS: two prizes go in the safe. Put the three digits in the order of the smaller prize\'s price; one try, and the safe opens.',
  intro:[['Two prizes are going into our safe…',2400],['The combination is the price of the smaller one. Three different digits, one try!',3200]],
  ready:['stage-safe','stage-safe-tall','stage-safe-fold','safe','safe-open','safe-tile','safe-logo'],play,
  result:()=>({scores:P.map(p=>p.score),lines:P.map(p=>p.open?`Opened it · ${K.money(p.score)}`:'Locked out'),summary:`SAFE CRACKERS · ${names[0]} ${P[0].open?'opened it':'locked out'} – ${names[1]} ${P[1].open?'opened it':'locked out'}`})});}
function ST(){return require("src/engines/gameshow/stage.js");}
function drawRef(g,W,H,slot){if(slot==='safe')drawSafe(g,false,.3);else if(slot==='safe-open')drawSafe(g,true);else if(slot==='safe-tile')drawTile(g,'');}
Object.assign(exports,{safeCrackers,drawSafe,drawTile,drawRef});
