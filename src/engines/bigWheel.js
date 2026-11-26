// THE BIG WHEEL (game id big-wheel, engine 'bigwheel'): the showdown wheel on its own, on our own studio set
// (gameshow/stage.js: set, rising curtain, our host and assistants, original sounds; pictures via src/data/showSprites.js).
// Three contestants (the two players + a studio contestant the game plays) take turns at a tall wheel of 20 sections from 5 to
// 100 cents. Grab it and pull DOWN hard: it has to go all the way round once or you spin again. Then stay, or spin once more
// and add it up. Closest to $1.00 without going over wins; ties spin off; exactly $1.00 pays $1,000 and a bonus spin
// (5 or 15 = $10,000 more, the $1.00 = $25,000). The wheel's flapper clicks on every peg and slows it down.
// Spin = a fixed-step simulation from the pull speed (simSpin), so both phones online turn it the same: the spinner's phone
// sends {sp:[w0]} and {ch:'again'|'stay'}; the studio contestant decides from the seed. Score: total cents (0 over), +200 for
// the winner, + bonus dollars / 100.
const ST=require("src/engines/gameshow/stage.js");
const SS=require("src/data/showSprites.js");
const {clamp,seededRandom}=require("src/utils.js");
const {holdMusic,releaseMusic,vibrate}=require("src/audio.js");
const {isCpu,cpuSkill,isOnline}=require("src/engines/cpuKit.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const TAU=Math.PI*2,N=20,STEP=TAU/N;
const WHEEL=[100,15,80,35,60,20,40,75,55,95,50,85,30,65,10,45,70,25,90,5];
const label=v=>v===100?'1.00':String(v),money=n=>'$'+Math.round(n).toLocaleString('en-US');
const COL=['#f4c430','#d7263d','#1b6fd8','#f4c430','#7b2cbf','#d7263d','#1b6fd8','#f4c430','#d7263d','#7b2cbf'];
const colorOf=k=>{const v=WHEEL[k];return v===100?'#c8102e':v===5||v===15?'#1f9d55':COL[k%COL.length];};
const valueAt=a=>WHEEL[((-Math.round(a))%N+N)%N];
// the spin: angle a in sections (down = +), w0 sections/s; friction + a little drag on every peg the flapper hits; ends snapped
// into a section. Returns 60 Hz samples, the clicks, the travel and the landing section.
function simSpin(a0,w0){const DT=1/240,out=[[a0,0]],clicks=[];let a=a0,w=w0,t=0,last=Math.floor(a0+.5);
 for(let n=0;n<240*30&&w>.04;n++){t+=DT;a+=w*DT;w-=(.32+.17*w)*DT;const edge=Math.floor(a+.5);if(edge!==last){last=edge;clicks.push(t);w-=.05+.02*Math.max(0,4-w);}if(n%4===0)out.push([a,t]);}
 // the flapper settles it into the middle of the section it rests in
 const end=Math.round(a);for(let k=1;k<=12;k++){t+=1/60;out.push([a+(end-a)*(1-Math.pow(1-k/12,2)),t]);}
 return {path:out,clicks,end,travel:end-a0,value:valueAt(end),dur:t};}
// the studio contestant (third podium): a random character from the game under its own name (owner, Nov 25: "use the real character
// names from the game instead of the random names"; gameshow/guests.js: own picture + measured face, not the players'); drawn face = fallback
const {faceSprite,headFacts}=require("src/headFacts.js");
const {guestDeck}=require("src/engines/gameshow/guests.js");
async function bigWheel(s){
 const [c,x]=s.canvas(900,560,{fill:true});const fb=fullBleed(s,{bg:'#1a0a3a'});
 const net=isOnline(s)?s.online:null,me=net?net.me:0,cpu=!net&&isCpu(s),board=s.origin==='board',names=s.players.map(p=>p.name||'Player');
 const snd=ST.createShowSound({song:'showcase-showdown',voice:'wheel',clips:['wheel-dollar','showcase-win']}),sfx=snd.sfx;holdMusic(6*3600);s.cleanup(()=>{snd.stop();releaseMusic();});
 const R=seededRandom(`${s.seed}:bigwheel`);
 // contestants: 0/1 players, 2 the studio guest (played by the game on every phone)
 const gst=s.episode?.guest||guestDeck(s.seed,s.players.map(p=>p.character),'bigwheel:guest')()||{name:'Guest',short:'Guest',col:'#e86a92',id:null};
 const C=[{name:names[0],p:0},{name:names[1],p:1},{name:gst.short,full:gst.name,guest:true,color:gst.col,face:gst.id}].map(o=>({...o,spins:[],total:0,over:false,bonus:0,mood:'normal'}));
 const order=[0,1,2];for(let k=2;k>0;k--){const j=Math.floor(R()*(k+1));[order[k],order[j]]=[order[j],order[k]];}
 // in THE EPISODE the order comes from the show (lowest winnings spin first, like the real one)
 if(s.episode?.order)order.splice(0,3,...s.episode.order);
 const human=ci=>ci<2&&(net?ci===me:!(cpu&&ci===1));
 let murOn=false,W=s.W,H=s.H,t=0,mode='intro',introT=0,curtain=0,cur=-1,ang=Math.floor(R()*N),spin=null,banner=null,hostSay=null,hostPose='talk',modelPose='present',hurry=false,choice=null,chooseBtns=[],drag=null,shake=0;
 // waits let the host finish what he's saying (not online: both phones keep the same pace); a tap hurries the show and cuts him off
 const wait=ms=>new Promise(r=>{const end=performance.now()+Math.max(ms,net?0:snd.talking());const f=()=>{if(!s.alive||hurry||performance.now()>=end){if(hurry)snd.hush();hurry=false;r();return;}setTimeout(f,30);};f();});
 const say=(text,ms=2400,pose='talk')=>{hostSay={text,t:ms/1000};hostPose=pose;if(snd.speak(text))hostSay.t=Math.max(hostSay.t,snd.talking()/1000+.3);};
 let L={};function layout(){W=s.W;H=s.H;const wide=W>H*1.15,top=(fb.top||40)+6,fs=clamp(Math.min(W,H)*.04,12,20);
  const wh=wide?H-top-16:Math.min(H*.66,H-top-fs*7),ww=Math.min(wh*.6,wide?W*.3:W*.62),wx=W/2-ww/2,wy=wide?top+8:top+fs*2.2;
  L={wide,top,fs,wx,wy,ww,wh,cx:W/2,cy:wy+wh/2};}
 // ---- the wheel: a vertical drum seen from the front inside its cabinet; the pointer on the left at the middle
 function drawWheel(g){const {wx,wy,ww,wh,cx,cy}=L,frame=SS.picture('wheel-frame'),G=SS.WHEEL_GEOM;
  let win={x:wx+ww*.17,y:wy+wh*.06,w:ww*.66,h:wh*.88};
  if(frame){const k=Math.min(ww/G.w,wh/G.h),fw=G.w*k,fh=G.h*k,fx=cx-fw/2,fy=cy-fh/2;win={x:fx+G.window[0]*k,y:fy+G.window[1]*k,w:(G.window[2]-G.window[0])*k,h:(G.window[3]-G.window[1])*k};}
  else{// drawn cabinet: chrome rails with bulbs, a base, the window
   g.fillStyle='rgba(0,0,0,.45)';g.beginPath();g.roundRect(wx+6,wy+10,ww,wh,ww*.08);g.fill();
   const rail=g.createLinearGradient(wx,0,wx+ww,0);rail.addColorStop(0,'#9aa1aa');rail.addColorStop(.1,'#f4f6f8');rail.addColorStop(.2,'#6e757e');rail.addColorStop(.8,'#6e757e');rail.addColorStop(.9,'#f4f6f8');rail.addColorStop(1,'#9aa1aa');
   g.fillStyle=rail;g.beginPath();g.roundRect(wx,wy,ww,wh,ww*.08);g.fill();g.fillStyle='#14062e';g.beginPath();g.roundRect(win.x-4,win.y-4,win.w+8,win.h+8,8);g.fill();
   const nb=16;for(const side of [0,1])for(let i=0;i<nb;i++){const yy=wy+wh*(i+.5)/nb,xx=side?wx+ww*.92:wx+ww*.08,on=(i+Math.floor(t*8)+side*3)%4<2;g.fillStyle=on?'#fff3b0':'#6e5420';g.beginPath();g.arc(xx,yy,Math.max(2,ww*.03),0,TAU);g.fill();}}
  // the turning sections
  g.save();g.beginPath();g.rect(win.x,win.y,win.w,win.h);g.clip();const Rd=win.h*.62;
  const vis=[];for(let k=0;k<N;k++){let ph=((k+ang)*STEP)%TAU;if(ph>Math.PI)ph-=TAU;if(ph<-Math.PI)ph+=TAU;if(Math.abs(ph)<Math.PI/2+STEP)vis.push([k,ph]);}
  for(const [k,ph] of vis){const y0=cy+Math.sin(Math.max(-Math.PI/2,ph-STEP/2))*Rd,y1=cy+Math.sin(Math.min(Math.PI/2,ph+STEP/2))*Rd;if(y1<=y0)continue;const shade=Math.cos(ph);
   g.fillStyle=colorOf(k);g.fillRect(win.x,y0,win.w,y1-y0);g.fillStyle=`rgba(0,0,0,${.65*(1-shade)})`;g.fillRect(win.x,y0,win.w,y1-y0);
   g.fillStyle='#e8eaee';g.fillRect(win.x,y0-1,win.w,Math.max(1.5,(y1-y0)*.05));
   if(shade>.15){const fs=(y1-y0)*.62,v=WHEEL[k];g.save();g.translate(cx,(y0+y1)/2);g.scale(1,Math.max(.2,shade));g.font=`900 ${fs/Math.max(.2,shade)*.95}px "SC Bangers",Impact,sans-serif`;g.textAlign='center';g.textBaseline='middle';
    g.lineWidth=fs*.12;g.strokeStyle='rgba(0,0,0,.6)';g.strokeText(label(v),0,2);g.fillStyle=v===100?'#ffe23a':'#fff';g.fillText(label(v),0,2);g.restore();}}
  const gl=g.createLinearGradient(0,win.y,0,win.y+win.h);gl.addColorStop(0,'rgba(0,0,0,.75)');gl.addColorStop(.3,'rgba(0,0,0,0)');gl.addColorStop(.7,'rgba(0,0,0,0)');gl.addColorStop(1,'rgba(0,0,0,.75)');g.fillStyle=gl;g.fillRect(win.x,win.y,win.w,win.h);
  g.fillStyle='rgba(255,255,255,.08)';g.fillRect(win.x+win.w*.12,win.y,win.w*.1,win.h);g.restore();
  if(frame){const k=Math.min(ww/G.w,wh/G.h);g.drawImage(frame,cx-G.w*k/2,cy-G.h*k/2,G.w*k,G.h*k);}
  // pointer + flapper on the left at the middle line
  const px=win.x-2,fl=Math.sin(t*60)*(spin?Math.min(1,spinSpeed()/12):0)*.25;g.save();g.translate(px,cy);g.rotate(fl);g.fillStyle='#ffe23a';g.strokeStyle='#5a3a00';g.lineWidth=2;
  g.beginPath();g.moveTo(win.w*.16,0);g.lineTo(-win.w*.08,-win.h*.03);g.lineTo(-win.w*.08,win.h*.03);g.closePath();g.fill();g.stroke();g.restore();
  g.strokeStyle='rgba(255,226,58,.55)';g.lineWidth=2;g.beginPath();g.moveTo(win.x,cy);g.lineTo(win.x+win.w,cy);g.stroke();
  L.win=win;}
 const spinSpeed=()=>{if(!spin)return 0;const p=spin.sim.path,i=Math.min(p.length-2,spin.i);return Math.abs(p[i+1][0]-p[i][0])*60;};
 // ---- contestants' podiums with their running totals
 function podiums(g){const fs=L.fs,n=3,wide=L.wide,pw=wide?Math.min(W*.2,fs*9):Math.min((W-24)/3,fs*8),ph=fs*4.6;
  order.forEach((ci,k)=>{const c2=C[ci],x0=wide?10:8+k*(pw+4),y0=wide?L.top+fs*3+k*(ph+8):H-ph-10,on=ci===cur;
   g.fillStyle=on?'rgba(255,226,58,.95)':'rgba(20,6,46,.85)';g.beginPath();g.roundRect(x0,y0,pw,ph,10);g.fill();g.strokeStyle='#ffd75a';g.lineWidth=2;g.stroke();
   const fx=x0+fs*1.6,fy=y0+fs*1.9;if(c2.guest){const sp=c2.face&&faceSprite(c2.face,headFacts(c2.face,c2.mood)?c2.mood:'normal',fs*1.7,1);if(sp)g.drawImage(sp.cv,fx+sp.x,fy+sp.y);else guestFace(g,fx,fy,fs*1.25,c2.color,c2.mood);}else s.sprite(g,c2.p,fx,fy,fs*2.6,{exact:true,still:true,mood:c2.mood});
   ST.nameTag(g,fx,y0+ph-fs*.85,fs*2.6,c2.name.slice(0,9));
   g.fillStyle=on?'#14062e':'#fff';g.textAlign='right';g.textBaseline='middle';g.font=`900 ${fs*1.9}px "SC Bangers",Impact,sans-serif`;
   g.fillText(c2.over?'OVER':c2.spins.length?label(c2.total):'—',x0+pw-8,y0+fs*1.8);g.font=`800 ${fs*.62}px "SC Nunito",sans-serif`;
   g.fillText(c2.spins.length?c2.spins.map(label).join(' + '):(k===order.indexOf(cur)?'SPINNING':'UP NEXT'),x0+pw-8,y0+fs*3.4);
   if(c2.bonus)g.fillText('+'+money(c2.bonus),x0+pw-8,y0+fs*4.1);});}
 function guestFace(g,x0,y0,r,col,mood){g.save();g.fillStyle='#e8b68c';g.beginPath();g.arc(x0,y0,r,0,TAU);g.fill();g.fillStyle=col;g.beginPath();g.arc(x0,y0-r*.35,r*1.02,Math.PI,TAU);g.fill();
  g.fillStyle='#2a1a10';g.beginPath();g.arc(x0-r*.35,y0,r*.12,0,TAU);g.arc(x0+r*.35,y0,r*.12,0,TAU);g.fill();g.strokeStyle='#7a2a20';g.lineWidth=r*.12;g.beginPath();
  if(mood==='sad')g.arc(x0,y0+r*.6,r*.3,Math.PI*1.15,Math.PI*1.85);else g.arc(x0,y0+r*.25,r*.35,.2,Math.PI-.2);g.stroke();g.restore();}
 const txtC=(g,s2,x0,y0,size,col)=>{g.save();g.font=`900 ${size}px "SC Nunito",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.lineWidth=size*.3;g.strokeStyle='rgba(0,0,0,.7)';g.strokeText(s2,x0,y0);g.fillStyle=col;g.fillText(s2,x0,y0);g.restore();};
 function draw(){layout();x.setTransform(s.dpr||1,0,0,s.dpr||1,0,0);const g=x,fs=L.fs;ST.drawStage(g,W,H,'wheel',t);
  const hostH=L.wide?H*.84:Math.min(H*.4,W*.8),hx=L.wide?W-W*.09:Math.min(W*.86,W-hostH*.19),hy=L.wide?H*.97:H-fs*5.6;
  if(L.wide){ST.drawModel(g,L.wx-L.ww*.32,H*.97,hostH*.92,modelPose,t,0);ST.drawModel(g,L.wx+L.ww*1.3,H*.97,hostH*.9,modelPose,t+1,1,true);}
  g.save();if(shake){g.translate(Math.sin(t*90)*shake*4,0);}drawWheel(g);g.restore();
  ST.drawLogo(g,'wheel-logo','THE BIG WHEEL',W/2,Math.max(L.top+fs*.6,L.wy-fs*.4),Math.min(W*.46,fs*15),t,{cols:['#ffe23a','#ff8a1e']});
  ST.drawHost(g,hx,hy,hostH,hostPose,t,true);
  podiums(g);
  if(mode==='pull'&&human(cur)&&!drag)txtC(g,'GRAB THE WHEEL AND PULL IT DOWN HARD!',W/2,L.wy+L.wh+fs*(L.wide?-1:1),fs*.82,'#fff');
  if(drag){g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=4;g.beginPath();g.moveTo(drag.x,drag.y0);g.lineTo(drag.x,drag.y);g.stroke();}
  chooseBtns=[];if(mode==='choose'&&human(cur)){const bw=Math.min(W*.4,fs*9),bh=fs*2.6,y0=L.wide?H*.78:L.wy+L.wh-bh*1.4,gap=fs;
   [['SPIN AGAIN','again','#1b6fd8'],[`STAY ON ${label(C[cur].total)}`,'stay','#c8102e']].forEach(([lb,id,col],k)=>{const bx=W/2+(k?gap/2:-gap/2-bw);g.fillStyle=col;g.beginPath();g.roundRect(bx,y0,bw,bh,bh/2);g.fill();g.strokeStyle='#ffe23a';g.lineWidth=3;g.stroke();
    txtC(g,lb,bx+bw/2,y0+bh/2,fs*.95,'#fff');chooseBtns.push({x:bx,y:y0,w:bw,h:bh,id});});}
  if(hostSay)ST.bubble(g,L.wide?hx-hostH*.25:W*.5,L.wide?hy-hostH*1.02:Math.max(L.top+fs*4,hy-hostH*1.05),hostSay.text,Math.min(W*.55,fs*14),fs*.82,hx-hostH*.05,hy-hostH*.92);
  if(mode==='intro')ST.drawCurtain(g,W,H,curtain,t);
  if(banner)ST.moneyBanner(g,W,H,banner.big,banner.small,Math.min(1,banner.t*3),banner.col);}
 // ---- input: pull the wheel down (anywhere on its window), or tap a button
 let pullDone=null,chooseDone=null;
 s.on(c,'pointerdown',ev=>{if(s.paused)return;const pt=s.pointer(ev);ev.preventDefault();
  if(mode==='choose'&&human(cur)){for(const b of chooseBtns)if(pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h){choose(b.id);return;}return;}
  if(mode==='pull'&&human(cur)&&L.win&&pt.x>=L.wx-20&&pt.x<=L.wx+L.ww+20&&pt.y>=L.wy&&pt.y<=L.wy+L.wh){drag={x:pt.x,y0:pt.y,y:pt.y,a0:ang,hist:[[pt.y,performance.now()]]};s.capture?.(ev);return;}
  if(mode==='intro'||banner||hostSay)hurry=true;});
 s.on(c,'pointermove',ev=>{if(!drag)return;const pt=s.pointer(ev);const secPx=L.win.h*.62*STEP;drag.y=pt.y;ang=drag.a0+Math.max(-.3,(pt.y-drag.y0)/secPx);drag.hist.push([pt.y,performance.now()]);if(drag.hist.length>12)drag.hist.shift();
  const edge=Math.floor(ang+.5);if(edge!==drag.edge){drag.edge=edge;sfx.click();}});
 const up=ev=>{if(!drag)return;const h=drag.hist,now=performance.now();let k=h.length-1;while(k>0&&now-h[k][1]<90)k--;const dy=h[h.length-1][0]-h[k][0],dt=Math.max(.016,(h[h.length-1][1]-h[k][1])/1000),secPx=L.win.h*.62*STEP;
  const w0=clamp(dy/dt/secPx,0,30);drag=null;if(w0<2.5){ang=Math.round(ang);return;}startSpin(w0);};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',up);
 function startSpin(w0){if(mode!=='pull')return;w0=Math.round(w0*1000)/1000;if(net&&human(cur))net.send({sp:[w0]});const sim=simSpin(ang,w0);spin={sim,i:0,t:0,click:0};mode='spin';hostSay=null;snd.music(false);sfx.cheer(1.2,.08);}
 function choose(id){if(mode!=='choose')return;if(net&&human(cur))net.send({ch:id});mode='wait';const d=chooseDone;chooseDone=null;d?.(id);}
 // ---- a contestant's turn
 const remote=ci=>net&&ci<2&&ci!==me;
 async function oneSpin(ci,second){mode='pull';const c2=C[ci];
  say(second?'Give it another spin!':`${c2.name}, step up to the wheel!`,2000,'point');
  for(;;){if(!s.alive)return null;
   if(!human(ci)&&!remote(ci)){await wait(1100);const w0=c2.guest?9+R()*14:9+Math.random()*(8+8*cpuSkill(s));for(let k=0;k<10;k++){ang+=.03;await wait(25);}startSpin(w0);}
   else if(remote(ci)){for(;;){const m=await net.next();if(!m||!s.alive)return null;if(m.sp){startSpin(+m.sp[0]);break;}}}
   await new Promise(r=>{const go=()=>{if(!s.alive||mode==='spun')return r();setTimeout(go,40);};go();});if(!s.alive)return null;
   const res=spin.sim;spin=null;ang=res.end;
   if(res.travel<N){sfx.wrong();say('Ooh, it has to go all the way around! Spin it again.',2200,'talk');shake=1;setTimeout(()=>shake=0,350);await wait(1600);mode='pull';continue;}
   return res.value;}}
 async function turn(ci){cur=ci;const c2=C[ci];banner={big:c2.name.toUpperCase(),small:C.some(o=>o.spins.length)?`TO BEAT: ${bestSoFar()?label(bestSoFar()):'ANYTHING'}`:'FIRST UP!',t:1.6,col:'#fff'};sfx.applause(1.5,.45);await wait(1600);
  let v=await oneSpin(ci,false);if(v==null)return;c2.spins.push(v);c2.total=v;reactTo(ci,v,false);await wait(1500);
  if(c2.total===100)return;
  // spin again or stay
  mode='choose';say(`${label(c2.total)}! Do you want to spin again?`,2600,'talk');let pickId;
  if(human(ci))pickId=await new Promise(r=>{chooseDone=r;});
  else if(remote(ci)){for(;;){const m=await net.next();if(!m||!s.alive)return;if(m.ch){pickId=m.ch;mode='wait';break;}}}
  else{await wait(1300);pickId=shouldSpin(ci)?'again':'stay';mode='wait';}
  if(!s.alive)return;
  if(pickId==='stay'){say(`${c2.name} stays on ${label(c2.total)}.`,1600);sfx.applause(1);await wait(1500);return;}
  v=await oneSpin(ci,true);if(v==null)return;c2.spins.push(v);c2.total+=v;if(c2.total>100)c2.over=true;reactTo(ci,v,true);await wait(1700);}
 const bestSoFar=()=>Math.max(0,...C.filter(o=>o.spins.length&&!o.over).map(o=>o.total));
 // the game's own players: stay if it beats everyone so far and is decent, else spin (the guest plays it like a cautious pro)
 function shouldSpin(ci){const c2=C[ci],best=bestSoFar(),left=order.slice(order.indexOf(ci)+1).length,v=c2.total;if(v<best||v===best&&left===0)return true;
  const sk=c2.guest?.85:cpuSkill(s);return v<(left?60:50)+(1-sk)*10;}
 function reactTo(ci,v,second){const c2=C[ci],tot=c2.total;
  if(tot===100){c2.mood='win';if(snd.clip('wheel-dollar'))sfx.cheer(2.4,.2);else sfx.dollar();banner={big:'ONE DOLLAR!',small:'$1,000 and a bonus spin!',t:2.4,col:'#ffe23a'};say('A DOLLAR! You win a thousand dollars!',2400,'cheer');modelPose='clap';vibrate([40,60,40,60,120]);}
  else if(c2.over){c2.mood='sad';sfx.over();banner={big:'OVER!',small:`${label(tot)}: over a dollar`,t:2,col:'#ff6a5a'};say('Oh, you went over. I\'m sorry.',2000);}
  else{sfx.ding();c2.mood=tot>=80?'win':'normal';banner={big:label(v),small:second?`TOTAL ${label(tot)}`:'',t:1.4,col:'#fff'};if(tot>=85)sfx.applause(1.4);}}
 async function bonusSpin(ci){const c2=C[ci];cur=ci;banner={big:'BONUS SPIN!',small:'5 or 15 wins $10,000 · the dollar wins $25,000',t:2.2,col:'#7dff5a'};await wait(2200);
  const v=await oneSpin(ci,true);if(v==null)return;const win=v===100?25000:v===5||v===15?10000:0;c2.bonus=1000+win;
  if(win){sfx.jackpot(true);banner={big:money(win)+'!',small:'BONUS SPIN WINNER!',t:2.6,col:'#ffe23a'};modelPose='clap';say('Unbelievable!',2200,'cheer');}else{sfx.ding();banner={big:label(v),small:'Still $1,000!',t:1.8,col:'#fff'};}await wait(2400);}
 // ---- frame
 s.frame(dt=>{dt=Math.min(dt,.05);t+=dt;{const pl=mode!=='intro'&&mode!=='over';if(pl!==murOn){murOn=pl;snd.murmur?.(pl);}}
  if(mode==='intro'){introT+=dt;curtain=clamp((introT-.4)/1.4,0,1);}
  if(hostSay){hostSay.t-=dt;if(hostSay.t<=0){hostSay=null;hostPose='talk';}}
  if(banner){banner.t-=dt;if(banner.t<=0)banner=null;}
  if(spin){spin.t+=dt*(hurry?2.5:1);const p=spin.sim.path;while(spin.i<p.length-1&&p[spin.i+1][1]<=spin.t)spin.i++;ang=p[spin.i][0];
   while(spin.click<spin.sim.clicks.length&&spin.sim.clicks[spin.click]<=spin.t){spin.click++;sfx.click();}
   if(spin.i>=p.length-1){hurry=false;mode='spun';}}
  draw();});
 s.debug={snd,get mode(){return mode;},C,order,get cur(){return cur;},simSpin,valueAt,spin:(w0=16)=>startSpin(w0),choose:id=>choose(id),set hurry(v){hurry=!!v;},
  bot:net?()=>{if(!human(cur))return '';if(mode==='pull'){startSpin(10+Math.random()*12);return 'spin';}if(mode==='choose'){choose(C[cur].total<55?'again':'stay');return 'choose';}hurry=true;return '';}:null};
 // ---- the show
 if(!s.fromMenu&&!await s.pass(0,net?'THE BIG WHEEL online: three contestants, closest to $1.00 without going over wins.':cpu?`THE BIG WHEEL vs ${names[1]} and a studio contestant: pull the wheel down hard, closest to $1.00 without going over wins.`:'THE BIG WHEEL: two players and a studio contestant. Pull the wheel down hard; closest to $1.00 without going over wins.','Come on down!'))return;
 await SS.ready(['stage-wheel','stage-wheel-tall','curtain','wheel-frame','wheel-logo','host','model','model-2','nametag'],5000);
 if(!s.fromMenu)snd.title(true);snd.music(true);snd.crowd(3.2,.9,{at:.3});mode='intro';introT=0;
 banner={big:'SHOWCASE SHOWDOWN!',small:C.map(o=>o.name.toUpperCase()).join(' · '),t:2.6,col:'#ffe23a'};await wait(2600);
 say('Time to spin the big wheel! Closest to a dollar without going over wins.',2600,'point');introT=Math.max(introT,2.3);await wait(2600);snd.title(false);
 for(const ci of order){if(!s.alive)return;await turn(ci);if(!s.alive)return;
  if(C[ci].total===100&&!C[ci].over)await bonusSpin(ci);snd.music(true);}
 if(!s.alive)return;
 // who won? ties at the top spin off with one spin each (highest wins)
 let best=bestSoFar(),top=C.map((o,i)=>i).filter(i=>!C[i].over&&C[i].total===best&&C[i].spins.length);
 if(!top.length){top=[0,1,2];}
 while(top.length>1&&s.alive){banner={big:'SPIN-OFF!',small:'One spin each: highest wins',t:2,col:'#7dff5a'};await wait(2000);const got=[];
  for(const ci of top){cur=ci;const v=await oneSpin(ci,true);if(v==null)return;got.push(v);banner={big:label(v),small:C[ci].name.toUpperCase(),t:1.4,col:'#fff'};sfx.ding();await wait(1400);}
  const mx=Math.max(...got);top=top.filter((ci,k)=>got[k]===mx);}
 const w=top[0];mode='over';cur=w;snd.music(false);C[w].mood='win';
 banner={big:`${C[w].name.toUpperCase()} WINS!`,small:'On to the Showcase!',t:3,col:'#ffe23a'};if(!snd.clip('showcase-win',{max:9,fout:1.4})){if(w<2)sfx.winner();else sfx.jackpot();}else sfx.applause(3,.7);modelPose='clap';say(`${C[w].name}, you're going to the Showcase!`,3000,'cheer');if(w<2)s.react?.(w,'win');
 await wait(3200);
 const score=i=>(C[i].over?0:C[i].total)+(i===w?200:0)+Math.round(C[i].bonus/100);
 if(s.episode)s.episode.out={winner:w,bonus:C.map(o=>o.bonus||0),totals:C.map(o=>o.over?-1:o.total)};
 s.finish([score(0),score(1)],`THE BIG WHEEL · ${C.map(o=>`${o.name} ${o.over?'over':label(o.total)}`).join(' · ')} · ${C[w].name} wins`);}
Object.assign(exports,{bigWheel,simSpin,WHEEL,valueAt});
