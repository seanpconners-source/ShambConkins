// THE CLOCK GAME (game id clock-game, engine 'clockgame'; in The Price Is Right's menu, tpirShow.js). Played like the show: two
// prizes ($100-$999, real products from showPrizes.js MID_PRIZES), 30 seconds on the big clock for both. Call out a price (type it on
// the keypad: three digits go in at once) and the host answers HIGHER! or LOWER! until you hit it exactly. The clock stops when you win a
// prize and starts again for the next; run out of time and the game is over (no second prize). Win both = a $1,000 bonus.
// Score = the prizes' dollars + the bonus. 1P = you, then a CPU contestant (a sloppy binary search, faster with skill); 2P = one after
// the other on one phone; board the same. Online: turns; the player's phone runs the clock and sends {kg:[prize,guess,timeLeft]} for
// every guess and {kt:[prize]} when time runs out; the watcher's clock only shows. Pictures (optional, drawn fallback):
// src/data/showSprites.js clock-face / clock-hand / clock-display / clock-platform / clock-logo / stage-clock(-tall/-fold).
const ST=require("src/engines/gameshow/stage.js");
const SS=require("src/data/showSprites.js");
const SP=require("src/data/showPrizes.js");
const {clamp,seededRandom}=require("src/utils.js");
const {holdMusic,releaseMusic,vibrate}=require("src/audio.js");
const {isCpu,cpuSkill,isOnline}=require("src/engines/cpuKit.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const TAU=Math.PI*2,money=n=>'$'+Math.round(n).toLocaleString('en-US');
const CLOCK=30,BONUS=1000,LO=100,HI=999;
const CG=SS.CLOCK_GEOM,HG=SS.HAND_GEOM,DG=SS.DISPLAY_GEOM,PG=SS.PLATFORM_GEOM;
// ---- drawn fallbacks (also the template references), each in its own picture px
function drawFace(g,used=0){const pic=SS.picture('clock-face'),[cx,cy]=CG.c;if(pic){g.drawImage(pic,0,0,CG.w,CG.h);return;}
 const fr=g.createLinearGradient(0,0,CG.w,CG.h);fr.addColorStop(0,'#ffb12b');fr.addColorStop(.5,'#ff4f2b');fr.addColorStop(1,'#b0247a');g.fillStyle=fr;g.beginPath();g.arc(cx,cy,498,0,TAU);g.fill();
 for(let i=0;i<40;i++){const a=i/40*TAU;g.fillStyle=i%2?'#fff3b0':'#ffd23f';g.beginPath();g.arc(cx+Math.cos(a)*478,cy+Math.sin(a)*478,10,0,TAU);g.fill();}
 g.fillStyle='#2a1a10';g.beginPath();g.arc(cx,cy,458,0,TAU);g.fill();g.fillStyle='#fbfaf4';g.beginPath();g.arc(cx,cy,448,0,TAU);g.fill();
 // the 30 seconds in play, lightly shaded, and the time used in pale red
 g.fillStyle='rgba(255,210,63,.18)';g.beginPath();g.moveTo(cx,cy);g.arc(cx,cy,440,-Math.PI/2,Math.PI/2);g.fill();
 if(used>0){g.fillStyle='rgba(220,30,40,.16)';g.beginPath();g.moveTo(cx,cy);g.arc(cx,cy,440,-Math.PI/2,-Math.PI/2+used/60*TAU);g.fill();}
 for(let i=0;i<60;i++){const a=i/60*TAU-Math.PI/2,big=i%5===0;g.strokeStyle='#14100c';g.lineWidth=big?10:4;g.beginPath();g.moveTo(cx+Math.cos(a)*(big?380:410),cy+Math.sin(a)*(big?380:410));g.lineTo(cx+Math.cos(a)*440,cy+Math.sin(a)*440);g.stroke();}
 g.fillStyle='#14100c';g.font='900 64px "SC Bangers",Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';
 for(let n=5;n<=60;n+=5){const a=n/60*TAU-Math.PI/2;g.fillText(String(n),cx+Math.cos(a)*320,cy+Math.sin(a)*320+3);}}
function drawHand(g){const pic=SS.picture('clock-hand'),[px,py]=HG.pivot;if(pic){g.drawImage(pic,0,0,HG.w,HG.h);return;}
 g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.moveTo(px-12+6,py+50+6);g.lineTo(px-4+6,py-HG.len+6);g.lineTo(px+4+6,py-HG.len+6);g.lineTo(px+12+6,py+50+6);g.fill();
 g.fillStyle='#d7101e';g.beginPath();g.moveTo(px-12,py+50);g.lineTo(px-4,py-HG.len);g.lineTo(px+4,py-HG.len);g.lineTo(px+12,py+50);g.fill();
 g.fillStyle='#14100c';g.beginPath();g.arc(px,py,30,0,TAU);g.fill();g.fillStyle='#d7101e';g.beginPath();g.arc(px,py,16,0,TAU);g.fill();}
function drawDisplay(g,lit=false){const pic=SS.picture('clock-display'),[a,b,c,d]=DG.window;if(pic){g.drawImage(pic,0,0,DG.w,DG.h);return;}
 g.fillStyle='#3a1250';g.beginPath();g.roundRect(10,10,DG.w-20,DG.h-20,40);g.fill();g.strokeStyle='#ffd23f';g.lineWidth=8;g.stroke();
 const n=34;for(let i=0;i<n;i++){const f=i/n,per=2*(DG.w-60+DG.h-60),dd=f*per;let x,y;if(dd<DG.w-60){x=30+dd;y=30;}else if(dd<DG.w-60+DG.h-60){x=DG.w-30;y=30+dd-(DG.w-60);}else if(dd<2*(DG.w-60)+DG.h-60){x=DG.w-30-(dd-(DG.w-60)-(DG.h-60));y=DG.h-30;}else{x=30;y=DG.h-30-(dd-2*(DG.w-60)-(DG.h-60));}
  g.fillStyle=lit&&i%2===0?'#fff6c0':'#ffe9a0';g.beginPath();g.arc(x,y,7,0,TAU);g.fill();}
 g.fillStyle='#120408';g.beginPath();g.roundRect(a,b,c-a,d-b,16);g.fill();}
function drawPlatform(g){const pic=SS.picture('clock-platform');if(pic){g.drawImage(pic,0,0,PG.w,PG.h);return;}
 const [tx,ty]=PG.top;g.fillStyle='#5a1a6a';g.beginPath();g.moveTo(tx-330,ty);g.lineTo(tx-300,PG.h-20);g.lineTo(tx+300,PG.h-20);g.lineTo(tx+330,ty);g.fill();
 for(let i=0;i<14;i++){g.fillStyle=i%2?'#fff3b0':'#ffd23f';g.beginPath();g.arc(tx-290+i*44.6,ty+120,8,0,TAU);g.fill();}
 const gr=g.createLinearGradient(0,ty-40,0,ty+40);gr.addColorStop(0,'#fff0a0');gr.addColorStop(1,'#c99a1c');g.fillStyle=gr;g.beginPath();g.ellipse(tx,ty,330,46,0,0,TAU);g.fill();}
async function clockGame(s){
 const [c,x]=s.canvas(900,560,{fill:true});const fb=fullBleed(s,{bg:'#14062e'});
 const net=isOnline(s)?s.online:null,me=net?net.me:0,cpu=!net&&isCpu(s),board=s.origin==='board',names=s.players.map(p=>p.name||'Player');
 const snd=ST.createShowSound({clips:['ding','bell','buzzer','big-winner','losing-horn'],voice:'clock'}),sfx=snd.sfx;holdMusic(6*3600);s.cleanup(()=>{snd.stop();releaseMusic();});
 const mine=i=>net?i===me:!(cpu&&i===1);
 // each contestant's two prizes: a shuffle of the mid prizes from the seed, contestant 0 takes the first two, 1 the next two
 const R0=seededRandom(`${s.seed}:clock`),pool=SP.MID_PRIZES.slice();for(let k=pool.length-1;k>0;k--){const j=Math.floor(R0()*(k+1));[pool[k],pool[j]]=[pool[j],pool[k]];}
 const P=names.map((n,i)=>({prizes:[0,1].map(k=>{const [id,name,price,em]=pool[(i*2+k)%pool.length];return {id,name,price,em,won:false,guesses:[]};}),left:CLOCK,won:0,bonus:0,score:0,done:false,mood:'normal'}));
 for(const p of P)for(const q of p.prizes)SP.prizePhoto(q.id);
 let W=s.W,H=s.H,t=0,mode='intro',introT=0,curtain=0,cur=0,pk=0,entry='',banner=null,hostSay=null,hurry=false,running=false,lastTick=0,call=null,shown=null,keys=[];
 // waits let the host finish what he's saying (not online: both phones keep the same pace); a tap hurries the show and cuts him off
 const wait=ms=>new Promise(r=>{const end=performance.now()+Math.max(ms,net?0:snd.talking());const f=()=>{if(!s.alive||hurry||performance.now()>=end){if(hurry)snd.hush();hurry=false;r();return;}setTimeout(f,30);};f();});
 const say=(text,ms=2600)=>{hostSay={text,t:ms/1000};if(snd.speak(text))hostSay.t=Math.max(hostSay.t,snd.talking()/1000+.3);};const cast=ST.createCast();
 const txt=(g,str,x0,y0,size,col,{font='"SC Nunito",sans-serif',w=900,align='center',max=0}={})=>{g.save();g.font=`${w} ${size}px ${font}`;if(max){const m=g.measureText(str).width;if(m>max)g.font=`${w} ${size*max/m}px ${font}`;}g.textAlign=align;g.textBaseline='middle';g.lineWidth=size*.28;g.strokeStyle='rgba(0,0,0,.75)';g.lineJoin='round';g.strokeText(str,x0,y0);g.fillStyle=col;g.fillText(str,x0,y0);g.restore();};
 // ---- layout. wide: clock left, prize/display/keypad right. upright: logo, clock, prize + display side by side, keypad.
 // near-square (the open Fold): clock and the prize column side by side, the keypad under both.
 let L={};function layout(){W=s.W;H=s.H;const top=(fb.top||40)+6,fs=clamp(Math.min(W,H)*.04,12,20),wide=W>H*1.15,tagH=fs*2.8;
  if(wide){const lw0=W*.46,d=Math.min(lw0*.9,H-8-tagH-14),cx=lw0/2+8,cy=8+(H-8-tagH-14-d)/2+d/2,px=lw0+fs,pw=W-px-8,lgw=Math.min(pw*.42,fs*9.5),lgh=lgw*.32,y1=Math.max(top,8+lgh+fs*.5),
    ph=Math.min(pw*.3,(H-y1)*.28),dh=Math.min(pw*.17,ph*.8,fs*3.6),py=y1+ph+fs*1.9;
   L={wide,fs,top,tagH,clock:{x:cx,y:cy,d},logo:{x:px+pw*.32,y:8+lgh/2,w:lgw},prize:{x:px+pw*.02,y:y1,w:pw*.46,h:ph},disp:{x:px+pw*.5,y:y1+(ph-dh)/2,w:pw*.5,h:dh},
    hist:{x:px+pw/2,y:y1+ph+fs*.9},pad:{x:px+pw*.08,y:py,w:pw*.84,h:H-py-8},tags:{x:8,w:lw0,y:H-tagH-6}};return;}
  const lw=Math.min(W*.6,fs*14),lh=lw*.3,y0=top+lh+6,square=W>H*.72;
  if(square){const d=Math.min(W*.46,H*.36),cx=W*.27,cy=y0+d/2,px=W*.52,pw=W*.46,ph=d*.58,dh=Math.min(d*.3,fs*4.4),yb=y0+d+fs*1.4;
   L={wide,fs,top,tagH,clock:{x:cx,y:cy,d},logo:{x:W/2,y:top+lh/2,w:lw},prize:{x:px+pw*.1,y:y0,w:pw*.8,h:ph},disp:{x:px,y:y0+ph+fs*.4,w:pw,h:dh},hist:{x:W/2,y:yb},pad:{x:W*.16,y:yb+fs*.9,w:W*.68,h:H-(yb+fs*.9)-tagH-14},tags:{x:8,w:W-16,y:H-tagH-8}};return;}
  const d=Math.min(W*.6,H*.3),cy=y0+d/2,ry=y0+d+fs*.5,rh=Math.min(W*.3,H*.15),dh=Math.min(rh*.55,fs*4),yb=ry+rh+fs*.9;
  L={wide,fs,top,tagH,clock:{x:W/2,y:cy,d},logo:{x:W/2,y:top+lh/2,w:lw},prize:{x:W*.03,y:ry,w:W*.44,h:rh},disp:{x:W*.5,y:ry+(rh-dh)/2,w:W*.47,h:dh},hist:{x:W/2,y:yb},pad:{x:W*.08,y:yb+fs*.9,w:W*.84,h:H-(yb+fs*.9)-tagH-14},tags:{x:8,w:W-16,y:H-tagH-8}};}
 // ---- drawing
 function draw(){layout();const g=x,fs=L.fs;g.setTransform(s.dpr||1,0,0,s.dpr||1,0,0);ST.drawStage(g,W,H,'clock',t);
  ST.drawLogo(g,'clock-logo','CLOCK GAME',L.logo.x,L.logo.y,L.logo.w,t,{cols:['#ffd23f','#ff3d3d']});
  const p=P[cur],used=CLOCK-p.left;
  // the clock + hand + time left
  const C=L.clock,k=C.d/CG.w;g.save();g.translate(C.x-C.d/2,C.y-C.d/2);g.scale(k,k);drawFace(g,used);g.restore();
  g.save();g.translate(C.x,C.y);g.rotate(used/60*TAU);const hk=CG.r/HG.len*k;g.scale(hk,hk);g.translate(-HG.pivot[0],-HG.pivot[1]);drawHand(g);g.restore();
  // time left: a red LED readout on a dark plate inside the face, between the centre and the 30
  {const tw=C.d*.24,th=C.d*.1,ty=C.y+C.d*.15;g.fillStyle='#120408';g.beginPath();g.roundRect(C.x-tw/2,ty-th/2,tw,th,th*.25);g.fill();g.strokeStyle='#ffd23f';g.lineWidth=Math.max(1.5,C.d*.006);g.stroke();
   g.save();g.font=`400 ${th*.82}px "SC Bangers",Impact,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=p.left<=5&&running&&Math.floor(t*4)%2?'#ffffff':'#ff3a2a';g.shadowColor='#ff3a2a';g.shadowBlur=th*.3;
   g.fillText(`0:${String(Math.ceil(p.left)).padStart(2,'0')}`,C.x,ty+th*.04);g.restore();}
  // the prize on its platform
  const q=p.prizes[pk],B=L.prize,pk2=Math.min(B.w/PG.w,B.h/PG.h*1.25);g.save();g.translate(B.x+B.w/2-PG.w*pk2/2,B.y+B.h-PG.h*pk2*.78);g.scale(pk2,pk2);drawPlatform(g);
  const ph=SP.prizePhoto(q.id),[tx,ty]=PG.top;ST.drawPrizeOn(g,ph,tx,ty-12,700,620,{emoji:q.em});g.restore();
  txt(g,q.name.toUpperCase(),B.x+B.w/2,B.y+B.h+fs*.45,fs*.62,'#fff',{w:800,max:B.w*1.05});
  // the display: guess while typing, then the last guess / the price
  const D=L.disp,dk=D.w/DG.w;g.save();g.translate(D.x,D.y+(D.h-DG.h*dk)/2);g.scale(dk,dk);drawDisplay(g,running);const [a,b,cc,dd]=DG.window,val=shown!=null?shown:(entry||'');
  g.font='900 130px "SC Bangers",Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';const isPrice=mode==='won'||mode==='timeup';g.fillStyle=isPrice?'#ff3a2a':'#fff';g.shadowColor=g.fillStyle;g.shadowBlur=22;
  g.fillText('$'+val+(mode==='guess'&&shown==null&&mine(cur)&&Math.floor(t*2)%2?'_':''),(a+cc)/2,(b+dd)/2+6);g.restore();
  txt(g,`PRIZE ${pk+1} OF 2`,D.x+D.w/2,D.y-fs*.45,fs*.6,'#ffd75a');
  // the host's call
  if(call){const f=call.t,up=call.k==='HIGHER',col=call.k==='WIN'?'#7dff5a':up?'#4dff8a':'#ff5a5a';g.save();g.globalAlpha=Math.min(1,f*4);const sc=1+.15*Math.max(0,1-(1-f)*6);
   txt(g,call.k==='WIN'?'RIGHT!':`${call.k}! ${up?'▲':'▼'}`,D.x+D.w/2,D.y+D.h+fs*1.4*sc-fs*.6,fs*1.6*sc,col,{font:'"SC Bangers",Impact,sans-serif',w:400});g.restore();}
  // the guesses so far for this prize, with the calls
  const gl=q.guesses.slice(-5);if(gl.length){const str=gl.map(([v,cl])=>`$${v}${cl==='HIGHER'?'▲':cl==='LOWER'?'▼':'✔'}`).join('  ');txt(g,str,L.hist.x,L.hist.y+(call?fs*1.2:0),fs*.66,'#bfe7ff',{w:800,max:W*.95});}
  if(mode==='guess'&&mine(cur)&&!cpuTurn())drawPad(g);else keys=[];
  if(mode==='guess'&&(!mine(cur)||cpuTurn()))txt(g,`${names[cur].toUpperCase()} IS CALLING OUT PRICES…`,L.pad.x+L.pad.w/2,L.pad.y+fs*2.4,fs*.9,'#bfe7ff',{max:L.pad.w*.95});
  // contestant tags
  P.forEach((q2,i)=>{const T=L.tags,th=L.tagH,w=Math.min(T.w/2-6,fs*11),x0=i?T.x+T.w-w:T.x,y0=T.y;g.fillStyle=i===cur?'rgba(255,226,58,.92)':'rgba(20,6,46,.78)';g.beginPath();g.roundRect(x0,y0,w,th,10);g.fill();
   s.sprite(g,i,x0+fs*1.5,y0+th/2,th*.75,{exact:true,still:true,mood:q2.mood});g.fillStyle=i===cur?'#14062e':'#fff';g.font=`900 ${fs*.9}px "SC Nunito",sans-serif`;g.textAlign='left';g.textBaseline='middle';
   g.fillText(names[i].slice(0,12).toUpperCase(),x0+fs*3,y0+th*.31);g.font=`900 ${fs*1.1}px "SC Bangers",Impact,sans-serif`;g.fillText(q2.done||q2.won?money(q2.done?q2.score:q2.won):'—',x0+fs*3,y0+th*.69);});
  {const sp=cast.spots(W,H,{foot:L.tags.y-6});
   // the model stands beside the prize and shows it off while it's being priced (owner, Nov 26)
   if(mode==='guess'){const B2=L.prize,mh=Math.min(B2.h*1.7,H*.5);sp.model={x:L.wide?B2.x+mh*.12:Math.min(W-mh*.2,B2.x+B2.w+mh*.08),y:B2.y+B2.h+mh*.02,h:mh,side:L.wide?-1:1};cast.present(.4,'present');}cast.draw(g,W,H,t,sp,!!hostSay);if(hostSay){if(cast.hv>.5){const b=cast.bubbleAt(W,H,sp,fs);ST.bubble(g,b.x,b.y,hostSay.text,b.w,fs*.85,b.tx,b.ty);}else ST.bubble(g,W/2,L.wide?H*.18:L.clock.y-L.clock.d*.2,hostSay.text,Math.min(W*.86,fs*17),fs*.85,W/2,L.wide?H*.18+fs*2.5:L.clock.y);}}
  if(mode==='intro')ST.drawCurtain(g,W,H,curtain,t);
  if(banner)ST.moneyBanner(g,W,H,banner.big,banner.small,Math.min(1,banner.t*3),banner.col);}
 function drawPad(g){const fs=L.fs,b=L.pad,gap=fs*.35,kw=Math.min((b.w-gap*2)/3,fs*5.4),kh=Math.min((b.h-gap*3)/4,fs*3.2),x0=b.x+(b.w-(kw*3+gap*2))/2,y0=b.y;keys=[];
  ['1','2','3','4','5','6','7','8','9','⌫','0','OK'].forEach((l,i)=>{const kx=x0+(i%3)*(kw+gap),ky=y0+Math.floor(i/3)*(kh+gap),ok=l==='OK',dis=ok&&entry.length<3;
   g.fillStyle=ok?(dis?'#555':'#2fa84f'):l==='⌫'?'#c8102e':'#fff8dc';g.beginPath();g.roundRect(kx,ky,kw,kh,kh*.25);g.fill();g.strokeStyle='#ffd75a';g.lineWidth=2;g.stroke();
   txt(g,l,kx+kw/2,ky+kh/2,kh*.48,ok||l==='⌫'?'#fff':'#14062e',{font:'"SC Bangers",Impact,sans-serif',w:400});keys.push({x:kx,y:ky,w:kw,h:kh,l});});}
 const cpuTurn=()=>cpu&&cur===1;
 // ---- guesses
 let prizeDone=null;
 function press(l){if(mode!=='guess'||!mine(cur)||cpuTurn())return;shown=null;if(l==='⌫')entry=entry.slice(0,-1);else if(l==='OK'){if(entry.length)submit(+entry);return;}
  else if(/\d/.test(l)&&entry.length<3&&!(entry===''&&l==='0')){entry+=l;if(entry.length===3){const v=+entry;setTimeout(()=>{if(mode==='guess'&&entry===String(v))submit(v);},110);}}sfx.peg?.(3);vibrate(6);}
 function submit(v,left){if(mode!=='guess')return;snd.hush();const p=P[cur],q=p.prizes[pk];v=clamp(Math.round(v),1,999);if(left!=null)p.left=left;
  if(net&&mine(cur))net.send({kg:[pk,v,+p.left.toFixed(2)]});entry='';shown=String(v);
  if(v===q.price){q.guesses.push([v,'WIN']);q.won=true;p.won+=q.price;running=false;mode='won';call={k:'WIN',t:1};const d=prizeDone;prizeDone=null;d?.('won');return;}
  const k=v<q.price?'HIGHER':'LOWER';q.guesses.push([v,k]);call={k,t:1};if(!snd.voice('say-'+k.toLowerCase()))(k==='HIGHER'?sfx.higher:sfx.lower)?.();snd.voice('crowd-'+k.toLowerCase(),{vol:.6,at:.12});vibrate(k==='HIGHER'?[8,30,8]:12);}
 function timeUp(){if(mode!=='guess')return;const p=P[cur];p.left=0;running=false;mode='timeup';if(net&&mine(cur))net.send({kt:[pk]});const d=prizeDone;prizeDone=null;d?.('time');}
 s.on(c,'pointerdown',ev=>{if(s.paused)return;ev.preventDefault();const pt=s.pointer(ev);
  for(const k of keys)if(pt.x>=k.x&&pt.x<=k.x+k.w&&pt.y>=k.y&&pt.y<=k.y+k.h){press(k.l);return;}
  if(mode!=='guess')hurry=true;});
 s.on(document,'keydown',ev=>{if(s.paused)return;if(/^\d$/.test(ev.key))press(ev.key);else if(ev.key==='Backspace')press('⌫');else if(ev.key==='Enter')press('OK');});
 // the CPU contestant (and the online test bot): a sloppy halving search, the first call a rough estimate
 async function autoGuesser(i,k,skill,R){const q=P[i].prizes[k];let lo=LO-1,hi=HI+1,first=true;
  while(s.alive&&mode==='guess'&&cur===i&&pk===k){await wait(Math.max(350,900-450*skill+R()*500));if(!(s.alive&&mode==='guess'&&cur===i&&pk===k))return;
   let g2;if(first){g2=Math.round(q.price*(1+(R()-.5)*(.9-.6*skill))/10)*10;first=false;}else{const mid=(lo+hi)/2,n=(R()-.5)*(hi-lo)*(.5-.35*skill);g2=Math.round(mid+n);if(hi-lo>40)g2=Math.round(g2/5)*5;}
   g2=clamp(g2,lo+1,hi-1);shown=null;entry='';for(const dg of String(g2)){entry+=dg;await wait(110);}if(!(mode==='guess'&&cur===i&&pk===k))return;submit(g2);
   if(g2<q.price)lo=Math.max(lo,g2);else if(g2>q.price)hi=Math.min(hi,g2);}}
 // ---- one contestant
 async function play(i){const p=P[i];cur=i;p.left=CLOCK;
  for(let k=0;k<2;k++){if(!s.alive)return;pk=k;entry='';shown=null;call=null;const q=p.prizes[k];
   banner={big:k?'PRIZE 2':'PRIZE 1',small:q.name,t:1.6,col:'#fff'};sfx.applause(1.4,.35);await wait(1700);if(!s.alive)return;
   mode='guess';running=true;lastTick=Math.ceil(p.left);
   const done=new Promise(r=>{prizeDone=r;});
   if(cpuTurn())autoGuesser(i,k,cpuSkill(s),seededRandom(`${s.seed}:clockcpu:${k}`));
   else if(!mine(i))(async()=>{for(;;){const m=await net.next();if(!m||!s.alive){const d=prizeDone;prizeDone=null;d?.('gone');return;}
     if(m.kg&&+m.kg[0]===k){submit(+m.kg[1],+m.kg[2]);if(mode!=='guess')return;}else if(m.kt&&+m.kt[0]===k){timeUp();return;}}})();
   const how=await done;if(!s.alive||how==='gone')return;
   if(how==='won'){shown=String(q.price);sfx.ding();sfx.applause(2,.7);p.mood='win';banner={big:'YOU WIN IT!',small:`${q.name} · ${money(q.price)}`,t:2,col:'#7dff5a'};vibrate([20,30,20]);await wait(2200);call=null;continue;}
   // time ran out: the buzzer, the price shown, no second prize
   shown=String(q.price);sfx.buzz();p.mood='sad';banner={big:'TIME\'S UP!',small:`It was ${money(q.price)}`,t:2.2,col:'#ff6a5a'};await wait(2400);break;}
  if(!s.alive)return;mode='done';const both=p.prizes.every(q=>q.won);
  if(both){p.bonus=BONUS;banner={big:'BOTH PRIZES!',small:`+ ${money(BONUS)} BONUS`,t:2.4,col:'#ffe23a'};sfx.jackpot(true);say(`You beat the clock! And that's a thousand dollars more!`,2400);await wait(2600);}
  p.score=p.won+p.bonus;p.done=true;if(!p.won){if(!snd.clip('losing-horn'))sfx.aww?.();}}
 // ---- frame
 s.frame(dt=>{dt=Math.min(dt,.05);t+=dt;
  if(mode==='intro'){introT+=dt;curtain=clamp((introT-.4)/1.4,0,1);}
  if(hostSay){hostSay.t-=dt;if(hostSay.t<=0)hostSay=null;}
  // the host and the models (stage.js createCast): he walks on to talk, she presents at each turn, both cheer at a win
  cast.step(dt,{host:!!hostSay||(mode==='intro'&&introT>2)||mode==='over',model:mode==='intro'&&introT>2.4});
  {const pl=mode!=='intro'&&mode!=='over';if(pl!==cast.mur){cast.mur=pl;snd.murmur?.(pl);}}
  if(mode==='guess'){cast.yellT=(cast.yellT??2)-dt;if(cast.yellT<=0){cast.yellT=2.4+Math.random()*3.2;snd.voice?.(['crowd-higher','crowd-lower','crowd-shout'][Math.floor(Math.random()*3)],{vol:.6+Math.random()*.3,pan:Math.random()*1.4-.7});}}
  if(banner&&!banner.cast){banner.cast=1;if(banner.col==='#ff6a5a')snd.voice?.('crowd-aww');if(banner.col==='#7dff5a'||banner.col==='#ffe23a'){cast.cheer(Math.min(3,banner.t+.4));snd.voice?.('crowd-cheer',{vol:.8});}else if(/YOUR TURN/.test(banner.small||''))cast.present(3.4,'wave');}
  if(banner){banner.t-=dt;if(banner.t<=0)banner=null;}
  if(call){call.t-=dt*1.1;if(call.t<=0)call=null;}
  // the clock: the player's phone (and the local game) runs it; the watcher's only shows and waits for {kt}
  if(running&&mode==='guess'){const p=P[cur];p.left=Math.max(0,p.left-dt);const sec=Math.ceil(p.left);if(sec<lastTick){lastTick=sec;sfx.tick?.();if(sec<=5)vibrate(4);}
   if(p.left<=0&&(!net||mine(cur)))timeUp();}
  draw();});
 s.debug={snd,get mode(){return mode;},P,get cur(){return cur;},get pk(){return pk;},press,get entry(){return entry;},get keys(){return keys.map(k=>({x:k.x,y:k.y,w:k.w,h:k.h,l:k.l}));},
  guess:v=>{if(mode==='guess')submit(v??P[cur].prizes[pk].price);},set hurry(v){hurry=!!v;},timeUp,
  bot:net?(()=>{let going=-1;return ()=>{if(!mine(cur)||mode!=='guess')return hurry=true,'';const key=cur*2+pk;if(going!==key){going=key;autoGuesser(cur,pk,.7,Math.random);}return 'guess';};})():null};
 // ---- the show
 if(!s.fromMenu&&!await s.pass(0,net?'THE CLOCK GAME online: take turns. 30 seconds to price two prizes; the host says HIGHER or LOWER.':cpu?`THE CLOCK GAME vs ${names[1]}: 30 seconds to price two prizes exactly. HIGHER or LOWER after every guess.`:'THE CLOCK GAME: 30 seconds to price two prizes exactly. The host says HIGHER or LOWER after every guess.','Come on down!'))return;
 await SS.ready(['stage-clock','stage-clock-tall','stage-clock-fold','curtain','clock-face','clock-hand','clock-display','clock-platform','clock-logo'],5000);
 if(!s.fromMenu)snd.title(true);snd.crowd(3,.9,{at:.3});mode='intro';introT=0;
 banner={big:'THE CLOCK GAME!',small:'Two prizes · thirty seconds',t:2.6,col:'#ffd23f'};await wait(2600);
 say('Thirty seconds to price both prizes. Call out a price, I\'ll tell you higher or lower. Win them both and there\'s a thousand dollars more!',3600);introT=Math.max(introT,2.3);await wait(3400);snd.title(false);
 for(const i of (s.episode&&s.episode.only!=null?[s.episode.only]:[0,1])){if(!s.alive)return;if(i===1&&!net&&!cpu&&!board&&!s.episode){if(!await s.pass(1,`${names[1]}, come on down! Your turn at THE CLOCK GAME.`,'Play'))return;}
  banner={big:names[i].toUpperCase(),small:'IT\'S YOUR TURN AT THE CLOCK GAME!',t:1.6,col:'#fff'};sfx.applause(1.6,.5);await wait(1600);await play(i);}
 if(!s.alive)return;mode='over';
 const a=P[0].score,b=P[1].score,w=a===b?-1:a>b?0:1;
 if(s.episode){const q=P[s.episode.only];s.episode.out={won:q.score,line:money(q.score)};s.finish([a,b],'');return;}
 if(w>=0){banner={big:`${names[w].toUpperCase()} WINS!`,small:money(P[w].score),t:3,col:'#ffe23a'};sfx.winner();s.react?.(w,'win');}else banner={big:'A TIE!',small:money(a),t:3,col:'#fff'};
 await wait(3000);
 s.finish([a,b],`CLOCK GAME · ${names[0]} ${money(a)} – ${money(b)} ${names[1]}`);}
Object.assign(exports,{clockGame,drawFace,drawHand,drawDisplay,drawPlatform,CLOCK});
