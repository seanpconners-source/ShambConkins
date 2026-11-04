// Friends online (ROADMAP N1). Each install has a friend code (like K7M-Q2X). Anyone you have played with in an online
// room becomes a friend by itself (the room passes the codes, src/duel.js noteMet), and you can add someone by typing
// their code. While the game is open it keeps one small connection to the site's lobby (cloudflare/worker.js, class
// Lobby): friends see each other as Free / Playing <game> / On the board, and can invite each other. An invite waits on
// the friend's phone until they are free (not in a minigame, not in a dialog, not on the CPU's or the other phone's
// turn) and then pops up: Join puts both phones in the same online room (the usual Arcade Online mode).
// Nothing connects until this phone has used Online once (or has a friend), so a game that never goes online stays
// fully offline. Without the lobby on the site (older Worker) the friends list just shows everyone as offline.
const {store}=require("src/state.js");
const {showDialog,toast}=require("src/ui.js");
const {portraitHTML}=require("src/assets.js");
const {soloSettings}=require("src/solo.js");
const {escapeHTML:e}=require("src/utils.js");
const {netBase,netState}=require("src/net.js");
const {VERSION}=require("src/version.js");

const ABC='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const get=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??d;}catch{return d;}};
const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
let memCode=null;
function myCode(){
 let c=get('sc-friend-code',null);
 if(typeof c!=='string'||!/^[A-HJ-NP-Z2-9]{6}$/.test(c)){c=memCode||Array.from({length:6},()=>ABC[Math.floor(Math.random()*ABC.length)]).join('');memCode=c;put('sc-friend-code',c);}
 return c;
}
const cleanCode=v=>{const c=String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');return /^[A-HJ-NP-Z2-9]{6}$/.test(c)?c:'';};
const showCode=c=>c?`${c.slice(0,3)}-${c.slice(3)}`:'';
// [{code, name, character, owner, at, sent}] (sent false = the lobby hasn't been told about a typed-in code yet)
const friends=()=>{const l=get('sc-friends',[]);return Array.isArray(l)?l.filter(f=>f&&cleanCode(f.code)):[];};
const saveFriends=l=>put('sc-friends',l.slice(-60));
const enabled=()=>get('sc-friends-on',false)===true||friends().length>0;

let hooks={openRoom:async()=>{}};
const lobby={ws:null,open:false,tries:0,next:0,ping:null,hideT:null,sent:null};
const presence=new Map();   // code → {code,name,character,owner,st,what,v} for friends with the game open
const invites=[];           // received, waiting until this phone is free: {id, room, from, at}
let outgoing=null;          // my invite waiting for an answer {id, code, room}
let showing=null;           // id of the invite card on screen

// ---- who this phone is, and what it is doing ----
function me(){const who=soloSettings(store.profile).who;return {name:store.setupNames?.[who]||(who?'Amber':'Sean'),character:store.setupSelected?.[who]||(who?'amber':'sean'),owner:who?'Amber':'Sean'};}
function statusNow(){
 const s=store.session,net=netState();
 if(s)return s.online?{st:'online',what:`Playing ${s.game?.title||'a game'} online`}:{st:'game',what:`Playing ${s.game?.title||'a game'}`};
 if(store.netBoard)return {st:'online',what:'Board game online'};
 if(store.view==='board'&&store.run)return {st:'board',what:'On the board'};
 if(net.room&&net.peer)return {st:'online',what:`In a room with ${net.peer.name}`};
 return {st:'free',what:{home:'On the title screen',arcade:'In the Arcade',roster:'In the Collection'}[store.view]||''};
}
// A moment an invite card can pop up without breaking into anything.
function canInterrupt(){
 if(document.hidden||store.session||store.dialog||store.busy||store.netBoard||store.netSetup)return false;
 if(document.querySelector('.route-panel.open,.gb-shell,.ending-layer'))return false;
 if(store.view==='board'){const r=store.run;if(!r||(r.cpu&&r.current===r.cpu.seat))return false;}
 return true;
}

// ---- lobby connection ----
function send(m){if(lobby.ws?.readyState===1)try{lobby.ws.send(JSON.stringify(m));return true;}catch{}return false;}
function connect(){
 if(lobby.ws||!enabled()||document.hidden||navigator.onLine===false||typeof WebSocket==='undefined')return;
 let ws;lobby.next=Date.now()+5000;
 try{ws=new WebSocket(`${netBase()}/lobby`);}catch{return later();}
 lobby.ws=ws;
 ws.onopen=()=>{lobby.open=true;lobby.tries=0;const st=statusNow();lobby.sent=JSON.stringify(st);
  send({t:'hello',code:myCode(),...me(),v:VERSION,friends:friends().map(f=>f.code),...st});
  for(const f of friends())if(f.sent===false){send({t:'add',code:f.code});f.sent=true;}saveFriends(friends().map(f=>({...f,sent:true})));
  clearInterval(lobby.ping);lobby.ping=setInterval(()=>{try{ws.send('ping');}catch{}},20000);};
 ws.onmessage=ev=>{if(ev.data==='pong')return;let m;try{m=JSON.parse(ev.data);}catch{return;}onMessage(m);};
 ws.onclose=()=>{if(lobby.ws!==ws)return;lobby.ws=null;lobby.open=false;clearInterval(lobby.ping);presence.clear();changed();later();};
 ws.onerror=()=>{};
}
function later(){lobby.next=Date.now()+Math.min(300000,3000*2**lobby.tries++);}
function disconnect(){const ws=lobby.ws;lobby.ws=null;lobby.open=false;clearInterval(lobby.ping);presence.clear();if(ws)try{ws.close(1000,'hidden');}catch{}changed();}

function onMessage(m){
 if(m.t==='hi'){presence.clear();for(const p of m.presence||[])if(cleanCode(p.code))presence.set(p.code,p);learn([...presence.values()]);changed();}
 else if(m.t==='p'){const c=cleanCode(m.code);if(!c)return;if(m.entry)presence.set(c,m.entry);else presence.delete(c);if(m.entry)learn([m.entry]);changed();}
 else if(m.t==='added'&&m.by&&cleanCode(m.by.code)){const known=friends().some(f=>f.code===m.by.code);addFriendEntry(m.by,true);if(!known)toast(`${m.by.name||'Someone'} added you as a friend`);}
 else if(m.t==='invite'&&m.from&&cleanCode(m.from.code)&&typeof m.room==='string'){addFriendEntry(m.from,true);
  if(invites.some(i=>i.id===m.id))return;invites.push({id:String(m.id),room:m.room,from:m.from,at:Date.now()});
  if(!canInterrupt())toast(`${m.from.name} invited you to play online`);pump();}
 else if(m.t==='cancel'){const i=invites.findIndex(x=>x.id===m.id);if(i>=0)invites.splice(i,1);if(showing===m.id)resolveDialog('cancelled');}
 else if(m.t==='reply'&&outgoing?.id===m.id)resolveDialog(m.ok?'accepted':'declined');
 else if(m.t==='sent'&&outgoing?.id===m.id&&!m.ok)resolveDialog('offline');
}
// newer names/faces for friends who are online
function learn(list){const l=friends();let dirty=false;for(const p of list){const f=l.find(x=>x.code===p.code);if(f&&(f.name!==p.name||f.character!==p.character)){f.name=p.name;f.character=p.character;f.owner=p.owner;dirty=true;}}if(dirty)saveFriends(l);}
function addFriendEntry(p,sent){const code=cleanCode(p.code);if(!code||code===myCode())return false;const l=friends(),f=l.find(x=>x.code===code);
 if(f){if(p.name){f.name=p.name;f.character=p.character||f.character;f.owner=p.owner||f.owner;}}else l.push({code,name:p.name||'',character:p.character||'',owner:p.owner||'',at:Date.now(),sent});
 saveFriends(l);put('sc-friends-on',true);if(!f)send({t:'friends',list:l.map(x=>x.code)});connect();changed();return !f;}
// Someone met in an online room (the room passes each phone's friend code).
function noteMet(peer){if(peer&&cleanCode(peer.code))addFriendEntry({code:peer.code,name:peer.name,character:peer.character,owner:peer.owner},true);}
function addFriend(raw){const code=cleanCode(raw);if(!code){toast('A friend code has 6 letters and numbers, like K7M-Q2X');return false;}
 if(code===myCode()){toast('That is this phone’s own code');return false;}
 const fresh=addFriendEntry({code},false);if(send({t:'add',code})){const l=friends();const f=l.find(x=>x.code===code);if(f){f.sent=true;saveFriends(l);}}
 toast(fresh?`Added ${showCode(code)}. They’ll see you as a friend too.`:'Already a friend');return fresh;}
function removeFriend(code){saveFriends(friends().filter(f=>f.code!==code));presence.delete(code);send({t:'friends',list:friends().map(f=>f.code)});changed();}
// Turn friends on (opening Online does this): from now on the game keeps the lobby connection while it's open.
function enableFriends(){put('sc-friends-on',true);connect();}

// ---- list ----
const LABEL={free:'Free',board:'On the board',game:'Playing',online:'Playing online'};
function rowsHTML(){
 const l=friends();if(!l.length)return `<li class="fr-empty">No friends yet. Anyone you play with in an online room shows up here, or swap friend codes.</li>`;
 const rank=f=>{const p=presence.get(f.code);return p?(p.st==='free'?0:1):2;};
 return l.slice().sort((a,b)=>rank(a)-rank(b)||String(a.name).localeCompare(String(b.name))).map(f=>{const p=presence.get(f.code),st=p?p.st:'off',name=f.name||`Friend ${showCode(f.code)}`;
  const text=p?(p.what||LABEL[st]||'Online'):'Offline';
  return `<li class="fr-row fr-${st}"><span class="fr-face">${portraitHTML(f.character||'sean','portrait mini')}</span><span class="fr-text"><b>${e(name)}</b><small><i class="fr-dot"></i>${e(text)}</small></span>${p?`<button type="button" class="fr-invite" data-fr="invite:${f.code}">Invite</button>`:''}<button type="button" class="fr-x" data-fr="remove:${f.code}" aria-label="Remove ${e(name)}">✕</button></li>`;}).join('');
}
function friendsPanelHTML(){
 enableFriends();
 return `<section class="fr-panel" aria-label="Friends"><header class="fr-head"><b>Friends</b><small>Your code <span class="fr-code">${showCode(myCode())}</span></small></header><ul class="fr-list" id="fr-list">${rowsHTML()}</ul><div class="fr-add"><input id="fr-add" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Add a friend’s code" aria-label="Friend code"><button type="button" data-fr="add">Add</button></div>${lobby.open?'':`<p class="net-note fr-wait">${navigator.onLine===false?'Offline: friends show up when this phone is online.':'Connecting…'}</p>`}</section>`;
}
function onlineCount(){let n=0;for(const f of friends())if(presence.has(f.code))n++;return n;}
function changed(){
 const el=document.getElementById('fr-list');if(el)el.innerHTML=rowsHTML();
 if(lobby.open)document.querySelector('.fr-wait')?.remove();
 const n=onlineCount();store.friendsOnline=n;
 const tile=document.querySelector('.ts-online-home');if(tile){tile.classList.toggle('has-friends',n>0);const sub=tile.querySelector('.ts-tile-text small');if(sub)sub.textContent=n?`${n} friend${n>1?'s':''} online`:'Two phones';}
}
function resolveDialog(value){if(!store.dialog)return;const p=store.dialog;store.dialog=null;document.getElementById('dialog')?.close();p.resolve(value);}
// buttons inside the list close the dialog with 'fr:<what>' (handleFriendChoice does it, then the dialog opens again)
let typed='';
if(typeof document!=='undefined')document.addEventListener('click',ev=>{const b=ev.target.closest?.('[data-fr]');if(!b||!store.dialog)return;ev.preventDefault();ev.stopPropagation();typed=document.getElementById('fr-add')?.value||'';resolveDialog('fr:'+b.dataset.fr);},true);
if(typeof document!=='undefined')document.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target?.id==='fr-add'&&store.dialog){ev.preventDefault();typed=ev.target.value;resolveDialog('fr:add');}},true);
// true when the value came from the friends list (then the caller shows its dialog again)
async function handleFriendChoice(v){
 if(typeof v!=='string'||!v.startsWith('fr:'))return false;
 const [what,code]=v.slice(3).split(':');
 if(what==='add')addFriend(typed);
 else if(what==='remove'){const f=friends().find(x=>x.code===code);const ok=await showDialog({local:true,title:`Remove ${f?.name||showCode(code)}?`,body:'They stay on your list again the next time you play together in a room.',choices:[{label:'Remove',value:'yes',danger:true},{label:'Keep',value:'no',primary:true}]});if(ok==='yes')removeFriend(code);}
 else if(what==='invite')return await inviteFriend(code)==='joined'?'joined':true;
 return true;
}

// ---- invites ----
const rid=()=>Math.random().toString(36).slice(2,10);
async function inviteFriend(code){
 const f=friends().find(x=>x.code===code),p=presence.get(code),name=f?.name||showCode(code);
 if(!p){toast(`${name} isn’t online right now`);return 'offline';}
 const room=`f-${myCode().toLowerCase()}-${rid().slice(0,4)}`,id=rid();outgoing={id,code,room};
 send({t:'invite',to:code,id,room});
 const note=p.st==='free'?'It pops up on their phone now.':`They’re busy (${e(p.what||LABEL[p.st]||'playing')}); it pops up as soon as they’re free.`;
 const ans=await showDialog({local:true,title:`Inviting ${name}…`,html:`<div class="result-portraits"><div>${portraitHTML(f?.character||'amber','portrait mini','thinking')}<b>${e(name)}</b></div></div><p class="net-note">${note} You’ll both land in the same online room.</p>`,choices:[{label:'Cancel invite',value:'cancel'}],seconds:120,timeoutValue:'timeout'});
 const mine=outgoing;outgoing=null;
 if(ans==='accepted'){toast(`${name} is joining…`);await hooks.openRoom(mine.room);return 'joined';}
 if(ans==='declined'){toast(`${name} said not now`);return 'declined';}
 if(ans==='offline'){toast(`${name} isn’t online right now`);return 'offline';}
 send({t:'cancel',to:code,id:mine.id});
 if(ans==='timeout')toast(`${name} didn’t answer`);
 return 'cancelled';
}
let pumping=false;
async function pump(){
 if(pumping)return;pumping=true;
 try{
  while(invites.length){
   const now=Date.now();while(invites.length&&now-invites[0].at>150000)invites.shift();   // two and a half minutes, then it's stale
   if(!invites.length||!canInterrupt())break;
   const inv=invites.shift();showing=inv.id;
   try{navigator.vibrate?.([60,80,60]);}catch{}
   const board=store.view==='board'&&store.run;
   const ans=await showDialog({local:true,title:`${inv.from.name||'A friend'} wants to play!`,html:`<div class="result-portraits"><div>${portraitHTML(inv.from.character||'amber','portrait mini','win')}<b>${e(inv.from.name||'')}</b></div></div><p class="net-note">Join an online room together and pick games to play.${board?' Your board game is saved: Continue it later from the title screen.':''}</p>`,choices:[{label:'Join',value:'join',primary:true},{label:'Not now',value:'no'}],seconds:45,timeoutValue:'no'});
   showing=null;
   if(ans==='cancelled'){toast(`${inv.from.name} cancelled the invite`);continue;}
   send({t:'reply',to:inv.from.code,id:inv.id,ok:ans==='join'});
   if(ans==='join'){invites.length=0;await hooks.openRoom(inv.room);break;}
  }
 }finally{pumping=false;}
}

// ---- running ----
function tick(){
 if(!enabled())return;
 if(!lobby.ws&&Date.now()>=lobby.next)connect();
 if(lobby.open){const st=statusNow(),k=JSON.stringify(st);if(k!==lobby.sent){lobby.sent=k;send({t:'status',...st});}}
 if(invites.length)pump();
}
function initFriends(h){
 hooks={...hooks,...h};
 if(typeof document==='undefined')return;
 setInterval(tick,1500);
 // closed or put away: drop off the list after 20 s (a quick app switch keeps it)
 document.addEventListener('visibilitychange',()=>{clearTimeout(lobby.hideT);if(document.hidden)lobby.hideT=setTimeout(disconnect,20000);else{lobby.tries=0;lobby.next=0;connect();}});
 addEventListener('online',()=>{lobby.tries=0;lobby.next=0;connect();});
 setTimeout(connect,2500);
}
// tests: drop and reopen the lobby connection (a new hello), what the lobby told us
function friendsDebug(){return {code:myCode(),open:lobby.open,presence:[...presence.values()],friends:friends(),invites:invites.length,reconnect(){disconnect();lobby.next=0;lobby.tries=0;connect();}};}
Object.assign(exports,{friendsDebug,initFriends,friendsPanelHTML,handleFriendChoice,noteMet,addFriend,enableFriends,myCode,inviteFriend,friendsOnline:onlineCount});
