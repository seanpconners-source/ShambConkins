// BASEKETBALL · HOOP JONES (game id baseketball-hoop-jones; owner, Nov 14 round 2: "four shooters with unlimited shots each
// and a moving basket. You have to time the travel of the ball. Each stage gets further away. You just tap the characters,
// not swipe. There is a wait in between so you can't spam balls. Exactly like the real one" + his screenshot of Merit's
// Megatouch Hoop Jones). What the real game does (Merit's description: "time each shot to make a basket; the basket moves
// further away each round and shifts side to side throughout all play; three consecutive baskets earn lightning bonus
// points"; a player review: four shooters, ten levels, a "back it up" warning before time runs out):
//  - four shooters stand in a row at the bottom, seen from behind; TAP ONE and he shoots straight ahead up his own lane
//  - the basket slides side to side on the wall; the ball takes a moment to get there, so you lead it
//  - each shooter needs his ball back before he can shoot again (RELOAD), and any two shots are at least GAP apart
//  - a SHOT CLOCK for each round; reach the round's target or the game is over; then the hoop moves back (smaller, the lanes
//    closer together, the basket faster, the ball longer in the air), ten rounds
//  - 2 a basket, 3 a swish; every third basket in a row = LIGHTNING BONUS (+5)
// Our art (src/data/baseketballSprites.js, the owner's BASEketball kit): shooter-p1/-p2 sheets from behind (Coop / Remer),
// ball, backboard, net, jumbotron (the score strip), logo-hoop, stadium-hoop (the backdrop; drawn brick wall with graffiti
// like the real machine until that picture is in).
// Modes: 1P = one run until a missed target (solo 'levels'); 2P pass and play = each a run, higher score wins; online =
// both run at once (netField {sc,rd,ov}), the rival's score shows in the strip; board = like 2P.
const {clamp}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {voice,noise}=require("src/engines/tarantinoKit.js");
const {isOnline}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");
const {soloProgress,soloFinish}=require("src/solo.js");
const BK=require("src/data/baseketballSprites.js");

const ROUNDS=10,CLOCK=25,RELOAD=1.15,GAP=.42,LIGHT_N=3,LIGHT_BONUS=5;
const depthOf=n=>1/(1+.14*(n-1));                 // the hoop's size / lane spread, round n
const flightOf=n=>.78+.05*(n-1);                  // seconds from release to the rim
const periodOf=n=>Math.max(1.35,3.3-.2*(n-1));    // seconds for the basket to go across and back
const targetOf=n=>18+5*(n-1);                     // points needed to clear round n
const LED='#ff3b2f',LED2='#ffb02f',DIGI='"Courier New",monospace',FONT='Impact,"Arial Black",sans-serif';
// where the ball sits in each sheet's ready / first shoot frame (1x template px; the owner's note from GPT's delivery)
const HOLD={'shooter-p1':{ready:[160,70],shoot:[160,102]},'shooter-p2':{ready:[160,100],shoot:[160,135]}};

async function hoopJones(s){
 const [c,x]=s.canvas(720,1100,{fill:true});const fb=fullBleed(s,{bg:'#140a1c'});s.body.classList.add('drag-arena-body');s.controls([]);
 BK.preloadBaseketball();
 const net=isOnline(s)?s.online:null,me=net?net.me:0,them=1-me;
 let hi=0;try{hi=+localStorage.getItem('sc-hoopjones-hi')||0;}catch{}
 // ------------------------------------------------------------ one run
 let R=null;const rival={sc:0,rd:1,ov:false};
 function newRun(who){return {who,round:1,score:0,rscore:0,clock:CLOCK,phase:'intro',introT:0,bph:0,t:0,streak:0,light:false,gap:0,balls:[],shooters:[0,1,2,3].map(i=>({i,reload:0,pose:'ready',poseT:0,f:0})),
  msg:'',msgT:0,msgC:'#fff',pops:[],warned:false,over:false,shots:0,made:0,flash:0,bolt:0,netT:9,backT:0};}
 // ------------------------------------------------------------ layout (recomputed every frame)
 const L={};
 function layout(){const W=s.W,H=s.H,top=(fb.top||40)+4;L.W=W;L.H=H;
  L.hudY=top;L.hudH=clamp(Math.min(W*.16,H*.1),46,92);L.hudW=Math.min(W*.96,L.hudH*4.6);L.hudX=(W-L.hudW)/2;L.wallTop=L.hudY+L.hudH+6;
  // the four shooters along the bottom (bodies run off the screen), the wall's foot just behind their shoulders
  L.colW=W/4;L.shK=Math.min(L.colW*1.5/320,H*.3/300);L.frameW=320*L.shK;L.frameH=420*L.shK;
  L.shooterBase=H+L.frameH*.16;const shTop=L.shooterBase-L.frameH;L.handY=shTop+HOLD[sheetName()].ready[1]*L.shK;
  L.floorY=Math.min(H*.72,shTop+L.frameH*.42);
  const d=depthOf(R?R.round:1),dd=R&&R.backT>0?depthOf(R.round-1)+(d-depthOf(R.round-1))*(1-R.backT):d;L.depth=dd;
  const wallH=L.floorY-L.wallTop;L.rimR=Math.min(W*.095,wallH*.15)*dd;
  const hz=L.floorY-wallH*.18,hi0=L.wallTop+L.rimR*3.6/dd+8;L.horizon=hz;L.rimY=hz-(hz-hi0)*dd;
  L.ballR0=L.colW*.15;L.ballR1=L.rimR*.55;
  L.lane=i=>W/2+((i+.5)*L.colW-W/2)*.66*dd;L.shooterX=i=>(i+.5)*L.colW;
  L.amp=Math.abs(L.lane(3)-W/2)+L.rimR*1.2;}
 const sheetName=()=>(R&&R.who===1)||(net&&me===1)?'shooter-p2':'shooter-p1';
 const basketX=(run,ph)=>{const n=run.round,f=Math.sin(ph)+(n>=5?.28*Math.sin(2.3*ph+1):0);return L.W/2+L.amp*f/(n>=5?1.28:1);};
 // the basket's phase moves on at a speed that wobbles from round 4 (harder to read), reversing now and then from round 8
 const phaseRate=(run)=>{const n=run.round,w=Math.PI*2/periodOf(n);return w*(n>=4?1+.3*Math.sin(run.t*.9):1)*(n>=8&&Math.sin(run.t*.45)>.8?-1:1);};
 // ------------------------------------------------------------ shooting
 function shoot(run,i){if(!run||run.phase!=='play'||run.over)return false;const sh=run.shooters[i];if(sh.reload>0||run.gap>0)return false;
  sh.reload=RELOAD;sh.pose='shoot';sh.poseT=0;run.gap=GAP;run.shots++;const tf=flightOf(run.round);
  run.balls.push({i,u:0,tf,t:0,state:'fly',x0:L.shooterX(i),y0:L.handY,res:null,vx:0,vy:0,px:0,py:0,r:0});
  voice(160,.08,.06,'sine',{slide:.6});noise(.05,.03,{type:'highpass',f0:3000});return true;}
 function judge(run,b){const bx=basketX(run,run.bph),dx=Math.abs(L.lane(b.i)-bx),tol=L.rimR-L.ballR1*.55,sw=Math.max(1,(L.rimR-L.ballR1)*.45),rim=L.rimR+L.ballR1*.6,board=L.rimR*2.7;
  if(dx<=sw)return 'swish';if(dx<=tol)return 'make';if(dx<=rim)return (dx-tol)/(rim-tol)<.45?'rimin':'rimout';if(dx<=board)return 'brick';return 'air';}
 function result(run,b,res){b.res=res;const made=res==='swish'||res==='make'||res==='rimin',sh=run.shooters[b.i];
  if(made){run.streak++;run.made++;let pts=res==='swish'?3:2;
   if(run.streak%LIGHT_N===0){pts+=LIGHT_BONUS;run.bolt=1.2;say(run,'LIGHTNING BONUS!','#57e1ff',1.4);thunder();}
   else say(run,res==='swish'?'SWISH!':res==='rimin'?'IN AND OUT... IN!':'NICE!',res==='swish'?'#7dff8a':'#fff',.8);
   run.score+=pts;run.rscore+=pts;run.netT=0;run.pops.push({x:basketX(run,run.bph),y:L.rimY-L.rimR*1.8,t:1,text:'+'+pts});sh.pose='cheer';sh.poseT=0;
   swish(res);vibrate(12);}
  else{run.streak=0;sh.pose='slump';sh.poseT=0;
   say(run,res==='brick'?'BRICK!':res==='air'?'AIRBALL!':'RIMMED OUT!','#ff6a4a',.8);if(res==='brick')thud();else if(res==='rimout')clank();}
  b.state=made?'in':res==='brick'?'brick':res==='rimout'?'rimout':'air';b.t=0;}
 function swish(res){noise(.25,.05,{type:'highpass',f0:3500,f1:1500});if(res==='rimin')clank();noise(.6,.03,{type:'bandpass',f0:900,f1:1300,q:.8,attack:.1,delay:.1});}
 function clank(){voice(1100,.06,.05,'square',{lp:3000});voice(820,.1,.04,'triangle',{delay:.05});}
 function thud(){noise(.12,.06,{f0:400});voice(110,.12,.06,'sine');}
 function thunder(){noise(.9,.1,{f0:900,f1:120});[523,659,784,1047].forEach((f,i)=>voice(f,.1,.05,'sawtooth',{delay:i*.06,lp:2500}));}
 function buzzer(){voice(130,.9,.08,'sawtooth',{lp:900});voice(134,.9,.06,'square',{lp:700});}
 function say(run,t,col,sec){run.msg=t;run.msgC=col;run.msgT=sec;}
 // ------------------------------------------------------------ stepping
 function step(run,dt){
  run.t+=dt;run.msgT=Math.max(0,run.msgT-dt);run.flash=Math.max(0,run.flash-dt);run.bolt=Math.max(0,run.bolt-dt);run.netT+=dt;run.backT=Math.max(0,run.backT-dt/1.2);
  for(const p of run.pops)p.t-=dt;run.pops=run.pops.filter(p=>p.t>0);
  for(const sh of run.shooters){sh.reload=Math.max(0,sh.reload-dt);sh.poseT+=dt;if(sh.pose!=='ready'&&sh.poseT>.55&&sh.reload<=0)sh.pose='ready';}
  run.gap=Math.max(0,run.gap-dt);
  if(run.phase==='intro'){run.introT+=dt;run.bph+=dt*phaseRate(run)*.6;if(run.introT>2.2){run.phase='play';buzzer();}return;}
  if(run.phase==='clear'){run.introT+=dt;run.bph+=dt*phaseRate(run)*.6;stepBalls(run,dt);if(run.introT>2.6){run.round++;run.rscore=0;run.clock=CLOCK;run.warned=false;run.phase='intro';run.introT=0;run.backT=1;}return;}
  if(run.phase!=='play')return stepBalls(run,dt);
  run.bph+=dt*phaseRate(run);run.clock-=dt;
  if(!run.warned&&run.clock<=6&&run.rscore<targetOf(run.round)){run.warned=true;say(run,'BACK IT UP!','#ffd23f',1.4);voice(300,.2,.06,'square',{lp:1500});voice(300,.2,.06,'square',{lp:1500,delay:.28});}
  stepBalls(run,dt);
  if(run.clock<=0){run.clock=0;if(run.balls.some(b=>b.state==='fly'))return;buzzer();
   if(run.rscore>=targetOf(run.round)){if(run.round>=ROUNDS){finishRun(run,true);return;}run.phase='clear';run.introT=0;say(run,`ROUND ${run.round} CLEARED`,'#7dff8a',2.2);if(s.solo&&!net)soloProgress(s,run.score,run.round,`Round ${run.round+1}`);[523,659,784,1047].forEach((f,i)=>voice(f,.12,.05,'triangle',{delay:i*.09}));}
   else finishRun(run,false);}}
 function stepBalls(run,dt){
  for(const b of run.balls){b.t+=dt;
   if(b.state==='fly'){b.u=b.t/b.tf;if(b.u>=1){b.u=1;result(run,b,judge(run,b));}}
   else if(b.t>1.2)b.dead=true;}
  run.balls=run.balls.filter(b=>!b.dead);}
 function finishRun(run,won){run.over=true;run.phase='over';if(run.score>hi&&!net){hi=run.score;try{localStorage.setItem('sc-hoopjones-hi',String(hi));}catch{}}
  say(run,won?'YOU BEAT HOOP JONES!':'GAME OVER',won?'#7dff8a':'#ff5a4a',3);if(run.onEnd)run.onEnd(won);}
 // ------------------------------------------------------------ drawing
 function drawBackdrop(run){const W=L.W,H=L.H,pic=BK.picture('stadium-hoop');
  if(pic){const def=BK.PICTURES['stadium-hoop'],k=Math.max(W/pic.width,H/pic.height),w=pic.width*k,h=pic.height*k,hz=def.horizon/def.size[1]*h;x.drawImage(pic,(W-w)/2,L.floorY-hz,w,h);
   if(L.floorY-hz>0){x.fillStyle='#140a1c';x.fillRect(0,0,W,L.floorY-hz);}return;}
  // the real machine's look: a red brick wall with graffiti, a dark court floor
  const g=x.createLinearGradient(0,0,0,L.floorY);g.addColorStop(0,'#5a1d1a');g.addColorStop(1,'#8a2c24');x.fillStyle=g;x.fillRect(0,0,W,L.floorY);
  const bh=Math.max(8,H*.026),bw=bh*2.3;x.strokeStyle='rgba(40,10,10,.55)';x.lineWidth=Math.max(1,bh*.12);
  for(let y=L.floorY,r=0;y>-bh;y-=bh,r++){x.beginPath();x.moveTo(0,y);x.lineTo(W,y);x.stroke();for(let px=(r%2)*bw/2;px<W;px+=bw){x.beginPath();x.moveTo(px,y);x.lineTo(px,y-bh);x.stroke();}}
  const tag=(t,cx,cy,sz,c1,c2,rot)=>{x.save();x.translate(cx,cy);x.rotate(rot);x.font=`900 ${sz}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=sz*.22;x.strokeStyle='#120a14';x.strokeText(t,0,0);
   const gr=x.createLinearGradient(0,-sz/2,0,sz/2);gr.addColorStop(0,c1);gr.addColorStop(1,c2);x.fillStyle=gr;x.fillText(t,0,0);x.restore();};
  const sz=clamp(Math.min(W*.085,(L.floorY-L.wallTop)*.14),14,64),gy=L.floorY-sz*1.1;tag('SWISH',W*.17,gy,sz,'#5ee6ff','#1f7fd8',-.08);tag('BRICK',W*.5,gy+sz*.15,sz*1.05,'#ffe14d','#ff8a1f',.04);tag('AIRBALL',W*.83,gy,sz*.9,'#7dff8a','#1fa84a',-.05);
  const fl=x.createLinearGradient(0,L.floorY,0,H);fl.addColorStop(0,'#2a2230');fl.addColorStop(1,'#120c18');x.fillStyle=fl;x.fillRect(0,L.floorY,W,H-L.floorY);
  x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,L.floorY,W,Math.max(2,H*.006));
  // a three-point arc on the floor
  x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=2;x.beginPath();x.ellipse(W/2,L.floorY,W*.42,(H-L.floorY)*.55,0,0,Math.PI);x.stroke();}
 function drawHoop(run,front){const bx=basketX(run,run.bph),r=L.rimR,ry=L.rimY,bw=r*2*2.65,bh=bw*420/600,img=BK.picture('backboard'),def=BK.PICTURES.backboard;
  if(!front){// pole + board
   const pole=BK.picture('pole'),pw=bw*.12,ph=L.floorY-(ry-r*.2);if(pole)x.drawImage(pole,bx-pw/2,ry+r*.2,pw,ph);else{x.fillStyle='#24365e';x.fillRect(bx-pw/2,ry+r*.2,pw,ph);}
   const bxl=bx-bw/2,byt=ry-bh*(def.rim[1]/def.size[1]);
   if(img)x.drawImage(img,bxl,byt,bw,bh);else{x.fillStyle='rgba(240,240,240,.92)';x.fillRect(bxl,byt,bw,bh);x.strokeStyle='#d62a2a';x.lineWidth=Math.max(2,bw*.025);x.strokeRect(bxl,byt,bw,bh);x.strokeRect(bx-bw*.17,ry-bh*.42,bw*.34,bh*.34);}
   // rim back half
   x.strokeStyle='#e8571a';x.lineWidth=Math.max(2,r*.13);x.beginPath();x.ellipse(bx,ry,r,r*.28,0,Math.PI,Math.PI*2);x.stroke();return;}
  // net + rim front half
  const net=BK.sheet('net');const nd=BK.PICTURES?.net;void nd;
  if(net){const d=net.def,swishing=run.netT<.45,f=swishing?Math.min(2,Math.floor(run.netT/.15)):0,fr=BK.frameRect(net,swishing?'swish':'rest',f),k=(2*r)/((d.rim[1]-d.rim[0])),w=d.frame[0]*k,h=d.frame[1]*k;
   x.drawImage(net.img,fr.sx,fr.sy,fr.sw,fr.sh,bx-(d.rim[0]+(d.rim[1]-d.rim[0])/2)*k,ry,w,h);}
  else{x.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=Math.max(1,r*.05);const sw=run.netT<.45?Math.sin(run.netT*30)*r*.15:0;for(let k=0;k<=8;k++){const tx=bx-r+2*r*k/8,bx2=bx-r*.55+1.1*r*k/8+sw;x.beginPath();x.moveTo(tx,ry);x.lineTo(bx2,ry+r*1.5);x.stroke();}
   x.beginPath();x.moveTo(bx-r*.55+sw,ry+r*1.5);x.lineTo(bx+r*.55+sw,ry+r*1.5);x.stroke();}
  x.strokeStyle='#ff6a1f';x.lineWidth=Math.max(2,r*.15);x.beginPath();x.ellipse(bx,ry,r,r*.28,0,0,Math.PI);x.stroke();}
 function ballPic(px,py,pr,rot){const img=BK.picture('ball');x.save();x.translate(px,py);x.rotate(rot);if(img)x.drawImage(img,-pr,-pr,pr*2,pr*2);else{x.fillStyle='#e8701a';x.beginPath();x.arc(0,0,pr,0,7);x.fill();x.strokeStyle='#3a1a08';x.lineWidth=Math.max(1,pr*.08);x.beginPath();x.arc(0,0,pr,0,7);x.moveTo(-pr,0);x.lineTo(pr,0);x.moveTo(0,-pr);x.lineTo(0,pr);x.stroke();}x.restore();}
 // a ball in the air: straight up its lane, arcing, shrinking with distance; after the rim: through the net, off the board or the rim, or nothing but air
 function ballPos(run,b){const xe=L.lane(b.i),ye=L.rimY-L.ballR1*.3,arc=(b.y0-L.rimY)*.55+L.rimR*2.5;
  if(b.state==='fly'){const u=b.u,e=u;return {x:b.x0+(xe-b.x0)*e,y:b.y0+(ye-b.y0)*u-arc*Math.sin(Math.PI*u),r:L.ballR0+(L.ballR1-L.ballR0)*Math.pow(u,.7),behind:u>.6};}
  const t=b.t,bx=basketX(run,run.bph);
  if(b.state==='in')return {x:bx+(xe-bx)*Math.max(0,1-t*4),y:ye+t*L.rimR*5,r:L.ballR1,behind:true,fade:t>.4};
  if(b.state==='brick')return {x:xe+(xe<bx?-1:1)*t*L.rimR*1.5,y:ye-L.rimR*.5+t*t*L.H*.9-t*L.rimR*2,r:L.ballR1*(1+t*.6),behind:false};
  if(b.state==='rimout')return {x:xe+(xe<bx?-1:1)*t*L.rimR*3,y:ye-t*L.rimR*2+t*t*L.H*.8,r:L.ballR1*(1+t*.5),behind:false};
  return {x:xe,y:ye+t*t*L.H*.7+t*L.rimR,r:L.ballR1*(1+t*.3),behind:t<.3};}
 function drawShooters(run){const name=sheetName(),sh=BK.sheet(name),hold=HOLD[name];
  for(const p of run.shooters){const cx=L.shooterX(p.i),ready=p.reload<=0,row=p.pose==='shoot'?'shoot':p.pose==='cheer'?'cheer':p.pose==='slump'?'slump':'ready',
   f=row==='shoot'?Math.min(3,Math.floor(p.poseT/.09)):row==='ready'?Math.floor((run.t*1.6+p.i*.4)%2):Math.floor(p.poseT*5)%2;
   const top=L.shooterBase-L.frameH,left=cx-L.frameW/2;
   x.save();if(!ready&&p.pose==='ready')x.globalAlpha=.75;
   if(sh){const fr=BK.frameRect(sh,row,f);x.drawImage(sh.img,fr.sx,fr.sy,fr.sw,fr.sh,left,top,L.frameW,L.frameH);}
   else{x.fillStyle=run.who===1?'#e0601a':'#f2f2f2';x.beginPath();x.roundRect(left+L.frameW*.12,top+L.frameH*.4,L.frameW*.76,L.frameH*.7,L.frameW*.2);x.fill();x.fillStyle='#4a2c1a';x.beginPath();x.ellipse(cx,top+L.frameH*.32,L.frameW*.17,L.frameW*.2,0,0,7);x.fill();
    x.strokeStyle='#d8a07a';x.lineWidth=L.frameW*.08;x.lineCap='round';const ay=row==='shoot'?top+L.frameH*.05:top+L.frameH*.2;x.beginPath();x.moveTo(cx-L.frameW*.3,top+L.frameH*.45);x.lineTo(cx-L.frameW*.12,ay);x.moveTo(cx+L.frameW*.3,top+L.frameH*.45);x.lineTo(cx+L.frameW*.12,ay);x.stroke();}
   x.restore();
   // the ball he's holding (back in his hands once reloaded)
   if(ready&&p.pose==='ready'){const [hx,hy]=hold.ready;ballPic(left+hx*L.shK,top+hy*L.shK,44*L.shK,0);}
   // his name on the back of the jersey
   const nm=(s.players[run.who]?.name||'').toUpperCase().slice(0,9);if(nm){x.font=`900 ${Math.max(8,L.frameW*.07)}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillStyle='rgba(20,30,70,.85)';x.fillText(nm,cx,top+(sh?304:270)*L.shK);}
   // reload ring under him while his ball comes back
   if(!ready){const k=1-p.reload/RELOAD;x.strokeStyle='rgba(255,210,63,.8)';x.lineWidth=3;x.beginPath();x.arc(cx,L.H-18,10,-Math.PI/2,-Math.PI/2+k*Math.PI*2);x.stroke();}}}
 function drawHud(run){const {hudX:X,hudY:Y,hudW:Wd,hudH:Hh}=L,img=BK.picture('jumbotron'),def=BK.PICTURES.jumbotron;let sx=X,sy=Y,sw=Wd,sh=Hh;
  if(img){x.drawImage(img,X,Y,Wd,Hh);const [a,b,c2,d]=def.screen;sx=X+a/def.size[0]*Wd;sy=Y+b/def.size[1]*Hh;sw=c2/def.size[0]*Wd;sh=d/def.size[1]*Hh;}
  else{x.fillStyle='#0b0b12';x.fillRect(X,Y,Wd,Hh);x.strokeStyle='#c7ccd8';x.lineWidth=3;x.strokeRect(X,Y,Wd,Hh);sx=X+6;sy=Y+6;sw=Wd-12;sh=Hh-12;}
  x.fillStyle='#000';x.fillRect(sx,sy,sw,sh);
  const cells=[['ROUND',String(run.round)],[run.streak>=2?'⚡ SCORE':'SCORE',String(run.score)],['SHOT CLOCK',String(Math.ceil(Math.max(0,run.clock))).padStart(2,'0')],[net?(s.players[them]?.name||'RIVAL').toUpperCase().slice(0,8):'HI SCORE',String(net?rival.sc:Math.max(hi,run.score))]];
  const cw=sw/4;cells.forEach(([lab,val],i)=>{const cx=sx+cw*(i+.5);x.textAlign='center';x.textBaseline='middle';x.font=`700 ${Math.max(7,sh*.2)}px ${DIGI}`;x.fillStyle='#ffffff';x.fillText(lab,cx,sy+sh*.2);
   x.font=`900 ${Math.max(10,sh*.5)}px ${DIGI}`;x.fillStyle=i===2&&run.clock<=6?LED:i===1&&run.streak>=2?'#57e1ff':LED2;x.fillText(val,cx,sy+sh*.62);});
  // the target for this round under the strip
  const need=Math.max(0,targetOf(run.round)-run.rscore);x.font=`800 ${clamp(L.W*.03,10,15)}px Arial,sans-serif`;x.fillStyle=need?'#fff':'#7dff8a';x.textAlign='center';x.fillText(need?`${need} more to clear round ${run.round}`:'Round target made!',L.W/2,Y+Hh+12);}
 function bigText(t,cy,sz,col,a=1){x.save();x.globalAlpha=a;x.font=`900 ${sz}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=sz*.18;x.strokeStyle='#0a0612';x.strokeText(t,L.W/2,cy);x.fillStyle=col;x.fillText(t,L.W/2,cy);x.restore();}
 function draw(run){layout();x.setTransform(1,0,0,1,0,0);drawBackdrop(run);
  drawHoop(run,false);
  const bp=run.balls.map(b=>({b,p:ballPos(run,b)}));
  for(const {b,p} of bp)if(p.behind&&!p.fade)ballPic(p.x,p.y,p.r,b.t*8);
  drawHoop(run,true);
  for(const {b,p} of bp)if(!p.behind)ballPic(p.x,p.y,p.r,b.t*8);
  // lightning
  if(run.bolt>0){x.save();x.globalAlpha=.5+.5*Math.sin(run.t*40);x.strokeStyle='#bff6ff';x.lineWidth=3;for(let k=0;k<3;k++){let px=L.W*(.2+.3*k),py=L.wallTop;x.beginPath();x.moveTo(px,py);while(py<L.floorY){px+=(Math.sin(run.t*13+k*7+py)*.5)*L.W*.06;py+=L.H*.05;x.lineTo(px,py);}x.stroke();}x.restore();}
  drawShooters(run);
  for(const p of run.pops){x.font=`900 ${clamp(L.W*.06,16,34)}px ${FONT}`;x.textAlign='center';x.fillStyle=`rgba(255,240,140,${clamp(p.t*1.5,0,1)})`;x.fillText(p.text,p.x,p.y-(1-p.t)*30);}
  drawHud(run);
  if(run.msgT>0)bigText(run.msg,L.wallTop+(L.floorY-L.wallTop)*.62,clamp(Math.min(L.W*.1,L.H*.09),20,64),run.msgC,clamp(run.msgT*3,0,1));
  if(run.phase==='intro'||run.phase==='clear'){const a=clamp(Math.min(run.introT*3,(2.2-run.introT)*3),0,1);if(run.phase==='intro'){x.save();x.globalAlpha=a;const logo=BK.picture('logo-hoop');let y=L.H*.24;
    if(logo&&run.round===1){const w=Math.min(L.W*.86,520),h=w*logo.height/logo.width;x.drawImage(logo,(L.W-w)/2,y-h/2,w,h);y+=h*.55;}
    x.restore();bigText(`ROUND ${run.round}`,y+20,clamp(L.W*.11,26,64),'#ffd23f',a);bigText(`${targetOf(run.round)} points in ${CLOCK} seconds`,y+20+clamp(L.W*.09,22,50),clamp(L.W*.045,13,24),'#fff',a);
    if(run.round>1)bigText('THE HOOP MOVES BACK',y+20+clamp(L.W*.15,36,84),clamp(L.W*.04,12,22),'#57e1ff',a);
    if(run.round===1)bigText('TAP A SHOOTER TO SHOOT · LEAD THE HOOP',L.H*.62,clamp(L.W*.035,11,18),'#fff',a);}}
  if(run.phase==='over'&&run.msgT<=0)bigText(run.over?`${run.score} POINTS`:'',L.H*.36,clamp(L.W*.09,22,56),'#ffd23f');
  s.debug.run=run;}
 // ------------------------------------------------------------ input: tap a shooter (his column of the screen, below the strip)
 let cur=null;
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur)return;ev.preventDefault();const p=s.pointer(ev);if(p.y<L.hudY+L.hudH)return;const i=clamp(Math.floor(p.x/L.colW),0,3);if(shoot(cur,i))nf?.push();});
 s.on(document,'keydown',ev=>{if(!cur)return;const i={'1':0,'2':1,'3':2,'4':3,a:0,s:1,d:2,f:3,A:0,S:1,D:2,F:3}[ev.key];if(i===undefined)return;ev.preventDefault();shoot(cur,i);});
 s.hint('Hoop Jones: four shooters, unlimited balls. Tap a shooter to shoot straight up his lane; the basket slides side to side, so shoot before it gets to his lane: the ball takes a moment to get there. Each shooter waits for his ball to come back, and you can\'t fire two shots at once. Reach the round\'s target before the shot clock runs out; then the hoop moves back. Every third basket in a row = lightning bonus (+5). Keys 1-4.');
 // autopilot (tests): shoot with whoever's lane the basket will be over when the ball gets there
 let botOn=false;
 function botStep(run){if(!botOn||!run||run.phase!=='play')return;const tf=flightOf(run.round),fut=run.bph+phaseRate(run)*tf,bx=basketX(run,fut);
  for(let i=0;i<4;i++){if(Math.abs(L.lane(i)-bx)<L.rimR*.55&&Math.random()<.5){shoot(run,i);return;}}}
 s.debug={engine:'hoopJones',get run(){return cur;},set run(v){},shoot:i=>shoot(cur,i),get bot(){return ()=>{if(!botOn){botOn=true;return 'drive';}return '';};},skipRound(){if(cur){cur.rscore=targetOf(cur.round);cur.clock=.01;}},state(){return cur&&{round:cur.round,score:cur.score,phase:cur.phase,clock:cur.clock,shots:cur.shots,made:cur.made,over:cur.over};}};
 // ------------------------------------------------------------ online: both at once
 let nf=null;
 if(net)nf=netField(s,{hz:6,pack:()=>({sc:cur?cur.score:0,rd:cur?cur.round:1,ov:cur&&cur.over?1:0}),unpack:(i,d)=>{if(!d)return;rival.sc=d.sc|0;rival.rd=d.rd|0;rival.ov=!!d.ov;}});
 // ------------------------------------------------------------ the runs
 const intro=who=>`HOOP JONES${s.players.length>1&&!s.solo?' · '+s.players[who].name:''}. Four shooters, unlimited balls: tap a shooter to shoot up his lane. The hoop slides side to side and the ball takes a moment to get there, so lead it. Each shooter waits for his ball to come back. Make the round's target before the shot clock runs out; every round the hoop moves back. Every third basket in a row = lightning bonus.`;
 async function play(who,label){cur=newRun(who);layout();
  if(!await s.pass(net?me:who,intro(who),label||'Shoot'))return null;if(net)await nf.start('go');
  return await new Promise(res=>{cur.onEnd=won=>{setTimeout(()=>res({score:cur.score,round:cur.round,won}),2600);};});}
 let runDone=false;
 s.frame(dt=>{if(!s.alive)return;if(nf)nf.tick(dt);if(!cur){x.fillStyle='#140a1c';x.fillRect(0,0,s.W,s.H);return;}
  step(cur,dt);botStep(cur);
  if(net){const sc=[0,0];sc[me]=cur.score;sc[them]=rival.sc;s.setScores(sc);}else if(s.solo)s.setScores([cur.score,0]);
  draw(cur);void runDone;});
 if(net){const r=await play(me);if(!r)return;nf.push();nf.finish({score:r.score});const v=await nf.remoteDone();if(!s.alive)return;
  const sc=[0,0];sc[me]=r.score;sc[them]=v&&typeof v.score==='number'?v.score|0:rival.sc;s.setScores(sc);
  s.finish(sc,sc[0]===sc[1]?`Hoop Jones tie at ${sc[0]}.`:`${s.players[sc[0]>sc[1]?0:1].name} wins Hoop Jones, ${Math.max(...sc)} to ${Math.min(...sc)}.`);return;}
 if(s.solo){const r=await play(0,'Shoot');if(!r||!s.alive)return;const cleared=r.won?ROUNDS:r.round-1;soloFinish(s,r.score,cleared,`Hoop Jones · round ${r.round} · ${r.score} points`,cleared>0);return;}
 const scores=[0,0];
 for(let i=0;i<Math.min(2,s.players.length);i++){const r=await play(i,i?`Shoot · beat ${scores[0]}`:'Shoot');if(!r||!s.alive)return;scores[i]=r.score;s.setScores(scores.slice());}
 s.finish(scores,scores[0]===scores[1]?`Hoop Jones tie at ${scores[0]}.`:`${s.players[scores[0]>scores[1]?0:1].name} wins Hoop Jones, ${Math.max(...scores)} to ${Math.min(...scores)}.`);
}
Object.assign(exports,{hoopJones});
