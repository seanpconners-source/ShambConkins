// Online board game on two phones (src/netBoard.js). Needs the Worker running locally, like tests/online.mjs:
// `cd cloudflare && npx wrangler dev --local --port 8787` (SC_NET_HOST to change). Sean's phone invites Amber's from the
// room, both pick on the shared New Game screen, Sean's phone starts and hosts the run. A bot on each phone answers only
// what is enabled on that phone (its own dialogs, road choices and roll button; minigames are banked), so the run only
// moves if every decision reaches the right phone. Checks: both phones keep the same players/turn, each phone rolls on
// its own turns, minigames are played on both phones, the waiting phone shows read-only dialogs, no page errors.
// TURNS=n (default 8) board turns; screenshots → /tmp/claude-0/sc/onb-*.
import {versusStep} from './versusBot.mjs';
import {launchBrowser,root,screenshotPath} from './lib.mjs';
import path from 'node:path';import {pathToFileURL} from 'node:url';
const HOST=process.env.SC_NET_HOST||'ws://127.0.0.1:8787',TURNS=+process.env.TURNS||8,LIMIT=+process.env.LIMIT_S||420;
const url=pathToFileURL(path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html')).href;
let failed=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)failed++;};
const browser=await launchBrowser(),T0=Date.now();
async function phone(tag){
 const ctx=await browser.newContext({viewport:{width:390,height:780}});const p=await ctx.newPage();const errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(([h,d])=>{try{localStorage.setItem('sc-net-host',h);if(d)localStorage.setItem('sc-net-debug','1');}catch{}},[HOST,!!process.env.DEBUG]);
 const log=[];p.on('console',m=>{if(/^nb |error/i.test(m.text()))log.push(`${((Date.now()-T0)/1000).toFixed(1)} ${m.text()}`);});
 await p.goto(url);await p.waitForSelector('.title-screen',{timeout:60000});await p.waitForFunction(()=>!document.getElementById('boot'));
 await p.evaluate(()=>{const s=window.ShambConkins;s.pkmn?.auto?.(menu=>menu.kind==='party'?menu.list.findIndex(m=>m.hp>0):menu.kind==='yesno'?1:0);s.pkmn?.speed?.(8);s.store.profile.settings.reducedMotion=true;document.body.classList.add('reduced-motion');});
 return {p,errors,tag,stats:{},log};
}
const act=(ph,name,data={})=>ph.p.evaluate(([name,data])=>{const b=document.createElement('button');b.dataset.action=name;Object.assign(b.dataset,data);document.body.append(b);b.click();b.remove();},[name,data]);
const choose=(ph,label)=>ph.p.evaluate(l=>{const b=[...document.querySelectorAll('#dialog[open] button')].find(b=>b.textContent.trim().startsWith(l));b?.click();return !!b;},label);
const waitDialog=(ph,re,ms=20000)=>ph.p.waitForFunction(r=>new RegExp(r).test(document.querySelector('#dialog[open]')?.innerText||''),re.source,{timeout:ms});
const A=await phone('Sean'),B=await phone('Amber');
for(const [ph,who] of [[A,0],[B,1]]){
 await act(ph,'online-home');await waitDialog(ph,/Play online/);
 await ph.p.fill('#net-room','Board Night');await ph.p.check(`input[name="net-who"][value="${who}"]`);await choose(ph,'Join room');
 await ph.p.waitForSelector('.net-room');
}
await A.p.waitForFunction(()=>/Amber is here/.test(document.querySelector('.net-room')?.innerText||''),null,{timeout:15000});
check(await A.p.$('[data-action="online-board"]')!==null,'the room line offers "Board game together"');
await act(A,'online-board');await waitDialog(B,/wants to play the board game/);check(true,'Amber gets the board game invite');
await choose(B,'Play');
for(const ph of [A,B])await ph.p.waitForSelector('.net-setup',{timeout:15000});
check(true,'both phones open the shared New Game screen');
// Amber picks someone else on her phone; Sean's phone shows it
const pick=await B.p.evaluate(()=>{const t=[...document.querySelectorAll('.cs-grid[data-player="1"] .cs-tile:not([disabled])')].find(b=>!b.classList.contains('selected'));t?.click();return t?.dataset.id||null;});
if(pick)await A.p.waitForFunction(id=>window.ShambConkins.store.setupSelected?.[1]===id,pick,{timeout:8000}).then(()=>check(true,`Sean's phone shows Amber's pick (${pick})`),()=>check(false,'Amber\'s pick reaches Sean\'s phone'));
check(await B.p.$('[data-action="start-run"]')===null,'only the host phone has the start button');
await A.p.screenshot({path:screenshotPath('onb-setup-host.png')});await B.p.screenshot({path:screenshotPath('onb-setup-guest.png')});
await A.p.selectOption('#run-length','12').catch(()=>{});
await act(A,'start-run');
await B.p.waitForFunction(()=>window.ShambConkins.store.netBoard?.role==='guest'&&document.body.dataset.view==='board',null,{timeout:30000});
check(true,'Amber\'s phone joins the board as the guest');
if(pick)check(await A.p.evaluate(id=>window.ShambConkins.store.run.players[1].character===id,pick),'the run uses Amber\'s pick');

// One bot step on a phone: answer only what this phone may answer.
const step=ph=>ph.p.evaluate(()=>{
 const SC=window.ShambConkins,store=SC.store,dlg=document.getElementById('dialog');
 if(store.session){const s=store.session;if(!s.solo)return 'game2p';if(s.net)return 'versus:'+s.game.id;if(!s.__t)s.__t=performance.now();
  if(!s.__bank&&s.alive&&performance.now()-s.__t>1200){s.__bank=true;s.solo.banked=true;s.solo.won=Math.random()<.5;s.finish([50+Math.floor(Math.random()*400),0],'bot bank');return 'bank';}return 'game';}
 if(dlg.open){
  const title=dlg.querySelector('#dialog-title')?.innerText||'';
  if(dlg.querySelector('.dialog-watch'))return 'watch:'+title;
  const avoid=/Stop waiting|Leave|Skip|Cancel|Not now|Erase|Exit|Reset|Flee|limp/i;
  const btns=[...dlg.querySelectorAll('button')].filter(b=>!b.disabled&&!avoid.test(b.innerText));
  if(!btns.length)return 'wait:'+title;
  const b=btns.find(b=>b.classList.contains('primary'))||btns[Math.floor(Math.random()*btns.length)];b.click();return 'dlg:'+title;
 }
 const go=document.querySelector('[data-action="route-go"]:not([disabled])');if(go){go.click();return 'route';}
 for(const c of document.querySelectorAll('.level-card,.boss-card,.smash-card,.gentlemen-card'))c.click();
 const roll=document.querySelector('[data-action="roll"]:not([disabled])');if(roll&&store.view==='board'&&!store.busy){roll.click();return 'roll';}
 return store.netBoard?.role==='guest'?'idle-guest':'idle';
});
const view=ph=>ph.p.evaluate(()=>{const r=window.ShambConkins.store.run;return r&&{turn:r.turn,current:r.current,finished:!!r.finished,players:r.players.map(p=>({node:p.node,points:p.points,items:p.items.join()}))};});
// PKMN=1: wild Pokémon on every step, so battles happen on both phones' turns (the guest's run on its own phone).
if(process.env.PKMN)await A.p.evaluate(()=>{window.ShambConkins.store.forceWildChance=.35;});
// VERSUS=1: the board deals only the turn-based versus games, and both phones play them move by move.
if(process.env.VERSUS)await A.p.evaluate(()=>{window.ShambConkins.store.testPool=g=>/chess|checkers|lights|strategema|wopr|ultimate|mancala|dots/.test(g.id);});
// DROP=n: at turn n the guest's connection drops once while it's answering something; play carries on after it reconnects.
const DROP=+process.env.DROP||0;let dropped=false;
// WARP=1: on Amber's first turn her piece is put on a warp pipe: the warp dialog is hers, both phones swap boards.
let warped=!process.env.WARP,sawWarp=false;
const t0=Date.now();let mismatches=0,agree=0,shots=new Set(),last=null,stuck=0;
const tally=(ph,s)=>{const k=s.split(':')[0];ph.stats[k]=(ph.stats[k]||0)+1;if(k==='dlg'||k==='watch')(ph.titles||=new Set()).add(s.slice(k.length+1));};
for(;;){
 // Compare when the host waits for a roll with nothing open (the guest has had a moment to catch up)
 if(await A.p.evaluate(()=>{const s=window.ShambConkins.store;return !s.busy&&s.run?.phase==='board'&&!document.getElementById('dialog').open&&!s.session;})){
  await A.p.waitForTimeout(400);const [x,y]=[await view(A),await view(B)];if(JSON.stringify(x)===JSON.stringify(y))agree++;else{mismatches++;if(mismatches<4)console.log('mismatch',JSON.stringify(x),JSON.stringify(y));}}
 if(DROP&&!dropped&&(await view(A))?.turn>=DROP&&await B.p.evaluate(()=>{const d=document.getElementById('dialog');return d.open&&!d.querySelector('.dialog-watch')||!!document.querySelector('[data-action="route-go"]:not([disabled])');})){
  dropped=true;await B.p.evaluate(()=>window.ShambConkins.net.state().ws?.close());console.log('dropped the guest connection');await A.p.screenshot({path:screenshotPath('onb-host-lost.png')});}
 if(!warped&&await A.p.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;return run.current===1&&!S.store.busy&&run.phase==='board'&&!document.getElementById('dialog').open&&run.board.format!=='warp';})){
  warped=true;await A.p.evaluate(()=>{const S=window.ShambConkins,run=S.store.run,w=Object.values(run.board.nodes).find(n=>n.type==='warp');run.players[1].node=w.id;S.focusBoardAction(run);S.updateBoard(true);S.resolveLanding();});console.log('Amber lands on a warp pipe');}
 if(!sawWarp&&process.env.WARP&&await B.p.evaluate(()=>window.ShambConkins.store.run?.board?.format==='warp'&&!!window.ShambConkins.store.run.warp)){sawWarp=true;await B.p.screenshot({path:screenshotPath('onb-guest-warp.png')});}
 const [sa,sb]=[await step(A),await step(B)];tally(A,sa);tally(B,sb);
 if(sa.startsWith('versus')||sb.startsWith('versus')){for(const ph of [A,B])await versusStep(ph,{resign:(ph.vmoves=(ph.vmoves||0)+1)>120});if(!shots.has('vs')){shots.add('vs');await B.p.screenshot({path:screenshotPath('onb-guest-versus.png')});}}
 else A.vmoves=B.vmoves=0;
 if(sb.startsWith('watch')&&!shots.has('gw')){shots.add('gw');await B.p.screenshot({path:screenshotPath('onb-guest-watching.png')});}
 if(sa.startsWith('watch')&&!shots.has('hw')){shots.add('hw');await A.p.screenshot({path:screenshotPath('onb-host-watching.png')});}
 if(sb==='roll'&&!shots.has('gr')){shots.add('gr');await A.p.screenshot({path:screenshotPath('onb-host-guest-turn.png')});}
 const [va,vb]=[await view(A),await view(B)];
 const key=JSON.stringify([sa,sb,va?.turn,va?.current,va?.players]);stuck=key===last&&!/versus/.test(sa+sb)?stuck+1:0;last=key;
 if(stuck>200){console.log('STUCK',sa,sb,JSON.stringify(await A.p.evaluate(async()=>({gb:window.ShambConkins.pkmn.isOpen?.(),dlg:document.querySelector('#dialog[open]')?.innerText?.slice(0,60),nb:window.ShambConkins.store.netBoard,cur:window.ShambConkins.store.run.current,phase:window.ShambConkins.store.run.phase,pending:window.ShambConkins.store.run.pending,roll:document.querySelector('[data-action=roll]')?.outerHTML.slice(0,160),busy:window.ShambConkins.store.busy}))),JSON.stringify(await B.p.evaluate(async()=>({nb:window.ShambConkins.store.netBoard,cur:window.ShambConkins.store.run.current,roll:document.querySelector('[data-action=roll]')?.outerHTML.slice(0,160),gb:window.ShambConkins.pkmn.isOpen?.(),enc:!!document.querySelector('.gb-encounter'),vis:document.visibilityState,raf:await new Promise(r=>{requestAnimationFrame(()=>r('ok'));setTimeout(()=>r('no-raf'),1500);}),view:document.body.dataset.view,net:window.ShambConkins.net.state().status,dlg:document.querySelector('#dialog[open]')?.innerText?.slice(0,80),busy:window.ShambConkins.store.busy}))));await A.p.screenshot({path:screenshotPath('onb-stuck-host.png')});console.log('host log\n'+A.log.slice(-40).join('\n')+'\nguest log\n'+B.log.slice(-40).join('\n'));console.log('history',JSON.stringify(await A.p.evaluate(()=>window.ShambConkins.store.run.history.slice(0,6))));
 if(process.env.DEBUG){const probe=ph=>ph.p.evaluate(()=>{const n=window.ShambConkins.net.state();return {status:n.status,ready:n.ws?.readyState,buffered:n.ws?.bufferedAmount,room:n.room,seat:n.seat,peer:n.peer?.name};});
  console.log('net A',JSON.stringify(await probe(A)),'net B',JSON.stringify(await probe(B)));
  await B.p.evaluate(()=>{window.__got=[];window.ShambConkins.net.state().ws.addEventListener('message',e=>window.__got.push(String(e.data).slice(0,80)));});
  await A.p.evaluate(()=>window.ShambConkins.net.state().ws.send(JSON.stringify({t:'msg',d:{k:'probe'}})));await A.p.waitForTimeout(1500);
  console.log('B got after probe',JSON.stringify(await B.p.evaluate(()=>window.__got)));}await B.p.screenshot({path:screenshotPath('onb-stuck-guest.png')});break;}
 if(va?.turn>TURNS||va?.finished)break;
 if((Date.now()-t0)/1000>LIMIT){console.log('time limit');break;}
 await A.p.waitForTimeout(150);
}
const v=await view(A);
console.log('host',JSON.stringify(A.stats),'guest',JSON.stringify(B.stats));
console.log('guest answered:',[...(B.titles||[])].slice(0,12).join(' | '));
check(v.turn>TURNS||v.finished,`the run reached turn ${v.turn} (goal ${TURNS+1})`);
check((A.stats.roll||0)>=2&&(B.stats.roll||0)>=2,`each phone rolled on its own turns (Sean ${A.stats.roll||0}, Amber ${B.stats.roll||0})`);
check((B.stats.dlg||0)>=1,`Amber's phone answered its own dialogs (${B.stats.dlg||0})`);
check((B.stats.watch||0)>=1&&(A.stats.watch||0)>=1,'each phone showed the other\'s dialogs read-only');
if(process.env.VERSUS)check(A.stats.versus>0&&B.stats.versus>0,`versus games were played move by move on both phones (${A.stats.versus||0} / ${B.stats.versus||0} steps)`);
check(!A.stats.game2p&&!B.stats.game2p,'no pass-and-play 2P minigame started (both play the 1P version)');
const played=ph=>(ph.stats.bank||0)+(ph.stats.versus?1:0);
check(played(A)>=1&&played(B)>=1,`minigames were played on both phones (Sean ${played(A)}, Amber ${played(B)})`);
if(process.env.PKMN)check([...(A.titles||[])].some(t=>/battle|Pokémon Center|team/.test(t)),'a Pokémon battle on Amber\'s turn ran on her phone (Sean\'s phone watched)');
if(process.env.WARP)check(sawWarp,'the warp zone reached Amber\'s phone (both phones on the warp board)');
if(DROP)check(dropped,'the guest connection was dropped once mid-decision');
check(agree>=3&&mismatches===0,`both phones agree on players/turn when quiet (${agree} checks, ${mismatches} mismatches)`);
check(await B.p.evaluate(()=>{try{const r=JSON.parse(localStorage.getItem('shambconkins-run-v20')||'null');return !r||!r.online;}catch{return true;}}),'the guest phone never saved the host\'s run');
// Amber leaves: Sean's phone carries on with her turns
await act(B,'home');await waitDialog(B,/Leave the online game/);await choose(B,'Leave');
await A.p.waitForFunction(()=>!window.ShambConkins.store.netBoard?.live,null,{timeout:10000}).then(()=>check(true,'after Amber leaves, Sean\'s phone plays her turns'),()=>check(false,'Sean\'s phone notices Amber left'));
check(await B.p.evaluate(()=>!window.ShambConkins.store.netBoard&&document.body.dataset.view==='home'),'Amber\'s phone is back on its own title screen');
const errs=[...new Set([...A.errors,...B.errors])];
check(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
await browser.close();console.log(failed?`${failed} online board check(s) failed`:'ONLINE BOARD OK');process.exit(failed?1:0);
