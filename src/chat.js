// Messages between online players (ROADMAP I4; owner, Nov 5: canned lines AND typing; in the board game, in online
// minigames, in the room and on waiting/result cards, and to any friend from the friends list at any time; bubbles
// with the sender's face; a huge pool of lines, normal and super crass, a few nice and a few nasty dealt fresh each
// time).
// - In an online room (src/net.js) a message goes to the other phone as {k:'chat',id,text,name,character}; every other
//   room listener ignores that kind. To a friend outside a room it goes through the friends lobby (src/friends.js,
//   cloudflare/worker.js Lobby: {t:'chat',to,id,text} → {t:'chat',id,text,from}).
// - 💬 = a small round button on the right edge while a room has the other player in it (it moves inside the game's
//   own dialog while one is open, because a modal dialog makes the rest of the page untappable). It opens the chat
//   sheet, itself a modal <dialog> so it sits on top of games and cards. Typing in it never reaches a game: keys are
//   stopped at the window before any game hears them.
// - Incoming: a bubble with the sender's face slides in at the top for a few seconds (a popover, so it shows over
//   dialogs too) with a blip and a short buzz; tapping it (when nothing modal is open) opens the sheet to answer.
//   The sheet shows the last messages both ways.
const {store}=require("src/state.js");
const {sendNet,onNet,netState}=require("src/net.js");
const {portraitURL}=require("src/assets.js");
const {escapeHTML:e}=require("src/utils.js");
const {tone,vibrate}=require("src/audio.js");
const {NICE,TRASH,CRASS,SITUATION,EMOTES}=require("src/data/chatLines.js");
const F=require("src/friends.js");
let Q=null;try{Q=require("src/data/characterQuotes.js");}catch{}

const MAX=160,LOG_MAX=40;
const log=[];            // {dir:'in'|'out', name, character, text, at, to: 'room'|code}
const seen=new Set();    // message ids already shown (a resend after a reconnect)
const recent=[];         // lines dealt lately: the next hands avoid them
let target=null,unread=0,lastSend=0,btn=null,dlg=null,bubbles=null;
const rid=()=>Math.random().toString(36).slice(2,10);
const pick=(list,n,avoid)=>{const pool=list.filter(x=>!avoid.has(x)),src=pool.length>=n?pool:list.slice(),out=[];while(out.length<n&&src.length)out.push(src.splice(Math.floor(Math.random()*src.length),1)[0]);return out;};
const crude=()=>!store.profile?.settings?.chatClean;

// who this phone is in the room (or to friends)
function meNow(){const n=netState();if(n.room&&n.me)return {name:n.me.name,character:n.me.character};const m=F.friendMe?.();return m?{name:m.name,character:m.character}:{name:'Me',character:'sean'};}
function roomOpen(){const n=netState();return !!(n.room&&n.peer&&n.status==='in-room');}
// what's going on, for the 'right now' lines
function moment(){
 if(store.session)return 'game';
 const r=store.run;if(store.netBoard&&r){const mine=store.netBoard.me;return r.current===mine?'myturn':'theirturn';}
 return 'room';
}
// a fresh hand: 2 for the moment, 3 nice, 4 nasty (2 crude ones unless Clean chat is on), and your character's line
function deal(){
 const avoid=new Set(recent),now=pick(SITUATION[moment()]||SITUATION.room,2,avoid),nice=pick(NICE,3,avoid);
 const nasty=crude()?[...pick(CRASS,2,avoid),...pick(TRASH,2,avoid)]:pick(TRASH,4,avoid);
 for(const l of [...now,...nice,...nasty]){recent.push(l);if(recent.length>60)recent.shift();}
 const me=meNow();let quote=null;try{const q=Q?.quoteOf?.(me.character);if(q&&q.length<=MAX)quote=q;}catch{}
 return {now,nice,nasty,quote};
}

// ---- sending ----
function send(text){
 text=String(text||'').replace(/\s+/g,' ').trim().slice(0,MAX);if(!text)return false;
 if(Date.now()-lastSend<700)return false;lastSend=Date.now();
 const me=meNow(),id=rid(),to=target||'room';let ok=false;
 if(to==='room'){ok=sendNet({k:'chat',id,text,name:me.name,character:me.character});}
 else ok=F.sendFriendChat?.(to,{id,text});
 if(!ok){flash('Not sent: not connected');return false;}
 note({dir:'out',name:me.name,character:me.character,text,to});
 try{tone(880,.05,.03,'triangle');}catch{}
 return true;
}
function note(m){log.push({...m,at:Date.now()});if(log.length>LOG_MAX)log.shift();if(dlg?.open)renderLog();}

// ---- receiving ----
function receive(m,via){
 if(!m||typeof m.text!=='string'||!m.text.trim())return;
 const id=String(m.id||'');if(id){if(seen.has(id))return;seen.add(id);if(seen.size>200)seen.delete(seen.values().next().value);}
 const text=m.text.replace(/\s+/g,' ').trim().slice(0,MAX),name=String(m.name||'Friend').slice(0,24),character=String(m.character||'amber').slice(0,64);
 note({dir:'in',name,character,text,to:via});
 if(dlg?.open&&(target||'room')===via)return;      // already reading this conversation
 unread++;updateButton();bubble({name,character,text,via});
 try{tone(660,.06,.035,'triangle');setTimeout(()=>tone(990,.08,.03,'triangle'),70);}catch{}
 try{vibrate?.(30);}catch{}
}

// ---- UI ----
function ensureUI(){
 if(btn||typeof document==='undefined')return;
 btn=document.createElement('button');btn.type='button';btn.id='sc-chat';btn.className='chat-fab';btn.hidden=true;btn.setAttribute('aria-label','Chat');btn.innerHTML='<span>💬</span><i></i>';
 btn.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();if(Date.now()<noClickUntil)return;openChat('room');});
 installDrag();
 document.body.append(btn);
 bubbles=document.createElement('div');bubbles.id='sc-chat-bubbles';bubbles.className='chat-bubbles';if('popover' in HTMLElement.prototype)bubbles.setAttribute('popover','manual');document.body.append(bubbles);
 dlg=document.createElement('dialog');dlg.id='sc-chat-dlg';dlg.className='chat-sheet';document.body.append(dlg);
 dlg.addEventListener('click',onSheetClick);
 dlg.addEventListener('cancel',ev=>{ev.preventDefault();closeChat();});
 dlg.addEventListener('submit',ev=>{ev.preventDefault();const i=dlg.querySelector('.chat-input');if(i&&send(i.value)){i.value='';closeChat();}});
 // keys typed in the chat never reach a game (registered at boot, before any game's own listeners)
 for(const t of ['keydown','keyup','keypress'])addEventListener(t,ev=>{if(dlg?.open){ev.stopImmediatePropagation();if(ev.type==='keydown'&&ev.key==='Escape'){ev.preventDefault();closeChat();}}},true);
}
// ---- where the 💬 button sits (owner, Nov 12): hold it, then drag it anywhere, like an app icon on an Android home screen;
// the spot is remembered (localStorage, as a fraction of the screen). Until moved, a game may offer a home for it that
// covers nothing (setChatHome(fn): fn() → {x,y} screen px of the button's centre, or null), else the right edge.
const POS_KEY='sc-chat-pos',HOLD_MS=380,HALF=23;
let home=null,drag=null,noClickUntil=0;
function savedPos(){try{const v=JSON.parse(localStorage.getItem(POS_KEY)||'null');return v&&Number.isFinite(v.x)&&Number.isFinite(v.y)?v:null;}catch{return null;}}
function savePos(x,y){try{localStorage.setItem(POS_KEY,JSON.stringify({x:+(x/innerWidth).toFixed(4),y:+(y/innerHeight).toFixed(4)}));}catch{}}
function placeButton(){
 if(!btn)return;const W=innerWidth,H=innerHeight,sp=savedPos();let c=null;
 if(drag?.on)c={x:drag.x,y:drag.y};else if(sp)c={x:sp.x*W,y:sp.y*H};else if(home){try{c=home();}catch{c=null;}}
 if(!c||!Number.isFinite(c.x)||!Number.isFinite(c.y)){btn.style.left=btn.style.top=btn.style.right='';return;}
 const m=HALF+4,x=Math.min(W-m,Math.max(m,c.x)),y=Math.min(H-m,Math.max(m,c.y));
 btn.style.left=Math.round(x-HALF)+'px';btn.style.top=Math.round(y-HALF)+'px';btn.style.right='auto';}
function setChatHome(fn){home=typeof fn==='function'?fn:null;placeButton();if(home)requestAnimationFrame(placeButton);}
function installDrag(){
 btn.addEventListener('pointerdown',ev=>{if(ev.button>0)return;const r=btn.getBoundingClientRect();
  drag={id:ev.pointerId,sx:ev.clientX,sy:ev.clientY,ox:ev.clientX-(r.left+HALF),oy:ev.clientY-(r.top+HALF),x:r.left+HALF,y:r.top+HALF,on:false};
  drag.timer=setTimeout(()=>{if(!drag)return;drag.on=true;btn.classList.add('dragging');try{btn.setPointerCapture(drag.id);}catch{}try{vibrate?.(20);}catch{}},HOLD_MS);});
 btn.addEventListener('pointermove',ev=>{if(!drag||ev.pointerId!==drag.id)return;
  if(!drag.on){if(Math.hypot(ev.clientX-drag.sx,ev.clientY-drag.sy)>12){clearTimeout(drag.timer);drag=null;}return;}
  ev.preventDefault();drag.x=ev.clientX-drag.ox;drag.y=ev.clientY-drag.oy;placeButton();});
 const end=ev=>{if(!drag||ev.pointerId!==drag.id)return;clearTimeout(drag.timer);
  if(drag.on){const r=btn.getBoundingClientRect();savePos(r.left+HALF,r.top+HALF);noClickUntil=Date.now()+400;btn.classList.remove('dragging');}
  drag=null;placeButton();};
 btn.addEventListener('pointerup',end);btn.addEventListener('pointercancel',end);
 btn.addEventListener('contextmenu',ev=>ev.preventDefault());
 addEventListener('resize',()=>requestAnimationFrame(placeButton));}
function updateButton(){
 if(!btn)return;const show=roomOpen();btn.hidden=!show;btn.classList.toggle('has-unread',unread>0);placeButton();
 btn.querySelector('i').textContent=unread?String(Math.min(9,unread)):'';
 // a modal dialog makes everything outside it untappable: sit inside it while it's open
 const host=document.querySelector('#dialog[open]')||document.body;if(btn.parentElement!==host)host.append(btn);
}
function face(character,cls=''){return `<img class="chat-face ${cls}" src="${e(portraitURL(character||'amber','normal'))}" alt="" decoding="async">`;}
function bubble({name,character,text,via}){
 if(!bubbles)return;const b=document.createElement('div');b.className='chat-bubble';b.innerHTML=`${face(character)}<span><b>${e(name)}</b>${e(text)}</span>`;
 b.addEventListener('click',()=>{b.remove();openChat(via);});
 bubbles.append(b);while(bubbles.children.length>3)bubbles.firstElementChild.remove();
 try{if(bubbles.popover){if(bubbles.matches(':popover-open'))bubbles.hidePopover();bubbles.showPopover();}}catch{}
 setTimeout(()=>{b.classList.add('out');setTimeout(()=>{b.remove();if(!bubbles.children.length)try{bubbles.hidePopover?.();}catch{}},350);},4600);
}
function flash(text){bubble({name:'',character:meNow().character,text,via:target||'room'});}
function peerOf(to){
 if(to==='room'){const p=netState().peer;return p?{name:p.name,character:p.character}:{name:'the other player',character:'amber'};}
 const f=F.friendOf?.(to);return {name:f?.name||'Friend',character:f?.character||'amber'};
}
function openChat(to='room'){
 ensureUI();target=to;if(to==='room'&&!roomOpen())return false;unread=0;updateButton();
 const p=peerOf(to),h=deal(),line=(t,cls='')=>`<button type="button" class="chat-line ${cls}" data-say="${e(t)}">${e(t)}</button>`;
 dlg.innerHTML=`<form method="dialog" class="chat-card">
  <header class="chat-head">${face(p.character)}<b>To ${e(p.name)}</b><button type="button" class="chat-x" data-chat="close" aria-label="Close">✕</button></header>
  <div class="chat-log" id="chat-log"></div>
  <div class="chat-emotes">${EMOTES.map(x=>`<button type="button" class="chat-emote" data-say="${x}">${x}</button>`).join('')}</div>
  <div class="chat-lines">
   <div class="chat-group"><small>Right now</small>${h.now.map(t=>line(t,'now')).join('')}</div>
   <div class="chat-group"><small>Nice</small>${h.nice.map(t=>line(t,'nice')).join('')}</div>
   <div class="chat-group"><small>Nasty</small>${h.nasty.map(t=>line(t,'nasty')).join('')}</div>
   ${h.quote?`<div class="chat-group"><small>Your character says</small>${line(h.quote,'quote')}</div>`:''}
  </div>
  <div class="chat-type"><button type="button" class="chat-deal" data-chat="deal" aria-label="New lines">🎲</button><input class="chat-input" maxlength="${MAX}" autocomplete="off" enterkeyhint="send" placeholder="Type a message…"><button type="submit" class="chat-send">Send</button></div>
 </form>`;
 renderLog();
 if(!dlg.open)try{dlg.showModal();}catch{dlg.setAttribute('open','');}
 return true;
}
function renderLog(){
 const el=dlg?.querySelector('#chat-log');if(!el)return;const to=target||'room',rows=log.filter(m=>m.to===to).slice(-6);
 el.innerHTML=rows.length?rows.map(m=>`<p class="chat-msg ${m.dir}">${m.dir==='in'?face(m.character,'tiny'):''}<span>${e(m.text)}</span></p>`).join(''):`<p class="chat-empty">No messages yet. Pick a line or type one.</p>`;
 el.scrollTop=el.scrollHeight;
}
function onSheetClick(ev){
 const b=ev.target.closest?.('button');if(!b)return;
 if(b.dataset.say!=null){ev.preventDefault();if(send(b.dataset.say))closeChat();return;}
 if(b.dataset.chat==='close'){ev.preventDefault();closeChat();return;}
 if(b.dataset.chat==='deal'){ev.preventDefault();const typed=dlg.querySelector('.chat-input')?.value||'';openChat(target||'room');const i=dlg.querySelector('.chat-input');if(i)i.value=typed;}
}
// After closing, drop focus (it returns to the 💬 button) so nothing keeps the keyboard or a stale focus on top of the game.
function closeChat(){if(dlg?.open)dlg.close();try{const a=document.activeElement;if(a&&a!==document.body&&(a===btn||dlg.contains(a)))a.blur();}catch{}}

function initChat(){
 if(typeof document==='undefined')return;ensureUI();
 onNet(ev=>{if(ev.t==='msg'&&ev.d?.k==='chat'){const p=netState().peer;receive({...ev.d,name:ev.d.name||p?.name,character:ev.d.character||p?.character},'room');}
  if(['welcome','join','leave','lost','status'].includes(ev.t))updateButton();});
 F.onFriendChat?.(m=>receive({id:m.id,text:m.text,name:m.from?.name,character:m.from?.character},m.from?.code));
 setInterval(updateButton,1000);
}
// tests: open the sheet, send a line, read the log
function chatDebug(){return {log:log.slice(),open:!!dlg?.open,target,unread,deal,send,openChat,closeChat,button:()=>btn&&!btn.hidden};}
Object.assign(exports,{initChat,openChat,closeChat,chatDebug,setChatHome});
