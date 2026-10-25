// Starship Troopers · Klendathu Tank Range, rebuilt as a Scorched Earth (1991) style artillery duel: a sunset over
// bug-planet dirt that craters and collapses, wind that changes every shot, Scorched Earth's concentric fireballs,
// and one Baby Nuke each. Arachnids crawl the ridges for bonus points. Take turns: drag back anywhere and release
// (direction = angle, length = power); a short tracer shows the start of the arc. Three armour bars each, eight
// shots each; damage dealt is your score, destroying the other tank is +60.
// Online (s.online): both phones build the same field (fixed size online), the shooter's phone streams its aim {aim},
// fires {fire}, reports where the shell landed with the bugs' positions {ex}, and ends the turn with the armour and
// scores {sync} (a shot clock running out = {skip}); the other phone flies the shell for show and waits for those.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,makeShake,label,SANS,rr}=require("src/engines/tarantinoKit.js");
const {pixText,makeBits}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");
const {isCpu,isOnline,cpuSkill}=require("src/engines/cpuKit.js");

let FW=320;const SHOTS=8,TCOL=['#46d17a','#ff8a3a'],G=150;
const BLAST=['#ffffff','#fff3a0','#ffd23f','#ff9a2e','#ff4a1c','#9c1c08'];

async function artillery(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const rand=seededRandom(s.seed+':scorched'),shake=makeShake(),bits=makeBits();
 let anim=0,FH=200,ter=null,tanks=null,turn=0,state='wait',shell=null,blasts=[],aim=null,wind=0,t=0,banner=null,turnT=0,bugs=[],pops=[],trail=[];
 const score=[0,0],shots=[0,0],nukes=[1,1],weapon=[0,0];let view={k:1,ox:0,oy:0};
 const net=isOnline(s)?s.online:null,theirs=()=>!!net&&turn===net.remote;if(net)s.hotseat=true;let synced=false,aimT=0,aimSent='';
 function genTerrain(){ter=new Float32Array(FW+1);const ph=[rand()*6,rand()*6,rand()*6];for(let i=0;i<=FW;i++){const u=i/FW;ter[i]=FH*(.62+Math.sin(u*5.1+ph[0])*.1+Math.sin(u*11.3+ph[1])*.05+Math.sin(u*23+ph[2])*.02-Math.sin(u*Math.PI)*.12);}
  for(const px of [28,FW-28]){const y=ter[px];for(let i=px-8;i<=px+8;i++)ter[i]=y;}}
 const groundAt=X=>{const i=clamp(Math.floor(X),0,FW-1),f=X-i;return ter[i]*(1-f)+ter[i+1]*f;};
 function crater(cx,cy,R){for(let i=Math.max(0,Math.floor(cx-R));i<=Math.min(FW,Math.ceil(cx+R));i++){const dx=i-cx,h=Math.sqrt(Math.max(0,R*R-dx*dx));const bot=cy+h;if(ter[i]<bot)ter[i]=Math.min(FH+30,bot);}}
 function layout(){const W=s.W,H=s.H,top=40,k=Math.min(W/FW,(H-top)/FH);view={k,ox:(W-FW*k)/2,oy:top+(H-top-FH*k)};}
 function setup(){const W=net?390:s.W,H=net?780:s.H;FW=H>W*1.05?190:320;FH=clamp(FW*(H-40)/W,170,520);genTerrain();tanks=[{i:0,x:28,y:0,hp:3,angle:-Math.PI/4,power:.6,vy:0},{i:1,x:FW-28,y:0,hp:3,angle:-Math.PI*3/4,power:.6,vy:0}];for(const tk of tanks)tk.y=groundAt(tk.x);
  bugs=Array.from({length:3},()=>({x:80+rand()*(FW-160),dir:rand()<.5?-1:1,sp:6+rand()*6,alive:true,ph:rand()*6}));newTurn(0);}
 function newTurn(i){turn=i;wind=Math.round((rand()-.5)*40);turnT=25;banner={text:`${s.players[i].name.toUpperCase()}'S SHOT`,t:1.4};state='aim';aim=null;synced=false;aimSent='';}
 function fire(remote=false){if(net&&!remote){if(theirs())return;const tk=tanks[turn];net.send({fire:{a:tk.angle,p:tk.power,n:weapon[turn]}});}const tk=tanks[turn],sp=60+tk.power*220;shell={x:tk.x+Math.cos(tk.angle)*9,y:tk.y-6+Math.sin(tk.angle)*9,vx:Math.cos(tk.angle)*sp,vy:Math.sin(tk.angle)*sp,nuke:weapon[turn]===1};trail=[];if(shell.nuke){nukes[turn]--;weapon[turn]=0;}shots[turn]++;state='flight';
  noise(.3,.12,{f0:900,f1:120});voice(110,.25,.08,'square',{slide:.4});shake.kick(3);}
 function explode(px,py,nuke){const R=nuke?34:15;blasts.push({x:px,y:py,R,t:0});crater(px,py,R);noise(nuke?1.4:.7,.16,{f0:nuke?900:1600,f1:40});voice(nuke?50:70,nuke?1.2:.5,.12,'sawtooth',{slide:.4,lp:600});shake.kick(nuke?20:9);vibrate(nuke?90:40);
  bits.burst(px,py,{n:nuke?90:40,speed:nuke?160:100,color:'#a5481c',life:1,size:2.4,g:200});
  for(const tk of tanks){const d=Math.hypot(tk.x-px,tk.y-4-py);if(d<R+8&&tk.hp>0){const dmg=Math.max(1,Math.round(((R+8-d)/(R+8))*(nuke?3:2)+(d<R*.4?.5:0)));const before=tk.hp;tk.hp=Math.max(0,tk.hp-dmg);const dealt=before-tk.hp;
    if(tk.i!==turn){score[turn]+=dealt*25;pops.push({x:tk.x,y:tk.y-22,text:`-${dealt} ARMOUR`,t:1.4,c:'#ff5a5a'});s.react?.(turn,'win',1.2);s.react?.(tk.i,'sad',1.2);if(tk.hp<=0){score[turn]+=60;pops.push({x:tk.x,y:tk.y-36,text:'+60 DESTROYED',t:1.8,c:'#ffd23f'});}}
    else{pops.push({x:tk.x,y:tk.y-22,text:'OWN GOAL',t:1.4,c:'#ff5a5a'});s.react?.(tk.i,'sad',1.2);}}}
  for(const b of bugs)if(b.alive&&Math.hypot(b.x-px,groundAt(b.x)-py)<R+6){b.alive=false;score[turn]+=15;pops.push({x:b.x,y:groundAt(b.x)-14,text:'+15 BUG',t:1.2,c:'#9dff7a'});bits.burst(b.x,groundAt(b.x)-3,{n:24,speed:70,color:'#8dff4a',life:.8,size:2,g:150});}
  s.setScores(score);}
 // ---- input: drag back anywhere, weapon chips at the bottom
 const chipRects=()=>{const W=s.W,H=s.H,cw=Math.min(130,W*.3),ch=34;return [{x:W/2-cw-6,y:H-ch-10,w:cw,h:ch,i:0},{x:W/2+6,y:H-ch-10,w:cw,h:ch,i:1}];};
 // vs CPU: tank 2 simulates angles and powers with the real wind and gravity, fires the one landing closest to you (error on Easy), and saves its nuke for a near-certain hit
 const cpu=isCpu(s);let cpuWait=0;
 function cpuShot(dt){if(state!=='aim'||turn!==1){cpuWait=0;return;}cpuWait+=dt;if(cpuWait<1.2)return;cpuWait=-99;const tk=tanks[1],o=tanks[0],sk=cpuSkill(s);let best=null,bd=1e9;
  for(let a=-Math.PI+.15;a<-.15;a+=.05)for(let pw=.15;pw<=1;pw+=.04){const sp=60+pw*220;let x0=tk.x+Math.cos(a)*9,y0=tk.y-6+Math.sin(a)*9,vx=Math.cos(a)*sp,vy=Math.sin(a)*sp;for(let k=0;k<600;k++){const h=1/120;vx+=wind*1.6*h;vy+=G*h;x0+=vx*h;y0+=vy*h;if(x0<-20||x0>FW+20||y0>FH+20)break;if(Math.hypot(o.x-x0,o.y-5-y0)<6||x0>=0&&x0<=FW&&y0>=groundAt(x0)){const d=Math.hypot(o.x-x0,o.y-y0);if(d<bd){bd=d;best={a,pw};}break;}}}
  if(!best)best={a:-Math.PI*3/4,pw:.6};const err=(1-sk);tk.angle=clamp(best.a+(Math.random()-.5)*err*.22,-Math.PI+.05,-.05);tk.power=clamp(best.pw+(Math.random()-.5)*err*.16,.08,1);if(nukes[1]>0&&bd<6&&Math.random()<.5)weapon[1]=1;fire();}
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||state!=='aim'||cpu&&turn===1||theirs())return;ev.preventDefault();const p=s.pointer(ev);
  for(const r of chipRects())if(p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h){if(r.i===1&&nukes[turn]<=0)return;weapon[turn]=r.i;voice(r.i?220:660,.06,.04,'square');return;}
  aim={id:ev.pointerId,sx:p.x,sy:p.y,x:p.x,y:p.y};s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(!aim||ev.pointerId!==aim.id||s.paused)return;ev.preventDefault();const p=s.pointer(ev);aim.x=p.x;aim.y=p.y;const dx=aim.sx-aim.x,dy=aim.sy-aim.y,d=Math.hypot(dx,dy);if(d>8){const tk=tanks[turn];tk.angle=clamp(Math.atan2(dy,dx),-Math.PI+.05,-.05);tk.power=clamp(d/(Math.min(s.W,s.H)*.42),.08,1);}});
 for(const ty of ['pointerup','pointercancel'])s.on(c,ty,ev=>{if(!aim||ev.pointerId!==aim.id)return;s.release(ev);const d=Math.hypot(aim.sx-aim.x,aim.sy-aim.y);aim=null;if(ty==='pointerup'&&d>18&&state==='aim')fire();});
 s.on(document,'keydown',ev=>{if(state!=='aim'||s.paused||theirs())return;const tk=tanks[turn];const k=ev.key;if(k==='ArrowLeft'||k==='a'){tk.angle=clamp(tk.angle-.05,-Math.PI+.05,-.05);}else if(k==='ArrowRight'||k==='d'){tk.angle=clamp(tk.angle+.05,-Math.PI+.05,-.05);}else if(k==='ArrowUp'||k==='w'){tk.power=clamp(tk.power+.03,.08,1);}else if(k==='ArrowDown'||k==='s'){tk.power=clamp(tk.power-.03,.08,1);}else if(k===' '||k==='Enter')fire();else return;ev.preventDefault();});
 s.hint('On your turn drag back anywhere and let go: the opposite direction is your angle, the drag length your power. Watch the wind arrow. Tap BABY NUKE (once per game) before aiming for a huge blast. Hit the other tank (25 a bar, +60 to destroy it) or bugs (+15). Keys: arrows aim/power, Space fires.');
 function step(dt){
  if(cpu)cpuShot(dt);
  for(const b of blasts)b.t+=dt;blasts=blasts.filter(b=>b.t<.9);for(const p of pops)p.t-=dt;pops=pops.filter(p=>p.t>0);
  for(const b of bugs){if(!b.alive)continue;b.x+=b.dir*b.sp*dt;if(b.x<50||b.x>FW-50)b.dir*=-1;}
  for(const tk of tanks){const gy=groundAt(tk.x);if(tk.y<gy-.5){tk.vy+=G*dt;tk.y=Math.min(gy,tk.y+tk.vy*dt);}else{if(tk.vy>70&&tk.hp>0){tk.hp=Math.max(0,tk.hp-1);pops.push({x:tk.x,y:tk.y-22,text:'FALL DAMAGE',t:1.2,c:'#ff5a5a'});}tk.vy=0;tk.y=gy;}}
  if(state==='aim'){turnT-=dt;if(net&&!theirs()){aimT-=dt;const tk=tanks[turn],a=[+tk.angle.toFixed(3),+tk.power.toFixed(3),weapon[turn]],key=a.join();if(aimT<=0&&key!==aimSent){aimT=.15;aimSent=key;net.send({aim:a});}}
   if(turnT<=0){if(theirs())turnT=0;else{if(net)net.send({skip:1});shots[turn]++;nextTurn();}}}
  if(state==='flight'&&shell){const sub=4;for(let k=0;k<sub&&shell;k++){const h=dt/sub;shell.vx+=wind*1.6*h;shell.vy+=G*h;shell.x+=shell.vx*h;shell.y+=shell.vy*h;
    if(theirs()&&(shell.x<-20||shell.x>FW+20||shell.y>FH+20||tanks.some(tk=>tk.hp>0&&Math.hypot(tk.x-shell.x,tk.y-5-shell.y)<6)||shell.x>=0&&shell.x<=FW&&shell.y>=groundAt(shell.x))){shell=null;break;}
    if(net&&(shell.x<-20||shell.x>FW+20||shell.y>FH+20))report(true);
    if(shell.x<-20||shell.x>FW+20||shell.y>FH+20){pops.push({x:clamp(shell.x,20,FW-20),y:40,text:'MISS',t:1,c:'#fff'});shell=null;state='settle';t=0;break;}
    const hitTank=tanks.find(tk=>tk.hp>0&&Math.hypot(tk.x-shell.x,tk.y-5-shell.y)<6);
    if(net&&(hitTank||(shell.x>=0&&shell.x<=FW&&shell.y>=groundAt(shell.x))))report(false);
    if(hitTank||(shell.x>=0&&shell.x<=FW&&shell.y>=groundAt(shell.x))){explode(shell.x,shell.y,shell.nuke);shell=null;state='settle';t=0;break;}
    for(const b of bugs)if(b.alive&&Math.abs(b.x-shell.x)<5&&Math.abs(groundAt(b.x)-4-shell.y)<5){if(net&&!theirs())report(false);if(theirs()){shell=null;break;}explode(shell.x,shell.y,shell.nuke);shell=null;state='settle';t=0;break;}}
   if(shell){trail.push({x:shell.x,y:shell.y});if(trail.length>90)trail.shift();}}
  if(state==='settle'){t+=dt;if(t>1.2){if(net&&!theirs()){net.send({sync:{hp:tanks.map(tk=>tk.hp),sc:score,sh:shots,nk:nukes}});nextTurn();}else if(!theirs()||synced)nextTurn();}}
 }
 // online: the shooter tells the other phone where the shell came down (and where the bugs were at that moment)
 function report(miss){if(!shell||theirs())return;net.send({ex:[+shell.x.toFixed(3),+shell.y.toFixed(3),shell.nuke?1:0,miss?1:0],bugs:bugs.map(b=>[+b.x.toFixed(3),b.dir,b.alive?1:0])});}
 function nextTurn(){if(tanks.some(tk=>tk.hp<=0)||shots.every(v=>v>=SHOTS)){state='over';const sc=[score[0],score[1]];setTimeout(()=>s.finish(sc,`Klendathu artillery · ${sc[0]}–${sc[1]}`),1500);return;}newTurn(1-turn);}
 function drawTank(tk){const {k}=view;x.save();x.translate(tk.x,tk.y);if(tk.hp<=0){x.fillStyle='#2a1a10';x.fillRect(-7,-4,14,4);x.restore();return;}
  x.strokeStyle='#e8e8e8';x.lineWidth=1.6;x.beginPath();x.moveTo(0,-6);x.lineTo(Math.cos(tk.angle)*11,-6+Math.sin(tk.angle)*11);x.stroke();
  x.fillStyle=TCOL[tk.i];x.beginPath();x.arc(0,-5,4.4,Math.PI,0);x.fill();x.fillRect(-7,-5,14,4);x.fillStyle='#222';x.fillRect(-7.5,-1.5,15,2.2);x.restore();
  s.sprite(x,tk.i,tk.x,tk.y-11,13,{exact:true});
  for(let q=0;q<3;q++){x.fillStyle=q<tk.hp?TCOL[tk.i]:'#00000066';x.fillRect(tk.x-7+q*5,tk.y-21,4,2);}}
 s.debug={engine:'artillery',bot:null};
 if(net){s.debug.bot=()=>{if(state!=='aim'||theirs()||s.paused||!tanks||banner)return '';const tk=tanks[turn];tk.angle=turn?-Math.PI+.4+Math.random()*.8:-.4-Math.random()*.8;tk.power=.35+Math.random()*.55;fire();return 'fire';};
  void (async()=>{const wait=f=>(async()=>{while(s.alive&&!f())await new Promise(r=>setTimeout(r,50));})();for(;;){const m=await net.next();if(!m||!s.alive)return;
   if(Array.isArray(m.aim)){if(state==='aim'&&theirs()){const tk=tanks[turn];tk.angle=clamp(+m.aim[0]||0,-Math.PI+.05,-.05);tk.power=clamp(+m.aim[1]||0,.08,1);weapon[turn]=m.aim[2]===1&&nukes[turn]>0?1:0;}}
   else if(m.fire){await wait(()=>state==='aim'&&theirs()&&tanks);if(!s.alive)return;const tk=tanks[turn];tk.angle=clamp(+m.fire.a||0,-Math.PI+.05,-.05);tk.power=clamp(+m.fire.p||0,.08,1);weapon[turn]=m.fire.n===1&&nukes[turn]>0?1:0;fire(true);}
   else if(m.skip){await wait(()=>state==='aim'&&theirs());if(!s.alive)return;shots[turn]++;nextTurn();}
   else if(Array.isArray(m.ex)){await wait(()=>state==='flight');if(!s.alive)return;if(Array.isArray(m.bugs))m.bugs.forEach((v,i)=>{if(bugs[i]&&Array.isArray(v)){bugs[i].x=+v[0];bugs[i].dir=v[1]<0?-1:1;bugs[i].alive=!!v[2];}});
    const [ex,ey,nk,miss]=m.ex;shell=null;if(miss)pops.push({x:clamp(ex,20,FW-20),y:40,text:'MISS',t:1,c:'#fff'});else explode(ex,ey,!!nk);state='settle';t=0;}
   else if(m.sync){await wait(()=>state==='settle'&&theirs());if(!s.alive)return;const y=m.sync;[0,1].forEach(i=>{if(Number.isFinite(y.hp?.[i]))tanks[i].hp=y.hp[i];if(Number.isFinite(y.sc?.[i]))score[i]=y.sc[i];if(Number.isFinite(y.sh?.[i]))shots[i]=y.sh[i];if(Number.isFinite(y.nk?.[i]))nukes[i]=y.nk[i];});s.setScores(score);synced=true;}}})();}
 s.frame(dt=>{
  if(!ter)return;anim+=dt;shake.step(dt);bits.step(dt);if(banner){banner.t-=dt;if(banner.t<=0)banner=null;}if(state!=='wait'&&state!=='over'||blasts.length)step(dt);
  const W=s.W,H=s.H;layout();const {k,ox,oy}=view;
  x.setTransform(1,0,0,1,0,0);const sky=x.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#1a0a3a');sky.addColorStop(.5,'#6a1f5a');sky.addColorStop(.85,'#ff7a3a');sky.addColorStop(1,'#ffc46a');x.fillStyle=sky;x.fillRect(0,0,W,H);
  // twin moons + distant mesas
  x.fillStyle='#ffe9c8';x.globalAlpha=.85;x.beginPath();x.arc(W*.78,H*.18,Math.min(W,H)*.06,0,Math.PI*2);x.fill();x.globalAlpha=.5;x.beginPath();x.arc(W*.86,H*.27,Math.min(W,H)*.025,0,Math.PI*2);x.fill();x.globalAlpha=1;
  x.fillStyle='#4a1838';x.beginPath();x.moveTo(0,H);for(let i=0;i<=24;i++){const X=i/24*W;x.lineTo(X,H*.62-Math.abs(Math.sin(i*1.7))*H*.12-(i%5===0?H*.06:0));}x.lineTo(W,H);x.fill();
  let sx=0,sy=0;if(shake.mag>.3){sx=(Math.random()-.5)*shake.mag;sy=(Math.random()-.5)*shake.mag;}
  x.setTransform(k,0,0,k,ox+sx,oy+sy);
  // dirt with strata
  const dirt=x.createLinearGradient(0,FH*.4,0,FH);dirt.addColorStop(0,'#c86a2a');dirt.addColorStop(.5,'#8a3a18');dirt.addColorStop(1,'#4a1a0a');x.fillStyle=dirt;
  x.beginPath();x.moveTo(-ox/k-4,FH+40);for(let i=0;i<=FW;i+=2)x.lineTo(i,ter[i]);x.lineTo(FW+ox/k+4,FH+40);x.closePath();x.fill();
  x.strokeStyle='#ffb25a';x.lineWidth=1.2;x.beginPath();for(let i=0;i<=FW;i+=2)i?x.lineTo(i,ter[i]):x.moveTo(i,ter[i]);x.stroke();
  x.fillStyle='#c86a2a';x.fillRect(-ox/k-4,ter[0],ox/k+4,FH);x.fillRect(FW,ter[FW],ox/k+4,FH);
  // bugs
  for(const b of bugs){if(!b.alive)continue;const by=groundAt(b.x);x.save();x.translate(b.x,by-3);x.scale(b.dir,1);x.fillStyle='#3a2a10';x.beginPath();x.ellipse(0,0,5,2.6,0,0,Math.PI*2);x.fill();x.strokeStyle='#3a2a10';x.lineWidth=.8;for(let q=0;q<4;q++){const lg=Math.sin(anim*12+q+b.ph)*1.2;x.beginPath();x.moveTo(-3+q*2,0);x.lineTo(-4+q*2.4+lg,3);x.stroke();}x.fillStyle='#ffd23f';x.fillRect(4,-1.2,1.4,1);x.restore();}
  for(const tk of tanks)drawTank(tk);
  if(state==='aim'){const tk=tanks[turn],by=tk.y-30+Math.sin(anim*6)*2;x.fillStyle=TCOL[turn];x.beginPath();x.moveTo(tk.x-4,by);x.lineTo(tk.x+4,by);x.lineTo(tk.x,by+5);x.fill();}
  // aim guide and tracer start
  if(state==='aim'){const tk=tanks[turn];const sp=60+tk.power*220;x.fillStyle='#ffffffaa';let px=tk.x+Math.cos(tk.angle)*9,py=tk.y-6+Math.sin(tk.angle)*9,vx=Math.cos(tk.angle)*sp,vy=Math.sin(tk.angle)*sp;for(let q=0;q<12;q++){for(let z=0;z<4;z++){vx+=wind*1.6*.012;vy+=G*.012;px+=vx*.012;py+=vy*.012;}x.beginPath();x.arc(px,py,.9,0,Math.PI*2);x.fill();}}
  if(trail.length){x.strokeStyle='#fff6';x.lineWidth=.8;x.beginPath();trail.forEach((p,q)=>q?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();}
  if(shell){x.fillStyle=shell.nuke?'#ffd23f':'#fff';x.shadowColor='#fff';x.shadowBlur=6;x.beginPath();x.arc(shell.x,shell.y,shell.nuke?2.2:1.4,0,Math.PI*2);x.fill();x.shadowBlur=0;}
  for(const b of blasts){const pr=b.t<.45?b.t/.45:1-(b.t-.45)/.45;for(let q=0;q<BLAST.length;q++){const rr2=b.R*pr*(1-q/BLAST.length);if(rr2<=0)continue;x.fillStyle=BLAST[(q+Math.floor(b.t*20))%BLAST.length];x.beginPath();x.arc(b.x,b.y,rr2,0,Math.PI*2);x.fill();}}
  bits.draw(x);
  for(const p of pops)pixText(x,p.text,p.x,p.y-(1.6-p.t)*10,.8,p.c,{align:'center',alpha:clamp(p.t*2,0,1)});
  x.setTransform(1,0,0,1,0,0);
  // HUD
  const tk=tanks[turn],fs=Math.max(1.6,Math.min(W,H)*.0045);
  pixText(x,`${s.players[0].name.toUpperCase()} ${score[0]}`,10,12,fs,TCOL[0]);pixText(x,`SHOTS ${SHOTS-shots[0]}`,10,12+fs*9,fs*.75,'#ffffffaa');
  pixText(x,`${score[1]} ${s.players[1].name.toUpperCase()}`,W-130,12,fs,TCOL[1],{align:'right'});pixText(x,`SHOTS ${SHOTS-shots[1]}`,W-130,12+fs*9,fs*.75,'#ffffffaa',{align:'right'});
  const wy=12+fs*20;pixText(x,`WIND ${Math.abs(wind)}`,W/2,wy,fs*.8,'#fff',{align:'center'});x.strokeStyle='#fff';x.lineWidth=2;const wl=wind*1.2;x.beginPath();x.moveTo(W/2-wl,wy+fs*10);x.lineTo(W/2+wl,wy+fs*10);if(wind){x.lineTo(W/2+wl-Math.sign(wind)*6,wy+fs*10-4);x.moveTo(W/2+wl,wy+fs*10);x.lineTo(W/2+wl-Math.sign(wind)*6,wy+fs*10+4);}x.stroke();
  if(state==='aim'){pixText(x,`ANGLE ${Math.round(-tk.angle*180/Math.PI)}  POWER ${Math.round(tk.power*1000)}  ${Math.ceil(turnT)}S`,W/2,wy+fs*16,fs*.8,TCOL[turn],{align:'center'});
   for(const r of chipRects()){const on=weapon[turn]===r.i,dis=r.i===1&&nukes[turn]<=0;x.fillStyle=on?'#ffd23fdd':'#000000aa';rr(x,r.x,r.y,r.w,r.h,10);x.fill();x.strokeStyle=dis?'#ffffff33':'#ffd23f';x.lineWidth=2;x.stroke();label(x,r.i?`☢ BABY NUKE ×${nukes[turn]}`:'MISSILE',r.x+r.w/2,r.y+r.h/2+1,13,{fill:on?'#000':dis?'#ffffff55':'#fff',stroke:null,font:`900 13px ${SANS}`});}}
  if(banner)label(x,banner.text,W/2,H*.4,clamp(W*.06,18,40),{fill:TCOL[turn],alpha:clamp(banner.t*2,0,1)});
  if(aim){x.strokeStyle='#ffffff66';x.lineWidth=2;x.setLineDash([6,6]);x.beginPath();x.moveTo(aim.sx,aim.sy);x.lineTo(aim.x,aim.y);x.stroke();x.setLineDash([]);}
  s.debug={engine:'artillery',tanks,turn,state,score,shots,wind,bot:s.debug?.bot||null};
 });
 if(!await s.pass(0,`Scorched Earth on Klendathu. Take turns: drag back anywhere and let go to fire (direction = angle, length = power). Mind the wind. Each of you has one Baby Nuke. Three armour bars, ${SHOTS} shots each; damage dealt is your score.`,'Ready — lock and load',{countdown:0}))return;
 setup();
}
Object.assign(exports,{artillery});
