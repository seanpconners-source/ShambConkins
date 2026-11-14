// BASEKETBALL SHOOTOUT (game id baseketball-shootout; the old movie-rules game and the separate Hoop Jones entry are gone:
// owner, Nov 14 round 3: "this new hoop Jones game should just be called baseketball shootout... the only one"). It plays
// like Merit's Megatouch HOOP JONES (owner's screenshot + "four shooters with unlimited shots each and a moving basket.
// You have to time the travel of the ball. Each stage gets further away. You just tap the characters. There is a wait in
// between so you can't spam balls"; Merit: "time each shot to make a basket; the basket moves further away each round and
// shifts side to side throughout all play; three consecutive baskets earn lightning bonus points"; a review: ten levels, a
// "back it up" warning before time runs out):
//  - four shooters stand in a row at the bottom, seen from behind (Coop, Remer, Coop, Remer: the owner's two sheets,
//    alternated); TAP ONE and he shoots straight ahead up his own lane
//  - the hoop slides side to side in front of the stands; the ball takes a moment to get there, so you lead it
//  - each shooter needs his ball back before he can shoot again (RELOAD), and any two shots are at least GAP apart
//  - a SHOT CLOCK each round; reach the round's target or the game is over; then the hoop moves back (smaller, the lanes
//    closer together, the hoop faster, the ball longer in the air), ten rounds
//  - 2 a basket, 3 a swish; every third basket in a row = LIGHTNING BONUS (+5)
//  - the callouts are the movie's trash talk (src/data/shootoutLines.js: "FUCK YEA!" on a make, filth on a brick or an
//    airball; Settings → Clean chat tones them down)
//  - PSYCH-OUTS like the movie (src/data/psychOuts.js): in 2P the player who's waiting taps PSYCH OUT (2 a round), picks
//    a filthy line or types one; the line bursts on screen and the shooter's next shots wobble for a few seconds. Online the
//    rival psychs you from their phone ({ps} netField event). 1P: the crowd heckles you now and then.
// Art (src/data/baseketballSprites.js, the owner's kit): stadium (backdrop, its horizon on the hoop's floor line), court-logo
// (on the floor), shooter-p1/-p2, ball, backboard, pole, net, jumbotron (the score strip), logo, psych-burst; drawn stand-ins
// for any missing picture (the stadium is drawn like the movie's until the picture is in).
// Modes: 1P = a high-score run (solo 'levels'); 2P pass and play / board = each a run, higher score wins; online = both at
// once (netField {sc,rd,ov} + {ps} events).
const {clamp}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const {store}=require("src/state.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {voice,noise,makeShake}=require("src/engines/tarantinoKit.js");
const {isOnline}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");
const {soloProgress,soloFinish}=require("src/solo.js");
const BK=require("src/data/baseketballSprites.js");
const {PSYCH_SHOUTS,PSYCH_LINES,dealPsych,fillPsych}=require("src/data/psychOuts.js");
const {shootoutLine}=require("src/data/shootoutLines.js");

const ROUNDS=10,CLOCK=25,RELOAD=1.15,GAP=.42,LIGHT_N=3,LIGHT_BONUS=5,PSYCHS=2,SHAKEN=3.2;
const depthOf=n=>1/(1+.14*(n-1));                 // the hoop's size / lane spread, round n
const flightOf=n=>.78+.05*(n-1);                  // seconds from release to the rim
const periodOf=n=>Math.max(1.35,3.3-.2*(n-1));    // seconds for the hoop to go across and back
const targetOf=n=>18+5*(n-1);                     // points needed to clear round n
const LED='#ff3b2f',LED2='#ffb02f',DIGI='"Courier New",monospace',FONT='Impact,"Arial Black",sans-serif';
const HOME=['#1f3a8a','#c8102e'];   // Beers navy / red
// where the ball sits in each sheet's ready frame (1x template px; GPT's delivery note), the blank name bar's middle row
const HOLD={'shooter-p1':[160,70],'shooter-p2':[160,100]},NAME_Y=304;
const sheetOf=i=>i%2?'shooter-p2':'shooter-p1';

async function hoopJones(s){
 const [c,x]=s.canvas(720,1100,{fill:true});const fb=fullBleed(s,{bg:'#05081a'});s.body.classList.add('drag-arena-body');s.controls([]);
 BK.preloadBaseketball();
 const net=isOnline(s)?s.online:null,me=net?net.me:0,them=1-me,shake=makeShake(),clean=!!store.profile?.settings?.chatClean;
 let hi=0;try{hi=+localStorage.getItem('sc-shootout-hi')||+localStorage.getItem('sc-hoopjones-hi')||0;}catch{}
 let cur=null;const rival={sc:0,rd:1,ov:false};
 function newRun(who){return {who,round:1,score:0,rscore:0,clock:CLOCK,phase:'intro',introT:0,bph:0,t:0,streak:0,gap:0,balls:[],shooters:[0,1,2,3].map(i=>({i,reload:0,pose:'ready',poseT:0})),
  msg:'',sub:'',msgT:0,msgC:'#fff',pops:[],warned:false,over:false,shots:0,made:0,bolt:0,netT:9,backT:0,
  psychLeft:PSYCHS,shaken:0,psych:null,heckleT:6+Math.random()*8};}
 // ------------------------------------------------------------ layout (every frame)
 const L={};
 function layout(){const W=s.W,H=s.H,top=(fb.top||40)+4;L.W=W;L.H=H;
  L.hudY=top;L.hudH=clamp(Math.min(W*.16,H*.1),46,92);L.hudW=Math.min(W*.96,L.hudH*4.6);L.hudX=(W-L.hudW)/2;L.wallTop=L.hudY+L.hudH+6;
  // the four shooters along the bottom (bodies run off the screen); the floor line just behind their shoulders
  L.colW=W/4;L.shK=Math.min(L.colW*1.5/320,H*.3/300);L.frameW=320*L.shK;L.frameH=420*L.shK;
  L.shooterBase=H+L.frameH*.16;L.shTop=L.shooterBase-L.frameH;
  L.floorY=Math.min(H*.72,L.shTop+L.frameH*.42);
  const n=cur?cur.round:1,d=depthOf(n),dd=cur&&cur.backT>0&&n>1?d+(depthOf(n-1)-d)*cur.backT:d;L.depth=dd;
  const wallH=L.floorY-L.wallTop;L.rimR=Math.min(W*.095,wallH*.15)*dd;
  const hz=L.floorY-wallH*.18,hi0=L.wallTop+L.rimR*3.6/dd+8;L.horizon=hz;L.rimY=hz-(hz-hi0)*dd;
  L.poleFoot=L.floorY+(L.H-L.floorY)*.12*dd;
  L.ballR0=L.colW*.15;L.ballR1=L.rimR*.55;
  L.lane=i=>W/2+((i+.5)*L.colW-W/2)*.66*dd;L.shooterX=i=>(i+.5)*L.colW;L.handY=i=>L.shTop+HOLD[sheetOf(i)][1]*L.shK;
  L.amp=Math.abs(L.lane(3)-W/2)+L.rimR*1.2;}
 const basketX=(run,ph)=>{const n=run.round,f=Math.sin(ph)+(n>=5?.28*Math.sin(2.3*ph+1):0);return L.W/2+L.amp*f/(n>=5?1.28:1);};
 // the hoop's speed wobbles from round 4 (harder to read) and now and then reverses from round 8
 const phaseRate=run=>{const n=run.round,w=Math.PI*2/periodOf(n);return w*(n>=4?1+.3*Math.sin(run.t*.9):1)*(n>=8&&Math.sin(run.t*.45)>.8?-1:1);};
 // ------------------------------------------------------------ shooting
 function shoot(run,i){if(!run||run.phase!=='play'||run.over)return false;const sh=run.shooters[i];if(sh.reload>0||run.gap>0)return false;
  sh.reload=RELOAD;sh.pose='shoot';sh.poseT=0;run.gap=GAP;run.shots++;
  // psyched out: the hands shake, the ball goes off line
  const wob=run.shaken>0?(Math.random()-.5)*2*L.rimR*(1.2+Math.random()*1.2):0;
  run.balls.push({i,u:0,tf:flightOf(run.round),t:0,state:'fly',x0:L.shooterX(i),y0:L.handY(i),off:wob});
  voice(160,.08,.06,'sine',{slide:.6});noise(.05,.03,{type:'highpass',f0:3000});return true;}
 const laneOf=(b)=>L.lane(b.i)+b.off;
 function judge(run,b){const bx=basketX(run,run.bph),dx=Math.abs(laneOf(b)-bx),tol=L.rimR-L.ballR1*.55,sw=Math.max(1,(L.rimR-L.ballR1)*.45),rim=L.rimR+L.ballR1*.6,board=L.rimR*2.7;
  if(dx<=sw)return 'swish';if(dx<=tol)return 'make';if(dx<=rim)return (dx-tol)/(rim-tol)<.45?'rimin':'rimout';if(dx<=board)return 'brick';return 'air';}
 const nameOf=run=>s.players[run.who]?.name||'Rookie';
 function result(run,b,res){b.res=res;const made=res==='swish'||res==='make'||res==='rimin',sh=run.shooters[b.i];
  if(made){run.streak++;run.made++;let pts=res==='swish'?3:2;
   if(run.streak%LIGHT_N===0){pts+=LIGHT_BONUS;run.bolt=1.2;say(run,shootoutLine('LIGHTNING',nameOf(run),{clean}),`+${LIGHT_BONUS} lightning bonus`,'#57e1ff',1.5);thunder();}
   else say(run,shootoutLine(res==='swish'?'SWISH':'MAKE',nameOf(run),{clean}),'','#7dff8a',.9);
   run.score+=pts;run.rscore+=pts;run.netT=0;run.pops.push({x:basketX(run,run.bph),y:L.rimY-L.rimR*1.8,t:1,text:'+'+pts});sh.pose='cheer';sh.poseT=0;
   swish(res);vibrate(12);s.react?.(run.who,'happy',1);}
  else{run.streak=0;sh.pose='slump';sh.poseT=0;
   say(run,shootoutLine(res==='brick'?'BRICK':res==='air'?'AIRBALL':'RIMOUT',nameOf(run),{clean}),'','#ff6a4a',1.1);if(res==='brick')thud();else if(res==='rimout')clank();else voice(220,.3,.04,'sine',{slide:.5});
   s.react?.(run.who,'sad',1);}
  b.state=made?'in':res==='brick'?'brick':res==='rimout'?'rimout':'air';b.t=0;}
 function swish(res){noise(.25,.05,{type:'highpass',f0:3500,f1:1500});if(res==='rimin')clank();noise(.6,.03,{type:'bandpass',f0:900,f1:1300,q:.8,attack:.1,delay:.1});}
 function clank(){voice(1100,.06,.05,'square',{lp:3000});voice(820,.1,.04,'triangle',{delay:.05});}
 function thud(){noise(.12,.06,{f0:400});voice(110,.12,.06,'sine');}
 function thunder(){noise(.9,.1,{f0:900,f1:120});[523,659,784,1047].forEach((f,i)=>voice(f,.1,.05,'sawtooth',{delay:i*.06,lp:2500}));}
 function buzzer(){voice(130,.9,.08,'sawtooth',{lp:900});voice(134,.9,.06,'square',{lp:700});}
 function say(run,t,sub,col,sec){run.msg=t;run.sub=sub;run.msgC=col;run.msgT=sec;}
 // ------------------------------------------------------------ psych-outs
 // by = who threw it (player index, or -1 = the crowd)
 function applyPsych(run,text,by){if(!run||run.phase!=='play'||run.shaken>0)return false;run.shaken=SHAKEN;run.psych={text:String(text).slice(0,80),by,t:SHAKEN};
  shake.kick(10);noise(.5,.14,{type:'bandpass',f0:420,f1:900,q:2.5});voice(160,.5,.06,'sawtooth',{slide:.6});vibrate([30,40,30]);if(by>=0)s.react?.(by,'happy',2);s.react?.(run.who,'sad',2);return true;}
 // who may psych the run on this phone right now: 2P pass-and-play = the player who's waiting; online = this phone psychs the rival
 const psycher=()=>net?me:s.solo?-1:cur?1-cur.who:-1;
 let sentPsych=0,sentRound=0;
 const canPsych=()=>{if(!cur||cur.over)return false;if(net){if(rival.ov)return false;if(rival.rd!==sentRound){sentRound=rival.rd;sentPsych=0;}return sentPsych<PSYCHS;}
  return !s.solo&&cur.phase==='play'&&cur.psychLeft>0&&cur.shaken<=0;};
 let sheetEl=null,btnEl=null,dealt=[],btnKey='';
 function psychButton(){if(s.solo)return;btnEl=document.createElement('button');btnEl.type='button';btnEl.className='bk-psych';
  Object.assign(btnEl.style,{position:'absolute',zIndex:6,padding:'9px 12px',borderRadius:'14px',border:'2px solid #ff7ac0',background:'rgba(60,8,36,.9)',color:'#fff',font:'900 14px Impact,"Arial Black",sans-serif',letterSpacing:'.5px',boxShadow:'0 4px 14px rgba(0,0,0,.5)',display:'none'});
  s.on(btnEl,'pointerdown',e=>e.stopPropagation());s.on(btnEl,'click',e=>{e.preventDefault();e.stopPropagation();openSheet();});
  (c.parentElement||s.body).appendChild(btnEl);s.cleanup(()=>{btnEl?.remove();sheetEl?.remove();});}
 function placeButton(){if(!btnEl)return;const show=canPsych()&&!sheetEl,left=net?PSYCHS-sentPsych:cur?.psychLeft||0;const r=show?c.getBoundingClientRect():null,pr=show?(c.parentElement||s.body).getBoundingClientRect():null;
  const key=show?[psycher(),left,Math.round(r.left-pr.left),Math.round(r.top-pr.top),Math.round(L.hudY+L.hudH)].join('|'):'hide';if(key===btnKey)return;btnKey=key;btnEl.style.display=show?'block':'none';if(!show)return;
  const target=net?s.players[them]?.name:s.players[cur.who]?.name;btnEl.textContent=`🤬 PSYCH OUT ${(target||'').toUpperCase()} (${left})`;
  btnEl.style.left=(r.left-pr.left+10)+'px';btnEl.style.top=(r.top-pr.top+L.hudY+L.hudH+24)+'px';}
 function openSheet(){if(sheetEl||!canPsych())return;dealt=dealPsych(Math.random,6,dealt);const host=c.parentElement||s.body,r=c.getBoundingClientRect(),pr=host.getBoundingClientRect();
  const nm=(net?s.players[them]?.name:s.players[cur.who]?.name)||'Rookie';
  sheetEl=document.createElement('div');Object.assign(sheetEl.style,{position:'absolute',zIndex:7,left:(r.left-pr.left+8)+'px',top:(r.top-pr.top+L.hudY+L.hudH+8)+'px',width:Math.min(r.width-16,520)+'px',maxHeight:(r.height*.55)+'px',overflow:'auto',
   background:'rgba(18,10,24,.96)',border:'2px solid #ff7ac0',borderRadius:'16px',padding:'10px',boxShadow:'0 8px 30px rgba(0,0,0,.6)',color:'#fff',font:'700 14px system-ui,sans-serif'});
  sheetEl.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font:900 16px Impact,'Arial Black',sans-serif;color:#ff7ac0">PSYCH OUT ${nm.toUpperCase().replace(/</g,'&lt;')}</b><span><button data-r type=button style="margin-right:6px">🎲</button><button data-x type=button>✕</button></span></div>`+
   dealt.map((l,i)=>`<button data-i="${i}" type=button style="display:block;width:100%;text-align:left;margin:4px 0;padding:9px 10px;border-radius:10px;border:1px solid #5a2a46;background:#2a1430;color:#fff;font:700 14px system-ui,sans-serif">${fillPsych(l,nm).replace(/</g,'&lt;')}</button>`).join('')+
   `<form style="display:flex;gap:6px;margin-top:6px"><input maxlength=70 placeholder="Type your own…" style="flex:1;padding:9px;border-radius:10px;border:1px solid #5a2a46;background:#120a18;color:#fff;font:700 14px system-ui"><button type=submit style="padding:9px 12px;border-radius:10px;border:0;background:#ff7ac0;color:#1a0610;font:900 14px system-ui">SEND</button></form>`;
  sheetEl.querySelectorAll('button[data-i]').forEach(b=>s.on(b,'click',e=>{e.preventDefault();sendPsych(fillPsych(dealt[+b.dataset.i],nm));}));
  s.on(sheetEl.querySelector('[data-x]'),'click',e=>{e.preventDefault();closeSheet();});s.on(sheetEl.querySelector('[data-r]'),'click',e=>{e.preventDefault();closeSheet();openSheet();});
  s.on(sheetEl.querySelector('form'),'submit',e=>{e.preventDefault();const v=sheetEl.querySelector('input').value.trim();if(v)sendPsych(v.slice(0,70));});
  s.on(sheetEl,'pointerdown',e=>e.stopPropagation());s.on(sheetEl,'keydown',e=>e.stopPropagation());host.appendChild(sheetEl);}
 function closeSheet(){sheetEl?.remove();sheetEl=null;}
 function sendPsych(text){closeSheet();if(net){if(!canPsych())return;sentPsych++;nf.event({ps:String(text).slice(0,70)});return;}if(applyPsych(cur,text,psycher()))cur.psychLeft--;}
 // ------------------------------------------------------------ stepping
 function step(run,dt){
  run.t+=dt;run.msgT=Math.max(0,run.msgT-dt);run.bolt=Math.max(0,run.bolt-dt);run.netT+=dt;run.backT=Math.max(0,run.backT-dt/1.2);run.shaken=Math.max(0,run.shaken-dt);if(run.psych){run.psych.t-=dt;if(run.psych.t<=0)run.psych=null;}
  for(const p of run.pops)p.t-=dt;run.pops=run.pops.filter(p=>p.t>0);
  for(const sh of run.shooters){sh.reload=Math.max(0,sh.reload-dt);sh.poseT+=dt;if(sh.pose!=='ready'&&sh.poseT>.55&&sh.reload<=0)sh.pose='ready';}
  run.gap=Math.max(0,run.gap-dt);
  if(run.phase==='intro'){run.introT+=dt;run.bph+=dt*phaseRate(run)*.6;if(run.introT>2.4){run.phase='play';buzzer();}return;}
  if(run.phase==='clear'){run.introT+=dt;run.bph+=dt*phaseRate(run)*.6;stepBalls(run,dt);
   if(run.introT>2.6){run.round++;run.rscore=0;run.clock=CLOCK;run.warned=false;run.phase='intro';run.introT=0;run.backT=1;run.psychLeft=PSYCHS;run.heckleT=5+Math.random()*10;}return;}
  if(run.phase!=='play')return stepBalls(run,dt);
  run.bph+=dt*phaseRate(run);run.clock-=dt;
  // 1P: the crowd heckles now and then (a psych-out with no button)
  if(s.solo&&!net){run.heckleT-=dt;if(run.heckleT<=0&&run.clock>4){run.heckleT=9+Math.random()*9;const pool=Math.random()<.5?PSYCH_SHOUTS:PSYCH_LINES;applyPsych(run,'THE CROWD: '+fillPsych(pool[Math.floor(Math.random()*pool.length)],nameOf(run)),-1);}}
  if(!run.warned&&run.clock<=6&&run.rscore<targetOf(run.round)){run.warned=true;say(run,'BACK IT UP!','time is running out','#ffd23f',1.4);voice(300,.2,.06,'square',{lp:1500});voice(300,.2,.06,'square',{lp:1500,delay:.28});}
  stepBalls(run,dt);
  if(run.clock<=0){run.clock=0;if(run.balls.some(b=>b.state==='fly'))return;buzzer();
   if(run.rscore>=targetOf(run.round)){if(run.round>=ROUNDS){finishRun(run,true);return;}run.phase='clear';run.introT=0;say(run,`ROUND ${run.round} CLEARED`,'the hoop moves back','#7dff8a',2.2);
    if(s.solo&&!net)soloProgress(s,run.score,run.round,`Round ${run.round+1}`);[523,659,784,1047].forEach((f,i)=>voice(f,.12,.05,'triangle',{delay:i*.09}));}
   else finishRun(run,false);}}
 function stepBalls(run,dt){
  for(const b of run.balls){b.t+=dt;if(b.state==='fly'){b.u=b.t/b.tf;if(b.u>=1){b.u=1;result(run,b,judge(run,b));}}else if(b.t>1.2)b.dead=true;}
  run.balls=run.balls.filter(b=>!b.dead);}
 function finishRun(run,won){run.over=true;run.phase='over';closeSheet();if(run.score>hi&&!net){hi=run.score;try{localStorage.setItem('sc-shootout-hi',String(hi));}catch{}}
  say(run,won?'YOU BEAT THE SHOOTOUT!':'GAME OVER',`${run.score} points`,won?'#7dff8a':'#ff5a4a',3);if(run.onEnd)run.onEnd(won);}
 // ------------------------------------------------------------ drawing
 let stad=null;
 // the stadium behind the hoop: the owner's picture with its horizon row on the floor line, or the drawn one (cached)
 function stadium(){const W=L.W,H=L.H,pic=BK.picture('stadium'),key=[W,H,Math.round(L.floorY),pic?1:0].join('|');if(stad&&stad.key===key)return stad.cv;
  const cv=document.createElement('canvas');cv.width=Math.max(1,Math.ceil(W));cv.height=Math.max(1,Math.ceil(H));const g=cv.getContext('2d');
  if(pic){const def=BK.PICTURES.stadium,hzPx=def.horizon*pic.height/def.size[1],k=Math.max(L.floorY/hzPx,W/pic.width,H/pic.height*.9),w=pic.width*k,h=pic.height*k,y=L.floorY-hzPx*k;
   g.fillStyle='#05081a';g.fillRect(0,0,W,H);g.drawImage(pic,(W-w)/2,y,w,h);if(y+h<H){g.fillStyle='#2e6b2f';g.fillRect(0,y+h,W,H-y-h);}}
  else drawStadium(g,W,H,L.floorY);
  // the Beers' logo painted on the court
  const logo=BK.picture('court-logo'),lw=Math.min(W*.5,(H-L.floorY)*1.6),lh=lw*.32,ly=L.floorY+(H-L.floorY)*.3;
  g.save();g.globalAlpha=.85;if(logo)g.drawImage(logo,W/2-lw/2,ly-lh/2,lw,lh);else{g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=3;g.beginPath();g.ellipse(W/2,ly,lw/2,lh/2,0,0,7);g.stroke();}g.restore();
  stad={key,cv};return cv;}
 function drawStadium(g,W,H,hz){
  const sky=g.createLinearGradient(0,0,0,hz);sky.addColorStop(0,'#03061a');sky.addColorStop(1,'#16254d');g.fillStyle=sky;g.fillRect(0,0,W,hz+2);
  for(let i=0;i<60;i++){g.fillStyle=`rgba(255,255,255,${.2+(i%5)*.12})`;g.fillRect((i*137.5)%W,(i*61.7)%(hz*.25),1.5,1.5);}
  const span=hz*.82,deckTop=hz-span,deck2=hz-span*.5,wallTop=hz-span*.16;
  for(const fx0 of [.06,.3,.7,.94]){const tx=W*fx0,ty=deckTop-span*.08;g.fillStyle='#1b2236';g.fillRect(tx-3,ty,6,deckTop-ty+20);
   const gl=g.createRadialGradient(tx,ty,2,tx,ty,span*.2);gl.addColorStop(0,'rgba(255,250,220,.75)');gl.addColorStop(1,'rgba(255,250,220,0)');g.fillStyle=gl;g.beginPath();g.arc(tx,ty,span*.2,0,7);g.fill();
   g.fillStyle='#fffbe0';for(let r=0;r<3;r++)for(let q=0;q<5;q++)g.fillRect(tx-span*.04+q*span*.017,ty-span*.035+r*span*.016,span*.012,span*.01);}
  const deck=(y0,y1,base)=>{g.fillStyle=base;g.fillRect(0,y0,W,y1-y0);const rows=Math.max(4,Math.round((y1-y0)/5));
   for(let r=0;r<rows;r++){const yy=y0+(r+.5)*(y1-y0)/rows,step=4+r*.25;for(let xx=(r%2)*2;xx<W;xx+=step){const k=Math.abs((Math.sin(xx*12.9898+yy*78.233)*43758.5)%1);
     g.fillStyle=k<.25?HOME[0]:k<.38?HOME[1]:k<.5?'#e8e8e8':k<.62?'#7a4a32':k<.72?'#d8a07a':k<.8?'#ffd23f':'#2a2a3a';g.fillRect(xx,yy-1.5,2.4,3);}}
   g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,y1-3,W,3);};
  deck(deckTop,deck2-6,'#22283c');g.fillStyle='#39405a';g.fillRect(0,deck2-6,W,6);deck(deck2,wallTop,'#2a3046');
  g.fillStyle=HOME[0];g.fillRect(0,wallTop,W,hz-wallTop);
  const ADS=['FIGHT MILK','BRAWNDO','MILWAUKEE BEERS','RUM HAM','PSYCH!','DENTAL DAMS R US'],pw=W/ADS.length;
  ADS.forEach((a,i)=>{const px=i*pw+3;g.fillStyle=i%2?HOME[1]:'#f4f1e6';g.fillRect(px,wallTop+3,pw-6,hz-wallTop-6);g.fillStyle=i%2?'#ffffff':HOME[0];g.font=`900 ${Math.max(6,Math.min(pw*.13,(hz-wallTop)*.5))}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText(a,px+(pw-6)/2,(wallTop+hz)/2);});
  const fl=g.createLinearGradient(0,hz,0,H);fl.addColorStop(0,'#3f8a3c');fl.addColorStop(1,'#2a6a2a');g.fillStyle=fl;g.fillRect(0,hz,W,H-hz);
  g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=3;g.beginPath();g.ellipse(W/2,hz,W*.42,(H-hz)*.55,0,0,Math.PI);g.stroke();}
 function drawHoop(run,front){const bx=basketX(run,run.bph),r=L.rimR,ry=L.rimY,bw=r*2*2.65,bh=bw*420/600,img=BK.picture('backboard'),def=BK.PICTURES.backboard;
  if(!front){const pole=BK.picture('pole'),pw=bw*.12,ph=L.poleFoot-(ry+r*.2);x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(bx,L.poleFoot,pw*1.4,pw*.4,0,0,7);x.fill();
   if(pole)x.drawImage(pole,bx-pw/2,ry+r*.2,pw,ph);else{x.fillStyle=HOME[0];x.fillRect(bx-pw/2,ry+r*.2,pw,ph);}
   const bxl=bx-bw/2,byt=ry-bh*(def.rim[1]/def.size[1]);
   if(img)x.drawImage(img,bxl,byt,bw,bh);else{x.fillStyle='rgba(240,240,240,.92)';x.fillRect(bxl,byt,bw,bh);x.strokeStyle='#d62a2a';x.lineWidth=Math.max(2,bw*.025);x.strokeRect(bxl,byt,bw,bh);x.strokeRect(bx-bw*.17,ry-bh*.42,bw*.34,bh*.34);}
   x.strokeStyle='#e8571a';x.lineWidth=Math.max(2,r*.13);x.beginPath();x.ellipse(bx,ry,r,r*.28,0,Math.PI,Math.PI*2);x.stroke();return;}
  const net=BK.sheet('net');
  if(net){const d=net.def,swishing=run.netT<.45,f=swishing?Math.min(2,Math.floor(run.netT/.15)):0,fr=BK.frameRect(net,swishing?'swish':'rest',f),k=(2*r)/(d.rim[1]-d.rim[0]),w=d.frame[0]*k,h=d.frame[1]*k;
   x.drawImage(net.img,fr.sx,fr.sy,fr.sw,fr.sh,bx-(d.rim[0]+(d.rim[1]-d.rim[0])/2)*k,ry,w,h);}
  else{x.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=Math.max(1,r*.05);const sw=run.netT<.45?Math.sin(run.netT*30)*r*.15:0;for(let k=0;k<=8;k++){x.beginPath();x.moveTo(bx-r+2*r*k/8,ry);x.lineTo(bx-r*.55+1.1*r*k/8+sw,ry+r*1.5);x.stroke();}}
  x.strokeStyle='#ff6a1f';x.lineWidth=Math.max(2,r*.15);x.beginPath();x.ellipse(bx,ry,r,r*.28,0,0,Math.PI);x.stroke();}
 function ballPic(px,py,pr,rot){const img=BK.picture('ball');x.save();x.translate(px,py);x.rotate(rot);if(img)x.drawImage(img,-pr,-pr,pr*2,pr*2);else{x.fillStyle='#f4f1e6';x.beginPath();x.arc(0,0,pr,0,7);x.fill();x.strokeStyle='#c8102e';x.lineWidth=Math.max(1,pr*.08);x.beginPath();x.arc(-pr*.9,0,pr*.7,-1,1);x.arc(pr*.9,0,pr*.7,Math.PI-1,Math.PI+1);x.stroke();}x.restore();}
 function ballPos(run,b){const xe=laneOf(b),ye=L.rimY-L.ballR1*.3,arc=(b.y0-L.rimY)*.55+L.rimR*2.5;
  if(b.state==='fly'){const u=b.u;return {x:b.x0+(xe-b.x0)*u,y:b.y0+(ye-b.y0)*u-arc*Math.sin(Math.PI*u),r:L.ballR0+(L.ballR1-L.ballR0)*Math.pow(u,.7),behind:u>.6};}
  const t=b.t,bx=basketX(run,run.bph);
  if(b.state==='in')return {x:bx+(xe-bx)*Math.max(0,1-t*4),y:ye+t*L.rimR*5,r:L.ballR1,behind:true,fade:t>.4};
  if(b.state==='brick')return {x:xe+(xe<bx?-1:1)*t*L.rimR*1.5,y:ye-L.rimR*.5+t*t*L.H*.9-t*L.rimR*2,r:L.ballR1*(1+t*.6),behind:false};
  if(b.state==='rimout')return {x:xe+(xe<bx?-1:1)*t*L.rimR*3,y:ye-t*L.rimR*2+t*t*L.H*.8,r:L.ballR1*(1+t*.5),behind:false};
  return {x:xe,y:ye+t*t*L.H*.7+t*L.rimR,r:L.ballR1*(1+t*.3),behind:t<.3};}
 function drawShooters(run){
  for(const p of run.shooters){const name=sheetOf(p.i),sh=BK.sheet(name),cx=L.shooterX(p.i),ready=p.reload<=0,row=p.pose,
   f=row==='shoot'?Math.min(3,Math.floor(p.poseT/.09)):row==='ready'?Math.floor((run.t*1.6+p.i*.4)%2):Math.floor(p.poseT*5)%2;
   const wob=run.shaken>0?Math.sin(run.t*48+p.i*2)*L.frameW*.025:0,top=L.shTop,left=cx-L.frameW/2+wob;
   x.save();if(!ready&&p.pose==='ready')x.globalAlpha=.75;
   if(sh){const fr=BK.frameRect(sh,row,f);x.drawImage(sh.img,fr.sx,fr.sy,fr.sw,fr.sh,left,top,L.frameW,L.frameH);}
   else{x.fillStyle='#f2f2f2';x.beginPath();x.roundRect(left+L.frameW*.12,top+L.frameH*.4,L.frameW*.76,L.frameH*.7,L.frameW*.2);x.fill();x.fillStyle=p.i%2?'#3a2414':'#b8863a';x.beginPath();x.ellipse(cx,top+L.frameH*.32,L.frameW*.17,L.frameW*.2,0,0,7);x.fill();
    x.strokeStyle='#d8a07a';x.lineWidth=L.frameW*.08;x.lineCap='round';const ay=row==='shoot'?top+L.frameH*.05:top+L.frameH*.2;x.beginPath();x.moveTo(cx-L.frameW*.3,top+L.frameH*.45);x.lineTo(cx-L.frameW*.12,ay);x.moveTo(cx+L.frameW*.3,top+L.frameH*.45);x.lineTo(cx+L.frameW*.12,ay);x.stroke();}
   x.restore();
   if(ready&&p.pose==='ready'){const [hx,hy]=HOLD[name];ballPic(left+hx*L.shK,top+hy*L.shK,44*L.shK,0);}
   const nm=(s.players[run.who]?.name||'').toUpperCase().slice(0,9);if(nm){x.font=`900 ${Math.max(8,L.frameW*.07)}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillStyle='rgba(20,30,70,.85)';x.fillText(nm,cx+wob,top+NAME_Y*L.shK);}
   if(!ready){const k=1-p.reload/RELOAD;x.strokeStyle='rgba(255,210,63,.85)';x.lineWidth=3;x.beginPath();x.arc(cx,L.H-18,10,-Math.PI/2,-Math.PI/2+k*Math.PI*2);x.stroke();}}}
 function drawHud(run){const {hudX:X,hudY:Y,hudW:Wd,hudH:Hh}=L,img=BK.picture('jumbotron'),def=BK.PICTURES.jumbotron;let sx=X,sy=Y,sw=Wd,sh=Hh;
  if(img){x.drawImage(img,X,Y,Wd,Hh);const [a,b,c2,d]=def.screen;sx=X+a/def.size[0]*Wd;sy=Y+b/def.size[1]*Hh;sw=c2/def.size[0]*Wd;sh=d/def.size[1]*Hh;}
  else{x.fillStyle='#0b0b12';x.fillRect(X,Y,Wd,Hh);x.strokeStyle='#c7ccd8';x.lineWidth=3;x.strokeRect(X,Y,Wd,Hh);sx=X+6;sy=Y+6;sw=Wd-12;sh=Hh-12;}
  x.fillStyle='#000';x.fillRect(sx,sy,sw,sh);
  const cells=[['ROUND',String(run.round)],[run.streak>=2?'⚡ SCORE':'SCORE',String(run.score)],['SHOT CLOCK',String(Math.ceil(Math.max(0,run.clock))).padStart(2,'0')],[net?(s.players[them]?.name||'RIVAL').toUpperCase().slice(0,8):'HI SCORE',String(net?rival.sc:Math.max(hi,run.score))]];
  const cw=sw/4;cells.forEach(([lab,val],i)=>{const cx=sx+cw*(i+.5);x.textAlign='center';x.textBaseline='middle';x.font=`700 ${Math.max(7,sh*.2)}px ${DIGI}`;x.fillStyle='#ffffff';x.fillText(lab,cx,sy+sh*.2);
   x.font=`900 ${Math.max(10,sh*.5)}px ${DIGI}`;x.fillStyle=i===2&&run.clock<=6?LED:i===1&&run.streak>=2?'#57e1ff':LED2;x.fillText(val,cx,sy+sh*.62);});
  const need=Math.max(0,targetOf(run.round)-run.rscore);x.font=`800 ${clamp(L.W*.03,10,15)}px Arial,sans-serif`;x.fillStyle=need?'#fff':'#7dff8a';x.textAlign='center';x.lineWidth=3;x.strokeStyle='rgba(0,0,0,.6)';
  const nt=need?`${need} more to clear round ${run.round}`:'Round target made!';x.strokeText(nt,L.W/2,Y+Hh+12);x.fillText(nt,L.W/2,Y+Hh+12);}
 function bigText(t,cy,sz,col,a=1,maxW=L.W*.94){x.save();x.globalAlpha=a;x.font=`900 ${sz}px ${FONT}`;const w=x.measureText(t).width;if(w>maxW){sz*=maxW/w;x.font=`900 ${sz}px ${FONT}`;}
  x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=sz*.18;x.strokeStyle='#0a0612';x.strokeText(t,L.W/2,cy);x.fillStyle=col;x.fillText(t,L.W/2,cy);x.restore();return sz;}
 function drawPsych(run){const P=run.psych;if(!P)return;const a=clamp(P.t*2,0,1)*clamp((SHAKEN-P.t)*5,0,1),W=L.W,img=BK.picture('psych-burst');x.save();x.globalAlpha=a;
  const bw=Math.min(W*.94,560,L.H*.4/.42),bh=bw*.42,bx=W/2-bw/2,by=L.wallTop+(L.floorY-L.wallTop)*.12,wob=Math.sin(run.t*22)*.025;x.translate(W/2,by+bh/2);x.rotate(wob);x.translate(-W/2,-(by+bh/2));
  if(img)x.drawImage(img,bx-bw*.05,by-bh*.1,bw*1.1,bh*1.2);else{x.fillStyle='#ff3fa4';x.beginPath();for(let i=0;i<22;i++){const ang=i/22*Math.PI*2,r=(i%2?.42:.56);x.lineTo(W/2+Math.cos(ang)*bw*r,by+bh/2+Math.sin(ang)*bh*r*1.05);}x.closePath();x.fill();}
  const fw=bh*.62,hasFace=P.by>=0;if(hasFace)try{s.sprite(x,P.by,bx+fw*.62,by+bh*.5,fw,{exact:true,noBadge:true,still:true,mood:'win'});}catch{}
  const tx=hasFace?bx+fw*1.25:bx+bw*.1,tw=hasFace?bw-fw*1.4:bw*.8;let fs=clamp(bh*.2,12,28);x.font=`900 ${fs}px ${FONT}`;const words=P.text.split(' '),lines=[];let ln='';
  for(const wd of words){const tr=ln?ln+' '+wd:wd;if(x.measureText(tr).width>tw&&ln){lines.push(ln);ln=wd;}else ln=tr;}if(ln)lines.push(ln);while(lines.length*fs*1.1>bh*.8&&fs>9)fs*=.9;
  x.font=`900 ${fs}px ${FONT}`;x.fillStyle='#fff';x.strokeStyle='#1a0610';x.lineWidth=fs*.18;x.textAlign='left';x.textBaseline='middle';
  lines.slice(0,5).forEach((l,i)=>{const yy=by+bh/2+(i-(Math.min(5,lines.length)-1)/2)*fs*1.1;x.strokeText(l,tx,yy);x.fillText(l,tx,yy);});x.restore();}
 function draw(run){layout();x.setTransform(1,0,0,1,0,0);x.save();if(shake.mag>.3)shake.apply(x);x.drawImage(stadium(),0,0);
  drawHoop(run,false);
  const bp=run.balls.map(b=>({b,p:ballPos(run,b)}));
  for(const {b,p} of bp)if(p.behind&&!p.fade)ballPic(p.x,p.y,p.r,b.t*8);
  drawHoop(run,true);
  for(const {b,p} of bp)if(!p.behind)ballPic(p.x,p.y,p.r,b.t*8);
  if(run.bolt>0){x.save();x.globalAlpha=.5+.5*Math.sin(run.t*40);x.strokeStyle='#bff6ff';x.lineWidth=3;for(let k=0;k<3;k++){let px=L.W*(.2+.3*k),py=L.wallTop;x.beginPath();x.moveTo(px,py);while(py<L.floorY){px+=Math.sin(run.t*13+k*7+py)*.5*L.W*.06;py+=L.H*.05;x.lineTo(px,py);}x.stroke();}x.restore();}
  drawShooters(run);x.restore();
  for(const p of run.pops){x.font=`900 ${clamp(L.W*.06,16,34)}px ${FONT}`;x.textAlign='center';x.fillStyle=`rgba(255,240,140,${clamp(p.t*1.5,0,1)})`;x.fillText(p.text,p.x,p.y-(1-p.t)*30);}
  drawHud(run);drawPsych(run);
  if(run.msgT>0){const a=clamp(run.msgT*3,0,1),cy=L.wallTop+(L.floorY-L.wallTop)*.62,sz=bigText(run.msg,cy,clamp(Math.min(L.W*.1,L.H*.085),20,60),run.msgC,a);if(run.sub)bigText(run.sub,cy+sz*.85,sz*.38,'#fff',a);}
  if(run.phase==='intro'){const a=clamp(Math.min(run.introT*3,(2.4-run.introT)*3),0,1);let y=L.wallTop+(L.floorY-L.wallTop)*.25;
   const wallH=L.floorY-L.wallTop,logo=BK.picture('logo');y=L.wallTop+wallH*.12;if(logo&&run.round===1){x.save();x.globalAlpha=a;const w=Math.min(L.W*.86,520,wallH*1.25),h=w*logo.height/logo.width;x.drawImage(logo,(L.W-w)/2,y,w,h);x.restore();y+=h;}
   const sz=bigText(`ROUND ${run.round}`,y+Math.min(24,wallH*.08),clamp(Math.min(L.W*.11,wallH*.16),18,64),'#ffd23f',a);y-=24-Math.min(24,wallH*.08);bigText(`${targetOf(run.round)} points in ${CLOCK} seconds`,y+24+sz*.9,sz*.42,'#fff',a);
   if(run.round>1)bigText('THE HOOP MOVES BACK',y+24+sz*1.5,sz*.36,'#57e1ff',a);else bigText('TAP A SHOOTER TO SHOOT · LEAD THE HOOP',y+24+sz*1.5,sz*.34,'#fff',a);}
  s.debug.run=run;}
 // ------------------------------------------------------------ input: tap a shooter (his column, below the score strip)
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur)return;ev.preventDefault();const p=s.pointer(ev);if(p.y<L.hudY+L.hudH)return;const i=clamp(Math.floor(p.x/L.colW),0,3);shoot(cur,i);});
 s.on(document,'keydown',ev=>{if(!cur||sheetEl)return;const i={'1':0,'2':1,'3':2,'4':3,a:0,s:1,d:2,f:3,A:0,S:1,D:2,F:3}[ev.key];if(i===undefined)return;ev.preventDefault();shoot(cur,i);});
 s.hint('BASEketball Shootout: four shooters, unlimited balls. Tap a shooter to shoot straight up his lane; the hoop slides side to side, so shoot before it gets to his lane: the ball takes a moment to get there. Each shooter waits for his ball to come back, and you can\'t fire two shots at once. Reach the round\'s target before the shot clock runs out; then the hoop moves back. Every third basket in a row = lightning bonus. In 2P the player who is waiting can PSYCH OUT the shooter (2 a round): their next shots wobble. Keys 1-4.');
 // autopilot (tests): shoot with whoever's lane the hoop will be over when the ball gets there
 let botOn=false;
 function botStep(run){if(!botOn||!run||run.phase!=='play')return;const tf=flightOf(run.round),bx=basketX(run,run.bph+phaseRate(run)*tf);
  for(let i=0;i<4;i++){if(Math.abs(L.lane(i)-bx)<L.rimR*.55&&Math.random()<.5){shoot(run,i);return;}}
  if(net&&canPsych()&&Math.random()<.004)sendPsych(fillPsych(PSYCH_SHOUTS[Math.floor(Math.random()*PSYCH_SHOUTS.length)],s.players[them]?.name));}
 s.debug={engine:'shootout',get run(){return cur;},set run(v){},shoot:i=>shoot(cur,i),get bot(){return ()=>{if(!botOn){botOn=true;return 'drive';}return '';};},
  psych:t=>{if(applyPsych(cur,t||'TEST PSYCH',psycher()))cur.psychLeft--;},skipRound(){if(cur){cur.rscore=targetOf(cur.round);cur.clock=.01;}},
  state(){return cur&&{round:cur.round,score:cur.score,phase:cur.phase,clock:cur.clock,shots:cur.shots,made:cur.made,over:cur.over,shaken:cur.shaken>0,psychLeft:cur.psychLeft,depth:L.depth};}};
 // ------------------------------------------------------------ online: both at once, psych-outs as events
 let nf=null;
 if(net)nf=netField(s,{hz:6,pack:()=>({sc:cur?cur.score:0,rd:cur?cur.round:1,ov:cur&&cur.over?1:0}),unpack:(i,d)=>{if(!d)return;rival.sc=d.sc|0;rival.rd=d.rd|0;rival.ov=!!d.ov;},
  onEvent:e=>{if(e&&typeof e.ps==='string'&&cur)applyPsych(cur,e.ps.slice(0,80),them);}});
 psychButton();
 // ------------------------------------------------------------ the runs
 const intro=who=>`BASEKETBALL SHOOTOUT${s.players.length>1&&!s.solo&&!net?' · '+s.players[who].name:''}. Four shooters, unlimited balls: tap a shooter to shoot up his lane. The hoop slides side to side and the ball takes a moment to get there, so lead it. Each shooter waits for his ball to come back. Make the round's target before the shot clock runs out; every round the hoop moves back. Every third basket in a row = lightning bonus.${s.solo?' The crowd heckles.':net?' Psych out '+s.players[them].name+' from your phone.':' '+s.players[1-who].name+': you get 2 PSYCH OUTS a round.'}`;
 async function play(who,label){cur=newRun(who);layout();
  if(!await s.pass(net?me:who,intro(who),label||'Shoot'))return null;if(net)await nf.start('go');
  return await new Promise(res=>{cur.onEnd=won=>{setTimeout(()=>res({score:cur.score,round:cur.round,won}),2600);};});}
 s.frame(dt=>{if(!s.alive)return;if(nf)nf.tick(dt);shake.step(dt);if(!cur){x.fillStyle='#05081a';x.fillRect(0,0,s.W,s.H);return;}
  step(cur,dt);botStep(cur);placeButton();
  if(net){const sc=[0,0];sc[me]=cur.score;sc[them]=rival.sc;s.setScores(sc);}else if(s.solo)s.setScores([cur.score,0]);
  draw(cur);});
 if(net){const r=await play(me);if(!r)return;nf.push();nf.finish({score:r.score});const v=await nf.remoteDone();if(!s.alive)return;
  const sc=[0,0];sc[me]=r.score;sc[them]=v&&typeof v.score==='number'?v.score|0:rival.sc;s.setScores(sc);
  s.finish(sc,sc[0]===sc[1]?`BASEketball Shootout tie at ${sc[0]}.`:`${s.players[sc[0]>sc[1]?0:1].name} wins the BASEketball Shootout, ${Math.max(...sc)} to ${Math.min(...sc)}.`);return;}
 if(s.solo){const r=await play(0,'Shoot');if(!r||!s.alive)return;const cleared=r.won?ROUNDS:r.round-1;soloFinish(s,r.score,cleared,`BASEketball Shootout · round ${r.round} · ${r.score} points`,cleared>0);return;}
 const scores=[0,0];
 for(let i=0;i<Math.min(2,s.players.length);i++){const r=await play(i,i?`Shoot · beat ${scores[0]}`:'Shoot');if(!r||!s.alive)return;scores[i]=r.score;s.setScores(scores.slice());}
 s.finish(scores,scores[0]===scores[1]?`BASEketball Shootout tie at ${scores[0]}.`:`${s.players[scores[0]>scores[1]?0:1].name} wins the BASEketball Shootout, ${Math.max(...scores)} to ${Math.min(...scores)}.`);
}
Object.assign(exports,{hoopJones});
