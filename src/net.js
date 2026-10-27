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
// One id per tab (sessionStorage): a reload or a dropped connection gets the same seat back. A duplicated tab copies
// sessionStorage, so two tabs can share an id; the room then hands the seat to the newer one (close 4000 "replaced")
// and the older tab takes a fresh id instead of fighting for the seat (newId).
let memId=null;
function clientId(){try{let id=sessionStorage.getItem('sc-net-id');if(!id){id=Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem('sc-net-id',id);}return id;}catch{return memId||=('p'+Math.random().toString(36).slice(2));}}
function newId(){memId=null;try{sessionStorage.removeItem('sc-net-id');}catch{}}
// The last connection events (tries, opens, closes with their codes), shown when joining fails and kept for bug reports.
const log=[];
function netLog(what){log.push(`${new Date().toTimeString().slice(0,8)} ${what}`);if(log.length>30)log.shift();}
function netLogText(n=10){return log.slice(-n).join('\n');}
const roomKey=name=>String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
const net={room:null,seat:null,me:null,peer:null,status:'off',ws:null,tries:0,retry:null,ping:null};
const handlers=new Set();
const emit=ev=>{for(const h of [...handlers])try{h(ev);}catch(e){console.error(e);}};
function setStatus(status){if(net.status===status)return;net.status=status;emit({t:'status',status});}
function onNet(fn){handlers.add(fn);return ()=>handlers.delete(fn);}
function netState(){return net;}
// The room drops messages over 16 KB, so a big one (an online board game's whole board) goes in parts and is put
// back together on the other phone (WebSocket keeps them in order).
const PART=5000;let partSerial=0;const parts=new Map();   // 5000 chars stay under 16 KB even if every quote is escaped
function sendNet(d){
 if(net.ws?.readyState!==1)return false;
 try{const s=JSON.stringify(d);
  if(s.length<=PART){net.ws.send(JSON.stringify({t:'msg',d}));return true;}
  const id=++partSerial+'.'+Math.random().toString(36).slice(2,6),n=Math.ceil(s.length/PART);
  for(let i=0;i<n;i++)net.ws.send(JSON.stringify({t:'msg',d:{k:'part',id,i,n,s:s.slice(i*PART,(i+1)*PART)}}));
  return true;}catch{return false;}
}
function joinPart(d){
 if(typeof d.id!=='string'||!Number.isInteger(d.i)||!Number.isInteger(d.n)||d.n>2000||typeof d.s!=='string')return null;
 let p=parts.get(d.id);if(!p){if(parts.size>8)parts.delete(parts.keys().next().value);p={n:d.n,got:0,s:[]};parts.set(d.id,p);}
 if(p.s[d.i]===undefined){p.s[d.i]=d.s;p.got++;}
 if(p.got<p.n)return null;parts.delete(d.id);try{return JSON.parse(p.s.join(''));}catch{return null;}
}
// first: the join itself (failure leaves the room and rejects); later calls are reconnects (failure retries with backoff).
function open(first){
 return new Promise((resolve,reject)=>{
  clearTimeout(net.retry);let ws=null,done=false,timer=null,opened=false,code=0;const t0=Date.now();
  // what went wrong, for the error card: did the connection open at all, how it closed, after how long
  const detail=reason=>{const e=new Error(reason);e.info={opened,code,ms:Date.now()-t0};return e;};
  const giveUp=reason=>{net.room=null;net.ws=null;clearInterval(net.ping);setStatus('off');if(first)reject(detail(reason));else emit({t:'lost',reason});};
  const fail=reason=>{if(done)return;done=true;clearTimeout(timer);
   if(first||reason==='full'){const w=ws;giveUp(reason);try{w?.close();}catch{}}else{try{ws?.close();}catch{}resolve(null);}};
  netLog(`${first?'join':'reconnect'} ${net.room}`);
  try{ws=new WebSocket(`${netBase()}/room/${encodeURIComponent(net.room)}`);}catch(e){netLog('cannot open: '+e.message);fail('offline');if(!first)retry();return;}
  net.ws=ws;timer=setTimeout(()=>{netLog(`no answer after 12 s (${opened?'opened':'never opened'})`);fail('timeout');},12000);
  ws.onopen=()=>{opened=true;netLog(`open after ${Date.now()-t0} ms`);ws.send(JSON.stringify({t:'hello',id:clientId(),name:net.me.name,character:net.me.character,owner:net.me.owner,v:VERSION}));};
  ws.onmessage=e=>{net.lastIn=Date.now();let m;try{m=JSON.parse(e.data);}catch{return;}
   if(m.t==='welcome'){netLog(`seat ${m.seat+1} after ${Date.now()-t0} ms`);done=true;clearTimeout(timer);net.seat=m.seat;net.peer=m.peers[0]||null;net.tries=0;setStatus('in-room');
    // ping every 10 s (the room answers by itself); a socket that hears nothing for 35 s is half-open: reconnect
    clearInterval(net.ping);net.lastIn=Date.now();net.ping=setInterval(()=>{if(Date.now()-net.lastIn>35000&&!document.hidden){reconnectNet();return;}try{ws.send('ping');}catch{}},10000);resolve({seat:net.seat,peer:net.peer});emit({t:'welcome',peer:net.peer});}
   else if(m.t==='full')fail('full');
   else if(m.t==='join'){net.peer=m.peer;emit({t:'join',peer:m.peer});}
   else if(m.t==='leave'){const was=net.peer;net.peer=null;emit({t:'leave',peer:was});}
   else if(m.t==='msg'){const d=m.d?.k==='part'?joinPart(m.d):m.d;if(d)emit({t:'msg',d,from:m.from});}};
  ws.onclose=ev=>{code=ev?.code||0;clearTimeout(timer);if(net.ws!==ws)return;netLog(`closed ${code}${ev?.reason?' '+ev.reason:''} after ${Date.now()-t0} ms`);clearInterval(net.ping);net.ws=null;
   // another tab or device took this seat with the same id: let it have it (reconnecting would knock it out in turn)
   if(code===4000&&done){newId();giveUp('replaced');return;}
   if(!done)fail('unreachable');
   if(net.room)retry();};
 });
}
function retry(){setStatus('reconnecting');clearTimeout(net.retry);net.retry=setTimeout(()=>{if(net.room)open(false);},Math.min(15000,1000*2**net.tries++));}
// Resolves {seat, peer} once in the room; rejects Error('full' | 'timeout' | 'unreachable' | 'offline' | 'name').
// A failed connection is tried three times (a phone waking up, a Wi-Fi hand-over, a slow first answer) before giving
// up; the error then carries err.info {opened, code, ms, site: 'ok'|'down'|'?', online} for a useful message.
async function joinRoom(name,me){
 leaveRoom();const room=roomKey(name);if(!room)throw new Error('name');
 let err=null;
 for(let k=0;k<3;k++){
  if(k)await new Promise(r=>setTimeout(r,k===1?800:2500));
  net.room=room;net.me=me;net.tries=0;setStatus('connecting');
  try{return await open(true);}catch(e){err=e;if(e.message==='full'||e.message==='name')throw e;}
 }
 err.info={...err.info,online:navigator.onLine!==false,site:await siteReachable()};
 console.warn('Online room: could not join',room,err.message,JSON.stringify(err.info));
 throw err;
}
// Does the game's site answer plain web requests? (The room needs a WebSocket on top; when the site answers but the
// socket can't open, something on the way — a blocker extension, antivirus, VPN or network filter — stops it.)
async function siteReachable(){
 const url=netBase().replace(/^ws/,'http')+'/version';
 try{const c=new AbortController(),t=setTimeout(()=>c.abort(),6000);await fetch(url,{mode:'no-cors',cache:'no-store',signal:c.signal});clearTimeout(t);return 'ok';}
 catch{return 'down';}
}
// A connection that went quiet without closing (a half-open socket): drop it and reconnect with the same seat.
function reconnectNet(){const ws=net.ws;if(ws&&net.room)try{ws.close(4002,'stale');}catch{}}
function leaveRoom(){
 const ws=net.ws;net.room=null;net.peer=null;net.seat=null;net.ws=null;clearTimeout(net.retry);clearInterval(net.ping);
 if(ws)try{ws.close(1000,'left');}catch{}
 setStatus('off');
}
// Back online after the phone slept or lost signal: reconnect at once instead of waiting out the backoff.
if(globalThis.addEventListener)for(const ev of ['online','visibilitychange'])addEventListener(ev,()=>{if(net.room&&net.status==='reconnecting'&&!document.hidden){net.tries=0;open(false);}});
Object.assign(exports,{joinRoom,leaveRoom,reconnectNet,sendNet,onNet,netState,roomKey,netBase,netLogText});
