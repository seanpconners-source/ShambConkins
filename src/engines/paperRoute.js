// Paperboy · Paper Route. Pass-and-play, same seeded street for both. Ride up the block, steer with a drag,
// TAP where you want the paper to land: mailbox = 10, doorstep = 5. Bright houses subscribe. Breaking a
// subscriber's window costs 5, but smashing a dark (non-subscriber) house's window is +3, just like the arcade.
const {clamp,seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {touchTrack}=require("src/engines/duelControls.js");
const {label,rr,makeFx,makeShake,sfx,voice,noise}=require("src/engines/tarantinoKit.js");
const DUR=45,GAP=30,ROOFS=['#d9534f','#4f8fd9','#e0a43a','#5fb760','#b05fd9','#e07a3a'];

function buildStreet(seed){const r=seededRandom(seed+':paper'),houses=[],obs=[];
 for(let k=0;k<70;k++){const side=k%2,y=60+k*GAP*.5+r()*6;houses.push({k,side,y,sub:r()<.6,roof:ROOFS[Math.floor(r()*ROOFS.length)],done:0,broke:0});}
 for(let y=90;y<2400;y+=24+r()*30){const t=r();
  if(t<.3)obs.push({kind:'car',x:r()<.5?40:60,y,vy:-14-r()*10});
  else if(t<.5)obs.push({kind:'dog',x:r()<.5?28:72,y,vx:0,chase:0});
  else if(t<.7)obs.push({kind:'can',x:r()<.5?29:71,y});
  else if(t<.85)obs.push({kind:'hole',x:36+r()*28,y});
  else obs.push({kind:'bundle',x:36+r()*28,y});}
 return {houses,obs};}

async function paperboy(s){
 const [c,x]=s.canvas(680,760,{fill:true});s.body.classList.add('drag-arena-body');
 const fx=makeFx(),shake=makeShake(),scores=[0,0];let player=0,st=null,ending=false;
 s.debug={engine:'paperboy',get st(){return st;},scores};
 const L={};function layout(){const W=s.W,H=s.H,k=Math.min(W/100,H/118);Object.assign(L,{W,H,k,ox:(W-100*k)/2});}
 const sx=wx=>L.ox+wx*L.k,sy=wy=>L.H-(wy-st.cam)*L.k;
 const wxOf=px=>(px-L.ox)/L.k,wyOf=py=>(L.H-py)/L.k+st.cam;

 function reset(){const street=buildStreet(s.seed);st={...street,bike:{x:50,y:20,stun:0,lean:0},papers:12,score:0,t:0,cam:0,speed:24,flying:[],delivered:0,smashed:0,crashes:0,msg:'',msgT:0,kx:0};}

 const track=touchTrack(s,{
  down:f=>{if(!st)return;f.bx=st.bike.x;},
  move:f=>{if(!st||st.bike.stun>0)return;if(f.moved>14)st.bike.x=clamp(f.bx+f.dx/L.k*1.1,25,75);},
  up:(f,{tap})=>{if(st&&tap)throwAt(wxOf(f.x),wyOf(f.y));}
 });void track;
 s.on(document,'keydown',ev=>{if(!st||s.paused)return;const k=ev.key.toLowerCase();if(k==='arrowleft'||k==='a')st.kx=-1;else if(k==='arrowright'||k==='d')st.kx=1;else if(k===' '||k==='enter'){ev.preventDefault();const h=st.houses.find(h=>h.sub&&!h.done&&h.y>st.bike.y+8);if(h)throwAt(h.side?73:27,h.y);}});
 s.on(document,'keyup',ev=>{if(!st)return;const k=ev.key.toLowerCase();if(['arrowleft','arrowright','a','d'].includes(k))st.kx=0;});

 function throwAt(tx,ty){if(ending||s.paused||st.bike.stun>0)return;if(st.papers<=0){say('OUT OF PAPERS',.8);sfx.buzz();return;}
  const b=st.bike;ty=Math.max(ty,b.y+4);const d=Math.hypot(tx-b.x,ty-b.y),max=46;if(d>max){tx=b.x+(tx-b.x)/d*max;ty=b.y+(ty-b.y)/d*max;}
  st.papers--;st.flying.push({x0:b.x,y0:b.y,x1:tx,y1:ty,t:0,dur:.28+Math.min(1,d/max)*.18});sfx.whoosh(600,1800,.05,.12);}
 function say(m,t=1.1){st.msg=m;st.msgT=t;}
 function land(p){const {x1:wx,y1:wy}=p;
  for(const h of st.houses){if(Math.abs(h.y-wy)>14)continue;const left=!h.side,mbx=left?27:73,mby=h.y,hx0=left?2:78,hx1=left?22:98;
   if(Math.hypot(wx-mbx,wy-mby)<4.2){if(h.sub&&!h.done){h.done=2;gain(10,'MAILBOX! +10',wx,wy,'#ffd23f');sfx.ding(1320);}else if(!h.sub){gain(0,'Not a subscriber',wx,wy,'#ccc');}else gain(0,'Already delivered',wx,wy,'#ccc');return;}
   if(wx>hx0&&wx<hx1&&wy>h.y-4&&wy<h.y+12){ // house body: windows are on the upper half
    if(wy>h.y+4){if(h.broke){gain(0,'',wx,wy);return;}h.broke=1;noise(.25,.14,{type:'highpass',f0:2500});shake.kick(5);fx.spark(sx(wx),sy(wy),16,'#cfefff',260);
     if(h.sub){gain(-5,'SUBSCRIBER WINDOW −5',wx,wy,'#ff6b6b');h.done=h.done||-1;}else{gain(3,'SMASH! +3',wx,wy,'#9dff5c');st.smashed++;}return;}
    if(h.sub&&!h.done){h.done=1;gain(5,'DOORSTEP +5',wx,wy,'#fff');sfx.coin();}else gain(0,h.sub?'Already delivered':'Wasted paper',wx,wy,'#ccc');return;}
  }
  fx.pop(sx(wx),sy(wy),'miss',{color:'#ddd',size:14});}
 function gain(n,text,wx,wy,color){st.score=Math.max(0,st.score+n);if(/^(MAILBOX|DOORSTEP)/.test(text))st.delivered++;scores[player]=st.score;s.setScores(scores);if(text)fx.pop(sx(wx),sy(wy)-10,text,{color,size:16});}

 function crash(o){const b=st.bike;if(b.stun>0)return;b.stun=1.3;st.crashes++;const lost=Math.min(2,st.papers);st.papers-=lost;shake.kick(12);noise(.3,.16,{f0:900,f1:150});vibrate(50);s.react(player,'sad');say(o.kind==='dog'?'BITTEN! −'+lost+' papers':'WIPEOUT! −'+lost+' papers');}

 function step(dt){const b=st.bike;st.t+=dt;st.speed=24+st.t*.45;st.msgT-=dt;
  if(b.stun>0)b.stun-=dt;else{b.y+=st.speed*dt;if(st.kx)b.x=clamp(b.x+st.kx*45*dt,25,75);}
  st.cam=b.y-20;
  for(const p of st.flying){p.t+=dt;if(p.t>=p.dur&&!p.done){p.done=1;land(p);}}st.flying=st.flying.filter(p=>!p.done);
  for(const o of st.obs){if(o.y<st.cam-20||o.y>st.cam+150)continue;
   if(o.kind==='car')o.y+=o.vy*dt;
   if(o.kind==='dog'&&Math.abs(o.y-b.y)<30){o.x+=clamp(b.x-o.x,-1,1)*22*dt;o.y+=(st.speed*.75)*dt*(o.y<b.y?1.1:.6);}
   if(o.hit)continue;const r=o.kind==='car'?6:o.kind==='hole'?3.5:4;
   if(Math.abs(o.x-b.x)<r+2&&Math.abs(o.y-b.y)<r+3){if(o.kind==='bundle'){o.hit=1;st.papers+=5;say('+5 PAPERS');sfx.coin();}else{o.hit=1;crash(o);}}}
  if(st.t>=DUR)endTurn();
 }

 function drawHouse(h){const left=!h.side,x0=sx(left?2:78),w=20*L.k,y=sy(h.y+12),hh=16*L.k,sub=h.sub;
  x.fillStyle=sub?'#4f9a48':'#3a4a38';x.fillRect(sx(left?0:76),sy(h.y+14),24*L.k,18*L.k);
  x.fillStyle=sub?'#f3e6c8':'#6b6f75';x.fillRect(x0,y,w,hh);
  x.fillStyle=sub?h.roof:'#3b3f45';x.beginPath();x.moveTo(x0-2*L.k,y);x.lineTo(x0+w/2,y-6*L.k);x.lineTo(x0+w+2*L.k,y);x.closePath();x.fill();
  for(const wx of [.18,.62]){x.fillStyle=h.broke?'#1b1b1b':sub?'#9fd8ff':'#2a3340';x.fillRect(x0+w*wx,y+hh*.12,w*.22,hh*.32);if(h.broke){x.strokeStyle='#cfefff';x.lineWidth=1;x.beginPath();x.moveTo(x0+w*wx,y+hh*.12);x.lineTo(x0+w*(wx+.22),y+hh*.44);x.moveTo(x0+w*(wx+.22),y+hh*.12);x.lineTo(x0+w*wx,y+hh*.44);x.stroke();}}
  x.fillStyle=sub?'#8a5a2a':'#2a2a2a';x.fillRect(x0+w*.42,y+hh*.55,w*.16,hh*.45);
  x.fillStyle='#d8c8a0';x.fillRect(left?x0+w*.3:x0+w*.3,y+hh,w*.4,2*L.k);
  // mailbox
  const mx=sx(left?27:73),my=sy(h.y);x.fillStyle='#5a4a3a';x.fillRect(mx-1,my,2,3*L.k);x.fillStyle=sub?'#2a6fd6':'#555';rr(x,mx-2.4*L.k,my-2*L.k,4.8*L.k,3*L.k,1.2*L.k);x.fill();
  if(sub&&!h.done){x.fillStyle='#e23';x.fillRect(mx+2.2*L.k,my-3.4*L.k,1*L.k,2.4*L.k);}
  if(h.done>0)label(x,'✓',x0+w/2,y-8*L.k,3.6*L.k,{fill:'#9dff5c'});}
 function drawObs(o){if(o.hit&&o.kind!=='car'&&o.kind!=='dog')return;const px=sx(o.x),py=sy(o.y),k=L.k;
  if(o.kind==='car'){x.fillStyle='#c33';rr(x,px-4.5*k,py-7*k,9*k,14*k,2*k);x.fill();x.fillStyle='#9cd';x.fillRect(px-3.5*k,py+2*k,7*k,3*k);x.fillStyle='#ff8';x.fillRect(px-4*k,py+6*k,2*k,1*k);x.fillRect(px+2*k,py+6*k,2*k,1*k);}
  else if(o.kind==='dog'){x.font=`${7*k}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillText('🐕',px,py);}
  else if(o.kind==='can'){x.fillStyle='#777';rr(x,px-2.5*k,py-3*k,5*k,6*k,1*k);x.fill();x.fillStyle='#999';x.fillRect(px-3*k,py-3.5*k,6*k,1.2*k);}
  else if(o.kind==='hole'){x.fillStyle='#1a1a1a';x.beginPath();x.ellipse(px,py,3.5*k,2.2*k,0,0,7);x.fill();}
  else{x.fillStyle='#f4f0e6';rr(x,px-3*k,py-2*k,6*k,4*k,1*k);x.fill();x.strokeStyle='#c33';x.lineWidth=1.5;x.beginPath();x.moveTo(px,py-2*k);x.lineTo(px,py+2*k);x.stroke();}}

 function draw(){const W=L.W,H=L.H,k=L.k;x.save();shake.apply(x);
  x.fillStyle='#1a2418';x.fillRect(-20,-20,W+40,H+40);
  x.fillStyle='#5a9a4a';x.fillRect(sx(0),0,24*k,H);x.fillRect(sx(76),0,24*k,H);
  x.fillStyle='#c9c4b8';x.fillRect(sx(24),0,8*k,H);x.fillRect(sx(68),0,8*k,H);
  x.fillStyle='#4a4a50';x.fillRect(sx(32),0,36*k,H);
  x.fillStyle='#e8d36a';const off=(st.cam*k)%(16*k);for(let yy=-16*k;yy<H+16*k;yy+=16*k)x.fillRect(sx(49.4),yy+off,1.2*k,8*k);
  for(const h of st.houses)if(h.y>st.cam-20&&h.y<st.cam+130)drawHouse(h);
  for(const o of st.obs)if(o.y>st.cam-20&&o.y<st.cam+130)drawObs(o);
  // bike + rider
  const b=st.bike,bx=sx(b.x),by=sy(b.y);x.save();x.translate(bx,by);if(b.stun>0)x.rotate(Math.sin(b.stun*20)*.5);
  x.fillStyle='#222';rr(x,-1.2*k,-6*k,2.4*k,12*k,1*k);x.fill();x.fillStyle='#d33';rr(x,-3*k,-2*k,6*k,5*k,1.5*k);x.fill();x.restore();
  s.sprite(x,player,bx,by-5*k,13*k,{exact:true,mood:b.stun>0?'sad':undefined});
  for(const p of st.flying){const u=p.t/p.dur,px=sx(p.x0+(p.x1-p.x0)*u),py=sy(p.y0+(p.y1-p.y0)*u),hgt=Math.sin(u*Math.PI)*6*k;x.fillStyle='#0004';x.beginPath();x.ellipse(px,py,2*k,1*k,0,0,7);x.fill();x.save();x.translate(px,py-hgt);x.rotate(u*12);x.fillStyle='#f4f0e6';x.fillRect(-2*k,-1*k,4*k,2*k);x.restore();}
  fx.draw(x);
  // HUD
  const fs=clamp(k*4.2,12,22);x.fillStyle='#000a';rr(x,sx(1),8,98*k,fs*2.3,8);x.fill();
  label(x,`${s.players[player].name} · ${st.score} pts`,sx(4),8+fs*.75,fs,{align:'left',fill:player?'#ff9fc6':'#78b6ff'});
  label(x,`📰 ${st.papers}   ⏱ ${Math.ceil(Math.max(0,DUR-st.t))}`,sx(96),8+fs*.75,fs,{align:'right',fill:'#fff'});
  label(x,`${st.delivered} delivered · ${st.smashed} smashed`,sx(4),8+fs*1.7,fs*.7,{align:'left',fill:'#ccc'});
  if(st.msgT>0)label(x,st.msg,W/2,H*.3,fs*1.2,{fill:'#ffd23f'});
  x.restore();}

 async function endTurn(){if(ending)return;ending=true;scores[player]=st.score;s.setScores(scores);sfx.ding(880);
  if(player===0){player=1;await begin(`${s.players[0].name} scored ${scores[0]}.`);}
  else{await s.wait(600);s.finish([...scores],scores[0]===scores[1]?`Paper Route ties ${scores[0]}–${scores[1]}.`:`${s.players[scores[0]>scores[1]?0:1].name} wins the route ${Math.max(...scores)}–${Math.min(...scores)}.`);}}
 async function begin(summary){reset();layout();draw();if(!await s.pass(player,'Ride the route. Drag to steer, TAP where the paper should land. Bright houses with blue mailboxes subscribe: mailbox +10, doorstep +5. Smash a dark house’s window for +3, but never a subscriber’s (−5). Dodge cars, dogs, cans and potholes; grab bundles for more papers.','Ready — ride',{countdown:3,summary}))return;ending=false;}
 s.hint('Drag to steer the bike. Tap where you want the paper to land (it flies to that spot, within reach). Mailbox +10, doorstep +5, dark house window +3, subscriber window −5. Crashes cost two papers. Keys: ←/→ steer, Space throws at the next mailbox.');
 s.frame(dt=>{if(!st)return;layout();if(!ending)step(dt);fx.step(dt);shake.step(dt);draw();s.status(`${s.players[player].name} · ${st.score} pts · tap to throw, drag to steer`);});
 await begin(null);
}
Object.assign(exports,{paperboy});
