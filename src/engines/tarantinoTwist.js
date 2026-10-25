// Pulp Fiction · Twist Contest (Jack Rabbit Slim's). Rhythm duel: four big touch lanes per half, a generated
// twelve-bar surf-rock twist (bass, drums, chops; your hits play the lead guitar). Highest score wins the trophy.
// Online (netField, like Shred Hero): each phone dances on its own lanes (wide, left; the other dancer's lanes narrow on
// the right, run on the other phone's song clock from snapshots {clk,score,combo,groove}); hits go over as {e:{n,h}}.
const {clamp,seededRandom}=require("src/utils.js");
const K=require("src/engines/tarantinoKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");
const {label,rr,lerp,filmOverlay,flash,titleCard,makeFx,makeShake,voice,noise,sfx,halfPointers,keyboard,ac}=K;

const BPM=150,BEAT=60/BPM,EIGHTH=BEAT/2,BAR=BEAT*4,TRAVEL=1.75,PERFECT=.08,GOOD=.16,INTRO_BARS=2,CHORUSES=3;
const LANE_COL=['#ff4f9a','#2fd6c9','#ffd23f','#ff7a3a'],LANE_ARROW=['left','down','up','right'],LEAD_SEMI=[0,3,7,10];
const CHORDS=[0,0,0,0,5,5,0,0,7,5,0,7],BOOGIE=[0,4,7,9,10,9,7,4],E2=82.41;
const CELLS={A:[1,0,1,0,1,0,1,0],B:[1,0,0,1,1,0,1,0],C:[1,0,1,1,0,1,1,0],D:[1,1,0,1,1,0,1,1],E:[1,0,0,0,1,0,0,0],F:[1,0,1,0,1,1,1,0],G:[1,0,1,0,0,0,1,1]};
const POOLS=[['E','A','B','G'],['A','B','C','F'],['B','C','D','F']];
const midi=semi=>E2*2**(semi/12);

function buildChart(seed){
 const rnd=seededRandom(seed+':twist'),notes=[];let lane=1;
 const walk=prev=>clamp(prev+[-1,-1,0,1,1,2,-2,0][Math.floor(rnd()*8)],0,3);
 for(let ch=0;ch<CHORUSES;ch++){
  for(let phrase=0;phrase<3;phrase++){
   const pool=POOLS[ch],cellA=CELLS[pool[Math.floor(rnd()*pool.length)]],cellB=CELLS[pool[Math.floor(rnd()*pool.length)]];
   const mk=cell=>{const out=[];for(let st=0;st<8;st++)if(cell[st]){lane=walk(lane);out.push({st,lane});}return out;};
   const a=mk(cellA),b=mk(cellB);
   for(let k=0;k<4;k++){
    const bar=INTRO_BARS+ch*12+phrase*4+k;let seq=k===0||k===2?a:b;
    if(k===3){seq=seq.map(n=>({...n}));if(seq.length)seq[seq.length-1].lane=Math.floor(rnd()*4);}
    for(const n of seq)notes.push({t:bar*BAR+n.st*EIGHTH,lane:n.lane,hit:null,bar});
    // third chorus: occasional two-lane chords on beat one
    if(ch===2&&k%2===0&&seq.length){const first=seq[0],other=(first.lane+2)%4;notes.push({t:bar*BAR+first.st*EIGHTH,lane:other,hit:null,bar});}
   }
  }
 }
 const endBar=INTRO_BARS+CHORUSES*12;
 for(let l=0;l<4;l++)notes.push({t:endBar*BAR+BEAT,lane:l,hit:null,bar:endBar,dip:true});
 notes.sort((p,q)=>p.t-q.t);
 return {notes,end:endBar*BAR+BEAT};
}

async function twist(s){
 const [c,x]=s.canvas(900,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();s.queueCanvasFit?.();
 const chart=buildChart(s.seed),notes=[0,1].map(()=>chart.notes.map(n=>({...n}))),fx=makeFx(),shake=makeShake();
 const st=[0,1].map(()=>({score:0,combo:0,best:0,perfect:0,good:0,miss:0,press:[0,0,0,0],text:'',textT:0,textC:'#fff',groove:50,wave:0,moodT:0,mood:''}));
 const S={clock:-1.6,rclock:-1.6,card:0,phase:'card',end:0,over:false,sched:-1,beatPulse:0,flash:0,trophyT:0};
 const nf=netField(s,{pack:i=>({clk:+S.clock.toFixed(2),score:st[i].score,combo:st[i].combo,groove:Math.round(st[i].groove)}),
  unpack:(i,d)=>{if(Number.isFinite(d.clk))S.rclock+=(d.clk-S.rclock)*.5;st[i].score=+d.score||0;st[i].combo=+d.combo||0;st[i].groove=+d.groove||0;},
  onEvent:e=>{const n=notes[nf.remote][e?.n],r=st[nf.remote];if(n&&(e.h==='perfect'||e.h==='good')){n.hit=e.h;r.press[n.lane]=.16;say(nf.remote,e.h==='perfect'?'PERFECT':'GOOD',e.h==='perfect'?'#9dffb0':'#ffe48a');}}});
 s.debug={engine:'twist',st,S,notes};
 // audio bus with a little slap-back echo for the surf-guitar feel
 let bus=null;const a0=ac();
 if(a0){try{const b=a0.createGain(),d=a0.createDelay(.6),fb=a0.createGain(),wet=a0.createGain();d.delayTime.value=.19;fb.gain.value=.3;wet.gain.value=.28;b.connect(a0.destination);b.connect(d);d.connect(fb);fb.connect(d);d.connect(wet);wet.connect(a0.destination);bus=b;s.cleanup(()=>{setTimeout(()=>{try{b.disconnect();d.disconnect();fb.disconnect();wet.disconnect();}catch{}},1200);});}catch{bus=null;}}
 const L={};
 const layout=()=>{const W=s.W,H=s.H,sh=clamp(H*.27,86,170),hy=H-clamp(H*.13,52,80),m=Math.max(4,W*.012),halfW=W/2;
  const HW=nf?(nf.me?[W*.32,W*.68]:[W*.68,W*.32]):[halfW,halfW],X0=nf?(nf.me?[W*.68,0]:[0,W*.68]):[0,halfW],LW=HW.map(w=>(w-m*2)/4);
  Object.assign(L,{W,H,sh,hy,m,halfW,HW,X0,LW,RS:LW.map(lw=>clamp(Math.min(lw*.44,28),13,28)),lw:LW[0],r:clamp(Math.min(LW[0]*.44,28),13,28)});};
 // per dancer: lanes start at X0[i], HW[i] wide; the remote dancer's notes run on the other phone's clock
 const use=i=>{L.halfW=L.HW[i];L.lw=L.LW[i];L.r=L.RS[i];};
 const clockOf=i=>nf&&i===nf.remote?S.rclock:S.clock;
 const laneX=(i,l)=>L.X0[i]+L.m+L.LW[i]*(l+.5),noteY=(t,i=0)=>L.hy-(t-clockOf(i))/TRAVEL*(L.hy-L.sh+L.RS[i]);
 const mult=p=>Math.min(4,1+Math.floor(p.combo/8));
 const say=(i,text,color)=>{st[i].text=text;st[i].textC=color;st[i].textT=.5;};
 function press(i,lane){
  if(S.phase!=='play'||s.paused||!s.alive)return;const me=st[i];me.press[lane]=.16;
  let best=null;for(const n of notes[i])if(n.hit===null&&n.lane===lane&&Math.abs(n.t-S.clock)<=GOOD&&(!best||Math.abs(n.t-S.clock)<Math.abs(best.t-S.clock)))best=n;
  const px=laneX(i,lane);
  if(!best){me.combo=0;me.score=Math.max(0,me.score-25);me.groove=Math.max(0,me.groove-5);say(i,'OFF-BEAT',' #ff8f80'.trim());voice(110,.08,.03,'square');return;}
  const d=Math.abs(best.t-S.clock);best.hit=d<=PERFECT?'perfect':'good';if(nf)nf.event({n:notes[i].indexOf(best),h:best.hit});me[best.hit]++;me.combo++;me.best=Math.max(me.best,me.combo);
  const pts=(best.hit==='perfect'?300:150)*mult(me);me.score+=pts;me.groove=Math.min(100,me.groove+(best.hit==='perfect'?4:2));
  say(i,best.hit==='perfect'?'PERFECT':'GOOD',best.hit==='perfect'?'#9dffb0':'#ffe48a');
  fx.ring(px,L.hy,{r:L.r*.8,grow:L.r*5,life:.3,color:LANE_COL[lane]});fx.spark(px,L.hy,best.hit==='perfect'?12:6,LANE_COL[lane]);
  // your hit plays the lead guitar
  const semi=LEAD_SEMI[lane]+(Math.floor(best.bar)>=INTRO_BARS+12*2?24:12),f=midi(semi),t=i?'square':'sawtooth';
  voice(f,.3,.045,t,{lp:3200,dest:bus||undefined,slide:.995});voice(f*1.004,.22,.02,'triangle',{dest:bus||undefined});
  if(best.dip){fx.confetti(px,L.hy,12);}
  if(me.combo>0&&me.combo%10===0){s.react?.(i,'happy');fx.pop(L.X0[i]+L.HW[i]/2,L.sh+30,`${me.combo} COMBO!`,{color:'#ffd23f',size:clamp(L.W*.03,14,26)});sfx.coin();}
 }
 halfPointers(s,{chooseOwner:nf?()=>nf.me:undefined,down:(i,r)=>{const lx=(r.x-L.X0[i]-L.m)/(L.HW[i]-L.m*2);press(i,clamp(Math.floor(lx*4),0,3));}});
 // vs CPU: dancer 2 hits each glyph with a timing error that shrinks on Hard, and skips a few on Easy
 const cpu=isCpu(s);
 function cpuThink(){const sk=cpuSkill(s);for(const n of notes[1]){if(n.hit!==null||n.cpu)continue;if(n.cpuOff===undefined)n.cpuOff=(Math.random()-.5)*2*GOOD*(1.15-sk)*.75;if(S.clock>=n.t+n.cpuOff){n.cpu=true;if(Math.random()<.62+sk*.36)press(1,n.lane);}}}
 const KL={l:0,d:1,u:2,r:3};keyboard(s,(i,name,down)=>{if(down&&KL[name]!==undefined)press(nf?nf.me:i,KL[name]);});
 if(nf)s.debug.bot=()=>{let n=0;for(const q of notes[nf.me])if(q.hit===null&&Math.abs(q.t-S.clock)<=GOOD&&Math.random()<.85){press(nf.me,q.lane);n++;}return n?'hit':'';};
 s.hint('Tap the lane when its glyph reaches the glowing ring (P1 left half, P2 right half). Keys: P1 A S W D = left down up right, P2 arrow keys. Perfect and Good hits build a combo multiplier up to x4; taps with no glyph cost points. Your hits play the lead guitar. Highest score wins the trophy.');
 if(!await s.pass(0,'The Twist Contest at Jack Rabbit Slim\'s. Hit the glyphs on the beat, build your combo, and take home the trophy.','Both ready — hit it!',{countdown:3}))return;
 layout();

 // ----- backing band, scheduled just ahead of the clock using WebAudio time
 const drum={kick:(d)=>{voice(135,.14,.14,'sine',{delay:d,slide:.3});noise(.03,.05,{delay:d,f0:900});},
  snare:(d)=>{noise(.13,.09,{delay:d,type:'highpass',f0:1800});voice(210,.07,.05,'triangle',{delay:d,slide:.6});},
  hat:(d,v)=>noise(.035,v,{delay:d,type:'highpass',f0:7000}),
  tom:(d,f)=>voice(f,.14,.08,'sine',{delay:d,slide:.5}),cow:(d)=>{voice(800,.18,.04,'square',{delay:d});voice(540,.18,.03,'square',{delay:d})}};
 function band(slot,delay){
  const bar=Math.floor(slot/8),step=slot%8,intro=bar<INTRO_BARS,ci=((bar-INTRO_BARS)%12+12)%12,root=intro?0:CHORDS[ci];
  if(bar>=INTRO_BARS+CHORUSES*12)return;
  if(step===0||step===4)drum.kick(delay);if(step===2||step===6)drum.snare(delay);drum.hat(delay,step%2?.016:.028);
  if(intro){if(step%2===0)drum.cow(delay);return;}
  const chorus=Math.floor((bar-INTRO_BARS)/12);
  const bn=midi(root+BOOGIE[step]);voice(bn,EIGHTH*.9,.055,'sawtooth',{delay,lp:640+chorus*120});
  if(step%2===1&&chorus>=0){const tri=[0,4,7,10];for(let k=0;k<3;k++)voice(midi(root+12+tri[k]),.1,.011,'square',{delay,lp:2400});}
  if(ci===11&&step>=6){drum.tom(delay,step===6?180:140);}
  if(step===0&&chorus>=1){voice(midi(root+24),.5,.012,'triangle',{delay,dest:bus||undefined});}
 }
 const keepBand=()=>{while(S.sched*EIGHTH<S.clock+.16){S.sched++;const d=S.sched*EIGHTH-S.clock;if(S.sched>=0&&d>-.1)band(S.sched,Math.max(0,d));}};

 s.frame((dt,tt)=>{
  layout();fx.step(dt);shake.step(dt);S.flash=Math.max(0,S.flash-dt*2.5);
  if(S.phase==='card'){S.card+=dt;if(S.card>=2.1){S.phase='play';S.sched=Math.floor(S.clock/EIGHTH)-1;}}
  else if(S.phase==='play'||S.phase==='finale'){
   S.clock+=dt;S.rclock+=dt;nf?.tick(dt);keepBand();if(cpu)cpuThink();
   const beatIdx=Math.floor(S.clock/BEAT);if(S.clock>=0&&beatIdx!==S.lastBeat){S.lastBeat=beatIdx;S.beatPulse=1;}S.beatPulse=Math.max(0,S.beatPulse-dt*4);
   for(let i=0;i<2;i++){const me=st[i];me.textT=Math.max(0,me.textT-dt);me.wave+=dt;for(let l=0;l<4;l++)me.press[l]=Math.max(0,me.press[l]-dt);if(nf&&i===nf.remote)continue;me.groove=Math.max(0,me.groove-dt*.8);
    for(const n of notes[i])if(n.hit===null&&S.clock-n.t>GOOD){n.hit='miss';me.miss++;if(me.combo>=8)sfx.groan();me.combo=0;me.groove=Math.max(0,me.groove-8);say(i,'MISS','#ff7a6a');}}
   if(S.phase==='play'&&S.clock>chart.end+.6&&nf&&!S.waitFin){S.waitFin=true;nf.finish(st[nf.me].score);nf.remoteDone().then(v=>{if(v!=null)st[nf.remote].score=+v||0;S.netDone=true;});}
   if(S.phase==='play'&&S.clock>chart.end+.6&&(!nf||S.netDone)){S.phase='finale';S.end=0;S.flash=1;sfx.fanfare();const w=st[0].score===st[1].score?-1:st[0].score>st[1].score?0:1;S.winner=w;for(const i of [0,1]){s.react?.(i,w<0||w===i?'win':'sad',3);}fx.confetti(L.W/2,L.sh,60,['#ffd23f','#fff','#ff4f9a']);
    voice(midi(7+24),1.2,.05,'sawtooth',{lp:3000,dest:bus||undefined});voice(midi(0+12),1.2,.05,'sawtooth',{lp:1500,dest:bus||undefined});}
   if(S.phase==='finale'){S.end+=dt;if(Math.random()<dt*14)fx.spark(L.W/2+(Math.random()-.5)*L.W*.3,L.sh*.5+Math.random()*L.sh*.5,3,'#fff6c8',160);if(S.end>3.6&&!S.over){S.over=true;s.finish([st[0].score,st[1].score],'Twist Contest');}}
  }
  draw(tt);
 });

 function glyph(cx,cy,r,lane,color,alpha=1){
  x.save();x.globalAlpha*=alpha;x.translate(cx,cy);
  x.fillStyle='#10101c';x.beginPath();x.arc(0,0,r,0,6.3);x.fill();x.strokeStyle=color;x.lineWidth=Math.max(3,r*.2);x.stroke();
  x.strokeStyle='#ffffffaa';x.lineWidth=1.5;x.beginPath();x.arc(0,0,r*.82,Math.PI*1.1,Math.PI*1.6);x.stroke();
  x.fillStyle=color;x.beginPath();const k=r*.52,dir=LANE_ARROW[lane];
  if(dir==='left'){x.moveTo(-k,0);x.lineTo(k*.1,-k);x.lineTo(k*.1,-k*.4);x.lineTo(k,-k*.4);x.lineTo(k,k*.4);x.lineTo(k*.1,k*.4);x.lineTo(k*.1,k);}
  else if(dir==='right'){x.moveTo(k,0);x.lineTo(-k*.1,-k);x.lineTo(-k*.1,-k*.4);x.lineTo(-k,-k*.4);x.lineTo(-k,k*.4);x.lineTo(-k*.1,k*.4);x.lineTo(-k*.1,k);}
  else if(dir==='up'){x.moveTo(0,-k);x.lineTo(-k,k*.1);x.lineTo(-k*.4,k*.1);x.lineTo(-k*.4,k);x.lineTo(k*.4,k);x.lineTo(k*.4,k*.1);x.lineTo(k,k*.1);}
  else{x.moveTo(0,k);x.lineTo(-k,-k*.1);x.lineTo(-k*.4,-k*.1);x.lineTo(-k*.4,-k);x.lineTo(k*.4,-k);x.lineTo(k*.4,-k*.1);x.lineTo(k,-k*.1);}
  x.closePath();x.fill();x.restore();
 }
 function dancer(i,tt){
  const me=st[i],cx=L.X0[i]+L.HW[i]/2,sh=L.sh,size=clamp(Math.min(sh*.34,L.HW[i]*.26),26,58),hype=me.groove/100,bounce=Math.abs(Math.sin(S.clock*Math.PI/BEAT))*(4+hype*10);
  const base=sh*.97,hipSw=Math.sin(S.clock*Math.PI/BEAT*1)*(.2+hype*.2),headY=base-size*1.7-bounce;
  x.save();x.translate(cx,0);
  x.fillStyle='#00000040';x.beginPath();x.ellipse(0,base,size*.7,size*.14,0,0,6.3);x.fill();
  x.save();x.translate(0,base-size*.15-bounce*.4);x.rotate(hipSw*.4);
  x.strokeStyle=i?'#2a2038':'#20263c';x.lineWidth=size*.2;x.lineCap='round';x.beginPath();x.moveTo(-size*.16,0);x.lineTo(-size*.22-hipSw*size,size*.15);x.moveTo(size*.16,0);x.lineTo(size*.22-hipSw*size,size*.15);x.stroke();
  x.fillStyle=i?'#e0508f':'#3f7be0';rr(x,-size*.36,-size*.95,size*.72,size*.95,size*.2);x.fill();x.fillStyle='#fff';x.fillRect(-size*.36,-size*.3,size*.72,size*.1);
  const sw=Math.sin(S.clock*Math.PI/BEAT)*(.9+hype);x.strokeStyle=i?'#e0508f':'#3f7be0';x.lineWidth=size*.17;x.beginPath();x.moveTo(-size*.34,-size*.8);x.lineTo(-size*.7,-size*.45+sw*size*.35);x.moveTo(size*.34,-size*.8);x.lineTo(size*.7,-size*.45-sw*size*.35);x.stroke();
  x.restore();
  x.translate(0,headY+size*.15);x.rotate(Math.sin(S.clock*Math.PI/BEAT)*.13*(1+hype));
  s.sprite(x,i,0,0,size*1.15,{exact:true,mood:me.combo>=10?'win':me.moodT>0?'sad':'walking'});
  x.restore();
 }
 function draw(tt){
  const {W,H,sh,hy,halfW}=L,t=S.clock;x.save();shake.apply(x);
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#2a1747');bg.addColorStop(.35,'#1a1233');bg.addColorStop(1,'#0e1426');x.fillStyle=bg;x.fillRect(0,0,W,H);
  // stage floor: checkerboard
  const cs=Math.max(18,W/26);for(let r=0;r*cs*.5<sh*.55;r++)for(let q=-1;q*cs<W+cs;q++){x.fillStyle=(r+q)%2?'#2d2a4e':'#201c3b';x.fillRect(q*cs,sh-sh*.55+r*cs*.5,cs,cs*.5+1);}
  // neon sign + crowd
  const sf=clamp(W*.022,10,20);label(x,"JACK RABBIT SLIM'S",W/2,sh*.13,sf*1.2,{fill:'#ff7ab8',stroke:'#7a1d4d',lw:2,alpha:.75+.25*Math.sin(tt*3)});
  const nCrowd=10,avg=(st[0].groove+st[1].groove)/200;
  for(let k=0;k<nCrowd;k++){const px=W*(k+.5)/nCrowd,py=sh*.27+Math.sin(t*5+k)*2*avg+(S.beatPulse*2),r=clamp(W*.014,7,13);x.fillStyle=['#7a5a8c','#8c5a6a','#5a7a8c','#8c7a5a'][k%4];x.beginPath();x.arc(px,py,r,0,6.3);x.fill();x.fillRect(px-r*1.1,py+r*.6,r*2.2,r*1.2);
   if(avg>.6&&(k+Math.floor(t*2))%4===0)label(x,'♥',px,py-r*1.5,r*1.4,{fill:'#ff5a8a',stroke:null});else if(avg<.25)label(x,'…',px,py-r*1.4,r*1.4,{fill:'#bbb',stroke:null,alpha:.7});}
  // trophy in the middle
  const tx=W/2,ty=sh*.62,tr=clamp(sh*.2,14,30);
  x.save();x.translate(tx,ty);x.fillStyle='#e8b93a';x.beginPath();x.moveTo(-tr,-tr);x.lineTo(tr,-tr);x.quadraticCurveTo(tr,tr*.6,0,tr*.7);x.quadraticCurveTo(-tr,tr*.6,-tr,-tr);x.fill();x.fillRect(-tr*.12,tr*.6,tr*.24,tr*.5);x.fillRect(-tr*.55,tr*1.05,tr*1.1,tr*.3);x.strokeStyle='#e8b93a';x.lineWidth=3;x.beginPath();x.arc(-tr,-tr*.2,tr*.38,Math.PI*.5,Math.PI*1.5);x.arc(tr,-tr*.2,tr*.38,-Math.PI*.5,Math.PI*.5);x.stroke();
  const gl=(Math.sin(tt*6)+1)/2;x.fillStyle=`rgba(255,255,255,${.25+.5*gl})`;x.fillRect(-tr*.6,-tr*.9,tr*.25,tr*1.2);x.restore();
  if(S.phase==='finale'||S.phase==='play')for(let k=0;k<3;k++){const a=tt*2+k*2.1,gx=tx+Math.cos(a)*tr*1.3,gy=ty+Math.sin(a*1.3)*tr*1.1;x.fillStyle=`rgba(255,245,190,${.4+.5*Math.sin(tt*9+k)})`;x.beginPath();x.moveTo(gx,gy-5);x.lineTo(gx+2,gy);x.lineTo(gx,gy+5);x.lineTo(gx-2,gy);x.closePath();x.fill();}
  for(let i=0;i<2;i++){
   use(i);const x0=L.X0[i],halfW=L.HW[i];x.fillStyle=i?'#2a102c88':'#0c183a88';x.fillRect(x0,sh,halfW,H-sh);
   // spotlight
   if(st[i].groove>55){const g=x.createLinearGradient(0,0,0,sh);g.addColorStop(0,i?'rgba(255,150,200,.25)':'rgba(130,180,255,.25)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.moveTo(x0+halfW*.5-6,0);x.lineTo(x0+halfW*.5+6,0);x.lineTo(x0+halfW*.85,sh);x.lineTo(x0+halfW*.15,sh);x.closePath();x.fill();}
   dancer(i,tt);
   // lanes
   for(let l=0;l<4;l++){const lx=laneX(i,l),pr=st[i].press[l]/.16;x.fillStyle=LANE_COL[l]+(pr>0?'38':'12');x.fillRect(lx-L.lw/2+1,sh,L.lw-2,H-sh);x.strokeStyle='#ffffff14';x.lineWidth=1;x.strokeRect(lx-L.lw/2+1,sh,L.lw-2,H-sh);
    // hit ring
    x.save();x.globalAlpha=.55+pr*.45;x.strokeStyle=LANE_COL[l];x.lineWidth=Math.max(2.5,L.r*.16);x.beginPath();x.arc(lx,hy,L.r*(1+pr*.12),0,6.3);x.stroke();x.restore();
    glyph(lx,hy,L.r*.6,l,LANE_COL[l],.28+pr*.5);}
   // beat line pulse
   x.strokeStyle=`rgba(255,255,255,${.1+S.beatPulse*.2})`;x.lineWidth=2;x.beginPath();x.moveTo(x0+L.m,hy+L.r*1.15);x.lineTo(x0+halfW-L.m,hy+L.r*1.15);x.stroke();
   // notes
   for(const n of notes[i]){if(n.hit&&n.hit!=='miss')continue;const y=noteY(n.t,i);if(y<sh-L.r||y>H+L.r)continue;glyph(laneX(i,n.lane),y,L.r,n.lane,LANE_COL[n.lane],n.hit==='miss'?.25:Math.min(1,(y-sh)/(L.r*2)));}
   // HUD per half
   const me=st[i],fs=clamp(Math.min(W,H*1.5)*.03,13,24);
   label(x,String(me.score),x0+halfW/2,sh+fs*.9,fs*1.2,{fill:'#fff',stroke:'#000'});
   label(x,`×${mult(me)}${me.combo?`  ${me.combo} combo`:''}`,x0+halfW/2,sh+fs*2.3,fs*.78,{fill:'#ffd24a',stroke:'#000'});
   if(me.textT>0)label(x,me.text,x0+halfW/2,hy-L.r*3.4-(1-me.textT/.5)*14,fs*1.05,{fill:me.textC,stroke:'#000',alpha:Math.min(1,me.textT*4)});
   // groove meter
   x.fillStyle='#0008';x.fillRect(x0+L.m,H-9,halfW-L.m*2,5);x.fillStyle=me.groove>66?'#7dff9a':me.groove>33?'#ffd24a':'#ff6a5a';x.fillRect(x0+L.m,H-9,(halfW-L.m*2)*me.groove/100,5);
  }
  use(0);const split=nf?L.X0[1]||L.X0[0]:W/2;x.strokeStyle='#ffffff40';x.lineWidth=2;x.beginPath();x.moveTo(split,sh);x.lineTo(split,H);x.stroke();
  if(S.waitFin&&!S.netDone)label(x,`Waiting for ${s.players[nf.remote].name}…`,W/2,H*.45,clamp(W*.04,14,26),{fill:'#fff',stroke:'#000'});
  fx.draw(x);
  if(S.phase==='finale'){
   const a=Math.min(1,S.end*3);x.fillStyle=`rgba(0,0,0,${.55*a})`;x.fillRect(0,sh,W,H-sh);
   const w=S.winner,fs=clamp(Math.min(W*.06,H*.08),18,46);
   x.save();x.globalAlpha=a;
   if(w>=0){const pw=Math.min(W*.4,H*.3,190),cy2=H*.45;x.save();x.translate(W/2,cy2);const k=1+Math.sin(tt*4)*.03;x.scale(k,k);x.fillStyle='#e8b93a';x.beginPath();x.moveTo(-pw*.45,-pw*.45);x.lineTo(pw*.45,-pw*.45);x.quadraticCurveTo(pw*.45,pw*.25,0,pw*.3);x.quadraticCurveTo(-pw*.45,pw*.25,-pw*.45,-pw*.45);x.fill();x.fillRect(-pw*.06,pw*.28,pw*.12,pw*.25);x.fillRect(-pw*.25,pw*.5,pw*.5,pw*.12);s.sprite(x,w,0,-pw*.78,pw*.7,{exact:true,mood:'win'});
    for(let k2=0;k2<6;k2++){const aa=tt*3+k2*1.05,gx=Math.cos(aa)*pw*.6,gy=Math.sin(aa*1.2)*pw*.5-pw*.15;x.fillStyle=`rgba(255,250,200,${.4+.6*Math.abs(Math.sin(tt*8+k2))})`;x.beginPath();x.moveTo(gx,gy-8);x.lineTo(gx+3,gy);x.lineTo(gx,gy+8);x.lineTo(gx-3,gy);x.closePath();x.fill();}x.restore();
    label(x,`${s.players[w].name.toUpperCase()} TAKES THE TROPHY`,W/2,H*.72,fs,{fill:'#ffe48a',stroke:'#000'});}
   else label(x,'A TIE ON THE DANCE FLOOR',W/2,H*.5,fs,{fill:'#ffe48a',stroke:'#000'});
   label(x,`${st[0].score}  –  ${st[1].score}`,W/2,H*.8,fs*.8,{fill:'#fff',stroke:'#000'});
   x.restore();
  }
  x.restore();
  flash(x,W,H,S.flash*.7);
  if(S.phase==='card')titleCard(x,W,H,S.card,{chapter:7,title:'THE TWIST CONTEST',sub:"Jack Rabbit Slim's · hit the glyphs on the beat",life:2.1});
  else filmOverlay(x,W,H,tt,{grain:.25,vignette:.35});
  if(S.phase==='play'&&t<-0.2)label(x,'GET READY',W/2,H*.5,clamp(W*.06,20,48),{fill:'#fff',stroke:'#000'});
  s.setScores([st[0].score,st[1].score]);s.status(`${s.players[0].name} ${st[0].score} · ${s.players[1].name} ${st[1].score} · tap the lane when the glyph hits the ring`);
 }
}
Object.assign(exports,{twist,buildChart});
