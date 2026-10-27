// The Warriors · Come Out to Play, rebuilt as a Streets of Rage style belt-scrolling beat 'em up on the long walk home
// to Coney Island. You wear the Warriors' vest; the Baseball Furies (face paint, bats), the Punks on roller skates and
// the Orphans come at you in waves, wearing your rival's head. Drag like a joystick to walk (up/down moves in depth),
// tap to punch (third hit of a combo knocks down), flick to throw a flying kick that way. Turn-based, same waves.
// Online (s.online) both Warriors walk the same street AT ONCE, each on their own phone (partner from snapshots, edge
// arrow when off screen). Player 1's phone runs the gangs (spawns, AI, who they go for) and streams them; the other phone
// sends its hits {h} and judges the swings aimed at its own Warrior {sw}. A KO'd Warrior watches until the fight is
// cleared, then comes back next to the partner with half health; both down = the run ends. First home to Coney Island
// gives the partner 10 s. KOs score for whoever lands them; highest score wins.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,sfx,makeShake,makeFx,label,SANS,rr}=require("src/engines/tarantinoKit.js");
const {turnRunner}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");
const {netField}=require("src/engines/netField.js");
const {partnerArrow}=require("src/engines/partnerArrow.js");
const NET_GRACE=10,ARENA=140; // online: seconds the partner gets after the first one home; width of a locked fight

const GANGS={fury:{name:'BASEBALL FURIES',hp:4,sp:22,reach:15,dmg:1,col:'#f2efe6',stripe:'#1a1a1a',pts:150},punk:{name:'PUNKS',hp:3,sp:34,reach:9,dmg:1,col:'#3a7ac8',stripe:'#e8c41e',pts:100},orphan:{name:'ORPHANS',hp:2,sp:20,reach:9,dmg:1,col:'#7a6a5a',stripe:'#4a3a2a',pts:75}};
const STAGE_LEN=900;

async function brawler(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const shake=makeShake(),fx=makeFx();let cur=null,view=null;const stick={id:null,sx:0,sy:0,x:0,y:0,t0:0};const keys={};
 const net=s.online||null,me=net?net.me:0,them=1-me,host=!net||me===0;let nf=null,nextId=1,bot=null;const ev=e=>{nf?.event(e);},lost=new Set();
 const rnd=seededRandom(s.seed+':warriors');const WAVES=Array.from({length:7},(_,i)=>({at:36+i*120,list:Array.from({length:2+Math.min(3,Math.floor(i/2))},()=>{const r=rnd();return {g:r<.4?'fury':r<.7?'punk':'orphan',side:rnd()<.6?1:-1,dy:rnd()}})}));
 function make(){return {p:{x:30,y:.5,face:1,hp:6,maxHp:6,combo:0,comboT:0,atk:0,kick:0,kvx:0,kvy:0,inv:0,stun:0,step:0},foes:[],wave:0,camX:0,score:0,kos:0,lock:false,pops:[],flash:0,dead:false,won:false};}
 // online the fight is a fixed ARENA-wide stretch around the leading Warrior, the same on both phones
 function spawnWave(w,lead){const wv=WAVES[w.wave++];w.lock=true;if(net)w.lx0=clamp(lead-ARENA/2,0,STAGE_LEN-ARENA);const L0=net?w.lx0:w.camX,L1=net?w.lx0+ARENA:w.camX+view.vw;
  for(const e of wv.list){const G=GANGS[e.g];w.foes.push({id:nextId++,g:e.g,x:e.side>0?L1+20:L0-20,y:.15+e.dy*.75,hp:G.hp,face:-e.side,state:'walk',t:0,wind:0,kb:0,kvx:0,stun:0,down:0,step:Math.random()*6});}voice(220,.2,.05,'sawtooth',{lp:900});}
 function hitFoe(w,f,dmg,kx,knock,remote=false){const G=GANGS[f.g];
  // online: the other phone's hits go to player 1's phone, which owns the gangs (the KO still scores on the hitter's phone)
  if(net&&!host&&!remote)ev({h:[f.id,dmg,Math.round(kx),knock?1:0]});if(remote&&f.hp<=0)return;f.hp-=dmg;f.stun=.35;f.kvx=kx;f.wind=0;fx.splat(view.sx(f.x),view.sy(f.y)-view.k*20,{n:8,speed:160,size:3,decal:false,color:'#ffe9a8'});noise(.08,.1,{f0:900,f1:200});voice(120+Math.random()*40,.08,.07,'square');shake.kick(knock?6:3);vibrate(12);
  if(knock||f.hp<=0){f.down=f.hp<=0?99:1;f.kvx=kx*1.6;}
  if(f.hp<=0&&net&&!host){f.lk=true;lost.add(f.id);}
  if(f.hp<=0&&!remote){w.score+=G.pts+w.p.combo*10;w.kos++;w.pops.push({x:f.x,y:f.y,text:`+${G.pts}`,t:1,c:'#ffd23f'});s.react?.(w.player,'happy',.6);}}
 function punch(w){const p=w.p;if(p.atk>0||p.kick>0||p.stun>0||w.dead)return;p.combo=p.comboT>0?(p.combo%3)+1:1;p.comboT=.55;p.atk=.22;sfx.whoosh(800,2400,.05,.1);
  for(const f of w.foes)if(f.down<=0&&Math.abs(f.y-p.y)<.18&&(f.x-p.x)*p.face>0&&Math.abs(f.x-p.x)<17){hitFoe(w,f,1,p.face*(p.combo===3?60:22),p.combo===3);if(p.combo===3)w.pops.push({x:f.x,y:f.y,text:'CAN YOU DIG IT?',t:1.1,c:'#ff8a3a'});}}
 function kick(w,dx,dy){const p=w.p;if(p.kick>0||p.stun>0||w.dead)return;const d=Math.hypot(dx,dy)||1;p.kick=.42;p.kvx=dx/d*120;p.kvy=dy/d*.9;p.face=dx>=0?1:-1;sfx.whoosh(500,2000,.08,.2);}
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur)return;ev.preventDefault();const p=s.pointer(ev);if(stick.id===null){stick.id=ev.pointerId;stick.sx=stick.x=p.x;stick.sy=stick.y=p.y;stick.t0=performance.now();stick.max=0;s.capture(ev);}else punch(cur);});
 s.on(c,'pointermove',ev=>{if(ev.pointerId!==stick.id||s.paused)return;ev.preventDefault();const p=s.pointer(ev);stick.x=p.x;stick.y=p.y;stick.max=Math.max(stick.max,Math.hypot(p.x-stick.sx,p.y-stick.sy));});
 for(const ty of ['pointerup','pointercancel'])s.on(c,ty,ev=>{if(ev.pointerId!==stick.id)return;s.release(ev);const dt=performance.now()-stick.t0,dx=stick.x-stick.sx,dy=stick.y-stick.sy,d=Math.hypot(dx,dy);stick.id=null;if(ty!=='pointerup'||!cur)return;if(d<14&&dt<300)punch(cur);else if(d>40&&dt<260)kick(cur,dx,dy*.6);});
 s.on(document,'keydown',ev=>{keys[ev.key.toLowerCase()]=true;if(!cur)return;if(ev.key===' '||ev.key==='Enter')punch(cur);if(ev.key==='Shift'||ev.key.toLowerCase()==='k')kick(cur,cur.p.face,0);});s.on(document,'keyup',ev=>{keys[ev.key.toLowerCase()]=false;});
 s.resetOnPause(()=>{stick.id=null;for(const k in keys)keys[k]=false;});
 s.hint('Hold and drag like a joystick to walk (up and down move you deeper or closer). Tap to punch; the third punch of a combo knocks them down. Flick to throw a flying kick in that direction. Clear each gang, then follow the GO arrow toward Coney Island. Keys: arrows/WASD, Space punch, Shift kick.');
 function step(w,dt){
  fx.step(dt);shake.step(dt);w.flash=Math.max(0,w.flash-dt*2);for(const q of w.pops)q.t-=dt;w.pops=w.pops.filter(q=>q.t>0);
  const p=w.p;if(!net&&(w.dead||w.won))return;
  if(!w.dead&&!w.won){
  p.comboT=Math.max(0,p.comboT-dt);p.atk=Math.max(0,p.atk-dt);p.inv=Math.max(0,p.inv-dt);p.stun=Math.max(0,p.stun-dt);
  if(p.kick>0){p.kick-=dt;p.x+=p.kvx*dt;p.y=clamp(p.y+p.kvy*dt,0,1);for(const f of w.foes)if(f.down<=0&&!f.kicked&&Math.abs(f.y-p.y)<.2&&Math.abs(f.x-p.x)<12){f.kicked=true;hitFoe(w,f,2,Math.sign(p.kvx||p.face)*80,true);}if(p.kick<=0)for(const f of w.foes)f.kicked=false;}
  else if(p.stun<=0){let ax=((keys.arrowright||keys.d)?1:0)-((keys.arrowleft||keys.a)?1:0),ay=((keys.arrowdown||keys.s)?1:0)-((keys.arrowup||keys.w)?1:0);
   if(stick.id!==null&&performance.now()-stick.t0>120){const dx=stick.x-stick.sx,dy=stick.y-stick.sy,d=Math.hypot(dx,dy);if(d>10){ax=dx/d*clamp(d/50,0,1);ay=dy/d*clamp(d/50,0,1);}}
   if(bot)[ax,ay]=bot(w);
   p.x+=ax*42*dt;p.y=clamp(p.y+ay*.9*dt,0,1);if(ax)p.face=ax>0?1:-1;if(ax||ay)p.step+=dt*10;}
  }
  if(net)lane(w,dt);
  else{const minX=w.camX+8,maxX=w.lock?w.camX+view.vw-8:STAGE_LEN+20;p.x=clamp(p.x,minX,maxX);
  if(!w.lock){const target=clamp(p.x-view.vw*.4,w.camX,STAGE_LEN-view.vw+40);w.camX+=(target-w.camX)*Math.min(1,dt*3);if(w.wave<WAVES.length&&p.x>=WAVES[w.wave].at)spawnWave(w);if(w.wave>=WAVES.length&&!w.foes.length&&p.x>=STAGE_LEN-10)home(w);}}
  // foes (online: player 1's phone runs them; the other phone eases its copies to the snapshots)
  if(net&&!host){mirrorFoes(w,dt);return;}
  for(const f of w.foes){const G=GANGS[f.g];f.stun=Math.max(0,f.stun-dt);f.x+=f.kvx*dt;f.kvx*=Math.pow(.02,dt);
   if(f.down>0){f.down-=dt;if(f.hp<=0&&f.down<97)f.gone=true;continue;}
   if(f.stun>0)continue;const T=f.wind>0&&f.tgt?f.tgt:target(w,f);if(!T)continue;const dx=T.x-f.x,dy=T.y-f.y;f.face=dx>0?1:-1;
   if(f.wind>0){f.wind-=dt;if(f.wind<=0){if(T===p)strike(w,f,G);else ev({sw:f.id});f.cool=.9+Math.random()*.6;}continue;}
   f.cool=Math.max(0,(f.cool||0)-dt);
   if(Math.abs(dx)<G.reach&&Math.abs(dy)<.12){if(f.cool<=0){f.wind=f.g==='fury'?.55:.4;f.tgt=T;}}
   else{const sp=G.sp*(f.g==='punk'?1:1);f.x+=Math.sign(dx)*sp*dt*(Math.abs(dx)>G.reach-2?1:0);f.y+=clamp(dy,-.5*dt,.5*dt);f.step+=dt*8;}}
  w.foes=w.foes.filter(f=>!f.gone);if(w.lock&&!w.foes.length){w.lock=false;unlocked(w);}
 }
 // a gang member's swing lands on this phone's Warrior if it is still in reach when the wind-up ends
 function strike(w,f,G){const p=w.p,dx=p.x-f.x,dy=p.y-f.y;if(w.dead||w.won||!(Math.abs(dy)<.16&&Math.abs(dx)<G.reach+3&&p.inv<=0&&p.kick<=0))return;
  p.hp-=G.dmg;p.inv=.8;p.stun=.3;p.x+=f.face*8;w.flash=.4;fx.splat(view.sx(p.x),view.sy(p.y)-view.k*20,{n:12,speed:180,size:3});noise(.12,.12,{f0:700,f1:150});shake.kick(7);vibrate(30);s.react?.(w.player,'sad',.8);
  if(p.hp<=0){w.dead=true;w.pops.push({x:p.x,y:p.y,text:net?'WASTED · BACK AFTER THIS FIGHT':'WASTED',t:2,c:'#ff4a4a'});}}
 // who a gang member goes for: offline the only Warrior; online the nearer one still standing
 function target(w,f){const p=w.p;if(!net)return p;const q=w.mate,a=!w.dead&&!w.won?p:null,b=q.net&&!q.out&&!q.won?q:null;
  if(!a||!b)return a||b;const d=o=>Math.abs(o.x-f.x)+Math.abs(o.y-f.y)*60;return d(b)<d(a)?b:a;}
 function home(w){const p=w.p;w.won=true;w.homeT=w.time;w.score+=500+Math.round(w.cap-w.time)*5;w.pops.push({x:p.x,y:p.y,text:'MADE IT TO CONEY ISLAND!',t:2,c:'#ffd23f'});sfx.fanfare();s.react?.(w.player,'win',2);}
 // a fight is cleared: GO, and online a KO'd Warrior comes back next to the partner
 function unlocked(w){w.pops.push({x:w.camX+view.vw/2,y:.3,text:'GO ➜',t:1.4,c:'#7dff6a'});
  const q=w.mate;if(net&&w.dead&&q.net&&!q.out){w.dead=false;Object.assign(w.p,{hp:Math.ceil(w.p.maxHp/2),x:q.x,y:q.y,inv:2,stun:0,kick:0,atk:0});w.pops.push({x:q.x,y:q.y,text:'BACK IN!',t:1.4,c:'#7dff6a'});}}
 // online: the street scrolls with this phone's Warrior; a fight locks both into the same ARENA stretch (a straggler
 // is pulled in), player 1's phone starts each wave when the leading Warrior reaches it
 function lane(w,dt){const p=w.p,q=w.mate,vw=view.vw;
  if(w.lock){p.x=clamp(p.x,w.lx0+8,w.lx0+ARENA-8);const tx=vw>=ARENA?w.lx0+ARENA/2-vw/2:clamp(p.x-vw/2,w.lx0-10,w.lx0+ARENA-vw+10);w.camX+=(tx-w.camX)*Math.min(1,dt*4);return;}
  p.x=clamp(p.x,w.camX+8,STAGE_LEN+20);const tx=clamp(p.x-vw*.4,w.camX,STAGE_LEN-vw+40);w.camX+=(tx-w.camX)*Math.min(1,dt*3);
  const lead=Math.max(w.dead?0:p.x,q.net&&!q.out?q.x:0);if(host&&w.wave<WAVES.length&&lead>=WAVES[w.wave].at)spawnWave(w,lead);
  if(!w.won&&!w.dead&&w.wave>=WAVES.length&&p.x>=STAGE_LEN-10)home(w);}
 function mirrorFoes(w,dt){const k=1-Math.exp(-dt*12);
  for(const f of w.foes){f.x+=f.kvx*dt;f.kvx*=Math.pow(.02,dt);if(f.tx!=null&&!f.lk){f.x+=(f.tx-f.x)*k;f.y+=(f.ty-f.y)*k;}if(f.down>0){f.down-=dt;if(f.lk&&f.down<97)f.gone=true;}}
  w.foes=w.foes.filter(f=>!f.gone);}
 function drawFighter(X,Y,k,o){// o:{col,stripe,face,step,atk,kick,head,mood,player,down,bat}
  x.save();x.translate(X,Y);if(o.down){x.rotate(o.face*-1.4);x.translate(0,-k*6);}x.scale(o.face,1);
  const leg=Math.sin(o.step)*k*4;x.strokeStyle='#22252e';x.lineWidth=k*3.4;x.lineCap='round';x.beginPath();x.moveTo(0,-k*14);x.lineTo(-k*3+leg,0);x.moveTo(0,-k*14);x.lineTo(k*3-leg+(o.kick?k*9:0),o.kick?-k*8:0);x.stroke();
  x.fillStyle=o.col;rr(x,-k*5,-k*28,k*10,k*15,k*3);x.fill();x.fillStyle=o.stripe;x.fillRect(-k*5,-k*24,k*10,k*2.4);
  x.strokeStyle=o.col;x.lineWidth=k*2.6;x.beginPath();x.moveTo(k*2,-k*25);x.lineTo(o.atk?k*14:k*6,o.atk?-k*24:-k*17);x.stroke();
  if(o.bat){x.strokeStyle='#c8964a';x.lineWidth=k*1.6;x.beginPath();const a=o.wind?-2.4:-1;x.moveTo(k*6,-k*17);x.lineTo(k*6+Math.cos(a)*k*16,-k*17+Math.sin(a)*k*16);x.stroke();}
  x.restore();const hy=Y-k*33-(o.down?-k*14:0);
  // online both Warriors are players, so the gangs get plain painted faces instead of a player's head
  if(o.player==null){const hx=X+o.face*k*.5;x.fillStyle='#d9a77e';x.beginPath();x.ellipse(hx,hy,k*4.6,k*5.4,0,0,7);x.fill();x.fillStyle=o.hair||'#2a1a10';x.beginPath();x.ellipse(hx,hy-k*3.2,k*4.8,k*2.6,0,Math.PI,0);x.fill();
   x.fillStyle='#120a08';x.fillRect(hx+o.face*k*1.2,hy-k*1,k*1.1,k*1.1);x.fillRect(hx+o.face*k*1.2-o.face*k*2.6,hy-k*1,k*1.1,k*1.1);}
  else s.sprite(x,o.player,X+o.face*k*.5,hy,k*13,{exact:true,mood:o.mood});
  if(o.paint){x.save();x.globalAlpha=.55;x.fillStyle=o.paint;x.fillRect(X-k*5,Y-k*35,k*10,k*1.6);x.fillRect(X-k*.8,Y-k*39,k*1.6,k*8);x.restore();}}
 function draw(w){
  const W=s.W,H=s.H,k=Math.min(W/(W>H?220:105),H/120),vw=W/k,floorTop=H*.55,floorH=H*.4;
  view={k,vw,sx:X=>(X-w.camX)*k,sy:y=>floorTop+y*floorH};
  x.setTransform(1,0,0,1,0,0);const sky=x.createLinearGradient(0,0,0,floorTop);sky.addColorStop(0,'#05040e');sky.addColorStop(1,'#1d1838');x.fillStyle=sky;x.fillRect(0,0,W,H);
  if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  // skyline far, brick walls near, graffiti, streetlights
  for(let i=Math.floor(w.camX*.3/40)-1;i<(w.camX*.3+vw)/40+1;i++){const bx=(i*40-w.camX*.3)*k,bh=(30+((i*53)%7)*8)*k;x.fillStyle='#120e22';x.fillRect(bx,floorTop-bh-20*k,38*k,bh);x.fillStyle='#ffd98a33';for(let q=0;q<6;q++)if((i*7+q)%3)x.fillRect(bx+(4+(q%3)*11)*k,floorTop-bh-14*k+Math.floor(q/3)*10*k,4*k,5*k);}
  for(let i=Math.floor(w.camX/60)-1;i<(w.camX+vw)/60+1;i++){const bx=(i*60-w.camX)*k;x.fillStyle=i%2?'#5a2a22':'#4a221c';x.fillRect(bx,floorTop-52*k,60*k,52*k);x.strokeStyle='#00000033';x.lineWidth=1;for(let r=0;r<10;r++){x.beginPath();x.moveTo(bx,floorTop-52*k+r*5.2*k);x.lineTo(bx+60*k,floorTop-52*k+r*5.2*k);x.stroke();}
   if(i%3===0)label(x,'WARRIORS',bx+30*k,floorTop-30*k,8*k,{fill:'#ffb347',stroke:'#3a1a10',font:`900 ${8*k}px ${SANS}`,rot:-.08});
   if(i%2===0){x.fillStyle='#2a2a34';x.fillRect(bx+50*k,floorTop-70*k,2*k,70*k);const g=x.createRadialGradient(bx+51*k,floorTop-70*k,1,bx+51*k,floorTop-70*k,30*k);g.addColorStop(0,'#fff6c066');g.addColorStop(1,'#fff6c000');x.fillStyle=g;x.fillRect(bx+21*k,floorTop-100*k,60*k,60*k);}}
  const fl=x.createLinearGradient(0,floorTop,0,H);fl.addColorStop(0,'#3a3a46');fl.addColorStop(1,'#22222c');x.fillStyle=fl;x.fillRect(0,floorTop,W,H-floorTop);x.fillStyle='#e8d36a55';for(let i=Math.floor(w.camX/30);i<(w.camX+vw)/30+1;i++)x.fillRect((i*30-w.camX)*k,floorTop+floorH*.5,14*k,1.5*k);
  // fighters sorted by depth
  const rival=net?null:1-w.player,q=net&&w.mate.net?w.mate:null,actors=[...w.foes.map(f=>({y:f.y,f})),{y:w.p.y,me:true},...(q?[{y:q.y,mate:true}]:[])].sort((a,b)=>a.y-b.y);
  for(const a of actors){if(a.mate){x.globalAlpha=q.out?.35:q.inv&&Math.floor(w.time*20)%2?.5:1;x.fillStyle='#0006';x.beginPath();x.ellipse(view.sx(q.x),view.sy(q.y)+2,k*7,k*1.6,0,0,Math.PI*2);x.fill();
    drawFighter(view.sx(q.x),view.sy(q.y),k,{col:'#7a4a24',stripe:'#d8a040',face:q.face,step:q.step,atk:q.atk,kick:q.kick,player:them,down:q.out,mood:q.out?'sad':q.atk?'angry':undefined});x.globalAlpha=1;}
   else if(a.me){const p=w.p;if(w.dead&&Math.floor(w.time*8)%2)continue;x.globalAlpha=p.inv>0&&Math.floor(p.inv*20)%2?.5:1;drawFighter(view.sx(p.x),view.sy(p.y),k,{col:'#7a4a24',stripe:'#d8a040',face:p.face,step:p.step,atk:p.atk>0,kick:p.kick>0,player:w.player,mood:w.dead?'sad':p.atk>0?'angry':undefined});x.globalAlpha=1;
    x.fillStyle='#0006';x.beginPath();x.ellipse(view.sx(p.x),view.sy(p.y)+2,k*7,k*1.6,0,0,Math.PI*2);x.fill();}
   else{const f=a.f,G=GANGS[f.g];x.fillStyle='#0006';x.beginPath();x.ellipse(view.sx(f.x),view.sy(f.y)+2,k*7,k*1.6,0,0,Math.PI*2);x.fill();drawFighter(view.sx(f.x),view.sy(f.y),k,{col:G.col,stripe:G.stripe,face:f.face,step:f.step,atk:false,kick:false,player:rival,down:f.down>0,mood:f.down>0?'sad':'angry',bat:f.g==='fury',wind:f.wind>0,paint:f.g==='fury'?'#2a2a2a':null});
    if(f.wind>0){x.fillStyle='#ff4a4a';x.font=`900 ${10*k}px ${SANS}`;x.textAlign='center';x.fillText('!',view.sx(f.x),view.sy(f.y)-k*44);}}}
  x.setTransform(1,0,0,1,0,0);fx.draw(x);
  for(const q of w.pops)label(x,q.text,view.sx(q.x),view.sy(q.y)-k*50-(1.2-q.t)*30,Math.max(16,k*7),{fill:q.c,alpha:clamp(q.t*2,0,1)});
  if(w.flash>0){x.fillStyle=`rgba(255,0,0,${w.flash*.25})`;x.fillRect(0,0,W,H);}
  // HUD
  const fs=Math.max(13,Math.min(W,H)*.03),hy=net?48:10;x.fillStyle='#000a';rr(x,10,hy,Math.min(220,W*.5),fs*2.8,8);x.fill();label(x,s.players[w.player].name.toUpperCase(),18,hy+fs*.8,fs*.85,{fill:'#ffb347',align:'left',stroke:null,font:`900 ${fs*.85}px ${SANS}`});
  for(let q=0;q<w.p.maxHp;q++){x.fillStyle=q<w.p.hp?'#ffd23f':'#ffffff22';x.fillRect(18+q*(fs*1.2),hy+fs*1.6,fs,fs*.6);}
  label(x,String(w.score).padStart(5,'0'),W/2,22,fs*1.2,{fill:'#fff'});const left=Math.max(0,Math.ceil(w.cap-w.time));label(x,`${left}s · ${Math.floor(Math.min(1,w.p.x/STAGE_LEN)*100)}% HOME`,W/2,22+fs*1.3,fs*.75,{fill:left<=10?'#ff4a4a':'#ffffffaa'});
  if(w.lock&&w.foes.length){const g=GANGS[w.foes[0].g];label(x,g.name,W/2,H*.18,fs*1.1,{fill:'#ff8a3a'});}
  if(w.time<2.2)label(x,'WARRIORS… COME OUT TO PLAY-AY!',W/2,H*.3,clamp(W*.04,14,26),{fill:'#f2efe6',stroke:'#1a1a1a'});
  if(w.ending)label(x,w.won?'CONEY ISLAND!':w.dead?'WASTED':'TIME UP',W/2,H*.4,clamp(W*.07,22,46),{fill:w.won?'#ffd23f':'#ff4a4a'});
  if(net){// the partner: score and health under the clock, an arrow when off screen, the grace countdown
   const m=w.mate;label(x,`${s.players[them].name.toUpperCase()} ${m.score}${m.out?' · DOWN':''}`,W/2,22+fs*2.4,fs*.7,{fill:them?'#ff9fc6':'#78b6ff'});
   if(q)partnerArrow(s,x,{x:0,y:0,w:W,h:H},view.sx(q.x),view.sy(q.y)-k*25,{player:them,color:them?'#ff9fc6':'#78b6ff',label:`${Math.round(Math.abs(q.x-w.p.x)/10)} m`,size:Math.round(clamp(k*6,14,24)),top:fs*3.4});
   const first=Math.min(w.won?w.homeT:Infinity,m.won?m.homeT:Infinity);if(first<Infinity&&!(w.won&&m.won)&&!w.ending){const left=Math.max(0,Math.ceil(first+NET_GRACE-w.time));label(x,w.won?`${s.players[them].name.toUpperCase()} HAS ${left}s`:`GET HOME! ${left}`,W/2,H*.26,clamp(W*.05,16,30),{fill:'#ffd23f'});}
   if(w.dead&&!w.ending)label(x,'WATCHING · BACK AFTER THIS FIGHT',W/2,H*.34,clamp(W*.04,13,22),{fill:'#ff8a8a'});}
  else s.debug={engine:'brawler',world:w};
 }
 if(net)return netBrawl();
 // ---------------- online co-op (see the top of the file)
 async function netBrawl(){
  try{s.fitCanvas?.();}catch{}
  const w=make();cur=w;w.player=me;w.time=-3;w.ending=0;w.cap=75;w.p.y=me?.72:.32;w.mate={x:30,y:me?.32:.72,face:1,step:0,atk:false,kick:false,hp:6,inv:false,out:false,won:false,homeT:0,score:0,net:null};
  view={k:3,vw:180,sx:X=>X,sy:y=>y};let phase='wait',endT=0,finals=null;const r=(v,n)=>Math.round(v*n)/n,p=w.p;
  nf=netField(s,{hz:15,
   pack:()=>{const o={p:[r(p.x,10),r(p.y,1000),p.face,r(p.step,10),p.atk>0?1:0,p.kick>0?1:0,p.hp,p.inv>0?1:0,w.dead?1:0,w.won?1:0,w.score,r(w.homeT||0,100)]};
    if(host){o.f=w.foes.map(f=>[f.id,f.g,r(f.x,10),r(f.y,1000),f.hp,f.face,f.down>0?1:0,f.wind>0?1:0,r(f.step,10)]);o.l=[w.wave,w.lock?1:0,r(w.lx0||0,10)];}return o;},
   unpack:(i,d)=>{if(!d||!Array.isArray(d.p))return;const m=w.mate,[px,py,face,step,atk,kick,hp,inv,out,won,sc,ht]=d.p;if(!m.net){m.x=px;m.y=py;}
    Object.assign(m,{net:{x:px,y:py},face,step,atk:!!atk,kick:!!kick,hp,inv:!!inv,out:!!out,won:!!won,score:sc,homeT:ht});
    if(host||!Array.isArray(d.f))return;const seen=new Set();
    for(const [id,g,x0,y0,hp2,f2,down,wind,st] of d.f){if(!GANGS[g])continue;seen.add(id);let f=w.foes.find(f=>f.id===id);if(!f){if(lost.has(id))continue;f={id,g,x:x0,y:y0,hp:hp2,face:f2,state:'walk',t:0,wind:0,kvx:0,stun:0,down:0,step:st};w.foes.push(f);}
     f.tx=x0;f.ty=y0;f.face=f2;f.wind=wind;f.step=st;if(!f.lk){f.hp=hp2;if(down&&f.down<=0)f.down=hp2<=0?99:.5;else if(!down&&f.down>0)f.down=0;}}
    w.foes=w.foes.filter(f=>seen.has(f.id)||f.lk);
    if(Array.isArray(d.l)){const was=w.lock;w.wave=d.l[0];w.lock=!!d.l[1];w.lx0=d.l[2];if(was&&!w.lock)unlocked(w);else if(!was&&w.lock)voice(220,.2,.05,'sawtooth',{lp:900});}},
   onEvent:e=>{if(!e||typeof e!=='object')return;
    if(Array.isArray(e.h)&&host){const [id,dmg,kx,knock]=e.h,f=w.foes.find(f=>f.id===id);if(f&&f.hp>0)hitFoe(w,f,+dmg||1,+kx||0,!!knock,true);}
    else if(e.sw!=null&&!host){const f=w.foes.find(f=>f.id===e.sw);if(f)strike(w,f,GANGS[f.g]);}}});
  // the run ends at the clock, when both are down, when both are home or down, or 10 s after the first one home
  const over=()=>{const m=w.mate;if(w.time>=w.cap||w.dead&&m.out)return true;if((w.dead||w.won)&&(m.out||m.won))return true;
   const first=Math.min(w.won?w.homeT:Infinity,m.won?m.homeT:Infinity);return w.time>first+NET_GRACE;};
  async function end(){phase='end';w.ending=1;nf.finish({sc:w.score});const o=await nf.remoteDone();if(!s.alive)return;
   finals=[];finals[me]=w.score;finals[them]=o?o.sc:w.mate.score;w.mate.score=finals[them];phase='done';endT=0;}
  // online test bot: walks home, fights whoever is nearest, punches in reach
  s.debug={engine:'brawler',get world(){return w;},bot:()=>{if(bot)return '';bot=ww=>{const pp=ww.p;let best=null,bd=1e9;for(const f of ww.foes)if(f.down<=0&&f.hp>0){const d=Math.abs(f.x-pp.x)+Math.abs(f.y-pp.y)*60;if(d<bd){bd=d;best=f;}}
    if(!best)return [1,(.5-pp.y)];const dx=best.x-pp.x,dy=best.y-pp.y;if(Math.abs(dx)<14&&Math.abs(dy)<.1){pp.face=dx>0?1:-1;if(pp.atk<=0&&Math.random()<.2)punch(ww);return [0,0];}
    return [Math.abs(dx)>11?Math.sign(dx):-Math.sign(dx)*.3,clamp(dy*8,-1,1)];};return 'drive';}};
  void (async()=>{await nf.start('go');if(s.alive)phase='play';})();
  s.frame(dt=>{nf.tick(dt);const m=w.mate,k=1-Math.exp(-dt*14);if(m.net){if(Math.abs(m.net.x-m.x)>60){m.x=m.net.x;m.y=m.net.y;}else{m.x+=(m.net.x-m.x)*k;m.y+=(m.net.y-m.y)*k;}}
   if(phase==='play'){w.time+=dt;if(w.time>=0)step(w,dt);if(over())end();}else if(phase==='done'){endT+=dt;fx.step(dt);if(endT>1.6){phase='gone';
    s.finish(finals,`The Warriors together · ${s.players[0].name} ${finals[0]}, ${s.players[1].name} ${finals[1]}`);return;}}
   draw(w);if(phase==='wait'||phase==='end')label(x,`WAITING FOR ${s.players[them].name.toUpperCase()}…`,s.W/2,s.H*.42,clamp(s.W*.045,14,24),{fill:'#ffd23f'});
   else if(phase==='play'&&w.time<0)label(x,String(Math.ceil(-w.time)),s.W/2,s.H*.42,clamp(s.W*.12,30,80),{fill:'#fff'});
   const sc=[];sc[me]=w.score;sc[them]=m.score;s.setScores(sc);});
 }
 const scores=await turnRunner(s,{seconds:75,endDelay:1.6,
  intro:(i,sc)=>i===0?`The Warriors, all the way home to Coney Island. ${s.players[0].name} goes first; every gang member is wearing ${s.players[1].name}'s head. Drag to walk, tap to punch (three-hit combos), flick for a flying kick. 75 seconds.`:`${s.players[1].name}, same streets, same gangs (now with ${s.players[0].name}'s face). Beat ${sc[0]}.`,
  make:()=>{cur=make();view={k:3,vw:180,sx:X=>X,sy:y=>y};return cur;},step,draw,done:w=>w.dead||w.won,soloPass:w=>!w.dead,soloGoal:()=>"Stay on your feet until the clock runs out (or reach Coney Island) to reach the next round.",score:w=>w.score});
 if(!scores)return;
 s.finish(scores,`The Warriors · ${scores[0]} vs ${scores[1]}`);
}
Object.assign(exports,{brawler});
