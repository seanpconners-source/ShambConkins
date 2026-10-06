// Reservoir Dogs · Mexican Standoff. Simultaneous reflex duel, best of five, with fake-out cues and a
// third CPU gunman (Mr. Blonde) in the triangle rounds. Tap your half (or Space / Enter) to draw.
const {clamp}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const K=require("src/engines/tarantinoKit.js");
const {label,rr,lerp,filmOverlay,flash,titleCard,subtitle,makeFx,makeShake,makeSlowmo,sfx,halfPointers,keyboard,fmtMs}=K;

const TITLES=['THE STARE-DOWN','THE FAKE-OUT','THE TRIANGLE','NERVES OF STEEL','THE BLOODBATH'];
const FAKES=['ash','twitch','wait','phone','flicker','fly','cough'];
const WIN_LINES=['Clean. Like a bad dinner conversation.','Faster than a Royale with Cheese.','Surgical. Somebody practised in the mirror.','Say "what" again. Go on, I dare you.','That is a tasty burger. And a tasty draw.','Easy money. Very professional.'];
const FLINCH_LINES=['Flinched. Very unprofessional.','Jumped the gun. Literally.','Twitchy! Everybody saw that.','Nervous? That was a pretty big tell.','Patience is a virtue, Mr. Pink.'];
const VOID_LINES=['Everybody dies. Typical Tuesday.','Mr. Blonde sends his regards.','Nobody walks out of this one.'];
const TIMEOUT_LINES=['Nobody drew. Awkward.','Two statues and a sad lightbulb.'];
const WIN_AT=3,MAX_ROUNDS=7,MAX_T=5.2;

async function standoff(s){
 const [c,x]=s.canvas(900,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();s.queueCanvasFit?.();
 const fx=makeFx(),shake=makeShake(),slow=makeSlowmo(),rnd=()=>s.random(),pick=a=>a[Math.floor(rnd()*a.length)];
 const st={phase:'intro',t:0,round:0,played:0,voids:0,type:'duel',wins:[0,0],T:3,elapsed:0,fakes:[],taps:[null,null],ms:[null,null],winner:-1,loser:-1,res:null,cardT:0,
  pose:[0,0],dead:[0,0,0],deadT:[0,0,0],twitch:[0,0,0],flashT:[0,0,0],bullets:[],lightDip:0,light:1,fakeFx:[],caption:'',captionT:0,white:0,tri2:null,B:.6,over:false,beat:0,bw:0,bf:0,frameWall:performance.now(),pulse:0,intro:true};
 s.debug={engine:'standoff',st};
 const L={};
 const layout=()=>{const W=s.W,H=s.H,portrait=W<H*.95,hs=clamp(Math.min(W*(portrait?.27:.17),H*.22),44,125),tri=st.type==='tri';
  Object.assign(L,{W,H,hs,portrait,tri,cx:[W*(portrait?.24:.2),W*(portrait?.76:.8)],cy:H*(tri?(portrait?.62:.54):.43),bx:W/2,by:H*(portrait?.27:.3),bs:hs*.82});};
 const manPos=i=>i===2?{x:L.bx,y:L.by}:{x:L.cx[i],y:L.cy};
 const nm=i=>i===2?'MR. BLONDE':s.players[i].name;
 const typeFor=n=>(n===3||n===5)?'tri':'duel';

 function startRound(){
  st.round++;st.type=typeFor(st.played+1);layout();const n=st.played+1;
  Object.assign(st,{phase:'card',cardT:0,t:0,elapsed:0,taps:[null,null],ms:[null,null],winner:-1,loser:-1,res:null,tri2:null,fakeFx:[],bullets:[],pose:[st.type==='tri'?1:0,st.type==='tri'?1:0],dead:[0,0,0],deadT:[0,0,0],twitch:[0,0,0],flashT:[0,0,0],white:0,light:1,lightDip:0,beat:0,caption:'',captionT:0});
  fx.clear();
  const lo=st.type==='tri'?2.1:1.7+(n>2?.2:0);st.T=lo+rnd()*(4.9-lo);
  const nf=[1,2,2,3,3,3,3][n-1]||3;let last=.6;st.fakes=[];
  for(let k=0;k<nf;k++){const t=.6+rnd()*(st.T-.9);if(t<st.T-.1&&st.fakes.every(f=>Math.abs(f.t-t)>.5))st.fakes.push({t,kind:pick(FAKES),who:Math.floor(rnd()*(st.type==='tri'?3:2)),done:false});}
  st.fakes.sort((a,b)=>a.t-b.t);void last;
  st.B=n>=5?.46:.62;
 }
 function fireFake(f){
  const {kind,who}=f;const p=manPos(who);
  if(kind==='ash'){st.fakeFx.push({kind,t:0,life:1,x:p.x+(who===1?-1:1)*L.hs*.18,y:p.y+L.hs*.3});sfx.click();}
  else if(kind==='twitch'){st.twitch[who]=.3;sfx.click();}
  else if(kind==='wait'){st.caption=pick(['wait for it…','…not yet…','steady…','patience…']);st.captionT=1.5;}
  else if(kind==='phone'){st.fakeFx.push({kind,t:0,life:1.1});sfx.phone();}
  else if(kind==='flicker'){st.lightDip=.5;}
  else if(kind==='fly'){st.fakeFx.push({kind,t:0,life:1.4,ph:rnd()*6});sfx.buzz();}
  else if(kind==='cough'){st.fakeFx.push({kind,t:0,life:1,who});sfx.groan();}
 }
 const bullet=(from,to,onHit,speed=3.2)=>{const a=manPos(from),b=manPos(to);st.bullets.push({x0:a.x,y0:a.y+L.hs*.1,x1:b.x,y1:b.y,t:0,onHit,to,speed});st.flashT[from]=.1;sfx.gun();shake.kick(10);st.white=Math.max(st.white,.35);vibrate(18);slow.hit(.9,.22);};
 const kill=(i,dir=0)=>{st.dead[i]=1;st.deadT[i]=0;const p=manPos(i);fx.splat(p.x,p.y,{n:30,speed:340,dir:dir||null,spread:dir?1.2:6.28,size:Math.max(4,L.hs*.07)});fx.pop(p.x,p.y-L.hs*.7,'SPLAT!',{color:'#ff5148',size:clamp(L.hs*.3,16,34)});sfx.splat();shake.kick(14);};
 const resolve=(winner,loser,reason)=>{
  st.winner=winner;st.loser=loser;st.phase='shot';st.t=0;
  bullet(winner,loser,()=>kill(loser,loser===1?0:Math.PI),2.6);
  st.reason=reason;
 };
 function endRound(kind,winner){
  // kind: win | void | timeout. Sets result card.
  st.phase='result';st.t=0;let title,line;
  if(kind==='win'){st.wins[winner]++;st.played++;title=`${nm(winner)} WINS THE ROUND`;line=st.reason==='flinch'?pick(FLINCH_LINES):st.reason==='blonde'?'Mr. Blonde never saw it coming.':pick(WIN_LINES);s.react?.(winner,'win');s.react?.(1-winner,'sad');}
  else{st.voids++;title=kind==='void'?'BLOODBATH — NOBODY SCORES':'NOBODY DREW';line=pick(kind==='void'?VOID_LINES:TIMEOUT_LINES);if(st.voids<=2)line+=' Replaying the round.';else st.played++;}
  const ms=st.ms.map(v=>v?fmtMs(v):'');st.res={title,line,ms,kind,winner};s.setScores([...st.wins]);
  if(kind==='win')sfx.fanfare();else sfx.groan();
 }
 function flinch(i){
  const p=manPos(i);fx.pop(p.x,p.y-L.hs*.9,'FLINCH!',{color:'#ffd84a',size:clamp(L.hs*.32,16,36)});sfx.click();
  const w=1-i;resolve(w,i,'flinch');
 }
 function tap(i){
  if(st.over||s.paused||!s.alive)return;
  const wall=clamp((performance.now()-st.frameWall)/1000,0,.04);
  if(st.phase==='stare'){if(st.elapsed<.4)return;flinch(i);return;}
  if(st.phase==='draw'){
   const ms=(st.t+wall)*1000;if(st.taps[i]!==null)return;
   if(ms<90){flinch(i);return;}
   st.taps[i]=ms;st.ms[i]=ms;
   if(st.type==='tri'){
    const rival=1-i;st.winner=i;st.loser=rival;st.phase='tri2';st.t=0;st.tri2={w:i,left:st.B};bullet(i,rival,()=>kill(rival,rival===1?0:Math.PI),2.2);sfx.ding(660);
    const bp=manPos(2);fx.pop(bp.x,bp.y+L.hs*.7,'!',{color:'#ff3b2f',size:36});return;
   }
   resolve(i,1-i,'draw');return;
  }
  if(st.phase==='tri2'&&st.tri2&&i===st.tri2.w){st.tri2.hit=true;st.phase='shot';st.t=0;bullet(i,2,()=>{kill(2,-Math.PI/2);},2.6);st.reason='blonde';}
 }
 const input=halfPointers(s,{down:i=>tap(i)});void input;
 keyboard(s,(i,name,down)=>{if(down&&name==='act')tap(i);});
 s.hint('Tap your half of the screen (or P1 Space, P2 Enter) the instant you see DRAW! Tapping before it is a flinch and loses the round. Beware the fake-outs. In triangle rounds Mr. Blonde shoots whoever draws first: draw, then TAP AGAIN fast to drop him. First to three rounds.');
 if(!await s.pass(0,'Mexican Standoff: first to three rounds. Wait for DRAW! — flinch and you lose. Chapter three adds a third gunman, Mr. Blonde.','Both ready — nobody move',{countdown:3}))return;
 startRound();

 const keepBeat=(dt)=>{st.beat-=dt;if(st.beat<=0){const tension=clamp(st.elapsed/MAX_T,0,1);st.beat=lerp(.95,.4,tension);sfx.thump(.12+tension*.1);setTimeout(()=>sfx.thump(.07),110);st.pulse=1;}};
 s.frame((rdt,tt)=>{
  const dt=rdt,sdt=rdt*slow.k;st.frameWall=performance.now();layout();slow.step(rdt);shake.step(rdt);fx.step(sdt);
  st.pulse=Math.max(0,st.pulse-rdt*4);st.white=Math.max(0,st.white-rdt*2.4);st.captionT=Math.max(0,st.captionT-rdt);
  for(const k of [0,1,2]){st.twitch[k]=Math.max(0,st.twitch[k]-rdt);st.flashT[k]=Math.max(0,st.flashT[k]-rdt);if(st.dead[k])st.deadT[k]+=sdt;}
  st.lightDip=Math.max(0,st.lightDip-rdt);st.light=st.lightDip>0?(Math.sin(st.lightDip*50)>0?.2:.7):1;
  for(const f of st.fakeFx)f.t+=rdt;st.fakeFx=st.fakeFx.filter(f=>f.t<f.life);
  for(const b of st.bullets){b.t+=sdt*b.speed;if(b.t>=1&&!b.done){b.done=true;b.onHit?.();}}st.bullets=st.bullets.filter(b=>b.t<1.4);
  for(let i=0;i<2;i++){const target=(st.type==='tri'||st.phase==='draw'||st.phase==='tri2'||st.phase==='shot'||st.phase==='result')?1:0;st.pose[i]=clamp(st.pose[i]+(target>st.pose[i]?1:-1)*rdt*(target?9:3),0,1);if(st.dead[i])st.pose[i]=0;}
  st.t+=dt;
  if(st.phase==='card'){st.cardT+=dt;if(st.cardT>=1.9){st.phase='stare';st.t=0;st.elapsed=0;st.beat=.2;}}
  else if(st.phase==='stare'){
   st.elapsed+=dt;keepBeat(dt);
   for(const f of st.fakes)if(!f.done&&st.elapsed>=f.t){f.done=true;fireFake(f);}
   if(st.elapsed>=st.T){st.phase='draw';st.t=0;st.white=1;sfx.draw();shake.kick(8);vibrate(30);st.fakeFx=[];st.caption='';}
  }
  else if(st.phase==='draw'){if(st.t>(st.type==='tri'?2.4:2.2)){if(st.type==='tri'){const a=manPos(2);fx.pop(a.x,a.y,'BANG',{size:30});sfx.gun();}endRound('timeout');}}
  else if(st.phase==='tri2'){
   st.tri2.left-=dt;
   if(st.tri2.left<=0&&st.phase==='tri2'){const w=st.tri2.w;st.phase='shot';st.t=0;st.reason='void';bullet(2,w,()=>kill(w,w===1?0:Math.PI),2.4);}
  }
  else if(st.phase==='shot'){
   if(st.t>1.35&&st.bullets.length===0||st.t>3){
    if(st.reason==='void')endRound('void');else endRound('win',st.winner);
   }
  }
  else if(st.phase==='result'){
   if(st.t>2.7&&!st.over){
    const w=st.wins,done=w[0]>=WIN_AT||w[1]>=WIN_AT||st.played>=5||st.round>=MAX_ROUNDS;
    if(done){st.over=true;const txt=w[0]===w[1]?'Mexican standoff! Nobody blinked.':'Mexican Standoff';s.finish([w[0],w[1]],txt);}
    else startRound();
   }
  }
  draw(tt);
 });

 function drawBulbAndRoom(tension,tt){
  const {W,H}=L,floor=H*.76;
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#3a342b');g.addColorStop(floor/H,'#26221c');g.addColorStop(floor/H+.001,'#1b1814');g.addColorStop(1,'#0f0d0b');x.fillStyle=g;x.fillRect(0,0,W,H);
  // warehouse details: high windows with dusty light, pipes, crates
  x.fillStyle='#4a453a';for(let i=0;i<5;i++){const wx=W*(.08+i*.2);x.fillRect(wx,H*.06,W*.1,H*.16);x.fillStyle='#8d8567';x.globalAlpha=.25;x.fillRect(wx+3,H*.06+3,W*.1-6,H*.16-6);x.globalAlpha=1;x.fillStyle='#4a453a';}
  x.fillStyle='#2e2a23';x.fillRect(0,H*.27,W,H*.03);x.fillRect(0,H*.31,W,H*.015);
  x.strokeStyle='#ffffff08';x.lineWidth=2;for(let i=1;i<14;i++){x.beginPath();x.moveTo(W*i/14,0);x.lineTo(W*i/14,floor);x.stroke();}
  x.fillStyle='#3c3226';const cw=Math.min(W*.12,90);for(const [px,py,k] of [[.06,.78,1],[.14,.8,.8],[.9,.77,1.1],[.82,.8,.8]]){x.fillRect(W*px,H*py-cw*k*.5,cw*k,cw*k*.8);x.strokeStyle='#5b4a36';x.lineWidth=2;x.strokeRect(W*px,H*py-cw*k*.5,cw*k,cw*k*.8);}
  x.strokeStyle='#ffffff10';x.lineWidth=1.5;for(let i=-6;i<=6;i++){x.beginPath();x.moveTo(W/2+i*W*.03,floor);x.lineTo(W/2+i*W*.16,H);x.stroke();}
  // bulb
  const sway=Math.sin(tt*1.3)*W*.012*(1+tension),bx=W/2+sway,by=H*.14;
  x.strokeStyle='#111';x.lineWidth=2;x.beginPath();x.moveTo(W/2,0);x.lineTo(bx,by-10);x.stroke();
  const lg=x.createRadialGradient(bx,by,4,bx,by+H*.25,H*.65);lg.addColorStop(0,`rgba(255,226,150,${.5*st.light})`);lg.addColorStop(1,'rgba(255,200,100,0)');x.fillStyle=lg;x.beginPath();x.moveTo(bx-8,by);x.lineTo(bx+8,by);x.lineTo(bx+W*.42,floor+H*.1);x.lineTo(bx-W*.42,floor+H*.1);x.closePath();x.fill();
  x.fillStyle=st.light>.9?'#fff3c0':'#6a5d3a';x.beginPath();x.arc(bx,by,9+tension*3,0,6.3);x.fill();
  const bg=x.createRadialGradient(bx,by,2,bx,by,60+tension*30);bg.addColorStop(0,`rgba(255,235,170,${.7*st.light})`);bg.addColorStop(1,'rgba(255,235,170,0)');x.fillStyle=bg;x.beginPath();x.arc(bx,by,90,0,6.3);x.fill();
 }
 function drawBody(i,tt){
  const {hs}=L,p=manPos(i),dir=i===1?-1:(i===2?(st.type==='tri'?-1:0):1),blonde=i===2,size=blonde?L.bs:hs,dead=st.dead[i],dT=st.deadT[i];
  const drop=dead?Math.min(dT*dT*900,size*1.4):0,tw=st.twitch[i]>0?Math.sin(st.twitch[i]*80)*size*.04:0;
  x.save();x.translate(p.x+tw,p.y+drop);if(dead)x.rotate(Math.min(dT*1.6,.9)*(i===1?1:-1));
  // torso
  const tx=-size*.78,ty=size*.52,tw2=size*1.56,th=Math.max(size*1.1,L.H-p.y-drop-size*.3);
  x.fillStyle='#14120f';rr(x,tx,ty,tw2,th,size*.25);x.fill();
  x.fillStyle='#e9e5da';x.beginPath();x.moveTo(-size*.24,ty);x.lineTo(size*.24,ty);x.lineTo(0,ty+size*.7);x.closePath();x.fill();
  x.fillStyle='#0a0908';x.beginPath();x.moveTo(-size*.07,ty+size*.05);x.lineTo(size*.07,ty+size*.05);x.lineTo(size*.05,ty+size*.6);x.lineTo(-size*.05,ty+size*.6);x.closePath();x.fill();
  // head
  const sc=st.twitch[i]>0?1.07:1;x.save();x.scale(sc,sc);
  if(blonde){x.fillStyle='#d8b697';x.beginPath();x.arc(0,0,size*.45,0,6.3);x.fill();x.fillStyle='#e3c874';x.beginPath();x.arc(0,-size*.08,size*.47,Math.PI*1.05,Math.PI*1.95);x.fill();x.fillRect(-size*.47,-size*.1,size*.12,size*.3);x.fillRect(size*.35,-size*.1,size*.12,size*.3);
   x.fillStyle='#050505';rr(x,-size*.38,-size*.08,size*.76,size*.17,size*.07);x.fill();x.strokeStyle='#3a1a14';x.lineWidth=3;x.beginPath();x.moveTo(-size*.14,size*.26);x.quadraticCurveTo(0,size*(dead?.2:.32),size*.14,size*.26);x.stroke();}
  else s.sprite(x,i,0,0,size*1.12,{exact:true,mood:dead?'sad':st.winner===i&&st.phase!=='stare'&&st.phase!=='draw'?'win':st.phase==='draw'?'angry':'thinking'});
  x.restore();x.restore();
  // arm + gun (world space, not rotated)
  if(dead&&dT>.25)return;
  const sh={x:p.x+(dir||1)*size*.6,y:p.y+size*.78+drop},aimAt=aimTarget(i),ax=aimAt.x-sh.x,ay=aimAt.y-sh.y,al=Math.hypot(ax,ay)||1,pose=blonde?(st.type==='tri'?1:0):st.pose[i];
  const low={x:(dir||1)*.45,y:.9};let vx=lerp(low.x,ax/al,pose),vy=lerp(low.y,ay/al,pose);const vl=Math.hypot(vx,vy)||1;vx/=vl;vy/=vl;
  const arm=size*1.25,hx=sh.x+vx*arm,hy=sh.y+vy*arm,tremor=st.phase==='stare'?Math.sin(tt*40+i)*size*.006*(1+clamp(st.elapsed/MAX_T,0,1)*3):0;
  x.lineCap='round';x.strokeStyle='#14120f';x.lineWidth=size*.3;x.beginPath();x.moveTo(sh.x,sh.y);x.lineTo(hx,hy+tremor);x.stroke();
  x.fillStyle='#d8b697';x.beginPath();x.arc(hx,hy+tremor,size*.1,0,6.3);x.fill();
  const gl=size*.55,gx=hx+vx*gl,gy=hy+tremor+vy*gl;x.strokeStyle='#2a2a2a';x.lineWidth=size*.14;x.beginPath();x.moveTo(hx,hy+tremor);x.lineTo(gx,gy);x.stroke();x.strokeStyle='#8a8a8a';x.lineWidth=size*.04;x.beginPath();x.moveTo(hx,hy+tremor-size*.04);x.lineTo(gx,gy-size*.04);x.stroke();
  x.strokeStyle='#2a2a2a';x.lineWidth=size*.12;x.beginPath();x.moveTo(hx,hy+tremor);x.lineTo(hx-vy*size*.05+vx*size*-.05,hy+tremor+size*.2);x.stroke();
  if(st.flashT[i]>0){x.save();x.translate(gx,gy);x.rotate(Math.atan2(vy,vx));x.fillStyle='#fff2a0';x.beginPath();for(let k=0;k<10;k++){const r=k%2?size*.12:size*.42;x.lineTo(Math.cos(k*.628)*r+size*.15,Math.sin(k*.628)*r);}x.closePath();x.fill();x.fillStyle='#ff9a2a';x.beginPath();x.arc(size*.12,0,size*.12,0,6.3);x.fill();x.restore();}
  st['gun'+i]={x:gx,y:gy};
 }
 function aimTarget(i){
  if(st.type==='tri'){
   if(st.phase==='tri2'||st.phase==='shot'&&st.winner>=0){const w=st.winner;if(i===2)return manPos(w);if(i===w)return manPos(st.reason==='blonde'?2:1-w);}
   return i===0?manPos(1):i===1?manPos(2):manPos(0);
  }
  return manPos(1-i);
 }
 function draw(tt){
  const {W,H,hs}=L,tension=clamp(st.elapsed/MAX_T,0,1),stare=st.phase==='stare';
  x.save();shake.apply(x);
  const zoom=stare?1+tension*.05:1;x.translate(W/2,H*.45);x.scale(zoom,zoom);x.translate(-W/2,-H*.45);
  drawBulbAndRoom(tension,tt);
  // half tint
  x.fillStyle='#78b6ff12';x.fillRect(0,0,W/2,H);x.fillStyle='#ff9fc612';x.fillRect(W/2,0,W/2,H);
  fx.drawDecals(x);
  const order=st.type==='tri'?[2,0,1]:[0,1];for(const i of order)drawBody(i,tt);
  // fake-out visuals
  for(const f of st.fakeFx){
   const k=f.t/f.life;
   if(f.kind==='ash'){x.fillStyle=`rgba(255,${140+k*60|0},40,${1-k})`;x.beginPath();x.arc(f.x+Math.sin(f.t*9)*3,f.y+k*hs*.9,3,0,6.3);x.fill();x.fillStyle=`rgba(200,200,200,${.5-k*.5})`;x.beginPath();x.arc(f.x,f.y+k*hs*.9,6+k*8,0,6.3);x.fill();}
   else if(f.kind==='phone'){x.save();x.translate(W/2,H*.62);x.rotate(Math.sin(f.t*55)*.25);x.font=`${clamp(hs*.55,24,60)}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillText('☎️',0,0);x.restore();label(x,'RING RING',W/2,H*.62+hs*.45,clamp(hs*.2,11,22),{fill:'#e9e5da',alpha:1-k*.5});}
   else if(f.kind==='fly'){const fx2=W*(.2+.6*k)+Math.sin(f.t*14+f.ph)*14,fy=H*.52+Math.sin(f.t*5+f.ph)*H*.1+Math.cos(f.t*23)*6;x.fillStyle='#000';x.beginPath();x.arc(fx2,fy,3.2,0,6.3);x.fill();x.strokeStyle='#ffffff55';x.lineWidth=1;x.beginPath();x.ellipse(fx2,fy-3,4,2,Math.sin(f.t*80),0,6.3);x.stroke();}
   else if(f.kind==='cough'){const p=manPos(f.who);label(x,'*cough*',p.x+(f.who===1?-1:1)*hs*.9,p.y-hs*.6-k*14,clamp(hs*.2,11,22),{fill:'#e9e5da',alpha:1-k*.6,stroke:'#000'});}
  }
  fx.draw(x);
  // bullets
  for(const b of st.bullets){const t=Math.min(1,b.t),px=lerp(b.x0,b.x1,t),py=lerp(b.y0,b.y1,t);x.strokeStyle='#fff6c8';x.lineWidth=3;x.beginPath();x.moveTo(lerp(b.x0,b.x1,Math.max(0,t-.18)),lerp(b.y0,b.y1,Math.max(0,t-.18)));x.lineTo(px,py);x.stroke();x.fillStyle='#ffd24a';x.beginPath();x.arc(px,py,4,0,6.3);x.fill();}
  // blonde aiming laser during tri2
  if(st.phase==='tri2'&&st.tri2){const a=manPos(2),b=manPos(st.tri2.w),r=clamp(st.tri2.left/st.B,0,1);x.strokeStyle=`rgba(255,59,47,${.4+.5*(1-r)})`;x.lineWidth=2;x.setLineDash([8,8]);x.beginPath();x.moveTo(a.x,a.y+hs*.3);x.lineTo(b.x,b.y);x.stroke();x.setLineDash([]);
   x.strokeStyle='#ff3b2f';x.lineWidth=6;x.beginPath();x.arc(b.x,b.y,hs*.85*(.4+r*.6),-Math.PI/2,-Math.PI/2+6.283*r);x.stroke();}
  x.restore();
  // ----- HUD
  if(st.phase!=='card'){
   const fs=clamp(Math.min(W,H*1.4)*.034,12,22);
   for(let i=0;i<2;i++){const px=i?W-10:10;label(x,s.players[i].name.toUpperCase(),px,H*.06,fs,{align:i?'right':'left',fill:i?'#ff9fc6':'#78b6ff',stroke:'#000'});
    for(let k=0;k<WIN_AT;k++){const bx=(i?W-10-fs*.6-k*fs*1.25:10+fs*.6+k*fs*1.25),by=H*.06+fs*1.3;x.fillStyle=k<st.wins[i]?'#ffd24a':'#ffffff22';x.beginPath();x.arc(bx,by,fs*.42,0,6.3);x.fill();x.strokeStyle='#000';x.lineWidth=2;x.stroke();}}
   label(x,`ROUND ${st.played+1}${st.type==='tri'?' · TRIANGLE':''}`,W/2,H*.045,fs*.9,{fill:'#d9bd4a',stroke:'#000'});
   // tension meter
   const mw=clamp(W*.42,150,340),mx=W/2-mw/2,my=H-clamp(H*.05,22,36);
   x.fillStyle='#000a';rr(x,mx-4,my-4,mw+8,18+4,8);x.fill();
   const mg=x.createLinearGradient(mx,0,mx+mw,0);mg.addColorStop(0,'#e9c84a');mg.addColorStop(1,'#e0301f');x.fillStyle=mg;const fillW=stare||st.phase==='draw'?(st.phase==='draw'?mw:mw*tension):0;rr(x,mx,my,Math.max(0,fillW),14,6);x.fill();x.strokeStyle='#fff6';x.lineWidth=1.5;rr(x,mx,my,mw,14,6);x.stroke();
   label(x,'TENSION',W/2,my-14,fs*.7,{fill:'#e9e5da',stroke:'#000',alpha:.8});
   x.save();x.translate(mx-14,my+7);x.scale(1+st.pulse*.3,1+st.pulse*.3);label(x,'♥',0,0,fs*1.1,{fill:'#ff3b2f',stroke:'#000'});x.restore();
   if(stare&&st.elapsed>.4&&st.round<=1&&st.played===0)label(x,'TAP YOUR SIDE ONLY AFTER “DRAW!”',W/2,H*.2,fs*.95,{fill:'#fff',stroke:'#000',alpha:.5+.3*Math.sin(tt*4)});
   if(stare)for(let i=0;i<2;i++)label(x,'TAP',W*(i?.75:.25),H*.9-hs*.1,fs*1.3,{fill:'#ffffff',stroke:null,alpha:.1+.05*Math.sin(tt*3)});
   if(st.captionT>0)subtitle(x,W,H,st.caption,Math.min(1,st.captionT*3),H*.17);
   if(st.phase==='draw'){const k=Math.min(1,st.t*8);label(x,'DRAW!',W/2,H*.33,clamp(W*.17,46,150)*(.8+.2*k),{fill:'#ff3b2f',stroke:'#000',rot:-.06,lw:10});}
   if(st.phase==='tri2'&&st.tri2){const w=st.tri2.w,px=L.cx[w];label(x,'TAP AGAIN!',px,H*.2,clamp(W*.07,22,56)*(1+.08*Math.sin(tt*30)),{fill:'#ffe14a',stroke:'#7a1d12',lw:7});label(x,'BLONDE IS AIMING AT YOU',px,H*.2+clamp(W*.045,16,34),clamp(W*.022,10,16),{fill:'#fff',stroke:'#000'});}
  }
  if(st.phase==='result'&&st.res){
   const r=st.res,a=Math.min(1,st.t*5);x.fillStyle=`rgba(0,0,0,${.66*a})`;x.fillRect(0,H*.34,W,H*.3);
   x.globalAlpha=a;label(x,r.title,W/2,H*.42,clamp(Math.min(W*.05,H*.07),15,40),{fill:r.kind==='win'?'#ffe48a':'#ff8f80',stroke:'#000'});
   if(r.kind==='win'&&r.ms[r.winner])label(x,`${r.ms[r.winner]}${st.reason==='flinch'?' (flinch)':''}`,W/2,H*.49,clamp(Math.min(W*.04,H*.055),13,30),{fill:'#fff',stroke:'#000'});
   subtitle(x,W,H,r.line,1,H*.575);x.globalAlpha=1;
  }
  if(st.phase==='card'){titleCard(x,W,H,st.cardT,{chapter:Math.min(st.played+1,5),title:TITLES[Math.min(st.played,4)],sub:st.type==='tri'?'Mr. Blonde shoots whoever draws first. Draw, then tap again.':st.played===0?'tap your side after DRAW — never before':'steady now',life:1.9});}
  else filmOverlay(x,W,H,tt,{grain:.45,vignette:.4+tension*.4});
  flash(x,W,H,st.white*.9);
  s.setScores([...st.wins]);s.status(st.phase==='draw'?'DRAW!':stare?'Hands steady… wait for the signal':st.phase==='result'?st.res?.title||'':'Mexican Standoff');
 }
}
Object.assign(exports,{standoff});
