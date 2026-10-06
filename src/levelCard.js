// Full-screen "title card" shown when a player begins a level, in the spirit of
// Charlie and Frank announcing each level of Chardee MacDennis.
const {store}=require("src/state.js");
const {tone}=require("src/audio.js");
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
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);open=null;node.classList.add('leaving');setTimeout(()=>{node.remove();resolve(true);},reduced?10:380);};
  open=finish;
  node.addEventListener('click',finish);
  host.append(node);playSting(realm);
  timer=setTimeout(finish,first?3600:2000);
 });
}
Object.assign(exports,{showLevelCard,dismissLevelCard});
