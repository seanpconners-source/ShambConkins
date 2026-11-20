// Simon Says Face-Off: a shared, growing sequence. Repeat everything, then add one pad. First mistake loses.
// Nov 20 rebuild (owner: look and sound like the real Simon, dead on; a 90s kid's room behind it): full-screen canvas, the
// toy drawn from above (simonArt.js: owner's pictures when they're in, else drawn), real Simon tones and timing
// (simonSound.js): a tone plays for as long as a pad is lit or held; playback 0.42 s per pad for 1-5, 0.32 s for 6-13,
// 0.22 s from 14, 0.05 s dark between; 3 s to make each press like the toy (5 s to add the new pad); a mistake = the razz
// while the right pad lights. Turns, the CPU, online moves {t: pad | -1 too slow} and s.debug.bot are as before.
const {isCpu,isOnline,cpuSkill}=require("src/engines/cpuKit.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {vibrate}=require("src/audio.js");
const A=require("src/engines/simonArt.js");
const {createSimonSound}=require("src/engines/simonSound.js");

const NAMES=['GREEN','RED','YELLOW','BLUE'];
const toneMs=n=>n<=5?420:n<=13?320:220,GAP=50;
const PRESS_S=3,ADD_S=5,RAZZ_MS=1500;
const FONT='"SC Nunito","Arial Rounded MT Bold",Arial,sans-serif',HEAD='"SC Bangers",Impact,"Arial Black",sans-serif';
const PCOL=['#78b6ff','#ff9fc6'];

async function simon(s){
 const [c,x]=s.canvas(420,760,{fill:true});
 const fb=fullBleed(s,{bg:'#0d1f28'});
 A.preload();
 const snd=createSimonSound();snd.preload();s.cleanup(()=>snd.stopAll());
 const names=[s.players[0].name,s.players[1].name],score=[0,0],seq=[];
 let phase='idle',onTap=null,P=0,loser=-1,status='',sub='',k=0,need=0,result=null;
 const rand=s.random,cpu=isCpu(s),bot=P=>cpu&&P===1;if(cpu)s.hotseat=true;
 // Online (s.online): the player whose turn it is taps on their own phone; each tap {t: pad, or -1 = too slow} streams to
 // the other phone, which plays it like a CPU turn. Only the tapping phone runs the too-slow clock.
 const net=isOnline(s)?s.online:null,theirs=P=>!!net&&P===net.remote,auto=P=>bot(P)||theirs(P);if(net)s.hotseat=true;
 let botTap=null,finishNow=null;
 s.debug={seq,score,phase:()=>phase,lit:()=>lit(),pad:q=>padPoint(q),finish:()=>finishNow?.(),btn:()=>Lo?.btn||null};
 s.debug.bot=net?()=>{if(s.paused)return null;if(phase==='input'&&botTap&&!auto(s.active)){botTap();return 'tap';}if(phase==='over'&&finishNow){finishNow();return 'go';}return null;}:null;
 s.hint('Watch the pads light up. On your turn repeat the whole sequence from the start, then tap one extra pad to add it. You get 3 seconds for each press, like the real toy. Make a mistake or run out of time and you lose.');

 // ---- lights + tones: one entry per source; a tone lasts exactly as long as its light
 const L=new Map();
 function light(id,q,ms,{tone=q,held=false}={}){off(id);L.set(id,{q,until:performance.now()+ms,held});snd.start(id,tone);}
 function off(id){if(L.delete(id))snd.stop(id);}
 const offInput=()=>{for(const id of [...L.keys()])if(id!=='play')off(id);};
 const lit=()=>[0,1,2,3].map(q=>[...L.values()].some(l=>l.q===q));

 // ---- layout
 let Lo=null;
 function layout(){const W=s.W,H=s.H,top=(fb.top||40)+6,wide=W>H*1.15;
  if(wide){const col=Math.min(150,W*.2),R=Math.max(60,Math.min((H-top-64)/2*.98,(W-col*2)/2*.94));
   Lo={W,H,wide,R,cx:W/2,cy:top+(H-top-58)/2+4,face:Math.min(74,col*.55),f0:[col/2+6,H*.42],f1:[W-col/2-6,H*.42],cnt:[W/2,top+2]};}
  else{const face=Math.max(40,Math.min(64,W*.15)),hb=top+face+30,R=Math.max(60,Math.min(W*.47,(H-hb-66)/2*.97));
   Lo={W,H,wide,R,cx:W/2,cy:hb+(H-hb-62)/2,face,f0:[12+face/2+4,top+face/2],f1:[W-12-face/2-4,top+face/2],cnt:[W/2,top-2]};}
  return Lo;}
 const padPoint=q=>{const l=Lo||layout(),sx=q%2?1:-1,sy=q<2?-1:1,d=l.R*.48;return {x:l.cx+sx*d,y:l.cy+sy*d};};

 // ---- input
 const held=new Map();
 s.on(c,'pointerdown',ev=>{ev.preventDefault();if(s.paused||!Lo)return;const pt=s.pointer(ev);
  if(phase==='over'){if(finishNow&&Lo.btn&&pt.x>Lo.btn.x&&pt.x<Lo.btn.x+Lo.btn.w&&pt.y>Lo.btn.y&&pt.y<Lo.btn.y+Lo.btn.h)finishNow();return;}
  const q=A.padAt(pt.x,pt.y,Lo.cx,Lo.cy,Lo.R);if(q<0||phase!=='input'||!onTap||auto(s.active))return;
  s.capture(ev);held.set(ev.pointerId,'in'+ev.pointerId);onTap(q,false,'in'+ev.pointerId);});
 const up=ev=>{const id=held.get(ev.pointerId);if(!id)return;held.delete(ev.pointerId);s.release(ev);const l=L.get(id);if(l)l.held=false;};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',up);
 const KEYS={q:0,w:1,a:2,s:3,'7':0,'9':1,'1':2,'3':3};
 s.on(document,'keydown',ev=>{const q=KEYS[ev.key?.toLowerCase?.()];if(q==null||ev.repeat||s.paused||phase!=='input'||!onTap||auto(s.active))return;onTap(q,false,'key');const l=L.get('key');if(l)l.held=true;});
 s.on(document,'keyup',ev=>{if(KEYS[ev.key?.toLowerCase?.()]!=null){const l=L.get('key');if(l)l.held=false;}});

 let idle=0,limit=0;
 s.frame(dt=>{const now=performance.now();
  if(s.paused){if(L.size){for(const id of [...L.keys()])off(id);}}
  for(const [id,l] of [...L])if(!l.held&&now>=l.until)off(id);
  if(limit>0&&phase==='input'&&!theirs(s.active)&&!s.paused){idle+=dt;if(idle>limit&&onTap){const f=onTap;f(-1);}}
  draw(now);});

 // ---- drawing
 function pill(cx,cy,text,size,{bg='rgba(8,12,22,.78)',col='#fff',font=FONT,weight=800,maxW=1e9}={}){
  x.font=`${weight} ${size}px ${font}`;let w=x.measureText(text).width;if(w>maxW){size*=maxW/w;x.font=`${weight} ${size}px ${font}`;w=maxW;}
  const h=size*1.7;x.fillStyle=bg;rr(cx-w/2-size*.8,cy-h/2,w+size*1.6,h,h/2);x.fill();
  x.fillStyle=col;x.textAlign='center';x.textBaseline='middle';x.fillText(text,cx,cy+size*.05);return h;}
 function rr(x0,y0,w,h,r){x.beginPath();x.moveTo(x0+r,y0);x.arcTo(x0+w,y0,x0+w,y0+h,r);x.arcTo(x0+w,y0+h,x0,y0+h,r);x.arcTo(x0,y0+h,x0,y0,r);x.arcTo(x0,y0,x0+w,y0,r);x.closePath();}
 function face(i,[fx,fy],f){const act=phase!=='over'&&s.active===i&&phase!=='idle',mood=phase==='over'?(i===loser?'sad':'win'):act?'think':'normal';
  x.save();if(act){x.shadowColor=PCOL[i];x.shadowBlur=18;}x.fillStyle='rgba(8,12,22,.8)';x.beginPath();x.arc(fx,fy,f*.58,0,7);x.fill();x.restore();
  x.lineWidth=act?4:2;x.strokeStyle=act?PCOL[i]:'rgba(255,255,255,.35)';x.beginPath();x.arc(fx,fy,f*.58,0,7);x.stroke();
  s.sprite(x,i,fx,fy,f*.98,{mood,exact:true,still:true,noBadge:true});
  pill(fx,fy+f*.58+13,`${names[i]}  ${score[i]}`,12,{maxW:f*1.9,col:act?PCOL[i]:'#fff'});}
 function draw(now){const l=layout(),W=l.W,H=l.H;
  A.drawRoom(x,W,H,l.cx,l.cy,l.R);
  A.drawToy(x,l.cx,l.cy,l.R,lit(),now/1000);
  face(0,l.f0,l.face);face(1,l.f1,l.face);
  // pattern length
  x.save();const cy=l.wide?l.cnt[1]+20:l.cnt[1]+l.face*.45;
  x.font=`400 ${l.wide?30:34}px ${HEAD}`;const label=String(seq.length);
  pill(l.cx,cy,'PATTERN  '+label,l.wide?17:18,{font:HEAD,weight:400,col:'#ffe14a'});x.restore();
  // status under the toy
  if(status)pill(l.cx,Math.min(H-24,l.cy+l.R+30),status,Math.max(13,Math.min(18,W/26)),{maxW:W-40});
  if(sub&&phase!=='over')pill(l.cx,Math.min(H-24,l.cy+l.R+30)-34,sub,12,{bg:'rgba(8,12,22,.6)',col:'#cfe3ff',maxW:W-60});
  if(phase==='over')drawResult(l);}
 function drawResult(l){const win=1-loser,W=l.W,H=l.H;x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,0,W,H);
  const pw=Math.min(W-28,420),ph=Math.min(H-40,330),px=(W-pw)/2,py=(H-ph)/2;
  x.fillStyle='rgba(14,20,34,.94)';rr(px,py,pw,ph,22);x.fill();x.lineWidth=3;x.strokeStyle='#ffe14a';x.stroke();
  const f=Math.min(110,ph*.34);
  x.save();x.shadowColor='#ffe14a';x.shadowBlur=20;s.sprite(x,win,W/2-f*.45,py+20+f/2,f,{mood:'win',exact:true,still:true,noBadge:true});x.restore();
  s.sprite(x,loser,W/2+f*.65,py+30+f/2,f*.7,{mood:'sad',exact:true,still:true,noBadge:true});
  x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';
  let t=`${names[win]} outlasts ${names[loser]}!`,sz=26;x.font=`400 ${sz}px ${HEAD}`;const w=x.measureText(t).width;if(w>pw-30){sz*=(pw-30)/w;x.font=`400 ${sz}px ${HEAD}`;}
  x.fillText(t,W/2,py+f+52);
  x.font=`700 14px ${FONT}`;x.fillStyle='#cfe3ff';x.fillText(`The pattern reached ${seq.length} before ${names[loser]} slipped.`,W/2,py+f+82,pw-24);
  const bw=150,bh=46;l.btn={x:W/2-bw/2,y:py+ph-bh-18,w:bw,h:bh};
  x.fillStyle='#ffd23f';rr(l.btn.x,l.btn.y,bw,bh,bh/2);x.fill();x.fillStyle='#1b1300';x.font=`900 18px ${FONT}`;x.fillText('FINISH',W/2,l.btn.y+bh/2+1);}

 // vs CPU: player 2 replays the pattern pad by pad; past its memory span (about 8 / 14 / 17 pads) slips get likely.
 async function cpuSimon(need){const span=4+14*cpuSkill(s);
  for(let k=0;k<=need;k++){if(!await s.wait(k?330+Math.random()*200:700)||!onTap)return;
   if(k===need){onTap(Math.floor(Math.random()*4));return;}
   const err=k+1<=span?.004:Math.min(.6,(k+1-span)*.12);onTap(Math.random()<err?(seq[k]+1+Math.floor(Math.random()*3))%4:seq[k]);}}

 while(loser<0){
  phase='idle';onTap=null;status='';sub='';
  if(!auto(P)&&!await s.pass(P,seq.length?`Watch the ${seq.length}-pad pattern, repeat it, then add ONE more pad.`:`You start! Tap any pad to begin the pattern.`,'Start my turn',{countdown:2}))return;
  s.shared=false;s.active=P;s.updateScores();
  if(seq.length){
   phase='watch';status='Watch Simon…';sub='';
   if(!await s.wait(800))return;
   const d=toneMs(seq.length);
   for(const q of seq){light('play',q,d);if(!await s.wait(d+GAP))return;}
  }
  k=0;need=seq.length;
  result=await new Promise(resolve=>{
   phase='input';idle=0;limit=need?PRESS_S:ADD_S;
   status=need?`${names[P]}: repeat it  0 / ${need}`:`${names[P]}: tap any pad to start`;sub=auto(P)?(theirs(P)?'Playing on their phone':'CPU is playing'):'';
   onTap=(q,remote=false,id='in')=>{
    if(phase!=='input')return;if(net&&!theirs(P)&&!remote)net.send({t:q});
    if(q<0){phase='busy';onTap=null;offInput();resolve({fail:'slow'});return;}
    idle=0;offInput();vibrate?.(8);
    if(k<need){
     if(q!==seq[k]){phase='busy';onTap=null;resolve({fail:'wrong',q});return;}
     light(id,q,id==='in'||id==='key'?240:150,{held:id!=='in'});k++;
     status=k<need?`${names[P]}: repeat it  ${k} / ${need}`:`Now ADD one more pad!`;
     if(k===need){idle=0;limit=ADD_S;}else limit=PRESS_S;
    }else{phase='busy';onTap=null;light(id,q,id==='in'||id==='key'?320:180,{held:id!=='in'});resolve({add:q});}
   };
   if(bot(P))void cpuSimon(need);
   else if(theirs(P))void (async()=>{while(s.alive&&phase==='input'&&onTap){const m=await net.next();if(!m||!s.alive||!onTap)return;if(Number.isInteger(m.t))onTap(m.t,true);}})();
   // online test bot: repeats the pattern, slips now and then once it gets long, then adds a pad
   botTap=()=>{if(!onTap)return;onTap(k<need?(need>=4&&Math.random()<.15?(seq[k]+1)%4:seq[k]):Math.floor(Math.random()*4));};
  });
  if(!s.alive)return;
  if(result.fail){
   loser=P;for(const id of [...L.keys()])off(id);
   const right=seq[k];
   status=result.fail==='slow'?'Too slow!':`Wrong! It was ${NAMES[right]}.`;sub='';
   // the real toy: the razz buzz while the pad you should have pressed lights
   light('razz',right??-9,RAZZ_MS,{tone:-1});vibrate?.([60,40,60]);
   if(!await s.wait(RAZZ_MS+500))return;
  }else{
   seq.push(result.add);score[P]=seq.length;s.setScores([...score]);
   status=`Added! The pattern is now ${seq.length} long.`;sub='';
   if(!await s.wait(900))return;
   P=1-P;
  }
 }
 const win=1-loser;
 s.shared=true;s.updateScores();onTap=null;status='';phase='over';
 await new Promise(res=>{finishNow=()=>{finishNow=null;res(1);};});if(!s.alive)return;
 s.finish([...score],`${names[win]} won the memory duel; the longest pattern completed was ${Math.max(...score)}.`);
}
Object.assign(exports,{simon});
