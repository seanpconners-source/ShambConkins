// DIG DUEL (game id driller-duel, engine 'driller'): a dig-and-pump arcade game played like Dig Dug (1982): our own
// field, names and art. You tunnel through four layers of dirt; MOLE RATS and FIRE NEWTS wait in pockets, walk your
// tunnels and, when they get bored, float through the dirt as ghost eyes. PUMP shoots the air hose along your tunnel:
// keep pumping a hooked enemy until it POPS (deeper layers pay more; a newt pumped sideways pays double). Stop pumping and
// it shrinks back. Dig under a ROCK and it wobbles, then falls and crushes whatever is below (more for each one it takes).
// Drop two rocks and a bonus PICKLE turns up in the middle. The last enemy runs for the top-left corner. Newts breathe
// fire through the dirt along their row. Clear every enemy to go to the next round.
// 1P = solo kind 'levels' (rounds until the last life). 2P on one phone = turns on the same seed (P1's whole run, then
// P2's). Board game: 2 lives and 2 rounds a turn. Online: both dig the same seeded field at once on their own phones; the
// other's score/round/lives show at the top ({f}); both finish with both finals ({fin}).
const {clamp,seededRandom}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {netField}=require("src/engines/netField.js");
const {snd}=require("src/engines/arenaKit.js");
const {createControls}=require("src/engines/sundown/controls.js");

const COLS=13,ROWS=16,C=16,FW=COLS*C,FH=ROWS*C,SPD=44,DIG=.82,HOSE=3.2*C;
const LAYER=r=>r<1?0:r<5?1:r<9?2:r<13?3:4;   // 0 = sky
const LAYER_PTS=[0,200,300,400,500];
const DIRT=[null,['#e8b64a','#c8902a'],['#d8782a','#b0561a'],['#b8462a','#8a2a18'],['#7a2a3a','#521424']];
const cx=c=>c*C+C/2,cy=r=>r*C+C/2;

function buildRound(seed,n){const r=seededRandom(seed+':dig:'+n),dug=Array.from({length:ROWS},(_,row)=>Array(COLS).fill(row===0));
 const start={c:6,r:7};for(let row=0;row<=start.r;row++)dug[row][start.c]=true;for(let c=4;c<=8;c++)dug[start.r][c]=true;
 const nE=Math.min(8,3+Math.floor(n/2)),enemies=[],taken=(c,row)=>dug[row][c];
 for(let i=0;i<nE;i++){for(let tries=0;tries<80;tries++){const horiz=r()<.55,len=3+Math.floor(r()*2),c0=horiz?Math.floor(r()*(COLS-len)):Math.floor(r()*COLS),r0=2+Math.floor(r()*(ROWS-3-(horiz?0:len)));
   const cells=[];for(let k=0;k<len;k++)cells.push(horiz?[c0+k,r0]:[c0,r0+k]);
   if(cells.some(([c,row])=>row>=ROWS||Math.abs(c-start.c)<2&&row<=start.r+1||Math.abs(row-start.r)<2&&c>=3&&c<=9))continue;
   if(cells.some(([c,row])=>[[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>taken(clamp(c+a,0,COLS-1),clamp(row+b,0,ROWS-1))&&row+b>0)))continue;
   for(const [c,row] of cells)dug[row][c]=true;const [ec,er]=cells[Math.floor(len/2)];enemies.push({type:n>=2&&r()<.35?'newt':'rat',c:ec,r:er});break;}}
 const rocks=[];const nR=3+(n>3?1:0)+(n>7?1:0);
 for(let i=0;i<nR;i++)for(let tries=0;tries<80;tries++){const c=Math.floor(r()*COLS),row=2+Math.floor(r()*(ROWS-5));
  if(dug[row][c]||dug[row+1][c]||rocks.some(q=>Math.abs(q.c-c)<2&&Math.abs(q.r-row)<2))continue;rocks.push({c,r:row});break;}
 return {dug,start,enemies,rocks};}

async function driller(s){
 const [c,x]=s.canvas(900,560,{fill:true});const fb=fullBleed(s,{bg:'#0a0806'});
 const on=s.online||null,me=on?on.me:0,them=1-me,solo=!!s.solo&&!on,board=s.origin==='board'&&!on,nP=solo?1:2;
 const ctl=createControls(s,c,{np:1,solo:true,fireOnly:true,fireLabel:'PUMP'});
 const seed=String(s.seed||1),names=s.players.map(p=>p.name||'Player'),finals=[0,0];
 const LIVES0=board?2:3,ROUND_CAP=board?2:Infinity,TIME_CAP=on||board?180:Infinity;
 let cur=on?me:0,mode='intro',t=0,F=null,remote=null,autodrive=false;
 const sfx={pump:()=>snd(180,.07,{type:'square',vol:.04,to:260}),hose:()=>snd(600,.06,{type:'square',vol:.03,to:900}),pop:()=>{snd(880,.05,{type:'square',vol:.05});snd(220,.18,{type:'triangle',vol:.06,to:80,delay:.03});},
  wob:()=>snd(90,.2,{type:'square',vol:.03}),crush:()=>snd(70,.35,{type:'sawtooth',vol:.08,to:40}),die:()=>{snd(520,.2,{type:'square',vol:.05,to:120});snd(160,.5,{type:'triangle',vol:.05,delay:.2,to:50});},
  fire:()=>snd(120,.4,{type:'sawtooth',vol:.04,to:300}),bonus:()=>[784,988,1175,1568].forEach((f,i)=>snd(f,.09,{type:'square',vol:.04,delay:i*.08})),
  round:()=>[392,523,659,784,659,784].forEach((f,i)=>snd(f,.1,{type:'square',vol:.035,delay:i*.1})),step:()=>snd(260,.03,{type:'square',vol:.012})};

 // ---- a run (one player's game)
 function newRun(){return {score:0,lives:LIVES0,round:0,cleared:0,time:0,over:false,dug:null,P:null,E:[],R:[],veg:null,dropped:0,texts:[],cardT:0,clearT:0,deadT:0,hose:null,oneUp:false,fireT:0};}
 function startRound(run){run.round++;const L=buildRound(seed,run.round);run.dug=L.dug;run.start=L.start;
  run.E=L.enemies.map((e,i)=>({id:i,type:e.type,home:{c:e.c,r:e.r},x:cx(e.c),y:cy(e.r),dir:[1,0],st:'walk',pump:0,deflT:0,ghostT:11+i*3.5,fire:0,fireCD:3+i,horiz:false,dead:0,flee:false}));
  run.R=L.rocks.map(q=>({c:q.c,x:cx(q.c),y:cy(q.r),st:'still',t:0,kills:0}));run.veg=null;run.dropped=0;run.cardT=1.8;run.clearT=0;placePlayer(run);sfx.round();}
 function placePlayer(run){run.P={x:cx(run.start.c),y:cy(run.start.r),dir:[1,0],face:1,moving:false,step:0};run.hose=null;run.deadT=0;
  for(const e of run.E)if(!e.dead){e.x=cx(e.home.c);e.y=cy(e.home.r);e.st='walk';e.pump=0;e.fire=0;}}
 const dugAt=(run,c,r)=>r>=0&&r<ROWS&&c>=0&&c<COLS&&run.dug[r][c];
 const cellOf=v=>Math.floor(v/C);
 const say=(run,txt,x0,y0,col='#fff')=>run.texts.push({txt,x:x0,y:y0,t:0,col});
 const addScore=(run,n,x0,y0,col)=>{run.score+=n;if(x0!=null)say(run,String(n),x0,y0,col);if(!run.oneUp&&run.score>=20000){run.oneUp=true;run.lives++;sfx.bonus();say(run,'1-UP',FW/2,FH/2,'#8fff7a');}};

 // ---- player movement on the grid: one axis at a time, auto-aligns before turning, digs what it walks through
 function movePlayer(run,inp,dt){const P=run.P;let dx=inp.x,dy=inp.y;if(dx&&dy){if(P.dir[0])dx=0;else dy=0;}
  P.moving=false;if(!dx&&!dy)return;
  const want=dx?[dx,0]:[0,dy],gx=cx(cellOf(P.x)),gy=cy(cellOf(P.y));
  let mv=SPD*dt*(dugAt(run,cellOf(P.x+want[0]*C*.6),cellOf(P.y+want[1]*C*.6))?1:DIG);
  if(want[0]){ // horizontal: need y on a row centre
   if(Math.abs(P.y-gy)>.5){const d=Math.sign(gy-P.y);P.y+=d*Math.min(mv,Math.abs(gy-P.y));P.dir=[0,d];}
   else{P.y=gy;P.x=clamp(P.x+want[0]*mv,C/2,FW-C/2);P.dir=want;P.face=want[0];}}
  else{if(Math.abs(P.x-gx)>.5){const d=Math.sign(gx-P.x);P.x+=d*Math.min(mv,Math.abs(gx-P.x));P.dir=[d,0];P.face=d;}
   else{P.x=gx;P.y=clamp(P.y+want[1]*mv,C/2,FH-C/2);P.dir=want;}}
  P.moving=true;P.step+=dt;if(P.step>.16){P.step=0;sfx.step();}
  // dig the cell the body is in (and the one it is entering)
  for(const [px,py] of [[P.x,P.y],[P.x+P.dir[0]*C*.45,P.y+P.dir[1]*C*.45]]){const c0=cellOf(px),r0=cellOf(py);if(r0>0&&r0<ROWS&&c0>=0&&c0<COLS&&!run.dug[r0][c0]){run.dug[r0][c0]=true;if(LAYER(r0))run.score+=10;}}}
 // ---- the air hose
 function pump(run){const P=run.P;
  if(run.hose?.e){const e=run.hose.e;if(e.dead||e.st!=='pumped'){run.hose=null;return;}e.pump++;e.deflT=.9;sfx.pump();if(e.pump>=4)popEnemy(run,e);return;}
  if(run.hose)return;run.hose={len:0,dir:[...P.dir],t:0,e:null,max:HOSE};sfx.hose();}
 function hoseStep(run,dt){const h=run.hose;if(!h)return;const P=run.P;
  if(h.e){h.t+=dt;if(h.e.dead||h.e.st!=='pumped'||h.t>1.4){run.hose=null;}return;}
  h.len+=dt*260;const tx=P.x+h.dir[0]*h.len,ty=P.y+h.dir[1]*h.len;
  if(!dugAt(run,cellOf(tx),cellOf(ty))||h.len>=h.max||tx<0||tx>FW||ty<0||ty>FH){run.hose=null;return;}
  for(const e of run.E)if(!e.dead&&e.st!=='ghost'&&Math.hypot(e.x-tx,e.y-ty)<C*.6){h.e=e;h.len=Math.hypot(e.x-P.x,e.y-P.y);h.t=0;e.st='pumped';e.pump=1;e.deflT=.9;e.horiz=!!h.dir[0];e.fire=0;sfx.pump();return;}}
 function popEnemy(run,e){e.dead=1;e.st='pop';run.hose=null;const pts=LAYER_PTS[LAYER(cellOf(e.y))]*(e.type==='newt'&&e.horiz?2:1);addScore(run,pts,e.x,e.y-8,'#fff3b9');sfx.pop();vibrate(15);}

 // ---- enemies
 function enemyStep(run,e,dt){if(e.dead){e.dead+=dt;return;}
  const P=run.P,left=run.E.filter(q=>!q.dead).length,sp=Math.min(56,28+run.round*2)*(left===1?1.25:1);
  if(e.st==='pumped'){e.deflT-=dt;if(e.deflT<=0){e.pump--;e.deflT=.55;if(e.pump<=0){e.st='walk';e.pump=0;if(run.hose?.e===e)run.hose=null;}}return;}
  if(e.st==='crushed'){return;}
  if(left===1&&!e.flee&&run.round>0&&run.clearT===0&&run.E.length>1){e.flee=true;e.st='ghost';}
  if(e.st==='ghost'){const tgt=e.flee?{x:cx(0),y:cy(0)}:P,d=Math.hypot(tgt.x-e.x,tgt.y-e.y)||1;e.x+=(tgt.x-e.x)/d*sp*.62*dt;e.y+=(tgt.y-e.y)/d*sp*.62*dt;e.ghostT-=dt;
   if(e.flee&&d<4){e.st='walk';e.x=cx(0);e.y=cy(0);e.dir=[-1,0];}
   const c0=cellOf(e.x),r0=cellOf(e.y);if(!e.flee&&e.ghostT<-1.6&&dugAt(run,c0,r0)&&Math.abs(e.x-cx(c0))<2&&Math.abs(e.y-cy(r0))<2){e.x=cx(c0);e.y=cy(r0);e.st='walk';e.ghostT=9+Math.random()*7-Math.min(4,run.round*.4);}
   return;}
  if(e.flee&&cellOf(e.y)===0){e.x-=sp*dt;if(e.x<-C){e.dead=1;e.escaped=true;}return;}
  // newts breathe fire along their row
  if(e.type==='newt'){if(e.fire>0){e.fire-=dt;return;}e.fireCD-=dt;if(e.fireCD<=0&&Math.abs(P.y-e.y)<C*.6&&Math.abs(P.x-e.x)<C*5&&Math.sign(P.x-e.x)===(e.dir[0]||Math.sign(P.x-e.x))){e.fire=1.3;e.fireCD=4+Math.random()*3;e.dir=[Math.sign(P.x-e.x)||1,0];sfx.fire();return;}}
  e.ghostT-=dt;if(e.ghostT<=0&&!e.flee){e.st='ghost';e.ghostT=0;return;}
  // walk the tunnels: at a cell centre pick the open way that gets closer to the player (sometimes a random one)
  const c0=Math.round((e.x-C/2)/C),r0=Math.round((e.y-C/2)/C),atC=Math.abs(e.x-cx(c0))<.6&&Math.abs(e.y-cy(r0))<.6;
  if(atC){e.x=cx(c0);e.y=cy(r0);const opts=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>dugAt(run,c0+a,r0+b)&&r0+b>0);
   const tgt=e.flee?{x:cx(0),y:cy(0)}:P;let best=null,bs=-1e9;
   for(const o of opts){const nx=cx(c0+o[0]),ny=cy(r0+o[1]);let sc=-Math.hypot(tgt.x-nx,tgt.y-ny)+Math.random()*C*1.2;if(o[0]===-e.dir[0]&&o[1]===-e.dir[1])sc-=C*2.5;if(sc>bs){bs=sc;best=o;}}
   e.dir=best||[-e.dir[0],-e.dir[1]];if(!best){e.ghostT-=dt*3;}}
  if(dugAt(run,cellOf(e.x+e.dir[0]*C*.5),cellOf(e.y+e.dir[1]*C*.5))||!atC){e.x+=e.dir[0]*sp*dt;e.y+=e.dir[1]*sp*dt;}}
 // ---- rocks
 function rockStep(run,q,dt){const c0=cellOf(q.x),r0=cellOf(q.y),P=run.P;
  if(q.st==='still'){if(dugAt(run,c0,r0+1)){const under=Math.abs(P.x-q.x)<C*.7&&P.y>q.y&&P.y<q.y+C*1.5&&!run.deadT;if(!under){q.st='wobble';q.t=.7;sfx.wob();}}return;}
  if(q.st==='wobble'){q.t-=dt;if(q.t<=0)q.st='fall';return;}
  if(q.st==='fall'){q.y+=150*dt;run.dug[clamp(cellOf(q.y),0,ROWS-1)][c0]=true;
   for(const e of run.E)if(!e.dead&&e.st!=='ghost'&&Math.abs(e.x-q.x)<C*.75&&e.y>q.y-C*.3&&e.y<q.y+C*.9){e.st='crushed';e.dead=.01;q.kills++;}
   if(!run.deadT&&Math.abs(P.x-q.x)<C*.75&&P.y>q.y-C*.2&&P.y<q.y+C*.9)killPlayer(run,'crushed');
   const nr=cellOf(q.y+C/2);if(nr>=ROWS||!dugAt(run,c0,nr)){q.y=Math.min(cy(nr-1),FH-C/2);q.st='break';q.t=.6;sfx.crush();W.shake=.3;run.dropped++;
    if(q.kills){const pts=[0,1000,2500,4000,6000,8000,10000,12000,15000][Math.min(8,q.kills)];addScore(run,pts,q.x,q.y-10,'#ffd23f');}
    if(run.dropped===2&&!run.veg)run.veg={x:cx(6),y:cy(7),t:10,pts:400+run.round*200};}return;}
  if(q.st==='break'){q.t-=dt;if(q.t<=0)q.st='gone';}}
 function killPlayer(run,why){if(run.deadT)return;run.deadT=2;run.hose=null;sfx.die();vibrate(40);run.lives--;run.why=why;}

 // ---- one step of a run
 function stepRun(run,inp,dt){if(run.over)return;
  for(const q of run.texts){q.t+=dt;q.y-=10*dt;}run.texts=run.texts.filter(q=>q.t<1.1);
  if(run.cardT>0){run.cardT-=dt;return;}
  run.time+=dt;if(run.time>=TIME_CAP){run.over=true;return;}
  if(run.deadT){run.deadT-=dt;if(run.deadT<=0){run.deadT=0;if(run.lives<=0){run.over=true;return;}placePlayer(run);run.cardT=1;}return;}
  if(run.clearT){run.clearT-=dt;if(run.clearT<=0){run.clearT=0;run.cleared=run.round;soloProgress(s,run.score,run.cleared,`Round ${run.cleared} cleared`);if(run.cleared>=ROUND_CAP){run.over=true;return;}startRound(run);}return;}
  const P=run.P;
  if(inp.x||inp.y){if(run.hose?.e)run.hose=null;if(!run.hose)movePlayer(run,inp,dt);}
  if(inp.pumpPress)pump(run);else if(inp.pumpHeld&&run.hose?.e){run.hoseAuto=(run.hoseAuto||0)+dt;if(run.hoseAuto>.24){run.hoseAuto=0;pump(run);}}
  hoseStep(run,dt);
  for(const e of run.E)enemyStep(run,e,dt);
  for(const q of run.R)rockStep(run,q,dt);run.R=run.R.filter(q=>q.st!=='gone');
  // touches: walking/ghost enemies and fire kill; a pumped enemy is harmless
  for(const e of run.E){if(e.dead||e.st==='pumped'||e.st==='crushed')continue;
   if(Math.hypot(e.x-P.x,e.y-P.y)<C*.72){killPlayer(run,'caught');break;}
   if(e.type==='newt'&&e.fire>0&&e.fire<1&&Math.abs(P.y-e.y)<C*.6){const d=(P.x-e.x)*e.dir[0];if(d>0&&d<C*3.2){killPlayer(run,'burned');break;}}}
  if(run.veg){run.veg.t-=dt;if(Math.hypot(run.veg.x-P.x,run.veg.y-P.y)<C*.7){addScore(run,run.veg.pts,run.veg.x,run.veg.y-10,'#8fff7a');sfx.bonus();run.veg=null;}else if(run.veg.t<=0)run.veg=null;}
  run.E=run.E.filter(e=>!e.dead||e.dead<.6);
  if(!run.E.some(e=>!e.dead)&&!run.clearT){run.clearT=1.6;say(run,'ROUND CLEAR!',FW/2,FH/2-10,'#8fff7a');}}

 // ---- autopilot (tests, online bot): walk to the nearest enemy's row/column and pump it when lined up
 function auto(run){const inp={x:0,y:0,pumpPress:false,pumpHeld:false},P=run.P;if(!P||run.deadT||run.cardT>0)return inp;
  const live=run.E.filter(e=>!e.dead&&e.st!=='crushed');if(!live.length)return inp;
  if(run.hose?.e){inp.pumpHeld=true;inp.pumpPress=Math.random()<.2;return inp;}
  const e=live.sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y))[0],ddx=e.x-P.x,ddy=e.y-P.y;
  if(Math.abs(ddy)<3&&Math.abs(ddx)<HOSE&&Math.sign(ddx)===P.dir[0]){inp.pumpPress=true;return inp;}
  if(Math.abs(ddx)<3&&Math.abs(ddy)<HOSE&&Math.sign(ddy)===P.dir[1]){inp.pumpPress=true;return inp;}
  if(Math.abs(ddy)>2)inp.y=Math.sign(ddy);else inp.x=Math.sign(ddx);return inp;}

 // ---- online: my run's numbers out, theirs in
 const nf=netField(s,{hz:6,pack:()=>F?{sc:F.score,rd:F.round,lv:F.lives,ov:F.over?1:0}:{},unpack:(i,d)=>{if(d&&Number.isFinite(d.sc))remote={...d};}});

 s.debug={engine:'driller',get run(){return F;},get mode(){return mode;},get cur(){return cur;},set autopilot(v){autodrive=!!v;},get autopilot(){return autodrive;},
  popAll(){for(const e of F.E)if(!e.dead)popEnemy(F,e);},die(){killPlayer(F,'test');},lives(n){F.lives=n;},buildRound,
  bot:on?()=>{if(autodrive)return '';autodrive=true;return 'drive';}:null};

 // ---- flow
 let pumpWas=false;const W={shake:0};
 async function playRun(i){cur=i;F=newRun();startRound(F);mode='play';
  await new Promise(res=>{F.done=res;});return F.score;}
 s.frame(dt=>{dt=Math.min(dt,.05);t+=dt;W.shake=Math.max(0,W.shake-dt);
  if(mode==='play'&&F&&!s.paused){const r=ctl.read(0);let inp={x:r.x,y:r.y,pumpPress:r.fires>0||r.jumps>0,pumpHeld:r.fire};pumpWas=r.fire;
   if(autodrive)inp=auto(F);stepRun(F,inp,dt);if(F.over&&!F.overT)F.overT=1.4;if(F.overT){F.overT-=dt;if(F.overT<=0){mode='between';F.done?.();}}}
  if(nf&&mode!=='intro')nf.tick(dt);
  draw();});
 const intro=solo?'Dig Duel! Drag anywhere to dig. PUMP shoots your air hose down the tunnel: keep pumping a hooked enemy until it pops. Dig under rocks to drop them on enemies. Newts breathe fire along their row.'
  :on?'Dig Duel online: you both dig the same field at once. Pump enemies until they pop, drop rocks on them. Most points wins.'
  :'Dig Duel: take turns digging the same field. Drag to dig, PUMP to inflate enemies until they pop, drop rocks on them. Most points wins.';
 if(!await s.pass(0,intro,on?'Dig in!':`${names[0]} digs first`))return;
 if(on){mode='sync';await nf.start('go');if(!s.alive)return;
  const mine=await playRun(me);finals[me]=mine;mode='wait';nf.finish({sc:mine});const r=await nf.remoteDone();finals[them]=Number.isFinite(r?.sc)?r.sc:(remote?.sc|0);
  s.finish(finals,`Dig Duel: ${finals[0].toLocaleString()} – ${finals[1].toLocaleString()}`);return;}
 finals[0]=await playRun(0);
 if(solo){soloFinish(s,finals[0],F.cleared,`Dig Duel · round ${F.round} · ${finals[0].toLocaleString()} pts`,F.cleared>0);return;}
 mode='between';if(!await s.pass(1,`${names[0]} scored ${finals[0].toLocaleString()}. Same field, your turn.`,`${names[1]} digs`))return;
 finals[1]=await playRun(1);mode='over';s.finish(finals,`Dig Duel: ${finals[0].toLocaleString()} – ${finals[1].toLocaleString()}`);

 // ---- drawing
 function draw(){const Wd=s.W,Hd=s.H;x.setTransform(1,0,0,1,0,0);x.fillStyle='#0a0806';x.fillRect(0,0,Wd,Hd);
  const top=(fb.top||40)+30,tall=Hd>Wd*1.1,ctrlH=tall?Math.min(200,Hd*.24):0;
  let k=Math.min(Wd/FW,(Hd-top-8-ctrlH)/FH);if(!tall)k=Math.min(k,(Wd-200)/FW);k=Math.max(.5,k);
  const ox=(Wd-FW*k)/2,oy=top+Math.max(0,(Hd-top-ctrlH-FH*k)*.4);ctl.layout(Wd,Hd);
  const run=F;x.save();x.translate(ox+(W.shake?(Math.random()-.5)*5*W.shake:0),oy);x.scale(k,k);
  // sky + grass
  const sky=x.createLinearGradient(0,0,0,C);sky.addColorStop(0,'#3a7ad8');sky.addColorStop(1,'#8ac8ff');x.fillStyle=sky;x.fillRect(0,0,FW,C);
  x.fillStyle='#fff8';for(const [a,b] of [[30,4],[120,6],[180,3]]){x.beginPath();x.ellipse((a+t*4)%FW,b+2,9,3,0,0,7);x.fill();}
  // dirt layers with texture
  for(let r=1;r<ROWS;r++){const [a,b]=DIRT[LAYER(r)];x.fillStyle=a;x.fillRect(0,r*C,FW,C);x.fillStyle=b;for(let c=0;c<COLS;c++)for(let j=0;j<3;j++){const h=(r*31+c*17+j*7)%13;x.fillRect(c*C+(h%12)+1,r*C+((h*5)%13)+1,2,1.5);}}
  x.fillStyle='#3a9a3a';x.fillRect(0,C-2,FW,3);for(let gx=2;gx<FW;gx+=6){x.fillRect(gx,C-4,1.2,3);}
  if(run?.dug){ // tunnels
   x.fillStyle='#0c0806';for(let r=1;r<ROWS;r++)for(let c=0;c<COLS;c++)if(run.dug[r][c]){x.fillRect(c*C+2,r*C+2,C-4,C-4);
    if(c+1<COLS&&run.dug[r][c+1])x.fillRect(c*C+C-2,r*C+2,4,C-4);if(r+1<ROWS&&run.dug[r+1][c])x.fillRect(c*C+2,r*C+C-2,C-4,4);if(r===1)x.fillRect(c*C+2,C-1,C-4,4);}
   for(const q of run.R)drawRock(q);
   if(run.veg)drawPickle(run.veg);
   for(const e of run.E)drawEnemy(run,e);
   drawHose(run);drawPlayer(run);
   for(const q of run.texts){x.globalAlpha=Math.max(0,1-q.t);x.fillStyle=q.col;x.font='900 8px monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(q.txt,q.x,q.y);x.globalAlpha=1;}}
  x.restore();x.strokeStyle='#5a3a1a';x.lineWidth=2;x.strokeRect(ox-1,oy-1,FW*k+2,FH*k+2);
  // cards
  const fs=clamp(Math.min(Wd,Hd)*.04,12,20);x.textAlign='center';x.textBaseline='middle';
  if(run&&run.cardT>0&&mode==='play'){x.fillStyle='#000b';x.fillRect(ox,oy+FH*k*.42,FW*k,FH*k*.14);x.fillStyle='#fff3b9';x.font=`900 ${fs*1.4}px monospace`;x.fillText(run.round===1&&run.deadT===0&&run.time<.1?`${names[cur].toUpperCase()} · ROUND ${run.round}`:`ROUND ${run.round}`,Wd/2,oy+FH*k*.49);}
  if(run&&run.deadT>0){x.fillStyle='#000a';x.fillRect(ox,oy+FH*k*.42,FW*k,FH*k*.12);x.fillStyle='#ff9a9a';x.font=`900 ${fs*1.1}px monospace`;x.fillText(run.lives>0?(run.why==='burned'?'TOASTED!':run.why==='crushed'?'FLATTENED!':'GOT YOU!'):'GAME OVER',Wd/2,oy+FH*k*.48);}
  if(mode==='wait'||mode==='sync'){x.fillStyle='#000b';x.fillRect(ox,oy+FH*k*.3,FW*k,FH*k*.2);x.fillStyle='#fff';x.font=`900 ${fs}px monospace`;x.fillText(mode==='sync'?'WAITING FOR THE OTHER DIGGER…':`WAITING FOR ${names[them].toUpperCase()}…`,Wd/2,oy+FH*k*.37);
   if(remote&&mode==='wait'){x.font=`700 ${fs*.8}px monospace`;x.fillText(`${remote.sc.toLocaleString()} pts · round ${remote.rd} · ${Math.max(0,remote.lv)} left`,Wd/2,oy+FH*k*.44);}}
  // HUD
  if(run){x.font=`900 ${fs}px monospace`;x.textAlign='left';x.fillStyle='#ffd23f';x.fillText(`${names[cur].slice(0,8).toUpperCase()} ${String(run.score).padStart(6,'0')}`,ox,oy-fs*1.1);
   x.textAlign='right';x.fillStyle='#fff3b9';x.fillText(`R${run.round}`,ox+FW*k,oy-fs*1.1);
   for(let j=0;j<Math.min(6,Math.max(0,run.lives-1));j++){x.fillStyle='#fff';x.beginPath();x.arc(ox+FW*k-fs*3.2-j*fs*.9,oy-fs*1.1,fs*.3,0,7);x.fill();}
   if(on&&remote){x.textAlign='left';x.font=`700 ${fs*.75}px monospace`;x.fillStyle='#ff9ac8';x.fillText(`${names[them].slice(0,8)} ${remote.sc.toLocaleString()} · R${remote.rd}${remote.ov?' · done':''}`,ox,oy-fs*2.2);}
   else if(!solo&&cur===1){x.textAlign='left';x.font=`700 ${fs*.75}px monospace`;x.fillStyle='#9ac8ff';x.fillText(`${names[0]} scored ${finals[0].toLocaleString()}`,ox,oy-fs*2.2);}
   if(TIME_CAP<Infinity){x.textAlign='center';x.font=`700 ${fs*.8}px monospace`;x.fillStyle='#fff';x.fillText(`${Math.max(0,Math.ceil(TIME_CAP-run.time))}s`,Wd/2,oy-fs*1.1);}}
  ctl.draw(x,{alpha:.9,hidden:mode!=='play'});
  s.setScores?.(nP===1?[F?.score||0,0]:on?[me===0?F?.score||0:remote?.sc||0,me===1?F?.score||0:remote?.sc||0]:[cur===0?F?.score||0:finals[0],cur===1?F?.score||0:finals[1]]);}

 function drawPlayer(run){const P=run.P;if(!P)return;const dead=run.deadT>0;x.save();x.translate(P.x,P.y);
  if(dead){x.rotate(Math.min(1,(2-run.deadT))*Math.PI*.5);x.globalAlpha=Math.max(.2,run.deadT/2);}
  const f=P.face||1,bob=P.moving?Math.sin(t*18)*.8:0;
  // white suit, blue boots, the air tank on the back
  x.fillStyle='#d8dce8';x.fillRect(-4.5,-2+bob,9,8);x.fillStyle='#2a62d8';x.fillRect(-4.5,5,4,2.5);x.fillRect(.5,5,4,2.5);
  x.fillStyle='#8a96a8';x.fillRect(-f*6.5,-2+bob,3,6);x.restore();
  s.sprite(x,cur,P.x+f*.5,P.y-6.5+(P.moving?Math.sin(t*18)*.8:0),15,{exact:true,still:true,mood:dead?'sad':run.hose?.e?'angry':P.moving?'walking':'normal'});}
 function drawHose(run){const h=run.hose,P=run.P;if(!h||!P)return;const L=h.e?Math.hypot(h.e.x-P.x,h.e.y-P.y):h.len;
  x.strokeStyle='#e8e8f0';x.lineWidth=1.4;x.setLineDash([2,1.5]);x.beginPath();x.moveTo(P.x+h.dir[0]*5,P.y+h.dir[1]*5);x.lineTo(P.x+h.dir[0]*L,P.y+h.dir[1]*L);x.stroke();x.setLineDash([]);
  x.fillStyle='#fff';x.beginPath();x.arc(P.x+h.dir[0]*L,P.y+h.dir[1]*L,1.8,0,7);x.fill();}
 function drawEnemy(run,e){if(e.dead&&e.st!=='crushed'&&e.st!=='pop')return;x.save();x.translate(e.x,e.y);
  if(e.st==='pop'){x.globalAlpha=Math.max(0,1-e.dead*2);x.strokeStyle='#fff';x.lineWidth=1;for(let j=0;j<8;j++){const a=j*Math.PI/4,r=6+e.dead*20;x.beginPath();x.moveTo(Math.cos(a)*r*.5,Math.sin(a)*r*.5);x.lineTo(Math.cos(a)*r,Math.sin(a)*r);x.stroke();}x.restore();return;}
  if(e.st==='crushed'){x.scale(1.3,.35);}
  if(e.st==='ghost'){ // just the eyes, drifting through the dirt
   x.fillStyle='#fff';for(const sx of [-3,3]){x.beginPath();x.ellipse(sx,0,2.6,3.2,0,0,7);x.fill();}x.fillStyle='#000';const lx=clamp((run.P.x-e.x)/40,-1,1),ly=clamp((run.P.y-e.y)/40,-1,1);for(const sx of [-3,3]){x.beginPath();x.arc(sx+lx,ly,1.2,0,7);x.fill();}x.restore();return;}
  const inf=1+e.pump*.28,f=e.dir[0]||1;x.scale(inf,inf);const walk=Math.sin(t*12+e.id)*.8;
  if(e.type==='rat'){ // Mole Rat: round pink body, big buck teeth, little claws
   x.fillStyle=e.pump?'#ffb0c8':'#e8708a';x.beginPath();x.arc(0,0,6.5,0,7);x.fill();x.fillStyle='#c84a6a';x.fillRect(-5,4+walk,3,2);x.fillRect(2,4-walk,3,2);
   x.fillStyle='#fff';x.fillRect(f*2.5-1.5,1.5,1.4,2.6);x.fillRect(f*2.5+.1,1.5,1.4,2.6);x.fillStyle='#200';x.beginPath();x.arc(f*1.5-1.8,-2,1.2,0,7);x.arc(f*1.5+1.8,-2,1.2,0,7);x.fill();
   x.fillStyle='#ff9ab0';x.beginPath();x.arc(f*6,0,1.4,0,7);x.fill();}
  else{ // Fire Newt: green lizard, frill, glows before it breathes
   const glow=e.fire>1?.6+Math.sin(t*30)*.4:0;x.fillStyle=glow?`rgb(${120+glow*120},200,80)`:'#3aa84a';x.beginPath();x.ellipse(0,0,7,5.5,0,0,7);x.fill();
   x.fillStyle='#2a7a3a';x.beginPath();x.moveTo(-f*4,-4);x.lineTo(-f*1,-8);x.lineTo(f*1,-4);x.fill();x.fillStyle='#ffd23f';x.beginPath();x.arc(f*3,-1.5,1.5,0,7);x.fill();x.fillStyle='#000';x.fillRect(f*3-.4,-2.4,.9,1.8);
   x.fillStyle='#2a7a3a';x.fillRect(-5,4+walk,3,2);x.fillRect(2,4-walk,3,2);}
  x.restore();
  if(e.type==='newt'&&e.fire>0&&e.fire<1){const len=C*3.2*Math.min(1,(1-e.fire)*4),fx=e.x+e.dir[0]*6;const g=x.createLinearGradient(fx,0,fx+e.dir[0]*len,0);g.addColorStop(0,'#fff6a0');g.addColorStop(.5,'#ff8a20');g.addColorStop(1,'#ff302000');
   x.fillStyle=g;x.beginPath();x.moveTo(fx,e.y-2);x.lineTo(fx+e.dir[0]*len,e.y-4-Math.sin(t*20)*1.5);x.lineTo(fx+e.dir[0]*len,e.y+4+Math.sin(t*23)*1.5);x.lineTo(fx,e.y+2);x.fill();}}
 function drawRock(q){x.save();x.translate(q.x+(q.st==='wobble'?Math.sin(t*40)*1.2:0),q.y);if(q.st==='break'){x.globalAlpha=q.t/.6;x.scale(1.2,.8);}
  x.fillStyle='#8a8a92';x.beginPath();x.moveTo(-7,4);x.lineTo(-6,-4);x.lineTo(-1,-7);x.lineTo(5,-5);x.lineTo(7,2);x.lineTo(4,7);x.lineTo(-4,7);x.closePath();x.fill();
  x.fillStyle='#b8b8c0';x.beginPath();x.moveTo(-5,-3);x.lineTo(-1,-6);x.lineTo(2,-4);x.lineTo(-3,-1);x.fill();x.strokeStyle='#4a4a52';x.lineWidth=.8;x.beginPath();x.moveTo(0,-2);x.lineTo(2,3);x.stroke();x.restore();}
 function drawPickle(v){x.save();x.translate(v.x,v.y+Math.sin(t*4)*1.2);x.rotate(.5);x.fillStyle='#5aa83a';x.beginPath();x.ellipse(0,0,3.5,7,0,0,7);x.fill();x.fillStyle='#8ad86a';for(const [a,b] of [[-1,-3],[1,0],[-1,3]]){x.beginPath();x.arc(a,b,.8,0,7);x.fill();}x.restore();}
}

Object.assign(exports,{driller,buildRound,COLS,ROWS});
