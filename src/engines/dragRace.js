// Fast & Furious · Quarter-Mile, rebuilt as a real drag race for two at once: a night strip with a Christmas tree,
// Dom's black Charger against Brian's orange Supra (your heads at the wheel), and a tachometer on each half of the
// screen. Hold your half to rev, keep the needle in the green and LET GO on the green light (early = red light).
// Then tap your half to shift when the needle hits the shift zone, and swipe up once for NOS. Best of three.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,makeShake,halfPointers,keyboard,label,SANS,rr}=require("src/engines/tarantinoKit.js");
const {makeBits,pixText}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

const QUARTER=402,REDLINE=8000,IDLE=900,RATIO=[615,330,226,170,136],ACC=[13.5,10.2,7.8,5.9,4.4],COL=['#1a1a22','#ff8a1f'],ACCENT=['#38c8ff','#ff8a1f'],CAR=['DODGE CHARGER','TOYOTA SUPRA'];
const torque=r=>.5+.5*Math.sin(Math.PI*clamp((r-1200)/7400,0,1));

async function dualrace(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.shared=true;s.updateScores();s.ownHud(true,true);
 const rand=seededRandom(s.seed+':drag'),shake=makeShake(),bits=makeBits();const wins=[0,0];let race=0,state='wait',t=0,tree=null,cars=[],msg=[null,null],best=[null,null],result=null,anim=0;
 const fresh=()=>[0,1].map(i=>({i,rpm:IDLE,rev:false,v:0,d:0,g:0,launched:false,foul:false,react:null,penalty:0,penT:0,nos:1,nosT:0,limiter:0,et:null,flame:0,shiftFx:0}));
 function startRace(){cars=fresh();msg=[null,null];result=null;tree={t:0,amber:1.0+rand()*1.2};state='stage';t=0;}
 function say(i,text,col='#fff'){msg[i]={text,t:1.1,col};}
 function launch(cr,early){if(cr.launched)return;cr.launched=true;
  if(early){cr.foul=true;cr.penalty=.7;say(cr.i,'RED LIGHT!','#ff3b3b');voice(160,.3,.06,'square');return;}
  cr.react=t-tree.green;const r=cr.rpm;if(r>=5600&&r<=7000){cr.v=3.2;say(cr.i,'PERFECT LAUNCH','#7dff6a');}else if(r<4200){cr.penalty=0;cr.bog=.9;say(cr.i,'BOGGED','#ffd23f');}else if(r>7400){cr.spin=1;say(cr.i,'WHEELSPIN','#ffd23f');}else{cr.v=1.5;say(cr.i,'GOOD LAUNCH');}
  noise(.5,.08,{f0:600,f1:200});}
 function shift(cr){if(state!=='race'||!cr.launched||cr.foul&&cr.penT<cr.penalty||cr.et!==null)return;if(cr.g>=RATIO.length-1){return;}
  const r=cr.rpm;cr.g++;cr.flame=.25;cr.shiftFx=.3;
  if(r>=6900&&r<7800){cr.v+=.6;say(cr.i,'PERFECT SHIFT','#7dff6a');voice(1320,.06,.04,'square');}else if(r<5600)say(cr.i,'EARLY SHIFT','#ffd23f');else if(r>=7800)say(cr.i,'LATE','#ffd23f');
  noise(.12,.06,{f0:1600,f1:500});vibrate(10);}
 function nos(cr){if(state!=='race'||!cr.launched||cr.nos<=0||cr.et!==null)return;cr.nos=0;cr.nosT=2.6;say(cr.i,'NOS!','#38c8ff');noise(.9,.07,{type:'highpass',f0:2000,f1:800});shake.kick(5);}
 const fingers=halfPointers(s,{
  down:(i)=>{const cr=cars[i];if(!cr)return;if(state==='stage'||state==='tree')cr.rev=true;else shift(cr);},
  up:(i,r,{cancelled})=>{const cr=cars[i];if(!cr)return;if(state==='stage'||state==='tree'||state==='race'&&!cr.launched){cr.rev=false;if(!cancelled&&(state==='tree'||state==='race'))launch(cr,state==='tree');}
   if(!cancelled&&state==='race'&&r.sy-r.y>60&&Math.abs(r.x-r.sx)<r.sy-r.y)nos(cr);}});
 keyboard(s,(i,name,down)=>{const cr=cars[i];if(!cr)return;if(name==='act'){if(state==='stage'||state==='tree'||state==='race'&&!cr.launched){cr.rev=down;if(!down&&(state==='tree'||state==='race'))launch(cr,state==='tree');}else if(down)shift(cr);}if(name==='u'&&down)nos(cr);});
 s.hint('Hold your half to rev before the start: keep the needle in the green, then let go on GREEN (early = red light). During the run tap your half to shift when the needle reaches the shift zone (perfect shifts give a kick). Swipe up once for NOS. Best of three. Keys: Space / Enter rev+shift, W / ↑ NOS.');
 function stepCar(cr,dt){
  if(!cr.launched){const target=cr.rev?REDLINE+300:IDLE;cr.rpm+=clamp(target-cr.rpm,-4200*dt,6500*dt);if(cr.rpm>REDLINE){cr.rpm=REDLINE-200*Math.random();}return;}
  if(cr.et!==null){cr.v=Math.max(0,cr.v-14*dt);cr.d+=cr.v*dt;cr.rpm=Math.max(IDLE,cr.v*RATIO[cr.g]);return;}
  if(cr.foul&&cr.penT<cr.penalty){cr.penT+=dt;cr.rpm=Math.max(IDLE,cr.rpm-3000*dt);return;}
  let a=ACC[cr.g]*torque(cr.rpm);if(cr.bog>0){cr.bog-=dt;a*=.45;}if(cr.spin>0){cr.spin-=dt;a*=.55;}
  if(cr.nosT>0){cr.nosT-=dt;a+=6.5;}
  cr.rpm=Math.max(IDLE*1.6,cr.v*RATIO[cr.g]);if(cr.rpm>=REDLINE){cr.rpm=REDLINE-Math.random()*250;a=0;cr.limiter+=dt;if(Math.random()<dt*20)voice(170,.03,.03,'square');}
  cr.v+=a*dt;cr.d+=cr.v*dt;cr.flame=Math.max(0,cr.flame-dt);cr.shiftFx=Math.max(0,cr.shiftFx-dt);
  if(cr.d>=QUARTER){cr.et=t-tree.green;cr.d=QUARTER;if(best[cr.i]===null||cr.et<best[cr.i])best[cr.i]=cr.et;}
 }
 function drawCar(i,X,Y,L,cr){const H=L*.32;x.save();x.translate(X,Y);
  // NOS / shift flames
  if(cr.nosT>0||cr.flame>0){x.fillStyle=cr.nosT>0?'#5ad2ff':'#ff9a2e';x.shadowColor=x.fillStyle;x.shadowBlur=14;x.beginPath();x.moveTo(-L*.5,-H*.3);x.lineTo(-L*.5-L*(.25+Math.random()*.2),-H*.22);x.lineTo(-L*.5,-H*.12);x.fill();x.shadowBlur=0;}
  x.fillStyle='#000a';x.beginPath();x.ellipse(0,H*.1,L*.52,H*.12,0,0,Math.PI*2);x.fill();
  x.fillStyle=COL[i];x.strokeStyle=ACCENT[i];x.lineWidth=1.5;x.beginPath();
  if(i===0){x.moveTo(-L*.5,-H*.05);x.lineTo(-L*.48,-H*.45);x.lineTo(-L*.2,-H*.5);x.lineTo(-L*.08,-H*.82);x.lineTo(L*.18,-H*.82);x.lineTo(L*.32,-H*.5);x.lineTo(L*.5,-H*.42);x.lineTo(L*.52,-H*.05);}
  else{x.moveTo(-L*.5,-H*.08);x.lineTo(-L*.47,-H*.5);x.lineTo(-L*.18,-H*.6);x.lineTo(-L*.02,-H*.86);x.lineTo(L*.2,-H*.86);x.lineTo(L*.4,-H*.5);x.lineTo(L*.52,-H*.3);x.lineTo(L*.5,-H*.05);}
  x.closePath();x.fill();x.stroke();
  x.fillStyle='#9fd8ff55';x.beginPath();x.moveTo(-L*.05,-H*.78);x.lineTo(L*.16,-H*.78);x.lineTo(L*.27,-H*.52);x.lineTo(-L*.15,-H*.52);x.closePath();x.fill();
  if(i===0){x.fillStyle='#c9ccd6';x.fillRect(L*.05,-H*.98,L*.12,H*.18);}else{x.fillStyle=ACCENT[1];x.fillRect(-L*.5,-H*.62,L*.1,H*.06);}
  x.fillStyle=ACCENT[i];x.fillRect(-L*.45,-H*.28,L*.92,H*.05);
  const spin=cr.d/2;for(const wx of [-L*.32,L*.32]){x.fillStyle='#0d0d10';x.beginPath();x.arc(wx,0,H*.3,0,Math.PI*2);x.fill();x.strokeStyle='#bbb';x.lineWidth=1.2;x.beginPath();for(let k=0;k<5;k++){const a=spin+k*Math.PI*2/5;x.moveTo(wx,0);x.lineTo(wx+Math.cos(a)*H*.2,Math.sin(a)*H*.2);}x.stroke();}
  x.restore();s.sprite(x,i,X+L*.07,Y-H*.66,Math.max(22,H*.62),{exact:true});}
 function drawTach(cr,cx,cy,R){
  x.save();x.translate(cx,cy);x.fillStyle='#07070c';x.beginPath();x.arc(0,0,R,0,Math.PI*2);x.fill();x.strokeStyle=ACCENT[cr.i];x.lineWidth=3;x.stroke();
  const a0=Math.PI*.75,span=Math.PI*1.5,ang=r=>a0+span*clamp(r/9000,0,1);
  const arc=(r0,r1,col,w)=>{x.strokeStyle=col;x.lineWidth=w;x.beginPath();x.arc(0,0,R*.82,ang(r0),ang(r1));x.stroke();};
  arc(0,9000,'#ffffff18',R*.12);if(!cr.launched)arc(5600,7000,'#7dff6a',R*.12);else arc(6900,7800,'#7dff6a',R*.12);arc(8000,9000,'#ff3b3b',R*.12);
  x.fillStyle='#fff';x.font=`700 ${R*.13}px ${SANS}`;x.textAlign='center';x.textBaseline='middle';for(let k=0;k<=9;k++){const a=ang(k*1000);x.fillText(String(k),Math.cos(a)*R*.6,Math.sin(a)*R*.6);}
  const a=ang(cr.rpm);x.strokeStyle='#ff4040';x.lineWidth=R*.05;x.lineCap='round';x.beginPath();x.moveTo(-Math.cos(a)*R*.12,-Math.sin(a)*R*.12);x.lineTo(Math.cos(a)*R*.85,Math.sin(a)*R*.85);x.stroke();x.fillStyle='#ddd';x.beginPath();x.arc(0,0,R*.07,0,Math.PI*2);x.fill();
  const shiftLight=cr.launched&&cr.rpm>=6900&&cr.et===null;x.fillStyle=shiftLight?(Math.floor(anim*16)%2?'#7dff6a':'#fff'):'#1a2a1a';x.beginPath();x.arc(0,-R*.42,R*.09,0,Math.PI*2);x.fill();
  label(x,cr.launched?String(cr.g+1):'N',0,R*.36,R*.28,{fill:ACCENT[cr.i],stroke:null,font:`900 ${R*.28}px ${SANS}`});
  label(x,`${Math.round(cr.v*2.237)} MPH`,0,R*.62,R*.12,{fill:'#fff',stroke:null,font:`800 ${R*.12}px ${SANS}`});
  for(let k=0;k<1;k++){x.fillStyle=cr.nos>0?'#38c8ff':cr.nosT>0?'#7fe8ff':'#333';rr(x,R*.62,R*.45,R*.18,R*.4,4);x.fill();pixText(x,'NOS',R*.71,R*.92,R*.022,'#fff',{align:'center'});}
  x.restore();}
 s.frame(dt=>{
  const W=s.W,H=s.H;anim+=dt;shake.step(dt);bits.step(dt);for(const m of msg)if(m)m.t-=dt;
  if(state==='stage'||state==='tree'||state==='race'){t+=dt;for(const cr of cars)stepCar(cr,dt);}
  if(state==='stage'){if(t>1.2){state='tree';tree.t0=t;}}
  if(state==='tree'){const k=t-tree.t0;if(k>=tree.amber+1.2){state='race';tree.green=t;voice(1046,.3,.06,'square');}else{const n=Math.floor((k-tree.amber)/.4);if(k>tree.amber&&n!==tree.n&&n<3){tree.n=n;voice(523,.12,.05,'square');}}}
  if(state==='race'){for(const cr of cars)if(!cr.launched&&t-tree.green>3)launch(cr,false);
   if(cars.every(cr=>cr.et!==null)||cars.some(cr=>cr.et!==null)&&t-tree.green>(Math.min(...cars.map(cr=>cr.et??99))+4)){
    const ets=cars.map(cr=>(cr.et??99)+cr.penalty);const w=ets[0]<ets[1]?0:ets[1]<ets[0]?1:-1;if(w>=0){wins[w]++;s.react?.(w,'win',2);s.react?.(1-w,'sad',1.5);}s.setScores(wins);result={w,ets,t:3};state='result';[523,659,784,1046].forEach((f,k)=>voice(f,.14,.05,'triangle',{delay:k*.09}));}}
  if(state==='result'){result.t-=dt;if(result.t<=0){if(wins.some(v=>v>=2)||race>=2){state='over';s.finish(wins,`Quarter mile · ${wins[0]}–${wins[1]} · best ${best.map(b=>b?b.toFixed(2)+'s':'—').join(' / ')}`);return;}race++;startRace();}}
  // ---------- draw
  x.setTransform(1,0,0,1,0,0);const portrait=H>W*1.05,trackH=portrait?H*.42:H*.5,top=44;
  const sky=x.createLinearGradient(0,0,0,trackH+top);sky.addColorStop(0,'#05040e');sky.addColorStop(1,'#1d1238');x.fillStyle=sky;x.fillRect(0,0,W,H);
  if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  const gap=cars.length?Math.abs(cars[0].d-cars[1].d):0,camX=cars.length?(cars[0].d+cars[1].d)/2:0,pxm=clamp(W*.5/(gap+10),W/160,W/45);// both cars always in view
  // city skyline + stadium lights (parallax)
  x.fillStyle='#120c24';for(let k=0;k<30;k++){const bx=((k*97-camX*pxm*.15)%(W+200)+W+200)%(W+200)-100,bh=trackH*(.25+((k*37)%10)/22);x.fillRect(bx,top+trackH*.55-bh,60,bh);}
  for(let k=0;k<8;k++){const lx=((k*230-camX*pxm*.5)%(W+300)+W+300)%(W+300)-150;x.fillStyle='#2a2a38';x.fillRect(lx,top+trackH*.12,3,trackH*.5);x.fillStyle='#fff6c8';x.shadowColor='#fff6c8';x.shadowBlur=20;x.fillRect(lx-8,top+trackH*.1,19,6);x.shadowBlur=0;}
  // strip
  const lane=[top+trackH*.9,top+trackH*.64];x.fillStyle='#24232c';x.fillRect(0,top+trackH*.5,W,trackH*.55);x.fillStyle='#d8d8e0';x.fillRect(0,top+trackH*.76,W,2);
  for(let m=Math.floor((camX-W/pxm)/10)*10;m<camX+W/pxm;m+=10){const X=W*.5+(m-camX)*pxm;x.fillStyle=m%100===0?'#fff':'#ffffff33';x.fillRect(X,top+trackH*.52,2,trackH*.5);}
  const finishX=W*.5+(QUARTER-camX)*pxm;if(finishX<W+20){for(let k=0;k<10;k++){x.fillStyle=k%2?'#000':'#fff';x.fillRect(finishX,top+trackH*.5+k*trackH*.05,8,trackH*.05);x.fillStyle=k%2?'#fff':'#000';x.fillRect(finishX+8,top+trackH*.5+k*trackH*.05,8,trackH*.05);}}
  const startX=W*.5+(0-camX)*pxm+20;if(startX>-60){x.fillStyle='#222';x.fillRect(startX+30,top+trackH*.12,10,trackH*.5);const lt=(k,col)=>{x.fillStyle=col;x.beginPath();x.arc(startX+35,top+trackH*.16+k*trackH*.07,trackH*.025,0,Math.PI*2);x.fill();};
   const k=state==='tree'?t-tree.t0:state==='race'?99:-1;for(let q=0;q<3;q++)lt(q,k>tree?.amber+q*.4?'#ffb000':'#3a2a00');lt(3,state==='race'?'#3dff6a':'#003a10');lt(4,cars.some(cr=>cr.foul)?'#ff2020':'#3a0000');}
  for(const cr of cars){const L=Math.min(W*.17,trackH*.46);drawCar(cr.i,W*.5+(cr.d-camX)*pxm,lane[cr.i]-trackH*.02,L,cr);}
  // tachs
  const R=Math.min(portrait?W*.23:W*.14,(H-top-trackH)*.4);for(const cr of cars){const cx=portrait?(cr.i?W*.75:W*.25):(cr.i?W*.8:W*.2),cy=top+trackH+(H-top-trackH)*.5;drawTach(cr,cx,cy,R);
   label(x,`${s.players[cr.i].name} · ${CAR[cr.i]}`,cx,cy-R-14,Math.max(11,R*.12),{fill:ACCENT[cr.i],font:`900 ${Math.max(11,R*.12)}px ${SANS}`});
   const m=msg[cr.i];if(m&&m.t>0)label(x,m.text,cx,cy+R+16,Math.max(14,R*.17),{fill:m.col,alpha:clamp(m.t*2,0,1)});
   if(cr.et!==null)label(x,`${(cr.et+cr.penalty).toFixed(3)}s`,cx,cy-R-34,Math.max(14,R*.17),{fill:'#fff'});}
  // centre info
  const midX=W/2,midY=top+trackH+(H-top-trackH)*.5;
  label(x,`RACE ${race+1}`,midX,portrait?top+trackH+16:midY-30,16,{fill:'#ffffffaa'});for(let i=0;i<2;i++)for(let k=0;k<2;k++){x.fillStyle=k<wins[i]?ACCENT[i]:'#ffffff22';x.fillRect(midX+(i?10+k*14:-22-k*14),portrait?top+trackH+30:midY-14,10,6);}
  if(state==='stage')label(x,'HOLD TO REV',midX,top+trackH*.35,22,{fill:'#ffd23f'});
  if(state==='tree')label(x,'LET GO ON GREEN',midX,top+trackH*.35,22,{fill:'#ffd23f'});
  if(state==='race'&&t-tree.green<.8)label(x,'GO!',midX,top+trackH*.35,40,{fill:'#3dff6a'});
  if(state==='result')label(x,result.w<0?'DEAD HEAT':`${s.players[result.w].name.toUpperCase()} WINS`,midX,top+trackH*.35,30,{fill:result.w<0?'#fff':ACCENT[result.w]});
  bits.draw(x);s.debug={engine:'dualrace',cars,state,wins,race,tree};
 });
 if(!await s.pass(0,`Quarter-mile drag race. ${s.players[0].name} drives the Charger (LEFT half), ${s.players[1].name} the Supra (RIGHT). Hold to rev, let go on green; tap to shift in the green zone; swipe up once for NOS. Best of three.`,'Both ready — race!',{countdown:0}))return;
 startRace();
}
Object.assign(exports,{dualrace});
