// The League · Penalty Kicks. Real-time, both hands on one phone: the striker owns the BOTTOM half and swipes
// the ball at the goal (direction = aim, speed = power, a curved swipe bends it). The keeper owns the TOP half
// and swipes left/right (or up) to dive the instant the ball is struck; diving early gives the game away.
// Five kicks each, alternating, then sudden death. Over the bar or wide is a miss.
const {clamp}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {label,rr,makeFx,makeShake,sfx,halfPointers,keyboard,voice,noise}=require("src/engines/tarantinoKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const TRASH=['Taco would have scored that.','Ruxin is furious.','Shiva Bowl energy!','Pete called it.','Andre bought new cleats for this.','Kevin’s fantasy team is crying.'];

async function penalty(s){
 const [c,x]=s.canvas(560,760,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 const fx=makeFx(),shake=makeShake(),goals=[0,0],taken=[0,0],hist=[[],[]];
 let kicker=0,phase='ready',ball=null,keeper=null,swipe=null,t=0,msg='',msgT=0,early=false;
 s.debug={engine:'penalty',goals,get phase(){return phase;},get ball(){return ball;},get keeper(){return keeper;},kick:(tx,power,curve)=>kick(tx,power,curve),dive:d=>dive(d)};
 const L={};function layout(){const W=s.W,H=s.H,gw=Math.min(W*.82,H*.62),gh=gw*.36;Object.assign(L,{W,H,gw,gh,gx:(W-gw)/2,gy:H*.2,spotX:W/2,spotY:H*.8,mid:H*.5});}
 const keeperP=()=>1-kicker;

 function resetKick(){ball={x:L.spotX,y:L.spotY,z:0,t:0,dur:1,flying:false,tx:0,ty:0,curve:0,done:false,power:0};keeper={x:0,dive:0,dir:0,t:0,reach:0};early=false;phase='aim';}
 // tx: -1..1 across the goal (|tx|>1.08 is wide); ty: 0 ground .. 1 crossbar (>1.05 over)
 function kick(tx,power,curve){if(phase!=='aim')return;ball.flying=true;ball.tx=tx;ball.ty=clamp(power*1.15-.25+Math.abs(curve)*.1,0,1.5);ball.curve=curve;ball.power=power;ball.dur=clamp(1.05-power*.55,.42,.95);ball.t=0;phase='fly';sfx.thump(.18);noise(.08,.1,{f0:1200,f1:300});vibrate(15);if(keeper.dive)early=true;}
 function dive(d){if(phase!=='aim'&&phase!=='fly')return;if(keeper.dive)return;keeper.dive=1;keeper.dir=d;keeper.t=0;sfx.whoosh(400,1200,.06,.14);if(phase==='aim')early=true;}

 // vs CPU the human plays whichever role is theirs this kick, anywhere on the screen
 const cpu=isCpu(s);let cpuT=0,cpuKick=null;
 halfPointers(s,{cpuOwner:false,chooseOwner:p=>cpu?(kicker===0?'s':'k'):p.y<s.H*.5?'k':'s',
  down:(o,r)=>{if(o==='s'&&phase==='aim'&&Math.hypot(r.x-ball.x,r.y-ball.y)<Math.max(70,L.W*.15))swipe={pts:[{x:r.x,y:r.y,t:performance.now()}]};},
  move:(o,r)=>{if(o==='s'&&swipe){swipe.pts.push({x:r.x,y:r.y,t:performance.now()});if(swipe.pts.length>40)swipe.pts.shift();}},
  up:(o,r,{cancelled})=>{
   if(o==='k'){if(cancelled)return;const dx=r.x-r.sx,dy=r.y-r.sy;if(Math.hypot(dx,dy)<18){dive(clamp((r.x-L.W/2)/(L.gw/2),-1,1));}else dive(Math.abs(dx)<Math.abs(dy)*.5?0:clamp(dx/(L.gw*.25),-1,1));return;}
   if(!swipe||cancelled){swipe=null;return;}const p=swipe.pts;swipe=null;if(p.length<2)return;const a=p[0],b=p[p.length-1],dy=a.y-b.y;if(dy<25)return;
   const dt=Math.max(30,b.t-a.t),spd=Math.hypot(b.x-a.x,dy)/dt;const power=clamp((spd-.3)/2.2,0,1.25);
   const tx=(b.x-a.x)/dy*2.4;const mid=p[Math.floor(p.length/2)],lin=a.x+(b.x-a.x)*((a.y-mid.y)/dy),curve=clamp((mid.x-lin)/(L.W*.08),-1,1);
   kick(clamp(tx,-1.6,1.6),power,curve);}});
 keyboard(s,(i,k,down)=>{if(!down)return;const isK=i===keeperP();if(isK){if(k==='l')dive(-.8);if(k==='r')dive(.8);if(k==='u')dive(0);}else if(phase==='aim'){if(k==='l')kick(-.75,.7,0);if(k==='r')kick(.75,.7,0);if(k==='u'||k==='act')kick(0,.65,0);}});

 function resolve(){const b=ball,kp=keeper;b.done=true;
  const wide=Math.abs(b.tx)>1.06,over=b.ty>1.04;let res;
  const kx=kp.dive?kp.dir*kp.reach:0,ky=kp.dive?(kp.dir===0?.75:.45):.5,dist=Math.hypot((b.tx-kx)*1.0,(b.ty-ky)*.75);
  const save=!wide&&!over&&dist<(kp.dive?.34:.22)+(early?-.08:0)+(b.power>1?-.06:0);
  if(wide||over){res='miss';msg=over?'OVER THE BAR!':'WIDE!';voice(180,.4,.07,'square',{slide:.6});}
  else if(save){res='save';msg='SAVED!';shake.kick(8);sfx.thump(.2);fx.spark(bx(),by(),20,'#fff');s.react(keeperP(),'happy');s.react(kicker,'sad');}
  else{res='goal';goals[kicker]++;msg=Math.abs(b.tx)>.8&&b.ty>.7?'TOP BINS!':'GOAL!';fx.confetti(bx(),by(),40);sfx.fanfare();shake.kick(6);s.react(kicker,'happy');s.react(keeperP(),'sad');vibrate(40);}
  if(early&&res!=='goal'&&res!=='miss')msg+=' (keeper guessed early)';
  hist[kicker].push(res==='goal');taken[kicker]++;s.setScores(goals);msgT=2;phase='result';if(Math.random()<.5&&res==='goal')msg+='  '+TRASH[Math.floor(Math.random()*TRASH.length)];}
 function bx(){const b=ball,u=b.flying?clamp(b.t/b.dur,0,1):0,ex=L.W/2+b.tx*L.gw/2,bend=Math.sin(u*Math.PI)*b.curve*L.gw*.22;return L.spotX+(ex-L.spotX)*u+bend;}
 function by(){const b=ball,u=b.flying?clamp(b.t/b.dur,0,1):0,ey=L.gy+L.gh-b.ty*L.gh;return L.spotY+(ey-L.spotY)*u;}

 function decided(){const a=taken[0],b=taken[1],ga=goals[0],gb=goals[1];
  if(a<=5&&b<=5){const ra=5-a,rb=5-b;if(ga+ra<gb||gb+rb<ga)return true;if(a===5&&b===5)return ga!==gb;return false;}
  return a===b&&ga!==gb;}

 function draw(){const W=L.W,H=L.H,{gx,gy,gw,gh}=L;x.save();shake.apply(x);
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0e1a2a');bg.addColorStop(.12,'#1c2c44');bg.addColorStop(.13,'#2e8a3a');bg.addColorStop(1,'#1f6a2a');x.fillStyle=bg;x.fillRect(-20,-20,W+40,H+40);
  for(let k=0;k<10;k++){x.fillStyle=k%2?'#ffffff08':'#00000010';x.fillRect(0,H*.13+k*H*.087,W,H*.087);}
  // stands
  for(let k=0;k<50;k++){x.fillStyle=['#c33','#fff','#36c','#fc3'][k%4];x.beginPath();x.arc((k*41)%W,H*.03+((k*17)%(H*.08|1)),3,0,7);x.fill();}
  // box lines
  x.strokeStyle='#ffffffaa';x.lineWidth=2;x.strokeRect(W/2-gw*.75,gy+gh,gw*1.5,H*.35);x.beginPath();x.arc(L.spotX,L.spotY,3,0,7);x.stroke();
  // net
  x.fillStyle='#ffffff14';x.fillRect(gx,gy,gw,gh);x.strokeStyle='#ffffff30';x.lineWidth=1;for(let k=0;k<=16;k++){x.beginPath();x.moveTo(gx+k*gw/16,gy);x.lineTo(gx+k*gw/16,gy+gh);x.stroke();}for(let k=0;k<=6;k++){x.beginPath();x.moveTo(gx,gy+k*gh/6);x.lineTo(gx+gw,gy+k*gh/6);x.stroke();}
  x.strokeStyle='#fff';x.lineWidth=5;x.beginPath();x.moveTo(gx,gy+gh);x.lineTo(gx,gy);x.lineTo(gx+gw,gy);x.lineTo(gx+gw,gy+gh);x.stroke();
  // keeper
  const kp=keeper,kc=keeperP();if(kp){const u=clamp(kp.t/.32,0,1),kx=W/2+kp.dir*kp.reach*gw/2,lift=kp.dive?(kp.dir===0?.45:.2)*Math.sin(u*Math.PI*.9)*gh:0,ky=gy+gh*.62-lift,ang=kp.dive?kp.dir*u*1.2:0,hs=gh*.55;
   x.save();x.translate(kx,ky);x.rotate(ang);x.fillStyle=kc?'#ff6fae':'#5fa8ff';rr(x,-hs*.3,-hs*.05,hs*.6,hs*.75,hs*.12);x.fill();x.strokeStyle=kc?'#ff6fae':'#5fa8ff';x.lineWidth=hs*.14;x.lineCap='round';x.beginPath();x.moveTo(-hs*.28,hs*.05);x.lineTo(-hs*.65,-hs*.45);x.moveTo(hs*.28,hs*.05);x.lineTo(hs*.65,-hs*.45);x.stroke();
   x.fillStyle='#fff';for(const g of [-1,1]){x.beginPath();x.arc(g*hs*.68,-hs*.5,hs*.12,0,7);x.fill();}x.restore();s.sprite(x,kc,kx,ky-hs*.3,hs*.95,{exact:true,mood:phase==='result'&&msg.startsWith('SAVED')?'happy':undefined});}
  // ball
  if(ball){const u=ball.flying?clamp(ball.t/ball.dur,0,1):0,r=clamp(W*.035,9,22)*(1-u*.45),px=bx(),py=by()-Math.sin(u*Math.PI)*ball.ty*L.gh*.35;
   x.fillStyle='#0004';x.beginPath();x.ellipse(px,by()+r*.8,r,r*.35,0,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(px,py,r,0,7);x.fill();x.fillStyle='#222';for(let k=0;k<5;k++){const a=k*1.256+ball.t*12;x.beginPath();x.arc(px+Math.cos(a)*r*.55,py+Math.sin(a)*r*.55,r*.2,0,7);x.fill();}}
  // striker
  if(phase==='aim'||phase==='ready')s.sprite(x,kicker,L.spotX-W*.14,L.spotY+H*.06,clamp(W*.17,50,110),{exact:true});
  if(swipe&&swipe.pts.length>1){x.strokeStyle='#ffd23fcc';x.lineWidth=5;x.lineCap='round';x.beginPath();swipe.pts.forEach((p,k)=>k?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();}
  // halves + hud
  x.setLineDash([8,8]);x.strokeStyle='#ffffff30';x.beginPath();x.moveTo(0,L.mid);x.lineTo(W,L.mid);x.stroke();x.setLineDash([]);
  const fs=clamp(W*.035,11,18);
  label(x,`KEEPER ${s.players[kc].name.toUpperCase()} · swipe up here to dive`,W/2,L.mid-fs,fs*.85,{fill:kc?'#ff9fc6':'#78b6ff',alpha:.85});
  label(x,`STRIKER ${s.players[kicker].name.toUpperCase()} · swipe the ball at the goal`,W/2,L.mid+fs,fs*.85,{fill:kicker?'#ff9fc6':'#78b6ff',alpha:.85});
  for(let i=0;i<2;i++){const rowY=H*.9+i*fs*1.5;label(x,s.players[i].name,12,rowY,fs,{align:'left',fill:i?'#ff9fc6':'#78b6ff'});for(let k=0;k<Math.max(5,taken[i]);k++){const r=hist[i][k];x.fillStyle=r===undefined?'#ffffff30':r?'#5fe07a':'#e05a4a';x.beginPath();x.arc(W*.32+k*fs*1.4,rowY,fs*.45,0,7);x.fill();}label(x,String(goals[i]),W-14,rowY,fs*1.2,{align:'right'});}
  if(msgT>0)label(x,msg,W/2,H*.62,clamp(W*.055,16,32),{fill:msg.startsWith('GOAL')||msg.startsWith('TOP')?'#9dff5c':'#ffd23f'});
  if(taken[0]>=5&&taken[1]>=5&&phase==='aim')label(x,'SUDDEN DEATH',W/2,L.mid+fs*2.6,fs*1.2,{fill:'#ff6b6b'});
  fx.draw(x);x.restore();}

 s.hint('Striker (bottom half): put a finger on the ball and swipe toward the goal. Direction aims, swipe speed is power (too hard sails over the bar), a curved swipe bends the shot. Keeper (top half): swipe left/right to dive that way, swipe up to stay and jump; dive before the kick and you give it away. Keys: keeper ←/→/↑, striker A/D/W.');
 if(!await s.pass(0,'Both of you hold the phone. The striker swipes the ball from the bottom half; the keeper swipes on the top half to dive. Five kicks each, alternating, then sudden death.','Both ready',{countdown:3}))return;
 // CPU striker: picks a corner and a power after a pause; CPU keeper: reads the shot after a reaction delay
 function cpuThink(dt){const sk=cpuSkill(s);
  if(phase==='aim'&&kicker===1){if(cpuKick===null)cpuKick=.9+s.random()*1.1;cpuKick-=dt;if(cpuKick<=0){cpuKick=null;const side=s.random()<.5?-1:1;kick(side*(.45+s.random()*(.5+sk*.55)),.55+s.random()*(.35+(1-sk)*.35),(s.random()-.5)*.6);}}
  else if(phase!=='aim')cpuKick=null;
  if(keeperP()===1&&!keeper?.dive){if(phase==='aim'&&s.random()<dt*(1-sk)*.15)dive(s.random()<.5?-.8:.8);
   if(phase==='fly'){cpuT+=dt;if(cpuT>=.12+(1-sk)*.22){cpuT=0;const guess=clamp(ball.tx+ball.curve*.4+(s.random()-.5)*(1.1-sk)*1.6,-1,1);dive(Math.abs(guess)<.25?0:guess);}}else cpuT=0;}}
 layout();resetKick();
 s.frame(dt=>{layout();t+=dt;msgT=Math.max(0,msgT-dt);
  if(cpu)cpuThink(dt);
  if(phase==='fly'){ball.t+=dt;if(ball.t>=ball.dur&&!ball.done)resolve();}
  if(keeper&&keeper.dive){keeper.t+=dt;keeper.reach=Math.min(1,keeper.t/.32)*.95;}
  if(phase==='result'&&msgT<=0){if(decided()){phase='over';if(s.alive)s.finish([...goals],goals[0]===goals[1]?`Penalties tie ${goals[0]}–${goals[1]}.`:`${s.players[goals[0]>goals[1]?0:1].name} wins the shootout ${Math.max(...goals)}–${Math.min(...goals)}.`);return;}
   if(taken[0]>=12&&taken[1]>=12){phase='over';s.finish([...goals],'Penalties end level.');return;}
   kicker=taken[0]>taken[1]?1:0;resetKick();sfx.ding(660);}
  fx.step(dt);shake.step(dt);draw();
  s.status(`${s.players[kicker].name} shoots · ${s.players[keeperP()].name} keeps`);
 });
}
Object.assign(exports,{penalty});
