// Shared toolkit for the pass-and-play "party" games (Newlywed, Roast, Liar's Dice, Draw It, Battleship, Simon, Price).
// DOM-based stage with hand-off friendly helpers: heads, buttons, particles, banners, small synth effects.
const {portraitHTML}=require("src/assets.js");
const {character}=require("src/characters.js");
const {escapeHTML,shuffle,clamp}=require("src/utils.js");
const {tone,sound,vibrate}=require("src/audio.js");
const {store}=require("src/state.js");

const CSS=`
.pk-body{padding:6px!important;gap:6px;overflow:hidden!important}
.pk-stage{position:relative;flex:1;min-height:0;border-radius:16px;display:flex;flex-direction:column;color:#fff;background:var(--pk-bg,#1d2340);overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:manipulation;font-family:Arial,Helvetica,sans-serif;--pk-accent:#ff4f81}
.pk-stage *{box-sizing:border-box}
.pk-stage.noscroll{overflow:hidden}
.pk-screen{margin:auto 0;padding:clamp(10px,2.4vh,22px) clamp(10px,3vw,24px);display:flex;flex-direction:column;gap:clamp(8px,1.6vh,14px);width:100%;max-width:880px;margin-left:auto;margin-right:auto}
.pk-stage h1,.pk-stage h2,.pk-stage h3,.pk-stage p{margin:0}
.pk-over{font:800 11px/1 Arial;letter-spacing:.16em;text-transform:uppercase;opacity:.75;text-align:center}
.pk-h1{font:900 clamp(22px,5.4vw,40px)/1.05 Arial;text-align:center;letter-spacing:-.01em;text-shadow:0 3px 0 rgba(0,0,0,.25)}
.pk-q{font:800 clamp(19px,4.6vw,30px)/1.22 Arial;text-align:center;text-wrap:balance}
.pk-sub{font:600 clamp(13px,2.4vw,16px)/1.4 Arial;text-align:center;opacity:.88;text-wrap:balance}
.pk-row{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}
.pk-col{display:flex;flex-direction:column;gap:10px}
.pk-stage .pk-btn{appearance:none;border:0;border-radius:14px;min-height:54px;padding:12px 20px;font:900 clamp(16px,3.6vw,20px)/1.1 Arial;color:#fff;background:var(--pk-accent);box-shadow:0 5px 0 rgba(0,0,0,.3);cursor:pointer;transition:transform .08s,box-shadow .08s,filter .15s;text-shadow:0 1px 0 rgba(0,0,0,.25);width:100%;max-width:440px;align-self:center}
.pk-stage .pk-btn:hover{filter:brightness(1.08);background:var(--pk-accent);border:0}
.pk-stage .pk-btn:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(0,0,0,.3)}
.pk-stage .pk-btn[disabled],.pk-stage .pk-btn.off{filter:grayscale(1) brightness(.7);opacity:.55;pointer-events:none}
.pk-stage .pk-btn.alt{background:#3a4272}
.pk-stage .pk-btn.good{background:#2fb86a}
.pk-stage .pk-btn.bad{background:#e0453a}
.pk-stage .pk-btn.sm{min-height:44px;padding:8px 14px;font-size:15px;width:auto}
.pk-stage .portrait.pk-h{--hs:56px;width:var(--hs);height:var(--hs);border-radius:50%;margin:0;border:3px solid var(--pc,#fff);background:#0004;padding:0;flex:0 0 auto;box-shadow:0 4px 10px rgba(0,0,0,.35)}
.pk-stage .portrait.pk-h img{width:100%;height:100%;object-fit:contain}
.pk-stage .portrait.pk-h.sm{--hs:40px;border-width:2px}
.pk-stage .portrait.pk-h.lg{--hs:clamp(72px,17vw,108px)}
.pk-stage .portrait.pk-h.xl{--hs:clamp(90px,24vw,150px)}
.pk-stage .portrait.pk-h.p0{--pc:#78b6ff}
.pk-stage .portrait.pk-h.p1{--pc:#ff9fc6}
.pk-stage .portrait.pk-h.mood-win,.pk-stage .portrait.pk-h.mood-happy{animation:pk-bounce .55s ease-in-out infinite}
.pk-stage .portrait.pk-h.mood-sad,.pk-stage .portrait.pk-h.mood-angry{animation:pk-shake .5s ease-in-out 2}
.pk-stage .portrait.pk-h.mood-silly{animation:pk-wobble .7s ease-in-out infinite}
.pk-stage .portrait.pk-h.mood-think,.pk-stage .portrait.pk-h.mood-thinking{animation:pk-think 1.6s ease-in-out infinite}
@keyframes pk-bounce{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-9px) rotate(3deg)}}
@keyframes pk-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px) rotate(-5deg)}40%{transform:translateX(7px) rotate(5deg)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
@keyframes pk-wobble{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
@keyframes pk-think{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes pk-pop{0%{transform:scale(.2);opacity:0}55%{transform:scale(1.18);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes pk-slide{0%{transform:translateY(24px);opacity:0}100%{transform:none;opacity:1}}
@keyframes pk-flipin{0%{transform:perspective(600px) rotateY(90deg);opacity:0}100%{transform:perspective(600px) rotateY(0);opacity:1}}
@keyframes pk-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
.pk-in{animation:pk-slide .35s ease-out both}
.pk-pop{animation:pk-pop .45s cubic-bezier(.2,1.5,.4,1) both}
.pk-flip{animation:pk-flipin .45s ease-out both}
.pk-stage .pk-card{background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.2);border-radius:16px;padding:12px 14px}
.pk-stage .pk-opt{appearance:none;display:flex;align-items:center;gap:12px;text-align:left;width:100%;min-height:clamp(54px,9vh,70px);padding:10px 14px;border-radius:14px;color:#fff;font:800 clamp(15px,3.6vw,19px)/1.2 Arial;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.22);cursor:pointer;transition:transform .1s,background .15s,border-color .15s}
.pk-stage .pk-opt:hover{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.4)}
.pk-stage .pk-opt:active{transform:scale(.985)}
.pk-stage .pk-opt.sel{background:var(--pk-accent);border-color:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.35),0 6px 18px rgba(0,0,0,.3)}
.pk-stage .pk-opt .ltr{flex:0 0 auto;width:30px;height:30px;border-radius:50%;background:rgba(0,0,0,.28);display:grid;place-items:center;font:900 15px Arial}
.pk-stage .pk-opt.sel .ltr{background:#fff;color:#111}
.pk-stage .pk-opt .em{font-size:1.5em;flex:0 0 auto}
.pk-bar{height:10px;border-radius:9px;background:rgba(255,255,255,.18);overflow:hidden}
.pk-bar>i{display:block;height:100%;border-radius:9px;background:var(--pk-accent);transition:width .25s}
.pk-banner{position:absolute;left:0;right:0;top:34%;text-align:center;font:900 clamp(34px,10vw,76px)/1 Arial;letter-spacing:.02em;text-shadow:0 5px 0 rgba(0,0,0,.35),0 0 30px rgba(255,255,255,.4);pointer-events:none;z-index:30;animation:pk-banner 1.3s ease-out both;padding:0 10px}
@keyframes pk-banner{0%{transform:scale(.3) rotate(-6deg);opacity:0}18%{transform:scale(1.15) rotate(2deg);opacity:1}30%{transform:scale(1) rotate(0)}80%{opacity:1}100%{transform:scale(1.05) translateY(-20px);opacity:0}}
.pk-particle{position:absolute;pointer-events:none;z-index:25;font-size:22px;line-height:1;will-change:transform,opacity}
.pk-shake{animation:pk-shake .45s}
.pk-stage .pk-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;background:rgba(0,0,0,.28);font:800 13px Arial}
.game-paused .pk-stage *{animation-play-state:paused!important}
@media(max-width:520px){.pk-body{padding:4px!important}}
@media(prefers-reduced-motion:reduce){.pk-stage *{animation-duration:.01s!important}}
`;

let cssDone=false;
function injectCSS(){
 if(cssDone&&document.getElementById('party-kit-css'))return;
 cssDone=true;
 const el=document.createElement('style');el.id='party-kit-css';el.textContent=CSS;document.head.appendChild(el);
}
function extraCSS(id,text){
 injectCSS();
 if(document.getElementById(id))return;
 const el=document.createElement('style');el.id=id;el.textContent=text;document.head.appendChild(el);
}
const reduced=()=>!!store.profile?.settings?.reducedMotion;
const cname=(s,i)=>character(s.players[i].character).name;
const pname=(s,i)=>s.players[i].name;
function head(s,i,mood='normal',cls=''){return portraitHTML(s.players[i].character,`portrait pk-h p${i} ${cls}`.trim(),mood);}
function esc(x){return escapeHTML(x);}

// Capitalises the first letter of a sentence and any letter following ". " "? " "! ".
function sentence(t){return String(t).replace(/(^|[.!?]\s+)([a-z])/g,(m,a,b)=>a+b.toUpperCase());}

// Synth effects built on tone(); volumes are larger than the default because these are the main feedback.
function seq(notes,gap=75,type='sine',vol=.06){notes.forEach((n,i)=>setTimeout(()=>{if(Array.isArray(n))tone(n[0],n[1]||.12,vol,n[2]||type);else if(n)tone(n,.12,vol,type);},i*gap));}
const sfx={
 tap:()=>tone(520,.05,.05,'triangle'),
 pick:()=>seq([660,880],55,'triangle'),
 ok:()=>seq([523,659,784,1047],80,'triangle'),
 big:()=>seq([392,523,659,784,1047,1319],70,'triangle',.07),
 bad:()=>seq([300,240,180],110,'sawtooth',.045),
 whoosh:()=>{for(let i=0;i<6;i++)setTimeout(()=>tone(900-i*110,.07,.03,'sawtooth'),i*28);},
 drum:()=>{tone(110,.16,.12,'sine');setTimeout(()=>tone(70,.2,.1,'sine'),60);},
 rattle:(n=8)=>{for(let i=0;i<n;i++)setTimeout(()=>tone(180+Math.random()*320,.035,.05,'square'),i*55);},
 laugh:()=>seq([[500,.07],[440,.07],[500,.07],[440,.07],[560,.1]],85,'square',.035),
 boo:()=>seq([[196,.25],[185,.25],[165,.35]],160,'sawtooth',.04),
 cheer:()=>{seq([523,659,784,1047,784,1047,1319],60,'triangle',.06);},
 tick:()=>tone(880,.04,.04,'square'),
 splash:()=>{for(let i=0;i<7;i++)setTimeout(()=>tone(600-i*60+Math.random()*80,.05,.025,'sine'),i*35);},
 boom:()=>{tone(80,.35,.14,'sawtooth');setTimeout(()=>tone(55,.4,.12,'sawtooth'),70);for(let i=0;i<6;i++)setTimeout(()=>tone(180-i*20,.06,.05,'square'),i*40);},
 ding:()=>{tone(1319,.25,.06,'sine');setTimeout(()=>tone(1760,.35,.05,'sine'),90);}
};

// DOM particle burst inside `root` (must be position:relative). x,y in px relative to root; omit to centre.
function burst(root,{x,y,emojis=['✨'],n=18,spread=170,life=1000,size=22,gravity=140}={}){
 if(!root||reduced())n=Math.min(n,6);
 if(!root)return;
 const r=root.getBoundingClientRect();
 if(x==null)x=r.width/2;if(y==null)y=r.height/2;
 for(let i=0;i<n;i++){
  const p=document.createElement('span');p.className='pk-particle';p.textContent=emojis[i%emojis.length];p.style.left=x+'px';p.style.top=y+'px';p.style.fontSize=(size*(.7+Math.random()*.8))+'px';
  root.appendChild(p);
  const a=Math.random()*Math.PI*2,d=spread*(.35+Math.random()*.65),dx=Math.cos(a)*d,dy=Math.sin(a)*d-spread*.35;
  const rot=(Math.random()-.5)*540;
  try{
   p.animate([{transform:'translate(-50%,-50%) scale(.3)',opacity:1},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(${rot/2}deg) scale(1.1)`,opacity:1,offset:.55},{transform:`translate(calc(-50% + ${dx*1.15}px),calc(-50% + ${dy+gravity}px)) rotate(${rot}deg) scale(.8)`,opacity:0}],{duration:life*(.7+Math.random()*.5),easing:'cubic-bezier(.2,.7,.4,1)',fill:'forwards'}).onfinish=()=>p.remove();
  }catch{p.remove();}
 }
}
// Burst originating from the centre of an element.
function burstAt(root,el,opts={}){
 if(!root||!el)return burst(root,opts);
 const a=root.getBoundingClientRect(),b=el.getBoundingClientRect();
 burst(root,{...opts,x:b.left-a.left+b.width/2,y:b.top-a.top+b.height/2});
}
function banner(root,text,color='#fff',ms=1300){
 if(!root)return;
 const b=document.createElement('div');b.className='pk-banner';b.textContent=text;b.style.color=color;b.style.top=root.scrollTop+root.clientHeight*.32+'px';root.appendChild(b);setTimeout(()=>b.remove(),ms+100);
}
function shake(el){if(!el||reduced())return;el.classList.remove('pk-shake');void el.offsetWidth;el.classList.add('pk-shake');setTimeout(()=>el.classList.remove('pk-shake'),500);}

// A tiny UI helper around s.body: set(html) swaps screens, ask(html,handler) resolves via data-act clicks.
class PartyUI{
 constructor(s,{theme='',bg,accent,scroll=true}={}){
  injectCSS();
  this.s=s;s.body.classList.add('pk-body');s.body.innerHTML='';
  const root=this.root=document.createElement('div');root.className='pk-stage'+(scroll?'':' noscroll')+(theme?' pk-'+theme:'');
  if(bg)root.style.setProperty('--pk-bg',bg);if(accent)root.style.setProperty('--pk-accent',accent);
  s.body.appendChild(root);
  this.handler=null;
  s.on(root,'click',ev=>{
   if(!s.alive||s.paused||s.waiting)return;
   const el=ev.target.closest?.('[data-act]');if(!el||el.disabled||el.classList.contains('off'))return;
   if(this.handler)this.handler(el.dataset.act,el,ev);
  });
 }
 set(html){this.handler=null;this.root.innerHTML=html;this.root.scrollTop=0;}
 // Show html and call handler(act,el,resolve,ev) for each click on [data-act]; resolves with whatever handler passes to resolve.
 ask(html,handler){
  this.set(html);
  return new Promise(resolve=>{this.handler=(act,el,ev)=>handler(act,el,v=>{this.handler=null;resolve(v);},ev);});
 }
 // Show html and wait for the single button data-act="go".
 next(html){return this.ask(html,(a,el,done)=>{if(a==='go'){sfx.tap();done(true);}});}
 head(i,mood,cls){return head(this.s,i,mood,cls);}
 clear(){this.set('<div class="pk-screen"></div>');}
}

// Opens a game: sets scores/titles through a hand-off "title card" using rules text as the one-sentence summary.
async function titleCard(s,icon,rules,label='Let’s go!'){
 const keep=s.shared;s.shared=true;s.updateScores();
 const ok=await s.pass(0,rules,label,{introHTML:`<div style="font-size:54px;line-height:1;margin:2px 0 6px">${icon}</div>`});
 s.shared=keep;s.updateScores();return ok;
}
function setActive(s,i){s.active=i;s.updateScores();}

Object.assign(exports,{injectCSS,extraCSS,head,cname,pname,esc,sentence,sfx,seq,burst,burstAt,banner,shake,PartyUI,titleCard,setActive,reduced,shuffle,clamp,sound,vibrate,tone});
