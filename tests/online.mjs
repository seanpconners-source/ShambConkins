// Online duel between two phones (src/net.js + src/duel.js + the Room Durable Object in cloudflare/worker.js).
// Needs the Worker running locally: `cd cloudflare && npx wrangler dev --local --port 8787` (SC_NET_HOST to change).
// Two browser contexts join one room, Sean challenges Amber, both play the same seeded game, scores flow both ways,
// the result card shows both, Amber's rematch reaches Sean, and leaving updates the other phone.
import {launchBrowser,root,screenshotPath} from './lib.mjs';
import path from 'node:path';import {pathToFileURL} from 'node:url';
const HOST=process.env.SC_NET_HOST||'ws://127.0.0.1:8787',GAME=process.env.GAME||'snake-run';
const url=pathToFileURL(path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html')).href;
let failed=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)failed++;};
const browser=await launchBrowser();
async function phone(tag){
 const ctx=await browser.newContext({viewport:{width:390,height:780}});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(h=>{try{localStorage.setItem('sc-net-host',h);}catch{}},HOST);
 await p.goto(url);await p.waitForSelector('.title-screen',{timeout:60000});await p.waitForFunction(()=>!document.getElementById('boot'));
 return {p,errors,tag};
}
const act=(ph,name,data={})=>ph.p.evaluate(([name,data])=>{const b=document.createElement('button');b.dataset.action=name;Object.assign(b.dataset,data);document.body.append(b);b.click();b.remove();},[name,data]);
const dialogText=ph=>ph.p.evaluate(()=>document.querySelector('#dialog[open]')?.innerText||'');
const choose=(ph,label)=>ph.p.evaluate(l=>{const b=[...document.querySelectorAll('#dialog[open] button')].find(b=>b.textContent.trim().startsWith(l));b?.click();return !!b;},label);
const waitDialog=(ph,re,ms=20000)=>ph.p.waitForFunction(r=>new RegExp(r).test(document.querySelector('#dialog[open]')?.innerText||''),re.source,{timeout:ms});
const S=(ph,f)=>ph.p.evaluate(f);
async function join(ph,who){
 await act(ph,'arcade');await ph.p.waitForSelector('.solo-strip');
 await act(ph,'online-mode');await waitDialog(ph,/Play online/);
 await ph.p.fill('#net-room',process.env.ROOM||'Test Room');await ph.p.check(`input[name="net-who"][value="${who}"]`);
 await choose(ph,'Join room');
}
const A=await phone('A'),B=await phone('B');
await join(A,0);await A.p.waitForFunction(()=>/waiting for player 2/.test(document.querySelector('.net-room')?.innerText||''),null,{timeout:15000});
check(true,'Sean is in the room, waiting for player 2');
await join(B,1);
await A.p.waitForFunction(()=>/Amber is here/.test(document.querySelector('.net-room')?.innerText||''),null,{timeout:15000});check(true,'Sean sees "✓ Amber is here"');
check(/Sean is here/.test(await B.p.evaluate(()=>document.querySelector('.net-room')?.innerText||'')),'Amber sees Sean');
check(await A.p.evaluate(()=>document.querySelectorAll('[data-action="duel-propose"]').length>5),'Arcade cards have Challenge buttons');
await A.p.screenshot({path:screenshotPath('online-arcade.png')});
await act(A,'filter',{id:'trivia'});await A.p.waitForTimeout(400);
check(await A.p.evaluate(()=>[...document.querySelectorAll('.arcade-card')].every(c=>c.querySelector('[data-action="duel-propose"]')||/Not online yet/.test(c.innerText))),'every Arcade card offers Challenge or says "Not online yet"');
await act(A,'filter',{id:'all'});await A.p.waitForTimeout(400);
// Sean challenges, Amber accepts
await act(A,'duel-propose',{id:GAME});await waitDialog(A,/Waiting for Amber/);
await waitDialog(B,/Sean challenges you/);check(true,'Amber gets the challenge');
await B.p.screenshot({path:screenshotPath('online-challenge.png')});
await choose(B,'Play');
for(const ph of [A,B]){await waitDialog(ph,/ONLINE DUEL/);await choose(ph,'Start game');}
await A.p.waitForFunction(()=>!!window.ShambConkins.store.session,null,{timeout:20000});await B.p.waitForFunction(()=>!!window.ShambConkins.store.session,null,{timeout:20000});
const [sa,sb]=[await S(A,()=>window.ShambConkins.store.session.seed),await S(B,()=>window.ShambConkins.store.session.seed)];
check(sa===sb&&/snake-run|-/.test(sa),`both phones play from the same seed (${sa})`);
check(await S(A,()=>window.ShambConkins.store.session.players[0].owner)==='Sean'&&await S(B,()=>window.ShambConkins.store.session.players[0].owner)==='Amber','each phone plays as its own player');
// live score: Amber's score shows on Sean's chip
await S(B,()=>{const s=window.ShambConkins.store.session;s.score[0]=300;s.soloProgress={score:300,level:0,label:''};});
await A.p.waitForFunction(()=>/Amber · 300/.test(document.getElementById('duel-chip')?.textContent||''),null,{timeout:8000});check(true,'Sean\'s screen shows Amber\'s live score');
await A.p.screenshot({path:screenshotPath('online-chip.png')});
// Sean finishes first and waits; Amber's progress keeps updating; then Amber finishes
await S(A,()=>window.ShambConkins.store.session.finish([700,0],'Sean banks 700'));
await waitDialog(A,/Waiting for Amber/);
await S(B,()=>{const s=window.ShambConkins.store.session;s.score[0]=420;s.soloProgress={score:420,level:0,label:''};});
await A.p.waitForFunction(()=>document.getElementById('duel-live')?.textContent==='420',null,{timeout:8000});check(true,'while waiting, Sean sees Amber\'s score climb');
await S(B,()=>window.ShambConkins.store.session.finish([450,0],'Amber banks 450'));
await waitDialog(A,/Sean wins the duel/);await waitDialog(B,/Sean wins the duel/);
const ra=await dialogText(A),rb=await dialogText(B);
check(/700 – 450/.test(ra)&&/450 – 700/.test(rb),'result cards: Sean 700 – 450 / Amber 450 – 700');
check(/Rematch/.test(ra)&&/Back to the room/.test(rb),'Rematch and Back to the room offered');
await A.p.screenshot({path:screenshotPath('online-result.png')});
// Amber goes back to the room, then Sean asks for a rematch: Amber gets the challenge
await choose(B,'Back to the room');await B.p.waitForTimeout(800);
await choose(A,'Rematch');
// a win can unlock a character first: Sean welcomes them, then the rematch goes out
for(let i=0;i<6;i++){await A.p.waitForTimeout(400);await choose(A,'Welcome');}
const busy=ph=>S(ph,()=>{const st=window.ShambConkins.store;return JSON.stringify({view:st.view,dialog:!!st.dialog,busy:st.busy,session:!!st.session,netBoard:!!st.netBoard,dlg:(document.querySelector('#dialog[open]')?.innerText||'').slice(0,80)});});
await waitDialog(B,/Sean challenges you/).then(()=>check(true,'Rematch reaches Amber'),async()=>{check(false,'Rematch reaches Amber '+await busy(B)+' / Sean '+await busy(A));});
await choose(B,'Not now');await waitDialog(A,/./,3000).catch(()=>{});await A.p.waitForTimeout(800);
await waitDialog(A,/./,1).catch(()=>{});check(!/Waiting for Amber/.test(await dialogText(A)),'"Not now" ends Sean\'s wait');
// Amber leaves the room
await act(B,'online-leave');await A.p.waitForFunction(()=>/waiting for player 2/.test(document.querySelector('.net-room')?.innerText||''),null,{timeout:10000});
check(true,'Sean sees Amber leave');
check(!A.errors.length&&!B.errors.length,'no page errors '+[...A.errors,...B.errors].slice(0,2).join(' | '));
await browser.close();console.log(failed?`${failed} online check(s) failed`:'ONLINE OK');process.exit(failed?1:0);
