// Paddy's Darts, rebuilt with a real bristle dartboard: twenty numbered sectors in the standard order, doubles and
// trebles rings, outer bull 25 and bullseye 50, on the wall of Paddy's Pub with a chalkboard score. Take turns, three
// rounds of three darts each. Hold a finger on the board to aim: the sight wobbles like a few beers in, so steady it
// and let go to throw (the dart lands where the wobbling sight is when you release). Highest total wins.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,makeShake,label,SANS,SERIF,rr}=require("src/engines/tarantinoKit.js");
const {turnRunner}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

const ORDER=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
// radii as fractions of the board's double-ring outer edge (regulation proportions)
const R={bull:.037,outer:.094,trebIn:.582,trebOut:.629,dblIn:.953,dbl:1};
function scoreAt(dx,dy){const r=Math.hypot(dx,dy);if(r<=R.bull)return {v:50,label:'BULLSEYE!'};if(r<=R.outer)return {v:25,label:'OUTER BULL'};if(r>R.dbl)return {v:0,label:'MISS'};
 let a=Math.atan2(dx,-dy)*180/Math.PI;a=(a+360+9)%360;const n=ORDER[Math.floor(a/18)];if(r>=R.dblIn)return {v:n*2,label:`DOUBLE ${n}`};if(r>=R.trebIn&&r<=R.trebOut)return {v:n*3,label:`TREBLE ${n}`};return {v:n,label:String(n)};}

async function darts(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const shake=makeShake();let cur=null,board=null,wall=null;const aim={id:null,x:0,y:0,active:false};
 function geo(){const W=s.W,H=s.H,portrait=H>W*1.05,rb=portrait?Math.min(W*.36,H*.27):Math.min(H*.3,W*.24),cx=portrait?W/2:W*.42,cy=portrait?H*.42:H*.54;return {W,H,portrait,rb,cx,cy};}
 function make(){return {round:0,dart:0,darts:[],score:0,rounds:[0,0,0],wob:0,seed:seededRandom(s.seed+':darts'),throwT:0,flying:null,last:null};}
 function throwDart(w){if(w.flying||w.dart>=3||w.round>=3)return;const g=geo();const wb=wobble(w,g);const tx=aim.x+wb.x,ty=aim.y+wb.y;w.flying={sx:g.cx+g.rb*.4,sy:g.H+40,tx,ty,t:0};noise(.15,.05,{type:'bandpass',f0:1800,f1:600});}
 function wobble(w,g){const t=w.time,amp=g.rb*(.035+.05*Math.min(1,(w.round*3+w.dart)/8));return {x:(Math.sin(t*2.3)+Math.sin(t*3.7+1.1)*.6)*amp,y:(Math.cos(t*1.9+.4)+Math.sin(t*4.3)*.5)*amp};}
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur)return;ev.preventDefault();const p=s.pointer(ev);aim.id=ev.pointerId;aim.x=p.x;aim.y=p.y-40;aim.active=true;s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(ev.pointerId!==aim.id)return;ev.preventDefault();const p=s.pointer(ev);aim.x=p.x;aim.y=p.y-40;});
 for(const ty of ['pointerup','pointercancel'])s.on(c,ty,ev=>{if(ev.pointerId!==aim.id)return;s.release(ev);aim.id=null;aim.active=false;if(ty==='pointerup'&&cur)throwDart(cur);});
 s.on(document,'keydown',ev=>{if(!cur)return;const g=geo();if(ev.key===' '||ev.key==='Enter'){ev.preventDefault();if(!aim.x){aim.x=g.cx;aim.y=g.cy;}throwDart(cur);}const d=g.rb*.05;if(ev.key==='ArrowLeft')aim.x-=d;if(ev.key==='ArrowRight')aim.x+=d;if(ev.key==='ArrowUp')aim.y-=d;if(ev.key==='ArrowDown')aim.y+=d;});
 s.hint('Hold a finger on the board to aim (the sight floats just above your finger) and let go to throw. The sight wobbles, more as the night goes on; the dart lands where the sight is when you release. Treble ring ×3, double ring ×2, outer bull 25, bullseye 50. Three rounds of three darts.');
 function step(w,dt){
  shake.step(dt);if(w.flying){const f=w.flying;f.t+=dt*3.2;if(f.t>=1){const g=geo();const r=scoreAt((f.tx-g.cx)/g.rb,(f.ty-g.cy)/g.rb);w.darts.push({x:(f.tx-g.cx)/g.rb,y:(f.ty-g.cy)/g.rb,v:r.v});w.score+=r.v;w.rounds[w.round]+=r.v;w.last={label:r.label,v:r.v,t:1.3};w.flying=null;w.dart++;
    voice(r.v?180:90,.06,.08,'square');noise(.05,.1,{f0:3000,f1:800});shake.kick(2);vibrate(12);if(r.v>=50||r.label.startsWith('TREBLE 20')){s.react?.(w.player,'win',1.2);[523,659,784].forEach((q,i)=>voice(q,.1,.05,'triangle',{delay:.1+i*.08}));}else if(!r.v)s.react?.(w.player,'sad',.8);
    if(w.dart>=3){w.pause=1.4;}}}
  if(w.pause>0){w.pause-=dt;if(w.pause<=0){w.round++;w.dart=0;w.darts=[];}}
  if(w.last){w.last.t-=dt;if(w.last.t<=0)w.last=null;}
 }
 function drawBoard(g){const {cx,cy,rb}=g;
  x.save();x.translate(cx,cy);x.fillStyle='#111';x.beginPath();x.arc(0,0,rb*1.28,0,Math.PI*2);x.fill();
  for(let i=0;i<20;i++){const a0=(-90-9+i*18)*Math.PI/180,a1=a0+18*Math.PI/180,dark=i%2===0;
   const ring=(r0,r1,col)=>{x.fillStyle=col;x.beginPath();x.arc(0,0,r1*rb,a0,a1);x.arc(0,0,r0*rb,a1,a0,true);x.closePath();x.fill();};
   ring(R.outer,R.trebIn,dark?'#1a1a1a':'#f1e6c8');ring(R.trebIn,R.trebOut,dark?'#c8202a':'#1f8a3a');ring(R.trebOut,R.dblIn,dark?'#1a1a1a':'#f1e6c8');ring(R.dblIn,R.dbl,dark?'#c8202a':'#1f8a3a');}
  x.fillStyle='#1f8a3a';x.beginPath();x.arc(0,0,R.outer*rb,0,Math.PI*2);x.fill();x.fillStyle='#c8202a';x.beginPath();x.arc(0,0,R.bull*rb,0,Math.PI*2);x.fill();
  x.strokeStyle='#c8c8c8';x.lineWidth=Math.max(.6,rb*.006);for(const r of [R.outer,R.trebIn,R.trebOut,R.dblIn,R.dbl]){x.beginPath();x.arc(0,0,r*rb,0,Math.PI*2);x.stroke();}
  for(let i=0;i<20;i++){const a=(-90-9+i*18)*Math.PI/180;x.beginPath();x.moveTo(Math.cos(a)*R.outer*rb,Math.sin(a)*R.outer*rb);x.lineTo(Math.cos(a)*rb,Math.sin(a)*rb);x.stroke();}
  x.fillStyle='#f4f4f4';x.font=`700 ${rb*.11}px ${SERIF}`;x.textAlign='center';x.textBaseline='middle';for(let i=0;i<20;i++){const a=(-90+i*18)*Math.PI/180;x.fillText(String(ORDER[i]),Math.cos(a)*rb*1.14,Math.sin(a)*rb*1.14);}
  x.restore();}
 function draw(w){
  const g=geo(),{W,H,cx,cy,rb}=g;x.setTransform(1,0,0,1,0,0);if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  // Paddy's Pub wall: dark wood panels, green trim, neon sign
  const wl=x.createLinearGradient(0,0,0,H);wl.addColorStop(0,'#3a2412');wl.addColorStop(1,'#1e120a');x.fillStyle=wl;x.fillRect(-10,-10,W+20,H+20);x.fillStyle='#00000030';for(let q=0;q<W;q+=Math.max(60,W/8))x.fillRect(q,0,3,H);
  x.fillStyle='#1f5a2a';x.fillRect(0,H*.88,W,H*.12);
  x.save();x.shadowColor='#4cff7a';x.shadowBlur=16;label(x,"PADDY'S",g.portrait?W/2:W*.42,Math.max(56,cy-rb*1.62),Math.max(18,rb*.18),{fill:'#7dff9a',stroke:null,font:`900 ${Math.max(18,rb*.18)}px ${SERIF}`});x.restore();
  drawBoard(g);
  // darts in the board
  for(const d of w.darts){const X=cx+d.x*rb,Y=cy+d.y*rb;x.strokeStyle='#c0c0c0';x.lineWidth=3;x.beginPath();x.moveTo(X,Y);x.lineTo(X+rb*.06,Y+rb*.12);x.stroke();x.fillStyle='#e8325a';x.beginPath();x.moveTo(X+rb*.06,Y+rb*.12);x.lineTo(X+rb*.11,Y+rb*.2);x.lineTo(X+rb*.02,Y+rb*.18);x.fill();x.fillStyle='#ffd23f';x.beginPath();x.arc(X,Y,2.4,0,Math.PI*2);x.fill();}
  if(w.flying){const f=w.flying,e=f.t*f.t*(3-2*f.t),X=f.sx+(f.tx-f.sx)*e,Y=f.sy+(f.ty-f.sy)*e-Math.sin(f.t*Math.PI)*rb*.4,sc=1.8-f.t;x.save();x.translate(X,Y);x.scale(sc,sc);x.strokeStyle='#c0c0c0';x.lineWidth=3;x.beginPath();x.moveTo(0,0);x.lineTo(rb*.05,rb*.12);x.stroke();x.fillStyle='#e8325a';x.fillRect(rb*.04,rb*.12,rb*.05,rb*.07);x.restore();}
  // sight
  if(aim.active&&!w.flying&&w.dart<3){const wb=wobble(w,g),X=aim.x+wb.x,Y=aim.y+wb.y;x.strokeStyle='#ffffffdd';x.lineWidth=2;x.beginPath();x.arc(X,Y,10,0,Math.PI*2);x.moveTo(X-16,Y);x.lineTo(X-4,Y);x.moveTo(X+4,Y);x.lineTo(X+16,Y);x.moveTo(X,Y-16);x.lineTo(X,Y-4);x.moveTo(X,Y+4);x.lineTo(X,Y+16);x.stroke();}
  // chalkboard
  const bw=g.portrait?W-24:Math.min(260,W*.3),bh=g.portrait?H*.2:Math.min(H*.62,300),bx=g.portrait?12:W-bw-16,by=g.portrait?H-bh-14:H*.18;x.fillStyle='#5a3a1a';rr(x,bx-6,by-6,bw+12,bh+12,8);x.fill();x.fillStyle='#1d2a22';rr(x,bx,by,bw,bh,6);x.fill();
  const ch=(t,X,Y,sz,col='#f4f4f0',al='left')=>{x.fillStyle=col;x.font=`700 ${sz}px "Comic Sans MS","Chalkboard SE",cursive`;x.textAlign=al;x.textBaseline='middle';x.fillText(t,X,Y);};
  const fs=g.portrait?Math.max(13,bh*.13):Math.max(13,bh*.075);ch(`${s.players[w.player].name}`,bx+12,by+fs,fs,'#ffd23f');s.sprite(x,w.player,bx+bw-fs*1.2,by+fs*1.1,fs*2,{exact:true});
  for(let r=0;r<3;r++)ch(`R${r+1}: ${r<w.round||r===w.round&&w.dart?w.rounds[r]:'-'}`,bx+12+(g.portrait?r*(bw/3.2):0),by+fs*(g.portrait?2.6:2.8+r*1.4),fs*.9);
  ch(`TOTAL ${w.score}`,bx+12,by+fs*(g.portrait?4.2:7.4),fs*1.1,'#7dff9a');if(w.player===1)ch(`beat ${w.scores[0]}`,bx+12,by+fs*(g.portrait?5.5:8.8),fs*.8,'#ffffffaa');
  ch(`darts: ${'➶'.repeat(Math.max(0,3-w.dart))}`,bx+12,by+fs*(g.portrait?5.5:10.2),fs*.85,'#e8e8e8')
  if(w.last)label(x,w.last.label,cx,cy+rb*1.4,Math.max(18,rb*.16),{fill:w.last.v>=50?'#ffd23f':w.last.v?'#fff':'#ff6a6a',alpha:clamp(w.last.t*2,0,1)});
  if(w.pause>0)label(x,`ROUND ${w.round+1}: ${w.rounds[w.round]}`,cx,cy,Math.max(20,rb*.18),{fill:'#ffd23f'});
  if(w.ending)label(x,`${w.score} POINTS`,cx,cy,Math.max(22,rb*.2),{fill:'#fff'});
  s.debug={engine:'darts',world:w,scoreAt,geo};
 }
 const scores=await turnRunner(s,{seconds:240,endDelay:1.4,
  intro:(i,sc)=>i===0?`Darts at Paddy's. ${s.players[0].name} throws first: hold a finger on the board to aim and let go to throw. Mind the wobble. Three rounds of three darts; trebles, doubles and the bull score big.`:`${s.players[1].name}, your throw. Beat ${sc[0]}.`,
  make:()=>{cur=make();aim.x=0;aim.y=0;return cur;},step,draw,done:w=>w.round>=3,soloTarget:r=>90+15*r,score:w=>w.score});
 if(!scores)return;
 s.finish(scores,`Paddy's Darts · ${scores[0]} vs ${scores[1]}`);
}
Object.assign(exports,{darts,scoreAt});
