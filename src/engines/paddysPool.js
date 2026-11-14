// PADDY'S POOL (owner, Nov 14): a modern, professional-looking pool game set in Paddy's Pub. 8-ball (`paddys-eight-ball`)
// and 9-ball (`color-of-money`, the old id, kept for saves). Real physics with spin (src/engines/pool/physics.js), WPA-style
// rules (pool/rules.js), a CPU that plans with the physics (pool/cpu.js), balls drawn as rolling spheres (pool/balls.js),
// and the PADDY'S POOL HALL: the cash you win buys tables (they play differently: the Paddy's wreck leans, its torn felt
// grabs balls and its cushions are dead), felts, cues (power / spin / aim lines), ball sets, chalk, and upgrades for the bar
// itself (the room, the table light, TVs, the bar, neon signs and other decorations): src/data/poolHall.js, saved in
// profile.poolHall. Drop-in art: src/data/poolSprites.js (assets/pool).
// Controls (modern mobile pool): drag anywhere on the table to swing the cue round the cue ball (tap a ball to aim straight
// at it), the fine-aim wheel for tiny turns, pull the POWER bar and let go to shoot, the cue-ball button sets spin (top =
// follow, bottom = draw, sides = english). Ball in hand: drag the cue ball. 8-ball: tap a pocket to call the 8.
// QoL: aim line, ghost ball, object-ball and cue-ball paths (Settings: Full / Standard / Pro), wrong-ball warning, auto pocket
// call, optional shot clock, instant replay of the last shot, the balls left for each player, banners for banks, combos,
// kicks, run-outs, golden breaks; the gang heckles from the bar.
// Online (s.online): the shooter's phone plays the shot: aim {aim}, cue ball placement {bh}, call {call}, shot {f}; the other
// phone runs the same fixed-step physics from it and takes the shooter's exact result {fin} (positions + record), so both
// judge the shot the same way. Seat 0's phone picks the table {setup}; each phone sends its own cue {cue}.
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const {vibrate}=require("src/audio.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {voice,noise}=require("src/engines/tarantinoKit.js");
const {isCpu,isOnline,cpuSkill}=require("src/engines/cpuKit.js");
const {tableSound}=require("src/engines/vegasTable.js");
const PH=require("src/engines/pool/physics.js");
const RU=require("src/engines/pool/rules.js");
const CPU=require("src/engines/pool/cpu.js");
const BA=require("src/engines/pool/balls.js");
const ART=require("src/engines/pool/art.js");
const HALL=require("src/data/poolHall.js");
const PS=require("src/data/poolSprites.js");
const HF=require("src/headFacts.js");
const {R,HX,HY}=PH;
const TW=103.4,TH=59.4,STEP=1/120,CLOCK=40;
const GANG=['charlie','mac','dee','dennis','frank'];
const QUIPS={
 good:[['dennis','Five stars. Golden.'],['mac','Ocular pat-down: that was clean.'],['charlie','Wildcard! That was a wildcard shot!'],['frank','Hey, nice shot. Can I offer you an egg?'],['dee','I would have made that too.']],
 bank:[['charlie','It bounced off the thing and went in the hole!'],['dennis','Bank shot. I am a golden god.'],['mac','Physics. I understand physics.']],
 combo:[['charlie','Pepe Silvia! It\'s all connected!'],['mac','A combo. Like a karate combo.']],
 foul:[['dee','Ha! You suck!'],['frank','So I\'m trashing the place?'],['dennis','Classic. Just classic.'],['charlie','Is that... is that a foul?']],
 scratch:[['frank','You scratched! Pay up!'],['dee','Scratch! Ugh, you\'re like a bird with no hands.'],['mac','That ball went in the wrong hole, dude.']],
 miss:[['dee','Nice miss, idiot.'],['frank','Ehh. Whatever.'],['charlie','I can\'t read, but I know that was bad.']],
 win:[['dennis','Victory belongs to the golden.'],['charlie','Wildcard, bitches! Yee-haw!'],['frank','Winners drink free! Kidding. Pay up.'],['mac','That\'s how the boys do it.']],
 runout:[['dennis','A RUN OUT. The implication is clear.'],['charlie','He ran the whole table! Ran it!'],['mac','That was like a perfect roundhouse.']],
};
async function paddysPool(s){
 let game=s.game?.poolGame||(s.game?.id==='paddys-eight-ball'?'eight':'nine');
 const [c,x]=s.canvas(760,560,{fill:true});const fb=fullBleed(s,{bg:'#0b0807'});s.body.classList.add('drag-arena-body');s.controls([]);
 const net=isOnline(s)?s.online:null,me=net?net.me:0,cpu=isCpu(s);if(net)s.hotseat=true;
 const arcade=s.origin==='arcade'&&!net&&!s.solo?.duel;
 const P=store.profile;if(P)P.poolHall=HALL.validHall(P.poolHall);
 const hall=P?.poolHall||HALL.freshHall();
 const save=()=>{if(P){P.poolHall=hall;try{saveProfile(P);}catch{}}};
 PS.preloadPool();
 const art=BA.makeBallArt(),snd=tableSound(s);
 let dpr=1,W=0,H=0,L=null,t=0;
 // ---------------------------------------------------------------- sound
 let lastClack=0;
 const sfx={
  clack(v){const now=t;if(now-lastClack<.025)return;lastClack=now;const k=Math.min(1,v/220);if(k<.03)return;voice(2500+Math.random()*700,.045,.11*k+.01,'sine');noise(.025,.12*k,{type:'highpass',f0:2600});},
  rail(v){const k=Math.min(1,v/200);if(k<.04)return;noise(.08,.18*k,{f0:380});voice(95,.09,.12*k,'sine',{slide:.6});},
  pocket(v){const k=Math.min(1,.35+v/160);voice(150,.2,.16*k,'sine',{slide:.45});noise(.14,.1*k,{type:'bandpass',f0:800,q:2});voice(80,.14,.12*k,'sine',{delay:.11,slide:.6});noise(.08,.06,{delay:.13,type:'bandpass',f0:500});},
  cue(p){voice(820+p*300,.05,.08+p*.12,'triangle');noise(.05,.12+p*.2,{type:'bandpass',f0:1900,q:1.4});},
  chalk(){noise(.18,.05,{type:'bandpass',f0:3400,q:4});},
  cheer(){if(!showDecor('crowd'))return;noise(.9,.07,{type:'bandpass',f0:1200,f1:700,q:.6});for(let i=0;i<5;i++)voice(240+Math.random()*200,.25,.025,'sawtooth',{delay:Math.random()*.4,slide:1.3,lp:1200});},
  boo(){if(!showDecor('crowd'))return;for(let i=0;i<4;i++)voice(140+Math.random()*40,.6,.03,'sawtooth',{delay:Math.random()*.2,slide:.8,lp:700});},
  buy(){voice(880,.08,.08,'square');voice(1320,.12,.08,'square',{delay:.08});},
  tap(){voice(1300,.03,.04,'sine');vibrate(6);},
 };
 const showDecor=id=>loadout.decor.includes(id);
 // ---------------------------------------------------------------- loadout + table
 let loadout=HALL.loadout(hall),T=PH.buildTable(loadout.table.feel),theirCue=loadout.cue;
 const cueOf=p=>net?(p===me?loadout.cue:theirCue):loadout.cue;
 // ---------------------------------------------------------------- state
 const S={phase:'wait',m:null,balls:[],angle:0,power:0,side:0,vert:0,spinOpen:false,call:-1,clock:CLOCK,rec:null,on:[],
  pots:[[],[]],cash:[{},{}],potCount:[0,0],banner:[],quip:null,pops:[],sinking:[],replay:null,frames:[],lastFrames:null,cueT:0,aiming:false,lastShot:null,
  plan:null,planBusy:false,botT:0,hover:null,tray:[[],[]],summary:null,rackWin:null,shooter:0,foulMsg:''};
 const rackRand=n=>{let h=2166136261;for(const ch of String(s.seed||'pool')+':'+n){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}let a=h>>>0;return()=>{a=a+0x6D2B79F5|0;let q=Math.imul(a^a>>>15,1|a);q=q+Math.imul(q^q>>>7,61|q)^q;return((q^q>>>14)>>>0)/4294967296;};};
 const cueBall=()=>S.balls[0];
 const human=p=>!(cpu&&p===1)&&!(net&&p!==me);
 const myTurn=()=>S.m&&human(S.m.turn);
 const name=p=>s.players[p]?.name||`Player ${p+1}`;
 const COLP=['#ffcf3f','#5fd0ff'];
 // ---------------------------------------------------------------- layout
 function layout(){
  const w=s.W,h=s.H;dpr=Math.min(2.5,window.devicePixelRatio||1);const cw=Math.round(w*dpr),ch=Math.round(h*dpr);if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
  if(L&&L.W===w&&L.H===h&&L.dpr===dpr)return;W=w;H=h;
  const rot=h>w*1.05,top=fb.top||40;
  let l;
  if(rot){const hudY=top+4,hudH=58,bot=Math.min(96,Math.max(78,h*.11)),aw=w-10,ah=h-hudY-hudH-bot-10,k=Math.min(aw/TH,ah/TW);
   l={rot:true,k,cx:w/2,cy:hudY+hudH+6+ah/2,hudY,hudH,wall:[0,0,w,hudY+hudH+4],
    power:{x:w*.2,y:h-bot+10,w:w*.56,h:bot-26,vert:false},wheel:{x:w*.79,y:h-bot+10,w:w*.19,h:bot-26,vert:false},spin:{x:w*.1,y:h-bot/2-3,r:Math.min(30,bot*.36)}};}
  else{const hudY=6,hudH=52,side=Math.min(86,Math.max(62,w*.085)),aw=w-2*side-14,ah=h-hudY-hudH-14,k=Math.min(aw/TW,ah/TH);
   l={rot:false,k,cx:w/2,cy:hudY+hudH+6+ah/2,hudY,hudH,wall:[0,0,w,hudY+hudH+2],
    power:{x:10,y:hudY+hudH+20,w:side-20,h:h-hudY-hudH-44,vert:true},wheel:{x:w-side+14,y:hudY+hudH+118,w:side-28,h:h-hudY-hudH-128,vert:true},spin:{x:w-side/2,y:hudY+hudH+46,r:Math.min(26,side*.33)}};}
  l.W=w;l.H=h;l.dpr=dpr;L=l;layers.table=null;layers.floor=null;
 }
 const ws=(px,py)=>L.rot?{x:L.cx+py*L.k,y:L.cy-px*L.k}:{x:L.cx+px*L.k,y:L.cy+py*L.k};
 const sw=(sx,sy)=>L.rot?{x:-(sy-L.cy)/L.k,y:(sx-L.cx)/L.k}:{x:(sx-L.cx)/L.k,y:(sy-L.cy)/L.k};
 // ---------------------------------------------------------------- cached layers
 const layers={table:null,floor:null};
 function tableLayer(){const key=[L.W,L.H,dpr,loadout.table.id,loadout.felt.id].join();if(layers.table&&layers.table.key===key)return layers.table;
  const pw=(L.rot?TH:TW)*L.k+40,ph=(L.rot?TW:TH)*L.k+40,cv=document.createElement('canvas');cv.width=Math.ceil(pw*dpr);cv.height=Math.ceil(ph*dpr);const g=cv.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0);g.translate(pw/2,ph/2);if(L.rot)g.rotate(-Math.PI/2);g.scale(L.k,L.k);
  ART.drawTable(g,T,{look:loadout.table.look,felt:loadout.felt,wear:loadout.table.look.wear,rough:loadout.table.feel.rough||[],id:loadout.table.id,k:L.k});
  return layers.table={key,cv,pw,ph};}
 function floorLayer(){const key=[L.W,L.H,dpr,loadout.room.reno].join();if(layers.floor&&layers.floor.key===key)return layers.floor;
  const cv=document.createElement('canvas');cv.width=Math.ceil(L.W*dpr);cv.height=Math.ceil(L.H*dpr);const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
  ART.drawFloor(g,L.W,L.H,loadout.room.reno);
  // light pool around the table + darker corners
  const rg=g.createRadialGradient(L.cx,L.cy,Math.min(L.W,L.H)*.2,L.cx,L.cy,Math.max(L.W,L.H)*.75);rg.addColorStop(0,'rgba(255,230,170,.12)');rg.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=rg;g.fillRect(0,0,L.W,L.H);
  return layers.floor={key,cv};}
 // ---------------------------------------------------------------- the match
 function newRack(){const m=S.m,rr=rackRand(m.rackNo);S.balls=PH.rack(game,rr);S.pots=[[],[]];S.tray=[[],[]];S.call=-1;S.side=S.vert=0;S.angle=0;S.lastFrames=null;S.replay=null;
  S.rackT=t;aimAtRack();}
 function aimAtRack(){const cb=cueBall(),head=S.balls.filter(b=>b.on&&b.id).sort((a,b)=>a.x-b.x)[0];if(head)S.angle=Math.atan2(head.y-cb.y,head.x-cb.x);}
 const targetIds=()=>{const on=S.balls.filter(b=>b.on&&b.id).map(b=>b.id);return RU.targets(S.m,on);};
 function banner(text,sub='',col='#ffd23f',dur=1.8){S.banner.push({text,sub,col,dur,t0:null});}
 function quip(kind){if(Math.random()<.45&&kind!=='win'&&kind!=='runout')return;const list=QUIPS[kind];if(!list)return;const [id,line]=list[Math.floor(Math.random()*list.length)];S.quip={id,line,t0:t,dur:3.2};}
 function earn(p,key,n=1){const v=HALL.CASH[key]*n;if(!v)return;S.cash[p][key]=(S.cash[p][key]||0)+v;}
 // ---------------------------------------------------------------- shooting
 function shotParams(){const st=cueOf(S.m.turn).stats,dir=[Math.cos(S.angle),Math.sin(S.angle)];return {dir,speed:Math.max(8,S.power*330*st.power),side:S.side,vert:S.vert};}
 function fire(p=shotParams(),remote=false){
  if(S.phase!=='aim')return;const cb=cueBall();
  if(game==='eight'&&targetIds().includes(8)&&S.call<0)S.call=autoCall();
  S.m.call=S.call;
  if(net&&!remote)net.send({f:[+p.dir[0].toFixed(6),+p.dir[1].toFixed(6),+p.speed.toFixed(4),+p.side.toFixed(4),+p.vert.toFixed(4),+cb.x.toFixed(4),+cb.y.toFixed(4),S.call]});
  S.on=S.balls.filter(b=>b.on&&b.id).map(b=>b.id);S.rec=PH.newRecord(S.balls);S.ev=PH.recorder(S.rec);
  const ev=S.ev,o={ball:ev.ball,rail:ev.rail,pocket:ev.pocket};
  S.events={ball:(a,b,v)=>{o.ball(a,b);sfx.clack(v);},rail:(b,v,kind)=>{o.rail(b,v,kind);sfx.rail(v);},pocket:(b,i)=>{o.pocket(b,i);sfx.pocket(b.sinkV||60);S.sinking.push({id:b.id,x:b.x,y:b.y,p:T.pockets[i],t0:t});if(b.id){const pp=T.pockets[i],q=ws(pp.x,pp.y);S.pops.push({x:q.x,y:q.y,text:b.id===0?'SCRATCH':'',t0:t});}}};
  PH.strike(cb,p.dir,p.speed,p.side,p.vert);sfx.cue(Math.min(1,p.speed/330));vibrate(Math.round(8+p.speed/20));
  S.phase='roll';S.rollT=0;S.acc=0;S.cueT=t;S.lastShot={...p,from:{x:cb.x,y:cb.y}};S.frames=[];S.frameT=0;S.spinOpen=false;S.shooter=S.m.turn;S.power=0;
 }
 function autoCall(){const cb=cueBall(),hit=PH.castAim(S.balls,T,cb,[Math.cos(S.angle),Math.sin(S.angle)]);if(!hit.ball||hit.ball.id!==8)return nearestPocket(S.balls.find(b=>b.id===8));
  const nx=hit.ball.x-hit.ghost.x,ny=hit.ball.y-hit.ghost.y,l=Math.hypot(nx,ny)||1;let best=0,bv=-1e9;T.pockets.forEach((p,i)=>{const [ax,ay]=CPU.aimPoint(p),dx=ax-hit.ball.x,dy=ay-hit.ball.y,d=Math.hypot(dx,dy),v=(dx*nx+dy*ny)/(d*l)-d*.002;if(v>bv){bv=v;best=i;}});return best;}
 function nearestPocket(b){if(!b)return 0;let best=0,bd=1e9;T.pockets.forEach((p,i)=>{const d=Math.hypot(p.x-b.x,p.y-b.y);if(d<bd){bd=d;best=i;}});return best;}
 function rollStep(dt){
  S.acc+=Math.min(dt,.1);let moved=false;
  while(S.acc>=STEP){S.acc-=STEP;S.rollT+=STEP;moved=PH.step(S.balls,T,STEP,S.events)||moved;
   S.frameT-=STEP;if(S.frameT<=0){S.frameT=1/30;S.frames.push(S.balls.map(b=>[b.x,b.y,b.on?1:0,b.o.slice()]));}
   if(PH.settled(S.balls)||S.rollT>16)break;}
  if((PH.settled(S.balls)||S.rollT>16)&&S.rollT>.15){
   for(const b of S.balls)b.vx=b.vy=b.wx=b.wy=b.wz=0;
   if(net){if(S.m.turn===me){const fin={b:S.balls.map(b=>[+b.x.toFixed(4),+b.y.toFixed(4),b.on?1:0]),r:S.rec};net.send({fin});settle(S.rec);}else{S.phase='await';}}
   else settle(S.rec);
  }
 }
 function applyFin(fin){if(!fin||!Array.isArray(fin.b))return;fin.b.forEach((v,i)=>{const b=S.balls[i];if(!b||!Array.isArray(v))return;b.x=+v[0];b.y=+v[1];const was=b.on;b.on=!!v[2];b.vx=b.vy=b.wx=b.wy=b.wz=0;if(was&&!b.on&&!S.sinking.some(q=>q.id===b.id)){sfx.pocket(50);}});
  const r=fin.r||{};const rec={first:Number.isFinite(r.first)?r.first:null,cueRailsBeforeHit:+r.cueRailsBeforeHit||0,railAfter:!!r.railAfter,railBalls:Array.isArray(r.railBalls)?r.railBalls.filter(Number.isFinite):[],pots:Array.isArray(r.pots)?r.pots.filter(p=>p&&Number.isFinite(p.id)).map(p=>({id:p.id,pocket:+p.pocket,rails:+p.rails||0,kissed:Number.isFinite(p.kissed)?p.kissed:undefined})):[],touch:{},kissedBy:{},railsOf:{}};
  settle(rec);}
 function settle(rec){
  const m=S.m,who=m.turn,out=RU.judge(m,S.on,rec);S.lastFrames=S.frames.length>6?S.frames:null;
  // tray + cash + commentary
  for(const id of out.pots){const owner=game==='nine'?who:RU.groupOf(id)==='solid'?groupOwner('solid',out):RU.groupOf(id)==='stripe'?groupOwner('stripe',out):who;if(owner!==null)S.tray[owner].push(id);}
  const legalPots=out.foul?0:out.pots.filter(id=>game==='nine'||id===8||!m.group[who]&&!out.assign||RU.groupOf(id)===(out.assign||m.group[who])).length;
  if(legalPots){earn(who,'pot',legalPots);S.potCount[who]+=legalPots;}
  const tags=new Set(out.tags);
  if(!out.foul){if(tags.has('bank')){earn(who,'bank');banner('BANK SHOT!','+$'+HALL.CASH.bank,'#7df9ff',1.5);quip('bank');}
   if(tags.has('combo')){earn(who,'combo');banner('COMBO!','+$'+HALL.CASH.combo,'#ff9df0',1.5);quip('combo');}
   if(tags.has('kick')){earn(who,'kick');banner('KICK SHOT!','+$'+HALL.CASH.kick,'#a0ff8a',1.5);}
   if(tags.has('multi')){earn(who,'multi');banner(`${out.pots.length} BALLS!`,'+$'+HALL.CASH.multi,'#ffd23f',1.3);}
   if(legalPots&&!tags.size){if(Math.random()<.35)quip('good');}
   if(legalPots)sfx.cheer();}
  for(const id of out.respot){const b=S.balls.find(q=>q.id===id);if(b)PH.spotBall(S.balls,b);}
  const cb=cueBall();if(!cb.on){cb.on=true;cb.x=-HX/2;cb.y=0;cb.vx=cb.vy=0;if(!PH.freeSpot(S.balls,cb.x,cb.y,0))for(let k=1;k<30&&!PH.freeSpot(S.balls,cb.x,cb.y,0);k++)cb.y=(k%2?1:-1)*Math.ceil(k/2)*2.4;}
  if(out.foul){S.foulMsg=out.foul;banner(out.foul==='Scratch'?'SCRATCH!':'FOUL',out.foul==='Scratch'?`${name(1-who)}: ball in hand`:`${out.foul} · ${name(1-who)}: ball in hand`,'#ff5a4a',2.2);quip(out.foul==='Scratch'?'scratch':'foul');sfx.boo();vibrate([20,40,20]);}
  else if(!out.keep&&out.winner===null){if(Math.random()<.3)quip('miss');}
  const wasBreak=m.isBreak,run=m.runOut[who];
  RU.apply(m,out);
  if(out.assign)banner(`${name(who).toUpperCase()}: ${out.assign==='solid'?'SOLIDS':'STRIPES'}`,`${name(1-who)}: ${out.assign==='solid'?'stripes':'solids'}`,'#ffd23f',2);
  if(out.winner!==null){rackOver(out,wasBreak,run+out.pots.length);return;}
  if(m.turn!==who)turnBanner();
  newTurn();
 }
 function groupOwner(g,out){const m=S.m;const a=out.assign?(out.assign===g?out.who:1-out.who):m.group[0]===g?0:m.group[1]===g?1:null;return a;}
 function turnBanner(){const p=S.m.turn;banner(net?(p===me?'YOUR SHOT':`${name(p).toUpperCase()}'S SHOT`):`${name(p).toUpperCase()}'S SHOT`,S.m.bih?'Ball in hand: drag the cue ball':'',COLP[p],1.4);}
 function newTurn(){S.phase='aim';S.clock=CLOCK;S.power=0;S.side=S.vert=0;S.call=-1;S.plan=null;S.planBusy=false;S.botT=0;S.spinOpen=false;
  // point the cue at a legal ball
  const tg=targetIds(),cb=cueBall();let best=null,bd=1e9;for(const b of S.balls)if(b.on&&tg.includes(b.id)){const d=Math.hypot(b.x-cb.x,b.y-cb.y);if(d<bd){bd=d;best=b;}}
  if(best)S.angle=Math.atan2(best.y-cb.y,best.x-cb.x);}
 async function rackOver(out,wasBreak,run){
  const m=S.m,w=out.winner,ww=out.why;S.phase='rackover';
  if(w===out.who){earn(w,'rack');
   if(ww==='golden'){earn(w,'golden');}if(ww==='break8')earn(w,'break8');
   if(S.turnsThisRack&&S.turnsThisRack[1-w]===0&&!wasBreak){if(S.m.breaker===w){earn(w,'breakrun');S.rackTag='BREAK & RUN!';}else{earn(w,'runout');S.rackTag='RUN OUT!';}quip('runout');}
   else quip('win');}
  else{earn(w,'rack');quip('foul');}
  hall.stats.racks+=human(w)?1:0;if(ww==='golden')hall.stats.golden+=human(w)?1:0;
  S.rackWin={w,why:RU.WHY[ww]||'',tag:S.rackTag||'',t0:t};S.rackTag='';sfx.cheer();snd.win?.(true);
  await wait(2.6);
  if(m.over!==null){finishMatch();return;}
  RU.nextRack(m);S.rackWin=null;newRack();S.turnsThisRack=[0,0];banner(`RACK ${m.rackNo}`,`${name(m.turn)} breaks`,'#ffd23f',1.8);newTurn();
 }
 const waits=[];const wait=sec=>new Promise(r=>waits.push({at:t+sec,r}));
 // ---------------------------------------------------------------- match end: cash summary
 function finishMatch(){
  const m=S.m,w=m.over;earn(w,'match');
  const mult=cpu?(HALL.CPU_K[s.solo?.level]||1):1;
  const tot=[0,1].map(p=>Math.round(Object.values(S.cash[p]).reduce((a,b)=>a+b,0)*(cpu&&p===0?mult:1)));
  const mine=[0,1].filter(p=>human(p));let gain=0;for(const p of mine)gain+=tot[p];
  hall.cash+=gain;hall.stats.earned+=gain;hall.stats.matches++;hall.stats.best=Math.max(hall.stats.best,gain);save();
  S.summary={tot,gain,mult,t0:t,afford:affordable()};S.phase='summary';S.rackWin=null;S.banner=[];sfx.buy();
 }
 function affordable(){const out=[];for(const [k,list] of Object.entries(HALL.LISTS))for(const it of list)if(!HALL.owns(hall,k,it.id)&&it.price<=hall.cash)out.push(it.name);
  for(const k of HALL.ROOM_SLOTS){const n=hall.room[k]+1,tr=HALL.ROOM[k].tiers[n];if(tr&&tr.price<=hall.cash)out.push(`${HALL.ROOM[k].name}: ${tr.name}`);}
  for(const d of HALL.DECOR)if(!hall.decor.includes(d.id)&&d.price<=hall.cash)out.push(d.name);return out;}
 function endGame(){const m=S.m,sc=[0,1].map(p=>m.racks[p]*1000+S.potCount[p]*10);s.setScores(sc);
  const w=m.over;s.react?.(w,'win',3);s.react?.(1-w,'sad',3);
  s.finish(sc,`Paddy's Pool · ${game==='eight'?'8-Ball':'9-Ball'}: ${name(w)} wins ${m.racks[w]}-${m.racks[1-w]}`);}
 // ---------------------------------------------------------------- CPU
 async function cpuTurn(){if(S.planBusy||S.plan)return;S.planBusy=true;S.thinkT=t;
  const plan=await CPU.planShot({m:S.m,balls:S.balls,T,skill:cpuSkill(s),stats:cueOf(1).stats,bih:!!S.m.bih,kitchen:!!S.m.bih?.kitchen});
  if(!s.alive||S.phase!=='aim')return;S.plan={...plan,t0:t,a0:S.angle,place0:{x:cueBall().x,y:cueBall().y}};S.planBusy=false;}
 function cpuStep(){const pl=S.plan;if(!pl)return;const k=Math.min(1,(t-pl.t0)/1.1),e=k*k*(3-2*k);
  if(pl.place){const cb=cueBall();cb.x=pl.place0.x+(pl.place.x-pl.place0.x)*Math.min(1,k*1.6);cb.y=pl.place0.y+(pl.place.y-pl.place0.y)*Math.min(1,k*1.6);}
  const ta=Math.atan2(pl.dir[1],pl.dir[0]);let da=ta-pl.a0;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;S.angle=pl.a0+da*e;S.side=(pl.side||0)*e;S.vert=(pl.vert||0)*e;
  if(pl.call!==undefined&&pl.call!==null)S.call=pl.call;
  if(k>=1){const pw=Math.min(1,(t-pl.t0-1.1)/.5);S.power=pl.speed/(330*cueOf(1).stats.power)*Math.max(0,pw);if(pw>=1){S.angle=ta;fire({dir:pl.dir,speed:pl.speed,side:pl.side||0,vert:pl.vert||0});S.plan=null;}}}
 // ---------------------------------------------------------------- input
 let drag=null;
 const inBox=(p,b)=>p.x>=b.x-8&&p.x<=b.x+b.w+8&&p.y>=b.y-8&&p.y<=b.y+b.h+8;
 const kitchenOK=(x2)=>!S.m.bih?.kitchen||x2<-HX/2;
 function placeCue(wp){const cb=cueBall();const x2=Math.max(-HX+R,Math.min(HX-R,wp.x)),y2=Math.max(-HY+R,Math.min(HY-R,wp.y));if(kitchenOK(x2)&&PH.freeSpot(S.balls,x2,y2,0)){cb.x=x2;cb.y=y2;return true;}return false;}
 s.on(c,'pointerdown',ev=>{if(!s.alive||s.paused)return;layout();const p=s.pointer(ev);ev.preventDefault();
  if(S.phase==='summary'){if(t-S.summary.t0>1&&!S.ended){S.ended=true;endGame();}return;}
  if(S.replay){S.replay=null;return;}
  if(S.coach){S.coach=false;hall.set.seen=true;save();return;}
  if(S.phase==='hall')return;
  // replay pill
  if(S.replayBtn&&S.lastFrames&&inBox(p,S.replayBtn)&&S.phase==='aim'){S.replay={i:0,t0:t,frames:S.lastFrames};sfx.tap();return;}
  if(S.phase!=='aim'||!myTurn())return;
  if(S.spinOpen){const sp=spinBig();const dx=(p.x-sp.x)/sp.r,dy=(p.y-sp.y)/sp.r;if(Math.hypot(dx,dy)<=1.25){drag={id:ev.pointerId,kind:'spin'};setSpin(dx,dy);}else if(sp.reset&&inBox(p,sp.reset)){S.side=S.vert=0;sfx.chalk();}else S.spinOpen=false;s.capture(ev);return;}
  if(Math.hypot(p.x-L.spin.x,p.y-L.spin.y)<L.spin.r+10){S.spinOpen=true;sfx.chalk();return;}
  if(inBox(p,L.power)){drag={id:ev.pointerId,kind:'power',from:p};S.power=0;s.capture(ev);return;}
  if(inBox(p,L.wheel)){drag={id:ev.pointerId,kind:'wheel',last:p};s.capture(ev);return;}
  const w=sw(p.x,p.y),cb=cueBall();
  // call the 8: tap a pocket
  if(game==='eight'&&targetIds().includes(8)){for(let i=0;i<T.pockets.length;i++){const q=T.pockets[i];if(Math.hypot(w.x-q.x,w.y-q.y)<4.5){S.call=i;sfx.tap();if(net)net.send({call:i});return;}}}
  if(S.m.bih&&Math.hypot(w.x-cb.x,w.y-cb.y)<R*3.2){drag={id:ev.pointerId,kind:'place'};s.capture(ev);return;}
  drag={id:ev.pointerId,kind:'aim',from:p,a0:S.angle-Math.atan2(w.y-cb.y,w.x-cb.x),moved:0,w0:w};s.capture(ev);
 });
 function setSpin(dx,dy){const lim=cueOf(S.m.turn).stats.spin/.5;let l=Math.hypot(dx,dy);if(l>lim){dx*=lim/l;dy*=lim/l;}S.side=dx*.5;S.vert=-dy*.5;}
 s.on(c,'pointermove',ev=>{if(!drag||drag.id!==ev.pointerId)return;const p=s.pointer(ev);
  if(drag.kind==='spin'){const sp=spinBig();setSpin((p.x-sp.x)/sp.r,(p.y-sp.y)/sp.r);return;}
  if(S.phase!=='aim'){drag=null;return;}
  if(drag.kind==='power'){const d=L.power.vert?p.y-drag.from.y:Math.abs(p.x-drag.from.x);S.power=Math.max(0,Math.min(1,(L.power.vert?Math.max(0,d):d)/((L.power.vert?L.power.h:L.power.w)*.9)));return;}
  if(drag.kind==='wheel'){const d=L.wheel.vert?p.y-drag.last.y:p.x-drag.last.x;drag.last=p;S.angle+=d*.0022*(L.wheel.vert?1:-1);S.wheelOff=(S.wheelOff||0)+d;netAim();return;}
  const w=sw(p.x,p.y),cb=cueBall();
  if(drag.kind==='place'){placeCue(w);netPlace();return;}
  drag.moved=Math.max(drag.moved,Math.hypot(p.x-drag.from.x,p.y-drag.from.y));
  if(drag.moved>6){const d=Math.hypot(w.x-cb.x,w.y-cb.y);if(d>R*.8){const fine=d<9?.35:1;const a=drag.a0+Math.atan2(w.y-cb.y,w.x-cb.x);let da=a-S.angle;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;S.angle+=da*fine;}}
  netAim();
 });
 s.on(c,'pointerup',ev=>{if(!drag||drag.id!==ev.pointerId)return;const d=drag;drag=null;s.release(ev);
  if(d.kind==='power'){if(S.phase==='aim'&&S.power>.02&&myTurn())fire();else S.power=0;return;}
  if(d.kind==='aim'&&d.moved<=6&&S.phase==='aim'){// tap: aim at the tapped ball, or toward the tapped point
   const w=d.w0,cb=cueBall();let tb=null;for(const b of S.balls)if(b.on&&b.id&&Math.hypot(b.x-w.x,b.y-w.y)<R*2.2)tb=b;const tx=tb?tb.x:w.x,ty=tb?tb.y:w.y;if(Math.hypot(tx-cb.x,ty-cb.y)>R)S.angle=Math.atan2(ty-cb.y,tx-cb.x);netAim();}
 });
 const clearDrag=()=>drag=null;s.on(c,'pointercancel',clearDrag);s.resetOnPause?.(clearDrag);
 s.on(document,'keydown',ev=>{if(!s.alive||s.paused||S.phase!=='aim'||!myTurn())return;const k=ev.key,f=ev.shiftKey?.0025:.02;
  if(k==='ArrowLeft'||k==='a')S.angle-=f;else if(k==='ArrowRight'||k==='d')S.angle+=f;else if(k==='ArrowUp'||k==='w')S.power=Math.min(1,S.power+.06);else if(k==='ArrowDown'||k==='s')S.power=Math.max(0,S.power-.06);
  else if((k===' '||k==='Enter')&&S.power>.02){ev.preventDefault();fire();}else return;netAim();});
 let aimSent=0;function netAim(){if(!net||!myTurn()||t-aimSent<.12)return;aimSent=t;net.send({aim:[+S.angle.toFixed(4),+S.power.toFixed(3),+S.side.toFixed(3),+S.vert.toFixed(3)]});}
 let placeSent=0;function netPlace(){if(!net||t-placeSent<.1)return;placeSent=t;const cb=cueBall();net.send({bh:[+cb.x.toFixed(3),+cb.y.toFixed(3)]});}
 function spinBig(){const r=Math.min(L.W,L.H)*.24;const sp={x:L.W/2,y:L.H/2,r};sp.reset={x:sp.x-50,y:sp.y+r+18,w:100,h:30};return sp;}
 // ---------------------------------------------------------------- online
 if(net)void (async()=>{for(;;){const m=await net.next();if(!m||!s.alive){if(s.alive&&S.m&&S.phase!=='summary'){S.m.over=me;finishMatch();}return;}
  if(m.setup){applySetup(m.setup);}
  else if(m.cue){const cq=HALL.byId(HALL.CUES,m.cue);if(cq)theirCue=cq;}
  else if(Array.isArray(m.aim)){if(S.phase==='aim'&&!myTurn()){S.angle=+m.aim[0]||0;S.power=+m.aim[1]||0;S.side=+m.aim[2]||0;S.vert=+m.aim[3]||0;}}
  else if(Array.isArray(m.bh)){if(S.phase==='aim'&&!myTurn()){const cb=cueBall();cb.x=+m.bh[0];cb.y=+m.bh[1];}}
  else if(Number.isFinite(m.call)){S.call=m.call;}
  else if(Array.isArray(m.f)){await until(()=>S.phase==='aim'&&!myTurn());if(!s.alive)return;const v=m.f.map(Number);const cb=cueBall();cb.x=v[5];cb.y=v[6];S.call=v[7];fire({dir:[v[0],v[1]],speed:v[2],side:v[3],vert:v[4]},true);}
  else if(m.fin){await until(()=>(S.phase==='await'||S.phase==='roll')&&!myTurn());if(!s.alive)return;S.phase='await';applyFin(m.fin);}
  else if(m.to){await until(()=>S.phase==='aim'&&!myTurn());timeOut();}
 }})();
 const until=f=>new Promise(r=>{const go=()=>{if(!s.alive||f())return r();setTimeout(go,40);};go();});
 function applySetup(st){const tb=HALL.byId(HALL.TABLES,st.t),fe=HALL.byId(HALL.FELTS,st.f),bs=HALL.byId(HALL.BALLSETS,st.b);
  if(tb){loadout.table=tb;T=PH.buildTable(tb.feel);}if(fe)loadout.felt=fe;if(bs)loadout.balls=bs;layers.table=null;S.setupDone=true;}
 function timeOut(){if(S.phase!=='aim')return;const who=S.m.turn;S.on=S.balls.filter(b=>b.on&&b.id).map(b=>b.id);
  const out={who,foul:'Shot clock',keep:false,winner:null,why:'',respot:[],assign:null,bih:{who:1-who,kitchen:false,free:true},tags:[],pots:[]};
  if(game==='nine'&&S.m.fouls[who]>=2){out.winner=1-who;out.why='3fouls';}
  banner('TIME!',`${name(1-who)}: ball in hand`,'#ff5a4a',2);sfx.boo();RU.apply(S.m,out);if(out.winner!==null){rackOver(out,false,0);return;}turnBanner();newTurn();}
 // ---------------------------------------------------------------- HALL (the upgrade screen, Arcade only)
 let hallEl=null,hallTab='table',hallSel=null;
 function hallScreen(){return new Promise(resolve=>{S.phase='hall';
  const css=`.pp-hall{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;justify-content:flex-end;pointer-events:none;font-family:"SC Nunito",system-ui,sans-serif;color:#fff}
  .pp-hall *{box-sizing:border-box}.pp-top{position:absolute;left:10px;top:max(8px,env(safe-area-inset-top));display:flex;gap:8px;align-items:center;pointer-events:auto}
  .pp-cash{background:linear-gradient(#2c7a3a,#1b5426);border:2px solid #7fe08a;border-radius:999px;padding:5px 14px;font:900 17px "SC Bangers",Impact,sans-serif;letter-spacing:.5px;box-shadow:0 3px 10px #0008}
  .pp-prog{font-size:11px;opacity:.85;background:#000a;border-radius:999px;padding:4px 9px}
  .pp-panel{pointer-events:auto;background:linear-gradient(180deg,#120c0bcc,#0b0706f2 30%);backdrop-filter:none;border-top:1px solid #ffffff22;padding:10px 10px max(10px,env(safe-area-inset-bottom));max-height:60%;display:flex;flex-direction:column;gap:8px}
  .pp-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.pp-seg{display:flex;background:#ffffff14;border-radius:12px;padding:3px}
  .pp-seg button{border:0;background:transparent;color:#ddd;font:800 14px system-ui;padding:8px 12px;border-radius:9px;min-height:38px}.pp-seg button.on{background:#ffd23f;color:#201300}
  .pp-lbl{font:800 10px system-ui;opacity:.7;align-self:center;padding:0 6px 0 8px}.pp-go{margin-left:auto;flex:1 0 auto;border:0;border-radius:14px;padding:10px 28px;min-height:48px;font:900 24px "SC Bangers",Impact,sans-serif;letter-spacing:1px;color:#1a1000;background:linear-gradient(#ffe27a,#f2a81d);box-shadow:0 4px 0 #9a5a00,0 6px 16px #000a}
  .pp-tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}.pp-tabs::-webkit-scrollbar{display:none}
  .pp-tabs button{flex:none;border:1px solid #ffffff22;background:#ffffff10;color:#eee;font:800 12px system-ui;padding:7px 11px;border-radius:999px;min-height:34px}.pp-tabs button.on{background:#fff;color:#111}
  .pp-shelf{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scroll-snap-type:x proximity}.pp-card{flex:none;width:156px;scroll-snap-align:start;background:#ffffff0d;border:1px solid #ffffff1f;border-radius:14px;padding:8px;display:flex;flex-direction:column;gap:5px}
  .pp-card.sel{border-color:#ffd23f;box-shadow:0 0 0 1px #ffd23f inset}.pp-card canvas{width:100%;height:72px;border-radius:8px;background:#0006}
  .pp-card b{font-size:13px;line-height:1.15}.pp-card small{font-size:10.5px;opacity:.72;line-height:1.25;min-height:2.5em}.pp-stats{display:flex;gap:4px;font-size:10px;opacity:.85}
  .pp-card button{border:0;border-radius:9px;padding:7px;font:900 13px system-ui;min-height:34px}.pp-buy{background:#2fae4a;color:#fff}.pp-buy[disabled]{background:#3a3a3a;color:#999}.pp-eq{background:#ffffff22;color:#fff}.pp-on{background:#ffd23f33;color:#ffd23f}
  .pp-pips{display:flex;gap:3px}.pp-pips i{flex:1;height:5px;border-radius:3px;background:#ffffff22}.pp-pips i.f{background:#ffd23f}
  .pp-hall.side .pp-panel{position:absolute;right:0;top:0;bottom:0;width:min(460px,50%);max-height:none;border-top:0;border-left:1px solid #ffffff22;padding-top:calc(var(--pp-top,44px) + 6px);background:linear-gradient(90deg,#0b0706d9,#0b0706f5 18%)}
  .pp-hall.side .pp-shelf{flex-wrap:wrap;overflow-y:auto;overflow-x:hidden;align-content:flex-start;flex:1;min-height:0}.pp-hall.side .pp-card{width:calc(50% - 4px)}.pp-hall.side .pp-go{margin-left:0;flex:1}
  .pp-hall.side .pp-row{flex-wrap:wrap}
  @media (max-height:520px){.pp-card canvas{height:54px}.pp-card small{display:none}.pp-seg button{padding:6px 9px;min-height:32px;font-size:12px}.pp-go{min-height:40px;font-size:20px;padding:6px 18px}}`;
  if(!document.getElementById('pp-css')){const st=document.createElement('style');st.id='pp-css';st.textContent=css;document.head.appendChild(st);}
  hallEl=document.createElement('div');hallEl.className='pp-hall'+(W>H*1.15?' side':'');hallEl.style.setProperty('--pp-top',(fb.top||40)+'px');s.on(window,'resize',()=>{if(hallEl){hallEl.classList.toggle('side',s.W>s.H*1.15);hallCache=null;}});s.body.querySelector('.canvas-frame').style.position='relative';s.body.querySelector('.canvas-frame').appendChild(hallEl);
  s.cleanup(()=>hallEl?.remove());
  const render=()=>{const set=hall.set;hallEl.innerHTML=`<div class="pp-top"><div class="pp-cash">$${hall.cash.toLocaleString()}</div><div class="pp-prog">Hall ${Math.round(HALL.progress(hall)*100)}% done</div></div>
   <div class="pp-panel"><div class="pp-row"><div class="pp-seg" data-k="game"><button data-v="eight" class="${set.game==='eight'?'on':''}">8-BALL</button><button data-v="nine" class="${set.game==='nine'?'on':''}">9-BALL</button></div>
    <div class="pp-seg" data-k="race"><span class="pp-lbl">RACE TO</span>${[1,2,3,5].map(n=>`<button data-v="${n}" class="${set.race===n?'on':''}">${n}</button>`).join('')}</div><button class="pp-go" data-act="play">PLAY ▶</button></div>
    <div class="pp-tabs">${[['table','Tables'],['felt','Felt'],['cue','Cues'],['balls','Balls'],['chalk','Chalk'],['room','The Bar'],['decor','Decor'],['settings','Settings']].map(([k,l])=>`<button data-tab="${k}" class="${hallTab===k?'on':''}">${l}</button>`).join('')}</div>
    <div class="pp-shelf">${shelfHTML()}</div></div>`;
   hallEl.querySelectorAll('.pp-card canvas[data-kind]').forEach(cv=>{const kind=cv.dataset.kind,it=HALL.byId(HALL.LISTS[kind],cv.dataset.id);if(!it)return;try{const pv=ART.preview(kind,it,140,72,loadout);cv.width=pv.width;cv.height=pv.height;cv.getContext('2d').drawImage(pv,0,0);}catch(e){console.warn(e);}});};
  const shelfHTML=()=>{
   if(hallTab==='settings'){const set=hall.set;return `<div class="pp-card" style="width:220px"><b>Aim guides</b><small>Full: ghost ball, the object ball's path and where the cue ball goes. Standard: shorter. Pro: the aim line only.</small><div class="pp-seg" data-k="assist">${[['full','Full'],['std','Std'],['pro','Pro']].map(([v,l])=>`<button data-v="${v}" class="${set.assist===v?'on':''}">${l}</button>`).join('')}</div></div>
    <div class="pp-card" style="width:200px"><b>Shot clock</b><small>${CLOCK} seconds a shot; run out and it's a foul. Always on online.</small><div class="pp-seg" data-k="clock"><button data-v="0" class="${!set.clock?'on':''}">Off</button><button data-v="1" class="${set.clock?'on':''}">On</button></div></div>
    <div class="pp-card" style="width:200px"><b>Your hall</b><small>Racks won ${hall.stats.racks} · matches ${hall.stats.matches} · golden breaks ${hall.stats.golden} · cash earned $${hall.stats.earned.toLocaleString()}</small></div>`;}
   if(hallTab==='room')return HALL.ROOM_SLOTS.map(k=>{const r=HALL.ROOM[k],n=hall.room[k],nx=r.tiers[n+1];return `<div class="pp-card" style="width:178px"><b>${r.name}: ${r.tiers[n].name}</b><div class="pp-pips">${r.tiers.map((q,i)=>`<i class="${i<=n?'f':''}"></i>`).join('')}</div><small>${nx?`Next: <b>${nx.name}</b>. ${nx.desc}`:r.tiers[n].desc+' Maxed out!'}</small>${nx?`<button class="pp-buy" data-room="${k}" ${hall.cash<nx.price?'disabled':''}>Upgrade $${nx.price.toLocaleString()}</button>`:`<button class="pp-on" disabled>MAX</button>`}</div>`;}).join('');
   if(hallTab==='decor')return HALL.DECOR.map(d=>{const own=hall.decor.includes(d.id),shown=own&&!hall.hide.includes(d.id);return `<div class="pp-card"><b>${d.name}</b><small>${d.desc}</small>${own?`<button class="${shown?'pp-on':'pp-eq'}" data-show="${d.id}">${shown?'Showing':'Hidden'}</button>`:`<button class="pp-buy" data-decor="${d.id}" ${hall.cash<d.price?'disabled':''}>Buy $${d.price.toLocaleString()}</button>`}</div>`;}).join('');
   const kind=hallTab,list=HALL.LISTS[kind];return list.map(it=>{const own=HALL.owns(hall,kind,it.id),eq=hall.eq[kind]===it.id;
    const st=kind==='cue'?`<div class="pp-stats">⚡${Math.round(it.stats.power*100)} 🌀${Math.round(it.stats.spin*200)} 🎯${Math.round(it.stats.aim*100)}</div>`:kind==='table'?`<div class="pp-stats">${(it.tips||[]).join(' · ')}</div>`:'';
    return `<div class="pp-card ${hallSel===kind+':'+it.id?'sel':''}" data-pick="${kind}:${it.id}"><canvas data-kind="${kind}" data-id="${it.id}"></canvas><b>${it.name}</b>${st}<small>${it.desc||''}</small>${eq?`<button class="pp-on" disabled>Using</button>`:own?`<button class="pp-eq" data-eq="${kind}:${it.id}">Use</button>`:`<button class="pp-buy" data-buy="${kind}:${it.id}" ${hall.cash<it.price?'disabled':''}>Buy $${it.price.toLocaleString()}</button>`}</div>`;}).join('');};
  const refresh=()=>{loadout=HALL.loadout(hall);T=PH.buildTable(loadout.table.feel);layers.table=null;layers.floor=null;save();render();};
  hallEl.addEventListener('click',ev=>{const b=ev.target.closest('button,[data-pick]');if(!b||!s.alive)return;
   const seg=b.closest('.pp-seg');if(seg&&b.dataset.v!==undefined){const k=seg.dataset.k,v=b.dataset.v;if(k==='game')hall.set.game=v;else if(k==='race')hall.set.race=+v;else if(k==='assist')hall.set.assist=v;else if(k==='clock')hall.set.clock=v==='1';sfx.tap();save();render();return;}
   if(b.dataset.tab){hallTab=b.dataset.tab;hallSel=null;sfx.tap();render();return;}
   if(b.dataset.act==='play'){sfx.tap();hallEl.remove();hallEl=null;resolve();return;}
   if(b.dataset.buy){const [k,id]=b.dataset.buy.split(':');if(HALL.buy(hall,k,id)){sfx.buy();refresh();}return;}
   if(b.dataset.eq){const [k,id]=b.dataset.eq.split(':');if(HALL.equip(hall,k,id)){sfx.tap();refresh();}return;}
   if(b.dataset.room){if(HALL.buyRoom(hall,b.dataset.room)){sfx.buy();refresh();}return;}
   if(b.dataset.decor){if(HALL.buyDecor(hall,b.dataset.decor)){sfx.buy();refresh();}return;}
   if(b.dataset.show){const id=b.dataset.show;hall.hide=hall.hide.includes(id)?hall.hide.filter(q=>q!==id):[...hall.hide,id];sfx.tap();refresh();return;}
   if(b.dataset.pick){hallSel=b.dataset.pick;sfx.tap();render();}
  });
  render();
 });}
 // ---------------------------------------------------------------- drawing
 const faceFn=(id,mood)=>(cx,cy,w)=>{try{HF.drawFaceById(x,id,mood,cx,cy,w);}catch{}};
 let hallCache=null;
 function drawHallScene(){if(hallEl){const sd=W>H*1.15;if(hallEl.classList.contains('side')!==sd){hallEl.classList.toggle('side',sd);hallCache=null;}}const key=[W,H,dpr,JSON.stringify(hall.room),hall.decor.join(),hall.hide.join(),loadout.table.id,loadout.felt.id,hallSel,Math.floor(t*10)].join('|');
  if(hallCache&&hallCache.key===key){x.drawImage(hallCache.cv,0,0,W,H);return;}
  const cv=hallCache?.cv||document.createElement('canvas');cv.width=Math.ceil(W*dpr);cv.height=Math.ceil(H*dpr);const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
  const faces=[(cx,cy,w)=>{try{s.sprite(g,0,cx,cy,w,{exact:true,noBadge:true,still:true});}catch{}},null,(cx,cy,w)=>{try{HF.drawFaceById(g,'dennis','win',cx,cy,w);}catch{}},...['charlie','frank','mac','dee','cricket','artemis'].map(id=>(cx,cy,w)=>{try{HF.drawFaceById(g,id,'normal',cx,cy,w);}catch{}})];
  const pan=hallEl?.querySelector('.pp-panel'),cr=c.getBoundingClientRect();let view=[0,0,W,H];
  if(pan){const r=pan.getBoundingClientRect();if(hallEl.classList.contains('side'))view=[0,0,Math.max(120,r.left-cr.left),H];else view=[0,0,W,Math.max(140,r.top-cr.top+30)];}
  const [pk,pid]=(hallSel||'').split(':'),pvT=pk==='table'&&HALL.byId(HALL.TABLES,pid)||loadout.table,pvF=pk==='felt'&&HALL.byId(HALL.FELTS,pid)||loadout.felt;
  ART.drawHall(g,W,H,hall,t,{faces,feltColor:pvF.color,table:pvT,view,highlight:pk==='table'||pk==='felt'?'table':null});
  // logo
  const lg=PS.picture('logo');const lw=Math.min(view[2]*.7,420),lh=lw*.4,ly=Math.max(fb.top+(hallEl?.classList.contains('side')?6:30),view[3]*.05);if(lg)g.drawImage(lg,view[2]/2-lw/2,ly,lw,lh);else drawLogo(g,view[2]/2,ly+lw*.08,lw);
  hallCache={key,cv};x.drawImage(cv,0,0,W,H);}
 function drawLogo(g,cx,cy,w){g.save();g.textAlign='center';g.textBaseline='middle';g.font=`900 ${w*.15}px "SC Bangers",Impact,sans-serif`;g.lineWidth=w*.025;g.strokeStyle='#0a2a10';g.shadowColor='#3bff7a';g.shadowBlur=w*.05;g.strokeText("PADDY'S POOL",cx,cy);g.fillStyle='#3bff7a';g.fillText("PADDY'S POOL",cx,cy);g.shadowBlur=0;g.font=`800 ${w*.045}px system-ui`;g.fillStyle='#ffe9a0';g.fillText('HALL OF FAME · EST. WHENEVER',cx,cy+w*.1);g.restore();}
 function draw(){
  x.setTransform(dpr,0,0,dpr,0,0);
  if(S.phase==='hall'){drawHallScene();return;}
  x.drawImage(floorLayer().cv,0,0,W,H);
  // wall band
  const pw=Math.min(W*.4,250),strip=game==='nine'?9*Math.min(8,W*.018)*2.3+24:0,ax0=8+pw*2+20+strip,area=L.rot?[4,2,W-160,Math.max(18,L.hudY-4)]:[ax0,4,Math.max(0,W-150-ax0),L.hudH];
  ART.drawWall(x,0,0,W,L.wall[3],loadout.room,loadout.decor,t,(cx,cy,w)=>{try{s.sprite(x,S.m?S.m.turn:0,cx,cy,w,{exact:true,noBadge:true,still:true});}catch{}},area);
  // light pool on the table
  const tl=tableLayer();x.drawImage(tl.cv,L.cx-tl.pw/2,L.cy-tl.ph/2,tl.pw,tl.ph);
  if(loadout.room.light===0&&Math.sin(t*17)>.92){x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,0,W,H);}
  // kitchen line for ball in hand behind the head string
  if(S.phase==='aim'&&S.m?.bih?.kitchen){const a=ws(-HX/2,-HY),b=ws(-HX/2,HY);x.strokeStyle='rgba(255,255,255,.4)';x.setLineDash([6,6]);x.lineWidth=1.5;x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();x.setLineDash([]);}
  // balls
  const frame=S.replay?S.replay.frames[Math.min(S.replay.frames.length-1,Math.floor((t-S.replay.t0)*30))]:null;
  const bpx=R*L.k;
  for(let i=0;i<S.balls.length;i++){const b=S.balls[i];let bx=b.x,by=b.y,on=b.on,o=b.o;if(frame){const f=frame[i];bx=f[0];by=f[1];on=!!f[2];o=f[3];}if(!on)continue;
   const q=ws(bx,by);x.fillStyle='rgba(0,0,0,.4)';x.beginPath();x.ellipse(q.x+bpx*.28,q.y+bpx*.42,bpx*1.02,bpx*.92,0,0,6.28);x.fill();}
  for(let i=0;i<S.balls.length;i++){const b=S.balls[i];let bx=b.x,by=b.y,on=b.on,o=b.o;if(frame){const f=frame[i];bx=f[0];by=f[1];on=!!f[2];o=f[3];}if(!on)continue;
   const q=ws(bx,by),spr=art.draw({id:b.id,o},bpx*dpr,L.rot?-Math.PI/2:0,loadout.balls);x.drawImage(spr,q.x-spr.width/dpr/2,q.y-spr.height/dpr/2,spr.width/dpr,spr.height/dpr);
   if(loadout.balls.glow&&b.id){x.save();x.globalCompositeOperation='lighter';x.globalAlpha=.25;x.fillStyle=BA.COL[b.id];x.beginPath();x.arc(q.x,q.y,bpx*1.6,0,6.28);x.fill();x.restore();}}
  // balls dropping into pockets
  for(let i=S.sinking.length-1;i>=0;i--){const k=S.sinking[i],e=(t-k.t0)/.32;if(e>=1){S.sinking.splice(i,1);continue;}const px=k.x+(k.p.x-k.x)*e,py=k.y+(k.p.y-k.y)*e,q=ws(px,py),b=S.balls.find(z=>z.id===k.id);const spr=art.draw({id:k.id,o:b.o},bpx*dpr,L.rot?-Math.PI/2:0,loadout.balls),sc=1-e*.45;x.globalAlpha=1-e*.7;x.drawImage(spr,q.x-spr.width/dpr/2*sc,q.y-spr.height/dpr/2*sc,spr.width/dpr*sc,spr.height/dpr*sc);x.globalAlpha=1;}
  if(S.m&&!S.replay){if(S.phase==='aim')drawAim();drawCueStick();}
  if(S.m&&game==='eight'&&S.phase==='aim'&&targetIds().includes(8))drawCall();
  if(S.m)drawHUD();
  if(S.m&&myTurn()&&S.phase==='aim')drawControls();
  drawFX();
  if(S.replay){x.fillStyle='rgba(220,30,30,.9)';x.font='900 15px system-ui';x.textAlign='left';x.fillText('● REPLAY',12,L.hudY+L.hudH+22);if(t-S.replay.t0>S.replay.frames.length/30+.6)S.replay=null;}
  if(S.spinOpen)drawSpinBig();
  if(S.coach)drawCoach();
  if(S.rackWin)drawRackWin();
  if(S.phase==='summary')drawSummary();
 }
 function drawAim(){
  const cb=cueBall(),dir=[Math.cos(S.angle),Math.sin(S.angle)],mode=hall.set.assist,aimK=cueOf(S.m.turn).stats.aim,hit=PH.castAim(S.balls,T,cb,dir,mode==='pro'?60:200),tg=targetIds();
  const a=ws(cb.x,cb.y),g=ws(hit.ghost.x,hit.ghost.y);const bad=hit.ball&&!tg.includes(hit.ball.id);
  x.save();x.lineWidth=Math.max(1.5,L.k*.18);x.strokeStyle=bad?'rgba(255,90,80,.85)':'rgba(255,255,255,.85)';x.setLineDash(mode==='pro'?[4,6]:[]);x.beginPath();x.moveTo(a.x,a.y);x.lineTo(g.x,g.y);x.stroke();x.setLineDash([]);
  if(hit.ball||mode!=='pro'){x.beginPath();x.arc(g.x,g.y,R*L.k,0,6.28);x.stroke();}
  if(bad){x.strokeStyle='#ff5a4a';x.lineWidth=2.5;const r=R*L.k*.6;x.beginPath();x.moveTo(g.x-r,g.y-r);x.lineTo(g.x+r,g.y+r);x.moveTo(g.x+r,g.y-r);x.lineTo(g.x-r,g.y+r);x.stroke();}
  if(hit.ball&&mode!=='pro'){const nx=hit.ball.x-hit.ghost.x,ny=hit.ball.y-hit.ghost.y,l=Math.hypot(nx,ny)||1,ux=nx/l,uy=ny/l,cosc=Math.max(0,dir[0]*ux+dir[1]*uy);
   const len=(mode==='full'?16:8)*aimK*(.35+.65*cosc),b0=ws(hit.ball.x,hit.ball.y),b1=ws(hit.ball.x+ux*len,hit.ball.y+uy*len);x.strokeStyle=bad?'rgba(255,90,80,.6)':'rgba(255,240,170,.9)';x.lineWidth=Math.max(1.5,L.k*.2);x.beginPath();x.moveTo(b0.x,b0.y);x.lineTo(b1.x,b1.y);x.stroke();
   if(mode==='full'){let tx=dir[0]-ux*cosc,ty=dir[1]-uy*cosc;const tl=Math.hypot(tx,ty);if(tl>.02){tx/=tl;ty/=tl;}else{tx=0;ty=0;}const fk=S.vert*1.6;let cx2=tx*(1-Math.abs(fk)*.5)+ux*fk,cy2=ty*(1-Math.abs(fk)*.5)+uy*fk;const cl=Math.hypot(cx2,cy2)||1;cx2/=cl;cy2/=cl;
    const len2=10*aimK*Math.max(.25,Math.sqrt(1-cosc*cosc)+Math.abs(S.vert)),c1=ws(hit.ghost.x+cx2*len2,hit.ghost.y+cy2*len2);x.strokeStyle='rgba(160,220,255,.75)';x.setLineDash([5,5]);x.beginPath();x.moveTo(g.x,g.y);x.lineTo(c1.x,c1.y);x.stroke();x.setLineDash([]);}}
  else if(!hit.ball&&mode==='full'&&hit.rail!==undefined){const rd=[dir[0]*(hit.rail===0?-1:1),dir[1]*(hit.rail===1?-1:1)],e=ws(hit.ghost.x+rd[0]*14*aimK,hit.ghost.y+rd[1]*14*aimK);x.strokeStyle='rgba(255,255,255,.5)';x.setLineDash([4,5]);x.beginPath();x.moveTo(g.x,g.y);x.lineTo(e.x,e.y);x.stroke();x.setLineDash([]);}
  // legal targets pulse (Full)
  if(mode==='full'&&!S.plan){const pu=.5+.5*Math.sin(t*5);x.strokeStyle=`rgba(255,215,90,${.25+.35*pu})`;x.lineWidth=2;for(const b of S.balls)if(b.on&&tg.includes(b.id)&&(game==='nine'||tg.length<=7)){const q=ws(b.x,b.y);x.beginPath();x.arc(q.x,q.y,R*L.k+3+pu*2,0,6.28);x.stroke();}}
  // ball in hand marker
  if(S.m.bih){const q=ws(cb.x,cb.y);x.strokeStyle=COLP[S.m.turn];x.lineWidth=2;x.setLineDash([3,4]);x.beginPath();x.arc(q.x,q.y,R*L.k*2.3+Math.sin(t*4)*2,0,6.28);x.stroke();x.setLineDash([]);x.font='18px system-ui';x.textAlign='center';x.fillText('✋',q.x,q.y-R*L.k*2.8);}
  x.restore();
 }
 function drawCueStick(){
  const cb=cueBall();if(!cb.on)return;let pull,alpha=1;
  if(S.phase==='aim')pull=1.4+S.power*14;else{if(!S.lastShot)return;const e=(t-S.cueT);if(e>.6)return;pull=e<.06?1.4*(1-e/.06):(e-.06)*10;alpha=Math.max(0,1-e/.6);}
  const ang=(S.phase==='aim'?S.angle:Math.atan2(S.lastShot.dir[1],S.lastShot.dir[0])),q=ws(cb.x-Math.cos(ang)*(R+pull),cb.y-Math.sin(ang)*(R+pull));
  const sa=L.rot?ang-Math.PI/2:ang;ART.drawCue(x,{...cueOf(S.m.turn),chalk:loadout.chalk.color},q.x,q.y,sa,58*L.k,Math.max(5,1.15*L.k),{alpha});
 }
 function drawCall(){for(let i=0;i<T.pockets.length;i++){const p=T.pockets[i],q=ws(p.x,p.y),sel=(S.call>=0?S.call:-1)===i;x.strokeStyle=sel?'#ffd23f':'rgba(255,255,255,.35)';x.lineWidth=sel?3:1.5;x.setLineDash(sel?[]:[3,4]);x.beginPath();x.arc(q.x,q.y,3.6*L.k,0,6.28);x.stroke();x.setLineDash([]);if(sel){x.fillStyle='#ffd23f';x.font='900 12px system-ui';x.textAlign='center';x.fillText('8',q.x,q.y+4);}}
  if(S.call<0&&myTurn()){x.fillStyle='rgba(0,0,0,.6)';const tx=L.cx,ty=L.wall[3]+16;x.font='800 13px system-ui';x.textAlign='center';const msg='Shooting the 8: tap a pocket to call it';const w=x.measureText(msg).width+20;ART.rr(x,tx-w/2,ty-12,w,22,11);x.fill();x.fillStyle='#ffd23f';x.fillText(msg,tx,ty+3);}}
 function drawHUD(){
  const m=S.m,pw=Math.min(W*.4,250),ph=L.hudH-6,y=L.hudY;
  const xs=L.rot?[6,W-6-pw]:[8,Math.min(W-pw-8-150,8+pw+10)];
  if(L.rot){xs[1]=W-6-pw;}
  for(const p of [0,1]){const px=xs[p],act=m.turn===p&&S.phase!=='summary';x.save();
   x.fillStyle=act?'rgba(20,16,12,.92)':'rgba(10,8,6,.78)';ART.rr(x,px,y,pw,ph,ph/2);x.fill();if(act){x.strokeStyle=COLP[p];x.lineWidth=2.5;x.shadowColor=COLP[p];x.shadowBlur=10;x.stroke();x.shadowBlur=0;}
   const fr=ph/2-3,fx=p===0||!L.rot?px+fr+4:px+pw-fr-4,fy=y+ph/2;x.fillStyle='#000';x.beginPath();x.arc(fx,fy,fr,0,6.28);x.fill();
   try{s.sprite(x,p,fx,fy,fr*2.1,{exact:true,noBadge:true,still:true,mood:S.rackWin?(S.rackWin.w===p?'win':'sad'):undefined});}catch{}
   if(act&&S.phase==='aim'&&(hall.set.clock||net)){const k=S.clock/CLOCK;x.strokeStyle=k<.25?'#ff4a3a':COLP[p];x.lineWidth=3;x.beginPath();x.arc(fx,fy,fr+1,-Math.PI/2,-Math.PI/2+6.283*k);x.stroke();}
   const left=p===0||!L.rot,tx=left?px+fr*2+12:px+12,tw=pw-fr*2-20;x.textAlign='left';x.fillStyle='#fff';x.font=`800 ${Math.min(14,ph*.3)}px system-ui`;let nm=name(p);while(x.measureText(nm).width>tw-30&&nm.length>3)nm=nm.slice(0,-2)+'…';x.fillText(nm,tx,y+ph*.36);
   // racks won (dots)
   const race=m.race;for(let i=0;i<Math.min(race,5);i++){x.fillStyle=i<m.racks[p]?'#ffd23f':'rgba(255,255,255,.18)';x.beginPath();x.arc(tx+tw-8-i*11,y+ph*.3,4,0,6.28);x.fill();}
   // balls left
   const mini=Math.min(7,ph*.16);let ids=[];
   if(game==='eight'){const g=m.group[p];ids=g?(g==='solid'?RU.SOLIDS:RU.STRIPES):[];if(!g){x.fillStyle='rgba(255,255,255,.55)';x.font=`700 ${Math.min(11,ph*.22)}px system-ui`;x.fillText(m.isBreak?'Break':'Open table',tx,y+ph*.76);}}
   ids.forEach((id,i)=>{const on=S.balls.some(b=>b.id===id&&b.on);drawMini(tx+mini+i*(mini*2.3),y+ph*.72,mini,id,on);});
   if(game==='eight'&&m.group[p]&&!ids.some(id=>S.balls.some(b=>b.id===id&&b.on)))drawMini(tx+mini+7*(mini*2.3),y+ph*.72,mini,8,true);
   if(game==='nine'){const low=S.balls.filter(b=>b.on&&b.id).map(b=>b.id).sort((a,b)=>a-b)[0];x.fillStyle='rgba(255,255,255,.6)';x.font=`700 ${Math.min(11,ph*.22)}px system-ui`;x.fillText(act&&low?'ON THE':`${S.tray[p].length} pocketed`,tx,y+ph*.76);if(act&&low)drawMini(tx+x.measureText('ON THE').width+mini+5,y+ph*.72,mini*1.15,low,true);}
   x.restore();}
  if(game==='nine'&&!L.rot){const n=9,mini=Math.min(8,W*.018),sx=xs[1]+pw+14+mini,sy=y+ph/2;if(sx+n*mini*2.3<W-150)for(let i=1;i<=9;i++){const on=S.balls.some(b=>b.id===i&&b.on);drawMini(sx+(i-1)*mini*2.3,sy,mini,i,on);}}
  // replay pill
  S.replayBtn=null;if(S.lastFrames&&S.phase==='aim'&&!S.replay){const bw=78,bh=26,bx=L.rot?W-bw-8:Math.min(W-160-bw,xs[1]+pw+10),by=L.rot?L.wall[3]+6:y+ph/2-bh/2;S.replayBtn={x:bx,y:by,w:bw,h:bh};x.fillStyle='rgba(0,0,0,.6)';ART.rr(x,bx,by,bw,bh,13);x.fill();x.fillStyle='#fff';x.font='800 12px system-ui';x.textAlign='center';x.fillText('⟲ REPLAY',bx+bw/2,by+bh*.66);}
  // thinking
  if(S.phase==='aim'&&cpu&&m.turn===1&&!S.plan){x.fillStyle='rgba(0,0,0,.6)';const msg=`${name(1)} is lining it up`+'.'.repeat(1+Math.floor(t*3)%3);x.font='800 13px system-ui';const w=x.measureText(msg).width+24;ART.rr(x,W/2-w/2,L.wall[3]+4,w,24,12);x.fill();x.fillStyle='#fff';x.textAlign='center';x.fillText(msg,W/2,L.wall[3]+20);}
  if(net&&S.phase==='aim'&&!myTurn()){x.fillStyle='rgba(0,0,0,.6)';const msg=`${name(m.turn)} is shooting…`;x.font='800 13px system-ui';const w=x.measureText(msg).width+24;ART.rr(x,W/2-w/2,L.wall[3]+4,w,24,12);x.fill();x.fillStyle='#fff';x.textAlign='center';x.fillText(msg,W/2,L.wall[3]+20);}
 }
 const miniCache=new Map();
 function drawMini(cx,cy,r,id,on){const key=id+':'+Math.round(r*dpr);let cv=miniCache.get(key);if(!cv){const b=PH.makeBall(id,0,0);PH.rotate(b.o,[1,0,0],.25);cv=art.draw(b,r*dpr,0,loadout.balls);const cp=document.createElement('canvas');cp.width=cv.width;cp.height=cv.height;cp.getContext('2d').drawImage(cv,0,0);cv=cp;miniCache.set(key,cv);art.clear();}
  x.globalAlpha=on?1:.22;x.drawImage(cv,cx-cv.width/dpr/2,cy-cv.height/dpr/2,cv.width/dpr,cv.height/dpr);x.globalAlpha=1;}
 function drawControls(){
  const pb=L.power;x.save();
  // power bar: a track with a cue in it
  x.fillStyle='rgba(0,0,0,.55)';ART.rr(x,pb.x,pb.y,pb.w,pb.h,12);x.fill();x.strokeStyle='rgba(255,255,255,.15)';x.lineWidth=1;x.stroke();
  const fillK=S.power;const gr=pb.vert?x.createLinearGradient(0,pb.y,0,pb.y+pb.h):x.createLinearGradient(pb.x,0,pb.x+pb.w,0);gr.addColorStop(0,'#3bd16f');gr.addColorStop(.6,'#ffd23f');gr.addColorStop(1,'#ff4a3a');x.fillStyle=gr;
  if(pb.vert)ART.rr(x,pb.x+4,pb.y+4,pb.w-8,(pb.h-8)*fillK,8);else ART.rr(x,pb.x+4,pb.y+4,(pb.w-8)*fillK,pb.h-8,8);if(fillK>.01)x.fill();
  // mini cue in the bar
  if(pb.vert)ART.drawCue(x,{...cueOf(S.m.turn),chalk:loadout.chalk.color},pb.x+pb.w/2,pb.y+8+fillK*(pb.h-16)*.92,-Math.PI/2,pb.h*.9,Math.max(6,pb.w*.22),{shadow:false});
  else ART.drawCue(x,{...cueOf(S.m.turn),chalk:loadout.chalk.color},pb.x+pb.w-8-fillK*(pb.w-16)*.92,pb.y+pb.h/2,0,pb.w*.9,Math.max(6,pb.h*.22),{shadow:false});
  x.fillStyle='#fff';x.font='900 13px system-ui';x.textAlign='center';
  if(fillK>.01)x.fillText(Math.round(fillK*100)+'%',pb.vert?pb.x+pb.w/2:pb.x+pb.w/2,pb.vert?pb.y+pb.h+14:pb.y-5);
  else{x.font='800 11px system-ui';x.fillStyle='rgba(255,255,255,.7)';if(pb.vert){x.fillText('POWER',pb.x+pb.w/2,pb.y-6);x.fillText('pull ↓',pb.x+pb.w/2,pb.y+pb.h+14);}else x.fillText('◀ PULL FOR POWER ▶',pb.x+pb.w/2,pb.y-5);}
  // fine-aim wheel
  const wh=L.wheel;x.fillStyle='rgba(0,0,0,.55)';ART.rr(x,wh.x,wh.y,wh.w,wh.h,10);x.fill();x.save();ART.rr(x,wh.x+3,wh.y+3,wh.w-6,wh.h-6,8);x.clip();
  const off=(S.wheelOff||0)%14;x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=2;if(wh.vert)for(let yy=wh.y-14+((off+14)%14);yy<wh.y+wh.h+14;yy+=7){x.beginPath();x.moveTo(wh.x+6,yy);x.lineTo(wh.x+wh.w-6,yy);x.stroke();}else for(let xx=wh.x-14+((off+14)%14);xx<wh.x+wh.w+14;xx+=7){x.beginPath();x.moveTo(xx,wh.y+6);x.lineTo(xx,wh.y+wh.h-6);x.stroke();}
  const sh=wh.vert?x.createLinearGradient(0,wh.y,0,wh.y+wh.h):x.createLinearGradient(wh.x,0,wh.x+wh.w,0);sh.addColorStop(0,'rgba(0,0,0,.75)');sh.addColorStop(.5,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,0,.75)');x.fillStyle=sh;x.fillRect(wh.x,wh.y,wh.w,wh.h);x.restore();
  x.fillStyle='rgba(255,255,255,.7)';x.font='800 10px system-ui';x.textAlign='center';x.fillText('FINE AIM',wh.x+wh.w/2,wh.vert?wh.y-5:wh.y-5);
  // spin button
  const sp=L.spin;x.fillStyle='rgba(0,0,0,.55)';x.beginPath();x.arc(sp.x,sp.y,sp.r+4,0,6.28);x.fill();const bg=x.createRadialGradient(sp.x-sp.r*.3,sp.y-sp.r*.35,sp.r*.1,sp.x,sp.y,sp.r);bg.addColorStop(0,'#fff');bg.addColorStop(1,'#cfc8b6');x.fillStyle=bg;x.beginPath();x.arc(sp.x,sp.y,sp.r,0,6.28);x.fill();
  x.fillStyle='#d42a2a';x.beginPath();x.arc(sp.x+S.side*2*sp.r*.85,sp.y-S.vert*2*sp.r*.85,Math.max(3,sp.r*.18),0,6.28);x.fill();x.fillStyle='rgba(255,255,255,.75)';x.font='800 10px system-ui';x.fillText('SPIN',sp.x,sp.y+sp.r+14);
  x.restore();
 }
 function drawCoach(){x.save();x.fillStyle='rgba(0,0,0,.62)';x.fillRect(0,0,W,H);const tip=(tx,ty,ax,ay,text)=>{x.strokeStyle='#ffd23f';x.lineWidth=3;x.beginPath();x.moveTo(tx,ty);x.lineTo(ax,ay);x.stroke();x.fillStyle='#ffd23f';x.beginPath();x.arc(ax,ay,5,0,6.28);x.fill();x.font='800 14px system-ui';const lines=text.split('\n'),w=Math.max(...lines.map(l=>x.measureText(l).width))+22,hh=lines.length*18+12;const bx=Math.max(6,Math.min(W-w-6,tx-w/2)),by=ty-hh/2;x.fillStyle='rgba(20,14,8,.95)';ART.rr(x,bx,by,w,hh,10);x.fill();x.strokeStyle='#ffd23f';x.lineWidth=1.5;x.stroke();x.fillStyle='#fff';x.textAlign='left';lines.forEach((l,i)=>x.fillText(l,bx+11,by+22+i*18));};
  const cb=ws(cueBall().x,cueBall().y);tip(W/2,L.cy-(L.rot?L.k*16:L.k*10),cb.x,cb.y-14,'Drag anywhere on the table:\nthe cue swings round the ball.\nTap a ball to aim straight at it.');
  const pb=L.power;tip(pb.vert?pb.x+pb.w+90:pb.x+pb.w/2,pb.vert?pb.y+pb.h/2:pb.y-50,pb.x+pb.w/2,pb.y+pb.h/2,'Pull the POWER bar,\nlet go to shoot.');
  tip(L.spin.x+(L.rot?60:-90),L.spin.y-(L.rot?70:-40),L.spin.x,L.spin.y,'SPIN: top = follow,\nbottom = draw, sides = english.');
  const wh=L.wheel;tip(wh.vert?wh.x-80:wh.x+wh.w/2-40,wh.vert?wh.y+wh.h*.7:wh.y-60,wh.x+wh.w/2,wh.y+wh.h/2,'FINE AIM for tiny turns.');
  x.fillStyle='#fff';x.font='800 13px system-ui';x.textAlign='center';x.fillText('Tap anywhere to play',W/2,H-12);x.restore();}
 function drawSpinBig(){const sp=spinBig();x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,0,W,H);const bg=x.createRadialGradient(sp.x-sp.r*.3,sp.y-sp.r*.35,sp.r*.1,sp.x,sp.y,sp.r);bg.addColorStop(0,'#fff');bg.addColorStop(1,'#bdb5a0');x.fillStyle=bg;x.beginPath();x.arc(sp.x,sp.y,sp.r,0,6.28);x.fill();
  const lim=cueOf(S.m.turn).stats.spin/.5;x.strokeStyle='rgba(0,0,0,.25)';x.setLineDash([4,5]);x.beginPath();x.arc(sp.x,sp.y,sp.r*lim,0,6.28);x.stroke();x.setLineDash([]);x.beginPath();x.moveTo(sp.x-sp.r,sp.y);x.lineTo(sp.x+sp.r,sp.y);x.moveTo(sp.x,sp.y-sp.r);x.lineTo(sp.x,sp.y+sp.r);x.stroke();
  x.fillStyle='#d42a2a';x.beginPath();x.arc(sp.x+S.side*2*sp.r,sp.y-S.vert*2*sp.r,sp.r*.1,0,6.28);x.fill();
  x.fillStyle='#fff';x.font='800 13px system-ui';x.textAlign='center';x.fillText('FOLLOW',sp.x,sp.y-sp.r-8);x.fillText('DRAW',sp.x,sp.y+sp.r+14);x.textAlign='right';x.fillText('LEFT',sp.x-sp.r-8,sp.y+4);x.textAlign='left';x.fillText('RIGHT',sp.x+sp.r+8,sp.y+4);
  const r=sp.reset;x.fillStyle='rgba(255,255,255,.15)';ART.rr(x,r.x,r.y+10,r.w,r.h,15);x.fill();x.fillStyle='#fff';x.textAlign='center';x.fillText('CENTER',r.x+r.w/2,r.y+30);
  x.fillStyle='rgba(255,255,255,.6)';x.font='700 11px system-ui';x.fillText('Tap outside to close',sp.x,Math.min(H-10,sp.y+sp.r+76));}
 function drawFX(){
  // banner queue
  const b=S.banner[0];if(b){if(b.t0===null)b.t0=t;const e=t-b.t0;if(e>b.dur)S.banner.shift();else{const k=Math.min(1,e/.18),out=Math.max(0,(e-b.dur+.25)/.25),a=1-out,sc=.7+.3*k+(1-k)*.4;x.save();x.globalAlpha=a;x.translate(W/2,L.cy-(L.rot?L.k*10:0));x.scale(sc,sc);
   const fs=Math.min(W*.11,58);x.font=`900 ${fs}px "SC Bangers",Impact,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=fs*.14;x.strokeStyle='rgba(0,0,0,.85)';x.strokeText(b.text,0,0);x.shadowColor=b.col;x.shadowBlur=18;x.fillStyle=b.col;x.fillText(b.text,0,0);x.shadowBlur=0;
   if(b.sub){x.font=`800 ${Math.min(16,fs*.32)}px system-ui`;const w=x.measureText(b.sub).width+24;x.fillStyle='rgba(0,0,0,.7)';ART.rr(x,-w/2,fs*.55,w,26,13);x.fill();x.fillStyle='#fff';x.fillText(b.sub,0,fs*.55+13);}x.restore();}}
  // cash pops
  for(let i=S.pops.length-1;i>=0;i--){const p=S.pops[i],e=t-p.t0;if(e>1.1){S.pops.splice(i,1);continue;}if(!p.text)continue;x.globalAlpha=1-e/1.1;x.fillStyle=p.text==='SCRATCH'?'#ff5a4a':'#7dff8a';x.font='900 15px system-ui';x.textAlign='center';x.fillText(p.text,p.x,p.y-e*30);x.globalAlpha=1;}
  // the gang heckles
  const q=S.quip;if(q){const e=t-q.t0;if(e>q.dur)S.quip=null;else{const a=Math.min(1,e/.2,(q.dur-e)/.3),fr=20,bx=8,by=L.rot?H-(L.power.h+40)-fr*2-24:H-fr*2-20;x.save();x.globalAlpha=a;x.font='700 13px system-ui';const w=Math.min(W-fr*2-40,x.measureText(q.line).width+20);
   x.fillStyle='#000';x.beginPath();x.arc(bx+fr,by+fr,fr,0,6.28);x.fill();try{HF.drawFaceById(x,q.id,'win',bx+fr,by+fr,fr*2.1);}catch{}x.fillStyle='rgba(255,255,255,.95)';ART.rr(x,bx+fr*2+8,by+fr-15,w,30,15);x.fill();x.fillStyle='#111';x.textAlign='left';let ln=q.line;while(x.measureText(ln).width>w-20&&ln.length>5)ln=ln.slice(0,-2);x.fillText(ln===q.line?ln:ln+'…',bx+fr*2+18,by+fr+5);x.restore();}}
 }
 function drawRackWin(){const r=S.rackWin,e=t-r.t0,a=Math.min(1,e/.3);x.save();x.globalAlpha=a*.6;x.fillStyle='#000';x.fillRect(0,0,W,H);x.globalAlpha=a;const fs=Math.min(W*.1,56);x.textAlign='center';x.textBaseline='middle';
  x.font=`900 ${fs}px "SC Bangers",Impact,sans-serif`;x.fillStyle=COLP[r.w];x.shadowColor=COLP[r.w];x.shadowBlur=20;x.fillText(`${name(r.w).toUpperCase()} WINS THE RACK`,W/2,H*.42,W*.92);x.shadowBlur=0;
  x.font=`800 ${fs*.36}px system-ui`;x.fillStyle='#fff';x.fillText([r.tag,r.why].filter(Boolean).join(' · '),W/2,H*.42+fs*.8);x.fillText(`${S.m.racks[0]} – ${S.m.racks[1]}`,W/2,H*.42+fs*1.5);
  try{s.sprite(x,r.w,W/2,H*.42-fs*1.6,fs*1.8,{exact:true,noBadge:true,still:true,mood:'win'});}catch{}x.restore();}
 function drawSummary(){const sm=S.summary,e=t-sm.t0,a=Math.min(1,e/.3);x.save();x.globalAlpha=a;x.fillStyle='rgba(8,5,4,.86)';x.fillRect(0,0,W,H);
  const w=S.m.over,cw=Math.min(W-24,440),cx=W/2-cw/2;let y=Math.max(fb.top+10,H*.08);x.textAlign='center';x.fillStyle=COLP[w];x.font=`900 ${Math.min(44,W*.09)}px "SC Bangers",Impact,sans-serif`;x.fillText(`${name(w).toUpperCase()} WINS!`,W/2,y+30);
  x.fillStyle='#fff';x.font='800 16px system-ui';x.fillText(`${game==='eight'?'8-Ball':'9-Ball'} · ${S.m.racks[0]} – ${S.m.racks[1]}`,W/2,y+56);y+=76;
  const LBL={pot:'Balls pocketed',bank:'Bank shots',combo:'Combos',kick:'Kick shots',multi:'Multi-ball shots',rack:'Racks won',runout:'Run outs',breakrun:'Break & run',golden:'Golden break',break8:'8 on the break',match:'Match win'};
  for(const p of [0,1]){if(!human(p)&&!(cpu&&p===1))continue;const rows=Object.entries(S.cash[p]);x.fillStyle='rgba(255,255,255,.07)';const hgt=34+rows.length*19+(cpu&&p===0&&sm.mult!==1?19:0);ART.rr(x,cx,y,cw,hgt,12);x.fill();
   x.textAlign='left';x.fillStyle=COLP[p];x.font='900 15px system-ui';x.fillText(name(p)+(cpu&&p===1?' · no cash for the CPU':''),cx+12,y+22);x.textAlign='right';x.fillStyle='#7dff8a';x.fillText(human(p)?`+$${sm.tot[p].toLocaleString()}`:'',cx+cw-12,y+22);
   x.font='700 13px system-ui';rows.forEach(([k,v],i)=>{x.textAlign='left';x.fillStyle='rgba(255,255,255,.8)';x.fillText(LBL[k]||k,cx+18,y+42+i*19);x.textAlign='right';x.fillText('$'+v,cx+cw-14,y+42+i*19);});
   if(cpu&&p===0&&sm.mult!==1){x.textAlign='left';x.fillStyle='#ffd23f';x.fillText(`CPU ${s.solo?.level} bonus ×${sm.mult}`,cx+18,y+42+rows.length*19);}
   y+=hgt+10;}
  x.textAlign='center';x.fillStyle='#fff';x.font='900 20px system-ui';x.fillText(`Paddy's cash: $${hall.cash.toLocaleString()}`,W/2,y+20);
  if(sm.afford.length){x.font='700 13px system-ui';x.fillStyle='#ffd23f';x.fillText(`You can afford: ${sm.afford.slice(0,3).join(', ')}${sm.afford.length>3?'…':''}`,W/2,y+44,W-30);}
  if(e>1){x.fillStyle='rgba(255,255,255,'+(.6+.4*Math.sin(t*4))+')';x.font='800 14px system-ui';x.fillText('Tap to continue',W/2,Math.min(H-24,y+80));}
  x.restore();}
 // ---------------------------------------------------------------- frame
 s.frame(dt=>{t+=dt;layout();
  for(let i=waits.length-1;i>=0;i--)if(t>=waits[i].at){waits[i].r();waits.splice(i,1);}
  if(!s.paused&&S.m){
   if(S.phase==='roll')rollStep(dt);
   else if(S.phase==='aim'){
    if((hall.set.clock||net)&&!S.spinOpen&&(!net||myTurn())){S.clock-=dt;if(S.clock<=0){if(net)net.send({to:1});timeOut();}}
    if(cpu&&S.m.turn===1){if(!S.plan&&!S.planBusy&&t-(S.turnAt||0)>.5)void cpuTurn();cpuStep();}
    if(s.debug?._bot&&myTurn()&&!S.plan&&!S.planBusy&&t-S.botT>.8){S.botT=t;void (async()=>{S.planBusy=true;const pl=await CPU.planShot({m:S.m,balls:S.balls,T,skill:.6,stats:cueOf(S.m.turn).stats,bih:!!S.m.bih,kitchen:!!S.m.bih?.kitchen});S.planBusy=false;if(!s.alive||S.phase!=='aim'||!myTurn())return;if(pl.place){cueBall().x=pl.place.x;cueBall().y=pl.place.y;if(net)net.send({bh:[pl.place.x,pl.place.y]});}if(pl.call!==undefined)S.call=pl.call;S.angle=Math.atan2(pl.dir[1],pl.dir[0]);fire({dir:pl.dir,speed:pl.speed,side:pl.side||0,vert:pl.vert||0});})();}
   }
  }
  if(S.phase==='summary'&&!S.ended&&t-S.summary.t0>(net||s.debug?._bot?5:12)){S.ended=true;endGame();}
  if(S.phase==='aim'&&S.m&&S.m.turn!==S.lastTurn){S.lastTurn=S.m.turn;S.turnAt=t;S.turnsThisRack=S.turnsThisRack||[0,0];if(!S.m.isBreak)S.turnsThisRack[S.m.turn]++;}
  draw();
  s.debug={...(s.debug||{}),phase:S.phase,match:S.m,balls:S.balls,hall,fire:p=>fire(p),state:()=>({phase:S.phase,turn:S.m?.turn,racks:S.m?.racks,over:S.m?.over,shots:S.m?.shots,group:S.m?.group,cash:S.cash}),
   play:()=>{if(hallEl)hallEl.querySelector('[data-act=play]')?.click();},bot:net?()=>{s.debug._bot=true;return 'bot';}:s.debug?.bot,
   aimAt:id=>{const b=S.balls.find(q=>q.id===id),cb=cueBall();if(b)S.angle=Math.atan2(b.y-cb.y,b.x-cb.x);},skip:()=>{if(S.phase==='summary'&&!S.ended){S.ended=true;endGame();}}};
 });
 s.hint(`PADDY'S POOL · ${game==='eight'?'8-BALL':'9-BALL'}: drag on the table to swing the cue round the cue ball (tap a ball to aim at it), use FINE AIM for tiny turns, pull the POWER bar and let go to shoot. The cue-ball button sets spin: top = follow, bottom = draw, sides = english. ${game==='eight'?'Sink your group (solids or stripes), then call a pocket and sink the 8.':'Always hit the lowest ball first; sink the 9 to win the rack.'} Fouls give ball in hand: drag the cue ball.`);
 // ---------------------------------------------------------------- go
 layout();
 if(arcade){hall.set.game=game;await hallScreen();}
 if(arcade)game=hall.set.game;const gameNow=game;
 const race=arcade?hall.set.race:net?1:1;
 if(net){if(me===0){const st={t:loadout.table.id,f:loadout.felt.id,b:loadout.balls.id};net.send({setup:st});S.setupDone=true;}net.send({cue:loadout.cue.id});const t0=t;await until(()=>S.setupDone||t-t0>6);}
 if(showDecor('jukebox'))snd.music(true);s.cleanup(()=>snd.music(false));
 S.m=RU.newMatch(gameNow,{race,breaker:rackRand(0)()<.5?0:1});S.turnsThisRack=[0,0];newRack();S.phase='intro';
 banner(gameNow==='eight'?'8-BALL':'9-BALL',`${name(S.m.turn)} breaks${race>1?` · race to ${race}`:''}`,'#ffd23f',2);
 await wait(.6);newTurn();S.lastTurn=S.m.turn;S.turnAt=t;
 if(!hall.set.seen&&!net&&(arcade||!s.solo?.board))S.coach=true;
}
Object.assign(exports,{paddysPool});
