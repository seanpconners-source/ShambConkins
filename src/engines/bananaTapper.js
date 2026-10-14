// Money in the Banana Stand, rebuilt as Tapper (Bally Midway, 1983) at Bluth's Original Frozen Banana stand on the
// boardwalk. Four counters; customers (wearing your rival's head) shuffle toward you. Tap a counter to slide a frozen
// banana down it: a customer who catches one is shoved back (out the door = +50), eats, then flings the stick back,
// which you must catch at the end of that counter (+100). A banana that reaches the empty end, a stick that hits the
// floor, or a customer who reaches you costs a life. Tap loose cash on the counters: there's always money in the
// banana stand. Turn-based, 60 seconds and three lives each.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,makeShake,label,SANS,rr}=require("src/engines/tarantinoKit.js");
const {makeBits,pixText,turnRunner}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

const ROWS=4,END=1,DOOR=0;
async function moneygrab(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const shake=makeShake();let cur=null,geo=null;
 function layout(){const W=s.W,H=s.H,top=Math.max(64,H*.16),bottom=H-14,rowH=(bottom-top)/ROWS;const q=Math.min(rowH,W*.2);return {W,H,top,rowH:q,band:rowH,x0:W*.1,x1:W*.8,bx:W*.88,rowY:r=>top+rowH*(r+.62)};}
 const ux=u=>geo.x0+(geo.x1-geo.x0)*u;
 function make(){return {rand:seededRandom(s.seed+':tapper'),row:1,cd:0,lives:3,score:0,cust:[],nanas:[],sticks:[],cash:[],spawnT:.6,cashT:6,pause:0,bits:makeBits(),pops:[],flash:0,bob:0};}
 function lose(w,text,r){w.lives--;w.pause=1.4;w.flash=.6;w.pops.push({x:geo?geo.W/2:200,y:geo?geo.rowY(r):100,text,t:1.6,c:'#ff4a4a'});noise(.5,.1,{f0:900,f1:100});voice(150,.4,.07,'sawtooth',{slide:.5,lp:700});shake.kick(8);vibrate(40);s.react?.(w.player,'sad',1.4);w.cust=[];w.nanas=[];w.sticks=[];}
 function serve(w,r){if(w.pause>0||w.ending)return;w.row=r;if(w.cd>0)return;w.cd=.2;w.nanas.push({row:r,u:.97});voice(520,.05,.04,'square');noise(.08,.03,{type:'highpass',f0:3000});}
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur||!geo)return;ev.preventDefault();const p=s.pointer(ev);
  for(const m of cur.cash){const X=ux(m.u),Y=geo.rowY(m.row)-geo.rowH*.32;if(Math.abs(p.x-X)<geo.rowH*.4&&Math.abs(p.y-Y)<geo.rowH*.3){m.got=true;cur.score+=150;cur.pops.push({x:X,y:Y,text:'+150',t:1,c:'#7dff6a'});[988,1319].forEach((f,k)=>voice(f,.07,.05,'square',{delay:k*.06}));s.react?.(cur.player,'win',1);return;}}
  const r=clamp(Math.floor((p.y-geo.top)/geo.band),0,ROWS-1);serve(cur,r);});
 s.on(document,'keydown',ev=>{if(!cur||s.paused)return;const k=ev.key;if(k==='ArrowUp'||k==='w'){cur.row=Math.max(0,cur.row-1);}else if(k==='ArrowDown'||k==='s'){cur.row=Math.min(ROWS-1,cur.row+1);}else if(k===' '||k==='Enter')serve(cur,cur.row);else return;ev.preventDefault();});
 s.hint('Tap a counter to jump there and slide a frozen banana down it. Shove customers out the door, then be on their counter to catch the stick they throw back. Don\'t serve an empty counter, drop a stick, or let anyone reach you. Tap loose cash for +150. Keys: ↑/↓ + Space.');
 function step(w,dt){
  if(!geo)geo=layout();
  w.bits.step(dt);shake.step(dt);w.flash=Math.max(0,w.flash-dt*2);w.cd=Math.max(0,w.cd-dt);w.bob+=dt;for(const p of w.pops)p.t-=dt;w.pops=w.pops.filter(p=>p.t>0);
  if(w.pause>0){w.pause-=dt;return;}if(w.ending)return;
  const lvl=1+w.time/22;
  w.spawnT-=dt;if(w.spawnT<=0){w.spawnT=clamp(2.1/lvl,.7,2.1)*(.6+w.rand()*.8);const r=Math.floor(w.rand()*ROWS);if(w.cust.filter(cu=>cu.row===r).length<3)w.cust.push({row:r,u:-.04,state:'walk',hop:w.rand()*.6,timer:0,tint:Math.floor(w.rand()*4)});}
  w.cashT-=dt;if(w.cashT<=0){w.cashT=7+w.rand()*5;w.cash.push({row:Math.floor(w.rand()*ROWS),u:.2+w.rand()*.55,t:4});}
  for(const m of w.cash)m.t-=dt;w.cash=w.cash.filter(m=>m.t>0&&!m.got);
  for(const cu of w.cust){cu.timer-=dt;
   if(cu.state==='walk'){cu.hop-=dt;if(cu.hop<=0){cu.hop=clamp(.9/lvl,.38,.9);cu.target=cu.u+.055;}if(cu.target!==undefined&&cu.u<cu.target)cu.u=Math.min(cu.target,cu.u+dt*.35);
    if(cu.u>=.93){lose(w,'TOO SLOW!',cu.row);return;}}
   else if(cu.state==='push'){cu.u-=dt*.75;if(cu.u<-.05){cu.gone=true;w.score+=50;w.pops.push({x:ux(0),y:geo.rowY(cu.row)-20,text:'+50',t:.8,c:'#ffd23f'});}else if(cu.timer<=0){cu.state='eat';cu.timer=1.1;}}
   else if(cu.state==='eat'&&cu.timer<=0){cu.state='walk';cu.hop=.6;cu.target=undefined;w.sticks.push({row:cu.row,u:cu.u+.03});voice(330,.05,.03,'square');}}
  w.cust=w.cust.filter(cu=>!cu.gone);
  for(const n of w.nanas){n.u-=dt*1.05;const hit=w.cust.filter(cu=>cu.row===n.row&&cu.state==='walk'&&cu.u<n.u+.01&&cu.u>n.u-.06).sort((a,b)=>b.u-a.u)[0];
   if(hit){n.dead=true;hit.state='push';hit.timer=.45;hit.target=undefined;voice(880,.05,.04,'triangle');w.bits.burst(ux(n.u),geo.rowY(n.row)-geo.rowH*.25,{n:6,speed:40,color:'#ffe14a',life:.3,size:2});}
   else if(n.u<=DOOR-.02){lose(w,'WASTED BANANA!',n.row);return;}}
  w.nanas=w.nanas.filter(n=>!n.dead);
  for(const st of w.sticks){st.u+=dt*.55;if(st.u>=END){if(w.row===st.row){st.dead=true;w.score+=100;w.pops.push({x:ux(1),y:geo.rowY(st.row)-24,text:'+100',t:.8,c:'#ffd23f'});voice(1175,.06,.05,'square');}else{lose(w,'DROPPED IT!',st.row);return;}}}
  w.sticks=w.sticks.filter(st=>!st.dead);
 }
 function banana(X,Y,s1,up){x.save();x.translate(X,Y);x.rotate(up?-Math.PI/2:0);x.fillStyle='#8a5a2a';x.fillRect(s1*.45,-s1*.05,s1*.4,s1*.1);x.fillStyle='#ffe14a';x.beginPath();x.ellipse(0,0,s1*.5,s1*.16,0,0,Math.PI*2);x.fill();x.fillStyle='#5a2e14';x.beginPath();x.ellipse(-s1*.18,0,s1*.33,s1*.17,0,0,Math.PI*2);x.fill();x.restore();}
 function draw(w){
  geo=layout();const {W,H,top,rowH,x0,x1,bx}=geo;
  x.setTransform(1,0,0,1,0,0);const sky=x.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#5ec8ff');sky.addColorStop(.5,'#a6e4ff');sky.addColorStop(1,'#ffe1b0');x.fillStyle=sky;x.fillRect(0,0,W,H);
  if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  // ocean + pier
  x.fillStyle='#2f8fd0';x.fillRect(0,top*.55,W,top*.45);x.fillStyle='#ffffff55';for(let k=0;k<12;k++)x.fillRect(((k*97+w.bob*20)%W),top*.62+(k%3)*6,22,2);
  x.fillStyle='#c79a63';x.fillRect(0,top,W,H-top);for(let k=0;k<W;k+=26){x.fillStyle='#b58a55';x.fillRect(k,top,2,H-top);}
  // awning (blue/white stripes) + sign
  for(let k=0;k*28<W;k++){x.fillStyle=k%2?'#ffffff':'#2f6fd8';x.beginPath();x.moveTo(k*28,0);x.lineTo(k*28+28,0);x.lineTo(k*28+28,top*.42);x.arc(k*28+14,top*.42,14,0,Math.PI);x.closePath();x.fill();}
  label(x,W<560?"BLUTH'S BANANAS":"BLUTH'S ORIGINAL FROZEN BANANA",W*.4,top*.24,clamp(W*.035,11,22),{fill:'#ffe14a',stroke:'#7a3a10'});
  // counters
  for(let r=0;r<ROWS;r++){const y=geo.rowY(r);x.fillStyle='#6b3a1c';rr(x,x0-10,y-rowH*.08,x1-x0+30,rowH*.2,6);x.fill();x.fillStyle='#8b4c24';x.fillRect(x0-10,y-rowH*.08,x1-x0+30,rowH*.06);
   x.fillStyle='#2f6fd8';x.fillRect(x0-26,y-rowH*.5,14,rowH*.62);x.fillStyle='#ffe14a';x.fillRect(x0-24,y-rowH*.46,10,6);}
  // cash
  for(const m of w.cash){const X=ux(m.u),Y=geo.rowY(m.row)-rowH*.32;x.globalAlpha=m.t<1&&Math.floor(m.t*10)%2?.4:1;x.fillStyle='#4caf50';rr(x,X-rowH*.28,Y-rowH*.12,rowH*.56,rowH*.24,3);x.fill();label(x,'$',X,Y+1,rowH*.2,{fill:'#e8ffe0',stroke:null});x.globalAlpha=1;}
  // customers wear the rival's head
  const rival=1-w.player,tints=['#e85a5a','#5a8ae8','#e8a85a','#8ae85a'];
  for(const cu of w.cust){const X=ux(cu.u),Y=geo.rowY(cu.row),hs=rowH*.62,jump=cu.state==='walk'&&cu.target!==undefined&&cu.u<cu.target?-rowH*.06:0;
   x.fillStyle=tints[cu.tint];rr(x,X-hs*.3,Y-rowH*.42+jump,hs*.6,rowH*.36,6);x.fill();s.sprite(x,rival,X,Y-rowH*.55+jump,hs,{exact:true,mood:cu.state==='push'?'sad':cu.state==='eat'?'happy':'normal'});
   if(cu.state==='eat')banana(X+hs*.25,Y-rowH*.4,rowH*.36,true);}
  for(const n of w.nanas)banana(ux(n.u),geo.rowY(n.row)-rowH*.14,rowH*.42,false);
  for(const st of w.sticks){x.fillStyle='#8a5a2a';x.fillRect(ux(st.u)-rowH*.12,geo.rowY(st.row)-rowH*.15,rowH*.24,rowH*.05);}
  // you, behind the counter end
  const by=geo.rowY(w.row);x.fillStyle='#ffffff';rr(x,bx-rowH*.24,by-rowH*.4,rowH*.48,rowH*.44,8);x.fill();x.fillStyle='#2f6fd8';x.fillRect(bx-rowH*.24,by-rowH*.26,rowH*.48,rowH*.06);
  s.sprite(x,w.player,bx,by-rowH*.62,rowH*.7,{exact:true});
  w.bits.draw(x);
  for(const p of w.pops)label(x,p.text,p.x,p.y-(1.6-p.t)*16,Math.max(14,rowH*.22),{fill:p.c,alpha:clamp(p.t*2,0,1)});
  // HUD
  x.setTransform(1,0,0,1,0,0);if(w.flash>0){x.fillStyle=`rgba(255,0,0,${w.flash*.25})`;x.fillRect(0,0,W,H);}
  const fs=Math.max(13,Math.min(W,H)*.03);label(x,`$${w.score}`,12,top*.24+fs*1.6,fs*1.2,{fill:'#fff',stroke:'#1a3a6a',align:'left'});
  for(let i=0;i<w.lives;i++)banana(22+i*fs*1.8,top*.24+fs*3.2,fs*1.5,false);
  const left=Math.max(0,Math.ceil(w.cap-w.time));label(x,String(left),W-140,top*.24+fs*1.6,fs*1.1,{fill:left<=10?'#ff4a4a':'#fff',stroke:'#1a3a6a'});
  if(w.player===1)label(x,`beat $${w.scores[0]}`,W-140,top*.24+fs*3,fs*.7,{fill:'#fff',stroke:'#1a3a6a'});
  if(w.ending)label(x,w.endReason==='time'?'CLOSING TIME!':'STAND CLOSED',W/2,H/2,clamp(W*.07,22,48),{fill:'#ffe14a',stroke:'#7a3a10'});
  s.debug={engine:'moneygrab',world:w};
 }
 const scores=await turnRunner(s,{seconds:60,
  intro:(i,sc)=>i===0?`Tapper at Bluth's Banana Stand. ${s.players[0].name} works the stand first, and every customer is wearing ${s.players[1].name}'s face. Tap a counter to slide a frozen banana down it, catch the sticks they throw back, grab loose cash. Three lives, 60 seconds.`:`${s.players[1].name}, your shift (the customers look like ${s.players[0].name} now). Beat $${sc[0]}.`,
  make:()=>{cur=make();return cur;},step,draw,done:w=>w.lives<=0&&w.pause<=0,score:w=>w.score});
 if(!scores)return;
 s.finish(scores,`Banana Stand Tapper · $${scores[0]} vs $${scores[1]}`);
}
Object.assign(exports,{moneygrab});
