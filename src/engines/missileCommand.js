// Missile Command (Atari, 1980) remake, Mars Attacks! edition: defend six cities and three missile bases (Alpha,
// Delta, Omega; Delta's missiles are fastest) from warhead trails, splitting MIRVs, smart bombs that dodge your blasts
// and Martian saucers. Tap the sky: the nearest loaded base fires an ABM that bursts into a colour-cycling fireball.
// Wave bonus for spare missiles and surviving cities, multiplier every two waves, palette change each wave.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,keyboard,makeShake}=require("src/engines/tarantinoKit.js");
const {pixText,drawSprite,scanlines,vignette,fitField,makeBits,turnRunner}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

const FW=256;
const PALETTES=[{ground:'#e8c63a',city:'#3fb8ff',trail:'#ff3b3b',abm:'#5b8cff',sky0:'#000000',sky1:'#05020f'},{ground:'#33d16b',city:'#ffd23f',trail:'#ff5ad9',abm:'#ffffff',sky0:'#000010',sky1:'#04061c'},{ground:'#3b7bff',city:'#ff8a3a',trail:'#ffe14a',abm:'#ffffff',sky0:'#06000e',sky1:'#10021e'},{ground:'#ff5b3a',city:'#7dff9a',trail:'#9ad8ff',abm:'#ffd23f',sky0:'#000a08',sky1:'#001a14'},{ground:'#c45bff',city:'#ffe14a',trail:'#5bffef',abm:'#ffffff',sky0:'#080008',sky1:'#18021a'}];
const FIRE=['#ffffff','#ff3b3b','#ffd23f','#4fe6ff','#ff5ad9','#7dff6a'];
const CITY=['..#....#....','..#.#..##...','.###.####.#.','.##########.','############','############'];
const RUBBLE=['............','............','............','...#....#...','.##.#.###.#.','############'];
const SAUCER=['.....####.....','...########...','.##.##.##.##.','##############','..##..##..##..'];
const MARTIAN=['..#####..','.#.#.#.#.','#########','#..#.#..#','.#######.'];
const CITY_X=[40,64,88,168,192,216],BASE_X=[16,128,240],BASE_NAME=['ALPHA','DELTA','OMEGA'];

async function missiledefense(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const shake=makeShake();let L=null,cur=null;const cross={x:FW/2,y:100,kx:0,ky:0};
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur||!L||cur.ending)return;ev.preventDefault();const p=s.pointer(ev),f=L.toField(p.x,p.y);cross.x=f.x;cross.y=f.y;fire(cur,f.x,f.y);});
 keyboard(s,(i,name,down)=>{if(name==='l')cross.kx=down?-1:0;if(name==='r')cross.kx=down?1:0;if(name==='u')cross.ky=down?-1:0;if(name==='d')cross.ky=down?1:0;if(name==='act'&&down&&cur)fire(cur,cross.x,cross.y);},{repeat:false});
 s.hint('Tap the sky where you want a blast: the nearest base with missiles fires (the middle base is fastest). Blasts chain through the warheads. Splitting MIRVs, dodging smart bombs and Martian saucers come later. Keys: arrows aim, Space/Enter fire.');
 const ground=w=>w.FH-14;
 function make(){const w={rand:seededRandom(s.seed+':missile'),FH:300,wave:0,mult:1,score:0,cities:CITY_X.map(cx=>({x:cx,alive:true})),bases:BASE_X.map(bx=>({x:bx,ammo:10,alive:true})),
  enemies:[],abms:[],booms:[],queue:[],saucer:null,bits:makeBits(),bonus:null,banner:null,flash:0,over:false};startWave(w);return w;}
 function startWave(w){
  w.wave++;w.mult=Math.min(6,1+Math.floor((w.wave-1)/2));for(const b of w.bases){b.alive=true;b.ammo=10;}
  const n=10+w.wave*3,sp=14+w.wave*3.2;w.queue=[];let t=1.4;
  for(let i=0;i<n;i++){t+=Math.max(.25,1.5-w.wave*.12)*(.4+w.rand()*1.2);w.queue.push({t,x:8+w.rand()*(FW-16),speed:sp*(.8+w.rand()*.4),mirv:w.wave>=2&&w.rand()<.22,smart:w.wave>=3&&w.rand()<.12,pick:w.rand()});}
  w.saucerT=w.wave>=2?6+w.rand()*6:99;w.waveTime=0;w.banner={text:`WAVE ${w.wave}`,sub:`${w.mult}× POINTS`,t:1.8};voice(440,.5,.035,'sawtooth',{slide:1.6,lp:1200});voice(440,.5,.035,'sawtooth',{slide:1.6,lp:1200,delay:.55});
 }
 const targets=w=>[...w.cities.filter(t=>t.alive).map(t=>({x:t.x,kind:'city',ref:t})),...w.bases.filter(b=>b.alive).map(b=>({x:b.x,kind:'base',ref:b}))];
 function spawnEnemy(w,x0,y0,speed,pick,{mirv=false,smart=false}={}){const ts=targets(w);if(!ts.length)return;const tg=ts[Math.floor(pick*ts.length)%ts.length];w.enemies.push({x0,y0,x:x0,y:y0,tx:tg.x,ty:ground(w)-4,speed,mirv,smart,split:mirv?w.FH*(.28+w.rand()*.2):0});}
 function fire(w,tx,ty){
  if(ty>ground(w)-18)ty=ground(w)-18;let best=null,bd=1e9;
  for(let i=0;i<3;i++){const b=w.bases[i];if(!b.alive||b.ammo<=0)continue;const d=Math.abs(b.x-tx)*(i===1?.8:1);if(d<bd){bd=d;best=i;}}
  if(best===null){voice(120,.08,.04,'square');return;}
  const b=w.bases[best];b.ammo--;const by=ground(w)-12;w.abms.push({x:b.x,y:by,sx:b.x,sy:by,tx,ty,speed:best===1?300:190});noise(.18,.05,{type:'bandpass',f0:600,f1:2400,q:1.3});
 }
 function boom(w,px,py,own=true,max=13){w.booms.push({x:px,y:py,r:0,t:0,max,own});noise(.35,own?.06:.1,{f0:1300,f1:90});}
 function step(w,dt){
  w.bits.step(dt);shake.step(dt);w.flash=Math.max(0,w.flash-dt*2);cross.x=clamp(cross.x+cross.kx*160*dt,0,FW);cross.y=clamp(cross.y+cross.ky*160*dt,10,ground(w)-18);
  if(w.banner){w.banner.t-=dt;if(w.banner.t<=0)w.banner=null;}
  if(w.bonus){w.bonus.t-=dt;if(w.bonus.t<=0){w.bonus=null;startWave(w);}return;}
  w.waveTime+=dt;
  while(w.queue.length&&w.queue[0].t<=w.waveTime){const q=w.queue.shift();spawnEnemy(w,q.x,0,q.speed,q.pick,q);}
  // saucer
  w.saucerT-=dt;if(!w.saucer&&w.saucerT<=0&&w.queue.length){const dir=w.rand()<.5?1:-1;w.saucer={x:dir>0?-10:FW+10,y:w.FH*(.3+w.rand()*.15),dir,drop:1.2};w.saucerT=9+w.rand()*6;}
  const sc=w.saucer;if(sc){sc.x+=sc.dir*24*dt;sc.drop-=dt;if(sc.drop<=0){sc.drop=1.4;spawnEnemy(w,sc.x,sc.y+4,16+w.wave*3,w.rand());}if(Math.random()<dt*6)voice(380+Math.sin(w.time*8)*90,.06,.012,'sine');if(sc.x<-14||sc.x>FW+14)w.saucer=null;}
  // ABMs
  for(const a of w.abms){const dx=a.tx-a.x,dy=a.ty-a.y,d=Math.hypot(dx,dy);if(d<=a.speed*dt){a.done=true;boom(w,a.tx,a.ty);}else{a.x+=dx/d*a.speed*dt;a.y+=dy/d*a.speed*dt;}}
  w.abms=w.abms.filter(a=>!a.done);
  // explosions
  for(const b of w.booms){b.t+=dt;b.r=b.t<.55?b.max*b.t/.55:b.t<.85?b.max:Math.max(0,b.max*(1-(b.t-.85)/.5));}
  w.booms=w.booms.filter(b=>b.t<1.35);
  // enemies
  for(const e of w.enemies){
   const dx=e.tx-e.x,dy=e.ty-e.y,d=Math.hypot(dx,dy)||1;let vx=dx/d*e.speed,vy=dy/d*e.speed;
   if(e.smart){for(const b of w.booms){const ex=e.x-b.x,ey=e.y-b.y,ed=Math.hypot(ex,ey);if(ed<b.r+12&&ed>0){vx+=ex/ed*e.speed*1.6;vy=Math.min(vy,e.speed*.3);}}}
   e.x+=vx*dt;e.y+=vy*dt;
   if(e.mirv&&e.y>=e.split){e.mirv=false;const k=1+Math.floor(w.rand()*2);for(let i=0;i<k;i++)spawnEnemy(w,e.x,e.y,e.speed,w.rand());e.x0=e.x;e.y0=e.y;}
   for(const b of w.booms)if(Math.hypot(e.x-b.x,e.y-b.y)<b.r+1){e.dead=true;w.score+=(e.smart?125:25)*w.mult;w.bits.burst(e.x,e.y,{n:8,speed:30,color:FIRE[1],life:.4,size:1});if(!b.chained)boom(w,e.x,e.y,false,9);break;}
   if(!e.dead&&e.y>=e.ty){e.dead=true;boom(w,e.x,e.y,false,11);shake.kick(7);w.flash=.5;vibrate(25);
    const city=w.cities.find(t=>t.alive&&Math.abs(t.x-e.x)<9),base=w.bases.find(b=>b.alive&&Math.abs(b.x-e.x)<9);
    if(city){city.alive=false;voice(70,.7,.12,'sawtooth',{slide:.4,lp:500});s.react?.(w.player,'sad',1.4);w.bits.burst(city.x,ground(w)-4,{n:30,speed:50,color:PALETTES[(w.wave-1)%5].city,life:1,size:1.4,g:60});}
    else if(base){base.alive=false;base.ammo=0;voice(80,.6,.1,'sawtooth',{slide:.5,lp:500});}}
  }
  if(sc)for(const b of w.booms)if(Math.hypot(sc.x-b.x,sc.y-b.y)<b.r+6){w.score+=100*w.mult;w.bits.burst(sc.x,sc.y,{n:30,speed:60,color:'#9dff7a',life:.9,size:1.6});boom(w,sc.x,sc.y,false,12);w.saucer=null;s.react?.(w.player,'win',1);break;}
  w.enemies=w.enemies.filter(e=>!e.dead);
  // wave end: tally bonus
  if(!w.queue.length&&!w.enemies.length&&!w.saucer&&!w.abms.length&&!w.booms.length&&!w.ending){
   const ammo=w.bases.reduce((a,b)=>a+(b.alive?b.ammo:0),0),cities=w.cities.filter(t=>t.alive).length,bonus=(ammo*5+cities*100)*w.mult;w.score+=bonus;w.bonus={ammo,cities,bonus,t:2.2};[523,659,784,1046].forEach((f,i)=>voice(f,.1,.04,'square',{delay:i*.09}));
  }
 }
 function draw(w){
  const W=s.W,H=s.H;L=fitField(W,H,FW,{minH:220,maxH:400,top:48,bottom:4});if(w.FH!==L.FH){const old=w.FH;w.FH=L.FH;for(const e of w.enemies){e.ty+=w.FH-old;}}
  const pal=PALETTES[(w.wave-1)%PALETTES.length],gy=ground(w);
  x.setTransform(1,0,0,1,0,0);const sky=x.createLinearGradient(0,0,0,H);sky.addColorStop(0,pal.sky0);sky.addColorStop(1,pal.sky1);x.fillStyle=sky;x.fillRect(0,0,W,H);
  const k=L.scale;let ox=L.ox,oy=L.oy;if(shake.mag>.3){ox+=(Math.random()-.5)*shake.mag;oy+=(Math.random()-.5)*shake.mag;}
  // ground spans the whole screen
  x.fillStyle=pal.ground;x.fillRect(0,oy+gy*k,W,H);
  x.setTransform(k,0,0,k,ox,oy);
  // mounds for the bases
  x.fillStyle=pal.ground;for(const bx of BASE_X){x.beginPath();x.moveTo(bx-16,gy);x.lineTo(bx-9,gy-9);x.lineTo(bx+9,gy-9);x.lineTo(bx+16,gy);x.fill();}
  x.fillRect(-400,gy,FW+800,40);
  // cities
  for(const t of w.cities)drawSprite(x,t.alive?CITY:RUBBLE,t.x-6,gy-6,1,t.alive?pal.city:'#77777799',{glow:t.alive?Math.round(k*2):0});
  // missile stacks on each base
  w.bases.forEach((b,i)=>{if(!b.alive){pixText(x,'XX',b.x,gy-6,.7,'#000000aa',{align:'center'});return;}x.fillStyle=pal.abm;let n=0;for(let r=0;r<4&&n<b.ammo;r++)for(let q=0;q<=r&&n<b.ammo;q++,n++){const mx=b.x-r*2+q*4,my=gy-10+r*2.4;x.fillRect(mx-.6,my-1.6,1.2,2);}
   if(b.ammo<=3)pixText(x,b.ammo?'LOW':'OUT',b.x,gy+3,.65,'#000',{align:'center'});});
  // player's head commands from Delta
  s.sprite(x,w.player,BASE_X[1],gy-19,16,{exact:true});
  // enemy trails
  x.lineWidth=.8;for(const e of w.enemies){x.strokeStyle=pal.trail;x.shadowColor=pal.trail;x.shadowBlur=4;x.beginPath();x.moveTo(e.x0,e.y0);x.lineTo(e.x,e.y);x.stroke();x.shadowBlur=0;x.fillStyle=Math.sin(w.time*40)>0?'#fff':pal.trail;if(e.smart){x.beginPath();x.moveTo(e.x,e.y-2);x.lineTo(e.x+2,e.y);x.lineTo(e.x,e.y+2);x.lineTo(e.x-2,e.y);x.fill();}else x.fillRect(e.x-.8,e.y-.8,1.6,1.6);}
  // ABM trails + target X
  for(const a of w.abms){x.strokeStyle=pal.abm;x.lineWidth=.8;x.beginPath();x.moveTo(a.sx,a.sy);x.lineTo(a.x,a.y);x.stroke();x.fillStyle='#fff';x.fillRect(a.x-.8,a.y-.8,1.6,1.6);x.strokeStyle='#fff';x.beginPath();x.moveTo(a.tx-2,a.ty-2);x.lineTo(a.tx+2,a.ty+2);x.moveTo(a.tx+2,a.ty-2);x.lineTo(a.tx-2,a.ty+2);x.stroke();}
  // saucer
  if(w.saucer){const sc=w.saucer;drawSprite(x,MARTIAN,sc.x-4.5,sc.y-7,1,'#9dff7a',{glow:Math.round(k*2)});x.fillStyle='#bfe8ff44';x.beginPath();x.ellipse(sc.x,sc.y-2,6,5,0,Math.PI,0);x.fill();drawSprite(x,SAUCER,sc.x-7,sc.y-2,1,'#ff5ad9',{glow:Math.round(k*3)});}
  // fireballs
  for(const b of w.booms){x.fillStyle=FIRE[Math.floor(w.time*30+b.x)%FIRE.length];x.shadowColor=x.fillStyle;x.shadowBlur=10;x.beginPath();x.arc(b.x,b.y,b.r,0,Math.PI*2);x.fill();}x.shadowBlur=0;
  w.bits.draw(x);
  // crosshair
  x.strokeStyle='#ffffffcc';x.lineWidth=.8;x.beginPath();x.moveTo(cross.x-4,cross.y);x.lineTo(cross.x+4,cross.y);x.moveTo(cross.x,cross.y-4);x.lineTo(cross.x,cross.y+4);x.stroke();
  // HUD
  pixText(x,String(w.score).padStart(5,'0'),6,4,1.1,pal.trail,{glow:6});pixText(x,`${w.mult}×`,6,14,.8,'#ffffffaa');
  const left=Math.max(0,Math.ceil(w.cap-w.time));pixText(x,`TIME ${left}`,FW/2,4,.9,left<=10?'#ff5a5a':'#ffffffaa',{align:'center'});
  pixText(x,w.player===0?'-----':String(w.scores[0]).padStart(5,'0'),FW-6,4,.9,'#ffffff55',{align:'right'});
  if(w.banner)pixText(x,w.banner.text,FW/2,w.FH*.36,2,'#fff',{align:'center',glow:10,alpha:clamp(w.banner.t*2,0,1)});
  if(w.banner?.sub)pixText(x,w.banner.sub,FW/2,w.FH*.36+20,1.2,'#ffd23f',{align:'center',alpha:clamp(w.banner.t*2,0,1)});
  if(w.bonus){pixText(x,'BONUS POINTS',FW/2,w.FH*.3,1.4,'#ffd23f',{align:'center',glow:8});pixText(x,`${w.bonus.ammo} MISSILES  ${w.bonus.cities} CITIES`,FW/2,w.FH*.3+16,1,'#fff',{align:'center'});pixText(x,'+'+w.bonus.bonus,FW/2,w.FH*.3+30,1.6,'#7dff6a',{align:'center',glow:8});}
  if(w.ending)pixText(x,w.cities.some(t=>t.alive)?'TIME UP':'THE END',FW/2,w.FH*.4,2.6,'#ff3b3b',{align:'center',glow:12});
  x.setTransform(1,0,0,1,0,0);if(w.flash>0){x.fillStyle=`rgba(255,255,255,${w.flash*.25})`;x.fillRect(0,0,W,H);}
  scanlines(x,W,H,.14);vignette(x,W,H,.45);
  s.debug={engine:'missiledefense',world:w,cross};
 }
 const scores=await turnRunner(s,{seconds:75,endDelay:2,
  intro:(i,sc)=>i===0?`Missile Command, Martian edition. ${s.players[0].name} first: tap the sky to burst missiles before they reach your six cities. The middle base fires fastest. 75 seconds; spare missiles and cities score a bonus each wave.`:`${s.players[1].name}, same attack. Beat ${sc[0]}.`,
  make:()=>{cur=make();return cur;},step,draw,done:w=>w.cities.every(t=>!t.alive),score:w=>w.score});
 if(!scores)return;
 s.finish(scores,`Missile Command · ${scores[0]} vs ${scores[1]}`);
}
Object.assign(exports,{missiledefense});
