// Alien · Motion Tracker. Pass-and-play, same seeded attack for both. You stand in the middle of the deck with a
// motion tracker that only shows movement on each PING (pings speed up as things get close). Tap toward a blip to
// fire the flamethrower that way. Xenomorphs +10, facehuggers +15. Burning Jonesy the cat costs 10. Anything that
// reaches you takes a life (three). Survivors bank 10 per life left.
const {clamp,seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {label,rr,makeFx,makeShake,sfx,voice,noise}=require("src/engines/tarantinoKit.js");
const DUR=45,CONE=.26,RANGE=.62;

function schedule(seed){const r=seededRandom(seed+':tracker'),list=[];let t=1.2;
 while(t<DUR-1){const p=t/DUR,k=r();list.push({at:t,a:r()*Math.PI*2,kind:k<.1?'cat':k<.3+p*.15?'hugger':'alien',wig:r()*6,spd:.07+r()*.04+p*.06});t+=Math.max(.55,1.9-p*1.3)*(.6+r()*.8);}
 return list;}

async function sonargrid(s){
 const [c,x]=s.canvas(680,680,{fill:true});s.body.classList.add('drag-arena-body');
 const fx=makeFx(),shake=makeShake(),scores=[0,0],plan=schedule(s.seed);let player=0,st=null,ending=false;
 s.debug={engine:'sonargrid',get st(){return st;},scores};
 const L={};function layout(){const W=s.W,H=s.H,R=Math.min(W*.46,H*.4);Object.assign(L,{W,H,R,cx:W/2,cy:H*.53});}
 function reset(){st={t:0,next:0,ents:[],ghosts:[],lives:3,fuel:100,score:0,kills:0,ping:0,sweep:0,flame:null,red:0,catBurnt:0};}
 const polar=e=>({x:L.cx+Math.cos(e.a)*e.d*L.R,y:L.cy+Math.sin(e.a)*e.d*L.R});

 s.on(c,'pointerdown',ev=>{if(s.paused||!st||ending)return;ev.preventDefault();const p=s.pointer(ev);fire(Math.atan2(p.y-L.cy,p.x-L.cx));});
 s.on(document,'keydown',ev=>{if(!st||s.paused||ending)return;const d={arrowright:0,d:0,arrowdown:Math.PI/2,s:Math.PI/2,arrowleft:Math.PI,a:Math.PI,arrowup:-Math.PI/2,w:-Math.PI/2}[ev.key.toLowerCase()];if(d!==undefined){ev.preventDefault();fire(d);}});

 function fire(a){if(st.fuel<20){sfx.click();fx.pop(L.cx,L.cy+L.R*.2,'NO FUEL',{color:'#ff8a3a',size:14});return;}st.fuel=Math.max(0,st.fuel-22);st.flame={a,t:.28};noise(.35,.12,{type:'bandpass',f0:300,f1:1400,q:.7});shake.kick(3);
  for(const e of st.ents){if(e.dead||e.d>RANGE)continue;let da=Math.abs(((e.a-a+Math.PI*3)%(Math.PI*2))-Math.PI);if(da>CONE+.06/Math.max(.15,e.d))continue;e.dead=1;const q=polar(e);
   if(e.kind==='cat'){st.score=Math.max(0,st.score-10);st.catBurnt++;fx.pop(q.x,q.y-10,'JONESY! −10',{color:'#ff6b6b',size:18});voice(900,.3,.05,'sawtooth',{slide:.4});s.react(player,'sad');}
   else{const pts=e.kind==='hugger'?15:10;st.score+=pts;st.kills++;fx.splat(q.x,q.y,{n:18,speed:220,color:'#b8e03a',size:4});fx.pop(q.x,q.y-12,'+'+pts,{color:'#b8e03a',size:18});voice(160,.3,.07,'sawtooth',{slide:.3});}}
  scores[player]=st.score;s.setScores(scores);}

 function step(dt){st.t+=dt;st.fuel=Math.min(100,st.fuel+18*dt);st.red=Math.max(0,st.red-dt*1.5);if(st.flame){st.flame.t-=dt;if(st.flame.t<=0)st.flame=null;}
  while(st.next<plan.length&&plan[st.next].at<=st.t){const p=plan[st.next++];st.ents.push({...p,d:1.02,dead:0,age:0});}
  for(const e of st.ents){if(e.dead)continue;e.age+=dt;
   if(e.kind==='cat'){e.a+=Math.sin(e.age*.9+e.wig)*.5*dt;e.d+=(e.d>.55?-1:1)*.05*dt+Math.sin(e.age*1.3)*.04*dt;if(e.age>12)e.d+=.15*dt;if(e.d>1.05)e.dead=2;}
   else{const sp=e.kind==='hugger'?e.spd*1.7:e.spd,stall=Math.sin(e.age*1.7+e.wig)>.75?.2:1;e.d-=sp*stall*dt;e.a+=Math.sin(e.age*2+e.wig)*.35*dt;
    if(e.d<.07){e.dead=3;st.lives--;st.red=1;shake.kick(16);noise(.5,.2,{f0:900,f1:100});vibrate([60,40,80]);s.react(player,'sad');fx.pop(L.cx,L.cy-L.R*.3,st.lives>0?'GRABBED!':'GAME OVER, MAN!',{color:'#ff4a3a',size:26,life:1.4});}}}
  st.ents=st.ents.filter(e=>!e.dead||(e.dead===1&&false));
  const near=Math.min(1,...st.ents.filter(e=>e.kind!=='cat').map(e=>e.d)),interval=.35+near*1.05;st.ping+=dt;st.sweep+=dt;
  if(st.ping>=interval){st.ping=0;st.sweep=0;voice(1700-near*700,.09,.05,'sine');for(const e of st.ents)st.ghosts.push({a:e.a,d:e.d,kind:e.kind,life:interval*1.15,max:interval*1.15});}
  for(const g of st.ghosts)g.life-=dt;st.ghosts=st.ghosts.filter(g=>g.life>0);
  if(st.t>=DUR||st.lives<=0)endTurn();}

 function draw(){const {W,H,R,cx,cy}=L;x.save();shake.apply(x);
  x.fillStyle='#030806';x.fillRect(-20,-20,W+40,H+40);
  // deck plan
  x.strokeStyle='#1d3a2a';x.lineWidth=2;for(let k=-3;k<=3;k++){x.beginPath();x.moveTo(cx+k*R*.3,cy-R*1.1);x.lineTo(cx+k*R*.3,cy+R*1.1);x.stroke();x.beginPath();x.moveTo(cx-R*1.1,cy+k*R*.3);x.lineTo(cx+R*1.1,cy+k*R*.3);x.stroke();}
  // tracker face
  const g=x.createRadialGradient(cx,cy,0,cx,cy,R);g.addColorStop(0,'#0e2a1a');g.addColorStop(1,'#06140c');x.fillStyle=g;x.beginPath();x.arc(cx,cy,R,0,7);x.fill();
  x.strokeStyle='#3fae6a55';x.lineWidth=1.5;for(const f of [.25,.5,.75,1]){x.beginPath();x.arc(cx,cy,R*f,0,7);x.stroke();}x.beginPath();x.moveTo(cx-R,cy);x.lineTo(cx+R,cy);x.moveTo(cx,cy-R);x.lineTo(cx,cy+R);x.stroke();
  x.strokeStyle='#3fae6a22';x.setLineDash([3,5]);x.beginPath();x.arc(cx,cy,R*RANGE,0,7);x.stroke();x.setLineDash([]);
  // ping wave
  const pw=clamp(st.sweep/.6,0,1);x.strokeStyle=`rgba(120,255,170,${(1-pw)*.6})`;x.lineWidth=3;x.beginPath();x.arc(cx,cy,R*pw,0,7);x.stroke();
  // blips (ghosts from last ping)
  for(const b of st.ghosts){const a=b.life/b.max,p={x:cx+Math.cos(b.a)*b.d*R,y:cy+Math.sin(b.a)*b.d*R},rad=b.kind==='hugger'?R*.035:b.kind==='cat'?R*.03:R*.05;
   const gg=x.createRadialGradient(p.x,p.y,0,p.x,p.y,rad*2.2);gg.addColorStop(0,b.kind==='cat'?`rgba(140,200,255,${a})`:`rgba(170,255,190,${a})`);gg.addColorStop(1,'rgba(120,255,170,0)');x.fillStyle=gg;x.beginPath();x.arc(p.x,p.y,rad*2.2,0,7);x.fill();}
  // close things are visible in the flashlight
  for(const e of st.ents){if(e.d>.22)continue;const p=polar(e),sz=R*(e.kind==='alien'?.11:.07);x.font=`${sz}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.globalAlpha=clamp((.22-e.d)/.1,0,1);x.fillText(e.kind==='cat'?'🐈':e.kind==='hugger'?'🦂':'👾',p.x,p.y);x.globalAlpha=1;}
  // flame
  if(st.flame){const f=st.flame,a=f.t/.28;x.save();x.translate(cx,cy);x.rotate(f.a);const fg=x.createLinearGradient(0,0,R*RANGE,0);fg.addColorStop(0,`rgba(255,240,160,${a})`);fg.addColorStop(.5,`rgba(255,140,30,${a*.8})`);fg.addColorStop(1,'rgba(255,60,0,0)');x.fillStyle=fg;x.beginPath();x.moveTo(0,0);x.arc(0,0,R*RANGE,-CONE,CONE);x.closePath();x.fill();x.restore();}
  // you
  s.sprite(x,player,cx,cy,clamp(R*.34,52,110),{exact:true,mood:st.red>0?'sad':undefined});
  if(st.red>0){x.fillStyle=`rgba(200,0,0,${st.red*.35})`;x.fillRect(0,0,W,H);}
  // HUD
  const fs=clamp(W*.035,11,18);label(x,'WEYLAND-YUTANI M314 MOTION TRACKER',W/2,fs*1.1,fs*.75,{fill:'#6fdc95',font:'monospace'});
  label(x,`${s.players[player].name} · ${st.score}`,14,fs*2.6,fs*1.15,{align:'left',fill:player?'#ff9fc6':'#78b6ff'});label(x,'❤'.repeat(Math.max(0,st.lives))+'♡'.repeat(3-Math.max(0,st.lives)),W-14,fs*2.6,fs*1.15,{align:'right',fill:'#ff6b6b'});
  label(x,`⏱ ${Math.ceil(Math.max(0,DUR-st.t))}`,W/2,fs*2.6,fs*1.15,{fill:'#fff'});
  const fw=clamp(W*.5,120,320),fx0=(W-fw)/2,fy=cy+R+fs*1.2;x.fillStyle='#0008';rr(x,fx0,fy,fw,fs*.8,5);x.fill();x.fillStyle=st.fuel<22?'#a33':'#ff8a3a';rr(x,fx0,fy,fw*st.fuel/100,fs*.8,5);x.fill();label(x,'FLAMETHROWER',W/2,fy+fs*1.7,fs*.7,{fill:'#ffb07a'});
  fx.draw(x);x.restore();}

 async function endTurn(){if(ending)return;ending=true;st.score+=Math.max(0,st.lives)*10;scores[player]=st.score;s.setScores(scores);sfx.ding(880);
  if(player===0){player=1;await begin(`${s.players[0].name}: ${st.kills} kills, ${Math.max(0,st.lives)} lives left, ${scores[0]} points.`);}
  else{await s.wait(500);s.finish([...scores],scores[0]===scores[1]?`Motion Tracker ties ${scores[0]}–${scores[1]}.`:`${s.players[scores[0]>scores[1]?0:1].name} survives the Nostromo ${Math.max(...scores)}–${Math.min(...scores)}.`);}}
 async function begin(summary){reset();layout();draw();if(!await s.pass(player,'You’re alone on the deck with a motion tracker. Blips only show on each PING, and the pings speed up as they close in. Tap toward a blip to fire the flamethrower that way (it has a short reach and limited fuel). Don’t torch Jonesy the cat. Same attack for both of you.','Ready — 45 seconds',{countdown:3,summary}))return;ending=false;}
 s.hint('Tap anywhere: the flamethrower fires from the centre toward your tap, out to the dashed ring. Blips appear on each ping; faster pings mean something is close. Xenomorph +10, facehugger +15, Jonesy the cat −10. Anything that reaches the centre takes a life. Each life left is +10 at the end. Keys: arrows/WASD fire in four directions.');
 s.frame(dt=>{if(!st)return;layout();if(!ending)step(dt);fx.step(dt);shake.step(dt);draw();s.status(`${s.players[player].name} · ${st.score} · tap toward blips to burn them`);});
 await begin(null);
}
Object.assign(exports,{sonargrid});
