// BASEketball. Baseball rules with a basketball: pick a base to shoot from (single, double, triple, home run;
// further = harder), drag back from the ball and release. A make advances your runners, a miss is an out,
// three outs ends the half-inning. Two innings each. The defender can PSYCH OUT the shooter twice per
// half-inning by tapping the top strip while the shooter is aiming: the aim guide vanishes and the hands shake.
const {clamp}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {label,rr,makeFx,makeShake,sfx,voice,noise}=require("src/engines/tarantinoKit.js");
const {isCpu,cpuSkill,cpuHotseat}=require("src/engines/cpuKit.js");
const BASES=[['SINGLE',4.2],['DOUBLE',7],['TRIPLE',9.8],['HOME RUN',12.6]];
const PSYCH=['YOUR MOM!','I SLEPT WITH YOUR SISTER!','AIRHORN!','LOOK, A HOT DOG!','*KAZOO SOLO*','YOU’RE ADOPTED!','BOO-YAH!','NICE SHIRT. NOT.'];
const INNINGS=2,MAXSHOTS=12;

async function basketball2p(s){
 const [c,x]=s.canvas(760,560,{fill:true});s.body.classList.add('drag-arena-body');
 const fx=makeFx(),shake=makeShake(),runs=[0,0];
 let half=0,bat=0,outs=0,bases=[0,0,0],spot=1,ball=null,drag=null,psych=2,psyched=0,psychText='',psychT=0,shots=0,phase='wait',msg='',msgT=0,t=0;
 s.debug={engine:'basketball2p',runs,get ball(){return ball;},get phase(){return phase;},get spot(){return spot;},shoot:(vx,vy)=>launch(vx,vy)};
 const L={};function layout(){const W=s.W,H=s.H,strip=Math.max(54,H*.14),u=clamp(Math.min(W/16,(H-strip)/10.5),12,60),floor=H-u*1.2;Object.assign(L,{W,H,u,floor,hx:W-u*2.3,hy:floor-u*6.2,rim:u*.85,strip:Math.max(54,H*.14)});}
 const spotX=k=>clamp(L.hx-BASES[k][1]*L.u,L.u*.8,L.W);
 const ballHome=()=>({x:spotX(spot),y:L.floor-L.u*1.6});

 function resetBall(){ball={...ballHome(),vx:0,vy:0,fly:false,made:false,done:false,t:0,swish:true};drag=null;psyched=0;}
 function launch(vx,vy){if(!ball||ball.fly||phase!=='aim')return;ball.vx=vx;ball.vy=vy;ball.fly=true;phase='fly';shots++;sfx.whoosh(300,1200,.06,.18);}

 // vs CPU: batting, the CPU picks a base spot (riskier on Hard) and launches on a computed arc with error (more if you psych it out); defending, it psychs you out mid-aim
 const cpu=isCpu(s);let cpuPsychT=0;
 const psychOut=()=>{if(psych>0&&!psyched&&phase==='aim'){psych--;psyched=1;psychText=PSYCH[Math.floor(Math.random()*PSYCH.length)];psychT=1.6;shake.kick(9);noise(.4,.12,{type:'bandpass',f0:500,f1:900,q:3});voice(220,.5,.07,'sawtooth');vibrate(40);s.react(1-bat,'happy');}};
 if(cpu)cpuHotseat(s,{isTurn:()=>bat===1&&phase==='aim'&&ball&&!ball.fly,delay:1100,think:()=>{const sk=cpuSkill(s),r=Math.random();spot=r<.45-sk*.2?0:r<.75?1:r<.92?2:3;resetBall();const b=ball,g=L.u*30,T=.95+Math.random()*.3,vx=(L.hx-b.x)/T,vy=(L.hy-b.y-.5*g*T*T)/T,e=(1-sk)*.09+(psyched?.12:0),a=Math.atan2(vy,vx)+(Math.random()-.5)*e,m=Math.hypot(vx,vy)*(1+(Math.random()-.5)*e*.6);launch(Math.cos(a)*m,Math.sin(a)*m);}});
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev);if(cpu&&(bat===1||p.y<L.strip))return;
  if(p.y<L.strip){if(phase==='aim'||phase==='fly'){if(psych>0&&!psyched&&phase==='aim'){psych--;psyched=1;psychText=PSYCH[Math.floor(Math.random()*PSYCH.length)];psychT=1.6;shake.kick(9);noise(.4,.12,{type:'bandpass',f0:500,f1:900,q:3});voice(220,.5,.07,'sawtooth');vibrate(40);s.react(1-bat,'happy');}}return;}
  if(phase!=='aim')return;
  for(let k=0;k<4;k++){if(Math.abs(p.x-spotX(k))<L.u*1.1&&p.y>L.floor-L.u*.6){if(!drag){spot=k;resetBall();sfx.click();}return;}}
  s.capture(ev);drag={id:ev.pointerId,sx:p.x,sy:p.y,x:p.x,y:p.y};});
 s.on(c,'pointermove',ev=>{if(!drag||drag.id!==ev.pointerId)return;const p=s.pointer(ev);drag.x=p.x;drag.y=p.y;});
 const up=ev=>{if(!drag||drag.id!==ev.pointerId)return;s.release(ev);const v=pullVec();drag=null;if(v.len>L.u*.4)launch(v.vx,v.vy);};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',()=>{drag=null;});
 function pullVec(){let dx=drag.sx-drag.x,dy=drag.sy-drag.y;const len=Math.hypot(dx,dy),max=L.u*5;if(len>max){dx*=max/len;dy*=max/len;}
  let k=5.2;let vx=dx*k,vy=dy*k;if(psyched){const w=Math.sin(t*23)*.12+Math.sin(t*9)*.08;const a=Math.atan2(vy,vx)+w,m=Math.hypot(vx,vy)*(1+Math.sin(t*17)*.06);vx=Math.cos(a)*m;vy=Math.sin(a)*m;}
  return {vx,vy,len:Math.min(len,max)};}

 function result(made){ball.done=true;
  if(made){const n=spot+1;let scored=0;const nb=[0,0,0];for(let b=2;b>=0;b--)if(bases[b]){const to=b+n;if(to>=3)scored++;else nb[to]=1;}if(n>=4)scored++;else nb[n-1]=1;bases=nb;runs[bat]+=scored;s.setScores(runs);
   msg=`${BASES[spot][0]}!${scored?` ${scored} RUN${scored>1?'S':''} SCORE${scored>1?'':'S'}`:''}`;sfx.coin();if(scored){sfx.fanfare();fx.confetti(L.hx,L.hy,30+scored*10);}s.react(bat,'happy');}
  else{outs++;msg=outs>=3?'THREE OUTS!':`OUT ${outs}`;voice(160,.35,.07,'square',{slide:.6});s.react(bat,'sad');}
  msgT=1.5;phase='result';
 }

 function physics(dt){const b=ball,g=L.u*30,r=L.u*.42;b.t+=dt;const n=3;for(let k=0;k<n;k++){const d=dt/n;b.vy+=g*d;b.x+=b.vx*d;b.y+=b.vy*d;
  // backboard
  const bbx=L.hx+L.rim+L.u*.25;if(b.x+r>bbx&&b.x<bbx+L.u*.4&&b.y>L.hy-L.u*2.4&&b.y<L.hy+L.u*.3&&b.vx>0){b.x=bbx-r;b.vx*=-.55;b.swish=false;sfx.thump(.08);}
  // rim points
  for(const rx of [L.hx-L.rim,L.hx+L.rim]){const dx=b.x-rx,dy=b.y-L.hy,dd=Math.hypot(dx,dy);if(dd<r&&dd>0){const nx=dx/dd,ny=dy/dd,vn=b.vx*nx+b.vy*ny;b.x=rx+nx*r;b.y=L.hy+ny*r;if(vn<0){b.vx-=1.6*vn*nx;b.vy-=1.6*vn*ny;b.vx*=.8;b.vy*=.8;}b.swish=false;voice(700,.06,.04,'triangle');}}
  if(!b.made&&b.vy>0&&Math.abs(b.y-L.hy)<b.vy*d+1&&Math.abs(b.x-L.hx)<L.rim-r*.5){b.made=true;fx.spark(L.hx,L.hy+L.u*.5,14,'#fff');if(b.swish){fx.pop(L.hx,L.hy-L.u*1.5,'SWISH',{color:'#9dff5c',size:22});}}
  if(b.y>L.floor-r){b.y=L.floor-r;b.vy*=-.5;b.vx*=.7;}}
  if(!b.done&&(b.made&&b.y>L.hy+L.u*1.5||b.x<-50||b.x>L.W+50||b.t>3.2||(b.y>=L.floor-r-1&&Math.abs(b.vy)<L.u&&!b.made)))result(b.made);
 }

 function drawDiamond(cx,cy,sz){x.save();x.translate(cx,cy);x.rotate(Math.PI/4);x.strokeStyle='#fff8';x.lineWidth=2;x.strokeRect(-sz/2,-sz/2,sz,sz);x.restore();
  const pts=[[sz*.7,0],[0,-sz*.7],[-sz*.7,0]];pts.forEach(([dx,dy],k)=>{x.fillStyle=bases[k]?'#ffd23f':'#fff3';x.fillRect(cx+dx-5,cy+dy-5,10,10);});x.fillStyle='#fff';x.fillRect(cx-4,cy+sz*.7-4,8,8);}

 function draw(){const W=L.W,H=L.H,u=L.u;x.save();shake.apply(x);
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1a2440');bg.addColorStop(.55,'#2a3456');bg.addColorStop(.56,'#c48a4a');bg.addColorStop(1,'#9a6430');x.fillStyle=bg;x.fillRect(-20,-20,W+40,H+40);
  // crowd
  x.globalAlpha=.45;for(let k=0;k<40;k++){const cx=(k*97)%W,cy=H*.36+((k*53)%(H*.16|1));x.fillStyle=['#e8b89a','#c98e6a','#8a5a3c'][k%3];x.beginPath();x.arc(cx,cy+Math.sin(t*3+k)*2,u*.3,0,7);x.fill();}x.globalAlpha=1;
  label(x,'MILWAUKEE BEERS',W*.42,H*.55-u*.6,clamp(u*.8,10,22),{fill:'#ffd23f'});
  x.fillStyle='#b07a3e';x.fillRect(0,L.floor,W,H-L.floor);x.strokeStyle='#00000022';for(let xx=0;xx<W;xx+=u*1.4){x.beginPath();x.moveTo(xx,L.floor);x.lineTo(xx,H);x.stroke();}
  // spots
  for(let k=0;k<4;k++){const sx2=spotX(k),on=k===spot;x.fillStyle=on?'#ffd23f':'#ffffff55';x.beginPath();x.ellipse(sx2,L.floor+u*.25,u*.9,u*.25,0,0,7);x.fill();label(x,BASES[k][0],sx2,L.floor+u*.85,clamp(u*.42,9,14),{fill:on?'#ffd23f':'#fff'});}
  // hoop
  x.fillStyle='#ddd';x.fillRect(L.hx+L.rim+u*.25,L.hy-u*2.4,u*.3,u*2.7);x.strokeStyle='#c33';x.lineWidth=2;x.strokeRect(L.hx+L.rim+u*.25,L.hy-u*1.4,u*.3,u*1);
  x.fillStyle='#777';x.fillRect(L.hx+L.rim+u*.55,L.hy-u*.2,u*.5,L.floor-L.hy);
  x.strokeStyle='#fff';x.lineWidth=1.5;for(let k=-3;k<=3;k++){x.beginPath();x.moveTo(L.hx+k*L.rim/3,L.hy);x.lineTo(L.hx+k*L.rim/5,L.hy+u*1.1);x.stroke();}
  x.strokeStyle='#ff5a1a';x.lineWidth=4;x.beginPath();x.moveTo(L.hx-L.rim,L.hy);x.lineTo(L.hx+L.rim,L.hy);x.stroke();
  // shooter
  const home=ballHome();s.sprite(x,bat,spotX(spot)-u*.9,L.floor-u*2.2,u*2.2,{exact:true,mood:psyched?'sad':undefined});
  // aim guide
  if(drag&&phase==='aim'){const v=pullVec();if(!psyched){x.fillStyle='#ffffffcc';let px=home.x,py=home.y,vx=v.vx,vy=v.vy;for(let k=0;k<9;k++){for(let j=0;j<4;j++){vy+=u*30*.02;px+=vx*.02;py+=vy*.02;}x.beginPath();x.arc(px,py,3.5-k*.25,0,7);x.fill();}}
   x.strokeStyle='#ffffff55';x.lineWidth=2;x.beginPath();x.moveTo(drag.sx,drag.sy);x.lineTo(drag.x,drag.y);x.stroke();}
  if(ball){const b=ball,r=u*.42;let bx=b.x,by=b.y;if(!b.fly&&drag){const v=pullVec();bx-=v.vx/5.2*.25;by-=v.vy/5.2*.25;}x.fillStyle='#e8701a';x.beginPath();x.arc(bx,by,r,0,7);x.fill();x.strokeStyle='#5a2a0a';x.lineWidth=1.5;x.beginPath();x.arc(bx,by,r,0,7);x.moveTo(bx-r,by);x.lineTo(bx+r,by);x.moveTo(bx,by-r);x.lineTo(bx,by+r);x.stroke();}
  // front rim over ball
  x.strokeStyle='#ff5a1a';x.lineWidth=4;x.beginPath();x.moveTo(L.hx-L.rim,L.hy);x.lineTo(L.hx+L.rim*.2,L.hy);x.stroke();
  // psych strip
  const def=1-bat;x.fillStyle=psyched?'#7a1a3a':'#00000088';x.fillRect(0,0,W,L.strip);x.strokeStyle=def?'#ff9fc6':'#78b6ff';x.setLineDash([6,6]);x.strokeRect(2,2,W-4,L.strip-4);x.setLineDash([]);
  const fs=clamp(L.strip*.22,10,18);label(x,`${s.players[def].name.toUpperCase()}: TAP HERE TO PSYCH OUT`,W/2,L.strip*.36,fs,{fill:def?'#ff9fc6':'#78b6ff'});label(x,'🤪'.repeat(psych)+'·'.repeat(2-psych)+'  (only while they aim)',W/2,L.strip*.7,fs*.8,{fill:'#ddd'});
  // scoreboard
  const sbY=L.strip+fs*1.4;label(x,`${s.players[0].name} ${runs[0]} · ${s.players[1].name} ${runs[1]}`,12,sbY,fs*1.1,{align:'left',fill:'#fff'});
  label(x,`INNING ${Math.floor(half/2)+1}/${INNINGS} · ${s.players[bat].name} AT BAT · OUTS ${'●'.repeat(outs)}${'○'.repeat(3-outs)}`,12,sbY+fs*1.4,fs*.8,{align:'left',fill:'#ffd23f'});
  drawDiamond(W>H?W*.6:W-u*3.2,sbY+fs*.6,clamp(u*.9,18,40));
  if(psychT>0){x.globalAlpha=clamp(psychT,0,1);label(x,psychText,W/2,H*.42,clamp(W*.06,16,40),{fill:'#ff4fa0',rot:Math.sin(t*20)*.08});x.globalAlpha=1;}
  if(msgT>0)label(x,msg,W/2,H*.5,clamp(W*.05,16,34),{fill:'#ffd23f'});
  if(phase==='aim'&&!drag&&ball&&!ball.fly)label(x,'tap a base spot · drag back from anywhere & release',W/2,L.floor-u*3.6,clamp(u*.42,10,15),{fill:'#fff'});
  fx.draw(x);x.restore();}

 async function startHalf(){layout();bat=half%2;outs=0;bases=[0,0,0];psych=2;shots=0;spot=1;resetBall();phase='wait';draw();
  if(!await s.pass(bat,`Inning ${Math.floor(half/2)+1}, ${s.players[bat].name} at bat. Tap a base spot (further = more bases), drag back from anywhere and release. Miss = out, three outs and you switch. ${s.players[1-bat].name}: tap the top strip to psych them out while they aim (twice per inning).`,'Play ball',{summary:half?`${s.players[0].name} ${runs[0]} – ${runs[1]} ${s.players[1].name}`:null}))return false;phase='aim';return true;}

 s.hint('Tap one of the four base spots on the floor to pick your shot (single = 1 base, home run = clears the bases). Drag back from anywhere and release to shoot; the dotted arc shows your aim. A make advances every runner, a miss is an out. The defender taps the top strip while you aim to psych you out: the guide disappears and your hands shake.');
 s.frame(dt=>{layout();t+=dt;psychT=Math.max(0,psychT-dt);msgT=Math.max(0,msgT-dt);if(cpu&&bat===0&&drag&&phase==='aim'){cpuPsychT+=dt;if(cpuPsychT>.5&&Math.random()<dt*(.4+cpuSkill(s)*.8)){cpuPsychT=0;psychOut();}}
  if(phase==='aim'&&ball&&!ball.fly&&!drag){Object.assign(ball,ballHome());}
  if(phase==='fly'&&ball)physics(dt);
  if(phase==='result'&&msgT<=0){if(outs>=3||shots>=MAXSHOTS){phase='switch';half++;if(half>=INNINGS*2){if(s.alive)s.finish([...runs],runs[0]===runs[1]?`BASEketball ties ${runs[0]}–${runs[1]}.`:`${s.players[runs[0]>runs[1]?0:1].name} wins BASEketball ${Math.max(...runs)}–${Math.min(...runs)}.`);return;}void startHalf();}else{resetBall();phase='aim';}}
  fx.step(dt);shake.step(dt);if(phase!=='wait'&&phase!=='switch')draw();
  s.status(`${s.players[bat].name} at bat · ${outs} out · ${BASES[spot][0]}`);
 });
 await startHalf();
}
Object.assign(exports,{basketball2p});
