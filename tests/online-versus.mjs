// Online versus (two phones play each other move by move): src/duel.js versus + cpuKit tell/onlineMoves/netPump.
// Needs the Worker running locally: `cd cloudflare && npx wrangler dev --local --port 8787` (SC_NET_HOST to change).
// For every ported game (or GAMES=<id-regex>): Sean challenges Amber, both phones play random legal moves for their own
// seat only, and both must end on the same result with no desync. Also checks a lost move is sent again (DROP), Resign
// (chess/checkers after RESIGN plies), leaving mid-game (the other phone wins) and claiming the win when their phone dropped.
import {launchBrowser,root,screenshotPath} from './lib.mjs';
import path from 'node:path';import {pathToFileURL} from 'node:url';
const HOST=process.env.SC_NET_HOST||'ws://127.0.0.1:8787';
const ALL=['wopr-grid','matrix-ultimate','four-lights','strategema-grid','greed-island-mancala','office-dots-boxes','deadite-checkers','ten-forward-chess','trek-mini-chess'];
const GAMES=ALL.filter(id=>new RegExp(process.env.GAMES||'.').test(id)),RESIGN=+(process.env.RESIGN||24);
const url=pathToFileURL(path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html')).href;
let failed=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)failed++;};
const browser=await launchBrowser();
async function phone(tag){
 const ctx=await browser.newContext({viewport:{width:390,height:780}});const p=await ctx.newPage();const errors=[],warns=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(/online desync|online move failed/.test(m.text()))warns.push(m.text());});
 await p.addInitScript(h=>{try{localStorage.setItem('sc-net-host',h);}catch{}},HOST);
 await p.goto(url);await p.waitForSelector('.title-screen',{timeout:60000});await p.waitForFunction(()=>!document.getElementById('boot'));
 return {p,errors,warns,tag};
}
const act=(ph,name,data={})=>ph.p.evaluate(([name,data])=>{const b=document.createElement('button');b.dataset.action=name;Object.assign(b.dataset,data);document.body.append(b);b.click();b.remove();},[name,data]);
const dialogText=ph=>ph.p.evaluate(()=>document.querySelector('#dialog[open]')?.innerText||'');
const choose=(ph,label)=>ph.p.evaluate(l=>{const b=[...document.querySelectorAll('#dialog[open] button')].find(b=>b.textContent.trim().startsWith(l));b?.click();return !!b;},label);
const waitDialog=(ph,re,ms=20000)=>ph.p.waitForFunction(r=>new RegExp(r).test(document.querySelector('#dialog[open]')?.innerText||''),re.source,{timeout:ms});
async function join(ph,who){
 await act(ph,'arcade');await ph.p.waitForSelector('.solo-strip');
 await act(ph,'online-mode');await waitDialog(ph,/Play online/);
 await ph.p.fill('#net-room','Versus Room');await ph.p.check(`input[name="net-who"][value="${who}"]`);
 await choose(ph,'Join room');
}
// One random legal move for this phone's own seat (engine debug hooks; a call that the engine accepts sends a move).
const botStep=(ph,resignAt)=>ph.p.evaluate(resignAt=>{
 const s=window.ShambConkins.store.session;if(!s||!s.alive||!s.net||s.waiting||s.paused||document.querySelector('.pass-overlay'))return null;
 const net=s.net,d=s.debug||{},me=net.seat,sent=net.sent.length,grew=()=>net.sent.length>sent,mix=n=>[...Array(n).keys()].sort(()=>Math.random()-.5);
 const eng=s.game.engine,turn={tictactoe:d.turn,connect4:d.player,reversi:d.player,minichess:d.turn}[eng]??d.state?.turn;
 if(turn!==me||d.busy)return {sent,moved:false};
 if(resignAt&&(eng==='chess'||eng==='checkers')&&sent+net.got>=resignAt&&me===0){const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Resign');b?.click();b?.click();return {sent,moved:true,resigned:true};}
 const tryAll=(list,f)=>{for(const a of list){f(a);if(grew())return true;}return false;};
 if(eng==='tictactoe')tryAll(mix(9),i=>d.play(i));
 else if(eng==='ultimate')tryAll(mix(81),i=>d.play(i));
 else if(eng==='connect4')tryAll(mix(7),c=>d.drop(c));
 else if(eng==='reversi')tryAll(mix(36),i=>d.place(Math.floor(i/6),i%6));
 else if(eng==='mancala')tryAll(mix(14),i=>d.sow(i));
 else if(eng==='dots')tryAll(mix(45),i=>i<20?d.line('h',i):d.line('v',i-20));
 else if(eng==='chess'||eng==='checkers')tryAll(mix(64),f=>{d.choose(f);if(!grew())tryAll(mix(64),t=>d.choose(t));});
 else if(eng==='minichess'){const ms=d.legal();if(ms.length)d.move(ms[Math.floor(Math.random()*ms.length)]);}
 return {sent:net.sent.length,moved:grew()};
},resignAt);
const resultRe=/wins the duel|Dead heat|You win/;
async function startMatch(A,B,id){
 await act(A,'duel-propose',{id});await waitDialog(A,/Waiting for Amber/);await waitDialog(B,/Sean challenges you/);await choose(B,'Play');
 for(const ph of [A,B]){await waitDialog(ph,/ONLINE MATCH/);await choose(ph,'Start game');}
 for(const ph of [A,B]){await ph.p.waitForFunction(()=>!!window.ShambConkins.store.session?.net,null,{timeout:20000});await ph.p.waitForSelector('.pass-overlay [data-ready]');}
 const card=await A.p.evaluate(()=>document.querySelector('.pass-overlay')?.innerText||'');
 for(const ph of [A,B])await ph.p.click('.pass-overlay [data-ready]');
 return card;
}
// Result card, then any recruit cards, until the phone is back in the Arcade room.
async function backToRoom(ph){
 for(let i=0;i<20;i++){
  const st=await ph.p.evaluate(()=>({dialog:!!document.querySelector('#dialog[open]'),view:window.ShambConkins.store.view}));
  if(!st.dialog&&st.view==='arcade')return;
  if(st.dialog&&!await choose(ph,'Back to the room'))await ph.p.evaluate(()=>{const bs=[...document.querySelectorAll('#dialog[open] button')];(bs.find(b=>b.classList.contains('primary'))||bs[0])?.click();});
  await ph.p.waitForTimeout(400);
 }
}
const A=await phone('A'),B=await phone('B');
await join(A,0);await A.p.waitForFunction(()=>/waiting for player 2/.test(document.querySelector('.net-room')?.innerText||''),null,{timeout:15000});
await join(B,1);await A.p.waitForFunction(()=>/Amber is here/.test(document.querySelector('.net-room')?.innerText||''),null,{timeout:15000});
check(true,'both phones in the room');
check(await A.p.evaluate(()=>!!document.querySelector('[data-action="duel-propose"][data-id="wopr-grid"]')||[...document.querySelectorAll('.arcade-card')].length<30),'ported games have Challenge buttons');
let first=true;
for(const id of GAMES){
 const card=await startMatch(A,B,id);
 if(first)check(/ONLINE · YOU ARE SEAN/.test(card)&&/Sean vs Amber/.test(card),'intro card names this phone\'s player');
 const seats=await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>window.ShambConkins.store.session.net.seat)));
 check(seats[0]===0&&seats[1]===1,`${id}: Sean seat 0, Amber seat 1`);
 // DROP: Sean's second move is never sent; the ack/resend has to deliver it
 if(first)await A.p.evaluate(()=>{const net=window.ShambConkins.store.session.net,orig=net.send;let dropped=false;net.send=(name,args)=>{if(!dropped&&net.sent.length===1){dropped=true;net.sent.push({m:{k:'mv',mid:net.mid,n:1,name,args,r:net.draws?.()},at:Date.now()});return;}orig(name,args);};});
 const t0=Date.now();let done=false,moves=0;
 while(Date.now()-t0<240000){
  const r=await Promise.all([botStep(A,RESIGN),botStep(B,0)]);moves+=r.filter(x=>x?.moved).length;
  const [ta,tb]=await Promise.all([dialogText(A),dialogText(B)]);
  if(resultRe.test(ta)&&resultRe.test(tb)){done=true;break;}
  await A.p.waitForTimeout(120);
 }
 const [ta,tb]=await Promise.all([dialogText(A),dialogText(B)]);
 check(done,`${id}: both phones reach the result (${moves} moves, ${((Date.now()-t0)/1000).toFixed(0)} s)`);
 const winA=/Sean wins/.test(ta)?'Sean':/Amber wins/.test(ta)?'Amber':/Dead heat/.test(ta)?'tie':'?',winB=/Sean wins/.test(tb)?'Sean':/Amber wins/.test(tb)?'Amber':/Dead heat/.test(tb)?'tie':'?';
 const sa=ta.match(/(\d+) – (\d+)/),sb=tb.match(/(\d+) – (\d+)/);
 check(winA===winB&&winA!=='?'&&sa&&sb&&sa[1]===sb[2]&&sa[2]===sb[1],`${id}: same result on both phones (${winA}; ${sa?.[0]} / ${sb?.[0]})`);
 if(first){await A.p.screenshot({path:screenshotPath('versus-result.png')});first=false;}
 await backToRoom(A);await backToRoom(B);
}
check(!A.warns.length&&!B.warns.length,'no desync / failed moves '+[...A.warns,...B.warns].slice(0,3).join(' | '));
// Leaving mid-game: Amber exits, Sean wins
{
 const id=GAMES.includes('four-lights')?'four-lights':GAMES[0];await startMatch(A,B,id);
 for(let i=0;i<4;i++){await Promise.all([botStep(A,0),botStep(B,0)]);await A.p.waitForTimeout(500);}
 await A.p.screenshot({path:screenshotPath('versus-play.png')});
 await act(B,'exit-game');await waitDialog(B,/Leave this match/);await choose(B,'Leave match');
 await waitDialog(A,/Sean wins the duel/,15000).catch(()=>{});await waitDialog(B,/Sean wins the duel/,15000).catch(()=>{});
 const la=await dialogText(A),lb=await dialogText(B);
 check(/Amber left. You win/.test(la)&&/Sean wins the duel/.test(lb),'leaving mid-game gives the other phone the win'+` (${la.slice(0,90).replace(/\s+/g,' ')} | ${lb.slice(0,90).replace(/\s+/g,' ')})`);
 await backToRoom(A);await backToRoom(B);
}
// Their phone dropped out: Sean claims the win, and Amber's phone learns the match is over
{
 await startMatch(A,B,GAMES.includes('wopr-grid')?'wopr-grid':GAMES[0]);
 for(let i=0;i<2;i++){await Promise.all([botStep(A,0),botStep(B,0)]);await A.p.waitForTimeout(500);}
 await A.p.evaluate(()=>{window.ShambConkins.store.session.net.peerGone=true;});
 await act(A,'exit-game');await waitDialog(A,/lost the connection/);await choose(A,'Claim the win');
 await waitDialog(A,/You win/,10000).catch(()=>{});await waitDialog(B,/Sean wins the duel/,15000).catch(()=>{});
 const ca=await dialogText(A),cb=await dialogText(B);
 check(/You win/.test(ca)&&/Sean wins the duel/.test(cb),`claiming the win ends the match on both phones (${ca.slice(0,40).replace(/\s+/g,' ')} | ${cb.slice(0,40).replace(/\s+/g,' ')})`);
 await backToRoom(A);await backToRoom(B);
}
check(!A.errors.length&&!B.errors.length,'no page errors '+[...A.errors,...B.errors].slice(0,2).join(' | '));
await browser.close();console.log(failed?`${failed} versus check(s) failed`:'VERSUS OK');process.exit(failed?1:0);
