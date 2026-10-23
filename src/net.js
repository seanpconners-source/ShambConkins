// Online rooms: two phones meet by typing the same room name (cloudflare/worker.js, one Durable Object per room).
// This file only connects, keeps the connection alive (reconnecting with the same seat after a drop) and passes
// messages; src/duel.js decides what they mean. Needs the internet; the rest of the game stays offline.
const {VERSION}=require("src/version.js");
const DEFAULT_HOST='shambconkins.loki-mylo.work';
// The game's own site, else the default site (a downloaded file or another server). Tests set localStorage sc-net-host.
function netBase(){
 try{const o=localStorage.getItem('sc-net-host');if(o)return o.replace(/\/+$/,'');}catch{}
 const l=globalThis.location;
 if(l&&l.protocol==='https:'&&/(^|\.)loki-mylo\.work$|\.workers\.dev$/.test(l.hostname))return `wss://${l.host}`;
 return `wss://${DEFAULT_HOST}`;
}
// One id per tab (sessionStorage): a reload or a dropped connection gets the same seat back.
function clientId(){try{let id=sessionStorage.getItem('sc-net-id');if(!id){id=Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem('sc-net-id',id);}return id;}catch{return 'p'+Math.random().toString(36).slice(2);}}
const roomKey=name=>String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
const net={room:null,seat:null,me:null,peer:null,status:'off',ws:null,tries:0,retry:null,ping:null};
const handlers=new Set();
const emit=ev=>{for(const h of [...handlers])try{h(ev);}catch(e){console.error(e);}};
function setStatus(status){if(net.status===status)return;net.status=status;emit({t:'status',status});}
function onNet(fn){handlers.add(fn);return ()=>handlers.delete(fn);}
function netState(){return net;}
function sendNet(d){if(net.ws?.readyState!==1)return false;try{net.ws.send(JSON.stringify({t:'msg',d}));return true;}catch{return false;}}
// first: the join itself (failure leaves the room and rejects); later calls are reconnects (failure retries with backoff).
function open(first){
 return new Promise((resolve,reject)=>{
  clearTimeout(net.retry);let ws=null,done=false,timer=null;
  const giveUp=reason=>{net.room=null;net.ws=null;clearInterval(net.ping);setStatus('off');if(first)reject(new Error(reason));else emit({t:'lost',reason});};
  const fail=reason=>{if(done)return;done=true;clearTimeout(timer);
   if(first||reason==='full'){const w=ws;giveUp(reason);try{w?.close();}catch{}}else{try{ws?.close();}catch{}resolve(null);}};
  try{ws=new WebSocket(`${netBase()}/room/${encodeURIComponent(net.room)}`);}catch{fail('offline');if(!first)retry();return;}
  net.ws=ws;timer=setTimeout(()=>fail('timeout'),12000);
  ws.onopen=()=>ws.send(JSON.stringify({t:'hello',id:clientId(),name:net.me.name,character:net.me.character,owner:net.me.owner,v:VERSION}));
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch{return;}
   if(m.t==='welcome'){done=true;clearTimeout(timer);net.seat=m.seat;net.peer=m.peers[0]||null;net.tries=0;setStatus('in-room');
    clearInterval(net.ping);net.ping=setInterval(()=>{try{ws.send('ping');}catch{}},25000);resolve({seat:net.seat,peer:net.peer});emit({t:'welcome',peer:net.peer});}
   else if(m.t==='full')fail('full');
   else if(m.t==='join'){net.peer=m.peer;emit({t:'join',peer:m.peer});}
   else if(m.t==='leave'){const was=net.peer;net.peer=null;emit({t:'leave',peer:was});}
   else if(m.t==='msg')emit({t:'msg',d:m.d,from:m.from});};
  ws.onclose=()=>{clearTimeout(timer);if(net.ws!==ws)return;clearInterval(net.ping);net.ws=null;
   if(!done)fail('unreachable');
   if(net.room)retry();};
 });
}
function retry(){setStatus('reconnecting');clearTimeout(net.retry);net.retry=setTimeout(()=>{if(net.room)open(false);},Math.min(15000,1000*2**net.tries++));}
// Resolves {seat, peer} once in the room; rejects Error('full' | 'timeout' | 'unreachable' | 'offline' | 'name').
function joinRoom(name,me){
 leaveRoom();const room=roomKey(name);if(!room)return Promise.reject(new Error('name'));
 net.room=room;net.me=me;net.tries=0;setStatus('connecting');
 return open(true);
}
function leaveRoom(){
 const ws=net.ws;net.room=null;net.peer=null;net.seat=null;net.ws=null;clearTimeout(net.retry);clearInterval(net.ping);
 if(ws)try{ws.close(1000,'left');}catch{}
 setStatus('off');
}
// Back online after the phone slept or lost signal: reconnect at once instead of waiting out the backoff.
if(globalThis.addEventListener)for(const ev of ['online','visibilitychange'])addEventListener(ev,()=>{if(net.room&&net.status==='reconnecting'&&!document.hidden){net.tries=0;open(false);}});
Object.assign(exports,{joinRoom,leaveRoom,sendNet,onNet,netState,roomKey,netBase});
