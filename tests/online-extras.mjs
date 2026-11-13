// Online extras (owner, Nov 12): chat sheet hangs from the top while typing; Online in a room = room menu (switch / leave);
// a message to a friend whose game is closed waits on the site and arrives when they open it (💬 with 1 outside a room,
// gone once read); an invite while in a game shows a banner, Join ends the game and lands both in one room.
// Needs `npx --yes wrangler@3 dev --local --port 8787` in cloudflare/ and SHAMB_URL = a served --pwa build. Arg: screenshot dir.
import {launchBrowser} from './lib.mjs';
const URL0=process.env.SHAMB_URL,HOST=process.env.NET_HOST||'ws://localhost:8787',OUT=process.argv[2]||'/tmp';
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
const browser=await launchBrowser();
async function page(ctx){const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
 await p.goto(URL0,{timeout:180000});await p.waitForSelector('.title-screen',{timeout:120000});await p.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:90000});
 await p.addStyleTag({content:'#sc-dl{display:none!important}'});return p;}
async function phone(vw={width:390,height:780}){const ctx=await browser.newContext({viewport:vw});
 await ctx.addInitScript(h=>{try{localStorage.setItem('sc-net-host',h);localStorage.setItem('sc-friends-on','true');}catch{}},HOST);return {ctx,p:await page(ctx)};}
const act=(p,name)=>p.evaluate(n=>{const b=document.createElement('button');b.dataset.action=n;document.body.append(b);b.click();b.remove();},name);
const until=(p,fn,arg,ms=15000)=>p.waitForFunction(fn,arg,{timeout:ms}).then(()=>true,()=>false);
const choose=(p,l)=>p.evaluate(l=>{const b=[...document.querySelectorAll('#dialog[open] button')].find(b=>b.textContent.trim().startsWith(l));b?.click();return !!b;},l);
const dlgText=p=>p.evaluate(()=>document.querySelector('#dialog[open]')?.innerText||'');
async function join(p,who,room){await act(p,'arcade');await p.waitForSelector('.solo-strip');await act(p,'online-mode');
 await p.waitForFunction(()=>/Play online/.test(document.querySelector('#dialog[open]')?.innerText||''));
 await p.fill('#net-room',room);await p.check(`input[name="net-who"][value="${who}"]`);await choose(p,'Join room');}
const S=await phone(),A=await phone({width:752,height:835});let sean=S.p,amber=A.p;
const room='o2 '+Math.random().toString(36).slice(2,6);
await join(sean,0,room);await join(amber,1,room);
check(await until(sean,()=>window.ShambConkins.friends().presence.length>0,null,20000),'friends after the room');
const amberCode=await amber.evaluate(()=>window.ShambConkins.friends().code),seanCode=await sean.evaluate(()=>window.ShambConkins.friends().code);
// typing layout on the Fold size
await amber.evaluate(()=>window.ShambConkins.chat().openChat('room'));await amber.focus('.chat-input');await amber.waitForTimeout(500);
const lay=await amber.evaluate(()=>{const d=document.getElementById('sc-chat-dlg'),i=d.querySelector('.chat-input').getBoundingClientRect(),c=d.querySelector('.chat-card').getBoundingClientRect();return {typing:d.classList.contains('typing'),inputBottom:i.bottom,cardBottom:c.bottom,H:innerHeight};});
check(lay.typing&&lay.inputBottom<lay.H*.3&&lay.cardBottom<=lay.H*.47,`typing: sheet at the top, box near the top (${JSON.stringify(lay)})`);
await amber.screenshot({path:OUT+'/o2-typing.png'});
await amber.evaluate(()=>window.ShambConkins.chat().closeChat());
// room menu: switch room (both), then leave
await act(sean,'online-mode');check(/You’re in room/.test(await dlgText(sean)),'Online while in a room opens the room menu');
await sean.screenshot({path:OUT+'/o2-menu.png'});
await sean.fill('#net-room',room+' b');await choose(sean,'Switch room');
check(await until(sean,r=>window.ShambConkins.store&&document.querySelector('.net-room b')?.textContent===r,(room+' b').toLowerCase().replace(/[^a-z0-9]+/g,'-'),15000),'Switch room moves Sean to the new room');
check(await until(amber,()=>/waiting for player 2/.test(document.querySelector('.net-room')?.innerText||''),null,15000),'Amber sees Sean gone from the old room');
await act(sean,'online-mode');await until(sean,()=>!!document.querySelector('#dialog[open]'));await choose(sean,'Leave room');
check(await until(sean,()=>!document.querySelector('.net-room'),null,8000),'Leave room leaves it');
await act(amber,'online-leave');
// held message: Amber closes the game, Sean writes, Amber opens the game again
await amber.close();await sean.waitForTimeout(1500);
const sent=await sean.evaluate(c=>{const ch=window.ShambConkins.chat();ch.openChat(c);return ch.send('see this later');},amberCode);
check(sent,'Sean sends to Amber while her game is closed');
check(await until(sean,()=>/they’ll get your message/.test(document.querySelector('.toast,#toast,.toasts')?.innerText||document.body.innerText),null,6000),'Sean is told it waits for her');
await sean.evaluate(()=>window.ShambConkins.chat().closeChat());
amber=await page(A.ctx);
check(await until(amber,()=>window.ShambConkins.chat().unread===1&&window.ShambConkins.chat().button(),null,20000),'Amber gets it on opening: 💬 shows 1 outside a room');
await amber.screenshot({path:OUT+'/o2-unread.png'});
await amber.click('#sc-chat');
check(await until(amber,c=>window.ShambConkins.chat().open&&window.ShambConkins.chat().target===c&&/see this later/.test(document.getElementById('chat-log').innerText),seanCode),'tapping 💬 opens Sean’s conversation with the message');
await amber.evaluate(()=>window.ShambConkins.chat().closeChat());
check(await until(amber,()=>!window.ShambConkins.chat().button(),null,3000),'read: the 💬 button goes away again');
// invite while Amber is in a game
await until(sean,c=>window.ShambConkins.friends().presence.some(p=>p.code===c),amberCode,20000);
await act(amber,'arcade');await amber.waitForTimeout(500);
amber.evaluate(()=>{window.ShambConkins.requestGame({id:'pong-duel',origin:'arcade',solo:true,quick:true});});
check(await until(amber,()=>!!window.ShambConkins.store.session,null,20000),'Amber is in a game');
await amber.waitForTimeout(1500);
sean.evaluate(c=>{window.__inv=window.ShambConkins.friends().invite(c).then(v=>window.__invDone=v);},amberCode);
check(await until(amber,()=>window.ShambConkins.friends().banner(),null,15000),'Amber sees the invite banner over her game');
await amber.screenshot({path:OUT+'/o2-banner.png'});
await amber.click('#sc-invite .ib-join');
check(await until(amber,()=>/End this|End your/.test(document.querySelector('#dialog[open]')?.innerText||''),null,6000),'Join asks the game’s own end question');
await amber.evaluate(()=>{const b=[...document.querySelectorAll('#dialog[open] button')].find(b=>/End challenge|Bank/.test(b.textContent));b?.click();});
await amber.waitForTimeout(800);await amber.evaluate(()=>{const b=[...document.querySelectorAll('#dialog[open] button')].find(b=>/Continue|OK|Back|Arcade|Done/i.test(b.textContent));b?.click();});
check(await until(sean,()=>window.__invDone==='joined',null,20000),'Sean’s invite is accepted');
check(await until(amber,()=>{const n=window.ShambConkins.net.state();return n.room&&n.peer;},null,20000)&&await until(sean,()=>{const n=window.ShambConkins.net.state();return n.room&&n.peer;},null,20000),'both land in the same room');
check(await amber.evaluate(()=>!window.ShambConkins.friends().banner()),'banner gone');
check(!sean.errs.length&&!amber.errs.length,'no page errors '+[...sean.errs,...amber.errs].join(' | '));
await browser.close();console.log(bad?bad+' problem(s)':'online2 OK');process.exit(bad?1:0);
