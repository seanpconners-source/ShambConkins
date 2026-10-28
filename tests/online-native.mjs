// Native online games (src/netPlay.js): two phones in one room play a CPU-opponent game head to head. Needs the Worker
// running locally like tests/online.mjs (SC_NET_HOST). Each phone's bot only taps what is enabled on its own screen
// (its own answers, moves and hand-off/next buttons), so the game only finishes if every move reaches the other phone.
// Checks: both phones deal the same game (same first question / board), it reaches the result on both, the two result
// cards agree (mine–theirs mirrored), no page errors. GAMES=id,id (default the batch-1 games); screenshots onn-*.
// SHOT_S=n takes the screenshots n seconds into the game, VIEW=1100x700 sets both phones' screen size. LAG=80-150 holds every message back 80..150 ms (in order, with jitter) on both phones.
import {launchBrowser,root,screenshotPath} from './lib.mjs';
import path from 'node:path';import {pathToFileURL} from 'node:url';
const HOST=process.env.SC_NET_HOST||'ws://127.0.0.1:8787',LIMIT=+process.env.LIMIT_S||240;
const GAMES=(process.env.GAMES||'trivia-mixed,trivia-lightning,trivia-wager,trivia-survival,paddys-beer-pong,shamb-uno,ten-forward-chess,four-lights,strategema-grid,full-shambyahtzee,cheaters-yahtzee,blackjack,five-card,roulette,bond-baccarat,traitors-guess-who,battleship-fog,liars-dice,clue-whodunit,monopoly-speed-die,monopoly-auction,simon-faceoff,price-bid-off,django-hangman-showdown,django-hangman-wanted,matrix-ultimate,greed-island-mancala,office-dots-boxes,trek-mini-chess,wopr-grid,smb3-nspade,clue-lineup,django-hangman,taskmaster-curling,bug-artillery,happy-gilmore-golf,color-of-money,baseketball-shootout,task-tallest-thing,fast-quarter-mile,block-battle,shred-hero,candy-color-dash,chutes-ladder-rush,brawndo-fruit-merge,candy-gumdrop-catch,review-pancakes,terminator-scan,microgame-rush,rush-marathon,pong-duel,derezzed-cycles,snake-v-snake,metal-gear-tank-duel,kill-bill-duel,arrow-arena,battle-royale-island,bomber-duel,pac-maze-duel,driller-duel,bubble-battle,snowball-fight,disc-duel').split(',');
const SHOT_S=+process.env.SHOT_S||0; // screenshot once both phones play and SHOT_S seconds have passed
const LAG=/^\d+-\d+$/.test(process.env.LAG||'')?process.env.LAG.split('-').map(Number):null;
const url=pathToFileURL(path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html')).href;
let failed=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)failed++;};
const browser=await launchBrowser();
async function phone(tag){
 // VIEW2: a different screen size for Amber's phone (e.g. a landscape phone against a portrait one)
 const [vw,vh]=((tag==='Amber'&&process.env.VIEW2)||process.env.VIEW||'390x780').split('x').map(Number),ctx=await browser.newContext({viewport:{width:vw,height:vh}});const p=await ctx.newPage();const errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 // engine crashes are caught by the launcher (console.error 'Game engine failure'): count them as errors too
 p.on('console',m=>{if(m.type()==='error'&&/engine failure|TypeError|ReferenceError|RangeError/.test(m.text()))errors.push('console: '+m.text().slice(0,300));});
 await p.addInitScript(h=>{try{localStorage.setItem('sc-net-host',h);}catch{}},HOST);
 // NETCOUNT=1: count what this phone sends to the room (messages and bytes), printed per game
 await p.addInitScript(()=>{const W=WebSocket.prototype,o=W.send;window.__wsc={n:0,b:0};W.send=function(d){window.__wsc.n++;window.__wsc.b+=d?.length||0;return o.call(this,d);};});
 await p.goto(url,{timeout:+process.env.NAV_MS||180000});await p.waitForSelector('.title-screen',{timeout:Math.max(60000,+process.env.NAV_MS||0)});await p.waitForFunction(()=>!document.getElementById('boot'));
 await p.evaluate(()=>{window.ShambConkins.store.profile.settings.reducedMotion=true;});
 return {p,errors,tag};
}
const act=(ph,name,data={})=>ph.p.evaluate(([name,data])=>{const b=document.createElement('button');b.dataset.action=name;Object.assign(b.dataset,data);document.body.append(b);b.click();b.remove();},[name,data]);
const choose=(ph,label)=>ph.p.evaluate(l=>{const b=[...document.querySelectorAll('#dialog[open] button')].find(b=>b.textContent.trim().startsWith(l));b?.click();return !!b;},label);
const waitDialog=(ph,re,ms=20000)=>ph.p.waitForFunction(r=>new RegExp(r).test(document.querySelector('#dialog[open]')?.innerText||''),re.source,{timeout:ms});
const A=await phone('Sean'),B=await phone('Amber');
for(const [ph,who] of [[A,0],[B,process.env.SAME_WHO?0:1]]){await act(ph,'online-home');await waitDialog(ph,/Play online/);await ph.p.fill('#net-room',process.env.ROOM||'Native Night');await ph.p.check(`input[name="net-who"][value="${who}"]`);await choose(ph,'Join room');await ph.p.waitForSelector('.net-room');}
await A.p.waitForFunction(()=>/ is here/.test(document.querySelector('.net-room')?.innerText||''),null,{timeout:15000});
// Bot step: tap whatever this phone may tap. Game-specific hooks (s.debug.bot) play moves where buttons aren't enough.
const step=ph=>ph.p.evaluate(()=>{
 const S=window.ShambConkins,store=S.store,s=store.session,dlg=document.getElementById('dialog');
 if(dlg.open){const t=dlg.querySelector('#dialog-title')?.innerText||'';if(/wins the duel|Dead heat|left\. You win|You stopped|win together|team goes down/i.test(t))return 'result:'+t;
  const b=[...dlg.querySelectorAll('button')].find(b=>!b.disabled&&/Start game|Continue|OK|Welcome/i.test(b.innerText));if(b){b.click();return 'dlg:'+t;}return 'wait:'+t;}
 if(!s)return 'idle';
 if(s.debug?.net)window.__net=JSON.stringify(s.debug.net);
 const ready=document.querySelector('.pass-overlay [data-ready]');if(ready){ready.click();return 'ready';}
 if(typeof s.debug?.bot==='function'){const r=s.debug.bot();if(r)return 'bot:'+r;}
 const ans=[...document.querySelectorAll('[data-answer]:not([disabled]),[data-wager]:not([disabled])')];if(ans.length){ans[Math.floor(Math.random()*ans.length)].click();return 'answer';}
 const next=[...document.querySelectorAll('#trivia-next button,#mode-next button,.game-controls button.primary')].find(b=>!b.disabled&&b.offsetParent);if(next){next.click();return 'next';}
 return 'play';
});
for(const id of GAMES){
 console.log('== '+id);
 await act(A,'duel-propose',{id});await waitDialog(B,/challenges you/);await choose(B,'Play');
 for(const ph of [A,B])await waitDialog(ph,/Head to head/,15000).then(()=>choose(ph,'Start game'),async()=>{check(false,`${ph.tag}: rules card says head to head`);console.log(' dialog:',(await ph.p.evaluate(()=>document.querySelector('#dialog[open]')?.innerText||'(none)')).slice(0,300).replace(/\s+/g,' '));});
 try{await A.p.waitForFunction(()=>!!window.ShambConkins.store.session,null,{timeout:20000});await B.p.waitForFunction(()=>!!window.ShambConkins.store.session,null,{timeout:20000});}
 catch(err){console.log(' no session:',...await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>(document.querySelector('#dialog[open]')?.innerText||document.body.innerText||'').slice(0,240).replace(/\s+/g,' ')))),[...A.errors,...B.errors].slice(0,3).join(' | '));throw err;}
 const same=await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>{const s=window.ShambConkins.store.session;return JSON.stringify({seed:s.seed,me:s.online?.me,q:s.debug?.question?.id??s.debug?.rounds?.[0]?.id??null});})));
 const [ja,jb]=same.map(x=>JSON.parse(x));
 check(ja.seed===jb.seed&&ja.me===0&&jb.me===1,`${id}: same seed, Sean plays seat 1 and Amber seat 2`);
 // LAG=lo-hi: every move this phone sends is held back lo..hi ms (in order, with jitter), like a slow phone network
 if(LAG)for(const ph of [A,B])await ph.p.evaluate(([lo,hi])=>{const ch=window.ShambConkins.store.session.online,orig=ch.send.bind(ch);let last=0;ch.send=m=>{const at=Math.max(last,performance.now()+lo+Math.random()*(hi-lo));last=at;setTimeout(()=>orig(m),at-performance.now());};},LAG);
 // STALL=sec:A|B:ms[,...]: sec seconds into the game, that phone holds every move it sends for ms (a network stall), then
 // sends them all in order
 const stalls=(process.env.STALL||'').split(',').filter(Boolean).map(x=>{const [t,w,ms]=x.split(':');return {t:+t,ph:w==='B'?B:A,ms:+ms||3000,done:false};});
 const t0=Date.now();let ra='',rb='',shot=false,counts={};
 const wc0=await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>({...window.__wsc}))));
 const limit=LIMIT*(id==='paddys-beer-pong'&&!process.env.LIMIT_S?1.75:1); // a full Beer Pong match runs to last call, ~4-5 min headless
 // HOLD=at,secs[,Amber|Sean]: at `at` s into the game that phone's outgoing game messages are held for `secs` s, then sent at once
 // (a network stall); the game must recover with both phones agreeing afterwards
 const STALL=(process.env.HOLD||'').split(',');let stalled=0;
 if(STALL.length>=2)await (STALL[2]==='Sean'?A:B).p.evaluate(()=>{const ch=window.ShambConkins.store.session.online,orig=ch.send.bind(ch),q=[];window.__stall=ms=>{window.__held=true;setTimeout(()=>{window.__held=false;for(const m of q.splice(0))orig(m);},ms);};ch.send=m=>{if(window.__held)q.push(m);else orig(m);};});
 while(Date.now()-t0<limit*1000){
  if(STALL.length>=2&&!stalled&&Date.now()-t0>=+STALL[0]*1000){stalled=1;console.log(' stall',STALL.join(' '));await (STALL[2]==='Sean'?A:B).p.evaluate(ms=>window.__stall(ms),+STALL[1]*1000);}
  const [a,b]=[await step(A),await step(B)];for(const x of [a,b]){const k=x.split(':')[0];counts[k]=(counts[k]||0)+1;}
  if(!shot&&a.startsWith('play')&&b.startsWith('play')&&Date.now()-t0>=SHOT_S*1000){shot=true;
   // SHOT_JS: an expression run on Sean's phone (s = the session) just before the screenshots, e.g. to move a player away
   if(process.env.SHOT_JS){await A.p.evaluate(js=>{const s=window.ShambConkins.store.session;return new Function('s',js)(s);},process.env.SHOT_JS);await A.p.waitForTimeout(700);}
   await A.p.screenshot({path:screenshotPath(`onn-${id}-sean.png`)});await B.p.screenshot({path:screenshotPath(`onn-${id}-amber.png`)});}
  for(const st of stalls)if(!st.done&&Date.now()-t0>=st.t*1000){st.done=true;console.log(` stall: ${st.ph.tag} holds its moves for ${st.ms} ms`);
   await st.ph.p.evaluate(ms=>{const ch=window.ShambConkins.store.session?.online;if(!ch)return;const orig=ch.send.bind(ch),q=[];ch.send=m=>q.push(m);setTimeout(()=>{ch.send=orig;for(const m of q)orig(m);},ms);},st.ms);}
  if(a.startsWith('result'))ra=a;if(b.startsWith('result'))rb=b;if(ra&&rb)break;
  // AT_JS='secs:code;;secs:code': run code on BOTH phones (s = the session, me = its seat) once the game has run secs
  // seconds, e.g. to teleport players to a boss or hold one phone's messages back ('stall'); prints what it returns
  if(process.env.AT_JS){globalThis.__atDone??=new Set();for(const [k,part] of process.env.AT_JS.split(';;').entries()){const at=+part.slice(0,part.indexOf(':')),js=part.slice(part.indexOf(':')+1);
   if(globalThis.__atDone.has(id+k)||Date.now()-t0<at*1000)continue;globalThis.__atDone.add(id+k);
   console.log(' at',at+'s',...await Promise.all([A,B].map(ph=>ph.p.evaluate(js=>{try{const s=window.ShambConkins.store.session;return JSON.stringify(s?new Function('s','me',js)(s,s.online?.me):null);}catch(e){return 'ERR '+e.message;}},js))));}}
  // PROBE: an expression (s = the session) printed for both phones every PROBE_S (5) seconds, to watch a game's state
  if(process.env.PROBE&&Date.now()-(globalThis.__probeT||0)>(+process.env.PROBE_S||5)*1000){globalThis.__probeT=Date.now();
   console.log(' probe',Math.round((Date.now()-t0)/1000)+'s',...await Promise.all([A,B].map(ph=>ph.p.evaluate(js=>{try{const s=window.ShambConkins.store.session;return JSON.stringify(s?new Function('s',js)(s):null);}catch(e){return 'ERR '+e.message;}},process.env.PROBE))));}
  await A.p.waitForTimeout(200);
 }
 console.log(' steps',JSON.stringify(counts));
 if(process.env.NETCOUNT){const wc=await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>({...window.__wsc})))),secs=(Date.now()-t0)/1000;
  console.log(' sent',[A,B].map((ph,i)=>`${ph.tag} ${((wc[i].n-wc0[i].n)/secs).toFixed(1)} msg/s ${((wc[i].b-wc0[i].b)/secs/1024).toFixed(1)} KB/s`).join(', '),`over ${secs.toFixed(0)} s`);}
 check(ra&&rb,`${id}: both phones reach the result (${ra||'-'} / ${rb||'-'})`);
 if(ra&&rb){
  const [ta,tb]=await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>document.querySelector('#dialog[open]')?.innerText||'')));
  const nums=t=>(t.match(/(\d[\d,]*)\s*–\s*(\d[\d,]*)/)||[]).slice(1,3).map(x=>+x.replace(/,/g,''));
  const [na,nb]=[nums(ta),nums(tb)];
  if(process.env.NETSTAT)console.log(' net stats',...await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>window.__net||null))));
  console.log(' final scores',JSON.stringify(await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>window.__lastScores||null)))));
  check(na.length===2&&nb.length===2&&na[0]===nb[1]&&na[1]===nb[0],`${id}: result cards agree (Sean ${na.join('–')} / Amber ${nb.join('–')})`);
  for(const ph of [A,B])await choose(ph,'Back to the room');
 }else{console.log(' stuck:',JSON.stringify(await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>{const s=window.ShambConkins.store.session;return {phase:s?.debug?.phase,clock:s?.debug?.clock,log:(s?.debug?.log||[]).slice(-6)};})))),'errors:',[...A.errors,...B.errors].slice(0,3).join(' | '));
  await A.p.screenshot({path:screenshotPath(`onn-${id}-stuck-sean.png`)});await B.p.screenshot({path:screenshotPath(`onn-${id}-stuck-amber.png`)});
  for(const ph of [A,B])await ph.p.evaluate(()=>{const S=window.ShambConkins;S.store.session?.dispose();S.store.session=null;S.store.busy=false;document.getElementById('dialog').open&&document.getElementById('dialog').close();S.store.dialog=null;});}
 // clear leftover cards (a new character won, toasts) before the next challenge
 for(let i=0;i<40;i++){const open=await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>{const d=document.getElementById('dialog');if(!d.open)return false;const b=[...d.querySelectorAll('button')].find(b=>!b.disabled&&/Welcome|Continue|OK|Back to/i.test(b.innerText));b?.click();return true;})));if(!open.some(Boolean)&&i>4)break;await A.p.waitForTimeout(300);}
 await A.p.waitForTimeout(800);
}
const errs=[...new Set([...A.errors,...B.errors])];check(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
await browser.close();console.log(failed?`${failed} native online check(s) failed`:'NATIVE ONLINE OK');process.exit(failed?1:0);
