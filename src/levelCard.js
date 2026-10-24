// Full-screen "title card" shown when a player begins a level, in the spirit of
// Charlie and Frank announcing each level of Chardee MacDennis.
const {store}=require("src/state.js");
const {glassSmash,tone,playMetal,stopMetal,playQuartet,holdMusic,releaseMusic}=require("src/audio.js");
const {levelInfo}=require("src/levels.js");
const {escapeHTML:e}=require("src/utils.js");
const {fx}=require("src/netHooks.js");

const STINGS={
 mind:[[523,.12,'triangle'],[659,.12,'triangle'],[784,.12,'triangle'],[1047,.3,'triangle']],
 body:[[98,.16,'square'],[98,.16,'square'],[147,.16,'square'],[196,.34,'square']],
 spirit:[[392,.2,'sine'],[466,.2,'sine'],[587,.2,'sine'],[784,.5,'sine']],
 horror:[[55,.35,'sawtooth'],[58,.35,'sawtooth'],[110,.2,'sawtooth'],[52,.7,'sawtooth']],
 'upside-down':[[300,.2,'triangle'],[210,.2,'triangle'],[150,.5,'triangle']]
};
function playSting(realm){
 if(!store.profile?.settings.sound)return;
 let t=0;for(const [f,d,type] of STINGS[realm]||STINGS.mind){setTimeout(()=>tone(f,d+.05,.05,type),t*1000);t+=d*.8;}
}
let open=null;
function dismissLevelCard(){open?.();}
// who: the player's name; first: nobody has been here yet; quick: a shorter card
// for the second player arriving at a level that has already been announced.
function showLevelCard(realm,{who='',first=true,drinks=true}={}){fx('showLevelCard',realm,{who,first,drinks});
 dismissLevelCard();
 const l=levelInfo(realm),host=document.body,reduced=store.profile?.settings.reducedMotion;
 return new Promise(resolve=>{
  const node=document.createElement('div');
  node.className=`level-card lv-${realm} ${first?'':'quick'} ${reduced?'still':''}`;
  node.style.setProperty('--lv',l.color);
  node.setAttribute('role','dialog');node.setAttribute('aria-label',l.n?`Level ${l.roman}: ${l.name}`:l.name);
  node.innerHTML=`<div class="lvc-rays"></div><div class="lvc-inner"><small class="lvc-kicker">${l.n?(first?'THE GAME ADVANCES':`${e(who.toUpperCase())} ARRIVES`):'A WRONG TURN'}</small><div class="lvc-num">${l.n?`LEVEL ${l.roman}`:'DETOUR'}</div><div class="lvc-name">${e(l.name)}</div><p class="lvc-tag">${e(l.intro)}</p>${drinks&&store.profile.settings.drinkStatus!==false?`<div class="lvc-drink">${l.icon} Players are drinking: <b>${e(l.drink)}</b></div>`:''}${who&&first?`<small class="lvc-who">${e(who)} leads the way.</small>`:''}<small class="lvc-hint">tap to continue</small></div>`;
  let done=false,timer=0;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);open=null;stopMetal();node.classList.add('leaving');setTimeout(()=>{node.remove();resolve(true);},reduced?10:380);};
  open=finish;
  node.addEventListener('click',finish);
  host.append(node);if(!playMetal(realm))playSting(realm);
  timer=setTimeout(finish,first?3600:2000);
 });
}
Object.assign(exports,{showLevelCard,dismissLevelCard});

// "INCOMING BOSS": red siren card before a level boss fight.
function showBossCard(boss){fx('showBossCard',boss?.id);
 const reduced=store.profile?.settings.reducedMotion;
 return new Promise(resolve=>{
  const node=document.createElement('div');node.className=`level-card boss-card ${reduced?'still':''}`;node.style.setProperty('--lv','#d01c2c');
  node.innerHTML=`<div class="lvc-rays"></div><div class="lvc-inner"><small class="lvc-kicker">⚠ WARNING ⚠</small><div class="lvc-num">INCOMING</div><div class="lvc-name">BOSS</div><div class="boss-card-face">${e(boss?.icon||'👹')}</div><p class="lvc-tag">${e(boss?boss.name+' · '+(boss.epithet||''):'')}</p><small class="lvc-hint">tap to continue</small></div>`;
  let done=false;const finish=()=>{if(done)return;done=true;stopMetal();node.classList.add('leaving');setTimeout(()=>{node.remove();resolve(true);},reduced?10:380);};
  node.addEventListener('click',finish);document.body.append(node);
  if(!playMetal('boss')&&store.profile?.settings.sound)for(let i=0;i<6;i++)setTimeout(()=>tone(i%2?660:880,.22,.05,'square'),i*260);
  setTimeout(finish,3200);
 });
}
// Running tally while a player is dragged to the boss.
function showDragBanner(name,total){fx('showDragBanner',name,total);
 const node=document.createElement('div');node.className='drag-banner';document.body.append(node);
 const update=(n,lost)=>{node.innerHTML=`<b>${e(name)} is dragged to the boss</b><span>${n} / ${total} spaces</span><strong>−${(Math.round(lost*10)/10).toFixed(1)}</strong>`;node.classList.remove('bump');void node.offsetWidth;node.classList.add('bump');};
 update(0,0);
 return {update(n,lost){fx('dragBanner',n,lost);update(n,lost);},close(){fx('dragBanner',-1);node.classList.add('leaving');setTimeout(()=>node.remove(),300);}};
}
Object.assign(exports,{showBossCard,showDragBanner});

// Game-start intro: a very classy card with a very unclassy toast, after the
// Chardee MacDennis opening. First line, a beat, then the second line; tap to
// reveal early, tap again (or wait) to continue. Resolves when it closes.
function showGentlemenCard(){fx('showGentlemenCard');
 const reduced=store.profile?.settings.reducedMotion;
 return new Promise(resolve=>{
  const node=document.createElement('div');
  node.className=`gentlemen-card ${reduced?'still':''}`;node.setAttribute('role','dialog');node.setAttribute('aria-label','Gentlemen');node.tabIndex=-1;
  node.innerHTML=`<div class="gc-glow"></div><div class="gc-frame"><small class="gc-kicker">The Gang cordially presents</small><div class="gc-rule"><i>❦</i></div><p class="gc-line gc-one">Gentlemen. …</p><p class="gc-line gc-two" aria-hidden="true">…Suck my dick!</p><div class="gc-rule"><i>❦</i></div><small class="gc-foot">Chardee MacDennis · The Game of Games</small></div>`;
  let done=false,revealed=false,timer=0;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);document.removeEventListener('keydown',key);releaseMusic();node.classList.add('leaving');setTimeout(()=>{node.remove();resolve(true);},reduced?10:600);};
  const reveal=()=>{if(revealed||done)return;revealed=true;clearTimeout(timer);node.classList.add('revealed');node.querySelector('.gc-two').removeAttribute('aria-hidden');playQuartet('close');timer=setTimeout(finish,2400+(reduced?0:700));};
  const tap=()=>revealed?finish():reveal();
  const key=ev=>{if(ev.key==='Escape'||ev.key==='Enter'||ev.key===' '){ev.preventDefault();tap();}};
  node.addEventListener('click',tap);document.addEventListener('keydown',key);
  document.body.append(node);holdMusic(8);playQuartet('open');
  timer=setTimeout(reveal,1600+(reduced?0:800));
 });
}
Object.assign(exports,{showGentlemenCard});

// Between the Gentlemen card and Level I: a hard cut to bottles and glasses smashing
// and "SMASH 'EM UP!!", then the metal title card. Short and jarring on purpose.
function showSmashCard(){fx('showSmashCard');
 const reduced=store.profile?.settings.reducedMotion,total=reduced?700:1500;
 return new Promise(resolve=>{
  const node=document.createElement('div');node.className=`smash-card ${reduced?'still':''}`;node.setAttribute('role','dialog');node.setAttribute('aria-label',"Smash 'em up");
  node.innerHTML=`<canvas></canvas><div class="sm-word"><span>SMASH</span><span>'EM UP!!</span></div>`;
  document.body.append(node);
  const canvas=node.querySelector('canvas'),ctx=canvas.getContext('2d'),dpr=Math.min(2,window.devicePixelRatio||1);
  const W=canvas.width=Math.round(innerWidth*dpr),H=canvas.height=Math.round(innerHeight*dpr),u=Math.min(W,H)/100;
  const GLASS=['#9fe8c8','#6fbf5a','#c98a3a','#e9f6ff','#b3e1ff','#7a3b18'];
  // Bottles and glasses that each get smashed at their own moment.
  const things=[[.22,.3,0,'bottle'],[.78,.26,.18,'glass'],[.5,.66,.34,'bottle'],[.16,.74,.5,'glass'],[.84,.7,.62,'bottle']].map(([x,y,at,kind],i)=>({x:x*W,y:y*H,at:at*total,kind,color:GLASS[i%GLASS.length],broken:false}));
  const shards=[];let flash=0,shake=0,frame=0,timer=0,done=false;const begin=performance.now();
  const drawThing=t=>{ctx.save();ctx.translate(t.x,t.y);ctx.fillStyle=t.color;ctx.globalAlpha=.85;ctx.strokeStyle='#fff';ctx.lineWidth=u*.5;
   if(t.kind==='bottle'){ctx.beginPath();ctx.moveTo(-u*4,u*10);ctx.lineTo(-u*4,-u*2);ctx.quadraticCurveTo(-u*4,-u*5,-u*1.4,-u*6);ctx.lineTo(-u*1.4,-u*11);ctx.lineTo(u*1.4,-u*11);ctx.lineTo(u*1.4,-u*6);ctx.quadraticCurveTo(u*4,-u*5,u*4,-u*2);ctx.lineTo(u*4,u*10);ctx.closePath();}
   else{ctx.beginPath();ctx.moveTo(-u*4.5,-u*7);ctx.lineTo(u*4.5,-u*7);ctx.lineTo(u*3.2,u*7);ctx.lineTo(-u*3.2,u*7);ctx.closePath();}
   ctx.fill();ctx.stroke();ctx.globalAlpha=.5;ctx.fillStyle='#fff';ctx.fillRect(-u*2.6,-u*4,u*.9,u*10);ctx.restore();};
  const smash=t=>{t.broken=true;flash=1;shake=u*2.2;glassSmash(.45);
   for(let i=0;i<26;i++){const a=Math.random()*Math.PI*2,v=(1.5+Math.random()*5)*u;shards.push({x:t.x+(Math.random()-.5)*u*6,y:t.y+(Math.random()-.5)*u*10,vx:Math.cos(a)*v,vy:Math.sin(a)*v-u*2.5,r:Math.random()*6,vr:(Math.random()-.5)*.6,s:(1+Math.random()*2.6)*u,c:Math.random()<.3?'#ffffff':t.color,life:1});}};
  const tick=now=>{if(done)return;const el=now-begin;
   for(const t of things)if(!t.broken&&el>=t.at)smash(t);
   ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#0a0000';ctx.fillRect(0,0,W,H);
   const sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;ctx.setTransform(1,0,0,1,sx,sy);shake*=.82;
   for(const t of things)if(!t.broken)drawThing(t);
   for(const s of shards){s.x+=s.vx;s.y+=s.vy;s.vy+=u*.35;s.r+=s.vr;s.life-=.012;if(s.life<=0)continue;ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.r);ctx.globalAlpha=Math.max(0,s.life);ctx.fillStyle=s.c;ctx.beginPath();ctx.moveTo(0,-s.s);ctx.lineTo(s.s*.6,s.s*.7);ctx.lineTo(-s.s*.5,s.s*.4);ctx.closePath();ctx.fill();ctx.restore();}
   if(flash>0){ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=flash;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;flash=Math.max(0,flash-.25);}
   node.style.setProperty('--shake',`${(sx/dpr).toFixed(1)}px ${(sy/dpr).toFixed(1)}px`);
   frame=requestAnimationFrame(tick);};
  const finish=()=>{if(done)return;done=true;cancelAnimationFrame(frame);clearTimeout(timer);node.remove();resolve(true);};
  node.addEventListener('click',finish);
  frame=requestAnimationFrame(tick);timer=setTimeout(finish,total+(reduced?0:250));
 });
}
Object.assign(exports,{showSmashCard});

// Landing banner: one big word for what this space does (MINIGAME, TRIVIA, BATTLE...),
// shown for a beat before it starts. Tap to skip.
const LANDING={game:['MINIGAME','🎮','#3f8cff','Everybody plays'],minigame:['MINIGAME','🎮','#3f8cff','Everybody plays'],classic:['MINIGAME','🎮','#3f8cff','Everybody plays'],
 trivia:['TRIVIA','❓','#24b0d8','Answer fast'],task:['TASKMASTER','📋','#ff3d6e','A timed task'],casino:['CASINO','♠️','#13a27c','Place your bets'],dice:['YAHTZEE','🎲','#5867ff','Full game of dice'],
 shop:['SHOP','🛒','#ffaf2e','Quark is open'],event:['CHANCE CARD','🃏','#ff9a3d','Draw a card'],trainer:['BATTLE','⚔️','#e5352b','Trainer battle'],location:['LANDMARK','🏛️','#19b9b4','Visit'],
 item:['ITEM','🎁','#9d63ff','Supply cache'],bonus:['BONUS','✨','#27c776','Good fortune'],penalty:['BAD LUCK','⚡','#ff4f64','Uh oh']};
function showLandingBanner(type,sub=''){fx('showLandingBanner',type,sub);
 const spec=LANDING[type];if(!spec||!store.profile)return Promise.resolve(false);
 const [word,icon,color,hint]=spec,reduced=store.profile.settings.reducedMotion;
 return new Promise(resolve=>{
  const node=document.createElement('div');node.className=`landing-banner ${reduced?'still':''}`;node.style.setProperty('--lb',color);node.setAttribute('role','status');
  node.innerHTML=`<div class="lb-band"><span class="lb-icon">${icon}</span><b>${e(word)}</b><small>${e(sub||hint)}</small></div>`;
  let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);document.removeEventListener('pointerdown',finish,true);node.classList.add('leaving');setTimeout(()=>{node.remove();resolve(true);},reduced?0:180);};
  document.addEventListener('pointerdown',finish,true);document.body.append(node);
  if(store.profile.settings.sound){tone(660,.08,.05,'square');setTimeout(()=>tone(990,.12,.05,'square'),70);}
  const timer=setTimeout(finish,reduced?500:950);
 });
}
Object.assign(exports,{showLandingBanner});
