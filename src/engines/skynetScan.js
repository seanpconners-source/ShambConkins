// Terminator · Skynet Identification. Both players at once on one crowd seen through T-800 vision.
// One walker (two in the late rounds) is a Terminator. Find the tell, tap it on your half of the screen.
// Tap a human and your scanner locks for 1.5s. Tells escalate: eye glint, chrome flicker, ignoring the dog, robotic gait.
const {clamp,seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {label,rr,makeFx,makeShake,sfx,halfPointers,keyboard,voice,noise}=require("src/engines/tarantinoKit.js");
const ROUNDS=[
 {n:7,tells:['eye'],title:'ROUND 1 · THE EYE',tip:'Infiltrators’ eyes glint red.'},
 {n:8,tells:['chrome'],title:'ROUND 2 · THE SKIN',tip:'Damaged skin flickers chrome.'},
 {n:9,tells:['dog'],title:'ROUND 3 · THE DOG',tip:'When the dog barks, every human flinches. Machines don’t.'},
 {n:10,tells:['gait'],title:'ROUND 4 · THE WALK',tip:'Machines march at one exact speed. No bounce.'},
 {n:10,tells:['eye','dog'],title:'ROUND 5 · TWO TELLS',tip:'Faint glints. Watch the dog.'},
 {n:11,tells:['gait','chrome'],title:'ROUND 6 · TWO OF THEM',tip:'Two infiltrators. Both count.',two:true},
 {n:12,tells:['dog','gait','eye'],title:'ROUND 7 · JUDGMENT DAY',tip:'Everything at once. Two infiltrators.',two:true}
];
const SHIRTS=['#7a2a2a','#5a1f3a','#8a4a2a','#3a2a5a','#6a6a2a','#2a4a5a','#7a3a5a','#4a4a4a'];

async function skynetid(s){
 const [c,x]=s.canvas(760,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 const fx=makeFx(),shake=makeShake(),score=[0,0],lock=[0,0];
 let ri=-1,R=null,walkers=[],phase='card',pt=0,t=0,dog=null,barks=[],barkT=-9,result='';
 s.debug={engine:'skynetid',get walkers(){return walkers;},score,get phase(){return phase;},get round(){return ri;}};

 function startRound(){ri++;R=ROUNDS[ri];phase='card';pt=0;t=0;result='';const rnd=seededRandom(s.seed+':sky'+ri);
  walkers=[];const rows=5;
  for(let k=0;k<R.n;k++){const row=k%rows,dir=rnd()<.5?1:-1;walkers.push({k,row,dir,x:rnd(),speed:.045+rnd()*.05,phase:rnd()*6,bob:.6+rnd()*.6,machine:false,shirt:SHIRTS[Math.floor(rnd()*SHIRTS.length)],skin:['#e8b89a','#c98e6a','#8a5a3c','#f0c8a8'][Math.floor(rnd()*4)],hair:['#2a1a10','#5a3a1a','#c8a060','#111'][Math.floor(rnd()*4)],glint:rnd()*3,chrome:rnd()*4,flinch:0,dead:0,found:-1,pause:0,ptimer:2+rnd()*4});}
  const idx=[...walkers.keys()].sort(()=>rnd()-.5);walkers[idx[0]].machine=true;if(R.two)walkers[idx[1]].machine=true;
  for(const w of walkers)if(w.machine){w.speed=.06;w.bob=0;}
  barks=[];for(let b=2.5+rnd()*2;b<14;b+=3+rnd()*2.5)barks.push(b);dog={x:-.1,dir:1};
 }

 const L={};function layout(){const W=s.W,H=s.H,top=H*.16,bot=H*.92;Object.assign(L,{W,H,top,bot,rowH:(bot-top)/5,u:clamp(Math.min(W/12,(bot-top)/7),22,64)});}
 const wpos=w=>{const y=L.top+(w.row+.75)*L.rowH,hop=w.flinch>0?-Math.sin(w.flinch/.5*Math.PI)*L.u*.35:0,bob=Math.abs(Math.sin(w.phase*2))*L.u*.12*w.bob;return {x:w.x*L.W,y:y-bob+hop};};

 function tap(i,p){if(phase!=='play'||s.paused)return;if(lock[i]>0){sfx.buzz();return;}if(i===0?p.x>L.W/2:p.x<L.W/2)return;
  let best=null,bd=1e9;for(const w of walkers){if(w.dead)continue;const q=wpos(w),d=Math.hypot(p.x-q.x,p.y-(q.y-L.u*.9));if(d<bd){bd=d;best=w;}}
  fx.ring(p.x,p.y,{r:6,grow:160,life:.3,color:i?'#ff9fc6':'#78b6ff',w:2});
  if(!best||bd>L.u*1.3){sfx.click();return;}
  const q=wpos(best);
  if(best.machine){best.dead=1;best.found=i;score[i]+=2;s.setScores(score);sfx.gun();shake.kick(10);fx.spark(q.x,q.y-L.u,26,'#ffd2a0',380);fx.pop(q.x,q.y-L.u*2.1,'TERMINATED +2',{color:'#ffd23f',size:20});s.react(i,'happy');vibrate(30);
   if(walkers.every(w=>!w.machine||w.dead)){phase='reveal';pt=0;result=`${s.players[i].name} found ${R.two?'the last one':'it'}!`;}}
  else{best.dead=1;best.found=i;score[i]=Math.max(0,score[i]-1);s.setScores(score);lock[i]=1.5;sfx.groan();shake.kick(6);fx.splat(q.x,q.y-L.u,{n:14,speed:200,color:'#c4161c',size:4});fx.pop(q.x,q.y-L.u*2.1,'HUMAN! -1',{color:'#ff6b6b',size:20});s.react(i,'sad');vibrate([20,30,20]);}
 }
 halfPointers(s,{down:(i,r)=>tap(i,r)});

 function drawWalker(w,now){const {x:px,y:py}=wpos(w),u=L.u,dir=w.dir,dogNear=w.flinch>0;
  if(w.dead&&!w.machine){x.globalAlpha=.35;}
  const step=Math.sin(w.phase*2),chromeOn=!w.dead&&w.machine&&R.tells.includes('chrome')&&(w.chrome%3.2)<.18;
  // legs
  x.strokeStyle='#1a0505';x.lineWidth=u*.16;x.lineCap='round';x.beginPath();x.moveTo(px,py-u*.55);x.lineTo(px+step*u*.22,py);x.moveTo(px,py-u*.55);x.lineTo(px-step*u*.22,py);x.stroke();
  // body
  x.fillStyle=chromeOn?'#d8dde3':w.shirt;rr(x,px-u*.3,py-u*1.25,u*.6,u*.75,u*.15);x.fill();
  // head
  const look=dogNear&&dog?Math.sign(dog.x*L.W-px)*u*.08:0,hx=px+look,hy=py-u*1.5;
  x.fillStyle=chromeOn?'#e9edf2':w.skin;x.beginPath();x.arc(hx,hy,u*.27,0,7);x.fill();x.fillStyle=w.hair;x.beginPath();x.arc(hx,hy-u*.08,u*.28,Math.PI*1.05,Math.PI*1.95);x.fill();
  // eyes
  const glint=!w.dead&&w.machine&&R.tells.includes('eye')&&(w.glint%(ri>=4?2.6:1.6))<(ri>=4?.12:.22);
  const ex=hx+dir*u*.1;x.fillStyle=glint?'#ff2a1a':'#1a0505';x.beginPath();x.arc(ex,hy,u*(glint?.07:.04),0,7);x.fill();
  if(glint){x.save();x.globalAlpha=.7;const g=x.createRadialGradient(ex,hy,0,ex,hy,u*.4);g.addColorStop(0,'#ff3a2a');g.addColorStop(1,'#ff3a2a00');x.fillStyle=g;x.beginPath();x.arc(ex,hy,u*.4,0,7);x.fill();x.restore();}
  if(w.dead&&w.machine){x.strokeStyle=w.found?'#ff9fc6':'#78b6ff';x.lineWidth=3;x.strokeRect(px-u*.5,py-u*1.9,u,u*1.95);label(x,'T-800',px,py-u*2.05,12,{fill:'#ffd23f'});}
  x.globalAlpha=1;
  if(phase==='reveal'&&w.machine&&!w.dead){x.strokeStyle='#ffd23f';x.lineWidth=3;x.strokeRect(px-u*.5,py-u*1.9,u,u*1.95);}
  void now;
 }
 function drawDog(){if(!dog)return;const px=dog.x*L.W,py=L.bot-4,u=L.u*.8,barking=t-barkT<.45;
  x.fillStyle='#2a0a0a';rr(x,px-u*.5,py-u*.55,u,u*.38,u*.15);x.fill();x.beginPath();x.arc(px+dog.dir*u*.55,py-u*.6,u*.22,0,7);x.fill();
  x.strokeStyle='#2a0a0a';x.lineWidth=u*.1;x.beginPath();for(const lx of [-.35,-.15,.2,.38]){x.moveTo(px+lx*u,py-u*.2);x.lineTo(px+lx*u,py);}x.stroke();
  if(barking){label(x,'WOOF!',px+dog.dir*u*1.1,py-u*1.1,16,{fill:'#ffd23f'});}}

 s.hint('Both hunt at once. Tap a walker on YOUR half (left = player 1, right = player 2). A Terminator is +2; a human is −1 and locks your scanner for 1.5 seconds. Each round teaches a tell: red eye glint, chrome skin flicker, not flinching when the dog barks, a perfectly even march. Seven rounds.');
 if(!await s.pass(0,'Skynet has sent infiltrators into the crowd. Each round shows a new tell. Tap the Terminator when it walks through YOUR half of the screen. Shoot a human and your scanner locks.','Both ready — scan',{countdown:3}))return;
 startRound();
 s.frame(dt=>{layout();t+=dt;pt+=dt;for(let i=0;i<2;i++)lock[i]=Math.max(0,lock[i]-dt);
  if(phase==='card'){if(pt>2.1){phase='play';pt=0;t=0;sfx.ding(660);}}
  else if(phase==='play'||phase==='reveal'){
   if(phase==='play'){if(barks.length&&barks[0]<=t){barks.shift();if(R.tells.includes('dog')){barkT=t;voice(420,.08,.06,'square');voice(360,.1,.06,'square',{delay:.12});for(const w of walkers)if(!w.machine&&!w.dead)w.flinch=.5;}}
    if(pt>15){phase='reveal';pt=0;result='It got away.';sfx.groan();}}
   if(dog){dog.x+=dog.dir*.06*dt;if(dog.x>1.1)dog.dir=-1;if(dog.x<-.1)dog.dir=1;}
   for(const w of walkers){if(w.dead)continue;w.flinch=Math.max(0,w.flinch-dt);w.glint+=dt;w.chrome+=dt;
    let v=w.speed;if(!w.machine||!R.tells.includes('gait')){w.ptimer-=dt;if(w.ptimer<0){w.pause=.5+Math.random()*.7;w.ptimer=3+Math.random()*4;}if(w.pause>0){w.pause-=dt;v*=.1;}else v*=.75+.5*Math.abs(Math.sin(w.phase*.3));}
    if(w.machine&&!R.tells.includes('gait'))v=w.speed*(.7+.5*Math.abs(Math.sin(w.phase*.3)));
    w.phase+=dt*(w.machine&&R.tells.includes('gait')?5:4+v*20);w.x+=w.dir*v*dt;if(w.x>1.06)w.x=-.06;if(w.x<-.06)w.x=1.06;}
   if(phase==='reveal'&&pt>2.4){if(ri>=ROUNDS.length-1){phase='end';pt=0;sfx.fanfare();}else startRound();}
  }else if(phase==='end'&&pt>1.6&&s.alive){s.finish([...score],score[0]===score[1]?`Skynet Identification ties ${score[0]}–${score[1]}.`:`${s.players[score[0]>score[1]?0:1].name} wins Skynet Identification ${Math.max(...score)}–${Math.min(...score)}.`);return;}
  fx.step(dt);shake.step(dt);const W=L.W,H=L.H;x.save();shake.apply(x);
  // T-800 vision
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#4a0606');bg.addColorStop(.6,'#7a1010');bg.addColorStop(1,'#3a0404');x.fillStyle=bg;x.fillRect(-20,-20,W+40,H+40);
  x.fillStyle='#ff4a3a14';for(let k=0;k<5;k++)x.fillRect(0,L.top+(k+.75)*L.rowH,W,3);
  if(R){[...walkers].sort((a,b)=>a.row-b.row).forEach(w=>drawWalker(w,t));if(R.tells.includes('dog'))drawDog();}
  x.fillStyle='#00000018';for(let yy=0;yy<H;yy+=3)x.fillRect(0,yy,W,1);
  x.strokeStyle='#ffffff30';x.setLineDash([4,6]);x.beginPath();x.moveTo(W/2,L.top);x.lineTo(W/2,H);x.stroke();x.setLineDash([]);
  // HUD
  const fs=clamp(W*.03,11,17);label(x,'CYBERDYNE SYSTEMS MODEL 101 · VISUAL ID',12,L.top*.28,fs*.8,{align:'left',fill:'#ffb0a0',font:'monospace'});
  for(let i=0;i<2;i++){const ox=i?W-12:12,al=i?'right':'left';label(x,`${s.players[i].name.toUpperCase()} ${score[i]}`,ox,L.top*.62,fs*1.2,{align:al,fill:i?'#ff9fc6':'#78b6ff'});if(lock[i]>0)label(x,'SCANNER LOCKED '+lock[i].toFixed(1),i?W*.75:W*.25,L.top+L.rowH*.3,fs,{fill:'#ffd23f'});}
  if(R&&phase==='play')label(x,`${Math.ceil(15-pt)}`,W/2,L.top*.62,fs*1.4,{fill:'#fff'});
  if(phase==='card'&&R){x.fillStyle='#000a';x.fillRect(0,H*.36,W,H*.22);label(x,R.title,W/2,H*.43,clamp(W*.05,16,32),{fill:'#ff4a3a'});label(x,R.tip,W/2,H*.5,clamp(W*.03,11,19),{fill:'#fff'});}
  if(phase==='reveal'){label(x,result,W/2,L.top+L.rowH*.3,clamp(W*.04,14,26),{fill:'#ffd23f'});}
  if(phase==='end'){x.fillStyle='#000a';x.fillRect(0,H*.38,W,H*.16);label(x,score[0]===score[1]?'TIE':`${s.players[score[0]>score[1]?0:1].name} SAVES HUMANITY`,W/2,H*.46,clamp(W*.045,16,30),{fill:'#ffd23f'});}
  fx.draw(x);x.restore();
  s.status(R?`${R.title} · tap infiltrators on your half · +2 machine, −1 human`:'');
 });
}
Object.assign(exports,{skynetid});
