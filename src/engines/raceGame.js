// RACE GAME (game id race-game, engine 'racegame'; in The Price Is Right's menu). Played like the show: four prizes, four price tags,
// 45 seconds. Put a tag on every prize and pull the lever: the board lights up HOW MANY are right (not which). Rearrange and pull again
// as often as the clock allows. Four right = all four prizes at once; when time runs out you win the prizes that are correctly tagged.
// Score = the prices of the prizes won. Prizes: real products with different prices (showPrizes MID_PRIZES). 1P vs CPU, 2P one phone,
// board. Online: the contestant's phone runs the clock and sends {ra:[tag per prize], l:lights|-1, left} on every change; the other
// phone mirrors it. Pictures (optional): race-podium / race-tag / race-board / race-lever / race-logo / stage-race(-tall/-fold);
// sounds: tpir-race-game (the race music under the 45 seconds), ding per light, bell / big-winner for four, buzzer at the end.
const SS=require("src/data/showSprites.js");
const SP=require("src/data/showPrizes.js");
const {createKit,shuffle,txt}=require("src/engines/gameshow/pricingKit.js");
const {clamp,seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const PG=SS.PODIUM_GEOM,TG=SS.RTAG_GEOM,BG=SS.RBOARD_GEOM,LG=SS.LEVER_GEOM,TAU=Math.PI*2,CLOCK=45;
const PERMS=(()=>{const out=[];const rec=(a,rest)=>{if(!rest.length)return out.push(a);rest.forEach((v,i)=>rec(a.concat(v),rest.filter((_,j)=>j!==i)));};rec([],[0,1,2,3]);return out;})();
// ---- drawn fallbacks (picture px)
function drawPodium(g){const pic=SS.picture('race-podium');if(pic){g.drawImage(pic,0,0,PG.w,PG.h);return;}
 const gr=g.createLinearGradient(0,0,PG.w,0);gr.addColorStop(0,'#103a8a');gr.addColorStop(.5,'#2a6ad8');gr.addColorStop(1,'#103a8a');g.fillStyle=gr;g.beginPath();g.moveTo(110,320);g.lineTo(490,320);g.lineTo(530,680);g.lineTo(70,680);g.closePath();g.fill();
 g.fillStyle='#ffd23f';g.beginPath();g.ellipse(300,320,210,30,0,0,TAU);g.fill();g.fillStyle='#e0b020';g.fillRect(60,660,480,26);
 g.fillStyle='#c8c8d0';g.beginPath();g.arc(PG.tag[0],PG.tag[1]-70,12,0,TAU);g.fill();}
function drawTag(g,price=null,lit=false){const pic=SS.picture('race-tag');if(pic)g.drawImage(pic,0,0,TG.w,TG.h);
 else{g.save();g.fillStyle=lit?'#fff6c0':'#fffbe6';g.beginPath();g.moveTo(70,10);g.lineTo(TG.w-14,10);g.lineTo(TG.w-14,TG.h-10);g.lineTo(70,TG.h-10);g.lineTo(10,TG.h/2);g.closePath();g.fill();
  g.strokeStyle='#c8102e';g.lineWidth=10;g.stroke();g.fillStyle='#8a8a8a';g.beginPath();g.arc(60,TG.h/2,14,0,TAU);g.fill();g.restore();}
 if(price!=null){g.save();g.font='900 120px "SC Bangers",Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#c8102e';g.fillText('$'+price,(TG.text[0]+TG.text[2])/2,(TG.text[1]+TG.text[3])/2+6);g.restore();}}
function drawBoard(g,lights=0,t=0){const pic=SS.picture('race-board');if(pic)g.drawImage(pic,0,0,BG.w,BG.h);
 else{g.save();g.fillStyle='#14062e';g.beginPath();g.roundRect(10,10,BG.w-20,BG.h-20,40);g.fill();g.strokeStyle='#ffd23f';g.lineWidth=14;g.stroke();
  g.font='900 70px "SC Bangers",Impact,sans-serif';g.textAlign='center';g.fillStyle='#ffd23f';g.fillText('CORRECTLY PRICED',BG.w/2,110);g.restore();}
 BG.lights.forEach(([lx,ly,r],i)=>{const on=i<lights;g.save();g.fillStyle=on?'#ffe23a':'#3a2a10';if(on){g.shadowColor='#ffe23a';g.shadowBlur=40;}g.beginPath();g.arc(lx,ly,r,0,TAU);g.fill();
  if(!SS.picture('race-board')){g.strokeStyle='#8a6a20';g.lineWidth=8;g.stroke();}g.restore();});}
function drawLever(g,pull=0){const pic=SS.picture('race-lever'),[px,py]=LG.pivot;g.save();g.translate(px,py);g.rotate(pull*1.1);g.translate(-px,-py);
 if(pic)g.drawImage(pic,0,0,LG.w,LG.h);else{g.fillStyle='#c0c4cc';g.fillRect(px-14,60,28,py-60);g.fillStyle='#e8202a';g.beginPath();g.arc(px,60,52,0,TAU);g.fill();g.fillStyle='rgba(255,255,255,.4)';g.beginPath();g.arc(px-16,44,16,0,TAU);g.fill();}
 g.restore();if(!pic){g.fillStyle='#3a3f46';g.beginPath();g.arc(px,py,40,0,TAU);g.fill();}}
async function raceGame(s){
 const K=createKit(s,{kind:'race',clips:['race-game','big-winner','buzzer','bell','ding','losing-horn','ding-ding-ding'],song:'race-game'}),{net,names,snd,sfx}=K;
 const P=names.map((n,i)=>{const R=seededRandom(`${s.seed}:race:${i}`),pool=shuffle(SP.MID_PRIZES,R),seen=new Set(),pr=[];for(const q of pool){if(seen.has(q[2]))continue;seen.add(q[2]);pr.push({id:q[0],name:q[1],price:q[2],em:q[3]});if(pr.length===4)break;}
  return {prizes:pr,tags:shuffle(pr.map(q=>q.price),R),at:[null,null,null,null],lights:-1,pulls:0,left:CLOCK,done:false,won:[],score:0,mood:'normal'};});
 for(const p of P)for(const q of p.prizes)SP.prizePhoto(q.id);
 let sel=null,pull=0,clockOn=false,lastSec=CLOCK,locked=0,drag=null,L={};
 const onPodium=(p,ti)=>p.at.indexOf(ti);
 function layout(){K.base();const {W,H,top,fs,wide}=K,tagH=fs*3;
  if(wide){const lw=Math.min(W*.32,fs*14),pw=Math.min(W*.68/4,(H-top-tagH)*.55*PG.w/PG.h),py=top+lw*.36+fs*.4,ph=pw*PG.h/PG.w,bw=W-W*.72-fs;
   L={tags:{x:8,y:H-tagH-6,w:W-16,h:tagH},logo:{x:W*.36,y:top+lw*.18,w:lw},pods:[0,1,2,3].map(i=>({x:W*.02+i*W*.7/4+(W*.7/4-pw)/2,y:py,w:pw,h:ph})),
    rack:{x:W*.02,y:py+ph+fs*.5,w:W*.7,h:Math.min(fs*3.4,H-tagH-py-ph-fs*1.2)},board:{x:W*.73,y:top+fs*2.6,w:bw,h:bw*BG.h/BG.w},lever:{x:W*.73+bw*.5,y:top+fs*2.8+bw*BG.h/BG.w,h:Math.min(H-top-tagH-fs*5-bw*BG.h/BG.w,bw*.9)},
    clock:{x:W*.73+bw/2,y:top+fs*1.2},bub:{x:W*.36,y:py+ph*.25,w:Math.min(W*.5,fs*15)}};}
  else{const lw=Math.min(W*.6,fs*13),ly=top+lw*.17,by=ly+lw*.2+fs*.4,bw=W*.5,bh=bw*BG.h/BG.w,pw=Math.min(W*.44,(H-by-bh-tagH-fs*8)*.5*PG.w/PG.h),ph=pw*PG.h/PG.w,py=by+bh+fs*.6;
   L={tags:{x:8,y:H-tagH-8,w:W-16,h:tagH},logo:{x:W/2,y:ly,w:lw},board:{x:W*.06,y:by,w:bw,h:bh},lever:{x:W*.06+bw+W*.1,y:by+bh*.08,h:bh*.95},clock:{x:W*.06+bw+W*.26,y:by+bh*.5},
    pods:[0,1,2,3].map(i=>({x:W/2+(i%2?W*.02:-W*.02-pw),y:py+Math.floor(i/2)*(ph+fs*.2),w:pw,h:ph})),rack:{x:W*.04,y:py+2*ph+fs*.6,w:W*.92,h:Math.min(fs*3.2,H-tagH-py-2*ph-fs*1.4)},bub:{x:W/2,y:py+ph*.3,w:Math.min(W*.86,fs*15)}};}
  // the podiums stand on the stage floor (owner, Nov 25: nothing floating): the floor line goes behind the first podiums' foot
  K.floorY=L.pods[0].y+L.pods[0].h*.95;}
 // where tag ti is drawn: on its podium's hook, else in the rack
 function tagBox(p,ti){const fs=K.fs,on=onPodium(p,ti);if(on>=0){const b=L.pods[on],k=b.w/PG.w,tw=TG.w*k*.75;return {x:b.x+PG.tag[0]*k-tw/2,y:b.y+PG.tag[1]*k-tw*TG.h/TG.w/2,w:tw,h:tw*TG.h/TG.w};}
  const R=L.rack,free=p.tags.map((_,j)=>j).filter(j=>onPodium(p,j)<0),idx=free.indexOf(ti),tw=Math.min(R.w/4-fs*.4,R.h*TG.w/TG.h),th=tw*TG.h/TG.w;return {x:R.x+R.w/4*(idx+.5)-tw/2,y:R.y+(R.h-th)/2,w:tw,h:th};}
 function draw(){const g=K.begin();layout();const {fs,t}=K,p=P[K.cur];
  ST().drawLogo(g,'race-logo','RACE GAME',L.logo.x,L.logo.y,L.logo.w,t,{cols:['#ffe23a','#4ad0ff']});
  // the board + lever + clock
  {const B=L.board,k=B.w/BG.w;g.save();g.translate(B.x,B.y);g.scale(k,k);drawBoard(g,Math.max(0,p.lights),t);g.restore();
   const Lv=L.lever,lk=Lv.h/LG.h;g.save();g.translate(Lv.x-LG.pivot[0]*lk,Lv.y);g.scale(lk,lk);drawLever(g,pull);g.restore();
   const can=K.mode==='input'&&!K.waiting()&&p.at.every(v=>v!=null)&&locked<=0;if(can)K.hits.push({x:Lv.x-LG.w*lk,y:Lv.y,w:LG.w*lk*2,h:Lv.h,fn:pullLever});
   if(K.mode==='input'&&!K.waiting())txt(g,can?'PULL!':p.at.every(v=>v!=null)?'':'TAG ALL 4',Lv.x,Lv.y+Lv.h+fs*.4,fs*.8,can&&Math.floor(t*3)%2?'#ffe23a':'#fff');
   const C=L.clock,sec=Math.ceil(p.left);txt(g,`0:${String(Math.max(0,sec)).padStart(2,'0')}`,C.x,C.y,fs*2.2,sec<=10?'#ff3a2a':'#7dff5a',{font:'"SC Bangers",Impact,sans-serif',w:400});}
  // podiums + prizes + their prices once revealed
  L.pods.forEach((b,i)=>{const q=p.prizes[i],k=b.w/PG.w;g.save();g.translate(b.x,b.y);g.scale(k,k);drawPodium(g);g.restore();
   const ph=SP.prizePhoto(q.id),cx=b.x+PG.top[0]*k,cy=b.y+PG.top[1]*k,bw=b.w*.86,bh=b.h*.38;if(ph){const kk=Math.min(bw/ph.width,bh/ph.height);g.drawImage(ph,cx-ph.width*kk/2,cy-ph.height*kk,ph.width*kk,ph.height*kk);}
   else{g.font=`${bh*.8}px serif`;g.textAlign='center';g.textBaseline='alphabetic';g.fillText(q.em,cx,cy-bh*.05);}
   txt(g,q.name.toUpperCase(),cx,b.y+b.h+fs*.1,fs*.55,p.done&&p.won.includes(i)?'#7dff5a':'#fff',{w:800,max:b.w*1.05,base:'top'});
   if(p.done)txt(g,p.won.includes(i)?'WON!':K.money(q.price),cx,b.y+b.h*.88,fs*.8,p.won.includes(i)?'#7dff5a':'#ffd75a');
   if(K.mode==='input'&&!K.waiting())K.hits.push({x:b.x,y:b.y,w:b.w,h:b.h,fn:()=>placeOn(i)});});
  // the tags (the selected one lifted)
  p.tags.forEach((price,ti)=>{let bx=tagBox(p,ti);if(drag&&drag.ti===ti&&drag.moved)bx={...bx,x:drag.x-bx.w/2,y:drag.y-bx.h/2};const lift=sel===ti?-fs*.4:0,k=bx.w/TG.w;
   g.save();g.translate(bx.x,bx.y+lift);g.scale(k,k);drawTag(g,price,sel===ti);g.restore();
   if(K.mode==='input'&&!K.waiting())K.hits.push({x:bx.x,y:bx.y,w:bx.w,h:bx.h,fn:()=>pick(ti)});});
  if(K.waiting()&&K.mode==='input')txt(g,`${names[K.cur].toUpperCase()} IS RACING…`,L.rack.x+L.rack.w/2,L.rack.y-fs*.2,fs*.8,'#bfe7ff');
  K.tags(g,L.tags,i=>P[i].done?(P[i].score?K.money(P[i].score):'NO PRIZES'):i===K.cur&&p.lights>=0?`${p.lights} RIGHT`:'—',P.map(q=>q.mood));K.overlay(g,L.bub);}
 // ---- moving tags: pick one (rack or podium), then a podium; a tag already there swaps back
 function pick(ti){if(sel===ti){sel=null;return;}if(sel!=null){const on=onPodium(P[K.cur],ti);if(on>=0){placeOn(on);return;}}sel=ti;sfx.click?.();}
 function placeOn(i){const p=P[K.cur];if(sel==null){const ti=p.at[i];if(ti!=null){sel=ti;}return;}const from=onPodium(p,sel),there=p.at[i];if(from===i){sel=null;return;}
  p.at[i]=sel;if(from>=0)p.at[from]=there;sel=null;p.lights=-1;sfx.peg?.(2);vibrate(6);sync();}
 function pullLever(){const p=P[K.cur];if(!p.at.every(v=>v!=null)||locked>0)return;locked=1.3;pull=1;p.pulls++;const n=p.at.filter((ti,i)=>p.tags[ti]===p.prizes[i].price).length;p.lights=0;
  for(let k=0;k<n;k++)setTimeout(()=>{if(s.alive){p.lights=k+1;sfx.ding();}},250+k*220);if(!n)setTimeout(()=>{if(s.alive)sfx.buzz();},300);
  setTimeout(()=>{if(s.alive&&n===4)finishRun();},300+n*220);sync(n);}
 function sync(n){if(net&&K.mine(K.cur))net.send({ra:P[K.cur].at.slice(),l:n==null?-1:n,left:Math.round(P[K.cur].left*10)/10});}
 let runDone=null;function finishRun(){if(!clockOn&&!runDone)return;clockOn=false;const d=runDone;runDone=null;d?.();}
 // drag a tag straight onto a podium
 K.onDown=pt=>false;
 s.on(K.c,'pointerdown',ev=>{if(s.paused||K.mode!=='input'||K.waiting())return;const pt=s.pointer(ev),p=P[K.cur];for(let ti=0;ti<4;ti++){const b=tagBox(p,ti);if(K.inBox(pt,b)){drag={ti,x:pt.x,y:pt.y,x0:pt.x,y0:pt.y,moved:false};return;}}});
 K.onMove=pt=>{if(!drag)return;drag.x=pt.x;drag.y=pt.y;if(Math.hypot(pt.x-drag.x0,pt.y-drag.y0)>12)drag.moved=true;};
 K.onUp=pt=>{const d=drag;drag=null;if(!d||!d.moved||!pt)return;const i=L.pods.findIndex(b=>K.inBox(pt,b));if(i>=0){sel=d.ti;placeOn(i);}else sel=null;};
 K.frame(dt=>{const p=P[K.cur];if(pull>0)pull=Math.max(0,pull-dt*1.6);if(locked>0)locked-=dt;
  if(clockOn&&!K.waiting()){p.left=Math.max(0,p.left-dt);const sec=Math.ceil(p.left);if(sec<lastSec){lastSec=sec;if(sec<=10)sfx.tick?.();}if(p.left<=0)finishRun();}
  else if(clockOn&&K.waiting()&&!K.cpuTurn())p.left=Math.max(0,p.left-dt);
  else if(clockOn&&K.cpuTurn()){p.left=Math.max(0,p.left-dt);if(p.left<=0)finishRun();}
  draw();});
 async function cpuRace(p){const sk=K.skill(),R=seededRandom(`${s.seed}:racecpu`),belief=p.prizes.map(q=>q.price*(1+(R()-.5)*(.9-.7*sk)));
  const rank=a=>a.map((v,i)=>i).sort((x,y)=>a[x]-a[y]),bi=rank(belief),ti=rank(p.tags);let cands=PERMS.slice();
  // first try: biggest belief gets the biggest tag
  let want=[0,0,0,0];bi.forEach((pi,r)=>want[pi]=ti[r]);
  for(;;){if(!s.alive||!clockOn)return;for(let i=0;i<4;i++){if(p.at[i]===want[i])continue;await K.sleep(650);if(!clockOn)return;sel=want[i];placeOn(i);}
   await K.sleep(500);if(!clockOn)return;pullLever();const n=p.at.filter((t2,i)=>p.tags[t2]===p.prizes[i].price).length;await K.sleep(1400);if(n===4||!clockOn)return;
   const now=p.at.slice();cands=cands.filter(c=>c.filter((t2,i)=>t2===now[i]).length===n);const score=c=>c.reduce((a,t2,i)=>a+Math.abs(Math.log(p.tags[t2]/belief[i])),0);cands.sort((a,b)=>score(a)-score(b));want=cands[0]||want;}}
 async function play(i){const p=P[i];K.cur=i;sel=null;lastSec=CLOCK;
  K.say(`Four prizes, four price tags, 45 seconds. Tag them all, pull the lever, and see how many are right!`,3400);await K.wait(3400);if(!s.alive)return;
  K.show('GO!','',1,'#7dff5a');sfx.fanfare?.();K.mode='input';clockOn=true;snd.music(true);
  const done=new Promise(r=>{runDone=r;});
  if(K.cpuTurn())cpuRace(p);
  else if(!K.mine(i))(async()=>{for(;;){const m=await K.recv();if(!m){finishRun();return;}if(m.ra){p.at=m.ra.slice();p.left=+m.left;if(m.l>=0){pull=1;p.lights=0;for(let k=0;k<m.l;k++)setTimeout(()=>{if(s.alive){p.lights=k+1;sfx.ding();}},250+k*220);}else p.lights=-1;}if(m.rf){p.at=m.rf[0].slice();p.left=+m.rf[1];finishRun();return;}}})();
  await done;if(!s.alive)return;K.mode='play';snd.music(false);sel=null;
  if(net&&K.mine(i))net.send({rf:[p.at.slice(),Math.round(p.left*10)/10]});
  p.won=[0,1,2,3].filter(k=>p.at[k]!=null&&p.tags[p.at[k]]===p.prizes[k].price);p.score=p.won.reduce((a,k)=>a+p.prizes[k].price,0);p.done=true;p.lights=p.won.length;
  if(p.won.length===4){p.mood='win';K.show('ALL FOUR!',`With ${Math.ceil(p.left)} seconds left · ${K.money(p.score)}`,3,'#7dff5a');snd.clip('ding-ding-ding');sfx.jackpot(true);vibrate([30,40,30]);}
  else{sfx.buzz();await K.sleep(400);p.mood=p.won.length?'normal':'sad';K.show('TIME!',p.won.length?`You win ${p.won.length} of 4 · ${K.money(p.score)}`:'No prizes this time',2.8,p.won.length?'#ffe23a':'#ff6a5a');if(!p.won.length&&!snd.clip('losing-horn'))sfx.aww?.();}
  await K.wait(3200);}
 s.debug={get mode(){return K.mode;},P,get cur(){return K.cur;},pick,placeOn,pullLever,set hurry(v){K.hurry=!!v;},solve:()=>{const p=P[K.cur];p.prizes.forEach((q,i)=>{const ti=p.tags.indexOf(q.price);sel=ti;placeOn(i);});},
  get pods(){return L.pods;},tagBox:ti=>tagBox(P[K.cur],ti),get lever(){return L.lever;},
  bot:net?()=>{if(!K.mine(K.cur))return '';const p=P[K.cur];if(K.mode==='input'&&clockOn&&locked<=0){if(p.at.some(v=>v==null)||Math.random()<.4){p.prizes.forEach((q,i)=>{sel=Math.random()<.6?p.tags.indexOf(q.price):Math.floor(Math.random()*4);placeOn(i);});return 'tag';}pullLever();return 'pull';}K.hurry=true;return '';}:null};
 await K.run({title:'RACE GAME',sub:'Four tags, four prizes, 45 seconds',col:'#4ad0ff',pass:K.net?'RACE GAME online: 45 seconds to put the right price tag on four prizes. The lever shows how many are right.':'RACE GAME: 45 seconds to tag four prizes with the right prices. Pull the lever to see how many you have right, rearrange, pull again.',
  intro:[['Four prizes, four price tags, and 45 seconds on the clock…',2800],['Pull the lever and the board lights up how many are right. Keep going until you get all four!',3400]],
  ready:['stage-race','stage-race-tall','stage-race-fold','race-podium','race-tag','race-board','race-lever','race-logo'],play,
  result:()=>({scores:P.map(p=>p.score),lines:P.map(p=>`${p.won.length} of 4 · ${K.money(p.score)}`),summary:`RACE GAME · ${names[0]} ${P[0].won.length}/4 – ${names[1]} ${P[1].won.length}/4`})});}
function ST(){return require("src/engines/gameshow/stage.js");}
function drawRef(g,W,H,slot){if(slot==='race-podium')drawPodium(g);else if(slot==='race-tag')drawTag(g,null);else if(slot==='race-board')drawBoard(g,2);else if(slot==='race-lever')drawLever(g,0);}
Object.assign(exports,{raceGame,drawPodium,drawTag,drawBoard,drawLever,drawRef,CLOCK});
