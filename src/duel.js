// Online duels between two phones (rooms in src/net.js). In the Arcade's Online mode either player picks a score game,
// the other phone is asked "Sean challenges you", and both play that game's 1P version from the same seed at the same
// time. Each sees the other's live score; when both have finished, the higher score wins and the winner's phone gets the
// usual arcade recruit roll. The launcher only gets hooks (requestGame({duel})), so it never imports this file.
const {store}=require("src/state.js");
const {showDialog,toast}=require("src/ui.js");
const {portraitHTML,gameArtHTML}=require("src/assets.js");
const {gameById}=require("src/gameRegistry.js");
const {duelOK,duelVersus,soloSettings}=require("src/solo.js");
const {escapeHTML:e}=require("src/utils.js");
const {joinRoom,leaveRoom,sendNet,onNet,netState}=require("src/net.js");

let hooks={start:async()=>false,refresh:()=>{}};
let pending=null;   // my challenge waiting for an answer {mid, gameId, seed}
let match=null;     // {mid, gameId, seed, peer, mine:{score,level,done}, theirs:{score,level,done,quit}, gone, started}
let watch=null,quietPolls=0,incoming=null,waiting=false,boardEnd=null;
// Results this phone sent, by match: a "done" can be lost on a bad connection, so the waiting phone repeats its own
// (w:1) and a phone that already finished that match answers with its result again.
const doneSent=new Map();
// Turn-based versus games (solo.js duelVersus): both phones run the same game and trade moves. Every move this phone
// makes is numbered and kept; the other phone says what it has ('seen', every 1.5 s and on a gap) and anything it
// missed (a dropped connection) is sent again; repeats are ignored. Kept by match after it ends, for the last move.
const relays=new Map();
function moveRelay(mid,seat){
 const sent=[];let got=0;
 const r={seat,mid,queue:[],sent,get got(){return got;},
  send(m){sent.push(m);sendNet({k:'mv',mid,n:sent.length,m});},
  take(n,m){if(n<=got)return;if(n>got+1){sendNet({k:'seen',mid,got});return;}got=n;r.queue.push(m);}};
 relays.set(mid,r);if(relays.size>6)relays.delete(relays.keys().next().value);
 return r;
}
function resendMoves(mid,from){const r=relays.get(mid);if(!r||!Number.isInteger(from)||from<0)return;for(let i=from;i<r.sent.length;i++)sendNet({k:'mv',mid,n:i+1,m:r.sent[i]});}
// The other player left a versus game (quit, or gone too long): end it here; duel.finish() then counts it as a forfeit.
function peerGone(m){const s=store.session;if(s?.net&&s.net===m.net&&s.alive)s.finish([...s.score],`${m.peer.name} left the game.`);}
const AWAY_MS=60000;
const id=()=>Math.random().toString(36).slice(2,10);
const fmt=n=>(Math.max(0,n|0)).toLocaleString();
const peerName=()=>netState().peer?.name||'Player 2';
// Close the open dialog from code (an answer or score arrived) with a value of our choosing.
function resolveDialog(value){if(!store.dialog)return;const p=store.dialog;store.dialog=null;document.getElementById('dialog')?.close();p.resolve(value);}
function setLive(id,text){const el=document.getElementById(id);if(el)el.textContent=text;}

// ---- room ----
function lastRoom(){try{return localStorage.getItem('sc-room')||'';}catch{return '';}}
function names(){return [0,1].map(i=>store.setupNames?.[i]||(i?'Amber':'Sean'));}
async function openOnline(){
 const net=netState();if(net.room&&net.status!=='off'){store.online=true;hooks.refresh();return;}
 const who=soloSettings(store.profile).who,[n0,n1]=names();
 const html=`<label class="net-field"><span>Room name</span><input id="net-room" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" placeholder="e.g. pizza night" value="${e(lastRoom())}"></label>
  <div class="net-who" role="radiogroup" aria-label="You are"><span>You are</span><label><input type="radio" name="net-who" value="0"${who?'':' checked'}> ${e(n0)}</label><label><input type="radio" name="net-who" value="1"${who?' checked':''}> ${e(n1)}</label></div>
  <p class="net-note">Both phones need the internet. Type the same room name on both; the second phone joins as player 2. Unlocks you win go to your own roster on this phone.</p>`;
 const choice=await showDialog({local:true,title:'Play online',html,choices:[{label:'Join room',value:'join',primary:true},{label:'Cancel',value:'cancel'}]});
 if(choice!=='join')return;
 const room=document.getElementById('net-room')?.value.trim()||'',me=+(document.querySelector('input[name="net-who"]:checked')?.value||0);
 if(!room){toast('Type a room name first');return openOnline();}
 try{localStorage.setItem('sc-room',room);}catch{}
 const character=store.setupSelected?.[me]||(me?'amber':'sean');
 toast(`Joining “${room}”…`);
 try{
  const {peer}=await joinRoom(room,{name:names()[me],character,owner:me?'Amber':'Sean'});
  store.online=true;store.onlineWho=me;hooks.refresh();
  toast(peer?`${peer.name} is here. Pick a game to challenge them.`:`In room “${netState().room}”. Waiting for player 2…`);
 }catch(err){
  const why={full:'That room already has two players. Try another name.',name:'Use letters or numbers in the room name.'}[err.message]||'Could not reach the online rooms. Check the internet connection and try again.';
  await showDialog({local:true,title:'Could not join',body:why});
 }
}
function leaveOnline(){if(match)sendNet({k:'quit',mid:match.mid});endMatch();leaveRoom();store.online=false;hooks.refresh();toast('Left the room');}
function setMode(online){if(online)return openOnline();store.online=false;hooks.refresh();}

// ---- challenges ----
async function propose(gameId){
 const net=netState(),game=gameById(gameId);
 if(!net.room||net.status==='off')return openOnline();
 if(!net.peer){toast(`Waiting for player 2 to join “${net.room}”`);return;}
 if(!duelOK(game)){toast('This game is not online yet');return;}
 const mid=id(),seed=id();pending={mid,gameId,seed};
 sendNet({k:'propose',mid,gameId,seed});
 const ans=await showDialog({local:true,title:`Waiting for ${peerName()}…`,html:`${gameArtHTML(game)}<p class="net-note">You challenged ${e(peerName())} to <b>${e(game.title)}</b>. It starts on both phones as soon as they accept.</p>`,choices:[{label:'Cancel',value:'cancel'}]});
 const mine=pending;pending=null;
 if(ans==='accepted')return start(mine.gameId,mine.seed,mine.mid);
 if(ans==='swap')return;   // they challenged at the same moment; theirs goes ahead
 if(ans==='declined'||ans==='busy'){toast(ans==='busy'?`${peerName()} is busy right now`:`${peerName()} said not now`);return;}
 sendNet({k:'cancel',mid:mine.mid});
}
async function challenged(d){
 const game=gameById(d.gameId);
 if(!duelOK(game)){sendNet({k:'answer',mid:d.mid,ok:false});return;}
 // Both challenged at the same moment: player 1's challenge goes ahead (player 2 accepts it, player 1 ignores theirs).
 if(pending){if(netState().seat!==1)return;resolveDialog('swap');sendNet({k:'answer',mid:d.mid,ok:true});return start(d.gameId,d.seed,d.mid);}
 // Only between games, in the Arcade or on the title screen (not over a board-game run).
 if(match||store.session||store.dialog||store.busy||store.netBoard||!['arcade','home'].includes(store.view)){sendNet({k:'answer',mid:d.mid,ok:false,busy:true});return;}
 sound();incoming=d.mid;
 const ans=await showDialog({local:true,title:`${peerName()} challenges you!`,source:game.source,html:`${gameArtHTML(game)}<p class="net-note"><b>${e(game.title)}</b>: ${duelVersus(game)?'you play each other move by move, each on your own phone.':'you both play it at the same time from the same start. Highest score wins.'}</p>`,choices:[{label:'Play',value:'play',primary:true},{label:'Not now',value:'no'}],seconds:30,timeoutValue:'no'});
 incoming=null;
 if(ans==='cancelled'){toast(`${peerName()} cancelled the challenge`);return;}
 sendNet({k:'answer',mid:d.mid,ok:ans==='play'});
 if(ans==='play')start(d.gameId,d.seed,d.mid);
}
function sound(){try{navigator.vibrate?.(60);}catch{}}

// ---- the match ----
// board: a board-game minigame (src/netBoard.js) with both board players (mine first); it resolves boardDuel.
async function start(gameId,seed,mid,board=null){
 const versus=duelVersus(gameById(gameId)),seat=netState().seat===1?1:0;
 match={mid,gameId,seed,peer:{...netState().peer,...(board?{name:board[1].name,character:board[1].character}:{})},mine:{score:0,level:0,done:false},theirs:{score:0,level:0,done:false},gone:false,started:false,board:!!board,versus,net:versus?moveRelay(mid,seat):null,away:0};
 showChip();watchMatch();
 const who=board?(board[0].owner==='Amber'?1:0):store.onlineWho??soloSettings(store.profile).who;
 // versus: the game's player 1 is room seat 0 on both phones; this phone plays `seat`
 const ok=await hooks.start(gameId,{seed,who,opponent:match.peer,finish,rematch:()=>propose(gameId),...(board?{board:true,players:board}:{}),...(versus?{versus:true,seat,net:match.net,leave:()=>{if(match?.mid===mid)sendNet({k:'quit',mid});}}:{})});
 if(match?.mid===mid)match.started=!!store.session||match.mine.done;
 if(!ok&&match?.mid===mid&&!match.mine.done&&!store.session){
  if(match.board){void finish({score:0,level:0,label:'Did not play'});return;}   // the board still needs both results
  sendNet({k:'quit',mid});endMatch();
 }
}
// Board minigame: both phones play gameId's 1P version from seed; resolves {mine, theirs, forfeit} when both are done.
function boardDuel(gameId,seed,mid,players){return new Promise(resolve=>{boardEnd?.(null);boardEnd=resolve;void start(gameId,seed,mid,players);});}
// The live score of the game in progress (turns games add the banked rounds).
function liveScore(){const s=store.session;if(!s)return null;const sc=s.score?.[0]||0;return s.solo?.kind==='turns'?(s.solo.base||0)+sc:Math.max(s.soloProgress?.score||0,sc);}
function watchMatch(){
 clearInterval(watch);quietPolls=0;let last=-1;
 watch=setInterval(()=>{
  if(!match)return clearInterval(watch);
  const live=liveScore();
  if(match.versus){sendNet({k:'seen',mid:match.mid,got:match.net.got});if(match.away&&Date.now()-match.away>AWAY_MS){match.gone=true;match.away=0;toast(`${match.peer.name} did not come back`);peerGone(match);}}
  if(live!==null&&match.versus){match.started=true;quietPolls=0;}
  else if(live!==null){match.started=true;quietPolls=0;if(live!==last&&!match.mine.done){last=live;match.mine.score=live;sendNet({k:'progress',mid:match.mid,score:live,level:store.session?.soloProgress?.level||0});}}
  // Left the game without banking a score: tell the other phone so it doesn't wait forever.
  else if(match.started&&!match.mine.done&&!store.dialog&&++quietPolls>=3){sendNet({k:'quit',mid:match.mid});toast('You left the duel');endMatch();}
  showChip();
 },1500);
}
function showChip(){
 let el=document.getElementById('duel-chip');
 if(!match||!store.session||match.versus){el?.remove();return;}   // versus games show both players in their own header
 if(!el){el=Object.assign(document.createElement('div'),{id:'duel-chip'});el.setAttribute('role','status');document.body.append(el);}
 const t=match.theirs;el.textContent=match.gone?`${match.peer.name} left`:`🌐 ${match.peer.name} · ${fmt(t.score)}${t.done?' · done':''}`;
}
function endMatch(){match=null;clearInterval(watch);document.getElementById('duel-chip')?.remove();}
// Called by settleSolo with my final result: tell the other phone, wait for theirs, return the outcome.
async function finish({score,level,label,won=false,recruits=[],left=false}){
 const m=match;if(!m)return null;
 m.mine={score,level,done:true,won,recruits,label};const done={k:'done',mid:m.mid,score,level,label,won,recruits};sendNet(done);document.getElementById('duel-chip')?.remove();
 doneSent.set(m.mid,done);if(doneSent.size>12)doneSent.delete(doneSent.keys().next().value);
 if(!m.theirs.done&&!m.gone){
  waiting=true;const again=setInterval(()=>{if(match===m&&!m.theirs.done)sendNet({...done,w:1});},5000);
  const ans=await showDialog({local:true,title:`Waiting for ${m.peer.name}…`,html:`<div class="result-portraits"><div>${portraitHTML(m.peer.character||'amber','portrait mini','thinking')}<b>${e(m.peer.name)}</b></div></div><p class="solo-result">Your score: <b>${fmt(score)}</b><br>${e(m.peer.name)} so far: <b id="duel-live">${fmt(m.theirs.score)}</b></p><p class="net-note">Their phone is still playing. The result shows when they finish.</p>`,choices:[{label:'Stop waiting',value:'stop'}]});
  waiting=false;clearInterval(again);
  if(ans==='stop'&&!m.theirs.done&&!m.gone){sendNet({k:'quit',mid:m.mid});endMatch();if(m.board)settleBoard(m,true);return {theirs:m.theirs.score,peer:m.peer,abandoned:true,won:false,tie:false};}
 }
 endMatch();
 const theirs=m.theirs.score,forfeit=m.gone||m.theirs.quit;
 if(m.board)settleBoard(m,forfeit);
 if(left)return {theirs,peer:m.peer,forfeit:false,won:false,tie:false};   // left a versus game: theirs
 return {theirs,peer:m.peer,forfeit,won:forfeit||score>theirs,tie:!forfeit&&score===theirs};
}
function settleBoard(m,forfeit){const end=boardEnd;boardEnd=null;end?.({mine:{...m.mine},theirs:{...m.theirs},forfeit:!!forfeit});}

// ---- messages ----
function onMessage(d){
 if(!d||typeof d!=='object')return;
 if(d.k==='propose')return void challenged(d);
 if(d.k==='answer'&&pending?.mid===d.mid)return resolveDialog(d.ok?'accepted':d.busy?'busy':'declined');
 if(d.k==='cancel'){if(incoming===d.mid)resolveDialog('cancelled');return;}
 if(d.k==='done'&&d.w&&(!match||d.mid!==match.mid)){const mine=doneSent.get(d.mid);if(mine)sendNet(mine);return;}
 if(d.k==='seen')return resendMoves(d.mid,d.got);
 if(!match||d.mid!==match.mid)return;
 if(d.k==='mv'){if(match.net&&Number.isInteger(d.n))match.net.take(d.n,d.m);return;}
 const t=match.theirs;
 if(d.k==='progress'){if(!t.done){t.score=d.score|0;t.level=d.level|0;}setLive('duel-live',fmt(t.score));showChip();}
 else if(d.k==='done'){Object.assign(t,{score:d.score|0,level:d.level|0,done:true,won:!!d.won,label:String(d.label||'').slice(0,200),recruits:Array.isArray(d.recruits)?d.recruits.filter(x=>typeof x==='string').slice(0,10):[]});if(waiting)resolveDialog('done');showChip();}
 else if(d.k==='quit'){Object.assign(t,{done:true,quit:true});toast(`${match.peer.name} left the duel`);if(waiting)resolveDialog('done');showChip();if(match.versus)peerGone(match);}
}
function initDuel(h){
 hooks={...hooks,...h};
 onNet(ev=>{
  if(ev.t==='msg')return onMessage(ev.d);
  if(ev.t==='join'){toast(`${ev.peer.name} joined the room`);if(match?.versus){match.away=0;resendMoves(match.mid,0);}hooks.refresh();}
  // A versus game waits a minute for a dropped player to reconnect (their seat and the moves so far come back).
  else if(ev.t==='leave'&&match?.versus&&!match.gone){if(!match.away)match.away=Date.now();toast(`${match.peer.name} lost the connection. Waiting for them…`);hooks.refresh();}
  else if(ev.t==='leave'){toast(`${ev.peer?.name||'Player 2'} left the room`);if(match&&!match.board){match.gone=true;if(waiting)resolveDialog('done');showChip();}if(pending)resolveDialog('declined');if(incoming)resolveDialog('cancelled');hooks.refresh();}
  else if(ev.t==='status'&&ev.status==='reconnecting')toast('Connection lost. Reconnecting…');
  else if(ev.t==='welcome'&&store.online)hooks.refresh();
  else if(ev.t==='lost'){toast('Lost the room connection');store.online=false;hooks.refresh();}
 });
}
Object.assign(exports,{initDuel,openOnline,leaveOnline,setMode,propose,boardDuel});
