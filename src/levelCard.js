// Full-screen "title card" shown when a player begins a level, in the spirit of
// Charlie and Frank announcing each level of Chardee MacDennis.
const {store}=require("src/state.js");
const {tone,playMetal,stopMetal,playQuartet,holdMusic,releaseMusic}=require("src/audio.js");
const {levelInfo}=require("src/levels.js");
const {escapeHTML:e}=require("src/utils.js");

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
function showLevelCard(realm,{who='',first=true,drinks=true}={}){
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
function showBossCard(boss){
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
function showDragBanner(name,total){
 const node=document.createElement('div');node.className='drag-banner';document.body.append(node);
 const update=(n,lost)=>{node.innerHTML=`<b>${e(name)} is dragged to the boss</b><span>${n} / ${total} spaces</span><strong>−${(Math.round(lost*10)/10).toFixed(1)}</strong>`;node.classList.remove('bump');void node.offsetWidth;node.classList.add('bump');};
 update(0,0);
 return {update,close(){node.classList.add('leaving');setTimeout(()=>node.remove(),300);}};
}
Object.assign(exports,{showBossCard,showDragBanner});

// Game-start intro: a very classy card with a very unclassy toast, after the
// Chardee MacDennis opening. First line, a beat, then the second line; tap to
// reveal early, tap again (or wait) to continue. Resolves when it closes.
function showGentlemenCard(){
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
