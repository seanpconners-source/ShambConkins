// Checks the live online rooms from outside (Node 22+, built-in WebSocket): the site answers, a room seats two phones,
// messages go both ways, a phone that reconnects gets its seat back, a third phone hears "full", and a stream like a
// real-time game's (~30 messages a second each way) gets through without drops. Prints one line per check.
//   node tools/net-probe.mjs [https://shambconkins.loki-mylo.work] [stream seconds, default 20]
// Run by hand or from the "Probe the online rooms" workflow (.github/workflows/net-probe.yml), which also tails the
// Worker's logs while it runs.
const BASE=(process.argv[2]||'https://shambconkins.loki-mylo.work').replace(/\/+$/,''),WSS=BASE.replace(/^http/,'ws');
const STREAM_S=+(process.argv[3]||20);
let failed=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)failed++;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const rnd=()=>Math.random().toString(36).slice(2,8);

async function http(path,headers={}){
 const t=Date.now();
 try{const r=await fetch(BASE+path,{headers,redirect:'manual'});const body=(await r.text()).slice(0,200).replace(/\s+/g,' ');
  return {status:r.status,body,ms:Date.now()-t,ray:r.headers.get('cf-ray'),server:r.headers.get('server')};}
 catch(e){return {status:0,body:String(e.cause?.code||e.message),ms:Date.now()-t};}
}
// One phone: resolves once welcomed (or rejects with the reason), then collects what arrives.
function phone(room,id,name){
 return new Promise((resolve,reject)=>{
  const t0=Date.now(),ws=new WebSocket(`${WSS}/room/${encodeURIComponent(room)}`),p={ws,id,got:[],events:[],closed:null};
  const timer=setTimeout(()=>{reject(new Error('timeout 12 s'));try{ws.close();}catch{}},12000);
  ws.onopen=()=>{p.openMs=Date.now()-t0;ws.send(JSON.stringify({t:'hello',id,name,character:'sean',owner:'Sean',v:'probe'}));};
  ws.onerror=e=>p.events.push('error '+(e.message||''));
  ws.onclose=e=>{p.closed={code:e.code,reason:e.reason,at:Date.now()-t0};clearTimeout(timer);reject(new Error(`closed ${e.code} ${e.reason||''} after ${Date.now()-t0} ms (${p.events.join(', ')||'no error event'})`));};
  ws.onmessage=e=>{if(e.data==='pong'){p.pong=Date.now();return;}let m;try{m=JSON.parse(e.data);}catch{return;}
   if(m.t==='welcome'){clearTimeout(timer);p.seat=m.seat;p.welcomeMs=Date.now()-t0;resolve(p);}
   else if(m.t==='full'){clearTimeout(timer);reject(new Error('full'));}
   else if(m.t==='msg')p.got.push({d:m.d,at:Date.now()});
   else p.events.push(m.t);};
 });
}
const send=(p,d)=>p.ws.send(JSON.stringify({t:'msg',d}));
const close=p=>{try{p.ws.close(1000,'left');}catch{}};

console.log(`probing ${BASE} at ${new Date().toISOString()}`);
const v=await http('/version');check(v.status===200,`/version → ${v.status} "${v.body}" in ${v.ms} ms (cf-ray ${v.ray})`);
const r=await http('/room/probe');check(r.status===426,`/room/probe without upgrade → ${r.status} "${r.body}" (want 426 Expected a WebSocket)`);
const u=await http(`/room/probe-${rnd()}`,{Upgrade:'websocket',Connection:'Upgrade','Sec-WebSocket-Version':'13','Sec-WebSocket-Key':'dGhlIHNhbXBsZSBub25jZQ=='});
console.log(`info raw upgrade request → ${u.status} "${u.body}"`);

// Joins: several rooms in a row, like opening the Online dialog again and again.
for(let i=0;i<6;i++){
 const room=`probe-${rnd()}`;
 try{const a=await phone(room,'a'+rnd(),'A'),b=await phone(room,'b'+rnd(),'B');
  check(a.seat===0&&b.seat===1,`join ${i+1}: seats ${a.seat}/${b.seat}, open ${a.openMs}/${b.openMs} ms, welcome ${a.welcomeMs}/${b.welcomeMs} ms`);
  send(a,{k:'hi',n:1});send(b,{k:'hi',n:2});await wait(800);
  check(a.got.length===1&&b.got.length===1,`join ${i+1}: messages both ways (${a.got.length}/${b.got.length})`);
  close(a);close(b);}
 catch(e){check(false,`join ${i+1}: ${e.message}`);}
 await wait(500);
}
// Same id again = the seat comes back (a reload or a dropped connection); a third phone hears "full".
{const room=`probe-${rnd()}`,ida='a'+rnd();
 try{const a=await phone(room,ida,'A'),b=await phone(room,'b'+rnd(),'B');
  const a2=await phone(room,ida,'A');check(a2.seat===0,`rejoin with the same id gets seat ${a2.seat} back`);
  await phone(room,'c'+rnd(),'C').then(()=>check(false,'third phone was seated'),e=>check(e.message==='full',`third phone → ${e.message}`));
  // the first socket of A was replaced: it must not still count
  close(a2);await wait(600);const c=await phone(room,'c'+rnd(),'C').catch(e=>e);
  check(c&&c.seat===0,`after A leaves, a new phone gets seat ${c?.seat ?? c?.message}`);
  for(const p of [a,b,c])p&&p.ws&&close(p);}
 catch(e){check(false,`rejoin/full: ${e.message}`);}}
// Stream like a real-time game: 30 messages a second each way, 300-1500 chars, for STREAM_S seconds; count drops and lag.
{const room=`probe-${rnd()}`;
 try{const a=await phone(room,'a'+rnd(),'A'),b=await phone(room,'b'+rnd(),'B');
  let n=0;const t0=Date.now(),pad='x'.repeat(1200);
  while(Date.now()-t0<STREAM_S*1000){n++;const at=Date.now();send(a,{k:'s',n,at,p:pad.slice(0,300+(n*37)%900)});send(b,{k:'s',n,at,p:pad.slice(0,300+(n*53)%900)});
   if(n%300===0){a.ws.send('ping');b.ws.send('ping');}await wait(33);}
  await wait(1500);
  const lag=p=>{const l=p.got.map(g=>g.at-g.d.at).sort((x,y)=>x-y);return l.length?`median ${l[l.length>>1]} ms, p99 ${l[Math.floor(l.length*.99)]} ms`:'none';};
  const order=p=>p.got.every((g,i)=>g.d.n===i+1);
  check(a.got.length===n&&b.got.length===n,`stream ${STREAM_S} s: sent ${n} each way, got ${b.got.length} (A→B) and ${a.got.length} (B→A)`);
  check(order(a)&&order(b),'stream: in order');
  console.log(`info stream lag A→B ${lag(b)}; B→A ${lag(a)}; pongs ${a.pong?'yes':'no'}/${b.pong?'yes':'no'}`);
  check(!a.closed&&!b.closed,`stream: sockets stayed open (${JSON.stringify([a.closed,b.closed])})`);
  close(a);close(b);}
 catch(e){check(false,`stream: ${e.message}`);}}
console.log(failed?`${failed} probe check(s) failed`:'ONLINE ROOMS OK');
process.exit(failed?1:0);
