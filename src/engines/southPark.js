// South Park warp-zone games (src/warpThemes.js 'south-park'). Both players at once on one screen with the same
// seeded patterns, like the other warp games.
//  spDodgeball Dodgeball World Championship ("Conjoined Fetus Lady"). Each kid holds their end of the gym (P1 top /
//              left, P2 bottom / right). Drag to step sideways, flick toward your rival (or tap) to throw. Hit their head:
//              +1. Kenny wanders across the court now and then: hit him and you killed Kenny (−2). Three balls, refilled.
//  spPoofs     Cheesy Poofs Catch. Snacks rain down each half (P1 left, P2 right): Cheesy Poofs +1, Snacky Cakes +2,
//              a bucket of chicken +3. Mr. Hankey is −3. Drag to move your head under the good stuff.
//  spKenny     They Killed Kenny! Pianos, rats, meteors and saucers close in on Kenny in your half. Tap them before
//              they reach him: +1 each (pianos take two taps, +2). If one gets through, they killed Kenny: −3.
// Online (s.online, netField): Poofs and Kenny are side by side: your half wide on the left (64%), theirs narrow on the
// right, the same seeded schedule on both phones from a shared start; each phone judges only its own half (catches {g},
// zaps {z}, a killed Kenny {kd}), the other half follows its snapshots, and the end waits for the other phone's final.
const {clamp}=require("src/utils.js");
const {Fx,arenaKeys,arenaTouch,snd,noise,jingle,outlined,rr,PCOL,settle,Countdown}=require("src/engines/arenaKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");

const INK='#1c1a24',SNOW='#f4f8fc',GOLD='#ffd23c',ORANGE='#f08a24';
function endBanner(x,s,text){const size=Math.min(s.W*.06,s.H*.06,44);x.fillStyle='rgba(12,16,28,.78)';x.fillRect(0,s.H/2-size,s.W,size*2);outlined(x,text,s.W/2,s.H/2,{size,fill:GOLD,stroke:INK});}
function hud(x,i,v,text,sub){const size=Math.max(14,Math.min(v.w*.08,v.h*.05,26));outlined(x,text,v.x+10,v.y+size*.9,{size,fill:PCOL[i],stroke:'#fff',align:'left'});if(sub)outlined(x,sub,v.x+v.w-10,v.y+size*.9,{size:size*.85,fill:'#fff',stroke:INK,align:'right'});}
// online the halves are uneven: this phone's player gets the left 64%
const SPLIT=.64;
const halves=s=>s.online?(i=>i===s.online.me?{x:0,y:0,w:s.W*SPLIT-2,h:s.H}:{x:s.W*SPLIT+2,y:0,w:s.W*(1-SPLIT)-2,h:s.H}):(i=>({x:i?s.W/2+2:0,y:0,w:s.W/2-2,h:s.H}));
function divider(x,s,vertical=true){x.fillStyle=GOLD;const m=s.online?s.W*SPLIT:s.W/2;if(vertical)x.fillRect(m-2,0,4,s.H);else x.fillRect(0,s.H/2-2,s.W,4);}
// online side-by-side games: shared start, then the end waits for the other phone's final score
async function netStart(s,nf){if(nf)await nf.start('go');return s.alive;}
function netEnd(nf,score,me,done){if(!nf){done();return;}nf.finish(score[me]);nf.remoteDone().then(v=>{if(v!=null)score[1-me]=v|0;done();});}
// A South Park kid: parka body with the player's head on top (heads come from s.sprite).
function kid(x,s,i,cx,cy,hs,{mood,col=PCOL[i]}={}){
 x.fillStyle=col;x.strokeStyle=INK;x.lineWidth=Math.max(2,hs*.05);
 rr(x,cx-hs*.42,cy+hs*.22,hs*.84,hs*.62,hs*.22);x.fill();x.stroke();
 x.fillStyle='#2a2a2a';x.fillRect(cx-hs*.36,cy+hs*.74,hs*.3,hs*.14);x.fillRect(cx+hs*.06,cy+hs*.74,hs*.3,hs*.14);
 x.fillStyle='#f3e3b0';x.beginPath();x.arc(cx-hs*.5,cy+hs*.5,hs*.11,0,7);x.arc(cx+hs*.5,cy+hs*.5,hs*.11,0,7);x.fill();
 s.sprite(x,i,cx,cy,hs,{exact:true,mood});
}
// Kenny: orange parka, drawstring hood, only his eyes showing.
function kenny(x,cx,cy,r,{dead=0,t=0}={}){
 x.save();x.translate(cx,cy);if(dead)x.rotate(Math.min(1.5,dead*3));
 x.strokeStyle=INK;x.lineWidth=Math.max(2,r*.07);
 x.fillStyle=ORANGE;rr(x,-r*.62,r*.2,r*1.24,r*.95,r*.3);x.fill();x.stroke();
 x.fillStyle='#4a2a14';x.fillRect(-r*.5,r*1.08,r*.36,r*.18);x.fillRect(r*.14,r*1.08,r*.36,r*.18);
 x.fillStyle=ORANGE;x.beginPath();x.ellipse(0,-r*.05,r*.78,r*.72,0,0,7);x.fill();x.stroke();
 x.fillStyle='#6a3a14';x.beginPath();x.ellipse(0,-r*.02,r*.5,r*.44,0,0,7);x.fill();
 x.fillStyle='#f6d2b4';x.beginPath();x.ellipse(0,-r*.06,r*.38,r*.24,0,0,7);x.fill();
 x.fillStyle=INK;if(dead){for(const sx of [-1,1]){x.save();x.translate(sx*r*.14,-r*.08);x.lineWidth=2;x.beginPath();x.moveTo(-r*.06,-r*.06);x.lineTo(r*.06,r*.06);x.moveTo(r*.06,-r*.06);x.lineTo(-r*.06,r*.06);x.stroke();x.restore();}}
 else{const bl=Math.sin(t*3)>.96?.2:1;for(const sx of [-1,1]){x.beginPath();x.ellipse(sx*r*.14,-r*.08,r*.06,r*.08*bl,0,0,7);x.fill();}}
 x.strokeStyle='#3a1a08';x.lineWidth=2;x.beginPath();x.moveTo(-r*.08,r*.4);x.lineTo(-r*.12,r*.62);x.moveTo(r*.08,r*.4);x.lineTo(r*.12,r*.62);x.stroke();
 x.restore();
}
function pine(x,px,py,s){x.fillStyle='#6a4a2a';x.fillRect(px-s*.06,py-s*.1,s*.12,s*.22);x.fillStyle='#2f6b4a';x.strokeStyle=INK;x.lineWidth=2;x.beginPath();x.moveTo(px,py-s);x.lineTo(px+s*.38,py-s*.45);x.lineTo(px+s*.2,py-s*.45);x.lineTo(px+s*.45,py);x.lineTo(px-s*.45,py);x.lineTo(px-s*.2,py-s*.45);x.lineTo(px-s*.38,py-s*.45);x.closePath();x.fill();x.stroke();x.fillStyle='#fff';x.beginPath();x.moveTo(px,py-s);x.lineTo(px+s*.12,py-s*.8);x.lineTo(px-s*.12,py-s*.8);x.fill();}

// ------------------------------------------------------------------ Dodgeball World Championship
const DODGE_TIME=45,AMMO=3,REPACK=.75,BALL_SPEED=.95;
async function spDodgeball(s){
 const [c,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const fx=new Fx(),score=[0,0],kb=arenaKeys(s),cd=new Countdown(3);let phase='count',t=0,clock=0,endT=0,endText='';
 // Online: one court on both phones, physics on a fixed 390x780 reference (REF), each phone sees itself at the bottom
 // (player 1's view turned round). Your kid streams {u,a,o}; throws {th:[id,u,v,du,dv,t]} fly on both phones from the
 // shared start; YOUR phone calls hits on you {hi:[id]}, the THROWER's phone calls Kenny {kk:[id]}. The score is rebuilt
 // from those calls (hits[i] = i's hits on the other, kills[i] = Kennys i killed) and the end swaps the counts each
 // phone judged, so both phones finish on the same numbers.
 const on=!!s.online,me=on?s.online.me:0,them=1-me,flip=on&&me===0,REF={lat:390,lon:780};
 const hits=[0,0],kills=[0,0];let ballN=0,judging=true;
 const rescore=()=>{for(let i=0;i<2;i++)score[i]=Math.max(0,hits[i]-2*kills[i]);};
 s.hint('Dodgeball World Championship: you each hold your end of the gym (P1 top, P2 bottom; left/right on wide screens). Drag on your side to step sideways and dodge. Flick toward your rival to throw (the flick aims, balls bounce off the side walls), or just tap to throw straight. A head hit is +1. You hold three balls; the ball boy keeps refilling them. Kenny sometimes wanders across the court: hit him and you killed Kenny, −2. Most hits after 45 seconds wins. P1 A/D + Space, P2 arrows + Enter.');
 // Field coordinates: u runs across the court (0..1), v from P1's end (0) to P2's end (1).
 const wide=()=>s.W>s.H*1.05,lat=()=>on?REF.lat:wide()?s.H:s.W,lon=()=>on?REF.lon:wide()?s.W:s.H;
 const scr=(u,v)=>{if(flip){u=1-u;v=1-v;}return wide()?{x:v*s.W,y:u*s.H}:{x:u*s.W,y:v*s.H};};
 const field=(px,py)=>{const f=wide()?{u:py/s.H,v:px/s.W}:{u:px/s.W,v:py/s.H};return flip?{u:1-f.u,v:1-f.v}:f;};
 const hs=()=>clamp(Math.min((wide()?s.H:s.W)*.15,(wide()?s.W:s.H)*.13),40,110),hsRef=()=>clamp(Math.min(REF.lat*.15,REF.lon*.13),40,110);
 const kids=[0,1].map(i=>({u:.5,tu:.5,v:i?.84:.16,ammo:AMMO,repack:0,flash:0,ouch:0}));
 const balls=[];const ken={on:false,u:0,du:0,dead:0,next:5+s.random()*3};
 function throwBall(i,fu=0,fv=1){const k=kids[i];if(phase!=='play')return;if(k.ammo<=0){snd(180,.05,{type:'square',vol:.02});return;}
  k.ammo--;const dir=i?-1:1,fwd=Math.max(.35,Math.abs(fv)*(Math.sign(fv)===dir?1:.2)),r=clamp(fu/fwd,-1.1,1.1);
  const b={u:k.u,v:k.v+dir*.05,du:r*BALL_SPEED*lon()/lat(),dv:dir*BALL_SPEED,owner:i,age:0};
  if(on){b.id=me+'-'+(ballN++);nf.event({th:[b.id,+b.u.toFixed(4),+b.v.toFixed(4),+b.du.toFixed(4),+b.dv.toFixed(4),+clock.toFixed(3)]});}
  balls.push(b);
  snd(220,.08,{type:'sine',vol:.05,to:120});noise(.05,{vol:.03,freq:900});}
 arenaTouch(s,{owner:p=>field(p.x,p.y).v<.5?0:1,maxFingers:2,
  onMove:f=>{if(f.moved>8)kids[f.owner].tu=clamp(field(f.x,f.y).u,.06,.94);},
  onUp:(f,cancelled)=>{if(cancelled)return;const v=f.vel;
   if(v.speed>380){const sg=flip?-1:1,fu=sg*(wide()?v.y:v.x),fv=sg*(wide()?v.x:v.y);throwBall(f.owner,fu,fv);}
   else if(f.moved<14&&f.held<320)throwBall(f.owner);}});
 kb.onDown((i,k)=>{if(k==='fire')throwBall(i);});
 s.debug={get phase(){return phase;},kids,balls,score,ken,throwBall,scr};
 // vs CPU: kid 2 sidesteps balls heading its way, lines up throws on you and holds fire when Kenny is in the way
 const cpu=isCpu(s);let cpuT=1.2;
 function cpuDodge(dt,who=1){const k=kids[who],o=kids[1-who],sk=cpuSkill(s);let threat=null;for(const b of balls){if(b.owner===who||b.done||(who?b.dv<=0:b.dv>=0))continue;const tt=(k.v-b.v)/b.dv;if(tt<0||tt>1.1)continue;let u=b.u+b.du*tt;u=Math.abs(u)%2;u=u>1?2-u:u;if(Math.abs(u-k.u)<.13)threat=u;}
  if(threat!==null&&Math.random()<.35+sk*.65)k.tu=clamp(threat<k.u?k.u+.25:k.u-.25,.06,.94);else if(Math.random()<dt*.8)k.tu=clamp(o.u+(Math.random()-.5)*.3,.06,.94);
  cpuT-=dt;if(cpuT<=0&&k.ammo>0){cpuT=.6+(1-sk)*1+Math.random()*.4;const du=(o.u+(Math.random()-.5)*(1-sk)*.35)-k.u,r=du*lat()/(lon()*.68);if(!(ken.on&&ken.dead<=0&&Math.abs(ken.u-(k.u+du/2))<.12))throwBall(who,clamp(r,-1.1,1.1),who?-1:1);}}
 // ----- online
 const killKen=(b,kp2)=>{b.done=true;ken.dead=1.4;s.react(b.owner,'sad');
  fx.pop(kp2.x,kp2.y-hs()*.5,'OH MY GOD, THEY KILLED KENNY!',{color:'#ff6a6a',stroke:INK,size:Math.max(14,Math.min(s.W*.04,30)),life:1.6});fx.pop(kp2.x,kp2.y+hs()*.4,'YOU BASTARD! −2',{color:GOLD,stroke:INK,size:Math.max(13,hs()*.22),life:1.4});
  fx.burst(kp2.x,kp2.y,{n:20,color:ORANGE,speed:220,life:.6,size:4});noise(.3,{vol:.06,freq:400});snd(300,.5,{type:'sawtooth',vol:.04,to:80});};
 const bonk=(b,o)=>{const k=kids[o],kp=scr(k.u,k.v),H=hs();b.done=true;k.ouch=.6;kids[b.owner].flash=.5;s.react(b.owner,'happy');s.react(o,'sad');
  fx.burst(kp.x,kp.y,{n:18,color:'#ff5a4a',speed:240,life:.5,size:4});fx.pop(kp.x,kp.y-H*.5,'BONK! +1',{color:PCOL[b.owner],stroke:'#fff',size:Math.max(16,H*.28)});fx.shake(5);snd(160,.18,{type:'sine',vol:.07,to:70});jingle([660,880],{step:.05,type:'triangle',vol:.03});};
 const nf=on?netField(s,{hz:20,pack:()=>{const k=kids[me];return {u:+k.tu.toFixed(3),a:k.ammo,o:k.ouch>0?1:0};},unpack:(i,d)=>{const k=kids[i];k.tu=+d.u||.5;k.ammo=d.a|0;},
  onEvent:e=>{
   if(Array.isArray(e?.th)){const [id,u,v,du,dv,t0]=e.th;const b={id,u,v,du,dv,owner:them,age:0},late=Math.max(0,clock-t0);b.u+=du*late;b.v+=dv*late;b.age=late;if(b.u<0||b.u>1){b.du=-b.du;b.u=clamp(b.u<0?-b.u:2-b.u,0,1);}balls.push(b);}
   else if(Array.isArray(e?.hi)){hits[me]++;rescore();const b=balls.find(q=>q.id===e.hi[0]);if(b&&!b.done)bonk(b,them);else{kids[them].ouch=.6;}}
   else if(Array.isArray(e?.kk)){kills[them]++;rescore();const b=balls.find(q=>q.id===e.kk[0]);if(b)b.done=true;if(ken.dead<=0){ken.dead=1.4;const p=scr(ken.u,.5);fx.pop(p.x,p.y-hs()*.5,'THEY KILLED KENNY!',{color:'#ff6a6a',stroke:INK,size:Math.max(14,Math.min(s.W*.04,26)),life:1.4});}}}}):null;
 let autodrive=false;if(on)s.debug.bot=()=>{if(autodrive)return '';autodrive=true;return 'drive';};
 if(on){phase='sync';nf.start('go').then(()=>{if(phase==='sync')phase='count';});}
 function hitTest(b,cx,cy,r){const p=scr(b.u,b.v);return Math.hypot(p.x-cx,p.y-cy)<r;}
 // online hit tests run on the fixed reference court so both phones agree
 const hitRef=(b,u,v,k)=>Math.hypot((b.u-u)*REF.lat,(b.v-v)*REF.lon)<hsRef()*k;
 s.frame(dt=>{t+=dt;fx.update(dt);const H=hs();nf?.tick(dt);
  if(phase==='sync'||phase==='wait'){}
  else if(phase==='count'){if(!cd.update(dt))phase='play';}
  else if(phase==='play'){clock+=dt;if(cpu)cpuDodge(dt);if(autodrive)cpuDodge(dt,me);
   for(let i=0;i<2;i++){const k=kids[i],st=kb.state[i];if(st.l||st.r||st.u||st.d){const d=(flip?-1:1)*(wide()?(st.d-st.u)||(st.r-st.l):(st.r-st.l));k.tu=clamp(k.tu+d*dt*.9,.06,.94);}
    if(on&&i===them){k.u+=clamp(k.tu-k.u,-1.6*dt,1.6*dt);k.flash=Math.max(0,k.flash-dt);k.ouch=Math.max(0,k.ouch-dt);continue;}
    k.u+=clamp(k.tu-k.u,-1.6*dt,1.6*dt);k.flash=Math.max(0,k.flash-dt);k.ouch=Math.max(0,k.ouch-dt);
    if(k.ammo<AMMO){k.repack+=dt;if(k.repack>=REPACK){k.repack=0;k.ammo++;}}else k.repack=0;}
   // Kenny wanders across the middle of the street on a shared seeded schedule.
   if(ken.dead>0){ken.dead-=dt;if(ken.dead<=0){ken.on=false;ken.next=clock+5+s.random()*4;}}
   else if(ken.on){ken.u+=ken.du*dt;if(ken.u<-.08||ken.u>1.08){ken.on=false;ken.next=clock+4+s.random()*4;}}
   else if(clock>=ken.next){ken.on=true;const left=s.random()<.5;ken.u=left?-.06:1.06;ken.du=(left?1:-1)*(.16+s.random()*.08);}
   for(const b of balls){b.age+=dt;b.u+=b.du*dt;b.v+=b.dv*dt;if(b.u<0||b.u>1){b.du=-b.du;b.u=clamp(b.u,0,1);}
    const o=1-b.owner,k=kids[o],kp=scr(k.u,k.v);
    if(on){if(b.done||!judging)continue;
     // my phone calls hits on me; the thrower's phone calls Kenny
     if(o===me&&hitRef(b,k.u,k.v,.48)){hits[them]++;rescore();nf.event({hi:[b.id]});bonk(b,me);continue;}
     if(b.owner===me&&ken.on&&ken.dead<=0&&hitRef(b,ken.u,.5,.42)){kills[me]++;rescore();nf.event({kk:[b.id]});killKen(b,scr(ken.u,.5));}
     continue;}
    if(!b.done&&hitTest(b,kp.x,kp.y,H*.48)){b.done=true;score[b.owner]++;k.ouch=.6;kids[b.owner].flash=.5;s.react(b.owner,'happy');s.react(o,'sad');
     fx.burst(kp.x,kp.y,{n:18,color:'#ff5a4a',speed:240,life:.5,size:4});fx.pop(kp.x,kp.y-H*.5,'BONK! +1',{color:PCOL[b.owner],stroke:'#fff',size:Math.max(16,H*.28)});fx.shake(5);snd(160,.18,{type:'sine',vol:.07,to:70});jingle([660,880],{step:.05,type:'triangle',vol:.03});}
    if(!b.done&&ken.on&&ken.dead<=0){const kp2=scr(ken.u,.5);if(hitTest(b,kp2.x,kp2.y,H*.42)){b.done=true;ken.dead=1.4;score[b.owner]=Math.max(0,score[b.owner]-2);s.react(b.owner,'sad');
     fx.pop(kp2.x,kp2.y-H*.5,'OH MY GOD, THEY KILLED KENNY!',{color:'#ff6a6a',stroke:INK,size:Math.max(14,Math.min(s.W*.04,30)),life:1.6});fx.pop(kp2.x,kp2.y+H*.4,'YOU BASTARD! −2',{color:GOLD,stroke:INK,size:Math.max(13,H*.22),life:1.4});
     fx.burst(kp2.x,kp2.y,{n:20,color:ORANGE,speed:220,life:.6,size:4});noise(.3,{vol:.06,freq:400});snd(300,.5,{type:'sawtooth',vol:.04,to:80});}}}
   for(let j=balls.length-1;j>=0;j--){const b=balls[j];if(b.done||b.v<-.05||b.v>1.05)balls.splice(j,1);}
   if(clock>=DODGE_TIME&&on){judging=false;phase='wait';nf.finish([hits[them],kills[me]]);nf.remoteDone().then(v=>{if(Array.isArray(v)){hits[me]=v[0]|0;kills[them]=v[1]|0;}rescore();phase='end';endT=0;endText=score[0]===score[1]?'DOUBLE OUT: IT’S A TIE':`${s.players[score[0]>score[1]?0:1].name.toUpperCase()} IS WORLD CHAMPION`;jingle([523,659,784,1047],{step:.1,type:'triangle',vol:.04});});}
   else if(clock>=DODGE_TIME){phase='end';endT=0;endText=score[0]===score[1]?'DOUBLE OUT: IT’S A TIE':`${s.players[score[0]>score[1]?0:1].name.toUpperCase()} IS WORLD CHAMPION`;jingle([523,659,784,1047],{step:.1,type:'triangle',vol:.04});}}
  else{endT+=dt;if(endT>2.6){s.finish(score,`Dodgeball World Championship: ${s.players[0].name} ${score[0]}, ${s.players[1].name} ${score[1]}.`);return;}}
  s.setScores(score);fx.begin(x);
  // the gym: maple floor, court lines, a red centre line, team banners at each end
  x.fillStyle='#d9a866';x.fillRect(0,0,s.W,s.H);x.strokeStyle='rgba(120,70,20,.22)';x.lineWidth=2;
  for(let k=0;k<=1;k+=.045){const a=scr(k,0),b2=scr(k,1);x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b2.x,b2.y);x.stroke();}
  for(let i=0;i<2;i++){const a=scr(0,i?.66:0),b2=scr(1,i?1:.34);x.fillStyle=i?'rgba(255,111,168,.12)':'rgba(74,163,255,.12)';x.fillRect(Math.min(a.x,b2.x),Math.min(a.y,b2.y),Math.abs(b2.x-a.x),Math.abs(b2.y-a.y));}
  x.strokeStyle='#fff';x.lineWidth=4;for(const v of [.04,.34,.66,.96]){const a=scr(.02,v),b2=scr(.98,v);x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b2.x,b2.y);x.stroke();}
  {const a=scr(.02,.04),b2=scr(.98,.96);x.strokeRect(Math.min(a.x,b2.x),Math.min(a.y,b2.y),Math.abs(b2.x-a.x),Math.abs(b2.y-a.y));const m0=scr(0,.5),m1=scr(1,.5);x.strokeStyle='#c8161d';x.lineWidth=6;x.beginPath();x.moveTo(m0.x,m0.y);x.lineTo(m1.x,m1.y);x.stroke();
   const c0=scr(.5,.5);x.strokeStyle='#fff';x.lineWidth=4;x.beginPath();x.arc(c0.x,c0.y,Math.min(s.W,s.H)*.09,0,7);x.stroke();outlined(x,'SOUTH PARK',c0.x,c0.y,{size:Math.max(10,H*.17),fill:'#c8161d',stroke:'#fff'});}
  {const c0=scr(.5,.5),rad=Math.min(s.W,s.H)*.09,fs=Math.max(9,H*.13);outlined(x,'WORLD CHAMPIONSHIP',c0.x,c0.y+rad+fs*.9,{size:fs,fill:'#fff',stroke:INK});}
  if(ken.on){const p=scr(ken.u,.5);kenny(x,p.x,p.y-H*.1,H*.42,{dead:ken.dead>0?1.4-ken.dead:0,t});}
  for(const b of balls){const p=scr(b.u,b.v);x.fillStyle='rgba(0,0,0,.15)';x.beginPath();x.ellipse(p.x+4,p.y+6,H*.13,H*.08,0,0,7);x.fill();x.fillStyle='#d8322a';x.strokeStyle=INK;x.lineWidth=2;x.beginPath();x.arc(p.x,p.y,H*.13,0,7);x.fill();x.stroke();x.strokeStyle='rgba(255,255,255,.45)';x.beginPath();x.arc(p.x,p.y,H*.09,3.6,4.8);x.stroke();}
  for(let i=0;i<2;i++){const k=kids[i],p=scr(k.u,k.v);if(k.ouch>0)x.globalAlpha=.6+.4*Math.sin(t*30);kid(x,s,i,p.x,p.y-H*.2,H,{mood:k.ouch>0?'sad':k.flash>0?'happy':undefined});x.globalAlpha=1;
   for(let a=0;a<AMMO;a++){x.fillStyle=a<k.ammo?'#d8322a':'rgba(216,50,42,.25)';x.strokeStyle=INK;x.lineWidth=2;x.beginPath();x.arc(p.x-H*.5+a*H*.2,p.y+H*.78,H*.07,0,7);x.fill();x.stroke();}}
  fx.draw(x);fx.end(x);
  const sz=Math.max(14,Math.min(s.W,s.H)*.04);
  for(let i=0;i<2;i++){const far=flip?1-i:i,p=wide()?{x:far?s.W-12:12,y:sz}:{x:12,y:far?s.H-sz*.6:sz};outlined(x,`${s.players[i].name.toUpperCase()}  ${score[i]}`,p.x,p.y,{size:sz,fill:PCOL[i],stroke:'#fff',align:wide()&&far?'right':'left'});}
  outlined(x,`${Math.ceil(Math.max(0,DODGE_TIME-clock))}s`,wide()?s.W/2:s.W-12,sz,{size:sz,fill:INK,stroke:'#fff',align:wide()?'center':'right'});
  if(phase==='count')cd.draw(x,s.W,s.H);if(phase==='end')endBanner(x,s,endText);
  if(phase==='wait'||phase==='sync')endBanner(x,s,`Waiting for ${s.players[them].name}…`);
 });
}

// ------------------------------------------------------------------ Cheesy Poofs Catch
const POOF_TIME=45;
const SNACKS={poof:{pts:1,label:'+1'},cake:{pts:2,label:'SNACKY CAKE +2'},bucket:{pts:3,label:'CHICKEN! +3'},hankey:{pts:-3,label:'HOWDY HO! −3'}};
function drawSnack(x,kind,cx,cy,r,t){
 x.save();x.translate(cx,cy);x.strokeStyle=INK;x.lineWidth=2;
 if(kind==='poof'){x.fillStyle='#ff9a1f';for(const [dx,dy] of [[-.35,0],[.35,.05],[0,-.3],[0,.3]]){x.beginPath();x.arc(dx*r,dy*r,r*.5,0,7);x.fill();x.stroke();}x.fillStyle='#ffd06a';x.beginPath();x.arc(-r*.1,-r*.15,r*.18,0,7);x.fill();}
 else if(kind==='cake'){x.fillStyle='#ff7ab8';rr(x,-r,-r*.5,r*2,r,r*.4);x.fill();x.stroke();x.strokeStyle='#fff';x.lineWidth=2.5;x.beginPath();for(let k=-.8;k<=.8;k+=.32)x.lineTo(k*r,(Math.abs(k*10)%2?-.1:.1)*r);x.stroke();}
 else if(kind==='bucket'){x.fillStyle='#fff';x.beginPath();x.moveTo(-r*.8,-r*.5);x.lineTo(r*.8,-r*.5);x.lineTo(r*.6,r*.8);x.lineTo(-r*.6,r*.8);x.closePath();x.fill();x.stroke();x.fillStyle='#d8261d';for(let k=-1;k<=1;k++){x.beginPath();x.moveTo(k*r*.5-r*.13,-r*.5);x.lineTo(k*r*.5+r*.13,-r*.5);x.lineTo(k*r*.4+r*.1,r*.8);x.lineTo(k*r*.4-r*.1,r*.8);x.closePath();x.fill();}
  x.fillStyle='#c8823a';for(const dx of [-.4,0,.4]){x.beginPath();x.ellipse(dx*r,-r*.62,r*.28,r*.22,dx,0,7);x.fill();x.stroke();}}
 else{x.rotate(Math.sin(t*5)*.15);x.fillStyle='#7a4a1e';rr(x,-r*.95,-r*.42,r*1.9,r*.84,r*.4);x.fill();x.stroke();
  x.fillStyle='#fff';for(const sx of [-1,1]){x.beginPath();x.arc(sx*r*.3,-r*.08,r*.17,0,7);x.fill();x.stroke();}x.fillStyle=INK;for(const sx of [-1,1]){x.beginPath();x.arc(sx*r*.3,-r*.06,r*.07,0,7);x.fill();}
  x.strokeStyle=INK;x.lineWidth=2;x.beginPath();x.arc(0,r*.08,r*.3,.3,Math.PI-.3);x.stroke();
  x.fillStyle='#d8261d';x.beginPath();x.moveTo(-r*.5,-r*.38);x.lineTo(r*.4,-r*.38);x.lineTo(r*.9,-r*1.05);x.closePath();x.fill();x.stroke();x.fillStyle='#fff';x.fillRect(-r*.55,-r*.46,r*1,r*.14);x.beginPath();x.arc(r*.92,-r*1.07,r*.14,0,7);x.fill();}
 x.restore();
}
async function spPoofs(s){
 const [c,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const vp=halves(s),fx=new Fx(),score=[0,0],kb=arenaKeys(s),cd=new Countdown(3);let phase='count',t=0,clock=0,endT=0,endText='';
 s.hint('Cheesy Poofs Catch: snacks rain down on your half (P1 left, P2 right). Drag on your half to move your head under them: Cheesy Poofs +1, Snacky Cakes +2, a bucket of chicken +3. Dodge Mr. Hankey (−3). It speeds up. Most points after 45 seconds wins. P1 A/D, P2 arrows.');
 // One shared seeded schedule: both players get the same snacks at the same moments.
 const sched=[];for(let tt=.3;tt<POOF_TIME-1.2;){const r=s.random(),kind=r<.6?'poof':r<.72?'cake':r<.8?'bucket':'hankey';sched.push({at:tt,u:.1+s.random()*.8,kind,speed:.32+tt/POOF_TIME*.3+s.random()*.08});tt+=.42-tt/POOF_TIME*.18+s.random()*.22;}
 const heads=[0,1].map(()=>({u:.5,tu:.5,flash:0,ouch:0})),got=[new Set(),new Set()];
 const on=!!s.online,me=on?s.online.me:0,them=1-me;
 const nf=on?netField(s,{hz:15,pack:i=>({u:+heads[i].tu.toFixed(3),sc:score[i],o:heads[i].ouch>0?1:0}),unpack:(i,d)=>{heads[i].tu=+d.u||.5;score[i]=d.sc|0;if(d.o&&heads[i].ouch<=0)heads[i].ouch=.9;},
  onEvent:e=>{const g=e?.g;if(!Array.isArray(g)||got[them].has(g[0]))return;got[them].add(g[0]);const it=sched[g[0]],v=vp(them);if(it)fx.pop(v.x+it.u*v.w,itemY(it,v),SNACKS[it.kind].label,{color:g[1]>0?GOLD:'#c8823a',stroke:INK,size:14});}}):null;
 const hsz=i=>{const v=vp(i);return clamp(Math.min(v.w*.3,v.h*.13),38,110);};
 arenaTouch(s,{owner:p=>p.x<s.W/2?0:1,maxFingers:1,onDown:f=>{const v=vp(f.owner);heads[f.owner].tu=clamp((f.x-v.x)/v.w,.08,.92);},onMove:f=>{const v=vp(f.owner);heads[f.owner].tu=clamp((f.x-v.x)/v.w,.08,.92);}});
 const itemY=(it,v)=>(clock-it.at)*it.speed*v.h-20;
 s.debug={get phase(){return phase;},heads,score,sched,got,clockNow:()=>clock};
 // vs CPU: head 2 slides under the best snack about to land and steers clear of Mr. Hankey
 const cpu=isCpu(s);let cpuErr=0;
 function cpuPoofs(dt,who=1){const h=heads[who],v=vp(who),sk=cpuSkill(s),hy=v.h-hsz(who)*1.1;let best=null,bt=1e9;for(let j=0;j<sched.length;j++){const it=sched[j];if(it.at>clock)break;if(got[who].has(j))continue;const iy=itemY(it,v);if(iy>hy)continue;const tt=(hy-iy)/(it.speed*v.h);
   if(it.kind==='hankey'){if(tt<.8&&Math.abs(it.u-h.u)<.18)h.tu=clamp(h.u+(h.u<it.u?-.3:.3),.08,.92);continue;}if(tt<bt&&tt>Math.abs(it.u-h.u)/2.4*(1.6-sk)){bt=tt;best=it;}}
  if(Math.random()<dt*2)cpuErr=(Math.random()-.5)*(1-sk)*.25;if(best)h.tu=clamp(best.u+cpuErr,.08,.92);}
 let autodrive=false;if(on)s.debug.bot=()=>{if(autodrive)return '';autodrive=true;return 'drive';};
 if(on){phase='sync';netStart(s,nf).then(()=>{if(phase==='sync')phase='count';});}
 s.frame(dt=>{t+=dt;fx.update(dt);nf?.tick(dt);
  if(phase==='sync'){}
  else if(phase==='count'){if(!cd.update(dt))phase='play';}
  else if(phase==='wait'){}
  else if(phase==='play'){clock+=dt;if(cpu)cpuPoofs(dt);if(autodrive)cpuPoofs(dt,me);
   for(let i=0;i<2;i++){const h=heads[i],st=kb.state[i],v=vp(i),hs=hsz(i);
    if(on&&i===them){h.u+=clamp(h.tu-h.u,-2.4*dt,2.4*dt);h.flash=Math.max(0,h.flash-dt);h.ouch=Math.max(0,h.ouch-dt);for(let j=0;j<sched.length;j++){const it=sched[j];if(it.at>clock)break;if(!got[i].has(j)&&itemY(it,v)>v.h+40)got[i].add(j);}continue;}if(st.l||st.r)h.tu=clamp(h.tu+(st.r-st.l)*dt*1.1,.08,.92);h.u+=clamp(h.tu-h.u,-2.4*dt,2.4*dt);h.flash=Math.max(0,h.flash-dt);h.ouch=Math.max(0,h.ouch-dt);
    const hx=v.x+h.u*v.w,hy=v.h-hs*1.1;
    for(let j=0;j<sched.length;j++){const it=sched[j];if(it.at>clock)break;if(got[i].has(j))continue;const iy=itemY(it,v),ix=v.x+it.u*v.w,r=hs*.3;
     if(iy>hy-hs*.55&&iy<hy+hs*.3&&Math.abs(ix-hx)<hs*.55+r*.4){got[i].add(j);const S=SNACKS[it.kind];score[i]=Math.max(0,score[i]+S.pts);if(on){nf.event({g:[j,S.pts]});nf.push();}
      fx.pop(ix,iy-hs*.4,S.label,{color:S.pts>0?GOLD:'#c8823a',stroke:INK,size:Math.max(14,hs*.26)});
      if(S.pts>0){h.flash=.3;fx.burst(ix,iy,{n:8+S.pts*4,color:it.kind==='poof'?'#ff9a1f':'#fff',speed:160,life:.4,size:3});snd(660+S.pts*120,.08,{type:'triangle',vol:.035});if(S.pts>1)jingle([880,1175],{step:.05,type:'triangle',vol:.03});}
      else{h.ouch=.9;s.react(i,'sad');fx.shake(6);snd(140,.3,{type:'sawtooth',vol:.04});fx.burst(ix,iy,{n:14,color:'#7a4a1e',speed:200,life:.5,size:4});}}
     else if(iy>v.h+40)got[i].add(j);}}
   if(clock>=POOF_TIME){phase='wait';netEnd(nf,score,me,()=>{phase='end';endT=0;endText=score[0]===score[1]?'EQUALLY STUFFED':`${s.players[score[0]>score[1]?0:1].name.toUpperCase()} ATE THE MOST`;jingle([523,659,784,1047],{step:.1,type:'triangle',vol:.04});});}}
  else{endT+=dt;if(endT>2.6){s.finish(score,`Cheesy Poofs Catch: ${s.players[0].name} ${score[0]}, ${s.players[1].name} ${score[1]}.`);return;}}
  s.setScores(score);fx.begin(x);
  for(let i=0;i<2;i++){const v=vp(i),h=heads[i],hs=hsz(i);x.save();x.beginPath();x.rect(v.x,v.y,v.w,v.h);x.clip();
   // Cartman's living room: wallpaper, the TV glow, carpet
   x.fillStyle='#e9d9a8';x.fillRect(v.x,v.y,v.w,v.h);x.fillStyle='rgba(160,120,60,.18)';for(let yy=0;yy<v.h;yy+=34)for(let xx=(yy/34)%2*17;xx<v.w;xx+=34){x.beginPath();x.arc(v.x+xx,yy,4,0,7);x.fill();}
   x.fillStyle='#6a8a5a';x.fillRect(v.x,v.h-hs*.55,v.w,hs*.55);x.fillStyle='rgba(0,0,0,.12)';x.fillRect(v.x,v.h-hs*.55,v.w,5);
   for(let j=0;j<sched.length;j++){const it=sched[j];if(it.at>clock)break;if(got[i].has(j))continue;const iy=itemY(it,v);if(iy<-40)continue;drawSnack(x,it.kind,v.x+it.u*v.w,iy,hs*.3,t+j);}
   if(h.ouch>0)x.globalAlpha=.6+.4*Math.sin(t*30);kid(x,s,i,v.x+h.u*v.w,v.h-hs*1.1,hs,{mood:h.ouch>0?'sad':h.flash>0?'happy':undefined});x.globalAlpha=1;
   if(h.ouch>0){x.fillStyle=`rgba(122,74,30,${h.ouch*.25})`;x.fillRect(v.x,v.y,v.w,v.h);}
   hud(x,i,v,`${s.players[i].name.toUpperCase()}  ${score[i]}`,`${Math.ceil(Math.max(0,POOF_TIME-clock))}s`);x.restore();}
  fx.draw(x);fx.end(x);divider(x,s);
  if(phase==='count')cd.draw(x,s.W,s.H);if(phase==='end')endBanner(x,s,endText);
  if(phase==='wait'||phase==='sync')endBanner(x,s,`Waiting for ${s.players[them].name}…`);
 });
}

// ------------------------------------------------------------------ They Killed Kenny!
const KENNY_TIME=45;
const DOOMS={rat:{hp:1,pts:1,speed:.3,r:.11},meteor:{hp:1,pts:1,speed:.36,r:.1},saucer:{hp:1,pts:1,speed:.22,r:.13,wobble:true},piano:{hp:2,pts:2,speed:.17,r:.17}};
function drawDoom(x,d,cx,cy,r,t){
 x.save();x.translate(cx,cy);x.strokeStyle=INK;x.lineWidth=2;
 if(d.kind==='rat'){x.rotate(d.ang+Math.PI/2);x.fillStyle='#7a7a82';x.beginPath();x.ellipse(0,0,r*.55,r*.9,0,0,7);x.fill();x.stroke();x.fillStyle='#ffb0c0';x.beginPath();x.arc(-r*.35,r*.6,r*.16,0,7);x.arc(r*.35,r*.6,r*.16,0,7);x.fill();x.strokeStyle='#e89aa8';x.lineWidth=3;x.beginPath();x.moveTo(0,-r*.9);x.quadraticCurveTo(r*.6*Math.sin(t*12),-r*1.5,0,-r*1.9);x.stroke();x.fillStyle='#ff3b3b';x.beginPath();x.arc(-r*.18,r*.55,r*.07,0,7);x.arc(r*.18,r*.55,r*.07,0,7);x.fill();}
 else if(d.kind==='meteor'){x.rotate(d.ang+Math.PI);x.fillStyle='rgba(255,140,40,.6)';x.beginPath();x.moveTo(-r*2.6,-r*.5);x.lineTo(0,-r*.7);x.lineTo(0,r*.7);x.lineTo(-r*2.6,r*.5);x.fill();x.fillStyle='#6a5a4a';x.beginPath();x.arc(0,0,r*.8,0,7);x.fill();x.stroke();x.fillStyle='#4a3a2a';x.beginPath();x.arc(-r*.2,-r*.2,r*.2,0,7);x.arc(r*.3,r*.2,r*.15,0,7);x.fill();}
 else if(d.kind==='saucer'){x.fillStyle='#9be7a0';x.beginPath();x.ellipse(0,-r*.25,r*.45,r*.4,0,Math.PI,0);x.fill();x.stroke();x.fillStyle='#b9c2cc';x.beginPath();x.ellipse(0,0,r*1.1,r*.35,0,0,7);x.fill();x.stroke();for(let k=-2;k<=2;k++){x.fillStyle=Math.sin(t*8+k)>0?'#ffe23b':'#ff3b6b';x.beginPath();x.arc(k*r*.4,r*.05,r*.08,0,7);x.fill();}}
 else{x.rotate(Math.sin(t*3)*.1);x.fillStyle='#1a1a1a';rr(x,-r,-r*.7,r*2,r*1.2,r*.15);x.fill();x.stroke();x.fillStyle='#fff';x.fillRect(-r*.85,r*.15,r*1.7,r*.3);x.fillStyle=INK;for(let k=0;k<6;k++)x.fillRect(-r*.75+k*r*.3,r*.15,r*.12,r*.18);x.strokeStyle='#666';x.lineWidth=2;x.beginPath();x.moveTo(-r*.8,-r*.7);x.lineTo(-r*.6,-r*1.4);x.moveTo(r*.8,-r*.7);x.lineTo(r*.6,-r*1.4);x.stroke();if(d.hp<2){x.strokeStyle=GOLD;x.lineWidth=3;x.beginPath();x.moveTo(-r*.4,-r*.6);x.lineTo(0,-r*.1);x.lineTo(-r*.2,r*.2);x.stroke();}}
 x.restore();
}
async function spKenny(s){
 const [c,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const vp=halves(s),fx=new Fx(),score=[0,0],kb=arenaKeys(s),cd=new Countdown(3);let phase='count',t=0,clock=0,endT=0,endText='';
 s.hint('They Killed Kenny! Pianos, rats, meteors and flying saucers close in on Kenny in your half (P1 left, P2 right). Tap them before they reach him: +1 each, pianos take two taps and pay +2. If one gets through, they killed Kenny: −3, and he is back a moment later. Most points after 45 seconds wins. P1 Space, P2 Enter zaps the closest threat.');
 // Shared seeded schedule: [time, angle (0 = from the right, π = from the left, up is negative), kind].
 const sched=[];for(let tt=.6;tt<KENNY_TIME-1;){const r=s.random(),kind=r<.34?'rat':r<.6?'meteor':r<.82?'saucer':'piano';sched.push({at:tt,ang:-Math.PI*(.08+s.random()*.84),kind,wob:s.random()*6});tt+=.85-tt/KENNY_TIME*.42+s.random()*.35;}
 const sides=[0,1].map(()=>({next:0,live:[],dead:0,deaths:0,cool:0}));
 const on=!!s.online,me=on?s.online.me:0,them=1-me;
 const nf=on?netField(s,{hz:10,pack:i=>({sc:score[i]}),unpack:(i,d)=>{score[i]=d.sc|0;},
  onEvent:e=>{const sd=sides[them],g=geo(them);
   if(Array.isArray(e?.z)){const d=sd.live.find(q=>q.idx===e.z[0]&&!q.gone);if(!d)return;d.hp=e.z[1];d.flash=.15;if(d.hp<=0){d.gone=true;const p=pos(d,g);fx.burst(p.x,p.y,{n:10,color:'#fff',speed:160,life:.4,size:3,shape:'star'});}}
   else if(e?.kd){sd.dead=1.6;sd.deaths++;for(const d of sd.live)d.gone=true;fx.pop(g.kx,g.ky-g.kr*2.2,'THEY KILLED KENNY!',{color:'#ff6a6a',stroke:INK,size:Math.max(12,Math.min(g.v.w*.08,22)),life:1.5});}}}):null;
 const geo=i=>{const v=vp(i),kr=clamp(Math.min(v.w*.16,v.h*.09),26,64);return {v,kr,kx:v.x+v.w/2,ky:v.h-kr*1.6,R:Math.hypot(v.w,v.h)*.8,unit:Math.min(v.w,v.h*1.2)};};
 function pos(d,g){const dist=Math.max(0,g.R*(1-(clock-d.at)*d.speed)),wob=d.wobble?Math.sin(clock*3+d.wob)*g.kr*.9:0;return {x:g.kx+Math.cos(d.ang)*dist-Math.sin(d.ang)*wob,y:g.ky+Math.sin(d.ang)*dist+Math.cos(d.ang)*wob,dist};}
 function zap(i,d){const g=geo(i),p=pos(d,g);d.hp--;d.flash=.15;if(on)nf.event({z:[d.idx,d.hp]});snd(900,.06,{type:'square',vol:.035,to:300});
  if(d.hp<=0){const D=DOOMS[d.kind];score[i]+=D.pts;d.gone=true;fx.burst(p.x,p.y,{n:14,color:d.kind==='meteor'?'#ff8a1f':'#fff',speed:220,life:.45,size:3,shape:'star'});fx.pop(p.x,p.y-20,`+${D.pts}`,{color:GOLD,stroke:INK,size:Math.max(16,g.kr*.6)});noise(.12,{vol:.05,freq:2200});}
  else fx.ring(p.x,p.y,{color:GOLD,r1:g.kr*1.2,life:.25});}
 function tap(i,px,py){if(phase!=='play'||sides[i].dead>0)return;const g=geo(i);let best=null,bd=1e9;
  for(const d of sides[i].live){if(d.gone)continue;const p=pos(d,g),r=DOOMS[d.kind].r*g.kr*7+18,dd=Math.hypot(px-p.x,py-p.y);if(dd<r&&dd<bd){bd=dd;best=d;}}
  if(best)zap(i,best);else fx.ring(px,py,{color:'rgba(255,255,255,.6)',r1:20,life:.2});}
 arenaTouch(s,{owner:p=>p.x<s.W/2?0:1,maxFingers:2,onDown:f=>tap(f.owner,f.x,f.y)});
 kb.onDown((i,k)=>{if(k!=='fire'||phase!=='play'||sides[i].dead>0||sides[i].cool>0)return;const g=geo(i);const live=sides[i].live.filter(d=>!d.gone);if(!live.length)return;live.sort((a,b)=>pos(a,g).dist-pos(b,g).dist);sides[i].cool=.3;zap(i,live[0]);});
 s.debug={get phase(){return phase;},score,sides,sched,tap,pos:(i,d)=>pos(d,geo(i)),clockNow:()=>clock};
 // vs CPU: Kenny's guardian zaps the closest threat (the keyboard 'fire' action) at a pace set by the difficulty
 const cpu=isCpu(s);let cpuT=1;
 function cpuKenny(dt){cpuT-=dt;if(cpuT>0)return;const sk=cpuSkill(s);cpuT=.32+(1-sk)*.55+Math.random()*.25;if(sides[1].live.some(d=>!d.gone)&&Math.random()<.6+sk*.4){kb.cpu('fire',true);kb.cpu('fire',false);}}
 function killKenny(i){const sd=sides[i],g=geo(i);if(on)nf.event({kd:1});sd.dead=1.6;sd.deaths++;score[i]=Math.max(0,score[i]-3);for(const d of sd.live)d.gone=true;s.react(i,'sad');fx.shake(8);
  fx.pop(g.kx,g.ky-g.kr*2.2,'THEY KILLED KENNY!',{color:'#ff6a6a',stroke:INK,size:Math.max(14,Math.min(g.v.w*.08,30)),life:1.5});fx.pop(g.kx,g.ky-g.kr*1.2,'YOU BASTARDS! −3',{color:GOLD,stroke:INK,size:Math.max(12,Math.min(g.v.w*.06,22)),life:1.4});
  fx.burst(g.kx,g.ky,{n:24,color:ORANGE,speed:260,life:.7,size:4});noise(.4,{vol:.07,freq:300});snd(260,.6,{type:'sawtooth',vol:.045,to:60});}
 // online test bot: zap this phone's closest threat now and then
 if(on)s.debug.bot=()=>{if(phase!=='play'||sides[me].dead>0||Math.random()<.25)return '';const g=geo(me),live=sides[me].live.filter(d=>!d.gone);if(!live.length)return '';live.sort((a,b)=>pos(a,g).dist-pos(b,g).dist);zap(me,live[0]);return 'zap';};
 if(on){phase='sync';netStart(s,nf).then(()=>{if(phase==='sync')phase='count';});}
 s.frame(dt=>{t+=dt;fx.update(dt);nf?.tick(dt);
  if(phase==='sync'||phase==='wait'){}
  else if(phase==='count'){if(!cd.update(dt))phase='play';}
  else if(phase==='play'){clock+=dt;if(cpu)cpuKenny(dt);
   for(let i=0;i<2;i++){const sd=sides[i],g=geo(i);sd.cool=Math.max(0,sd.cool-dt);
    if(sd.dead>0){sd.dead-=dt;if(sd.dead<=0)fx.pop(g.kx,g.ky-g.kr*1.6,'HE’S BACK!',{color:ORANGE,stroke:INK,size:Math.max(14,g.kr*.5)});}
    while(sd.next<sched.length&&sched[sd.next].at<=clock){const idx=sd.next,it=sched[sd.next++];if(sd.dead>0)continue;const D=DOOMS[it.kind];sd.live.push({...it,idx,hp:D.hp,speed:D.speed*(1+it.at/KENNY_TIME*.5),wobble:!!D.wobble,flash:0,gone:false});}
    // online the other half's threats just stop at Kenny: their phone says whether he died
    for(const d of sd.live){d.flash=Math.max(0,d.flash-dt);if(!d.gone&&sd.dead<=0&&pos(d,g).dist<g.kr*.9+DOOMS[d.kind].r*g.kr*3.5){if(on&&i===them){d.gone=true;continue;}killKenny(i);break;}}
    sd.live=sd.live.filter(d=>!d.gone);}
   if(clock>=KENNY_TIME){phase='wait';netEnd(nf,score,me,()=>{phase='end';endT=0;endText=score[0]===score[1]?'KENNY SURVIVES… FOR NOW':`${s.players[score[0]>score[1]?0:1].name.toUpperCase()} SAVED KENNY BEST`;jingle([523,659,784,1047],{step:.1,type:'triangle',vol:.04});});}}
  else{endT+=dt;if(endT>2.6){s.finish(score,`They Killed Kenny!: ${s.players[0].name} ${score[0]}, ${s.players[1].name} ${score[1]}.`);return;}}
  s.setScores(score);fx.begin(x);
  for(let i=0;i<2;i++){const g=geo(i),v=g.v,sd=sides[i];x.save();x.beginPath();x.rect(v.x,v.y,v.w,v.h);x.clip();
   const gr=x.createLinearGradient(0,0,0,v.h);gr.addColorStop(0,'#5aa8e0');gr.addColorStop(.7,'#bfe3f8');x.fillStyle=gr;x.fillRect(v.x,0,v.w,v.h);
   x.fillStyle='#7d8fae';x.strokeStyle=INK;x.lineWidth=3;x.beginPath();x.moveTo(v.x-20,v.h*.62);for(let k=0;k<=5;k++){x.lineTo(v.x+v.w*(k+.5)/5,v.h*(.38+(k%2)*.1));x.lineTo(v.x+v.w*(k+1)/5,v.h*.62);}x.lineTo(v.x+v.w+20,v.h);x.lineTo(v.x-20,v.h);x.closePath();x.fill();x.stroke();
   x.fillStyle=SNOW;x.fillRect(v.x,v.h*.7,v.w,v.h*.3);pine(x,v.x+v.w*.12,v.h*.78,g.kr*1.4);pine(x,v.x+v.w*.88,v.h*.8,g.kr*1.2);
   for(const d of sd.live){const p=pos(d,g);if(d.flash>0)x.globalAlpha=.5;drawDoom(x,d,p.x,p.y,DOOMS[d.kind].r*g.kr*7,t);x.globalAlpha=1;}
   kenny(x,g.kx,g.ky,g.kr,{dead:sd.dead>0?1.6-sd.dead:0,t});
   if(sd.dead>0){x.fillStyle=`rgba(200,20,20,${Math.min(.3,sd.dead*.2)})`;x.fillRect(v.x,v.y,v.w,v.h);}
   s.sprite(x,i,v.x+v.w-g.kr*.8,v.y+g.kr*2.1,g.kr*1.2,{exact:true,mood:sd.dead>0?'sad':undefined});
   hud(x,i,v,`${s.players[i].name.toUpperCase()}  ${score[i]}`,`${Math.ceil(Math.max(0,KENNY_TIME-clock))}s`);x.restore();}
  fx.draw(x);fx.end(x);divider(x,s);
  if(phase==='count')cd.draw(x,s.W,s.H);if(phase==='end')endBanner(x,s,endText);
  if(phase==='wait'||phase==='sync')endBanner(x,s,`Waiting for ${s.players[them].name}…`);
 });
}
Object.assign(exports,{spDodgeball,spPoofs,spKenny});
