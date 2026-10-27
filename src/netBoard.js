// Online board game on two phones. The phone that starts it (the host) runs the whole game exactly as one shared phone
// would and keeps the save; the other phone (the guest) shows a live copy. The host sends its run after every change
// (run without the boards, the boards only when they change) and repeats every card, banner, sound and dialog
// (src/netHooks.js). Whatever belongs to the guest's player (their dialogs, road choices, roll/item taps, Pokémon
// battles) is answered on the guest's phone. Board minigames are played by both phones at once from the same seed
// (duel.js boardDuel) and settled on the host. If the guest leaves, the host plays their turns (pass and play) until
// they come back. Messages ride the room of src/net.js as {k:'nb', t, ...}.
const {store}=require("src/state.js");
const {setNetHooks,localBusy}=require("src/netHooks.js");
const {sendNet,onNet,netState,joinRoom}=require("src/net.js");
const {VERSION}=require("src/version.js");
const {openDialog,closeDialog,toast,updateBoard,showView}=require("src/ui.js");
const {openRoutePanel,closeRoutePanel,routePreview}=require("src/routePanel.js");
const {showLevelCard,showBossCard,showDragBanner,showGentlemenCard,showSmashCard,showLandingBanner}=require("src/levelCard.js");
const {animateDice,animateItemTransfers,boardFeedback,turnFeedback}=require("src/effects.js");
const {warpTransition}=require("src/warpFx.js");
const {animateRoulette}=require("src/roulette.js");
const {sound,soundRecent,setMusicZone,playFanfare,startMusic}=require("src/audio.js");
const {gameById,setPoolFilter}=require("src/gameRegistry.js");
const {bossById}=require("src/bossGate.js");
const {duelOK}=require("src/solo.js");
const {boardDuel}=require("src/duel.js");
const {recruit,saveProfile}=require("src/profile.js");
const {readJSON,RUN_KEY,validRun}=require("src/persistence.js");
const {ART}=require("src/data/art.js");
const {FACE_ART}=require("src/data/faceArt.js");

const BIG=['board','mainBoard'];                       // sent only when they change
const TURN=new Set(['roll','reroll','item','bag','pkmn']); // board buttons that belong to whoever's turn it is
let nb=null;     // {role:'host'|'guest', me, peer, seq, ...} while an online board game is on this phone
let setup=null;  // {role, me, peer} while both phones are on the New Game screen
let app={};      // from app.js: action, home, startRun, setPick, tasks {wild, trainer, center, team}, trainerSpotted
let offered=null;// guest: a board game the host announced after this phone left it ({name}); mirrored in store.netOffer for the room line
// localStorage sc-net-debug=1 logs every message (tests/online-board.mjs DEBUG=1).
const debug=(()=>{try{return !!localStorage.getItem('sc-net-debug');}catch{return false;}})();
const trace=(dir,d)=>{if(debug)console.log(`nb ${dir} ${d.t}${d.id!=null?' #'+d.id:''}${d.name?' '+d.name:''}${d.kind?' '+d.kind:''}${d.t==='state'||d.t==='start'?' '+Object.keys(d.set||d.run||{}).concat(BIG.filter(k=>k in d).map(k=>'+'+k),Object.keys(d.bp||{}).map(k=>'~'+k)).join(','):''} ${JSON.stringify(d).length}`);};
// The host numbers its messages (n); a guest that sees a gap (a message lost on the way) asks for a fresh start.
const send=d=>{if(nb?.role==='host')d={...d,n:++nb.out};trace('>',d);return sendNet({k:'nb',...d});};
function setOffered(v){offered=v;store.netOffer=v?{rejoin:true,name:v.name}:null;}
const plain=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
const nameOf=i=>store.run?.players?.[i]?.name||(i?'Amber':'Sean');
const peerName=()=>nb?nameOf(nb.peer):netState().peer?.name||'Player 2';
const connected=()=>!!netState().peer;
const hosting=()=>nb?.role==='host'&&!nb.paused&&store.run===nb.run;
const guestHere=()=>hosting()&&nb.guestIn;
function setLive(){if(store.netBoard)store.netBoard.live=nb?.role==='guest'||!!nb?.guestIn;}

// ---------------------------------------------------------------- shared New Game screen
// The host invites from the room; on "Play" both phones open New Game. Each picks their own player there (the other
// panel shows the other phone's pick); the host picks the board and length and starts.
async function inviteBoard(){
 const net=netState();if(!net.peer){toast(`Waiting for player 2 to join “${net.room}”`);return;}
 if(net.peer.v&&net.peer.v!==VERSION){await openDialog({title:'Update first',body:`This phone has v${VERSION} and ${net.peer.name}'s has v${net.peer.v}. The board game needs the same version on both: close and reopen the app (or reload the page) on the older one.`,local:true});return;}
 const me=store.onlineWho??0,id=Math.random().toString(36).slice(2,9);
 setup={role:'host',me,peer:1-me,invite:id};
 send({t:'invite',id,me,v:VERSION,name:store.setupNames?.[me]||nameOf(me),character:store.setupSelected?.[me]||(me?'amber':'sean')});
 const ans=await openDialog({title:`Waiting for ${net.peer.name}…`,body:`You invited ${net.peer.name} to a board game on two phones. It opens on both phones as soon as they accept.`,choices:[{label:'Cancel',value:'cancel'}]});
 if(ans==='ok')return enterSetup();
 if(setup?.invite===id){setup=null;if(ans==='cancel')send({t:'invite-cancel',id});}
 if(ans==='no')toast(`${net.peer.name} said not now`);if(ans==='busy')toast(`${net.peer.name} is busy right now`);
}
async function invited(m){
 if(nb||store.session||store.busy||store.dialog||!['arcade','home','setup'].includes(store.view)){send({t:'invite-no',id:m.id,busy:true});return;}
 if(m.v&&m.v!==VERSION){send({t:'invite-no',id:m.id,busy:true});toast(`${m.name}'s phone has v${m.v}, this one v${VERSION}: update the older one to play the board game`,{local:true});return;}
 try{navigator.vibrate?.(60);}catch{}
 setup={role:'guest',me:1-(m.me?1:0),peer:m.me?1:0,invite:m.id};
 const ans=await openDialog({title:`${m.name} wants to play the board game!`,body:`The board game on two phones: ${m.name}'s phone runs the game, you play your turns on this one. You play as player ${setup.me+1}.`,choices:[{label:'Play',value:'play',primary:true},{label:'Not now',value:'no'}],seconds:45,timeoutValue:'no'});
 if(setup?.invite!==m.id)return;
 if(ans!=='play'){setup=null;if(ans!==null)send({t:'invite-no',id:m.id});return;}
 send({t:'invite-ok',id:m.id});app.setPick?.(setup.peer,m.character,m.name);enterSetup();
}
function enterSetup(){
 store.netSetup={role:setup.role,me:setup.me,peer:setup.peer,peerName:''};setup.invite=null;
 app.showSetup?.();sendPick();
}
function sendPick(){if(!setup)return;send({t:'pick',character:store.setupSelected?.[setup.me],name:store.setupNames?.[setup.me]});}
function leaveSetup(silent=false){if(!setup)return;if(!silent)send({t:'setup-leave'});setup=null;store.netSetup=null;}
function setupMsg(m){
 if(m.t==='invite')return void invited(m);
 if(m.t==='invite-cancel'){if(setup?.invite===m.id&&store.dialog){setup=null;closeDialog();toast('The invite was cancelled');}return;}
 if((m.t==='invite-ok'||m.t==='invite-no')&&setup?.role==='host'&&setup.invite===m.id){const d=store.dialog;if(d){store.dialog=null;document.getElementById('dialog')?.close();d.resolve(m.t==='invite-ok'?'ok':m.busy?'busy':'no');}return;}
 if(m.t==='pick'&&setup&&store.netSetup){app.setPick?.(setup.peer,m.character,m.name);return;}
 if(m.t==='setup-leave'&&setup){const who=netState().peer?.name||'Player 2';leaveSetup(true);toast(`${who} left the New Game screen`);if(store.view==='setup')app.showSetup?.();}
}

// ---------------------------------------------------------------- host
// Called by app.js when an online run starts or continues on this phone.
function hostBegin(run){
 if(!run?.online)return;
 if(nb?.role==='host'&&nb.run===run){nb.paused=false;}
 else nb={role:'host',sid:Math.random().toString(36).slice(2,9),me:run.online.host?1:0,peer:run.online.host?0:1,run,seq:0,out:0,heard:0,pending:new Map(),sent:{},showing:null,req:null,guestIn:false,paused:false,flushTimer:0};
 setup=null;store.netSetup=null;store.netBoard={role:'host',me:nb.me,live:false};setLive();
 setNetHooks({fx:hostFx,dialog:hostDialog,route:hostRoute,changed:scheduleFlush,watching:()=>hosting()&&nb.guestIn&&store.run.current===nb.peer?`${peerName()}'s challenge…`:''});
 setPoolFilter(g=>duelOK(g));
 if(netState().status==='off'&&run.online.room){const p=run.players[nb.me];joinRoom(run.online.room,{name:p.name,character:p.character,owner:p.owner}).then(()=>{store.online=true;store.onlineWho=nb?.me??0;}).catch(()=>toast(`Couldn't reach room “${run.online.room}”. ${nameOf(nb?.peer??1)}'s turns are played here for now.`,{local:true}));}
 sendStart();
}
// The host left the board (home screen): stop routing, tell the guest, abandon what was being asked (the saved run
// replays it on Continue).
function hostPause(){
 if(nb?.role!=='host'||nb.paused)return;if(store.run?.finished)return hostEnd();nb.paused=true;send({t:'pause'});
 for(const req of [...nb.pending.values()])finish(req,null);
 nb.showing=null;stopHooks();
}
function hostEnd(){if(nb?.role!=='host')return;send({t:'end'});for(const req of [...nb.pending.values()])finish(req,null);nb=null;store.netBoard=null;stopHooks();}
function stopHooks(){setNetHooks({fx:null,dialog:null,route:null,changed:null,watching:null});setPoolFilter(null);}
function sendStart(){
 if(!hosting()||!connected())return;
 clearTimeout(nb.flushTimer);nb.flushTimer=0;
 const run=store.run;nb.sent={keys:{},busy:!!store.busy};for(const [k,v] of Object.entries(rest(run)))if(v!==undefined)nb.sent.keys[k]=JSON.stringify(v);for(const k of BIG)nb.sent[k]=run[k]?boardParts(run[k]):null;
 send({t:'start',sid:nb.sid,you:nb.peer,run,busy:!!store.busy,host:nameOf(nb.me)});
}
// A board as flat parts for diffing: each top-level key, and each node of `nodes` on its own (a board is ~90 KB, most of
// it nodes; a step changes a node or two, or only the board's random state, and used to send the whole board again).
function boardParts(b){
 const out={};
 for(const [k,v] of Object.entries(b)){if(v===undefined)continue;
  if(k==='nodes'&&v&&typeof v==='object'&&!Array.isArray(v)){out['nodes/']='{}';for(const [id,n] of Object.entries(v))if(n!==undefined)out['nodes/'+id]=JSON.stringify(n);}
  else out[k]=JSON.stringify(v);}
 return out;
}
function patchBoard(b,p){
 for(const k of p.d||[]){if(k==='nodes/')delete b.nodes;else if(k.startsWith('nodes/')){if(b.nodes)delete b.nodes[k.slice(6)];}else delete b[k];}
 for(const [k,v] of Object.entries(p.s||{})){if(k==='nodes/'){if(!b.nodes||typeof b.nodes!=='object'||Array.isArray(b.nodes))b.nodes={};}else if(k.startsWith('nodes/'))(b.nodes||={})[k.slice(6)]=v;else b[k]=v;}
}
function rest(run){const out={};for(const k of Object.keys(run))if(!BIG.includes(k))out[k]=run[k];return out;}
function scheduleFlush(){if(guestHere()&&!nb.flushTimer)nb.flushTimer=setTimeout(flush,0);}
// Send what changed since the last message (always before an fx or a dialog, so the guest draws them on the right board).
function flush(){
 if(!nb||nb.role!=='host')return;clearTimeout(nb.flushTimer);nb.flushTimer=0;if(!guestHere())return;
 const run=store.run,msg={t:'state'};let any=false;
 // only the parts of the run that changed (a long run's history and log would otherwise go again with every step)
 const r=rest(run),sent=nb.sent.keys,set={},del=[];
 for(const [k,v] of Object.entries(r)){if(v===undefined)continue;const j=JSON.stringify(v);if(j!==sent[k]){set[k]=v;sent[k]=j;}}
 for(const k of Object.keys(sent))if(r[k]===undefined){del.push(k);delete sent[k];}
 if(Object.keys(set).length){msg.set=set;any=true;}if(del.length){msg.del=del;any=true;}
 // boards: whole when one appears, null when it goes, else only the parts that changed (bp)
 for(const k of BIG){const cur=run[k]?boardParts(run[k]):null,old=nb.sent[k];
  if(!cur){if(old){msg[k]=null;nb.sent[k]=null;any=true;}continue;}
  if(!old){msg[k]=run[k];nb.sent[k]=cur;any=true;continue;}
  const set={},del=[];for(const [p,j] of Object.entries(cur))if(old[p]!==j)set[p]=JSON.parse(j);for(const p of Object.keys(old))if(!(p in cur))del.push(p);
  if(Object.keys(set).length||del.length){(msg.bp||={})[k]=del.length?{s:set,d:del}:{s:set};nb.sent[k]=cur;any=true;}}
 const busy=!!store.busy;if(busy!==nb.sent.busy){nb.sent.busy=busy;any=true;}msg.busy=busy;
 if(any)send(msg);
}
function hostFx(name,args){
 // A character recruited for the guest's player (or for everyone) is also written into the run, so the guest's phone
 // adds it to its own profile even if it was offline when it happened (see owed()).
 if(name==='recruit'&&hosting()){const [id,owner]=args,theirs=store.run.players[nb.peer]?.owner;
  if(typeof id==='string'&&(owner===null||owner===theirs)){const o=store.run.online;(o.gave||=[]).push([id,owner??null,String(args[2]||'encounter')]);scheduleFlush();}}
 if(!guestHere()||!connected())return;
 if(name!=='recruit'&&(store.session||store.view!=='board'))return;
 flush();send({t:'fx',name,args:plain(args)});
}
function cleanDialog(o){const {title,source,body,html,choices,rare,seconds,timeoutValue,sheet}=o;return packBlobs({title,source,body,html,choices,rare,seconds,timeoutValue,sheet});}
function cleanRoute(o){return packBlobs({title:o.title,hint:o.hint,options:o.options});}
// Pictures inside dialogs are data: URIs (an unlock card's portrait alone can be 1 MB). Both phones run the same build,
// so a picture of the game's own art goes as "sc-art:<key>" (the guest takes it from its own ART). Any other picture
// (drawn at run time) goes once: "sc-blob:<hash>"; the guest keeps what it received and asks for what it lacks ({t:'blobs'}).
const BLOB=/data:[a-z]+\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*,[A-Za-z0-9+/=%._~-]{400,}/g,TOKEN=/sc-blob:([a-z0-9]+)/g,ARTTOKEN=/sc-art:([A-Za-z0-9:._-]+)/g;
const ART_MAPS={a:ART,f:FACE_ART};   // the build's own pictures (identical on both phones)
let artIndex=null;   // length + last 40 characters → "a:<key>" / "f:<key>" (built on first use)
const artOf=ref=>{const m=ART_MAPS[ref[0]],k=ref.slice(2);return ref[1]===':'&&m&&Object.prototype.hasOwnProperty.call(m,k)&&typeof m[k]==='string'?m[k]:null;};
function artKey(uri){
 if(!artIndex){artIndex=new Map();for(const [c,m] of Object.entries(ART_MAPS))for(const [k,v] of Object.entries(m||{}))if(typeof v==='string'&&v.length>=400&&/^[A-Za-z0-9:._-]+$/.test(k))artIndex.set(v.length+v.slice(-40),c+':'+k);}
 const ref=artIndex.get(uri.length+uri.slice(-40));return ref&&artOf(ref)===uri?ref:null;
}
const blobs=new Map();   // hash → data URI: on the host what it sent, on the guest what it received (newest last)
let blobBytes=0;
function keepBlob(h,uri){if(blobs.has(h)){blobBytes-=blobs.get(h).length;blobs.delete(h);}blobs.set(h,uri);blobBytes+=uri.length;
 while(blobBytes>48e6&&blobs.size>1){const [k,v]=blobs.entries().next().value;blobs.delete(k);blobBytes-=v.length;}}
function blobHash(t){let a=0x811c9dc5,b=0x9e3779b1;for(let i=0;i<t.length;i++){const c=t.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,2246822507);}return (a>>>0).toString(36)+(b>>>0).toString(36)+t.length.toString(36);}
function packBlobs(v){
 const json=JSON.stringify(v);if(json===undefined)return null;
 try{return JSON.parse(json.replace(BLOB,uri=>{const art=artKey(uri);if(debug)console.log(`nb pack ${uri.length} ${art||'blob'}`);if(art)return 'sc-art:'+art;const h=blobHash(uri);keepBlob(h,blobs.get(h)??uri);return 'sc-blob:'+h;}));}catch(err){console.error('Online board: could not pack pictures',err);return JSON.parse(json);}
}
// Guest: put the pictures back, asking the host for any this phone hasn't had yet (resolves once all are in, or after 20 s).
const blobWait=new Map();   // hash → [resolve...]
async function unpackBlobs(v){
 let json=JSON.stringify(v);if(!json)return v;if(json.includes('sc-art:'))json=json.replace(ARTTOKEN,(x,ref)=>artOf(ref)??'');if(!json.includes('sc-blob:'))return JSON.parse(json);
 const need=[...new Set([...json.matchAll(TOKEN)].map(x=>x[1]))].filter(h=>!blobs.has(h));
 if(need.length){
  const t0=Date.now();
  while(need.some(h=>!blobs.has(h))&&Date.now()-t0<20000&&nb){
   send({t:'blobs',ids:need.filter(h=>!blobs.has(h))});
   await Promise.race([Promise.all(need.map(h=>blobs.has(h)?null:new Promise(r=>{const l=blobWait.get(h)||[];l.push(r);blobWait.set(h,l);}))),new Promise(r=>setTimeout(r,6000))]);
  }
 }
 return JSON.parse(json.replace(TOKEN,(x,h)=>blobs.get(h)??''));
}
function gotBlob(m){if(typeof m.id!=='string')return;if(typeof m.d==='string')keepBlob(m.id,m.d);else if(!blobs.has(m.id))keepBlob(m.id,'');for(const r of blobWait.get(m.id)||[])r();blobWait.delete(m.id);}
function owner(opts){return Number.isInteger(opts?.player)?opts.player:store.run.current;}
function hostDialog(opts){
 if(!hosting()||store.session)return null;
 if(owner(opts)===nb.peer){
  if(!nb.guestIn)return null;   // they left: this phone plays their part
  const id=++nb.seq,watch=`${peerName()} ${opts.choices?.length>1?'is choosing':'is reading'} on their phone…`;
  return ask({t:'dlg',id,opts:cleanDialog(opts),own:true},{show:()=>openDialog({...opts,watch}),close:closeWatchDialog,local:()=>openDialog(opts)});
 }
 if(!guestHere())return null;
 const id=++nb.seq;nb.showing={t:'dlg',id,opts:cleanDialog(opts),own:false};flush();send(nb.showing);
 return openDialog(opts).then(v=>{if(nb?.showing?.id===id){nb.showing=null;send({t:'close',id});}return v;});
}
function hostRoute(opts){
 if(!hosting())return null;
 if(store.run.current===nb.peer){
  if(!nb.guestIn)return null;
  const id=++nb.seq;
  return ask({t:'route',id,opts:cleanRoute(opts),own:true},{show:()=>openRoutePanel({...opts,watch:`${peerName()} is choosing a road on their phone…`}),close:()=>closeRoutePanel(),local:()=>openRoutePanel(opts)});
 }
 if(!guestHere())return null;
 const id=++nb.seq;nb.showing={t:'route',id,opts:cleanRoute(opts),own:false};flush();send(nb.showing);
 return openRoutePanel({...opts,onPreview:i=>send({t:'sel',id,i})}).then(v=>{if(nb?.showing?.id===id){nb.showing=null;send({t:'close',id});}return v;});
}
function closeWatchDialog(){if(store.dialog?.watch){const d=store.dialog;store.dialog=null;document.getElementById('dialog')?.close();d.resolve(null);}}
// Ask the guest's phone and wait. While waiting this phone shows the same thing read-only; if their phone drops, the
// host can keep waiting or play that part here.
function ask(msg,{show,close,local}){
 return new Promise(resolve=>{
  const req={msg,resolve,show,close,local,lost:false,sent:Date.now()};nb.pending.set(msg.id,req);nb.req=req;
  flush();send(msg);show?.();
  if(!connected())lost(req);
 });
}
function finish(req,value){if(!nb||!nb.pending.has(req.msg.id))return;nb.pending.delete(req.msg.id);if(nb.req===req)nb.req=null;req.close?.();req.resolve(value);}
async function lost(req){
 if(req.lost||!nb)return;req.lost=true;req.close?.();
 const choice=await openDialog({title:`${peerName()}'s phone lost the connection`,body:'Wait for it to come back (it carries on where it was), or play this part on this phone.',choices:[{label:'Keep waiting',value:'wait',primary:true},{label:'Play it on this phone',value:'here'}],local:true});
 if(!nb?.pending.has(req.msg.id))return;
 req.lost=false;
 if(choice===null){req.show?.();return;}                 // closed because their phone came back
 if(choice==='wait'){req.show?.();if(!connected())lost(req);return;}
 takeOver();
}
// Their phone is gone for good: this phone plays the rest of their part (pass and play) until they rejoin.
async function takeOver(){
 if(!nb)return;nb.guestIn=false;setLive();updateBoardSafe();
 toast(`${peerName()}'s turns are played on this phone until their phone rejoins the room`,{local:true});
 for(const req of [...nb.pending.values()]){
  if(req.msg.t==='game')continue;                       // duel.js settles a game whose other phone left
  nb.pending.delete(req.msg.id);if(nb.req===req)nb.req=null;req.close?.();req.resolve(await req.local());
 }
}
function updateBoardSafe(){if(store.view==='board'&&store.run&&!store.session)updateBoard();}
function resend(){
 if(!guestHere())return;
 if(nb.showing)send(nb.showing);
 for(const req of nb.pending.values()){send(req.msg);if(req.lost&&store.dialog&&!store.dialog.watch){closeDialog();}}
}
// Pokémon battles, the Pokémon Center and the team screen run on the phone of the player they belong to.
async function netTask(kind,args,here){
 if(!hosting()||store.run.current!==nb.peer||!nb.guestIn)return here();
 const id=++nb.seq;
 const out=await ask({t:'task',id,kind,args:plain(args)},{show:()=>openDialog({title:`${peerName()}'s ${kind==='team'?'team':kind==='center'?'Pokémon Center':'battle'}`,body:`${peerName()} plays this on their phone.`,choices:[],watch:'Waiting for their phone…'}),close:closeWatchDialog,local:here});
 if(out&&out.fromGuest){adopt(store.run,out);return out.result;}
 return out;
}
// Copy the guest's run into this one in place (flows on this phone still hold the run, its players and pending).
function adopt(run,m){
 if(m.run)sync(run,m.run,BIG);
 for(const k of BIG)if(k in m){if(m[k]===null)delete run[k];else if(JSON.stringify(m[k])!==JSON.stringify(run[k]))run[k]=m[k];}
}
function sync(t,s,skip=[]){
 for(const k of Object.keys(t))if(!skip.includes(k)&&!(k in s))delete t[k];
 for(const [k,v] of Object.entries(s)){
  const cur=t[k];
  if(k==='players'&&Array.isArray(v)&&Array.isArray(cur)){v.forEach((p,i)=>cur[i]&&typeof cur[i]==='object'?sync(cur[i],p):cur[i]=p);cur.length=v.length;}
  else if(v&&cur&&typeof v==='object'&&typeof cur==='object'&&!Array.isArray(v)&&!Array.isArray(cur))sync(cur,v);
  else t[k]=v;
 }
}
// Board minigame (gameLauncher): both phones play it at once. null = play it the normal way on this phone.
async function hostGame(game){
 if(!hosting()||!nb.guestIn)return null;   // their phone offline right now: they get the game when it reconnects
 const id=++nb.seq,seed=`nb-${store.run.seed}-${store.run.turn}-${id}`,msg={t:'game',id,gameId:game.id,seed};
 nb.pending.set(id,{msg,resolve(){},local:async()=>null});
 flush();send(msg);
 const out=await boardDuel(game.id,seed,'nb'+seed,duelPlayers());
 nb?.pending.delete(id);
 return out;
}
function duelPlayers(){const run=store.run,me=run.players[nb.me],them=run.players[nb.peer];return [{...plain(me)},{...plain(them)}];}
const allowGame=g=>!!g&&duelOK(g);
const onlineGames=()=>hosting()&&nb.guestIn;
// Board buttons: returns true when the online game handled the tap.
function netAction(name,target,remote=false){
 if(nb?.role==='guest'){
  if(TURN.has(name)){
   if(store.run.current!==nb.me)toast(`It's ${nameOf(store.run.current)}'s turn`,{local:true});
   else if(!store.busy)send({t:'act',name,index:target?.dataset?.index??null});
   return true;
  }
  if(name==='home'){if(store.run?.finished)guestExit();else void guestLeave();return true;}
  if(name==='continue'||name==='board'){showBoard();return true;}
  if(['reset-run','start-run','setup'].includes(name)){toast('Only the host phone can do that',{local:true});return true;}
  return false;
 }
 if(hosting()&&!remote&&TURN.has(name)&&nb.guestIn&&store.run.current===nb.peer){
  if(!connected())void takeOverAsk();else toast(`${peerName()}'s turn: they play it on their phone`,{local:true});
  return true;
 }
 if(hosting()&&name==='home')hostPause();
 return false;
}
async function takeOverAsk(){
 const c=await openDialog({title:`${peerName()}'s phone isn't connected`,body:'Wait for it to rejoin the room, or play their turns on this phone.',choices:[{label:'Play their turns here',value:'here',primary:true},{label:'Keep waiting',value:'wait'}],local:true});
 if(c==='here')takeOver();
}
function hostMsg(m){
 nb.heard=Date.now();if(m.t==='beat')return;
 if(m.t==='in'){nb.guestIn=true;nb.heard=Date.now();setLive();updateBoardSafe();resend();return;}
 if(m.t==='hello'){sendStart();return;}
 if(m.t==='bye'){nb.guestIn=false;setLive();toast(`${peerName()} left the board game. Their turns are played on this phone now.`,{local:true});takeOver();return;}
 if(m.t==='ans'){const req=nb.pending.get(m.id);if(req)finish(req,m.value);return;}
 if(m.t==='done'){const req=nb.pending.get(m.id);if(req)finish(req,{...m,fromGuest:true});return;}
 if(m.t==='sel'){if(nb.req?.msg.id===m.id)routePreview(m.i);return;}
 if(m.t==='blobs'){if(Array.isArray(m.ids))for(const id of m.ids.slice(0,40))if(typeof id==='string')send({t:'blob',id,d:blobs.get(id)??null});return;}
 if(m.t==='act'){
  if(!hosting()||!nb.guestIn||store.run.current!==nb.peer||store.busy||!TURN.has(m.name))return;
  void app.action?.(m.name,{dataset:{index:m.index==null?undefined:String(m.index)}},true);
 }
}

// ---------------------------------------------------------------- guest
function enterGuest(m){
 // Playing something else (an arcade game) when the board game calls: not now. During the board game's own minigame the
 // fresh run is taken in quietly (the board shows when the game is over).
 if(store.session&&nb?.role!=='guest'){send({t:'busy'});return;}
 // A host phone that restarted numbers its questions from 1 again: forget the answers given to the old one.
 if(nb?.role==='guest'&&m.sid!==nb.sid){nb.answered.clear();nb.asking=null;nb.view=null;}
 if(nb?.role!=='guest'){
  if(offered?.declined){setOffered({name:m.host,declined:true});app.refresh?.();return;}
  nb={role:'guest',sid:m.sid,me:m.you,peer:1-m.you,own:store.run,inN:0,heard:0,gave:0,answered:new Map(),asking:null,view:null,drag:null,fxBusy:0,playing:null,lostOpen:false};
  setup=null;store.netSetup=null;store.netBoard={role:'guest',me:m.you,live:true};
 }
 setOffered(null);
 nb.sid=m.sid;nb.inN=m.n||0;nb.helloAt=0;nb.resync=false;
 if(nb.lostOpen){nb.lostOpen=false;if(store.dialog&&!store.dialog.watch)closeDialog();}
 const zoom=store.run===m.run?null:nb.zoom;
 store.run=m.run;if(zoom)store.run.zoom=zoom;store.busy=!!m.busy;nb.gave=0;owed();
 if(!store.session){showView('board');updateBoard(true);const realm=store.run.board.nodes[store.run.players[store.run.current].node]?.realm;if(realm)setMusicZone(realm);if(store.profile.settings.music)startMusic();}
 send({t:'in'});
}
function applyState(m){
 const run=store.run;if(!run)return;nb.zoom=run.zoom;let boards=false;
 if(m.set||m.del){for(const k of m.del||[])if(!BIG.includes(k))delete run[k];for(const [k,v] of Object.entries(m.set||{}))if(!BIG.includes(k))run[k]=v;if(nb.zoom)run.zoom=nb.zoom;}
 for(const k of BIG)if(k in m){if(m[k]===null)delete run[k];else run[k]=m[k];boards=true;}
 for(const [k,p] of Object.entries(m.bp||{})){if(!BIG.includes(k))continue;if(run[k])patchBoard(run[k],p);else nb.resync=true;boards=true;}
 if('busy' in m)store.busy=!!m.busy;
 owed();
 if(run.finished){if(store.view!=='finished'&&!store.session)app.finishScreen?.();return;}
 if(store.view==='board'&&!store.session)updateBoard(boards);
}
// Characters the host recruited for this phone's player (run.online.gave): add each to this phone's profile once.
function owed(){
 const list=store.run?.online?.gave;if(!Array.isArray(list))return;const mine=store.run.players?.[nb.me]?.owner;let changed=false;
 for(;nb.gave<list.length;nb.gave++){const [id,owner,reason]=list[nb.gave]||[];if(typeof id==='string'&&(owner===null||owner===mine)&&recruit(store.profile,id,owner,reason))changed=true;}
 if(changed)saveProfile(store.profile);
}
function showBoard(){if(store.session)return;store.arcade=false;showView('board');updateBoard(true);}
// A dialog this phone opened for itself (Leave the game?, the story log, settings...) stays up: a dialog, battle or game
// the host sends meanwhile waits until it is closed (opening it would have closed the guest's own menu under their finger).
const localOpen=()=>!!nb&&(nb.leaving||localBusy())&&!!store.dialog&&!store.dialog.watch;
async function afterLocal(){while(localOpen())await new Promise(r=>setTimeout(r,150));}
// The host's own dialogs show here read-only; the guest's own ones are answered here.
async function guestDialog(m){
 if(m.own){
  if(nb.answered.has(m.id)){send({t:'ans',id:m.id,value:nb.answered.get(m.id)});return;}
  if(nb.asking===m.id)return;
  nb.asking=m.id;nb.view=null;const opts=await unpackBlobs(m.opts);await afterLocal();if(!nb||nb.asking!==m.id)return;const v=await openDialog(opts);
  if(!nb||nb.asking!==m.id)return;nb.asking=null;
  if(v===null)return;                                   // closed by something else; the host asks again
  nb.answered.set(m.id,v);send({t:'ans',id:m.id,value:v});
 }else{
  if(nb.view===m.id&&store.dialog?.watch)return;
  nb.view=m.id;const opts=await unpackBlobs(m.opts);await afterLocal();if(!nb||nb.view!==m.id)return;const who=nameOf(nb.peer);openDialog({...opts,watch:`${who} ${opts.choices?.length>1?'is choosing':'is reading'} on their phone…`});
 }
}
async function guestRoute(m){
 if(store.view!=='board'||!document.getElementById('route-panel'))showBoard();
 if(m.own){
  if(nb.answered.has(m.id)){send({t:'ans',id:m.id,value:nb.answered.get(m.id)});return;}
  if(nb.asking===m.id)return;
  nb.asking=m.id;nb.view=null;const opts=await unpackBlobs(m.opts);if(!nb||nb.asking!==m.id)return;closeWatch();
  const v=await openRoutePanel({...opts,onPreview:i=>send({t:'sel',id:m.id,i})});
  if(!nb||nb.asking!==m.id)return;nb.asking=null;if(v===null)return;
  nb.answered.set(m.id,v);send({t:'ans',id:m.id,value:v});
 }else{nb.view=m.id;const opts=await unpackBlobs(m.opts);if(!nb||nb.view!==m.id)return;openRoutePanel({...opts,watch:`${nameOf(nb.peer)} is choosing a road on their phone…`});}
}
function closeWatch(){if(store.dialog?.watch){const d=store.dialog;store.dialog=null;document.getElementById('dialog')?.close();d.resolve(null);}closeRoutePanel();}
async function guestTask(m){
 if(nb.answered.has(m.id)){send(nb.answered.get(m.id));return;}
 if(nb.asking===m.id)return;nb.asking=m.id;await afterLocal();if(!nb||nb.asking!==m.id)return;closeWatch();
 const run=store.run,p=run.players[run.current],fn=app.tasks?.[m.kind],before={};for(const k of BIG)before[k]=run[k]?JSON.stringify(run[k]):'';
 let result=null;trace('task-run',m);try{result=fn?await fn(run,p,...(m.args||[])):null;}catch(err){console.error('Online task failed',m.kind,err);}
 if(!nb||nb.asking!==m.id)return;nb.asking=null;
 const out={t:'done',id:m.id,result:plain(result),run:rest(run)};for(const k of BIG){const j=run[k]?JSON.stringify(run[k]):'';if(j!==before[k])out[k]=run[k]||null;}   // boards only if the task changed them
 nb.answered.set(m.id,out);send(out);showBoard();
}
async function guestGame(m){
 if(nb.playing===m.id||nb.answered.has(m.id))return;nb.playing=m.id;await afterLocal();if(!nb||nb.playing!==m.id)return;closeWatch();   // played already: duel.js re-sends the result
 const run=store.run,players=[plain(run.players[nb.me]),plain(run.players[nb.peer])];
 await boardDuel(m.gameId,m.seed,'nb'+m.seed,players);
 if(!nb)return;nb.playing=null;nb.answered.set(m.id,true);showBoard();
}
const FX={
 showLevelCard:(realm,o)=>showLevelCard(realm,o),showBossCard:id=>{const b=bossById(id);if(b)return showBossCard(b);},
 showDragBanner:(name,total)=>{nb.drag?.close();nb.drag=showDragBanner(name,total);},
 dragBanner:(n,lost)=>{if(n<0){nb.drag?.close();nb.drag=null;}else nb.drag?.update(n,lost);},
 showGentlemenCard:()=>showGentlemenCard(),showSmashCard:()=>showSmashCard(),showLandingBanner:(t,s)=>showLandingBanner(t,s),
 animateDice:o=>animateDice(o),animateItemTransfers:b=>animateItemTransfers(b),boardFeedback:(b,o)=>boardFeedback(b,o),turnFeedback:p=>turnFeedback(p),
 warpTransition:o=>warpTransition(()=>updateBoard(true),o),
 animateRoulette:(id,filter,themed)=>{const g=gameById(id);if(g)return animateRoulette(g,filter,themed?themed.map(gameById).filter(Boolean):null,{watch:store.run?.current===nb.me?'Your challenge…':`${nameOf(nb.peer)}'s challenge…`});},
 sound:name=>{if(!nb.fxBusy&&!soundRecent(name))sound(name);},
 setMusicZone:z=>setMusicZone(z),toast:t=>toast(t,{local:true}),fanfare:()=>playFanfare(),
 recruit:(id,owner,reason)=>{const mine=store.run?.players?.[nb.me]?.owner;if(owner===null||owner===mine){if(recruit(store.profile,id,owner,reason))saveProfile(store.profile);}},
 trainerSpotted:(i,nodeId)=>{const n=store.run?.board.nodes[nodeId];if(n)return app.trainerSpotted?.(i,n);},
};
async function runFx(name,args){
 const f=FX[name];if(!f)return;
 if(name==='recruit'){f(...(args||[]));return;}
 if(store.session||store.view!=='board')return;
 if(name==='animateRoulette'&&localOpen())return;   // the wheel is a dialog: not over the guest's own menu
 nb.fxBusy++;try{await f(...(args||[]));}catch(err){console.error('Online board effect failed',name,err);}finally{if(nb)nb.fxBusy--;}
}
async function guestLeave(){
 if(nb.leaving)return;nb.leaving=true;const g=nb;
 const c=await openDialog({title:'Leave the online game?',body:`${nameOf(nb.peer)}'s phone keeps the game and plays your turns until you rejoin from the room.`,choices:[{label:'Leave',value:'leave',danger:true},{label:'Stay',value:'stay',primary:true}],local:true});
 g.leaving=false;
 if(c!=='leave'||nb?.role!=='guest')return;
 send({t:'bye'});setOffered({name:nameOf(nb.peer),declined:true});guestExit();
}
function guestExit(){
 if(nb?.role!=='guest')return;const own=nb.own;nb.drag?.close();closeWatch();nb=null;store.netBoard=null;
 const saved=readJSON(RUN_KEY);store.run=validRun(saved)?saved:own&&validRun(own)?own:null;store.busy=false;
 app.home?.();
}
// Guest: rejoin a board game this phone left (from the room line).
function rejoinBoard(){if(nb)return;setOffered(null);send({t:'hello'});}
async function guestPaused(){
 if(nb?.role!=='guest')return;closeWatch();nb.lostOpen=true;
 const c=await openDialog({title:`${nameOf(nb.peer)} paused the game`,body:'It carries on here as soon as their phone continues the run.',choices:[{label:'Leave the game',value:'leave'}],local:true});
 if(nb)nb.lostOpen=false;
 if(c==='leave'){send({t:'bye'});setOffered({name:nameOf(nb?.peer??0),declined:true});guestExit();}
}
function guestMsg(m){
 if(m.t==='start')return enterGuest(m);
 // Not in the game any more (our "bye" may have been lost): say so again when the host asks us something.
 if(!nb||nb.role!=='guest'){if(['dlg','route','task','game'].includes(m.t)&&(m.own||m.t==='task'||m.t==='game'))send({t:'bye'});return;}
 nb.heard=Date.now();
 // a message went missing: ask for a fresh start, and keep asking (every 3 s, at the latest with the next beat) until it comes
 if(m.n){if(nb.inN&&m.n>nb.inN+1)nb.resync=true;nb.inN=Math.max(nb.inN,m.n);if(nb.resync&&Date.now()-(nb.helloAt||0)>3000){nb.helloAt=Date.now();trace('gap',{t:'resync'});send({t:'hello'});}}
 if(m.t==='beat')return;
 if(m.t==='blob')return gotBlob(m);
 if(m.t==='state')return applyState(m);
 if(m.t==='fx')return void runFx(m.name,m.args);
 if(m.t==='dlg')return void guestDialog(m);
 if(m.t==='route')return void guestRoute(m);
 if(m.t==='sel'){if(nb.view===m.id)routePreview(m.i);return;}
 if(m.t==='close'){if(nb.view===m.id){nb.view=null;closeWatch();}return;}
 if(m.t==='task')return void guestTask(m);
 if(m.t==='game')return void guestGame(m);
 if(m.t==='pause')return void guestPaused();
 if(m.t==='end'){toast('The online game is over',{local:true});guestExit();}
}

// ---------------------------------------------------------------- wiring
// Every 4 s the host says where its numbering is (a guest that missed the last messages notices the gap) and asks
// again whatever has waited 8 s for the guest's answer (a lost question or a lost answer).
function heartbeat(){
 if(nb?.role!=='host'||!nb.guestIn||nb.paused||!connected())return;
 send({t:'beat'});
 const now=Date.now();for(const req of nb.pending.values())if(req.msg.t!=='game'&&now-(req.sent||now)>8000){req.sent=now;send(req.msg);}
}
function initNetBoard(hooks){
 app={...app,...hooks};
 setInterval(heartbeat,4000);
 onNet(ev=>{
  if(ev.t==='msg'){const m=ev.d;if(!m||m.k!=='nb')return;trace('<',m);
   if(['invite','invite-ok','invite-no','invite-cancel','pick','setup-leave'].includes(m.t))return setupMsg(m);
   if(nb?.role==='host')return hostMsg(m);
   if(m.t==='start'&&(nb?.role==='guest'||!nb))return guestMsg(m);
   return guestMsg(m);}
  if(ev.t==='join'){if(setup&&store.netSetup)sendPick();if(nb?.role==='host')sendStart();return;}
  if(ev.t==='welcome'){if(nb?.role==='guest')send({t:'hello'});else if(nb?.role==='host')sendStart();if(setup)sendPick();return;}
  if(ev.t==='leave'){
   if(setup){leaveSetup(true);if(store.view==='setup')app.showSetup?.();}
   if(nb?.role==='host'&&nb.guestIn){if(nb.req)lost(nb.req);}
   if(nb?.role==='guest'&&!nb.lostOpen){nb.lostOpen=true;closeWatch();void openDialog({title:`${nameOf(nb.peer)}'s phone lost the connection`,body:'The game carries on here as soon as it comes back.',choices:[{label:'Leave the game',value:'leave'}],local:true}).then(c=>{if(nb)nb.lostOpen=false;if(c==='leave'){send({t:'bye'});setOffered({name:nameOf(nb?.peer??0),declined:true});guestExit();}});}
  }
  if(ev.t==='lost'&&nb?.role==='guest')guestExit();
 });
}
const netBoardState=()=>nb&&{role:nb.role,me:nb.me,peer:nb.peer,guestIn:nb.role==='host'?nb.guestIn:true};
Object.assign(exports,{initNetBoard,inviteBoard,leaveSetup,sendPick,hostBegin,hostPause,hostEnd,netAction,netTask,hostGame,allowGame,onlineGames,rejoinBoard,netBoardState});
