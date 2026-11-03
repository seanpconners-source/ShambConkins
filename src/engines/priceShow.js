// The Price Is Right, a whole episode (id price-bid-off): three rounds, each a One Bid on Contestants' Row (closest without going
// over wins the prize, $500 extra for dead on) and then a pricing game for both players: Plinko, Cliff Hangers, the Big Wheel.
// Most money wins. Pass and play takes turns; vs CPU the CPU plays its turns where you can see them; online both phones play
// at once: sealed bids {r,bid,bank} on each round, your own games on your phone, {fin} the final bank. Our own sound (original
// yodel and fanfares, no show music). The stage is a canvas, bids and buttons are DOM over it. Later rounds of the show (the
// Showcase, more pricing games) can slot in as more steps in PLAN.
const {ITEMS}=require('src/data/partyPrice.js');
const {store}=require('src/state.js');
const {shuffle,escapeHTML:e,clamp}=require('src/utils.js');
const {audioContext,holdMusic,releaseMusic,vibrate}=require('src/audio.js');
const {isCpu,cpuSkill}=require('src/engines/cpuKit.js');
const {fullBleed}=require('src/engines/fullBleed.js');

const money=n=>'$'+Math.round(n).toLocaleString('en-US');
const GROCERY=[['🥛','Fight Milk, one gallon',14],['🍖','Rum Ham, by the slice',9],['🍺','Duff, six pack',11],['🥤','Slurm, two liter',6],['🥫','Bachelor Chow',4],['⚡','Brawndo, the case',28],['🥣','Krusty-O’s, family size',7],['🦴','Scooby Snacks',5],['🍔','Big Kahuna Burger',8],['🍕','Pizza Planet large',19],['🧀','Cheesy Poofs, party bag',3],['🍩','Lard Lad donut box',12],['🍫','Wonka bar, gold ticket odds',2],['🧃','Five-Dollar Shake',5],['🌯','Tacos, Taco Tuesday pack',16]];
const PLINKO=[100,500,1000,0,10000,0,1000,500,100];
const WHEEL=[100,15,80,35,60,20,40,75,55,95,50,85,30,65,10,45,70,25,90,5];
const WHEEL_COL=['#f2c81e','#d62f2f','#2f7fd6','#2fa84f','#e8772e','#a03fc0'];
const PLAN=['plinko','cliff','wheel'];

const CSS=`.pi-ui{position:absolute;inset:0;z-index:4;pointer-events:none;color:#fff;font-family:"SC Nunito",system-ui,sans-serif}
 .pi-ui button{pointer-events:auto}
 .pi-hud{position:absolute;left:max(8px,env(safe-area-inset-left));top:max(6px,env(safe-area-inset-top));display:flex;flex-direction:column;gap:2px;font:800 clamp(12px,3.2vmin,15px)/1.25 "SC Nunito",sans-serif;text-shadow:0 1px 3px #000}
 .pi-panel{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:6px;padding:10px 12px calc(36px + env(safe-area-inset-bottom));background:linear-gradient(#5b1a8fee,#2c0d52f5);border-top:4px solid #ffd21e;pointer-events:auto}
 @media (min-aspect-ratio:1/1){.pi-panel{left:auto;top:0;width:44%;border-top:0;border-left:4px solid #ffd21e;padding-top:calc(46px + env(safe-area-inset-top));justify-content:center}}
 .pi-item{display:flex;align-items:center;gap:10px;min-width:0}
 .pi-em{font-size:clamp(38px,11vmin,62px);line-height:1;flex:none}
 .pi-name{font:400 clamp(20px,5.4vmin,30px)/1 "SC Bangers",Impact,sans-serif;letter-spacing:.03em;color:#ffd21e}
 .pi-blurb{font:700 clamp(11px,2.9vmin,14px)/1.2 "SC Nunito",sans-serif;opacity:.9}
 .pi-led{align-self:center;min-width:62%;padding:3px 14px;border-radius:8px;background:#180404;border:3px solid #ffd21e;color:#ff3c28;text-align:center;font:400 clamp(30px,8vmin,44px)/1.1 ui-monospace,Menlo,Consolas,monospace;text-shadow:0 0 10px #ff3c28}
 .pi-keys{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
 .pi-ui .pi-k{margin:0;min-height:clamp(36px,8.8vmin,50px);padding:0;border:0;border-radius:9px;background:linear-gradient(#fff,#d9d4ea);color:#2c0d52;font:800 clamp(18px,5vmin,24px)/1 "SC Nunito",sans-serif;box-shadow:0 3px 0 #0007}
 .pi-ui .pi-k.go{background:linear-gradient(#ffe25a,#f2a81e)}
 .pi-ui .pi-k:active{transform:translateY(2px)}
 .pi-row{display:flex;gap:8px;justify-content:center}
 .pi-ui .pi-btn{margin:0;min-height:46px;padding:8px 20px;border:0;border-radius:999px;background:linear-gradient(#ffe25a,#f2a81e);color:#2c0d52;font:400 clamp(18px,4.6vmin,24px)/1 "SC Bangers",Impact,sans-serif;letter-spacing:.04em;box-shadow:0 4px 0 #0007}
 .pi-ui .pi-btn.alt{background:#ffffff26;color:#fff}
 .pi-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:56px 14px 40px;text-align:center;pointer-events:auto}
 .pi-center h2{margin:0;font:400 clamp(38px,12vmin,76px)/1 "SC Bangers",Impact,sans-serif;color:#ffe25a;text-shadow:0 4px 0 #a01818,0 0 24px #ff7a1a}
 .pi-center p{margin:0;font:800 clamp(14px,3.8vmin,20px)/1.25 "SC Nunito",sans-serif;text-shadow:0 2px 4px #000}
 .pi-pods{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
 .pi-pod{min-width:128px;padding:8px 12px;border-radius:12px;background:linear-gradient(#b5502a,#6e2a12);border:3px solid #ffd21e;font:800 13px/1.2 "SC Nunito",sans-serif}
 .pi-pod b{display:block;margin-top:4px;padding:2px 6px;border-radius:6px;background:#180404;color:#ff3c28;font:400 26px/1.15 ui-monospace,Menlo,Consolas,monospace}
 .pi-pod.win{box-shadow:0 0 24px #ffe25a;background:linear-gradient(#e0a020,#9a6a10)}.pi-pod.over{opacity:.6}`;

function makeSound(){
 let a=null,bus=null,nb=null,yodelStop=null;
 const ok=()=>{if(!store.profile?.settings.sound&&!store.profile?.settings.music)return false;a=audioContext();if(!a)return false;if(!bus){bus=a.createGain();bus.gain.value=.55;bus.connect(a.destination);}return true;};
 const note=(f,t,d,v,type='sawtooth')=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(bus);o.start(t);o.stop(t+d+.03);return o;};
 const noise=(t,d,v,f)=>{nb||=(()=>{const b=a.createBuffer(1,a.sampleRate,a.sampleRate),x=b.getChannelData(0);for(let i=0;i<x.length;i++)x[i]=Math.random()*2-1;return b;})();const n=a.createBufferSource(),l=a.createBiquadFilter(),g=a.createGain();n.buffer=nb;n.loop=true;l.type='bandpass';l.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+d*.2);g.gain.linearRampToValueAtTime(.0001,t+d);n.connect(l).connect(g).connect(bus);n.start(t);n.stop(t+d+.02);};
 // our own yodel: the voice flips between a chest note and a falsetto a sixth above, on a tune written for this game
 const YODEL=[392,659,523,784,659,523,440,698,587,880,698,587];
 return {
  fanfare(){if(!ok())return;const t=a.currentTime;[523,659,784,1047,784,1047].forEach((f,i)=>{note(f,t+i*.11,.3,.14);note(f/2,t+i*.11,.3,.1,'square');});},
  win(){if(!ok())return;const t=a.currentTime;[784,988,1175,1568].forEach((f,i)=>note(f,t+i*.08,.45,.13));noise(t,1.6,.22,1800);},
  lose(){if(!ok())return;const t=a.currentTime;[392,370,349,311].forEach((f,i)=>{const o=note(f,t+i*.34,i===3?1:.32,.2);o.frequency.linearRampToValueAtTime(f*.97,t+i*.34+.3);});},
  ding(){if(!ok())return;const t=a.currentTime;note(1760,t,.8,.2,'sine');note(2637,t,.6,.1,'sine');},
  tick(){if(!ok())return;note(1500,a.currentTime,.03,.08,'square');},
  peg(){if(!ok())return;note(900+Math.random()*700,a.currentTime,.05,.05,'triangle');},
  thud(){if(!ok())return;note(90,a.currentTime,.25,.3,'sine');},
  fall(){if(!ok())return;const t=a.currentTime,o=note(1100,t,1.5,.2,'triangle');o.frequency.exponentialRampToValueAtTime(120,t+1.4);},
  yodel(){if(!ok())return;this.quiet();const t0=a.currentTime;let on=true;const notes=[];YODEL.concat(YODEL).forEach((f,i)=>{const t=t0+i*.17,o=note(f,t,.2,.16,'triangle');notes.push(o);const lfo=a.createOscillator(),d=a.createGain();lfo.frequency.value=6;d.gain.value=f*.012;lfo.connect(d).connect(o.frequency);lfo.start(t);lfo.stop(t+.22);});yodelStop=()=>{if(on){on=false;for(const o of notes)try{o.stop();}catch{}}};},
  quiet(){yodelStop?.();yodelStop=null;}};
}

async function priceShow(s){
 const [c,g]=s.canvas(680,780,{fill:true}),fb=fullBleed(s,{bg:'#2c0d52'});
 const net=s.online||null,me=net?net.me:0,them=1-me,cpu=isCpu(s),snd=makeSound(),calm=!!store.profile?.settings.reducedMotion,bank=[0,0];if(cpu||net)s.hotseat=true;
 const css=document.createElement('style');css.textContent=CSS;document.head.append(css);
 s.body.style.position='relative';const ui=document.createElement('div');ui.className='pi-ui';s.body.append(ui);
 const hud=document.createElement('div');hud.className='pi-hud';const layer=document.createElement('div');ui.append(hud,layer);
 holdMusic(6*3600);s.cleanup(()=>{css.remove();ui.remove();snd.quiet();releaseMusic();});
 const name=i=>s.players[i].name,auto=i=>cpu&&i===1;
 const prizes=shuffle(ITEMS,s.random),small=shuffle(GROCERY,s.random);let smallAt=0;
 const showHud=()=>{hud.innerHTML=[0,1].map(i=>`<span>${e(name(i))} ${money(bank[i])}</span>`).join('');s.setScores(bank.map(Math.round));};
 const pay=(i,n)=>{bank[i]+=n;showHud();};
 let scene=null,act=null,tile=null,tileKey='',T=0;     // scene(dt) draws over the stage; act = what the test bot does next

 // ---- stage: orange and pink 70s tiles, marquee bulbs
 function stage(W,H){const key=W+'x'+H;if(tileKey!==key){tileKey=key;tile=document.createElement('canvas');tile.width=W;tile.height=H;const m=tile.getContext('2d'),k=Math.max(44,Math.min(W,H)*.14),cols=['#f47a1f','#f2c81e','#e23d84','#8a3fc4','#27a7c9'];m.fillStyle='#3a1266';m.fillRect(0,0,W,H);let n=0;for(let y=0;y<H+k;y+=k)for(let x=(Math.floor(y/k)%2)*k/2-k;x<W+k;x+=k){m.fillStyle=cols[n++%cols.length];m.beginPath();m.roundRect(x+3,y+3,k-6,k-6,k*.3);m.fill();m.fillStyle='#ffffff30';m.beginPath();m.roundRect(x+k*.24,y+k*.24,k*.52,k*.52,k*.16);m.fill();}m.fillStyle='#2c0d52b0';m.fillRect(0,0,W,H);}
  g.drawImage(tile,0,0,W,H);}
 function outlined(t,x,y,px,col='#fff',stroke='#000',fam='Impact,"Arial Black",sans-serif'){g.font=`${px}px ${fam}`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=Math.max(3,px*.14);g.strokeStyle=stroke;g.strokeText(t,x,y);g.fillStyle=col;g.fillText(t,x,y);}
 // the room the DOM panel leaves for a scene
 function view(panel=false){const W=s.W,H=s.H,top=(fb.top||40)+10,bot=38;if(!panel)return {x:0,y:top,w:W,h:H-top-bot};const P=ui.querySelector('.pi-panel')?.getBoundingClientRect(),R=c.getBoundingClientRect();if(W>H)return {x:0,y:top,w:(P?P.left-R.left:W*.56),h:H-top-bot};return {x:0,y:top,w:W,h:Math.max(120,(P?P.top-R.top:H*.5)-top-6)};}

 // ---- the number pad: resolves the bid
 function askNumber({em,title,blurb,who,cap=99999,cpuPick}){
  layer.innerHTML=`<div class="pi-panel"><div class="pi-item"><span class="pi-em">${em}</span><div><div class="pi-name">${e(title)}</div><div class="pi-blurb">${e(blurb)}</div></div></div><div class="pi-led" data-led>$0</div>${auto(who)?'':`<div class="pi-keys">${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="pi-k" data-d="${n}">${n}</button>`).join('')}<button class="pi-k" data-d="x" aria-label="Delete">⌫</button><button class="pi-k" data-d="0">0</button><button class="pi-k go" data-go>BID</button></div>`}</div>`;
  const led=layer.querySelector('[data-led]');let val='';const show=()=>{led.textContent='$'+(val||'0');};
  return new Promise(done=>{
   if(auto(who)){led.textContent='…';s.wait(1000+Math.random()*700).then(()=>{led.textContent=money(cpuPick);s.wait(600).then(()=>done(cpuPick));});return;}
   for(const b of layer.querySelectorAll('[data-d]'))s.on(b,'click',()=>{const d=b.dataset.d;if(d==='x')val=val.slice(0,-1);else if(+(val+d)<=cap)val=(val+d).replace(/^0+(?=\d)/,'');snd.tick();show();});
   const go=()=>{if(!val)return;act=null;done(+val);};s.on(layer.querySelector('[data-go]'),'click',go);
   act=guess=>{val=String(guess);show();go();return 'bid';};
  });}
 const cpuGuess=(p,tight=false)=>{const err=(tight?.35:.45)*(1.15-cpuSkill(s))*(Math.random()*1.3-.65);return Math.max(1,Math.round(p*(1+err)));};
 const center=html=>{layer.innerHTML=`<div class="pi-center">${html}</div>`;};
 async function announce(big,small,ms=1700,sound='fanfare'){center(`<h2>${e(big)}</h2><p>${e(small)}</p>`);snd[sound]?.();return s.wait(ms);}

 // ---- One Bid: closest without going over
 async function oneBid(r){const {emoji:em,name:title,blurb,price}=prizes[r%prizes.length],bids=[null,null],ask=i=>askNumber({em,title,blurb,who:i,cpuPick:cpuGuess(price)});
  if(net){bids[me]=await ask(me);if(!s.alive)return false;net.send({r,bid:bids[me],bank:bank[me]});center(`<p>Waiting for ${e(name(them))}’s bid…</p>`);const m=await net.next();if(!s.alive)return false;bids[them]=m?Math.max(0,+m.bid||0):0;if(m)bank[them]=+m.bank||0;}
  else for(const i of [0,1]){if(!auto(i)&&!await s.pass(i,'Contestants’ Row. Bid on the prize: closest without going over wins it, dead on pays $500 more.','Come on down!'))return false;bids[i]=await ask(i);if(!s.alive)return false;}
  const ok=[0,1].filter(i=>bids[i]<=price),best=ok.length?ok.reduce((a,b)=>bids[a]===bids[b]?a:bids[a]>bids[b]?a:b):-1,tie=ok.length===2&&bids[0]===bids[1];
  const pod=i=>`<div class="pi-pod ${(tie||i===best)&&ok.includes(i)?'win':ok.includes(i)?'':'over'}">${e(name(i))}<b>${money(bids[i])}</b></div>`;
  center(`<p>${em} ${e(title)}</p><div class="pi-pods">${pod(0)}${pod(1)}</div><p>Actual retail price…</p>`);act=null;snd.tick();if(!await s.wait(calm?500:1200))return false;
  const exact=best>=0&&bids[best]===price;
  center(`<p>${em} ${e(title)}</p><div class="pi-pods">${pod(0)}${pod(1)}</div><h2>${money(price)}</h2><p>${best<0?'Everybody went over!':tie?'A tie! You split it.':`${e(name(best))} wins it!${exact?' Dead on: $500 extra!':''}`}</p>`);
  if(best<0)snd.lose();else{snd.win();if(exact)snd.ding();if(tie){pay(0,price/2);pay(1,price/2);}else pay(best,price+(exact?500:0));}
  return s.wait(calm?1200:2600);}

 // ---- Plinko
 function plinko(i){const W0=360,H0=540,rows=11,pegs=[],chips=3;for(let r=0;r<rows;r++)for(let k=(r%2?0:1);k<=9;k++){const x=k*40-(r%2?0:20);if(x>4&&x<W0-4)pegs.push({x,y:88+r*36,lit:0});}
  return new Promise(done=>{let left=chips,won=0,ball=null,aim=W0/2,pop=null,lastPeg=0,dragging=false,finished=false;
   layer.innerHTML='';
   const toBoard=(p,b)=>(p.x-b.ox)/b.k;
   const geo=()=>{const v=view(),k=Math.min((v.w-16)/W0,(v.h-8)/H0);return {k,ox:v.x+(v.w-W0*k)/2,oy:v.y+(v.h-H0*k)/2};};
   const drop=()=>{if(ball||left<=0||finished)return;left--;ball={x:clamp(aim,16,W0-16),y:34,vx:(Math.random()-.5)*14,vy:0,idle:0};snd.tick();};
   const step=h=>{const b=ball;if(!b)return;b.vy+=900*h;b.x+=b.vx*h;b.y+=b.vy*h;if(b.x<13){b.x=13;b.vx=Math.abs(b.vx)*.6;}if(b.x>W0-13){b.x=W0-13;b.vx=-Math.abs(b.vx)*.6;}
    for(const p of pegs){const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy);if(d<16&&d>0){const nx=dx/d,ny=dy/d,vn=b.vx*nx+b.vy*ny;b.x=p.x+nx*16;b.y=p.y+ny*16;if(vn<0){b.vx-=1.42*vn*nx;b.vy-=1.42*vn*ny;b.vx+=(Math.random()-.5)*40;}p.lit=1;if(T-lastPeg>.05){lastPeg=T;snd.peg();}}}
    const sp=Math.hypot(b.vx,b.vy);if(sp>460){b.vx*=460/sp;b.vy*=460/sp;}b.idle=sp<14?b.idle+h:0;if(b.idle>.4){b.vx+=(Math.random()-.5)*90;b.vy-=30;b.idle=0;}
    if(b.y>H0-36){const v=PLINKO[clamp(Math.floor(b.x/40),0,8)];won+=v;pay(i,v);ball=null;pop={v,x:b.x,t:0};if(v>=10000){snd.win();vibrate(60);}else if(v)snd.ding();else snd.lose();}};
   scene=dt=>{const G=geo(),k=G.k,bx=x=>G.ox+x*k,by=y=>G.oy+y*k;g.fillStyle='#14082e';g.beginPath();g.roundRect(bx(0)-6,by(0)-6,W0*k+12,H0*k+12,14);g.fill();g.strokeStyle='#ffd21e';g.lineWidth=4;g.stroke();
    outlined('PLINKO',bx(W0/2),by(14),Math.round(26*k),'#ffe25a','#a01818');
    for(const p of pegs){p.lit=Math.max(0,p.lit-dt*3);g.fillStyle=p.lit>0?'#fff':'#c8c0e6';g.beginPath();g.arc(bx(p.x),by(p.y),3.6*k+p.lit*2,0,7);g.fill();}
    PLINKO.forEach((v,j)=>{const x=j*40,top=H0-36;g.fillStyle=v===10000?(Math.floor(T*4)%2?'#ffe25a':'#e8a81e'):v?'#2f7fd6':'#7a1c1c';g.fillRect(bx(x)+1,by(top),40*k-2,36*k);outlined(v===10000?'$10K':v?'$'+v:'$0',bx(x+20),by(top+18),Math.round(Math.max(10,(v>=1000?11:12)*k)),'#fff');});
    if(!ball&&left>0&&!finished){s.sprite(g,i,bx(clamp(aim,16,W0-16)),by(44),26*k,{exact:true,mood:'thinking'});outlined(auto(i)?`${name(i).toUpperCase()} IS AIMING`:'DRAG, THEN LET GO',bx(W0/2),by(72),Math.round(11*k),'#fff');}
    if(ball){for(let n=0;n<3;n++)step(dt/3);if(ball)s.sprite(g,i,bx(ball.x),by(ball.y),26*k,{exact:true,mood:'win'});}
    if(pop){pop.t+=dt;outlined(money(pop.v),bx(pop.x),by(H0-60-pop.t*50),Math.round(26*k),pop.v?'#ffe25a':'#ff6a5a');if(pop.t>1.1)pop=null;}
    outlined(`${left} CHIP${left===1?'':'S'} LEFT · ${money(won)}`,bx(W0/2),by(H0)+12,Math.max(12,Math.round(13*k)),'#fff');
    if(!ball&&!pop&&left<=0&&!finished){finished=true;scene=null;act=null;done(won);}};
   if(auto(i)){let wait=.9;const inner=scene;scene=dt=>{if(!ball&&left>0&&!pop){wait-=dt;aim+=(W0/2-aim)*dt+Math.sin(T*2)*40*dt;if(wait<=0){wait=.9;aim=W0/2+(Math.random()-.5)*140;drop();}}inner(dt);};}
   else{act=x=>{aim=x??W0/2+(Math.random()-.5)*200;drop();return 'drop';};
    pointer={down:p=>{if(ball)return;dragging=true;aim=toBoard(p,geo());},move:p=>{if(dragging)aim=toBoard(p,geo());},up:()=>{if(dragging){dragging=false;drop();}}};}
  }).finally?.(()=>{pointer=null;});}

 // ---- Cliff Hangers: three small prices; every dollar off is a step up the mountain; past 25 he falls
 async function cliff(i){let stepAt=0,shown=0,fallT=-1,pending=0,walking=null;const LIMIT=25;
  const pose=(n,v)=>{const u=n/LIMIT;return {x:v.x+v.w*(.08+.72*u),y:v.y+v.h*(.86-.62*u)};};
  scene=dt=>{const v=view(true);g.save();g.beginPath();g.rect(v.x,v.y-10,v.w,v.h+10);g.clip();const sky=g.createLinearGradient(0,v.y,0,v.y+v.h);sky.addColorStop(0,'#59b7ea');sky.addColorStop(1,'#d9f1ff');g.fillStyle=sky;g.fillRect(v.x,v.y-10,v.w,v.h+10);
   const a=pose(0,v),b=pose(LIMIT,v);g.fillStyle='#8a7f73';g.beginPath();g.moveTo(v.x,v.y+v.h);g.lineTo(a.x-v.w*.1,a.y+v.h*.04);g.lineTo(b.x,b.y+6);g.lineTo(b.x+v.w*.04,b.y+v.h*.1);g.lineTo(b.x+v.w*.07,v.y+v.h);g.fill();g.fillStyle='#f4f8fb';g.beginPath();g.moveTo(b.x-v.w*.13,b.y+v.h*.11);g.lineTo(b.x,b.y+6);g.lineTo(b.x+v.w*.03,b.y+v.h*.1);g.fill();
   g.fillStyle='#3f8a3c';g.fillRect(v.x,v.y+v.h*.94,v.w,v.h*.06);for(let n=0;n<=LIMIT;n++){const p=pose(n,v);g.fillStyle=n===LIMIT?'#ff3c28':n%5?'#ffffff99':'#ffe25a';g.fillRect(p.x-2,p.y+2,4,4);if(n%5===0&&n)outlined(String(n),p.x,p.y+14,11,'#fff');}
   if(walking){stepAt+=dt/(calm?.05:.17);const goal=walking.goal;if(stepAt>=1){stepAt=0;if(shown<goal)shown++;snd.tick();}if(shown>=goal&&stepAt>.4){const d=walking.done;walking=null;d();}}
   const sz=Math.min(v.w*.17,v.h*.24);let p=pose(Math.min(LIMIT,shown),v);if(fallT>=0){fallT+=dt;p={x:b.x+v.w*.05+fallT*30,y:b.y+fallT*fallT*v.h*.55};}
   const bob=walking?Math.abs(Math.sin(T*16))*sz*.1:0;g.save();g.translate(p.x,p.y-sz*.55-bob);if(fallT>=0)g.rotate(fallT*7);g.fillStyle='#2f7d3f';g.fillRect(-sz*.17,sz*.22,sz*.34,sz*.32);g.fillStyle='#7b4a22';g.fillRect(-sz*.17,sz*.52,sz*.13,sz*.2);g.fillRect(sz*.04,sz*.52,sz*.13,sz*.2);s.sprite(g,i,0,0,sz*.62,{exact:true,mood:fallT>=0?'sad':shown>18?'sad':'win'});g.fillStyle='#2f7d3f';g.beginPath();g.ellipse(0,-sz*.25,sz*.27,sz*.07,0,0,7);g.fill();g.fillRect(-sz*.13,-sz*.42,sz*.26,sz*.18);g.fillStyle='#d62f2f';g.fillRect(sz*.1,-sz*.44,sz*.05,sz*.17);g.restore();
   outlined(`${Math.min(LIMIT,shown)} / ${LIMIT} STEPS`,v.x+v.w*.3,v.y+18,Math.max(14,Math.min(22,v.w*.05)),'#fff');g.restore();};
  const climb=n=>new Promise(d=>{walking={goal:n,done:d};if(n>0)snd.yodel();});
  for(let k=0;k<3;k++){const [em,title,price]=small[(smallAt++)%small.length];const guess=await askNumber({em,title,blurb:`Item ${k+1} of 3: under $30 or so. Every dollar off is one step up. Past ${LIMIT}, he falls.`,who:i,cap:999,cpuPick:cpuGuess(price,true)});if(!s.alive)return 0;
   const off=Math.abs(guess-price);center(`<p>${em} ${e(title)}</p><h2>${money(price)}</h2><p>You said ${money(guess)}: ${off?`${off} step${off===1?'':'s'}`:'dead on, he stays put!'}</p>`);if(!off)snd.ding();await s.wait(calm?500:1200);if(!s.alive)return 0;layer.innerHTML='';
   pending+=off;await climb(Math.min(LIMIT+1,pending));snd.quiet();if(!s.alive)return 0;
   if(pending>LIMIT){fallT=0;snd.fall();await s.wait(1600);if(!s.alive)return 0;snd.lose();scene=null;await announce('OFF THE CLIFF!',`${name(i)} wins nothing.`,1700,'');return 0;}}
  scene=null;pay(i,5000);await announce('$5,000!',`${name(i)} made it with ${LIMIT-pending} step${LIMIT-pending===1?'':'s'} to spare.`,1900,'win');return 5000;}

 // ---- the Big Wheel: swipe down to spin, up to twice, get close to a dollar without going over
 function wheel(i){return new Promise(done=>{let pos=Math.floor(Math.random()*20),vel=0,total=0,spins=0,state='ready',y0=0,t0=0,lastI=-1,msg='SWIPE DOWN TO SPIN';
   layer.innerHTML='';
   const settle=v=>{scene=wheelScene;const pay1=v>100?0:v===100?10000:v*50;if(pay1)pay(i,pay1);if(v===100)snd.win();else if(v>100)snd.lose();else snd.ding();msg=v>100?'OVER A DOLLAR! NOTHING!':v===100?'A DOLLAR! $10,000!':`${v}¢ PAYS ${money(pay1)}`;act=null;s.wait(calm?1000:2200).then(()=>{scene=null;layer.innerHTML='';done(pay1);});};
   const spinNow=v=>{if(state!=='ready')return;vel=clamp(v,15,34);state='spin';spins++;layer.innerHTML='';act=null;};
   const offer=()=>{if(auto(i)){s.wait(1000).then(()=>{if(total<=(cpuSkill(s)>.5?55:45)){state='ready';spinNow(16+Math.random()*16);}else settle(total);});return;}
    state='choose';msg=`YOU HAVE ${total}¢`;layer.innerHTML=`<div class="pi-center" style="justify-content:flex-end;pointer-events:none"><div class="pi-row"><button class="pi-btn" data-again>Spin again</button><button class="pi-btn alt" data-stay>Stay on ${total}¢</button></div></div>`;
    const again=()=>{state='ready';msg='SWIPE DOWN TO SPIN';layer.innerHTML='';act=()=>{spinNow(16+Math.random()*16);return 'spin';};},stay=()=>{layer.innerHTML='';settle(total);};
    s.on(layer.querySelector('[data-again]'),'click',again);s.on(layer.querySelector('[data-stay]'),'click',stay);act=()=>{(total<60?again:stay)();return 'choose';};};
   const wheelScene=dt=>{const v=view(),W=Math.min(v.w*.62,v.h*.62),cx=v.x+v.w/2,cy=v.y+v.h/2-10,rowH=Math.min(v.h/7,84);
    if(state==='spin'){pos+=vel*dt;vel*=Math.exp(-.62*dt);vel-=.5*dt;const at=Math.floor(pos);if(at!==lastI){lastI=at;snd.tick();}if(vel<.9){pos=Math.round(pos);vel=0;const val=WHEEL[((pos%20)+20)%20];total+=val;state='result';if(total>100||spins>=2)settle(total);else offer();}}
    g.save();g.beginPath();g.roundRect(cx-W/2,cy-rowH*3.5,W,rowH*7,18);g.clip();const frac=pos-Math.floor(pos);for(let r=-4;r<=4;r++){const idx=((Math.floor(pos)-r)%20+20)%20,val=WHEEL[idx],y=cy+(r+frac)*rowH,squash=Math.cos(clamp((y-cy)/(rowH*3.8),-1.5,1.5));g.fillStyle=val===100?'#ffe25a':WHEEL_COL[idx%WHEEL_COL.length];g.fillRect(cx-W/2,y-rowH/2,W,rowH);g.strokeStyle='#000a';g.lineWidth=3;g.strokeRect(cx-W/2,y-rowH/2,W,rowH);g.save();g.translate(cx,y);g.scale(1,Math.max(.25,squash));outlined(val===100?'$1.00':`${val}¢`,0,0,Math.round(rowH*.55),'#fff');g.restore();}
    const sh=g.createLinearGradient(0,cy-rowH*3.5,0,cy+rowH*3.5);sh.addColorStop(0,'#000c');sh.addColorStop(.32,'#0000');sh.addColorStop(.68,'#0000');sh.addColorStop(1,'#000c');g.fillStyle=sh;g.fillRect(cx-W/2,cy-rowH*3.5,W,rowH*7);g.restore();
    g.strokeStyle='#ffd21e';g.lineWidth=5;g.beginPath();g.roundRect(cx-W/2,cy-rowH*3.5,W,rowH*7,18);g.stroke();g.fillStyle='#ffe25a';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.moveTo(cx-W/2-22,cy-14);g.lineTo(cx-W/2+6,cy);g.lineTo(cx-W/2-22,cy+14);g.closePath();g.fill();g.stroke();
    outlined(msg,v.x+v.w/2,cy+rowH*3.5+18,Math.max(14,Math.min(24,v.w*.05)),'#ffe25a');outlined(auto(i)?`${name(i)}'S SPIN`:spins?'SPIN 2 OF 2':'THE BIG WHEEL',v.x+v.w/2,cy-rowH*3.5-16,Math.max(14,Math.min(24,v.w*.05)),'#fff');};
   scene=wheelScene;
   if(auto(i))s.wait(1000).then(()=>spinNow(16+Math.random()*16));
   else{act=()=>{spinNow(16+Math.random()*16);return 'spin';};pointer={down:p=>{y0=p.y;t0=performance.now();},move:()=>{},up:p=>{const dy=p.y-y0,dtm=Math.max(40,performance.now()-t0);if(state==='ready'&&dy>24)spinNow(14+(dy/dtm)*14);}};}
  });}

 let pointer=null;
 for(const [ev,key] of [['pointerdown','down'],['pointermove','move'],['pointerup','up']])s.on(c,ev,e=>{if(!s.paused&&pointer)pointer[key](s.pointer(e));});
 s.debug={engine:'priceShow',bank,get scene(){return !!scene;},bot(){if(act&&!s.paused){const k=act(ACT());return k;}return null;}};
 const ACT=()=>{const led=ui.querySelector('[data-led]');return led?1+Math.floor(Math.random()*600):undefined;};
 s.frame((dt,time)=>{if(!s.alive)return;T=time;const W=s.W,H=s.H;stage(W,H);if(scene)scene(dt);});
 showHud();
 const GAMES={plinko,cliff,wheel},LABEL={plinko:['PLINKO','Drop up to three chips. The middle slot pays $10,000.'],cliff:['CLIFF HANGERS','Guess three small prices. Don’t let him fall!'],wheel:['THE BIG WHEEL','One or two spins. Near a dollar pays big; over pays nothing.']};
 async function run(kind,i){pointer=null;act=null;if(!net&&!auto(i)&&!await s.pass(i,LABEL[kind][1],`Play ${LABEL[kind][0]}`))return false;
  await announce(LABEL[kind][0],`${name(i)}: ${LABEL[kind][1]}`,calm?500:1500);if(!s.alive)return false;layer.innerHTML='';await GAMES[kind](i);pointer=null;scene=null;layer.innerHTML='';return s.alive;}

 // ---- the episode
 if(!net&&!await s.pass(0,'The Price Is Right: three rounds of bidding on prizes, then Plinko, Cliff Hangers and the Big Wheel. Most money wins.','Come on down!'))return;
 await announce('COME ON DOWN!',`${name(0)} and ${name(1)}, you’re the next contestants!`,calm?700:2000);if(!s.alive)return;
 for(let r=0;r<PLAN.length;r++){if(!await oneBid(r)||!s.alive)return;for(const i of net?[me]:[0,1])if(!await run(PLAN[r],i))return;}
 if(net){net.send({fin:bank[me]});center(`<p>You won ${money(bank[me])}. Waiting for ${e(name(them))}…</p>`);const m=await net.next();if(!s.alive)return;if(m&&typeof m.fin==='number')bank[them]=m.fin;showHud();}
 const best=bank[0]===bank[1]?-1:bank[0]>bank[1]?0:1;await announce(best<0?'DEAD HEAT!':`${name(best).toUpperCase()} WINS!`,best<0?`Both won ${money(bank[0])}.`:`${money(bank[best])} in cash and prizes!`,calm?800:2400,best<0?'fanfare':'win');if(!s.alive)return;
 s.finish(bank.map(Math.round),`${name(0)} ${money(bank[0])} · ${name(1)} ${money(bank[1])}.`);
}
Object.assign(exports,{priceShow});
