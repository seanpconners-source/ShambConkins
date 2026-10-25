// Kill Bill · Five Point Sword Duel, rebuilt as a Nidhogg-style tug-of-war fencing duel in the House of Blue Leaves.
// One touch kills. Swords sit high, middle or low: a thrust at the same height as your rival's blade is parried,
// anything else lands. A kill gives you the right of way: run for your exit while your rival respawns ahead of you.
// Both at once on your own half: drag left/right to walk, swipe up/down to change stance, tap to thrust.
// Reach your exit twice to win (or be furthest along after 2 minutes).
// Online (netField): each phone runs its own fighter and judges only thrusts at it (as it sees the other fighter), and
// player 2's phone shows the hall mirrored so you always start on the left and escape right. Fighter {f:{x,s,w}} 30/s;
// events (all with the round number) {th:[r,stance]} a thrust starts, {pr:[r]} parried it, {die:[r]} it killed me,
// {sp:[r,x]} I respawned, {esc:[r]} I escaped, {tu:[r,progress]} my 2-minute clock ran out (both progresses settle it).
const {clamp}=require("src/utils.js");
const {voice,noise,sfx,makeShake,makeFx,makeSlowmo,halfPointers,keyboard,label,SANS,mono}=require("src/engines/tarantinoKit.js");
const {vibrate}=require("src/audio.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");

const AL=360,COL=[{suit:'#f2c81e',stripe:'#151515'},{suit:'#f4f1ea',stripe:'#b8202a'}],STANCE_Y=[15.5,11,6.5],WIN=2,CAP=120;

async function sword2p(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.shared=true;s.updateScores();s.ownHud(true,true);
 const shake=makeShake(),fx=makeFx(),slow=makeSlowmo();const wins=[0,0];let state='wait',t=0,clock=0,camX=AL/2,way=-1,banner=null,silhouette=0;
 const F=[0,1].map(i=>({i,dir:i?-1:1,x:0,stance:1,lunge:0,cd:0,alive:true,respawn:0,walk:0,step:0,parried:0,kills:0}));
 const keys=[{},{}];
 const on=s.online||null,me=on?on.me:0,them=1-me,flip=me===1;let round=0,clockBase=0,roundT0=0,netBot=false;const tu=[null,null],seen={x:0,at:0};
 function reset(){F[0].x=AL/2-14;F[1].x=AL/2+14;for(const f of F){f.alive=true;f.lunge=0;f.cd=.4;f.stance=1;f.respawn=0;f.parried=0;}way=-1;camX=AL/2;seen.x=F[them].x;tu[0]=tu[1]=null;}
 const goal=f=>f.i===0?AL-8:8;
 function thrust(f){if(state!=='fight'||!f.alive||f.cd>0)return;f.lunge=.24;f.cd=.5;sfx.whoosh(900,2600,.06,.12);if(on&&f.i===me)nf.event({th:[round,f.stance]});}
 function setStance(f,d){if(!f.alive)return;const n=clamp(f.stance+d,0,2);if(n!==f.stance){f.stance=n;voice(1500+n*200,.03,.02,'triangle');}}
 const fingers=halfPointers(s,{chooseOwner:on?()=>me:undefined,
  move:(i,r)=>{r.ly??=r.sy;const dy=r.y-r.ly;if(Math.abs(dy)>26&&Math.abs(dy)>Math.abs(r.x-r.px)*1.2){setStance(F[i],dy<0?-1:1);r.ly=r.y;r.sx=r.x;}},
  up:(i,r,{cancelled})=>{if(!cancelled&&r.dist<16&&performance.now()-r.t0<280)thrust(F[i]);}});
 // online the screen's left/right are the world's own way round only for player 1 (player 2's hall is mirrored)
 keyboard(s,(i,name,down)=>{if(on){i=me;if(flip&&(name==='l'||name==='r'))name=name==='l'?'r':'l';}keys[i][name]=down;if(!down)return;if(name==='act')thrust(F[i]);if(name==='u')setStance(F[i],-1);if(name==='d')setStance(F[i],1);});
 s.hint(on?'Drag left/right to walk, swipe up/down to raise or lower your sword (high, middle, low), tap to thrust. A thrust at the same height as your rival\'s sword is parried; anything else kills. After a kill, run right for your exit before your rival stops you. Keys: A/D or ←/→, W/S, Space.':'P1 left half, P2 right half. Drag left/right to walk, swipe up/down to raise or lower your sword (high, middle, low), tap to thrust. A thrust at the same height as your rival\'s sword is parried; anything else kills. After a kill, run for your exit (P1 right, P2 left) before your rival stops you. Keys: P1 A/D, W/S, Space · P2 arrows, Enter.');
 function kill(att,vic){vic.alive=false;vic.respawn=1.6;att.kills++;way=att.i;const P=toScreen(vic.x,STANCE_Y[att.stance]);fx.splat(P.x,P.y,{n:40,speed:380,dir:(att.dir>0)!==flip?-.3:Math.PI+.3,spread:1.4,size:5});sfx.splat();sfx.shing();slow.hit(.55,.2);shake.kick(9);silhouette=.45;vibrate(40);
  s.react?.(att.i,'win',1.4);s.react?.(vic.i,'sad',1.6);banner={text:'GO!',t:1.2,i:att.i};}
 function parryFx(a,v){a.parried=v.parried=.3;sfx.shing();{const P=toScreen((a.x+v.x)/2,STANCE_Y[a.stance]);fx.spark(P.x,P.y,14,'#fff2b0',320);}shake.kick(3);voice(2600,.12,.03,'triangle');}
 function escaped(i){wins[i]++;s.setScores(wins);state='scored';clockBase=clock;banner={text:`${s.players[i].name.toUpperCase()} ESCAPES!`,t:2.6,i};sfx.fanfare();s.react?.(i,'win',2.2);}
 let toScreen=(X,Y)=>({x:X,y:Y});
 const nf=netField(s,{hz:30,pack:()=>{const f=F[me];return {x:+f.x.toFixed(2),s:f.stance,w:+f.walk.toFixed(1)};},
  unpack:(i,d)=>{const o=F[them];if(Number.isFinite(d?.x))seen.x=clamp(d.x,0,AL);if(d?.s===0||d?.s===1||d?.s===2)o.stance=d.s;if(Number.isFinite(d?.w))o.walk=clamp(d.w,-1,1);seen.at=performance.now();},
  onEvent:e=>{const k=Object.keys(e||{})[0],a=e?.[k];if(!Array.isArray(a)||a[0]!==round)return;const o=F[them],m=F[me];
   if(k==='th'){if(o.alive&&state==='fight'){if(a[1]===0||a[1]===1||a[1]===2)o.stance=a[1];o.lunge=.24;o.cd=.5;sfx.whoosh(900,2600,.06,.12);}}
   else if(k==='pr'){m.lunge=0;m.x=clamp(m.x-m.dir*7,3,AL-3);parryFx(m,o);}
   else if(k==='die'){if(o.alive){kill(m,o);o.respawn=99;}}
   else if(k==='sp'){o.alive=true;if(Number.isFinite(a[1]))o.x=seen.x=clamp(a[1],0,AL);o.stance=1;o.lunge=0;way=-1;}
   else if(k==='esc'){if(state==='fight'||state==='scored'||state==='tuwait')escaped(them);}
   else if(k==='tu'){if(Number.isFinite(a[1]))tu[them]=a[1];}}});
 // vs CPU: fighter 2 shadows your sword height to parry, switches height and thrusts in range, then runs for its exit
 // (i = the fighter it plays: online the test bot plays this phone's own)
 const cpu=isCpu(s);let cpuT=0;
 function cpuThink(dt,i=1){const tk=F[i],o=F[1-i],k=keys[i],rr=on?Math.random:s.random,home=i===0?'r':'l';k.l=k.r=false;if(state!=='fight'||!tk.alive)return;const sk=cpuSkill(s),d=Math.abs(o.x-tk.x);
  if(!o.alive||way===i){k[home]=true;return;}
  if(way===1-i||d>18)k[o.x<tk.x?'l':'r']=true;else if(d<11)k[o.x<tk.x?'r':'l']=true;
  cpuT-=dt;if(cpuT>0)return;cpuT=.42-sk*.3+rr()*.12;
  if(d<21&&tk.cd<=0&&rr()<.35+sk*.4){if(tk.stance===o.stance)setStance(tk,o.stance===0?1:o.stance===2?-1:rr()<.5?1:-1);thrust(tk);}
  else if(tk.stance!==o.stance&&rr()<.3+sk*.6)setStance(tk,o.stance>tk.stance?1:-1);}
 // online: the other fighter eases toward its last report, run on by its walk for a moment
 function theirStep(f,dt){const m=F[me],k=Math.min(.1,(performance.now()-(seen.at||performance.now()))/1000),tx=clamp(seen.x+f.walk*34*(way===f.i?1.15:1)*k,3,AL-3);
  f.cd=Math.max(0,f.cd-dt);f.parried=Math.max(0,f.parried-dt);if(!f.alive)return;f.x+=(tx-f.x)*Math.min(1,dt*20);if(f.lunge>0)f.lunge-=dt;
  f.dir=m.alive?Math.sign(m.x-f.x)||f.dir:(f.i===0?1:-1);if(f.walk)f.step+=dt*8*Math.abs(f.walk);}
 function step(dt){
  if(on)clock=clockBase+(performance.now()-roundT0)/1000;else clock+=dt;if(cpu)cpuThink(dt);if(on&&netBot)cpuThink(dt,me);
  for(const f of F){if(on&&f.i!==me){theirStep(f,dt);continue;}
   f.cd=Math.max(0,f.cd-dt);f.parried=Math.max(0,f.parried-dt);
   if(!f.alive){f.respawn-=dt;if(f.respawn<=0){const k=F[1-f.i];let nx=clamp(k.x+k.dir*0+(way===k.i?(k.i===0?1:-1)*58:0),12,AL-12);if(Math.abs(nx-k.x)<20)nx=clamp(k.x+(k.i===0?1:-1)*28,12,AL-12);f.x=nx;f.alive=true;f.stance=1;f.cd=.3;way=-1;if(on){nf.event({sp:[round,+nx.toFixed(2)]});nf.push();}}continue;}
   const o=F[1-f.i];f.dir=o.alive?Math.sign(o.x-f.x)||f.dir:(f.i===0?1:-1);
   let w=(keys[f.i].r?1:0)-(keys[f.i].l?1:0);const fg=[...fingers.values()].find(q=>q.i===f.i);if(fg){const dx=fg.x-fg.sx;if(Math.abs(dx)>12)w=clamp(dx/55,-1,1)*(flip?-1:1);}
   f.walk=w;let nx=f.x+w*34*dt*(way===f.i?1.15:1);
   if(f.lunge>0){f.lunge-=dt;const ph=.24-f.lunge;if(ph<.1)nx+=f.dir*22*dt;}
   if(o.alive){const min=o.stance===f.stance?13:5;if(f.dir>0&&nx>o.x-min)nx=Math.min(f.x,o.x-min);if(f.dir<0&&nx<o.x+min)nx=Math.max(f.x,o.x+min);}
   f.x=clamp(nx,3,AL-3);if(w)f.step+=dt*8*Math.abs(w);
   if(f.alive&&(f.i===0?f.x>=goal(f):f.x<=goal(f))){if(on)nf.event({esc:[round]});escaped(f.i);}}
  // thrust resolution (online: only thrusts at this phone's fighter)
  for(const a of F){if(!a.alive||a.lunge<=0||on&&a.i===me)continue;const ph=.24-a.lunge;if(ph<.06||ph>.18)continue;const v=F[1-a.i];if(!v.alive)continue;const tip=a.x+a.dir*(13+(ph>.08?5:2));
   if(a.dir*(tip-(v.x-a.dir*1.5))>=0&&Math.abs(v.x-a.x)<22){a.lunge=0;
    if(v.stance===a.stance&&v.dir===-a.dir){if(!on)a.x-=a.dir*7;v.x+=a.dir*5;parryFx(a,v);if(on){nf.event({pr:[round]});nf.push();}}
    else{kill(a,v);if(on){nf.event({die:[round]});nf.push();}}}}
  if(clock>=CAP&&state==='fight'){
   if(on){const p=me===0?F[0].x/AL:1-F[1].x/AL;tu[me]=+p.toFixed(4);state='tuwait';nf.event({tu:[round,tu[me]]});}
   else{state='timeup';const prog=[F[0].x/AL,1-F[1].x/AL];const w=prog[0]>prog[1]?0:prog[1]>prog[0]?1:-1;if(w>=0)wins[w]++;s.setScores(wins);banner={text:'TIME!',t:2.4,i:w};}}
 }
 // online: both clocks ran out; the one further along takes the round (same numbers on both phones)
 function timeUp(){const prog=me===0?[tu[me],tu[them]]:[tu[them],tu[me]];const w=prog[0]>prog[1]?0:prog[1]>prog[0]?1:-1;if(w>=0)wins[w]++;s.setScores(wins);state='timeup';banner={text:'TIME!',t:2.4,i:w};}
 async function startRound(){state='sync';await nf.start('r'+round);if(!s.alive)return;roundT0=performance.now();state='fight';if(round)banner={text:'ROUND '+(round+1),t:1.2,i:-1};}
 function drawFighter(f,ux,uy,bob){const C=COL[f.i],d=f.dir;x.save();x.translate(ux,0);
  const leg=Math.sin(f.step)*3*(Math.abs(f.walk)>0?1:0),lunge=f.lunge>0?1:0;
  x.lineCap='round';x.strokeStyle=C.suit;x.lineWidth=2.6;
  x.beginPath();x.moveTo(0,9);x.lineTo(-1.5*d+leg*.6,4.5);x.lineTo(-2*d+leg,0);x.moveTo(0,9);x.lineTo(1.6*d-leg*.6+lunge*2*d,4.5);x.lineTo(2.4*d-leg+lunge*3*d,0);x.stroke();
  x.fillStyle=C.suit;x.beginPath();x.moveTo(-2.6,9);x.lineTo(2.6,9);x.lineTo(2.2+lunge*d,17.5);x.lineTo(-2.2+lunge*d,17.5);x.closePath();x.fill();x.strokeStyle=C.stripe;x.lineWidth=.9;x.beginPath();x.moveTo(-2.2*d+lunge*d,17.4);x.lineTo(-2.5*d,9.2);x.stroke();
  const hy=STANCE_Y[f.stance],hx=d*(4.5+(f.lunge>0?5:0));x.strokeStyle=C.suit;x.lineWidth=2;x.beginPath();x.moveTo(.5*d+lunge*d,16);x.lineTo(hx,hy);x.stroke();
  // katana
  x.strokeStyle='#e8eef6';x.shadowColor=f.parried>0?'#fff2b0':'#9fd0ff';x.shadowBlur=f.parried>0?14:6;x.lineWidth=.8;x.beginPath();x.moveTo(hx,hy);x.lineTo(hx+d*13,hy-(f.stance===0?1.2:f.stance===2?-1.2:0));x.stroke();x.shadowBlur=0;
  x.strokeStyle='#2a2a2a';x.lineWidth=1.3;x.beginPath();x.moveTo(hx-d*1.8,hy+.3);x.lineTo(hx,hy);x.stroke();x.fillStyle='#c9a34a';x.fillRect(hx-.4,hy-1.2,.8,2.4);
  x.restore();}
 s.frame(rawDt=>{
  const W=s.W,H=s.H;slow.step(rawDt);const dt=rawDt*slow.k;t+=rawDt;shake.step(rawDt);fx.step(dt);silhouette=Math.max(0,silhouette-rawDt);if(banner){banner.t-=rawDt;}
  if(state==='fight')step(dt);
  if(on&&state!=='wait'&&state!=='sync')nf.tick(rawDt);
  if(state==='tuwait'&&tu[them]!==null)timeUp();
  if((state==='scored'||state==='timeup')&&banner.t<=0){if(wins.some(v=>v>=WIN)||state==='timeup'){state='over';s.finish(wins,`Blue Leaves duel · ${wins[0]}–${wins[1]}`);return;}reset();if(on){round++;void startRound();}else{state='fight';banner={text:'ROUND '+(wins[0]+wins[1]+1),t:1.2,i:-1};}}
  // camera (player 2's phone online: the hall mirrored, so your fighter is on the left and your exit on the right)
  const u=Math.min(W/62,(H-40)/52),VW=W/u,live=F.filter(f=>f.alive);let target=live.length===2?(F[0].x+F[1].x)/2:live.length?live[0].x+(live[0].i===0?1:-1)*VW*.2:camX;target=clamp(target,VW/2,AL-VW/2);camX+=(target-camX)*Math.min(1,rawDt*4);
  const floorY=H*.8,mx=flip?-1:1,sx=X=>(X-camX)*u*mx+W/2;toScreen=(X,Y)=>({x:sx(X),y:floorY-Y*u});const pc=flip?AL-camX:camX;
  x.setTransform(1,0,0,1,0,0);
  // House of Blue Leaves: wall, shoji panels, lanterns (parallax)
  const wall=x.createLinearGradient(0,0,0,floorY);wall.addColorStop(0,'#05081a');wall.addColorStop(1,'#0e1d4a');x.fillStyle=wall;x.fillRect(0,0,W,floorY);
  const pw=26*u*.8;for(let k=Math.floor((pc*.6-VW)/26);k<Math.ceil((pc*.6+VW)/26);k++){const X=(k*26-pc*.6)*u*.8+W/2;x.fillStyle='#e9f0ff18';x.fillRect(X,floorY*.18,pw*.86,floorY*.6);x.strokeStyle='#1a2a5a';x.lineWidth=2;for(let q=1;q<4;q++){x.beginPath();x.moveTo(X+pw*.86*q/4,floorY*.18);x.lineTo(X+pw*.86*q/4,floorY*.78);x.stroke();}for(let q=1;q<5;q++){x.beginPath();x.moveTo(X,floorY*.18+floorY*.6*q/5);x.lineTo(X+pw*.86,floorY*.18+floorY*.6*q/5);x.stroke();}
   if(k%3===0){const ly=floorY*.12+Math.sin(t*1.5+k)*3;x.fillStyle='#ff5a3a';x.shadowColor='#ff7a3a';x.shadowBlur=18;x.beginPath();x.ellipse(X+pw*.43,ly,pw*.1,pw*.14,0,0,Math.PI*2);x.fill();x.shadowBlur=0;}}
  // glass floor tiles
  x.fillStyle='#0b1636';x.fillRect(0,floorY,W,H-floorY);const tile=6*u;for(let k=Math.floor((camX-VW)/6);k<Math.ceil((camX+VW)/6);k++){const X=Math.min(sx(k*6),sx(k*6+6));x.fillStyle=k%2?'#2a6bd8':'#d9e8ff';x.globalAlpha=.55;x.fillRect(X,floorY,tile-1,(H-floorY)*.35);x.fillStyle=k%2?'#d9e8ff':'#2a6bd8';x.fillRect(X,floorY+(H-floorY)*.36,tile-1,(H-floorY)*.35);x.globalAlpha=1;}
  // exits
  for(const [gx,i] of [[AL-4,0],[4,1]]){const X=sx(gx);if(X<-80||X>W+80)continue;x.fillStyle=i===0?'#f2c81e':'#f4f1ea';x.globalAlpha=.25+.15*Math.sin(t*4);x.fillRect(X-8*u,floorY-34*u,16*u,34*u);x.globalAlpha=1;label(x,'EXIT',X,floorY-38*u,Math.max(12,5*u),{fill:i===0?'#f2c81e':'#f4f1ea'});}
  let sh=0,sv=0;if(shake.mag>.3){sh=(Math.random()-.5)*shake.mag;sv=(Math.random()-.5)*shake.mag;}
  x.setTransform(u*mx,0,0,-u,W/2-camX*u*mx+sh,floorY+sv);// world: y up from the floor
  for(const f of F){if(!f.alive)continue;x.fillStyle='#0006';x.beginPath();x.ellipse(f.x,-.6,5,1.2,0,0,Math.PI*2);x.fill();drawFighter(f,f.x,0,0);}
  x.setTransform(1,0,0,1,0,0);fx.drawDecals?.(x);fx.draw(x);
  for(const f of F){if(!f.alive)continue;s.sprite(x,f.i,sx(f.x)+f.dir*mx*u*.6,floorY-21*u,Math.max(26,8.5*u),{exact:true});}
  if(silhouette>0){mono(x,W,H,1);x.fillStyle=`rgba(40,90,255,${.55*silhouette/.45})`;x.globalCompositeOperation='multiply';x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over';}
  // HUD: arena progress bar + stance hints (online: this phone's player on the left)
  const hy=on?40:0,bw=Math.min(W*.5,360),bx=W/2-bw/2,by=14+hy,bar=X=>bx+(flip?1-X/AL:X/AL)*bw;x.fillStyle='#ffffff22';x.fillRect(bx,by,bw,4);for(const f of F){if(!f.alive)continue;x.fillStyle=COL[f.i].suit;x.fillRect(bar(f.x)-3,by-4,6,12);}x.fillStyle='#f2c81e';x.fillRect(bar(AL)-(flip?1:2),by-6,3,16);x.fillStyle='#f4f1ea';x.fillRect(bar(0)-(flip?2:1),by-6,3,16);
  for(let i=0;i<2;i++){const sd=flip?1-i:i;label(x,s.players[i].name,sd?W-(on?14:130):14,22+hy,15,{fill:COL[i].suit,align:sd?'right':'left',font:`900 15px ${SANS}`});for(let k=0;k<WIN;k++){x.fillStyle=k<wins[i]?COL[i].suit:'#ffffff22';x.fillRect(sd?W-(on?24:140)-k*14:16+k*14,34+hy,10,5);}
   const f=F[i];const gx=sd?W-(on?20:150):20;['HIGH','MID','LOW'].forEach((n,k)=>{x.fillStyle=f.stance===k?COL[i].suit:'#ffffff30';x.fillRect(sd?gx-30:gx,46+hy+k*8,24,5);});}
  label(x,String(Math.max(0,Math.ceil(CAP-clock))),W/2,36+hy,14,{fill:'#ffffffaa'});
  if(way>=0&&state==='fight'){label(x,(way===0)!==flip?'GO ▶▶':'◀◀ GO',W/2,H*.28,clamp(W*.07,22,44),{fill:COL[way].suit,alpha:.6+.4*Math.sin(t*10)});}
  if(state==='sync')label(x,'…',W/2,H*.4,clamp(W*.06,18,40),{fill:'#fff'});
  if(state==='tuwait')label(x,'TIME!',W/2,H*.4,clamp(W*.06,18,40),{fill:'#fff'});
  if(banner&&banner.t>0)label(x,banner.text,W/2,H*.4,clamp(W*.06,18,40),{fill:banner.i>=0?COL[banner.i].suit:'#fff',alpha:clamp(banner.t*2,0,1)});
  s.debug={engine:'sword2p',F,state,wins,way,camX,round,bot:on?()=>{netBot=true;return '';}:null};
 });
 const intro=on?`The House of Blue Leaves. You fight in ${me?'white':'yellow'} from the left and escape right; ${s.players[them].name} plays on the other phone. Drag to walk, swipe up/down to change sword height, tap to thrust. Same height = parry. A kill lets you run for your exit. Escape twice to win.`:`The House of Blue Leaves. ${s.players[0].name} (yellow) fights from the LEFT half and escapes right; ${s.players[1].name} (white) from the RIGHT half and escapes left. Drag to walk, swipe up/down to change sword height, tap to thrust. Same height = parry. A kill lets you run for your exit. Escape twice to win.`;
 if(!await s.pass(0,intro,'Both ready — fight!',{countdown:3}))return;
 reset();clock=0;if(on)await startRound();else state='fight';
}
Object.assign(exports,{sword2p});
