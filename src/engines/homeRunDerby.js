// Major League Batting Cage, rebuilt as a Home Run Derby from behind the plate at a night ballpark. "Wild Thing"
// Rick Vaughn (wearing your rival's head) deals fastballs, curves and changeups; tap when the ball reaches the plate.
// Your timing sets the direction (early = pull, late = opposite field) and power; where you tap compared with the ball
// sets the launch angle (under it = fly ball, over it = grounder). Ten pitches each, same pitches for both:
// home run 4 (moonshot over 450 ft = 5), triple 3, double 2, single 1.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,sfx,makeShake,label,SANS,rr}=require("src/engines/tarantinoKit.js");
const {turnRunner}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

const PITCHES=10,KINDS={fast:{name:'FASTBALL',dur:.72,brk:0},curve:{name:'CURVEBALL',dur:.95,brk:1.1},change:{name:'CHANGEUP',dur:1.12,brk:-.25}};
const QUOTES=['Juuust a bit outside.','Get up, get up, get outta here! GONE!','Wild Thing, you make my heart sing!','Ball four, take your base. Just kidding.','He hit that one about as far as you can hit one.'];

async function baseball(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const shake=makeShake(),rnd=seededRandom(s.seed+':derby');const list=Array.from({length:PITCHES},()=>{const kinds=['fast','fast','curve','change'],k=kinds[Math.floor(rnd()*kinds.length)];return {k,tx:(rnd()-.5)*1.5,ty:1.6+rnd()*2.1,wind:.9+rnd()*.6};});
 let cur=null,G=null;
 function proj(X,Y,Z){const sc=G.F/Math.max(.8,Z+G.Z0);return {x:G.cx+X*sc,y:G.hy+(G.camH-Y)*sc,s:sc};}
 function layout(){const W=s.W,H=s.H,F=Math.min(W*1.05,H*.78);G={W,H,F,Z0:8,camH:4.6,cx:W/2,hy:H*.47};}
 function make(){return {n:0,score:0,phase:'wind',t:0,ball:null,swing:null,result:null,hit:null,results:[],quote:null,crowd:0,bat:0};}
 function startPitch(w){w.phase='wind';w.t=0;w.ball=null;w.swing=null;w.hit=null;w.result=null;}
 function swing(w,px,py){if(w.phase!=='pitch'||w.swing)return;w.swing={t:w.t};w.bat=.35;sfx.whoosh(500,2200,.08,.16);
  const P=list[w.n],K=KINDS[P.k],arrive=K.dur,dt=w.t-arrive;// negative = early
  const b=w.ball,bp=proj(b.x,b.y,0);const dyScreen=(py-bp.y)/bp.s,dxScreen=(px-bp.x)/bp.s;
  if(Math.abs(dt)>.16||Math.abs(dxScreen)>1.6||Math.abs(dyScreen)>1.4){w.result={kind:'miss',text:'STRIKE!'};return;}
  const quality=1-Math.abs(dt)/.16,power=.55+.45*quality*(1-Math.min(1,Math.abs(dxScreen)/1.6)*.4);
  const angle=clamp(18+dyScreen*28+(Math.random()-.5)*6,-12,72),dir=clamp(-dt*320+(Math.random()-.5)*8,-62,62);
  const v=60+power*55,rad=angle*Math.PI/180;let dist=angle<0?40+power*80:(v*v*Math.sin(2*rad)/32.2)*.62+20;
  w.hit={v,angle,dir,dist,t:0,dur:clamp(dist/140,1,2.6)};noise(.08,.12,{f0:3600,f1:900});voice(220,.06,.08,'square');vibrate(20);shake.kick(3+power*5);
  const foul=Math.abs(dir)>45;let kind,pts=0,text;
  if(foul){kind='foul';text='FOUL BALL';}else if(angle>60){kind='out';text='POP-UP';}else if(dist>=450){kind='hr';pts=5;text=`MOONSHOT! ${Math.round(dist)} FT`;}else if(dist>=375){kind='hr';pts=4;text=`HOME RUN! ${Math.round(dist)} FT`;}
  else if(dist>=300){kind='3b';pts=3;text='TRIPLE';}else if(dist>=225){kind='2b';pts=2;text='DOUBLE';}else if(dist>=110||angle<8&&power>.7){kind='1b';pts=1;text='SINGLE';}else{kind='out';text='GROUNDED OUT';}
  w.result={kind,pts,text};}
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur)return;ev.preventDefault();const p=s.pointer(ev);swing(cur,p.x,p.y);});
 s.on(document,'keydown',ev=>{if((ev.key===' '||ev.key==='Enter')&&cur&&cur.ball){ev.preventDefault();const bp=proj(cur.ball.x,cur.ball.y,0);swing(cur,bp.x,bp.y-bp.s*.2);}});
 s.hint('Tap when the ball reaches the plate. Early pulls it, late pushes it the other way; perfect timing hits hardest. Tap a little under the ball for a fly ball, over it for a grounder, and stay close to it or you whiff. Ten pitches; home runs 4, moonshots 5, triples 3, doubles 2, singles 1. Space swings.');
 function step(w,dt){
  shake.step(dt);w.t+=dt;w.bat=Math.max(0,w.bat-dt);w.crowd=Math.max(0,w.crowd-dt*.4);
  if(w.n>=PITCHES){w.done=true;return;}
  const P=list[w.n],K=KINDS[P.k];
  if(w.phase==='wind'&&w.t>=P.wind){w.phase='pitch';w.t=0;voice(160,.1,.05,'sine');}
  if(w.phase==='pitch'){const f=clamp(w.t/K.dur,0,1.25);const z=55*(1-f),brk=K.brk*Math.sin(Math.PI*Math.min(1,f))*1.2*f;w.ball={x:.4+(P.tx-.4)*f+brk,y:6.2+(P.ty-6.2)*f-(f>1?(f-1)*8:0),z:Math.max(-5,z)};
   if(w.hit){w.phase='hit';w.t=0;if(w.result.pts){w.score+=w.result.pts;w.crowd=w.result.kind==='hr'?1:.5;s.react?.(w.player,w.result.kind==='hr'?'win':'happy',1.6);if(w.result.kind==='hr'){[523,659,784,1046,1319].forEach((fq,k)=>voice(fq,.14,.05,'triangle',{delay:k*.08}));noise(2.2,.05,{f0:800,f1:1600,type:'bandpass',q:.5});}}w.results.push(w.result);}
   else if(f>=1.2){if(!w.result)w.result={kind:'take',text:Math.abs(P.tx)>.85||P.ty>3.5||P.ty<1.5?'BALL':'STRIKE'};if(w.result.text==='BALL')w.quote=QUOTES[0];w.results.push(w.result);w.phase='after';w.t=0;}}
  if(w.phase==='hit'){w.hit.t+=dt;if(w.hit.t>=w.hit.dur+.9){w.phase='after';w.t=.5;}}
  if(w.phase==='after'&&w.t>=1.1){w.n++;w.quote=w.result?.kind==='hr'&&w.result.pts===5?QUOTES[4]:w.result?.kind==='hr'&&rnd()<.5?QUOTES[1]:null;if(w.n<PITCHES)startPitch(w);}
 }
 function draw(w){
  layout();const {W,H,cx,hy}=G;
  x.setTransform(1,0,0,1,0,0);if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  // night sky, light towers, stands
  const sky=x.createLinearGradient(0,0,0,hy);sky.addColorStop(0,'#05060f');sky.addColorStop(1,'#1a2448');x.fillStyle=sky;x.fillRect(-10,-10,W+20,hy+10);
  for(const lx of [W*.12,W*.88]){x.fillStyle='#2a2a34';x.fillRect(lx-2,hy*.15,4,hy*.5);const g=x.createRadialGradient(lx,hy*.15,2,lx,hy*.15,W*.25);g.addColorStop(0,'#fff8d0aa');g.addColorStop(1,'#fff8d000');x.fillStyle=g;x.fillRect(lx-W*.25,hy*.15-W*.25,W*.5,W*.5);x.fillStyle='#fffbe0';x.fillRect(lx-14,hy*.12,28,8);}
  const standTop=hy*.45;x.fillStyle='#232a4a';x.beginPath();x.moveTo(-10,hy);x.lineTo(-10,standTop+20);x.quadraticCurveTo(cx,standTop-30,W+10,standTop+20);x.lineTo(W+10,hy);x.fill();
  for(let q=0;q<260;q++){const u=(q*0.618)%1,v=(q*0.377)%1;const X=u*W,Y=standTop+v*(hy-standTop)*.85+Math.abs(X-cx)/W*30;const jump=w.crowd>0&&Math.sin(q+performance.now()/90)>.3?-3*w.crowd:0;x.fillStyle=['#e8c8a8','#c88a6a','#f4e0c8','#8a5a3a'][q%4];x.fillRect(X,Y+jump,2.4,3);x.fillStyle=['#d8323a','#2a6bd8','#f4f4f4','#ffd23f'][q%4];x.fillRect(X-.5,Y+3+jump,3.4,3);}
  // outfield wall + grass + infield dirt (perspective)
  const wallY=proj(0,0,380).y;x.fillStyle='#1d4a2a';x.fillRect(-10,wallY-proj(0,10,380).s*10+proj(0,0,380).s*0,W+20,proj(0,10,380).s*10);
  const grass=x.createLinearGradient(0,wallY,0,H);grass.addColorStop(0,'#2f7a34');grass.addColorStop(1,'#4fa84a');x.fillStyle=grass;x.fillRect(-10,wallY,W+20,H-wallY+10);
  for(let q=0;q<8;q++){const z0=q*50,z1=z0+25,a=proj(-300,0,z1),b=proj(300,0,z1),c2=proj(300,0,z0),d=proj(-300,0,z0);x.fillStyle='#ffffff08';x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.lineTo(c2.x,c2.y);x.lineTo(d.x,d.y);x.fill();}
  const dirt=[[-63,0,63],[0,0,127],[63,0,63],[0,0,0]].map(([X,Y,Z])=>proj(X*.85,Y,Z));x.fillStyle='#b8865a';x.beginPath();dirt.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.closePath();x.fill();
  const mound=proj(0,0,60.5);x.fillStyle='#c8966a';x.beginPath();x.ellipse(mound.x,mound.y,9*mound.s,2.6*mound.s,0,0,Math.PI*2);x.fill();
  x.strokeStyle='#ffffffcc';x.lineWidth=2;for(const sgn of [-1,1]){const a=proj(0,0,0),b=proj(sgn*250,0,250);x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();}
  // pitcher: rival head on Wild Thing's body
  const rival=1-w.player,P=list[Math.min(w.n,PITCHES-1)],m=proj(0,0,58),ps=m.s;const wind=w.phase==='wind'?Math.min(1,w.t/P.wind):w.phase==='pitch'?1:0;
  x.save();x.translate(m.x,m.y);x.fillStyle='#e8e8ec';x.fillRect(-1*ps,-5.4*ps,2*ps,3.2*ps);x.fillStyle='#1a2a5a';x.fillRect(-1*ps,-2.4*ps,2*ps,2.4*ps);x.strokeStyle='#e8e8ec';x.lineWidth=.55*ps;x.lineCap='round';x.beginPath();x.moveTo(.8*ps,-4.8*ps);const arm=-Math.PI*(.2+wind*1.1);x.lineTo(.8*ps+Math.cos(arm)*2.4*ps,-4.8*ps+Math.sin(arm)*2.4*ps);x.stroke();x.restore();
  s.sprite(x,rival,m.x,m.y-6.6*ps,Math.max(18,2.8*ps),{exact:true,mood:w.result?.kind==='hr'?'sad':'angry'});
  // strike zone + plate
  const pl=[[-.71,0,0],[.71,0,0],[.71,0,-.7],[0,0,-1.4],[-.71,0,-.7]].map(([X,Y,Z])=>proj(X,Y,Z+1));x.fillStyle='#f4f4f4';x.beginPath();pl.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.closePath();x.fill();
  const z0=proj(-.71,3.5,0),z1=proj(.71,1.5,0);x.strokeStyle='#ffffff55';x.lineWidth=2;x.setLineDash([6,6]);x.strokeRect(z0.x,z0.y,z1.x-z0.x,z1.y-z0.y);x.setLineDash([]);
  // ball in flight
  if(w.ball&&w.phase==='pitch'){const b=w.ball,p=proj(b.x,b.y,b.z),sh=proj(b.x,0,b.z);x.fillStyle='#0005';x.beginPath();x.ellipse(sh.x,sh.y,Math.abs(.18*p.s),Math.abs(.06*p.s),0,0,Math.PI*2);x.fill();x.fillStyle='#fff';x.shadowColor='#fff';x.shadowBlur=8;x.beginPath();x.arc(p.x,p.y,Math.max(2.5,.19*p.s),0,Math.PI*2);x.fill();x.shadowBlur=0;}
  if(w.hit){const h=w.hit,f=Math.min(1,h.t/h.dur),rad=h.dir*Math.PI/180,d=h.dist*f,Y=Math.max(0,Math.tan(h.angle*Math.PI/180)*d*(1-f)*1.1+3*(1-f)),X=Math.sin(rad)*d,Z=Math.cos(rad)*d,p=proj(X,Y,Z);if(p.y>-50){x.fillStyle='#fff';x.shadowColor='#fff';x.shadowBlur=10;x.beginPath();x.arc(p.x,p.y,Math.max(2,.4*p.s),0,Math.PI*2);x.fill();x.shadowBlur=0;}
   label(x,`${Math.round(d)} FT`,cx,H*.22,clamp(W*.05,16,30),{fill:'#fff'});}
  // batter: your head + bat (bottom left, a right-handed hitter)
  const bs=Math.min(W,H)*.2,bx=Math.min(cx-W*.2,proj(-1.5,0,0).x-bs*.35),by=Math.min(H*.96,proj(0,0,-1).y+bs*.1);x.fillStyle='#e8e8ec';rr(x,bx-bs*.25,by-bs*.9,bs*.5,bs*.9,bs*.12);x.fill();x.fillStyle='#d8323a';x.fillRect(bx-bs*.25,by-bs*.62,bs*.5,bs*.08);
  const sw=w.bat>0?1-w.bat/.35:0,ba=-2.3+sw*3.2;x.strokeStyle='#c8964a';x.lineWidth=bs*.09;x.lineCap='round';x.beginPath();x.moveTo(bx+bs*.15,by-bs*.7);x.lineTo(bx+bs*.15+Math.cos(ba)*bs*1.1,by-bs*.7+Math.sin(ba)*bs*1.1);x.stroke();
  s.sprite(x,w.player,bx,by-bs*1.05,bs*.75,{exact:true});
  // HUD
  const fs=Math.max(13,Math.min(W,H)*.03);label(x,`${w.score} PTS`,14,24,fs*1.2,{fill:'#ffd23f',align:'left',font:`900 ${fs*1.2}px ${SANS}`});
  label(x,`PITCH ${Math.min(w.n+1,PITCHES)}/${PITCHES}`,14,24+fs*1.4,fs*.8,{fill:'#fff',align:'left',font:`800 ${fs*.8}px ${SANS}`});
  w.results.forEach((r,i)=>{x.fillStyle=r.kind==='hr'?'#ffd23f':r.pts?'#7dff6a':'#ffffff33';x.beginPath();x.arc(20+i*14,30+fs*2.4,5,0,Math.PI*2);x.fill();});
  if(w.player===1)label(x,`beat ${w.scores[0]}`,14,30+fs*3.6,fs*.75,{fill:'#ffffffaa',align:'left'});
  if(w.phase==='pitch'&&w.t<.35)label(x,KINDS[P.k].name,cx,H*.3,fs,{fill:'#9fd8ff'});
  if(w.result&&(w.phase==='hit'||w.phase==='after'))label(x,w.result.text,cx,H*.3,clamp(W*.06,20,40),{fill:w.result.kind==='hr'?'#ffd23f':w.result.pts?'#7dff6a':'#ff6a6a'});
  if(w.quote&&w.phase==='wind'){x.font=`italic 700 ${fs*.85}px Georgia, serif`;const tw=x.measureText(w.quote).width+24;x.fillStyle='#000c';rr(x,cx-tw/2,H-46,tw,30,10);x.fill();x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.fillText(`“${w.quote}”`,cx,H-31);}
  if(w.ending)label(x,'DERBY OVER',cx,H*.42,clamp(W*.07,22,46),{fill:'#fff'});
  s.debug={engine:'baseball',world:w,list};
 }
 const scores=await turnRunner(s,{seconds:999,endDelay:1.4,
  intro:(i,sc)=>i===0?`Home Run Derby. ${s.players[0].name} bats first against Wild Thing Vaughn (who looks a lot like ${s.players[1].name}). Tap when the ball reaches the plate: timing sets direction and power, tapping under the ball lifts it. Ten pitches.`:`${s.players[1].name}, same ten pitches (and now the pitcher looks like ${s.players[0].name}). Beat ${sc[0]}.`,
  make:()=>{cur=make();layout();return cur;},step,draw,done:w=>!!w.done,score:w=>w.score});
 if(!scores)return;
 s.finish(scores,`Home Run Derby · ${scores[0]} vs ${scores[1]}`);
}
Object.assign(exports,{baseball});
